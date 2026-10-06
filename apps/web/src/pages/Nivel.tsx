import { levelById } from '../content.ts';
import { useHead } from '../lib/head.tsx';
import { Link } from '../lib/router.tsx';
import { useDerived } from '../state/store.ts';
import { moduleProgress, moduleStatus, STATUS_BADGE, STATUS_LABEL } from '../lib/progress-helpers.ts';
import { Markdown } from '../lib/markdown.tsx';
import { NotFound } from './NotFound.tsx';

export function Nivel({ id }: { id: string }) {
  const level = levelById.get(id);
  useHead(level ? `Nível ${level.number}: ${level.title}` : 'Nível não encontrado', level?.goal ?? '');
  const d = useDerived();
  if (!level) return <NotFound />;
  return (
    <div className="container">
      <nav className="breadcrumbs" aria-label="Você está em">
        <ol>
          <li>
            <Link to="/trilha">Trilha</Link>
          </li>
          <li aria-current="page">Nível {level.number}</li>
        </ol>
      </nav>
      <p className="eyebrow">Nível {level.number}</p>
      <h1>
        {level.title}{' '}
        <span className="muted" lang="en" style={{ fontSize: '0.55em', fontFamily: 'var(--font-mono)' }}>
          {level.titleEn}
        </span>
      </h1>
      <div className="prose">
        <p className="lead">{level.goal}</p>
        <aside className="callout info" aria-label="Por que este nível">
          <p className="callout-title">Por que este nível existe</p>
          <Markdown text={level.why} />
        </aside>
      </div>
      <h2>Módulos</h2>
      <div className="grid two">
        {level.modules.map((m) => {
          const s = moduleStatus(m, d);
          const prog = moduleProgress(m, d);
          return (
            <Link key={m.id} to={`/modulo/${m.id}`} className="card">
              <div className="row between">
                <span className={`badge ${STATUS_BADGE[s]}`}>{STATUS_LABEL[s]}</span>
                <span className="small muted">{m.lessons.length ? `${m.lessons.length} lição(ões) · ${m.lessons.reduce((t, l) => t + l.minutes, 0)} min` : 'módulo-roteiro'}</span>
              </div>
              <h3 style={{ marginTop: '0.6rem' }}>{m.title}</h3>
              <p className="small muted" lang="en" style={{ margin: '0 0 0.4rem' }}>
                {m.titleEn}
              </p>
              <p className="small">{m.description}</p>
              <div className="progress" aria-hidden="true">
                <span style={{ width: `${prog * 100}%` }} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
