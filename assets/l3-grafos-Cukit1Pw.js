var e={id:`l3-grafos`,moduleId:`m3-5`,title:`Grafos e busca em largura`,titleEn:`Graphs and breadth-first search`,summary:`Vértices e arestas, listas de adjacência, BFS e DFS.`,minutes:35,objectives:[`Modelar problemas como grafos`,`Representar grafos com lista de adjacência`,`Implementar BFS e DFS`,`Encontrar o menor caminho em grafos sem peso`],skills:[`ed-grafos`],terms:[{pt:`grafo`,en:`graph`,def:`Conjunto de vértices ligados por arestas.`},{pt:`vértice`,en:`vertex / node`,def:`Um elemento do grafo (uma pessoa, uma cidade, uma página).`},{pt:`aresta`,en:`edge`,def:`Uma ligação entre dois vértices.`},{pt:`lista de adjacência`,en:`adjacency list`,def:`Para cada vértice, a lista dos vizinhos.`},{pt:`busca em largura`,en:`breadth-first search (BFS)`,def:`Explora por camadas, usando uma fila.`},{pt:`busca em profundidade`,en:`depth-first search (DFS)`,def:`Explora um caminho até o fim antes de voltar, usando pilha ou recursão.`},{pt:`direcionado`,en:`directed`,def:`Arestas com sentido (seguir no Instagram).`}],references:[`clrs`,`sedgewick-algs`,`mit-6006`,`stanford-cs161`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Um **{{grafo|graph}}** é um conjunto de **{{vértices|vertices}}** ligados por **{{arestas|edges}}**. Redes sociais, mapas, links da web, dependências de pacotes, a própria árvore de conhecimento do Alicerce — tudo isso são grafos. Árvores são um caso particular de grafo.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`**Representação**: a mais comum é a **{{lista de adjacência|adjacency list}}**, um dict de vértice → vizinhos:

\`\`\`
g = {"A": ["B", "C"], "B": ["D"], "C": ["D"], "D": []}
\`\`\`

**BFS** (*breadth-first search*): começa na origem e visita os vizinhos, depois os vizinhos dos vizinhos — **por camadas**, usando uma **fila**. Em grafos sem peso, a BFS encontra o **menor caminho** (em número de arestas).

**DFS** (*depth-first search*): vai fundo por um caminho antes de voltar, usando uma **pilha** (ou recursão). Útil para detectar ciclos, ordenação topológica, componentes conectados.

Os dois visitam cada vértice e aresta uma vez: **O(V + E)**. O detalhe essencial: marcar **visitados** para não andar em círculos.`}]},{stage:`exemplo`,blocks:[{type:`viz`,viz:`graph-bfs`,caption:`Execute a BFS passo a passo: observe a fila e as camadas de distância.`}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`from collections import deque

def bfs_distancias(g, origem):
    dist = {origem: 0}
    fila = deque([origem])
    while fila:
        v = fila.popleft()
        for w in g[v]:
            if w not in dist:          # visitado?
                dist[w] = dist[v] + 1
                fila.append(w)
    return dist

amigos = {"Ana": ["Bia", "Caio"], "Bia": ["Ana", "Davi"], "Caio": ["Ana", "Davi"], "Davi": ["Bia", "Caio", "Eva"], "Eva": ["Davi"]}
print(bfs_distancias(amigos, "Ana"))`,runnable:!0}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e3-graph-1`,kind:`mcq`,prompt:`Você quer o **menor número de conexões** entre duas pessoas em uma rede social. Qual algoritmo usar?`,difficulty:`facil`,skills:[`ed-grafos`],hints:[`Qual busca explora por camadas de distância?`],explanation:`BFS visita vértices em ordem crescente de distância; a primeira vez que alcança o destino é pelo menor caminho (grafo sem pesos).`,options:[{text:`DFS`,feedback:`DFS pode achar um caminho longo primeiro.`},{text:`BFS`,correct:!0,feedback:`Isso: por camadas, garante o menor caminho sem pesos.`},{text:`Ordenação`,feedback:`Ordenar não resolve caminhos.`},{text:`Busca binária`,feedback:`Busca binária é para dados ordenados, não grafos.`}]}},{type:`exercise`,exercise:{id:`e3-graph-2`,kind:`code`,lang:`python`,prompt:"Escreva `alcancaveis(g, origem)` que devolve o **conjunto** de vértices alcançáveis a partir da origem (incluindo ela), usando DFS com uma pilha explícita.",difficulty:`intermediario`,skills:[`ed-grafos`],hints:[`Comece com pilha = [origem] e um set de visitados.`,`Enquanto a pilha não estiver vazia: pop; se não visitado, marque e empilhe os vizinhos.`],explanation:`Trocar a fila da BFS por uma pilha transforma a busca em DFS. O set de visitados evita loops em grafos com ciclos.`,starter:`def alcancaveis(g, origem):
    pass
`,solution:`def alcancaveis(g, origem):
    visitados = set()
    pilha = [origem]
    while pilha:
        v = pilha.pop()
        if v in visitados:
            continue
        visitados.add(v)
        pilha.extend(g.get(v, []))
    return visitados`,tests:[{name:`grafo com ciclo`,code:`g = {1: [2], 2: [3], 3: [1], 4: [1]}
assert alcancaveis(g, 1) == {1, 2, 3}`},{name:`isolado`,code:`assert alcancaveis({1: []}, 1) == {1}`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e3-graph-desafio`,kind:`code`,lang:`python`,prompt:"Escreva `menor_caminho(g, a, b)` que devolve a **lista de vértices** do menor caminho de a até b (grafo sem pesos), ou `None` se não houver. Dica: BFS guardando de onde veio cada vértice.",difficulty:`desafio`,skills:[`ed-grafos`],hints:["Na BFS, quando descobrir w a partir de v, guarde `pai[w] = v`.","Ao chegar em b, reconstrua o caminho seguindo `pai` de trás para frente e inverta."],explanation:`Guardar o predecessor de cada vértice permite reconstruir o caminho. É a mesma ideia usada em GPS (com Dijkstra, quando há pesos — Nível 4).`,starter:`from collections import deque

def menor_caminho(g, a, b):
    pass
`,solution:`from collections import deque

def menor_caminho(g, a, b):
    pai = {a: None}
    fila = deque([a])
    while fila:
        v = fila.popleft()
        if v == b:
            caminho = []
            while v is not None:
                caminho.append(v)
                v = pai[v]
            return caminho[::-1]
        for w in g.get(v, []):
            if w not in pai:
                pai[w] = v
                fila.append(w)
    return None`,tests:[{name:`menor caminho`,code:`g = {"A": ["B", "C"], "B": ["D"], "C": ["D", "E"], "D": ["E"], "E": []}
assert menor_caminho(g, "A", "E") == ["A", "C", "E"]`},{name:`sem caminho`,code:`assert menor_caminho({"A": [], "B": []}, "A", "B") is None`},{name:`origem = destino`,code:`assert menor_caminho({"A": []}, "A", "A") == ["A"]`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:'**Mini-projeto: graus de separação**. Monte um grafo de "quem segue quem" a partir de um arquivo CSV (`origem,destino`) e responda: qual o menor caminho entre duas pessoas? Quem tem mais seguidores? Existe alguém inalcançável?'}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Grafo: vértices + arestas; árvores são casos particulares.
- Lista de adjacência: dict de vizinhos.
- BFS (fila, camadas, menor caminho sem pesos); DFS (pilha/recursão).
- Sempre marque visitados. Custo O(V + E).`}]}],cards:[{id:`l3-grafos#1`,front:`Que estrutura a BFS usa? E a DFS?`,back:`BFS usa fila; DFS usa pilha (ou recursão).`},{id:`l3-grafos#2`,front:`Qual o custo de BFS/DFS com lista de adjacência?`,back:`O(V + E).`},{id:`l3-grafos#3`,front:`Por que marcar vértices visitados?`,back:`Para não visitar de novo e não entrar em loop em grafos com ciclos.`}]};export{e as default};
//# sourceMappingURL=l3-grafos-Cukit1Pw.js.map