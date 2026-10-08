var e={id:`l3-union-find`,moduleId:`m3-5`,title:`Union-Find: grupos que se juntam em tempo quase constante`,titleEn:`Union-Find: merging groups in nearly constant time`,summary:`Conjuntos disjuntos com find e union sobre uma lista de pais; união por tamanho, compressão de caminho e o custo O(α(n)); contar grupos e achar a ligação que fecha um ciclo enquanto as arestas chegam uma a uma.`,minutes:45,objectives:[`Reconhecer problemas de conectividade dinâmica, em que as ligações chegam uma a uma e nunca são desfeitas`,`Implementar find e union sobre uma floresta guardada numa lista de pais`,`Explicar por que a união por tamanho limita a altura a log₂ n e o que a compressão de caminho acrescenta`,`Usar Union-Find para contar grupos e para achar a aresta que fecha um ciclo`,`Saber o que o Union-Find não faz: separar grupos, mostrar caminhos e responder alcance em grafos direcionados`],skills:[`ed-grafos`],terms:[{pt:`Union-Find`,en:`union-find / disjoint-set union (DSU)`,def:`Estrutura que mantém grupos sem elementos em comum e oferece duas operações: find (qual é o grupo de x?) e union (junte os grupos de x e y).`,example:`A disjoint-set data structure supports MAKE-SET, UNION and FIND-SET.`},{pt:`conjuntos disjuntos`,en:`disjoint sets`,def:`Coleção de grupos sem elemento em comum: cada elemento pertence a exatamente um grupo.`},{pt:`conectividade dinâmica`,en:`dynamic connectivity`,def:`Responder "x e y estão ligados?" enquanto as ligações do grafo mudam. O Union-Find resolve o caso em que elas só chegam e nunca saem (a conectividade incremental).`},{pt:`representante`,en:`representative`,def:`O elemento que identifica o grupo, a raiz da árvore: dois elementos estão no mesmo grupo se e somente se têm o mesmo representante.`},{pt:`união por tamanho`,en:`union by size`,def:`Ao juntar dois grupos, pendurar a raiz da árvore menor na raiz da maior; garante altura de no máximo log₂ n.`},{pt:`compressão de caminho`,en:`path compression`,def:`Durante o find, fazer cada elemento do caminho apontar direto para a raiz, achatando a árvore para as próximas buscas.`,example:`Path compression makes each node on the find path point directly to the root.`},{pt:`função inversa de Ackermann`,en:`inverse Ackermann function`,def:`Função α(n) que cresce tão devagar que não passa de 4 para nenhum n de uso prático; aparece no custo do Union-Find.`,example:`Union-find runs in O(α(n)) amortized time per operation.`}],references:[`clrs`,`sedgewick-algs`,`stanford-cs161`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Imagine o time antifraude de um banco digital. A cada minuto chega uma evidência de que duas contas têm o mesmo dono: o mesmo celular de cadastro, o mesmo aparelho, o mesmo e-mail. As ligações só se acumulam, nunca são desfeitas, e o sistema pergunta o tempo todo: **estas duas contas estão no mesmo grupo?** Uma chave Pix nova cadastrada numa conta de um grupo suspeito, por exemplo, precisa ser analisada na hora.

Com o que você já sabe, daria para guardar o grafo e rodar uma BFS ou uma DFS a cada pergunta: O(V + E) por consulta. Com milhões de contas e milhares de perguntas por segundo, a conta não fecha. Esse é o problema da {{conectividade dinâmica|dynamic connectivity}}, no caso em que as ligações só chegam, e a ferramenta para ele é o **{{Union-Find|union-find}}** (também chamado de *disjoint-set union*, ou DSU). Ele guarda {{conjuntos disjuntos|disjoint sets}}, grupos sem elemento em comum, e oferece só duas operações: **find** ("qual é o grupo de x?") e **union** ("junte o grupo de x com o de y"). Com dois truques de poucas linhas, cada uma custa, na prática, tempo constante.

É uma estrutura pequena com alcance enorme: é a peça central do algoritmo de Kruskal (árvore geradora mínima, Nível 4) e aparece em segmentação de imagens, em simulações de percolação, na geração de labirintos e em muitos problemas de entrevista.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`### Cada grupo é uma árvore
Numere os elementos de 0 a n − 1 e guarde, para cada um, um **pai** numa lista. Quem é pai de si mesmo é uma **raiz**, e a raiz é o {{representante|representative}} do grupo: dois elementos estão no mesmo grupo se e somente se chegam à mesma raiz.

- **find(x)**: suba de pai em pai até a raiz e devolva-a.
- **union(x, y)**: ache as raízes rx e ry. Se forem iguais, x e y já estavam juntos e não há nada a fazer. Senão, faça uma raiz apontar para a outra: um único ponteiro muda, e a árvore inteira de um grupo passa a pertencer ao outro.
- "x e y estão ligados?" é só \`find(x) == find(y)\`.

\`\`\`text
pai = [0, 0, 1, 3, 3, 4]          (índices 0 a 5)

   0       3          find(2): 2 → 1 → 0, a raiz é 0
   |       |          find(5): 5 → 4 → 3, a raiz é 3
   1       4          2 e 5 estão em grupos diferentes
   |       |
   2       5
\`\`\`

Atenção: essas árvores **não** são o grafo das ligações. Elas só registram quem está no mesmo grupo, e as arestas delas não precisam corresponder a ligações reais. Com a união por tamanho que você vai ver a seguir (e a regra de desempate do código desta lição), as evidências 0–2 e 2–1 deixam o 1 pendurado direto no 0, e não existe evidência 0–1. Por isso o Union-Find não sabe dizer **por qual caminho** dois elementos se ligam.

### O problema: árvores que viram cadeias
Na versão ingênua, \`union\` pendura sempre a raiz do primeiro na raiz do segundo. Faça union(0, 1), union(0, 2), union(0, 3), ...: a cada vez, a raiz do grupo do 0 vai para baixo do elemento novo, e a árvore vira uma fila indiana 0 → 1 → 2 → 3 → ... Depois de n − 1 uniões, find(0) dá n − 1 saltos, e a sequência inteira custou O(n²). É o mesmo pesadelo da BST que degenera em lista.

### Truque 1: união por tamanho
Guarde, em cada raiz, o tamanho do grupo e, ao unir, pendure a raiz da árvore **menor** na raiz da **maior**. Essa é a {{união por tamanho|union by size}}.

Por que isso segura a altura? A profundidade de um elemento só aumenta (em 1) quando a árvore dele é pendurada em outra **pelo menos do mesmo tamanho**. Então, a cada nível que ele desce, o grupo dele no mínimo **dobra**. Um grupo não passa de n elementos; logo, ninguém desce mais que log₂ n vezes, e a altura nunca passa de ⌊log₂ n⌋. Com 1 milhão de elementos, find dá no máximo 19 saltos, qualquer que seja a ordem das uniões.

### Truque 2: compressão de caminho
Na hora do find, você já percorreu o caminho até a raiz. Aproveite: numa segunda passada, faça **cada** elemento desse caminho apontar direto para a raiz. É a {{compressão de caminho|path compression}}. O próximo find de qualquer um deles dá um salto só, e a árvore vai ficando achatada justamente onde as consultas acontecem.

\`\`\`python
def find(x):
    raiz = x
    while pai[raiz] != raiz:      # 1ª passada: sobe até a raiz
        raiz = pai[raiz]
    while x != raiz:              # 2ª passada: todo mundo aponta para a raiz
        proximo = pai[x]
        pai[x] = raiz
        x = proximo
    return raiz
\`\`\`

A versão recursiva (\`pai[x] = find(pai[x])\`) é mais curta, mas, sem a união por tamanho, uma cadeia de 5 000 elementos estouraria o limite de recursão do Python.

### Os dois truques juntos: quase O(1)
Com união por tamanho **e** compressão de caminho, uma sequência de m operações sobre n elementos custa O(m · α(n)), em que α é a {{função inversa de Ackermann|inverse Ackermann function}}. Ela cresce tão devagar que α(n) ≤ 4 para qualquer n que caiba no universo: na prática, cada operação custa tempo constante. Um find isolado ainda pode dar até log₂ n saltos; o que é quase constante é a **média** numa sequência longa, o custo amortizado.`},{type:`table`,head:[`Versão`,`Um find, no pior caso`,`m operações sobre n elementos`],rows:[[`Ingênua`,`O(n)`,`O(m · n)`],[`Só união por tamanho`,`O(log n)`,`O(m log n)`],[`Só compressão de caminho`,`O(n)`,`O(m log n): O(log n) amortizado por operação`],[`União por tamanho + compressão`,`O(log n)`,`O(m · α(n)): na prática, O(m)`]],caption:`Cada truque sozinho já derruba o custo amortizado para O(log n) por operação (só com a compressão, um find isolado ainda pode custar O(n)); juntos, levam esse custo a quase constante.`},{type:`callout`,tone:`deep`,text:`- A estrutura é de Galler e Fischer (1964). O limite O(m · α(n)) foi provado por Robert Tarjan (1975), e Fredman e Saks mostraram em 1989 que esse α(n) não pode ser eliminado: nenhuma estrutura para o problema faz melhor, em custo amortizado.
- A união por *rank* guarda em cada raiz um limite superior para a altura (em vez do tamanho) e pendura a de rank menor na de rank maior. Dá a mesma garantia; a versão por tamanho tem o bônus de deixar o tamanho de cada grupo disponível de graça.
- Variante de uma passada só, a **divisão do caminho pela metade** (*path halving*): \`while pai[x] != x: pai[x] = pai[pai[x]]; x = pai[x]\`. A cada passo, x passa a apontar para o avô e pula direto para ele: um elemento sim, outro não, do caminho ganha um atalho, e o caminho fica com cerca de metade do comprimento (daí o nome). Junto com a união por tamanho, tem a mesma garantia de custo e dispensa a segunda passada.`,title:`Aprofundando`},{type:`md`,text:`### O que o Union-Find não faz
Ele troca informação por velocidade: guarda só a divisão em grupos, não as ligações que a formaram.`},{type:`table`,head:[`Situação`,`BFS / DFS`,`Union-Find`],rows:[[`Grafo fixo, muitas perguntas "x e y estão ligados?"`,`rotule os componentes uma vez, em O(V + E), e responda cada pergunta em O(1)`,`também serve: O((V + E) · α(V)) para montar`],[`Ligações chegando uma a uma, com perguntas entre elas`,`O(V + E) por pergunta, refazendo a busca`,`O(α(n)) amortizado por ligação e por pergunta`],[`Qual é o caminho entre x e y?`,`BFS guardando o pai de cada vértice`,`não responde: as árvores internas não são o grafo`],[`Remover uma ligação`,`refaça a busca`,`não suporta: não existe "desunir"`],[`Alcance em grafo direcionado (A segue B)`,`sim`,`não: "estar no mesmo grupo" precisa ser simétrico e transitivo`]]},{type:`callout`,tone:`tip`,text:`Se as ligações só são removidas (nunca acrescentadas) e a sequência inteira é conhecida de antemão, há um truque clássico: comece pelo grafo que sobra no fim e processe a sequência **de trás para frente**. Lida ao contrário, cada remoção de ligação vira uma união.`},{type:`md`,text:`### Duas receitas que você vai usar muito
- **Contar grupos enquanto as ligações chegam**: comece com n grupos e desconte 1 a cada union que juntar grupos diferentes.
- **Detectar ciclo num grafo não direcionado**: ao inserir a aresta (u, v), se find(u) == find(v), u e v já estavam ligados por outro caminho, e essa aresta fecha um ciclo. É o que o algoritmo de Kruskal faz para montar a árvore geradora mínima (Nível 4): percorre as arestas da mais barata para a mais cara e pula as que fechariam ciclo.`},{type:`callout`,tone:`tip`,text:"Elementos com nome (contas, CPFs, cidades) entram no Union-Find por um dict nome → índice, montado uma vez. Outra saída é guardar `pai` num dict e criar cada elemento na primeira vez em que ele aparece, com `pai.setdefault(x, x)`.",title:`Nomes em vez de números`}]},{stage:`exemplo`,blocks:[{type:`md`,text:`Oito elementos, união por tamanho e compressão de caminho. Regra de desempate (a mesma do código da lição): com tamanhos iguais, a raiz do **segundo** argumento fica embaixo da raiz do primeiro.`},{type:`table`,head:[`Passo`,`Operação`,`pai (índices 0 a 7)`,`O que aconteceu`],rows:[[`0`,`início`,"`[0, 1, 2, 3, 4, 5, 6, 7]`",`oito grupos de um elemento; todos são raízes`],[`1`,`union(0, 1)`,"`[0, 0, 2, 3, 4, 5, 6, 7]`",`tamanhos iguais (1 e 1): a raiz 1 fica embaixo da raiz 0`],[`2`,`union(2, 3)`,"`[0, 0, 2, 2, 4, 5, 6, 7]`",`idem: 3 fica embaixo de 2`],[`3`,`union(1, 3)`,"`[0, 0, 0, 2, 4, 5, 6, 7]`",`as raízes são 0 e 2, ambas com tamanho 2: 2 fica embaixo de 0. Altura 2 (3 → 2 → 0)`],[`4`,`union(4, 5) e union(6, 7)`,"`[0, 0, 0, 2, 4, 4, 6, 6]`",`mais dois pares`],[`5`,`union(5, 7)`,"`[0, 0, 0, 2, 4, 4, 4, 6]`",`raízes 4 e 6, tamanho 2 cada: 6 fica embaixo de 4`],[`6`,`union(7, 3)`,"`[4, 0, 0, 0, 4, 4, 4, 4]`",`find(7) sobe 7 → 6 → 4 e comprime (7 passa a apontar para 4); find(3) sobe 3 → 2 → 0 e comprime (3 aponta para 0). Raízes 4 e 0, tamanho 4 cada: 0 fica embaixo de 4`],[`7`,`find(3)`,"`[4, 0, 0, 4, 4, 4, 4, 4]`",`sobe 3 → 0 → 4 e comprime: 3 passa a apontar direto para 4`]],caption:`No fim, 4 é pai de 0, 3, 5, 6 e 7, e 0 é pai de 1 e 2: um grupo só, com altura 2.`},{type:`md`,text:`Com 8 elementos, a união por tamanho garante altura de no máximo ⌊log₂ 8⌋ = 3; aqui ela nunca passou de 2. Repare também no limite da compressão: depois do passo 7, os elementos 1 e 2 ainda estão a dois saltos da raiz, porque nenhum find passou por eles depois que o 0 foi pendurado no 4. A compressão só achata os caminhos que alguém percorreu.`}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`class UnionFind:
    def __init__(self, n):
        self.pai = list(range(n))          # cada um começa sozinho, como raiz
        self.tamanho = [1] * n             # só vale nas raízes
        self.grupos = n

    def find(self, x):
        raiz = x
        while self.pai[raiz] != raiz:      # 1ª passada: sobe até a raiz
            raiz = self.pai[raiz]
        while x != raiz:                   # 2ª passada: compressão de caminho
            proximo = self.pai[x]
            self.pai[x] = raiz
            x = proximo
        return raiz

    def union(self, x, y):
        rx, ry = self.find(x), self.find(y)
        if rx == ry:
            return False                   # já estavam no mesmo grupo
        if self.tamanho[rx] < self.tamanho[ry]:
            rx, ry = ry, rx                # rx passa a ser a raiz da árvore maior
        self.pai[ry] = rx                  # a menor fica pendurada na maior
        self.tamanho[rx] += self.tamanho[ry]
        self.grupos -= 1
        return True

# Antifraude: evidências de que duas contas têm o mesmo dono
contas = ["ana", "bia", "caio", "davi", "eva", "fabio"]
indice = {nome: i for i, nome in enumerate(contas)}     # nome -> número
uf = UnionFind(len(contas))
evidencias = [("ana", "bia"), ("caio", "davi"), ("bia", "davi"), ("eva", "fabio"), ("ana", "caio")]
for a, b in evidencias:
    if uf.union(indice[a], indice[b]):
        print(f"{a}-{b}: juntou dois grupos; agora são {uf.grupos}")
    else:
        print(f"{a}-{b}: já estavam no mesmo grupo (evidência redundante)")

def mesmo_dono(a, b):
    return uf.find(indice[a]) == uf.find(indice[b])

print("ana e davi?", mesmo_dono("ana", "davi"), "| ana e eva?", mesmo_dono("ana", "eva"))
print("tamanho do grupo da ana:", uf.tamanho[uf.find(indice["ana"])])

# Por que os truques importam: union(0, i) para i = 1, ..., 999
def altura(pai):
    maior = 0
    for x in range(len(pai)):
        d = 0
        while pai[x] != x:
            x, d = pai[x], d + 1
        maior = max(maior, d)
    return maior

n = 1000
ingenuo = list(range(n))
for i in range(1, n):
    r = 0
    while ingenuo[r] != r:                 # find sem compressão
        r = ingenuo[r]
    ingenuo[r] = i                         # pendura a raiz do grupo do 0 no elemento novo
esperto = UnionFind(n)
for i in range(1, n):
    esperto.union(0, i)
print("altura sem os truques:", altura(ingenuo), "| com os truques:", altura(esperto.pai))`,runnable:!0,caption:`Mesma sequência de uniões: sem os truques, a árvore vira uma cadeia e find(0) dá 999 saltos; com eles, todo elemento fica a um salto da raiz.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e3-uf-1`,kind:`mcq`,prompt:`O time antifraude guarda as contas num Union-Find, alimentado por evidências de "mesmo dono". Qual destas tarefas ele **não** consegue fazer com essa estrutura?`,difficulty:`facil`,skills:[`ed-grafos`],hints:[`Para cada tarefa, quais operações (find, union) ela precisaria?`,`As árvores internas guardam as evidências originais? Depois de algumas uniões, o pai de um elemento é sempre alguém com quem ele tem uma evidência direta?`],explanation:`O Union-Find guarda só a divisão em grupos, não as ligações que a formaram. Pertinência ao mesmo grupo, contagem de grupos e detecção de evidência redundante saem de find e union. Já a corrente de evidências exige o grafo original: lista de adjacência e uma BFS guardando o pai de cada vértice.`,options:[{text:`Dizer se duas contas estão no mesmo grupo`,feedback:`Essa é a especialidade dele: find(x) == find(y), em tempo quase constante.`},{text:`Contar quantos grupos existem a cada nova evidência`,feedback:`Dá sim: comece com n e desconte 1 a cada union que juntar grupos diferentes.`},{text:`Mostrar a corrente de evidências que liga a conta A à conta B`,correct:!0,feedback:`Isso: as árvores do Union-Find só registram quem está no mesmo grupo, e as arestas delas não correspondem às evidências. Para o caminho, guarde o grafo e use uma BFS.`},{text:`Avisar que uma evidência nova não acrescenta nada (as duas contas já estavam no mesmo grupo)`,feedback:`Dá sim: é o caso em que find dá a mesma raiz para as duas contas, e union não precisa juntar nada.`}]}},{type:`exercise`,exercise:{id:`e3-uf-2`,kind:`predict`,lang:`python`,prompt:`Este Union-Find usa união por tamanho e compressão de caminho. O que o programa imprime?`,difficulty:`intermediario`,skills:[`ed-grafos`],hints:[`Em cada union, ache primeiro as duas raízes. Quando os tamanhos empatam, quem fica embaixo?`,`Na linha do segundo print, union(5, 0) roda antes de union(1, 4). Que finds cada uma faz, e o que a compressão muda?`,`Ninguém chama find(5) depois que o grupo dele foi pendurado em outro. O pai de 5 muda?`],explanation:`union(3, 1) junta as raízes 2 e 0, ambas com tamanho 2: no empate, a raiz do segundo argumento (0) vai para baixo de 2. Depois, union(5, 0) acha as raízes 4 (tamanho 2) e 2 (tamanho 4): a menor, 4, fica embaixo de 2, e a união devolve True. Em union(1, 4), find(1) sobe 1 → 0 → 2 e comprime (1 passa a apontar para 2), e find(4) também dá 2: mesmo grupo, devolve False. O 5 continua apontando para 4, porque a compressão só mexe em quem está no caminho de um find.`,code:`pai = list(range(6))
tam = [1] * 6

def find(x):
    raiz = x
    while pai[raiz] != raiz:
        raiz = pai[raiz]
    while x != raiz:
        proximo = pai[x]
        pai[x] = raiz
        x = proximo
    return raiz

def union(x, y):
    rx, ry = find(x), find(y)
    if rx == ry:
        return False
    if tam[rx] < tam[ry]:
        rx, ry = ry, rx
    pai[ry] = rx
    tam[rx] += tam[ry]
    return True

union(0, 1)
union(2, 3)
union(3, 1)
print(pai)
union(4, 5)
print(union(5, 0), union(1, 4))
print(pai)`,answer:`[2, 0, 2, 2, 4, 5]
True False
[2, 2, 2, 2, 2, 4]`}},{type:`exercise`,exercise:{id:`e3-uf-3`,kind:`mcq`,prompt:`Um Union-Find com **união por tamanho** e **sem** compressão de caminho guarda 1 024 elementos. Depois de uma sequência qualquer de uniões, qual a maior altura que uma árvore pode ter, e com que tipo de sequência ela aparece?`,difficulty:`intermediario`,skills:[`ed-grafos`,`ed-arvores`],hints:[`Quando a profundidade de um elemento aumenta? O que acontece com o tamanho do grupo dele nesse momento?`,`Começando de um grupo de tamanho 1, quantas vezes dá para dobrar sem passar de 1 024?`],explanation:`Um elemento desce um nível só quando o grupo dele é pendurado num grupo pelo menos do mesmo tamanho, então o grupo dele no mínimo dobra. Começando em 1, dá para dobrar no máximo 10 vezes até 1 024: altura ≤ ⌊log₂ 1 024⌋ = 10. E o limite é atingido: una 512 pares, depois 256 pares de pares, e assim por diante, até a última união entre dois grupos de 512 elementos com altura 9 cada.`,options:[{text:`10, unindo sempre grupos de mesmo tamanho: pares, depois pares de pares, e assim por diante`,correct:!0,feedback:`Isso: unir duas árvores iguais de altura h dá altura h + 1, e 1 024 = 2¹⁰ permite repetir isso 10 vezes. Mais que isso é impossível, porque cada nível a mais exige que o grupo dobre.`},{text:`1 023, unindo sempre um elemento novo ao grupo grande`,feedback:`Isso aconteceria na versão ingênua. Com união por tamanho, o elemento novo (grupo de tamanho 1) é que fica pendurado na raiz do grupo grande, e a árvore vira uma estrela de altura 1.`},{text:`32, a raiz quadrada de 1 024, unindo grupos de 32 elementos`,feedback:`Não há raiz quadrada no argumento: a cada nível que um elemento desce, o grupo dele pelo menos dobra. O limite é log₂ 1 024 = 10.`},{text:`1, porque com união por tamanho toda árvore é uma estrela`,feedback:`Unir duas árvores de altura 1 e mesmo tamanho cria altura 2: a união por tamanho limita a altura a log₂ n, mas não a mantém em 1. Achatar é o papel da compressão de caminho.`}]}},{type:`exercise`,exercise:{id:`e3-uf-4`,kind:`code`,lang:`python`,prompt:"Um condomínio tem `n` prédios (0 a n − 1), e a equipe instalou cabos de rede na ordem da lista `cabos` (tuplas `(a, b)`). Escreva `ligacao_redundante(n, cabos)`, que devolve o **primeiro** cabo que não ligou nada novo: aquele cujas duas pontas já estavam conectadas, direta ou indiretamente, pelos cabos anteriores. Devolva o cabo exatamente como aparece na lista; se nenhum for redundante, devolva `None`. Um cabo de um prédio para ele mesmo também é redundante.",difficulty:`intermediario`,skills:[`ed-grafos`],hints:[`Para cada cabo, que pergunta você precisa responder antes de registrá-lo?`,`Um conjunto com os prédios que já receberam algum cabo resolve? Teste com (0, 1), (2, 3), (1, 2).`,`Com um Union-Find: se as duas pontas já têm a mesma raiz, você achou o cabo; senão, una os grupos e siga para o próximo.`],explanation:`Redundante quer dizer "as pontas já estavam no mesmo grupo", e isso é transitivo: em (0, 1), (2, 3), (1, 2), (3, 0), o cabo (1, 2) junta dois grupos diferentes, embora os dois prédios já tivessem cabo; só (3, 0) é redundante. Com Union-Find, cada cabo custa dois finds e no máximo uma união: O(m · α(n)) no total, contra O(m · (n + m)) refazendo uma busca para cada cabo. Num grafo não direcionado, o cabo redundante é a aresta que fecha o primeiro ciclo.`,starter:`def ligacao_redundante(n, cabos):
    # n prédios (0 a n - 1); cabos: lista de tuplas (a, b), na ordem de instalação
    # devolva o primeiro cabo cujas pontas JÁ estavam conectadas antes dele, ou None
    pass`,solution:`def ligacao_redundante(n, cabos):
    pai = list(range(n))
    tamanho = [1] * n

    def find(x):
        raiz = x
        while pai[raiz] != raiz:
            raiz = pai[raiz]
        while x != raiz:
            proximo = pai[x]
            pai[x] = raiz
            x = proximo
        return raiz

    for a, b in cabos:
        ra, rb = find(a), find(b)
        if ra == rb:
            return (a, b)
        if tamanho[ra] < tamanho[rb]:
            ra, rb = rb, ra
        pai[rb] = ra
        tamanho[ra] += tamanho[rb]
    return None`,tests:[{name:`exemplo`,code:`_r = ligacao_redundante(5, [(0, 1), (1, 2), (3, 4), (2, 0), (1, 3)])
assert _r == (2, 0), f"o cabo (2, 0) liga prédios que já estavam conectados por 2-1-0; veio {_r}"`},{name:`nenhum cabo redundante`,code:`_r = ligacao_redundante(4, [(0, 1), (1, 2), (2, 3)])
assert _r is None, f"uma cadeia sem ciclo não tem cabo redundante; veio {_r}"
assert ligacao_redundante(3, []) is None, "sem cabos, nenhum é redundante"
assert ligacao_redundante(1, []) is None, "um prédio só, sem cabos: None"`},{name:`cabo repetido e cabo em laço`,code:`_r = ligacao_redundante(3, [(0, 1), (1, 0)])
assert _r == (1, 0), f"o segundo cabo entre 0 e 1 é redundante; devolva-o como aparece na lista, (1, 0). Veio {_r}"
_r = ligacao_redundante(3, [(0, 1), (2, 2), (1, 2)])
assert _r == (2, 2), f"um cabo de um prédio para ele mesmo não liga nada novo; veio {_r}"`},{name:`conexão indireta`,code:`_r = ligacao_redundante(4, [(0, 1), (2, 3), (1, 2), (3, 0)])
assert _r == (3, 0), f"(1, 2) junta os grupos 0-1 e 2-3, que eram diferentes; o redundante é (3, 0). Veio {_r}"
_r = ligacao_redundante(3, [(0, 1), (0, 2), (1, 2)])
assert _r == (1, 2), f"1 e 2 já estavam ligados por 1-0-2, então (1, 2) é redundante; veio {_r}. Ao unir, mude o pai das RAÍZES, e não o de um dos prédios do cabo"
_r = ligacao_redundante(3, [(0, 1), (2, 1), (0, 2)])
assert _r == (0, 2), f"0 e 2 já estavam ligados por 0-1-2, então (0, 2) é redundante; veio {_r}. Ao unir, mude o pai das RAÍZES, e não o de um dos prédios do cabo"`},{name:`cadeia longa`,code:`_cabos = [(i, i + 1) for i in range(999)] + [(999, 0), (5, 6)]
try:
    _r = ligacao_redundante(1000, _cabos)
except RecursionError:
    raise AssertionError("RecursionError numa cadeia de 1000 prédios: sem a união por tamanho, a árvore vira uma cadeia e um find recursivo estoura o limite do Python. Una pelo tamanho ou escreva o find com while")
assert _r == (999, 0), f"o cabo (999, 0) fecha a volta da cadeia 0-1-...-999; veio {_r}"`},{name:`300 redes aleatórias`,code:`import random
def _ref_redundante(n, cabos):
    adj = {v: set() for v in range(n)}
    for a, b in cabos:
        vistos, pilha = {a}, [a]
        while pilha:
            x = pilha.pop()
            for y in adj[x]:
                if y not in vistos:
                    vistos.add(y)
                    pilha.append(y)
        if b in vistos:
            return (a, b)
        adj[a].add(b)
        adj[b].add(a)
    return None
_rng = random.Random(17)
for _ in range(300):
    _n = _rng.randint(1, 9)
    _cabos = [(_rng.randrange(_n), _rng.randrange(_n)) for _ in range(_rng.randint(0, 10))]
    _esperado = _ref_redundante(_n, _cabos)
    _r = ligacao_redundante(_n, _cabos)
    assert _r == _esperado, f"ligacao_redundante({_n}, {_cabos}) devolveu {_r}; esperado {_esperado}"`}]}},{type:`exercise`,exercise:{id:`e3-uf-5`,kind:`fix`,lang:`python`,prompt:"O sistema antifraude usa a classe abaixo, e os testes acharam dois problemas: (1) depois de uma evidência repetida (duas contas que já estavam juntas), `grupos` e `tamanho` ficam errados; (2) com certas sequências de uniões, as árvores ficam altíssimas e o `find` vira O(n), embora a classe diga que faz união por tamanho. Corrija os **dois** defeitos sem mudar a interface: `union` devolve `True` se juntou grupos diferentes e `False` se eles já eram o mesmo.",difficulty:`avancado`,skills:[`ed-grafos`,`ed-arvores`],hints:["Simule union(0, 1) e depois union(1, 0). O que acontece com `grupos` e com `tamanho` na segunda chamada?",`Na comparação de tamanhos, de quem é o tamanho que está sendo lido? Esse valor continua atualizado depois que o elemento deixa de ser raiz?`,`O tamanho de um grupo é mantido em um único lugar. Qual?`],explanation:"Primeiro defeito: sem o teste `rx == ry`, unir duas contas do mesmo grupo descontava um grupo e dobrava o tamanho. Segundo: `tamanho` só é atualizado nas raízes, então `tamanho[x]` de um elemento que já foi pendurado em outro fica velho. Comparando os tamanhos de x e y, e não os de rx e ry, a sequência union(1, 0), union(2, 0), union(3, 0), ... pendura sempre a árvore grande embaixo do elemento novo e forma uma cadeia. Os testes conferem a altura: com a união por tamanho correta, 64 elementos nunca passam de altura 6.",starter:`class UnionFind:
    def __init__(self, n):
        self.pai = list(range(n))
        self.tamanho = [1] * n             # só vale nas raízes
        self.grupos = n

    def find(self, x):
        raiz = x
        while self.pai[raiz] != raiz:
            raiz = self.pai[raiz]
        while x != raiz:
            proximo = self.pai[x]
            self.pai[x] = raiz
            x = proximo
        return raiz

    def union(self, x, y):
        """Junta os grupos de x e y. Devolve True se eram grupos diferentes."""
        rx, ry = self.find(x), self.find(y)
        if self.tamanho[x] < self.tamanho[y]:
            rx, ry = ry, rx
        self.pai[ry] = rx
        self.tamanho[rx] += self.tamanho[ry]
        self.grupos -= 1
        return True`,solution:`class UnionFind:
    def __init__(self, n):
        self.pai = list(range(n))
        self.tamanho = [1] * n             # só vale nas raízes
        self.grupos = n

    def find(self, x):
        raiz = x
        while self.pai[raiz] != raiz:
            raiz = self.pai[raiz]
        while x != raiz:
            proximo = self.pai[x]
            self.pai[x] = raiz
            x = proximo
        return raiz

    def union(self, x, y):
        """Junta os grupos de x e y. Devolve True se eram grupos diferentes."""
        rx, ry = self.find(x), self.find(y)
        if rx == ry:
            return False
        if self.tamanho[rx] < self.tamanho[ry]:
            rx, ry = ry, rx
        self.pai[ry] = rx
        self.tamanho[rx] += self.tamanho[ry]
        self.grupos -= 1
        return True`,tests:[{name:`evidência repetida`,code:`_uf = UnionFind(3)
assert _uf.union(0, 1) is True, "unir 0 e 1 (grupos diferentes) deve devolver True"
assert _uf.union(1, 0) is False, "0 e 1 já estão juntos: union deve devolver False"
assert _uf.grupos == 2, f"depois de unir 0 e 1 duas vezes, há 2 grupos (0-1 e o 2 sozinho); grupos = {_uf.grupos}"
_t = _uf.tamanho[_uf.find(0)]
assert _t == 2, f"o grupo de 0 tem 2 elementos, mas o tamanho guardado na raiz é {_t}"`},{name:`altura limitada a log₂ n`,code:`def _altura(pai):
    maior = 0
    for x in range(len(pai)):
        d = 0
        while pai[x] != x:
            x = pai[x]
            d += 1
        maior = max(maior, d)
    return maior
_uf = UnionFind(64)
for _i in range(1, 64):
    _uf.union(_i, 0)
_h = _altura(_uf.pai)
assert _h <= 6, f"com união por tamanho, 64 elementos nunca passam de altura 6; a sua árvore chegou a {_h}. Compare os tamanhos das RAÍZES"
assert _uf.grupos == 1, f"depois de unir todos ao 0, há 1 grupo; grupos = {_uf.grupos}"`},{name:`100 sequências aleatórias`,code:`def _altura(pai):
    maior = 0
    for x in range(len(pai)):
        d = 0
        while pai[x] != x:
            x = pai[x]
            d += 1
        maior = max(maior, d)
    return maior
import random, math
_rng = random.Random(3)
for _ in range(100):
    _n = _rng.randint(1, 16)
    _uf = UnionFind(_n)
    _rot = list(range(_n))
    for _ in range(_rng.randint(0, 30)):
        _a, _b = _rng.randrange(_n), _rng.randrange(_n)
        _esperado = _rot[_a] != _rot[_b]
        _volta = _uf.union(_a, _b)
        assert _volta == _esperado, f"union({_a}, {_b}) devolveu {_volta}; esperado {_esperado}"
        if _esperado:
            _velho, _novo = _rot[_b], _rot[_a]
            _rot = [_novo if r == _velho else r for r in _rot]
    assert _uf.grupos == len(set(_rot)), f"grupos = {_uf.grupos}, mas existem {len(set(_rot))} grupos"
    for _x in range(_n):
        _t = _uf.tamanho[_uf.find(_x)]
        assert _t == _rot.count(_rot[_x]), f"o grupo de {_x} tem {_rot.count(_rot[_x])} elementos, mas o tamanho na raiz é {_t}"
        for _y in range(_n):
            assert (_uf.find(_x) == _uf.find(_y)) == (_rot[_x] == _rot[_y]), f"find({_x}) e find({_y}) não refletem os grupos"
    assert _altura(_uf.pai) <= int(math.log2(_n)), f"altura {_altura(_uf.pai)} com {_n} elementos passa de log2(n)"`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e3-uf-desafio`,kind:`code`,lang:`python`,prompt:"Depois de uma enchente, a cidade foi dividida numa grade de `linhas × colunas` quarteirões, todos alagados. A cada hora a Defesa Civil libera um quarteirão: `liberacoes[k]` é a posição `(linha, coluna)` liberada na hora k + 1. Escreva `hora_da_rota(linhas, colunas, liberacoes)`, que devolve a **primeira hora** em que passa a existir um caminho de quarteirões liberados (andando para cima, para baixo, para a esquerda ou para a direita) de algum quarteirão da linha 0 até algum da última linha; se isso nunca acontecer, devolva -1. Um quarteirão pode aparecer mais de uma vez na lista. A grade pode ter 100 × 100 quarteirões, com 10 000 liberações: rodar uma busca completa depois de cada hora é lento demais.",difficulty:`desafio`,skills:[`ed-grafos`],hints:[`Rodar uma BFS depois de cada liberação custaria quanto, numa grade com 10 000 quarteirões? O que muda de uma hora para a outra?`,`As ligações entre quarteirões livres só aparecem, nunca somem. Que estrutura responde "estão no mesmo grupo?" nesse cenário? Para usá-la, como transformar (linha, coluna) num único número?`,`Perguntar se algum quarteirão de cima está no mesmo grupo de algum de baixo exigiria testar muitos pares. E se existissem dois elementos extras, um ligado a toda a linha de cima e outro a toda a linha de baixo?`,`Ao liberar um quarteirão, una-o aos vizinhos já liberados (e aos elementos extras, se ele estiver na primeira ou na última linha). Cuidado com quarteirões liberados duas vezes e com a grade de uma linha só.`],explanation:`Cada quarteirão (l, c) vira o elemento l · colunas + c, e mais dois elementos virtuais representam "a linha de cima" e "a linha de baixo". Liberar um quarteirão custa no máximo quatro uniões (com os vizinhos já liberados e, na primeira ou na última linha, com o elemento virtual daquela borda; quem está na borda tem menos vizinhos), e a pergunta "já há rota?" é um único find(TOPO) == find(FUNDO). Total: O(k · α(n)) para k liberações, contra O(k · n) refazendo uma BFS a cada hora. É o modelo clássico de percolação: com liberações em ordem aleatória numa grade grande, a rota aparece quando cerca de 59% dos quarteirões estão livres.`,starter:`def hora_da_rota(linhas, colunas, liberacoes):
    # liberacoes[k] = (linha, coluna) liberada na hora k + 1
    # devolva a primeira hora em que há caminho de quarteirões livres
    # da linha 0 até a última linha, ou -1
    pass`,solution:`def hora_da_rota(linhas, colunas, liberacoes):
    n = linhas * colunas
    TOPO, FUNDO = n, n + 1                   # dois elementos virtuais
    pai = list(range(n + 2))
    tamanho = [1] * (n + 2)

    def find(x):
        raiz = x
        while pai[raiz] != raiz:
            raiz = pai[raiz]
        while x != raiz:
            proximo = pai[x]
            pai[x] = raiz
            x = proximo
        return raiz

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra == rb:
            return
        if tamanho[ra] < tamanho[rb]:
            ra, rb = rb, ra
        pai[rb] = ra
        tamanho[ra] += tamanho[rb]

    livre = [False] * n
    for hora, (l, c) in enumerate(liberacoes, start=1):
        i = l * colunas + c
        if not livre[i]:
            livre[i] = True
            if l == 0:
                union(i, TOPO)
            if l == linhas - 1:
                union(i, FUNDO)
            for nl, nc in ((l - 1, c), (l + 1, c), (l, c - 1), (l, c + 1)):
                if 0 <= nl < linhas and 0 <= nc < colunas and livre[nl * colunas + nc]:
                    union(i, nl * colunas + nc)
        if find(TOPO) == find(FUNDO):
            return hora
    return -1`,tests:[{name:`grades mínimas`,code:`assert hora_da_rota(1, 1, [(0, 0)]) == 1, "grade 1 x 1: o único quarteirão está na primeira e na última linha; a rota existe na hora 1"
assert hora_da_rota(1, 1, []) == -1, "sem liberações, nunca há rota: -1"
assert hora_da_rota(1, 5, [(0, 3)]) == 1, "com uma linha só, qualquer quarteirão liberado já liga a linha 0 à última"
assert hora_da_rota(3, 1, [(0, 0), (2, 0), (1, 0)]) == 3, "numa coluna de 3, a rota só existe quando o meio é liberado, na hora 3"`},{name:`grades retangulares`,code:`_r = hora_da_rota(2, 3, [(0, 2), (1, 0), (1, 2)])
assert _r == 3, f"numa grade 2 x 3, (0, 2) e (1, 0) não são vizinhos; a rota surge na hora 3, com (1, 2). Veio {_r}: confira quem são os vizinhos de cada quarteirão e a conta que transforma (linha, coluna) num número"
_r = hora_da_rota(3, 2, [(0, 1), (2, 0), (1, 1), (1, 0)])
assert _r == 4, f"numa grade 3 x 2, a rota (0, 1) -> (1, 1) -> (1, 0) -> (2, 0) surge na hora 4; veio {_r}"`},{name:`diagonal não liga; repetição conta a hora`,code:`assert hora_da_rota(2, 2, [(0, 0), (1, 1)]) == -1, "(0, 0) e (1, 1) só se tocam na diagonal: não há rota"
assert hora_da_rota(2, 2, [(0, 0), (1, 1), (0, 1)]) == 3, "na hora 3, (0, 1) liga (0, 0) a (1, 1)"
assert hora_da_rota(2, 1, [(0, 0), (0, 0), (1, 0)]) == 3, "liberar de novo um quarteirão já livre não muda nada, mas a hora passa"`},{name:`exemplo 3 × 3`,code:`_r = hora_da_rota(3, 3, [(1, 1), (0, 2), (2, 0), (1, 0), (0, 1), (2, 2)])
assert _r == 5, f"a rota (0, 1) -> (1, 1) -> (1, 0) -> (2, 0) surge na hora 5; veio {_r}"`},{name:`200 grades aleatórias`,code:`from collections import deque

def _tem_rota(R, C, livres):
    fila = deque((0, c) for c in range(C) if (0, c) in livres)
    vistos = set(fila)
    while fila:
        l, c = fila.popleft()
        if l == R - 1:
            return True
        for x, y in ((l + 1, c), (l - 1, c), (l, c + 1), (l, c - 1)):
            if (x, y) in livres and (x, y) not in vistos:
                vistos.add((x, y))
                fila.append((x, y))
    return False

def _ref_hora(R, C, libs):
    livres = set()
    for k, p in enumerate(libs, start=1):
        livres.add(p)
        if _tem_rota(R, C, livres):
            return k
    return -1
import random
_rng = random.Random(29)
for _ in range(200):
    _R, _C = _rng.randint(1, 6), _rng.randint(1, 6)
    _libs = [(_rng.randrange(_R), _rng.randrange(_C)) for _ in range(_rng.randint(0, _R * _C + 3))]
    _esperado = _ref_hora(_R, _C, _libs)
    _r = hora_da_rota(_R, _C, _libs)
    assert _r == _esperado, f"hora_da_rota({_R}, {_C}, {_libs}) devolveu {_r}; esperado {_esperado}"`},{name:`grade grande (100 × 100)`,code:`from collections import deque

def _tem_rota(R, C, livres):
    fila = deque((0, c) for c in range(C) if (0, c) in livres)
    vistos = set(fila)
    while fila:
        l, c = fila.popleft()
        if l == R - 1:
            return True
        for x, y in ((l + 1, c), (l - 1, c), (l, c + 1), (l, c - 1)):
            if (x, y) in livres and (x, y) not in vistos:
                vistos.add((x, y))
                fila.append((x, y))
    return False

def _ref_hora(R, C, libs):
    livres = set()
    for k, p in enumerate(libs, start=1):
        livres.add(p)
        if _tem_rota(R, C, livres):
            return k
    return -1
import random
_R = _C = 100
_cel = [(l, c) for l in range(_R) for c in range(_C)]
random.Random(42).shuffle(_cel)
_lo, _hi = 1, len(_cel)                  # referência: busca binária na resposta + BFS
while _lo < _hi:
    _meio = (_lo + _hi) // 2
    if _tem_rota(_R, _C, set(_cel[:_meio])):
        _hi = _meio
    else:
        _lo = _meio + 1
_r = hora_da_rota(_R, _C, _cel)
assert _r == _lo, f"na grade 100 x 100 a rota surge na hora {_lo}; veio {_r}"`},{name:`grade grande, liberada de cima para baixo`,code:`# linhas 0 a 97 inteiras (9 800 horas), depois a linha 99 (100 horas), e por fim um quarteirão da linha 98
_libs = [(l, c) for l in range(98) for c in range(100)] + [(99, c) for c in range(100)] + [(98, 37)]
_r = hora_da_rota(100, 100, _libs)
assert _r == 9901, f"a rota só surge quando (98, 37) liga o bloco de cima à linha 99, na hora 9901; veio {_r}"`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:"**Mini-projeto: o limiar de percolação.** Com o seu `hora_da_rota`, rode 200 simulações em grades n × n com as liberações em ordem aleatória (`random.shuffle`) e calcule a fração média de quarteirões livres no momento em que a rota aparece. Repita para n = 10, 50 e 100: os valores se aproximam de 0,5927, o limiar de percolação da grade quadrada, um número para o qual não se conhece fórmula exata e que é estimado justamente por simulações como esta. **Extensão**: gere labirintos com Union-Find. Comece com todas as paredes entre células vizinhas, embaralhe as paredes e derrube cada uma que separa células de grupos diferentes. O resultado é um labirinto em que todo par de células tem exatamente um caminho (é o algoritmo de Kruskal com pesos aleatórios)."}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Union-Find (DSU): grupos disjuntos guardados como árvores numa lista \`pai\`; a raiz é o representante.
- find sobe até a raiz; union liga a raiz de um grupo na raiz do outro (as **raízes**, não os elementos). "Mesmo grupo?" é find(x) == find(y).
- União por tamanho: a árvore menor vai para baixo da maior; altura ≤ ⌊log₂ n⌋, porque cada descida de nível pelo menos dobra o grupo.
- Compressão de caminho: no find, todos do caminho passam a apontar para a raiz. Com os dois truques, O(α(n)) amortizado por operação, α(n) ≤ 4 na prática.
- Receitas: contar grupos (n menos as uniões que juntaram grupos diferentes); aresta com as duas pontas no mesmo grupo fecha um ciclo (base do Kruskal).
- Não faz: desunir, mostrar caminhos, alcance em grafo direcionado.`},{type:`callout`,tone:`english`,text:`**Vocabulary**: *disjoint sets*, *union-find / disjoint-set union (DSU)*, *find*, *union*, *representative*, *union by size* / *union by rank*, *path compression*, *path halving*, *inverse Ackermann function*, *dynamic connectivity*.

In CLRS, a disjoint-set data structure maintains a collection of disjoint dynamic sets, and each set is identified by a *representative*, which is some member of the set.

Typical interview sentence: "With union by rank and path compression, each operation runs in O(α(n)) amortized time, which is effectively constant for any realistic input."`,title:`English corner`}]}],cards:[{id:`l3-union-find#1`,front:`Quais são as duas operações do Union-Find e o que cada uma responde?`,back:`find(x): qual é o representante (a raiz) do grupo de x. union(x, y): junta os grupos de x e y. "Estão ligados?" é find(x) == find(y).`},{id:`l3-union-find#2`,front:`Por que a união por tamanho limita a altura a log₂ n?`,back:`Um elemento só desce um nível quando o grupo dele é pendurado num grupo pelo menos do mesmo tamanho; o grupo dele dobra a cada descida, e isso só cabe log₂ n vezes.`},{id:`l3-union-find#3`,front:`O que a compressão de caminho faz, e quem ela não alcança?`,back:`No find, depois de achar a raiz, faz cada elemento do caminho apontar direto para ela. Elementos fora do caminho de algum find continuam onde estavam.`},{id:`l3-union-find#4`,front:`Qual o custo do Union-Find com união por tamanho e compressão de caminho?`,back:`O(α(n)) amortizado por operação, em que α é a inversa da função de Ackermann (no máximo 4 na prática): quase constante.`},{id:`l3-union-find#5`,front:`Como o Union-Find detecta que uma nova aresta fecha um ciclo num grafo não direcionado?`,back:`Se as duas pontas já têm o mesmo representante antes da união, a aresta é redundante: fecha um ciclo.`},{id:`l3-union-find#6`,front:`Por que union precisa ligar as raízes, e não os próprios x e y? E por que comparar os tamanhos das raízes?`,back:`Mudar o pai de x (que não é raiz) o separa do resto do grupo; ligar as raízes junta os grupos inteiros. E o tamanho só é mantido atualizado nas raízes.`},{id:`l3-union-find#7`,front:`Cite três coisas que o Union-Find não faz.`,back:`Não remove ligações (não desune), não mostra o caminho entre dois elementos e não responde alcance em grafos direcionados.`},{id:`l3-union-find#8`,front:`Num problema de grade em que se pergunta se a linha de cima alcança a de baixo, qual o truque para não testar todos os pares?`,back:`Criar dois elementos virtuais, um unido a toda a linha de cima e outro a toda a de baixo, e perguntar se os dois estão no mesmo grupo.`}]};export{e as default};
//# sourceMappingURL=l3-union-find-Bqqt1b-y.js.map