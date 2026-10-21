import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
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
  await page.getByRole('button', { name: 'Sair', exact: true }).click(); // há também "Sair de todos os aparelhos"
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
});

test('com conta, a página só aceita interação depois que a conta é reconhecida', async ({ page }) => {
  // Quando /api/auth/me responde, o conteúdo remonta para a conta (key = id). Antes disso ele fica
  // inerte, para que nada do que o aluno fizer no laboratório se perca na remontagem.
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@exemplo.com`;
  const reg = await page.request.post('/api/auth/register', { data: { email, password: 'uma frase bem longa', name: '' }, headers: { 'x-alicerce': '1' } });
  expect(reg.ok()).toBe(true);
  let liberar!: () => void;
  const segurar = new Promise<void>((ok) => (liberar = ok));
  await page.route('**/api/auth/me', async (route) => {
    await segurar;
    await route.continue();
  });
  await page.goto('/laboratorio');
  const conteudo = page.locator('main#conteudo > div[aria-busy]');
  await expect(conteudo).toHaveAttribute('inert', '');
  liberar();
  await expect(page.getByRole('link', { name: /^Conta de / })).toBeVisible();
  await expect(page.locator('main#conteudo [inert]')).toHaveCount(0);
  const ed = page.locator('.cm-content').first();
  await ed.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Delete');
  await page.keyboard.insertText('print("depois da conta")');
  await page.getByRole('button', { name: /Executar/ }).first().click();
  await expect(page.locator('pre.output').first()).toContainText('depois da conta', { timeout: 45_000 });
});

test('tutor responde sem entregar a solução', async ({ page, request }) => {
  // Pedido de resposta feito de dentro de um exercício de código de uma lição gratuita (nível 1):
  // o tutor recebe o exercício como contexto, recusa a solução pronta e dá a próxima pista.
  // (Sem exercício no contexto, o tutor local busca um trecho da trilha em vez de recusar.)
  const licao = (await (await request.get('/api/content/lessons/l1-funcoes')).json()) as {
    sections: Array<{ blocks: Array<{ type: string; exercise?: { id: string; solution?: string; hints: string[] } }> }>;
  };
  const exercicio = licao.sections.flatMap((s) => s.blocks).find((b) => b.exercise?.id === 'e1-fn-2')!.exercise!;
  const errors = watchConsole(page);
  await page.goto('/licao/l1-funcoes');
  await page.getByRole('navigation', { name: 'Etapas da lição' }).getByRole('link', { name: /Exercícios/ }).click();
  const ex = page.locator('section.exercise#e1-fn-2');
  await ex.getByRole('button', { name: 'Perguntar ao tutor' }).click();
  const painel = page.getByRole('dialog', { name: 'Tutor Alicerce' });
  const box = painel.getByRole('textbox', { name: 'Sua pergunta' });
  await box.fill('me dá a resposta');
  await box.press('Enter');
  await expect(painel.getByText(/não vou te dar a solução/i)).toBeVisible();
  await expect(painel.getByText(`Uma pista: ${exercicio.hints[0]}`)).toBeVisible();
  // nenhuma linha da solução oficial aparece na conversa
  const conversa = await painel.locator('.tutor-log').innerText();
  const linhas = exercicio.solution!.split('\n').map((l) => l.trim()).filter((l) => l.length > 8);
  expect(linhas.length).toBeGreaterThan(2);
  for (const linha of linhas) expect(conversa).not.toContain(linha);
  expect(errors).toEqual([]);
});

test('planos: preço previsto, seção "O que vai mudar", sem botão de compra, e o rodapé leva até lá', async ({ page }) => {
  const errors = watchConsole(page);
  await page.goto('/');
  await page.getByRole('contentinfo').getByRole('link', { name: 'Planos' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /Comece a programar/ })).toBeVisible();
  // carga direta: hidrata o HTML pré-renderizado de /planos com o console vigiado
  await page.goto('/planos');
  await page.waitForLoadState('networkidle');
  const main = page.locator('main');
  await expect(main).toContainText(/R\$\s19,90 \/ mês/);
  await expect(main).toContainText(/R\$\s149,00/);
  await expect(main).toContainText('ainda não está à venda');
  // enquanto o Premium não estiver à venda, os níveis 2 a 14 continuam abertos: a seção
  // explica a mudança e o adiamento, sem data de corte (a seção "O que mudou" é a do corte)
  await expect(main.getByText('grátis para sempre')).toHaveCount(0);
  await expect(main).not.toContainText('ficam gratuitos para sempre');
  await expect(main.getByRole('region', { name: 'O que mudou' })).toHaveCount(0);
  const muda = main.getByRole('region', { name: 'O que vai mudar' });
  await expect(muda).toContainText('todos os níveis continuam abertos');
  await expect(muda).toContainText('Os níveis 2 a 14 só passam para a assinatura Premium 30 dias depois que ela começar a ser vendida');
  await expect(muda).toContainText('anunciar o fechamento dos níveis 2 a 14 para 20/11/2026. No mesmo dia, a data foi adiada');
  await expect(muda).not.toContainText('19/11/2026');
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
  await expect(aviso).toContainText('O fechamento anunciado para 20/11/2026 foi adiado, e todos os níveis continuam abertos');
  await expect(aviso).toContainText('os níveis 2 a 14 passam para o Premium 30 dias depois');
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

test('aviso da carência: quem fechou o aviso anterior (até 19/11) vê uma vez o adiamento', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('alicerce:aviso-carencia:fechado:v1', '2026-10-20T12:00:00.000Z'));
  await page.goto('/');
  const aviso = page.getByRole('region', { name: 'O acesso gratuito vai mudar' });
  await expect(aviso).toContainText('foi adiado');
  await aviso.getByRole('button', { name: 'Fechar aviso' }).focus();
  await page.keyboard.press('Escape');
  await expect(aviso).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('region', { name: 'O acesso gratuito vai mudar' })).toHaveCount(0);
});

test('o arquivo de "Exportar JSON" é lido pela análise do piloto (docs/PILOTO.md)', async ({ page }) => {
  const errors = watchConsole(page);
  page.on('dialog', (d) => d.accept());
  await page.goto('/licao/l0-o-que-e-computador');
  await page.getByRole('navigation', { name: 'Etapas da lição' }).getByRole('link', { name: /Exercícios/ }).click();
  const ex = page.locator('section.exercise').first();
  const hint = ex.getByRole('button', { name: /Dica/ });
  while (await hint.count()) await hint.click();
  await ex.getByRole('button', { name: 'Ver solução' }).click();
  await expect(ex.getByText('Solução', { exact: true })).toBeVisible();
  await page.goto('/progresso');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar JSON' }).click();
  const pasta = test.info().outputPath('piloto');
  mkdirSync(pasta, { recursive: true });
  await (await download).saveAs(join(pasta, 'P01.json'));
  const r = spawnSync(process.execPath, ['scripts/piloto/analisar.ts', pasta], { encoding: 'utf8' });
  expect(r.status, r.stderr).toBe(0);
  expect(r.stdout).toContain('Participantes: 1');
  expect(r.stdout).toContain('| Abriu a primeira lição | 1 | 100% |');
  expect(r.stdout).toContain('Fora da tabela: 1 exercício(s) tentados por menos de 3 pessoas');
  expect(errors).toEqual([]);
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
