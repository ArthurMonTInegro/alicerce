/**
 * Assinatura do Premium com um provedor de pagamento qualquer.
 *
 * O Alicerce nunca vê dados de cartão ou de Pix: a cobrança acontece na página do
 * provedor, e o servidor só fica sabendo do resultado pelo webhook, assinado com
 * HMAC. Cada evento muda só a assinatura a que se refere; o plano da conta é recalculado
 * depois, na mesma transação, juntando todos os direitos dela (plans.ts, recomputeAccess).
 *
 * Por enquanto só existe o provedor de teste (TestPaymentProvider): a "página de
 * pagamento" é /conta/pagamento-teste, e os webhooks são assinados e entregues a
 * este mesmo servidor, pelo mesmo código que vai receber os de um provedor real.
 * Nada é cobrado. Ele é recusado com NODE_ENV=production (app.ts).
 *
 * Regras (docs/PAGAMENTO.md):
 * - pagamento aprovado: Premium até o fim do período pago (um mês ou um ano de calendário);
 * - pagamento recusado: a primeira cobrança não ativa nada; numa renovação, o acesso vai até o fim do período já pago;
 * - cancelar: para de renovar, e o acesso vai até o fim do período pago;
 * - desistir em até 7 dias do primeiro pagamento (CDC, art. 49): estorno integral e fim do acesso na hora;
 * - reembolso (pedido aqui ou feito no provedor): aquela assinatura deixa de dar acesso, e só ela.
 */
import {
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { PLANS } from "@alicerce/engine";
import { enqueueEmail } from "./avisos.ts";
import { recomputeAccess } from "./plans.ts";

export type Period = "mensal" | "anual";
export const PERIODS: readonly Period[] = ["mensal", "anual"];
export type SubscriptionStatus =
  | "pendente"
  | "ativa"
  | "cancelada"
  | "recusada"
  | "reembolsada";
export type PaymentEventType =
  | "pagamento_aprovado"
  | "pagamento_recusado"
  | "assinatura_cancelada"
  | "reembolso";

export interface PaymentEvent {
  /** id do evento no provedor: o mesmo evento entregue duas vezes só vale uma */
  id: string;
  type: PaymentEventType;
  subscriptionId: string;
  /** só em pagamento_aprovado: até quando o pagamento cobre */
  paidUntil?: number;
  at: number;
}

/** A situação de uma assinatura segundo o provedor (para a conciliação: conciliacao.ts). */
export interface ProviderSubscriptionState {
  status: SubscriptionStatus;
  paidUntil: number | null;
  firstPaidAt: number | null;
  canceledAt: number | null;
  refundedAt: number | null;
}

/**
 * O provedor não respondeu (fora do ar, tempo esgotado, erro 5xx). Quem chamou pode tentar
 * de novo: no webhook vira 503, para o provedor reenviar; nas rotas, 502.
 */
export class ProviderUnavailable extends Error {}

/**
 * O que um adaptador de provedor de pagamento precisa cumprir (docs/PAGAMENTO.md,
 * "Contrato do adaptador"; testes em test/contrato-provedor.ts):
 * - nada de dados de cartão ou de Pix aqui: a cobrança acontece na página do provedor;
 * - cada mudança chega por webhook autenticado, traduzida para um dos quatro eventos, com o id
 *   do evento no provedor (o mesmo evento entregue de novo traz o mesmo id). Um webhook
 *   adulterado é recusado ou não muda nada: se o provedor não assina o corpo, o adaptador
 *   confere a situação na API dele antes de traduzir;
 * - cancel e refund podem ser chamados de novo para a mesma assinatura sem efeito duplicado
 *   (chave de idempotência no provedor): nunca dois estornos;
 * - fetchState diz a situação atual no provedor, para recuperar um webhook perdido;
 *   null quando o provedor não conhece a assinatura.
 */
export interface PaymentProvider {
  readonly name: string;
  /**
   * Cria a cobrança no provedor e devolve o endereço da página de pagamento dele, e o id
   * dela no provedor (`ref`), quando ele precisa ser guardado (subscriptions.provider_ref).
   */
  checkout(sub: {
    id: string;
    email: string;
    period: Period;
    price: number;
  }): Promise<{ url: string; ref?: string }>;
  /**
   * Fecha no provedor a página de pagamento de uma tentativa substituída por outra, para as
   * duas não serem pagas. Opcional: o provedor de teste não tem página para fechar.
   */
  abandon?(subscriptionId: string): Promise<void>;
  /** Para de renovar no provedor; o acesso vale até o fim do período pago. */
  cancel(subscriptionId: string): Promise<void>;
  /** Pede o estorno integral (desistência em 7 dias). */
  refund(subscriptionId: string): Promise<void>;
  /** A situação da assinatura no provedor; null se ele não a conhece. */
  fetchState(subscriptionId: string): Promise<ProviderSubscriptionState | null>;
  /**
   * Confere o webhook e devolve o evento, ou null para o que não interessa ao Alicerce;
   * lança erro se não conferir (ProviderUnavailable se não deu para conferir agora).
   */
  parseWebhook(
    rawBody: string,
    headers: Record<string, string | string[] | undefined>,
    now: number,
  ): PaymentEvent | null | Promise<PaymentEvent | null>;
}

/** Dias para desistir depois do primeiro pagamento, com estorno integral (CDC, art. 49). */
export const WITHDRAWAL_DAYS = 7;
export const WEBHOOK_ROUTE = "/api/pagamento/webhook";
const SIGNATURE_HEADER = "x-alicerce-assinatura";
/** Tolerância do carimbo de tempo do webhook (contra reenvio de um webhook antigo capturado). */
const WEBHOOK_TOLERANCE_MS = 5 * 60_000;

export const periodPrice = (period: Period) =>
  period === "anual"
    ? PLANS.premium.price!.yearly
    : PLANS.premium.price!.monthly;

/** Fim do período pago a partir de `from`: um mês ou um ano de calendário (UTC). */
export function addPeriod(from: number, period: Period): number {
  const d = new Date(from);
  if (period === "anual") d.setUTCFullYear(d.getUTCFullYear() + 1);
  else {
    const day = d.getUTCDate();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + 1);
    // 31/01 + 1 mês = 28 ou 29/02, e não 03/03
    d.setUTCDate(
      Math.min(
        day,
        new Date(
          Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
        ).getUTCDate(),
      ),
    );
  }
  return d.getTime();
}

const header = (
  h: Record<string, string | string[] | undefined>,
  k: string,
) => {
  const v = h[k];
  return Array.isArray(v) ? v[0] : v;
};

/** Assinatura no estilo dos provedores: t=<carimbo>,v1=<HMAC-SHA256 de "<carimbo>.<corpo>">. */
export function signWebhook(
  secret: string,
  rawBody: string,
  now: number,
): string {
  const t = String(now);
  return `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex")}`;
}

export function verifyWebhook(
  secret: string,
  rawBody: string,
  signature: string | undefined,
  now: number,
): boolean {
  const parts = Object.fromEntries(
    (signature ?? "")
      .split(",")
      .map((p) => p.split("=", 2) as [string, string]),
  );
  const t = Number(parts.t);
  if (
    !Number.isFinite(t) ||
    Math.abs(now - t) > WEBHOOK_TOLERANCE_MS ||
    typeof parts.v1 !== "string"
  )
    return false;
  const expected = Buffer.from(
    createHmac("sha256", secret).update(`${parts.t}.${rawBody}`).digest("hex"),
  );
  const got = Buffer.from(parts.v1);
  return got.length === expected.length && timingSafeEqual(got, expected);
}

const EVENT_TYPES: readonly PaymentEventType[] = [
  "pagamento_aprovado",
  "pagamento_recusado",
  "assinatura_cancelada",
  "reembolso",
];
function parseEvent(rawBody: string): PaymentEvent {
  const b = JSON.parse(rawBody) as Record<string, unknown>;
  const ok =
    typeof b.id === "string" &&
    b.id.length <= 100 &&
    EVENT_TYPES.includes(b.type as PaymentEventType) &&
    typeof b.subscriptionId === "string" &&
    b.subscriptionId.length <= 100 &&
    typeof b.at === "number" &&
    Number.isFinite(b.at) &&
    (b.type !== "pagamento_aprovado" ||
      (typeof b.paidUntil === "number" && Number.isFinite(b.paidUntil)));
  if (!ok) throw new Error("evento malformado");
  return {
    id: b.id as string,
    type: b.type as PaymentEventType,
    subscriptionId: b.subscriptionId as string,
    at: b.at as number,
    ...(typeof b.paidUntil === "number" ? { paidUntil: b.paidUntil } : {}),
  };
}

export type TestResult = "aprovar" | "recusar" | "renovar" | "falhar-renovacao";
export const TEST_RESULTS: readonly TestResult[] = [
  "aprovar",
  "recusar",
  "renovar",
  "falhar-renovacao",
];

/**
 * Provedor simulado: faz o papel do provedor e manda os webhooks assinados para
 * `deliver`, que app.ts liga à mesma rotina do webhook de verdade. Guarda na memória
 * a situação de cada assinatura, como o provedor guardaria (fetchState), e deixa os
 * testes perderem webhooks e fazerem chamadas falharem.
 */
export class TestPaymentProvider implements PaymentProvider {
  readonly name = "teste";
  private readonly secret: string;
  private readonly state = new Map<string, ProviderSubscriptionState>();
  /** estornos feitos de verdade por assinatura (um segundo pedido não estorna de novo) */
  readonly refunds = new Map<string, number>();
  private lostDeliveries = 0;
  private failing = new Set<"cancel" | "refund" | "fetchState">();
  private readonly deliver: (
    rawBody: string,
    headers: Record<string, string>,
  ) => Promise<void>;
  constructor(
    secret: string | null,
    deliver: (
      rawBody: string,
      headers: Record<string, string>,
    ) => Promise<void>,
  ) {
    this.secret = secret ?? randomBytes(32).toString("hex");
    this.deliver = deliver;
  }
  /** Os próximos `n` webhooks mudam a situação no provedor, mas não chegam ao Alicerce. */
  loseNextDeliveries(n: number) {
    this.lostDeliveries = n;
  }
  /** Faz uma operação falhar (como o provedor fora do ar) até `restore`. */
  fail(op: "cancel" | "refund" | "fetchState") {
    this.failing.add(op);
  }
  restore() {
    this.failing.clear();
  }
  private check(op: "cancel" | "refund" | "fetchState") {
    if (this.failing.has(op)) throw new Error(`provedor de teste: ${op} indisponível`);
  }
  async checkout(sub: { id: string }) {
    this.track(sub.id);
    return { url: `/conta/pagamento-teste#a=${encodeURIComponent(sub.id)}` };
  }
  async cancel(subscriptionId: string) {
    this.check("cancel");
    await this.emit({ type: "assinatura_cancelada", subscriptionId });
  }
  async refund(subscriptionId: string) {
    this.check("refund");
    // Idempotente: um segundo pedido para a mesma assinatura repete o aviso, sem estornar de novo.
    if (this.state.get(subscriptionId)?.status !== "reembolsada")
      this.refunds.set(subscriptionId, (this.refunds.get(subscriptionId) ?? 0) + 1);
    await this.emit({ type: "reembolso", subscriptionId });
  }
  async fetchState(subscriptionId: string) {
    this.check("fetchState");
    const st = this.state.get(subscriptionId);
    return st ? { ...st } : null;
  }
  /** O que a "página de pagamento" de teste faz: aprova, recusa, renova ou falha a renovação. */
  async simulate(
    sub: { id: string; period: Period; paidUntil: number | null },
    result: TestResult,
    now = Date.now(),
  ) {
    if (result === "aprovar" || result === "renovar") {
      const from =
        result === "renovar" && sub.paidUntil && sub.paidUntil > now
          ? sub.paidUntil
          : now;
      await this.emit(
        {
          type: "pagamento_aprovado",
          subscriptionId: sub.id,
          paidUntil: addPeriod(from, sub.period),
        },
        now,
      );
    } else
      await this.emit(
        { type: "pagamento_recusado", subscriptionId: sub.id },
        now,
      );
  }
  parseWebhook(
    rawBody: string,
    headers: Record<string, string | string[] | undefined>,
    now: number,
  ): PaymentEvent {
    if (
      !verifyWebhook(
        this.secret,
        rawBody,
        header(headers, SIGNATURE_HEADER),
        now,
      )
    )
      throw new Error("assinatura do webhook não confere");
    return parseEvent(rawBody);
  }
  private track(id: string): ProviderSubscriptionState {
    let st = this.state.get(id);
    if (!st) {
      st = { status: "pendente", paidUntil: null, firstPaidAt: null, canceledAt: null, refundedAt: null };
      this.state.set(id, st);
    }
    return st;
  }
  /** A mesma regra de applyPaymentEvent, do lado do provedor. */
  private record(ev: Omit<PaymentEvent, "id" | "at">, now: number) {
    const st = this.track(ev.subscriptionId);
    if (st.status === "reembolsada") return;
    if (ev.type === "pagamento_aprovado") {
      st.paidUntil = Math.max(st.paidUntil ?? 0, ev.paidUntil!);
      st.firstPaidAt ??= now;
      st.status = st.canceledAt !== null ? "cancelada" : "ativa";
    } else if (ev.type === "pagamento_recusado") {
      if (st.status === "pendente") st.status = "recusada";
    } else if (ev.type === "assinatura_cancelada") {
      if (st.status === "ativa" || st.status === "pendente") {
        st.status = st.status === "pendente" ? "recusada" : "cancelada";
        st.canceledAt = now;
      }
    } else {
      st.status = "reembolsada";
      st.refundedAt = now;
      st.canceledAt ??= now;
      if (st.paidUntil !== null && st.paidUntil > now) st.paidUntil = now;
    }
  }
  private async emit(ev: Omit<PaymentEvent, "id" | "at">, now = Date.now()) {
    this.record(ev, now);
    if (this.lostDeliveries > 0) {
      this.lostDeliveries--;
      return;
    }
    const body = JSON.stringify({ id: `evt_${randomUUID()}`, at: now, ...ev });
    await this.deliver(body, {
      "content-type": "application/json",
      [SIGNATURE_HEADER]: signWebhook(this.secret, body, now),
    });
  }
}

interface SubscriptionRow {
  id: string;
  user_id: string;
  provider: string;
  period: Period;
  price: number;
  status: SubscriptionStatus;
  paid_until: number | null;
  first_paid_at: number | null;
  canceled_at: number | null;
  withdrawal_requested_at: number | null;
  provider_ref: string | null;
  provider_subscription: string | null;
}

/** Guarda o id da cobrança no provedor (o Checkout, no Asaas), devolvido por checkout(). */
export function recordProviderRef(db: DatabaseSync, id: string, ref: string) {
  db.prepare("UPDATE subscriptions SET provider_ref = ? WHERE id = ?").run(ref, id);
}

export function getSubscription(
  db: DatabaseSync,
  id: string,
): SubscriptionRow | undefined {
  return db.prepare("SELECT * FROM subscriptions WHERE id = ?").get(id) as
    | SubscriptionRow
    | undefined;
}

/**
 * A assinatura que a conta vê: uma paga que ainda vale, se houver (a mais recente); senão,
 * a mais recente que não é só uma tentativa recusada ou abandonada.
 */
export function currentSubscription(
  db: DatabaseSync,
  userId: string,
  now = Date.now(),
): SubscriptionRow | undefined {
  return db
    .prepare(
      "SELECT * FROM subscriptions WHERE user_id = ? AND status IN ('ativa', 'cancelada', 'reembolsada') ORDER BY (status IN ('ativa', 'cancelada') AND paid_until > ?) DESC, created_at DESC, rowid DESC LIMIT 1",
    )
    .get(userId, now) as SubscriptionRow | undefined;
}

/** Assinaturas da conta que o provedor ainda tenta renovar (inclusive uma vencida com a renovação falhando). */
/** Tentativas que abriram uma página no provedor e ainda não tiveram resposta. */
export function openAttempts(
  db: DatabaseSync,
  userId: string,
): SubscriptionRow[] {
  return db
    .prepare(
      "SELECT * FROM subscriptions WHERE user_id = ? AND status = 'pendente' AND provider_ref IS NOT NULL ORDER BY created_at, rowid",
    )
    .all(userId) as unknown as SubscriptionRow[];
}

export function renewingSubscriptions(
  db: DatabaseSync,
  userId: string,
): SubscriptionRow[] {
  return db
    .prepare(
      "SELECT * FROM subscriptions WHERE user_id = ? AND status = 'ativa' ORDER BY created_at, rowid",
    )
    .all(userId) as unknown as SubscriptionRow[];
}

export function createSubscription(
  db: DatabaseSync,
  userId: string,
  provider: string,
  period: Period,
  now = Date.now(),
): SubscriptionRow {
  const id = `sub_${randomUUID()}`;
  // Uma tentativa nova substitui a que ficou pendente. A que já abriu uma página no provedor
  // (provider_ref) fica guardada como recusada: se ela foi paga e o webhook ainda não chegou,
  // ele ainda acha de quem é o pagamento.
  db.prepare(
    "UPDATE subscriptions SET status = 'recusada', updated_at = ? WHERE user_id = ? AND status = 'pendente' AND provider_ref IS NOT NULL",
  ).run(now, userId);
  db.prepare(
    "DELETE FROM subscriptions WHERE user_id = ? AND status = 'pendente'",
  ).run(userId);
  db.prepare(
    "INSERT INTO subscriptions (id, user_id, provider, period, price, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(
    id,
    userId,
    provider,
    period,
    periodPrice(period),
    "pendente",
    now,
    now,
  );
  return getSubscription(db, id)!;
}

/**
 * Ainda dá para desistir com estorno integral? Vale também depois dos 7 dias quando o
 * pedido foi feito dentro deles e o provedor não respondeu na hora (withdrawal_requested_at).
 */
export const canWithdraw = (
  s: Pick<SubscriptionRow, "status" | "first_paid_at"> & { withdrawal_requested_at?: number | null },
  now = Date.now(),
) =>
  (s.status === "ativa" || s.status === "cancelada") &&
  s.first_paid_at !== null &&
  Math.min(now, s.withdrawal_requested_at ?? now) - s.first_paid_at <= WITHDRAWAL_DAYS * 86_400_000;

/** Registra o pedido de desistência (o primeiro vale), antes de pedir o estorno ao provedor. */
export function recordWithdrawalRequest(db: DatabaseSync, id: string, now = Date.now()) {
  db.prepare(
    "UPDATE subscriptions SET withdrawal_requested_at = COALESCE(withdrawal_requested_at, ?), updated_at = ? WHERE id = ?",
  ).run(now, now, id);
}

export function subscriptionView(
  s: SubscriptionRow | undefined,
  now = Date.now(),
) {
  if (!s) return null;
  return {
    id: s.id,
    periodo: s.period,
    preco: s.price,
    situacao: s.status,
    pagoAte: s.paid_until,
    renova: s.status === "ativa",
    podeDesistir: canWithdraw(s, now),
    desistirAte:
      s.first_paid_at !== null
        ? s.first_paid_at + WITHDRAWAL_DAYS * 86_400_000
        : null,
  };
}

/**
 * Aplica um evento do provedor, uma vez só (payment_events). Muda a assinatura do evento
 * e recalcula o plano da conta, na mesma transação: ou fica tudo, ou nada (e então o
 * evento não fica registrado, e o provedor pode entregá-lo de novo).
 *
 * Eventos fora de ordem: o período pago só cresce (o maior paid_until vale); um reembolso
 * é final (o que chega depois dele é ignorado); um pagamento que chega depois do
 * cancelamento conta, mas a assinatura continua sem renovar.
 */
export function applyPaymentEvent(
  db: DatabaseSync,
  provider: string,
  ev: PaymentEvent,
  now = Date.now(),
): "aplicado" | "repetido" | "ignorado" {
  db.exec("BEGIN IMMEDIATE");
  try {
    if (db.prepare("SELECT 1 FROM payment_events WHERE id = ?").get(ev.id)) {
      db.exec("ROLLBACK");
      return "repetido";
    }
    db.prepare(
      "INSERT INTO payment_events (id, provider, type, subscription_id, received_at) VALUES (?, ?, ?, ?, ?)",
    ).run(ev.id, provider, ev.type, ev.subscriptionId, now);
    const s = db
      .prepare("SELECT * FROM subscriptions WHERE id = ? AND provider = ?")
      .get(ev.subscriptionId, provider) as SubscriptionRow | undefined;
    let result: "aplicado" | "ignorado" = "ignorado";
    if (s && s.status !== "reembolsada") {
      result = "aplicado";
      if (ev.type === "pagamento_aprovado") {
        const paidUntil = Math.max(s.paid_until ?? 0, ev.paidUntil!);
        const status: SubscriptionStatus =
          s.canceled_at !== null ? "cancelada" : "ativa";
        db.prepare(
          "UPDATE subscriptions SET status = ?, paid_until = ?, first_paid_at = COALESCE(first_paid_at, ?), updated_at = ? WHERE id = ?",
        ).run(status, paidUntil, ev.at, now, s.id);
      } else if (ev.type === "pagamento_recusado") {
        // Primeira cobrança recusada: nada é ativado. Numa renovação, o acesso vai até o fim do que já foi pago.
        db.prepare(
          "UPDATE subscriptions SET status = ?, updated_at = ? WHERE id = ?",
        ).run(s.status === "pendente" ? "recusada" : s.status, now, s.id);
      } else if (ev.type === "assinatura_cancelada") {
        if (s.status === "ativa" || s.status === "pendente")
          db.prepare(
            "UPDATE subscriptions SET status = ?, canceled_at = ?, updated_at = ? WHERE id = ?",
          ).run(
            s.status === "pendente" ? "recusada" : "cancelada",
            ev.at,
            now,
            s.id,
          );
      } else if (ev.type === "reembolso") {
        // O fim do período pago encolhe até o reembolso (um reembolso de algo já vencido não o estica).
        db.prepare(
          "UPDATE subscriptions SET status = 'reembolsada', paid_until = CASE WHEN paid_until > ? THEN ? ELSE paid_until END, canceled_at = COALESCE(canceled_at, ?), updated_at = ? WHERE id = ?",
        ).run(ev.at, ev.at, ev.at, now, s.id);
      }
      const access = recomputeAccess(
        db,
        s.user_id,
        `${ev.type === "reembolso" ? "reembolso" : "pagamento"}:${provider}`,
        now,
      );
      queueSubscriptionEmail(db, ev, s, getSubscription(db, s.id)!, access, now);
    }
    db.exec("COMMIT");
    return result;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

/** O e-mail que o evento pede, se pede algum (avisos.ts), na mesma transação. */
function queueSubscriptionEmail(
  db: DatabaseSync,
  ev: PaymentEvent,
  before: SubscriptionRow,
  after: SubscriptionRow,
  access: { plan: string; expiresAt: number | null },
  now: number,
) {
  const data = {
    provedor: after.provider,
    periodo: after.period,
    preco: after.price,
    pagoAte: after.paid_until,
    desistirAte:
      after.first_paid_at !== null
        ? after.first_paid_at + WITHDRAWAL_DAYS * 86_400_000
        : null,
  };
  if (ev.type === "pagamento_aprovado" && before.first_paid_at === null)
    enqueueEmail(db, after.user_id, "compra", `compra:${after.id}`, data, now);
  else if (
    ev.type === "pagamento_recusado" &&
    before.status === "ativa" &&
    before.first_paid_at !== null
  )
    enqueueEmail(
      db,
      after.user_id,
      "renovacao_recusada",
      `recusa:${after.id}:${before.paid_until}`,
      data,
      now,
    );
  else if (
    ev.type === "assinatura_cancelada" &&
    before.status === "ativa" &&
    after.status === "cancelada"
  )
    enqueueEmail(
      db,
      after.user_id,
      "cancelamento",
      `cancelamento:${after.id}`,
      data,
      now,
    );
  else if (ev.type === "reembolso" && before.first_paid_at !== null)
    enqueueEmail(
      db,
      after.user_id,
      "reembolso",
      `reembolso:${after.id}`,
      {
        ...data,
        premiumAte: access.plan === "premium" ? access.expiresAt : null,
        premiumSemFim: access.plan === "premium" && access.expiresAt === null,
      },
      now,
    );
}
