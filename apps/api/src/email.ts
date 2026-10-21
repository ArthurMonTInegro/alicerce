/**
 * E-mails da conta (por enquanto, só a recuperação de senha).
 *
 * Ainda não há fornecedor de e-mail: FileMailer grava cada mensagem num arquivo,
 * um JSON por linha, para o ambiente de teste e para o e2e lerem. Quando houver
 * fornecedor, ele implementa Mailer e entra no lugar, sem mudar as rotas.
 */
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export interface Mail {
  to: string;
  subject: string;
  text: string;
}

export interface Mailer {
  readonly name: string;
  send(mail: Mail): Promise<void>;
}

export class FileMailer implements Mailer {
  readonly name = "arquivo";
  private readonly path: string;
  constructor(path: string) {
    this.path = path;
  }
  async send(mail: Mail) {
    mkdirSync(dirname(this.path), { recursive: true });
    // 0o600: o arquivo tem links que dão acesso a contas
    appendFileSync(
      this.path,
      JSON.stringify({ at: new Date().toISOString(), ...mail }) + "\n",
      { mode: 0o600 },
    );
  }
}
