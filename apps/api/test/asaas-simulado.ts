/**
 * Simulação local da API do Asaas, só para os testes do adaptador (asaas.test.ts). Segue a
 * documentação oficial lida em 23/10/2026 (https://docs.asaas.com): os campos obrigatórios
 * do Checkout, as rotas que o adaptador usa, os webhooks com o token fixo no cabeçalho
 * `asaas-access-token` e o id `evt_...` de cada evento.
 *
 * Não prova que o Asaas se comporta assim. O que a documentação não diz, a simulação
 * escolhe e marca como suposição ("Suposição:"); a lista para conferir no sandbox está em
 * docs/PAGAMENTO.md, "Asaas".
 */
import { randomBytes, randomUUID } from 'node:crypto';
import { ASAAS_API } from '../src/asaas.ts';
import type { Delivery } from './contrato-provedor.ts';

const BILLING_TYPES = ['CREDIT_CARD', 'PIX'];
const CHARGE_TYPES = ['DETACHED', 'RECURRENT', 'INSTALLMENT'];
const CYCLES = ['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'SEMIANNUALLY', 'YEARLY'];
const PAID = ['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH'];
const BRASILIA_MS = 3 * 3_600_000;

interface Checkout {
  id: string;
  status: 'ACTIVE' | 'CANCELED' | 'EXPIRED' | 'PAID';
  externalReference: string | null;
  value: number;
  cycle: string;
  nextDueDate: string;
}
interface Subscription {
  object: 'subscription';
  id: string;
  customer: string;
  status: 'ACTIVE' | 'EXPIRED' | 'INACTIVE';
  deleted: boolean;
  cycle: string;
  value: number;
  billingType: string;
  nextDueDate: string;
  externalReference: string | null;
  checkoutSession: string;
}
interface Payment {
  object: 'payment';
  id: string;
  customer: string;
  subscription: string;
  checkoutSession: string;
  externalReference: string | null;
  status: string;
  value: number;
  billingType: string;
  dueDate: string;
  paymentDate: string | null;
  clientPaymentDate: string | null;
  deleted: boolean;
  refunds: Array<{ dateCreated: string; status: string; value: number }> | null;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const erro = (status: number, code: string, description: string) => json(status, { errors: [{ code, description }] });
/**
 * Uma página de uma listagem, como a documentação descreve ("Listagem e paginação"): `limit`
 * de 1 a 100, 10 se não vier; `offset` a partir de 0; `hasMore` diz se há mais. Suposição: a
 * ordem é a de criação, a mais antiga primeiro (a documentação não diz).
 */
function pagina<T>(todos: T[], q: URLSearchParams) {
  const limit = q.has('limit') ? Number(q.get('limit')) : 10;
  const offset = q.has('offset') ? Number(q.get('offset')) : 0;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0)
    return erro(400, 'invalid_parameter', 'limit de 1 a 100 e offset a partir de 0');
  const data = todos.slice(offset, offset + limit);
  return json(200, { object: 'list', hasMore: offset + limit < todos.length, totalCount: todos.length, limit, offset, data });
}
const isDate = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Um ciclo depois de "AAAA-MM-DD", sem pular o fim do mês (Suposição: o Asaas faz igual). */
export function nextCycle(date: string, cycle: string) {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const months = cycle === 'YEARLY' ? 12 : 1;
  const last = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m - 1 + months, Math.min(d, last))).toISOString().slice(0, 10);
}

export class AsaasSimulado {
  readonly apiKey = `$aact_hmlg_${randomBytes(24).toString('hex')}`;
  readonly token = randomBytes(24).toString('hex');
  /** webhooks entregues, na ordem */
  readonly deliveries: Delivery[] = [];
  /** cada chamada recebida, para os testes conferirem o que o adaptador mandou */
  readonly calls: Array<{ method: string; path: string; body: unknown }> = [];
  /** estornos feitos de fato, por cobrança */
  readonly estornos = new Map<string, number>();
  /** relógio da simulação (o dia de vencimento e o de pagamento saem dele) */
  now = Date.now();
  /**
   * Suposição: a referência externa do Checkout passa para a assinatura e as cobranças
   * criadas por ele. A documentação não diz; com false, o adaptador só acha a assinatura
   * pelos webhooks.
   */
  propagaReferencia = true;
  /**
   * O filtro `checkoutSession` de GET /payments, que a documentação lista ("Listar cobranças").
   * Com false, a simulação o ignora e devolve a lista vazia (para testar o caminho sem ele).
   */
  filtraPorCheckout = true;
  /** Suposição: uma assinatura removida ainda volta no GET, com deleted: true. Com true, dá 404. */
  removidaSome = false;
  /** toda chamada responde 503 */
  foraDoAr = false;
  /**
   * Os webhooks cadastrados no painel (GET /webhooks, "Listar webhooks"). Suposição: a
   * listagem traz os campos do cadastro ("Criar novo Webhook pela API") sem o authToken,
   * que a documentação diz voltar só na criação. A página da listagem não mostra os campos.
   */
  webhooks: Array<{ id: string; name: string; url: string; email: string; enabled: boolean; interrupted: boolean; apiVersion: number; sendType: string; events: string[] }> = [];
  /** os próximos `n` webhooks mudam a situação, mas não chegam */
  perderProximos = 0;

  private readonly checkouts = new Map<string, Checkout>();
  private readonly subscriptions = new Map<string, Subscription>();
  private readonly payments = new Map<string, Payment>();
  private eventos = 0;

  /** O fetch que o adaptador recebe: responde como a API do sandbox. */
  readonly fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? 'GET';
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
    const path = url.pathname.replace(/^\/v3/, '');
    this.calls.push({ method, path: `${path}${url.search}`, body });
    if (`${url.origin}/v3` !== ASAAS_API.sandbox) return erro(404, 'not_found', 'endereço fora do sandbox');
    if (this.foraDoAr) return erro(503, 'unavailable', 'Serviço indisponível');
    const headers = new Headers(init?.headers);
    if (headers.get('access_token') !== this.apiKey) return erro(401, 'invalid_access_token', 'A chave de API fornecida é inválida');
    if (!headers.get('user-agent')) return erro(400, 'invalid_user_agent', 'Informe o User-Agent');
    return this.route(method, path, url.searchParams, body);
  }) as typeof fetch;

  private route(method: string, path: string, q: URLSearchParams, body: any): Response {
    let m: RegExpMatchArray | null;
    if (method === 'POST' && path === '/checkouts') return this.createCheckout(body);
    if (method === 'POST' && (m = path.match(/^\/checkouts\/([^/]+)\/cancel$/))) {
      const c = this.checkouts.get(decodeURIComponent(m[1]!));
      if (!c) return erro(404, 'not_found', 'Checkout não encontrado');
      if (c.status === 'ACTIVE') c.status = 'CANCELED';
      return json(200, c);
    }
    if (method === 'GET' && (m = path.match(/^\/payments\/([^/]+)$/))) {
      const p = this.payments.get(decodeURIComponent(m[1]!));
      return p ? json(200, p) : erro(404, 'not_found', 'Cobrança não encontrada');
    }
    if (method === 'POST' && (m = path.match(/^\/payments\/([^/]+)\/refund$/))) return this.refund(decodeURIComponent(m[1]!));
    if (method === 'GET' && path === '/payments') {
      const checkout = q.get('checkoutSession');
      if (checkout === null || !this.filtraPorCheckout) return pagina([], q);
      return pagina([...this.payments.values()].filter((p) => p.checkoutSession === checkout && !p.deleted), q);
    }
    if (method === 'GET' && (m = path.match(/^\/subscriptions\/([^/]+)\/payments$/))) {
      const s = this.subscriptions.get(decodeURIComponent(m[1]!));
      if (!s) return erro(404, 'not_found', 'Assinatura não encontrada');
      return pagina([...this.payments.values()].filter((p) => p.subscription === s.id && !p.deleted), q);
    }
    if ((m = path.match(/^\/subscriptions\/([^/]+)$/))) {
      const s = this.subscriptions.get(decodeURIComponent(m[1]!));
      if (method === 'GET') return s && !(s.deleted && this.removidaSome) ? json(200, s) : erro(404, 'not_found', 'Assinatura não encontrada');
      if (method === 'DELETE') {
        if (!s || s.deleted) return erro(404, 'not_found', 'Assinatura não encontrada');
        s.deleted = true;
        // a documentação: remover a assinatura remove também as cobranças pendentes
        for (const p of this.payments.values())
          if (p.subscription === s.id && (p.status === 'PENDING' || p.status === 'OVERDUE')) {
            p.deleted = true;
            this.emit('PAYMENT_DELETED', { payment: p });
          }
        this.emit('SUBSCRIPTION_DELETED', { subscription: s });
        return json(200, { deleted: true, id: s.id });
      }
    }
    if (method === 'GET' && path === '/webhooks') return pagina(this.webhooks, q);
    if (method === 'GET' && path === '/subscriptions') {
      const ref = q.get('externalReference');
      return pagina(
        [...this.subscriptions.values()].filter(
          (s) => (ref === null || s.externalReference === ref) && (!s.deleted || q.get('includeDeleted') === 'true'),
        ),
        q,
      );
    }
    return erro(404, 'not_found', `rota não simulada: ${method} ${path}`);
  }

  /** POST /checkouts, com os campos que a documentação marca como obrigatórios. */
  private createCheckout(b: any): Response {
    const bad = (d: string) => erro(400, 'invalid_object', d);
    if (!Array.isArray(b?.billingTypes) || !b.billingTypes.length || !b.billingTypes.every((t: unknown) => BILLING_TYPES.includes(t as string)))
      return bad('billingTypes inválido');
    if (!Array.isArray(b.chargeTypes) || !b.chargeTypes.length || !b.chargeTypes.every((t: unknown) => CHARGE_TYPES.includes(t as string)))
      return bad('chargeTypes inválido');
    if (typeof b.callback?.successUrl !== 'string' || typeof b.callback?.cancelUrl !== 'string') return bad('callback.successUrl e callback.cancelUrl são obrigatórios');
    if (!Array.isArray(b.items) || !b.items.length) return bad('items é obrigatório');
    for (const i of b.items) {
      if (typeof i.name !== 'string' || !i.name || i.name.length > 30) return bad('items.name: até 30 caracteres');
      if (i.description !== undefined && (typeof i.description !== 'string' || i.description.length > 150)) return bad('items.description: até 150 caracteres');
      if (!Number.isInteger(i.quantity) || i.quantity < 1) return bad('items.quantity inválido');
      if (typeof i.value !== 'number' || !(i.value > 0)) return bad('items.value inválido');
      if (typeof i.imageBase64 !== 'string' || !i.imageBase64) return bad('items.imageBase64 é obrigatório');
    }
    if (b.minutesToExpire !== undefined && (!Number.isInteger(b.minutesToExpire) || b.minutesToExpire < 10 || b.minutesToExpire > 1440))
      return bad('minutesToExpire: de 10 a 1440');
    if (b.externalReference !== undefined && (typeof b.externalReference !== 'string' || b.externalReference.length > 200)) return bad('externalReference: até 200 caracteres');
    if (b.chargeTypes.includes('RECURRENT') && (!CYCLES.includes(b.subscription?.cycle) || !isDate(b.subscription?.nextDueDate)))
      return bad('subscription.cycle e subscription.nextDueDate são obrigatórios na cobrança recorrente');
    const c: Checkout = {
      id: randomUUID(),
      status: 'ACTIVE',
      externalReference: b.externalReference ?? null,
      value: b.items.reduce((t: number, i: { value: number; quantity: number }) => t + i.value * i.quantity, 0),
      cycle: b.subscription?.cycle,
      nextDueDate: b.subscription?.nextDueDate,
    };
    this.checkouts.set(c.id, c);
    return json(200, { ...b, id: c.id, status: c.status, link: `https://sandbox.asaas.com/checkoutSession/show?id=${c.id}` });
  }

  private refund(id: string): Response {
    const p = this.payments.get(id);
    if (!p || p.deleted) return erro(404, 'not_found', 'Cobrança não encontrada');
    // Suposição: estornar de novo uma cobrança já estornada dá 400, sem estornar outra vez.
    if (!PAID.includes(p.status)) return erro(400, 'invalid_action', 'Esta cobrança não pode ser estornada.');
    p.status = 'REFUNDED';
    p.refunds = [{ dateCreated: this.stamp(), status: 'DONE', value: p.value }];
    this.estornos.set(p.id, (this.estornos.get(p.id) ?? 0) + 1);
    this.emit('PAYMENT_REFUNDED', { payment: p });
    return json(200, p);
  }

  /* ---------- o que acontece do lado do Asaas ---------- */

  /** O Checkout que o adaptador criou para a assinatura do Alicerce (pela referência externa). */
  checkoutDe(alicerceId: string): Checkout {
    const c = [...this.checkouts.values()].find((x) => x.externalReference === alicerceId);
    if (!c) throw new Error(`nenhum Checkout para ${alicerceId}`);
    return c;
  }

  /** A assinatura que o Asaas criou a partir do Checkout. */
  assinaturaDe(alicerceId: string): Subscription {
    const c = this.checkoutDe(alicerceId);
    const s = [...this.subscriptions.values()].find((x) => x.checkoutSession === c.id);
    if (!s) throw new Error(`nenhuma assinatura no Asaas para ${alicerceId}`);
    return s;
  }

  cobrancasDe(alicerceId: string): Payment[] {
    const c = this.checkoutDe(alicerceId);
    return [...this.payments.values()].filter((p) => p.checkoutSession === c.id);
  }

  /** A pessoa paga na página do Checkout: o Asaas cria a assinatura e a primeira cobrança, já paga. */
  pagar(alicerceId: string, forma: 'CREDIT_CARD' | 'PIX' = 'CREDIT_CARD') {
    const { s, p } = this.abrirAssinatura(alicerceId, forma);
    this.emit('CHECKOUT_PAID', { checkout: { id: s.checkoutSession, status: 'PAID' } });
    this.confirmar(p, forma === 'PIX' ? 'RECEIVED' : 'CONFIRMED');
    return { assinatura: s.id, cobranca: p.id };
  }

  /**
   * Suposição: o cartão recusado no Checkout deixa a assinatura criada com a primeira
   * cobrança pendente e avisa PAYMENT_CREDIT_CARD_CAPTURE_REFUSED. A documentação não diz o
   * que o Checkout faz numa recusa (pode só pedir outro cartão, sem criar nada).
   */
  recusarCartao(alicerceId: string) {
    const { s, p } = this.abrirAssinatura(alicerceId, 'CREDIT_CARD');
    this.emit('PAYMENT_CREDIT_CARD_CAPTURE_REFUSED', { payment: p });
    return { assinatura: s.id, cobranca: p.id };
  }

  /** Uma cobrança pendente é paga (outro cartão, ou a renovação). */
  confirmar(p: Payment | string, status: 'CONFIRMED' | 'RECEIVED' = 'CONFIRMED') {
    const c = typeof p === 'string' ? this.payments.get(p)! : p;
    c.status = status;
    c.paymentDate = c.clientPaymentDate = this.today();
    this.emit(status === 'RECEIVED' ? 'PAYMENT_RECEIVED' : 'PAYMENT_CONFIRMED', { payment: c });
  }

  /** O dinheiro do cartão cai na conta (dias depois da confirmação): CONFIRMED vira RECEIVED. */
  receber(cobranca: string) {
    const p = this.payments.get(cobranca)!;
    p.status = 'RECEIVED';
    this.emit('PAYMENT_RECEIVED', { payment: p });
  }

  /** O Asaas gera a cobrança do próximo ciclo e o cartão é cobrado (ou não). */
  renovar(alicerceId: string, resultado: 'paga' | 'vencida' = 'paga') {
    const s = this.assinaturaDe(alicerceId);
    const p = this.novaCobranca(s);
    this.emit('PAYMENT_CREATED', { payment: p });
    if (resultado === 'paga') this.confirmar(p);
    else {
      p.status = 'OVERDUE';
      this.emit('PAYMENT_OVERDUE', { payment: p });
    }
    return p.id;
  }

  /**
   * Um estorno feito no painel do Asaas, sem passar pelo Alicerce: integral (sem `valor`) ou
   * parcial. A documentação lista PAYMENT_REFUNDED e PAYMENT_PARTIALLY_REFUNDED e diz que só o
   * estorno com status DONE em `refunds` conta como devolvido. Suposição: num estorno parcial,
   * a cobrança continua com o status de paga (a documentação não diz qual fica).
   */
  estornarNoPainel(cobranca: string, valor?: number) {
    const p = this.payments.get(cobranca)!;
    if (!PAID.includes(p.status)) throw new Error(`cobrança ${p.status} não pode ser estornada`);
    p.refunds = [...(p.refunds ?? []), { dateCreated: this.stamp(), status: 'DONE', value: valor ?? p.value }];
    const devolvido = p.refunds.filter((r) => r.status === 'DONE').reduce((t, r) => t + r.value, 0);
    this.estornos.set(p.id, (this.estornos.get(p.id) ?? 0) + 1);
    if (devolvido >= p.value) {
      p.status = 'REFUNDED';
      this.emit('PAYMENT_REFUNDED', { payment: p });
    } else this.emit('PAYMENT_PARTIALLY_REFUNDED', { payment: p });
  }

  /** A pessoa contesta a compra no cartão (chargeback). */
  contestar(cobranca: string) {
    const p = this.payments.get(cobranca)!;
    p.status = 'CHARGEBACK_REQUESTED';
    this.emit('PAYMENT_CHARGEBACK_REQUESTED', { payment: p });
  }

  /** O Alicerce apresenta documentos e a contestação fica em disputa. */
  disputar(cobranca: string) {
    const p = this.payments.get(cobranca)!;
    p.status = 'CHARGEBACK_DISPUTE';
    this.emit('PAYMENT_CHARGEBACK_DISPUTE', { payment: p });
  }

  /**
   * Fim da disputa. Ganha: AWAITING_CHARGEBACK_REVERSAL e depois CONFIRMED ou RECEIVED, como na
   * documentação ("Disputa vencida, aguardando repasse da adquirente"). Perdida: REFUNDED.
   */
  encerrarDisputa(cobranca: string, resultado: 'ganha' | 'perdida') {
    const p = this.payments.get(cobranca)!;
    if (resultado === 'perdida') {
      p.status = 'REFUNDED';
      this.emit('PAYMENT_REFUNDED', { payment: p });
      return;
    }
    p.status = 'AWAITING_CHARGEBACK_REVERSAL';
    this.emit('PAYMENT_AWAITING_CHARGEBACK_REVERSAL', { payment: p });
    p.status = 'RECEIVED';
    this.emit('PAYMENT_RECEIVED', { payment: p });
  }

  /**
   * A cobrança muda de situação sem webhook nenhum. Serve para casos que a documentação não
   * descreve, como um estorno pedido que não se conclui.
   */
  mudarSemAviso(cobranca: string, status: string) {
    this.payments.get(cobranca)!.status = status;
  }

  /** Versões adulteradas de um webhook verdadeiro, com o token certo. */
  adulterar(d: Delivery): Delivery[] {
    const b = JSON.parse(d.raw);
    const out: Delivery[] = [];
    const v = (f: (c: any) => void) => {
      const c = structuredClone(b);
      f(c);
      out.push({ raw: JSON.stringify(c), headers: d.headers });
    };
    if (b.payment) {
      v((c) => (c.payment.id = 'pay_que_nao_existe'));
      v((c) => (c.event = 'PAYMENT_REFUNDED'));
      v((c) => {
        c.payment.status = 'REFUNDED';
        c.payment.checkoutSession = 'outro-checkout';
        c.payment.externalReference = 'outra-assinatura';
      });
    }
    if (b.subscription) {
      v((c) => (c.event = 'SUBSCRIPTION_DELETED'));
      v((c) => (c.subscription.deleted = true));
    }
    return out;
  }

  private abrirAssinatura(alicerceId: string, forma: string) {
    const c = this.checkoutDe(alicerceId);
    if (c.status !== 'ACTIVE') throw new Error(`Checkout ${c.status}`);
    c.status = 'PAID';
    const s: Subscription = {
      object: 'subscription',
      id: `sub_${randomBytes(8).toString('hex')}`,
      customer: `cus_${randomBytes(6).toString('hex')}`,
      status: 'ACTIVE',
      deleted: false,
      cycle: c.cycle,
      value: c.value,
      billingType: forma,
      nextDueDate: c.nextDueDate,
      externalReference: this.propagaReferencia ? c.externalReference : null,
      checkoutSession: c.id,
    };
    this.subscriptions.set(s.id, s);
    this.emit('SUBSCRIPTION_CREATED', { subscription: s });
    const p = this.novaCobranca(s);
    this.emit('PAYMENT_CREATED', { payment: p });
    return { s, p };
  }

  private novaCobranca(s: Subscription): Payment {
    const p: Payment = {
      object: 'payment',
      id: `pay_${randomBytes(8).toString('hex')}`,
      customer: s.customer,
      subscription: s.id,
      checkoutSession: s.checkoutSession,
      externalReference: s.externalReference,
      status: 'PENDING',
      value: s.value,
      billingType: s.billingType,
      dueDate: s.nextDueDate,
      paymentDate: null,
      clientPaymentDate: null,
      deleted: false,
      refunds: null,
    };
    this.payments.set(p.id, p);
    s.nextDueDate = nextCycle(s.nextDueDate, s.cycle);
    return p;
  }

  private emit(event: string, obj: Record<string, unknown>) {
    // o corpo leva uma cópia do objeto naquele momento, como um webhook de verdade
    const body = { id: `evt_${randomBytes(16).toString('hex')}&${++this.eventos}`, event, dateCreated: this.stamp(), ...structuredClone(obj) };
    if (this.perderProximos > 0) {
      this.perderProximos--;
      return;
    }
    this.deliveries.push({ raw: JSON.stringify(body), headers: { 'content-type': 'application/json', 'asaas-access-token': this.token } });
  }

  private today() {
    return new Date(this.now - BRASILIA_MS).toISOString().slice(0, 10);
  }

  /** "AAAA-MM-DD HH:mm:ss", hora de Brasília, como as datas com hora da API. */
  private stamp() {
    return new Date(this.now - BRASILIA_MS).toISOString().slice(0, 19).replace('T', ' ');
  }
}
