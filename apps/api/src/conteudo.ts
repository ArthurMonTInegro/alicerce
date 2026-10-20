/**
 * Corpo das aulas no servidor. O das gratuitas vem do pacote público; o das
 * pagas, do repositório privado carregado na inicialização (ALICERCE_PREMIUM_DIR,
 * ver packages/content/src/privado.ts). Sem o diretório privado o servidor sobe
 * do mesmo jeito, com premium = 'indisponivel'.
 *
 * Este módulo NÃO autoriza nada: app.ts confere sessão e plano no banco a cada
 * pedido antes de pedir qualquer corpo pago daqui. Mesmo assim, `isPaid` decide
 * pelo mapa público E pelo nível em que o corpo foi carregado (o mais restritivo).
 */
import { canAccessLevel, type PlanId } from '@alicerce/engine';
import { buildTutorKnowledge, isFreeLesson, lessonById, publicLevels, type ExerciseRef, type Flashcard, type Lesson, type TutorDoc } from '@alicerce/content';
import { assembleCurriculum, describeCurriculum, loadCurriculum, PremiumLoadError, premiumRequired, type Curriculum } from '@alicerce/content/completo';

export interface ContentStore {
  /** 'disponivel' quando o corpo das aulas pagas foi carregado do diretório privado. */
  readonly premium: 'disponivel' | 'indisponivel';
  /** uma linha para o log de inicialização */
  readonly description: string;
  /** Aula paga? (mapa público ou nível do corpo carregado; na dúvida, paga). Lição inexistente também conta como paga. */
  isPaid(lessonId: string): boolean;
  /** Corpo da lição, se carregado. Quem chama já conferiu o acesso. */
  lesson(id: string): Lesson | undefined;
  /** Exercício completo (enunciado, dicas, testes, solução), se carregado. Quem chama já conferiu o acesso. */
  exercise(id: string): ExerciseRef | undefined;
  /** Cartões de revisão das lições que o plano pode ler. */
  cards(plan: PlanId): Record<string, Flashcard[]>;
  /** Base do tutor (só prosa das lições) que o plano pode ler. */
  knowledge(plan: PlanId): TutorDoc[];
}

export function contentStore(c: Curriculum): ContentStore {
  const levelOfBody = new Map(c.levels.flatMap((l) => l.modules.flatMap((m) => m.lessons.map((x) => [x.id, l.number] as const))));
  const docs = buildTutorKnowledge(c.lessons);
  const isPaid = (id: string) => {
    const n = levelOfBody.get(id);
    return !isFreeLesson(id) || (n !== undefined && !canAccessLevel('free', n));
  };
  const readable = (plan: PlanId, id: string) => lessonById.has(id) && (plan === 'premium' || !isPaid(id));
  return {
    premium: c.mode === 'completo' ? 'disponivel' : 'indisponivel',
    description: describeCurriculum(c),
    isPaid,
    lesson: (id) => c.lessonById.get(id),
    exercise: (id) => c.exerciseById.get(id),
    cards: (plan) => Object.fromEntries(c.lessons.filter((l) => readable(plan, l.id)).map((l) => [l.id, l.cards])),
    knowledge: (plan) => docs.filter((d) => readable(plan, d.id)),
  };
}

/** Só os níveis gratuitos (servidor sem o diretório privado; padrão nos testes). */
export const publicContent: ContentStore = contentStore(assembleCurriculum(publicLevels, 'publico', null));

/**
 * Carrega o conteúdo na inicialização. Falha ao carregar o privado não derruba o
 * servidor (os níveis gratuitos continuam no ar), a menos que
 * ALICERCE_EXIGIR_PREMIUM=1. Devolve também avisos para o log.
 */
export async function loadContentStore(dir: string | null, env: NodeJS.ProcessEnv = process.env): Promise<{ store: ContentStore; warnings: string[] }> {
  try {
    const c = await loadCurriculum({ dir, require: premiumRequired(env) });
    const warnings = c.divergences.length
      ? [`mapa público desatualizado em relação ao privado (${c.divergences.length} diferença(s), ex.: ${c.divergences[0]}); rode node scripts/premium/metadados.ts. Lições fora do mapa não são servidas.`]
      : [];
    if (c.mode === 'publico') warnings.push('conteúdo pago indisponível: diretório privado não configurado (ALICERCE_PREMIUM_DIR). Assinantes recebem 503 nas aulas pagas.');
    let store: ContentStore;
    try {
      store = contentStore(c);
    } catch (e) {
      throw new PremiumLoadError(`Conteúdo do repositório privado em formato inesperado: ${(e as Error).message}`);
    }
    return { store, warnings };
  } catch (e) {
    if (e instanceof PremiumLoadError && !premiumRequired(env)) {
      return { store: publicContent, warnings: [`conteúdo pago indisponível: ${e.message}`] };
    }
    throw e;
  }
}
