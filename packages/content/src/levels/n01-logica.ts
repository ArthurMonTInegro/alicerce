import type { Level } from '../types.ts';
import { dedent, deep, english, lesson, md, py, t, tip, trace, warn } from '../helpers.ts';

const algoritmos = lesson({
  id: 'l1-algoritmos',
  moduleId: 'm1-1',
  title: 'Algoritmos e pensamento computacional',
  titleEn: 'Algorithms and computational thinking',
  summary: 'Decomposição, padrões, abstração e algoritmos: as quatro ferramentas para resolver qualquer problema com computação.',
  minutes: 25,
  objectives: [
    'Definir algoritmo e reconhecer suas propriedades (finito, preciso, com entrada e saída)',
    'Aplicar decomposição, reconhecimento de padrões e abstração',
    'Escrever pseudocódigo para um problema simples',
  ],
  skills: ['logica-algoritmos', 'logica-pseudocodigo'],
  terms: [
    t('algoritmo', 'algorithm', 'Sequência finita e precisa de passos que resolve um problema.'),
    t('pseudocódigo', 'pseudocode', 'Descrição de um algoritmo em linguagem estruturada, sem regras rígidas de sintaxe.'),
    t('decomposição', 'decomposition', 'Dividir um problema grande em partes menores.'),
    t('abstração', 'abstraction', 'Ignorar detalhes irrelevantes para focar no essencial.'),
    t('passo', 'step', 'Uma ação individual de um algoritmo.'),
  ],
  stages: {
    conceito: [
      md(`Um **{{algoritmo|algorithm}}** é uma sequência **finita** de passos **precisos** que transforma uma **entrada** em uma **saída**. Receitas, instruções de montagem e o caminho do GPS são algoritmos. Programar é escrever algoritmos em uma linguagem que o computador executa.`),
    ],
    explicacao: [
      md(`
        Um bom algoritmo é:

        - **Finito**: termina depois de um número finito de passos.
        - **Preciso** (não ambíguo): cada passo tem um único significado. "Adicione sal a gosto" não é preciso; "adicione 5 g de sal" é.
        - **Efetivo**: cada passo pode ser realmente executado.
        - Tem **entrada** e **saída** bem definidas.

        O **pensamento computacional** reúne quatro hábitos para chegar a um algoritmo:

        1. **{{Decomposição|decomposition}}**: quebrar o problema em subproblemas.
        2. **Reconhecimento de padrões**: perceber o que se repete ("para cada aluno, faça...").
        3. **{{Abstração|abstraction}}**: descartar o que não importa (a cor da camisa do aluno não importa para a média).
        4. **Algoritmo**: escrever os passos.
      `),
      deep('George Pólya, em *How to Solve It* (1945), propôs quatro fases que continuam valendo para programação: **entender o problema**, **criar um plano**, **executar o plano** e **revisar**. A maioria dos erros de iniciantes vem de pular a primeira fase e começar a digitar código.', 'Pólya: como resolver problemas'),
    ],
    exemplo: [
      md(`
        **Problema**: descobrir o maior número de uma lista de notas.

        *Entender*: entrada = lista de números (não vazia); saída = o maior deles.
        *Padrão*: comparar cada número com "o maior até agora".

        Pseudocódigo:
      `),
      { type: 'code', lang: 'text', code: dedent(`
        maior ← primeiro número da lista
        para cada número n da lista:
            se n > maior:
                maior ← n
        devolva maior
      `) },
      md('Repare: não importa se são 3 ou 3 milhões de notas — o mesmo algoritmo funciona. Essa é a força da **generalização**.'),
    ],
    codigo: [
      md('O mesmo algoritmo em Python. Use o botão **Passo a passo** para ver o valor de `maior` mudar a cada volta:'),
      trace(`
        notas = [7, 4, 9, 6]
        maior = notas[0]
        for n in notas:
            if n > maior:
                maior = n
        print(maior)
      `),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e1-alg-1',
          kind: 'mcq',
          prompt: 'Qual destas instruções **não** serve como passo de algoritmo para um computador?',
          difficulty: 'facil',
          skills: ['logica-algoritmos'],
          hints: ['Um passo precisa ter um único significado possível.'],
          explanation: '"Mexa até ficar bom" é ambíguo: o que é "bom"? Algoritmos exigem precisão.',
          options: [
            { text: 'Some 1 ao contador', feedback: 'Preciso e executável.' },
            { text: 'Mexa até ficar bom', correct: true, feedback: 'Isso: "bom" é ambíguo, não dá para executar de forma determinística.' },
            { text: 'Se x for maior que 10, imprima "grande"', feedback: 'Preciso: a condição é clara.' },
            { text: 'Repita 5 vezes: imprima "oi"', feedback: 'Preciso e finito.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e1-alg-2',
          kind: 'parsons',
          lang: 'text',
          prompt: 'Ordene o pseudocódigo que calcula a **soma** de uma lista.',
          difficulty: 'facil',
          skills: ['logica-pseudocodigo'],
          hints: ['Antes de somar, a soma precisa começar com algum valor.', 'O "devolva" vem depois de percorrer tudo.'],
          explanation: 'Inicializar o acumulador, percorrer somando, devolver no final: é o padrão **acumulador** (*accumulator*).',
          lines: ['soma ← 0', 'para cada número n da lista:', '    soma ← soma + n', 'devolva soma'],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e1-alg-desafio',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `menor(lista)` que devolve o **menor** número de uma lista não vazia, **sem** usar `min()`. Adapte o algoritmo do exemplo.',
          difficulty: 'intermediario',
          skills: ['logica-algoritmos'],
          hints: ['O que muda em relação ao algoritmo do "maior"?', 'Comece com o primeiro elemento e troque o sinal da comparação.'],
          explanation: 'Basta inverter a comparação. Reaproveitar um algoritmo conhecido mudando um detalhe é **reconhecimento de padrões** em ação.',
          starter: dedent(`
            def menor(lista):
                pass
          `),
          solution: dedent(`
            def menor(lista):
                m = lista[0]
                for x in lista:
                    if x < m:
                        m = x
                return m
          `),
          tests: [
            { name: 'menor([7, 4, 9, 6]) == 4', code: 'assert menor([7, 4, 9, 6]) == 4' },
            { name: 'um elemento', code: 'assert menor([3]) == 3' },
            { name: 'negativos', code: 'assert menor([-1, -8, 2]) == -8' },
            { name: 'menor no fim', code: 'assert menor([5, 5, 1]) == 1' },
          ],
        },
      },
    ],
    projeto: [
      md('**Algoritmo do cotidiano**: escreva o pseudocódigo de uma tarefa real (separar o lixo reciclável, decidir que ônibus pegar, fazer café). Depois troque com alguém e peça para executar *literalmente* o que está escrito. Onde a pessoa ficou em dúvida, o algoritmo estava ambíguo.'),
    ],
    revisao: [
      md(`
        - Algoritmo: finito, preciso, efetivo, com entrada e saída.
        - Pensamento computacional: decomposição, padrões, abstração, algoritmo.
        - Pólya: entender → planejar → executar → revisar.
      `),
    ],
  },
  review: [
    ['Quais propriedades um algoritmo deve ter?', 'Ser finito, preciso (não ambíguo), efetivo e ter entrada e saída definidas.'],
    ['O que é decomposição?', 'Dividir um problema grande em subproblemas menores e mais fáceis.'],
    ['Quais são as quatro fases de Pólya?', 'Entender o problema, criar um plano, executar o plano, revisar.'],
  ],
  references: ['cs50', 'polya', 'mit-6100l', 'cs2023'],
});

const variaveis = lesson({
  id: 'l1-variaveis',
  moduleId: 'm1-2',
  title: 'Variáveis e atribuição',
  titleEn: 'Variables and assignment',
  summary: 'O que é uma variável de verdade (um nome que aponta para um valor) e como a atribuição funciona.',
  minutes: 25,
  objectives: [
    'Criar variáveis e entender a atribuição como "o nome passa a apontar para o valor"',
    'Prever o valor de variáveis após uma sequência de atribuições',
    'Escolher bons nomes de variáveis',
  ],
  skills: ['logica-variaveis'],
  terms: [
    t('variável', 'variable', 'Nome associado a um valor guardado na memória.'),
    t('atribuição', 'assignment', 'Operação que associa um valor a um nome: x = 5.'),
    t('valor', 'value', 'Um dado concreto: 5, "oi", True.'),
    t('constante', 'constant', 'Valor que não deve mudar; em Python, por convenção, nome em MAIÚSCULAS.'),
    t('identificador', 'identifier', 'O nome usado para uma variável, função etc.'),
  ],
  stages: {
    conceito: [
      md('Uma **{{variável|variable}}** é um **nome** que se refere a um **valor**. Em `idade = 17`, o nome `idade` passa a se referir ao valor `17`. O sinal `=` **não** é igualdade matemática: é **{{atribuição|assignment}}** — "faça este nome apontar para este valor".'),
    ],
    explicacao: [
      md(`
        A atribuição sempre funciona assim: **primeiro** o computador calcula o lado direito, **depois** associa o resultado ao nome da esquerda.

        Por isso \`x = x + 1\` faz sentido em programação (e não em matemática): pega o valor atual de \`x\`, soma 1 e faz \`x\` apontar para o novo valor.

        **Regras de nomes em Python**: letras, números e \`_\`; não pode começar com número; diferencia maiúsculas (\`Nome\` ≠ \`nome\`).
        **Convenções** (guia PEP 8): \`snake_case\` para variáveis (\`preco_total\`), MAIÚSCULAS para {{constantes|constants}} (\`TAXA_JUROS = 0.02\`).
      `),
      tip('Bons nomes valem mais que comentários. `t = 3600` diz pouco; `SEGUNDOS_POR_HORA = 3600` se explica sozinho.'),
      deep('Em Python, variáveis são **etiquetas** presas a objetos, não "caixas". Depois de `a = [1, 2]` e `b = a`, os dois nomes apontam para a **mesma lista**: modificar `b` modifica o que `a` vê. Isso vai importar muito no Nível 2 (listas) e é uma fonte clássica de bugs.', 'Caixas ou etiquetas?'),
    ],
    exemplo: [
      md('Trocar o valor de duas variáveis é um exercício clássico. Acompanhe passo a passo e observe a variável auxiliar:'),
      trace(`
        a = 10
        b = 20
        aux = a
        a = b
        b = aux
        print(a, b)
      `),
      md('Em Python também existe o atalho `a, b = b, a`, que faz a mesma troca.'),
    ],
    codigo: [
      py(`
        preco = 50
        quantidade = 3
        total = preco * quantidade
        print("Total:", total)

        total = total - 10      # desconto
        print("Com desconto:", total)
      `),
      english('Em mensagens de erro e em documentação: *"assign a value to a variable"* (atribuir um valor a uma variável), *"the variable is reassigned"* (a variável recebe outro valor), *"undefined variable"* (variável não definida).'),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e1-var-1',
          kind: 'predict',
          lang: 'python',
          prompt: 'O que é impresso?',
          difficulty: 'facil',
          skills: ['logica-variaveis'],
          hints: ['Execute linha por linha, anotando o valor de cada variável.', 'Depois da 3ª linha, x vale 8. E y?'],
          explanation: 'x = 5; y = x (y = 5); x = x + 3 (x = 8). Mudar x depois **não** muda y. Saída: `8 5`.',
          code: dedent(`
            x = 5
            y = x
            x = x + 3
            print(x, y)
          `),
          answer: '8 5',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e1-var-2',
          kind: 'mcq',
          prompt: 'Qual nome de variável é **inválido** em Python?',
          difficulty: 'facil',
          skills: ['logica-variaveis'],
          hints: ['Revise as regras: com o que um nome não pode começar?'],
          explanation: 'Nomes não podem começar com dígito. `2lugar` causa `SyntaxError`.',
          options: [
            { text: 'nota_final', feedback: 'Válido e no estilo snake_case recomendado.' },
            { text: '_temp', feedback: 'Válido: pode começar com _.' },
            { text: '2lugar', correct: true, feedback: 'Inválido: começa com número.' },
            { text: 'Nome', feedback: 'Válido (embora a convenção para variáveis seja minúsculas).' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e1-var-3',
          kind: 'fix',
          lang: 'python',
          prompt: 'O programa deveria trocar os valores de `a` e `b`, mas os dois terminam iguais. Corrija.',
          difficulty: 'intermediario',
          skills: ['logica-variaveis'],
          hints: ['Use o passo a passo mentalmente: depois de `a = b`, qual era o valor antigo de `a`?', 'O valor antigo de `a` se perdeu. Guarde-o antes em uma variável auxiliar (ou use `a, b = b, a`).'],
          explanation: 'Na primeira atribuição o valor original de `a` é perdido. Uma variável auxiliar (ou a atribuição múltipla `a, b = b, a`) preserva os dois valores.',
          starter: dedent(`
            a = 1
            b = 2
            a = b
            b = a
          `),
          solution: dedent(`
            a = 1
            b = 2
            aux = a
            a = b
            b = aux
          `),
          tests: [{ name: 'a == 2 e b == 1', code: 'assert (a, b) == (2, 1), f"a={a}, b={b}"' }],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e1-var-desafio',
          kind: 'code',
          lang: 'python',
          prompt: 'Sem escrever os números 1, 2 ou 3 de novo, faça uma **rotação** dos valores: depois do seu código, `a` deve valer o antigo `b`, `b` o antigo `c` e `c` o antigo `a`.',
          difficulty: 'intermediario',
          skills: ['logica-variaveis'],
          hints: ['Quantos valores você perde se fizer a = b primeiro? Quantas auxiliares precisa?', 'Uma auxiliar basta. Ou use atribuição múltipla.'],
          explanation: 'Com uma auxiliar: `aux = a; a = b; b = c; c = aux`. Com atribuição múltipla: `a, b, c = b, c, a` — o lado direito é todo calculado antes.',
          starter: dedent(`
            a = 1
            b = 2
            c = 3
            # seu código aqui
          `),
          solution: dedent(`
            a = 1
            b = 2
            c = 3
            a, b, c = b, c, a
          `),
          tests: [{ name: '(a, b, c) == (2, 3, 1)', code: 'assert (a, b, c) == (2, 3, 1), f"obtido {(a, b, c)}"' }],
        },
      },
    ],
    projeto: [
      md('**Projeto contínuo — Calculadora (parte 1)**: comece o primeiro projeto da trilha. Por enquanto, crie variáveis para dois números e imprima soma, diferença, produto e quociente.'),
      { type: 'project', projectId: 'p1-calculadora' },
    ],
    revisao: [
      md(`
        - Variável = nome que aponta para um valor.
        - \`=\` é atribuição: calcula a direita, associa à esquerda.
        - Nomes: snake_case; constantes em MAIÚSCULAS; nunca começar com número.
      `),
    ],
  },
  review: [
    ['O que acontece em `x = x + 1`?', 'Calcula-se o valor atual de x mais 1, e x passa a apontar para o novo valor.'],
    ['Depois de `y = x` e `x = 10`, y muda?', 'Não (para números): y continua com o valor antigo de x.'],
    ['Como trocar a e b em Python numa linha?', '`a, b = b, a`'],
  ],
  references: ['python-tutorial', 'pep8', 'cs61a', 'python-tutor'],
});

const tipos = lesson({
  id: 'l1-tipos-operadores',
  moduleId: 'm1-2',
  title: 'Tipos de dados e operadores',
  titleEn: 'Data types and operators',
  summary: 'int, float, str e bool; operadores aritméticos, de comparação e lógicos; precedência.',
  minutes: 30,
  objectives: [
    'Identificar os tipos int, float, str e bool',
    'Usar operadores aritméticos (+ - * / // % **) e de comparação',
    'Combinar condições com and, or e not',
    'Converter entre tipos com int(), float(), str()',
  ],
  skills: ['logica-tipos', 'logica-operadores'],
  terms: [
    t('tipo', 'type', 'Categoria de um valor, que define o que dá para fazer com ele.', "TypeError: unsupported operand type(s) for +: 'int' and 'str'"),
    t('inteiro', 'integer (int)', 'Número sem parte decimal.'),
    t('ponto flutuante', 'floating point (float)', 'Número com parte decimal, representado de forma aproximada.'),
    t('texto / cadeia de caracteres', 'string (str)', 'Sequência de caracteres entre aspas.'),
    t('booleano', 'boolean (bool)', 'Verdadeiro (True) ou falso (False).'),
    t('operador', 'operator', 'Símbolo que realiza uma operação: + - * / == and...'),
    t('resto da divisão', 'modulo / remainder', 'O operador % devolve o resto da divisão inteira.'),
  ],
  stages: {
    conceito: [
      md('Todo valor tem um **{{tipo|type}}**. O tipo define **o que dá para fazer** com ele: números se somam, textos se juntam, booleanos se combinam com *e*/*ou*. `type(valor)` mostra o tipo.'),
    ],
    explicacao: [
      { type: 'table', head: ['Tipo', 'Exemplos', 'Uso típico'], rows: [
        ['int', '0, 42, -7', 'contagens, índices'],
        ['float', '3.14, -0.5, 2.0', 'medidas, médias, dinheiro (com cuidado!)'],
        ['str', '"oi", \'Ana\', ""', 'textos'],
        ['bool', 'True, False', 'condições'],
      ] },
      md(`
        **Aritméticos**: \`+\` \`-\` \`*\` \`/\` (divisão, sempre dá float), \`//\` (divisão inteira), \`%\` (resto), \`**\` (potência).

        **Comparação** (resultado é bool): \`==\` igual, \`!=\` diferente, \`<\` \`<=\` \`>\` \`>=\`.

        **Lógicos**: \`and\` (os dois precisam ser verdadeiros), \`or\` (basta um), \`not\` (inverte).

        **Precedência** (quem é calculado primeiro): \`**\` → \`* / // %\` → \`+ -\` → comparações → \`not\` → \`and\` → \`or\`. Na dúvida, use parênteses — eles também deixam o código mais legível.
      `),
      warn('`=` atribui; `==` compara. Confundir os dois é um dos erros mais comuns.'),
      deep('Por que `0.1 + 0.2 == 0.3` é `False`? Porque floats são guardados em binário (padrão IEEE 754) e 0,1 não tem representação binária exata — assim como 1/3 não tem representação decimal exata. Para dinheiro, use inteiros (centavos) ou o módulo `decimal`.', 'O mistério do 0.1 + 0.2'),
    ],
    exemplo: [
      md('**O operador `%` é mais útil do que parece**: `n % 2 == 0` testa se n é par; `segundos % 60` dá os segundos que sobram depois de tirar os minutos completos.'),
      py(`
        total_segundos = 3725
        horas = total_segundos // 3600
        minutos = (total_segundos % 3600) // 60
        segundos = total_segundos % 60
        print(horas, "h", minutos, "min", segundos, "s")
      `),
    ],
    codigo: [
      py(`
        print(type(7), type(7.0), type("7"), type(True))
        print(7 / 2, 7 // 2, 7 % 2, 2 ** 10)
        print("ab" * 3)              # repetir texto
        print(int("42") + 1)         # converter texto em número
        print(10 > 3 and 2 > 5)      # False
        print(0.1 + 0.2)             # 0.30000000000000004
      `),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e1-tipos-1',
          kind: 'predict',
          lang: 'python',
          prompt: 'O que é impresso?',
          difficulty: 'facil',
          skills: ['logica-operadores'],
          hints: ['`//` descarta a parte decimal; `%` é o resto.', '17 = 5 × 3 + 2.'],
          explanation: '17 // 5 = 3 (quociente inteiro) e 17 % 5 = 2 (resto).',
          code: 'print(17 // 5, 17 % 5)',
          answer: '3 2',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e1-tipos-2',
          kind: 'mcq',
          prompt: 'Qual é o resultado de `"3" + "4"` em Python?',
          difficulty: 'facil',
          skills: ['logica-tipos'],
          hints: ['Qual é o tipo de "3"? O que + faz com esse tipo?'],
          explanation: 'Com strings, `+` concatena: `"3" + "4"` é `"34"`. Para somar, converta: `int("3") + int("4")`.',
          options: [
            { text: '7', feedback: 'Seria 7 se fossem números. Aqui são textos (entre aspas).' },
            { text: '"34"', correct: true, feedback: 'Isso: + entre strings concatena.' },
            { text: 'Erro', feedback: 'Não há erro: str + str é permitido.' },
            { text: '"7"', feedback: 'O Python não converte texto em número sozinho.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e1-tipos-3',
          kind: 'predict',
          lang: 'python',
          prompt: 'O que é impresso?',
          difficulty: 'intermediario',
          skills: ['logica-operadores'],
          hints: ['Precedência: `and` é avaliado antes de `or`.', 'Calcule: `False and False` primeiro.'],
          explanation: '`True or (False and False)` → `True or False` → `True`.',
          code: 'print(True or False and False)',
          answer: 'True',
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e1-tipos-desafio',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `bissexto(ano)` que devolve `True` se o ano é bissexto. Regra do calendário gregoriano: divisível por 4, **exceto** os divisíveis por 100, **a não ser** que também sejam divisíveis por 400. Use apenas uma expressão booleana (sem `if`).',
          difficulty: 'desafio',
          skills: ['logica-operadores'],
          hints: ['"Divisível por 4" em Python: `ano % 4 == 0`.', 'Separe em dois casos que tornam o ano bissexto: (div. por 4 e não por 100) **ou** (div. por 400).'],
          explanation: '`(ano % 4 == 0 and ano % 100 != 0) or ano % 400 == 0`. 1900 não é bissexto; 2000 é.',
          starter: dedent(`
            def bissexto(ano):
                return False
          `),
          solution: dedent(`
            def bissexto(ano):
                return (ano % 4 == 0 and ano % 100 != 0) or ano % 400 == 0
          `),
          tests: [
            { name: '2024 é bissexto', code: 'assert bissexto(2024) is True' },
            { name: '2023 não é', code: 'assert bissexto(2023) is False' },
            { name: '1900 não é (divisível por 100)', code: 'assert bissexto(1900) is False' },
            { name: '2000 é (divisível por 400)', code: 'assert bissexto(2000) is True' },
          ],
        },
      },
    ],
    projeto: [md('**Calculadora (parte 2)**: adicione divisão inteira, resto e potência à sua calculadora. O que acontece se o segundo número for 0? Anote o nome do erro em inglês — você vai tratá-lo no Nível 2.'), { type: 'project', projectId: 'p1-calculadora' }],
    revisao: [
      md(`
        - Tipos básicos: int, float, str, bool. \`type()\` mostra o tipo.
        - \`/\` dá float; \`//\` divisão inteira; \`%\` resto; \`**\` potência.
        - Comparações devolvem bool; combine com and/or/not.
        - Floats são aproximados: cuidado com igualdade e dinheiro.
      `),
    ],
  },
  review: [
    ['Quanto é 7 // 2 e 7 % 2?', '3 e 1.'],
    ['Diferença entre = e ==?', '= atribui um valor; == compara dois valores e devolve True/False.'],
    ['Por que 0.1 + 0.2 != 0.3?', 'Porque floats são representações binárias aproximadas (IEEE 754).'],
    ['Qual a ordem de precedência entre and e or?', 'and é avaliado antes de or.'],
  ],
  references: ['python-tutorial', 'python-docs', 'goldberg-float'],
});

const entradaSaida = lesson({
  id: 'l1-entrada-saida',
  moduleId: 'm1-2',
  title: 'Entrada e saída',
  titleEn: 'Input and output',
  summary: 'Ler dados do usuário com input(), converter e apresentar resultados com print() e f-strings.',
  minutes: 20,
  objectives: ['Ler dados com input() e converter para número', 'Formatar saída com f-strings', 'Entender que input() sempre devolve str'],
  skills: ['logica-entrada-saida'],
  terms: [
    t('entrada padrão', 'standard input (stdin)', 'De onde o programa lê dados por padrão (normalmente o teclado).'),
    t('saída padrão', 'standard output (stdout)', 'Para onde o programa escreve por padrão (normalmente a tela).'),
    t('formatação', 'formatting', 'Montar textos com valores dentro, como f"Olá, {nome}".'),
    t('conversão de tipo', 'type conversion / casting', 'Transformar um valor de um tipo em outro, como int("5").'),
  ],
  stages: {
    conceito: [md('`input()` lê uma linha digitada pelo usuário e **sempre devolve texto** (`str`). `print()` mostra valores na tela. Juntos, eles fazem o programa conversar com quem usa.')],
    explicacao: [
      md(`
        \`\`\`
        nome = input("Seu nome: ")      # mostra a pergunta e espera o usuário
        idade = int(input("Idade: "))   # converte o texto para inteiro
        \`\`\`

        Para montar mensagens, use **f-strings**: um \`f\` antes das aspas e valores entre chaves.
        \`f"{nome} tem {idade} anos"\`. Dá para formatar números: \`f"{preco:.2f}"\` mostra 2 casas decimais.

        \`print\` aceita vários valores separados por vírgula (ele coloca espaço entre eles) e os parâmetros \`sep\` e \`end\`.
      `),
      warn('`int(input())` quebra se o usuário digitar "abc": `ValueError: invalid literal for int() with base 10`. No Nível 2 você aprende a tratar isso com `try/except`.'),
    ],
    exemplo: [
      md('No Alicerce, a entrada de um programa vem da caixa **Entrada (stdin)** abaixo do editor — cada linha é uma resposta para um `input()`.'),
      py(`
        nome = input("Nome: ")
        nota1 = float(input("Nota 1: "))
        nota2 = float(input("Nota 2: "))
        media = (nota1 + nota2) / 2
        print(f"{nome}, sua média é {media:.1f}")
      `, { stdin: 'Ana\n7.5\n9' }),
    ],
    codigo: [
      py(`
        produto = "caderno"
        preco = 12.5
        qtd = 3
        print(f"{qtd}x {produto}: R$ {preco * qtd:.2f}")
        print("a", "b", "c", sep="-")
        print("sem quebra", end=" ")
        print("de linha")
      `),
      english('O "f" de f-string vem de *formatted string literal*. Na documentação procure por **"Format Specification Mini-Language"** para ver todas as opções, como `:.2f`, `:>10`, `:,`.'),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e1-io-1',
          kind: 'mcq',
          prompt: 'O usuário digita `5`. Qual o resultado de `x = input()` seguido de `print(x * 2)`?',
          difficulty: 'facil',
          skills: ['logica-entrada-saida', 'logica-tipos'],
          hints: ['Qual o tipo do que input() devolve?', 'O que `*` faz com uma string?'],
          explanation: 'input() devolve a string "5", e "5" * 2 repete o texto: "55".',
          options: [
            { text: '10', feedback: 'Seria 10 com `int(input())`.' },
            { text: '55', correct: true, feedback: 'Isso: string vezes inteiro repete o texto.' },
            { text: 'Erro', feedback: 'str * int é permitido em Python.' },
            { text: '5 5', feedback: 'Não há espaço: a repetição junta os textos.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e1-io-2',
          kind: 'code',
          lang: 'python',
          prompt: 'Leia dois inteiros (um por linha) e imprima a soma no formato `A soma é 12`. A entrada de teste já está preenchida.',
          difficulty: 'facil',
          skills: ['logica-entrada-saida'],
          stdin: '5\n7',
          hints: ['Você precisa de dois `input()` e de converter cada um com `int()`.', 'Use uma f-string: `f"A soma é {...}"`.'],
          explanation: 'Converter antes de somar é essencial; sem `int()`, "5" + "7" daria "57".',
          starter: dedent(`
            a = input()
            b = input()
            print(a + b)
          `),
          solution: dedent(`
            a = int(input())
            b = int(input())
            print(f"A soma é {a + b}")
          `),
          tests: [{ name: 'imprime "A soma é 12"', code: 'assert _output.strip() == "A soma é 12", repr(_output)' }],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e1-io-desafio',
          kind: 'code',
          lang: 'python',
          prompt: 'Leia um valor em reais (pode ter centavos, ex.: `1234.5`) e imprima no formato brasileiro: `R$ 1.234,50`. Dica: formate primeiro no estilo americano e depois troque os separadores.',
          difficulty: 'desafio',
          skills: ['logica-entrada-saida'],
          stdin: '1234.5',
          hints: ['`f"{v:,.2f}"` produz "1,234.50".', 'Você precisa trocar "," por "." e "." por ",". Trocar direto um pelo outro estraga — use um caractere temporário.'],
          explanation: 'Formate com `:,.2f`, depois troque `,`→`X`, `.`→`,`, `X`→`.`. Em sistemas reais, use o módulo `locale` ou bibliotecas de internacionalização (i18n).',
          starter: dedent(`
            v = float(input())
            print(v)
          `),
          solution: dedent(`
            v = float(input())
            s = f"{v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
            print(f"R$ {s}")
          `),
          tests: [{ name: 'imprime "R$ 1.234,50"', code: 'assert _output.strip() == "R$ 1.234,50", repr(_output)' }],
        },
      },
    ],
    projeto: [md('**Calculadora (parte 3)**: agora leia os dois números do usuário com `input()`.'), { type: 'project', projectId: 'p1-calculadora' }],
    revisao: [md('- `input()` devolve str: converta com int()/float().\n- f-strings: `f"{valor:.2f}"`.\n- print: `sep` e `end` controlam separador e final.')],
  },
  review: [
    ['Qual o tipo devolvido por input()?', 'Sempre str.'],
    ['Como mostrar um float com 2 casas decimais numa f-string?', 'f"{valor:.2f}"'],
  ],
  references: ['python-tutorial', 'python-docs'],
});

const condicionais = lesson({
  id: 'l1-condicionais',
  moduleId: 'm1-3',
  title: 'Condicionais: tomando decisões',
  titleEn: 'Conditionals: making decisions',
  summary: 'if, elif, else, condições compostas, aninhamento e tabelas-verdade.',
  minutes: 30,
  objectives: ['Escrever decisões com if/elif/else', 'Construir condições compostas corretas', 'Testar todos os caminhos de um programa (casos de borda)'],
  skills: ['prog-condicionais'],
  terms: [
    t('condicional', 'conditional statement', 'Estrutura que executa código só se uma condição for verdadeira.'),
    t('senão', 'else', 'Bloco executado quando a condição do if é falsa.'),
    t('senão se', 'elif (else if)', 'Testa outra condição se as anteriores foram falsas.'),
    t('bloco / indentação', 'block / indentation', 'Linhas recuadas que pertencem a uma estrutura.', 'IndentationError: expected an indented block'),
    t('caso de borda', 'edge case', 'Entrada nos limites (0, vazio, máximo) onde bugs costumam aparecer.'),
  ],
  stages: {
    conceito: [md('Programas precisam **decidir**. Um **{{condicional|conditional}}** executa um bloco de código apenas **se** uma condição for verdadeira: `if condição:`. Com `elif` e `else`, você escolhe entre vários caminhos.')],
    explicacao: [
      md(`
        Em Python, o que pertence ao \`if\` é definido pela **{{indentação|indentation}}** (4 espaços por convenção):

        \`\`\`
        if temperatura > 30:
            print("Calor")        # dentro do if
        elif temperatura > 20:
            print("Agradável")
        else:
            print("Frio")
        print("fim")              # fora: executa sempre
        \`\`\`

        As condições são testadas **de cima para baixo** e só o **primeiro** bloco verdadeiro executa. Por isso a **ordem importa**: se você testar \`> 20\` antes de \`> 30\`, nunca vai imprimir "Calor".
      `),
      { type: 'table', head: ['A', 'B', 'A and B', 'A or B', 'not A'], rows: [
        ['True', 'True', 'True', 'True', 'False'],
        ['True', 'False', 'False', 'True', 'False'],
        ['False', 'True', 'False', 'True', 'True'],
        ['False', 'False', 'False', 'False', 'True'],
      ], caption: 'Tabela-verdade (truth table). Você vai revê-la em Lógica Matemática (Nível 14) e em circuitos digitais.' },
      tip('Teste **todos os caminhos** e os **casos de borda** (*edge cases*). Se a regra é "maior ou igual a 7 aprova", teste 6.9, 7 e 7.1.'),
    ],
    exemplo: [
      trace(`
        nota = 6.5
        if nota >= 7:
            situacao = "aprovado"
        elif nota >= 5:
            situacao = "recuperação"
        else:
            situacao = "reprovado"
        print(situacao)
      `, 'Observe que, ao entrar no elif, o else nem é avaliado.'),
    ],
    codigo: [
      py(`
        idade = 17
        tem_autorizacao = True
        if idade >= 18 or tem_autorizacao:
            print("Pode participar")
        else:
            print("Não pode participar")
      `),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e1-if-1',
          kind: 'predict',
          lang: 'python',
          prompt: 'O que é impresso?',
          difficulty: 'facil',
          skills: ['prog-condicionais'],
          hints: ['Só o primeiro bloco verdadeiro executa.', '15 > 10 já é verdadeiro.'],
          explanation: 'x > 10 é True, então imprime "A" e pula o resto, mesmo que x > 5 também seja verdade.',
          code: dedent(`
            x = 15
            if x > 10:
                print("A")
            elif x > 5:
                print("B")
            else:
                print("C")
          `),
          answer: 'A',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e1-if-2',
          kind: 'fix',
          lang: 'python',
          prompt: 'A função deveria classificar a temperatura, mas `classificar(35)` devolve "agradável". Encontre e corrija o bug.',
          difficulty: 'intermediario',
          skills: ['prog-condicionais'],
          hints: ['Simule `classificar(35)`: qual condição é testada primeiro?', 'Qual é a ordem correta: da condição mais restrita para a mais ampla?'],
          explanation: '35 > 20 é verdadeiro, então o primeiro ramo captura tudo acima de 20. Teste a condição mais restritiva (> 30) primeiro.',
          starter: dedent(`
            def classificar(t):
                if t > 20:
                    return "agradável"
                elif t > 30:
                    return "calor"
                else:
                    return "frio"
          `),
          solution: dedent(`
            def classificar(t):
                if t > 30:
                    return "calor"
                elif t > 20:
                    return "agradável"
                else:
                    return "frio"
          `),
          tests: [
            { name: '35 → calor', code: 'assert classificar(35) == "calor"' },
            { name: '25 → agradável', code: 'assert classificar(25) == "agradável"' },
            { name: '10 → frio', code: 'assert classificar(10) == "frio"' },
            { name: 'bordas: 30 → agradável, 20 → frio', code: 'assert classificar(30) == "agradável" and classificar(20) == "frio"' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e1-if-3',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `maior_de_tres(a, b, c)` que devolve o maior dos três números, **sem** usar `max()`.',
          difficulty: 'intermediario',
          skills: ['prog-condicionais'],
          hints: ['Quando `a` é o maior? Quando ele é >= aos outros dois.', 'Use `and` para combinar as duas comparações. Pense no caso de empates.'],
          explanation: 'Uma solução: se a >= b and a >= c → a; elif b >= c → b; senão c. Usar >= (e não >) trata os empates.',
          starter: 'def maior_de_tres(a, b, c):\n    pass\n',
          solution: dedent(`
            def maior_de_tres(a, b, c):
                if a >= b and a >= c:
                    return a
                elif b >= c:
                    return b
                return c
          `),
          tests: [
            { name: 'maior no meio', code: 'assert maior_de_tres(1, 9, 3) == 9' },
            { name: 'maior no fim', code: 'assert maior_de_tres(1, 2, 3) == 3' },
            { name: 'maior no início', code: 'assert maior_de_tres(5, 2, 3) == 5' },
            { name: 'empates', code: 'assert maior_de_tres(4, 4, 1) == 4 and maior_de_tres(2, 7, 7) == 7' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e1-if-desafio',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `triangulo(a, b, c)` que devolve `"inválido"` se os lados não formam triângulo (cada lado deve ser menor que a soma dos outros dois e todos positivos), ou então `"equilátero"`, `"isósceles"` ou `"escaleno"`.',
          difficulty: 'desafio',
          skills: ['prog-condicionais', 'logica-operadores'],
          hints: ['Primeiro valide; só depois classifique.', 'Desigualdade triangular: `a < b + c and b < a + c and c < a + b`.', 'Isósceles: pelo menos dois lados iguais (e não os três).'],
          explanation: 'Validar antes de processar é um padrão importante (*guard clause*): devolva cedo nos casos inválidos e o resto do código fica mais simples.',
          starter: 'def triangulo(a, b, c):\n    pass\n',
          solution: dedent(`
            def triangulo(a, b, c):
                if a <= 0 or b <= 0 or c <= 0 or a >= b + c or b >= a + c or c >= a + b:
                    return "inválido"
                if a == b == c:
                    return "equilátero"
                if a == b or b == c or a == c:
                    return "isósceles"
                return "escaleno"
          `),
          tests: [
            { name: 'equilátero', code: 'assert triangulo(3, 3, 3) == "equilátero"' },
            { name: 'isósceles', code: 'assert triangulo(5, 5, 8) == "isósceles"' },
            { name: 'escaleno', code: 'assert triangulo(3, 4, 5) == "escaleno"' },
            { name: 'degenerado é inválido', code: 'assert triangulo(1, 2, 3) == "inválido"' },
            { name: 'negativo é inválido', code: 'assert triangulo(-1, 2, 2) == "inválido"' },
          ],
        },
      },
    ],
    projeto: [md('**Calculadora (parte 4)**: peça também a operação (`+`, `-`, `*`, `/`) e use `if/elif` para escolher o cálculo. Trate a divisão por zero com uma mensagem amigável.'), { type: 'project', projectId: 'p1-calculadora' }],
    revisao: [md('- if / elif / else: testados de cima para baixo; só o primeiro verdadeiro executa.\n- Indentação define o bloco.\n- Ordem das condições importa.\n- Teste todos os caminhos e as bordas.')],
  },
  review: [
    ['Se duas condições de um if/elif forem verdadeiras, quantos blocos executam?', 'Apenas o primeiro verdadeiro.'],
    ['O que é um edge case?', 'Um caso nos limites da entrada (0, vazio, valor máximo, igualdade) onde bugs costumam aparecer.'],
    ['Quando `A or B` é falso?', 'Somente quando A e B são falsos.'],
  ],
  references: ['python-tutorial', 'cs50', 'mit-6100l'],
});

const loops = lesson({
  id: 'l1-loops',
  moduleId: 'm1-4',
  title: 'Laços de repetição',
  titleEn: 'Loops',
  summary: 'while, for, range, padrões de contador e acumulador, break/continue e loops infinitos.',
  minutes: 35,
  objectives: ['Usar while e for', 'Aplicar os padrões contador, acumulador e busca', 'Evitar e diagnosticar loops infinitos e erros de "um a mais" (off-by-one)'],
  skills: ['prog-loops'],
  terms: [
    t('laço de repetição', 'loop', 'Estrutura que repete um bloco de código.'),
    t('iteração', 'iteration', 'Cada repetição de um loop.'),
    t('contador', 'counter', 'Variável que conta quantas vezes algo acontece.'),
    t('acumulador', 'accumulator', 'Variável que acumula um resultado (soma, produto, texto).'),
    t('laço infinito', 'infinite loop', 'Loop cuja condição nunca fica falsa.'),
    t('erro de um a mais', 'off-by-one error', 'Erro em que o loop executa uma vez a mais ou a menos.'),
  ],
  stages: {
    conceito: [md('Um **{{laço|loop}}** repete um bloco de código. `while` repete **enquanto** uma condição for verdadeira; `for` repete **para cada** item de uma sequência. Com loops, um programa de 5 linhas processa 5 milhões de itens.')],
    explicacao: [
      md(`
        **while** — quando você não sabe quantas repetições serão necessárias:

        \`\`\`
        senha = ""
        while senha != "1234":
            senha = input("Senha: ")
        \`\`\`

        **for** — para percorrer uma sequência. \`range(n)\` gera 0, 1, ..., n-1; \`range(a, b)\` gera a, ..., b-1; \`range(a, b, passo)\`.

        \`\`\`
        for i in range(1, 6):
            print(i)        # 1 2 3 4 5 (o 6 não entra!)
        \`\`\`

        **Padrões** que você vai usar a vida toda:

        - **Contador**: \`c = 0\` antes; \`c += 1\` dentro, quando algo acontece.
        - **Acumulador**: \`soma = 0\` antes; \`soma += x\` dentro.
        - **Busca**: percorrer até achar; \`break\` sai do loop na hora.

        \`continue\` pula para a próxima iteração.
      `),
      warn('Em um `while`, algo **dentro** do loop precisa mudar a condição. Se nada muda, o loop é infinito. O Alicerce interrompe programas que demoram demais e explica o que pode ter acontecido.', 'Loops infinitos'),
    ],
    exemplo: [
      trace(`
        soma = 0
        for i in range(1, 5):
            soma = soma + i
        print(soma)
      `, 'Acumulador: veja soma crescer 0 → 1 → 3 → 6 → 10.'),
    ],
    codigo: [
      py(`
        # tabuada do 7
        for i in range(1, 11):
            print(f"7 x {i} = {7 * i}")

        # contar vogais
        frase = "programar é pensar"
        vogais = 0
        for letra in frase:
            if letra in "aeiouáéíóú":
                vogais += 1
        print("vogais:", vogais)
      `),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e1-loop-1',
          kind: 'predict',
          lang: 'python',
          prompt: 'O que é impresso? (cada número em uma linha)',
          difficulty: 'facil',
          skills: ['prog-loops'],
          hints: ['range(2, 10, 3): começa em 2, soma 3 a cada passo, para **antes** de 10.'],
          explanation: '2, 5, 8 — o próximo seria 11, que passa de 10.',
          code: 'for i in range(2, 10, 3):\n    print(i)',
          answer: '2\n5\n8',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e1-loop-2',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `soma_pares(n)` que devolve a soma de todos os números pares de 0 até n (inclusive).',
          difficulty: 'facil',
          skills: ['prog-loops'],
          hints: ['Padrão acumulador: comece com 0.', 'Use `range` com passo 2, ou teste `i % 2 == 0`. Lembre que range exclui o fim: use n + 1.'],
          explanation: '`sum(range(0, n + 1, 2))` também resolve, mas escrever o acumulador ensina o padrão. O `+ 1` evita o off-by-one.',
          starter: 'def soma_pares(n):\n    pass\n',
          solution: dedent(`
            def soma_pares(n):
                soma = 0
                for i in range(0, n + 1, 2):
                    soma += i
                return soma
          `),
          tests: [
            { name: 'soma_pares(10) == 30', code: 'assert soma_pares(10) == 30' },
            { name: 'soma_pares(7) == 12', code: 'assert soma_pares(7) == 12' },
            { name: 'soma_pares(0) == 0', code: 'assert soma_pares(0) == 0' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e1-loop-3',
          kind: 'fix',
          lang: 'python',
          prompt: 'Esta função deveria contar regressivamente e devolver a lista `[n, n-1, ..., 1]`, mas trava (loop infinito). Corrija.',
          difficulty: 'intermediario',
          skills: ['prog-loops'],
          hints: ['O que precisa mudar a cada volta para a condição ficar falsa?', 'Olhe a variável da condição: ela muda dentro do loop?'],
          explanation: 'Sem `n -= 1`, a condição `n > 0` nunca fica falsa. Em todo while, pergunte: "o que faz este loop terminar?".',
          starter: dedent(`
            def regressiva(n):
                resultado = []
                while n > 0:
                    resultado.append(n)
                return resultado
          `),
          solution: dedent(`
            def regressiva(n):
                resultado = []
                while n > 0:
                    resultado.append(n)
                    n -= 1
                return resultado
          `),
          tests: [
            { name: 'regressiva(3) == [3, 2, 1]', code: 'assert regressiva(3) == [3, 2, 1]' },
            { name: 'regressiva(0) == []', code: 'assert regressiva(0) == []' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e1-loop-4',
          kind: 'parsons',
          lang: 'python',
          prompt: 'Monte a função que devolve o **primeiro** número negativo de uma lista, ou `None` se não houver.',
          difficulty: 'intermediario',
          skills: ['prog-loops'],
          hints: ['O `return None` deve ficar fora do loop: só depois de olhar todos.'],
          explanation: 'Padrão busca: o `return` dentro do loop encerra na hora; o `return None` fora cobre o caso de não encontrar.',
          lines: ['def primeiro_negativo(lista):', '    for x in lista:', '        if x < 0:', '            return x', '    return None'],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e1-loop-desafio',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `fizzbuzz(n)` que devolve uma **lista de strings** de 1 a n: múltiplos de 3 viram `"Fizz"`, de 5 `"Buzz"`, de ambos `"FizzBuzz"`, e os demais o próprio número como texto. (Sim, esta é uma pergunta clássica de entrevista.)',
          difficulty: 'intermediario',
          skills: ['prog-loops', 'prog-condicionais'],
          hints: ['Qual caso precisa ser testado primeiro?', 'Múltiplo de 3 e de 5 = múltiplo de 15. Teste-o antes dos outros.'],
          explanation: 'O ponto central é a ordem das condições: o caso mais específico (15) vem primeiro.',
          starter: 'def fizzbuzz(n):\n    pass\n',
          solution: dedent(`
            def fizzbuzz(n):
                out = []
                for i in range(1, n + 1):
                    if i % 15 == 0:
                        out.append("FizzBuzz")
                    elif i % 3 == 0:
                        out.append("Fizz")
                    elif i % 5 == 0:
                        out.append("Buzz")
                    else:
                        out.append(str(i))
                return out
          `),
          tests: [
            { name: 'fizzbuzz(5)', code: 'assert fizzbuzz(5) == ["1", "2", "Fizz", "4", "Buzz"]' },
            { name: '15 vira FizzBuzz', code: 'assert fizzbuzz(15)[-1] == "FizzBuzz"' },
            { name: 'tamanho', code: 'assert len(fizzbuzz(100)) == 100' },
          ],
        },
      },
    ],
    projeto: [md('**Calculadora (parte 5)**: coloque a calculadora em um `while` para que o usuário faça várias contas até digitar `sair`. Seu primeiro programa interativo completo!'), { type: 'project', projectId: 'p1-calculadora' }],
    revisao: [md('- while: enquanto a condição for verdadeira; algo precisa mudá-la.\n- for: para cada item; range(a, b) exclui b.\n- Padrões: contador, acumulador, busca.\n- break sai; continue pula.')],
  },
  review: [
    ['Quais números range(1, 5) gera?', '1, 2, 3, 4.'],
    ['O que causa um loop infinito com while?', 'Nada dentro do loop muda a condição para falsa.'],
    ['O que é um off-by-one error?', 'Um erro em que o loop executa uma vez a mais ou a menos (geralmente por causa dos limites).'],
  ],
  references: ['python-tutorial', 'cs50', 'cmu-15112'],
});

const funcoes = lesson({
  id: 'l1-funcoes',
  moduleId: 'm1-5',
  title: 'Funções e escopo',
  titleEn: 'Functions and scope',
  summary: 'Definir funções, parâmetros, retorno, escopo local e por que funções são a base da organização.',
  minutes: 35,
  objectives: ['Definir funções com parâmetros e return', 'Diferenciar print de return', 'Entender escopo local e global', 'Escrever docstrings'],
  skills: ['prog-funcoes', 'prog-escopo'],
  terms: [
    t('função', 'function', 'Bloco de código nomeado e reutilizável.'),
    t('parâmetro', 'parameter', 'Nome que a função usa para receber um valor (na definição).'),
    t('argumento', 'argument', 'Valor passado na chamada da função.'),
    t('retorno', 'return value', 'Valor que a função devolve para quem chamou.'),
    t('escopo', 'scope', 'Região do código onde um nome existe.', "UnboundLocalError: cannot access local variable 'x'"),
    t('chamar', 'call / invoke', 'Executar uma função: f(3).'),
    t('docstring', 'docstring', 'Texto de documentação na primeira linha da função.'),
  ],
  stages: {
    conceito: [md('Uma **{{função|function}}** é um pedaço de código com **nome**, que recebe **entradas** ({{parâmetros|parameters}}) e devolve uma **saída** ({{retorno|return value}}). Funções permitem **reutilizar** código e, mais importante, **pensar em partes**: cada função resolve um subproblema.')],
    explicacao: [
      md(`
        \`\`\`
        def area_retangulo(base, altura):
            """Devolve a área de um retângulo."""
            return base * altura

        a = area_retangulo(3, 4)   # 3 e 4 são argumentos
        \`\`\`

        - \`def\` define; \`base\` e \`altura\` são **parâmetros**; \`3\` e \`4\` são **argumentos**.
        - \`return\` **devolve** um valor e **encerra** a função. Sem \`return\`, a função devolve \`None\`.

        **print ≠ return.** \`print\` mostra na tela para um humano; \`return\` entrega o valor para o **código** que chamou, que pode guardá-lo, compará-lo, passá-lo adiante. Funções úteis quase sempre usam \`return\`.

        **{{Escopo|scope}}**: variáveis criadas dentro de uma função são **locais** — só existem enquanto a função executa e não são vistas de fora. Isso evita que funções interfiram umas nas outras.
      `),
      deep('Cada chamada de função cria um **quadro** (*frame*) na **pilha de chamadas** (*call stack*) com suas variáveis locais. Quando a função retorna, o quadro é descartado. É por isso que o traceback do Python mostra uma lista de chamadas: é a pilha no momento do erro. Você vai usar isso para entender recursão (Nível 4).', 'A pilha de chamadas'),
    ],
    exemplo: [
      trace(`
        def dobro(x):
            resultado = x * 2
            return resultado

        a = dobro(5)
        b = dobro(a)
        print(a, b)
      `, 'Observe o quadro da função surgir a cada chamada e sumir no return.'),
    ],
    codigo: [
      py(`
        def celsius_para_fahrenheit(c):
            """Converte graus Celsius para Fahrenheit."""
            return c * 9 / 5 + 32

        for c in [0, 25, 100]:
            print(c, "°C =", celsius_para_fahrenheit(c), "°F")

        help(celsius_para_fahrenheit)   # mostra a docstring
      `),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e1-fn-1',
          kind: 'predict',
          lang: 'python',
          prompt: 'O que é impresso?',
          difficulty: 'intermediario',
          skills: ['prog-funcoes'],
          hints: ['A função imprime algo, mas o que ela **devolve**?', 'Sem return, uma função devolve None.'],
          explanation: 'A chamada imprime 6 (dentro da função) e devolve None; o print de fora imprime None.',
          code: dedent(`
            def triplo(x):
                print(x * 3)

            r = triplo(2)
            print(r)
          `),
          answer: '6\nNone',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e1-fn-2',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `media(notas)` que recebe uma lista de números e devolve a média. Se a lista estiver vazia, devolva `0`.',
          difficulty: 'facil',
          skills: ['prog-funcoes'],
          hints: ['Média = soma / quantidade.', 'Trate a lista vazia **antes** de dividir (por quê?).'],
          explanation: 'Dividir por `len([])` = 0 causaria `ZeroDivisionError`. Tratar o caso vazio primeiro é uma *guard clause*.',
          starter: 'def media(notas):\n    pass\n',
          solution: dedent(`
            def media(notas):
                if not notas:
                    return 0
                return sum(notas) / len(notas)
          `),
          tests: [
            { name: 'media([7, 8, 9]) == 8', code: 'assert media([7, 8, 9]) == 8' },
            { name: 'lista vazia → 0', code: 'assert media([]) == 0' },
            { name: 'devolve (não imprime)', code: 'assert media([1, 2]) == 1.5' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e1-fn-3',
          kind: 'mcq',
          prompt: 'O que acontece ao executar este código?',
          code: { lang: 'python', code: dedent(`
            def f():
                y = 10
            f()
            print(y)
          `) },
          difficulty: 'intermediario',
          skills: ['prog-escopo'],
          hints: ['Onde `y` foi criada? Ela existe fora da função?'],
          explanation: '`y` é local de `f` e deixa de existir quando `f` termina. Fora dela, `y` não está definida: `NameError`.',
          options: [
            { text: 'Imprime 10', feedback: 'y só existe **dentro** de f.' },
            { text: 'NameError: name \'y\' is not defined', correct: true, feedback: 'Isso: escopo local.' },
            { text: 'Imprime None', feedback: 'None seria o retorno de f(), não o valor de y.' },
            { text: 'SyntaxError', feedback: 'A sintaxe está correta; o erro acontece na execução.' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e1-fn-desafio',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `eh_primo(n)` (devolve True se n é primo) e, **usando ela**, `primos_ate(n)` que devolve a lista de primos de 2 até n.',
          difficulty: 'desafio',
          skills: ['prog-funcoes', 'prog-loops'],
          hints: ['Um primo é > 1 e só é divisível por 1 e por ele mesmo.', 'Basta testar divisores de 2 até a raiz quadrada de n: `while d * d <= n`.', '`primos_ate` só precisa de um loop chamando `eh_primo`.'],
          explanation: 'Dividir em duas funções separa responsabilidades: uma testa, a outra coleta. Testar até √n é suficiente porque, se n = a × b, um dos fatores é ≤ √n.',
          starter: 'def eh_primo(n):\n    pass\n\ndef primos_ate(n):\n    pass\n',
          solution: dedent(`
            def eh_primo(n):
                if n < 2:
                    return False
                d = 2
                while d * d <= n:
                    if n % d == 0:
                        return False
                    d += 1
                return True

            def primos_ate(n):
                return [x for x in range(2, n + 1) if eh_primo(x)]
          `),
          tests: [
            { name: 'eh_primo de casos básicos', code: 'assert [eh_primo(x) for x in [0, 1, 2, 3, 4, 9, 13]] == [False, False, True, True, False, False, True]' },
            { name: 'primos_ate(20)', code: 'assert primos_ate(20) == [2, 3, 5, 7, 11, 13, 17, 19]' },
            { name: 'número grande', code: 'assert eh_primo(7919) and not eh_primo(7917)' },
          ],
        },
      },
    ],
    projeto: [md('**Calculadora (final)**: reorganize a calculadora em funções: `somar`, `subtrair`, `multiplicar`, `dividir` e `calcular(a, op, b)`. Seu programa principal só deve ler a entrada, chamar `calcular` e imprimir. Esse é o projeto 1 completo!'), { type: 'project', projectId: 'p1-calculadora' }],
    revisao: [md('- def nome(parâmetros): ... return valor\n- return devolve e encerra; sem return → None.\n- print mostra; return entrega ao código.\n- Variáveis de dentro da função são locais.')],
  },
  review: [
    ['Diferença entre parâmetro e argumento?', 'Parâmetro é o nome na definição; argumento é o valor passado na chamada.'],
    ['O que uma função sem return devolve?', 'None.'],
    ['Por que preferir return a print em funções?', 'Porque return entrega o valor ao código, permitindo reutilizar, testar e combinar o resultado.'],
  ],
  references: ['python-tutorial', 'cs61a', 'composing-programs', 'htdp'],
});

const decomposicao = lesson({
  id: 'l1-decomposicao',
  moduleId: 'm1-5',
  title: 'Resolvendo problemas: a receita de projeto',
  titleEn: 'Problem solving: the design recipe',
  summary: 'Um método passo a passo para sair do enunciado e chegar a um programa correto e testado.',
  minutes: 30,
  objectives: ['Aplicar a receita de projeto: assinatura, propósito, exemplos, implementação, testes', 'Decompor um problema em funções auxiliares', 'Escrever exemplos antes do código'],
  skills: ['logica-decomposicao'],
  terms: [
    t('assinatura', 'signature', 'Nome, parâmetros e tipos de uma função: media(notas: list[float]) -> float.'),
    t('propósito', 'purpose statement', 'Uma frase dizendo o que a função faz.'),
    t('exemplo / caso de teste', 'example / test case', 'Entrada e saída esperada, escritas antes do código.'),
    t('função auxiliar', 'helper function', 'Função pequena que resolve uma parte do problema.'),
  ],
  stages: {
    conceito: [md('Programadores experientes **não** começam digitando código. Eles seguem um **método**. Aqui usamos uma versão da **receita de projeto** (*design recipe*), ensinada no livro *How to Design Programs* e em cursos como o CS 135 de Waterloo.')],
    explicacao: [
      md(`
        **Receita de projeto, em 5 passos:**

        1. **Assinatura**: nome da função, o que entra e o que sai (com tipos). \`desconto(preco: float, cupom: str) -> float\`
        2. **Propósito**: uma frase. *"Devolve o preço final após aplicar o cupom."*
        3. **Exemplos**: escreva entradas e saídas esperadas **antes** do código, incluindo bordas. \`desconto(100, "DEZ") == 90\`, \`desconto(100, "XYZ") == 100\`.
        4. **Implementação**: agora sim, o código. Se ficar complicado, **decomponha** em funções auxiliares.
        5. **Testes**: transforme os exemplos em \`assert\`s e rode.

        Os exemplos do passo 3 fazem você **entender** o problema — se você não consegue escrever o exemplo, ainda não entendeu o enunciado.
      `),
      tip('Se uma função passa de ~20 linhas ou faz "isto **e** aquilo", ela provavelmente deveria ser duas.'),
    ],
    exemplo: [
      md('**Problema**: dado um texto, devolver a palavra mais longa (em caso de empate, a primeira).'),
      py(`
        def palavra_mais_longa(texto: str) -> str:
            """Devolve a palavra mais longa do texto (a primeira, se houver empate)."""
            melhor = ""
            for palavra in texto.split():
                if len(palavra) > len(melhor):
                    melhor = palavra
            return melhor

        # exemplos viram testes
        assert palavra_mais_longa("o rato roeu a roupa") == "roupa"
        assert palavra_mais_longa("ab cd") == "ab"     # empate: a primeira
        assert palavra_mais_longa("") == ""            # borda: texto vazio
        print("todos os testes passaram")
      `),
    ],
    codigo: [
      md('**Decomposição** na prática: um validador de senha forte fica muito mais claro com funções auxiliares.'),
      py(`
        def tem_digito(s):
            return any(c.isdigit() for c in s)

        def tem_maiuscula(s):
            return any(c.isupper() for c in s)

        def senha_forte(s):
            return len(s) >= 8 and tem_digito(s) and tem_maiuscula(s)

        print(senha_forte("abc"), senha_forte("Alicerce2026"))
      `),
      english('*"Write the examples first"*, *"break the problem down into smaller pieces"*, *"helper function"* e *"edge case"* são expressões que você vai ouvir em code reviews e entrevistas.'),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e1-dec-1',
          kind: 'mcq',
          prompt: 'Você recebeu o enunciado "calcule o frete". Pela receita de projeto, qual deve ser seu **primeiro** passo?',
          difficulty: 'facil',
          skills: ['logica-decomposicao'],
          hints: ['O que entra e o que sai da função?'],
          explanation: 'Antes de tudo, defina a assinatura (entradas, saída e tipos). Se não souber o que entra (peso? CEP? valor?), pergunte — é parte de entender o problema.',
          options: [
            { text: 'Começar a escrever os if/else', feedback: 'Código antes de entender o problema leva a retrabalho.' },
            { text: 'Definir a assinatura: o que entra (peso, distância...) e o que sai (valor)', correct: true, feedback: 'Isso.' },
            { text: 'Escolher o nome das variáveis internas', feedback: 'É detalhe de implementação: vem depois.' },
            { text: 'Otimizar o desempenho', feedback: '"Premature optimization is the root of all evil" (Knuth).' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e1-dec-2',
          kind: 'code',
          lang: 'python',
          prompt: 'Siga a receita: escreva `iniciais(nome)` que devolve as iniciais em maiúsculas. `iniciais("ada lovelace") == "AL"`. Ignore espaços extras.',
          difficulty: 'intermediario',
          skills: ['logica-decomposicao', 'prog-funcoes'],
          hints: ['Escreva primeiro 3 exemplos, incluindo um com espaços duplos.', '`texto.split()` (sem argumentos) já ignora espaços extras.', 'Para cada palavra, pegue `palavra[0].upper()` e acumule.'],
          explanation: '`"".join(p[0].upper() for p in nome.split())` resolve em uma linha, mas o importante é o processo: exemplos primeiro.',
          starter: 'def iniciais(nome):\n    pass\n',
          solution: 'def iniciais(nome):\n    return "".join(p[0].upper() for p in nome.split())\n',
          tests: [
            { name: 'ada lovelace → AL', code: 'assert iniciais("ada lovelace") == "AL"' },
            { name: 'espaços extras', code: 'assert iniciais("  grace   brewster hopper ") == "GBH"' },
            { name: 'vazio', code: 'assert iniciais("") == ""' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e1-dec-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Escreva \`valida_cpf(cpf)\` que recebe uma string com 11 dígitos (pode conter "." e "-") e devolve True se os
            **dígitos verificadores** estão corretos. Regra: para o 1º dígito, multiplique os 9 primeiros por 10, 9, ..., 2,
            some, calcule \`(soma * 10) % 11\`; se der 10, vira 0. Para o 2º, faça o mesmo com os 10 primeiros e pesos 11..2.
            CPFs com todos os dígitos iguais são inválidos. **Decomponha** em funções auxiliares.
          `),
          difficulty: 'desafio',
          skills: ['logica-decomposicao', 'prog-loops'],
          hints: [
            'Quais são os subproblemas? (1) limpar a string, (2) calcular um dígito verificador, (3) juntar tudo.',
            'Uma auxiliar `digito(nums, peso_inicial)` pode calcular os dois dígitos: muda só o peso inicial (10 ou 11).',
            'Exemplo válido para testar: "529.982.247-25".',
          ],
          explanation: 'A mesma regra serve aos dois dígitos com pesos iniciais diferentes: perceber isso (padrão) e extrair uma auxiliar (decomposição) evita duplicação.',
          starter: 'def valida_cpf(cpf):\n    pass\n',
          solution: dedent(`
            def limpar(cpf):
                return [int(c) for c in cpf if c.isdigit()]

            def digito(nums, peso):
                soma = sum(n * p for n, p in zip(nums, range(peso, 1, -1)))
                d = (soma * 10) % 11
                return 0 if d == 10 else d

            def valida_cpf(cpf):
                nums = limpar(cpf)
                if len(nums) != 11 or len(set(nums)) == 1:
                    return False
                return digito(nums[:9], 10) == nums[9] and digito(nums[:10], 11) == nums[10]
          `),
          tests: [
            { name: 'CPF válido formatado', code: 'assert valida_cpf("529.982.247-25") is True' },
            { name: 'dígito errado', code: 'assert valida_cpf("529.982.247-26") is False' },
            { name: 'todos iguais', code: 'assert valida_cpf("111.111.111-11") is False' },
            { name: 'tamanho errado', code: 'assert valida_cpf("123") is False' },
          ],
        },
      },
    ],
    projeto: [md('**Projeto 2 — Lista de tarefas no terminal**: aplique a receita de projeto a cada função (adicionar, listar, concluir, remover). Ele começa no fim deste nível e cresce no Nível 2, quando você aprender listas e arquivos.'), { type: 'project', projectId: 'p2-todo' }],
    revisao: [md('- Receita: assinatura → propósito → exemplos → implementação → testes.\n- Exemplos antes do código revelam se você entendeu o problema.\n- Funções grandes ou que fazem "isto e aquilo" devem ser divididas.')],
  },
  review: [
    ['Quais são os 5 passos da receita de projeto?', 'Assinatura, propósito, exemplos, implementação e testes.'],
    ['Por que escrever exemplos antes do código?', 'Para garantir que entendeu o problema e já ter os testes prontos.'],
  ],
  references: ['htdp', 'waterloo-cs135', 'polya'],
});

export const level1: Level = {
  id: 'n1',
  number: 1,
  title: 'Lógica de Programação',
  titleEn: 'Programming Logic',
  goal: 'Pensar em algoritmos e expressá-los com variáveis, decisões, repetições e funções.',
  why: 'É o núcleo de todo programa, em qualquer linguagem. Aqui você já usa Python de verdade, com execução e feedback imediatos, porque o pseudocódigo sozinho não dá o retorno que faz o raciocínio amadurecer.',
  modules: [
    {
      id: 'm1-1', levelId: 'n1', title: 'Algoritmos e pensamento computacional', titleEn: 'Algorithms and computational thinking',
      description: 'O que é um algoritmo, pseudocódigo e as quatro ferramentas do pensamento computacional.',
      prerequisites: ['m0-1'],
      skills: [
        { id: 'logica-algoritmos', pt: 'Algoritmos', en: 'Algorithms' },
        { id: 'logica-pseudocodigo', pt: 'Pseudocódigo', en: 'Pseudocode' },
      ],
      outline: ['Propriedades de um algoritmo', 'Decomposição, padrões, abstração', 'Pseudocódigo', 'Método de Pólya'],
      lessons: [algoritmos],
      references: ['cs50', 'polya'],
    },
    {
      id: 'm1-2', levelId: 'n1', title: 'Variáveis, tipos, operadores e E/S', titleEn: 'Variables, types, operators and I/O',
      description: 'Guardar e transformar dados; conversar com o usuário.',
      prerequisites: ['m1-1'],
      skills: [
        { id: 'logica-variaveis', pt: 'Variáveis e atribuição', en: 'Variables and assignment' },
        { id: 'logica-tipos', pt: 'Tipos de dados', en: 'Data types' },
        { id: 'logica-operadores', pt: 'Operadores e expressões', en: 'Operators and expressions' },
        { id: 'logica-entrada-saida', pt: 'Entrada e saída', en: 'Input and output' },
      ],
      outline: ['Atribuição e modelo de memória', 'int, float, str, bool', 'Operadores e precedência', 'input, print e f-strings', 'Conversão de tipos'],
      lessons: [variaveis, tipos, entradaSaida],
      references: ['python-tutorial', 'pep8'],
    },
    {
      id: 'm1-3', levelId: 'n1', title: 'Condicionais', titleEn: 'Conditionals',
      description: 'Tomar decisões com if/elif/else e lógica booleana.',
      prerequisites: ['m1-2'],
      skills: [{ id: 'prog-condicionais', pt: 'Estruturas condicionais', en: 'Conditional statements' }],
      outline: ['if/elif/else', 'Condições compostas', 'Tabelas-verdade', 'Casos de borda'],
      lessons: [condicionais],
      references: ['python-tutorial'],
    },
    {
      id: 'm1-4', levelId: 'n1', title: 'Laços de repetição', titleEn: 'Loops',
      description: 'while, for, range e os padrões contador, acumulador e busca.',
      prerequisites: ['m1-3'],
      skills: [{ id: 'prog-loops', pt: 'Laços de repetição', en: 'Loops' }],
      outline: ['while e for', 'range', 'Contador, acumulador, busca', 'break e continue', 'Loops infinitos e off-by-one'],
      lessons: [loops],
      references: ['python-tutorial', 'cs50'],
    },
    {
      id: 'm1-5', levelId: 'n1', title: 'Funções e resolução de problemas', titleEn: 'Functions and problem solving',
      description: 'Funções, escopo e a receita de projeto para resolver problemas com método.',
      prerequisites: ['m1-4'],
      skills: [
        { id: 'prog-funcoes', pt: 'Funções', en: 'Functions' },
        { id: 'prog-escopo', pt: 'Escopo', en: 'Scope' },
        { id: 'logica-decomposicao', pt: 'Decomposição de problemas', en: 'Problem decomposition' },
      ],
      outline: ['def, parâmetros e return', 'print × return', 'Escopo e pilha de chamadas', 'Receita de projeto', 'Funções auxiliares'],
      lessons: [funcoes, decomposicao],
      references: ['htdp', 'cs61a', 'waterloo-cs135'],
    },
  ],
};

