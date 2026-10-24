/**
 * Homologação do Asaas no sandbox: confere o que a simulação local supõe (docs/PAGAMENTO.md,
 * "O que conferir no sandbox") contra a API de verdade. Só faz leituras (GET): não cria
 * Checkout, não estorna, não remove nada, e abre o banco só para leitura.
 *
 * Roda no ambiente do servidor, com as variáveis do sandbox já definidas lá (nunca na conversa
 * nem no repositório). Recusa ASAAS_AMBIENTE=producao. Não mostra a chave nem o token.
 *
 * Uso:
 *   node apps/api/scripts/asaas-homologacao.ts verificar
 *       variáveis, chave aceita, paginação e o webhook cadastrado (ligado, fila não pausada, eventos)
 *   node apps/api/scripts/asaas-homologacao.ts conferir <id da assinatura no Alicerce>
 *       depois de pagar no Checkout do sandbox: como o Asaas liga a assinatura ao Alicerce
 *       e cada cobrança no banco contra o Asaas
 *
 * Sai com 0 sem falhas, 1 com alguma falha e 2 quando se recusa a rodar. "?" é o que precisa
 * de olho humano: o Asaas respondeu algo que a documentação não descreve.
 * Roteiro completo: docs/PAGAMENTO.md, "Roteiro da homologação no sandbox".
 */
import { DatabaseSync } from 'node:sqlite';
import { pathToFileURL } from 'node:url';
import { ASAAS_API, ASAAS_KEY_PREFIX, AsaasPaymentProvider, asaasRefs, type AsaasConfig } from '../src/asaas.ts';
import { chargesOf } from '../src/cobrancas.ts';
import { loadConfig } from '../src/config.ts';

export type Nivel = 'ok' | 'falha' | 'conferir';
export interface Item {
  nivel: Nivel;
  /** o item da lista do sandbox em docs/PAGAMENTO.md, quando há um */
  item: number | null;
  texto: string;
}

export class Recusa extends Error {}

/** Os eventos que mudam o acesso (asaas.ts). Sem eles, só a conciliação percebe, uma vez por hora. */
export const EVENTOS_NECESSARIOS = [
  'PAYMENT_CONFIRMED',
  'PAYMENT_RECEIVED',
  'PAYMENT_DUNNING_RECEIVED',
  'PAYMENT_OVERDUE',
  'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED',
  'PAYMENT_REPROVED_BY_RISK_ANALYSIS',
  'PAYMENT_REFUND_IN_PROGRESS',
  'PAYMENT_REFUNDED',
  'PAYMENT_PARTIALLY_REFUNDED',
  'PAYMENT_CHARGEBACK_REQUESTED',
  'PAYMENT_CHARGEBACK_DISPUTE',
  'PAYMENT_AWAITING_CHARGEBACK_REVERSAL',
  'SUBSCRIPTION_UPDATED',
  'SUBSCRIPTION_INACTIVATED',
  'SUBSCRIPTION_DELETED',
] as const;

const UA = 'Alicerce (https://github.com/ArthurMonTInegro/alicerce)';
const ok = (item: number | null, texto: string): Item => ({ nivel: 'ok', item, texto });
const falha = (item: number | null, texto: string): Item => ({ nivel: 'falha', item, texto });
const conferir = (item: number | null, texto: string): Item => ({ nivel: 'conferir', item, texto });

/** A configuração do Asaas, das variáveis do ambiente. Recusa a de produção antes de tudo. */
export function verificarAmbiente(env: NodeJS.ProcessEnv): { itens: Item[]; cfg: AsaasConfig | null } {
  if (env.ASAAS_AMBIENTE === 'producao') throw new Recusa('ASAAS_AMBIENTE=producao: este script só roda no sandbox.');
  const key = env.ASAAS_API_KEY ?? '';
  if (key.startsWith(ASAAS_KEY_PREFIX.producao)) throw new Recusa('ASAAS_API_KEY é uma chave de produção: este script só roda no sandbox.');
  const itens: Item[] = [];
  itens.push(env.PAGAMENTO_PROVEDOR === 'asaas' ? ok(null, 'PAGAMENTO_PROVEDOR=asaas') : falha(null, 'PAGAMENTO_PROVEDOR não é "asaas": o servidor não usaria o Asaas'));
  itens.push(
    !key
      ? falha(null, 'ASAAS_API_KEY ausente')
      : key.startsWith(ASAAS_KEY_PREFIX.sandbox)
        ? ok(null, 'ASAAS_API_KEY presente, do sandbox (o valor não é mostrado)')
        : falha(null, `ASAAS_API_KEY não começa com ${ASAAS_KEY_PREFIX.sandbox}, o prefixo das chaves do sandbox`),
  );
  const token = env.ASAAS_WEBHOOK_TOKEN ?? '';
  itens.push(
    token.length >= 32 && token.length <= 255 && !/\s/.test(token)
      ? ok(null, 'ASAAS_WEBHOOK_TOKEN presente, de 32 a 255 caracteres, sem espaços (o valor não é mostrado)')
      : falha(null, 'ASAAS_WEBHOOK_TOKEN ausente ou fora da regra do Asaas (32 a 255 caracteres, sem espaços)'),
  );
  const appUrl = (env.APP_URL ?? '').replace(/\/+$/, '');
  let publico = false;
  try {
    const u = new URL(appUrl);
    publico = u.protocol === 'https:' && !/^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(u.hostname) && u.hostname.includes('.');
  } catch {
    /* fica falso */
  }
  itens.push(publico ? ok(null, `APP_URL público com HTTPS: o webhook vai para ${appUrl}/api/pagamento/webhook`) : falha(null, 'APP_URL ausente, sem HTTPS ou local: o Asaas não alcança o webhook'));
  const cfg = key && token ? { apiKey: key, environment: 'sandbox' as const, webhookToken: token, appUrl, billingTypes: ['CREDIT_CARD' as const] } : null;
  return { itens, cfg };
}

/** Leitura da API do sandbox. Só GET; o erro diz o código, nunca a chave. */
export function leitor(cfg: AsaasConfig, http: typeof fetch = fetch) {
  return async <T>(path: string): Promise<{ status: number; body: T | null }> => {
    const res = await http(`${ASAAS_API.sandbox}${path}`, {
      method: 'GET',
      headers: { access_token: cfg.apiKey, 'user-agent': UA },
      signal: AbortSignal.timeout(15_000),
    });
    const text = await res.text();
    let body: T | null = null;
    try {
      body = text ? (JSON.parse(text) as T) : null;
    } catch {
      /* corpo que não é JSON */
    }
    return { status: res.status, body };
  };
}

type Pagina<T> = { data?: T[]; hasMore?: unknown; totalCount?: unknown; limit?: unknown; offset?: unknown };
interface Webhook {
  url?: string;
  enabled?: boolean;
  interrupted?: boolean;
  sendType?: string;
  apiVersion?: number;
  events?: string[];
}

/** A chave, a paginação e o webhook cadastrado no sandbox. */
export async function verificarApi(cfg: AsaasConfig, http: typeof fetch = fetch): Promise<Item[]> {
  const ler = leitor(cfg, http);
  const itens: Item[] = [];
  const p = await ler<Pagina<unknown>>('/payments?limit=1&offset=0');
  if (p.status === 401 || p.status === 403) return [falha(11, `o Asaas recusou a chave (${p.status}): conferir ASAAS_API_KEY e se ela é desta conta do sandbox`)];
  if (p.status !== 200) return [falha(11, `GET /payments respondeu ${p.status}`)];
  itens.push(ok(11, 'chave aceita no cabeçalho access_token, com User-Agent'));
  const campos = ['hasMore', 'totalCount', 'limit', 'offset', 'data'].filter((k) => !(p.body && k in p.body));
  itens.push(campos.length ? conferir(16, `a listagem veio sem ${campos.join(', ')}: a paginação do adaptador supõe esses campos`) : ok(16, 'a listagem traz hasMore, totalCount, limit, offset e data'));

  const w = await ler<Pagina<Webhook>>('/webhooks?limit=100&offset=0');
  if (w.status !== 200) return [...itens, falha(null, `GET /webhooks respondeu ${w.status}`)];
  const alvo = `${cfg.appUrl}/api/pagamento/webhook`;
  const lista = w.body?.data ?? [];
  const meu = lista.find((h) => h.url === alvo);
  if (!meu) {
    const hosts = [...new Set(lista.map((h) => { try { return new URL(String(h.url)).host; } catch { return '?'; } }))];
    return [...itens, falha(null, `nenhum webhook cadastrado para ${alvo}${hosts.length ? ` (há ${lista.length} para: ${hosts.join(', ')})` : ''}`)];
  }
  itens.push(ok(null, `webhook cadastrado para ${alvo}`));
  itens.push(meu.enabled === true ? ok(null, 'webhook ligado') : meu.enabled === false ? falha(null, 'webhook desligado no painel') : conferir(null, 'a listagem não diz se o webhook está ligado (enabled)'));
  itens.push(
    meu.interrupted === false
      ? ok(13, 'fila de envio não pausada')
      : meu.interrupted === true
        ? falha(13, 'fila de envio PAUSADA (interrupted): retomar no painel do Asaas; os eventos guardados voltam a ser enviados')
        : conferir(13, 'a listagem não diz se a fila está pausada (interrupted)'),
  );
  if (Array.isArray(meu.events)) {
    const faltam = EVENTOS_NECESSARIOS.filter((e) => !meu.events!.includes(e));
    itens.push(faltam.length ? falha(null, `eventos que mudam o acesso e não estão no webhook: ${faltam.join(', ')}`) : ok(null, `os ${EVENTOS_NECESSARIOS.length} eventos que mudam o acesso estão no webhook`));
  } else itens.push(conferir(null, 'a listagem não traz os eventos do webhook: conferir no painel'));
  itens.push(meu.sendType ? ok(null, `envio ${meu.sendType} (o adaptador aceita os dois; SEQUENTIALLY mantém a ordem)`) : conferir(null, 'a listagem não diz o tipo de envio (sendType)'));
  return itens;
}

interface AsaasPayment {
  id: string;
  status: string;
  subscription?: string | null;
  checkoutSession?: string | null;
  paymentDate?: string | null;
  refunds?: Array<{ dateCreated?: string }> | null;
}
/** "2026-10-24 10:30:00" vira "9999-99-99 99:99:99": o formato, sem o valor. */
const formato = (v: string) => v.replace(/\d/g, '9');

/**
 * Depois de pagar no Checkout do sandbox: como o Asaas ligou a assinatura dele à do Alicerce
 * (itens 2 e 3) e cada cobrança do banco contra a do Asaas. O banco é aberto só para leitura,
 * e o adaptador não grava o id que achar.
 */
export async function conferirAssinatura(dbPath: string, cfg: AsaasConfig, id: string, http: typeof fetch = fetch, now = Date.now()): Promise<Item[]> {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const s = db.prepare('SELECT id, provider, status, period, paid_until, provider_ref, provider_subscription FROM subscriptions WHERE id = ?').get(id) as
      | { provider: string; status: string; paid_until: number | null; provider_ref: string | null; provider_subscription: string | null }
      | undefined;
    if (!s) return [falha(null, `nenhuma assinatura ${id} no banco`)];
    if (s.provider !== 'asaas') return [falha(null, `a assinatura ${id} é do provedor "${s.provider}", não do Asaas`)];
    if (!s.provider_ref) return [falha(null, 'a assinatura não tem Checkout registrado: ela foi aberta pelo site?')];
    const ler = leitor(cfg, http);
    const itens: Item[] = [ok(null, `assinatura ${id}: ${s.status} no banco, Checkout registrado`)];

    const porRef = await ler<Pagina<{ id: string; checkoutSession?: string | null }>>(`/subscriptions?externalReference=${encodeURIComponent(id)}&includeDeleted=true&limit=100&offset=0`);
    const achadaRef = porRef.body?.data?.find((x) => x.checkoutSession === s.provider_ref) ?? porRef.body?.data?.[0];
    itens.push(achadaRef ? ok(2, 'a externalReference do Checkout passou para a assinatura criada') : conferir(2, `a externalReference não passou para a assinatura (busca respondeu ${porRef.status})`));
    const porCheckout = await ler<Pagina<AsaasPayment>>(`/payments?checkoutSession=${encodeURIComponent(s.provider_ref)}&limit=100&offset=0`);
    const pagasDoCheckout = porCheckout.body?.data ?? [];
    itens.push(pagasDoCheckout.length ? ok(2, `o filtro checkoutSession de GET /payments achou ${pagasDoCheckout.length} cobrança(s) do Checkout`) : conferir(2, `o filtro checkoutSession não achou cobranças (respondeu ${porCheckout.status})`));
    const asaasId = s.provider_subscription ?? achadaRef?.id ?? pagasDoCheckout.find((p) => p.subscription)?.subscription ?? null;
    if (!asaasId) return [...itens, falha(2, 'não há como achar a assinatura no Asaas: nenhum webhook chegou, e nem a referência nem o filtro funcionaram')];
    itens.push(s.provider_subscription ? ok(3, 'um webhook já ligou a assinatura do Asaas à do Alicerce') : conferir(3, 'nenhum webhook ligou a assinatura do Asaas ainda: eles chegaram? ver os logs de webhooks no painel'));

    const sub = await ler<{ checkoutSession?: string | null; status?: string; deleted?: boolean }>(`/subscriptions/${encodeURIComponent(asaasId)}`);
    itens.push(sub.status === 200 && sub.body?.checkoutSession === s.provider_ref ? ok(3, 'a assinatura do Asaas traz o checkoutSession') : conferir(3, `a assinatura do Asaas não traz o checkoutSession do Checkout (GET ${sub.status})`));
    const pays = await ler<Pagina<AsaasPayment>>(`/subscriptions/${encodeURIComponent(asaasId)}/payments?limit=100&offset=0`);
    const lista = pays.body?.data ?? [];
    const semCheckout = lista.filter((p) => p.checkoutSession !== s.provider_ref).length;
    itens.push(!lista.length ? conferir(3, `a assinatura não tem cobranças (GET ${pays.status})`) : semCheckout ? conferir(3, `${semCheckout} de ${lista.length} cobrança(s) sem o checkoutSession: as de renovação?`) : ok(3, `as ${lista.length} cobrança(s) trazem o checkoutSession`));
    const datas = [...new Set(lista.flatMap((p) => [p.paymentDate, ...(p.refunds ?? []).map((r) => r.dateCreated)]).filter((d): d is string => typeof d === 'string').map(formato))];
    if (datas.length) itens.push(conferir(10, `formatos de data recebidos: ${datas.join(', ')} (o adaptador lê AAAA-MM-DD e "AAAA-MM-DD hh:mm:ss" em hora de Brasília)`));

    // O estado pelo adaptador, sem gravar nada: refs só de leitura.
    const refs = { ...asaasRefs(db), setSubscription: () => {} };
    const provider = new AsaasPaymentProvider({ ...cfg, billingTypes: ['CREDIT_CARD'] }, refs, http);
    const estado = await provider.fetchState(id, now);
    if (!estado) return [...itens, falha(null, 'o adaptador não achou a assinatura no Asaas')];
    const locais = new Map(chargesOf(db, id).map((c) => [c.charge_id, c]));
    for (const c of estado.charges ?? []) {
      const l = locais.get(c.id);
      locais.delete(c.id);
      if (!l) itens.push(falha(null, `cobrança ${c.id} (${c.providerStatus}): está no Asaas e não no banco; o webhook dela chegou?`));
      else if (l.status !== c.status) itens.push(falha(null, `cobrança ${c.id}: ${l.status} no banco, ${c.status} pelo Asaas (${c.providerStatus})`));
      else if (l.covers_until !== c.coversUntil) itens.push(falha(null, `cobrança ${c.id}: período diferente (banco até ${l.covers_until}, Asaas até ${c.coversUntil})`));
      else itens.push(ok(null, `cobrança ${c.id}: ${c.status} nos dois (${c.providerStatus})`));
    }
    for (const l of locais.values()) if (!l.charge_id.startsWith('legado:')) itens.push(falha(null, `cobrança ${l.charge_id}: está no banco (${l.status}) e não no Asaas`));
    itens.push(estado.status === s.status ? ok(null, `situação da assinatura igual nos dois: ${s.status}`) : falha(null, `assinatura: ${s.status} no banco, ${estado.status} pelo Asaas`));
    return itens;
  } finally {
    db.close();
  }
}

const SIMBOLO: Record<Nivel, string> = { ok: '✓', falha: '✗', conferir: '?' };
export const linha = (i: Item) => `${SIMBOLO[i.nivel]} ${i.item ? `[item ${i.item}] ` : ''}${i.texto}`;

async function main() {
  const [cmd, id] = process.argv.slice(2);
  if (cmd !== 'verificar' && !(cmd === 'conferir' && id)) {
    console.error('Uso: node apps/api/scripts/asaas-homologacao.ts verificar | conferir <id da assinatura no Alicerce>');
    return 2;
  }
  let itens: Item[];
  try {
    const amb = verificarAmbiente(process.env);
    itens = amb.itens;
    if (amb.cfg && !itens.some((i) => i.nivel === 'falha'))
      itens.push(...(cmd === 'verificar' ? await verificarApi(amb.cfg) : await conferirAssinatura(loadConfig().dbPath, amb.cfg, id!)));
  } catch (e) {
    if (e instanceof Recusa) {
      console.error(e.message);
      return 2;
    }
    throw e;
  }
  for (const i of itens) console.log(linha(i));
  return itens.some((i) => i.nivel === 'falha') ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) process.exitCode = await main();
