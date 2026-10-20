/**
 * Pacote público de conteúdo: o mapa do currículo inteiro (metadados) e o corpo
 * completo só dos níveis gratuitos. O conteúdo pago vem do repositório privado
 * por '@alicerce/content/completo' (Node: ferramentas e servidor).
 */
export * from './types.ts';
export * from './curriculum.ts';
export * from './catalog.ts';
export * from './references.ts';
export * from './projects.ts';
export * from './diagnostic.ts';
export * from './interviews.ts';
export * from './glossary.ts';
export { SETUP_ESCOLA } from './sql-setup.ts';
export * from './research.ts';
export * from './tutor-knowledge.ts';
export * from './access.ts';
