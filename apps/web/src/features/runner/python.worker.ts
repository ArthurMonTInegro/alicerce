/// <reference lib="webworker" />
/**
 * Worker que hospeda o Pyodide (CPython compilado para WebAssembly).
 * Roda fora da thread principal: um laço infinito do estudante nunca trava a
 * página; o cliente encerra o worker por tempo limite e cria outro.
 * O Pyodide é servido pelo próprio site (/pyodide/), sem CDN de terceiros.
 */
import harness from './harness.py?raw';

interface PyodideLike {
  runPython(code: string): unknown;
  globals: { get(name: string): (...args: unknown[]) => string };
}

let py: Promise<PyodideLike> | null = null;

function boot(): Promise<PyodideLike> {
  py ??= (async () => {
    const base = new URL(`${import.meta.env.BASE_URL}pyodide/`, self.location.origin).href;
    const mod = (await import(/* @vite-ignore */ `${base}pyodide.mjs`)) as { loadPyodide(o: object): Promise<PyodideLike> };
    const instance = await mod.loadPyodide({ indexURL: base });
    instance.runPython(harness);
    return instance;
  })();
  return py;
}

type Msg =
  | { id: number; type: 'init' }
  | { id: number; type: 'run'; code: string; tests: string; stdin: string; trace: boolean }
  | { id: number; type: 'sql'; setup: string; query: string; solution: string; ordered: boolean };

self.onmessage = async (e: MessageEvent<Msg>) => {
  const m = e.data;
  try {
    const p = await boot();
    if (m.type === 'init') return self.postMessage({ id: m.id, ok: true });
    if (m.type === 'run') {
      const json = p.globals.get('run')(m.code, m.tests, m.stdin, m.trace);
      return self.postMessage({ id: m.id, ok: true, result: JSON.parse(json) });
    }
    const json = p.globals.get('run_sql')(m.setup, m.query, m.solution, m.ordered);
    self.postMessage({ id: m.id, ok: true, result: JSON.parse(json) });
  } catch (err) {
    self.postMessage({ id: m.id, ok: false, error: String((err as Error)?.message ?? err) });
  }
};
