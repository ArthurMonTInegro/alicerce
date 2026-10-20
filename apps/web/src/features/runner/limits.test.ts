import { describe, expect, it } from 'vitest';
import { CUT_NOTICE, limitJsResult, limitRunResult, limitSqlResult, MAX_OUTPUT_CHARS, MAX_SQL_CELLS, MAX_SQL_CHARS, MAX_SQL_ROWS, MAX_TRACE_STEPS } from './limits.ts';

const run = (over: Record<string, unknown> = {}) => ({ ok: true, phase: 'run', stdout: 'oi\n', error: null, tests: [], steps: [], ...over });
const step = (stdout = '', vars: Record<string, unknown> = { x: { repr: '1', type: 'int' } }) => ({ line: 1, event: 'line', stack: [{ func: 'global', vars }], stdout });

describe('limites na fronteira com a página de execução', () => {
  it('resultado normal passa igual, sem aviso de corte', () => {
    const raw = run({
      phase: 'tests',
      tests: [{ name: 't', passed: false, message: 'falhou', error: { type: 'AssertionError', message: '', line: 2, frames: [{ file: 'teste.py', line: 2, func: '<module>', code: 'assert x' }], traceback: 'tb' } }],
      steps: [step('oi\n'), { ...step('oi\n'), event: 'return', returned: '3' }],
    });
    expect(limitRunResult(raw)).toEqual(raw);
  });

  it('corta stdout de 1 milhão de caracteres e avisa', () => {
    const r = limitRunResult(run({ stdout: 'x'.repeat(1_000_000) }))!;
    expect(r.stdout.length).toBe(MAX_OUTPUT_CHARS + CUT_NOTICE.length);
    expect(r.stdout.endsWith(CUT_NOTICE)).toBe(true);
    expect(CUT_NOTICE).toContain('65.536');
    expect(r.truncated).toBe(true);
  });

  it('corta mensagem e traceback de erro gigantes', () => {
    const big = 'e'.repeat(200_000);
    const r = limitRunResult(run({ ok: false, error: { type: 'ValueError', message: big, line: 1, frames: [], traceback: big } }))!;
    expect(r.error!.message.length).toBeLessThan(MAX_OUTPUT_CHARS + 100);
    expect(r.error!.traceback.length).toBeLessThan(MAX_OUTPUT_CHARS + 100);
    expect(r.truncated).toBe(true);
  });

  it('passo a passo: corta a saída de cada passo, o número de passos e o total', () => {
    const many = limitRunResult(run({ steps: Array.from({ length: MAX_TRACE_STEPS + 50 }, () => step()) }))!;
    expect(many.steps.length).toBe(MAX_TRACE_STEPS);
    expect(many.traceTruncated).toBe(true);

    const fat = limitRunResult(run({ steps: Array.from({ length: 400 }, () => step('y'.repeat(200_000))) }))!;
    expect(fat.steps[0]!.stdout.length).toBe(MAX_OUTPUT_CHARS + CUT_NOTICE.length);
    expect(fat.steps.length).toBeLessThan(400);
    expect(fat.traceTruncated).toBe(true);
    expect(fat.truncated).toBe(true);

    // um passo a passo comum (400 passos, algumas variáveis) não é cortado
    const vars = { i: { repr: '399', type: 'int' }, total: { repr: '79800', type: 'int' }, nomes: { repr: "['ana', 'bia', 'caio']", type: 'list' } };
    const normal = limitRunResult(run({ steps: Array.from({ length: 400 }, (_, i) => step('linha\n'.repeat(i % 20), vars)) }))!;
    expect(normal.steps.length).toBe(400);
    expect(normal.traceTruncated).toBeUndefined();
  });

  it('nome de variável não polui protótipo', () => {
    const vars = JSON.parse('{"__proto__": {"repr": "1", "type": "int"}, "constructor": {"repr": "2", "type": "int"}, "ok": {"repr": "3", "type": "int"}}');
    const r = limitRunResult(run({ steps: [step('', vars)] }))!;
    const v = r.steps[0]!.stack[0]!.vars;
    expect(Object.getPrototypeOf(v)).toBeNull();
    expect(Object.keys(v).sort()).toEqual(['constructor', 'ok']);
    expect(({} as Record<string, unknown>).repr).toBeUndefined();
  });

  it('formato inesperado é recusado', () => {
    for (const bad of [
      null,
      'texto',
      [],
      run({ ok: 'sim' }),
      run({ phase: 'outra' }),
      run({ stdout: 42 }),
      run({ tests: 'x' }),
      run({ tests: [{ name: 't', passed: 'sim', message: '' }] }),
      run({ error: 'erro' }),
      run({ error: { type: 1, message: 'm' } }),
      run({ steps: [{ ...step(), event: 'call' }] }),
      run({ steps: [{ ...step(), stack: 'x' }] }),
      run({ steps: [{ ...step(), line: 'um' }] }),
    ]) {
      expect(limitRunResult(bad)).toBeNull();
    }
  });

  it('SQL: erro do SQLite vira texto, linhas e células grandes são cortadas', () => {
    const base = { ok: false, columns: ['a'], rows: [[1]], expectedColumns: ['a'], expectedRows: [[1]], message: '' };
    expect(limitSqlResult({ ...base, error: { type: 'OperationalError', message: 'no such table: x' } })!.error).toBe('no such table: x');
    expect(limitSqlResult({ ...base, error: null })!.error).toBeNull();
    const big = limitSqlResult({ ...base, error: null, rows: Array.from({ length: 5000 }, (_, i) => [i, 'z'.repeat(5000), null]) })!;
    expect(big.rows.length).toBeLessThan(MAX_SQL_ROWS);
    expect(String(big.rows[0]![1]).length).toBeLessThan(1100);
    expect(big.rows[0]![2]).toBeNull();
    expect(big.truncated).toBe(true);
    // muitas linhas pequenas: vale o teto de linhas
    const linhas = limitSqlResult({ ...base, error: null, rows: Array.from({ length: 5000 }, (_, i) => [i]) })!;
    expect(linhas.rows.length).toBe(MAX_SQL_ROWS);
    expect(linhas.truncated).toBe(true);
    expect(limitSqlResult({ ...base, rows: 'x' })).toBeNull();
    expect(limitSqlResult({ ...base, error: 7 })).toBeNull();
    expect(limitSqlResult({ ...base, ok: 1 })).toBeNull();
  });

  it('SQL: as duas tabelas juntas têm teto de caracteres e de células, com linhas inteiras', () => {
    const base = { ok: false, columns: ['a'], expectedColumns: ['a'], message: '', error: null };
    const somar = (rows: unknown[][]) => rows.flat().reduce<number>((n, x) => n + (typeof x === 'string' ? x.length : 8), 0);
    // 200 x 200 células de 1.000 caracteres: 40 milhões de caracteres
    const largas = Array.from({ length: 200 }, () => Array.from({ length: 200 }, () => 'x'.repeat(1000)));
    const r = limitSqlResult({ ...base, rows: largas, expectedRows: largas })!;
    expect(r.truncated).toBe(true);
    expect(somar(r.rows) + somar(r.expectedRows)).toBeLessThanOrEqual(MAX_SQL_CHARS);
    expect(r.rows.length).toBeGreaterThan(0);
    expect(r.expectedRows.length).toBe(r.rows.length);
    for (const row of r.rows) expect(row).toHaveLength(200);
    // 1.000 x 200 células curtas: 200 mil células
    const muitas = Array.from({ length: 1000 }, (_, i) => Array.from({ length: 200 }, () => i));
    const m = limitSqlResult({ ...base, rows: muitas, expectedRows: [[1]] })!;
    expect(m.rows.length * 200).toBeLessThanOrEqual(MAX_SQL_CELLS / 2);
    expect(m.expectedRows).toEqual([[1]]);
    expect(m.truncated).toBe(true);
  });

  it('JavaScript: corta a saída e transforma em texto o que o estudante lançar', () => {
    const r = limitJsResult({ ok: true, stdout: 'a'.repeat(MAX_OUTPUT_CHARS * 3), error: null })!;
    expect(r.stdout.length).toBe(MAX_OUTPUT_CHARS + CUT_NOTICE.length);
    expect(r.truncated).toBe(true);
    expect(limitJsResult({ ok: false, stdout: '', error: { type: undefined, message: 42, line: 3 } })).toEqual({ ok: false, stdout: '', error: { type: 'Error', message: '42', line: 3 } });
    expect(limitJsResult({ ok: true, stdout: 'x', error: null })).toEqual({ ok: true, stdout: 'x', error: null });
    expect(limitJsResult({ ok: true })).toBeNull();
    expect(limitJsResult({ ok: true, stdout: 'x', error: 'boom' })).toBeNull();
  });
});
