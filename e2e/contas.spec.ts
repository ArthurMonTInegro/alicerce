/**
 * Contas no navegador: progresso e rascunhos separados por conta (docs/SEGURANCA.md),
 * a assinatura com o provedor de pagamento de teste e a recuperação de senha.
 *
 * Cada conta guarda o progresso e os rascunhos com a própria chave no navegador
 * (alicerce:progresso:v2:user:<id>, alicerce:draft:v2:user:<id>:), e o visitante com a
 * dele. O progresso de visitante não passa para a conta ao entrar. Estes testes trocam
 * de conta numa aba e entre abas e conferem que nada se mistura, nem no servidor.
 *
 * Só no projeto "desktop", e em série, com as mesmas duas contas: cada teste continua
 * do estado em que o anterior deixou a conta (os dois últimos mudam o plano e a senha).
 * O servidor do e2e roda com PAGAMENTO_PROVEDOR=teste e EMAIL_LOG_PATH (playwright.config.ts).
 */
import { readFileSync } from 'node:fs';
import { test as base, expect, type APIRequestContext, type Page } from '@playwright/test';

const SENHA = 'uma frase bem longa';
const VISITANTE = 'alicerce:progresso:v2:guest';
const QUANDO = 1_700_000_000_000;

type Conta = { nome: string; email: string; id: string; req: APIRequestContext };

/**
 * Ana e Bruno, cadastrados pela API, com um módulo concluído cada um no servidor. A sessão
 * do cadastro fica só no contexto de requisições (para conferir o servidor); as páginas
 * entram pelo formulário, e sair numa página encerra só a sessão dela.
 */
const test = base.extend<object, { contas: { ana: Conta; bruno: Conta } | null }>({
  contas: [
    async ({ playwright }, use, info) => {
      if (info.project.name !== 'desktop') return use(null);
      const criar = async (nome: string, modulo: string): Promise<Conta> => {
        const req = await playwright.request.newContext({ baseURL: info.project.use.baseURL, extraHTTPHeaders: { 'x-alicerce': '1' } });
        const email = `contas-${nome.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2)}@exemplo.com`;
        const r = await req.post('/api/auth/register', { data: { email, password: SENHA, name: nome } });
        expect(r.status()).toBe(201);
        const id = (await r.json()).user.id as string;
        const p = await req.put('/api/progress', { data: { progress: { version: 1, modulesDone: { [modulo]: QUANDO } }, expectedUserId: id } });
        expect(p.status()).toBe(200);
        return { nome, email, id, req };
      };
      const ana = await criar('Ana', 'm0-1');
      const bruno = await criar('Bruno', 'm0-4');
      await use({ ana, bruno });
      await ana.req.dispose();
      await bruno.req.dispose();
    },
    { scope: 'worker' },
  ],
});

test.describe.configure({ mode: 'serial' });
test.beforeEach(({}, info) => {
  test.skip(info.project.name !== 'desktop', 'contas: basta um projeto');
});

/** Módulos concluídos no servidor (mesclar um progresso vazio não muda nada lá). */
async function noServidor(conta: Conta) {
  const r = await conta.req.put('/api/progress', { data: { progress: { version: 1 }, expectedUserId: conta.id } });
  expect(r.status()).toBe(200);
  return Object.keys((await r.json()).progress.modulesDone).sort();
}

const contaNoTopo = (page: Page, conta: Conta | null) => page.getByRole('link', { name: conta ? `Conta de ${conta.nome}` : 'Entrar ou criar conta' });

async function entrar(page: Page, conta: Conta, senha = SENHA) {
  await page.goto('/conta');
  await expect(contaNoTopo(page, null)).toBeVisible();
  await page.getByLabel('E-mail').fill(conta.email);
  await page.getByLabel('Senha', { exact: true }).fill(senha);
  await page.locator('form').getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByText('Sincronizado')).toBeVisible();
  await expect(contaNoTopo(page, conta)).toBeVisible();
}

async function sair(page: Page) {
  await page.goto('/conta');
  await page.getByRole('button', { name: 'Sair', exact: true }).click(); // há também "Sair de todos os aparelhos"
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
  await expect(contaNoTopo(page, null)).toBeVisible();
}

/**
 * A situação de um módulo na lista por nível de /trilha. Ao trocar de conta, o conteúdo
 * remonta e volta para a árvore, então a lista é escolhida de novo quando preciso.
 */
async function situacao(page: Page, modulo: string) {
  if (!/\/trilha\/?$/.test(new URL(page.url()).pathname)) await page.goto('/trilha');
  const lista = page.getByRole('button', { name: 'Lista por nível' });
  if ((await lista.getAttribute('aria-pressed')) !== 'true') await lista.click();
  return page.locator(`.module-list a[href$="/modulo/${modulo}"] .badge`);
}

async function conferirTrilha(page: Page, concluidos: string[]) {
  for (const m of ['m0-1', 'm0-4', 'm1-1']) {
    const badge = await situacao(page, m);
    if (concluidos.includes(m)) await expect(badge).toHaveText('Concluído');
    else await expect(badge).not.toHaveText('Concluído');
  }
}

/** O editor do exercício de código e1-fn-2 (lição gratuita do nível 1). */
async function editor(page: Page) {
  await page.goto('/licao/l1-funcoes');
  const etapas = page.getByRole('navigation', { name: 'Etapas da lição' });
  await page.waitForFunction(() => Object.keys(document.querySelector('#stage-title') ?? {}).some((k) => k.startsWith('__reactFiber')));
  await etapas.getByRole('link', { name: /Exercícios/ }).click();
  await expect(page.locator('#stage-title')).toContainText('Exercícios');
  const ed = page.locator('section.exercise#e1-fn-2 .cm-content');
  await expect(ed).toBeVisible();
  return ed;
}

async function escrever(page: Page, code: string) {
  const ed = await editor(page);
  await ed.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Delete');
  await page.keyboard.insertText(code);
  await expect(ed).toContainText(code);
}

test('visitante, Ana e Bruno no mesmo navegador: cada um vê só o próprio progresso e os próprios rascunhos', async ({ page, contas }) => {
  test.setTimeout(120_000);
  const { ana, bruno } = contas!;
  await page.goto('/trilha');
  await page.evaluate(([k, v]) => localStorage.setItem(k!, v!), [VISITANTE, JSON.stringify({ version: 1, modulesDone: { 'm1-1': QUANDO } })]);
  await page.reload();
  await conferirTrilha(page, ['m1-1']);
  await escrever(page, '# rascunho do visitante');

  // Ana entra: vê o progresso dela (do servidor), e não o do visitante nem o rascunho dele.
  await entrar(page, ana);
  await conferirTrilha(page, ['m0-1']);
  const daAna = await editor(page);
  await expect(daAna).toContainText('pass'); // o código inicial
  await expect(daAna).not.toContainText('rascunho do visitante');
  await escrever(page, '# rascunho da Ana');

  // Ana sai: o visitante volta a ver o que era dele.
  await sair(page);
  await conferirTrilha(page, ['m1-1']);
  await expect(await editor(page)).toContainText('rascunho do visitante');

  // Bruno entra no mesmo navegador: nada da Ana nem do visitante.
  await entrar(page, bruno);
  await conferirTrilha(page, ['m0-4']);
  const ed = await editor(page);
  await expect(ed).toContainText('pass');
  await expect(ed).not.toContainText('rascunho da Ana');
  await expect(ed).not.toContainText('rascunho do visitante');

  // Ana volta: o rascunho dela continua aqui.
  await sair(page);
  await entrar(page, ana);
  await expect(await editor(page)).toContainText('rascunho da Ana');

  expect(await noServidor(ana)).toEqual(['m0-1']);
  expect(await noServidor(bruno)).toEqual(['m0-4']);
});

test('duas abas: sair numa tira a conta da outra, e entrar com outra conta não leva o progresso da primeira', async ({ context, contas }) => {
  test.setTimeout(120_000);
  const { ana, bruno } = contas!;
  const aba1 = await context.newPage();
  const aba2 = await context.newPage();
  await entrar(aba1, ana);
  await aba2.goto('/trilha');
  await expect(contaNoTopo(aba2, ana)).toBeVisible();
  await conferirTrilha(aba2, ['m0-1']);

  // Sair na aba 1: a aba 2 vira visitante sem recarregar.
  await sair(aba1);
  await expect(contaNoTopo(aba2, null)).toBeVisible();
  await conferirTrilha(aba2, []);

  // Bruno entra na aba 1: a aba 2 passa para o Bruno, sem o progresso da Ana.
  await entrar(aba1, bruno);
  await expect(contaNoTopo(aba2, bruno)).toBeVisible();
  await conferirTrilha(aba2, ['m0-4']);

  expect(await noServidor(ana)).toEqual(['m0-1']);
  expect(await noServidor(bruno)).toEqual(['m0-4']);
});

test('falha ao salvar no navegador: o aviso aparece, e "Tentar salvar" grava o rascunho quando volta a funcionar', async ({ page }) => {
  test.setTimeout(90_000);
  const ed = await editor(page);
  // O navegador passa a recusar gravações (como com o armazenamento cheio).
  await page.evaluate(() => {
    const w = window as unknown as { __setItem: Storage['setItem'] };
    w.__setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException('cheio', 'QuotaExceededError');
    };
  });
  await ed.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Delete');
  await page.keyboard.insertText('# escrito sem conseguir salvar');
  const aviso = page.getByRole('alert').filter({ hasText: 'Não foi possível salvar no navegador.' });
  await expect(aviso).toBeVisible();
  await expect(ed).toContainText('escrito sem conseguir salvar');

  // Ainda falhando: "Tentar salvar" mantém o aviso.
  await aviso.getByRole('button', { name: 'Tentar salvar' }).click();
  await expect(aviso).toBeVisible();

  // Voltou a funcionar: "Tentar salvar" grava o que estava pendente, e o aviso some.
  await page.evaluate(() => {
    Storage.prototype.setItem = (window as unknown as { __setItem: Storage['setItem'] }).__setItem;
  });
  await aviso.getByRole('button', { name: 'Tentar salvar' }).click();
  await expect(aviso).toHaveCount(0);
  await page.reload();
  await expect(await editor(page)).toContainText('escrito sem conseguir salvar');
});

test('falha ao sair: a conta fica oculta neste navegador, mesmo recarregando ou em outra aba, até o servidor confirmar', async ({ context, page, contas }) => {
  const { bruno } = contas!;
  await entrar(page, bruno);
  // Sem rede para encerrar a sessão (em todas as abas deste navegador).
  await context.route('**/api/auth/logout', (route) => route.abort('internetdisconnected'));
  let sincronizou = false;
  context.on('request', (r) => r.url().endsWith('/api/progress') && (sincronizou = true));
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  // A página da conta remonta como visitante; o aviso que fica é o do topo, em todas as páginas.
  const pendente = (p: Page) => p.getByRole('alert').filter({ hasText: 'A saída do servidor não foi confirmada. Os dados da conta ficam ocultos neste navegador' });
  await expect(pendente(page)).toBeVisible();
  await expect(contaNoTopo(page, null)).toBeVisible();

  // Recarregar ou abrir outra aba não traz o Bruno de volta: o site tenta sair de novo.
  await page.reload();
  await expect(pendente(page)).toBeVisible();
  await expect(contaNoTopo(page, null)).toBeVisible();
  await conferirTrilha(page, []);
  const outra = await context.newPage();
  await outra.goto('/trilha');
  await expect(pendente(outra)).toBeVisible();
  await conferirTrilha(outra, []);
  expect(sincronizou).toBe(false);

  // A rede volta: "Tentar encerrar sessão" termina a saída, nas duas abas.
  await context.unroute('**/api/auth/logout');
  await pendente(page).getByRole('button', { name: 'Tentar encerrar sessão' }).click();
  await expect(pendente(page)).toHaveCount(0);
  await expect(pendente(outra)).toHaveCount(0);
  await expect(contaNoTopo(outra, null)).toBeVisible();
  await page.goto('/conta');
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
  expect(await noServidor(bruno)).toEqual(['m0-4']);
});

// Por último: apaga o progresso da Ana.
test('apagar o progresso vale nas outras abas e no servidor, e uma cópia antiga não o traz de volta', async ({ context, contas }) => {
  const { ana } = contas!;
  const aba1 = await context.newPage();
  const aba2 = await context.newPage();
  await entrar(aba1, ana);
  await aba2.goto('/trilha');
  await expect(contaNoTopo(aba2, ana)).toBeVisible();
  await conferirTrilha(aba2, ['m0-1']);

  const perguntas: string[] = [];
  aba1.on('dialog', (d) => {
    perguntas.push(d.message());
    // reinicia o progresso; mantém os rascunhos
    void (perguntas.length === 1 ? d.accept() : d.dismiss());
  });
  await aba1.goto('/progresso');
  await aba1.getByRole('button', { name: 'Apagar progresso' }).click();
  await expect(aba1.getByText('Progresso reiniciado. Acompanhe a confirmação de sincronização.')).toBeVisible();
  expect(perguntas).toHaveLength(2);
  expect(perguntas[0]).toContain('Reiniciar o progresso desta conta?');

  await conferirTrilha(aba2, []);
  await expect.poll(() => noServidor(ana)).toEqual([]);
  // Um aparelho com a cópia de antes do reinício sincroniza: o reinício prevalece.
  const antiga = await ana.req.put('/api/progress', { data: { progress: { version: 1, modulesDone: { 'm0-1': QUANDO } }, expectedUserId: ana.id } });
  expect(Object.keys((await antiga.json()).progress.modulesDone)).toEqual([]);
  await aba2.reload();
  await expect(contaNoTopo(aba2, ana)).toBeVisible();
  await conferirTrilha(aba2, []);
});

test('assinatura no ambiente de teste: pagar, cancelar a renovação e desistir com estorno', async ({ page, contas }) => {
  const { ana } = contas!;
  page.on('dialog', (d) => void d.accept());
  await entrar(page, ana);
  await expect(page.getByRole('heading', { name: 'Seu plano: Gratuito' })).toBeVisible();
  const secao = page.getByRole('region', { name: 'Assinatura do Premium' });
  await expect(secao.getByText('Ambiente de teste.')).toBeVisible();
  await secao.getByRole('radio', { name: /^Anual: R\$\s?149,00 por ano/ }).check();
  await secao.getByRole('button', { name: 'Ir para o pagamento' }).click();

  // A página do provedor (simulada)
  await expect(page.getByRole('heading', { name: 'Pagamento simulado' })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe('/conta/pagamento-teste');
  await page.getByRole('button', { name: 'Aprovar pagamento' }).click();
  const daquiUmAno = new Date(Date.now() + 365 * 86_400_000).toLocaleDateString('pt-BR', { timeZone: 'UTC' }).slice(-4);
  await expect(page.getByRole('status')).toContainText(`Pagamento aprovado. O Premium vale até`);
  await expect(page.getByRole('status')).toContainText(daquiUmAno);
  await page.getByRole('link', { name: 'Voltar para a conta' }).click();
  await expect(page.getByRole('heading', { name: /^Seu plano: Premium/ })).toBeVisible();
  await expect(secao).toContainText(/Premium anual, por R\$\s?149,00\. Renova em/);

  await secao.getByRole('button', { name: 'Cancelar a renovação' }).click();
  await expect(secao.getByRole('status')).toContainText('Renovação cancelada.');
  await expect(secao).toContainText('Assinatura cancelada: o Premium vale até');
  await expect(page.getByRole('heading', { name: /^Seu plano: Premium/ })).toBeVisible();

  await secao.getByRole('button', { name: 'Desistir e receber o estorno' }).click();
  await expect(secao.getByRole('status')).toContainText('o estorno integral foi pedido ao provedor');
  await expect(page.getByRole('heading', { name: 'Seu plano: Gratuito' })).toBeVisible();
  await expect(secao.getByRole('button', { name: 'Ir para o pagamento' })).toBeVisible();

  const r = await ana.req.get('/api/assinatura');
  expect((await r.json()).assinatura.situacao).toBe('reembolsada');
  expect((await r.json()).plano.plan).toBe('free');
});

// Por último: troca a senha do Bruno e encerra as sessões dele (inclusive a do cadastro).
test('esqueci a senha: o link do e-mail troca a senha uma vez e encerra as sessões abertas', async ({ browser, page, contas }) => {
  const { bruno } = contas!;
  await entrar(page, bruno);

  // Em outro navegador, sem conta: pedir o link.
  const outro = await browser.newContext();
  const visita = await outro.newPage();
  await visita.goto('/conta');
  await visita.getByRole('button', { name: 'Esqueci a senha' }).click();
  await expect(visita.getByRole('heading', { name: 'Trocar a senha' })).toBeVisible();
  await visita.getByLabel('E-mail').fill(bruno.email);
  await visita.getByRole('button', { name: 'Enviar o link' }).click();
  await expect(visita.getByRole('status')).toContainText('Se houver uma conta com esse e-mail, enviamos um link');

  const linhas = readFileSync('test-results/emails.log', 'utf8').trim().split('\n').map((l) => JSON.parse(l) as { to: string; text: string });
  const link = /https?:\/\/\S+\/conta\/redefinir#t=[A-Za-z0-9_-]+/.exec(linhas.filter((m) => m.to === bruno.email && m.text.includes('/conta/redefinir#t=')).at(-1)!.text)![0];
  const caminho = new URL(link).pathname + new URL(link).hash;
  await visita.goto(caminho);
  await expect(visita.getByRole('heading', { name: 'Trocar a senha' })).toBeVisible();
  await expect.poll(() => new URL(visita.url()).hash).toBe(''); // o código sai do endereço
  await visita.getByLabel('Senha nova').fill('uma senha nova e bem longa');
  await visita.getByRole('button', { name: 'Trocar a senha' }).click();
  await expect(visita.getByRole('status')).toContainText('Senha trocada.');

  // O mesmo link não vale de novo (sai da página antes: só trocar o # não recarrega).
  await visita.goto('/conta');
  await visita.goto(caminho);
  await visita.getByLabel('Senha nova').fill('outra senha nova e longa');
  await visita.getByRole('button', { name: 'Trocar a senha' }).click();
  await expect(visita.getByRole('alert')).toContainText('Este link não vale mais');
  await outro.close();

  // A sessão aberta antes foi encerrada; a senha antiga não entra mais, a nova sim.
  await page.reload();
  await expect(contaNoTopo(page, null)).toBeVisible();
  await page.goto('/conta');
  await page.getByLabel('E-mail').fill(bruno.email);
  await page.getByLabel('Senha', { exact: true }).fill(SENHA);
  await page.locator('form').getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('alert')).toContainText('E-mail ou senha incorretos.');
  await entrar(page, bruno, 'uma senha nova e bem longa');
  expect((await bruno.req.get('/api/auth/me').then((r) => r.json())).user).toBeNull();
});
