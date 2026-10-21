/**
 * Separa o conteúdo pago (níveis 2 a 14) num diretório pronto para virar o
 * repositório privado (ArthurMonTInegro/alicerce-premium).
 *
 *   node scripts/premium/separar.ts --saida <dir> [--revisao <rev>] [--substituir] [--aplicar]
 *
 * --revisao   revisão git cujas fontes são separadas (padrão: HEAD). Depois da
 *             separação o HEAD não tem mais o conteúdo pago; para refazer, use a
 *             revisão anterior (ver docs/PREMIUM.md).
 * --saida     diretório do repositório privado. Precisa estar vazio, ou use
 *             --substituir (apaga tudo menos .git, para regenerar um clone).
 * --aplicar   também retira o conteúdo pago desta árvore de trabalho: apaga os
 *             arquivos dos níveis pagos, reescreve os arquivos mistos
 *             (aprofundamento e avaliação de autonomia) só com a parte gratuita
 *             e gera packages/content/src/catalogo-pago.ts.
 *
 * O que vai para o privado: os arquivos de lição dos níveis 2 a 14 (copiados, com
 * os imports trocados por '@alicerce/content/autoria'), o aprofundamento teórico
 * e a avaliação de autonomia dessas lições, um src/index.ts que monta os níveis,
 * README, tsconfig e o workflow de CI.
 *
 * Antes de terminar, o script prova que nada mudou: carrega o diretório privado
 * pelo mesmo caminho que o servidor usa e compara com o currículo da revisão
 * (lição por lição, campo por campo). Com --aplicar, compara também a metade
 * pública reescrita. Qualquer diferença aborta com erro.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { isFreeLevel } from '@alicerce/engine';
import { attachAutonomy, deepenLevels } from '../../packages/content/src/montagem.ts';
import { loadPaidLevels, REPO_ROOT } from '../../packages/content/src/privado.ts';
import type { TheoryExpansion } from '../../packages/content/src/theory-types.ts';
import type { AutonomyQuestion, Level } from '../../packages/content/src/types.ts';
import { canon, CATALOGO_PAGO, gerarCatalogoPago } from './lib.ts';
import { PRIVATE_FILES } from './modelo-privado.ts';

const { values: opt } = parseArgs({
  options: {
    saida: { type: 'string' },
    revisao: { type: 'string', default: 'HEAD' },
    substituir: { type: 'boolean', default: false },
    aplicar: { type: 'boolean', default: false },
  },
});
if (!opt.saida) {
  console.error('uso: node scripts/premium/separar.ts --saida <dir> [--revisao <rev>] [--substituir] [--aplicar]');
  process.exit(2);
}
const OUT = resolve(opt.saida);
const git = (...args: string[]) => execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
const fail = (msg: string): never => {
  console.error(`✘ ${msg}`);
  process.exit(1);
};

/* ---------- 1. fontes da revisão ---------- */

const rev = git('rev-parse', '--verify', `${opt.revisao}^{commit}`);
const CONTENT = 'packages/content/src';
try {
  git('cat-file', '-e', `${rev}:${CONTENT}/levels/n02-python.ts`);
} catch {
  fail(`A revisão ${rev.slice(0, 7)} não tem o conteúdo pago (já separada?). Use a revisão anterior à separação.`);
}
if (opt.aplicar && git('rev-parse', 'HEAD') !== rev) fail('--aplicar só faz sentido com --revisao HEAD (a árvore de trabalho é que muda).');
if (opt.aplicar && git('status', '--porcelain', '--', CONTENT)) fail(`--aplicar exige ${CONTENT} sem alterações pendentes.`);

const tmp = mkdtempSync(join(tmpdir(), 'alicerce-separar-'));
execFileSync('sh', ['-c', 'git archive "$1" "$2" | tar -x -C "$3"', 'sh', rev, CONTENT, tmp], { cwd: REPO_ROOT });
const SRC = join(tmp, CONTENT);
const load = async <T>(rel: string) => (await import(pathToFileURL(join(SRC, rel)).href)) as T;

const old = await load<{ levels: Level[] }>('curriculum.ts');
const isFree = (n: number) => isFreeLevel(n);
const oldFree = old.levels.filter((l) => isFree(l.number));
const oldPaid = old.levels.filter((l) => !isFree(l.number));
const levelOfLesson = new Map(old.levels.flatMap((l) => l.modules.flatMap((m) => m.lessons.map((x) => [x.id, l.number] as const))));
const freeLesson = (id: string) => {
  const n = levelOfLesson.get(id);
  if (n === undefined) return fail(`lição desconhecida: ${id}`);
  return isFree(n);
};

/* ---------- 2. arquivos de lição: quais são pagos ---------- */

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : [];
  });
const levelFiles = walk(join(SRC, 'levels'));
const importsOf = (file: string) =>
  [...readFileSync(file, 'utf8').matchAll(/(?:from|import)\s+'(\.{1,2}\/[^']+)'/g)].map((m) => resolve(dirname(file), m[1]!));
const levelNumbersOf = (file: string) => [...readFileSync(file, 'utf8').matchAll(/export const level(\d+)\b/g)].map((m) => Number(m[1]));
const closure = (roots: string[]) => {
  const seen = new Set<string>();
  const visit = (f: string) => {
    if (seen.has(f)) return;
    seen.add(f);
    for (const dep of importsOf(f)) if (dep.startsWith(join(SRC, 'levels'))) visit(dep);
  };
  roots.forEach(visit);
  return seen;
};
const freeRoots = levelFiles.filter((f) => levelNumbersOf(f).some(isFree));
const paidRoots = levelFiles.filter((f) => levelNumbersOf(f).some((n) => !isFree(n)));
for (const f of freeRoots) if (levelNumbersOf(f).some((n) => !isFree(n))) fail(`${relative(SRC, f)} mistura níveis gratuitos e pagos`);
const freeFiles = closure(freeRoots);
const paidFiles = closure(paidRoots);
for (const f of paidFiles) if (freeFiles.has(f)) fail(`${relative(SRC, f)} é usado por níveis gratuitos e pagos`);
const orphans = levelFiles.filter((f) => !freeFiles.has(f) && !paidFiles.has(f));
if (orphans.length) fail(`arquivos de lição que nenhum nível usa: ${orphans.map((f) => relative(SRC, f)).join(', ')}`);

/* ---------- 3. aprofundamento teórico e avaliação de autonomia ---------- */

const { theoryExpansions } = await load<{ theoryExpansions: TheoryExpansion[] }>('theory-expansions.ts');
interface TheoryGroup {
  file: string | null; // null = entradas escritas no próprio theory-expansions.ts
  exportName: string;
  comment: string;
  entries: TheoryExpansion[];
}
const groups: TheoryGroup[] = [];
for (const f of existsSync(join(SRC, 'theory')) ? walk(join(SRC, 'theory')) : []) {
  const mod = await import(pathToFileURL(f).href);
  const text = readFileSync(f, 'utf8');
  for (const [name, value] of Object.entries(mod)) {
    if (!Array.isArray(value)) continue;
    const comment = new RegExp(`(/\\*\\*[^]*?\\*/)\\s*export const ${name}\\b`).exec(text)?.[1] ?? '';
    groups.push({ file: relative(SRC, f), exportName: name, comment, entries: value as TheoryExpansion[] });
  }
}
const inFiles = new Set(groups.flatMap((g) => g.entries));
const initialEntries = theoryExpansions.filter((e) => !inFiles.has(e));
if (initialEntries.length + inFiles.size !== theoryExpansions.length) fail('aprofundamento: entradas repetidas entre arquivos');
groups.unshift({ file: null, exportName: 'initialTheoryExpansions', comment: '', entries: initialEntries });
// mesma ordem de theoryExpansions
const firstIndex = (g: TheoryGroup) => theoryExpansions.indexOf(g.entries[0]!);
groups.sort((a, b) => firstIndex(a) - firstIndex(b));
if (canon(groups.flatMap((g) => g.entries)) !== canon(theoryExpansions)) fail('aprofundamento: a ordem dos arquivos não reproduz theoryExpansions');

const { autonomyByLesson } = await load<{ autonomyByLesson: Record<string, AutonomyQuestion[]> }>('autonomy.ts');
const autonomyFree = Object.fromEntries(Object.entries(autonomyByLesson).filter(([id]) => freeLesson(id)));
const autonomyPaid = Object.fromEntries(Object.entries(autonomyByLesson).filter(([id]) => !freeLesson(id)));

/* ---------- 4. escreve o diretório privado ---------- */

if (existsSync(OUT)) {
  const present = readdirSync(OUT).filter((f) => f !== '.git');
  if (present.length && !opt.substituir) fail(`${OUT} não está vazio (use --substituir para regenerar; .git é preservado).`);
  for (const f of present) rmSync(join(OUT, f), { recursive: true, force: true });
}
mkdirSync(OUT, { recursive: true });
const put = (rel: string, text: string) => {
  const p = join(OUT, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, text);
};

const PUBLIC_AUTHORING = new Set(['helpers.ts', 'types.ts', 'sql-setup.ts', 'theory-types.ts'].map((f) => join(SRC, f)));
const levelExports: Array<{ name: string; n: number; rel: string }> = [];
for (const f of [...paidFiles].sort()) {
  const rel = relative(SRC, f); // levels/...
  const text = readFileSync(f, 'utf8').replace(/((?:from|import)\s+)'(\.{1,2}\/[^']+)'/g, (all, kw: string, spec: string) => {
    const target = resolve(dirname(f), spec);
    if (paidFiles.has(target)) return all;
    if (PUBLIC_AUTHORING.has(target)) return `${kw}'@alicerce/content/autoria'`;
    return fail(`${rel} importa ${spec}, que não é conteúdo pago nem parte de '@alicerce/content/autoria'`);
  });
  put(join('src', rel), text);
  for (const n of levelNumbersOf(f)) levelExports.push({ name: `level${n}`, n, rel });
}
levelExports.sort((a, b) => a.n - b.n);
if (levelExports.map((l) => l.n).join() !== oldPaid.map((l) => l.number).join()) fail('os arquivos não exportam exatamente os níveis pagos');

const theoryData = (exportName: string, comment: string, entries: TheoryExpansion[], typesFrom: string) =>
  [`import type { TheoryExpansion } from '${typesFrom}';`, '', ...(comment ? [comment] : []), `export const ${exportName}: TheoryExpansion[] = ${JSON.stringify(entries, null, 2)};`, ''].join('\n');

const paidGroups = groups.map((g) => ({ ...g, entries: g.entries.filter((e) => !freeLesson(e.lessonId)) })).filter((g) => g.entries.length);
const paidGroupFile = (g: TheoryGroup) => (g.file ? g.file.replace(/^theory\//, '') : 'inicial.ts');
for (const g of paidGroups) {
  const comment = g.file ? g.comment : '/** Aprofundamento teórico das aulas pagas que antes ficava em theory-expansions.ts. Pesquisa e limites editoriais: docs/APROFUNDAMENTO_TEORICO.md (público). */';
  put(join('src', 'aprofundamento', paidGroupFile(g)), theoryData(g.exportName, comment, g.entries, '@alicerce/content/autoria'));
}
put(
  join('src', 'aprofundamento', 'index.ts'),
  [
    "import type { TheoryExpansion } from '@alicerce/content/autoria';",
    ...paidGroups.map((g) => `import { ${g.exportName} } from './${paidGroupFile(g)}';`),
    '',
    '/** Aprofundamento teórico das aulas pagas, na ordem original. */',
    `export const theoryExpansions: TheoryExpansion[] = [${paidGroups.map((g) => `...${g.exportName}`).join(', ')}];`,
    '',
  ].join('\n'),
);
put(
  join('src', 'autonomia.ts'),
  [
    "import type { AutonomyQuestion } from '@alicerce/content/autoria';",
    '',
    '/** Avaliação de autonomia das aulas pagas (acompanha a autorização do corpo da aula). */',
    `export const autonomyByLesson: Record<string, AutonomyQuestion[]> = ${JSON.stringify(autonomyPaid, null, 2)};`,
    '',
  ].join('\n'),
);
const byFile = new Map<string, string[]>();
for (const l of levelExports) byFile.set(l.rel, [...(byFile.get(l.rel) ?? []), l.name]);
put(
  join('src', 'index.ts'),
  [
    '/**',
    ' * Conteúdo pago do Alicerce: níveis 2 a 14, montados com o aprofundamento teórico',
    ' * e a avaliação de autonomia. O repositório público carrega este arquivo',
    ' * (packages/content/src/privado.ts) e confere FORMATO e os níveis exportados.',
    ' */',
    "import { attachAutonomy, deepenLevels, type Level } from '@alicerce/content/autoria';",
    ...[...byFile].map(([rel, names]) => `import { ${names.join(', ')} } from './${rel.replace(/\\/g, '/')}';`),
    "import { theoryExpansions } from './aprofundamento/index.ts';",
    "import { autonomyByLesson } from './autonomia.ts';",
    '',
    '/** Versão do contrato com o repositório público (PREMIUM_FORMAT em privado.ts). */',
    `export const FORMATO = 1;`,
    '',
    `export const levels: Level[] = attachAutonomy(deepenLevels([${levelExports.map((l) => l.name).join(', ')}], theoryExpansions), autonomyByLesson);`,
    '',
    '/** Fontes cruas, para o verificador de vazamento do público classificar as amostras (scripts/premium/verificar-vazamento.ts). */',
    'export const fontes = { aprofundamento: theoryExpansions, autonomia: autonomyByLesson };',
    '',
  ].join('\n'),
);
for (const [rel, text] of Object.entries(PRIVATE_FILES)) put(rel, text);

/* ---------- 5. prova: o privado carregado é idêntico ao da revisão ---------- */

const paid = await loadPaidLevels(OUT);
if (canon(paid) !== canon(oldPaid)) {
  const a = paid.flatMap((l) => l.modules.flatMap((m) => m.lessons));
  const b = new Map(oldPaid.flatMap((l) => l.modules.flatMap((m) => m.lessons.map((x) => [x.id, x] as const))));
  const diff = a.filter((x) => canon(x) !== canon(b.get(x.id))).map((x) => x.id);
  fail(`o diretório privado não reproduz os níveis pagos da revisão (lições diferentes: ${diff.join(', ') || 'estrutura'})`);
}
const count = (levels: Level[]) => {
  const lessons = levels.flatMap((l) => l.modules.flatMap((m) => m.lessons));
  const exercises = lessons.flatMap((x) => x.sections.flatMap((s) => s.blocks.filter((b) => b.type === 'exercise')));
  return `${levels.length} níveis, ${lessons.length} lições, ${exercises.length} exercícios, ${lessons.reduce((n, x) => n + x.cards.length, 0)} cartões, ${lessons.filter((x) => x.theoryTitle).length} aprofundamentos, ${lessons.reduce((n, x) => n + (x.autonomy?.length ?? 0), 0)} questões de autonomia`;
};
console.log(`revisão ${rev.slice(0, 7)}: privado em ${OUT}`);
console.log(`  pago:     ${count(paid)} — idêntico à revisão`);

/* ---------- 6. --aplicar: retira o conteúdo pago desta árvore ---------- */

if (opt.aplicar) {
  const repo = (rel: string) => join(REPO_ROOT, CONTENT, rel);
  for (const f of paidFiles) rmSync(repo(relative(SRC, f)));
  const modulos = repo('levels/modulos');
  if (existsSync(modulos) && !readdirSync(modulos).length) rmSync(modulos, { recursive: true });

  const freeGroups = groups.map((g) => ({ ...g, entries: g.entries.filter((e) => freeLesson(e.lessonId)) }));
  for (const g of freeGroups) {
    if (!g.file) continue;
    if (g.entries.length) writeFileSync(repo(g.file), theoryData(g.exportName, g.comment, g.entries, '../theory-types.ts'));
    else rmSync(repo(g.file));
  }
  const kept = freeGroups.filter((g) => g.entries.length);
  const initialFree = kept.find((g) => !g.file)?.entries ?? [];
  writeFileSync(
    repo('theory-expansions.ts'),
    [
      "import type { TheoryExpansion } from './theory-types.ts';",
      ...kept.filter((g) => g.file).map((g) => `import { ${g.exportName} } from './${g.file!.replace(/\\/g, '/')}';`),
      '',
      '/**',
      ' * Aprofundamento teórico das aulas gratuitas (níveis 0 e 1). Redação original;',
      ' * pesquisa e limites editoriais em docs/APROFUNDAMENTO_TEORICO.md. O das aulas',
      ' * pagas fica no repositório privado. A montagem está em montagem.ts.',
      ' */',
      `const initialTheoryExpansions: TheoryExpansion[] = ${JSON.stringify(initialFree, null, 2)};`,
      '',
      `export const theoryExpansions: TheoryExpansion[] = [${kept.map((g) => `...${g.exportName}`).join(', ')}];`,
      '',
    ].join('\n'),
  );
  writeFileSync(
    repo('autonomy.ts'),
    [
      "import type { AutonomyQuestion } from './types.ts';",
      '',
      '/** Avaliação de autonomia das aulas gratuitas. A das aulas pagas fica no repositório privado. */',
      `export const autonomyByLesson: Record<string, AutonomyQuestion[]> = ${JSON.stringify(autonomyFree, null, 2)};`,
      '',
    ].join('\n'),
  );
  if (existsSync(repo('theory')) && !readdirSync(repo('theory')).length) rmSync(repo('theory'), { recursive: true });
  writeFileSync(join(REPO_ROOT, CATALOGO_PAGO), gerarCatalogoPago(paid));

  // prova da metade pública: n00/n01 + aprofundamento e autonomia reescritos = níveis 0 e 1 da revisão
  const pub = async <T>(rel: string) => (await import(pathToFileURL(repo(rel)).href)) as T;
  const freeLevels: Level[] = [];
  for (const f of [...freeRoots].sort()) {
    const mod = await pub<Record<string, unknown>>(relative(SRC, f));
    for (const n of levelNumbersOf(f)) freeLevels.push(mod[`level${n}`] as Level);
  }
  freeLevels.sort((a, b) => a.number - b.number);
  const { theoryExpansions: thFree } = await pub<{ theoryExpansions: TheoryExpansion[] }>('theory-expansions.ts');
  const { autonomyByLesson: auFree } = await pub<{ autonomyByLesson: Record<string, AutonomyQuestion[]> }>('autonomy.ts');
  const rebuilt = attachAutonomy(deepenLevels(freeLevels, thFree), auFree);
  if (canon(rebuilt) !== canon(oldFree)) fail('a metade pública reescrita não reproduz os níveis gratuitos da revisão');
  if (canon([...rebuilt, ...paid]) !== canon(old.levels)) fail('público + privado não reproduz o currículo da revisão');
  console.log(`  gratuito: ${count(rebuilt)} — idêntico à revisão`);
  console.log(`  aplicado: ${paidFiles.size} arquivos de lição removidos; theory-expansions.ts, autonomy.ts e ${CATALOGO_PAGO} reescritos.`);
}
rmSync(tmp, { recursive: true, force: true });
