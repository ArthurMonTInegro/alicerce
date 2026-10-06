import { useMemo, useState } from 'react';
import { levels, references, type ReferenceKind } from '../content.ts';
import { useHead } from '../lib/head.tsx';
import { Link } from '../lib/router.tsx';

const KIND_LABEL: Record<ReferenceKind, string> = {
  padrao: 'Padrões e especificações',
  universidade: 'Cursos universitários',
  documentacao: 'Documentação oficial',
  livro: 'Livros',
  artigo: 'Artigos e pesquisa',
  curso: 'Cursos e ferramentas abertas',
};
const KIND_ORDER: ReferenceKind[] = ['padrao', 'universidade', 'documentacao', 'livro', 'artigo', 'curso'];

export function Referencias() {
  useHead('Referências', 'Todas as fontes usadas para construir a trilha: currículos de referência, cursos universitários abertos, documentação oficial, padrões e livros, com o porquê de cada uma.');
  const [area, setArea] = useState('');
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return references.filter((r) => (!area || r.areas.includes(area)) && (!s || `${r.title} ${r.org} ${r.note}`.toLowerCase().includes(s)));
  }, [area, q]);

  return (
    <div className="container">
      <p className="eyebrow">Referências · references</p>
      <h1>De onde vem o conteúdo</h1>
      <p className="lead">
        Nenhum curso foi copiado. Estas fontes serviram de régua de escopo, sequência e profundidade, e são para onde você deve ir quando quiser se aprofundar. Cada uma diz como influenciou a trilha. A pesquisa internacional completa está em <Link to="/sobre">Sobre</Link>, e a base pedagógica em <Link to="/metodologia">Metodologia</Link>.
      </p>

      <div className="row" style={{ gap: '1rem', margin: '1rem 0 1.5rem', flexWrap: 'wrap' }}>
        <div className="field-group" style={{ margin: 0, minWidth: '240px', flex: 1 }}>
          <label htmlFor="ref-q">Buscar</label>
          <input id="ref-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ex.: Stanford, HTTP, Python" />
        </div>
        <div className="field-group" style={{ margin: 0 }}>
          <label htmlFor="ref-area">Nível</label>
          <select id="ref-area" value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="">Todos</option>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>
                Nível {l.number}: {l.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="small muted" aria-live="polite">
        {filtered.length} de {references.length} referências
      </p>

      {KIND_ORDER.map((k) => {
        const items = filtered.filter((r) => r.kind === k);
        if (!items.length) return null;
        return (
          <section key={k} aria-labelledby={`k-${k}`} style={{ marginTop: '2rem' }}>
            <h2 id={`k-${k}`}>{KIND_LABEL[k]}</h2>
            <ul className="stack" style={{ listStyle: 'none', padding: 0 }}>
              {items.map((r) => (
                <li key={r.id} id={`ref-${r.id}`} className="card">
                  <h3 style={{ margin: 0, fontSize: '1.05rem' }}>
                    <a href={r.url} target="_blank" rel="noopener noreferrer" lang="en">
                      {r.title}
                    </a>
                  </h3>
                  <p className="small muted" style={{ margin: '0.2rem 0 0.5rem' }}>
                    {r.org} · usado em {r.areas.map((a) => `N${a.slice(1)}`).join(', ')}
                  </p>
                  <p style={{ margin: 0 }}>{r.note}</p>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
