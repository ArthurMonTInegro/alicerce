import { describe, expect, it } from 'vitest';
import { lerPedidoDeSessao, minutosDoTexto, pedeSessao, planoDeSessao, type PedidoDeSessao } from './sessao.ts';

const pedido = (p: Partial<PedidoDeSessao> = {}): PedidoDeSessao => ({ minutos: null, celular: false, iniciante: false, comBase: false, repete: false, promessa: null, ...p });
/** soma dos minutos dos blocos numerados do plano */
const somaDosBlocos = (plano: string) => [...plano.matchAll(/^\d+\. \*\*(\d+) min:\*\*/gm)].reduce((n, m) => n + Number(m[1]), 0);

describe('tempo informado', () => {
  it('lê minutos e horas escritos de vários jeitos', () => {
    expect(minutosDoTexto('tenho 45 min')).toBe(45);
    expect(minutosDoTexto('10 minutos')).toBe(10);
    expect(minutosDoTexto('1h30')).toBe(90);
    expect(minutosDoTexto('1 hora e meia')).toBe(90);
    expect(minutosDoTexto('meia hora')).toBe(30);
    expect(minutosDoTexto('duas horas')).toBe(120);
    expect(minutosDoTexto('vinte minutos')).toBe(20);
  });

  it('não confunde palavra com hora nem inventa tempo', () => {
    expect(minutosDoTexto('conta uma história')).toBeNull();
    expect(minutosDoTexto('quero estudar funções')).toBeNull();
  });

  it('reconhece pedido de plano fora do modo Planejar', () => {
    expect(pedeSessao('tenho 20 minutos, o que faço?')).toBe(true);
    expect(pedeSessao('monta um plano pra mim')).toBe(true);
    expect(pedeSessao('o que é uma variável?')).toBe(false);
  });

  it('lê aparelho, experiência, repetição e pedido de garantia', () => {
    const p = lerPedidoDeSessao('Estou no ônibus, só pelo celular, 15 min por dia');
    expect(p).toMatchObject({ minutos: 15, celular: true, repete: true });
    expect(lerPedidoDeSessao('já sei o básico de Python').comBase).toBe(true);
    expect(lerPedidoDeSessao('nunca programei').iniciante).toBe(true);
    expect(lerPedidoDeSessao('em quanto tempo consigo emprego?').promessa).toBe('emprego');
    expect(lerPedidoDeSessao('quero ficar fluente em inglês').promessa).toBe('fluencia');
  });
});

describe('plano de sessão', () => {
  it('os blocos somam exatamente o tempo informado, de 1 a 120 minutos', () => {
    for (let m = 1; m <= 120; m++) {
      const plano = planoDeSessao(pedido({ minutos: m }));
      expect(somaDosBlocos(plano), `${m} min`).toBe(m);
      expect(plano).toContain(`**Sessão de ${m} minutos**`);
      for (const [, n] of plano.matchAll(/\*\*(\d+) min:\*\*/g)) expect(Number(n), `${m} min`).toBeGreaterThan(0);
    }
  });

  it('acima de 120 minutos planeja 120 e diz por quê', () => {
    const plano = planoDeSessao(pedido({ minutos: 180 }));
    expect(somaDosBlocos(plano)).toBe(120);
    expect(plano).toContain('Mais de 120 minutos seguidos rende menos');
    expect(plano).toContain('o resto fica para outra sessão');
  });

  it('sem tempo informado, propõe 25 minutos e pergunta quanto a pessoa tem', () => {
    const plano = planoDeSessao(pedido());
    expect(somaDosBlocos(plano)).toBe(25);
    expect(plano).toContain('você não disse quanto tempo tem');
    expect(plano).toContain('Me diga quantos minutos você tem');
  });

  it('usa o assunto pedido, com link para a lição', () => {
    const plano = planoDeSessao(pedido({ minutos: 30 }), { tema: { id: 'l1-funcoes', title: 'Funções' } });
    expect(plano).toContain('**Sessão de 30 minutos: Funções**');
    expect(plano).toContain('[a lição](/licao/l1-funcoes)');
  });

  it('no celular, começa pela Revisão e deixa os exercícios de código para o teclado', () => {
    const plano = planoDeSessao(pedido({ minutos: 15, celular: true }));
    expect(plano).toContain('[Revisão](/revisao)');
    expect(plano).toContain('múltipla escolha ou de completar');
  });

  it('quem já tem base e não disse o assunto vai ao Diagnóstico; iniciante vai à primeira lição', () => {
    expect(planoDeSessao(pedido({ minutos: 30, comBase: true }))).toContain('[Diagnóstico](/diagnostico)');
    const iniciante = planoDeSessao(pedido({ minutos: 30, iniciante: true }), { primeiraLicao: { id: 'l0-primeira', title: 'O que é programar' } });
    expect(iniciante).toContain('/licao/l0-primeira');
  });

  it('sessão que se repete manda começar pela Revisão nos outros dias', () => {
    expect(planoDeSessao(pedido({ minutos: 20, repete: true }))).toContain('Nos outros dias, comece pela [Revisão](/revisao)');
  });

  it('não promete emprego nem fluência, e diz o que dá para acompanhar', () => {
    const emprego = planoDeSessao(pedido({ minutos: 30, promessa: 'emprego' }));
    expect(emprego).toMatch(/^Não dá para garantir emprego nem prazo/);
    const fluencia = planoDeSessao(pedido({ minutos: 30, promessa: 'fluencia' }));
    expect(fluencia).toMatch(/^Não dá para prometer fluência nem prazo/);
    expect(fluencia).toContain('entender a documentação de uma função sem tradutor');
  });

  it('é curto: até 100 palavras; com todos os avisos juntos, até 150 (o limite da avaliação do tutor)', () => {
    const palavras = (plano: string) => plano.replace(/\]\([^)]*\)/g, ']').split(/\s+/).filter((w) => /[\p{L}\d]/u.test(w)).length;
    for (let m = 1; m <= 120; m++)
      for (const celular of [false, true]) for (const comBase of [false, true]) expect(palavras(planoDeSessao(pedido({ minutos: m, celular, comBase }))), `${m} min`).toBeLessThanOrEqual(100);
    const tudo = planoDeSessao(pedido({ minutos: 200, celular: true, repete: true, promessa: 'emprego' }), { tema: { id: 'l1-funcoes', title: 'Funções' } });
    expect(palavras(tudo)).toBeLessThanOrEqual(150);
  });
});
