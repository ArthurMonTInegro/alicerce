import { exercises, glossaryCount, lessons, levels, projects, STAGES, STAGE_LABEL } from '../content.ts';
import { useHead } from '../lib/head.tsx';
import { Link } from '../lib/router.tsx';
import { useDerived } from '../state/store.ts';
import { moduleProgress, nextModules } from '../lib/progress-helpers.ts';
import { VIZ } from '../features/viz/index.tsx';
import { PlanoDoDia } from '../components/PlanoDoDia.tsx';

const DIFFERENTIATORS = [
  { icon: '🧠', title: 'Você pratica, não só assiste', text: 'Cada lição alterna explicação curta e exercício. Recuperar da memória (retrieval practice) fixa mais que reler ou rever um vídeo.' },
  { icon: '⚡', title: 'Feedback na hora, no navegador', text: 'Python, JavaScript e SQL rodam aqui mesmo, sem instalar nada. Testes automáticos dizem o que passou e o que falhou.' },
  { icon: '🔍', title: 'Erros explicados em português', text: 'Cada erro vem com tradução, causa, como investigar, como corrigir e como evitar. Ler erros em inglês vira habilidade.' },
  { icon: '🗓️', title: 'Revisão espaçada', text: 'Um algoritmo de repetição espaçada (FSRS) traz cada conceito de volta pouco antes de você esquecer.' },
  { icon: '🌳', title: 'Trilha com pré-requisitos', text: 'Você vê o mapa inteiro, sabe o que vem antes de quê e o diagnóstico dispensa o que você já sabe.' },
  { icon: '💬', title: 'Tutor que não dá a resposta', text: 'O tutor faz perguntas e dá pistas graduais. Ele ajuda você a pensar, em vez de pensar por você.' },
  { icon: '🌎', title: 'Inglês técnico integrado', text: 'Todo termo aparece em português → inglês, com pronúncia. Ao final, você lê documentação oficial sem medo.' },
  { icon: '🛠️', title: 'Projetos de portfólio', text: '10 projetos de dificuldade crescente, com requisitos e critérios de aceite, do terminal até um sistema em produção.' },
];

/** Os 15 níveis empilhados como uma obra: a fundação embaixo, o topo em latão. Decorativa: a lista de níveis vem logo abaixo. */
const FILEIRAS = [[0, 1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11], [12, 13], [14]];

function Fundacao() {
  return (
    <svg className="fundacao" viewBox="0 0 340 262" aria-hidden="true" focusable="false">
      <rect className="laje" x="0" y="242" width="340" height="18" rx="3" />
      {FILEIRAS.map((fileira, r) =>
        fileira.map((n, c) => {
          const x = 8 + r * 33 + c * 66;
          const y = 196 - r * 46;
          return (
            <g key={n} className={`bloco f${r}`}>
              <rect x={x} y={y} width="60" height="40" rx="3" />
              <text x={x + 30} y={y + 26} textAnchor="middle">
                {n}
              </text>
            </g>
          );
        }),
      )}
    </svg>
  );
}

export function Home() {
  useHead('', 'Aprenda computação do zero ao avançado: lógica, Python, estruturas de dados, algoritmos, web, bancos de dados, redes, segurança, cloud e IA. Prática interativa, revisão espaçada e inglês técnico integrado.');
  const d = useDerived();
  const started = d.completedLessons.size > 0 || d.startedModules.size > 0;
  const next = nextModules(d, 3);
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <p className="eyebrow">Formação em computação · do zero ao avançado</p>
            <h1>
              Construa uma base <em>sólida</em> em computação.
            </h1>
            <p className="lead">
              Uma trilha completa em 15 níveis, inspirada nos currículos das melhores universidades e escrita em português, com o inglês técnico que o mercado exige. Você aprende fazendo: código rodando no navegador, visualizações e um tutor que guia sem entregar a resposta.
            </p>
            <div className="row">
              {started ? (
                <Link to={next[0] ? `/modulo/${next[0].id}` : '/trilha'} className="btn accent">
                  Continuar de onde parei →
                </Link>
              ) : (
                <Link to="/diagnostico" className="btn accent">
                  Fazer o diagnóstico (10 min)
                </Link>
              )}
              <Link to={started ? '/trilha' : `/licao/${lessons[0]!.id}`} className="btn">
                {started ? 'Ver a trilha' : 'Começar do zero'}
              </Link>
            </div>
            <p className="small muted" style={{ marginTop: '1rem' }}>
              Grátis, sem cadastro obrigatório. Seu progresso fica salvo neste navegador; crie uma conta para sincronizar entre dispositivos.
            </p>
          </div>
          <Fundacao />
        </div>
      </section>

      <div className="container">
        {started && <PlanoDoDia />}
        <section aria-labelledby="h-metodo">
          <h2 id="h-metodo">Como cada lição funciona</h2>
          <ol className="steps-inline" aria-label="Etapas de cada lição">
            {STAGES.map((s) => (
              <li key={s}>
                {STAGE_LABEL[s].pt} <span className="muted" lang="en">({STAGE_LABEL[s].en})</span>
              </li>
            ))}
          </ol>
          <p className="prose">
            Primeiro a ideia, depois a explicação com analogias, um exemplo resolvido, o código comentado, a prática com dificuldade crescente, um desafio, um passo do seu projeto e a revisão. <Link to="/metodologia">Por que essa ordem funciona →</Link>
          </p>
        </section>

        <section aria-labelledby="h-dif">
          <h2 id="h-dif">Por que estudar aqui e não só assistir vídeos</h2>
          <div className="grid">
            {DIFFERENTIATORS.map((x) => (
              <article className="card feature" key={x.title}>
                <h3>
                  <span className="icon" aria-hidden="true">
                    {x.icon}
                  </span>{' '}
                  {x.title}
                </h3>
                <p className="small">{x.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="h-num">
          <h2 id="h-num" className="sr-only">
            A trilha em números
          </h2>
          <ul className="stats-band">
            {[
              [levels.length, 'níveis, do computador por dentro à IA'],
              [lessons.length, 'lições com as 8 etapas completas'],
              [exercises.length, 'exercícios com correção automática'],
              [Object.keys(VIZ).length, 'visualizações interativas'],
              [glossaryCount, 'termos técnicos português → inglês'],
              [projects.length, 'projetos para o portfólio'],
            ].map(([n, t]) => (
              <li key={String(t)}>
                <span className="stat">{n}</span>
                <span className="small">{t}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="h-niveis">
          <h2 id="h-niveis">A trilha</h2>
          <div className="grid">
            {levels.map((l) => {
              const prog = l.modules.reduce((s, m) => s + moduleProgress(m, d), 0) / l.modules.length;
              return (
                <Link key={l.id} to={`/nivel/${l.id}`} className="card level-card">
                  <span className="level-num" aria-hidden="true">
                    {l.number}
                  </span>
                  <h3 style={{ margin: 0 }}>
                    <span className="sr-only">Nível {l.number}: </span>
                    {l.title}
                  </h3>
                  <span className="small muted" lang="en">
                    {l.titleEn}
                  </span>
                  <div className="progress" role="progressbar" aria-valuenow={Math.round(prog * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`Progresso no nível ${l.number}`} style={{ marginTop: '0.4rem' }}>
                    <span style={{ width: `${prog * 100}%` }} />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
