import { useState, type ReactNode } from 'react';
import type { FillExercise } from '../../content.ts';
import { ExerciseShell } from './Shell.tsx';
import { useExercise } from './useExercise.ts';

const norm = (s: string) => s.trim().replace(/\s+/g, ' ');

export function Fill({ ex, lessonId }: { ex: FillExercise; lessonId?: string | undefined }) {
  const st = useExercise(ex);
  const [values, setValues] = useState<string[]>(() => ex.blanks.map(() => ''));
  const [marks, setMarks] = useState<Array<boolean | null>>(() => ex.blanks.map(() => null));
  const done = st.solved || st.revealed;
  const parts = ex.template.split('___');
  const verify = () => {
    const m = ex.blanks.map((accepted, i) => accepted.some((a) => norm(a) === norm(values[i] ?? '')));
    setMarks(m);
    st.check(m.every(Boolean));
  };
  const nodes: ReactNode[] = [];
  parts.forEach((p, i) => {
    nodes.push(<span key={`t${i}`}>{p}</span>);
    if (i < ex.blanks.length) {
      const v = st.revealed ? ex.blanks[i]![0]! : values[i]!;
      nodes.push(
        <input
          key={`b${i}`}
          aria-label={`Lacuna ${i + 1} de ${ex.blanks.length}`}
          value={v}
          size={Math.max(4, (ex.blanks[i]![0] ?? '').length + 1)}
          disabled={done}
          spellCheck={false}
          autoCapitalize="off"
          className={marks[i] === true ? 'right' : marks[i] === false ? 'wrong' : ''}
          aria-invalid={marks[i] === false || undefined}
          onChange={(e) => setValues((vs) => vs.map((x, j) => (j === i ? e.target.value : x)))}
          onKeyDown={(e) => e.key === 'Enter' && verify()}
        />,
      );
    }
  });
  return (
    <ExerciseShell
      ex={ex}
      st={st}
      lessonId={lessonId}
      actions={
        !done && (
          <button type="button" className="btn primary" onClick={verify}>
            Verificar
          </button>
        )
      }
      solution={<p>As lacunas foram preenchidas com a resposta esperada.</p>}
      feedback={
        marks.some((m) => m === false) && !done ? (
          <div className="feedback err">
            <p>
              {marks.filter((m) => m === false).length} lacuna(s) ainda não estão certas (marcadas em vermelho).
            </p>
          </div>
        ) : null
      }
    >
      <div className="fill-code">{nodes}</div>
    </ExerciseShell>
  );
}
