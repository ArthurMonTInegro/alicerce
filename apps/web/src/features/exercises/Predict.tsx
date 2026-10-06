import { useState } from 'react';
import type { PredictExercise } from '@alicerce/content';
import { CodeView } from '../../lib/markdown.tsx';
import { ExerciseShell } from './Shell.tsx';
import { normalizeOutput, useExercise } from './useExercise.ts';
import { runPython } from '../runner/python.ts';
import { runJavaScript } from '../runner/js.ts';

/** "Preveja a saída": o estudante simula o computador na cabeça antes de executar. */
export function Predict({ ex, lessonId }: { ex: PredictExercise; lessonId?: string | undefined }) {
  const st = useExercise(ex);
  const [guess, setGuess] = useState('');
  const [wrong, setWrong] = useState(false);
  const [real, setReal] = useState<string | null>(null);
  const done = st.solved || st.revealed;
  const verify = () => {
    const ok = normalizeOutput(guess) === normalizeOutput(ex.answer);
    setWrong(!ok);
    st.check(ok);
  };
  const runIt = async () => {
    if (ex.lang === 'python') {
      const r = await runPython(ex.code);
      setReal(r.stdout + (r.error ? `\n${r.error.type}: ${r.error.message}` : ''));
    } else {
      const r = await runJavaScript(ex.code);
      setReal(r.stdout + (r.error ? `\n${r.error.type}: ${r.error.message}` : ''));
    }
  };
  const id = `pred-${ex.id}`;
  return (
    <ExerciseShell
      ex={ex}
      st={st}
      lessonId={lessonId}
      actions={
        <>
          {!done && (
            <button type="button" className="btn primary" onClick={verify} disabled={!guess.trim()}>
              Verificar
            </button>
          )}
          {done && (
            <button type="button" className="btn" onClick={runIt}>
              ▶ Executar de verdade
            </button>
          )}
        </>
      }
      solution={
        <>
          <p>Saída esperada:</p>
          <pre className="output">{ex.answer}</pre>
        </>
      }
      feedback={
        wrong && !done ? (
          <div className="feedback err">
            <p>
              <strong>Não é essa a saída.</strong> Releia o código linha por linha, anotando o valor de cada variável. Cada print gera uma linha.
            </p>
          </div>
        ) : null
      }
    >
      <div className="code-block">
        <div className="code-head">
          <span>{ex.lang}</span>
        </div>
        <CodeView code={ex.code} lang={ex.lang} />
      </div>
      <div className="field-group">
        <label htmlFor={id}>O que aparece na tela? (uma linha por print)</label>
        <textarea id={id} className="field" rows={Math.max(2, ex.answer.split('\n').length)} value={guess} disabled={done} onChange={(e) => setGuess(e.target.value)} spellCheck={false} style={{ fontFamily: 'var(--font-mono)' }} />
      </div>
      {real !== null && (
        <>
          <p className="small muted">Saída real:</p>
          <pre className="output">{real}</pre>
        </>
      )}
    </ExerciseShell>
  );
}
