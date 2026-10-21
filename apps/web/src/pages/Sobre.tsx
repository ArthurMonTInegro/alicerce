import { countryCurricula, referenceById, universityPrograms, usUniversityRefs, type ResearchSource } from '../content.ts';
import { TRANSICAO_ACESSO } from '@alicerce/engine';
import { CARENCIA, ID_O_QUE_VAI_MUDAR } from '../components/AvisoCarencia.tsx';
import { useHead } from '../lib/head.tsx';
import { Link } from '../lib/router.tsx';

export function Sobre() {
  useHead('Sobre a Alicerce', 'O que é a Alicerce, o que a diferencia de cursos em vídeo e a pesquisa internacional (currículos nacionais e universidades) que fundamenta a trilha.');
  return (
    <div className="container prose" style={{ maxWidth: '84ch' }}>
      <p className="eyebrow">Sobre · about</p>
      <h1>Uma formação em computação, do zero ao avançado</h1>
      {TRANSICAO_ACESSO.niveisPagosAbertos ? (
        <p className="lead">A Alicerce funciona no navegador (inclusive no celular, sem instalar nada) e foi desenhada para quem nunca programou construir, passo a passo, uma base sólida em ciência da computação. Os níveis 0 e 1 são gratuitos. Os níveis 2 a 14 também estão abertos por enquanto; eles passam a fazer parte da assinatura Premium {CARENCIA.diasDepoisDaVenda} dias depois que ela começar a ser vendida. Detalhes em <Link to={`/planos#${ID_O_QUE_VAI_MUDAR}`}>Planos</Link>.</p>
      ) : (
        <p className="lead">A Alicerce funciona no navegador (inclusive no celular, sem instalar nada) e foi desenhada para quem nunca programou construir, passo a passo, uma base sólida em ciência da computação. Os níveis 0 e 1 são gratuitos; do nível 2 ao 14, a continuação faz parte da assinatura Premium, que ainda não está à venda. Detalhes em <Link to="/planos">Planos</Link>.</p>
      )}

      <h2>O que muda em relação a assistir vídeos</h2>
      <ul>
        <li>
          <strong>Você faz, não assiste</strong>: cada lição tem código executável, exercícios com retorno imediato e um desafio.
        </li>
        <li>
          <strong>A plataforma lembra por você</strong>: a revisão espaçada traz de volta o que você está prestes a esquecer.
        </li>
        <li>
          <strong>Você vê o invisível</strong>: rastreador linha a linha, simuladores de memória, CPU, redes e algoritmos.
        </li>
        <li>
          <strong>Erros viram aula</strong>: tradução e diagnóstico de cada mensagem de erro.
        </li>
        <li>
          <strong>Ajuda em etapas</strong>: dicas graduais e um tutor que orienta com perguntas e pistas. Dá para ver a solução, mas o exercício volta na revisão para você refazer sem ajuda.
        </li>
        <li>
          <strong>Mapa honesto</strong>: árvore de pré-requisitos, diagnóstico inicial e domínio estimado por habilidade, a partir dos seus exercícios.
        </li>
        <li>
          <strong>Inglês técnico desde o primeiro dia</strong>, e preparação para entrevistas e portfólio.
        </li>
      </ul>

      <h2>Pesquisa internacional</h2>
      <p>
        Antes de escrever uma linha de conteúdo, comparamos o que se ensina em currículos nacionais e em universidades de referência. O objetivo não é copiar nenhum curso, e sim responder: <em>o que é essencial, em que ordem e com que profundidade?</em> O corpo de conhecimento do <a href="https://csed.acm.org/" target="_blank" rel="noopener noreferrer">ACM/IEEE CS2023</a> serviu de checklist de cobertura.
      </p>

      <h3>Currículos nacionais</h3>
      <SourceTable rows={countryCurricula} caption="Currículos e diretrizes nacionais consultados, e a decisão que cada um motivou." />

      <h3>Universidades</h3>
      <SourceTable rows={universityPrograms} caption="Programas universitários consultados fora dos EUA." />
      <p>Das universidades norte-americanas, usamos cursos abertos específicos, citados nas lições em que influenciaram o conteúdo:</p>
      <ul>
        {usUniversityRefs.map((id) => {
          const r = referenceById.get(id);
          if (!r) return null;
          return (
            <li key={id}>
              <a href={r.url} target="_blank" rel="noopener noreferrer" lang="en">
                {r.title}
              </a>{' '}
              <span className="small muted">({r.org})</span>
            </li>
          );
        })}
      </ul>
      <p>
        A lista completa, com documentação oficial e padrões, está em <Link to="/referencias">Referências</Link>. A base em ciência da aprendizagem está em <Link to="/metodologia">Metodologia</Link>.
      </p>

      <h2>Privacidade</h2>
      <p>
        O progresso fica no seu navegador. Nos níveis gratuitos, não é preciso criar conta; o Premium, quando estiver à venda, vai exigir uma conta com assinatura ativa. Não há anúncios nem rastreadores de terceiros. Detalhes em <Link to="/privacidade">Privacidade</Link>.
      </p>
    </div>
  );
}

function SourceTable({ rows, caption }: { rows: ResearchSource[]; caption: string }) {
  return (
    <div className="table-wrap">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Onde</th>
            <th scope="col">O que observamos</th>
            <th scope="col">Decisão na trilha</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <th scope="row">
                {r.where}
                <br />
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="small" lang="en">
                  {r.title}
                </a>
              </th>
              <td>{r.finding}</td>
              <td>{r.decision}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
