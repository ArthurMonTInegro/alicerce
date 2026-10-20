/**
 * Cliente do Python (e do SQL, que roda no sqlite3 do Pyodide). A execução
 * acontece num worker dentro da página de execução isolada (sandbox.ts); aqui
 * ficam o tempo limite, o reinício e a conferência do resultado.
 *
 * O site baixa os arquivos do Pyodide e os entrega ao iframe. Assim eles ficam
 * no cache HTTP do site: o iframe tem origem opaca e, no Chromium, as
 * requisições dele não usam cache nenhum (medido; ver docs/SEGURANCA.md).
 */
import { BASE } from '../../lib/base.ts';
import { limitRunResult, limitSqlResult } from './limits.ts';
import { RunnerError, Sandbox, siteText, TimeoutError } from './sandbox.ts';
import type { RunResult, RunnerStatus, SqlResult } from './types.ts';
import workerUrl from './python.worker.ts?worker&url';
import harnessUrl from './harness.py?url';

export { TimeoutError };

const TIMEOUT_MS = 8000;
const BOOT_TIMEOUT_MS = 90_000;
const DOWNLOAD_TIMEOUT_MS = 5 * 60_000;
const PYODIDE_FILES = ['pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'];

const sandbox = new Sandbox('Python');
let booting: Promise<void> | null = null;
let status: RunnerStatus = 'parado';
const listeners = new Set<(s: RunnerStatus) => void>();

function setStatus(s: RunnerStatus) {
  status = s;
  for (const l of listeners) l(s);
}

export function onPythonStatus(cb: (s: RunnerStatus) => void) {
  listeners.add(cb);
  cb(status);
  return () => listeners.delete(cb);
}

async function downloadPyodide(): Promise<Record<string, ArrayBuffer>> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), DOWNLOAD_TIMEOUT_MS);
  try {
    const entries = await Promise.all(
      PYODIDE_FILES.map(async (name) => {
        let res: Response;
        try {
          res = await fetch(`${BASE}/pyodide/${name}`, { signal: ctl.signal });
        } catch (e) {
          throw new RunnerError(`Não foi possível baixar o Python (${name}: ${(e as Error).message}). Verifique a conexão e tente de novo.`);
        }
        if (!res.ok) throw new RunnerError(`Não foi possível baixar o Python (${name}: HTTP ${res.status}). Tente de novo.`);
        return [name, await res.arrayBuffer()] as const;
      }),
    );
    return Object.fromEntries(entries);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Baixa (ou pega do cache) e inicia o Python. Se falhar, o iframe é descartado
 * e a próxima chamada tenta tudo de novo: uma falha não deixa o Python inutilizável.
 */
export function warmPython(): Promise<void> {
  if (sandbox.prepared) return Promise.resolve();
  booting ??= (async () => {
    setStatus('carregando');
    try {
      const [files, workerCode, harness] = await Promise.all([downloadPyodide(), siteText(workerUrl), siteText(harnessUrl)]);
      const indexURL = new URL(`${BASE}/pyodide/`, window.location.href).href;
      try {
        await sandbox.request('python:boot', { workerCode, harness, files, indexURL }, BOOT_TIMEOUT_MS, Object.values(files));
      } catch (e) {
        if (e instanceof TimeoutError) throw e;
        throw new RunnerError(`Não foi possível iniciar o Python (${(e as Error).message}). Tente de novo.`);
      }
      sandbox.prepared = true;
      setStatus('pronto');
    } catch (e) {
      sandbox.destroy();
      setStatus('parado');
      throw e instanceof TimeoutError ? new RunnerError('O Python demorou demais para iniciar. Tente de novo.') : e;
    } finally {
      booting = null;
    }
  })();
  return booting;
}

const invalid = () => new RunnerError('O ambiente de execução devolveu uma resposta em formato inesperado.');

/** Resposta da página de execução quando o iframe é novo e o Python ainda não foi iniciado nele. */
const NOT_STARTED = 'o Python não foi iniciado';

/**
 * Envia um pedido ao Python. Qualquer falha que não seja o tempo limite (que já destrói o iframe)
 * descarta o iframe: o Python de lá pode ter caído (um callback do estudante que lança erro derruba
 * o worker entre uma execução e outra) e a próxima chamada começa do zero. Se o Python não estava
 * iniciado no iframe (caiu depois da última execução, o iframe foi recriado entre o warmPython e o
 * envio, ou foi descartado por ter rodado código de outra pessoa), inicia de novo e repete uma vez.
 *
 * O Python dura enquanto o iframe durar, e o código do estudante consegue deixá-lo alterado:
 * trocar a função que corrige (`__main__.run`), gravar módulos no sistema de arquivos virtual,
 * agendar callbacks. No laboratório entra código de qualquer pessoa (link `#codigo=`): esses
 * pedidos vão marcados (`untrusted`) e o sandbox nunca manda um pedido sem a marca (um exercício)
 * para um iframe que já rodou um com ela. Assim um link não muda a correção de um exercício feito
 * depois na mesma aba (e, com ela, o progresso).
 */
async function pyRequest(op: string, payload: Record<string, unknown>, untrusted: boolean): Promise<unknown> {
  for (let tentativa = 0; ; tentativa++) {
    await warmPython();
    try {
      return await sandbox.request(op, payload, TIMEOUT_MS, [], { untrusted });
    } catch (e) {
      if (e instanceof TimeoutError) throw e;
      sandbox.destroy();
      if (tentativa > 0 || !(e instanceof RunnerError) || e.message !== NOT_STARTED) throw e;
    }
  }
}

export interface PythonOptions {
  tests?: Array<{ name: string; code: string }>;
  stdin?: string;
  trace?: boolean;
  /** código que pode ter vindo de outra pessoa (o laboratório, que abre links #codigo=) */
  untrusted?: boolean;
}

export async function runPython(code: string, opts: PythonOptions = {}): Promise<RunResult> {
  await warmPython();
  setStatus('executando');
  try {
    const raw = await pyRequest('python:run', { code, tests: JSON.stringify(opts.tests ?? []), stdin: opts.stdin ?? '', trace: !!opts.trace }, !!opts.untrusted);
    const r = limitRunResult(raw);
    if (!r) {
      sandbox.destroy();
      throw invalid();
    }
    return r;
  } catch (e) {
    if (e instanceof TimeoutError) {
      return {
        ok: false,
        phase: 'run',
        stdout: '',
        tests: [],
        steps: [],
        error: { type: 'Timeout', message: `o programa passou de ${TIMEOUT_MS / 1000} segundos`, line: null, frames: [], traceback: '' },
      };
    }
    throw e;
  } finally {
    setStatus(sandbox.prepared ? 'pronto' : 'parado');
  }
}

export async function runSql(setup: string, query: string, solution: string, ordered: boolean, opts: { untrusted?: boolean } = {}): Promise<SqlResult> {
  // o SQL também conta: ATTACH DATABASE cria arquivos no sistema de arquivos virtual do Python
  await warmPython();
  setStatus('executando');
  try {
    const raw = await pyRequest('python:sql', { setup, query, solution, ordered }, !!opts.untrusted);
    const r = limitSqlResult(raw);
    if (!r) {
      sandbox.destroy();
      throw invalid();
    }
    return r;
  } catch (e) {
    if (e instanceof TimeoutError) {
      return { ok: false, columns: [], rows: [], expectedColumns: [], expectedRows: [], error: 'Timeout', message: 'A consulta demorou demais.' };
    }
    throw e;
  } finally {
    setStatus(sandbox.prepared ? 'pronto' : 'parado');
  }
}
