/**
 * Contexto que o tutor recebe: em que lição/exercício o estudante está, o
 * código atual, o último erro e quantas dicas já viu. Atualizado pelos
 * exercícios e pelo laboratório; lido pelo painel do tutor.
 */
import { useSyncExternalStore } from 'react';

export interface TutorContext {
  lessonId?: string;
  exerciseId?: string;
  code?: string;
  error?: string;
  hintsSeen?: number;
}

let ctx: TutorContext = {};
let open = false;
let pendingQuestion: string | null = null;
const listeners = new Set<() => void>();
let snap: { ctx: TutorContext; open: boolean; pendingQuestion: string | null } = { ctx, open, pendingQuestion };
const emit = () => {
  snap = { ctx, open, pendingQuestion };
  for (const l of listeners) l();
};

export function setTutorContext(c: TutorContext) {
  ctx = { ...ctx, ...c };
  emit();
}
export function resetTutorContext(c: TutorContext = {}) {
  ctx = c;
  emit();
}
export function openTutor(question?: string) {
  open = true;
  pendingQuestion = question ?? null;
  emit();
}
export function closeTutor() {
  open = false;
  emit();
}
export function takePendingQuestion(): string | null {
  const q = pendingQuestion;
  pendingQuestion = null;
  return q;
}
export function useTutor() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => snap,
    () => snap,
  );
}
