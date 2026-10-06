/** Cabeçalhos de segurança, CSP e limitador de requisições em memória. */

/**
 * CSP estrita: só scripts do próprio domínio. 'wasm-unsafe-eval' permite
 * compilar o WebAssembly do Pyodide sem liberar eval() de JavaScript.
 * O worker que executa JavaScript do aluno precisa de 'unsafe-eval' (usa
 * new Function), mas roda isolado num Web Worker sem acesso ao DOM, aos cookies
 * HttpOnly nem ao armazenamento da página; a exceção vale só para a resposta
 * desse arquivo (a CSP de um worker vem da resposta do próprio script).
 */
const BASE_CSP = [
  "default-src 'self'",
  "img-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
];
export const CSP = [...BASE_CSP, "script-src 'self' 'wasm-unsafe-eval'"].join('; ');
export const CSP_JS_WORKER = [...BASE_CSP, "script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval'"].join('; ');

export function securityHeaders(path: string, production: boolean): Record<string, string> {
  const h: Record<string, string> = {
    'content-security-policy': /^\/assets\/js\.worker-[\w-]+\.js$/.test(path) ? CSP_JS_WORKER : CSP,
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'cross-origin-opener-policy': 'same-origin',
    'cross-origin-resource-policy': 'same-origin',
    'x-frame-options': 'DENY',
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
