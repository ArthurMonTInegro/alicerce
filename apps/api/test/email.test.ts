/**
 * Envio de e-mail pelo Resend (email.ts) contra um fetch simulado que responde como a
 * documentação do Resend descreve (lida em 24/10/2026: "Send Email", "Idempotency Keys",
 * "Errors", "Usage Limits"). Nenhum e-mail sai daqui, e passar aqui não prova que o Resend
 * se comporta assim: isso só um envio de verdade mostra (docs/OPERACAO.md, "E-mail").
 */
import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.ts';
import { drainOutbox, enqueueEmail, MAX_ATTEMPTS } from '../src/avisos.ts';
import { loadConfig } from '../src/config.ts';
import { openDb } from '../src/db.ts';
import { FileMailer, MailError, mailerFor, ResendMailer, senderAddress } from '../src/email.ts';

import { criarConta } from './cadastro.ts';
const CFG = { apiKey: 're_teste_123', from: 'Alicerce <nao-responda@alicerce.exemplo>' };
const MAIL = { to: 'pessoa@exemplo.com', subject: 'Alicerce: trocar a senha', text: 'link secreto https://x/conta/redefinir#t=abc' };

type Resposta = { status: number; body?: unknown; headers?: Record<string, string> } | 'rede';
/** fetch que devolve as respostas na ordem e guarda cada pedido */
function fakeFetch(...respostas: Resposta[]) {
  const pedidos: Array<{ url: string; init: RequestInit; body: Record<string, unknown>; headers: Headers }> = [];
  const http = (async (url: string | URL | Request, init?: RequestInit) => {
    pedidos.push({ url: String(url), init: init!, body: JSON.parse(String(init!.body)), headers: new Headers(init!.headers) });
    const r = respostas.shift() ?? { status: 200, body: { id: 'x' } };
    if (r === 'rede') throw new TypeError('fetch failed: getaddrinfo ENOTFOUND api.resend.com pessoa@exemplo.com');
    return new Response(r.body === undefined ? null : JSON.stringify(r.body), { status: r.status, headers: r.headers });
  }) as typeof fetch;
  return { http, pedidos };
}
const esperas: number[] = [];
const wait = async (ms: number) => {
  esperas.push(ms);
};
const erro = (status: number, name: string, headers?: Record<string, string>): Resposta => ({ status, body: { statusCode: status, name, message: `erro ${name} para pessoa@exemplo.com` }, headers });

describe('ResendMailer', () => {
  it('manda o pedido documentado: POST /emails, Bearer, chave de idempotência, from/to/subject/text', async () => {
    const f = fakeFetch({ status: 200, body: { id: '49a3999c' } });
    await new ResendMailer({ ...CFG, replyTo: 'contato@alicerce.exemplo' }, f.http, wait).send({ ...MAIL, key: 'alicerce/aviso/1/abc' });
    expect(f.pedidos).toHaveLength(1);
    const p = f.pedidos[0]!;
    expect(p.url).toBe('https://api.resend.com/emails');
    expect(p.init.method).toBe('POST');
    expect(p.headers.get('authorization')).toBe('Bearer re_teste_123');
    expect(p.headers.get('idempotency-key')).toBe('alicerce/aviso/1/abc');
    expect(p.body).toEqual({ from: CFG.from, to: ['pessoa@exemplo.com'], subject: MAIL.subject, text: MAIL.text, reply_to: 'contato@alicerce.exemplo' });
    expect(p.init.signal).toBeInstanceOf(AbortSignal);
  });

  it('sem chave dada, gera uma, e a nova tentativa usa a mesma (falha de rede não duplica o e-mail)', async () => {
    esperas.length = 0;
    const f = fakeFetch('rede', { status: 200, body: { id: 'x' } });
    await new ResendMailer(CFG, f.http, wait).send(MAIL);
    expect(f.pedidos).toHaveLength(2);
    const [a, b] = f.pedidos.map((p) => p.headers.get('idempotency-key'));
    expect(a).toMatch(/^alicerce\/[0-9a-f-]{36}$/);
    expect(b).toBe(a);
    expect(esperas).toEqual([1000]);
  });

  it('5xx, limite por segundo (com retry-after) e pedido igual em andamento: uma nova tentativa', async () => {
    for (const [r, espera] of [
      [erro(503, 'service_unavailable'), 1000],
      [erro(500, 'application_error'), 1000],
      [erro(429, 'rate_limit_exceeded', { 'retry-after': '2' }), 2000],
      [erro(429, 'rate_limit_exceeded', { 'retry-after': '60' }), 5000], // espera no máximo 5 s; depois, a fila
      [erro(409, 'concurrent_idempotent_requests'), 1000],
    ] as const) {
      esperas.length = 0;
      const f = fakeFetch(r, { status: 200, body: { id: 'x' } });
      await new ResendMailer(CFG, f.http, wait).send(MAIL);
      expect(f.pedidos).toHaveLength(2);
      expect(esperas).toEqual([espera]);
    }
  });

  it('duas falhas seguidas: MailError que vale tentar depois (a fila espaça as próximas)', async () => {
    const f = fakeFetch(erro(503, 'service_unavailable'), erro(503, 'service_unavailable'));
    const e = await new ResendMailer(CFG, f.http, wait).send(MAIL).catch((x) => x);
    expect(e).toBeInstanceOf(MailError);
    expect(e).toMatchObject({ code: 'Resend 503 service_unavailable', retry: true });
    expect(f.pedidos).toHaveLength(2);
  });

  it('com `once`, uma tentativa só: a fila dos links repete depois de conferir se o link ainda vale', async () => {
    const f = fakeFetch(erro(503, 'service_unavailable'), { status: 200, body: { id: 'x' } });
    const e = await new ResendMailer(CFG, f.http, wait).send({ ...MAIL, once: true }).catch((x) => x);
    expect(e).toMatchObject({ code: 'Resend 503 service_unavailable', retry: true });
    expect(f.pedidos).toHaveLength(1);
  });

  it('cota do dia ou do mês, domínio não verificado, chave errada, corpo diferente com a mesma chave: sem nova tentativa', async () => {
    for (const r of [
      erro(429, 'daily_quota_exceeded'),
      erro(429, 'monthly_quota_exceeded'),
      erro(403, 'validation_error'),
      erro(401, 'validation_error'),
      erro(422, 'missing_required_field'),
      erro(409, 'invalid_idempotent_request'),
    ]) {
      const f = fakeFetch(r);
      const e = await new ResendMailer(CFG, f.http, wait).send(MAIL).catch((x) => x);
      expect(e).toBeInstanceOf(MailError);
      expect(e.retry).toBe(false);
      expect(f.pedidos).toHaveLength(1);
    }
  });

  it('a mensagem do erro nunca traz destinatário, assunto, texto ou o que o Resend escreveu', async () => {
    for (const r of [erro(403, 'validation_error'), 'rede' as const, { status: 502, body: 'não é JSON pessoa@exemplo.com' }, erro(400, 'Nome Estranho pessoa@exemplo.com')]) {
      const f = fakeFetch(r, r);
      const e: MailError = await new ResendMailer(CFG, f.http, wait).send(MAIL).catch((x) => x);
      for (const s of ['pessoa@exemplo.com', 'trocar a senha', 'link secreto', 'abc', 're_teste_123']) expect(e.message).not.toContain(s);
      expect(e.code).toMatch(/^(Resend \d{3}( [a-z_]+)?|sem resposta do Resend \(TypeError\))$/);
    }
  });

  it('configuração: chave e remetente obrigatórios', () => {
    expect(() => new ResendMailer({ ...CFG, apiKey: '' })).toThrow(/RESEND_API_KEY/);
    expect(() => new ResendMailer({ ...CFG, from: 'Alicerce' })).toThrow(/EMAIL_REMETENTE/);
    expect(senderAddress('Alicerce <Nao-Responda@Alicerce.Exemplo>')).toBe('nao-responda@alicerce.exemplo');
    expect(senderAddress('nao-responda@alicerce.exemplo')).toBe('nao-responda@alicerce.exemplo');
    expect(senderAddress('Alicerce <nao-responda>')).toBeNull();
    expect(senderAddress('a@b.c d@e.f')).toBeNull();
  });
});

describe('qual fornecedor a configuração liga', () => {
  it('EMAIL_PROVEDOR=resend liga o Resend; um nome desconhecido não deixa o servidor subir', () => {
    const c = loadConfig({ EMAIL_PROVEDOR: 'resend', RESEND_API_KEY: 're_x', EMAIL_REMETENTE: CFG.from, EMAIL_RESPONDER_PARA: 'contato@alicerce.exemplo' });
    expect(c.resend).toEqual({ apiKey: 're_x', from: CFG.from, replyTo: 'contato@alicerce.exemplo' });
    expect(mailerFor(c)).toBeInstanceOf(ResendMailer);
    expect(() => loadConfig({ EMAIL_PROVEDOR: 'sendgrid' })).toThrow(/EMAIL_PROVEDOR desconhecido/);
    expect(() => mailerFor(loadConfig({ EMAIL_PROVEDOR: 'resend', EMAIL_REMETENTE: CFG.from }))).toThrow(/RESEND_API_KEY/);
  });

  it('sem fornecedor: o arquivo fora de produção, nada em produção; o endereço de teste do Resend é recusado em produção', () => {
    expect(mailerFor(loadConfig({}))).toBeInstanceOf(FileMailer);
    expect(mailerFor(loadConfig({ NODE_ENV: 'production' }))).toBeNull();
    const teste = { EMAIL_PROVEDOR: 'resend', RESEND_API_KEY: 're_x', EMAIL_REMETENTE: 'Alicerce <onboarding@resend.dev>' };
    expect(mailerFor(loadConfig(teste))).toBeInstanceOf(ResendMailer);
    expect(() => mailerFor(loadConfig({ ...teste, NODE_ENV: 'production' }))).toThrow(/domínio verificado/);
    expect(mailerFor(loadConfig({ ...teste, NODE_ENV: 'production', EMAIL_REMETENTE: CFG.from }))).toBeInstanceOf(ResendMailer);
  });
});

describe('fila dos avisos com o Resend', () => {
  function fila() {
    const db = openDb(':memory:');
    db.prepare("INSERT INTO users (id, email, password_hash, created_at) VALUES ('u1', 'pessoa@exemplo.com', 'x', 0)").run();
    const dados = { provedor: 'asaas', periodo: 'mensal' as const, preco: 1990, pagoAte: Date.UTC(2026, 10, 24), desistirAte: null };
    db.exec('BEGIN');
    enqueueEmail(db, 'u1', 'cancelamento', 'cancelamento:s1', dados, 0);
    db.exec('COMMIT');
    return db;
  }
  const ctx = { appUrl: 'https://alicerce.exemplo', seller: null };

  it('a mesma tentativa repetida usa a mesma chave; o erro guardado é só o código', async () => {
    const db = fila();
    const f = fakeFetch(erro(503, 'service_unavailable'), erro(503, 'service_unavailable'), { status: 200, body: { id: 'x' } });
    const mailer = new ResendMailer(CFG, f.http, wait);
    const r1 = await drainOutbox(db, mailer, ctx, 1_000);
    expect(r1).toEqual({ enviados: 0, falhas: 1, esgotados: 0, erros: { 'Resend 503 service_unavailable': 1 } });
    expect(db.prepare('SELECT last_error FROM email_outbox').get()).toEqual({ last_error: 'Resend 503 service_unavailable' });
    const r2 = await drainOutbox(db, mailer, ctx, 1_000 + 61_000);
    expect(r2).toMatchObject({ enviados: 1, falhas: 0 });
    const chaves = new Set(f.pedidos.map((p) => p.headers.get('idempotency-key')));
    expect(chaves.size).toBe(1);
    expect([...chaves][0]).toMatch(/^alicerce\/aviso\/1\/[0-9a-f]{32}$/);
  });

  it('a última tentativa que falha conta como esgotada, para virar um aviso no log', async () => {
    const db = fila();
    db.prepare('UPDATE email_outbox SET attempts = ?').run(MAX_ATTEMPTS - 1);
    const f = fakeFetch(erro(403, 'validation_error'));
    const r = await drainOutbox(db, new ResendMailer(CFG, f.http, wait), ctx, 1_000);
    expect(r).toEqual({ enviados: 0, falhas: 1, esgotados: 1, erros: { 'Resend 403 validation_error': 1 } });
    // e não é tentada de novo
    expect(await drainOutbox(db, new ResendMailer(CFG, fakeFetch().http, wait), ctx, 10 * 86_400_000)).toMatchObject({ enviados: 0, falhas: 0 });
  });
});

describe('recuperação de senha com o Resend fora do ar', () => {
  it('a resposta é a mesma (202), e o log diz só o código do erro: nem o e-mail, nem o link', async () => {
    const linhas: string[] = [];
    const f = fakeFetch(erro(503, 'service_unavailable'), erro(503, 'service_unavailable'));
    const db = openDb(':memory:');
    const app = await buildApp({
      config: { ...loadConfig({ APP_URL: 'https://alicerce.exemplo' }), webDist: '/nao-existe' },
      db,
      mailer: new ResendMailer(CFG, f.http, wait),
      logger: { stream: { write: (l: string) => void linhas.push(l) } },
    });
    const H = { 'content-type': 'application/json', 'x-alicerce': '1' };
    await criarConta(app, db, { email: 'pessoa@exemplo.com', password: 'uma frase longa' });
    const com = await app.inject({ method: 'POST', url: '/api/auth/senha/recuperar', headers: H, payload: { email: 'pessoa@exemplo.com' } });
    const sem = await app.inject({ method: 'POST', url: '/api/auth/senha/recuperar', headers: H, payload: { email: 'ninguem@exemplo.com' } });
    expect([com.statusCode, com.body]).toEqual([sem.statusCode, sem.body]);
    expect(com.statusCode).toBe(202);
    await app.rotinas.enviarLinks(); // o envio corre sem a resposta esperar (links.ts)
    const token = String(f.pedidos[0]!.body.text).match(/#t=([\w-]+)/)![1]!;
    const falha = linhas.map((l) => JSON.parse(l)).find((l) => l.msg?.startsWith('e-mails com link (cadastro, senha): falha no envio'));
    expect(falha?.links).toEqual({ enviados: 0, falhas: 1, erros: { 'Resend 503 service_unavailable': 1 } });
    // uma tentativa só por envio: a fila é que repete, conferindo antes se o link ainda vale
    expect(f.pedidos).toHaveLength(1);
    const tudo = linhas.join('\n');
    for (const s of ['pessoa@exemplo.com', token, 're_teste_123']) expect(tudo).not.toContain(s);
    await app.close();
  });
});
