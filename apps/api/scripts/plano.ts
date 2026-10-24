/**
 * Concessão manual de Premium (testadores, turma parceira, suporte).
 * Uso: node apps/api/scripts/plano.ts <email> <free|premium> [dias] [--piloto]
 * Ex.: conceder 30 dias de premium a um testador; 'free' revoga a concessão.
 * --piloto: acesso temporário de participante do piloto (docs/PILOTO.md, "Acesso durante o piloto"):
 * exige de 1 a 60 dias e fica registrado com a origem 'piloto', separado das cortesias ('admin').
 *
 * Mexe só na concessão manual da conta (access_grants): a nova substitui a anterior.
 * Assinatura paga não muda por aqui; quem pagou continua Premium até o fim do que pagou.
 */
import { isPlanId } from '@alicerce/engine';
import { loadConfig } from '../src/config.ts';
import { openDb } from '../src/db.ts';
import { accessRights, getEntitlements, setPlan } from '../src/plans.ts';

const args = process.argv.slice(2);
const piloto = args.includes('--piloto');
const [email, plan, dias] = args.filter((a) => a !== '--piloto');
const USO = 'Uso: node apps/api/scripts/plano.ts <email> <free|premium> [dias] [--piloto]';
if (!email || !isPlanId(plan) || (dias !== undefined && !(Number(dias) > 0))) {
  console.error(USO);
  process.exit(2);
}
// o acesso do piloto é sempre temporário e com prazo curto: sem fim, viraria cortesia sem que ninguém decidisse
if (piloto && (plan !== 'premium' || !(Number(dias) >= 1 && Number(dias) <= 60))) {
  console.error(`${USO}\n--piloto só concede premium, com 1 a 60 dias.`);
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
setPlan(db, user.id, plan, expires, piloto ? 'piloto' : 'admin');
const e = getEntitlements(db, user.id, config.tutorDailyLimit);
console.log(`${email}: plano ${e.plan}${e.expiresAt ? ` até ${new Date(e.expiresAt).toISOString().slice(0, 10)}` : ''}; tutor com IA ${e.tutorDailyLimit}/dia.`);
if (piloto) console.log('Acesso de piloto: temporário, registrado com a origem "piloto"; não é assinatura nem desconto e não muda o acesso de mais ninguém.');
const pagas = accessRights(db, user.id).filter((r) => r.kind === 'assinatura' && r.valid);
if (pagas.length) console.log(`Assinatura paga em vigor (${pagas.map((r) => r.id).join(', ')}): ela continua valendo; este script não a altera.`);
