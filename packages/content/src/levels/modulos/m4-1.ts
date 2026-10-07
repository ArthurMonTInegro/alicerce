/** Lições adicionais do módulo m4-1 (complexidade). */
import type { Lesson } from '../../types.ts';
import { code, dedent, deep, english, info, lesson, md, py, t, trace, warn } from '../../helpers.ts';

/* ------------------------------------------------------------------ */
/* Crescimento de funções: O, Ω e Θ                                    */
/* ------------------------------------------------------------------ */

const omegaTeta = lesson({
  id: 'l4-o-omega-teta',
  moduleId: 'm4-1',
  title: 'Crescimento de funções: O, Ω e Θ',
  titleEn: 'Growth of functions: O, Ω and Θ',
  summary: 'O que O, Ω e Θ afirmam de verdade, por que "qual caso" e "qual limite" são perguntas diferentes, como ordenar funções por crescimento e como somar laços em que o de dentro depende do de fora.',
  minutes: 45,
  objectives: [
    'Definir O, Ω e Θ com as constantes c e n₀ e usá-las para provar um limite simples',
    'Separar o eixo do caso (melhor, pior, médio) do eixo do limite (O, Ω, Θ)',
    'Ordenar funções comuns por crescimento e saber quando a base de um log ou de uma exponencial importa',
    'Somar as voltas de laços dependentes: triangular Θ(n²), dobrando Θ(n), harmônico Θ(n log n)',
  ],
  skills: ['alg-complexidade'],
  terms: [
    t('análise assintótica', 'asymptotic analysis', 'Estudo de como o custo se comporta quando n cresce sem limite, ignorando constantes e entradas pequenas.', 'Asymptotic analysis lets us compare algorithms independently of the machine.'),
    t('limite superior', 'upper bound', 'f(n) = O(g(n)): a partir de algum n₀, f(n) fica abaixo de c·g(n).', 'O(n²) is an upper bound on the running time, but not a tight one.'),
    t('limite inferior', 'lower bound', 'f(n) = Ω(g(n)): a partir de algum n₀, f(n) fica acima de c·g(n).', 'Any comparison sort has a lower bound of Ω(n log n) comparisons in the worst case.'),
    t('limite justo', 'tight bound', 'f(n) = Θ(g(n)): f é O(g) e Ω(g) ao mesmo tempo; cresce exatamente como g, a menos de constantes.', 'The worst-case running time of linear search is Θ(n).'),
    t('limite frouxo', 'loose bound', 'Limite verdadeiro, mas com folga, como dizer que n é O(n²).'),
    t('melhor caso', 'best case', 'A entrada de tamanho n que faz o algoritmo trabalhar menos.'),
    t('caso médio', 'average case', 'O custo médio sobre as entradas de tamanho n, supondo uma distribuição delas (por exemplo, todas igualmente prováveis).'),
    t('série harmônica', 'harmonic series', '1 + 1/2 + 1/3 + … + 1/n; cresce como ln n, por isso n/1 + n/2 + … + n/n é Θ(n log n).'),
  ],
  stages: {
    conceito: [
      md(`
        Na lição anterior você aprendeu a dizer "este código é O(n²)". Só que O(n²) é uma promessa do tipo **"no máximo"**: um algoritmo que sempre faz n passos também é O(n²). É como dizer que um Pix "cai em no máximo um dia": verdadeiro, mas esconde que ele cai em segundos. Para falar com precisão, a {{análise assintótica|asymptotic analysis}} usa três notações:

        - **O** (ó grande): {{limite superior|upper bound}}, "cresce no máximo como".
        - **Ω** (ômega): {{limite inferior|lower bound}}, "cresce no mínimo como".
        - **Θ** (teta): {{limite justo|tight bound}}, "cresce exatamente como, a menos de constantes".

        E existe uma segunda pergunta, independente da primeira: **de qual entrada estamos falando?** O {{melhor caso|best case}}, o pior caso e o {{caso médio|average case}} são funções diferentes, e cada uma pode receber O, Ω ou Θ. Misturar os dois eixos ("O é o pior caso, Ω é o melhor") é o erro mais comum do assunto, e entrevistadores sabem disso.

        Você também vai aprender a ordenar funções por crescimento e a somar laços em que o de dentro depende do de fora, onde a regra "aninhamento multiplica" erra feio.
      `),
    ],
    explicacao: [
      md(`
        ### As três definições
        Seja f(n) o custo que você quer descrever (por exemplo, o número de passos no pior caso) e g(n) uma função de referência, como n² ou n log n.

        - **f(n) = O(g(n))** se existem constantes c > 0 e n₀ tais que **f(n) ≤ c·g(n)** para todo n ≥ n₀.
        - **f(n) = Ω(g(n))** se existem constantes c > 0 e n₀ tais que **f(n) ≥ c·g(n)** para todo n ≥ n₀.
        - **f(n) = Θ(g(n))** se f(n) = O(g(n)) **e** f(n) = Ω(g(n)): existem c₁ > 0, c₂ > 0 e n₀ com c₁·g(n) ≤ f(n) ≤ c₂·g(n) para todo n ≥ n₀.

        O n₀ diz "a partir de algum tamanho": o que acontece com entradas pequenas não conta. A constante c diz "a menos de um fator fixo": é por isso que 3n² e n² ficam na mesma classe.

        Uma boa intuição é comparar com números: O é como ≤, Ω é como ≥ e Θ é como =. Veja as três aplicadas a f(n) = 3n² + 10n:
      `),
      {
        type: 'table',
        head: ['Afirmação', 'Verdadeira?', 'Por quê'],
        rows: [
          ['f(n) = O(n²)', 'sim', 'para n ≥ 10, 10n ≤ n², então f(n) ≤ 4n² (c = 4, n₀ = 10)'],
          ['f(n) = O(n³)', 'sim', 'f(n) ≤ n³ para n ≥ 5; verdadeiro, mas com muita folga'],
          ['f(n) = O(n)', 'não', 'f(n)/n = 3n + 10 cresce sem limite: nenhum c dá conta'],
          ['f(n) = Ω(n²)', 'sim', 'f(n) ≥ 3n² para todo n ≥ 1 (c = 3)'],
          ['f(n) = Ω(n)', 'sim', 'verdadeiro, mas com muita folga'],
          ['f(n) = Ω(n³)', 'não', 'f(n)/n³ = 3/n + 10/n² tende a 0'],
          ['f(n) = Θ(n²)', 'sim', 'é O(n²) e Ω(n²) ao mesmo tempo'],
        ],
        caption: 'Só Θ(n²) descreve o crescimento sem folga. O(n³) e Ω(n) são verdadeiros, mas dizem menos.',
      },
      md(`
        Um limite verdadeiro, mas com folga, é um {{limite frouxo|loose bound}}. Ele não está errado, só informa pouco. Quando alguém pergunta "qual a complexidade?", espera o limite mais justo que você consegue justificar.

        ### Como provar que algo **não** é O(g)
        Para mostrar que n² não é O(n), suponha que fosse: n² ≤ c·n para todo n ≥ n₀. Dividindo por n, sobra n ≤ c para todo n ≥ n₀, o que é falso assim que n passa de c. O padrão vale sempre: **se f(n)/g(n) cresce sem limite, f não é O(g)**.

        Na prática, dividir uma função pela outra resolve quase tudo:
        - f(n)/g(n) → 0: f cresce mais devagar. f = O(g), mas não Ω(g).
        - f(n)/g(n) → uma constante positiva: f = Θ(g).
        - f(n)/g(n) → ∞: f cresce mais rápido. f = Ω(g), mas não O(g).

        ### Dois eixos: qual entrada × qual limite
        Entradas diferentes com o mesmo tamanho n custam diferente. Por isso, primeiro escolha **qual função** descrever:

        - **pior caso**: o maior custo entre todas as entradas de tamanho n;
        - **melhor caso**: o menor custo entre todas as entradas de tamanho n;
        - **caso médio**: a média do custo, supondo uma distribuição das entradas.

        Só depois escolha a notação. Pegue \`tem_duplicado_lento\` da lição anterior: no pior caso (nenhum valor repetido) ela compara todos os pares; no melhor caso (\`xs[0] == xs[1]\`) ela para na primeira comparação.
      `),
      {
        type: 'table',
        head: ['Frase', 'Correta?', 'Comentário'],
        rows: [
          ['"O pior caso de tem_duplicado_lento é Θ(n²)"', 'sim', 'são n(n − 1)/2 comparações'],
          ['"O melhor caso de tem_duplicado_lento é Θ(1)"', 'sim', 'uma comparação, para todo n ≥ 2'],
          ['"tem_duplicado_lento é O(n²)"', 'sim', 'sem dizer o caso, vale para todas as entradas: nenhuma passa de c·n²'],
          ['"tem_duplicado_lento é Ω(1)"', 'sim', 'vale para todas as entradas (e informa pouco)'],
          ['"tem_duplicado_lento é Θ(n²)"', 'não', 'sem dizer o caso, promete n² para toda entrada; o melhor caso desmente'],
          ['"O pior caso é O(n²), mas não Ω(n²), porque Ω é do melhor caso"', 'não', 'o pior caso é uma função como outra qualquer: é O(n²), Ω(n²) e Θ(n²)'],
        ],
        caption: 'Sem dizer o caso, "o algoritmo é O(g)" e "o algoritmo é Ω(g)" valem para todas as entradas. "O algoritmo é Θ(g)" só é verdade quando o melhor e o pior caso têm a mesma ordem, como somar uma lista: Θ(n) sempre.',
      },
      info(`
        Como a lição anterior adiantou, quando um entrevistador pergunta "qual o Big O?", ele quase sempre quer o **Θ do pior caso**: o limite mais justo que vale para a pior entrada. Responder "O(2ⁿ)" para uma busca linear é tecnicamente verdadeiro e, ainda assim, uma resposta errada. Se o melhor e o pior caso forem diferentes, diga os dois: "O(n) no pior caso, O(1) no melhor".
      `, 'Na entrevista'),
      deep(`
        Ω também descreve **problemas**, não só algoritmos. "Ordenar comparando elementos exige Ω(n log n) comparações no pior caso" é uma afirmação sobre **qualquer** algoritmo, inclusive os que ainda não foram inventados (a prova aparece no módulo de ordenação). Dois limites inferiores simples aparecem toda hora:

        - **Ler a entrada**: se a resposta depende de todos os n elementos, nenhum algoritmo escapa de Ω(n). Achar o maior valor de uma lista desordenada é Θ(n), e não há o que melhorar.
        - **Escrever a saída**: se o problema pede para **listar** todos os pares, a saída tem n(n − 1)/2 itens, então ele é Ω(n²). Se pede só **quantos** pares existem, a saída é um número, e a fórmula n(n − 1)/2 responde em O(1).

        Um detalhe de notação: em f(n) = O(g(n)), o "=" quer dizer "pertence a". O(n²) é o **conjunto** das funções que crescem no máximo como n². Por isso o sinal só funciona num sentido: n = O(n²) é verdadeiro, mas escrever "O(n²) = n" não faz sentido.
      `, 'Limites de problemas e o "=" que não é igual'),
      md(`
        ### A escada do crescimento
        Para n grande, as funções que mais aparecem em algoritmos ficam nesta ordem, cada uma O da seguinte e não Ω dela:

        **1 < log n < √n < n < n log n < n² < n³ < 2ⁿ < n!**
      `),
      {
        type: 'table',
        head: ['n', 'log₂ n', '√n', 'n log₂ n', 'n²', 'n³', '2ⁿ', 'n!'],
        rows: [
          ['10', '3,3', '3,2', '33', '100', '1 000', '1 024', '3 628 800'],
          ['100', '6,6', '10', '664', '10 000', '10⁶', '≈ 1,3 × 10³⁰', '≈ 9,3 × 10¹⁵⁷'],
          ['1 000', '10', '31,6', '9 966', '10⁶', '10⁹', '≈ 1,1 × 10³⁰¹', '2 568 algarismos'],
        ],
        caption: 'Repare em n = 10: log₂ n ainda é maior que √n, e 2ⁿ quase empata com n³. A escada vale "para n grande" (o n₀ das definições): √n e log₂ n empatam em n = 16 e daí em diante √n fica sempre na frente; 2ⁿ e n² empatam em n = 4 e, de n = 5 em diante, 2ⁿ fica na frente.',
      },
      md(`
        Três regras evitam os erros mais comuns:

        1. **A base do logaritmo não importa.** log₂ n = log₁₀ n / log₁₀ 2 ≈ 3,32 · log₁₀ n: as duas diferem por um fator constante, então são Θ uma da outra. Por isso se escreve só O(log n). Pelo mesmo motivo, log(n²) = 2 log n = Θ(log n).
        2. **A base da exponencial importa.** 3ⁿ / 2ⁿ = 1,5ⁿ cresce sem limite, então 3ⁿ não é O(2ⁿ). Cuidado também com o expoente: 2ⁿ⁺¹ = 2 · 2ⁿ é Θ(2ⁿ), mas 2²ⁿ = 4ⁿ não é.
        3. **Logaritmo perde para qualquer potência de n.** (log n)³ = O(√n), mesmo que não pareça: com n = 10⁶, (log₂ n)³ ≈ 7 900 e √n = 1 000. A virada só acontece perto de n = 6 × 10⁸. É o n₀ das definições trabalhando.
      `),
      deep(`
        log(n!) = Θ(n log n). Por cima: n! = 1 · 2 · … · n ≤ nⁿ, logo log(n!) ≤ n log n. Por baixo (para n par): os n/2 maiores fatores, de n/2 + 1 até n, são todos maiores que n/2, então n! ≥ (n/2)^(n/2) e log(n!) ≥ (n/2) · log(n/2), que é Ω(n log n). Essa conta volta na prova de que ordenar por comparação exige Ω(n log n): existem n! ordens possíveis para n elementos.
      `, 'Uma conta que volta na ordenação'),
      md(`
        ### Somando laços: quando "aninhamento multiplica" erra
        A regra da lição anterior supõe que o laço de dentro dá sempre o mesmo número de voltas. Quando ele depende do de fora, **some as voltas de dentro**, uma parcela por volta do de fora. Quatro somas resolvem quase tudo:
      `),
      {
        type: 'table',
        head: ['Forma do laço', 'Soma das voltas de dentro', 'Total'],
        rows: [
          ['`for i in range(n)` com `for j in range(i)` dentro', '0 + 1 + 2 + … + (n − 1) = n(n − 1)/2', 'Θ(n²)'],
          ['`i = 1; while i < n:` com `for j in range(i)` dentro e `i *= 2` no fim', '1 + 2 + 4 + … + 2ᵏ, com 2ᵏ < n: menos de 2n', 'Θ(n)'],
          ['`for i in range(n)` com `j = 1; while j < n: j *= 2` dentro', 'n parcelas de ⌈log₂ n⌉', 'Θ(n log n)'],
          ['`for i in range(1, n + 1)` com `for j in range(0, n, i)` dentro', 'n/1 + n/2 + n/3 + … + n/n (arredondadas para cima)', 'Θ(n log n)'],
          ['`for x in a` com `for y in b` dentro (tamanhos n e m)', 'm voltas em cada uma das n', 'Θ(n · m)'],
        ],
      },
      md(`
        - **Triangular**: metade de n² ainda é Θ(n²). Percorrer só os pares i < j economiza metade do trabalho, mas não muda a classe.
        - **Dobrando**: dois laços aninhados e, mesmo assim, linear! Cada parcela é maior que a soma de todas as anteriores e a última é menor que n, então o total fica abaixo de 2n. Uma soma geométrica é dominada pelo seu maior termo.
        - **Harmônico**: a volta i do laço de fora faz cerca de n/i voltas dentro. A {{série harmônica|harmonic series}} 1 + 1/2 + 1/3 + … + 1/n vale cerca de ln n + 0,58 (ln é o logaritmo natural, na base e ≈ 2,718), então o total fica perto de n · ln n: Θ(n log n). É o custo de visitar os múltiplos de cada número de 1 a n. (O crivo de Eratóstenes faz isso só para os primos e fica ainda mais barato: Θ(n log log n).)
        - **Duas entradas**: se a lista de clientes tem n itens e a de produtos tem m, cruzar as duas custa Θ(n · m). Só escreva n² se os tamanhos forem iguais.
      `),
      warn(`
        O inverso também engana: um laço dentro do outro **não é automaticamente** Θ(n²). O laço que dobra, acima, é Θ(n). Na próxima lição você verá laços em que o de dentro pode rodar n vezes numa única volta e, mesmo assim, o total é Θ(n). Não conte laços: **conte voltas**.
      `, 'Não conte laços, conte voltas'),
    ],
    exemplo: [
      md(`
        Vamos aplicar tudo a \`tem_duplicado_lento\`, da lição anterior, contando as comparações \`xs[i] == xs[j]\`:
      `),
      code('python', `
        def tem_duplicado_lento(xs):
            for i in range(len(xs)):
                for j in range(i + 1, len(xs)):
                    if xs[i] == xs[j]:
                        return True
            return False
      `),
      md(`
        **Pior caso** (nenhum valor repetido): para i = 0 o laço de dentro faz n − 1 comparações, para i = 1 faz n − 2, e assim até i = n − 2, que faz 1. Somando: T_pior(n) = (n − 1) + (n − 2) + … + 1 = n(n − 1)/2.

        Agora prove que T_pior(n) = Θ(n²), achando as constantes:
        - **O(n²)**: n(n − 1)/2 ≤ n²/2 para todo n ≥ 1. Servem c = 1/2 e n₀ = 1.
        - **Ω(n²)**: n(n − 1)/2 ≥ n²/4 equivale a 2n² − 2n ≥ n², isto é, n² ≥ 2n, que vale para n ≥ 2. Servem c = 1/4 e n₀ = 2.

        **Melhor caso** (\`xs[0] == xs[1]\`): 1 comparação, qualquer que seja n ≥ 2. T_melhor(n) = 1 = Θ(1).

        Conclusão: o pior caso é Θ(n²), o melhor caso é Θ(1), e a função, sem dizer o caso, é O(n²) e Ω(1). Confira as constantes com números:
      `),
      {
        type: 'table',
        head: ['n', 'n²/4', 'T_pior(n) = n(n − 1)/2', 'n²/2', 'T_melhor(n)'],
        rows: [
          ['2', '1', '1', '2', '1'],
          ['4', '4', '6', '8', '1'],
          ['10', '25', '45', '50', '1'],
          ['1 000', '250 000', '499 500', '500 000', '1'],
        ],
        caption: 'A partir de n = 2, T_pior(n) fica sempre entre n²/4 e n²/2: é exatamente isso que Θ(n²) afirma.',
      },
      md(`
        Agora um laço aninhado que engana. Siga o rastreamento e conte quantas vezes \`passos += 1\` roda com n = 8:
      `),
      trace(`
        n = 8
        passos = 0
        i = 1
        while i < n:
            for j in range(i):
                passos += 1
            i *= 2
        print(passos)
      `, 'i vale 1, 2 e 4: o laço de dentro roda 1 + 2 + 4 = 7 vezes, menos que n. Com n = 1 024 seriam 1 + 2 + … + 512 = 1 023: sempre menos que 2n.'),
    ],
    codigo: [
      py(`
        import math

        def triangular(n):      # for i in range(n): for j in range(i): ...
            return sum(len(range(i)) for i in range(n))

        def dobrando(n):        # i = 1; while i < n: (for j in range(i): ...); i *= 2
            total, i = 0, 1
            while i < n:
                total += len(range(i))
                i *= 2
            return total

        def log_dentro(n):      # for i in range(n): (j = 1; while j < n: j *= 2)
            voltas, j = 0, 1
            while j < n:
                j *= 2
                voltas += 1
            return n * voltas

        def harmonico(n):       # for i in range(1, n + 1): for j in range(0, n, i): ...
            return sum(len(range(0, n, i)) for i in range(1, n + 1))

        def br(x):              # 1234567 -> "1.234.567"
            return f"{x:,}".replace(",", ".")

        print(f"{'forma':<11} {'T(10 000)':>12} {'T(20 000)':>12}  razão")
        for nome, f in [("triangular", triangular), ("dobrando", dobrando),
                        ("log dentro", log_dentro), ("harmônico", harmonico)]:
            a, b = f(10_000), f(20_000)
            razao = f"{b / a:.2f}".replace(".", ",")
            print(f"{nome:<11} {br(a):>12} {br(b):>12}  {razao}")

        n = 10_000
        print("conferindo: n(n - 1)/2 =", br(n * (n - 1) // 2), "| n·ln(n) ≈", br(round(n * math.log(n))))
      `, { caption: 'Em vez de rodar o laço de dentro, somamos quantas voltas ele daria (len(range(...))). Dobrar n multiplica o total por ~4 no triangular (Θ(n²)), por 2 no dobrando (Θ(n)) e por um pouco mais de 2 nos dois Θ(n log n). O harmônico fica um pouco acima de n·ln n porque 1 + 1/2 + … + 1/n ≈ ln n + 0,58 e cada laço de dentro arredonda para cima.' }),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e4-oth-1',
          kind: 'mcq',
          prompt: 'A busca linear (`x in lista`) faz 1 comparação quando x está na primeira posição e n comparações quando x não está na lista. Qual afirmação está correta?',
          difficulty: 'facil',
          skills: ['alg-complexidade'],
          hints: [
            'Melhor caso e pior caso são limites ou são funções?',
            'Quantas comparações a busca faz no pior caso? Esse número fica acima de c·n para algum c > 0?',
            'Uma frase sobre o algoritmo inteiro, sem dizer o caso, precisa valer para quais entradas?',
          ],
          explanation: 'Melhor, pior e caso médio são funções diferentes; O, Ω e Θ são limites que servem para qualquer uma delas. O pior caso da busca linear é n comparações: Θ(n), logo também O(n) e Ω(n). O melhor caso é 1 comparação: Θ(1). Uma afirmação sobre o algoritmo inteiro precisa valer para todas as entradas: por isso ele é O(n) (nenhuma entrada passa de n comparações) e Ω(1) (nenhuma fica abaixo de 1), mas não é Θ(n) nem O(1) sem dizer o caso.',
          options: [
            { text: 'O melhor caso é Θ(1) e o pior caso é Θ(n); por isso a busca linear, sem dizer o caso, é O(n) e Ω(1).', correct: true, feedback: 'Isso. Cada caso tem seu Θ, e as afirmações sem caso precisam cobrir todas as entradas: o pior caso dá o O e o melhor caso dá o Ω.' },
            { text: 'O pior caso da busca linear é O(n), mas não é Ω(n), porque Ω é reservado para o melhor caso.', feedback: 'Ω não pertence a caso nenhum: é um limite inferior que vale para qualquer função. O pior caso é exatamente n comparações, que é Ω(n) (e também O(n), logo Θ(n)).' },
            { text: 'A busca linear é Θ(n) para qualquer entrada.', feedback: 'Não para qualquer entrada: se x está na primeira posição, ela para em 1 comparação. Θ(n) vale para o pior caso (e para o caso médio), não para todos.' },
            { text: 'Como o melhor caso é O(1), a busca linear é O(1).', feedback: 'Dizer que o algoritmo é O(1), sem qualificar, promete tempo constante para toda entrada. A entrada em que x não está na lista desmente isso.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e4-oth-2',
          kind: 'parsons',
          lang: 'text',
          prompt: 'Ordene as funções da que cresce **mais devagar** (no topo) para a que cresce **mais rápido**, pensando em n grande.',
          difficulty: 'intermediario',
          skills: ['alg-complexidade'],
          hints: [
            'Para comparar duas funções, divida uma pela outra: se f(n)/g(n) vai para 0, f vem antes.',
            'Qualquer potência de log n perde para qualquer potência de n, até para √n. Isso só aparece para n bem grande, então não confie em contas com n pequeno.',
            'Compare n / log n, n log n e n √n dividindo as três por n. O que sobra de cada uma?',
            'Entre exponenciais, a base importa. E n! = 1 · 2 · 3 · … · n: a partir de qual fator cada multiplicação passa a ser por mais de 3?',
          ],
          explanation: '(log n)³ vem antes de √n porque log perde para qualquer potência de n (a virada só acontece perto de n = 6 × 10⁸). √n < n / log n porque, dividindo as duas por √n, sobra 1 contra √n / log n, que cresce sem limite. Dividindo o trio do meio por n, sobram 1/log n < log n < √n, então n / log n < n log n < n√n. Depois, n√n = n^1,5 < n², toda exponencial vence qualquer polinômio, 3ⁿ / 2ⁿ = 1,5ⁿ → ∞, e n! vence 3ⁿ porque, a partir do fator 4, cada fator multiplica por mais de 3.',
          lines: ['(log n)³', '√n', 'n / log n', 'n log n', 'n √n', 'n²', '2ⁿ', '3ⁿ', 'n!'],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e4-oth-3',
          kind: 'predict',
          lang: 'python',
          prompt: 'O que é impresso? Conte as voltas em vez de multiplicar laços.',
          difficulty: 'intermediario',
          skills: ['alg-complexidade', 'prog-loops'],
          hints: [
            'O while depende de i? Quantas voltas ele dá, sempre, para um mesmo n?',
            'Para n = 10, anote o valor de j antes de cada teste do while. Em quantos desses testes a condição foi verdadeira?',
            'Para n = 1 000, quantas vezes dá para dobrar a partir de 1 antes de chegar a 1 000 ou mais?',
          ],
          explanation: 'O while não depende de i: ele sempre dobra j a partir de 1 até chegar a n ou mais, o que leva ⌈log₂ n⌉ voltas (4 para n = 10, porque 2⁴ = 16 é a primeira potência ≥ 10; 10 para n = 1 000, porque 2¹⁰ = 1 024). O for repete isso n vezes: 10 × 4 = 40 e 1 000 × 10 = 10 000. Total: n · ⌈log₂ n⌉ = Θ(n log n).',
          code: dedent(`
            def conta(n):
                passos = 0
                for i in range(n):
                    j = 1
                    while j < n:
                        j *= 2
                        passos += 1
                return passos

            print(conta(10), conta(1000))
          `),
          answer: '40 10000',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e4-oth-4',
          kind: 'mcq',
          prompt: 'Quantas vezes `passos += 1` executa, em Θ, em função de n?',
          code: {
            lang: 'python',
            code: dedent(`
              def f(n):
                  passos = 0
                  for i in range(1, n + 1):
                      for j in range(0, n, i * i):
                          passos += 1
                  return passos
            `),
          },
          difficulty: 'avancado',
          skills: ['alg-complexidade'],
          hints: [
            'Quantas voltas o laço de dentro dá para i = 1? E para i = 2 e i = 3?',
            'Escreva a soma n/1 + n/4 + n/9 + … Ela cresce sem limite, como a série harmônica, ou fica abaixo de algum valor fixo?',
            'Para i bem grande, `range(0, n, i * i)` fica vazio ou ainda tem algum elemento?',
          ],
          explanation: 'A volta i faz ⌈n/i²⌉ iterações: n, ⌈n/4⌉, ⌈n/9⌉, … A soma 1 + 1/4 + 1/9 + … nunca passa de π²/6 ≈ 1,645 (dá para ver que ela é limitada sem saber esse valor: para i ≥ 2, 1/i² < 1/(i − 1) − 1/i, e somando esses termos tudo se cancela em cadeia e sobra menos de 1; logo a soma toda fica abaixo de 2), então o total fica entre n (o for de fora dá n voltas e cada uma roda pelo menos uma vez, porque o range sempre contém o 0) e 1,645n + n. É Θ(n). Compare com o passo i: lá, 1 + 1/2 + 1/3 + … cresce como ln n e o total é Θ(n log n). Um detalhe no passo muda a classe.',
          options: [
            { text: 'Θ(n log n)', feedback: 'Seria se o passo fosse i (série harmônica). Com passo i², a volta i dá cerca de n/i² iterações, e 1 + 1/4 + 1/9 + … não cresce sem limite: fica abaixo de 1,645.' },
            { text: 'Θ(n)', correct: true, feedback: 'Isso. n/1 + n/4 + n/9 + … < 1,645n, mais no máximo 1 por volta pelo arredondamento: menos de 2,65n. E o for de fora, sozinho, já garante pelo menos n.' },
            { text: 'Θ(n²)', feedback: 'n² é um limite superior verdadeiro, mas frouxo: só a primeira volta (i = 1) faz n iterações. As seguintes caem depressa: n/4, n/9, n/16…' },
            { text: 'Θ(√n), porque para i > √n o laço de dentro não roda', feedback: 'Ele roda uma vez: `range(0, n, passo)` sempre contém o 0 quando n ≥ 1. Além disso, o for de fora dá n voltas de qualquer jeito, então o total é pelo menos n.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e4-oth-5',
          kind: 'code',
          lang: 'python',
          prompt: 'O jeito ingênuo de procurar três números que somam zero numa lista de n elementos testa todos os trios de posições i < j < k com três laços: `for i in range(n)`, dentro dele `for j in range(i + 1, n)` e, dentro deste, `for k in range(j + 1, n)`. Escreva `contar_trios(n)` que devolve **exatamente** quantas vezes o corpo do laço mais interno executa, em O(1): sem laços, sem compreensões, sem `range`, `sum` ou `map` e sem recursão. O resultado deve ser um `int`.',
          difficulty: 'intermediario',
          skills: ['alg-complexidade'],
          hints: [
            'Quantas vezes o corpo roda para n = 3? E para n = 4 e n = 5? Monte uma tabela pequena à mão.',
            'Cada execução corresponde a uma escolha de 3 posições distintas entre n, sem importar a ordem. Você já viu essa contagem em algum lugar?',
            'Se a ordem importasse, quantas opções haveria para a 1ª posição, para a 2ª e para a 3ª? E de quantas ordens diferentes dá para escrever o mesmo trio?',
            'Use divisão inteira (//) para o resultado continuar int.',
          ],
          explanation: 'O corpo roda uma vez para cada trio i < j < k, isto é, para cada escolha de 3 posições entre n sem importar a ordem: C(n, 3) = n(n − 1)(n − 2)/6 (math.comb(n, 3) dá o mesmo). É Θ(n³), com constante 1/6: com n = 1 000 são 166 167 000 trios, não 10⁹. A constante não muda a classe, mas explica por que esse código é cerca de 6 vezes mais rápido que três laços completos de 0 a n.',
          starter: dedent(`
            def contar_trios(n):
                # devolva quantas vezes o laço mais interno roda (trios i < j < k < n),
                # usando uma fórmula, sem laços
                pass
          `),
          solution: dedent(`
            def contar_trios(n):
                return n * (n - 1) * (n - 2) // 6
          `),
          tests: [
            { name: 'casos pequenos', code: 'for n, esperado in [(0, 0), (1, 0), (2, 0), (3, 1), (4, 4), (5, 10)]:\n    r = contar_trios(n)\n    assert r == esperado, f"contar_trios({n}) deveria ser {esperado}; veio {r}. Liste os trios à mão para conferir."' },
            {
              name: 'confere com os três laços',
              code: dedent(`
                for n in range(40):
                    total = 0
                    for i in range(n):
                        for j in range(i + 1, n):
                            for k in range(j + 1, n):
                                total += 1
                    r = contar_trios(n)
                    assert r == total, f"para n = {n} os laços rodam {total} vezes; contar_trios devolveu {r}"
              `),
            },
            {
              name: 'fórmula, sem laços',
              code: dedent(`
                import ast
                arvore = ast.parse(_source)
                laco = (ast.For, ast.While, ast.ListComp, ast.SetComp, ast.DictComp, ast.GeneratorExp)
                achou = [type(no).__name__ for no in ast.walk(arvore) if isinstance(no, laco)]
                assert not achou, "use uma fórmula: nada de for, while ou compreensões"
                nomes = set()
                for no in ast.walk(arvore):
                    if isinstance(no, ast.Call):
                        if isinstance(no.func, ast.Name):
                            nomes.add(no.func.id)
                        elif isinstance(no.func, ast.Attribute):
                            nomes.add(no.func.attr)
                proibidas = nomes & {"range", "sum", "map", "combinations", "permutations", "product", "contar_trios"}
                assert not proibidas, "use uma fórmula: sem " + ", ".join(sorted(proibidas))
              `),
            },
            {
              name: 'n enorme, resultado exato e inteiro',
              code: dedent(`
                import ast
                laco = (ast.For, ast.While, ast.ListComp, ast.SetComp, ast.DictComp, ast.GeneratorExp)
                gera = {"range", "sum", "map", "combinations", "permutations", "product", "contar_trios"}
                for no in ast.walk(ast.parse(_source)):
                    chamada = isinstance(no, ast.Call) and getattr(no.func, "id", getattr(no.func, "attr", None)) in gera
                    if isinstance(no, laco) or chamada:
                        raise AssertionError("contando um por um, n = 1 000 000 levaria horas: este teste só roda com uma fórmula")
                for n, esperado in [(10 ** 6, 166666166667000000), (1234567, 313611288304333155)]:
                    r = contar_trios(n)
                    assert isinstance(r, int), f"o resultado deve ser int, veio {type(r).__name__}: use // em vez de /"
                    assert r == esperado, f"para n = {n} esperava {esperado}; veio {r}. Se você usou / e depois int() ou round(), o float perdeu precisão (ele guarda só uns 16 algarismos): faça a conta toda com inteiros e divida com // no fim."
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
          id: 'e4-oth-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Escreva \`soma_divisores_ate(n)\` que devolve uma lista \`s\` de tamanho n + 1 em que \`s[0] = 0\` e, para 1 ≤ k ≤ n, \`s[k]\` é a soma de **todos** os divisores positivos de k, incluindo 1 e o próprio k. Exemplos: s[6] = 1 + 2 + 3 + 6 = 12 e s[7] = 1 + 7 = 8. Um número é **perfeito** quando s[k] = 2k, como 6 e 28.

            Testar, para cada k, todos os candidatos de 1 a k custa Θ(n²); testar só até √k ainda custa Θ(n√n). Exija **Θ(n log n)**. Para medir sem depender da velocidade do computador, um dos testes conta quantas linhas do seu código são executadas com n = 30 000. A versão que testa até √k passa de 3 milhões de linhas, a forma esperada fica perto de 700 mil e o limite é 2,5 milhões.
          `),
          difficulty: 'desafio',
          skills: ['alg-complexidade', 'prog-listas'],
          hints: [
            'Na versão lenta, cada número k sai procurando os próprios divisores. Quem "sabe" de antemão quais números ele divide?',
            'Pense no laço ao contrário: em vez de perguntar "quais d dividem k?", pergunte "quais k são divisíveis por d?". Como listar esses k sem testar nenhuma divisão?',
            'Quantas vezes o seu laço de dentro roda para d = 1? E para d = 2? E para d qualquer? Que soma da lição aparece?',
            'Comece com uma lista de zeros e vá acumulando contribuições nela.',
          ],
          explanation: 'Em vez de cada k procurar seus divisores, cada d visita seus múltiplos d, 2d, 3d, … até n e soma d em cada um. A volta d faz ⌊n/d⌋ passos: n/1 + n/2 + … + n/n = n vezes a série harmônica, Θ(n log n). Com n = 100 000 isso dá cerca de 1,2 milhão de passos, contra uns 21 milhões testando até √k e 5 bilhões testando todos os candidatos. Trocar "quem procura quem" é uma técnica que reaparece em crivos e em contagens sobre múltiplos.',
          starter: dedent(`
            def soma_divisores_ate(n):
                # devolva s com s[0] = 0 e s[k] = soma dos divisores de k, para k de 1 a n
                pass
          `),
          solution: dedent(`
            def soma_divisores_ate(n):
                s = [0] * (n + 1)
                for d in range(1, n + 1):
                    for multiplo in range(d, n + 1, d):
                        s[multiplo] += d
                return s
          `),
          tests: [
            { name: 'primeiros valores', code: 'r = soma_divisores_ate(12)\nassert r == [0, 1, 3, 4, 7, 6, 12, 8, 15, 13, 18, 12, 28], f"para n = 12 esperava [0, 1, 3, 4, 7, 6, 12, 8, 15, 13, 18, 12, 28]; veio {r}"' },
            { name: 'bordas: n = 0 e n = 1', code: 'assert soma_divisores_ate(0) == [0], "com n = 0 a lista é só [0]"\nassert soma_divisores_ate(1) == [0, 1], "o único divisor de 1 é o próprio 1: esperado [0, 1]"' },
            {
              name: 'primos e números perfeitos',
              code: dedent(`
                s = soma_divisores_ate(500)
                assert len(s) == 501, f"com n = 500 a lista deve ter n + 1 = 501 posições; veio {len(s)}"
                for p in [2, 3, 5, 7, 11, 97, 499]:
                    assert s[p] == p + 1, f"{p} é primo: seus divisores são 1 e {p}, soma {p + 1}; veio {s[p]}"
                for k in [6, 28, 496]:
                    assert s[k] == 2 * k, f"{k} é perfeito: s[{k}] deveria ser {2 * k}; veio {s[k]}"
              `),
            },
            {
              name: 'confere com a definição',
              code: dedent(`
                s = soma_divisores_ate(300)
                for k in range(1, 301):
                    esperado = sum(d for d in range(1, k + 1) if k % d == 0)
                    assert s[k] == esperado, f"s[{k}] deveria ser {esperado}; veio {s[k]}"
              `),
            },
            {
              name: 'precisa ser Θ(n log n)',
              code: dedent(`
                import sys

                class _Excedeu(Exception):
                    pass

                _limite = 2_500_000
                _linhas = 0

                def _conta_linhas(quadro, evento, arg):
                    global _linhas
                    if quadro.f_code.co_filename != "main.py":
                        return None
                    if evento == "line":
                        _linhas += 1
                        if _linhas > _limite:
                            raise _Excedeu()
                    return _conta_linhas

                _s = None
                sys.settrace(_conta_linhas)
                try:
                    _s = soma_divisores_ate(30000)
                except _Excedeu:
                    pass
                finally:
                    sys.settrace(None)
                assert _linhas <= _limite, "com n = 30 000 seu código executou mais de 2,5 milhões de linhas: ainda há testes de divisão demais. Releia a forma harmônica da lição."
                assert _s[30000] == 96844, f"s[30000] deveria ser 96844; veio {_s[30000]}"
              `),
            },
          ],
        },
      },
    ],
    revisao: [
      md(`
        - **O** é limite superior (≤), **Ω** é limite inferior (≥) e **Θ** exige os dois (=), sempre a menos de constantes e a partir de algum n₀.
        - Caso (melhor, pior, médio) e limite (O, Ω, Θ) são eixos diferentes: primeiro diga **de qual função** está falando, depois dê o limite.
        - Sem dizer o caso, "é O(g)" e "é Ω(g)" valem para todas as entradas; "é Θ(g)" só quando melhor e pior caso têm a mesma ordem.
        - Escada: 1 < log n < √n < n < n log n < n² < n³ < 2ⁿ < n!. A base do log não importa; a da exponencial importa.
        - Laços dependentes: some as voltas. Triangular → Θ(n²); dobrando → Θ(n); harmônico → Θ(n log n); duas entradas → Θ(n · m).
      `),
      english(`
        - **upper bound / lower bound / tight bound**: limite superior / inferior / justo
        - **big-O, big-Omega, big-Theta**: O grande, ômega grande, teta grande
        - **best case / worst case / average case**: melhor caso / pior caso / caso médio
        - **asymptotically**: assintoticamente ("para n grande")
        - **loose bound**: limite frouxo

        Frase típica de entrevista: *"In the worst case, when there are no duplicates, we compare every pair, so it's Θ(n²); in the best case it returns after a single comparison."*

        Em livros e documentação: *"f(n) = O(g(n)) means that f grows no faster than g, up to a constant factor, for all sufficiently large n."*
      `),
    ],
  },
  review: [
    ['O que significa f(n) = O(g(n)), com as constantes?', 'Existem c > 0 e n₀ tais que f(n) ≤ c·g(n) para todo n ≥ n₀: f cresce no máximo como g.'],
    ['Qual a diferença entre Ω e Θ?', 'Ω é limite inferior (f(n) ≥ c·g(n) a partir de n₀). Θ é O e Ω ao mesmo tempo: o crescimento exato, a menos de constantes.'],
    ['Por que "O é o pior caso e Ω é o melhor caso" está errado?', 'O, Ω e Θ são limites e servem para qualquer função. Pior, melhor e caso médio são funções diferentes: o pior caso da busca linear, por exemplo, é O(n), Ω(n) e Θ(n).'],
    ['Por que log₂ n e log₁₀ n são da mesma classe, mas 2ⁿ e 3ⁿ não?', 'Os logs diferem por um fator constante (log₂ n ≈ 3,32 · log₁₀ n). Já 3ⁿ / 2ⁿ = 1,5ⁿ cresce sem limite.'],
    ['Quanto custa um laço externo em que i dobra (1, 2, 4, … < n) com um laço interno de i voltas?', 'Θ(n): 1 + 2 + 4 + … + 2ᵏ < 2n. A soma geométrica é dominada pelo maior termo.'],
    ['Quanto custa visitar, para cada i de 1 a n, os índices de range(0, n, i)?', 'Θ(n log n): n/1 + n/2 + … + n/n é n vezes a série harmônica, que cresce como ln n.'],
  ],
  references: ['clrs', 'mit-6042', 'stanford-cs161', 'rosen-discrete', 'sedgewick-algs'],
});

/* ------------------------------------------------------------------ */
/* Análise amortizada                                                  */
/* ------------------------------------------------------------------ */

const amortizada = lesson({
  id: 'l4-analise-amortizada',
  moduleId: 'm4-1',
  title: 'Análise amortizada: o custo pelo total',
  titleEn: 'Amortized analysis: paying for the whole sequence',
  summary: 'Os métodos agregado, contábil e do potencial aplicados ao contador binário, à fila com duas pilhas e à pilha monotônica: como provar que um laço dentro de outro ainda pode ser O(n), e quando essa conta deixa de valer.',
  minutes: 50,
  objectives: [
    'Aplicar o método agregado: somar o custo de uma sequência inteira em vez de multiplicar o pior caso por n',
    'Provar O(1) amortizado com créditos (método contábil) e com uma função potencial',
    'Reconhecer o padrão "cada elemento entra uma vez e sai no máximo uma vez" em pilhas monotônicas, filas com duas pilhas e janelas deslizantes',
    'Identificar operações que quebram uma garantia amortizada',
  ],
  skills: ['alg-complexidade'],
  terms: [
    t('análise amortizada', 'amortized analysis', 'Limitar o custo total de qualquer sequência de n operações e dividir por n. Não envolve probabilidade.', 'Amortized analysis guarantees the average performance of each operation in the worst case.'),
    t('método agregado', 'aggregate method', 'Somar diretamente o custo real de toda a sequência e dividir pelo número de operações.'),
    t('método contábil', 'accounting method', 'Cobrar um preço fixo de cada operação e guardar o troco como crédito, que paga as operações caras.'),
    t('método do potencial', 'potential method', 'Medir o "trabalho acumulado" do estado com uma função Φ ≥ 0; custo amortizado = custo real + variação de Φ.', 'We define a potential function Φ that maps each state of the data structure to a nonnegative number.'),
    t('contador binário', 'binary counter', 'Lista de bits que representa um número e só sabe somar 1; um incremento zera os bits 1 menos significativos (os da direita) e liga o primeiro 0 depois deles.'),
    t('fila com duas pilhas', 'queue with two stacks', 'Fila FIFO feita com uma pilha de entrada e uma de saída; a entrada só é despejada na saída quando a saída está vazia.', 'Implement a queue using two stacks with amortized O(1) operations.'),
    t('pilha monotônica', 'monotonic stack', 'Pilha cujos valores ficam sempre em ordem (por exemplo, nunca aumentam de baixo para cima); quem quebraria a ordem desempilha os outros antes de entrar.', 'Use a monotonic stack to find the next greater element for every index in O(n).'),
    t('janela deslizante', 'sliding window', 'Trecho contíguo [ini, fim] que percorre a sequência com os dois índices só andando para a frente, nunca para trás.'),
    t('fila monotônica', 'monotonic queue', 'Deque de candidatos com valores em ordem; dá o máximo (ou o mínimo) de uma janela deslizante em O(1) amortizado.'),
  ],
  stages: {
    conceito: [
      md(`
        No nível 3 você viu que o \`append\` da lista é **O(1) amortizado**: de vez em quando ele copia tudo, mas as cópias somam menos que 2n. Essa ideia, a {{análise amortizada|amortized analysis}}, vale muito além do \`append\`: em vez de multiplicar o pior caso de **uma** operação por n, você limita o custo **total** de qualquer sequência de n operações.

        Pense na louça de casa. Tem dia em que a pia está lotada e você lava 30 pratos de uma vez; tem dia em que lava um só. Mas cada prato sujo é lavado **uma vez**. No fim do mês, as lavagens somam exatamente o número de pratos usados, por mais desiguais que tenham sido os dias.

        A mesma conta derruba uma intuição perigosa: **um \`while\` dentro de um \`for\` não é automaticamente O(n²)**. Se o laço de dentro só consome coisas que o de fora produziu, e cada coisa só pode ser consumida uma vez, o total do laço de dentro fica limitado pelo total produzido.
      `),
    ],
    explicacao: [
      md(`
        ### Três jeitos de fazer a conta
      `),
      {
        type: 'table',
        head: ['Método', 'Como funciona', 'Quando é mais fácil'],
        rows: [
          ['Agregado', 'Some o custo real das n operações de uma vez e divida por n.', 'Quando dá para contar diretamente quantas vezes cada coisa acontece.'],
          ['Contábil', 'Cobre um preço fixo de cada operação; o troco vira crédito guardado na estrutura e paga as operações caras. O crédito nunca pode ficar negativo.', 'Quando dá para "pendurar" o crédito em cada elemento.'],
          ['Potencial', 'Escolha uma função Φ do estado (Φ ≥ 0, começando em 0). Custo amortizado = custo real + variação de Φ.', 'Quando o crédito depende do estado inteiro, não de um elemento só.'],
        ],
        caption: 'Os três chegam ao mesmo resultado; use o que deixar a conta mais curta. Os nomes são os do CLRS.',
      },
      md(`
        ### 1. Método agregado: o contador binário
        Um {{contador binário|binary counter}} de k bits guarda um número em binário e só sabe somar 1. O custo de um incremento é o número de bits que ele troca:
      `),
      code('python', `
        def incrementar(bits):          # bits[0] é o bit menos significativo
            i = 0                       # (supõe que o contador não estoura)
            while bits[i] == 1:
                bits[i] = 0             # 1 vira 0 e "vai um"
                i += 1
            bits[i] = 1
            return i + 1                # quantos bits mudaram
      `),
      md(`
        O pior caso de **um** incremento troca os k bits: 0111…1 vira 1000…0. A conta ingênua daria n incrementos × k bits = O(n·k). Mas veja quem troca, e quando:
      `),
      {
        type: 'table',
        head: ['Incremento', 'Antes', 'Depois', 'Bits trocados'],
        rows: [
          ['1º', '0000', '0001', '1'],
          ['2º', '0001', '0010', '2'],
          ['3º', '0010', '0011', '1'],
          ['4º', '0011', '0100', '3'],
          ['5º', '0100', '0101', '1'],
          ['6º', '0101', '0110', '2'],
          ['7º', '0110', '0111', '1'],
          ['8º', '0111', '1000', '4'],
        ],
        caption: '15 trocas em 8 incrementos, menos que 2 × 8. O mais caro trocou 4 bits, mas metade deles trocou só 1.',
      },
      md(`
        O bit 0 troca em **todo** incremento; o bit 1, a cada 2; o bit 2, a cada 4; o bit j, a cada 2ʲ. Em n incrementos, o total de trocas é no máximo n + n/2 + n/4 + … < **2n**. (A conta exata dá 2n menos a quantidade de bits 1 de n: para n = 8, 16 − 1 = 15.) Logo, cada incremento custa **O(1) amortizado**, mesmo que um deles, sozinho, custe k.

        Esse é o {{método agregado|aggregate method}}: contar o total diretamente. O hodômetro do carro é o mesmo contador em base 10: o dígito das unidades muda a cada quilômetro, o das dezenas a cada 10, o das centenas a cada 100. A virada de 099 999 para 100 000 mexe em seis dígitos, mas a média fica abaixo de 1,12 dígito por quilômetro (1 + 1/10 + 1/100 + … = 10/9).

        ### 2. Método contábil: a fila com duas pilhas
        Dá para montar uma fila (FIFO) com duas pilhas (LIFO): a {{fila com duas pilhas|queue with two stacks}}. A pilha \`entrada\` recebe quem chega; a pilha \`saida\` entrega quem sai. Para desenfileirar, se \`saida\` estiver vazia, despeje **toda** a \`entrada\` nela, um elemento por vez: a ordem se inverte e o mais antigo fica no topo. Se \`saida\` não estiver vazia, basta tirar o topo dela.

        Contando cada \`append\` ou \`pop\` como 1 passo:
      `),
      {
        type: 'table',
        head: ['Operação', 'entrada', 'saida', 'Passos'],
        rows: [
          ['enfileirar(1)', '[1]', '[]', '1'],
          ['enfileirar(2)', '[1, 2]', '[]', '1'],
          ['enfileirar(3)', '[1, 2, 3]', '[]', '1'],
          ['desenfileirar() → 1', '[]', '[3, 2]', '3 transferências (6) + 1 pop = 7'],
          ['enfileirar(4)', '[4]', '[3, 2]', '1'],
          ['desenfileirar() → 2', '[4]', '[3]', '1'],
          ['desenfileirar() → 3', '[4]', '[]', '1'],
          ['desenfileirar() → 4', '[]', '[]', '1 transferência (2) + 1 pop = 3'],
        ],
        caption: 'O topo de cada pilha é o fim da lista. Total: 16 passos para 4 elementos, exatamente 4 por elemento, embora um único desenfileirar tenha custado 7.',
      },
      md(`
        No {{método contábil|accounting method}}, cobre **3 passos** de cada \`enfileirar\`: 1 paga o \`append\` na entrada e 2 ficam guardados no próprio elemento como crédito. Cada \`desenfileirar\` paga **1**: o \`pop\` da saída. A transferência de um elemento (um \`pop\` da entrada e um \`append\` na saída) custa exatamente os 2 de crédito que ele carrega, e acontece **no máximo uma vez** por elemento, porque nada volta da saída para a entrada. O crédito nunca falta, então n operações custam no máximo 3n passos: as duas operações são **O(1) amortizado**, embora um \`desenfileirar\` sozinho possa custar O(n).
      `),
      deep(`
        No {{método do potencial|potential method}}, em vez de guardar crédito em cada elemento, você mede o "trabalho acumulado" do estado inteiro com uma função Φ (fi), que começa em 0 e nunca fica negativa. Então define:

        **custo amortizado = custo real + (Φ depois − Φ antes)**

        Somando n operações, as variações de Φ se cancelam em cadeia e sobra: soma dos amortizados = soma dos reais + Φ final − Φ inicial. Como Φ final ≥ 0 = Φ inicial, a soma dos amortizados limita a soma dos reais. Basta mostrar que cada operação tem custo amortizado pequeno.

        - **Contador**, com Φ = número de bits 1: um incremento que zera t bits e liga 1 custa t + 1 e muda Φ em 1 − t. Amortizado: (t + 1) + (1 − t) = **2**.
        - **Fila com duas pilhas**, com Φ = 2 × tamanho da entrada: enfileirar custa 1 + 2 = **3**; desenfileirar sem transferência custa 1 + 0 = **1**; com transferência de m elementos, custa (2m + 1) − 2m = **1**.

        A pilha monotônica, que vem a seguir, fecha com Φ = tamanho da pilha. Você vai fazer essa conta nos exercícios.
      `, '3. O método do potencial'),
      md(`
        ### O padrão mais comum: entra uma vez, sai no máximo uma vez
        O padrão amortizado que mais aparece em código é uma estrutura em que **cada elemento entra uma vez e sai no máximo uma vez**. Se houve n entradas, houve no máximo n saídas, somando todas as voltas, por mais que uma volta isolada tire muita coisa de uma vez.

        O exemplo clássico é a {{pilha monotônica|monotonic stack}}: uma pilha cujos valores nunca aumentam de baixo para cima (ou nunca diminuem, conforme o problema). Quando chega um valor que quebraria a ordem, saem antes todos os que ele "resolve". Ela responde em Θ(n) perguntas como "quantos dias até um dia mais quente?", que de forma ingênua custam Θ(n²). Você vai vê-la funcionando no exemplo.

        A {{janela deslizante|sliding window}} segue a mesma lógica: dois índices \`ini\` e \`fim\` que **só avançam**. Mesmo com um \`while\` que move \`ini\` dentro do \`for\` que move \`fim\`, cada índice anda no máximo n vezes no total.
      `),
      {
        type: 'table',
        head: ['Operação', 'Pior caso de uma chamada', 'Amortizado', 'Por quê'],
        rows: [
          ['incrementar um contador de k bits', 'O(k)', 'O(1)', 'o bit j só troca a cada 2ʲ incrementos'],
          ['desenfileirar na fila com duas pilhas', 'O(n)', 'O(1)', 'cada elemento é transferido no máximo uma vez'],
          ['processar um elemento na pilha monotônica', 'O(n)', 'O(1)', 'cada índice é empilhado uma vez e desempilhado no máximo uma vez'],
          ['avançar o fim de uma janela deslizante', 'O(n)', 'O(1)', 'o início só anda para a frente'],
          ['append numa lista dinâmica (nível 3)', 'O(n)', 'O(1)', 'as cópias somam menos que 2n'],
        ],
      },
      warn(`
        A garantia amortizada vale para o **conjunto de operações que foi analisado**. Acrescente uma operação nova e a conta pode quebrar, porque ela pode desfazer um trabalho que já foi "pago".

        Exemplo: transformar a fila com duas pilhas numa fila dupla, com \`remover_ultimo\` (tira o mais novo). Quando a entrada está vazia, ele precisa despejar a saída inteira de volta na entrada. Comece com n elementos e alterne \`desenfileirar\` e \`remover_ultimo\`: cada chamada encontra vazia a pilha de que precisa e transfere quase tudo. n/2 operações custam Θ(n²), ou seja, Θ(n) por operação. (Implementações que precisam disso transferem só metade dos elementos de cada vez, e aí a conta volta a fechar.)

        E lembre-se do nível 3: amortizado é uma garantia sobre o **total**. Uma operação isolada ainda pode custar O(n), o que importa quando cada operação tem prazo.
      `, 'Quando a conta quebra'),
    ],
    exemplo: [
      md(`
        Problema: dadas as temperaturas máximas de cinco dias seguidos em Cuiabá, descubra, para cada dia, **quantos dias faltam até um dia mais quente** (0 se nenhum dia seguinte for mais quente).

        A ideia: guarde numa pilha os dias que **ainda esperam resposta**. Quando chega um dia mais quente que o do topo, ele é a resposta do topo, que sai da pilha; repita enquanto o topo for mais frio. Por isso as temperaturas na pilha nunca aumentam de baixo para cima.
      `),
      trace(`
        def dias_ate_esquentar(temps):
            resp = [0] * len(temps)
            pilha = []                  # dias que ainda esperam um dia mais quente
            for hoje, t in enumerate(temps):
                while pilha and temps[pilha[-1]] < t:
                    dia = pilha.pop()
                    resp[dia] = hoje - dia
                pilha.append(hoje)
            return resp

        print(dias_ate_esquentar([34, 31, 32, 36, 33]))
      `, 'Acompanhe a pilha: no dia 3 (36 graus), um único passo do for desempilha dois dias.'),
      {
        type: 'table',
        head: ['Dia (hoje)', 'Temperatura', 'Sai da pilha (resposta)', 'Pilha depois (dia: temperatura)'],
        rows: [
          ['0', '34', '—', '0: 34'],
          ['1', '31', '—', '0: 34, 1: 31'],
          ['2', '32', 'dia 1 (2 − 1 = 1)', '0: 34, 2: 32'],
          ['3', '36', 'dia 2 (3 − 2 = 1), dia 0 (3 − 0 = 3)', '3: 36'],
          ['4', '33', '—', '3: 36, 4: 33'],
        ],
        caption: 'Resultado: [3, 1, 1, 0, 0]. Os dias 3 e 4 terminam na pilha: nenhum dia seguinte foi mais quente, e a resposta deles fica 0.',
      },
      md(`
        Contando: 5 dias empilhados e 3 desempilhados. Uma volta do \`for\` chegou a desempilhar dois dias, mas o total de pops nunca passa do total de appends, que é n. Somando todas as voltas do \`for\`, o teste do \`while\` dá verdadeiro no máximo n vezes (um pop em cada) e falso exatamente n vezes (uma em cada dia). Total: **Θ(n)**, contra Θ(n²) de comparar cada dia com todos os seguintes.
      `),
    ],
    codigo: [
      py(`
        def proximo_maior_ingenuo(xs):
            resp, comparacoes = [-1] * len(xs), 0
            for i in range(len(xs)):
                for j in range(i + 1, len(xs)):
                    comparacoes += 1
                    if xs[j] > xs[i]:
                        resp[i] = j
                        break
            return resp, comparacoes

        def proximo_maior_pilha(xs):
            resp, pilha = [-1] * len(xs), []
            pops, maior_rajada = 0, 0
            for i, x in enumerate(xs):
                rajada = 0
                while pilha and xs[pilha[-1]] < x:
                    resp[pilha.pop()] = i
                    rajada += 1
                pilha.append(i)
                pops += rajada
                maior_rajada = max(maior_rajada, rajada)
            return resp, pops, maior_rajada

        for n in [250, 500, 1000]:
            xs = list(range(n, 0, -1)) + [n + 1]   # cai até o fim e sobe de uma vez
            r1, comparacoes = proximo_maior_ingenuo(xs)
            r2, pops, rajada = proximo_maior_pilha(xs)
            assert r1 == r2
            print(f"n={n:>4}: ingênuo {comparacoes:>6} comparações | pilha: {pops} pops no total, {rajada} numa única volta")
      `, { caption: 'Esta entrada concentra todos os pops numa única volta, a mais cara possível, e mesmo assim o total é n. O ingênuo quadruplica a cada vez que n dobra.' }),
      py(`
        def incrementar(bits):          # bits[0] é o bit menos significativo
            i = 0
            while bits[i] == 1:
                bits[i] = 0
                i += 1
            bits[i] = 1
            return i + 1                # quantos bits mudaram

        bits = [0] * 12
        custos = [incrementar(bits) for _ in range(1000)]
        print("1000 incrementos:", sum(custos), "trocas no total (menos que 2 × 1000)")
        media = f"{sum(custos) / len(custos):.3f}".replace(".", ",")
        print("o incremento mais caro trocou", max(custos), "bits; em média, cada um trocou", media)
        print("valor final:", "".join(str(b) for b in reversed(bits)))
      `, { caption: '2 × 1000 − 6 = 1994, porque 1000 = 1111101000 em binário tem seis bits 1. O incremento mais caro foi o 512º (0111111111 → 1000000000).' }),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e4-amz-1',
          kind: 'mcq',
          prompt: 'Somando todas as voltas do `for`, quantas vezes `pilha.pop()` pode executar, no máximo, para uma lista de n elementos?',
          code: {
            lang: 'python',
            code: dedent(`
              def proximo_maior(xs):
                  resp = [-1] * len(xs)
                  pilha = []
                  for i in range(len(xs)):
                      while pilha and xs[pilha[-1]] < xs[i]:
                          resp[pilha.pop()] = i
                      pilha.append(i)
                  return resp
            `),
          },
          difficulty: 'facil',
          skills: ['alg-complexidade', 'ed-pilhas-filas'],
          hints: [
            'Quantas vezes cada índice é empilhado?',
            'Depois que um índice sai da pilha, ele pode voltar a entrar?',
          ],
          explanation: 'Cada índice entra na pilha uma única vez (o append no fim de cada volta) e, depois de sair, nunca volta. Logo, o total de pops é no máximo o total de appends: menos de n, porque o último índice empilhado nunca chega a sair. Uma volta pode desempilhar muita coisa, mas isso consome elementos que não estarão lá nas voltas seguintes. Total: Θ(n).',
          options: [
            { text: 'Menos de n: cada índice é empilhado uma vez e, depois de desempilhado, nunca volta.', correct: true, feedback: 'Isso. O total de saídas é limitado pelo total de entradas, por mais desigual que seja a distribuição entre as voltas.' },
            { text: 'Até n(n − 1)/2: em cada volta o while pode esvaziar a pilha inteira.', feedback: 'Uma volta pode mesmo esvaziar a pilha, mas aí os índices que saíram não estão mais lá para as voltas seguintes. Somando tudo, ninguém sai duas vezes.' },
            { text: 'Cerca de n², por causa do while dentro do for.', feedback: 'Multiplicar laços só funciona quando o de dentro roda sempre o mesmo tanto. Aqui ele roda conforme o que há na pilha, e a pilha só tem o que foi empilhado.' },
            { text: 'Cerca de log n, porque a pilha sempre fica pequena.', feedback: 'A pilha pode crescer até n: numa lista decrescente, nenhum índice sai. O que fica pequeno é o total de pops, não o tamanho da pilha.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e4-amz-2',
          kind: 'predict',
          lang: 'python',
          prompt: 'O que é impresso? `bits[0]` é o bit menos significativo.',
          difficulty: 'intermediario',
          skills: ['alg-complexidade', 'prog-loops'],
          hints: [
            'Depois de 12 incrementos a partir do zero, o contador vale 12. Como se escreve 12 em binário, e em que ordem a lista guarda os bits?',
            'Para o total: o bit 0 troca em todo incremento. E o bit 1? E o bit 2?',
            'Conte as trocas de cada bit separadamente e some.',
          ],
          explanation: '12 em binário é 1100; como bits[0] é o menos significativo, a lista fica [0, 0, 1, 1]. Trocas: o bit 0 troca 12 vezes, o bit 1 troca 6, o bit 2 troca 3 e o bit 3 troca 1: 12 + 6 + 3 + 1 = 22, menos que 2 × 12 = 24. A fórmula 2n − (quantidade de bits 1 de n) confirma: 24 − 2 = 22.',
          code: dedent(`
            bits = [0, 0, 0, 0]
            total = 0
            for _ in range(12):
                i = 0
                while bits[i] == 1:
                    bits[i] = 0
                    i += 1
                bits[i] = 1
                total += i + 1
            print(bits, total)
          `),
          answer: '[0, 0, 1, 1] 22',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e4-amz-3',
          kind: 'fill',
          lang: 'text',
          prompt: 'Complete a análise da pilha monotônica pelo método do potencial, com Φ = tamanho da pilha. Conte cada `pop` e cada `append` como 1 passo e considere um elemento que, ao chegar, desempilha p índices e depois é empilhado. Use a letra p nas respostas.',
          difficulty: 'intermediario',
          skills: ['alg-complexidade', 'ed-pilhas-filas'],
          hints: [
            'Quantos pops e quantos appends esse elemento provoca?',
            'A pilha perdeu quantos índices e ganhou quantos? Quanto mudou o tamanho?',
            'Some o custo real com a variação de Φ. O p some?',
          ],
          explanation: 'Custo real: p pops mais 1 append, p + 1. O tamanho da pilha perde p e ganha 1, então Φ varia 1 − p. Amortizado: (p + 1) + (1 − p) = 2, para qualquer p. Como Φ começa em 0 e nunca fica negativa, n elementos custam no máximo 2n passos de pilha: Θ(n), mesmo que um único elemento desempilhe quase tudo.',
          template: dedent(`
            custo real        = ___
            variação de Φ     = ___
            custo amortizado  = ___
          `),
          blanks: [
            ['p + 1', 'p+1', 'p +1', 'p+ 1', '1 + p', '1+p', '1 +p', '1+ p'],
            ['1 - p', '1-p', '1 -p', '1- p', '1 − p', '1−p', '1 −p', '1− p', '-p + 1', '-p+1', '−p + 1', '−p+1', '-(p - 1)', '-(p-1)', '−(p − 1)', '−(p−1)'],
            ['2', '+2'],
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e4-amz-4',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Implemente uma fila (FIFO) com duas pilhas guardadas num dicionário criado por \`criar_fila()\` (já pronto): \`"entrada"\` recebe quem chega e \`"saida"\` entrega quem sai, ambas listas usadas como pilhas (o topo é o fim).

            - \`enfileirar(fila, x)\`: coloca x na fila.
            - \`desenfileirar(fila)\`: remove e devolve o elemento mais antigo; com a fila vazia, lança \`IndexError\`.

            As duas operações devem ser **O(1) amortizado**. Nas pilhas, use só \`append(x)\` e \`pop()\` sem argumento, e não troque as listas do dicionário por outras.
          `),
          difficulty: 'intermediario',
          skills: ['alg-complexidade', 'ed-pilhas-filas'],
          hints: [
            'Se você despejar a entrada inteira na saída, um elemento por vez, em que ordem eles ficam? Quem fica no topo?',
            'Quando vale a pena despejar? O que acontece com a ordem se você despejar enquanto a saída ainda tem elementos?',
            'Teste à mão: enfileire a e b, desenfileire, enfileire c e d, desenfileire duas vezes. Saiu a, b, c?',
            'Onde verificar a fila vazia: antes ou depois de tentar despejar a entrada?',
          ],
          explanation: 'Só se despeja a entrada quando a saída está vazia: assim todos os elementos da saída são mais antigos que os da entrada, e a ordem FIFO se mantém. Cada elemento sofre no máximo 4 operações de pilha em toda a sua vida (entra na entrada, sai dela, entra na saída, sai dela), então n operações custam O(n): O(1) amortizado, embora um desenfileirar isolado possa transferir n elementos. Em Python, no dia a dia, use collections.deque; a fila com duas pilhas aparece em entrevistas e em linguagens funcionais, em que as listas são imutáveis.',
          starter: dedent(`
            def criar_fila():
                return {"entrada": [], "saida": []}


            def enfileirar(fila, x):
                # coloque x na fila
                pass


            def desenfileirar(fila):
                # remova e devolva o elemento mais antigo (IndexError se a fila estiver vazia)
                pass
          `),
          solution: dedent(`
            def criar_fila():
                return {"entrada": [], "saida": []}


            def enfileirar(fila, x):
                fila["entrada"].append(x)


            def desenfileirar(fila):
                if not fila["saida"]:
                    while fila["entrada"]:
                        fila["saida"].append(fila["entrada"].pop())
                if not fila["saida"]:
                    raise IndexError("desenfileirar de uma fila vazia")
                return fila["saida"].pop()
          `),
          tests: [
            { name: 'ordem FIFO', code: 'f = criar_fila()\nfor x in [1, 2, 3]:\n    enfileirar(f, x)\nr = [desenfileirar(f), desenfileirar(f), desenfileirar(f)]\nassert r == [1, 2, 3], f"quem chega primeiro sai primeiro: esperado [1, 2, 3], veio {r}"' },
            {
              name: 'enfileirar e desenfileirar intercalados',
              code: dedent(`
                f = criar_fila()
                enfileirar(f, "a")
                enfileirar(f, "b")
                r = [desenfileirar(f)]
                enfileirar(f, "c")
                enfileirar(f, "d")
                r += [desenfileirar(f), desenfileirar(f)]
                enfileirar(f, "e")
                r += [desenfileirar(f), desenfileirar(f)]
                assert r == ["a", "b", "c", "d", "e"], f"esperado ['a', 'b', 'c', 'd', 'e'], veio {r}. Despejar a entrada enquanto a saída ainda tem elementos embaralha a ordem."
              `),
            },
            {
              name: 'estado das duas pilhas',
              code: dedent(`
                f = criar_fila()
                for x in [1, 2, 3]:
                    enfileirar(f, x)
                assert f["entrada"] == [1, 2, 3] and f["saida"] == [], f"enfileirar só empilha na entrada; veio {f}"
                assert desenfileirar(f) == 1, "o primeiro a sair deveria ser 1"
                assert f["entrada"] == [] and f["saida"] == [3, 2], f"o primeiro desenfileirar despeja a entrada inteira na saída (invertida) e tira o topo: esperado entrada [] e saida [3, 2]; veio {f}"
                enfileirar(f, 4)
                assert f["entrada"] == [4] and f["saida"] == [3, 2], f"com a saída ainda ocupada, enfileirar não mexe nela; veio {f}"
              `),
            },
            {
              name: 'fila vazia',
              code: dedent(`
                f = criar_fila()
                try:
                    desenfileirar(f)
                except IndexError:
                    pass
                else:
                    raise AssertionError("desenfileirar de uma fila vazia deveria lançar IndexError")
                enfileirar(f, 7)
                assert desenfileirar(f) == 7, "com um só elemento, desenfileirar deveria devolvê-lo"
                try:
                    desenfileirar(f)
                except IndexError:
                    pass
                else:
                    raise AssertionError("depois de tirar o único elemento a fila está vazia: deveria lançar IndexError")
              `),
            },
            {
              name: 'cada elemento é transferido uma vez só',
              code: dedent(`
                class Pilha(list):
                    passos = 0
                    def append(self, x):
                        Pilha.passos += 1
                        super().append(x)
                    def pop(self, *args):
                        Pilha.passos += 1
                        return super().pop(*args)
                f = criar_fila()
                f["entrada"], f["saida"] = Pilha(), Pilha()
                for x in range(300):
                    enfileirar(f, x)
                saiu = []
                for x in range(300, 600):
                    enfileirar(f, x)
                    saiu.append(desenfileirar(f))
                while len(saiu) < 600:
                    saiu.append(desenfileirar(f))
                assert saiu == list(range(600)), "a ordem de saída ficou errada"
                assert type(f["entrada"]) is Pilha and type(f["saida"]) is Pilha, "não troque as listas do dicionário por listas novas: use append e pop nelas"
                assert Pilha.passos <= 4 * 600, f"600 elementos custaram {Pilha.passos} appends e pops; o limite é 4 por elemento (entra, é transferido uma vez, sai). Algum elemento está mudando de pilha mais de uma vez."
              `),
            },
            {
              name: 'só append e pop() nas pilhas',
              code: dedent(`
                import ast
                proibidos = {"insert", "extend", "remove", "clear", "reverse", "sort", "copy", "popleft", "appendleft"}
                problemas = set()
                for no in ast.walk(ast.parse(_source)):
                    if isinstance(no, ast.Call) and isinstance(no.func, ast.Attribute):
                        if no.func.attr in proibidos:
                            problemas.add(no.func.attr + "()")
                        if no.func.attr == "pop" and (no.args or no.keywords):
                            problemas.add("pop com argumento")
                    if isinstance(no, ast.Delete):
                        problemas.add("del")
                    if isinstance(no, ast.AugAssign):
                        problemas.add("+= ou *= (mexem na lista inteira de uma vez)")
                    if isinstance(no, ast.Subscript) and isinstance(no.slice, ast.Slice):
                        problemas.add("fatias")
                    if isinstance(no, (ast.Import, ast.ImportFrom)):
                        problemas.add("import")
                assert not problemas, "use só append(x) e pop() sem argumento nas pilhas; encontrei: " + ", ".join(sorted(problemas))
              `),
            },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e4-amz-5',
          kind: 'mcq',
          prompt: 'Uma equipe acrescentou `decrementar` (subtrair 1) ao contador binário de k bits, trocando bits do mesmo jeito: do bit 0 para cima, até achar onde parar. Agora, misturando incrementos e decrementos e começando de um valor qualquer, quanto podem custar n operações no pior caso?',
          difficulty: 'avancado',
          skills: ['alg-complexidade'],
          hints: [
            'Que número de k bits faz um incremento trocar todos os bits? E que número faz um decremento trocar todos?',
            'O que acontece se você incrementar e, logo em seguida, decrementar a partir desse número? E se repetir isso?',
            'No método do potencial, com Φ = número de bits 1, quanto Φ varia num decremento caro?',
          ],
          explanation: 'Começando em 0111…1 (e, mesmo partindo de 0, basta chegar lá uma vez), incrementar troca os k bits e chega a 1000…0; decrementar troca os mesmos k de volta. Alternando, cada uma das n operações custa k: Θ(n·k). A análise do contador valia só para incrementos: o crédito guardado em cada bit 1 (Φ = número de bits 1) paga o incremento que o zera, mas o decremento caro religa k − 1 bits, aumentando Φ em k − 2, sem que nenhuma operação anterior tenha pago por isso. Uma garantia amortizada é sempre sobre um conjunto específico de operações.',
          options: [
            { text: 'Continua O(n): cada operação ainda é O(1) amortizado, como no contador só com incremento.', feedback: 'A análise anterior dependia de o bit j só trocar a cada 2ʲ incrementos. O decremento quebra esse padrão: ele religa os bits que o incremento acabou de zerar.' },
            { text: 'Θ(n·k): alternando entre 0111…1 e 1000…0, toda operação troca os k bits.', correct: true, feedback: 'Isso. Incrementar 0111…1 troca k bits; decrementar 1000…0 troca os mesmos k de volta. Repetindo, cada operação custa k.' },
            { text: 'O(n + k): no pior caso, só uma operação troca todos os bits.', feedback: 'Uma operação cara só seria rara se nada pudesse recriar a situação cara. Aqui, o decremento recria 0111…1 logo depois do incremento caro.' },
            { text: 'O(k): o custo total é limitado pelo número de bits.', feedback: 'O número de bits limita o custo de uma operação, não o total: n operações de custo k somam n·k.' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e4-amz-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            O app de uma corretora mostra, para cada período de k dias seguidos, a **maior cotação** do dólar no período. Escreva \`maximos_janela(xs, k)\` que devolve a lista com o máximo de cada janela \`xs[i:i + k]\`, da primeira à última (são \`len(xs) - k + 1\` janelas). Se k for maior que \`len(xs)\`, devolva \`[]\`. Considere sempre k ≥ 1.

            A versão direta calcula o máximo de cada janela do zero: Θ(n·k). Exija **O(n)** no total: os testes contam quantas vezes as posições de \`xs\` são lidas e quantas comparações entre cotações são feitas (copiar os valores para outra estrutura e calcular \`max\` nela também conta), e os dois totais precisam ficar num múltiplo pequeno de n. Não modifique \`xs\`, e só \`collections\` pode ser importado (nada de \`heapq\`, \`bisect\`, \`sorted\` ou \`.sort()\`).
          `),
          difficulty: 'desafio',
          skills: ['alg-complexidade', 'ed-pilhas-filas'],
          hints: [
            'Se chega um valor maior que um valor anterior que ainda está na janela, esse anterior ainda pode ser o máximo de alguma janela futura?',
            'Então guarde só os candidatos que ainda podem vir a ser máximo. Em que ordem ficam os valores deles? Onde está o máximo da janela atual?',
            'Os candidatos saem por dois motivos: chegou alguém maior (saem pelo lado mais recente) ou ficaram para trás da janela (saem pelo lado mais antigo). Que estrutura tira dos dois lados em O(1)?',
            'Guarde índices, não valores: com o índice dá para saber se o candidato mais antigo já saiu da janela.',
          ],
          explanation: 'Um valor que chega torna inúteis todos os candidatos menores ou iguais que vieram antes dele: eles saem da janela antes dele e nunca mais serão o máximo. Retirando-os pelo fim, os candidatos ficam com valores decrescentes e o máximo da janela está sempre na frente; quando o índice da frente fica para trás da janela, ele sai pela frente. É uma fila monotônica num deque. Cada índice entra uma vez e sai no máximo uma vez, por um dos lados, então o total é O(n), embora uma única chegada possa expulsar muitos candidatos. A memória extra é O(k): só índices da janela atual ficam no deque.',
          starter: dedent(`
            def maximos_janela(xs, k):
                # devolva [max da janela 0..k-1, max da janela 1..k, ...]
                # sem recalcular cada janela do zero
                pass
          `),
          solution: dedent(`
            from collections import deque


            def maximos_janela(xs, k):
                resp = []
                candidatos = deque()   # índices; valores decrescentes da frente para o fim
                for i in range(len(xs)):
                    x = xs[i]
                    while candidatos and xs[candidatos[-1]] <= x:
                        candidatos.pop()
                    candidatos.append(i)
                    if candidatos[0] <= i - k:
                        candidatos.popleft()
                    if i >= k - 1:
                        resp.append(xs[candidatos[0]])
                return resp
          `),
          tests: [
            { name: 'exemplo clássico', code: 'r = maximos_janela([1, 3, -1, -3, 5, 3, 6, 7], 3)\nassert r == [3, 3, 5, 5, 6, 7], f"esperado [3, 3, 5, 5, 6, 7], veio {r}"' },
            { name: 'k = 1 e k = len(xs)', code: 'r1 = maximos_janela([4, 2, 9], 1)\nassert r1 == [4, 2, 9], f"com k = 1 cada janela é um elemento só: esperado [4, 2, 9], veio {r1}"\nr2 = maximos_janela([4, 2, 9, 1], 4)\nassert r2 == [9], f"com k = len(xs) há uma janela só: esperado [9], veio {r2}"' },
            { name: 'lista vazia e janela maior que a lista', code: 'assert maximos_janela([], 1) == [], "lista vazia: nenhuma janela, devolva []"\nassert maximos_janela([1, 2], 3) == [], "k maior que a lista: nenhuma janela, devolva []"' },
            { name: 'repetidos e negativos', code: 'r1 = maximos_janela([4, 4, 4, 2, 2], 2)\nassert r1 == [4, 4, 4, 2], f"esperado [4, 4, 4, 2], veio {r1}"\nr2 = maximos_janela([-5, -2, -8, -1], 2)\nassert r2 == [-2, -2, -1], f"esperado [-2, -2, -1], veio {r2}"' },
            { name: 'o máximo precisa sair da janela', code: 'r1 = maximos_janela([9, 8, 7, 6, 5], 2)\nassert r1 == [9, 8, 7, 6], f"o 9 sai da janela depois da primeira: esperado [9, 8, 7, 6], veio {r1}"\nr2 = maximos_janela([5, 1, 1, 1, 1], 3)\nassert r2 == [5, 1, 1], f"esperado [5, 1, 1], veio {r2}"' },
            {
              name: 'confere com a versão direta',
              code: dedent(`
                import random
                gerador = random.Random(2024)
                for n in range(0, 25):
                    xs = [gerador.randint(-20, 20) for _ in range(n)]
                    for k in range(1, n + 2):
                        esperado = [max(xs[i:i + k]) for i in range(n - k + 1)]
                        r = maximos_janela(xs, k)
                        assert r == esperado, f"maximos_janela({xs}, {k}): esperado {esperado}, veio {r}"
              `),
            },
            { name: 'não modifica a entrada', code: 'xs = [3, 1, 4, 1, 5, 9, 2, 6]\ncopia = xs[:]\nmaximos_janela(xs, 3)\nassert xs == copia, "não modifique xs: a lista de cotações é usada depois"' },
            {
              name: 'lê cada posição poucas vezes (O(n))',
              code: dedent(`
                class ContaLeituras(list):
                    def __init__(self, valores):
                        super().__init__(valores)
                        self.leituras = 0
                    def __getitem__(self, i):
                        r = super().__getitem__(i)
                        self.leituras += len(r) if isinstance(i, slice) else 1
                        return r
                    def __iter__(self):
                        for x in super().__iter__():
                            self.leituras += 1
                            yield x
                n, k = 2000, 100
                for nome, valores in [("decrescente", list(range(n, 0, -1))), ("embaralhada", [(i * 7919 + 13) % 1009 for i in range(n)])]:
                    xs = ContaLeituras(valores)
                    r = maximos_janela(xs, k)
                    esperado = [max(valores[i:i + k]) for i in range(n - k + 1)]
                    assert r == esperado, f"resultado errado na lista {nome} com n = {n} e k = {k}"
                    assert xs.leituras <= 6 * n, f"na lista {nome} (n = {n}, k = {k}) as posições foram lidas {xs.leituras} vezes: isso é recalcular as janelas. O limite é {6 * n}."
              `),
            },
            {
              name: 'compara poucas vezes (O(n))',
              code: dedent(`
                class Cotacao:
                    comparacoes = 0
                    def __init__(self, v):
                        self.v = v
                    def _outro(self, o):
                        Cotacao.comparacoes += 1
                        return o.v if isinstance(o, Cotacao) else o
                    def __lt__(self, o): return self.v < self._outro(o)
                    def __le__(self, o): return self.v <= self._outro(o)
                    def __gt__(self, o): return self.v > self._outro(o)
                    def __ge__(self, o): return self.v >= self._outro(o)
                    def __eq__(self, o): return self.v == self._outro(o)
                    def __ne__(self, o): return self.v != self._outro(o)
                    def __neg__(self): return Cotacao(-self.v)
                    def __hash__(self): return hash(self.v)
                    def __repr__(self): return repr(self.v)
                n, k = 2000, 100
                listas = [("decrescente", list(range(n, 0, -1))), ("crescente", list(range(n))), ("embaralhada", [(i * 7919 + 13) % 1009 for i in range(n)])]
                for nome, valores in listas:
                    xs = [Cotacao(v) for v in valores]
                    Cotacao.comparacoes = 0
                    r = maximos_janela(xs, k)
                    feitas = Cotacao.comparacoes
                    obtido = [getattr(c, "v", c) for c in r]
                    esperado = [max(valores[i:i + k]) for i in range(n - k + 1)]
                    assert obtido == esperado, f"resultado errado na lista {nome} com n = {n} e k = {k}"
                    assert feitas <= 6 * n, f"na lista {nome} (n = {n}, k = {k}) foram feitas {feitas} comparações entre cotações: isso é procurar de novo o máximo de cada janela (inclusive com max() sobre uma cópia dos k últimos valores). O limite é {6 * n}."
              `),
            },
            {
              name: 'só collections',
              code: dedent(`
                import ast
                problemas = set()
                for no in ast.walk(ast.parse(_source)):
                    if isinstance(no, ast.Import):
                        problemas.update(a.name for a in no.names if a.name != "collections")
                    if isinstance(no, ast.ImportFrom) and no.module != "collections":
                        problemas.add(str(no.module))
                    if isinstance(no, ast.Call) and isinstance(no.func, ast.Name) and no.func.id == "sorted":
                        problemas.add("sorted")
                    if isinstance(no, ast.Call) and isinstance(no.func, ast.Attribute) and no.func.attr == "sort":
                        problemas.add(".sort()")
                assert not problemas, "só collections pode ser importado, e sem ordenar; encontrei: " + ", ".join(sorted(problemas))
              `),
            },
          ],
        },
      },
    ],
    revisao: [
      md(`
        - Análise amortizada limita o **total** de qualquer sequência de operações; não é média sobre entradas sorteadas.
        - **Agregado**: conte o total direto (contador: n + n/2 + n/4 + … < 2n). **Contábil**: cobre a mais e guarde crédito (fila: 3 por enfileirar, 1 por desenfileirar). **Potencial**: amortizado = real + ΔΦ, com Φ ≥ 0 começando em 0.
        - "Entra uma vez, sai no máximo uma vez" deixa um \`while\` dentro de um \`for\` em Θ(n): pilha monotônica, fila com duas pilhas, janela deslizante.
        - No desafio, a mesma ideia num deque vira uma {{fila monotônica|monotonic queue}}: o máximo de cada janela em O(n) no total.
        - A garantia vale para as operações analisadas: decrementar no contador ou remover pelo fim na fila com duas pilhas quebram a conta.
      `),
      english(`
        - **amortized analysis / amortized O(1)**: análise amortizada / O(1) amortizado
        - **aggregate method, accounting method, potential function**: método agregado, método contábil, função potencial
        - **monotonic stack / monotonic queue**: pilha monotônica / fila monotônica
        - **sliding window**: janela deslizante
        - **to push / to pop**: empilhar / desempilhar

        Frase típica de entrevista: *"There's a while loop inside the for loop, but each index is pushed onto the stack once and popped at most once, so the total running time is O(n)."*
      `),
    ],
  },
  review: [
    ['No contador binário, por que n incrementos custam menos que 2n trocas, se um incremento pode trocar k bits?', 'O bit j só troca a cada 2ʲ incrementos: o total é n + n/2 + n/4 + … < 2n (método agregado).'],
    ['Na fila com duas pilhas, quando a entrada é despejada na saída, e por que desenfileirar é O(1) amortizado?', 'Só quando a saída está vazia. Cada elemento é transferido no máximo uma vez (nada volta para a entrada), então cada um custa no máximo 4 operações de pilha em toda a vida.'],
    ['Qual a fórmula do custo amortizado no método do potencial, e que condições Φ precisa cumprir?', 'Amortizado = real + (Φ depois − Φ antes), com Φ começando em 0 e nunca negativa; assim a soma dos amortizados limita a soma dos reais.'],
    ['Por que a pilha monotônica é Θ(n) mesmo com um while dentro do for?', 'Cada índice é empilhado uma vez e desempilhado no máximo uma vez: o total de pops é menor que n, por mais que uma volta desempilhe muito.'],
    ['Dê um exemplo de operação que quebra uma garantia amortizada, e por quê.', 'Decrementar no contador binário: alternando incremento e decremento entre 0111…1 e 1000…0, cada operação troca k bits, Θ(n·k). O decremento recria a situação cara sem ninguém ter pago por ela.'],
    ['No máximo de janela deslizante com deque, por que guardar índices e não valores?', 'Para saber quando o candidato da frente ficou para trás da janela (índice ≤ i − k) e retirá-lo.'],
  ],
  references: ['clrs', 'mit-6006', 'stanford-cs161', 'sedgewick-algs'],
});

export const lessons: Lesson[] = [omegaTeta, amortizada];
