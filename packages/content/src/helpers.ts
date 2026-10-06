import type { Block, CodeLang, Flashcard, Lesson, LessonSection, Stage, Term } from './types.ts';
import { STAGES } from './types.ts';

/** Remove a indentação comum de template strings (para código e texto legíveis no fonte). */
export function dedent(s: string): string {
  const lines = s.replace(/^\n/, '').replace(/\n[ \t]*$/, '').split('\n');
  const indents = lines.filter((l) => l.trim()).map((l) => l.match(/^[ \t]*/)![0].length);
  const min = indents.length ? Math.min(...indents) : 0;
  return lines.map((l) => l.slice(min)).join('\n');
}

export const md = (text: string): Block => ({ type: 'md', text: dedent(text) });
export const py = (code: string, opts: { caption?: string; runnable?: boolean; stdin?: string } = {}): Block => ({
  type: 'code',
  lang: 'python',
  code: dedent(code),
  runnable: opts.runnable ?? true,
  ...(opts.caption ? { caption: opts.caption } : {}),
  ...(opts.stdin ? { stdin: opts.stdin } : {}),
});
export const code = (lang: CodeLang, src: string, caption?: string): Block => ({
  type: 'code',
  lang,
  code: dedent(src),
  runnable: lang === 'javascript',
  ...(caption ? { caption } : {}),
});
export const trace = (src: string, caption?: string): Block => ({ type: 'trace', code: dedent(src), ...(caption ? { caption } : {}) });
export const tip = (text: string, title?: string): Block => ({ type: 'callout', tone: 'tip', text: dedent(text), ...(title ? { title } : {}) });
export const warn = (text: string, title?: string): Block => ({ type: 'callout', tone: 'warn', text: dedent(text), ...(title ? { title } : {}) });
export const info = (text: string, title?: string): Block => ({ type: 'callout', tone: 'info', text: dedent(text), ...(title ? { title } : {}) });
export const deep = (text: string, title = 'Aprofundando'): Block => ({ type: 'callout', tone: 'deep', text: dedent(text), title });
export const english = (text: string, title = 'English corner'): Block => ({ type: 'callout', tone: 'english', text: dedent(text), title });
export const terms = (...t: Term[]): Block => ({ type: 'terms', terms: t });
export const t = (pt: string, en: string, def: string, example?: string): Term => (example ? { pt, en, def, example } : { pt, en, def });

type StageMap = Partial<Record<Stage, Block[]>>;

export function sections(map: StageMap): LessonSection[] {
  return STAGES.filter((s) => map[s]?.length).map((stage) => ({ stage, blocks: map[stage]! }));
}

export function cards(lessonId: string, pairs: Array<[string, string]>): Flashcard[] {
  return pairs.map(([front, back], i) => ({ id: `${lessonId}#${i + 1}`, front, back }));
}

type LessonInput = Omit<Lesson, 'sections' | 'cards'> & { stages: StageMap; review: Array<[string, string]> };

export function lesson(input: LessonInput): Lesson {
  const { stages, review, ...rest } = input;
  return { ...rest, sections: sections(stages), cards: cards(input.id, review) };
}
