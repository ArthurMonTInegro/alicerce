import { describe, expect, it, beforeEach } from 'vitest';
import { publicExercises as exercises } from '@alicerce/content';
import { emptyProgress } from '@alicerce/engine';
import { buildApp } from '../src/app.ts';
import { loadConfig } from '../src/config.ts';
import { openDb } from '../src/db.ts';
import { setPlan } from '../src/plans.ts';
import { publicContent } from '../src/conteudo.ts';
import { ClaudeTutor, parseTutorRequest, TUTOR_MAX_TOKENS, tutorSources, type TutorProvider } from '../src/tutor.ts';

const H = { 'content-type': 'application/json', 'x-alicerce': '1' };

let fixtureDb:ReturnType<typeof openDb>;
async function setup(tutor?: TutorProvider) {
  const config = { ...loadConfig({}), webDist: '/nao-existe', tutorDailyLimit: 2 };
  return buildApp({ config, db: (fixtureDb=openDb(':memory:')), ...(tutor ? { tutor } : {}) });
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
    expect(res.json()).toEqual({ ok: true, tutor: 'offline', conteudoPago: 'indisponivel' });
    const csp = String(res.headers['content-security-policy']);
    expect(csp).toContain("script-src 'self';");
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("frame-src 'self'");
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['cross-origin-resource-policy']).toBe('same-origin');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('página de execução: origem opaca, emoldurada só pelo site, com eval só ali', async () => {
    const res = await app.inject({ method: 'GET', url: '/runner.html' });
    const csp = String(res.headers['content-security-policy']);
    expect(csp.startsWith('sandbox allow-scripts;')).toBe(true);
    expect(csp).not.toContain('allow-same-origin');
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain("connect-src 'none'");
    expect(csp).toContain("'unsafe-eval'");
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    // o script da página de execução é o único arquivo liberado para a origem opaca
    const js = await app.inject({ method: 'GET', url: '/runner.js' });
    expect(js.headers['cross-origin-resource-policy']).toBe('cross-origin');
    expect(js.headers['content-security-policy']).not.toContain('unsafe-eval');
    // variantes da URL que o servidor de arquivos também atende como runner.html recebem a mesma política
    for (const url of ['/runner.html?x=1', '/runner%2Ehtml', '/%72unner.html']) {
      expect(String((await app.inject({ method: 'GET', url })).headers['content-security-policy']), url).toBe(csp);
    }
    // o resto (Pyodide, código dos workers, páginas) continua com a política do site: quem baixa é o site, não o iframe
    for (const url of ['/assets/js.worker-abc123.js', '/assets/python.worker-abc123.js', '/pyodide/pyodide.asm.wasm', '/', '/licao/runner.html']) {
      const r = await app.inject({ method: 'GET', url });
      expect(r.headers['cross-origin-resource-policy'], url).toBe('same-origin');
      expect(r.headers['x-frame-options'], url).toBe('DENY');
      expect(String(r.headers['content-security-policy']), url).not.toContain('sandbox');
      expect(r.headers['access-control-allow-origin'], url).toBeUndefined();
    }
  });

  it('a API nunca libera CORS nem CORP cross-origin', async () => {
    for (const [method, url] of [
      ['GET', '/api/auth/me'],
      ['OPTIONS', '/api/auth/me'],
      ['DELETE', '/api/auth/me'],
      ['PUT', '/api/progress'],
      ['GET', '/api/runner.js'],
      ['GET', '/api/runner.html'],
    ] as const) {
      const res = await app.inject({ method, url, headers: { origin: 'null', 'access-control-request-method': 'DELETE', 'access-control-request-headers': 'x-alicerce' } });
      expect(res.headers['access-control-allow-origin'], `${method} ${url}`).toBeUndefined();
      expect(res.headers['access-control-allow-credentials'], `${method} ${url}`).toBeUndefined();
      expect(res.headers['cross-origin-resource-policy'], `${method} ${url}`).toBe('same-origin');
      expect(String(res.headers['content-security-policy'])).not.toContain('sandbox');
    }
  });

  it('mutação sem cabeçalho x-alicerce é recusada (CSRF)', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'a@b.co', password: 'x' } });
    expect(res.statusCode).toBe(403);
  });

  it('CSRF: caminho codificado (/%61pi/...) não escapa do cabeçalho x-alicerce', async () => {
    // O roteador decodifica o caminho: /%61pi/auth/me é a rota /api/auth/me. Antes, a conferência
    // olhava o texto cru (startsWith('/api/')) e um DELETE sem o cabeçalho apagava a conta.
    const reg = await app.inject({ method: 'POST', url: '/api/auth/register', headers: H, payload: { email: 'csrf@exemplo.com', password: 'uma frase longa', name: 'C' } });
    const cookie = cookieOf(reg);
    for (const [method, url, ct] of [
      ['DELETE', '/%61pi/auth/me', 'application/json'],
      ['DELETE', '/api/auth/m%65', 'application/json'],
      ['POST', '/%61pi/auth/logout', 'text/plain'],
      ['POST', '/%61pi/tutor', 'text/plain'],
      ['PUT', '/%61pi/progress', 'application/json'],
      ['POST', '/qualquer-pagina', 'text/plain'],
    ] as const) {
      const res = await app.inject({ method, url, headers: { cookie, origin: 'null', 'content-type': ct }, payload: method === 'DELETE' ? '' : '{}' });
      expect(res.statusCode, `${method} ${url}`).toBe(403);
    }
    // a API decodificada continua com no-store
    const me = await app.inject({ method: 'GET', url: '/%61pi/auth/me', headers: { cookie } });
    expect(me.headers['cache-control']).toBe('no-store');
    expect(me.json().user.email).toBe('csrf@exemplo.com');
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
    expect(after.json().user).toBeNull();
  });

  it('valida senha curta e e-mail inválido', async () => {
    expect((await app.inject({ method: 'POST', url: '/api/auth/register', headers: H, payload: { email: 'x@y.co', password: 'curta' } })).statusCode).toBe(400);
    expect((await app.inject({ method: 'POST', url: '/api/auth/register', headers: H, payload: { email: 'semarroba', password: 'uma frase longa' } })).statusCode).toBe(400);
  });

  it('limita tentativas de login', async () => {
    let last = 0;
    for (let i = 0; i < 12; i++) last = (await app.inject({ method: 'POST', url: '/api/auth/login', headers: H, payload: { email: 'z@z.co', password: 'qualquer coisa' } })).statusCode;
    expect(last).toBe(429);
  }, 30_000); // 10 conferências de senha (scrypt); com a máquina ocupada, passa dos 5 s padrão

  it('sincroniza progresso somando os dois lados', async () => {
    const reg = await app.inject({ method: 'POST', url: '/api/auth/register', headers: H, payload: { email: 'b@b.co', password: 'uma frase longa' } });
    const cookie = cookieOf(reg);
    const a = emptyProgress();
    a.attempts.push({ exerciseId: 'e1', skills: ['s'], difficulty: 'facil', correct: true, score: 1, hintsUsed: 0, wrongTries: 0, revealed: false, at: 1000 });
    const b = emptyProgress();
    b.attempts.push({ exerciseId: 'e2', skills: ['s'], difficulty: 'facil', correct: false, score: 0.2, hintsUsed: 1, wrongTries: 2, revealed: false, at: 2000 });
    const expectedUserId=reg.json().user.id;
    const mismatch=await app.inject({method:'PUT',url:'/api/progress',headers:{...H,cookie},payload:{progress:a,expectedUserId:'another-user'}});
    expect(mismatch.statusCode).toBe(409);
    await app.inject({ method: 'PUT', url: '/api/progress', headers: { ...H, cookie }, payload: { progress: a,expectedUserId } });
    const res = await app.inject({ method: 'PUT', url: '/api/progress', headers: { ...H, cookie }, payload: { progress: b,expectedUserId } });
    expect(res.json().progress.attempts.map((x: { exerciseId: string }) => x.exerciseId).sort()).toEqual(['e1', 'e2']);
    const anon = await app.inject({ method: 'PUT', url: '/api/progress', headers: H, payload: { progress: a } });
    expect(anon.statusCode).toBe(401);
  });

  it('excluir conta apaga sessão', async () => {
    const reg = await app.inject({ method: 'POST', url: '/api/auth/register', headers: H, payload: { email: 'c@c.co', password: 'uma frase longa' } });
    const cookie = cookieOf(reg);
    expect((await app.inject({ method: 'DELETE', url: '/api/auth/me', headers: { ...H, cookie }, payload: { password: 'uma frase longa' } })).statusCode).toBe(204);
    expect((await app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie } })).json().user).toBeNull();
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
    setPlan(fixtureDb,reg.json().user.id,'premium',null,'test');
    const ask = () => app.inject({ method: 'POST', url: '/api/tutor', headers: { ...H, cookie }, payload: { message: 'como começo?' } });
    expect((await ask()).json()).toEqual({ reply: 'pergunta socrática', mode: 'ia' });
    expect((await ask()).json().mode).toBe('ia');
    expect((await ask()).json().mode).toBe('offline'); // limite diário = 2
    expect(calls).toBe(2);
  });

  it('informa indisponibilidade do provedor e mantém apoio local após falha', async () => {
    app=await setup({name:'ia',answer:async()=>{throw new Error('private-provider-detail');}});
    const reg=await app.inject({method:'POST',url:'/api/auth/register',headers:H,payload:{email:'fallback@test.co',password:'uma frase longa'}});
    setPlan(fixtureDb,reg.json().user.id,'premium',null,'test');
    const res=await app.inject({method:'POST',url:'/api/tutor',headers:{...H,cookie:cookieOf(reg)},payload:{message:'Explique variáveis'}});
    expect(res.json().mode).toBe('offline');expect(res.json().reason).toBe('provider_unavailable');expect(res.json().reply).not.toContain('private-provider-detail');
  });

  it('planos: conta nasce gratuita; premium e vencimento refletem nos direitos e no limite do tutor', async () => {
    const db = openDb(':memory:');
    const config = { ...loadConfig({}), webDist: '/nao-existe', tutorDailyLimit: 2 };
    app = await buildApp({ config, db, tutor: { name: 'ia', answer: async () => 'pista' } });
    const reg = await app.inject({ method: 'POST', url: '/api/auth/register', headers: H, payload: { email: 'p@p.co', password: 'uma frase longa' } });
    expect(reg.json().entitlements.plan).toBe('free');
    const cookie = cookieOf(reg);
    const me = async () => (await app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie } })).json();
    const id = (await me()).user.id as string;
    expect((await me()).entitlements).toMatchObject({ plan: 'free', tutorDailyLimit: 0 });
    expect((await me()).entitlements.features).not.toContain('tutor-ia');

    setPlan(db, id, 'premium', Date.now() + 86_400_000, 'teste');
    const e = (await me()).entitlements;
    expect(e.plan).toBe('premium');
    expect(e.tutorDailyLimit).toBe(2);
    const ask = () => app.inject({ method: 'POST', url: '/api/tutor', headers: { ...H, cookie }, payload: { message: 'oi' } });
    for (let i = 0; i < 2; i++) expect((await ask()).json().mode).toBe('ia');
    expect((await ask()).json().reason).toBe('daily_limit');

    setPlan(db, id, 'premium', Date.now() - 1, 'teste');
    expect((await me()).entitlements.plan).toBe('free');
    expect((db.prepare('SELECT COUNT(*) AS n FROM plan_changes WHERE user_id = ?').get(id) as { n: number }).n).toBe(2);
    expect((await app.inject({ method: 'GET', url: '/api/auth/me' })).json()).toEqual({ user: null, entitlements: null });
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
    expect(await t.answer(req, tutorSources(publicContent, req, 'free'))).toBe('O que a função deve devolver?');
    const system = String(captured.system);
    expect(system).toContain(ex.prompt);
    expect(system).not.toContain(ex.solution);
    expect(system).not.toContain('print(1)');
    const msgs = captured.messages as Array<{ role: string; content: string }>;
    expect(msgs[0]!.role).toBe('user');
    expect(msgs.at(-1)!.content).toContain('<codigo_do_aluno>');
    expect(captured.model).toBe('claude-sonnet-5-5');
    expect(captured.fallbacks).toBeUndefined();
    // teto com folga para o pensamento do modelo, que conta nele, e esforço baixo (docs/TUTOR-AVALIACAO.md)
    expect(captured.max_tokens).toBe(TUTOR_MAX_TOKENS);
    expect(captured.output_config).toEqual({ effort: 'low' });
  });

  it('recusa do modelo vira erro (cai no offline)', async () => {
    const client = { beta: { messages: { create: async () => ({ stop_reason: 'refusal', content: [] }) } } };
    const req = parseTutorRequest({ message: 'x' });
    await expect(new ClaudeTutor('k', 'outro-modelo', client as never).answer(req, tutorSources(publicContent, req, 'free'))).rejects.toThrow();
  });
});
