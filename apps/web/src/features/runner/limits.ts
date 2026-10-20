/**
 * Fronteira entre o site e a página de execução. Tudo o que volta do iframe é
 * entrada não confiável: o código do estudante roda lá dentro e pode mandar
 * qualquer coisa no lugar do resultado. Aqui se confere o formato e se corta o
 * tamanho antes que algo chegue ao React; uma saída gigante não trava a aba.
 *
 * Isto não dá integridade à correção: o código do estudante consegue forjar um
 * resultado "passou" com o formato certo (ver docs/SEGURANCA.md).
 */
import { MAX_OUTPUT_CHARS } from './output-limit.ts';
import type { JsResult, PyError, PyFrame, RunResult, SqlResult, TraceStep } from './types.ts';

/**
 * Teto de cada texto de saída: stdout, mensagem e traceback de erro, mensagem de teste e a saída guardada em cada passo.
 * É o mesmo limite de dentro dos workers (output-limit.ts e harness.py), que o código do estudante consegue contornar.
 */
export { MAX_OUTPUT_CHARS };
/** Teto do passo a passo inteiro (soma dos textos de todos os passos). Um passo a passo normal de 400 passos fica bem abaixo. */
export const MAX_TRACE_CHARS = 16 * MAX_OUTPUT_CHARS;
export const MAX_TRACE_STEPS = 1_000;
export const MAX_SQL_ROWS = 1_000;
/**
 * Teto das duas tabelas do SQL juntas (resultado e esperado), em caracteres e em células. Sem ele,
 * 200 linhas x 200 colunas de 1.000 caracteres (cada uma abaixo dos tetos acima) deixavam uma tarefa
 * de 17 s na página do site ao desenhar a tabela (medido no Chromium).
 */
export const MAX_SQL_CHARS = 16 * MAX_OUTPUT_CHARS;
export const MAX_SQL_CELLS = 20_000;
/** nomes, tipos, repr de variável e células de tabela */
const MAX_SMALL = 1_000;
const MAX_LIST = 1_000;

const milhar = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
export const CUT_NOTICE = `\n… [saída cortada: passou de ${milhar(MAX_OUTPUT_CHARS)} caracteres]`;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Corta textos e lembra se cortou algum. */
class Cutter {
  cut = false;
  /** null quando não é texto */
  text(v: unknown, max = MAX_OUTPUT_CHARS, notice = CUT_NOTICE): string | null {
    if (typeof v !== 'string') return null;
    if (v.length <= max) return v;
    this.cut = true;
    return v.slice(0, max) + notice;
  }
  small(v: unknown): string | null {
    return this.text(v, MAX_SMALL, '…');
  }
  list(v: unknown[], max = MAX_LIST): unknown[] {
    if (v.length <= max) return v;
    this.cut = true;
    return v.slice(0, max);
  }
}

function frame(v: unknown, c: Cutter): PyFrame | null {
  if (!isObj(v)) return null;
  const file = c.small(v.file);
  const func = c.small(v.func);
  const code = c.small(v.code ?? '');
  const line = num(v.line);
  if (file === null || func === null || code === null || line === null) return null;
  return { file, line, func, code };
}

function pyError(v: unknown, c: Cutter): PyError | null {
  if (!isObj(v)) return null;
  const type = c.small(v.type);
  const message = c.text(v.message);
  const traceback = c.text(v.traceback ?? '');
  if (type === null || message === null || traceback === null) return null;
  const frames: PyFrame[] = [];
  if (v.frames !== undefined) {
    if (!Array.isArray(v.frames)) return null;
    for (const f of c.list(v.frames, 200)) {
      const ok = frame(f, c);
      if (!ok) return null;
      frames.push(ok);
    }
  }
  const out: PyError = { type, message, line: num(v.line), frames, traceback };
  const offset = num(v.offset);
  if (offset !== null) out.offset = offset;
  if (typeof v.code === 'string') out.code = c.text(v.code)!;
  return out;
}

/** Variáveis de um quadro, num objeto sem protótipo (nome de variável nunca vira __proto__). */
function vars(v: unknown, c: Cutter): { vars: Record<string, { repr: string; type: string }>; size: number } | null {
  if (!isObj(v)) return null;
  const out = Object.create(null) as Record<string, { repr: string; type: string }>;
  let size = 0;
  for (const [name, val] of c.list(Object.entries(v), 500) as Array<[string, unknown]>) {
    if (name.startsWith('__') || !isObj(val)) continue;
    const repr = c.small(val.repr);
    const type = c.small(val.type);
    if (repr === null || type === null) return null;
    out[name.slice(0, 200)] = { repr, type };
    size += name.length + repr.length + type.length;
  }
  return { vars: out, size };
}

function step(v: unknown, c: Cutter): { step: TraceStep; size: number } | null {
  if (!isObj(v) || (v.event !== 'line' && v.event !== 'return') || !Array.isArray(v.stack)) return null;
  const line = num(v.line);
  const stdout = c.text(v.stdout);
  if (line === null || stdout === null) return null;
  let size = stdout.length + 32;
  const stack: TraceStep['stack'] = [];
  for (const f of c.list(v.stack, 200)) {
    if (!isObj(f)) return null;
    const func = c.small(f.func);
    const vs = vars(f.vars, c);
    if (func === null || !vs) return null;
    stack.push({ func, vars: vs.vars });
    size += func.length + vs.size;
  }
  const out: TraceStep = { line, event: v.event, stack, stdout };
  if (v.returned !== undefined) {
    const returned = c.small(v.returned);
    if (returned === null) return null;
    out.returned = returned;
    size += returned.length;
  }
  return { step: out, size };
}

const PHASES = new Set(['compile', 'run', 'tests']);

/** Confere e limita o resultado de uma execução Python. null = formato inválido. */
export function limitRunResult(raw: unknown): RunResult | null {
  if (!isObj(raw) || typeof raw.ok !== 'boolean' || typeof raw.phase !== 'string' || !PHASES.has(raw.phase)) return null;
  if (!Array.isArray(raw.tests) || !Array.isArray(raw.steps)) return null;
  const c = new Cutter();
  const stdout = c.text(raw.stdout);
  if (stdout === null) return null;
  let error: PyError | null = null;
  if (raw.error !== null && raw.error !== undefined) {
    error = pyError(raw.error, c);
    if (!error) return null;
  }
  const tests: RunResult['tests'] = [];
  for (const t of c.list(raw.tests)) {
    if (!isObj(t) || typeof t.passed !== 'boolean') return null;
    const name = c.small(t.name);
    const message = c.text(t.message ?? '');
    if (name === null || message === null) return null;
    const entry: RunResult['tests'][number] = { name, passed: t.passed, message };
    if (t.error !== undefined && t.error !== null) {
      const e = pyError(t.error, c);
      if (!e) return null;
      entry.error = e;
    }
    tests.push(entry);
  }
  const steps: TraceStep[] = [];
  let traceCut = raw.steps.length > MAX_TRACE_STEPS;
  let budget = MAX_TRACE_CHARS;
  for (const s of raw.steps.slice(0, MAX_TRACE_STEPS)) {
    const ok = step(s, c);
    if (!ok) return null;
    if (ok.size > budget) {
      traceCut = true;
      break;
    }
    budget -= ok.size;
    steps.push(ok.step);
  }
  const out: RunResult = { ok: raw.ok, phase: raw.phase as RunResult['phase'], stdout, error, tests, steps };
  if (c.cut) out.truncated = true;
  if (traceCut) out.traceTruncated = true;
  return out;
}

function cell(v: unknown, c: Cutter): unknown {
  if (v === null || typeof v === 'number' || typeof v === 'boolean') return v;
  return c.small(typeof v === 'string' ? v : String(v));
}

type Budget = { chars: number; cells: number };

/** Linhas inteiras enquanto couberem no orçamento (compartilhado entre o resultado e o esperado). */
function table(v: unknown, c: Cutter, budget: Budget): unknown[][] | null {
  if (!Array.isArray(v)) return null;
  const rows: unknown[][] = [];
  for (const r of c.list(v, MAX_SQL_ROWS)) {
    if (!Array.isArray(r)) return null;
    const row = c.list(r, 200).map((x) => cell(x, c));
    const chars = row.reduce<number>((n, x) => n + (typeof x === 'string' ? x.length : 8), 0);
    if (chars > budget.chars || row.length > budget.cells) {
      c.cut = true;
      break;
    }
    budget.chars -= chars;
    budget.cells -= row.length;
    rows.push(row);
  }
  return rows;
}

function names(v: unknown, c: Cutter): string[] | null {
  if (!Array.isArray(v)) return null;
  const out: string[] = [];
  for (const n of c.list(v, 200)) {
    const s = c.small(n);
    if (s === null) return null;
    out.push(s);
  }
  return out;
}

/**
 * Confere e limita o resultado de uma consulta SQL. O harness manda o erro do
 * SQLite como { type, message }; a interface espera só a mensagem (texto).
 */
export function limitSqlResult(raw: unknown): SqlResult | null {
  if (!isObj(raw) || typeof raw.ok !== 'boolean') return null;
  const c = new Cutter();
  const columns = names(raw.columns, c);
  const expectedColumns = names(raw.expectedColumns, c);
  // metade para cada tabela, para o esperado nunca ficar sem espaço por causa do resultado do estudante
  const rows = table(raw.rows, c, { chars: MAX_SQL_CHARS / 2, cells: MAX_SQL_CELLS / 2 });
  const expectedRows = table(raw.expectedRows, c, { chars: MAX_SQL_CHARS / 2, cells: MAX_SQL_CELLS / 2 });
  const message = c.text(raw.message ?? '');
  if (!columns || !expectedColumns || !rows || !expectedRows || message === null) return null;
  let error: string | null = null;
  if (typeof raw.error === 'string') error = c.text(raw.error);
  else if (isObj(raw.error)) {
    error = c.text(raw.error.message);
    if (error === null) return null;
  } else if (raw.error !== null && raw.error !== undefined) return null;
  const out: SqlResult = { ok: raw.ok, columns, rows, expectedColumns, expectedRows, error, message };
  if (c.cut) out.truncated = true;
  return out;
}

/** Confere e limita o resultado de uma execução JavaScript. null = formato inválido. */
export function limitJsResult(raw: unknown): JsResult | null {
  if (!isObj(raw) || typeof raw.ok !== 'boolean') return null;
  const c = new Cutter();
  const stdout = c.text(raw.stdout);
  if (stdout === null) return null;
  let error: JsResult['error'] = null;
  if (raw.error !== null && raw.error !== undefined) {
    if (!isObj(raw.error)) return null;
    // o estudante pode lançar qualquer coisa (throw 42, throw {message: 1}): vira texto
    const type = c.small(String(raw.error.type ?? 'Error'));
    const message = c.text(String(raw.error.message ?? ''));
    error = { type: type!, message: message!, line: num(raw.error.line) };
  }
  const out: JsResult = { ok: raw.ok, stdout, error };
  if (c.cut) out.truncated = true;
  return out;
}
