/**
 * Auditoria do build público (apps/web/dist e src/generated): só as lições
 * gratuitas saem com corpo; as pagas saem como prévia; cartões, base do tutor e
 * catálogo não carregam nada protegido; sourcemaps não incluem o currículo.
 *
 *   node scripts/verify-access-build.ts            # build em apps/web/dist (ou DIST_DIR)
 *
 * Enquanto os níveis 2 a 14 estão abertos na transição
 * (TRANSICAO_ACESSO.niveisPagosAbertos), as lições deles também saem com corpo,
 * como foram publicadas antes da separação: sem aprofundamento teórico nem
 * avaliação de autonomia, que continuam pagos.
 *
 * O build nunca lê o repositório privado, então esta auditoria é estrutural. A
 * busca do TEXTO de cada aula paga no build e nos arquivos versionados fica em
 * scripts/premium/verificar-vazamento.ts, que precisa do diretório privado.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TRANSICAO_ACESSO } from '@alicerce/engine';
import { bodiedLessons, isFreeLesson, isOpenLesson, lessons, openLessons } from '@alicerce/content';

// Pasta do build: apps/web/dist neste repositório (a cópia copiava para dist/ na raiz).
const dist = process.env.DIST_DIR ?? (existsSync('dist/licao') ? 'dist' : 'apps/web/dist');
const generated = 'apps/web/src/generated';
const fail = (msg: string): never => {
  throw new Error(msg);
};
const abertos = TRANSICAO_ACESSO.niveisPagosAbertos;
// "free" aqui = sai com corpo no build: as gratuitas e, na transição, as abertas
const free = lessons.filter((l) => isOpenLesson(l.id));
const paid = lessons.filter((l) => !isOpenLesson(l.id));
if (!free.some((l) => isFreeLesson(l.id))) fail('Mapa do currículo sem lições gratuitas.');
if (abertos ? paid.length : !paid.length) fail(abertos ? 'Níveis 2 a 14 abertos, mas há lição fechada no mapa.' : 'Mapa do currículo sem lições pagas.');
if (!abertos && openLessons.length) fail('Níveis 2 a 14 fechados, mas o pacote público ainda traz aulas abertas (aberto.ts).');
if (abertos && openLessons.length !== lessons.filter((l) => !isFreeLesson(l.id)).length) fail('Níveis 2 a 14 abertos, mas faltam aulas em aberto.ts.');
if (bodiedLessons.some((l) => !isOpenLesson(l.id))) fail('Corpo de lição paga no pacote público.');

const actual = readdirSync(join(generated, 'lessons')).filter((f) => f.endsWith('.json')).sort();
if (JSON.stringify(actual) !== JSON.stringify(free.map((l) => l.id + '.json').sort())) fail('Public lesson set does not match free access policy.');
for (const id of Object.keys(JSON.parse(readFileSync(join(generated, 'cards.json'), 'utf8')))) if (!isOpenLesson(id)) fail('Private review card in public build: ' + id);
for (const doc of JSON.parse(readFileSync(join(generated, 'tutor-knowledge.json'), 'utf8')) as Array<{ id: string }>) if (!isOpenLesson(doc.id)) fail('Private tutor knowledge in public build: ' + doc.id);
// Aulas abertas na transição: só como foram publicadas, sem o material que é pago.
const THEORY_HEADING = '### Aprofundamento teórico:';
for (const l of free.filter((x) => !isFreeLesson(x.id))) {
  const raw = readFileSync(join(generated, 'lessons', l.id + '.json'), 'utf8');
  const json = JSON.parse(raw) as Record<string, unknown>;
  if ('theoryTitle' in json || 'autonomy' in json || raw.includes(THEORY_HEADING)) fail('Paid theory or autonomy in an open lesson: ' + l.id);
}

const BODY_KEYS = ['sections', 'cards', 'objectives', 'terms', 'autonomy'];
const publicCatalog = JSON.parse(readFileSync(join(generated, 'catalog.json'), 'utf8')) as { levels: Array<{ modules: Array<{ lessons: Array<Record<string, unknown>> }> }> };
for (const level of publicCatalog.levels) for (const module of level.modules) for (const lesson of module.lessons) for (const k of BODY_KEYS) if (k in lesson) fail(`Lesson body field "${k}" in public catalog: ${String(lesson.id)}`);

for (const l of paid) {
  const html = readFileSync(`${dist}/licao/${l.id}/index.html`, 'utf8');
  if (!html.includes('CONTINUE SUA EVOLUÇÃO') || html.includes('id="stage-title"')) fail('Protected page was rendered as a lesson: ' + l.id);
}
for (const l of free) {
  const html = readFileSync(`${dist}/licao/${l.id}/index.html`, 'utf8');
  if (!html.includes('id="stage-title"')) fail('Free lesson not rendered: ' + l.id);
}
const CURRICULUM_SOURCE = /packages\/content\/src\/(levels\/|aberto\/|aberto\.ts|curriculum\.ts|tutor-knowledge\.ts|theory-expansions\.ts|autonomy\.ts|theory\/|catalogo-pago\.ts|completo\.ts|privado\.ts)|premium\/src\//;
for (const file of readdirSync(join(dist, 'assets')).filter((f) => f.endsWith('.map'))) {
  const map = JSON.parse(readFileSync(join(dist, 'assets', file), 'utf8')) as { sources?: string[] };
  for (const source of map.sources ?? []) if (CURRICULUM_SOURCE.test(source)) fail('Full curriculum source included in public sourcemap: ' + source);
}
console.log(`Access build verified (${dist}): ${free.length} public lessons${abertos ? ` (${openLessons.length} of levels 2-14 open in the transition, without paid theory or autonomy)` : ''}; ${paid.length} preview-only lessons; public cards, tutor corpus and catalog carry no lesson bodies.`);
