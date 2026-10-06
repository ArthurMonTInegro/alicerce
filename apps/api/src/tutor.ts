/**
 * Tutor: interface de provedor com duas implementações.
 * - ClaudeTutor: usa a API da Anthropic quando ANTHROPIC_API_KEY existe.
 * - OfflineTutor: perguntas guiadas e escada de dicas, sem rede (pacote engine).
 * Qualquer falha do provedor de IA cai no offline: o aluno nunca fica sem resposta.
 *
 * O contexto confiável (enunciado e dicas do exercício, título da lição) vem do
 * conteúdo no servidor, pelo id, e nunca do cliente. A solução do exercício
 * nunca é enviada ao modelo. Código e erro do aluno vão na mensagem do usuário,
 * delimitados, e não nas instruções de sistema.
 */
import Anthropic from '@anthropic-ai/sdk';
import { exerciseById, lessonById } from '@alicerce/content';
import { offlineTutor, TUTOR_SYSTEM_PROMPT } from '@alicerce/engine';

export interface TutorRequest {
  message: string;
  history: Array<{ role: 'user' | 'tutor'; text: string }>;
  context: { lessonId?: string; exerciseId?: string; code?: string; error?: string; hintsSeen?: number };
}
export interface TutorReply {
  reply: string;
  mode: 'ia' | 'offline';
}
export interface TutorProvider {
  readonly name: 'ia' | 'offline';
  answer(req: TutorRequest): Promise<string>;
}

const LIMITS = { message: 2000, code: 6000, error: 1500, historyItems: 10, historyText: 2000 };

/** Valida e corta o pedido vindo do cliente. Lança Error com mensagem para o usuário se for inválido. */
export function parseTutorRequest(body: unknown): TutorRequest {
  const b = (body ?? {}) as Record<string, unknown>;
  const message = typeof b.message === 'string' ? b.message.trim().slice(0, LIMITS.message) : '';
  if (!message) throw new Error('Escreva uma pergunta.');
  const history = (Array.isArray(b.history) ? b.history : [])
    .filter((h): h is { role: 'user' | 'tutor'; text: string } => !!h && (h.role === 'user' || h.role === 'tutor') && typeof h.text === 'string')
    .slice(-LIMITS.historyItems)
    .map((h) => ({ role: h.role, text: h.text.slice(0, LIMITS.historyText) }));
  const c = (b.context ?? {}) as Record<string, unknown>;
  const str = (v: unknown, max: number) => (typeof v === 'string' && v ? v.slice(0, max) : undefined);
  const context: TutorRequest['context'] = {};
  const lessonId = str(c.lessonId, 80);
  const exerciseId = str(c.exerciseId, 80);
  const code = str(c.code, LIMITS.code);
  const error = str(c.error, LIMITS.error);
  if (lessonId && lessonById.has(lessonId)) context.lessonId = lessonId;
  if (exerciseId && exerciseById.has(exerciseId)) context.exerciseId = exerciseId;
  if (code) context.code = code;
  if (error) context.error = error;
  if (typeof c.hintsSeen === 'number' && Number.isInteger(c.hintsSeen) && c.hintsSeen >= 0) context.hintsSeen = Math.min(c.hintsSeen, 20);
  return { message, history, context };
}

function lookup(req: TutorRequest) {
  const ref = req.context.exerciseId ? exerciseById.get(req.context.exerciseId) : undefined;
  const lesson = lessonById.get(req.context.lessonId ?? ref?.lessonId ?? '');
  return { ex: ref?.exercise, lesson };
}

export class OfflineTutor implements TutorProvider {
  readonly name = 'offline' as const;
  async answer(req: TutorRequest): Promise<string> {
    const { ex, lesson } = lookup(req);
    return offlineTutor({
      message: req.message,
      exercise: ex ? { prompt: ex.prompt, hints: ex.hints, kind: ex.kind } : undefined,
      hintsSeen: req.context.hintsSeen,
      error: req.context.error,
      lessonTitle: lesson?.title,
    });
  }
}

/** Modelos que aceitam o fallback automático do servidor quando o pedido é recusado pelos filtros de segurança. */
const FALLBACK_MODELS = new Set(['claude-sonnet-5-5', 'claude-opus-5-5', 'claude-opus-5', 'claude-fable-5-1']);

export class ClaudeTutor implements TutorProvider {
  readonly name = 'ia' as const;
  private readonly client: Anthropic;
  private readonly model: string;
  constructor(apiKey: string, model: string, client?: Anthropic) {
    this.model = model;
    this.client = client ?? new Anthropic({ apiKey, timeout: 45_000, maxRetries: 1 });
  }

  /** Instruções fixas + contexto confiável do exercício (vindo do conteúdo do servidor). */
  system(req: TutorRequest): string {
    const { ex, lesson } = lookup(req);
    const parts = [TUTOR_SYSTEM_PROMPT];
    if (lesson) parts.push(`\nLição atual: "${lesson.title}" (${lesson.titleEn}). Objetivos: ${lesson.objectives.join('; ')}`);
    if (ex) {
      const seen = req.context.hintsSeen ?? 0;
      parts.push(
        `\nExercício atual (${ex.kind}, ${ex.difficulty}): ${ex.prompt}`,
        `Dicas do exercício, da mais vaga à mais concreta (o aluno já viu ${seen}): ${ex.hints.map((h, i) => `${i + 1}. ${h}`).join(' ')}`,
        'Não revele mais do que a próxima dica ainda não vista.',
      );
    }
    return parts.join('\n');
  }

  messages(req: TutorRequest): Anthropic.Beta.BetaMessageParam[] {
    const msgs: Anthropic.Beta.BetaMessageParam[] = [];
    for (const h of req.history) {
      const role = h.role === 'user' ? 'user' : 'assistant';
      if (!msgs.length && role === 'assistant') continue; // a conversa precisa começar pelo usuário
      msgs.push({ role, content: h.text });
    }
    let last = req.message;
    if (req.context.code) last += `\n\n<codigo_do_aluno>\n${req.context.code}\n</codigo_do_aluno>`;
    if (req.context.error) last += `\n\n<erro>\n${req.context.error}\n</erro>`;
    msgs.push({ role: 'user', content: last });
    return msgs;
  }

  async answer(req: TutorRequest): Promise<string> {
    const useFallbacks = FALLBACK_MODELS.has(this.model);
    const res = await this.client.beta.messages.create({
      model: this.model,
      max_tokens: 4000,
      system: this.system(req),
      messages: this.messages(req),
      // resposta curta de conversa: pouco esforço basta e mantém a latência baixa
      output_config: { effort: 'low' },
      ...(useFallbacks ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
    });
    if (res.stop_reason === 'refusal') throw new Error('recusa do modelo');
    const text = res.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    if (!text) throw new Error('resposta vazia');
    return text;
  }
}
