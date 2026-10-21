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
import { cardIds, lessonById, modules, type Exercise } from '../content.ts';
import { api, ApiError, type User } from './api.ts';
import { STATIC_SITE } from '../lib/base.ts';

const LEGACY_KEY = 'alicerce:progresso:v1';
let scope = 'guest';
const key = () => `alicerce:progresso:v2:${scope}`;
let generation = 0;
const AUTH_CHANGE = 'alicerce:auth-change';
// Saída que o servidor ainda não confirmou. Fica gravada para que recarregar a página ou abrir
// outra aba não traga a conta de volta: o site tenta sair de novo em vez de entrar com ela.
const LOGOUT_PENDING = 'alicerce:saida-pendente';
type LocalSave = 'saved' | 'pending' | 'error';
let localSave: LocalSave = 'saved';
let lastSync: number | null = null;
let logoutPending = false;
const SERVER_SNAPSHOT = emptyProgress();

let state: ProgressState = SERVER_SNAPSHOT;
let loaded = false;
const listeners = new Set<() => void>();
const pendingDrafts = new Map<string,string>();

function load() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  try {
    const raw = localStorage.getItem(key()) ?? (scope === 'guest' ? localStorage.getItem(LEGACY_KEY) : null);
    if (raw) state = sanitizeProgress(JSON.parse(raw));
    else state = emptyProgress();
  } catch {
    state = emptyProgress();
  }
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());
  window.addEventListener('storage', (e) => {
    if(e.key === AUTH_CHANGE){switchUser(null);void initAuth();return;}
    if(e.key === LOGOUT_PENDING){if(e.newValue!==null){logoutPending=true;switchUser(null);}else{logoutPending=false;emitAuth();}return;}
    if (e.key !== key() || !e.newValue) return;
    try {
      state = mergeProgress(state, sanitizeProgress(JSON.parse(e.newValue)));
      emit();
    } catch {
      /* ignora valor inválido de outra aba */
    }
  });
  window.addEventListener('online', () => { if(unsaved) persist(); if(logoutPending) void signOut().catch(()=>{}); else void syncNow(); });
}

function emit() {
  derivedCache = null;
  for (const l of listeners) l();
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let unsaved = false;
function persist() {
  try {
    localStorage.setItem(key(), JSON.stringify(state));
    for(const [draftKey,code] of pendingDrafts){localStorage.setItem(draftKey,code);pendingDrafts.delete(draftKey);}
    unsaved = false;
    localSave = 'saved';
  } catch {
    unsaved = true;
    localSave = 'error';
  }
  emitAuth();
  scheduleSync();
}

function update(fn: (draft: ProgressState) => ProgressState) {
  load();
  state = fn(state);
  emit();
  clearTimeout(saveTimer);
  unsaved = true;
  localSave = 'pending';
  emitAuth();
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
  id?: string;
  durationMs?: number;
  correct: boolean;
  hintsUsed: number;
  wrongTries: number;
  revealed: boolean;
}

export function recordAttempt(ex: Exercise, o: Outcome) {
  const rec: AttemptRecord = {
    id: o.id ?? crypto.randomUUID(),
    durationMs: o.durationMs ?? 0,
    contentVersion: 'alicerce-2026-10-07',
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
  update((s) => s.attempts.some(a=>a.id===rec.id) ? s : ({ ...s, attempts: [...s.attempts, rec].slice(-5000) }));
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
    for (const id of lesson ? cardIds(lesson) : []) if (!cards[id]) cards[id] = newCard(now + 60 * 60_000); // primeira revisão em ~1h
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
    reviews: [...s.reviews, { id:crypto.randomUUID(), cardId, grade, at: now }].slice(-5000),
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

export function resetProgress(clearDrafts = false) {
  generation++;
  update(s => ({...emptyProgress(),resetAt:Math.max(Date.now(),(s.resetAt??0)+1)}));
  if(clearDrafts) {
    for(const k of pendingDrafts.keys())if(k.startsWith(draftPrefix()))pendingDrafts.delete(k);
    try { for(const k of Object.keys(localStorage)) if(k.startsWith(draftPrefix()) || (scope==='guest' && k.startsWith(DRAFT))) localStorage.removeItem(k); }
    catch {localSave='error';emitAuth();}
  }
}

/* ---------------- rascunhos de código (separados: não sincronizam) ---------------- */

const DRAFT = 'alicerce:rascunho:';
const draftPrefix = () => `alicerce:draft:v2:${scope}:`;
export function loadDraft(id: string): string | null {
  try {
    return pendingDrafts.get(draftPrefix()+id) ?? localStorage.getItem(draftPrefix() + id) ?? (scope==='guest' ? localStorage.getItem(DRAFT+id) : null);
  } catch {
    return null;
  }
}
export function saveDraft(id: string, code: string) {
  const k=draftPrefix()+id;
  pendingDrafts.set(k,code);
  try {
    localStorage.setItem(k, code);pendingDrafts.delete(k);
  } catch {
    unsaved=true;localSave='error';emitAuth();
  }
}
export function clearDraft(id: string) {
  pendingDrafts.delete(draftPrefix()+id);
  try {
    localStorage.removeItem(draftPrefix() + id);
    if(scope==='guest')localStorage.removeItem(DRAFT+id);
  } catch {
    /* ignora */
  }
}

/* ---------------- conta e sincronização ---------------- */

type SyncStatus = 'offline' | 'idle' | 'syncing' | 'error';
let user: User | null = null;
let syncStatus: SyncStatus = 'offline';
const authListeners = new Set<() => void>();
// Até a primeira resposta de /api/auth/me não se sabe de quem é a página. Quando a conta chega,
// o Layout remonta o conteúdo (key = id da conta), e o que o aluno tivesse feito antes se perderia.
// Enquanto authChecked é false, o Layout deixa o conteúdo inerte. Na demonstração estática não há conta.
let authChecked = STATIC_SITE;
type AuthSnapshot = {user:User|null;syncStatus:SyncStatus;localSave:LocalSave;lastSync:number|null;logoutPending:boolean;authChecked:boolean};
let authSnapshot: AuthSnapshot = { user, syncStatus, localSave, lastSync, logoutPending, authChecked };
// Na pré-renderização e na hidratação a página sai interativa; a trava só vale depois que o JavaScript assume.
const SERVER_AUTH: AuthSnapshot = { ...authSnapshot, authChecked: true };
function emitAuth() {
  authSnapshot = { user, syncStatus, localSave, lastSync, logoutPending, authChecked };
  for (const l of authListeners) l();
}

export function useAuth() {
  return useSyncExternalStore(
    (cb) => {
      authListeners.add(cb);
      return () => authListeners.delete(cb);
    },
    () => authSnapshot,
    () => SERVER_AUTH,
  );
}

let syncTimer: ReturnType<typeof setTimeout> | undefined;
let retryDelay = 1500;
let syncingGeneration: number | null = null;
function switchUser(next:User|null){
  flush();
  clearTimeout(syncTimer);clearTimeout(saveTimer);
  generation++;user=next;scope=next?`user:${next.id}`:'guest';
  unsaved=false;localSave='saved';lastSync=null;
  state=emptyProgress();
  try{const raw=localStorage.getItem(key()) ?? (scope==='guest'?localStorage.getItem(LEGACY_KEY):null);if(raw)state=sanitizeProgress(JSON.parse(raw));}catch{localSave='error';}
  syncStatus=next?'idle':'offline';emit();emitAuth();
}
function broadcastAuth(){try{localStorage.setItem(AUTH_CHANGE,crypto.randomUUID());}catch{/* sessão continua isolada nesta aba */}}
function markLogoutPending(on:boolean){try{if(on)localStorage.setItem(LOGOUT_PENDING,String(Date.now()));else localStorage.removeItem(LOGOUT_PENDING);}catch{/* sem armazenamento: vale só nesta aba */}}
function logoutPendingSaved(){try{return localStorage.getItem(LOGOUT_PENDING)!==null;}catch{return false;}}
function scheduleSync() {
  if (!user) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncNow, 1500);
}

export async function syncNow() {
  if (!user || logoutPending) return;
  const currentGeneration=generation;
  if(syncingGeneration===currentGeneration)return;
  syncingGeneration=currentGeneration;
  syncStatus = 'syncing';
  emitAuth();
  try {
    const server = await api.putProgress(getProgress(),user.id);
    if(currentGeneration!==generation)return;
    const merged = mergeProgress(getProgress(), sanitizeProgress(server));
    state = merged;
    try {
      localStorage.setItem(key(), JSON.stringify(state));
      unsaved=false;localSave='saved';
    } catch {
      unsaved=true;localSave='error';
    }
    emit();
    syncStatus = 'idle';
    retryDelay=1500;lastSync=Date.now();
  } catch(e) {
    if(currentGeneration!==generation)return;
    // Sessão encerrada no servidor (outro aparelho usou "Sair de todos os aparelhos", ou ela venceu):
    // vira visitante em vez de reenviar o progresso para sempre. A cópia local da conta fica no perfil dela.
    if(sessionGone(e)){endedOnServer();return;}
    syncStatus = 'error';
    clearTimeout(syncTimer);syncTimer=setTimeout(()=>void syncNow(),retryDelay);retryDelay=Math.min(60000,retryDelay*2);
  } finally {
    if(syncingGeneration===currentGeneration)syncingGeneration=null;
  }
  emitAuth();
}

export async function initAuth() {
  // Uma saída anterior não foi confirmada: a conta continua oculta, e a saída é tentada de novo.
  if(logoutPendingSaved()){logoutPending=true;authChecked=true;emitAuth();await signOut().catch(()=>{});return;}
  if(logoutPending){authChecked=true;emitAuth();return;}
  const currentGeneration=generation;
  try {
    const next = await api.me();
    if(currentGeneration===generation && next?.id!==user?.id)switchUser(next);
  } catch {
    if(currentGeneration===generation)switchUser(null);
  }
  // Se a geração mudou (entrou ou saiu no meio), quem decidiu a conta foi signIn/signOut.
  authChecked=true;
  emitAuth();
  if (user && currentGeneration===generation) await syncNow();
}

export async function signIn(kind: 'login' | 'register', email: string, password: string, name?: string) {
  const next = kind === 'login' ? await api.login(email, password) : await api.register(email, password, name ?? '');
  logoutPending=false;markLogoutPending(false);
  switchUser(next);broadcastAuth();
  await syncNow();
  // A primeira sincronização já chegou sem sessão (401): o navegador não guardou o cookie.
  if(!user)throw new ApiError(401,'O servidor aceitou a entrada, mas este navegador não guardou o cookie da sessão. Confira se os cookies estão liberados para este site; se o servidor envia o cookie com Secure, o endereço precisa ser HTTPS.');
}

export async function signOut() {
  logoutPending=true;markLogoutPending(true);
  switchUser(null);
  try{await api.logout();logoutPending=false;markLogoutPending(false);broadcastAuth();emitAuth();}
  catch{emitAuth();throw new Error('A sessão no servidor ainda não foi encerrada. Tente sair novamente quando a conexão voltar.');}
}

/** O servidor já encerrou a sessão: este aparelho e as outras abas voltam a ser visitante. */
function endedOnServer(){logoutPending=false;markLogoutPending(false);switchUser(null);broadcastAuth();}
const sessionGone=(e:unknown)=>(e as {status?:unknown}|null)?.status===401;

/** Encerra a sessão em todos os aparelhos, inclusive neste. Sem a confirmação do servidor, nada muda aqui. */
export async function signOutEverywhere(): Promise<number> {
  try{const ended=await api.logoutEverywhere();endedOnServer();return ended;}
  catch(e){
    if(sessionGone(e)){endedOnServer();throw new Error('A sessão deste aparelho já tinha sido encerrada. Entre de novo e repita para encerrar a dos outros aparelhos.');}
    throw new Error('Não consegui confirmar o encerramento das sessões. Você continua conectado neste aparelho; tente de novo.');
  }
}

/** Exclui a conta; o servidor confere a senha. Senha errada ou falha de rede não mudam nada aqui. */
export async function deleteAccount(password: string) {
  try{await api.deleteAccount(password);}
  catch(e){if(sessionGone(e))endedOnServer();throw e;}
  endedOnServer();
}

export function retrySave(){persist();}
export function getSaveStatus(){return authSnapshot;}
