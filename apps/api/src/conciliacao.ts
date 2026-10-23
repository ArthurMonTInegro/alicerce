/**
 * Conciliação com o provedor de pagamento: recupera o que um webhook perdido deixaria
 * de fora. Para cada assinatura que ainda pode mudar, pergunta ao provedor a situação
 * dela (fetchState) e, se o banco ficou para trás, aplica o evento que faltou pelo mesmo
 * caminho do webhook (applyPaymentEvent), com um id fixo para a correção: rodar de novo
 * não aplica nada duas vezes, e o webhook original que chegar depois não muda o resultado.
 *
 * A conciliação só faz o banco alcançar o provedor. Ela nunca encurta um período nem
 * desfaz um reembolso; o que pediria isso vai para `divergencias`, para alguém olhar
 * (docs/PAGAMENTO.md, "Investigar uma divergência").
 */
import type { DatabaseSync } from "node:sqlite";
import {
  applyPaymentEvent,
  type PaymentEvent,
  type PaymentProvider,
  type SubscriptionStatus,
} from "./assinatura.ts";

/**
 * Tentativas pendentes ou recusadas, reembolsos e cancelamentos vencidos há mais que isto não
 * são mais conferidos (cada conferência é uma chamada à API do provedor).
 */
const ABANDONED_AFTER_MS = 30 * 86_400_000;

export interface ReconcileReport {
  conferidas: number;
  /** eventos aplicados, por assinatura */
  corrigidas: Array<{ assinatura: string; eventos: PaymentEvent["type"][] }>;
  /** o provedor não conhece a assinatura: nada muda */
  desconhecidas: string[];
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

export async function reconcile(
  db: DatabaseSync,
  provider: PaymentProvider,
  now = Date.now(),
): Promise<ReconcileReport> {
  const rows = db
    .prepare(
      "SELECT id, status, paid_until, first_paid_at FROM subscriptions WHERE provider = ? AND (status = 'ativa' OR (status = 'cancelada' AND paid_until > ?) OR (status IN ('pendente', 'recusada', 'reembolsada') AND updated_at > ?)) ORDER BY created_at, rowid",
    )
    .all(provider.name, now - ABANDONED_AFTER_MS, now - ABANDONED_AFTER_MS) as unknown as Row[];
  const report = emptyReport();
  for (const s of rows) await reconcileRow(db, provider, s, now, report);
  return report;
}

/**
 * Concilia uma assinatura só, logo depois de cancelar ou estornar nela: a tela já mostra o
 * resultado que o provedor confirmou, sem esperar o webhook (que, quando chegar, não muda nada).
 */
export async function reconcileOne(
  db: DatabaseSync,
  provider: PaymentProvider,
  id: string,
  now = Date.now(),
): Promise<ReconcileReport> {
  const report = emptyReport();
  const s = db
    .prepare("SELECT id, status, paid_until, first_paid_at FROM subscriptions WHERE id = ? AND provider = ?")
    .get(id, provider.name) as Row | undefined;
  if (s) await reconcileRow(db, provider, s, now, report);
  return report;
}

const emptyReport = (): ReconcileReport => ({
  conferidas: 0,
  corrigidas: [],
  desconhecidas: [],
  divergencias: [],
  falhas: [],
});

async function reconcileRow(
  db: DatabaseSync,
  provider: PaymentProvider,
  s: Row,
  now: number,
  report: ReconcileReport,
) {
  let p;
  try {
    p = await provider.fetchState(s.id);
  } catch (e) {
    report.falhas.push({ assinatura: s.id, erro: (e as Error).message });
    return;
  }
  report.conferidas++;
  if (!p) {
    report.desconhecidas.push(s.id);
    return;
  }
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
