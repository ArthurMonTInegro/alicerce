/**
 * Confere o acesso das contas: a cópia do plano em users contra os direitos de cada uma
 * (assinaturas pagas e concessões manuais). O servidor decide pelos direitos (plans.ts,
 * computeAccess); a cópia serve aos scripts e ao código anterior à migração 6.
 *
 * Uso:
 *   node apps/api/scripts/acesso.ts             lista as contas em que a cópia diverge dos direitos (sai com 1 se houver)
 *   node apps/api/scripts/acesso.ts <email>     direitos, histórico do plano e últimos eventos de pagamento de uma conta
 *   node apps/api/scripts/acesso.ts --corrigir  reescreve a cópia das contas divergentes pelos direitos ('conferencia' em plan_changes)
 *
 * Roteiro para investigar "paguei e não tenho acesso" ou "tenho acesso sem pagar": docs/PAGAMENTO.md.
 */
import { effectivePlan } from '@alicerce/engine';
import { loadConfig } from '../src/config.ts';
import { openDb } from '../src/db.ts';
import { accessRights, computeAccess, recomputeAccess } from '../src/plans.ts';

const quando = (t: number | null, semFim = '—') => (t === null ? semFim : `${new Date(t).toISOString().slice(0, 16).replace('T', ' ')} UTC`);
const plano = (p: { plan: string; expiresAt: number | null }) => (p.plan === 'free' ? 'free' : `premium ${p.expiresAt === null ? 'sem fim' : `até ${quando(p.expiresAt)}`}`);

const arg = process.argv[2];
const config = loadConfig();
const db = openDb(config.dbPath);
const now = Date.now();

if (arg && arg !== '--corrigir') {
  const u = db.prepare('SELECT id, email, plan, plan_expires_at FROM users WHERE email = ?').get(arg.trim().toLowerCase()) as
    | { id: string; email: string; plan: string; plan_expires_at: number | null }
    | undefined;
  if (!u) {
    console.error(`Nenhuma conta com o e-mail ${arg}.`);
    process.exit(1);
  }
  console.log(`Conta ${u.email} (${u.id})`);
  console.log('Direitos:');
  const rights = accessRights(db, u.id, now);
  if (rights.length === 0) console.log('  nenhum');
  for (const r of rights)
    console.log(`  ${r.kind === 'assinatura' ? 'assinatura' : 'concessão'} ${r.id} (${r.source}): ${r.status}, até ${quando(r.until, r.kind === 'assinatura' ? '—' : 'sem fim')}${r.valid ? ' (vale agora)' : ''}`);
  console.log(`Plano pelos direitos: ${plano(computeAccess(db, u.id, now))}`);
  console.log(`Cópia em users: ${plano({ plan: effectivePlan(u.plan, u.plan_expires_at, now), expiresAt: u.plan_expires_at })}`);
  console.log('Últimas mudanças do plano:');
  for (const c of db.prepare('SELECT plan, expires_at, source, at FROM plan_changes WHERE user_id = ? ORDER BY id DESC LIMIT 10').all(u.id) as Array<{
    plan: string;
    expires_at: number | null;
    source: string;
    at: number;
  }>)
    console.log(`  ${quando(c.at)}  ${plano({ plan: c.plan, expiresAt: c.expires_at })}  (${c.source})`);
  console.log('Últimos eventos de pagamento das assinaturas da conta:');
  for (const e of db
    .prepare('SELECT e.id, e.type, e.subscription_id, e.received_at FROM payment_events e JOIN subscriptions s ON s.id = e.subscription_id WHERE s.user_id = ? ORDER BY e.received_at DESC, e.rowid DESC LIMIT 10')
    .all(u.id) as Array<{ id: string; type: string; subscription_id: string; received_at: number }>)
    console.log(`  ${quando(e.received_at)}  ${e.type}  ${e.subscription_id}  (evento ${e.id})`);
  process.exit(0);
}

const divergentes: Array<{ id: string; email: string; copia: string; direitos: string }> = [];
for (const u of db.prepare('SELECT id, email, plan, plan_expires_at FROM users ORDER BY email').all() as Array<{
  id: string;
  email: string;
  plan: string;
  plan_expires_at: number | null;
}>) {
  const copia = { plan: effectivePlan(u.plan, u.plan_expires_at, now), expiresAt: u.plan_expires_at };
  const direitos = computeAccess(db, u.id, now);
  if (copia.plan !== direitos.plan || (direitos.plan === 'premium' && copia.expiresAt !== direitos.expiresAt))
    divergentes.push({ id: u.id, email: u.email, copia: plano(copia), direitos: plano(direitos) });
}

if (arg === '--corrigir') {
  for (const d of divergentes) {
    db.exec('BEGIN IMMEDIATE');
    try {
      recomputeAccess(db, d.id, 'conferencia', now);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    console.log(`${d.email}: era ${d.copia}, agora ${d.direitos}`);
  }
  console.log(`${divergentes.length} ${divergentes.length === 1 ? 'conta corrigida' : 'contas corrigidas'}.`);
  process.exit(0);
}

for (const d of divergentes) console.log(`${d.email}: cópia ${d.copia}, direitos ${d.direitos}`);
console.log(divergentes.length === 0 ? 'Nenhuma divergência.' : `${divergentes.length} ${divergentes.length === 1 ? 'conta com divergência' : 'contas com divergência'}.`);
process.exit(divergentes.length === 0 ? 0 : 1);
