import { useMemo, useState, type FormEvent } from 'react';
import { glossary, lessonById } from '@alicerce/content';
import { useHead } from '../lib/head.tsx';
import { Link } from '../lib/router.tsx';
import { SpeakButton, speak } from '../components/Speak.tsx';

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export function Glossario() {
  useHead('Glossário português → inglês', `Os ${glossary.length} termos técnicos da trilha em português e inglês, com definição, exemplo de uso real e pronúncia.`);
  const [q, setQ] = useState('');
  const [practice, setPractice] = useState(false);
  const list = useMemo(() => {
    const t = norm(q.trim());
    return t ? glossary.filter((g) => norm(`${g.pt} ${g.en} ${g.def}`).includes(t)) : glossary;
  }, [q]);
  return (
    <div className="container">
      <p className="eyebrow">Glossário · glossary</p>
      <h1>Glossário técnico</h1>
      <p className="lead">Cada termo em português e em inglês, com definição curta, exemplo de uso real e pronúncia. Ler documentação em inglês começa por aqui.</p>
      <div className="row" style={{ marginBottom: '1rem' }}>
        <div className="field-group" style={{ flex: 1, minWidth: 220, margin: 0 }}>
          <label htmlFor="g-busca">Buscar em português ou inglês</label>
          <input id="g-busca" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ex.: laço, loop, função…" />
        </div>
        <button type="button" className="btn" onClick={() => setPractice((p) => !p)} aria-expanded={practice} style={{ alignSelf: 'flex-end' }}>
          {practice ? 'Fechar treino' : '🎯 Treinar vocabulário'}
        </button>
      </div>
      {practice && <VocabPractice />}
      <p className="small muted" role="status">
        {list.length} termo(s)
      </p>
      <dl className="terms-list" style={{ margin: 0 }}>
        {list.map((g) => (
          <div key={g.en} className="card" style={{ padding: '0.7rem 0.85rem' }}>
            <dt className="term-pair">
              <span className="pt">{g.pt}</span>
              <span className="arrow" aria-hidden="true">
                →
              </span>
              <span className="en" lang="en">
                {g.en}
              </span>
              <SpeakButton text={g.en} />
            </dt>
            <dd style={{ margin: 0 }}>
              <p className="term-def">{g.def}</p>
              {g.example && (
                <p className="term-ex" lang="en">
                  “{g.example}”
                </p>
              )}
              {g.lessonIds.length > 0 && (
                <p className="small" style={{ margin: '0.3rem 0 0' }}>
                  Visto em:{' '}
                  {g.lessonIds.slice(0, 3).map((id, i) => (
                    <span key={id}>
                      {i > 0 && ', '}
                      <Link to={`/licao/${id}`}>{lessonById.get(id)?.title}</Link>
                    </span>
                  ))}
                </p>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function VocabPractice() {
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * glossary.length));
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<'ok' | 'err' | null>(null);
  const [score, setScore] = useState({ ok: 0, total: 0 });
  const term = glossary[seed % glossary.length]!;
  const accepted = term.en
    .toLowerCase()
    .split(/[/(),]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const check = (e: FormEvent) => {
    e.preventDefault();
    const a = answer.trim().toLowerCase();
    const ok = accepted.some((x) => x === a) || a === term.en.toLowerCase();
    setResult(ok ? 'ok' : 'err');
    setScore((s) => ({ ok: s.ok + (ok ? 1 : 0), total: s.total + 1 }));
    if (ok) speak(term.en);
  };
  const next = () => {
    setSeed(Math.floor(Math.random() * glossary.length));
    setAnswer('');
    setResult(null);
  };
  return (
    <form className="card" onSubmit={check} style={{ marginBottom: '1.5rem' }} aria-labelledby="vp-t">
      <h2 id="vp-t" style={{ marginTop: 0, fontSize: '1.15rem' }}>
        Como se diz em inglês?
      </h2>
      <p style={{ fontSize: '1.3rem', margin: '0.2rem 0' }}>
        <strong>{term.pt}</strong>
      </p>
      <p className="small muted">{term.def}</p>
      <div className="row">
        <label htmlFor="vp-in" className="sr-only">
          Termo em inglês
        </label>
        <input id="vp-in" type="text" lang="en" value={answer} onChange={(e) => setAnswer(e.target.value)} autoComplete="off" autoCapitalize="off" style={{ maxWidth: 320 }} disabled={result !== null} />
        {result === null ? (
          <button type="submit" className="btn primary">
            Verificar
          </button>
        ) : (
          <button type="button" className="btn primary" onClick={next}>
            Próximo →
          </button>
        )}
        <span className="small muted">
          {score.ok}/{score.total} acertos
        </span>
      </div>
      {result && (
        <p className={`feedback ${result === 'ok' ? 'ok' : 'err'}`} role="status">
          {result === 'ok' ? 'Isso! ' : 'Quase. '}A resposta é <strong lang="en">{term.en}</strong> <SpeakButton text={term.en} />
        </p>
      )}
    </form>
  );
}
