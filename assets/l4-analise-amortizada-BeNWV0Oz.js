var e={id:`l4-analise-amortizada`,moduleId:`m4-1`,title:`Análise amortizada: o custo pelo total`,titleEn:`Amortized analysis: paying for the whole sequence`,summary:`Os métodos agregado, contábil e do potencial aplicados ao contador binário, à fila com duas pilhas e à pilha monotônica: como provar que um laço dentro de outro ainda pode ser O(n), e quando essa conta deixa de valer.`,minutes:50,objectives:[`Aplicar o método agregado: somar o custo de uma sequência inteira em vez de multiplicar o pior caso por n`,`Provar O(1) amortizado com créditos (método contábil) e com uma função potencial`,`Reconhecer o padrão "cada elemento entra uma vez e sai no máximo uma vez" em pilhas monotônicas, filas com duas pilhas e janelas deslizantes`,`Identificar operações que quebram uma garantia amortizada`],skills:[`alg-complexidade`],terms:[{pt:`análise amortizada`,en:`amortized analysis`,def:`Limitar o custo total de qualquer sequência de n operações e dividir por n. Não envolve probabilidade.`,example:`Amortized analysis guarantees the average performance of each operation in the worst case.`},{pt:`método agregado`,en:`aggregate method`,def:`Somar diretamente o custo real de toda a sequência e dividir pelo número de operações.`},{pt:`método contábil`,en:`accounting method`,def:`Cobrar um preço fixo de cada operação e guardar o troco como crédito, que paga as operações caras.`},{pt:`método do potencial`,en:`potential method`,def:`Medir o "trabalho acumulado" do estado com uma função Φ ≥ 0; custo amortizado = custo real + variação de Φ.`,example:`We define a potential function Φ that maps each state of the data structure to a nonnegative number.`},{pt:`contador binário`,en:`binary counter`,def:`Lista de bits que representa um número e só sabe somar 1; um incremento zera a sequência de bits 1 do fim (os menos significativos, à direita) e liga o primeiro 0 depois dela.`},{pt:`fila com duas pilhas`,en:`queue with two stacks`,def:`Fila FIFO feita com uma pilha de entrada e uma de saída; a entrada só é despejada na saída quando a saída está vazia.`,example:`Implement a queue using two stacks with amortized O(1) operations.`},{pt:`pilha monotônica`,en:`monotonic stack`,def:`Pilha cujos valores ficam sempre em ordem (por exemplo, nunca aumentam de baixo para cima); quem quebraria a ordem desempilha os outros antes de entrar.`,example:`Use a monotonic stack to find the next greater element for every index in O(n).`},{pt:`janela deslizante`,en:`sliding window`,def:`Trecho contíguo [ini, fim] que percorre a sequência com os dois índices só andando para a frente, nunca para trás.`},{pt:`fila monotônica`,en:`monotonic queue`,def:`Deque de candidatos com valores em ordem; dá o máximo (ou o mínimo) de uma janela deslizante em O(1) amortizado.`}],references:[`clrs`,`mit-6006`,`stanford-cs161`,`sedgewick-algs`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:"No nível 3 você viu que o `append` da lista é **O(1) amortizado**: de vez em quando ele copia tudo, mas as cópias somam menos que 2n. Essa ideia, a {{análise amortizada|amortized analysis}}, vale muito além do `append`: em vez de multiplicar o pior caso de **uma** operação por n, você limita o custo **total** de qualquer sequência de n operações.\n\nPense na louça de casa. Tem dia em que a pia está lotada e você lava 30 pratos de uma vez; tem dia em que lava um só. Mas cada prato sujo é lavado **uma vez**. No fim do mês, as lavagens somam exatamente o número de pratos usados, por mais desiguais que tenham sido os dias.\n\nA mesma conta derruba uma intuição perigosa: **um `while` dentro de um `for` não custa automaticamente Θ(n²)**. Se o laço de dentro só consome coisas que o de fora produziu, e cada coisa só pode ser consumida uma vez, o total do laço de dentro fica limitado pelo total produzido."}]},{stage:`explicacao`,blocks:[{type:`md`,text:`### Três jeitos de fazer a conta`},{type:`table`,head:[`Método`,`Como funciona`,`Quando é mais fácil`],rows:[[`Agregado`,`Some o custo real das n operações de uma vez e divida por n.`,`Quando dá para contar diretamente quantas vezes cada coisa acontece.`],[`Contábil`,`Cobre um preço fixo de cada operação; o troco vira crédito guardado na estrutura e paga as operações caras. O crédito nunca pode ficar negativo.`,`Quando dá para "pendurar" o crédito em cada elemento.`],[`Potencial`,`Escolha uma função Φ do estado (Φ ≥ 0, começando em 0). Custo amortizado = custo real + variação de Φ.`,`Quando o crédito depende do estado inteiro, não de um elemento só.`]],caption:`Os três chegam ao mesmo resultado; use o que deixar a conta mais curta. São os três métodos do capítulo de análise amortizada do CLRS (lá, o agregado se chama *aggregate analysis*).`},{type:`md`,text:`### 1. Método agregado: o contador binário
Um {{contador binário|binary counter}} de k bits guarda um número em binário e só sabe somar 1. O custo de um incremento é o número de bits que ele troca:`},{type:`code`,lang:`python`,code:`def incrementar(bits):          # bits[0] é o bit menos significativo
    i = 0                       # (supõe que o contador não estoura)
    while bits[i] == 1:
        bits[i] = 0             # 1 vira 0 e "vai um"
        i += 1
    bits[i] = 1
    return i + 1                # quantos bits mudaram`,runnable:!1},{type:`md`,text:`O pior caso de **um** incremento troca os k bits: 0111…1 vira 1000…0. A conta ingênua daria n incrementos × k bits = O(n·k). Mas veja quem troca, e quando:`},{type:`table`,head:[`Incremento`,`Antes`,`Depois`,`Bits trocados`],rows:[[`1º`,`0000`,`0001`,`1`],[`2º`,`0001`,`0010`,`2`],[`3º`,`0010`,`0011`,`1`],[`4º`,`0011`,`0100`,`3`],[`5º`,`0100`,`0101`,`1`],[`6º`,`0101`,`0110`,`2`],[`7º`,`0110`,`0111`,`1`],[`8º`,`0111`,`1000`,`4`]],caption:`15 trocas em 8 incrementos, menos que 2 × 8. O mais caro trocou 4 bits, mas metade deles trocou só 1.`},{type:`md`,text:"O bit 0 troca em **todo** incremento; o bit 1, a cada 2; o bit 2, a cada 4; o bit j, a cada 2ʲ. Em n incrementos, o total de trocas é no máximo n + n/2 + n/4 + … < **2n**. (A conta exata dá 2n menos a quantidade de bits 1 de n: para n = 8, 16 − 1 = 15.) Logo, cada incremento custa **O(1) amortizado**, mesmo que um deles, sozinho, custe k.\n\nEsse é o {{método agregado|aggregate method}}: contar o total diretamente. O hodômetro do carro é o mesmo contador em base 10: o dígito das unidades muda a cada quilômetro, o das dezenas a cada 10, o das centenas a cada 100. A virada de 099 999 para 100 000 mexe em seis dígitos, mas a média fica abaixo de 1,12 dígito por quilômetro (1 + 1/10 + 1/100 + … = 10/9).\n\n### 2. Método contábil: a fila com duas pilhas\nDá para montar uma fila (FIFO) com duas pilhas (LIFO): a {{fila com duas pilhas|queue with two stacks}}. A pilha `entrada` recebe quem chega; a pilha `saida` entrega quem sai. Para desenfileirar, se `saida` estiver vazia, despeje **toda** a `entrada` nela, um elemento por vez: a ordem se inverte e o mais antigo fica no topo. Se `saida` não estiver vazia, basta tirar o topo dela.\n\nContando cada `append` ou `pop` como 1 passo:"},{type:`table`,head:[`Operação`,`entrada`,`saida`,`Passos`],rows:[[`enfileirar(1)`,`[1]`,`[]`,`1`],[`enfileirar(2)`,`[1, 2]`,`[]`,`1`],[`enfileirar(3)`,`[1, 2, 3]`,`[]`,`1`],[`desenfileirar() → 1`,`[]`,`[3, 2]`,`3 transferências (6) + 1 pop = 7`],[`enfileirar(4)`,`[4]`,`[3, 2]`,`1`],[`desenfileirar() → 2`,`[4]`,`[3]`,`1`],[`desenfileirar() → 3`,`[4]`,`[]`,`1`],[`desenfileirar() → 4`,`[]`,`[]`,`1 transferência (2) + 1 pop = 3`]],caption:`O topo de cada pilha é o fim da lista. Total: 16 passos para 4 elementos, exatamente 4 por elemento, embora um único desenfileirar tenha custado 7.`},{type:`md`,text:"No {{método contábil|accounting method}}, cobre **3 passos** de cada `enfileirar`: 1 paga o `append` na entrada e 2 ficam guardados no próprio elemento como crédito. Cada `desenfileirar` paga **1**: o `pop` da saída. A transferência de um elemento (um `pop` da entrada e um `append` na saída) custa exatamente os 2 de crédito que ele carrega, e acontece **no máximo uma vez** por elemento, porque nada volta da saída para a entrada. O crédito nunca falta, então n operações custam no máximo 3n passos: as duas operações são **O(1) amortizado**, embora um `desenfileirar` sozinho possa custar O(n)."},{type:`callout`,tone:`deep`,text:`No {{método do potencial|potential method}}, em vez de guardar crédito em cada elemento, você mede o "trabalho acumulado" do estado inteiro com uma função Φ (fi), que começa em 0 e nunca fica negativa. Então define:

**custo amortizado = custo real + (Φ depois − Φ antes)**

Somando n operações, as variações de Φ se cancelam em cadeia e sobra: soma dos amortizados = soma dos reais + Φ final − Φ inicial. Como Φ final ≥ 0 = Φ inicial, a soma dos amortizados limita a soma dos reais. Basta mostrar que cada operação tem custo amortizado pequeno.

- **Contador**, com Φ = número de bits 1: um incremento que zera t bits e liga 1 custa t + 1 e muda Φ em 1 − t. Amortizado: (t + 1) + (1 − t) = **2**.
- **Fila com duas pilhas**, com Φ = 2 × tamanho da entrada: enfileirar custa 1 + 2 = **3**; desenfileirar sem transferência custa 1 + 0 = **1**; com transferência de m elementos, custa (2m + 1) − 2m = **1**.

A pilha monotônica, que vem a seguir, fecha com Φ = tamanho da pilha. Você vai fazer essa conta nos exercícios.`,title:`3. O método do potencial`},{type:`md`,text:'### O padrão mais comum: entra uma vez, sai no máximo uma vez\nO padrão amortizado que mais aparece em código é uma estrutura em que **cada elemento entra uma vez e sai no máximo uma vez**. Se houve n entradas, houve no máximo n saídas, somando todas as voltas, por mais que uma volta isolada tire muita coisa de uma vez.\n\nO exemplo clássico é a {{pilha monotônica|monotonic stack}}: uma pilha cujos valores nunca aumentam de baixo para cima (ou nunca diminuem, conforme o problema). Quando chega um valor que quebraria a ordem, saem antes todos os que ele "resolve". Ela responde em Θ(n) perguntas como "quantos dias até um dia mais quente?", que de forma ingênua custam Θ(n²). Você vai vê-la funcionando no exemplo.\n\nA {{janela deslizante|sliding window}} segue a mesma lógica: dois índices `ini` e `fim` que **só avançam**. Mesmo com um `while` que move `ini` dentro do `for` que move `fim`, cada índice anda no máximo n vezes no total.'},{type:`table`,head:[`Operação`,`Pior caso de uma chamada`,`Amortizado`,`Por quê`],rows:[[`incrementar um contador de k bits`,`O(k)`,`O(1)`,`o bit j só troca a cada 2ʲ incrementos`],[`desenfileirar na fila com duas pilhas`,`O(n)`,`O(1)`,`cada elemento é transferido no máximo uma vez`],[`processar um elemento na pilha monotônica`,`O(n)`,`O(1)`,`cada índice é empilhado uma vez e desempilhado no máximo uma vez`],[`avançar o fim de uma janela deslizante`,`O(n)`,`O(1)`,`o início só anda para a frente`],[`append numa lista dinâmica (nível 3)`,`O(n)`,`O(1)`,`as cópias somam menos que 2n`]]},{type:`callout`,tone:`warn`,text:'A garantia amortizada vale para o **conjunto de operações que foi analisado**. Acrescente uma operação nova e a conta pode quebrar, porque ela pode desfazer um trabalho que já foi "pago".\n\nExemplo: transformar a fila com duas pilhas numa fila dupla, com `remover_ultimo` (tira o mais novo). Quando a entrada está vazia, ele precisa despejar a saída inteira de volta na entrada. Comece com n elementos e alterne `desenfileirar` e `remover_ultimo`: cada chamada encontra vazia a pilha de que precisa e transfere quase tudo. n/2 operações custam Θ(n²), ou seja, Θ(n) por operação. (Implementações que precisam disso transferem só metade dos elementos de cada vez, e aí a conta volta a fechar.)\n\nE lembre-se do nível 3: amortizado é uma garantia sobre o **total**. Uma operação isolada ainda pode custar O(n), o que importa quando cada operação tem prazo.',title:`Quando a conta quebra`}]},{stage:`exemplo`,blocks:[{type:`md`,text:`Problema: dadas as temperaturas máximas de cinco dias seguidos em Cuiabá, descubra, para cada dia, **quantos dias faltam até um dia mais quente** (0 se nenhum dia seguinte for mais quente).

A ideia: guarde numa pilha os dias que **ainda esperam resposta**. Quando chega um dia mais quente que o do topo, ele é a resposta do topo, que sai da pilha; repita enquanto o topo for mais frio. Por isso as temperaturas na pilha nunca aumentam de baixo para cima.`},{type:`trace`,code:`def dias_ate_esquentar(temps):
    resp = [0] * len(temps)
    pilha = []                  # dias que ainda esperam um dia mais quente
    for hoje, t in enumerate(temps):
        while pilha and temps[pilha[-1]] < t:
            dia = pilha.pop()
            resp[dia] = hoje - dia
        pilha.append(hoje)
    return resp

print(dias_ate_esquentar([34, 31, 32, 36, 33]))`,caption:`Acompanhe a pilha: no dia 3 (36 graus), um único passo do for desempilha dois dias.`},{type:`table`,head:[`Dia (hoje)`,`Temperatura`,`Sai da pilha (resposta)`,`Pilha depois (dia: temperatura)`],rows:[[`0`,`34`,`—`,`0: 34`],[`1`,`31`,`—`,`0: 34, 1: 31`],[`2`,`32`,`dia 1 (2 − 1 = 1)`,`0: 34, 2: 32`],[`3`,`36`,`dia 2 (3 − 2 = 1), dia 0 (3 − 0 = 3)`,`3: 36`],[`4`,`33`,`—`,`3: 36, 4: 33`]],caption:`Resultado: [3, 1, 1, 0, 0]. Os dias 3 e 4 terminam na pilha: nenhum dia seguinte foi mais quente, e a resposta deles fica 0.`},{type:`md`,text:"Contando: 5 dias empilhados e 3 desempilhados. Uma volta do `for` chegou a desempilhar dois dias, mas o total de pops nunca passa do total de appends, que é n. Somando todas as voltas do `for`, o teste do `while` dá verdadeiro no máximo n vezes (um pop em cada) e falso exatamente n vezes (uma em cada dia). Total: **Θ(n)**, contra Θ(n²) de comparar cada dia com todos os seguintes."}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`def proximo_maior_ingenuo(xs):
    resp, comparacoes = [-1] * len(xs), 0
    for i in range(len(xs)):
        for j in range(i + 1, len(xs)):
            comparacoes += 1
            if xs[j] > xs[i]:
                resp[i] = j
                break
    return resp, comparacoes

def proximo_maior_pilha(xs):
    resp, pilha = [-1] * len(xs), []
    pops, maior_rajada = 0, 0
    for i, x in enumerate(xs):
        rajada = 0
        while pilha and xs[pilha[-1]] < x:
            resp[pilha.pop()] = i
            rajada += 1
        pilha.append(i)
        pops += rajada
        maior_rajada = max(maior_rajada, rajada)
    return resp, pops, maior_rajada

for n in [250, 500, 1000]:
    xs = list(range(n, 0, -1)) + [n + 1]   # cai até o fim e sobe de uma vez
    r1, comparacoes = proximo_maior_ingenuo(xs)
    r2, pops, rajada = proximo_maior_pilha(xs)
    assert r1 == r2
    print(f"n={n:>4}: ingênuo {comparacoes:>6} comparações | pilha: {pops} pops no total, {rajada} numa única volta")`,runnable:!0,caption:`Esta entrada concentra todos os pops numa única volta, a mais cara possível, e mesmo assim o total é n. O ingênuo quadruplica a cada vez que n dobra.`},{type:`code`,lang:`python`,code:`def incrementar(bits):          # bits[0] é o bit menos significativo
    i = 0
    while bits[i] == 1:
        bits[i] = 0
        i += 1
    bits[i] = 1
    return i + 1                # quantos bits mudaram

bits = [0] * 12
custos = [incrementar(bits) for _ in range(1000)]
print("1000 incrementos:", sum(custos), "trocas no total (menos que 2 × 1000)")
media = f"{sum(custos) / len(custos):.3f}".replace(".", ",")
print("o incremento mais caro trocou", max(custos), "bits; em média, cada um trocou", media)
print("valor final:", "".join(str(b) for b in reversed(bits)))`,runnable:!0,caption:`2 × 1000 − 6 = 1994, porque 1000 = 1111101000 em binário tem seis bits 1. O incremento mais caro foi o 512º (0111111111 → 1000000000).`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e4-amz-1`,kind:`mcq`,prompt:"Somando todas as voltas do `for`, quantas vezes `pilha.pop()` pode executar, no máximo, para uma lista de n elementos?",code:{lang:`python`,code:`def proximo_maior(xs):
    resp = [-1] * len(xs)
    pilha = []
    for i in range(len(xs)):
        while pilha and xs[pilha[-1]] < xs[i]:
            resp[pilha.pop()] = i
        pilha.append(i)
    return resp`},difficulty:`facil`,skills:[`alg-complexidade`,`ed-pilhas-filas`],hints:[`Quantas vezes cada índice é empilhado?`,`Depois que um índice sai da pilha, ele pode voltar a entrar?`],explanation:`Cada índice entra na pilha uma única vez (o append no fim de cada volta) e, depois de sair, nunca volta. Logo, o total de pops é no máximo o total de appends: menos de n, porque o último índice empilhado nunca chega a sair. Uma volta pode desempilhar muita coisa, mas isso consome elementos que não estarão lá nas voltas seguintes. Total: Θ(n).`,options:[{text:`Menos de n: cada índice é empilhado uma vez e, depois de desempilhado, nunca volta.`,correct:!0,feedback:`Isso. O total de saídas é limitado pelo total de entradas, por mais desigual que seja a distribuição entre as voltas.`},{text:`Até n(n − 1)/2: em cada volta o while pode esvaziar a pilha inteira.`,feedback:`Uma volta pode mesmo esvaziar a pilha, mas aí os índices que saíram não estão mais lá para as voltas seguintes. Somando tudo, ninguém sai duas vezes.`},{text:`Cerca de n², por causa do while dentro do for.`,feedback:`Multiplicar laços só funciona quando o de dentro roda sempre o mesmo tanto. Aqui ele roda conforme o que há na pilha, e a pilha só tem o que foi empilhado.`},{text:`Cerca de log n, porque a pilha sempre fica pequena.`,feedback:`A pilha pode crescer até n: numa lista decrescente, nenhum índice sai. O que fica pequeno é o total de pops, não o tamanho da pilha.`}]}},{type:`exercise`,exercise:{id:`e4-amz-2`,kind:`predict`,lang:`python`,prompt:"O que é impresso? `bits[0]` é o bit menos significativo.",difficulty:`intermediario`,skills:[`alg-complexidade`,`prog-loops`],hints:[`Depois de 12 incrementos a partir do zero, o contador vale 12. Como se escreve 12 em binário, e em que ordem a lista guarda os bits?`,`Para o total: o bit 0 troca em todo incremento. E o bit 1? E o bit 2?`,`Conte as trocas de cada bit separadamente e some.`],explanation:`12 em binário é 1100; como bits[0] é o menos significativo, a lista fica [0, 0, 1, 1]. Trocas: o bit 0 troca 12 vezes, o bit 1 troca 6, o bit 2 troca 3 e o bit 3 troca 1: 12 + 6 + 3 + 1 = 22, menos que 2 × 12 = 24. A fórmula 2n − (quantidade de bits 1 de n) confirma: 24 − 2 = 22.`,code:`bits = [0, 0, 0, 0]
total = 0
for _ in range(12):
    i = 0
    while bits[i] == 1:
        bits[i] = 0
        i += 1
    bits[i] = 1
    total += i + 1
print(bits, total)`,answer:`[0, 0, 1, 1] 22`}},{type:`exercise`,exercise:{id:`e4-amz-3`,kind:`fill`,lang:`text`,prompt:"Complete a análise da pilha monotônica pelo método do potencial, com Φ = tamanho da pilha. Conte cada `pop` e cada `append` como 1 passo e considere um elemento que, ao chegar, desempilha p índices e depois é empilhado. Use a letra p nas respostas.",difficulty:`intermediario`,skills:[`alg-complexidade`,`ed-pilhas-filas`],hints:[`Quantos pops e quantos appends esse elemento provoca?`,`A pilha perdeu quantos índices e ganhou quantos? Quanto mudou o tamanho?`,`Some o custo real com a variação de Φ. O p some?`],explanation:`Custo real: p pops mais 1 append, p + 1. O tamanho da pilha perde p e ganha 1, então Φ varia 1 − p. Amortizado: (p + 1) + (1 − p) = 2, para qualquer p. Como Φ começa em 0 e nunca fica negativa, n elementos custam no máximo 2n passos de pilha: Θ(n), mesmo que um único elemento desempilhe quase tudo.`,template:`custo real        = ___
variação de Φ     = ___
custo amortizado  = ___`,blanks:[[`p + 1`,`p+1`,`p +1`,`p+ 1`,`1 + p`,`1+p`,`1 +p`,`1+ p`],[`1 - p`,`1-p`,`1 -p`,`1- p`,`1 − p`,`1−p`,`1 −p`,`1− p`,`-p + 1`,`-p+1`,`−p + 1`,`−p+1`,`-(p - 1)`,`-(p-1)`,`−(p − 1)`,`−(p−1)`],[`2`,`+2`]]}},{type:`exercise`,exercise:{id:`e4-amz-4`,kind:`code`,lang:`python`,prompt:'Implemente uma fila (FIFO) com duas pilhas guardadas num dicionário criado por `criar_fila()` (já pronto): `"entrada"` recebe quem chega e `"saida"` entrega quem sai, ambas listas usadas como pilhas (o topo é o fim).\n\n- `enfileirar(fila, x)`: coloca x na fila.\n- `desenfileirar(fila)`: remove e devolve o elemento mais antigo; com a fila vazia, lança `IndexError`.\n\nAs duas operações devem ser **O(1) amortizado**. Nas pilhas, use só `append(x)` e `pop()` sem argumento, e não troque as listas do dicionário por outras.',difficulty:`intermediario`,skills:[`alg-complexidade`,`ed-pilhas-filas`],hints:[`Se você despejar a entrada inteira na saída, um elemento por vez, em que ordem eles ficam? Quem fica no topo?`,`Quando vale a pena despejar? O que acontece com a ordem se você despejar enquanto a saída ainda tem elementos?`,`Teste à mão: enfileire a e b, desenfileire, enfileire c e d, desenfileire duas vezes. Saiu a, b, c?`,`Onde verificar a fila vazia: antes ou depois de tentar despejar a entrada?`],explanation:`Só se despeja a entrada quando a saída está vazia: assim todos os elementos da saída são mais antigos que os da entrada, e a ordem FIFO se mantém. Cada elemento sofre no máximo 4 operações de pilha em toda a sua vida (entra na entrada, sai dela, entra na saída, sai dela), então n operações custam O(n): O(1) amortizado, embora um desenfileirar isolado possa transferir n elementos. Em Python, no dia a dia, use collections.deque; a fila com duas pilhas aparece em entrevistas e em linguagens funcionais, em que as listas são imutáveis.`,starter:`def criar_fila():
    return {"entrada": [], "saida": []}


def enfileirar(fila, x):
    # coloque x na fila
    pass


def desenfileirar(fila):
    # remova e devolva o elemento mais antigo (IndexError se a fila estiver vazia)
    pass`,solution:`def criar_fila():
    return {"entrada": [], "saida": []}


def enfileirar(fila, x):
    fila["entrada"].append(x)


def desenfileirar(fila):
    if not fila["saida"]:
        while fila["entrada"]:
            fila["saida"].append(fila["entrada"].pop())
    if not fila["saida"]:
        raise IndexError("desenfileirar de uma fila vazia")
    return fila["saida"].pop()`,tests:[{name:`ordem FIFO`,code:`f = criar_fila()
for x in [1, 2, 3]:
    enfileirar(f, x)
r = [desenfileirar(f), desenfileirar(f), desenfileirar(f)]
assert r == [1, 2, 3], f"quem chega primeiro sai primeiro: esperado [1, 2, 3], veio {r}"`},{name:`enfileirar e desenfileirar intercalados`,code:`f = criar_fila()
enfileirar(f, "a")
enfileirar(f, "b")
r = [desenfileirar(f)]
enfileirar(f, "c")
enfileirar(f, "d")
r += [desenfileirar(f), desenfileirar(f)]
enfileirar(f, "e")
r += [desenfileirar(f), desenfileirar(f)]
assert r == ["a", "b", "c", "d", "e"], f"esperado ['a', 'b', 'c', 'd', 'e'], veio {r}. Despejar a entrada enquanto a saída ainda tem elementos embaralha a ordem."`},{name:`estado das duas pilhas`,code:`f = criar_fila()
for x in [1, 2, 3]:
    enfileirar(f, x)
assert f["entrada"] == [1, 2, 3] and f["saida"] == [], f"enfileirar só empilha na entrada; veio {f}"
assert desenfileirar(f) == 1, "o primeiro a sair deveria ser 1"
assert f["entrada"] == [] and f["saida"] == [3, 2], f"o primeiro desenfileirar despeja a entrada inteira na saída (invertida) e tira o topo: esperado entrada [] e saida [3, 2]; veio {f}"
enfileirar(f, 4)
assert f["entrada"] == [4] and f["saida"] == [3, 2], f"com a saída ainda ocupada, enfileirar não mexe nela; veio {f}"`},{name:`fila vazia`,code:`f = criar_fila()
try:
    desenfileirar(f)
except IndexError:
    pass
else:
    raise AssertionError("desenfileirar de uma fila vazia deveria lançar IndexError")
enfileirar(f, 7)
assert desenfileirar(f) == 7, "com um só elemento, desenfileirar deveria devolvê-lo"
try:
    desenfileirar(f)
except IndexError:
    pass
else:
    raise AssertionError("depois de tirar o único elemento a fila está vazia: deveria lançar IndexError")`},{name:`cada elemento é transferido uma vez só`,code:`class Pilha(list):
    passos = 0
    def append(self, x):
        Pilha.passos += 1
        super().append(x)
    def pop(self, *args):
        Pilha.passos += 1
        return super().pop(*args)
f = criar_fila()
f["entrada"], f["saida"] = Pilha(), Pilha()
for x in range(300):
    enfileirar(f, x)
saiu = []
for x in range(300, 600):
    enfileirar(f, x)
    saiu.append(desenfileirar(f))
while len(saiu) < 600:
    saiu.append(desenfileirar(f))
assert saiu == list(range(600)), "a ordem de saída ficou errada"
assert type(f["entrada"]) is Pilha and type(f["saida"]) is Pilha, "não troque as listas do dicionário por listas novas: use append e pop nelas"
assert Pilha.passos <= 4 * 600, f"600 elementos custaram {Pilha.passos} appends e pops; o limite é 4 por elemento (entra, é transferido uma vez, sai). Algum elemento está mudando de pilha mais de uma vez."`},{name:`só append e pop() nas pilhas`,code:`import ast
proibidos = {"insert", "extend", "remove", "clear", "reverse", "sort", "copy", "popleft", "appendleft"}
problemas = set()
for no in ast.walk(ast.parse(_source)):
    if isinstance(no, ast.Call) and isinstance(no.func, ast.Attribute):
        if no.func.attr in proibidos:
            problemas.add(no.func.attr + "()")
        if no.func.attr == "pop" and (no.args or no.keywords):
            problemas.add("pop com argumento")
    if isinstance(no, ast.Delete):
        problemas.add("del")
    if isinstance(no, ast.AugAssign):
        contador = isinstance(no.op, (ast.Add, ast.Sub)) and isinstance(no.value, ast.Constant) and isinstance(no.value.value, int)
        if not contador:
            problemas.add("+= ou *= numa lista (mexem em vários elementos de uma vez)")
    if isinstance(no, ast.Subscript) and isinstance(no.slice, ast.Slice):
        problemas.add("fatias")
    if isinstance(no, (ast.Import, ast.ImportFrom)):
        problemas.add("import")
assert not problemas, "use só append(x) e pop() sem argumento nas pilhas; encontrei: " + ", ".join(sorted(problemas))`}]}},{type:`exercise`,exercise:{id:`e4-amz-5`,kind:`mcq`,prompt:"Uma equipe acrescentou `decrementar` (subtrair 1) ao contador binário de k bits, trocando bits do mesmo jeito: do bit 0 para cima, até achar onde parar. Agora, misturando incrementos e decrementos e começando de um valor qualquer, quanto podem custar n operações no pior caso?",difficulty:`avancado`,skills:[`alg-complexidade`],hints:[`Que número de k bits faz um incremento trocar todos os bits? E que número faz um decremento trocar todos?`,`O que acontece se você incrementar e, logo em seguida, decrementar a partir desse número? E se repetir isso?`,`No método do potencial, com Φ = número de bits 1, quanto Φ varia num decremento caro?`],explanation:`Começando em 0111…1 (e, mesmo partindo de 0, basta chegar lá uma vez), incrementar troca os k bits e chega a 1000…0; decrementar troca os mesmos k de volta. Alternando, cada uma das n operações custa k: Θ(n·k). A análise do contador valia só para incrementos: o crédito guardado em cada bit 1 (Φ = número de bits 1) paga o incremento que o zera, mas o decremento caro religa k − 1 bits, aumentando Φ em k − 2, sem que nenhuma operação anterior tenha pago por isso. Uma garantia amortizada é sempre sobre um conjunto específico de operações.`,options:[{text:`Continua O(n): cada operação ainda é O(1) amortizado, como no contador só com incremento.`,feedback:`A análise anterior dependia de o bit j só trocar a cada 2ʲ incrementos. O decremento quebra esse padrão: ele religa os bits que o incremento acabou de zerar.`},{text:`Θ(n·k): alternando entre 0111…1 e 1000…0, toda operação troca os k bits.`,correct:!0,feedback:`Isso. Incrementar 0111…1 troca k bits; decrementar 1000…0 troca os mesmos k de volta. Repetindo, cada operação custa k.`},{text:`O(n + k): no pior caso, só uma operação troca todos os bits.`,feedback:`Uma operação cara só seria rara se nada pudesse recriar a situação cara. Aqui, o decremento recria 0111…1 logo depois do incremento caro.`},{text:`O(k): o custo total é limitado pelo número de bits.`,feedback:`O número de bits limita o custo de uma operação, não o total: n operações de custo k somam n·k.`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e4-amz-desafio`,kind:`code`,lang:`python`,prompt:"O app de uma corretora mostra, para cada período de k dias seguidos, a **maior cotação** do dólar no período. Escreva `maximos_janela(xs, k)` que devolve a lista com o máximo de cada janela `xs[i:i + k]`, da primeira à última (são `len(xs) - k + 1` janelas). Se k for maior que `len(xs)`, devolva `[]`. Considere sempre k ≥ 1.\n\nA versão direta calcula o máximo de cada janela do zero: Θ(n·k). Exija **O(n)** no total: os testes contam quantas vezes as posições de `xs` são lidas e quantas comparações entre cotações são feitas (copiar os valores para outra estrutura e calcular `max` nela também conta), e os dois totais precisam ficar num múltiplo pequeno de n. Não modifique `xs`, e só `collections` pode ser importado (nada de `heapq`, `bisect`, `sorted` ou `.sort()`).",difficulty:`desafio`,skills:[`alg-complexidade`,`ed-pilhas-filas`],hints:[`Se chega um valor maior que um valor anterior que ainda está na janela, esse anterior ainda pode ser o máximo de alguma janela futura?`,`Então guarde só os candidatos que ainda podem vir a ser máximo. Em que ordem ficam os valores deles? Onde está o máximo da janela atual?`,`Os candidatos saem por dois motivos: chegou alguém maior (saem pelo lado mais recente) ou ficaram para trás da janela (saem pelo lado mais antigo). Que estrutura tira dos dois lados em O(1)?`,`Guarde índices, não valores: com o índice dá para saber se o candidato mais antigo já saiu da janela.`],explanation:`Um valor que chega torna inúteis todos os candidatos menores ou iguais que vieram antes dele: eles saem da janela antes dele e nunca mais serão o máximo. Retirando-os pelo fim, os candidatos ficam com valores decrescentes e o máximo da janela está sempre na frente; quando o índice da frente fica para trás da janela, ele sai pela frente. É uma fila monotônica num deque. Cada índice entra uma vez e sai no máximo uma vez, por um dos lados, então o total é O(n), embora uma única chegada possa expulsar muitos candidatos. A memória extra é O(k): só índices da janela atual ficam no deque.`,starter:`def maximos_janela(xs, k):
    # devolva [max da janela 0..k-1, max da janela 1..k, ...]
    # sem recalcular cada janela do zero
    pass`,solution:`from collections import deque


def maximos_janela(xs, k):
    resp = []
    candidatos = deque()   # índices; valores decrescentes da frente para o fim
    for i in range(len(xs)):
        x = xs[i]
        while candidatos and xs[candidatos[-1]] <= x:
            candidatos.pop()
        candidatos.append(i)
        if candidatos[0] <= i - k:
            candidatos.popleft()
        if i >= k - 1:
            resp.append(xs[candidatos[0]])
    return resp`,tests:[{name:`exemplo clássico`,code:`r = maximos_janela([1, 3, -1, -3, 5, 3, 6, 7], 3)
assert r == [3, 3, 5, 5, 6, 7], f"esperado [3, 3, 5, 5, 6, 7], veio {r}"`},{name:`k = 1 e k = len(xs)`,code:`r1 = maximos_janela([4, 2, 9], 1)
assert r1 == [4, 2, 9], f"com k = 1 cada janela é um elemento só: esperado [4, 2, 9], veio {r1}"
r2 = maximos_janela([4, 2, 9, 1], 4)
assert r2 == [9], f"com k = len(xs) há uma janela só: esperado [9], veio {r2}"`},{name:`lista vazia e janela maior que a lista`,code:`assert maximos_janela([], 1) == [], "lista vazia: nenhuma janela, devolva []"
assert maximos_janela([1, 2], 3) == [], "k maior que a lista: nenhuma janela, devolva []"`},{name:`repetidos e negativos`,code:`r1 = maximos_janela([4, 4, 4, 2, 2], 2)
assert r1 == [4, 4, 4, 2], f"esperado [4, 4, 4, 2], veio {r1}"
r2 = maximos_janela([-5, -2, -8, -1], 2)
assert r2 == [-2, -2, -1], f"esperado [-2, -2, -1], veio {r2}"`},{name:`o máximo precisa sair da janela`,code:`r1 = maximos_janela([9, 8, 7, 6, 5], 2)
assert r1 == [9, 8, 7, 6], f"o 9 sai da janela depois da primeira: esperado [9, 8, 7, 6], veio {r1}"
r2 = maximos_janela([5, 1, 1, 1, 1], 3)
assert r2 == [5, 1, 1], f"esperado [5, 1, 1], veio {r2}"`},{name:`confere com a versão direta`,code:`import random
gerador = random.Random(2024)
for n in range(0, 25):
    xs = [gerador.randint(-20, 20) for _ in range(n)]
    for k in range(1, n + 2):
        esperado = [max(xs[i:i + k]) for i in range(n - k + 1)]
        r = maximos_janela(xs, k)
        assert r == esperado, f"maximos_janela({xs}, {k}): esperado {esperado}, veio {r}"`},{name:`não modifica a entrada`,code:`xs = [3, 1, 4, 1, 5, 9, 2, 6]
copia = xs[:]
maximos_janela(xs, 3)
assert xs == copia, "não modifique xs: a lista de cotações é usada depois"`},{name:`lê cada posição poucas vezes (O(n))`,code:`class ContaLeituras(list):
    def __init__(self, valores):
        super().__init__(valores)
        self.leituras = 0
    def __getitem__(self, i):
        r = super().__getitem__(i)
        self.leituras += len(r) if isinstance(i, slice) else 1
        return r
    def __iter__(self):
        for x in super().__iter__():
            self.leituras += 1
            yield x
n, k = 2000, 100
for nome, valores in [("decrescente", list(range(n, 0, -1))), ("embaralhada", [(i * 7919 + 13) % 1009 for i in range(n)])]:
    xs = ContaLeituras(valores)
    r = maximos_janela(xs, k)
    esperado = [max(valores[i:i + k]) for i in range(n - k + 1)]
    assert r == esperado, f"resultado errado na lista {nome} com n = {n} e k = {k}"
    assert xs.leituras <= 6 * n, f"na lista {nome} (n = {n}, k = {k}) as posições foram lidas {xs.leituras} vezes: isso é recalcular as janelas. O limite é {6 * n}."`},{name:`compara poucas vezes (O(n))`,code:`class Cotacao:
    comparacoes = 0
    def __init__(self, v):
        self.v = v
    def _outro(self, o):
        Cotacao.comparacoes += 1
        return o.v if isinstance(o, Cotacao) else o
    def __lt__(self, o): return self.v < self._outro(o)
    def __le__(self, o): return self.v <= self._outro(o)
    def __gt__(self, o): return self.v > self._outro(o)
    def __ge__(self, o): return self.v >= self._outro(o)
    def __eq__(self, o): return self.v == self._outro(o)
    def __ne__(self, o): return self.v != self._outro(o)
    def __neg__(self): return Cotacao(-self.v)
    def __hash__(self): return hash(self.v)
    def __repr__(self): return repr(self.v)
n, k = 2000, 100
listas = [("decrescente", list(range(n, 0, -1))), ("crescente", list(range(n))), ("embaralhada", [(i * 7919 + 13) % 1009 for i in range(n)])]
for nome, valores in listas:
    xs = [Cotacao(v) for v in valores]
    Cotacao.comparacoes = 0
    r = maximos_janela(xs, k)
    feitas = Cotacao.comparacoes
    obtido = [getattr(c, "v", c) for c in r]
    esperado = [max(valores[i:i + k]) for i in range(n - k + 1)]
    assert obtido == esperado, f"resultado errado na lista {nome} com n = {n} e k = {k}"
    assert feitas <= 6 * n, f"na lista {nome} (n = {n}, k = {k}) foram feitas {feitas} comparações entre cotações: isso é procurar de novo o máximo de cada janela (inclusive com max() sobre uma cópia dos k últimos valores). O limite é {6 * n}."`},{name:`só collections`,code:`import ast
problemas = set()
for no in ast.walk(ast.parse(_source)):
    if isinstance(no, ast.Import):
        problemas.update(a.name for a in no.names if a.name != "collections")
    if isinstance(no, ast.ImportFrom) and no.module != "collections":
        problemas.add(str(no.module))
    if isinstance(no, ast.Call) and isinstance(no.func, ast.Name) and no.func.id == "sorted":
        problemas.add("sorted")
    if isinstance(no, ast.Call) and isinstance(no.func, ast.Attribute) and no.func.attr == "sort":
        problemas.add(".sort()")
assert not problemas, "só collections pode ser importado, e sem ordenar; encontrei: " + ", ".join(sorted(problemas))`}]}}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Análise amortizada limita o **total** de qualquer sequência de operações; não é média sobre entradas sorteadas.
- **Agregado**: conte o total direto (contador: n + n/2 + n/4 + … < 2n). **Contábil**: cobre a mais e guarde crédito (fila: 3 por enfileirar, 1 por desenfileirar). **Potencial**: amortizado = real + ΔΦ, com Φ ≥ 0 começando em 0.
- "Entra uma vez, sai no máximo uma vez" deixa um \`while\` dentro de um \`for\` em Θ(n): pilha monotônica, fila com duas pilhas, janela deslizante.
- No desafio, a mesma ideia num deque vira uma {{fila monotônica|monotonic queue}}: o máximo de cada janela em O(n) no total.
- A garantia vale para as operações analisadas: decrementar no contador ou remover pelo fim na fila com duas pilhas quebram a conta.`},{type:`callout`,tone:`english`,text:`- **amortized analysis / amortized O(1)**: análise amortizada / O(1) amortizado
- **aggregate method, accounting method, potential function**: método agregado, método contábil, função potencial
- **monotonic stack / monotonic queue**: pilha monotônica / fila monotônica
- **sliding window**: janela deslizante
- **to push / to pop**: empilhar / desempilhar

Frase típica de entrevista: *"There's a while loop inside the for loop, but each index is pushed onto the stack once and popped at most once, so the total running time is O(n)."*`,title:`English corner`}]}],cards:[{id:`l4-analise-amortizada#1`,front:`No contador binário, por que n incrementos custam menos que 2n trocas, se um incremento pode trocar k bits?`,back:`O bit j só troca a cada 2ʲ incrementos: o total é n + n/2 + n/4 + … < 2n (método agregado).`},{id:`l4-analise-amortizada#2`,front:`Na fila com duas pilhas, quando a entrada é despejada na saída, e por que desenfileirar é O(1) amortizado?`,back:`Só quando a saída está vazia. Cada elemento é transferido no máximo uma vez (nada volta para a entrada), então cada um custa no máximo 4 operações de pilha em toda a vida.`},{id:`l4-analise-amortizada#3`,front:`Qual a fórmula do custo amortizado no método do potencial, e que condições Φ precisa cumprir?`,back:`Amortizado = real + (Φ depois − Φ antes), com Φ começando em 0 e nunca negativa; assim a soma dos amortizados limita a soma dos reais.`},{id:`l4-analise-amortizada#4`,front:`Por que a pilha monotônica é Θ(n) mesmo com um while dentro do for?`,back:`Cada índice é empilhado uma vez e desempilhado no máximo uma vez: o total de pops é menor que n, por mais que uma volta desempilhe muito.`},{id:`l4-analise-amortizada#5`,front:`Dê um exemplo de operação que quebra uma garantia amortizada, e por quê.`,back:`Decrementar no contador binário: alternando incremento e decremento entre 0111…1 e 1000…0, cada operação troca k bits, Θ(n·k). O decremento recria a situação cara sem ninguém ter pago por ela.`},{id:`l4-analise-amortizada#6`,front:`No máximo de janela deslizante com deque, por que é mais simples guardar índices do que valores?`,back:`Com o índice, dá para ver direto se o candidato da frente ficou para trás da janela (índice ≤ i − k) e retirá-lo. Guardando só valores, seria preciso comparar com o valor que saiu e manter os repetidos no deque.`}]};export{e as default};
//# sourceMappingURL=l4-analise-amortizada-BeNWV0Oz.js.map