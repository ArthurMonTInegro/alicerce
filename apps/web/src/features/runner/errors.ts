/**
 * Explicador de erros. Para cada erro, cinco respostas — o que aconteceu, por
 * que, como investigar, como corrigir, como evitar — mais a tradução da
 * mensagem original (que continua visível: ler erros em inglês é uma
 * habilidade da trilha, não algo a esconder).
 *
 * A explicação é específica quando reconhecemos a mensagem (ex.: o nome da
 * variável em NameError) e genérica pelo tipo do erro caso contrário.
 */

export interface ErrorExplanation {
  title: string;
  /** tradução da mensagem original */
  translation: string;
  what: string;
  why: string;
  investigate: string;
  fix: string;
  avoid: string;
  /** termo-chave em inglês para pesquisar */
  searchHint: string;
}

interface Rule {
  type: RegExp;
  msg?: RegExp;
  explain: (m: RegExpMatchArray | null, ctx: { message: string; line: number | null; lineCode?: string | undefined }) => Omit<ErrorExplanation, 'searchHint'> & { searchHint?: string };
}

const at = (line: number | null) => (line ? `na linha ${line}` : 'no seu código');

const RULES: Rule[] = [
  /* ---------------- Python: sintaxe ---------------- */
  {
    type: /^SyntaxError$/,
    msg: /expected ':'/,
    explain: (_m, c) => ({
      title: 'Faltam os dois-pontos (:)',
      translation: 'esperava-se ":"',
      what: `O Python esperava um ":" ${at(c.line)} e não encontrou.`,
      why: 'Toda linha que abre um bloco (if, elif, else, for, while, def, class, try, except, with) termina com dois-pontos. Sem eles, o Python não sabe onde o bloco começa.',
      investigate: 'Olhe o fim da linha indicada: ela começa com if, for, def, while...? Então precisa terminar com ":".',
      fix: 'Adicione ":" no fim da linha. Ex.: `if idade >= 18:`',
      avoid: 'Ao escrever qualquer linha que termina antes de um bloco indentado, digite ":" na hora, antes de apertar Enter.',
    }),
  },
  {
    type: /^SyntaxError$/,
    msg: /unterminated string literal|EOL while scanning|unterminated triple-quoted/,
    explain: (_m, c) => ({
      title: 'Texto (string) sem as aspas de fechamento',
      translation: 'texto literal não terminado',
      what: `Uma string foi aberta com aspas ${at(c.line)} mas não foi fechada.`,
      why: 'O Python lê tudo depois da aspa de abertura como texto até encontrar a aspa igual. Se ela não aparece, o texto "invade" o resto da linha.',
      investigate: 'Conte as aspas da linha: elas vêm em pares? Abriu com " e fechou com \' (ou vice-versa)?',
      fix: 'Feche a string com o mesmo tipo de aspas usado para abrir: `print("Olá")`.',
      avoid: 'Use um editor com realce de sintaxe: texto fica de uma cor só, e um erro de aspas "pinta" o resto da linha.',
    }),
  },
  {
    type: /^SyntaxError$/,
    msg: /'(\(|\[|\{)' was never closed/,
    explain: (m, c) => ({
      title: `Faltou fechar "${m?.[1]}"`,
      translation: `"${m?.[1]}" nunca foi fechado`,
      what: `Um "${m?.[1]}" foi aberto ${at(c.line)} e não tem o par de fechamento.`,
      why: 'Parênteses, colchetes e chaves sempre vêm em pares. O Python continua procurando o fechamento nas linhas seguintes e, às vezes, aponta o erro mais adiante.',
      investigate: 'Conte os ( e ) da linha indicada e das anteriores. Em chamadas aninhadas como print(len(x), feche de dentro para fora.',
      fix: 'Adicione o fechamento que falta no lugar certo.',
      avoid: 'Digite o par completo "()" e depois escreva dentro. Muitos editores fazem isso automaticamente.',
    }),
  },
  {
    type: /^SyntaxError$/,
    msg: /invalid syntax\. Maybe you meant '==' or ':=' instead of '='|cannot assign to/,
    explain: (_m, c) => ({
      title: '= (atribuição) no lugar de == (comparação)',
      translation: 'sintaxe inválida: talvez você quisesse "==" em vez de "="',
      what: `${at(c.line)[0]!.toUpperCase() + at(c.line).slice(1)} há um "=" onde o Python esperava uma comparação.`,
      why: '"=" guarda um valor numa variável; "==" pergunta se dois valores são iguais. Dentro de if/while você quase sempre quer perguntar.',
      investigate: 'Procure "=" sozinho dentro de if, elif ou while.',
      fix: 'Troque por "==": `if x == 10:`',
      avoid: 'Leia "=" como "recebe" e "==" como "é igual a?". Ler em voz alta ajuda a perceber a diferença.',
    }),
  },
  {
    type: /^SyntaxError$/,
    explain: (_m, c) => ({
      title: 'Erro de sintaxe',
      translation: traduzir(c.message),
      what: `O Python não conseguiu entender a estrutura do código ${at(c.line)}. Nada foi executado.`,
      why: 'Antes de executar, o Python lê o arquivo inteiro e verifica a "gramática". Um único caractere fora do lugar impede a execução.',
      investigate: 'Olhe a linha indicada e a anterior (às vezes o erro está antes: um parêntese não fechado, por exemplo). O sinal ^ aponta onde a leitura parou.',
      fix: 'Compare a linha com um exemplo que funciona: faltam dois-pontos, aspas, parênteses ou vírgulas?',
      avoid: 'Execute o código com frequência, em pedaços pequenos. Um erro de sintaxe em 3 linhas novas é fácil de achar; em 50, não.',
    }),
  },
  {
    type: /^IndentationError$/,
    msg: /expected an indented block/,
    explain: (_m, c) => ({
      title: 'Faltou indentar o bloco',
      translation: 'esperava-se um bloco indentado',
      what: `Depois de uma linha com ":", o Python esperava linhas recuadas ${at(c.line)}.`,
      why: 'Em Python, a indentação (o recuo) define o que está dentro de um if, for, def... Não é estética: é a sintaxe.',
      investigate: 'Veja a linha que termina com ":" logo acima. A linha seguinte está com 4 espaços a mais?',
      fix: 'Recue com 4 espaços as linhas que pertencem ao bloco. Se o bloco ainda não tem conteúdo, use `pass`.',
      avoid: 'Configure o editor para inserir 4 espaços ao apertar Tab, e nunca misture tabs com espaços.',
    }),
  },
  {
    type: /^IndentationError$/,
    msg: /unexpected indent/,
    explain: (_m, c) => ({
      title: 'Recuo inesperado',
      translation: 'indentação inesperada',
      what: `A linha ${c.line ?? ''} está recuada sem estar dentro de um bloco.`,
      why: 'Uma linha só pode ter mais recuo que a anterior se a anterior abrir um bloco (terminar com ":").',
      investigate: 'Compare o início da linha com a anterior. Há espaços sobrando no começo?',
      fix: 'Alinhe a linha com as do mesmo nível.',
      avoid: 'Ative "mostrar espaços em branco" no editor para enxergar o recuo.',
    }),
  },
  {
    type: /^(IndentationError|TabError)$/,
    explain: (_m, c) => ({
      title: 'Problema de indentação',
      translation: traduzir(c.message),
      what: `O recuo ${at(c.line)} não corresponde a nenhum nível anterior.`,
      why: 'Todas as linhas de um mesmo bloco precisam ter exatamente o mesmo recuo. Misturar tabs e espaços causa esse erro mesmo quando "parece" alinhado.',
      investigate: 'Verifique se as linhas do bloco começam com o mesmo número de espaços.',
      fix: 'Reindente o bloco usando apenas espaços (4 por nível).',
      avoid: 'Use só espaços. O PEP 8 recomenda 4 espaços por nível.',
    }),
  },

  /* ---------------- Python: execução ---------------- */
  {
    type: /^NameError$/,
    msg: /name '(\w+)' is not defined/,
    explain: (m, c) => ({
      title: `A variável ou função "${m?.[1]}" não existe (ainda)`,
      translation: `o nome "${m?.[1]}" não está definido`,
      what: `${at(c.line)[0]!.toUpperCase() + at(c.line).slice(1)}, o Python encontrou o nome "${m?.[1]}" e não sabe o que ele é.`,
      why: 'Um nome só existe depois de receber um valor (x = ...) ou ser definido (def, import). Causas comuns: erro de digitação, maiúscula/minúscula diferente (Nome ≠ nome), usar antes de definir, ou esquecer as aspas de um texto.',
      investigate: `Procure onde "${m?.[1]}" recebe valor. Esse ponto vem ANTES da linha do erro? A grafia é idêntica? Se era para ser um texto, faltam aspas: "${m?.[1]}".`,
      fix: `Corrija a grafia, defina "${m?.[1]}" antes de usar, ou coloque entre aspas se for texto.`,
      avoid: 'Use nomes descritivos e consistentes, e deixe o editor completar os nomes para você (evita erro de digitação).',
    }),
  },
  {
    type: /^UnboundLocalError$/,
    explain: (_m, c) => ({
      title: 'Variável local usada antes de receber valor',
      translation: traduzir(c.message),
      what: `Dentro de uma função, uma variável foi lida ${at(c.line)} antes de ser atribuída.`,
      why: 'Se uma função atribui a uma variável em qualquer lugar, o Python a trata como local na função inteira, mesmo que exista uma global com o mesmo nome.',
      investigate: 'Na função, procure onde a variável recebe valor. A leitura vem antes?',
      fix: 'Passe o valor como parâmetro e devolva o resultado com return (melhor), ou inicialize a variável antes de usá-la.',
      avoid: 'Evite depender de variáveis globais dentro de funções: entrada por parâmetros, saída por return.',
    }),
  },
  {
    type: /^TypeError$/,
    msg: /can only concatenate str \(not "(\w+)"\) to str|unsupported operand type\(s\) for \+: '(\w+)' and '(\w+)'/,
    explain: (m, c) => ({
      title: 'Tentou juntar texto com número',
      translation: m?.[1] ? `só é possível concatenar str (não "${m[1]}") com str` : `tipos não suportados para +: "${m?.[2]}" e "${m?.[3]}"`,
      what: `${at(c.line)[0]!.toUpperCase() + at(c.line).slice(1)}, o "+" recebeu um texto e um número.`,
      why: 'Em Python, "+" soma números ou junta textos, mas não mistura os dois: "Idade: " + 18 é ambíguo, e o Python prefere avisar a adivinhar.',
      investigate: 'Imprima o tipo de cada lado: `print(type(a), type(b))`. Lembre que input() sempre devolve texto.',
      fix: 'Converta: `"Idade: " + str(18)`, ou use f-string: `f"Idade: {idade}"`. Para somar, converta o texto: `int(texto) + 1`.',
      avoid: 'Use f-strings para montar mensagens e converta a entrada (int/float) logo depois do input().',
    }),
  },
  {
    type: /^TypeError$/,
    msg: /'(\w+)' object is not callable/,
    explain: (m, c) => ({
      title: `Tentou "chamar" algo que não é função (${m?.[1]})`,
      translation: `objeto do tipo "${m?.[1]}" não pode ser chamado`,
      what: `${at(c.line)[0]!.toUpperCase() + at(c.line).slice(1)}, há parênteses depois de um valor que é ${m?.[1]}, não uma função.`,
      why: 'Causa clássica: você criou uma variável com o nome de uma função, como `list = [1, 2]` ou `sum = 0`, e depois tentou usar list(...) ou sum(...).',
      investigate: 'Procure no código uma atribuição a um nome de função embutida (list, str, sum, max, input, print).',
      fix: 'Renomeie a variável (ex.: `numeros` em vez de `list`).',
      avoid: 'Nunca use nomes de funções embutidas como nomes de variáveis.',
    }),
  },
  {
    type: /^TypeError$/,
    msg: /missing (\d+) required positional argument|takes (\d+) positional arguments? but (\d+)/,
    explain: (_m, c) => ({
      title: 'Número errado de argumentos na chamada',
      translation: traduzir(c.message),
      what: `Uma função foi chamada ${at(c.line)} com uma quantidade de argumentos diferente da que ela recebe.`,
      why: 'Cada parâmetro sem valor padrão precisa de um argumento. Em métodos, lembre que self é passado automaticamente.',
      investigate: 'Compare a linha do def com a linha da chamada: conte os parâmetros e os argumentos.',
      fix: 'Passe os argumentos que faltam (ou remova os extras), ou dê um valor padrão ao parâmetro: `def f(x, y=0)`.',
      avoid: 'Use nomes de parâmetros claros e, em chamadas com muitos argumentos, use argumentos nomeados: f(x=1, y=2).',
    }),
  },
  {
    type: /^TypeError$/,
    msg: /'NoneType' object is not (subscriptable|iterable)|unsupported operand type\(s\) for .*NoneType/,
    explain: (_m, c) => ({
      title: 'Usou o resultado de algo que devolveu None',
      translation: traduzir(c.message),
      what: `${at(c.line)[0]!.toUpperCase() + at(c.line).slice(1)}, um valor é None (nada), mas o código o usa como lista, número ou texto.`,
      why: 'Funções sem return devolvem None. Métodos como lista.sort() e lista.append() alteram a lista e devolvem None: `x = lista.sort()` deixa x = None.',
      investigate: 'Descubra de onde vem o valor. A função que o produziu tem return em todos os caminhos? Você guardou o retorno de .sort() ou .append()?',
      fix: 'Adicione o return que falta, ou use `sorted(lista)` (que devolve uma lista nova) em vez de `lista.sort()`.',
      avoid: 'Escreva testes que verificam o retorno das suas funções, inclusive nos casos "sem resultado".',
    }),
  },
  {
    type: /^TypeError$/,
    explain: (_m, c) => ({
      title: 'Operação com o tipo errado',
      translation: traduzir(c.message),
      what: `${at(c.line)[0]!.toUpperCase() + at(c.line).slice(1)}, uma operação recebeu um valor de tipo que ela não aceita.`,
      why: 'Cada operação funciona com certos tipos: não dá para dividir um texto, nem indexar um número.',
      investigate: 'Imprima os valores e os tipos envolvidos logo antes da linha: `print(repr(x), type(x))`.',
      fix: 'Converta o valor para o tipo certo ou corrija de onde ele vem.',
      avoid: 'Saiba o tipo de cada variável. Anotações de tipo (def f(x: int) -> str) ajudam você e o editor.',
    }),
  },
  {
    type: /^IndexError$/,
    explain: (_m, c) => ({
      title: 'Posição fora da lista',
      translation: traduzir(c.message),
      what: `${at(c.line)[0]!.toUpperCase() + at(c.line).slice(1)}, o código pediu uma posição que não existe.`,
      why: 'Índices começam em 0: uma lista com 3 itens tem as posições 0, 1 e 2. Pedir lista[3] (ou qualquer posição numa lista vazia) gera esse erro. É o famoso erro "de um a mais" (off-by-one).',
      investigate: 'Imprima `len(lista)` e o índice usado logo antes do erro. Em laços, confira o range: range(len(x)) vai de 0 a len(x) - 1.',
      fix: 'Ajuste o índice ou o limite do laço. Para percorrer, prefira `for item in lista:`, que nunca sai da lista.',
      avoid: 'Prefira iterar diretamente pelos itens (ou com enumerate) a manipular índices. Teste com lista vazia e com um elemento.',
    }),
  },
  {
    type: /^KeyError$/,
    explain: (_m, c) => ({
      title: `A chave ${c.message || ''} não existe no dicionário`,
      translation: `erro de chave: ${c.message}`,
      what: `${at(c.line)[0]!.toUpperCase() + at(c.line).slice(1)}, o código buscou no dicionário uma chave que ele não tem.`,
      why: 'd[chave] exige que a chave exista. Causas comuns: grafia ou maiúsculas diferentes, número vs. texto ("1" ≠ 1), ou a chave ainda não foi inserida.',
      investigate: 'Imprima `d.keys()` e `repr(chave)` logo antes do erro e compare.',
      fix: 'Use `d.get(chave, padrao)` quando a ausência é normal, ou verifique antes com `if chave in d:`.',
      avoid: 'Decida: ausência é erro do programa (deixe o KeyError aparecer) ou situação esperada (use get)? E normalize as chaves (ex.: .lower()).',
    }),
  },
  {
    type: /^ValueError$/,
    msg: /invalid literal for int\(\) with base 10: (.*)|could not convert string to float: (.*)/,
    explain: (m, c) => ({
      title: 'Texto que não é número',
      translation: m?.[1] ? `literal inválido para int() na base 10: ${m[1]}` : `não foi possível converter o texto para float: ${m?.[2]}`,
      what: `${at(c.line)[0]!.toUpperCase() + at(c.line).slice(1)}, int() ou float() recebeu um texto que não representa um número (${m?.[1] ?? m?.[2]}).`,
      why: 'int("12") funciona; int("doze"), int("") e int("3.5") não. float() não aceita vírgula: use ponto ("3.5").',
      investigate: 'Imprima `repr(texto)` antes da conversão: há espaços, vírgula, texto vazio?',
      fix: 'Trate a entrada com try/except ValueError e peça de novo, ou limpe o texto (strip, replace(",", ".")).',
      avoid: 'Nunca confie que a entrada do usuário está no formato certo: valide sempre.',
    }),
  },
  {
    type: /^ValueError$/,
    explain: (_m, c) => ({
      title: 'Valor inválido',
      translation: traduzir(c.message),
      what: `${at(c.line)[0]!.toUpperCase() + at(c.line).slice(1)}, uma função recebeu um valor do tipo certo, mas com conteúdo inaceitável.`,
      why: 'Ex.: lista.remove(x) quando x não está na lista; desempacotar `a, b = [1, 2, 3]`.',
      investigate: 'Leia a mensagem traduzida e imprima o valor envolvido.',
      fix: 'Verifique o valor antes (if x in lista) ou trate o erro com try/except ValueError.',
      avoid: 'Valide dados na entrada do sistema, perto de onde eles chegam.',
    }),
  },
  {
    type: /^ZeroDivisionError$/,
    explain: (_m, c) => ({
      title: 'Divisão por zero',
      translation: 'divisão por zero',
      what: `${at(c.line)[0]!.toUpperCase() + at(c.line).slice(1)}, um número foi dividido por 0 (com /, // ou %).`,
      why: 'A divisão por zero não tem resultado definido. Comum ao calcular média de uma lista vazia: sum([]) / len([]).',
      investigate: 'Descubra por que o divisor vale 0 nesse caso. É um caso limite (lista vazia, contador zerado)?',
      fix: 'Trate o caso antes: `if len(xs) == 0: return 0` (ou o que fizer sentido), ou capture ZeroDivisionError.',
      avoid: 'Sempre teste suas funções com entradas vazias e com zero.',
    }),
  },
  {
    type: /^AttributeError$/,
    msg: /'(\w+)' object has no attribute '(\w+)'/,
    explain: (m, c) => ({
      title: `O tipo ${m?.[1]} não tem "${m?.[2]}"`,
      translation: `objeto do tipo "${m?.[1]}" não tem o atributo "${m?.[2]}"`,
      what: `${at(c.line)[0]!.toUpperCase() + at(c.line).slice(1)}, o código usou .${m?.[2]} num valor do tipo ${m?.[1]}, que não tem esse método ou atributo.`,
      why: m?.[1] === 'NoneType' ? 'O valor é None: provavelmente veio de uma função sem return ou de um método que altera e devolve None (como .sort()).' : `Ou o nome está errado (ex.: .lenght), ou o valor não é do tipo que você imagina (ex.: append é de list, não de str nem de dict).`,
      investigate: `Imprima type(valor). Consulte os métodos disponíveis com dir(valor) ou help(${m?.[1]}).`,
      fix: 'Corrija o nome do método ou converta o valor para o tipo que tem esse método.',
      avoid: 'Use o autocompletar do editor: ele só sugere atributos que existem.',
    }),
  },
  {
    type: /^RecursionError$/,
    explain: () => ({
      title: 'Recursão sem fim',
      translation: 'profundidade máxima de recursão excedida',
      what: 'Uma função chamou a si mesma tantas vezes que a pilha de chamadas estourou (o limite padrão é cerca de 1000).',
      why: 'Falta o caso base, ou a chamada recursiva não se aproxima dele (ex.: f(n) chama f(n) em vez de f(n - 1)).',
      investigate: 'Para cada chamada recursiva, pergunte: o argumento fica "menor"? O caso base é alcançado para TODAS as entradas (inclusive negativas)?',
      fix: 'Adicione ou corrija o caso base e garanta que cada chamada avance em direção a ele.',
      avoid: 'Escreva o caso base primeiro. Para entradas muito grandes, prefira a versão iterativa.',
    }),
  },
  {
    type: /^Timeout$/,
    explain: () => ({
      title: 'O programa não terminou a tempo',
      translation: 'tempo limite excedido',
      what: 'A execução foi interrompida porque passou do tempo limite. O Python foi reiniciado.',
      why: 'Quase sempre é um laço infinito: a condição do while nunca fica falsa (a variável não muda dentro do laço), ou uma recursão muito profunda/cara.',
      investigate: 'Olhe cada while: o que muda dentro dele que, em algum momento, torna a condição falsa? Use o modo "passo a passo" com uma entrada pequena.',
      fix: 'Atualize a variável da condição dentro do laço (ex.: i += 1) ou adicione um break.',
      avoid: 'Ao escrever um while, escreva primeiro a linha que faz o laço avançar.',
    }),
  },
  {
    type: /^EOFError$/,
    explain: () => ({
      title: 'O programa pediu mais entradas do que existem',
      translation: 'fim de arquivo ao ler uma linha',
      what: 'input() foi chamado, mas não havia mais linhas de entrada para ler.',
      why: 'Neste ambiente, a entrada do usuário vem da caixa "Entrada (stdin)": cada linha é uma resposta para um input().',
      investigate: 'Conte quantas vezes input() é chamado e quantas linhas existem na caixa de entrada.',
      fix: 'Adicione linhas na caixa de entrada (uma por input()).',
      avoid: 'Ao testar programas interativos, prepare todas as entradas antes de executar.',
    }),
  },
  {
    type: /^(ModuleNotFoundError|ImportError)$/,
    explain: (_m, c) => ({
      title: 'Módulo não encontrado',
      translation: traduzir(c.message),
      what: 'O import pediu um módulo que não está disponível.',
      why: 'Ou o nome está errado, ou o pacote não está instalado. No navegador, só a biblioteca padrão do Python está disponível.',
      investigate: 'Confira a grafia. No seu computador, rode `python -m pip show <pacote>` dentro do ambiente virtual.',
      fix: 'Corrija o nome ou instale o pacote (no seu computador): `python -m pip install <pacote>`.',
      avoid: 'Use um ambiente virtual por projeto e registre as dependências (requirements.txt ou pyproject.toml).',
    }),
  },
  {
    type: /^FileNotFoundError$/,
    explain: (_m, c) => ({
      title: 'Arquivo não encontrado',
      translation: traduzir(c.message),
      what: 'O programa tentou abrir um arquivo que não existe no caminho indicado.',
      why: 'Caminhos relativos são resolvidos a partir da pasta onde o programa é executado, que nem sempre é a pasta do arquivo .py.',
      investigate: 'Imprima `os.getcwd()` e confira o caminho. O nome tem a extensão certa?',
      fix: 'Corrija o caminho, ou trate a ausência: `except FileNotFoundError:` começando com dados vazios.',
      avoid: 'Use pathlib.Path(__file__).parent para montar caminhos relativos ao próprio script.',
    }),
  },
  {
    type: /^AssertionError$/,
    explain: (_m, c) => ({
      title: 'Uma verificação (assert) falhou',
      translation: c.message ? `verificação falhou: ${c.message}` : 'verificação falhou',
      what: 'Uma condição que deveria ser verdadeira era falsa.',
      why: 'assert é usado em testes para afirmar o comportamento esperado. Se falhou, o resultado do código é diferente do esperado.',
      investigate: 'Compare o valor obtido com o esperado. Execute a função com a mesma entrada do teste e imprima o resultado.',
      fix: 'Corrija a lógica até o resultado bater com o esperado.',
      avoid: 'Escreva os testes antes ou junto com o código: fica claro o que "certo" significa.',
    }),
  },
  {
    type: /^OverflowError$/,
    explain: (_m, c) => ({
      title: 'Número grande demais',
      translation: traduzir(c.message),
      what: 'Uma operação com float produziu um valor maior do que é possível representar.',
      why: 'Inteiros em Python crescem sem limite, mas floats têm limite (cerca de 1.8e308).',
      investigate: 'Veja qual operação gera o número (potência, exponencial).',
      fix: 'Use inteiros quando possível, ou reformule a conta (ex.: logaritmos).',
      avoid: 'Desconfie de crescimento exponencial em laços.',
    }),
  },

  /* ---------------- JavaScript ---------------- */
  {
    type: /^ReferenceError$/,
    msg: /(\w+) is not defined/,
    explain: (m, c) => ({
      title: `"${m?.[1]}" não foi declarado`,
      translation: `"${m?.[1]}" não está definido`,
      what: `${at(c.line)[0]!.toUpperCase() + at(c.line).slice(1)}, o JavaScript encontrou o nome "${m?.[1]}" sem declaração.`,
      why: 'Variáveis precisam ser declaradas com let ou const antes do uso. Também acontece com erro de digitação ou maiúsculas.',
      investigate: `Procure onde "${m?.[1]}" é declarado e se está no mesmo escopo (dentro do mesmo bloco ou função).`,
      fix: `Declare com const ou let, ou corrija a grafia.`,
      avoid: 'Prefira const; use let só quando o valor muda. Nunca use variáveis sem declaração.',
    }),
  },
  {
    type: /^TypeError$/,
    msg: /Cannot read propert(y|ies) of (undefined|null)/,
    explain: (m, c) => ({
      title: `Acessou uma propriedade de ${m?.[2]}`,
      translation: `não é possível ler propriedades de ${m?.[2]}`,
      what: `${at(c.line)[0]!.toUpperCase() + at(c.line).slice(1)}, o código fez algo.propriedade, mas algo era ${m?.[2]}.`,
      why: 'Um objeto ou elemento que você esperava não existe: chave errada, índice fora do array, querySelector que não achou nada, ou dado assíncrono que ainda não chegou.',
      investigate: 'Faça console.log do objeto antes da linha. De onde ele deveria vir?',
      fix: 'Garanta que o valor existe antes de usar, ou use encadeamento opcional: obj?.prop.',
      avoid: 'Trate explicitamente o caso "não encontrado" e valide dados vindos de fora.',
    }),
  },
  {
    type: /^TypeError$/,
    msg: /(\S+) is not a function/,
    explain: (m, c) => ({
      title: `"${m?.[1]}" não é uma função`,
      translation: `"${m?.[1]}" não é uma função`,
      what: `${at(c.line)[0]!.toUpperCase() + at(c.line).slice(1)}, o código tentou chamar ${m?.[1]}(), mas o valor não é uma função.`,
      why: 'Nome de método errado (ex.: .lenght, .push num objeto), ou a variável foi sobrescrita.',
      investigate: 'Faça console.log(typeof valor) e confira o nome do método na documentação (MDN).',
      fix: 'Corrija o nome ou use o tipo certo (push é de Array, não de Object).',
      avoid: 'Use o autocompletar do editor e consulte a MDN.',
    }),
  },
  {
    type: /^(SyntaxError|RangeError|TypeError|Error)$/,
    explain: (_m, c) => ({
      title: 'Erro no programa',
      translation: traduzir(c.message),
      what: `O programa parou ${at(c.line)}.`,
      why: 'Leia a mensagem original: ela diz o tipo e o motivo do erro.',
      investigate: 'Vá até a linha indicada e imprima os valores envolvidos.',
      fix: 'Corrija a causa identificada e execute de novo.',
      avoid: 'Teste em passos pequenos, executando o código com frequência.',
    }),
  },
];

/** Traduções de trechos frequentes de mensagens de erro (inglês → português). */
const PHRASES: Array<[RegExp, string]> = [
  [/name '(\w+)' is not defined/, 'o nome "$1" não está definido'],
  [/list index out of range/, 'índice da lista fora do intervalo'],
  [/string index out of range/, 'índice do texto fora do intervalo'],
  [/tuple index out of range/, 'índice da tupla fora do intervalo'],
  [/pop from empty list/, 'pop em lista vazia'],
  [/division by zero|integer division or modulo by zero|float division by zero/, 'divisão por zero'],
  [/maximum recursion depth exceeded.*/, 'profundidade máxima de recursão excedida'],
  [/unindent does not match any outer indentation level/, 'o recuo não corresponde a nenhum nível externo'],
  [/inconsistent use of tabs and spaces in indentation/, 'uso inconsistente de tabs e espaços na indentação'],
  [/invalid syntax/, 'sintaxe inválida'],
  [/'(\w+)' object is not subscriptable/, 'objeto do tipo "$1" não aceita índice [ ]'],
  [/'(\w+)' object is not iterable/, 'objeto do tipo "$1" não é iterável (não dá para percorrer com for)'],
  [/'(\w+)' object is not callable/, 'objeto do tipo "$1" não pode ser chamado como função'],
  [/unsupported operand type\(s\) for (.+): '(\w+)' and '(\w+)'/, 'tipos não suportados para $1: "$2" e "$3"'],
  [/(\w+)\(\) missing (\d+) required positional arguments?: (.*)/, '$1() precisa de mais $2 argumento(s) obrigatório(s): $3'],
  [/(\w+)\(\) takes (\d+) positional arguments? but (\d+) (was|were) given/, '$1() recebe $2 argumento(s), mas $3 foram passados'],
  [/cannot access local variable '(\w+)' where it is not associated with a value/, 'não é possível acessar a variável local "$1" antes de ela receber um valor'],
  [/No module named '([\w.]+)'/, 'não há módulo chamado "$1"'],
  [/\[Errno 2\] No such file or directory: (.*)/, 'arquivo ou pasta não encontrado: $1'],
  [/list\.remove\(x\): x not in list/, 'list.remove(x): x não está na lista'],
  [/too many values to unpack \(expected (\d+)\)/, 'valores demais para desempacotar (esperava $1)'],
  [/not enough values to unpack \(expected (\d+), got (\d+)\)/, 'valores de menos para desempacotar (esperava $1, recebeu $2)'],
  [/math domain error/, 'erro de domínio matemático (ex.: raiz de número negativo)'],
  [/no such table: (\w+)/, 'tabela inexistente: $1'],
  [/no such column: ([\w.]+)/, 'coluna inexistente: $1'],
  [/near "(.+)": syntax error/, 'erro de sintaxe perto de "$1"'],
  [/ambiguous column name: (\w+)/, 'nome de coluna ambíguo: $1 (existe em mais de uma tabela; use tabela.coluna)'],
  [/is not defined/, 'não está definido'],
];

export function traduzir(message: string): string {
  for (const [re, pt] of PHRASES) if (re.test(message)) return message.replace(re, pt);
  return message;
}

export function explainError(err: { type: string; message: string; line: number | null }, lineCode?: string): ErrorExplanation {
  for (const r of RULES) {
    if (!r.type.test(err.type)) continue;
    const m = r.msg ? err.message.match(r.msg) : null;
    if (r.msg && !m) continue;
    const e = r.explain(m, { message: err.message, line: err.line, lineCode });
    return { ...e, searchHint: e.searchHint ?? `${err.type}: ${err.message}`.slice(0, 90) };
  }
  return {
    title: `${err.type}`,
    translation: traduzir(err.message),
    what: `O programa parou com o erro ${err.type} ${at(err.line)}.`,
    why: 'Este erro não está no nosso catálogo ainda. A mensagem original diz o motivo.',
    investigate: 'Leia a última linha do traceback (tipo e mensagem) e a linha indicada. Imprima os valores envolvidos.',
    fix: 'Pesquise a mensagem exata em inglês, junto com "python".',
    avoid: 'Teste em passos pequenos.',
    searchHint: `python ${err.type}: ${err.message}`.slice(0, 90),
  };
}
