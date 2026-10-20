import { describe, expect, it } from 'vitest';
import { explainError, traduzir } from './errors.ts';
import { MAX_OUTPUT_CHARS } from './limits.ts';

// A mensagem de erro vem do código do estudante e chega com até MAX_OUTPUT_CHARS caracteres.
// Sem limite, algumas expressões levavam tempo quadrático: 'a' x 65.536 passava de 8 s em traduzir.
const longas = {
  letras: 'a'.repeat(MAX_OUTPUT_CHARS),
  near: 'near "'.repeat(MAX_OUTPUT_CHARS / 6),
  operando: 'unsupported operand type(s) for '.repeat(MAX_OUTPUT_CHARS / 32),
};

describe('explicação de erros', () => {
  it('mensagem gigante não trava a página', { timeout: 5_000 }, () => {
    for (const [nome, message] of Object.entries(longas)) {
      const inicio = performance.now();
      expect(traduzir(message).length, nome).toBeGreaterThanOrEqual(message.length - 100);
      for (const type of ['NameError', 'TypeError', 'SyntaxError', 'ValueError', 'AttributeError', 'ReferenceError', 'Erro qualquer']) {
        explainError({ type, message, line: 1 });
        explainError({ type: message, message, line: 1 });
      }
      expect(performance.now() - inicio, nome).toBeLessThan(1_000);
    }
  });

  it('continua traduzindo mensagens normais', () => {
    expect(traduzir("name 'x' is not defined")).toBe('o nome "x" não está definido');
    expect(traduzir('near "FROM": syntax error')).toBe('erro de sintaxe perto de "FROM"');
    expect(explainError({ type: 'NameError', message: "name 'total' is not defined", line: 3 }).translation).toContain('"total"');
    // a parte depois do trecho conferido é mantida
    const longa = "name 'x' is not defined" + ' '.repeat(5_000) + 'fim';
    expect(traduzir(longa).endsWith('fim')).toBe(true);
    expect(traduzir(longa).startsWith('o nome "x" não está definido')).toBe(true);
  });
});
