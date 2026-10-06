/**
 * Gamificação derivada do progresso: XP, patamares e conquistas.
 *
 * Nada aqui é estado novo: tudo é recalculado a partir do ProgressState, então
 * não há o que sincronizar, migrar ou "farmar". As regras recompensam o que a
 * pesquisa associa a aprender (resolver sem ajuda, revisar espaçado, constância,
 * concluir projetos), e não cliques ou tempo de tela.
 */
import type { Difficulty } from './mastery.ts';
import { activityByDay, type ProgressState } from './progress.ts';

export const XP_RULES = {
  exercise: { facil: 10, intermediario: 20, avancado: 30, desafio: 50 } satisfies Record<Difficulty, number>,
  /** bônus para quem acerta de primeira, sem dica e sem revelar */
  cleanBonus: 0.5,
  lesson: 30,
  review: 2,
  projectMilestone: 40,
  diagnostic: 20,
} as const;

export interface Badge {
  id: string;
  title: string;
  description: string;
  current: number;
  target: number;
  done: boolean;
}

export interface Gamification {
  xp: number;
  /** patamar de experiência (não confundir com os níveis 0 a 14 do currículo) */
  tier: number;
  tierFloor: number;
  nextTierAt: number;
  solved: number;
  cleanSolved: number;
  challengesSolved: number;
  longestStreak: number;
  badges: Badge[];
}

/** XP necessário para chegar ao patamar n: 0, 100, 300, 600, 1000... (cresce devagar, sem teto). */
export const tierFloor = (n: number) => 50 * n * (n + 1);

export function tierFor(xp: number): number {
  let n = 0;
  while (tierFloor(n + 1) <= xp) n++;
  return n;
}

/** Maior sequência de dias seguidos com estudo em todo o histórico. */
export function longestStreak(activity: Map<string, number>): number {
  const days = [...activity.keys()].sort();
  let best = 0;
  let run = 0;
  let prev = NaN;
  for (const d of days) {
    const t = Date.parse(d + 'T00:00:00Z');
    run = t - prev === 86_400_000 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  return best;
}

export function gamification(p: ProgressState, extra: { completedLevels: readonly number[]; tzOffsetMin?: number } = { completedLevels: [] }): Gamification {
  // Cada exercício conta uma vez: vale a primeira tentativa correta, e o bônus só se ela foi limpa.
  const firstCorrect = new Map<string, (typeof p.attempts)[number]>();
  for (const a of [...p.attempts].sort((x, y) => x.at - y.at)) {
    if (a.correct && !a.revealed && !firstCorrect.has(a.exerciseId)) firstCorrect.set(a.exerciseId, a);
  }
  let xp = 0;
  let clean = 0;
  let challenges = 0;
  for (const a of firstCorrect.values()) {
    const base = XP_RULES.exercise[a.difficulty] ?? 0;
    const isClean = a.hintsUsed === 0 && a.wrongTries === 0;
    if (isClean) clean++;
    if (a.difficulty === 'desafio') challenges++;
    xp += Math.round(base * (isClean ? 1 + XP_RULES.cleanBonus : 1));
  }
  const lessonsDone = Object.values(p.lessons).filter((l) => l.completedAt).length;
  const milestones = Object.values(p.projects).reduce((n, pr) => n + pr.milestones.length, 0);
  xp += lessonsDone * XP_RULES.lesson + p.reviews.length * XP_RULES.review + milestones * XP_RULES.projectMilestone;
  if (p.diagnostic) xp += XP_RULES.diagnostic;

  const best = longestStreak(activityByDay(p, extra.tzOffsetMin ?? 0));
  const levels = new Set(extra.completedLevels);
  const badge = (id: string, title: string, description: string, current: number, target: number): Badge => ({
    id,
    title,
    description,
    current: Math.min(current, target),
    target,
    done: current >= target,
  });

  const tier = tierFor(xp);
  return {
    xp,
    tier,
    tierFloor: tierFloor(tier),
    nextTierAt: tierFloor(tier + 1),
    solved: firstCorrect.size,
    cleanSolved: clean,
    challengesSolved: challenges,
    longestStreak: best,
    badges: [
      badge('primeiro-passo', 'Primeiro passo', 'Concluir a primeira lição.', lessonsDone, 1),
      badge('autoconhecimento', 'Autoconhecimento', 'Fazer o teste diagnóstico.', p.diagnostic ? 1 : 0, 1),
      badge('maos-a-obra', 'Mãos à obra', 'Resolver 10 exercícios.', firstCorrect.size, 10),
      badge('sem-rodinhas', 'Sem rodinhas', 'Acertar 10 exercícios de primeira, sem dicas.', clean, 10),
      badge('desafiante', 'Desafiante', 'Resolver 5 desafios.', challenges, 5),
      badge('memoria-viva', 'Memória viva', 'Fazer 50 revisões espaçadas.', p.reviews.length, 50),
      badge('constancia-7', 'Uma semana seguida', 'Estudar 7 dias seguidos.', best, 7),
      badge('constancia-30', 'Um mês seguido', 'Estudar 30 dias seguidos.', best, 30),
      badge('construtor', 'Construtor', 'Concluir 5 etapas de projetos.', milestones, 5),
      badge('centena', 'Centena', 'Resolver 100 exercícios.', firstCorrect.size, 100),
      badge('fundacao', 'Fundação', 'Concluir os níveis 0, 1 e 2.', [0, 1, 2].filter((n) => levels.has(n)).length, 3),
      badge('base-solida', 'Base sólida', 'Concluir os níveis 3 e 4 (estruturas de dados e algoritmos).', [3, 4].filter((n) => levels.has(n)).length, 2),
    ],
  };
}
