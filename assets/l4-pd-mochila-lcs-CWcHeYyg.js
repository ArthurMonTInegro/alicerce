var e={id:`l4-pd-mochila-lcs`,moduleId:`m4-5`,title:`Mochila e LCS: PD em duas dimensões e a resposta por trás do número`,titleEn:`Knapsack and LCS: two-dimensional DP and recovering the solution`,summary:`Dois problemas que servem de molde para famílias inteiras de PD: escolher um subconjunto dentro de um limite (mochila 0/1) e alinhar duas sequências (maior subsequência comum). Como desenhar um estado com duas coordenadas, reconstruir a escolha a partir da tabela, guardar uma linha só sem trocar de problema, decidir entre top-down e bottom-up e entender por que Θ(n · W) não é polinomial.`,minutes:50,objectives:[`Modelar a mochila 0/1 com o estado (i, c) e mostrar com um exemplo por que o guloso por valor/peso falha`,`Preencher a tabela da LCS e reconstruir uma subsequência ótima andando da última célula para trás`,`Reduzir a memória da mochila para uma linha e explicar por que a capacidade precisa ser percorrida de cima para baixo`,`Escolher entre top-down e bottom-up pelos estados alcançáveis, pela profundidade da recursão e pela memória`,`Explicar por que o custo Θ(n · W) é pseudopolinomial`],skills:[`alg-pd`],terms:[{pt:`mochila 0/1`,en:`0/1 knapsack`,def:`Escolher, entre itens com peso e valor, um subconjunto que caiba na capacidade W e tenha o maior valor total; cada item entra no máximo uma vez.`,example:`The 0/1 knapsack problem can be solved in O(nW) time with dynamic programming.`},{pt:`mochila ilimitada`,en:`unbounded knapsack`,def:`Variante em que cada item pode ser usado quantas vezes se quiser; o troco mínimo é desse tipo.`},{pt:`subsequência`,en:`subsequence`,def:`O que sobra de uma sequência quando se apagam zero ou mais elementos sem mudar a ordem dos demais; ao contrário da substring, não precisa ser contígua.`},{pt:`maior subsequência comum`,en:`longest common subsequence (LCS)`,def:`A subsequência mais longa presente em duas sequências ao mesmo tempo.`,example:`diff works by finding a longest common subsequence of the lines of the two files.`},{pt:`reconstrução da solução`,en:`solution reconstruction (traceback)`,def:`Percorrer a tabela da PD a partir da célula da resposta, refazendo a decisão que produziu cada valor, para obter a escolha e não só o número.`},{pt:`vetor rolante`,en:`rolling array`,def:`Guardar só a última linha da tabela (ou as últimas) quando cada linha depende apenas da anterior.`},{pt:`estados alcançáveis`,en:`reachable states`,def:`Os subproblemas que de fato aparecem a partir do problema original; a versão top-down calcula só esses.`},{pt:`pseudopolinomial`,en:`pseudo-polynomial`,def:`Custo polinomial no valor numérico de um número da entrada (como W), mas exponencial na quantidade de bits usada para escrevê-lo.`,example:`The knapsack DP runs in pseudo-polynomial time.`},{pt:`NP-difícil`,en:`NP-hard`,def:`Pelo menos tão difícil quanto qualquer problema de NP: um algoritmo polinomial para ele daria um para todos. Não se conhece nenhum.`}],references:[`clrs`,`kleinberg-tardos`,`mit-6006`,`stanford-cs161`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`A lição anterior montou a receita da programação dinâmica (estado, recorrência, casos base e ordem) quase sempre com um estado de um número só: o valor do troco, o degrau da escada. Só a grade de caminhos e a distância de edição do desafio usaram tabelas com duas coordenadas. Agora vamos trabalhar de propósito com estados de duas dimensões, em dois problemas que servem de molde para muitos outros:

- A {{mochila 0/1|0/1 knapsack}}: **escolher um subconjunto dentro de um limite**. Um entregador de aplicativo tem um baú que aguenta 8 kg e cinco pedidos esperando, cada um com peso e valor de corrida. Quais levar para ganhar o máximo? O mesmo molde serve para orçamento e projetos, tempo de prova e questões, espaço em disco e arquivos.
- A {{maior subsequência comum|longest common subsequence (LCS)}}: **alinhar duas sequências**. É o que está por trás do \`diff\`, que mostra as linhas que mudaram entre duas versões de um arquivo, e da comparação de trechos de DNA.

Também vamos responder a duas perguntas que ficaram no ar. A tabela diz que o melhor vale R$ 80, mas **quais** pedidos levar? (É a reconstrução da solução.) E, na prática, como escolher entre top-down e bottom-up?`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`### Mochila 0/1: o guloso tropeça de novo
O baú aguenta 8 kg. Os pedidos:`},{type:`table`,head:[`Pedido`,`Peso`,`Valor da corrida`,`R$ por kg`],rows:[[`farmácia`,`1,2 kg`,`R$ 18`,`15,0`],[`mercado`,`3,4 kg`,`R$ 35`,`10,3`],[`livraria`,`2,5 kg`,`R$ 22`,`8,8`],[`pet shop`,`4,1 kg`,`R$ 40`,`9,8`],[`padaria`,`1,8 kg`,`R$ 15`,`8,3`]],caption:`O guloso mais natural pega primeiro o pedido que rende mais por quilo.`},{type:`md`,text:`Pelo R$/kg, o guloso leva farmácia e mercado (4,6 kg), descarta o pet shop (passaria de 8 kg), leva a livraria (7,1 kg) e descarta a padaria: **R$ 75**, com 900 g sobrando que nenhum pedido restante aproveita. O melhor é farmácia, livraria e pet shop: 7,8 kg e **R$ 80**. Levar o item mais rentável primeiro pode deixar uma sobra inútil, e o guloso nunca volta atrás. Testar todos os subconjuntos dá certo, mas são 2ⁿ: com 30 pedidos, mais de 1 bilhão.

### O estado precisa de duas coordenadas
Decida um item de cada vez: o item i entra ou fica? Para decidir os itens seguintes, o que você precisa saber sobre as decisões já tomadas? Não importa **quais** itens entraram, só **quanto espaço sobrou**. Daí o estado:

**dp[i][c] = o maior valor possível usando só os i primeiros itens, com capacidade c.**

A recorrência olha o item i e compara as duas opções:

- **deixar** o item i: dp[i − 1][c];
- **levar** o item i, se peso_i ≤ c: valor_i + dp[i − 1][c − peso_i].

dp[i][c] é o maior dos dois. Caso base: dp[0][c] = 0 (sem itens, valor zero). A resposta é dp[n][W]. São (n + 1) × (W + 1) células, cada uma calculada em O(1): Θ(n · W).

Repare no i − 1 da opção "levar": depois que o item i vai para o baú, só os i − 1 primeiros continuam disponíveis. Com dp[i][c − peso_i], o mesmo item poderia entrar de novo, e você estaria resolvendo a {{mochila ilimitada|unbounded knapsack}}, em que cada item pode ser usado quantas vezes se quiser. O troco mínimo da lição anterior é desse tipo: a mesma moeda aparece várias vezes.`},{type:`table`,head:[`Abordagem`,`Tempo`,`Memória`,`Observação`],rows:[[`Força bruta (todos os subconjuntos)`,`Θ(2ⁿ · n)`,`Θ(n)`,`inviável a partir de uns 30 itens`],[`Guloso por valor/peso`,`Θ(n log n)`,`Θ(n)`,`rápido, mas errado na mochila 0/1`],[`PD com a tabela inteira`,`Θ(n · W)`,`Θ(n · W)`,`permite reconstruir a escolha`],[`PD com uma linha só`,`Θ(n · W)`,`Θ(W)`,`dá só o valor, sem a escolha`]],caption:`n itens, capacidade W (um inteiro, na unidade dos pesos).`},{type:`callout`,tone:`warn`,text:`W é um **número**, e escrevê-lo ocupa só cerca de log₂ W dígitos binários. Por isso o custo Θ(n · W) é {{pseudopolinomial|pseudo-polynomial}}: polinomial no valor de W, exponencial no tamanho da entrada, porque cada dígito binário a mais em W pode dobrar a tabela. Com pesos em gramas e capacidade de 25 toneladas, W = 25 000 000, e 40 itens já dão uma tabela de 1 bilhão de células.

Essa PD não contradiz o fato de a mochila 0/1 ser {{NP-difícil|NP-hard}} (ninguém conhece algoritmo polinomial no tamanho da entrada para ela). Na prática: com W pequeno (até alguns milhões de células no total), use a PD; senão, mude a unidade dos pesos se a precisão permitir, faça a PD indexada pelo valor em vez do peso quando os valores são pequenos, ou use busca com poda (*branch and bound*).`,title:`Θ(n · W) parece polinomial, mas não é`},{type:`md`,text:`### Uma linha basta, se você andar de cima para baixo
Cada linha i da tabela só lê a linha i − 1. Dá para guardar uma lista só, dp[c], e sobrescrevê-la item por item: é a técnica do {{vetor rolante|rolling array}}. O cuidado está no sentido do laço. Ao calcular dp[c], você lê dp[c − peso], que **precisa ainda conter o valor da linha anterior**.`},{type:`code`,lang:`python`,code:`dp = [0] * (W + 1)                      # dp[c]: melhor valor com capacidade c
for peso, valor in itens:
    for c in range(W, peso - 1, -1):    # de W para baixo
        dp[c] = max(dp[c], valor + dp[c - peso])`,runnable:!1,caption:`Mochila 0/1 em memória Θ(W).`},{type:`md`,text:`Descendo de W até peso, quando você escreve dp[c], a posição menor c − peso ainda não foi reescrita nesta rodada: ela guarda a linha anterior, e o item entra no máximo uma vez. Subindo (de peso até W), dp[c − peso] pode já ter sido atualizada **com o mesmo item**, que então entra de novo: o código vira a mochila ilimitada. Mesmas linhas, sentido oposto, outro problema.

### Maior subsequência comum: alinhando duas sequências
Uma {{subsequência|subsequence}} é o que sobra quando se apagam elementos sem mudar a ordem dos demais. "SPTO" é subsequência de "SAPATO" (apague os dois A), mas não é substring, porque substring precisa ser contígua. A LCS de duas sequências é a subsequência mais longa presente nas duas.

O estado agora são **dois prefixos**: **dp[i][j] = tamanho da LCS de a[:i] e b[:j].** A recorrência olha os últimos caracteres, a[i − 1] e b[j − 1]:

- **iguais**: dp[i][j] = dp[i − 1][j − 1] + 1. Parear os dois é sempre seguro: se uma LCS não usasse esse par, daria para trocar o último pareamento dela por ele sem perder tamanho.
- **diferentes**: os dois não podem formar par, e pelo menos um deles fica de fora da LCS, então dp[i][j] = max(dp[i − 1][j], dp[i][j − 1]).

Casos base: dp[0][j] = dp[i][0] = 0 (prefixo vazio). Para tamanhos m e n, o custo é Θ(m · n) em tempo e em memória.

A tabela tem a mesma forma da distância de edição do desafio da lição anterior (prefixo contra prefixo), e as duas se conectam: quando só são permitidas **inserções e remoções** (sem substituição), o menor número de operações para transformar a em b é m + n − 2 · LCS. É isso que um \`diff\` mostra: as linhas da LCS ficam como estão; as outras aparecem como removidas (−) ou inseridas (+).`},{type:`callout`,tone:`info`,text:"O `git diff` usa por padrão o algoritmo de Myers (1986), que encontra o menor conjunto de inserções e remoções de linhas (o mesmo que achar uma LCS das linhas) em tempo O((m + n) · D), em que D é o tamanho da diferença: muito rápido quando as duas versões são parecidas, que é o caso comum. Para não demorar em arquivos muito diferentes, o Git ainda corta caminho com heurísticas, e a opção `--minimal` pede o menor diff garantido. As opções `--patience` e `--histogram` usam outras heurísticas para produzir diffs mais fáceis de ler. Em bioinformática, o alinhamento global de sequências (Needleman–Wunsch) usa a mesma tabela, com pontuações para acertos, trocas e lacunas no lugar do +1.",title:`E o Git?`},{type:`md`,text:`### Reconstrução: do número à escolha
A tabela guarda valores, não decisões. Mas cada valor veio de uma das opções da recorrência, e dá para descobrir qual comparando com as células vizinhas. A {{reconstrução da solução|solution reconstruction (traceback)}} começa na célula da resposta e refaz o caminho de trás para a frente:

- **Mochila**, na linha i com capacidade c: se dp[i][c] == dp[i − 1][c], deixar o item i de fora já alcança esse valor; suba para a linha i − 1. Senão, o item i **entrou**: anote-o, faça c −= peso_i e suba. São n passos: Θ(n).
- **LCS**, na célula (i, j): se a[i − 1] == b[j − 1], o caractere faz parte da LCS; anote-o e siga na diagonal para (i − 1, j − 1). Senão, vá para a célula de cima ou da esquerda que tiver o mesmo valor que dp[i][j]. Cada passo diminui i ou j: Θ(m + n). Os caracteres saem do último para o primeiro, então inverta no fim.

Pode haver mais de uma resposta ótima. "ABCBDAB" e "BDCABA" têm três LCS de tamanho 4: BCBA, BCAB e BDAB. Qual delas sai depende de como você desempata quando as células de cima e da esquerda têm o mesmo valor.`},{type:`callout`,tone:`warn`,text:`A reconstrução precisa da tabela inteira, ou de uma tabela que registre a decisão de cada célula. A versão de uma linha só dá apenas o **valor**: as linhas antigas, que diriam o caminho, foram sobrescritas.`,title:`Reconstruir custa memória`},{type:`callout`,tone:`deep`,text:`Para a LCS, dá para ter as duas coisas. O algoritmo de Hirschberg (1975) encontra uma LCS completa em tempo O(m · n) e memória linear, O(m + n). Ele roda a versão de uma linha só de cima para baixo e de baixo para cima para descobrir em que coluna a LCS cruza a linha do meio de a e então resolve recursivamente os dois pedaços, como em dividir para conquistar. O tempo continua O(m · n) porque, a cada nível da recursão, as subtabelas somam metade da área do nível anterior.`,title:`Memória linear e reconstrução: Hirschberg`},{type:`md`,text:`### Top-down ou bottom-up, na prática
A lição anterior apresentou as duas formas de PD. Com estados de duas dimensões, as diferenças começam a pesar:`},{type:`table`,head:[`Critério`,`Top-down (recursão + cache)`,`Bottom-up (tabela)`],rows:[[`Quais estados calcula`,`só os alcançáveis a partir do problema original`,`todos os da tabela, inclusive os que a resposta nunca usa`],[`Ordem de cálculo`,`a recursão descobre sozinha`,`você escolhe uma ordem em que cada dependência vem antes`],[`Pilha de chamadas`,`profundidade igual à maior cadeia de dependências: n na mochila, até m + n na LCS`,`nenhuma recursão`],[`Memória`,`um dicionário com cada estado visitado`,`pode guardar só a linha anterior`],[`Custo por estado`,`chamada de função e hash da chave`,`acesso a uma lista`]],caption:`O Python interrompe a recursão perto de 1 000 níveis (RecursionError): uma LCS top-down entre dois textos de 2 000 caracteres já passa disso. No Python que roda no navegador, uma recursão com @cache pode estourar a pilha antes desse limite.`},{type:`md`,text:`Os {{estados alcançáveis|reachable states}} fazem muita diferença quando os pesos são "espalhados". No código desta lição, com pesos em gramas, a tabela tem 48 006 células e a versão top-down visita só 45 estados: partindo de (5, 8000), cada nível i só alcança as capacidades que sobram depois de alguma combinação dos itens já decididos, no máximo 2⁵⁻ⁱ delas. Regra prática: muitos estados inúteis (poucos itens, pesos grandes) favorecem o top-down; tabela densa, entradas longas ou memória apertada favorecem o bottom-up.`}]},{stage:`exemplo`,blocks:[{type:`md`,text:`### A tabela da mochila, célula por célula
Quatro encomendas e um baú de 7 kg: A (1 kg, R$ 10), B (3 kg, R$ 40), C (4 kg, R$ 50) e D (5 kg, R$ 70). Cada linha acrescenta um item; cada coluna é uma capacidade c.`},{type:`table`,head:[`Itens disponíveis`,`c = 0`,`1`,`2`,`3`,`4`,`5`,`6`,`7`],rows:[[`nenhum`,`**0**`,`0`,`0`,`0`,`0`,`0`,`0`,`0`],[`+ A (1 kg, R$ 10)`,`**0**`,`10`,`10`,`10`,`10`,`10`,`10`,`10`],[`+ B (3 kg, R$ 40)`,`0`,`10`,`10`,`**40**`,`50`,`50`,`50`,`50`],[`+ C (4 kg, R$ 50)`,`0`,`10`,`10`,`40`,`50`,`60`,`60`,`**90**`],[`+ D (5 kg, R$ 70)`,`0`,`10`,`10`,`40`,`50`,`70`,`80`,`**90**`]],caption:`Em negrito, o caminho da reconstrução, de baixo para cima.`},{type:`md`,text:`Veja como sai uma célula. dp[3][7] (itens A, B e C; capacidade 7):

- deixar C: dp[2][7] = 50;
- levar C (4 kg): 50 + dp[2][3] = 50 + 40 = 90.

O maior é 90. A opção "levar" lê a linha **de cima**, 4 colunas à esquerda: a capacidade que sobra depois de pôr C no baú.

Reconstrução, a partir de dp[4][7] = 90:

1. dp[4][7] = 90 = dp[3][7]: D pode ficar de fora. Sobe com c = 7.
2. dp[3][7] = 90 ≠ dp[2][7] = 50: C **entrou**. c = 7 − 4 = 3.
3. dp[2][3] = 40 ≠ dp[1][3] = 10: B **entrou**. c = 3 − 3 = 0.
4. dp[1][0] = 0 = dp[0][0]: A fica de fora.

Resposta: B e C, 7 kg, R$ 90. O guloso por R$/kg começaria por D (R$ 14/kg), não conseguiria encaixar B nem C nos 2 kg que sobram e terminaria com D e A: R$ 80.

### A tabela da LCS
a = "SAPATO" nas linhas, b = "PASTO" nas colunas. A linha e a coluna do ∅ são os prefixos vazios.`},{type:`table`,head:[``,`∅`,`P`,`A`,`S`,`T`,`O`],rows:[[`∅`,`0`,`0`,`0`,`0`,`0`,`0`],[`S`,`0`,`0`,`0`,`1`,`1`,`1`],[`A`,`**0**`,`0`,`1`,`1`,`1`,`1`],[`P`,`0`,`**1**`,`1`,`1`,`1`,`1`],[`A`,`0`,`1`,`**2**`,`**2**`,`2`,`2`],[`T`,`0`,`1`,`2`,`2`,`**3**`,`3`],[`O`,`0`,`1`,`2`,`2`,`3`,`**4**`]],caption:`Em negrito, o caminho da reconstrução, da célula da resposta (canto inferior direito) até a borda.`},{type:`md`,text:`Cada célula olha três vizinhas: a diagonal (quando as letras são iguais), a de cima e a da esquerda. Por exemplo, dp[4][2] compara "SAPA" com "PA": as últimas letras são iguais (A e A), então vale dp[3][1] + 1 = 1 + 1 = 2.

Reconstrução, a partir de dp[6][5] = 4:

1. O = O: entra **O**; diagonal para (5, 4).
2. T = T: entra **T**; diagonal para (4, 3).
3. A ≠ S: a célula de cima, dp[3][3], vale 1; a da esquerda, dp[4][2], vale 2, o mesmo que dp[4][3]. Vai para a esquerda.
4. A = A: entra **A**; diagonal para (3, 1).
5. P = P: entra **P**; diagonal para (2, 0), na borda. Fim.

Lidas de trás para a frente, as letras O, T, A, P dão **PATO**, a única LCS de tamanho 4 dessas duas palavras.`}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`from functools import cache

# (pedido, peso em gramas, valor da corrida em R$)
pedidos = [("farmácia", 1200, 18), ("mercado", 3400, 35), ("livraria", 2500, 22),
           ("pet shop", 4100, 40), ("padaria", 1800, 15)]
W = 8000   # o baú aguenta 8 kg

def bottom_up(pedidos, W):
    n = len(pedidos)
    dp = [[0] * (W + 1) for _ in range(n + 1)]   # dp[i][c]
    for i in range(1, n + 1):
        _, peso, valor = pedidos[i - 1]
        for c in range(W + 1):
            dp[i][c] = dp[i - 1][c]                                    # deixa o pedido i
            if peso <= c:
                dp[i][c] = max(dp[i][c], valor + dp[i - 1][c - peso])  # leva o pedido i
    escolhidos, c = [], W                # reconstrução: da última linha para a primeira
    for i in range(n, 0, -1):
        if dp[i][c] != dp[i - 1][c]:     # o valor mudou na linha i: o pedido i entrou
            escolhidos.append(pedidos[i - 1][0])
            c -= pedidos[i - 1][1]
    return dp[n][W], escolhidos[::-1], (n + 1) * (W + 1)

def top_down(pedidos, W):
    @cache
    def melhor(i, c):                    # melhor valor com os i primeiros e capacidade c
        if i == 0:
            return 0
        _, peso, valor = pedidos[i - 1]
        fora = melhor(i - 1, c)
        if peso > c:
            return fora
        return max(fora, valor + melhor(i - 1, c - peso))
    return melhor(len(pedidos), W), melhor.cache_info().currsize

def guloso_por_kg(pedidos, W):
    total, livre = 0, W
    for _, peso, valor in sorted(pedidos, key=lambda p: p[2] / p[1], reverse=True):
        if peso <= livre:
            total, livre = total + valor, livre - peso
    return total

valor, quais, celulas = bottom_up(pedidos, W)
print(f"bottom-up: R$ {valor} levando {quais} ({celulas} células)")
valor, estados = top_down(pedidos, W)
print(f"top-down:  R$ {valor} ({estados} estados visitados)")
print(f"guloso por R$/kg: R$ {guloso_por_kg(pedidos, W)}")`,runnable:!0,caption:`As duas formas de PD dão o mesmo valor, mas a tabela tem 48 006 células e o top-down visita só os estados alcançáveis. Experimente pesos em quilos inteiros (1, 3, 2, 4 e 2) com W = 8: a tabela cai para 54 células, o top-down visita 29, e a vantagem praticamente some. Repare também que arredondar os pesos mudou a resposta: trocar a unidade só vale quando a precisão perdida não importa.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e4-mlcs-1`,kind:`fill`,lang:`python`,prompt:`Complete a mochila 0/1 bottom-up. Cada lacuna é um índice da tabela.`,difficulty:`facil`,skills:[`alg-pd`],hints:[`Na opção "deixar o item i", quais itens continuam disponíveis para ocupar a capacidade c?`,`Na opção "levar o item i", quanta capacidade sobra depois de pôr o item no baú? E o item i pode entrar de novo?`,`As duas opções leem a mesma linha da tabela. Qual linha guarda o melhor resultado com um item a menos?`],explanation:`Deixar o item i vale dp[i − 1][c]: o melhor com os itens anteriores e a mesma capacidade. Levar vale valor + dp[i − 1][c − peso]: o item ocupa peso e não pode entrar de novo, então o resto vem da linha anterior. Com dp[i][c − peso] na segunda opção, o item poderia ser repetido, e o código resolveria a mochila ilimitada.`,template:`def mochila(itens, W):
    n = len(itens)
    dp = [[0] * (W + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        peso, valor = itens[i - 1]
        for c in range(W + 1):
            dp[i][c] = dp[___][c]               # deixa o item i
            if peso <= c:                       # cabe? então pode levar
                dp[i][c] = max(dp[i][c], valor + dp[___][___])
    return dp[n][W]`,blanks:[[`i - 1`,`i-1`,`i -1`,`i- 1`],[`i - 1`,`i-1`,`i -1`,`i- 1`],[`c - peso`,`c-peso`,`c -peso`,`c- peso`]]}},{type:`exercise`,exercise:{id:`e4-mlcs-2`,kind:`predict`,lang:`python`,prompt:`Este código roda a mochila de uma linha só duas vezes, mudando apenas o sentido em que percorre a capacidade. O que ele imprime?`,difficulty:`intermediario`,skills:[`alg-pd`],hints:[`Na mochila 0/1, que combinações dos dois itens cabem em 7? E se um item pudesse ser repetido?`,`No sentido crescente, quando o código calcula dp[6] com o item de peso 3, dp[3] já foi atualizado com esse mesmo item nesta rodada?`,`Faça à mão a primeira rodada (item de peso 3) nos dois sentidos e compare dp[6] e dp[7].`],explanation:`Descendo, cada item entra no máximo uma vez: os dois juntos pesam 8 e não cabem, então o melhor é o item de peso 5, que vale 70. Subindo, dp[3] já vale 50 quando dp[6] é calculado na mesma rodada, e dp[6] = 50 + dp[3] = 100: o item de peso 3 entrou duas vezes. É a mochila ilimitada, em que 3 + 3 = 6 kg valem 100, e dp[7] herda esse valor.`,code:`def mochila_1d(itens, W, crescente):
    dp = [0] * (W + 1)
    for peso, valor in itens:
        if crescente:
            faixa = range(peso, W + 1)
        else:
            faixa = range(W, peso - 1, -1)
        for c in faixa:
            dp[c] = max(dp[c], valor + dp[c - peso])
    return dp[W]

itens = [(3, 50), (5, 70)]
print(mochila_1d(itens, 7, False), mochila_1d(itens, 7, True))`,answer:`70 100`}},{type:`exercise`,exercise:{id:`e4-mlcs-3`,kind:`parsons`,lang:`python`,prompt:`Monte a função que calcula o **tamanho** da LCS de a e b, preenchendo a tabela linha por linha (o laço de i fica por fora).`,difficulty:`intermediario`,skills:[`alg-pd`],hints:[`O que precisa existir antes de qualquer laço?`,`Qual comparação decide entre a diagonal e o maior dos vizinhos?`,`Onde está a resposta quando a tabela inteira foi preenchida, e em que nível de indentação fica o return?`],explanation:`Primeiro, a tabela de zeros com uma linha e uma coluna a mais para os prefixos vazios. Depois, os dois laços, com i por fora; dentro deles, a comparação dos últimos caracteres decide entre diagonal + 1 e o maior dos vizinhos. O return fica fora dos laços, porque a resposta está na última célula. Preencher linha por linha funciona porque cada célula só depende de células da linha anterior ou da mesma linha, mais à esquerda.`,lines:[`def tamanho_lcs(a, b):`,`    dp = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]`,`    for i in range(1, len(a) + 1):`,`        for j in range(1, len(b) + 1):`,`            if a[i - 1] == b[j - 1]:`,`                dp[i][j] = dp[i - 1][j - 1] + 1`,`            else:`,`                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])`,`    return dp[len(a)][len(b)]`]}},{type:`exercise`,exercise:{id:`e4-mlcs-4`,kind:`code`,lang:`python`,prompt:'Escreva `subsequencia_comum(a, b)` que devolve **uma** maior subsequência comum de a e b, como string. Exemplo: `subsequencia_comum("SAPATO", "PASTO")` devolve `"PATO"`.\n\nQuando houver mais de uma resposta de tamanho máximo, qualquer uma serve. Os textos podem passar de cem caracteres, então testar todas as subsequências não termina a tempo.',difficulty:`intermediario`,skills:[`alg-pd`],hints:[`Antes de achar as letras, você precisa saber o tamanho da LCS de todos os prefixos. Qual tabela dá isso?`,`De que célula a reconstrução começa? Em cada célula, que pergunta revela de onde o valor veio?`,`Se as letras são iguais, para onde você anda? Se são diferentes, como escolher entre a célula de cima e a da esquerda?`,`Em que ordem as letras são encontradas? O que precisa acontecer antes de devolver?`,`Teste ("", "ABC") e ("ABC", "XYZ"): o laço da reconstrução termina e devolve a string vazia?`],explanation:`A tabela dá dp[i][j] para todos os pares de prefixos em Θ(m · n). A reconstrução começa em (m, n): letras iguais entram na resposta e o caminho segue na diagonal; letras diferentes levam à célula vizinha que tem o mesmo valor (em caso de empate, qualquer uma). Como as letras aparecem do fim para o começo, é preciso inverter antes de devolver. Atalhos gulosos não servem: parear cada letra de a com a próxima ocorrência em b dá "ABA" para "ABCBDAB" e "BDCABA", mas a LCS tem 4 letras.`,starter:`def subsequencia_comum(a, b):
    # 1. preencha dp[i][j] = tamanho da LCS de a[:i] e b[:j]
    # 2. ande de dp[len(a)][len(b)] até a borda refazendo as decisões
    #    e devolva as letras da LCS, na ordem certa, como uma string
    pass`,solution:`def subsequencia_comum(a, b):
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    letras = []
    i, j = m, n
    while i > 0 and j > 0:
        if a[i - 1] == b[j - 1]:
            letras.append(a[i - 1])
            i -= 1
            j -= 1
        elif dp[i - 1][j] >= dp[i][j - 1]:
            i -= 1
        else:
            j -= 1
    return "".join(reversed(letras))`,tests:[{name:`SAPATO e PASTO`,code:`def _eh_subseq(s, t):
    it = iter(t)
    return all(ch in it for ch in s)

def _lcs_tam(a, b):
    ant = [0] * (len(b) + 1)
    for x in a:
        cur = [0]
        for j, y in enumerate(b):
            cur.append(ant[j] + 1 if x == y else max(ant[j + 1], cur[j]))
        ant = cur
    return ant[-1]

def _confere(a, b):
    r = subsequencia_comum(a, b)
    assert isinstance(r, str), f"subsequencia_comum({a!r}, {b!r}) deve devolver uma string; veio {r!r}"
    for t in (a, b):
        if _eh_subseq(r[::-1], t):
            dica = "as letras saem do fim para o começo; você inverteu a lista antes de devolver?"
        else:
            dica = "confira em que situação a reconstrução acrescenta uma letra e para onde ela anda depois"
        assert _eh_subseq(r, t), f"subsequencia_comum({a!r}, {b!r}) devolveu {r!r}, que não é subsequência de {t!r}: {dica}"
    esperado = _lcs_tam(a, b)
    assert len(r) == esperado, f"subsequencia_comum({a!r}, {b!r}) devolveu {r!r}, com {len(r)} letra(s); a maior subsequência comum tem {esperado}"
_confere("SAPATO", "PASTO")
_r = subsequencia_comum("SAPATO", "PASTO")
assert _r == "PATO", f"a única LCS de SAPATO e PASTO é PATO; veio {_r!r}"`},{name:`vazias, nada em comum e iguais`,code:`def _eh_subseq(s, t):
    it = iter(t)
    return all(ch in it for ch in s)

def _lcs_tam(a, b):
    ant = [0] * (len(b) + 1)
    for x in a:
        cur = [0]
        for j, y in enumerate(b):
            cur.append(ant[j] + 1 if x == y else max(ant[j + 1], cur[j]))
        ant = cur
    return ant[-1]

def _confere(a, b):
    r = subsequencia_comum(a, b)
    assert isinstance(r, str), f"subsequencia_comum({a!r}, {b!r}) deve devolver uma string; veio {r!r}"
    for t in (a, b):
        if _eh_subseq(r[::-1], t):
            dica = "as letras saem do fim para o começo; você inverteu a lista antes de devolver?"
        else:
            dica = "confira em que situação a reconstrução acrescenta uma letra e para onde ela anda depois"
        assert _eh_subseq(r, t), f"subsequencia_comum({a!r}, {b!r}) devolveu {r!r}, que não é subsequência de {t!r}: {dica}"
    esperado = _lcs_tam(a, b)
    assert len(r) == esperado, f"subsequencia_comum({a!r}, {b!r}) devolveu {r!r}, com {len(r)} letra(s); a maior subsequência comum tem {esperado}"
for _a, _b in [("", "ABC"), ("ABC", ""), ("", ""), ("ABC", "XYZ"), ("A", "A"), ("BRASIL", "BRASIL")]:
    _confere(_a, _b)`},{name:`letras repetidas e mais de uma resposta`,code:`def _eh_subseq(s, t):
    it = iter(t)
    return all(ch in it for ch in s)

def _lcs_tam(a, b):
    ant = [0] * (len(b) + 1)
    for x in a:
        cur = [0]
        for j, y in enumerate(b):
            cur.append(ant[j] + 1 if x == y else max(ant[j + 1], cur[j]))
        ant = cur
    return ant[-1]

def _confere(a, b):
    r = subsequencia_comum(a, b)
    assert isinstance(r, str), f"subsequencia_comum({a!r}, {b!r}) deve devolver uma string; veio {r!r}"
    for t in (a, b):
        if _eh_subseq(r[::-1], t):
            dica = "as letras saem do fim para o começo; você inverteu a lista antes de devolver?"
        else:
            dica = "confira em que situação a reconstrução acrescenta uma letra e para onde ela anda depois"
        assert _eh_subseq(r, t), f"subsequencia_comum({a!r}, {b!r}) devolveu {r!r}, que não é subsequência de {t!r}: {dica}"
    esperado = _lcs_tam(a, b)
    assert len(r) == esperado, f"subsequencia_comum({a!r}, {b!r}) devolveu {r!r}, com {len(r)} letra(s); a maior subsequência comum tem {esperado}"
for _a, _b in [("ABCBDAB", "BDCABA"), ("AAAA", "AA"), ("ABAB", "BABA"), ("PALMEIRAS", "PARMERA"), ("ARARA", "ARRAIA")]:
    _confere(_a, _b)`},{name:`aleatório`,code:`def _eh_subseq(s, t):
    it = iter(t)
    return all(ch in it for ch in s)

def _lcs_tam(a, b):
    ant = [0] * (len(b) + 1)
    for x in a:
        cur = [0]
        for j, y in enumerate(b):
            cur.append(ant[j] + 1 if x == y else max(ant[j + 1], cur[j]))
        ant = cur
    return ant[-1]

def _confere(a, b):
    r = subsequencia_comum(a, b)
    assert isinstance(r, str), f"subsequencia_comum({a!r}, {b!r}) deve devolver uma string; veio {r!r}"
    for t in (a, b):
        if _eh_subseq(r[::-1], t):
            dica = "as letras saem do fim para o começo; você inverteu a lista antes de devolver?"
        else:
            dica = "confira em que situação a reconstrução acrescenta uma letra e para onde ela anda depois"
        assert _eh_subseq(r, t), f"subsequencia_comum({a!r}, {b!r}) devolveu {r!r}, que não é subsequência de {t!r}: {dica}"
    esperado = _lcs_tam(a, b)
    assert len(r) == esperado, f"subsequencia_comum({a!r}, {b!r}) devolveu {r!r}, com {len(r)} letra(s); a maior subsequência comum tem {esperado}"
import random
for _ in range(300):
    _a = "".join(random.choice("ACGT") for _ in range(random.randint(0, 12)))
    _b = "".join(random.choice("ACGT") for _ in range(random.randint(0, 12)))
    _confere(_a, _b)`},{name:`textos longos (precisa ser PD)`,code:`def _eh_subseq(s, t):
    it = iter(t)
    return all(ch in it for ch in s)

def _lcs_tam(a, b):
    ant = [0] * (len(b) + 1)
    for x in a:
        cur = [0]
        for j, y in enumerate(b):
            cur.append(ant[j] + 1 if x == y else max(ant[j + 1], cur[j]))
        ant = cur
    return ant[-1]

def _confere(a, b):
    r = subsequencia_comum(a, b)
    assert isinstance(r, str), f"subsequencia_comum({a!r}, {b!r}) deve devolver uma string; veio {r!r}"
    for t in (a, b):
        if _eh_subseq(r[::-1], t):
            dica = "as letras saem do fim para o começo; você inverteu a lista antes de devolver?"
        else:
            dica = "confira em que situação a reconstrução acrescenta uma letra e para onde ela anda depois"
        assert _eh_subseq(r, t), f"subsequencia_comum({a!r}, {b!r}) devolveu {r!r}, que não é subsequência de {t!r}: {dica}"
    esperado = _lcs_tam(a, b)
    assert len(r) == esperado, f"subsequencia_comum({a!r}, {b!r}) devolveu {r!r}, com {len(r)} letra(s); a maior subsequência comum tem {esperado}"
import random
_a = "".join(random.choice("ACGT") for _ in range(160))
_b = "".join(random.choice("ACGT") for _ in range(140))
_confere(_a, _b)`}]}},{type:`exercise`,exercise:{id:`e4-mlcs-5`,kind:`mcq`,prompt:`A PD da mochila 0/1 roda em Θ(n · W). Mesmo assim, a mochila 0/1 é NP-difícil: não se conhece algoritmo polinomial para ela. Por que não há contradição?`,difficulty:`avancado`,skills:[`alg-pd`,`alg-complexidade`],hints:[`Quantos dígitos binários você precisa para escrever o número 1 000 000? E quantas colunas a tabela teria com W = 1 000 000?`,`Se você acrescenta um dígito binário a W, o que acontece com o tamanho da entrada? E com o número de colunas?`,`"Polinomial" é medido em relação a quê?`],explanation:`O tamanho da entrada é a quantidade de bits para escrevê-la: os n pesos e valores e o número W, que ocupa uns log₂ W bits. Um custo proporcional a W é proporcional a 2 elevado ao número de bits de W, ou seja, exponencial no tamanho da entrada. Por isso a PD é chamada de pseudopolinomial. Ela é excelente quando W é pequeno (pesos em quilos, capacidade de alguns milhares) e inviável quando W é astronômico (pesos em gramas, capacidade em toneladas).`,options:[{text:`Polinomial se mede no tamanho da entrada em bits. W ocupa uns log₂ W bits, então n · W pode ser exponencial nesse tamanho: cada bit a mais em W pode dobrar a tabela.`,correct:!0,feedback:`Isso. Θ(n · W) é pseudopolinomial: polinomial no valor numérico de W, não na quantidade de dígitos usada para escrevê-lo.`},{text:`Porque Θ(n · W) é exponencial em n: cada item novo dobra o tamanho da tabela.`,feedback:`Cada item novo acrescenta só uma linha à tabela: em n, o custo é linear. O problema está em W, que pode ser enorme mesmo escrito com poucos dígitos.`},{text:`Porque a PD só encontra uma aproximação do ótimo; a resposta exata exigiria testar todos os subconjuntos.`,feedback:`A PD é exata: em cada estado ela compara as duas opções e nunca descarta a melhor. O que pode ser inviável é o custo, não a resposta.`},{text:`Porque a PD só funciona quando os pesos são todos diferentes; com pesos repetidos, ela pode errar.`,feedback:`Pesos repetidos não atrapalham: cada item tem a sua própria linha na tabela, qualquer que seja o peso.`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e4-mlcs-desafio`,kind:`code`,lang:`python`,prompt:"Dois entregadores saem juntos do restaurante e dividem as entregas da noite. A entrega i leva `tempos[i]` minutos (ida e volta), e cada entregador faz as suas uma depois da outra. O restaurante fecha quando **o último** volta.\n\nEscreva `divide(tempos)` que devolve a lista de **índices** das entregas do entregador A (o B faz todas as outras) de modo que o último a voltar volte o mais cedo possível. Os tempos são inteiros positivos, e qualquer divisão ótima serve. Exemplo: para `[3, 3, 2, 2, 2]`, uma resposta é `[0, 1]` (A: 3 + 3 = 6 min; B: 2 + 2 + 2 = 6 min).\n\nOs testes usam até 60 entregas de até 150 minutos cada.",difficulty:`desafio`,skills:[`alg-pd`],hints:[`Se A fica com soma s e o total é T, quando o último volta? Para que valores de s essa conta é a menor?`,`A pergunta vira: qual é a maior soma s ≤ T // 2 que dá para formar com algumas entregas, cada uma usada no máximo uma vez? Com que problema da lição isso se parece?`,`Que estado responde "dá para somar exatamente s usando só as i primeiras entregas?" Quais são as opções da recorrência?`,`Para devolver os índices, e não só a soma, o que você precisa guardar? Andando da última linha para a primeira, em que situação a entrega i obrigatoriamente entrou?`,`O guloso "a maior entrega vai para quem está mais livre" funciona em [3, 3, 2, 2, 2]?`],explanation:`Se A soma s, o último volta em max(s, T − s), que é mínimo quando s é a maior soma alcançável que não passa de T // 2. É uma mochila 0/1 em que o valor de cada item é o próprio peso (o problema da soma de subconjuntos, *subset sum*): alcanca[i][s] = alcanca[i − 1][s] ou (t_i ≤ s e alcanca[i − 1][s − t_i]). A tabela custa Θ(n · T), pseudopolinomial como a mochila. Na reconstrução, se alcanca[i − 1][s] é falso, a entrega i precisou entrar: anote-a e subtraia o tempo dela de s. O guloso (maior entrega para quem está mais livre) dá 7 minutos em [3, 3, 2, 2, 2]; o ótimo é 6.`,starter:`def divide(tempos):
    # devolva a lista de índices das entregas do entregador A
    # (o B faz as outras) para que o último volte o mais cedo possível
    return []`,solution:`def divide(tempos):
    n = len(tempos)
    meta = sum(tempos) // 2
    # alcanca[i][s]: dá para somar exatamente s com as i primeiras entregas?
    alcanca = [[False] * (meta + 1) for _ in range(n + 1)]
    alcanca[0][0] = True
    for i in range(1, n + 1):
        t = tempos[i - 1]
        for s in range(meta + 1):
            alcanca[i][s] = alcanca[i - 1][s] or (t <= s and alcanca[i - 1][s - t])
    s = max(x for x in range(meta + 1) if alcanca[n][x])
    escolhidas = []
    for i in range(n, 0, -1):
        if not alcanca[i - 1][s]:      # sem a entrega i não chega em s: ela entrou
            escolhidas.append(i - 1)
            s -= tempos[i - 1]
    return escolhidas[::-1]`,tests:[{name:`exemplo: o guloso não basta`,code:`def _otimo(tempos):
    alcanca = 1
    for t in tempos:
        alcanca |= alcanca << t
    total = sum(tempos)
    s = max(x for x in range(total // 2 + 1) if (alcanca >> x) & 1)
    return total - s

def _confere(tempos):
    r = divide(list(tempos))
    assert isinstance(r, list), f"divide deve devolver uma lista de índices; veio {r!r}"
    assert all(isinstance(i, int) and 0 <= i < len(tempos) for i in r), f"divide({tempos}) devolveu {r}: todo índice precisa estar entre 0 e {len(tempos) - 1}"
    assert len(set(r)) == len(r), f"divide({tempos}) devolveu {r}, com índices repetidos: cada entrega é feita uma vez só. Confira se você devolve índices (e não tempos) e se a mesma entrega não entra duas vezes na soma"
    a = sum(tempos[i] for i in r)
    b = sum(tempos) - a
    esperado = _otimo(tempos)
    assert max(a, b) == esperado, f"divide({tempos}): A ficou com {a} min e B com {b} min, e o último volta em {max(a, b)} min; dá para voltar em {esperado} min"
_confere([3, 3, 2, 2, 2])`},{name:`bordas: nenhuma, uma, iguais`,code:`def _otimo(tempos):
    alcanca = 1
    for t in tempos:
        alcanca |= alcanca << t
    total = sum(tempos)
    s = max(x for x in range(total // 2 + 1) if (alcanca >> x) & 1)
    return total - s

def _confere(tempos):
    r = divide(list(tempos))
    assert isinstance(r, list), f"divide deve devolver uma lista de índices; veio {r!r}"
    assert all(isinstance(i, int) and 0 <= i < len(tempos) for i in r), f"divide({tempos}) devolveu {r}: todo índice precisa estar entre 0 e {len(tempos) - 1}"
    assert len(set(r)) == len(r), f"divide({tempos}) devolveu {r}, com índices repetidos: cada entrega é feita uma vez só. Confira se você devolve índices (e não tempos) e se a mesma entrega não entra duas vezes na soma"
    a = sum(tempos[i] for i in r)
    b = sum(tempos) - a
    esperado = _otimo(tempos)
    assert max(a, b) == esperado, f"divide({tempos}): A ficou com {a} min e B com {b} min, e o último volta em {max(a, b)} min; dá para voltar em {esperado} min"
for _ts in ([], [7], [5, 5], [1, 1, 1], [10, 1, 1], [4, 4, 4, 4]):
    _confere(_ts)`},{name:`aleatórios pequenos`,code:`def _otimo(tempos):
    alcanca = 1
    for t in tempos:
        alcanca |= alcanca << t
    total = sum(tempos)
    s = max(x for x in range(total // 2 + 1) if (alcanca >> x) & 1)
    return total - s

def _confere(tempos):
    r = divide(list(tempos))
    assert isinstance(r, list), f"divide deve devolver uma lista de índices; veio {r!r}"
    assert all(isinstance(i, int) and 0 <= i < len(tempos) for i in r), f"divide({tempos}) devolveu {r}: todo índice precisa estar entre 0 e {len(tempos) - 1}"
    assert len(set(r)) == len(r), f"divide({tempos}) devolveu {r}, com índices repetidos: cada entrega é feita uma vez só. Confira se você devolve índices (e não tempos) e se a mesma entrega não entra duas vezes na soma"
    a = sum(tempos[i] for i in r)
    b = sum(tempos) - a
    esperado = _otimo(tempos)
    assert max(a, b) == esperado, f"divide({tempos}): A ficou com {a} min e B com {b} min, e o último volta em {max(a, b)} min; dá para voltar em {esperado} min"
import random
for _ in range(300):
    _confere([random.randint(1, 20) for _ in range(random.randint(0, 10))])`},{name:`muitas entregas (precisa ser PD)`,code:`def _otimo(tempos):
    alcanca = 1
    for t in tempos:
        alcanca |= alcanca << t
    total = sum(tempos)
    s = max(x for x in range(total // 2 + 1) if (alcanca >> x) & 1)
    return total - s

def _confere(tempos):
    r = divide(list(tempos))
    assert isinstance(r, list), f"divide deve devolver uma lista de índices; veio {r!r}"
    assert all(isinstance(i, int) and 0 <= i < len(tempos) for i in r), f"divide({tempos}) devolveu {r}: todo índice precisa estar entre 0 e {len(tempos) - 1}"
    assert len(set(r)) == len(r), f"divide({tempos}) devolveu {r}, com índices repetidos: cada entrega é feita uma vez só. Confira se você devolve índices (e não tempos) e se a mesma entrega não entra duas vezes na soma"
    a = sum(tempos[i] for i in r)
    b = sum(tempos) - a
    esperado = _otimo(tempos)
    assert max(a, b) == esperado, f"divide({tempos}): A ficou com {a} min e B com {b} min, e o último volta em {max(a, b)} min; dá para voltar em {esperado} min"
import random
for _ in range(3):
    _confere([random.randint(1, 150) for _ in range(60)])`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:'**Mini-projeto: o seu `diff`**. Escreva `diff(antigo, novo)` que recebe duas listas de linhas e imprime o resultado no estilo do Git: linhas comuns com dois espaços na frente, removidas com "- " e inseridas com "+ ", na ordem em que aparecem. Use a LCS das **linhas** (a mesma tabela, comparando strings inteiras em vez de caracteres) e a reconstrução. Teste com duas versões de um texto seu.\n\nDepois: (1) mostre só as linhas alteradas com duas linhas de contexto ao redor, como o `git diff`; (2) meça o tempo com arquivos de 5 000 linhas e explique por que o Git não monta a tabela inteira (pesquise *Myers diff algorithm*).'}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Mochila 0/1: dp[i][c] = melhor valor com os i primeiros itens e capacidade c; deixar (dp[i − 1][c]) ou levar (valor + dp[i − 1][c − peso]). Θ(n · W), pseudopolinomial.
- Ler a linha i − 1 na opção "levar" impede repetir o item. Com uma linha só, percorra c de W para baixo; no sentido crescente, o código vira mochila ilimitada.
- LCS: dp[i][j] para pares de prefixos; letras iguais → diagonal + 1; diferentes → max(cima, esquerda). Θ(m · n). Só com inserções e remoções, a distância é m + n − 2 · LCS.
- Reconstrução: da célula da resposta para trás, refazendo a decisão de cada passo. Precisa da tabela inteira.
- Top-down calcula só os estados alcançáveis, mas usa a pilha; bottom-up não tem recursão e permite guardar só a linha anterior.`},{type:`callout`,tone:`english`,text:`- **knapsack (0/1, unbounded, fractional)**: mochila (0/1, ilimitada, fracionária)
- **longest common subsequence (LCS)**: maior subsequência comum
- **subsequence vs. substring**: subsequência (pode pular elementos) × substring (contígua)
- **traceback / reconstruct the solution**: reconstruir a solução a partir da tabela
- **pseudo-polynomial time**: tempo pseudopolinomial
- **rolling array**: vetor rolante, guardar só a linha anterior

Frase típica de entrevista: *"The table is n by W, so the DP runs in O(nW) time, which is pseudo-polynomial. If we only need the value, we can keep a single row and iterate the capacity backwards, so each item is used at most once."*

Frase típica de documentação: *"Returns one longest common subsequence of the two sequences; if several exist, which one is returned is unspecified."*`,title:`English corner`}]}],cards:[{id:`l4-pd-mochila-lcs#1`,front:`Na mochila 0/1, o que dp[i][c] representa e qual é a recorrência?`,back:`O maior valor usando só os i primeiros itens com capacidade c: max(dp[i − 1][c], valor_i + dp[i − 1][c − peso_i]), a segunda opção só quando peso_i ≤ c.`},{id:`l4-pd-mochila-lcs#2`,front:`Na mochila com uma linha só, em que sentido se percorre a capacidade, e o que acontece no outro sentido?`,back:`De W para baixo, para que dp[c − peso] ainda seja da linha anterior. De baixo para cima, o mesmo item entra várias vezes: vira a mochila ilimitada.`},{id:`l4-pd-mochila-lcs#3`,front:`Qual é a recorrência da LCS quando os últimos caracteres são iguais? E quando são diferentes?`,back:`Iguais: dp[i − 1][j − 1] + 1. Diferentes: max(dp[i − 1][j], dp[i][j − 1]).`},{id:`l4-pd-mochila-lcs#4`,front:`Como descobrir, olhando a tabela da mochila, se o item i entrou na solução?`,back:`Na capacidade c corrente, se dp[i][c] ≠ dp[i − 1][c], o item i entrou: anote-o, faça c −= peso_i e passe à linha i − 1.`},{id:`l4-pd-mochila-lcs#5`,front:`Por que Θ(n · W) não torna a mochila 0/1 um problema polinomial?`,back:`W ocupa só uns log₂ W bits na entrada; um custo proporcional a W é exponencial nesse tamanho (pseudopolinomial).`},{id:`l4-pd-mochila-lcs#6`,front:`Qual é o menor número de inserções e remoções que transforma a em b, em função da LCS?`,back:`m + n − 2 · LCS, com m e n os tamanhos de a e b.`},{id:`l4-pd-mochila-lcs#7`,front:`Quando o top-down leva vantagem sobre o bottom-up, e quando ele é perigoso em Python?`,back:`Quando poucos estados são alcançáveis (pesos grandes e espalhados). É perigoso quando a cadeia de dependências é longa: passa de ~1 000 níveis e dá RecursionError.`}]};export{e as default};
//# sourceMappingURL=l4-pd-mochila-lcs-CWcHeYyg.js.map