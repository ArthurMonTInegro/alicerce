/**
 * Gera o catálogo leve (estrutura da trilha e metadados das lições) e, em
 * arquivos à parte, o que só algumas páginas usam: o texto completo de cada
 * lição gratuita, os cartões de revisão dessas lições e o glossário. O front-end
 * carrega o catálogo no início e baixa o resto só quando a página que precisa
 * dele é aberta.
 *
 * Só lê o pacote público (@alicerce/content), que não tem o corpo das lições
 * pagas: o build é o mesmo com ou sem o repositório privado por perto. As lições
 * pagas são entregues pelo servidor (/api/content/...), a assinantes ativos.
 * Saída: src/generated/ (ignorado pelo git; recriado em cada build e typecheck).
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { glossary, isFreeLesson, levels, publicLessons, skills, tutorKnowledge } from '@alicerce/content';

const out = fileURLToPath(new URL('../src/generated/', import.meta.url));
rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'lessons'), { recursive: true });

// Defesa extra: o pacote público só deveria ter lições gratuitas.
for (const l of publicLessons) if (!isFreeLesson(l.id)) throw new Error(`gen-content: lição paga no pacote público: ${l.id}`);

writeFileSync(join(out, 'catalog.json'), JSON.stringify({ levels, skills, glossaryCount: glossary.length }));
writeFileSync(join(out, 'glossary.json'), JSON.stringify(glossary));
writeFileSync(join(out, 'cards.json'), JSON.stringify(Object.fromEntries(publicLessons.map((lesson) => [lesson.id, lesson.cards]))));
for (const lesson of publicLessons) writeFileSync(join(out, 'lessons', `${lesson.id}.json`), JSON.stringify(lesson));
writeFileSync(join(out, 'tutor-knowledge.json'), JSON.stringify(tutorKnowledge));
console.log(`conteúdo: catálogo de ${levels.length} níveis + ${publicLessons.length} lições gratuitas em src/generated/`);
