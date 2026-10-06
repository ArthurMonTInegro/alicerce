/**
 * Conteúdo para o front-end.
 *
 * A estrutura da trilha e os metadados das lições vêm de um catálogo leve gerado
 * no build (scripts/gen-content.ts). O texto completo de cada lição, os cartões
 * de revisão e o glossário são arquivos separados, baixados na primeira vez que
 * uma página precisa deles e guardados em memória. Assim o JavaScript inicial não
 * cresce junto com o currículo, o que importa muito em celulares modestos e redes lentas.
 */
import { useEffect, useState } from 'react';
import type { Exercise, Flashcard, Lesson, Level as FullLevel, Module as FullModule, Skill, Stage, GlossaryEntry, Difficulty } from '@alicerce/content/lite';
import catalogJson from './generated/catalog.json';

export * from '@alicerce/content/lite';

export interface ExerciseMeta {
  id: string;
  kind: Exercise['kind'];
  difficulty: Difficulty;
  skills: string[];
  stage: Stage;
}
export type LessonMeta = Omit<Lesson, 'sections' | 'terms' | 'objectives' | 'cards'> & { stages: Stage[]; exercises: ExerciseMeta[]; cardCount: number };
export type Module = Omit<FullModule, 'lessons'> & { lessons: LessonMeta[] };
export type Level = Omit<FullLevel, 'modules'> & { modules: Module[] };
export interface ExerciseRef {
  exercise: ExerciseMeta;
  lessonId: string;
  moduleId: string;
}

interface Catalog {
  levels: Level[];
  skills: Array<Skill & { moduleId: string }>;
  glossaryCount: number;
}
const catalog = catalogJson as unknown as Catalog;

export const levels: Level[] = catalog.levels;
export const modules: Module[] = levels.flatMap((l) => l.modules);
export const lessons: LessonMeta[] = modules.flatMap((m) => m.lessons);
export const moduleById = new Map(modules.map((m) => [m.id, m]));
export const lessonById = new Map(lessons.map((l) => [l.id, l]));
export const levelById = new Map(levels.map((l) => [l.id, l]));
export const exercises: ExerciseRef[] = lessons.flatMap((l) => l.exercises.map((exercise) => ({ exercise, lessonId: l.id, moduleId: l.moduleId })));
export const exerciseById = new Map(exercises.map((e) => [e.exercise.id, e]));
export const skills = catalog.skills;
export const skillById = new Map(skills.map((s) => [s.id, s]));
export const glossaryCount = catalog.glossaryCount;

/** Ids dos cartões de uma lição (o texto deles fica em cards.json, carregado sob demanda). */
export const cardIds = (l: LessonMeta) => Array.from({ length: l.cardCount }, (_, i) => `${l.id}#${i + 1}`);

/* ---------- texto completo das lições, sob demanda ---------- */

const loaders = import.meta.glob<Lesson>('./generated/lessons/*.json', { import: 'default' });
const loaded = new Map<string, Lesson>();

/** Usado na pré-renderização (servidor), que já tem todo o conteúdo em memória. */
export function seedLessons(all: Iterable<Lesson>) {
  for (const l of all) loaded.set(l.id, l);
}

export const getLesson = (id: string): Lesson | undefined => loaded.get(id);

export async function loadLesson(id: string): Promise<Lesson | undefined> {
  const have = loaded.get(id);
  if (have) return have;
  const load = loaders[`./generated/lessons/${id}.json`];
  if (!load) return undefined;
  const lesson = await load();
  loaded.set(id, lesson);
  return lesson;
}

/** Exercício completo (enunciado, testes, dicas) a partir de uma lição já carregada. */
export function findExercise(lesson: Lesson | undefined, id: string): Exercise | undefined {
  for (const s of lesson?.sections ?? []) for (const b of s.blocks) if (b.type === 'exercise' && b.exercise.id === id) return b.exercise;
  return undefined;
}

/** Lição completa para um componente: baixa na primeira vez e permite tentar de novo se a rede falhar. */
export function useLesson(id: string | undefined): { lesson: Lesson | undefined; failed: boolean; retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [, setLoadedTick] = useState(0);
  const [failedId, setFailedId] = useState<string | null>(null);
  useEffect(() => {
    if (!id || loaded.has(id)) return;
    let alive = true;
    setFailedId(null);
    loadLesson(id).then(
      () => alive && setLoadedTick((n) => n + 1),
      () => alive && setFailedId(id),
    );
    return () => {
      alive = false;
    };
  }, [id, attempt]);
  return { lesson: id ? loaded.get(id) : undefined, failed: !!id && failedId === id && !loaded.has(id), retry: () => setAttempt((n) => n + 1) };
}

/* ---------- cartões e glossário, sob demanda ---------- */

interface Resource<T> {
  get(): T | undefined;
  seed(v: T): void;
  load(): Promise<T>;
}

function resource<T>(fetcher: () => Promise<T>): Resource<T> {
  let value: T | undefined;
  let pending: Promise<T> | undefined;
  return {
    get: () => value,
    seed: (v) => {
      value = v;
    },
    load: () => {
      if (value !== undefined) return Promise.resolve(value);
      pending ??= fetcher().then(
        (v) => (value = v),
        (e: unknown) => {
          pending = undefined;
          throw e;
        },
      );
      return pending;
    },
  };
}

export const cardsResource = resource(() => import('./generated/cards.json').then((m) => m.default as unknown as Record<string, Flashcard[]>));
export const glossaryResource = resource(() => import('./generated/glossary.json').then((m) => m.default as unknown as GlossaryEntry[]));

/** Valor de um recurso para um componente: baixa na primeira vez e permite tentar de novo se a rede falhar. */
export function useResource<T>(r: Resource<T>): { value: T | undefined; failed: boolean; retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [, setTick] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (r.get() !== undefined) return;
    let alive = true;
    setFailed(false);
    r.load().then(
      () => alive && setTick((n) => n + 1),
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
  }, [r, attempt]);
  return { value: r.get(), failed: failed && r.get() === undefined, retry: () => setAttempt((n) => n + 1) };
}
