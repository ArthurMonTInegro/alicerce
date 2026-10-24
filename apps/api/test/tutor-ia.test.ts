/**
 * O tutor com IA montado pelo próprio servidor (buildApp com ANTHROPIC_API_KEY), com um cliente
 * da Anthropic falso no lugar do de verdade: nenhuma chamada sai para a rede. Confere o que
 * access.test.ts não alcança com o provedor falso de lá: os parâmetros do pedido, as unidades de
 * cada resposta em tutor_ai_daily e a cota com pedidos simultâneos.
 */
import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.ts';
import { loadConfig } from '../src/config.ts';
import { openDb } from '../src/db.ts';
import { setPlan } from '../src/plans.ts';
import { TUTOR_MAX_TOKENS } from '../src/tutor.ts';

import { criarConta } from './cadastro.ts';
const H = { 'x-alicerce': '1', 'content-type': 'application/json' };
type Pedido = { model: string; max_tokens: number; output_config?: { effort?: string }; system: string };
type Resposta = { stop_reason: string; usage: { input_tokens: number; output_tokens: number }; content: Array<{ type: string; text?: string }> };
const respostaOk = (texto = 'Pense no que a função recebe.'): Resposta => ({ stop_reason: 'end_turn', usage: { input_tokens: 900, output_tokens: 120 }, content: [{ type: 'text', text: texto }] });

async function setup(env: Record<string, string> = {}, responder: (p: Pedido) => Promise<Resposta> = async () => respostaOk()) {
  const db = openDb(':memory:');
  const pedidos: Pedido[] = [];
  const client = { beta: { messages: { create: async (p: Pedido) => (pedidos.push(p), responder(p)) } } };
  const config = { ...loadConfig({ ANTHROPIC_API_KEY: 'chave-de-teste', ...env }), webDist: '/none', emailLogPath: null };
  const app = await buildApp({ db, config, mailer: null, anthropicClient: client as unknown as Anthropic });
  const reg = await criarConta(app, db, { email: 'ia@example.com', password: 'long-password-123' });
  const id = reg.json().user.id as string;
  setPlan(db, id, 'premium', null, 'test');
  const headers = { ...H, cookie: String(reg.headers['set-cookie']).split(';')[0]! };
  const ask = (message = 'Explique variáveis') => app.inject({ method: 'POST', url: '/api/tutor', headers, payload: { message } });
  const day = new Date().toISOString().slice(0, 10);
  return {
    db,
    pedidos,
    ask,
    totais: () => db.prepare('SELECT calls, failures, input_tokens AS entrada, output_tokens AS saida FROM tutor_ai_daily WHERE day = ?').get(day),
    usadas: () => (db.prepare('SELECT count FROM tutor_usage WHERE user_id = ? AND day = ?').get(id, day) as { count: number } | undefined)?.count ?? 0,
    close: async () => {
      await app.close();
      db.close();
    },
  };
}

describe('tutor com IA montado pelo servidor (cliente falso)', () => {
  it('pede o modelo configurado, com esforço baixo e o teto de saída; as unidades da resposta entram nos totais do dia', async () => {
    const f = await setup();
    try {
      expect((await f.ask()).json()).toEqual({ reply: 'Pense no que a função recebe.', mode: 'ia' });
      expect(f.pedidos).toHaveLength(1);
      expect(f.pedidos[0]).toMatchObject({ model: 'claude-sonnet-5-5', max_tokens: TUTOR_MAX_TOKENS, output_config: { effort: 'low' } });
      expect(f.totais()).toEqual({ calls: 1, failures: 0, entrada: 900, saida: 120 });
    } finally {
      await f.close();
    }
  });

  it('TUTOR_EFFORT muda o esforço; valor desconhecido volta ao baixo', async () => {
    for (const [valor, esperado] of [['medium', 'medium'], ['max', 'low'], ['', 'low']] as const) {
      const f = await setup({ TUTOR_EFFORT: valor });
      try {
        await f.ask();
        expect(f.pedidos[0]!.output_config?.effort, valor).toBe(esperado);
      } finally {
        await f.close();
      }
    }
  });

  it('resposta cortada no teto: vira o apoio local, conta como falha e as unidades (já cobradas) entram nos totais', async () => {
    const f = await setup({}, async () => ({ stop_reason: 'max_tokens', usage: { input_tokens: 800, output_tokens: TUTOR_MAX_TOKENS }, content: [{ type: 'text', text: 'parcial' }] }));
    try {
      expect((await f.ask()).json()).toMatchObject({ mode: 'offline', reason: 'provider_unavailable' });
      expect(f.totais()).toEqual({ calls: 1, failures: 1, entrada: 800, saida: TUTOR_MAX_TOKENS });
      expect(f.usadas()).toBe(1);
    } finally {
      await f.close();
    }
  });

  it('pedidos simultâneos não passam do limite diário da conta: só os que cabem chamam o modelo', async () => {
    let liberar!: () => void;
    const portao = new Promise<void>((r) => (liberar = r));
    const f = await setup({ TUTOR_DAILY_LIMIT: '2' }, async () => (await portao, respostaOk()));
    try {
      const pendentes = Array.from({ length: 5 }, () => f.ask());
      // as respostas do modelo só chegam depois que os cinco pedidos já passaram pela cota
      await new Promise((r) => setTimeout(r, 50));
      liberar();
      const corpos = (await Promise.all(pendentes)).map((r) => r.json());
      expect(corpos.filter((c) => c.mode === 'ia')).toHaveLength(2);
      expect(corpos.filter((c) => c.reason === 'daily_limit')).toHaveLength(3);
      expect(f.pedidos).toHaveLength(2);
      expect(f.usadas()).toBe(2);
    } finally {
      await f.close();
    }
  });

  it('pedidos simultâneos não passam do teto do dia no Alicerce todo', async () => {
    let liberar!: () => void;
    const portao = new Promise<void>((r) => (liberar = r));
    const f = await setup({ TUTOR_GLOBAL_DAILY_LIMIT: '3' }, async () => (await portao, respostaOk()));
    try {
      const pendentes = Array.from({ length: 5 }, () => f.ask());
      await new Promise((r) => setTimeout(r, 50));
      liberar();
      const corpos = (await Promise.all(pendentes)).map((r) => r.json());
      expect(corpos.filter((c) => c.mode === 'ia')).toHaveLength(3);
      expect(corpos.filter((c) => c.reason === 'budget_limit')).toHaveLength(2);
      expect(f.pedidos).toHaveLength(3);
      expect(f.totais()).toMatchObject({ calls: 3, failures: 0 });
    } finally {
      await f.close();
    }
  });
});
