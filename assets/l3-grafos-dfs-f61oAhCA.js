var e={id:`l3-grafos-dfs`,moduleId:`m3-5`,title:`Busca em profundidade a fundo: representações, componentes e ciclos`,titleEn:`Depth-first search in depth: representations, components and cycles`,summary:`Lista de arestas, lista e matriz de adjacência e a grade como grafo implícito; DFS recursiva, contagem de componentes conexos em O(V + E) e detecção de ciclos em grafos direcionados com três cores.`,minutes:50,objectives:[`Escolher entre lista de arestas, lista de adjacência e matriz de adjacência pelos custos de memória e de cada operação`,`Tratar uma grade (mapa, labirinto, imagem) como grafo implícito, sem montar a lista de adjacência e sem "dar a volta" nas bordas`,`Escrever a DFS recursiva e prever a ordem em que os vértices entram e saem`,`Contar componentes conexos em O(V + E), reaproveitando o mesmo conjunto de visitados`,`Detectar ciclos em grafos direcionados com três cores e explicar por que "já visitado" não basta`],skills:[`ed-grafos`,`alg-recursao`],terms:[{pt:`lista de arestas`,en:`edge list`,def:`Representação que guarda só os pares (u, v), um por aresta; é como os dados chegam de um arquivo ou banco, mas não ajuda a achar vizinhos.`},{pt:`matriz de adjacência`,en:`adjacency matrix`,def:`Tabela V × V em que a célula [u][v] indica se existe aresta de u para v; ocupa O(V²) de memória, com qualquer número de arestas.`,example:`An adjacency matrix requires Θ(V²) memory, independent of the number of edges.`},{pt:`grau`,en:`degree`,def:`Número de arestas que tocam um vértice; em grafo direcionado, separa-se grau de entrada e grau de saída.`,example:`In an undirected graph, the sum of the degrees of all vertices is twice the number of edges.`},{pt:`grafo esparso`,en:`sparse graph`,def:`Grafo com muito menos arestas que o máximo possível (E bem menor que V²); é o caso comum na prática.`},{pt:`grafo denso`,en:`dense graph`,def:`Grafo em que E é da ordem de V²; nele a matriz de adjacência deixa de ser desperdício.`},{pt:`grafo implícito`,en:`implicit graph`,def:`Grafo cujas arestas são calculadas na hora (como as 4 células vizinhas numa grade), sem ficarem guardadas em lugar nenhum.`},{pt:`componente conexo`,en:`connected component`,def:`Grupo máximo de vértices de um grafo não direcionado em que todos se alcançam.`,example:`The connected components of a graph can be found with a single pass of DFS over all vertices.`},{pt:`preenchimento por inundação`,en:`flood fill`,def:`Visitar (ou pintar) toda a região conectada a uma célula, como o balde de tinta dos editores de imagem.`},{pt:`aresta de retorno`,en:`back edge`,def:`Na DFS, aresta que aponta para um vértice ainda em andamento (cinza); num grafo direcionado, é a prova de que existe ciclo.`,example:`A directed graph is acyclic if and only if a depth-first search yields no back edges.`},{pt:`grafo acíclico direcionado`,en:`directed acyclic graph (DAG)`,def:`Grafo direcionado sem ciclos, como todo sistema de pré-requisitos ou de dependências bem feito.`,example:`A build system models tasks and their dependencies as a DAG.`},{pt:`componente fortemente conexo`,en:`strongly connected component (SCC)`,def:`Num grafo direcionado, grupo máximo de vértices em que cada um alcança todos os outros, seguindo o sentido das arestas.`,example:`Tarjan's algorithm finds all strongly connected components in a single depth-first search.`}],references:[`clrs`,`sedgewick-algs`,`mit-6006`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Na lição anterior, o grafo era sempre um dict de listas, e a DFS servia para uma coisa só: listar quem é alcançável a partir de um vértice. Problemas reais pedem mais duas decisões.

1. **Como guardar o grafo?** Os dados quase nunca chegam prontos como dict de listas. Chegam como uma tabela de pares (de um CSV ou de um banco), como uma tabela V × V ou como um mapa desenhado em grade, em que os vizinhos de cada casa nem estão escritos em lugar nenhum. A representação muda o custo de cada pergunta e pode decidir se o programa cabe ou não na memória.
2. **O que mais a DFS responde?** Quantos grupos separados existem (ilhas num mapa, grupos de amigos, bairros sem ligação de ônibus entre si) e se há **ciclo** nas dependências.

O próprio Alicerce é um grafo: o módulo de grafos exige o de árvores, que exige o de pilhas e filas. Se alguém cadastrasse por engano um pré-requisito circular ("só faça A depois de B, e B depois de A"), nenhum estudante conseguiria começar nenhum dos dois. Achar esse ciclo é trabalho para a DFS, com um detalhe que derruba muita gente: em grafo direcionado, "já visitado" **não** quer dizer "ciclo".`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`### Três formas de guardar o mesmo grafo
Quatro bairros (0 a 3) e as linhas de ônibus diretas entre eles, que valem nos dois sentidos: 0–1, 0–2, 1–2 e 2–3.

\`\`\`text
lista de arestas:     [(0, 1), (0, 2), (1, 2), (2, 3)]

lista de adjacência:  {0: [1, 2], 1: [0, 2], 2: [0, 1, 3], 3: [2]}

matriz de adjacência:      0  1  2  3
                       0 [ 0, 1, 1, 0 ]
                       1 [ 1, 0, 1, 0 ]
                       2 [ 1, 1, 0, 1 ]
                       3 [ 0, 0, 1, 0 ]
\`\`\`

- A **{{lista de arestas|edge list}}** guarda cada aresta uma vez, do jeito que o arquivo ou a tabela do banco entrega. É compacta, mas não tem índice: para achar os vizinhos de um vértice, é preciso varrer todas as arestas.
- A **lista de adjacência** (o dict de listas que você já usa) guarda, para cada vértice, os vizinhos. Num grafo não direcionado, cada aresta aparece **duas vezes**, uma na lista de cada ponta. Por isso a soma dos {{graus|degrees}} de todos os vértices é sempre 2E (o "lema do aperto de mãos": todo aperto envolve duas mãos).
- A **{{matriz de adjacência|adjacency matrix}}** é uma tabela V × V: \`m[u][v]\` vale 1 se existe aresta de u para v. Num grafo não direcionado ela é simétrica (\`m[u][v] == m[v][u]\`); com pesos, a célula guarda o peso no lugar do 1.`},{type:`table`,head:[`Operação`,`Lista de arestas`,`Lista de adjacência`,`Matriz de adjacência`],rows:[[`Memória`,`O(E)`,`O(V + E)`,`O(V²), com qualquer número de arestas`],[`Existe aresta u–v?`,`O(E)`,"O(grau(u)); O(1) em média se os vizinhos ficarem num `set`",`O(1)`],[`Listar os vizinhos de u`,`O(E)`,`O(grau(u))`,`O(V): percorre a linha inteira`],[`Inserir uma aresta`,`O(1)`,`O(1) (append)`,`O(1)`],[`BFS ou DFS no grafo todo`,`O(V · E) varrendo as arestas a cada vértice; monte antes a lista de adjacência, em O(V + E)`,`O(V + E)`,`O(V²)`]],caption:`grau(u) é o número de vizinhos de u. Nenhuma representação vence em tudo: a matriz responde "existe aresta?" num passo, mas paga O(V) para listar vizinhos e O(V²) de memória.`},{type:`md`,text:`### Esparso ou denso?
Num grafo simples (sem laços nem arestas repetidas) e não direcionado, cabem no máximo V(V − 1)/2 arestas. Quase todo grafo do mundo real fica muito longe disso: é **{{esparso|sparse}}**. Uma cidade com 20 000 cruzamentos, cada um com umas 4 ruas, tem cerca de 40 000 arestas. A lista de adjacência guarda 20 000 listas com 80 000 entradas no total; a matriz teria 400 milhões de células, 99,98% delas com zero, e passaria de 3 GB só de ponteiros numa lista de listas do Python. Pior: listar os 4 vizinhos de um cruzamento custaria 20 000 passos.

A matriz vale a pena quando o grafo é pequeno ou **{{denso|dense}}** (E da ordem de V², como uma tabela de distâncias entre as 27 capitais, em que todo par tem um valor), quando a pergunta "existe aresta u–v?" domina o programa ou quando o algoritmo trabalha naturalmente com tabelas (como o de Floyd-Warshall, que calcula a distância entre todos os pares de vértices).

### A grade é um grafo, mesmo sem arestas escritas
Mapas, labirintos e imagens costumam chegar como uma grade:

\`\`\`text
mapa = ["##..#",
        "#...#",
        "..#..",
        "....#"]
\`\`\`

Cada célula (linha, coluna) é um vértice, e os vizinhos são as células de cima, de baixo, da esquerda e da direita (diagonais só contam se o problema disser). Não é preciso montar um dict: os vizinhos são **calculados** na hora. Isso é um **{{grafo implícito|implicit graph}}**. Numa grade R × C, V = R · C e cada célula tem no máximo 4 vizinhos, então E < 2 · R · C, e BFS ou DFS custam O(R · C).

O cuidado está na borda. Em Python, \`mapa[-1]\` não dá erro: é a **última** linha. Uma busca que olha a célula de cima da linha 0 sem conferir \`0 <= linha < R\` "dá a volta" no mapa e liga a primeira linha à última, sem aviso nenhum.

### DFS recursiva: a pilha de chamadas faz o trabalho
\`\`\`python
def dfs(g, v, visitados):
    visitados.add(v)              # v ENTRA (pré-ordem)
    for w in g[v]:
        if w not in visitados:
            dfs(g, w, visitados)
    # aqui v SAI (pós-ordem): tudo o que foi descoberto a partir dele já terminou
\`\`\`

A recursão usa a pilha de chamadas no lugar da pilha explícita da lição anterior. As duas versões são DFS e custam O(V + E), mas a recursiva entrega de graça um momento que a outra esconde: o instante em que um vértice **sai**, depois de todos os que foram descobertos a partir dele. São as mesmas ideias de pré-ordem e pós-ordem dos percursos de árvore, e é a saída que permite detectar ciclos (e, no Nível 4, fazer a ordenação topológica).`},{type:`callout`,tone:`warn`,text:"Python limita a profundidade da recursão: o padrão é 1000 chamadas (veja `sys.getrecursionlimit()`). Uma DFS recursiva num caminho com 5 000 vértices cai com `RecursionError`, e num mapa 100 × 100 todo de terra ela pode cair também. Aumentar o limite com `sys.setrecursionlimit` é remendo: você precisa adivinhar um número que sirva para qualquer entrada, cada chamada pendente ocupa memória e, em versões antigas do Python (até a 3.10), passar do que a pilha da máquina aguenta derruba o programa inteiro, sem nem um `RecursionError` para tratar. Em grafos de tamanho desconhecido, use a pilha explícita (ou uma BFS).",title:`O limite de recursão do Python`},{type:`md`,text:`### Componentes conexos
Um {{componente conexo|connected component}} é um grupo máximo de vértices que se alcançam (num grafo não direcionado). Para contá-los, percorra os vértices e comece uma DFS em cada um que ainda não foi visitado: cada início inaugura um grupo novo, e a DFS marca o grupo inteiro.

\`\`\`python
def contar_componentes(g):
    visitados = set()
    total = 0
    for v in g:
        if v not in visitados:
            total += 1                # v inaugura um grupo novo...
            dfs(g, v, visitados)      # ...e a DFS marca o grupo inteiro
    return total
\`\`\`

Parece uma DFS dentro de um laço, ou seja, O(V · (V + E)). Não é: o conjunto \`visitados\` é **compartilhado**, então cada vértice é marcado uma única vez e cada lista de vizinhos é percorrida uma única vez, somando todas as DFS. O total é O(V + E). Na grade, o mesmo laço conta ilhas: é o {{preenchimento por inundação|flood fill}}, o "balde de tinta" dos editores de imagem.

Dois descuidos comuns ao montar \`g\` a partir de uma lista de arestas: esquecer o sentido de volta num grafo não direcionado (aí a DFS de um lado não enxerga o outro) e esquecer os vértices **isolados**, que não aparecem em nenhuma aresta e por isso não viram chave do dict, mas são, cada um, um componente.

### Ciclos: por que "já visitado" não basta
Num grafo **não direcionado** e simples, há ciclo quando a DFS encontra um vizinho já visitado que **não** é o vértice de onde ela acabou de vir.

Num grafo **direcionado**, esse teste dá alarme falso. Pense em pré-requisitos em forma de losango: Física 2 exige Física 1 e Cálculo 2, e os dois exigem Cálculo 1. A DFS que parte de Física 2 chega a Cálculo 1 por Física 1, volta, desce por Cálculo 2 e encontra Cálculo 1 já visitado. Não há ciclo nenhum: Cálculo 1 já tinha **terminado**. Só existe ciclo se a aresta aponta para um vértice que ainda está **em andamento**, isto é, no caminho atual da recursão. Essa aresta se chama {{aresta de retorno|back edge}}, e a DFS de ciclos distingue os três estados com cores:`},{type:`table`,head:[`Cor de w ao olhar a aresta v → w`,`Significado`,`O que fazer`],rows:[[`branco`,`w ainda não foi descoberto`,`descer para w`],[`cinza`,`w entrou e ainda não saiu: está no caminho atual, entre o início da DFS e v`,`**ciclo**: w alcança v e v → w fecha a volta (aresta de retorno)`],[`preto`,`w já saiu: tudo o que ele alcança foi explorado, sem ciclo`,`ignorar (é o Cálculo 1 do losango)`]],caption:`Um vértice fica cinza ao entrar e preto ao sair. Um grafo direcionado tem ciclo se e somente se a DFS encontra uma aresta de retorno.`},{type:`md`,text:`Com as cores, a busca de ciclos custa O(V + E), como qualquer DFS. Só não esqueça de começar uma DFS em **todo** vértice ainda branco: o ciclo pode estar numa parte do grafo que não é alcançável a partir do primeiro vértice. Um grafo direcionado sem ciclos tem nome próprio, {{grafo acíclico direcionado|directed acyclic graph (DAG)}}, e é o formato que todo sistema de pré-requisitos, de dependências de pacotes ou de etapas de um build precisa ter.`},{type:`callout`,tone:`deep`,text:`- **Componentes em grafos direcionados.** Ali, "todos se alcançam" exige ida **e** volta. Esses grupos são os {{componentes fortemente conexos|strongly connected components}}, achados com duas DFS (algoritmo de Kosaraju) ou com uma só (Tarjan), ainda em O(V + E).
- **Ordem de estudo.** Com as arestas no sentido "disciplina → o que ela exige", um vértice só sai depois de tudo o que ele exige. Então, num DAG, a própria **ordem de saída** da DFS já é uma ordem de estudo possível. Isso é a ordenação topológica, assunto do Nível 4.`,title:`Aprofundando`}]},{stage:`exemplo`,blocks:[{type:`md`,text:`Os pré-requisitos ficam num dict "disciplina → lista do que ela exige". É o losango da explicação: FIS1 e FIS2 são Física 1 e 2; CAL1 e CAL2, Cálculo 1 e 2. A DFS começa em FIS2. Acompanhe as cores e o **caminho atual**, que é exatamente a lista dos vértices cinza, do mais antigo para o mais recente.

\`\`\`text
exige = {"FIS2": ["FIS1", "CAL2"],
         "FIS1": ["CAL1"],
         "CAL2": ["CAL1"],
         "CAL1": []}
\`\`\``},{type:`table`,head:[`Passo`,`O que acontece`,`Caminho atual (cinzas)`,`Pretos`],rows:[[`1`,`entra FIS2`,`FIS2`,`—`],[`2`,`FIS2 → FIS1: branco, desce; entra FIS1`,`FIS2, FIS1`,`—`],[`3`,`FIS1 → CAL1: branco, desce; entra CAL1`,`FIS2, FIS1, CAL1`,`—`],[`4`,`CAL1 não exige nada: sai CAL1`,`FIS2, FIS1`,`CAL1`],[`5`,`FIS1 não tem mais vizinhos: sai FIS1`,`FIS2`,`CAL1, FIS1`],[`6`,`FIS2 → CAL2: branco, desce; entra CAL2`,`FIS2, CAL2`,`CAL1, FIS1`],[`7`,`CAL2 → CAL1: CAL1 é **preto**, não é ciclo (o teste "já visitado" daria alarme falso aqui)`,`FIS2, CAL2`,`CAL1, FIS1`],[`8`,`sai CAL2; sai FIS2. Nenhuma aresta de retorno: não há ciclo`,`—`,`CAL1, FIS1, CAL2, FIS2`]],caption:`Ordem de saída: CAL1, FIS1, CAL2, FIS2. É uma ordem de estudo possível: cada disciplina sai depois de tudo o que ela exige.`},{type:`md`,text:`Agora alguém cadastra por engano que CAL1 exige FIS2. Os passos 1 a 3 se repetem, mas no passo 4 CAL1 tem um vizinho para olhar:

- **CAL1 → FIS2**: FIS2 é **cinza**, está no caminho atual (FIS2, FIS1, CAL1). Aresta de retorno: há ciclo.
- O ciclo é o trecho do caminho que **começa em FIS2**, fechado pela aresta que acabou de ser encontrada: FIS2 → FIS1 → CAL1 → FIS2.

Se o caminho atual tivesse vértices antes de FIS2 (por exemplo, se a DFS tivesse começado numa disciplina que exige FIS2), eles **não** fariam parte do ciclo.`}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`# Cinco bairros e as linhas de ônibus diretas entre eles (valem nos dois sentidos)
n = 5
arestas = [(0, 1), (0, 2), (1, 2), (3, 4)]

adj = {v: [] for v in range(n)}          # todos os vértices, até os isolados
mat = [[0] * n for _ in range(n)]        # cuidado: [[0] * n] * n repetiria a MESMA linha
for u, v in arestas:
    adj[u].append(v)
    adj[v].append(u)                     # não direcionado: os dois sentidos
    mat[u][v] = mat[v][u] = 1

print("lista:", adj)
print("matriz:")
for linha in mat:
    print("  ", linha)
print("1 e 2 vizinhos?", mat[1][2] == 1, "| vizinhos de 2:", adj[2])
print("soma dos graus:", sum(len(vs) for vs in adj.values()), "= 2 x", len(arestas), "arestas")

def dfs(g, v, visitados, grupo):
    visitados.add(v)
    grupo.append(v)
    for w in g[v]:
        if w not in visitados:
            dfs(g, w, visitados, grupo)

def componentes(g):
    visitados, grupos = set(), []
    for v in g:
        if v not in visitados:           # v inaugura um grupo novo
            grupo = []
            dfs(g, v, visitados, grupo)
            grupos.append(grupo)
    return grupos

print("componentes:", componentes(adj))

BRANCO, CINZA, PRETO = 0, 1, 2

def tem_ciclo(g):
    cor = {v: BRANCO for v in g}
    def visitar(v):
        cor[v] = CINZA                   # entrou: está no caminho atual
        for w in g[v]:
            if cor[w] == CINZA:          # aresta de retorno
                return True
            if cor[w] == BRANCO and visitar(w):
                return True
        cor[v] = PRETO                   # saiu: tudo abaixo dele foi explorado
        return False
    return any(cor[v] == BRANCO and visitar(v) for v in g)

exige = {"FIS2": ["FIS1", "CAL2"], "FIS1": ["CAL1"], "CAL2": ["CAL1"], "CAL1": []}
print("ciclo?", tem_ciclo(exige))
exige["CAL1"].append("FIS2")             # o cadastro errado
print("ciclo depois do erro?", tem_ciclo(exige))`,runnable:!0,caption:`A matriz gasta 25 células para 4 arestas; a lista, 8 entradas. Os dois testes de ciclo reproduzem o exemplo: o losango não tem ciclo; com o cadastro errado, tem.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e3-dfs-1`,kind:`mcq`,prompt:`Um app de mobilidade modela uma cidade com 50 000 cruzamentos (vértices) e cerca de 120 000 trechos de rua (arestas). O programa roda BFS e DFS o tempo todo. Qual representação usar?`,difficulty:`facil`,skills:[`ed-grafos`],hints:[`Quantas células teria uma tabela 50 000 × 50 000? Quantas delas seriam diferentes de zero?`,`Numa BFS, que pergunta se repete para cada vértice que sai da fila? Quanto ela custa em cada representação?`],explanation:`BFS e DFS perguntam o tempo todo "quem são os vizinhos de v?". Na lista de adjacência isso custa O(grau(v)), o percurso inteiro fica O(V + E) e a memória também: 50 000 listas com até 240 000 entradas (um trecho de mão dupla aparece na lista das duas pontas). A matriz gastaria 2,5 bilhões de células (mais de 99,99% com zero) e O(V) para listar os vizinhos de cada cruzamento; a lista de arestas exigiria varrer as 120 000 arestas para achar os vizinhos de um único vértice.`,options:[{text:`Matriz de adjacência, porque responde "existe rua entre u e v?" em O(1)`,feedback:`O(1) para essa pergunta, sim, mas não é ela que a BFS faz. A matriz teria 50 000² = 2,5 bilhões de células, e listar os vizinhos de um cruzamento custaria 50 000 passos mesmo que ele tenha 4 ruas: a BFS ficaria O(V²).`},{text:`Lista de adjacência (dict de vértice → vizinhos)`,correct:!0,feedback:`Isso: memória O(V + E) e vizinhos em O(grau), então BFS e DFS custam O(V + E). É a escolha padrão para grafos esparsos.`},{text:`Lista de arestas, porque é a mais compacta`,feedback:`Compacta ela é (O(E)), mas não tem índice: achar os vizinhos de um vértice exige varrer as 120 000 arestas. Ela serve para ler os dados; em seguida, monte a lista de adjacência em O(V + E).`},{text:`Tanto faz: as três ocupam O(V + E)`,feedback:`A matriz ocupa O(V²), seja qual for o número de arestas: 2,5 bilhões de células aqui. E o custo de listar vizinhos muda muito de uma representação para outra.`}]}},{type:`exercise`,exercise:{id:`e3-dfs-2`,kind:`predict`,lang:`python`,prompt:`A DFS recursiva abaixo anota quando cada vértice **entra** e quando **sai**. O que é impresso?`,difficulty:`intermediario`,skills:[`ed-grafos`,`alg-recursao`],hints:[`Quando dfs("B") é chamada, a chamada de A fica parada esperando. O que precisa acontecer para ela continuar?`,`Um vértice só sai depois que todos os vizinhos dele foram resolvidos: ou já estavam visitados, ou entraram e saíram.`,`Quando C olha para D, D já foi visitado? E quando E olha para A?`],explanation:`A entra primeiro e sai por último: a chamada dele só termina quando tudo o que foi descoberto a partir dele terminou. D sai antes mesmo de C entrar, porque foi alcançado por B. A aresta E → A encontra A ainda em andamento: é uma aresta de retorno, e o grafo tem o ciclo A → C → E → A. A ordem de entrada é a pré-ordem; a de saída, a pós-ordem.`,code:`g = {"A": ["B", "C"], "B": ["D"], "C": ["D", "E"], "D": [], "E": ["A"]}
entrada, saida = [], []
visitados = set()

def dfs(v):
    visitados.add(v)
    entrada.append(v)
    for w in g[v]:
        if w not in visitados:
            dfs(w)
    saida.append(v)

dfs("A")
print(" ".join(entrada))
print(" ".join(saida))`,answer:`A B D C E
D B E C A`}},{type:`exercise`,exercise:{id:`e3-dfs-3`,kind:`code`,lang:`python`,prompt:'Uma imagem de satélite virou uma grade: `"#"` é terra e `"."` é água. Escreva `contar_ilhas(mapa)`, que recebe uma lista de strings (todas do mesmo tamanho) e devolve quantas ilhas existem. Uma ilha é um grupo de células de terra ligadas por cima, por baixo, pela esquerda ou pela direita (diagonal **não** liga). O mapa pode ser vazio (`[]`) ou grande (70 × 70) e não deve ser modificado. Não mexa no limite de recursão do Python (`sys.setrecursionlimit`).',difficulty:`intermediario`,skills:[`ed-grafos`],hints:[`Quem é o vértice e quem são os vizinhos dele? Você precisa montar um dict para isso?`,`Percorra todas as células. Ao achar terra ainda não visitada, quantas ilhas novas isso significa? E o que fazer com o resto dessa ilha, para não contá-la de novo?`,"Antes de olhar uma célula vizinha, confira se a linha e a coluna estão dentro do mapa. O que `mapa[-1]` devolve em Python?",`Se o teste do mapa grande der RecursionError, troque a recursão por uma pilha explícita (uma lista com append e pop).`],explanation:'É a contagem de componentes conexos num grafo implícito: cada terra não visitada inaugura uma ilha, e uma DFS (ou BFS) a partir dela marca a ilha inteira. Como o conjunto de visitados é compartilhado, cada célula é marcada uma vez, e o custo é O(R · C). Os testes pegam os dois erros mais comuns: índices negativos que "dão a volta" no mapa (o `#` da coluna 0 vira vizinho do `#` da última coluna) e recursão funda demais num mapa grande, que estoura o limite de 1000 chamadas do Python.',starter:`def contar_ilhas(mapa):
    # mapa: lista de strings do mesmo tamanho; "#" é terra e "." é água
    # devolva quantos grupos de "#" ligados por cima, baixo, esquerda ou direita existem
    pass`,solution:`def contar_ilhas(mapa):
    linhas = len(mapa)
    colunas = len(mapa[0]) if mapa else 0
    visitados = set()
    ilhas = 0
    for l in range(linhas):
        for c in range(colunas):
            if mapa[l][c] == "#" and (l, c) not in visitados:
                ilhas += 1
                visitados.add((l, c))
                pilha = [(l, c)]
                while pilha:
                    a, b = pilha.pop()
                    for na, nb in ((a - 1, b), (a + 1, b), (a, b - 1), (a, b + 1)):
                        if 0 <= na < linhas and 0 <= nb < colunas and mapa[na][nb] == "#" and (na, nb) not in visitados:
                            visitados.add((na, nb))
                            pilha.append((na, nb))
    return ilhas`,tests:[{name:`mapa da lição`,code:`_m = ["##..#",
      "#...#",
      "..#..",
      "....#"]
_r = contar_ilhas(_m)
assert _r == 4, f"o mapa da lição tem 4 ilhas; sua função devolveu {_r}"`},{name:`diagonal não liga; o U é uma ilha só`,code:`_r = contar_ilhas(["#.", ".#"])
assert _r == 2, f'["#.", ".#"]: células que só se tocam na diagonal são ilhas separadas (esperado 2, veio {_r})'
_r = contar_ilhas(["#.#", "###"])
assert _r == 1, f'["#.#", "###"] é uma ilha só: as pontas do U se ligam pela linha de baixo (veio {_r})'`},{name:`as bordas não dão a volta`,code:`_r = contar_ilhas(["#..#"])
assert _r == 2, f'["#..#"] tem 2 ilhas, veio {_r}. Em Python, a coluna -1 é a última coluna: confira os limites antes de olhar o vizinho'
_r = contar_ilhas(["#", ".", "#"])
assert _r == 2, f'["#", ".", "#"] tem 2 ilhas, veio {_r}. Em Python, a linha -1 é a última linha: confira 0 <= linha < número de linhas'
_r = contar_ilhas(["#.#", "...", "###"])
assert _r == 3, f'["#.#", "...", "###"] tem 3 ilhas, veio {_r}. Um try/except IndexError não protege dos índices negativos: confira 0 <= linha e 0 <= coluna antes de olhar o vizinho'`},{name:`mapas pequenos e vazios`,code:`assert contar_ilhas([]) == 0, "mapa vazio: 0 ilhas"
assert contar_ilhas(["...."]) == 0, "só água: 0 ilhas"
assert contar_ilhas(["#"]) == 1, "uma célula de terra já é uma ilha"
assert contar_ilhas(["###", "###"]) == 1, "tudo terra: 1 ilha"`},{name:`não altera o mapa`,code:`_m = ["#.#", ".#.", "#.#"]
_copia = list(_m)
_r = contar_ilhas(_m)
assert _r == 5, f'["#.#", ".#.", "#.#"] tem 5 ilhas (nenhuma terra encosta em outra por um lado); veio {_r}'
assert _m == _copia, "não modifique o mapa recebido: marque as células visitadas num set"`},{name:`tabuleiro de xadrez 20 × 20`,code:`_xadrez = ["".join("#" if (l + c) % 2 == 0 else "." for c in range(20)) for l in range(20)]
_r = contar_ilhas(_xadrez)
assert _r == 200, f"num tabuleiro 20 x 20, as 200 casas de terra só se tocam na diagonal: 200 ilhas; veio {_r}"`},{name:`mapa grande (70 × 70) todo de terra`,code:`assert "setrecursionlimit" not in _source, "não aumente o limite de recursão: troque a recursão por uma pilha explícita, que funciona para mapas de qualquer tamanho"
_r = contar_ilhas(["#" * 70 for _ in range(70)])
assert _r == 1, f"o mapa 70 x 70 todo de terra é uma ilha só; veio {_r}"`},{name:`200 mapas aleatórios`,code:`from collections import deque

def _ref_ilhas(m):
    R = len(m)
    C = len(m[0]) if m else 0
    vis = set()
    total = 0
    for l in range(R):
        for c in range(C):
            if m[l][c] == "#" and (l, c) not in vis:
                total += 1
                vis.add((l, c))
                fila = deque([(l, c)])
                while fila:
                    a, b = fila.popleft()
                    for x, y in ((a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1)):
                        if 0 <= x < R and 0 <= y < C and m[x][y] == "#" and (x, y) not in vis:
                            vis.add((x, y))
                            fila.append((x, y))
    return total
import random
_rng = random.Random(7)
for _ in range(200):
    _R, _C = _rng.randint(1, 7), _rng.randint(1, 7)
    _m = ["".join(_rng.choice("#.") for _ in range(_C)) for _ in range(_R)]
    _esperado = _ref_ilhas(_m)
    _r = contar_ilhas(_m)
    assert _r == _esperado, f"contar_ilhas({_m}) devolveu {_r}; esperado {_esperado}"`}]}},{type:`exercise`,exercise:{id:`e3-dfs-4`,kind:`fix`,lang:`python`,prompt:"A prefeitura guarda numa **matriz de adjacência** quais bairros têm linha de ônibus direta entre si: `m[i][j] == 1` quando i e j estão ligados (a matriz é simétrica). A função `contar_grupos(m)` deveria devolver quantos grupos de bairros existem, sendo que dentro de um grupo dá para ir de qualquer bairro a qualquer outro, com baldeações. Ela acerta alguns mapas por coincidência, erra outros e às vezes quebra com erro. Encontre e corrija o defeito.",difficulty:`intermediario`,skills:[`ed-grafos`],hints:["Numa lista de adjacência, `g[x]` é a lista de vizinhos de x. E o que é `m[x]` numa matriz?","Imprima o que `for y in m[x]` produz para a linha `[0, 0, 1, 0]`. Esses valores são bairros?",`Os vizinhos de x são as posições da linha que valem 1. Como percorrer as posições (os índices) de uma linha?`],explanation:"Na matriz, a linha `m[x]` não lista vizinhos: ela tem V posições com 0 ou 1, e o vizinho é o **índice** de cada posição que vale 1. O código tratava os valores 0 e 1 como se fossem os bairros 0 e 1; por isso acertava alguns mapas por acaso e, numa matriz 1 × 1 com `m[0][0] == 1`, tentava visitar um bairro 1 que não existe. Corrigido, o laço percorre a linha inteira de cada vértice: a busca custa O(V²), e não O(V + E). É o preço da matriz, que compensa quando o grafo é pequeno ou denso.",starter:`def contar_grupos(m):
    """m: matriz de adjacência (lista de listas de 0 e 1) de um grafo não direcionado."""
    n = len(m)
    visitados = set()
    grupos = 0
    for v in range(n):
        if v not in visitados:
            grupos += 1
            visitados.add(v)
            pilha = [v]
            while pilha:
                x = pilha.pop()
                for y in m[x]:
                    if y not in visitados:
                        visitados.add(y)
                        pilha.append(y)
    return grupos`,solution:`def contar_grupos(m):
    """m: matriz de adjacência (lista de listas de 0 e 1) de um grafo não direcionado."""
    n = len(m)
    visitados = set()
    grupos = 0
    for v in range(n):
        if v not in visitados:
            grupos += 1
            visitados.add(v)
            pilha = [v]
            while pilha:
                x = pilha.pop()
                for y in range(n):
                    if m[x][y] == 1 and y not in visitados:
                        visitados.add(y)
                        pilha.append(y)
    return grupos`,tests:[{name:`dois bairros isolados e um par`,code:`_m = [[0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 1],
      [0, 0, 1, 0]]
_r = contar_grupos(_m)
assert _r == 3, f"os bairros 0 e 1 estão isolados e 2-3 formam um par: 3 grupos; veio {_r}"`},{name:`uma cadeia e um par`,code:`_m = [[0, 1, 0, 0, 0],
      [1, 0, 1, 0, 0],
      [0, 1, 0, 0, 0],
      [0, 0, 0, 0, 1],
      [0, 0, 0, 1, 0]]
_r = contar_grupos(_m)
assert _r == 2, f"0-1-2 e 3-4 são 2 grupos; veio {_r}"
_m = [[0, 0, 1],
      [0, 0, 1],
      [1, 1, 0]]
_r = contar_grupos(_m)
assert _r == 1, f"0 e 1 se ligam com baldeação no 2 (ligações 0-2 e 1-2): 1 grupo; veio {_r}. Percorra a linha inteira de cada bairro, não só as colunas depois dele"`},{name:`casos de borda`,code:`assert contar_grupos([]) == 0, "sem bairros, 0 grupos"
assert contar_grupos([[0]]) == 1, "um bairro sozinho é um grupo"
assert contar_grupos([[1]]) == 1, "um bairro com linha circular (m[0][0] == 1) continua sendo 1 grupo"
assert contar_grupos([[0, 0, 0], [0, 0, 0], [0, 0, 0]]) == 3, "três bairros sem nenhuma ligação são 3 grupos"
_todos = [[0, 1, 1, 1], [1, 0, 1, 1], [1, 1, 0, 1], [1, 1, 1, 0]]
assert contar_grupos(_todos) == 1, "todos ligados a todos: 1 grupo"`},{name:`200 matrizes aleatórias`,code:`import random
def _ref_grupos(m):
    n = len(m)
    rot = list(range(n))
    for i in range(n):
        for j in range(n):
            if m[i][j] == 1 and rot[i] != rot[j]:
                velho, novo = rot[j], rot[i]
                rot = [novo if r == velho else r for r in rot]
    return len(set(rot))
_rng = random.Random(21)
for _ in range(200):
    _n = _rng.randint(0, 9)
    _m = [[0] * _n for _ in range(_n)]
    for _i in range(_n):
        for _j in range(_i + 1, _n):
            if _rng.random() < 0.2:
                _m[_i][_j] = _m[_j][_i] = 1
    _esperado = _ref_grupos(_m)
    _r = contar_grupos(_m)
    assert _r == _esperado, f"contar_grupos({_m}) devolveu {_r}; esperado {_esperado}"`}]}},{type:`exercise`,exercise:{id:`e3-dfs-5`,kind:`mcq`,prompt:`Uma colega escreveu esta detecção de ciclos para pré-requisitos (grafo direcionado), usando só um conjunto de visitados. Para qual destes grafos ela dá a resposta **errada**?`,difficulty:`avancado`,skills:[`ed-grafos`,`alg-recursao`],code:{lang:`python`,code:`def tem_ciclo(g):
    visitados = set()
    def dfs(v):
        visitados.add(v)
        for w in g[v]:
            if w in visitados:
                return True
            if dfs(w):
                return True
        return False
    return any(v not in visitados and dfs(v) for v in g)`},hints:[`Em cada opção, existe ciclo de verdade? Depois, siga o código e veja o que ele responde.`,`Ao encontrar um vizinho já visitado, o código não pergunta se ele ainda está em andamento ou se já terminou. Em qual das opções a DFS pode reencontrar um vértice que já terminou, sem que exista ciclo?`],explanation:`No losango, D é alcançado por B e depois por C. Quando C olha para D, D já terminou: não existe caminho de D de volta para C. O código, que só sabe "visitado ou não", acusa ciclo. Com três cores, só uma aresta para um vértice cinza (em andamento) prova ciclo; D seria preto. Nos outros grafos o código acerta: o triângulo e o laço A → A têm ciclo de verdade, e no caminho A → B → C, percorrido a partir de A, ninguém é reencontrado.`,options:[{text:'`{"A": ["B"], "B": ["C"], "C": ["A"]}`',feedback:`Aqui há ciclo de verdade (A → B → C → A), e o código responde True: acerta.`},{text:'`{"A": ["B", "C"], "B": ["D"], "C": ["D"], "D": []}`',correct:!0,feedback:`Isso: quando C olha para D, D já foi visitado (por B) e já terminou. Não há ciclo, mas o código responde True.`},{text:'`{"A": ["B"], "B": ["C"], "C": []}`',feedback:`A DFS começa em A, desce até C e nunca reencontra um vértice: o código responde False, que está certo.`},{text:'`{"A": ["A"]}`',feedback:`Um laço é um ciclo de tamanho 1. Ao olhar A → A, o código encontra A visitado e responde True: acerta.`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e3-dfs-desafio`,kind:`code`,lang:`python`,prompt:'Antes de publicar a grade de um curso, a coordenação quer um verificador que, além de avisar que existe um pré-requisito circular, **mostre** qual é. Escreva `encontrar_ciclo(g)`: `g` é um dict "disciplina → lista do que ela exige" (grafo direcionado). Devolva uma lista `[v1, v2, ..., vk]` de vértices distintos em que v1 → v2 → ... → vk → v1 são arestas do grafo (um laço A → A vira `["A"]`), ou `None` se não houver ciclo. Atenção: uma disciplina pode aparecer só como pré-requisito, sem ser chave do dict (ela não exige nada). A busca deve custar O(V + E): os testes incluem grafos com muitos caminhos diferentes até os mesmos vértices.',difficulty:`desafio`,skills:[`ed-grafos`,`alg-recursao`],hints:[`Quando a DFS encontra uma aresta para um vértice cinza, onde estão os outros vértices do ciclo?`,`Mantenha, junto com as cores, uma lista com o caminho atual: o vértice entra no fim dela quando fica cinza e sai do fim quando fica preto.`,`Ao achar a aresta v → w com w cinza, o ciclo é um pedaço do caminho. Onde esse pedaço começa? Cuidado: pode haver vértices antes de w no caminho que não fazem parte do ciclo.`,"Use `g.get(v, [])` para quem não é chave, e comece uma DFS em todo vértice ainda branco."],explanation:`Os vértices cinza formam, em ordem, o caminho do início da DFS até o vértice atual. Uma aresta v → w com w cinza diz que w está nesse caminho, antes de v: o trecho de w até v, fechado pela aresta v → w, é um ciclo. O que vem antes de w no caminho não faz parte dele (no teste A → B → C → D → B, o A fica de fora). O custo é O(V + E), mais O(V) para recortar o ciclo uma única vez. Sem ciclo, a ordem de saída da mesma DFS seria uma ordem de estudo válida: a ordenação topológica do Nível 4.`,starter:`def encontrar_ciclo(g):
    # g: dict disciplina -> lista de disciplinas que ela exige (grafo direcionado)
    # devolva [v1, ..., vk] com v1 -> v2 -> ... -> vk -> v1, sem repetir vértices,
    # ou None se não houver ciclo
    pass`,solution:`def encontrar_ciclo(g):
    BRANCO, CINZA, PRETO = 0, 1, 2
    cor = {}
    caminho = []                          # os cinzas, na ordem em que entraram

    def visitar(v):
        cor[v] = CINZA
        caminho.append(v)
        for w in g.get(v, []):
            estado = cor.get(w, BRANCO)
            if estado == CINZA:           # aresta de retorno: achou
                return caminho[caminho.index(w):]
            if estado == BRANCO:
                ciclo = visitar(w)
                if ciclo:
                    return ciclo
        caminho.pop()
        cor[v] = PRETO
        return None

    for v in list(g):
        if cor.get(v, BRANCO) == BRANCO:
            ciclo = visitar(v)
            if ciclo:
                return ciclo
    return None`,tests:[{name:`exemplo da lição`,code:`def _problema(g, c):
    if c is None:
        return "veio None, mas o grafo tem ciclo"
    if not isinstance(c, list) or not c:
        return f"veio {c!r}; esperado uma lista não vazia de vértices"
    try:
        repetidos = len(set(c)) != len(c)
    except TypeError:
        return f"veio {c!r}; a lista deve conter os próprios vértices"
    if repetidos:
        return f"{c} repete vértices: cada um aparece uma vez só (não repita o primeiro no fim)"
    for i in range(len(c)):
        a, b = c[i], c[(i + 1) % len(c)]
        if b not in g.get(a, []):
            return f"{c} não é um ciclo deste grafo: {a} -> {b} não é aresta"
    return ""

def _valido(g, c):
    return _problema(g, c) == ""

def _tem_ciclo_ref(g):
    vs = set(g) | {w for ws in g.values() for w in ws}
    grau = {v: 0 for v in vs}
    for v in g:
        for w in g[v]:
            grau[w] += 1
    livres = [v for v in vs if grau[v] == 0]
    vistos = 0
    while livres:
        v = livres.pop()
        vistos += 1
        for w in g.get(v, []):
            grau[w] -= 1
            if grau[w] == 0:
                livres.append(w)
    return vistos < len(vs)
_g = {"FIS2": ["FIS1", "CAL2"], "FIS1": ["CAL1"], "CAL2": ["CAL1"], "CAL1": ["FIS2"]}
_c = encontrar_ciclo(_g)
assert _valido(_g, _c), f"{_problema(_g, _c)}. Esperado algo como ['FIS2', 'FIS1', 'CAL1']"`},{name:`sem ciclo`,code:`_r = encontrar_ciclo({"A": ["B", "C"], "B": ["D"], "C": ["D"], "D": []})
assert _r is None, f"o losango não tem ciclo (D é alcançado por dois caminhos, mas nunca volta); veio {_r}"
assert encontrar_ciclo({}) is None, "grafo vazio: None"
assert encontrar_ciclo({"A": []}) is None, "um vértice sem arestas: None"
_r = encontrar_ciclo({"A": ["B"], "B": ["C"]})
assert _r is None, f"A -> B -> C não tem ciclo (e C não é chave do dict); veio {_r}"`},{name:`laços`,code:`_r = encontrar_ciclo({"A": ["A"]})
assert _r == ["A"], f"A -> A é um ciclo de tamanho 1: esperado ['A'], veio {_r}"
_r = encontrar_ciclo({"A": ["B"], "B": ["B"]})
assert _r == ["B"], f"o único ciclo é o laço B -> B (A não faz parte dele): esperado ['B'], veio {_r}"`},{name:`o ciclo não começa no início da DFS`,code:`def _problema(g, c):
    if c is None:
        return "veio None, mas o grafo tem ciclo"
    if not isinstance(c, list) or not c:
        return f"veio {c!r}; esperado uma lista não vazia de vértices"
    try:
        repetidos = len(set(c)) != len(c)
    except TypeError:
        return f"veio {c!r}; a lista deve conter os próprios vértices"
    if repetidos:
        return f"{c} repete vértices: cada um aparece uma vez só (não repita o primeiro no fim)"
    for i in range(len(c)):
        a, b = c[i], c[(i + 1) % len(c)]
        if b not in g.get(a, []):
            return f"{c} não é um ciclo deste grafo: {a} -> {b} não é aresta"
    return ""

def _valido(g, c):
    return _problema(g, c) == ""

def _tem_ciclo_ref(g):
    vs = set(g) | {w for ws in g.values() for w in ws}
    grau = {v: 0 for v in vs}
    for v in g:
        for w in g[v]:
            grau[w] += 1
    livres = [v for v in vs if grau[v] == 0]
    vistos = 0
    while livres:
        v = livres.pop()
        vistos += 1
        for w in g.get(v, []):
            grau[w] -= 1
            if grau[w] == 0:
                livres.append(w)
    return vistos < len(vs)
_g = {"A": ["B"], "B": ["C"], "C": ["D"], "D": ["B"]}
_c = encontrar_ciclo(_g)
assert _valido(_g, _c), f"{_problema(_g, _c)}. O ciclo é B -> C -> D -> B; o A só leva até ele e não faz parte do ciclo"`},{name:`ciclo em outra parte do grafo e vértice só como vizinho`,code:`def _problema(g, c):
    if c is None:
        return "veio None, mas o grafo tem ciclo"
    if not isinstance(c, list) or not c:
        return f"veio {c!r}; esperado uma lista não vazia de vértices"
    try:
        repetidos = len(set(c)) != len(c)
    except TypeError:
        return f"veio {c!r}; a lista deve conter os próprios vértices"
    if repetidos:
        return f"{c} repete vértices: cada um aparece uma vez só (não repita o primeiro no fim)"
    for i in range(len(c)):
        a, b = c[i], c[(i + 1) % len(c)]
        if b not in g.get(a, []):
            return f"{c} não é um ciclo deste grafo: {a} -> {b} não é aresta"
    return ""

def _valido(g, c):
    return _problema(g, c) == ""

def _tem_ciclo_ref(g):
    vs = set(g) | {w for ws in g.values() for w in ws}
    grau = {v: 0 for v in vs}
    for v in g:
        for w in g[v]:
            grau[w] += 1
    livres = [v for v in vs if grau[v] == 0]
    vistos = 0
    while livres:
        v = livres.pop()
        vistos += 1
        for w in g.get(v, []):
            grau[w] -= 1
            if grau[w] == 0:
                livres.append(w)
    return vistos < len(vs)
_g = {"A": ["B"], "B": [], "X": ["Y"], "Y": ["Z"], "Z": ["X"]}
_c = encontrar_ciclo(_g)
assert _valido(_g, _c), f"{_problema(_g, _c)}. O ciclo X -> Y -> Z -> X não é alcançável a partir de A: comece uma DFS em todo vértice branco"
_g = {"A": ["B"], "B": ["C", "A"]}
_c = encontrar_ciclo(_g)
assert _valido(_g, _c), f"{_problema(_g, _c)}. A -> B -> A é um ciclo, e C não é chave do dict"`},{name:`300 grafos aleatórios`,code:`def _problema(g, c):
    if c is None:
        return "veio None, mas o grafo tem ciclo"
    if not isinstance(c, list) or not c:
        return f"veio {c!r}; esperado uma lista não vazia de vértices"
    try:
        repetidos = len(set(c)) != len(c)
    except TypeError:
        return f"veio {c!r}; a lista deve conter os próprios vértices"
    if repetidos:
        return f"{c} repete vértices: cada um aparece uma vez só (não repita o primeiro no fim)"
    for i in range(len(c)):
        a, b = c[i], c[(i + 1) % len(c)]
        if b not in g.get(a, []):
            return f"{c} não é um ciclo deste grafo: {a} -> {b} não é aresta"
    return ""

def _valido(g, c):
    return _problema(g, c) == ""

def _tem_ciclo_ref(g):
    vs = set(g) | {w for ws in g.values() for w in ws}
    grau = {v: 0 for v in vs}
    for v in g:
        for w in g[v]:
            grau[w] += 1
    livres = [v for v in vs if grau[v] == 0]
    vistos = 0
    while livres:
        v = livres.pop()
        vistos += 1
        for w in g.get(v, []):
            grau[w] -= 1
            if grau[w] == 0:
                livres.append(w)
    return vistos < len(vs)
import random
_rng = random.Random(13)
for _ in range(300):
    _n = _rng.randint(1, 8)
    _vs = [f"d{i}" for i in range(_n)]
    _g = {}
    for _v in _vs:
        if _rng.random() < 0.85:
            _g[_v] = sorted(set(_rng.sample(_vs, _rng.randint(0, min(3, _n)))))
    _g = {v: [w for w in ws if w != v or _rng.random() < 0.3] for v, ws in _g.items()}
    _tem = _tem_ciclo_ref(_g)
    _c = encontrar_ciclo(_g)
    if _tem:
        assert _valido(_g, _c), f"encontrar_ciclo({_g}): {_problema(_g, _c)}"
    else:
        assert _c is None, f"{_g} não tem ciclo, mas encontrar_ciclo devolveu {_c}"`},{name:`20 losangos em sequência: cada vértice é explorado uma vez só`,code:`class _Contador(dict):
    def __init__(self, dados, limite):
        super().__init__(dados)
        self.limite, self.consultas = limite, 0
    def _conta(self):
        self.consultas += 1
        if self.consultas > self.limite:
            raise AssertionError(f"o grafo tem {len(self)} vértices, mas sua função já consultou listas de vizinhos mais de {self.limite} vezes: algum vértice está sendo explorado de novo a cada caminho que chega nele. Um vértice preto (que já saiu) não precisa ser visitado outra vez")
    def __getitem__(self, k):
        self._conta()
        return super().__getitem__(k)
    def get(self, k, padrao=None):
        self._conta()
        return super().get(k, padrao)
_d = {}
for _i in range(20):
    _d[f"a{_i}"] = [f"b{_i}", f"c{_i}"]
    _d[f"b{_i}"] = [f"a{_i + 1}"]
    _d[f"c{_i}"] = [f"a{_i + 1}"]
_d["a20"] = []
_r = encontrar_ciclo(_Contador(_d, 10 * (61 + 80)))
assert _r is None, f"20 losangos em sequência não têm ciclo; veio {_r}"`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:"**Mini-projeto: auditor de pré-requisitos.** Leia um CSV com linhas `disciplina,pre_requisito` (uma linha por pré-requisito) e monte o grafo. O programa deve: (1) apontar um ciclo, se houver, mostrando as disciplinas envolvidas (use o seu `encontrar_ciclo`); (2) listar as disciplinas que não exigem nada, por onde um calouro pode começar, sem esquecer as que só aparecem como pré-requisito; (3) contar quantos blocos independentes de disciplinas existem, tratando as arestas como não direcionadas; (4) se houver até 30 disciplinas, imprimir a matriz de adjacência como tabela. Teste com a grade do seu curso ou com os pré-requisitos dos módulos do próprio Alicerce."}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Lista de arestas: O(E), boa para ler dados, ruim para achar vizinhos. Lista de adjacência: O(V + E), vizinhos em O(grau); a escolha padrão. Matriz: O(V²), "existe aresta?" em O(1); vale para grafos pequenos ou densos.
- Grafo não direcionado na lista de adjacência: cada aresta aparece duas vezes, e a soma dos graus é 2E.
- Grade = grafo implícito: vizinhos calculados, custo O(R · C). Confira os limites: índice negativo em Python não dá erro, dá a volta.
- DFS recursiva: entrada (pré-ordem) e saída (pós-ordem). O limite de recursão do Python (cerca de 1000) pede pilha explícita em grafos grandes.
- Componentes conexos: uma DFS a partir de cada vértice ainda não visitado, com o mesmo conjunto de visitados; O(V + E) no total.
- Ciclos em grafo direcionado: branco, cinza (no caminho atual) e preto (terminado). Aresta para cinza = aresta de retorno = ciclo; aresta para preto não é ciclo.`},{type:`callout`,tone:`english`,text:`**Vocabulary**: *edge list*, *adjacency list*, *adjacency matrix*, *degree*, *sparse* / *dense graph*, *implicit graph*, *connected component*, *flood fill*, *back edge*, *directed acyclic graph (DAG)*, *strongly connected component (SCC)*.

From CLRS (*Introduction to Algorithms*): *"A directed graph G is acyclic if and only if a depth-first search of G yields no back edges."*

Typical interview question: "Given a grid of land and water, count the number of islands. Would you use BFS or DFS, and what are the time and space complexities?"`,title:`English corner`}]}],cards:[{id:`l3-grafos-dfs#1`,front:`Quanta memória ocupam a lista de adjacência e a matriz de adjacência?`,back:`Lista: O(V + E). Matriz: O(V²), seja qual for o número de arestas.`},{id:`l3-grafos-dfs#2`,front:`Em que situação a matriz de adjacência é a melhor escolha?`,back:`Grafo pequeno ou denso (E da ordem de V²), quando a pergunta "existe aresta u–v?" em O(1) domina ou o algoritmo trabalha com tabelas.`},{id:`l3-grafos-dfs#3`,front:`Num grafo não direcionado em lista de adjacência, quanto vale a soma dos tamanhos de todas as listas?`,back:`2E: cada aresta aparece na lista das duas pontas (a soma dos graus é 2E).`},{id:`l3-grafos-dfs#4`,front:`Numa grade, que conferência evita ligar a primeira linha à última sem querer, em Python?`,back:`Conferir 0 <= linha < R e 0 <= coluna < C antes de acessar: índice negativo não dá erro, pega o fim da lista.`},{id:`l3-grafos-dfs#5`,front:`Por que contar componentes com uma DFS a partir de cada vértice não visitado custa O(V + E), e não O(V · (V + E))?`,back:`Porque o conjunto de visitados é compartilhado: cada vértice é marcado uma vez e cada lista de vizinhos é percorrida uma vez, somando todas as DFS.`},{id:`l3-grafos-dfs#6`,front:`O que significam branco, cinza e preto na detecção de ciclos?`,back:`Branco: não descoberto. Cinza: entrou e não saiu (está no caminho atual da recursão). Preto: saiu, com tudo o que alcança já explorado.`},{id:`l3-grafos-dfs#7`,front:`Num grafo direcionado, que aresta encontrada pela DFS prova que existe ciclo? E por que "já visitado" não basta?`,back:`Uma aresta para um vértice cinza (aresta de retorno). Um vértice preto pode ser alcançado por dois caminhos sem ciclo nenhum, como no losango.`},{id:`l3-grafos-dfs#8`,front:`Qual o limite padrão de recursão do Python e o que fazer numa DFS em grafo grande?`,back:`Cerca de 1000 chamadas; trocar a recursão por uma pilha explícita (ou usar BFS).`}]};export{e as default};
//# sourceMappingURL=l3-grafos-dfs-f61oAhCA.js.map