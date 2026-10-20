/**
 * Lado do site da execução isolada. O código do estudante (Python, JavaScript e
 * SQL) não roda nesta página: roda na página de execução (public/runner.html),
 * carregada num <iframe sandbox="allow-scripts"> sem allow-same-origin. A origem
 * dela é opaca ("null"), então nada lá dentro enxerga cookies, localStorage,
 * IndexedDB, a página do site ou a sessão da conta.
 *
 * Protocolo:
 * 1. a página de execução cria um MessageChannel e manda uma ponta dele junto com
 *    o aviso de que está pronta (postMessage para o pai). Só vale a mensagem que vem
 *    do contentWindow do nosso iframe, no formato esperado e com o valor aleatório
 *    que pusemos no fragmento da URL dele: quem emoldura o site consegue trocar a
 *    página do iframe por outra, com o mesmo contentWindow, mas não lê a URL;
 * 2. daí em diante tudo passa por esse canal. O site nunca escreve no
 *    contentWindow, porque a página lá dentro pode ter sido trocada depois do aviso;
 * 3. cada pedido leva um id; uma resposta só vale se o id for o do pedido em
 *    andamento. Um pedido por vez, para o tempo limite medir só aquele pedido.
 *
 * O tempo limite fica aqui, do lado do site. Ao estourar, o iframe é destruído
 * (o que encerra os workers e qualquer tarefa assíncrona que o estudante tenha
 * deixado rodando) e o próximo pedido cria outro.
 */
import { BASE } from '../../lib/base.ts';

const PROTOCOL = 1;
const HANDSHAKE_MS = 20_000;

export class TimeoutError extends Error {
  constructor() {
    super('Tempo limite excedido');
  }
}

/** Falha do ambiente de execução (não do código do estudante). */
export class RunnerError extends Error {}

type Reply = { id: number; ok: boolean; result?: unknown; error?: unknown };

function isReady(d: unknown, nonce: string): boolean {
  if (typeof d !== 'object' || d === null) return false;
  const m = d as Record<string, unknown>;
  return m.alicerce === 'runner' && m.type === 'pronto' && m.n === nonce;
}

/** Valor aleatório que só a página de execução carregada por nós conhece (vai no fragmento da URL dela). */
function makeNonce(): string {
  // crypto.getRandomValues existe também fora de contexto seguro (http:// numa rede local), ao contrário de randomUUID
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
}

export class Sandbox {
  private frame: HTMLIFrameElement | null = null;
  private port: Promise<MessagePort> | null = null;
  private seq = 0;
  private queue: Promise<unknown> = Promise.resolve();
  private current: { id: number; resolve: (v: unknown) => void; reject: (e: Error) => void } | null = null;
  private stopHandshake: (() => void) | null = null;
  /** livre para quem usa o sandbox (ex.: "o Python já iniciou neste iframe"); volta a false quando o iframe é destruído */
  prepared = false;
  /** o iframe atual já recebeu um pedido marcado como `untrusted` (ver request) */
  private tainted = false;

  private readonly label: string;

  constructor(label: string) {
    this.label = label;
  }

  /** Destrói o iframe (e com ele os workers). Pedidos em andamento falham. */
  destroy(reason: Error = new RunnerError('reiniciado')) {
    this.stopHandshake?.();
    this.stopHandshake = null;
    this.frame?.remove();
    this.frame = null;
    void this.port?.then((p) => p.close()).catch(() => {});
    this.port = null;
    this.prepared = false;
    this.tainted = false;
    const cur = this.current;
    this.current = null;
    cur?.reject(reason);
  }

  private connect(): Promise<MessagePort> {
    this.port ??= new Promise<MessagePort>((resolve, reject) => {
      const frame = document.createElement('iframe');
      // allow-scripts e nada mais: sem allow-same-origin a origem é opaca;
      // sem allow-popups, allow-top-navigation e allow-forms o iframe não abre janelas, não navega o site e não envia formulários.
      frame.setAttribute('sandbox', 'allow-scripts');
      frame.setAttribute('aria-hidden', 'true');
      frame.tabIndex = -1;
      frame.title = `Ambiente isolado de execução (${this.label})`;
      frame.className = 'runner-frame';
      const nonce = makeNonce();
      frame.src = `${BASE}/runner.html#${nonce}`;
      const onMessage = (e: MessageEvent) => {
        if (!frame.contentWindow || e.source !== frame.contentWindow || !isReady(e.data, nonce)) return;
        if ((e.data as { v?: unknown }).v !== PROTOCOL) {
          finish();
          this.destroy();
          reject(new RunnerError('O ambiente de execução foi atualizado. Recarregue a página.'));
          return;
        }
        const port = e.ports[0];
        if (!port) return;
        finish();
        // O canal vem com o "pronto" conferido. O site nunca manda nada para o contentWindow: a página
        // dentro do iframe pode ter sido trocada entre o "pronto" e uma resposta (ver o topo do arquivo).
        port.onmessage = (ev: MessageEvent) => this.onReply(ev.data);
        port.onmessageerror = () => this.onReply({ id: this.current?.id, ok: false, error: 'mensagem ilegível' });
        resolve(port);
      };
      const timer = setTimeout(() => {
        finish();
        this.destroy();
        reject(new RunnerError('A página de execução não respondeu. Verifique a conexão e tente de novo.'));
      }, HANDSHAKE_MS);
      const finish = () => {
        clearTimeout(timer);
        window.removeEventListener('message', onMessage);
        this.stopHandshake = null;
      };
      this.stopHandshake = () => {
        finish();
        reject(new RunnerError('reiniciado'));
      };
      window.addEventListener('message', onMessage);
      document.body.appendChild(frame);
      this.frame = frame;
    });
    return this.port;
  }

  private onReply(d: unknown) {
    const cur = this.current;
    if (!cur || typeof d !== 'object' || d === null) return;
    const r = d as Reply;
    if (r.id !== cur.id || typeof r.ok !== 'boolean') return;
    this.current = null;
    if (r.ok) cur.resolve(r.result);
    else cur.reject(new RunnerError(typeof r.error === 'string' && r.error ? r.error.slice(0, 500) : 'Falha no ambiente de execução'));
  }

  /**
   * Envia um pedido e espera a resposta (crua: quem chama confere o formato).
   * O tempo limite conta a partir do envio; ao estourar, destrói o iframe.
   *
   * `untrusted`: o código do pedido pode ter vindo de outra pessoa (o laboratório abre links
   * `#codigo=`) e pode deixar o ambiente do iframe alterado. Um pedido sem a marca nunca vai para
   * um iframe que já recebeu um pedido com ela: o iframe é destruído antes. A conferência é feita
   * aqui, na hora do envio, dentro da fila, para não depender da ordem em que as chamadas chegam
   * (um pedido do laboratório ainda na fila quando a pessoa já testa um exercício).
   */
  request(op: string, payload: Record<string, unknown>, timeoutMs: number, transfer: Transferable[] = [], opts: { untrusted?: boolean } = {}): Promise<unknown> {
    const run = async () => {
      if (!opts.untrusted && this.tainted) this.destroy();
      const port = await this.connect();
      if (opts.untrusted) this.tainted = true;
      const id = ++this.seq;
      return new Promise<unknown>((resolve, reject) => {
        const timer = setTimeout(() => {
          if (this.current?.id !== id) return;
          this.destroy(new TimeoutError());
        }, timeoutMs);
        this.current = {
          id,
          resolve: (v) => {
            clearTimeout(timer);
            resolve(v);
          },
          reject: (e) => {
            clearTimeout(timer);
            reject(e);
          },
        };
        port.postMessage({ ...payload, id, op }, transfer);
      });
    };
    const p = this.queue.then(run, run);
    this.queue = p.catch(() => {});
    return p;
  }
}

/**
 * Só no servidor de desenvolvimento do Vite: lá o worker chega como módulo com imports separados
 * (`import { x } from "/src/..."`, como o de output-limit.ts no js.worker.ts), que não resolvem numa
 * URL data:. Cada import desses é trocado pelo código do módulo, embrulhado numa função que devolve
 * o que ele exporta. Cobre módulos simples (`export const|let|var|function|class`), que é o que os
 * workers importam; no build o Vite já embute tudo no arquivo do worker.
 */
async function inlineDevImports(code: string, seen: ReadonlySet<string> = new Set()): Promise<string> {
  const re = /import\s*\{([^}]*)\}\s*from\s*["'](\/src\/[^"']+)["'];?/g;
  let out = '';
  let last = 0;
  for (let m = re.exec(code); m; m = re.exec(code)) {
    const specs = m[1]!;
    const path = m[2]!;
    out += code.slice(last, m.index);
    last = m.index + m[0].length;
    if (seen.has(path)) throw new RunnerError(`Import circular no código do worker: ${path}`);
    const res = await fetch(path);
    if (!res.ok) throw new RunnerError(`Não foi possível baixar ${path} (HTTP ${res.status}).`);
    let body = await inlineDevImports(await res.text(), new Set([...seen, path]));
    body = body.replace(/^\/\/# sourceMappingURL=.*$/m, '');
    const names: string[] = [];
    body = body.replace(/\bexport\s+(async\s+)?(const|let|var|function\*?|class)\s+([A-Za-z_$][\w$]*)/g, (_s, async: string | undefined, kind: string, name: string) => {
      names.push(name);
      return `${async ?? ''}${kind} ${name}`;
    });
    const binding = specs
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.replace(/\s+as\s+/, ': '))
      .join(', ');
    out += `const { ${binding} } = (() => {\n${body}\nreturn { ${names.join(', ')} };\n})();\n`;
  }
  return out + code.slice(last);
}

const texts = new Map<string, Promise<string>>();
/** Baixa um texto do próprio site (código dos workers, harness), uma vez por carregamento da página. */
export function siteText(url: string): Promise<string> {
  let p = texts.get(url);
  if (!p) {
    p = fetch(url).then(async (r) => {
      if (!r.ok) throw new RunnerError(`Não foi possível baixar ${url.split('/').pop()?.split('?')[0]} (HTTP ${r.status}).`);
      let code = await r.text();
      // No servidor de desenvolvimento do Vite, o worker chega com imports do cliente do Vite, que não
      // resolvem dentro de um worker data:. O código dos workers não usa import.meta.env, e o
      // injectQuery só mexe em caminhos do site (os imports dos workers são de URLs blob:).
      if (import.meta.env.DEV) {
        code = code
          .replace(/import\s*\{\s*injectQuery as __vite__injectQuery\s*\}\s*from\s*["']\/@vite\/client["'];?/, 'const __vite__injectQuery = (u) => u;')
          .replace(/import\s*["'][^"']*(?:\/@vite\/env|\/vite\/dist\/client\/env\.mjs)["'];?/, '');
        code = await inlineDevImports(code);
      }
      // Numa URL data:, o caminho relativo do mapa de código-fonte não aponta para lugar nenhum.
      code = code.replace(/^\/\/# sourceMappingURL=.*$/m, '');
      return code;
    });
    p.catch(() => texts.delete(url));
    texts.set(url, p);
  }
  return p;
}
