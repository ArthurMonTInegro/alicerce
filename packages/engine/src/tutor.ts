/**
 * Tutor offline (sem IA): responde com perguntas guiadas e com a próxima dica
 * da escada do exercício. É o modo padrão quando não há chave de API, e o
 * fallback quando o provedor de IA falha. Segue a mesma regra do tutor com IA:
 * nunca entrega a solução pronta.
 */

export interface TutorInput {
  message: string;
  exercise?: { prompt: string; hints: string[]; kind: string } | undefined;
  hintsSeen?: number | undefined;
  error?: string | undefined;
  lessonTitle?: string | undefined;
}

const WANTS_ANSWER = /(resposta|solu[cç][aã]o|resolve|resolva|c[oó]digo pronto|faz pra mim|fa[cç]a por mim|me d[aá] o c[oó]digo|answer|solution)/i;
const WANTS_HINT = /(dica|hint|ajuda|socorro|travei|n[aã]o sei (por onde|como) come[cç]ar|empaquei)/i;
const CONFUSED = /(n[aã]o entendi|n[aã]o entendo|confus|o que [ée]|o que significa|explica|explique)/i;
const WHY_WRONG = /(por que|porque).*(errad|falh|n[aã]o funciona|n[aã]o passa)|(errado|n[aã]o funciona|n[aã]o passa)/i;

const ERROR_QUESTIONS: Array<[RegExp, string]> = [
  [/NameError/, 'O Python diz que um nome não existe. Em que linha esse nome recebe um valor pela primeira vez? Essa linha vem antes ou depois de onde ele é usado? A grafia (inclusive maiúsculas) é idêntica?'],
  [/TypeError.*(concatenate|unsupported operand)/, 'Há dois valores de tipos diferentes na mesma operação. Que tipo tem cada lado? Lembre: input() sempre devolve texto. Que função converte texto em número?'],
  [/TypeError/, 'Um valor tem um tipo diferente do que a operação espera. Se você imprimir type() de cada valor logo antes da linha do erro, o que aparece?'],
  [/IndexError/, 'O código pediu uma posição que não existe. Qual é o tamanho da lista nesse momento e qual índice foi pedido? Lembre que os índices começam em 0.'],
  [/KeyError/, 'A chave buscada não está no dicionário. Quais chaves ele tem nesse momento? A chave buscada é exatamente igual (texto vs. número, maiúsculas)?'],
  [/ZeroDivisionError/, 'Algo foi dividido por zero. Em que situação o divisor vale 0? É um caso limite, como uma lista vazia? O que a função deveria fazer nesse caso?'],
  [/IndentationError|expected an indented block/, 'O recuo das linhas define os blocos em Python. Que linha termina com ":"? As linhas que pertencem a ela estão recuadas igualmente?'],
  [/SyntaxError/, 'O Python não conseguiu ler a estrutura do código. Olhe a linha indicada e a anterior: faltam dois-pontos, parênteses ou aspas?'],
  [/RecursionError/, 'A função chama a si mesma sem parar. Qual é o caso base? Cada chamada recursiva chega mais perto dele?'],
  [/Timeout/, 'O programa não terminou: provavelmente um laço infinito. O que, dentro do laço, muda a condição de parada? Simule 3 voltas no papel.'],
  [/AttributeError.*NoneType/, 'Um valor é None. Que função produziu esse valor? Ela tem return em todos os caminhos? Lembre que lista.sort() devolve None.'],
  [/AttributeError/, 'O valor não tem esse método ou atributo. De que tipo ele é de verdade? O nome do método está escrito certo?'],
  [/AssertionError|falhou|esperado/i, 'Um teste esperava um resultado diferente. Pegue a entrada desse teste e execute sua função com ela, imprimindo o resultado. Em que passo o valor diverge do que você esperava?'],
];

export function offlineTutor(input: TutorInput): string {
  const msg = input.message.trim();
  const ex = input.exercise;
  const seen = input.hintsSeen ?? 0;
  const nextHint = ex && seen < ex.hints.length ? ex.hints[seen] : undefined;
  const parts: string[] = [];

  if (WANTS_ANSWER.test(msg)) {
    parts.push('Eu não vou te dar a solução pronta: você aprende muito mais chegando lá, e eu te acompanho no caminho. 🙂');
    if (nextHint) parts.push(`Uma pista: ${nextHint}`);
    else parts.push('Vamos por partes: descreva em português, passo a passo, o que o programa precisa fazer. Depois transformamos cada passo em uma linha de código.');
    parts.push('Se mesmo assim você travar, o botão "Ver solução" aparece depois de algumas tentativas, e a explicação vem junto.');
    return parts.join('\n\n');
  }

  if (input.error) {
    const q = ERROR_QUESTIONS.find(([re]) => re.test(input.error!));
    parts.push(`Vi o erro: \`${input.error.slice(0, 160)}\`.`);
    parts.push(q ? q[1] : 'Leia a última linha do traceback: ela diz o tipo e o motivo. Qual linha do seu código aparece por último no traceback?');
    parts.push('Abra a explicação do erro logo abaixo do editor: ela mostra o que aconteceu, por que, como investigar e como corrigir.');
    return parts.join('\n\n');
  }

  if (WANTS_HINT.test(msg) || WHY_WRONG.test(msg)) {
    if (nextHint) parts.push(`Pista ${seen + 1}: ${nextHint}`);
    parts.push('Antes de mudar o código, tente: (1) escolher um exemplo pequeno de entrada; (2) dizer, à mão, qual deveria ser a saída; (3) executar o "Passo a passo" e ver em que linha o valor diverge.');
    if (!nextHint && ex) parts.push('Você já viu todas as dicas deste exercício. Que parte especificamente está travando: entender o enunciado, escolher a estrutura ou fazer o código funcionar?');
    return parts.join('\n\n');
  }

  if (CONFUSED.test(msg)) {
    parts.push(`Vamos destrinchar. Me diga com suas palavras o que você já entendeu${input.lessonTitle ? ` sobre "${input.lessonTitle}"` : ''} e em que ponto ficou nebuloso.`);
    parts.push('Duas coisas que costumam ajudar: voltar à etapa "Exemplo" da lição e conferir o termo no Glossário (com a versão em inglês, que você pode pesquisar na documentação oficial).');
    return parts.join('\n\n');
  }

  if (ex) {
    parts.push('Boa pergunta. Vamos usar o método de Pólya:');
    parts.push('1. **Entender**: o que o exercício recebe e o que deve devolver ou imprimir?\n2. **Planejar**: como você faria à mão, com um exemplo pequeno?\n3. **Executar**: escreva um passo de cada vez e teste.\n4. **Revisar**: e se a entrada for vazia, zero ou negativa?');
    if (nextHint) parts.push(`Se quiser uma pista: ${nextHint}`);
    return parts.join('\n\n');
  }

  return 'Estou aqui para ajudar você a pensar, não para pensar por você. Me conte o que está tentando fazer, o que já tentou e o que aconteceu. Se tiver um erro, cole a mensagem.';
}

/** Instruções para o tutor com IA (usado pela API quando há um provedor configurado). */
export const TUTOR_SYSTEM_PROMPT = `Você é o tutor da Alicerce, uma plataforma brasileira de formação em computação.
Fale em português do Brasil, com frases curtas e tom acolhedor. Ao usar um termo técnico, dê também o termo em inglês entre parênteses na primeira vez.

Regras pedagógicas (obrigatórias):
1. Nunca entregue a solução completa de um exercício, nem código que resolva o exercício. Se pedirem, recuse com gentileza e ofereça a próxima pista.
2. Prefira perguntas que levem o estudante a descobrir (método socrático). No máximo uma pergunta principal por resposta.
3. Dê pistas graduais: comece pela mais vaga. Use as dicas do exercício como referência de progressão, sem revelar mais do que a próxima.
4. Para erros: explique o que a mensagem significa (traduza do inglês), onde olhar e como investigar. Não corrija o código pelo estudante.
5. Pode mostrar exemplos de código curtos sobre o CONCEITO, desde que não sejam a solução do exercício atual.
6. Se o estudante estiver frustrado, reconheça e sugira um passo pequeno e concreto.
7. Se a pergunta não for sobre computação ou sobre os estudos, redirecione com educação.
8. Seja honesto: se não tiver certeza, diga isso e indique a documentação oficial.
Responda em no máximo 150 palavras, usando Markdown simples (negrito, listas, \`código\`).`;
