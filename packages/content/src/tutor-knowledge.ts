import type { Lesson } from './types.ts';
import { publicLessons } from './curriculum.ts';

export interface TutorDoc {
  id: string;
  title: string;
  summary: string;
  text: string;
}
/** Allowlist only instructional prose; never index exercises, answers, cards or solutions. */
export const buildTutorKnowledge = (lessons: Lesson[]): TutorDoc[] =>
  lessons.map((l) => ({
    id: l.id,
    title: l.title,
    summary: l.summary,
    text: l.sections
      .flatMap((s) => s.blocks.filter((b) => b.type === 'md').map((b) => (b.type === 'md' ? b.text : '')))
      .join('\n\n')
      .slice(0, 2400),
  }));

/** Base do tutor das aulas gratuitas. A das aulas pagas é montada só no servidor, a partir do repositório privado. */
export const tutorKnowledge: TutorDoc[] = buildTutorKnowledge(publicLessons);
