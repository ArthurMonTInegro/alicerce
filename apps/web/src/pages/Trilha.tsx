import { useMemo, useState } from 'react';
import { levels, moduleById, modules, type Module } from '@alicerce/content';
import { ancestors } from '@alicerce/engine';
import { useHead } from '../lib/head.tsx';
import { Link, navigate } from '../lib/router.tsx';
import { useDerived } from '../state/store.ts';
import { levelNumber, moduleProgress, moduleStatus, nextModules, STATUS_BADGE, STATUS_LABEL } from '../lib/progress-helpers.ts';

const NODE_W = 124;
const NODE_H = 48;
const COL = 134;
const ROW = 84;

/** Profundidade no grafo = 1 + maior profundidade dos pré-requisitos. Vira a "linha" na árvore. */
function computeLayout() {
  const depth = new Map<string, number>();
  const dep = (m: Module): number => {
    if (depth.has(m.id)) return depth.get(m.id)!;
    const v = m.prerequisites.length ? 1 + Math.max(...m.prerequisites.map((p) => dep(moduleById.get(p)!))) : 0;
    depth.set(m.id, v);
    return v;
  };
  modules.forEach(dep);
  const rows = new Map<number, Module[]>();
  for (const m of modules) {
    const r = depth.get(m.id)!;
    if (!rows.has(r)) rows.set(r, []);
    rows.get(r)!.push(m);
  }
  const maxCols = Math.max(...[...rows.values()].map((r) => r.length));
  const width = maxCols * COL + 40;
  const pos = new Map<string, { x: number; y: number }>();
  for (const [r, ms] of rows) {
    ms.sort((a, b) => levelNumber(a) - levelNumber(b) || a.id.localeCompare(b.id, 'pt', { numeric: true }));
    const offset = (width - ms.length * COL) / 2;
    ms.forEach((m, i) => pos.set(m.id, { x: offset + i * COL + (COL - NODE_W) / 2, y: 20 + r * ROW }));
  }
  return { pos, width, height: 20 + rows.size * ROW, rows };
}

const short = (s: string, n = 19) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
function splitTitle(t: string): [string, string] {
  if (t.length <= 19) return [t, ''];
  const words = t.split(' ');
  let a = '';
  let i = 0;
  while (i < words.length && (a + ' ' + words[i]).trim().length <= 19) a = (a + ' ' + words[i++]).trim();
  return [a || short(t), short(words.slice(i).join(' '))];
}

export function Trilha() {
  useHead('Trilha', 'O mapa completo da formação: 15 níveis e seus módulos, com pré-requisitos, seu progresso e os próximos passos recomendados.');
  const d = useDerived();
  const layout = useMemo(computeLayout, []);
  const [hl, setHl] = useState<Set<string>>(new Set());
  const [view, setView] = useState<'arvore' | 'lista'>('arvore');
  const next = nextModules(d, 3);
  const st = (m: Module) => moduleStatus(m, d);

  return (
    <div className="container">
      <p className="eyebrow">Sua trilha</p>
      <h1>Mapa da formação</h1>
      <p className="lead">Cada caixa é um módulo; as linhas ligam um módulo aos seus pré-requisitos. Passe o mouse ou o foco sobre um módulo para ver tudo o que vem antes dele.</p>

      <section aria-labelledby="h-next">
        <h2 id="h-next">Próximos passos</h2>
        {next.length ? (
          <div className="grid">
            {next.map((m) => (
              <Link key={m.id} to={`/modulo/${m.id}`} className="card">
                <span className={`badge ${STATUS_BADGE[st(m)]}`}>{STATUS_LABEL[st(m)]}</span>
                <h3 style={{ marginTop: '0.5rem' }}>{m.title}</h3>
                <p className="small muted" style={{ margin: 0 }}>
                  Nível {levelNumber(m)} · {m.lessons.length ? `${m.lessons.length} lição(ões)` : 'módulo-roteiro'}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="notice">Parabéns, você concluiu toda a trilha! 🎉 Veja os projetos finais e a área de carreira.</p>
        )}
        {!Object.keys(d.testedOut).length && d.completedLessons.size === 0 && (
          <p className="small" style={{ marginTop: '0.75rem' }}>
            Já sabe programar um pouco? <Link to="/diagnostico">Faça o diagnóstico</Link> para dispensar o que você já domina.
          </p>
        )}
      </section>

      <div className="row between" style={{ marginTop: '2rem' }}>
        <h2 style={{ margin: 0 }}>Árvore de conhecimento</h2>
        <div className="segmented" role="group" aria-label="Forma de exibição">
          <button type="button" aria-pressed={view === 'arvore'} onClick={() => setView('arvore')}>
            Árvore
          </button>
          <button type="button" aria-pressed={view === 'lista'} onClick={() => setView('lista')}>
            Lista por nível
          </button>
        </div>
      </div>
      <ul className="legend" aria-label="Legenda">
        <li>
          <i className="l-disp" /> disponível
        </li>
        <li>
          <i className="l-and" /> em andamento
        </li>
        <li>
          <i className="l-ok" /> concluído
        </li>
        <li>
          <i className="l-dsp" /> dispensado
        </li>
        <li>
          <i className="l-blk" /> bloqueado
        </li>
      </ul>

      {view === 'arvore' ? (
        <div className="tree-wrap">
          <svg className="tree-svg" viewBox={`0 0 ${layout.width} ${layout.height}`} width={layout.width} height={layout.height} role="group" aria-label="Árvore de módulos. Use Tab para percorrer os módulos.">
            {modules.flatMap((m) =>
              m.prerequisites.map((p) => {
                const a = layout.pos.get(p)!;
                const b = layout.pos.get(m.id)!;
                const done = d.completedModules.has(p) || d.testedOut.has(p);
                const lit = hl.has(p) && hl.has(m.id);
                const cls = lit ? 'edge ready' : done ? (d.completedModules.has(m.id) ? 'edge done' : 'edge ready') : 'edge';
                const x1 = a.x + NODE_W / 2;
                const y1 = a.y + NODE_H;
                const x2 = b.x + NODE_W / 2;
                const y2 = b.y;
                return <path key={`${p}-${m.id}`} className={cls} d={`M${x1},${y1} C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}`} opacity={hl.size && !(hl.has(p) && hl.has(m.id)) ? 0.25 : 1} />;
              }),
            )}
            {modules.map((m) => {
              const p = layout.pos.get(m.id)!;
              const s = st(m);
              const [t1, t2] = splitTitle(m.title);
              const prog = moduleProgress(m, d);
              return (
                <a
                  key={m.id}
                  href={`/modulo/${m.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/modulo/${m.id}`);
                  }}
                  onMouseEnter={() => setHl(new Set([m.id, ...ancestors(modules, m.id)]))}
                  onMouseLeave={() => setHl(new Set())}
                  onFocus={() => setHl(new Set([m.id, ...ancestors(modules, m.id)]))}
                  onBlur={() => setHl(new Set())}
                  aria-label={`${m.title}, nível ${levelNumber(m)}, ${STATUS_LABEL[s]}${m.prerequisites.length ? `. Pré-requisitos: ${m.prerequisites.map((x) => moduleById.get(x)!.title).join(', ')}` : ''}`}
                >
                  <g className={`node ${s}${hl.has(m.id) && hl.size > 1 ? ' hl' : ''}`} transform={`translate(${p.x},${p.y})`} opacity={hl.size && !hl.has(m.id) ? 0.35 : 1}>
                    <title>{m.title}</title>
                    <rect width={NODE_W} height={NODE_H} rx={8} />
                    {prog > 0 && prog < 1 && <rect x={0} y={NODE_H - 4} width={NODE_W * prog} height={4} rx={2} fill="var(--accent)" />}
                    <text x={8} y={17}>
                      {t1}
                    </text>
                    {t2 && (
                      <text x={8} y={30}>
                        {t2}
                      </text>
                    )}
                    <text x={8} y={NODE_H - 8} className="sub">
                      N{levelNumber(m)} · {m.id}
                      {s === 'concluido' ? ' ✓' : s === 'bloqueado' ? ' 🔒' : ''}
                    </text>
                  </g>
                </a>
              );
            })}
          </svg>
        </div>
      ) : (
        <div className="stack">
          {levels.map((l) => (
            <section key={l.id} className="card" aria-labelledby={`lv-${l.id}`}>
              <h3 id={`lv-${l.id}`}>
                <Link to={`/nivel/${l.id}`}>
                  Nível {l.number}: {l.title}
                </Link>{' '}
                <span className="small muted" lang="en">
                  {l.titleEn}
                </span>
              </h3>
              <ul className="module-list">
                {l.modules.map((m) => (
                  <li key={m.id}>
                    <Link to={`/modulo/${m.id}`} className="module-row">
                      <span>
                        <span className="t">{m.title}</span> <span className="en">{m.titleEn}</span>
                      </span>
                      <span className={`badge ${STATUS_BADGE[st(m)]}`}>{STATUS_LABEL[st(m)]}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
