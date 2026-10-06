import { useEffect, useMemo, useState } from 'react';
import { exercises, lessons, skillById } from '@alicerce/content';
import { isDue, previewIntervals, skillStatus, type Grade } from '@alicerce/engine';
import { useHead } from '../lib/head.tsx';
import { Markdown } from '../lib/markdown.tsx';
import { Link } from '../lib/router.tsx';
import { reviewCard, useDerived, useProgress } from '../state/store.ts';
import { Exercise } from '../features/exercises/Exercise.tsx';
import { formatDuration } from '../lib/progress-helpers.ts';

const CARD_INDEX = new Map(lessons.flatMap((l) => l.cards.map((c) => [c.id, { ...c, lesson: l }] as const)));
const GRADES: Array<{ g: Grade; label: string; en: string; key: string }> = [
  { g: 1, label: 'Errei', en: 'Again', key: '1' },
  { g: 2, label: 'Difícil', en: 'Hard', key: '2' },
  { g: 3, label: 'Bom', en: 'Good', key: '3' },
  { g: 4, label: 'Fácil', en: 'Easy', key: '4' },
];

export function Revisao() {
  useHead('Revisão espaçada', 'Revise no momento certo: cartões de recuperação ativa agendados pelo algoritmo FSRS e desafios de retenção para as habilidades que estão enfraquecendo.');
  const p = useProgress();
  const d = useDerived();
  const [now, setNow] = useState(0);
  const [shown, setShown] = useState(false);
  const [session, setSession] = useState(0);
  useEffect(() => setNow(Date.now()), [p.cards]);

  // fila: cartões vencidos, intercalando lições (interleaving)
  const queue = useMemo(() => {
    if (!now) return [];
    return Object.entries(p.cards)
      .filter(([id, c]) => isDue(c, now) && CARD_INDEX.has(id))
      .sort(([a, x], [b, y]) => x.due - y.due || a.localeCompare(b))
      .map(([id]) => id);
  }, [p.cards, now]);
  const currentId = queue[0];
  const current = currentId ? CARD_INDEX.get(currentId) : undefined;
  const intervals = currentId && now ? previewIntervals(p.cards[currentId]!, now) : null;

  const grade = (g: Grade) => {
    if (!currentId) return;
    reviewCard(currentId, g);
    setShown(false);
    setSession((s) => s + 1);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!current || (e.target as HTMLElement).closest('input, textarea, [contenteditable], .cm-editor')) return;
      if (!shown && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        setShown(true);
      } else if (shown && ['1', '2', '3', '4'].includes(e.key)) grade(Number(e.key) as Grade);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // desafios de retenção: habilidades dominadas que estão enfraquecendo, ou que precisam de reforço
  const challenges = useMemo(() => {
    if (!now) return [];
    const weak = [...d.skills.values()].filter((s) => ['revisar', 'reforco'].includes(skillStatus(s, now))).sort((a, b) => a.mastery - b.mastery);
    const out: Array<{ skill: string; ex: (typeof exercises)[number] }> = [];
    for (const s of weak) {
      const pool = exercises.filter((x) => x.exercise.skills.includes(s.skill) && d.completedLessons.has(x.lessonId) && x.exercise.kind !== 'mcq');
      const pick = pool.find((x) => !d.solved.has(x.exercise.id)) ?? pool[(Math.floor(now / 86_400_000) + s.skill.length) % Math.max(1, pool.length)];
      if (pick && !out.some((o) => o.ex.exercise.id === pick.exercise.id)) out.push({ skill: s.skill, ex: pick });
      if (out.length >= 3) break;
    }
    return out;
  }, [d, now]);

  const totalCards = Object.keys(p.cards).length;
  const nextDue = now ? Math.min(...Object.values(p.cards).map((c) => c.due).filter((t) => t > now)) : Infinity;
  const reviewedToday = now ? p.reviews.filter((r) => now - r.at < 86_400_000).length : 0;

  return (
    <div className="container">
      <p className="eyebrow">Revisão espaçada · spaced repetition</p>
      <h1>Revisão</h1>
      <p className="lead">Lembrar dá trabalho, e é esse esforço que fixa. Responda de memória antes de virar o cartão e avalie com honestidade: o algoritmo decide quando cada cartão volta.</p>

      <div className="grid" style={{ margin: '1rem 0 2rem' }}>
        <div className="card">
          <div className="stat">{queue.length}</div>
          <p className="small" style={{ margin: 0 }}>
            cartões para hoje
          </p>
        </div>
        <div className="card">
          <div className="stat">{reviewedToday}</div>
          <p className="small" style={{ margin: 0 }}>
            revisados nas últimas 24 h
          </p>
        </div>
        <div className="card">
          <div className="stat">{totalCards}</div>
          <p className="small" style={{ margin: 0 }}>
            cartões no seu baralho
          </p>
        </div>
      </div>

      <section aria-labelledby="h-cards" className="prose" style={{ maxWidth: '760px' }}>
        <h2 id="h-cards">Cartões</h2>
        {!now ? null : current ? (
          <div>
            <div className="flashcard" aria-live="polite">
              <div>
                <p className="small muted" style={{ marginTop: 0 }}>
                  {current.lesson.title}
                </p>
                <Markdown text={current.front} />
                {shown && (
                  <div className="back">
                    <Markdown text={current.back} />
                  </div>
                )}
              </div>
            </div>
            {!shown ? (
              <div className="row" style={{ justifyContent: 'center', marginTop: '1rem' }}>
                <button type="button" className="btn primary" onClick={() => setShown(true)}>
                  Mostrar resposta <span className="kbd">espaço</span>
                </button>
              </div>
            ) : (
              <div className="grades" role="group" aria-label="Como foi lembrar?">
                {GRADES.map((x) => (
                  <button key={x.g} type="button" className={`btn${x.g === 3 ? ' primary' : ''}`} onClick={() => grade(x.g)}>
                    {x.label}{' '}
                    <small lang="en">
                      {x.en} · volta em {intervals ? formatDuration(intervals[x.g]) : ''}
                    </small>
                    <span className="kbd" aria-hidden="true">
                      {x.key}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <p className="small muted center">
              {queue.length - 1} restante(s) · {session} revisado(s) nesta sessão
            </p>
          </div>
        ) : totalCards ? (
          <p className="notice">
            🎉 Nada para revisar agora. {Number.isFinite(nextDue) ? `O próximo cartão volta em ${formatDuration(nextDue - now)}.` : ''} Revisar um pouco todo dia vale mais que muito de uma vez.
          </p>
        ) : (
          <p className="notice">
            Seu baralho está vazio. Os cartões entram aqui quando você conclui uma lição. <Link to="/trilha">Ir para a trilha →</Link>
          </p>
        )}
      </section>

      <section aria-labelledby="h-ret" style={{ marginTop: '2.5rem' }}>
        <h2 id="h-ret">Desafios de retenção</h2>
        <p className="prose">Exercícios das habilidades que estão perdendo força (pelo tempo sem prática) ou que precisam de reforço. Resolver sem ajuda reforça a memória e atualiza seu domínio.</p>
        {challenges.length ? (
          challenges.map((c) => (
            <div key={c.ex.exercise.id}>
              <p className="small" style={{ margin: '0 0 0.3rem' }}>
                Habilidade: <strong>{skillById.get(c.skill)?.pt}</strong>{' '}
                <span className="muted" lang="en">
                  ({skillById.get(c.skill)?.en})
                </span>
              </p>
              <Exercise key={c.ex.exercise.id} ex={c.ex.exercise} lessonId={c.ex.lessonId} />
            </div>
          ))
        ) : (
          <p className="notice">Nenhuma habilidade enfraquecendo agora. Continue a trilha; os desafios aparecem conforme o tempo passa.</p>
        )}
      </section>
    </div>
  );
}
