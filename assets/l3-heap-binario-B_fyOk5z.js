var e={id:`l3-heap-binario`,moduleId:`m3-4`,title:`Heaps por dentro: a árvore guardada numa lista`,titleEn:`Inside binary heaps: a tree stored in an array`,summary:`Como o heapq funciona: árvore binária completa dentro de uma lista, subir e descer, construir um heap em O(n) e ordenar no lugar com heapsort.`,minutes:45,objectives:[`Navegar numa árvore binária completa guardada em lista com os índices 2i + 1, 2i + 2 e (i − 1) // 2`,`Implementar inserção (subir) e retirada do mínimo (descer) e justificar o custo O(log n)`,`Explicar por que construir um heap de baixo para cima custa O(n), e não O(n log n)`,`Ordenar uma lista no lugar com heapsort e saber quando ele vale a pena`],skills:[`ed-arvores`],terms:[{pt:`heap binário`,en:`binary heap`,def:`Árvore binária completa com a propriedade de heap, guardada numa lista, sem nós nem ponteiros.`,example:`Heaps are binary trees for which every parent node has a value less than or equal to any of its children.`},{pt:`árvore binária completa`,en:`complete binary tree`,def:`Árvore binária com todos os níveis cheios, exceto talvez o último, que é preenchido da esquerda para a direita.`},{pt:`propriedade de heap`,en:`heap property / heap invariant`,def:`Num heap mínimo, todo pai é menor ou igual aos seus filhos; entre irmãos não há regra.`,example:`We refer to this condition as the heap invariant.`},{pt:`subir`,en:`sift up`,def:`Trocar um elemento com o pai enquanto ele for menor que o pai, levando-o em direção à raiz.`},{pt:`descer`,en:`sift down`,def:`Trocar um elemento com o menor dos filhos enquanto ele for maior que algum filho, levando-o em direção às folhas.`},{pt:`construção de baixo para cima`,en:`bottom-up heap construction`,def:`Montar um heap fazendo descer cada pai, do último até a raiz; custa O(n). É o que heapq.heapify faz.`,example:`Transform list x into a heap, in-place, in linear time.`},{pt:`no lugar`,en:`in-place`,def:`Que trabalha dentro da própria lista, com memória extra O(1).`,example:`This method sorts the list in place, using only < comparisons between items.`},{pt:`heapsort`,en:`heapsort`,def:`Ordenação que monta um heap máximo e manda o maior para o fim repetidamente; O(n log n) no pior caso, no lugar, não estável.`}],references:[`clrs`,`sedgewick-algs`,`python-docs`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:'Na lição de filas de prioridade, você usou o `heapq` como caixa-preta: `h[0]` é sempre o menor, `heappush` e `heappop` custam O(log n) e `heapify` custa O(n). Agora vamos abrir a caixa.\n\nUm {{heap binário|binary heap}} é uma árvore, mas com uma regra mais fraca que a da BST e um formato tão regular que dispensa nós e ponteiros: a árvore inteira mora numa `list` comum, e pai e filhos se encontram por contas com os índices. Isso dá ao heap vantagens que uma BST não tem: o mínimo sempre na posição 0, uma altura que **nunca** degenera (sem precisar de rotações) e nenhuma memória gasta com ponteiros.\n\nEntender o heap por dentro explica por que a lista do `heapq` "parece bagunçada", permite operações que o módulo não oferece (como cancelar um item do meio) e traz de brinde um algoritmo de ordenação: o heapsort.'}]},{stage:`explicacao`,blocks:[{type:`md`,text:`### Duas regras
1. **Forma**: o heap é uma {{árvore binária completa|complete binary tree}}: todos os níveis cheios, exceto talvez o último, que é preenchido da esquerda para a direita, sem buracos. Com n nós, a altura é sempre ⌊log₂ n⌋: 1 milhão de elementos cabem em 20 níveis (altura 19), qualquer que seja a ordem de chegada.
2. **Ordem**: a {{propriedade de heap|heap property}}. Num heap mínimo, **todo pai é menor ou igual aos filhos**. Entre irmãos ou primos, nada é exigido.`},{type:`table`,head:[`Aspecto`,`BST`,`Heap mínimo`],rows:[[`Ordem exigida`,`esquerda < nó < direita (ordem "horizontal")`,`pai ≤ filhos (ordem só "vertical")`],[`Onde está o menor`,`no nó mais à esquerda: O(h)`,`na raiz: O(1)`],[`Buscar um valor qualquer`,`O(h): desce por um caminho só`,`O(n): ele pode estar em qualquer ramo`],[`Percurso em ordem sai ordenado?`,`sim`,`não`],[`Altura`,`BST comum: depende da ordem de chegada (pode ser n − 1); AVL ou rubro-negra: O(log n), à custa de rotações`,`sempre ⌊log₂ n⌋, sem rotações`]],caption:`O heap abre mão da busca rápida por qualquer valor em troca de achar o mínimo em O(1) e nunca degenerar.`},{type:`md`,text:`### A árvore dentro da lista
Numere os nós nível por nível, da esquerda para a direita, começando do 0. Como a forma não tem buracos, a numeração vira índice de lista, e as relações viram contas:
- filhos do índice i: **2i + 1** e **2i + 2**;
- pai do índice i: **(i − 1) // 2**;
- as folhas são os índices de n // 2 até n − 1 (metade da lista!), e o último pai é o índice n // 2 − 1.

\`\`\`text
índice:   0   1   2   3   4   5   6   7
lista:  [ 1,  3,  2,  7,  4,  5,  9,  8 ]

               1                 nível 0: índice 0
            /     \\
           3       2             nível 1: índices 1 e 2
          / \\     / \\
         7   4   5   9           nível 2: índices 3 a 6
        /
       8                         nível 3: índice 7
\`\`\`

Confira: os filhos do índice 1 (valor 3) estão nos índices 3 e 4 (valores 7 e 4); o pai do índice 7 (valor 8) está em (7 − 1) // 2 = 3 (valor 7). É a mesma ideia do acesso por índice em arrays: a posição é calculada, não procurada.

### Inserir: entra no fim e sobe
1. Coloque o novo elemento no fim da lista (\`append\`). A forma continua completa.
2. {{Subir|sift up}}: enquanto ele for menor que o pai, troque os dois.

Cada troca sobe um nível: no máximo ⌊log₂ n⌋ trocas, **O(log n)**.

### Retirar o mínimo: o último vai para a raiz e desce
1. Guarde \`h[0]\`: é a resposta.
2. Tire o **último** elemento da lista e coloque-o na posição 0. A forma continua completa.
3. {{Descer|sift down}}: enquanto ele for maior que algum filho, troque-o com o **menor** dos filhos.

Duas comparações e no máximo uma troca por nível: **O(log n)**.`},{type:`callout`,tone:`warn`,text:`Trocar com o filho **maior** quebraria o heap: ele subiria e viraria pai do filho menor. Trocando com o menor dos dois, o novo pai é menor ou igual ao irmão que ficou embaixo.`,title:`Por que o menor dos filhos?`},{type:`md`,text:`### Construir um heap: O(n), não O(n log n)
Há duas formas de transformar n valores num heap:
- **n inserções**: cada uma pode subir até a raiz. No pior caso (num heap mínimo, valores chegando em ordem decrescente), o total cresce como n log n.
- **{{De baixo para cima|bottom-up heap construction}}**: as folhas, metade da lista, já são heaps de um elemento. Faça descer cada pai, do último (n // 2 − 1) até a raiz. Quando chega a vez do índice i, as duas subárvores dele já são heaps, então descer i conserta a subárvore inteira. É o que \`heapq.heapify\` faz (o método é de Robert Floyd, 1964).

Por que de baixo para cima é O(n)? Um nó só desce até as folhas, ou seja, no máximo a **altura dele**. E quase todos os nós estão perto do fundo: cerca de n/2 são folhas (descem 0 níveis), n/4 descem no máximo 1, n/8 no máximo 2, e assim por diante. A soma n/4 · 1 + n/8 · 2 + n/16 · 3 + ... nunca passa de n. Com inserções acontece o contrário: um nó **sobe** no máximo a sua **profundidade**, e quase todos os nós estão lá embaixo, longe da raiz.`},{type:`table`,head:[`Operação`,`Custo`,`Por quê`],rows:[["Espiar o mínimo (`h[0]`)",`O(1)`,`está sempre na raiz`],[`Inserir (subir)`,`O(log n)`,`no máximo uma troca por nível`],[`Retirar o mínimo (descer)`,`O(log n)`,`duas comparações e uma troca por nível`],[`Construir com n inserções`,`O(n log n) no pior caso`,`cada nó pode subir da sua profundidade até a raiz`],["Construir de baixo para cima (`heapify`)",`O(n)`,`cada nó desce no máximo a sua altura, e a maioria tem altura pequena`],[`Achar um valor qualquer`,`O(n)`,`a ordem é só vertical; com o índice em mãos, remover custa O(log n)`]]},{type:`md`,text:"### Heapsort\nUm heap também ordena uma lista **{{no lugar|in-place}}**, com memória extra O(1):\n1. Transforme a lista num heap **máximo** (pai ≥ filhos), de baixo para cima: O(n).\n2. O maior está em `xs[0]`. Troque-o com o último elemento da parte que ainda é heap: ele acaba de chegar à posição definitiva. A parte que é heap encolhe uma posição; faça o novo `xs[0]` descer dentro dela. Repita até sobrar um elemento.\n\nO {{heapsort|heapsort}} custa **O(n log n) no pior caso**, com qualquer entrada, sem memória extra. Mas não é estável (iguais podem trocar de ordem entre si) e, na prática, costuma ser mais lento que um merge sort ou um quick sort bem implementados (o `sorted` do Python usa o Timsort, derivado do merge sort), porque salta de i para 2i + 1 na memória e aproveita mal o cache. Ele brilha como rede de segurança: o `std::sort` do C++, nas implementações comuns (o *introsort*), começa com quick sort e passa para heapsort se a recursão ficar funda demais, garantindo O(n log n)."},{type:`callout`,tone:`deep`,text:'Vale ler o arquivo `heapq.py`: o Python usa uma versão em C, mais rápida, mas a versão em Python continua no arquivo, com comentários longos que explicam cada escolha. Duas surpresas:\n- Os nomes estão ao contrário do que a maioria dos livros usa: `_siftdown` é a função que faz o item **subir** (ela "desce os pais" para abrir espaço) e `_siftup` é a que faz **descer**.\n- O `heappop` usa um truque: em vez de comparar o elemento que veio do fim com os filhos a cada nível, ele sobe o menor filho até abrir um buraco numa folha e só então faz o elemento subir o pouco que precisar. Como quem vem do fim quase sempre pertence ao fundo, isso economiza comparações em média.',title:`Lendo o código-fonte do heapq`}]},{stage:`exemplo`,blocks:[{type:`md`,text:"Partimos do heap `[2, 5, 3, 9, 6, 4]`, inserimos 1 e depois retiramos o mínimo. Em cada passo, as contas de índice dizem exatamente quem comparar: só um caminho da raiz até uma folha é visitado."},{type:`table`,head:[`Passo`,`Lista`,`O que aconteceu`],rows:[[`início`,"`[2, 5, 3, 9, 6, 4]`",`heap válido: 2 ≤ 5 e 3; 5 ≤ 9 e 6; 3 ≤ 4`],[`inserir 1: append`,"`[2, 5, 3, 9, 6, 4, 1]`",`o 1 entra no índice 6; o pai é o índice (6 − 1) // 2 = 2 (valor 3)`],[`subir`,"`[2, 5, 1, 9, 6, 4, 3]`",`1 < 3: troca. Agora o 1 está no índice 2, e o pai é o índice 0 (valor 2)`],[`subir`,"`[1, 5, 2, 9, 6, 4, 3]`",`1 < 2: troca. Chegou à raiz: 2 trocas, a altura do heap`],["retirar: guarda `h[0]`","`[1, 5, 2, 9, 6, 4, 3]`",`a resposta é 1`],[`o último vai para a raiz`,"`[3, 5, 2, 9, 6, 4]`",`o 3 sai do índice 6 e ocupa o 0; a lista encolhe`],[`descer`,"`[2, 5, 3, 9, 6, 4]`",`filhos do índice 0: 5 e 2. O menor é 2, e 3 > 2: troca`],[`descer`,"`[2, 5, 3, 9, 6, 4]`",`o 3 está no índice 2; o único filho é o índice 5 (valor 4) e 3 ≤ 4: para`]],caption:`O heapq faz exatamente isso: heappush(h, 1) deixa [1, 5, 2, 9, 6, 4, 3], e o heappop seguinte devolve 1 e deixa [2, 5, 3, 9, 6, 4].`},{type:`md`,text:`\`\`\`text
  depois de inserir 1          depois de retirar o 1

         1                            2
       /   \\                        /   \\
      5     2                      5     3
     / \\   / \\                    / \\   /
    9   6 4   3                  9   6 4
\`\`\``}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`def subir(h, i):
    trocas = 0
    while i > 0:
        pai = (i - 1) // 2
        if h[i] >= h[pai]:                 # já respeita o pai: para
            break
        h[i], h[pai] = h[pai], h[i]
        i, trocas = pai, trocas + 1
    return trocas                          # (só para medirmos o custo)

def descer(h, i):
    n = len(h)
    trocas = 0
    while True:
        menor = i
        for f in (2 * i + 1, 2 * i + 2):   # os dois filhos de i
            if f < n and h[f] < h[menor]:
                menor = f
        if menor == i:                     # não é maior que os filhos: para
            return trocas
        h[i], h[menor] = h[menor], h[i]
        i, trocas = menor, trocas + 1

def inserir(h, x):
    h.append(x)                            # 1. mantém a forma
    subir(h, len(h) - 1)                   # 2. restaura a ordem

def retirar_min(h):
    ultimo = h.pop()                       # lista vazia: IndexError, como no heappop
    if not h:
        return ultimo
    menor, h[0] = h[0], ultimo             # o último vai para a raiz...
    descer(h, 0)                           # ...e desce até o lugar dele
    return menor

h = []
for x in [5, 3, 8, 1, 4]:
    inserir(h, x)
    print(f"inseriu {x}: {h}")
print("retirou", retirar_min(h), "->", h)

# Construir um heap com 4 095 valores em ordem decrescente (o pior caso das inserções)
n = 4095
xs = list(range(n, 0, -1))
um_a_um, trocas_insercoes = [], 0
for x in xs:
    um_a_um.append(x)
    trocas_insercoes += subir(um_a_um, len(um_a_um) - 1)
de_baixo = list(xs)
trocas_baixo = sum(descer(de_baixo, i) for i in range(n // 2 - 1, -1, -1))
print(f"n = {n}: {trocas_insercoes} trocas com n inserções; {trocas_baixo} de baixo para cima")
print("os primeiros a sair:", [retirar_min(de_baixo) for _ in range(5)])`,runnable:!0,caption:`Com n = 4 095, as inserções fazem 40 962 trocas (da ordem de n · log₂ n ≈ 49 000) e a construção de baixo para cima, 4 083 (menos que n).`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e3-heap-1`,kind:`mcq`,prompt:`Num heap guardado em lista (índices a partir de 0), um elemento está no índice 4. Em que índices estão o pai e os filhos dele?`,difficulty:`facil`,skills:[`ed-arvores`,`ed-arrays`],hints:[`Quantos nós cabem em cada nível? Escreva os índices de 0 a 10 nível por nível.`,`No seu desenho, quem está logo acima do 4? E logo abaixo?`],explanation:`Com índices a partir de 0, os filhos de i são 2i + 1 e 2i + 2, e o pai é (i − 1) // 2. Para i = 4: filhos 9 e 10, pai 1. No desenho por níveis (0; 1 2; 3 4 5 6; 7 8 9 10 11 12 13 14), o 4 é o segundo filho do 1; como ele é o segundo nó do seu nível, os filhos dele formam o segundo par do nível de baixo: 9 e 10.`,options:[{text:`Pai no índice 1; filhos nos índices 9 e 10`,correct:!0,feedback:`Isso: (4 − 1) // 2 = 1, 2 · 4 + 1 = 9 e 2 · 4 + 2 = 10.`},{text:`Pai no índice 2; filhos nos índices 8 e 9`,feedback:`Essas são as contas da numeração a partir de 1 (pai i // 2, filhos 2i e 2i + 1). Na lista do Python os índices começam em 0, e as contas viram (i − 1) // 2, 2i + 1 e 2i + 2.`},{text:`Pai no índice 3; filhos nos índices 5 e 6`,feedback:`Vizinhos na lista não são pai e filho: os índices 3, 5 e 6 estão no mesmo nível que o 4. A cada nível abaixo, o índice praticamente dobra.`},{text:`Pai no índice 2; filhos nos índices 10 e 11`,feedback:`Errou por um nos dois: o índice 2 é pai de 5 e 6, não de 4; e os filhos de i começam em 2i + 1, não em 2i + 2.`}]}},{type:`exercise`,exercise:{id:`e3-heap-2`,kind:`mcq`,prompt:"Montar um heap com n `heappush` seguidos custa O(n log n) no pior caso, mas `heapify` (de baixo para cima) custa O(n). De onde vem essa diferença?",difficulty:`avancado`,skills:[`ed-arvores`],hints:[`Num heap com n nós, quantos estão no último nível? E no penúltimo?`,`Quanto um nó pode andar ao descer, se ele está a k níveis das folhas? E ao subir, se está a k níveis da raiz?`],explanation:`O trabalho de cada nó é limitado pela distância que ele pode percorrer. Descendo, é a altura do nó; subindo, é a profundidade. Como metade dos nós são folhas, um quarto está logo acima e assim por diante, a soma das alturas não passa de n, enquanto a soma das profundidades é da ordem de n · log₂ n.`,options:[{text:`No heapify, cada nó desce no máximo a sua altura, e a maioria dos nós está perto das folhas, onde descer é barato`,correct:!0,feedback:`Isso: metade dos nós não desce nada, um quarto desce no máximo 1 nível, um oitavo no máximo 2... a soma fica abaixo de n.`},{text:`O heapify não compara elementos, só os move`,feedback:`Compara sim: descer escolhe o menor dos filhos e compara com ele. A economia está em quantos níveis cada nó percorre.`},{text:`O heapify só processa metade da lista`,feedback:`Ele processa só os pais, mas n/2 pais descendo log n níveis cada ainda dariam O(n log n). O ganho vem de a maioria desses pais estar perto do fundo.`},{text:`heappush é mais lento porque usa append, que é O(n)`,feedback:`append é O(1) amortizado. O custo do heappush está em subir: no pior caso (valores em ordem decrescente num heap mínimo), cada novo elemento sobe até a raiz.`}]}},{type:`exercise`,exercise:{id:`e3-heap-3`,kind:`predict`,lang:`python`,prompt:"O código monta um heap mínimo de baixo para cima e imprime a lista depois de cada `descer`. O que é impresso?",difficulty:`intermediario`,skills:[`ed-arvores`],hints:["Por que o laço começa em `len(h) // 2 - 1`, e não em `len(h) - 1`? Quais índices ele visita?",`Em cada i, compare h[i] com os filhos 2i + 1 e 2i + 2 (se existirem) e troque com o menor deles, se ele for menor que h[i].`,`Quando i = 0, depois da primeira troca o 9 ainda pode estar maior que os novos filhos. Confira.`],explanation:`Os índices 3 a 6 são folhas e já são heaps. i = 2: o 7 troca com o menor filho, o 3. i = 1: o 4 troca com o 1. i = 0: o 9 troca com o 1 e, no índice 1, ainda é maior que o filho 2, então troca de novo. Foram 4 trocas para 7 elementos.`,code:`def descer(h, i):
    n = len(h)
    while True:
        menor = i
        for f in (2 * i + 1, 2 * i + 2):
            if f < n and h[f] < h[menor]:
                menor = f
        if menor == i:
            return
        h[i], h[menor] = h[menor], h[i]
        i = menor

h = [9, 4, 7, 1, 2, 6, 3]
for i in range(len(h) // 2 - 1, -1, -1):
    descer(h, i)
    print(i, h)`,answer:`2 [9, 4, 3, 1, 2, 6, 7]
1 [9, 1, 3, 4, 2, 6, 7]
0 [1, 2, 3, 4, 9, 6, 7]`}},{type:`exercise`,exercise:{id:`e3-heap-4`,kind:`code`,lang:`python`,prompt:"Escreva `eh_heap(h)`, que devolve `True` se a lista `h` respeita a propriedade de heap **mínimo** (todo pai menor ou igual aos filhos) e `False` caso contrário. Lista vazia e lista com um elemento são heaps. Não use `heapq`.",difficulty:`facil`,skills:[`ed-arvores`,`ed-arrays`],hints:[`Cada elemento precisa ser comparado com quem?`,`Você pode percorrer os pais e olhar os filhos, ou percorrer os filhos e olhar o pai de cada um. Qual dos dois dispensa testar se o índice existe?`,`Cuidado com o último pai: ele pode ter só o filho da esquerda.`],explanation:"Basta conferir cada ligação pai → filho uma vez: para i de 1 a n − 1, `h[(i - 1) // 2] <= h[i]`. São n − 1 comparações, O(n). Conferir só se `h[0]` é o mínimo não basta (a regra vale em todos os níveis), e exigir a lista ordenada é forte demais: `[1, 5, 2, 6, 7, 3]` é heap sem estar ordenada.",starter:`def eh_heap(h):
    # devolva True se todo pai for <= aos seus filhos (índices 2i + 1 e 2i + 2)
    pass`,solution:`def eh_heap(h):
    for i in range(1, len(h)):
        if h[(i - 1) // 2] > h[i]:
            return False
    return True`,tests:[{name:`heaps válidos (inclusive não ordenados)`,code:`assert eh_heap([1, 3, 2, 7, 4, 5, 9, 8]) is True, "[1, 3, 2, 7, 4, 5, 9, 8] é um heap mínimo válido"
assert eh_heap([1, 5, 2, 6, 7, 3]) is True, "[1, 5, 2, 6, 7, 3] é heap: um heap não precisa estar ordenado"`},{name:`vazia, um elemento, repetidos e negativos`,code:`assert eh_heap([]) is True, "a lista vazia é um heap"
assert eh_heap([7]) is True, "um elemento sozinho é um heap"
assert eh_heap([2, 2, 2]) is True, "iguais são permitidos: a regra é pai <= filho"
assert eh_heap([-5, -1, -3]) is True, "[-5, -1, -3] é heap: -5 <= -1 e -5 <= -3"`},{name:`violações`,code:`assert eh_heap([3, 1]) is False, "[3, 1]: o pai 3 é maior que o filho 1"
assert eh_heap([1, 2, 0]) is False, "[1, 2, 0]: o filho da DIREITA (índice 2) é menor que o pai"
assert eh_heap([1, 5, 2, 3]) is False, "[1, 5, 2, 3]: o índice 3 é filho do índice 1, e 5 > 3 (não basta o menor estar na raiz)"
assert eh_heap([1, 2, 3, 4, 0]) is False, "[1, 2, 3, 4, 0]: o índice 4 é filho do índice 1, e 2 > 0"`},{name:`400 listas aleatórias`,code:`import heapq, random
rng = random.Random(5)
for _ in range(400):
    xs = [rng.randint(-9, 9) for _ in range(rng.randint(0, 12))]
    esperado = all(xs[(i - 1) // 2] <= xs[i] for i in range(1, len(xs)))
    assert eh_heap(xs) == esperado, f"eh_heap({xs}) devolveu {eh_heap(xs)}; esperado {esperado}"
    heapq.heapify(xs)
    assert eh_heap(xs) is True, f"{xs} saiu de heapify e é heap"`},{name:`sem heapq`,code:`assert "heapq" not in _source, "não use heapq: confira a regra pai <= filho você mesmo"`}]}},{type:`exercise`,exercise:{id:`e3-heap-5`,kind:`fix`,lang:`python`,prompt:"Num app de corridas, um heap guarda os pedidos pelo horário de partida, e o passageiro pode **cancelar** um pedido que está no meio do heap. A função `remover_em(h, i)` deveria remover e devolver `h[i]`, mantendo `h` um heap mínimo em O(log n), mas tem **dois** defeitos: com certos valores de `i` ela quebra com erro, e em outros casos devolve o valor certo mas deixa um heap inválido. Corrija-a (`subir` e `descer` estão corretas).",difficulty:`avancado`,skills:[`ed-arvores`],hints:["Teste de cabeça com `i` igual ao último índice. O que `h.pop()` faz com a posição `i`?","O elemento que veio do fim da lista é sempre maior que os ancestrais da posição `i`? De que parte da árvore ele veio?","Depois de pôr o substituto em `i`, ele pode precisar descer **ou** subir. Há algum problema em tentar os dois?"],explanation:"O último elemento vem de outro ramo da árvore: pode ser maior que os filhos de i (precisa descer) ou menor que o pai de i (precisa subir). Em `[1, 10, 2, 11, 12, 3, 4]`, remover o 11 põe o 4 embaixo do 10. Chamar subir e descer é seguro, porque no máximo um dos dois move alguma coisa. E, se i era a última posição, o `pop` já resolve. Custo: O(log n), se você souber o índice; achar o índice de um valor custa O(n), por isso filas de prioridade reais guardam um dict valor → índice ou usam a remoção preguiçosa vista em Filas de prioridade.",starter:`def subir(h, i):
    while i > 0:
        pai = (i - 1) // 2
        if h[i] >= h[pai]:
            break
        h[i], h[pai] = h[pai], h[i]
        i = pai

def descer(h, i):
    n = len(h)
    while True:
        menor = i
        for f in (2 * i + 1, 2 * i + 2):
            if f < n and h[f] < h[menor]:
                menor = f
        if menor == i:
            return
        h[i], h[menor] = h[menor], h[i]
        i = menor

def remover_em(h, i):
    """Remove e devolve h[i], mantendo h um heap mínimo."""
    removido = h[i]
    h[i] = h.pop()
    descer(h, i)
    return removido`,solution:`def subir(h, i):
    while i > 0:
        pai = (i - 1) // 2
        if h[i] >= h[pai]:
            break
        h[i], h[pai] = h[pai], h[i]
        i = pai

def descer(h, i):
    n = len(h)
    while True:
        menor = i
        for f in (2 * i + 1, 2 * i + 2):
            if f < n and h[f] < h[menor]:
                menor = f
        if menor == i:
            return
        h[i], h[menor] = h[menor], h[i]
        i = menor

def remover_em(h, i):
    """Remove e devolve h[i], mantendo h um heap mínimo."""
    removido = h[i]
    ultimo = h.pop()
    if i < len(h):
        h[i] = ultimo
        subir(h, i)
        descer(h, i)
    return removido`,tests:[{name:`remover a raiz`,code:`def _heap_ok(h):
    return all(h[(i - 1) // 2] <= h[i] for i in range(1, len(h)))
h = [1, 3, 2, 7, 4, 5, 9, 8]
r = remover_em(h, 0)
assert r == 1, f"deveria devolver 1; devolveu {r}"
assert _heap_ok(h) and sorted(h) == [2, 3, 4, 5, 7, 8, 9], f"depois de remover a raiz, a lista ficou {h}"`},{name:`remover o último índice e o único elemento`,code:`h = [1, 3, 2]
r = remover_em(h, 2)
assert r == 2 and h == [1, 3], f"remover o último índice de [1, 3, 2] deveria devolver 2 e deixar [1, 3]; devolveu {r} e deixou {h}"
h = [5]
r = remover_em(h, 0)
assert r == 5 and h == [], f"remover o único elemento deveria devolver 5 e deixar []; deixou {h}"`},{name:`o substituto às vezes precisa subir`,code:`def _heap_ok(h):
    return all(h[(i - 1) // 2] <= h[i] for i in range(1, len(h)))
h = [1, 10, 2, 11, 12, 3, 4]
r = remover_em(h, 3)
assert r == 11, f"deveria devolver 11; devolveu {r}"
assert _heap_ok(h), f"o heap ficou inválido: {h}. O 4 veio do fim e foi parar embaixo do 10"
assert sorted(h) == [1, 2, 3, 4, 10, 12], f"os elementos que sobraram estão errados: {h}"`},{name:`300 remoções aleatórias`,code:`def _heap_ok(h):
    return all(h[(i - 1) // 2] <= h[i] for i in range(1, len(h)))
import heapq, random
rng = random.Random(11)
for _ in range(300):
    h = [rng.randint(0, 50) for _ in range(rng.randint(1, 25))]
    heapq.heapify(h)
    antes = list(h)
    i = rng.randrange(len(h))
    r = remover_em(h, i)
    assert r == antes[i], f"remover_em({antes}, {i}) devolveu {r}; esperado {antes[i]}"
    esperado = sorted(antes[:i] + antes[i + 1:])
    assert sorted(h) == esperado, f"remover_em({antes}, {i}) deixou elementos errados: {h}"
    assert _heap_ok(h), f"remover_em({antes}, {i}) deixou um heap inválido: {h}"`},{name:`O(log n) comparações`,code:`class _Contado:
    comparacoes = 0
    def __init__(self, v):
        self.v = v
    def __lt__(self, o):
        _Contado.comparacoes += 1
        return self.v < o.v
    def __le__(self, o):
        _Contado.comparacoes += 1
        return self.v <= o.v
    def __gt__(self, o):
        _Contado.comparacoes += 1
        return self.v > o.v
    def __ge__(self, o):
        _Contado.comparacoes += 1
        return self.v >= o.v
    def __eq__(self, o):
        _Contado.comparacoes += 1
        return self.v == o.v

n = 1023
for i in (0, 1, 300, 600, n - 2):
    h = [_Contado(v) for v in range(n)]    # uma lista crescente já é um heap mínimo
    _Contado.comparacoes = 0
    r = remover_em(h, i)
    assert r.v == i, f"remover_em no índice {i} devolveu o valor {r.v}; esperado {i}"
    assert _Contado.comparacoes <= 40, f"{_Contado.comparacoes} comparações para remover o índice {i} de um heap com {n} itens: isso é O(n), não O(log n). Mexa só no caminho do substituto (subir ou descer), sem reorganizar o heap inteiro"`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e3-heap-desafio`,kind:`code`,lang:`python`,prompt:"Escreva `heapsort(xs)`, que ordena a lista **no lugar**, em ordem crescente, em O(n log n) no pior caso e com memória extra O(1): sem criar outra lista e sem usar `heapq`, `sorted` ou `.sort`. Plano: transforme a própria lista num heap **máximo** e, repetidamente, mande o maior para o fim da parte que ainda não está ordenada.",difficulty:`desafio`,skills:[`ed-arvores`,`ed-arrays`],hints:[`Num heap máximo, onde está o maior elemento? E em que posição ele deveria ficar na lista ordenada?`,`Depois de mandar o maior para o fim, a parte final da lista já está pronta e não pode mais ser mexida. Que informação a sua função de descer precisa receber para não invadir essa parte?`,`Primeiro construa o heap máximo (de baixo para cima). Depois, quantas vezes você precisa repetir "trocar o topo com o fim da parte heap e descer o novo topo"?`],explanation:`Construir o heap máximo custa O(n); cada uma das n − 1 retiradas custa O(log n): O(n log n) no pior caso, com qualquer entrada, inclusive já ordenada ou invertida. Um dos testes usa um adversário (McIlroy, 1999) que decide os valores durante a execução para forçar o pior caso: os quick sorts comuns, mesmo com pivô aleatório ou mediana de três, caem para O(n²), mas o heapsort não se abala. A memória extra é O(1) porque a parte ordenada cresce no fim da própria lista enquanto o heap encolhe no começo. O preço: não é estável e aproveita mal o cache (salta de i para 2i + 1), por isso as bibliotecas costumam preferir variantes de merge sort e quick sort e guardam o heapsort como rede de segurança.`,starter:`def heapsort(xs):
    # 1. transforme xs num heap MÁXIMO (de baixo para cima)
    # 2. repita: troque xs[0] com o último da parte que ainda é heap,
    #    encolha essa parte e faça o novo xs[0] descer dentro dela
    pass`,solution:`def descer_max(xs, i, n):
    # desce xs[i] considerando só as posições 0..n-1
    while True:
        maior = i
        for f in (2 * i + 1, 2 * i + 2):
            if f < n and xs[f] > xs[maior]:
                maior = f
        if maior == i:
            return
        xs[i], xs[maior] = xs[maior], xs[i]
        i = maior

def heapsort(xs):
    n = len(xs)
    for i in range(n // 2 - 1, -1, -1):
        descer_max(xs, i, n)
    for fim in range(n - 1, 0, -1):
        xs[0], xs[fim] = xs[fim], xs[0]
        descer_max(xs, 0, fim)`,tests:[{name:`exemplo`,code:`xs = [5, 2, 9, 1, 5, 6]
heapsort(xs)
assert xs == [1, 2, 5, 5, 6, 9], f"esperado [1, 2, 5, 5, 6, 9]; a lista ficou {xs}"`},{name:`casos de borda`,code:`for entrada in [[], [7], [2, 1], [1, 2], [3, 3, 3], [0, -4, 8, -4, -1]]:
    xs = list(entrada)
    heapsort(xs)
    assert xs == sorted(entrada), f"heapsort({entrada}) deixou {xs}"`},{name:`já ordenada e invertida`,code:`xs = list(range(60))
heapsort(xs)
assert xs == list(range(60)), "uma lista já ordenada deve continuar ordenada"
xs = list(range(60, 0, -1))
heapsort(xs)
assert xs == list(range(1, 61)), f"a lista invertida não ficou ordenada: {xs[:10]}..."`},{name:`ordena no lugar`,code:`xs = [3, 1, 2]
devolvido = heapsort(xs)
assert not (devolvido == [1, 2, 3] and xs != [1, 2, 3]), "você devolveu uma lista ordenada nova, mas a lista recebida ficou como estava: ordene no lugar, trocando os elementos dentro dela"
assert xs == [1, 2, 3], f"heapsort([3, 1, 2]) deixou {xs}"`},{name:`200 listas aleatórias`,code:`import random
rng = random.Random(9)
for _ in range(200):
    entrada = [rng.randint(-30, 30) for _ in range(rng.randint(0, 40))]
    xs = list(entrada)
    heapsort(xs)
    assert xs == sorted(entrada), f"heapsort({entrada}) deixou {xs}"`},{name:`sem atalhos`,code:`for proibido in ["sorted(", ".sort(", "heapq"]:
    assert proibido not in _source, f"não use {proibido.strip('(.')}: o objetivo é implementar o heapsort"`},{name:`O(n log n) comparações`,code:`import random, math

class _Contado:
    comparacoes = 0
    def __init__(self, v):
        self.v = v
    def __lt__(self, o):
        _Contado.comparacoes += 1
        return self.v < o.v
    def __le__(self, o):
        _Contado.comparacoes += 1
        return self.v <= o.v
    def __gt__(self, o):
        _Contado.comparacoes += 1
        return self.v > o.v
    def __ge__(self, o):
        _Contado.comparacoes += 1
        return self.v >= o.v
    def __eq__(self, o):
        _Contado.comparacoes += 1
        return self.v == o.v

n = 1024
limite = int(4 * n * math.log2(n))
aleatoria = list(range(n))
random.Random(3).shuffle(aleatoria)
entradas = {
    "aleatória": aleatoria,
    "já ordenada": list(range(n)),
    "invertida": list(range(n - 1, -1, -1)),
    "com todos iguais": [7] * n,
}
for nome, vals in entradas.items():
    xs = [_Contado(v) for v in vals]
    _Contado.comparacoes = 0
    heapsort(xs)
    assert [x.v for x in xs] == sorted(vals), f"a lista {nome} de 1 024 elementos não ficou ordenada"
    assert _Contado.comparacoes <= limite, f"{_Contado.comparacoes} comparações para a lista {nome} de n = {n} (limite {limite}): isso cresce como n², não como n log n. O heapsort garante O(n log n) com qualquer entrada"`},{name:`pior caso escolhido por um adversário`,code:`import math

class _Adversario:
    # Os valores só são decididos durante a ordenação, sempre do jeito que mais
    # atrapalha (M. D. McIlroy, "A Killer Adversary for Quicksort", 1999).
    GAS = 10 ** 9
    solidos = 0
    candidato = None
    comparacoes = 0
    limite = 0
    def __init__(self):
        self.v = _Adversario.GAS
    def _cmp(self, o):
        A = _Adversario
        A.comparacoes += 1
        assert A.comparacoes <= A.limite, f"mais de {A.limite} comparações para ordenar {n} itens cujos valores um adversário escolheu durante a execução: o seu algoritmo tem pior caso O(n²) (um quick sort, talvez?). O heapsort garante O(n log n) com qualquer entrada"
        if self.v == A.GAS and o.v == A.GAS:
            alvo = self if self is A.candidato else o
            alvo.v = A.solidos
            A.solidos += 1
        if self.v == A.GAS:
            A.candidato = self
        elif o.v == A.GAS:
            A.candidato = o
        return self.v - o.v
    def __lt__(self, o):
        return self._cmp(o) < 0
    def __le__(self, o):
        return self._cmp(o) <= 0
    def __gt__(self, o):
        return self._cmp(o) > 0
    def __ge__(self, o):
        return self._cmp(o) >= 0
    def __eq__(self, o):
        return self._cmp(o) == 0

n = 1024
_Adversario.limite = int(4 * n * math.log2(n))
xs = [_Adversario() for _ in range(n)]
heapsort(xs)
vs = [x.v for x in xs]
assert all(vs[i] <= vs[i + 1] for i in range(n - 1)), "com os valores escolhidos pelo adversário, a lista não ficou ordenada"`},{name:`memória extra O(1)`,code:`xs = [(i * 7919) % 1009 for i in range(1000)]
try:
    import tracemalloc
    tracemalloc.start()
    medir = True
except Exception:
    medir = False
heapsort(xs)
if medir:
    _, pico = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    assert pico < 4000, f"pico de {pico} bytes de memória extra: parece que outra lista foi criada; troque os elementos dentro da própria lista"
assert xs == sorted((i * 7919) % 1009 for i in range(1000)), "a lista não ficou ordenada"`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:"**Mini-projeto: mediana do tempo de espera no ponto de ônibus.** Os tempos de espera chegam um a um, e o painel precisa mostrar a **mediana** a cada novo valor. Manter os tempos numa lista ordenada custaria O(n) por chegada, porque inserir no meio desloca os elementos. Use dois heaps: um heap máximo (com o sinal trocado, no `heapq`) com a metade menor dos tempos e um heap mínimo com a metade maior, mantendo os tamanhos com diferença de no máximo 1. A mediana está no topo de um deles (ou é a média dos dois topos). Cada chegada custa O(log n) e a mediana sai em O(1). Teste contra `statistics.median` em listas aleatórias."},{type:`md`,text:`Mais adiante, no planejador de rotas, o heap é o motor do algoritmo de Dijkstra: a fila de prioridade decide qual cidade explorar em seguida.`},{type:`project`,projectId:`p6-rotas`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Heap binário: árvore binária completa (forma) + pai ≤ filhos (ordem), guardada numa lista.
- Índices a partir de 0: filhos de i em 2i + 1 e 2i + 2; pai em (i − 1) // 2; folhas de n // 2 a n − 1.
- Inserir: append e subir, O(log n). Retirar o mínimo: o último vai para a raiz e desce trocando com o **menor** filho, O(log n).
- Construir de baixo para cima (\`heapify\`): O(n), porque cada nó desce no máximo a sua altura e a maioria dos nós tem altura pequena.
- Achar um valor qualquer é O(n): a ordem do heap é só vertical. Ao remover do meio, o substituto pode precisar subir ou descer.
- Heapsort: heap máximo + mandar o maior para o fim; O(n log n) no pior caso, no lugar, não estável.`},{type:`callout`,tone:`english`,text:`**Vocabulary**: *binary heap*, *complete binary tree*, *heap property / heap invariant*, *sift up*, *sift down*, *bottom-up heapify*, *in-place*, *heapsort*.

From the Python docs (module heapq): *"Heaps are binary trees for which every parent node has a value less than or equal to any of its children. We refer to this condition as the heap invariant."* The same page shows the index arithmetic: \`heap[k] <= heap[2*k+1]\` and \`heap[k] <= heap[2*k+2]\`, "counting elements from zero".

Typical interview question: "Why can you build a heap in linear time, while any comparison-based sort needs on the order of n log n comparisons?"`,title:`English corner`}]}],cards:[{id:`l3-heap-binario#1`,front:`Num heap em lista (índices a partir de 0), onde estão os filhos e o pai do índice i?`,back:`Filhos em 2i + 1 e 2i + 2; pai em (i − 1) // 2.`},{id:`l3-heap-binario#2`,front:`Qual a diferença entre a regra da BST e a regra do heap mínimo?`,back:`BST: esquerda < nó < direita (busca qualquer valor em O(h)). Heap: pai ≤ filhos, ordem só vertical (mínimo em O(1), mas buscar um valor qualquer é O(n)).`},{id:`l3-heap-binario#3`,front:`Como funciona a inserção num heap, e quanto custa?`,back:`Coloca no fim da lista e sobe trocando com o pai enquanto for menor que ele: O(log n).`},{id:`l3-heap-binario#4`,front:`Ao retirar o mínimo, por que o elemento que desce troca com o MENOR dos filhos?`,back:`Porque quem sobe vira pai do outro filho; só o menor dos dois garante pai ≤ filho.`},{id:`l3-heap-binario#5`,front:`Por que construir um heap de baixo para cima custa O(n)?`,back:`Cada nó desce no máximo a sua altura, e a maioria dos nós está perto das folhas: metade não desce nada, um quarto desce no máximo 1... a soma não passa de n.`},{id:`l3-heap-binario#6`,front:`Por que a altura de um heap nunca degenera, ao contrário da BST?`,back:`Porque a forma é sempre uma árvore binária completa: altura ⌊log₂ n⌋, qualquer que seja a ordem de chegada.`},{id:`l3-heap-binario#7`,front:`Ao remover um elemento do meio do heap, o que pode acontecer com o substituto que veio do fim?`,back:`Ele pode precisar descer (se for maior que um filho) ou subir (se for menor que o novo pai), pois veio de outro ramo.`},{id:`l3-heap-binario#8`,front:`Quais as garantias e os pontos fracos do heapsort?`,back:`O(n log n) no pior caso e memória extra O(1); não é estável e aproveita mal o cache, então costuma perder para merge sort e quick sort bem implementados.`}]};export{e as default};
//# sourceMappingURL=l3-heap-binario-B_fyOk5z.js.map