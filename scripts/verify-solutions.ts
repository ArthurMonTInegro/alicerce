/**
 * Verificação educacional automática dos exercícios:
 *  - toda solução de referência passa em todos os testes;
 *  - todo código inicial (starter) FALHA em pelo menos um teste (senão o exercício não ensina nada);
 *  - toda questão "prever a saída" tem a resposta igual à saída real do código.
 * Usa o mesmo harness Python do navegador, rodando no CPython local.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { exercises } from '../packages/content/src/index.ts';

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

let failures = 0;
let checked = 0;
const fail = (id: string, msg: string) => { failures++; console.error(`✘ ${id}: ${msg}`); };

for (const { exercise: ex } of exercises) {
  if (ex.kind === 'code' || ex.kind === 'fix') {
    checked++;
    const sol = run(ex.solution, ex.tests, ex.stdin ?? '');
    if (!sol.ok) fail(ex.id, `solução falhou: ${JSON.stringify(sol.error ?? sol.tests.filter((t) => !t.passed))}`);
    const st = run(ex.starter, ex.tests, ex.stdin ?? '');
    if (st.ok) fail(ex.id, 'o código inicial já passa em todos os testes');
  } else if (ex.kind === 'sql') {
    checked++;
    const sol = runSql(ex.setup, ex.solution, ex.solution, ex.ordered);
    if (!sol.ok) fail(ex.id, `solução SQL falhou: ${sol.message}`);
    const st = runSql(ex.setup, ex.starter, ex.solution, ex.ordered);
    if (st.ok) fail(ex.id, 'a consulta inicial já está correta');
  } else if (ex.kind === 'predict' && ex.lang === 'javascript') {
    checked++;
    const outJs = await runJs(ex.code);
    if (outJs.trimEnd() !== ex.answer.trimEnd()) fail(ex.id, `saída JS real ${JSON.stringify(outJs)} ≠ resposta ${JSON.stringify(ex.answer)}`);
  } else if (ex.kind === 'predict' && ex.lang === 'python') {
    checked++;
    const r = run(ex.code);
    if (r.stdout.trimEnd() !== ex.answer.trimEnd()) fail(ex.id, `saída real ${JSON.stringify(r.stdout)} ≠ resposta ${JSON.stringify(ex.answer)}`);
  }
}

console.log(`${checked} exercícios verificados, ${failures} problema(s).`);
process.exit(failures ? 1 : 0);
