/**
 * Limites da IA do tutor sob concorrência e novas tentativas (cota-ia.ts): a reserva confere e
 * soma numa transação só, inclusive entre processos no mesmo arquivo; uma falha do provedor
 * conta; o cliente do provedor não repete sozinho. Nenhuma chamada sai para a rede.
 */
import type Anthropic from '@anthropic-ai/sdk';
import { execFile } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.ts';
import { loadConfig } from '../src/config.ts';
import { reservarChamadaDaIa } from '../src/cota-ia.ts';
import { openDb } from '../src/db.ts';
import { setPlan } from '../src/plans.ts';
import { ClaudeTutor } from '../src/tutor.ts';

const DIA = '2026-10-24';
const PROCESSO = fileURLToPath(new URL('./cota-ia-processo.ts', import.meta.url));
const run = promisify(execFile);

function banco(path = ':memory:') {
  const db = openDb(path);
  for (const id of ['ana', 'bia']) db.prepare('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, 0)').run(id, `${id}@example.com`, 'x');
  return db;
}
const usadas = (db: ReturnType<typeof banco>, id: string, dia = DIA) => (db.prepare('SELECT count FROM tutor_usage WHERE user_id = ? AND day = ?').get(id, dia) as { count: number } | undefined)?.count ?? 0;
const chamadasDoDia = (db: ReturnType<typeof banco>, dia = DIA) => (db.prepare('SELECT calls FROM tutor_ai_daily WHERE day = ?').get(dia) as { calls: number } | undefined)?.calls ?? 0;

describe('reserva de uma chamada da IA', () => {
  it('reserva até o limite do dia e depois recusa sem somar nada', () => {
    const db = banco();
    const lim = { diario: 3, mensal: 200, global: 1000 };
    const r = Array.from({ length: 5 }, () => reservarChamadaDaIa(db, 'ana', DIA, lim));
    expect(r).toEqual([null, null, null, 'daily_limit', 'daily_limit']);
    expect(usadas(db, 'ana')).toBe(3);
    expect(chamadasDoDia(db)).toBe(3);
  });

  it('o mês soma os dias, e o limite do mês vale antes do diário', () => {
    const db = banco();
    db.prepare("INSERT INTO tutor_usage (user_id, day, count) VALUES ('ana', '2026-10-01', 19), ('ana', '2026-09-30', 50)").run();
    const lim = { diario: 20, mensal: 20, global: 1000 };
    expect(reservarChamadaDaIa(db, 'ana', DIA, lim)).toBeNull();
    expect(reservarChamadaDaIa(db, 'ana', DIA, lim)).toBe('monthly_limit');
    // setembro não conta em outubro
    expect(usadas(db, 'ana')).toBe(1);
  });

  it('o teto do Alicerce todo vale para todas as contas juntas', () => {
    const db = banco();
    const lim = { diario: 20, mensal: 200, global: 3 };
    expect([reservarChamadaDaIa(db, 'ana', DIA, lim), reservarChamadaDaIa(db, 'bia', DIA, lim), reservarChamadaDaIa(db, 'ana', DIA, lim)]).toEqual([null, null, null]);
    expect(reservarChamadaDaIa(db, 'bia', DIA, lim)).toBe('budget_limit');
    expect(chamadasDoDia(db)).toBe(3);
  });

  it('erro no meio desfaz a transação e libera o banco', () => {
    const db = banco();
    db.exec('DROP TABLE tutor_ai_daily');
    expect(() => reservarChamadaDaIa(db, 'ana', DIA, { diario: 3, mensal: 200, global: 1000 })).toThrow();
    expect(db.isTransaction).toBe(false);
  });
});

describe('vários processos no mesmo arquivo de banco', () => {
  let dir = '';
  afterEach(() => dir && rmSync(dir, { recursive: true, force: true }));

  // Quatro processos começam no mesmo instante e tentam 15 reservas cada (60 no total). Sem a trava
  // de escrita antes da leitura, dois deles podem ler o mesmo total e passar juntos do limite.
  const disputar = async (contas: string[], limites: object) => {
    dir = mkdtempSync(join(tmpdir(), 'cota-ia-'));
    const caminho = join(dir, 'alicerce.db');
    banco(caminho).close();
    const inicio = Date.now() + 1500;
    const saidas = await Promise.all(
      contas.map((conta) => run(process.execPath, ['--disable-warning=ExperimentalWarning', PROCESSO, caminho, conta, '15', String(inicio), JSON.stringify(limites)])),
    );
    const db = openDb(caminho);
    return { db, reservadas: saidas.map((s) => Number(s.stdout.trim())) };
  };

  it('o limite diário de uma conta não passa de 20 com quatro processos ao mesmo tempo', async () => {
    const { db, reservadas } = await disputar(['ana', 'ana', 'ana', 'ana'], { diario: 20, mensal: 200, global: 1000 });
    try {
      expect(reservadas.reduce((a, b) => a + b, 0)).toBe(20);
      expect(usadas(db, 'ana')).toBe(20);
      expect(chamadasDoDia(db)).toBe(20);
    } finally {
      db.close();
    }
  }, 30_000);

  it('o teto do dia no Alicerce todo não passa com duas contas em quatro processos', async () => {
    const { db, reservadas } = await disputar(['ana', 'bia', 'ana', 'bia'], { diario: 30, mensal: 200, global: 25 });
    try {
      expect(reservadas.reduce((a, b) => a + b, 0)).toBe(25);
      expect(usadas(db, 'ana') + usadas(db, 'bia')).toBe(25);
      expect(chamadasDoDia(db)).toBe(25);
    } finally {
      db.close();
    }
  }, 30_000);
});

describe('novas tentativas depois de falha do provedor', () => {
  it('cada tentativa conta; depois do limite, nenhuma chega ao provedor', async () => {
    const db = openDb(':memory:');
    let chamadas = 0;
    const client = {
      beta: {
        messages: {
          create: async () => {
            chamadas++;
            throw new Error('529 overloaded');
          },
        },
      },
    };
    const config = { ...loadConfig({ ANTHROPIC_API_KEY: 'chave-de-teste', TUTOR_DAILY_LIMIT: '3' }), webDist: '/none', emailLogPath: null };
    const app = await buildApp({ db, config, mailer: null, anthropicClient: client as unknown as Anthropic });
    try {
      const H = { 'x-alicerce': '1', 'content-type': 'application/json' };
      const reg = await app.inject({ method: 'POST', url: '/api/auth/register', headers: H, payload: { email: 'falha@example.com', password: 'long-password-123' } });
      setPlan(db, reg.json().user.id as string, 'premium', null, 'test');
      const headers = { ...H, cookie: String(reg.headers['set-cookie']).split(';')[0]! };
      const motivos: string[] = [];
      for (let i = 0; i < 5; i++) motivos.push((await app.inject({ method: 'POST', url: '/api/tutor', headers, payload: { message: 'Explique variáveis' } })).json().reason);
      expect(motivos).toEqual(['provider_unavailable', 'provider_unavailable', 'provider_unavailable', 'daily_limit', 'daily_limit']);
      expect(chamadas).toBe(3);
      expect(db.prepare('SELECT calls, failures FROM tutor_ai_daily').get()).toEqual({ calls: 3, failures: 3 });
    } finally {
      await app.close();
      db.close();
    }
  });

  it('o cliente do provedor não repete sozinho: uma reserva, no máximo uma chamada', () => {
    const t = new ClaudeTutor('chave-de-teste', 'claude-sonnet-5-5');
    expect((t as unknown as { client: { maxRetries: number } }).client.maxRetries).toBe(0);
  });
});
