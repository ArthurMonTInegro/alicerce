import { describe, expect, it } from 'vitest';
import { emptyProgress, type AttemptRecord, type ProgressState } from './progress.ts';
import { FREE_MAX_LEVEL } from './plans.ts';
import {
  atividadeNosNiveisPagos,
  avisoDeTransicaoAtivo,
  indiceDeNiveis,
  instanteDoCorte,
  NIVEIS_DA_TRANSICAO,
  TRANSICAO_ACESSO,
} from './transicao.ts';

const indice = indiceDeNiveis([
  { number: 1, modules: [{ id: 'm1-2', lessons: [{ id: 'l1-variaveis', exerciseIds: ['e1-var-1'] }] }] },
  { number: 2, modules: [{ id: 'm2-1', lessons: [{ id: 'l2-ficticia', exerciseIds: ['e2-py-1'] }] }] },
  { number: 7, modules: [{ id: 'm7-1', lessons: [{ id: 'l7-ficticia', exerciseIds: ['e7-sql-1'] }] }] },
  // módulo-roteiro, sem lições
  { number: 12, modules: [{ id: 'm12-1', lessons: [] }] },
]);

const CORTE = Date.UTC(2026, 9, 20, 3); // 20/10/2026 00:00 em Brasília
const ANTES = CORTE - 86_400_000;
const DEPOIS = CORTE + 86_400_000;

const tentativa = (exerciseId: string, at: number): AttemptRecord => ({
  exerciseId, skills: ['s'], difficulty: 'facil', correct: true, score: 1, hintsUsed: 0, wrongTries: 0, revealed: false, at,
});
function progresso(f: (p: ProgressState) => void): ProgressState {
  const p = emptyProgress();
  f(p);
  return p;
}

describe('configuração da transição', () => {
  it('vem desligada e sem data de corte: o aviso não aparece até o Arthur decidir', () => {
    expect(TRANSICAO_ACESSO.avisoLigado).toBe(false);
    expect(TRANSICAO_ACESSO.corte).toBeNull();
    expect(avisoDeTransicaoAtivo(TRANSICAO_ACESSO)).toBe(false);
  });

  it('o aviso exige a chave ligada E uma data válida', () => {
    expect(avisoDeTransicaoAtivo({ ...TRANSICAO_ACESSO, avisoLigado: true, corte: null })).toBe(false);
    expect(avisoDeTransicaoAtivo({ ...TRANSICAO_ACESSO, avisoLigado: true, corte: '20/10/2026' })).toBe(false);
    expect(avisoDeTransicaoAtivo({ ...TRANSICAO_ACESSO, avisoLigado: false, corte: '2026-10-20' })).toBe(false);
    expect(avisoDeTransicaoAtivo({ ...TRANSICAO_ACESSO, avisoLigado: true, corte: '2026-10-20' })).toBe(true);
  });

  it('as datas registradas são as do histórico', () => {
    expect(TRANSICAO_ACESSO).toMatchObject({ promessaPublicadaEm: '2026-10-07', estrategiaRegistradaEm: '2026-10-10', estrategiaConfirmadaEm: '2026-10-13' });
  });

  it('a faixa da transição é a dos níveis que deixaram de ser gratuitos', () => {
    expect(NIVEIS_DA_TRANSICAO).toEqual({ primeiro: FREE_MAX_LEVEL + 1, ultimo: 14 });
  });
});

describe('instanteDoCorte', () => {
  it('lê AAAA-MM-DD como meia-noite de Brasília (UTC−3)', () => {
    expect(instanteDoCorte('2026-10-20')).toBe(CORTE);
    expect(new Date(instanteDoCorte('2026-10-20')!).toISOString()).toBe('2026-10-20T03:00:00.000Z');
  });
  it('recusa formato ambíguo, data impossível e vazio', () => {
    for (const s of ['2026-10-20T10:00', '20/10/2026', '2026-02-30', '2026-13-01', '', null, undefined]) expect(instanteDoCorte(s)).toBeNull();
  });
});

describe('atividadeNosNiveisPagos', () => {
  it('progresso vazio ou só nos níveis 0 e 1 não tem atividade paga', () => {
    expect(atividadeNosNiveisPagos(emptyProgress(), indice).temAtividade).toBe(false);
    const gratis = progresso((p) => {
      p.attempts.push(tentativa('e1-var-1', ANTES));
      p.lessons['l1-variaveis'] = { visited: ['conceito'], completedAt: ANTES };
      p.reviews.push({ cardId: 'l1-variaveis#1', grade: 3, at: ANTES });
    });
    expect(atividadeNosNiveisPagos(gratis, indice, { corte: CORTE })).toMatchObject({ temAtividade: false, datadas: 0, niveis: [] });
  });

  it('conta tentativas, lições concluídas, revisões e módulos-roteiro dos níveis 2 a 14, com primeira e última data', () => {
    const p = progresso((p) => {
      p.attempts.push(tentativa('e2-py-1', ANTES - 5000));
      p.lessons['l7-ficticia'] = { visited: ['conceito'], completedAt: ANTES - 1000 };
      p.reviews.push({ cardId: 'l7-ficticia#2', grade: 4, at: ANTES });
      p.modulesDone['m12-1'] = ANTES - 3000;
    });
    expect(atividadeNosNiveisPagos(p, indice, { corte: CORTE })).toEqual({
      temAtividade: true, niveis: [2, 7, 12], datadas: 4, visitasSemData: 0, depoisDoCorte: 0, primeiraEm: ANTES - 5000, ultimaEm: ANTES, porConvencao: 0,
    });
  });

  it('atividade do corte em diante não conta (quem começou depois já viu a regra nova)', () => {
    const p = progresso((p) => {
      p.attempts.push(tentativa('e2-py-1', DEPOIS), tentativa('e7-sql-1', CORTE));
      p.lessons['l7-ficticia'] = { visited: ['conceito'], completedAt: DEPOIS };
    });
    const r = atividadeNosNiveisPagos(p, indice, { corte: CORTE });
    expect(r).toMatchObject({ temAtividade: false, datadas: 0, depoisDoCorte: 3, primeiraEm: null });
    // sem corte, a mesma atividade conta
    expect(atividadeNosNiveisPagos(p, indice).datadas).toBe(3);
  });

  it('visitas sem data contam por padrão e podem ser ignoradas', () => {
    const p = progresso((p) => {
      p.lessons['l2-ficticia'] = { visited: ['conceito', 'explicacao'] };
      p.lessons['l1-variaveis'] = { visited: ['conceito'] };
    });
    expect(atividadeNosNiveisPagos(p, indice, { corte: CORTE })).toMatchObject({ temAtividade: true, niveis: [2], visitasSemData: 1, datadas: 0 });
    expect(atividadeNosNiveisPagos(p, indice, { corte: CORTE, contarVisitasSemData: false })).toMatchObject({ temAtividade: false, niveis: [], visitasSemData: 1 });
    // entrada de lição sem nenhuma etapa visitada não é atividade
    const vazia = progresso((p) => (p.lessons['l7-ficticia'] = { visited: [] }));
    expect(atividadeNosNiveisPagos(vazia, indice).temAtividade).toBe(false);
  });

  it('não conta o que não é estudo: cartões só inscritos, dispensa do diagnóstico, desbloqueio forçado, projetos, entrevistas', () => {
    const p = progresso((p) => {
      p.cards['l7-ficticia#1'] = { stability: 0, difficulty: 0, reps: 0, lapses: 0, lastReview: 0, due: ANTES };
      p.testedOut['m7-1'] = ANTES;
      p.forced['m7-1'] = ANTES;
      p.projects['p2-todo'] = { milestones: [0], updatedAt: ANTES };
      p.interviews['q1'] = { hits: [0], at: ANTES };
      p.diagnostic = { answers: [], results: [], at: ANTES };
    });
    expect(atividadeNosNiveisPagos(p, indice, { corte: CORTE }).temAtividade).toBe(false);
  });

  it('id fora do índice usa o padrão do id (conteúdo pago ausente) e diz quantos foram deduzidos', () => {
    const p = progresso((p) => {
      p.attempts.push(tentativa('e9-dns-1', ANTES), tentativa('e1-desconhecido', ANTES), tentativa('inventado', ANTES), tentativa('e99-x', ANTES));
      p.reviews.push({ cardId: 'l14-probabilidade#1', grade: 3, at: ANTES });
    });
    expect(atividadeNosNiveisPagos(p, indice, { corte: CORTE })).toMatchObject({ temAtividade: true, niveis: [9, 14], datadas: 2, porConvencao: 2 });
  });

  it('ignora datas inválidas', () => {
    const p = progresso((p) => p.attempts.push(tentativa('e2-py-1', Number.NaN)));
    expect(atividadeNosNiveisPagos(p, indice).temAtividade).toBe(false);
  });
});
