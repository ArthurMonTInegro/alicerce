/**
 * E-mails da conta (recuperação de senha) e da assinatura (avisos.ts).
 *
 * Dois fornecedores implementam Mailer:
 * - FileMailer grava cada mensagem num arquivo, um JSON por linha, para o ambiente de teste e
 *   para o e2e lerem. Nunca em produção (config.ts).
 * - ResendMailer envia pelo Resend (https://resend.com/docs, lido em 24/10/2026), o fornecedor
 *   recomendado em docs/OPERACAO.md: plano gratuito sem dependência nova (só fetch). Testado só
 *   com um fetch simulado (test/email.test.ts); nenhum e-mail real foi enviado.
 */
import { randomUUID } from "node:crypto";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export interface Mail {
  to: string;
  subject: string;
  text: string;
  /**
   * Chave de idempotência: o mesmo e-mail pedido de novo com ela não sai duas vezes no
   * fornecedor (no Resend, por 24 h e só se o corpo for igual). Sem ela, cada envio gera a sua.
   */
  key?: string;
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

/**
 * Falha de envio. A mensagem diz só a resposta do fornecedor (código e nome do erro): nunca
 * o destinatário, o assunto nem o corpo, que têm o link de recuperação de senha. Ela vai para
 * o log e para email_outbox.last_error.
 */
export class MailError extends Error {
  readonly code: string;
  /** vale tentar de novo daqui a pouco (rede, 5xx, limite por segundo, pedido igual em andamento) */
  readonly retry: boolean;
  readonly retryAfterMs: number | null;
  constructor(code: string, retry: boolean, retryAfterMs: number | null = null) {
    super(`e-mail não enviado: ${code}`);
    this.code = code;
    this.retry = retry;
    this.retryAfterMs = retryAfterMs;
  }
}

export interface ResendConfig {
  apiKey: string;
  /** remetente, num domínio verificado no Resend: "Alicerce <nao-responda@exemplo.com.br>" */
  from: string;
  replyTo?: string | null;
}

/** O endereço de "Nome <endereço>" ou do endereço sozinho; null se não parecer um e-mail. */
export function senderAddress(from: string): string | null {
  const f = from.trim();
  const a = (f.match(/<([^<>\s]+)>$/) ?? f.match(/^([^<>\s]+)$/))?.[1]?.toLowerCase() ?? null;
  return a && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a) ? a : null;
}

/**
 * O fornecedor que a configuração pede: o Resend (EMAIL_PROVEDOR=resend), o arquivo (fora de
 * produção) ou nenhum (a recuperação de senha responde 503 e os avisos esperam na fila).
 */
export function mailerFor(c: { production: boolean; resend: ResendConfig | null; emailLogPath: string | null }): Mailer | null {
  if (c.resend) {
    const mailer = new ResendMailer(c.resend);
    if (c.production && senderAddress(c.resend.from)!.endsWith("@resend.dev"))
      throw new Error("Em produção, EMAIL_REMETENTE precisa ser de um domínio verificado no Resend: o endereço de teste do resend.dev só entrega para o dono da conta.");
    return mailer;
  }
  return c.emailLogPath ? new FileMailer(c.emailLogPath) : null;
}

const RESEND_URL = "https://api.resend.com/emails";
const RESEND_TIMEOUT_MS = 10_000;
/** No mesmo envio, uma nova tentativa só; a fila (avisos.ts) espaça as seguintes. */
const RESEND_ATTEMPTS = 2;
const RESEND_MAX_WAIT_MS = 5_000;

/**
 * Envio pelo Resend, conforme a documentação lida em 24/10/2026:
 * - POST https://api.resend.com/emails, `Authorization: Bearer <chave>`, corpo com `from`,
 *   `to`, `subject` e `text` ("Send Email");
 * - `Idempotency-Key` de até 256 caracteres, guardada por 24 h: o mesmo pedido com o mesmo
 *   corpo não sai de novo; com outro corpo, 409 `invalid_idempotent_request`; com o primeiro
 *   ainda em andamento, 409 `concurrent_idempotent_requests` ("Idempotency Keys");
 * - 5xx e 429 `rate_limit_exceeded` (com `retry-after`) podem ser repetidos; 429
 *   `daily_quota_exceeded` e `monthly_quota_exceeded` só depois de a cota voltar; os outros
 *   4xx não ("Errors", "Usage Limits");
 * - antes de verificar um domínio, o Resend só entrega para o e-mail da própria conta (403).
 *
 * A mesma chave vale para as duas tentativas deste envio, então repetir depois de uma falha
 * de rede não duplica o e-mail.
 */
export class ResendMailer implements Mailer {
  readonly name = "resend";
  private readonly cfg: ResendConfig;
  private readonly http: typeof fetch;
  private readonly wait: (ms: number) => Promise<void>;
  constructor(cfg: ResendConfig, http: typeof fetch = fetch, wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))) {
    if (!cfg.apiKey) throw new Error("RESEND_API_KEY ausente: sem ela o Resend não envia nada.");
    if (!senderAddress(cfg.from))
      throw new Error('EMAIL_REMETENTE precisa ser um endereço, como "Alicerce <nao-responda@exemplo.com.br>".');
    this.cfg = cfg;
    this.http = http;
    this.wait = wait;
  }

  async send(mail: Mail) {
    const key = (mail.key ?? `alicerce/${randomUUID()}`).slice(0, 256);
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.sendOnce(mail, key);
      } catch (e) {
        if (!(e instanceof MailError) || !e.retry || attempt >= RESEND_ATTEMPTS) throw e;
        await this.wait(Math.min(e.retryAfterMs ?? 1_000, RESEND_MAX_WAIT_MS));
      }
    }
  }

  private async sendOnce(mail: Mail, key: string) {
    let res: Response;
    try {
      res = await this.http(RESEND_URL, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.cfg.apiKey}`,
          "content-type": "application/json",
          "idempotency-key": key,
        },
        body: JSON.stringify({
          from: this.cfg.from,
          to: [mail.to],
          subject: mail.subject,
          text: mail.text,
          ...(this.cfg.replyTo ? { reply_to: this.cfg.replyTo } : {}),
        }),
        signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
      });
    } catch (e) {
      // Só o tipo do erro (TimeoutError, TypeError...): a mensagem pode trazer detalhes do pedido.
      throw new MailError(`sem resposta do Resend (${(e as Error).name})`, true);
    }
    if (res.ok) return;
    let name = "";
    try {
      const b = (await res.json()) as { name?: unknown };
      if (typeof b.name === "string" && /^[a-z_]{1,60}$/.test(b.name)) name = b.name;
    } catch {
      /* corpo que não é JSON: fica só o código */
    }
    const code = `Resend ${res.status}${name ? ` ${name}` : ""}`;
    const after = res.headers.get("retry-after");
    const retryAfterMs = after !== null && /^\d+$/.test(after.trim()) ? Number(after) * 1000 : null;
    const retry =
      res.status >= 500 ||
      (res.status === 429 && name !== "daily_quota_exceeded" && name !== "monthly_quota_exceeded") ||
      (res.status === 409 && name === "concurrent_idempotent_requests");
    throw new MailError(code, retry, retryAfterMs);
  }
}
