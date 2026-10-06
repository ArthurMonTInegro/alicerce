/** Configuração por variáveis de ambiente, lida uma vez e validada. */
import { fileURLToPath } from 'node:url';

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
}

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
    tutorDailyLimit: int(env.TUTOR_DAILY_LIMIT, 60),
  };
}
