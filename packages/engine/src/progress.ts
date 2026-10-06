/**
 * Modelo de progresso do estudante e a mesclagem entre dispositivos.
 *
 * O app é "local-first": tudo funciona sem conta, salvo no navegador. Ao
 * entrar na conta, o estado local e o do servidor são mesclados por esta
 * função, que é determinística, comutativa e idempotente (merge(a, b) ==
 * merge(b, a) e merge(a, a) == a). Assim não há "conflito" para o usuário
 * resolver, e a mesma função roda no navegador e na API.
 */
import type { CardState } from './fsrs.ts';
import type { Difficulty } from './mastery.ts';
import type { AreaResult, DiagnosticAnswer } from './diagnostic.ts';

export interface AttemptRecord {
  exerciseId: string;
  skills: string[];
  difficulty: Difficulty;
  correct: boolean;
  /** 0..1, ver scoreFromOutcome */
  score: number;
  hintsUsed: number;
  wrongTries: number;
  revealed: boolean;
  at: number;
}

export interface ReviewRecord {
  cardId: string;
  grade: 1 | 2 | 3 | 4;
  at: number;
}

export interface LessonProgress {
  visited: string[];
  completedAt?: number;
}

export interface DiagnosticRecord {
  answers: DiagnosticAnswer[];
  results: AreaResult[];
  at: number;
}

export interface ProjectProgress {
  milestones: number[]; // índices concluídos
  updatedAt: number;
}

export interface ProgressState {
  version: 1;
  attempts: AttemptRecord[];
  lessons: Record<string, LessonProgress>;
  /** módulos marcados como concluídos manualmente (módulos-roteiro sem lições) */
  modulesDone: Record<string, number>;
  /** módulos desbloqueados pelo estudante apesar de pré-requisitos pendentes */
  forced: Record<string, number>;
  testedOut: Record<string, number>;
  cards: Record<string, CardState>;
  reviews: ReviewRecord[];
  diagnostic?: DiagnosticRecord;
  projects: Record<string, ProjectProgress>;
  interviews: Record<string, { hits: number[]; at: number }>;
}

export const MAX_ATTEMPTS = 5000;
export const MAX_REVIEWS = 5000;

export function emptyProgress(): ProgressState {
  return { version: 1, attempts: [], lessons: {}, modulesDone: {}, forced: {}, testedOut: {}, cards: {}, reviews: [], projects: {}, interviews: {} };
}

const attemptKey = (a: AttemptRecord) => `${a.exerciseId}@${a.at}`;
const reviewKey = (r: ReviewRecord) => `${r.cardId}@${r.at}`;

function unionBy<T>(a: T[], b: T[], key: (x: T) => string, max: number, at: (x: T) => number): T[] {
  const m = new Map<string, T>();
  for (const x of a) m.set(key(x), x);
  for (const x of b) if (!m.has(key(x))) m.set(key(x), x);
  return [...m.values()].sort((x, y) => at(x) - at(y) || (key(x) < key(y) ? -1 : 1)).slice(-max);
}

function minRecord(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = k in out ? Math.min(out[k]!, v) : v;
  return out;
}

function pickLatest<T>(a: Record<string, T>, b: Record<string, T>, at: (x: T) => number, tie: (x: T, y: T) => T): Record<string, T> {
  const out: Record<string, T> = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const cur = out[k];
    if (cur === undefined) out[k] = v;
    else if (at(v) > at(cur)) out[k] = v;
    else if (at(v) === at(cur)) out[k] = tie(cur, v);
  }
  return out;
}

const stable = (x: unknown) => JSON.stringify(x);
const tieByJson = <T>(x: T, y: T): T => (stable(x) <= stable(y) ? x : y);

export function mergeProgress(a: ProgressState, b: ProgressState): ProgressState {
  const lessons: Record<string, LessonProgress> = {};
  for (const id of new Set([...Object.keys(a.lessons), ...Object.keys(b.lessons)])) {
    const x = a.lessons[id];
    const y = b.lessons[id];
    const visited = [...new Set([...(x?.visited ?? []), ...(y?.visited ?? [])])].sort();
    const done = [x?.completedAt, y?.completedAt].filter((v): v is number => v !== undefined);
    lessons[id] = done.length ? { visited, completedAt: Math.min(...done) } : { visited };
  }
  const diag = [a.diagnostic, b.diagnostic].filter((d): d is DiagnosticRecord => !!d).sort((x, y) => y.at - x.at || (stable(x) < stable(y) ? -1 : 1))[0];
  const merged: ProgressState = {
    version: 1,
    attempts: unionBy(a.attempts, b.attempts, attemptKey, MAX_ATTEMPTS, (x) => x.at),
    lessons,
    modulesDone: minRecord(a.modulesDone, b.modulesDone),
    forced: minRecord(a.forced, b.forced),
    testedOut: minRecord(a.testedOut, b.testedOut),
    cards: pickLatest(a.cards, b.cards, (c) => c.lastReview, tieByJson),
    reviews: unionBy(a.reviews, b.reviews, reviewKey, MAX_REVIEWS, (x) => x.at),
    projects: pickLatest(a.projects, b.projects, (p) => p.updatedAt, tieByJson),
    interviews: pickLatest(a.interviews, b.interviews, (p) => p.at, tieByJson),
  };
  if (diag) merged.diagnostic = diag;
  return merged;
}

const MAX_KEYS = 5000;
const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const str = (v: unknown, max = 120): v is string => typeof v === 'string' && v.length > 0 && v.length <= max;
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const DIFFS = ['facil', 'intermediario', 'avancado', 'desafio'];

/** Entradas de um objeto vindo de fora: só chaves curtas e seguras, com limite de quantidade. */
function entries<T>(v: unknown): Array<[string, T]> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return [];
  return (Object.entries(v) as Array<[string, T]>).filter(([k]) => str(k) && !BAD_KEYS.has(k)).slice(0, MAX_KEYS);
}

/**
 * Valida e normaliza um objeto vindo de fora (localStorage antigo, arquivo
 * importado, rede). Copia só os campos conhecidos, com tipos e tamanhos
 * conferidos: um cliente malicioso não consegue guardar lixo nem chaves como
 * __proto__ no servidor.
 */
export function sanitizeProgress(raw: unknown): ProgressState {
  const base = emptyProgress();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Record<string, unknown>;
  const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
  const strings = (v: unknown, max = 50) => arr(v).filter((x): x is string => str(x)).slice(0, max);
  const nums = (v: unknown, max = 50) => arr(v).filter(num).slice(0, max);
  const numRecord = (v: unknown) => Object.fromEntries(entries<unknown>(v).filter(([, x]) => num(x))) as Record<string, number>;

  const attempts: AttemptRecord[] = [];
  for (const x of arr(r.attempts).slice(-MAX_ATTEMPTS)) {
    const a = x as Record<string, unknown>;
    if (!a || !str(a.exerciseId) || !num(a.at) || !num(a.score)) continue;
    attempts.push({
      exerciseId: a.exerciseId,
      skills: strings(a.skills, 10),
      difficulty: (DIFFS.includes(a.difficulty as string) ? a.difficulty : 'facil') as AttemptRecord['difficulty'],
      correct: a.correct === true,
      score: Math.max(0, Math.min(1, a.score)),
      hintsUsed: num(a.hintsUsed) ? a.hintsUsed : 0,
      wrongTries: num(a.wrongTries) ? a.wrongTries : 0,
      revealed: a.revealed === true,
      at: a.at,
    });
  }
  const reviews: ReviewRecord[] = [];
  for (const x of arr(r.reviews).slice(-MAX_REVIEWS)) {
    const v = x as Record<string, unknown>;
    if (v && str(v.cardId) && num(v.at) && [1, 2, 3, 4].includes(v.grade as number)) reviews.push({ cardId: v.cardId, grade: v.grade as ReviewRecord['grade'], at: v.at });
  }
  const out: ProgressState = {
    version: 1,
    attempts,
    lessons: Object.fromEntries(
      entries<Record<string, unknown>>(r.lessons).map(([k, v]) => [k, { visited: strings(v?.visited, 20), ...(num(v?.completedAt) ? { completedAt: v.completedAt } : {}) }]),
    ),
    modulesDone: numRecord(r.modulesDone),
    forced: numRecord(r.forced),
    testedOut: numRecord(r.testedOut),
    cards: Object.fromEntries(
      entries<Record<string, unknown>>(r.cards)
        .filter(([, c]) => c && num(c.stability) && num(c.difficulty) && num(c.due) && num(c.lastReview))
        .map(([k, c]) => [k, { reps: 0, lapses: 0, ...pickNums(c, ['stability', 'difficulty', 'due', 'lastReview', 'reps', 'lapses']) } as unknown as CardState]),
    ),
    reviews,
    projects: Object.fromEntries(
      entries<Record<string, unknown>>(r.projects)
        .filter(([, p]) => p && Array.isArray(p.milestones) && num(p.updatedAt))
        .map(([k, p]) => [k, { milestones: nums(p.milestones), updatedAt: p.updatedAt as number }]),
    ),
    interviews: Object.fromEntries(
      entries<Record<string, unknown>>(r.interviews)
        .filter(([, p]) => p && Array.isArray(p.hits) && num(p.at))
        .map(([k, p]) => [k, { hits: nums(p.hits), at: p.at as number }]),
    ),
  };
  const d = r.diagnostic as Record<string, unknown> | undefined;
  if (d && Array.isArray(d.answers) && Array.isArray(d.results) && num(d.at) && JSON.stringify(d).length < 20_000) out.diagnostic = d as unknown as DiagnosticRecord;
  return out;
}

function pickNums(o: Record<string, unknown>, keys: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of keys) if (num(o[k])) out[k] = o[k];
  return out;
}

/** Dias (no fuso local informado por offset) em que houve estudo, para a sequência e o mapa de atividade. */
export function activityByDay(p: ProgressState, tzOffsetMin = 0): Map<string, number> {
  const m = new Map<string, number>();
  const day = (t: number) => new Date(t - tzOffsetMin * 60_000).toISOString().slice(0, 10);
  for (const a of p.attempts) m.set(day(a.at), (m.get(day(a.at)) ?? 0) + 1);
  for (const r of p.reviews) m.set(day(r.at), (m.get(day(r.at)) ?? 0) + 1);
  return m;
}

/** Sequência de dias seguidos com estudo, terminando hoje ou ontem (não pune quem ainda não estudou hoje). */
export function streak(activity: Map<string, number>, now: number, tzOffsetMin = 0): number {
  const DAY = 86_400_000;
  const key = (t: number) => new Date(t - tzOffsetMin * 60_000).toISOString().slice(0, 10);
  let t = now;
  if (!activity.has(key(t))) t -= DAY;
  let n = 0;
  while (activity.has(key(t))) {
    n++;
    t -= DAY;
  }
  return n;
}
