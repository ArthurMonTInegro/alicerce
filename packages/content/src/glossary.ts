import type { Term } from './types.ts';
import { lessons } from './curriculum.ts';
import { projects } from './projects.ts';

export interface GlossaryEntry extends Term {
  /** lições onde o termo aparece */
  lessonIds: string[];
}

/**
 * Glossário PT → EN montado a partir dos termos das lições e dos projetos.
 * Um termo que aparece em várias lições vira uma entrada só, com links para todas.
 */
function build(): GlossaryEntry[] {
  const byKey = new Map<string, GlossaryEntry>();
  const add = (term: Term, lessonId?: string) => {
    const key = term.en.toLowerCase();
    const entry = byKey.get(key);
    if (entry) {
      if (lessonId && !entry.lessonIds.includes(lessonId)) entry.lessonIds.push(lessonId);
      if (!entry.example && term.example) entry.example = term.example;
      return;
    }
    byKey.set(key, { ...term, lessonIds: lessonId ? [lessonId] : [] });
  };
  for (const l of lessons) for (const term of l.terms) add(term, l.id);
  for (const p of projects) for (const term of p.english) add(term);
  return [...byKey.values()].sort((a, b) => a.pt.localeCompare(b.pt, 'pt-BR'));
}

export const glossary: GlossaryEntry[] = build();
