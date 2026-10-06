import { useMemo, useState } from 'react';
import { careerGuide, interviewQuestions, type InterviewQuestion } from '../content.ts';
import { useHead } from '../lib/head.tsx';
import { Markdown } from '../lib/markdown.tsx';
import { saveInterview, useProgress } from '../state/store.ts';
import { SpeakButton } from '../components/Speak.tsx';
import { setSearchParam, useSearchParam } from '../lib/router.tsx';

const CAT: Record<InterviewQuestion['category'], string> = {
  conceitos: 'Conceitos',
  codigo: 'Código',
  logica: 'Lógica',
  git: 'Git',
  'banco-de-dados': 'Banco de dados',
  redes: 'Redes',
  sistemas: 'Sistemas',
  web: 'Web',
  comportamental: 'Comportamental',
  design: 'Design de sistemas',
};
const DIFF: Record<string, string> = { facil: 'Fácil', intermediario: 'Intermediário', avancado: 'Avançado', desafio: 'Desafio' };

export function Carreira() {
  useHead('Carreira e entrevistas', 'Prepare-se para o mercado: banco de perguntas de entrevista técnica com versão em inglês, autoavaliação e guia de currículo, GitHub e portfólio.');
  const tab = useSearchParam('aba') === 'guia' ? 'guia' : 'entrevistas';
  return (
    <div className="container">
      <p className="eyebrow">Carreira · career</p>
      <h1>Carreira e entrevistas</h1>
      <p className="lead">Saber é metade do caminho; a outra metade é mostrar. Treine entrevistas (em português e em inglês) e monte currículo, GitHub e portfólio que provam o que você construiu.</p>
      <div className="segmented" role="group" aria-label="Seções" style={{ marginBottom: '1.5rem' }}>
        <button type="button" aria-pressed={tab === 'entrevistas'} onClick={() => setSearchParam('aba', null)}>
          Treino de entrevistas
        </button>
        <button type="button" aria-pressed={tab === 'guia'} onClick={() => setSearchParam('aba', 'guia')}>
          Currículo, GitHub e portfólio
        </button>
      </div>
      {tab === 'entrevistas' ? <Interviews /> : <Guide />}
    </div>
  );
}

function Guide() {
  return (
    <div className="stack">
      {careerGuide.map((s) => (
        <section key={s.id} className="card" aria-labelledby={`cg-${s.id}`}>
          <h2 id={`cg-${s.id}`} style={{ marginTop: 0 }}>
            {s.title}{' '}
            <span className="small muted" lang="en">
              {s.titleEn}
            </span>
          </h2>
          <p>{s.intro}</p>
          <dl>
            {s.items.map((it) => (
              <div key={it.title} style={{ marginBottom: '0.6rem' }}>
                <dt style={{ fontWeight: 700 }}>{it.title}</dt>
                <dd style={{ margin: '0.1rem 0 0' }}>{it.body}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

function Interviews() {
  const [cat, setCat] = useState<string>('todas');
  const [en, setEn] = useState(false);
  const list = useMemo(() => interviewQuestions.filter((q) => cat === 'todas' || q.category === cat), [cat]);
  return (
    <div>
      <p className="prose">
        Como treinar: leia a pergunta, responda <strong>em voz alta ou por escrito antes</strong> de abrir a resposta modelo, depois marque os pontos-chave que você cobriu. Ative o modo inglês para treinar entrevistas em inglês.
      </p>
      <div className="row" style={{ marginBottom: '1rem' }}>
        <label className="inline-input">
          Categoria
          <select value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="todas">Todas ({interviewQuestions.length})</option>
            {Object.entries(CAT).map(([k, v]) => (
              <option key={k} value={k}>
                {v} ({interviewQuestions.filter((q) => q.category === k).length})
              </option>
            ))}
          </select>
        </label>
        <label className="inline-input">
          <input type="checkbox" checked={en} onChange={(e) => setEn(e.target.checked)} /> Perguntas em inglês
        </label>
      </div>
      <div className="stack">
        {list.map((q) => (
          <QuestionCard key={q.id} q={q} en={en} />
        ))}
      </div>
    </div>
  );
}

function QuestionCard({ q, en }: { q: InterviewQuestion; en: boolean }) {
  const p = useProgress();
  const saved = p.interviews[q.id];
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [hits, setHits] = useState<Set<number>>(new Set(saved?.hits ?? []));
  const toggle = (i: number) => {
    const n = new Set(hits);
    if (n.has(i)) n.delete(i);
    else n.add(i);
    setHits(n);
    saveInterview(q.id, [...n].sort());
  };
  return (
    <article className="card" aria-labelledby={`iq-${q.id}`}>
      <div className="row between">
        <span className="row" style={{ gap: '0.35rem' }}>
          <span className="badge">{CAT[q.category]}</span>
          <span className={`badge diff-${q.difficulty}`}>{DIFF[q.difficulty]}</span>
        </span>
        {saved && (
          <span className="badge ok">
            último treino: {saved.hits.length}/{q.keyPoints.length} pontos
          </span>
        )}
      </div>
      <h2 id={`iq-${q.id}`} style={{ fontSize: '1.1rem', margin: '0.6rem 0 0.3rem' }} lang={en ? 'en' : 'pt-BR'}>
        {en ? q.questionEn : q.question} {en && <SpeakButton text={q.questionEn} />}
      </h2>
      {!en && (
        <p className="small muted" lang="en" style={{ margin: 0 }}>
          {q.questionEn}
        </p>
      )}
      {!open ? (
        <>
          <label htmlFor={`d-${q.id}`} className="sr-only">
            Sua resposta
          </label>
          <textarea id={`d-${q.id}`} className="field" rows={3} placeholder="Escreva sua resposta (opcional, fica só nesta tela)…" value={draft} onChange={(e) => setDraft(e.target.value)} style={{ marginTop: '0.6rem' }} />
          <button type="button" className="btn small" style={{ marginTop: '0.5rem' }} onClick={() => setOpen(true)}>
            Ver pontos-chave e resposta modelo
          </button>
        </>
      ) : (
        <div style={{ marginTop: '0.75rem' }}>
          <p style={{ margin: '0 0 0.3rem' }}>
            <strong>Marque o que sua resposta cobriu:</strong>
          </p>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {q.keyPoints.map((k, i) => (
              <li key={i}>
                <label className="row" style={{ fontWeight: 400 }}>
                  <input type="checkbox" checked={hits.has(i)} onChange={() => toggle(i)} /> {k}
                </label>
              </li>
            ))}
          </ul>
          <details className="disclosure">
            <summary>Resposta modelo</summary>
            {q.kind === 'codigo' || q.answer.includes('\n    ') ? <pre className="output">{q.answer}</pre> : <Markdown text={q.answer} />}
          </details>
          {q.followUps.length > 0 && (
            <p className="small">
              <strong>Perguntas de follow-up:</strong> {q.followUps.join(' · ')}
            </p>
          )}
        </div>
      )}
    </article>
  );
}
