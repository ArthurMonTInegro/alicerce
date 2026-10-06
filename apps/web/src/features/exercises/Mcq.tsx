import { useState } from 'react';
import type { McqExercise } from '../../content.ts';
import { CodeView, inline } from '../../lib/markdown.tsx';
import { ExerciseShell } from './Shell.tsx';
import { seededShuffle, useExercise } from './useExercise.ts';

export function Mcq({ ex, lessonId }: { ex: McqExercise; lessonId?: string | undefined }) {
  const st = useExercise(ex);
  const [order] = useState(() => seededShuffle(ex.options.map((_, i) => i), ex.id));
  const [picked, setPicked] = useState<number | null>(null);
  const [checked, setChecked] = useState<number | null>(null);
  const done = st.solved || st.revealed;
  const letters = 'ABCDEFG';
  const verify = () => {
    if (picked === null) return;
    setChecked(picked);
    st.check(!!ex.options[picked]!.correct);
  };
  const fb = checked !== null ? ex.options[checked]! : null;
  return (
    <ExerciseShell
      ex={ex}
      st={st}
      lessonId={lessonId}
      actions={
        !done && (
          <button type="button" className="btn primary" onClick={verify} disabled={picked === null}>
            Verificar
          </button>
        )
      }
      solution={<p>Resposta correta: {inline(ex.options.find((o) => o.correct)!.text)}</p>}
      feedback={
        fb && !fb.correct && !done ? (
          <div className="feedback err">
            <p>
              <strong>Ainda não.</strong> {inline(fb.feedback)}
            </p>
          </div>
        ) : fb?.correct ? (
          <div className="feedback ok">
            <p>{inline(fb.feedback)}</p>
          </div>
        ) : null
      }
    >
      {ex.code && (
        <div className="code-block">
          <CodeView code={ex.code.code} lang={ex.code.lang} />
        </div>
      )}
      <ul className="options" role="radiogroup" aria-label="Opções">
        {order.map((i, pos) => {
          const o = ex.options[i]!;
          const cls = done && o.correct ? ' right' : checked === i && !o.correct ? ' wrong' : '';
          return (
            <li key={i}>
              <button
                type="button"
                role="radio"
                aria-checked={picked === i}
                tabIndex={picked === i || (picked === null && pos === 0) ? 0 : -1}
                className={`option${cls}`}
                disabled={done}
                onClick={() => setPicked(i)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    const next = order[(pos + (e.key === 'ArrowDown' ? 1 : order.length - 1)) % order.length]!;
                    setPicked(next);
                    (e.currentTarget.closest('ul')?.querySelectorAll('button')[order.indexOf(next)] as HTMLButtonElement | undefined)?.focus();
                  }
                }}
              >
                <span className="letter" aria-hidden="true">
                  {letters[pos]}
                </span>
                <span>{inline(o.text)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </ExerciseShell>
  );
}
