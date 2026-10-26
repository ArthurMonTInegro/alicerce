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
 * Eventos repetidos, atrasados ou fora de ordem: cada cobrança guarda a leitura mais nova que se
 * conhece dela no provedor, como uma janela (`observed_at` a `observed_until`): a leitura aconteceu
 * em algum ponto entre o pedido e a resposta, e o provedor não diz qual. Uma leitura nova vale
 * mesmo quando só confirma a situação gravada, para que uma leitura mais antiga que chegue depois
 * não a desfaça. Comparando com a gravada:
 * - terminou antes de a gravada começar: é mais antiga, nada muda ("antiga");
 * - começou depois de a gravada terminar: é mais nova. Situação igual: só a janela é atualizada,
 *   sem e-mail, sem contar transição e sem recalcular o acesso ("confirmada"); situação diferente:
 *   muda, se a transição da lista `NEXT` vale ("mudou"; uma cobrança paga não volta a pendente);
 * - as janelas se cruzam (inclusive no mesmo instante): não há como saber qual é a mais nova. Com a
 *   mesma situação, as duas valem; com situações diferentes, nada muda ("ambigua"), e quem
 *   recebeu a leitura pede uma leitura nova ao provedor (app.ts) em vez de escolher uma ordem
 *   que o provedor não dá.
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
  /** fim da janela da leitura mais nova; null: a leitura foi o instante observed_at */
  observed_until: number | null;
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
  /** quando a leitura da situação no provedor começou (o pedido saiu) */
  observedAt: number;
  /** quando ela terminou (a resposta chegou); sem isso, a leitura foi o instante observedAt */
  observedUntil?: number;
}

/**
 * O que recordCharge fez: "mudou" (situação ou período, uma mudança comercial); "confirmada" (a
 * mesma situação numa leitura mais nova: só a janela da leitura e a situação escrita pelo
 * provedor foram gravadas); "igual" (nada a gravar); "antiga" (leitura mais antiga que a
 * gravada); "ambigua" (leituras que se cruzam com situações diferentes); "proibida" (a transição
 * não vale, ex.: estornada para paga, ou a cobrança é de outra assinatura).
 */
export type RecordResult = "mudou" | "confirmada" | "igual" | "antiga" | "ambigua" | "proibida";

let lastRead = 0;
/**
 * Relógio das leituras do provedor: a hora do servidor, mas sem repetir nem voltar dentro do
 * processo. Duas leituras feitas uma depois da outra aqui ficam sempre em ordem, mesmo no mesmo
 * milissegundo; só as que de fato acontecem ao mesmo tempo (as janelas se cruzam) ficam ambíguas.
 */
export function readClock(): number {
  lastRead = Math.max(Date.now(), lastRead + 1);
  return lastRead;
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
 * Grava uma leitura da situação de uma cobrança, pela regra do comentário do topo (RecordResult).
 * Só "mudou" pede recalcular a assinatura e o acesso. Chamar dentro da transação do evento.
 */
export function recordCharge(db: DatabaseSync, provider: string, subscriptionId: string, u: ChargeUpdate, now: number): RecordResult {
  const from = u.observedAt;
  const until = Math.max(u.observedUntil ?? from, from);
  const cur = getCharge(db, provider, u.chargeId);
  if (!cur) {
    db.prepare(
      "INSERT INTO subscription_charges (provider, charge_id, subscription_id, status, provider_status, covers_from, covers_until, paid_at, refunded_at, observed_at, observed_until, transitions, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)",
    ).run(
      provider,
      u.chargeId,
      subscriptionId,
      u.status,
      u.providerStatus ?? null,
      u.coversFrom ?? null,
      u.coversUntil ?? null,
      u.paidAt ?? (WAS_PAID.has(u.status) ? from : null),
      u.refundedAt ?? (u.status === "estornada" ? from : null),
      from,
      until,
      now,
    );
    return "mudou";
  }
  if (cur.subscription_id !== subscriptionId) return "proibida"; // a cobrança é de outra assinatura
  const curFrom = cur.observed_at;
  // O código anterior à migração 11 muda observed_at sem conhecer observed_until: depois de voltar
  // de versão e avançar de novo, o fim guardado pode ter ficado antes do começo. A janela nunca
  // termina antes de começar.
  const curUntil = Math.max(cur.observed_until ?? curFrom, curFrom);
  if (until < curFrom) return "antiga";
  const newer = from > curUntil;
  const coversUntil = u.coversUntil ?? cur.covers_until;
  const coversFrom = u.coversFrom === undefined ? cur.covers_from : u.coversFrom;
  const sameState = cur.status === u.status && cur.covers_until === coversUntil && cur.covers_from === coversFrom;
  if (!sameState) {
    if (!newer) return "ambigua";
    if (!canMove(cur.status, u.status)) return "proibida";
    db.prepare(
      "UPDATE subscription_charges SET status = ?, provider_status = ?, covers_from = ?, covers_until = ?, paid_at = COALESCE(paid_at, ?), refunded_at = COALESCE(refunded_at, ?), observed_at = ?, observed_until = ?, transitions = transitions + ?, updated_at = ? WHERE provider = ? AND charge_id = ?",
    ).run(
      u.status,
      u.providerStatus === undefined ? cur.provider_status : u.providerStatus,
      coversFrom,
      coversUntil,
      u.paidAt ?? (WAS_PAID.has(u.status) ? from : null),
      u.refundedAt ?? (u.status === "estornada" ? from : null),
      from,
      until,
      cur.status === u.status ? 0 : 1,
      now,
      provider,
      u.chargeId,
    );
    return "mudou";
  }
  // A mesma situação: só os dados da leitura. A janela guardada passa a terminar no fim mais
  // tardio e a começar no começo mais tardio (ela ainda contém a leitura que começou por último);
  // a situação escrita pelo provedor (CONFIRMED, RECEIVED...) só muda numa leitura mais nova.
  const obsFrom = Math.max(curFrom, from);
  const obsUntil = Math.max(curUntil, until);
  const providerStatus = newer && u.providerStatus !== undefined ? u.providerStatus : cur.provider_status;
  if (obsFrom === curFrom && obsUntil === curUntil && providerStatus === cur.provider_status) return "igual";
  db.prepare("UPDATE subscription_charges SET provider_status = ?, observed_at = ?, observed_until = ?, updated_at = ? WHERE provider = ? AND charge_id = ?").run(
    providerStatus,
    obsFrom,
    obsUntil,
    now,
    provider,
    u.chargeId,
  );
  return "confirmada";
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
