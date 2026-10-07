import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const PAGES = ['/', '/trilha', '/revisao', '/diagnostico', '/laboratorio', '/projetos', '/carreira', '/glossario', '/visualizacoes?v=sorting', '/progresso', '/conta', '/metodologia', '/referencias', '/sobre', '/privacidade', '/planos'];

for (const path of PAGES) {
  test(`acessibilidade (WCAG 2.2 AA): ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    const summary = result.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length}× ${v.nodes[0]?.target.join(' ')}`);
    expect(summary).toEqual([]);
  });
}

test('acessibilidade das lições: explicação, exercícios e desafio de todas', async ({ page, request }, info) => {
  test.skip(info.project.name !== 'desktop');
  test.setTimeout(15 * 60_000);
  // A lista vem do sitemap, então toda lição nova entra na verificação sem mexer aqui.
  const sitemap = await (await request.get('/sitemap.xml')).text();
  const lessons = [...sitemap.matchAll(/\/licao\/([^<]+)</g)].map((m) => m[1]!);
  expect(lessons.length).toBeGreaterThan(50);
  const problems: string[] = [];
  for (const id of lessons) {
    for (const stage of ['explicacao', 'exercicio', 'desafio']) {
      await page.goto(`/licao/${id}?etapa=${stage}`);
      if (!(await page.locator('#stage-title').count())) continue;
      await page.waitForLoadState('networkidle');
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      for (const v of result.violations) problems.push(`${id} ${stage}: ${v.id} (${v.nodes.length}×) ${v.nodes[0]?.target.join(' ')}`);
    }
  }
  expect(problems).toEqual([]);
});

test('tema escuro também passa no contraste', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  const problems: string[] = [];
  for (const path of [...PAGES, '/licao/l0-bits-bytes?etapa=codigo', '/licao/l0-bits-bytes?etapa=exercicio', '/modulo/m0-1', '/nivel/n7']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const result = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
    for (const v of result.violations) for (const n of v.nodes) problems.push(`${path}: ${n.target.join(' ')}`);
  }
  expect(problems).toEqual([]);
});

test('nenhuma página rola na horizontal no celular', async ({ page }, info) => {
  test.skip(info.project.name !== 'celular');
  for (const path of [...PAGES, '/licao/l0-bits-bytes', '/modulo/m0-1', '/projetos/p5-api']) {
    await page.goto(path);
    const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(sw, path).toBeLessThanOrEqual(cw);
  }
});
