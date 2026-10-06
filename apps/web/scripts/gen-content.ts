/**
 * Gera o catálogo leve (estrutura da trilha e metadados das lições) e, em
 * arquivos à parte, o que só algumas páginas usam: o texto completo de cada
 * lição, os cartões de revisão e o glossário. O front-end carrega o catálogo no
 * início e baixa o resto só quando a página que precisa dele é aberta.
 * Saída: src/generated/ (ignorado pelo git; recriado em cada build e typecheck).
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { glossary, levels, skills } from '@alicerce/content';

const out = fileURLToPath(new URL('../src/generated/', import.meta.url));
rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'lessons'), { recursive: true });

const catalog = {
  levels: levels.map((l) => ({
    ...l,
    modules: l.modules.map((m) => ({
      ...m,
      lessons: m.lessons.map(({ sections, terms, objectives, cards, ...meta }) => ({
        ...meta,
        cardCount: cards.length,
        stages: sections.map((s) => s.stage),
        exercises: sections.flatMap((s) =>
          s.blocks.flatMap((b) =>
            b.type === 'exercise'
              ? [{ id: b.exercise.id, kind: b.exercise.kind, difficulty: b.exercise.difficulty, skills: b.exercise.skills, stage: s.stage }]
              : [],
          ),
        ),
      })),
    })),
  })),
  skills,
  glossaryCount: glossary.length,
};
writeFileSync(join(out, 'catalog.json'), JSON.stringify(catalog));
writeFileSync(join(out, 'glossary.json'), JSON.stringify(glossary));
const cards = Object.fromEntries(levels.flatMap((l) => l.modules.flatMap((m) => m.lessons.map((lesson) => [lesson.id, lesson.cards]))));
writeFileSync(join(out, 'cards.json'), JSON.stringify(cards));
let n = 0;
for (const l of levels) for (const m of l.modules) for (const lesson of m.lessons) {
  writeFileSync(join(out, 'lessons', `${lesson.id}.json`), JSON.stringify(lesson));
  n++;
}
console.log(`conteúdo: catálogo + ${n} lições em src/generated/`);
