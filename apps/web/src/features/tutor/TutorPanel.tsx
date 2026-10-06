/**
 * Painel do tutor. Usa a IA do servidor quando configurada; sem servidor ou sem
 * chave, responde no modo offline (perguntas guiadas + escada de dicas).
 * Em qualquer modo, a regra é a mesma: ajudar a pensar, nunca entregar a resposta.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { exerciseById, findExercise, lessonById, useLesson } from '../../content.ts';
import { offlineTutor } from '@alicerce/engine';
import { Markdown } from '../../lib/markdown.tsx';
import { api } from '../../state/api.ts';
import { closeTutor, takePendingQuestion, useTutor } from './context.ts';

interface Msg {
  role: 'user' | 'tutor';
  text: string;
}

const STARTERS = ['Me dá uma dica', 'Não entendi o enunciado', 'Por que meu código não funciona?', 'Explica esse erro'];

export function TutorPanel() {
  const { ctx, open } = useTutor();
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'tutor', text: 'Oi! Sou o tutor da Alicerce. Eu não entrego respostas prontas, mas te ajudo a chegar lá com perguntas e pistas. Em que você está travando?' }]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'ia' | 'offline' | null>(null);
  const log = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const opener = useRef<Element | null>(null);

  const exRef = ctx.exerciseId ? exerciseById.get(ctx.exerciseId) : undefined;
  const { lesson: exLesson } = useLesson(exRef?.lessonId);
  const ex = exRef ? findExercise(exLesson, exRef.exercise.id) : undefined;
  const lesson = ctx.lessonId ? lessonById.get(ctx.lessonId) : undefined;

  const send = async (message: string) => {
    if (!message.trim() || busy) return;
    const history = msgs.slice(-8);
    setMsgs((m) => [...m, { role: 'user', text: message }]);
    setText('');
    setBusy(true);
    try {
      const r = await api.tutor({ message, history, context: { ...ctx } });
      setMode(r.mode);
      setMsgs((m) => [...m, { role: 'tutor', text: r.reply }]);
    } catch {
      setMode('offline');
      const reply = offlineTutor({ message, exercise: ex ? { prompt: ex.prompt, hints: ex.hints, kind: ex.kind } : undefined, hintsSeen: ctx.hintsSeen, error: ctx.error, lessonTitle: lesson?.title });
      setMsgs((m) => [...m, { role: 'tutor', text: reply }]);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement;
    input.current?.focus();
    const q = takePendingQuestion();
    if (q) void send(q);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeTutor();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      (opener.current as HTMLElement | null)?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    log.current?.scrollTo(0, log.current.scrollHeight);
  }, [msgs]);

  if (!open) return null;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void send(text);
  };
  return (
    <section className="tutor-panel" role="dialog" aria-modal="false" aria-labelledby="tutor-title">
      <header>
        <div>
          <strong id="tutor-title">Tutor</strong>{' '}
          {mode && <span className="badge" style={{ marginLeft: '0.35rem' }}>{mode === 'ia' ? 'com IA' : 'modo offline'}</span>}
          {ex && <div className="small" style={{ opacity: 0.85 }}>Contexto: exercício atual{lesson ? ` · ${lesson.title}` : ''}</div>}
        </div>
        <button type="button" className="icon-btn" onClick={closeTutor} aria-label="Fechar o tutor">
          ✕
        </button>
      </header>
      <div className="tutor-log" ref={log} aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <span className="sr-only">{m.role === 'user' ? 'Você: ' : 'Tutor: '}</span>
            <Markdown text={m.text} />
          </div>
        ))}
        {busy && (
          <div className="msg tutor">
            <span className="spinner" aria-hidden="true" /> pensando…
          </div>
        )}
      </div>
      <div className="chips">
        {STARTERS.map((s) => (
          <button type="button" key={s} className="chip" onClick={() => send(s)}>
            {s}
          </button>
        ))}
      </div>
      <form className="tutor-form" onSubmit={submit}>
        <label htmlFor="tutor-in" className="sr-only">
          Sua pergunta
        </label>
        <textarea
          id="tutor-in"
          ref={input}
          rows={2}
          value={text}
          maxLength={2000}
          placeholder="Pergunte do seu jeito…"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send(text);
            }
          }}
        />
        <button type="submit" className="btn primary" disabled={busy || !text.trim()}>
          Enviar
        </button>
      </form>
    </section>
  );
}
