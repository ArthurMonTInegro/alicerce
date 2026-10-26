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
 * - fetchState: lê a assinatura e todas as cobranças dela, página por página (conciliação).
 *
 * Cada webhook de cobrança vira um evento daquela cobrança (cobrancas.ts): o estorno de uma
 * cobrança antiga não encerra a assinatura. Situações conferidas na documentação em 24/10/2026
 * ("Eventos para cobranças", "Estornos", "Chargeback", "Listagem e paginação"):
 * - paga: CONFIRMED, RECEIVED, RECEIVED_IN_CASH, DUNNING_RECEIVED;
 * - estorno parcial: paga, com estorno DONE em `refunds` de valor menor que o da cobrança
 *   (PAYMENT_PARTIALLY_REFUNDED); só estorno DONE conta como devolvido;
 * - estorno pedido: REFUND_REQUESTED, REFUND_IN_PROGRESS ("a cobrança será estornada após sua execução");
 * - estornada: REFUNDED (também a contestação perdida termina assim);
 * - contestada: CHARGEBACK_REQUESTED, CHARGEBACK_DISPUTE, AWAITING_CHARGEBACK_REVERSAL. A
 *   disputa ganha passa por AWAITING_CHARGEBACK_REVERSAL e volta a CONFIRMED ou RECEIVED;
 * - vencida: OVERDUE, DUNNING_REQUESTED; pendente: PENDING, AWAITING_RISK_ANALYSIS.
 */
import { timingSafeEqual } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import {
  addPeriod,
  ProviderUnavailable,
  type PaymentEvent,
  type PaymentProvider,
  type Period,
  type ProviderCharge,
  type ProviderSubscriptionState,
} from "./assinatura.ts";
import { deriveSubscription, eventTypeFor, readClock, WAS_PAID, type ChargeStatus } from "./cobrancas.ts";

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
  value?: number;
  subscription?: string | null;
  checkoutSession?: string | null;
  dueDate: string;
  paymentDate?: string | null;
  clientPaymentDate?: string | null;
  deleted?: boolean;
  refunds?: Array<{ dateCreated?: string; status?: string; value?: number }> | null;
}
interface AsaasSubscription {
  id: string;
  status: "ACTIVE" | "EXPIRED" | "INACTIVE";
  deleted?: boolean;
  checkoutSession?: string | null;
}

const PAID = new Set(["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH", "DUNNING_RECEIVED"]);
const REFUND_PENDING = new Set(["REFUND_REQUESTED", "REFUND_IN_PROGRESS"]);
const CHARGEBACK = new Set(["CHARGEBACK_REQUESTED", "CHARGEBACK_DISPUTE", "AWAITING_CHARGEBACK_REVERSAL"]);
const OVERDUE = new Set(["OVERDUE", "DUNNING_REQUESTED"]);
/** Quanto da cobrança já foi devolvido de fato: só estorno com status DONE conta ("Estornos"). */
const refundedValue = (p: AsaasPayment) =>
  (p.refunds ?? []).filter((r) => r.status === "DONE").reduce((t, r) => t + (typeof r.value === "number" ? r.value : 0), 0);

/** A situação da cobrança no Alicerce (cobrancas.ts) pela situação dela no Asaas. */
export function chargeStatusFromAsaas(p: Pick<AsaasPayment, "status" | "deleted" | "value" | "refunds">, cardRefused = false): ChargeStatus {
  if (p.deleted) return "removida";
  if (PAID.has(p.status)) return refundedValue(p as AsaasPayment) > 0 ? "estorno_parcial" : "paga";
  if (p.status === "REFUNDED") return "estornada";
  if (REFUND_PENDING.has(p.status)) return "estorno_pedido";
  if (CHARGEBACK.has(p.status)) return "contestada";
  if (OVERDUE.has(p.status)) return "vencida";
  return cardRefused ? "recusada" : "pendente";
}
const CARD_REFUSED = new Set(["PAYMENT_CREDIT_CARD_CAPTURE_REFUSED", "PAYMENT_REPROVED_BY_RISK_ANALYSIS"]);
const SUBSCRIPTION_ENDED = new Set(["SUBSCRIPTION_DELETED", "SUBSCRIPTION_INACTIVATED", "SUBSCRIPTION_UPDATED"]);
/** Imagem do item no Checkout (obrigatória na API): um quadrado de 64 px no verde da marca. */
const ITEM_IMAGE =
  "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAUElEQVR42u3PQQkAAAgEsAtjHkvYv4MRfAuDFVh66rUICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICFwWovFQxAGWARYAAAAASUVORK5CYII=";

const PAGE = 100;
const RETRY_MS = 300;
const MAX_PAGES = 50;
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

/**
 * Algo que alguém precisa poder investigar, sem dado pessoal: só ids do Asaas e situações.
 * - cobranca_sem_vinculo: uma cobrança paga (ou mexida) que não é de nenhuma assinatura do
 *   Alicerce que conhecemos; pode ser um pagamento feito por fora, ou um Checkout que não ficou
 *   registrado aqui. O dinheiro pode ter entrado sem acesso: é para olhar.
 * - cobranca_desconhecida: um webhook que aponta uma cobrança que a API não conhece (corpo
 *   adulterado ou cobrança removida).
 */
export type AsaasNotice = "cobranca_sem_vinculo" | "cobranca_desconhecida";
export type AsaasNotify = (kind: AsaasNotice, context: Record<string, string | boolean | null>) => void;

export class AsaasPaymentProvider implements PaymentProvider {
  readonly name = "asaas";
  private readonly base: string;
  private readonly cfg: AsaasConfig;
  private readonly refs: AsaasRefs;
  private readonly http: typeof fetch;
  private readonly notify: AsaasNotify;
  /** relógio das leituras (cobrancas.ts, recordCharge); os testes passam o da simulação */
  private readonly clock: () => number;
  /** um estorno por vez para cada assinatura neste processo (dois cliques não pedem dois) */
  private readonly refunding = new Map<string, Promise<void>>();

  constructor(
    cfg: AsaasConfig,
    refs: AsaasRefs,
    http: typeof fetch = globalThis.fetch,
    notify: AsaasNotify = () => {},
    clock: () => number = readClock,
  ) {
    this.cfg = cfg;
    this.refs = refs;
    this.http = http;
    this.notify = notify;
    this.clock = clock;
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

  /**
   * O evento que a cobrança pede, pela situação dela na API (o corpo do webhook só aponta qual é).
   * A leitura aconteceu entre o pedido à API e a resposta: as duas pontas vão no evento (at,
   * observedUntil), porque duas leituras simultâneas podem responder fora de ordem e o Asaas não
   * diz em que instante cada uma foi feita.
   */
  private async fromPayment(id: string, event: string, paymentId: string, now: number): Promise<PaymentEvent | null> {
    const readFrom = this.clock();
    const p = await this.getOrNull<AsaasPayment>(`/payments/${encodeURIComponent(paymentId)}`);
    const readUntil = this.clock();
    if (!p) {
      this.notify("cobranca_desconhecida", { cobranca: paymentId.slice(0, 80), evento: event.slice(0, 60) });
      return null; // cobrança que a API não conhece: nada muda
    }
    const ours = await this.ownerOf(p);
    if (!ours) {
      // Cobrança que não é de uma assinatura do Alicerce: nada muda, mas fica rastreável se houve dinheiro.
      if (PAID.has(p.status) || REFUND_PENDING.has(p.status) || CHARGEBACK.has(p.status) || p.status === "REFUNDED")
        this.notify("cobranca_sem_vinculo", {
          cobranca: p.id,
          situacao: p.status,
          evento: event.slice(0, 60),
          temCheckout: Boolean(p.checkoutSession),
          temAssinatura: Boolean(p.subscription),
        });
      return null;
    }
    const c = this.toCharge(p, ours.period, now, CARD_REFUSED.has(event));
    const type = eventTypeFor(c.status);
    if (!type) return null; // pendente ou removida: o acesso não muda
    return {
      id,
      type,
      subscriptionId: ours.id,
      chargeId: p.id,
      chargeStatus: c.status,
      providerStatus: p.status,
      at: readFrom,
      observedUntil: readUntil,
      ...(WAS_PAID.has(c.status) ? { coversFrom: c.coversFrom!, paidUntil: c.coversUntil!, paidAt: c.paidAt! } : {}),
    };
  }

  /** Uma cobrança do Asaas como o Alicerce a registra (cobrancas.ts). */
  private toCharge(p: AsaasPayment, period: Period, now: number, cardRefused = false): ProviderCharge {
    const status = chargeStatusFromAsaas(p, cardRefused);
    // O fim do dia do pagamento (hora de Brasília): o prazo de desistência nunca encolhe por
    // falta da hora, e a mesma cobrança lida duas vezes dá o mesmo valor (o evento é o mesmo).
    const paidDay = p.clientPaymentDate ?? p.paymentDate;
    const paidAt = WAS_PAID.has(status) ? (paidDay ? dayStart(paidDay) + DAY_MS - 1 : now) : null;
    let refundedAt: number | null = null;
    if (status === "estornada") {
      const d = (p.refunds ?? []).find((r) => r.status === "DONE" && r.dateCreated)?.dateCreated ?? p.refunds?.find((r) => r.dateCreated)?.dateCreated;
      const at = d ? Date.parse(d.replace(" ", "T") + (d.length <= 19 ? "-03:00" : "")) : NaN;
      refundedAt = Number.isFinite(at) ? Math.min(at, now) : now;
    }
    return {
      id: p.id,
      status,
      providerStatus: p.status,
      coversFrom: dayStart(p.dueDate),
      coversUntil: coverageEnd(p.dueDate, period),
      paidAt,
      refundedAt,
    };
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
      // Com um estorno parcial já feito, pede só o que falta (o valor total não pode passar do pago).
      const done = refundedValue(p);
      const rest = typeof p.value === "number" ? Math.round((p.value - done) * 100) / 100 : null;
      if (rest !== null && rest <= 0) continue;
      await this.call("POST", `/payments/${encodeURIComponent(p.id)}/refund`, {
        ...(done > 0 && rest !== null ? { value: rest } : {}),
        description: "Desistência no prazo de 7 dias (CDC, art. 49)",
      });
    }
  }

  /**
   * A situação da assinatura e de cada cobrança dela no Asaas. A situação da assinatura sai
   * das cobranças pela mesma regra do banco (cobrancas.ts, deriveSubscription).
   */
  async fetchState(subscriptionId: string, now = Date.now()): Promise<ProviderSubscriptionState | null> {
    const ref = this.refs.get(subscriptionId);
    if (!ref) return null;
    const asaasId = await this.asaasSubscription(subscriptionId);
    if (!asaasId) return null; // sem pagamento ainda, ou o Asaas não diz qual assinatura veio do Checkout
    const s = await this.getOrNull<AsaasSubscription>(`/subscriptions/${encodeURIComponent(asaasId)}`);
    let list: AsaasPayment[];
    try {
      list = await this.payments(asaasId);
    } catch (e) {
      if (!s && e instanceof AsaasError && e.status === 404) return null; // a assinatura que conhecíamos não existe lá
      throw e;
    }
    const charges = list.map((p) => this.toCharge(p, ref.period, now));
    const ended = !s || s.deleted === true || s.status !== "ACTIVE";
    const rows = charges.map((c) => ({ status: c.status, covers_until: c.coversUntil, paid_at: c.paidAt }));
    const d = deriveSubscription({ status: "pendente", canceledAt: ended ? now : null, paidUntil: null, firstPaidAt: null }, rows, { type: "conciliacao", at: now });
    const everPaid = charges.some((c) => WAS_PAID.has(c.status));
    const status = everPaid
      ? (d.status as ProviderSubscriptionState["status"])
      : ended || charges.some((c) => c.status === "vencida" || c.status === "recusada")
        ? "recusada"
        : "pendente";
    const refunds = charges.filter((c) => c.status === "estornada").map((c) => c.refundedAt!);
    return {
      status,
      paidUntil: rows.some((c) => c.status === "paga" || c.status === "estorno_parcial")
        ? Math.max(...charges.filter((c) => c.status === "paga" || c.status === "estorno_parcial").map((c) => c.coversUntil!))
        : null,
      firstPaidAt: d.firstPaidAt,
      canceledAt: ended ? now : null,
      refundedAt: status === "reembolsada" ? (refunds.length ? Math.max(...refunds) : now) : null,
      charges,
    };
  }

  /**
   * O id da assinatura no Asaas: o que um webhook já trouxe ou, se todos se perderam, a busca
   * pela referência externa. A documentação não diz se a referência do Checkout passa para a
   * assinatura criada; se não passar, procura as cobranças daquele Checkout (o filtro
   * `checkoutSession` de "Listar cobranças") e usa a assinatura delas. Sem nenhuma das duas,
   * devolve null e a conciliação conta a tentativa como sem pagamento, em vez de adivinhar.
   */
  private async asaasSubscription(subscriptionId: string): Promise<string | null> {
    const ref = this.refs.get(subscriptionId);
    if (!ref) return null;
    if (ref.subscription) return ref.subscription;
    if (!ref.checkout) return null;
    const list = await this.list<AsaasSubscription>(
      `/subscriptions?externalReference=${encodeURIComponent(subscriptionId)}&includeDeleted=true`,
    );
    let found = list.find((s) => s.checkoutSession === ref.checkout)?.id;
    if (!found) {
      const pays = await this.list<AsaasPayment>(`/payments?checkoutSession=${encodeURIComponent(ref.checkout)}`);
      found = pays.find((p) => p.checkoutSession === ref.checkout && p.subscription)?.subscription ?? undefined;
    }
    if (!found) return null;
    this.refs.setSubscription(subscriptionId, found);
    return found;
  }

  private async payments(asaasId: string): Promise<AsaasPayment[]> {
    return (await this.list<AsaasPayment>(`/subscriptions/${encodeURIComponent(asaasId)}/payments`)).filter((p) => !p.deleted);
  }

  /**
   * Todos os itens de uma listagem, página por página ("Listagem e paginação": limit até 100,
   * offset a partir de 0, continuar enquanto hasMore). Sem isso, só vinham os 10 primeiros, e
   * uma assinatura mensal com mais de 10 cobranças perdia as mais novas na conciliação.
   */
  private async list<T>(path: string): Promise<T[]> {
    const out: T[] = [];
    const sep = path.includes("?") ? "&" : "?";
    for (let page = 0; page < MAX_PAGES; page++) {
      const r = await this.call<{ data?: T[]; hasMore?: boolean }>("GET", `${path}${sep}limit=${PAGE}&offset=${page * PAGE}`);
      out.push(...(r.data ?? []));
      if (!r.hasMore) return out;
    }
    throw new ProviderUnavailable(`listagem do Asaas com mais de ${MAX_PAGES * PAGE} itens (${path}); nada foi mudado`);
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

  /**
   * Uma chamada à API. Uma leitura (GET) que falha por rede, tempo esgotado, 5xx ou 429 é
   * tentada mais uma vez, depois de uma pausa curta; o resto não, porque criar um Checkout
   * ou pedir um estorno duas vezes não é seguro sem conferir antes.
   */
  private async call<T>(method: string, path: string, body?: unknown): Promise<T> {
    try {
      return await this.callOnce<T>(method, path, body);
    } catch (e) {
      if (method !== "GET" || !(e instanceof ProviderUnavailable) || /respondeu 40[13]/.test(e.message)) throw e;
      await new Promise((r) => setTimeout(r, RETRY_MS));
      return this.callOnce<T>(method, path, body);
    }
  }

  private async callOnce<T>(method: string, path: string, body?: unknown): Promise<T> {
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
