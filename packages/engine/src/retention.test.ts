import { describe, expect, it } from 'vitest';
import { exercisesToRedo, hasRetainedLearning, retentionEvidence } from './retention.ts';
import { emptyProgress, type AttemptRecord, type ReviewRecord } from './progress.ts';

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 0, 5, 12);
const att = (o: Partial<AttemptRecord>): AttemptRecord => ({
  exerciseId: 'e1', skills: ['s'], difficulty: 'facil', correct: true, score: 1, hintsUsed: 0, wrongTries: 0, revealed: false, at: T0, ...o,
});
const rev = (cardId: string, grade: ReviewRecord['grade'], at: number): ReviewRecord => ({ cardId, grade, at });

describe('retenção de longo prazo', () => {
  it('habilidade conta só quando demonstrada de novo 30 dias depois, sem revelar', () => {
    const p = emptyProgress();
    p.attempts = [
      att({ skills: ['a', 'b'], at: T0 }),
      att({ skills: ['a'], at: T0 + 29 * DAY }),
      att({ skills: ['b'], revealed: true, correct: false, at: T0 + 40 * DAY }),
      att({ skills: ['a'], at: T0 + 31 * DAY }),
    ];
    const e = retentionEvidence(p);
    expect(e.retainedSkills).toEqual(['a']);
    expect(hasRetainedLearning(e)).toBe(true);
  });

  it('cartões: só revisões a partir de 30 dias da primeira; nota 1 é esquecimento', () => {
    const p = emptyProgress();
    p.reviews = [rev('c1', 3, T0), rev('c1', 3, T0 + 5 * DAY), rev('c1', 1, T0 + 30 * DAY), rev('c1', 2, T0 + 60 * DAY), rev('c2', 4, T0 + 90 * DAY)];
    const e = retentionEvidence(p);
    expect(e).toEqual({ retainedSkills: [], cardChecks: 2, cardRecalls: 1 });
    expect(hasRetainedLearning(retentionEvidence(emptyProgress()))).toBe(false);
  });

  it('a ordem dos registros não muda o resultado', () => {
    const p = emptyProgress();
    p.attempts = [att({ at: T0 + 35 * DAY }), att({ at: T0 })];
    expect(retentionEvidence(p).retainedSkills).toEqual(['s']);
  });
});

describe('exercícios para refazer', () => {
  it('entra quando a solução é revelada e sai quando é resolvido sem ajuda depois', () => {
    const p = emptyProgress();
    p.attempts = [
      att({ exerciseId: 'x', revealed: true, correct: false, at: T0 }),
      att({ exerciseId: 'y', revealed: true, correct: false, at: T0 }),
      att({ exerciseId: 'y', at: T0 + DAY }),
      att({ exerciseId: 'z', at: T0 }),
      att({ exerciseId: 'w', at: T0 }),
      att({ exerciseId: 'w', revealed: true, correct: false, at: T0 + DAY }),
    ];
    expect(exercisesToRedo(p).sort()).toEqual(['w', 'x']);
  });
});
