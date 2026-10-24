/**
 * Prática de inglês do apoio local (sem IA): situações de trabalho em tecnologia, correção de
 * erros comuns de quem fala português (explicada em português), a frase reescrita e uma nova
 * tentativa. Confere só as regras abaixo: o que fica fora delas passa sem correção, e a
 * resposta diz isso. Não ouve áudio nem avalia pronúncia.
 */
import type { Turn } from './coaching.ts';

export interface Correcao {
  /** o trecho como a pessoa escreveu */
  de: string;
  /** o trecho corrigido */
  para: string;
  /** por quê, em português */
  explicacao: string;
}

interface Edicao {
  inicio: number;
  fim: number;
  para: string;
  /** edições do mesmo erro (since → for e o verbo) contam como uma correção */
  grupo: number;
}

/* ---------- verbos ---------- */
const IRREGULARES: Record<string, string> = {
  go: 'went', do: 'did', have: 'had', make: 'made', write: 'wrote', see: 'saw', get: 'got', take: 'took', find: 'found',
  think: 'thought', build: 'built', run: 'ran', come: 'came', give: 'gave', know: 'knew', say: 'said', begin: 'began',
  break: 'broke', buy: 'bought', eat: 'ate', feel: 'felt', forget: 'forgot', leave: 'left', lose: 'lost', meet: 'met',
  pay: 'paid', send: 'sent', sleep: 'slept', spend: 'spent', teach: 'taught', tell: 'told', understand: 'understood',
  win: 'won', speak: 'spoke', choose: 'chose', hear: 'heard', keep: 'kept', mean: 'meant', can: 'could',
};
const REGULARES = (
  'study fix try work start finish watch use create change need want test push deploy install learn play call open close visit ' +
  'talk ask help like live move practice practise review debug code program solve add check update upload download save delete ' +
  'commit merge travel stay plan stop chat depend return show look seem happen crash fail print load'
).split(' ');
/** dobram a consoante final no passado */
const DOBRAM = new Set(['debug', 'program', 'commit', 'plan', 'stop', 'chat']);
const SER: Record<string, string> = { am: 'was', is: 'was', are: 'were' };
const PARTICIPIOS: Record<string, string> = { know: 'known', have: 'had', am: 'been', is: 'been', are: 'been' };

function passadoRegular(v: string): string {
  if (DOBRAM.has(v)) return `${v}${v.at(-1)}ed`;
  if (v.endsWith('e')) return `${v}d`;
  if (/[^aeiou]y$/.test(v)) return `${v.slice(0, -1)}ied`;
  return `${v}ed`;
}
function terceiraPessoa(v: string): string {
  if (v === 'have') return 'has';
  if (/(s|x|z|ch|sh|o)$/.test(v)) return `${v}es`;
  if (/[^aeiou]y$/.test(v)) return `${v.slice(0, -1)}ies`;
  return `${v}s`;
}
const passado = (base: string) => SER[base] ?? IRREGULARES[base] ?? passadoRegular(base);
const participio = (base: string) => PARTICIPIOS[base] ?? IRREGULARES[base] ?? passadoRegular(base);

/** forma escrita (base ou de terceira pessoa) → forma base */
const BASE = new Map<string, string>();
for (const v of [...Object.keys(IRREGULARES), ...REGULARES]) {
  BASE.set(v, v);
  if (v !== 'can') BASE.set(terceiraPessoa(v), v);
}
for (const v of Object.keys(SER)) BASE.set(v, v);
/** passado → base, para "didn't went" */
const DO_PASSADO = new Map<string, string>([...Object.keys(IRREGULARES), ...REGULARES].filter((v) => v !== 'can').map((v) => [passado(v), v]));

const PRONOMES = new Set(['i', 'you', 'we', 'they', 'he', 'she', 'it']);
const TERCEIRA = new Set(['he', 'she', 'it']);
/** palavras que encerram o passado aberto por "yesterday" ("…and today I go" continua no presente) */
const AGORA = new Set(['today', 'now', 'tomorrow', 'tonight', 'every', 'usually', 'always', 'often', 'next', 'will', "won't", 'currently', 'nowadays']);
const DEPOIS_DE_LAST = new Set(['night', 'week', 'month', 'year', 'weekend', 'time', 'semester', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);

const maiuscula = (modelo: string, s: string) => (/^[A-Z]/.test(modelo) ? s[0]!.toUpperCase() + s.slice(1) : s);
/** O trecho começa a frase (só aí a troca herda a maiúscula: "How I can" vira "How can I", não "How Can I"). */
const inicioDeFrase = (texto: string, i: number) => /(^|[.!?]\s*)$/.test(texto.slice(0, i));

/* ---------- regras ---------- */
type Regra = (texto: string, nova: (e: Omit<Edicao, 'grupo'>[], explicacao: string) => void) => void;

/** Verbo no presente numa frase que fala do passado: "Yesterday I go" → "went". */
const tempoPassado: Regra = (texto, nova) => {
  for (const frase of texto.matchAll(/[^.!?]+[.!?]*/g)) {
    const ws = [...frase[0].matchAll(/[A-Za-z']+/g)].map((m) => ({ w: m[0].toLowerCase(), raw: m[0], i: frase.index + m.index }));
    const temAgora = ws.some((x) => AGORA.has(x.w));
    let marcador: string | null = !temAgora && ws.some((x) => x.w === 'ago') ? 'ago' : null;
    for (let k = 0; k < ws.length; k++) {
      const { w } = ws[k]!;
      if (AGORA.has(w) || (w === 'going' && ws[k + 1]?.w === 'to')) marcador = null;
      else if (w === 'yesterday') marcador = 'yesterday';
      else if (w === 'last' && DEPOIS_DE_LAST.has(ws[k + 1]?.w ?? '')) marcador = `last ${ws[k + 1]!.w}`;
      else if (marcador && (PRONOMES.has(w) || w === 'and')) {
        const v = ws[k + 1];
        if (!v) continue;
        if (v.w === "don't" || v.w === "doesn't" || v.w === 'dont') {
          nova([{ inicio: v.i, fim: v.i + v.raw.length, para: maiuscula(v.raw, "didn't") }], `*${v.raw}* → *didn't*: *${marcador}* indica passado, e a negação no passado é *didn't*.`);
          continue;
        }
        const base = BASE.get(v.w);
        if (!base) continue;
        // "have finished" é outro tempo verbal; não é este erro
        if (base === 'have' && /(ed|en)$/.test(ws[k + 2]?.w ?? '')) continue;
        // "you are"/"we are" com sujeito de terceira pessoa não muda; "I am" → "I was"
        const para = base === 'are' && (w === 'i' || TERCEIRA.has(w)) ? 'was' : passado(base);
        const tipo = SER[base]
          ? `o passado de *${v.raw}* é *${para}*`
          : IRREGULARES[base]
            ? `*${base}* é irregular: o passado é *${para}*`
            : `verbos regulares ganham *-ed*${/[^aeiou]y$/.test(base) ? ' (o *y* depois de consoante vira *i*)' : ''}`;
        nova([{ inicio: v.i, fim: v.i + v.raw.length, para: maiuscula(v.raw, para) }], `*${v.raw}* → *${para}*: *${marcador}* indica passado, e ${tipo}.`);
      }
    }
  }
};

const NUMERO = '(\\d{1,3}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|a few|many)';

/** "I have 25 years" → "I am 25 years old". */
const idade: Regra = (texto, nova) => {
  for (const m of texto.matchAll(new RegExp(`\\b(I|you|we|they|he|she)\\s+(have|has)\\s+${NUMERO}\\s+years(\\s+old)?\\b`, 'gi'))) {
    const sujeito = m[1]!.toLowerCase();
    const ser = sujeito === 'i' ? 'am' : TERCEIRA.has(sujeito) ? 'is' : 'are';
    const inicio = m.index + m[0].indexOf(m[2]!, m[1]!.length);
    const para = `${ser} ${m[3]} years old`;
    nova([{ inicio, fim: m.index + m[0].length, para }], `*${m[2]} ${m[3]} years* → *${para}*: em inglês, a idade se diz com *to be* (*I am 25 years old*), não com *have*.`);
  }
};

/**
 * O verbo da frase antes de `ate` (o "since"), se estiver no presente simples: vira "have" +
 * particípio ("I work … since 2020" → "I have worked"). Devolve a edição e a forma nova.
 */
function presenteAntesDe(texto: string, ate: number): { edicao: Omit<Edicao, 'grupo'>; de: string } | null {
  const comeco = Math.max(texto.lastIndexOf('.', ate), texto.lastIndexOf('!', ate), texto.lastIndexOf('?', ate)) + 1;
  const ultimo = [...texto.slice(comeco, ate).matchAll(/\b(I|you|we|they|he|she|my\s+[a-z]+)\s+([a-z]+)\b/gi)].at(-1);
  if (!ultimo) return null;
  const base = BASE.get(ultimo[2]!.toLowerCase());
  if (!base || /^(have|has)$/i.test(ultimo[2]!)) return null;
  const sujeito = ultimo[1]!.toLowerCase();
  const aux = TERCEIRA.has(sujeito) || sujeito.startsWith('my ') || base === 'is' ? 'has' : 'have';
  const inicio = comeco + ultimo.index + ultimo[0].length - ultimo[2]!.length;
  return { edicao: { inicio, fim: inicio + ultimo[2]!.length, para: `${aux} ${participio(base)}` }, de: ultimo[2]! };
}

/** "I work with it since 2 years" → "I have worked with it for 2 years"; "I work here since 2020" → "I have worked". */
const desdeQuando: Regra = (texto, nova) => {
  const regra = '*have* + particípio';
  for (const m of texto.matchAll(new RegExp(`\\bsince\\s+${NUMERO}\\s+(years?|months?|weeks?|days?|hours?)\\b`, 'gi'))) {
    const edicoes: Omit<Edicao, 'grupo'>[] = [{ inicio: m.index, fim: m.index + 5, para: maiuscula(m[0], 'for') }];
    const v = presenteAntesDe(texto, m.index);
    if (v) edicoes.unshift(v.edicao);
    const verbo = v ? ` E o que começou no passado e continua até hoje usa ${regra}: *${v.de}* → *${v.edicao.para}*.` : '';
    nova(edicoes, `*since ${m[1]} ${m[2]}* → *for ${m[1]} ${m[2]}*: *since* marca o início (*since 2022*); para quanto tempo dura, use *for*.${verbo}`);
  }
  // "since" com o ponto de partida está certo; o erro comum é o verbo no presente simples
  for (const m of texto.matchAll(/\bsince\s+(\d{4}|last\s+[a-z]+|yesterday|january|february|march|april|may|june|july|august|september|october|november|december)\b/gi)) {
    const v = presenteAntesDe(texto, m.index);
    if (v) nova([v.edicao], `*${v.de}* → *${v.edicao.para}*: com *${m[0]}*, a ação começou no passado e continua até hoje, então o verbo vai para ${regra}.`);
  }
};

/** Palavras antes de "he/she/it" que deixam o verbo seguinte na forma base ("does it work", "make it run"). */
const ANTES_DA_BASE = new Set(['do', 'does', 'did', "doesn't", "didn't", "don't", 'can', 'could', 'will', 'would', 'should', 'must', 'may', 'might', "can't", "won't", "couldn't", "wouldn't", "shouldn't", 'to', 'let', 'lets', 'make', 'makes', 'made', 'help', 'helps', 'see', 'saw', 'watch', 'hear', 'heard']);
/** "is it code?": o pronome depois de *to be* não é sujeito de um verbo seguinte */
const SER_ANTES = new Set(['am', 'is', 'are', 'was', 'were', "isn't", "aren't", "wasn't", "weren't"]);

/** "It depend" → "It depends": no presente, com *he*, *she* e *it* o verbo ganha *-s*. */
const terceiraPessoaSemS: Regra = (texto, nova) => {
  const ws = [...texto.matchAll(/[A-Za-z']+/g)].map((m) => ({ w: m[0].toLowerCase(), raw: m[0], i: m.index }));
  for (let k = 0; k + 1 < ws.length; k++) {
    const antes = ws[k - 1]?.w ?? '';
    if (!TERCEIRA.has(ws[k]!.w) || ANTES_DA_BASE.has(antes) || SER_ANTES.has(antes)) continue;
    const v = ws[k + 1]!;
    if (BASE.get(v.w) !== v.w || SER[v.w] || v.w === 'can') continue;
    // só espaço entre os dois ("I fixed it, test it" não é sujeito e verbo); pergunta sem auxiliar fica de fora
    // ("How it work?" pede "does", que esta regra não põe)
    if (!/^\s+$/.test(texto.slice(ws[k]!.i + ws[k]!.raw.length, v.i)) || /^[^.!]*\?/.test(texto.slice(v.i))) continue;
    const para = terceiraPessoa(v.w);
    nova([{ inicio: v.i, fim: v.i + v.raw.length, para }], `*${ws[k]!.raw} ${v.raw}* → *${ws[k]!.raw} ${para}*: no presente, com *he*, *she* e *it*, o verbo ganha *-s*.`);
  }
};

/** Regras de um trecho só: [padrão, grupo a trocar, troca, explicação]. */
const SIMPLES: Array<[RegExp, number, (m: RegExpMatchArray) => string, string]> = [
  [/\b(he|she|it)\s+(don'?t)\b/gi, 2, () => "doesn't", 'com *he*, *she* e *it*, a negação no presente é *doesn\'t*.'],
  [/\bpeople\s+(is)\b/gi, 1, () => 'are', '*people* é plural: *people are*.'],
  [/\bI\s+(am\s+agree)\b/gi, 1, () => 'agree', '*agree* já é verbo: *I agree*, sem *am*.'],
  [/\bexplain\s+(me)\b/gi, 1, () => 'to me', 'com *explain*, quem recebe a explicação vem depois de *to*: *explain to me*.'],
  [/\bdepend(?:s|ed|ing)?\s+(of)\b/gi, 1, () => 'on', 'em inglês é *depend on*, não *of*.'],
  [/\b(informations|advices|feedbacks|softwares)\b/gi, 1, (m) => m[1]!.slice(0, -1), 'essa palavra não tem plural em inglês.'],
  [/\b(make)\s+(?:a|one|some)\s+questions?\b/gi, 1, () => 'ask', 'pergunta se faz com *ask*: *ask a question*.'],
  [/\b(?:how|what|where|why|when)\s+((?:I|you|we|they)\s+(?:can|could|should|will|do))\b(?=[^.!?]*\?)/gi, 1, (m) => m[1]!.split(/\s+/).reverse().join(' '), 'na pergunta, o verbo auxiliar vem antes do sujeito: *How can I…?*'],
  [/\b(?:didn'?t|did not)\s+([a-z]+)\b/gi, 1, (m) => DO_PASSADO.get(m[1]!.toLowerCase()) ?? m[1]!, 'depois de *didn\'t*, o verbo volta à forma base.'],
];
const simples: Regra = (texto, nova) => {
  for (const [re, g, troca, porque] of SIMPLES)
    for (const m of texto.matchAll(re)) {
      const de = m[g]!;
      const para = troca(m);
      if (para.toLowerCase() === de.toLowerCase()) continue;
      const inicio = m.index + m[0].lastIndexOf(de);
      nova([{ inicio, fim: inicio + de.length, para: inicioDeFrase(texto, inicio) ? maiuscula(de, para) : para }], `*${de}* → *${para}*: ${porque}`);
    }
};

const REGRAS = [idade, desdeQuando, tempoPassado, terceiraPessoaSemS, simples];

/** Aplica as regras; devolve a frase com os trechos trocados em negrito e as correções, na ordem do texto. */
export function corrigirIngles(texto: string): { corrigido: string; correcoes: Correcao[] } {
  const edicoes: Edicao[] = [];
  const explicacoes: string[] = [];
  for (const regra of REGRAS)
    regra(texto, (es, explicacao) => {
      // um trecho já corrigido por outra regra não é corrigido de novo
      if (es.some((e) => edicoes.some((x) => e.inicio < x.fim && x.inicio < e.fim))) return;
      edicoes.push(...es.map((e) => ({ ...e, grupo: explicacoes.length })));
      explicacoes.push(explicacao);
    });
  edicoes.sort((a, b) => a.inicio - b.inicio);
  let corrigido = '';
  let pos = 0;
  for (const e of edicoes) {
    corrigido += `${texto.slice(pos, e.inicio)}**${e.para}**`;
    pos = e.fim;
  }
  corrigido += texto.slice(pos);
  const grupos = [...new Set(edicoes.map((e) => e.grupo))];
  const correcoes = grupos.map((g) => {
    const es = edicoes.filter((e) => e.grupo === g);
    return { de: es.map((e) => texto.slice(e.inicio, e.fim)).join(' … '), para: es.map((e) => e.para).join(' … '), explicacao: explicacoes[g]! };
  });
  return { corrigido, correcoes };
}

/* ---------- conversa ---------- */
const EN = new Set('i you he she it we they the an is are am was were does did have has my your this that what how and to of in for with can will'.split(' '));
const PT = new Set('eu voce ele ela nos que nao para uma um com seu sua isso como mas esta os de da em na ao quero sou tenho vamos'.split(' '));
/** A mensagem está em inglês (mais palavras comuns do inglês que do português). */
export function pareceIngles(texto: string): boolean {
  const ws = texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().match(/[a-z']+/g) ?? [];
  const en = ws.filter((w) => EN.has(w)).length;
  const pt = ws.filter((w) => PT.has(w)).length;
  // frase curta sem nenhuma palavra do português ("I study Python") também conta
  return en > pt && (en >= 2 || (pt === 0 && ws.length >= 2));
}

const PRONUNCIA = /pronunc|pron[uú]ncia|pronounce|accent|sotaque|[aá]udio|\brecord(ed|ing)?\b|grava[cç][aã]o|gravei|my voice|minha voz|listen to me/i;

interface Situacao {
  titulo: string;
  pergunta: string;
  comeco: string;
  /** pergunta de continuidade quando a resposta não dá outra pista */
  segue: string;
}
const SITUACOES: Situacao[] = [
  { titulo: 'reunião diária (daily stand-up)', pergunta: 'Your teammate asks: *What did you do yesterday, and what will you do today?*', comeco: 'Yesterday I fixed… Today I will…', segue: 'What could block your work today?' },
  { titulo: 'relatar um bug', pergunta: 'A teammate asks: *What happens when the bug appears?*', comeco: 'When I click…, the page shows… I expected…', segue: 'What did you expect to happen?' },
  { titulo: 'pedir ajuda a um colega', pergunta: 'You are stuck on a task. *How do you ask a teammate for help?*', comeco: 'Could you help me with…? I tried…, but…', segue: 'What have you tried so far?' },
  { titulo: 'revisão de código (code review)', pergunta: 'A reviewer asks: *Why did you use a loop here?*', comeco: 'I used a loop because…', segue: 'Is there another way to write it?' },
  { titulo: 'entrevista de emprego', pergunta: 'The interviewer says: *Can you tell me about a project you built?*', comeco: 'I built… It helps…', segue: 'What was the hardest part of that project?' },
];

/** Reação e pergunta de continuidade, pelo assunto da resposta. */
function continuidade(texto: string, situacao: Situacao | undefined): { reacao: string; pergunta: string } {
  const t = texto.toLowerCase();
  const noPassado = /\b(yesterday|ago|last)\b/.test(t);
  if (/\btests?\b/.test(t)) return { reacao: 'Writing tests is a good habit.', pergunta: 'Which part of the code will your tests check?' };
  if (/\b(bug|bugs|error|crash|issue|problem)\b/.test(t)) return { reacao: 'Bugs are part of the job.', pergunta: noPassado ? 'How did you find the problem?' : 'What happens when the problem appears?' };
  const obra = t.match(/\b(website|web site|site|app|application|game|bot|project|system)\b/);
  if (obra) return { reacao: `A ${obra[1]} is a great way to practise.`, pergunta: `What will your ${obra[1]} do?` };
  if (/\b(job|interview|hired|career)\b/.test(t)) return { reacao: 'That is a clear goal.', pergunta: 'What kind of job are you looking for?' };
  if (/\b(learn|learning|learned|study|studied|studying|course|python|javascript|sql)\b/.test(t))
    return { reacao: 'Step by step is the right way.', pergunta: noPassado ? 'What was the hardest part?' : 'What is the hardest part so far?' };
  return { reacao: 'Thanks for telling me.', pergunta: situacao?.segue ?? 'Can you give me an example?' };
}

const LIMITE = '*Apoio local: confiro só uma lista de erros comuns de quem fala português (tempo verbal, idade, since e for, e outros); o que fica fora dela passa sem correção. Não ouço áudio nem avalio pronúncia.*';
const TITULO_SITUACAO = /\*\*Situação: ([^*]+)\*\*/;

/** Resposta do modo Inglês do apoio local. */
export function inglesReply(message: string, history: Turn[] = []): string {
  if (PRONUNCIA.test(message))
    return [
      "I can't hear audio, so I can't check your pronunciation: I only read what you type.",
      'O que dá para fazer: na página [Inglês](/ingles), ouça as falas das missões na voz sintética do navegador e repita junto. Para uma palavra solta, ouça o áudio de um dicionário on-line, como o [Cambridge Dictionary](https://dictionary.cambridge.org/), e compare com a sua gravação.',
      'Do you want to write a sentence with that word?',
    ].join('\n\n');
  const anteriores = history.filter((h) => h.role === 'tutor' && TITULO_SITUACAO.test(h.text));
  const titulo = anteriores.at(-1)?.text.match(TITULO_SITUACAO)?.[1];
  const atual = SITUACOES.find((s) => s.titulo === titulo);
  if (!pareceIngles(message)) {
    const s = SITUACOES[anteriores.length % SITUACOES.length]!;
    return [
      `**Situação: ${s.titulo}**`,
      s.pergunta,
      `Responda em inglês, em 2 ou 3 frases. Um começo possível: *${s.comeco}*`,
      'Depois eu aponto os erros comuns da sua resposta, explico em português e você tenta de novo. Não ouço áudio nem avalio pronúncia.',
    ].join('\n\n');
  }
  const { corrigido, correcoes } = corrigirIngles(message);
  const { reacao, pergunta } = continuidade(message, atual);
  if (!correcoes.length)
    return [`${reacao} ${pergunta} Answer in two or three sentences.`, '*Nenhum dos erros comuns que eu confiro apareceu; erros fora dessa lista passam sem correção. Não ouço áudio nem avalio pronúncia.*'].join('\n\n');
  const extras = correcoes.length - 2;
  return [
    '**Sua frase, corrigida:**',
    `> ${corrigido.trim()}`,
    correcoes.slice(0, 2).map((c) => `- ${c.explicacao}`).join('\n') + (extras > 0 ? `\n- E mais ${extras} ajuste${extras > 1 ? 's' : ''} na frase acima.` : ''),
    `**Sua vez:** reescreva a frase sem olhar a correção e continue em inglês. ${pergunta}`,
    LIMITE,
  ].join('\n\n');
}
