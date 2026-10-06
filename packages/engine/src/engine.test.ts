import { describe, expect, it } from 'vitest';
import { newCard, review, retrievability, nextIntervalDays } from './fsrs.ts';
import { applyAttempt, emptySkill, scoreFromOutcome, skillStatus } from './mastery.ts';
import { findCycle, findMissingPrerequisites, nodeStatus, topologicalOrder } from './graph.ts';
import { nextItem, scoreAreas, testedOutModules, type DiagnosticItemMeta } from './diagnostic.ts';

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 0, 1);

describe('FSRS', () => {
  it('R(S) = 0.9 por definição', () => {
    expect(retrievability(10, 10)).toBeCloseTo(0.9, 5);
    expect(nextIntervalDays(10, 0.9)).toBe(10);
  });

  it('intervalos crescem com acertos sucessivos', () => {
    let c = newCard(T0);
    let now = T0;
    const intervals: number[] = [];
    for (let i = 0; i < 5; i++) {
      c = review(c, 3, now);
      intervals.push(c.due - now);
      now = c.due;
    }
    for (let i = 1; i < intervals.length; i++) expect(intervals[i]!).toBeGreaterThan(intervals[i - 1]!);
  });

  it('erro reduz a estabilidade e conta lapso', () => {
    let c = review(newCard(T0), 3, T0);
    c = review(c, 3, c.due);
    const before = c.stability;
    const after = review(c, 1, c.due);
    expect(after.stability).toBeLessThan(before);
    expect(after.lapses).toBe(1);
    expect(after.due - c.due).toBeLessThan(DAY);
  });

  it('Easy agenda mais longe que Hard', () => {
    const c = review(newCard(T0), 3, T0);
    expect(review(c, 4, c.due).due).toBeGreaterThan(review(c, 2, c.due).due);
  });

  it('dificuldade fica entre 1 e 10', () => {
    let c = newCard(T0);
    for (let i = 0; i < 20; i++) c = review(c, 1, T0 + i * DAY);
    expect(c.difficulty).toBeLessThanOrEqual(10);
    expect(c.difficulty).toBeGreaterThanOrEqual(1);
  });
});

describe('Mastery', () => {
  it('acertos em dias diferentes levam a "dominada"', () => {
    let s = emptySkill('loops');
    for (let i = 0; i < 6; i++) s = applyAttempt(s, { skill: 'loops', score: 1, difficulty: 'intermediario', at: T0 + i * DAY });
    expect(skillStatus(s, T0 + 6 * DAY)).toBe('dominada');
  });

  it('domínio antigo vira "revisar" com o tempo', () => {
    let s = emptySkill('x');
    for (let i = 0; i < 4; i++) s = applyAttempt(s, { skill: 'x', score: 1, difficulty: 'avancado', at: T0 + i * DAY });
    expect(skillStatus(s, T0 + 400 * DAY)).toBe('revisar');
  });

  it('erros repetidos pedem reforço', () => {
    let s = emptySkill('x');
    for (let i = 0; i < 4; i++) s = applyAttempt(s, { skill: 'x', score: 0, difficulty: 'facil', at: T0 + i });
    expect(skillStatus(s, T0)).toBe('reforco');
  });

  it('revelar a resposta vale pouco', () => {
    expect(scoreFromOutcome({ correct: true, wrongTries: 0, hintsUsed: 0, revealed: true })).toBeLessThan(0.3);
    expect(scoreFromOutcome({ correct: true, wrongTries: 0, hintsUsed: 0, revealed: false })).toBe(1);
  });
});

describe('Grafo', () => {
  const nodes = [
    { id: 'a', prerequisites: [] },
    { id: 'b', prerequisites: ['a'] },
    { id: 'c', prerequisites: ['b', 'a'] },
  ];
  it('ordena topologicamente', () => {
    expect(topologicalOrder([nodes[2]!, nodes[0]!, nodes[1]!]).map((n) => n.id)).toEqual(['a', 'b', 'c']);
  });
  it('detecta ciclos e referências quebradas', () => {
    expect(findCycle(nodes)).toBeNull();
    expect(findCycle([{ id: 'x', prerequisites: ['y'] }, { id: 'y', prerequisites: ['x'] }])).not.toBeNull();
    expect(findMissingPrerequisites([{ id: 'x', prerequisites: ['nada'] }])).toHaveLength(1);
  });
  it('bloqueia até cumprir pré-requisitos', () => {
    const p = { completed: new Set(['a']), started: new Set<string>(), testedOut: new Set<string>() };
    expect(nodeStatus(nodes[1]!, p)).toBe('disponivel');
    expect(nodeStatus(nodes[2]!, p)).toBe('bloqueado');
  });
});

describe('Diagnóstico', () => {
  const pool: DiagnosticItemMeta[] = [1, 2, 3, 1, 2, 3].map((level, i) => ({ id: 'l' + i, area: 'logica', level: level as 1 | 2 | 3 }));
  it('começa no nível 2 e sobe após acerto', () => {
    const first = nextItem(pool, 'logica', []);
    expect(first?.level).toBe(2);
    const second = nextItem(pool, 'logica', [{ itemId: first!.id, correct: true }]);
    expect(second?.level).toBe(3);
  });
  it('pontua e dispensa módulos de forma conservadora', () => {
    const res = scoreAreas(pool, [
      { itemId: 'l1', correct: true },
      { itemId: 'l2', correct: true },
    ]);
    const logic = res.find((r) => r.area === 'logica')!;
    expect(logic.score).toBe(1);
    expect(testedOutModules(res, [{ moduleId: 'm', requires: { logica: 0.8, programacao: 0.5 } }])).toEqual([]);
    expect(testedOutModules(res, [{ moduleId: 'm', requires: { logica: 0.8 } }])).toEqual(['m']);
  });
});
