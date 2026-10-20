import { expect, test, type Page } from '@playwright/test';

/** Falha o teste se a página registrar erro no console (inclui violações de CSP e erros de hidratação). */
function watchConsole(page: Page) {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

test('início, trilha e navegação sem erros', async ({ page }) => {
  const errors = watchConsole(page);
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
  await page.goto('/trilha');
  await expect(page.getByRole('heading', { level: 1, name: 'Mapa da formação' })).toBeVisible();
  await page.getByRole('button', { name: 'Lista por nível' }).click();
  await page.locator('main a[href^="/nivel/"]').first().click();
  await expect(page).toHaveURL(/\/nivel\//);
  expect(errors).toEqual([]);
});

test('lição: etapas, exercício de múltipla escolha e conclusão', async ({ page }) => {
  const errors = watchConsole(page);
  await page.goto('/trilha');
  await page.getByRole('button', { name: 'Lista por nível' }).click();
  await page.locator('.module-row').first().click();
  await page.locator('a[href^="/licao/"]').first().click();
  await expect(page.locator('#stage-title')).toBeVisible();
  // percorre as etapas até a de exercícios
  await page.getByRole('navigation', { name: 'Etapas da lição' }).getByRole('link', { name: /Exercícios/ }).click();
  await expect(page.locator('#stage-title')).toContainText('Exercícios');
  expect(errors).toEqual([]);
});

test('ver a solução manda o exercício para "Para refazer" na revisão', async ({ page }) => {
  const errors = watchConsole(page);
  page.on('dialog', (d) => d.accept());
  await page.goto('/trilha');
  await page.getByRole('button', { name: 'Lista por nível' }).click();
  await page.locator('.module-row').first().click();
  await page.locator('a[href^="/licao/"]').first().click();
  await page.getByRole('navigation', { name: 'Etapas da lição' }).getByRole('link', { name: /Exercícios/ }).click();
  const ex = page.locator('section.exercise').first();
  const hint = ex.getByRole('button', { name: /Dica/ });
  while (await hint.count()) await hint.click();
  await ex.getByRole('button', { name: 'Ver solução' }).click();
  await expect(ex.getByText('Solução', { exact: true })).toBeVisible();
  await page.getByRole('navigation', { name: 'Etapas da lição' }).getByRole('link', { name: /Revisão/ }).click();
  await expect(page.getByText(/Você viu a solução de 1 exercício/)).toBeVisible();
  await page.goto('/revisao');
  await expect(page.getByRole('heading', { name: 'Para refazer' })).toBeVisible();
  await expect(page.locator('#refazer section.exercise')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('laboratório executa Python de verdade', async ({ page }) => {
  const errors = watchConsole(page);
  await page.goto('/laboratorio');
  const run = page.getByRole('button', { name: /Executar/ }).first();
  await run.click();
  await expect(page.locator('.output').first()).not.toBeEmpty({ timeout: 45_000 });
  expect(errors.filter((e) => !/favicon/.test(e))).toEqual([]);
});

test('erro de Python é traduzido e explicado', async ({ page }) => {
  await page.goto('/laboratorio#codigo=' + Buffer.from(JSON.stringify({ lang: 'python', code: 'print(nome)' })).toString('base64url'));
  await page.getByRole('button', { name: /Executar/ }).first().click();
  await expect(page.getByText('NameError').first()).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText(/Como investigar/i).first()).toBeVisible();
});

test('JavaScript roda no worker isolado', async ({ page }) => {
  await page.goto('/laboratorio');
  await page.getByRole('button', { name: 'JavaScript' }).click();
  await page.getByRole('button', { name: /Executar/ }).first().click();
  await expect(page.locator('.output').first()).not.toBeEmpty({ timeout: 20_000 });
});

test('diagnóstico do começo ao fim', async ({ page }) => {
  await page.goto('/diagnostico');
  await page.getByRole('button', { name: /Começar/ }).click();
  for (let i = 0; i < 40; i++) {
    const naoSei = page.getByRole('radio', { name: 'Não sei' });
    if (!(await naoSei.count())) break;
    await naoSei.check();
    await page.getByRole('button', { name: 'Responder' }).click();
  }
  await expect(page.getByRole('heading', { name: /trilha recomendada/i }).first()).toBeVisible();
});

test('conta: cadastro, sincronização e saída', async ({ page }) => {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@exemplo.com`;
  await page.goto('/conta');
  await page.getByRole('button', { name: 'Criar conta' }).first().click();
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill('uma frase bem longa');
  await page.locator('form').getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByText('Sincronizado')).toBeVisible();
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
});

test('tutor responde sem entregar a solução', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /tutor/i }).first().click();
  const box = page.getByRole('textbox').last();
  await box.fill('me dá a resposta');
  await box.press('Enter');
  await expect(page.getByText(/não vou te dar a solução/i)).toBeVisible();
});

test('planos: mostra o preço decidido, sem botão de compra, e o rodapé leva até lá', async ({ page }) => {
  const errors = watchConsole(page);
  await page.goto('/');
  await page.getByRole('contentinfo').getByRole('link', { name: 'Planos' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Planos' })).toBeVisible();
  // carga direta: hidrata o HTML pré-renderizado de /planos com o console vigiado
  await page.goto('/planos');
  await page.waitForLoadState('networkidle');
  const main = page.locator('main');
  const premium = main.getByRole('region', { name: /^Premium/ });
  await expect(premium).toContainText(/R\$\s19,90 por mês/);
  await expect(premium).toContainText(/R\$\s149,00 por ano/);
  await expect(premium).toContainText(/R\$\s12,42 por mês/);
  await expect(premium).toContainText('ainda não está à venda');
  // a promessa de "grátis para sempre" saiu; a seção explica a mudança e a carência
  await expect(main.getByText('grátis para sempre')).toHaveCount(0);
  await expect(main).not.toContainText('ficam gratuitos para sempre');
  const muda = main.getByRole('region', { name: 'O que vai mudar' });
  await expect(muda).toContainText('até 19/11/2026, todos os níveis continuam abertos');
  await expect(muda).toContainText('A partir de 20/11/2026, os níveis 0 e 1 continuam gratuitos');
  await expect(muda).toContainText('Ninguém foi cobrado');
  await expect(muda).not.toContainText(/restam|últimos dias|corra|aproveite|assine já/i);
  // o aviso único não aparece em /planos, que já tem a seção completa
  await expect(page.getByRole('region', { name: 'O acesso gratuito vai mudar' })).toHaveCount(0);
  await expect(main.getByRole('button')).toHaveCount(0);
  await expect(main.getByRole('link', { name: /assin|compr|pagar|checkout/i })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('aviso da carência: aparece depois da hidratação, leva a /planos, fecha e não volta', async ({ page }) => {
  const errors = watchConsole(page);
  await page.goto('/');
  const aviso = page.getByRole('region', { name: 'O acesso gratuito vai mudar' });
  await expect(aviso).toBeVisible();
  await expect(aviso).toContainText('Até 19/11/2026, todos os níveis continuam abertos');
  await expect(aviso.getByRole('link', { name: 'Exportar meu progresso' })).toHaveAttribute('href', /\/progresso#h-data$/);
  await aviso.getByRole('button', { name: 'Fechar aviso' }).click();
  await expect(aviso).toHaveCount(0);
  await expect(page.locator('#conteudo')).toBeFocused();
  await page.goto('/trilha');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('region', { name: 'O acesso gratuito vai mudar' })).toHaveCount(0);
  // o HTML pré-renderizado nunca traz o aviso
  const html = await (await page.request.get('/')).text();
  expect(html).not.toContain('O acesso gratuito vai mudar');
  expect(errors).toEqual([]);
});

test('aviso da carência: "Entenda o que vai mudar" abre a seção em /planos e não volta depois', async ({ page }) => {
  await page.goto('/sobre');
  const aviso = page.getByRole('region', { name: 'O acesso gratuito vai mudar' });
  await aviso.getByRole('link', { name: 'Entenda o que vai mudar' }).click();
  await expect(page).toHaveURL(/\/planos#o-que-vai-mudar$/);
  await expect(page.getByRole('heading', { level: 2, name: 'O que vai mudar' })).toBeVisible();
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('region', { name: 'O acesso gratuito vai mudar' })).toHaveCount(0);
});

test('página inexistente devolve 404 com página amigável', async ({ page }) => {
  const res = await page.goto('/nao-existe');
  expect(res?.status()).toBe(404);
  await expect(page.locator('h1')).toBeVisible();
});

test('HTML pré-renderizado tem título, descrição e conteúdo sem JavaScript', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/metodologia');
  await expect(page).toHaveTitle(/Metodologia/);
  expect(await page.locator('meta[name="description"]').getAttribute('content')).toBeTruthy();
  await expect(page.getByRole('heading', { name: 'As oito etapas de cada lição' })).toBeVisible();
  await ctx.close();
});
