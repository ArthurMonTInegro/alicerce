/**
 * Ponto de entrada para quem escreve lições: tipos, helpers de redação e as
 * funções de montagem. É o único módulo público que o repositório privado
 * (níveis 2 a 14) importa — por isso não pode depender do currículo em si.
 *
 *   import { lesson, md, py, type Level } from '@alicerce/content/autoria';
 */
export * from './types.ts';
export * from './helpers.ts';
export type { TheoryExpansion } from './theory-types.ts';
export { SETUP_ESCOLA } from './sql-setup.ts';
export { attachAutonomy, deepenLevels } from './montagem.ts';
