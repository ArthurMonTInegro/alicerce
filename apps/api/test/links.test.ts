/**
 * A fila dos e-mails com link (links.ts): o cadastro e a troca de senha sobrevivem a falhas do
 * fornecedor de e-mail e a um reinício do servidor, sem mandar link vencido ou trocado e sem
 * guardar o link nem a chave no banco. Tudo roda contra o servidor real (Fastify + SQLite) via
 * inject, com um fornecedor de e-mail que segue um roteiro (nenhum e-mail sai daqui). O tempo
 * das novas tentativas é simulado passando `now` a app.rotinas.enviarLinks.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../src/app.ts';
import { RESET_MINUTES, SIGNUP_MINUTES } from '../src/auth.ts';
import { loadConfig } from '../src/config.ts';
import { openDb } from '../src/db.ts';
import { MailError, ResendMailer, type Mail, type Mailer } from '../src/email.ts';
import { LINK_BACKOFF_MS, LINK_KEEP_MS, LINK_LEASE_MS, LINK_MAX_ATTEMPTS, linkKey, linkToken } from '../src/links.ts';
import { criarConta } from './cadastro.ts';

const H = { 'content-type': 'application/json', 'x-alicerce': '1' };
const SENHA = 'uma frase longa';
const SEGREDO = 'chave-dos-links-so-para-os-testes-0123456789';
const MIN = 60_000;

/**
 * Fornecedor de e-mail com roteiro: cada envio segue o próximo passo (depois, `padrao`).
 * 'entrega-e-falha' é o caso do tempo esgotado depois de o fornecedor já ter aceitado o e-mail.
 */
type Passo = 'ok' | 'temporaria' | 'permanente' | 'entrega-e-falha' | 'inesperado' | 'parado';
class Fornecedor implements Mailer {
  readonly name = 'roteiro';
  pedidos: Mail[] = [];
  entregues: Mail[] = [];
  liberar: (() => void) | null = null;
  private passos: Passo[];
  private padrao: Passo;
  constructor(passos: Passo[] = [], padrao: Passo = 'ok') {
    this.passos = [...passos];
    this.padrao = padrao;
  }
  async send(m: Mail) {
    this.pedidos.push(m);
    const p = this.passos.shift() ?? this.padrao;
    if (p === 'temporaria') throw new MailError('Resend 503 service_unavailable', true);
    if (p === 'permanente') throw new MailError('Resend 422 validation_error', false);
    if (p === 'inesperado') throw new Error(`falhou para ${m.to}: ${m.text}`);
    if (p === 'parado') await new Promise<void>((r) => (this.liberar = r));
    this.entregues.push(m);
    if (p === 'entrega-e-falha') throw new MailError('sem resposta do Resend (TimeoutError)', true);
  }
}

const tokenDe = (m: Mail | undefined) => /#t=([A-Za-z0-9_-]+)/.exec(m?.text ?? '')?.[1] ?? null;

async function servidor(o: { db?: DatabaseSync; mailer?: Mailer; env?: NodeJS.ProcessEnv; logs?: string[] } = {}) {
  const db = o.db ?? openDb(':memory:');
  const mailer = o.mailer ?? new Fornecedor();
  const logs = o.logs;
  const app = await buildApp({
    config: { ...loadConfig({ LINKS_SEGREDO: SEGREDO, APP_URL: 'https://alicerce.exemplo', ...o.env }), webDist: '/nao-existe' },
    db,
    mailer,
    ...(logs ? { logger: { stream: { write: (l: string) => void logs.push(l) } } } : {}),
  });
  const post = (url: string, payload: object) => app.inject({ method: 'POST', url, headers: H, payload });
  return {
    db,
    app,
    pedir: (email: string, password = SENHA) => post('/api/auth/register', { email, password }),
    recuperar: (email: string) => post('/api/auth/senha/recuperar', { email }),
    confirmar: (token: string | null) => post('/api/auth/confirmar', { token }),
    redefinir: (token: string | null, password = 'uma senha nova e longa') => post('/api/auth/senha/redefinir', { token, password }),
    login: (email: string, password = SENHA) => post('/api/auth/login', { email, password }),
    /** uma rodada da fila `dt` ms no futuro */
    enviar: (dt = 0) => app.rotinas.enviarLinks(Date.now() + dt),
    linhas: () =>
      db.prepare('SELECT id, kind, attempts, outcome, sent_at IS NOT NULL AS enviado, finished_at IS NOT NULL AS terminado, last_error FROM link_outbox ORDER BY id').all() as Array<{
        id: number;
        kind: string;
        attempts: number;
        outcome: string | null;
        enviado: number;
        terminado: number;
        last_error: string | null;
      }>,
    /** o link que a fila refaria para a linha (como um atacante com a chave e o banco faria) */
    linkDaLinha: (id: number) => {
      const r = db.prepare('SELECT kind, to_address, link_nonce FROM link_outbox WHERE id = ?').get(id) as { kind: 'cadastro' | 'senha'; to_address: string; link_nonce: string };
      return linkToken(linkKey(SEGREDO), r.kind, r.to_address, r.link_nonce);
    },
  };
}

// Cada pedido de cadastro passa pelo scrypt (dezenas de ms, mais com a suíte em paralelo).
const SCRYPT = { timeout: 30_000 };

const tmps: string[] = [];
const arquivo = () => {
  const d = mkdtempSync(join(tmpdir(), 'alicerce-links-'));
  tmps.push(d);
  return join(d, 'alicerce.db');
};
afterEach(() => {
  for (const d of tmps.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe('falhas do fornecedor de e-mail não obrigam a pedir de novo', SCRYPT, () => {
  it('falha temporária e depois sucesso: o mesmo pedido, o mesmo link, e a conta nasce por ele', async () => {
    const mailer = new Fornecedor(['temporaria']);
    const s = await servidor({ mailer });
    expect((await s.pedir('ana@exemplo.com')).statusCode).toBe(202);
    const r1 = await s.enviar();
    expect(r1).toMatchObject({ enviados: 0, falhas: 1, erros: { 'Resend 503 service_unavailable': 1 } });
    expect(s.linhas()).toMatchObject([{ kind: 'cadastro', attempts: 1, terminado: 0, last_error: 'Resend 503 service_unavailable' }]);

    // antes da espera, nada; depois dela, a nova tentativa
    await s.enviar(LINK_BACKOFF_MS[0]! - 1_000);
    expect(mailer.pedidos).toHaveLength(1);
    expect((await s.enviar(LINK_BACKOFF_MS[0]! + 1_000)).enviados).toBe(1);
    expect(s.linhas()).toMatchObject([{ attempts: 2, outcome: 'enviado', enviado: 1, last_error: null }]);
    // as duas tentativas com a mesma chave de idempotência e o mesmo texto: o fornecedor não duplica
    expect(mailer.pedidos[1]).toEqual(mailer.pedidos[0]);
    expect(mailer.pedidos[0]!.once).toBe(true);

    expect((await s.confirmar(tokenDe(mailer.entregues[0]))).statusCode).toBe(201);
    expect((await s.login('ana@exemplo.com')).statusCode).toBe(200);
  });

  it('erro inesperado (não do fornecedor) também tenta de novo; o texto do e-mail diz o prazo como data e hora', async () => {
    const mailer = new Fornecedor(['inesperado']);
    const s = await servidor({ mailer });
    await s.pedir('bia@exemplo.com');
    expect((await s.enviar()).erros).toEqual({ 'erro inesperado no envio (Error)': 1 });
    expect((await s.enviar(LINK_BACKOFF_MS[0]! + 1_000)).enviados).toBe(1);
    const texto = mailer.entregues[0]!.text;
    expect(texto).toMatch(/abra este link até \d{2}\/\d{2}\/\d{4}, \d{2}:\d{2} \(horário de Brasília\):/);
    expect(texto).not.toMatch(/em até \d+ minutos/);
    expect(texto).toContain('use o mais recente: só o último link vale');
  });

  it('a espera pedida pelo fornecedor (retry-after) é respeitada quando passa da espera da fila', async () => {
    const mailer: Mailer = { name: 'limite', send: async () => { throw new MailError('Resend 429 rate_limit_exceeded', true, 3 * MIN); } };
    const s = await servidor({ mailer });
    await s.pedir('caio@exemplo.com');
    await s.enviar();
    const proxima = (s.db.prepare('SELECT next_attempt_at - created_at AS d FROM link_outbox').get() as { d: number }).d;
    expect(proxima).toBeGreaterThanOrEqual(3 * MIN);
    expect(proxima).toBeLessThan(3 * MIN + 10_000);
  });
});

describe('reinício do servidor entre o pedido e o envio', SCRYPT, () => {
  it('o servidor novo envia o que ficou na fila, e o link abre nele', async () => {
    const file = arquivo();
    const a = await servidor({ db: openDb(file), mailer: new Fornecedor([], 'temporaria') });
    await a.pedir('dani@exemplo.com');
    await a.enviar();
    expect(a.linhas()).toMatchObject([{ attempts: 1, terminado: 0 }]);
    a.db.close(); // o processo cai

    const mailer = new Fornecedor();
    const b = await servidor({ db: openDb(file), mailer });
    expect((await b.enviar(LINK_BACKOFF_MS[0]! + 1_000)).enviados).toBe(1);
    expect((await b.confirmar(tokenDe(mailer.entregues[0]))).statusCode).toBe(201);
    b.db.close();
  });

  it('caiu no meio de um envio: espera a reserva vencer e repete com a mesma chave de idempotência', async () => {
    const file = arquivo();
    const parado = new Fornecedor([], 'parado');
    const a = await servidor({ db: openDb(file), mailer: parado });
    await a.recuperar('ninguem@exemplo.com'); // sem conta: nada na fila
    await criarConta(a.app, a.db, { email: 'edu@exemplo.com', password: SENHA });
    await a.recuperar('edu@exemplo.com');
    await vi.waitFor(() => expect(parado.pedidos).toHaveLength(1)); // o envio começou e não termina
    a.db.close(); // o processo cai com o envio em andamento

    const mailer = new Fornecedor();
    const b = await servidor({ db: openDb(file), mailer });
    expect((await b.enviar()).enviados).toBe(0); // a reserva ainda vale
    expect((await b.enviar(LINK_LEASE_MS + 1_000)).enviados).toBe(1);
    expect(mailer.pedidos[0]!.key).toBe(parado.pedidos[0]!.key);
    expect(mailer.pedidos[0]!.text).toBe(parado.pedidos[0]!.text);
    expect(b.linhas()).toMatchObject([{ kind: 'senha', attempts: 2, outcome: 'enviado' }]);
    expect((await b.redefinir(tokenDe(mailer.entregues[0]))).statusCode).toBe(204);
    b.db.close();
  });

  it('com outra chave (LINKS_SEGREDO trocado, ou a temporária fora de produção), o que esperava não sai: não abriria', async () => {
    const file = arquivo();
    const a = await servidor({ db: openDb(file), mailer: new Fornecedor(['temporaria']), env: { LINKS_SEGREDO: '' } });
    await a.pedir('fabi@exemplo.com');
    await a.enviar();
    a.db.close();

    const mailer = new Fornecedor();
    const b = await servidor({ db: openDb(file), mailer, env: { LINKS_SEGREDO: '' } });
    expect((await b.enviar(LINK_BACKOFF_MS[0]! + 1_000)).encerrados).toEqual({ chave_trocada: 1 });
    expect(mailer.pedidos).toEqual([]);
    // pedir de novo funciona na hora
    await b.pedir('fabi@exemplo.com');
    await b.enviar();
    expect((await b.confirmar(tokenDe(mailer.entregues[0]))).statusCode).toBe(201);
    b.db.close();
  });
});

describe('um pedido novo troca o anterior', SCRYPT, () => {
  it('só o link novo sai e vale; o anterior, que esperava nova tentativa, não sai mais', async () => {
    const mailer = new Fornecedor(['temporaria']);
    const s = await servidor({ mailer });
    await s.pedir('gil@exemplo.com', 'senha de quem não é o dono');
    await s.enviar();
    await s.pedir('gil@exemplo.com');
    await s.enviar();
    expect(s.linhas()).toMatchObject([
      { outcome: 'trocado', enviado: 0 },
      { outcome: 'enviado', enviado: 1 },
    ]);
    await s.enviar(LINK_BACKOFF_MS[0]! + 1_000);
    expect(mailer.entregues).toHaveLength(1);
    const [antiga, nova] = s.linhas();
    expect((await s.confirmar(s.linkDaLinha(antiga!.id))).statusCode).toBe(400);
    expect(tokenDe(mailer.entregues[0])).toBe(s.linkDaLinha(nova!.id));
    expect((await s.confirmar(tokenDe(mailer.entregues[0]))).statusCode).toBe(201);
    expect((await s.login('gil@exemplo.com')).statusCode).toBe(200);
  });

  it('trocado durante um envio em andamento: o e-mail anterior sai (não dá para impedir), mas o link dele não vale', async () => {
    const mailer = new Fornecedor(['parado']);
    const s = await servidor({ mailer });
    await s.pedir('hugo@exemplo.com', 'senha de quem não é o dono');
    await vi.waitFor(() => expect(mailer.pedidos).toHaveLength(1));
    await s.pedir('hugo@exemplo.com');
    const rodada = s.enviar();
    mailer.liberar!();
    await rodada;
    expect(s.linhas()).toMatchObject([
      { outcome: 'trocado', enviado: 1 },
      { outcome: 'enviado', enviado: 1 },
    ]);
    expect((await s.confirmar(tokenDe(mailer.entregues[0]))).statusCode).toBe(400);
    expect((await s.confirmar(tokenDe(mailer.entregues[1]))).statusCode).toBe(201);
  });

  it('trocado durante um envio que falha: sem repetição, nem dentro do envio (Resend com uma tentativa só) nem na fila', async () => {
    let soltar!: (r: Response) => void;
    const pedidos: string[] = [];
    const http = (async (_url: unknown, init?: RequestInit) => {
      pedidos.push(JSON.parse(String(init!.body)).text as string);
      if (pedidos.length === 1) return new Promise<Response>((r) => (soltar = r));
      return new Response(JSON.stringify({ id: 'x' }), { status: 200 });
    }) as typeof fetch;
    const s = await servidor({ mailer: new ResendMailer({ apiKey: 're_teste', from: 'Alicerce <nao-responda@alicerce.exemplo>' }, http, async () => {}) });
    await s.pedir('iara@exemplo.com', 'senha de quem não é a dona');
    await vi.waitFor(() => expect(pedidos).toHaveLength(1));
    await s.pedir('iara@exemplo.com');
    const rodada = s.enviar();
    soltar(new Response(JSON.stringify({ name: 'internal_server_error' }), { status: 500 }));
    await rodada;
    await s.enviar(LINK_BACKOFF_MS[0]! + 1_000);
    expect(pedidos).toHaveLength(2); // um por pedido: o trocado não foi repetido
    expect(s.linhas()).toMatchObject([
      { outcome: 'trocado', enviado: 0, attempts: 1 },
      { outcome: 'enviado', enviado: 1 },
    ]);
    expect((await s.confirmar(tokenDe({ to: '', subject: '', text: pedidos[1]! }))).statusCode).toBe(201);
  });
});

describe('link vencido, já usado ou sem pedido não sai', SCRYPT, () => {
  it(`o cadastro (${SIGNUP_MINUTES} min) e a senha (${RESET_MINUTES} min) não saem perto de vencer`, async () => {
    const mailer = new Fornecedor([], 'temporaria');
    const s = await servidor({ mailer });
    await s.pedir('joana@exemplo.com');
    await criarConta(s.app, s.db, { email: 'joao@exemplo.com', password: SENHA });
    await s.recuperar('joao@exemplo.com');
    await s.enviar();
    expect(mailer.pedidos).toHaveLength(2);
    // 26 minutos depois, faltam 4 para a senha vencer (menos que os 5 de margem): ela não sai, e o
    // cadastro, que ainda vale meia hora, é tentado de novo
    expect(await s.enviar((RESET_MINUTES - 4) * MIN)).toMatchObject({ falhas: 1, encerrados: { vencido: 1 } });
    expect(mailer.pedidos.at(-1)!.subject).toBe('Alicerce: confirme o seu cadastro');
    expect(await s.enviar((SIGNUP_MINUTES - 4) * MIN)).toMatchObject({ falhas: 0, encerrados: { vencido: 1 } });
    expect(mailer.pedidos).toHaveLength(3);
    expect(s.linhas().map((l) => [l.kind, l.outcome])).toEqual([
      ['cadastro', 'vencido'],
      ['senha', 'vencido'],
    ]);
  });

  it('cadastro confirmado antes da nova tentativa (o primeiro envio chegou, mas a resposta não): a fila não manda de novo', async () => {
    const mailer = new Fornecedor(['entrega-e-falha']);
    const s = await servidor({ mailer });
    await s.pedir('lia@exemplo.com');
    await s.enviar();
    expect(s.linhas()).toMatchObject([{ terminado: 0, last_error: 'sem resposta do Resend (TimeoutError)' }]);
    expect((await s.confirmar(tokenDe(mailer.entregues[0]))).statusCode).toBe(201);
    expect((await s.enviar(LINK_BACKOFF_MS[0]! + 1_000)).encerrados).toEqual({ sem_pedido: 1 });
    expect(mailer.pedidos).toHaveLength(1);
  });

  it('senha já trocada antes da nova tentativa: idem; e "você já tem uma conta" não sai se a conta foi excluída', async () => {
    const mailer = new Fornecedor(['entrega-e-falha', 'temporaria']);
    const s = await servidor({ mailer });
    await criarConta(s.app, s.db, { email: 'max@exemplo.com', password: SENHA });
    await s.recuperar('max@exemplo.com');
    await s.enviar();
    expect((await s.redefinir(tokenDe(mailer.entregues[0]))).statusCode).toBe(204);
    await s.pedir('max@exemplo.com'); // já tem conta: o aviso entra na fila e falha
    await s.enviar();
    s.db.prepare('DELETE FROM users').run();
    expect((await s.enviar(LINK_BACKOFF_MS[0]! + 1_000)).encerrados).toEqual({ sem_pedido: 1, sem_conta: 1 });
    expect(mailer.pedidos).toHaveLength(2);
  });
});

describe('erro permanente e tentativas esgotadas', SCRYPT, () => {
  it('erro permanente do fornecedor: para na primeira, com o código guardado', async () => {
    const mailer = new Fornecedor(['permanente']);
    const s = await servidor({ mailer });
    await s.pedir('nina@exemplo.com');
    expect((await s.enviar()).encerrados).toEqual({ erro_permanente: 1 });
    await s.enviar(10 * MIN);
    expect(mailer.pedidos).toHaveLength(1);
    expect(s.linhas()).toMatchObject([{ outcome: 'erro_permanente', last_error: 'Resend 422 validation_error', attempts: 1 }]);
  });

  it(`falha temporária sem fim: ${LINK_MAX_ATTEMPTS} tentativas espaçadas e para`, async () => {
    const mailer = new Fornecedor([], 'temporaria');
    const s = await servidor({ mailer });
    await s.pedir('otto@exemplo.com');
    await s.enviar();
    let t = 0;
    for (const espera of LINK_BACKOFF_MS) {
      t += espera + 1_000;
      await s.enviar(t);
    }
    expect(mailer.pedidos).toHaveLength(LINK_MAX_ATTEMPTS);
    expect(s.linhas()).toMatchObject([{ outcome: 'esgotado', attempts: LINK_MAX_ATTEMPTS }]);
    await s.enviar(t + 15 * MIN);
    expect(mailer.pedidos).toHaveLength(LINK_MAX_ATTEMPTS);
  });
});

describe('várias rodadas ao mesmo tempo', SCRYPT, () => {
  it('dois servidores no mesmo banco: o e-mail sai uma vez', async () => {
    const file = arquivo();
    const parado = new Fornecedor(['parado']);
    const outro = new Fornecedor();
    const a = await servidor({ db: openDb(file), mailer: parado });
    const b = await servidor({ db: openDb(file), mailer: outro });
    await a.pedir('pedro@exemplo.com');
    await vi.waitFor(() => expect(parado.pedidos).toHaveLength(1));
    expect((await b.enviar()).enviados).toBe(0);
    parado.liberar!();
    await a.enviar();
    expect(await b.enviar(LINK_BACKOFF_MS.at(-1)!)).toMatchObject({ enviados: 0, falhas: 0 });
    expect([parado.entregues.length, outro.pedidos.length]).toEqual([1, 0]);
    a.db.close();
    b.db.close();
  });

  it('se a reserva vence com o envio ainda em andamento, a nova tentativa leva a mesma chave e o mesmo corpo (o fornecedor não duplica)', async () => {
    const file = arquivo();
    const parado = new Fornecedor(['parado']);
    const outro = new Fornecedor();
    const a = await servidor({ db: openDb(file), mailer: parado });
    const b = await servidor({ db: openDb(file), mailer: outro });
    await a.pedir('quim@exemplo.com');
    await vi.waitFor(() => expect(parado.pedidos).toHaveLength(1));
    await b.enviar(LINK_LEASE_MS + 1_000);
    expect(outro.pedidos).toHaveLength(1);
    expect(outro.pedidos[0]).toEqual(parado.pedidos[0]);
    parado.liberar!();
    await a.enviar();
    expect(a.linhas()).toMatchObject([{ outcome: 'enviado', attempts: 2 }]);
    a.db.close();
    b.db.close();
  });

  it('no mesmo processo, várias rodadas pedidas juntas não mandam o mesmo e-mail duas vezes', async () => {
    const mailer = new Fornecedor();
    const s = await servidor({ mailer });
    for (const e of ['r1@exemplo.com', 'r2@exemplo.com', 'r3@exemplo.com']) await s.pedir(e);
    await Promise.all([s.enviar(), s.enviar(), s.enviar()]);
    expect(mailer.pedidos.map((m) => m.to).sort()).toEqual(['r1@exemplo.com', 'r2@exemplo.com', 'r3@exemplo.com']);
  });
});

describe('falha do banco no meio do pedido', SCRYPT, () => {
  it('nada fica pela metade, a troca do pedido anterior é desfeita, e a resposta é a mesma com ou sem conta', async () => {
    const logs: string[] = [];
    const mailer = new Fornecedor(['temporaria']);
    const s = await servidor({ mailer, logs });
    await criarConta(s.app, s.db, { email: 'tem@conta.co', password: SENHA });
    await s.pedir('rui@exemplo.com'); // o primeiro pedido, que espera nova tentativa
    await s.enviar();
    const antes = s.db.prepare('SELECT token_hash FROM pending_signups').all();

    s.db.exec(`CREATE TRIGGER falha BEFORE INSERT ON link_outbox BEGIN SELECT RAISE(ABORT, 'falha simulada'); END;`);
    const sem = await s.pedir('rui@exemplo.com', 'outra frase longa');
    const com = await s.pedir('tem@conta.co');
    expect(sem.statusCode).toBe(500);
    expect([com.statusCode, com.body]).toEqual([sem.statusCode, sem.body]);
    expect(s.db.prepare('SELECT token_hash FROM pending_signups').all()).toEqual(antes);
    expect(s.linhas()).toMatchObject([{ outcome: null, terminado: 0 }]);
    // a recuperação de senha responde 202 nos dois casos (um 500 só aconteceria com conta)
    const rSem = await s.recuperar('ninguem@exemplo.com');
    const rCom = await s.recuperar('tem@conta.co');
    expect([rCom.statusCode, rCom.body]).toEqual([rSem.statusCode, rSem.body]);
    expect(rCom.statusCode).toBe(202);
    expect(s.db.prepare('SELECT COUNT(*) AS n FROM password_resets').get()).toEqual({ n: 0 });

    s.db.exec('DROP TRIGGER falha');
    await s.enviar(LINK_BACKOFF_MS[0]! + 1_000);
    expect((await s.confirmar(tokenDe(mailer.entregues[0]))).statusCode).toBe(201);
    expect((await s.login('rui@exemplo.com')).statusCode).toBe(200);
    const falhas = logs.map((l) => JSON.parse(l)).filter((l) => /falha ao gravar o pedido/.test(l.msg));
    expect(falhas.map((l) => l.msg)).toEqual(['falha ao gravar o pedido de cadastro', 'falha ao gravar o pedido de cadastro', 'falha ao gravar o pedido de troca de senha']);
    expect(logs.join('\n')).not.toMatch(/falha simulada|rui@|tem@conta/);
  });
});

describe('o que fica guardado e o que vai para o log', SCRYPT, () => {
  it('nenhum token, senha, corpo ou endereço no log, mesmo quando o erro do envio traz tudo isso', async () => {
    const logs: string[] = [];
    const mailer = new Fornecedor(['inesperado', 'temporaria', 'permanente']);
    const s = await servidor({ mailer, logs });
    await criarConta(s.app, s.db, { email: 'sara@exemplo.com', password: SENHA, name: 'Sara Souza' });
    await s.pedir('tiago@exemplo.com', 'a senha secreta do tiago');
    await s.pedir('sara@exemplo.com', 'a senha secreta da sara');
    await s.recuperar('sara@exemplo.com');
    await s.enviar();
    await s.enviar(LINK_BACKOFF_MS[0]! + 1_000);
    expect(mailer.entregues.length).toBeGreaterThan(0);
    await s.confirmar(tokenDe(mailer.entregues.find((m) => m.to === 'tiago@exemplo.com')));

    const tudo = logs.join('\n');
    expect(tudo).toContain('erro inesperado no envio (Error)'); // o log tem as falhas, só sem os dados
    expect(tudo).toContain('Resend 422 validation_error');
    const proibidos = ['tiago@exemplo.com', 'sara@exemplo.com', 'Sara Souza', 'a senha secreta', SENHA, SEGREDO, '#t=', 'conta/confirmar', 'conta/redefinir', 'Alguém pediu', 'confirme o seu cadastro', 'trocar a senha'];
    for (const m of mailer.pedidos) proibidos.push(tokenDe(m) ?? m.subject);
    for (const p of proibidos) expect(tudo, p).not.toContain(p);
  });

  it('o banco não guarda o link nem a chave: só o nonce, o hash do link e a identificação da chave', async () => {
    const mailer = new Fornecedor();
    const s = await servidor({ mailer });
    await s.pedir('ugo@exemplo.com');
    await criarConta(s.app, s.db, { email: 'vera@exemplo.com', password: SENHA });
    await s.recuperar('vera@exemplo.com');
    await s.enviar();
    const tokens = mailer.entregues.map(tokenDe);
    expect(tokens).toHaveLength(2);
    const banco = JSON.stringify(['link_outbox', 'pending_signups', 'password_resets'].map((t) => s.db.prepare(`SELECT * FROM ${t}`).all()));
    for (const t of tokens) expect(banco).not.toContain(t);
    expect(banco).not.toContain(SEGREDO);
    expect(banco).toContain(linkKey(SEGREDO).id);
  });

  it('linhas terminadas saem do banco em 24 h, junto com a limpeza dos pedidos vencidos', async () => {
    const s = await servidor();
    await s.pedir('xavi@exemplo.com');
    await s.enviar();
    expect(s.app.rotinas.limparCadastros()).toBe(0);
    expect(s.linhas()).toHaveLength(1);
    s.db.prepare('UPDATE link_outbox SET finished_at = finished_at - ?').run(LINK_KEEP_MS + 1);
    s.app.rotinas.limparCadastros();
    expect(s.linhas()).toHaveLength(0);
  });
});

describe('a resposta pública é a mesma com ou sem conta', SCRYPT, () => {
  for (const passo of ['ok', 'temporaria', 'permanente', 'parado'] as const)
    it(`com o fornecedor de e-mail "${passo}"`, async () => {
      const s = await servidor({ mailer: new Fornecedor([], passo) });
      await criarConta(s.app, s.db, { email: 'tem@conta.co', password: SENHA });
      const resp = (r: Awaited<ReturnType<typeof s.pedir>>) => [r.statusCode, r.body, r.headers['content-type'], r.headers['set-cookie']];
      const cadastro = [resp(await s.pedir('tem@conta.co')), resp(await s.pedir('nova@conta.co'))];
      const senha = [resp(await s.recuperar('tem@conta.co')), resp(await s.recuperar('nova@conta.co'))];
      expect(cadastro[0]).toEqual(cadastro[1]);
      expect(senha[0]).toEqual(senha[1]);
      expect(cadastro[0]![0]).toBe(202);
      expect(senha[0]![0]).toBe(202);
    });
});

describe('recuperação de senha pela fila', SCRYPT, () => {
  it('falha temporária e depois sucesso; um pedido novo troca o anterior', async () => {
    const mailer = new Fornecedor(['temporaria', 'temporaria']);
    const s = await servidor({ mailer });
    await criarConta(s.app, s.db, { email: 'yara@exemplo.com', password: SENHA });
    await s.recuperar('yara@exemplo.com');
    await s.enviar();
    await s.recuperar('yara@exemplo.com');
    await s.enviar();
    expect(s.linhas()).toMatchObject([{ outcome: 'trocado' }, { terminado: 0, attempts: 1 }]);
    await s.enviar(LINK_BACKOFF_MS[0]! + 1_000);
    expect(mailer.entregues).toHaveLength(1);
    const [antiga] = s.linhas();
    expect((await s.redefinir(s.linkDaLinha(antiga!.id))).statusCode).toBe(400);
    expect((await s.redefinir(tokenDe(mailer.entregues[0]))).statusCode).toBe(204);
    expect((await s.login('yara@exemplo.com', 'uma senha nova e longa')).statusCode).toBe(200);
  });
});

describe('configuração da chave dos links', () => {
  it('em produção, com fornecedor de e-mail e sem LINKS_SEGREDO, o servidor não sobe', async () => {
    const config = { ...loadConfig({ NODE_ENV: 'production' }), webDist: '/nao-existe' };
    await expect(buildApp({ config, db: openDb(':memory:'), mailer: new Fornecedor() })).rejects.toThrow(/LINKS_SEGREDO ausente.*openssl rand -base64 48/);
    // sem fornecedor, o cadastro já fica desligado (503): a chave não faz falta
    await expect(buildApp({ config, db: openDb(':memory:'), mailer: null })).resolves.toBeTruthy();
    await expect(buildApp({ config: { ...config, linkSecret: SEGREDO }, db: openDb(':memory:'), mailer: new Fornecedor() })).resolves.toBeTruthy();
  });

  it('chave curta demais: a configuração recusa', () => {
    expect(() => loadConfig({ LINKS_SEGREDO: 'curta' })).toThrow(/32 caracteres ou mais/);
    expect(loadConfig({ LINKS_SEGREDO: `  ${SEGREDO}  ` }).linkSecret).toBe(SEGREDO);
    expect(loadConfig({}).linkSecret).toBeNull();
  });
});
