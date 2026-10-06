import { moduleById, projectById, projects, skillById } from '@alicerce/content';
import { useHead } from '../lib/head.tsx';
import { Link } from '../lib/router.tsx';
import { toggleMilestone, useDerived, useProgress } from '../state/store.ts';
import { TermList } from '../components/TermList.tsx';
import { NotFound } from './NotFound.tsx';

const TIER: Record<string, string> = { iniciante: 'Iniciante', intermediario: 'Intermediário', avancado: 'Avançado', capstone: 'Projeto final' };

export function Projetos() {
  useHead('Projetos', 'Dez projetos de portfólio em dificuldade crescente: calculadora, lista de tarefas, sistema de cadastro, portfólio, API REST, rotas, IA, chat em rede, full-stack e open source.');
  const p = useProgress();
  const d = useDerived();
  return (
    <div className="container">
      <p className="eyebrow">Portfólio · projects</p>
      <h1>Projetos</h1>
      <p className="lead">Projetos que crescem junto com você. Cada um começa numa lição e ganha partes novas a cada módulo. No fim, são 10 repositórios no seu GitHub mostrando a sua evolução.</p>
      <ol className="stack" style={{ listStyle: 'none', padding: 0 }}>
        {projects.map((pr) => {
          const done = p.projects[pr.id]?.milestones.length ?? 0;
          const ready = pr.requires.every((m) => d.completedModules.has(m) || d.testedOut.has(m));
          return (
            <li key={pr.id} style={{ margin: 0 }}>
              <Link to={`/projetos/${pr.id}`} className="card" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.25rem 1rem' }}>
                <span className="level-num" aria-hidden="true">
                  {pr.order}
                </span>
                <div>
                  <div className="row" style={{ gap: '0.4rem' }}>
                    <span className="badge">{TIER[pr.tier]}</span>
                    {done > 0 && (
                      <span className="badge ok">
                        {done}/{pr.milestones.length} etapas
                      </span>
                    )}
                    {!ready && <span className="badge">requer {pr.requires.map((m) => moduleById.get(m)?.title).join(', ')}</span>}
                  </div>
                  <h2 style={{ fontSize: '1.2rem', margin: '0.4rem 0 0.2rem' }}>
                    {pr.title}{' '}
                    <span className="small muted" lang="en" style={{ fontFamily: 'var(--font-mono)' }}>
                      {pr.titleEn}
                    </span>
                  </h2>
                  <p className="small" style={{ margin: 0 }}>
                    {pr.summary}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function Projeto({ id }: { id: string }) {
  const pr = projectById.get(id);
  useHead(pr ? `Projeto ${pr.order}: ${pr.title}` : 'Projeto não encontrado', pr?.summary ?? '');
  const p = useProgress();
  if (!pr) return <NotFound />;
  const done = new Set(p.projects[pr.id]?.milestones ?? []);
  return (
    <div className="container">
      <nav className="breadcrumbs" aria-label="Você está em">
        <ol>
          <li>
            <Link to="/projetos">Projetos</Link>
          </li>
          <li aria-current="page">Projeto {pr.order}</li>
        </ol>
      </nav>
      <p className="eyebrow">
        Projeto {pr.order} · {TIER[pr.tier]}
      </p>
      <h1>
        {pr.title}{' '}
        <span className="muted" lang="en" style={{ fontSize: '0.55em', fontFamily: 'var(--font-mono)' }}>
          {pr.titleEn}
        </span>
      </h1>
      <p className="lead">{pr.summary}</p>
      <div className="grid two" style={{ alignItems: 'start' }}>
        <div>
          <h2>Requisitos</h2>
          <ul>
            {pr.requirements.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          <h2>Etapas</h2>
          <ol className="stack" style={{ listStyle: 'none', padding: 0, ['--gap' as string]: '0.5rem' }}>
            {pr.milestones.map((m, i) => (
              <li key={i} className="card" style={{ margin: 0 }}>
                <label className="row" style={{ alignItems: 'flex-start', fontWeight: 400 }}>
                  <input type="checkbox" checked={done.has(i)} onChange={() => toggleMilestone(pr.id, i)} style={{ marginTop: '0.35rem' }} />
                  <span>
                    <strong>{m.title}</strong>
                    <br />
                    <span className="small">{m.details}</span>
                  </span>
                </label>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <section className="card">
            <h2 style={{ marginTop: 0, fontSize: '1.2rem' }}>Critérios de aceite</h2>
            <p className="small muted">Seu projeto está pronto quando tudo isto for verdade (e, idealmente, verificado por testes):</p>
            <ul>
              {pr.acceptance.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </section>
          <section className="card" style={{ marginTop: '1rem' }}>
            <h2 style={{ marginTop: 0, fontSize: '1.2rem' }}>Para ir além</h2>
            <ul>
              {pr.stretch.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </section>
          <section className="card" style={{ marginTop: '1rem' }}>
            <h2 style={{ marginTop: 0, fontSize: '1.2rem' }}>Pré-requisitos e habilidades</h2>
            <p className="small">
              Módulos:{' '}
              {pr.requires.map((m, i) => (
                <span key={m}>
                  {i > 0 && ', '}
                  <Link to={`/modulo/${m}`}>{moduleById.get(m)?.title}</Link>
                </span>
              ))}
            </p>
            <ul className="pill-list">
              {pr.skills.map((s) => (
                <li key={s}>
                  <span className="badge">{skillById.get(s)?.pt}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
      <h2>Inglês do projeto</h2>
      <TermList terms={pr.english} />
      <aside className="callout tip">
        <p className="callout-title">Como entregar</p>
        <p>
          Crie um repositório público no GitHub para o projeto, com README (o que é, como rodar, como testar, decisões), commits pequenos e frequentes e, a partir do Projeto 2, testes automatizados. Veja o <Link to="/carreira">guia de carreira</Link> para transformar o projeto em vitrine.
        </p>
      </aside>
    </div>
  );
}
