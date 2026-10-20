/** Funções comuns aos scripts de scripts/premium. */
import { toLessonTerms, toLevelMeta } from '../../packages/content/src/catalog.ts';
import type { Level } from '../../packages/content/src/types.ts';

/** JSON com chaves ordenadas: compara estruturas sem depender da ordem das chaves. */
export const canon = (v: unknown): string =>
  JSON.stringify(v, (_k, x: unknown) =>
    x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) : x,
  );

export const CATALOGO_PAGO = 'packages/content/src/catalogo-pago.ts';

/**
 * Texto de packages/content/src/catalogo-pago.ts: o mapa público (só metadados)
 * dos níveis pagos e os termos do glossário dessas lições.
 */
export function gerarCatalogoPago(paid: Level[]): string {
  const levels = paid.map(toLevelMeta);
  const terms = toLessonTerms(paid);
  return [
    '/**',
    ' * Mapa público dos níveis pagos (2 a 14): estrutura, títulos, resumos, habilidades,',
    ' * etapas e ids de exercícios e cartões. Nenhum enunciado, solução, dica, teste,',
    ' * explicação, cartão ou aprofundamento: isso fica no repositório privado.',
    ' * Os termos PT → EN alimentam o glossário, que é recurso aberto (ver /planos).',
    ' *',
    ' * GERADO por scripts/premium/metadados.ts a partir do repositório privado. Não edite à mão.',
    ' */',
    "import type { LessonTerms, LevelMeta } from './types.ts';",
    '',
    `export const paidCatalog: LevelMeta[] = ${JSON.stringify(levels, null, 1)};`,
    '',
    `export const paidTerms: LessonTerms[] = ${JSON.stringify(terms, null, 1)};`,
    '',
  ].join('\n');
}
