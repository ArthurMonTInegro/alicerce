/**
 * Verificador de vazamento do conteúdo pago. Precisa do diretório privado.
 *
 *   node scripts/premium/verificar-vazamento.ts [--git] [--dist <dir>]... [--json <arquivo>] [--detalhar] [--rascunho <arquivo>]
 *
 * Sem opções: --git e --dist apps/web/dist.
 *
 * Extrai o texto de TODAS as aulas pagas (corpo da aula, enunciados, soluções e
 * explicações, dicas, testes, cartões, objetivos, aprofundamento teórico e
 * avaliação de autonomia) e procura cada trecho:
 *   --git   em todos os arquivos versionados do repositório público (git ls-files);
 *   --dist  em todos os arquivos de um build (HTML, JS, JSON, sourcemaps...).
 *
 * Como compara: cada texto vira sequências de 8 palavras (ou o texto inteiro, se
 * tiver de 5 a 7 palavras), em minúsculas, ignorando pontuação, espaços e
 * marcação. Os arquivos passam pela mesma normalização depois de decodificar
 * escapes de JS/JSON (\n, \uXXXX, \") e entidades/tags HTML; assim um trecho é
 * achado em código-fonte, JSON, bundle minificado, sourcemap ou página
 * renderizada. Sequências que também existem no conteúdo legitimamente público
 * (aulas gratuitas, mapa do currículo, glossário, projetos, referências...) são
 * descartadas e contadas à parte. Textos com menos de 5 palavras (ex.: resposta
 * "15") não geram amostra e também são contados.
 *
 * Sequências pouco informativas (menos de 3 palavras distintas com 4+ caracteres,
 * como "0 1 0 0 1 0 1 1" ou "true false true...") também ficam de fora.
 *
 * Coincidências revisadas: uma aula paga pode citar algo que já é público por
 * outro motivo (um exemplo do laboratório, a legenda de uma visualização, o YAML
 * do CI, um cabeçalho de segurança). Essas sequências ficam em
 * scripts/premium/vazamento-revisado.json, só como hash SHA-256 (o arquivo não
 * contém texto pago), cada grupo com o motivo. Ocorrência fora dessa lista
 * reprova. --rascunho <arquivo> grava as ocorrências não revisadas no formato da
 * lista, para uma pessoa revisar e justificar.
 *
 * Enquanto os níveis 2 a 14 estão abertos na transição
 * (TRANSICAO_ACESSO.niveisPagosAbertos), as aulas deles como foram publicadas
 * antes da separação (packages/content/src/aberto/) também são públicas. O que
 * continua protegido é o que só o privado tem: o aprofundamento teórico, a
 * avaliação de autonomia e as revisões feitas nas aulas depois da separação.
 *
 * Antes de procurar, o script prova que o detector funciona (controles
 * positivos: um JSON, um HTML escapado, um bundle com escapes \u e um
 * arquivo-fonte do privado têm de ser acusados). Sai com 1 se achar trecho pago
 * não revisado, 2 se faltar o privado, 3 se um controle positivo falhar.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import * as pub from '../../packages/content/src/index.ts';
import { paidCatalog, paidTerms } from '../../packages/content/src/catalogo-pago.ts';
import { loadPaidModule, PREMIUM_ENV, REPO_ROOT, resolvePremiumDir } from '../../packages/content/src/privado.ts';
import type { Exercise, Lesson } from '../../packages/content/src/types.ts';

const { values: opt } = parseArgs({
  options: {
    git: { type: 'boolean', default: false },
    dist: { type: 'string', multiple: true, default: [] },
    json: { type: 'string' },
    rascunho: { type: 'string' },
    detalhar: { type: 'boolean', default: false },
  },
});
const targets = { git: opt.git, dists: opt.dist ?? [] };
if (!targets.git && !targets.dists.length) {
  targets.git = true;
  targets.dists = [join(REPO_ROOT, 'apps/web/dist')];
}

const dir = resolvePremiumDir();
if (!dir) {
  console.error(`✘ o verificador precisa do conteúdo pago: defina ${PREMIUM_ENV} ou clone o repositório privado em ${join(REPO_ROOT, 'premium')}`);
  process.exit(2);
}

/* ---------- normalização e sequências ---------- */

const N = 8;
const MIN = 5;
/** Ocorrências listadas uma a uma por alvo; acima disso, só o resumo (a lista inteira vai para --json e --rascunho). */
const MAX_LISTED = 40;
const decodeEscapes = (s: string) =>
  s.replace(/\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)/g, (_m, e: string) => {
    if (e[0] === 'u' && e.length > 1) return String.fromCodePoint(parseInt(e.replace(/[u{}]/g, ''), 16));
    if (e[0] === 'x' && e.length === 3) return String.fromCharCode(parseInt(e.slice(1), 16));
    return e === 'n' || e === 'r' || e === 't' ? ' ' : e;
  });
const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decodeHtml = (s: string) =>
  s
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[0-9a-fA-F]+|#\d+|[a-z]+);/g, (m, e: string) => (e[0] === '#' ? String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : (ENTITIES[e] ?? m)));
const tokens = (s: string) => s.normalize('NFC').toLowerCase().match(/[\p{L}\p{N}_]+/gu) ?? [];

const informative = (shingle: string) => new Set(shingle.split(' ').filter((w) => w.length >= 4 && /\p{L}/u.test(w))).size >= 3;
export const hashOf = (shingle: string) => createHash('sha256').update(shingle).digest('hex').slice(0, 24);

/** Sequências de um texto de conteúdo: janelas de N palavras, ou o texto todo se tiver MIN..N-1 palavras. */
function shinglesOf(text: string): string[] {
  const t = tokens(text);
  if (t.length < MIN) return [];
  if (t.length < N) return [t.join(' ')];
  const out: string[] = [];
  for (let i = 0; i + N <= t.length; i++) out.push(t.slice(i, i + N).join(' '));
  return out;
}

/* ---------- amostras de todas as aulas pagas ---------- */

type Cat = 'corpo da aula' | 'objetivo' | 'enunciado' | 'solução e explicação' | 'dica' | 'teste' | 'cartão' | 'aprofundamento' | 'autonomia';
const CATS: Cat[] = ['corpo da aula', 'objetivo', 'enunciado', 'solução e explicação', 'dica', 'teste', 'cartão', 'aprofundamento', 'autonomia'];
interface Sample {
  cat: Cat;
  lessonId: string;
}

const { levels: paidLevels, fontes } = await loadPaidModule(dir);
const paidLessons: Lesson[] = paidLevels.flatMap((l) => l.modules.flatMap((m) => m.lessons));
const texts: Array<{ cat: Cat; lessonId: string; text: string }> = [];
const add = (cat: Cat, lessonId: string, ...items: Array<string | undefined>) => {
  for (const text of items) if (text) texts.push({ cat, lessonId, text });
};
const theoryTexts = new Set<string>();
const theoryByLesson = new Map((fontes.aprofundamento ?? []).map((e) => [e.lessonId, e]));
for (const e of fontes.aprofundamento ?? []) {
  for (const t of [e.prerequisite, e.objective, e.explanation, e.worked, e.misconception, e.question, e.feedback, e.extension, ...(e.table ? [e.table.caption, ...e.table.head, ...e.table.rows.flat()] : [])]) theoryTexts.add(t);
}

const theoryLong = [...theoryTexts].filter((t) => t.length >= 30);

function exerciseTexts(lessonId: string, e: Exercise) {
  add('enunciado', lessonId, e.prompt);
  add('dica', lessonId, ...e.hints);
  add('solução e explicação', lessonId, e.explanation);
  switch (e.kind) {
    case 'mcq':
      add('enunciado', lessonId, e.code?.code, ...e.options.map((o) => o.text));
      add('solução e explicação', lessonId, ...e.options.map((o) => o.feedback));
      break;
    case 'predict':
      add('enunciado', lessonId, e.code);
      add('solução e explicação', lessonId, e.answer);
      break;
    case 'code':
    case 'fix':
      add('enunciado', lessonId, e.starter, e.stdin);
      add('solução e explicação', lessonId, e.solution);
      add('teste', lessonId, ...e.tests.map((t) => t.code));
      break;
    case 'parsons':
      add('solução e explicação', lessonId, e.lines.join('\n'));
      break;
    case 'fill':
      add('enunciado', lessonId, e.template);
      add('solução e explicação', lessonId, ...e.blanks.map((b) => b.join(' ')));
      break;
    case 'sql':
      add('enunciado', lessonId, e.setup, e.starter);
      add('solução e explicação', lessonId, e.solution);
      break;
  }
}

for (const l of paidLessons) {
  add('objetivo', l.id, ...l.objectives);
  for (const s of l.sections)
    for (const b of s.blocks) {
      switch (b.type) {
        case 'md':
        case 'callout':
          // blocos do aprofundamento entram na categoria dele (pelas fontes cruas)
          if (!theoryLong.some((t) => b.text.includes(t))) add('corpo da aula', l.id, b.text);
          break;
        case 'code':
        case 'trace':
          add('corpo da aula', l.id, b.code, b.caption);
          break;
        case 'table':
          if (!b.rows.flat().every((c) => theoryTexts.has(c))) add('corpo da aula', l.id, b.caption, ...b.head, ...b.rows.flat());
          break;
        case 'exercise':
          exerciseTexts(l.id, b.exercise);
          break;
        // 'terms' (glossário, recurso aberto), 'viz' e 'project' não têm texto protegido
      }
    }
  for (const c of l.cards) add('cartão', l.id, c.front, c.back);
  const th = theoryByLesson.get(l.id);
  if (th) add('aprofundamento', l.id, th.prerequisite, th.objective, th.explanation, th.worked, th.misconception, th.question, th.feedback, th.extension, ...(th.table ? [th.table.caption, ...th.table.rows.flat()] : []));
  for (const q of l.autonomy ?? []) add('autonomia', l.id, q.prompt, q.explain, q.transfer, ...q.wrong.map((w) => w.feedback));
}

/* ---------- o que é legitimamente público ---------- */

const allowed = new Set<string>();
const allowText = (s: string) => {
  const t = tokens(s);
  for (let n = MIN; n <= N; n++) for (let i = 0; i + n <= t.length; i++) allowed.add(t.slice(i, i + n).join(' '));
};
const publicData = {
  mapa: pub.levels,
  // o mapa dos níveis pagos completos (catalogo-pago.ts) é público mesmo quando o mapa em vigor vem das aulas abertas
  mapaPago: paidCatalog,
  aulasGratuitas: pub.publicLevels,
  // vazio com os níveis 2 a 14 fechados
  aulasAbertasNaTransicao: pub.openLevels,
  glossario: pub.glossary,
  projetos: pub.projects,
  referencias: pub.references,
  diagnostico: pub.diagnosticItems,
  entrevistas: pub.interviewQuestions,
  pesquisa: [pub.countryCurricula, pub.universityPrograms, pub.learningEvidence],
  laboratorioSql: pub.SETUP_ESCOLA,
  // termos PT → EN de cada lição paga (catalogo-pago.ts): o glossário é recurso aberto
  termosPagos: paidTerms,
  // linhas de fonte que a montagem (montagem.ts) gera a partir das referências públicas
  fontes: pub.references.map((r) => `- [${r.title}](${r.url}) — ${r.org}`),
};
const str = (x: unknown) => (typeof x === 'string' ? x : '');
const walkStrings = (v: unknown): void => {
  if (typeof v === 'string') allowText(v);
  else if (Array.isArray(v)) {
    // lista de textos (linhas de um Parsons, lacunas, células de uma linha de tabela): o build as escreve em sequência
    if (v.length > 1 && v.every((x) => typeof x === 'string')) allowText(v.join(' '));
    v.forEach(walkStrings);
  }
  else if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    // Termo bilíngue: o glossário (página pública) e a sintaxe {{pt|en}} mostram os campos em sequência.
    if (str(o.pt) && str(o.en)) allowText([o.pt, o.en, o.def, o.example].map(str).join(' '));
    Object.values(o).forEach(walkStrings);
  }
};
walkStrings(publicData);
// Referência citada: as páginas públicas (/referencias, /sobre) e as aulas escrevem título e instituição lado a lado.
for (const r of pub.references) for (const t of [`${r.org} ${r.title}`, `${r.title} ${r.org}`, `${r.title} (${r.org})`]) allowText(t);

const samples = new Map<string, Sample>();
const perCat = new Map<Cat, { texts: number; short: number; shingles: number; dropped: number; weak: number; lessons: Set<string> }>(CATS.map((c) => [c, { texts: 0, short: 0, shingles: 0, dropped: 0, weak: 0, lessons: new Set() }]));
for (const { cat, lessonId, text } of texts) {
  const st = perCat.get(cat)!;
  st.texts++;
  const sh = shinglesOf(text);
  if (!sh.length) st.short++;
  for (const s of sh) {
    if (allowed.has(s)) {
      st.dropped++;
      continue;
    }
    if (!informative(s)) {
      st.weak++;
      continue;
    }
    st.shingles++;
    st.lessons.add(lessonId);
    if (!samples.has(s)) samples.set(s, { cat, lessonId });
  }
}
const lengths = new Set([...samples.keys()].map((k) => k.split(' ').length));

/* ---------- busca ---------- */

interface Hit {
  file: string;
  shingle: string;
  cat: Cat;
  lessonId: string;
}
function scanText(raw: string, file: string, maxHits = Infinity): Hit[] {
  let text = decodeEscapes(raw);
  if (/\.(html?|svg|xml)$/i.test(file)) text = decodeHtml(text);
  const t = tokens(text);
  const hits: Hit[] = [];
  for (const n of lengths)
    for (let i = 0; i + n <= t.length; i++) {
      const s = t.slice(i, i + n).join(' ');
      const hit = samples.get(s);
      if (hit) {
        hits.push({ file, shingle: s, ...hit });
        if (hits.length >= maxHits) return hits;
      }
    }
  return hits;
}
const isBinary = (buf: Buffer) => buf.subarray(0, 8000).includes(0);
function scanFiles(files: Array<{ abs: string; rel: string }>) {
  const hits: Hit[] = [];
  let scanned = 0;
  let binary = 0;
  for (const f of files) {
    if (!existsSync(f.abs) || !statSync(f.abs).isFile()) continue;
    const buf = readFileSync(f.abs);
    if (isBinary(buf)) {
      binary++;
      continue;
    }
    scanned++;
    // sem spread: um vazamento grande dá centenas de milhares de ocorrências e estouraria a pilha
    for (const h of scanText(buf.toString('utf8'), f.rel)) hits.push(h);
  }
  return { hits, scanned, binary };
}
const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));

/* ---------- controles positivos: o detector precisa acusar conteúdo pago ---------- */

// Com os níveis 2 a 14 abertos, o corpo publicado das aulas é público: os controles usam o que só o privado tem.
const openIds = new Set(pub.openLevels.flatMap((l) => l.modules.flatMap((m) => m.lessons.map((x) => x.id))));
/** A aula tem algo que só o privado traz: ela não está aberta, ou tem aprofundamento ou autonomia. */
const onlyPrivate = (l: Lesson) => !openIds.has(l.id) || theoryByLesson.has(l.id) || !!l.autonomy?.length;
const probe = paidLessons.find((l) => l.cards.length && l.sections.some((s) => s.blocks.some((b) => b.type === 'exercise')) && onlyPrivate(l))!;
const probeOpen = openIds.has(probe.id);
const probeBody: unknown = probeOpen ? { aprofundamento: theoryByLesson.get(probe.id), autonomia: probe.autonomy } : probe.sections;
const probeExtra: unknown = probeOpen ? probe.autonomy ?? theoryByLesson.get(probe.id) : probe.cards;
const controls: Array<[string, string, string]> = [
  ['JSON de uma aula paga', `${probe.id}.json`, JSON.stringify(probe)],
  ['HTML com o corpo escapado', 'pagina.html', `<p>${JSON.stringify(probeBody).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')}</p>`],
  ['bundle JS com \\u escapes', 'bundle.js', `var x=${JSON.stringify(JSON.stringify(probeExtra)).replace(/[^\x00-\x7f]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'))};`],
];
const sourceFile = walk(join(dir, 'src', openIds.size && existsSync(join(dir, 'src', 'aprofundamento')) ? 'aprofundamento' : 'levels')).find((f) => f.endsWith('.ts'))!;
controls.push(['arquivo-fonte do privado', relative(dir, sourceFile), readFileSync(sourceFile, 'utf8')]);
for (const [label, name, text] of controls) {
  if (!scanText(text, name, 1).length) {
    console.error(`✘ controle positivo falhou (${label}): o detector não acusou conteúdo pago. Verificação inválida.`);
    process.exit(3);
  }
}

/* ---------- relatório ---------- */

const out: string[] = [];
const say = (s: string) => {
  out.push(s);
  console.log(s);
};
say(`Verificação de vazamento do conteúdo pago (${dir})`);
say(`  ${paidLessons.length} aulas pagas, ${texts.length} textos, ${samples.size} sequências distintas de ${[...lengths].sort().join('/')} palavras`);
say(`  controles positivos: ${controls.length} de ${controls.length} acusados (JSON, HTML escapado, JS com \\u, fonte TS)`);
for (const c of CATS) {
  const st = perCat.get(c)!;
  say(`  ${c.padEnd(22)} ${String(st.texts).padStart(5)} textos  ${String(st.shingles).padStart(7)} sequências  ${String(st.lessons.size).padStart(3)} aulas  (curtos: ${st.short}; comuns ao público: ${st.dropped}; pouco informativas: ${st.weak})`);
}
const withSamples = new Set([...samples.values()].map((s) => s.lessonId));
// Com os níveis abertos, só precisa de amostra a aula que tem algo que só o privado traz.
const mustHave = paidLessons.filter(onlyPrivate);
const missing = mustHave.filter((l) => !withSamples.has(l.id)).map((l) => l.id);
say(`  aulas pagas com amostra: ${withSamples.size} de ${paidLessons.length}${openIds.size ? ` (níveis 2 a 14 abertos na transição: exigida nas ${mustHave.length} que têm algo só do privado)` : ''}${missing.length ? ` (sem amostra: ${missing.join(', ')})` : ''}`);

interface Reviewed {
  onde: string;
  motivo: string;
  sequencias: string[];
}
const REVIEWED_FILE = join(REPO_ROOT, 'scripts/premium/vazamento-revisado.json');
const reviewedGroups: Reviewed[] = existsSync(REVIEWED_FILE) ? (JSON.parse(readFileSync(REVIEWED_FILE, 'utf8')) as { grupos: Reviewed[] }).grupos : [];
const reviewed = new Map(reviewedGroups.flatMap((g) => g.sequencias.map((h) => [h, g] as const)));
const usedReviewed = new Set<string>();

let failed = missing.length > 0;
const pending: Hit[] = [];
const report: Record<string, unknown> = { privado: dir, aulas: paidLessons.length, sequencias: samples.size, alvos: [] as unknown[] };
function judge(label: string, r: { hits: Hit[]; scanned: number; binary: number }) {
  const known = r.hits.filter((h) => reviewed.has(hashOf(h.shingle)));
  const fresh = r.hits.filter((h) => !reviewed.has(hashOf(h.shingle)));
  for (const h of known) usedReviewed.add(hashOf(h.shingle));
  const byFile = new Map<string, Set<string>>();
  for (const h of known) byFile.set(h.file, (byFile.get(h.file) ?? new Set()).add(reviewed.get(hashOf(h.shingle))!.onde));
  say(`  ${label}: ${r.scanned} arquivos de texto lidos, ${r.binary} binários ignorados → ${fresh.length} ocorrência(s) não revisada(s); ${known.length} coincidência(s) revisada(s) em ${byFile.size} arquivo(s)`);
  for (const [file, origins] of byFile) say(`    · ${file}: coincidência revisada (${[...origins].join('; ')})`);
  // --detalhar: mostra o texto de cada coincidência revisada, para auditar a lista (só no terminal; nunca grave isto no público)
  if (opt.detalhar) for (const h of known) console.log(`      ${h.file} [${h.cat}] ${h.lessonId}: "${h.shingle}"`);
  for (const h of fresh.slice(0, MAX_LISTED)) say(`    ✘ ${h.file}: [${h.cat}] ${h.lessonId}: "${h.shingle}"`);
  if (fresh.length > MAX_LISTED) {
    // Vazamento grande: resumo por arquivo, categoria e aula (a lista completa vai para --json/--rascunho).
    const files = new Map<string, number>();
    for (const h of fresh) files.set(h.file, (files.get(h.file) ?? 0) + 1);
    say(`    … mais ${fresh.length - MAX_LISTED} ocorrência(s) não revisada(s), em ${files.size} arquivo(s):`);
    for (const [file, n] of [...files].sort((a, b) => b[1] - a[1]).slice(0, MAX_LISTED)) say(`    ✘ ${file}: ${n}`);
    if (files.size > MAX_LISTED) say(`    … e mais ${files.size - MAX_LISTED} arquivo(s)`);
    const cats = new Map<string, number>();
    for (const h of fresh) cats.set(h.cat, (cats.get(h.cat) ?? 0) + 1);
    say(`    categorias: ${[...cats].map(([c, n]) => `${c} ${n}`).join('; ')}; aulas pagas atingidas: ${new Set(fresh.map((h) => h.lessonId)).size}`);
  }
  (report.alvos as unknown[]).push({ alvo: label, arquivos: r.scanned, binarios: r.binary, naoRevisadas: fresh, revisadas: known.length });
  for (const h of fresh) pending.push(h);
  failed ||= fresh.length > 0;
}
if (targets.git) {
  const files = execFileSync('git', ['ls-files', '-z'], { cwd: REPO_ROOT, encoding: 'utf8' })
    .split('\0')
    .filter(Boolean)
    .map((rel) => ({ abs: join(REPO_ROOT, rel), rel }));
  judge(`git ls-files (${REPO_ROOT})`, scanFiles(files));
}
for (const d of targets.dists) {
  const abs = resolve(d);
  if (!existsSync(abs)) {
    say(`  ✘ build não encontrado: ${abs}`);
    failed = true;
    continue;
  }
  judge(`build ${abs}`, scanFiles(walk(abs).map((f) => ({ abs: f, rel: relative(abs, f) }))));
}
const stale = [...reviewed.keys()].filter((h) => !usedReviewed.has(h));
if (stale.length && targets.git) say(`  (aviso) ${stale.length} sequência(s) da lista revisada não apareceram nesta execução; podem ser removidas se o conteúdo mudou.`);
say(failed ? '✘ VAZAMENTO (ou cobertura incompleta): veja acima.' : '✓ nenhum trecho das aulas pagas nos alvos verificados, fora as coincidências revisadas.');
if (opt.json) writeFileSync(opt.json, JSON.stringify({ ...report, saida: out }, null, 2));
if (opt.rascunho) {
  const groups = new Map<string, Reviewed>();
  for (const h of pending) {
    const g = groups.get(h.file) ?? { onde: h.file, motivo: 'REVISAR: explique por que este trecho já é público por outro motivo, ou retire-o do arquivo', sequencias: [] };
    if (!g.sequencias.includes(hashOf(h.shingle))) g.sequencias.push(hashOf(h.shingle));
    groups.set(h.file, g);
  }
  writeFileSync(opt.rascunho, JSON.stringify({ grupos: [...groups.values()] }, null, 2) + '\n');
  console.log(`rascunho com ${groups.size} grupo(s) em ${opt.rascunho}`);
}
process.exit(failed ? 1 : 0);
