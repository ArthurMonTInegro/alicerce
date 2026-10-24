/**
 * Plano de sessão de estudo do apoio local (sem IA). Usa o tempo que a pessoa informou, o
 * assunto pedido (ou a lição aberta) e o aparelho, sem prometer resultado nem supor progresso:
 * o apoio local não vê o histórico de ninguém. São regras fixas, não um modelo.
 */

export interface PedidoDeSessao {
  /** minutos informados; null quando a mensagem não diz */
  minutos: number | null;
  celular: boolean;
  iniciante: boolean;
  /** já programa ou já fez parte da trilha ("já sei o básico") */
  comBase: boolean;
  /** "por dia", "esta semana": a sessão se repete nos próximos dias */
  repete: boolean;
  /** pediu garantia ou prazo de um resultado que ninguém controla */
  promessa: 'emprego' | 'fluencia' | null;
}

/** O assunto da sessão: uma lição que a pessoa pode abrir. */
export interface TemaDaSessao {
  id: string;
  title: string;
}

const semAcento = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const NUMEROS: Record<string, number> = {
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, dez: 10, quinze: 15,
  vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, noventa: 90,
};
const NUM = `(\\d{1,3}|${Object.keys(NUMEROS).join('|')})`;
const valor = (s: string) => NUMEROS[s] ?? Number(s);

/** Minutos de uma frase como "1h30", "1 hora e meia", "meia hora", "45 min" ou "duas horas". */
export function minutosDoTexto(texto: string): number | null {
  const t = semAcento(texto);
  // "h" sozinho só quando não começa outra palavra ("1h30" sim, "uma história" não)
  let m = t.match(new RegExp(`\\b${NUM}\\s*(?:h(?![a-z])|horas?\\b)\\s*(?:e\\s*)?(meia|\\d{1,2})?\\s*(?:min(?:utos?)?\\b)?`));
  if (m) {
    const extra = m[2] === 'meia' ? 30 : m[2] ? Number(m[2]) : 0;
    return valor(m[1]!) * 60 + extra;
  }
  if (/\bmeia hora\b/.test(t)) return 30;
  m = t.match(new RegExp(`\\b${NUM}\\s*(?:min\\b|mins\\b|minutos?\\b)`));
  return m ? valor(m[1]!) : null;
}

export function lerPedidoDeSessao(texto: string): PedidoDeSessao {
  const t = semAcento(texto);
  return {
    minutos: minutosDoTexto(texto),
    celular: /\b(celular|telefone|smartphone|onibus|metro|trem)\b/.test(t),
    iniciante: /\b(iniciante|do zero|nunca programei|comecando|por onde comec)/.test(t),
    comBase: /\b(ja sei|ja programo|tenho experiencia|intermediari|avancad|ja fiz (o|a|um|uma))/.test(t),
    repete: /\b(por dia|todo dia|todos os dias|diariamente|esta semana|essa semana|na semana|por semana)\b/.test(t),
    promessa: /\b(fluente|fluencia)\b/.test(t)
      ? 'fluencia'
      : /\b(emprego|contratad|vaga|trabalhar como|ser programador|ser programadora)/.test(t) && /\b(garant|prazo|em \d+|quanto tempo|meses|semanas|da\?)/.test(t)
        ? 'emprego'
        : null,
  };
}

/** Pedido de plano feito fora do modo Planejar ("tenho 20 minutos, o que faço?"). */
export function pedeSessao(texto: string): boolean {
  const t = semAcento(texto);
  return /\b(plano|planejar|planeje|cronograma|rotina|sessao)\b/.test(t) || (minutosDoTexto(texto) !== null && /\b(tenho|so tenho|disponho|sobra|sobram)\b/.test(t));
}

const MAXIMO = 120;

/** Blocos [minutos, tarefa] que somam o tempo da sessão. */
function blocos(minutos: number, tarefa: { recordar: string; praticar: string; conferir: string; explicar: string }): Array<[number, string]> {
  if (minutos < 5) return [[minutos, 'alguns cartões da [Revisão](/revisao)']];
  if (minutos <= 12) {
    const borda = minutos <= 6 ? 1 : 2;
    return [
      [borda, tarefa.recordar],
      [minutos - 2 * borda, tarefa.praticar],
      [borda, 'anote uma dúvida para a próxima sessão'],
    ];
  }
  if (minutos <= 45) {
    const recordar = Math.round(minutos * 0.15);
    const conferir = Math.round(minutos * 0.2);
    const explicar = Math.max(2, Math.round(minutos * 0.1));
    return [
      [recordar, tarefa.recordar],
      [minutos - recordar - conferir - explicar, tarefa.praticar],
      [conferir, tarefa.conferir],
      [explicar, tarefa.explicar],
    ];
  }
  const pausa = minutos <= 75 ? 5 : 10;
  const resto = minutos - 5 - pausa - 10;
  const primeiro = Math.floor(resto / 2);
  return [
    [5, tarefa.recordar],
    [primeiro, tarefa.praticar],
    [pausa, 'pausa longe da tela'],
    [resto - primeiro, 'mais exercícios, um pouco mais difíceis'],
    [5, tarefa.conferir],
    [5, tarefa.explicar],
  ];
}

/**
 * O plano em Markdown, curto (até umas 100 palavras; com todos os avisos juntos, até 150). `tema` é uma lição que a pessoa pode ler;
 * sem tema, o plano manda escolher na trilha (ou começar pelo nível 0, para quem é iniciante).
 */
export function planoDeSessao(p: PedidoDeSessao, o: { tema?: TemaDaSessao | undefined; primeiraLicao?: TemaDaSessao | undefined; licaoAberta?: string | undefined } = {}): string {
  const informado = p.minutos !== null;
  const minutos = Math.min(p.minutos ?? 25, MAXIMO);
  const alvo = o.tema ?? (p.iniciante ? o.primeiraLicao : undefined);
  const assunto = alvo?.title ?? o.licaoAberta ?? null;
  const ler = alvo ? `[a lição](/licao/${alvo.id})` : o.licaoAberta ? 'a lição aberta' : 'a próxima lição da [trilha](/trilha)';
  const praticar =
    !alvo && !o.licaoAberta && p.comBase
      ? 'faça o [Diagnóstico](/diagnostico), que indica por onde começar, e comece a lição que ele recomendar'
      : p.celular
        ? `leia ${ler} no celular e faça os exercícios de múltipla escolha ou de completar; os de código ficam para quando tiver teclado`
        : `leia ${ler} e resolva um exercício dela`;
  const tarefa = {
    recordar: p.celular ? 'faça alguns cartões da [Revisão](/revisao)' : `sem consultar, escreva o que lembra${assunto ? ' do assunto' : ' da última lição'}`,
    praticar,
    conferir: 'confira com a correção automática e anote o que errou',
    explicar: 'explique em voz alta, em duas frases, o que aprendeu',
  };
  const partes: string[] = [];
  if (p.promessa === 'emprego')
    partes.push('Não dá para garantir emprego nem prazo: depende do seu ritmo, da prática e das vagas. O que dá para acompanhar é o que você já resolve sem ajuda.');
  if (p.promessa === 'fluencia')
    partes.push('Não dá para prometer fluência nem prazo: depende de quanto você pratica e de onde começa. Uma meta que dá para conferir: entender a documentação de uma função sem tradutor.');
  partes.push(`**Sessão de ${minutos} minutos${assunto ? `: ${assunto}` : ''}**${informado ? '' : ' (você não disse quanto tempo tem)'}`);
  partes.push(blocos(minutos, tarefa).map(([m, t], i) => `${i + 1}. **${m} min:** ${t}.`).join('\n'));
  if (p.minutos !== null && p.minutos > MAXIMO) partes.push(`Mais de ${MAXIMO} minutos seguidos rende menos: planejei ${MAXIMO}, e o resto fica para outra sessão.`);
  if (p.repete) partes.push('Nos outros dias, comece pela [Revisão](/revisao), que traz o que está na hora de rever.');
  partes.push(informado ? 'Qual exercício você quer concluir nessa sessão?' : 'Me diga quantos minutos você tem que eu ajusto o plano.');
  return partes.join('\n\n');
}
