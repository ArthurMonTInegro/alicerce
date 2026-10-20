import { describe, expect, it, vi } from 'vitest';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PLANS, TRANSICAO_ACESSO, type ConfigTransicao } from '@alicerce/engine';
import { Planos } from '../pages/Planos.tsx';
import { AvisoTransicao, AvisoTransicaoCaixa, ID_AVISO, ID_O_QUE_MUDOU, OQueMudou } from './TransicaoAcesso.tsx';

const LIGADO: ConfigTransicao = { ...TRANSICAO_ACESSO, avisoLigado: true, corte: '2026-10-20' };

/** Texto visível de um trecho de HTML, sem as marcações. */
const texto = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

/** Pressão para agir: urgência, prazo, escassez, contagem regressiva, oferta, chamada para assinar ou comprar. */
const URGENCIA = [
  /urgen/i,
  /últim[ao]s?\s+(dias?|horas?|chances?|vagas?|oportunidades?)/i,
  /\b(só|somente|apenas)\s+hoje\b/i,
  /\bcorra\b/i,
  /aproveite/i,
  /agora mesmo/i,
  /não (perca|fique de fora)/i,
  /contagem regressiva/i,
  /\brestam?\b/i,
  /expira/i,
  /tempo limitado/i,
  /\boferta/i,
  /desconto/i,
  /promoç/i,
  /imperdível/i,
  /\bgaranta\b/i,
  /assine (já|agora|hoje|logo)/i,
  /antes que (acabe|seja tarde)/i,
  /vagas limitadas/i,
  /enquanto durar/i,
  /\b\d+\s*(dias?|horas?|minutos?)\s+(restantes|para acabar|para o fim)/i,
  /\bfaltam?\s+(só|apenas|\d)/i,
  /ainda dá tempo/i,
  /\bsó até\b/i,
  /(você )?vai perder|perderá|ficará de fora/i,
  /\bprazo\b/i,
];
/** Culpa ou cobrança moral: o texto informa, não acusa nem constrange quem estudou. */
const CULPA = [/\bculpa/i, /você deveria/i, /deveria ter/i, /por (sua|tua) causa/i, /irresponsáve/i, /vergonha/i, /\bdecepcion/i, /não seja/i];
const URGENCIA_E_CULPA = [...URGENCIA, ...CULPA];
const semUrgencia = (t: string) => URGENCIA_E_CULPA.filter((r) => r.test(t)).map(String);

/** Links e botões do trecho: nenhum leva a assinar, comprar ou pagar. */
const chamadasParaPagar = (html: string) => [...html.matchAll(/<(a|button)\b[^>]*>(.*?)<\/\1>/g)].map((m) => texto(m[2]!)).filter((t) => /assin|compr|pag|checkout|premium/i.test(t));

describe('detector de pressão (para o teste não passar de graça)', () => {
  it('pega frases típicas de urgência e chamadas para pagar', () => {
    for (const f of ['Assine agora!', 'Últimos dias para garantir', 'Oferta só hoje', 'Restam 3 vagas', 'Não perca', 'Faltam 2 dias restantes', 'Promoção por tempo limitado', 'Ainda dá tempo', 'Você vai perder o acesso', 'Prazo final: sexta', 'Você deveria ter assinado', 'A culpa é sua'])
      expect(semUrgencia(f), f).not.toEqual([]);
    expect(chamadasParaPagar('<a href="/x">Assinar o Premium</a><button>Pagar</button><a href="/y">Ler</a>')).toEqual(['Assinar o Premium', 'Pagar']);
  });
});

function secao(html: string, id: string): string {
  const inicio = html.indexOf(`aria-labelledby="${id}"`);
  expect(inicio, `seção ${id} ausente`).toBeGreaterThan(-1);
  const abre = html.lastIndexOf('<section', inicio);
  return html.slice(abre, html.indexOf('</section>', inicio) + '</section>'.length);
}

describe('/planos: seção "O que mudou" (texto obrigatório)', () => {
  const html = renderToStaticMarkup(<Planos />);
  const bloco = secao(html, ID_O_QUE_MUDOU);
  const t = texto(bloco);

  it('existe, tem título próprio e vem antes da tabela de planos', () => {
    expect(bloco).toContain(`<h2 id="${ID_O_QUE_MUDOU}">O que mudou</h2>`);
    expect(html.indexOf(ID_O_QUE_MUDOU)).toBeLessThan(html.indexOf('<h2>Gratuito</h2>'));
  });

  it('diz com todas as letras o que a página prometia, que mudou e quando', () => {
    expect(t).toContain('Esta página prometia a trilha inteira gratuita, e isso mudou.');
    expect(t).toContain('do nível 0 ao 14, ficaria gratuita para sempre, em qualquer plano');
    expect(t).toContain('Essa promessa foi retirada');
    // a página Sobre também dizia "A Alicerce é gratuita" na demo publicada
    expect(t).toContain('a frase “A Alicerce é gratuita”, da página Sobre, também foi corrigida');
    expect(t).toContain('De 7 de outubro de 2026 até esta atualização');
    expect(t).toContain('confirmada em 13 de outubro de 2026');
  });

  it('também diz que o tutor com IA saiu do gratuito (a página publicada anunciava 60 perguntas por dia no gratuito)', () => {
    expect(t).toContain('anunciava o tutor com IA no plano gratuito, com até 60 perguntas por dia (300 no Premium)');
    expect(t).toContain('desligado na demonstração publicada');
    expect(t).toContain(`fica só no Premium, com até ${PLANS.premium.tutorDailyLimit} perguntas por dia dentro de ${PLANS.premium.tutorMonthlyLimit} por mês`);
  });

  it('diz o que continua gratuito, que ninguém foi cobrado e que o progresso continua no aparelho', () => {
    expect(t).toContain('os níveis 0 e 1 continuam gratuitos');
    expect(t).toMatch(/Continua gratuito: os níveis 0 e 1, com 15 lições e 54 exercícios/);
    expect(t).toContain('o tutor local com pistas');
    expect(t).toContain('Ninguém foi cobrado.');
    expect(t).toContain('Seu progresso continua no seu aparelho.');
    expect(t).toContain('esta mudança não apaga nada');
    // honesto sobre o limite: o navegador pode ter apagado os dados por conta própria
    expect(t).toContain('a não ser que os dados do site tenham sido apagados nele');
    expect(bloco).toContain('href="/progresso#h-data"');
    // e não insinua que o progresso local libera alguma coisa
    expect(t).toContain('ele não libera as aulas pagas');
  });

  it('não tem linguagem de urgência nem chamada para assinar ou pagar', () => {
    expect(semUrgencia(t)).toEqual([]);
    expect(chamadasParaPagar(bloco)).toEqual([]);
  });

  it('com a data de corte decidida, mostra a data no lugar de "esta atualização"', () => {
    const t2 = texto(renderToStaticMarkup(<OQueMudou cfg={LIGADO} />));
    expect(t2).toContain('De 7 de outubro de 2026 até 20 de outubro de 2026');
    expect(t2).toContain('vale desde 20 de outubro de 2026');
    expect(semUrgencia(t2)).toEqual([]);
  });

  it('a página inteira não promete mais a trilha gratuita para sempre fora da seção que explica a mudança', () => {
    const fora = texto(html.replace(bloco, ''));
    expect(fora).not.toMatch(/para sempre/i);
    expect(fora).not.toMatch(/trilha (inteira|completa)[^.]*gratuit/i);
  });
});

/**
 * A /planos publicada (main, desde 07/10/2026) fazia compromissos sobre a
 * assinatura futura. A versão nova não pode tirá-los sem aviso: eles voltam,
 * valendo para quando houver cobrança, sem prometer o que ainda não existe.
 */
describe('/planos: compromissos da assinatura', () => {
  const html = renderToStaticMarkup(<Planos />);
  const bloco = secao(html, 'compromissos');
  const t = texto(bloco);

  it('existe, com título próprio, depois dos planos', () => {
    expect(bloco).toContain('<h2 id="compromissos">Compromissos</h2>');
    expect(html.indexOf('id="compromissos"')).toBeGreaterThan(html.indexOf('<h2>Premium</h2>'));
  });

  it('diz que hoje não há cobrança e que os compromissos valem para quando a assinatura existir', () => {
    expect(t).toContain('Hoje não há cobrança: nada está à venda e nenhum dado de pagamento é pedido.');
    expect(t).toContain('Quando a assinatura existir, ela vai seguir estes compromissos');
  });

  it('traz de volta os compromissos que a página publicada fazia', () => {
    expect(t).toContain('Cancelar vai ser simples, a partir da sua conta, sem etapas para dificultar.');
    expect(t).toContain('desistir em até 7 dias e recebe de volta o que pagou');
    expect(t).toContain('Código de Defesa do Consumidor (art. 49)');
    expect(t).toContain('Se ele mudar antes do lançamento, esta página muda antes de qualquer cobrança.');
    expect(t).toContain('Sem publicidade invasiva, sem contagem regressiva, sem falsa urgência e sem venda de dados.');
    expect(t).toContain('Os dados do cartão vão ficar só com o provedor de pagamento, nunca na Alicerce.');
    expect(t).toContain('condições de pagamento, renovação, cancelamento e reembolso');
    expect(bloco).toContain('href="/privacidade"');
  });

  it('não tem botão nem link para assinar ou pagar', () => {
    expect(chamadasParaPagar(bloco)).toEqual([]);
    expect(bloco).not.toContain('<button');
  });
});

describe('aviso único', () => {
  const html = renderToStaticMarkup(<AvisoTransicaoCaixa cfg={LIGADO} onFechar={() => {}} />);
  const t = texto(html);

  it('o mesmo conteúdo em poucas linhas, com link para /planos e para exportar o progresso', () => {
    expect(t).toContain('A regra de acesso gratuito mudou');
    // a promessa vale de 7 de outubro até o corte, não "desde sempre"
    expect(t).toContain('De 7 de outubro de 2026 até 20 de outubro de 2026, a página Planos dizia que a trilha inteira seria gratuita para sempre. Isso mudou');
    expect(t).toContain('continuam gratuitos os níveis 0 e 1');
    expect(t).toContain('Ninguém foi cobrado');
    expect(t).toContain('o seu progresso continua neste navegador');
    expect(html).toContain(`href="/planos#${ID_O_QUE_MUDOU}"`);
    expect(html).toContain('href="/progresso#h-data"');
    expect(t.split(/[.!?](\s|$)/).filter((f) => f.trim()).length).toBeLessThanOrEqual(8);
  });

  it('sem urgência, contagem regressiva ou chamada para assinar', () => {
    expect(semUrgencia(t)).toEqual([]);
    expect(chamadasParaPagar(html)).toEqual([]);
  });

  it('acessível: região com nome, botão de fechar de verdade, sem roubar o foco nem interromper o leitor de tela', () => {
    expect(html).toMatch(new RegExp(`<section[^>]*aria-labelledby="${ID_AVISO}"`));
    expect(html).toContain(`id="${ID_AVISO}"`);
    expect(html).toMatch(/<button type="button"[^>]*>Fechar aviso<\/button>/);
    expect(html).not.toMatch(/autofocus|role="alert"|aria-live="assertive"|tabindex="[1-9]/i);
  });

  it('Esc fecha o aviso quando o foco está nele', () => {
    const onFechar = vi.fn();
    const arvore = AvisoTransicaoCaixa({ cfg: LIGADO, onFechar });
    const caixa = encontrar(arvore, (el) => el.type === 'section');
    const stopPropagation = vi.fn();
    (caixa.props as { onKeyDown: (e: unknown) => void }).onKeyDown({ key: 'Tab', stopPropagation });
    expect(onFechar).not.toHaveBeenCalled();
    (caixa.props as { onKeyDown: (e: unknown) => void }).onKeyDown({ key: 'Escape', stopPropagation });
    expect(onFechar).toHaveBeenCalledOnce();
    expect(stopPropagation).toHaveBeenCalledOnce();
  });

  it('nunca vem no HTML pré-renderizado, nem com a chave ligada: só o navegador decide', () => {
    expect(renderToStaticMarkup(<AvisoTransicao cfg={LIGADO} />)).toBe('');
    expect(renderToStaticMarkup(<AvisoTransicao />)).toBe('');
  });
});

function encontrar(no: ReactNode, teste: (el: ReactElement) => boolean): ReactElement {
  const fila: ReactNode[] = [no];
  while (fila.length) {
    const atual = fila.shift();
    if (Array.isArray(atual)) fila.push(...atual);
    else if (isValidElement(atual)) {
      if (teste(atual)) return atual;
      fila.push((atual.props as { children?: ReactNode }).children);
    }
  }
  throw new Error('elemento não encontrado');
}
