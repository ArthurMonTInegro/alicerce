import type { VizId } from '../content.ts';
import { levelById } from '../content.ts';
import { Viz, VIZ } from '../features/viz/index.tsx';
import { useHead } from '../lib/head.tsx';
import { Link, setSearchParam, useSearchParam } from '../lib/router.tsx';

const IDS = Object.keys(VIZ) as VizId[];

export function Visualizacoes() {
  useHead('Visualizações e simuladores', 'Simuladores interativos de bits, CPU, estruturas de dados, algoritmos de ordenação, busca, redes, escalonamento, hashing, SQL e redes neurais.');
  const sel = useSearchParam('v') as VizId | null;
  const current = sel && sel in VIZ ? sel : null;

  return (
    <div className="container">
      <p className="eyebrow">Visualizações · simulations</p>
      <h1>Veja por dentro</h1>
      <p className="lead">Cada simulador também aparece dentro da lição em que é usado. Aqui estão todos juntos, para explorar e revisar.</p>
      <nav aria-label="Simuladores">
        <ul className="grid" style={{ listStyle: 'none', padding: 0 }}>
          {IDS.map((id) => {
            const v = VIZ[id];
            const lv = levelById.get(v.level);
            return (
              <li key={id}>
                <a
                  href={`?v=${id}`}
                  className="card"
                  aria-current={current === id ? 'true' : undefined}
                  style={{ display: 'block', outline: current === id ? '2px solid var(--accent)' : undefined }}
                  onClick={(e) => {
                    e.preventDefault();
                    setSearchParam('v', id, false);
                    requestAnimationFrame(() => document.getElementById('viz-stage')?.focus());
                  }}
                >
                  <strong>{v.title}</strong>{' '}
                  <span className="small muted" lang="en">
                    {v.en}
                  </span>
                  <br />
                  <span className="small muted">{lv ? `Nível ${lv.number}: ${lv.title}` : ''}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
      <section id="viz-stage" tabIndex={-1} aria-live="polite" style={{ marginTop: '2rem', outline: 'none' }}>
        {current ? (
          <Viz key={current} id={current} />
        ) : (
          <p className="notice">
            Escolha um simulador acima. Não sabe por onde começar? Experimente <Link to="/visualizacoes?v=binary">Bits e bytes</Link> ou <Link to="/visualizacoes?v=sorting">Algoritmos de ordenação</Link>.
          </p>
        )}
      </section>
    </div>
  );
}
