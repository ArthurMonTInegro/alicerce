/**
 * Currículo público.
 *
 * - `publicLevels` (e derivados `public*`): os níveis gratuitos (0 e 1) completos,
 *   com o corpo das lições. É todo o conteúdo de aula que este repositório tem.
 * - `levels`, `modules`, `lessons`, `exercises` e mapas: o MAPA do currículo
 *   inteiro (0 a 14), só metadados (títulos, resumos, habilidades, etapas, ids de
 *   exercícios e de cartões). Os níveis pagos vêm de catalogo-pago.ts, gerado a
 *   partir do repositório privado. É o que o progresso precisa para validar e
 *   mesclar ids e o que o site usa para desenhar a trilha.
 *
 * O corpo das lições pagas só existe no repositório privado; ferramentas e
 * servidor o carregam com loadCurriculum() (completo.ts).
 */
import { autonomyByLesson } from './autonomy.ts';
import { paidCatalog } from './catalogo-pago.ts';
import { toLevelMeta } from './catalog.ts';
import { level0 } from './levels/n00-computacao.ts';
import { level1 } from './levels/n01-logica.ts';
import { attachAutonomy, deepenLevels } from './montagem.ts';
import { theoryExpansions } from './theory-expansions.ts';
import type { Exercise, ExerciseMetaRef, Lesson, LessonMeta, Level, LevelMeta, ModuleMeta } from './types.ts';

/* ---------- níveis gratuitos, completos ---------- */

export const publicLevels: Level[] = attachAutonomy(deepenLevels([level0, level1], theoryExpansions), autonomyByLesson);
export const publicLessons: Lesson[] = publicLevels.flatMap((l) => l.modules.flatMap((m) => m.lessons));
export const publicLessonById = new Map(publicLessons.map((l) => [l.id, l]));

export interface ExerciseRef {
  exercise: Exercise;
  lessonId: string;
  moduleId: string;
}

/** Exercícios completos de uma lista de lições, com a lição de origem. */
export const exercisesOf = (lessons: Lesson[]): ExerciseRef[] =>
  lessons.flatMap((lesson) =>
    lesson.sections.flatMap((s) => s.blocks.flatMap((b) => (b.type === 'exercise' ? [{ exercise: b.exercise, lessonId: lesson.id, moduleId: lesson.moduleId }] : []))),
  );

export const publicExercises: ExerciseRef[] = exercisesOf(publicLessons);
export const publicExerciseById = new Map(publicExercises.map((e) => [e.exercise.id, e]));

/* ---------- mapa do currículo inteiro (metadados) ---------- */

export const levels: LevelMeta[] = [...publicLevels.map(toLevelMeta), ...paidCatalog].sort((a, b) => a.number - b.number);
export const modules: ModuleMeta[] = levels.flatMap((l) => l.modules);
export const lessons: LessonMeta[] = modules.flatMap((m) => m.lessons);

export const moduleById = new Map(modules.map((m) => [m.id, m]));
export const lessonById = new Map(lessons.map((l) => [l.id, l]));
export const levelById = new Map(levels.map((l) => [l.id, l]));

/** Todos os exercícios do mapa (id, tipo, dificuldade, habilidades, etapa), com a lição de origem. */
export const exercises: ExerciseMetaRef[] = lessons.flatMap((l) => l.exercises.map((exercise) => ({ exercise, lessonId: l.id, moduleId: l.moduleId })));
export const exerciseById = new Map(exercises.map((e) => [e.exercise.id, e]));

export const skills = modules.flatMap((m) => m.skills.map((s) => ({ ...s, moduleId: m.id })));
export const skillById = new Map(skills.map((s) => [s.id, s]));

/** Ids dos cartões de uma lição, na ordem (o texto fica no corpo da lição). */
export const cardIdsOf = (l: LessonMeta) => Array.from({ length: l.cardCount }, (_, i) => `${l.id}#${i + 1}`);
