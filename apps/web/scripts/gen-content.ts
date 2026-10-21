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
 * Enquanto os níveis 2 a 14 estão abertos na transição, as lições deles também
 * saem aqui, como foram publicadas antes da separação (aberto.ts no pacote).
 * Saída: src/generated/ (ignorado pelo git; recriado em cada build e typecheck).
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bodiedLessons, glossary, isOpenLesson, levels, openLessons, skills, tutorKnowledge } from '@alicerce/content';

const out = fileURLToPath(new URL('../src/generated/', import.meta.url));
rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'lessons'), { recursive: true });

// Defesa extra: o pacote público só deveria ter lições que abrem sem assinatura agora.
for (const l of bodiedLessons) if (!isOpenLesson(l.id)) throw new Error(`gen-content: lição paga no pacote público: ${l.id}`);
// As abertas vão como foram publicadas: sem o aprofundamento e a avaliação de autonomia, que são pagos.
for (const l of openLessons) if (l.theoryTitle !== undefined || l.autonomy !== undefined) throw new Error(`gen-content: lição aberta com material pago: ${l.id}`);

writeFileSync(join(out, 'catalog.json'), JSON.stringify({ levels, skills, glossaryCount: glossary.length }));
writeFileSync(join(out, 'glossary.json'), JSON.stringify(glossary));
writeFileSync(join(out, 'cards.json'), JSON.stringify(Object.fromEntries(bodiedLessons.map((lesson) => [lesson.id, lesson.cards]))));
for (const lesson of bodiedLessons) writeFileSync(join(out, 'lessons', `${lesson.id}.json`), JSON.stringify(lesson));
writeFileSync(join(out, 'tutor-knowledge.json'), JSON.stringify(tutorKnowledge));
console.log(`conteúdo: catálogo de ${levels.length} níveis + ${bodiedLessons.length - openLessons.length} lições gratuitas${openLessons.length ? ` + ${openLessons.length} abertas na transição` : ''} em src/generated/`);
