import type { JsResult } from './types.ts';
import { MAX_OUTPUT_CHARS } from './output-limit.ts';

/** Cada execução usa um worker novo: estado limpo e encerramento garantido. */
export function runJavaScript(code: string, timeout = 5000): Promise<JsResult> {
  return new Promise((resolve) => {
    const w = new Worker(new URL('./js.worker.ts', import.meta.url), { type: 'module' });
    const timer = setTimeout(() => {
      w.terminate();
      resolve({ ok: false, stdout: '', error: { type: 'Timeout', message: `o programa passou de ${timeout / 1000} segundos (laço infinito?)`, line: null } });
    }, timeout);
    w.onmessage = (e: MessageEvent<{ result: JsResult }>) => {
      if(!e.data?.result || typeof e.data.result.ok!=='boolean' || typeof e.data.result.stdout!=='string')return;
      clearTimeout(timer);
      w.terminate();
      resolve({...e.data.result,stdout:e.data.result.stdout.slice(0,MAX_OUTPUT_CHARS)});
    };
    w.onerror=()=>{clearTimeout(timer);w.terminate();resolve({ok:false,stdout:'',error:{type:'RunnerError',message:'Não foi possível executar. Tente novamente.',line:null}});};
    w.postMessage({ id: 1, code });
  });
}
