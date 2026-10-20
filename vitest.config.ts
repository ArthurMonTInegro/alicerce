import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // O repositório privado (conteúdo pago) pode estar fora desta árvore (ALICERCE_PREMIUM_DIR):
  // os imports '@alicerce/content/autoria' dos arquivos dele apontam para este pacote.
  resolve: { alias: [{ find: /^@alicerce\/content\/autoria$/, replacement: fileURLToPath(new URL('./packages/content/src/autoria.ts', import.meta.url)) }] },
  test: { exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**', 'premium/**'] },
});
