import {canAccessLevel} from '@alicerce/engine';
import {useAccessPlan} from '../lib/access.ts';
import { levelById } from '../content.ts';
import { useHead } from '../lib/head.tsx';
import { Link } from '../lib/router.tsx';
import { useDerived } from '../state/store.ts';
import { moduleProgress, moduleStatus, STATUS_BADGE, STATUS_LABEL } from '../lib/progress-helpers.ts';
import { Markdown } from '../lib/markdown.tsx';
import { NotFound } from './NotFound.tsx';

export function Nivel({ id }: { id: string }) {
  const plan=useAccessPlan();
  const level = levelById.get(id);
  useHead(level ? `Nível ${level.number}: ${level.title}` : 'Nível não encontrado', level?.goal ?? '');
  const d = useDerived();
  if (!level) return <NotFound />;
  const paid=!canAccessLevel(plan,level.number);
  const theoryLessons = level.modules.flatMap(m => m.lessons).filter(lesson => lesson.theoryTitle);
  return (
    <div className="container">
      <p className="callout">{paid?<>Este nível faz parte do Premium. Explore os assuntos e <Link to="/planos">veja como continuar</Link>.</>:<>Este nível está incluído no seu acesso.</>}</p>
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
      {theoryLessons.length > 0 && <aside className="callout info" aria-label="Aprofundamentos teóricos do nível">
        <p className="callout-title">Entenda o porquê</p>
        <p className="small">{theoryLessons.length} {theoryLessons.length === 1 ? 'aula com explicação conceitual' : 'aulas com explicação conceitual'}, exemplos resolvidos e perguntas para justificar com suas palavras. Siga a ordem dos módulos e confira os pré-requisitos de cada aula.</p>
        <details className="disclosure">
          <summary>Explorar os aprofundamentos deste nível{paid ? ' · Premium' : ''}</summary>
          <ul>
            {theoryLessons.map(lesson => <li key={lesson.id} style={{marginBottom:'0.75rem'}}>
              <Link to={`/licao/${lesson.id}?etapa=explicacao`}>{lesson.title}</Link>
              <p className="small" style={{margin:'0.15rem 0'}}>{lesson.theoryTitle}</p>
            </li>)}
          </ul>
          {paid && <p className="small">Os links mostram a prévia da aula. O conteúdo completo acompanha o acesso Premium.</p>}
        </details>
      </aside>}
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
