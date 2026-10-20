/**
 * Cliente do JavaScript. Cada execução usa um worker novo dentro da página de
 * execução isolada (sandbox.ts): estado limpo e encerramento garantido. O tempo
 * limite fica aqui; ao estourar, o iframe inteiro é destruído.
 */
import { limitJsResult } from './limits.ts';
import { Sandbox, siteText, TimeoutError } from './sandbox.ts';
import type { JsResult } from './types.ts';
import workerUrl from './js.worker.ts?worker&url';

const sandbox = new Sandbox('JavaScript');

/** Nunca rejeita: falhas do ambiente viram um resultado com erro. */
export async function runJavaScript(code: string, timeout = 5000): Promise<JsResult> {
  try {
    const workerCode = await siteText(workerUrl);
    const r = limitJsResult(await sandbox.request('js:run', { workerCode, code }, timeout));
    if (!r) return { ok: false, stdout: '', error: { type: 'Error', message: 'O ambiente de execução devolveu uma resposta em formato inesperado.', line: null } };
    return r;
  } catch (e) {
    if (e instanceof TimeoutError) {
      return { ok: false, stdout: '', error: { type: 'Timeout', message: `o programa passou de ${timeout / 1000} segundos (laço infinito?)`, line: null } };
    }
    return { ok: false, stdout: '', error: { type: 'Error', message: (e as Error).message, line: null } };
  }
}
