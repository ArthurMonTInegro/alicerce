/**
 * Conciliação com o provedor de pagamento: recupera o que um webhook perdido deixaria
 * de fora. Para cada assinatura que ainda pode mudar, pergunta ao provedor a situação
 * dela (fetchState) e, se o banco ficou para trás, aplica o evento que faltou pelo mesmo
 * caminho do webhook (applyPaymentEvent), com um id fixo para a correção: rodar de novo
 * não aplica nada duas vezes, e o webhook original que chegar depois não muda o resultado.
 *
 * Com um provedor que lista as cobranças (o Asaas), a conferência é cobrança por cobrança: cada
 * cobrança lida lá vira uma leitura dela, aplicada aqui pela regra das cobranças (cobrancas.ts),
 * inclusive quando só confirma a situação gravada: é o que impede um evento mais antigo, que
 * chegue depois, de desfazê-la. A leitura não fica em payment_events (applyProviderReading): ler
 * de novo a mesma situação não muda nada. Cada leitura leva a própria janela de tempo (do pedido
 * à resposta do provedor), e não a hora em que a rodada começou.
 *
 * A conciliação só faz o banco alcançar o provedor. Ela nunca desfaz um estorno concluído nem
 * faz uma cobrança voltar atrás numa transição que não vale; o que pediria isso vai para
 * `divergencias`, para alguém olhar (docs/PAGAMENTO.md, "Investigar uma divergência").
 *
 * `alertas` (ReconcileAlerts) transforma o relatório de cada rodada nas linhas de log: o que
 * precisa de alguém sai como aviso uma vez por dia por caso, e o esperado (tentativas sem
 * pagamento) só entra na contagem.
 */
import type { DatabaseSync } from "node:sqlite";
import {
  applyPaymentEvent,
  applyProviderReading,
  replaceLegacyCharges,
  type PaymentEvent,
  type PaymentProvider,
  type SubscriptionStatus,
} from "./assinatura.ts";
import { canMove, chargesOf, eventTypeFor, readClock, WAS_PAID } from "./cobrancas.ts";

/**
 * Tentativas pendentes ou recusadas, reembolsos e cancelamentos vencidos há mais que isto não
 * são mais conferidos (cada conferência é uma chamada à API do provedor).
 */
const ABANDONED_AFTER_MS = 30 * 86_400_000;

export interface ReconcileReport {
  conferidas: number;
  /** eventos aplicados, por assinatura */
  corrigidas: Array<{ assinatura: string; eventos: PaymentEvent["type"][] }>;
  /** o provedor não conhece a assinatura: nada muda (as esperadas e as que não deveriam acontecer) */
  desconhecidas: string[];
  /**
   * Das desconhecidas, as que já tiveram pagamento registrado aqui: o provedor deveria
   * conhecê-las. A tentativa que nunca foi paga (página de pagamento aberta ou abandonada) é
   * esperada e fica só em `desconhecidas`.
   */
  semVinculo: Array<{ assinatura: string; situacao: SubscriptionStatus }>;
  /** mudanças que pedem uma decisão de política, não um conserto: estorno parcial e contestação */
  avisos: Array<{ assinatura: string; cobranca: string; evento: PaymentEvent["type"] }>;
  /** banco e provedor discordam de um jeito que a conciliação não corrige sozinha */
  divergencias: Array<{ assinatura: string; motivo: string }>;
  /** o provedor não respondeu: fica para a próxima rodada */
  falhas: Array<{ assinatura: string; erro: string }>;
}

interface Row {
  id: string;
  status: SubscriptionStatus;
  paid_until: number | null;
  first_paid_at: number | null;
}
const COLUMNS = "id, status, paid_until, first_paid_at";

/**
 * `now`: para os testes, congela o relógio nesse instante. Sem ele, cada leitura do provedor é
 * carimbada com a hora em que aconteceu (readClock).
 */
export async function reconcile(
  db: DatabaseSync,
  provider: PaymentProvider,
  now?: number,
): Promise<ReconcileReport> {
  const clock = clockAt(now);
  const t = clock();
  const rows = db
    .prepare(
      `SELECT ${COLUMNS} FROM subscriptions WHERE provider = ? AND (status = 'ativa' OR (status = 'cancelada' AND paid_until > ?) OR (status IN ('pendente', 'recusada', 'reembolsada') AND updated_at > ?)) ORDER BY created_at, rowid`,
    )
    .all(provider.name, t - ABANDONED_AFTER_MS, t - ABANDONED_AFTER_MS) as unknown as Row[];
  const report = emptyReport();
  for (const s of rows) await reconcileRow(db, provider, s, clock, report);
  return report;
}

const clockAt = (now: number | undefined) => (now === undefined ? readClock : () => now);

/**
 * Concilia uma assinatura só, logo depois de cancelar ou estornar nela: a tela já mostra o
 * resultado que o provedor confirmou, sem esperar o webhook (que, quando chegar, não muda nada).
 */
export async function reconcileOne(
  db: DatabaseSync,
  provider: PaymentProvider,
  id: string,
  now?: number,
): Promise<ReconcileReport> {
  const report = emptyReport();
  const s = db
    .prepare(`SELECT ${COLUMNS} FROM subscriptions WHERE id = ? AND provider = ?`)
    .get(id, provider.name) as Row | undefined;
  if (s) await reconcileRow(db, provider, s, clockAt(now), report);
  return report;
}

const emptyReport = (): ReconcileReport => ({
  conferidas: 0,
  corrigidas: [],
  desconhecidas: [],
  semVinculo: [],
  divergencias: [],
  avisos: [],
  falhas: [],
});

async function reconcileRow(
  db: DatabaseSync,
  provider: PaymentProvider,
  s: Row,
  clock: () => number,
  report: ReconcileReport,
) {
  let p;
  // a leitura aconteceu em algum ponto entre estes dois instantes (cobrancas.ts, recordCharge)
  const read = { from: clock(), until: 0 };
  try {
    p = await provider.fetchState(s.id);
  } catch (e) {
    report.falhas.push({ assinatura: s.id, erro: (e as Error).message });
    return;
  }
  read.until = clock();
  const now = read.until;
  report.conferidas++;
  if (!p) {
    report.desconhecidas.push(s.id);
    if (s.first_paid_at !== null || s.status === "ativa" || s.status === "cancelada" || s.status === "reembolsada")
      report.semVinculo.push({ assinatura: s.id, situacao: s.status });
    return;
  }
  if (p.charges) return reconcileCharges(db, provider, s, p, read, report);
  const events: PaymentEvent[] = [];
  if (p.paidUntil !== null && p.paidUntil > (s.paid_until ?? 0))
    events.push({
      id: `conciliacao:${s.id}:aprovado:${p.paidUntil}`,
      type: "pagamento_aprovado",
      subscriptionId: s.id,
      paidUntil: p.paidUntil,
      at: s.first_paid_at ?? p.firstPaidAt ?? now,
    });
  else if (p.paidUntil !== null && s.paid_until !== null && p.paidUntil < s.paid_until && p.status !== "reembolsada")
    report.divergencias.push({
      assinatura: s.id,
      motivo: `o provedor diz pago até ${new Date(p.paidUntil).toISOString()}, e o banco, até ${new Date(s.paid_until).toISOString()}`,
    });
  if (p.status === "reembolsada")
    events.push({
      id: `conciliacao:${s.id}:reembolso`,
      type: "reembolso",
      subscriptionId: s.id,
      at: p.refundedAt ?? now,
    });
  else if (s.status === "reembolsada")
    // um estorno que o provedor desfez (ou nunca concluiu): a pessoa pode ter pago sem acesso
    report.divergencias.push({
      assinatura: s.id,
      motivo: `reembolsada no banco, mas o provedor diz ${p.status}`,
    });
  else if (p.status === "cancelada" || (p.status === "recusada" && p.canceledAt !== null)) {
    if (s.status === "ativa" || s.status === "pendente")
      events.push({
        id: `conciliacao:${s.id}:cancelada`,
        type: "assinatura_cancelada",
        subscriptionId: s.id,
        at: p.canceledAt ?? now,
      });
  } else if (p.status === "recusada") {
    if (s.status === "pendente")
      events.push({
        id: `conciliacao:${s.id}:recusado`,
        type: "pagamento_recusado",
        subscriptionId: s.id,
        at: now,
      });
  } else if (p.status === "ativa" && s.status === "cancelada")
    report.divergencias.push({
      assinatura: s.id,
      motivo: "cancelada no banco, mas o provedor ainda renova",
    });
  const applied = events.filter(
    (ev) => applyPaymentEvent(db, provider.name, ev, now) === "aplicado",
  );
  if (applied.length)
    report.corrigidas.push({
      assinatura: s.id,
      eventos: applied.map((ev) => ev.type),
    });
}

/** Conferência cobrança por cobrança, para o provedor que lista as cobranças da assinatura. */
function reconcileCharges(
  db: DatabaseSync,
  provider: PaymentProvider,
  s: Row,
  p: NonNullable<Awaited<ReturnType<PaymentProvider["fetchState"]>>>,
  read: { from: number; until: number },
  report: ReconcileReport,
) {
  const now = read.until;
  const local = new Map(chargesOf(db, s.id).map((c) => [c.charge_id, c]));
  const events: PaymentEvent[] = [];
  for (const c of p.charges!) {
    const type = eventTypeFor(c.status);
    if (!type) continue; // pendente ou removida: nada a registrar
    const cur = local.get(c.id);
    // A mesma situação também vai: a leitura confirma a gravada e passa a ser a mais nova.
    if (cur && !canMove(cur.status, c.status)) {
      report.divergencias.push({
        assinatura: s.id,
        motivo:
          s.status === "reembolsada" && cur.status === "estornada"
            ? `reembolsada no banco, mas o provedor diz que a cobrança ${c.id} está ${c.providerStatus ?? c.status}`
            : `cobrança ${c.id}: ${cur.status} no banco, mas o provedor diz ${c.providerStatus ?? c.status}`,
      });
      continue;
    }
    events.push({
      // só para os logs: a leitura não fica em payment_events (applyProviderReading)
      id: `conciliacao:${s.id}:${c.id}:${c.status}:${read.from}`,
      type,
      subscriptionId: s.id,
      chargeId: c.id,
      chargeStatus: c.status,
      ...(c.providerStatus ? { providerStatus: c.providerStatus } : {}),
      ...(WAS_PAID.has(c.status) && c.coversUntil !== null ? { coversFrom: c.coversFrom ?? undefined, paidUntil: c.coversUntil } : {}),
      ...(c.paidAt !== null ? { paidAt: c.paidAt } : {}),
      at: read.from,
      observedUntil: read.until,
    });
  }
  const applied = events.filter((ev) => applyProviderReading(db, provider.name, ev, now) === "aplicado");
  // A cobrança 'legado:' da migração 9 sai quando o provedor lista as cobranças de verdade.
  if (p.charges!.some((c) => WAS_PAID.has(c.status))) replaceLegacyCharges(db, provider.name, s.id, now);
  // Depois das cobranças, a assinatura: parou de renovar lá e aqui ainda não?
  const after = db.prepare(`SELECT ${COLUMNS} FROM subscriptions WHERE id = ?`).get(s.id) as unknown as Row;
  const sub: PaymentEvent[] = [];
  if (p.canceledAt !== null && (after.status === "ativa" || after.status === "pendente"))
    sub.push({ id: `conciliacao:${s.id}:cancelada`, type: "assinatura_cancelada", subscriptionId: s.id, at: p.canceledAt });
  else if (p.status === "recusada" && after.status === "pendente")
    sub.push({ id: `conciliacao:${s.id}:recusado`, type: "pagamento_recusado", subscriptionId: s.id, at: now });
  else if (p.status === "ativa" && after.status === "cancelada")
    report.divergencias.push({ assinatura: s.id, motivo: "cancelada no banco, mas o provedor ainda renova" });
  applied.push(...sub.filter((ev) => applyPaymentEvent(db, provider.name, ev, now) === "aplicado"));
  if (applied.length) report.corrigidas.push({ assinatura: s.id, eventos: applied.map((ev) => ev.type) });
  for (const ev of applied)
    if (ev.type === "reembolso_parcial" || ev.type === "contestacao") report.avisos.push({ assinatura: s.id, cobranca: ev.chargeId!, evento: ev.type });
}

/** Uma linha de log que a rodada da conciliação pede. */
export interface ReconcileLogLine {
  nivel: "info" | "warn";
  mensagem: string;
  contexto: Record<string, unknown>;
}

/**
 * Transforma cada relatório da conciliação nas linhas de log (main.ts). Sem dado pessoal: só os
 * ids das assinaturas (aleatórios), situações e motivos.
 *
 * - aviso (warn), uma vez por caso a cada `repeatAfterMs` (24 h): divergência, assinatura com
 *   pagamento que o provedor não conhece, provedor sem responder; e, uma vez cada, o webhook
 *   perdido que a conciliação recuperou, o estorno parcial e a contestação (decisão pendente);
 * - resumo (info) de cada rodada com o que foi esperado: tentativas sem pagamento que o
 *   provedor não conhece (página aberta ou abandonada) entram só na contagem.
 */
export class ReconcileAlerts {
  private readonly last = new Map<string, number>();
  private readonly repeatAfterMs: number;
  constructor(repeatAfterMs = 24 * 3_600_000) {
    this.repeatAfterMs = repeatAfterMs;
  }
  lines(r: ReconcileReport, now = Date.now()): ReconcileLogLine[] {
    for (const [k, at] of this.last) if (now - at >= this.repeatAfterMs) this.last.delete(k);
    const out: ReconcileLogLine[] = [];
    const once = (key: string, line: ReconcileLogLine) => {
      if (this.last.has(key)) return;
      this.last.set(key, now);
      out.push(line);
    };
    for (const c of r.corrigidas)
      out.push({ nivel: "warn", mensagem: "conciliação aplicou o que um webhook perdido traria (confira a entrega dos webhooks)", contexto: { assinatura: c.assinatura, eventos: c.eventos } });
    for (const a of r.avisos)
      out.push({
        nivel: "warn",
        mensagem:
          a.evento === "contestacao"
            ? "contestação no cartão: o acesso daquela cobrança está suspenso pela regra proposta, à espera da decisão do Arthur (docs/PAGAMENTO.md)"
            : "estorno parcial: o acesso continua pela regra proposta, à espera da decisão do Arthur (docs/PAGAMENTO.md)",
        contexto: a,
      });
    for (const d of r.divergencias)
      once(`div:${d.assinatura}:${d.motivo}`, { nivel: "warn", mensagem: "conciliação: banco e provedor discordam; alguém precisa olhar (docs/PAGAMENTO.md, \"Investigar uma divergência\")", contexto: d });
    for (const v of r.semVinculo)
      once(`sem-vinculo:${v.assinatura}`, {
        nivel: "warn",
        mensagem: "conciliação: assinatura com pagamento registrado que o provedor não acha; confira no painel dele",
        contexto: v,
      });
    if (r.falhas.length)
      once(`falhas:${r.falhas[0]!.erro.slice(0, 80)}`, {
        nivel: "warn",
        mensagem: "conciliação: o provedor não respondeu; fica para a próxima rodada",
        contexto: { assinaturas: r.falhas.length, primeiroErro: r.falhas[0]!.erro.slice(0, 300) },
      });
    const esperadas = r.desconhecidas.length - r.semVinculo.length;
    if (r.conferidas || r.falhas.length)
      out.push({
        nivel: "info",
        mensagem: "conciliação com o provedor de pagamento",
        contexto: {
          conferidas: r.conferidas,
          corrigidas: r.corrigidas.length,
          divergencias: r.divergencias.length,
          semVinculo: r.semVinculo.length,
          tentativasSemPagamento: esperadas,
          falhas: r.falhas.length,
        },
      });
    return out;
  }
}
