var e={id:`l4-arvore-geradora-minima`,moduleId:`m4-6`,title:`Árvore geradora mínima: Kruskal e Prim`,titleEn:`Minimum spanning trees: Kruskal and Prim`,summary:`Ligar todos os pontos de uma rede com o menor custo total: árvores geradoras, a propriedade do corte que justifica os algoritmos gulosos, Kruskal (ordenar arestas e pular ciclos com Union-Find), Prim (crescer a árvore com um heap, primo do Dijkstra) e o uso da árvore mínima para agrupar pontos.`,minutes:50,objectives:[`Definir árvore geradora e árvore geradora mínima e distinguir esse problema do caminho mínimo`,`Usar a propriedade do corte para explicar por que escolher a aresta mais barata que cruza um corte é sempre seguro`,`Implementar Kruskal com ordenação e Union-Find, em O(E log E)`,`Implementar Prim com heap, em O(E log V), e apontar a única diferença em relação ao Dijkstra`,`Escolher entre Kruskal e Prim pela forma da entrada e pela densidade do grafo, e usar a árvore mínima para agrupar pontos`],skills:[`alg-grafos`],terms:[{pt:`árvore geradora`,en:`spanning tree`,def:`Conjunto de arestas de um grafo conexo que liga todos os vértices sem formar ciclo; tem exatamente V − 1 arestas.`},{pt:`árvore geradora mínima`,en:`minimum spanning tree (MST)`,def:`Árvore geradora cuja soma dos pesos das arestas é a menor possível.`,example:`Kruskal's algorithm computes a minimum spanning tree in O(E log E) time.`},{pt:`corte`,en:`cut`,def:`Divisão dos vértices em dois grupos; uma aresta cruza o corte quando tem uma ponta em cada grupo.`},{pt:`propriedade do corte`,en:`cut property`,def:`A aresta mais barata que cruza um corte pode sempre fazer parte de uma árvore geradora mínima; se for estritamente a mais barata, faz parte de todas.`,example:`By the cut property, the lightest edge crossing any cut belongs to some MST.`},{pt:`propriedade do ciclo`,en:`cycle property`,def:`A aresta estritamente mais cara de um ciclo não pertence a nenhuma árvore geradora mínima.`},{pt:`floresta geradora`,en:`spanning forest`,def:`Num grafo desconexo, uma árvore geradora para cada componente conexo; o Kruskal devolve a de menor custo, a floresta geradora mínima.`},{pt:`agrupamento`,en:`clustering`,def:`Dividir itens em grupos de itens parecidos ou próximos; com a árvore geradora mínima, basta cortar as arestas mais caras.`,example:`Single-linkage clustering is equivalent to running Kruskal and stopping early.`},{pt:`espaçamento`,en:`spacing`,def:`Num agrupamento, a menor distância entre dois itens de grupos diferentes; quanto maior, mais separados estão os grupos.`}],references:[`clrs`,`kleinberg-tardos`,`sedgewick-algs`,`stanford-cs161`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Um provedor de internet vai levar fibra óptica a seis bairros de uma cidade do interior. Entre alguns pares de bairros dá para passar cabo, cada trecho com um custo (postes, licenças, distância). O provedor não precisa de um cabo ligando cada par de bairros: basta que todo bairro chegue a todos os outros **por algum caminho** de cabos. Qual é o conjunto de trechos mais barato que liga tudo?

Com custos positivos, uma solução ótima nunca tem ciclo: num ciclo, dá para tirar qualquer trecho e todo mundo continua ligado, pagando menos. Então a resposta é uma {{árvore geradora|spanning tree}}: V − 1 arestas que ligam os V vértices sem ciclo. A de menor custo total é a {{árvore geradora mínima|minimum spanning tree (MST)}}, a AGM.

A mesma pergunta aparece em redes elétricas (o primeiro algoritmo para ela, de Otakar Borůvka, em 1926, foi feito para a rede elétrica da Morávia), em redes de água e de estradas, no agrupamento de dados e em aproximações para problemas difíceis, como o do caixeiro-viajante. Nesta lição você vai ver dois algoritmos gulosos clássicos: o de Kruskal, que usa o Union-Find do nível 3, e o de Prim, quase idêntico ao Dijkstra. E, como em todo guloso, vai ver **por que** a escolha local dá a resposta ótima.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`### Três fatos sobre árvores geradoras
Num grafo conexo e não direcionado com V vértices:

- toda árvore geradora tem exatamente **V − 1** arestas;
- acrescentar a uma árvore qualquer aresta que ficou de fora cria **exatamente um** ciclo;
- tirar qualquer aresta da árvore a parte em **exatamente dois** pedaços.

Os dois últimos fatos são a base das trocas de arestas que provam que os algoritmos desta lição estão certos.`},{type:`callout`,tone:`warn`,text:`Triângulo com A–B custando 2, B–C custando 2 e A–C custando 3. A AGM é {A–B, B–C}, com custo 4. Dentro dela, ir de A até C custa 4, mas o trecho direto custa 3. A AGM minimiza o custo **da rede inteira**, não a distância entre cada par. A árvore que o Dijkstra monta a partir de A (a dos caminhos mínimos) é {A–B, A–C}, com custo total 5. São perguntas diferentes, com árvores diferentes: "quanto custa construir tudo" × "quanto custa ir de um ponto a outro".`,title:`AGM não é caminho mínimo`},{type:`md`,text:`### A propriedade do corte
Divida os vértices em dois grupos quaisquer, S e o resto: isso é um {{corte|cut}}. Uma aresta **cruza** o corte se tem uma ponta de cada lado. Toda árvore geradora usa pelo menos uma aresta que cruza cada corte, senão os dois lados ficariam desligados. A {{propriedade do corte|cut property}} diz qual delas é segura:

> A aresta mais barata que cruza um corte pode entrar na AGM.

A prova é por troca, a mesma técnica que justifica algoritmos gulosos. Seja e = (u, v) a aresta mais barata que cruza o corte, e T uma AGM que não usa e. Em T existe um caminho de u até v; como u e v estão em lados diferentes, esse caminho cruza o corte em alguma aresta f. Troque f por e: T − f + e continua ligando todos os vértices (o que passava por f agora dá a volta por e) e tem V − 1 arestas, então é uma árvore geradora. Como custo(e) ≤ custo(f), ela custa no máximo o mesmo que T: também é mínima, e contém e. Se e for **estritamente** a mais barata, a troca deixaria T mais barata, o que é impossível; então toda AGM contém e.

A irmã dela é a {{propriedade do ciclo|cycle property}}: num ciclo, a aresta **estritamente** mais cara não está em nenhuma AGM. Se estivesse, bastaria tirá-la: a árvore se parte em dois pedaços, o resto do ciclo tem uma aresta mais barata ligando os dois, e colocar essa aresta no lugar daria uma árvore geradora mais barata, o que é impossível.

Os dois algoritmos a seguir são só maneiras diferentes de escolher cortes.

### Kruskal: das arestas mais baratas para as mais caras
1. Ordene as arestas por custo.
2. Para cada aresta (u, v), da mais barata para a mais cara: se u e v estão em grupos diferentes do Union-Find (\`find(u) != find(v)\`), aceite a aresta e una os grupos; senão, ela fecharia um ciclo e é descartada.
3. Pare ao aceitar V − 1 arestas.

Por que funciona: quando (u, v) é aceita, olhe o corte "o grupo de u" × "todo o resto". Nenhuma aresta mais barata que (u, v) cruza esse corte: as que foram aceitas antes estão dentro de algum grupo, e as descartadas tinham as duas pontas num mesmo grupo, que só cresceu desde então. Então (u, v) é a mais barata que cruza o corte, e a propriedade do corte garante que ela pode entrar. Já a aresta descartada nem poderia entrar: as duas pontas já estão ligadas por arestas aceitas, e ela fecharia um ciclo. E ela não faz falta: todas as outras arestas desse ciclo vieram antes na ordem, então ela é a mais cara dele (ou empata com a mais cara). Quando é estritamente a mais cara, a propriedade do ciclo garante que nenhuma AGM a usa.`},{type:`table`,head:[`Etapa do Kruskal`,`Custo`],rows:[[`ordenar as E arestas`,`O(E log E)`],[`até 2E finds e V − 1 unions (Union-Find com união por tamanho e compressão de caminho)`,`O(E · α(V)), na prática O(E)`],[`total`,`O(E log E), que é o mesmo que O(E log V)`]],caption:`Como E ≤ V², log E ≤ 2 log V, e as duas formas são equivalentes. A ordenação domina; se as arestas já chegam ordenadas, o resto é quase linear.`},{type:`md`,text:`### Prim: uma árvore que cresce
1. Comece com um vértice qualquer na árvore.
2. Repita até a árvore ter todos os vértices: entre as arestas com **uma ponta na árvore e outra fora**, pegue a mais barata e traga a ponta de fora para dentro.

É a propriedade do corte com S = os vértices que já estão na árvore. Para achar a aresta mais barata depressa, use um heap do mesmo jeito preguiçoso do Dijkstra da primeira lição deste módulo: quando um vértice entra na árvore, insira no heap (custo, vizinho) para cada vizinho que está fora; ao tirar do heap um vértice que já entrou, descarte a entrada velha. Cada aresta entra no heap no máximo uma vez por ponta: O(E log E) = O(E log V).`},{type:`table`,head:[`Aspecto`,`Dijkstra`,`Prim`],rows:[[`Prioridade no heap`,`dist[v] + custo: o caminho inteiro desde a origem`,`só o custo da aresta que liga o vizinho à árvore`],[`O que responde`,`a menor distância da origem até cada vértice`,`o conjunto de arestas mais barato que liga todos os vértices`],[`Pesos negativos`,`pode errar`,`funcionam normalmente`],[`Tipo de grafo`,`direcionado ou não direcionado`,`não direcionado`]],caption:`O código é quase o mesmo; muda uma conta. E essa conta muda a pergunta que o algoritmo responde.`},{type:`md`,text:`### Kruskal ou Prim?`},{type:`table`,head:[`Critério`,`Kruskal`,`Prim com heap`,`Prim sem heap`],rows:[[`Entrada natural`,`lista de arestas (de um CSV, de um banco)`,`lista de adjacência`,`matriz de custos ou grafo completo`],[`Custo`,`O(E log E)`,`O(E log V)`,`O(V²)`],[`Melhor para`,`grafos esparsos`,`grafos esparsos`,`grafos densos, com E perto de V²`],[`Grafo desconexo`,`devolve uma árvore por componente`,`só a árvore do componente da origem`,`só a árvore do componente da origem`]]},{type:`md`,text:`O Prim sem heap guarda, para cada vértice fora da árvore, o custo da aresta mais barata que o liga à árvore e, a cada passo, acha o menor deles numa varredura de O(V). São V passos de O(V): O(V²), sem heap nenhum. Num grafo completo, com E ≈ V²/2, isso ganha do O(E log V) das versões com heap.

### Detalhes que caem em prova e em entrevista
- **Empates.** Com custos repetidos pode haver várias AGMs, todas com o mesmo custo total. Se todos os custos forem distintos, a AGM é única. Por isso, testes de AGM conferem o custo total, e não a lista de arestas.
- **Pesos negativos.** Sem problema para Kruskal e Prim. Mais que isso: somar a mesma constante a todos os custos não muda a AGM, porque toda árvore geradora tem V − 1 arestas e sobe exatamente o mesmo valor. (No caminho mínimo é diferente: somar uma constante pune os caminhos com mais arestas e pode mudar a resposta.)
- **Árvore geradora máxima.** Ordene do maior para o menor custo, ou troque o sinal dos custos.
- **Grafo desconexo.** Não existe árvore geradora. O Kruskal termina com menos de V − 1 arestas: uma AGM por componente, a {{floresta geradora|spanning forest}}.
- **Agrupamento.** Parar o Kruskal quando restarem k grupos divide os vértices em k grupos bem separados: é o {{agrupamento|clustering}} por ligação simples (*single linkage*), assunto do desafio.`},{type:`callout`,tone:`warn`,text:`A AGM é a **árvore** mais barata. Se o objetivo real é a rede mais barata que liga todo mundo e algum trecho tem custo negativo (um subsídio que paga mais do que a obra custa), vale construir esse trecho mesmo fechando um ciclo: a melhor rede deixa de ser uma árvore. Com custos positivos, a melhor rede é sempre uma árvore, porque qualquer ciclo tem um trecho que pode sair sem desligar ninguém.`,title:`Árvore mais barata × rede mais barata`},{type:`callout`,tone:`deep`,text:`- Otakar Borůvka publicou o primeiro algoritmo em 1926. Vojtěch Jarník descreveu o "Prim" em 1930; Kruskal publicou o dele em 1956, Prim em 1957, e Dijkstra o redescobriu em 1959.
- O algoritmo determinístico mais rápido conhecido, de Bernard Chazelle (2000), roda em O(E · α(E, V)). Existe um algoritmo aleatorizado de tempo esperado linear (Karger, Klein e Tarjan, 1995). Se existe um determinístico linear ainda é um problema em aberto.
- Em grafos **direcionados**, o problema análogo (a arborescência mínima) não sai com Kruskal nem Prim; o algoritmo é o de Chu-Liu/Edmonds.
- A AGM ajuda até em problemas difíceis: com distâncias que respeitam a desigualdade triangular, visitar os pontos na pré-ordem da AGM dá uma rota de caixeiro-viajante no máximo duas vezes mais longa que a ótima.`,title:`Um pouco de história e de teoria`}]},{stage:`exemplo`,blocks:[{type:`md`,text:`Seis bairros, com as iniciais C (Centro), E (Estação), J (Jardim), L (Lago), M (Morro) e V (Vila), e nove trechos possíveis de fibra, com custo em R$ mil: E–J 1, C–J 2, C–E 3, J–L 4, L–M 4, E–L 5, M–V 6, L–V 7 e C–V 8. São 6 vértices, então a árvore terá 5 arestas.

**Kruskal**, com os trechos já em ordem de custo:`},{type:`table`,head:[`Trecho`,`Custo`,`Situação antes`,`Decisão`],rows:[[`E–J`,`1`,`todos separados`,`**aceita**: {E, J}`],[`C–J`,`2`,`C sozinho`,`**aceita**: {C, E, J}`],[`C–E`,`3`,`C e E já no grupo {C, E, J}`,`**descarta**: fecharia o ciclo C–J–E–C`],[`J–L`,`4`,`L sozinho`,`**aceita**: {C, E, J, L}`],[`L–M`,`4`,`M sozinho`,`**aceita**: {C, E, J, L, M}`],[`E–L`,`5`,`E e L no mesmo grupo`,`**descarta**`],[`M–V`,`6`,`V sozinho`,`**aceita**: todos juntos, 5 arestas, para`],[`L–V e C–V`,`7 e 8`,`—`,`nem são olhados`]],caption:`Árvore: E–J, C–J, J–L, L–M e M–V, custo 1 + 2 + 4 + 4 + 6 = R$ 17 mil.`},{type:`md`,text:`J–L e L–M empatam em 4. Aqui as duas entram, e a ordem entre elas não muda nada; em outros grafos, um empate pode trocar uma aresta por outra de mesmo custo, e o custo total continua o mesmo.

**Prim**, começando no Centro. O heap guarda pares (custo da aresta, bairro de fora):`},{type:`table`,head:[`Passo`,`Sai do heap`,`Decisão`,`Heap depois`],rows:[[`0`,`—`,`C entra (origem)`,`(2, J), (3, E), (8, V)`],[`1`,`(2, J)`,`J entra pela aresta C–J`,`(1, E), (3, E), (4, L), (8, V)`],[`2`,`(1, E)`,`E entra pela aresta J–E`,`(3, E), (4, L), (5, L), (8, V)`],[`3`,`(3, E)`,`E já está na árvore: entrada velha, descarta`,`(4, L), (5, L), (8, V)`],[`4`,`(4, L)`,`L entra pela aresta J–L`,`(4, M), (5, L), (7, V), (8, V)`],[`5`,`(4, M)`,`M entra pela aresta L–M`,`(5, L), (6, V), (7, V), (8, V)`],[`6`,`(5, L)`,`entrada velha, descarta`,`(6, V), (7, V), (8, V)`],[`7`,`(6, V)`,`V entra pela aresta M–V: todos dentro, para`,`—`]],caption:`Mesmo custo, R$ 17 mil. No passo 1, para o Dijkstra a partir do Centro, chegar a E pelo Jardim custaria 2 + 1 = 3, o mesmo que o trecho direto C–E, e nada mudaria; o Prim põe (1, E) no heap, só o custo da aresta J–E.`},{type:`md`,text:`Os dois algoritmos escolheram as mesmas arestas, em ordens diferentes. O Kruskal junta pedaços espalhados (E–J primeiro, sem passar pelo Centro); o Prim faz crescer uma árvore só, a partir da origem.`}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`import heapq
import random

class UnionFind:
    def __init__(self, n):
        self.pai = list(range(n))
        self.tamanho = [1] * n

    def find(self, x):
        while self.pai[x] != x:
            self.pai[x] = self.pai[self.pai[x]]   # divisão do caminho pela metade
            x = self.pai[x]
        return x

    def union(self, x, y):
        rx, ry = self.find(x), self.find(y)
        if rx == ry:
            return False                          # já estavam no mesmo grupo
        if self.tamanho[rx] < self.tamanho[ry]:
            rx, ry = ry, rx
        self.pai[ry] = rx
        self.tamanho[rx] += self.tamanho[ry]
        return True

def kruskal(vertices, arestas):
    idx = {v: i for i, v in enumerate(vertices)}
    uf = UnionFind(len(vertices))
    arvore = []
    for custo, u, v in sorted(arestas):
        if uf.union(idx[u], idx[v]):
            arvore.append((u, v, custo))
            if len(arvore) == len(vertices) - 1:
                break
    return arvore

def prim(vertices, arestas, origem):
    g = {v: [] for v in vertices}
    for custo, u, v in arestas:
        g[u].append((custo, v))
        g[v].append((custo, u))
    na_arvore = {origem}
    heap = [(custo, origem, w) for custo, w in g[origem]]
    heapq.heapify(heap)
    arvore = []
    while heap and len(na_arvore) < len(vertices):
        custo, u, v = heapq.heappop(heap)
        if v in na_arvore:
            continue                              # entrada velha: v já entrou
        na_arvore.add(v)
        arvore.append((u, v, custo))
        for c, w in g[v]:
            if w not in na_arvore:
                heapq.heappush(heap, (c, v, w))
    return arvore

bairros = ["Centro", "Estação", "Jardim", "Lago", "Morro", "Vila"]
trechos = [(3, "Centro", "Estação"), (2, "Centro", "Jardim"), (8, "Centro", "Vila"),
           (1, "Estação", "Jardim"), (5, "Estação", "Lago"), (4, "Jardim", "Lago"),
           (4, "Lago", "Morro"), (7, "Lago", "Vila"), (6, "Morro", "Vila")]
for nome, arvore in [("Kruskal", kruskal(bairros, trechos)), ("Prim", prim(bairros, trechos, "Centro"))]:
    print(nome, "R$", sum(c for _, _, c in arvore), "mil:", arvore)

random.seed(2024)
iguais = 0
for _ in range(300):
    vs = list(range(random.randint(2, 9)))
    arestas = [(random.randint(-5, 9), i, i + 1) for i in range(len(vs) - 1)]   # garante que é conexo
    arestas += [(random.randint(-5, 9), u, v) for u in vs for v in vs if u < v and random.random() < 0.4]
    custo_k = sum(c for _, _, c in kruskal(vs, arestas))
    custo_p = sum(c for _, _, c in prim(vs, arestas, 0))
    iguais += custo_k == custo_p
print(iguais, "de 300 grafos aleatórios (com custos negativos e repetidos) deram o mesmo custo nos dois")`,runnable:!0,caption:`Os dois algoritmos podem escolher arestas diferentes quando há empates, mas o custo total é sempre o mesmo. Troque a origem do Prim e confira.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e4-agm-1`,kind:`mcq`,prompt:`Um grafo conexo e não direcionado tem 8 vértices e 15 arestas com custos. Quantas arestas tem uma árvore geradora mínima dele?`,difficulty:`facil`,skills:[`alg-grafos`],hints:[`Uma árvore geradora liga todos os vértices sem formar ciclo. Quantas arestas são necessárias para ligar 2 vértices? E 3?`,`Os custos decidem quais arestas entram ou quantas?`],explanation:`Toda árvore com V vértices tem V − 1 arestas: cada aresta aceita junta dois pedaços, e são 7 junções para levar 8 pedaços a um só. Com menos de 7, algum vértice fica desligado; com mais, forma-se um ciclo. Os custos só decidem **quais** 7 arestas entram.`,options:[{text:`7`,correct:!0,feedback:`Isso: V − 1 = 7. Cada aresta da árvore junta dois pedaços, e são 7 junções para ligar 8 vértices.`},{text:`8`,feedback:`Com 8 arestas e 8 vértices, um grafo conexo tem obrigatoriamente um ciclo, e uma árvore não tem ciclos.`},{text:`15`,feedback:`Isso é o grafo inteiro, que tem ciclos. A árvore geradora usa só parte das arestas.`},{text:`Depende dos custos`,feedback:`Os custos mudam **quais** arestas entram, não **quantas**: toda árvore geradora de um grafo conexo com V vértices tem V − 1 arestas.`}]}},{type:`exercise`,exercise:{id:`e4-agm-2`,kind:`predict`,lang:`python`,prompt:`Este Kruskal simplificado (sem parar ao completar a árvore) imprime cada decisão. O que ele imprime?`,difficulty:`intermediario`,skills:[`alg-grafos`],hints:[`Primeiro ordene as tuplas. Quando dois custos empatam, o que decide a ordem entre elas?`,`Para cada aresta, suba de pai em pai até a raiz de cada ponta. As raízes são iguais?`,`Depois de três arestas aceitas com 4 vértices, ainda pode haver aresta aceita?`],explanation:`Ordenadas, as tuplas ficam (1, A, B), (2, A, D), (2, C, D), (3, A, C), (4, B, C), (5, B, D): no empate de custo 2, decide o segundo elemento, e "A" < "C". AB junta A e B; AD junta o grupo de A com D; CD junta C. Com 4 vértices e 3 arestas aceitas, todos estão no mesmo grupo, e as três arestas seguintes fechariam ciclos: as raízes das duas pontas são iguais. Total: 1 + 2 + 2 = 5. Um Kruskal de verdade pararia depois da terceira aresta aceita.`,code:`def find(pai, x):
    while pai[x] != x:
        x = pai[x]
    return x

arestas = [(4, "B", "C"), (1, "A", "B"), (3, "A", "C"), (2, "C", "D"), (5, "B", "D"), (2, "A", "D")]
pai = {v: v for v in "ABCD"}
total = 0
for custo, u, v in sorted(arestas):
    ru, rv = find(pai, u), find(pai, v)
    if ru == rv:
        print("pula", u + v)
    else:
        pai[ru] = rv
        total += custo
        print("usa", u + v, custo)
print("total", total)`,answer:`usa AB 1
usa AD 2
usa CD 2
pula AC
pula BC
pula BD
total 5`}},{type:`exercise`,exercise:{id:`e4-agm-3`,kind:`code`,lang:`python`,prompt:"O provedor já tem alguns cabos instalados entre bairros e uma lista de trechos que pode construir. Escreva `custo_extra(n, existentes, novos)`:\n\n- os bairros são numerados de 0 a n − 1 (n ≥ 1);\n- `existentes` é uma lista de pares `(u, v)` com cabo já instalado (custo zero);\n- `novos` é uma lista de trechos `(u, v, custo)` que podem ser construídos, com custo ≥ 0 (pode haver trechos repetidos e laços `(u, u, custo)`);\n- devolva o menor custo de construção para que todos os bairros fiquem ligados, ou `None` se nem construindo tudo eles ficam ligados.\n\nUse a classe `UnionFind` fornecida e não altere as listas recebidas.",difficulty:`intermediario`,skills:[`alg-grafos`],hints:[`Antes de olhar os trechos novos, quais bairros já estão no mesmo grupo?`,`Depois disso, que ordem de trechos o Kruskal usa, e quando um trecho deve ser pulado?`,`Como saber, no fim, se todos os bairros ficaram ligados? Contar as arestas aceitas funciona quando já existem cabos?`],explanation:`Os cabos existentes entram primeiro no Union-Find, de graça: é como um Kruskal em que eles têm custo 0 e vêm antes de tudo. Depois, o Kruskal normal percorre os trechos novos do mais barato para o mais caro e só paga pelos que juntam grupos diferentes. Para saber se tudo ficou ligado, conte os grupos (começa em n e cai 1 a cada união bem-sucedida): conferir "aceitei n − 1 trechos novos" falha justamente quando já existem cabos. Laços nunca juntam grupos, e entre trechos repetidos o mais barato aparece primeiro na ordem. Custo: O(E log E) pela ordenação, mais O((E + n) · α(n)) do Union-Find.`,starter:`class UnionFind:
    """Union-Find com união por tamanho e divisão do caminho. Não precisa alterar."""
    def __init__(self, n):
        self.pai = list(range(n))
        self.tamanho = [1] * n

    def find(self, x):
        while self.pai[x] != x:
            self.pai[x] = self.pai[self.pai[x]]
            x = self.pai[x]
        return x

    def union(self, x, y):
        """Junta os grupos de x e y. Devolve False se já estavam juntos."""
        rx, ry = self.find(x), self.find(y)
        if rx == ry:
            return False
        if self.tamanho[rx] < self.tamanho[ry]:
            rx, ry = ry, rx
        self.pai[ry] = rx
        self.tamanho[rx] += self.tamanho[ry]
        return True

def custo_extra(n, existentes, novos):
    # n bairros (0 a n - 1); existentes: pares (u, v) já ligados; novos: trechos (u, v, custo)
    # devolva o menor custo para ligar todos os bairros, ou None se for impossível
    pass`,solution:`class UnionFind:
    """Union-Find com união por tamanho e divisão do caminho. Não precisa alterar."""
    def __init__(self, n):
        self.pai = list(range(n))
        self.tamanho = [1] * n

    def find(self, x):
        while self.pai[x] != x:
            self.pai[x] = self.pai[self.pai[x]]
            x = self.pai[x]
        return x

    def union(self, x, y):
        """Junta os grupos de x e y. Devolve False se já estavam juntos."""
        rx, ry = self.find(x), self.find(y)
        if rx == ry:
            return False
        if self.tamanho[rx] < self.tamanho[ry]:
            rx, ry = ry, rx
        self.pai[ry] = rx
        self.tamanho[rx] += self.tamanho[ry]
        return True

def custo_extra(n, existentes, novos):
    uf = UnionFind(n)
    grupos = n
    for u, v in existentes:
        if uf.union(u, v):
            grupos -= 1
    total = 0
    for custo, u, v in sorted((c, u, v) for u, v, c in novos):
        if grupos == 1:
            break
        if uf.union(u, v):
            total += custo
            grupos -= 1
    return total if grupos == 1 else None`,tests:[{name:`sem cabos existentes: a AGM da lição`,code:`novos = [(0, 1, 3), (0, 2, 2), (0, 5, 8), (1, 2, 1), (1, 3, 5), (2, 3, 4), (3, 4, 4), (3, 5, 7), (4, 5, 6)]
r = custo_extra(6, [], novos)
assert r == 17, f"sem cabos existentes, é a AGM do exemplo da lição: esperado 17, veio {r}"`},{name:`com cabos existentes`,code:`novos = [(0, 1, 3), (0, 2, 2), (0, 5, 8), (1, 2, 1), (1, 3, 5), (2, 3, 4), (3, 4, 4), (3, 5, 7), (4, 5, 6)]
r = custo_extra(6, [(3, 5)], novos)
assert r == 11, f"com o cabo Lago–Vila (3, 5) já instalado, esperado 11, veio {r}. Os cabos existentes juntam grupos antes de você olhar os trechos novos"
r = custo_extra(6, [(0, 1), (1, 2), (0, 2)], novos)
assert r == 14, f"com os bairros 0, 1 e 2 já ligados (inclusive com um ciclo de cabos), esperado 14, veio {r}"`},{name:`bordas: um bairro, tudo já ligado, impossível`,code:`r = custo_extra(1, [], [])
assert r == 0, f"um bairro só já está ligado: esperado 0, veio {r}"
r = custo_extra(3, [(0, 1), (1, 2)], [(0, 2, 5)])
assert r == 0, f"os cabos existentes já ligam tudo: esperado 0, veio {r}"
r = custo_extra(4, [], [(0, 1, 1), (2, 3, 1)])
assert r is None, f"os bairros 0 e 1 nunca se ligam aos bairros 2 e 3: esperado None, veio {r}"
r = custo_extra(3, [(0, 1)], [])
assert r is None, f"o bairro 2 fica isolado: esperado None, veio {r}"`},{name:`laços e trechos repetidos`,code:`r = custo_extra(2, [], [(0, 0, 1), (0, 1, 9), (1, 0, 4)])
assert r == 4, f"o laço (0, 0) não liga nada, e entre dois trechos 0–1 vale o mais barato: esperado 4, veio {r}"
r = custo_extra(3, [], [(0, 1, 0), (1, 2, 0), (0, 2, 0)])
assert r == 0, f"trechos de custo zero: esperado 0, veio {r}"`},{name:`redes aleatórias`,code:`def _ref_extra(n, existentes, novos):
    INF = float("inf")
    c = [[INF] * n for _ in range(n)]
    for u, v in existentes:
        c[u][v] = c[v][u] = 0
    for u, v, w in novos:
        if u != v and w < c[u][v]:
            c[u][v] = c[v][u] = w
    chave = [INF] * n
    chave[0] = 0
    dentro = [False] * n
    total = 0
    for _ in range(n):
        v = min((x for x in range(n) if not dentro[x]), key=lambda x: chave[x])
        if chave[v] == INF:
            return None
        dentro[v] = True
        total += chave[v]
        for w in range(n):
            if not dentro[w] and c[v][w] < chave[w]:
                chave[w] = c[v][w]
    return total
import random
random.seed(19)
for _ in range(300):
    n = random.randint(1, 9)
    existentes = [tuple(random.sample(range(n), 2)) for _ in range(random.randint(0, n // 2))] if n > 1 else []
    novos = [(random.randrange(n), random.randrange(n), random.randint(0, 20)) for _ in range(random.randint(0, 3 * n))]
    esperado = _ref_extra(n, existentes, novos)
    r = custo_extra(n, existentes, novos)
    assert r == esperado, f"custo_extra({n}, {existentes}, {novos}) deu {r}, esperado {esperado}"`},{name:`não altera as listas recebidas`,code:`existentes = [(0, 1)]
novos = [(1, 2, 5), (0, 2, 1), (2, 3, 2)]
c1, c2 = existentes[:], novos[:]
custo_extra(4, existentes, novos)
assert existentes == c1 and novos == c2, "não altere as listas recebidas: ordene uma cópia (sorted) em vez de usar .sort()"`},{name:`3 000 bairros`,code:`import random
random.seed(23)
n = 3000
ordem = list(range(n))
random.shuffle(ordem)
caminho = [(ordem[i], ordem[i + 1], random.randint(1, 50)) for i in range(n - 1)]
caros = [(random.randrange(n), random.randrange(n), random.randint(51, 99)) for _ in range(12000)]
novos = caminho + caros
random.shuffle(novos)
r = custo_extra(n, [], novos)
esperado = sum(c for _, _, c in caminho)
assert r == esperado, f"com 3 000 bairros, esperado {esperado}, veio {r}"`}]}},{type:`exercise`,exercise:{id:`e4-agm-4`,kind:`fill`,lang:`python`,prompt:"Num grafo completo (todo bairro pode ligar com todo bairro), o Prim **sem heap** custa O(V²): guarda em `chave[w]` o custo da aresta mais barata que liga w à árvore e, a cada passo, escolhe o vértice de fora com a menor chave. Complete as lacunas. Atenção: uma delas é exatamente onde o Prim difere do Dijkstra.",difficulty:`intermediario`,skills:[`alg-grafos`],hints:[`Na varredura, você procura o vértice fora da árvore com a menor chave. Com quem a chave de u deve ser comparada?`,`Quando v entra na árvore, quanto custa a aresta que o liga a ela?`,`Ao atualizar a chave de w, o que importa no Prim: o custo do caminho desde a origem ou só o custo da aresta v–w?`],explanation:`A varredura compara chave[u] com chave[v], o melhor candidato até agora. Quando v entra, a árvore paga chave[v], o custo da aresta mais barata que o liga a ela. Depois, cada w de fora pode ganhar uma ligação mais barata através de v, e essa ligação custa só custo[v][w]. No Dijkstra, a conta seria chave[v] + custo[v][w], a distância desde a origem: é essa diferença que faz um responder "árvore mais barata" e o outro "caminhos mais curtos". São V passos, cada um com duas varreduras de O(V): O(V²), melhor que O(E log V) quando E ≈ V².`,template:`def prim_denso(custo):
    n = len(custo)                 # custo[i][j]: custo do trecho i–j (matriz simétrica)
    INF = float("inf")
    chave = [INF] * n
    chave[0] = 0
    na_arvore = [False] * n
    total = 0
    for _ in range(n):
        v = -1
        for u in range(n):
            if not na_arvore[u] and (v == -1 or chave[u] < ___):
                v = u
        na_arvore[v] = True
        total += ___
        for w in range(n):
            novo = ___
            if not na_arvore[w] and novo < chave[w]:
                chave[w] = novo
    return total`,blanks:[[`chave[v]`],[`chave[v]`],[`custo[v][w]`,`custo[w][v]`]]}},{type:`exercise`,exercise:{id:`e4-agm-5`,kind:`mcq`,prompt:`Uma empresa de energia calculou a AGM das linhas entre as suas subestações e, com o Dijkstra, os caminhos mínimos da usina até cada subestação. Um novo imposto deixa **todo** trecho R$ 10 mil mais caro. O que pode mudar?`,difficulty:`intermediario`,skills:[`alg-grafos`],hints:[`Quantas arestas tem cada árvore geradora? Quanto o custo total de cada uma sobe?`,`Dois caminhos entre os mesmos pontos sempre têm o mesmo número de trechos?`],explanation:`Toda árvore geradora tem V − 1 arestas, então todas sobem exatamente 10 · (V − 1): a ordem entre elas não muda, e a AGM continua a mesma. Caminhos, não: um caminho com 2 trechos sobe 20 mil, um com 5 trechos sobe 50 mil. Se o caminho mínimo antigo tinha muitos trechos baratos, um caminho com menos trechos pode passar à frente.`,options:[{text:`Nada muda: todos os custos subiram igual`,feedback:`Os trechos subiram igual, mas os caminhos não: cada caminho sobe 10 mil vezes o seu número de trechos. Caminhos com mais trechos são mais punidos.`},{text:`A AGM continua a mesma; os caminhos mínimos podem mudar`,correct:!0,feedback:`Isso: toda árvore geradora tem V − 1 arestas e sobe o mesmo valor, mas um caminho com mais trechos sobe mais que um com menos.`},{text:`A AGM pode mudar; os caminhos mínimos continuam os mesmos`,feedback:`É o contrário. Toda árvore geradora tem V − 1 arestas, então todas sobem exatamente o mesmo valor e a mais barata continua a mais barata.`},{text:`As duas podem mudar`,feedback:`Os caminhos podem mudar, mas a AGM não: todas as árvores geradoras sobem os mesmos 10 · (V − 1) mil.`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e4-agm-desafio`,kind:`code`,lang:`python`,prompt:"Uma rede de farmácias quer dividir n pontos de entrega em k regiões, cada uma atendida por um centro de distribuição, de modo que as regiões fiquem o mais separadas possível: a menor distância entre dois pontos de regiões **diferentes**, o {{espaçamento|spacing}}, deve ser a **maior** possível.\n\nEscreva `regioes(pontos, k)`: `pontos` é uma lista de coordenadas inteiras `(x, y)` (pode haver pontos repetidos e coordenadas negativas), a distância é medida em quarteirões, |x1 − x2| + |y1 − y2|, e 1 ≤ k ≤ len(pontos). Devolva uma lista com k listas de índices (as regiões), em que cada índice de 0 a n − 1 aparece exatamente uma vez e o espaçamento é o maior possível. A ordem das regiões e dos índices dentro delas não importa. Os testes vão até 300 pontos, e a resposta deve sair em bem menos de um segundo.",difficulty:`desafio`,skills:[`alg-grafos`],hints:[`Pense em todos os pares de pontos como arestas de um grafo completo, com a distância como custo. Em algum momento o Kruskal tem exatamente k grupos?`,`Se você parar o Kruskal ali, qual é a próxima aresta que ele aceitaria? O que o custo dela diz sobre a distância entre os grupos?`,`Por que nenhuma outra divisão em k grupos consegue separar mais? Pense em dois pontos que o Kruskal juntou mas que outra divisão separou.`,`Para montar a resposta, agrupe os índices pela raiz de cada um no Union-Find.`],explanation:`Rode o Kruskal sobre todos os pares (O(n² log n) para ordenar os n(n − 1)/2 pares) e pare quando restarem k grupos. Seja d o custo da próxima aresta que juntaria grupos diferentes: todo par de pontos em regiões diferentes está a pelo menos d, senão a aresta dele teria sido aceita antes. Então o espaçamento é d. Nenhuma outra divisão faz melhor: se ela é diferente, separa dois pontos p e q que o Kruskal deixou juntos; o caminho de p a q dentro da floresta do Kruskal só usa arestas de custo ≤ d e, como p e q estão em regiões diferentes da outra divisão, alguma aresta desse caminho liga duas regiões diferentes dela; então o espaçamento dela é ≤ d. Equivalentemente: monte a AGM e corte as k − 1 arestas mais caras. É o agrupamento por ligação simples, como em Kleinberg e Tardos (seção 4.7).`,starter:`def regioes(pontos, k):
    # pontos: lista de (x, y); 1 <= k <= len(pontos)
    # devolva k listas de índices que maximizem a menor distância
    # entre pontos de regiões diferentes
    pass`,solution:`def regioes(pontos, k):
    n = len(pontos)
    pai = list(range(n))

    def find(x):
        while pai[x] != x:
            pai[x] = pai[pai[x]]
            x = pai[x]
        return x

    pares = []
    for i in range(n):
        xi, yi = pontos[i]
        for j in range(i + 1, n):
            xj, yj = pontos[j]
            pares.append((abs(xi - xj) + abs(yi - yj), i, j))
    pares.sort()
    grupos = n
    for d, i, j in pares:
        if grupos == k:
            break
        ri, rj = find(i), find(j)
        if ri != rj:
            pai[ri] = rj
            grupos -= 1
    por_raiz = {}
    for i in range(n):
        por_raiz.setdefault(find(i), []).append(i)
    return list(por_raiz.values())`,tests:[{name:`dois bairros bem separados`,code:`import sys as _sys

class _Estourou(BaseException):
    pass

def _com_orcamento(limite, f, *args):
    cont = [0]
    def linha(frame, evento, arg):
        if evento == "line":
            cont[0] += 1
            if cont[0] > limite:
                raise _Estourou()
        return linha
    def chamada(frame, evento, arg):
        return linha if frame.f_code.co_filename == "main.py" else None
    _sys.settrace(chamada)
    try:
        return f(*args)
    except _Estourou:
        return _Estourou
    finally:
        _sys.settrace(None)
def _dist(p, q):
    return abs(p[0] - q[0]) + abs(p[1] - q[1])

def _espacamento(pontos, grupos, k):
    assert isinstance(grupos, list), f"devolva uma lista de regiões; veio {grupos!r}"
    assert len(grupos) == k, f"o número de regiões devia ser {k}, mas vieram {len(grupos)}"
    assert all(len(g) > 0 for g in grupos), f"nenhuma região pode ficar vazia; veio {grupos}"
    todos = sorted(i for g in grupos for i in g)
    assert todos == list(range(len(pontos))), f"cada índice de 0 a {len(pontos) - 1} deve aparecer em exatamente uma região; veio {grupos}"
    regiao = {}
    for r, g in enumerate(grupos):
        for i in g:
            regiao[i] = r
    melhor = float("inf")
    for i in range(len(pontos)):
        for j in range(i + 1, len(pontos)):
            if regiao[i] != regiao[j]:
                melhor = min(melhor, _dist(pontos[i], pontos[j]))
    return melhor

def _otimo(pontos, k):
    n = len(pontos)
    if k == 1:
        return float("inf")
    chave = [float("inf")] * n
    chave[0] = 0
    dentro = [False] * n
    pesos = []
    for passo in range(n):
        v = min((x for x in range(n) if not dentro[x]), key=lambda x: chave[x])
        dentro[v] = True
        if passo > 0:
            pesos.append(chave[v])
        for w in range(n):
            if not dentro[w] and _dist(pontos[v], pontos[w]) < chave[w]:
                chave[w] = _dist(pontos[v], pontos[w])
    pesos.sort(reverse=True)
    return pesos[k - 2]

def _confere_regioes(pontos, k, grupos=None):
    if grupos is None:
        grupos = regioes(pontos, k)
    esp = _espacamento(pontos, grupos, k)
    melhor = _otimo(pontos, k)
    assert esp == melhor, f"com {len(pontos)} pontos e k = {k}, a menor distância entre regiões ficou {esp}, mas dá para chegar a {melhor}"
pontos = [(0, 0), (1, 0), (0, 1), (10, 10), (11, 10), (10, 12)]
grupos = regioes(pontos, 2)
esp = _espacamento(pontos, grupos, 2)
assert esp == 19, f"as duas regiões naturais são os índices 0, 1, 2 e 3, 4, 5, com espaçamento 19; o seu ficou {esp}"`},{name:`k = 1 e k = n`,code:`import sys as _sys

class _Estourou(BaseException):
    pass

def _com_orcamento(limite, f, *args):
    cont = [0]
    def linha(frame, evento, arg):
        if evento == "line":
            cont[0] += 1
            if cont[0] > limite:
                raise _Estourou()
        return linha
    def chamada(frame, evento, arg):
        return linha if frame.f_code.co_filename == "main.py" else None
    _sys.settrace(chamada)
    try:
        return f(*args)
    except _Estourou:
        return _Estourou
    finally:
        _sys.settrace(None)
def _dist(p, q):
    return abs(p[0] - q[0]) + abs(p[1] - q[1])

def _espacamento(pontos, grupos, k):
    assert isinstance(grupos, list), f"devolva uma lista de regiões; veio {grupos!r}"
    assert len(grupos) == k, f"o número de regiões devia ser {k}, mas vieram {len(grupos)}"
    assert all(len(g) > 0 for g in grupos), f"nenhuma região pode ficar vazia; veio {grupos}"
    todos = sorted(i for g in grupos for i in g)
    assert todos == list(range(len(pontos))), f"cada índice de 0 a {len(pontos) - 1} deve aparecer em exatamente uma região; veio {grupos}"
    regiao = {}
    for r, g in enumerate(grupos):
        for i in g:
            regiao[i] = r
    melhor = float("inf")
    for i in range(len(pontos)):
        for j in range(i + 1, len(pontos)):
            if regiao[i] != regiao[j]:
                melhor = min(melhor, _dist(pontos[i], pontos[j]))
    return melhor

def _otimo(pontos, k):
    n = len(pontos)
    if k == 1:
        return float("inf")
    chave = [float("inf")] * n
    chave[0] = 0
    dentro = [False] * n
    pesos = []
    for passo in range(n):
        v = min((x for x in range(n) if not dentro[x]), key=lambda x: chave[x])
        dentro[v] = True
        if passo > 0:
            pesos.append(chave[v])
        for w in range(n):
            if not dentro[w] and _dist(pontos[v], pontos[w]) < chave[w]:
                chave[w] = _dist(pontos[v], pontos[w])
    pesos.sort(reverse=True)
    return pesos[k - 2]

def _confere_regioes(pontos, k, grupos=None):
    if grupos is None:
        grupos = regioes(pontos, k)
    esp = _espacamento(pontos, grupos, k)
    melhor = _otimo(pontos, k)
    assert esp == melhor, f"com {len(pontos)} pontos e k = {k}, a menor distância entre regiões ficou {esp}, mas dá para chegar a {melhor}"
pontos = [(3, 1), (0, 0), (5, 5), (2, 2)]
grupos = regioes(pontos, 1)
_espacamento(pontos, grupos, 1)
grupos = regioes(pontos, 4)
_espacamento(pontos, grupos, 4)
grupos = regioes([(7, 7)], 1)
_espacamento([(7, 7)], grupos, 1)`},{name:`pontos repetidos`,code:`import sys as _sys

class _Estourou(BaseException):
    pass

def _com_orcamento(limite, f, *args):
    cont = [0]
    def linha(frame, evento, arg):
        if evento == "line":
            cont[0] += 1
            if cont[0] > limite:
                raise _Estourou()
        return linha
    def chamada(frame, evento, arg):
        return linha if frame.f_code.co_filename == "main.py" else None
    _sys.settrace(chamada)
    try:
        return f(*args)
    except _Estourou:
        return _Estourou
    finally:
        _sys.settrace(None)
def _dist(p, q):
    return abs(p[0] - q[0]) + abs(p[1] - q[1])

def _espacamento(pontos, grupos, k):
    assert isinstance(grupos, list), f"devolva uma lista de regiões; veio {grupos!r}"
    assert len(grupos) == k, f"o número de regiões devia ser {k}, mas vieram {len(grupos)}"
    assert all(len(g) > 0 for g in grupos), f"nenhuma região pode ficar vazia; veio {grupos}"
    todos = sorted(i for g in grupos for i in g)
    assert todos == list(range(len(pontos))), f"cada índice de 0 a {len(pontos) - 1} deve aparecer em exatamente uma região; veio {grupos}"
    regiao = {}
    for r, g in enumerate(grupos):
        for i in g:
            regiao[i] = r
    melhor = float("inf")
    for i in range(len(pontos)):
        for j in range(i + 1, len(pontos)):
            if regiao[i] != regiao[j]:
                melhor = min(melhor, _dist(pontos[i], pontos[j]))
    return melhor

def _otimo(pontos, k):
    n = len(pontos)
    if k == 1:
        return float("inf")
    chave = [float("inf")] * n
    chave[0] = 0
    dentro = [False] * n
    pesos = []
    for passo in range(n):
        v = min((x for x in range(n) if not dentro[x]), key=lambda x: chave[x])
        dentro[v] = True
        if passo > 0:
            pesos.append(chave[v])
        for w in range(n):
            if not dentro[w] and _dist(pontos[v], pontos[w]) < chave[w]:
                chave[w] = _dist(pontos[v], pontos[w])
    pesos.sort(reverse=True)
    return pesos[k - 2]

def _confere_regioes(pontos, k, grupos=None):
    if grupos is None:
        grupos = regioes(pontos, k)
    esp = _espacamento(pontos, grupos, k)
    melhor = _otimo(pontos, k)
    assert esp == melhor, f"com {len(pontos)} pontos e k = {k}, a menor distância entre regiões ficou {esp}, mas dá para chegar a {melhor}"
pontos = [(2, 2), (2, 2), (7, 2), (7, 3)]
for k, esperado in [(2, 5), (3, 1), (4, 0)]:
    grupos = regioes(pontos, k)
    esp = _espacamento(pontos, grupos, k)
    assert esp == esperado, f"com {pontos} e k = {k}, o melhor espaçamento é {esperado}; o seu ficou {esp}"`},{name:`coordenadas negativas e pontos aleatórios`,code:`import sys as _sys

class _Estourou(BaseException):
    pass

def _com_orcamento(limite, f, *args):
    cont = [0]
    def linha(frame, evento, arg):
        if evento == "line":
            cont[0] += 1
            if cont[0] > limite:
                raise _Estourou()
        return linha
    def chamada(frame, evento, arg):
        return linha if frame.f_code.co_filename == "main.py" else None
    _sys.settrace(chamada)
    try:
        return f(*args)
    except _Estourou:
        return _Estourou
    finally:
        _sys.settrace(None)
def _dist(p, q):
    return abs(p[0] - q[0]) + abs(p[1] - q[1])

def _espacamento(pontos, grupos, k):
    assert isinstance(grupos, list), f"devolva uma lista de regiões; veio {grupos!r}"
    assert len(grupos) == k, f"o número de regiões devia ser {k}, mas vieram {len(grupos)}"
    assert all(len(g) > 0 for g in grupos), f"nenhuma região pode ficar vazia; veio {grupos}"
    todos = sorted(i for g in grupos for i in g)
    assert todos == list(range(len(pontos))), f"cada índice de 0 a {len(pontos) - 1} deve aparecer em exatamente uma região; veio {grupos}"
    regiao = {}
    for r, g in enumerate(grupos):
        for i in g:
            regiao[i] = r
    melhor = float("inf")
    for i in range(len(pontos)):
        for j in range(i + 1, len(pontos)):
            if regiao[i] != regiao[j]:
                melhor = min(melhor, _dist(pontos[i], pontos[j]))
    return melhor

def _otimo(pontos, k):
    n = len(pontos)
    if k == 1:
        return float("inf")
    chave = [float("inf")] * n
    chave[0] = 0
    dentro = [False] * n
    pesos = []
    for passo in range(n):
        v = min((x for x in range(n) if not dentro[x]), key=lambda x: chave[x])
        dentro[v] = True
        if passo > 0:
            pesos.append(chave[v])
        for w in range(n):
            if not dentro[w] and _dist(pontos[v], pontos[w]) < chave[w]:
                chave[w] = _dist(pontos[v], pontos[w])
    pesos.sort(reverse=True)
    return pesos[k - 2]

def _confere_regioes(pontos, k, grupos=None):
    if grupos is None:
        grupos = regioes(pontos, k)
    esp = _espacamento(pontos, grupos, k)
    melhor = _otimo(pontos, k)
    assert esp == melhor, f"com {len(pontos)} pontos e k = {k}, a menor distância entre regiões ficou {esp}, mas dá para chegar a {melhor}"
import random
random.seed(29)
for _ in range(150):
    n = random.randint(1, 25)
    pontos = [(random.randint(-20, 20), random.randint(-20, 20)) for _ in range(n)]
    k = random.randint(1, n)
    _confere_regioes(pontos, k)`},{name:`300 pontos`,code:`import sys as _sys

class _Estourou(BaseException):
    pass

def _com_orcamento(limite, f, *args):
    cont = [0]
    def linha(frame, evento, arg):
        if evento == "line":
            cont[0] += 1
            if cont[0] > limite:
                raise _Estourou()
        return linha
    def chamada(frame, evento, arg):
        return linha if frame.f_code.co_filename == "main.py" else None
    _sys.settrace(chamada)
    try:
        return f(*args)
    except _Estourou:
        return _Estourou
    finally:
        _sys.settrace(None)
def _dist(p, q):
    return abs(p[0] - q[0]) + abs(p[1] - q[1])

def _espacamento(pontos, grupos, k):
    assert isinstance(grupos, list), f"devolva uma lista de regiões; veio {grupos!r}"
    assert len(grupos) == k, f"o número de regiões devia ser {k}, mas vieram {len(grupos)}"
    assert all(len(g) > 0 for g in grupos), f"nenhuma região pode ficar vazia; veio {grupos}"
    todos = sorted(i for g in grupos for i in g)
    assert todos == list(range(len(pontos))), f"cada índice de 0 a {len(pontos) - 1} deve aparecer em exatamente uma região; veio {grupos}"
    regiao = {}
    for r, g in enumerate(grupos):
        for i in g:
            regiao[i] = r
    melhor = float("inf")
    for i in range(len(pontos)):
        for j in range(i + 1, len(pontos)):
            if regiao[i] != regiao[j]:
                melhor = min(melhor, _dist(pontos[i], pontos[j]))
    return melhor

def _otimo(pontos, k):
    n = len(pontos)
    if k == 1:
        return float("inf")
    chave = [float("inf")] * n
    chave[0] = 0
    dentro = [False] * n
    pesos = []
    for passo in range(n):
        v = min((x for x in range(n) if not dentro[x]), key=lambda x: chave[x])
        dentro[v] = True
        if passo > 0:
            pesos.append(chave[v])
        for w in range(n):
            if not dentro[w] and _dist(pontos[v], pontos[w]) < chave[w]:
                chave[w] = _dist(pontos[v], pontos[w])
    pesos.sort(reverse=True)
    return pesos[k - 2]

def _confere_regioes(pontos, k, grupos=None):
    if grupos is None:
        grupos = regioes(pontos, k)
    esp = _espacamento(pontos, grupos, k)
    melhor = _otimo(pontos, k)
    assert esp == melhor, f"com {len(pontos)} pontos e k = {k}, a menor distância entre regiões ficou {esp}, mas dá para chegar a {melhor}"
import random
random.seed(31)
pontos = [(random.randint(0, 1000), random.randint(0, 1000)) for _ in range(300)]
grupos = _com_orcamento(2_000_000, regioes, pontos, 2)
assert grupos is not _Estourou, "com 300 pontos e k = 2, a função executou mais de 2 milhões de linhas. Procurar, a cada fusão, o par de regiões mais próximo comparando todas com todas custa O(n³) ou mais. Gere e ordene os pares uma única vez e junte as regiões na ordem dos pares"
_confere_regioes(pontos, 2, grupos)
for k in (7, 40):
    _confere_regioes(pontos, k)`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:"**Mini-projeto: Kruskal × Prim na prática.** Gere grafos aleatórios conexos com V = 200, 500 e 1 000 vértices em duas versões: esparsa (E ≈ 3V) e completa (E ≈ V²/2). Meça com `time.perf_counter` o Kruskal, o Prim com heap e o Prim sem heap do exercício de lacunas, confira que os três dão o mesmo custo e monte uma tabela comparando os tempos com O(E log E), O(E log V) e O(V²). Em qual cenário cada um vence? **Extensão:** sorteie pontos no plano, monte a AGM pela distância em linha reta e visite os pontos na pré-ordem da árvore (uma DFS a partir de qualquer ponto). A rota resultante tem no máximo o dobro do comprimento da rota ótima do caixeiro-viajante; compare com a força bruta para 8 pontos."}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Árvore geradora: V − 1 arestas, liga tudo, sem ciclo. AGM: a de menor custo total. AGM não é caminho mínimo.
- Propriedade do corte: a aresta mais barata que cruza um corte pode entrar na AGM (prova por troca). Propriedade do ciclo: a estritamente mais cara de um ciclo nunca entra.
- Kruskal: ordena as arestas e aceita as que ligam grupos diferentes do Union-Find. O(E log E), dominado pela ordenação.
- Prim: cresce uma árvore a partir de uma origem, sempre pela aresta mais barata que sai dela. Com heap, O(E log V); sem heap, O(V²), melhor em grafos densos.
- Prim e Dijkstra só diferem na prioridade: custo da aresta × distância desde a origem.
- Empates geram várias AGMs com o mesmo custo; somar uma constante a todos os custos não muda a AGM; pesos negativos funcionam.
- Parar o Kruskal com k grupos dá o agrupamento com o maior espaçamento possível.`},{type:`callout`,tone:`english`,text:`- **spanning tree / minimum spanning tree (MST)**: árvore geradora / árvore geradora mínima
- **cut / crossing edge / light edge**: corte / aresta que cruza o corte / aresta mais leve
- **cut property / cycle property**: propriedade do corte / propriedade do ciclo
- **disjoint-set union (DSU)**: Union-Find
- **spanning forest**: floresta geradora
- **single-linkage clustering / spacing**: agrupamento por ligação simples / espaçamento

Frase típica de entrevista: *"I'd sort the edges by weight and use a union-find to skip any edge whose endpoints are already connected. That's Kruskal's algorithm: O(E log E), dominated by the sort."*

Outra: *"Prim's algorithm looks just like Dijkstra's, except that the priority is the weight of the connecting edge, not the distance from the source."*`,title:`English corner`}]}],cards:[{id:`l4-arvore-geradora-minima#1`,front:`Quantas arestas tem uma árvore geradora de um grafo conexo com V vértices?`,back:`V − 1.`},{id:`l4-arvore-geradora-minima#2`,front:`O que diz a propriedade do corte, e como se prova?`,back:`A aresta mais barata que cruza um corte pode estar numa AGM. Prova por troca: numa AGM sem ela, o caminho entre as pontas cruza o corte por outra aresta, não mais barata, que pode ser trocada por ela.`},{id:`l4-arvore-geradora-minima#3`,front:`Como o Kruskal decide se aceita uma aresta, e quanto ele custa?`,back:`Percorre as arestas em ordem crescente de custo e aceita a que liga grupos diferentes do Union-Find (find(u) != find(v)). O(E log E), dominado pela ordenação.`},{id:`l4-arvore-geradora-minima#4`,front:`Qual é a única diferença entre o Prim e o Dijkstra com heap?`,back:`A prioridade: no Prim, o custo da aresta que liga o vértice à árvore; no Dijkstra, a distância total desde a origem.`},{id:`l4-arvore-geradora-minima#5`,front:`A AGM dá o caminho mais barato entre dois vértices? Por quê?`,back:`Não. Ela minimiza o custo total da rede; o caminho dentro da árvore pode ser mais caro que um atalho que ficou de fora.`},{id:`l4-arvore-geradora-minima#6`,front:`Somar a mesma constante a todos os custos muda a AGM? E o caminho mínimo?`,back:`A AGM não muda, porque toda árvore geradora tem V − 1 arestas e sobe o mesmo valor. O caminho mínimo pode mudar, porque caminhos com mais arestas sobem mais.`},{id:`l4-arvore-geradora-minima#7`,front:`Quando o Prim sem heap, O(V²), é a melhor escolha?`,back:`Em grafos densos, com E perto de V², como um grafo completo de pontos.`},{id:`l4-arvore-geradora-minima#8`,front:`Como dividir pontos em k grupos com o maior espaçamento possível?`,back:`Rodar o Kruskal sobre todos os pares e parar quando restarem k grupos; equivale a cortar as k − 1 arestas mais caras da AGM.`}]};export{e as default};
//# sourceMappingURL=l4-arvore-geradora-minima-D67dSztw.js.map