import { describe, expect, it } from 'vitest';
import { gamification, longestStreak, tierFloor, tierFor, XP_RULES } from './achievements.ts';
import { emptyProgress, type AttemptRecord } from './progress.ts';

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 0, 5, 12);
const att = (o: Partial<AttemptRecord>): AttemptRecord => ({
  exerciseId: 'e1', skills: ['s'], difficulty: 'facil', correct: true, score: 1, hintsUsed: 0, wrongTries: 0, revealed: false, at: T0, ...o,
});

describe('gamificação', () => {
  it('patamares crescem e tierFor é consistente', () => {
    expect([0, 1, 2, 3].map(tierFloor)).toEqual([0, 100, 300, 600]);
    expect(tierFor(0)).toBe(0);
    expect(tierFor(99)).toBe(0);
    expect(tierFor(100)).toBe(1);
    expect(tierFor(650)).toBe(3);
  });

  it('cada exercício conta uma vez e o bônus exige acerto limpo', () => {
    const p = emptyProgress();
    p.attempts = [
      att({ exerciseId: 'a', correct: false, at: T0 }),
      att({ exerciseId: 'a', wrongTries: 1, at: T0 + 1 }),
      att({ exerciseId: 'a', at: T0 + 2 }),
      att({ exerciseId: 'b', difficulty: 'desafio', at: T0 + 3 }),
    ];
    const g = gamification(p);
    expect(g.solved).toBe(2);
    expect(g.cleanSolved).toBe(1);
    expect(g.challengesSolved).toBe(1);
    expect(g.xp).toBe(XP_RULES.exercise.facil + XP_RULES.exercise.desafio * 1.5);
  });

  it('solução revelada não rende XP', () => {
    const p = emptyProgress();
    p.attempts = [att({ revealed: true, score: 0.1 })];
    expect(gamification(p).xp).toBe(0);
    expect(gamification(p).solved).toBe(0);
  });

  it('maior sequência considera só dias seguidos', () => {
    const m = new Map([['2026-01-01', 1], ['2026-01-02', 3], ['2026-01-03', 1], ['2026-01-05', 1]]);
    expect(longestStreak(m)).toBe(3);
    expect(longestStreak(new Map())).toBe(0);
  });

  it('conquistas refletem o progresso e os níveis concluídos', () => {
    const p = emptyProgress();
    p.lessons = { l1: { visited: [], completedAt: T0 } };
    p.reviews = Array.from({ length: 7 }, (_, i) => ({ cardId: 'c', grade: 3 as const, at: T0 + i * DAY }));
    const g = gamification(p, { completedLevels: [0, 2] });
    const by = Object.fromEntries(g.badges.map((b) => [b.id, b]));
    expect(by['primeiro-passo']!.done).toBe(true);
    expect(by['constancia-7']!.done).toBe(true);
    expect(by['fundacao']!.current).toBe(2);
    expect(by['fundacao']!.done).toBe(false);
    expect(g.xp).toBe(XP_RULES.lesson + 7 * XP_RULES.review);
  });
});
