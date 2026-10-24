/**
 * Adaptador do Asaas contra a simulação local da API documentada (asaas-simulado.ts).
 * Nenhuma chamada sai daqui: o fetch do adaptador é o da simulação. Passar aqui mostra que
 * o adaptador cumpre o contrato e trata os casos documentados; não mostra que o Asaas se
 * comporta como a simulação supõe (docs/PAGAMENTO.md, "Asaas", lista o que conferir no sandbox).
 */
import type { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.ts';
import { AsaasPaymentProvider, asaasRefs, coverageEnd } from '../src/asaas.ts';
import {
  applyPaymentEvent,
  createSubscription,
  getSubscription,
  periodPrice,
  ProviderUnavailable,
  recordProviderRef,
  WEBHOOK_ROUTE,
  type Period,
} from '../src/assinatura.ts';
import { reconcile } from '../src/conciliacao.ts';
import { loadConfig } from '../src/config.ts';
import { openDb } from '../src/db.ts';
import { chargesOf } from '../src/cobrancas.ts';
import { computeAccess } from '../src/plans.ts';
import { AsaasSimulado, nextCycle } from './asaas-simulado.ts';
import { providerContract, type Delivery } from './contrato-provedor.ts';

import { criarConta } from './cadastro.ts';
const APP_URL = 'https://alicerce.exemplo';
const DIA = 86_400_000;

const adaptador = (sim: AsaasSimulado, db: DatabaseSync) =>
  new AsaasPaymentProvider(
    { apiKey: sim.apiKey, environment: 'sandbox', webhookToken: sim.token, appUrl: APP_URL, billingTypes: ['CREDIT_CARD', 'PIX'] },
    asaasRefs(db),
    sim.fetch,
  );

providerContract('asaas (simulação local da API documentada)', async (db) => {
  const sim = new AsaasSimulado();
  return {
    provider: adaptador(sim, db),
    deliveries: sim.deliveries,
    approve: async (id) => void sim.pagar(id),
    refuse: async (id) => void sim.recusarCartao(id),
    refundsOf: async (id) => sim.cobrancasDe(id).reduce((n, p) => n + (sim.estornos.get(p.id) ?? 0), 0),
    tamper: (d) => sim.adulterar(d),
  };
});

/** Banco, simulação e adaptador ligados, com uma conta (u1) pronta para assinar. */
function cenario(opcoes: Partial<Pick<AsaasSimulado, 'propagaReferencia' | 'removidaSome' | 'filtraPorCheckout'>> = {}) {
  const sim = Object.assign(new AsaasSimulado(), opcoes);
  const db = openDb(':memory:');
  db.prepare("INSERT INTO users (id, email, password_hash, created_at) VALUES ('u1', 'a@exemplo.com', 'x', 0)").run();
  const provider = adaptador(sim, db);
  const abrir = async (period: Period = 'mensal') => {
    const sub = createSubscription(db, 'u1', 'asaas', period);
    const c = await provider.checkout({ id: sub.id, email: 'a@exemplo.com', period, price: sub.price });
    recordProviderRef(db, sub.id, c.ref!);
    return { id: sub.id, url: c.url };
  };
  const drain = async () => {
    const out = [];
    for (const d of sim.deliveries.splice(0)) {
      const ev = await provider.parseWebhook(d.raw, d.headers, Date.now());
      out.push(ev ? applyPaymentEvent(db, 'asaas', ev) : 'ignorado');
    }
    return out;
  };
  const emails = (kind: string) => (db.prepare('SELECT COUNT(*) AS n FROM email_outbox WHERE kind = ?').get(kind) as { n: number }).n;
  return { sim, db, provider, abrir, drain, emails, sub: (id: string) => getSubscription(db, id)! };
}

describe('Asaas: checkout', () => {
  it('pede um Checkout recorrente com os campos que a documentação exige, sem dados da pessoa', async () => {
    const { sim, abrir, sub } = cenario();
    const { id, url } = await abrir('mensal');
    const call = sim.calls.find((c) => c.method === 'POST' && c.path === '/checkouts')!;
    const body = call.body as Record<string, any>;
    expect(body).toMatchObject({
      billingTypes: ['CREDIT_CARD', 'PIX'],
      chargeTypes: ['RECURRENT'],
      externalReference: id,
      subscription: { cycle: 'MONTHLY' },
      items: [{ quantity: 1, value: periodPrice('mensal') / 100 }],
    });
    expect(body.items[0].name.length).toBeLessThanOrEqual(30);
    expect(body.callback.successUrl.startsWith(`${APP_URL}/conta`)).toBe(true);
    // nome, CPF e e-mail a pessoa preenche na página do Asaas; nada disso sai daqui
    expect(body.customerData).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain('a@exemplo.com');
    expect(url).toMatch(/^https:\/\/sandbox\.asaas\.com\//);
    expect(sub(id).provider_ref).toBe(sim.checkoutDe(id).id);
    await abrir('anual');
    const anual = sim.calls.filter((c) => c.path === '/checkouts').at(-1)!.body as Record<string, any>;
    expect(anual).toMatchObject({ subscription: { cycle: 'YEARLY' }, items: [{ value: periodPrice('anual') / 100 }] });
  });

  it('a simulação recusa um Checkout sem os campos obrigatórios (a conferência acima não é vazia)', async () => {
    const { sim } = cenario();
    const post = (b: object) =>
      sim.fetch('https://api-sandbox.asaas.com/v3/checkouts', {
        method: 'POST',
        headers: { access_token: sim.apiKey, 'user-agent': 'teste', 'content-type': 'application/json' },
        body: JSON.stringify(b),
      });
    const ok = {
      billingTypes: ['PIX'],
      chargeTypes: ['DETACHED'],
      callback: { successUrl: 'https://a', cancelUrl: 'https://a' },
      items: [{ name: 'x', quantity: 1, value: 1, imageBase64: 'iVBO' }],
    };
    expect((await post(ok)).status).toBe(200);
    expect((await post({ ...ok, items: [{ name: 'x', quantity: 1, value: 1 }] })).status).toBe(400);
    expect((await post({ ...ok, items: [{ ...ok.items[0], name: 'x'.repeat(31) }] })).status).toBe(400);
    expect((await post({ ...ok, chargeTypes: ['RECURRENT'] })).status).toBe(400); // sem subscription
    expect((await post({ ...ok, billingTypes: ['BOLETO'] })).status).toBe(400);
  });
});

describe('Asaas: pagamentos e renovações', () => {
  it('cartão confirmado e depois recebido: o período não estica e a compra gera um e-mail só', async () => {
    const { sim, abrir, drain, sub, emails } = cenario();
    const { id } = await abrir();
    const { cobranca } = sim.pagar(id);
    await drain();
    const due = sim.cobrancasDe(id)[0]!.dueDate;
    expect(sub(id)).toMatchObject({ status: 'ativa', paid_until: coverageEnd(due, 'mensal') });
    sim.receber(cobranca);
    await drain();
    expect(sub(id).paid_until).toBe(coverageEnd(due, 'mensal'));
    expect(emails('compra')).toBe(1);
  });

  it('Pix pago na hora também ativa', async () => {
    const { sim, abrir, drain, sub, db } = cenario();
    const { id } = await abrir();
    sim.pagar(id, 'PIX');
    await drain();
    expect(sub(id).status).toBe('ativa');
    expect(computeAccess(db, 'u1').plan).toBe('premium');
  });

  it('renovação paga estende um ciclo; a vencida mantém o acesso só até o fim do que foi pago', async () => {
    const { sim, abrir, drain, sub, db, emails } = cenario();
    const { id } = await abrir();
    sim.pagar(id);
    await drain();
    const due1 = sim.cobrancasDe(id)[0]!.dueDate;
    sim.renovar(id, 'paga');
    await drain();
    const fim2 = coverageEnd(nextCycle(due1, 'MONTHLY'), 'mensal');
    expect(sub(id)).toMatchObject({ status: 'ativa', paid_until: fim2 });
    sim.renovar(id, 'vencida');
    await drain();
    expect(sub(id)).toMatchObject({ status: 'ativa', paid_until: fim2 });
    expect(emails('renovacao_recusada')).toBe(1);
    expect(computeAccess(db, 'u1', fim2 - 1).plan).toBe('premium');
    expect(computeAccess(db, 'u1', fim2 + 1).plan).toBe('free');
  });

  it('cartão recusado no checkout e depois pago com outro cartão', async () => {
    const { sim, abrir, drain, sub } = cenario();
    const { id } = await abrir();
    const { cobranca } = sim.recusarCartao(id);
    await drain();
    expect(sub(id).status).toBe('recusada');
    sim.confirmar(cobranca);
    await drain();
    expect(sub(id).status).toBe('ativa');
  });

  it('contestação no cartão (chargeback) suspende o acesso daquela cobrança; a assinatura continua renovando', async () => {
    const { sim, abrir, drain, sub, db } = cenario();
    const { id } = await abrir();
    const { cobranca } = sim.pagar(id);
    await drain();
    sim.contestar(cobranca);
    await drain();
    // Antes, a contestação virava reembolso da assinatura inteira, que era final: a disputa
    // ganha (que volta a CONFIRMED ou RECEIVED, pela documentação) não devolvia o acesso.
    expect(chargesOf(db, id).map((c) => c.status)).toEqual(['contestada']);
    expect(sub(id).status).toBe('ativa');
    expect(computeAccess(db, 'u1').plan).toBe('free');
  });

  it('a assinatura removida que some da API: o cancelamento chega mesmo assim', async () => {
    const { sim, abrir, drain, sub, provider } = cenario({ removidaSome: true });
    const { id } = await abrir();
    sim.pagar(id);
    await drain();
    await provider.cancel(id);
    await drain();
    expect(sub(id).status).toBe('cancelada');
    expect((await provider.fetchState(id))!.status).toBe('cancelada');
  });
});

describe('Asaas: webhooks perdidos e divergências', () => {
  it('todos os webhooks do pagamento perdidos: a conciliação acha a assinatura pela referência externa', async () => {
    const { sim, abrir, sub, db, provider } = cenario();
    const { id } = await abrir();
    sim.perderProximos = 100;
    sim.pagar(id);
    expect(sim.deliveries).toEqual([]);
    expect(sub(id).status).toBe('pendente');
    expect((await reconcile(db, provider)).corrigidas).toEqual([{ assinatura: id, eventos: ['pagamento_aprovado'] }]);
    expect(sub(id)).toMatchObject({ status: 'ativa', provider_subscription: sim.assinaturaDe(id).id });
  });

  it('sem a referência externa na assinatura, a conciliação acha a assinatura pelas cobranças do Checkout', async () => {
    const { sim, abrir, sub, db, provider } = cenario({ propagaReferencia: false });
    const { id } = await abrir();
    sim.perderProximos = 100;
    sim.pagar(id);
    expect((await reconcile(db, provider)).corrigidas).toEqual([{ assinatura: id, eventos: ['pagamento_aprovado'] }]);
    expect(sub(id)).toMatchObject({ status: 'ativa', provider_subscription: sim.assinaturaDe(id).id });
    expect(sim.calls.some((c) => c.path.startsWith(`/payments?checkoutSession=${sim.checkoutDe(id).id}`))).toBe(true);
  });

  it('sem a referência externa nem o filtro por Checkout, a conciliação não adivinha; o próximo webhook resolve', async () => {
    const { sim, abrir, sub, db, provider, drain } = cenario({ propagaReferencia: false, filtraPorCheckout: false });
    const { id } = await abrir();
    sim.perderProximos = 100;
    const { cobranca } = sim.pagar(id);
    const r = await reconcile(db, provider);
    expect(r).toMatchObject({ desconhecidas: [id], corrigidas: [] });
    expect(sub(id).status).toBe('pendente');
    sim.perderProximos = 0;
    sim.receber(cobranca); // um webhook que chega: a cobrança aponta o Checkout de onde veio
    await drain();
    expect(sub(id).status).toBe('ativa');
    expect((await reconcile(db, provider)).desconhecidas).toEqual([]);
  });

  it('um estorno que o Asaas não concluiu aparece como divergência, sem mudar nada sozinho', async () => {
    const { sim, abrir, sub, db, provider, drain } = cenario();
    const { id } = await abrir();
    const { cobranca } = sim.pagar(id);
    await drain();
    await provider.refund(id);
    await drain();
    expect(sub(id).status).toBe('reembolsada');
    sim.mudarSemAviso(cobranca, 'CONFIRMED');
    const r = await reconcile(db, provider);
    expect(r.corrigidas).toEqual([]);
    expect(r.divergencias).toEqual([{ assinatura: id, motivo: expect.stringMatching(/reembolsada no banco/) }]);
    expect(sub(id).status).toBe('reembolsada');
  });

  it('Asaas fora do ar: o webhook não é conferido (ProviderUnavailable), e nada muda', async () => {
    const { sim, abrir, sub, provider } = cenario();
    const { id } = await abrir();
    sim.pagar(id);
    sim.foraDoAr = true;
    const d = sim.deliveries.find((x) => JSON.parse(x.raw).event === 'PAYMENT_CONFIRMED')!;
    await expect(provider.parseWebhook(d.raw, d.headers, Date.now())).rejects.toBeInstanceOf(ProviderUnavailable);
    await expect(provider.cancel(id)).rejects.toBeInstanceOf(ProviderUnavailable);
    expect(sub(id).status).toBe('pendente');
  });
});

describe('Asaas: configuração', () => {
  const base = { apiKey: '$aact_hmlg_x', environment: 'sandbox' as const, webhookToken: 'w'.repeat(32), appUrl: APP_URL, billingTypes: ['PIX' as const] };
  const refs = asaasRefs(openDb(':memory:'));

  it('chave de outro ambiente, token curto ou sem forma de pagamento: não sobe', () => {
    expect(() => new AsaasPaymentProvider(base, refs)).not.toThrow();
    expect(() => new AsaasPaymentProvider({ ...base, apiKey: '$aact_prod_x' }, refs)).toThrow(/ambiente sandbox/);
    expect(() => new AsaasPaymentProvider({ ...base, environment: 'producao' }, refs)).toThrow(/ambiente producao/);
    expect(() => new AsaasPaymentProvider({ ...base, webhookToken: 'curto' }, refs)).toThrow(/32 a 255/);
    expect(() => new AsaasPaymentProvider({ ...base, billingTypes: [] }, refs)).toThrow(/forma de pagamento/);
  });

  it('o servidor não sobe sem chave e token, nem em produção com a venda fechada', async () => {
    const subir = (env: NodeJS.ProcessEnv) => buildApp({ config: { ...loadConfig(env), webDist: '/nao-existe' }, db: openDb(':memory:'), mailer: null });
    await expect(subir({ PAGAMENTO_PROVEDOR: 'asaas' })).rejects.toThrow(/ASAAS_API_KEY e ASAAS_WEBHOOK_TOKEN/);
    await expect(
      subir({ PAGAMENTO_PROVEDOR: 'asaas', ASAAS_AMBIENTE: 'producao', ASAAS_API_KEY: '$aact_prod_x', ASAAS_WEBHOOK_TOKEN: 'w'.repeat(32) }),
    ).rejects.toThrow(/Cobrança real bloqueada/);
    expect(loadConfig({ PAGAMENTO_PROVEDOR: 'asaas', ASAAS_FORMAS: 'pix, boleto' }).asaas).toMatchObject({ environment: 'sandbox', billingTypes: ['PIX'] });
  });
});

describe('Asaas pelas rotas do servidor', () => {
  const H = { 'content-type': 'application/json', 'x-alicerce': '1' };

  async function servidor() {
    const sim = new AsaasSimulado();
    const db = openDb(':memory:');
    const app = await buildApp({
      config: {
        ...loadConfig({ PAGAMENTO_PROVEDOR: 'asaas', ASAAS_API_KEY: sim.apiKey, ASAAS_WEBHOOK_TOKEN: sim.token, APP_URL }),
        webDist: '/nao-existe',
      },
      db,
      mailer: null,
      paymentFetch: sim.fetch,
    });
    const res = await criarConta(app, db, { email: 'b@exemplo.com', password: 'uma frase longa' });
    const cookie = String(res.headers['set-cookie']).split(';')[0]!;
    const post = (url: string, payload: object = {}) => app.inject({ method: 'POST', url, headers: { ...H, cookie }, payload });
    const estado = async () => (await app.inject({ method: 'GET', url: '/api/assinatura', headers: { cookie } })).json();
    const entregar = (d: Delivery) => app.inject({ method: 'POST', url: WEBHOOK_ROUTE, headers: d.headers, payload: d.raw });
    const entregarTodos = async () => {
      const codes = [];
      for (const d of sim.deliveries.splice(0)) codes.push((await entregar(d)).statusCode);
      return codes;
    };
    return { sim, db, app, post, estado, entregar, entregarTodos };
  }

  it('assinar, pagar na página do Asaas, webhook; cancelar mostra o resultado na hora', async () => {
    const { sim, db, post, estado, entregarTodos } = await servidor();
    const r = await post('/api/assinatura', { periodo: 'mensal' });
    expect(r.statusCode).toBe(200);
    expect(r.json().url).toMatch(/^https:\/\/sandbox\.asaas\.com\//);
    const { id } = db.prepare('SELECT id FROM subscriptions').get() as { id: string };
    sim.pagar(id);
    expect(new Set(await entregarTodos())).toEqual(new Set([200]));
    expect(await estado()).toMatchObject({ venda: { provedor: 'asaas', teste: true }, assinatura: { situacao: 'ativa' }, plano: { plan: 'premium' } });
    const c = await post('/api/assinatura/cancelar');
    expect(c.json()).toMatchObject({ assinatura: { situacao: 'cancelada' }, plano: { plan: 'premium' } });
    expect(new Set(await entregarTodos())).toEqual(new Set([200]));
    expect((await estado()).assinatura.situacao).toBe('cancelada');
  });

  it('token errado: 400; Asaas fora do ar: o webhook responde 503 (para ser reentregue) e assinar responde 502', async () => {
    const { sim, db, post, entregar } = await servidor();
    await post('/api/assinatura', { periodo: 'mensal' });
    const { id } = db.prepare('SELECT id FROM subscriptions').get() as { id: string };
    sim.pagar(id);
    const d = sim.deliveries.find((x) => JSON.parse(x.raw).event === 'PAYMENT_CONFIRMED')!;
    expect((await entregar({ ...d, headers: { ...d.headers, 'asaas-access-token': 'x'.repeat(48) } })).statusCode).toBe(400);
    sim.foraDoAr = true;
    expect((await entregar(d)).statusCode).toBe(503);
    expect(getSubscription(db, id)!.status).toBe('pendente');
    const r = await post('/api/assinatura', { periodo: 'anual' });
    expect(r.statusCode).toBe(502);
    expect(r.json().error).toMatch(/Nada foi cobrado/);
    sim.foraDoAr = false;
    expect((await entregar(d)).statusCode).toBe(200);
    expect(getSubscription(db, id)!.status).toBe('ativa');
  });

  it('uma tentativa nova fecha a página da anterior; a anterior que já foi paga não deixa pagar de novo', async () => {
    const { sim, db, post, estado } = await servidor();
    await post('/api/assinatura', { periodo: 'mensal' });
    const primeira = (db.prepare('SELECT id FROM subscriptions').get() as { id: string }).id;
    expect((await post('/api/assinatura', { periodo: 'anual' })).statusCode).toBe(200);
    expect(sim.checkoutDe(primeira).status).toBe('CANCELED');
    expect(getSubscription(db, primeira)!.status).toBe('recusada');
    const segunda = (db.prepare("SELECT id FROM subscriptions WHERE status = 'pendente'").get() as { id: string }).id;
    sim.perderProximos = 100; // paga, e nenhum aviso chega
    sim.pagar(segunda);
    const r = await post('/api/assinatura', { periodo: 'mensal' });
    expect(r.statusCode).toBe(409);
    expect(await estado()).toMatchObject({ assinatura: { situacao: 'ativa' }, plano: { plan: 'premium' } });
    expect(sim.calls.filter((c) => c.path === '/checkouts')).toHaveLength(2);
  });

  it('o prazo de desistência conta do dia do pagamento, e a desistência estorna uma vez', async () => {
    const { sim, db, post, estado, entregarTodos } = await servidor();
    await post('/api/assinatura', { periodo: 'mensal' });
    const { id } = db.prepare('SELECT id FROM subscriptions').get() as { id: string };
    sim.pagar(id);
    await entregarTodos();
    const desistirAte = getSubscription(db, id)!.first_paid_at! + 7 * DIA;
    expect(desistirAte).toBeGreaterThan(Date.now());
    const r = await post('/api/assinatura/desistir');
    expect(r.json()).toMatchObject({ assinatura: { situacao: 'reembolsada' }, plano: { plan: 'free' } });
    expect((await post('/api/assinatura/desistir')).statusCode).toBe(409);
    await entregarTodos();
    expect(sim.cobrancasDe(id).reduce((n, p) => n + (sim.estornos.get(p.id) ?? 0), 0)).toBe(1);
    expect((await estado()).assinatura.situacao).toBe('reembolsada');
  });
});
