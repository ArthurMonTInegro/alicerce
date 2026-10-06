/**
 * Métricas de produto e de aprendizagem calculadas a partir do que o servidor
 * já guarda (contas, progresso sincronizado, uso do tutor, planos). Não há
 * rastreamento extra de comportamento: só contas que sincronizam entram aqui,
 * e nada identifica a pessoa no relatório.
 */
import type { ProgressState } from '@alicerce/engine';

const DAY = 86_400_000;

export interface UserSnapshot {
  createdAt: number;
  plan: string;
  progress: ProgressState;
}

export interface ExerciseStat {
  exerciseId: string;
  users: number;
  /** fração de pessoas que acertaram na primeira tentativa, sem dica */
  firstTry: number;
  /** fração de pessoas que revelaram a solução */
  revealed: number;
}

export interface Metrics {
  generatedAt: number;
  users: { total: number; new7d: number; new30d: number; premium: number };
  active: { dau: number; wau: number; mau: number };
  /** % de contas com atividade em ou depois de N dias após o cadastro (só contas com idade suficiente) */
  retention: Record<'d1' | 'd7' | 'd30', { eligible: number; rate: number }>;
  funnel: { anyActivity: number; firstLesson: number; fiveLessons: number; diagnostic: number; reviews: number };
  learning: { attempts: number; solveRate: number; reviewsLast30d: number; lessonsCompleted: number };
  hardestExercises: ExerciseStat[];
  lessonDropOff: Array<{ lessonId: string; started: number; completed: number; rate: number }>;
}

const activityTimes = (p: ProgressState) => [...p.attempts.map((a) => a.at), ...p.reviews.map((r) => r.at)];

export function computeMetrics(users: UserSnapshot[], now = Date.now(), minUsers = 5): Metrics {
  const lastActive = users.map((u) => Math.max(0, ...activityTimes(u.progress)));
  const activeWithin = (days: number) => lastActive.filter((t) => t > now - days * DAY).length;

  const retention = (days: number) => {
    const eligible = users.filter((u) => u.createdAt <= now - days * DAY);
    const kept = eligible.filter((u) => activityTimes(u.progress).some((t) => t >= u.createdAt + days * DAY));
    return { eligible: eligible.length, rate: eligible.length ? kept.length / eligible.length : 0 };
  };

  const lessonsDone = (p: ProgressState) => Object.values(p.lessons).filter((l) => l.completedAt).length;

  const ex = new Map<string, { users: number; firstTry: number; revealed: number }>();
  let attempts = 0;
  let correct = 0;
  for (const u of users) {
    const first = new Map<string, { clean: boolean }>();
    const revealed = new Set<string>();
    for (const a of [...u.progress.attempts].sort((x, y) => x.at - y.at)) {
      attempts++;
      if (a.correct) correct++;
      if (a.revealed) revealed.add(a.exerciseId);
      if (!first.has(a.exerciseId)) first.set(a.exerciseId, { clean: a.correct && !a.revealed && a.hintsUsed === 0 && a.wrongTries === 0 });
    }
    for (const [id, f] of first) {
      const s = ex.get(id) ?? { users: 0, firstTry: 0, revealed: 0 };
      s.users++;
      if (f.clean) s.firstTry++;
      if (revealed.has(id)) s.revealed++;
      ex.set(id, s);
    }
  }
  const hardest = [...ex.entries()]
    .filter(([, s]) => s.users >= minUsers)
    .map(([exerciseId, s]) => ({ exerciseId, users: s.users, firstTry: s.firstTry / s.users, revealed: s.revealed / s.users }))
    .sort((a, b) => a.firstTry - b.firstTry || b.revealed - a.revealed)
    .slice(0, 15);

  const lessons = new Map<string, { started: number; completed: number }>();
  for (const u of users)
    for (const [id, l] of Object.entries(u.progress.lessons)) {
      const s = lessons.get(id) ?? { started: 0, completed: 0 };
      s.started++;
      if (l.completedAt) s.completed++;
      lessons.set(id, s);
    }
  const dropOff = [...lessons.entries()]
    .filter(([, s]) => s.started >= minUsers)
    .map(([lessonId, s]) => ({ lessonId, ...s, rate: s.completed / s.started }))
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 15);

  return {
    generatedAt: now,
    users: {
      total: users.length,
      new7d: users.filter((u) => u.createdAt > now - 7 * DAY).length,
      new30d: users.filter((u) => u.createdAt > now - 30 * DAY).length,
      premium: users.filter((u) => u.plan === 'premium').length,
    },
    active: { dau: activeWithin(1), wau: activeWithin(7), mau: activeWithin(30) },
    retention: { d1: retention(1), d7: retention(7), d30: retention(30) },
    funnel: {
      anyActivity: users.filter((u) => activityTimes(u.progress).length > 0).length,
      firstLesson: users.filter((u) => lessonsDone(u.progress) >= 1).length,
      fiveLessons: users.filter((u) => lessonsDone(u.progress) >= 5).length,
      diagnostic: users.filter((u) => u.progress.diagnostic).length,
      reviews: users.filter((u) => u.progress.reviews.length > 0).length,
    },
    learning: {
      attempts,
      solveRate: attempts ? correct / attempts : 0,
      reviewsLast30d: users.reduce((n, u) => n + u.progress.reviews.filter((r) => r.at > now - 30 * DAY).length, 0),
      lessonsCompleted: users.reduce((n, u) => n + lessonsDone(u.progress), 0),
    },
    hardestExercises: hardest,
    lessonDropOff: dropOff,
  };
}
