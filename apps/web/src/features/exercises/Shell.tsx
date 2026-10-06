import type { ReactNode } from 'react';
import type { Exercise } from '../../content.ts';
import { Markdown } from '../../lib/markdown.tsx';
import { openTutor, setTutorContext } from '../tutor/context.ts';
import { DIFF_LABEL, KIND_LABEL, type ExerciseState } from './useExercise.ts';

interface Props {
  ex: Exercise;
  st: ExerciseState;
  children: ReactNode;
  /** botões principais (Verificar, Executar...) */
  actions: ReactNode;
  /** o que mostrar quando o estudante pede a solução */
  solution: ReactNode;
  lessonId?: string | undefined;
  feedback?: ReactNode;
}

export function ExerciseShell({ ex, st, children, actions, solution, lessonId, feedback }: Props) {
  const done = st.solved || st.revealed;
  const headingId = `ex-${ex.id}`;
  return (
    <section className={`exercise${st.solved ? ' solved' : ''}`} aria-labelledby={headingId} id={ex.id}>
      <div className="exercise-head">
        <h3 id={headingId} className="exercise-kind" style={{ margin: 0 }}>
          {KIND_LABEL[ex.kind]}
        </h3>
        <div className="row" style={{ gap: '0.4rem' }}>
          <span className={`badge diff-${ex.difficulty}`}>{DIFF_LABEL[ex.difficulty]}</span>
          {st.solved ? <span className="badge ok">✓ Resolvido</span> : st.solvedBefore ? <span className="badge ok">Já resolvido antes</span> : null}
        </div>
      </div>
      <Markdown text={ex.prompt} />
      {children}
      <div className="exercise-actions">
        {actions}
        {!done && st.hintsShown < ex.hints.length && (
          <button type="button" className="btn small" onClick={st.showHint}>
            💡 Dica {st.hintsShown + 1} de {ex.hints.length}
          </button>
        )}
        {!done && (
          <button
            type="button"
            className="btn small ghost"
            onClick={() => {
              setTutorContext({ lessonId, exerciseId: ex.id, hintsSeen: st.hintsShown });
              openTutor();
            }}
          >
            Perguntar ao tutor
          </button>
        )}
        {!done && st.canReveal && (
          <button
            type="button"
            className="btn small ghost"
            onClick={() => {
              if (window.confirm('Ver a solução conta como "não resolvido" para o seu domínio da habilidade. Você ainda pode tentar de novo depois. Ver agora?')) st.reveal();
            }}
          >
            Ver solução
          </button>
        )}
      </div>
      <div aria-live="polite">
        {feedback}
        {st.hintsShown > 0 && !done && (
          <div className="hints">
            {ex.hints.slice(0, st.hintsShown).map((h, i) => (
              <div className="hint" key={i}>
                <strong>Dica {i + 1}:</strong> <Markdown text={h} />
              </div>
            ))}
          </div>
        )}
        {done && (
          <div className={`feedback ${st.solved ? 'ok' : 'info'}`}>
            <p>
              <strong>{st.solved ? (st.wrongTries === 0 && st.hintsShown === 0 ? 'Acertou de primeira!' : 'Resolvido!') : 'Solução'}</strong>
            </p>
            {st.revealed && solution}
            <Markdown text={ex.explanation} />
            {st.revealed && (
              <p className="small muted">
                Este exercício volta na sua revisão. Tente de novo daqui a pouco, sem olhar.{' '}
                <button type="button" className="btn small" onClick={st.retry}>
                  Tentar de novo agora
                </button>
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
