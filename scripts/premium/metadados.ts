/**
 * Gera packages/content/src/catalogo-pago.ts (mapa público dos níveis pagos) a
 * partir do repositório privado, para que os dois nunca divirjam.
 *
 *   node scripts/premium/metadados.ts             # regenera o arquivo
 *   node scripts/premium/metadados.ts --conferir  # só confere; sai com 1 se estiver desatualizado
 *
 * O diretório privado vem de ALICERCE_PREMIUM_DIR ou de <repositório>/premium.
 * Rode depois de mudar, no privado, título, resumo, minutos, habilidades,
 * referências, etapas, ids ou tipo de exercício, número de cartões ou termos.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { loadPaidLevels, PREMIUM_ENV, REPO_ROOT, resolvePremiumDir } from '../../packages/content/src/privado.ts';
import { CATALOGO_PAGO, gerarCatalogoPago } from './lib.ts';

const { values: opt } = parseArgs({ options: { conferir: { type: 'boolean', default: false } } });
const dir = resolvePremiumDir();
if (!dir) {
  console.error(`✘ diretório privado não encontrado: defina ${PREMIUM_ENV} ou clone o repositório privado em ${join(REPO_ROOT, 'premium')}`);
  process.exit(2);
}
const paid = await loadPaidLevels(dir);
const text = gerarCatalogoPago(paid);
const file = join(REPO_ROOT, CATALOGO_PAGO);
const current = existsSync(file) ? readFileSync(file, 'utf8') : '';
const lessons = paid.flatMap((l) => l.modules.flatMap((m) => m.lessons)).length;

if (opt.conferir) {
  if (current === text) {
    console.log(`✓ ${CATALOGO_PAGO} em dia com ${dir} (${paid.length} níveis, ${lessons} lições)`);
    process.exit(0);
  }
  const { paidCatalogDivergences } = await import('../../packages/content/src/completo.ts');
  const diffs = paidCatalogDivergences(paid);
  console.error(`✘ ${CATALOGO_PAGO} desatualizado em relação a ${dir}:`);
  for (const d of diffs.length ? diffs : ['formatação ou ordem do arquivo']) console.error(`  - ${d}`);
  console.error('Rode: node scripts/premium/metadados.ts (e faça commit no repositório público).');
  process.exit(1);
}
if (current === text) console.log(`${CATALOGO_PAGO} já estava em dia (${paid.length} níveis, ${lessons} lições).`);
else {
  writeFileSync(file, text);
  console.log(`${CATALOGO_PAGO} regenerado a partir de ${dir} (${paid.length} níveis, ${lessons} lições).`);
}
