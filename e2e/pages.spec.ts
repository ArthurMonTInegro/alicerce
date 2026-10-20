/**
 * Modo estático (demonstração no GitHub Pages): o build com BASE_PATH=/alicerce/ e
 * VITE_STATIC=1, servido sem cabeçalho de segurança nenhum (e2e/servidor-pages.ts).
 * Aqui a única defesa que vem da página é a dela mesma: o atributo sandbox do
 * iframe, a meta CSP do runner.html e a conferência de origem do runner.js.
 *
 * Precisa de um build separado (o de sempre fica em apps/web/dist):
 *   BASE_PATH=/alicerce/ VITE_STATIC=1 npm run build && cp -r apps/web/dist /tmp/alicerce-pages && npm run build
 *   PAGES_DIST=/tmp/alicerce-pages npx playwright test e2e/pages.spec.ts
 * Sem PAGES_DIST, os testes daqui são pulados.
 */
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { expect, test, type Page } from '@playwright/test';
import { servirComoPages } from './servidor-pages.ts';

const DIR = process.env.PAGES_DIST;
type Srv = Awaited<ReturnType<typeof servirComoPages>>;
let srv: Srv;

test.skip(!DIR, 'defina PAGES_DIST com a pasta do build estático (veja o comentário no topo)');
test.beforeEach(({}, info) => {
  test.skip(info.project.name !== 'desktop', 'modo estático: basta um projeto');
});
test.beforeAll(async () => {
  if (DIR) srv = await servirComoPages(DIR);
});
test.afterAll(async () => {
  await srv?.fechar();
});

function vigiarConsole(page: Page) {
  const erros: string[] = [];
  page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
  page.on('pageerror', (e) => erros.push(e.message));
  return erros;
}

/**
 * Abre a lição e vai à etapa de exercícios pela navegação da página, como nos testes de
 * fluxos. Carregar direto com ?etapa=exercicio dá erro de hidratação (#418) já em main,
 * fora do escopo do isolamento (registrado nas pendências).
 */
async function exercicios(page: Page, licao: string) {
  await page.goto(srv.url(`licao/${licao}/`));
  const etapas = page.getByRole('navigation', { name: 'Etapas da lição' });
  await page.waitForFunction(() => Object.keys(document.querySelector('#stage-title') ?? {}).some((k) => k.startsWith('__reactFiber')));
  await etapas.getByRole('link', { name: /Exercícios/ }).click();
  await expect(page.locator('#stage-title')).toContainText('Exercícios');
}

async function escrever(page: Page, editor: ReturnType<Page['locator']>, code: string) {
  await expect(editor).toBeVisible();
  await editor.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Delete');
  await page.keyboard.insertText(code);
}

test('o servidor imita o Pages: sem CSP, com Access-Control-Allow-Origin: *', async ({ request }) => {
  const r = await request.get(srv.url('runner.html'));
  expect(r.status()).toBe(200);
  expect(r.headers()['content-security-policy']).toBeUndefined();
  expect(r.headers()['x-frame-options']).toBeUndefined();
  expect(r.headers()['access-control-allow-origin']).toBe('*');
  expect(await r.text()).toContain('http-equiv="Content-Security-Policy"');
});

test('exercício de Python roda e é corrigido', async ({ page }) => {
  test.setTimeout(120_000);
  const erros = vigiarConsole(page);
  // No build público só as lições gratuitas (níveis 0 e 1) têm o corpo; as outras mostram só a prévia.
  await exercicios(page, 'l1-funcoes');
  const ex = page.locator('section.exercise#e1-fn-2');
  // o código inicial (pass) devolve None: nenhum teste passa
  await ex.getByRole('button', { name: /Testar/ }).click();
  await expect(ex.getByText('Testes: 0 de 3 passaram')).toBeVisible({ timeout: 90_000 });
  await escrever(page, ex.locator('.cm-content'), 'def media(notas):\n    if not notas:\n        return 0\n    return sum(notas) / len(notas)\n');
  await ex.getByRole('button', { name: /Testar/ }).click();
  await expect(ex.getByText('Testes: 3 de 3 passaram')).toBeVisible({ timeout: 30_000 });
  await expect(ex.getByText('✓ Resolvido')).toBeVisible();
  expect(erros).toEqual([]);
});

test('JavaScript roda de verdade no laboratório estático', async ({ page }) => {
  // O build público não tem exercício de JavaScript (os de JavaScript estão nas lições Premium, que só
  // o servidor entrega); a correção de um deles está em isolamento.spec.ts, no servidor.
  const erros = vigiarConsole(page);
  const code = 'const xs = [1, 2, 3].map((x) => x * 10);\nsetTimeout(() => console.log("depois", xs.join(",")), 50);\nconsole.log("antes", xs.reduce((a, b) => a + b, 0));';
  await page.goto(srv.url('laboratorio/#codigo=' + Buffer.from(JSON.stringify({ lang: 'javascript', code })).toString('base64url')));
  await page.reload();
  await page.getByRole('button', { name: /Executar/ }).first().click();
  await expect(page.locator('pre.output').first()).toHaveText('antes 60\ndepois 10,20,30', { timeout: 20_000 });
  expect(erros).toEqual([]);
});

test('laboratório estático: código do estudante sem rede e sem os dados do site', async ({ page }) => {
  // Servidor de eco: se a meta CSP falhasse, o pedido chegaria aqui.
  const recebidas: string[] = [];
  const eco = createServer((req, res) => {
    recebidas.push(`${req.method} ${req.url}`);
    res.writeHead(200, { 'access-control-allow-origin': '*' }).end('eco');
  });
  await new Promise<void>((r) => eco.listen(0, '127.0.0.1', r));
  const ecoUrl = `http://127.0.0.1:${(eco.address() as AddressInfo).port}`;

  await page.goto(srv.url('laboratorio/'));
  await page.evaluate(() => localStorage.setItem('alicerce:segredo', 'dado-do-site'));
  const code = `const r = { origem: self.origin, localStorage: typeof localStorage, document: typeof document };
for (const [nome, url] of [['eco', ${JSON.stringify(ecoUrl)} + '/eco'], ['site', ${JSON.stringify(srv.url(''))}]]) {
  try { await fetch(url); r[nome] = 'leu'; } catch (e) { r[nome] = 'bloqueado ' + e.name; }
}
console.log(JSON.stringify(r));`;
  await page.goto(srv.url('laboratorio/#codigo=' + Buffer.from(JSON.stringify({ lang: 'javascript', code })).toString('base64url')));
  await page.reload();
  await page.getByRole('button', { name: /Executar/ }).first().click();
  const out = page.locator('pre.output').first();
  await expect(out).toContainText('origem', { timeout: 20_000 });
  const r = JSON.parse((await out.textContent())!);
  expect(r).toEqual({ origem: 'null', localStorage: 'undefined', document: 'undefined', eco: 'bloqueado TypeError', site: 'bloqueado TypeError' });
  expect(recebidas).toEqual([]);
  await new Promise<void>((res) => eco.close(() => res()));
});

test('quem emoldura o site não sequestra a página de execução navegando o iframe dela', async ({ page }) => {
  test.setTimeout(90_000);
  // No Pages não há frame-ancestors: qualquer página emoldura o site. Quem está acima na árvore de
  // quadros pode navegar o iframe da execução para uma página sua (o sandbox continua, a origem
  // continua "null", e o contentWindow é o mesmo). A página falsa avisa "pronto" e, se o site
  // aceitasse, receberia o canal: o código digitado e o poder de forjar a saída.
  const site = srv.url('laboratorio/#codigo=' + Buffer.from(JSON.stringify({ lang: 'javascript', code: 'console.log("execução de verdade")' })).toString('base64url'));
  const atacante = createServer((req, res) => {
    const html = req.url?.startsWith('/falsa')
      ? `<!doctype html><script>
          top.postMessage({ registro: 'falsa carregou' }, '*');
          const atender = (p) => {
            p.onmessage = (m) => {
              top.postMessage({ registro: 'RECEBEU CÓDIGO: ' + m.data.code }, '*');
              p.postMessage({ id: m.data.id, ok: true, result: { ok: true, stdout: 'SEQUESTRADO', error: null } });
            };
          };
          // como a página de verdade: manda uma ponta de canal junto com o "pronto" (sem saber o valor do fragmento)
          for (const n of ['', location.hash.slice(1)]) {
            const ch = new MessageChannel();
            atender(ch.port1);
            parent.postMessage({ alicerce: 'runner', type: 'pronto', v: 1, n }, '*', [ch.port2]);
          }
          // e, se o site mandasse algum canal para a janela do iframe, também o aceitaria
          addEventListener('message', (e) => {
            const p = e.ports[0];
            if (!p) return;
            top.postMessage({ registro: 'RECEBEU O CANAL' }, '*');
            atender(p);
          });
        </script>`
      : `<!doctype html><body><iframe id="site" src="${site}" style="width:900px;height:700px"></iframe><script>
          window.registro = [];
          let carregou = false;
          addEventListener('message', (e) => {
            if (!e.data || !e.data.registro) return;
            registro.push(e.data.registro);
            if (e.data.registro === 'falsa carregou') carregou = true;
          });
          // Fica de olho: cada iframe novo dentro do site é navegado para a página falsa assim que
          // aparece, e de novo enquanto ela não carregar (a navegação do próprio site pode ganhar a corrida).
          let ultimo = null;
          let quando = -1e9;
          setInterval(() => {
            try {
              const alvo = frames[0] && frames[0].length ? frames[0][0] : null;
              if (alvo && alvo !== ultimo) {
                ultimo = alvo;
                carregou = false;
                quando = -1e9;
              }
              if (alvo && !carregou && performance.now() - quando > 150) {
                quando = performance.now();
                alvo.location = location.origin + '/falsa#qualquer';
                registro.push('navegou o iframe');
              }
            } catch (e) {
              registro.push('erro ' + e.name);
            }
          }, 1);
        </script></body>`;
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(html);
  });
  await new Promise<void>((r) => atacante.listen(0, '127.0.0.1', r));
  const origemAtacante = `http://localhost:${(atacante.address() as AddressInfo).port}`;
  await page.goto(origemAtacante + '/');
  const quadro = page.frameLocator('#site');
  await quadro.getByRole('button', { name: /Executar/ }).first().click();
  const registro = () => page.evaluate(() => (window as unknown as { registro: string[] }).registro);
  await expect.poll(registro, { timeout: 20_000 }).toContain('falsa carregou');
  // O site não entrega o canal à página falsa: ela não sabe o valor que vai no fragmento da URL do iframe.
  await page.waitForTimeout(3000);
  expect(await registro()).not.toContain('RECEBEU O CANAL');
  expect((await registro()).some((r) => r.startsWith('RECEBEU CÓDIGO'))).toBe(false);
  await expect(quadro.locator('pre.output').first()).not.toContainText('SEQUESTRADO');
  await new Promise<void>((r) => atacante.close(() => r()));
});

test('página de execução aberta diretamente ou emoldurada por outra origem não executa', async ({ page }) => {
  // Sem a CSP sandbox do servidor, aberta direto ela tem a origem do site: recusa.
  await page.goto(srv.url('runner.html'));
  await expect(page.locator('#aviso')).toContainText('Ela só roda isolada');
  await expect(page.locator('#aviso')).toContainText('Nada foi executado');
  expect(await page.evaluate(() => self.origin)).toBe(srv.origin);

  // Emoldurada (com sandbox) por outra origem: sem frame-ancestors no Pages, quem barra é a conferência
  // de location.ancestorOrigins no runner.js. Aqui "outra origem" é localhost x 127.0.0.1.
  const outra = srv.origin.replace('127.0.0.1', 'localhost');
  await page.goto(outra + '/alicerce/404');
  const resposta = await page.evaluate(
    (src) =>
      new Promise<string>((res) => {
        addEventListener('message', (e) => res(JSON.stringify(e.data)));
        const f = document.createElement('iframe');
        f.setAttribute('sandbox', 'allow-scripts');
        f.src = src;
        document.body.appendChild(f);
        setTimeout(() => res('sem resposta'), 3000);
      }),
    srv.url('runner.html'),
  );
  expect(resposta).toBe('sem resposta');
});
