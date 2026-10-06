/**
 * Confere um arquivo de lições antes de ele entrar no currículo.
 *
 *   node scripts/check-lessons.ts packages/content/src/levels/modulos/_rascunho-m3-1.ts m3-1
 *
 * Roda as mesmas regras dos testes de conteúdo e de verify-solutions.ts, mas só
 * sobre as lições do arquivo, comparando ids com o resto do currículo. Também
 * confere os tipos do arquivo com o TypeScript. Sai com código 1 se houver problema.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { exercises, lessons as allLessons, moduleById, projectById, referenceById, references, skillById, STAGES, type Block, type Exercise, type Lesson } from '../packages/content/src/index.ts';
import { checkExercise } from './exercise-check.ts';

const VIZ = ['binary', 'cpu', 'terminal', 'client-server', 'memory', 'sorting', 'binary-search', 'stack-queue', 'hash-table', 'big-o', 'tree', 'graph-bfs', 'tcp-handshake', 'scheduler', 'logic-gates', 'hashing', 'neuron', 'sql-join'];

const [file, moduleId] = process.argv.slice(2);
if (!file || !moduleId) {
  console.error('uso: node scripts/check-lessons.ts <arquivo.ts> <id do módulo>');
  process.exit(2);
}

const problems: string[] = [];
const bad = (where: string, msg: string) => problems.push(`✘ ${where}: ${msg}`);

// 1. Tipos (só este arquivo e o que ele importa)
const tmp = mkdtempSync(join(tmpdir(), 'alicerce-tsc-'));
const tsconfig = join(tmp, 'tsconfig.json');
writeFileSync(tsconfig, JSON.stringify({ extends: resolve('tsconfig.base.json'), include: [], files: [resolve(file)] }));
try {
  execFileSync('npx', ['tsc', '-p', tsconfig], { encoding: 'utf8', stdio: 'pipe' });
} catch (e) {
  const out = (e as { stdout?: string }).stdout ?? String(e);
  for (const line of out.trim().split('\n').slice(0, 30)) bad('tipos', line);
}

// 2. Carrega as lições do arquivo
let draft: Lesson[] = [];
try {
  const mod = (await import(pathToFileURL(resolve(file)).href)) as { lessons?: Lesson[] };
  if (!Array.isArray(mod.lessons)) bad(file, 'o arquivo precisa exportar `lessons: Lesson[]`');
  else draft = mod.lessons;
} catch (e) {
  bad(file, `não carregou: ${(e as Error).message}`);
}

const module = moduleById.get(moduleId);
if (!module) bad(moduleId, 'módulo inexistente');

// O currículo carregado já inclui a versão instalada deste arquivo (lições depois da primeira do módulo): ignora-a na comparação.
const installed = new Set(module ? module.lessons.slice(1).map((l) => l.id) : []);
const others = allLessons.filter((l) => !installed.has(l.id));
const otherIds = {
  lessons: new Set(others.map((l) => l.id)),
  exercises: new Set(exercises.filter((e) => !installed.has(e.lessonId)).map((e) => e.exercise.id)),
  cards: new Set(others.flatMap((l) => l.cards.map((c) => c.id))),
};
const seen = { lessons: new Set<string>(), exercises: new Set<string>(), cards: new Set<string>() };
const dup = (kind: keyof typeof seen, id: string, where: string) => {
  if (otherIds[kind].has(id) || seen[kind].has(id)) bad(where, `id repetido: ${id}`);
  seen[kind].add(id);
};

const braces = (where: string, text: string) => {
  if ((text.match(/\{\{/g) ?? []).length !== (text.match(/\}\}/g) ?? []).length) bad(where, 'termo bilíngue {{pt|en}} mal fechado');
  for (const m of text.matchAll(/\{\{([^}]*)\}\}/g)) if (!m[1]!.includes('|')) bad(where, `termo bilíngue sem "|": {{${m[1]}}}`);
};

const exercisesOf = (l: Lesson): Array<{ ex: Exercise; stage: string }> =>
  l.sections.flatMap((s) => s.blocks.flatMap((b) => (b.type === 'exercise' ? [{ ex: b.exercise, stage: s.stage }] : [])));

for (const l of draft) {
  const w = l.id ?? '(sem id)';
  dup('lessons', l.id, w);
  if (l.moduleId !== moduleId) bad(w, `moduleId ${l.moduleId} ≠ ${moduleId}`);
  if (!/^l[34]-[a-z0-9-]+$/.test(l.id)) bad(w, 'id da lição deve seguir o padrão l3-... ou l4-...');
  for (const k of ['title', 'titleEn', 'summary'] as const) if (!l[k] || l[k].length < 5) bad(w, `${k} vazio ou curto`);
  if (!(l.minutes >= 10 && l.minutes <= 90)) bad(w, 'minutes fora de 10..90');

  const order = l.sections.map((s) => STAGES.indexOf(s.stage));
  if (order.join() !== [...order].sort((a, b) => a - b).join()) bad(w, 'etapas fora da ordem CONCEITO → REVISÃO');
  if (new Set(order).size !== order.length) bad(w, 'etapa repetida');
  for (const req of ['conceito', 'explicacao', 'exemplo', 'codigo', 'exercicio', 'desafio', 'revisao'] as const)
    if (!l.sections.some((s) => s.stage === req)) bad(w, `sem a etapa ${req}`);
  if (!l.objectives.length) bad(w, 'sem objetivos');
  if (l.terms.length < 3) bad(w, 'menos de 3 termos PT → EN');
  for (const t of l.terms) if (!(t.pt && t.en && t.def)) bad(w, `termo incompleto: ${t.pt}`);
  if (l.cards.length < 3) bad(w, 'menos de 3 flashcards');
  for (const c of l.cards) dup('cards', c.id, w);
  for (const s of l.skills) if (!skillById.has(s)) bad(w, `habilidade inexistente: ${s}`);
  if (!l.skills.length) bad(w, 'sem habilidade');
  for (const r of l.references) if (!referenceById.has(r)) bad(w, `referência inexistente: ${r}`);

  const blocks: Block[] = l.sections.flatMap((s) => s.blocks);
  for (const b of blocks) {
    if (b.type === 'md' || b.type === 'callout') braces(w, b.text);
    if (b.type === 'viz' && !VIZ.includes(b.viz)) bad(w, `visualização inexistente: ${b.viz}`);
    if (b.type === 'project' && !projectById.has(b.projectId)) bad(w, `projeto inexistente: ${b.projectId}`);
    if (b.type === 'table' && b.rows.some((r) => r.length !== b.head.length)) bad(w, 'tabela com linha de tamanho diferente do cabeçalho');
  }

  const exs = exercisesOf(l);
  if (exs.filter((e) => e.stage === 'exercicio').length < 3) bad(w, 'menos de 3 exercícios na etapa Exercícios');
  if (!exs.some((e) => e.stage === 'desafio')) bad(w, 'sem exercício na etapa Desafio');
  if (!exs.some((e) => e.ex.difficulty === 'facil')) bad(w, 'sem exercício fácil');
  if (!exs.some((e) => e.ex.kind === 'code' || e.ex.kind === 'fix')) bad(w, 'sem exercício de código');

  for (const { ex } of exs) {
    const we = `${w} › ${ex.id}`;
    dup('exercises', ex.id, we);
    if (!/^e[34]-[a-z0-9-]+$/.test(ex.id)) bad(we, 'id do exercício deve seguir o padrão e3-... ou e4-...');
    if (!ex.hints.length) bad(we, 'sem dicas');
    if (ex.explanation.length <= 10) bad(we, 'explicação curta');
    if (!ex.skills.length) bad(we, 'sem habilidade');
    for (const s of ex.skills) if (!skillById.has(s)) bad(we, `habilidade inexistente: ${s}`);
    braces(we, ex.prompt);
    if (ex.kind === 'mcq') {
      if (ex.options.filter((o) => o.correct).length !== 1) bad(we, 'múltipla escolha precisa de exatamente uma correta');
      for (const o of ex.options) if (!o.feedback) bad(we, `opção sem feedback: ${o.text}`);
    }
    if (ex.kind === 'fill') {
      if (ex.template.split('___').length - 1 !== ex.blanks.length) bad(we, 'número de ___ ≠ número de respostas');
      for (const b of ex.blanks) if (!b.length) bad(we, 'lacuna sem resposta aceita');
    }
    if (ex.kind === 'parsons' && ex.lines.length < 3) bad(we, 'parsons com menos de 3 linhas');
    if ((ex.kind === 'code' || ex.kind === 'fix') && !ex.tests.length) bad(we, 'código sem testes');
    const run = await checkExercise(ex);
    for (const p of run ?? []) bad(we, p);
  }
}

if (!draft.length && !problems.length) bad(file, 'nenhuma lição no arquivo');

if (problems.length) {
  console.error(problems.join('\n'));
  console.error(`\n${problems.length} problema(s) em ${draft.length} lição(ões).`);
  process.exit(1);
}
const nEx = draft.reduce((n, l) => n + exercisesOf(l).length, 0);
console.log(`OK: ${draft.length} lição(ões), ${nEx} exercícios, tudo conferido.`);
console.log(`Referências disponíveis: ${references.length}.`);
