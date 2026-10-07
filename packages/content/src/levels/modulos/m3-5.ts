/** Lições adicionais do módulo m3-5 (grafos). */
import type { Lesson } from '../../types.ts';
import { dedent, deep, english, lesson, md, py, t, tip, warn } from '../../helpers.ts';

/* ------------------------------------------------------------------ */
/* Código compartilhado pelos testes                                  */
/* ------------------------------------------------------------------ */

/** Referência para contar ilhas (BFS), usada nos testes aleatórios. */
const REF_ILHAS = dedent(`
  from collections import deque

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
`);

/** Diz o que há de errado com uma resposta (ou "" se ela é um ciclo de g) e decide, por outro método (Kahn), se g tem ciclo. */
const REF_CICLO = dedent(`
  def _problema(g, c):
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
`);

/** Referência ingênua para a rota depois da enchente (BFS a partir da linha 0). */
const REF_ROTA = dedent(`
  from collections import deque

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
`);

/** Altura da maior árvore de uma lista de pais, sem alterar a lista. */
const ALTURA = dedent(`
  def _altura(pai):
      maior = 0
      for x in range(len(pai)):
          d = 0
          while pai[x] != x:
              x = pai[x]
              d += 1
          maior = max(maior, d)
      return maior
`);

/* ------------------------------------------------------------------ */
/* Lição 2 do módulo: representações e DFS a fundo                    */
/* ------------------------------------------------------------------ */

const dfsAFundo = lesson({
  id: 'l3-grafos-dfs',
  moduleId: 'm3-5',
  title: 'Busca em profundidade a fundo: representações, componentes e ciclos',
  titleEn: 'Depth-first search in depth: representations, components and cycles',
  summary: 'Lista de arestas, lista e matriz de adjacência e a grade como grafo implícito; DFS recursiva, contagem de componentes conexos em O(V + E) e detecção de ciclos em grafos direcionados com três cores.',
  minutes: 50,
  objectives: [
    'Escolher entre lista de arestas, lista de adjacência e matriz de adjacência pelos custos de memória e de cada operação',
    'Tratar uma grade (mapa, labirinto, imagem) como grafo implícito, sem montar a lista de adjacência e sem "dar a volta" nas bordas',
    'Escrever a DFS recursiva e prever a ordem em que os vértices entram e saem',
    'Contar componentes conexos em O(V + E), reaproveitando o mesmo conjunto de visitados',
    'Detectar ciclos em grafos direcionados com três cores e explicar por que "já visitado" não basta',
  ],
  skills: ['ed-grafos', 'alg-recursao'],
  terms: [
    t('lista de arestas', 'edge list', 'Representação que guarda só os pares (u, v), um por aresta; é como os dados chegam de um arquivo ou banco, mas não ajuda a achar vizinhos.'),
    t('matriz de adjacência', 'adjacency matrix', 'Tabela V × V em que a célula [u][v] indica se existe aresta de u para v; ocupa O(V²) de memória, com qualquer número de arestas.', 'An adjacency matrix requires Θ(V²) memory, independent of the number of edges.'),
    t('grau', 'degree', 'Número de arestas que tocam um vértice; em grafo direcionado, separa-se grau de entrada e grau de saída.', 'In an undirected graph, the sum of the degrees of all vertices is twice the number of edges.'),
    t('grafo esparso', 'sparse graph', 'Grafo com muito menos arestas que o máximo possível (E bem menor que V²); é o caso comum na prática.'),
    t('grafo denso', 'dense graph', 'Grafo em que E é da ordem de V²; nele a matriz de adjacência deixa de ser desperdício.'),
    t('grafo implícito', 'implicit graph', 'Grafo cujas arestas são calculadas na hora (como as 4 células vizinhas numa grade), sem ficarem guardadas em lugar nenhum.'),
    t('componente conexo', 'connected component', 'Grupo máximo de vértices de um grafo não direcionado em que todos se alcançam.', 'The connected components of a graph can be found with a single pass of DFS over all vertices.'),
    t('preenchimento por inundação', 'flood fill', 'Visitar (ou pintar) toda a região conectada a uma célula, como o balde de tinta dos editores de imagem.'),
    t('aresta de retorno', 'back edge', 'Na DFS, aresta que aponta para um vértice ainda em andamento (cinza); num grafo direcionado, é a prova de que existe ciclo.', 'A directed graph is acyclic if and only if a depth-first search yields no back edges.'),
    t('grafo acíclico direcionado', 'directed acyclic graph (DAG)', 'Grafo direcionado sem ciclos, como todo sistema de pré-requisitos ou de dependências bem feito.', 'A build system models tasks and their dependencies as a DAG.'),
    t('componente fortemente conexo', 'strongly connected component (SCC)', 'Num grafo direcionado, grupo máximo de vértices em que cada um alcança todos os outros, seguindo o sentido das arestas.', 'Tarjan\'s algorithm finds all strongly connected components in a single depth-first search.'),
  ],
  stages: {
    conceito: [
      md(`
        Na lição anterior, o grafo era sempre um dict de listas, e a DFS servia para uma coisa só: listar quem é alcançável a partir de um vértice. Problemas reais pedem mais duas decisões.

        1. **Como guardar o grafo?** Os dados quase nunca chegam prontos como dict de listas. Chegam como uma tabela de pares (de um CSV ou de um banco), como uma tabela V × V ou como um mapa desenhado em grade, em que os vizinhos de cada casa nem estão escritos em lugar nenhum. A representação muda o custo de cada pergunta e pode decidir se o programa cabe ou não na memória.
        2. **O que mais a DFS responde?** Quantos grupos separados existem (ilhas num mapa, grupos de amigos, bairros sem ligação de ônibus entre si) e se há **ciclo** nas dependências.

        O próprio Alicerce é um grafo: o módulo de grafos exige o de árvores, que exige o de pilhas e filas. Se alguém cadastrasse por engano um pré-requisito circular ("só faça A depois de B, e B depois de A"), nenhum estudante conseguiria começar nenhum dos dois. Achar esse ciclo é trabalho para a DFS, com um detalhe que derruba muita gente: em grafo direcionado, "já visitado" **não** quer dizer "ciclo".
      `),
    ],
    explicacao: [
      md(`
        ### Três formas de guardar o mesmo grafo
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
        - A **{{matriz de adjacência|adjacency matrix}}** é uma tabela V × V: \`m[u][v]\` vale 1 se existe aresta de u para v. Num grafo não direcionado ela é simétrica (\`m[u][v] == m[v][u]\`); com pesos, a célula guarda o peso no lugar do 1.
      `),
      {
        type: 'table',
        head: ['Operação', 'Lista de arestas', 'Lista de adjacência', 'Matriz de adjacência'],
        rows: [
          ['Memória', 'O(E)', 'O(V + E)', 'O(V²), com qualquer número de arestas'],
          ['Existe aresta u–v?', 'O(E)', 'O(grau(u)); O(1) em média se os vizinhos ficarem num `set`', 'O(1)'],
          ['Listar os vizinhos de u', 'O(E)', 'O(grau(u))', 'O(V): percorre a linha inteira'],
          ['Inserir uma aresta', 'O(1)', 'O(1) (append)', 'O(1)'],
          ['BFS ou DFS no grafo todo', 'O(V · E) varrendo as arestas a cada vértice; monte antes a lista de adjacência, em O(V + E)', 'O(V + E)', 'O(V²)'],
        ],
        caption: 'grau(u) é o número de vizinhos de u. Nenhuma representação vence em tudo: a matriz responde "existe aresta?" num passo, mas paga O(V) para listar vizinhos e O(V²) de memória.',
      },
      md(`
        ### Esparso ou denso?
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

        A recursão usa a pilha de chamadas no lugar da pilha explícita da lição anterior. As duas versões são DFS e custam O(V + E), mas a recursiva entrega de graça um momento que a outra esconde: o instante em que um vértice **sai**, depois de todos os que foram descobertos a partir dele. São as mesmas ideias de pré-ordem e pós-ordem dos percursos de árvore, e é a saída que permite detectar ciclos (e, no Nível 4, fazer a ordenação topológica).
      `),
      warn(`
        Python limita a profundidade da recursão: o padrão é 1000 chamadas (veja \`sys.getrecursionlimit()\`). Uma DFS recursiva num caminho com 5 000 vértices cai com \`RecursionError\`, e num mapa 100 × 100 todo de terra ela pode cair também. Aumentar o limite com \`sys.setrecursionlimit\` é remendo: você precisa adivinhar um número que sirva para qualquer entrada, cada chamada pendente ocupa memória e, em versões antigas do Python (até a 3.10), passar do que a pilha da máquina aguenta derruba o programa inteiro, sem nem um \`RecursionError\` para tratar. Em grafos de tamanho desconhecido, use a pilha explícita (ou uma BFS).
      `, 'O limite de recursão do Python'),
      md(`
        ### Componentes conexos
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

        Num grafo **direcionado**, esse teste dá alarme falso. Pense em pré-requisitos em forma de losango: Física 2 exige Física 1 e Cálculo 2, e os dois exigem Cálculo 1. A DFS que parte de Física 2 chega a Cálculo 1 por Física 1, volta, desce por Cálculo 2 e encontra Cálculo 1 já visitado. Não há ciclo nenhum: Cálculo 1 já tinha **terminado**. Só existe ciclo se a aresta aponta para um vértice que ainda está **em andamento**, isto é, no caminho atual da recursão. Essa aresta se chama {{aresta de retorno|back edge}}, e a DFS de ciclos distingue os três estados com cores:
      `),
      {
        type: 'table',
        head: ['Cor de w ao olhar a aresta v → w', 'Significado', 'O que fazer'],
        rows: [
          ['branco', 'w ainda não foi descoberto', 'descer para w'],
          ['cinza', 'w entrou e ainda não saiu: está no caminho atual, entre o início da DFS e v', '**ciclo**: w alcança v e v → w fecha a volta (aresta de retorno)'],
          ['preto', 'w já saiu: tudo o que ele alcança foi explorado, sem ciclo', 'ignorar (é o Cálculo 1 do losango)'],
        ],
        caption: 'Um vértice fica cinza ao entrar e preto ao sair. Um grafo direcionado tem ciclo se e somente se a DFS encontra uma aresta de retorno.',
      },
      md(`
        Com as cores, a busca de ciclos custa O(V + E), como qualquer DFS. Só não esqueça de começar uma DFS em **todo** vértice ainda branco: o ciclo pode estar numa parte do grafo que não é alcançável a partir do primeiro vértice. Um grafo direcionado sem ciclos tem nome próprio, {{grafo acíclico direcionado|directed acyclic graph (DAG)}}, e é o formato que todo sistema de pré-requisitos, de dependências de pacotes ou de etapas de um build precisa ter.
      `),
      deep(`
        - **Componentes em grafos direcionados.** Ali, "todos se alcançam" exige ida **e** volta. Esses grupos são os {{componentes fortemente conexos|strongly connected components}}, achados com duas DFS (algoritmo de Kosaraju) ou com uma só (Tarjan), ainda em O(V + E).
        - **Ordem de estudo.** Com as arestas no sentido "disciplina → o que ela exige", um vértice só sai depois de tudo o que ele exige. Então, num DAG, a própria **ordem de saída** da DFS já é uma ordem de estudo possível. Isso é a ordenação topológica, assunto do Nível 4.
      `),
    ],
    exemplo: [
      md(`
        Os pré-requisitos ficam num dict "disciplina → lista do que ela exige". É o losango da explicação: FIS1 e FIS2 são Física 1 e 2; CAL1 e CAL2, Cálculo 1 e 2. A DFS começa em FIS2. Acompanhe as cores e o **caminho atual**, que é exatamente a lista dos vértices cinza, do mais antigo para o mais recente.

        \`\`\`text
        exige = {"FIS2": ["FIS1", "CAL2"],
                 "FIS1": ["CAL1"],
                 "CAL2": ["CAL1"],
                 "CAL1": []}
        \`\`\`
      `),
      {
        type: 'table',
        head: ['Passo', 'O que acontece', 'Caminho atual (cinzas)', 'Pretos'],
        rows: [
          ['1', 'entra FIS2', 'FIS2', '—'],
          ['2', 'FIS2 → FIS1: branco, desce; entra FIS1', 'FIS2, FIS1', '—'],
          ['3', 'FIS1 → CAL1: branco, desce; entra CAL1', 'FIS2, FIS1, CAL1', '—'],
          ['4', 'CAL1 não exige nada: sai CAL1', 'FIS2, FIS1', 'CAL1'],
          ['5', 'FIS1 não tem mais vizinhos: sai FIS1', 'FIS2', 'CAL1, FIS1'],
          ['6', 'FIS2 → CAL2: branco, desce; entra CAL2', 'FIS2, CAL2', 'CAL1, FIS1'],
          ['7', 'CAL2 → CAL1: CAL1 é **preto**, não é ciclo (o teste "já visitado" daria alarme falso aqui)', 'FIS2, CAL2', 'CAL1, FIS1'],
          ['8', 'sai CAL2; sai FIS2. Nenhuma aresta de retorno: não há ciclo', '—', 'CAL1, FIS1, CAL2, FIS2'],
        ],
        caption: 'Ordem de saída: CAL1, FIS1, CAL2, FIS2. É uma ordem de estudo possível: cada disciplina sai depois de tudo o que ela exige.',
      },
      md(`
        Agora alguém cadastra por engano que CAL1 exige FIS2. Os passos 1 a 3 se repetem, mas no passo 4 CAL1 tem um vizinho para olhar:

        - **CAL1 → FIS2**: FIS2 é **cinza**, está no caminho atual (FIS2, FIS1, CAL1). Aresta de retorno: há ciclo.
        - O ciclo é o trecho do caminho que **começa em FIS2**, fechado pela aresta que acabou de ser encontrada: FIS2 → FIS1 → CAL1 → FIS2.

        Se o caminho atual tivesse vértices antes de FIS2 (por exemplo, se a DFS tivesse começado numa disciplina que exige FIS2), eles **não** fariam parte do ciclo.
      `),
    ],
    codigo: [
      py(`
        # Cinco bairros e as linhas de ônibus diretas entre eles (valem nos dois sentidos)
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
        print("ciclo depois do erro?", tem_ciclo(exige))
      `, { caption: 'A matriz gasta 25 células para 4 arestas; a lista, 8 entradas. Os dois testes de ciclo reproduzem o exemplo: o losango não tem ciclo; com o cadastro errado, tem.' }),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e3-dfs-1',
          kind: 'mcq',
          prompt: 'Um app de mobilidade modela uma cidade com 50 000 cruzamentos (vértices) e cerca de 120 000 trechos de rua (arestas). O programa roda BFS e DFS o tempo todo. Qual representação usar?',
          difficulty: 'facil',
          skills: ['ed-grafos'],
          hints: [
            'Quantas células teria uma tabela 50 000 × 50 000? Quantas delas seriam diferentes de zero?',
            'Numa BFS, que pergunta se repete para cada vértice que sai da fila? Quanto ela custa em cada representação?',
          ],
          explanation: 'BFS e DFS perguntam o tempo todo "quem são os vizinhos de v?". Na lista de adjacência isso custa O(grau(v)), o percurso inteiro fica O(V + E) e a memória também: 50 000 listas com até 240 000 entradas (um trecho de mão dupla aparece na lista das duas pontas). A matriz gastaria 2,5 bilhões de células (mais de 99,99% com zero) e O(V) para listar os vizinhos de cada cruzamento; a lista de arestas exigiria varrer as 120 000 arestas para achar os vizinhos de um único vértice.',
          options: [
            { text: 'Matriz de adjacência, porque responde "existe rua entre u e v?" em O(1)', feedback: 'O(1) para essa pergunta, sim, mas não é ela que a BFS faz. A matriz teria 50 000² = 2,5 bilhões de células, e listar os vizinhos de um cruzamento custaria 50 000 passos mesmo que ele tenha 4 ruas: a BFS ficaria O(V²).' },
            { text: 'Lista de adjacência (dict de vértice → vizinhos)', correct: true, feedback: 'Isso: memória O(V + E) e vizinhos em O(grau), então BFS e DFS custam O(V + E). É a escolha padrão para grafos esparsos.' },
            { text: 'Lista de arestas, porque é a mais compacta', feedback: 'Compacta ela é (O(E)), mas não tem índice: achar os vizinhos de um vértice exige varrer as 120 000 arestas. Ela serve para ler os dados; em seguida, monte a lista de adjacência em O(V + E).' },
            { text: 'Tanto faz: as três ocupam O(V + E)', feedback: 'A matriz ocupa O(V²), seja qual for o número de arestas: 2,5 bilhões de células aqui. E o custo de listar vizinhos muda muito de uma representação para outra.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e3-dfs-2',
          kind: 'predict',
          lang: 'python',
          prompt: 'A DFS recursiva abaixo anota quando cada vértice **entra** e quando **sai**. O que é impresso?',
          difficulty: 'intermediario',
          skills: ['ed-grafos', 'alg-recursao'],
          hints: [
            'Quando dfs("B") é chamada, a chamada de A fica parada esperando. O que precisa acontecer para ela continuar?',
            'Um vértice só sai depois que todos os vizinhos dele foram resolvidos: ou já estavam visitados, ou entraram e saíram.',
            'Quando C olha para D, D já foi visitado? E quando E olha para A?',
          ],
          explanation: 'A entra primeiro e sai por último: a chamada dele só termina quando tudo o que foi descoberto a partir dele terminou. D sai antes mesmo de C entrar, porque foi alcançado por B. A aresta E → A encontra A ainda em andamento: é uma aresta de retorno, e o grafo tem o ciclo A → C → E → A. A ordem de entrada é a pré-ordem; a de saída, a pós-ordem.',
          code: dedent(`
            g = {"A": ["B", "C"], "B": ["D"], "C": ["D", "E"], "D": [], "E": ["A"]}
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
            print(" ".join(saida))
          `),
          answer: 'A B D C E\nD B E C A',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e3-dfs-3',
          kind: 'code',
          lang: 'python',
          prompt: 'Uma imagem de satélite virou uma grade: `"#"` é terra e `"."` é água. Escreva `contar_ilhas(mapa)`, que recebe uma lista de strings (todas do mesmo tamanho) e devolve quantas ilhas existem. Uma ilha é um grupo de células de terra ligadas por cima, por baixo, pela esquerda ou pela direita (diagonal **não** liga). O mapa pode ser vazio (`[]`) ou grande (70 × 70) e não deve ser modificado. Não mexa no limite de recursão do Python (`sys.setrecursionlimit`).',
          difficulty: 'intermediario',
          skills: ['ed-grafos'],
          hints: [
            'Quem é o vértice e quem são os vizinhos dele? Você precisa montar um dict para isso?',
            'Percorra todas as células. Ao achar terra ainda não visitada, quantas ilhas novas isso significa? E o que fazer com o resto dessa ilha, para não contá-la de novo?',
            'Antes de olhar uma célula vizinha, confira se a linha e a coluna estão dentro do mapa. O que `mapa[-1]` devolve em Python?',
            'Se o teste do mapa grande der RecursionError, troque a recursão por uma pilha explícita (uma lista com append e pop).',
          ],
          explanation: 'É a contagem de componentes conexos num grafo implícito: cada terra não visitada inaugura uma ilha, e uma DFS (ou BFS) a partir dela marca a ilha inteira. Como o conjunto de visitados é compartilhado, cada célula é marcada uma vez, e o custo é O(R · C). Os testes pegam os dois erros mais comuns: índices negativos que "dão a volta" no mapa (o `#` da coluna 0 vira vizinho do `#` da última coluna) e recursão funda demais num mapa grande, que estoura o limite de 1000 chamadas do Python.',
          starter: dedent(`
            def contar_ilhas(mapa):
                # mapa: lista de strings do mesmo tamanho; "#" é terra e "." é água
                # devolva quantos grupos de "#" ligados por cima, baixo, esquerda ou direita existem
                pass
          `),
          solution: dedent(`
            def contar_ilhas(mapa):
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
                return ilhas
          `),
          tests: [
            {
              name: 'mapa da lição',
              code: dedent(`
                _m = ["##..#",
                      "#...#",
                      "..#..",
                      "....#"]
                _r = contar_ilhas(_m)
                assert _r == 4, f"o mapa da lição tem 4 ilhas; sua função devolveu {_r}"
              `),
            },
            {
              name: 'diagonal não liga; o U é uma ilha só',
              code: dedent(`
                _r = contar_ilhas(["#.", ".#"])
                assert _r == 2, f'["#.", ".#"]: células que só se tocam na diagonal são ilhas separadas (esperado 2, veio {_r})'
                _r = contar_ilhas(["#.#", "###"])
                assert _r == 1, f'["#.#", "###"] é uma ilha só: as pontas do U se ligam pela linha de baixo (veio {_r})'
              `),
            },
            {
              name: 'as bordas não dão a volta',
              code: dedent(`
                _r = contar_ilhas(["#..#"])
                assert _r == 2, f'["#..#"] tem 2 ilhas, veio {_r}. Em Python, a coluna -1 é a última coluna: confira os limites antes de olhar o vizinho'
                _r = contar_ilhas(["#", ".", "#"])
                assert _r == 2, f'["#", ".", "#"] tem 2 ilhas, veio {_r}. Em Python, a linha -1 é a última linha: confira 0 <= linha < número de linhas'
                _r = contar_ilhas(["#.#", "...", "###"])
                assert _r == 3, f'["#.#", "...", "###"] tem 3 ilhas, veio {_r}. Um try/except IndexError não protege dos índices negativos: confira 0 <= linha e 0 <= coluna antes de olhar o vizinho'
              `),
            },
            {
              name: 'mapas pequenos e vazios',
              code: dedent(`
                assert contar_ilhas([]) == 0, "mapa vazio: 0 ilhas"
                assert contar_ilhas(["...."]) == 0, "só água: 0 ilhas"
                assert contar_ilhas(["#"]) == 1, "uma célula de terra já é uma ilha"
                assert contar_ilhas(["###", "###"]) == 1, "tudo terra: 1 ilha"
              `),
            },
            {
              name: 'não altera o mapa',
              code: dedent(`
                _m = ["#.#", ".#.", "#.#"]
                _copia = list(_m)
                _r = contar_ilhas(_m)
                assert _r == 5, f'["#.#", ".#.", "#.#"] tem 5 ilhas (nenhuma terra encosta em outra por um lado); veio {_r}'
                assert _m == _copia, "não modifique o mapa recebido: marque as células visitadas num set"
              `),
            },
            {
              name: 'tabuleiro de xadrez 20 × 20',
              code: dedent(`
                _xadrez = ["".join("#" if (l + c) % 2 == 0 else "." for c in range(20)) for l in range(20)]
                _r = contar_ilhas(_xadrez)
                assert _r == 200, f"num tabuleiro 20 x 20, as 200 casas de terra só se tocam na diagonal: 200 ilhas; veio {_r}"
              `),
            },
            {
              name: 'mapa grande (70 × 70) todo de terra',
              code: dedent(`
                assert "setrecursionlimit" not in _source, "não aumente o limite de recursão: troque a recursão por uma pilha explícita, que funciona para mapas de qualquer tamanho"
                _r = contar_ilhas(["#" * 70 for _ in range(70)])
                assert _r == 1, f"o mapa 70 x 70 todo de terra é uma ilha só; veio {_r}"
              `),
            },
            {
              name: '200 mapas aleatórios',
              code: REF_ILHAS + '\n' + dedent(`
                import random
                _rng = random.Random(7)
                for _ in range(200):
                    _R, _C = _rng.randint(1, 7), _rng.randint(1, 7)
                    _m = ["".join(_rng.choice("#.") for _ in range(_C)) for _ in range(_R)]
                    _esperado = _ref_ilhas(_m)
                    _r = contar_ilhas(_m)
                    assert _r == _esperado, f"contar_ilhas({_m}) devolveu {_r}; esperado {_esperado}"
              `),
            },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e3-dfs-4',
          kind: 'fix',
          lang: 'python',
          prompt: 'A prefeitura guarda numa **matriz de adjacência** quais bairros têm linha de ônibus direta entre si: `m[i][j] == 1` quando i e j estão ligados (a matriz é simétrica). A função `contar_grupos(m)` deveria devolver quantos grupos de bairros existem, sendo que dentro de um grupo dá para ir de qualquer bairro a qualquer outro, com baldeações. Ela acerta alguns mapas por coincidência, erra outros e às vezes quebra com erro. Encontre e corrija o defeito.',
          difficulty: 'intermediario',
          skills: ['ed-grafos'],
          hints: [
            'Numa lista de adjacência, `g[x]` é a lista de vizinhos de x. E o que é `m[x]` numa matriz?',
            'Imprima o que `for y in m[x]` produz para a linha `[0, 0, 1, 0]`. Esses valores são bairros?',
            'Os vizinhos de x são as posições da linha que valem 1. Como percorrer as posições (os índices) de uma linha?',
          ],
          explanation: 'Na matriz, a linha `m[x]` não lista vizinhos: ela tem V posições com 0 ou 1, e o vizinho é o **índice** de cada posição que vale 1. O código tratava os valores 0 e 1 como se fossem os bairros 0 e 1; por isso acertava alguns mapas por acaso e, numa matriz 1 × 1 com `m[0][0] == 1`, tentava visitar um bairro 1 que não existe. Corrigido, o laço percorre a linha inteira de cada vértice: a busca custa O(V²), e não O(V + E). É o preço da matriz, que compensa quando o grafo é pequeno ou denso.',
          starter: dedent(`
            def contar_grupos(m):
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
                return grupos
          `),
          solution: dedent(`
            def contar_grupos(m):
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
                return grupos
          `),
          tests: [
            {
              name: 'dois bairros isolados e um par',
              code: dedent(`
                _m = [[0, 0, 0, 0],
                      [0, 0, 0, 0],
                      [0, 0, 0, 1],
                      [0, 0, 1, 0]]
                _r = contar_grupos(_m)
                assert _r == 3, f"os bairros 0 e 1 estão isolados e 2-3 formam um par: 3 grupos; veio {_r}"
              `),
            },
            {
              name: 'uma cadeia e um par',
              code: dedent(`
                _m = [[0, 1, 0, 0, 0],
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
                assert _r == 1, f"0 e 1 se ligam com baldeação no 2 (ligações 0-2 e 1-2): 1 grupo; veio {_r}. Percorra a linha inteira de cada bairro, não só as colunas depois dele"
              `),
            },
            {
              name: 'casos de borda',
              code: dedent(`
                assert contar_grupos([]) == 0, "sem bairros, 0 grupos"
                assert contar_grupos([[0]]) == 1, "um bairro sozinho é um grupo"
                assert contar_grupos([[1]]) == 1, "um bairro com linha circular (m[0][0] == 1) continua sendo 1 grupo"
                assert contar_grupos([[0, 0, 0], [0, 0, 0], [0, 0, 0]]) == 3, "três bairros sem nenhuma ligação são 3 grupos"
                _todos = [[0, 1, 1, 1], [1, 0, 1, 1], [1, 1, 0, 1], [1, 1, 1, 0]]
                assert contar_grupos(_todos) == 1, "todos ligados a todos: 1 grupo"
              `),
            },
            {
              name: '200 matrizes aleatórias',
              code: dedent(`
                import random
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
                    assert _r == _esperado, f"contar_grupos({_m}) devolveu {_r}; esperado {_esperado}"
              `),
            },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e3-dfs-5',
          kind: 'mcq',
          prompt: 'Uma colega escreveu esta detecção de ciclos para pré-requisitos (grafo direcionado), usando só um conjunto de visitados. Para qual destes grafos ela dá a resposta **errada**?',
          difficulty: 'avancado',
          skills: ['ed-grafos', 'alg-recursao'],
          code: {
            lang: 'python',
            code: dedent(`
              def tem_ciclo(g):
                  visitados = set()
                  def dfs(v):
                      visitados.add(v)
                      for w in g[v]:
                          if w in visitados:
                              return True
                          if dfs(w):
                              return True
                      return False
                  return any(v not in visitados and dfs(v) for v in g)
            `),
          },
          hints: [
            'Em cada opção, existe ciclo de verdade? Depois, siga o código e veja o que ele responde.',
            'Ao encontrar um vizinho já visitado, o código não pergunta se ele ainda está em andamento ou se já terminou. Em qual das opções a DFS pode reencontrar um vértice que já terminou, sem que exista ciclo?',
          ],
          explanation: 'No losango, D é alcançado por B e depois por C. Quando C olha para D, D já terminou: não existe caminho de D de volta para C. O código, que só sabe "visitado ou não", acusa ciclo. Com três cores, só uma aresta para um vértice cinza (em andamento) prova ciclo; D seria preto. Nos outros grafos o código acerta: o triângulo e o laço A → A têm ciclo de verdade, e no caminho A → B → C, percorrido a partir de A, ninguém é reencontrado.',
          options: [
            { text: '`{"A": ["B"], "B": ["C"], "C": ["A"]}`', feedback: 'Aqui há ciclo de verdade (A → B → C → A), e o código responde True: acerta.' },
            { text: '`{"A": ["B", "C"], "B": ["D"], "C": ["D"], "D": []}`', correct: true, feedback: 'Isso: quando C olha para D, D já foi visitado (por B) e já terminou. Não há ciclo, mas o código responde True.' },
            { text: '`{"A": ["B"], "B": ["C"], "C": []}`', feedback: 'A DFS começa em A, desce até C e nunca reencontra um vértice: o código responde False, que está certo.' },
            { text: '`{"A": ["A"]}`', feedback: 'Um laço é um ciclo de tamanho 1. Ao olhar A → A, o código encontra A visitado e responde True: acerta.' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e3-dfs-desafio',
          kind: 'code',
          lang: 'python',
          prompt: 'Antes de publicar a grade de um curso, a coordenação quer um verificador que, além de avisar que existe um pré-requisito circular, **mostre** qual é. Escreva `encontrar_ciclo(g)`: `g` é um dict "disciplina → lista do que ela exige" (grafo direcionado). Devolva uma lista `[v1, v2, ..., vk]` de vértices distintos em que v1 → v2 → ... → vk → v1 são arestas do grafo (um laço A → A vira `["A"]`), ou `None` se não houver ciclo. Atenção: uma disciplina pode aparecer só como pré-requisito, sem ser chave do dict (ela não exige nada). A busca deve custar O(V + E): os testes incluem grafos com muitos caminhos diferentes até os mesmos vértices.',
          difficulty: 'desafio',
          skills: ['ed-grafos', 'alg-recursao'],
          hints: [
            'Quando a DFS encontra uma aresta para um vértice cinza, onde estão os outros vértices do ciclo?',
            'Mantenha, junto com as cores, uma lista com o caminho atual: o vértice entra no fim dela quando fica cinza e sai do fim quando fica preto.',
            'Ao achar a aresta v → w com w cinza, o ciclo é um pedaço do caminho. Onde esse pedaço começa? Cuidado: pode haver vértices antes de w no caminho que não fazem parte do ciclo.',
            'Use `g.get(v, [])` para quem não é chave, e comece uma DFS em todo vértice ainda branco.',
          ],
          explanation: 'Os vértices cinza formam, em ordem, o caminho do início da DFS até o vértice atual. Uma aresta v → w com w cinza diz que w está nesse caminho, antes de v: o trecho de w até v, fechado pela aresta v → w, é um ciclo. O que vem antes de w no caminho não faz parte dele (no teste A → B → C → D → B, o A fica de fora). O custo é O(V + E), mais O(V) para recortar o ciclo uma única vez. Sem ciclo, a ordem de saída da mesma DFS seria uma ordem de estudo válida: a ordenação topológica do Nível 4.',
          starter: dedent(`
            def encontrar_ciclo(g):
                # g: dict disciplina -> lista de disciplinas que ela exige (grafo direcionado)
                # devolva [v1, ..., vk] com v1 -> v2 -> ... -> vk -> v1, sem repetir vértices,
                # ou None se não houver ciclo
                pass
          `),
          solution: dedent(`
            def encontrar_ciclo(g):
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
                return None
          `),
          tests: [
            {
              name: 'exemplo da lição',
              code: REF_CICLO + '\n' + dedent(`
                _g = {"FIS2": ["FIS1", "CAL2"], "FIS1": ["CAL1"], "CAL2": ["CAL1"], "CAL1": ["FIS2"]}
                _c = encontrar_ciclo(_g)
                assert _valido(_g, _c), f"{_problema(_g, _c)}. Esperado algo como ['FIS2', 'FIS1', 'CAL1']"
              `),
            },
            {
              name: 'sem ciclo',
              code: dedent(`
                _r = encontrar_ciclo({"A": ["B", "C"], "B": ["D"], "C": ["D"], "D": []})
                assert _r is None, f"o losango não tem ciclo (D é alcançado por dois caminhos, mas nunca volta); veio {_r}"
                assert encontrar_ciclo({}) is None, "grafo vazio: None"
                assert encontrar_ciclo({"A": []}) is None, "um vértice sem arestas: None"
                _r = encontrar_ciclo({"A": ["B"], "B": ["C"]})
                assert _r is None, f"A -> B -> C não tem ciclo (e C não é chave do dict); veio {_r}"
              `),
            },
            {
              name: 'laços',
              code: dedent(`
                _r = encontrar_ciclo({"A": ["A"]})
                assert _r == ["A"], f"A -> A é um ciclo de tamanho 1: esperado ['A'], veio {_r}"
                _r = encontrar_ciclo({"A": ["B"], "B": ["B"]})
                assert _r == ["B"], f"o único ciclo é o laço B -> B (A não faz parte dele): esperado ['B'], veio {_r}"
              `),
            },
            {
              name: 'o ciclo não começa no início da DFS',
              code: REF_CICLO + '\n' + dedent(`
                _g = {"A": ["B"], "B": ["C"], "C": ["D"], "D": ["B"]}
                _c = encontrar_ciclo(_g)
                assert _valido(_g, _c), f"{_problema(_g, _c)}. O ciclo é B -> C -> D -> B; o A só leva até ele e não faz parte do ciclo"
              `),
            },
            {
              name: 'ciclo em outra parte do grafo e vértice só como vizinho',
              code: REF_CICLO + '\n' + dedent(`
                _g = {"A": ["B"], "B": [], "X": ["Y"], "Y": ["Z"], "Z": ["X"]}
                _c = encontrar_ciclo(_g)
                assert _valido(_g, _c), f"{_problema(_g, _c)}. O ciclo X -> Y -> Z -> X não é alcançável a partir de A: comece uma DFS em todo vértice branco"
                _g = {"A": ["B"], "B": ["C", "A"]}
                _c = encontrar_ciclo(_g)
                assert _valido(_g, _c), f"{_problema(_g, _c)}. A -> B -> A é um ciclo, e C não é chave do dict"
              `),
            },
            {
              name: '300 grafos aleatórios',
              code: REF_CICLO + '\n' + dedent(`
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
                        assert _c is None, f"{_g} não tem ciclo, mas encontrar_ciclo devolveu {_c}"
              `),
            },
            {
              name: '20 losangos em sequência: cada vértice é explorado uma vez só',
              code: dedent(`
                class _Contador(dict):
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
                assert _r is None, f"20 losangos em sequência não têm ciclo; veio {_r}"
              `),
            },
          ],
        },
      },
    ],
    projeto: [
      md('**Mini-projeto: auditor de pré-requisitos.** Leia um CSV com linhas `disciplina,pre_requisito` (uma linha por pré-requisito) e monte o grafo. O programa deve: (1) apontar um ciclo, se houver, mostrando as disciplinas envolvidas (use o seu `encontrar_ciclo`); (2) listar as disciplinas que não exigem nada, por onde um calouro pode começar, sem esquecer as que só aparecem como pré-requisito; (3) contar quantos blocos independentes de disciplinas existem, tratando as arestas como não direcionadas; (4) se houver até 30 disciplinas, imprimir a matriz de adjacência como tabela. Teste com a grade do seu curso ou com os pré-requisitos dos módulos do próprio Alicerce.'),
    ],
    revisao: [
      md(`
        - Lista de arestas: O(E), boa para ler dados, ruim para achar vizinhos. Lista de adjacência: O(V + E), vizinhos em O(grau); a escolha padrão. Matriz: O(V²), "existe aresta?" em O(1); vale para grafos pequenos ou densos.
        - Grafo não direcionado na lista de adjacência: cada aresta aparece duas vezes, e a soma dos graus é 2E.
        - Grade = grafo implícito: vizinhos calculados, custo O(R · C). Confira os limites: índice negativo em Python não dá erro, dá a volta.
        - DFS recursiva: entrada (pré-ordem) e saída (pós-ordem). O limite de recursão do Python (cerca de 1000) pede pilha explícita em grafos grandes.
        - Componentes conexos: uma DFS a partir de cada vértice ainda não visitado, com o mesmo conjunto de visitados; O(V + E) no total.
        - Ciclos em grafo direcionado: branco, cinza (no caminho atual) e preto (terminado). Aresta para cinza = aresta de retorno = ciclo; aresta para preto não é ciclo.
      `),
      english(`
        **Vocabulary**: *edge list*, *adjacency list*, *adjacency matrix*, *degree*, *sparse* / *dense graph*, *implicit graph*, *connected component*, *flood fill*, *back edge*, *directed acyclic graph (DAG)*, *strongly connected component (SCC)*.

        From CLRS (*Introduction to Algorithms*): *"A directed graph G is acyclic if and only if a depth-first search of G yields no back edges."*

        Typical interview question: "Given a grid of land and water, count the number of islands. Would you use BFS or DFS, and what are the time and space complexities?"
      `),
    ],
  },
  review: [
    ['Quanta memória ocupam a lista de adjacência e a matriz de adjacência?', 'Lista: O(V + E). Matriz: O(V²), seja qual for o número de arestas.'],
    ['Em que situação a matriz de adjacência é a melhor escolha?', 'Grafo pequeno ou denso (E da ordem de V²), quando a pergunta "existe aresta u–v?" em O(1) domina ou o algoritmo trabalha com tabelas.'],
    ['Num grafo não direcionado em lista de adjacência, quanto vale a soma dos tamanhos de todas as listas?', '2E: cada aresta aparece na lista das duas pontas (a soma dos graus é 2E).'],
    ['Numa grade, que conferência evita ligar a primeira linha à última sem querer, em Python?', 'Conferir 0 <= linha < R e 0 <= coluna < C antes de acessar: índice negativo não dá erro, pega o fim da lista.'],
    ['Por que contar componentes com uma DFS a partir de cada vértice não visitado custa O(V + E), e não O(V · (V + E))?', 'Porque o conjunto de visitados é compartilhado: cada vértice é marcado uma vez e cada lista de vizinhos é percorrida uma vez, somando todas as DFS.'],
    ['O que significam branco, cinza e preto na detecção de ciclos?', 'Branco: não descoberto. Cinza: entrou e não saiu (está no caminho atual da recursão). Preto: saiu, com tudo o que alcança já explorado.'],
    ['Num grafo direcionado, que aresta encontrada pela DFS prova que existe ciclo? E por que "já visitado" não basta?', 'Uma aresta para um vértice cinza (aresta de retorno). Um vértice preto pode ser alcançado por dois caminhos sem ciclo nenhum, como no losango.'],
    ['Qual o limite padrão de recursão do Python e o que fazer numa DFS em grafo grande?', 'Cerca de 1000 chamadas; trocar a recursão por uma pilha explícita (ou usar BFS).'],
  ],
  references: ['clrs', 'sedgewick-algs', 'mit-6006'],
});

/* ------------------------------------------------------------------ */
/* Lição 3 do módulo: Union-Find                                      */
/* ------------------------------------------------------------------ */

const unionFind = lesson({
  id: 'l3-union-find',
  moduleId: 'm3-5',
  title: 'Union-Find: grupos que se juntam em tempo quase constante',
  titleEn: 'Union-Find: merging groups in nearly constant time',
  summary: 'Conjuntos disjuntos com find e union sobre uma lista de pais; união por tamanho, compressão de caminho e o custo O(α(n)); contar grupos e achar a ligação que fecha um ciclo enquanto as arestas chegam uma a uma.',
  minutes: 45,
  objectives: [
    'Reconhecer problemas de conectividade dinâmica, em que as ligações chegam uma a uma e nunca são desfeitas',
    'Implementar find e union sobre uma floresta guardada numa lista de pais',
    'Explicar por que a união por tamanho limita a altura a log₂ n e o que a compressão de caminho acrescenta',
    'Usar Union-Find para contar grupos e para achar a aresta que fecha um ciclo',
    'Saber o que o Union-Find não faz: separar grupos, mostrar caminhos e responder alcance em grafos direcionados',
  ],
  skills: ['ed-grafos'],
  terms: [
    t('Union-Find', 'union-find / disjoint-set union (DSU)', 'Estrutura que mantém grupos sem elementos em comum e oferece duas operações: find (qual é o grupo de x?) e union (junte os grupos de x e y).', 'A disjoint-set data structure supports MAKE-SET, UNION and FIND-SET.'),
    t('conjuntos disjuntos', 'disjoint sets', 'Coleção de grupos sem elemento em comum: cada elemento pertence a exatamente um grupo.'),
    t('conectividade dinâmica', 'dynamic connectivity', 'Responder "x e y estão ligados?" enquanto as ligações do grafo mudam. O Union-Find resolve o caso em que elas só chegam e nunca saem (a conectividade incremental).'),
    t('representante', 'representative', 'O elemento que identifica o grupo, a raiz da árvore: dois elementos estão no mesmo grupo se e somente se têm o mesmo representante.'),
    t('união por tamanho', 'union by size', 'Ao juntar dois grupos, pendurar a raiz da árvore menor na raiz da maior; garante altura de no máximo log₂ n.'),
    t('compressão de caminho', 'path compression', 'Durante o find, fazer cada elemento do caminho apontar direto para a raiz, achatando a árvore para as próximas buscas.', 'Path compression makes each node on the find path point directly to the root.'),
    t('função inversa de Ackermann', 'inverse Ackermann function', 'Função α(n) que cresce tão devagar que não passa de 4 para nenhum n de uso prático; aparece no custo do Union-Find.', 'Union-find runs in O(α(n)) amortized time per operation.'),
  ],
  stages: {
    conceito: [
      md(`
        Imagine o time antifraude de um banco digital. A cada minuto chega uma evidência de que duas contas têm o mesmo dono: o mesmo celular de cadastro, o mesmo aparelho, o mesmo e-mail. As ligações só se acumulam, nunca são desfeitas, e o sistema pergunta o tempo todo: **estas duas contas estão no mesmo grupo?** Uma chave Pix nova cadastrada numa conta de um grupo suspeito, por exemplo, precisa ser analisada na hora.

        Com o que você já sabe, daria para guardar o grafo e rodar uma BFS ou uma DFS a cada pergunta: O(V + E) por consulta. Com milhões de contas e milhares de perguntas por segundo, a conta não fecha. Esse é o problema da {{conectividade dinâmica|dynamic connectivity}}, no caso em que as ligações só chegam, e a ferramenta para ele é o **{{Union-Find|union-find}}** (também chamado de *disjoint-set union*, ou DSU). Ele guarda {{conjuntos disjuntos|disjoint sets}}, grupos sem elemento em comum, e oferece só duas operações: **find** ("qual é o grupo de x?") e **union** ("junte o grupo de x com o de y"). Com dois truques de poucas linhas, cada uma custa, na prática, tempo constante.

        É uma estrutura pequena com alcance enorme: é a peça central do algoritmo de Kruskal (árvore geradora mínima, Nível 4) e aparece em segmentação de imagens, em simulações de percolação, na geração de labirintos e em muitos problemas de entrevista.
      `),
    ],
    explicacao: [
      md(`
        ### Cada grupo é uma árvore
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
        Com união por tamanho **e** compressão de caminho, uma sequência de m operações sobre n elementos custa O(m · α(n)), em que α é a {{função inversa de Ackermann|inverse Ackermann function}}. Ela cresce tão devagar que α(n) ≤ 4 para qualquer n que caiba no universo: na prática, cada operação custa tempo constante. Um find isolado ainda pode dar até log₂ n saltos; o que é quase constante é a **média** numa sequência longa, o custo amortizado.
      `),
      {
        type: 'table',
        head: ['Versão', 'Um find, no pior caso', 'm operações sobre n elementos'],
        rows: [
          ['Ingênua', 'O(n)', 'O(m · n)'],
          ['Só união por tamanho', 'O(log n)', 'O(m log n)'],
          ['Só compressão de caminho', 'O(n)', 'O(m log n): O(log n) amortizado por operação'],
          ['União por tamanho + compressão', 'O(log n)', 'O(m · α(n)): na prática, O(m)'],
        ],
        caption: 'Cada truque sozinho já derruba o custo amortizado para O(log n) por operação (só com a compressão, um find isolado ainda pode custar O(n)); juntos, levam esse custo a quase constante.',
      },
      deep(`
        - A estrutura é de Galler e Fischer (1964). O limite O(m · α(n)) foi provado por Robert Tarjan (1975), e Fredman e Saks mostraram em 1989 que esse α(n) não pode ser eliminado: nenhuma estrutura para o problema faz melhor, em custo amortizado.
        - A união por *rank* guarda em cada raiz um limite superior para a altura (em vez do tamanho) e pendura a de rank menor na de rank maior. Dá a mesma garantia; a versão por tamanho tem o bônus de deixar o tamanho de cada grupo disponível de graça.
        - Variante de uma passada só, a **divisão do caminho pela metade** (*path halving*): \`while pai[x] != x: pai[x] = pai[pai[x]]; x = pai[x]\`. A cada passo, x passa a apontar para o avô e pula direto para ele: um elemento sim, outro não, do caminho ganha um atalho, e o caminho fica com cerca de metade do comprimento (daí o nome). Junto com a união por tamanho, tem a mesma garantia de custo e dispensa a segunda passada.
      `),
      md(`
        ### O que o Union-Find não faz
        Ele troca informação por velocidade: guarda só a divisão em grupos, não as ligações que a formaram.
      `),
      {
        type: 'table',
        head: ['Situação', 'BFS / DFS', 'Union-Find'],
        rows: [
          ['Grafo fixo, muitas perguntas "x e y estão ligados?"', 'rotule os componentes uma vez, em O(V + E), e responda cada pergunta em O(1)', 'também serve: O((V + E) · α(V)) para montar'],
          ['Ligações chegando uma a uma, com perguntas entre elas', 'O(V + E) por pergunta, refazendo a busca', 'O(α(n)) amortizado por ligação e por pergunta'],
          ['Qual é o caminho entre x e y?', 'BFS guardando o pai de cada vértice', 'não responde: as árvores internas não são o grafo'],
          ['Remover uma ligação', 'refaça a busca', 'não suporta: não existe "desunir"'],
          ['Alcance em grafo direcionado (A segue B)', 'sim', 'não: "estar no mesmo grupo" precisa ser simétrico e transitivo'],
        ],
      },
      tip('Se as ligações só são removidas (nunca acrescentadas) e a sequência inteira é conhecida de antemão, há um truque clássico: comece pelo grafo que sobra no fim e processe a sequência **de trás para frente**. Lida ao contrário, cada remoção de ligação vira uma união.'),
      md(`
        ### Duas receitas que você vai usar muito
        - **Contar grupos enquanto as ligações chegam**: comece com n grupos e desconte 1 a cada union que juntar grupos diferentes.
        - **Detectar ciclo num grafo não direcionado**: ao inserir a aresta (u, v), se find(u) == find(v), u e v já estavam ligados por outro caminho, e essa aresta fecha um ciclo. É o que o algoritmo de Kruskal faz para montar a árvore geradora mínima (Nível 4): percorre as arestas da mais barata para a mais cara e pula as que fechariam ciclo.
      `),
      tip('Elementos com nome (contas, CPFs, cidades) entram no Union-Find por um dict nome → índice, montado uma vez. Outra saída é guardar `pai` num dict e criar cada elemento na primeira vez em que ele aparece, com `pai.setdefault(x, x)`.', 'Nomes em vez de números'),
    ],
    exemplo: [
      md('Oito elementos, união por tamanho e compressão de caminho. Regra de desempate (a mesma do código da lição): com tamanhos iguais, a raiz do **segundo** argumento fica embaixo da raiz do primeiro.'),
      {
        type: 'table',
        head: ['Passo', 'Operação', 'pai (índices 0 a 7)', 'O que aconteceu'],
        rows: [
          ['0', 'início', '`[0, 1, 2, 3, 4, 5, 6, 7]`', 'oito grupos de um elemento; todos são raízes'],
          ['1', 'union(0, 1)', '`[0, 0, 2, 3, 4, 5, 6, 7]`', 'tamanhos iguais (1 e 1): a raiz 1 fica embaixo da raiz 0'],
          ['2', 'union(2, 3)', '`[0, 0, 2, 2, 4, 5, 6, 7]`', 'idem: 3 fica embaixo de 2'],
          ['3', 'union(1, 3)', '`[0, 0, 0, 2, 4, 5, 6, 7]`', 'as raízes são 0 e 2, ambas com tamanho 2: 2 fica embaixo de 0. Altura 2 (3 → 2 → 0)'],
          ['4', 'union(4, 5) e union(6, 7)', '`[0, 0, 0, 2, 4, 4, 6, 6]`', 'mais dois pares'],
          ['5', 'union(5, 7)', '`[0, 0, 0, 2, 4, 4, 4, 6]`', 'raízes 4 e 6, tamanho 2 cada: 6 fica embaixo de 4'],
          ['6', 'union(7, 3)', '`[4, 0, 0, 0, 4, 4, 4, 4]`', 'find(7) sobe 7 → 6 → 4 e comprime (7 passa a apontar para 4); find(3) sobe 3 → 2 → 0 e comprime (3 aponta para 0). Raízes 4 e 0, tamanho 4 cada: 0 fica embaixo de 4'],
          ['7', 'find(3)', '`[4, 0, 0, 4, 4, 4, 4, 4]`', 'sobe 3 → 0 → 4 e comprime: 3 passa a apontar direto para 4'],
        ],
        caption: 'No fim, 4 é pai de 0, 3, 5, 6 e 7, e 0 é pai de 1 e 2: um grupo só, com altura 2.',
      },
      md(`
        Com 8 elementos, a união por tamanho garante altura de no máximo ⌊log₂ 8⌋ = 3; aqui ela nunca passou de 2. Repare também no limite da compressão: depois do passo 7, os elementos 1 e 2 ainda estão a dois saltos da raiz, porque nenhum find passou por eles depois que o 0 foi pendurado no 4. A compressão só achata os caminhos que alguém percorreu.
      `),
    ],
    codigo: [
      py(`
        class UnionFind:
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
        print("altura sem os truques:", altura(ingenuo), "| com os truques:", altura(esperto.pai))
      `, { caption: 'Mesma sequência de uniões: sem os truques, a árvore vira uma cadeia e find(0) dá 999 saltos; com eles, todo elemento fica a um salto da raiz.' }),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e3-uf-1',
          kind: 'mcq',
          prompt: 'O time antifraude guarda as contas num Union-Find, alimentado por evidências de "mesmo dono". Qual destas tarefas ele **não** consegue fazer com essa estrutura?',
          difficulty: 'facil',
          skills: ['ed-grafos'],
          hints: [
            'Para cada tarefa, quais operações (find, union) ela precisaria?',
            'As árvores internas guardam as evidências originais? Depois de algumas uniões, o pai de um elemento é sempre alguém com quem ele tem uma evidência direta?',
          ],
          explanation: 'O Union-Find guarda só a divisão em grupos, não as ligações que a formaram. Pertinência ao mesmo grupo, contagem de grupos e detecção de evidência redundante saem de find e union. Já a corrente de evidências exige o grafo original: lista de adjacência e uma BFS guardando o pai de cada vértice.',
          options: [
            { text: 'Dizer se duas contas estão no mesmo grupo', feedback: 'Essa é a especialidade dele: find(x) == find(y), em tempo quase constante.' },
            { text: 'Contar quantos grupos existem a cada nova evidência', feedback: 'Dá sim: comece com n e desconte 1 a cada union que juntar grupos diferentes.' },
            { text: 'Mostrar a corrente de evidências que liga a conta A à conta B', correct: true, feedback: 'Isso: as árvores do Union-Find só registram quem está no mesmo grupo, e as arestas delas não correspondem às evidências. Para o caminho, guarde o grafo e use uma BFS.' },
            { text: 'Avisar que uma evidência nova não acrescenta nada (as duas contas já estavam no mesmo grupo)', feedback: 'Dá sim: é o caso em que find dá a mesma raiz para as duas contas, e union não precisa juntar nada.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e3-uf-2',
          kind: 'predict',
          lang: 'python',
          prompt: 'Este Union-Find usa união por tamanho e compressão de caminho. O que o programa imprime?',
          difficulty: 'intermediario',
          skills: ['ed-grafos'],
          hints: [
            'Em cada union, ache primeiro as duas raízes. Quando os tamanhos empatam, quem fica embaixo?',
            'Na linha do segundo print, union(5, 0) roda antes de union(1, 4). Que finds cada uma faz, e o que a compressão muda?',
            'Ninguém chama find(5) depois que o grupo dele foi pendurado em outro. O pai de 5 muda?',
          ],
          explanation: 'union(3, 1) junta as raízes 2 e 0, ambas com tamanho 2: no empate, a raiz do segundo argumento (0) vai para baixo de 2. Depois, union(5, 0) acha as raízes 4 (tamanho 2) e 2 (tamanho 4): a menor, 4, fica embaixo de 2, e a união devolve True. Em union(1, 4), find(1) sobe 1 → 0 → 2 e comprime (1 passa a apontar para 2), e find(4) também dá 2: mesmo grupo, devolve False. O 5 continua apontando para 4, porque a compressão só mexe em quem está no caminho de um find.',
          code: dedent(`
            pai = list(range(6))
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
            print(pai)
          `),
          answer: '[2, 0, 2, 2, 4, 5]\nTrue False\n[2, 2, 2, 2, 2, 4]',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e3-uf-3',
          kind: 'mcq',
          prompt: 'Um Union-Find com **união por tamanho** e **sem** compressão de caminho guarda 1 024 elementos. Depois de uma sequência qualquer de uniões, qual a maior altura que uma árvore pode ter, e com que tipo de sequência ela aparece?',
          difficulty: 'intermediario',
          skills: ['ed-grafos', 'ed-arvores'],
          hints: [
            'Quando a profundidade de um elemento aumenta? O que acontece com o tamanho do grupo dele nesse momento?',
            'Começando de um grupo de tamanho 1, quantas vezes dá para dobrar sem passar de 1 024?',
          ],
          explanation: 'Um elemento desce um nível só quando o grupo dele é pendurado num grupo pelo menos do mesmo tamanho, então o grupo dele no mínimo dobra. Começando em 1, dá para dobrar no máximo 10 vezes até 1 024: altura ≤ ⌊log₂ 1 024⌋ = 10. E o limite é atingido: una 512 pares, depois 256 pares de pares, e assim por diante, até a última união entre dois grupos de 512 elementos com altura 9 cada.',
          options: [
            { text: '10, unindo sempre grupos de mesmo tamanho: pares, depois pares de pares, e assim por diante', correct: true, feedback: 'Isso: unir duas árvores iguais de altura h dá altura h + 1, e 1 024 = 2¹⁰ permite repetir isso 10 vezes. Mais que isso é impossível, porque cada nível a mais exige que o grupo dobre.' },
            { text: '1 023, unindo sempre um elemento novo ao grupo grande', feedback: 'Isso aconteceria na versão ingênua. Com união por tamanho, o elemento novo (grupo de tamanho 1) é que fica pendurado na raiz do grupo grande, e a árvore vira uma estrela de altura 1.' },
            { text: '32, a raiz quadrada de 1 024, unindo grupos de 32 elementos', feedback: 'Não há raiz quadrada no argumento: a cada nível que um elemento desce, o grupo dele pelo menos dobra. O limite é log₂ 1 024 = 10.' },
            { text: '1, porque com união por tamanho toda árvore é uma estrela', feedback: 'Unir duas árvores de altura 1 e mesmo tamanho cria altura 2: a união por tamanho limita a altura a log₂ n, mas não a mantém em 1. Achatar é o papel da compressão de caminho.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e3-uf-4',
          kind: 'code',
          lang: 'python',
          prompt: 'Um condomínio tem `n` prédios (0 a n − 1), e a equipe instalou cabos de rede na ordem da lista `cabos` (tuplas `(a, b)`). Escreva `ligacao_redundante(n, cabos)`, que devolve o **primeiro** cabo que não ligou nada novo: aquele cujas duas pontas já estavam conectadas, direta ou indiretamente, pelos cabos anteriores. Devolva o cabo exatamente como aparece na lista; se nenhum for redundante, devolva `None`. Um cabo de um prédio para ele mesmo também é redundante.',
          difficulty: 'intermediario',
          skills: ['ed-grafos'],
          hints: [
            'Para cada cabo, que pergunta você precisa responder antes de registrá-lo?',
            'Um conjunto com os prédios que já receberam algum cabo resolve? Teste com (0, 1), (2, 3), (1, 2).',
            'Com um Union-Find: se as duas pontas já têm a mesma raiz, você achou o cabo; senão, una os grupos e siga para o próximo.',
          ],
          explanation: 'Redundante quer dizer "as pontas já estavam no mesmo grupo", e isso é transitivo: em (0, 1), (2, 3), (1, 2), (3, 0), o cabo (1, 2) junta dois grupos diferentes, embora os dois prédios já tivessem cabo; só (3, 0) é redundante. Com Union-Find, cada cabo custa dois finds e no máximo uma união: O(m · α(n)) no total, contra O(m · (n + m)) refazendo uma busca para cada cabo. Num grafo não direcionado, o cabo redundante é a aresta que fecha o primeiro ciclo.',
          starter: dedent(`
            def ligacao_redundante(n, cabos):
                # n prédios (0 a n - 1); cabos: lista de tuplas (a, b), na ordem de instalação
                # devolva o primeiro cabo cujas pontas JÁ estavam conectadas antes dele, ou None
                pass
          `),
          solution: dedent(`
            def ligacao_redundante(n, cabos):
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
                return None
          `),
          tests: [
            {
              name: 'exemplo',
              code: dedent(`
                _r = ligacao_redundante(5, [(0, 1), (1, 2), (3, 4), (2, 0), (1, 3)])
                assert _r == (2, 0), f"o cabo (2, 0) liga prédios que já estavam conectados por 2-1-0; veio {_r}"
              `),
            },
            {
              name: 'nenhum cabo redundante',
              code: dedent(`
                _r = ligacao_redundante(4, [(0, 1), (1, 2), (2, 3)])
                assert _r is None, f"uma cadeia sem ciclo não tem cabo redundante; veio {_r}"
                assert ligacao_redundante(3, []) is None, "sem cabos, nenhum é redundante"
                assert ligacao_redundante(1, []) is None, "um prédio só, sem cabos: None"
              `),
            },
            {
              name: 'cabo repetido e cabo em laço',
              code: dedent(`
                _r = ligacao_redundante(3, [(0, 1), (1, 0)])
                assert _r == (1, 0), f"o segundo cabo entre 0 e 1 é redundante; devolva-o como aparece na lista, (1, 0). Veio {_r}"
                _r = ligacao_redundante(3, [(0, 1), (2, 2), (1, 2)])
                assert _r == (2, 2), f"um cabo de um prédio para ele mesmo não liga nada novo; veio {_r}"
              `),
            },
            {
              name: 'conexão indireta',
              code: dedent(`
                _r = ligacao_redundante(4, [(0, 1), (2, 3), (1, 2), (3, 0)])
                assert _r == (3, 0), f"(1, 2) junta os grupos 0-1 e 2-3, que eram diferentes; o redundante é (3, 0). Veio {_r}"
                _r = ligacao_redundante(3, [(0, 1), (0, 2), (1, 2)])
                assert _r == (1, 2), f"1 e 2 já estavam ligados por 1-0-2, então (1, 2) é redundante; veio {_r}. Ao unir, mude o pai das RAÍZES, e não o de um dos prédios do cabo"
                _r = ligacao_redundante(3, [(0, 1), (2, 1), (0, 2)])
                assert _r == (0, 2), f"0 e 2 já estavam ligados por 0-1-2, então (0, 2) é redundante; veio {_r}. Ao unir, mude o pai das RAÍZES, e não o de um dos prédios do cabo"
              `),
            },
            {
              name: 'cadeia longa',
              code: dedent(`
                _cabos = [(i, i + 1) for i in range(999)] + [(999, 0), (5, 6)]
                try:
                    _r = ligacao_redundante(1000, _cabos)
                except RecursionError:
                    raise AssertionError("RecursionError numa cadeia de 1000 prédios: sem a união por tamanho, a árvore vira uma cadeia e um find recursivo estoura o limite do Python. Una pelo tamanho ou escreva o find com while")
                assert _r == (999, 0), f"o cabo (999, 0) fecha a volta da cadeia 0-1-...-999; veio {_r}"
              `),
            },
            {
              name: '300 redes aleatórias',
              code: dedent(`
                import random
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
                    assert _r == _esperado, f"ligacao_redundante({_n}, {_cabos}) devolveu {_r}; esperado {_esperado}"
              `),
            },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e3-uf-5',
          kind: 'fix',
          lang: 'python',
          prompt: 'O sistema antifraude usa a classe abaixo, e os testes acharam dois problemas: (1) depois de uma evidência repetida (duas contas que já estavam juntas), `grupos` e `tamanho` ficam errados; (2) com certas sequências de uniões, as árvores ficam altíssimas e o `find` vira O(n), embora a classe diga que faz união por tamanho. Corrija os **dois** defeitos sem mudar a interface: `union` devolve `True` se juntou grupos diferentes e `False` se eles já eram o mesmo.',
          difficulty: 'avancado',
          skills: ['ed-grafos', 'ed-arvores'],
          hints: [
            'Simule union(0, 1) e depois union(1, 0). O que acontece com `grupos` e com `tamanho` na segunda chamada?',
            'Na comparação de tamanhos, de quem é o tamanho que está sendo lido? Esse valor continua atualizado depois que o elemento deixa de ser raiz?',
            'O tamanho de um grupo é mantido em um único lugar. Qual?',
          ],
          explanation: 'Primeiro defeito: sem o teste `rx == ry`, unir duas contas do mesmo grupo descontava um grupo e dobrava o tamanho. Segundo: `tamanho` só é atualizado nas raízes, então `tamanho[x]` de um elemento que já foi pendurado em outro fica velho. Comparando os tamanhos de x e y, e não os de rx e ry, a sequência union(1, 0), union(2, 0), union(3, 0), ... pendura sempre a árvore grande embaixo do elemento novo e forma uma cadeia. Os testes conferem a altura: com a união por tamanho correta, 64 elementos nunca passam de altura 6.',
          starter: dedent(`
            class UnionFind:
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
                    return True
          `),
          solution: dedent(`
            class UnionFind:
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
                    return True
          `),
          tests: [
            {
              name: 'evidência repetida',
              code: dedent(`
                _uf = UnionFind(3)
                assert _uf.union(0, 1) is True, "unir 0 e 1 (grupos diferentes) deve devolver True"
                assert _uf.union(1, 0) is False, "0 e 1 já estão juntos: union deve devolver False"
                assert _uf.grupos == 2, f"depois de unir 0 e 1 duas vezes, há 2 grupos (0-1 e o 2 sozinho); grupos = {_uf.grupos}"
                _t = _uf.tamanho[_uf.find(0)]
                assert _t == 2, f"o grupo de 0 tem 2 elementos, mas o tamanho guardado na raiz é {_t}"
              `),
            },
            {
              name: 'altura limitada a log₂ n',
              code: ALTURA + '\n' + dedent(`
                _uf = UnionFind(64)
                for _i in range(1, 64):
                    _uf.union(_i, 0)
                _h = _altura(_uf.pai)
                assert _h <= 6, f"com união por tamanho, 64 elementos nunca passam de altura 6; a sua árvore chegou a {_h}. Compare os tamanhos das RAÍZES"
                assert _uf.grupos == 1, f"depois de unir todos ao 0, há 1 grupo; grupos = {_uf.grupos}"
              `),
            },
            {
              name: '100 sequências aleatórias',
              code: ALTURA + '\n' + dedent(`
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
                    assert _altura(_uf.pai) <= int(math.log2(_n)), f"altura {_altura(_uf.pai)} com {_n} elementos passa de log2(n)"
              `),
            },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e3-uf-desafio',
          kind: 'code',
          lang: 'python',
          prompt: 'Depois de uma enchente, a cidade foi dividida numa grade de `linhas × colunas` quarteirões, todos alagados. A cada hora a Defesa Civil libera um quarteirão: `liberacoes[k]` é a posição `(linha, coluna)` liberada na hora k + 1. Escreva `hora_da_rota(linhas, colunas, liberacoes)`, que devolve a **primeira hora** em que passa a existir um caminho de quarteirões liberados (andando para cima, para baixo, para a esquerda ou para a direita) de algum quarteirão da linha 0 até algum da última linha; se isso nunca acontecer, devolva -1. Um quarteirão pode aparecer mais de uma vez na lista. A grade pode ter 100 × 100 quarteirões, com 10 000 liberações: rodar uma busca completa depois de cada hora é lento demais.',
          difficulty: 'desafio',
          skills: ['ed-grafos'],
          hints: [
            'Rodar uma BFS depois de cada liberação custaria quanto, numa grade com 10 000 quarteirões? O que muda de uma hora para a outra?',
            'As ligações entre quarteirões livres só aparecem, nunca somem. Que estrutura responde "estão no mesmo grupo?" nesse cenário? Para usá-la, como transformar (linha, coluna) num único número?',
            'Perguntar se algum quarteirão de cima está no mesmo grupo de algum de baixo exigiria testar muitos pares. E se existissem dois elementos extras, um ligado a toda a linha de cima e outro a toda a linha de baixo?',
            'Ao liberar um quarteirão, una-o aos vizinhos já liberados (e aos elementos extras, se ele estiver na primeira ou na última linha). Cuidado com quarteirões liberados duas vezes e com a grade de uma linha só.',
          ],
          explanation: 'Cada quarteirão (l, c) vira o elemento l · colunas + c, e mais dois elementos virtuais representam "a linha de cima" e "a linha de baixo". Liberar um quarteirão custa no máximo quatro uniões (com os vizinhos já liberados e, na primeira ou na última linha, com o elemento virtual daquela borda; quem está na borda tem menos vizinhos), e a pergunta "já há rota?" é um único find(TOPO) == find(FUNDO). Total: O(k · α(n)) para k liberações, contra O(k · n) refazendo uma BFS a cada hora. É o modelo clássico de percolação: com liberações em ordem aleatória numa grade grande, a rota aparece quando cerca de 59% dos quarteirões estão livres.',
          starter: dedent(`
            def hora_da_rota(linhas, colunas, liberacoes):
                # liberacoes[k] = (linha, coluna) liberada na hora k + 1
                # devolva a primeira hora em que há caminho de quarteirões livres
                # da linha 0 até a última linha, ou -1
                pass
          `),
          solution: dedent(`
            def hora_da_rota(linhas, colunas, liberacoes):
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
                return -1
          `),
          tests: [
            {
              name: 'grades mínimas',
              code: dedent(`
                assert hora_da_rota(1, 1, [(0, 0)]) == 1, "grade 1 x 1: o único quarteirão está na primeira e na última linha; a rota existe na hora 1"
                assert hora_da_rota(1, 1, []) == -1, "sem liberações, nunca há rota: -1"
                assert hora_da_rota(1, 5, [(0, 3)]) == 1, "com uma linha só, qualquer quarteirão liberado já liga a linha 0 à última"
                assert hora_da_rota(3, 1, [(0, 0), (2, 0), (1, 0)]) == 3, "numa coluna de 3, a rota só existe quando o meio é liberado, na hora 3"
              `),
            },
            {
              name: 'grades retangulares',
              code: dedent(`
                _r = hora_da_rota(2, 3, [(0, 2), (1, 0), (1, 2)])
                assert _r == 3, f"numa grade 2 x 3, (0, 2) e (1, 0) não são vizinhos; a rota surge na hora 3, com (1, 2). Veio {_r}: confira quem são os vizinhos de cada quarteirão e a conta que transforma (linha, coluna) num número"
                _r = hora_da_rota(3, 2, [(0, 1), (2, 0), (1, 1), (1, 0)])
                assert _r == 4, f"numa grade 3 x 2, a rota (0, 1) -> (1, 1) -> (1, 0) -> (2, 0) surge na hora 4; veio {_r}"
              `),
            },
            {
              name: 'diagonal não liga; repetição conta a hora',
              code: dedent(`
                assert hora_da_rota(2, 2, [(0, 0), (1, 1)]) == -1, "(0, 0) e (1, 1) só se tocam na diagonal: não há rota"
                assert hora_da_rota(2, 2, [(0, 0), (1, 1), (0, 1)]) == 3, "na hora 3, (0, 1) liga (0, 0) a (1, 1)"
                assert hora_da_rota(2, 1, [(0, 0), (0, 0), (1, 0)]) == 3, "liberar de novo um quarteirão já livre não muda nada, mas a hora passa"
              `),
            },
            {
              name: 'exemplo 3 × 3',
              code: dedent(`
                _r = hora_da_rota(3, 3, [(1, 1), (0, 2), (2, 0), (1, 0), (0, 1), (2, 2)])
                assert _r == 5, f"a rota (0, 1) -> (1, 1) -> (1, 0) -> (2, 0) surge na hora 5; veio {_r}"
              `),
            },
            {
              name: '200 grades aleatórias',
              code: REF_ROTA + '\n' + dedent(`
                import random
                _rng = random.Random(29)
                for _ in range(200):
                    _R, _C = _rng.randint(1, 6), _rng.randint(1, 6)
                    _libs = [(_rng.randrange(_R), _rng.randrange(_C)) for _ in range(_rng.randint(0, _R * _C + 3))]
                    _esperado = _ref_hora(_R, _C, _libs)
                    _r = hora_da_rota(_R, _C, _libs)
                    assert _r == _esperado, f"hora_da_rota({_R}, {_C}, {_libs}) devolveu {_r}; esperado {_esperado}"
              `),
            },
            {
              name: 'grade grande (100 × 100)',
              code: REF_ROTA + '\n' + dedent(`
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
                assert _r == _lo, f"na grade 100 x 100 a rota surge na hora {_lo}; veio {_r}"
              `),
            },
            {
              name: 'grade grande, liberada de cima para baixo',
              code: dedent(`
                # linhas 0 a 97 inteiras (9 800 horas), depois a linha 99 (100 horas), e por fim um quarteirão da linha 98
                _libs = [(l, c) for l in range(98) for c in range(100)] + [(99, c) for c in range(100)] + [(98, 37)]
                _r = hora_da_rota(100, 100, _libs)
                assert _r == 9901, f"a rota só surge quando (98, 37) liga o bloco de cima à linha 99, na hora 9901; veio {_r}"
              `),
            },
          ],
        },
      },
    ],
    projeto: [
      md('**Mini-projeto: o limiar de percolação.** Com o seu `hora_da_rota`, rode 200 simulações em grades n × n com as liberações em ordem aleatória (`random.shuffle`) e calcule a fração média de quarteirões livres no momento em que a rota aparece. Repita para n = 10, 50 e 100: os valores se aproximam de 0,5927, o limiar de percolação da grade quadrada, um número para o qual não se conhece fórmula exata e que é estimado justamente por simulações como esta. **Extensão**: gere labirintos com Union-Find. Comece com todas as paredes entre células vizinhas, embaralhe as paredes e derrube cada uma que separa células de grupos diferentes. O resultado é um labirinto em que todo par de células tem exatamente um caminho (é o algoritmo de Kruskal com pesos aleatórios).'),
    ],
    revisao: [
      md(`
        - Union-Find (DSU): grupos disjuntos guardados como árvores numa lista \`pai\`; a raiz é o representante.
        - find sobe até a raiz; union liga a raiz de um grupo na raiz do outro (as **raízes**, não os elementos). "Mesmo grupo?" é find(x) == find(y).
        - União por tamanho: a árvore menor vai para baixo da maior; altura ≤ ⌊log₂ n⌋, porque cada descida de nível pelo menos dobra o grupo.
        - Compressão de caminho: no find, todos do caminho passam a apontar para a raiz. Com os dois truques, O(α(n)) amortizado por operação, α(n) ≤ 4 na prática.
        - Receitas: contar grupos (n menos as uniões que juntaram grupos diferentes); aresta com as duas pontas no mesmo grupo fecha um ciclo (base do Kruskal).
        - Não faz: desunir, mostrar caminhos, alcance em grafo direcionado.
      `),
      english(`
        **Vocabulary**: *disjoint sets*, *union-find / disjoint-set union (DSU)*, *find*, *union*, *representative*, *union by size* / *union by rank*, *path compression*, *path halving*, *inverse Ackermann function*, *dynamic connectivity*.

        In CLRS, a disjoint-set data structure maintains a collection of disjoint dynamic sets, and each set is identified by a *representative*, which is some member of the set.

        Typical interview sentence: "With union by rank and path compression, each operation runs in O(α(n)) amortized time, which is effectively constant for any realistic input."
      `),
    ],
  },
  review: [
    ['Quais são as duas operações do Union-Find e o que cada uma responde?', 'find(x): qual é o representante (a raiz) do grupo de x. union(x, y): junta os grupos de x e y. "Estão ligados?" é find(x) == find(y).'],
    ['Por que a união por tamanho limita a altura a log₂ n?', 'Um elemento só desce um nível quando o grupo dele é pendurado num grupo pelo menos do mesmo tamanho; o grupo dele dobra a cada descida, e isso só cabe log₂ n vezes.'],
    ['O que a compressão de caminho faz, e quem ela não alcança?', 'No find, depois de achar a raiz, faz cada elemento do caminho apontar direto para ela. Elementos fora do caminho de algum find continuam onde estavam.'],
    ['Qual o custo do Union-Find com união por tamanho e compressão de caminho?', 'O(α(n)) amortizado por operação, em que α é a inversa da função de Ackermann (no máximo 4 na prática): quase constante.'],
    ['Como o Union-Find detecta que uma nova aresta fecha um ciclo num grafo não direcionado?', 'Se as duas pontas já têm o mesmo representante antes da união, a aresta é redundante: fecha um ciclo.'],
    ['Por que union precisa ligar as raízes, e não os próprios x e y? E por que comparar os tamanhos das raízes?', 'Mudar o pai de x (que não é raiz) o separa do resto do grupo; ligar as raízes junta os grupos inteiros. E o tamanho só é mantido atualizado nas raízes.'],
    ['Cite três coisas que o Union-Find não faz.', 'Não remove ligações (não desune), não mostra o caminho entre dois elementos e não responde alcance em grafos direcionados.'],
    ['Num problema de grade em que se pergunta se a linha de cima alcança a de baixo, qual o truque para não testar todos os pares?', 'Criar dois elementos virtuais, um unido a toda a linha de cima e outro a toda a de baixo, e perguntar se os dois estão no mesmo grupo.'],
  ],
  references: ['clrs', 'sedgewick-algs', 'stanford-cs161'],
});

export const lessons: Lesson[] = [dfsAFundo, unionFind];
