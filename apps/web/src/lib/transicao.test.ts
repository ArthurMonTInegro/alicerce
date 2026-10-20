import { describe, expect, it, vi } from 'vitest';
import { emptyProgress, instanteDoCorte, TRANSICAO_ACESSO, type AttemptRecord, type ConfigTransicao, type ProgressState } from '@alicerce/engine';
import catalogo from '../generated/catalog.json';
import {
  CHAVE_AVISO_FECHADO,
  CHAVES_DE_VISITANTE,
  dataPorExtenso,
  datasDaTransicao,
  deveMostrarAviso,
  indiceDoCatalogo,
  progressoDeVisitante,
  registrarAvisoFechado,
  rotaSemAviso,
  type NivelDoCatalogo,
} from './transicao.ts';

const levels = (catalogo as unknown as { levels: NivelDoCatalogo[] }).levels;
const indice = indiceDoCatalogo(levels);
const LIGADO: ConfigTransicao = { ...TRANSICAO_ACESSO, avisoLigado: true, corte: '2026-10-20' };
const CORTE = instanteDoCorte('2026-10-20')!;
const DIA = 86_400_000;

const tentativa = (exerciseId: string, at: number): AttemptRecord => ({
  exerciseId, skills: ['s'], difficulty: 'facil', correct: true, score: 1, hintsUsed: 0, wrongTries: 0, revealed: false, at,
});
const json = (f: (p: ProgressState) => void) => {
  const p = emptyProgress();
  f(p);
  return JSON.stringify(p);
};
/** localStorage de mentira, com as mesmas falhas que o navegador pode ter. */
function memoria(inicial: Record<string, string> = {}) {
  const dados = { ...inicial };
  return {
    dados,
    getItem: (k: string) => dados[k] ?? null,
    setItem: (k: string, v: string) => void (dados[k] = v),
  };
}
const bloqueado = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
};

// um exercício pago (nível 2) e um gratuito (nível 1) do catálogo de verdade
const exPago = levels.find((l) => l.number === 2)!.modules[0]!.lessons[0]!.exercises[0]!.id;
const exGratis = levels.find((l) => l.number === 1)!.modules[0]!.lessons[0]!.exercises[0]!.id;

describe('indiceDoCatalogo (catálogo público)', () => {
  it('cobre todas as lições e todos os módulos, e o nível bate com o padrão dos ids', () => {
    let licoes = 0;
    for (const l of levels)
      for (const m of l.modules) {
        expect(indice.modulo.get(m.id)).toBe(l.number);
        for (const s of m.lessons) {
          licoes++;
          expect(indice.licao.get(s.id)).toBe(l.number);
          for (const e of s.exercises) expect(indice.exercicio.get(e.id)).toBe(l.number);
        }
      }
    expect(indice.licao.size).toBe(licoes);
    expect(licoes).toBeGreaterThan(100);
    expect(exPago).toMatch(/^e2-/);
    expect(exGratis).toMatch(/^e1-/);
  });
});

describe('progressoDeVisitante', () => {
  it('junta a cópia da demo publicada (v1) com a da versão atual (v2:guest)', () => {
    const arm = memoria({
      'alicerce:progresso:v1': json((p) => p.attempts.push(tentativa(exPago, CORTE - 5 * DIA))),
      'alicerce:progresso:v2:guest': json((p) => p.attempts.push(tentativa(exGratis, CORTE - DIA))),
    });
    expect(CHAVES_DE_VISITANTE).toEqual(['alicerce:progresso:v1', 'alicerce:progresso:v2:guest']);
    expect(progressoDeVisitante(arm).attempts.map((a) => a.exerciseId).sort()).toEqual([exGratis, exPago].sort());
  });

  it('não lê progresso de conta logada e ignora cópia ilegível ou armazenamento bloqueado', () => {
    const arm = memoria({
      'alicerce:progresso:v1': '{quebrado',
      'alicerce:progresso:v2:user:A': json((p) => p.attempts.push(tentativa(exPago, CORTE - DIA))),
    });
    expect(progressoDeVisitante(arm).attempts).toEqual([]);
    expect(progressoDeVisitante(bloqueado).attempts).toEqual([]);
  });
});

describe('deveMostrarAviso', () => {
  const comAtividadePaga = () => memoria({ 'alicerce:progresso:v1': json((p) => p.attempts.push(tentativa(exPago, CORTE - 3 * DIA))) });

  it('com o aviso desligado nunca aparece, e nem lê o progresso', () => {
    const arm = comAtividadePaga();
    const getItem = vi.fn(arm.getItem);
    const montarIndice = vi.fn(() => indice);
    expect(deveMostrarAviso({ getItem }, montarIndice, { ...TRANSICAO_ACESSO, avisoLigado: false })).toBe(false);
    expect(getItem).not.toHaveBeenCalled();
    expect(montarIndice).not.toHaveBeenCalled();
  });

  it('ligada: aparece para quem tem atividade nos níveis 2 a 14 antes do corte', () => {
    expect(deveMostrarAviso(comAtividadePaga(), () => indice, LIGADO)).toBe(true);
  });

  it('não aparece para quem só estudou os níveis 0 e 1, nem para quem começou nos pagos depois do corte', () => {
    const gratis = memoria({ 'alicerce:progresso:v1': json((p) => p.attempts.push(tentativa(exGratis, CORTE - 3 * DIA))) });
    const depois = memoria({ 'alicerce:progresso:v2:guest': json((p) => p.attempts.push(tentativa(exPago, CORTE + DIA))) });
    expect(deveMostrarAviso(gratis, () => indice, LIGADO)).toBe(false);
    expect(deveMostrarAviso(depois, () => indice, LIGADO)).toBe(false);
    expect(deveMostrarAviso(memoria(), () => indice, LIGADO)).toBe(false);
  });

  it('não volta depois de fechado, e o índice nem é montado', () => {
    const arm = comAtividadePaga();
    expect(registrarAvisoFechado(arm, CORTE + DIA)).toBe('aparelho');
    expect(arm.dados[CHAVE_AVISO_FECHADO]).toBe(String(CORTE + DIA));
    const montarIndice = vi.fn(() => indice);
    expect(deveMostrarAviso(arm, montarIndice, LIGADO)).toBe(false);
    expect(montarIndice).not.toHaveBeenCalled();
  });

  it('se o localStorage recusa gravar (cota cheia), lembra na sessão e não volta ao recarregar', () => {
    const progresso = comAtividadePaga();
    const cheio = { getItem: progresso.getItem, setItem: () => { throw new Error('QuotaExceededError'); } };
    const sessao = memoria();
    expect(deveMostrarAviso(cheio, () => indice, LIGADO, sessao)).toBe(true);
    expect(registrarAvisoFechado(cheio, CORTE + DIA, sessao)).toBe('sessao');
    expect(sessao.dados[CHAVE_AVISO_FECHADO]).toBe(String(CORTE + DIA));
    expect(deveMostrarAviso(cheio, () => indice, LIGADO, sessao)).toBe(false);
    // sessionStorage bloqueado também: não grava em lugar nenhum, e a leitura não quebra
    expect(registrarAvisoFechado(cheio, 1, bloqueado)).toBeNull();
    expect(deveMostrarAviso(cheio, () => indice, LIGADO, bloqueado)).toBe(true);
  });

  it('sem armazenamento não mostra (não daria para lembrar que foi fechado)', () => {
    expect(deveMostrarAviso(bloqueado, () => indice, LIGADO)).toBe(false);
    expect(registrarAvisoFechado(bloqueado, 1)).toBeNull();
  });

  it('chave ligada sem data de corte válida continua desligada', () => {
    expect(deveMostrarAviso(comAtividadePaga(), () => indice, { ...LIGADO, corte: null })).toBe(false);
    expect(deveMostrarAviso(comAtividadePaga(), () => indice, { ...LIGADO, corte: '20/10/2026' })).toBe(false);
  });
});

describe('rotaSemAviso', () => {
  it('esconde o aviso em /planos, inclusive com a barra final que o GitHub Pages acrescenta', () => {
    expect(rotaSemAviso('/planos')).toBe(true);
    expect(rotaSemAviso('/planos/')).toBe(true);
    expect(rotaSemAviso('/')).toBe(false);
    expect(rotaSemAviso('/progresso')).toBe(false);
    expect(rotaSemAviso('/planos-antigos')).toBe(false);
  });
});

describe('datas por extenso', () => {
  it('escreve as datas como no texto da página', () => {
    expect(dataPorExtenso('2026-10-07')).toBe('7 de outubro de 2026');
    expect(dataPorExtenso('2026-11-01')).toBe('1º de novembro de 2026');
    expect(dataPorExtenso('qualquer')).toBe('qualquer');
  });

  it('sem corte decidido, o corte é null; com corte, vem por extenso', () => {
    expect(datasDaTransicao()).toEqual({ promessa: '7 de outubro de 2026', decisao: '13 de outubro de 2026', corte: '20 de novembro de 2026', anuncio: '20 de outubro de 2026', abertoAte: '19 de novembro de 2026' });
    expect(datasDaTransicao({ ...TRANSICAO_ACESSO, corte: null })).toEqual({ promessa: '7 de outubro de 2026', decisao: '13 de outubro de 2026', corte: null, anuncio: null, abertoAte: null });
    // anúncio no dia do corte (ou depois) não é carência
    expect(datasDaTransicao({ ...TRANSICAO_ACESSO, anunciadaEm: '2026-11-20' })).toMatchObject({ anuncio: null, abertoAte: null });
    // virada de mês e de ano na véspera
    expect(datasDaTransicao({ ...TRANSICAO_ACESSO, anunciadaEm: '2026-12-01', corte: '2027-01-01' }).abertoAte).toBe('31 de dezembro de 2026');
    expect(datasDaTransicao(LIGADO).corte).toBe('20 de outubro de 2026');
    expect(datasDaTransicao({ ...LIGADO, corte: '2026-02-30' }).corte).toBeNull();
  });
});
