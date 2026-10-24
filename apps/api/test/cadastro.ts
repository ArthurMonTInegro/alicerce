/**
 * Contas para os testes. O cadastro é em dois passos (pedido + link do e-mail, app.ts); os
 * testes que só precisam de uma conta usam `criarConta`, que grava o pedido direto no banco e
 * abre o link pela API: a resposta é a da confirmação (201, cookie da sessão, user e direitos),
 * no mesmo formato que o cadastro tinha antes. Os testes do próprio cadastro usam
 * `MemoryMailer` e leem o link do e-mail.
 */
import type { DatabaseSync } from 'node:sqlite';
import { createPendingSignup, hashPassword } from '../src/auth.ts';
import type { Mail, Mailer } from '../src/email.ts';

const H = { 'content-type': 'application/json', 'x-alicerce': '1' };

interface Injector {
  inject: (opts: { method: 'POST'; url: string; headers: Record<string, string>; payload: object; remoteAddress?: string }) => Promise<{ statusCode: number; headers: Record<string, unknown>; json: () => any }>;
}

export async function criarConta(app: Injector, db: DatabaseSync, conta: { email: string; password: string; name?: string }, opts: { remoteAddress?: string } = {}) {
  const token = createPendingSignup(db, { email: conta.email.trim().toLowerCase(), name: conta.name ?? '', passwordHash: await hashPassword(conta.password) });
  return app.inject({ method: 'POST', url: '/api/auth/confirmar', headers: H, payload: { token }, ...opts });
}

/** Guarda os e-mails em memória, para o teste ler o link. */
export class MemoryMailer implements Mailer {
  readonly name = 'memória';
  sent: Mail[] = [];
  async send(mail: Mail) {
    this.sent.push(mail);
  }
  /** O código do link de confirmação no último e-mail para o endereço; null se não houver. */
  signupToken(to: string): string | null {
    const mail = this.sent.filter((m) => m.to === to).at(-1);
    return mail ? (/\/conta\/confirmar#t=([A-Za-z0-9_-]+)/.exec(mail.text)?.[1] ?? null) : null;
  }
}
