/**
 * Cadastro em dois passos (app.ts, /api/auth/register e /api/auth/confirmar): a resposta do
 * pedido é a mesma com ou sem conta para o e-mail, e a conta só nasce pelo link do e-mail.
 * Tudo roda contra o servidor real (Fastify + SQLite em memória) via inject.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { createPendingSignup, hashPassword, SIGNUP_MINUTES } from '../src/auth.ts';
import { buildApp } from '../src/app.ts';
import { loadConfig } from '../src/config.ts';
import { openDb } from '../src/db.ts';
import type { Mailer } from '../src/email.ts';
import { criarConta, MemoryMailer } from './cadastro.ts';

const H = { 'content-type': 'application/json', 'x-alicerce': '1' };
const SENHA = 'uma frase longa';

let db: ReturnType<typeof openDb>;
let mailer: MemoryMailer;
let app: Awaited<ReturnType<typeof buildApp>>;
async function setup(m: Mailer | null = (mailer = new MemoryMailer())) {
  db = openDb(':memory:');
  app = await buildApp({ config: { ...loadConfig({}), webDist: '/nao-existe' }, db, mailer: m });
}
beforeEach(() => setup());

const pedir = (payload: object, remoteAddress?: string) => app.inject({ method: 'POST', url: '/api/auth/register', headers: H, payload, ...(remoteAddress ? { remoteAddress } : {}) });
const confirmar = (token: string | null) => app.inject({ method: 'POST', url: '/api/auth/confirmar', headers: H, payload: { token } });
const login = (email: string, password = SENHA) => app.inject({ method: 'POST', url: '/api/auth/login', headers: H, payload: { email, password } });
const usuarios = () => (db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n;
const pendentes = () => (db.prepare('SELECT COUNT(*) AS n FROM pending_signups').get() as { n: number }).n;
const cookieOf = (res: { headers: Record<string, unknown> }) => String(res.headers['set-cookie']).split(';')[0]!;
/** o envio não é esperado pela resposta (links.ts): roda a fila antes de ler os e-mails */
const enviados = () => app.rotinas.enviarLinks();

// Cada pedido passa pelo scrypt (dezenas de ms, mais com a suíte em paralelo).
const SCRYPT = { timeout: 30_000 };

describe('o pedido de cadastro não revela quem tem conta', SCRYPT, () => {
  it('com e sem conta: mesma resposta, sem sessão; o e-mail é que diz o resto', async () => {
    await criarConta(app, db, { email: 'tem@conta.co', password: SENHA });
    const com = await pedir({ email: 'tem@conta.co', password: 'outra frase longa' });
    const sem = await pedir({ email: 'nova@conta.co', password: SENHA });
    expect([com.statusCode, com.body]).toEqual([202, JSON.stringify({ ok: true })]);
    expect([sem.statusCode, sem.body]).toEqual([com.statusCode, com.body]);
    expect(com.headers['set-cookie']).toBeUndefined();
    expect(sem.headers['set-cookie']).toBeUndefined();

    await enviados();
    const [paraQuemTem, paraQuemNaoTem] = [mailer.sent.find((m) => m.to === 'tem@conta.co')!, mailer.sent.find((m) => m.to === 'nova@conta.co')!];
    expect(paraQuemTem.subject).toBe('Alicerce: você já tem uma conta');
    expect(paraQuemTem.text).toContain('Nenhuma conta nova foi criada');
    expect(paraQuemTem.text).not.toContain('/conta/confirmar');
    expect(paraQuemNaoTem.subject).toBe('Alicerce: confirme o seu cadastro');
    expect(mailer.signupToken('nova@conta.co')).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('quem já tem conta continua com a senha dela, e nenhum pedido fica guardado', async () => {
    await criarConta(app, db, { email: 'tem@conta.co', password: SENHA });
    await pedir({ email: 'Tem@Conta.co', password: 'outra frase longa' });
    expect(pendentes()).toBe(0);
    expect((await login('tem@conta.co')).statusCode).toBe(200);
    expect((await login('tem@conta.co', 'outra frase longa')).statusCode).toBe(401);
  });

  it('a resposta não espera o e-mail: nem um envio parado nem uma falha do fornecedor mudam o 202', async () => {
    await setup({ name: 'parado', send: () => new Promise<void>(() => {}) });
    expect((await pedir({ email: 'a@a.co', password: SENHA })).statusCode).toBe(202);
    await setup({ name: 'falha', send: async () => { throw new Error('fornecedor fora do ar'); } });
    expect((await pedir({ email: 'b@b.co', password: SENHA })).statusCode).toBe(202);
  });

  it('e-mail ou senha inválidos: 400, sem e-mail nem pedido guardado', async () => {
    expect((await pedir({ email: 'x@y.co', password: 'curta' })).statusCode).toBe(400);
    expect((await pedir({ email: 'semarroba', password: SENHA })).statusCode).toBe(400);
    await enviados();
    expect(mailer.sent).toEqual([]);
    expect(pendentes()).toBe(0);
  });

  it('sem fornecedor de e-mail, o cadastro fica desligado (503), como a recuperação de senha', async () => {
    await setup(null);
    const res = await pedir({ email: 'a@a.co', password: SENHA });
    expect(res.statusCode).toBe(503);
    expect(res.json().error).toBe('O cadastro ainda não está disponível neste servidor.');
    expect(pendentes()).toBe(0);
  });

  it('limite por e-mail, além do limite por IP: ninguém enche a caixa de outra pessoa trocando de IP', async () => {
    for (let i = 0; i < 10; i++) expect((await pedir({ email: 'alvo@caixa.co', password: SENHA }, `203.0.113.${i + 1}`)).statusCode).toBe(202);
    expect((await pedir({ email: 'alvo@caixa.co', password: SENHA }, '203.0.113.99')).statusCode).toBe(429);
    expect((await pedir({ email: 'outra@caixa.co', password: SENHA }, '203.0.113.99')).statusCode).toBe(202);
  });
});

describe('a conta nasce pelo link do e-mail', SCRYPT, () => {
  it('antes do link a conta não existe; o link cria a conta e já entra nela', async () => {
    await pedir({ email: 'Ana@Exemplo.com', password: SENHA, name: 'Ana' });
    await enviados();
    expect(usuarios()).toBe(0);
    expect((await login('ana@exemplo.com')).statusCode).toBe(401);

    const res = await confirmar(mailer.signupToken('ana@exemplo.com'));
    expect(res.statusCode).toBe(201);
    expect(res.json().user).toMatchObject({ email: 'ana@exemplo.com', name: 'Ana' });
    expect(res.json().entitlements.plan).toBe('free');
    const me = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie: cookieOf(res) } });
    expect(me.json().user.email).toBe('ana@exemplo.com');
    expect((await login('ana@exemplo.com')).statusCode).toBe(200);
    expect(pendentes()).toBe(0);
  });

  it('o link vale uma vez só', async () => {
    await pedir({ email: 'a@a.co', password: SENHA });
    await enviados();
    const token = mailer.signupToken('a@a.co');
    expect((await confirmar(token)).statusCode).toBe(201);
    const de_novo = await confirmar(token);
    expect(de_novo.statusCode).toBe(400);
    expect(de_novo.json().error).toContain('Este link não vale mais');
    expect(de_novo.headers['set-cookie']).toBeUndefined();
  });

  it(`o link vence em ${SIGNUP_MINUTES} minutos`, async () => {
    const token = createPendingSignup(db, { email: 'velho@a.co', name: '', passwordHash: await hashPassword(SENHA) }, Date.now() - SIGNUP_MINUTES * 60_000 - 1);
    expect((await confirmar(token)).statusCode).toBe(400);
    expect(usuarios()).toBe(0);
    expect(pendentes()).toBe(0);
  });

  it('código vazio, longo demais ou inventado: 400', async () => {
    for (const token of [null, '', 'x'.repeat(101), 'inventado']) expect((await confirmar(token as string)).statusCode).toBe(400);
  });

  it('um pedido novo troca o anterior: quem tem a caixa de e-mail decide, e um pedido alheio não ocupa o e-mail', async () => {
    await pedir({ email: 'dona@caixa.co', password: 'senha de quem não é a dona' });
    await enviados();
    const alheio = mailer.signupToken('dona@caixa.co');
    await pedir({ email: 'dona@caixa.co', password: SENHA });
    await enviados();
    const daDona = mailer.signupToken('dona@caixa.co');
    expect(mailer.sent.filter((m) => m.to === 'dona@caixa.co').map((m) => m.subject)).toEqual(['Alicerce: confirme o seu cadastro', 'Alicerce: confirme o seu cadastro']);
    expect(pendentes()).toBe(1);
    expect((await confirmar(alheio)).statusCode).toBe(400);
    expect((await confirmar(daDona)).statusCode).toBe(201);
    expect((await login('dona@caixa.co')).statusCode).toBe(200);
    expect((await login('dona@caixa.co', 'senha de quem não é a dona')).statusCode).toBe(401);
  });

  it('se o e-mail ganhou conta enquanto o link esperava: 409, e a conta que existe fica como está', async () => {
    const token = createPendingSignup(db, { email: 'corrida@a.co', name: 'Segundo', passwordHash: await hashPassword('outra frase longa') });
    // a conta chega por outro caminho (um pedido novo trocaria o pedido acima)
    db.prepare('INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)').run('primeiro', 'corrida@a.co', 'Primeiro', await hashPassword(SENHA), Date.now());
    const res = await confirmar(token);
    expect(res.statusCode).toBe(409);
    expect(res.headers['set-cookie']).toBeUndefined();
    expect(usuarios()).toBe(1);
    expect((await login('corrida@a.co')).json().user.name).toBe('Primeiro');
  });

  it('pedidos vencidos são apagados pela rotina do servidor e no próximo pedido', async () => {
    const vencido = () => createPendingSignup(db, { email: 'esquecido@a.co', name: '', passwordHash: 'x' }, Date.now() - SIGNUP_MINUTES * 60_000 - 1);
    createPendingSignup(db, { email: 'recente@a.co', name: '', passwordHash: 'x' });
    vencido();
    expect(app.rotinas.limparCadastros()).toBe(1);
    expect(db.prepare('SELECT email FROM pending_signups').all()).toEqual([{ email: 'recente@a.co' }]);
    vencido();
    await pedir({ email: 'outro@a.co', password: SENHA });
    expect(db.prepare('SELECT email FROM pending_signups ORDER BY email').all()).toEqual([{ email: 'outro@a.co' }, { email: 'recente@a.co' }]);
  });
});
