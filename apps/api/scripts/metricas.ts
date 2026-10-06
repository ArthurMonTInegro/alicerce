/**
 * Relatório de métricas de produto e aprendizagem.
 * Uso: node apps/api/scripts/metricas.ts [--json]
 */
import { sanitizeProgress } from '@alicerce/engine';
import { loadConfig } from '../src/config.ts';
import { openDb } from '../src/db.ts';
import { computeMetrics, type UserSnapshot } from '../src/metrics.ts';

const db = openDb(loadConfig().dbPath);
const rows = db
  .prepare('SELECT u.created_at, u.plan, u.plan_expires_at, p.data FROM users u LEFT JOIN progress p ON p.user_id = u.id')
  .all() as Array<{ created_at: number; plan: string; plan_expires_at: number | null; data: string | null }>;
const now = Date.now();
const users: UserSnapshot[] = rows.map((r) => {
  let progress = sanitizeProgress(null);
  try {
    if (r.data) progress = sanitizeProgress(JSON.parse(r.data));
  } catch {
    /* ignora documento corrompido */
  }
  const active = r.plan !== 'free' && (r.plan_expires_at == null || r.plan_expires_at > now);
  return { createdAt: r.created_at, plan: active ? r.plan : 'free', progress };
});
const m = computeMetrics(users, now);
const tutor = db.prepare('SELECT COALESCE(SUM(count), 0) AS n, COUNT(DISTINCT user_id) AS u FROM tutor_usage WHERE day >= ?').get(new Date(now - 30 * 86_400_000).toISOString().slice(0, 10)) as { n: number; u: number };

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ ...m, tutor30d: tutor }, null, 2));
} else {
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  const of = (n: number) => `${n} (${pct(m.users.total ? n / m.users.total : 0)})`;
  console.log(`Alicerce · métricas em ${new Date(now).toISOString().slice(0, 16)}Z\n`);
  console.log(`Contas: ${m.users.total} (novas: ${m.users.new7d} em 7 dias, ${m.users.new30d} em 30) · premium: ${of(m.users.premium)}`);
  const r = m.retainedLearning;
  console.log(`Aprendizado que dura (métrica principal): ${pct(r.rate)} das ${r.eligible} contas que começaram há 30+ dias lembraram algo depois de 30 dias · cartões revistos após 30 dias: ${r.cardChecks}, lembrados ${pct(r.cardRecallRate)}`);
  console.log(`Ativos: ${m.active.dau} hoje · ${m.active.wau} em 7 dias · ${m.active.mau} em 30 dias`);
  for (const [k, r] of Object.entries(m.retention)) console.log(`Retenção ${k.toUpperCase()}: ${pct(r.rate)} (${r.eligible} contas elegíveis)`);
  console.log(`Funil: alguma atividade ${of(m.funnel.anyActivity)} → 1ª lição ${of(m.funnel.firstLesson)} → 5 lições ${of(m.funnel.fiveLessons)}; diagnóstico ${of(m.funnel.diagnostic)}; revisão ${of(m.funnel.reviews)}`);
  console.log(`Aprendizagem: ${m.learning.attempts} tentativas, ${pct(m.learning.solveRate)} corretas; ${m.learning.lessonsCompleted} lições concluídas; ${m.learning.reviewsLast30d} revisões em 30 dias`);
  console.log(`Tutor com IA (30 dias): ${tutor.n} perguntas de ${tutor.u} contas`);
  if (m.hardestExercises.length) {
    console.log('\nExercícios mais difíceis (acerto de primeira mais baixo): revisar enunciado, dicas ou posição na trilha');
    for (const e of m.hardestExercises) console.log(`  ${e.exerciseId.padEnd(22)} ${String(e.users).padStart(5)} pessoas · de primeira ${pct(e.firstTry).padStart(6)} · revelaram ${pct(e.revealed)}`);
  }
  if (m.lessonDropOff.length) {
    console.log('\nLições com mais abandono (começaram e não concluíram):');
    for (const l of m.lessonDropOff) console.log(`  ${l.lessonId.padEnd(28)} ${l.completed}/${l.started} concluíram (${pct(l.rate)})`);
  }
}
