import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const PAGES = ['/', '/trilha', '/revisao', '/diagnostico', '/laboratorio', '/projetos', '/carreira', '/glossario', '/visualizacoes?v=sorting', '/progresso', '/conta', '/metodologia', '/referencias', '/sobre', '/privacidade'];

for (const path of PAGES) {
  test(`acessibilidade (WCAG 2.2 AA): ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    const summary = result.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length}× ${v.nodes[0]?.target.join(' ')}`);
    expect(summary).toEqual([]);
  });
}

test('tema escuro também passa no contraste', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  const result = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
  expect(result.violations.map((v) => v.nodes.map((n) => n.target.join(' '))).flat()).toEqual([]);
});

test('nenhuma página rola na horizontal no celular', async ({ page }, info) => {
  test.skip(info.project.name !== 'celular');
  for (const path of [...PAGES, '/licao/l0-bits-bytes', '/modulo/m0-1', '/projetos/p5-api']) {
    await page.goto(path);
    const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(sw, path).toBeLessThanOrEqual(cw);
  }
});
