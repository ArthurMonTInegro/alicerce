import { useMemo, useState } from 'react';
import { diagnosticItems, moduleById, NAO_SEI_LABEL, cardIds } from '../content.ts';
import { AREAS, ITEMS_PER_AREA, nextItem, scoreAreas, type DiagnosticAnswer } from '@alicerce/engine';
import { useHead } from '../lib/head.tsx';
import { CodeView, inline, Markdown } from '../lib/markdown.tsx';
import { Link } from '../lib/router.tsx';
import { AREA_LABEL, BAND_LABEL, recommend } from '../lib/recommend.ts';
import { enrollCards, saveDiagnostic, setTestedOut, useProgress } from '../state/store.ts';

export function Diagnostico() {
  useHead('Diagnóstico inicial', 'Um teste adaptativo de cerca de 10 minutos sobre computação, lógica, programação, matemática e inglês técnico, que monta a sua trilha recomendada.');
  const p = useProgress();
  const [phase, setPhase] = useState<'intro' | 'quiz' | 'result'>('intro');
  const [answers, setAnswers] = useState<Array<DiagnosticAnswer & { choice: number }>>([]);
  const [choice, setChoice] = useState<number | null>(null);
  const [applied, setApplied] = useState(false);

  const current = useMemo(() => {
    for (const area of AREAS) {
      const it = nextItem(diagnosticItems, area, answers);
      if (it) return it;
    }
    return null;
  }, [answers]);

  const total = AREAS.length * ITEMS_PER_AREA;
  const results = useMemo(() => scoreAreas(diagnosticItems, answers), [answers]);
  const rec = useMemo(() => recommend(results), [results]);

  const answer = () => {
    if (!current || choice === null) return;
    const next = [...answers, { itemId: current.id, correct: choice === current.answer, choice }];
    setAnswers(next);
    setChoice(null);
    const more = AREAS.some((a) => nextItem(diagnosticItems, a, next));
    if (!more) {
      const res = scoreAreas(diagnosticItems, next);
      saveDiagnostic({ answers: next.map(({ itemId, correct }) => ({ itemId, correct })), results: res, at: Date.now() });
      setPhase('result');
    }
  };

  const apply = () => {
    setTestedOut(rec.testedOut);
    enrollCards(rec.testedOut.flatMap((id) => moduleById.get(id)?.lessons.flatMap(cardIds) ?? []));
    setApplied(true);
  };

  if (phase === 'intro')
    return (
      <div className="container prose">
        <p className="eyebrow">Diagnóstico · placement test</p>
        <h1>Por onde começar?</h1>
        <p className="lead">São {total} perguntas curtas sobre cinco áreas: fundamentos de computação, lógica, programação, matemática e inglês técnico. Leva cerca de 10 minutos.</p>
        <ul>
          <li>
            O teste é <strong>adaptativo</strong>: acertou, a próxima fica mais difícil; errou, fica mais fácil.
          </li>
          <li>
            Use <strong>"{NAO_SEI_LABEL}"</strong> sem medo. Chutar só piora a recomendação.
          </li>
          <li>No final você recebe um ponto de partida, o que pode ser dispensado e onde focar. Nada é definitivo: você pode refazer ou ignorar.</li>
        </ul>
        {p.diagnostic && <p className="notice small">Você já fez o diagnóstico em {new Date(p.diagnostic.at).toLocaleDateString('pt-BR')}. Fazer de novo substitui o resultado anterior.</p>}
        <button type="button" className="btn accent" onClick={() => (setAnswers([]), setPhase('quiz'))}>
          Começar o diagnóstico
        </button>
      </div>
    );

  if (phase === 'quiz' && current) {
    const areaIdx = AREAS.indexOf(current.area);
    return (
      <div className="container prose">
        <p className="eyebrow">
          {AREA_LABEL[current.area]} · pergunta {answers.length + 1} de {total}
        </p>
        <div className="progress" role="progressbar" aria-label="Progresso do diagnóstico" aria-valuenow={answers.length} aria-valuemin={0} aria-valuemax={total} style={{ margin: '0.5rem 0 1.5rem' }}>
          <span style={{ width: `${(answers.length / total) * 100}%` }} />
        </div>
        <fieldset className="card" style={{ border: '1px solid var(--line)' }}>
          <legend className="sr-only">
            Pergunta {answers.length + 1}, área {areaIdx + 1} de {AREAS.length}
          </legend>
          <div style={{ fontSize: '1.1rem' }}>
            <Markdown text={current.prompt} />
          </div>
          {current.code && (
            <div className="code-block">
              <CodeView code={current.code} lang="python" />
            </div>
          )}
          <ul className="options">
            {current.options.map((o, i) => (
              <li key={i}>
                <label className="option" style={{ cursor: 'pointer' }}>
                  <input type="radio" name="diag" checked={choice === i} onChange={() => setChoice(i)} style={{ marginTop: '0.3rem' }} />
                  <span>{inline(o)}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="row" style={{ marginTop: '1rem' }}>
            <button type="button" className="btn primary" onClick={answer} disabled={choice === null}>
              Responder
            </button>
          </div>
        </fieldset>
      </div>
    );
  }

  return (
    <div className="container">
      <p className="eyebrow">Resultado do diagnóstico</p>
      <h1>Sua trilha recomendada</h1>
      <div className="grid two" style={{ alignItems: 'start' }}>
        <section className="card" aria-labelledby="h-areas">
          <h2 id="h-areas" style={{ marginTop: 0 }}>
            Por área
          </h2>
          <ul className="meter-list">
            {results.map((r) => (
              <li key={r.area}>
                <span>{AREA_LABEL[r.area]}</span>
                <span className="badge">{BAND_LABEL[r.band]}</span>
                <div className="progress" role="progressbar" aria-label={AREA_LABEL[r.area]} aria-valuenow={Math.round(r.score * 100)} aria-valuemin={0} aria-valuemax={100}>
                  <span style={{ width: `${r.score * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section className="card" aria-labelledby="h-rec">
          <h2 id="h-rec" style={{ marginTop: 0 }}>
            Recomendação
          </h2>
          <p>
            Comece por: <strong>{moduleById.get(rec.start)?.title}</strong>
          </p>
          <ul>
            {rec.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
          {rec.testedOut.length > 0 && (
            <>
              <p>Módulos que podem ser dispensados:</p>
              <ul className="pill-list">
                {rec.testedOut.map((id) => (
                  <li key={id}>
                    <span className="badge deep">{moduleById.get(id)?.title}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className="row">
            {rec.testedOut.length > 0 && !applied && (
              <button type="button" className="btn primary" onClick={apply}>
                Aplicar dispensas
              </button>
            )}
            {applied && <span className="badge ok">✓ Aplicado</span>}
            <Link to={`/modulo/${rec.start}`} className="btn accent">
              Ir para o ponto de partida →
            </Link>
          </div>
        </section>
      </div>
      <details className="disclosure" style={{ marginTop: '1.5rem' }}>
        <summary>Rever as perguntas com explicações</summary>
        <ol>
          {answers.map((a) => {
            const it = diagnosticItems.find((x) => x.id === a.itemId)!;
            return (
              <li key={a.itemId} style={{ marginBottom: '0.75rem' }}>
                <Markdown text={it.prompt} />
                <p className="small">
                  Sua resposta: {it.options[a.choice]} {a.correct ? '✓' : `· Correta: ${it.options[it.answer]}`}
                </p>
                <p className="small muted">{it.explanation}</p>
              </li>
            );
          })}
        </ol>
      </details>
      <button type="button" className="btn small ghost" onClick={() => (setAnswers([]), setApplied(false), setPhase('intro'))}>
        Refazer o diagnóstico
      </button>
    </div>
  );
}
