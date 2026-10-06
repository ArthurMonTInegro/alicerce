import { describe, expect, it } from 'vitest';
import { emptyProgress, sanitizeProgress, type AttemptRecord } from '@alicerce/engine';
import { computeMetrics, type UserSnapshot } from '../src/metrics.ts';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 5, 1);
const att = (exerciseId: string, at: number, o: Partial<AttemptRecord> = {}): AttemptRecord => ({
  exerciseId, skills: ['s'], difficulty: 'facil', correct: true, score: 1, hintsUsed: 0, wrongTries: 0, revealed: false, at, ...o,
});
const user = (createdAt: number, attempts: AttemptRecord[] = [], plan = 'free'): UserSnapshot => {
  const progress = emptyProgress();
  progress.attempts = attempts;
  return { createdAt, plan, progress };
};

describe('métricas', () => {
  it('ativos, retenção e funil', () => {
    const users = [
      user(NOW - 40 * DAY, [att('a', NOW - 40 * DAY), att('a', NOW - 2 * DAY)]), // voltou depois de 30 dias
      user(NOW - 10 * DAY, [att('a', NOW - 10 * DAY)]), // não voltou
      user(NOW - 3 * DAY, [], 'premium'), // sem atividade
    ];
    const m = computeMetrics(users, NOW, 1);
    expect(m.users).toMatchObject({ total: 3, new7d: 1, new30d: 2, premium: 1 });
    expect(m.active).toEqual({ dau: 0, wau: 1, mau: 2 });
    expect(m.retention.d7).toEqual({ eligible: 2, rate: 0.5 });
    expect(m.retention.d30).toEqual({ eligible: 1, rate: 1 });
    expect(m.funnel.anyActivity).toBe(2);
  });

  it('aponta exercícios difíceis só com amostra mínima', () => {
    const users = Array.from({ length: 6 }, (_, i) =>
      user(NOW - DAY, [att('dificil', NOW - DAY + 1, { correct: false }), att('dificil', NOW - DAY + 2, { revealed: i < 3, correct: i >= 3 }), att('facil', NOW - DAY + 3)]),
    );
    users.push(user(NOW - DAY, [att('raro', NOW - DAY, { correct: false })]));
    const m = computeMetrics(users, NOW, 5);
    expect(m.hardestExercises.map((e) => e.exerciseId)).toEqual(['dificil', 'facil']);
    expect(m.hardestExercises[0]).toMatchObject({ users: 6, firstTry: 0, revealed: 0.5 });
  });

  it('funciona sem contas', () => {
    const m = computeMetrics([], NOW);
    expect(m.users.total).toBe(0);
    expect(m.retention.d1.rate).toBe(0);
    expect(sanitizeProgress(null).attempts).toEqual([]);
  });
});
