/**
 * Textos da transição da promessa de acesso gratuito: a seção "O que mudou" de
 * /planos e a caixa do aviso único. Os dois dizem a mesma coisa; o aviso é a
 * versão curta. Sem urgência, contagem regressiva ou chamada para assinar: um
 * teste confere isso (src/components/TransicaoAcesso.test.tsx).
 *
 * O aviso só aparece com TRANSICAO_ACESSO.avisoLigado e uma data de corte
 * válida (packages/engine/src/transicao.ts), que vêm desligados. Ele nunca
 * libera conteúdo: o progresso local só decide se um texto aparece.
 */
import { useEffect, useState, type KeyboardEvent } from 'react';
import { avisoDeTransicaoAtivo, PLANS, TRANSICAO_ACESSO, type ConfigTransicao } from '@alicerce/engine';
import { levels } from '../content.ts';
import { Link, useLocation } from '../lib/router.tsx';
import { CHAVE_AVISO_FECHADO, datasDaTransicao, deveMostrarAviso, indiceDoCatalogo, registrarAvisoFechado, rotaSemAviso } from '../lib/transicao.ts';

export const ID_O_QUE_MUDOU = 'o-que-mudou';

export function OQueMudou({ cfg = TRANSICAO_ACESSO }: { cfg?: ConfigTransicao }) {
  const { promessa, decisao, corte, anuncio, abertoAte } = datasDaTransicao(cfg);
  return (
    <section className="card" aria-labelledby={ID_O_QUE_MUDOU} style={{ margin: '1.5rem 0' }}>
      <h2 id={ID_O_QUE_MUDOU}>O que mudou</h2>
      <p>
        <strong>Esta página prometia a trilha inteira gratuita, e isso mudou.</strong> De {promessa} até {anuncio ?? corte ?? 'esta atualização'}, ela dizia que a trilha completa, do nível 0 ao 14, ficaria gratuita para sempre, em qualquer plano. {anuncio && abertoAte ? `Em ${anuncio}, a mudança foi anunciada aqui, e os níveis 2 a 14 continuaram abertos até ${abertoAte}. ` : ''}Essa promessa foi retirada, e a frase “A Alicerce é gratuita”, da página Sobre, também foi corrigida. A decisão foi confirmada em {decisao} e vale {corte ? `desde ${corte}` : 'a partir desta versão da página'}: os níveis 0 e 1 continuam gratuitos, e os níveis 2 a 14 passam a fazer parte da assinatura Premium.
      </p>
      <p>
        A mesma página também anunciava o tutor com IA no plano gratuito, com até 60 perguntas por dia (300 no Premium), embora ele estivesse desligado na demonstração publicada. Agora o tutor com IA fica só no Premium, com até {PLANS.premium.tutorDailyLimit} perguntas por dia dentro de {PLANS.premium.tutorMonthlyLimit} por mês.
      </p>
      <p>Se você começou a estudar os níveis 2 a 14 contando com essa promessa, a mudança afeta você diretamente: as aulas desses níveis deixam de abrir sem assinatura, e o Premium ainda não está à venda.</p>
      <ul>
        <li>
          <strong>Continua gratuito:</strong> os níveis 0 e 1, com 15 lições e 54 exercícios, dicas, correção e revisão; o laboratório, o glossário, as visualizações, as missões introdutórias de inglês, os roteiros de projetos e o tutor local com pistas.
        </li>
        <li>
          <strong>Ninguém foi cobrado.</strong> A Alicerce nunca vendeu assinaturas nem pediu dados de pagamento. Enquanto o Premium não estiver à venda, não há como assinar os níveis 2 a 14. O mapa da trilha e a descrição de cada nível continuam abertos.
        </li>
        <li>
          <strong>Seu progresso continua no seu aparelho.</strong> O que você estudou, em qualquer nível, continua salvo no navegador em que você estudou, a não ser que os dados do site tenham sido apagados nele; esta mudança não apaga nada. Você pode <Link to="/progresso#h-data">exportar o seu progresso</Link> quando quiser. Esse registro serve para você retomar os estudos; ele não libera as aulas pagas.
        </li>
      </ul>
    </section>
  );
}

export const ID_AVISO = 'aviso-transicao-titulo';

interface CaixaProps {
  cfg?: ConfigTransicao;
  onFechar: () => void;
  /** Chamado ao seguir "Entenda o que mudou": quem vai ler a explicação completa não precisa ver o aviso de novo. */
  onEntender?: () => void;
}

/** A caixa do aviso, sem estado: o texto curto, dois links e o botão de fechar. Esc também fecha. */
export function AvisoTransicaoCaixa({ cfg = TRANSICAO_ACESSO, onFechar, onEntender }: CaixaProps) {
  const { promessa, corte, anuncio } = datasDaTransicao(cfg);
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onFechar();
    }
  };
  return (
    <div className="container">
      <section className="callout aviso-transicao" aria-labelledby={ID_AVISO} onKeyDown={onKeyDown}>
        <p id={ID_AVISO}>
          <strong>A regra de acesso gratuito mudou</strong>
        </p>
        <p>
          De {promessa} até {anuncio ?? corte ?? 'esta atualização'}, a página Planos dizia que a trilha inteira seria gratuita para sempre. Isso mudou: continuam gratuitos os níveis 0 e 1, o laboratório, o glossário e o tutor local; os níveis 2 a 14 passam para o Premium, que ainda não está à venda. Ninguém foi cobrado, e o seu progresso continua neste navegador.
        </p>
        <p className="row">
          <Link to={`/planos#${ID_O_QUE_MUDOU}`} onClick={onEntender}>
            Entenda o que mudou
          </Link>
          <Link to="/progresso#h-data">Exportar meu progresso</Link>
          <button type="button" className="btn small" onClick={onFechar}>
            Fechar aviso
          </button>
        </p>
      </section>
    </div>
  );
}

function armazenamento(tipo: 'localStorage' | 'sessionStorage' = 'localStorage'): Storage | null {
  try {
    return window[tipo];
  } catch {
    return null;
  }
}

/**
 * O aviso único, ligado ao Layout. Decide no navegador, depois da hidratação (o
 * HTML pré-renderizado nunca o traz). Fechado uma vez, não volta neste aparelho,
 * nem em outra aba aberta (se o localStorage recusar a gravação, não volta ao
 * menos nesta aba). Não aparece em /planos, que já tem a seção completa.
 */
export function AvisoTransicao({ cfg = TRANSICAO_ACESSO }: { cfg?: ConfigTransicao }) {
  const { path } = useLocation();
  const [mostrar, setMostrar] = useState(false);
  useEffect(() => {
    if (!avisoDeTransicaoAtivo(cfg)) return;
    const arm = armazenamento();
    if (!arm || !deveMostrarAviso(arm, () => indiceDoCatalogo(levels), cfg, armazenamento('sessionStorage'))) return;
    setMostrar(true);
    const outraAba = (e: StorageEvent) => {
      if (e.key === CHAVE_AVISO_FECHADO && e.newValue !== null) setMostrar(false);
    };
    window.addEventListener('storage', outraAba);
    return () => window.removeEventListener('storage', outraAba);
  }, [cfg]);
  if (!mostrar || rotaSemAviso(path)) return null;
  const lembrar = () => {
    const arm = armazenamento();
    if (arm) registrarAvisoFechado(arm, Date.now(), armazenamento('sessionStorage'));
    setMostrar(false);
  };
  const fechar = () => {
    lembrar();
    // o botão some com o aviso: o foco vai para o conteúdo principal, para teclado e leitor de tela não ficarem perdidos
    document.getElementById('conteudo')?.focus({ preventScroll: true });
  };
  return <AvisoTransicaoCaixa cfg={cfg} onFechar={fechar} onEntender={lembrar} />;
}
