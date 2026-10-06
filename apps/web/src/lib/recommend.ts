import { moduleById, placementRules } from '@alicerce/content';
import { testedOutModules, type AreaResult, type DiagnosticArea } from '@alicerce/engine';

export interface Recommendation {
  start: string; // módulo
  testedOut: string[];
  notes: string[];
}

export const AREA_LABEL: Record<DiagnosticArea, string> = {
  computacao: 'Fundamentos de computação',
  logica: 'Lógica',
  programacao: 'Programação',
  matematica: 'Matemática',
  ingles: 'Inglês técnico',
};
export const BAND_LABEL: Record<AreaResult['band'], string> = { iniciante: 'Iniciante', basico: 'Básico', intermediario: 'Intermediário', avancado: 'Avançado' };

/** Regras simples e explicáveis: o estudante vê por que recebeu cada recomendação. */
export function recommend(results: AreaResult[]): Recommendation {
  const band = (a: DiagnosticArea) => results.find((r) => r.area === a)!.band;
  const testedOut = testedOutModules(results, placementRules);
  const notes: string[] = [];
  let start = 'm0-1';
  const prog = band('programacao');
  const log = band('logica');
  if (prog === 'avancado' && log !== 'iniciante' && log !== 'basico') {
    start = 'm2-1';
    notes.push('Você já programa: comece pelo Nível 2 (Python a fundo) e siga para Estruturas de Dados. Os módulos introdutórios ficam dispensados, mas os cartões deles entram na sua revisão.');
  } else if (prog === 'intermediario' || prog === 'avancado') {
    start = 'm1-3';
    notes.push('Você tem base de programação. Comece por Condicionais (Nível 1) para firmar a lógica antes do Python a fundo.');
  } else if (band('computacao') === 'avancado' || band('computacao') === 'intermediario') {
    start = 'm1-1';
    notes.push('Você entende bem como o computador funciona. Comece pelo Nível 1, Lógica de Programação.');
  } else {
    notes.push('Comece do início, pelo Nível 0: entender como o computador funciona por dentro torna todo o resto mais fácil.');
  }
  if (band('ingles') === 'iniciante' || band('ingles') === 'basico')
    notes.push('Inglês: faça o módulo "Inglês técnico" (Nível 0) logo no começo e use o Glossário com pronúncia. Toda lição traz os termos português → inglês, e isso vai somando.');
  if (band('matematica') === 'iniciante' || band('matematica') === 'basico')
    notes.push('Matemática: estude o módulo "Lógica e conjuntos" (Nível 14) em paralelo com os Níveis 1 e 2. A matemática da trilha é ensinada a partir do zero, com código.');
  if (log === 'iniciante') notes.push('Lógica: dedique tempo extra aos exercícios de "prever a saída" e ao passo a passo. Resolver problemas é uma habilidade treinável.');
  if (!testedOut.length) notes.push('Nenhum módulo foi dispensado: o diagnóstico é conservador e, na dúvida, prefere que você reveja.');
  if (!moduleById.has(start)) start = 'm0-1';
  return { start, testedOut, notes };
}
