var e={id:`l3-filas-prioridade`,moduleId:`m3-2`,title:`Filas de prioridade: quando a ordem de chegada não basta`,titleEn:`Priority queues: when arrival order is not enough`,summary:`O tipo abstrato fila de prioridade, o custo de implementá-lo com listas ou com heap, e como usar heapq na prática: desempate estável, maior primeiro e os k maiores de um fluxo.`,minutes:45,objectives:[`Explicar o que é uma fila de prioridade e por que fila (FIFO) e pilha (LIFO) são casos particulares dela`,`Comparar o custo de implementá-la com lista desordenada, lista ordenada e heap`,`Usar heapq (heappush, heappop, heapify) com tuplas de desempate e com chaves negadas para "maior primeiro"`,`Manter os k maiores valores de um fluxo com um heap mínimo de tamanho k`],skills:[`ed-pilhas-filas`,`ed-arrays`],terms:[{pt:`fila de prioridade`,en:`priority queue`,def:`Estrutura que sempre entrega primeiro o item mais prioritário (em Python, o de menor chave), não o mais antigo.`,example:`This module provides an implementation of the heap queue algorithm, also known as the priority queue algorithm.`},{pt:`tipo abstrato de dados`,en:`abstract data type (ADT)`,def:`Descrição de uma estrutura pelas operações que ela oferece, sem dizer como é implementada por dentro.`,example:`A stack is an abstract data type that supports push and pop.`},{pt:`heap mínimo`,en:`min-heap`,def:`Organização em que o menor elemento está sempre na raiz (em heapq, em h[0]); inserir e retirar custam O(log n).`,example:`The interesting property of a heap is that its smallest element is always the root, heap[0].`},{pt:`heap máximo`,en:`max-heap`,def:`Variante em que o maior elemento fica na raiz. Com heapq, simula-se guardando as chaves com o sinal trocado.`},{pt:`transformar em heap`,en:`heapify`,def:`Reorganizar uma lista existente para que ela vire um heap, no lugar, em O(n).`,example:`Transform list x into a heap, in-place, in linear time.`},{pt:`critério de desempate`,en:`tie-breaker`,def:`Valor extra que decide a ordem entre itens de mesma prioridade, como a ordem de chegada.`},{pt:`estável`,en:`stable`,def:`Que preserva a ordem original entre itens empatados.`,example:`The built-in sorted() function is guaranteed to be stable.`},{pt:`remoção preguiçosa`,en:`lazy deletion`,def:`Em vez de apagar ou alterar uma entrada no meio do heap, deixá-la lá e ignorá-la quando ela sair.`},{pt:`k maiores`,en:`top-k`,def:`Problema de achar os k maiores (ou menores) itens de uma coleção ou de um fluxo.`,example:`Return the top k most frequent elements.`},{pt:`fluxo de dados`,en:`data stream`,def:`Sequência de dados que chega aos poucos e que você processa sem guardar inteira.`,example:`Find the median from a data stream.`}],references:[`clrs`,`sedgewick-algs`,`python-docs`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`No pronto-socorro ninguém é atendido por ordem de chegada: quem chega com dor no peito passa na frente de quem torceu o tornozelo. Na classificação de risco usada em muitos hospitais brasileiros (o Protocolo de Manchester), cada paciente recebe uma cor (vermelho, laranja, amarelo, verde ou azul), e a cor vale mais que o horário.

Essa é uma {{fila de prioridade|priority queue}}: você insere itens com uma prioridade e sempre retira **o mais prioritário**, não o mais antigo. Ela aparece no escalonador de processos do sistema operacional, nos aplicativos de rota (algoritmo de Dijkstra), em simulações, na fila preferencial do banco (onde, desde 2017, quem tem mais de 80 anos tem prioridade sobre os demais idosos) e em todo pedido do tipo "mostre os 10 maiores".

Uma ideia que amarra o módulo: a fila comum é uma fila de prioridade em que a prioridade é **a hora de chegada** (quem chegou antes sai antes); a pilha é a mesma coisa com a hora **invertida** (quem chegou por último sai antes). A fila de prioridade generaliza as duas.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`### O contrato
Fila de prioridade é um {{tipo abstrato de dados|abstract data type}}: ela define **o que** dá para fazer, não **como** é feito por dentro. As operações:

- **inserir** um item com sua prioridade;
- **espiar** o mais prioritário sem retirá-lo (*peek*);
- **retirar** o mais prioritário (*pop*);
- saber o **tamanho** (ou se está vazia).

Convenção do Python: **a menor chave sai primeiro**, como a senha 1 antes da senha 2. Quer "maior primeiro"? Troque o sinal da chave.

### Três implementações, três custos`},{type:`table`,head:[`Implementação`,`Inserir`,`Espiar o mínimo`,`Retirar o mínimo`,`n inserções + n retiradas`],rows:[["Lista desordenada (`append`; `min` + `remove`)",`O(1) amortizado`,`O(n)`,`O(n)`,`O(n²)`],[`Lista sempre ordenada, com o menor no fim`,`O(n): achar a posição é O(log n), mas abrir espaço desloca elementos`,`O(1)`,"O(1) com `pop()`",`O(n²)`],["Heap binário (módulo `heapq`)",`O(log n)`,`O(1)`,`O(log n)`,`O(n log n)`]],caption:`O(log n) cresce como o número de vezes que dá para dividir n ao meio: para 1 milhão, cerca de 20. Com n = 1 milhão, n² = 10¹² passos contra n log n ≈ 2 × 10⁷, cerca de 50 mil vezes menos trabalho.`},{type:`callout`,tone:`tip`,text:`Se **todos** os itens chegam antes da primeira retirada, você nem precisa de fila de prioridade: ordene uma vez (O(n log n)) e percorra. Ela brilha quando inserções e retiradas se **intercalam**, como no pronto-socorro, em que pacientes chegam enquanto outros são chamados.`},{type:`md`,text:"### O heap, visto de fora\nUm {{heap mínimo|min-heap}} é uma lista organizada de um jeito especial: `h[0]` é **sempre** o menor elemento, e cada inserção ou retirada reorganiza só cerca de log n posições. O módulo `heapq` mantém essa organização dentro de uma `list` comum:\n\n- `heapq.heappush(h, x)`: insere. O(log n).\n- `heapq.heappop(h)`: retira e devolve o menor. O(log n).\n- `h[0]`: espia o menor sem retirar. O(1).\n- `heapq.heapify(xs)`: {{transforma em heap|heapify}} uma lista que já existe, no lugar, em O(n).\n\n`heappush` e `heappop` trabalham com heap mínimo. Para um {{heap máximo|max-heap}}, em que o maior sai primeiro, o truque clássico, que funciona em qualquer versão do Python, é guardar a chave com o sinal trocado (`-valor`) e destrocar ao retirar. Como o heap consegue esses custos por dentro (uma árvore guardada em um array) é assunto do módulo Árvores e heaps; aqui, use-o como ferramenta."},{type:`callout`,tone:`warn`,text:"Com `h = [5, 1, 8, 3, 2]`, depois de `heapq.heapify(h)` a lista fica `[1, 2, 8, 3, 5]` (o `heapify` muda a própria lista e devolve `None`): só `h[0]` tem posição garantida. Imprimir o heap ou percorrê-lo com `for` **não** mostra a ordem de prioridade; para isso, chame `heappop` repetidamente. E insira sempre com `heappush`: um `append` comum pode quebrar a organização.",title:`Um heap não é uma lista ordenada`},{type:`md`,text:"### Empates e itens que não se comparam\nO `heapq` compara os próprios elementos. Com tuplas, compara o primeiro campo; se empatar, o segundo; e assim por diante. Guardar `(prioridade, item)` traz dois problemas:\n\n1. Num empate de prioridade, quem decide é o **item**. Com nomes, vale a ordem alfabética, não a de chegada, e a fila deixa de ser justa.\n2. Se o item for um `dict` (ou outro objeto sem `<`), o empate quebra o programa: `TypeError: '<' not supported between instances of 'dict' and 'dict'`.\n\nA solução, recomendada na própria documentação do `heapq`, é pôr um {{critério de desempate|tie-breaker}} no meio: `(prioridade, contador, item)`, com um contador que só cresce. Como dois contadores nunca são iguais, o item nunca chega a ser comparado, e entre prioridades iguais sai primeiro quem chegou primeiro: a fila fica {{estável|stable}}."},{type:`callout`,tone:`deep`,text:"- **Mudar a prioridade** de quem já está na fila: o `heapq` não tem essa operação. A técnica comum é inserir de novo com a prioridade nova e, ao retirar, ignorar as entradas desatualizadas. Isso se chama {{remoção preguiçosa|lazy deletion}}, e é o que o algoritmo de Dijkstra com `heapq` faz.\n- **`queue.PriorityQueue`** embrulha o `heapq` com travas para programas com várias threads. Num algoritmo de uma thread só, use `heapq` direto: é mais simples e mais rápido.\n- **Os k menores ou maiores** de uma coleção (o problema dos {{k maiores|top-k}}): `heapq.nsmallest(k, xs)` e `heapq.nlargest(k, xs)`. No desafio você vai implementar a ideia que está por trás deles.",title:`Para ir além`}]},{stage:`exemplo`,blocks:[{type:`md`,text:'Pronto-socorro com prioridades 1 (vermelho), 2 (laranja), 3 (amarelo), 4 (verde) e 5 (azul). Cada paciente entra no heap como `(prioridade, ordem de chegada, nome)`. A coluna "Esperando" mostra a ordem em que eles **sairiam**, não a lista interna do heap.'},{type:`table`,head:[`Hora`,`Evento`,`Entra no heap`,`Esperando (do primeiro ao último a sair)`,`Chamado`],rows:[[`08:00`,`chega Ana (verde)`,'`(4, 0, "Ana")`',`Ana`,`—`],[`08:02`,`chega Bruno (amarelo)`,'`(3, 1, "Bruno")`',`Bruno, Ana`,`—`],[`08:05`,`chega Carla (verde)`,'`(4, 2, "Carla")`',`Bruno, Ana, Carla`,`—`],[`08:06`,`médico chama`,`—`,`Ana, Carla`,`Bruno`],[`08:07`,`chega Davi (vermelho)`,'`(1, 3, "Davi")`',`Davi, Ana, Carla`,`—`],[`08:08`,`médico chama`,`—`,`Ana, Carla`,`Davi`],[`08:09`,`médico chama`,`—`,`Carla`,`Ana (empata com Carla na cor, mas chegou antes: 0 < 2)`],[`08:10`,`médico chama`,`—`,`(ninguém)`,`Carla`]],caption:`Ordem de atendimento: Bruno, Davi, Ana, Carla. Por ordem de chegada (FIFO) seria Ana, Bruno, Carla, Davi: o caso mais grave seria o último a ser chamado.`},{type:`md`,text:`Repare que Davi chegou depois de Bruno ser chamado: a fila de prioridade não interrompe quem já está sendo atendido, só decide **quem é o próximo**.`}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`import heapq
from itertools import count

CORES = {"vermelho": 1, "laranja": 2, "amarelo": 3, "verde": 4, "azul": 5}

fila = []
chegada = count()      # next(chegada) devolve 0, 1, 2, ... (desempate)

def chega(nome, cor):
    heapq.heappush(fila, (CORES[cor], next(chegada), nome))

def chama():
    _, _, nome = heapq.heappop(fila)
    return nome

chega("Ana", "verde")
chega("Bruno", "amarelo")
chega("Carla", "verde")
print("chamado:", chama())
chega("Davi", "vermelho")
print("lista interna:", fila)        # repare: Carla aparece antes de Ana
print("próximo, sem tirar:", fila[0][2])
while fila:
    print("chamado:", chama())         # mas Ana sai antes de Carla`,runnable:!0,caption:`A lista interna não está ordenada; só os heappop sucessivos saem em ordem de prioridade.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e3-fp-1`,kind:`predict`,lang:`python`,prompt:`O que é impresso?`,difficulty:`facil`,skills:[`ed-pilhas-filas`],hints:["`heappop` não olha a ordem em que os números entraram. O que ele devolve?","Depois dos dois primeiros `heappop`, quais números sobram? E quando o 2 entra, quem passa a ser o menor?"],explanation:"Os dois primeiros `heappop` tiram 1 e 3, os menores entre 5, 1, 8 e 3. Sobram 5 e 8; o 2 entra e, por ser o menor, é o próximo a sair. Restam 5 e 8, então `len(h)` é 2.",code:`import heapq

h = []
for x in [5, 1, 8, 3]:
    heapq.heappush(h, x)
print(heapq.heappop(h), heapq.heappop(h))
heapq.heappush(h, 2)
print(heapq.heappop(h), len(h))`,answer:`1 3
2 2`}},{type:`exercise`,exercise:{id:`e3-fp-2`,kind:`mcq`,prompt:"Depois de `heapq.heapify(h)`, qual afirmação vale para **qualquer** lista `h` não vazia, e não só para um exemplo?",difficulty:`intermediario`,skills:[`ed-pilhas-filas`],hints:['"Qualquer lista" quer dizer: a afirmação não pode depender da entrada. Do que o `heappop` precisa para devolver o menor sem procurar na lista inteira?',`Imagine duas arrumações diferentes dos mesmos números que fossem heaps válidos. O que as duas teriam obrigatoriamente em comum?`],explanation:'Um min-heap garante só que cada elemento é menor ou igual aos seus "filhos" (as posições 2i + 1 e 2i + 2). Disso resulta que `h[0]` é o mínimo, mas o resto não precisa estar ordenado. Essa garantia fraca é justamente o que permite inserir e retirar em O(log n), sem pagar o custo de manter tudo ordenado.',options:[{text:"`h[0]` é o menor elemento",correct:!0,feedback:"Isso: é a única posição com garantia. Para os seguintes em ordem, chame `heappop` repetidamente."},{text:"`h` fica em ordem crescente",feedback:"Não necessariamente: o heap é só parcialmente ordenado. `[5, 1, 8, 3, 2]`, por exemplo, vira `[1, 2, 8, 3, 5]`. Ordenar custaria O(n log n); o `heapify` custa O(n) justamente porque não ordena."},{text:"`h[-1]` é o maior elemento",feedback:"O maior não tem posição fixa: `[5, 1, 8, 3, 2]` vira `[1, 2, 8, 3, 5]`, com o 8 em `h[2]`. Um min-heap não dá acesso rápido ao maior."},{text:"`h[1]` é o segundo menor",feedback:"Às vezes acontece (em `[1, 2, 8, 3, 5]`, `h[1]` é 2), mas não é garantido: o segundo menor pode estar em `h[1]` ou em `h[2]`. `heapify([1, 5, 2])`, por exemplo, deixa a lista como está, com o 2 em `h[2]`."}]}},{type:`exercise`,exercise:{id:`e3-fp-3`,kind:`mcq`,prompt:"Um sistema de entregas recebe n = 100 000 pedidos e, intercalado com as chegadas, sempre despacha o mais urgente. A primeira versão guarda os pedidos numa lista comum e, a cada despacho, faz `p = min(fila)` e `fila.remove(p)`. Qual o custo total, no pior caso, das n inserções e n despachos, com a lista e com `heapq`?",difficulty:`intermediario`,skills:[`ed-pilhas-filas`,`ed-arrays`],hints:["Quanto custa um único `min(fila)` numa lista com n itens? E um `remove`?","Quantas vezes isso acontece? E quanto custa cada `heappop` no lugar disso?"],explanation:"Cada `min` e cada `remove` percorrem a lista: O(n) por despacho, O(n²) no total. Com heap, cada operação é O(log n), O(n log n) no total. Para n = 100 000, isso é 10¹⁰ contra cerca de 1,7 × 10⁶ passos: milhares de vezes menos trabalho.",options:[{text:`Lista: O(n²). heapq: O(n log n)`,correct:!0,feedback:`Isso: n varreduras de O(n) contra n operações de O(log n).`},{text:`Lista: O(n). heapq: O(n)`,feedback:"O `append` é O(1), mas `min` e `remove` percorrem a lista inteira a cada despacho, e são n despachos."},{text:`O(n log n) nas duas`,feedback:`O(n log n) é o custo de ordenar uma vez. Aqui ninguém ordena: a lista inteira é varrida a cada despacho.`},{text:`O(n²) nas duas, porque o heappop também precisa procurar o menor`,feedback:"O heap mantém o menor em `h[0]`: achá-lo é O(1), e reorganizar depois de retirar custa só O(log n), não uma varredura."}]}},{type:`exercise`,exercise:{id:`e3-fp-4`,kind:`fill`,lang:`python`,prompt:"`heappush` e `heappop` trabalham com heap **mínimo**. Complete para que o Pix de **maior** valor saia primeiro e para que o valor seja impresso positivo (a saída deve ser `caio 980`).",difficulty:`intermediario`,skills:[`ed-pilhas-filas`],hints:[`Se o heap sempre devolve o menor, que transformação faz o maior valor virar o menor número?`,`A chave que sai do heap ainda está transformada. Como desfazer a transformação na hora de imprimir?`],explanation:"Trocar o sinal inverte a ordem: 980 vira -980, o menor de todos, e sai primeiro. Ao retirar, troca-se o sinal de novo para recuperar o valor. É o jeito padrão de fazer um max-heap com `heapq`.",template:`import heapq

pix = [("ana", 120), ("caio", 980), ("bia", 610)]
h = []
for nome, valor in pix:
    heapq.heappush(h, (___, nome))

chave, nome = heapq.heappop(h)
print(nome, ___)`,blanks:[[`-valor`,`- valor`,`(-valor)`,`-(valor)`,`-1 * valor`,`-1*valor`,`(-1) * valor`,`valor * -1`,`valor*-1`,`valor * (-1)`,`0 - valor`,`0-valor`],[`-chave`,`- chave`,`(-chave)`,`-(chave)`,`-1 * chave`,`-1*chave`,`(-1) * chave`,`chave * -1`,`chave*-1`,`chave * (-1)`,`0 - chave`,`0-chave`,`abs(chave)`]]}},{type:`exercise`,exercise:{id:`e3-fp-5`,kind:`code`,lang:`python`,prompt:'Escreva `atender(eventos)` para o pronto-socorro. Cada evento é uma tupla `(nome, cor)` (alguém chegou) ou a string `"proximo"` (o médico chama o próximo). Da mais à menos urgente, as cores são: vermelho, laranja, amarelo, verde, azul. Devolva a lista de nomes na ordem em que foram chamados; se o médico chamar com a sala vazia, registre `None`. Entre pacientes da mesma cor, quem chegou antes é chamado antes. Use `heapq`: um dos testes tem dezenas de milhares de eventos.',difficulty:`intermediario`,skills:[`ed-pilhas-filas`],hints:["Que tupla cada paciente deve virar ao entrar no heap para que o próprio `heappop` já devolva o paciente certo, sem comparação extra na hora de chamar?",`Só a cor no primeiro campo não basta: num empate, o heap compararia o quê? Que informação faria o primeiro a chegar ganhar?`,'Ao ver `"proximo"`, o que fazer quando o heap está vazio?'],explanation:"Cada chegada vira `(urgência, ordem de chegada, nome)`: o heap ordena pela urgência e, no empate, pela ordem de chegada, que nunca se repete, então o nome nunca chega a ser comparado. Cada evento custa O(log n), O(n log n) no total. Com `min` + `remove` numa lista, cada chamada custaria O(n).",starter:`import heapq

URGENCIA = {"vermelho": 1, "laranja": 2, "amarelo": 3, "verde": 4, "azul": 5}

def atender(eventos):
    # chegadas entram na fila de prioridade; "proximo" retira
    # o mais urgente (ou registra None se não houver ninguém)
    chamados = []
    return chamados`,solution:`import heapq

URGENCIA = {"vermelho": 1, "laranja": 2, "amarelo": 3, "verde": 4, "azul": 5}

def atender(eventos):
    fila = []
    chamados = []
    ordem = 0
    for ev in eventos:
        if ev == "proximo":
            if fila:
                _, _, nome = heapq.heappop(fila)
                chamados.append(nome)
            else:
                chamados.append(None)
        else:
            nome, cor = ev
            heapq.heappush(fila, (URGENCIA[cor], ordem, nome))
            ordem += 1
    return chamados`,tests:[{name:`exemplo da lição`,code:`ev = [("Ana", "verde"), ("Bruno", "amarelo"), ("Carla", "verde"), "proximo",
      ("Davi", "vermelho"), "proximo", "proximo", "proximo"]
r = atender(ev)
assert r == ["Bruno", "Davi", "Ana", "Carla"], f"esperado ['Bruno', 'Davi', 'Ana', 'Carla'], veio {r}"`},{name:`mesma cor: vale a ordem de chegada, não a alfabética`,code:`r = atender([("Zeca", "azul"), ("Ana", "azul"), ("Mel", "azul"), "proximo", "proximo", "proximo"])
assert r == ["Zeca", "Ana", "Mel"], f"mesma cor deve sair por ordem de chegada (Zeca, Ana, Mel); veio {r}"`},{name:`mesma cor com chamadas no meio: continua valendo a ordem de chegada`,code:`ev = [("Ana", "amarelo"), ("Bia", "amarelo"), ("Zeca", "verde"), "proximo", "proximo",
      ("Caio", "verde"), ("Duda", "verde"), "proximo", "proximo", "proximo"]
r = atender(ev)
assert r == ["Ana", "Bia", "Zeca", "Caio", "Duda"], f"Zeca (verde) chegou antes de Caio e Duda e deve sair antes deles; veio {r}. O desempate de quem chega depois pode ficar menor que o de quem chegou antes?"`},{name:`todas as cores na ordem de urgência`,code:`ev = [("e", "azul"), ("d", "verde"), ("c", "amarelo"), ("b", "laranja"), ("a", "vermelho")] + ["proximo"] * 5
r = atender(ev)
assert r == ["a", "b", "c", "d", "e"], f"esperado vermelho, laranja, amarelo, verde, azul (a, b, c, d, e); veio {r}"`},{name:`sala vazia e quem chega depois`,code:`assert atender([]) == [], "sem eventos, ninguém é chamado"
r = atender(["proximo", ("Ana", "verde"), "proximo", "proximo"])
assert r == [None, "Ana", None], f"esperado [None, 'Ana', None]; veio {r}"
r = atender([("Lia", "azul"), "proximo", ("Rui", "vermelho"), ("Bia", "laranja"), "proximo", "proximo"])
assert r == ["Lia", "Rui", "Bia"], f"esperado ['Lia', 'Rui', 'Bia']; veio {r}"`},{name:`cada chamada de atender começa com a sala vazia`,code:`atender([("Ana", "vermelho"), ("Bia", "azul")])
r = atender(["proximo"])
assert r == [None], f"Ana e Bia ficaram esperando numa chamada anterior de atender e reapareceram nesta ({r}). A fila precisa ser criada dentro da função, a cada chamada"`},{name:`usa heapq`,code:`assert "heappush" in _source or "heapify" in _source, "use heapq.heappush e heapq.heappop: esse é o objetivo do exercício"`},{name:`eficiente com muitos pacientes`,code:`import time
cores = ["azul", "verde", "amarelo", "laranja", "vermelho"]
ev = [(f"p{i}", cores[i % 5]) for i in range(20000)] + ["proximo"] * 3000
t0 = time.perf_counter()
r = atender(ev)
dt = time.perf_counter() - t0
assert r[:2] == ["p4", "p9"] and r[-1] == "p14999" and len(r) == 3000, "ordem errada no teste grande"
assert dt < 0.5, f"levou {dt:.2f}s: cada chamada deve custar O(log n), não percorrer a fila inteira"`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e3-fp-desafio`,kind:`code`,lang:`python`,prompt:"Um banco quer, ao fim do dia, os `k` Pix de **maior valor** entre milhões que chegam um a um, como um {{fluxo de dados|data stream}}. Guardar tudo para ordenar depois gasta memória demais. Escreva `k_maiores(fluxo, k)` que percorre o fluxo **uma única vez**, com `for` (ele pode ser um iterador, que não tem `len` nem volta ao começo), guarda **no máximo k valores** ao mesmo tempo e devolve os k maiores em ordem **decrescente**. Se houver menos de k valores, devolva todos, também em ordem decrescente. Cada valor do fluxo deve custar no máximo O(log k): um dos testes conta as comparações. Não use `sorted`, `.sort`, `nlargest` nem `nsmallest`.",difficulty:`avancado`,skills:[`ed-pilhas-filas`],hints:[`Imagine um "clube dos k maiores" com lotação k. Quando chega um valor novo e o clube está cheio, com qual membro ele precisa se comparar para decidir se entra?`,"Esse membro de referência é o menor do clube. Que tipo de heap deixa o menor sempre à mão, em `h[0]`?","No fim, o heap tem os k maiores, mas em ordem de heap. Que operação repetida os tira em ordem crescente? Como chegar à decrescente? E o que acontece com `h[0]` quando k é 0?"],explanation:"O truque contraintuitivo: para guardar os k **maiores**, use um heap **mínimo** de tamanho k. A raiz é o porteiro do clube, o menor dos k melhores até agora; um valor novo só entra se for maior que ela, e entra no lugar dela (`heapq.heapreplace` ou `heappushpop`). Cada passo custa O(log k): o total é O(n log k) em tempo e O(k) em memória, contra O(n) de memória para guardar tudo. Com k = 10 e n = 10 milhões, é a diferença entre guardar 10 números e guardar 10 milhões.",starter:`import heapq

def k_maiores(fluxo, k):
    # percorra o fluxo uma vez, guardando no máximo k valores num heap
    pass`,solution:`import heapq

def k_maiores(fluxo, k):
    if k <= 0:
        return []
    h = []
    for x in fluxo:
        if len(h) < k:
            heapq.heappush(h, x)
        elif x > h[0]:
            heapq.heapreplace(h, x)
    resultado = []
    while h:
        resultado.append(heapq.heappop(h))
    resultado.reverse()
    return resultado`,tests:[{name:`exemplo`,code:`r = k_maiores(iter([120, 15, 980, 40, 610, 75]), 3)
assert r == [980, 610, 120], f"esperado [980, 610, 120]; veio {r}"`},{name:`menos de k valores, fluxo vazio e k = 0`,code:`r = k_maiores(iter([3, 1]), 5)
assert r == [3, 1], f"com menos de k valores, devolva todos em ordem decrescente; veio {r}"
assert k_maiores(iter([]), 3) == [], "fluxo vazio deve dar []"
assert k_maiores(iter([1, 2, 3]), 0) == [], "k = 0 deve dar []"`},{name:`repetidos e negativos`,code:`r = k_maiores(iter([5, -2, 5, 7, -9, 5]), 4)
assert r == [7, 5, 5, 5], f"esperado [7, 5, 5, 5] (repetidos contam); veio {r}"
r = k_maiores(iter([-5, -1, -3]), 2)
assert r == [-1, -3], f"esperado [-1, -3]; veio {r}"`},{name:`confere com a resposta certa em 300 casos aleatórios`,code:`import random
rng = random.Random(7)
for _ in range(300):
    xs = [rng.randint(-50, 50) for _ in range(rng.randint(0, 30))]
    k = rng.randint(0, 12)
    esperado = sorted(xs, reverse=True)[:k]
    r = k_maiores(iter(xs), k)
    assert r == esperado, f"k_maiores({xs}, {k}) devolveu {r}; esperado {esperado}"`},{name:`sem atalhos`,code:`for proibido in ["sorted(", ".sort(", "nlargest", "nsmallest"]:
    assert proibido not in _source, f"não use {proibido.strip('(.')}: o objetivo é manter um heap de tamanho k"`},{name:`memória O(k): não guarda o fluxo inteiro`,code:`try:
    import tracemalloc
    tracemalloc.start()
    medir = True
except Exception:
    medir = False
r = k_maiores((x * 7919 % 100003 for x in range(50000)), 5)
if medir:
    _, pico = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    assert pico < 50000, f"pico de {pico} bytes: parece que o fluxo inteiro foi guardado; mantenha só k valores"
assert r == [100001, 99999, 99997, 99995, 99993], f"resultado errado no fluxo grande: {r}"`},{name:`O(log k) por valor: conta as comparações`,code:`class _Demais(BaseException):
    pass

class _V(int):
    comparacoes = 0
    def _conta(self):
        _V.comparacoes += 1
        if _V.comparacoes > 300000:
            raise _Demais()
    def __lt__(self, o): self._conta(); return int.__lt__(self, o)
    def __le__(self, o): self._conta(); return int.__le__(self, o)
    def __gt__(self, o): self._conta(); return int.__gt__(self, o)
    def __ge__(self, o): self._conta(); return int.__ge__(self, o)

n, k = 5000, 500
try:
    r = k_maiores((_V(x) for x in range(n)), k)  # crescente: todo valor novo entra no grupo
except _Demais:
    r = None
assert r is not None, f"com n = {n} e k = {k}, sua função passou de 300 000 comparações entre valores (a versão com heap faz cerca de 50 000). Achar o menor do grupo não pode exigir percorrer os k valores"
assert r == list(range(n - 1, n - k - 1, -1)), "resultado errado num fluxo crescente de 5 000 valores com k = 500"`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:"**Lista de tarefas com urgência.** No Projeto 2 cada tarefa tem prioridade. Acrescente o comando `proxima`, que mostra a tarefa mais urgente usando `heapq` com desempate pela ordem de criação. Depois responda no README: no seu programa, inserções e retiradas se intercalam a ponto de o heap valer a pena, ou bastaria ordenar a lista na hora de exibir?"},{type:`project`,projectId:`p2-todo`}]},{stage:`revisao`,blocks:[{type:`md`,text:"- Fila de prioridade: sai o mais prioritário, não o mais antigo. Fila (FIFO) e pilha (LIFO) são casos particulares, com prioridade = hora de chegada, normal ou invertida.\n- Lista desordenada: inserir O(1), retirar O(n). Lista ordenada: inserir O(n), retirar O(1). Heap: O(log n) nos dois. Com operações intercaladas, o heap vence: O(n log n) contra O(n²).\n- `heapq`: `heappush`, `heappop`, `h[0]` para espiar, `heapify` em O(n). O menor sai primeiro; o resto da lista não está ordenado.\n- Use `(prioridade, contador, item)`: desempate estável e nenhum item comparado.\n- Maior primeiro: troque o sinal da chave. Os k maiores de um fluxo: heap **mínimo** de tamanho k."},{type:`callout`,tone:`english`,text:`**Vocabulary**: *priority queue*, *abstract data type (ADT)*, *min-heap / max-heap*, *heapify*, *peek*, *tie-breaker*, *stable*, *lazy deletion*, *top-k*, *data stream*.

From the Python docs (module heapq): *"This module provides an implementation of the heap queue algorithm, also known as the priority queue algorithm."*

Typical interview prompt: "Given a stream of numbers, how would you keep track of the k largest ones? What are the time and space complexities?"`,title:`English corner`}]}],cards:[{id:`l3-filas-prioridade#1`,front:`O que uma fila de prioridade devolve quando você retira um item?`,back:`O mais prioritário (em Python, o de menor chave), não o mais antigo.`},{id:`l3-filas-prioridade#2`,front:`Quanto custam heappush e heappop num heap com n itens? E espiar o menor?`,back:"O(log n) cada um; espiar `h[0]` é O(1)."},{id:`l3-filas-prioridade#3`,front:`Depois de heapify, que posição da lista tem garantia?`,back:"Só `h[0]`, que é o menor. O resto não está ordenado."},{id:`l3-filas-prioridade#4`,front:`Por que guardar (prioridade, contador, item) em vez de (prioridade, item)?`,back:"O contador desempata pela ordem de chegada (fila estável) e impede que itens sem `<`, como dicts, sejam comparados."},{id:`l3-filas-prioridade#5`,front:`Como fazer "maior primeiro" com heapq?`,back:`Inserir a chave com o sinal trocado (-valor) e trocar de novo ao retirar.`},{id:`l3-filas-prioridade#6`,front:`Para manter os k maiores de um fluxo, que heap usar e de que tamanho?`,back:`Um heap mínimo de tamanho k: a raiz é o menor dos k maiores e decide quem entra.`},{id:`l3-filas-prioridade#7`,front:`Uma fila comum (FIFO) é uma fila de prioridade em que a prioridade é…?`,back:`A hora de chegada: quem chegou antes sai antes.`},{id:`l3-filas-prioridade#8`,front:`Quando não vale a pena usar fila de prioridade?`,back:`Quando todos os itens chegam antes da primeira retirada: basta ordenar uma vez.`}]};export{e as default};
//# sourceMappingURL=l3-filas-prioridade-878C7_O-.js.map