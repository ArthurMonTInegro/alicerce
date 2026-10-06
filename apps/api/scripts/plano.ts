/**
 * Administração de planos enquanto não há provedor de pagamento.
 * Uso: node apps/api/scripts/plano.ts <email> <free|premium> [dias]
 * Ex.: conceder 30 dias de premium a um testador, ou a uma turma parceira.
 */
import { isPlanId } from '@alicerce/engine';
import { loadConfig } from '../src/config.ts';
import { openDb } from '../src/db.ts';
import { getEntitlements, setPlan } from '../src/plans.ts';

const [email, plan, dias] = process.argv.slice(2);
if (!email || !isPlanId(plan)) {
  console.error('Uso: node apps/api/scripts/plano.ts <email> <free|premium> [dias]');
  process.exit(2);
}
const config = loadConfig();
const db = openDb(config.dbPath);
const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase()) as { id: string } | undefined;
if (!user) {
  console.error(`Nenhuma conta com o e-mail ${email}.`);
  process.exit(1);
}
const expires = dias ? Date.now() + Number(dias) * 86_400_000 : null;
setPlan(db, user.id, plan, expires, 'admin');
const e = getEntitlements(db, user.id, config.tutorDailyLimit);
console.log(`${email}: plano ${e.plan}${e.expiresAt ? ` até ${new Date(e.expiresAt).toISOString().slice(0, 10)}` : ''}; tutor com IA ${e.tutorDailyLimit}/dia.`);
