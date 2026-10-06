import type { Block } from '../content.ts';
import { projectById } from '../content.ts';
import { Markdown, inline } from '../lib/markdown.tsx';
import { Link } from '../lib/router.tsx';
import { Exercise } from '../features/exercises/Exercise.tsx';
import { Tracer } from '../features/tracer/Tracer.tsx';
import { Viz } from '../features/viz/index.tsx';
import { CodeBlock } from './CodeBlock.tsx';
import { TermList } from './TermList.tsx';

const CALLOUT: Record<string, { icon: string; title: string }> = {
  info: { icon: 'ℹ️', title: 'Saiba mais' },
  tip: { icon: '💡', title: 'Dica' },
  warn: { icon: '⚠️', title: 'Atenção' },
  english: { icon: '🌎', title: 'Inglês técnico' },
  deep: { icon: '🔬', title: 'Aprofundamento' },
};

export function Blocks({ blocks, lessonId }: { blocks: Block[]; lessonId?: string }) {
  return (
    <>
      {blocks.map((b, i) => (
        <BlockView key={i} b={b} lessonId={lessonId} />
      ))}
    </>
  );
}

function BlockView({ b, lessonId }: { b: Block; lessonId?: string | undefined }) {
  switch (b.type) {
    case 'md':
      return <Markdown text={b.text} />;
    case 'callout': {
      const c = CALLOUT[b.tone]!;
      return (
        <aside className={`callout ${b.tone}`} aria-label={b.title ?? c.title}>
          <p className="callout-title">
            <span aria-hidden="true">{c.icon}</span> {b.title ? inline(b.title) : c.title}
          </p>
          <Markdown text={b.text} />
        </aside>
      );
    }
    case 'code':
      return <CodeBlock code={b.code} lang={b.lang} caption={b.caption} runnable={b.runnable} stdin={b.stdin} />;
    case 'trace':
      return (
        <figure style={{ margin: '0 0 1.2rem' }}>
          <Tracer code={b.code} />
          {b.caption && <figcaption className="code-caption" style={{ marginTop: '0.4rem' }}>{b.caption}</figcaption>}
        </figure>
      );
    case 'terms':
      return <TermList terms={b.terms} />;
    case 'table':
      return (
        <div className="table-wrap">
          <table>
            {b.caption && <caption>{inline(b.caption)}</caption>}
            <thead>
              <tr>
                {b.head.map((h, i) => (
                  <th key={i} scope="col">
                    {inline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j}>{inline(c)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'viz':
      return <Viz id={b.viz} caption={b.caption} />;
    case 'exercise':
      return <Exercise key={b.exercise.id} ex={b.exercise} lessonId={lessonId} />;
    case 'project': {
      const p = projectById.get(b.projectId);
      if (!p) return null;
      return (
        <p className="notice">
          📁 Faz parte do <Link to={`/projetos/${p.id}`}>Projeto {p.order}: {p.title}</Link> — veja requisitos, etapas e critérios de aceite.
        </p>
      );
    }
  }
}
