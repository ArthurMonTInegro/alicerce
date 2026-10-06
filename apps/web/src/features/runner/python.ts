/**
 * Cliente do worker Python: fila de requisições, tempo limite e reinício.
 */
import type { RunResult, RunnerStatus, SqlResult } from './types.ts';

const TIMEOUT_MS = 8000;
const BOOT_TIMEOUT_MS = 90_000;

let worker: Worker | null = null;
let booted = false;
let seq = 0;
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
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

function spawn(): Worker {
  const w = new Worker(new URL('./python.worker.ts', import.meta.url), { type: 'module' });
  w.onmessage = (e: MessageEvent<{ id: number; ok: boolean; result?: unknown; error?: string }>) => {
    const p = pending.get(e.data.id);
    if (!p) return;
    pending.delete(e.data.id);
    if (e.data.ok) p.resolve(e.data.result);
    else p.reject(new Error(e.data.error ?? 'Falha no Python'));
  };
  w.onerror = (e) => {
    for (const [, p] of pending) p.reject(new Error(e.message || 'Falha ao iniciar o Python'));
    pending.clear();
  };
  return w;
}

function restart() {
  worker?.terminate();
  worker = null;
  booted = false;
  for (const [, p] of pending) p.reject(new Error('reiniciado'));
  pending.clear();
  setStatus('parado');
}

function request<T>(msg: object, timeout: number): Promise<T> {
  worker ??= spawn();
  const id = ++seq;
  const w = worker;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      if (!pending.has(id)) return;
      pending.delete(id);
      if (worker === w) restart();
      reject(new TimeoutError());
    }, timeout);
    pending.set(id, {
      resolve: (v) => {
        clearTimeout(timer);
        resolve(v as T);
      },
      reject: (e) => {
        clearTimeout(timer);
        reject(e);
      },
    });
    w.postMessage({ id, ...msg });
  });
}

export class TimeoutError extends Error {
  constructor() {
    super('Tempo limite excedido');
  }
}

/** Baixa e inicia o Python (cerca de 10 MB na primeira vez; depois vem do cache). */
export async function warmPython(): Promise<void> {
  if (booted) return;
  setStatus('carregando');
  try {
    await request({ type: 'init' }, BOOT_TIMEOUT_MS);
    booted = true;
    setStatus('pronto');
  } catch (e) {
    setStatus('parado');
    throw e;
  }
}

export async function runPython(code: string, opts: { tests?: Array<{ name: string; code: string }>; stdin?: string; trace?: boolean } = {}): Promise<RunResult> {
  await warmPython();
  setStatus('executando');
  try {
    return await request<RunResult>({ type: 'run', code, tests: JSON.stringify(opts.tests ?? []), stdin: opts.stdin ?? '', trace: !!opts.trace }, TIMEOUT_MS);
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
    if (booted) setStatus('pronto');
  }
}

export async function runSql(setup: string, query: string, solution: string, ordered: boolean): Promise<SqlResult> {
  await warmPython();
  setStatus('executando');
  try {
    return await request<SqlResult>({ type: 'sql', setup, query, solution, ordered }, TIMEOUT_MS);
  } catch (e) {
    if (e instanceof TimeoutError) {
      return { ok: false, columns: [], rows: [], expectedColumns: [], expectedRows: [], error: 'Timeout', message: 'A consulta demorou demais.' };
    }
    throw e;
  } finally {
    if (booted) setStatus('pronto');
  }
}
