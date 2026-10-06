/**
 * Modelo de domínio (mastery) por habilidade.
 *
 * Cada tentativa gera uma evidência com nota 0..1 ponderada pela dificuldade.
 * O domínio é uma média móvel exponencial (o desempenho recente pesa mais),
 * e a confiança cresce com o número de evidências. Para refletir o
 * esquecimento, a habilidade tem uma "estabilidade" que cresce quando o
 * estudante acerta em dias diferentes (prática espaçada) — a mesma ideia do
 * FSRS, em escala de habilidade.
 */

export type Difficulty = 'facil' | 'intermediario' | 'avancado' | 'desafio';

export interface Attempt {
  skill: string;
  /** 1 = acertou de primeira, valores menores indicam ajuda/erros. */
  score: number;
  difficulty: Difficulty;
  at: number; // epoch ms
}

export interface SkillState {
  skill: string;
  mastery: number; // 0..1
  evidence: number;
  stabilityDays: number;
  lastPracticed: number;
  lastSuccessDay: number; // dia (epoch/DAY) do último acerto, para contar dias distintos
}

export type SkillStatus = 'nao-iniciada' | 'aprendendo' | 'reforco' | 'dominada' | 'revisar';

const DAY = 86_400_000;
const WEIGHT: Record<Difficulty, number> = { facil: 1, intermediario: 1.4, avancado: 1.8, desafio: 2.2 };

export const MASTERY_THRESHOLD = 0.8;
export const MIN_EVIDENCE = 3;

/** Converte o resultado de um exercício em nota 0..1. */
export function scoreFromOutcome(o: { correct: boolean; wrongTries: number; hintsUsed: number; revealed: boolean }): number {
  if (!o.correct) return 0;
  if (o.revealed) return 0.2;
  const penalty = 0.15 * o.wrongTries + 0.1 * o.hintsUsed;
  return Math.max(0.35, 1 - penalty);
}

export function emptySkill(skill: string): SkillState {
  return { skill, mastery: 0, evidence: 0, stabilityDays: 1, lastPracticed: 0, lastSuccessDay: -1 };
}

export function applyAttempt(state: SkillState, a: Attempt): SkillState {
  const w = WEIGHT[a.difficulty];
  // alpha maior no começo (aprende rápido com pouca evidência), estabiliza depois
  const alpha = Math.min(0.6, (0.35 * w) / (1 + state.evidence * 0.15));
  const mastery = state.mastery + alpha * (a.score - state.mastery);

  const day = Math.floor(a.at / DAY);
  let stabilityDays = state.stabilityDays;
  let lastSuccessDay = state.lastSuccessDay;
  if (a.score >= 0.6) {
    if (day !== state.lastSuccessDay) {
      stabilityDays = Math.min(180, stabilityDays * 2.2);
      lastSuccessDay = day;
    }
  } else if (a.score < 0.3) {
    stabilityDays = Math.max(1, stabilityDays * 0.5);
  }

  return {
    skill: state.skill,
    mastery: Math.min(1, Math.max(0, mastery)),
    evidence: state.evidence + w,
    stabilityDays,
    lastPracticed: a.at,
    lastSuccessDay,
  };
}

/** Probabilidade estimada de ainda lembrar a habilidade hoje. */
export function skillRetention(s: SkillState, now: number): number {
  if (s.lastPracticed === 0) return 0;
  const t = Math.max(0, (now - s.lastPracticed) / DAY);
  return Math.pow(1 + ((19 / 81) * t) / s.stabilityDays, -0.5);
}

export function skillStatus(s: SkillState | undefined, now: number): SkillStatus {
  if (!s || s.evidence === 0) return 'nao-iniciada';
  const retention = skillRetention(s, now);
  if (s.mastery >= MASTERY_THRESHOLD && s.evidence >= MIN_EVIDENCE) {
    return retention < 0.75 ? 'revisar' : 'dominada';
  }
  if (s.evidence >= MIN_EVIDENCE && s.mastery < 0.5) return 'reforco';
  return 'aprendendo';
}

export function replayAttempts(attempts: Attempt[]): Map<string, SkillState> {
  const map = new Map<string, SkillState>();
  for (const a of [...attempts].sort((x, y) => x.at - y.at)) {
    map.set(a.skill, applyAttempt(map.get(a.skill) ?? emptySkill(a.skill), a));
  }
  return map;
}
