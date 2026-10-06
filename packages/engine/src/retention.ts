/**
 * Evidências de aprendizado que dura, a partir do progresso já guardado.
 *
 * "Lembrar depois de um mês" é o que separa aprender de decorar para a prova, e
 * é o que a métrica principal do produto acompanha. Duas evidências contam:
 *  - uma habilidade demonstrada de novo, sem ver a solução, 30 dias ou mais
 *    depois da primeira vez que foi demonstrada;
 *  - um cartão de revisão lembrado (nota 2 a 4 no FSRS; 1 = esqueci) 30 dias ou
 *    mais depois da primeira revisão dele.
 */
import type { ProgressState } from './progress.ts';

const DAY = 86_400_000;
export const RETENTION_GAP_DAYS = 30;

export interface RetentionEvidence {
  /** habilidades demonstradas de novo depois do intervalo */
  retainedSkills: string[];
  /** revisões de cartões feitas depois do intervalo, e quantas foram lembradas */
  cardChecks: number;
  cardRecalls: number;
}

export function retentionEvidence(p: ProgressState, gapDays = RETENTION_GAP_DAYS): RetentionEvidence {
  const gap = gapDays * DAY;

  const firstClean = new Map<string, number>();
  const retained = new Set<string>();
  for (const a of [...p.attempts].sort((x, y) => x.at - y.at)) {
    if (!a.correct || a.revealed) continue;
    for (const s of a.skills) {
      const first = firstClean.get(s);
      if (first === undefined) firstClean.set(s, a.at);
      else if (a.at - first >= gap) retained.add(s);
    }
  }

  const firstReview = new Map<string, number>();
  let cardChecks = 0;
  let cardRecalls = 0;
  for (const r of [...p.reviews].sort((x, y) => x.at - y.at)) {
    const first = firstReview.get(r.cardId);
    if (first === undefined) {
      firstReview.set(r.cardId, r.at);
      continue;
    }
    if (r.at - first < gap) continue;
    cardChecks++;
    if (r.grade >= 2) cardRecalls++;
  }

  return { retainedSkills: [...retained].sort(), cardChecks, cardRecalls };
}

/** Quem tem pelo menos uma evidência de que lembrou algo depois do intervalo. */
export const hasRetainedLearning = (e: RetentionEvidence) => e.retainedSkills.length > 0 || e.cardRecalls > 0;

/**
 * Exercícios para refazer: a pessoa viu a solução e ainda não resolveu sozinha
 * depois disso. É a "saída" de quem travou: dá para concluir a lição, mas o
 * exercício volta na revisão até ser resolvido sem ajuda.
 */
export function exercisesToRedo(p: ProgressState): string[] {
  const state = new Map<string, boolean>();
  for (const a of [...p.attempts].sort((x, y) => x.at - y.at)) {
    if (a.revealed) state.set(a.exerciseId, true);
    else if (a.correct && state.has(a.exerciseId)) state.set(a.exerciseId, false);
  }
  return [...state].filter(([, pending]) => pending).map(([id]) => id);
}
