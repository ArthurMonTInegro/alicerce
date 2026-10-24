/**
 * E-mails da assinatura: confirmação da compra (Decreto 7.962/2013, art. 4º), renovação
 * recusada, cancelamento e reembolso.
 *
 * O aviso entra numa fila (email_outbox) na mesma transação que aplica o evento de
 * pagamento: se o evento ficou, o aviso ficou. O envio vem depois, fora da transação
 * (drainOutbox), com novas tentativas espaçadas quando o fornecedor de e-mail falha.
 * Cada aviso tem uma chave (dedupe_key): o mesmo fato nunca vira dois e-mails, nem com
 * o evento reentregue com outro id. Se o processo cair entre o envio e o registro do
 * envio, aquele e-mail pode sair duas vezes; nunca deixa de sair por isso.
 *
 * Só ficam guardados os fatos (tipo e dados); o texto é montado na hora do envio.
 */
import { createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { MailError, type Mail, type Mailer } from "./email.ts";

export type EmailKind =
  | "compra"
  | "renovacao_recusada"
  | "cancelamento"
  | "reembolso";

export interface EmailData {
  provedor: string;
  periodo: "mensal" | "anual";
  preco: number;
  pagoAte: number | null;
  desistirAte: number | null;
  /** depois do reembolso: até quando a conta continua Premium por outro direito (null = não continua) */
  premiumAte?: number | null;
  premiumSemFim?: boolean;
  /**
   * Reembolso de uma cobrança só (cobrancas.ts), não da assinatura toda: o período que ela
   * cobria e se a assinatura continua renovando.
   */
  cobranca?: { de: number | null; ate: number | null; renova: boolean };
}

/** Espera antes de cada nova tentativa de envio; depois da última, o aviso fica como falho. */
const BACKOFF_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 3_600_000, 12 * 3_600_000, 24 * 3_600_000];
export const MAX_ATTEMPTS = BACKOFF_MS.length + 1;
/** Quanto tempo um envio em andamento "segura" o aviso (outra rodada não o pega junto). */
const LEASE_MS = 10 * 60_000;

/** Põe o aviso na fila, dentro da transação aberta. A mesma chave duas vezes vale uma. */
export function enqueueEmail(
  db: DatabaseSync,
  userId: string,
  kind: EmailKind,
  key: string,
  data: EmailData,
  now = Date.now(),
) {
  db.prepare(
    "INSERT OR IGNORE INTO email_outbox (user_id, kind, dedupe_key, to_address, data, created_at, next_attempt_at) SELECT id, ?, ?, email, ?, ?, ? FROM users WHERE id = ?",
  ).run(kind, key, JSON.stringify(data), now, now, userId);
}

export interface RenderContext {
  appUrl: string;
  /** nome, CPF ou CNPJ, endereço e contato de quem vende (VENDEDOR_IDENTIFICACAO) */
  seller: string | null;
}

const reais = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dia = (t: number | null | undefined) =>
  t == null
    ? "—"
    : new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Sao_Paulo" }).format(t);

export function renderEmail(kind: EmailKind, to: string, d: EmailData, ctx: RenderContext, now = Date.now()): Mail {
  const conta = `${ctx.appUrl}/conta`;
  const teste = d.provedor === "teste" ? ["[Ambiente de teste: nada foi cobrado e nenhum valor será devolvido.]", ""] : [];
  const plano = `Premium ${d.periodo} (${reais(d.preco)} por ${d.periodo === "anual" ? "ano" : "mês"})`;
  const lines = (subject: string, body: string[]): Mail => ({
    to,
    subject,
    text: [...teste, "Olá,", "", ...body, "", "Equipe Alicerce"].join("\n"),
  });
  if (kind === "compra")
    return lines("Confirmação da sua assinatura do Premium da Alicerce", [
      "Recebemos o pagamento da sua assinatura. Guarde este e-mail: ele é a confirmação da compra.",
      "",
      `Plano: ${plano}`,
      `Acesso ao Premium até: ${dia(d.pagoAte)}`,
      "Renovação: automática ao fim de cada período, até você cancelar.",
      "",
      `Você pode desistir até ${dia(d.desistirAte)} e receber de volta o valor integral (Código de Defesa do Consumidor, art. 49). Depois disso, cancelar para a renovação, e o acesso continua até o fim do período pago.`,
      "",
      `Para cancelar ou desistir: ${conta}, na seção "Assinatura do Premium".`,
      "",
      `Fornecedor: ${ctx.seller ?? "identificação ainda não configurada (VENDEDOR_IDENTIFICACAO)"}`,
    ]);
  if (kind === "renovacao_recusada")
    return lines("Não conseguimos renovar sua assinatura do Premium", [
      "A cobrança da renovação da sua assinatura não foi aprovada.",
      "",
      `Seu acesso ao Premium continua até ${dia(d.pagoAte)}. Depois disso, se nenhum pagamento for aprovado, a conta volta ao plano gratuito. Seu progresso não se perde.`,
      "",
      `Você vê a situação da assinatura em ${conta}.`,
    ]);
  if (kind === "cancelamento")
    return lines("Renovação da assinatura do Premium cancelada", [
      "A renovação da sua assinatura foi cancelada. Nenhuma nova cobrança será feita.",
      "",
      `Seu acesso ao Premium continua até ${dia(d.pagoAte)}. Depois, a conta volta ao plano gratuito, sem perder o progresso.`,
      ...(d.desistirAte !== null && d.desistirAte > now
        ? ["", `Se quiser o valor de volta, ainda dá para desistir com reembolso integral até ${dia(d.desistirAte)}, em ${conta}.`]
        : []),
    ]);
  if (d.cobranca) {
    const c = d.cobranca;
    return lines("Reembolso de uma cobrança da sua assinatura do Premium", [
      c.de !== null
        ? `Registramos o reembolso da cobrança de ${dia(c.de)} a ${dia(c.ate)} da sua assinatura ${plano}.`
        : `Registramos o reembolso de uma cobrança da sua assinatura ${plano}, do período que ia até ${dia(c.ate)}.`,
      "O prazo para o valor aparecer depende do meio de pagamento e do provedor.",
      "",
      d.premiumSemFim
        ? "A sua conta continua Premium, sem data para acabar."
        : d.premiumAte
          ? `A sua conta continua Premium até ${dia(d.premiumAte)}.`
          : "Esta cobrança não dá mais acesso ao Premium, e a conta voltou ao plano gratuito, sem perder o progresso.",
      ...(c.renova
        ? ["", `A assinatura continua ativa e renova sozinha ao fim de cada período. Para parar a renovação: ${conta}, na seção "Assinatura do Premium".`]
        : []),
    ]);
  }
  return lines("Reembolso da sua assinatura do Premium", [
    `Registramos o reembolso integral da sua assinatura ${plano}.`,
    "O prazo para o valor aparecer depende do meio de pagamento e do provedor.",
    "",
    d.premiumSemFim
      ? "Esta assinatura não dá mais acesso ao Premium, mas a sua conta continua Premium por outro direito, sem data para acabar."
      : d.premiumAte
        ? `Esta assinatura não dá mais acesso ao Premium, mas a sua conta continua Premium até ${dia(d.premiumAte)} por outro direito.`
        : "Esta assinatura não dá mais acesso ao Premium. A conta voltou ao plano gratuito, sem perder o progresso.",
  ]);
}

export interface DrainReport {
  enviados: number;
  falhas: number;
  /** avisos que falharam pela última vez nesta rodada e não serão mais tentados */
  esgotados: number;
  /** quantas falhas de cada tipo (só o código do fornecedor, sem destinatário nem texto) */
  erros: Record<string, number>;
}

/**
 * A chave de idempotência do envio: o aviso e o texto. A mesma tentativa repetida (o processo
 * caiu depois de enviar e antes de registrar) não sai duas vezes no fornecedor; um texto que
 * mudou com o tempo (o prazo de desistência passou) sai com outra chave.
 */
const mailKey = (id: number, m: Mail) =>
  `alicerce/aviso/${id}/${createHash("sha256").update(m.subject).update("\n").update(m.text).digest("hex").slice(0, 32)}`;

/** Envia os avisos pendentes. Sem fornecedor de e-mail, eles esperam na fila. */
export async function drainOutbox(
  db: DatabaseSync,
  mailer: Mailer | null,
  ctx: RenderContext,
  now = Date.now(),
  limit = 50,
): Promise<DrainReport> {
  const report: DrainReport = { enviados: 0, falhas: 0, esgotados: 0, erros: {} };
  if (!mailer) return report;
  const rows = db
    .prepare(
      "SELECT id, kind, to_address, data, attempts FROM email_outbox WHERE sent_at IS NULL AND attempts < ? AND next_attempt_at <= ? ORDER BY id LIMIT ?",
    )
    .all(MAX_ATTEMPTS, now, limit) as Array<{ id: number; kind: EmailKind; to_address: string; data: string; attempts: number }>;
  for (const r of rows) {
    const claimed = db
      .prepare("UPDATE email_outbox SET next_attempt_at = ? WHERE id = ? AND sent_at IS NULL AND next_attempt_at <= ?")
      .run(now + LEASE_MS, r.id, now);
    if (claimed.changes !== 1) continue;
    try {
      const mail = renderEmail(r.kind, r.to_address, JSON.parse(r.data) as EmailData, ctx, now);
      await mailer.send({ ...mail, key: mailKey(r.id, mail) });
      db.prepare("UPDATE email_outbox SET sent_at = ?, attempts = attempts + 1, last_error = NULL WHERE id = ?").run(Date.now(), r.id);
      report.enviados++;
    } catch (e) {
      // Só o código: a mensagem de um erro qualquer poderia trazer o destinatário ou o texto.
      const code = e instanceof MailError ? e.code : `erro inesperado no envio (${(e as Error)?.name ?? "?"})`;
      const attempts = r.attempts + 1;
      db.prepare("UPDATE email_outbox SET attempts = ?, next_attempt_at = ?, last_error = ? WHERE id = ?").run(
        attempts,
        now + (BACKOFF_MS[attempts - 1] ?? 0),
        code.slice(0, 300),
        r.id,
      );
      report.falhas++;
      report.erros[code] = (report.erros[code] ?? 0) + 1;
      if (attempts >= MAX_ATTEMPTS) report.esgotados++;
    }
  }
  return report;
}
