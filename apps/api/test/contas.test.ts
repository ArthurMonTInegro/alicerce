/**
 * Contas e sessões: excluir a conta com senha, encerrar todas as sessões,
 * limite de corpo da sincronização, cookie Secure e carregamento do .env.
 * Tudo roda contra o servidor real (Fastify + SQLite em memória) via inject.
 */
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { emptyProgress, sanitizeProgress } from '@alicerce/engine';
import { BODY_LIMIT, buildApp, PROGRESS_BODY_LIMIT, PROGRESS_SYNCS_PER_MINUTE } from '../src/app.ts';
import { loadConfig } from '../src/config.ts';
import { openDb } from '../src/db.ts';
import { corpoDeSincronizacao, maiorProgressoValido } from './maior-progresso.ts';

import { criarConta } from './cadastro.ts';
const H = { 'content-type': 'application/json', 'x-alicerce': '1' };
const SENHA = 'uma frase longa';

let db: ReturnType<typeof openDb>;
let app: Awaited<ReturnType<typeof buildApp>>;
async function setup(env: NodeJS.ProcessEnv = {}) {
  db = openDb(':memory:');
  app = await buildApp({ config: { ...loadConfig(env), webDist: '/nao-existe' }, db });
}
const cookieOf = (res: { headers: Record<string, unknown> }) => String(res.headers['set-cookie']).split(';')[0]!;
const register = async (email: string) => {
  const res = await criarConta(app, db, { email, password: SENHA });
  expect(res.statusCode).toBe(201);
  return { cookie: cookieOf(res), id: res.json().user.id as string };
};
const login = async (email: string, password = SENHA) => app.inject({ method: 'POST', url: '/api/auth/login', headers: H, payload: { email, password } });
const me = async (cookie: string) => (await app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie } })).json().user as { id: string } | null;
const del = (cookie: string | undefined, payload?: unknown) =>
  app.inject({ method: 'DELETE', url: '/api/auth/me', headers: cookie ? { ...H, cookie } : H, ...(payload === undefined ? {} : { payload: payload as object }) });
const count = (table: string, userId: string) => (db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE user_id = ?`).get(userId) as { n: number }).n;

beforeEach(() => setup());

// Cada senha conferida custa um scrypt (dezenas de ms, mais com a suíte em paralelo);
// os testes de tentativas repetidas fazem uma dúzia deles.
const SCRYPT = { timeout: 30_000 };

describe('excluir a conta exige a senha atual', SCRYPT, () => {
  it('sem senha: 400, e nada é apagado', async () => {
    const { cookie, id } = await register('sem@senha.co');
    for (const payload of [undefined, {}, { password: '' }, { password: 123 }]) {
      const res = await del(cookie, payload);
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBe('Digite sua senha atual para excluir a conta.');
    }
    expect((await me(cookie))?.id).toBe(id);
  });

  it('pedido sem senha não gasta tentativa: nem a exclusão nem o login da conta ficam bloqueados', async () => {
    const { cookie } = await register('sem@tentativa.co');
    for (let i = 0; i < 12; i++) expect((await del(cookie, {})).statusCode).toBe(400);
    expect((await login('sem@tentativa.co')).statusCode).toBe(200);
    expect((await del(cookie, { password: SENHA })).statusCode).toBe(204);
  });

  it('o limite por IP da exclusão vale entre contas diferentes', async () => {
    const a = await register('a@ip.co');
    const b = await register('b@ip.co');
    const c = await register('c@ip.co');
    for (let i = 0; i < 5; i++) expect((await del(a.cookie, { password: `palpite ${i} de a` })).statusCode).toBe(403);
    for (let i = 0; i < 5; i++) expect((await del(b.cookie, { password: `palpite ${i} de b` })).statusCode).toBe(403);
    // c nunca errou, mas o mesmo IP já gastou as 10 tentativas
    expect((await del(c.cookie, { password: SENHA })).statusCode).toBe(429);
    const deOutroIp = await app.inject({ method: 'DELETE', url: '/api/auth/me', remoteAddress: '203.0.113.9', headers: { ...H, cookie: c.cookie }, payload: { password: SENHA } });
    expect(deOutroIp.statusCode).toBe(204);
  });

  it('senha errada: 403 com mensagem clara; conta, sessões e progresso continuam', async () => {
    const { cookie, id } = await register('errada@senha.co');
    const p = emptyProgress();
    p.lessons['l0-o-que-e-programar'] = { visited: ['conceito'] };
    await app.inject({ method: 'PUT', url: '/api/progress', headers: { ...H, cookie }, payload: { progress: p, expectedUserId: id } });
    const res = await del(cookie, { password: 'outra frase longa' });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe('Senha incorreta. A conta não foi excluída.');
    expect(res.headers['set-cookie']).toBeUndefined();
    expect((await me(cookie))?.id).toBe(id);
    expect(count('progress', id)).toBe(1);
    expect((await login('errada@senha.co')).statusCode).toBe(200);
  });

  it('senha certa: apaga conta, progresso e todas as sessões, e limpa o cookie', async () => {
    const { cookie, id } = await register('certa@senha.co');
    const outra = cookieOf(await login('certa@senha.co')); // outro aparelho
    await app.inject({ method: 'PUT', url: '/api/progress', headers: { ...H, cookie }, payload: { progress: emptyProgress(), expectedUserId: id } });
    expect(count('sessions', id)).toBe(2);
    const res = await del(cookie, { password: SENHA });
    expect(res.statusCode).toBe(204);
    expect(String(res.headers['set-cookie'])).toMatch(/^alicerce_sessao=; .*Max-Age=0/);
    expect(await me(cookie)).toBeNull();
    expect(await me(outra)).toBeNull();
    for (const t of ['sessions', 'progress', 'tutor_usage', 'plan_changes']) expect(count(t, id)).toBe(0);
    expect(db.prepare('SELECT 1 FROM users WHERE id = ?').get(id)).toBeUndefined();
    expect((await login('certa@senha.co')).statusCode).toBe(401);
  });

  it('a senha é comparada como no login (normalização NFKC e corte em 200 caracteres)', async () => {
    const longa = 'x'.repeat(200);
    const reg = await criarConta(app, db, { email: 'longa@senha.co', password: longa });
    expect(reg.statusCode).toBe(201);
    // o login corta em 200; a exclusão faz o mesmo, então os dois aceitam a mesma entrada
    expect((await login('longa@senha.co', longa + 'yyy')).statusCode).toBe(200);
    expect((await del(cookieOf(reg), { password: longa + 'yyy' })).statusCode).toBe(204);
    // NFKC: a ligadura "ﬁ" (U+FB01) e as letras "fi" valem a mesma senha, no login e na exclusão
    const lig = await criarConta(app, db, { email: 'nfkc@senha.co', password: 'ﬁ'.repeat(10) });
    expect(lig.statusCode).toBe(201);
    expect((await login('nfkc@senha.co', 'fi'.repeat(10))).statusCode).toBe(200);
    expect((await del(cookieOf(lig), { password: 'fi'.repeat(10) })).statusCode).toBe(204);
  });

  it('sem sessão, ou com sessão já encerrada: 401', async () => {
    expect((await del(undefined, { password: SENHA })).statusCode).toBe(401);
    const { cookie } = await register('encerrada@senha.co');
    await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { ...H, cookie } });
    const res = await del(cookie, { password: SENHA });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Faça login para continuar.');
    expect((await login('encerrada@senha.co')).statusCode).toBe(200); // a conta continua
  });

  it('sem o cabeçalho x-alicerce: 403 (CSRF), e nada é apagado', async () => {
    const { cookie, id } = await register('csrf@senha.co');
    const res = await app.inject({ method: 'DELETE', url: '/api/auth/me', headers: { 'content-type': 'application/json', cookie }, payload: { password: SENHA } });
    expect(res.statusCode).toBe(403);
    expect((await me(cookie))?.id).toBe(id);
  });

  it('senha errada repetida: bloqueia com 429, e o bloqueio vale também para o login da conta', async () => {
    const { cookie, id } = await register('forca@bruta.co');
    for (let i = 0; i < 10; i++) expect((await del(cookie, { password: `palpite numero ${i}` })).statusCode).toBe(403);
    const blocked = await del(cookie, { password: SENHA }); // nem a senha certa passa durante o bloqueio
    expect(blocked.statusCode).toBe(429);
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    expect((await me(cookie))?.id).toBe(id);
    expect((await login('forca@bruta.co')).statusCode).toBe(429);
  });

  it('mandar o IP de outra pessoa como "e-mail" não bloqueia o login dela', async () => {
    const vitima = '198.51.100.7';
    const reg = await criarConta(app, db, { email: 'vitima@ip.co', password: SENHA }, { remoteAddress: vitima });
    expect(reg.statusCode).toBe(201);
    for (let i = 0; i < 10; i++) await app.inject({ method: 'POST', url: '/api/auth/login', remoteAddress: '203.0.113.66', headers: H, payload: { email: vitima, password: 'qualquer' } });
    const res = await app.inject({ method: 'POST', url: '/api/auth/login', remoteAddress: vitima, headers: H, payload: { email: 'vitima@ip.co', password: SENHA } });
    expect(res.statusCode).toBe(200);
  });

  it('o bloqueio por conta não atinge outra conta', async () => {
    const a = await register('a@bloqueio.co');
    for (let i = 0; i < 10; i++) await del(a.cookie, { password: `palpite ${i} errado` });
    expect((await login('b@bloqueio.co')).statusCode).toBe(401); // conta inexistente: resposta normal, não 429
  });
});

describe('encerrar todas as sessões', SCRYPT, () => {
  it('encerra a sessão atual e as dos outros aparelhos, sem tocar em outra conta', async () => {
    const a = await register('ana@sessoes.co');
    const aCelular = cookieOf(await login('ana@sessoes.co'));
    const aTrabalho = cookieOf(await login('ana@sessoes.co'));
    const b = await register('bia@sessoes.co');
    const res = await app.inject({ method: 'POST', url: '/api/auth/sessions/encerrar', headers: { ...H, cookie: a.cookie } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ended: 3 });
    expect(String(res.headers['set-cookie'])).toMatch(/^alicerce_sessao=; .*Max-Age=0/);
    for (const c of [a.cookie, aCelular, aTrabalho]) expect(await me(c)).toBeNull();
    // a outra sessão deixa de funcionar também para gravar
    const put = await app.inject({ method: 'PUT', url: '/api/progress', headers: { ...H, cookie: aCelular }, payload: { progress: emptyProgress(), expectedUserId: a.id } });
    expect(put.statusCode).toBe(401);
    expect((await me(b.cookie))?.id).toBe(b.id);
    expect(count('sessions', a.id)).toBe(0);
    // a conta continua: dá para entrar de novo
    const again = await login('ana@sessoes.co');
    expect(again.statusCode).toBe(200);
    expect((await me(cookieOf(again)))?.id).toBe(a.id);
  });

  it('sessão já encerrada: 401; sair dela de novo continua idempotente (204)', async () => {
    const a = await register('dupla@sessoes.co');
    expect((await app.inject({ method: 'POST', url: '/api/auth/sessions/encerrar', headers: { ...H, cookie: a.cookie } })).statusCode).toBe(200);
    const again = await app.inject({ method: 'POST', url: '/api/auth/sessions/encerrar', headers: { ...H, cookie: a.cookie } });
    expect(again.statusCode).toBe(401);
    expect(again.json().error).toBe('Faça login para continuar.');
    expect((await app.inject({ method: 'POST', url: '/api/auth/sessions/encerrar', headers: H })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { ...H, cookie: a.cookie } })).statusCode).toBe(204);
  });

  it('sem o cabeçalho x-alicerce: 403, e as sessões continuam', async () => {
    const a = await register('csrf@sessoes.co');
    expect((await app.inject({ method: 'POST', url: '/api/auth/sessions/encerrar', headers: { cookie: a.cookie } })).statusCode).toBe(403);
    expect((await me(a.cookie))?.id).toBe(a.id);
  });

  it('conta só as sessões que ainda valiam, mas apaga também as vencidas', async () => {
    const a = await register('conta@sessoes.co');
    const outra = cookieOf(await login('conta@sessoes.co'));
    const vencida = cookieOf(await login('conta@sessoes.co'));
    const hash = createHash('sha256').update(vencida.split('=')[1]!).digest('base64url');
    expect(db.prepare('UPDATE sessions SET expires_at = 1 WHERE token_hash = ?').run(hash).changes).toBe(1);
    const res = await app.inject({ method: 'POST', url: '/api/auth/sessions/encerrar', headers: { ...H, cookie: a.cookie } });
    expect(res.json()).toEqual({ ended: 2 });
    expect(await me(outra)).toBeNull();
    expect(count('sessions', a.id)).toBe(0);
  });

  it('sessão vencida não encerra as outras', async () => {
    const a = await register('vencida@sessoes.co');
    const viva = cookieOf(await login('vencida@sessoes.co'));
    const hash = createHash('sha256').update(a.cookie.split('=')[1]!).digest('base64url');
    expect(db.prepare('UPDATE sessions SET expires_at = 1 WHERE token_hash = ?').run(hash).changes).toBe(1);
    expect(await me(a.cookie)).toBeNull();
    expect((await app.inject({ method: 'POST', url: '/api/auth/sessions/encerrar', headers: { ...H, cookie: a.cookie } })).statusCode).toBe(401);
    expect((await me(viva))?.id).toBe(a.id);
  });
});

describe('sincronização não falha por tamanho', SCRYPT, () => {
  const maior = maiorProgressoValido();

  it('o maior progresso legítimo passa pelo saneamento sem perder nada e cabe no limite com folga', () => {
    expect(JSON.stringify(sanitizeProgress(JSON.parse(JSON.stringify(maior))))).toBe(JSON.stringify(maior));
    const bytes = Buffer.byteLength(corpoDeSincronizacao(maior, '00000000-0000-4000-8000-000000000000'));
    expect(bytes).toBeGreaterThan(BODY_LIMIT); // por isso o limite geral não serve para esta rota
    expect(bytes * 1.5).toBeLessThanOrEqual(PROGRESS_BODY_LIMIT);
  });

  it('PUT /api/progress aceita o maior progresso legítimo e devolve tudo', async () => {
    const { cookie, id } = await register('estuda@muito.co');
    const body = corpoDeSincronizacao(maior, id);
    const res = await app.inject({ method: 'PUT', url: '/api/progress', headers: { ...H, cookie }, payload: body });
    expect(res.statusCode).toBe(200);
    const back = res.json().progress;
    expect(back.attempts).toHaveLength(maior.attempts.length);
    expect(back.reviews).toHaveLength(maior.reviews.length);
    expect(JSON.stringify(sanitizeProgress(back))).toBe(JSON.stringify(sanitizeProgress(maior)));
    // segunda sincronização (servidor já cheio + cliente cheio) também passa
    expect((await app.inject({ method: 'PUT', url: '/api/progress', headers: { ...H, cookie }, payload: body })).statusCode).toBe(200);
  });

  it('corpo acima do novo limite: 413, e o progresso salvo não muda', async () => {
    const { cookie, id } = await register('grande@demais.co');
    const p = emptyProgress();
    p.lessons['l0-o-que-e-programar'] = { visited: ['conceito'] };
    await app.inject({ method: 'PUT', url: '/api/progress', headers: { ...H, cookie }, payload: { progress: p, expectedUserId: id } });
    const before = (db.prepare('SELECT data FROM progress WHERE user_id = ?').get(id) as { data: string }).data;
    const exato = JSON.stringify({ progress: emptyProgress(), expectedUserId: id, pad: '' });
    const acima = exato.replace('"pad":""', `"pad":"${'x'.repeat(PROGRESS_BODY_LIMIT - exato.length + 1)}"`);
    expect(Buffer.byteLength(acima)).toBe(PROGRESS_BODY_LIMIT + 1);
    const res = await app.inject({ method: 'PUT', url: '/api/progress', headers: { ...H, cookie }, payload: acima });
    expect(res.statusCode).toBe(413);
    expect((db.prepare('SELECT data FROM progress WHERE user_id = ?').get(id) as { data: string }).data).toBe(before);
    // exatamente no limite ainda passa
    const noLimite = acima.replace('x"', '"');
    expect(Buffer.byteLength(noLimite)).toBe(PROGRESS_BODY_LIMIT);
    expect((await app.inject({ method: 'PUT', url: '/api/progress', headers: { ...H, cookie }, payload: noLimite })).statusCode).toBe(200);
  });

  it('sem sessão, o corpo grande é recusado com 401 antes de ser lido', async () => {
    const big = JSON.stringify({ progress: emptyProgress(), pad: 'x'.repeat(PROGRESS_BODY_LIMIT + 10) });
    const res = await app.inject({ method: 'PUT', url: '/api/progress', headers: H, payload: big });
    expect(res.statusCode).toBe(401); // se o corpo fosse lido antes, seria 413
    const { cookie } = await register('expirada@sync.co');
    await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { ...H, cookie } });
    expect((await app.inject({ method: 'PUT', url: '/api/progress', headers: { ...H, cookie }, payload: big })).statusCode).toBe(401);
  });

  it(`limite por conta: a sincronização ${PROGRESS_SYNCS_PER_MINUTE + 1} no minuto recebe 429 antes de o corpo ser lido`, async () => {
    const a = await register('rapida@sync.co');
    const b = await register('outra@sync.co');
    const put = (cookie: string, payload: string) => app.inject({ method: 'PUT', url: '/api/progress', headers: { ...H, cookie }, payload });
    const vazio = (id: string) => JSON.stringify({ progress: emptyProgress(), expectedUserId: id });
    for (let i = 0; i < PROGRESS_SYNCS_PER_MINUTE; i++) expect((await put(a.cookie, vazio(a.id))).statusCode).toBe(200);
    const grande = JSON.stringify({ progress: emptyProgress(), expectedUserId: a.id, pad: 'x'.repeat(PROGRESS_BODY_LIMIT) });
    const res = await put(a.cookie, grande);
    expect(res.statusCode).toBe(429); // se o corpo fosse lido antes, seria 413
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
    // o limite é da conta: outra conta no mesmo IP sincroniza normalmente
    expect((await put(b.cookie, vazio(b.id))).statusCode).toBe(200);
  });

  it('as demais rotas continuam com o limite geral de 1 MB', async () => {
    const { cookie } = await register('limite@geral.co');
    const big = JSON.stringify({ message: 'oi', pad: 'x'.repeat(BODY_LIMIT) });
    expect((await app.inject({ method: 'POST', url: '/api/tutor', headers: { ...H, cookie }, payload: big })).statusCode).toBe(413);
    expect((await app.inject({ method: 'POST', url: '/api/auth/login', headers: H, payload: big })).statusCode).toBe(413);
    expect((await app.inject({ method: 'DELETE', url: '/api/auth/me', headers: { ...H, cookie }, payload: big })).statusCode).toBe(413);
  });
});

describe('cookie Secure', () => {
  const setCookieWith = async (env: NodeJS.ProcessEnv) => {
    await setup(env);
    const res = await criarConta(app, db, { email: 's@cookie.co', password: SENHA });
    return String(res.headers['set-cookie']);
  };
  it('liga em produção ou com COOKIE_SECURE; COOKIE_SECURE prevalece quando definido', async () => {
    expect(await setCookieWith({})).not.toMatch(/Secure/);
    expect(await setCookieWith({ NODE_ENV: 'production' })).toMatch(/; Secure$/);
    expect(await setCookieWith({ COOKIE_SECURE: 'true' })).toMatch(/; Secure$/);
    expect(await setCookieWith({ NODE_ENV: 'production', COOKIE_SECURE: 'false' })).not.toMatch(/Secure/);
    expect(await setCookieWith({ COOKIE_SECURE: '' })).not.toMatch(/Secure/); // vazio = padrão (fora de produção)
  });
  it('o cookie apagado ao encerrar sessões repete o atributo Secure', async () => {
    await setup({ NODE_ENV: 'production' });
    const { cookie } = await register('apaga@cookie.co');
    const res = await app.inject({ method: 'POST', url: '/api/auth/sessions/encerrar', headers: { ...H, cookie } });
    expect(String(res.headers['set-cookie'])).toMatch(/Max-Age=0; Secure$/);
  });
});

describe('.env', () => {
  const apiDir = fileURLToPath(new URL('..', import.meta.url));
  const pkg = JSON.parse(readFileSync(resolve(apiDir, 'package.json'), 'utf8')) as { scripts: Record<string, string> };
  it('start, dev, backup e restore carregam o .env da raiz do repositório (o npm roda os scripts do workspace em apps/api)', () => {
    // backup e restore precisam ver o mesmo DATABASE_PATH e o mesmo BACKUP_DIR do servidor
    for (const s of ['start', 'dev', 'backup', 'restore']) expect(pkg.scripts[s]).toContain('--env-file-if-exists=../../.env');
    // ../../.env a partir de apps/api é a raiz, onde fica o .env.example
    expect(existsSync(resolve(apiDir, '../../.env.example'))).toBe(true);
  });
});
