/**
 * Gera o maior progresso que um navegador legítimo consegue enviar a
 * PUT /api/progress, usado para dimensionar o limite de corpo dessa rota.
 *
 * Critério (o pior caso de cada campo, sem inventar dado que o cliente não produz):
 * - listas que crescem com o uso no teto de sanitizeProgress e de mergeProgress:
 *   MAX_ATTEMPTS tentativas e MAX_REVIEWS revisões;
 * - mapas com uma entrada para cada item real do catálogo (lições com as 8 etapas,
 *   módulos, cartões, projetos com todos os marcos, perguntas de entrevista com
 *   todos os pontos);
 * - textos com o maior identificador real do catálogo; identificadores gerados
 *   pelo cliente no formato dele (UUID de 36 caracteres);
 * - números no maior tamanho que o saneamento aceita (contadores em 100000,
 *   duração em 24 h, datas com 13 dígitos, frações com 17 dígitos);
 * - diagnóstico no teto de 20 000 caracteres do saneamento.
 *
 * Fica de fora o máximo "teórico" de sanitizeProgress com qualquer texto de
 * 120 caracteres em todas as 5 000 chaves de cada mapa: nenhum cliente real
 * produz isso (as chaves vêm do catálogo), e aceitar dezenas de megabytes por
 * requisição só serviria para abuso.
 */
import { cardIdsOf, diagnosticItems, exercises, interviewQuestions, lessons, modules, projects, STAGES } from '@alicerce/content';
import { AREAS, MAX_ATTEMPTS, MAX_REVIEWS, type DiagnosticRecord, type ProgressState } from '@alicerce/engine';

const longest = <T>(xs: T[], size: (x: T) => number): T => xs.reduce((a, b) => (size(b) > size(a) ? b : a));
/** UUID de 36 caracteres, determinístico (o cliente usa crypto.randomUUID). */
const uuid = (n: number, prefix = 0) => `${String(prefix).padStart(8, '0')}-0000-4000-8000-${String(n).padStart(12, '0')}`;
/** Data com 13 dígitos, dentro do teto aceito pelo saneamento (8e12). */
const at = (i: number) => 7_000_000_000_000 + i;
/** Fração em [0, 1] com a representação JSON mais longa possível. */
const FRACTION = 0.30000000000000004;
const COUNT = 100_000;

export function maiorProgressoValido(): ProgressState {
  const ex = longest(exercises, (e) => e.exercise.id.length).exercise;
  const skills = longest(exercises, (e) => JSON.stringify(e.exercise.skills).length).exercise.skills;
  // o mapa público tem o número de cartões de cada lição, inclusive das pagas (o texto delas fica no privado)
  const cardIds = lessons.flatMap(cardIdsOf);
  const longestCard = longest(cardIds, (c) => c.length);

  const p: ProgressState = {
    version: 1,
    resetAt: at(0),
    attempts: Array.from({ length: MAX_ATTEMPTS }, (_, i) => ({
      id: uuid(i, 1),
      durationMs: 86_400_000,
      // mesmo comprimento da versão que o cliente grava hoje (store.ts)
      contentVersion: 'alicerce-2026-10-07',
      exerciseId: ex.id,
      skills,
      difficulty: 'intermediario' as const,
      correct: false,
      score: FRACTION,
      hintsUsed: COUNT,
      wrongTries: COUNT,
      revealed: false,
      at: at(i + 1),
    })),
    lessons: Object.fromEntries(lessons.map((l, i) => [l.id, { visited: [...STAGES], completedAt: at(i) }])),
    modulesDone: Object.fromEntries(modules.map((m, i) => [m.id, at(i)])),
    forced: Object.fromEntries(modules.map((m, i) => [m.id, at(i)])),
    testedOut: Object.fromEntries(modules.map((m, i) => [m.id, at(i)])),
    cards: Object.fromEntries(
      cardIds.map((id, i) => [id, { stability: 12345.678901234567, difficulty: 9.876543210987654, due: at(i), lastReview: at(i), reps: COUNT, lapses: COUNT }]),
    ),
    reviews: Array.from({ length: MAX_REVIEWS }, (_, i) => ({ id: uuid(i, 2), cardId: longestCard, grade: 4 as const, at: at(i + 1) })),
    projects: Object.fromEntries(projects.map((pr, i) => [pr.id, { milestones: pr.milestones.map((_, j) => j), updatedAt: at(i) }])),
    interviews: Object.fromEntries(interviewQuestions.map((q, i) => [q.id, { hits: q.keyPoints.map((_, j) => j), at: at(i) }])),
  };
  p.diagnostic = maiorDiagnostico();
  return p;
}

/** Diagnóstico com respostas reais repetidas até encostar no teto de 20 000 caracteres. */
function maiorDiagnostico(): DiagnosticRecord {
  const d: DiagnosticRecord = {
    answers: [],
    results: AREAS.map((area) => ({ area, score: FRACTION, answered: diagnosticItems.length, band: 'intermediario' as const })),
    at: at(0),
  };
  const id = longest(diagnosticItems, (x) => x.id.length).id;
  while (JSON.stringify(d).length < 19_950) d.answers.push({ itemId: id, correct: false });
  while (JSON.stringify(d).length >= 20_000) d.answers.pop();
  return d;
}

/** Corpo JSON que o cliente envia (api.ts: { progress, expectedUserId }). */
export const corpoDeSincronizacao = (progress: ProgressState, expectedUserId: string) => JSON.stringify({ progress, expectedUserId });
