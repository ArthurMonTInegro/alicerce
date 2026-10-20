/**
 * Currículo completo (níveis 0 a 14) para ferramentas e para o servidor.
 * Só roda em Node: junta os níveis gratuitos deste pacote ao conteúdo pago,
 * carregado do diretório privado (ver privado.ts), e nunca entra no build do site.
 * Sem diretório privado, o "currículo completo" é só a parte pública (níveis 0
 * e 1) e cada ferramenta diz isso na saída.
 */
import { paidCatalog, paidTerms } from './catalogo-pago.ts';
import { toLessonTerms, toLevelMeta } from './catalog.ts';
import { publicLevels, type ExerciseRef } from './curriculum.ts';
import { loadPaidLevels, premiumRequired, PremiumLoadError, PREMIUM_ENV, resolvePremiumDir } from './privado.ts';
import type { Lesson, Level, Module } from './types.ts';

export * from './privado.ts';

const canon = (v: unknown): string =>
  JSON.stringify(v, (_k, x: unknown) =>
    x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))) : x,
  );

/**
 * Diferenças entre os níveis pagos carregados e os metadados públicos versionados
 * (catalogo-pago.ts). Vazio = em dia. Não vazio = rode scripts/premium/metadados.ts.
 */
export function paidCatalogDivergences(paid: Level[]): string[] {
  const out: string[] = [];
  const meta = paid.map(toLevelMeta);
  const byId = new Map(paidCatalog.map((l) => [l.id, l]));
  if (meta.map((l) => l.id).join() !== paidCatalog.map((l) => l.id).join()) out.push(`níveis: privado [${meta.map((l) => l.id)}] × público [${paidCatalog.map((l) => l.id)}]`);
  for (const l of meta) {
    const pub = byId.get(l.id);
    if (!pub) continue;
    if (canon({ ...l, modules: [] }) !== canon({ ...pub, modules: [] })) out.push(`${l.id}: dados do nível`);
    const pubMods = new Map(pub.modules.map((m) => [m.id, m]));
    if (l.modules.map((m) => m.id).join() !== pub.modules.map((m) => m.id).join()) out.push(`${l.id}: lista de módulos`);
    for (const m of l.modules) {
      const pm = pubMods.get(m.id);
      if (!pm) continue;
      if (canon({ ...m, lessons: [] }) !== canon({ ...pm, lessons: [] })) out.push(`${m.id}: dados do módulo`);
      if (m.lessons.map((x) => x.id).join() !== pm.lessons.map((x) => x.id).join()) out.push(`${m.id}: lista de lições`);
      const pl = new Map(pm.lessons.map((x) => [x.id, x]));
      for (const x of m.lessons) if (pl.has(x.id) && canon(x) !== canon(pl.get(x.id))) out.push(`${x.id}: metadados da lição`);
    }
  }
  if (canon(toLessonTerms(paid)) !== canon(paidTerms)) out.push('termos do glossário das lições pagas');
  return out;
}

/* ---------- currículo completo ---------- */

export interface Curriculum {
  /** 'completo' = público + privado; 'publico' = só níveis 0 e 1 (diretório privado ausente). */
  mode: 'completo' | 'publico';
  premiumDir: string | null;
  levels: Level[];
  modules: Module[];
  lessons: Lesson[];
  lessonById: Map<string, Lesson>;
  exercises: ExerciseRef[];
  exerciseById: Map<string, ExerciseRef>;
  /** divergências entre o conteúdo privado e os metadados públicos (vazio quando em dia) */
  divergences: string[];
}

export function assembleCurriculum(levels: Level[], mode: Curriculum['mode'], premiumDir: string | null, divergences: string[] = []): Curriculum {
  const modules = levels.flatMap((l) => l.modules);
  const lessons = modules.flatMap((m) => m.lessons);
  const exercises: ExerciseRef[] = lessons.flatMap((lesson) =>
    lesson.sections.flatMap((s) => s.blocks.flatMap((b) => (b.type === 'exercise' ? [{ exercise: b.exercise, lessonId: lesson.id, moduleId: lesson.moduleId }] : []))),
  );
  return {
    mode,
    premiumDir,
    levels,
    modules,
    lessons,
    lessonById: new Map(lessons.map((l) => [l.id, l])),
    exercises,
    exerciseById: new Map(exercises.map((e) => [e.exercise.id, e])),
    divergences,
  };
}

/**
 * Público + privado, na ordem da trilha. Sem diretório privado devolve só o
 * público (mode 'publico'), a menos que ALICERCE_EXIGIR_PREMIUM=1.
 */
export async function loadCurriculum(opts: { dir?: string | null; require?: boolean } = {}): Promise<Curriculum> {
  const dir = opts.dir === undefined ? resolvePremiumDir() : opts.dir;
  const required = opts.require ?? premiumRequired();
  if (!dir) {
    if (required) throw new PremiumLoadError(`Conteúdo pago exigido, mas nenhum diretório privado foi encontrado (defina ${PREMIUM_ENV}).`);
    return assembleCurriculum(publicLevels, 'publico', null);
  }
  const paid = await loadPaidLevels(dir);
  const levels = [...publicLevels, ...paid].sort((a, b) => a.number - b.number);
  const numbers = levels.map((l) => l.number).join();
  if (numbers !== [...Array(15).keys()].join()) throw new PremiumLoadError(`Níveis montados fora do esperado: ${numbers}`);
  // Conteúdo do privado em formato inesperado (campo novo, bloco malformado...) também é
  // falha de carga do privado: quem chama decide se derruba (EXIGIR) ou segue só com o gratuito.
  try {
    return assembleCurriculum(levels, 'completo', dir, paidCatalogDivergences(paid));
  } catch (e) {
    throw e instanceof PremiumLoadError ? e : new PremiumLoadError(`Conteúdo do repositório privado em formato inesperado: ${(e as Error).message}`);
  }
}

/** Uma linha para o início da saída das ferramentas. */
export function describeCurriculum(c: Curriculum): string {
  return c.mode === 'completo'
    ? `currículo completo: ${c.lessons.length} lições, ${c.exercises.length} exercícios (privado em ${c.premiumDir})`
    : `modo público: só níveis 0 e 1 (${c.lessons.length} lições, ${c.exercises.length} exercícios); diretório privado ausente`;
}
