/** Gera docs/PESQUISA.md e docs/CURRICULO.md a partir do conteúdo, para a documentação nunca divergir dele. */
import { writeFileSync } from 'node:fs';
import { countryCurricula, universityPrograms, usUniversityRefs, learningEvidence, references, levels, lessons, exercises } from '../packages/content/src/index.ts';

const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
const refById = new Map(references.map((r) => [r.id, r]));
const out: string[] = [];
out.push('# Pesquisa', '', '<!-- gerado por scripts/gen-docs.ts a partir de packages/content/src/research.ts e references.ts; não edite à mão -->', '');
out.push('A pesquisa serviu para decidir **escopo, sequência e método**. Nenhum curso foi copiado: de cada fonte registramos o que ela ensina e a decisão concreta que tomamos. Todas as URLs foram abertas durante a pesquisa. Quando só encontramos uma fonte secundária confiável, a nota diz isso.', '');
out.push('## Currículos nacionais', '', '| Onde | Fonte | O que observamos | Decisão |', '|---|---|---|---|');
for (const s of countryCurricula) out.push(`| ${cell(s.where)} | [${cell(s.title)}](${s.url}) | ${cell(s.finding)} | ${cell(s.decision)} |`);
out.push('', '## Universidades fora dos EUA', '', '| Onde | Programa | O que observamos | Decisão |', '|---|---|---|---|');
for (const s of universityPrograms) out.push(`| ${cell(s.where)} | [${cell(s.title)}](${s.url}) | ${cell(s.finding)} | ${cell(s.decision)} |`);
out.push('', '## Universidades dos EUA e Canadá', '', '| Curso | Instituição | Como influenciou a trilha |', '|---|---|---|');
for (const id of usUniversityRefs) { const r = refById.get(id)!; out.push(`| [${cell(r.title)}](${r.url}) | ${cell(r.org)} | ${cell(r.note)} |`); }
out.push('', '## Evidências de aprendizagem', '', '| Princípio | Fonte | O que a pesquisa mostra | Onde aparece na plataforma |', '|---|---|---|---|');
for (const e of learningEvidence) out.push(`| ${cell(e.principle)} (${cell(e.principleEn)}) | [${cell(e.citation)}](${e.url}) | ${cell(e.finding)} | ${cell(e.inPlatform)} |`);
out.push('', '## Todas as referências', '', `São ${references.length} referências (livros, cursos abertos e documentação oficial), também navegáveis em \`/referencias\`.`, '', '| Referência | Organização | Tipo | Uso |', '|---|---|---|---|');
for (const r of references) out.push(`| [${cell(r.title)}](${r.url}) | ${cell(r.org)} | ${r.kind} | ${cell(r.note)} |`);
writeFileSync('docs/PESQUISA.md', out.join('\n') + '\n');

const c: string[] = ['# Currículo', '', '<!-- gerado por scripts/gen-docs.ts a partir de packages/content; não edite à mão -->', ''];
c.push(`${levels.length} níveis, ${levels.reduce((a, l) => a + l.modules.length, 0)} módulos, ${lessons.length} lições e ${exercises.length} exercícios. A seta indica pré-requisitos.`);
for (const l of levels) {
  c.push('', `## Nível ${l.number}: ${l.title} (${l.titleEn})`, '', l.goal, '');
  for (const m of l.modules) {
    const pre = m.prerequisites.length ? ` ← ${m.prerequisites.join(', ')}` : '';
    c.push(`- **${m.id} ${m.title}** (${m.titleEn})${pre}`);
    for (const x of m.lessons) c.push(`  - ${x.title}`);
  }
}
writeFileSync('docs/CURRICULO.md', c.join('\n') + '\n');
console.log('docs gerados');
