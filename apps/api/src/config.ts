/** Configuração por variáveis de ambiente, lida uma vez e validada. */
import { fileURLToPath } from 'node:url';
import { DEFAULT_TUTOR_DAILY_LIMIT } from '@alicerce/engine';
import { resolvePremiumDir } from '@alicerce/content/completo';
import type { AsaasBillingType, AsaasEnvironment } from './asaas.ts';
import type { ResendConfig } from './email.ts';

export interface Config {
  port: number;
  host: string;
  dbPath: string;
  webDist: string;
  production: boolean;
  /** cookie com atributo Secure (exige HTTPS). Padrão: ligado em produção. */
  secureCookies: boolean;
  /** confiar em X-Forwarded-For (só atrás de proxy reverso conhecido) */
  trustProxy: boolean;
  anthropicApiKey: string | undefined;
  tutorModel: string;
  /**
   * Esforço do modelo (output_config.effort, TUTOR_EFFORT). Padrão low: no Sonnet 5.5 o pensamento
   * vem ligado e, de medium para cima, ele pensa antes de quase toda resposta; o pensamento conta
   * em max_tokens e é cobrado como saída. Trocar só depois de comparar na avaliação com o modelo real.
   */
  tutorEffort: TutorEffort;
  tutorDailyLimit: number;
  /** Teto de chamadas à IA por dia (UTC), somando todas as contas. 0 desliga a IA. */
  tutorGlobalDailyLimit: number;
  /**
   * Clone do repositório privado com o conteúdo pago (ALICERCE_PREMIUM_DIR; sem a
   * variável, <raiz>/premium se existir). null = só conteúdo gratuito.
   */
  premiumDir: string | null;
  /** Endereço público do servidor, para os links dos e-mails (APP_URL). */
  appUrl: string;
  /**
   * Sem fornecedor de e-mail, os e-mails são gravados neste arquivo, um JSON por linha
   * (EMAIL_LOG_PATH), para testes. Padrão: apps/api/data/emails.log. Em produção, sempre null.
   */
  emailLogPath: string | null;
  /**
   * EMAIL_PROVEDOR=resend, com RESEND_API_KEY e EMAIL_REMETENTE (e, se quiser, EMAIL_RESPONDER_PARA):
   * o envio de verdade (email.ts), no lugar do arquivo. null = sem fornecedor.
   */
  resend: ResendConfig | null;
  /**
   * 'teste' liga o provedor de pagamento simulado (recusado em produção); 'asaas', o adaptador
   * do Asaas (asaas.ts), no sandbox a não ser que ASAAS_AMBIENTE=producao; null = Premium sem venda.
   */
  paymentProvider: 'teste' | 'asaas' | null;
  /** Credenciais e opções do Asaas, só no ambiente (nunca no repositório). */
  asaas: { apiKey: string; environment: AsaasEnvironment; webhookToken: string; billingTypes: AsaasBillingType[] } | null;
  /** Segredo dos webhooks do provedor (PAGAMENTO_WEBHOOK_SEGREDO). No de teste, sem ele, um aleatório por processo. */
  paymentWebhookSecret: string | null;
  /** Quem vende (nome, CPF ou CNPJ, endereço e contato), no e-mail de confirmação da compra (VENDEDOR_IDENTIFICACAO). */
  sellerIdentification: string | null;
  /** De quantos em quantos minutos o servidor confere as assinaturas com o provedor (CONCILIACAO_MINUTOS). 0 desliga. */
  reconcileMinutes: number;
  /** Tentativas de cadastro e de entrada por IP em 15 minutos. Só fora de produção dá para mudar (AUTH_RATE_LIMIT, usado pelo e2e). */
  authAttempts: number;
}

/**
 * Teto inicial de chamadas à IA por dia no Alicerce todo (cerca de 15 assinantes no limite diário).
 * Provisório: o valor certo sai da medição do custo real por chamada (tokens em tutor_ai_daily).
 */
export const DEFAULT_TUTOR_GLOBAL_DAILY_LIMIT = 300;

export const TUTOR_EFFORTS = ['low', 'medium', 'high'] as const;
export type TutorEffort = (typeof TUTOR_EFFORTS)[number];
const isTutorEffort = (v: string | undefined): v is TutorEffort => TUTOR_EFFORTS.includes(v as TutorEffort);

const bool = (v: string | undefined, dflt: boolean) => (v === undefined || v === '' ? dflt : ['1', 'true', 'yes', 'sim'].includes(v.toLowerCase()));
const int = (v: string | undefined, dflt: number) => {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) && n >= 0 ? n : dflt;
};

function emailProvider(env: NodeJS.ProcessEnv): ResendConfig | null {
  const p = env.EMAIL_PROVEDOR?.trim().toLowerCase();
  if (!p) return null;
  // Um nome errado desligaria os e-mails sem ninguém notar: melhor o servidor não subir.
  if (p !== 'resend') throw new Error(`EMAIL_PROVEDOR desconhecido: "${p.slice(0, 40)}" (o único é "resend").`);
  return { apiKey: env.RESEND_API_KEY ?? '', from: env.EMAIL_REMETENTE ?? '', replyTo: env.EMAIL_RESPONDER_PARA?.trim() || null };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const production = env.NODE_ENV === 'production';
  const port = int(env.PORT, 3001);
  return {
    port,
    host: env.HOST ?? (production ? '0.0.0.0' : '127.0.0.1'),
    dbPath: env.DATABASE_PATH ?? fileURLToPath(new URL('../data/alicerce.db', import.meta.url)),
    webDist: env.WEB_DIST ?? fileURLToPath(new URL('../../web/dist', import.meta.url)),
    production,
    secureCookies: bool(env.COOKIE_SECURE, production),
    trustProxy: bool(env.TRUST_PROXY, false),
    anthropicApiKey: env.ANTHROPIC_API_KEY || undefined,
    tutorModel: env.TUTOR_MODEL || 'claude-sonnet-5-5',
    tutorEffort: isTutorEffort(env.TUTOR_EFFORT) ? env.TUTOR_EFFORT : 'low',
    tutorDailyLimit: int(env.TUTOR_DAILY_LIMIT, DEFAULT_TUTOR_DAILY_LIMIT),
    tutorGlobalDailyLimit: int(env.TUTOR_GLOBAL_DAILY_LIMIT, DEFAULT_TUTOR_GLOBAL_DAILY_LIMIT),
    premiumDir: resolvePremiumDir(env),
    appUrl: (env.APP_URL || `http://127.0.0.1:${port}`).replace(/\/+$/, ''),
    // Em produção, nunca: o arquivo não entrega nada, e a tela diria "enviamos um link".
    emailLogPath: production ? null : env.EMAIL_LOG_PATH || fileURLToPath(new URL('../data/emails.log', import.meta.url)),
    resend: emailProvider(env),
    paymentProvider: env.PAGAMENTO_PROVEDOR === 'teste' || env.PAGAMENTO_PROVEDOR === 'asaas' ? env.PAGAMENTO_PROVEDOR : null,
    asaas:
      env.PAGAMENTO_PROVEDOR === 'asaas'
        ? {
            apiKey: env.ASAAS_API_KEY ?? '',
            environment: env.ASAAS_AMBIENTE === 'producao' ? 'producao' : 'sandbox',
            webhookToken: env.ASAAS_WEBHOOK_TOKEN ?? '',
            billingTypes: (env.ASAAS_FORMAS || 'CREDIT_CARD,PIX')
              .split(',')
              .map((f) => f.trim().toUpperCase())
              .filter((f): f is AsaasBillingType => f === 'CREDIT_CARD' || f === 'PIX'),
          }
        : null,
    paymentWebhookSecret: env.PAGAMENTO_WEBHOOK_SEGREDO || null,
    sellerIdentification: env.VENDEDOR_IDENTIFICACAO?.trim() || null,
    reconcileMinutes: int(env.CONCILIACAO_MINUTOS, 60),
    authAttempts: production ? 10 : Math.max(1, int(env.AUTH_RATE_LIMIT, 10)),
  };
}
