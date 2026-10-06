import { useCallback, useRef, useState } from 'react';
import type { Exercise } from '../../content.ts';
import { recordAttempt, useDerived } from '../../state/store.ts';

/** Estado comum a todo exercício: dicas, tentativas, resolvido, revelado. */
export function useExercise(ex: Exercise) {
  const derived = useDerived();
  const [hintsShown, setHintsShown] = useState(0);
  const [wrongTries, setWrongTries] = useState(0);
  const [solved, setSolved] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const recorded = useRef(false);

  const check = useCallback(
    (correct: boolean) => {
      if (correct) {
        setSolved(true);
        if (!recorded.current) {
          recorded.current = true;
          recordAttempt(ex, { correct: true, hintsUsed: hintsShown, wrongTries, revealed });
        }
      } else {
        setWrongTries((n) => n + 1);
      }
    },
    [ex, hintsShown, wrongTries, revealed],
  );

  const showHint = useCallback(() => setHintsShown((n) => Math.min(ex.hints.length, n + 1)), [ex.hints.length]);

  const reveal = useCallback(() => {
    setRevealed(true);
    if (!recorded.current) {
      recorded.current = true;
      recordAttempt(ex, { correct: false, hintsUsed: hintsShown, wrongTries, revealed: true });
    }
  }, [ex, hintsShown, wrongTries]);

  const retry = useCallback(() => {
    setSolved(false);
    setRevealed(false);
    setWrongTries(0);
    setHintsShown(0);
    recorded.current = false;
  }, []);

  return {
    hintsShown,
    wrongTries,
    solved,
    revealed,
    solvedBefore: derived.solved.has(ex.id),
    /** só oferece a solução depois de esforço real: 2 erros ou todas as dicas */
    canReveal: wrongTries >= 2 || hintsShown >= ex.hints.length,
    check,
    showHint,
    reveal,
    retry,
  };
}

export type ExerciseState = ReturnType<typeof useExercise>;

export const KIND_LABEL: Record<Exercise['kind'], string> = {
  mcq: 'Múltipla escolha',
  predict: 'Preveja a saída',
  code: 'Escreva o código',
  fix: 'Corrija o bug',
  parsons: 'Ordene as linhas',
  fill: 'Complete as lacunas',
  sql: 'Consulta SQL',
};

export const DIFF_LABEL: Record<Exercise['difficulty'], string> = {
  facil: 'Fácil',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
  desafio: 'Desafio',
};

/** Embaralhamento determinístico (mesmo resultado no servidor e no navegador). */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const rand = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export const normalizeOutput = (s: string) =>
  s
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .join('\n')
    .replace(/\n+$/, '');
