/**
 * E-mails da assinatura (avisos.ts): a fila gravada junto com o evento de pagamento, o
 * texto de cada aviso, as novas tentativas quando o fornecedor de e-mail falha e o
 * pedido de desistência que vale mesmo com o provedor fora do ar. Servidor real com
 * SQLite em memória, o provedor de pagamento de teste e um "fornecedor de e-mail" na
 * memória: nenhum e-mail sai de verdade.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.ts';
import { TestPaymentProvider, WITHDRAWAL_DAYS } from '../src/assinatura.ts';
import { drainOutbox, MAX_ATTEMPTS } from '../src/avisos.ts';
import { loadConfig } from '../src/config.ts';
import { openDb } from '../src/db.ts';
import type { Mail, Mailer } from '../src/email.ts';
import { setPlan } from '../src/plans.ts';

import { criarConta } from './cadastro.ts';
const H = { 'content-type': 'application/json', 'x-alicerce': '1' };
const DIA = 86_400_000;
let db: ReturnType<typeof openDb>;
let app: Awaited<ReturnType<typeof buildApp>>;
let mails: Mail[];
let quebrado: boolean;
let cookie: string;
let userId: string;
const mailer: Mailer = {
  name: 'memoria',
  send: async (m) => {
    if (quebrado) throw new Error('fornecedor de e-mail fora do ar');
    mails.push(m);
  },
};

beforeEach(async () => {
  mails = [];
  quebrado = false;
  db = openDb(':memory:');
  app = await buildApp({
    config: { ...loadConfig({ PAGAMENTO_PROVEDOR: 'teste', APP_URL: 'https://alicerce.exemplo', VENDEDOR_IDENTIFICACAO: 'Fulano de Tal, CPF 000.000.000-00, Fortaleza (CE), contato@exemplo.com' }), webDist: '/nao-existe' },
    db,
    mailer,
  });
  const r = await criarConta(app, db, { email: 'e@exemplo.com', password: 'uma frase longa' });
  cookie = String(r.headers['set-cookie']).split(';')[0]!;
  userId = r.json().user.id;
});
const post = (url: string, payload: object = {}) => app.inject({ method: 'POST', url, headers: { ...H, cookie }, payload });
async function assinar(periodo: 'mensal' | 'anual' = 'mensal') {
  const r = await post('/api/assinatura', { periodo });
  const id = decodeURIComponent(new URL(r.json().url, 'http://x').hash.slice('#a='.length));
  expect((await post('/api/pagamento/teste/simular', { assinatura: id, resultado: 'aprovar' })).statusCode).toBe(200);
  return id;
}
const enviar = () => app.rotinas.enviarEmails();
const fila = () => db.prepare('SELECT kind, attempts, sent_at IS NOT NULL AS enviado FROM email_outbox ORDER BY id').all();

describe('e-mails da assinatura', () => {
  it('confirmação da compra: uma vez, com o resumo, o prazo de desistência e quem vende', async () => {
    const id = await assinar('anual');
    await enviar();
    expect(mails).toHaveLength(1);
    const m = mails[0]!;
    expect(m.to).toBe('e@exemplo.com');
    expect(m.subject).toBe('Confirmação da sua assinatura do Premium da Alicerce');
    expect(m.text).toMatch(/^\[Ambiente de teste: nada foi cobrado/);
    expect(m.text).toContain('Plano: Premium anual (R$ 149,00 por ano)');
    expect(m.text).toMatch(/Você pode desistir até \d+ de \S+ de \d{4} e receber de volta o valor integral/);
    expect(m.text).toContain('https://alicerce.exemplo/conta');
    expect(m.text).toContain('Fornecedor: Fulano de Tal, CPF 000.000.000-00');
    // o mesmo pagamento reentregue (outro id) ou uma renovação não repetem a confirmação
    await post('/api/pagamento/teste/simular', { assinatura: id, resultado: 'renovar' });
    await enviar();
    expect(mails).toHaveLength(1);
  });

  it('cancelamento, renovação recusada e reembolso: cada um com o seu aviso', async () => {
    const id = await assinar();
    await post('/api/pagamento/teste/simular', { assinatura: id, resultado: 'falhar-renovacao' });
    await post('/api/assinatura/cancelar');
    await post('/api/assinatura/desistir');
    await enviar();
    expect(mails.map((m) => m.subject)).toEqual([
      'Confirmação da sua assinatura do Premium da Alicerce',
      'Não conseguimos renovar sua assinatura do Premium',
      'Renovação da assinatura do Premium cancelada',
      'Reembolso da sua assinatura do Premium',
    ]);
    expect(mails[1]!.text).toMatch(/Seu acesso ao Premium continua até .* Seu progresso não se perde/s);
    expect(mails[2]!.text).toContain('Nenhuma nova cobrança será feita');
    expect(mails[2]!.text).toContain('ainda dá para desistir com reembolso integral');
    expect(mails[3]!.text).toContain('A conta voltou ao plano gratuito');
  });

  it('reembolso com outro direito valendo: o aviso diz que a conta continua Premium', async () => {
    setPlan(db, userId, 'premium', null, 'admin');
    await assinar();
    await post('/api/assinatura/desistir');
    await enviar();
    expect(mails.at(-1)!.text).toContain('continua Premium por outro direito, sem data para acabar');
  });

  it('fornecedor de e-mail fora do ar: o aviso espera e sai numa nova tentativa, sem duplicar', async () => {
    quebrado = true;
    await assinar();
    expect(await enviar()).toEqual({ enviados: 0, falhas: 1, esgotados: 0, erros: { ['erro inesperado no envio (Error)']: 1 } });
    expect(fila()).toEqual([{ kind: 'compra', attempts: 1, enviado: 0 }]);
    quebrado = false;
    expect(await enviar()).toMatchObject({ enviados: 0, falhas: 0 }); // ainda dentro da espera
    const ctx = { appUrl: 'https://alicerce.exemplo', seller: null };
    expect(await drainOutbox(db, mailer, ctx, Date.now() + 2 * 60_000)).toMatchObject({ enviados: 1, falhas: 0 });
    expect(await drainOutbox(db, mailer, ctx, Date.now() + 3 * 60_000)).toMatchObject({ enviados: 0, falhas: 0 });
    expect(mails).toHaveLength(1);
    expect(mails[0]!.text).toContain('identificação ainda não configurada');
  });

  it('depois de todas as tentativas, o aviso para de tentar e fica registrado como falho', async () => {
    quebrado = true;
    await assinar();
    const ctx = { appUrl: 'https://x', seller: null };
    for (let i = 0, t = Date.now(); i < MAX_ATTEMPTS + 2; i++, t += 3 * DIA) await drainOutbox(db, mailer, ctx, t);
    expect(db.prepare('SELECT attempts, sent_at, last_error FROM email_outbox').get()).toEqual({ attempts: MAX_ATTEMPTS, sent_at: null, last_error: 'erro inesperado no envio (Error)' }); // só o tipo: a mensagem de um erro qualquer poderia trazer o destinatário ou o texto
  });

  it('sem fornecedor de e-mail, os avisos esperam na fila', async () => {
    const outro = openDb(':memory:');
    const semEmail = await buildApp({ config: { ...loadConfig({ PAGAMENTO_PROVEDOR: 'teste' }), webDist: '/nao-existe' }, db: outro, mailer: null });
    const r = await criarConta(semEmail, outro, { email: 's@exemplo.com', password: 'uma frase longa' });
    const c = String(r.headers['set-cookie']).split(';')[0]!;
    const s = await semEmail.inject({ method: 'POST', url: '/api/assinatura', headers: { ...H, cookie: c }, payload: { periodo: 'mensal' } });
    const id = decodeURIComponent(new URL(s.json().url, 'http://x').hash.slice('#a='.length));
    await semEmail.inject({ method: 'POST', url: '/api/pagamento/teste/simular', headers: { ...H, cookie: c }, payload: { assinatura: id, resultado: 'aprovar' } });
    expect(await semEmail.rotinas.enviarEmails()).toEqual({ enviados: 0, falhas: 0, esgotados: 0, erros: {} });
    expect(outro.prepare('SELECT COUNT(*) AS n FROM email_outbox WHERE sent_at IS NULL').get()).toEqual({ n: 1 });
  });

  it('evento que falha ao gravar não deixa aviso na fila; excluir a conta apaga os avisos dela', async () => {
    db.exec("CREATE TRIGGER falha BEFORE UPDATE OF plan ON users BEGIN SELECT RAISE(ABORT, 'falha simulada'); END;");
    const r = await post('/api/assinatura', { periodo: 'mensal' });
    const id = decodeURIComponent(new URL(r.json().url, 'http://x').hash.slice('#a='.length));
    expect((await post('/api/pagamento/teste/simular', { assinatura: id, resultado: 'aprovar' })).statusCode).toBe(500);
    expect(fila()).toEqual([]);
    db.exec('DROP TRIGGER falha');
    // a nova entrega do mesmo pagamento grava o evento e, junto, o aviso (que fica na fila sem fornecedor de e-mail)
    quebrado = true;
    expect((await post('/api/pagamento/teste/simular', { assinatura: id, resultado: 'aprovar' })).statusCode).toBe(200);
    expect(db.prepare('SELECT kind FROM email_outbox').all()).toEqual([{ kind: 'compra' }]);
    await app.inject({ method: 'DELETE', url: '/api/auth/me', headers: { ...H, cookie }, payload: { password: 'uma frase longa' } });
    expect(fila()).toEqual([]);
  });
});

describe('pedido de desistência com o provedor fora do ar', () => {
  it('pedido no 6º dia, estorno só no 8º: o direito continua', async () => {
    const id = await assinar();
    const provedor = app.pagamentos as TestPaymentProvider;
    db.prepare('UPDATE subscriptions SET first_paid_at = ? WHERE id = ?').run(Date.now() - 6 * DIA, id);
    provedor.fail('refund');
    expect((await post('/api/assinatura/desistir')).statusCode).toBe(502);
    // dois dias depois (o pedido foi registrado dentro do prazo)
    db.prepare('UPDATE subscriptions SET first_paid_at = first_paid_at - ?, withdrawal_requested_at = withdrawal_requested_at - ? WHERE id = ?').run(2 * DIA, 2 * DIA, id);
    provedor.restore();
    const r = await post('/api/assinatura/desistir');
    expect(r.statusCode).toBe(200);
    expect(r.json().assinatura.situacao).toBe('reembolsada');
  });

  it('sem pedido dentro do prazo, depois dos 7 dias não dá mais', async () => {
    const id = await assinar();
    db.prepare('UPDATE subscriptions SET first_paid_at = ? WHERE id = ?').run(Date.now() - (WITHDRAWAL_DAYS * DIA + 1000), id);
    expect((await post('/api/assinatura/desistir')).statusCode).toBe(409);
  });
});
