import { useEffect, useMemo, useRef, useState } from 'react';
import { lessonById, levelById, moduleById, modules, referenceById, STAGE_LABEL, type Lesson, type Stage } from '@alicerce/content';
import { topologicalOrder } from '@alicerce/engine';
import { useHead } from '../lib/head.tsx';
import { Link, setSearchParam, useSearchParam } from '../lib/router.tsx';
import { Markdown } from '../lib/markdown.tsx';
import { Blocks } from '../components/Blocks.tsx';
import { TermList } from '../components/TermList.tsx';
import { completeLesson, useDerived, useProgress, visitStage } from '../state/store.ts';
import { resetTutorContext } from '../features/tutor/context.ts';
import { NotFound } from './NotFound.tsx';

const ORDERED_LESSONS: Lesson[] = topologicalOrder(modules).flatMap((m) => m.lessons);

function nextLesson(id: string): Lesson | undefined {
  const i = ORDERED_LESSONS.findIndex((l) => l.id === id);
  return i >= 0 ? ORDERED_LESSONS[i + 1] : undefined;
}

export function Licao({ id }: { id: string }) {
  const lesson = lessonById.get(id);
  const mod = lesson ? moduleById.get(lesson.moduleId) : undefined;
  const level = mod ? levelById.get(mod.levelId) : undefined;
  useHead(lesson ? `${lesson.title} (${lesson.titleEn})` : 'Lição não encontrada', lesson?.summary ?? '');
  const stageParam = useSearchParam('etapa') as Stage | null;
  const progress = useProgress();
  const d = useDerived();

  const stages = useMemo(() => lesson?.sections.map((s) => s.stage) ?? [], [lesson]);
  const stage: Stage = stageParam && stages.includes(stageParam) ? stageParam : (stages[0] ?? 'conceito');
  const idx = stages.indexOf(stage);
  const section = lesson?.sections[idx];

  const firstStage = useRef(true);
  useEffect(() => {
    if (firstStage.current) {
      firstStage.current = false;
      return;
    }
    const h = document.getElementById('stage-title');
    h?.setAttribute('tabindex', '-1');
    h?.focus({ preventScroll: true });
    h?.closest('.lesson-layout')?.scrollIntoView({ block: 'start' });
  }, [stage]);

  useEffect(() => {
    if (!lesson) return;
    visitStage(lesson.id, stage);
    resetTutorContext({ lessonId: lesson.id });
  }, [lesson, stage]);

  if (!lesson || !mod || !level || !section) return <NotFound />;

  const visited = new Set(progress.lessons[lesson.id]?.visited ?? []);
  const done = d.completedLessons.has(lesson.id);
  const practice = lesson.sections.filter((s) => s.stage === 'exercicio').flatMap((s) => s.blocks.flatMap((b) => (b.type === 'exercise' ? [b.exercise] : [])));
  const attempted = new Set(progress.attempts.map((a) => a.exerciseId));
  const pending = practice.filter((e) => !attempted.has(e.id));
  const next = nextLesson(lesson.id);
  const go = (s: Stage) => setSearchParam('etapa', s, false);

  return (
    <div className="container">
      <nav className="breadcrumbs" aria-label="Você está em">
        <ol>
          <li>
            <Link to="/trilha">Trilha</Link>
          </li>
          <li>
            <Link to={`/nivel/${level.id}`}>Nível {level.number}</Link>
          </li>
          <li>
            <Link to={`/modulo/${mod.id}`}>{mod.title}</Link>
          </li>
          <li aria-current="page">{lesson.title}</li>
        </ol>
      </nav>
      <h1 style={{ marginBottom: '0.2rem' }}>{lesson.title}</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        <span lang="en" style={{ fontFamily: 'var(--font-mono)' }}>
          {lesson.titleEn}
        </span>{' '}
        · {lesson.minutes} min {done && <span className="badge ok">✓ concluída</span>}
      </p>

      <div className="lesson-layout">
        <nav className="stage-nav" aria-label="Etapas da lição">
          <ol>
            {lesson.sections.map((s) => (
              <li key={s.stage}>
                <a
                  href={`?etapa=${s.stage}`}
                  aria-current={s.stage === stage ? 'step' : undefined}
                  className={visited.has(s.stage) && s.stage !== stage ? 'done' : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    go(s.stage);
                  }}
                >
                  {STAGE_LABEL[s.stage].pt}
                  <span className="en" lang="en">
                    {STAGE_LABEL[s.stage].en}
                  </span>
                </a>
              </li>
            ))}
          </ol>
          <details className="disclosure" style={{ marginTop: '1rem' }}>
            <summary>Termos desta lição ({lesson.terms.length})</summary>
            <ul style={{ paddingLeft: '1rem', fontSize: '0.88rem' }}>
              {lesson.terms.map((t) => (
                <li key={t.en}>
                  {t.pt} → <span lang="en" style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{t.en}</span>
                </li>
              ))}
            </ul>
          </details>
        </nav>

        <article className="prose" style={{ maxWidth: '78ch' }} aria-labelledby="stage-title">
          <p className="eyebrow">
            Etapa {idx + 1} de {stages.length}
          </p>
          <h2 id="stage-title" style={{ marginTop: 0 }}>
            {STAGE_LABEL[stage].pt}{' '}
            <span className="muted" lang="en" style={{ fontSize: '0.7em', fontFamily: 'var(--font-mono)' }}>
              {STAGE_LABEL[stage].en}
            </span>
          </h2>

          {idx === 0 && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <p style={{ marginTop: 0 }}>
                <strong>Ao final desta lição você vai conseguir:</strong>
              </p>
              <ul>
                {lesson.objectives.map((o, i) => (
                  <li key={i}>
                    <Markdown text={o} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Blocks blocks={section.blocks} lessonId={lesson.id} />

          {stage === 'revisao' && (
            <>
              <h3>Vocabulário da lição</h3>
              <TermList terms={lesson.terms} />
              <h3>Teste sua memória</h3>
              <p className="small muted">Tente responder antes de abrir. Ao concluir a lição, estes cartões entram na sua revisão espaçada.</p>
              {lesson.cards.map((c) => (
                <RecallCard key={c.id} front={c.front} back={c.back} />
              ))}
              {lesson.references.length > 0 && (
                <>
                  <h3>Fontes e leituras</h3>
                  <ul>
                    {lesson.references.map((r) => {
                      const ref = referenceById.get(r)!;
                      return (
                        <li key={r}>
                          <a href={ref.url} target="_blank" rel="noopener noreferrer">
                            {ref.title}
                          </a>{' '}
                          <span className="small muted">— {ref.org}</span>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
              <section className="card" aria-labelledby="h-concluir" style={{ marginTop: '1.5rem' }}>
                <h3 id="h-concluir">{done ? 'Lição concluída' : 'Concluir a lição'}</h3>
                {done ? (
                  <p>Muito bem! Os cartões desta lição estão na sua fila de revisão.</p>
                ) : pending.length ? (
                  <p>
                    Antes de concluir, tente os exercícios da etapa <a href="?etapa=exercicio" onClick={(e) => (e.preventDefault(), go('exercicio'))}>Exercícios</a>: faltam {pending.length} de {practice.length}. Errar faz parte; o que conta é tentar.
                  </p>
                ) : (
                  <p>Você praticou tudo. Concluir coloca os cartões desta lição na revisão espaçada.</p>
                )}
                <div className="row">
                  {!done && (
                    <button type="button" className="btn primary" disabled={pending.length > 0} onClick={() => completeLesson(lesson.id)}>
                      ✓ Concluir lição
                    </button>
                  )}
                  {next && (
                    <Link to={`/licao/${next.id}`} className={`btn${done ? ' primary' : ''}`}>
                      Próxima lição: {next.title} →
                    </Link>
                  )}
                </div>
              </section>
            </>
          )}

          <div className="stage-footer">
            {idx > 0 ? (
              <button type="button" className="btn" onClick={() => go(stages[idx - 1]!)}>
                ← {STAGE_LABEL[stages[idx - 1]!].pt}
              </button>
            ) : (
              <span />
            )}
            {idx < stages.length - 1 && (
              <button type="button" className="btn primary" onClick={() => go(stages[idx + 1]!)}>
                {STAGE_LABEL[stages[idx + 1]!].pt} →
              </button>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}

function RecallCard({ front, back }: { front: string; back: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card" style={{ marginBottom: '0.6rem' }}>
      <Markdown text={front} />
      {open ? (
        <div className="feedback info">
          <Markdown text={back} />
        </div>
      ) : (
        <button type="button" className="btn small" onClick={() => setOpen(true)}>
          Mostrar resposta
        </button>
      )}
    </div>
  );
}

