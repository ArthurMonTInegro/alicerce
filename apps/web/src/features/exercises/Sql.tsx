import { useEffect, useState } from 'react';
import type { SqlExercise } from '../../content.ts';
import { CodeView } from '../../lib/markdown.tsx';
import { CodeEditor } from '../editor/CodeEditor.tsx';
import { runSql } from '../runner/python.ts';
import type { SqlResult } from '../runner/types.ts';
import { traduzir } from '../runner/errors.ts';
import { loadDraft, saveDraft } from '../../state/store.ts';
import { ExerciseShell } from './Shell.tsx';
import { useExercise } from './useExercise.ts';

function ResultTable({ cols, rows, caption }: { cols: string[]; rows: unknown[][]; caption: string }) {
  return (
    <div className="table-wrap">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 50).map((r, i) => (
            <tr key={i}>
              {r.map((v, j) => (
                <td key={j}>{v === null ? <span className="muted">NULL</span> : String(v)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Sql({ ex, lessonId }: { ex: SqlExercise; lessonId?: string | undefined }) {
  const st = useExercise(ex);
  const [q, setQ] = useState(ex.starter);
  const [res, setRes] = useState<SqlResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [showSchema, setShowSchema] = useState(false);
  const done = st.solved || st.revealed;
  useEffect(() => {
    const d = loadDraft(ex.id);
    if (d !== null) setQ(d);
  }, [ex.id]);
  const exec = async () => {
    setBusy(true);
    try {
      const r = await runSql(ex.setup, q, ex.solution, ex.ordered);
      setRes(r);
      if (!r.error) st.check(r.ok);
    } finally {
      setBusy(false);
    }
  };
  return (
    <ExerciseShell
      ex={ex}
      st={st}
      lessonId={lessonId}
      actions={
        <>
          <button type="button" className="btn primary" onClick={exec} disabled={busy}>
            {busy ? <span className="spinner" aria-hidden="true" /> : '▶'} Executar e verificar
          </button>
          <button type="button" className="btn small" onClick={() => setShowSchema((s) => !s)} aria-expanded={showSchema}>
            Ver tabelas
          </button>
        </>
      }
      solution={
        <div className="code-block">
          <CodeView code={ex.solution} lang="sql" />
        </div>
      }
      feedback={
        res && !done ? (
          <div className={`feedback ${res.ok ? 'ok' : 'err'}`}>
            <p>{res.error ? `Erro do SQLite: ${traduzir(res.error)}` : res.message}</p>
            {res.error && <p className="small muted" lang="en">Original: {res.error}</p>}
          </div>
        ) : null
      }
    >
      {showSchema && (
        <div className="code-block">
          <div className="code-head">
            <span>esquema e dados de exemplo</span>
          </div>
          <CodeView code={ex.setup.trim()} lang="sql" />
        </div>
      )}
      <CodeEditor
        value={q}
        onChange={(v) => {
          setQ(v);
          saveDraft(ex.id, v);
        }}
        lang="sql"
        label="Editor de consulta SQL"
        onRun={exec}
        rows={4}
      />
      {res && !res.error && (
        <div className="grid two" style={{ marginTop: '0.75rem' }}>
          <ResultTable cols={res.columns} rows={res.rows} caption={`Seu resultado: ${res.rows.length} linha(s)`} />
          {!res.ok && <ResultTable cols={res.expectedColumns} rows={res.expectedRows} caption={`Esperado: ${res.expectedRows.length} linha(s)`} />}
        </div>
      )}
    </ExerciseShell>
  );
}
