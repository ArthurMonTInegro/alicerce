/**
 * Quem pode ler o corpo de uma lição. Decide só com o mapa público (nível de
 * cada lição) e o plano; quem chama é responsável por obter o plano de fonte
 * confiável (no servidor, o banco, a cada pedido).
 */
import { canAccessLevel, type PlanId } from '@alicerce/engine';
import { exerciseById, lessonById, levelById, moduleById } from './curriculum.ts';

/** Número do nível de uma lição do mapa, ou undefined se a lição não existe. */
export function levelOfLesson(id: string): number | undefined {
  const lesson = lessonById.get(id);
  const module = lesson ? moduleById.get(lesson.moduleId) : undefined;
  return module ? levelById.get(module.levelId)?.number : undefined;
}
/** Lição gratuita (níveis 0 e 1): o corpo é público. */
export const isFreeLesson = (id: string) => canReadLesson('free', id);
export function canReadLesson(plan: PlanId, id: string) {
  const n = levelOfLesson(id);
  return n !== undefined && canAccessLevel(plan, n);
}
export function canReadExercise(plan: PlanId, id: string) {
  const e = exerciseById.get(id);
  return !!e && canReadLesson(plan, e.lessonId);
}
