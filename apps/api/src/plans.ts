/**
 * Plano de cada conta, calculado sempre pela mesma regra (docs/PAGAMENTO.md, "Acesso efetivo"):
 *
 * - cada assinatura paga ('ativa' ou 'cancelada') dá Premium até paid_until; reembolsada não dá nada;
 * - cada concessão manual (access_grants: script de administração, testes, Premium legado) dá Premium
 *   até expires_at (null = sem fim), enquanto não for revogada;
 * - a conta é Premium enquanto algum desses direitos vale, até o fim do que vai mais longe.
 *
 * Um evento muda um direito só (o reembolso de uma assinatura não mexe em outra nem numa concessão),
 * e o plano é recalculado depois, na mesma transação. users.plan / plan_expires_at é uma cópia do
 * resultado, para scripts e para o código anterior a esta regra; plan_changes guarda o histórico da cópia.
 * Nenhum dado de cartão passa por este servidor.
 */
import type { DatabaseSync } from 'node:sqlite';
import { entitlements, type Entitlements, type PlanId } from '@alicerce/engine';

export interface AccessRight {
  kind: 'assinatura' | 'concessao';
  id: string;
  /** provedor da assinatura, ou origem da concessão ('admin', 'legado:...') */
  source: string;
  /** situação da assinatura, ou 'ativa' / 'revogada' da concessão */
  status: string;
  /** até quando vale; null = sem fim */
  until: number | null;
  /** vale agora? */
  valid: boolean;
}

/** Todos os direitos da conta, valendo ou não (para conferir uma divergência: scripts/acesso.ts). */
export function accessRights(db: DatabaseSync, userId: string, now = Date.now()): AccessRight[] {
  const subs = db
    .prepare('SELECT id, provider, status, paid_until FROM subscriptions WHERE user_id = ? ORDER BY created_at, rowid')
    .all(userId) as Array<{ id: string; provider: string; status: string; paid_until: number | null }>;
  const grants = db
    .prepare('SELECT id, plan, source, starts_at, expires_at, revoked_at FROM access_grants WHERE user_id = ? ORDER BY id')
    .all(userId) as Array<{ id: number; plan: string; source: string; starts_at: number; expires_at: number | null; revoked_at: number | null }>;
  return [
    ...subs.map((s) => ({
      kind: 'assinatura' as const,
      id: s.id,
      source: s.provider,
      status: s.status,
      until: s.paid_until,
      valid: (s.status === 'ativa' || s.status === 'cancelada') && s.paid_until !== null && s.paid_until > now,
    })),
    ...grants.map((g) => ({
      kind: 'concessao' as const,
      id: String(g.id),
      source: g.source,
      status: g.revoked_at === null ? 'ativa' : 'revogada',
      until: g.expires_at,
      valid: g.plan === 'premium' && g.revoked_at === null && g.starts_at <= now && (g.expires_at === null || g.expires_at > now),
    })),
  ];
}

/** O plano que vale agora, pela regra do topo do arquivo. */
export function computeAccess(db: DatabaseSync, userId: string, now = Date.now()): { plan: PlanId; expiresAt: number | null } {
  const valid = accessRights(db, userId, now).filter((r) => r.valid);
  if (valid.length === 0) return { plan: 'free', expiresAt: null };
  if (valid.some((r) => r.until === null)) return { plan: 'premium', expiresAt: null };
  return { plan: 'premium', expiresAt: Math.max(...valid.map((r) => r.until!)) };
}

export function getEntitlements(db: DatabaseSync, userId: string, defaultTutorLimit: number, now = Date.now()): Entitlements {
  const a = computeAccess(db, userId, now);
  return entitlements(a.plan, a.expiresAt, defaultTutorLimit);
}

/**
 * Recalcula o plano e, se mudou, atualiza a cópia em users e registra em plan_changes.
 * Chamar dentro da transação que mudou o direito, para os dois ficarem juntos ou nenhum.
 */
export function recomputeAccess(db: DatabaseSync, userId: string, source: string, now = Date.now()) {
  const a = computeAccess(db, userId, now);
  const cur = db.prepare('SELECT plan, plan_expires_at FROM users WHERE id = ?').get(userId) as { plan: string; plan_expires_at: number | null } | undefined;
  if (cur && (cur.plan !== a.plan || cur.plan_expires_at !== a.expiresAt)) {
    db.prepare('UPDATE users SET plan = ?, plan_expires_at = ? WHERE id = ?').run(a.plan, a.expiresAt, userId);
    db.prepare('INSERT INTO plan_changes (user_id, plan, expires_at, source, at) VALUES (?, ?, ?, ?, ?)').run(userId, a.plan, a.expiresAt, source.slice(0, 40), now);
  }
  return a;
}

/**
 * Concessão manual (script de administração, testes): substitui a concessão manual anterior da
 * conta, se houver; 'free' só revoga. Não mexe em assinatura paga: quem pagou continua Premium até
 * o fim do que pagou (tirar esse acesso é reembolso, no provedor).
 */
export function setPlan(db: DatabaseSync, userId: string, plan: PlanId, expiresAt: number | null, source: string, now = Date.now()) {
  db.exec('BEGIN');
  try {
    db.prepare('UPDATE access_grants SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL').run(now, userId);
    if (plan !== 'free')
      db.prepare('INSERT INTO access_grants (user_id, plan, source, starts_at, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
        userId,
        plan,
        source.slice(0, 40),
        now,
        expiresAt,
        now,
      );
    const a = recomputeAccess(db, userId, source, now);
    db.exec('COMMIT');
    return a;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
