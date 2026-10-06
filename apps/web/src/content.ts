/**
 * Conteúdo para o front-end.
 *
 * A estrutura da trilha, os metadados das lições, os cartões e o glossário vêm
 * de um catálogo leve gerado no build (scripts/gen-content.ts). O texto completo
 * de cada lição é um arquivo separado, baixado na primeira vez que a lição é
 * aberta e guardado em memória. Assim o JavaScript inicial não carrega as 69
 * lições de uma vez, o que importa muito em celulares modestos e redes lentas.
 */
import { useEffect, useState } from 'react';
import type { Exercise, Lesson, Level as FullLevel, Module as FullModule, Skill, Stage, GlossaryEntry, Difficulty } from '@alicerce/content/lite';
import catalogJson from './generated/catalog.json';

export * from '@alicerce/content/lite';

export interface ExerciseMeta {
  id: string;
  kind: Exercise['kind'];
  difficulty: Difficulty;
  skills: string[];
  stage: Stage;
}
export type LessonMeta = Omit<Lesson, 'sections'> & { stages: Stage[]; exercises: ExerciseMeta[] };
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
  glossary: GlossaryEntry[];
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
export const glossary: GlossaryEntry[] = catalog.glossary;

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
