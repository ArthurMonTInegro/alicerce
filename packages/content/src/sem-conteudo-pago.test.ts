/**
 * Guarda estrutural do repositório público, que roda sem o privado (CI público,
 * build da imagem Docker): nenhum arquivo desta árvore DEFINE lição, exercício,
 * cartão, aprofundamento ou avaliação de autonomia de aula paga. Os ids são
 * públicos (mapa do currículo), mas uma definição (`id: <id pago>`, `lessonId:
 * <id pago>` ou `<id da lição paga>: [` entre aspas) só aparece onde o conteúdo é
 * escrito, e esse lugar agora é o repositório privado.
 *
 * A busca do TEXTO das aulas pagas (scripts/premium/verificar-vazamento.ts) precisa
 * do privado e roda no CI dele; esta guarda pega cedo o caso mais provável de
 * regressão: um arquivo de lição (ou parte dele) copiado de volta para cá.
 *
 * Exceção da transição: enquanto os níveis 2 a 14 estão abertos, aberto/ traz as
 * aulas desses níveis como foram publicadas. Lá pode haver definição de lição, mas
 * não de aprofundamento (`lessonId:`) nem de avaliação de autonomia (`'<id>': [`),
 * que são pagos. Com os níveis fechados, a pasta não pode existir.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TRANSICAO_ACESSO } from '@alicerce/engine';
import { exercises, isFreeLesson, lessons, openLevels } from './index.ts';
import { REPO_ROOT, resolvePremiumDir } from './privado.ts';
import { paidCatalog } from './catalogo-pago.ts';
import { toLevelMeta } from './catalog.ts';

/** Arquivos que podem citar ids pagos em definições: o mapa público gerado. */
const ALLOWED = new Set(['packages/content/src/catalogo-pago.ts']);
const ABERTO = 'packages/content/src/aberto/';
/** Definições que nunca podem aparecer em aberto/: aprofundamento e avaliação de autonomia. */
const PAID_EXTRA = /(?:"lessonId"|\blessonId)\s*:\s*["'`]([a-z0-9-]+)["'`]|["'`]([a-z0-9-]+)["'`]\s*:\s*\[/g;
const SKIP_NAMES = new Set(['node_modules', '.git', 'dist', 'dist-ssr', 'test-results', 'playwright-report', 'coverage', '__pycache__']);
const premium = resolvePremiumDir();
const SKIP_PATHS = new Set(['premium', 'apps/web/src/generated', 'apps/web/public/pyodide', ...(premium ? [relative(REPO_ROOT, premium).split(sep).join('/')] : [])]);
const TEXT = /\.(ts|tsx|mts|js|mjs|cjs|json|md|py|ya?ml|html|css|txt)$/;

const paidIds = new Set([...lessons.filter((l) => !isFreeLesson(l.id)).map((l) => l.id), ...exercises.filter((e) => !isFreeLesson(e.lessonId)).map((e) => e.exercise.id)]);
/** `id: '…'`, `"id": "…"`, `lessonId: '…'` (com `#n` opcional, para cartões) ou `'…': [` (avaliação por lição). */
const DEFINITION = /(?:"id"|\bid|"lessonId"|\blessonId)\s*:\s*["'`]([a-z0-9-]+)(?:#\d+)?["'`]|["'`]([a-z0-9-]+)["'`]\s*:\s*\[/g;

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const abs = join(dir, e.name);
    const rel = relative(REPO_ROOT, abs).split(sep).join('/');
    if (e.isDirectory()) return SKIP_NAMES.has(e.name) || SKIP_PATHS.has(rel) ? [] : files(abs);
    return e.isFile() && TEXT.test(e.name) ? [rel] : [];
  });
}

/** Ids pagos definidos em cada arquivo. */
function paidDefinitions(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(DEFINITION)) {
    const id = m[1] ?? m[2]!;
    if (paidIds.has(id)) out.add(id);
  }
  return [...out];
}

describe('repositório público sem conteúdo pago (guarda estrutural)', () => {
  it('reconhece uma definição de lição, exercício, cartão, aprofundamento e autonomia pagos', () => {
    const lesson = lessons.find((l) => !isFreeLesson(l.id) && l.exercises.length)!;
    const ex = lesson.exercises[0]!.id;
    expect(paidDefinitions(`lesson({ id: '${lesson.id}', title: 'x' })`)).toEqual([lesson.id]);
    expect(paidDefinitions(`{ "id": "${ex}", "prompt": "..." }`)).toEqual([ex]);
    expect(paidDefinitions(`{ id: \`${lesson.id}#2\`, front: 'f' }`)).toEqual([lesson.id]);
    expect(paidDefinitions(`{ "level": 2, "lessonId": "${lesson.id}" }`)).toEqual([lesson.id]);
    expect(paidDefinitions(`export const autonomyByLesson = { '${lesson.id}': [ { id: 'q' } ] }`)).toEqual([lesson.id]);
    // citar o id (link, URL, teste de acesso) não é definir conteúdo
    expect(paidDefinitions(`<Link to="/licao/${lesson.id}">; fetch('/api/content/lessons/${lesson.id}'); exerciseById.get('${ex}')`)).toEqual([]);
    // ids das aulas gratuitas não contam
    const free = lessons.find((l) => isFreeLesson(l.id))!;
    expect(paidDefinitions(`lesson({ id: '${free.id}' })`)).toEqual([]);
  });

  it('nenhum arquivo do repositório define lição, exercício, cartão, aprofundamento ou autonomia de aula paga', () => {
    const all = files(REPO_ROOT);
    expect(all).toContain('packages/content/src/catalogo-pago.ts');
    expect(all.length).toBeGreaterThan(100);
    const abertos = TRANSICAO_ACESSO.niveisPagosAbertos;
    const found = all.filter((rel) => !ALLOWED.has(rel) && !(abertos && rel.startsWith(ABERTO))).flatMap((rel) => {
      const ids = paidDefinitions(readFileSync(join(REPO_ROOT, rel), 'utf8'));
      return ids.length ? [`${rel}: ${ids.slice(0, 5).join(', ')}${ids.length > 5 ? ` (+${ids.length - 5})` : ''}`] : [];
    });
    expect(found).toEqual([]);
  });

  it('aberto/: só existe com os níveis 2 a 14 abertos, sem aprofundamento nem autonomia, e com os ids do mapa', () => {
    const dir = join(REPO_ROOT, ABERTO);
    if (!TRANSICAO_ACESSO.niveisPagosAbertos) {
      expect(existsSync(dir)).toBe(false);
      expect(openLevels).toEqual([]);
      return;
    }
    const arquivos = files(dir).filter((rel) => rel.startsWith(ABERTO));
    expect(arquivos.length).toBeGreaterThan(20);
    const extras = arquivos.flatMap((rel) => {
      const ids = [...readFileSync(join(REPO_ROOT, rel), 'utf8').matchAll(PAID_EXTRA)].map((m) => m[1] ?? m[2]!).filter((id) => paidIds.has(id));
      return ids.length ? [`${rel}: ${ids.slice(0, 5).join(', ')}`] : [];
    });
    expect(extras).toEqual([]);
    for (const l of openLevels.flatMap((x) => x.modules.flatMap((m) => m.lessons))) {
      expect(l.theoryTitle, l.id).toBeUndefined();
      expect(l.autonomy, l.id).toBeUndefined();
    }
    // mesma estrutura do mapa (ids de lições, exercícios e cartões, etapas, pré-requisitos): o progresso continua valendo
    const sig = (ls: ReturnType<typeof toLevelMeta>[]) =>
      ls.flatMap((l) => [`${l.id}:${l.number}`, ...l.modules.flatMap((m) => [`${m.id}<${m.prerequisites.join()}`, ...m.lessons.flatMap((x) => [`${x.id}#${x.cardCount}[${x.stages.join()}]`, ...x.exercises.map((e) => `${e.id}/${e.kind}/${e.stage}`)])])]);
    expect(sig(openLevels.map(toLevelMeta))).toEqual(sig(paidCatalog));
  });
});
