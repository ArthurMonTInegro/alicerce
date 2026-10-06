/**
 * Diagnóstico inicial: pontua cada área e gera uma trilha recomendada.
 *
 * O teste é adaptativo de forma simples: em cada área começamos pelo item de
 * dificuldade média; acertar sobe a dificuldade, errar desce. Isso reduz o
 * número de perguntas para quem é iniciante (não frustra) e para quem já sabe
 * (não entedia).
 */

export type DiagnosticArea = 'computacao' | 'logica' | 'programacao' | 'matematica' | 'ingles';

export interface DiagnosticItemMeta {
  id: string;
  area: DiagnosticArea;
  level: 1 | 2 | 3;
}

export interface DiagnosticAnswer {
  itemId: string;
  correct: boolean;
}

export interface AreaResult {
  area: DiagnosticArea;
  score: number; // 0..1
  answered: number;
  band: 'iniciante' | 'basico' | 'intermediario' | 'avancado';
}

export const AREAS: DiagnosticArea[] = ['computacao', 'logica', 'programacao', 'matematica', 'ingles'];
export const ITEMS_PER_AREA = 4;

/** Escolhe o próximo item da área, dado o histórico (adaptativo). */
export function nextItem<T extends DiagnosticItemMeta>(
  pool: readonly T[],
  area: DiagnosticArea,
  answers: readonly DiagnosticAnswer[],
): T | null {
  const areaItems = pool.filter((i) => i.area === area);
  const answeredIds = new Set(answers.map((a) => a.itemId));
  const history = answers.filter((a) => areaItems.some((i) => i.id === a.itemId));
  if (history.length >= ITEMS_PER_AREA) return null;

  let target: 1 | 2 | 3 = 2;
  const last = history.at(-1);
  if (last) {
    const lastItem = areaItems.find((i) => i.id === last.itemId)!;
    target = (last.correct ? Math.min(3, lastItem.level + 1) : Math.max(1, lastItem.level - 1)) as 1 | 2 | 3;
  }
  const remaining = areaItems.filter((i) => !answeredIds.has(i.id));
  if (remaining.length === 0) return null;
  // item mais próximo do nível alvo
  return [...remaining].sort((a, b) => Math.abs(a.level - target) - Math.abs(b.level - target))[0] ?? null;
}

export function scoreAreas(pool: readonly DiagnosticItemMeta[], answers: readonly DiagnosticAnswer[]): AreaResult[] {
  const byId = new Map(pool.map((i) => [i.id, i]));
  return AREAS.map((area) => {
    let got = 0;
    let max = 0;
    let answered = 0;
    for (const a of answers) {
      const item = byId.get(a.itemId);
      if (!item || item.area !== area) continue;
      answered++;
      max += item.level;
      if (a.correct) got += item.level;
    }
    // sem respostas => 0; itens difíceis valem mais
    const score = max === 0 ? 0 : got / max;
    const band: AreaResult['band'] =
      score >= 0.85 ? 'avancado' : score >= 0.6 ? 'intermediario' : score >= 0.3 ? 'basico' : 'iniciante';
    return { area, score, answered, band };
  });
}

export interface PlacementRule {
  /** módulo que pode ser dispensado */
  moduleId: string;
  /** todas as áreas devem atingir a pontuação mínima */
  requires: Partial<Record<DiagnosticArea, number>>;
}

/** Módulos dispensados pelo diagnóstico. Conservador: na dúvida, o estudante faz o módulo. */
export function testedOutModules(results: readonly AreaResult[], rules: readonly PlacementRule[]): string[] {
  const score = new Map(results.map((r) => [r.area, r.score]));
  return rules
    .filter((r) => Object.entries(r.requires).every(([area, min]) => (score.get(area as DiagnosticArea) ?? 0) >= min!))
    .map((r) => r.moduleId);
}
