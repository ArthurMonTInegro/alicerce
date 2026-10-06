import type { JsResult } from './types.ts';

/** Cada execução usa um worker novo: estado limpo e encerramento garantido. */
export function runJavaScript(code: string, timeout = 5000): Promise<JsResult> {
  return new Promise((resolve) => {
    const w = new Worker(new URL('./js.worker.ts', import.meta.url), { type: 'module' });
    const timer = setTimeout(() => {
      w.terminate();
      resolve({ ok: false, stdout: '', error: { type: 'Timeout', message: `o programa passou de ${timeout / 1000} segundos (laço infinito?)`, line: null } });
    }, timeout);
    w.onmessage = (e: MessageEvent<{ result: JsResult }>) => {
      clearTimeout(timer);
      w.terminate();
      resolve(e.data.result);
    };
    w.postMessage({ id: 1, code });
  });
}
