var e={id:`l4-dijkstra`,moduleId:`m4-6`,title:`Caminhos mínimos com pesos: Dijkstra`,titleEn:`Weighted shortest paths: Dijkstra`,summary:`Quando as arestas têm custo, a BFS não basta. Dijkstra usa uma fila de prioridade.`,minutes:35,objectives:[`Entender por que BFS falha com pesos`,`Implementar Dijkstra com heapq`,`Saber a limitação com pesos negativos`],skills:[`alg-grafos`],terms:[{pt:`grafo ponderado`,en:`weighted graph`,def:`Grafo em que cada aresta tem um custo.`},{pt:`fila de prioridade`,en:`priority queue`,def:`Estrutura que sempre devolve o item de menor prioridade primeiro.`},{pt:`heap`,en:`heap`,def:`Árvore que implementa fila de prioridade com inserção/remoção O(log n).`},{pt:`relaxar uma aresta`,en:`edge relaxation`,def:`Atualizar a distância de um vértice se um caminho melhor foi encontrado.`}],references:[`clrs`,`sedgewick-algs`,`python-docs`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Num mapa, as estradas têm **comprimentos** diferentes: o caminho com menos estradas não é necessariamente o mais curto. O **algoritmo de Dijkstra** encontra os menores caminhos a partir de uma origem quando os pesos são **não negativos**.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`Ideia (gulosa, e provadamente correta para pesos ≥ 0):

1. dist[origem] = 0; todos os outros = ∞.
2. Repita: pegue o vértice **não finalizado com menor distância** (fila de prioridade / heap).
3. Para cada vizinho, **relaxe** a aresta: se dist[v] + peso < dist[w], atualize dist[w].

Com \`heapq\`: O((V + E) log V). Com pesos negativos, Dijkstra pode errar — use Bellman-Ford.`}]},{stage:`exemplo`,blocks:[{type:`code`,lang:`python`,code:`import heapq

def dijkstra(g, origem):
    dist = {origem: 0}
    heap = [(0, origem)]
    while heap:
        d, v = heapq.heappop(heap)
        if d > dist.get(v, float("inf")):
            continue                       # entrada antiga, ignore
        for w, peso in g[v]:
            nd = d + peso
            if nd < dist.get(w, float("inf")):
                dist[w] = nd
                heapq.heappush(heap, (nd, w))
    return dist

mapa = {"A": [("B", 4), ("C", 1)], "B": [("D", 1)], "C": [("B", 2), ("D", 5)], "D": []}
print(dijkstra(mapa, "A"))   # B por C é mais curto: 1 + 2 = 3`,runnable:!0}]},{stage:`codigo`,blocks:[{type:`md`,text:"`heapq` transforma uma lista em um **min-heap**: `heappush` e `heappop` em O(log n), e o menor elemento sempre em `heap[0]`."},{type:`code`,lang:`python`,code:`import heapq
tarefas = []
heapq.heappush(tarefas, (3, "estudar grafos"))
heapq.heappush(tarefas, (1, "revisar flashcards"))
heapq.heappush(tarefas, (2, "fazer desafio"))
while tarefas:
    print(heapq.heappop(tarefas))`,runnable:!0}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e4-dij-1`,kind:`mcq`,prompt:`Por que a BFS não serve para menor caminho em grafo **com pesos**?`,difficulty:`facil`,skills:[`alg-grafos`],hints:[`O que a BFS minimiza: o número de arestas ou a soma dos pesos?`],explanation:`BFS minimiza o número de arestas. Um caminho com mais arestas pode ter soma de pesos menor.`,options:[{text:`Porque a BFS minimiza o número de arestas, não a soma dos pesos`,correct:!0,feedback:`Isso.`},{text:`Porque a BFS não termina em grafos com pesos`,feedback:`Ela termina, só não responde a pergunta certa.`},{text:`Porque a BFS só funciona em árvores`,feedback:`BFS funciona em qualquer grafo.`},{text:`Porque pesos tornam o grafo direcionado`,feedback:`Peso e direção são independentes.`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e4-dij-desafio`,kind:`code`,lang:`python`,prompt:"Escreva `custo_minimo(g, a, b)` que devolve o custo do menor caminho de a até b (ou `None`), em um grafo `{v: [(w, peso), ...]}` com pesos não negativos.",difficulty:`avancado`,skills:[`alg-grafos`],hints:[`Adapte o Dijkstra do exemplo.`,`Você pode parar assim que retirar b do heap: a distância dele já é final.`],explanation:`Quando um vértice sai do heap pela primeira vez (com distância atual), sua distância é definitiva — é exatamente a propriedade gulosa provada para pesos não negativos.`,starter:`import heapq

def custo_minimo(g, a, b):
    pass
`,solution:`import heapq

def custo_minimo(g, a, b):
    dist = {a: 0}
    heap = [(0, a)]
    while heap:
        d, v = heapq.heappop(heap)
        if v == b:
            return d
        if d > dist[v]:
            continue
        for w, p in g.get(v, []):
            if d + p < dist.get(w, float("inf")):
                dist[w] = d + p
                heapq.heappush(heap, (d + p, w))
    return None`,tests:[{name:`caminho indireto mais barato`,code:`g = {"A": [("B", 4), ("C", 1)], "B": [("D", 1)], "C": [("B", 2), ("D", 5)], "D": []}
assert custo_minimo(g, "A", "D") == 4`},{name:`inalcançável`,code:`assert custo_minimo({"A": [], "B": []}, "A", "B") is None`},{name:`origem`,code:`assert custo_minimo({"A": []}, "A", "A") == 0`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:`**Mini-projeto: rotas no metrô**. Modele algumas estações do metrô da sua cidade (ou uma inventada) com tempos entre estações e baldeações. Implemente "como chegar mais rápido de X a Y" mostrando o caminho, não só o custo.`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Pesos → Dijkstra (pesos ≥ 0), fila de prioridade, relaxamento.
- O((V + E) log V) com heap.
- Pesos negativos: Bellman-Ford.`}]}],cards:[{id:`l4-dijkstra#1`,front:`Qual estrutura o Dijkstra usa para escolher o próximo vértice?`,back:`Uma fila de prioridade (heap) pela menor distância.`},{id:`l4-dijkstra#2`,front:`Quando o Dijkstra pode falhar?`,back:`Com arestas de peso negativo.`}]};export{e as default};
//# sourceMappingURL=l4-dijkstra-DSQrzOTp.js.map