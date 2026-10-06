/**
 * Execução das soluções de referência, usada por verify-solutions.ts (currículo
 * inteiro) e por check-lessons.ts (um arquivo de lições novo).
 * Usa o mesmo harness Python do navegador, rodando no CPython local.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import type { Exercise } from '../packages/content/src/index.ts';

const harness = readFileSync(new URL('../apps/web/src/features/runner/harness.py', import.meta.url), 'utf8');
const dir = mkdtempSync(join(tmpdir(), 'alicerce-'));
writeFileSync(join(dir, 'harness.py'), harness);

interface Result { ok: boolean; stdout: string; error: { type: string; message: string } | null; tests: Array<{ name: string; passed: boolean; message: string }> }

function run(code: string, tests: unknown[] = [], stdin = ''): Result {
  const payload = JSON.stringify({ code, tests: JSON.stringify(tests), stdin });
  const script = 'import sys, json; sys.path.insert(0, "."); import harness; p = json.loads(sys.stdin.read()); print(harness.run(p["code"], p["tests"], p["stdin"]))';
  try {
    const out = execFileSync('python3', ['-I', '-c', script], { cwd: dir, input: payload, timeout: 5_000, encoding: 'utf8' });
    return JSON.parse(out.trim().split('\n').at(-1)!);
  } catch {
    // tempo esgotado (loop infinito): conta como falha de execução
    return { ok: false, stdout: '', error: { type: 'Timeout', message: 'tempo esgotado' }, tests: [] };
  }
}

function runSql(setup: string, query: string, solution: string, ordered: boolean): { ok: boolean; message: string } {
  const payload = JSON.stringify({ setup, query, solution, ordered });
  const script = 'import sys, json; sys.path.insert(0, "."); import harness; p = json.loads(sys.stdin.read()); print(harness.run_sql(p["setup"], p["query"], p["solution"], p["ordered"]))';
  const out = execFileSync('python3', ['-I', '-c', script], { cwd: dir, input: payload, timeout: 5_000, encoding: 'utf8' });
  return JSON.parse(out.trim().split('\n').at(-1)!);
}

async function runJs(code: string): Promise<string> {
  const lines: string[] = [];
  const fmt = (v: unknown) => (typeof v === 'string' ? v : JSON.stringify(v));
  const context = vm.createContext({ console: { log: (...a: unknown[]) => lines.push(a.map(fmt).join(' ')) }, setTimeout, Promise });
  vm.runInContext(code, context, { timeout: 2000 });
  await new Promise((r) => setTimeout(r, 50));
  return lines.join('\n');
}

/**
 * Confere um exercício executável. Devolve null se o tipo não é executável;
 * senão, a lista de problemas (vazia = ok):
 *  - a solução de referência passa em todos os testes;
 *  - o código inicial (starter) FALHA em pelo menos um teste (senão o exercício não ensina nada);
 *  - "prever a saída" tem a resposta igual à saída real do código.
 */
export async function checkExercise(ex: Exercise): Promise<string[] | null> {
  const problems: string[] = [];
  if (ex.kind === 'code' || ex.kind === 'fix') {
    const sol = run(ex.solution, ex.tests, ex.stdin ?? '');
    if (!sol.ok) problems.push(`solução falhou: ${JSON.stringify(sol.error ?? sol.tests.filter((t) => !t.passed))}`);
    const st = run(ex.starter, ex.tests, ex.stdin ?? '');
    if (st.ok) problems.push('o código inicial já passa em todos os testes');
  } else if (ex.kind === 'sql') {
    const sol = runSql(ex.setup, ex.solution, ex.solution, ex.ordered);
    if (!sol.ok) problems.push(`solução SQL falhou: ${sol.message}`);
    const st = runSql(ex.setup, ex.starter, ex.solution, ex.ordered);
    if (st.ok) problems.push('a consulta inicial já está correta');
  } else if (ex.kind === 'predict' && ex.lang === 'javascript') {
    const outJs = await runJs(ex.code);
    if (outJs.trimEnd() !== ex.answer.trimEnd()) problems.push(`saída JS real ${JSON.stringify(outJs)} ≠ resposta ${JSON.stringify(ex.answer)}`);
  } else if (ex.kind === 'predict' && ex.lang === 'python') {
    const r = run(ex.code);
    if (r.stdout.trimEnd() !== ex.answer.trimEnd()) problems.push(`saída real ${JSON.stringify(r.stdout)} ≠ resposta ${JSON.stringify(ex.answer)}`);
  } else {
    return null;
  }
  return problems;
}
