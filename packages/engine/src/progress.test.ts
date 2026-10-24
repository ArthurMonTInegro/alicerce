import { describe, expect, it } from 'vitest';
import { activityByDay, emptyProgress, mergeProgress, sanitizeProgress, streak, type ProgressState } from './progress.ts';
import { newCard, review } from './fsrs.ts';

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 0, 10, 12);

function sample(seed: number): ProgressState {
  const p = emptyProgress();
  p.attempts.push({ exerciseId: `e${seed}`, skills: ['s'], difficulty: 'facil', correct: true, score: 1, hintsUsed: 0, wrongTries: 0, revealed: false, at: T0 + seed });
  p.lessons[`l${seed % 2}`] = { visited: ['conceito', seed % 2 ? 'exemplo' : 'codigo'], ...(seed > 1 ? { completedAt: T0 + seed } : {}) };
  p.modulesDone[`m${seed}`] = T0 + seed;
  p.cards['c1'] = review(newCard(T0), 3, T0 + seed * DAY);
  p.reviews.push({ cardId: 'c1', grade: 3, at: T0 + seed * DAY });
  return p;
}

describe('mergeProgress', () => {
  const a = sample(1);
  const b = sample(2);
  const c = sample(3);

  it('é comutativa, associativa e idempotente', () => {
    expect(mergeProgress(a, b)).toEqual(mergeProgress(b, a));
    expect(mergeProgress(mergeProgress(a, b), c)).toEqual(mergeProgress(a, mergeProgress(b, c)));
    const ab = mergeProgress(a, b);
    expect(mergeProgress(ab, ab)).toEqual(ab);
  });

  it('não perde tentativas nem revisões e une etapas visitadas', () => {
    const m = mergeProgress(a, b);
    expect(m.attempts.map((x) => x.exerciseId)).toEqual(['e1', 'e2']);
    expect(m.reviews).toHaveLength(2);
    expect(m.lessons['l1']!.visited).toEqual(['conceito', 'exemplo']);
  });

  it('fica com o cartão revisado por último e a primeira data de conclusão', () => {
    const m = mergeProgress(a, c);
    expect(m.cards['c1']!.lastReview).toBe(T0 + 3 * DAY);
    expect(m.lessons['l1']!.completedAt).toBe(T0 + 3);
  });
});

describe('sanitizeProgress', () => {
  it('descarta lixo e mantém o que é válido', () => {
    const p = sanitizeProgress({ attempts: [{ exerciseId: 'x', at: 1, score: 1, skills: [] }, { nope: true }], cards: { a: { stability: 'x' } }, lessons: { l: { visited: ['a', 3] } } });
    expect(p.attempts).toHaveLength(1);
    expect(p.cards).toEqual({});
    expect(p.lessons['l']!.visited).toEqual(['a']);
    expect(sanitizeProgress(null)).toEqual(emptyProgress());
  });
});

describe('sequência de estudo', () => {
  it('conta dias seguidos até hoje ou ontem', () => {
    const p = emptyProgress();
    for (const d of [0, 1, 2, 4]) p.reviews.push({ cardId: 'c', grade: 3, at: T0 - d * DAY });
    const act = activityByDay(p);
    expect(streak(act, T0)).toBe(3);
    expect(streak(act, T0 + DAY)).toBe(3); // ainda não estudou hoje: não zera
    expect(streak(act, T0 + 2 * DAY)).toBe(0);
  });
});

describe('sanitizeProgress (entrada hostil)', () => {
  it('descarta __proto__, campos desconhecidos e valores inválidos', () => {
    const raw = JSON.parse(
      '{"modulesDone":{"__proto__":1,"m1":2,"m2":"x"},"attempts":[{"exerciseId":"e","at":1,"score":7,"skills":["a",3],"lixo":"' +
        'x'.repeat(1000) +
        '"}],"cards":{"c":{"stability":1,"difficulty":5,"due":2,"lastReview":1,"extra":true}}}',
    );
    const p = sanitizeProgress(raw);
    expect(Object.keys(p.modulesDone)).toEqual(['m1']);
    expect(Object.getPrototypeOf(p.modulesDone)).toBe(Object.prototype);
    expect(p.attempts[0]).toEqual({ exerciseId: 'e', skills: ['a'], difficulty: 'facil', correct: false, score: 1, hintsUsed: 0, wrongTries: 0, revealed: false, at: 1 });
    expect(p.cards.c).toEqual({ reps: 0, lapses: 0, stability: 1, difficulty: 5, due: 2, lastReview: 1 });
  });
});

describe('uso do tutor por dia (só a contagem)', () => {
  it('mescla pelo maior de cada dia: comutativa, idempotente, sem somar a mesma contagem duas vezes', () => {
    const a = { ...emptyProgress(), tutorUse: { '2026-10-20': 3, '2026-10-21': 1 } };
    const b = { ...emptyProgress(), tutorUse: { '2026-10-21': 4, '2026-10-22': 2 } };
    expect(mergeProgress(a, b).tutorUse).toEqual({ '2026-10-20': 3, '2026-10-21': 4, '2026-10-22': 2 });
    expect(mergeProgress(a, b)).toEqual(mergeProgress(b, a));
    expect(mergeProgress(a, a)).toEqual(a);
    // progresso antigo, sem o campo, continua igual depois da mescla
    expect('tutorUse' in mergeProgress(emptyProgress(), emptyProgress())).toBe(false);
    expect(mergeProgress(emptyProgress(), b).tutorUse).toEqual(b.tutorUse);
  });

  it('guarda só dias válidos com contagens inteiras positivas, até 400 dias', () => {
    const p = sanitizeProgress({ tutorUse: { '2026-10-20': 2, ontem: 3, '2026-10-21': -1, '2026-10-22': 1.5, '2026-10-23': 99999, __proto__: 1 } });
    expect(p.tutorUse).toEqual({ '2026-10-20': 2, '2026-10-23': 1000 });
    const muitos = Object.fromEntries(Array.from({ length: 450 }, (_, i) => [new Date(Date.UTC(2025, 0, 1) + i * DAY).toISOString().slice(0, 10), 1]));
    const q = sanitizeProgress({ tutorUse: muitos });
    expect(Object.keys(q.tutorUse!)).toHaveLength(400);
    expect(Object.keys(q.tutorUse!)[0]).toBe(new Date(Date.UTC(2025, 0, 1) + 50 * DAY).toISOString().slice(0, 10));
    expect('tutorUse' in sanitizeProgress({ tutorUse: [1, 2] })).toBe(false);
  });
});
