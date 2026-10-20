/** Cabeçalhos de segurança, CSP e limitador de requisições em memória. */

/**
 * CSP estrita do site: só scripts do próprio domínio, sem eval e sem WebAssembly
 * (o código do estudante não roda nesta origem). O site só emoldura a si mesmo
 * (frame-src 'self': a página de execução) e não pode ser emoldurado.
 */
export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "img-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src 'self'",
  "worker-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join('; ');

/**
 * Página de execução (public/runner.html), onde roda o código do estudante.
 * - `sandbox allow-scripts`: mesmo aberta direto, como página normal, a origem é
 *   opaca (o iframe do site também usa sandbox, sem allow-same-origin);
 * - `frame-ancestors 'self'`: só o próprio site pode emoldurá-la;
 * - `'unsafe-eval'` (new Function do JavaScript do estudante) e `'wasm-unsafe-eval'`
 *   (Pyodide) valem só aqui, numa origem opaca que não tem nada a proteger;
 * - workers só de URL data: e módulos só de blob: (o Pyodide chega do site como bytes);
 * - `connect-src 'none'`: o código do estudante não faz requisição nenhuma.
 * Os workers criados a partir de data: herdam esta política (medido no Chromium).
 */
export const CSP_RUNNER = [
  'sandbox allow-scripts',
  "default-src 'none'",
  "script-src 'self' blob: 'unsafe-eval' 'wasm-unsafe-eval'",
  'worker-src data:',
  "connect-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'self'",
].join('; ');

/** O servidor serve o build com base "/" (BASE_PATH só existe no build estático do GitHub Pages). */
const RUNNER_PAGE = '/runner.html';
/**
 * Único arquivo que a página de execução busca do servidor. Ela tem origem opaca, então
 * para ela este arquivo é de outra origem: precisa de Cross-Origin-Resource-Policy: cross-origin
 * (com same-origin o Chromium bloqueia: ERR_BLOCKED_BY_RESPONSE.NotSameOrigin). É um script
 * clássico, sem CORS, então não precisa de Access-Control-Allow-Origin. O Pyodide, o código
 * dos workers e o harness são baixados pelo site (mesma origem) e entregues ao iframe.
 * Nada em /api recebe exceção.
 */
const RUNNER_SCRIPT = '/runner.js';

/** O servidor de arquivos decodifica a URL (/runner%2Ehtml serve runner.html): a comparação também. */
function decodePath(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

export function securityHeaders(rawPath: string, production: boolean): Record<string, string> {
  const path = decodePath(rawPath);
  const runnerPage = path === RUNNER_PAGE;
  const h: Record<string, string> = {
    'content-security-policy': runnerPage ? CSP_RUNNER : CSP,
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'cross-origin-opener-policy': 'same-origin',
    'cross-origin-resource-policy': path === RUNNER_SCRIPT ? 'cross-origin' : 'same-origin',
    'x-frame-options': runnerPage ? 'SAMEORIGIN' : 'DENY',
  };
  if (production) h['strict-transport-security'] = 'max-age=31536000; includeSubDomains';
  return h;
}

/** Janela deslizante simples por chave. Suficiente para uma instância; com várias, troque por Redis. */
export class RateLimiter {
  private hits = new Map<string, number[]>();
  private readonly limit: number;
  private readonly windowMs: number;
  constructor(limit: number, windowMs: number) {
    this.limit = limit;
    this.windowMs = windowMs;
  }
  /** devolve segundos até liberar, ou 0 se a requisição pode passar */
  take(key: string, now = Date.now()): number {
    const arr = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (arr.length >= this.limit) {
      this.hits.set(key, arr);
      return Math.ceil((arr[0]! + this.windowMs - now) / 1000);
    }
    arr.push(now);
    this.hits.set(key, arr);
    if (this.hits.size > 50_000) this.sweep(now);
    return 0;
  }
  private sweep(now: number) {
    for (const [k, v] of this.hits) if (!v.some((t) => now - t < this.windowMs)) this.hits.delete(k);
  }
}
