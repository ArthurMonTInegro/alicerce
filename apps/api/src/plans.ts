/**
 * Plano de cada conta. A cobrança em si fica fora daqui: quando houver um
 * provedor de pagamento, o webhook dele chama setPlan com source = 'stripe' (ou
 * outro), exatamente como o script de administração faz hoje com 'admin'.
 * Nenhum dado de cartão passa por este servidor.
 */
import type { DatabaseSync } from 'node:sqlite';
import { effectivePlan, entitlements, type Entitlements, type PlanId } from '@alicerce/engine';

export function getEntitlements(db: DatabaseSync, userId: string, defaultTutorLimit: number, now = Date.now()): Entitlements {
  const row = db.prepare('SELECT plan, plan_expires_at FROM users WHERE id = ?').get(userId) as { plan: string; plan_expires_at: number | null } | undefined;
  const plan = effectivePlan(row?.plan, row?.plan_expires_at, now);
  return entitlements(plan, row?.plan_expires_at ?? null, defaultTutorLimit);
}

/** Muda o plano e registra a mudança (histórico para suporte, auditoria e métricas de churn). */
export function setPlan(db: DatabaseSync, userId: string, plan: PlanId, expiresAt: number | null, source: string, now = Date.now()) {
  db.exec('BEGIN');
  try {
    db.prepare('UPDATE users SET plan = ?, plan_expires_at = ? WHERE id = ?').run(plan, plan === 'free' ? null : expiresAt, userId);
    db.prepare('INSERT INTO plan_changes (user_id, plan, expires_at, source, at) VALUES (?, ?, ?, ?, ?)').run(userId, plan, expiresAt, source.slice(0, 40), now);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
