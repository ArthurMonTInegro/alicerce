var e={id:`l3-enderecamento-aberto`,moduleId:`m3-3`,title:`Colisões por dentro: endereçamento aberto e fator de carga`,titleEn:`Collisions up close: open addressing and load factor`,summary:`Por que colisões são inevitáveis, como a sondagem linear resolve conflitos sem listas, por que remover exige lápides e como o fator de carga decide o custo de cada busca e a hora de reconstruir a tabela.`,minutes:45,objectives:[`Explicar, com o paradoxo do aniversário, por que colisões acontecem mesmo com uma boa função hash`,`Inserir, buscar e remover à mão numa tabela com sondagem linear, inclusive com lápides`,`Relacionar o fator de carga ao número esperado de sondagens e justificar o limite de 2/3 do dict`,`Distinguir crescer a tabela de apenas limpar as lápides, e explicar por que a reconstrução custa O(1) amortizado`],skills:[`ed-hash`],terms:[{pt:`encadeamento`,en:`separate chaining`,def:`Estratégia de colisão em que cada posição da tabela guarda uma lista com todas as chaves que caíram nela.`},{pt:`endereçamento aberto`,en:`open addressing`,def:`Estratégia de colisão em que cada posição guarda no máximo uma chave; se a posição está ocupada, procura-se outra seguindo uma regra fixa.`,example:`CPython dictionaries use open addressing to resolve hash collisions.`},{pt:`sondagem linear`,en:`linear probing`,def:`Regra de endereçamento aberto que, depois da posição de origem, tenta a seguinte (i + 1, i + 2, ...), dando a volta no fim do array.`},{pt:`sequência de sondagem`,en:`probe sequence`,def:`Ordem das posições visitadas ao inserir ou procurar uma chave.`},{pt:`lápide`,en:`tombstone`,def:`Marca deixada na posição de uma chave removida, para que as buscas continuem passando por ali.`,example:`Deleted entries are replaced by a dummy (tombstone) so that probe sequences are not broken.`},{pt:`agrupamento primário`,en:`primary clustering`,def:`Tendência da sondagem linear de formar blocos contíguos de posições ocupadas, que crescem e deixam as buscas cada vez mais longas.`},{pt:`paradoxo do aniversário`,en:`birthday paradox`,def:`Com só 23 pessoas, a chance de duas fazerem aniversário no mesmo dia passa de 50%; com m posições, cerca de 1,2·√m chaves já dão 50% de chance de colisão.`},{pt:`reconstrução`,en:`rehashing`,def:`Criar um array novo e reinserir nele todas as chaves vivas; acontece para crescer a tabela ou para limpar lápides.`,example:`When the load factor exceeds the threshold, the table is resized and every entry is rehashed.`}],references:[`sedgewick-algs`,`clrs`,`mit-6006`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:"Na lição anterior, você resolveu colisões guardando uma lista em cada posição da tabela: o {{encadeamento|separate chaining}}. A lição citou a alternativa que o `dict` e o `set` do Python usam, o {{endereçamento aberto|open addressing}}; agora é hora de vê-la por dentro. Cada posição do array guarda **no máximo uma** chave; se a posição calculada já está ocupada, a tabela tenta outra, sempre seguindo a mesma regra. Fica tudo num único array, sem listas extras, o que gasta menos memória e aproveita melhor o cache.\n\nEsse desenho cobra um preço em três lugares, e eles são o assunto desta lição: a tabela nunca pode encher (o fator de carga fica sempre abaixo de 1), **remover** uma chave exige um truque e o custo de cada busca dispara quando a tabela fica cheia demais. É por isso que o `dict` cresce bem antes de lotar."}]},{stage:`explicacao`,blocks:[{type:`md`,text:`### Colisões são inevitáveis
Nem uma ótima função hash evita colisões quando as chaves não são conhecidas de antemão. Pense no {{paradoxo do aniversário|birthday paradox}}: numa sala com só **23 pessoas**, a chance de duas fazerem aniversário no mesmo dia já passa de 50%, embora o ano tenha 365 dias. Com chaves espalhadas ao acaso por *m* posições, a chance de haver alguma colisão chega a 50% com cerca de **1,2·√m** chaves. Numa tabela com 1 milhão de posições, bastam umas 1.200 chaves. A pergunta certa, então, não é "como evitar colisões?", e sim "como lidar com elas gastando pouco?".

### Sondagem linear: tente a próxima
A forma mais simples de endereçamento aberto é a {{sondagem linear|linear probing}}. A {{sequência de sondagem|probe sequence}} de uma chave começa na posição de origem \`i = hash(chave) % m\` e continua em \`i + 1\`, \`i + 2\` e assim por diante, dando a volta no fim do array com \`(i + 1) % m\`.

- **Inserir**: siga a sequência até achar a própria chave (aí basta trocar o valor) ou uma posição vazia (grave ali).
- **Buscar**: siga a mesma sequência. Achou a chave: pronto. Achou uma posição **vazia**: a chave não existe, porque, se existisse, teria sido gravada naquele vazio ou antes dele.

Esse "ou antes dele" é o invariante que sustenta tudo: **entre a posição de origem de uma chave e a posição onde ela está, nenhuma posição está vazia**.

### Remover: a lápide
Apagar a chave, pondo \`None\` na posição, quebra o invariante. Uma busca por outra chave que precisou passar por ali para ser gravada vai parar no buraco e concluir, errado, que a chave não existe. A saída é trocar a chave removida por uma {{lápide|tombstone}}: uma marca que diz "já teve alguém aqui, continue procurando".

- A **busca** passa por cima das lápides e só para na chave ou numa posição vazia.
- A **inserção** pode reaproveitar a primeira lápide do caminho, mas só **depois** de conferir que a chave não está mais adiante. Senão, a mesma chave fica duas vezes na tabela.
- Lápides ocupam lugar: uma tabela com poucas chaves e muitas lápides tem buscas tão longas quanto uma tabela cheia. Por isso elas **contam** na hora de decidir se é preciso reconstruir.

### Agrupamento primário
Na sondagem linear, as posições ocupadas tendem a formar blocos contíguos. Uma chave que cai em qualquer ponto de um bloco vai parar no fim dele e o aumenta, e blocos vizinhos acabam se fundindo. É o {{agrupamento primário|primary clustering}}: bloco grande atrai mais chaves, e as buscas que caem nele ficam longas. Qualquer endereçamento aberto fica lento perto de cheio, porque sobram poucos vazios onde a busca possa parar; o agrupamento faz a sondagem linear piorar bem mais depressa. O custo não cresce em linha reta com a ocupação: ele explode.

### Fator de carga e custo
Com *n* chaves num array de *m* posições, o fator de carga é **α = n/m**. No endereçamento aberto, α nunca passa de 1, porque cada posição guarda uma chave só, e precisa ficar abaixo de 1: sem nenhum vazio, a busca sem sucesso não teria onde parar. (Se houver lápides, conte-as junto: para a busca, elas ocupam lugar como chaves.) Supondo que a função hash espalhe as chaves ao acaso, Donald Knuth calculou quantas posições a sondagem linear visita em média:`},{type:`table`,head:[`α (ocupação)`,`Encadeamento, busca sem sucesso: ≈ 1 + α`,`Sondagem linear, busca com sucesso: ≈ ½(1 + 1/(1 − α))`,`Sondagem linear, busca sem sucesso: ≈ ½(1 + 1/(1 − α)²)`],rows:[[`0,25`,`1,25`,`1,17`,`1,39`],[`0,50`,`1,5`,`1,5`,`2,5`],[`2/3 ≈ 0,67`,`1,67`,`2,0`,`5,0`],[`0,75`,`1,75`,`2,5`,`8,5`],[`0,90`,`1,9`,`5,5`,`50,5`],[`0,99`,`1,99`,`50,5`,`5.000,5`]],caption:`Médias esperadas em tabelas grandes com chaves bem espalhadas. No encadeamento, conta-se o balde mais os α itens da lista, e α pode até passar de 1; na sondagem linear, contam-se as posições visitadas, incluindo o vazio onde a busca sem sucesso para.`},{type:`md`,text:'Olhe as últimas linhas: com 90% de ocupação, uma busca por chave ausente visita 50 posições em média; com 99%, 5.000. Com 2/3, são 5 posições na busca sem sucesso e 2 na busca com sucesso. Por isso as implementações reais reconstroem a tabela bem antes de ela encher. O `dict` do CPython mantém no máximo 2/3 das posições em uso e, quando passaria disso, faz uma {{reconstrução|rehashing}}. (Ele nem usa a sondagem linear pura: a dele, descrita no quadro "Como o dict do CPython faz", quase não forma blocos, e com 2/3 de ocupação as buscas ficam ainda mais curtas do que na tabela.)\n\n### Crescer ou só limpar\nReconstruir é criar um array novo e reinserir nele **só as chaves vivas**. As lápides somem, e as chaves mudam de lugar, porque `hash(chave) % m` depende de *m*. O tamanho novo deve ser decidido pelas chaves vivas: se a ocupação vinha quase toda de lápides, um array do **mesmo** tamanho basta, e a reconstrução só faz faxina.\n\nReconstruir custa O(m), mas, logo depois de uma reconstrução, a ocupação fica em torno de 1/3 ou menos, e são necessárias pelo menos umas m/3 inserções em posições vazias para ela chegar de novo a 2/3. Espalhado por essas operações, o custo dá **O(1) amortizado** por operação, a mesma conta do `append` da lista dinâmica.'},{type:`callout`,tone:`warn`,text:"Num `dict` ou `set`, operações valem O(1) **em média** e **amortizado**. Uma busca específica pode visitar várias posições, e uma inserção específica pode disparar uma reconstrução O(n). Quando cada operação precisa ser rápida, como num jogo que desenha 60 quadros por segundo, esse pico eventual importa.",title:`O(1) não é sempre`},{type:`callout`,tone:`deep`,text:'- **Sondagem com perturbação**: o CPython não anda de 1 em 1. A variável `perturb` começa igual ao hash inteiro e, a cada passo, perde 5 bits (`perturb >>= 5`); a próxima posição é `i = (5*i + 1 + perturb) % m`. Assim os bits altos do hash também influenciam o caminho, e o agrupamento primário praticamente some. Quando `perturb` chega a zero, a regra `5*i + 1` passa por todas as posições de uma tabela cujo tamanho é potência de 2.\n- **Ordem de inserção**: desde o Python 3.7, o `dict` lembra a ordem em que as chaves entraram. O truque são dois arrays: um de índices, esparso, onde acontece a sondagem, e um de entradas, compacto, na ordem de inserção. A sondagem descobre "é a entrada nº 3"; a iteração percorre as entradas em ordem.\n- **Hash guardado**: o CPython não recalcula o hash das chaves que já estão na tabela; o valor fica salvo (na entrada ou, no caso de strings, no próprio objeto). Isso barateia a reconstrução e permite comparar hashes antes de chamar `==`.',title:`Como o dict do CPython faz`}]},{stage:`exemplo`,blocks:[{type:`md`,text:"Uma tabela com **m = 8** posições e chaves inteiras. No CPython, `hash(n) == n` para inteiros não negativos pequenos, então a posição de origem é simplesmente `n % 8`. Na última coluna, `·` é posição vazia e `†` é lápide."},{type:`table`,head:[`Operação`,`Posições visitadas`,`O que acontece`,`Tabela (posições 0 a 7)`],rows:[["`put(3)`",`3`,`vazia: grava`,"`· · · 3 · · · ·`"],["`put(11)`",`3, 4`,`11 % 8 = 3, ocupada pelo 3; grava na 4`,"`· · · 3 11 · · ·`"],["`put(19)`",`3, 4, 5`,`mesma origem 3; grava na 5`,"`· · · 3 11 19 · ·`"],["`put(4)`",`4, 5, 6`,`nenhuma outra chave tem origem 4, mas o bloco 3–5 cresceu por cima dela: grava na 6 (agrupamento primário)`,"`· · · 3 11 19 4 ·`"],["`remove(11)`",`3, 4`,`acha o 11 na posição 4 e põe uma lápide`,"`· · · 3 † 19 4 ·`"],["`get(19)`",`3, 4, 5`,`a lápide não para a busca: acha na 5`,`(igual)`],["`put(19, novo)`",`3, 4, 5`,`anota a lápide da 4, mas continua: o 19 está na 5 e é atualizado ali`,`(igual)`],["`put(27)`",`3, 4, 5, 6, 7`,`27 % 8 = 3; chega ao vazio da 7 sem achar o 27; grava na primeira lápide do caminho, a 4`,"`· · · 3 27 19 4 ·`"],["`get(35)`",`3, 4, 5, 6, 7`,`35 % 8 = 3; chega ao vazio da 7: o 35 não existe`,`(igual)`]],caption:`Cada linha começa da tabela deixada pela linha anterior.`},{type:`md`,text:"Agora imagine que o `remove(11)` tivesse posto `None` na posição 4. O `get(19)` olharia a 3 (é o 3, não o 19), depois a 4 (vazia) e pararia dizendo que o 19 não existe, embora ele esteja na 5. E o `put(19, novo)` gravaria um **segundo** 19 na posição 4. A lápide evita os dois erros."}]},{stage:`codigo`,blocks:[{type:`md`,text:`O programa abaixo enche tabelas de 4.096 posições com chaves aleatórias até vários fatores de carga e mede quantas posições uma busca por chave ausente visita. Compare com a fórmula da tabela de custos.`},{type:`code`,lang:`python`,code:`import random

def inserir(tabela, chave):
    m = len(tabela)
    i = hash(chave) % m
    while tabela[i] is not None and tabela[i] != chave:
        i = (i + 1) % m                  # sondagem linear, com volta
    tabela[i] = chave

def sondagens_sem_sucesso(tabela, chave):
    m = len(tabela)
    i = hash(chave) % m
    passos = 1
    while tabela[i] is not None:         # só para no vazio
        i = (i + 1) % m
        passos += 1
    return passos

random.seed(2024)
m = 4096
print("   α   medido   previsto")
for alfa in [0.25, 0.5, 2 / 3, 0.75, 0.9]:
    tabela = [None] * m
    for k in random.sample(range(10**9), int(alfa * m)):
        inserir(tabela, k)
    ausentes = random.sample(range(10**9, 2 * 10**9), 2000)
    media = sum(sondagens_sem_sucesso(tabela, k) for k in ausentes) / len(ausentes)
    previsto = 0.5 * (1 + 1 / (1 - alfa) ** 2)
    print(f"{alfa:5.2f} {media:8.2f} {previsto:9.2f}")`,runnable:!0,caption:`Com 90% de ocupação, a medida varia bastante de uma semente para outra: poucos blocos enormes dominam a média.`},{type:`code`,lang:`python`,code:`import sys

d = {}
tamanho = sys.getsizeof(d)
print(f"{len(d):>3} chaves: {tamanho} bytes")
for i in range(100):
    d[i] = i
    novo = sys.getsizeof(d)
    if novo != tamanho:                  # a tabela foi alocada ou reconstruída
        print(f"{len(d):>3} chaves: {novo} bytes")
        tamanho = novo`,runnable:!0,caption:`O dict cresce aos saltos. O primeiro, na 1ª chave, é só a criação da tabela inicial de 8 posições. Os seguintes, no CPython, costumam vir na 6ª, 11ª, 22ª, 43ª e 86ª chave: é quando tabelas de 8, 16, 32, 64 e 128 posições passariam de 2/3 (cabem 5, 10, 21, 42 e 85). Os bytes exatos mudam com a versão e a plataforma.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e3-ea-1`,kind:`mcq`,prompt:`Numa tabela com sondagem linear e lápides, em que momento uma busca pode concluir que a chave **não existe**?`,difficulty:`facil`,skills:[`ed-hash`],hints:[`Qual é o invariante da sondagem linear: o que nunca existe entre a posição de origem de uma chave e a posição onde ela está?`,`Qual das situações garante que a chave procurada não pode estar mais adiante no caminho?`],explanation:`Pelo invariante, entre a origem de uma chave e a posição dela não há vazios. Logo, se a busca chega a um vazio, a chave não está mais adiante. Lápides, chaves de outras origens e colisões na origem não dizem nada: a busca precisa continuar.`,options:[{text:`Quando chega a uma posição vazia (que nunca foi usada)`,correct:!0,feedback:`Isso: se a chave existisse, ela teria sido gravada naquele vazio ou antes dele.`},{text:`Quando chega a uma lápide`,feedback:`A lápide quer dizer "já teve alguém aqui, continue". A chave pode estar logo depois, como o 19 depois da lápide da posição 4 no exemplo.`},{text:`Quando encontra uma chave cuja posição de origem é outra`,feedback:`Chaves de outras origens podem estar no meio do bloco, como o 4 na posição 6 do exemplo. Encontrar uma delas não encerra nada: continue.`},{text:`Quando a posição de origem está ocupada por outra chave`,feedback:`Isso só mostra que houve colisão. No endereçamento aberto não há lista no balde: a chave procurada pode estar nas posições seguintes.`}]}},{type:`exercise`,exercise:{id:`e3-ea-2`,kind:`predict`,lang:`python`,prompt:`Inserção com sondagem linear numa tabela de 7 posições, sem remoções. O que é impresso?`,difficulty:`intermediario`,skills:[`ed-hash`],hints:[`Desenhe as posições 0 a 6 e insira uma chave por vez. Qual é a origem (k % 7) de cada uma?`,`Quatro chaves têm a mesma origem. E o 5: o que acontece quando a sondagem passa da última posição?`],explanation:"10, 3, 17 e 24 têm origem 3 (são 3 mais múltiplos de 7) e ocupam as posições 3, 4, 5 e 6. O 5 tem origem 5, que o 17 já tomou: ele não colidiu com nenhuma chave de mesma origem, e sim com o bloco que cresceu por cima dela (agrupamento primário). Passa pela 6 e dá a volta, porque `(6 + 1) % 7 == 0`.",code:`m = 7
t = [None] * m
for k in [10, 3, 17, 24, 5]:
    i = k % m
    while t[i] is not None:
        i = (i + 1) % m
    t[i] = k
print(t)`,answer:`[5, None, None, 10, 3, 17, 24]`}},{type:`exercise`,exercise:{id:`e3-ea-3`,kind:`mcq`,prompt:`Uma tabela com sondagem linear tem 1.000 posições e 900 chaves bem espalhadas. Em média, quantas posições uma busca por uma chave **ausente** visita?`,difficulty:`intermediario`,skills:[`ed-hash`],hints:[`Qual é o fator de carga α dessa tabela?`,`Que fórmula da tabela de custos vale para a busca sem sucesso? Quanto dá 1 − α, e o que acontece quando ele aparece ao quadrado no denominador?`],explanation:`Com α = 0,9, a busca sem sucesso custa ≈ ½(1 + 1/(1 − 0,9)²) = ½(1 + 100) ≈ 50 posições. Ela precisa atravessar o bloco inteiro até um vazio, e com 90% de ocupação os blocos são enormes. Por isso implementações reais reconstroem a tabela bem antes: o dict do CPython, em 2/3.`,options:[{text:`Cerca de 2`,feedback:`Perto de 1 + α = 1,9 é o custo do encadeamento, em que a busca só percorre a lista de um balde. Na sondagem linear, a busca sem sucesso atravessa o bloco inteiro até achar um vazio, e a 90% de ocupação o agrupamento primário deixa os blocos enormes.`},{text:`Cerca de 5`,feedback:`Perto de 5,5 é o custo da busca **com sucesso** a 90%. A busca sem sucesso precisa chegar ao fim do bloco, e a fórmula dela tem (1 − α) ao quadrado.`},{text:`Cerca de 50`,correct:!0,feedback:`Isso: ½(1 + 1/0,1²) = ½(1 + 100) ≈ 50.`},{text:`Cerca de 900`,feedback:`Esse é o pior caso (todas as chaves num único bloco), não a média com chaves bem espalhadas.`}]}},{type:`exercise`,exercise:{id:`e3-ea-4`,kind:`code`,lang:`python`,prompt:"A tabela usa sondagem linear e é uma lista em que cada posição é `None` (nunca usada), `LAPIDE` (chave removida) ou uma tupla `(chave, valor)`. Escreva `buscar(tabela, chave)`, que devolve o valor associado à chave ou lança `KeyError`. A origem é `hash(chave) % len(tabela)`. Cuidado com a volta no fim da lista e com tabelas sem nenhum `None` (só chaves e lápides): a busca não pode girar para sempre.",difficulty:`intermediario`,skills:[`ed-hash`],hints:[`Em quais situações a busca termina? Liste todas, inclusive a que não depende do conteúdo da posição.`,"Antes de olhar `item[0]`, o que você precisa saber sobre o item? Dá para indexar uma lápide?",`Quantas posições, no máximo, uma busca precisa visitar antes de ter certeza de que já viu a tabela inteira?`],explanation:"A busca para em três casos: achou a chave (devolve o valor), achou um `None` (a chave não existe, pelo invariante) ou já visitou as m posições (tabela sem vazios). Lápides são puladas, e é preciso compará-las com `is LAPIDE` antes de olhar `item[0]`. Parar no primeiro `None` é o que faz a busca sem sucesso custar pouco quando a tabela não está cheia.",starter:`LAPIDE = object()  # marca de chave removida

def buscar(tabela, chave):
    # comece em hash(chave) % len(tabela) e siga a sondagem linear
    pass`,solution:`LAPIDE = object()  # marca de chave removida

def buscar(tabela, chave):
    m = len(tabela)
    i = hash(chave) % m
    for _ in range(m):
        item = tabela[i]
        if item is None:
            break
        if item is not LAPIDE and item[0] == chave:
            return item[1]
        i = (i + 1) % m
    raise KeyError(chave)`,tests:[{name:`acha na origem e depois de colisões`,code:`t = [None] * 8
t[3] = (3, "a"); t[4] = (11, "b"); t[5] = (19, "c"); t[6] = (4, "d")
for k, v in [(3, "a"), (11, "b"), (19, "c"), (4, "d")]:
    try:
        r = buscar(t, k)
    except KeyError:
        raise AssertionError(f"buscar(t, {k}) lançou KeyError, mas o {k} está na tabela: comece em hash({k}) % 8 e siga para as próximas posições") from None
    assert r == v, f"buscar(t, {k}) devolveu {r!r}; esperado {v!r}"`},{name:`chave ausente lança KeyError`,code:`t = [None] * 8
t[3] = (3, "a"); t[4] = (11, "b")
for k in [27, 0, 5]:
    try:
        r = buscar(t, k)
    except KeyError:
        continue
    assert False, f"buscar(t, {k}) devolveu {r!r}; deveria lançar KeyError"`},{name:`passa por cima das lápides`,code:`t = [None] * 8
t[3] = (3, "a"); t[4] = LAPIDE; t[5] = (19, "c"); t[6] = (4, "d")
for k, v, onde in [(19, "c", 5), (4, "d", 6)]:
    try:
        r = buscar(t, k)
    except KeyError:
        raise AssertionError(f"buscar(t, {k}) lançou KeyError, mas o {k} está na posição {onde}: a lápide na posição 4 não pode parar a busca") from None
    assert r == v, f"buscar(t, {k}) devolveu {r!r}; esperado {v!r}"
try:
    buscar(t, 11)
    assert False, "o 11 foi removido (há uma lápide no lugar): buscar(t, 11) deveria lançar KeyError"
except KeyError:
    pass`},{name:`para na primeira posição vazia`,code:`t = [None] * 8
t[2] = (1, "x")  # a origem do 1 é a posição 1, que está vazia
try:
    r = buscar(t, 1)
    assert False, f"buscar(t, 1) devolveu {r!r}: a busca deve parar no primeiro vazio do caminho (posição 1), porque, se a chave existisse, estaria antes dele"
except KeyError:
    pass`},{name:`dá a volta no fim da lista`,code:`t = [None] * 8
t[7] = (7, "sete"); t[0] = (15, "quinze")  # 15 % 8 == 7, ocupada: foi para a 0
try:
    r = buscar(t, 15)
except (KeyError, IndexError) as e:
    raise AssertionError(f"buscar(t, 15) lançou {type(e).__name__}, mas o 15 está na posição 0: depois da última posição (7) vem a 0") from None
assert r == "quinze", f"buscar(t, 15) devolveu {r!r}; depois da posição 7 vem a 0"`},{name:`compara as chaves com ==`,code:`t = [None] * 8
t[6] = (-1, "menos um"); t[7] = (-2, "menos dois")   # hash(-1) == hash(-2) == -2: as duas têm origem 6
try:
    r = buscar(t, -2)
except KeyError:
    r = KeyError
assert r == "menos dois", f"buscar(t, -2) {'lançou KeyError' if r is KeyError else f'devolveu {r!r}'}; esperado 'menos dois'. Em Python, hash(-1) == hash(-2): hashes iguais não garantem chaves iguais, então compare a chave guardada com a procurada usando =="
guardada = "".join(["mat", "-", "2024"])
procurada = "mat-" + str(2024)          # igual à guardada, mas é outro objeto
t = [None] * 8
t[hash(guardada) % 8] = (guardada, "ok")
try:
    r = buscar(t, procurada)
except KeyError:
    r = KeyError
assert r == "ok", f"buscar(t, 'mat-2024') {'lançou KeyError' if r is KeyError else f'devolveu {r!r}'}, mas a chave guardada é igual (só é outro objeto): compare com ==, não com is"`},{name:`funciona com chaves de texto`,code:`def _poe(t, k, v):
    i = hash(k) % len(t)
    while t[i] is not None:
        i = (i + 1) % len(t)
    t[i] = (k, v)
t = [None] * 16
for nome, cep in [("ana", "01310-100"), ("bia", "20040-002"), ("caio", "70040-010"), ("davi", "40020-000")]:
    _poe(t, nome, cep)
assert buscar(t, "caio") == "70040-010", "não achou a chave 'caio'"
assert buscar(t, "ana") == "01310-100", "não achou a chave 'ana'"
try:
    buscar(t, "eva")
    assert False, "buscar(t, 'eva') deveria lançar KeyError"
except KeyError:
    pass`},{name:`tabela sem nenhum vazio: visita as m posições e não trava`,code:`class _Tabela(list):
    leituras = 0
    def __getitem__(self, i):
        self.leituras += 1
        assert self.leituras <= 40, "a busca já fez mais de 40 leituras numa tabela de 4 posições e não parou: numa tabela sem nenhum None, desista depois de visitar as m posições"
        return list.__getitem__(self, i)
t = _Tabela([LAPIDE] * 4)
t[2] = (6, "seis")    # origem 2
t[0] = (5, "cinco")   # origem 1: o caminho foi 1, 2, 3 e deu a volta até a 0
try:
    r = buscar(t, 5)
except KeyError:
    raise AssertionError("buscar(t, 5) lançou KeyError, mas o 5 está na posição 0: o caminho dele é 1, 2, 3, 0, e a busca precisa visitar todas as m posições (não m - 1) antes de desistir") from None
assert r == "cinco", f"buscar(t, 5) devolveu {r!r}; esperado 'cinco'"
t.leituras = 0
try:
    buscar(t, 2)
    assert False, "buscar(t, 2) deveria lançar KeyError depois de visitar as 4 posições"
except KeyError:
    pass`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e3-ea-desafio`,kind:`code`,lang:`python`,prompt:"Implemente `TabelaAberta`, um dicionário com endereçamento aberto e sondagem linear. O `__init__` já está pronto e fixa a representação: `self.slots` é uma lista de `self.m` posições, cada uma `None` (nunca usada), `LAPIDE` (chave removida) ou uma tupla `(chave, valor)`; `self.n` conta as chaves vivas e `self.lapides`, as lápides. A origem de uma chave é `hash(chave) % self.m`.\n\n- `get(chave)`: devolve o valor ou lança `KeyError`.\n- `put(chave, valor)`: se a chave existe, troca o valor no mesmo lugar; senão, grava na **primeira lápide** do caminho ou, se não houver lápide, na posição vazia onde a busca parou. Depois, se `(n + lapides) / m` passar de **2/3**, reconstrua.\n- `remove(chave)`: troca a entrada por `LAPIDE`; lança `KeyError` se a chave não existe.\n- **Reconstruir**: se mais de 1/3 das posições tem chave viva (`n / m > 1/3`), use o dobro de posições; senão, mantenha `m` (só limpa as lápides). Recomece com todas as posições `None` e reinsira apenas as chaves vivas.\n\nNão use `dict` nem `set`.",difficulty:`desafio`,skills:[`ed-hash`],hints:[`As três operações começam com a mesma caminhada a partir da origem. O que cada uma precisa saber quando a caminhada termina?`,"No `put`, por que não dá para gravar na primeira lápide assim que ela aparece? O que ainda pode estar mais adiante no caminho?","Uma função auxiliar pode caminhar até achar a chave ou um `None` e devolver duas posições: onde a chave está (se estiver) e a primeira posição livre vista (lápide ou o próprio `None`). Ela serve às três operações.","Na reconstrução, separe as entradas vivas antes de mexer em qualquer coisa, decida o novo `m` olhando só `self.n`, recrie `slots`, zere os dois contadores e reinsira com o próprio `put`."],explanation:`A caminhada comum é o coração da estrutura: ela só para na chave ou num vazio, nunca numa lápide, e lembra a primeira lápide para reaproveitar. Reaproveitar só depois de conferir o resto do caminho evita chaves duplicadas. Contar lápides no limite impede que a tabela se encha delas até não sobrar nenhum vazio, o que faria a busca girar para sempre. E decidir o tamanho novo pelas chaves vivas separa crescer de faxinar: depois de qualquer reconstrução a ocupação fica em cerca de 1/3 ou menos, faltam pelo menos umas m/3 inserções até a próxima, e o custo O(m) dela se dilui em O(1) amortizado.`,starter:`LAPIDE = object()  # marca de chave removida

class TabelaAberta:
    def __init__(self, m=8):
        self.m = m
        self.slots = [None] * m   # None, LAPIDE ou (chave, valor)
        self.n = 0                # chaves vivas
        self.lapides = 0          # posições com LAPIDE

    def get(self, chave):
        pass

    def put(self, chave, valor):
        pass

    def remove(self, chave):
        pass

    def __len__(self):
        return self.n`,solution:`LAPIDE = object()  # marca de chave removida

class TabelaAberta:
    def __init__(self, m=8):
        self.m = m
        self.slots = [None] * m   # None, LAPIDE ou (chave, valor)
        self.n = 0                # chaves vivas
        self.lapides = 0          # posições com LAPIDE

    def _caminhar(self, chave):
        """Devolve (posição da chave ou None, primeira posição livre do caminho)."""
        i = hash(chave) % self.m
        livre = None
        while True:
            item = self.slots[i]
            if item is None:
                return None, (i if livre is None else livre)
            if item is LAPIDE:
                if livre is None:
                    livre = i
            elif item[0] == chave:
                return i, livre
            i = (i + 1) % self.m

    def get(self, chave):
        pos, _ = self._caminhar(chave)
        if pos is None:
            raise KeyError(chave)
        return self.slots[pos][1]

    def put(self, chave, valor):
        pos, livre = self._caminhar(chave)
        if pos is not None:
            self.slots[pos] = (chave, valor)
            return
        if self.slots[livre] is LAPIDE:
            self.lapides -= 1
        self.slots[livre] = (chave, valor)
        self.n += 1
        if (self.n + self.lapides) * 3 > 2 * self.m:
            self._reconstruir()

    def remove(self, chave):
        pos, _ = self._caminhar(chave)
        if pos is None:
            raise KeyError(chave)
        self.slots[pos] = LAPIDE
        self.n -= 1
        self.lapides += 1

    def _reconstruir(self):
        vivas = [item for item in self.slots if item is not None and item is not LAPIDE]
        if self.n * 3 > self.m:
            self.m *= 2
        self.slots = [None] * self.m
        self.n = 0
        self.lapides = 0
        for chave, valor in vivas:
            self.put(chave, valor)

    def __len__(self):
        return self.n`,tests:[{name:`put, get e atualização`,code:`t = TabelaAberta()
t.put("a", 1); t.put("b", 2); t.put("a", 3)
assert t.get("a") == 3, f"get('a') devolveu {t.get('a')!r}; o segundo put deveria ter trocado o valor para 3"
assert t.get("b") == 2, "get('b') deveria devolver 2"
assert len(t) == 2, f"len(t) == {len(t)}; atualizar uma chave não cria outra"
try:
    t.get("z")
    assert False, "get('z') deveria lançar KeyError"
except KeyError:
    pass`},{name:`sondagem linear nas posições certas`,code:`t = TabelaAberta(8)
for k in [3, 11, 19, 4]:
    t.put(k, str(k))
pos = {it[0]: i for i, it in enumerate(t.slots) if it is not None and it is not LAPIDE}
assert pos == {3: 3, 11: 4, 19: 5, 4: 6}, f"posições {pos}; esperado 3→3, 11→4, 19→5, 4→6 (origem k % 8 e depois a próxima posição)"`},{name:`get segue a sondagem e para no primeiro vazio`,code:`t = TabelaAberta(8)
t.slots[2] = (1, "fora do caminho")   # a origem do 1 é a posição 1, que está vazia
t.n = 1
try:
    r = t.get(1)
    assert False, f"get(1) devolveu {r!r}, mas a origem do 1 (posição 1) está vazia: a busca começa em hash(chave) % m e para no primeiro None, sem varrer a tabela inteira"
except KeyError:
    pass`},{name:`remove deixa lápide e a busca continua`,code:`t = TabelaAberta(8)
for k in [3, 11, 19, 4]:
    t.put(k, str(k))
t.remove(11)
assert t.slots[4] is LAPIDE, f"depois de remove(11), a posição 4 deveria ter LAPIDE, e tem {t.slots[4]!r}"
for k in (19, 4):
    try:
        r = t.get(k)
    except KeyError:
        raise AssertionError(f"get({k}) lançou KeyError depois de remove(11): a lápide na posição 4 não pode interromper a busca pelo {k}") from None
    assert r == str(k), f"get({k}) devolveu {r!r}; esperado {str(k)!r}"
assert len(t) == 3 and t.lapides == 1, f"len(t) == {len(t)} e lapides == {t.lapides}; esperado 3 e 1"
for acao in ("get", "remove"):
    try:
        getattr(t, acao)(11)
        assert False, f"{acao}(11) depois da remoção deveria lançar KeyError"
    except KeyError:
        pass`},{name:`put não duplica a chave nem desperdiça a lápide`,code:`t = TabelaAberta(8)
for k in [3, 11, 19, 4]:
    t.put(k, str(k))
t.remove(11)
t.put(19, "novo")
copias = sum(1 for it in t.slots if it is not None and it is not LAPIDE and it[0] == 19)
assert copias == 1, f"o 19 aparece {copias} vezes em slots: antes de usar a lápide, confira se a chave está mais adiante"
assert t.get(19) == "novo" and len(t) == 3, "put(19, 'novo') deveria só atualizar o valor"
t.put(27, "x")
assert t.slots[4] is not LAPIDE and t.slots[4][0] == 27, f"o 27 (origem 3) deveria reaproveitar a lápide da posição 4; slots[4] = {'LAPIDE' if t.slots[4] is LAPIDE else repr(t.slots[4])}"
assert t.lapides == 0 and len(t) == 4, f"lapides == {t.lapides} e len(t) == {len(t)}; esperado 0 e 4"`},{name:`compara as chaves com ==`,code:`t = TabelaAberta(8)
t.put(-1, "menos um")
t.put(-2, "menos dois")    # hash(-1) == hash(-2) == -2: mesma origem, chaves diferentes
assert len(t) == 2, f"len(t) == {len(t)} depois de put(-1) e put(-2); esperado 2. Em Python, hash(-1) == hash(-2): hashes iguais não garantem chaves iguais, então compare as chaves com =="
assert t.get(-1) == "menos um" and t.get(-2) == "menos dois", "get(-1) e get(-2) precisam devolver os próprios valores: compare as chaves com ==, não os hashes"
t.put("".join(["mat", "-", "2024"]), 1)
t.put("mat-" + str(2024), 2)        # igual à anterior, mas é outro objeto
assert len(t) == 3, f"len(t) == {len(t)}; esperado 3: o segundo 'mat-2024' é igual ao primeiro (só é outro objeto), então o put deveria trocar o valor. Compare com ==, não com is"
assert t.get("mat-2024") == 2, "get('mat-2024') deveria devolver 2, o valor do último put"`},{name:`cresce ao passar de 2/3 e mantém tudo`,code:`t = TabelaAberta(8)
for k in range(5):
    t.put(k, k)
assert t.m == 8, f"com 5 chaves em 8 posições (5/8 < 2/3), m deveria continuar 8, e é {t.m}"
t.put(5, 5)
assert t.m == 16, f"a 6ª chave passa de 2/3 de 8: m deveria dobrar para 16, e é {t.m}"
t = TabelaAberta(8)
for k in range(100):
    assert None in t.slots, f"antes de inserir a chave {k}, a tabela (m = {t.m}) já não tinha nenhuma posição vazia: ela precisa reconstruir ao passar de 2/3"
    t.put(k, k * k)
assert len(t) == 100, f"len(t) == {len(t)}; esperado 100"
assert all(t.get(k) == k * k for k in range(100)), "alguma chave se perdeu ao reconstruir"
assert (len(t) + t.lapides) * 3 <= 2 * t.m, "a ocupação passou de 2/3"`},{name:`lápides contam para reconstruir`,code:`t = TabelaAberta(8)
for k in range(5):
    t.put(k, k)
for k in range(4):
    t.remove(k)
t.put(100, "cem")
assert t.lapides == 0, f"5 posições vivas ou com lápide + 1 nova passam de 2/3 de 8: deveria ter reconstruído e limpado as lápides, mas lapides == {t.lapides}"
assert t.m == 8, f"só 2 chaves vivas em 8 posições: a reconstrução deveria manter m = 8, e m é {t.m}"
assert len(t) == 2 and t.get(4) == 4 and t.get(100) == "cem", "as chaves vivas precisam sobreviver à reconstrução"`},{name:`muitas inserções e remoções não incham a tabela`,code:`t = TabelaAberta(8)
for i in range(1000):
    t.put(i, i)
    t.remove(i)
    assert None in t.slots, f"depois de {i + 1} pares put/remove, a tabela ficou sem nenhuma posição vazia: as lápides precisam contar no limite de 2/3, senão a próxima busca gira para sempre"
assert len(t) == 0, f"len(t) == {len(t)}; tudo foi removido"
assert t.m <= 16, f"nunca houve mais de 1 chave viva, mas m chegou a {t.m}: decida o tamanho novo pelas chaves vivas, não pelas lápides"`},{name:`texto, mistura e remoções em sequência`,code:`import random
random.seed(7)
t = TabelaAberta()
nomes = [f"aluno{i}" for i in range(300)]
for i, nome in enumerate(nomes):
    assert None in t.slots, f"antes de inserir {nome!r}, a tabela (m = {t.m}) já não tinha nenhuma posição vazia: ela precisa reconstruir ao passar de 2/3"
    t.put(nome, i)
for nome in nomes[::2]:
    t.remove(nome)
for nome in nomes[1::2]:
    assert t.get(nome) == int(nome[5:]), f"get({nome!r}) falhou depois das remoções"
assert len(t) == 150, f"len(t) == {len(t)}; esperado 150"
for nome in random.sample(nomes[::2], 20):
    try:
        t.get(nome)
        assert False, f"{nome!r} foi removido; get deveria lançar KeyError"
    except KeyError:
        pass`}]}}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Colisões são inevitáveis: com *m* posições, cerca de 1,2·√m chaves já dão 50% de chance de colisão (paradoxo do aniversário).
- Endereçamento aberto: uma chave por posição, então o fator de carga nunca passa de 1, e precisa sobrar vazio para a busca sem sucesso parar.
- Sondagem linear: origem \`hash % m\`, depois a próxima, com volta. A busca para na chave ou num vazio.
- Remoção com lápide: a busca passa por cima; a inserção reaproveita a primeira lápide, mas só depois de conferir o caminho até o vazio.
- Busca sem sucesso ≈ ½(1 + 1/(1 − α)²): 2,5 com metade da tabela ocupada, 5 com 2/3, 50 com 90%.
- Reconstrução: reinsere só as chaves vivas; o tamanho novo depende delas; custa O(1) amortizado. O dict do CPython mantém a ocupação em até 2/3.`},{type:`callout`,tone:`english`,text:`**Vocabulary**: *open addressing*, *separate chaining*, *linear probing*, *probe sequence*, *tombstone*, *primary clustering*, *load factor*, *rehashing*, *birthday paradox*.

Typical sentence in documentation: *"When a key is deleted, its slot is marked with a tombstone so that later lookups keep probing past it."*

Typical interview question: "How does a hash table handle collisions? What happens to lookup time as the load factor approaches 1, and why do you need tombstones when you delete with open addressing?"`,title:`English corner`}]}],cards:[{id:`l3-enderecamento-aberto#1`,front:`Numa tabela com sondagem linear, quando uma busca pode concluir que a chave não existe?`,back:`Quando chega a uma posição vazia (nunca usada). Lápides não param a busca.`},{id:`l3-enderecamento-aberto#2`,front:`Por que remover não pode simplesmente pôr None na posição?`,back:`Quebraria o caminho: buscas por chaves que passaram por ali parariam no vazio e diriam que elas não existem.`},{id:`l3-enderecamento-aberto#3`,front:`Ao inserir, por que não gravar na primeira lápide assim que ela aparece?`,back:`A chave pode existir mais adiante; é preciso ir até achá-la ou chegar a um vazio, senão ela fica duplicada.`},{id:`l3-enderecamento-aberto#4`,front:`Qual o custo esperado de uma busca sem sucesso com sondagem linear, em função de α?`,back:`≈ ½(1 + 1/(1 − α)²): 2,5 com α = 0,5; 5 com α = 2/3; 50 com α = 0,9.`},{id:`l3-enderecamento-aberto#5`,front:`Até que ocupação o dict do CPython vai antes de reconstruir?`,back:`2/3 das posições.`},{id:`l3-enderecamento-aberto#6`,front:`Quantas chaves aleatórias dão 50% de chance de colisão numa tabela de m posições?`,back:`Cerca de 1,2·√m (23 para m = 365, o paradoxo do aniversário).`},{id:`l3-enderecamento-aberto#7`,front:`Quando a reconstrução pode manter o mesmo tamanho?`,back:`Quando a ocupação vem quase toda de lápides: há poucas chaves vivas, e reconstruir só limpa as lápides.`}]};export{e as default};
//# sourceMappingURL=l3-enderecamento-aberto-DUIBVOAc.js.map