/**
 * Servidor HTTP: API JSON em /api e os arquivos estáticos pré-renderizados do
 * front-end. Uma única origem simplifica cookies, CORS (não há) e CSP.
 */
import { randomUUID } from 'node:crypto';
import { existsSync, statSync } from 'node:fs';
import { join, normalize, sep } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import { emptyProgress, mergeProgress, sanitizeProgress } from '@alicerce/engine';
import {
  clearCookie,
  COOKIE,
  createSession,
  deleteSession,
  getDummyHash,
  hashPassword,
  parseCookies,
  purgeExpiredSessions,
  sessionCookie,
  userForToken,
  verifyPassword,
  type UserRow,
} from './auth.ts';
import type { Config } from './config.ts';
import { getEntitlements } from './plans.ts';
import { RateLimiter, securityHeaders } from './security.ts';
import { ClaudeTutor, OfflineTutor, parseTutorRequest, type TutorProvider, type TutorReply } from './tutor.ts';

export interface AppDeps {
  config: Config;
  db: DatabaseSync;
  /** injetável nos testes */
  tutor?: TutorProvider;
  logger?: boolean;
}

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

export async function buildApp({ config, db, tutor, logger = false }: AppDeps) {
  const app = Fastify({
    logger: logger ? { level: 'info', redact: ['req.headers.cookie', 'req.headers.authorization'] } : false,
    bodyLimit: 1_000_000,
    trustProxy: config.trustProxy,
  });
  // JSON vazio vira objeto vazio (DELETE e logout não têm corpo; clientes podem mandar o content-type mesmo assim).
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
    if (body === '') return done(null, {});
    try {
      done(null, JSON.parse(body as string));
    } catch {
      done(Object.assign(new Error('JSON inválido.'), { statusCode: 400 }), undefined);
    }
  });
  const offline = new OfflineTutor();
  const ai: TutorProvider | null = tutor ?? (config.anthropicApiKey ? new ClaudeTutor(config.anthropicApiKey, config.tutorModel) : null);

  const limits = {
    global: new RateLimiter(600, 60_000),
    auth: new RateLimiter(10, 15 * 60_000),
    tutor: new RateLimiter(12, 60_000),
  };
  const tooMany = (reply: FastifyReply, retry: number) => reply.code(429).header('retry-after', String(retry)).send({ error: 'Muitas requisições. Tente de novo em instantes.' });

  /* ---------- ganchos globais ---------- */
  app.addHook('onRequest', async (req, reply) => {
    reply.headers(securityHeaders(req.url.split('?')[0]!, config.production));
    if (!req.url.startsWith('/api/')) return;
    reply.header('cache-control', 'no-store');
    const retry = limits.global.take(req.ip);
    if (retry) return tooMany(reply, retry);
    // Defesa contra CSRF: além do cookie SameSite=Lax, toda mutação exige um cabeçalho
    // personalizado, que um formulário de outro site não consegue enviar.
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers['x-alicerce'] !== '1') {
      return reply.code(403).send({ error: 'Requisição sem o cabeçalho esperado.' });
    }
  });

  const currentUser = (req: FastifyRequest): UserRow | null => userForToken(db, parseCookies(req.headers.cookie)[COOKIE]);
  const requireUser = (req: FastifyRequest, reply: FastifyReply): UserRow | null => {
    const u = currentUser(req);
    if (!u) void reply.code(401).send({ error: 'Faça login para continuar.' });
    return u;
  };
  const startSession = (reply: FastifyReply, userId: string) => {
    const { token, expires } = createSession(db, userId);
    reply.header('set-cookie', sessionCookie(token, expires, config.secureCookies));
  };

  /* ---------- saúde ---------- */
  app.get('/api/health', async () => {
    db.prepare('SELECT 1').get();
    return { ok: true, tutor: ai ? 'ia' : 'offline' };
  });

  /* ---------- autenticação ---------- */
  // Sem sessão devolve user: null (200), e não 401: visitante anônimo é o caso normal.
  const ent = (userId: string) => getEntitlements(db, userId, config.tutorDailyLimit);
  app.get('/api/auth/me', async (req) => {
    const user = currentUser(req);
    return { user, entitlements: user ? ent(user.id) : null };
  });

  app.post('/api/auth/register', async (req, reply) => {
    const retry = limits.auth.take(`reg:${req.ip}`);
    if (retry) return tooMany(reply, retry);
    const b = (req.body ?? {}) as Record<string, unknown>;
    const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
    const password = typeof b.password === 'string' ? b.password : '';
    const name = typeof b.name === 'string' ? b.name.trim().slice(0, 80) : '';
    if (!EMAIL.test(email) || email.length > 254) return reply.code(400).send({ error: 'E-mail inválido.' });
    // NIST SP 800-63B: comprimento mínimo, sem regras de composição, aceita espaços e Unicode.
    if (password.length < 10 || password.length > 200) return reply.code(400).send({ error: 'A senha precisa ter entre 10 e 200 caracteres.' });
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) return reply.code(409).send({ error: 'Já existe uma conta com esse e-mail. Tente entrar.' });
    const id = randomUUID();
    db.prepare('INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)').run(id, email, name, await hashPassword(password), Date.now());
    startSession(reply, id);
    return reply.code(201).send({ user: { id, email, name }, entitlements: ent(id) });
  });

  app.post('/api/auth/login', async (req, reply) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
    const password = typeof b.password === 'string' ? b.password.slice(0, 200) : '';
    const retry = limits.auth.take(`login:${req.ip}`) || limits.auth.take(`login:${email}`);
    if (retry) return tooMany(reply, retry);
    const row = db.prepare('SELECT id, email, name, password_hash FROM users WHERE email = ?').get(email) as (UserRow & { password_hash: string }) | undefined;
    const ok = await verifyPassword(password, row?.password_hash ?? (await getDummyHash()));
    if (!row || !ok) return reply.code(401).send({ error: 'E-mail ou senha incorretos.' });
    purgeExpiredSessions(db);
    startSession(reply, row.id);
    return { user: { id: row.id, email: row.email, name: row.name }, entitlements: ent(row.id) };
  });

  app.post('/api/auth/logout', async (req, reply) => {
    deleteSession(db, parseCookies(req.headers.cookie)[COOKIE]);
    return reply.header('set-cookie', clearCookie(config.secureCookies)).code(204).send();
  });

  app.delete('/api/auth/me', async (req, reply) => {
    const u = requireUser(req, reply);
    if (!u) return reply;
    db.prepare('DELETE FROM users WHERE id = ?').run(u.id); // ON DELETE CASCADE apaga sessões, progresso e uso
    return reply.header('set-cookie', clearCookie(config.secureCookies)).code(204).send();
  });

  /* ---------- progresso ---------- */
  // O cliente envia o estado local; o servidor combina com o que já tem (união
  // comutativa e idempotente) e devolve o resultado. Nada se perde entre aparelhos.
  app.put('/api/progress', async (req, reply) => {
    const u = requireUser(req, reply);
    if (!u) return reply;
    const incoming = sanitizeProgress((req.body as { progress?: unknown } | null)?.progress);
    const row = db.prepare('SELECT data FROM progress WHERE user_id = ?').get(u.id) as { data: string } | undefined;
    let stored = emptyProgress();
    if (row) {
      try {
        stored = sanitizeProgress(JSON.parse(row.data));
      } catch {
        /* dado corrompido: recomeça a partir do cliente */
      }
    }
    const merged = mergeProgress(stored, incoming);
    db.prepare('INSERT INTO progress (user_id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at').run(
      u.id,
      JSON.stringify(merged),
      Date.now(),
    );
    return { progress: merged };
  });

  /* ---------- tutor ---------- */
  app.post('/api/tutor', async (req, reply): Promise<TutorReply | FastifyReply> => {
    let parsed;
    try {
      parsed = parseTutorRequest(req.body);
    } catch (e) {
      return reply.code(400).send({ error: (e as Error).message });
    }
    const u = currentUser(req);
    const retry = limits.tutor.take(u ? `u:${u.id}` : `ip:${req.ip}`);
    if (retry) return tooMany(reply, retry);

    // IA só para quem tem conta (controla custo e abuso), com limite diário.
    if (ai && u) {
      const day = new Date().toISOString().slice(0, 10);
      const used = (db.prepare('SELECT count FROM tutor_usage WHERE user_id = ? AND day = ?').get(u.id, day) as { count: number } | undefined)?.count ?? 0;
      if (used < ent(u.id).tutorDailyLimit) {
        db.prepare('INSERT INTO tutor_usage (user_id, day, count) VALUES (?, ?, 1) ON CONFLICT(user_id, day) DO UPDATE SET count = count + 1').run(u.id, day);
        try {
          return { reply: await ai.answer(parsed), mode: 'ia' };
        } catch (err) {
          req.log.warn({ err: (err as Error).message }, 'tutor IA falhou; usando offline');
        }
      }
    }
    return { reply: await offline.answer(parsed), mode: 'offline' };
  });

  app.all('/api/*', async (_req, reply) => reply.code(404).send({ error: 'Rota não encontrada.' }));

  /* ---------- front-end estático ---------- */
  const dist = config.webDist;
  if (existsSync(dist)) {
    await app.register(fastifyStatic, {
      root: dist,
      index: false,
      redirect: false,
      wildcard: false,
      setHeaders(res, path) {
        if (path.includes(`${sep}assets${sep}`)) res.header('cache-control', 'public, max-age=31536000, immutable');
        else if (path.includes(`${sep}pyodide${sep}`)) res.header('cache-control', 'public, max-age=604800');
        else if (path.endsWith('.html')) res.header('cache-control', 'no-cache');
        else res.header('cache-control', 'public, max-age=3600');
      },
    });
    // Páginas: /trilha → dist/trilha/index.html (pré-renderizado). Sem página, 404.html.
    app.setNotFoundHandler(async (req, reply) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return reply.code(404).send({ error: 'Não encontrado.' });
      const path = decodeURIComponent(req.url.split('?')[0]!.split('#')[0]!);
      const rel = normalize(join(path, 'index.html')).replace(/^([/\\])+/, '');
      const file = join(dist, rel);
      if (!rel.startsWith('..') && file.startsWith(dist) && existsSync(file) && statSync(file).isFile()) return reply.sendFile(rel);
      return reply.code(404).sendFile('404.html');
    });
  }

  return app;
}
