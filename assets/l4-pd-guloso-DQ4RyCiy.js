var e={id:`l4-pd-guloso`,moduleId:`m4-5`,title:`Programação dinâmica e algoritmos gulosos`,titleEn:`Dynamic programming and greedy algorithms`,summary:`Subproblemas sobrepostos, subestrutura ótima, tabelas de PD e quando a escolha gulosa funciona.`,minutes:45,objectives:[`Reconhecer subproblemas sobrepostos e subestrutura ótima`,`Transformar recursão em PD (top-down e bottom-up)`,`Saber quando um algoritmo guloso é correto e quando falha`],skills:[`alg-pd`],terms:[{pt:`programação dinâmica`,en:`dynamic programming (DP)`,def:`Resolver cada subproblema uma vez e reutilizar a resposta.`},{pt:`subestrutura ótima`,en:`optimal substructure`,def:`A solução ótima é composta de soluções ótimas de subproblemas.`},{pt:`subproblemas sobrepostos`,en:`overlapping subproblems`,def:`Os mesmos subproblemas aparecem várias vezes.`},{pt:`guloso`,en:`greedy`,def:`Escolhe a melhor opção local a cada passo, sem voltar atrás.`},{pt:`tabela`,en:`table / tabulation`,def:`Estrutura onde a PD bottom-up guarda os resultados.`}],references:[`clrs`,`mit-6006`,`stanford-cs161`,`kleinberg-tardos`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`**Programação dinâmica** é recursão + memória: quando um problema se divide em subproblemas que **se repetem**, resolvemos cada um **uma vez** e guardamos. **Algoritmos gulosos** fazem a melhor escolha **local** a cada passo — funcionam às vezes, e é preciso **provar** que funcionam.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`**Receita de PD**:

1. Defina o **estado**: o que identifica um subproblema? (ex.: \`melhor(i)\` = melhor resposta usando os primeiros i itens.)
2. Escreva a **recorrência**: como \`melhor(i)\` depende de estados menores?
3. Defina os **casos base**.
4. Escolha a **ordem**: top-down (recursão + cache) ou bottom-up (preencher uma tabela do menor para o maior).

**Exemplo — troco mínimo**: menor número de moedas para dar o valor V com moedas \`[1, 3, 4]\`.
\`troco(v) = 1 + min(troco(v − m) para cada moeda m ≤ v)\`, com \`troco(0) = 0\`.

**Guloso falha aqui**: para V = 6, pegar sempre a maior moeda dá 4 + 1 + 1 (3 moedas), mas o ótimo é 3 + 3 (2 moedas). Com as moedas do real (1, 5, 10, 25, 50, 100) o guloso funciona — sistemas de moedas reais são escolhidos para isso.`},{type:`callout`,tone:`info`,text:"Problemas famosos de PD: mochila (*knapsack*), maior subsequência comum (*LCS*, usada no `diff` e no Git), distância de edição (*edit distance*, usada em corretores ortográficos), caminhos em grade. Gulosos corretos: Dijkstra, Kruskal/Prim (árvore geradora mínima), codificação de Huffman, escalonamento de intervalos."}]},{stage:`exemplo`,blocks:[{type:`code`,lang:`python`,code:`def troco_minimo(moedas, valor):
    INF = float("inf")
    dp = [0] + [INF] * valor          # dp[v] = menor nº de moedas para v
    for v in range(1, valor + 1):
        for m in moedas:
            if m <= v and dp[v - m] + 1 < dp[v]:
                dp[v] = dp[v - m] + 1
    return dp[valor] if dp[valor] != INF else -1

print(troco_minimo([1, 3, 4], 6))   # 2 (3 + 3)`,runnable:!0}]},{stage:`codigo`,blocks:[{type:`trace`,code:`def caminhos(linhas, colunas):
    dp = [[1] * colunas for _ in range(linhas)]
    for i in range(1, linhas):
        for j in range(1, colunas):
            dp[i][j] = dp[i - 1][j] + dp[i][j - 1]
    return dp[-1][-1]

print(caminhos(3, 3))`,caption:`Quantos caminhos de canto a canto numa grade, andando só para a direita e para baixo? Cada célula soma a de cima e a da esquerda.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e4-pd-0`,kind:`predict`,lang:`python`,prompt:"O que este código imprime? Observe o dicionário `memo`.",code:`memo = {}
calls = 0

def fib(n):
    global calls
    if n in memo:
        return memo[n]
    calls += 1
    memo[n] = n if n < 2 else fib(n - 1) + fib(n - 2)
    return memo[n]

print(fib(5), calls)`,answer:`5 6`,difficulty:`facil`,skills:[`alg-pd`],hints:["Siga quantas vezes a linha `calls += 1` roda: cada n de 0 a 5 só é calculado uma vez."],explanation:`Com memoização, cada valor de n é calculado uma única vez (6 chamadas que chegam ao cálculo, de 0 a 5). fib(5) = 5.`}},{type:`exercise`,exercise:{id:`e4-pd-1`,kind:`code`,lang:`python`,prompt:"Escreva `escadas(n)`: de quantas formas é possível subir n degraus dando passos de 1 ou 2? (`escadas(1) == 1`, `escadas(2) == 2`, `escadas(3) == 3`). Precisa funcionar para n = 500.",difficulty:`intermediario`,skills:[`alg-pd`],hints:[`Para chegar ao degrau n, o último passo veio de n−1 ou de n−2.`,`escadas(n) = escadas(n−1) + escadas(n−2). Bottom-up com duas variáveis.`],explanation:`É a sequência de Fibonacci disfarçada. Bottom-up com duas variáveis: O(n) tempo, O(1) espaço, sem risco de RecursionError.`,starter:`def escadas(n):
    if n <= 2:
        return n
    return escadas(n - 1) + escadas(n - 2)
`,solution:`def escadas(n):
    a, b = 1, 1
    for _ in range(n - 1):
        a, b = b, a + b
    return b if n > 0 else 1`,tests:[{name:`pequenos`,code:`assert [escadas(i) for i in (1, 2, 3, 4, 5)] == [1, 2, 3, 5, 8]`},{name:`n = 500 (precisa ser eficiente)`,code:`a, b = 1, 1
for _ in range(499):
    a, b = b, a + b
assert escadas(500) == b`}]}},{type:`exercise`,exercise:{id:`e4-pd-2`,kind:`mcq`,prompt:`Moedas disponíveis: 1, 6 e 10. Valor: 12. O que o algoritmo **guloso** (sempre a maior moeda possível) devolve, e qual é o ótimo?`,difficulty:`intermediario`,skills:[`alg-pd`],hints:[`Guloso: 10 primeiro. Sobra quanto?`,`Existe forma com 2 moedas?`],explanation:`Guloso: 10 + 1 + 1 = 3 moedas. Ótimo: 6 + 6 = 2 moedas. Guloso não é sempre ótimo; PD é.`,options:[{text:`Guloso 3 moedas; ótimo 2 moedas`,correct:!0,feedback:`Isso: 10+1+1 contra 6+6.`},{text:`Os dois dão 2 moedas`,feedback:`O guloso pega o 10 primeiro e fica preso com 2 de resto.`},{text:`Guloso 2; ótimo 3`,feedback:`O ótimo nunca é pior que o guloso.`},{text:`Os dois dão 3 moedas`,feedback:`6 + 6 usa só 2.`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e4-pd-desafio`,kind:`code`,lang:`python`,prompt:'Escreva `distancia_edicao(a, b)`: o menor número de inserções, remoções ou substituições de caracteres para transformar a em b (distância de Levenshtein). `distancia_edicao("gato", "pato") == 1`.',difficulty:`desafio`,skills:[`alg-pd`],hints:[`Estado: dp[i][j] = distância entre os i primeiros caracteres de a e os j primeiros de b.`,`Bases: dp[i][0] = i, dp[0][j] = j.`,`Se a[i-1] == b[j-1]: dp[i][j] = dp[i-1][j-1]; senão 1 + min(remover, inserir, substituir).`],explanation:`Clássico de PD em tabela 2D, O(len(a) × len(b)). Usado em corretores ortográficos, bioinformática e no "Did you mean...?" do próprio Python.`,starter:`def distancia_edicao(a, b):
    pass
`,solution:`def distancia_edicao(a, b):
    dp = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
    for i in range(len(a) + 1):
        dp[i][0] = i
    for j in range(len(b) + 1):
        dp[0][j] = j
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    return dp[-1][-1]`,tests:[{name:`gato → pato`,code:`assert distancia_edicao("gato", "pato") == 1`},{name:`kitten → sitting`,code:`assert distancia_edicao("kitten", "sitting") == 3`},{name:`vazios`,code:`assert distancia_edicao("", "abc") == 3 and distancia_edicao("", "") == 0`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:"**Mini-projeto: corretor ortográfico**. Com uma lista de palavras (um dicionário de português) e `distancia_edicao`, sugira as 3 palavras mais próximas do que o usuário digitou. Como deixar rápido para 100 mil palavras? (Pesquise: *BK-tree*.)"}]},{stage:`revisao`,blocks:[{type:`md`,text:`- PD: estado, recorrência, bases, ordem (top-down ou bottom-up).
- Exige subproblemas sobrepostos e subestrutura ótima.
- Guloso: rápido e simples, mas só é correto com prova.`}]}],cards:[{id:`l4-pd-guloso#1`,front:`Quais as duas propriedades que indicam PD?`,back:`Subproblemas sobrepostos e subestrutura ótima.`},{id:`l4-pd-guloso#2`,front:`Top-down × bottom-up?`,back:`Top-down: recursão com cache. Bottom-up: preencher a tabela dos menores para os maiores.`},{id:`l4-pd-guloso#3`,front:`Quando o guloso falha no problema do troco?`,back:`Quando o sistema de moedas não é "canônico", ex.: [1, 3, 4] para 6.`}]};export{e as default};
//# sourceMappingURL=l4-pd-guloso-DQ4RyCiy.js.map