import { learningEvidence, STAGE_LABEL, STAGES } from '@alicerce/content';
import { MASTERY_THRESHOLD, MIN_EVIDENCE } from '@alicerce/engine';
import { useHead } from '../lib/head.tsx';
import { Link } from '../lib/router.tsx';

const STAGE_WHY: Record<(typeof STAGES)[number], string> = {
  conceito: 'A ideia em uma frase e por que ela existe. Dá um gancho para o resto se pendurar.',
  explicacao: 'O modelo mental: como a coisa funciona por dentro, com analogias e visualizações interativas.',
  exemplo: 'Um exemplo resolvido, comentado passo a passo. Para quem começa, estudar exemplos rende mais do que resolver no escuro.',
  codigo: 'Código real que você executa, modifica e acompanha linha a linha no rastreador.',
  exercicio: 'Prática com retorno imediato: prever saída, completar, ordenar linhas, escrever e consertar código.',
  desafio: 'Um problema que exige combinar o que você sabe, com dicas graduais e sem resposta pronta.',
  projeto: 'A ponte para o mundo real: um marco de um projeto maior, que vai para o seu portfólio.',
  revisao: 'Vocabulário, cartões de memória e fontes. Ao concluir, os cartões entram na revisão espaçada.',
};

export function Metodologia() {
  useHead('Metodologia', 'Como a Alicerce ensina: as oito etapas de cada lição, a base em pesquisa sobre aprendizagem, a escolha de Python, o domínio por habilidade e a revisão espaçada.');
  return (
    <div className="container prose" style={{ maxWidth: '80ch' }}>
      <p className="eyebrow">Metodologia · how we teach</p>
      <h1>Como você aprende aqui</h1>
      <p className="lead">Vídeo dá a sensação de aprender; quem aprende de fato é quem pratica, erra, recebe retorno e revisa no tempo certo. Toda a plataforma é construída em volta disso.</p>

      <h2>As oito etapas de cada lição</h2>
      <ol>
        {STAGES.map((s) => (
          <li key={s}>
            <strong>{STAGE_LABEL[s].pt}</strong> <span className="muted" lang="en">({STAGE_LABEL[s].en})</span>: {STAGE_WHY[s]}
          </li>
        ))}
      </ol>
      <p>Os testes automáticos do conteúdo garantem que nenhuma lição pule as etapas obrigatórias (conceito, exercícios e revisão) e que todo exercício tenha dicas e explicação.</p>

      <h2>O que a pesquisa diz, e onde isso aparece</h2>
      <div className="table-wrap">
        <table>
          <caption>Princípios de aprendizagem com evidência e como a plataforma os aplica.</caption>
          <thead>
            <tr>
              <th scope="col">Princípio</th>
              <th scope="col">Evidência</th>
              <th scope="col">Na plataforma</th>
            </tr>
          </thead>
          <tbody>
            {learningEvidence.map((e) => (
              <tr key={e.id}>
                <th scope="row">
                  {e.principle}
                  <br />
                  <span className="small muted" lang="en">
                    {e.principleEn}
                  </span>
                </th>
                <td>
                  {e.finding}{' '}
                  <a href={e.url} target="_blank" rel="noopener noreferrer" className="small">
                    {e.citation}
                  </a>
                </td>
                <td>{e.inPlatform}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Por que Python como primeira linguagem</h2>
      <ul>
        <li>
          <strong>Sintaxe que não atrapalha</strong>: blocos por recuo e poucas palavras obrigatórias. O esforço vai para o raciocínio (laços, decisões, funções), não para ponto e vírgula.
        </li>
        <li>
          <strong>Escolha das referências</strong>: é a linguagem das introduções do MIT (6.100L) e do CS 61A de Berkeley, do programa francês NSI e do exame de computação de Singapura (ver <Link to="/sobre">Sobre</Link>).
        </li>
        <li>
          <strong>Alcance profissional</strong>: dados, automação, back-end, ciência e IA. O que você aprende no Nível 2 é usado até o Nível 13.
        </li>
        <li>
          <strong>Roda no navegador</strong>: com Pyodide (CPython compilado para WebAssembly), você executa código de verdade sem instalar nada, inclusive no celular.
        </li>
      </ul>
      <p>
        JavaScript entra no Nível 6 (Web), quando faz sentido de verdade, e SQL no Nível 7. Aprender a segunda linguagem depois de dominar a primeira é muito mais fácil, e comparar as duas fixa os conceitos que não dependem de linguagem.
      </p>

      <h2>Domínio por habilidade, não por "assistiu"</h2>
      <p>
        Cada exercício treina habilidades nomeadas. A nota de uma tentativa considera acerto, tentativas erradas, dicas usadas e se a solução foi revelada; exercícios mais difíceis pesam mais. Uma habilidade é considerada <strong>dominada</strong> com pontuação de pelo menos {Math.round(MASTERY_THRESHOLD * 100)}% e no mínimo {MIN_EVIDENCE} evidências. Com o tempo sem prática, a retenção estimada cai e a habilidade passa a <strong>revisar</strong>: ela volta como desafio de retenção na página de <Link to="/revisao">Revisão</Link>.
      </p>

      <h2>Pré-requisitos sem prisão</h2>
      <p>
        A <Link to="/trilha">árvore de conhecimento</Link> mostra o que vem antes de cada módulo. Módulos com pré-requisitos pendentes aparecem bloqueados, mas você pode estudar mesmo assim: a plataforma avisa e registra a escolha. Quem já sabe parte do conteúdo faz o <Link to="/diagnostico">diagnóstico</Link> e dispensa os módulos correspondentes.
      </p>

      <h2>Errar com método</h2>
      <p>Toda mensagem de erro é traduzida e explicada em cinco partes: o que aconteceu, por que, como investigar, como corrigir e como evitar. A mensagem original em inglês continua visível, porque é ela que você vai pesquisar no trabalho.</p>

      <h2>Tutor que não entrega a resposta</h2>
      <p>O tutor faz perguntas e dá a próxima pista, nunca a solução. Sem conexão com IA, um tutor offline usa a escada de dicas do exercício e perguntas específicas para cada tipo de erro. A solução só aparece depois de várias tentativas, sempre com a explicação.</p>

      <h2>Inglês técnico o tempo todo</h2>
      <p>
        Todo termo aparece como <em>termo em português → term in English</em>, com pronúncia, exemplo de uso real e prática de vocabulário no <Link to="/glossario">Glossário</Link>. Mensagens de erro, documentação e entrevistas são em inglês; aqui você se acostuma desde o primeiro dia.
      </p>
    </div>
  );
}
