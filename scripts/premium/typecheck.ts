/**
 * Confere os tipos do repositório privado (conteúdo pago), quando ele está
 * disponível. Parte de `npm run typecheck`. O diretório pode estar fora desta
 * árvore: o tsconfig temporário mapeia '@alicerce/content/autoria' para cá.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PREMIUM_ENV, premiumRequired, REPO_ROOT, resolvePremiumDir } from '../../packages/content/src/privado.ts';

const dir = resolvePremiumDir();
if (!dir) {
  if (premiumRequired()) {
    console.error(`✘ conteúdo pago exigido, mas o diretório privado não foi encontrado (defina ${PREMIUM_ENV}).`);
    process.exit(1);
  }
  console.log('conteúdo pago: diretório privado ausente; tipos dele não conferidos.');
  process.exit(0);
}
const tmp = mkdtempSync(join(tmpdir(), 'alicerce-premium-tsc-'));
const tsconfig = join(tmp, 'tsconfig.json');
writeFileSync(
  tsconfig,
  JSON.stringify({
    extends: join(REPO_ROOT, 'tsconfig.base.json'),
    compilerOptions: { paths: { '@alicerce/content/autoria': [join(REPO_ROOT, 'packages/content/src/autoria.ts')] } },
    include: [join(dir, 'src')],
  }),
);
try {
  execFileSync('npx', ['tsc', '-p', tsconfig], { cwd: REPO_ROOT, stdio: 'inherit' });
  console.log(`conteúdo pago: tipos conferidos em ${dir}`);
} catch {
  process.exitCode = 1;
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
