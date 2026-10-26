/**
 * Cobrança, período coberto e direito de acesso (docs/PAGAMENTO.md, "Cobranças e acesso").
 *
 * Uma assinatura tem várias cobranças, uma por ciclo, e cada cobrança paga cobre o próprio
 * período. Um evento de uma cobrança muda só aquela cobrança: o reembolso de uma cobrança
 * antiga não apaga o período que uma cobrança mais nova pagou, nem outra assinatura, nem uma
 * concessão manual.
 *
 * Os testes do Asaas rodam contra a simulação local da API documentada (asaas-simulado.ts);
 * nenhuma chamada sai daqui, e passar aqui não homologa nada no Asaas.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { AsaasPaymentProvider, asaasRefs, coverageEnd } from '../src/asaas.ts';
import { addPeriod, applyPaymentEvent, createSubscription, getSubscription, ProviderUnavailable, recordProviderRef, type PaymentEvent, type Period } from '../src/assinatura.ts';
import { drainOutbox } from '../src/avisos.ts';
import { chargesOf } from '../src/cobrancas.ts';
import type { Mail } from '../src/email.ts';
import { reconcile, ReconcileAlerts, type ReconcileReport } from '../src/conciliacao.ts';
import { MIGRATIONS, openDb } from '../src/db.ts';
import { computeAccess, setPlan } from '../src/plans.ts';
import { AsaasSimulado, nextCycle } from './asaas-simulado.ts';

const DIA = 86_400_000;

/**
 * Banco, simulação e adaptador ligados, com uma conta (u1); o relógio é o da simulação. Cada
 * leitura do Asaas (webhook ou conciliação) acontece um milissegundo depois da anterior, como numa
 * rede de verdade: leituras no mesmo instante com situações diferentes são ambíguas (cobrancas.ts).
 */
function cenario() {
  const sim = new AsaasSimulado();
  const agora = () => ++sim.now;
  const db = openDb(':memory:');
  db.prepare("INSERT INTO users (id, email, password_hash, created_at) VALUES ('u1', 'a@exemplo.com', 'x', 0)").run();
  const provider = new AsaasPaymentProvider(
    { apiKey: sim.apiKey, environment: 'sandbox', webhookToken: sim.token, appUrl: 'https://alicerce.exemplo', billingTypes: ['CREDIT_CARD', 'PIX'] },
    asaasRefs(db),
    sim.fetch,
    undefined,
    agora,
  );
  const abrir = async (period: Period = 'mensal') => {
    const sub = createSubscription(db, 'u1', 'asaas', period, sim.now);
    const c = await provider.checkout({ id: sub.id, email: 'a@exemplo.com', period, price: sub.price }, sim.now);
    recordProviderRef(db, sub.id, c.ref!);
    return sub.id;
  };
  /** Entrega os webhooks pendentes, na ordem, com o relógio da simulação. */
  const drain = async () => {
    const out = [];
    for (const d of sim.deliveries.splice(0)) {
      const ev = await provider.parseWebhook(d.raw, d.headers, sim.now);
      out.push(ev ? applyPaymentEvent(db, 'asaas', ev, sim.now) : 'ignorado');
    }
    return out;
  };
  const plano = (at = sim.now) => computeAccess(db, 'u1', at);
  return { sim, db, provider, abrir, drain, plano, agora, sub: (id: string) => getSubscription(db, id)!, chargesOf: (id: string) => chargesOf(db, id) };
}

/** Assinatura mensal paga e renovada uma vez; o relógio fica no segundo ciclo. */
async function renovada(c: ReturnType<typeof cenario>) {
  const id = await c.abrir();
  const { cobranca: primeira } = c.sim.pagar(id);
  await c.drain();
  const due1 = c.sim.cobrancasDe(id)[0]!.dueDate;
  c.sim.now += 31 * DIA;
  const segunda = c.sim.renovar(id, 'paga');
  await c.drain();
  c.sim.now += 2 * DIA; // no meio do segundo ciclo
  const fim2 = coverageEnd(nextCycle(due1, 'MONTHLY'), 'mensal');
  return { id, primeira, segunda, fim1: coverageEnd(due1, 'mensal'), fim2 };
}

describe('reembolso de uma cobrança antiga na mesma assinatura (regressão)', () => {
  it('a cobrança atual, paga, continua dando acesso: webhook, banco e fetchState', async () => {
    const c = cenario();
    const { id, primeira, fim2 } = await renovada(c);
    expect(c.plano()).toEqual({ plan: 'premium', expiresAt: fim2 });
    c.sim.estornarNoPainel(primeira); // estorno atrasado da primeira cobrança, feito no painel
    await c.drain();
    expect(c.sub(id)).toMatchObject({ status: 'ativa', paid_until: fim2 });
    expect(c.plano()).toEqual({ plan: 'premium', expiresAt: fim2 });
    expect(await c.provider.fetchState(id, c.sim.now)).toMatchObject({ status: 'ativa', paidUntil: fim2 });
    // e a conciliação não "corrige" nada nem acusa divergência
    const r = await reconcile(c.db, c.provider, c.agora());
    expect(r).toMatchObject({ corrigidas: [], divergencias: [] });
    expect(c.plano()).toEqual({ plan: 'premium', expiresAt: fim2 });
  });
});

describe('o e-mail do reembolso de uma cobrança', () => {
  const ler = async (db: DatabaseSync, now: number) => {
    const mails: Mail[] = [];
    await drainOutbox(db, { name: 'memoria', send: async (m) => void mails.push(m) }, { appUrl: 'https://alicerce.exemplo', seller: null }, now);
    return mails.filter((m) => m.subject.startsWith('Reembolso'));
  };

  it('de uma cobrança antiga: diz o período dela, que o acesso continua e que a assinatura renova', async () => {
    const c = cenario();
    const { primeira, fim2 } = await renovada(c);
    c.sim.estornarNoPainel(primeira);
    await c.drain();
    const [m, ...resto] = await ler(c.db, c.sim.now);
    expect(resto).toEqual([]);
    expect(m!.subject).toBe('Reembolso de uma cobrança da sua assinatura do Premium');
    expect(m!.text).toMatch(/Registramos o reembolso da cobrança de \d+ de \S+ de \d{4} a \d+ de \S+ de \d{4} da sua assinatura Premium mensal/);
    const fim = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: 'America/Sao_Paulo' }).format(fim2);
    expect(m!.text).toContain(`A sua conta continua Premium até ${fim}.`);
    expect(m!.text).toContain('A assinatura continua ativa e renova sozinha');
    expect(m!.text).not.toContain('plano gratuito');
    expect(m!.text).not.toContain('integral');
  });

  it('da cobrança que sustentava o acesso: a conta voltou ao gratuito', async () => {
    const c = cenario();
    const { segunda } = await renovada(c);
    c.sim.estornarNoPainel(segunda);
    await c.drain();
    const [m] = await ler(c.db, c.sim.now);
    expect(m!.text).toContain('Esta cobrança não dá mais acesso ao Premium, e a conta voltou ao plano gratuito');
  });
});

describe('listagens do Asaas com mais de uma página (regressão)', () => {
  it('uma assinatura mensal com 12 cobranças: fetchState vê a última, não só as 10 primeiras', async () => {
    const c = cenario();
    const id = await c.abrir();
    c.sim.pagar(id);
    for (let i = 0; i < 11; i++) {
      c.sim.now += 31 * DIA;
      c.sim.renovar(id, 'paga');
    }
    await c.drain();
    const ultima = c.sim.cobrancasDe(id).at(-1)!;
    const fim = coverageEnd(ultima.dueDate, 'mensal');
    expect(c.sub(id).paid_until).toBe(fim);
    expect(await c.provider.fetchState(id, c.sim.now)).toMatchObject({ status: 'ativa', paidUntil: fim });
    expect((await reconcile(c.db, c.provider, c.agora())).divergencias).toEqual([]);
  });
});

/* ---------- a regra, com eventos montados à mão (provedor de teste) ---------- */

const T0 = Date.UTC(2026, 0, 10, 12); // 10/01/2026

/** Banco com a conta u1; `evento` aplica um evento do provedor 'teste' montado à mão. */
function banco() {
  const db = openDb(':memory:');
  db.prepare("INSERT INTO users (id, email, password_hash, created_at) VALUES ('u1', 'a@exemplo.com', 'x', 0)").run();
  let n = 0;
  const evento = (e: Omit<PaymentEvent, 'id'> & { id?: string }, now = e.at) =>
    applyPaymentEvent(db, 'teste', { id: e.id ?? `evt_${++n}`, ...e }, now);
  /** Assinatura nova, paga na primeira cobrança (c1), que cobre um mês a partir de `at`. */
  const assinatura = (at = T0, chargeId = 'c1') => {
    const s = createSubscription(db, 'u1', 'teste', 'mensal', at);
    evento({ type: 'pagamento_aprovado', subscriptionId: s.id, chargeId, coversFrom: at, paidUntil: addPeriod(at, 'mensal'), paidAt: at, at });
    return s.id;
  };
  /** A cobrança da renovação, paga em `at`, cobrindo o mês seguinte ao fim de `prevUntil`. */
  const renovacao = (id: string, chargeId: string, prevUntil: number, at: number) =>
    evento({ type: 'pagamento_aprovado', subscriptionId: id, chargeId, coversFrom: prevUntil, paidUntil: addPeriod(prevUntil, 'mensal'), paidAt: at, at });
  const plano = (at: number) => computeAccess(db, 'u1', at);
  const emails = (kind: string) => (db.prepare('SELECT COUNT(*) AS n FROM email_outbox WHERE kind = ?').get(kind) as { n: number }).n;
  return { db, evento, assinatura, renovacao, plano, emails, sub: (id: string) => getSubscription(db, id)!, cobrancas: (id: string) => chargesOf(db, id) };
}

describe('cobrança, período e acesso', () => {
  const fim1 = addPeriod(T0, 'mensal');
  const fim2 = addPeriod(fim1, 'mensal');

  it('1. cobrança antiga reembolsada e a atual paga: o acesso segue até o fim da atual', () => {
    const b = banco();
    const id = b.assinatura();
    b.renovacao(id, 'c2', fim1, fim1 - DIA);
    const agora = fim1 + 5 * DIA;
    expect(b.evento({ type: 'reembolso', subscriptionId: id, chargeId: 'c1', at: agora })).toBe('aplicado');
    expect(b.sub(id)).toMatchObject({ status: 'ativa', paid_until: fim2 });
    expect(b.plano(agora)).toEqual({ plan: 'premium', expiresAt: fim2 });
    expect(b.cobrancas(id).map((c) => [c.charge_id, c.status])).toEqual([['c1', 'estornada'], ['c2', 'paga']]);
    expect(b.emails('reembolso')).toBe(1); // o aviso do estorno sai, e diz que a conta continua Premium
  });

  it('2. reembolso da cobrança que sustenta o acesso: o acesso acaba na hora; uma renovação paga depois volta a valer', () => {
    const b = banco();
    const id = b.assinatura();
    b.renovacao(id, 'c2', fim1, fim1 - DIA);
    const agora = fim1 + 5 * DIA;
    b.evento({ type: 'reembolso', subscriptionId: id, chargeId: 'c2', at: agora });
    expect(b.plano(agora).plan).toBe('free');
    expect(b.plano(fim1 - DIA)).toEqual({ plan: 'premium', expiresAt: fim1 }); // o período de c1 continua pago
    expect(b.sub(id)).toMatchObject({ status: 'ativa', paid_until: fim1 }); // a assinatura ainda renova
    // a renovação seguinte é paga: nada ficou "final" por causa do estorno de c2
    b.renovacao(id, 'c3', fim2, fim2);
    expect(b.plano(fim2 + DIA)).toEqual({ plan: 'premium', expiresAt: addPeriod(fim2, 'mensal') });
  });

  it('3. reembolso parcial: pela regra proposta, a cobrança continua dando acesso (decisão pendente)', () => {
    const b = banco();
    const id = b.assinatura();
    expect(b.evento({ type: 'reembolso_parcial', subscriptionId: id, chargeId: 'c1', at: T0 + DIA })).toBe('aplicado');
    expect(b.cobrancas(id)[0]!.status).toBe('estorno_parcial');
    expect(b.plano(T0 + 2 * DIA)).toEqual({ plan: 'premium', expiresAt: fim1 });
    // depois, o resto é estornado: aí a cobrança deixa de valer
    b.evento({ type: 'reembolso', subscriptionId: id, chargeId: 'c1', at: T0 + 3 * DIA });
    expect(b.plano(T0 + 3 * DIA).plan).toBe('free');
  });

  it('4. cancelamento com período pago restante: o acesso vai até o fim e depois expira; um estorno antigo não muda isso', () => {
    const b = banco();
    const id = b.assinatura();
    b.renovacao(id, 'c2', fim1, fim1 - DIA);
    b.evento({ type: 'assinatura_cancelada', subscriptionId: id, at: fim1 + DIA });
    expect(b.sub(id)).toMatchObject({ status: 'cancelada', paid_until: fim2 });
    b.evento({ type: 'reembolso', subscriptionId: id, chargeId: 'c1', at: fim1 + 2 * DIA });
    expect(b.sub(id).status).toBe('cancelada');
    expect(b.plano(fim2 - 1)).toEqual({ plan: 'premium', expiresAt: fim2 });
    expect(b.plano(fim2 + 1).plan).toBe('free'); // expirou: sem renovação, o período acabou
    expect(b.emails('cancelamento')).toBe(1);
  });

  it('5. evento repetido: o mesmo id vale uma vez; o mesmo fato com outro id não muda nada nem manda e-mail de novo', () => {
    const b = banco();
    const id = b.assinatura();
    const reemb = { id: 'evt_estorno', type: 'reembolso' as const, subscriptionId: id, chargeId: 'c1', at: T0 + DIA };
    expect(b.evento(reemb)).toBe('aplicado');
    expect(b.evento(reemb)).toBe('repetido');
    expect(b.evento({ ...reemb, id: 'evt_estorno_reenviado', at: T0 + 2 * DIA })).toBe('ignorado');
    expect(b.emails('reembolso')).toBe(1);
    const pago = { type: 'pagamento_aprovado' as const, subscriptionId: id, chargeId: 'c1', coversFrom: T0, paidUntil: fim1, at: T0 };
    expect(b.evento({ ...pago, id: 'evt_pago_atrasado' })).toBe('ignorado'); // estornada não volta a paga
    expect(b.emails('compra')).toBe(1);
  });

  it('6. eventos fora de ordem: a leitura mais antiga não desfaz a mais nova', () => {
    const b = banco();
    const id = b.assinatura();
    // a contestação (lida em T0+1d) chega depois da disputa ganha (lida em T0+5d): nada muda
    b.evento({ type: 'contestacao', subscriptionId: id, chargeId: 'c1', at: T0 + DIA });
    expect(b.plano(T0 + 2 * DIA).plan).toBe('free');
    b.evento({ type: 'pagamento_aprovado', subscriptionId: id, chargeId: 'c1', coversFrom: T0, paidUntil: fim1, at: T0 + 5 * DIA });
    expect(b.plano(T0 + 6 * DIA)).toEqual({ plan: 'premium', expiresAt: fim1 });
    expect(b.evento({ type: 'contestacao', subscriptionId: id, chargeId: 'c1', at: T0 + 3 * DIA })).toBe('ignorado');
    expect(b.plano(T0 + 6 * DIA).plan).toBe('premium');
    // a renovação paga chega antes do aviso de que a primeira foi paga: as duas valem
    const b2 = banco();
    const s = createSubscription(b2.db, 'u1', 'teste', 'mensal', T0);
    b2.renovacao(s.id, 'c2', fim1, fim1 - DIA);
    b2.evento({ type: 'pagamento_aprovado', subscriptionId: s.id, chargeId: 'c1', coversFrom: T0, paidUntil: fim1, paidAt: T0, at: T0 });
    expect(b2.plano(T0 + DIA)).toEqual({ plan: 'premium', expiresAt: fim2 });
    expect(b2.sub(s.id).first_paid_at).toBe(T0);
  });

  it('7. duas assinaturas, só uma reembolsada: a outra continua valendo', () => {
    const b = banco();
    const antiga = b.assinatura(T0, 'a1');
    b.evento({ type: 'assinatura_cancelada', subscriptionId: antiga, at: T0 + DIA });
    const nova = b.assinatura(T0 + 2 * DIA, 'n1');
    b.evento({ type: 'reembolso', subscriptionId: antiga, chargeId: 'a1', at: T0 + 3 * DIA });
    expect(b.sub(antiga).status).toBe('reembolsada');
    expect(b.plano(T0 + 4 * DIA)).toEqual({ plan: 'premium', expiresAt: addPeriod(T0 + 2 * DIA, 'mensal') });
    expect(b.sub(nova).status).toBe('ativa');
  });

  it('8. concessão manual válida: o estorno de uma cobrança não a toca', () => {
    const b = banco();
    const id = b.assinatura();
    setPlan(b.db, 'u1', 'premium', T0 + 90 * DIA, 'admin', T0);
    b.evento({ type: 'reembolso', subscriptionId: id, chargeId: 'c1', at: T0 + DIA });
    expect(b.plano(T0 + 2 * DIA)).toEqual({ plan: 'premium', expiresAt: T0 + 90 * DIA });
    expect(b.plano(T0 + 91 * DIA).plan).toBe('free');
  });

  it('a desistência (estorno de tudo, sem dizer a cobrança) encerra a assinatura e é final', () => {
    const b = banco();
    const id = b.assinatura();
    b.evento({ type: 'reembolso', subscriptionId: id, at: T0 + DIA });
    expect(b.sub(id).status).toBe('reembolsada');
    expect(b.cobrancas(id)[0]!.status).toBe('estornada');
    expect(b.plano(T0 + 2 * DIA).plan).toBe('free');
    expect(b.evento({ type: 'pagamento_aprovado', subscriptionId: id, paidUntil: fim1, at: T0 + 3 * DIA })).toBe('ignorado');
  });

  it('estorno pedido tira o acesso no pedido; se o provedor disser que não aconteceu, a cobrança volta a valer', () => {
    const b = banco();
    const id = b.assinatura();
    b.evento({ type: 'reembolso_pedido', subscriptionId: id, chargeId: 'c1', at: T0 + DIA });
    expect(b.plano(T0 + DIA).plan).toBe('free');
    b.evento({ type: 'pagamento_aprovado', subscriptionId: id, chargeId: 'c1', coversFrom: T0, paidUntil: fim1, at: T0 + 2 * DIA });
    expect(b.plano(T0 + 3 * DIA).plan).toBe('premium');
  });

  it('um evento cujo tipo não combina com a situação da cobrança não muda nada', () => {
    const b = banco();
    const id = b.assinatura();
    expect(b.evento({ type: 'pagamento_aprovado', subscriptionId: id, chargeId: 'c1', chargeStatus: 'estornada', paidUntil: fim1, at: T0 + DIA })).toBe('ignorado');
    expect(b.cobrancas(id)[0]!.status).toBe('paga');
  });
});

describe('migração 9', () => {
  it('cada assinatura com período pago ganha uma cobrança legado com o mesmo período; o acesso não muda', () => {
    // o openDb aplica a 9 sobre esse banco
    const path = join(mkdtempSync(join(tmpdir(), 'alicerce-m9-')), 'a.db');
    const file = new DatabaseSync(path);
    file.exec('PRAGMA foreign_keys = ON');
    for (let i = 0; i < 8; i++) file.exec(MIGRATIONS[i]!);
    file.exec('PRAGMA user_version = 8');
    file.prepare("INSERT INTO users (id, email, password_hash, created_at) VALUES ('u1', 'a@exemplo.com', 'x', 0)").run();
    const ins2 = file.prepare('INSERT INTO subscriptions (id, user_id, provider, period, price, status, paid_until, first_paid_at, canceled_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    ins2.run('s_ativa', 'u1', 'asaas', 'mensal', 1990, 'ativa', T0 + 20 * DIA, T0 - 10 * DIA, null, T0 - 10 * DIA, T0);
    ins2.run('s_reemb', 'u1', 'asaas', 'mensal', 1990, 'reembolsada', T0 - 5 * DIA, T0 - 40 * DIA, T0 - 5 * DIA, T0 - 40 * DIA, T0 - 5 * DIA);
    ins2.run('s_pend', 'u1', 'asaas', 'mensal', 1990, 'pendente', null, null, null, T0, T0);
    const antes = (at: number) => (file.prepare("SELECT COUNT(*) AS n FROM subscriptions WHERE status IN ('ativa', 'cancelada') AND paid_until > ?").get(at) as { n: number }).n;
    expect(antes(T0)).toBe(1);
    file.close();
    const migrated = openDb(path, { backupDir: join(path, '..', 'backups') });
    expect(migrated.prepare('PRAGMA user_version').get()).toEqual({ user_version: MIGRATIONS.length });
    expect(chargesOf(migrated, 's_ativa')).toMatchObject([{ charge_id: 'legado:s_ativa', status: 'paga', covers_from: null, covers_until: T0 + 20 * DIA }]);
    expect(chargesOf(migrated, 's_reemb')).toMatchObject([{ charge_id: 'legado:s_reemb', status: 'estornada' }]);
    expect(chargesOf(migrated, 's_pend')).toEqual([]);
    expect(computeAccess(migrated, 'u1', T0)).toEqual({ plan: 'premium', expiresAt: T0 + 20 * DIA });
    expect(computeAccess(migrated, 'u1', T0 + 21 * DIA).plan).toBe('free');
    // voltar atrás: o código anterior lê subscriptions, que continua igual
    expect(migrated.prepare("SELECT status, paid_until FROM subscriptions WHERE id = 's_ativa'").get()).toEqual({ status: 'ativa', paid_until: T0 + 20 * DIA });
    migrated.close();
  });
});

describe('divergência entre o banco e o Asaas (conciliação cobrança por cobrança)', () => {
  it('9a. estorno de uma cobrança antiga cujo webhook se perdeu: a conciliação aplica só nela', async () => {
    const c = cenario();
    const { id, primeira, fim2 } = await renovada(c);
    c.sim.perderProximos = 10;
    c.sim.estornarNoPainel(primeira);
    expect(c.chargesOf(id).find((x) => x.charge_id === primeira)!.status).toBe('paga');
    const r = await reconcile(c.db, c.provider, c.agora());
    expect(r.corrigidas).toEqual([{ assinatura: id, eventos: ['reembolso'] }]);
    expect(c.chargesOf(id).find((x) => x.charge_id === primeira)!.status).toBe('estornada');
    expect(c.plano()).toEqual({ plan: 'premium', expiresAt: fim2 });
    expect((await reconcile(c.db, c.provider, c.agora())).corrigidas).toEqual([]); // de novo: nada
  });

  it('9b. estornada no banco e paga no Asaas: divergência, sem desfazer o estorno', async () => {
    const c = cenario();
    const { id, primeira } = await renovada(c);
    c.sim.estornarNoPainel(primeira);
    await c.drain();
    c.sim.mudarSemAviso(primeira, 'RECEIVED');
    const r = await reconcile(c.db, c.provider, c.agora());
    expect(r.corrigidas).toEqual([]);
    expect(r.divergencias).toEqual([{ assinatura: id, motivo: expect.stringMatching(new RegExp(`cobrança ${primeira}: estornada no banco, mas o provedor diz RECEIVED`)) }]);
  });

  it('9c. contestação ganha no Asaas: a disputa suspende e depois devolve o acesso, por webhook ou conciliação', async () => {
    const c = cenario();
    const id = await c.abrir();
    const { cobranca } = c.sim.pagar(id);
    await c.drain();
    c.sim.contestar(cobranca);
    c.sim.disputar(cobranca);
    await c.drain();
    expect(c.plano().plan).toBe('free');
    c.sim.perderProximos = 10; // a disputa é ganha, e nenhum aviso chega
    c.sim.encerrarDisputa(cobranca, 'ganha');
    const r = await reconcile(c.db, c.provider, c.agora());
    expect(r.corrigidas).toEqual([{ assinatura: id, eventos: ['pagamento_aprovado'] }]);
    expect(c.plano().plan).toBe('premium');
  });

  it('9d. contestação perdida termina como estorno, só daquela cobrança', async () => {
    const c = cenario();
    const { id, segunda, fim1 } = await renovada(c);
    c.sim.contestar(segunda);
    c.sim.encerrarDisputa(segunda, 'perdida');
    await c.drain();
    expect(c.chargesOf(id).find((x) => x.charge_id === segunda)!.status).toBe('estornada');
    expect(c.plano().plan).toBe('free');
    expect(c.plano(fim1 - DIA).plan).toBe('premium'); // o primeiro ciclo continua pago
  });

  it('9e. estorno parcial no Asaas: o acesso continua, e a conciliação avisa uma vez', async () => {
    const c = cenario();
    const id = await c.abrir();
    const { cobranca } = c.sim.pagar(id);
    await c.drain();
    c.sim.perderProximos = 10;
    c.sim.estornarNoPainel(cobranca, 5);
    const r = await reconcile(c.db, c.provider, c.agora());
    expect(r.avisos).toEqual([{ assinatura: id, cobranca, evento: 'reembolso_parcial' }]);
    expect(c.plano().plan).toBe('premium');
    expect((await reconcile(c.db, c.provider, c.agora())).avisos).toEqual([]);
  });

  it('a cobrança legado da migração sai quando o Asaas lista as cobranças de verdade', async () => {
    const c = cenario();
    const { id, fim2 } = await renovada(c);
    c.db.prepare("INSERT INTO subscription_charges (provider, charge_id, subscription_id, status, covers_from, covers_until, observed_at, updated_at) VALUES ('asaas', ?, ?, 'paga', NULL, ?, 0, 0)").run(`legado:${id}`, id, fim2 + 90 * DIA);
    expect(c.plano().expiresAt).toBe(fim2 + 90 * DIA);
    await reconcile(c.db, c.provider, c.agora());
    expect(c.chargesOf(id).some((x) => x.charge_id.startsWith('legado:'))).toBe(false);
    expect(c.plano()).toEqual({ plan: 'premium', expiresAt: fim2 });
  });
});

describe('observabilidade da conciliação', () => {
  const vazio = (): ReconcileReport => ({ conferidas: 0, corrigidas: [], desconhecidas: [], semVinculo: [], divergencias: [], avisos: [], falhas: [] });

  it('tentativa que nunca foi paga e o Asaas não conhece: esperada, só no resumo', async () => {
    const c = cenario();
    const id = await c.abrir(); // a página de pagamento foi aberta e abandonada
    const r = await reconcile(c.db, c.provider, c.agora());
    expect(r).toMatchObject({ desconhecidas: [id], semVinculo: [] });
    const linhas = new ReconcileAlerts().lines(r, c.sim.now);
    expect(linhas.filter((l) => l.nivel === 'warn')).toEqual([]);
    expect(linhas).toEqual([{ nivel: 'info', mensagem: expect.any(String), contexto: expect.objectContaining({ conferidas: 1, tentativasSemPagamento: 1, semVinculo: 0 }) }]);
  });

  it('assinatura com pagamento registrado que o provedor não acha: aviso, uma vez por dia', async () => {
    const c = cenario();
    const { id } = await renovada(c);
    c.db.prepare("UPDATE subscriptions SET provider_subscription = 'sub_que_sumiu' WHERE id = ?").run(id);
    c.sim.foraDoAr = false;
    const r = await reconcile(c.db, c.provider, c.agora());
    expect(r.falhas).toEqual([]);
    expect(r.semVinculo).toEqual([{ assinatura: id, situacao: 'ativa' }]);
    const alertas = new ReconcileAlerts();
    const avisos = (at: number) => alertas.lines(r, at).filter((l) => l.nivel === 'warn');
    expect(avisos(T0)).toHaveLength(1);
    expect(avisos(T0 + 3_600_000)).toEqual([]); // a próxima rodada, uma hora depois: nada repetido
    expect(avisos(T0 + DIA)).toHaveLength(1); // um dia depois, ainda sem solução: lembra de novo
    // nada pessoal nas linhas: só o id aleatório da assinatura e a situação
    expect(JSON.stringify(alertas.lines(r, T0 + 2 * DIA))).not.toMatch(/@|exemplo/);
  });

  it('provedor fora do ar a cada rodada: um aviso, não um por rodada; divergência também', () => {
    const alertas = new ReconcileAlerts();
    const falhou = { ...vazio(), falhas: [{ assinatura: 's1', erro: 'Asaas respondeu 503 (GET /subscriptions/x)' }] };
    expect(alertas.lines(falhou, T0).filter((l) => l.nivel === 'warn')).toHaveLength(1);
    expect(alertas.lines(falhou, T0 + 3_600_000).filter((l) => l.nivel === 'warn')).toHaveLength(0);
    const div = { ...vazio(), conferidas: 1, divergencias: [{ assinatura: 's1', motivo: 'cancelada no banco, mas o provedor ainda renova' }] };
    expect(alertas.lines(div, T0).filter((l) => l.nivel === 'warn')).toHaveLength(1);
    expect(alertas.lines(div, T0 + 60_000).filter((l) => l.nivel === 'warn')).toHaveLength(0);
    const outra = { ...div, divergencias: [{ assinatura: 's2', motivo: 'cancelada no banco, mas o provedor ainda renova' }] };
    expect(alertas.lines(outra, T0 + 60_000).filter((l) => l.nivel === 'warn')).toHaveLength(1);
  });

  it('antes, um relatório só com desconhecidas não gerava linha nenhuma; agora gera o resumo, e o anormal vira aviso', () => {
    const r = { ...vazio(), conferidas: 2, desconhecidas: ['s1', 's2'], semVinculo: [{ assinatura: 's2', situacao: 'ativa' as const }] };
    const linhas = new ReconcileAlerts().lines(r, T0);
    expect(linhas.map((l) => l.nivel).sort()).toEqual(['info', 'warn']);
    expect(linhas.find((l) => l.nivel === 'info')!.contexto).toMatchObject({ tentativasSemPagamento: 1, semVinculo: 1 });
  });

  it('webhook de uma cobrança paga que não é de nenhuma assinatura daqui: rastreável, sem dado pessoal', async () => {
    const c = cenario();
    const avisos: Array<{ kind: string; ctx: Record<string, unknown> }> = [];
    const provider = new AsaasPaymentProvider(
      { apiKey: c.sim.apiKey, environment: 'sandbox', webhookToken: c.sim.token, appUrl: 'https://alicerce.exemplo', billingTypes: ['PIX'] },
      asaasRefs(c.db),
      c.sim.fetch,
      (kind, ctx) => avisos.push({ kind, ctx }),
    );
    const id = await c.abrir();
    c.db.prepare('UPDATE subscriptions SET provider_ref = NULL WHERE id = ?').run(id); // o Checkout não ficou registrado aqui
    c.sim.pagar(id);
    for (const d of c.sim.deliveries.splice(0)) expect(await provider.parseWebhook(d.raw, d.headers, c.sim.now)).toBeNull();
    expect(avisos.map((a) => a.kind)).toContain('cobranca_sem_vinculo');
    const a = avisos.find((x) => x.kind === 'cobranca_sem_vinculo')!;
    expect(a.ctx).toMatchObject({ situacao: 'CONFIRMED', temCheckout: true, temAssinatura: true });
    expect(JSON.stringify(avisos)).not.toMatch(/@|exemplo|cpf|nome/i);
  });

  it('uma leitura que falha uma vez (503) é tentada de novo; a segunda falha vira ProviderUnavailable', async () => {
    const c = cenario();
    const id = await c.abrir();
    c.sim.pagar(id);
    const d = c.sim.deliveries.find((x) => JSON.parse(x.raw).event === 'PAYMENT_CONFIRMED')!;
    let falhas = 1;
    const instavel = (async (input: string | URL | Request, init?: RequestInit) => {
      if (falhas-- > 0) return new Response('{}', { status: 503 });
      return c.sim.fetch(input, init);
    }) as typeof fetch;
    const p = new AsaasPaymentProvider(
      { apiKey: c.sim.apiKey, environment: 'sandbox', webhookToken: c.sim.token, appUrl: 'https://alicerce.exemplo', billingTypes: ['PIX'] },
      asaasRefs(c.db),
      instavel,
    );
    expect((await p.parseWebhook(d.raw, d.headers, c.sim.now))!.type).toBe('pagamento_aprovado');
    falhas = 2;
    await expect(p.parseWebhook(d.raw, d.headers, c.sim.now)).rejects.toBeInstanceOf(ProviderUnavailable);
    // criar um Checkout não é repetido sozinho: duas tentativas poderiam abrir duas páginas
    falhas = 1;
    const sub = createSubscription(c.db, 'u1', 'asaas', 'mensal', c.sim.now);
    await expect(p.checkout({ id: sub.id, email: 'a@exemplo.com', period: 'mensal', price: sub.price }, c.sim.now)).rejects.toBeInstanceOf(ProviderUnavailable);
    expect(c.sim.calls.filter((x) => x.method === 'POST' && x.path === '/checkouts')).toHaveLength(1); // só o de abrir()
  });
});
