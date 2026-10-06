/**
 * FSRS-4.5 (Free Spaced Repetition Scheduler) — implementação enxuta.
 *
 * Referência: open-spaced-repetition/fsrs4anki (wiki "The Algorithm").
 * O modelo estima, para cada cartão, a Stability (S, em dias: tempo até a
 * probabilidade de lembrar cair para 90%) e a Difficulty (D, 1..10). A
 * Retrievability R(t) é a probabilidade de lembrar após t dias.
 *
 * Escolhemos FSRS em vez de SM-2 porque ele é baseado em um modelo de memória
 * ajustado a dados reais de revisão e permite fixar a retenção desejada.
 */

export type Grade = 1 | 2 | 3 | 4; // 1=Again (errei) 2=Hard 3=Good 4=Easy

export interface CardState {
  stability: number; // dias
  difficulty: number; // 1..10
  reps: number;
  lapses: number;
  lastReview: number; // epoch ms
  due: number; // epoch ms
}

export const DEFAULT_WEIGHTS = [
  0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072,
  0.0793, 0.3246, 1.587, 0.2272, 2.8755,
] as const;

const DECAY = -0.5;
const FACTOR = 19 / 81; // garante R(S) = 0.9
const DAY = 86_400_000;

export interface FsrsOptions {
  weights?: readonly number[];
  requestRetention?: number; // 0.7..0.97
  maximumInterval?: number; // dias
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export function retrievability(elapsedDays: number, stability: number): number {
  if (stability <= 0) return 0;
  return Math.pow(1 + (FACTOR * elapsedDays) / stability, DECAY);
}

export function nextIntervalDays(stability: number, requestRetention = 0.9, maximumInterval = 365): number {
  const interval = (stability / FACTOR) * (Math.pow(requestRetention, 1 / DECAY) - 1);
  return clamp(Math.round(interval), 1, maximumInterval);
}

function initDifficulty(w: readonly number[], g: Grade): number {
  return clamp(w[4]! - (g - 3) * w[5]!, 1, 10);
}

function nextDifficulty(w: readonly number[], d: number, g: Grade): number {
  const next = d - w[6]! * (g - 3);
  // mean reversion em direção à dificuldade inicial de um "Easy"
  return clamp(w[7]! * initDifficulty(w, 4) + (1 - w[7]!) * next, 1, 10);
}

function stabilityAfterSuccess(w: readonly number[], d: number, s: number, r: number, g: Grade): number {
  const hardPenalty = g === 2 ? w[15]! : 1;
  const easyBonus = g === 4 ? w[16]! : 1;
  return (
    s *
    (1 +
      Math.exp(w[8]!) * (11 - d) * Math.pow(s, -w[9]!) * (Math.exp(w[10]! * (1 - r)) - 1) * hardPenalty * easyBonus)
  );
}

function stabilityAfterFailure(w: readonly number[], d: number, s: number, r: number): number {
  const next = w[11]! * Math.pow(d, -w[12]!) * (Math.pow(s + 1, w[13]!) - 1) * Math.exp(w[14]! * (1 - r));
  return Math.min(next, s); // esquecer nunca aumenta a estabilidade
}

export function newCard(now: number): CardState {
  return { stability: 0, difficulty: 0, reps: 0, lapses: 0, lastReview: 0, due: now };
}

/** Aplica uma avaliação ao cartão e devolve o novo estado (função pura). */
export function review(card: CardState, grade: Grade, now: number, opts: FsrsOptions = {}): CardState {
  const w = opts.weights ?? DEFAULT_WEIGHTS;
  const retention = opts.requestRetention ?? 0.9;
  const maxInterval = opts.maximumInterval ?? 365;

  let stability: number;
  let difficulty: number;
  let lapses = card.lapses;

  if (card.reps === 0) {
    stability = w[grade - 1]!;
    difficulty = initDifficulty(w, grade);
  } else {
    const elapsed = Math.max(0, (now - card.lastReview) / DAY);
    const r = retrievability(elapsed, card.stability);
    difficulty = nextDifficulty(w, card.difficulty, grade);
    if (grade === 1) {
      stability = stabilityAfterFailure(w, card.difficulty, card.stability, r);
      lapses += 1;
    } else {
      stability = stabilityAfterSuccess(w, card.difficulty, card.stability, r, grade);
    }
  }

  stability = Math.max(0.1, stability);
  // Um erro volta no mesmo dia (10 min): recuperação ativa imediata.
  const due = grade === 1 ? now + 10 * 60_000 : now + nextIntervalDays(stability, retention, maxInterval) * DAY;

  return { stability, difficulty, reps: card.reps + 1, lapses, lastReview: now, due };
}

/** Prévia do próximo intervalo para cada nota — usada nos botões de revisão. */
export function previewIntervals(card: CardState, now: number, opts: FsrsOptions = {}): Record<Grade, number> {
  const out = {} as Record<Grade, number>;
  for (const g of [1, 2, 3, 4] as Grade[]) out[g] = review(card, g, now, opts).due - now;
  return out;
}

export function isDue(card: CardState, now: number): boolean {
  return card.due <= now;
}
