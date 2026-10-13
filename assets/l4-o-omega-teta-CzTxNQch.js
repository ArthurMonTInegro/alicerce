var e={id:`l4-o-omega-teta`,moduleId:`m4-1`,title:`Crescimento de funções: O, Ω e Θ`,titleEn:`Growth of functions: O, Ω and Θ`,summary:`O que O, Ω e Θ afirmam de verdade, por que "qual caso" e "qual limite" são perguntas diferentes, como ordenar funções por crescimento e como somar laços em que o de dentro depende do de fora.`,minutes:45,objectives:[`Definir O, Ω e Θ com as constantes c e n₀ e usá-las para provar um limite simples`,`Separar o eixo do caso (melhor, pior, médio) do eixo do limite (O, Ω, Θ)`,`Ordenar funções comuns por crescimento e saber quando a base de um log ou de uma exponencial importa`,`Somar as voltas de laços dependentes: triangular Θ(n²), dobrando Θ(n), harmônico Θ(n log n)`],skills:[`alg-complexidade`],terms:[{pt:`análise assintótica`,en:`asymptotic analysis`,def:`Estudo de como o custo se comporta quando n cresce sem limite, ignorando constantes e entradas pequenas.`,example:`Asymptotic analysis lets us compare algorithms independently of the machine.`},{pt:`limite superior`,en:`upper bound`,def:`f(n) = O(g(n)): existe uma constante c > 0 tal que, a partir de algum n₀, f(n) ≤ c·g(n).`,example:`O(n²) is an upper bound on the running time, but not a tight one.`},{pt:`limite inferior`,en:`lower bound`,def:`f(n) = Ω(g(n)): existe uma constante c > 0 tal que, a partir de algum n₀, f(n) ≥ c·g(n).`,example:`Any comparison sort has a lower bound of Ω(n log n) comparisons in the worst case.`},{pt:`limite justo`,en:`tight bound`,def:`f(n) = Θ(g(n)): f é O(g) e Ω(g) ao mesmo tempo; cresce exatamente como g, a menos de constantes.`,example:`The worst-case running time of linear search is Θ(n).`},{pt:`limite frouxo`,en:`loose bound`,def:`Limite verdadeiro, mas com folga, como dizer que n é O(n²).`},{pt:`melhor caso`,en:`best case`,def:`A entrada de tamanho n que faz o algoritmo trabalhar menos.`},{pt:`caso médio`,en:`average case`,def:`O custo médio sobre as entradas de tamanho n, supondo uma distribuição delas (por exemplo, todas igualmente prováveis).`},{pt:`série harmônica`,en:`harmonic series`,def:`1 + 1/2 + 1/3 + … + 1/n; cresce como ln n, por isso n/1 + n/2 + … + n/n é Θ(n log n).`}],references:[`clrs`,`mit-6042`,`stanford-cs161`,`rosen-discrete`,`sedgewick-algs`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Na lição anterior você aprendeu a dizer "este código é O(n²)". Só que O(n²) é uma promessa do tipo **"no máximo"**: um algoritmo que sempre faz n passos também é O(n²). É como dizer que um Pix "cai em no máximo um dia": verdadeiro, mas esconde que ele cai em segundos. Para falar com precisão, a {{análise assintótica|asymptotic analysis}} usa três notações:

- **O** (ó grande): {{limite superior|upper bound}}, "cresce no máximo como".
- **Ω** (ômega): {{limite inferior|lower bound}}, "cresce no mínimo como".
- **Θ** (teta): {{limite justo|tight bound}}, "cresce exatamente como, a menos de constantes".

E existe uma segunda pergunta, independente da primeira: **de qual entrada estamos falando?** O {{melhor caso|best case}}, o pior caso e o {{caso médio|average case}} são funções diferentes, e cada uma pode receber O, Ω ou Θ. Misturar os dois eixos ("O é o pior caso, Ω é o melhor") é o erro mais comum do assunto, e entrevistadores sabem disso.

Você também vai aprender a ordenar funções por crescimento e a somar laços em que o de dentro depende do de fora, onde a regra "aninhamento multiplica" erra feio.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`### As três definições
Seja f(n) o custo que você quer descrever (por exemplo, o número de passos no pior caso) e g(n) uma função de referência, como n² ou n log n.

- **f(n) = O(g(n))** se existem constantes c > 0 e n₀ tais que **f(n) ≤ c·g(n)** para todo n ≥ n₀.
- **f(n) = Ω(g(n))** se existem constantes c > 0 e n₀ tais que **f(n) ≥ c·g(n)** para todo n ≥ n₀.
- **f(n) = Θ(g(n))** se f(n) = O(g(n)) **e** f(n) = Ω(g(n)): existem c₁ > 0, c₂ > 0 e n₀ com c₁·g(n) ≤ f(n) ≤ c₂·g(n) para todo n ≥ n₀.

O n₀ diz "a partir de algum tamanho": o que acontece com entradas pequenas não conta. A constante c diz "a menos de um fator fixo": é por isso que 3n² e n² ficam na mesma classe.

Uma boa intuição é comparar com números: O é como ≤, Ω é como ≥ e Θ é como =. Veja as três aplicadas a f(n) = 3n² + 10n:`},{type:`table`,head:[`Afirmação`,`Verdadeira?`,`Por quê`],rows:[[`f(n) = O(n²)`,`sim`,`para n ≥ 10, 10n ≤ n², então f(n) ≤ 4n² (c = 4, n₀ = 10)`],[`f(n) = O(n³)`,`sim`,`f(n) ≤ n³ para n ≥ 5; verdadeiro, mas com muita folga`],[`f(n) = O(n)`,`não`,`f(n)/n = 3n + 10 cresce sem limite: nenhum c dá conta`],[`f(n) = Ω(n²)`,`sim`,`f(n) ≥ 3n² para todo n ≥ 1 (c = 3)`],[`f(n) = Ω(n)`,`sim`,`verdadeiro, mas com muita folga`],[`f(n) = Ω(n³)`,`não`,`f(n)/n³ = 3/n + 10/n² tende a 0`],[`f(n) = Θ(n²)`,`sim`,`é O(n²) e Ω(n²) ao mesmo tempo`]],caption:`Só Θ(n²) descreve o crescimento sem folga. O(n³) e Ω(n) são verdadeiros, mas dizem menos.`},{type:`md`,text:`Um limite verdadeiro, mas com folga, é um {{limite frouxo|loose bound}}. Ele não está errado, só informa pouco. Quando alguém pergunta "qual a complexidade?", espera o limite mais justo que você consegue justificar.

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

Só depois escolha a notação. Pegue \`tem_duplicado_lento\` da lição anterior: no pior caso (nenhum valor repetido) ela compara todos os pares; no melhor caso (\`xs[0] == xs[1]\`) ela para na primeira comparação.`},{type:`table`,head:[`Frase`,`Correta?`,`Comentário`],rows:[[`"O pior caso de tem_duplicado_lento é Θ(n²)"`,`sim`,`são n(n − 1)/2 comparações`],[`"O melhor caso de tem_duplicado_lento é Θ(1)"`,`sim`,`uma comparação, para todo n ≥ 2`],[`"tem_duplicado_lento é O(n²)"`,`sim`,`sem dizer o caso, vale para todas as entradas: nenhuma passa de c·n²`],[`"tem_duplicado_lento é Ω(1)"`,`sim`,`vale para todas as entradas (e informa pouco)`],[`"tem_duplicado_lento é Θ(n²)"`,`não`,`sem dizer o caso, promete n² para toda entrada; o melhor caso desmente`],[`"O pior caso é O(n²), mas não Ω(n²), porque Ω é do melhor caso"`,`não`,`o pior caso é uma função como outra qualquer: é O(n²), Ω(n²) e Θ(n²)`]],caption:`Sem dizer o caso, "o algoritmo é O(g)" e "o algoritmo é Ω(g)" valem para todas as entradas. "O algoritmo é Θ(g)" só é verdade quando o melhor e o pior caso têm a mesma ordem, como somar uma lista: Θ(n) sempre.`},{type:`callout`,tone:`info`,text:`Como a lição anterior adiantou, quando um entrevistador pergunta "qual o Big O?", ele quase sempre quer o **Θ do pior caso**: o limite mais justo que vale para a pior entrada. Responder "O(2ⁿ)" para uma busca linear é tecnicamente verdadeiro e, ainda assim, uma resposta errada. Se o melhor e o pior caso forem diferentes, diga os dois: "O(n) no pior caso, O(1) no melhor".`,title:`Na entrevista`},{type:`callout`,tone:`deep`,text:`Ω também descreve **problemas**, não só algoritmos. "Ordenar comparando elementos exige Ω(n log n) comparações no pior caso" é uma afirmação sobre **qualquer** algoritmo, inclusive os que ainda não foram inventados (a prova aparece no módulo de ordenação). Dois limites inferiores simples aparecem toda hora:

- **Ler a entrada**: se a resposta depende de todos os n elementos, nenhum algoritmo escapa de Ω(n). Achar o maior valor de uma lista desordenada é Θ(n), e não há o que melhorar.
- **Escrever a saída**: se o problema pede para **listar** todos os pares, a saída tem n(n − 1)/2 itens, então ele é Ω(n²). Se pede só **quantos** pares existem, a saída é um número, e a fórmula n(n − 1)/2 responde em O(1).

Um detalhe de notação: em f(n) = O(g(n)), o "=" quer dizer "pertence a". O(n²) é o **conjunto** das funções que crescem no máximo como n². Por isso o sinal só funciona num sentido: n = O(n²) é verdadeiro, mas escrever "O(n²) = n" não faz sentido.`,title:`Limites de problemas e o "=" que não é igual`},{type:`md`,text:`### A escada do crescimento
Para n grande, as funções que mais aparecem em algoritmos ficam nesta ordem, cada uma O da seguinte e não Ω dela:

**1 < log n < √n < n < n log n < n² < n³ < 2ⁿ < n!**`},{type:`table`,head:[`n`,`log₂ n`,`√n`,`n log₂ n`,`n²`,`n³`,`2ⁿ`,`n!`],rows:[[`10`,`3,3`,`3,2`,`33`,`100`,`1 000`,`1 024`,`3 628 800`],[`100`,`6,6`,`10`,`664`,`10 000`,`10⁶`,`≈ 1,3 × 10³⁰`,`≈ 9,3 × 10¹⁵⁷`],[`1 000`,`10`,`31,6`,`9 966`,`10⁶`,`10⁹`,`≈ 1,1 × 10³⁰¹`,`2 568 algarismos`]],caption:`Repare em n = 10: log₂ n ainda é maior que √n, e 2ⁿ quase empata com n³. A escada vale "para n grande" (o n₀ das definições): √n e log₂ n empatam em n = 4 e de novo em n = 16, e daí em diante √n fica sempre na frente; 2ⁿ e n² empatam em n = 2 e em n = 4 e, de n = 5 em diante, 2ⁿ fica na frente.`},{type:`md`,text:`Três regras evitam os erros mais comuns:

1. **A base do logaritmo não importa.** log₂ n = log₁₀ n / log₁₀ 2 ≈ 3,32 · log₁₀ n: as duas diferem por um fator constante, então são Θ uma da outra. Por isso se escreve só O(log n). Pelo mesmo motivo, log(n²) = 2 log n = Θ(log n).
2. **A base da exponencial importa.** 3ⁿ / 2ⁿ = 1,5ⁿ cresce sem limite, então 3ⁿ não é O(2ⁿ). Cuidado também com o expoente: 2ⁿ⁺¹ = 2 · 2ⁿ é Θ(2ⁿ), mas 2²ⁿ = 4ⁿ não é.
3. **Logaritmo perde para qualquer potência de n.** (log n)³ = O(√n), mesmo que não pareça: com n = 10⁶, (log₂ n)³ ≈ 7 900 e √n = 1 000. A virada só acontece perto de n = 6 × 10⁸. É o n₀ das definições trabalhando.`},{type:`callout`,tone:`deep`,text:`log(n!) = Θ(n log n). Por cima: n! = 1 · 2 · … · n ≤ nⁿ, logo log(n!) ≤ n log n. Por baixo (para n par): os n/2 maiores fatores, de n/2 + 1 até n, são todos maiores que n/2, então n! ≥ (n/2)^(n/2) e log(n!) ≥ (n/2) · log(n/2), que é Ω(n log n). Essa conta volta na prova de que ordenar por comparação exige Ω(n log n): existem n! ordens possíveis para n elementos.`,title:`Uma conta que volta na ordenação`},{type:`md`,text:`### Somando laços: quando "aninhamento multiplica" erra
A regra da lição anterior supõe que o laço de dentro dá sempre o mesmo número de voltas. Quando ele depende do de fora, **some as voltas de dentro**, uma parcela por volta do de fora. Estas cinco formas resolvem quase tudo:`},{type:`table`,head:[`Forma do laço`,`Soma das voltas de dentro`,`Total`],rows:[["`for i in range(n)` com `for j in range(i)` dentro",`0 + 1 + 2 + … + (n − 1) = n(n − 1)/2`,`Θ(n²)`],["`i = 1; while i < n:` com `for j in range(i)` dentro e `i *= 2` no fim",`1 + 2 + 4 + … + 2ᵏ, com 2ᵏ < n: menos de 2n`,`Θ(n)`],["`for i in range(n)` com `j = 1; while j < n: j *= 2` dentro",`n parcelas de ⌈log₂ n⌉`,`Θ(n log n)`],["`for i in range(1, n + 1)` com `for j in range(0, n, i)` dentro",`n/1 + n/2 + n/3 + … + n/n (arredondadas para cima)`,`Θ(n log n)`],["`for x in a` com `for y in b` dentro (tamanhos n e m)",`m voltas em cada uma das n`,`Θ(n · m)`]]},{type:`md`,text:`- **Triangular**: metade de n² ainda é Θ(n²). Percorrer só os pares i < j economiza metade do trabalho, mas não muda a classe.
- **Dobrando**: dois laços aninhados e, mesmo assim, linear! Cada parcela é maior que a soma de todas as anteriores e a última é menor que n, então o total fica abaixo de 2n. Uma soma geométrica é dominada pelo seu maior termo.
- **Harmônico**: a volta i do laço de fora faz cerca de n/i voltas dentro. A {{série harmônica|harmonic series}} 1 + 1/2 + 1/3 + … + 1/n vale cerca de ln n + 0,58 (ln é o logaritmo natural, na base e ≈ 2,718), então o total fica perto de n · ln n: Θ(n log n). É o custo de visitar os múltiplos de cada número de 1 a n. (O crivo de Eratóstenes faz isso só para os primos e fica ainda mais barato: Θ(n log log n).)
- **Duas entradas**: se a lista de clientes tem n itens e a de produtos tem m, cruzar as duas custa Θ(n · m). Só escreva n² se os tamanhos forem iguais.`},{type:`callout`,tone:`warn`,text:`O inverso também engana: um laço dentro do outro **não é automaticamente** Θ(n²). O laço que dobra, acima, é Θ(n). Na próxima lição você verá laços em que o de dentro pode rodar n vezes numa única volta e, mesmo assim, o total é Θ(n). Não conte laços: **conte voltas**.`,title:`Não conte laços, conte voltas`}]},{stage:`exemplo`,blocks:[{type:`md`,text:"Vamos aplicar tudo a `tem_duplicado_lento`, da lição anterior, contando as comparações `xs[i] == xs[j]`:"},{type:`code`,lang:`python`,code:`def tem_duplicado_lento(xs):
    for i in range(len(xs)):
        for j in range(i + 1, len(xs)):
            if xs[i] == xs[j]:
                return True
    return False`,runnable:!1},{type:`md`,text:`**Pior caso** (nenhum valor repetido): para i = 0 o laço de dentro faz n − 1 comparações, para i = 1 faz n − 2, e assim até i = n − 2, que faz 1. Somando: T_pior(n) = (n − 1) + (n − 2) + … + 1 = n(n − 1)/2.

Agora prove que T_pior(n) = Θ(n²), achando as constantes:
- **O(n²)**: n(n − 1)/2 ≤ n²/2 para todo n ≥ 1. Servem c = 1/2 e n₀ = 1.
- **Ω(n²)**: n(n − 1)/2 ≥ n²/4 equivale a 2n² − 2n ≥ n², isto é, n² ≥ 2n, que vale para n ≥ 2. Servem c = 1/4 e n₀ = 2.

**Melhor caso** (\`xs[0] == xs[1]\`): 1 comparação, qualquer que seja n ≥ 2. T_melhor(n) = 1 = Θ(1).

Conclusão: o pior caso é Θ(n²), o melhor caso é Θ(1), e a função, sem dizer o caso, é O(n²) e Ω(1). Confira as constantes com números:`},{type:`table`,head:[`n`,`n²/4`,`T_pior(n) = n(n − 1)/2`,`n²/2`,`T_melhor(n)`],rows:[[`2`,`1`,`1`,`2`,`1`],[`4`,`4`,`6`,`8`,`1`],[`10`,`25`,`45`,`50`,`1`],[`1 000`,`250 000`,`499 500`,`500 000`,`1`]],caption:`A partir de n = 2, T_pior(n) fica sempre entre n²/4 e n²/2: é exatamente isso que Θ(n²) afirma.`},{type:`md`,text:"Agora um laço aninhado que engana. Siga o rastreamento e conte quantas vezes `passos += 1` roda com n = 8:"},{type:`trace`,code:`n = 8
passos = 0
i = 1
while i < n:
    for j in range(i):
        passos += 1
    i *= 2
print(passos)`,caption:`i vale 1, 2 e 4: o laço de dentro roda 1 + 2 + 4 = 7 vezes, menos que n. Com n = 1 024 seriam 1 + 2 + … + 512 = 1 023: sempre menos que 2n.`}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`import math

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
print("conferindo: n(n - 1)/2 =", br(n * (n - 1) // 2), "| n·ln(n) ≈", br(round(n * math.log(n))))`,runnable:!0,caption:`Em vez de rodar o laço de dentro, somamos quantas voltas ele daria (len(range(...))). Dobrar n multiplica o total por ~4 no triangular (Θ(n²)), por 2 no dobrando (Θ(n)) e por um pouco mais de 2 nos dois Θ(n log n). O harmônico fica um pouco acima de n·ln n porque 1 + 1/2 + … + 1/n ≈ ln n + 0,58 e cada laço de dentro arredonda para cima.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e4-oth-1`,kind:`mcq`,prompt:"A busca linear (`x in lista`) faz 1 comparação quando x está na primeira posição e n comparações quando x não está na lista. Qual afirmação está correta?",difficulty:`facil`,skills:[`alg-complexidade`],hints:[`Melhor caso e pior caso são limites ou são funções?`,`Quantas comparações a busca faz no pior caso? Esse número fica acima de c·n para algum c > 0?`,`Uma frase sobre o algoritmo inteiro, sem dizer o caso, precisa valer para quais entradas?`],explanation:`Melhor, pior e caso médio são funções diferentes; O, Ω e Θ são limites que servem para qualquer uma delas. O pior caso da busca linear é n comparações: Θ(n), logo também O(n) e Ω(n). O melhor caso é 1 comparação: Θ(1). Uma afirmação sobre o algoritmo inteiro precisa valer para todas as entradas: por isso ele é O(n) (nenhuma entrada passa de n comparações) e Ω(1) (nenhuma fica abaixo de 1), mas não é Θ(n) nem O(1) sem dizer o caso.`,options:[{text:`O melhor caso é Θ(1) e o pior caso é Θ(n); por isso a busca linear, sem dizer o caso, é O(n) e Ω(1).`,correct:!0,feedback:`Isso. Cada caso tem seu Θ, e as afirmações sem caso precisam cobrir todas as entradas: o pior caso dá o O e o melhor caso dá o Ω.`},{text:`O pior caso da busca linear é O(n), mas não é Ω(n), porque Ω é reservado para o melhor caso.`,feedback:`Ω não pertence a caso nenhum: é um limite inferior que vale para qualquer função. O pior caso é exatamente n comparações, que é Ω(n) (e também O(n), logo Θ(n)).`},{text:`A busca linear é Θ(n) para qualquer entrada.`,feedback:`Não para qualquer entrada: se x está na primeira posição, ela para em 1 comparação. Θ(n) vale para o pior caso (e para o caso médio), não para todos.`},{text:`Como o melhor caso é O(1), a busca linear é O(1).`,feedback:`Dizer que o algoritmo é O(1), sem qualificar, promete tempo constante para toda entrada. A entrada em que x não está na lista desmente isso.`}]}},{type:`exercise`,exercise:{id:`e4-oth-2`,kind:`parsons`,lang:`text`,prompt:`Ordene as funções da que cresce **mais devagar** (no topo) para a que cresce **mais rápido**, pensando em n grande.`,difficulty:`intermediario`,skills:[`alg-complexidade`],hints:[`Para comparar duas funções, divida uma pela outra: se f(n)/g(n) vai para 0, f vem antes.`,`Qualquer potência de log n perde para qualquer potência de n, até para √n. Isso só aparece para n bem grande, então não confie em contas com n pequeno.`,`Compare n / log n, n log n e n √n dividindo as três por n. O que sobra de cada uma?`,`Entre exponenciais, a base importa. E n! = 1 · 2 · 3 · … · n: a partir de qual fator cada multiplicação passa a ser por mais de 3?`],explanation:`(log n)³ vem antes de √n porque log perde para qualquer potência de n (a virada só acontece perto de n = 6 × 10⁸). √n < n / log n porque, dividindo as duas por √n, sobra 1 contra √n / log n, que cresce sem limite. Dividindo o trio do meio por n, sobram 1/log n < log n < √n, então n / log n < n log n < n√n. Depois, n√n = n^1,5 < n², toda exponencial vence qualquer polinômio, 3ⁿ / 2ⁿ = 1,5ⁿ → ∞, e n! vence 3ⁿ porque, a partir do fator 4, cada fator multiplica por mais de 3.`,lines:[`(log n)³`,`√n`,`n / log n`,`n log n`,`n √n`,`n²`,`2ⁿ`,`3ⁿ`,`n!`]}},{type:`exercise`,exercise:{id:`e4-oth-3`,kind:`predict`,lang:`python`,prompt:`O que é impresso? Conte as voltas em vez de multiplicar laços.`,difficulty:`intermediario`,skills:[`alg-complexidade`,`prog-loops`],hints:[`O while depende de i? Quantas voltas ele dá, sempre, para um mesmo n?`,`Para n = 10, anote o valor de j antes de cada teste do while. Em quantos desses testes a condição foi verdadeira?`,`Para n = 1 000, quantas vezes dá para dobrar a partir de 1 antes de chegar a 1 000 ou mais?`],explanation:`O while não depende de i: ele sempre dobra j a partir de 1 até chegar a n ou mais, o que leva ⌈log₂ n⌉ voltas (4 para n = 10, porque 2⁴ = 16 é a primeira potência ≥ 10; 10 para n = 1 000, porque 2¹⁰ = 1 024). O for repete isso n vezes: 10 × 4 = 40 e 1 000 × 10 = 10 000. Total: n · ⌈log₂ n⌉ = Θ(n log n).`,code:`def conta(n):
    passos = 0
    for i in range(n):
        j = 1
        while j < n:
            j *= 2
            passos += 1
    return passos

print(conta(10), conta(1000))`,answer:`40 10000`}},{type:`exercise`,exercise:{id:`e4-oth-4`,kind:`mcq`,prompt:"Quantas vezes `passos += 1` executa, em Θ, em função de n?",code:{lang:`python`,code:`def f(n):
    passos = 0
    for i in range(1, n + 1):
        for j in range(0, n, i * i):
            passos += 1
    return passos`},difficulty:`avancado`,skills:[`alg-complexidade`],hints:[`Quantas voltas o laço de dentro dá para i = 1? E para i = 2 e i = 3?`,`Escreva a soma n/1 + n/4 + n/9 + … Ela cresce sem limite, como a série harmônica, ou fica abaixo de algum valor fixo?`,"Para i bem grande, `range(0, n, i * i)` fica vazio ou ainda tem algum elemento?"],explanation:`A volta i faz ⌈n/i²⌉ iterações: n, ⌈n/4⌉, ⌈n/9⌉, … A soma 1 + 1/4 + 1/9 + … nunca passa de π²/6 ≈ 1,645 (dá para ver que ela é limitada sem saber esse valor: para i ≥ 2, 1/i² < 1/(i − 1) − 1/i, e somando esses termos tudo se cancela em cadeia e sobra menos de 1; logo a soma toda fica abaixo de 2), então o total fica entre n (o for de fora dá n voltas e cada uma roda pelo menos uma vez, porque o range sempre contém o 0) e 1,645n + n. É Θ(n). Compare com o passo i: lá, 1 + 1/2 + 1/3 + … cresce como ln n e o total é Θ(n log n). Um detalhe no passo muda a classe.`,options:[{text:`Θ(n log n)`,feedback:`Seria se o passo fosse i (série harmônica). Com passo i², a volta i dá cerca de n/i² iterações, e 1 + 1/4 + 1/9 + … não cresce sem limite: fica abaixo de 1,645.`},{text:`Θ(n)`,correct:!0,feedback:`Isso. n/1 + n/4 + n/9 + … < 1,645n, mais no máximo 1 por volta pelo arredondamento: menos de 2,65n. E o for de fora, sozinho, já garante pelo menos n.`},{text:`Θ(n²)`,feedback:`n² é um limite superior verdadeiro, mas frouxo: só a primeira volta (i = 1) faz n iterações. As seguintes caem depressa: n/4, n/9, n/16…`},{text:`Θ(√n), porque para i > √n o laço de dentro não roda`,feedback:"Ele roda uma vez: `range(0, n, passo)` sempre contém o 0 quando n ≥ 1. Além disso, o for de fora dá n voltas de qualquer jeito, então o total é pelo menos n."}]}},{type:`exercise`,exercise:{id:`e4-oth-5`,kind:`code`,lang:`python`,prompt:"O jeito ingênuo de procurar três números que somam zero numa lista de n elementos testa todos os trios de posições i < j < k com três laços: `for i in range(n)`, dentro dele `for j in range(i + 1, n)` e, dentro deste, `for k in range(j + 1, n)`. Escreva `contar_trios(n)` que devolve **exatamente** quantas vezes o corpo do laço mais interno executa, em O(1): sem laços, sem compreensões, sem `range`, `sum` ou `map` e sem recursão. O resultado deve ser um `int`.",difficulty:`intermediario`,skills:[`alg-complexidade`],hints:[`Quantas vezes o corpo roda para n = 3? E para n = 4 e n = 5? Monte uma tabela pequena à mão.`,`Cada execução corresponde a uma escolha de 3 posições distintas entre n, sem importar a ordem. Você já viu essa contagem em algum lugar?`,`Se a ordem importasse, quantas opções haveria para a 1ª posição, para a 2ª e para a 3ª? E de quantas ordens diferentes dá para escrever o mesmo trio?`,`Use divisão inteira (//) para o resultado continuar int.`],explanation:`O corpo roda uma vez para cada trio i < j < k, isto é, para cada escolha de 3 posições entre n sem importar a ordem: C(n, 3) = n(n − 1)(n − 2)/6 (math.comb(n, 3) dá o mesmo). É Θ(n³), com constante 1/6: com n = 1 000 são 166 167 000 trios, não 10⁹. A constante não muda a classe, mas explica por que esse código é cerca de 6 vezes mais rápido que três laços completos de 0 a n.`,starter:`def contar_trios(n):
    # devolva quantas vezes o laço mais interno roda (trios i < j < k < n),
    # usando uma fórmula, sem laços
    pass`,solution:`def contar_trios(n):
    return n * (n - 1) * (n - 2) // 6`,tests:[{name:`casos pequenos`,code:`for n, esperado in [(0, 0), (1, 0), (2, 0), (3, 1), (4, 4), (5, 10)]:
    r = contar_trios(n)
    assert r == esperado, f"contar_trios({n}) deveria ser {esperado}; veio {r}. Liste os trios à mão para conferir."`},{name:`confere com os três laços`,code:`for n in range(40):
    total = 0
    for i in range(n):
        for j in range(i + 1, n):
            for k in range(j + 1, n):
                total += 1
    r = contar_trios(n)
    assert r == total, f"para n = {n} os laços rodam {total} vezes; contar_trios devolveu {r}"`},{name:`fórmula, sem laços`,code:`import ast
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
for funcao in ast.walk(arvore):
    if isinstance(funcao, ast.FunctionDef):
        chama = {getattr(no.func, "id", None) for no in ast.walk(funcao) if isinstance(no, ast.Call)}
        assert funcao.name not in chama, f"use uma fórmula: a função {funcao.name} chama a si mesma (recursão)"`},{name:`n enorme, resultado exato e inteiro`,code:`import ast
laco = (ast.For, ast.While, ast.ListComp, ast.SetComp, ast.DictComp, ast.GeneratorExp)
gera = {"range", "sum", "map", "combinations", "permutations", "product", "contar_trios"}
arvore = ast.parse(_source)
for no in ast.walk(arvore):
    chamada = isinstance(no, ast.Call) and getattr(no.func, "id", getattr(no.func, "attr", None)) in gera
    if isinstance(no, laco) or chamada:
        raise AssertionError("contando um por um, n = 1 000 000 levaria horas: este teste só roda com uma fórmula")
    if isinstance(no, ast.FunctionDef) and any(isinstance(c, ast.Call) and getattr(c.func, "id", None) == no.name for c in ast.walk(no)):
        raise AssertionError("com recursão, n = 1 000 000 estoura a pilha de chamadas: este teste só roda com uma fórmula")
for n, esperado in [(10 ** 6, 166666166667000000), (1234567, 313611288304333155)]:
    r = contar_trios(n)
    assert isinstance(r, int), f"o resultado deve ser int, veio {type(r).__name__}: use // em vez de /"
    if abs(r - esperado) <= esperado // 10 ** 9:
        assert r == esperado, f"para n = {n} esperava {esperado}; veio {r}, quase igual. Se você usou / e depois int() ou round(), o float perdeu precisão (ele guarda só uns 16 algarismos): faça a conta toda com inteiros e divida com // no fim."
    assert r == esperado, f"para n = {n} esperava {esperado}; veio {r}. Confira a fórmula com os casos pequenos (n = 3, 4 e 5)."`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e4-oth-desafio`,kind:`code`,lang:`python`,prompt:"Escreva `soma_divisores_ate(n)` que devolve uma lista `s` de tamanho n + 1 em que `s[0] = 0` e, para 1 ≤ k ≤ n, `s[k]` é a soma de **todos** os divisores positivos de k, incluindo 1 e o próprio k. Exemplos: s[6] = 1 + 2 + 3 + 6 = 12 e s[7] = 1 + 7 = 8. Um número é **perfeito** quando s[k] = 2k, como 6 e 28.\n\nTestar, para cada k, todos os candidatos de 1 a k custa Θ(n²); testar só até √k ainda custa Θ(n√n). Exija **Θ(n log n)**. Para medir sem depender da velocidade do computador, um dos testes conta quantas linhas do seu código são executadas com n = 30 000. A versão que testa até √k passa de 3 milhões de linhas, a forma esperada fica perto de 700 mil e o limite é 2,5 milhões.",difficulty:`desafio`,skills:[`alg-complexidade`,`prog-listas`],hints:[`Na versão lenta, cada número k sai procurando os próprios divisores. Quem "sabe" de antemão quais números ele divide?`,`Pense no laço ao contrário: em vez de perguntar "quais d dividem k?", pergunte "quais k são divisíveis por d?". Como listar esses k sem testar nenhuma divisão?`,`Quantas vezes o seu laço de dentro roda para d = 1? E para d = 2? E para d qualquer? Que soma da lição aparece?`,`Comece com uma lista de zeros e vá acumulando contribuições nela.`],explanation:`Em vez de cada k procurar seus divisores, cada d visita seus múltiplos d, 2d, 3d, … até n e soma d em cada um. A volta d faz ⌊n/d⌋ passos: n/1 + n/2 + … + n/n = n vezes a série harmônica, Θ(n log n). Com n = 100 000 isso dá cerca de 1,2 milhão de passos, contra uns 21 milhões testando até √k e 5 bilhões testando todos os candidatos. Trocar "quem procura quem" é uma técnica que reaparece em crivos e em contagens sobre múltiplos.`,starter:`def soma_divisores_ate(n):
    # devolva s com s[0] = 0 e s[k] = soma dos divisores de k, para k de 1 a n
    pass`,solution:`def soma_divisores_ate(n):
    s = [0] * (n + 1)
    for d in range(1, n + 1):
        for multiplo in range(d, n + 1, d):
            s[multiplo] += d
    return s`,tests:[{name:`primeiros valores`,code:`r = soma_divisores_ate(12)
assert r == [0, 1, 3, 4, 7, 6, 12, 8, 15, 13, 18, 12, 28], f"para n = 12 esperava [0, 1, 3, 4, 7, 6, 12, 8, 15, 13, 18, 12, 28]; veio {r}"`},{name:`bordas: n = 0 e n = 1`,code:`assert soma_divisores_ate(0) == [0], "com n = 0 a lista é só [0]"
assert soma_divisores_ate(1) == [0, 1], "o único divisor de 1 é o próprio 1: esperado [0, 1]"`},{name:`primos e números perfeitos`,code:`s = soma_divisores_ate(500)
assert len(s) == 501, f"com n = 500 a lista deve ter n + 1 = 501 posições; veio {len(s)}"
for p in [2, 3, 5, 7, 11, 97, 499]:
    assert s[p] == p + 1, f"{p} é primo: seus divisores são 1 e {p}, soma {p + 1}; veio {s[p]}"
for k in [6, 28, 496]:
    assert s[k] == 2 * k, f"{k} é perfeito: s[{k}] deveria ser {2 * k}; veio {s[k]}"`},{name:`confere com a definição`,code:`s = soma_divisores_ate(300)
for k in range(1, 301):
    esperado = sum(d for d in range(1, k + 1) if k % d == 0)
    assert s[k] == esperado, f"s[{k}] deveria ser {esperado}; veio {s[k]}"`},{name:`precisa ser Θ(n log n)`,code:`import sys

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
assert _s[30000] == 96844, f"s[30000] deveria ser 96844; veio {_s[30000]}"`}]}}]},{stage:`revisao`,blocks:[{type:`md`,text:`- **O** é limite superior (≤), **Ω** é limite inferior (≥) e **Θ** exige os dois (=), sempre a menos de constantes e a partir de algum n₀.
- Caso (melhor, pior, médio) e limite (O, Ω, Θ) são eixos diferentes: primeiro diga **de qual função** está falando, depois dê o limite.
- Sem dizer o caso, "é O(g)" e "é Ω(g)" valem para todas as entradas; "é Θ(g)" só quando melhor e pior caso têm a mesma ordem.
- Escada: 1 < log n < √n < n < n log n < n² < n³ < 2ⁿ < n!. A base do log não importa; a da exponencial importa.
- Laços dependentes: some as voltas. Triangular → Θ(n²); dobrando → Θ(n); harmônico → Θ(n log n); duas entradas → Θ(n · m).`},{type:`callout`,tone:`english`,text:`- **upper bound / lower bound / tight bound**: limite superior / inferior / justo
- **big-O, big-Omega, big-Theta**: O grande, ômega grande, teta grande
- **best case / worst case / average case**: melhor caso / pior caso / caso médio
- **asymptotically**: assintoticamente ("para n grande")
- **loose bound**: limite frouxo

Frase típica de entrevista: *"In the worst case, when there are no duplicates, we compare every pair, so it's Θ(n²); in the best case it returns after a single comparison."*

Em livros e documentação: *"f(n) = O(g(n)) means that f grows no faster than g, up to a constant factor, for all sufficiently large n."*`,title:`English corner`}]}],cards:[{id:`l4-o-omega-teta#1`,front:`O que significa f(n) = O(g(n)), com as constantes?`,back:`Existem c > 0 e n₀ tais que f(n) ≤ c·g(n) para todo n ≥ n₀: f cresce no máximo como g.`},{id:`l4-o-omega-teta#2`,front:`Qual a diferença entre Ω e Θ?`,back:`Ω é limite inferior (f(n) ≥ c·g(n) a partir de n₀). Θ é O e Ω ao mesmo tempo: o crescimento exato, a menos de constantes.`},{id:`l4-o-omega-teta#3`,front:`Por que "O é o pior caso e Ω é o melhor caso" está errado?`,back:`O, Ω e Θ são limites e servem para qualquer função. Pior, melhor e caso médio são funções diferentes: o pior caso da busca linear, por exemplo, é O(n), Ω(n) e Θ(n).`},{id:`l4-o-omega-teta#4`,front:`Por que log₂ n e log₁₀ n são da mesma classe, mas 2ⁿ e 3ⁿ não?`,back:`Os logs diferem por um fator constante (log₂ n ≈ 3,32 · log₁₀ n). Já 3ⁿ / 2ⁿ = 1,5ⁿ cresce sem limite.`},{id:`l4-o-omega-teta#5`,front:`Quanto custa um laço externo em que i dobra (1, 2, 4, … < n) com um laço interno de i voltas?`,back:`Θ(n): 1 + 2 + 4 + … + 2ᵏ < 2n. A soma geométrica é dominada pelo maior termo.`},{id:`l4-o-omega-teta#6`,front:`Quanto custa visitar, para cada i de 1 a n, os índices de range(0, n, i)?`,back:`Θ(n log n): n/1 + n/2 + … + n/n é n vezes a série harmônica, que cresce como ln n.`}]};export{e as default};
//# sourceMappingURL=l4-o-omega-teta-CzTxNQch.js.map