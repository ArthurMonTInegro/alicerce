/**
 * Ordem das leituras de uma cobrança (cobrancas.ts, recordCharge): cada evento ou conferência diz
 * como a cobrança estava numa leitura do provedor, feita em algum ponto de uma janela de tempo
 * (do pedido à resposta). A leitura mais nova vale, mesmo quando só confirma a situação gravada;
 * uma leitura mais antiga que chega depois não muda nada; leituras que se cruzam com situações
 * diferentes não mudam nada e pedem uma leitura nova.
 *
 * Os dois primeiros testes reproduzem a falha relatada no commit f9efb1a (falhavam lá: o Premium
 * era retirado). Tudo roda contra o banco real em memória; nenhum provedor de verdade é chamado.
 */
import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.ts';
import {
  applyPaymentEvent,
  createSubscription,
  signWebhook,
  WEBHOOK_ROUTE,
  type PaymentEvent,
  type PaymentProvider,
  type ProviderCharge,
  type ProviderSubscriptionState,
} from '../src/assinatura.ts';
import { reconcile, reconcileOne } from '../src/conciliacao.ts';
import { chargesOf, getCharge } from '../src/cobrancas.ts';
import { loadConfig } from '../src/config.ts';
import { openDb } from '../src/db.ts';
import { computeAccess, setPlan } from '../src/plans.ts';
import { criarConta } from './cadastro.ts';

const DIA = 86_400_000;

function banco() {
  const db = openDb(':memory:');
  db.prepare("INSERT INTO users (id, email, password_hash, created_at) VALUES ('u1', 'a@exemplo.com', 'x', 0)").run();
  const id = createSubscription(db, 'u1', 'teste', 'mensal', 0).id;
  const evento = (e: Omit<PaymentEvent, 'subscriptionId'> & { subscriptionId?: string }, now = e.at) =>
    applyPaymentEvent(db, 'teste', { subscriptionId: id, ...e }, now);
  const plano = (at: number) => computeAccess(db, 'u1', at).plan;
  const cobranca = (chargeId = 'c1') => getCharge(db, 'teste', chargeId)!;
  const conta = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
  /** o que só uma mudança comercial deixa: transições, e-mails, mudanças de plano */
  const rastros = () => ({
    transicoes: conta('SELECT COALESCE(SUM(transitions), 0) AS n FROM subscription_charges'),
    emails: conta('SELECT COUNT(*) AS n FROM email_outbox'),
    mudancasDePlano: conta('SELECT COUNT(*) AS n FROM plan_changes'),
  });
  return { db, id, evento, plano, cobranca, conta, rastros };
}

const paga = { type: 'pagamento_aprovado' as const, chargeId: 'c1', coversFrom: 0, paidUntil: 30 * DIA, paidAt: 100 };
const contestacao = { type: 'contestacao' as const, chargeId: 'c1' };

/** Provedor que só responde à conciliação, com a cobrança c1 na situação que o teste mandar. */
function provedor(cobrancas: () => ProviderCharge[], aoLer?: () => Promise<void>) {
  return {
    name: 'teste',
    checkout: async () => ({ url: '' }),
    cancel: async () => {},
    refund: async () => {},
    parseWebhook: () => null,
    fetchState: async (): Promise<ProviderSubscriptionState> => {
      await aoLer?.();
      const cs = cobrancas();
      return { status: 'ativa', paidUntil: Math.max(...cs.map((c) => c.coversUntil ?? 0)), firstPaidAt: 100, canceledAt: null, refundedAt: null, charges: cs };
    },
  } satisfies PaymentProvider;
}
const c1Paga: ProviderCharge = { id: 'c1', status: 'paga', coversFrom: 0, coversUntil: 30 * DIA, paidAt: 100, refundedAt: null };

describe('regressão: a confirmação mais nova não é desfeita por uma contestação mais antiga', () => {
  it('paga em 100, confirmada paga em 300, contestação lida em 200 chega depois: o Premium continua', () => {
    const b = banco();
    expect(b.evento({ id: 'e1', ...paga, at: 100 })).toBe('aplicado');
    b.evento({ id: 'e2', ...paga, at: 300 });
    expect(b.evento({ id: 'e3', ...contestacao, at: 200 }, 400)).toBe('ignorado');
    expect(b.plano(500)).toBe('premium');
    expect(b.cobranca().status).toBe('paga');
  });

  it('o mesmo pela conciliação: paga em 100, a conciliação lê paga em 300, contestação lida em 200 chega depois', async () => {
    const b = banco();
    b.evento({ id: 'e1', ...paga, at: 100 });
    await reconcile(b.db, provedor(() => [c1Paga]), 300);
    expect(b.evento({ id: 'e3', ...contestacao, at: 200 }, 400)).toBe('ignorado');
    expect(b.plano(500)).toBe('premium');
  });
});

describe('a mesma situação numa leitura mais nova', () => {
  it('fica gravada como a leitura mais nova, sem e-mail, sem transição e sem mexer no plano', () => {
    const b = banco();
    b.evento({ id: 'e1', ...paga, at: 100 });
    const antes = b.rastros();
    const updatedAt = b.cobranca().updated_at;
    expect(b.evento({ id: 'e2', ...paga, at: 300 }, 300)).toBe('ignorado'); // nada comercial mudou
    expect(b.cobranca()).toMatchObject({ status: 'paga', observed_at: 300, observed_until: 300 });
    expect(b.cobranca().updated_at).toBeGreaterThan(updatedAt);
    expect(b.rastros()).toEqual(antes);
    expect(b.rastros()).toEqual({ transicoes: 0, emails: 1, mudancasDePlano: 1 }); // o e-mail da compra e o plano, do primeiro evento
  });

  it('a situação escrita pelo provedor (CONFIRMED → RECEIVED) também é só um dado da leitura', () => {
    const b = banco();
    b.evento({ id: 'e1', ...paga, providerStatus: 'CONFIRMED', at: 100 });
    const antes = b.rastros();
    b.evento({ id: 'e2', ...paga, providerStatus: 'RECEIVED', at: 300 });
    expect(b.cobranca()).toMatchObject({ status: 'paga', provider_status: 'RECEIVED', observed_at: 300 });
    expect(b.rastros()).toEqual(antes);
  });

  it('a conciliação que só confirma, rodada várias vezes, não registra eventos nem e-mails', async () => {
    const b = banco();
    b.evento({ id: 'e1', ...paga, at: 100 });
    const antes = { ...b.rastros(), eventos: b.conta('SELECT COUNT(*) AS n FROM payment_events') };
    for (const t of [200, 300, 400]) expect((await reconcile(b.db, provedor(() => [c1Paga]), t)).corrigidas).toEqual([]);
    expect({ ...b.rastros(), eventos: b.conta('SELECT COUNT(*) AS n FROM payment_events') }).toEqual(antes);
    expect(b.cobranca()).toMatchObject({ observed_at: 400, observed_until: 400 });
  });
});

describe('eventos repetidos e mudanças legítimas', () => {
  it('evento duplicado: o mesmo id vale uma vez, e a segunda entrega não mexe nem na leitura', () => {
    const b = banco();
    b.evento({ id: 'e1', ...paga, at: 100 });
    expect(b.evento({ id: 'e2', ...contestacao, at: 300 })).toBe('aplicado');
    const depois = { ...b.cobranca(), ...b.rastros() };
    expect(b.evento({ id: 'e2', ...contestacao, at: 300 }, 900)).toBe('repetido');
    expect({ ...b.cobranca(), ...b.rastros() }).toEqual(depois);
  });

  it('mudança legítima mais recente: depois da confirmação em 300, a contestação lida em 400 vale; e a disputa ganha em 500 devolve o acesso', () => {
    const b = banco();
    b.evento({ id: 'e1', ...paga, at: 100 });
    b.evento({ id: 'e2', ...paga, at: 300 });
    expect(b.evento({ id: 'e3', ...contestacao, at: 400 })).toBe('aplicado');
    expect(b.plano(450)).toBe('free');
    expect(b.cobranca()).toMatchObject({ status: 'contestada', transitions: 1 });
    expect(b.evento({ id: 'e4', ...paga, at: 500 })).toBe('aplicado');
    expect(b.plano(550)).toBe('premium');
    expect(b.cobranca().transitions).toBe(2);
  });

  it('a conciliação também aplica uma mudança mais nova que a última leitura', async () => {
    const b = banco();
    b.evento({ id: 'e1', ...paga, at: 100 });
    const r = await reconcile(b.db, provedor(() => [{ ...c1Paga, status: 'contestada' }]), 300);
    expect(r.corrigidas).toEqual([{ assinatura: b.id, eventos: ['contestacao'] }]);
    expect(b.plano(400)).toBe('free');
  });
});

describe('leituras que se cruzam no tempo (respostas fora de ordem)', () => {
  it('janelas que se cruzam com situações diferentes: nada muda, e uma leitura nova, depois das duas, decide', () => {
    const b = banco();
    b.evento({ id: 'e1', ...paga, at: 50 });
    // B: pedido em 200, resposta em 250, paga. A: pedido em 100, resposta em 400 (lenta), contestada.
    // B chega primeiro; A, depois. A pode ter lido antes ou depois de B: o provedor não diz.
    expect(b.evento({ id: 'B', ...paga, at: 200, observedUntil: 250 }, 260)).toBe('ignorado');
    expect(b.evento({ id: 'A', ...contestacao, at: 100, observedUntil: 400 }, 410)).toBe('ambiguo');
    expect(b.cobranca()).toMatchObject({ status: 'paga', observed_at: 200, observed_until: 250 });
    expect(b.plano(420)).toBe('premium');
    // a leitura feita depois das duas (pedido em 500) diz contestada: agora vale
    expect(b.evento({ id: 'C', ...contestacao, at: 500, observedUntil: 520 })).toBe('aplicado');
    expect(b.plano(530)).toBe('free');
  });

  it('janelas que não se cruzam: a resposta que chega por último, mas leu antes, é antiga', () => {
    const b = banco();
    b.evento({ id: 'e1', ...paga, at: 50 });
    expect(b.evento({ id: 'B', ...paga, at: 200, observedUntil: 250 }, 260)).toBe('ignorado');
    expect(b.evento({ id: 'A', ...contestacao, at: 100, observedUntil: 150 }, 300)).toBe('ignorado'); // terminou antes de B começar
    expect(b.plano(310)).toBe('premium');
  });

  it('mesma situação em janelas que se cruzam: as duas valem; a gravada passa a terminar no fim mais tardio', () => {
    const b = banco();
    b.evento({ id: 'e1', ...paga, at: 50 });
    b.evento({ id: 'B', ...paga, at: 200, observedUntil: 250 });
    expect(b.evento({ id: 'A', ...paga, at: 100, observedUntil: 400 })).toBe('ignorado');
    expect(b.cobranca()).toMatchObject({ observed_at: 200, observed_until: 400 });
    // uma contestação lida entre 300 e 350 cai dentro dessa janela: ambígua
    expect(b.evento({ id: 'X', ...contestacao, at: 300, observedUntil: 350 })).toBe('ambiguo');
  });

  it('o mesmo instante com situações diferentes é ambíguo; com a mesma situação, não muda nada', () => {
    const b = banco();
    b.evento({ id: 'e1', ...paga, at: 100 });
    const antes = b.rastros();
    expect(b.evento({ id: 'e2', ...contestacao, at: 100 })).toBe('ambiguo');
    expect(b.evento({ id: 'e3', ...paga, at: 100 })).toBe('ignorado');
    expect(b.cobranca()).toMatchObject({ status: 'paga', observed_at: 100 });
    expect(b.rastros()).toEqual(antes);
  });

  it('banco que passou pelo código anterior (só observed_at, sem observed_until): a janela termina em observed_at', () => {
    const b = banco();
    b.evento({ id: 'e1', ...paga, at: 200, observedUntil: 250 });
    // voltar de versão: o código anterior grava uma contestação lida em 400 sem conhecer observed_until
    b.db.prepare("UPDATE subscription_charges SET status = 'contestada', observed_at = 400 WHERE charge_id = 'c1'").run();
    // de novo no código novo, uma confirmação lida entre 300 e 450 pode ser anterior à contestação:
    // ambígua, não devolve o acesso (a janela gravada vai até 400, não até o 250 que ficou para trás)
    expect(b.evento({ id: 'e2', ...paga, at: 300, observedUntil: 450 })).toBe('ambiguo');
    expect(b.cobranca()).toMatchObject({ status: 'contestada', observed_at: 400 });
    expect(b.plano(500)).toBe('free');
    expect(b.evento({ id: 'e3', ...paga, at: 500, observedUntil: 520 })).toBe('aplicado');
  });

  it('a conciliação carimba cada leitura com a hora dela, não com a hora em que a rodada começou', async () => {
    const b = banco();
    b.db.prepare("UPDATE subscriptions SET status = 'ativa' WHERE id = ?").run(b.id); // (uma tentativa pendente seria trocada pela nova)
    const outra = createSubscription(b.db, 'u1', 'teste', 'mensal', 0).id;
    b.db.prepare("UPDATE subscriptions SET status = 'ativa' WHERE id = ?").run(outra);
    const cobrancas: Record<string, ProviderCharge> = {
      [b.id]: { ...c1Paga, id: 'c1' },
      [outra]: { ...c1Paga, id: 'c2' },
    };
    let lendo = '';
    const p = {
      ...provedor(() => [cobrancas[lendo]!]),
      fetchState: async (id: string) => {
        lendo = id;
        await new Promise((r) => setTimeout(r, 20)); // cada leitura demora
        return provedor(() => [cobrancas[id]!]).fetchState();
      },
    };
    const inicio = Date.now();
    await reconcile(b.db, p);
    const [c1, c2] = [getCharge(b.db, 'teste', 'c1')!, getCharge(b.db, 'teste', 'c2')!];
    expect(c1.observed_at).toBeGreaterThanOrEqual(inicio);
    expect(c1.observed_until! - c1.observed_at).toBeGreaterThanOrEqual(15); // a janela cobre a espera da resposta
    expect(c2.observed_at).toBeGreaterThan(c1.observed_until!); // a segunda leitura começou depois da primeira terminar
  });
});

describe('reembolsos, concessões e falhas continuam como antes', () => {
  it('cobrança antiga reembolsada e o período atual pago, com confirmações no meio: o acesso segue até o fim da atual', () => {
    const b = banco();
    b.evento({ id: 'c1-paga', ...paga, at: 100 });
    b.evento({ id: 'c2-paga', type: 'pagamento_aprovado', chargeId: 'c2', coversFrom: 30 * DIA, paidUntil: 60 * DIA, paidAt: 29 * DIA, at: 29 * DIA });
    b.evento({ id: 'c2-confirma', type: 'pagamento_aprovado', chargeId: 'c2', coversFrom: 30 * DIA, paidUntil: 60 * DIA, paidAt: 29 * DIA, at: 31 * DIA });
    expect(b.evento({ id: 'c1-estorno', type: 'reembolso', chargeId: 'c1', at: 35 * DIA })).toBe('aplicado');
    // um aviso antigo de que c2 estava pendente ou contestada, lido antes da confirmação, não muda nada
    expect(b.evento({ id: 'c2-velho', type: 'contestacao', chargeId: 'c2', at: 30 * DIA })).toBe('ignorado');
    expect(computeAccess(b.db, 'u1', 36 * DIA)).toEqual({ plan: 'premium', expiresAt: 60 * DIA });
    expect(chargesOf(b.db, b.id).map((c) => [c.charge_id, c.status])).toEqual([['c1', 'estornada'], ['c2', 'paga']]);
  });

  it('concessão manual válida: nem a contestação mais nova nem a confirmação a tocam', () => {
    const b = banco();
    b.evento({ id: 'e1', ...paga, at: 100 });
    setPlan(b.db, 'u1', 'premium', 90 * DIA, 'admin', 150);
    b.evento({ id: 'e2', ...paga, at: 300 });
    b.evento({ id: 'e3', ...contestacao, at: 400 });
    expect(computeAccess(b.db, 'u1', 500)).toEqual({ plan: 'premium', expiresAt: 90 * DIA });
  });

  it('uma falha ao gravar a confirmação desfaz tudo, e a mesma entrega depois vale', () => {
    const b = banco();
    b.evento({ id: 'e1', ...paga, at: 100 });
    b.db.exec("CREATE TRIGGER falha BEFORE UPDATE ON subscription_charges BEGIN SELECT RAISE(ABORT, 'falha simulada'); END;");
    expect(() => b.evento({ id: 'e2', ...paga, at: 300 })).toThrow(/falha simulada/);
    expect(b.cobranca().observed_at).toBe(100);
    expect(b.conta("SELECT COUNT(*) AS n FROM payment_events WHERE id = 'e2'")).toBe(0);
    b.db.exec('DROP TRIGGER falha');
    expect(b.evento({ id: 'e2', ...paga, at: 300 })).toBe('ignorado');
    expect(b.cobranca().observed_at).toBe(300);
    expect(b.evento({ id: 'e3', ...contestacao, at: 200 })).toBe('ignorado');
    expect(b.plano(500)).toBe('premium');
  });
});

describe('o webhook ambíguo pede uma leitura nova ao provedor', () => {
  it('rota do webhook: responde 200 "ambiguo", nada muda, e a conferência logo depois grava a leitura nova', async () => {
    const SEGREDO = 'segredo-dos-webhooks-de-teste';
    const db = openDb(':memory:');
    const app = await buildApp({
      config: { ...loadConfig({ PAGAMENTO_PROVEDOR: 'teste', PAGAMENTO_WEBHOOK_SEGREDO: SEGREDO }), webDist: '/nao-existe' },
      db,
      mailer: { name: 'memória', send: async () => {} },
    });
    const conta = await criarConta(app, db, { email: 'a@exemplo.com', password: 'uma frase longa' });
    const cookie = String(conta.headers['set-cookie']).split(';')[0]!;
    const H = { 'content-type': 'application/json', 'x-alicerce': '1', cookie };
    const r = await app.inject({ method: 'POST', url: '/api/assinatura', headers: H, payload: { periodo: 'mensal' } });
    const id = decodeURIComponent(new URL(r.json().url, 'http://x').hash.slice('#a='.length));
    await app.inject({ method: 'POST', url: '/api/pagamento/teste/simular', headers: H, payload: { assinatura: id, resultado: 'aprovar' } });
    const [c] = chargesOf(db, id);
    expect(c!.status).toBe('paga');
    // uma contestação lida no mesmo instante da leitura gravada: não dá para saber qual é a mais nova
    const raw = JSON.stringify({ id: 'evt_cruzado', type: 'contestacao', subscriptionId: id, chargeId: c!.charge_id, at: c!.observed_at });
    const res = await app.inject({ method: 'POST', url: WEBHOOK_ROUTE, headers: { 'content-type': 'application/json', 'x-alicerce-assinatura': signWebhook(SEGREDO, raw, Date.now()) }, payload: raw });
    expect(res.json()).toEqual({ ok: true, result: 'ambiguo' });
    // a conferência roda logo depois da resposta; o provedor diz paga, numa leitura mais nova
    for (let i = 0; i < 50 && getCharge(db, 'teste', c!.charge_id)!.observed_at === c!.observed_at; i++) await new Promise((r) => setTimeout(r, 10));
    expect(getCharge(db, 'teste', c!.charge_id)).toMatchObject({ status: 'paga', observed_at: expect.any(Number) });
    expect(getCharge(db, 'teste', c!.charge_id)!.observed_at).toBeGreaterThan(c!.observed_at);
    expect(computeAccess(db, conta.json().user.id).plan).toBe('premium');
    await app.close();
  });

  it('reconcileOne depois de uma leitura ambígua aplica a situação que o provedor dá agora', async () => {
    const b = banco();
    b.evento({ id: 'e1', ...paga, at: 100 });
    expect(b.evento({ id: 'e2', ...contestacao, at: 100 })).toBe('ambiguo');
    b.db.prepare("UPDATE subscriptions SET status = 'ativa' WHERE id = ?").run(b.id);
    await reconcileOne(b.db, provedor(() => [{ ...c1Paga, status: 'contestada' }]), b.id, 200);
    expect(b.cobranca().status).toBe('contestada');
    expect(b.plano(300)).toBe('free');
  });
});
