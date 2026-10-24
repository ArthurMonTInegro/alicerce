/**
 * Cadastro nos testes de navegador. A conta nasce pelo link do e-mail (apps/api/src/app.ts); o
 * servidor dos testes grava os e-mails em test-results/emails.log (playwright.config.ts).
 */
import { existsSync, readFileSync } from 'node:fs';
import { expect, type APIRequestContext } from '@playwright/test';

const EMAILS = 'test-results/emails.log';

function emails(): { to: string; subject: string; text: string }[] {
  return existsSync(EMAILS) ? readFileSync(EMAILS, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
}

/** Assuntos dos e-mails enviados ao endereço, na ordem. */
export const assuntosPara = (email: string) => emails().filter((m) => m.to === email).map((m) => m.subject);

/** Caminho do link de confirmação (/conta/confirmar#t=...) no último e-mail do cadastro para o endereço. */
export async function linkDoCadastro(email: string): Promise<string> {
  let link: string | undefined;
  // a resposta do cadastro não espera o envio: o e-mail chega ao arquivo logo depois
  await expect
    .poll(() => {
      link = /\/conta\/confirmar#t=[A-Za-z0-9_-]+/.exec(emails().filter((m) => m.to === email).at(-1)?.text ?? '')?.[0];
      return link;
    })
    .toBeTruthy();
  return link!;
}

/** Cadastro completo pela API, como uma pessoa faria: o pedido e o link do e-mail. A sessão fica em `req`. */
export async function cadastrar(req: APIRequestContext, dados: { email: string; password: string; name: string }): Promise<{ id: string }> {
  const r = await req.post('/api/auth/register', { data: dados, headers: { 'x-alicerce': '1' } });
  expect(r.status()).toBe(202);
  const token = new URLSearchParams((await linkDoCadastro(dados.email)).split('#')[1]).get('t');
  const c = await req.post('/api/auth/confirmar', { data: { token }, headers: { 'x-alicerce': '1' } });
  expect(c.status()).toBe(201);
  return { id: (await c.json()).user.id as string };
}
