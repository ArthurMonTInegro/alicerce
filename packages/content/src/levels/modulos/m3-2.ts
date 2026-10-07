/** Lições adicionais do módulo m3-2 (pilhas e filas). */
import type { Lesson } from '../../types.ts';
import { dedent, deep, english, lesson, md, py, t, tip, warn } from '../../helpers.ts';

/* ------------------------------------------------------------------ */
/* Lição 2: expressões com pilhas (infixa → pós-fixa)                 */
/* ------------------------------------------------------------------ */

const PARA_RPN_SEM_PARENTESES = dedent(`
  PREC = {"+": 1, "-": 1, "*": 2, "/": 2}

  def para_rpn(expr):
      saida, pilha = [], []
      for tok in expr.split():
          if tok in PREC:
              while pilha and PREC[pilha[-1]] >= PREC[tok]:
                  saida.append(pilha.pop())
              pilha.append(tok)
          else:
              saida.append(tok)
      while pilha:
          saida.append(pilha.pop())
      return " ".join(saida)
`);

const expressoesRpn = lesson({
  id: 'l3-expressoes-rpn',
  moduleId: 'm3-2',
  title: 'Expressões com pilhas: da infixa à notação polonesa reversa',
  titleEn: 'Expressions with stacks: from infix to Reverse Polish Notation',
  summary: 'Por que a notação pós-fixa dispensa parênteses, como precedência e associatividade decidem a ordem das contas e como o algoritmo do pátio de manobras transforma 3 + 4 * 2 em 3 4 2 * + com uma pilha.',
  minutes: 45,
  objectives: [
    'Converter expressões à mão entre as notações infixa, pós-fixa (RPN) e prefixa',
    'Explicar precedência e associatividade e por que `8 - 3 - 2` vale 3 e `2 ** 3 ** 2` vale 512',
    'Implementar o algoritmo do pátio de manobras (shunting-yard), inclusive com parênteses',
    'Reconhecer onde a pós-fixa aparece: calculadoras HP, bytecode do Python, JVM e WebAssembly',
  ],
  skills: ['ed-pilhas-filas', 'logica-operadores'],
  terms: [
    t('notação infixa', 'infix notation', 'O operador fica entre os operandos, como em 3 + 4. Precisa de regras de precedência e de parênteses.', 'Most programming languages use infix notation for arithmetic.'),
    t('operando', 'operand', 'Valor sobre o qual um operador age. Em 3 + 4, os operandos são 3 e 4.', "TypeError: unsupported operand type(s) for +: 'int' and 'str'"),
    t('notação polonesa reversa / pós-fixa', 'Reverse Polish Notation (RPN) / postfix notation', 'O operador vem depois dos operandos, como em 3 4 +. Não precisa de parênteses nem de precedência.', 'HP calculators such as the HP 12C use Reverse Polish Notation.'),
    t('notação prefixa / polonesa', 'prefix notation / Polish notation', 'O operador vem antes dos operandos, como em + 3 4. Proposta por Jan Łukasiewicz em 1924.'),
    t('precedência', 'operator precedence', 'Regra que diz qual operador é aplicado primeiro quando estão em níveis diferentes: * antes de +.'),
    t('associatividade', 'associativity', 'Regra de desempate entre operadores de mesma precedência: à esquerda, (8 - 3) - 2; à direita, 2 ** (3 ** 2).', 'Operators in the same box group left to right (except for exponentiation and conditional expressions, which group from right to left).'),
    t('algoritmo do pátio de manobras', 'shunting-yard algorithm', 'Método publicado por Edsger Dijkstra em 1961 (não confundir com o algoritmo de Dijkstra de menor caminho) que converte infixa em pós-fixa usando uma pilha de operadores.', 'The shunting-yard algorithm converts an infix expression to postfix in linear time.'),
    t('token', 'token', 'Menor pedaço com significado em um texto: um número, um operador, um parêntese.', 'The tokenize module provides a lexical scanner for Python source code.'),
    t('máquina de pilha', 'stack machine', 'Máquina (real ou virtual) cujas instruções tiram operandos de uma pilha e empilham o resultado. CPython, JVM e WebAssembly funcionam assim.'),
  ],
  stages: {
    conceito: [
      md(`
        Na escola você aprendeu a escrever \`3 + 4 * 2\` e a fazer a multiplicação primeiro. Essa é a {{notação infixa|infix notation}}: o operador fica **entre** os {{operandos|operands}}. Para pessoas ela é confortável, mas depende de regras extras: quem é calculado primeiro, como desempatar, onde estão os parênteses.

        Na {{notação polonesa reversa|Reverse Polish Notation (RPN)}}, também chamada de {{notação pós-fixa|postfix notation}}, o operador vem **depois** dos operandos: \`3 4 2 * +\`. A ordem das contas já está escrita na própria sequência, então não há parênteses nem tabela de precedência, e uma única pilha basta para calcular.

        No desafio da lição anterior você **avaliou** RPN com uma pilha. Esta lição cuida da outra metade: **produzir** RPN a partir do que uma pessoa digita. É o que fazem calculadoras, planilhas e compiladores: ler o texto infixo, convertê-lo para uma forma sem ambiguidade e só então calcular.
      `),
    ],
    explicacao: [
      md('### Três notações para a mesma conta'),
      {
        type: 'table',
        head: ['Notação', 'Para `(3 + 4) * 2`', 'Para `3 + 4 * 2`', 'Onde aparece'],
        rows: [
          ['Infixa', '`(3 + 4) * 2`', '`3 + 4 * 2`', 'matemática da escola, Python, planilhas'],
          ['{{Prefixa (polonesa)|prefix notation (Polish notation)}}', '`* + 3 4 2`', '`+ 3 * 4 2`', 'Lisp: `(* (+ 3 4) 2)`'],
          ['Pós-fixa (polonesa reversa, RPN)', '`3 4 + 2 *`', '`3 4 2 * +`', 'calculadoras HP, bytecode, PostScript'],
        ],
        caption: 'Com operadores de dois operandos, a prefixa e a pós-fixa não precisam de parênteses: a posição de cada operador já diz sobre quais operandos ele age. O Lisp usa parênteses por outro motivo: para permitir qualquer número de operandos, como em `(+ 1 2 3)`.',
      },
      md(`
        Repare em duas coisas. Primeiro, **os números nunca mudam de ordem**: converter de uma notação para outra só muda a posição dos operadores. Segundo, na pós-fixa os parênteses somem porque cada operador age sobre os dois valores mais recentes que ainda não foram usados (em \`3 4 2 * +\`, o \`*\` junta 4 e 2; o \`+\` junta 3 e o 8 que acabou de surgir); na prefixa, sobre as duas subexpressões que vêm logo depois dele.

        **Para converter à mão**: ponha parênteses em volta de cada conta, na ordem em que ela é feita; depois leve cada operador para logo depois do parêntese que fecha a conta dele e apague os parênteses.
        \`3 + 4 * 2\` → \`(3 + (4 * 2))\` → \`3 4 2 * +\`. Para a prefixa, leve cada operador para logo antes do parêntese que abre a conta dele: \`+ 3 * 4 2\`.

        ### Precedência e associatividade
        A {{precedência|operator precedence}} decide entre operadores de **níveis diferentes**: \`*\` e \`/\` antes de \`+\` e \`-\` (você viu isso no Nível 1). E quando os operadores estão **no mesmo nível**, como \`-\` e \`-\`, ou \`+\` e \`-\`? Quem decide é a {{associatividade|associativity}}:

        - **À esquerda** (\`+ - * /\` em Python): \`8 - 3 - 2\` é \`(8 - 3) - 2\`, que vale 3, e não \`8 - (3 - 2)\`, que vale 7.
        - **À direita** (\`**\` em Python): \`2 ** 3 ** 2\` é \`2 ** (3 ** 2)\`, que vale 512, e não \`(2 ** 3) ** 2\`, que vale 64.

        Em RPN essas leituras viram sequências diferentes: \`8 3 - 2 -\` vale 3 e \`8 3 2 - -\` vale 7. Um conversor precisa acertar isso.

        ### O algoritmo do pátio de manobras
        Em 1961, Edsger Dijkstra descreveu um método para converter infixa em pós-fixa com **uma pilha de operadores**. O nome, {{algoritmo do pátio de manobras|shunting-yard algorithm}}, vem dos pátios ferroviários, onde vagões são desviados para um trilho lateral e depois devolvidos à linha na ordem certa. Leia os {{tokens|tokens}} (números, operadores e parênteses) da esquerda para a direita:

        1. **Número**: vai direto para a saída.
        2. **Operador**: enquanto o topo da pilha for um operador **mais forte**, ou **igual** (quando o novo é associativo à esquerda), desempilhe esse topo para a saída. Depois, empilhe o novo.
        3. **Abre parêntese**: empilhe. Ele funciona como uma parede: nada que está abaixo dele sai antes do fecha parêntese correspondente.
        4. **Fecha parêntese**: desempilhe para a saída até encontrar o \`(\` e descarte os dois parênteses. Se a pilha esvaziar sem achar \`(\`, a expressão está malformada.
        5. **Fim do texto**: desempilhe tudo para a saída. Se sobrar um \`(\`, faltou fechar um parêntese.

        A intuição: um operador fica **esperando** na pilha porque ainda pode chegar, à direita, alguém mais forte que precisa ser calculado antes. Quando chega um operador mais fraco (ou igual, na associatividade à esquerda), quem esperava já tem os dois operandos completos e pode sair.

        **Custo**: cada token entra e sai da pilha no máximo uma vez, então a conversão é **O(n)** em tempo, com O(n) de memória extra no pior caso (muitos parênteses abertos).
      `),
      warn(`
        \`eval("3 + 4 * 2")\` funciona, mas executa **qualquer** código Python. Se o texto vier de um usuário, ele pode digitar um comando que apaga arquivos ou lê dados que não deveria. Calculadoras e planilhas de verdade fazem o que esta lição ensina: separam o texto em tokens, convertem e calculam só o que é permitido.
      `, 'Por que não usar eval'),
      deep(`
        - **Calculadoras HP**, como a HP 12C (até hoje comum em matemática financeira), trabalham em RPN: você digita \`3 ENTER 4 +\`.
        - O **CPython** compila seu código para instruções de uma {{máquina de pilha|stack machine}}: \`a + b * c\` vira "carregue a, carregue b, carregue c, multiplique, some". Isso é RPN (veja o segundo bloco da seção Código). A JVM e o WebAssembly também são máquinas de pilha.
        - Compiladores costumam montar uma **árvore** da expressão em vez de uma string. A RPN é a leitura dessa árvore "filhos primeiro, depois o pai", o percurso em pós-ordem que você verá no módulo de árvores.
      `, 'Onde a pós-fixa vive hoje'),
    ],
    exemplo: [
      md('Vamos converter `5 * ( 6 - 2 ) - 8 / 4` token a token. A pilha guarda só operadores e parênteses; os números passam direto para a saída.'),
      {
        type: 'table',
        head: ['Token', 'O que acontece', 'Pilha (topo à direita)', 'Saída'],
        rows: [
          ['`5`', 'número: vai para a saída', '(vazia)', '`5`'],
          ['`*`', 'pilha vazia: empilha', '`*`', '`5`'],
          ['`(`', 'abre a "parede": empilha', '`* (`', '`5`'],
          ['`6`', 'número: saída', '`* (`', '`5 6`'],
          ['`-`', 'o topo é `(`: ninguém sai; empilha', '`* ( -`', '`5 6`'],
          ['`2`', 'número: saída', '`* ( -`', '`5 6 2`'],
          ['`)`', 'desempilha até o `(`: sai o `-`; descarta os parênteses', '`*`', '`5 6 2 -`'],
          ['`-`', 'o topo `*` é mais forte: sai; a pilha esvazia; empilha o `-`', '`-`', '`5 6 2 - *`'],
          ['`8`', 'número: saída', '`-`', '`5 6 2 - * 8`'],
          ['`/`', 'o topo `-` é mais fraco: fica; empilha o `/`', '`- /`', '`5 6 2 - * 8`'],
          ['`4`', 'número: saída', '`- /`', '`5 6 2 - * 8 4`'],
          ['fim', 'esvazia a pilha do topo para baixo: `/`, depois `-`', '(vazia)', '`5 6 2 - * 8 4 / -`'],
        ],
        caption: 'Conversão de `5 * ( 6 - 2 ) - 8 / 4` pelo pátio de manobras.',
      },
      md('Confira avaliando a saída com uma pilha de valores: `5 6 2 -` deixa 5 e 4 na pilha; `*` dá 20; `8 4 /` dá 2; o `-` final dá **18**. É o mesmo que `5 * (6 - 2) - 8 / 4`, ou seja, 20 - 2.'),
    ],
    codigo: [
      md('A versão abaixo já trata precedência e associatividade à esquerda, mas **ainda não** trata parênteses (essa parte fica para você no exercício). Os tokens vêm separados por espaço.'),
      py(`
        PREC = {"+": 1, "-": 1, "*": 2, "/": 2}

        def para_rpn(expr):
            saida, pilha = [], []
            for tok in expr.split():
                if tok in PREC:
                    # sai quem é mais forte ou igual (associatividade à esquerda)
                    while pilha and PREC[pilha[-1]] >= PREC[tok]:
                        saida.append(pilha.pop())
                    pilha.append(tok)
                else:
                    saida.append(tok)          # número: direto para a saída
            while pilha:                       # fim: esvazia a pilha
                saida.append(pilha.pop())
            return " ".join(saida)

        for e in ["3 + 4 * 2", "8 - 3 - 2", "2 * 3 + 4 * 5", "9 / 3 / 3"]:
            print(f"{e:<15} ->  {para_rpn(e)}")
      `),
      py(`
        import dis
        dis.dis("a + b * c")
      `, { caption: 'O bytecode do Python é RPN: três LOAD, depois a multiplicação, depois a soma. Os nomes exatos das instruções mudam entre versões do Python.' }),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e3-rpn-1',
          kind: 'mcq',
          prompt: 'Qual é a forma pós-fixa (RPN) de `(5 + 2) * 3`?',
          difficulty: 'facil',
          skills: ['ed-pilhas-filas', 'logica-operadores'],
          hints: [
            'Qual conta é feita primeiro? Escreva só ela em pós-fixa: dois números e, depois, o operador.',
            'O resultado dessa primeira conta vira o primeiro operando da próxima. Onde entra o segundo operador?',
          ],
          explanation: 'Em RPN cada operador age sobre os dois valores mais recentes: `5 2 +` produz 7 e `7 3 *` produz 21. A ordem dos números (5, 2, 3) é a mesma da infixa; converter só reposiciona os operadores.',
          options: [
            { text: '`5 2 + 3 *`', correct: true, feedback: 'Isso: primeiro a conta entre parênteses (`5 2 +`), depois o resultado vezes 3.' },
            { text: '`5 2 3 + *`', feedback: 'Essa é a RPN de `5 * (2 + 3)`: o + agiria sobre 2 e 3. Os parênteses originais agrupam 5 e 2.' },
            { text: '`5 + 2 3 *`', feedback: 'Na pós-fixa todo operador vem depois dos seus dois operandos. Aqui o + continua entre 5 e 2, como na infixa.' },
            { text: '`* + 5 2 3`', feedback: 'Essa é a forma prefixa (polonesa), com os operadores antes dos operandos. A pós-fixa é o contrário.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e3-rpn-2',
          kind: 'predict',
          lang: 'python',
          prompt: 'Simule o pátio de manobras (a mesma função da seção Código). O que é impresso?',
          difficulty: 'intermediario',
          skills: ['ed-pilhas-filas'],
          hints: [
            'Monte uma tabela com três colunas: token, pilha e saída. Os números são fáceis; concentre-se nos operadores.',
            'Quando o `-` chega, o `while` compara a precedência dele com a do topo. Depois de tirar um operador, o laço para ou compara de novo com o novo topo?',
          ],
          explanation: 'O `*` espera na pilha em cima do `+`. Quando chega o `-`, ele tira o `*` (precedência maior) e também o `+` (precedência igual, associatividade à esquerda) e só então entra. Resultado: `1 2 3 * + 4 -`, que vale 1 + 6 - 4 = 3.',
          code: `${PARA_RPN_SEM_PARENTESES}\n\nprint(para_rpn("1 + 2 * 3 - 4"))`,
          answer: '1 2 3 * + 4 -',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e3-rpn-3',
          kind: 'mcq',
          prompt: 'Alguém trocou `>=` por `>` no laço do pátio de manobras: `while pilha and PREC[pilha[-1]] > PREC[tok]`. Para qual entrada a RPN produzida passa a ter um **valor** diferente do correto?',
          difficulty: 'intermediario',
          skills: ['ed-pilhas-filas', 'logica-operadores'],
          hints: [
            'A troca só muda alguma coisa quando as duas precedências comparadas são **iguais**. Em quais opções isso acontece?',
            'Entre essas, em qual o jeito de agrupar muda o resultado da conta?',
          ],
          explanation: 'O `>=` implementa a associatividade à esquerda: num empate, o operador que já esperava (o da esquerda) é aplicado primeiro. Para um operador associativo à direita, como `**`, o certo é justamente `>`: em `2 ** 3 ** 2`, o primeiro `**` precisa continuar esperando.',
          options: [
            { text: '`8 - 3 - 2`', correct: true, feedback: 'Isso: com `>`, o primeiro `-` não sai quando chega o segundo, e a saída vira `8 3 2 - -`, que calcula 8 - (3 - 2) = 7 em vez de 3. A subtração não é associativa.' },
            { text: '`8 + 3 + 2`', feedback: 'A saída muda para `8 3 2 + +`, mas o valor não: 8 + (3 + 2) = (8 + 3) + 2. Na adição de inteiros, o agrupamento não altera o resultado.' },
            { text: '`8 * 3 - 2`', feedback: 'As precedências são diferentes (2 contra 1): quando o `-` chega, o `*` sai tanto com `>` quanto com `>=`.' },
            { text: '`8 - 3 * 2`', feedback: 'Quando o `*` chega, o topo é o `-`, mais fraco: ninguém sai, com `>` ou com `>=`. A saída continua `8 3 2 * -`.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e3-rpn-4',
          kind: 'code',
          lang: 'python',
          prompt: 'A função abaixo converte infixa em RPN, mas ainda não entende parênteses. Complete-a para tratar `(` e `)` com as regras do pátio de manobras. Os tokens vêm separados por espaço (ex.: `"( 3 + 4 ) * 2"` → `"3 4 + 2 *"`). Se os parênteses estiverem desbalanceados (um `)` sem par ou um `(` que nunca fecha), lance `ValueError`.',
          difficulty: 'intermediario',
          skills: ['ed-pilhas-filas', 'logica-operadores'],
          hints: [
            'Quando chega um `(`, ele vai para a saída ou para a pilha? E o que o laço dos operadores deve fazer se encontrar um `(` no topo?',
            'Quando chega um `)`, o que precisa sair da pilha, e até onde? O que acontece com o próprio `(`?',
            'Para os erros: em que momento você descobre um `)` sem par? E um `(` que nunca fechou?',
          ],
          explanation: 'O `(` entra na pilha e funciona como fundo falso: o laço dos operadores para nele (por isso a condição `pilha[-1] != "("`), então nada que está fora dos parênteses sai antes da hora. O `)` despeja tudo o que se acumulou dentro do par e descarta o `(`. Os dois erros são os mesmos da verificação de parênteses balanceados: fechar sem ter aberto e terminar com algo aberto.',
          starter: dedent(`
            PREC = {"+": 1, "-": 1, "*": 2, "/": 2}

            def para_rpn(expr):
                saida, pilha = [], []
                for tok in expr.split():
                    if tok in PREC:
                        while pilha and PREC[pilha[-1]] >= PREC[tok]:
                            saida.append(pilha.pop())
                        pilha.append(tok)
                    # trate "(" e ")" aqui, antes do caso do número
                    else:
                        saida.append(tok)
                while pilha:
                    saida.append(pilha.pop())
                return " ".join(saida)
          `),
          solution: dedent(`
            PREC = {"+": 1, "-": 1, "*": 2, "/": 2}

            def para_rpn(expr):
                saida, pilha = [], []
                for tok in expr.split():
                    if tok in PREC:
                        while pilha and pilha[-1] != "(" and PREC[pilha[-1]] >= PREC[tok]:
                            saida.append(pilha.pop())
                        pilha.append(tok)
                    elif tok == "(":
                        pilha.append(tok)
                    elif tok == ")":
                        while pilha and pilha[-1] != "(":
                            saida.append(pilha.pop())
                        if not pilha:
                            raise ValueError("')' sem '(' correspondente")
                        pilha.pop()
                    else:
                        saida.append(tok)
                while pilha:
                    if pilha[-1] == "(":
                        raise ValueError("'(' sem ')' correspondente")
                    saida.append(pilha.pop())
                return " ".join(saida)
          `),
          tests: [
            {
              name: 'sem parênteses continua funcionando',
              code: dedent(`
                for e, esperado in [("3 + 4 * 2", "3 4 2 * +"), ("8 - 3 - 2", "8 3 - 2 -"), ("7", "7"), ("", "")]:
                    r = para_rpn(e)
                    assert r == esperado, f"para_rpn({e!r}) devolveu {r!r}; esperado {esperado!r}"
              `),
            },
            {
              name: 'parênteses mudam a ordem',
              code: dedent(`
                for e, esperado in [("( 3 + 4 ) * 2", "3 4 + 2 *"), ("8 - ( 3 - 2 )", "8 3 2 - -"), ("5 * ( 6 - 2 ) - 8 / 4", "5 6 2 - * 8 4 / -")]:
                    r = para_rpn(e)
                    assert r == esperado, f"para_rpn({e!r}) devolveu {r!r}; esperado {esperado!r}"
              `),
            },
            {
              name: 'o "(" funciona como parede para os operadores',
              code: dedent(`
                for e, esperado in [("2 * ( 3 + 4 * 5 )", "2 3 4 5 * + *"), ("( ( 1 + 2 ) * ( 3 - 4 ) ) / 5", "1 2 + 3 4 - * 5 /"), ("( ( 7 ) )", "7")]:
                    r = para_rpn(e)
                    assert r == esperado, f"para_rpn({e!r}) devolveu {r!r}; esperado {esperado!r}"
              `),
            },
            {
              name: 'parênteses desbalanceados geram ValueError',
              code: dedent(`
                for e in ["( 1 + 2", "1 + 2 )", ") 1 + 2 (", "( ( 1 ) + 2"]:
                    try:
                        r = para_rpn(e)
                    except ValueError:
                        continue
                    assert False, f"para_rpn({e!r}) devolveu {r!r}; deveria lançar ValueError (parênteses desbalanceados)"
              `),
            },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e3-rpn-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Faça o caminho de volta. Escreva \`rpn_para_infixa(expr)\` que recebe uma expressão em RPN (tokens separados por espaço; operadores \`+ - * /\`; números inteiros não negativos) e devolve a infixa com o **mínimo de parênteses** para que o Python, lendo com suas regras de precedência e associatividade à esquerda, agrupe as contas exatamente como a RPN indica. Use um espaço de cada lado de cada operador e nenhum espaço colado aos parênteses.

            Exemplos: \`"3 4 + 2 *"\` → \`"(3 + 4) * 2"\`; \`"3 4 2 * +"\` → \`"3 + 4 * 2"\`; \`"8 3 2 - -"\` → \`"8 - (3 - 2)"\`; \`"8 3 - 2 -"\` → \`"8 - 3 - 2"\`. O que conta é o agrupamento, não só o valor: \`"1 2 3 + +"\` → \`"1 + (2 + 3)"\`, porque sem os parênteses o Python somaria 1 + 2 primeiro.

            Se a RPN for inválida (faltam ou sobram operandos, ou está vazia), lance \`ValueError\`.
          `),
          difficulty: 'desafio',
          skills: ['ed-pilhas-filas', 'logica-operadores'],
          hints: [
            'Na avaliação, a pilha guardava números. Aqui, além do texto de cada pedaço, o que você precisaria lembrar dele para decidir, mais tarde, se ele precisa de parênteses?',
            'Pense no operador "principal" de cada pedaço (o último aplicado). Um número sozinho nunca precisa de parênteses: que valor de precedência faria esse caso funcionar sem um `if` especial?',
            'Compare a precedência de cada operando com a do operador novo. Num empate, o lado esquerdo e o lado direito se comportam igual? Pense em `8 - 3 - 2` contra `8 - (3 - 2)`.',
          ],
          explanation: 'A pilha guarda pares (texto, precedência do operador principal), e números ganham uma precedência maior que todas. O operando esquerdo leva parênteses só se for mais fraco que o operador novo; o direito leva também no empate, porque o Python agruparia pela esquerda. Esse é o percurso inverso do pátio de manobras e mostra que a pilha pode guardar qualquer coisa: números (avaliação), textos (conversão) ou, num compilador, nós de uma árvore sintática.',
          starter: dedent(`
            PREC = {"+": 1, "-": 1, "*": 2, "/": 2}

            def rpn_para_infixa(expr):
                # percorra os tokens com uma pilha: cada operador junta os dois
                # últimos pedaços em um maior, com parênteses só onde precisa
                pass
          `),
          solution: dedent(`
            PREC = {"+": 1, "-": 1, "*": 2, "/": 2}

            def rpn_para_infixa(expr):
                pilha = []  # pares (texto, precedência do operador principal)
                for tok in expr.split():
                    if tok in PREC:
                        if len(pilha) < 2:
                            raise ValueError(f"faltam operandos para {tok}")
                        dir_txt, dir_p = pilha.pop()
                        esq_txt, esq_p = pilha.pop()
                        p = PREC[tok]
                        if esq_p < p:
                            esq_txt = f"({esq_txt})"
                        if dir_p <= p:
                            dir_txt = f"({dir_txt})"
                        pilha.append((f"{esq_txt} {tok} {dir_txt}", p))
                    else:
                        pilha.append((tok, 3))
                if len(pilha) != 1:
                    raise ValueError("expressão RPN inválida")
                return pilha[0][0]
          `),
          tests: [
            {
              name: 'exemplos do enunciado',
              code: dedent(`
                for e, esperado in [("3 4 + 2 *", "(3 + 4) * 2"), ("3 4 2 * +", "3 + 4 * 2"), ("8 3 2 - -", "8 - (3 - 2)"), ("8 3 - 2 -", "8 - 3 - 2")]:
                    r = rpn_para_infixa(e)
                    assert r == esperado, f"rpn_para_infixa({e!r}) devolveu {r!r}; esperado {esperado!r}"
              `),
            },
            {
              name: 'um número sozinho',
              code: dedent(`
                for e in ["7", "42"]:
                    r = rpn_para_infixa(e)
                    assert r == e, f"rpn_para_infixa({e!r}) devolveu {r!r}; um número sozinho não leva parênteses"
              `),
            },
            {
              name: 'empate à direita precisa de parênteses; à esquerda, não',
              code: dedent(`
                casos = [("1 2 3 + +", "1 + (2 + 3)"), ("6 2 3 * /", "6 / (2 * 3)"), ("1 2 + 3 +", "1 + 2 + 3"), ("2 3 * 4 /", "2 * 3 / 4")]
                for e, esperado in casos:
                    r = rpn_para_infixa(e)
                    assert r == esperado, f"rpn_para_infixa({e!r}) devolveu {r!r}; esperado {esperado!r}"
              `),
            },
            {
              name: 'precedência dos dois lados e aninhamento',
              code: dedent(`
                casos = [
                    ("1 2 + 3 4 - *", "(1 + 2) * (3 - 4)"),
                    ("2 3 * 4 5 * +", "2 * 3 + 4 * 5"),
                    ("1 2 3 4 + * -", "1 - 2 * (3 + 4)"),
                    ("5 1 2 + 4 * + 3 -", "5 + (1 + 2) * 4 - 3"),
                    ("1 2 - 3 - 4 5 - -", "1 - 2 - 3 - (4 - 5)"),
                    ("1 2 3 * + 4 *", "(1 + 2 * 3) * 4"),
                    ("2 3 * 4 + 5 *", "(2 * 3 + 4) * 5"),
                    ("1 2 3 * 4 - -", "1 - (2 * 3 - 4)"),
                ]
                for e, esperado in casos:
                    r = rpn_para_infixa(e)
                    assert r == esperado, f"rpn_para_infixa({e!r}) devolveu {r!r}; esperado {esperado!r}"
              `),
            },
            {
              name: 'RPN inválida gera ValueError',
              code: dedent(`
                for e in ["3 +", "3 4", "", "+", "1 2 + +"]:
                    try:
                        r = rpn_para_infixa(e)
                    except ValueError:
                        continue
                    assert False, f"rpn_para_infixa({e!r}) devolveu {r!r}; deveria lançar ValueError"
              `),
            },
          ],
        },
      },
    ],
    projeto: [
      md('**Calculadora que entende expressões.** Volte ao Projeto 1 e implemente a extensão "aceitar a expressão inteira em uma linha": um tokenizador que separa `12*(3+4)` em `12`, `*`, `(`, `3`, `+`, `4`, `)`; o pátio de manobras do exercício; e o avaliador de RPN da lição anterior. Nada de `eval`. Para ir além: `**` associativo à direita (pense em qual comparação muda) e mensagens claras para parênteses desbalanceados e divisão por zero.'),
      { type: 'project', projectId: 'p1-calculadora' },
    ],
    revisao: [
      md(`
        - A infixa precisa de precedência, associatividade e parênteses; a pós-fixa (RPN) não precisa de nada disso.
        - Converter não muda a ordem dos números, só a posição dos operadores.
        - Associatividade à esquerda: \`8 - 3 - 2\` = \`(8 - 3) - 2\`. À direita (\`**\`): \`2 ** 3 ** 2\` = \`2 ** 9\`.
        - Pátio de manobras: número vai para a saída; operador tira da pilha os mais fortes (e os iguais, se for associativo à esquerda) e entra; \`(\` empilha; \`)\` desempilha até o \`(\`; no fim, esvazia a pilha.
        - Custo O(n): cada token entra e sai da pilha no máximo uma vez.
      `),
      english(`
        **Vocabulary**: *infix / prefix / postfix notation*, *Reverse Polish Notation (RPN)*, *operand*, *operator precedence*, *left-associative / right-associative*, *token*, *shunting-yard algorithm*, *stack machine*.

        From the Python Language Reference: *"Operators in the same box group left to right (except for exponentiation and conditional expressions, which group from right to left)."*

        Typical interview prompt: "Convert this infix expression to postfix and walk me through the operator stack. What is the time complexity?"
      `),
    ],
  },
  review: [
    ['Converta `(2 + 3) - 4` e `2 + 3 - 4` para RPN.', 'Os dois viram `2 3 + 4 -`: `+` e `-` têm a mesma precedência e se agrupam à esquerda, então `2 + 3 - 4` já é `(2 + 3) - 4` e os parênteses não mudam nada.'],
    ['Quanto vale `8 - 3 - 2` em Python, e por quê?', '3: operadores de mesma precedência se agrupam à esquerda, então é (8 - 3) - 2.'],
    ['Quanto vale `2 ** 3 ** 2` em Python, e por quê?', '512: `**` é associativo à direita, então é `2 ** (3 ** 2)`, ou seja, `2 ** 9`.'],
    ['No pátio de manobras, o que acontece quando chega um `)`?', 'Desempilha operadores para a saída até achar o `(`; depois descarta os dois parênteses.'],
    ['No laço dos operadores, por que `>=` e não `>`?', 'O `>=` faz o operador da esquerda sair no empate, o que implementa a associatividade à esquerda.'],
    ['Por que o pátio de manobras é O(n)?', 'Cada token entra e sai da pilha no máximo uma vez.'],
    ['Ao converter infixa para RPN, o que muda de lugar: números ou operadores?', 'Só os operadores. Os números mantêm a ordem original.'],
  ],
  references: ['sedgewick-algs', 'python-docs'],
});

/* ------------------------------------------------------------------ */
/* Lição 3: filas de prioridade (introdução)                          */
/* ------------------------------------------------------------------ */

const filasPrioridade = lesson({
  id: 'l3-filas-prioridade',
  moduleId: 'm3-2',
  title: 'Filas de prioridade: quando a ordem de chegada não basta',
  titleEn: 'Priority queues: when arrival order is not enough',
  summary: 'O tipo abstrato fila de prioridade, o custo de implementá-lo com listas ou com heap, e como usar heapq na prática: desempate estável, maior primeiro e os k maiores de um fluxo.',
  minutes: 45,
  objectives: [
    'Explicar o que é uma fila de prioridade e por que fila (FIFO) e pilha (LIFO) são casos particulares dela',
    'Comparar o custo de implementá-la com lista desordenada, lista ordenada e heap',
    'Usar heapq (heappush, heappop, heapify) com tuplas de desempate e com chaves negadas para "maior primeiro"',
    'Manter os k maiores valores de um fluxo com um heap mínimo de tamanho k',
  ],
  skills: ['ed-pilhas-filas', 'ed-arrays'],
  terms: [
    t('fila de prioridade', 'priority queue', 'Estrutura que sempre entrega primeiro o item mais prioritário (em Python, o de menor chave), não o mais antigo.', 'This module provides an implementation of the heap queue algorithm, also known as the priority queue algorithm.'),
    t('tipo abstrato de dados', 'abstract data type (ADT)', 'Descrição de uma estrutura pelas operações que ela oferece, sem dizer como é implementada por dentro.', 'A stack is an abstract data type that supports push and pop.'),
    t('heap mínimo', 'min-heap', 'Organização em que o menor elemento está sempre na raiz (em heapq, em h[0]); inserir e retirar custam O(log n).', 'The interesting property of a heap is that its smallest element is always the root, heap[0].'),
    t('heap máximo', 'max-heap', 'Variante em que o maior elemento fica na raiz. Com heapq, simula-se guardando as chaves com o sinal trocado.'),
    t('transformar em heap', 'heapify', 'Reorganizar uma lista existente para que ela vire um heap, no lugar, em O(n).', 'Transform list x into a heap, in-place, in linear time.'),
    t('critério de desempate', 'tie-breaker', 'Valor extra que decide a ordem entre itens de mesma prioridade, como a ordem de chegada.'),
    t('estável', 'stable', 'Que preserva a ordem original entre itens empatados.', 'The built-in sorted() function is guaranteed to be stable.'),
    t('remoção preguiçosa', 'lazy deletion', 'Em vez de apagar ou alterar uma entrada no meio do heap, deixá-la lá e ignorá-la quando ela sair.'),
    t('k maiores', 'top-k', 'Problema de achar os k maiores (ou menores) itens de uma coleção ou de um fluxo.', 'Return the top k most frequent elements.'),
    t('fluxo de dados', 'data stream', 'Sequência de dados que chega aos poucos e que você processa sem guardar inteira.', 'Find the median from a data stream.'),
  ],
  stages: {
    conceito: [
      md(`
        No pronto-socorro ninguém é atendido por ordem de chegada: quem chega com dor no peito passa na frente de quem torceu o tornozelo. Na classificação de risco usada em muitos hospitais brasileiros (o Protocolo de Manchester), cada paciente recebe uma cor (vermelho, laranja, amarelo, verde ou azul), e a cor vale mais que o horário.

        Essa é uma {{fila de prioridade|priority queue}}: você insere itens com uma prioridade e sempre retira **o mais prioritário**, não o mais antigo. Ela aparece no escalonador de processos do sistema operacional, nos aplicativos de rota (algoritmo de Dijkstra), em simulações, na fila preferencial do banco (onde, desde 2017, quem tem mais de 80 anos tem prioridade sobre os demais idosos) e em todo pedido do tipo "mostre os 10 maiores".

        Uma ideia que amarra o módulo: a fila comum é uma fila de prioridade em que a prioridade é **a hora de chegada** (quem chegou antes sai antes); a pilha é a mesma coisa com a hora **invertida** (quem chegou por último sai antes). A fila de prioridade generaliza as duas.
      `),
    ],
    explicacao: [
      md(`
        ### O contrato
        Fila de prioridade é um {{tipo abstrato de dados|abstract data type}}: ela define **o que** dá para fazer, não **como** é feito por dentro. As operações:

        - **inserir** um item com sua prioridade;
        - **espiar** o mais prioritário sem retirá-lo (*peek*);
        - **retirar** o mais prioritário (*pop*);
        - saber o **tamanho** (ou se está vazia).

        Convenção do Python: **a menor chave sai primeiro**, como a senha 1 antes da senha 2. Quer "maior primeiro"? Troque o sinal da chave.

        ### Três implementações, três custos
      `),
      {
        type: 'table',
        head: ['Implementação', 'Inserir', 'Espiar o mínimo', 'Retirar o mínimo', 'n inserções + n retiradas'],
        rows: [
          ['Lista desordenada (`append`; `min` + `remove`)', 'O(1) amortizado', 'O(n)', 'O(n)', 'O(n²)'],
          ['Lista sempre ordenada, com o menor no fim', 'O(n): achar a posição é O(log n), mas abrir espaço desloca elementos', 'O(1)', 'O(1) com `pop()`', 'O(n²)'],
          ['Heap binário (módulo `heapq`)', 'O(log n)', 'O(1)', 'O(log n)', 'O(n log n)'],
        ],
        caption: 'O(log n) cresce como o número de vezes que dá para dividir n ao meio: para 1 milhão, cerca de 20. Com n = 1 milhão, n² = 10¹² passos contra n log n ≈ 2 × 10⁷, cerca de 50 mil vezes menos trabalho.',
      },
      tip('Se **todos** os itens chegam antes da primeira retirada, você nem precisa de fila de prioridade: ordene uma vez (O(n log n)) e percorra. Ela brilha quando inserções e retiradas se **intercalam**, como no pronto-socorro, em que pacientes chegam enquanto outros são chamados.'),
      md(`
        ### O heap, visto de fora
        Um {{heap mínimo|min-heap}} é uma lista organizada de um jeito especial: \`h[0]\` é **sempre** o menor elemento, e cada inserção ou retirada reorganiza só cerca de log n posições. O módulo \`heapq\` mantém essa organização dentro de uma \`list\` comum:

        - \`heapq.heappush(h, x)\`: insere. O(log n).
        - \`heapq.heappop(h)\`: retira e devolve o menor. O(log n).
        - \`h[0]\`: espia o menor sem retirar. O(1).
        - \`heapq.heapify(xs)\`: {{transforma em heap|heapify}} uma lista que já existe, no lugar, em O(n).

        \`heappush\` e \`heappop\` trabalham com heap mínimo. Para um {{heap máximo|max-heap}}, em que o maior sai primeiro, o truque clássico, que funciona em qualquer versão do Python, é guardar a chave com o sinal trocado (\`-valor\`) e destrocar ao retirar. Como o heap consegue esses custos por dentro (uma árvore guardada em um array) é assunto do módulo Árvores e heaps; aqui, use-o como ferramenta.
      `),
      warn('Com `h = [5, 1, 8, 3, 2]`, depois de `heapq.heapify(h)` a lista fica `[1, 2, 8, 3, 5]` (o `heapify` muda a própria lista e devolve `None`): só `h[0]` tem posição garantida. Imprimir o heap ou percorrê-lo com `for` **não** mostra a ordem de prioridade; para isso, chame `heappop` repetidamente. E insira sempre com `heappush`: um `append` comum pode quebrar a organização.', 'Um heap não é uma lista ordenada'),
      md(`
        ### Empates e itens que não se comparam
        O \`heapq\` compara os próprios elementos. Com tuplas, compara o primeiro campo; se empatar, o segundo; e assim por diante. Guardar \`(prioridade, item)\` traz dois problemas:

        1. Num empate de prioridade, quem decide é o **item**. Com nomes, vale a ordem alfabética, não a de chegada, e a fila deixa de ser justa.
        2. Se o item for um \`dict\` (ou outro objeto sem \`<\`), o empate quebra o programa: \`TypeError: '<' not supported between instances of 'dict' and 'dict'\`.

        A solução, recomendada na própria documentação do \`heapq\`, é pôr um {{critério de desempate|tie-breaker}} no meio: \`(prioridade, contador, item)\`, com um contador que só cresce. Como dois contadores nunca são iguais, o item nunca chega a ser comparado, e entre prioridades iguais sai primeiro quem chegou primeiro: a fila fica {{estável|stable}}.
      `),
      deep(`
        - **Mudar a prioridade** de quem já está na fila: o \`heapq\` não tem essa operação. A técnica comum é inserir de novo com a prioridade nova e, ao retirar, ignorar as entradas desatualizadas. Isso se chama {{remoção preguiçosa|lazy deletion}}, e é o que o algoritmo de Dijkstra com \`heapq\` faz.
        - **\`queue.PriorityQueue\`** embrulha o \`heapq\` com travas para programas com várias threads. Num algoritmo de uma thread só, use \`heapq\` direto: é mais simples e mais rápido.
        - **Os k menores ou maiores** de uma coleção (o problema dos {{k maiores|top-k}}): \`heapq.nsmallest(k, xs)\` e \`heapq.nlargest(k, xs)\`. No desafio você vai implementar a ideia que está por trás deles.
      `, 'Para ir além'),
    ],
    exemplo: [
      md('Pronto-socorro com prioridades 1 (vermelho), 2 (laranja), 3 (amarelo), 4 (verde) e 5 (azul). Cada paciente entra no heap como `(prioridade, ordem de chegada, nome)`. A coluna "Esperando" mostra a ordem em que eles **sairiam**, não a lista interna do heap.'),
      {
        type: 'table',
        head: ['Hora', 'Evento', 'Entra no heap', 'Esperando (do primeiro ao último a sair)', 'Chamado'],
        rows: [
          ['08:00', 'chega Ana (verde)', '`(4, 0, "Ana")`', 'Ana', '—'],
          ['08:02', 'chega Bruno (amarelo)', '`(3, 1, "Bruno")`', 'Bruno, Ana', '—'],
          ['08:05', 'chega Carla (verde)', '`(4, 2, "Carla")`', 'Bruno, Ana, Carla', '—'],
          ['08:06', 'médico chama', '—', 'Ana, Carla', 'Bruno'],
          ['08:07', 'chega Davi (vermelho)', '`(1, 3, "Davi")`', 'Davi, Ana, Carla', '—'],
          ['08:08', 'médico chama', '—', 'Ana, Carla', 'Davi'],
          ['08:09', 'médico chama', '—', 'Carla', 'Ana (empata com Carla na cor, mas chegou antes: 0 < 2)'],
          ['08:10', 'médico chama', '—', '(ninguém)', 'Carla'],
        ],
        caption: 'Ordem de atendimento: Bruno, Davi, Ana, Carla. Por ordem de chegada (FIFO) seria Ana, Bruno, Carla, Davi: o caso mais grave seria o último a ser chamado.',
      },
      md('Repare que Davi chegou depois de Bruno ser chamado: a fila de prioridade não interrompe quem já está sendo atendido, só decide **quem é o próximo**.'),
    ],
    codigo: [
      py(`
        import heapq
        from itertools import count

        CORES = {"vermelho": 1, "laranja": 2, "amarelo": 3, "verde": 4, "azul": 5}

        fila = []
        chegada = count()      # next(chegada) devolve 0, 1, 2, ... (desempate)

        def chega(nome, cor):
            heapq.heappush(fila, (CORES[cor], next(chegada), nome))

        def chama():
            _, _, nome = heapq.heappop(fila)
            return nome

        chega("Ana", "verde")
        chega("Bruno", "amarelo")
        chega("Carla", "verde")
        print("chamado:", chama())
        chega("Davi", "vermelho")
        print("lista interna:", fila)        # repare: Carla aparece antes de Ana
        print("próximo, sem tirar:", fila[0][2])
        while fila:
            print("chamado:", chama())         # mas Ana sai antes de Carla
      `, { caption: 'A lista interna não está ordenada; só os heappop sucessivos saem em ordem de prioridade.' }),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e3-fp-1',
          kind: 'predict',
          lang: 'python',
          prompt: 'O que é impresso?',
          difficulty: 'facil',
          skills: ['ed-pilhas-filas'],
          hints: [
            '`heappop` não olha a ordem em que os números entraram. O que ele devolve?',
            'Depois dos dois primeiros `heappop`, quais números sobram? E quando o 2 entra, quem passa a ser o menor?',
          ],
          explanation: 'Os dois primeiros `heappop` tiram 1 e 3, os menores entre 5, 1, 8 e 3. Sobram 5 e 8; o 2 entra e, por ser o menor, é o próximo a sair. Restam 5 e 8, então `len(h)` é 2.',
          code: dedent(`
            import heapq

            h = []
            for x in [5, 1, 8, 3]:
                heapq.heappush(h, x)
            print(heapq.heappop(h), heapq.heappop(h))
            heapq.heappush(h, 2)
            print(heapq.heappop(h), len(h))
          `),
          answer: '1 3\n2 2',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e3-fp-2',
          kind: 'mcq',
          prompt: 'Depois de `heapq.heapify(h)`, qual afirmação vale para **qualquer** lista `h` não vazia, e não só para um exemplo?',
          difficulty: 'intermediario',
          skills: ['ed-pilhas-filas'],
          hints: [
            '"Qualquer lista" quer dizer: a afirmação não pode depender da entrada. Do que o `heappop` precisa para devolver o menor sem procurar na lista inteira?',
            'Imagine duas arrumações diferentes dos mesmos números que fossem heaps válidos. O que as duas teriam obrigatoriamente em comum?',
          ],
          explanation: 'Um min-heap garante só que cada elemento é menor ou igual aos seus "filhos" (as posições 2i + 1 e 2i + 2). Disso resulta que `h[0]` é o mínimo, mas o resto não precisa estar ordenado. Essa garantia fraca é justamente o que permite inserir e retirar em O(log n), sem pagar o custo de manter tudo ordenado.',
          options: [
            { text: '`h[0]` é o menor elemento', correct: true, feedback: 'Isso: é a única posição com garantia. Para os seguintes em ordem, chame `heappop` repetidamente.' },
            { text: '`h` fica em ordem crescente', feedback: 'Não necessariamente: o heap é só parcialmente ordenado. `[5, 1, 8, 3, 2]`, por exemplo, vira `[1, 2, 8, 3, 5]`. Ordenar custaria O(n log n); o `heapify` custa O(n) justamente porque não ordena.' },
            { text: '`h[-1]` é o maior elemento', feedback: 'O maior não tem posição fixa: `[5, 1, 8, 3, 2]` vira `[1, 2, 8, 3, 5]`, com o 8 em `h[2]`. Um min-heap não dá acesso rápido ao maior.' },
            { text: '`h[1]` é o segundo menor', feedback: 'Às vezes acontece (em `[1, 2, 8, 3, 5]`, `h[1]` é 2), mas não é garantido: o segundo menor pode estar em `h[1]` ou em `h[2]`. `heapify([1, 5, 2])`, por exemplo, deixa a lista como está, com o 2 em `h[2]`.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e3-fp-3',
          kind: 'mcq',
          prompt: 'Um sistema de entregas recebe n = 100 000 pedidos e, intercalado com as chegadas, sempre despacha o mais urgente. A primeira versão guarda os pedidos numa lista comum e, a cada despacho, faz `p = min(fila)` e `fila.remove(p)`. Qual o custo total, no pior caso, das n inserções e n despachos, com a lista e com `heapq`?',
          difficulty: 'intermediario',
          skills: ['ed-pilhas-filas', 'ed-arrays'],
          hints: [
            'Quanto custa um único `min(fila)` numa lista com n itens? E um `remove`?',
            'Quantas vezes isso acontece? E quanto custa cada `heappop` no lugar disso?',
          ],
          explanation: 'Cada `min` e cada `remove` percorrem a lista: O(n) por despacho, O(n²) no total. Com heap, cada operação é O(log n), O(n log n) no total. Para n = 100 000, isso é 10¹⁰ contra cerca de 1,7 × 10⁶ passos: milhares de vezes menos trabalho.',
          options: [
            { text: 'Lista: O(n²). heapq: O(n log n)', correct: true, feedback: 'Isso: n varreduras de O(n) contra n operações de O(log n).' },
            { text: 'Lista: O(n). heapq: O(n)', feedback: 'O `append` é O(1), mas `min` e `remove` percorrem a lista inteira a cada despacho, e são n despachos.' },
            { text: 'O(n log n) nas duas', feedback: 'O(n log n) é o custo de ordenar uma vez. Aqui ninguém ordena: a lista inteira é varrida a cada despacho.' },
            { text: 'O(n²) nas duas, porque o heappop também precisa procurar o menor', feedback: 'O heap mantém o menor em `h[0]`: achá-lo é O(1), e reorganizar depois de retirar custa só O(log n), não uma varredura.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e3-fp-4',
          kind: 'fill',
          lang: 'python',
          prompt: '`heappush` e `heappop` trabalham com heap **mínimo**. Complete para que o Pix de **maior** valor saia primeiro e para que o valor seja impresso positivo (a saída deve ser `caio 980`).',
          difficulty: 'intermediario',
          skills: ['ed-pilhas-filas'],
          hints: [
            'Se o heap sempre devolve o menor, que transformação faz o maior valor virar o menor número?',
            'A chave que sai do heap ainda está transformada. Como desfazer a transformação na hora de imprimir?',
          ],
          explanation: 'Trocar o sinal inverte a ordem: 980 vira -980, o menor de todos, e sai primeiro. Ao retirar, troca-se o sinal de novo para recuperar o valor. É o jeito padrão de fazer um max-heap com `heapq`.',
          template: dedent(`
            import heapq

            pix = [("ana", 120), ("caio", 980), ("bia", 610)]
            h = []
            for nome, valor in pix:
                heapq.heappush(h, (___, nome))

            chave, nome = heapq.heappop(h)
            print(nome, ___)
          `),
          blanks: [
            ['-valor', '- valor', '(-valor)', '-(valor)', '-1 * valor', '-1*valor', '(-1) * valor', 'valor * -1', 'valor*-1', 'valor * (-1)', '0 - valor', '0-valor'],
            ['-chave', '- chave', '(-chave)', '-(chave)', '-1 * chave', '-1*chave', '(-1) * chave', 'chave * -1', 'chave*-1', 'chave * (-1)', '0 - chave', '0-chave', 'abs(chave)'],
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e3-fp-5',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `atender(eventos)` para o pronto-socorro. Cada evento é uma tupla `(nome, cor)` (alguém chegou) ou a string `"proximo"` (o médico chama o próximo). Da mais à menos urgente, as cores são: vermelho, laranja, amarelo, verde, azul. Devolva a lista de nomes na ordem em que foram chamados; se o médico chamar com a sala vazia, registre `None`. Entre pacientes da mesma cor, quem chegou antes é chamado antes. Use `heapq`: um dos testes tem dezenas de milhares de eventos.',
          difficulty: 'intermediario',
          skills: ['ed-pilhas-filas'],
          hints: [
            'Que tupla cada paciente deve virar ao entrar no heap para que o próprio `heappop` já devolva o paciente certo, sem comparação extra na hora de chamar?',
            'Só a cor no primeiro campo não basta: num empate, o heap compararia o quê? Que informação faria o primeiro a chegar ganhar?',
            'Ao ver `"proximo"`, o que fazer quando o heap está vazio?',
          ],
          explanation: 'Cada chegada vira `(urgência, ordem de chegada, nome)`: o heap ordena pela urgência e, no empate, pela ordem de chegada, que nunca se repete, então o nome nunca chega a ser comparado. Cada evento custa O(log n), O(n log n) no total. Com `min` + `remove` numa lista, cada chamada custaria O(n).',
          starter: dedent(`
            import heapq

            URGENCIA = {"vermelho": 1, "laranja": 2, "amarelo": 3, "verde": 4, "azul": 5}

            def atender(eventos):
                # chegadas entram na fila de prioridade; "proximo" retira
                # o mais urgente (ou registra None se não houver ninguém)
                chamados = []
                return chamados
          `),
          solution: dedent(`
            import heapq

            URGENCIA = {"vermelho": 1, "laranja": 2, "amarelo": 3, "verde": 4, "azul": 5}

            def atender(eventos):
                fila = []
                chamados = []
                ordem = 0
                for ev in eventos:
                    if ev == "proximo":
                        if fila:
                            _, _, nome = heapq.heappop(fila)
                            chamados.append(nome)
                        else:
                            chamados.append(None)
                    else:
                        nome, cor = ev
                        heapq.heappush(fila, (URGENCIA[cor], ordem, nome))
                        ordem += 1
                return chamados
          `),
          tests: [
            {
              name: 'exemplo da lição',
              code: dedent(`
                ev = [("Ana", "verde"), ("Bruno", "amarelo"), ("Carla", "verde"), "proximo",
                      ("Davi", "vermelho"), "proximo", "proximo", "proximo"]
                r = atender(ev)
                assert r == ["Bruno", "Davi", "Ana", "Carla"], f"esperado ['Bruno', 'Davi', 'Ana', 'Carla'], veio {r}"
              `),
            },
            {
              name: 'mesma cor: vale a ordem de chegada, não a alfabética',
              code: dedent(`
                r = atender([("Zeca", "azul"), ("Ana", "azul"), ("Mel", "azul"), "proximo", "proximo", "proximo"])
                assert r == ["Zeca", "Ana", "Mel"], f"mesma cor deve sair por ordem de chegada (Zeca, Ana, Mel); veio {r}"
              `),
            },
            {
              name: 'mesma cor com chamadas no meio: continua valendo a ordem de chegada',
              code: dedent(`
                ev = [("Ana", "amarelo"), ("Bia", "amarelo"), ("Zeca", "verde"), "proximo", "proximo",
                      ("Caio", "verde"), ("Duda", "verde"), "proximo", "proximo", "proximo"]
                r = atender(ev)
                assert r == ["Ana", "Bia", "Zeca", "Caio", "Duda"], f"Zeca (verde) chegou antes de Caio e Duda e deve sair antes deles; veio {r}. O desempate de quem chega depois pode ficar menor que o de quem chegou antes?"
              `),
            },
            {
              name: 'todas as cores na ordem de urgência',
              code: dedent(`
                ev = [("e", "azul"), ("d", "verde"), ("c", "amarelo"), ("b", "laranja"), ("a", "vermelho")] + ["proximo"] * 5
                r = atender(ev)
                assert r == ["a", "b", "c", "d", "e"], f"esperado vermelho, laranja, amarelo, verde, azul (a, b, c, d, e); veio {r}"
              `),
            },
            {
              name: 'sala vazia e quem chega depois',
              code: dedent(`
                assert atender([]) == [], "sem eventos, ninguém é chamado"
                r = atender(["proximo", ("Ana", "verde"), "proximo", "proximo"])
                assert r == [None, "Ana", None], f"esperado [None, 'Ana', None]; veio {r}"
                r = atender([("Lia", "azul"), "proximo", ("Rui", "vermelho"), ("Bia", "laranja"), "proximo", "proximo"])
                assert r == ["Lia", "Rui", "Bia"], f"esperado ['Lia', 'Rui', 'Bia']; veio {r}"
              `),
            },
            {
              name: 'cada chamada de atender começa com a sala vazia',
              code: dedent(`
                atender([("Ana", "vermelho"), ("Bia", "azul")])
                r = atender(["proximo"])
                assert r == [None], f"Ana e Bia ficaram esperando numa chamada anterior de atender e reapareceram nesta ({r}). A fila precisa ser criada dentro da função, a cada chamada"
              `),
            },
            {
              name: 'usa heapq',
              code: 'assert "heappush" in _source or "heapify" in _source, "use heapq.heappush e heapq.heappop: esse é o objetivo do exercício"',
            },
            {
              name: 'eficiente com muitos pacientes',
              code: dedent(`
                import time
                cores = ["azul", "verde", "amarelo", "laranja", "vermelho"]
                ev = [(f"p{i}", cores[i % 5]) for i in range(20000)] + ["proximo"] * 3000
                t0 = time.perf_counter()
                r = atender(ev)
                dt = time.perf_counter() - t0
                assert r[:2] == ["p4", "p9"] and r[-1] == "p14999" and len(r) == 3000, "ordem errada no teste grande"
                assert dt < 0.5, f"levou {dt:.2f}s: cada chamada deve custar O(log n), não percorrer a fila inteira"
              `),
            },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e3-fp-desafio',
          kind: 'code',
          lang: 'python',
          prompt: 'Um banco quer, ao fim do dia, os `k` Pix de **maior valor** entre milhões que chegam um a um, como um {{fluxo de dados|data stream}}. Guardar tudo para ordenar depois gasta memória demais. Escreva `k_maiores(fluxo, k)` que percorre o fluxo **uma única vez**, com `for` (ele pode ser um iterador, que não tem `len` nem volta ao começo), guarda **no máximo k valores** ao mesmo tempo e devolve os k maiores em ordem **decrescente**. Se houver menos de k valores, devolva todos, também em ordem decrescente. Cada valor do fluxo deve custar no máximo O(log k): um dos testes conta as comparações. Não use `sorted`, `.sort`, `nlargest` nem `nsmallest`.',
          difficulty: 'avancado',
          skills: ['ed-pilhas-filas'],
          hints: [
            'Imagine um "clube dos k maiores" com lotação k. Quando chega um valor novo e o clube está cheio, com qual membro ele precisa se comparar para decidir se entra?',
            'Esse membro de referência é o menor do clube. Que tipo de heap deixa o menor sempre à mão, em `h[0]`?',
            'No fim, o heap tem os k maiores, mas em ordem de heap. Que operação repetida os tira em ordem crescente? Como chegar à decrescente? E o que acontece com `h[0]` quando k é 0?',
          ],
          explanation: 'O truque contraintuitivo: para guardar os k **maiores**, use um heap **mínimo** de tamanho k. A raiz é o porteiro do clube, o menor dos k melhores até agora; um valor novo só entra se for maior que ela, e entra no lugar dela (`heapq.heapreplace` ou `heappushpop`). Cada passo custa O(log k): o total é O(n log k) em tempo e O(k) em memória, contra O(n) de memória para guardar tudo. Com k = 10 e n = 10 milhões, é a diferença entre guardar 10 números e guardar 10 milhões.',
          starter: dedent(`
            import heapq

            def k_maiores(fluxo, k):
                # percorra o fluxo uma vez, guardando no máximo k valores num heap
                pass
          `),
          solution: dedent(`
            import heapq

            def k_maiores(fluxo, k):
                if k <= 0:
                    return []
                h = []
                for x in fluxo:
                    if len(h) < k:
                        heapq.heappush(h, x)
                    elif x > h[0]:
                        heapq.heapreplace(h, x)
                resultado = []
                while h:
                    resultado.append(heapq.heappop(h))
                resultado.reverse()
                return resultado
          `),
          tests: [
            {
              name: 'exemplo',
              code: dedent(`
                r = k_maiores(iter([120, 15, 980, 40, 610, 75]), 3)
                assert r == [980, 610, 120], f"esperado [980, 610, 120]; veio {r}"
              `),
            },
            {
              name: 'menos de k valores, fluxo vazio e k = 0',
              code: dedent(`
                r = k_maiores(iter([3, 1]), 5)
                assert r == [3, 1], f"com menos de k valores, devolva todos em ordem decrescente; veio {r}"
                assert k_maiores(iter([]), 3) == [], "fluxo vazio deve dar []"
                assert k_maiores(iter([1, 2, 3]), 0) == [], "k = 0 deve dar []"
              `),
            },
            {
              name: 'repetidos e negativos',
              code: dedent(`
                r = k_maiores(iter([5, -2, 5, 7, -9, 5]), 4)
                assert r == [7, 5, 5, 5], f"esperado [7, 5, 5, 5] (repetidos contam); veio {r}"
                r = k_maiores(iter([-5, -1, -3]), 2)
                assert r == [-1, -3], f"esperado [-1, -3]; veio {r}"
              `),
            },
            {
              name: 'confere com a resposta certa em 300 casos aleatórios',
              code: dedent(`
                import random
                rng = random.Random(7)
                for _ in range(300):
                    xs = [rng.randint(-50, 50) for _ in range(rng.randint(0, 30))]
                    k = rng.randint(0, 12)
                    esperado = sorted(xs, reverse=True)[:k]
                    r = k_maiores(iter(xs), k)
                    assert r == esperado, f"k_maiores({xs}, {k}) devolveu {r}; esperado {esperado}"
              `),
            },
            {
              name: 'sem atalhos',
              code: dedent(`
                for proibido in ["sorted(", ".sort(", "nlargest", "nsmallest"]:
                    assert proibido not in _source, f"não use {proibido.strip('(.')}: o objetivo é manter um heap de tamanho k"
              `),
            },
            {
              name: 'memória O(k): não guarda o fluxo inteiro',
              code: dedent(`
                try:
                    import tracemalloc
                    tracemalloc.start()
                    medir = True
                except Exception:
                    medir = False
                r = k_maiores((x * 7919 % 100003 for x in range(50000)), 5)
                if medir:
                    _, pico = tracemalloc.get_traced_memory()
                    tracemalloc.stop()
                    assert pico < 50000, f"pico de {pico} bytes: parece que o fluxo inteiro foi guardado; mantenha só k valores"
                assert r == [100001, 99999, 99997, 99995, 99993], f"resultado errado no fluxo grande: {r}"
              `),
            },
            {
              name: 'O(log k) por valor: conta as comparações',
              code: dedent(`
                class _Demais(BaseException):
                    pass

                class _V(int):
                    comparacoes = 0
                    def _conta(self):
                        _V.comparacoes += 1
                        if _V.comparacoes > 300000:
                            raise _Demais()
                    def __lt__(self, o): self._conta(); return int.__lt__(self, o)
                    def __le__(self, o): self._conta(); return int.__le__(self, o)
                    def __gt__(self, o): self._conta(); return int.__gt__(self, o)
                    def __ge__(self, o): self._conta(); return int.__ge__(self, o)

                n, k = 5000, 500
                try:
                    r = k_maiores((_V(x) for x in range(n)), k)  # crescente: todo valor novo entra no grupo
                except _Demais:
                    r = None
                assert r is not None, f"com n = {n} e k = {k}, sua função passou de 300 000 comparações entre valores (a versão com heap faz cerca de 50 000). Achar o menor do grupo não pode exigir percorrer os k valores"
                assert r == list(range(n - 1, n - k - 1, -1)), "resultado errado num fluxo crescente de 5 000 valores com k = 500"
              `),
            },
          ],
        },
      },
    ],
    projeto: [
      md('**Lista de tarefas com urgência.** No Projeto 2 cada tarefa tem prioridade. Acrescente o comando `proxima`, que mostra a tarefa mais urgente usando `heapq` com desempate pela ordem de criação. Depois responda no README: no seu programa, inserções e retiradas se intercalam a ponto de o heap valer a pena, ou bastaria ordenar a lista na hora de exibir?'),
      { type: 'project', projectId: 'p2-todo' },
    ],
    revisao: [
      md(`
        - Fila de prioridade: sai o mais prioritário, não o mais antigo. Fila (FIFO) e pilha (LIFO) são casos particulares, com prioridade = hora de chegada, normal ou invertida.
        - Lista desordenada: inserir O(1), retirar O(n). Lista ordenada: inserir O(n), retirar O(1). Heap: O(log n) nos dois. Com operações intercaladas, o heap vence: O(n log n) contra O(n²).
        - \`heapq\`: \`heappush\`, \`heappop\`, \`h[0]\` para espiar, \`heapify\` em O(n). O menor sai primeiro; o resto da lista não está ordenado.
        - Use \`(prioridade, contador, item)\`: desempate estável e nenhum item comparado.
        - Maior primeiro: troque o sinal da chave. Os k maiores de um fluxo: heap **mínimo** de tamanho k.
      `),
      english(`
        **Vocabulary**: *priority queue*, *abstract data type (ADT)*, *min-heap / max-heap*, *heapify*, *peek*, *tie-breaker*, *stable*, *lazy deletion*, *top-k*, *data stream*.

        From the Python docs (module heapq): *"This module provides an implementation of the heap queue algorithm, also known as the priority queue algorithm."*

        Typical interview prompt: "Given a stream of numbers, how would you keep track of the k largest ones? What are the time and space complexities?"
      `),
    ],
  },
  review: [
    ['O que uma fila de prioridade devolve quando você retira um item?', 'O mais prioritário (em Python, o de menor chave), não o mais antigo.'],
    ['Quanto custam heappush e heappop num heap com n itens? E espiar o menor?', 'O(log n) cada um; espiar `h[0]` é O(1).'],
    ['Depois de heapify, que posição da lista tem garantia?', 'Só `h[0]`, que é o menor. O resto não está ordenado.'],
    ['Por que guardar (prioridade, contador, item) em vez de (prioridade, item)?', 'O contador desempata pela ordem de chegada (fila estável) e impede que itens sem `<`, como dicts, sejam comparados.'],
    ['Como fazer "maior primeiro" com heapq?', 'Inserir a chave com o sinal trocado (-valor) e trocar de novo ao retirar.'],
    ['Para manter os k maiores de um fluxo, que heap usar e de que tamanho?', 'Um heap mínimo de tamanho k: a raiz é o menor dos k maiores e decide quem entra.'],
    ['Uma fila comum (FIFO) é uma fila de prioridade em que a prioridade é…?', 'A hora de chegada: quem chegou antes sai antes.'],
    ['Quando não vale a pena usar fila de prioridade?', 'Quando todos os itens chegam antes da primeira retirada: basta ordenar uma vez.'],
  ],
  references: ['clrs', 'sedgewick-algs', 'python-docs'],
});

export const lessons: Lesson[] = [expressoesRpn, filasPrioridade];
