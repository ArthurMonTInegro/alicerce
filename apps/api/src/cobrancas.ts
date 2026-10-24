/**
 * Cobranças de uma assinatura e o período que cada uma cobre (docs/PAGAMENTO.md, "Cobranças
 * e acesso"). Uma assinatura tem uma cobrança por ciclo; cada cobrança paga cobre o próprio
 * período, de `covers_from` (null: desde sempre) até `covers_until`. O acesso que a assinatura
 * dá vem só das cobranças que valem agora; um evento de uma cobrança muda só aquela cobrança.
 *
 * Antes desta tabela (migração 9), a assinatura tinha um período só, e o reembolso de qualquer
 * cobrança encerrava a assinatura inteira: o estorno de uma cobrança antiga apagava o período
 * que a cobrança atual, paga, ainda cobria.
 *
 * Situações de uma cobrança e o que valem:
 * - paga: dá acesso no período dela;
 * - estorno_parcial: parte do valor devolvida; continua dando acesso (proposta à espera da
 *   decisão do Arthur: a política comercial do estorno parcial não foi definida);
 * - estorno_pedido: estorno pedido ou em processamento; o acesso dela acaba já no pedido, como
 *   na desistência. Volta a "paga" se o provedor disser que o estorno não aconteceu;
 * - contestada: contestação no cartão (chargeback) recebida ou em disputa; sem acesso enquanto
 *   durar (proposta à espera da decisão do Arthur). Volta a "paga" se a disputa for ganha;
 * - estornada: devolvida por inteiro (inclusive a contestação perdida). Final: nada a desfaz;
 * - pendente, vencida, recusada, removida: nada pago, nenhum acesso.
 *
 * Eventos repetidos, atrasados ou fora de ordem: cada mudança guarda quando a situação foi lida
 * no provedor (`observed_at`); uma leitura mais antiga que a já aplicada não muda nada, e só as
 * transições da lista `NEXT` valem (uma cobrança paga não volta a pendente).
 */
import type { DatabaseSync } from "node:sqlite";

export type ChargeStatus =
  | "pendente"
  | "paga"
  | "vencida"
  | "recusada"
  | "estorno_pedido"
  | "estorno_parcial"
  | "estornada"
  | "contestada"
  | "removida";

export const CHARGE_STATUSES: readonly ChargeStatus[] = [
  "pendente",
  "paga",
  "vencida",
  "recusada",
  "estorno_pedido",
  "estorno_parcial",
  "estornada",
  "contestada",
  "removida",
];

/** Situações em que a cobrança dá acesso no período dela. */
export const GIVES_ACCESS: ReadonlySet<ChargeStatus> = new Set(["paga", "estorno_parcial"]);
/** Situações de uma cobrança que chegou a ser paga (o dinheiro entrou, mesmo que tenha voltado). */
export const WAS_PAID: ReadonlySet<ChargeStatus> = new Set(["paga", "estorno_parcial", "estorno_pedido", "contestada", "estornada"]);

/** Para onde cada situação pode ir. A estornada não vai a lugar nenhum. */
const NEXT: Record<ChargeStatus, ReadonlySet<ChargeStatus>> = {
  pendente: new Set(CHARGE_STATUSES),
  vencida: new Set(CHARGE_STATUSES),
  recusada: new Set(CHARGE_STATUSES),
  removida: new Set(CHARGE_STATUSES),
  paga: new Set(["estorno_pedido", "estorno_parcial", "estornada", "contestada"]),
  estorno_parcial: new Set(["paga", "estorno_pedido", "estornada", "contestada"]),
  estorno_pedido: new Set(["paga", "estorno_parcial", "estornada"]),
  contestada: new Set(["paga", "estornada"]),
  estornada: new Set(),
};
export const canMove = (from: ChargeStatus, to: ChargeStatus) => from === to || NEXT[from].has(to);

export interface ChargeRow {
  provider: string;
  charge_id: string;
  subscription_id: string;
  status: ChargeStatus;
  provider_status: string | null;
  covers_from: number | null;
  covers_until: number | null;
  paid_at: number | null;
  refunded_at: number | null;
  observed_at: number;
  transitions: number;
  updated_at: number;
}

/** O que um evento ou a conciliação sabe de uma cobrança. */
export interface ChargeUpdate {
  chargeId: string;
  status: ChargeStatus;
  /** situação exatamente como o provedor a escreve (o Asaas pede para guardar sem traduzir) */
  providerStatus?: string | null;
  coversFrom?: number | null;
  coversUntil?: number | null;
  paidAt?: number | null;
  refundedAt?: number | null;
  /** quando a situação foi lida no provedor */
  observedAt: number;
}

export function chargesOf(db: DatabaseSync, subscriptionId: string): ChargeRow[] {
  return db
    .prepare("SELECT * FROM subscription_charges WHERE subscription_id = ? ORDER BY covers_until, charge_id")
    .all(subscriptionId) as unknown as ChargeRow[];
}

export function getCharge(db: DatabaseSync, provider: string, chargeId: string): ChargeRow | undefined {
  return db.prepare("SELECT * FROM subscription_charges WHERE provider = ? AND charge_id = ?").get(provider, chargeId) as
    | ChargeRow
    | undefined;
}

/**
 * Grava a situação de uma cobrança. "mudou": gravou; "igual": já estava assim; "antiga": a
 * leitura é mais antiga que a já aplicada; "proibida": a transição não vale (ex.: estornada
 * para paga). Nos dois últimos, nada muda. Chamar dentro da transação do evento.
 */
export function recordCharge(
  db: DatabaseSync,
  provider: string,
  subscriptionId: string,
  u: ChargeUpdate,
  now: number,
): "mudou" | "igual" | "antiga" | "proibida" {
  const cur = getCharge(db, provider, u.chargeId);
  if (!cur) {
    db.prepare(
      "INSERT INTO subscription_charges (provider, charge_id, subscription_id, status, provider_status, covers_from, covers_until, paid_at, refunded_at, observed_at, transitions, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)",
    ).run(
      provider,
      u.chargeId,
      subscriptionId,
      u.status,
      u.providerStatus ?? null,
      u.coversFrom ?? null,
      u.coversUntil ?? null,
      u.paidAt ?? (WAS_PAID.has(u.status) ? u.observedAt : null),
      u.refundedAt ?? (u.status === "estornada" ? u.observedAt : null),
      u.observedAt,
      now,
    );
    return "mudou";
  }
  if (cur.subscription_id !== subscriptionId) return "proibida"; // a cobrança é de outra assinatura
  if (u.observedAt < cur.observed_at) return "antiga";
  if (!canMove(cur.status, u.status)) return "proibida";
  const coversUntil = u.coversUntil ?? cur.covers_until;
  const coversFrom = u.coversFrom === undefined ? cur.covers_from : u.coversFrom;
  const same =
    cur.status === u.status &&
    cur.covers_until === coversUntil &&
    cur.covers_from === coversFrom &&
    (u.providerStatus === undefined || u.providerStatus === cur.provider_status);
  if (same) return "igual";
  db.prepare(
    "UPDATE subscription_charges SET status = ?, provider_status = ?, covers_from = ?, covers_until = ?, paid_at = COALESCE(paid_at, ?), refunded_at = COALESCE(refunded_at, ?), observed_at = ?, transitions = transitions + ?, updated_at = ? WHERE provider = ? AND charge_id = ?",
  ).run(
    u.status,
    u.providerStatus === undefined ? cur.provider_status : u.providerStatus,
    coversFrom,
    coversUntil,
    u.paidAt ?? (WAS_PAID.has(u.status) ? u.observedAt : null),
    u.refundedAt ?? (u.status === "estornada" ? u.observedAt : null),
    u.observedAt,
    cur.status === u.status ? 0 : 1,
    now,
    provider,
    u.chargeId,
  );
  return "mudou";
}

/**
 * O acesso que as cobranças dão agora: vale se alguma cobrança que dá acesso cobre este
 * instante, e vai até o fim da sequência de cobranças encostadas a partir dele (uma renovação
 * paga adiantada estende; um buraco, como uma cobrança estornada no meio, interrompe).
 */
export function coverage(charges: Pick<ChargeRow, "status" | "covers_from" | "covers_until">[], now: number) {
  const ok = charges
    .filter((c) => GIVES_ACCESS.has(c.status) && c.covers_until !== null)
    .map((c) => ({ from: c.covers_from ?? -Infinity, until: c.covers_until! }))
    .sort((a, b) => a.from - b.from);
  let until: number | null = null;
  for (const c of ok) {
    if (until === null) {
      if (c.from <= now && c.until > now) until = c.until;
    } else if (c.from <= until) until = Math.max(until, c.until);
  }
  return until === null ? { valid: false as const, until: null } : { valid: true as const, until };
}

/** O maior fim entre as cobranças que dão acesso (o "pago até" mostrado), ou null. */
export function latestCoverage(charges: Pick<ChargeRow, "status" | "covers_until">[]): number | null {
  const ends = charges.filter((c) => GIVES_ACCESS.has(c.status) && c.covers_until !== null).map((c) => c.covers_until!);
  return ends.length ? Math.max(...ends) : null;
}

/**
 * A situação da assinatura que as cobranças dela pedem, depois de um evento (a mesma regra no
 * banco e no provedor de teste):
 * - alguma cobrança dá acesso (mesmo vencida): "ativa" se renova, "cancelada" se não;
 * - nenhuma dá acesso, mas alguma foi paga (estornada, contestada ou com estorno pedido):
 *   "reembolsada" se não renova mais; se ainda renova, continua "ativa";
 * - nada foi pago: continua como estava, e a primeira recusa transforma "pendente" em "recusada".
 * O "pago até" mostrado é o maior fim entre as que dão acesso; sem nenhuma, ele encolhe até o
 * instante do evento que tirou o acesso (nunca cresce por isso).
 */
export function deriveSubscription(
  prev: { status: string; canceledAt: number | null; paidUntil: number | null; firstPaidAt: number | null },
  charges: Pick<ChargeRow, "status" | "covers_until" | "paid_at">[],
  ev: { type: string; at: number },
) {
  const hasAccess = charges.some((c) => GIVES_ACCESS.has(c.status));
  const everPaid = charges.some((c) => WAS_PAID.has(c.status));
  const ended = prev.canceledAt !== null;
  let status = prev.status;
  if (hasAccess) status = ended ? "cancelada" : "ativa";
  else if (everPaid) status = ended ? "reembolsada" : prev.status === "pendente" || prev.status === "recusada" ? "ativa" : prev.status;
  else if (ev.type === "pagamento_recusado" && prev.status === "pendente") status = "recusada";
  const latest = latestCoverage(charges);
  const paidUntil = latest ?? (everPaid ? Math.min(prev.paidUntil ?? ev.at, ev.at) : prev.paidUntil);
  const paidAts = charges.filter((c) => WAS_PAID.has(c.status) && c.paid_at !== null).map((c) => c.paid_at!);
  // o primeiro pagamento é o mais antigo, mesmo que o aviso dele chegue depois do da renovação
  const all = prev.firstPaidAt === null ? paidAts : [prev.firstPaidAt, ...paidAts];
  const firstPaidAt = all.length ? Math.min(...all) : null;
  return { status, paidUntil, firstPaidAt };
}

/** A situação da cobrança que um evento do Alicerce descreve. */
export function chargeStatusOf(type: string, providerStatus?: string | null): ChargeStatus | null {
  switch (type) {
    case "pagamento_aprovado":
      return "paga";
    case "pagamento_recusado":
      return providerStatus === "OVERDUE" ? "vencida" : "recusada";
    case "reembolso":
      return "estornada";
    case "reembolso_pedido":
      return "estorno_pedido";
    case "reembolso_parcial":
      return "estorno_parcial";
    case "contestacao":
      return "contestada";
    default:
      return null;
  }
}

/** O evento do Alicerce que leva uma cobrança a uma situação (conciliação). */
export function eventTypeFor(status: ChargeStatus) {
  switch (status) {
    case "paga":
      return "pagamento_aprovado" as const;
    case "vencida":
    case "recusada":
      return "pagamento_recusado" as const;
    case "estornada":
      return "reembolso" as const;
    case "estorno_pedido":
      return "reembolso_pedido" as const;
    case "estorno_parcial":
      return "reembolso_parcial" as const;
    case "contestada":
      return "contestacao" as const;
    default:
      return null; // pendente, removida: nada a registrar
  }
}
