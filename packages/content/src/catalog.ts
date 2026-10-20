/**
 * Metadados públicos derivados das lições completas. A mesma função gera o
 * catálogo dos níveis gratuitos (no build) e o arquivo versionado dos níveis
 * pagos (scripts/premium/metadados.ts, a partir do repositório privado), para
 * que os dois nunca divirjam.
 *
 * Os campos são escolhidos um a um, nunca por "tudo menos": um campo novo na
 * lição precisa de uma decisão explícita (público ou protegido) antes de sair.
 */
import type { Lesson, LessonMeta, LessonTerms, Level, LevelMeta, Module, ModuleMeta } from './types.ts';

const LESSON_KEYS = new Set(['id', 'moduleId', 'title', 'titleEn', 'summary', 'minutes', 'objectives', 'skills', 'terms', 'references', 'sections', 'cards', 'theoryTitle', 'autonomy']);
const MODULE_KEYS = new Set(['id', 'levelId', 'title', 'titleEn', 'description', 'prerequisites', 'skills', 'outline', 'lessons', 'references']);
const LEVEL_KEYS = new Set(['id', 'number', 'title', 'titleEn', 'goal', 'why', 'modules']);

function checkKeys(kind: string, id: string, obj: object, allowed: Set<string>) {
  for (const k of Object.keys(obj)) {
    if (!allowed.has(k)) throw new Error(`Campo desconhecido em ${kind} ${id}: "${k}". Decida se é público (catalog.ts) ou protegido antes de gerar metadados.`);
  }
}

export function toLessonMeta(l: Lesson): LessonMeta {
  checkKeys('lição', l.id, l, LESSON_KEYS);
  return {
    id: l.id,
    moduleId: l.moduleId,
    title: l.title,
    titleEn: l.titleEn,
    summary: l.summary,
    minutes: l.minutes,
    skills: [...l.skills],
    references: [...l.references],
    ...(l.theoryTitle !== undefined ? { theoryTitle: l.theoryTitle } : {}),
    cardCount: l.cards.length,
    stages: l.sections.map((s) => s.stage),
    exercises: l.sections.flatMap((s) =>
      s.blocks.flatMap((b) =>
        b.type === 'exercise' ? [{ id: b.exercise.id, kind: b.exercise.kind, difficulty: b.exercise.difficulty, skills: [...b.exercise.skills], stage: s.stage }] : [],
      ),
    ),
  };
}

export function toModuleMeta(m: Module): ModuleMeta {
  checkKeys('módulo', m.id, m, MODULE_KEYS);
  return {
    id: m.id,
    levelId: m.levelId,
    title: m.title,
    titleEn: m.titleEn,
    description: m.description,
    prerequisites: [...m.prerequisites],
    skills: m.skills.map((s) => ({ ...s })),
    outline: [...m.outline],
    lessons: m.lessons.map(toLessonMeta),
    references: [...m.references],
  };
}

export function toLevelMeta(l: Level): LevelMeta {
  checkKeys('nível', l.id, l, LEVEL_KEYS);
  return { id: l.id, number: l.number, title: l.title, titleEn: l.titleEn, goal: l.goal, why: l.why, modules: l.modules.map(toModuleMeta) };
}

/** Termos de cada lição, na ordem da trilha. O glossário é recurso aberto (ver /planos). */
export function toLessonTerms(levels: Level[]): LessonTerms[] {
  return levels.flatMap((l) => l.modules.flatMap((m) => m.lessons.map((x) => ({ lessonId: x.id, terms: x.terms.map((t) => ({ ...t })) }))));
}
