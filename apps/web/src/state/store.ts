/**
 * Estado do estudante, local-first.
 *
 * - Fonte da verdade no navegador (localStorage), funciona sem conta e offline.
 * - Com conta, cada mudança é enviada (com atraso, agrupada) para a API, que
 *   mescla com o que já tinha usando a mesma função `mergeProgress` do motor.
 * - Várias abas ficam em sincronia pelo evento `storage`.
 */
import { useSyncExternalStore } from 'react';
import {
  emptyProgress,
  mergeProgress,
  newCard,
  replayAttempts,
  review,
  sanitizeProgress,
  scoreFromOutcome,
  type AttemptRecord,
  type DiagnosticRecord,
  type Grade,
  type ProgressState,
  type SkillState,
} from '@alicerce/engine';
import { lessonById, modules, type Exercise } from '../content.ts';
import { api, type User } from './api.ts';

const KEY = 'alicerce:progresso:v1';
const SERVER_SNAPSHOT = emptyProgress();

let state: ProgressState = SERVER_SNAPSHOT;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = sanitizeProgress(JSON.parse(raw));
    else state = emptyProgress();
  } catch {
    state = emptyProgress();
  }
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY || !e.newValue) return;
    try {
      state = sanitizeProgress(JSON.parse(e.newValue));
      emit();
    } catch {
      /* ignora valor inválido de outra aba */
    }
  });
}

function emit() {
  derivedCache = null;
  for (const l of listeners) l();
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let unsaved = false;
function persist() {
  unsaved = false;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* armazenamento cheio ou bloqueado: o progresso continua na memória */
  }
  scheduleSync();
}

function update(fn: (draft: ProgressState) => ProgressState) {
  load();
  state = fn(state);
  emit();
  clearTimeout(saveTimer);
  unsaved = true;
  saveTimer = setTimeout(persist, 150);
}

/** Grava já o que ainda espera o atraso de 150 ms (fechar a aba ou trocar de app não perde a última ação). */
function flush() {
  if (!unsaved) return;
  clearTimeout(saveTimer);
  persist();
}

function subscribe(cb: () => void) {
  load();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  load();
  return state;
}

export function useProgress(): ProgressState {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);
}

export function getProgress(): ProgressState {
  load();
  return state;
}

/* ---------------- derivados (memorizados por versão do estado) ---------------- */

export interface Derived {
  completedLessons: Set<string>;
  completedModules: Set<string>;
  startedModules: Set<string>;
  testedOut: Set<string>;
  forced: Set<string>;
  solved: Set<string>;
  skills: Map<string, SkillState>;
}

let derivedCache: { for: ProgressState; value: Derived } | null = null;

export function derive(p: ProgressState): Derived {
  if (derivedCache?.for === p) return derivedCache.value;
  const completedLessons = new Set(Object.entries(p.lessons).filter(([, l]) => l.completedAt).map(([id]) => id));
  const completedModules = new Set<string>();
  const startedModules = new Set<string>();
  for (const m of modules) {
    const done = m.lessons.length > 0 ? m.lessons.every((l) => completedLessons.has(l.id)) : m.id in p.modulesDone;
    if (done || m.id in p.modulesDone) completedModules.add(m.id);
    if (m.lessons.some((l) => p.lessons[l.id])) startedModules.add(m.id);
  }
  for (const id of Object.keys(p.forced)) startedModules.add(id);
  const solved = new Set(p.attempts.filter((a) => a.correct).map((a) => a.exerciseId));
  const skills = replayAttempts(p.attempts.flatMap((a) => a.skills.map((skill) => ({ skill, score: a.score, difficulty: a.difficulty, at: a.at }))));
  const value: Derived = {
    completedLessons,
    completedModules,
    startedModules,
    testedOut: new Set(Object.keys(p.testedOut)),
    forced: new Set(Object.keys(p.forced)),
    solved,
    skills,
  };
  derivedCache = { for: p, value };
  return value;
}

export function useDerived(): Derived {
  return derive(useProgress());
}

/* ---------------- ações ---------------- */

export interface Outcome {
  correct: boolean;
  hintsUsed: number;
  wrongTries: number;
  revealed: boolean;
}

export function recordAttempt(ex: Exercise, o: Outcome) {
  const rec: AttemptRecord = {
    exerciseId: ex.id,
    skills: ex.skills,
    difficulty: ex.difficulty,
    correct: o.correct,
    score: scoreFromOutcome(o),
    hintsUsed: o.hintsUsed,
    wrongTries: o.wrongTries,
    revealed: o.revealed,
    at: Date.now(),
  };
  update((s) => ({ ...s, attempts: [...s.attempts, rec].slice(-5000) }));
}

export function visitStage(lessonId: string, stage: string) {
  const cur = getProgress().lessons[lessonId];
  if (cur?.visited.includes(stage)) return;
  update((s) => ({
    ...s,
    lessons: { ...s.lessons, [lessonId]: { ...(cur ?? { visited: [] }), visited: [...(cur?.visited ?? []), stage] } },
  }));
}

/** Conclui a lição e coloca seus cartões na fila de revisão espaçada. */
export function completeLesson(lessonId: string) {
  const lesson = lessonById.get(lessonId);
  const now = Date.now();
  update((s) => {
    const cards = { ...s.cards };
    for (const c of lesson?.cards ?? []) if (!cards[c.id]) cards[c.id] = newCard(now + 60 * 60_000); // primeira revisão em ~1h
    const cur = s.lessons[lessonId] ?? { visited: [] };
    return { ...s, cards, lessons: { ...s.lessons, [lessonId]: { ...cur, completedAt: cur.completedAt ?? now } } };
  });
}

export function setModuleDone(moduleId: string, done: boolean) {
  update((s) => {
    const modulesDone = { ...s.modulesDone };
    if (done) modulesDone[moduleId] = Date.now();
    else delete modulesDone[moduleId];
    return { ...s, modulesDone };
  });
}

export function forceUnlock(moduleId: string) {
  update((s) => ({ ...s, forced: { ...s.forced, [moduleId]: Date.now() } }));
}

export function setTestedOut(ids: string[]) {
  const now = Date.now();
  update((s) => ({ ...s, testedOut: Object.fromEntries(ids.map((id) => [id, s.testedOut[id] ?? now])) }));
}

export function reviewCard(cardId: string, grade: Grade) {
  const now = Date.now();
  update((s) => ({
    ...s,
    cards: { ...s.cards, [cardId]: review(s.cards[cardId] ?? newCard(now), grade, now) },
    reviews: [...s.reviews, { cardId, grade, at: now }].slice(-5000),
  }));
}

/** Adiciona os cartões de uma lição à revisão sem concluí-la (ex.: módulos dispensados). */
export function enrollCards(cardIds: string[]) {
  const now = Date.now();
  update((s) => {
    const cards = { ...s.cards };
    for (const id of cardIds) if (!cards[id]) cards[id] = newCard(now);
    return { ...s, cards };
  });
}

export function saveDiagnostic(d: DiagnosticRecord) {
  update((s) => ({ ...s, diagnostic: d }));
}

export function toggleMilestone(projectId: string, index: number) {
  update((s) => {
    const cur = s.projects[projectId]?.milestones ?? [];
    const milestones = cur.includes(index) ? cur.filter((i) => i !== index) : [...cur, index].sort((a, b) => a - b);
    return { ...s, projects: { ...s.projects, [projectId]: { milestones, updatedAt: Date.now() } } };
  });
}

export function saveInterview(id: string, hits: number[]) {
  update((s) => ({ ...s, interviews: { ...s.interviews, [id]: { hits, at: Date.now() } } }));
}

export function replaceProgress(p: ProgressState) {
  update(() => sanitizeProgress(p));
}

export function resetProgress() {
  update(() => emptyProgress());
}

/* ---------------- rascunhos de código (separados: não sincronizam) ---------------- */

const DRAFT = 'alicerce:rascunho:';
export function loadDraft(id: string): string | null {
  try {
    return localStorage.getItem(DRAFT + id);
  } catch {
    return null;
  }
}
export function saveDraft(id: string, code: string) {
  try {
    localStorage.setItem(DRAFT + id, code);
  } catch {
    /* sem espaço: ignora */
  }
}
export function clearDraft(id: string) {
  try {
    localStorage.removeItem(DRAFT + id);
  } catch {
    /* ignora */
  }
}

/* ---------------- conta e sincronização ---------------- */

type SyncStatus = 'offline' | 'idle' | 'syncing' | 'error';
let user: User | null = null;
let syncStatus: SyncStatus = 'offline';
const authListeners = new Set<() => void>();
let authSnapshot: { user: User | null; syncStatus: SyncStatus } = { user, syncStatus };
function emitAuth() {
  authSnapshot = { user, syncStatus };
  for (const l of authListeners) l();
}

export function useAuth() {
  return useSyncExternalStore(
    (cb) => {
      authListeners.add(cb);
      return () => authListeners.delete(cb);
    },
    () => authSnapshot,
    () => authSnapshot,
  );
}

let syncTimer: ReturnType<typeof setTimeout> | undefined;
function scheduleSync() {
  if (!user) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncNow, 1500);
}

export async function syncNow() {
  if (!user) return;
  syncStatus = 'syncing';
  emitAuth();
  try {
    const server = await api.putProgress(getProgress());
    const merged = mergeProgress(getProgress(), sanitizeProgress(server));
    state = merged;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignora */
    }
    emit();
    syncStatus = 'idle';
  } catch {
    syncStatus = 'error';
  }
  emitAuth();
}

export async function initAuth() {
  try {
    user = await api.me();
    syncStatus = user ? 'idle' : 'offline';
  } catch {
    user = null;
    syncStatus = 'offline';
  }
  emitAuth();
  if (user) await syncNow();
}

export async function signIn(kind: 'login' | 'register', email: string, password: string, name?: string) {
  user = kind === 'login' ? await api.login(email, password) : await api.register(email, password, name ?? '');
  emitAuth();
  await syncNow();
}

export async function signOut() {
  await api.logout().catch(() => undefined);
  user = null;
  syncStatus = 'offline';
  emitAuth();
}
