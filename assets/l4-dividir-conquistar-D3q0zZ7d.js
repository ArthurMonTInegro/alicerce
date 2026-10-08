var e={id:`l4-dividir-conquistar`,moduleId:`m4-4`,title:`Dividir para conquistar: dividir, resolver, combinar`,titleEn:`Divide and conquer: divide, conquer, combine`,summary:`Medir o custo de uma recursão com a árvore de recursão, saber quando dividir ao meio acelera (e quando não), ver o que a divisão faz com a pilha, multiplicar com Karatsuba e achar o k-ésimo menor com a seleção rápida.`,minutes:50,objectives:[`Descrever um algoritmo de dividir para conquistar pelas três etapas: dividir, resolver e combinar`,`Estimar o custo de uma recursão pela árvore de recursão: chamadas por nível × trabalho por chamada`,`Relacionar a forma como o problema encolhe com a profundidade da pilha de chamadas`,`Explicar por que Karatsuba, com 3 subproblemas em vez de 4, multiplica em O(n^1,585)`,`Implementar a seleção rápida do k-ésimo menor em tempo esperado O(n)`],skills:[`alg-recursao`],terms:[{pt:`etapa de combinação`,en:`combine step`,def:`Parte do dividir para conquistar que junta as respostas dos subproblemas na resposta do problema original.`},{pt:`árvore de recursão`,en:`recursion tree`,def:`Desenho das chamadas recursivas como uma árvore; somando o trabalho de cada nível, obtém-se o custo total.`,example:`Draw the recursion tree and add up the work done at each level.`},{pt:`relação de recorrência`,en:`recurrence relation`,def:`Equação que descreve o custo T(n) de um algoritmo recursivo em função do custo de entradas menores.`,example:`Merge sort satisfies the recurrence T(n) = 2T(n/2) + O(n).`},{pt:`reduzir para conquistar`,en:`decrease and conquer`,def:`Variante em que só um subproblema menor é resolvido e o resto é descartado, como na busca binária.`},{pt:`profundidade da recursão`,en:`recursion depth`,def:`Maior número de chamadas empilhadas ao mesmo tempo; é a altura da árvore de recursão.`,example:`RecursionError: maximum recursion depth exceeded`},{pt:`multiplicação de Karatsuba`,en:`Karatsuba multiplication`,def:`Algoritmo que multiplica números de n algarismos com 3 produtos de metades em vez de 4, em O(n^log₂3) ≈ O(n^1,585).`},{pt:`estatística de ordem`,en:`order statistic`,def:`O k-ésimo menor valor de uma coleção; o mínimo, a mediana e o máximo são casos particulares.`},{pt:`seleção rápida`,en:`quickselect`,def:`Algoritmo que acha o k-ésimo menor separando os valores em torno de um pivô e continuando só no grupo que contém a resposta.`,example:`Quickselect runs in expected linear time but degrades to quadratic time with bad pivots.`}],references:[`clrs`,`stanford-cs161`,`kleinberg-tardos`,`mit-6006`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`A lição anterior resumiu *dividir para conquistar* numa frase: divida, resolva as partes, combine. Agora vamos abrir essa frase. Todo algoritmo de dividir para conquistar tem três etapas:

1. **Dividir** o problema em subproblemas menores **do mesmo tipo**, em geral metades.
2. **Resolver** cada subproblema com a própria função (o salto de fé recursivo).
3. **Combinar** as respostas dos subproblemas na resposta do problema inteiro. Essa é a {{etapa de combinação|combine step}}, e quase sempre é nela que mora a ideia esperta.

Por que estudar isso a fundo? Porque é assim que se derrubam custos que parecem obrigatórios. Multiplicar dois números de n algarismos do jeito da escola custa n² multiplicações de algarismos; dividindo do jeito certo, cai para cerca de n^1,585. Achar a mediana das notas de uma turma parece exigir ordenar tudo; dividindo e **jogando fora** o que não interessa, sai em O(n) em média.

Mas dividir não acelera por mágica: somar uma lista por metades continua O(n), igual ao laço \`for\`. Para saber de antemão em qual caso você está, a ferramenta é a {{árvore de recursão|recursion tree}}, o centro desta lição.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`### As três etapas em algoritmos conhecidos`},{type:`table`,head:[`Algoritmo`,`Dividir`,`Resolver`,`Combinar`,`Custo`],rows:[[`Busca binária`,`olha o elemento do meio`,`só **uma** metade`,`nada: a resposta da metade já é a resposta`,`O(log n)`],[`Exponenciação rápida (exercício da lição anterior)`,`bᵉ vira b^(e // 2)`,`um subproblema`,`elevar ao quadrado (e multiplicar por b se e for ímpar)`,`O(log e) multiplicações`],[`Merge sort`,`corta a lista ao meio`,`as duas metades`,`intercalar duas listas ordenadas: O(n)`,`O(n log n)`],[`Karatsuba (nesta lição)`,`corta cada número ao meio`,`**três** produtos de metades`,`somas e subtrações: O(n)`,`O(n^1,585)`],[`{{Seleção rápida|quickselect}} (nesta lição)`,`separa menores, iguais e maiores que um pivô`,`só o grupo que contém a resposta`,`nada`,`O(n) esperado`]]},{type:`md`,text:"### Quanto custa: a árvore de recursão\nPara medir um algoritmo recursivo, escreva o custo como uma {{relação de recorrência|recurrence relation}}: T(n) é o tempo para uma entrada de tamanho n, escrito em função do tempo de entradas menores. Veja a soma de uma lista por metades, que recebe a lista inteira e o trecho `[lo, hi)`, sem fatiar:"},{type:`code`,lang:`python`,code:`def soma_metades(xs, lo, hi):
    if hi - lo == 1:                   # um elemento: resposta direta
        return xs[lo]
    meio = (lo + hi) // 2              # dividir: [lo, meio) e [meio, hi)
    esquerda = soma_metades(xs, lo, meio)
    direita = soma_metades(xs, meio, hi)
    return esquerda + direita          # combinar: O(1)`,runnable:!1},{type:`md`,text:`Fora das chamadas recursivas, cada chamada faz trabalho constante e cria duas chamadas com metade do tamanho: **T(n) = 2·T(n/2) + O(1)**. Para resolver, desenhe as chamadas como uma árvore e some o trabalho **nível por nível**:`},{type:`table`,head:[`Nível`,`Chamadas`,`Tamanho de cada`,`Trabalho no nível`],rows:[[`0`,`1`,`n`,`1 · O(1)`],[`1`,`2`,`n/2`,`2 · O(1)`],[`2`,`4`,`n/4`,`4 · O(1)`],[`k`,`2ᵏ`,`n/2ᵏ`,`2ᵏ · O(1)`],[`log₂ n (folhas)`,`n`,`1`,`n · O(1)`]],caption:`Somando a coluna da direita: 1 + 2 + 4 + … + n = 2n − 1 chamadas de custo constante.`},{type:`md`,text:`Total: **O(n)**, o mesmo custo do laço. Dividir não acelerou nada, porque as duas metades continuam sendo visitadas por inteiro: a árvore tem uma folha para cada elemento.

Agora mude só o trabalho de cada chamada. Se cada uma percorre o próprio trecho (como o intercalar do merge sort), o nível k tem 2ᵏ chamadas de tamanho n/2ᵏ, ou seja, **n de trabalho em todo nível**; com log₂ n níveis, o total é O(n log n). O mesmo desenho resolve as recorrências que aparecem o tempo todo:`},{type:`table`,head:[`Recorrência`,`Exemplo`,`O que a árvore mostra`,`Custo`],rows:[[`T(n) = T(n/2) + O(1)`,`busca binária`,`um nó por nível, log₂ n níveis`,`O(log n)`],[`T(n) = T(n/2) + O(n)`,`seleção rápida com pivôs que cortam perto do meio; busca binária que fatia a lista`,`n + n/2 + n/4 + … < 2n`,`O(n)`],[`T(n) = 2T(n/2) + O(1)`,`soma ou máximo por metades`,`2n − 1 nós de custo constante`,`O(n)`],[`T(n) = 2T(n/2) + O(n)`,`merge sort`,`n de trabalho em cada um dos log₂ n níveis`,`O(n log n)`],[`T(n) = 3T(n/2) + O(n)`,`Karatsuba`,`as folhas dominam: 3^(log₂ n) = n^(log₂ 3)`,`O(n^1,585)`],[`T(n) = 4T(n/2) + O(n)`,`multiplicação por metades com 4 produtos`,`4^(log₂ n) = n² folhas`,`O(n²)`],[`T(n) = T(n − 1) + O(1)`,`soma recursiva que tira um item por vez`,`n níveis com um nó cada`,`O(n)`],[`T(n) = 2T(n − 1) + O(1)`,`Torre de Hanói`,`o número de nós dobra a cada nível: 2ⁿ − 1`,`O(2ⁿ)`]]},{type:`md`,text:`O padrão é uma disputa entre **quantos** subproblemas nascem, **quanto** cada um encolhe e **quanto** custa combinar. Compare o trabalho total de um nível com o do nível seguinte:

- se ele **diminui**, o topo da árvore domina: em T(n/2) + O(n), a raiz já faz n, e todos os outros níveis juntos somam menos que outro n;
- se ele fica **igual**, multiplica-se pelo número de níveis, log₂ n: é o caso da busca binária (O(1) por nível) e do merge sort (n por nível);
- se ele **aumenta**, as folhas dominam, e o número delas decide o custo: n folhas na soma por metades, n^(log₂ 3) em Karatsuba, n² com 4 produtos.`},{type:`callout`,tone:`deep`,text:`Para recorrências da forma T(n) = a·T(n/b) + O(nᵈ), com a ≥ 1, b > 1 e d ≥ 0, a disputa acima vira uma regra pronta, o **Teorema Mestre** (*Master Theorem*):

- se a < bᵈ, o topo domina: O(nᵈ);
- se a = bᵈ, todos os níveis pesam igual: O(nᵈ log n);
- se a > bᵈ, as folhas dominam: O(n^(log_b a)).

Confira com a tabela: no merge sort, a = 2, b = 2 e d = 1, então a = bᵈ e o custo é O(n log n). Em Karatsuba, a = 3 > 2¹ = bᵈ, e o custo é O(n^(log₂ 3)). O teorema volta, com mais rigor, no nível 14; aqui, desenhar a árvore basta.`,title:`O Teorema Mestre`},{type:`md`,text:`### Quando dividir acelera de verdade
Pela tabela, dividir só ganha da solução direta em três situações:

1. Você **descarta** parte do problema sem resolvê-la: a busca binária e a seleção rápida resolvem um subproblema só. É o {{reduzir para conquistar|decrease and conquer}}.
2. A **combinação** é barata comparada com a força bruta: ordenar por inserção compara pares, O(n²); o merge sort só precisa intercalar, O(n) por nível.
3. Você **diminui o número** de subproblemas: Karatsuba troca 4 produtos de metades por 3, e o expoente cai de 2 para 1,585.`},{type:`callout`,tone:`tip`,text:"Na lição anterior, `@cache` salvou o Fibonacci porque `fib(n - 1)` e `fib(n - 2)` repetem os mesmos subproblemas milhares de vezes. No dividir para conquistar típico, as metades são **disjuntas**: nenhum subproblema aparece duas vezes, e um cache só gastaria memória. Subproblemas que se repetem são território da programação dinâmica, no próximo módulo.",title:`Dividir para conquistar × memoização`},{type:`md`,text:`### A pilha de chamadas acompanha a altura da árvore
A árvore inteira nunca existe de uma vez na memória. Em cada instante, a pilha guarda só o **caminho** da raiz até a chamada que está rodando: quando uma chamada termina, o quadro dela sai da pilha antes de a chamada irmã começar. Por isso, o que limita a pilha é a {{profundidade da recursão|recursion depth}}, a altura da árvore, e não o número total de chamadas.`},{type:`table`,head:[`Como o problema encolhe`,`Profundidade da pilha`,`n = 1 000`,`n = 1 000 000`],rows:[[`pela metade`,`≈ log₂ n`,`11 quadros`,`21 quadros`],[`de um em um`,`n`,`≈ 1 000 quadros: esbarra no limite padrão do Python`,`≈ 1 000 000 quadros: RecursionError`]]},{type:`code`,lang:`python`,code:`maior = [0]   # maior profundidade alcançada (numa lista, para a função poder alterá-la sem nonlocal)

def soma_metades(xs, lo, hi, prof=1):
    maior[0] = max(maior[0], prof)
    if hi - lo == 1:
        return xs[lo]
    meio = (lo + hi) // 2
    return soma_metades(xs, lo, meio, prof + 1) + soma_metades(xs, meio, hi, prof + 1)

def soma_um_a_um(xs, i=0):
    if i == len(xs):
        return 0
    return xs[i] + soma_um_a_um(xs, i + 1)

xs = list(range(1, 100_001))
print(soma_metades(xs, 0, len(xs)), "com profundidade máxima", maior[0])
try:
    print(soma_um_a_um(xs))
except RecursionError:
    print("soma_um_a_um: RecursionError (precisaria de 100 001 chamadas empilhadas)")`,runnable:!0,caption:`A soma por metades faz quase 200 mil chamadas no total, mas nunca empilha mais de 18 ao mesmo tempo; a soma um a um precisaria empilhar todas as suas 100 001.`},{type:`callout`,tone:`warn`,text:"Uma fatia como `xs[:meio]` **copia** os elementos: custa O(n). Isso muda a recorrência sem você perceber. Uma busca binária recursiva que chama `busca(xs[meio + 1:], alvo)` vira T(n) = T(n/2) + O(n) = **O(n)** e perde toda a vantagem sobre a busca linear. A soma por metades com fatias vira T(n) = 2T(n/2) + O(n) = **O(n log n)**, pior que o laço. Passe a lista inteira e os índices `lo` e `hi`, como em `soma_metades`.",title:`Fatias escondem custo`}]},{stage:`exemplo`,blocks:[{type:`md`,text:`Vamos ver a {{multiplicação de Karatsuba|Karatsuba multiplication}} em ação, multiplicando **1234 × 5678** com cada número dividido ao meio. Com p = 10² = 100, temos 1234 = 12 · 100 + 34 e 5678 = 56 · 100 + 78. Chame a = 12, b = 34, c = 56 e d = 78. Pela distributiva:

(a·p + b) · (c·p + d) = ac · p² + (ad + bc) · p + bd

**Do jeito da escola**, são 4 produtos de metades:`},{type:`table`,head:[`Produto`,`Conta`,`Valor`],rows:[[`ac`,`12 × 56`,`672`],[`ad`,`12 × 78`,`936`],[`bc`,`34 × 56`,`1 904`],[`bd`,`34 × 78`,`2 652`]],caption:`672 · 10 000 + (936 + 1 904) · 100 + 2 652 = 6 720 000 + 284 000 + 2 652 = 7 006 652.`},{type:`md`,text:`**O truque de Karatsuba**: a fórmula não precisa de ad e bc separados, só da **soma** ad + bc. Como (a + b)(c + d) = ac + ad + bc + bd, um produto a mais entrega essa soma:`},{type:`table`,head:[`Passo`,`Conta`,`Valor`],rows:[[`1`,`ac = 12 × 56`,`672`],[`2`,`bd = 34 × 78`,`2 652`],[`3`,`(a + b)(c + d) = 46 × 134`,`6 164`],[`4`,`ad + bc = 6 164 − 672 − 2 652`,`2 840 (sem multiplicar)`],[`5`,`672 · 10 000 + 2 840 · 100 + 2 652`,`**7 006 652**`]],caption:`Três produtos de metades em vez de quatro, pagando com somas e subtrações, que custam O(n).`},{type:`md`,text:`Uma multiplicação a menos parece pouco. A força está na recursão: cada um dos 3 produtos é feito **com o mesmo truque**, e a economia se repete em todos os níveis da árvore. Com n = 2ᵏ algarismos, a recursão divide k vezes até chegar a um algarismo, e as folhas (multiplicações de algarismos) são 4ᵏ = n² na escola e 3ᵏ = n^(log₂ 3) ≈ n^1,585 em Karatsuba:`},{type:`table`,head:[`Algarismos (n)`,`Escola: 4ᵏ = n²`,`Karatsuba: 3ᵏ`,`Escola ÷ Karatsuba`],rows:[[`2`,`4`,`3`,`1,3`],[`8`,`64`,`27`,`2,4`],[`64`,`4 096`,`729`,`5,6`],[`1 024`,`1 048 576`,`59 049`,`17,8`]]},{type:`md`,text:`Um detalhe: a + b e c + d podem ter um algarismo a mais que as metades (134 tem três). Isso só muda constantes, não a ordem de crescimento.`},{type:`callout`,tone:`deep`,text:`Em 1960, num seminário em Moscou, Andrei Kolmogorov conjecturou que multiplicar dois números de n algarismos exigia da ordem de n² operações. Anatoly Karatsuba, então com 23 anos e aluno do seminário, encontrou este algoritmo em cerca de uma semana e derrubou a conjectura. Hoje o próprio CPython usa Karatsuba para multiplicar inteiros grandes (acima de uns 2 000 bits, cerca de 600 algarismos decimais), e existem métodos ainda mais rápidos: em 2019, Harvey e van der Hoeven apresentaram um algoritmo O(n log n).`,title:`Uma conjectura derrubada`}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`import random

conta = {"escola": 0, "karatsuba": 0}

def escola(x, y, n):
    """Multiplica x e y (até n algarismos, n potência de 2) com 4 produtos de metades."""
    if n == 1:
        conta["escola"] += 1
        return x * y
    p = 10 ** (n // 2)
    a, b = divmod(x, p)              # x = a·p + b
    c, d = divmod(y, p)              # y = c·p + d
    m = n // 2
    return escola(a, c, m) * p * p + (escola(a, d, m) + escola(b, c, m)) * p + escola(b, d, m)

def karatsuba(x, y, n):
    """A mesma divisão, com 3 produtos de metades."""
    if n == 1:
        conta["karatsuba"] += 1
        return x * y
    p = 10 ** (n // 2)
    a, b = divmod(x, p)
    c, d = divmod(y, p)
    m = n // 2
    ac = karatsuba(a, c, m)
    bd = karatsuba(b, d, m)
    meio = karatsuba(a + b, c + d, m) - ac - bd     # = ad + bc
    return ac * p * p + meio * p + bd

print("algarismos  escola  karatsuba")
for n in [2, 4, 8, 16, 32, 64, 128]:
    x = random.randrange(10 ** (n - 1), 10 ** n)
    y = random.randrange(10 ** (n - 1), 10 ** n)
    conta["escola"] = conta["karatsuba"] = 0
    assert escola(x, y, n) == x * y == karatsuba(x, y, n)
    print(f"{n:>10}  {conta['escola']:>6}  {conta['karatsuba']:>9}")`,runnable:!0,caption:`Os números sorteados mudam a cada execução, mas as contagens de multiplicações na base da recursão não: 4ᵏ contra 3ᵏ. Troque 128 por 256 e veja a escola passar de 65 mil.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e4-dc-1`,kind:`mcq`,prompt:`A função abaixo conta quantos Pix de um extrato passam de R$ 100, dividindo o trecho ao meio (sem fatiar). Qual é o custo dela para um extrato com n Pix?`,code:{lang:`python`,code:`def acima_de_100(pix, lo, hi):
    if hi - lo == 1:
        return 1 if pix[lo] > 100 else 0
    meio = (lo + hi) // 2
    return acima_de_100(pix, lo, meio) + acima_de_100(pix, meio, hi)`},difficulty:`facil`,skills:[`alg-recursao`],hints:[`Quantas folhas tem a árvore de recursão? Cada folha cuida de quantos Pix?`,`Quanto trabalho cada chamada faz fora das chamadas recursivas? Escreva T(n) em função de T(n/2).`],explanation:"A recorrência é T(n) = 2T(n/2) + O(1). A árvore tem n folhas (uma por Pix) e 2n − 1 nós no total, cada um com trabalho constante: O(n). É o mesmo custo de um laço `for`; dividir não acelerou nada, porque as duas metades são resolvidas por inteiro.",options:[{text:`O(log n)`,feedback:`Seria o caso se cada chamada descartasse uma das metades, como na busca binária. Aqui as **duas** metades são resolvidas, e cada Pix precisa ser olhado numa folha.`},{text:`O(n)`,correct:!0,feedback:`Isso: 2n − 1 chamadas de custo constante. Mesmo custo do laço; dividir só ajudaria se algo fosse descartado ou se a combinação poupasse trabalho.`},{text:`O(n log n)`,feedback:`Seria o caso se cada chamada fizesse trabalho proporcional ao tamanho do seu trecho, como o intercalar do merge sort. Aqui a combinação é uma única soma: O(1) por chamada.`},{text:`O(n²)`,feedback:`Nenhuma chamada percorre o trecho nem compara pares: cada uma faz uma conta e duas chamadas. Para chegar em n² seria preciso algo como comparar cada Pix com todos os outros.`}]}},{type:`exercise`,exercise:{id:`e4-dc-2`,kind:`predict`,lang:`python`,prompt:`O que este programa imprime? Preste atenção na **ordem** das chamadas.`,difficulty:`intermediario`,skills:[`alg-recursao`],hints:["A chamada imprime `lo` e `hi` antes ou depois de chamar as metades?",`Com lo = 0 e hi = 3, quanto vale meio? Os dois pedaços têm o mesmo tamanho?`,`A segunda chamada recursiva só começa quando a primeira devolve. O que a primeira metade imprime antes disso?`],explanation:`Para [0, 3), meio = 1: os pedaços são [0, 1) e [1, 3), de tamanhos 1 e 2 (com n ímpar as metades diferem em um). Cada chamada imprime ao entrar, e a recursão termina a metade esquerda inteira antes de começar a direita: 0 3, depois 0 1 (folha, devolve 5), depois 1 3, que se divide em 1 2 (devolve 1) e 2 3 (devolve 4). A soma final é 5 + 1 + 4 = 10. Essa ordem, um ramo até o fim antes do vizinho, é a busca em profundidade que a pilha de chamadas produz.`,code:`def soma(xs, lo, hi):
    print(lo, hi)
    if hi - lo == 1:
        return xs[lo]
    meio = (lo + hi) // 2
    return soma(xs, lo, meio) + soma(xs, meio, hi)

print(soma([5, 1, 4], 0, 3))`,answer:`0 3
0 1
1 3
1 2
2 3
10`}},{type:`exercise`,exercise:{id:`e4-dc-3`,kind:`fix`,lang:`python`,prompt:"`maximo(xs, lo, hi)` deveria devolver o maior valor do trecho `[lo, hi)` de uma lista **não vazia** (as posições lo, lo + 1, …, hi − 1; sem lo e hi, a lista inteira), dividindo o trecho ao meio. Mas ela mistura duas convenções de intervalo e termina em `IndexError`. Corrija-a, mantendo a recursão por metades e o intervalo semiaberto.",difficulty:`intermediario`,skills:[`alg-recursao`],hints:["Simule `maximo([5])`: com lo = 0 e hi = 1, o caso base é atingido? Quais chamadas acontecem em seguida, e que posições elas leem?",`Em [lo, hi) há hi − lo elementos. Quantos elementos tem o trecho [1, 1)? Qual é o menor trecho que pode chegar a uma chamada se a lista não é vazia e a divisão está certa?`,`Depois de dividir, todo índice de lo até hi − 1 fica em exatamente um dos dois pedaços? Teste com [1, 9, 2]: o 9 é visto por alguma chamada?`],explanation:"São dois erros, os dois por misturar o intervalo fechado [lo, hi] (o da busca binária clássica) com o semiaberto [lo, hi). (1) Em [lo, hi) há hi − lo elementos, então `lo == hi` é um trecho **vazio**, que nunca deveria ser lido. O código lê `xs[lo]` mesmo assim, e o trecho vazio da ponta direita, [len(xs), len(xs)), vira `xs[len(xs)]`: IndexError. O caso base certo é o menor trecho não vazio, `hi - lo == 1`. (2) `meio + 1` pula o elemento da posição meio, que não pertence a [lo, meio): com o caso base já corrigido, o 9 de [1, 9, 2] sumiria. Corrigir só a divisão também não basta: com o caso base `lo == hi`, um trecho de um elemento vira [lo, lo) e [lo, hi), o próprio problema de novo, e a recursão estoura a pilha. Com [lo, meio) e [meio, hi), cada índice cai em exatamente um pedaço, e os dois são estritamente menores que o original. Regra geral: toda divisão precisa produzir pedaços menores, e o caso base precisa pegar todos os tamanhos em que a divisão não encolhe.",starter:`def maximo(xs, lo=0, hi=None):
    if hi is None:
        hi = len(xs)
    if lo == hi:
        return xs[lo]
    meio = (lo + hi) // 2
    a = maximo(xs, lo, meio)
    b = maximo(xs, meio + 1, hi)
    return a if a > b else b`,solution:`def maximo(xs, lo=0, hi=None):
    if hi is None:
        hi = len(xs)
    if hi - lo == 1:
        return xs[lo]
    meio = (lo + hi) // 2
    a = maximo(xs, lo, meio)
    b = maximo(xs, meio, hi)
    return a if a > b else b`,tests:[{name:`um elemento`,code:`def _maximo(xs, *trecho):
    desc = (str(xs) if len(xs) <= 12 else f"lista de {len(xs)} elementos") + "".join(f", {a}" for a in trecho)
    try:
        return maximo(xs, *trecho)
    except RecursionError:
        raise AssertionError(f"maximo({desc}) estourou a pilha: algum pedaço ficou do mesmo tamanho do trecho original, e a recursão não avança. Confira o caso base e os dois pedaços.") from None
    except IndexError:
        raise AssertionError(f"maximo({desc}) leu uma posição fora da lista (IndexError). Quantos elementos tem um trecho [lo, hi) com lo == hi? Ele deveria ser lido?") from None
for xs in ([5], [-3]):
    r = _maximo(xs)
    assert r == xs[0], f"maximo({xs}) deu {r}, esperado {xs[0]}"`},{name:`o elemento do meio também conta`,code:`def _maximo(xs, *trecho):
    desc = (str(xs) if len(xs) <= 12 else f"lista de {len(xs)} elementos") + "".join(f", {a}" for a in trecho)
    try:
        return maximo(xs, *trecho)
    except RecursionError:
        raise AssertionError(f"maximo({desc}) estourou a pilha: algum pedaço ficou do mesmo tamanho do trecho original, e a recursão não avança. Confira o caso base e os dois pedaços.") from None
    except IndexError:
        raise AssertionError(f"maximo({desc}) leu uma posição fora da lista (IndexError). Quantos elementos tem um trecho [lo, hi) com lo == hi? Ele deveria ser lido?") from None
for xs, esperado in [([1, 9, 2], 9), ([2, 7], 7), ([4, 8, 6, 1], 8)]:
    r = _maximo(xs)
    assert r == esperado, f"maximo({xs}) deu {r}, esperado {esperado}: algum índice ficou de fora dos dois pedaços?"`},{name:`negativos e repetidos`,code:`def _maximo(xs, *trecho):
    desc = (str(xs) if len(xs) <= 12 else f"lista de {len(xs)} elementos") + "".join(f", {a}" for a in trecho)
    try:
        return maximo(xs, *trecho)
    except RecursionError:
        raise AssertionError(f"maximo({desc}) estourou a pilha: algum pedaço ficou do mesmo tamanho do trecho original, e a recursão não avança. Confira o caso base e os dois pedaços.") from None
    except IndexError:
        raise AssertionError(f"maximo({desc}) leu uma posição fora da lista (IndexError). Quantos elementos tem um trecho [lo, hi) com lo == hi? Ele deveria ser lido?") from None
for xs, esperado in [([-4, -2, -7], -2), ([3, 3, 3], 3), ([-1, -1], -1)]:
    r = _maximo(xs)
    assert r == esperado, f"maximo({xs}) deu {r}, esperado {esperado}"`},{name:`respeita o trecho [lo, hi)`,code:`def _maximo(xs, *trecho):
    desc = (str(xs) if len(xs) <= 12 else f"lista de {len(xs)} elementos") + "".join(f", {a}" for a in trecho)
    try:
        return maximo(xs, *trecho)
    except RecursionError:
        raise AssertionError(f"maximo({desc}) estourou a pilha: algum pedaço ficou do mesmo tamanho do trecho original, e a recursão não avança. Confira o caso base e os dois pedaços.") from None
    except IndexError:
        raise AssertionError(f"maximo({desc}) leu uma posição fora da lista (IndexError). Quantos elementos tem um trecho [lo, hi) com lo == hi? Ele deveria ser lido?") from None
for xs, lo, hi, esperado in [([1, 3, 2, 9], 0, 3, 3), ([9, 4, 6, 8], 1, 3, 6), ([5, 1, 7], 2, 3, 7)]:
    r = _maximo(xs, lo, hi)
    assert r == esperado, f"maximo({xs}, {lo}, {hi}) deu {r}, esperado {esperado}: o trecho [lo, hi) vai da posição lo até hi − 1, sem incluir hi"`},{name:`listas aleatórias`,code:`def _maximo(xs, *trecho):
    desc = (str(xs) if len(xs) <= 12 else f"lista de {len(xs)} elementos") + "".join(f", {a}" for a in trecho)
    try:
        return maximo(xs, *trecho)
    except RecursionError:
        raise AssertionError(f"maximo({desc}) estourou a pilha: algum pedaço ficou do mesmo tamanho do trecho original, e a recursão não avança. Confira o caso base e os dois pedaços.") from None
    except IndexError:
        raise AssertionError(f"maximo({desc}) leu uma posição fora da lista (IndexError). Quantos elementos tem um trecho [lo, hi) com lo == hi? Ele deveria ser lido?") from None
import random
random.seed(11)
for _ in range(300):
    xs = [random.randint(-50, 50) for _ in range(random.randint(1, 40))]
    r = _maximo(xs)
    assert r == max(xs), f"maximo({xs}) deu {r}, esperado {max(xs)}"`},{name:`lista grande sem estourar a pilha`,code:`import random
random.seed(5)
xs = [random.randint(-10**6, 10**6) for _ in range(50_000)]
try:
    r = maximo(xs)
except RecursionError:
    raise AssertionError("50 000 elementos estouraram a pilha: ou a recursão não termina em algum trecho, ou ela tira um elemento por vez em vez de dividir ao meio (a profundidade deveria ser só log₂ n ≈ 16)")
except IndexError:
    raise AssertionError("numa lista de 50 000 elementos, maximo leu uma posição fora da lista (IndexError): um trecho [lo, hi) com lo == hi deveria ser lido?")
assert r == max(xs), f"resultado errado numa lista de 50 000 elementos: {r}"`},{name:`mantém a recursão por metades`,code:`import io as _io, re as _re, tokenize as _tk

def _codigo(src):
    ignorar = {_tk.COMMENT, _tk.STRING}
    for nome in ("FSTRING_MIDDLE", "TSTRING_MIDDLE"):
        if hasattr(_tk, nome):
            ignorar.add(getattr(_tk, nome))
    try:
        return " ".join(t.string for t in _tk.generate_tokens(_io.StringIO(src).readline) if t.type not in ignorar)
    except (_tk.TokenError, SyntaxError):
        return src
assert _source.count("maximo(") >= 3, "mantenha as duas chamadas recursivas, uma para cada metade"
assert not _re.search(r"\\bmax\\s*\\(\\s*xs\\b|\\bsorted\\b|\\.\\s*sort\\b", _codigo(_source)), "não troque a recursão por max(xs) ou ordenação: o exercício é consertar a divisão"`}]}},{type:`exercise`,exercise:{id:`e4-dc-4`,kind:`code`,lang:`python`,prompt:"Um banco digital recebe de cada uma de k agências a lista dos horários (em segundos) dos Pix do dia, **já ordenada**. Escreva `intercalar_todas(listas)`, que devolve uma única lista **nova**, ordenada, com todos os horários.\n\nUse a função `intercalar(a, b)` fornecida, que junta **duas** listas ordenadas em O(len(a) + len(b)), e organize as chamadas por dividir para conquistar: resolva a primeira metade das listas, resolva a segunda metade e combine as duas respostas. Assim cada horário passa por cerca de log₂ k intercalações, e o total é O(N log k), onde N é o número total de horários. Não use `sort`, `sorted` nem `heapq`, e não altere as listas recebidas.",difficulty:`intermediario`,skills:[`alg-recursao`],hints:[`Quais são os casos que você resolve sem dividir? Pense em zero listas e em uma lista só.`,`Se você divide a lista de listas ao meio e resolve cada metade com a própria função, o que cada chamada devolve? Como juntar as duas respostas?`,`Compare com intercalar as listas uma por uma num acumulador: quantas vezes um horário da primeira lista é copiado ao longo das k intercalações? E se as listas forem combinadas aos pares, metade com metade?`],explanation:"Caso base: nenhuma lista dá [], uma lista dá uma cópia dela. Passo: `intercalar(intercalar_todas(listas[:m]), intercalar_todas(listas[m:]))`. A árvore de recursão tem altura ⌈log₂ k⌉, e em cada nível cada horário participa de no máximo uma intercalação: O(N log k). Intercalar uma lista por vez num acumulador é O(N · k), porque o acumulador, cada vez maior, é recopiado a cada passo. Com k = 64 listas de 10 horários, são 3 840 cópias por metades contra 20 800 uma a uma.",starter:`def intercalar(a, b):
    """Junta duas listas ordenadas numa nova lista ordenada. Não altere esta função."""
    out, i, j = [], 0, 0
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:
            out.append(a[i])
            i += 1
        else:
            out.append(b[j])
            j += 1
    return out + a[i:] + b[j:]


def intercalar_todas(listas):
    # devolva uma lista ordenada com os valores de todas as listas,
    # usando intercalar() por dividir para conquistar
    pass`,solution:`def intercalar(a, b):
    """Junta duas listas ordenadas numa nova lista ordenada. Não altere esta função."""
    out, i, j = [], 0, 0
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:
            out.append(a[i])
            i += 1
        else:
            out.append(b[j])
            j += 1
    return out + a[i:] + b[j:]


def intercalar_todas(listas):
    if not listas:
        return []
    if len(listas) == 1:
        return list(listas[0])
    m = len(listas) // 2
    return intercalar(intercalar_todas(listas[:m]), intercalar_todas(listas[m:]))`,tests:[{name:`exemplo`,code:`try:
    r = intercalar_todas([[1, 4, 9], [2, 3, 10], [0, 5]])
except RecursionError:
    raise AssertionError("a recursão não termina: com uma lista só, dividir ao meio dá uma metade vazia e a outra igual à original. Qual caso precisa ser resolvido sem dividir?") from None
assert r == [0, 1, 2, 3, 4, 5, 9, 10], f"esperado [0, 1, 2, 3, 4, 5, 9, 10], veio {r}"`},{name:`bordas`,code:`casos = [([], []), ([[]], []), ([[7]], [7]), ([[], [1], []], [1]), ([[3, 3], [3]], [3, 3, 3]), ([[-5, 0], [-7, 2]], [-7, -5, 0, 2])]
for listas, esperado in casos:
    try:
        r = intercalar_todas(listas)
    except RecursionError:
        raise AssertionError(f"intercalar_todas({listas}) estourou a pilha: algum caso pequeno precisa ser resolvido sem dividir") from None
    assert r == esperado, f"intercalar_todas({listas}) deu {r}, esperado {esperado}"`},{name:`não altera as listas recebidas`,code:`listas = [[1, 5], [2, 6], [3, 7]]
intercalar_todas(listas)
assert listas == [[1, 5], [2, 6], [3, 7]], f"as listas de entrada foram alteradas: {listas}"`},{name:`devolve uma lista nova`,code:`agencia = [3, 8, 9]
r = intercalar_todas([agencia])
assert r == [3, 8, 9], f"com uma lista só, esperado [3, 8, 9], veio {r}"
assert r is not agencia, "com uma lista só, a função devolveu a própria lista da agência: quem alterar o resultado vai alterar a entrada. Devolva uma cópia."`},{name:`listas aleatórias`,code:`import random
random.seed(3)
for _ in range(200):
    listas = [sorted(random.randint(-30, 30) for _ in range(random.randint(0, 6))) for _ in range(random.randint(0, 12))]
    esperado = sorted(v for l in listas for v in l)
    r = intercalar_todas(listas)
    assert r == esperado, f"intercalar_todas({listas}) deu {r}, esperado {esperado}"`},{name:`trabalho O(N log k)`,code:`if "_intercalar_original" not in globals():
    _intercalar_original = intercalar
_trabalho = [0, 0]
def intercalar(a, b):
    _trabalho[0] += len(a) + len(b)
    _trabalho[1] += 1
    return _intercalar_original(a, b)
import math
for k in (64, 100):
    listas = [list(range(i, i + 10 * k, k)) for i in range(k)]
    N = 10 * k
    _trabalho[0] = _trabalho[1] = 0
    r = intercalar_todas(listas)
    assert r == list(range(N)), "resultado errado com muitas listas"
    assert _trabalho[1] > 0, "use a função intercalar() fornecida para combinar as listas"
    limite = N * (math.ceil(math.log2(k)) + 1)
    assert _trabalho[0] <= limite, f"com {k} listas e {N} horários, as intercalações copiaram {_trabalho[0]} valores (o limite para O(N log k) é {limite}): cada horário deveria passar por cerca de log₂ k intercalações. Intercalar uma lista por vez num acumulador custa O(N · k), e reordenar todos os valores juntos custa O(N log N): divida a lista de listas ao meio."`},{name:`sem atalhos`,code:`import io as _io, re as _re, tokenize as _tk

def _codigo(src):
    ignorar = {_tk.COMMENT, _tk.STRING}
    for nome in ("FSTRING_MIDDLE", "TSTRING_MIDDLE"):
        if hasattr(_tk, nome):
            ignorar.add(getattr(_tk, nome))
    try:
        return " ".join(t.string for t in _tk.generate_tokens(_io.StringIO(src).readline) if t.type not in ignorar)
    except (_tk.TokenError, SyntaxError):
        return src
assert not _re.search(r"\\bsorted\\b|\\.\\s*sort\\b|\\bheapq\\b", _codigo(_source)), "não use sort, sorted nem heapq: combine com intercalar()"`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e4-dc-desafio`,kind:`code`,lang:`python`,prompt:"A secretaria da escola quer a **mediana** das notas de cada turma sem ordenar as notas. Escreva `k_esimo_menor(xs, k)`, que devolve o k-ésimo menor valor de `xs`, uma {{estatística de ordem|order statistic}}: k = 1 é o mínimo e k = len(xs) é o máximo. Valores repetidos contam cada um: em `[4, 1, 4]`, o 2º e o 3º menores são 4.\n\nUse a {{seleção rápida|quickselect}}: escolha um pivô **ao acaso**, separe os valores em menores, iguais e maiores que ele, e continue **só** no grupo que contém a posição k. A meta é tempo **esperado** O(n), a média sobre os sorteios do pivô, para **qualquer** ordem de entrada, inclusive notas já ordenadas. Não use `sort`, `sorted`, `heapq` nem `statistics`, e não altere a lista recebida.",difficulty:`desafio`,skills:[`alg-recursao`],hints:[`Depois de separar em menores, iguais e maiores, quantos valores ficam antes do primeiro igual ao pivô? Em qual grupo cai a posição k?`,`Se k cai no grupo dos maiores, a posição dele **dentro** desse grupo continua sendo k? O que é preciso descontar?`,`Teste mentalmente com xs = [7, 7, 7, 7] e k = 2. Seu código termina? O que acontece com os valores iguais ao pivô?`,`Por que o pivô precisa ser sorteado? Imagine pegar sempre o primeiro elemento numa lista já ordenada: quantos valores cada passo descarta?`],explanation:`Com menores (m valores), iguais (q) e maiores: se k ≤ m, a resposta está entre os menores, na mesma posição k; se m < k ≤ m + q, a resposta é o próprio pivô; senão, está entre os maiores, na posição k − m − q. Só um grupo é visitado: é reduzir para conquistar. Com pivôs que cortam perto do meio, T(n) = T(n/2) + O(n) = O(n); sorteando o pivô, o tempo **esperado** é O(n) para qualquer entrada. Um pivô fixo (primeiro, último ou do meio) tem entradas ruins, como a lista ordenada ou em forma de vale, em que cada passo descarta quase nada: O(n²) e milhares de chamadas empilhadas. Guardar os iguais num grupo à parte garante o progresso mesmo com todos os valores repetidos. Para garantir O(n) no **pior** caso existe a "mediana das medianas" (Blum, Floyd, Pratt, Rivest e Tarjan, 1973), mais complicada e mais lenta na prática. A mesma seleção volta no módulo de ordenação, feita no lugar, com a partição do quicksort.`,starter:`import random

def k_esimo_menor(xs, k):
    # devolva o k-ésimo menor valor de xs (k começa em 1), em tempo esperado O(n)
    pass`,solution:`import random

def k_esimo_menor(xs, k):
    pivo = random.choice(xs)
    menores = [x for x in xs if x < pivo]
    iguais = sum(1 for x in xs if x == pivo)
    if k <= len(menores):
        return k_esimo_menor(menores, k)
    if k <= len(menores) + iguais:
        return pivo
    maiores = [x for x in xs if x > pivo]
    return k_esimo_menor(maiores, k - len(menores) - iguais)`,tests:[{name:`exemplos`,code:`xs = [7, 2, 9, 4, 4, 1]
for k, esperado in [(1, 1), (2, 2), (3, 4), (4, 4), (5, 7), (6, 9)]:
    try:
        r = k_esimo_menor(xs, k)
    except IndexError:
        raise AssertionError(f"k_esimo_menor({xs}, {k}) tentou sortear de um grupo vazio: confira a posição k que você passa ao descer para um dos grupos")
    except RecursionError:
        raise AssertionError(f"k_esimo_menor({xs}, {k}) estourou a pilha: cada chamada recebe um grupo menor que o anterior?")
    assert r == esperado, f"k_esimo_menor({xs}, {k}) deu {r}, esperado {esperado}"`},{name:`um elemento e negativos`,code:`assert k_esimo_menor([5], 1) == 5, "com um elemento, a resposta é ele mesmo"
xs = [-3, 10, -8, 0]
for k, esperado in [(1, -8), (2, -3), (3, 0), (4, 10)]:
    r = k_esimo_menor(xs, k)
    assert r == esperado, f"k_esimo_menor({xs}, {k}) deu {r}, esperado {esperado}"`},{name:`todos iguais`,code:`try:
    r = k_esimo_menor([7] * 2000, 1000)
except RecursionError:
    raise AssertionError("com 2 000 valores iguais a recursão não termina: para onde vão os valores iguais ao pivô?")
assert r == 7, f"com todos os valores iguais a 7, deu {r}"`},{name:`não altera a lista`,code:`xs = [5, 3, 8, 1, 9, 2]
copia = xs[:]
k_esimo_menor(xs, 3)
assert xs == copia, f"a lista recebida foi alterada: {copia} virou {xs}"`},{name:`listas aleatórias`,code:`import random
random.seed(21)
for _ in range(300):
    xs = [random.randint(-20, 20) for _ in range(random.randint(1, 30))]
    k = random.randint(1, len(xs))
    r = k_esimo_menor(xs, k)
    esperado = sorted(xs)[k - 1]
    assert r == esperado, f"k_esimo_menor({xs}, {k}) deu {r}, esperado {esperado}"`},{name:`notas já ordenadas (crescente e decrescente)`,code:`class _Estourou(Exception):
    pass

class _Nota:
    __slots__ = ("v",)
    cont = 0
    limite = 0
    def __init__(self, v):
        self.v = v
    def _c(self, o):
        _Nota.cont += 1
        if _Nota.cont > _Nota.limite:
            raise _Estourou()
        return o.v if isinstance(o, _Nota) else o
    def __lt__(self, o): return self.v < self._c(o)
    def __le__(self, o): return self.v <= self._c(o)
    def __gt__(self, o): return self.v > self._c(o)
    def __ge__(self, o): return self.v >= self._c(o)
    def __eq__(self, o): return self.v == self._c(o)
    def __ne__(self, o): return self.v != self._c(o)
    def __hash__(self): return hash(self.v)
    def __repr__(self): return repr(self.v)

def _seleciona_medindo(valores, k, limite):
    """Devolve (coube no limite?, resposta)."""
    import random
    random.seed(2024)   # sorteios reprodutíveis: o mesmo código dá sempre o mesmo resultado
    _Nota.cont = 0
    _Nota.limite = limite
    try:
        r = k_esimo_menor([_Nota(v) for v in valores], k)
    except _Estourou:
        return False, None
    finally:
        _Nota.limite = 10 ** 18
    return True, (r.v if isinstance(r, _Nota) else r)
n = 3000
for nome, valores in [("crescente", list(range(n))), ("decrescente", list(range(n, 0, -1)))]:
    for k in (1, n // 2, n):
        esperado = sorted(valores)[k - 1]
        coube, r = _seleciona_medindo(valores, k, 60 * n)
        assert coube, f"numa lista de {n} notas em ordem {nome}, com k = {k}, a função passou de {60 * n} comparações, e a seleção deveria fazer O(n) em média. Se o pivô é fixo (o primeiro ou o último), entradas ordenadas dividem mal: sorteie o pivô."
        assert r == esperado, f"lista em ordem {nome}, k = {k}: deu {r}, esperado {esperado}"`},{name:`notas em forma de vale`,code:`class _Estourou(Exception):
    pass

class _Nota:
    __slots__ = ("v",)
    cont = 0
    limite = 0
    def __init__(self, v):
        self.v = v
    def _c(self, o):
        _Nota.cont += 1
        if _Nota.cont > _Nota.limite:
            raise _Estourou()
        return o.v if isinstance(o, _Nota) else o
    def __lt__(self, o): return self.v < self._c(o)
    def __le__(self, o): return self.v <= self._c(o)
    def __gt__(self, o): return self.v > self._c(o)
    def __ge__(self, o): return self.v >= self._c(o)
    def __eq__(self, o): return self.v == self._c(o)
    def __ne__(self, o): return self.v != self._c(o)
    def __hash__(self): return hash(self.v)
    def __repr__(self): return repr(self.v)

def _seleciona_medindo(valores, k, limite):
    """Devolve (coube no limite?, resposta)."""
    import random
    random.seed(2024)   # sorteios reprodutíveis: o mesmo código dá sempre o mesmo resultado
    _Nota.cont = 0
    _Nota.limite = limite
    try:
        r = k_esimo_menor([_Nota(v) for v in valores], k)
    except _Estourou:
        return False, None
    finally:
        _Nota.limite = 10 ** 18
    return True, (r.v if isinstance(r, _Nota) else r)
n = 3000
valores = list(range(n // 2)) + list(range(n // 2, 0, -1))
k = n // 2
esperado = sorted(valores)[k - 1]
coube, r = _seleciona_medindo(valores, k, 60 * n)
assert coube, f"numa lista que sobe e desce ({n} notas), a função passou de {60 * n} comparações, e a seleção deveria fazer O(n) em média. Se o pivô é o do meio (ou a mediana de três), nesta entrada ele cai sempre num extremo: sorteie o pivô."
assert r == esperado, f"lista em forma de vale, k = {k}: deu {r}, esperado {esperado}"`},{name:`sem atalhos`,code:`import io as _io, re as _re, tokenize as _tk

def _codigo(src):
    ignorar = {_tk.COMMENT, _tk.STRING}
    for nome in ("FSTRING_MIDDLE", "TSTRING_MIDDLE"):
        if hasattr(_tk, nome):
            ignorar.add(getattr(_tk, nome))
    try:
        return " ".join(t.string for t in _tk.generate_tokens(_io.StringIO(src).readline) if t.type not in ignorar)
    except (_tk.TokenError, SyntaxError):
        return src
proibidos = [nome for nome, padrao in (("sorted", r"\\bsorted\\b"), (".sort", r"\\.\\s*sort\\b"), ("heapq", r"\\bheapq\\b"), ("statistics", r"\\bstatistics\\b")) if _re.search(padrao, _codigo(_source))]
assert not proibidos, f"não use {', '.join(proibidos)}: o desafio é selecionar sem ordenar"`}]}}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Dividir para conquistar = **dividir** em subproblemas do mesmo tipo, **resolver** cada um recursivamente, **combinar** as respostas.
- Custo pela árvore de recursão: chamadas por nível × trabalho por chamada, somado em todos os níveis.
- T(n/2) + O(1) = O(log n); T(n/2) + O(n) = O(n); 2T(n/2) + O(1) = O(n), sem ganho sobre o laço; 2T(n/2) + O(n) = O(n log n); 3T(n/2) + O(n) = O(n^1,585).
- Dividir só acelera se você **descarta** partes, se a **combinação** é barata ou se **diminui o número** de subproblemas.
- Profundidade da pilha = altura da árvore: log₂ n ao dividir pela metade, n ao tirar um por vez (RecursionError perto de 1 000 no Python).
- Passe índices \`lo\` e \`hi\`; fatias copiam e mudam a recorrência.
- Karatsuba: ad + bc = (a + b)(c + d) − ac − bd, 3 produtos em vez de 4.
- Seleção rápida: pivô sorteado, continua só no grupo da resposta; O(n) esperado, O(n²) no pior caso.`},{type:`callout`,tone:`english`,text:`- **divide and conquer**: dividir para conquistar
- **combine step**: etapa de combinação
- **recurrence relation**: relação de recorrência
- **recursion tree**: árvore de recursão
- **recursion depth**: profundidade da recursão
- **quickselect / k-th smallest element**: seleção rápida / k-ésimo menor elemento

Frase típica de entrevista: *"The recurrence is T(n) = 2T(n/2) + O(n), so the algorithm runs in O(n log n) time, and the recursion depth is only O(log n)."*

Outra: *"Quickselect runs in expected linear time; I'd pick the pivot at random so that no input ordering triggers the quadratic worst case."*`,title:`English corner`}]}],cards:[{id:`l4-dividir-conquistar#1`,front:`Quais são as três etapas de um algoritmo de dividir para conquistar?`,back:`Dividir em subproblemas menores do mesmo tipo, resolver cada um recursivamente e combinar as respostas.`},{id:`l4-dividir-conquistar#2`,front:`Qual o custo de T(n) = 2T(n/2) + O(1), e por que dividir não acelerou nada?`,back:`O(n): a árvore tem 2n − 1 chamadas de custo constante, e as duas metades continuam sendo visitadas por inteiro.`},{id:`l4-dividir-conquistar#3`,front:`Como a árvore de recursão mostra que T(n) = 2T(n/2) + O(n) é O(n log n)?`,back:`Cada nível tem 2ᵏ chamadas de tamanho n/2ᵏ, somando n de trabalho, e há log₂ n níveis.`},{id:`l4-dividir-conquistar#4`,front:`Qual a profundidade da pilha numa recursão que corta o problema ao meio? E numa que tira um item por vez?`,back:`Cerca de log₂ n (21 quadros para um milhão); n quadros, que estouram o limite padrão do Python perto de 1 000.`},{id:`l4-dividir-conquistar#5`,front:`Por que uma busca binária recursiva que fatia a lista (xs[meio + 1:]) deixa de ser O(log n)?`,back:`Cada fatia copia O(n) elementos: a recorrência vira T(n) = T(n/2) + O(n) = O(n).`},{id:`l4-dividir-conquistar#6`,front:`Qual é o truque de Karatsuba e que custo ele atinge?`,back:`Obter ad + bc como (a + b)(c + d) − ac − bd: 3 produtos de metades em vez de 4, O(n^log₂3) ≈ O(n^1,585).`},{id:`l4-dividir-conquistar#7`,front:`Por que a seleção rápida custa O(n) esperado, e não O(n log n)?`,back:`Depois de separar os valores pelo pivô sorteado, ela continua só no grupo que contém a posição k: com cortes perto do meio, T(n) = T(n/2) + O(n), e n + n/2 + n/4 + … < 2n. Resolver os dois lados, como no merge sort, daria 2T(n/2) + O(n) = O(n log n).`}]};export{e as default};
//# sourceMappingURL=l4-dividir-conquistar-D3q0zZ7d.js.map