/** Configuração por variáveis de ambiente, lida uma vez e validada. */
import { fileURLToPath } from 'node:url';
import { DEFAULT_TUTOR_DAILY_LIMIT } from '@alicerce/engine';
import { resolvePremiumDir } from '@alicerce/content/completo';

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
  tutorDailyLimit: number;
  /** Teto de chamadas à IA por dia (UTC), somando todas as contas. 0 desliga a IA. */
  tutorGlobalDailyLimit: number;
  /**
   * Clone do repositório privado com o conteúdo pago (ALICERCE_PREMIUM_DIR; sem a
   * variável, <raiz>/premium se existir). null = só conteúdo gratuito.
   */
  premiumDir: string | null;
}

/**
 * Teto inicial de chamadas à IA por dia no Alicerce todo (cerca de 15 assinantes no limite diário).
 * Provisório: o valor certo sai da medição do custo real por chamada (tokens em tutor_ai_daily).
 */
export const DEFAULT_TUTOR_GLOBAL_DAILY_LIMIT = 300;

const bool = (v: string | undefined, dflt: boolean) => (v === undefined || v === '' ? dflt : ['1', 'true', 'yes', 'sim'].includes(v.toLowerCase()));
const int = (v: string | undefined, dflt: number) => {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) && n >= 0 ? n : dflt;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const production = env.NODE_ENV === 'production';
  return {
    port: int(env.PORT, 3001),
    host: env.HOST ?? (production ? '0.0.0.0' : '127.0.0.1'),
    dbPath: env.DATABASE_PATH ?? fileURLToPath(new URL('../data/alicerce.db', import.meta.url)),
    webDist: env.WEB_DIST ?? fileURLToPath(new URL('../../web/dist', import.meta.url)),
    production,
    secureCookies: bool(env.COOKIE_SECURE, production),
    trustProxy: bool(env.TRUST_PROXY, false),
    anthropicApiKey: env.ANTHROPIC_API_KEY || undefined,
    tutorModel: env.TUTOR_MODEL || 'claude-sonnet-5-5',
    tutorDailyLimit: int(env.TUTOR_DAILY_LIMIT, DEFAULT_TUTOR_DAILY_LIMIT),
    tutorGlobalDailyLimit: int(env.TUTOR_GLOBAL_DAILY_LIMIT, DEFAULT_TUTOR_GLOBAL_DAILY_LIMIT),
    premiumDir: resolvePremiumDir(env),
  };
}
