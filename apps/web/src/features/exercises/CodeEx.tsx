import { useEffect, useState } from 'react';
import type { CodeExercise } from '../../content.ts';
import { CodeView } from '../../lib/markdown.tsx';
import { CodeEditor } from '../editor/CodeEditor.tsx';
import { ErrorBox } from '../runner/ErrorBox.tsx';
import { runPython } from '../runner/python.ts';
import type { RunResult } from '../runner/types.ts';
import { Tracer } from '../tracer/Tracer.tsx';
import { setTutorContext } from '../tutor/context.ts';
import { loadDraft, saveDraft } from '../../state/store.ts';
import { RunnerBadge } from '../runner/RunnerBadge.tsx';
import { ExerciseShell } from './Shell.tsx';
import { useExercise } from './useExercise.ts';

export function CodeEx({ ex, lessonId }: { ex: CodeExercise; lessonId?: string | undefined }) {
  const st = useExercise(ex);
  const [code, setCode] = useState(ex.starter);
  const [stdin, setStdin] = useState(ex.stdin ?? '');
  const [result, setResult] = useState<RunResult | null>(null);
  const [busy, setBusy] = useState<'run' | 'test' | null>(null);
  const [tracing, setTracing] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const done = st.solved || st.revealed;

  useEffect(() => {
    const d = loadDraft(ex.id);
    if (d !== null) setCode(d);
  }, [ex.id]);

  const change = (v: string) => {
    setCode(v);
    saveDraft(ex.id, v);
    setTracing(false);
  };

  const exec = async (withTests: boolean) => {
    setBusy(withTests ? 'test' : 'run');
    setFailure(null);
    try {
      const r = await runPython(code, { tests: withTests ? ex.tests : [], stdin });
      setResult(r);
      const err = r.error ?? r.tests.find((t) => !t.passed)?.error;
      setTutorContext({ lessonId, exerciseId: ex.id, code, error: err ? `${err.type}: ${err.message}` : r.tests.find((t) => !t.passed)?.message, hintsSeen: st.hintsShown });
      if (withTests) st.check(r.ok);
    } catch (e) {
      setFailure(`Não foi possível executar o Python neste navegador (${(e as Error).message}). Verifique a conexão e recarregue a página.`);
    } finally {
      setBusy(null);
    }
  };

  const passed = result?.tests.filter((t) => t.passed).length ?? 0;

  return (
    <ExerciseShell
      ex={ex}
      st={st}
      lessonId={lessonId}
      actions={
        <>
          <button type="button" className="btn" onClick={() => exec(false)} disabled={!!busy}>
            {busy === 'run' ? <span className="spinner" aria-hidden="true" /> : '▶'} Executar
          </button>
          {!done && (
            <button type="button" className="btn primary" onClick={() => exec(true)} disabled={!!busy}>
              {busy === 'test' ? <span className="spinner" aria-hidden="true" /> : '✓'} Testar
            </button>
          )}
          <button type="button" className="btn small" onClick={() => setTracing((t) => !t)} aria-expanded={tracing}>
            🔍 Passo a passo
          </button>
          <button
            type="button"
            className="btn small ghost"
            onClick={() => {
              if (window.confirm('Voltar ao código inicial? Suas alterações serão perdidas.')) change(ex.starter);
            }}
          >
            Recomeçar
          </button>
          <RunnerBadge />
        </>
      }
      solution={
        <>
          <p>Uma solução possível (há outras):</p>
          <div className="code-block">
            <CodeView code={ex.solution} lang="python" />
          </div>
        </>
      }
      feedback={failure ? <div className="feedback err">{failure}</div> : null}
    >
      <CodeEditor value={code} onChange={change} lang="python" label={`Editor do exercício: ${ex.kind === 'fix' ? 'corrija o código' : 'escreva o código'}`} onRun={() => exec(!done)} />
      {ex.stdin !== undefined && (
        <div className="field-group" style={{ marginTop: '0.6rem' }}>
          <label htmlFor={`stdin-${ex.id}`}>Entrada (stdin): uma linha por input()</label>
          <textarea id={`stdin-${ex.id}`} className="field" rows={2} value={stdin} onChange={(e) => setStdin(e.target.value)} style={{ fontFamily: 'var(--font-mono)' }} />
        </div>
      )}
      {result && (
        <div className="stack" style={{ ['--gap' as string]: '0.6rem', marginTop: '0.75rem' }}>
          <div>
            <p className="small muted" style={{ margin: '0 0 0.25rem' }}>
              Saída
            </p>
            <pre className="output">{result.stdout}</pre>
          </div>
          {result.error && <ErrorBox error={result.error} code={code} />}
          {result.tests.length > 0 && (
            <div>
              <p style={{ margin: 0 }}>
                <strong>
                  Testes: {passed} de {result.tests.length} passaram
                </strong>
              </p>
              <ul className="tests">
                {result.tests.map((t) => (
                  <li key={t.name}>
                    <span className={t.passed ? 'pass' : 'fail'} aria-hidden="true">
                      {t.passed ? '✓' : '✗'}
                    </span>
                    <span>
                      <span className="sr-only">{t.passed ? 'Passou: ' : 'Falhou: '}</span>
                      {t.name}
                      {!t.passed && t.message && <span className="muted"> — {t.message}</span>}
                    </span>
                  </li>
                ))}
              </ul>
              {result.tests.find((t) => !t.passed && t.error) && <ErrorBox error={result.tests.find((t) => !t.passed && t.error)!.error!} compact />}
            </div>
          )}
        </div>
      )}
      {tracing && (
        <div style={{ marginTop: '0.75rem' }}>
          <Tracer code={code} stdin={stdin} autoStart />
        </div>
      )}
    </ExerciseShell>
  );
}
