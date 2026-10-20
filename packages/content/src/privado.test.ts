/** Carga do repositório privado: contrato (FORMATO, só níveis pagos) e localização. */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { DEFAULT_PREMIUM_DIR, loadPaidLevels, PremiumLoadError, resolvePremiumDir } from './privado.ts';

const root = mkdtempSync(join(tmpdir(), 'alicerce-privado-teste-'));
afterAll(() => rmSync(root, { recursive: true, force: true }));
/** Um "repositório privado" mínimo, fora desta árvore, que importa '@alicerce/content/autoria' como o real. */
function fakeRepo(name: string, index: string) {
  const dir = join(root, name);
  mkdirSync(join(dir, 'src'), { recursive: true });
  writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
  writeFileSync(join(dir, 'src', 'index.ts'), index);
  return dir;
}
const level = (n: number) => `{ id: 'n${n}', number: ${n}, title: 't', titleEn: 't', goal: 'g', why: 'w', modules: [] }`;

describe('loadPaidLevels', () => {
  it('carrega um repositório fora da árvore que usa @alicerce/content/autoria', async () => {
    const dir = fakeRepo('ok', `import { md, type Level } from '@alicerce/content/autoria';\nexport const FORMATO = 1;\nconst b = md('x');\nexport const levels: Level[] = [${level(2)}];\nexport const bloco = b;\n`);
    const levels = await loadPaidLevels(dir);
    expect(levels.map((l) => l.number)).toEqual([2]);
  });
  it('recusa formato desconhecido, nível gratuito e diretório sem src/index.ts', async () => {
    await expect(loadPaidLevels(fakeRepo('formato', `export const FORMATO = 2;\nexport const levels = [];\n`))).rejects.toThrow(/FORMATO=2/);
    await expect(loadPaidLevels(fakeRepo('gratuito', `export const FORMATO = 1;\nexport const levels = [${level(1)}];\n`))).rejects.toThrow(/gratuito/);
    await expect(loadPaidLevels(join(root, 'nada'))).rejects.toBeInstanceOf(PremiumLoadError);
  });
});

describe('resolvePremiumDir', () => {
  it('usa ALICERCE_PREMIUM_DIR (relativo ao diretório atual); vazio ou 0 desliga', () => {
    expect(resolvePremiumDir({ ALICERCE_PREMIUM_DIR: '/srv/premium' }, '/x')).toBe('/srv/premium');
    expect(resolvePremiumDir({ ALICERCE_PREMIUM_DIR: 'premium' }, '/app')).toBe('/app/premium');
    expect(resolvePremiumDir({ ALICERCE_PREMIUM_DIR: '0' })).toBeNull();
    expect(resolvePremiumDir({ ALICERCE_PREMIUM_DIR: '' })).toBeNull();
    expect([null, DEFAULT_PREMIUM_DIR]).toContain(resolvePremiumDir({}));
  });
});
