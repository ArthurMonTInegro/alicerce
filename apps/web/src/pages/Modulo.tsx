import { useState } from 'react';
import { levelById, moduleById, projects, referenceById } from '../content.ts';
import { skillStatus } from '@alicerce/engine';
import { useHead } from '../lib/head.tsx';
import { Link } from '../lib/router.tsx';
import { forceUnlock, setModuleDone, useDerived } from '../state/store.ts';
import { moduleStatus, STATUS_BADGE, STATUS_LABEL } from '../lib/progress-helpers.ts';
import { NotFound } from './NotFound.tsx';

const SKILL_LABEL = { 'nao-iniciada': 'não iniciada', aprendendo: 'aprendendo', reforco: 'precisa de reforço', dominada: 'dominada', revisar: 'hora de revisar' } as const;
const SKILL_BADGE = { 'nao-iniciada': '', aprendendo: 'info', reforco: 'warn', dominada: 'ok', revisar: 'accent' } as const;

export function Modulo({ id }: { id: string }) {
  const m = moduleById.get(id);
  const level = m ? levelById.get(m.levelId) : undefined;
  useHead(m ? m.title : 'Módulo não encontrado', m?.description ?? '');
  const d = useDerived();
  const [checks, setChecks] = useState<Set<number>>(new Set());
  if (!m || !level) return <NotFound />;
  const s = moduleStatus(m, d);
  const missing = m.prerequisites.filter((p) => !d.completedModules.has(p) && !d.testedOut.has(p));
  const firstOpen = m.lessons.find((l) => !d.completedLessons.has(l.id)) ?? m.lessons[0];
  const related = projects.filter((p) => p.requires.includes(m.id) || p.skills.some((sk) => m.skills.some((x) => x.id === sk)));
  const now = Date.now();
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
          <li aria-current="page">{m.title}</li>
        </ol>
      </nav>
      <div className="row" style={{ gap: '0.5rem' }}>
        <span className={`badge ${STATUS_BADGE[s]}`}>{STATUS_LABEL[s]}</span>
        <span className="small muted">{m.id}</span>
      </div>
      <h1>
        {m.title}{' '}
        <span className="muted" lang="en" style={{ fontSize: '0.55em', fontFamily: 'var(--font-mono)' }}>
          {m.titleEn}
        </span>
      </h1>
      <p className="lead">{m.description}</p>

      {s === 'bloqueado' && (
        <div className="callout warn" role="note">
          <p className="callout-title">Pré-requisitos pendentes</p>
          <p>
            Recomendamos concluir antes:{' '}
            {missing.map((p, i) => (
              <span key={p}>
                {i > 0 && ', '}
                <Link to={`/modulo/${p}`}>{moduleById.get(p)!.title}</Link>
              </span>
            ))}
            . Se você já sabe esse conteúdo, faça o <Link to="/diagnostico">diagnóstico</Link> ou estude assim mesmo.
          </p>
          <button type="button" className="btn small" onClick={() => forceUnlock(m.id)}>
            Estudar mesmo assim
          </button>
        </div>
      )}
      {s === 'dispensado' && (
        <p className="callout info">O diagnóstico indicou que você já domina este módulo. Ele continua disponível para consulta, e os cartões de revisão dele entram na sua fila.</p>
      )}

      <div className="grid two" style={{ alignItems: 'start' }}>
        <section aria-labelledby="h-licoes">
          <h2 id="h-licoes">{m.lessons.length ? 'Lições' : 'Módulo-roteiro'}</h2>
          {m.lessons.length ? (
            <>
              <ol className="module-list">
                {m.lessons.map((l) => (
                  <li key={l.id}>
                    <Link to={`/licao/${l.id}`} className="module-row">
                      <span>
                        <span className="t">{l.title}</span>
                        <br />
                        <span className="small muted">
                          {l.minutes} min · {l.summary}
                        </span>
                      </span>
                      {d.completedLessons.has(l.id) ? <span className="badge ok">✓ concluída</span> : d.completedLessons.size || s !== 'bloqueado' ? <span className="badge">abrir</span> : null}
                    </Link>
                  </li>
                ))}
              </ol>
              {firstOpen && s !== 'concluido' && (
                <p style={{ marginTop: '1rem' }}>
                  <Link to={`/licao/${firstOpen.id}`} className="btn primary">
                    {d.completedLessons.size && m.lessons.some((l) => d.completedLessons.has(l.id)) ? 'Continuar' : 'Começar'}: {firstOpen.title} →
                  </Link>
                </p>
              )}
            </>
          ) : (
            <div>
              <p>
                Este módulo é um <strong>roteiro de estudo</strong>: ainda não tem lições interativas na plataforma. Estude os tópicos abaixo usando as referências indicadas (todas gratuitas ou de bibliotecas) e marque o que você já consegue explicar com suas palavras.
              </p>
              <ul className="stack" style={{ listStyle: 'none', padding: 0, ['--gap' as string]: '0.4rem' }}>
                {m.outline.map((o, i) => (
                  <li key={i} style={{ margin: 0 }}>
                    <label className="row" style={{ fontWeight: 400, alignItems: 'flex-start' }}>
                      <input type="checkbox" checked={checks.has(i) || d.completedModules.has(m.id)} onChange={() => setChecks((c) => (c.has(i) ? new Set([...c].filter((x) => x !== i)) : new Set([...c, i])))} />
                      <span>Consigo explicar: {o}</span>
                    </label>
                  </li>
                ))}
              </ul>
              {d.completedModules.has(m.id) ? (
                <button type="button" className="btn small" onClick={() => setModuleDone(m.id, false)}>
                  Desmarcar conclusão
                </button>
              ) : (
                <button type="button" className="btn primary" disabled={checks.size < m.outline.length} onClick={() => setModuleDone(m.id, true)}>
                  Marcar módulo como concluído
                </button>
              )}
            </div>
          )}
          {m.lessons.length > 0 && (
            <>
              <h3>Tópicos do módulo</h3>
              <ul>
                {m.outline.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            </>
          )}
        </section>
        <aside aria-label="Detalhes do módulo" className="stack">
          <section className="card">
            <h3>Habilidades</h3>
            <ul className="meter-list">
              {m.skills.map((sk) => {
                const ss = d.skills.get(sk.id);
                const status = skillStatus(ss, now);
                return (
                  <li key={sk.id}>
                    <span>
                      {sk.pt}{' '}
                      <span className="small muted" lang="en">
                        ({sk.en})
                      </span>
                    </span>
                    <span className={`badge ${SKILL_BADGE[status]}`}>{SKILL_LABEL[status]}</span>
                    <div className="progress" role="progressbar" aria-label={`Domínio de ${sk.pt}`} aria-valuenow={Math.round((ss?.mastery ?? 0) * 100)} aria-valuemin={0} aria-valuemax={100}>
                      <span style={{ width: `${(ss?.mastery ?? 0) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
          {m.prerequisites.length > 0 && (
            <section className="card">
              <h3>Pré-requisitos</h3>
              <ul>
                {m.prerequisites.map((p) => (
                  <li key={p}>
                    <Link to={`/modulo/${p}`}>{moduleById.get(p)!.title}</Link> {d.completedModules.has(p) ? '✓' : d.testedOut.has(p) ? '(dispensado)' : ''}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {related.length > 0 && (
            <section className="card">
              <h3>Projetos relacionados</h3>
              <ul>
                {related.map((p) => (
                  <li key={p.id}>
                    <Link to={`/projetos/${p.id}`}>
                      Projeto {p.order}: {p.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section className="card">
            <h3>Para ir além (referências)</h3>
            <ul>
              {m.references.map((r) => {
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
          </section>
        </aside>
      </div>
    </div>
  );
}
