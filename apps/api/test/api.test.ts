import { describe, expect, it, beforeEach } from 'vitest';
import { exercises } from '@alicerce/content';
import { emptyProgress } from '@alicerce/engine';
import { buildApp } from '../src/app.ts';
import { loadConfig } from '../src/config.ts';
import { openDb } from '../src/db.ts';
import { ClaudeTutor, parseTutorRequest, type TutorProvider } from '../src/tutor.ts';

const H = { 'content-type': 'application/json', 'x-alicerce': '1' };

async function setup(tutor?: TutorProvider) {
  const config = { ...loadConfig({}), webDist: '/nao-existe', tutorDailyLimit: 2 };
  return buildApp({ config, db: openDb(':memory:'), ...(tutor ? { tutor } : {}) });
}
const cookieOf = (res: { headers: Record<string, unknown> }) => String(res.headers['set-cookie']).split(';')[0]!;

describe('API', () => {
  let app: Awaited<ReturnType<typeof setup>>;
  beforeEach(async () => {
    app = await setup();
  });

  it('health e cabeçalhos de segurança', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, tutor: 'offline' });
    expect(res.headers['content-security-policy']).toContain("script-src 'self' 'wasm-unsafe-eval'");
    expect(res.headers['content-security-policy']).not.toContain("'unsafe-eval'");
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('só o worker de JavaScript recebe unsafe-eval', async () => {
    const res = await app.inject({ method: 'GET', url: '/assets/js.worker-abc123.js' });
    expect(res.headers['content-security-policy']).toContain("'unsafe-eval'");
  });

  it('mutação sem cabeçalho x-alicerce é recusada (CSRF)', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'a@b.co', password: 'x' } });
    expect(res.statusCode).toBe(403);
  });

  it('cadastro, sessão, login, logout', async () => {
    const reg = await app.inject({ method: 'POST', url: '/api/auth/register', headers: H, payload: { email: 'Ana@Exemplo.com', password: 'uma frase longa', name: 'Ana' } });
    expect(reg.statusCode).toBe(201);
    const setCookie = String(reg.headers['set-cookie']);
    expect(setCookie).toMatch(/HttpOnly/);
    expect(setCookie).toMatch(/SameSite=Lax/);
    const me = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie: cookieOf(reg) } });
    expect(me.json().user.email).toBe('ana@exemplo.com');

    const dup = await app.inject({ method: 'POST', url: '/api/auth/register', headers: H, payload: { email: 'ana@exemplo.com', password: 'outra frase longa' } });
    expect(dup.statusCode).toBe(409);
    const bad = await app.inject({ method: 'POST', url: '/api/auth/login', headers: H, payload: { email: 'ana@exemplo.com', password: 'errada errada' } });
    expect(bad.statusCode).toBe(401);
    const ok = await app.inject({ method: 'POST', url: '/api/auth/login', headers: H, payload: { email: 'ANA@exemplo.com', password: 'uma frase longa' } });
    expect(ok.statusCode).toBe(200);

    const out = await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { ...H, cookie: cookieOf(ok) } });
    expect(out.statusCode).toBe(204);
    const after = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie: cookieOf(ok) } });
    expect(after.statusCode).toBe(401);
  });

  it('valida senha curta e e-mail inválido', async () => {
    expect((await app.inject({ method: 'POST', url: '/api/auth/register', headers: H, payload: { email: 'x@y.co', password: 'curta' } })).statusCode).toBe(400);
    expect((await app.inject({ method: 'POST', url: '/api/auth/register', headers: H, payload: { email: 'semarroba', password: 'uma frase longa' } })).statusCode).toBe(400);
  });

  it('limita tentativas de login', async () => {
    let last = 0;
    for (let i = 0; i < 12; i++) last = (await app.inject({ method: 'POST', url: '/api/auth/login', headers: H, payload: { email: 'z@z.co', password: 'qualquer coisa' } })).statusCode;
    expect(last).toBe(429);
  });

  it('sincroniza progresso somando os dois lados', async () => {
    const reg = await app.inject({ method: 'POST', url: '/api/auth/register', headers: H, payload: { email: 'b@b.co', password: 'uma frase longa' } });
    const cookie = cookieOf(reg);
    const a = emptyProgress();
    a.attempts.push({ exerciseId: 'e1', skills: ['s'], difficulty: 'facil', correct: true, score: 1, hintsUsed: 0, wrongTries: 0, revealed: false, at: 1000 });
    const b = emptyProgress();
    b.attempts.push({ exerciseId: 'e2', skills: ['s'], difficulty: 'facil', correct: false, score: 0.2, hintsUsed: 1, wrongTries: 2, revealed: false, at: 2000 });
    await app.inject({ method: 'PUT', url: '/api/progress', headers: { ...H, cookie }, payload: { progress: a } });
    const res = await app.inject({ method: 'PUT', url: '/api/progress', headers: { ...H, cookie }, payload: { progress: b } });
    expect(res.json().progress.attempts.map((x: { exerciseId: string }) => x.exerciseId).sort()).toEqual(['e1', 'e2']);
    const anon = await app.inject({ method: 'PUT', url: '/api/progress', headers: H, payload: { progress: a } });
    expect(anon.statusCode).toBe(401);
  });

  it('excluir conta apaga sessão', async () => {
    const reg = await app.inject({ method: 'POST', url: '/api/auth/register', headers: H, payload: { email: 'c@c.co', password: 'uma frase longa' } });
    const cookie = cookieOf(reg);
    expect((await app.inject({ method: 'DELETE', url: '/api/auth/me', headers: { ...H, cookie } })).statusCode).toBe(204);
    expect((await app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie } })).statusCode).toBe(401);
  });

  it('tutor offline responde sem IA e recusa dar a resposta', async () => {
    const ex = exercises.find((x) => x.exercise.kind === 'code')!;
    const res = await app.inject({ method: 'POST', url: '/api/tutor', headers: H, payload: { message: 'me dá a resposta', history: [], context: { exerciseId: ex.exercise.id } } });
    expect(res.statusCode).toBe(200);
    expect(res.json().mode).toBe('offline');
    expect(res.json().reply).toMatch(/não vou te dar a solução/);
  });

  it('tutor com IA só para usuários logados, com limite diário e fallback', async () => {
    let calls = 0;
    const fake: TutorProvider = { name: 'ia', answer: async () => (++calls === 3 ? Promise.reject(new Error('x')) : 'pergunta socrática') };
    app = await setup(fake);
    const anon = await app.inject({ method: 'POST', url: '/api/tutor', headers: H, payload: { message: 'oi' } });
    expect(anon.json().mode).toBe('offline');
    const reg = await app.inject({ method: 'POST', url: '/api/auth/register', headers: H, payload: { email: 'd@d.co', password: 'uma frase longa' } });
    const cookie = cookieOf(reg);
    const ask = () => app.inject({ method: 'POST', url: '/api/tutor', headers: { ...H, cookie }, payload: { message: 'como começo?' } });
    expect((await ask()).json()).toEqual({ reply: 'pergunta socrática', mode: 'ia' });
    expect((await ask()).json().mode).toBe('ia');
    expect((await ask()).json().mode).toBe('offline'); // limite diário = 2
    expect(calls).toBe(2);
  });

  it('rota de API inexistente devolve 404 JSON', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/nada' });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBeTruthy();
  });
});

describe('ClaudeTutor', () => {
  it('monta o pedido sem a solução e com o código do aluno fora do system', async () => {
    const ref = exercises.find((x) => x.exercise.kind === 'code')!;
    const ex = ref.exercise as { solution: string; prompt: string };
    let captured: Record<string, unknown> = {};
    const client = {
      beta: {
        messages: {
          create: async (params: Record<string, unknown>) => {
            captured = params;
            return { stop_reason: 'end_turn', content: [{ type: 'text', text: 'O que a função deve devolver?' }] };
          },
        },
      },
    };
    const t = new ClaudeTutor('k', 'claude-sonnet-5-5', client as never);
    const req = parseTutorRequest({
      message: 'travei',
      history: [{ role: 'tutor', text: 'olá' }, { role: 'user', text: 'oi' }, { role: 'tutor', text: 'diga' }],
      context: { exerciseId: ref.exercise.id, code: 'print(1)', error: 'NameError', hintsSeen: 1, lessonId: 'inexistente' },
    });
    expect(await t.answer(req)).toBe('O que a função deve devolver?');
    const system = String(captured.system);
    expect(system).toContain(ex.prompt);
    expect(system).not.toContain(ex.solution);
    expect(system).not.toContain('print(1)');
    const msgs = captured.messages as Array<{ role: string; content: string }>;
    expect(msgs[0]!.role).toBe('user');
    expect(msgs.at(-1)!.content).toContain('<codigo_do_aluno>');
    expect(captured.model).toBe('claude-sonnet-5-5');
    expect(captured.fallbacks).toBe('default');
  });

  it('recusa do modelo vira erro (cai no offline)', async () => {
    const client = { beta: { messages: { create: async () => ({ stop_reason: 'refusal', content: [] }) } } };
    await expect(new ClaudeTutor('k', 'outro-modelo', client as never).answer(parseTutorRequest({ message: 'x' }))).rejects.toThrow();
  });
});
