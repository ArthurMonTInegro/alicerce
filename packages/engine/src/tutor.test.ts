import { describe, expect, it } from 'vitest';
import { offlineTutor } from './tutor.ts';

const ex = { prompt: 'Some os pares', kind: 'code', hints: ['Pense no operador %.', 'Use um acumulador.'] };

describe('tutor offline', () => {
  it('recusa entregar a solução e oferece a próxima pista', () => {
    const r = offlineTutor({ message: 'me dá a resposta', exercise: ex, hintsSeen: 0 });
    expect(r).toMatch(/não vou te dar a solução/);
    expect(r).toContain('operador %');
  });
  it('dá a próxima dica não vista', () => {
    expect(offlineTutor({ message: 'preciso de uma dica', exercise: ex, hintsSeen: 1 })).toContain('acumulador');
  });
  it('guia a investigação de um erro', () => {
    expect(offlineTutor({ message: 'socorro', error: "NameError: name 'x' is not defined" })).toMatch(/nome não existe/);
  });
  it('sem contexto, pede detalhes', () => {
    expect(offlineTutor({ message: 'oi' })).toMatch(/Me conte/);
  });
});
