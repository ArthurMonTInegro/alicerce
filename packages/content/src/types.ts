/**
 * Esquema do conteúdo educacional.
 *
 * Todo conteúdo é dado tipado (não HTML): isso permite validar o currículo em
 * testes automatizados (pré-requisitos, etapas da metodologia, exercícios com
 * testes e dicas), renderizar com segurança (sem HTML arbitrário) e, no
 * futuro, mover o conteúdo para um CMS ou banco sem mudar a interface.
 *
 * Texto usa um subconjunto de Markdown (ver apps/web/src/lib/markdown.ts):
 *   **negrito**, *itálico*, `código`, [link](https://...), listas com "- " e "1. ",
 *   "### título" e termos bilíngues {{variável|variable}}.
 */
import type { Difficulty } from '@alicerce/engine';

export type { Difficulty };

export type CodeLang = 'python' | 'javascript' | 'sql' | 'html' | 'bash' | 'text';

export interface Term {
  pt: string;
  en: string;
  /** definição curta em português */
  def: string;
  /** exemplo de uso real em inglês (documentação, erro, conversa) */
  example?: string;
}

export type ReferenceKind = 'universidade' | 'documentacao' | 'livro' | 'artigo' | 'padrao' | 'curso';

export interface Reference {
  id: string;
  title: string;
  org: string;
  url: string;
  kind: ReferenceKind;
  /** áreas (ids de nível) em que a referência foi usada */
  areas: string[];
  /** como a referência influenciou a trilha */
  note: string;
}

/* ---------- Blocos de conteúdo ---------- */

export type Block =
  | { type: 'md'; text: string }
  | { type: 'callout'; tone: 'info' | 'tip' | 'warn' | 'english' | 'deep'; title?: string; text: string }
  | { type: 'code'; lang: CodeLang; code: string; caption?: string; runnable?: boolean; stdin?: string }
  | { type: 'trace'; code: string; caption?: string }
  | { type: 'terms'; terms: Term[] }
  | { type: 'table'; head: string[]; rows: string[][]; caption?: string }
  | { type: 'viz'; viz: VizId; caption?: string; props?: Record<string, unknown> }
  | { type: 'exercise'; exercise: Exercise }
  | { type: 'project'; projectId: string };

export type VizId =
  | 'binary'
  | 'cpu'
  | 'terminal'
  | 'client-server'
  | 'memory'
  | 'sorting'
  | 'binary-search'
  | 'stack-queue'
  | 'hash-table'
  | 'big-o'
  | 'tree'
  | 'graph-bfs'
  | 'tcp-handshake'
  | 'scheduler'
  | 'logic-gates'
  | 'hashing'
  | 'neuron'
  | 'sql-join';

/* ---------- Exercícios ---------- */

interface ExerciseBase {
  id: string;
  prompt: string;
  difficulty: Difficulty;
  skills: string[];
  /** Escada de dicas: da mais vaga (pergunta socrática) à mais concreta. Nunca a resposta. */
  hints: string[];
  /** Explicação mostrada depois de resolver (ou revelar). */
  explanation: string;
}

export interface McqOption {
  text: string;
  correct?: boolean;
  /** Por que essa opção está certa/errada — trata o equívoco específico. */
  feedback: string;
}

export interface McqExercise extends ExerciseBase {
  kind: 'mcq';
  code?: { lang: CodeLang; code: string };
  options: McqOption[];
}

export interface PredictExercise extends ExerciseBase {
  kind: 'predict';
  lang: 'python' | 'javascript';
  code: string;
  /** saída esperada exatamente como o programa imprime */
  answer: string;
}

export interface PythonTest {
  name: string;
  /** código Python executado após o código do estudante; use assert. `_output` contém o que foi impresso e `_source`, o código do estudante. */
  code: string;
}

export interface CodeExercise extends ExerciseBase {
  kind: 'code' | 'fix';
  lang: 'python';
  starter: string;
  solution: string;
  tests: PythonTest[];
  stdin?: string;
}

export interface ParsonsExercise extends ExerciseBase {
  kind: 'parsons';
  lang: CodeLang;
  /** linhas na ordem correta (a indentação faz parte da resposta) */
  lines: string[];
}

export interface FillExercise extends ExerciseBase {
  kind: 'fill';
  lang: CodeLang;
  /** use ___ para cada lacuna */
  template: string;
  /** para cada lacuna, as respostas aceitas */
  blanks: string[][];
}

export interface SqlExercise extends ExerciseBase {
  kind: 'sql';
  setup: string;
  starter: string;
  solution: string;
  /** se a ordem das linhas importa (ORDER BY) */
  ordered: boolean;
}

export type Exercise = McqExercise | PredictExercise | CodeExercise | ParsonsExercise | FillExercise | SqlExercise;

/* ---------- Currículo ---------- */

/** Etapas obrigatórias da metodologia, nesta ordem. */
export const STAGES = ['conceito', 'explicacao', 'exemplo', 'codigo', 'exercicio', 'desafio', 'projeto', 'revisao'] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABEL: Record<Stage, { pt: string; en: string }> = {
  conceito: { pt: 'Conceito', en: 'Concept' },
  explicacao: { pt: 'Explicação', en: 'Explanation' },
  exemplo: { pt: 'Exemplo', en: 'Example' },
  codigo: { pt: 'Código', en: 'Code' },
  exercicio: { pt: 'Exercícios', en: 'Practice' },
  desafio: { pt: 'Desafio', en: 'Challenge' },
  projeto: { pt: 'Projeto', en: 'Project' },
  revisao: { pt: 'Revisão', en: 'Review' },
};

export interface Flashcard {
  id: string;
  front: string;
  back: string;
}

export interface LessonSection {
  stage: Stage;
  blocks: Block[];
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  titleEn: string;
  summary: string;
  minutes: number;
  objectives: string[];
  skills: string[];
  terms: Term[];
  sections: LessonSection[];
  /** cartões de recuperação ativa que entram na revisão espaçada */
  cards: Flashcard[];
  references: string[];
}

export interface Module {
  id: string;
  levelId: string;
  title: string;
  titleEn: string;
  description: string;
  prerequisites: string[];
  skills: Skill[];
  /** tópicos do módulo — também serve de plano quando as lições ainda não foram escritas */
  outline: string[];
  lessons: Lesson[];
  references: string[];
}

export interface Skill {
  id: string;
  pt: string;
  en: string;
}

export interface Level {
  id: string;
  number: number;
  title: string;
  titleEn: string;
  goal: string;
  /** por que este nível existe e como se conecta ao resto */
  why: string;
  modules: Module[];
}

/* ---------- Projetos, entrevistas, diagnóstico ---------- */

export interface Project {
  id: string;
  order: number;
  title: string;
  titleEn: string;
  tier: 'iniciante' | 'intermediario' | 'avancado' | 'capstone';
  summary: string;
  requires: string[]; // module ids
  skills: string[];
  requirements: string[];
  milestones: Array<{ title: string; details: string }>;
  acceptance: string[];
  stretch: string[];
  english: Term[];
}

export interface InterviewQuestion {
  id: string;
  category: 'conceitos' | 'codigo' | 'logica' | 'git' | 'banco-de-dados' | 'redes' | 'sistemas' | 'web' | 'comportamental' | 'design';
  kind: 'conceitual' | 'codigo' | 'logica' | 'comportamental';
  difficulty: Difficulty;
  question: string;
  questionEn: string;
  keyPoints: string[];
  answer: string;
  followUps: string[];
}

export interface DiagnosticItem {
  id: string;
  area: 'computacao' | 'logica' | 'programacao' | 'matematica' | 'ingles';
  level: 1 | 2 | 3;
  prompt: string;
  code?: string;
  options: string[];
  answer: number;
  explanation: string;
}
