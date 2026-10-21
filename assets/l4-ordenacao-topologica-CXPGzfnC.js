var e={id:`l4-ordenacao-topologica`,moduleId:`m4-6`,title:`Ordenação topológica: dependências na ordem certa`,titleEn:`Topological sort: dependencies in the right order`,summary:`Ordenar tarefas que dependem umas das outras com o algoritmo de Kahn (graus de entrada e uma fila) ou pela pós-ordem invertida da DFS, acusar dependência circular pelo que sobra, contar semestres e usar a ordem topológica para achar caminhos mínimos e o caminho crítico de um DAG em O(V + E), mesmo com pesos negativos.`,minutes:50,objectives:[`Explicar o que é uma ordenação topológica e por que ela existe se e somente se o grafo direcionado não tem ciclo`,`Implementar o algoritmo de Kahn com graus de entrada e fila em O(V + E) e usar o que sobra dele para acusar dependência circular`,`Obter uma ordenação topológica pela pós-ordem invertida da DFS e escolher entre as duas versões`,`Calcular o menor número de rodadas (semestres) de um plano com dependências, esperando sempre o último pré-requisito`,`Relaxar arestas em ordem topológica para achar caminhos mínimos e o caminho crítico de um DAG, inclusive com pesos negativos`],skills:[`alg-grafos`],terms:[{pt:`ordenação topológica`,en:`topological sort`,def:`Lista com todos os vértices de um grafo direcionado em que, para toda aresta u → v, u aparece antes de v.`,example:`A topological sort of a DAG is a linear ordering of its vertices such that for every directed edge u → v, u comes before v.`},{pt:`fonte`,en:`source`,def:`Vértice com grau de entrada zero: nada precisa vir antes dele.`},{pt:`grau de entrada`,en:`in-degree`,def:`Número de arestas que chegam a um vértice; numa grade curricular, quantos pré-requisitos uma disciplina tem.`,example:`Kahn's algorithm starts from every vertex whose in-degree is zero.`},{pt:`algoritmo de Kahn`,en:`Kahn's algorithm`,def:`Ordenação topológica que repete: tire da fila um vértice sem dependências pendentes, coloque-o na ordem e desconte 1 do grau de entrada de cada vizinho.`},{pt:`pós-ordem invertida`,en:`reverse postorder`,def:`A ordem em que a DFS termina os vértices, lida de trás para frente; num DAG, é uma ordenação topológica.`,example:`The reverse postorder of a depth-first search of a DAG is a topological order.`},{pt:`caminho crítico`,en:`critical path`,def:`Num projeto com tarefas dependentes, a cadeia de tarefas de maior duração total; ela define o prazo mínimo, e atrasar qualquer tarefa dela atrasa o projeto.`,example:`Any delay on the critical path delays the whole project.`},{pt:`folga`,en:`slack`,def:`Quanto uma tarefa pode atrasar sem atrasar o projeto; as tarefas do caminho crítico têm folga zero.`,example:`Tasks with zero slack are on the critical path.`}],references:[`clrs`,`sedgewick-algs`,`mit-6006`,`python-docs`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Toda grade curricular tem regras como "Cálculo 2 só depois de Cálculo 1". Toda obra também: o reboco vem depois da parede, a pintura depois do reboco. Quando você roda \`pip install\`, as bibliotecas de que um pacote depende são instaladas antes dele; quando você muda uma célula de uma planilha, as fórmulas que dependem dela são recalculadas depois dela. Nos quatro casos, a pergunta é a mesma: **em que ordem fazer as coisas para que cada uma venha depois de tudo de que ela depende?**

Modele as dependências como um grafo direcionado em que a aresta u → v quer dizer "u vem antes de v". Uma {{ordenação topológica|topological sort}} é uma lista com todos os vértices em que **toda aresta aponta para a frente**. Ela existe exatamente quando o grafo não tem ciclo, isto é, quando ele é um DAG: com um pré-requisito circular, nenhuma ordem serve, e o melhor que um programa pode fazer é avisar onde está o problema.

No nível 3, a DFS de três cores **detectou** ciclos. Nesta lição você vai **produzir** a ordem em O(V + E), calcular o menor número de semestres de um curso e descobrir quais tarefas de uma obra não podem atrasar nem um dia. E vai ver que, num DAG, a ordem topológica acha caminhos mínimos mais depressa que o Dijkstra da lição anterior, inclusive com pesos negativos.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`### Quando existe uma ordem
Se o grafo tem um ciclo A → B → C → A, A teria de vir antes de B, B antes de C e C antes de A: impossível. Se não tem ciclo, a ordem sempre existe, e o argumento já é um algoritmo:

1. Todo DAG com pelo menos um vértice tem uma {{fonte|source}}, um vértice com {{grau de entrada|in-degree}} zero (nenhuma aresta chega nele). Por quê? Comece em qualquer vértice e ande **para trás**, sempre por uma aresta que chega. Se todo vértice tivesse uma aresta chegando, a caminhada nunca pararia; mas, com V vértices, depois de V passos algum vértice já teria se repetido, e a repetição fecharia um ciclo.
2. Uma fonte pode ir para o começo da lista: nada precisa vir antes dela.
3. Tirando a fonte e as arestas que saem dela, sobra um grafo que continua sem ciclo. Repita até acabar.

### O algoritmo de Kahn
Apagar vértices do grafo de verdade seria caro. O {{algoritmo de Kahn|Kahn's algorithm}} (Arthur Kahn, 1962) só **conta**: guarda o grau de entrada de cada vértice e, quando um vértice entra na ordem, desconta 1 do grau de cada vizinho. Quem chega a zero acabou de virar fonte.

1. Calcule o grau de entrada de todos os vértices.
2. Ponha numa fila todos os de grau zero.
3. Enquanto a fila não estiver vazia: tire um vértice v e acrescente-o à ordem; para cada aresta v → w, faça \`grau[w] -= 1\` e, se o grau de w chegou a 0, ponha w na fila.
4. Se a ordem ficou com os V vértices, ela é topológica. Se faltou alguém, o grafo tem ciclo.`},{type:`table`,head:[`Etapa`,`Quantas vezes acontece`,`Custo`],rows:[[`calcular os graus de entrada`,`uma passada por todos os vértices e arestas`,`O(V + E)`],[`entrar e sair da fila`,`no máximo uma vez por vértice`,`O(V)`],[`descontar um grau`,`uma vez por aresta, quando a origem dela sai da fila`,`O(E)`],[`total`,`—`,`O(V + E) de tempo; além da lista de adjacência, O(V) de memória para os graus, a fila e a ordem`]],caption:`Um vértice só entra na fila quando o grau dele chega a zero, e isso acontece uma vez; cada aresta é olhada uma vez na contagem e uma vez no desconto.`},{type:`md`,text:`### O que sobra quando há ciclo
Num ciclo, cada vértice espera pelo anterior: o grau dele só pode chegar a zero depois que o anterior sair da fila, e o anterior está esperando pelo anterior dele. Nenhum chega a zero. Ficam de fora os vértices dos ciclos **e todos os que dependem deles**, direta ou indiretamente. Ou seja, o Kahn prova que existe ciclo, mas a lista do que sobrou pode ter mais vértices do que o ciclo.

Para apontar o ciclo exato, use o fato de que todo vértice que sobrou ainda tem grau maior que zero, isto é, tem um predecessor que também sobrou. Comece em qualquer um deles e ande para trás, sempre para um predecessor que sobrou: em algum momento um vértice se repete, e o trecho entre as duas visitas é um ciclo. (A DFS de três cores do nível 3 também entrega o ciclo diretamente.)`},{type:`callout`,tone:`warn`,text:'Se o grafo vem como dict "vértice → lista de quem vem depois", a última disciplina do curso (o TCC, por exemplo) pode aparecer só dentro das listas, sem ser chave do dict. Um Kahn que só conhece as chaves quebra (`KeyError` ao somar o grau dela) ou devolve uma ordem sem ela. Monte o conjunto de vértices com as chaves **e** os vizinhos, ou receba a lista de vértices separada, como nos exercícios desta lição.',title:`Vértices que só aparecem de um lado`},{type:`callout`,tone:`warn`,text:`Aqui, u → v quer dizer "u antes de v". Na lição de DFS do nível 3, o dict era "disciplina → o que ela exige", o sentido contrário. Com as arestas nesse sentido, o mesmo Kahn devolve a ordem de trás para frente (o TCC primeiro, Cálculo 1 por último): inverta as arestas ou inverta a lista no fim. Antes de programar, escreva numa linha o que uma aresta significa.`,title:`Sentido das arestas`},{type:`md`,text:`### Pela DFS: pós-ordem invertida
A DFS também ordena. Lembre que, na DFS recursiva, um vértice só **sai** (fica preto) depois de tudo o que é alcançável a partir dele. Num DAG, para cada aresta u → v, v sai antes de u:

- se v ainda estava branco quando a DFS olhou a aresta, ele é descoberto a partir de u e termina antes de u terminar;
- se v já estava preto, ele já tinha saído;
- v não pode estar cinza: seria uma aresta de retorno, e o grafo teria ciclo.

Então, na ordem de saída, toda aresta aponta para **trás**. Lida de trás para frente, essa ordem é a {{pós-ordem invertida|reverse postorder}}, uma ordenação topológica. Era isso que a lição de DFS do nível 3 antecipava: lá as arestas apontavam para o que cada disciplina exige, e por isso a própria ordem de saída já servia como ordem de estudo.`},{type:`table`,head:[`Critério`,`Kahn`,`DFS (pós-ordem invertida)`],rows:[[`Custo`,`O(V + E)`,`O(V + E)`],[`Ciclo`,`sobra vértice: a ordem tem menos de V`,`precisa das três cores: uma aresta para um vértice cinza`],[`Pilha de chamadas`,`nenhuma recursão, só uma fila`,`a versão recursiva empilha até V chamadas (RecursionError perto de 1 000 no Python); em grafos grandes, use pilha explícita`],[`Escolher entre empates`,`troque a fila por um heap e tire sempre a fonte de menor nome ou de maior prioridade`,`a ordem sai do jeito que a DFS visitou; difícil de controlar`],[`Rodadas (o que pode ser feito em paralelo)`,`saem naturalmente, processando a fila por rodadas`,`não saem diretamente`]]},{type:`md`,text:`### Uma ordem ou várias?
Um DAG costuma ter muitas ordenações topológicas: duas disciplinas sem relação entre si podem vir em qualquer ordem. Por isso, quem testa uma ordenação topológica confere se **toda aresta aponta para a frente**, e não se a lista é igual a uma resposta fixa. A ordem é única exatamente quando, a cada passo do Kahn, a fila tem um vértice só, o que equivale a existir um caminho que passa por todos os vértices.

Se você precisa de uma ordem previsível (a primeira em ordem alfabética, por exemplo), troque a fila por um heap: a cada passo sai a fonte de menor nome. Cada vértice entra e sai do heap uma vez, e o custo vira O(V log V + E).

### Rodadas: o menor número de semestres
Suponha que num semestre dá para cursar quantas disciplinas você quiser, desde que os pré-requisitos de cada uma tenham sido concluídos em semestres **anteriores**. Qual é o mínimo de semestres?

Rode o Kahn **por rodadas**: o 1º semestre são as fontes; o 2º, as disciplinas que chegaram a grau zero durante o 1º; e assim por diante. Em forma de conta: o semestre de uma disciplina é 1 mais o **maior** semestre entre os pré-requisitos dela (1 para as fontes). O que manda é o máximo: uma disciplina espera pelo pré-requisito que fica pronto **por último**. O total de semestres é o número de vértices do caminho mais longo do DAG.`},{type:`callout`,tone:`warn`,text:`A BFS a partir das fontes **não** resolve: ela marca cada vértice na primeira vez que o alcança, isto é, pelo caminho mais **curto**. Uma disciplina com um pré-requisito do 1º semestre e outro do 3º iria para o 2º semestre, antes de um dos seus pré-requisitos.`,title:`Primeiro pré-requisito × último pré-requisito`},{type:`md`,text:`### Caminhos em DAG: relaxar na ordem certa
O Dijkstra precisa de um heap porque não sabe de antemão em que ordem as distâncias ficam prontas. Num DAG você sabe: processando os vértices em ordem topológica, quando chega a vez de v, **todas** as arestas que chegam em v já foram relaxadas, porque saem de vértices que vêm antes na ordem. Então dist[v] já é definitiva, e basta relaxar as arestas que saem de v:`},{type:`code`,lang:`text`,code:`dist[origem] = 0;  dist[todos os outros] = ∞
para cada v, na ordem topológica:
    se dist[v] < ∞:
        para cada aresta v → w com peso p:
            dist[w] = min(dist[w], dist[v] + p)`,runnable:!1},{type:`md`,text:`Cada aresta é relaxada uma vez: O(V + E), sem heap. E repare que o argumento não usou "pesos ≥ 0" em lugar nenhum, só a ordem: **pesos negativos funcionam** (um trecho com cashback maior que o preço, um desconto). Trocando min por max e ∞ por −∞, o mesmo laço acha o caminho **mais longo**, problema que em grafos com ciclos é NP-difícil (não se conhece algoritmo eficiente), mas num DAG sai em tempo linear.`},{type:`table`,head:[`Grafo e pesos`,`Algoritmo`,`Custo`],rows:[[`qualquer, sem pesos`,`BFS`,`O(V + E)`],[`qualquer, pesos ≥ 0`,`Dijkstra com heap`,`O((V + E) log V)`],[`DAG, pesos quaisquer (inclusive negativos)`,`relaxar em ordem topológica`,`O(V + E)`],[`com ciclos e pesos negativos`,`Bellman-Ford`,`O(V · E)`]],caption:`Menor caminho a partir de uma origem: quanto mais você sabe sobre o grafo, mais barato fica.`},{type:`md`,text:`### Caminho crítico
Numa obra, cada tarefa tem uma duração, e tarefas que não dependem uma da outra podem andar ao mesmo tempo, com equipes diferentes. O prazo mínimo da obra é a duração da cadeia de dependências mais **longa**, o {{caminho crítico|critical path}}. É um caminho mais longo num DAG, com o peso nos vértices (as durações) em vez de nas arestas. Em ordem topológica:

- início[v] = o maior fim entre as tarefas de que v depende (0 se ela não depende de nenhuma);
- fim[v] = início[v] + duração[v];
- prazo = o maior fim entre todas as tarefas.

Tarefas fora do caminho crítico têm {{folga|slack}}: podem começar um pouco mais tarde sem atrasar a entrega. A folga sai com a mesma ideia, de trás para frente: o início mais tarde que não atrasa ninguém, menos o início mais cedo. É o método do caminho crítico (*CPM*), usado em gestão de projetos desde o fim dos anos 1950.`},{type:`callout`,tone:`deep`,text:`Sem ordem topológica, não há como saber a ordem certa de relaxar. O **Bellman-Ford** resolve na força: relaxa **todas** as arestas, em qualquer ordem, e repete isso V − 1 vezes.

- Depois da rodada k, dist[v] é no máximo o custo do melhor caminho da origem até v com até k arestas. Um caminho mínimo sem ciclo tem no máximo V − 1 arestas; então, se não houver ciclo negativo, V − 1 rodadas bastam.
- Custo: O(V · E). Dá para parar mais cedo se uma rodada inteira não mudar nada.
- Se uma V-ésima rodada ainda melhora alguma distância, existe um **ciclo de custo negativo** alcançável a partir da origem, e "menor caminho" deixa de fazer sentido: cada volta no ciclo baixa o custo de novo. Em câmbio, com o peso de cada troca igual a −log da taxa, um ciclo negativo é uma oportunidade de arbitragem.

Num DAG, a ordem topológica é justamente uma ordem em que **uma única** rodada de relaxamentos já basta.`,title:`E se o grafo tiver ciclos? Bellman-Ford`}]},{stage:`exemplo`,blocks:[{type:`md`,text:`Oito disciplinas de um curso de computação (CAL = Cálculo, PROG = Programação, MD = Matemática Discreta, ED = Estruturas de Dados, ALG = Algoritmos, PROB = Probabilidade, IA = Inteligência Artificial), na ordem CAL1, PROG, MD, CAL2, ED, ALG, PROB, IA, com u → v querendo dizer "u é pré-requisito de v":

CAL1 → CAL2, PROG → ED, MD → ALG, ED → ALG, CAL2 → PROB, ALG → IA e PROB → IA.

Os graus de entrada começam assim: CAL1, PROG e MD têm 0; CAL2, ED e PROB têm 1; ALG e IA têm 2. A fila começa com as três fontes, na ordem em que aparecem na lista de disciplinas.`},{type:`table`,head:[`Passo`,`Sai da fila`,`Graus que caem`,`Fila depois`],rows:[[`0`,`—`,`início: CAL1, PROG e MD têm grau 0`,`CAL1, PROG, MD`],[`1`,`CAL1`,`CAL2: 1 → 0 (entra)`,`PROG, MD, CAL2`],[`2`,`PROG`,`ED: 1 → 0 (entra)`,`MD, CAL2, ED`],[`3`,`MD`,`ALG: 2 → 1 (ainda espera ED)`,`CAL2, ED`],[`4`,`CAL2`,`PROB: 1 → 0 (entra)`,`ED, PROB`],[`5`,`ED`,`ALG: 1 → 0 (entra)`,`PROB, ALG`],[`6`,`PROB`,`IA: 2 → 1`,`ALG`],[`7`,`ALG`,`IA: 1 → 0 (entra)`,`IA`],[`8`,`IA`,`—`,`vazia`]],caption:`Ordem: CAL1, PROG, MD, CAL2, ED, PROB, ALG, IA. Oito de oito disciplinas: não há ciclo.`},{type:`md`,text:`Cada aresta foi descontada uma vez, e cada disciplina entrou e saiu da fila uma vez. Repare no passo 3: tirar MD da fila baixa o grau de ALG para 1, mas ALG ainda espera ED.

**Semestres.** Agora por rodadas, com o semestre de cada disciplina igual a 1 mais o maior semestre entre os pré-requisitos dela:`},{type:`table`,head:[`Disciplina`,`Pré-requisitos (semestre deles)`,`Semestre`],rows:[[`CAL1, PROG, MD`,`—`,`1`],[`CAL2`,`CAL1 (1)`,`2`],[`ED`,`PROG (1)`,`2`],[`ALG`,`MD (1) e ED (2)`,`3: espera ED, o último a ficar pronto`],[`PROB`,`CAL2 (2)`,`3`],[`IA`,`ALG (3) e PROB (3)`,`4`]]},{type:`md`,text:`Quatro semestres: o número de vértices do caminho mais longo (PROG → ED → ALG → IA, ou CAL1 → CAL2 → PROB → IA). Se ALG olhasse só para MD, iria para o 2º semestre, junto com ED, que é pré-requisito dela.

**Um cadastro errado.** Alguém registra IA como pré-requisito de CAL2 (a aresta IA → CAL2). Agora CAL2 tem grau 2. O Kahn tira CAL1 (CAL2 cai para 1), PROG, MD, ED e ALG (IA cai para 1), e a fila esvazia com 5 das 8 disciplinas. Sobraram CAL2, PROB e IA, cada uma ainda com grau 1. Andando para trás a partir de CAL2: quem segura CAL2 é IA, quem segura IA é PROB, quem segura PROB é CAL2. O ciclo é CAL2 → PROB → IA → CAL2.

**A reforma.** Uma reforma de apartamento com sete tarefas, durações em dias. Na ordem topológica, cada tarefa começa quando a última das suas dependências termina:`},{type:`table`,head:[`Tarefa`,`Dias`,`Depende de`,`Início`,`Fim`,`Folga`],rows:[[`demolição`,`3`,`—`,`0`,`3`,`0`],[`elétrica`,`4`,`demolição`,`3`,`7`,`1`],[`hidráulica`,`5`,`demolição`,`3`,`8`,`0`],[`reboco`,`3`,`elétrica, hidráulica`,`max(7, 8) = 8`,`11`,`0`],[`piso`,`4`,`hidráulica`,`8`,`12`,`1`],[`pintura`,`2`,`reboco`,`11`,`13`,`0`],[`limpeza`,`1`,`pintura, piso`,`max(13, 12) = 13`,`14`,`0`]],caption:`Prazo mínimo: 14 dias. Caminho crítico: demolição → hidráulica → reboco → pintura → limpeza (3 + 5 + 3 + 2 + 1 = 14).`},{type:`md`,text:`A elétrica pode atrasar 1 dia sem consequência (o reboco só começa no dia 8, esperando a hidráulica), e o piso também tem 1 dia de folga. Já um dia de atraso na hidráulica empurra a entrega para o dia 15: é ali que a gerente da obra precisa prestar atenção.`}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`from collections import deque

def kahn(disciplinas, prereqs):
    depois = {d: [] for d in disciplinas}
    grau = {d: 0 for d in disciplinas}
    for antes, dep in prereqs:
        depois[antes].append(dep)
        grau[dep] += 1
    fila = deque(d for d in disciplinas if grau[d] == 0)
    ordem = []
    while fila:
        v = fila.popleft()
        ordem.append(v)
        for w in depois[v]:
            grau[w] -= 1
            if grau[w] == 0:
                fila.append(w)
    if len(ordem) < len(disciplinas):
        print("ciclo! sobraram:", [d for d in disciplinas if grau[d] > 0])
        return None
    return ordem

disciplinas = ["CAL1", "PROG", "MD", "CAL2", "ED", "ALG", "PROB", "IA"]
prereqs = [("CAL1", "CAL2"), ("PROG", "ED"), ("MD", "ALG"), ("ED", "ALG"),
           ("CAL2", "PROB"), ("ALG", "IA"), ("PROB", "IA")]
print(kahn(disciplinas, prereqs))
print(kahn(disciplinas, prereqs + [("IA", "CAL2")]))   # cadastro errado`,runnable:!0,caption:`Mude a ordem da lista de disciplinas e veja a ordem de saída mudar, sempre válida. A aresta errada IA → CAL2 deixa três disciplinas de fora.`},{type:`code`,lang:`python`,code:`import heapq
from graphlib import TopologicalSorter

# custo de cada trecho já com o cashback: negativo = o trecho dá dinheiro de volta
g = {"S": [("A", 2), ("B", 5)], "B": [("A", -4)], "A": [("C", 1)], "C": []}

def menores_custos_dag(g, origem):
    ts = TopologicalSorter()
    for v in g:
        ts.add(v)
        for w, _ in g[v]:
            ts.add(w, v)                  # v vem antes de w
    dist = {v: float("inf") for v in g}
    dist[origem] = 0
    for v in ts.static_order():
        if dist[v] == float("inf"):
            continue                      # inalcançável a partir da origem
        for w, p in g[v]:
            dist[w] = min(dist[w], dist[v] + p)
    return dist

def dijkstra_ate(g, a, b):                # o custo_minimo do desafio da lição anterior
    dist = {a: 0}
    heap = [(0, a)]
    while heap:
        d, v = heapq.heappop(heap)
        if v == b:
            return d
        if d > dist[v]:
            continue
        for w, p in g[v]:
            if d + p < dist.get(w, float("inf")):
                dist[w] = d + p
                heapq.heappush(heap, (d + p, w))
    return None

print("em ordem topológica:", menores_custos_dag(g, "S"))
print("Dijkstra até A:", dijkstra_ate(g, "S", "A"), "(errado: S → B → A custa 5 − 4 = 1)")`,runnable:!0,caption:`O Dijkstra que para ao tirar o destino do heap confia que nenhum caminho ainda na fila pode ficar mais barato; a aresta de −4 quebra essa confiança. A ordem topológica não depende do sinal dos pesos.`},{type:`md`,text:`Um detalhe para quem gosta de casos de canto: a versão do Dijkstra do **exemplo** da lição anterior, que aceita reprocessar um vértice quando a distância dele melhora, acaba acertando quando não há ciclo negativo (com um ciclo negativo alcançável, ela nem termina). O preço é perder a garantia de custo: existem grafos com arestas negativas em que ela reprocessa vértices um número exponencial de vezes. Num DAG, a ordem topológica resolve em O(V + E), sem surpresas.`},{type:`callout`,tone:`tip`,text:'A biblioteca padrão tem a ordenação topológica pronta: `graphlib.TopologicalSorter`, usada no segundo programa. Ela recebe o grafo no sentido "vértice → seus **predecessores**" (o do nível 3, "o que cada um exige") ou aresta por aresta com `ts.add(depois, antes)`. `static_order()` devolve um iterador com a ordem; se houver ciclo, ele levanta `CycleError` assim que você começa a percorrê-lo, com um ciclo em `erro.args[1]`. Nos exercícios, implemente o Kahn você mesmo; no dia a dia, use a biblioteca.',title:`graphlib`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e4-topo-1`,kind:`mcq`,prompt:'Na grade abaixo, `u → v` quer dizer "u é pré-requisito de v". Qual destas listas é uma ordenação topológica válida?',code:{lang:`text`,code:`CAL1 → CAL2      CAL2 → FIS2      PROG → ED
CAL1 → FIS1      FIS1 → FIS2      ED → ALG`},difficulty:`facil`,skills:[`alg-grafos`],hints:[`O que precisa ser verdade para toda aresta u → v numa ordenação topológica?`,`Confira as seis arestas em cada opção. Quais disciplinas têm dois pré-requisitos?`,`Uma ordem não ser única é o mesmo que ela não existir?`],explanation:`Na opção certa, as seis arestas apontam para a frente: CAL1 (1ª posição) vem antes de FIS1 (2ª) e de CAL2 (4ª); FIS1 e CAL2 vêm antes de FIS2 (6ª); PROG (3ª) vem antes de ED (5ª), que vem antes de ALG (7ª). Misturar as duas trilhas é permitido: entre disciplinas sem relação, qualquer ordem serve. Por isso um DAG costuma ter muitas ordenações topológicas, e uma lista só está errada se alguma aresta apontar para trás.`,options:[{text:`CAL1, FIS1, PROG, CAL2, ED, FIS2, ALG`,correct:!0,feedback:`Isso: todas as arestas apontam para a frente. Intercalar as trilhas de Cálculo/Física e de Programação não fere nenhum pré-requisito.`},{text:`CAL1, CAL2, FIS2, FIS1, PROG, ED, ALG`,feedback:`FIS2 tem dois pré-requisitos, CAL2 e FIS1, e precisa esperar os dois. Aqui ela aparece antes de FIS1: a aresta FIS1 → FIS2 aponta para trás.`},{text:`PROG, ED, ALG, FIS1, CAL1, CAL2, FIS2`,feedback:`Fazer uma trilha inteira primeiro é permitido, mas FIS1 aparece antes de CAL1, e CAL1 é pré-requisito dela.`},{text:`Nenhuma: as trilhas de Cálculo e de Programação são independentes, então não existe uma ordem única e, portanto, não há ordenação topológica`,feedback:`Não ser única não é não existir. Um grafo sem ciclo sempre tem pelo menos uma ordenação topológica, e em geral várias.`}]}},{type:`exercise`,exercise:{id:`e4-topo-2`,kind:`predict`,lang:`python`,prompt:`O que este programa imprime? Atenção à ordem em que as fontes entram na fila e ao segundo grafo.`,difficulty:`intermediario`,skills:[`alg-grafos`],hints:[`Comece pelos graus de entrada do primeiro grafo. Quais vértices têm grau zero, e em que ordem o gerador da fila os encontra?`,`A fila é FIFO: quem entra primeiro sai primeiro. Depois de tirar B, quem entra no fim da fila?`,`No segundo grafo, B e C dependem um do outro. Algum deles chega a grau zero?`],explanation:`No primeiro grafo, os graus são E = 2, D = 1, C = 2, B = 0 e A = 0; percorrendo as chaves na ordem do dict, a fila começa com B e depois A. Tirar B baixa C para 1 e D para 0 (D entra); tirar A baixa C para 0 (C entra, atrás de D); tirar D baixa E para 1; tirar C baixa E para 0. Resultado: B, A, D, C, E. No segundo grafo, D é a única fonte; tirar D libera A; tirar A baixa B de 2 para 1, e a fila esvazia. B e C ficam de fora, presos no ciclo B → C → B: a lista tem 2 dos 4 vértices, e é esse tamanho menor que V que denuncia o ciclo.`,code:`from collections import deque

def kahn(g):
    grau = {v: 0 for v in g}
    for v in g:
        for w in g[v]:
            grau[w] += 1
    fila = deque(v for v in g if grau[v] == 0)
    ordem = []
    while fila:
        v = fila.popleft()
        ordem.append(v)
        for w in g[v]:
            grau[w] -= 1
            if grau[w] == 0:
                fila.append(w)
    return ordem

print(kahn({"E": [], "D": ["E"], "C": ["E"], "B": ["C", "D"], "A": ["C"]}))
print(kahn({"A": ["B"], "B": ["C"], "C": ["B"], "D": ["A"]}))`,answer:`['B', 'A', 'D', 'C', 'E']
['D', 'A']`}},{type:`exercise`,exercise:{id:`e4-topo-3`,kind:`code`,lang:`python`,prompt:"A secretaria publica a ordem de estudo seguindo uma regra fixa: a cada passo, entre as disciplinas **já liberadas** (todos os pré-requisitos já estão na lista), entra a de menor nome em ordem alfabética, pela comparação de strings do Python.\n\nEscreva `ordem_alfabetica(disciplinas, prereqs)`: `disciplinas` é a lista de todas as disciplinas (nomes distintos) e `prereqs` é uma lista de pares `(antes, depois)`, que pode ter pares repetidos. Devolva a lista nessa ordem, ou `None` se houver pré-requisito circular. Meta: O(V log V + E). Não use `graphlib`.",difficulty:`intermediario`,skills:[`alg-grafos`],hints:[`Que estrutura do Kahn decide quem sai a seguir? Ela respeita a ordem alfabética?`,`Disciplinas liberadas no meio do caminho também concorrem. Ordenar só a fila inicial basta?`,`Qual estrutura entrega sempre o menor elemento e aceita inserções no meio do processo, em O(log n) cada?`,`Como saber, no fim, que houve um ciclo?`],explanation:"É o Kahn com um min-heap no lugar da fila: `heappop` entrega sempre a menor disciplina liberada, inclusive as que foram liberadas no meio do caminho. Cada disciplina entra e sai do heap uma vez, O(V log V), e cada par é descontado uma vez, O(E). Ordenar só a fila inicial não basta: com M → A e Z solta, a fila FIFO daria M, Z, A, mas A é liberada logo depois de M e tem nome menor que Z. Ordenar no fim a resposta de um Kahn comum também não: quebra as dependências. Se a lista final tem menos disciplinas que a entrada, sobrou alguém preso num ciclo. Pares repetidos funcionam desde que você conte e desconte cada par do mesmo jeito.",starter:`import heapq

def ordem_alfabetica(disciplinas, prereqs):
    # disciplinas: lista com todas as disciplinas (nomes distintos)
    # prereqs: lista de pares (antes, depois)
    # devolva a ordem em que, a cada passo, entra a disciplina liberada de menor nome,
    # ou None se houver pré-requisito circular
    pass`,solution:`import heapq

def ordem_alfabetica(disciplinas, prereqs):
    depois = {d: [] for d in disciplinas}
    grau = {d: 0 for d in disciplinas}
    for antes, dep in prereqs:
        depois[antes].append(dep)
        grau[dep] += 1
    livres = [d for d in disciplinas if grau[d] == 0]
    heapq.heapify(livres)
    ordem = []
    while livres:
        v = heapq.heappop(livres)
        ordem.append(v)
        for w in depois[v]:
            grau[w] -= 1
            if grau[w] == 0:
                heapq.heappush(livres, w)
    if len(ordem) < len(disciplinas):
        return None
    return ordem`,tests:[{name:`grade da lição`,code:`def _problema_na_ordem(ds, ps, r):
    if not isinstance(r, list):
        return f"a função devolveu {r!r}, e não uma lista"
    if sorted(r) != sorted(ds):
        return f"a lista {r} não tem cada disciplina exatamente uma vez"
    pos = {d: i for i, d in enumerate(r)}
    for a, b in ps:
        if pos[a] > pos[b]:
            return f"em {r}, {b} aparece antes de {a}, mas {a} é pré-requisito de {b}"
    return None
ds = ["CAL1", "PROG", "MD", "CAL2", "ED", "ALG", "PROB", "IA"]
ps = [("CAL1", "CAL2"), ("PROG", "ED"), ("MD", "ALG"), ("ED", "ALG"), ("CAL2", "PROB"), ("ALG", "IA"), ("PROB", "IA")]
r = ordem_alfabetica(ds, ps)
p = _problema_na_ordem(ds, ps, r)
assert p is None, p
esperado = ["CAL1", "CAL2", "MD", "PROB", "PROG", "ED", "ALG", "IA"]
assert r == esperado, f"a ordem {r} é válida, mas não é a da secretaria: esperado {esperado}"`},{name:`liberada no meio do caminho`,code:`r = ordem_alfabetica(["M", "Z", "A"], [("M", "A")])
assert r == ["M", "A", "Z"], f"esperado ['M', 'A', 'Z'], veio {r}: depois de M, a disciplina A fica liberada e tem nome menor que Z. A escolha é entre todas as liberadas naquele momento, inclusive as recém-liberadas"`},{name:`bordas: vazio, uma, sem pré-requisitos, pares repetidos`,code:`casos = [
    ([], [], [], "sem disciplinas, a ordem é a lista vazia (e não None: não há ciclo nenhum)"),
    (["X"], [], ["X"], "uma disciplina sem pré-requisitos"),
    (["c", "a", "b"], [], ["a", "b", "c"], "sem pré-requisitos, todas estão liberadas desde o início"),
    (["B", "A"], [("B", "A"), ("B", "A")], ["B", "A"], "com pares repetidos, conte e desconte o grau de forma consistente"),
    (["Q", "P", "R"], [("R", "P"), ("R", "P"), ("Q", "P")], ["Q", "R", "P"], "com pares repetidos, conte e desconte o grau de forma consistente"),
]
for ds, ps, esperado, dica in casos:
    r = ordem_alfabetica(ds, ps)
    assert r == esperado, f"ordem_alfabetica({ds}, {ps}) deu {r}, esperado {esperado}: {dica}"`},{name:`pré-requisito circular`,code:`casos = [
    (["A", "B"], [("A", "B"), ("B", "A")]),
    (["A"], [("A", "A")]),
    (["A", "B", "C", "D"], [("A", "B"), ("C", "D"), ("D", "C")]),
    (["A", "B", "C"], [("A", "B"), ("B", "C"), ("C", "B")]),
]
for ds, ps in casos:
    r = ordem_alfabetica(ds, ps)
    assert r is None, f"{ps} tem pré-requisito circular: esperado None, veio {r}"`},{name:`grades aleatórias`,code:`import random

def _ref(ds, ps):
    restantes = set(ds)
    ordem = []
    while restantes:
        livres = [d for d in restantes if not any(a in restantes and b == d for a, b in ps)]
        if not livres:
            return None
        v = min(livres)
        ordem.append(v)
        restantes.remove(v)
    return ordem

random.seed(7)
for _ in range(300):
    n = random.randint(1, 10)
    ds = random.sample("abcdefghijklmnop", n)
    perm = ds[:]
    random.shuffle(perm)
    ps = []
    for _ in range(random.randint(0, 2 * n)):
        i, j = sorted(random.sample(range(n), 2)) if n > 1 else (0, 0)
        if i < j:
            ps.append((perm[i], perm[j]))
    if n > 1 and random.random() < 0.25:
        i, j = sorted(random.sample(range(n), 2))
        ps.append((perm[j], perm[i]))
    esperado = _ref(ds, ps)
    r = ordem_alfabetica(ds, ps)
    assert r == esperado, f"ordem_alfabetica({ds}, {ps}) deu {r}, esperado {esperado}"`},{name:`3 000 disciplinas em corrente`,code:`import random
random.seed(3)
ds = [f"D{i:04d}" for i in range(3000)]
perm = ds[:]
random.shuffle(perm)
ps = [(perm[i], perm[i + 1]) for i in range(len(perm) - 1)]
random.shuffle(ps)
r = ordem_alfabetica(ds, ps)
assert r == perm, "com 3 000 disciplinas em corrente só existe uma ordem válida, e não foi essa que veio"`},{name:`1 000 disciplinas liberadas ao mesmo tempo`,code:`import random

class _Demais(BaseException):
    pass

class _Nome(str):
    """Nome de disciplina que conta as comparações feitas com ele."""
    comparacoes = 0
    def _conta(self):
        _Nome.comparacoes += 1
        if _Nome.comparacoes > 200_000:
            raise _Demais()
    def __lt__(self, outro):
        self._conta()
        return str.__lt__(self, outro)
    def __le__(self, outro):
        self._conta()
        return str.__le__(self, outro)
    def __gt__(self, outro):
        self._conta()
        return str.__gt__(self, outro)
    def __ge__(self, outro):
        self._conta()
        return str.__ge__(self, outro)

random.seed(37)
basicas = [_Nome(f"A{i:03d}") for i in range(1000)]
avancadas = [_Nome(f"B{i:03d}") for i in range(1000)]
ds = basicas + avancadas
random.shuffle(ds)
ps = [(random.choice(basicas), b) for b in avancadas]
random.shuffle(ps)
_Nome.comparacoes = 0
try:
    r = ordem_alfabetica(ds, ps)
except _Demais:
    raise AssertionError("com 2 000 disciplinas, 1 000 delas liberadas desde o início, sua função passou de 200 000 comparações entre nomes. Procurar a menor liberada percorrendo a lista inteira, ou reordenar a lista a cada disciplina liberada, custa O(V) por passo e O(V²) no total. Qual estrutura entrega a menor e aceita inserções em O(log V)?")
_Nome.comparacoes = -10 ** 9
esperado = sorted(basicas) + sorted(avancadas)
assert r == esperado, "as 1 000 básicas (A000 a A999) estão liberadas desde o início e vêm antes de qualquer avançada (B000 a B999) em ordem alfabética; depois vêm as avançadas, também em ordem alfabética"`},{name:`sem atalhos`,code:`assert "graphlib" not in _source, "não use graphlib: o exercício é implementar o Kahn com um heap"`}]}},{type:`exercise`,exercise:{id:`e4-topo-4`,kind:`fix`,lang:`python`,prompt:"`semestres(disciplinas, prereqs)` deveria devolver um dict com o **menor** semestre em que cada disciplina pode ser cursada, sem limite de disciplinas por semestre e com cada pré-requisito concluído num semestre **anterior**. A entrada nunca tem ciclo, e `prereqs` (pares `(antes, depois)`) pode ter pares repetidos.\n\nO código passa em cadeias simples, mas erra na grade da lição. Corrija-o, mantendo o custo O(V + E).",difficulty:`intermediario`,skills:[`alg-grafos`],hints:[`Simule o código na grade da lição. Em que semestre ele põe ALG? E ED, que é pré-requisito de ALG?`,`Uma disciplina com dois pré-requisitos espera pelo que fica pronto primeiro ou pelo que fica pronto por último?`,`Em que momento você tem certeza de que já viu todos os pré-requisitos de uma disciplina? Que contador do Kahn diz isso?`],explanation:"O código é uma BFS: marca cada disciplina na primeira vez que a alcança, pelo pré-requisito que fica pronto **primeiro**. ALG, que exige MD (1º semestre) e ED (2º), ia para o 2º, junto com ED. O semestre certo é 1 mais o **maior** semestre entre os pré-requisitos, e ele só é definitivo quando todos os pré-requisitos foram processados: exatamente quando o grau de entrada chega a zero no Kahn. Trocar `if w not in semestre` por um `max` sem esperar o grau zerar não basta: a disciplina entra na fila com um semestre provisório, e quem depende dela herda o valor errado. Pôr a disciplina de novo na fila toda vez que o semestre dela aumenta até chega à resposta certa, mas pode processar a mesma disciplina centenas de vezes: O(V · E) no pior caso. A versão corrigida olha cada disciplina e cada par uma vez: O(V + E).",starter:`from collections import deque

def semestres(disciplinas, prereqs):
    depois = {d: [] for d in disciplinas}
    tem_prereq = set()
    for antes, dep in prereqs:
        depois[antes].append(dep)
        tem_prereq.add(dep)
    semestre = {}
    fila = deque()
    for d in disciplinas:
        if d not in tem_prereq:
            semestre[d] = 1
            fila.append(d)
    while fila:
        v = fila.popleft()
        for w in depois[v]:
            if w not in semestre:
                semestre[w] = semestre[v] + 1
                fila.append(w)
    return semestre`,solution:`from collections import deque

def semestres(disciplinas, prereqs):
    depois = {d: [] for d in disciplinas}
    grau = {d: 0 for d in disciplinas}
    for antes, dep in prereqs:
        depois[antes].append(dep)
        grau[dep] += 1
    semestre = {}
    fila = deque()
    for d in disciplinas:
        if grau[d] == 0:
            semestre[d] = 1
            fila.append(d)
    while fila:
        v = fila.popleft()
        for w in depois[v]:
            semestre[w] = max(semestre.get(w, 0), semestre[v] + 1)
            grau[w] -= 1
            if grau[w] == 0:
                fila.append(w)
    return semestre`,tests:[{name:`grade da lição`,code:`ds = ["CAL1", "PROG", "MD", "CAL2", "ED", "ALG", "PROB", "IA"]
ps = [("CAL1", "CAL2"), ("PROG", "ED"), ("MD", "ALG"), ("ED", "ALG"), ("CAL2", "PROB"), ("ALG", "IA"), ("PROB", "IA")]
r = semestres(ds, ps)
esperado = {"CAL1": 1, "PROG": 1, "MD": 1, "CAL2": 2, "ED": 2, "ALG": 3, "PROB": 3, "IA": 4}
assert r == esperado, f"veio {r}, esperado {esperado}. ALG tem pré-requisitos no 1º (MD) e no 2º (ED) semestre: em qual ela pode ser cursada?"`},{name:`esperar o último pré-requisito`,code:`ds = ["A", "B", "C", "D", "E"]
ps = [("A", "B"), ("B", "C"), ("C", "D"), ("A", "D"), ("D", "E")]
r = semestres(ds, ps)
esperado = {"A": 1, "B": 2, "C": 3, "D": 4, "E": 5}
assert r == esperado, f"veio {r}, esperado {esperado}. D exige A e C, e C só fica pronto no 3º semestre; E vem depois de D. Uma disciplina só tem o semestre definitivo quando todos os pré-requisitos dela já foram vistos"`},{name:`bordas: vazio, isoladas, pares repetidos`,code:`assert semestres([], []) == {}, "sem disciplinas, devolva um dict vazio"
r = semestres(["X", "Y"], [])
assert r == {"X": 1, "Y": 1}, f"disciplinas sem pré-requisito ficam no 1º semestre; veio {r}"
r = semestres(["A", "B", "C"], [("A", "B"), ("A", "B"), ("B", "C")])
assert r == {"A": 1, "B": 2, "C": 3}, f"com o par (A, B) repetido, esperado A 1, B 2, C 3; veio {r}"`},{name:`grades aleatórias`,code:`def _ref_semestres(ds, ps):
    antes_de = {d: [] for d in ds}
    for a, b in ps:
        antes_de[b].append(a)
    memo = {}
    def s(d):
        if d not in memo:
            memo[d] = 1 + max((s(a) for a in antes_de[d]), default=0)
        return memo[d]
    return {d: s(d) for d in ds}
import random
random.seed(11)
for _ in range(300):
    n = random.randint(1, 12)
    ds = [f"d{i}" for i in range(n)]
    perm = ds[:]
    random.shuffle(perm)
    ps = []
    for _ in range(random.randint(0, 3 * n)):
        if n > 1:
            i, j = sorted(random.sample(range(n), 2))
            ps.append((perm[i], perm[j]))
    esperado = _ref_semestres(ds, ps)
    r = semestres(ds, ps)
    assert r == esperado, f"semestres({ds}, {ps}) deu {r}, esperado {esperado}"`},{name:`cada disciplina processada uma vez`,code:`import sys as _sys

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
n = 1000
ds = ["INTRO"] + [f"c{i}" for i in range(n)]
ps = [("INTRO", f"c{i}") for i in range(n - 1, -1, -1)] + [(f"c{i}", f"c{i + 1}") for i in range(n - 1)]
r = _com_orcamento(300_000, semestres, ds, ps)
assert r is not _Estourou, "com 1 001 disciplinas e 2 000 pares, a função executou mais de 300 000 linhas: alguma disciplina (ou a lista inteira de pares) está sendo processada muitas vezes. Corrigir o semestre de uma disciplina e pô-la de novo na fila toda vez que ele aumenta, por exemplo, custa O(V · E). Uma disciplina só deve entrar na fila quando todos os pré-requisitos dela já foram processados: cada disciplina e cada par, uma vez só"
esperado = {"INTRO": 1}
for i in range(n):
    esperado[f"c{i}"] = i + 2
errada = next((d for d in esperado if r.get(d) != esperado[d]), None)
assert errada is None, f"INTRO é pré-requisito de todas, e c0 → c1 → ... → c999 formam uma corrente: c0 fica no 2º semestre, c1 no 3º e assim por diante. {errada} devia ficar no {esperado.get(errada)}º, mas veio {r.get(errada)}"`},{name:`3 000 disciplinas em corrente`,code:`import random
random.seed(5)
ds = [f"D{i}" for i in range(3000)]
perm = ds[:]
random.shuffle(perm)
ps = [(perm[i], perm[i + 1]) for i in range(len(perm) - 1)]
random.shuffle(ps)
r = semestres(ds, ps)
assert all(r[perm[i]] == i + 1 for i in range(len(perm))), "numa corrente de 3 000 disciplinas, a i-ésima da corrente fica no semestre i"`}]}},{type:`exercise`,exercise:{id:`e4-topo-5`,kind:`mcq`,prompt:`Um app de viagens monta um grafo **sem ciclos** de trechos. O custo de cada trecho já desconta o cashback, e alguns trechos têm custo **negativo** (o cashback supera o preço). Qual é o jeito mais eficiente que **garante** o menor custo da origem até todos os destinos?`,difficulty:`intermediario`,skills:[`alg-grafos`],hints:[`O que o Dijkstra supõe sobre um vértice no momento em que ele sai do heap? Essa suposição continua valendo com custos negativos?`,`Entre as opções que sempre acertam, qual aproveita o fato de o grafo não ter ciclos?`],explanation:`Num DAG, processar os vértices em ordem topológica garante que todos os caminhos que chegam em v já foram considerados antes de v propagar a sua distância. O argumento não depende do sinal dos pesos, e cada aresta é relaxada uma vez: O(V + E). O Bellman-Ford também acerta, mas custa O(V · E) por não usar a falta de ciclos; o Dijkstra pode errar; a BFS nem olha os custos.`,options:[{text:`Dijkstra com heap, em O((V + E) log V)`,feedback:`O Dijkstra considera definitivo o vértice que sai do heap, supondo que nenhum caminho ainda na fila pode ficar mais barato. Um custo negativo quebra essa suposição: no segundo programa desta lição, S → B → A custa 1, e o Dijkstra que para ao tirar A responde 2.`},{text:`BFS, em O(V + E)`,feedback:`A BFS minimiza o número de trechos e ignora os custos: ela erraria mesmo sem nenhum custo negativo.`},{text:`Bellman-Ford, em O(V · E)`,feedback:`Dá a resposta certa, mas não aproveita a falta de ciclos: repete V − 1 rodadas sobre todas as arestas. Ele é a ferramenta quando há ciclos e custos negativos.`},{text:`Relaxar as arestas em ordem topológica, em O(V + E)`,correct:!0,feedback:`Isso: quando chega a vez de v, todas as arestas que entram em v já foram relaxadas, e dist[v] é definitiva, qualquer que seja o sinal dos custos.`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e4-topo-desafio`,kind:`code`,lang:`python`,prompt:"Uma construtora quer saber o prazo mínimo de uma obra e quais tarefas não podem atrasar. Escreva `cronograma(duracao, depende)`:\n\n- `duracao` é um dict tarefa → dias (inteiro ≥ 0);\n- `depende` é uma lista de pares `(antes, depois)`: `depois` só começa quando `antes` termina. Tarefas sem relação entre si podem andar em paralelo, sem limite de equipes;\n- devolva a tupla `(prazo, caminho)`: `prazo` é o menor número de dias para terminar tudo, e `caminho` é um {{caminho crítico|critical path}}, uma lista de tarefas em que cada uma depende da anterior (cada par consecutivo está em `depende`) e cujas durações somam exatamente o prazo. Se houver mais de um, qualquer um serve. Sem tarefas, devolva `(0, [])`;\n- devolva `None` se houver dependência circular.\n\nObras grandes têm milhares de tarefas em sequência e um número astronômico de caminhos possíveis: a meta é O(V + E). Não use `graphlib`.",difficulty:`desafio`,skills:[`alg-grafos`],hints:[`Quando dá para calcular o dia em que uma tarefa começa? O que você precisa saber antes?`,`Em que ordem processar as tarefas para que, ao chegar numa delas, todas as de que ela depende já tenham o fim calculado?`,`O início de uma tarefa é o fim de qual das tarefas de que ela depende?`,`Para reconstruir o caminho no final, o que vale anotar para cada tarefa no momento em que o início dela aumenta?`,`Como o seu algoritmo percebe uma dependência circular?`],explanation:`Processando as tarefas em ordem topológica (Kahn), quando chega a vez de v todas as dependências dela já têm o fim calculado: início[v] é o maior fim entre elas, fim[v] = início[v] + duração[v], e o prazo é o maior fim de todos. Anotando em anterior[w] a dependência que deu o maior fim, o caminho crítico sai andando para trás a partir da tarefa que termina por último, e as durações dele somam o prazo por construção. Cada tarefa e cada dependência são processadas uma vez: O(V + E). Se o Kahn termina sem processar todas as tarefas, há dependência circular. Enumerar caminhos é exponencial (a escada de 30 etapas do teste tem 2³⁰ caminhos); pôr uma tarefa de novo na fila toda vez que o início dela aumenta acerta, mas pode reprocessá-la centenas de vezes (O(V · E)); e a recursão com memória acerta em O(V + E), mas estoura a pilha numa sequência de milhares de tarefas.`,starter:`from collections import deque

def cronograma(duracao, depende):
    # duracao: dict tarefa -> dias; depende: lista de pares (antes, depois)
    # devolva (prazo, caminho_critico), ou None se houver dependência circular
    pass`,solution:`from collections import deque

def cronograma(duracao, depende):
    depois = {x: [] for x in duracao}
    grau = {x: 0 for x in duracao}
    for antes, dep in depende:
        depois[antes].append(dep)
        grau[dep] += 1
    inicio = {x: 0 for x in duracao}
    anterior = {x: None for x in duracao}
    fila = deque(x for x in duracao if grau[x] == 0)
    processadas = 0
    while fila:
        v = fila.popleft()
        processadas += 1
        fim_v = inicio[v] + duracao[v]
        for w in depois[v]:
            if fim_v > inicio[w]:
                inicio[w] = fim_v
                anterior[w] = v
            grau[w] -= 1
            if grau[w] == 0:
                fila.append(w)
    if processadas < len(duracao):
        return None
    if not duracao:
        return (0, [])
    ultima = max(duracao, key=lambda x: inicio[x] + duracao[x])
    caminho = []
    x = ultima
    while x is not None:
        caminho.append(x)
        x = anterior[x]
    caminho.reverse()
    return (inicio[ultima] + duracao[ultima], caminho)`,tests:[{name:`a reforma da lição`,code:`import sys as _sys

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
def _confere_cronograma(duracao, depende, r, prazo_certo):
    assert isinstance(r, tuple) and len(r) == 2, f"devolva uma tupla (prazo, caminho); veio {r!r}"
    prazo, caminho = r
    assert prazo == prazo_certo, f"prazo {prazo}, esperado {prazo_certo}"
    assert isinstance(caminho, list), f"o caminho deve ser uma lista; veio {caminho!r}"
    assert caminho or not duracao, "com tarefas na obra, o caminho crítico não pode ser vazio"
    pares = set(depende)
    for a, b in zip(caminho, caminho[1:]):
        assert (a, b) in pares, f"no caminho {caminho}, {b} não depende de {a}: cada tarefa do caminho precisa depender da anterior"
    soma = sum(duracao[x] for x in caminho)
    assert soma == prazo, f"as durações das tarefas do caminho {caminho} somam {soma}, mas o prazo é {prazo}: as durações de um caminho crítico somam exatamente o prazo"

def _ref_prazo(duracao, depende):
    antes_de = {x: [] for x in duracao}
    for a, b in depende:
        antes_de[b].append(a)
    memo = {}
    def fim(x):
        if x not in memo:
            memo[x] = duracao[x] + max((fim(a) for a in antes_de[x]), default=0)
        return memo[x]
    return max((fim(x) for x in duracao), default=0)
duracao = {"demolição": 3, "elétrica": 4, "hidráulica": 5, "reboco": 3, "piso": 4, "pintura": 2, "limpeza": 1}
depende = [("demolição", "elétrica"), ("demolição", "hidráulica"), ("elétrica", "reboco"), ("hidráulica", "reboco"),
           ("hidráulica", "piso"), ("reboco", "pintura"), ("pintura", "limpeza"), ("piso", "limpeza")]
r = cronograma(duracao, depende)
_confere_cronograma(duracao, depende, r, 14)
assert r[1] == ["demolição", "hidráulica", "reboco", "pintura", "limpeza"], f"nesta obra o caminho crítico é único: demolição, hidráulica, reboco, pintura, limpeza; veio {r[1]}"`},{name:`bordas: nenhuma tarefa, uma tarefa, tarefas independentes`,code:`import sys as _sys

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
def _confere_cronograma(duracao, depende, r, prazo_certo):
    assert isinstance(r, tuple) and len(r) == 2, f"devolva uma tupla (prazo, caminho); veio {r!r}"
    prazo, caminho = r
    assert prazo == prazo_certo, f"prazo {prazo}, esperado {prazo_certo}"
    assert isinstance(caminho, list), f"o caminho deve ser uma lista; veio {caminho!r}"
    assert caminho or not duracao, "com tarefas na obra, o caminho crítico não pode ser vazio"
    pares = set(depende)
    for a, b in zip(caminho, caminho[1:]):
        assert (a, b) in pares, f"no caminho {caminho}, {b} não depende de {a}: cada tarefa do caminho precisa depender da anterior"
    soma = sum(duracao[x] for x in caminho)
    assert soma == prazo, f"as durações das tarefas do caminho {caminho} somam {soma}, mas o prazo é {prazo}: as durações de um caminho crítico somam exatamente o prazo"

def _ref_prazo(duracao, depende):
    antes_de = {x: [] for x in duracao}
    for a, b in depende:
        antes_de[b].append(a)
    memo = {}
    def fim(x):
        if x not in memo:
            memo[x] = duracao[x] + max((fim(a) for a in antes_de[x]), default=0)
        return memo[x]
    return max((fim(x) for x in duracao), default=0)
r = cronograma({}, [])
assert r == (0, []), f"sem tarefas, esperado (0, []); veio {r}"
r = cronograma({"vistoria": 5}, [])
assert r == (5, ["vistoria"]), f"uma tarefa de 5 dias: esperado (5, ['vistoria']); veio {r}"
duracao = {"a": 2, "b": 7, "c": 3}
r = cronograma(duracao, [])
_confere_cronograma(duracao, [], r, 7)
assert r[1] == ["b"], f"tarefas independentes andam em paralelo: o caminho crítico é só a mais longa; veio {r[1]}"`},{name:`tarefas de zero dias e pares repetidos`,code:`import sys as _sys

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
def _confere_cronograma(duracao, depende, r, prazo_certo):
    assert isinstance(r, tuple) and len(r) == 2, f"devolva uma tupla (prazo, caminho); veio {r!r}"
    prazo, caminho = r
    assert prazo == prazo_certo, f"prazo {prazo}, esperado {prazo_certo}"
    assert isinstance(caminho, list), f"o caminho deve ser uma lista; veio {caminho!r}"
    assert caminho or not duracao, "com tarefas na obra, o caminho crítico não pode ser vazio"
    pares = set(depende)
    for a, b in zip(caminho, caminho[1:]):
        assert (a, b) in pares, f"no caminho {caminho}, {b} não depende de {a}: cada tarefa do caminho precisa depender da anterior"
    soma = sum(duracao[x] for x in caminho)
    assert soma == prazo, f"as durações das tarefas do caminho {caminho} somam {soma}, mas o prazo é {prazo}: as durações de um caminho crítico somam exatamente o prazo"

def _ref_prazo(duracao, depende):
    antes_de = {x: [] for x in duracao}
    for a, b in depende:
        antes_de[b].append(a)
    memo = {}
    def fim(x):
        if x not in memo:
            memo[x] = duracao[x] + max((fim(a) for a in antes_de[x]), default=0)
        return memo[x]
    return max((fim(x) for x in duracao), default=0)
duracao = {"início": 0, "a": 2, "b": 3, "marco": 0, "c": 1}
depende = [("início", "a"), ("início", "b"), ("a", "marco"), ("b", "marco"), ("marco", "c"), ("b", "marco")]
r = cronograma(duracao, depende)
_confere_cronograma(duracao, depende, r, 4)`},{name:`dependência circular`,code:`casos = [
    ({"a": 1, "b": 2}, [("a", "b"), ("b", "a")]),
    ({"a": 1}, [("a", "a")]),
    ({"a": 1, "b": 1, "c": 1, "d": 1}, [("a", "b"), ("c", "d"), ("d", "c")]),
]
for duracao, depende in casos:
    r = cronograma(duracao, depende)
    assert r is None, f"{depende} tem dependência circular: esperado None, veio {r}"`},{name:`obras aleatórias`,code:`import sys as _sys

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
def _confere_cronograma(duracao, depende, r, prazo_certo):
    assert isinstance(r, tuple) and len(r) == 2, f"devolva uma tupla (prazo, caminho); veio {r!r}"
    prazo, caminho = r
    assert prazo == prazo_certo, f"prazo {prazo}, esperado {prazo_certo}"
    assert isinstance(caminho, list), f"o caminho deve ser uma lista; veio {caminho!r}"
    assert caminho or not duracao, "com tarefas na obra, o caminho crítico não pode ser vazio"
    pares = set(depende)
    for a, b in zip(caminho, caminho[1:]):
        assert (a, b) in pares, f"no caminho {caminho}, {b} não depende de {a}: cada tarefa do caminho precisa depender da anterior"
    soma = sum(duracao[x] for x in caminho)
    assert soma == prazo, f"as durações das tarefas do caminho {caminho} somam {soma}, mas o prazo é {prazo}: as durações de um caminho crítico somam exatamente o prazo"

def _ref_prazo(duracao, depende):
    antes_de = {x: [] for x in duracao}
    for a, b in depende:
        antes_de[b].append(a)
    memo = {}
    def fim(x):
        if x not in memo:
            memo[x] = duracao[x] + max((fim(a) for a in antes_de[x]), default=0)
        return memo[x]
    return max((fim(x) for x in duracao), default=0)
import random
random.seed(13)
for _ in range(300):
    n = random.randint(1, 12)
    tarefas = [f"t{i}" for i in range(n)]
    duracao = {x: random.randint(0, 9) for x in tarefas}
    perm = tarefas[:]
    random.shuffle(perm)
    depende = []
    for _ in range(random.randint(0, 3 * n)):
        if n > 1:
            i, j = sorted(random.sample(range(n), 2))
            depende.append((perm[i], perm[j]))
    r = cronograma(duracao, depende)
    _confere_cronograma(duracao, depende, r, _ref_prazo(duracao, depende))`},{name:`3 000 tarefas em sequência`,code:`import sys as _sys

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
def _confere_cronograma(duracao, depende, r, prazo_certo):
    assert isinstance(r, tuple) and len(r) == 2, f"devolva uma tupla (prazo, caminho); veio {r!r}"
    prazo, caminho = r
    assert prazo == prazo_certo, f"prazo {prazo}, esperado {prazo_certo}"
    assert isinstance(caminho, list), f"o caminho deve ser uma lista; veio {caminho!r}"
    assert caminho or not duracao, "com tarefas na obra, o caminho crítico não pode ser vazio"
    pares = set(depende)
    for a, b in zip(caminho, caminho[1:]):
        assert (a, b) in pares, f"no caminho {caminho}, {b} não depende de {a}: cada tarefa do caminho precisa depender da anterior"
    soma = sum(duracao[x] for x in caminho)
    assert soma == prazo, f"as durações das tarefas do caminho {caminho} somam {soma}, mas o prazo é {prazo}: as durações de um caminho crítico somam exatamente o prazo"

def _ref_prazo(duracao, depende):
    antes_de = {x: [] for x in duracao}
    for a, b in depende:
        antes_de[b].append(a)
    memo = {}
    def fim(x):
        if x not in memo:
            memo[x] = duracao[x] + max((fim(a) for a in antes_de[x]), default=0)
        return memo[x]
    return max((fim(x) for x in duracao), default=0)
import random
random.seed(17)
tarefas = [f"t{i}" for i in range(3000)]
duracao = {x: random.randint(1, 5) for x in tarefas}
ordem = tarefas[:]
random.shuffle(ordem)
depende = [(ordem[i], ordem[i + 1]) for i in range(len(ordem) - 1)]
random.shuffle(depende)
try:
    r = cronograma(duracao, depende)
except RecursionError:
    raise AssertionError("3 000 tarefas em sequência estouraram a pilha de chamadas: troque a recursão por uma fila (Kahn)")
_confere_cronograma(duracao, depende, r, sum(duracao.values()))
assert r[1] == ordem, "numa sequência única, o caminho crítico é a sequência inteira"`},{name:`escada com 2³⁰ caminhos`,code:`import sys as _sys

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
def _confere_cronograma(duracao, depende, r, prazo_certo):
    assert isinstance(r, tuple) and len(r) == 2, f"devolva uma tupla (prazo, caminho); veio {r!r}"
    prazo, caminho = r
    assert prazo == prazo_certo, f"prazo {prazo}, esperado {prazo_certo}"
    assert isinstance(caminho, list), f"o caminho deve ser uma lista; veio {caminho!r}"
    assert caminho or not duracao, "com tarefas na obra, o caminho crítico não pode ser vazio"
    pares = set(depende)
    for a, b in zip(caminho, caminho[1:]):
        assert (a, b) in pares, f"no caminho {caminho}, {b} não depende de {a}: cada tarefa do caminho precisa depender da anterior"
    soma = sum(duracao[x] for x in caminho)
    assert soma == prazo, f"as durações das tarefas do caminho {caminho} somam {soma}, mas o prazo é {prazo}: as durações de um caminho crítico somam exatamente o prazo"

def _ref_prazo(duracao, depende):
    antes_de = {x: [] for x in duracao}
    for a, b in depende:
        antes_de[b].append(a)
    memo = {}
    def fim(x):
        if x not in memo:
            memo[x] = duracao[x] + max((fim(a) for a in antes_de[x]), default=0)
        return memo[x]
    return max((fim(x) for x in duracao), default=0)
etapas = 30
duracao = {}
depende = []
for i in range(etapas):
    duracao[f"e{i}a"] = 1
    duracao[f"e{i}b"] = 1
    if i > 0:
        for x in "ab":
            for y in "ab":
                depende.append((f"e{i - 1}{x}", f"e{i}{y}"))
r = _com_orcamento(200_000, cronograma, duracao, depende)
assert r is not _Estourou, "com 30 etapas de 2 tarefas cada (mais de um bilhão de caminhos), a função executou mais de 200 000 linhas: enumerar caminhos, ou reprocessar uma tarefa a cada caminho que chega nela, não escala. Calcule o início de cada tarefa uma única vez, em ordem topológica"
_confere_cronograma(duracao, depende, r, etapas)`},{name:`cada tarefa processada uma vez`,code:`import sys as _sys

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
def _confere_cronograma(duracao, depende, r, prazo_certo):
    assert isinstance(r, tuple) and len(r) == 2, f"devolva uma tupla (prazo, caminho); veio {r!r}"
    prazo, caminho = r
    assert prazo == prazo_certo, f"prazo {prazo}, esperado {prazo_certo}"
    assert isinstance(caminho, list), f"o caminho deve ser uma lista; veio {caminho!r}"
    assert caminho or not duracao, "com tarefas na obra, o caminho crítico não pode ser vazio"
    pares = set(depende)
    for a, b in zip(caminho, caminho[1:]):
        assert (a, b) in pares, f"no caminho {caminho}, {b} não depende de {a}: cada tarefa do caminho precisa depender da anterior"
    soma = sum(duracao[x] for x in caminho)
    assert soma == prazo, f"as durações das tarefas do caminho {caminho} somam {soma}, mas o prazo é {prazo}: as durações de um caminho crítico somam exatamente o prazo"

def _ref_prazo(duracao, depende):
    antes_de = {x: [] for x in duracao}
    for a, b in depende:
        antes_de[b].append(a)
    memo = {}
    def fim(x):
        if x not in memo:
            memo[x] = duracao[x] + max((fim(a) for a in antes_de[x]), default=0)
        return memo[x]
    return max((fim(x) for x in duracao), default=0)
n = 1000
duracao = {"canteiro": 1}
depende = []
for i in range(n - 1, -1, -1):
    duracao[f"t{i}"] = 1
    depende.append(("canteiro", f"t{i}"))
depende += [(f"t{i}", f"t{i + 1}") for i in range(n - 1)]
r = _com_orcamento(400_000, cronograma, duracao, depende)
assert r is not _Estourou, "com 1 001 tarefas e 2 000 dependências, a função executou mais de 400 000 linhas. Atualizar o início de uma tarefa e pô-la de novo na fila toda vez que ele aumenta faz algumas tarefas serem processadas centenas de vezes (O(V · E)). Processe cada tarefa só quando todas as dependências dela já terminaram: O(V + E)"
_confere_cronograma(duracao, depende, r, n + 1)`},{name:`sem atalhos`,code:`assert "graphlib" not in _source, "não use graphlib: o desafio é montar a ordem topológica você mesmo"`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:`**Mini-projeto: planejador de grade.** Escreva a grade do seu curso (ou de um curso real, a partir do projeto pedagógico publicado no site da universidade) como pares (pré-requisito, disciplina). Mostre o plano semestre a semestre, o número mínimo de semestres e a cadeia de disciplinas que define esse mínimo. Depois acrescente um limite de, digamos, 5 disciplinas por semestre. Com limite, achar o mínimo de semestres é NP-difícil no caso geral (quando o limite faz parte da entrada), então use uma heurística gulosa: a cada semestre, entre as liberadas, dê prioridade às que têm a maior cadeia de dependentes pela frente. Compare o resultado com o plano sem limite.`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Ordenação topológica: lista em que toda aresta u → v tem u antes de v. Existe se e somente se o grafo é um DAG, e costuma haver várias.
- Kahn: graus de entrada e uma fila de fontes; ao tirar um vértice, desconte 1 de cada vizinho e enfileire quem chega a zero. O(V + E).
- Ordem com menos de V vértices = ciclo. Sobram os vértices dos ciclos e todos os que dependem deles.
- DFS: a pós-ordem invertida também é topológica; cuidado com a pilha de chamadas em grafos grandes.
- Heap no lugar da fila: ordem previsível (alfabética, por prioridade) em O(V log V + E).
- Semestres: 1 + o maior semestre entre os pré-requisitos. A BFS erra porque usa o primeiro pré-requisito, e não o último.
- Num DAG, relaxar em ordem topológica dá caminhos mínimos (e máximos) em O(V + E), com qualquer sinal de peso.
- Caminho crítico: a cadeia de maior duração; define o prazo, e as tarefas dele têm folga zero.
- Com ciclos e pesos negativos: Bellman-Ford, O(V · E), que também detecta ciclos negativos.`},{type:`callout`,tone:`english`,text:`- **topological sort / topological order**: ordenação topológica
- **in-degree / out-degree**: grau de entrada / grau de saída
- **source / sink**: fonte (nenhuma aresta chega) / sumidouro (nenhuma aresta sai)
- **DAG (directed acyclic graph)**: grafo acíclico direcionado
- **reverse postorder**: pós-ordem invertida
- **critical path / slack**: caminho crítico / folga

Frase típica de entrevista: *"I'd model the courses as a DAG and run Kahn's algorithm. If the output has fewer than V vertices, there's a cycle, so no valid schedule exists. It runs in O(V + E) time."*

Frase típica de documentação: *"Returns an iterable of nodes in topological order. If any cycle is detected, a CycleError is raised."*`,title:`English corner`}]}],cards:[{id:`l4-ordenacao-topologica#1`,front:`O que é uma ordenação topológica, e quando ela existe?`,back:`Uma lista de todos os vértices em que toda aresta u → v tem u antes de v. Existe se e somente se o grafo direcionado não tem ciclo (é um DAG).`},{id:`l4-ordenacao-topologica#2`,front:`Quais são os passos do algoritmo de Kahn, e quanto ele custa?`,back:`Calcular os graus de entrada, pôr na fila os de grau 0 e, a cada vértice tirado, descontar 1 de cada vizinho, enfileirando quem chega a 0. O(V + E).`},{id:`l4-ordenacao-topologica#3`,front:`Como o Kahn revela que há um ciclo, e quem sobra?`,back:`A ordem termina com menos de V vértices. Sobram os vértices dos ciclos e todos os que dependem deles.`},{id:`l4-ordenacao-topologica#4`,front:`Como obter uma ordenação topológica com DFS?`,back:`Anotar a ordem em que os vértices terminam (pós-ordem) e invertê-la.`},{id:`l4-ordenacao-topologica#5`,front:`Por que uma BFS a partir das fontes erra o semestre de uma disciplina?`,back:`Ela usa o primeiro pré-requisito que alcança a disciplina, mas a disciplina precisa esperar o último: semestre = 1 + o maior semestre entre os pré-requisitos.`},{id:`l4-ordenacao-topologica#6`,front:`Como achar caminhos mínimos num DAG com pesos negativos, e a que custo?`,back:`Processar os vértices em ordem topológica, relaxando as arestas que saem de cada um: O(V + E), sem heap.`},{id:`l4-ordenacao-topologica#7`,front:`O que é o caminho crítico de um projeto?`,back:`A cadeia de tarefas dependentes de maior duração total. Ela define o prazo mínimo, e qualquer atraso nela atrasa o projeto (folga zero).`},{id:`l4-ordenacao-topologica#8`,front:`Quando é preciso usar Bellman-Ford em vez de relaxar em ordem topológica?`,back:`Quando o grafo tem ciclos e pesos negativos. Ele relaxa todas as arestas V − 1 vezes, O(V · E), e detecta ciclos negativos.`}]};export{e as default};
//# sourceMappingURL=l4-ordenacao-topologica-CXPGzfnC.js.map