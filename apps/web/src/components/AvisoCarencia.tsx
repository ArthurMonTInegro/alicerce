/**
 * Mudança no acesso gratuito, ainda sem data (decisões do Arthur em 20/10/2026).
 *
 * Desde 07/10/2026, /planos dizia que a trilha inteira (níveis 0 a 14) ficaria
 * gratuita para sempre. Essa promessa foi retirada em 20/10/2026, com o fechamento
 * dos níveis 2 a 14 anunciado para 20/11/2026. No mesmo dia, o fechamento foi
 * adiado: como o Premium ainda não está à venda, ninguém conseguiria assinar. Os
 * níveis 2 a 14 só passam para o Premium 30 dias depois que a venda abrir, com a
 * data avisada aqui. Aqui ficam a seção "O que vai mudar" de /planos e o aviso
 * único do Layout. Sem contagem regressiva, urgência ou chamada para assinar.
 */
import { useEffect, useState, type KeyboardEvent } from 'react';
import { DEFAULT_TUTOR_DAILY_LIMIT } from '@alicerce/engine';
import { Link, useLocation } from '../lib/router.tsx';

export const CARENCIA = {
  promessaPublicadaEm: '07/10/2026',
  anunciadaEm: '20/10/2026',
  /** A data que chegou a ser anunciada e foi adiada. */
  corteAdiado: '20/11/2026',
  adiadaEm: '20/10/2026',
  /** Dias entre a abertura da venda do Premium e o fechamento dos níveis 2 a 14. */
  diasDepoisDaVenda: 30,
} as const;

export const ID_O_QUE_VAI_MUDAR = 'o-que-vai-mudar';

export function OQueVaiMudar() {
  const { promessaPublicadaEm, anunciadaEm, corteAdiado, adiadaEm, diasDepoisDaVenda } = CARENCIA;
  return (
    <section className="card" aria-labelledby={ID_O_QUE_VAI_MUDAR} style={{ margin: '1.5rem 0' }}>
      <h2 id={ID_O_QUE_VAI_MUDAR}>O que vai mudar</h2>
      <p>
        <strong>Esta página prometia a trilha inteira gratuita para sempre, e isso vai mudar.</strong> De {promessaPublicadaEm} a {anunciadaEm}, ela dizia que a trilha completa, do nível 0 ao 14, ficaria gratuita para sempre, em qualquer plano. Essa promessa foi retirada em {anunciadaEm}. Para quem já estuda aqui, nada muda por enquanto: todos os níveis continuam abertos. Os níveis 0 e 1 continuam gratuitos. Os níveis 2 a 14 só passam para a assinatura Premium {diasDepoisDaVenda} dias depois que ela começar a ser vendida, e esta página vai dizer a data com essa antecedência.
      </p>
      <p>
        Em {anunciadaEm}, esta página chegou a anunciar o fechamento dos níveis 2 a 14 para {corteAdiado}. {adiadaEm === anunciadaEm ? 'No mesmo dia' : `Em ${adiadaEm}`}, a data foi adiada: como o Premium ainda não está à venda, ninguém conseguiria assinar.
      </p>
      <p>
        A página também anunciava o tutor com IA no plano gratuito, com até {DEFAULT_TUTOR_DAILY_LIMIT} perguntas por dia, embora ele esteja desligado nesta demonstração. Quando o Premium abrir, o tutor com IA vai ficar só no Premium, com até 20 perguntas por dia dentro de 200 por mês.
      </p>
      <ul>
        <li>
          <strong>Continua gratuito:</strong> os níveis 0 e 1, com 15 lições e 54 exercícios, dicas, correção e revisão; o laboratório, o glossário, as visualizações, os roteiros de projetos e o tutor com pistas guiadas.
        </li>
        <li>
          <strong>Ninguém foi cobrado.</strong> A Alicerce nunca vendeu assinaturas nem pediu dados de pagamento. O Premium ainda não está à venda. O mapa da trilha e a descrição de cada nível vão continuar abertos.
        </li>
        <li>
          <strong>Seu progresso continua no seu aparelho.</strong> O que você estudar, em qualquer nível, continua salvo no navegador em que você estudou, a não ser que os dados do site sejam apagados nele; a mudança não apaga nada. Você pode <Link to="/progresso#h-data">exportar o seu progresso</Link> quando quiser.
        </li>
      </ul>
    </section>
  );
}

/**
 * Gravada quando a pessoa fecha o aviso; com ela, o aviso não volta neste aparelho.
 * v2: o aviso v1 dizia "até 19/11/2026"; quem o fechou vê uma vez o adiamento.
 */
export const CHAVE_AVISO_CARENCIA = 'alicerce:aviso-carencia:fechado:v2';
export const ID_AVISO_CARENCIA = 'aviso-carencia-titulo';

function fechadoAntes(): boolean {
  try {
    return localStorage.getItem(CHAVE_AVISO_CARENCIA) !== null;
  } catch {
    return false;
  }
}

/**
 * O aviso único, no topo do conteúdo. Decide no navegador, depois da hidratação (o
 * HTML pré-renderizado nunca o traz). Fechado uma vez, não volta neste aparelho
 * (se o navegador não deixar gravar, some só nesta página aberta). Não aparece em
 * /planos, que já tem a seção completa.
 */
export function AvisoCarencia() {
  const { path } = useLocation();
  const [mostrar, setMostrar] = useState(false);
  useEffect(() => {
    if (!fechadoAntes()) setMostrar(true);
  }, []);
  if (!mostrar || path.replace(/\/+$/, '') === '/planos') return null;
  const lembrar = () => {
    try {
      localStorage.setItem(CHAVE_AVISO_CARENCIA, new Date().toISOString());
    } catch {
      /* sem armazenamento: fecha só nesta página aberta */
    }
    setMostrar(false);
  };
  const fechar = () => {
    lembrar();
    // o botão some com o aviso: o foco vai para o conteúdo principal, para teclado e leitor de tela não ficarem perdidos
    document.getElementById('conteudo')?.focus({ preventScroll: true });
  };
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      fechar();
    }
  };
  const { corteAdiado, diasDepoisDaVenda } = CARENCIA;
  return (
    <div className="container">
      <section className="callout aviso-carencia" aria-labelledby={ID_AVISO_CARENCIA} onKeyDown={onKeyDown}>
        <p id={ID_AVISO_CARENCIA}>
          <strong>O acesso gratuito vai mudar</strong>
        </p>
        <p>
          O fechamento anunciado para {corteAdiado} foi adiado, e todos os níveis continuam abertos, como hoje. Quando a assinatura Premium começar a ser vendida, os níveis 0 e 1, o laboratório, o glossário e o tutor com pistas continuam gratuitos, e os níveis 2 a 14 passam para o Premium {diasDepoisDaVenda} dias depois. A data vai aparecer aqui com essa antecedência. Ninguém foi cobrado, e o seu progresso continua neste navegador.
        </p>
        <p className="row">
          <Link to={`/planos#${ID_O_QUE_VAI_MUDAR}`} onClick={lembrar}>
            Entenda o que vai mudar
          </Link>
          <Link to="/progresso#h-data">Exportar meu progresso</Link>
          <button type="button" className="btn small" onClick={fechar}>
            Fechar aviso
          </button>
        </p>
      </section>
    </div>
  );
}
