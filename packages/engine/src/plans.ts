/**
 * Planos e direitos de uso (entitlements).
 *
 * O produto decide o que cada plano pode fazer AQUI, num só lugar, e o resto do
 * código pergunta "este usuário pode X?" em vez de "este usuário é premium?".
 * Assim, criar um plano estudantil, institucional ou um período de teste muda
 * esta tabela, não o código espalhado pelas telas e rotas.
 *
 * Princípio do produto: o gratuito ensina a trilha inteira. O pago acrescenta o
 * que tem custo real por usuário (IA) ou dá trabalho extra para produzir
 * (simulados, análises, certificados), nunca bloqueia o básico.
 */

export type PlanId = 'free' | 'premium';

export type Feature =
  | 'trilha-completa'
  | 'exercicios-e-revisao'
  | 'laboratorio'
  | 'tutor-offline'
  | 'tutor-ia'
  | 'sincronizacao'
  | 'analise-detalhada'
  | 'simulado-entrevista'
  | 'certificado';

export type FeatureStatus = 'disponivel' | 'planejado';

export interface FeatureInfo {
  title: string;
  description: string;
  status: FeatureStatus;
}

export const FEATURES: Record<Feature, FeatureInfo> = {
  'trilha-completa': { title: 'Trilha completa, níveis 0 a 14', description: 'Todas as lições, visualizações e projetos.', status: 'disponivel' },
  'exercicios-e-revisao': { title: 'Exercícios e revisão espaçada', description: 'Correção automática, domínio por habilidade e FSRS.', status: 'disponivel' },
  laboratorio: { title: 'Laboratório', description: 'Python, JavaScript e SQL no navegador.', status: 'disponivel' },
  'tutor-offline': { title: 'Tutor com pistas guiadas', description: 'Perguntas e pistas a partir do erro e das dicas do exercício.', status: 'disponivel' },
  'tutor-ia': { title: 'Tutor com IA', description: 'Conversa sobre o seu código, sem entregar a resposta.', status: 'disponivel' },
  sincronizacao: { title: 'Sincronização entre aparelhos', description: 'Progresso salvo na conta.', status: 'disponivel' },
  'analise-detalhada': { title: 'Análise detalhada de desempenho', description: 'Pontos fracos por habilidade, evolução no tempo e plano de estudo sugerido.', status: 'planejado' },
  'simulado-entrevista': { title: 'Simulado de entrevista técnica', description: 'Entrevista cronometrada com avaliação de raciocínio e comunicação.', status: 'planejado' },
  certificado: { title: 'Certificado verificável', description: 'Certificado por nível concluído, com prova de domínio.', status: 'planejado' },
};

export interface PlanDefinition {
  id: PlanId;
  name: string;
  features: Feature[];
  /** perguntas por dia ao tutor com IA; null = usa o padrão configurado no servidor */
  tutorDailyLimit: number | null;
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Gratuito',
    features: ['trilha-completa', 'exercicios-e-revisao', 'laboratorio', 'tutor-offline', 'tutor-ia', 'sincronizacao'],
    tutorDailyLimit: null,
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    features: ['trilha-completa', 'exercicios-e-revisao', 'laboratorio', 'tutor-offline', 'tutor-ia', 'sincronizacao', 'analise-detalhada', 'simulado-entrevista', 'certificado'],
    tutorDailyLimit: 300,
  },
};

export const isPlanId = (x: unknown): x is PlanId => x === 'free' || x === 'premium';

/** Plano em vigor: um plano pago vencido volta a ser o gratuito, sem perder progresso. */
export function effectivePlan(plan: string | null | undefined, expiresAt: number | null | undefined, now = Date.now()): PlanId {
  if (!isPlanId(plan) || plan === 'free') return 'free';
  if (expiresAt != null && expiresAt <= now) return 'free';
  return plan;
}

export interface Entitlements {
  plan: PlanId;
  expiresAt: number | null;
  features: Feature[];
  tutorDailyLimit: number;
}

export function entitlements(plan: PlanId, expiresAt: number | null, defaultTutorLimit: number): Entitlements {
  const def = PLANS[plan];
  return {
    plan,
    expiresAt: plan === 'free' ? null : expiresAt,
    features: def.features.filter((f) => FEATURES[f].status === 'disponivel'),
    tutorDailyLimit: Math.max(def.tutorDailyLimit ?? defaultTutorLimit, defaultTutorLimit),
  };
}

export const can = (e: Entitlements, f: Feature) => e.features.includes(f);
