/**
 * Transição da promessa de acesso gratuito.
 *
 * Desde 07/10/2026, a página /planos da demonstração pública dizia que a trilha
 * inteira (níveis 0 a 14) ficaria gratuita para sempre, em qualquer plano. A
 * estratégia vigente libera só os níveis 0 e 1. Este módulo responde a uma
 * pergunta: este progresso tem atividade nos níveis 2 a 14, e de quando?
 *
 * Serve só para INFORMAR (mostrar um aviso, contar contas afetadas). Nunca
 * autoriza nada: o progresso vem do cliente, pode ser importado ou editado, e
 * não prova quem estudou. Acesso a conteúdo pago continua decidido apenas pelo
 * servidor, pela assinatura ativa no banco.
 *
 * Funções puras: nada de localStorage, rede ou relógio aqui.
 */
import type { ProgressState } from './progress.ts';

/** Configuração única da transição (data de corte, anúncio e aviso), como o Arthur decidiu. */
export interface ConfigTransicao {
  /** Quando /planos passou a dizer que a trilha inteira ficaria gratuita para sempre (commit d46f468). */
  readonly promessaPublicadaEm: string;
  /** Quando a estratégia nova (0 e 1 gratuitos, 2 a 14 por assinatura) foi registrada na cópia. */
  readonly estrategiaRegistradaEm: string;
  /** Quando o Arthur confirmou a estratégia nova. */
  readonly estrategiaConfirmadaEm: string;
  /**
   * Data de corte, no formato AAAA-MM-DD, contada a partir de 00:00 no horário de
   * Brasília: a data em que os níveis 2 a 14 deixam de ficar abertos no site
   * público. Atividade anterior a ela foi feita sob a promessa antiga.
   * null = ainda não decidida.
   */
  readonly corte: string | null;
  /**
   * Quando a mudança foi anunciada no site, antes do corte (AAAA-MM-DD). Com a
   * carência, a promessa antiga saiu do ar nessa data, e os níveis 2 a 14 ficaram
   * abertos até a véspera do corte. null = anunciada no próprio dia do corte.
   */
  readonly anunciadaEm?: string | null;
  /** Liga o aviso único. Sem uma data de corte válida, o aviso continua desligado. */
  readonly avisoLigado: boolean;
}

export const TRANSICAO_ACESSO: ConfigTransicao = {
  promessaPublicadaEm: '2026-10-07',
  estrategiaRegistradaEm: '2026-10-10',
  estrategiaConfirmadaEm: '2026-10-13',
  // Carência de 30 dias, decidida pelo Arthur em 20/10/2026: o aviso de que ia mudar
  // foi publicado em 20/10, e esta versão vai ao ar no corte, 20/11/2026.
  anunciadaEm: '2026-10-20',
  corte: '2026-11-20',
  avisoLigado: true,
};

/** Níveis que a promessa antiga dizia gratuitos e que a estratégia nova põe na assinatura. */
export const NIVEIS_DA_TRANSICAO = { primeiro: 2, ultimo: 14 } as const;

const DATA = /^(\d{4})-(\d{2})-(\d{2})$/;
/** Brasília está em UTC−3 o ano todo desde 2019 (sem horário de verão). */
const BRASILIA_UTC_OFFSET_H = 3;

/** "2026-10-20" → instante de 20/10/2026 00:00 em Brasília; formato ou data inválidos → null. */
export function instanteDoCorte(corte: string | null | undefined): number | null {
  const m = corte ? DATA.exec(corte) : null;
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = Date.UTC(y, mo - 1, d, BRASILIA_UTC_OFFSET_H);
  const back = new Date(t - BRASILIA_UTC_OFFSET_H * 3_600_000);
  // rejeita 2026-02-30 e afins (o Date "corrige" para março)
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return null;
  return t;
}

/** O aviso só aparece com a chave ligada E uma data de corte válida. */
export function avisoDeTransicaoAtivo(cfg: ConfigTransicao): boolean {
  return cfg.avisoLigado === true && instanteDoCorte(cfg.corte) !== null;
}

/* ---------------- índice de níveis ---------------- */

/** Só os metadados: ids e números de nível. Não precisa do texto das aulas pagas. */
export interface EstruturaDeNiveis {
  number: number;
  modules: Array<{ id: string; lessons: Array<{ id: string; exerciseIds?: readonly string[] }> }>;
}

export interface IndiceDeNiveis {
  readonly licao: ReadonlyMap<string, number>;
  readonly modulo: ReadonlyMap<string, number>;
  readonly exercicio: ReadonlyMap<string, number>;
}

export function indiceDeNiveis(levels: readonly EstruturaDeNiveis[]): IndiceDeNiveis {
  const licao = new Map<string, number>();
  const modulo = new Map<string, number>();
  const exercicio = new Map<string, number>();
  for (const l of levels)
    for (const m of l.modules) {
      modulo.set(m.id, l.number);
      for (const s of m.lessons) {
        licao.set(s.id, l.number);
        for (const e of s.exerciseIds ?? []) exercicio.set(e, l.number);
      }
    }
  return { licao, modulo, exercicio };
}

/**
 * Padrão dos ids da trilha: lições "l7-…", módulos "m7-…", exercícios "e7-…".
 * Um teste confere que o padrão bate com os metadados em todas as 111 lições.
 * Usado só quando o id não está no índice (por exemplo, quando o conteúdo pago
 * não está neste repositório); o resultado conta quantos níveis vieram daqui.
 */
const CONVENCAO = { licao: /^l(\d{1,2})-/, modulo: /^m(\d{1,2})-/, exercicio: /^e(\d{1,2})-/ } as const;

type Tipo = keyof typeof CONVENCAO;
interface Nivel {
  nivel: number;
  porConvencao: boolean;
}

function nivelDe(indice: IndiceDeNiveis, tipo: Tipo, id: string): Nivel | null {
  const conhecido = indice[tipo].get(id);
  if (conhecido !== undefined) return { nivel: conhecido, porConvencao: false };
  const m = CONVENCAO[tipo].exec(id);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 0 && n <= 14 ? { nivel: n, porConvencao: true } : null;
}

/** Cartões e revisões usam "idDaLicao#n". */
const licaoDoCartao = (cardId: string) => cardId.split('#')[0] ?? '';

/* ---------------- atividade nos níveis 2 a 14 ---------------- */

export interface OpcoesAtividade {
  /** Instante de corte (ms). Atividade datada nesse instante ou depois não conta. null/omitido: sem corte. */
  corte?: number | null;
  /**
   * Lições só visitadas não têm data. No site com a estratégia nova, quem não tem
   * assinatura não consegue abrir uma aula paga, então uma visita a aula paga no
   * progresso de visitante veio do período aberto. Padrão: contam (true).
   */
  contarVisitasSemData?: boolean;
}

export interface AtividadeNosNiveisPagos {
  /** Há atividade nos níveis 2 a 14 que conta (datada antes do corte, ou visita sem data se contarem). */
  temAtividade: boolean;
  /** Níveis com atividade que conta, em ordem. */
  niveis: number[];
  /** Registros datados que contam: tentativas, lições concluídas, revisões, módulos-roteiro concluídos. */
  datadas: number;
  /** Lições pagas só visitadas (sem data), contem ou não. */
  visitasSemData: number;
  /** Registros datados nos níveis 2 a 14 que ficaram de fora por serem do corte em diante. */
  depoisDoCorte: number;
  /** Primeira e última atividade datada que conta (ms). */
  primeiraEm: number | null;
  ultimaEm: number | null;
  /** Quantos registros que contam tiveram o nível deduzido pelo padrão do id. */
  porConvencao: number;
}

const ehNivelPago = (n: number) => n >= NIVEIS_DA_TRANSICAO.primeiro && n <= NIVEIS_DA_TRANSICAO.ultimo;

/**
 * Conta atividade de estudo nos níveis 2 a 14: tentativas de exercício, lições
 * visitadas ou concluídas, revisões de cartão e módulos-roteiro marcados como
 * concluídos. Não conta: cartões só inscritos (o diagnóstico inscreve sem
 * estudo), módulos dispensados pelo diagnóstico, desbloqueios forçados,
 * projetos e entrevistas (são recursos abertos) nem o diagnóstico em si.
 */
export function atividadeNosNiveisPagos(p: ProgressState, indice: IndiceDeNiveis, opcoes: OpcoesAtividade = {}): AtividadeNosNiveisPagos {
  const corte = opcoes.corte ?? null;
  const contarSemData = opcoes.contarVisitasSemData ?? true;
  const niveis = new Set<number>();
  let datadas = 0;
  let visitasSemData = 0;
  let depoisDoCorte = 0;
  let porConvencao = 0;
  let primeiraEm: number | null = null;
  let ultimaEm: number | null = null;

  const datada = (n: Nivel | null, at: unknown) => {
    if (!n || !ehNivelPago(n.nivel) || typeof at !== 'number' || !Number.isFinite(at)) return;
    if (corte !== null && at >= corte) {
      depoisDoCorte++;
      return;
    }
    datadas++;
    niveis.add(n.nivel);
    if (n.porConvencao) porConvencao++;
    primeiraEm = primeiraEm === null ? at : Math.min(primeiraEm, at);
    ultimaEm = ultimaEm === null ? at : Math.max(ultimaEm, at);
  };

  for (const a of p.attempts) datada(nivelDe(indice, 'exercicio', a.exerciseId), a.at);
  for (const r of p.reviews) datada(nivelDe(indice, 'licao', licaoDoCartao(r.cardId)), r.at);
  for (const [id, at] of Object.entries(p.modulesDone)) datada(nivelDe(indice, 'modulo', id), at);
  for (const [id, l] of Object.entries(p.lessons)) {
    const n = nivelDe(indice, 'licao', id);
    if (l.completedAt !== undefined) datada(n, l.completedAt);
    else if (n && ehNivelPago(n.nivel) && l.visited.length > 0) {
      visitasSemData++;
      if (contarSemData) {
        niveis.add(n.nivel);
        if (n.porConvencao) porConvencao++;
      }
    }
  }

  return {
    temAtividade: datadas > 0 || (contarSemData && visitasSemData > 0),
    niveis: [...niveis].sort((a, b) => a - b),
    datadas,
    visitasSemData,
    depoisDoCorte,
    primeiraEm,
    ultimaEm,
    porConvencao,
  };
}
