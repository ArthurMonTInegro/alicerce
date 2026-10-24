/**
 * O script de homologação do Asaas (scripts/asaas-homologacao.ts) contra a simulação local
 * da API (asaas-simulado.ts). Prova que o script faz só leituras, recusa produção, não
 * mostra segredos e aponta o que diverge; não prova nada sobre o Asaas de verdade.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { conferirAssinatura, EVENTOS_NECESSARIOS, linha, Recusa, verificarAmbiente, verificarApi, type Item } from '../scripts/asaas-homologacao.ts';
import { AsaasPaymentProvider, asaasRefs, type AsaasConfig } from '../src/asaas.ts';
import { applyPaymentEvent, createSubscription, recordProviderRef } from '../src/assinatura.ts';
import { openDb } from '../src/db.ts';
import { AsaasSimulado } from './asaas-simulado.ts';

const APP_URL = 'https://alicerce.exemplo';
const env = (sim: AsaasSimulado, extra: Record<string, string> = {}) => ({
  PAGAMENTO_PROVEDOR: 'asaas',
  ASAAS_API_KEY: sim.apiKey,
  ASAAS_WEBHOOK_TOKEN: sim.token.padEnd(32, 'x'),
  APP_URL,
  ...extra,
});
const webhook = (extra: object = {}) => ({
  id: 'wh_1',
  name: 'Alicerce',
  url: `${APP_URL}/api/pagamento/webhook`,
  email: 'contato@alicerce.exemplo',
  enabled: true,
  interrupted: false,
  apiVersion: 3,
  sendType: 'SEQUENTIALLY',
  events: [...EVENTOS_NECESSARIOS],
  ...extra,
});
const niveis = (itens: Item[]) => itens.map((i) => i.nivel);
const texto = (itens: Item[]) => itens.map(linha).join('\n');

describe('verificar', () => {
  it('recusa produção, pela variável ou pela chave', () => {
    const sim = new AsaasSimulado();
    expect(() => verificarAmbiente(env(sim, { ASAAS_AMBIENTE: 'producao' }))).toThrow(Recusa);
    expect(() => verificarAmbiente(env(sim, { ASAAS_API_KEY: '$aact_prod_abc' }))).toThrow(Recusa);
  });

  it('variáveis faltando ou erradas são falhas, sem mostrar valores', () => {
    const sim = new AsaasSimulado();
    const { itens, cfg } = verificarAmbiente({ ASAAS_API_KEY: 'chave-sem-prefixo', ASAAS_WEBHOOK_TOKEN: 'curto', APP_URL: 'http://127.0.0.1:3001' });
    expect(niveis(itens)).toEqual(['falha', 'falha', 'falha', 'falha']);
    expect(texto(itens)).not.toContain('chave-sem-prefixo');
    expect(cfg).not.toBeNull();
    const bom = verificarAmbiente(env(sim));
    expect(niveis(bom.itens)).toEqual(['ok', 'ok', 'ok', 'ok']);
    expect(texto(bom.itens)).not.toContain(sim.apiKey);
  });

  it('chave aceita, paginação e webhook certo: tudo ok, só com GET, sem a chave nem o token na saída', async () => {
    const sim = new AsaasSimulado();
    sim.webhooks.push(webhook({ authToken: 'nunca-mostrar-isto' }));
    const { cfg } = verificarAmbiente(env(sim));
    const itens = await verificarApi(cfg!, sim.fetch);
    expect(niveis(itens).every((n) => n === 'ok')).toBe(true);
    expect(sim.calls.every((c) => c.method === 'GET')).toBe(true);
    for (const s of [sim.apiKey, cfg!.webhookToken, 'nunca-mostrar-isto']) expect(texto(itens)).not.toContain(s);
  });

  it('fila pausada, webhook desligado, eventos faltando e nenhum webhook para o endereço', async () => {
    const sim = new AsaasSimulado();
    const { cfg } = verificarAmbiente(env(sim));
    sim.webhooks.push(webhook({ interrupted: true, enabled: false, events: ['PAYMENT_RECEIVED'] }));
    const t = texto(await verificarApi(cfg!, sim.fetch));
    expect(t).toContain('✗ webhook desligado');
    expect(t).toContain('✗ [item 13] fila de envio PAUSADA');
    expect(t).toMatch(/✗ eventos que mudam o acesso e não estão no webhook: PAYMENT_CONFIRMED, /);
    sim.webhooks.splice(0, 1, webhook({ url: 'https://outro.exemplo/hook' }));
    expect(texto(await verificarApi(cfg!, sim.fetch))).toContain(`✗ nenhum webhook cadastrado para ${APP_URL}/api/pagamento/webhook (há 1 para: outro.exemplo)`);
  });

  it('chave recusada: uma falha só, com o código', async () => {
    const sim = new AsaasSimulado();
    const { cfg } = verificarAmbiente(env(sim, { ASAAS_API_KEY: '$aact_hmlg_errada' }));
    const itens = await verificarApi(cfg!, sim.fetch);
    expect(itens).toEqual([{ nivel: 'falha', item: 11, texto: expect.stringContaining('o Asaas recusou a chave (401)') }]);
  });
});

describe('conferir uma assinatura paga no sandbox', () => {
  async function paga(sim: AsaasSimulado, entregar = true) {
    const path = join(mkdtempSync(join(tmpdir(), 'homologacao-')), 'alicerce.db');
    const db = openDb(path);
    db.prepare("INSERT INTO users (id, email, password_hash, created_at) VALUES ('u1', 'a@exemplo.com', 'x', 0)").run();
    const cfg: AsaasConfig = { apiKey: sim.apiKey, environment: 'sandbox', webhookToken: sim.token, appUrl: APP_URL, billingTypes: ['CREDIT_CARD'] };
    const provider = new AsaasPaymentProvider(cfg, asaasRefs(db), sim.fetch);
    const sub = createSubscription(db, 'u1', 'asaas', 'mensal', sim.now);
    const c = await provider.checkout({ id: sub.id, email: 'a@exemplo.com', period: 'mensal', price: sub.price }, sim.now);
    recordProviderRef(db, sub.id, c.ref!);
    if (!entregar) sim.perderProximos = 10;
    sim.pagar(sub.id);
    for (const d of sim.deliveries.splice(0)) {
      const ev = await provider.parseWebhook(d.raw, d.headers, sim.now);
      if (ev) applyPaymentEvent(db, 'asaas', ev, sim.now);
    }
    db.close();
    sim.calls.length = 0;
    return { path, cfg, id: sub.id };
  }

  it('com os webhooks entregues: ligação, cobrança e situação iguais nos dois; só leituras', async () => {
    const sim = new AsaasSimulado();
    const { path, cfg, id } = await paga(sim);
    const itens = await conferirAssinatura(path, cfg, id, sim.fetch, sim.now);
    expect(itens.filter((i) => i.nivel === 'falha')).toEqual([]);
    const t = texto(itens);
    expect(t).toContain('✓ [item 2] a externalReference do Checkout passou para a assinatura criada');
    expect(t).toContain('✓ [item 3] um webhook já ligou a assinatura do Asaas à do Alicerce');
    expect(t).toMatch(/✓ cobrança \S+: paga nos dois \((CONFIRMED|RECEIVED)\)/);
    expect(t).toContain('✓ situação da assinatura igual nos dois: ativa');
    expect(sim.calls.every((c) => c.method === 'GET')).toBe(true);
  });

  it('com os webhooks perdidos: a divergência aparece, e o banco não muda (aberto só para leitura)', async () => {
    const sim = new AsaasSimulado();
    sim.propagaReferencia = false;
    const { path, cfg, id } = await paga(sim, false);
    const itens = await conferirAssinatura(path, cfg, id, sim.fetch, sim.now);
    const t = texto(itens);
    expect(t).toContain('? [item 2] a externalReference não passou para a assinatura');
    expect(t).toContain('✓ [item 2] o filtro checkoutSession de GET /payments achou 1 cobrança(s) do Checkout');
    expect(t).toContain('? [item 3] nenhum webhook ligou a assinatura do Asaas ainda');
    expect(t).toMatch(/✗ cobrança \S+ \((CONFIRMED|RECEIVED)\): está no Asaas e não no banco/);
    expect(t).toContain('✗ assinatura: pendente no banco, ativa pelo Asaas');
    const db = openDb(path);
    expect(db.prepare('SELECT provider_subscription, status FROM subscriptions WHERE id = ?').get(id)).toEqual({ provider_subscription: null, status: 'pendente' });
    db.close();
  });

  it('assinatura desconhecida ou de outro provedor', async () => {
    const sim = new AsaasSimulado();
    const { path, cfg } = await paga(sim);
    expect(await conferirAssinatura(path, cfg, 'nao-existe', sim.fetch)).toEqual([{ nivel: 'falha', item: null, texto: 'nenhuma assinatura nao-existe no banco' }]);
  });
});
