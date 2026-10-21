var e={id:`l3-crescimento-amortizado`,moduleId:`m3-1`,title:`Crescimento amortizado: a conta do append`,titleEn:`Amortized growth: the math behind append`,summary:`Por que dobrar a capacidade deixa o append O(1) amortizado, por que crescer de pouco em pouco vira O(n²), quando encolher e onde se escondem cópias no seu código.`,minutes:40,objectives:[`Calcular o total de cópias de n appends com crescimento geométrico e com crescimento aritmético`,`Distinguir custo amortizado, pior caso e caso médio`,`Explicar por que uma lista dinâmica precisa de folga para encolher (histerese)`,`Reconhecer cópias escondidas que deixam um laço O(n²)`],skills:[`ed-arrays`],terms:[{pt:`realocação`,en:`reallocation`,def:`Reservar um bloco de memória de outro tamanho e mover os elementos para ele.`,example:`The list is reallocated when it runs out of capacity.`},{pt:`crescimento geométrico`,en:`geometric growth`,def:`Aumentar a capacidade multiplicando-a por um fator constante, como ×2 ou ×1,5.`},{pt:`crescimento aritmético`,en:`arithmetic growth`,def:`Aumentar a capacidade somando uma constante, como +1 ou +100. Leva n appends a O(n²).`},{pt:`fator de crescimento`,en:`growth factor`,def:`Número pelo qual a capacidade é multiplicada a cada realocação.`,example:`Java's ArrayList uses a growth factor of 1.5.`},{pt:`pior caso`,en:`worst case`,def:`O maior custo possível de uma única execução de uma operação.`},{pt:`caso médio`,en:`average case`,def:`Custo médio quando a entrada é sorteada segundo alguma distribuição; depende dessa suposição.`},{pt:`método contábil`,en:`accounting method`,def:`Técnica de análise amortizada: operações baratas pagam um pouco a mais e guardam crédito para pagar as caras.`},{pt:`histerese`,en:`hysteresis`,def:`Folga entre o ponto de crescer e o de encolher, para a estrutura não realocar a cada operação.`},{pt:`pré-alocar`,en:`preallocate`,def:`Reservar todo o espaço de uma vez quando o tamanho final já é conhecido.`,example:`Preallocate the list with [None] * n to avoid repeated resizing.`}],references:[`clrs`,`mit-6006`,`sedgewick-algs`,`pep8`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:"Na lição anterior você viu que `append` é **O(1) amortizado**: quase sempre é barato, mas de vez em quando a lista enche e precisa de uma **{{realocação|reallocation}}**, isto é, reservar um bloco maior e copiar tudo para ele. Agora vamos **fazer a conta** e entender por que ela fecha.\n\nA pergunta central é: **quanto crescer** quando a lista enche? Se a capacidade for **multiplicada** por um fator (×2, ×1,5), n appends custam O(n) no total. Se ela for **somada** de uma constante (+1, +100), os mesmos n appends custam **O(n²)**. A diferença entre os dois mundos é uma linha de código.\n\nEssa escolha aparece em todo lugar: o `ArrayList` do Java cresce 1,5×, o `std::vector` do GCC dobra, os *slices* do Go dobram enquanto são pequenos, e o `dict` e o `set` do Python usam a mesma ideia quando a tabela interna passa de certa ocupação. E a versão errada aparece, disfarçada, em código de iniciante: `xs = xs + [v]` dentro de um laço."}]},{stage:`explicacao`,blocks:[{type:`md`,text:"### O modelo\nUma lista dinâmica guarda um bloco com **capacidade** c e usa só as n primeiras posições. Em cada `append`:\n- se ainda há espaço (n < c), escreve na posição n: custo 1;\n- se está cheia (n = c), reserva um bloco maior, copia os n elementos e só então escreve: custo n + 1.\n\nO que muda de uma implementação para outra é a regra para a nova capacidade.\n\n### Multiplicar: {{crescimento geométrico|geometric growth}}\nComeçando com capacidade 1 e dobrando, as cópias acontecem quando a lista tem 1, 2, 4, 8, … elementos. Até o n-ésimo append, o total copiado é `1 + 2 + 4 + … + 2^k`, com `2^k < n`. Essa soma vale `2^(k+1) − 1`, que é **menor que 2n**. Somando as n escritas, tudo fica abaixo de **3n**: O(n) para n appends, ou seja, **O(1) amortizado** por append.\n\nCom outro {{fator de crescimento|growth factor}} r > 1 a conta é a mesma progressão geométrica: as cópias somam menos de `n × r / (r − 1)`. Para r = 1,5, menos de 3n. O fator muda a constante, não a ordem de grandeza. (Essa conta supõe multiplicar exatamente por r. Como a capacidade é um número inteiro, o arredondamento mexe um pouco na constante: com a regra `c + c // 2` da tabela abaixo, há valores de n em que as cópias passam de 3n, por muito pouco.)\n\n### Somar: {{crescimento aritmético|arithmetic growth}}\nCrescendo de k em k, as cópias acontecem com k, 2k, 3k, … elementos: são cerca de n/k realocações, e as últimas copiam quase n elementos cada. O total é `k × (1 + 2 + … + n/k)`, perto de **n² / (2k)**: **O(n²)**. Um k maior só divide a constante; o crescimento continua quadrático."},{type:`table`,head:[`Regra de crescimento`,`Cópias com n = 1 000`,`Cópias com n = 100 000`,`Aumento`,`n appends custam`],rows:[[`+1`,`499 500`,`4 999 950 000`,`≈ 10 000×`,`O(n²)`],[`+100`,`4 510`,`49 951 000`,`≈ 11 000×`,`O(n²)`],[`×1,5`,`2 137`,`276 521`,`≈ 130×`,`O(n)`],[`×2`,`1 023`,`131 071`,`≈ 130×`,`O(n)`]],caption:`Total de elementos copiados, começando com capacidade 1 (no ×1,5, a nova capacidade é c + c // 2, e no mínimo c + 1). O n cresceu 100×: nas regras que somam, as cópias cresceram cerca de 100² = 10 000×; nas que multiplicam, na mesma proporção que n, a menos de um fator constante (o 130× em vez de 100× vem de onde cada n cai entre duas realocações).`},{type:`md`,text:`### O cofrinho: por que a média fica constante
Uma forma de enxergar o amortizado é o **{{método contábil|accounting method}}**: cada append paga um preço fixo, e o troco vai para um cofrinho que financia as cópias futuras. Na lista que dobra, cobre **3 moedas** por append: 1 paga a escrita do próprio elemento e 2 ficam guardadas.

Logo depois de uma realocação de c/2 para c, suponha o pior: o cofrinho zerado (na conta exata sobra 1 moeda), com c/2 elementos antigos na lista. A próxima realocação só acontece quando ela chega a c elementos, depois de c/2 escritas novas (contando a que disparou a realocação). Elas guardaram 2 × c/2 = **c moedas**: exatamente o preço de copiar os c elementos. O cofrinho nunca fica negativo, então n appends custam no máximo 3n moedas.

### Amortizado não é média de sorteio
Três medidas diferentes costumam ser confundidas: o **{{pior caso|worst case}}**, o custo amortizado e o **{{caso médio|average case}}**.`},{type:`table`,head:[`Medida`,`Pergunta que responde`,`Exemplo`],rows:[[`Pior caso de uma operação`,`Quanto **uma** chamada pode custar, no máximo?`,"`append` que encontra a lista cheia: O(n)"],[`Custo amortizado`,`Para **qualquer** sequência de n operações a partir da estrutura vazia, quanto dá, no máximo, o custo total dividido por n?`,"`append` na lista que dobra: O(1)"],[`Caso médio`,`Quanto custa, em média, quando a **entrada é sorteada**?`,"`x in xs` com x numa posição aleatória: cerca de n/2 comparações, O(n)"]]},{type:`callout`,tone:`warn`,text:"O amortizado é uma **garantia sobre o total**, sem probabilidade nenhuma: vale até para a pior sequência possível. Mas ele não impede que **um** append isolado custe O(n). Quando cada operação tem prazo, isso importa: um jogo a 60 quadros por segundo tem cerca de 16 ms por quadro, e uma realocação de milhões de elementos no meio de um quadro vira um engasgo. Se você sabe o tamanho final, **{{pré-alocar|preallocate}}** com `[None] * n` e preencher por índice elimina as realocações. (Uma compreensão de lista não faz isso: por dentro, ela vai anexando um elemento por vez.)",title:`Amortizado não é instantâneo`},{type:`callout`,tone:`deep`,text:`Quando muitos elementos saem, a lista pode devolver memória encolhendo. A regra ingênua, "encolher pela metade assim que só metade estiver ocupada", tem uma armadilha: com c elementos num bloco de capacidade c, um append dobra para 2c (copia c), um pop deixa metade ocupada e encolhe para c (copia c), o próximo append dobra de novo... **Cada operação custa O(n)**.

A solução clássica (CLRS) é a **{{histerese|hysteresis}}**: dobrar quando enche, mas só reduzir à metade quando a ocupação cair **abaixo de 1/4**. Depois de qualquer realocação a lista fica com cerca de metade da capacidade ocupada, e são necessárias muitas operações até a próxima. O CPython faz algo parecido: só realoca para baixo quando a lista fica com menos da metade da capacidade e, mesmo assim, deixa uma folga de cerca de 12,5%.`,title:`Encolher sem tremer`},{type:`md`,text:`### Cópias escondidas no seu código
A mesma conta explica por que alguns laços inocentes ficam quadráticos:`},{type:`table`,head:[`Dentro de um laço de n passos`,`O que acontece a cada passo`,`Total do laço`],rows:[["`xs.append(v)`",`escreve no fim; de vez em quando realoca`,`O(n)`],["`xs += [v]` ou `xs.extend(ys)`",`estende **a mesma** lista, no lugar`,`O(n), ou O(total de itens)`],["`xs = xs + [v]`",`cria uma lista **nova** e copia tudo para ela`,`O(n²)`],['`s = s + "x"` com strings',`string é imutável: pode copiar a string inteira`,`O(n²) no pior caso`],["`resto = xs[1:]`",`toda fatia é uma cópia`,`O(n²) se repetida n vezes`]]},{type:`callout`,tone:`tip`,text:'`xs = xs + [v]` é a regra **+1 disfarçada**: a cada passo nasce uma lista exatamente um elemento maior, e tudo é copiado. Para strings, junte os pedaços em uma lista e chame `"".join(pedacos)` no fim. O CPython às vezes otimiza `s += t`, mas a PEP 8 pede para não contar com isso.'}]},{stage:`exemplo`,blocks:[{type:`md`,text:`Veja 9 appends numa lista que começa com capacidade 1 e dobra quando enche. A coluna "tamanho antes" é quantos elementos já existiam quando o append começou.`},{type:`table`,head:[`Append nº`,`Tamanho antes`,`Capacidade antes`,`Realoca?`,`Cópias neste append`,`Cópias acumuladas`,`Capacidade depois`],rows:[[`1`,`0`,`1`,`não`,`0`,`0`,`1`],[`2`,`1`,`1`,`sim`,`1`,`1`,`2`],[`3`,`2`,`2`,`sim`,`2`,`3`,`4`],[`4`,`3`,`4`,`não`,`0`,`3`,`4`],[`5`,`4`,`4`,`sim`,`4`,`7`,`8`],[`6`,`5`,`8`,`não`,`0`,`7`,`8`],[`7`,`6`,`8`,`não`,`0`,`7`,`8`],[`8`,`7`,`8`,`não`,`0`,`7`,`8`],[`9`,`8`,`8`,`sim`,`8`,`15`,`16`]],caption:`15 cópias em 9 appends: menos que 2 × 9 = 18. Em troca, 7 das 16 posições estão vazias: o preço do crescimento geométrico é memória.`},{type:`md`,text:'Repare que a realocação acontece no append que **encontra** a lista cheia (o 2º, o 3º, o 5º, o 9º), não no que a enche. A próxima só virá no 17º append, e vai copiar 16 elementos.\n\nO que significa "copiar"? Python não tem um bloco cru de tamanho fixo, então podemos fingir um com `[None] * capacidade` e nunca chamar `append` nele. Siga uma realocação passo a passo:'},{type:`trace`,code:`bloco = [7, 3, 9]                  # cheio: tamanho 3, capacidade 3
novo = [None] * (2 * len(bloco))   # reserva o dobro
for i in range(len(bloco)):
    novo[i] = bloco[i]             # copia um por um: O(n)
bloco = novo
bloco[3] = 5                       # agora sim, escreve o 4º elemento
print(bloco)`,caption:`A cópia é o laço do meio: ela custa um passo por elemento que já estava na lista.`}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`import time

def com_append(n):
    xs = []
    for i in range(n):
        xs.append(i)        # estende a mesma lista
    return xs

def com_soma(n):
    xs = []
    for i in range(n):
        xs = xs + [i]       # cria uma lista nova e copia tudo
    return xs

for n in [2_000, 4_000, 8_000]:
    t0 = time.perf_counter()
    com_append(n)
    t1 = time.perf_counter()
    com_soma(n)
    t2 = time.perf_counter()
    print(f"n={n:>5}  append: {(t1 - t0) * 1000:6.2f} ms   xs = xs + [i]: {(t2 - t1) * 1000:7.2f} ms")

xs = [1, 2, 3]
antes = id(xs)
xs += [4]
print("depois de +=, mesma lista?", id(xs) == antes)
xs = xs + [5]
print("depois de xs + [5], mesma lista?", id(xs) == antes)`,runnable:!0,caption:`A cada vez que n dobra, o tempo de xs = xs + [i] quase quadruplica. O do append é tão pequeno que oscila de uma execução para outra, mas cresce só na proporção de n. O id() mostra o motivo: + cria outra lista.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e3-amort-1`,kind:`mcq`,prompt:`Numa lista que dobra de capacidade quando enche, o que a frase "append é O(1) amortizado" garante?`,difficulty:`facil`,skills:[`ed-arrays`],hints:[`Todo append custa a mesma coisa? Pense no append que encontra a lista cheia.`,`"Amortizado" fala de uma operação isolada ou de uma sequência delas?`],explanation:`A análise amortizada soma o custo de uma sequência inteira e divide pelo número de operações. Com a capacidade dobrando, n appends custam menos de 3n passos no total, embora o append que dispara a realocação, sozinho, custe O(n). Nenhuma probabilidade entra na conta.`,options:[{text:`Que todo append, sem exceção, leva tempo constante.`,feedback:`Não: o append que encontra a lista cheia copia todos os elementos e custa O(n). A garantia é sobre o total, não sobre cada chamada.`},{text:`Que qualquer sequência de n appends, a partir da lista vazia, custa O(n) no total, mesmo que alguns appends isolados custem O(n).`,correct:!0,feedback:`Isso. As realocações caras são raras o bastante para que o total fique linear, e isso vale para qualquer sequência.`},{text:`Que, em média, para dados aleatórios, o append é rápido.`,feedback:`Isso descreve caso médio, que depende de supor uma distribuição dos dados. O amortizado não supõe nada: vale até para a pior sequência possível.`},{text:`Que, como a capacidade dobra, o append nunca precisa copiar elementos.`,feedback:`Dobrar não elimina as cópias, só as torna raras. Cada realocação ainda copia todos os elementos para o bloco novo.`}]}},{type:`exercise`,exercise:{id:`e3-amort-2`,kind:`predict`,lang:`python`,prompt:"O que é impresso? Lembre-se de que `b = a` não copia a lista.",difficulty:`intermediario`,skills:[`ed-arrays`,`prog-listas`],hints:["Depois de `b = a`, quantas listas existem na memória?","`a += [3]` modifica o objeto que `a` já aponta ou cria outro?","E `a = a + [4]`? Para qual objeto o nome `a` aponta depois dessa linha? E o nome `b`?"],explanation:"`a += [3]` estende a própria lista (é um `extend`), então `b`, que aponta para ela, também vê o 3. Já `a + [4]` cria uma lista nova, copiando os elementos, e a atribuição liga só o nome `a` a ela; `b` continua com a antiga. Num laço, essa cópia a cada passo é exatamente a regra +1: O(n²).",code:`a = [1, 2]
b = a
a += [3]
print(b)
a = a + [4]
print(a, b)`,answer:`[1, 2, 3]
[1, 2, 3, 4] [1, 2, 3]`}},{type:`exercise`,exercise:{id:`e3-amort-3`,kind:`code`,lang:`python`,prompt:"Escreva `simular_appends(n, fator)` que simula n appends numa lista dinâmica que começa **vazia e com capacidade 1** e que, quando um append encontra a lista cheia, passa a ter `capacidade * fator` posições (`fator` é um inteiro ≥ 2). Cada realocação copia todos os elementos que a lista tem naquele momento. Devolva a tupla `(capacidade_final, total_de_copias)`.",difficulty:`intermediario`,skills:[`ed-arrays`],hints:[`Que três números você precisa acompanhar enquanto os appends acontecem?`,`A realocação acontece antes ou depois de escrever o novo elemento? Compare com a tabela da etapa Exemplo.`,`Quando a lista realoca, quantos elementos ela tem? É isso que entra no total de cópias.`,`Confira com a tabela: 9 appends com fator 2 terminam com capacidade 16 e 15 cópias.`],explanation:"A realocação acontece no append que encontra `tamanho == capacidade`, antes da escrita, e copia `tamanho` elementos. Por isso 16 appends com fator 2 cabem exatamente em capacidade 16 (15 cópias) e só o 17º realoca. Com fator r, o total fica abaixo de n × r / (r − 1): menos de 2n para r = 2 e menos de 1,5n para r = 3, em troca de mais posições vazias.",starter:`def simular_appends(n, fator):
    # comece com a lista vazia e capacidade 1; a cada append,
    # realoque (copiando tudo) se estiver cheia e depois escreva.
    # devolva (capacidade_final, total_de_copias)
    pass`,solution:`def simular_appends(n, fator):
    capacidade, tamanho, copias = 1, 0, 0
    for _ in range(n):
        if tamanho == capacidade:
            copias += tamanho
            capacidade *= fator
        tamanho += 1
    return (capacidade, copias)`,tests:[{name:`nenhum append`,code:`r = simular_appends(0, 2)
assert r == (1, 0), f"sem appends nada muda: esperado (1, 0), veio {r}"`},{name:`primeiros appends`,code:`for n, esperado in [(1, (1, 0)), (2, (2, 1)), (3, (4, 3))]:
    r = simular_appends(n, 2)
    assert r == esperado, f"simular_appends({n}, 2): esperado {esperado}, veio {r}"`},{name:`a tabela da lição`,code:`r = simular_appends(9, 2)
assert r == (16, 15), f"9 appends dobrando: esperado (16, 15), veio {r}. Refaça a tabela da etapa Exemplo."`},{name:`potência exata de 2`,code:`r16 = simular_appends(16, 2)
r17 = simular_appends(17, 2)
assert r16 == (16, 15), f"16 appends enchem a capacidade 16 sem realocar de novo: esperado (16, 15), veio {r16}. A realocação é no append que ENCONTRA a lista cheia."
assert r17 == (32, 31), f"o 17º append encontra a lista cheia: esperado (32, 31), veio {r17}"`},{name:`fator 3`,code:`r9 = simular_appends(9, 3)
r10 = simular_appends(10, 3)
assert r9 == (9, 4), f"capacidades 1 → 3 → 9: esperado (9, 4), veio {r9}"
assert r10 == (27, 13), f"o 10º append copia 9 elementos: esperado (27, 13), veio {r10}"`},{name:`menos de 2n cópias`,code:`for n in [5, 100, 1000, 1025, 100000]:
    cap, c = simular_appends(n, 2)
    assert cap >= n and c < 2 * n, f"n={n}: capacidade {cap} e {c} cópias; com fator 2 as cópias deveriam ficar abaixo de {2 * n}"
assert simular_appends(1000, 2) == (1024, 1023)
assert simular_appends(100000, 2) == (131072, 131071)`}]}},{type:`exercise`,exercise:{id:`e3-amort-4`,kind:`mcq`,prompt:`Para economizar memória, uma equipe trocou o fator de crescimento da sua lista dinâmica de ×2 para ×1,25. O que acontece com o custo de n appends?`,difficulty:`intermediario`,skills:[`ed-arrays`],hints:[`Com fator 1,25, os tamanhos copiados ainda formam uma progressão geométrica?`,`Na tabela da explicação, a regra ×1,5 ficou do lado O(n) ou do lado O(n²)? O que separa os dois lados?`],explanation:`Qualquer fator constante r > 1 deixa as cópias somando no máximo cerca de n × r / (r − 1): para 1,25, cerca de 5n. Logo depois de crescer, a fração vazia do bloco é cerca de (r − 1) / r: 20% em vez de 50%. É uma troca de constantes entre tempo e memória; a ordem de grandeza continua O(n).`,options:[{text:`Continua O(n) no total: há mais realocações e o limite das cópias sobe de 2n para 5n, mas logo depois de crescer o bloco fica só 20% vazio (em vez de 50%).`,correct:!0,feedback:`Isso. O fator ajusta a troca entre tempo e memória, sem mudar a ordem de grandeza.`},{text:`Vira O(n²), porque 1,25 está perto demais de 1.`,feedback:`Qualquer fator constante maior que 1 deixa a soma das cópias geométrica, logo O(n). O que leva a O(n²) é somar uma constante (+k), por maior que ela seja.`},{text:`Nada muda: o fator só afeta a memória, não o número de cópias.`,feedback:`Muda, sim: com fator menor a lista enche mais vezes e copia mais no total. Só a ordem de grandeza se mantém.`},{text:`Vira O(n log n), porque passam a existir cerca de log n realocações.`,feedback:`Com fator 2 já existem cerca de log₂ n realocações. O que importa não é quantas são, mas a soma dos tamanhos copiados, que é geométrica e dá O(n).`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e3-amort-desafio`,kind:`code`,lang:`python`,prompt:'Implemente uma lista dinâmica **com histerese**, guardada num dicionário criado por `criar()` (já pronto no código inicial): `"bloco"` é o bloco de memória (uma lista de tamanho fixo, e a capacidade é sempre `len(arr["bloco"])`), `"tamanho"` é quantas posições estão em uso e `"copias"` conta os elementos copiados em realocações. O bloco começa com capacidade 1.\n\n- `anexar(arr, valor)`: se o bloco estiver cheio, troque-o por um bloco com o **dobro** da capacidade, copiando os elementos em uso (cada um soma 1 em `arr["copias"]`); depois escreva o valor.\n- `remover_ultimo(arr)`: se estiver vazia, lance `IndexError`; senão, tire o último valor, deixe `None` na posição e devolva o valor. Depois disso, se a capacidade for maior que 1 **e** `tamanho * 4 < capacidade`, troque o bloco por um com **metade** da capacidade, copiando (e contando) os elementos em uso.\n\nGerencie o bloco só com índices: não use `append`, `pop`, `insert`, `extend`, `remove`, `clear` nem `del`.',difficulty:`desafio`,skills:[`ed-arrays`,`prog-dicionarios`],hints:['Olhando só para `arr["tamanho"]` e `len(arr["bloco"])`, como você sabe que o bloco está cheio?',"Crescer e encolher são o mesmo trabalho com outra capacidade: criar um bloco novo e copiar os elementos em uso. Que tal uma função auxiliar `realocar(arr, nova_capacidade)`?","Em `remover_ultimo`, siga uma ordem: testar se está vazia, guardar o valor, apagar a posição, diminuir o tamanho e só então testar a regra de 1/4.",`Teste a histerese: com 1 020 elementos num bloco de 1 024, alterne 10 anexar e 10 remover várias vezes. Quantas realocações a sua versão faz?`],explanation:"Depois de dobrar, a lista fica com metade da capacidade ocupada; depois de encolher, também (abaixo de 1/4, reduzir à metade deixa menos da metade em uso). Por isso, entre duas realocações sempre há uma quantidade de operações proporcional ao tamanho, e anexar e remover ficam O(1) amortizado mesmo misturados. Com a regra ingênua de encolher em 1/2, alternar operações na fronteira realoca a cada passo. Deixar `None` na posição liberada evita que a lista segure objetos que ninguém mais usa (o que Sedgewick chama de *loitering*).",starter:`def criar():
    # bloco de capacidade 1, ainda vazio
    return {"bloco": [None], "tamanho": 0, "copias": 0}


def anexar(arr, valor):
    # se o bloco estiver cheio, troque-o por um com o dobro da capacidade
    # (copiando os elementos e contando as cópias); depois escreva o valor
    pass


def remover_ultimo(arr):
    # vazia: IndexError. Senão: tire o último valor (deixe None no lugar) e devolva-o.
    # Depois, se capacidade > 1 e tamanho * 4 < capacidade, reduza o bloco à metade
    pass`,solution:`def criar():
    return {"bloco": [None], "tamanho": 0, "copias": 0}


def realocar(arr, nova_capacidade):
    novo = [None] * nova_capacidade
    for i in range(arr["tamanho"]):
        novo[i] = arr["bloco"][i]
        arr["copias"] += 1
    arr["bloco"] = novo


def anexar(arr, valor):
    if arr["tamanho"] == len(arr["bloco"]):
        realocar(arr, 2 * len(arr["bloco"]))
    arr["bloco"][arr["tamanho"]] = valor
    arr["tamanho"] += 1


def remover_ultimo(arr):
    if arr["tamanho"] == 0:
        raise IndexError("remover de uma lista vazia")
    arr["tamanho"] -= 1
    valor = arr["bloco"][arr["tamanho"]]
    arr["bloco"][arr["tamanho"]] = None
    capacidade = len(arr["bloco"])
    if capacidade > 1 and arr["tamanho"] * 4 < capacidade:
        realocar(arr, capacidade // 2)
    return valor`,tests:[{name:`cresce dobrando`,code:`arr = criar()
for v in [10, 20, 30, 40, 50]:
    anexar(arr, v)
assert arr["tamanho"] == 5, f"depois de 5 anexar, o tamanho deveria ser 5; veio {arr['tamanho']}"
assert len(arr["bloco"]) == 8, f"começando em 1 e dobrando, 5 elementos pedem capacidade 8; veio {len(arr['bloco'])}"
assert arr["bloco"] == [10, 20, 30, 40, 50, None, None, None], f"bloco inesperado: {arr['bloco']}"
assert arr["copias"] == 7, f"as realocações copiam 1 + 2 + 4 = 7 elementos; veio {arr['copias']}"`},{name:`remove do fim`,code:`arr = criar()
for v in [10, 20, 30, 40, 50]:
    anexar(arr, v)
a = remover_ultimo(arr)
b = remover_ultimo(arr)
assert (a, b) == (50, 40), f"remover_ultimo deveria devolver 50 e depois 40; veio {a} e {b}"
assert arr["tamanho"] == 3, f"tamanho esperado 3, veio {arr['tamanho']}"
assert arr["bloco"] == [10, 20, 30, None, None, None, None, None], f"com 3 de 8 em uso ainda não encolhe (3 * 4 = 12 não é menor que 8), e as posições liberadas viram None; veio {arr['bloco']}"`},{name:`realoca só quando encontra o bloco cheio`,code:`arr = criar()
anexar(arr, "a")
assert len(arr["bloco"]) == 1 and arr["copias"] == 0, f"o 1º elemento cabe no bloco de capacidade 1: ainda não é hora de crescer (veio capacidade {len(arr['bloco'])} e {arr['copias']} cópias). Só cresça no anexar que ENCONTRA o bloco cheio."
for v in ["b", "c", "d"]:
    anexar(arr, v)
assert arr["bloco"] == ["a", "b", "c", "d"], f"4 elementos enchem exatamente a capacidade 4, sem sobra; veio {arr['bloco']}"
assert arr["copias"] == 3, f"para chegar à capacidade 4 as realocações copiam 1 + 2 = 3 elementos; veio {arr['copias']}"`},{name:`lista vazia`,code:`arr = criar()
try:
    remover_ultimo(arr)
except IndexError:
    pass
else:
    raise AssertionError("remover de uma lista vazia deveria lançar IndexError")
anexar(arr, 1)
assert remover_ultimo(arr) == 1, "com um só elemento, remover_ultimo deveria devolvê-lo"
assert len(arr["bloco"]) == 1, f"a capacidade nunca cai abaixo de 1 (por isso a regra exige capacidade > 1); veio {len(arr['bloco'])}"
try:
    remover_ultimo(arr)
except IndexError:
    pass
else:
    raise AssertionError("depois de remover o único elemento, a lista está vazia: deveria lançar IndexError")
anexar(arr, 2)
assert arr["tamanho"] == 1 and arr["bloco"] == [2], f"depois de esvaziar, a lista precisa continuar aceitando elementos; veio {arr}"
anexar(arr, 3)
remover_ultimo(arr)
remover_ultimo(arr)
assert len(arr["bloco"]) == 1, f"com capacidade 2 e nenhum elemento, 0 * 4 < 2: o bloco deveria voltar à capacidade 1; veio {len(arr['bloco'])}. Use exatamente a regra tamanho * 4 < capacidade."`},{name:`encolhe abaixo de 1/4`,code:`arr = criar()
for v in range(1, 10):
    anexar(arr, v)
assert len(arr["bloco"]) == 16 and arr["copias"] == 15, f"9 elementos: capacidade 16 e 15 cópias esperadas; veio {len(arr['bloco'])} e {arr['copias']}"
for _ in range(5):
    remover_ultimo(arr)
assert len(arr["bloco"]) == 16, f"com 4 de 16 em uso (exatamente 1/4) ainda não encolhe; a capacidade veio {len(arr['bloco'])}"
remover_ultimo(arr)
assert len(arr["bloco"]) == 8, f"com 3 de 16 em uso (menos de 1/4) deveria encolher para 8; veio {len(arr['bloco'])}"
assert arr["bloco"][:3] == [1, 2, 3], f"ao encolher, os elementos em uso precisam ir junto; veio {arr['bloco']}"
assert arr["copias"] == 18, f"encolher copia os 3 elementos em uso: 15 + 3 = 18 cópias; veio {arr['copias']}"`},{name:`não realoca a cada operação na fronteira`,code:`arr = criar()
for v in range(1020):
    anexar(arr, v)
base = arr["copias"]
for _ in range(200):
    for v in range(10):
        anexar(arr, v)
    for _ in range(10):
        remover_ultimo(arr)
extra = arr["copias"] - base
assert extra <= 1024, f"alternar 10 anexar e 10 remover perto de 1 024 elementos fez {extra} cópias: a lista está crescendo e encolhendo sem parar. Revise a regra de 1/4."
assert arr["tamanho"] == 1020 and arr["bloco"][1019] == 1019, "depois das alternâncias, os 1 020 elementos originais deveriam continuar lá"`},{name:`só índices no bloco`,code:`import ast
proibidos = {"append", "pop", "insert", "extend", "remove", "clear"}
usados = set()
# só o código das funções: testes soltos no fim do arquivo não contam
funcoes = [f for f in ast.walk(ast.parse(_source)) if isinstance(f, (ast.FunctionDef, ast.Lambda))]
for no in (n for f in funcoes for n in ast.walk(f)):
    if isinstance(no, ast.Call) and isinstance(no.func, ast.Attribute) and no.func.attr in proibidos:
        usados.add(no.func.attr)
    if isinstance(no, ast.Delete):
        usados.add("del")
assert not usados, f"gerencie o bloco só com índices (bloco[i] = ...); não use: {', '.join(sorted(usados))}"`}]}}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Lista dinâmica: bloco com capacidade ≥ tamanho; quando enche, realoca e copia tudo.
- Multiplicar a capacidade por um fator r (×2, ×1,5): cópias somam menos de n × r / (r − 1) (a menos de arredondamentos), então n appends custam O(n): **O(1) amortizado**.
- Somar uma constante k (+1, +100): cópias somam cerca de n² / (2k): **O(n²)**.
- Amortizado é garantia sobre o total de qualquer sequência; um append isolado ainda pode custar O(n).
- Para encolher sem tremer: dobrar quando enche, reduzir à metade só abaixo de 1/4 (histerese).
- Cuidado com cópias escondidas: \`xs = xs + [v]\`, concatenação de strings e fatias dentro de laços.`},{type:`callout`,tone:`english`,text:`- **amortized O(1)**: O(1) amortizado
- **to reallocate / reallocation**: realocar / realocação
- **growth factor**: fator de crescimento
- **worst case**: pior caso
- **to preallocate**: pré-alocar

Frase típica de entrevista: *"Appending to a dynamic array is amortized O(1): a single append may trigger an O(n) copy, but because the capacity doubles, n appends cost O(n) in total."*`,title:`English corner`}]}],cards:[{id:`l3-crescimento-amortizado#1`,front:`Começando com capacidade 1 e dobrando, qual o limite para o total de cópias em n appends, e por quê?`,back:`Menos de 2n: as cópias são 1 + 2 + 4 + … + 2^k com 2^k < n, e essa soma é 2^(k+1) − 1. Com as n escritas, menos de 3n.`},{id:`l3-crescimento-amortizado#2`,front:`Por que crescer a capacidade de k em k deixa n appends em O(n²)?`,back:`São cerca de n/k realocações, copiando k, 2k, 3k, … elementos: a soma fica perto de n²/(2k). O k só divide a constante.`},{id:`l3-crescimento-amortizado#3`,front:`Qual a diferença entre custo amortizado e caso médio?`,back:`Amortizado é o custo total de qualquer sequência dividido pelo número de operações, sem probabilidade. Caso médio é a média sobre entradas sorteadas.`},{id:`l3-crescimento-amortizado#4`,front:`Por que uma lista dinâmica não deve encolher assim que fica com metade da capacidade em uso?`,back:`Alternar append e pop na fronteira faria crescer e encolher a cada operação, O(n) cada. Encolher só abaixo de 1/4 deixa folga (histerese).`},{id:`l3-crescimento-amortizado#5`,front:"Qual a diferença de custo entre `xs += [v]` e `xs = xs + [v]` dentro de um laço?",back:"`+=` estende a mesma lista: O(1) amortizado por passo. `xs + [v]` cria uma lista nova copiando tudo: O(n) por passo, O(n²) no laço."},{id:`l3-crescimento-amortizado#6`,front:`No método contábil para a lista que dobra, quanto cada append paga e para quê?`,back:`3 moedas: 1 pela própria escrita e 2 guardadas, que somadas pagam a cópia de todos os elementos na próxima realocação.`}]};export{e as default};
//# sourceMappingURL=l3-crescimento-amortizado-vw1GS39M.js.map