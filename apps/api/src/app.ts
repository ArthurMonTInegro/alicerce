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
import type Anthropic from '@anthropic-ai/sdk';
import { exerciseById, lessonById } from '@alicerce/content';
import { emptyProgress, mergeProgress, PREMIUM_FOR_SALE, sanitizeProgress } from '@alicerce/engine';
import {
  applyPaymentEvent,
  canWithdraw,
  createSubscription,
  currentSubscription,
  getSubscription,
  openAttempts,
  PERIODS,
  periodPrice,
  ProviderUnavailable,
  recordProviderRef,
  recordWithdrawalRequest,
  renewingSubscriptions,
  subscriptionView,
  TEST_RESULTS,
  TestPaymentProvider,
  WEBHOOK_ROUTE,
  type PaymentProvider,
  type Period,
  type TestResult,
} from './assinatura.ts';
import {
  clearCookie,
  consumeResetToken,
  COOKIE,
  createResetToken,
  createSession,
  deleteSession,
  deleteUserSessions,
  getDummyHash,
  hashPassword,
  parseCookies,
  purgeExpiredSessions,
  sessionCookie,
  userForToken,
  verifyPassword,
  RESET_MINUTES,
  type UserRow,
} from './auth.ts';
import { mailerFor, MailError, type Mailer } from './email.ts';
import type { Config } from './config.ts';
import { drainOutbox, type DrainReport } from './avisos.ts';
import { AsaasPaymentProvider, asaasRefs } from './asaas.ts';
import { reconcile, reconcileOne, type ReconcileReport } from './conciliacao.ts';
import { getEntitlements } from './plans.ts';
import { RateLimiter, securityHeaders } from './security.ts';
import { publicContent, type ContentStore } from './conteudo.ts';
import { ClaudeTutor, OfflineTutor, parseTutorRequest, tutorSources, type TutorProvider, type TutorReply } from './tutor.ts';

export interface AppDeps {
  config: Config;
  db: DatabaseSync;
  /** injetável nos testes */
  tutor?: TutorProvider;
  /** corpo das aulas (gratuitas + pagas, se o diretório privado foi carregado); padrão: só gratuitas */
  content?: ContentStore;
  /** true: log em JSON na saída padrão; com `stream`, nele (os testes leem o que sai no log) */
  logger?: boolean | { stream: { write(line: string): void } };
  /** injetável nos testes; padrão: o que a configuração pede (email.ts, mailerFor) */
  mailer?: Mailer | null;
  /** fetch usado pelo adaptador do Asaas; os testes passam a simulação local da API */
  paymentFetch?: typeof fetch;
  /** cliente da API da Anthropic do tutor com IA; os testes e a avaliação local passam um falso, que não sai para a rede */
  anthropicClient?: Anthropic;
}

declare module 'fastify' {
  interface FastifyRequest {
    /** corpo JSON como chegou (a assinatura do webhook é conferida sobre ele) */
    rawBody?: string;
  }
  interface FastifyInstance {
    /** o provedor de pagamento em uso (null = Premium sem venda); os testes o manipulam */
    pagamentos: PaymentProvider | null;
    /** rotinas que o servidor roda de tempos em tempos (main.ts) */
    rotinas: { conciliar(): Promise<ReconcileReport | null>; enviarEmails(): Promise<DrainReport> };
  }
}

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

/** Limite de corpo de toda requisição, exceto a sincronização do progresso. */
export const BODY_LIMIT = 1_000_000;
/**
 * Limite de corpo só de PUT /api/progress. O maior progresso que um navegador
 * legítimo envia, com MAX_ATTEMPTS tentativas e MAX_REVIEWS revisões no teto do
 * saneamento e todo o catálogo estudado, mede cerca de 2,5 MB
 * (apps/api/test/maior-progresso.ts gera esse caso e o teste confere a folga).
 * 4 MiB dá mais de 1,5 vez esse tamanho; a rota recusa quem não tem sessão antes
 * de ler o corpo.
 */
export const PROGRESS_BODY_LIMIT = 4 * 1024 * 1024;
/**
 * Sincronizações por minuto por conta. Processar um envio no maior caso legítimo
 * custa cerca de 300 ms de CPU (a maior parte na mesclagem); sem este teto, uma
 * conta só ocuparia o servidor dentro do limite geral de 600/min por IP. O
 * navegador agrupa as mudanças e espera 1,5 s sem atividade antes de enviar (no
 * máximo uns 40 envios por minuto); um 429 vira "tentaremos de novo" e nada se
 * perde, porque o progresso fica no navegador.
 */
export const PROGRESS_SYNCS_PER_MINUTE = 60;

export async function buildApp({ config, db, tutor, content = publicContent, logger = false, mailer = mailerFor(config), paymentFetch, anthropicClient }: AppDeps) {
  if (config.production && config.paymentProvider === 'teste') throw new Error('O provedor de pagamento de teste (PAGAMENTO_PROVEDOR=teste) não pode rodar com NODE_ENV=production.');
  if (config.paymentProvider === 'asaas') {
    if (!config.asaas?.apiKey || !config.asaas.webhookToken) throw new Error('PAGAMENTO_PROVEDOR=asaas precisa de ASAAS_API_KEY e ASAAS_WEBHOOK_TOKEN no ambiente.');
    // Cobrança real só depois da decisão de vender, que liga PREMIUM_FOR_SALE no código (e exige as datas da transição).
    if (config.asaas.environment === 'producao' && !PREMIUM_FOR_SALE) throw new Error('Cobrança real bloqueada: ASAAS_AMBIENTE=producao só sobe com PREMIUM_FOR_SALE ligado em packages/engine/src/plans.ts.');
  }
  const app = Fastify({
    logger: logger ? { level: 'info', redact: ['req.headers.cookie', 'req.headers.authorization'], ...(logger === true ? {} : { stream: logger.stream }) } : false,
    bodyLimit: BODY_LIMIT,
    trustProxy: config.trustProxy,
  });
  // JSON vazio vira objeto vazio (DELETE e logout não têm corpo; clientes podem mandar o content-type mesmo assim).
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    // O corpo cru só interessa ao webhook, que confere a assinatura sobre os bytes recebidos.
    if (req.routeOptions.url === WEBHOOK_ROUTE) req.rawBody = body as string;
    if (body === '') return done(null, {});
    try {
      done(null, JSON.parse(body as string));
    } catch {
      done(Object.assign(new Error('JSON inválido.'), { statusCode: 400 }), undefined);
    }
  });
  const offline = new OfflineTutor();
  // Totais da IA no Alicerce todo, por dia (UTC): chamadas, falhas e tokens (tutor_ai_daily).
  const today = () => new Date().toISOString().slice(0, 10);
  const aiDaily = (calls: number, failures: number, input: number, output: number) =>
    db
      .prepare('INSERT INTO tutor_ai_daily (day, calls, failures, input_tokens, output_tokens) VALUES (?, ?, ?, ?, ?) ON CONFLICT(day) DO UPDATE SET calls = calls + excluded.calls, failures = failures + excluded.failures, input_tokens = input_tokens + excluded.input_tokens, output_tokens = output_tokens + excluded.output_tokens')
      .run(today(), calls, failures, input, output);
  const ai: TutorProvider | null =
    tutor ??
    (config.anthropicApiKey
      ? new ClaudeTutor(config.anthropicApiKey, config.tutorModel, anthropicClient, (u) => aiDaily(0, 0, u.input, u.output), config.tutorEffort)
      : null);

  const limits = {
    global: new RateLimiter(600, 60_000),
    auth: new RateLimiter(config.authAttempts, 15 * 60_000),
    tutor: new RateLimiter(12, 60_000),
    progress: new RateLimiter(PROGRESS_SYNCS_PER_MINUTE, 60_000),
  };
  // Provedor de pagamento: o simulado ou o Asaas. Os webhooks do simulado passam pela mesma rota
  // de um provedor real (app.inject), com a assinatura conferida do mesmo jeito.
  const ASAAS_NOTICES = {
    cobranca_sem_vinculo: 'cobrança do Asaas sem assinatura do Alicerce ligada a ela: confira no painel se alguém pagou sem receber acesso (docs/PAGAMENTO.md, "Investigar uma divergência")',
    cobranca_desconhecida: 'webhook do Asaas aponta uma cobrança que a API não conhece: nada foi mudado',
  } as const;
  const payments: PaymentProvider | null =
    config.paymentProvider === 'teste'
      ? new TestPaymentProvider(config.paymentWebhookSecret, async (payload, headers) => {
          const r = await app.inject({ method: 'POST', url: WEBHOOK_ROUTE, headers, payload });
          if (r.statusCode !== 200) throw new Error(`webhook de teste recusado (${r.statusCode})`);
        })
      : config.paymentProvider === 'asaas'
        ? new AsaasPaymentProvider({ ...config.asaas!, appUrl: config.appUrl }, asaasRefs(db), paymentFetch, (kind, ctx) =>
            app.log.warn({ pagamento: { tipo: kind, ...ctx } }, ASAAS_NOTICES[kind]),
          )
        : null;
  /** Depois de cancelar ou estornar: aplica já o que o provedor confirmou, sem esperar o webhook. */
  const settle = async (id: string, log: FastifyRequest['log']) => {
    if (!payments) return;
    try {
      await reconcileOne(db, payments, id);
    } catch (e) {
      log.warn({ err: e, assinatura: id }, 'não consegui conferir agora; o webhook do provedor atualiza depois');
    }
  };
  /** Para no provedor a renovação de todas as assinaturas da conta que ainda renovam; false se alguma não parou. */
  const stopRenewals = async (userId: string) => {
    for (const sub of renewingSubscriptions(db, userId)) {
      try {
        if (payments?.name !== sub.provider) throw new Error('provedor indisponível');
        await payments.cancel(sub.id);
      } catch {
        return false;
      }
    }
    return true;
  };
  const tooMany = (reply: FastifyReply, retry: number) => reply.code(429).header('retry-after', String(retry)).send({ error: 'Muitas requisições. Tente de novo em instantes.' });

  /* ---------- ganchos globais ---------- */
  app.addHook('onRequest', async (req, reply) => {
    reply.headers(securityHeaders(req.url.split('?')[0]!, config.production));
    // O roteador decodifica o caminho (/%61pi/auth/me chega à rota /api/auth/me), então o que
    // decide é a rota encontrada, não o texto cru da URL.
    if (req.routeOptions.url?.startsWith('/api/') || req.url.startsWith('/api/')) {
      reply.header('cache-control', 'no-store');
      const retry = limits.global.take(req.ip);
      if (retry) return tooMany(reply, retry);
    }
    // Defesa contra CSRF: além do cookie SameSite=Lax, toda mutação exige um cabeçalho
    // personalizado, que um formulário de outro site não consegue enviar. Vale para qualquer
    // caminho: fora da API não há mutação legítima. A exceção é o webhook do provedor de
    // pagamento, que não usa cookie nem sessão e só vale com a assinatura HMAC.
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers['x-alicerce'] !== '1' && !(req.method === 'POST' && req.routeOptions.url === WEBHOOK_ROUTE)) {
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
    return { ok: true, tutor: ai ? 'ia' : 'offline', conteudoPago: content.premium };
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
    // Prefixos distintos para IP e e-mail: o e-mail do login não é validado, e com
    // a mesma chave quem mandasse o IP de outra pessoa como "e-mail" bloquearia o login dela.
    const retry = limits.auth.take(`login-ip:${req.ip}`) || limits.auth.take(`login:${email}`);
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

  // Encerra a sessão em todos os aparelhos, inclusive neste. Quem não tem sessão válida
  // recebe 401: não há como saber de quem seriam as outras sessões.
  app.post('/api/auth/sessions/encerrar', async (req, reply) => {
    const u = requireUser(req, reply);
    if (!u) return reply;
    const ended = deleteUserSessions(db, u.id);
    return reply.header('set-cookie', clearCookie(config.secureCookies)).send({ ended });
  });

  // Excluir a conta exige a senha atual: só a sessão (um cookie esquecido num
  // computador emprestado, por exemplo) não basta para apagar tudo.
  app.delete('/api/auth/me', async (req, reply) => {
    const u = requireUser(req, reply);
    if (!u) return reply;
    const b = (req.body ?? {}) as Record<string, unknown>;
    const password = typeof b.password === 'string' ? b.password.slice(0, 200) : '';
    // Sem senha não há o que conferir: responde antes de gastar uma tentativa.
    if (!password) return reply.code(400).send({ error: 'Digite sua senha atual para excluir a conta.' });
    // Palpites de senha somam com os do login: o balde por conta é o mesmo.
    const retry = limits.auth.take(`excluir:${req.ip}`) || limits.auth.take(`login:${u.email}`);
    if (retry) return tooMany(reply, retry);
    const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(u.id) as { password_hash: string } | undefined;
    // Mesmo cálculo e comparação em tempo constante do login.
    const ok = await verifyPassword(password, row?.password_hash ?? (await getDummyHash()));
    if (!row || !ok) return reply.code(403).send({ error: 'Senha incorreta. A conta não foi excluída.' });
    // Assinatura que ainda renova (todas, não só a mais recente): para a renovação no provedor antes de apagar a conta.
    if (!(await stopRenewals(u.id))) return reply.code(502).send({ error: 'Não consegui cancelar a renovação da assinatura agora, então a conta não foi excluída. Tente de novo em instantes.' });
    db.prepare('DELETE FROM users WHERE id = ?').run(u.id); // ON DELETE CASCADE apaga sessões, progresso, uso e assinaturas
    return reply.header('set-cookie', clearCookie(config.secureCookies)).code(204).send();
  });

  /* ---------- recuperação de senha ---------- */
  // A resposta é a mesma com ou sem conta para o e-mail (não revela quem tem conta).
  // O link vale RESET_MINUTES minutos, uma vez só; o token vai no fragmento (#), que o
  // navegador não manda ao servidor nem a terceiros. Trocar a senha encerra todas as sessões.
  app.post('/api/auth/senha/recuperar', async (req, reply) => {
    if (!mailer) return reply.code(503).send({ error: 'A recuperação de senha ainda não está disponível neste servidor.' });
    const b = (req.body ?? {}) as Record<string, unknown>;
    const email = typeof b.email === 'string' ? b.email.trim().toLowerCase().slice(0, 254) : '';
    const retry = limits.auth.take(`recuperar-ip:${req.ip}`) || limits.auth.take(`recuperar:${email}`);
    if (retry) return tooMany(reply, retry);
    if (!EMAIL.test(email)) return reply.code(400).send({ error: 'E-mail inválido.' });
    const row = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined;
    if (row) {
      const token = createResetToken(db, row.id);
      // Sem esperar o envio: o tempo da resposta e uma falha do fornecedor de e-mail
      // revelariam que o e-mail tem conta. A falha fica só no log.
      mailer
        .send({
          to: email,
          subject: 'Alicerce: trocar a senha',
          text: `Alguém pediu para trocar a senha da conta do Alicerce com este e-mail.\n\nPara escolher uma senha nova, abra este link em até ${RESET_MINUTES} minutos:\n${config.appUrl}/conta/redefinir#t=${token}\n\nSe não foi você, ignore esta mensagem: a senha continua a mesma.`,
        })
        .catch((e) => req.log.error({ email: { erro: e instanceof MailError ? e.code : 'erro inesperado' } }, 'falha ao enviar o e-mail de recuperação'));
    }
    return reply.code(202).send({ ok: true });
  });

  app.post('/api/auth/senha/redefinir', async (req, reply) => {
    const retry = limits.auth.take(`redefinir-ip:${req.ip}`);
    if (retry) return tooMany(reply, retry);
    const b = (req.body ?? {}) as Record<string, unknown>;
    const token = typeof b.token === 'string' ? b.token : '';
    const password = typeof b.password === 'string' ? b.password : '';
    if (password.length < 10 || password.length > 200) return reply.code(400).send({ error: 'A senha precisa ter entre 10 e 200 caracteres.' });
    const hash = await hashPassword(password);
    db.exec('BEGIN IMMEDIATE');
    try {
      const userId = consumeResetToken(db, token);
      if (!userId) {
        db.exec('ROLLBACK');
        return reply.code(400).send({ error: 'Este link não vale mais: ele vence em ' + RESET_MINUTES + ' minutos e só pode ser usado uma vez. Peça outro.' });
      }
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, userId);
      deleteUserSessions(db, userId);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    return reply.code(204).send();
  });

  /* ---------- progresso ---------- */
  // O cliente envia o estado local; o servidor combina com o que já tem (união
  // comutativa e idempotente) e devolve o resultado. Nada se perde entre aparelhos.
  app.put('/api/progress', {
    bodyLimit: PROGRESS_BODY_LIMIT,
    // Confere a sessão e o limite da conta antes de ler o corpo: recusado aqui, o
    // corpo é descartado sem ser guardado nem interpretado.
    onRequest: async (req, reply) => {
      const u = currentUser(req);
      if (!u) return reply.code(401).send({ error: 'Faça login para continuar.' });
      const retry = limits.progress.take(`u:${u.id}`);
      if (retry) return tooMany(reply, retry);
    },
  }, async (req, reply) => {
    const u = requireUser(req, reply);
    if (!u) return reply;
    if((req.body as {expectedUserId?:unknown}|null)?.expectedUserId!==u.id)return reply.code(409).send({error:'A conta mudou. Reabra a sessão antes de sincronizar.'});
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

  /* ---------- conteúdo das aulas ---------- */
  // O corpo das aulas pagas nunca vai para o build público: só sai daqui, e só depois
  // de conferir, A CADA PEDIDO, sessão válida no banco E plano premium não vencido no
  // banco (getEntitlements). Nada que venha do cliente (plano, progresso, desbloqueio
  // pedagógico) autoriza. Respostas com conteúdo pago: Cache-Control private, no-store.
  const PRIVATE = { 'cache-control': 'private, no-store', vary: 'Cookie' };
  /** Sessão + Premium ativo; senão responde 401 (sem sessão) ou 403 (sem Premium) e devolve null. */
  const requirePremium = (req: FastifyRequest, reply: FastifyReply): UserRow | null => {
    const u = currentUser(req);
    if (!u) {
      void reply.code(401).send({ error: 'Entre na sua conta para acessar o conteúdo do Premium.' });
      return null;
    }
    if (ent(u.id).plan !== 'premium') {
      void reply.code(403).send({ error: 'Este conteúdo requer o plano Premium ativo.' });
      return null;
    }
    return u;
  };
  const unavailable = (reply: FastifyReply) =>
    reply.code(503).header('retry-after', '3600').send({ error: 'O conteúdo do Premium está indisponível neste servidor no momento.', conteudoPago: 'indisponivel' });

  app.get('/api/content/lessons/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!lessonById.has(id)) return reply.code(404).send({ error: 'Lição não encontrada.' });
    if (!content.isPaid(id)) {
      const body = content.lesson(id);
      return body ?? reply.code(404).send({ error: 'Lição não encontrada.' });
    }
    reply.headers(PRIVATE);
    if (!requirePremium(req, reply)) return reply;
    const body = content.premium === 'disponivel' ? content.lesson(id) : undefined;
    return body ?? unavailable(reply);
  });

  // Cartões de todas as lições que o assinante pode ler (os das gratuitas também estão no build público).
  app.get('/api/content/cards', async (req, reply) => {
    reply.headers(PRIVATE);
    if (!requirePremium(req, reply)) return reply;
    if (content.premium !== 'disponivel') return unavailable(reply);
    return content.cards('premium');
  });

  /* ---------- assinatura do Premium ---------- */
  // Sem provedor configurado, o Premium não está à venda: GET responde venda: null e as
  // outras rotas, 404. O plano só muda pelo webhook do provedor (applyPaymentEvent).
  app.get('/api/assinatura', async (req, reply) => {
    const u = requireUser(req, reply);
    if (!u) return reply;
    reply.headers(PRIVATE);
    return {
      // teste: o provedor simulado, ou o sandbox do Asaas; nos dois, nada é cobrado
      venda: payments ? { provedor: payments.name, teste: payments.name === 'teste' || config.asaas?.environment === 'sandbox', precos: { mensal: periodPrice('mensal'), anual: periodPrice('anual') } } : null,
      assinatura: subscriptionView(currentSubscription(db, u.id)),
      plano: ent(u.id),
    };
  });

  const salesOff = (reply: FastifyReply) => reply.code(404).send({ error: 'O Premium ainda não está à venda.' });

  app.post('/api/assinatura', async (req, reply) => {
    const u = requireUser(req, reply);
    if (!u) return reply;
    if (!payments) return salesOff(reply);
    const period = (req.body as { periodo?: unknown } | null)?.periodo as Period;
    if (!PERIODS.includes(period)) return reply.code(400).send({ error: 'Escolha mensal ou anual.' });
    // Uma tentativa anterior pode ter sido paga sem o webhook ter chegado: confere antes de abrir outra.
    for (const old of openAttempts(db, u.id)) await settle(old.id, req.log);
    const cur = currentSubscription(db, u.id);
    if (cur && (cur.status === 'ativa' || cur.status === 'cancelada') && (cur.paid_until ?? 0) > Date.now()) return reply.code(409).send({ error: 'Você já tem uma assinatura em vigor.' });
    // Uma assinatura vencida que o provedor ainda tenta renovar seria cobrada junto com a nova: para a renovação dela antes.
    if (!(await stopRenewals(u.id))) return reply.code(502).send({ error: 'Não consegui encerrar a renovação da assinatura anterior agora. Tente de novo em instantes.' });
    // A página da tentativa anterior fecha no provedor, para não ser paga junto com a nova.
    for (const old of openAttempts(db, u.id)) {
      try {
        await payments.abandon?.(old.id);
      } catch (e) {
        req.log.warn({ err: e, assinatura: old.id }, 'não consegui fechar a página de pagamento anterior');
      }
    }
    const sub = createSubscription(db, u.id, payments.name, period);
    let checkout;
    try {
      checkout = await payments.checkout({ id: sub.id, email: u.email, period, price: sub.price });
    } catch (e) {
      // a assinatura fica pendente, sem dar acesso; a pessoa tenta de novo
      req.log.error({ err: e, assinatura: sub.id }, 'falha ao abrir o pagamento no provedor');
      return reply.code(502).send({ error: 'Não consegui abrir a página de pagamento agora. Nada foi cobrado. Tente de novo em instantes.' });
    }
    if (checkout.ref) recordProviderRef(db, sub.id, checkout.ref);
    return { url: checkout.url };
  });

  app.post('/api/assinatura/cancelar', async (req, reply) => {
    const u = requireUser(req, reply);
    if (!u) return reply;
    if (!payments) return salesOff(reply);
    const sub = currentSubscription(db, u.id);
    if (sub?.status !== 'ativa' || sub.provider !== payments.name) return reply.code(409).send({ error: 'Não há assinatura renovando para cancelar.' });
    // Nada muda aqui até o provedor confirmar pelo webhook; se ele não responder, a pessoa tenta de novo.
    try {
      await payments.cancel(sub.id);
    } catch (e) {
      req.log.error({ err: e, assinatura: sub.id }, 'falha ao cancelar no provedor');
      return reply.code(502).send({ error: 'Não consegui falar com o provedor de pagamento agora, então a renovação continua ligada. Tente de novo em instantes.' });
    }
    await settle(sub.id, req.log);
    return { assinatura: subscriptionView(getSubscription(db, sub.id)), plano: ent(u.id) };
  });

  // Desistência em até 7 dias do primeiro pagamento (CDC, art. 49): estorno integral e fim do acesso na hora.
  app.post('/api/assinatura/desistir', async (req, reply) => {
    const u = requireUser(req, reply);
    if (!u) return reply;
    if (!payments) return salesOff(reply);
    const sub = currentSubscription(db, u.id);
    if (!sub || sub.provider !== payments.name || !canWithdraw(sub)) return reply.code(409).send({ error: 'O prazo de 7 dias para desistir com estorno já passou, ou não há pagamento para estornar.' });
    // O pedido fica registrado antes: se o provedor só responder depois dos 7 dias, o direito continua.
    // O estorno no provedor é idempotente: tentar de novo depois de uma falha não estorna duas vezes.
    recordWithdrawalRequest(db, sub.id);
    try {
      await payments.refund(sub.id);
    } catch (e) {
      req.log.error({ err: e, assinatura: sub.id }, 'falha ao pedir o estorno no provedor');
      return reply.code(502).send({ error: 'Não consegui falar com o provedor de pagamento agora, então o estorno ainda não foi pedido. Seu pedido de desistência ficou registrado dentro do prazo: tente de novo em instantes, mesmo que os 7 dias acabem antes.' });
    }
    await settle(sub.id, req.log);
    return { assinatura: subscriptionView(getSubscription(db, sub.id)), plano: ent(u.id) };
  });

  app.post(WEBHOOK_ROUTE, async (req, reply) => {
    if (!payments) return reply.code(404).send({ error: 'Rota não encontrada.' });
    let ev;
    try {
      ev = await payments.parseWebhook(req.rawBody ?? '', req.headers, Date.now());
    } catch (e) {
      // sem conseguir conferir na API do provedor agora: 503, e ele entrega de novo
      if (e instanceof ProviderUnavailable) {
        req.log.warn({ err: e }, 'webhook não conferido: provedor indisponível');
        return reply.code(503).send({ error: 'Não consegui conferir o evento agora.' });
      }
      return reply.code(400).send({ error: 'Webhook inválido.' });
    }
    if (!ev) return { ok: true, result: 'ignorado' };
    // Falha ao gravar: nada fica (applyPaymentEvent desfaz a transação inteira) e a resposta é 500,
    // para o provedor entregar o mesmo evento de novo.
    let result;
    try {
      result = applyPaymentEvent(db, payments.name, ev);
    } catch (e) {
      req.log.error({ err: e, evento: ev.id }, 'falha ao aplicar evento de pagamento');
      return reply.code(500).send({ error: 'Não consegui registrar o evento agora.' });
    }
    // Estorno parcial e contestação mudam o acesso pela regra proposta, à espera de uma decisão: ficam no log.
    if (result === 'aplicado' && (ev.type === 'reembolso_parcial' || ev.type === 'contestacao'))
      req.log.warn({ pagamento: { assinatura: ev.subscriptionId, cobranca: ev.chargeId ?? null, evento: ev.type } }, `${ev.type === 'contestacao' ? 'contestação no cartão' : 'estorno parcial'}: aplicada a regra proposta, à espera da decisão do Arthur (docs/PAGAMENTO.md)`);
    // E-mails que o evento pôs na fila: saem logo, sem segurar a resposta ao provedor.
    if (result === 'aplicado') setImmediate(() => void sendEmails().catch((e) => app.log.error({ err: e }, 'falha ao enviar os e-mails da fila')));
    return { ok: true, result };
  });

  // A "página de pagamento" do provedor de teste: a própria pessoa aprova ou recusa o pagamento da assinatura dela.
  app.post('/api/pagamento/teste/simular', async (req, reply) => {
    const u = requireUser(req, reply);
    if (!u) return reply;
    if (!(payments instanceof TestPaymentProvider)) return reply.code(404).send({ error: 'Rota não encontrada.' });
    const b = (req.body ?? {}) as { assinatura?: unknown; resultado?: unknown };
    const sub = typeof b.assinatura === 'string' ? getSubscription(db, b.assinatura) : undefined;
    if (!sub || sub.user_id !== u.id) return reply.code(404).send({ error: 'Assinatura não encontrada.' });
    if (!TEST_RESULTS.includes(b.resultado as TestResult)) return reply.code(400).send({ error: 'Resultado inválido.' });
    const result = b.resultado as TestResult;
    const renewal = result === 'renovar' || result === 'falhar-renovacao';
    if (renewal ? sub.status !== 'ativa' : sub.status !== 'pendente') return reply.code(409).send({ error: renewal ? 'Só uma assinatura que renova tem renovação.' : 'Este pagamento já foi resolvido.' });
    await payments.simulate({ id: sub.id, period: sub.period, paidUntil: sub.paid_until }, result);
    return { assinatura: subscriptionView(getSubscription(db, sub.id)), plano: ent(u.id) };
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
    reply.headers(PRIVATE);

    const rights = u ? ent(u.id) : null;
    const plan = rights?.plan ?? 'free';
    // Contexto de aula paga (dicas, enunciado, objetivos): mesma regra do conteúdo.
    const exId = parsed.context.exerciseId;
    // lição do exercício pelo mapa público e pelo corpo carregado (o mais restritivo vale)
    const exLessons = exId ? [exerciseById.get(exId)?.lessonId, content.exercise(exId)?.lessonId] : [];
    if ([parsed.context.lessonId, ...exLessons].some((id) => id && content.isPaid(id))) {
      if (!requirePremium(req, reply)) return reply;
      if (content.premium !== 'disponivel') return unavailable(reply);
    }
    const sources = tutorSources(content, parsed, plan);
    let reason: TutorReply['reason'] = !ai ? 'not_configured' : !u ? 'login_required' : 'daily_limit';
    if (plan === 'free' && u) reason = 'premium_required';
    // IA só para quem tem conta (controla custo e abuso), com limite diário e do mês por conta,
    // e um teto diário de chamadas no Alicerce todo (TUTOR_GLOBAL_DAILY_LIMIT).
    if (ai && u && rights && plan === 'premium') {
      const day = today();
      const used = (db.prepare('SELECT count FROM tutor_usage WHERE user_id = ? AND day = ?').get(u.id, day) as { count: number } | undefined)?.count ?? 0;
      const monthly=(db.prepare('SELECT COALESCE(SUM(count),0) AS total FROM tutor_usage WHERE user_id = ? AND day LIKE ?').get(u.id,day.slice(0,7)+'%') as {total:number}).total;
      const global = (db.prepare('SELECT calls FROM tutor_ai_daily WHERE day = ?').get(day) as { calls: number } | undefined)?.calls ?? 0;
      if(monthly>=rights.tutorMonthlyLimit)reason='monthly_limit';
      if (used < rights.tutorDailyLimit && monthly < rights.tutorMonthlyLimit) {
        if (global >= config.tutorGlobalDailyLimit) reason = 'budget_limit';
        else {
          // Reserva antes de chamar (pedidos simultâneos não passam do limite). Falha depois do envio
          // também conta (docs/ESTRATEGIA_ASSINATURA.md): o provedor pode ter cobrado.
          db.prepare('INSERT INTO tutor_usage (user_id, day, count) VALUES (?, ?, 1) ON CONFLICT(user_id, day) DO UPDATE SET count = count + 1').run(u.id, day);
          aiDaily(1, 0, 0, 0);
          // Latência de cada chamada no log (sem o conteúdo da conversa), para medir p50 e p95 no uso real.
          const started = performance.now();
          const ms = () => Math.round(performance.now() - started);
          try {
            const text = await ai.answer(parsed, sources);
            req.log.info({ tutorIa: { ms: ms(), ok: true } }, 'tutor IA respondeu');
            return { reply: text, mode: 'ia' };
          } catch {
            reason='provider_unavailable';
            aiDaily(0, 1, 0, 0);
            req.log.warn({ tutorIa: { ms: ms(), ok: false } }, 'tutor IA indisponível; usando apoio local');
          }
        }
      }
    }
    return { reply: await offline.answer(parsed, sources), mode: 'offline', reason };
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

  let sending: Promise<DrainReport> | null = null;
  // Uma rodada por vez neste processo; entre processos, a reserva de cada aviso (avisos.ts) evita envio duplo.
  const sendEmails = () =>
    (sending ??= drainOutbox(db, mailer, { appUrl: config.appUrl, seller: config.sellerIdentification }).finally(() => {
      sending = null;
    }));
  app.decorate('pagamentos', payments);
  app.decorate('rotinas', {
    conciliar: async () => (payments ? reconcile(db, payments) : null),
    enviarEmails: sendEmails,
  });
  return app;
}
