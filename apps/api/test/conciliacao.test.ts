/**
 * Conciliação com o provedor (conciliacao.ts) e falhas do provedor nas rotas da assinatura.
 * Servidor real com SQLite em memória e o provedor de teste, que deixa perder webhooks e
 * fazer chamadas falharem. Nenhum provedor real é usado.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.ts';
import { getSubscription, signWebhook, TestPaymentProvider, WEBHOOK_ROUTE } from '../src/assinatura.ts';
import { loadConfig } from '../src/config.ts';
import { openDb } from '../src/db.ts';

const H = { 'content-type': 'application/json', 'x-alicerce': '1' };
let db: ReturnType<typeof openDb>;
let app: Awaited<ReturnType<typeof buildApp>>;
let provedor: TestPaymentProvider;
let cookie: string;
const SEGREDO = 'segredo-dos-webhooks-de-teste';

async function subir() {
  app = await buildApp({ config: { ...loadConfig({ PAGAMENTO_PROVEDOR: 'teste', PAGAMENTO_WEBHOOK_SEGREDO: SEGREDO }), webDist: '/nao-existe' }, db, mailer: null });
  provedor = app.pagamentos as TestPaymentProvider;
}
beforeEach(async () => {
  db = openDb(':memory:');
  await subir();
  const r = await app.inject({ method: 'POST', url: '/api/auth/register', headers: H, payload: { email: 'c@exemplo.com', password: 'uma frase longa' } });
  cookie = String(r.headers['set-cookie']).split(';')[0]!;
});
const post = (url: string, payload: object = {}) => app.inject({ method: 'POST', url, headers: { ...H, cookie }, payload });
const estado = async () => (await app.inject({ method: 'GET', url: '/api/assinatura', headers: { cookie } })).json();
async function assinar() {
  const r = await post('/api/assinatura', { periodo: 'mensal' });
  const id = decodeURIComponent(new URL(r.json().url, 'http://x').hash.slice('#a='.length));
  expect((await post('/api/pagamento/teste/simular', { assinatura: id, resultado: 'aprovar' })).statusCode).toBe(200);
  return id;
}

describe('conciliação: o banco alcança o provedor quando um webhook se perde', () => {
  it('pagamento aprovado cujo webhook não chegou: a conciliação ativa o Premium, uma vez só', async () => {
    provedor.loseNextDeliveries(1);
    const id = await assinar();
    expect((await estado()).plano.plan).toBe('free');
    const r = await app.rotinas.conciliar();
    expect(r).toMatchObject({ conferidas: 1, corrigidas: [{ assinatura: id, eventos: ['pagamento_aprovado'] }], falhas: [], divergencias: [] });
    const depois = await estado();
    expect(depois.plano.plan).toBe('premium');
    expect(depois.plano.expiresAt).toBe((await provedor.fetchState(id))!.paidUntil);
    expect((await app.rotinas.conciliar())!.corrigidas).toEqual([]);
  });

  it('cancelamento e reembolso perdidos também são recuperados', async () => {
    const id = await assinar();
    provedor.loseNextDeliveries(1);
    provedor.fail('fetchState'); // nem a conferência logo depois de cancelar consegue
    expect((await post('/api/assinatura/cancelar')).statusCode).toBe(200);
    expect(getSubscription(db, id)!.status).toBe('ativa'); // o provedor cancelou, o banco ainda não sabe
    provedor.restore();
    expect((await app.rotinas.conciliar())!.corrigidas).toEqual([{ assinatura: id, eventos: ['assinatura_cancelada'] }]);
    expect(getSubscription(db, id)!.status).toBe('cancelada');
    provedor.loseNextDeliveries(1);
    provedor.fail('fetchState');
    expect((await post('/api/assinatura/desistir')).statusCode).toBe(200);
    expect((await estado()).plano.plan).toBe('premium');
    provedor.restore();
    expect((await app.rotinas.conciliar())!.corrigidas).toEqual([{ assinatura: id, eventos: ['reembolso'] }]);
    expect((await estado())).toMatchObject({ plano: { plan: 'free' }, assinatura: { situacao: 'reembolsada' } });
  });

  it('sem o webhook, cancelar e desistir já mostram o que o provedor confirmou', async () => {
    const id = await assinar();
    provedor.loseNextDeliveries(1);
    expect((await post('/api/assinatura/cancelar')).json().assinatura.situacao).toBe('cancelada');
    provedor.loseNextDeliveries(1);
    expect((await post('/api/assinatura/desistir')).json()).toMatchObject({ plano: { plan: 'free' }, assinatura: { situacao: 'reembolsada' } });
    expect(getSubscription(db, id)!.status).toBe('reembolsada');
  });

  it('o webhook original que chega depois da conciliação não muda nada', async () => {
    provedor.loseNextDeliveries(1);
    const id = await assinar();
    await app.rotinas.conciliar();
    const antes = await estado();
    const p = (await provedor.fetchState(id))!;
    // o provedor reentrega o aviso original, com o id dele
    const raw = JSON.stringify({ id: 'evt_original_atrasado', type: 'pagamento_aprovado', subscriptionId: id, paidUntil: p.paidUntil, at: p.firstPaidAt });
    const r = await app.inject({
      method: 'POST',
      url: WEBHOOK_ROUTE,
      headers: { 'content-type': 'application/json', 'x-alicerce-assinatura': signWebhook(SEGREDO, raw, Date.now()) },
      payload: raw,
    });
    expect(r.statusCode).toBe(200);
    expect(await estado()).toEqual(antes);
    expect(db.prepare('SELECT COUNT(*) AS n FROM plan_changes').get()).toEqual({ n: 1 });
  });

  it('provedor que não conhece a assinatura, ou que não responde: nada muda', async () => {
    const id = await assinar();
    const antes = await estado();
    await subir(); // outro processo: o provedor de teste começa sem memória
    expect(await app.rotinas.conciliar()).toMatchObject({ conferidas: 1, desconhecidas: [id], corrigidas: [] });
    provedor.fail('fetchState');
    expect(await app.rotinas.conciliar()).toMatchObject({ conferidas: 0, falhas: [{ assinatura: id }], corrigidas: [] });
    expect((await estado()).plano).toEqual(antes.plano);
  });

  it('sem provedor configurado, não há o que conciliar', async () => {
    app = await buildApp({ config: { ...loadConfig({}), webDist: '/nao-existe' }, db: openDb(':memory:'), mailer: null });
    expect(await app.rotinas.conciliar()).toBeNull();
  });
});

describe('provedor fora do ar nas rotas da assinatura', () => {
  it('cancelar: 502, e a renovação continua ligada; depois, funciona', async () => {
    const id = await assinar();
    provedor.fail('cancel');
    const r = await post('/api/assinatura/cancelar');
    expect(r.statusCode).toBe(502);
    expect(r.json().error).toMatch(/renovação continua ligada/);
    expect(getSubscription(db, id)!.status).toBe('ativa');
    provedor.restore();
    expect((await post('/api/assinatura/cancelar')).json().assinatura.situacao).toBe('cancelada');
  });

  it('desistir: 502 sem estorno; a nova tentativa estorna uma vez só', async () => {
    const id = await assinar();
    provedor.fail('refund');
    expect((await post('/api/assinatura/desistir')).statusCode).toBe(502);
    expect(provedor.refunds.get(id)).toBeUndefined();
    expect((await estado()).plano.plan).toBe('premium');
    provedor.restore();
    expect((await post('/api/assinatura/desistir')).json().assinatura.situacao).toBe('reembolsada');
    await provedor.refund(id); // um segundo pedido (por exemplo, de outra aba) não estorna de novo
    expect(provedor.refunds.get(id)).toBe(1);
  });
});
