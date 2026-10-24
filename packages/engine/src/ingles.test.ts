import { describe, expect, it } from 'vitest';
import { corrigirIngles, inglesReply, pareceIngles } from './ingles.ts';
import type { Turn } from './coaching.ts';

const corrigido = (frase: string) => corrigirIngles(frase).corrigido;

describe('correção do inglês (lista fixa de erros comuns)', () => {
  it('corrige os erros comuns de quem fala português, marcando o trecho trocado', () => {
    expect(corrigido('Yesterday I go to the office and I fix a bug.')).toBe('Yesterday I **went** to the office and I **fixed** a bug.');
    expect(corrigido('I have 25 years.')).toBe('I **am 25 years old**.');
    expect(corrigido('He work here since 3 years.')).toBe('He **has worked** here **for** 3 years.');
    expect(corrigido('I live here since 2019.')).toBe('I **have lived** here since 2019.');
    expect(corrigido("She don't like tests.")).toBe("She **doesn't** like tests.");
    expect(corrigido('It depend of the input.')).toBe('It **depends** **on** the input.');
    expect(corrigido('Can you explain me this error?')).toBe('Can you explain **to me** this error?');
    expect(corrigido("I didn't went to the meeting.")).toBe("I didn't **go** to the meeting.");
    expect(corrigido('How I can fix this?')).toBe('How **can I** fix this?');
    expect(corrigido('I need some informations.')).toBe('I need some **information**.');
    expect(corrigido('People is happy.')).toBe('People **are** happy.');
  });

  it('não corrige frases certas', () => {
    for (const certa of [
      'I study Python every day.',
      'Yesterday I fixed a bug in the login page.',
      'I have worked here for two years.',
      'I have lived here since 2019.',
      'Last week we deployed the new version and it broke.',
      'I have finished the task.',
      'Is it code or text?',
      'Does it work?',
      'Make it work first.',
      'Let it run overnight.',
      'I want it to work.',
      'I fixed it, test it again.',
      'It works on my machine.',
      'Yesterday I fixed it and today I review the tests.',
    ])
      expect(corrigirIngles(certa).correcoes, certa).toEqual([]);
  });

  it('não põe na frase "corrigida" uma troca que deixa a pergunta errada', () => {
    // "How it work?" pede "does"; a regra do -s daria "How it works?", que continua errado
    expect(corrigirIngles('How it work?').correcoes).toEqual([]);
  });

  it('since com duração vira for, e o verbo da mesma frase conta como a mesma correção', () => {
    const { correcoes } = corrigirIngles('He work here since 3 years.');
    expect(correcoes).toHaveLength(1);
    expect(correcoes[0]!.explicacao).toContain('*since* marca o início');
    expect(correcoes[0]!.explicacao).toContain('*have* + particípio');
  });

  it('detecta inglês também em frases curtas, e não confunde português', () => {
    expect(pareceIngles('I study Python')).toBe(true);
    expect(pareceIngles('Yesterday I go to the office.')).toBe(true);
    expect(pareceIngles('quero praticar inglês')).toBe(false);
    expect(pareceIngles('me ajuda com o for')).toBe(false);
  });
});

describe('conversa em inglês do apoio local', () => {
  it('mostra a frase corrigida, explica em português até dois erros e pede uma nova tentativa', () => {
    const r = inglesReply('Yesterday I go to the office, I fix a bug and I have 25 years. He work here since 3 years.');
    expect(r).toContain('**Sua frase, corrigida:**');
    expect(r).toContain('> Yesterday I **went**');
    expect(r.match(/^- \*/gm)).toHaveLength(2);
    expect(r).toMatch(/E mais \d ajustes? na frase acima/);
    expect(r).toContain('**Sua vez:** reescreva a frase');
    expect(r).toContain('Não ouço áudio nem avalio pronúncia');
  });

  it('sem erro da lista, continua a conversa e diz que erros fora da lista passam', () => {
    const r = inglesReply('Yesterday I fixed a bug in the login page.');
    expect(r).not.toContain('corrigida');
    expect(r).toContain('?');
    expect(r).toContain('erros fora dessa lista passam sem correção');
  });

  it('em português, propõe uma situação de trabalho; no pedido seguinte, outra', () => {
    const primeira = inglesReply('quero praticar');
    expect(primeira).toMatch(/^\*\*Situação: /);
    expect(primeira).toContain('Responda em inglês');
    const historico: Turn[] = [
      { role: 'user', text: 'quero praticar' },
      { role: 'tutor', text: primeira },
    ];
    const segunda = inglesReply('outra, por favor', historico);
    expect(segunda.split('\n')[0]).not.toBe(primeira.split('\n')[0]);
  });

  it('a resposta segue a situação em curso', () => {
    const historico: Turn[] = [{ role: 'tutor', text: inglesReply('quero praticar') }];
    expect(historico[0]!.text).toContain('stand-up');
    const r = inglesReply('Yesterday I fixed the tests.', historico);
    expect(r).toContain('?');
  });

  it('pedido de pronúncia ou de áudio: diz que não ouve, sem fingir avaliação', () => {
    for (const pedido of ['Can you check my pronunciation of "queue"?', 'gravei um áudio, pode ouvir?', 'como está meu sotaque?']) {
      const r = inglesReply(pedido);
      expect(r, pedido).toContain("I can't hear audio");
      expect(r, pedido).toContain('[Inglês](/ingles)');
      expect(r, pedido).not.toMatch(/your pronunciation (is|sounds)/i);
    }
  });
});
