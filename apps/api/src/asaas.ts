/**
 * Adaptador do Asaas (provedor escolhido pelo Arthur em 23/10/2026), escrito a partir da
 * documentação oficial (https://docs.asaas.com) lida em 23/10/2026. Foi testado só contra
 * uma simulação local da API documentada (test/asaas-simulado.ts), nunca contra o Asaas:
 * o que precisa ser conferido no sandbox está em docs/PAGAMENTO.md, "Asaas".
 *
 * - checkout: cria um Checkout recorrente (POST /checkouts). A pessoa preenche os dados e
 *   paga na página do Asaas; nada de CPF, cartão ou Pix passa pelo Alicerce. O id do
 *   Checkout fica em subscriptions.provider_ref.
 * - webhooks: o Asaas não assina o corpo, só manda um token fixo (asaas-access-token). Por
 *   isso o corpo só diz QUAL cobrança ou assinatura mudou: a situação vem sempre da API, e a
 *   assinatura do Alicerce é achada pelo checkoutSession que a API devolve, nunca pelo corpo.
 *   Um corpo adulterado com o token certo não muda nada.
 * - abandon: fecha o Checkout de uma tentativa que a pessoa substituiu por outra.
 * - cancel: remove a assinatura no Asaas (DELETE), o que também apaga as cobranças pendentes.
 * - refund: remove a assinatura, para não haver cobrança nova, e estorna as cobranças pagas
 *   que ainda não foram estornadas. Pedir de novo não estorna de novo.
 * - fetchState: lê a assinatura e as cobranças dela (conciliação).
 */
import { timingSafeEqual } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import {
  addPeriod,
  ProviderUnavailable,
  type PaymentEvent,
  type PaymentProvider,
  type Period,
  type ProviderSubscriptionState,
} from "./assinatura.ts";

export type AsaasEnvironment = "sandbox" | "producao";
export type AsaasBillingType = "CREDIT_CARD" | "PIX";

export const ASAAS_API = {
  sandbox: "https://api-sandbox.asaas.com/v3",
  producao: "https://api.asaas.com/v3",
} as const;
/** Prefixo das chaves de API de cada ambiente, segundo a documentação. */
export const ASAAS_KEY_PREFIX = { sandbox: "$aact_hmlg_", producao: "$aact_prod_" } as const;

export interface AsaasConfig {
  apiKey: string;
  environment: AsaasEnvironment;
  /** o authToken cadastrado no webhook do Asaas (32 a 255 caracteres) */
  webhookToken: string;
  appUrl: string;
  billingTypes: readonly AsaasBillingType[];
}

/** Onde o adaptador guarda e acha os ids do Asaas de cada assinatura do Alicerce. */
export interface AsaasRefs {
  byCheckout(checkoutId: string): { id: string; period: Period } | null;
  byAsaasSubscription(asaasId: string): { id: string; period: Period } | null;
  get(id: string): { checkout: string | null; subscription: string | null; period: Period } | null;
  setSubscription(id: string, asaasId: string): void;
}

export function asaasRefs(db: DatabaseSync): AsaasRefs {
  const one = (sql: string, v: string) =>
    (db.prepare(sql).get(v) as { id: string; period: Period } | undefined) ?? null;
  return {
    byCheckout: (c) => one("SELECT id, period FROM subscriptions WHERE provider = 'asaas' AND provider_ref = ?", c),
    byAsaasSubscription: (a) =>
      one("SELECT id, period FROM subscriptions WHERE provider = 'asaas' AND provider_subscription = ?", a),
    get: (id) => {
      const r = db
        .prepare("SELECT provider_ref, provider_subscription, period FROM subscriptions WHERE id = ? AND provider = 'asaas'")
        .get(id) as { provider_ref: string | null; provider_subscription: string | null; period: Period } | undefined;
      return r ? { checkout: r.provider_ref, subscription: r.provider_subscription, period: r.period } : null;
    },
    setSubscription: (id, asaasId) => {
      db.prepare("UPDATE subscriptions SET provider_subscription = COALESCE(provider_subscription, ?) WHERE id = ?").run(asaasId, id);
    },
  };
}

/** O que o Alicerce lê de uma cobrança do Asaas (GET /payments/{id}). */
interface AsaasPayment {
  id: string;
  status: string;
  subscription?: string | null;
  checkoutSession?: string | null;
  dueDate: string;
  paymentDate?: string | null;
  clientPaymentDate?: string | null;
  deleted?: boolean;
  refunds?: Array<{ dateCreated?: string; status?: string }> | null;
}
interface AsaasSubscription {
  id: string;
  status: "ACTIVE" | "EXPIRED" | "INACTIVE";
  deleted?: boolean;
  checkoutSession?: string | null;
}

const PAID = new Set(["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"]);
/**
 * A cobrança deixa de valer: estorno integral (feito, pedido ou em processamento) ou
 * contestação no cartão (proposta de PAGAMENTO.md). O acesso acaba já no pedido, como na
 * desistência; se o Asaas desfizer o estorno, a conciliação aponta a divergência.
 */
const REFUNDED = new Set([
  "REFUNDED",
  "REFUND_REQUESTED",
  "REFUND_IN_PROGRESS",
  "CHARGEBACK_REQUESTED",
  "CHARGEBACK_DISPUTE",
  "AWAITING_CHARGEBACK_REVERSAL",
]);
const CARD_REFUSED = new Set(["PAYMENT_CREDIT_CARD_CAPTURE_REFUSED", "PAYMENT_REPROVED_BY_RISK_ANALYSIS"]);
const SUBSCRIPTION_ENDED = new Set(["SUBSCRIPTION_DELETED", "SUBSCRIPTION_INACTIVATED", "SUBSCRIPTION_UPDATED"]);
/** Imagem do item no Checkout (obrigatória na API): um quadrado de 64 px no verde da marca. */
const ITEM_IMAGE =
  "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAUElEQVR42u3PQQkAAAgEsAtjHkvYv4MRfAuDFVh66rUICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICFwWovFQxAGWARYAAAAASUVORK5CYII=";

const BRASILIA_MS = 3 * 3_600_000;
const DAY_MS = 86_400_000;
/** "AAAA-MM-DD" do Asaas → 00:00 desse dia em Brasília. */
const dayStart = (d: string) => {
  const t = Date.parse(`${d.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(t)) throw new Error(`data inesperada do Asaas: ${d}`);
  return t + BRASILIA_MS;
};
/** Hoje em Brasília, no formato do Asaas. */
const today = (now: number) => new Date(now - BRASILIA_MS).toISOString().slice(0, 10);

/**
 * Até quando uma cobrança paga cobre: do vencimento dela, um período, até o fim do dia do
 * vencimento seguinte (a cobrança da renovação vence nesse dia, e o acesso dura o dia todo).
 * Pagar atrasado não desloca o ciclo; a mesma cobrança confirmada e depois recebida dá o
 * mesmo fim.
 */
export const coverageEnd = (dueDate: string, period: Period) => addPeriod(dayStart(dueDate), period) + DAY_MS;

export class AsaasPaymentProvider implements PaymentProvider {
  readonly name = "asaas";
  private readonly base: string;
  private readonly cfg: AsaasConfig;
  private readonly refs: AsaasRefs;
  private readonly http: typeof fetch;
  /** um estorno por vez para cada assinatura neste processo (dois cliques não pedem dois) */
  private readonly refunding = new Map<string, Promise<void>>();

  constructor(cfg: AsaasConfig, refs: AsaasRefs, http: typeof fetch = globalThis.fetch) {
    this.cfg = cfg;
    this.refs = refs;
    this.http = http;
    if (!cfg.apiKey.startsWith(ASAAS_KEY_PREFIX[cfg.environment]))
      throw new Error(`A chave do Asaas não é do ambiente ${cfg.environment} (deveria começar com ${ASAAS_KEY_PREFIX[cfg.environment]}).`);
    if (cfg.webhookToken.length < 32 || /\s/.test(cfg.webhookToken))
      throw new Error("O token do webhook do Asaas precisa ter de 32 a 255 caracteres, sem espaços.");
    if (!cfg.billingTypes.length) throw new Error("Nenhuma forma de pagamento do Asaas configurada.");
    this.base = ASAAS_API[cfg.environment];
  }

  /** O e-mail não vai ao Asaas: a pessoa preenche os dados dela na página do Checkout. */
  async checkout(sub: { id: string; email: string; period: Period; price: number }, now = Date.now()) {
    const conta = `${this.cfg.appUrl}/conta`;
    const r = await this.call<{ id?: unknown; link?: unknown }>("POST", "/checkouts", {
      billingTypes: this.cfg.billingTypes,
      chargeTypes: ["RECURRENT"],
      minutesToExpire: 60,
      externalReference: sub.id,
      callback: { successUrl: `${conta}?assinatura=retorno`, cancelUrl: conta, expiredUrl: conta },
      items: [
        {
          name: "Alicerce Premium",
          description: `Assinatura ${sub.period} do Premium da Alicerce`,
          quantity: 1,
          value: sub.price / 100,
          imageBase64: ITEM_IMAGE,
        },
      ],
      subscription: { cycle: sub.period === "anual" ? "YEARLY" : "MONTHLY", nextDueDate: today(now) },
    });
    if (typeof r.id !== "string" || typeof r.link !== "string" || !r.link.startsWith("https://"))
      throw new Error("Resposta inesperada do Asaas ao criar o checkout.");
    return { url: r.link, ref: r.id };
  }

  async parseWebhook(rawBody: string, headers: Record<string, string | string[] | undefined>, now: number) {
    const token = headers["asaas-access-token"];
    if (typeof token !== "string" || !sameSecret(token, this.cfg.webhookToken))
      throw new Error("token do webhook do Asaas não confere");
    const b = JSON.parse(rawBody) as {
      id?: unknown;
      event?: unknown;
      payment?: { id?: unknown };
      subscription?: { id?: unknown };
    };
    if (typeof b.id !== "string" || b.id.length > 200 || typeof b.event !== "string") throw new Error("webhook do Asaas malformado");
    const id = `asaas:${b.id}`;
    if (b.event.startsWith("PAYMENT_") && typeof b.payment?.id === "string")
      return this.fromPayment(id, b.event, b.payment.id, now);
    if (b.event.startsWith("SUBSCRIPTION_") && typeof b.subscription?.id === "string")
      return this.fromSubscription(id, b.event, b.subscription.id, now);
    return null; // Checkout, split e o resto: o que vale chega pelos eventos da cobrança
  }

  /** O evento que a cobrança pede, pela situação dela na API (o corpo do webhook só aponta qual é). */
  private async fromPayment(id: string, event: string, paymentId: string, now: number): Promise<PaymentEvent | null> {
    const p = await this.getOrNull<AsaasPayment>(`/payments/${encodeURIComponent(paymentId)}`);
    if (!p) return null; // cobrança que a API não conhece: nada muda
    const ours = await this.ownerOf(p);
    if (!ours) return null; // cobrança que não é de uma assinatura do Alicerce
    const base = { id, subscriptionId: ours.id, at: now };
    if (PAID.has(p.status)) return { ...base, type: "pagamento_aprovado", paidUntil: coverageEnd(p.dueDate, ours.period) };
    if (REFUNDED.has(p.status)) return { ...base, type: "reembolso" };
    if (p.status === "OVERDUE" || CARD_REFUSED.has(event)) return { ...base, type: "pagamento_recusado" };
    return null; // criada, atualizada, em análise, estorno parcial: o acesso não muda
  }

  private async fromSubscription(id: string, event: string, asaasId: string, now: number): Promise<PaymentEvent | null> {
    const s = await this.getOrNull<AsaasSubscription>(`/subscriptions/${encodeURIComponent(asaasId)}`);
    // Uma assinatura removida pode não voltar na API; então vale a que já tínhamos ligado a ela.
    // Removida, ela só para de renovar: o acesso já pago continua, então não há o que forjar.
    const ours = s?.checkoutSession ? this.refs.byCheckout(s.checkoutSession) : this.refs.byAsaasSubscription(asaasId);
    if (!ours) return null;
    if (s) this.refs.setSubscription(ours.id, s.id);
    const ended = s ? s.deleted === true || s.status !== "ACTIVE" : event === "SUBSCRIPTION_DELETED";
    if (ended && SUBSCRIPTION_ENDED.has(event)) return { id, type: "assinatura_cancelada", subscriptionId: ours.id, at: now };
    return null;
  }

  /** A assinatura do Alicerce dona da cobrança: pelo Checkout de onde ela veio. */
  private async ownerOf(p: AsaasPayment) {
    let checkout = p.checkoutSession ?? null;
    if (!checkout && p.subscription) {
      const known = this.refs.byAsaasSubscription(p.subscription);
      if (known) return known;
      checkout = (await this.getOrNull<AsaasSubscription>(`/subscriptions/${encodeURIComponent(p.subscription)}`))?.checkoutSession ?? null;
    }
    const ours = checkout ? this.refs.byCheckout(checkout) : null;
    if (ours && p.subscription) this.refs.setSubscription(ours.id, p.subscription);
    return ours;
  }

  /** Fecha o Checkout de uma tentativa substituída. Já pago, expirado ou cancelado: nada a fechar. */
  async abandon(subscriptionId: string) {
    const checkout = this.refs.get(subscriptionId)?.checkout;
    if (!checkout) return;
    try {
      await this.call("POST", `/checkouts/${encodeURIComponent(checkout)}/cancel`);
    } catch (e) {
      if (!(e instanceof AsaasError)) throw e;
    }
  }

  async cancel(subscriptionId: string) {
    const asaasId = await this.asaasSubscription(subscriptionId);
    if (!asaasId) throw new Error(`não achei no Asaas a assinatura de ${subscriptionId}`);
    await this.remove(asaasId);
  }

  async refund(subscriptionId: string) {
    const running = this.refunding.get(subscriptionId);
    if (running) return running;
    const job = this.doRefund(subscriptionId).finally(() => this.refunding.delete(subscriptionId));
    this.refunding.set(subscriptionId, job);
    return job;
  }

  private async doRefund(subscriptionId: string) {
    const asaasId = await this.asaasSubscription(subscriptionId);
    if (!asaasId) throw new Error(`não achei no Asaas a assinatura de ${subscriptionId}`);
    // Primeiro para a renovação: se o estorno falhar depois, a pessoa tenta de novo sem o
    // risco de uma cobrança nova no meio. Remover não apaga as cobranças já pagas.
    await this.remove(asaasId);
    for (const p of await this.payments(asaasId)) {
      if (!PAID.has(p.status)) continue; // já estornada, pedida ou não paga: não pedir de novo
      await this.call("POST", `/payments/${encodeURIComponent(p.id)}/refund`, {
        description: "Desistência no prazo de 7 dias (CDC, art. 49)",
      });
    }
  }

  async fetchState(subscriptionId: string, now = Date.now()): Promise<ProviderSubscriptionState | null> {
    const ref = this.refs.get(subscriptionId);
    if (!ref) return null;
    const asaasId = await this.asaasSubscription(subscriptionId);
    if (!asaasId) return null; // sem pagamento ainda, ou o Asaas não diz qual assinatura veio do Checkout
    const s = await this.getOrNull<AsaasSubscription>(`/subscriptions/${encodeURIComponent(asaasId)}`);
    const list = await this.payments(asaasId);
    let paidUntil: number | null = null;
    let firstPaidAt: number | null = null;
    let refundedAt: number | null = null;
    for (const p of list) {
      if (PAID.has(p.status)) paidUntil = Math.max(paidUntil ?? 0, coverageEnd(p.dueDate, ref.period));
      if (PAID.has(p.status) || REFUNDED.has(p.status)) {
        // o fim do dia do pagamento: o prazo de desistência nunca encolhe por falta da hora
        const paidDay = p.clientPaymentDate ?? p.paymentDate;
        const at = paidDay ? Math.min(now, dayStart(paidDay) + DAY_MS - 1) : now;
        firstPaidAt = Math.min(firstPaidAt ?? at, at);
      }
      if (REFUNDED.has(p.status)) {
        const d = p.refunds?.find((r) => r.dateCreated)?.dateCreated;
        const at = d ? Date.parse(d.replace(" ", "T") + (d.length <= 19 ? "-03:00" : "")) : NaN;
        refundedAt = Math.min(refundedAt ?? now, Number.isFinite(at) ? at : now);
      }
    }
    const ended = !s || s.deleted === true || s.status !== "ACTIVE";
    if (refundedAt !== null)
      return {
        status: "reembolsada",
        paidUntil: paidUntil === null ? null : Math.min(paidUntil, refundedAt),
        firstPaidAt,
        canceledAt: refundedAt,
        refundedAt,
      };
    if (paidUntil !== null)
      return { status: ended ? "cancelada" : "ativa", paidUntil, firstPaidAt, canceledAt: ended ? now : null, refundedAt: null };
    if (ended) return { status: "recusada", paidUntil: null, firstPaidAt: null, canceledAt: now, refundedAt: null };
    const overdue = list.some((p) => p.status === "OVERDUE");
    return { status: overdue ? "recusada" : "pendente", paidUntil: null, firstPaidAt: null, canceledAt: null, refundedAt: null };
  }

  /**
   * O id da assinatura no Asaas: o que um webhook já trouxe ou, se todos se perderam, a
   * busca pela referência externa. A documentação não diz se a referência do Checkout passa
   * para a assinatura criada; se não passar, isso devolve null e a conciliação avisa
   * ("desconhecida") em vez de adivinhar.
   */
  private async asaasSubscription(subscriptionId: string): Promise<string | null> {
    const ref = this.refs.get(subscriptionId);
    if (!ref) return null;
    if (ref.subscription) return ref.subscription;
    if (!ref.checkout) return null;
    const r = await this.call<{ data?: AsaasSubscription[] }>(
      "GET",
      `/subscriptions?externalReference=${encodeURIComponent(subscriptionId)}&includeDeleted=true`,
    );
    const found = (r.data ?? []).find((s) => s.checkoutSession === ref.checkout);
    if (!found) return null;
    this.refs.setSubscription(subscriptionId, found.id);
    return found.id;
  }

  private async payments(asaasId: string): Promise<AsaasPayment[]> {
    const r = await this.call<{ data?: AsaasPayment[] }>("GET", `/subscriptions/${encodeURIComponent(asaasId)}/payments`);
    return (r.data ?? []).filter((p) => !p.deleted);
  }

  /** Remove a assinatura no Asaas; já removida (404) conta como feito. */
  private async remove(asaasId: string) {
    try {
      await this.call("DELETE", `/subscriptions/${encodeURIComponent(asaasId)}`);
    } catch (e) {
      if (!(e instanceof AsaasError && e.status === 404)) throw e;
    }
  }

  private async getOrNull<T>(path: string): Promise<T | null> {
    try {
      return await this.call<T>("GET", path);
    } catch (e) {
      if (e instanceof AsaasError && e.status === 404) return null;
      throw e;
    }
  }

  private async call<T>(method: string, path: string, body?: unknown): Promise<T> {
    let res: Response;
    try {
      res = await this.http(`${this.base}${path}`, {
        method,
        headers: {
          access_token: this.cfg.apiKey,
          "user-agent": "Alicerce (https://github.com/ArthurMonTInegro/alicerce)",
          ...(body === undefined ? {} : { "content-type": "application/json" }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (e) {
      throw new ProviderUnavailable(`Asaas não respondeu (${method} ${path}): ${(e as Error).message}`);
    }
    const text = await res.text();
    // 401/403: a chave daqui está errada ou sem permissão. O evento não é inválido: fica para depois de corrigir.
    if (res.status >= 500 || res.status === 429 || res.status === 401 || res.status === 403)
      throw new ProviderUnavailable(`Asaas respondeu ${res.status} (${method} ${path})`);
    if (!res.ok) throw new AsaasError(res.status, `Asaas respondeu ${res.status} (${method} ${path}): ${text.slice(0, 300)}`);
    return (text ? JSON.parse(text) : {}) as T;
  }
}

export class AsaasError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function sameSecret(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
