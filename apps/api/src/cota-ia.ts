/**
 * Reserva de uma chamada à IA do tutor (docs/ESTRATEGIA_ASSINATURA.md): confere o limite do dia
 * e do mês da conta e o teto do dia no Alicerce todo, e já soma a chamada, numa transação só.
 *
 * BEGIN IMMEDIATE pega a trava de escrita do banco antes de ler os totais. Num processo só, a
 * leitura e a soma já não se intercalavam (não há await entre elas); com dois processos no mesmo
 * arquivo (dois servidores, ou o servidor e um script), os dois podiam ler o mesmo total e passar
 * juntos do limite. Com a trava, o segundo espera o primeiro terminar (busy_timeout, db.ts).
 *
 * A reserva vem antes da chamada e não é devolvida se ela falhar: o provedor pode ter cobrado.
 * Pedir de novo depois de uma falha é uma chamada nova, que passa pela mesma reserva, e o cliente
 * do provedor não repete sozinho (ClaudeTutor usa maxRetries: 0): uma reserva, no máximo uma chamada.
 */
import type { DatabaseSync } from 'node:sqlite';

export type MotivoSemIa = 'daily_limit' | 'monthly_limit' | 'budget_limit';
export interface LimitesDaIa {
  /** chamadas por dia da conta (UTC) */
  diario: number;
  /** chamadas no mês da conta (UTC) */
  mensal: number;
  /** chamadas por dia no Alicerce todo (TUTOR_GLOBAL_DAILY_LIMIT) */
  global: number;
}

/** Reserva a chamada e devolve null, ou devolve o limite que impede (nada é somado). `dia` é AAAA-MM-DD. */
export function reservarChamadaDaIa(db: DatabaseSync, userId: string, dia: string, limites: LimitesDaIa): MotivoSemIa | null {
  db.exec('BEGIN IMMEDIATE');
  try {
    const hoje = (db.prepare('SELECT count FROM tutor_usage WHERE user_id = ? AND day = ?').get(userId, dia) as { count: number } | undefined)?.count ?? 0;
    const mes = (db.prepare('SELECT COALESCE(SUM(count), 0) AS total FROM tutor_usage WHERE user_id = ? AND day LIKE ?').get(userId, `${dia.slice(0, 7)}%`) as { total: number }).total;
    const global = (db.prepare('SELECT calls FROM tutor_ai_daily WHERE day = ?').get(dia) as { calls: number } | undefined)?.calls ?? 0;
    const motivo: MotivoSemIa | null = mes >= limites.mensal ? 'monthly_limit' : hoje >= limites.diario ? 'daily_limit' : global >= limites.global ? 'budget_limit' : null;
    if (!motivo) {
      db.prepare('INSERT INTO tutor_usage (user_id, day, count) VALUES (?, ?, 1) ON CONFLICT(user_id, day) DO UPDATE SET count = count + 1').run(userId, dia);
      db.prepare('INSERT INTO tutor_ai_daily (day, calls) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET calls = calls + 1').run(dia);
    }
    db.exec('COMMIT');
    return motivo;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
