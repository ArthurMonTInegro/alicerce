/** Política comercial v3: fundamentos gratuitos, continuidade por assinatura. */
export type PlanId = 'free' | 'premium';

export type Feature =
  | 'trilha-inicial'
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
  'trilha-inicial': { title: 'Trilha Comece a Programar', description: 'Níveis 0 e 1: introdução à computação e lógica, com 15 lições e 54 exercícios.', status: 'disponivel' },
  'trilha-completa': { title: 'Trilha completa, níveis 0 a 14', description: 'Continuidade do nível 2 ao 14: Python, estruturas, algoritmos, web e demais assuntos.', status: 'disponivel' },
  'exercicios-e-revisao': { title: 'Exercícios e revisão espaçada', description: 'Correção automática, domínio por habilidade e FSRS.', status: 'disponivel' },
  laboratorio: { title: 'Laboratório', description: 'Python, JavaScript e SQL no navegador.', status: 'disponivel' },
  'tutor-offline': { title: 'Tutor com pistas guiadas', description: 'Perguntas e pistas a partir do erro e das dicas do exercício.', status: 'disponivel' },
  'tutor-ia': { title: 'Tutor com IA', description: 'Conversa sobre o seu código, com pistas em vez de respostas prontas. Respostas geradas podem conter erros.', status: 'disponivel' },
  sincronizacao: { title: 'Sincronização entre aparelhos', description: 'Progresso salvo na conta.', status: 'disponivel' },
  'analise-detalhada': { title: 'Análise detalhada de desempenho', description: 'Evolução de cada habilidade ao longo do tempo. O domínio atual por habilidade e o plano do dia já fazem parte do gratuito.', status: 'planejado' },
  'simulado-entrevista': { title: 'Simulado de entrevista técnica', description: 'Entrevista cronometrada com avaliação de raciocínio e comunicação.', status: 'planejado' },
  certificado: { title: 'Certificado verificável', description: 'Em estudo: certificado por nível, só com uma avaliação verificável. Atividade registrada no navegador não serve de prova.', status: 'planejado' },
};

/** Preço em centavos de real (R$ 19,90 = 1990), para não somar centavos com ponto flutuante. */
export interface PlanPrice {
  monthly: number;
  yearly: number;
}

export interface PlanDefinition {
  id: PlanId;
  name: string;
  features: Feature[];
  /** perguntas por dia ao tutor com IA; null = usa o padrão configurado no servidor */
  tutorDailyLimit: number | null;
  tutorMonthlyLimit: number;
  /** null = gratuito */
  price: PlanPrice | null;
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Gratuito',
    features: ['trilha-inicial', 'exercicios-e-revisao', 'laboratorio', 'tutor-offline', 'sincronizacao'],
    tutorDailyLimit: 0,
    tutorMonthlyLimit: 0,
    price: null,
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    features: ['trilha-inicial', 'trilha-completa', 'exercicios-e-revisao', 'laboratorio', 'tutor-offline', 'tutor-ia', 'sincronizacao', 'analise-detalhada', 'simulado-entrevista', 'certificado'],
    tutorDailyLimit: 20,
    tutorMonthlyLimit: 200,
    // Preço decidido em 07/10/2026. A cobrança acontece no provedor de pagamento: o
    // Alicerce não guarda dados de cartão, só o plano, a validade e o histórico em
    // plan_changes (apps/api/src/plans.ts).
    price: { monthly: 1990, yearly: 14900 },
  },
};

/**
 * O premium só entra à venda quando houver um provedor de pagamento e pelo menos
 * um recurso pago pronto (status 'disponivel'; um teste cobra isso). Até lá, a
 * página de planos só informa o preço e não oferece compra.
 *
 * Antes de virar true, é preciso uma página de assinatura com: identificação do
 * fornecedor (nome e CPF ou CNPJ, endereço e contato; Decreto 7.962/2013, art. 2º,
 * I e II), forma de pagamento, renovação e reembolso (art. 2º, V), desistência em
 * 7 dias pelo mesmo meio da contratação (CDC art. 49; Decreto 7.962, art. 5º) e a
 * lista do que já está incluído. Revise também o texto de /planos e de /conta.
 */
export const PREMIUM_FOR_SALE = false;

/** Teto diário de IA para Premium; o gratuito nunca chama o provedor. */
export const DEFAULT_TUTOR_DAILY_LIMIT = 20;

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
/** 1990 → "R$ 19,90" (com espaço não separável, como o Intl escreve). */
export const formatBRL = (cents: number) => BRL.format(cents / 100);

/** Quanto o plano anual sai por mês e quanto economiza em relação a 12 mensalidades. */
export function yearlyDeal(price: PlanPrice) {
  const twelveMonths = price.monthly * 12;
  const savings = twelveMonths - price.yearly;
  return {
    perMonth: Math.round(price.yearly / 12),
    savings,
    // arredonda para baixo para nunca anunciar desconto maior que o real
    savingsPercent: Math.floor((savings * 100) / twelveMonths),
  };
}

export const FREE_FEATURES: readonly Feature[] = ['trilha-inicial', 'exercicios-e-revisao', 'laboratorio', 'tutor-offline'];

export const FREE_MAX_LEVEL = 1;
export function canAccessLevel(plan: PlanId, level: number): boolean {
  return Number.isInteger(level) && level >= 0 && level <= 14 && (level <= FREE_MAX_LEVEL || plan === 'premium');
}

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
  tutorMonthlyLimit: number;
}

export function entitlements(plan: PlanId, expiresAt: number | null, defaultTutorLimit: number): Entitlements {
  const def = PLANS[plan];
  return {
    plan,
    expiresAt: plan === 'free' ? null : expiresAt,
    features: def.features.filter((f) => FEATURES[f].status === 'disponivel'),
    tutorDailyLimit: plan==='free'?0:Math.min(def.tutorDailyLimit??20,Math.max(0,defaultTutorLimit)),
    tutorMonthlyLimit: def.tutorMonthlyLimit,
  };
}

export const can = (e: Entitlements, f: Feature) => e.features.includes(f);
