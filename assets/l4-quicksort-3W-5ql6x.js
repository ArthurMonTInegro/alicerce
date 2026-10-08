var e={id:`l4-quicksort`,moduleId:`m4-3`,title:`Quicksort por dentro: partição, pivô e valores repetidos`,titleEn:`Quicksort in depth: partitioning, pivots and duplicate keys`,summary:`Como a partição de Lomuto põe o pivô no lugar definitivo, por que a posição em que o pivô cai decide entre Θ(n log n) e Θ(n²), o que o pivô aleatório garante (e o que não garante), como a partição em três vias resolve valores repetidos e o que as bibliotecas usam de verdade.`,minutes:50,objectives:[`Particionar um trecho no lugar com o esquema de Lomuto e justificar cada passo pela invariante`,`Explicar por que o quicksort custa Θ(n log n) com pivôs razoáveis e Θ(n²) com pivôs sempre na ponta, e reconhecer as entradas reais que causam cada caso`,`Diferenciar tempo esperado (pivô aleatório) de caso médio (pivô fixo, entrada aleatória)`,`Tratar muitos valores repetidos com a partição em três vias e usar a partição no lugar para achar o k-ésimo menor (seleção rápida)`],skills:[`alg-ordenacao`,`alg-recursao`],terms:[{pt:`particionamento`,en:`partitioning`,def:`Reorganizar um trecho em torno de um pivô: menores de um lado, maiores do outro e o pivô na posição definitiva entre eles.`,example:`Quicksort does all of its real work in the partitioning step.`},{pt:`esquema de Lomuto`,en:`Lomuto partition scheme`,def:`Partição em que o pivô é o último elemento, um índice varre o trecho e outro marca o fim da região dos menores; um trecho de m elementos custa m − 1 comparações.`},{pt:`esquema de Hoare`,en:`Hoare partition scheme`,def:`A partição original do quicksort: dois índices partem das pontas e trocam os pares fora do lugar; faz menos trocas e divide ao meio um trecho de valores iguais.`},{pt:`mediana de três`,en:`median-of-three`,def:`Escolher como pivô a mediana entre o primeiro, o do meio e o último elemento do trecho.`},{pt:`pivô aleatório`,en:`random pivot`,def:`Pivô sorteado entre as posições do trecho; deixa o tempo esperado em O(n log n) para qualquer entrada.`,example:`Choosing the pivot uniformly at random gives O(n log n) expected time on every input.`},{pt:`algoritmo aleatorizado`,en:`randomized algorithm`,def:`Algoritmo que faz sorteios durante a execução; a mesma entrada pode seguir caminhos e custos diferentes.`},{pt:`tempo esperado`,en:`expected running time`,def:`Média do custo sobre os sorteios do próprio algoritmo, com a entrada fixa (qualquer uma). Não confunda com caso médio, que faz a média sobre as entradas.`,example:`Randomized quicksort runs in O(n log n) expected time, regardless of the input order.`},{pt:`partição em três vias`,en:`three-way partitioning`,def:`Partição que separa menores, iguais e maiores que o pivô; os iguais já ficam no lugar e saem da recursão. É o problema da bandeira holandesa (Dutch national flag), de Dijkstra.`,example:`Use three-way partitioning when the input has many duplicate keys.`},{pt:`introsort`,en:`introsort`,def:`Híbrido usado em bibliotecas: quicksort que troca para heapsort quando a recursão fica funda demais e usa insertion sort em trechos pequenos; O(n log n) no pior caso.`},{pt:`seleção rápida`,en:`quickselect`,def:`Variante do quicksort que, depois de particionar, continua só no lado que contém a posição k; acha o k-ésimo menor em tempo esperado O(n).`,example:`Quickselect finds the k-th smallest element in expected linear time.`}],references:[`clrs`,`sedgewick-algs`,`mit-6006`,`stanford-cs161`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Na lição anterior o quicksort ocupou uma linha da tabela: O(n log n) em média, O(n²) no pior caso, não estável. Agora vamos abrir a caixa.

Merge sort e quicksort são os dois exemplos clássicos de dividir e conquistar, mas fazem o trabalho em momentos opostos. O merge sort divide sem pensar (ao meio) e faz o trabalho pesado na hora de **juntar**. O quicksort faz o trabalho pesado na hora de **dividir**: o {{particionamento|partitioning}} escolhe um pivô e manda os menores para a esquerda e os maiores para a direita. Depois não há nada para juntar: com os dois lados ordenados, o trecho inteiro está ordenado.

Pense numa fila de banco organizada por número de senha. O gerente pega uma senha como referência e anuncia: "senhas menores, para a esquerda; maiores, para a direita". Quem tem a senha de referência já está no lugar definitivo, e cada grupo repete o processo sozinho, sem precisar falar com o outro.

Tudo no quicksort decorre de **onde o pivô cai**. Perto do meio, o custo é Θ(n log n); sempre na ponta, Θ(n²). Nesta lição você vai ver por quê, quais entradas do mundo real provocam o desastre (uma lista já ordenada, uma lista cheia de valores repetidos) e as defesas: pivô aleatório, partição em três vias e o introsort das bibliotecas. No fim, a mesma partição resolve outro problema: achar a mediana sem ordenar tudo.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`### A partição de Lomuto
O {{esquema de Lomuto|Lomuto partition scheme}} usa o **último** elemento do trecho xs[lo..hi] como pivô e dois índices: j varre o trecho da esquerda para a direita, e i marca onde termina a região dos menores que o pivô. Durante toda a varredura vale a invariante:`},{type:`code`,lang:`text`,code:`[  < pivô   |   >= pivô    |  não vistos   | pivô ]
 ↑           ↑              ↑                ↑
 lo          i              j                hi`,runnable:!1,caption:`xs[lo:i] < pivô, xs[i:j] >= pivô, xs[j:hi] ainda não foram olhados, xs[hi] é o pivô.`},{type:`md`,text:`- Se xs[j] >= pivô, basta avançar j: o elemento já está na região certa.
- Se xs[j] < pivô, ele troca de lugar com xs[i] (o primeiro da região >= pivô) e i avança: a região dos menores cresceu uma posição.
- No fim, xs[i] troca com o pivô. Agora o pivô está na **posição definitiva**: à esquerda só há menores, à direita só maiores ou iguais, e nenhum dos lados precisa estar em ordem.

Um trecho de m elementos custa sempre m − 1 comparações, uma para cada elemento além do pivô. A memória extra são duas variáveis: por isso o quicksort ordena no lugar (*in-place*), sem a lista auxiliar de tamanho n que o merge sort usa para intercalar.

### Quanto custa: depende só de onde o pivô cai`},{type:`table`,head:[`Onde o pivô cai`,`Recorrência`,`Níveis de recursão`,`Comparações`],rows:[[`Sempre na mediana`,`T(n) = 2T(n/2) + (n − 1)`,`≈ log₂ n`,`≈ n log₂ n`],[`Sempre em 10% / 90%`,`T(n) = T(n/10) + T(9n/10) + (n − 1)`,`≈ log de n na base 10/9 ≈ 6,6 · log₂ n`,`Θ(n log n), com constante maior`],[`Sempre na ponta (menor ou maior)`,`T(n) = T(n − 1) + (n − 1)`,`n − 1`,`n(n − 1)/2 = Θ(n²)`],[`Posição sorteada (pivô aleatório)`,`média sobre os sorteios`,`O(log n) esperado`,`≈ 2n ln n ≈ 1,39 · n log₂ n esperadas`]],caption:`Cada nível da recursão faz no máximo n comparações no total. O que muda de linha para linha é quantos níveis existem.`},{type:`md`,text:`Duas consequências que surpreendem:

- **Não precisa acertar a mediana.** Mesmo cortando sempre em 10% e 90%, a recursão tem uns 6,6 · log₂ n níveis, cada um com no máximo n comparações: ainda Θ(n log n). O quicksort só fica quadrático quando erra **sempre, e por muito**.
- **Com pivô fixo, o pior caso é uma entrada comum.** Usando o último elemento como pivô, uma lista já ordenada (ou invertida) faz o pivô cair sempre na ponta. E dados já ordenados são o que mais aparece: um extrato bancário em ordem de data, uma planilha que alguém já ordenou e na qual só acrescentou duas linhas.

### Escolhendo o pivô
- **Fixo** (primeiro ou último): simples e quadrático em listas ordenadas ou invertidas.
- {{Mediana de três|median-of-three}}: o pivô é a mediana entre o primeiro, o do meio e o último elemento. Resolve listas ordenadas e invertidas, mas existem entradas montadas de propósito que ainda a levam a Θ(n²).
- {{Pivô aleatório|random pivot}}: sorteie uma posição do trecho e troque-a com a última antes de particionar (duas linhas a mais). O quicksort vira um {{algoritmo aleatorizado|randomized algorithm}}, e para **qualquer** entrada o {{tempo esperado|expected running time}} é O(n log n).`},{type:`callout`,tone:`info`,text:`O **caso médio** faz a média sobre as **entradas**, supondo que todas as ordens são igualmente prováveis. O quicksort com pivô fixo tem caso médio O(n log n), mas quem entregar uma lista ordenada leva Θ(n²) toda vez, inclusive alguém que conheça o código e queira derrubar o seu servidor (existem ataques de negação de serviço que exploram exatamente isso).

O **tempo esperado** faz a média sobre os **sorteios do algoritmo**, com a entrada fixa e escolhida pelo pior adversário. O pior caso Θ(n²) continua existindo (uma sequência de sorteios azarados), mas agora depende de azar, não da entrada, e a chance de ficar muito acima da média despenca à medida que n cresce.`,title:`Tempo esperado não é caso médio`},{type:`callout`,tone:`warn`,text:"Com pivô fixo e uma lista ordenada de 5 000 elementos, o quicksort recursivo empilha cerca de 5 000 chamadas, e o Python desiste perto de 1 000: `RecursionError: maximum recursion depth exceeded`. A defesa clássica é fazer a recursão só no lado **menor** e tratar o lado maior com um laço. Cada chamada recursiva recebe no máximo metade do trecho, então a pilha fica O(log n) mesmo quando o tempo é quadrático.",title:`Em Python, a pilha estoura antes`},{type:`md`,text:`### Valores repetidos: o caso que o sorteio não resolve
Imagine ordenar 100 000 respostas de uma pesquisa de satisfação, com notas de 1 a 5. Na partição de Lomuto, quem é igual ao pivô vai para a região >= pivô. Quando um trecho só tem valores iguais, todos ficam do mesmo lado, o pivô cai na ponta e o trecho diminui de apenas um elemento. Sortear o pivô não adianta: todos os candidatos são iguais.

Há duas saídas:

- O {{esquema de Hoare|Hoare partition scheme}}, o original do quicksort: dois índices partem das pontas, um em direção ao outro, e trocam os pares fora do lugar, **parando também nos iguais ao pivô**. Num trecho todo igual, eles se encontram no meio e a divisão sai equilibrada. Numa lista aleatória, ele faz cerca de três vezes menos trocas que o de Lomuto.
- A {{partição em três vias|three-way partitioning}}: separa o trecho em **menores, iguais e maiores** que o pivô. Os iguais já estão na posição definitiva e saem da recursão. Um trecho todo igual é resolvido numa única passada, Θ(n), e com k ≥ 2 valores distintos o custo esperado cai para O(n log k). É o problema da bandeira holandesa, proposto por Dijkstra, e você vai implementá-lo no desafio.`},{type:`table`,head:[`Esquema`,`Ideia`,`Trecho todo igual`,`Observação`],rows:[[`Lomuto`,`um índice varre, outro marca o fim dos menores`,`Θ(n²)`,`o mais fácil de escrever e de provar; o pivô termina no lugar`],[`Hoare`,`dois índices se aproximam pelas pontas`,`Θ(n log n)`,`menos trocas; o pivô não termina necessariamente na posição final`],[`Três vias`,`três regiões: <, = e >`,`Θ(n)`,`ideal com muitos repetidos; um pouco mais de comparações quando tudo é distinto`]]},{type:`md`,text:'### Por que o quicksort não é estável\nA partição troca elementos distantes, e um deles pode saltar por cima de outro igual. Ordene por valor os Pix `[("Ana", 50), ("Bia", 80), ("Caio", 50)]` com Lomuto: o pivô é o Pix do Caio (50); nem Ana nem Bia são menores que 50, então a troca final leva o Caio para a posição 0, à frente da Ana. Resultado: `[("Caio", 50), ("Ana", 50), ("Bia", 80)]`. Se a ordem de chegada importa, use uma ordenação estável (merge sort, Timsort) ou coloque o desempate na própria chave.'},{type:`callout`,tone:`deep`,text:"Para achar a mediana, ou o k-ésimo menor, não é preciso ordenar tudo. Depois de uma partição o pivô está na posição definitiva p. Se p = k, achou. Se k < p, a resposta está à esquerda; senão, à direita. **Só um lado** continua: é a {{seleção rápida|quickselect}}. No módulo de recursão ela aparece separando os valores em listas novas; com a partição de Lomuto, tudo acontece dentro da própria lista, e k continua sendo uma posição da lista inteira.\n\nSe o pivô cortasse sempre ao meio, seriam n + n/2 + n/4 + … < 2n comparações. Com pivô aleatório, o tempo esperado é O(n) (para a mediana, cerca de 3,4n comparações, contra ~1,39 · n log₂ n para ordenar tudo). O pior caso continua Θ(n²); existe um método determinístico O(n) no pior caso, a mediana das medianas, mas com constante bem maior. Compare com a biblioteca do Python: `statistics.median` ordena os dados (O(n log n)), e `heapq.nsmallest(k, xs)` custa O(n log k).",title:`Seleção rápida: metade do trabalho`},{type:`callout`,tone:`deep`,text:"- **C++** (`std::sort`): desde o C++11 a norma exige O(n log n) comparações no pior caso, e as principais implementações usam o {{introsort|introsort}}: quicksort com mediana de três que vigia a profundidade da recursão; se ela passa de cerca de 2 log₂ n, aquele trecho é terminado com heapsort, e trechos pequenos vão para o insertion sort.\n- **Java**: `Arrays.sort` usa um quicksort com **dois** pivôs para tipos primitivos (int, double…) e Timsort para objetos, porque objetos carregam outros dados e a estabilidade passa a importar.\n- **Go**: desde a versão 1.19, o pacote `sort` usa o pdqsort, outro híbrido de quicksort que detecta padrões ruins na entrada.\n- **Python**: `list.sort` e `sorted` usam Timsort para tudo. Nada de quicksort, e estabilidade garantida.\n\nPor que o quicksort ganha nas linguagens compiladas, se faz cerca de 39% mais comparações que o merge sort? Ele ordena no lugar, percorre a memória em sequência (o cache agradece) e o laço interno é mínimo: comparar, talvez trocar, avançar.",title:`O que as bibliotecas fazem`}]},{stage:`exemplo`,blocks:[{type:`md`,text:"Acompanhe a partição de Lomuto em `[7, 2, 9, 4, 3, 8, 5]`. O pivô é o último, **5**, e i começa em 0. Tudo antes de i já é menor que 5."},{type:`table`,head:[`j`,`xs[j]`,`xs[j] < 5?`,`Ação`,`Lista depois`,`i`],rows:[[`0`,`7`,`não`,`nada`,`[7, 2, 9, 4, 3, 8, 5]`,`0`],[`1`,`2`,`sim`,`troca xs[0] ↔ xs[1]`,`[2, 7, 9, 4, 3, 8, 5]`,`1`],[`2`,`9`,`não`,`nada`,`[2, 7, 9, 4, 3, 8, 5]`,`1`],[`3`,`4`,`sim`,`troca xs[1] ↔ xs[3]`,`[2, 4, 9, 7, 3, 8, 5]`,`2`],[`4`,`3`,`sim`,`troca xs[2] ↔ xs[4]`,`[2, 4, 3, 7, 9, 8, 5]`,`3`],[`5`,`8`,`não`,`nada`,`[2, 4, 3, 7, 9, 8, 5]`,`3`],[`fim`,`—`,`—`,`troca xs[3] ↔ xs[6] (pivô)`,`[2, 4, 3, 5, 9, 8, 7]`,`3`]],caption:`Seis comparações (m − 1, com m = 7). O 5 ficou na posição 3, a definitiva: [2, 4, 3] à esquerda e [9, 8, 7] à direita, nenhum dos dois em ordem.`},{type:`md`,text:`Rode o mesmo código passo a passo e observe i, j e a lista mudando:`},{type:`trace`,code:`def particiona(xs, lo, hi):
    pivo = xs[hi]
    i = lo
    for j in range(lo, hi):
        if xs[j] < pivo:
            xs[i], xs[j] = xs[j], xs[i]
            i += 1
    xs[i], xs[hi] = xs[hi], xs[i]
    return i

xs = [7, 2, 9, 4, 3, 8, 5]
p = particiona(xs, 0, len(xs) - 1)
print(xs, p)`,caption:`A função devolve 3, a posição final do pivô. As chamadas seguintes do quicksort trabalham em xs[0..2] e xs[4..6].`},{type:`md`,text:`Depois, cada lado repete o processo sozinho:`},{type:`code`,lang:`text`,code:`[7, 2, 9, 4, 3, 8, 5]      pivô 5 → 6 comparações
├── [2, 4, 3]              pivô 3 → 2 comparações
│   ├── [2]
│   └── [4]
└── [9, 8, 7]              pivô 7 → 2 comparações (7 é o menor: o lado esquerdo sai vazio)
    └── [8, 9]             pivô 9 → 1 comparação
        └── [8]`,runnable:!1},{type:`md`,text:"Total: 6 + 2 + 2 + 1 = 11 comparações. Repare no lado direito: `[9, 8, 7]` estava em ordem decrescente, o pivô 7 era o menor do trecho e um dos lados saiu vazio. Em escala, é exatamente esse o desastre de Θ(n²). Veja acontecer com mais elementos:"},{type:`viz`,viz:`sorting`,caption:`Escolha Quicksort (é a partição de Lomuto, com o último elemento como pivô) e tamanho 32. Rode até o fim depois de "Embaralhar" e depois de "Já ordenado", e compare os totais de comparações: no segundo caso são exatamente 32 · 31 / 2 = 496.`}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`import random

comparacoes = 0

def particiona(xs, lo, hi):
    """Lomuto: pivô = xs[hi]. Devolve a posição final do pivô."""
    global comparacoes
    pivo = xs[hi]
    i = lo                              # xs[lo:i] < pivô
    for j in range(lo, hi):             # xs[i:j] >= pivô
        comparacoes += 1
        if xs[j] < pivo:
            xs[i], xs[j] = xs[j], xs[i]
            i += 1
    xs[i], xs[hi] = xs[hi], xs[i]       # o pivô vai para o lugar definitivo
    return i

def quicksort(xs, lo=0, hi=None, aleatorio=False):
    if hi is None:
        hi = len(xs) - 1
    if lo < hi:
        if aleatorio:
            r = random.randint(lo, hi)        # sorteia o pivô...
            xs[r], xs[hi] = xs[hi], xs[r]     # ...e o leva para o fim
        p = particiona(xs, lo, hi)
        quicksort(xs, lo, p - 1, aleatorio)
        quicksort(xs, p + 1, hi, aleatorio)
    return xs

random.seed(2026)
n = 300
entradas = {"embaralhada": random.sample(range(n), n), "já ordenada": list(range(n))}
print(f"{'entrada':<12} {'pivô':<10} comparações")
for nome, base in entradas.items():
    for aleatorio in (False, True):
        comparacoes = 0
        xs = quicksort(base[:], aleatorio=aleatorio)
        assert xs == sorted(base)
        tipo = "aleatório" if aleatorio else "último"
        print(f"{nome:<12} {tipo:<10} {comparacoes:>11}")
H = sum(1 / k for k in range(1, n + 1))     # 1 + 1/2 + ... + 1/n
print(f"pior caso, n(n - 1)/2 = {n * (n - 1) // 2}")
print(f"esperado com pivô aleatório, 2(n + 1)·H - 4n ≈ {round(2 * (n + 1) * H - 4 * n)}")`,runnable:!0,caption:`Mesma função, quatro experimentos. Com pivô fixo, a lista já ordenada custa exatamente n(n − 1)/2 comparações; com pivô sorteado, a ordem da entrada deixa de importar e o custo fica perto do valor esperado 2(n + 1)·Hₙ − 4n, em que Hₙ = 1 + 1/2 + … + 1/n (para n grande, isso dá ≈ 1,39 · n log₂ n). Mude n e a semente e rode de novo; com pivô fixo e n perto de 1 000, a lista ordenada estoura o limite de recursão do Python.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e4-qs-1`,kind:`mcq`,prompt:"Depois de **uma** chamada de `particiona` (Lomuto) num trecho com pivô p, o que está garantido?",difficulty:`facil`,skills:[`alg-ordenacao`],hints:[`O que acontece com o pivô na última linha da partição?`,`Depois da partição, algum elemento à esquerda do pivô ainda pode ir parar à direita dele?`,`Olhe o resultado do exemplo, [2, 4, 3, 5, 9, 8, 7]. Como estão os dois lados?`],explanation:`A partição só faz duas coisas: põe o pivô na posição definitiva e separa os menores (à esquerda) dos maiores ou iguais (à direita). A ordem dentro de cada lado fica para as chamadas recursivas. É por isso que o quicksort não precisa de uma etapa de "juntar": quando os dois lados estiverem ordenados, o trecho todo estará.`,options:[{text:`p está na posição definitiva; à esquerda dele só há menores que p e à direita só maiores ou iguais, cada lado ainda em qualquer ordem.`,correct:!0,feedback:`Isso. A partição não ordena os lados; ela só garante que nenhum elemento precisará atravessar o pivô depois.`},{text:`O trecho inteiro está ordenado.`,feedback:`Uma passada de m − 1 comparações não ordena m elementos (isso exigiria Ω(m log m) comparações). No exemplo, [2, 4, 3] e [9, 8, 7] continuam fora de ordem depois da partição.`},{text:`p fica exatamente no meio do trecho.`,feedback:`Só se p for a mediana. O pivô vai para a posição igual ao número de elementos menores que ele: se p é o menor do trecho, vai para a primeira posição.`},{text:`Os dois lados já estão ordenados; só falta intercalá-los, como no merge sort.`,feedback:`Essa é a lógica do merge sort, que ordena as metades primeiro e junta depois. No quicksort a partição vem antes da recursão, e depois não há nada para juntar.`}]}},{type:`exercise`,exercise:{id:`e4-qs-2`,kind:`predict`,lang:`python`,prompt:`O que este código imprime? Faça a partição à mão, como na tabela do exemplo.`,difficulty:`intermediario`,skills:[`alg-ordenacao`],hints:[`Qual é o pivô? Qual é o valor inicial de i?`,`Só os elementos menores que o pivô provocam troca. Quais são eles, na ordem em que aparecem?`,`Depois de cada troca, i avança. Onde i termina, e com quem o pivô troca no final?`],explanation:`O pivô é 5. Os menores que 5 são 4, 1 e 3, nessa ordem: o 4 troca consigo mesmo (i vai a 1), o 1 troca com o 8 ([4, 1, 8, 6, 3, 5], i = 2) e o 3 troca com o 8 ([4, 1, 3, 6, 8, 5], i = 3). No fim o pivô troca com xs[3] = 6: [4, 1, 3, 5, 8, 6], e a função devolve 3. Os dois lados, [4, 1, 3] e [8, 6], continuam fora de ordem: a partição só garante a posição do pivô e o lado de cada elemento.`,code:`def particiona(xs, lo, hi):
    pivo = xs[hi]
    i = lo
    for j in range(lo, hi):
        if xs[j] < pivo:
            xs[i], xs[j] = xs[j], xs[i]
            i += 1
    xs[i], xs[hi] = xs[hi], xs[i]
    return i

xs = [4, 8, 1, 6, 3, 5]
p = particiona(xs, 0, 5)
print(xs, p)`,answer:`[4, 1, 3, 5, 8, 6] 3`}},{type:`exercise`,exercise:{id:`e4-qs-3`,kind:`mcq`,prompt:`Você troca o pivô fixo (último elemento) por um **pivô aleatório**. O que essa mudança garante?`,difficulty:`intermediario`,skills:[`alg-ordenacao`,`alg-complexidade`],hints:[`Depois da mudança, ainda existe alguma sequência de sorteios que escolhe sempre o pior pivô?`,`Com pivô fixo, de que depende o quicksort ser rápido? E com pivô sorteado, de onde vem a aleatoriedade?`,`A partição continua trocando elementos distantes?`],explanation:`O pivô aleatório transfere a aleatoriedade da entrada para o algoritmo. Com pivô fixo, o quicksort só é rápido se a entrada "colaborar"; com pivô sorteado, toda entrada (inclusive a já ordenada) tem tempo esperado O(n log n). O pior caso Θ(n²) não desaparece: só passa a depender de sorteios muito azarados, cuja probabilidade despenca com n. Garantir O(n log n) no pior caso exige outra estratégia, como o introsort ou o merge sort.`,options:[{text:`Para qualquer entrada, inclusive já ordenada, o tempo esperado (média sobre os sorteios) é O(n log n); o pior caso continua Θ(n²), mas depende de azar, não da entrada.`,correct:!0,feedback:`Isso. Tempo esperado sobre os sorteios, para toda entrada; o pior caso fica improvável, mas existe.`},{text:`O pior caso passa a ser O(n log n).`,feedback:`Ainda existe uma sequência de sorteios que escolhe sempre o menor ou o maior elemento, e ela dá Θ(n²). Ela só fica extremamente improvável. Garantia no pior caso exige, por exemplo, o introsort (que troca para heapsort) ou o merge sort.`},{text:`Só ajuda quando a entrada já é aleatória; numa lista ordenada continua quadrático.`,feedback:`É o contrário: quem depende de a entrada ser aleatória é o pivô fixo. Sorteando o pivô, a ordem da entrada deixa de importar, e a lista ordenada vira uma entrada como outra qualquer.`},{text:`Torna o quicksort estável, porque a ordem dos iguais passa a ser sorteada.`,feedback:`Ordem sorteada é o oposto de estabilidade, que exige preservar a ordem original dos iguais. O pivô aleatório não muda as trocas de longa distância da partição.`}]}},{type:`exercise`,exercise:{id:`e4-qs-4`,kind:`code`,lang:`python`,prompt:"Escreva `k_esimo(xs, k)` que devolve o **k-ésimo menor** elemento de xs, contando a partir de 0: `k = 0` é o menor e `k = len(xs) - 1` é o maior. Exemplo: `k_esimo([7, 2, 9, 4, 3, 8, 5], 3)` devolve 5, a mediana.\n\nNa lição de dividir para conquistar você fez a seleção rápida separando os valores em listas novas, o que gasta memória O(n). Aqui a ideia é a mesma, mas sem memória extra: reaproveite a partição de Lomuto desta lição.\n\nExija **tempo esperado O(n)**: particione como no quicksort, com **pivô aleatório**, mas continue só no lado que contém a posição k (a seleção rápida). Trabalhe **no lugar**: a função pode reordenar xs à vontade, mas não deve criar listas novas nem fatias. Não use `sorted`, `.sort` nem `heapq`, e não ordene a lista inteira: os testes contam as comparações.",difficulty:`intermediario`,skills:[`alg-ordenacao`,`alg-busca`],hints:[`Depois de uma partição, o pivô está numa posição p definitiva. Se p for igual a k, o que você já sabe?`,`Se k < p, em qual lado está a resposta? Algum elemento do outro lado ainda pode ser o k-ésimo menor?`,`k é uma posição da lista inteira, não do trecho. Ao continuar num lado, o que muda: k, ou só os limites lo e hi?`,`Como só um lado continua, você precisa mesmo de recursão, ou um laço que ajusta lo e hi resolve?`,`Teste com list(range(3000)) e k = 1500. Quantas partições a sua versão faz? Como o pivô está sendo escolhido?`],explanation:`Cada partição põe o pivô na posição definitiva e descarta o lado que não contém k. Como tudo acontece dentro de xs, k é sempre uma posição da lista inteira: só lo e hi mudam. Com pivô aleatório, o trecho encolhe em média por um fator constante a cada passo, e a soma n + (uma fração de n) + … é O(n): cerca de 3,4n comparações para a mediana, contra ~1,39 · n log₂ n para ordenar tudo. Com pivô fixo, uma lista já ordenada faz o trecho encolher de um em um, e o custo volta a Θ(n²). Um heap também não serve: tirar os k menores custa O(n + k log n), que para a mediana é O(n log n).`,starter:`def k_esimo(xs, k):
    # devolva o k-ésimo menor elemento de xs (k = 0 é o menor),
    # particionando e continuando só no lado que contém a posição k
    pass`,solution:`import random

def particiona(xs, lo, hi):
    r = random.randint(lo, hi)
    xs[r], xs[hi] = xs[hi], xs[r]
    pivo = xs[hi]
    i = lo
    for j in range(lo, hi):
        if xs[j] < pivo:
            xs[i], xs[j] = xs[j], xs[i]
            i += 1
    xs[i], xs[hi] = xs[hi], xs[i]
    return i

def k_esimo(xs, k):
    lo, hi = 0, len(xs) - 1
    while True:
        p = particiona(xs, lo, hi)
        if p == k:
            return xs[p]
        if k < p:
            hi = p - 1
        else:
            lo = p + 1`,tests:[{name:`mediana do exemplo`,code:`r = k_esimo([7, 2, 9, 4, 3, 8, 5], 3)
assert r == 5, f"o 3º menor (contando do 0) de [7, 2, 9, 4, 3, 8, 5] é 5; veio {r}"`},{name:`menor, maior e um só elemento`,code:`r = k_esimo([42], 0)
assert r == 42, f"com um só elemento, k = 0 devolve ele mesmo; veio {r}"
r = k_esimo([5, -3, 8, 0], 0)
assert r == -3, f"k = 0 é o menor (-3); veio {r}"
r = k_esimo([5, -3, 8, 0], 3)
assert r == 8, f"k = len - 1 é o maior (8); veio {r}"`},{name:`repetidos e negativos`,code:`base = [5, -1, 5, -1, 5, 0]
esperado = [-1, -1, 0, 5, 5, 5]
for k in range(6):
    r = k_esimo(base[:], k)
    assert r == esperado[k], f"k_esimo({base}, {k}) deveria ser {esperado[k]}; veio {r}"`},{name:`aleatório`,code:`import random
for _ in range(200):
    xs = [random.randint(-20, 20) for _ in range(random.randint(1, 30))]
    k = random.randrange(len(xs))
    esperado = sorted(xs)[k]
    r = k_esimo(xs[:], k)
    assert r == esperado, f"k_esimo({xs}, {k}) deveria ser {esperado}; veio {r}"`},{name:`sem sorted() nem .sort()`,code:`import ast
_achou = set()
for _no in ast.walk(ast.parse(_source)):
    if isinstance(_no, ast.Call):
        if isinstance(_no.func, ast.Name) and _no.func.id == "sorted":
            _achou.add("sorted()")
        if isinstance(_no.func, ast.Attribute) and _no.func.attr == "sort":
            _achou.add(".sort()")
assert not _achou, "implemente o algoritmo à mão, sem " + " nem ".join(sorted(_achou))`},{name:`no lugar: sem listas novas, fatias nem heapq`,code:`import ast
_arvore = ast.parse(_source)
_ruins = set()
for _no in ast.walk(_arvore):
    if isinstance(_no, ast.Import) and any(a.name in ("heapq", "statistics") for a in _no.names):
        _ruins.add("heapq/statistics")
    elif isinstance(_no, ast.ImportFrom) and _no.module in ("heapq", "statistics"):
        _ruins.add("heapq/statistics")
for _f in ast.walk(_arvore):
    if not isinstance(_f, ast.FunctionDef):
        continue
    for _no in ast.walk(_f):
        if isinstance(_no, (ast.List, ast.ListComp)):
            _ruins.add("listas novas")
        elif isinstance(_no, ast.Slice):
            _ruins.add("fatias como xs[a:b]")
        elif isinstance(_no, ast.Call) and isinstance(_no.func, ast.Attribute) and _no.func.attr in ("append", "extend", "insert", "copy"):
            _ruins.add("." + _no.func.attr + "()")
        elif isinstance(_no, ast.Call) and isinstance(_no.func, ast.Name) and _no.func.id in ("list", "filter"):
            _ruins.add(_no.func.id + "()")
assert not _ruins, "particione dentro de xs, trocando elementos de lugar e ajustando lo e hi, sem " + ", ".join(sorted(_ruins))`},{name:`o pivô é sorteado`,code:`import random
base = random.sample(range(1000), 60)
arranjos = set()
for _ in range(8):
    xs = base[:]
    r = k_esimo(xs, 30)
    assert r == sorted(base)[30], f"o elemento de posição 30 deveria ser {sorted(base)[30]}; veio {r}"
    arranjos.add(tuple(xs))
assert arranjos != {tuple(sorted(base))}, "a sua função deixou a lista inteira ordenada em todas as rodadas: ela está ordenando tudo. Depois de cada partição, siga só pelo lado que contém a posição k."
assert len(arranjos) > 1, "com a mesma entrada, a sua função reorganizou a lista exatamente do mesmo jeito em 8 rodadas: o pivô não está sendo sorteado. Todo pivô fixo (o primeiro, o último, o do meio, a mediana de três) tem entradas que o levam a Θ(n²); sorteie uma posição entre lo e hi."`},{name:`tempo esperado O(n): não ordena tudo`,code:`class Contado(int):
    usadas = 0
    limite = None
    msg = ""

    @classmethod
    def prepara(cls, limite, msg):
        cls.usadas, cls.limite, cls.msg = 0, limite, msg

    def _conta(self):
        Contado.usadas += 1
        if Contado.limite is not None and Contado.usadas > Contado.limite:
            Contado.limite = None
            raise AssertionError(Contado.msg)

    def __lt__(self, o):
        self._conta()
        return int.__lt__(self, o)

    def __le__(self, o):
        self._conta()
        return int.__le__(self, o)

    def __gt__(self, o):
        self._conta()
        return int.__gt__(self, o)

    def __ge__(self, o):
        self._conta()
        return int.__ge__(self, o)
import random
n = 10000
Contado.prepara(45 * n, "em 5 buscas da mediana em listas de 10 000 elementos, a sua função passou de 450 000 comparações; ordenar as listas inteiras custaria mais de 590 000. Continue só no lado que contém a posição k.")
for _ in range(5):
    valores = random.sample(range(1000000), n)
    esperado = sorted(valores)[n // 2]
    r = k_esimo([Contado(v) for v in valores], n // 2)
    assert int(r) == esperado, f"a mediana deveria ser {esperado}; veio {r}"
Contado.limite = None`},{name:`lista já ordenada`,code:`class Contado(int):
    usadas = 0
    limite = None
    msg = ""

    @classmethod
    def prepara(cls, limite, msg):
        cls.usadas, cls.limite, cls.msg = 0, limite, msg

    def _conta(self):
        Contado.usadas += 1
        if Contado.limite is not None and Contado.usadas > Contado.limite:
            Contado.limite = None
            raise AssertionError(Contado.msg)

    def __lt__(self, o):
        self._conta()
        return int.__lt__(self, o)

    def __le__(self, o):
        self._conta()
        return int.__le__(self, o)

    def __gt__(self, o):
        self._conta()
        return int.__gt__(self, o)

    def __ge__(self, o):
        self._conta()
        return int.__ge__(self, o)
n = 3000
Contado.prepara(15 * n, "numa lista já ordenada de 3 000 elementos, a sua função passou de 45 000 comparações. Como o pivô está sendo escolhido? Releia 'Escolhendo o pivô'.")
r = k_esimo([Contado(v) for v in range(n)], n // 2)
Contado.limite = None
assert int(r) == n // 2, f"em range({n}), o elemento de posição {n // 2} é {n // 2}; veio {r}"`}]}},{type:`exercise`,exercise:{id:`e4-qs-5`,kind:`mcq`,prompt:`Uma pesquisa de satisfação tem 100 000 respostas, cada uma com nota de 1 a 5. Você ordena com quicksort de **pivô aleatório** e partição de **Lomuto** (os iguais ao pivô vão para a direita). O que acontece?`,difficulty:`avancado`,skills:[`alg-ordenacao`,`alg-complexidade`],hints:[`Depois de algumas partições, os trechos passam a ter só uma nota. Como fica um trecho só com notas 3?`,`Num trecho todo igual, que diferença faz sortear o pivô?`,`Se um trecho de m elementos iguais diminui de um em um, quantas comparações ele custa no total?`],explanation:`Com só 5 valores, logo os trechos passam a conter uma nota só. Num trecho todo igual, nenhum elemento é menor que o pivô: a partição de Lomuto deixa todos à direita, o pivô cai na ponta e o trecho perde um único elemento. Um grupo de m iguais custa m(m − 1)/2 comparações; se as notas forem equilibradas (cerca de 20 000 respostas por nota), são 5 × 2 × 10⁸ = 10⁹ comparações, e a recursão chegaria a uns 20 000 níveis. A partição em três vias (ou a de Hoare) resolve isso.`,options:[{text:`Θ(n log n): o pivô aleatório protege contra qualquer entrada.`,feedback:`O sorteio protege contra a **ordem** da entrada, não contra valores iguais. Num trecho só com notas 3, qualquer pivô sorteado é 3, e a partição de Lomuto manda todos os outros para o mesmo lado.`},{text:`Fica quadrático: cada trecho só com notas iguais diminui de um em um; com ~20 000 respostas por nota, são cerca de 10⁹ comparações (e, em Python, a recursão estoura antes).`,correct:!0,feedback:`Isso. Cada grupo de m iguais custa m(m − 1)/2 comparações; com ~20 000 respostas por nota, dá 5 × 2 × 10⁸ = 10⁹. A recursão chegaria a ~20 000 níveis, muito acima do limite de 1 000 do Python.`},{text:`Fica mais rápido do que com valores distintos, porque só há 5 valores para comparar.`,feedback:`Essa intuição vale para a partição em três vias, que tira os iguais da recursão. A de Lomuto não separa os iguais ao pivô: eles continuam no trecho e são particionados de novo, um a um.`},{text:`Θ(n), porque com 5 valores distintos bastam 5 partições.`,feedback:`Com a partição em três vias, poucas rodadas bastariam (custo esperado O(n log k)). Com Lomuto, cada partição fixa só **um** elemento, o pivô; os outros iguais a ele continuam no trecho.`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e4-qs-desafio`,kind:`code`,lang:`python`,prompt:"Implemente o quicksort com **partição em três vias** (a bandeira holandesa de Dijkstra), no lugar, em duas funções:\n\n- `particiona3(xs, lo, hi)`: sorteia um pivô p entre xs[lo..hi] e reorganiza **só esse trecho** em três faixas. Devolve `(lt, gt)` tal que `xs[lo:lt]` < p, `xs[lt:gt + 1]` == p e `xs[gt + 1:hi + 1]` > p. Faça isso trocando elementos dentro de xs, sem criar listas novas.\n- `quicksort3(xs)`: ordena xs no lugar usando `particiona3` e devolve xs.\n\nNão use `sorted` nem `.sort`. Os testes contam comparações em duas entradas que derrubam o quicksort comum: 10 000 valores que só podem ser 0, 1 ou 2, e uma lista já ordenada de 5 000 elementos.",difficulty:`desafio`,skills:[`alg-ordenacao`,`alg-recursao`],hints:[`Durante a partição, quantas regiões o trecho tem? Além das três faixas do resultado, existe a dos elementos ainda não vistos. Onde cada uma começa e termina?`,`Com três índices, lt, i e gt, o que deveria valer para xs[lo:lt], xs[lt:i] e xs[gt + 1:hi + 1] a cada passo?`,`Quando xs[i] é maior que p e você o troca com um elemento do fim, o que você sabe sobre o elemento que acabou de chegar à posição i?`,`Quando o laço termina? Ainda sobra algum elemento não visto quando i passa de gt?`,`No quicksort3, em quais das três faixas ainda vale a pena fazer recursão?`],explanation:`A invariante tem quatro regiões: xs[lo:lt] < p, xs[lt:i] == p, xs[i:gt + 1] ainda não vistos e xs[gt + 1:hi + 1] > p. Se xs[i] < p, ele troca com xs[lt] (que é igual a p, ou é o próprio xs[i]) e lt e i avançam. Se xs[i] > p, ele troca com xs[gt] e só gt recua, porque o elemento que veio do fim ainda não foi examinado. Se é igual, só i avança. Os iguais ao pivô ficam no meio e saem da recursão: um trecho todo igual custa uma passada, e com k valores distintos o custo esperado é O(n log k). O pivô sorteado protege da lista ordenada; recursão no lado menor e laço no maior deixam a pilha em O(log n).`,starter:`import random

def particiona3(xs, lo, hi):
    # sorteie p em xs[lo..hi] e separe o trecho em < p, == p e > p;
    # devolva (lt, gt) com xs[lt:gt + 1] == p
    pass

def quicksort3(xs):
    # ordene xs no lugar usando particiona3 e devolva xs
    return xs`,solution:`import random

def particiona3(xs, lo, hi):
    p = xs[random.randint(lo, hi)]
    lt, i, gt = lo, lo, hi
    while i <= gt:
        if xs[i] < p:
            xs[lt], xs[i] = xs[i], xs[lt]
            lt += 1
            i += 1
        elif xs[i] > p:
            xs[i], xs[gt] = xs[gt], xs[i]
            gt -= 1
        else:
            i += 1
    return lt, gt

def quicksort3(xs, lo=0, hi=None):
    if hi is None:
        hi = len(xs) - 1
    while lo < hi:
        lt, gt = particiona3(xs, lo, hi)
        # recursão no lado menor, laço no maior: pilha O(log n)
        if lt - lo < hi - gt:
            quicksort3(xs, lo, lt - 1)
            lo = gt + 1
        else:
            quicksort3(xs, gt + 1, hi)
            hi = lt - 1
    return xs`,tests:[{name:`particiona3 separa <, = e >`,code:`import random
for _ in range(300):
    n = random.randint(1, 25)
    xs = [random.randint(0, 6) for _ in range(n)]
    lo = random.randint(0, n - 1)
    hi = random.randint(lo, n - 1)
    antes = xs[:]
    r = particiona3(xs, lo, hi)
    assert isinstance(r, tuple) and len(r) == 2, f"particiona3 deve devolver uma tupla (lt, gt); veio {r!r}"
    lt, gt = r
    assert lo <= lt <= gt <= hi, f"em {antes} com lo={lo}, hi={hi}: esperava lo <= lt <= gt <= hi; veio lt={lt}, gt={gt}"
    assert xs[:lo] == antes[:lo] and xs[hi + 1:] == antes[hi + 1:], f"particiona3 mexeu fora de [lo, hi]: {antes} virou {xs} (lo={lo}, hi={hi})"
    trecho_antes = antes[lo:hi + 1]
    trecho_antes.sort()
    trecho = xs[lo:hi + 1]
    trecho.sort()
    assert trecho == trecho_antes, f"o trecho perdeu ou ganhou elementos: {antes[lo:hi + 1]} virou {xs[lo:hi + 1]}"
    p = xs[lt]
    assert all(x == p for x in xs[lt:gt + 1]), f"xs[lt:gt + 1] deveria ter só valores iguais ao pivô: {xs[lt:gt + 1]}"
    assert all(x < p for x in xs[lo:lt]), f"xs[lo:lt] deveria ter só menores que {p}: {xs[lo:lt]}"
    assert all(x > p for x in xs[gt + 1:hi + 1]), f"xs[gt + 1:hi + 1] deveria ter só maiores que {p}: {xs[gt + 1:hi + 1]}"`},{name:`ordena no lugar (inclusive bordas)`,code:`import random
casos = [[], [1], [2, 1], [3, 3, 3], [5, -2, 9, -2, 0, 7, 5], list(range(10, 0, -1))]
casos += [[random.randint(-50, 50) for _ in range(random.randint(0, 80))] for _ in range(100)]
for xs in casos:
    esperado = sorted(xs)
    copia = xs[:]
    r = quicksort3(copia)
    assert copia == esperado, f"quicksort3 deveria ordenar a própria lista: {xs} ficou {copia}"
    assert r is copia, "quicksort3 deve devolver a mesma lista que recebeu (ordenada no lugar)"`},{name:`sem sorted() nem .sort()`,code:`import ast
_achou = set()
for _no in ast.walk(ast.parse(_source)):
    if isinstance(_no, ast.Call):
        if isinstance(_no.func, ast.Name) and _no.func.id == "sorted":
            _achou.add("sorted()")
        if isinstance(_no.func, ast.Attribute) and _no.func.attr == "sort":
            _achou.add(".sort()")
assert not _achou, "implemente o algoritmo à mão, sem " + " nem ".join(sorted(_achou))`},{name:`particiona3 troca no lugar, sem listas auxiliares`,code:`import ast
_defs = [no for no in ast.walk(ast.parse(_source)) if isinstance(no, ast.FunctionDef) and no.name == "particiona3"]
assert _defs, "defina a função particiona3(xs, lo, hi)"
_ruins = set()
for _no in ast.walk(_defs[0]):
    if isinstance(_no, (ast.List, ast.ListComp)):
        _ruins.add("listas novas")
    elif isinstance(_no, ast.Slice):
        _ruins.add("fatias como xs[a:b]")
    elif isinstance(_no, ast.Call) and isinstance(_no.func, ast.Attribute) and _no.func.attr in ("append", "extend", "insert", "copy"):
        _ruins.add("." + _no.func.attr + "()")
    elif isinstance(_no, ast.Call) and isinstance(_no.func, ast.Name) and _no.func.id in ("list", "sorted"):
        _ruins.add(_no.func.id + "()")
assert not _ruins, "particiona3 deve reorganizar o trecho trocando elementos dentro de xs, sem " + ", ".join(sorted(_ruins))`},{name:`particiona3 sorteia o pivô`,code:`import random
base = random.sample(range(1000), 40)
saidas = set()
for _ in range(10):
    xs = base[:]
    saidas.add(tuple(particiona3(xs, 0, len(xs) - 1)))
assert len(saidas) > 1, f"em 10 chamadas com a mesma lista, particiona3 devolveu sempre {saidas.pop()}: o pivô não está sendo sorteado. Um pivô fixo (o primeiro, o do meio, a mediana de três) tem entradas que o levam a Θ(n²); sorteie uma posição entre lo e hi."`},{name:`muitos repetidos: só 0, 1 e 2`,code:`class Contado(int):
    usadas = 0
    limite = None
    msg = ""

    @classmethod
    def prepara(cls, limite, msg):
        cls.usadas, cls.limite, cls.msg = 0, limite, msg

    def _conta(self):
        Contado.usadas += 1
        if Contado.limite is not None and Contado.usadas > Contado.limite:
            Contado.limite = None
            raise AssertionError(Contado.msg)

    def __lt__(self, o):
        self._conta()
        return int.__lt__(self, o)

    def __le__(self, o):
        self._conta()
        return int.__le__(self, o)

    def __gt__(self, o):
        self._conta()
        return int.__gt__(self, o)

    def __ge__(self, o):
        self._conta()
        return int.__ge__(self, o)
import random
n = 10000
valores = [random.randint(0, 2) for _ in range(n)]
Contado.prepara(10 * n, "com 10 000 valores entre 0 e 2, a sua versão passou de 100 000 comparações: os iguais ao pivô ainda estão entrando na recursão?")
xs = [Contado(v) for v in valores]
quicksort3(xs)
Contado.limite = None
assert [int(v) for v in xs] == sorted(valores), "a lista com muitos repetidos não ficou ordenada"`},{name:`lista já ordenada`,code:`class Contado(int):
    usadas = 0
    limite = None
    msg = ""

    @classmethod
    def prepara(cls, limite, msg):
        cls.usadas, cls.limite, cls.msg = 0, limite, msg

    def _conta(self):
        Contado.usadas += 1
        if Contado.limite is not None and Contado.usadas > Contado.limite:
            Contado.limite = None
            raise AssertionError(Contado.msg)

    def __lt__(self, o):
        self._conta()
        return int.__lt__(self, o)

    def __le__(self, o):
        self._conta()
        return int.__le__(self, o)

    def __gt__(self, o):
        self._conta()
        return int.__gt__(self, o)

    def __ge__(self, o):
        self._conta()
        return int.__ge__(self, o)
n = 5000
Contado.prepara(250000, "numa lista já ordenada de 5 000 elementos, a sua versão passou de 250 000 comparações (o esperado é perto de 110 000). Como o pivô está sendo escolhido?")
xs = [Contado(v) for v in range(n)]
quicksort3(xs)
Contado.limite = None
assert [int(v) for v in xs] == list(range(n)), "a lista já ordenada saiu fora de ordem"`}]}}]},{stage:`revisao`,blocks:[{type:`md`,text:`- A partição de Lomuto põe o pivô na posição definitiva, com menores à esquerda e maiores ou iguais à direita, em m − 1 comparações e memória O(1).
- O custo depende só de onde o pivô cai: dividir em qualquer proporção fixa dá Θ(n log n); cair sempre na ponta dá Θ(n²).
- Pivô fixo + lista ordenada (ou invertida) = pior caso. Pivô aleatório dá tempo **esperado** O(n log n) para qualquer entrada; o pior caso continua existindo, mas depende de azar.
- Muitos repetidos derrubam Lomuto mesmo com pivô aleatório; Hoare e a partição em três vias resolvem.
- Quicksort não é estável. Recursão no lado menor deixa a pilha em O(log n).
- Seleção rápida (quickselect): particionar e seguir só por um lado acha o k-ésimo menor em tempo esperado O(n), no lugar.`},{type:`callout`,tone:`english`,text:`- **partition / pivot**: partição / pivô
- **in-place**: no lugar, sem memória auxiliar proporcional a n
- **randomized / expected running time**: aleatorizado / tempo esperado
- **worst case / degenerate case**: pior caso / caso degenerado
- **three-way partitioning (Dutch national flag)**: partição em três vias (bandeira holandesa)
- **quickselect**: seleção rápida; **introsort**: o nome não é traduzido

Frase típica de entrevista: *"Quicksort is O(n log n) in expectation with a random pivot, but it degrades to O(n²) when the pivot is always the smallest or largest element, for example on an already sorted array with a fixed last-element pivot."*

Frase típica de documentação: *"This sort is unstable (i.e., it may reorder equal elements) and in-place (i.e., it does not allocate)."*`,title:`English corner`}]}],cards:[{id:`l4-quicksort#1`,front:`O que a partição de Lomuto garante quando termina?`,back:`O pivô está na posição definitiva; à esquerda só há menores, à direita só maiores ou iguais, sem ordem dentro de cada lado.`},{id:`l4-quicksort#2`,front:`Qual recorrência descreve o quicksort quando o pivô cai sempre na ponta, e quanto ela dá?`,back:`T(n) = T(n − 1) + (n − 1), que soma n(n − 1)/2: Θ(n²).`},{id:`l4-quicksort#3`,front:`Se o pivô dividisse sempre em 10% e 90%, o quicksort ficaria quadrático?`,back:`Não: a recursão teria ≈ 6,6 · log₂ n níveis, com no máximo n comparações cada, ainda Θ(n log n).`},{id:`l4-quicksort#4`,front:`Qual a diferença entre o tempo esperado do quicksort aleatorizado e o caso médio do quicksort de pivô fixo?`,back:`O caso médio faz a média sobre entradas supostamente aleatórias; o tempo esperado faz a média sobre os sorteios do algoritmo e vale para qualquer entrada, inclusive ordenada.`},{id:`l4-quicksort#5`,front:`Por que o pivô aleatório não salva a partição de Lomuto numa lista cheia de valores iguais? O que salva?`,back:`Num trecho todo igual, qualquer pivô sorteado é igual aos outros, e Lomuto manda todos para o mesmo lado. Salvam a partição em três vias (<, =, >) e a de Hoare.`},{id:`l4-quicksort#6`,front:`Como garantir pilha O(log n) no quicksort, mesmo no pior caso de tempo?`,back:`Fazer a recursão no lado menor e tratar o lado maior com um laço: cada chamada recursiva recebe no máximo metade do trecho.`},{id:`l4-quicksort#7`,front:`Na seleção rápida no lugar, a partição de xs[lo..hi] deixou o pivô na posição p, e k > p. O que muda para a próxima rodada: k, lo ou hi?`,back:`Só lo, que passa a p + 1. k continua igual, porque é uma posição da lista inteira e o pivô já está na posição definitiva.`}]};export{e as default};
//# sourceMappingURL=l4-quicksort-3W-5ql6x.js.map