/**
 * Transição da promessa de acesso gratuito, do lado do navegador.
 *
 * Quem usou a demonstração antes da data de corte tem o progresso só neste
 * aparelho (chave alicerce:progresso:v1, da demo publicada, e a cópia
 * alicerce:progresso:v2:guest que a versão nova grava ao continuar). Aqui se
 * decide se o aviso único aparece. A configuração (data de corte e chave do
 * aviso) mora num lugar só: TRANSICAO_ACESSO, em packages/engine/src/transicao.ts.
 *
 * Nada aqui libera conteúdo: o progresso local só decide se mostramos um texto.
 */
import {
  atividadeNosNiveisPagos,
  avisoDeTransicaoAtivo,
  emptyProgress,
  indiceDeNiveis,
  instanteDoCorte,
  mergeProgress,
  sanitizeProgress,
  TRANSICAO_ACESSO,
  type ConfigTransicao,
  type IndiceDeNiveis,
  type ProgressState,
} from '@alicerce/engine';

/** Formato mínimo do catálogo público (src/generated/catalog.json): só ids e números de nível. */
export interface NivelDoCatalogo {
  number: number;
  modules: ReadonlyArray<{ id: string; lessons: ReadonlyArray<{ id: string; exercises: ReadonlyArray<{ id: string }> }> }>;
}

/** Índice de níveis a partir do catálogo público. Usa só metadados, nunca o texto das aulas pagas. */
export function indiceDoCatalogo(levels: readonly NivelDoCatalogo[]): IndiceDeNiveis {
  return indiceDeNiveis(
    levels.map((l) => ({
      number: l.number,
      modules: l.modules.map((m) => ({ id: m.id, lessons: m.lessons.map((s) => ({ id: s.id, exerciseIds: s.exercises.map((e) => e.id) })) })),
    })),
  );
}

/** Progresso de visitante neste aparelho: o da demo publicada e o da versão atual. */
export const CHAVES_DE_VISITANTE = ['alicerce:progresso:v1', 'alicerce:progresso:v2:guest'] as const;
/** Gravada quando a pessoa fecha o aviso; com ela, o aviso não volta neste aparelho. */
export const CHAVE_AVISO_FECHADO = 'alicerce:aviso-transicao:fechado:v1';

export interface Armazenamento {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Junta as cópias de visitante com a mesma mescla do resto do app (um reinício prevalece). */
export function progressoDeVisitante(arm: Pick<Armazenamento, 'getItem'>): ProgressState {
  let p = emptyProgress();
  for (const chave of CHAVES_DE_VISITANTE) {
    try {
      const raw = arm.getItem(chave);
      if (raw) p = mergeProgress(p, sanitizeProgress(JSON.parse(raw)));
    } catch {
      /* cópia ilegível ou armazenamento bloqueado: ignora */
    }
  }
  return p;
}

/**
 * O aviso aparece só se: a chave estiver ligada com data de corte válida, a
 * pessoa ainda não o fechou neste aparelho (nem nesta aba, quando o navegador
 * não deixou gravar no localStorage e o registro foi para `sessao`), e o
 * progresso de visitante tiver atividade nos níveis 2 a 14 anterior ao corte.
 * O índice só é montado se as condições baratas passarem.
 */
export function deveMostrarAviso(
  arm: Pick<Armazenamento, 'getItem'>,
  indice: () => IndiceDeNiveis,
  cfg: ConfigTransicao = TRANSICAO_ACESSO,
  sessao: Pick<Armazenamento, 'getItem'> | null = null,
): boolean {
  if (!avisoDeTransicaoAtivo(cfg)) return false;
  try {
    if (arm.getItem(CHAVE_AVISO_FECHADO) !== null) return false;
  } catch {
    // sem armazenamento não há como lembrar que foi fechado, nem progresso para ler
    return false;
  }
  try {
    if (sessao?.getItem(CHAVE_AVISO_FECHADO) != null) return false;
  } catch {
    /* sessionStorage bloqueado: vale só o localStorage */
  }
  return atividadeNosNiveisPagos(progressoDeVisitante(arm), indice(), { corte: instanteDoCorte(cfg.corte) }).temAtividade;
}

/**
 * Registra que o aviso foi fechado. Se o localStorage recusar a gravação (cota
 * cheia, por exemplo), guarda na `sessao` (sessionStorage), para o aviso não
 * voltar ao recarregar a página. Devolve onde gravou, ou null se nenhum deixou.
 */
export function registrarAvisoFechado(
  arm: Pick<Armazenamento, 'setItem'>,
  agora: number,
  sessao: Pick<Armazenamento, 'setItem'> | null = null,
): 'aparelho' | 'sessao' | null {
  try {
    arm.setItem(CHAVE_AVISO_FECHADO, String(agora));
    return 'aparelho';
  } catch {
    try {
      if (!sessao) return null;
      sessao.setItem(CHAVE_AVISO_FECHADO, String(agora));
      return 'sessao';
    } catch {
      return null;
    }
  }
}

/**
 * /planos já tem a seção completa, então o aviso não aparece lá. Aceita a barra
 * no fim: o GitHub Pages redireciona /planos para /planos/ quando a página é
 * aberta direto (o HTML pré-renderizado mora em planos/index.html).
 */
export function rotaSemAviso(path: string): boolean {
  return path.replace(/\/+$/, '') === '/planos';
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** "2026-10-07" → "7 de outubro de 2026"; o dia 1 vira "1º". */
export function dataPorExtenso(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const mes = m ? MESES[Number(m[2]) - 1] : undefined;
  if (!m || !mes) return iso;
  const dia = Number(m[3]);
  return `${dia === 1 ? '1º' : dia} de ${mes} de ${m[1]}`;
}

/** Datas que os textos de /planos e do aviso mostram. `corte` é null enquanto não houver data decidida. */
export function datasDaTransicao(cfg: ConfigTransicao = TRANSICAO_ACESSO) {
  return {
    promessa: dataPorExtenso(cfg.promessaPublicadaEm),
    decisao: dataPorExtenso(cfg.estrategiaConfirmadaEm),
    corte: cfg.corte && instanteDoCorte(cfg.corte) !== null ? dataPorExtenso(cfg.corte) : null,
  };
}
