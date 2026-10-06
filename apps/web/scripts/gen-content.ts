/**
 * Gera o catálogo leve (estrutura da trilha, metadados, cartões, glossário) e um
 * arquivo por lição com o texto completo. O front-end carrega o catálogo no
 * início e baixa cada lição só quando ela é aberta.
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
      lessons: m.lessons.map(({ sections, ...meta }) => ({
        ...meta,
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
  glossary,
};
writeFileSync(join(out, 'catalog.json'), JSON.stringify(catalog));
let n = 0;
for (const l of levels) for (const m of l.modules) for (const lesson of m.lessons) {
  writeFileSync(join(out, 'lessons', `${lesson.id}.json`), JSON.stringify(lesson));
  n++;
}
console.log(`conteúdo: catálogo + ${n} lições em src/generated/`);
