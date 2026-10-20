/// <reference lib="webworker" />
/**
 * Worker que hospeda o Pyodide (CPython compilado para WebAssembly).
 * É criado pela página de execução (public/runner.html), num iframe com origem
 * opaca, a partir do texto deste arquivo. Não baixa nada: o site entrega os
 * arquivos do Pyodide (que ficam no cache HTTP do site) e o texto do harness.
 * Roda fora da thread principal: um laço infinito do estudante não trava a
 * página; o site destrói o iframe por tempo limite e cria outro.
 *
 * Não pode importar nada em tempo de execução: o código vira uma URL data:, que
 * não serve de base para resolver imports.
 */

interface PyodideLike {
  runPython(code: string): unknown;
  globals: { get(name: string): (...args: unknown[]) => string };
}
type Files = Record<string, ArrayBuffer>;

/** Depois de cada execução, cancela as tarefas asyncio que o estudante deixou pendentes (não vazam para a próxima). */
const CANCEL_TASKS = `
def _alicerce_cancelar_tarefas():
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        for t in asyncio.all_tasks(loop):
            t.cancel()
    except Exception:
        pass
`;

let py: Promise<PyodideLike> | null = null;
/** Mesmo texto de public/runner.js e de python.ts, que reinicia o Python ao recebê-lo. */
const NOT_STARTED = 'o Python não foi iniciado';

async function start(files: Files, indexURL: string, harness: string): Promise<PyodideLike> {
  const moduleUrl = (name: string) => {
    const buf = files[name];
    if (!buf) throw new Error(`arquivo do Pyodide ausente: ${name}`);
    return URL.createObjectURL(new Blob([buf], { type: 'text/javascript' }));
  };
  // Com um wasm corrompido ou incompleto, o Pyodide só avisa no console e nunca termina de
  // carregar (a inicialização ficaria pendurada até o tempo limite do site): falha logo.
  const wasm = files['pyodide.asm.wasm'];
  if (!wasm || !WebAssembly.validate(wasm)) throw new Error('o arquivo pyodide.asm.wasm chegou corrompido ou incompleto');
  type Loader = { loadPyodide(o: object): Promise<PyodideLike> };
  const mod = (await import(/* @vite-ignore */ moduleUrl('pyodide.mjs'))) as Loader;
  const asm = (await import(/* @vite-ignore */ moduleUrl('pyodide.asm.mjs'))) as { default: unknown };
  // O Pyodide busca o wasm e a biblioteca padrão com fetch(indexURL + nome): durante a
  // inicialização, essas buscas são servidas a partir dos bytes recebidos do site.
  const realFetch = self.fetch;
  self.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    const name = url.startsWith(indexURL) ? url.slice(indexURL.length) : '';
    const buf = name ? files[name] : undefined;
    if (buf) return Promise.resolve(new Response(buf, { headers: { 'content-type': name.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream' } }));
    return realFetch(input, init);
  };
  try {
    const instance = await mod.loadPyodide({
      indexURL,
      packageBaseUrl: indexURL,
      // opção documentada (experimental) do Pyodide: evita o import() de pyodide.asm.mjs pela rede
      createPyodideModule: asm.default,
      lockFileContents: new TextDecoder().decode(files['pyodide-lock.json']),
    });
    instance.runPython(harness);
    instance.runPython(CANCEL_TASKS);
    return instance;
  } finally {
    self.fetch = realFetch;
  }
}

/** Uma falha de inicialização não fica guardada: a próxima tentativa começa do zero. */
function boot(files: Files, indexURL: string, harness: string): Promise<PyodideLike> {
  py ??= start(files, indexURL, harness).catch((err: unknown) => {
    py = null;
    throw err;
  });
  return py;
}

type Msg =
  | { id: number; op: 'python:boot'; files: Files; indexURL: string; harness: string }
  | { id: number; op: 'python:run'; code: string; tests: string; stdin: string; trace: boolean }
  | { id: number; op: 'python:sql'; setup: string; query: string; solution: string; ordered: boolean };

self.onmessage = async (e: MessageEvent<Msg>) => {
  const m = e.data;
  try {
    if (m.op === 'python:boot') {
      await boot(m.files, m.indexURL, m.harness);
      return self.postMessage({ id: m.id, ok: true });
    }
    if (!py) throw new Error(NOT_STARTED);
    const p = await py;
    if (m.op === 'python:run') {
      try {
        const json = p.globals.get('run')(m.code, m.tests, m.stdin, m.trace);
        return self.postMessage({ id: m.id, ok: true, result: JSON.parse(json) });
      } finally {
        p.globals.get('_alicerce_cancelar_tarefas')();
      }
    }
    const json = p.globals.get('run_sql')(m.setup, m.query, m.solution, m.ordered);
    self.postMessage({ id: m.id, ok: true, result: JSON.parse(json) });
  } catch (err) {
    self.postMessage({ id: m.id, ok: false, error: String((err as Error)?.message ?? err) });
  }
};
