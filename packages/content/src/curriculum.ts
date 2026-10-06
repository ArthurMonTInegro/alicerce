import type { Exercise, Lesson, Level, Module } from './types.ts';
import { level0 } from './levels/n00-computacao.ts';
import { level1 } from './levels/n01-logica.ts';
import { level2 } from './levels/n02-python.ts';
import { level3 } from './levels/n03-estruturas.ts';
import { level4 } from './levels/n04-algoritmos.ts';
import { level5 } from './levels/n05-poo.ts';
import { level6 } from './levels/n06-web.ts';
import { level7 } from './levels/n07-bd.ts';
import { level8, level9, level10 } from './levels/n08-n10.ts';
import { level11, level12, level13, level14 } from './levels/n11-n14.ts';

export const levels: Level[] = [level0, level1, level2, level3, level4, level5, level6, level7,
  level8, level9, level10, level11, level12, level13, level14];

export const modules: Module[] = levels.flatMap((l) => l.modules);
export const lessons: Lesson[] = modules.flatMap((m) => m.lessons);

export const moduleById = new Map(modules.map((m) => [m.id, m]));
export const lessonById = new Map(lessons.map((l) => [l.id, l]));
export const levelById = new Map(levels.map((l) => [l.id, l]));

export interface ExerciseRef {
  exercise: Exercise;
  lessonId: string;
  moduleId: string;
}

/** Todos os exercícios, com a lição de origem. */
export const exercises: ExerciseRef[] = lessons.flatMap((lesson) =>
  lesson.sections.flatMap((s) =>
    s.blocks.flatMap((b) => (b.type === 'exercise' ? [{ exercise: b.exercise, lessonId: lesson.id, moduleId: lesson.moduleId }] : [])),
  ),
);

export const exerciseById = new Map(exercises.map((e) => [e.exercise.id, e]));

export const skills = modules.flatMap((m) => m.skills.map((s) => ({ ...s, moduleId: m.id })));
export const skillById = new Map(skills.map((s) => [s.id, s]));
