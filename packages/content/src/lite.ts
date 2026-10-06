/**
 * Ponto de entrada leve: tudo que NÃO depende do texto das lições.
 * O front-end importa daqui (e do catálogo gerado) para que o corpo das 69
 * lições não entre no JavaScript inicial; cada lição é baixada quando aberta.
 */
export * from './types.ts';
export * from './references.ts';
export * from './projects.ts';
export * from './diagnostic.ts';
export * from './interviews.ts';
export * from './research.ts';
export { SETUP_ESCOLA } from './sql-setup.ts';
export type { GlossaryEntry } from './glossary.ts';
