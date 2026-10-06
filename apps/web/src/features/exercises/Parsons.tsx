import { useState, type DragEvent } from 'react';
import type { ParsonsExercise } from '@alicerce/content';
import { CodeView } from '../../lib/markdown.tsx';
import { ExerciseShell } from './Shell.tsx';
import { seededShuffle, useExercise } from './useExercise.ts';

/**
 * Problema de Parsons: as linhas certas, fora de ordem. Treina leitura de
 * código e estrutura sem a barreira de digitar. Funciona por teclado (botões
 * em cada linha) e por arrastar e soltar.
 */
export function Parsons({ ex, lessonId }: { ex: ParsonsExercise; lessonId?: string | undefined }) {
  const st = useExercise(ex);
  const [pool, setPool] = useState<number[]>(() => seededShuffle(ex.lines.map((_, i) => i), ex.id));
  const [answer, setAnswer] = useState<number[]>([]);
  const [wrongAt, setWrongAt] = useState<number | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [announce, setAnnounce] = useState('');
  const done = st.solved || st.revealed;

  const add = (i: number) => {
    setPool((p) => p.filter((x) => x !== i));
    setAnswer((a) => [...a, i]);
    setWrongAt(null);
    setAnnounce(`Linha adicionada na posição ${answer.length + 1}.`);
  };
  const remove = (i: number) => {
    setAnswer((a) => a.filter((x) => x !== i));
    setPool((p) => [...p, i]);
    setWrongAt(null);
  };
  const move = (from: number, to: number) => {
    if (to < 0 || to >= answer.length) return;
    setAnswer((a) => {
      const b = [...a];
      const [x] = b.splice(from, 1);
      b.splice(to, 0, x!);
      return b;
    });
    setWrongAt(null);
    setAnnounce(`Linha movida para a posição ${to + 1}.`);
  };
  const verify = () => {
    const texts = answer.map((i) => ex.lines[i]);
    const firstWrong = ex.lines.findIndex((l, k) => texts[k] !== l);
    const ok = answer.length === ex.lines.length && firstWrong === -1;
    setWrongAt(ok ? null : firstWrong === -1 ? answer.length : firstWrong);
    st.check(ok);
  };
  const onDrop = (e: DragEvent, to: number) => {
    e.preventDefault();
    if (drag === null) return;
    if (answer.includes(drag)) move(answer.indexOf(drag), to);
    else {
      setPool((p) => p.filter((x) => x !== drag));
      setAnswer((a) => {
        const b = [...a];
        b.splice(to, 0, drag);
        return b;
      });
    }
    setDrag(null);
  };

  return (
    <ExerciseShell
      ex={ex}
      st={st}
      lessonId={lessonId}
      actions={
        !done && (
          <button type="button" className="btn primary" onClick={verify} disabled={answer.length === 0}>
            Verificar
          </button>
        )
      }
      solution={
        <div className="code-block">
          <CodeView code={ex.lines.join('\n')} lang={ex.lang} />
        </div>
      }
      feedback={
        wrongAt !== null && !done ? (
          <div className="feedback err">
            <p>{answer.length < ex.lines.length && wrongAt >= answer.length ? `Faltam ${ex.lines.length - answer.length} linha(s).` : `A linha ${wrongAt + 1} da sua solução não está no lugar certo. As anteriores estão certas.`}</p>
          </div>
        ) : null
      }
    >
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
      {!done && (
        <div className="parsons">
          <div className="parsons-col">
            <h4>Linhas disponíveis</h4>
            <ul aria-label="Linhas disponíveis">
              {pool.map((i) => (
                <li key={i}>
                  <div className="p-line" draggable onDragStart={() => setDrag(i)}>
                    <code>{ex.lines[i]}</code>
                    <button type="button" onClick={() => add(i)} aria-label={`Adicionar a linha: ${ex.lines[i]!.trim()}`}>
                      +
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="parsons-col" onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, answer.length)}>
            <h4>Sua solução</h4>
            <ol aria-label="Sua solução">
              {answer.map((i, pos) => (
                <li key={i} onDragOver={(e) => e.preventDefault()} onDrop={(e) => (e.stopPropagation(), onDrop(e, pos))}>
                  <div className="p-line" draggable onDragStart={() => setDrag(i)} style={wrongAt === pos ? { outline: '2px solid var(--err)' } : undefined}>
                    <code>{ex.lines[i]}</code>
                    <button type="button" onClick={() => move(pos, pos - 1)} disabled={pos === 0} aria-label={`Mover para cima: ${ex.lines[i]!.trim()}`}>
                      ↑
                    </button>
                    <button type="button" onClick={() => move(pos, pos + 1)} disabled={pos === answer.length - 1} aria-label={`Mover para baixo: ${ex.lines[i]!.trim()}`}>
                      ↓
                    </button>
                    <button type="button" onClick={() => remove(i)} aria-label={`Remover: ${ex.lines[i]!.trim()}`}>
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ol>
            {answer.length === 0 && <p className="small muted">Adicione as linhas na ordem certa (botão + ou arrastando). A indentação já está nas linhas.</p>}
          </div>
        </div>
      )}
      {st.solved && (
        <div className="code-block">
          <CodeView code={ex.lines.join('\n')} lang={ex.lang} />
        </div>
      )}
    </ExerciseShell>
  );
}
