var e={id:`l4-busca-na-resposta`,moduleId:`m4-2`,title:`Busca binária na resposta`,titleEn:`Binary search on the answer`,summary:`Quando não há lista para buscar: chutar a resposta, verificar o chute e usar a monotonicidade para descartar metade das respostas possíveis a cada teste.`,minutes:50,objectives:[`Reconhecer quando um problema de otimização tem um verificador monotônico ("dá para fazer com x?")`,`Escrever o verificador e escolher limites lo e hi que garantidamente contêm a resposta`,`Aplicar os moldes do mínimo (primeiro verdadeiro) e do máximo (último verdadeiro) sem loop infinito`,`Calcular o custo O(log(hi − lo) × custo do verificador) e compará-lo com testar resposta por resposta`],skills:[`alg-busca`],terms:[{pt:`busca binária na resposta`,en:`binary search on the answer`,def:`Buscar o valor ótimo num intervalo de respostas possíveis, testando cada chute com um verificador.`,example:`Binary search on the answer works whenever feasibility is monotonic.`},{pt:`espaço de busca`,en:`search space`,def:`Conjunto das respostas candidatas; aqui, um intervalo de inteiros [lo, hi].`},{pt:`verificador`,en:`feasibility check`,def:`Função que diz se um chute de resposta é viável, como "dá para despachar tudo em D dias com capacidade C?".`},{pt:`viável`,en:`feasible`,def:`Que satisfaz todas as restrições do problema.`,example:`Return the least capacity such that a feasible schedule exists.`},{pt:`predicado monotônico`,en:`monotonic predicate`,def:`Predicado que, percorrendo os valores em ordem, muda de resposta no máximo uma vez: F…F V…V ou V…V F…F.`},{pt:`minimizar o máximo`,en:`minimize the maximum`,def:`Família de problemas em que se quer o menor valor possível para o pior caso, como a maior carga diária de um caminhão.`},{pt:`maximizar o mínimo`,en:`maximize the minimum`,def:`Família de problemas em que se quer o maior valor possível para o pior caso, como a menor distância entre duas caixas de som.`},{pt:`teto da divisão`,en:`ceiling division`,def:`Divisão arredondada para cima, ⌈p / v⌉; com inteiros em Python, (p + v - 1) // v.`}],references:[`bentley-pearls`,`clrs`,`pro-git`,`python-docs`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Na lição anterior a busca binária procurou uma fronteira **dentro de uma lista**. Mas a ideia de descartar metade a cada passo vale para qualquer coisa que tenha ordem, inclusive **as próprias respostas** de um problema.

Uma transportadora precisa despachar pacotes de 3, 2, 2, 4, 1 e 4 kg, **na ordem da esteira**, em até 3 dias, com um caminhão que faz uma viagem por dia. Qual a **menor capacidade** de caminhão que dá conta? Não há fórmula direta. Mas, para um chute, a pergunta é fácil: **"com capacidade C, dá para despachar tudo em até 3 dias?"**. E ela tem uma propriedade preciosa: se dá com C, dá com qualquer capacidade maior. Ao longo de C = 1, 2, 3, … as respostas formam F…F V…V, e a menor capacidade que serve é a **fronteira**, exatamente o que você aprendeu a achar.

Essa técnica se chama **{{busca binária na resposta|binary search on the answer}}**: em vez de testar C = 1, 2, 3, … até dar certo, você testa o meio do intervalo de respostas possíveis e descarta metade dele a cada teste. Um uso famoso fora das provas: o \`git bisect\` (o Git é assunto do Nível 10) acha qual entre milhares de commits introduziu um bug testando cerca de log₂ n deles. Se o bug, uma vez introduzido, continua lá, "este commit já tem o bug?" é F…F V…V ao longo da história.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:"### Os três ingredientes\n1. **Um {{espaço de busca|search space}} ordenado**: as respostas candidatas são inteiros de `lo` a `hi` (capacidade, velocidade, tamanho, distância).\n2. **Um {{verificador|feasibility check}}** `pode(x)`, que diz se o chute x é {{viável|feasible}}. Ele costuma ser bem mais simples que o problema original: muitas vezes é um único laço de O(n).\n3. **Monotonicidade**: `pode` é um {{predicado monotônico|monotonic predicate}}. Em problemas de **mínimo**, se x é viável, x + 1 também é (F…F V…V). Em problemas de **máximo**, se x é viável, x − 1 também é (V…V F…F).\n\nSe faltar o terceiro ingrediente, a busca binária não dá erro: ela pode devolver uma resposta errada, em silêncio.\n\n### Molde do mínimo: o primeiro verdadeiro"},{type:`code`,lang:`python`,code:`def primeiro_verdadeiro(pode, lo, hi):
    # requer: pode é F...F V...V em [lo, hi] e pode(hi) é True
    while lo < hi:
        meio = (lo + hi) // 2
        if pode(meio):
            hi = meio          # meio serve; talvez exista um menor
        else:
            lo = meio + 1      # meio não serve, e nada abaixo dele serve
    return lo`,runnable:!1},{type:`md`,text:'É o molde do limite inferior da lição anterior, trocando "`xs[meio] >= alvo`" por "`pode(meio)`". A invariante: `pode(hi)` é sempre verdadeiro, e tudo abaixo de `lo` é falso.\n\n### Molde do máximo: o último verdadeiro\nPara V…V F…F ("o maior tamanho de pedaço que ainda rende k pedaços"), espelhe o molde:'},{type:`code`,lang:`python`,code:`def ultimo_verdadeiro(pode, lo, hi):
    # requer: pode é V...V F...F em [lo, hi] e pode(lo) é True
    while lo < hi:
        meio = (lo + hi + 1) // 2   # arredonda para CIMA
        if pode(meio):
            lo = meio
        else:
            hi = meio - 1
    return lo`,runnable:!1},{type:`callout`,tone:`warn`,text:"O `+ 1` no meio não é enfeite. Com `lo = 3` e `hi = 4`, `(3 + 4) // 2` dá 3; se `pode(3)` for verdadeiro, `lo = meio` deixa `lo` em 3 e o laço nunca termina. Arredondando para cima, o meio é 4, e as duas saídas (`lo = 4` ou `hi = 3`) encolhem o intervalo. A regra: **o ramo que faz `lo = meio` exige o meio arredondado para cima; o ramo que faz `hi = meio` exige o meio arredondado para baixo.**",title:`Loop infinito à espreita`},{type:`md`,text:'Muitos problemas de otimização têm uma destas duas caras. **{{Minimizar o máximo|minimize the maximum}}**: a capacidade do caminhão é a menor carga diária máxima possível, e usa o molde do mínimo. **{{Maximizar o mínimo|maximize the minimum}}**: espalhar caixas de som para que a menor distância entre duas seja a maior possível, e usa o molde do máximo. Quando um enunciado tiver essa forma, desconfie de busca na resposta.\n\n### Escolhendo lo e hi\n- `lo`: um valor abaixo do qual com certeza nada funciona, ou o menor valor permitido. Para o caminhão: `max(pesos)`, porque com menos que isso o pacote mais pesado nunca embarca.\n- `hi`: um valor que **com certeza** funciona. Para o caminhão: `sum(pesos)`, que leva tudo num dia só.\n\nNo molde do máximo os papéis se invertem: `lo` é o valor que com certeza funciona, e `hi`, um valor acima do qual com certeza nada funciona.\n\nSe a resposta estiver fora de `[lo, hi]`, a busca nunca a encontra, e o erro é silencioso: com `lo` alto demais, o molde do mínimo devolve um valor que serve, mas não é o menor; com `hi` baixo demais, devolve `hi` mesmo que ele não sirva. Na dúvida, teste `pode(hi)` antes e trate o caso "impossível".\n\n### Quanto custa'},{type:`table`,head:[`Abordagem`,`Chamadas ao verificador`,`Total (verificador O(n))`],rows:[[`Testar lo, lo + 1, lo + 2, … até dar certo`,`até hi − lo + 1`,`O(n · (hi − lo))`],[`Busca binária na resposta`,`no máximo ⌈log₂(hi − lo + 1)⌉`,`O(n · log(hi − lo))`]],caption:`Com 100 000 pacotes de até 10 000 kg, hi − lo chega perto de 10⁹: cerca de 30 chamadas ao verificador (3 × 10⁶ passos), contra até um bilhão de chamadas.`},{type:`callout`,tone:`tip`,text:"Muitos verificadores dividem e arredondam para cima: uma pilha de p itens, num ritmo de v por hora, leva ⌈p / v⌉ horas. Esse é o **{{teto da divisão|ceiling division}}**, e com inteiros ele sai sem float: `(p + v - 1) // v`, ou `-(-p // v)`. Evite `math.ceil(p / v)`: `p / v` vira float, que só garante representar todos os inteiros exatamente até 2⁵³ (cerca de 9 × 10¹⁵), e com números maiores o arredondamento pode sair errado.",title:`Arredondar para cima sem float`},{type:`callout`,tone:`deep`,text:`O verificador do caminhão enche o dia de forma gulosa: põe pacotes enquanto couberem e, quando o próximo não cabe, fecha o dia. Encher o máximo possível nunca atrapalha os dias seguintes, então esse laço dá o menor número de dias para uma capacidade fixa.

Agora compare dois caminhões, com capacidades C < C'. Ao fim de cada dia, o maior já despachou **pelo menos** tantos pacotes quanto o menor: por indução, se ele começa o dia igual ou adiantado, os pacotes que o menor leva naquele dia, a partir do ponto em que o maior está, pesam no máximo C ≤ C' e cabem nele. Logo \`dias(C') <= dias(C)\`, e "\`dias(C) <= D\`" é F…F V…V.

Repare no **≤**. A pergunta "\`dias(C) == D\`?" **não** é monotônica: com C enorme tudo vai em 1 dia, que é ≤ D, mas não == D. Verificadores quase sempre usam ≤ ou ≥.`,title:`Por que o verificador é monotônico`},{type:`callout`,tone:`deep`,text:'Quando a resposta é um número real (a raiz cúbica de 10, a taxa de juros embutida numa compra parcelada), não há "`meio + 1`". Use `meio = (lo + hi) / 2` e faça `lo = meio` ou `hi = meio`, por um **número fixo de iterações**: cada uma divide o intervalo por 2, e 100 iterações levariam um intervalo de 10⁹ para abaixo de 10⁻²⁰; na prática, ele para antes, no limite de precisão do float, e o laço termina do mesmo jeito. Um `while hi - lo > 1e-9` parece mais natural, mas pode nunca terminar: perto de 10⁹, dois floats vizinhos distam mais de 10⁻⁷, e o intervalo para de encolher antes de chegar a 10⁻⁹.',title:`Respostas reais`}]},{stage:`exemplo`,blocks:[{type:`md`,text:"Pacotes `[3, 2, 2, 4, 1, 4]`, prazo de **3 dias**. O espaço de busca vai de `lo = max = 4` a `hi = sum = 16`. Primeiro, veja que o verificador é mesmo F…F V…V:"},{type:`table`,head:[`Capacidade C`,`4`,`5`,`6`,`7`,`8`,`9`,`…`,`15`,`16`],rows:[[`dias(C)`,`5`,`4`,`3`,`3`,`3`,`2`,`…`,`2`,`1`],[`dias(C) <= 3?`,`F`,`F`,`**V**`,`V`,`V`,`V`,`…`,`V`,`V`]],caption:`Com C = 6, o caminhão leva 3 + 2 no dia 1, 2 + 4 no dia 2 e 1 + 4 no dia 3.`},{type:`md`,text:`A busca binária acha a fronteira sem calcular a tabela inteira:`},{type:`table`,head:[`Passo`,`lo`,`hi`,`meio`,`dias(meio)`,`pode(meio)?`,`Ação`],rows:[[`1`,`4`,`16`,`10`,`2`,`sim`,"`hi = 10`"],[`2`,`4`,`10`,`7`,`3`,`sim`,"`hi = 7`"],[`3`,`4`,`7`,`5`,`4`,`não`,"`lo = 6`"],[`4`,`6`,`7`,`6`,`3`,`sim`,"`hi = 6`"],[`fim`,`6`,`6`,``,``,``,`devolve **6**`]],caption:`4 chamadas ao verificador para 13 candidatos (⌈log₂ 13⌉ = 4).`},{type:`md`,text:"No passo 1, `dias(10) = 2` já cumpre o prazo, mas a busca não para: talvez exista capacidade menor. No passo 3, `dias(5) = 4` estoura o prazo, e a monotonicidade garante que 4 e 5 podem ser descartados juntos. Siga o verificador num chute que falha:"},{type:`trace`,code:`def dias_necessarios(pesos, capacidade):
    dias, carga = 1, 0
    for p in pesos:
        if carga + p > capacidade:   # não cabe: fecha o dia
            dias += 1
            carga = 0
        carga += p
    return dias

print(dias_necessarios([3, 2, 2, 4, 1, 4], 5))`,caption:`Com capacidade 5: [3, 2], [2], [4, 1], [4]. São 4 dias, um a mais que o prazo.`}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`import random

def dias_necessarios(pesos, capacidade):
    # supõe capacidade >= max(pesos)
    dias, carga = 1, 0
    for p in pesos:
        if carga + p > capacidade:
            dias += 1
            carga = 0
        carga += p
    return dias

def capacidade_minima(pesos, prazo):
    lo, hi = max(pesos), sum(pesos)
    chamadas = 0
    while lo < hi:
        meio = (lo + hi) // 2
        chamadas += 1
        if dias_necessarios(pesos, meio) <= prazo:
            hi = meio
        else:
            lo = meio + 1
    return lo, chamadas

print(capacidade_minima([3, 2, 2, 4, 1, 4], 3))

random.seed(1)
pesos = [random.randint(1, 10_000) for _ in range(20_000)]
cap, chamadas = capacidade_minima(pesos, 30)
print(f"20 000 pacotes em 30 dias: capacidade {cap} kg")
print(f"candidatos: {sum(pesos) - max(pesos) + 1}, chamadas ao verificador: {chamadas}")
print("confere:", dias_necessarios(pesos, cap) <= 30, dias_necessarios(pesos, cap - 1) > 30)`,runnable:!0,caption:`Cerca de 100 milhões de candidatos, 27 chamadas ao verificador. A última linha confere a fronteira: cap serve e cap − 1 não.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e4-resposta-1`,kind:`mcq`,prompt:"Você quer a **menor** velocidade média inteira, em km/h, para um ônibus fazer 600 km dentro do horário de 8 horas. Qual verificador `pode(v)` permite usar busca binária na resposta?",difficulty:`facil`,skills:[`alg-busca`],hints:[`Para cada opção, imagine a resposta para v = 50, 60, 70, 80, 90… Ela muda de resposta uma única vez?`,`Se uma velocidade serve, uma velocidade maior pode deixar de servir?`,`Um predicado monotônico que não usa os 600 km nem as 8 horas consegue encontrar a velocidade que o problema pede?`],explanation:`Busca binária na resposta exige um verificador que vire de falso para verdadeiro uma única vez ao longo das respostas em ordem. "Termina em até 8 h" tem isso: o tempo 600 / v diminui quando v aumenta, e a fronteira é 75 km/h. "Exatamente" e "inteiro" são verdadeiros em pontos isolados. Por isso verificadores quase sempre usam ≤ ou ≥, nunca ==.`,options:[{text:`Com velocidade v, a viagem termina em **até** 8 horas?`,correct:!0,feedback:`Isso: se termina em até 8 h com v, termina também com qualquer velocidade maior. O padrão é F…F V…V, e a resposta é a fronteira (75 km/h).`},{text:`Com velocidade v, a viagem dura **exatamente** 8 horas?`,feedback:`Esse predicado é verdadeiro num único ponto (v = 75) e falso dos dois lados. Ao testar um meio falso, a busca não tem como saber para que lado ir.`},{text:`Com velocidade v, a viagem dura um número **inteiro** de horas?`,feedback:`Verdadeiro para v = 50, 60, 75, 100, 120… e falso entre eles: vai e volta. Sem monotonicidade, descartar metade pode jogar fora a resposta.`},{text:`A velocidade v é menor que 80 km/h, o limite da via?`,feedback:`Esse predicado é monotônico (V…V F…F), mas não fala da viagem: a fronteira dele é sempre 80, qualquer que seja a distância. O verificador precisa testar a condição do problema.`}]}},{type:`exercise`,exercise:{id:`e4-resposta-2`,kind:`parsons`,lang:`python`,prompt:"Monte o molde do **mínimo**: a função devolve o menor x em `[lo, hi]` com `pode(x)` verdadeiro, supondo que `pode` é F…F V…V e que `pode(hi)` é verdadeiro.",difficulty:`facil`,skills:[`alg-busca`],hints:[`Qual linha precisa vir antes de todas as outras dentro do laço?`,`Se pode(meio) é verdadeiro, o meio pode ser a resposta: você o mantém dentro do intervalo ou o descarta?`,`O return fica dentro ou fora do while?`],explanation:"Quando `pode(meio)` é verdadeiro, o meio pode ser a resposta, então ele fica no intervalo (`hi = meio`). Quando é falso, ele e tudo abaixo dele estão descartados (`lo = meio + 1`). Com o meio arredondado para baixo, `meio < hi`, então os dois ramos encolhem o intervalo, e o laço termina com `lo == hi` na fronteira.",lines:[`def primeiro_verdadeiro(pode, lo, hi):`,`    while lo < hi:`,`        meio = (lo + hi) // 2`,`        if pode(meio):`,`            hi = meio`,`        else:`,`            lo = meio + 1`,`    return lo`]}},{type:`exercise`,exercise:{id:`e4-resposta-3`,kind:`predict`,lang:`python`,prompt:"O que este programa imprime? Acompanhe `lo` e `hi` a cada volta.",difficulty:`intermediario`,skills:[`alg-busca`],hints:[`Este é o molde do último verdadeiro: qual é o maior x com x * x <= 50?`,`Calcule o primeiro meio com cuidado: (0 + 50 + 1) // 2.`,`Anote lo e hi depois de cada passo; o laço para quando eles ficam iguais.`],explanation:"O laço procura o maior x com x² ≤ 50, a raiz quadrada inteira de 50: 7 (7² = 49 e 8² = 64). O último meio testado é 8: com lo = 7 e hi = 8, o arredondamento para cima escolhe 8, que falha, e hi cai para 7. Com arredondamento para baixo, o meio seria 7, pode(7) seria verdadeiro, `lo = 7` não mudaria nada e o laço rodaria para sempre. Na biblioteca padrão, `math.isqrt(50)` faz essa conta.",code:`def pode(x):
    return x * x <= 50

lo, hi = 0, 50
meios = []
while lo < hi:
    meio = (lo + hi + 1) // 2
    meios.append(meio)
    if pode(meio):
        lo = meio
    else:
        hi = meio - 1
print(meios)
print(lo)`,answer:`[25, 12, 6, 9, 7, 8]
7`}},{type:`exercise`,exercise:{id:`e4-resposta-4`,kind:`fix`,lang:`python`,prompt:"Uma eletricista tem rolos de cabo com `rolos[i]` metros (inteiros) e precisa de `k` pedaços **do mesmo tamanho inteiro**, o maior possível. Sobras são descartadas e não dá para emendar: com pedaços de L metros, um rolo de c metros rende `c // L` pedaços. `maior_pedaco(rolos, k)` deve devolver o maior L, ou 0 se nem com L = 1 der. A versão abaixo às vezes **trava** e às vezes devolve um tamanho **menor** que o possível. São dois erros, ambos ligados às regras desta lição. Corrija-os.",difficulty:`intermediario`,skills:[`alg-busca`],hints:[`Simule o laço com lo = 2 e hi = 3, supondo que pedaços de 2 m bastam. Qual é o meio? O que muda depois dessa volta?`,`No molde do último verdadeiro, para que lado o meio precisa ser arredondado?`,`Com rolos = [1, 100] e k = 2, qual é a resposta certa? Ela está dentro do intervalo [lo, hi] que o código usa?`,`hi precisa ser um valor que nenhum pedaço viável ultrapasse. Qual é o maior pedaço que algum rolo consegue render?`],explanation:"Dois erros clássicos. (1) Espaço de busca curto demais: um pedaço pode ser maior que o menor rolo, que simplesmente vira sobra; o limite certo é o maior rolo, porque um pedaço maior que ele não sai de rolo nenhum. Com a resposta fora de [lo, hi], a busca nunca a encontra, e o erro é silencioso. (2) No molde do máximo, o ramo verdadeiro faz `lo = meio`; com o meio arredondado para baixo e hi = lo + 1, o meio é o próprio lo e nada muda. Com `(lo + hi + 1) // 2`, o meio é sempre maior que lo. O custo fica O(n · log(max(rolos))).",starter:`def pedacos(rolos, L):
    total = 0
    for c in rolos:
        total += c // L
    return total


def maior_pedaco(rolos, k):
    if pedacos(rolos, 1) < k:
        return 0
    lo, hi = 1, min(rolos)
    while lo < hi:
        meio = (lo + hi) // 2
        if pedacos(rolos, meio) >= k:
            lo = meio
        else:
            hi = meio - 1
    return lo`,solution:`def pedacos(rolos, L):
    total = 0
    for c in rolos:
        total += c // L
    return total


def maior_pedaco(rolos, k):
    if pedacos(rolos, 1) < k:
        return 0
    lo, hi = 1, max(rolos)
    while lo < hi:
        meio = (lo + hi + 1) // 2
        if pedacos(rolos, meio) >= k:
            lo = meio
        else:
            hi = meio - 1
    return lo`,tests:[{name:`exemplo`,code:`import sys as _sys, time as _time
def _vigiar(f, args, conferir):
    def _linha(frame, evento, arg):
        if evento == "line":
            conferir()
        return _linha
    def _chamada(frame, evento, arg):
        return _linha if frame.f_code.co_filename == "main.py" else None
    _sys.settrace(_chamada)
    try:
        return f(*args)
    finally:
        _sys.settrace(None)
def _sem_laco_infinito(f, *args):
    passos = [0]
    def conferir():
        passos[0] += 1
        if passos[0] > 50_000:
            raise AssertionError(f"{f.__name__} executou mais de 50 000 linhas numa entrada pequena: o laço não termina, ou não descarta metade do intervalo a cada volta. Simule à mão o caso em que hi = lo + 1 e confira se as duas saídas do if encolhem o intervalo.")
    return _vigiar(f, args, conferir)
def _no_prazo(segundos, msg, f, *args):
    fim = _time.perf_counter() + segundos
    def conferir():
        if _time.perf_counter() > fim:
            raise AssertionError(msg)
    return _vigiar(f, args, conferir)
if "_pedacos_original" not in globals() and "pedacos" in globals():
    _pedacos_original = pedacos
_contador = [0]
if "_pedacos_original" in globals():
    def pedacos(rolos, L):
        _contador[0] += 1
        assert _contador[0] <= 100, "pedacos foi chamada mais de 100 vezes numa única chamada de maior_pedaco: o laço não está terminando (ou não descarta metade do intervalo a cada volta). Simule à mão o caso em que hi = lo + 1."
        return _pedacos_original(rolos, L)
def _chama(rolos, k):
    _contador[0] = 0
    return _sem_laco_infinito(maior_pedaco, rolos, k)
r = _chama([8, 5, 3], 4)
assert r == 3, f"maior_pedaco([8, 5, 3], 4) deu {r}, esperado 3 (2 + 1 + 1 pedaços de 3 m)"`},{name:`pedaço maior que o menor rolo`,code:`import sys as _sys, time as _time
def _vigiar(f, args, conferir):
    def _linha(frame, evento, arg):
        if evento == "line":
            conferir()
        return _linha
    def _chamada(frame, evento, arg):
        return _linha if frame.f_code.co_filename == "main.py" else None
    _sys.settrace(_chamada)
    try:
        return f(*args)
    finally:
        _sys.settrace(None)
def _sem_laco_infinito(f, *args):
    passos = [0]
    def conferir():
        passos[0] += 1
        if passos[0] > 50_000:
            raise AssertionError(f"{f.__name__} executou mais de 50 000 linhas numa entrada pequena: o laço não termina, ou não descarta metade do intervalo a cada volta. Simule à mão o caso em que hi = lo + 1 e confira se as duas saídas do if encolhem o intervalo.")
    return _vigiar(f, args, conferir)
def _no_prazo(segundos, msg, f, *args):
    fim = _time.perf_counter() + segundos
    def conferir():
        if _time.perf_counter() > fim:
            raise AssertionError(msg)
    return _vigiar(f, args, conferir)
if "_pedacos_original" not in globals() and "pedacos" in globals():
    _pedacos_original = pedacos
_contador = [0]
if "_pedacos_original" in globals():
    def pedacos(rolos, L):
        _contador[0] += 1
        assert _contador[0] <= 100, "pedacos foi chamada mais de 100 vezes numa única chamada de maior_pedaco: o laço não está terminando (ou não descarta metade do intervalo a cada volta). Simule à mão o caso em que hi = lo + 1."
        return _pedacos_original(rolos, L)
def _chama(rolos, k):
    _contador[0] = 0
    return _sem_laco_infinito(maior_pedaco, rolos, k)
r = _chama([1, 100], 2)
assert r == 50, f"maior_pedaco([1, 100], 2) deu {r}, esperado 50: o rolo de 1 m pode simplesmente sobrar, e a resposta passa do menor rolo. O seu intervalo [lo, hi] contém o 50?"`},{name:`impossível e bordas`,code:`import sys as _sys, time as _time
def _vigiar(f, args, conferir):
    def _linha(frame, evento, arg):
        if evento == "line":
            conferir()
        return _linha
    def _chamada(frame, evento, arg):
        return _linha if frame.f_code.co_filename == "main.py" else None
    _sys.settrace(_chamada)
    try:
        return f(*args)
    finally:
        _sys.settrace(None)
def _sem_laco_infinito(f, *args):
    passos = [0]
    def conferir():
        passos[0] += 1
        if passos[0] > 50_000:
            raise AssertionError(f"{f.__name__} executou mais de 50 000 linhas numa entrada pequena: o laço não termina, ou não descarta metade do intervalo a cada volta. Simule à mão o caso em que hi = lo + 1 e confira se as duas saídas do if encolhem o intervalo.")
    return _vigiar(f, args, conferir)
def _no_prazo(segundos, msg, f, *args):
    fim = _time.perf_counter() + segundos
    def conferir():
        if _time.perf_counter() > fim:
            raise AssertionError(msg)
    return _vigiar(f, args, conferir)
if "_pedacos_original" not in globals() and "pedacos" in globals():
    _pedacos_original = pedacos
_contador = [0]
if "_pedacos_original" in globals():
    def pedacos(rolos, L):
        _contador[0] += 1
        assert _contador[0] <= 100, "pedacos foi chamada mais de 100 vezes numa única chamada de maior_pedaco: o laço não está terminando (ou não descarta metade do intervalo a cada volta). Simule à mão o caso em que hi = lo + 1."
        return _pedacos_original(rolos, L)
def _chama(rolos, k):
    _contador[0] = 0
    return _sem_laco_infinito(maior_pedaco, rolos, k)
assert _chama([3, 2], 6) == 0, "só há 5 m de cabo: 6 pedaços é impossível, devolva 0"
r = _chama([7], 1)
assert r == 7, f"um rolo de 7 m e 1 pedaço: esperado 7, veio {r}"
r = _chama([5, 5, 5], 3)
assert r == 5, f"três rolos de 5 m e 3 pedaços: esperado 5, veio {r}"
r = _chama([10], 10)
assert r == 1, f"um rolo de 10 m e 10 pedaços: esperado 1, veio {r}"`},{name:`rolos enormes`,code:`import sys as _sys, time as _time
def _vigiar(f, args, conferir):
    def _linha(frame, evento, arg):
        if evento == "line":
            conferir()
        return _linha
    def _chamada(frame, evento, arg):
        return _linha if frame.f_code.co_filename == "main.py" else None
    _sys.settrace(_chamada)
    try:
        return f(*args)
    finally:
        _sys.settrace(None)
def _sem_laco_infinito(f, *args):
    passos = [0]
    def conferir():
        passos[0] += 1
        if passos[0] > 50_000:
            raise AssertionError(f"{f.__name__} executou mais de 50 000 linhas numa entrada pequena: o laço não termina, ou não descarta metade do intervalo a cada volta. Simule à mão o caso em que hi = lo + 1 e confira se as duas saídas do if encolhem o intervalo.")
    return _vigiar(f, args, conferir)
def _no_prazo(segundos, msg, f, *args):
    fim = _time.perf_counter() + segundos
    def conferir():
        if _time.perf_counter() > fim:
            raise AssertionError(msg)
    return _vigiar(f, args, conferir)
if "_pedacos_original" not in globals() and "pedacos" in globals():
    _pedacos_original = pedacos
_contador = [0]
if "_pedacos_original" in globals():
    def pedacos(rolos, L):
        _contador[0] += 1
        assert _contador[0] <= 100, "pedacos foi chamada mais de 100 vezes numa única chamada de maior_pedaco: o laço não está terminando (ou não descarta metade do intervalo a cada volta). Simule à mão o caso em que hi = lo + 1."
        return _pedacos_original(rolos, L)
def _chama(rolos, k):
    _contador[0] = 0
    return _sem_laco_infinito(maior_pedaco, rolos, k)
r = _chama([10**9, 10**9 - 1], 3)
assert r == 500_000_000, f"esperado 500000000 (2 pedaços do primeiro rolo e 1 do segundo), veio {r}"`},{name:`comparação com força bruta`,code:`import sys as _sys, time as _time
def _vigiar(f, args, conferir):
    def _linha(frame, evento, arg):
        if evento == "line":
            conferir()
        return _linha
    def _chamada(frame, evento, arg):
        return _linha if frame.f_code.co_filename == "main.py" else None
    _sys.settrace(_chamada)
    try:
        return f(*args)
    finally:
        _sys.settrace(None)
def _sem_laco_infinito(f, *args):
    passos = [0]
    def conferir():
        passos[0] += 1
        if passos[0] > 50_000:
            raise AssertionError(f"{f.__name__} executou mais de 50 000 linhas numa entrada pequena: o laço não termina, ou não descarta metade do intervalo a cada volta. Simule à mão o caso em que hi = lo + 1 e confira se as duas saídas do if encolhem o intervalo.")
    return _vigiar(f, args, conferir)
def _no_prazo(segundos, msg, f, *args):
    fim = _time.perf_counter() + segundos
    def conferir():
        if _time.perf_counter() > fim:
            raise AssertionError(msg)
    return _vigiar(f, args, conferir)
if "_pedacos_original" not in globals() and "pedacos" in globals():
    _pedacos_original = pedacos
_contador = [0]
if "_pedacos_original" in globals():
    def pedacos(rolos, L):
        _contador[0] += 1
        assert _contador[0] <= 100, "pedacos foi chamada mais de 100 vezes numa única chamada de maior_pedaco: o laço não está terminando (ou não descarta metade do intervalo a cada volta). Simule à mão o caso em que hi = lo + 1."
        return _pedacos_original(rolos, L)
def _chama(rolos, k):
    _contador[0] = 0
    return _sem_laco_infinito(maior_pedaco, rolos, k)
import random
random.seed(9)
for _ in range(300):
    rolos = [random.randint(1, 30) for _ in range(random.randint(1, 6))]
    k = random.randint(1, 15)
    esperado = 0
    for L in range(1, max(rolos) + 1):
        if sum(c // L for c in rolos) >= k:
            esperado = L
    r = _chama(rolos, k)
    assert r == esperado, f"maior_pedaco({rolos}, {k}) deu {r}, esperado {esperado}"`}]}},{type:`exercise`,exercise:{id:`e4-resposta-5`,kind:`code`,lang:`python`,prompt:"Uma professora tem pilhas de redações para corrigir: a pilha i tem `pilhas[i]` redações. Ela corrige `v` redações por hora, uma pilha de cada vez: se uma pilha acaba no meio de uma hora, ela descansa o resto dessa hora e só começa a próxima pilha na hora seguinte. Assim, a pilha i leva ⌈pilhas[i] / v⌉ horas. Escreva `ritmo_minimo(pilhas, h)`, que devolve o **menor** v inteiro com o qual ela termina tudo em até `h` horas. Garantias: `h >= len(pilhas)` e toda pilha tem pelo menos 1 redação. Para testar a técnica, os números podem ser enormes (até 10¹⁸): use só aritmética inteira.",difficulty:`intermediario`,skills:[`alg-busca`],hints:[`Se ela termina a tempo com ritmo v, termina com v + 1? Que forma tem o predicado?`,`Qual o menor ritmo que faz sentido? E um ritmo que com certeza basta, sabendo que h >= len(pilhas)?`,`Escreva primeiro uma função que calcula as horas gastas com um ritmo v. Como calcular ⌈p / v⌉ sem passar por float?`],explanation:'O total de horas só diminui (ou fica igual) quando v aumenta, então "horas(v) <= h" é F…F V…V e o molde do mínimo se aplica, com lo = 1 e hi = max(pilhas): nesse ritmo cada pilha leva 1 hora, e h >= len(pilhas) garante que basta. O custo é O(n · log(max(pilhas))): cerca de 60 passadas pela lista mesmo com pilhas de 10¹⁸. O teto inteiro `(p + v - 1) // v` evita o float: com p = 10¹⁸, `p / v` perde precisão e `math.ceil` pode arredondar errado, fazendo um ritmo insuficiente parecer viável.',starter:`def ritmo_minimo(pilhas, h):
    # menor v inteiro tal que a soma de ⌈p / v⌉ (para p em pilhas) seja <= h
    pass`,solution:`def horas(pilhas, v):
    total = 0
    for p in pilhas:
        total += (p + v - 1) // v
    return total


def ritmo_minimo(pilhas, h):
    lo, hi = 1, max(pilhas)
    while lo < hi:
        meio = (lo + hi) // 2
        if horas(pilhas, meio) <= h:
            hi = meio
        else:
            lo = meio + 1
    return lo`,tests:[{name:`exemplos`,code:`for pilhas, h, esperado in [([3, 6, 7, 11], 8, 4), ([30, 11, 23, 4, 20], 5, 30), ([30, 11, 23, 4, 20], 6, 23)]:
    r = ritmo_minimo(pilhas, h)
    assert r == esperado, f"ritmo_minimo({pilhas}, {h}) deu {r}, esperado {esperado}"`},{name:`uma pilha`,code:`for h, esperado in [(1, 10), (3, 4), (10, 1)]:
    r = ritmo_minimo([10], h)
    assert r == esperado, f"ritmo_minimo([10], {h}) deu {r}, esperado {esperado}"
r = ritmo_minimo([10], 100)
assert r == 1, f"com folga de sobra, o ritmo mínimo é 1 (nunca 0); veio {r}"`},{name:`h igual ao número de pilhas`,code:`r = ritmo_minimo([5, 9, 2], 3)
assert r == 9, f"com uma hora por pilha, o ritmo é a maior pilha: esperado 9, veio {r}"`},{name:`números enormes, só inteiros`,code:`import sys as _sys, time as _time
def _vigiar(f, args, conferir):
    def _linha(frame, evento, arg):
        if evento == "line":
            conferir()
        return _linha
    def _chamada(frame, evento, arg):
        return _linha if frame.f_code.co_filename == "main.py" else None
    _sys.settrace(_chamada)
    try:
        return f(*args)
    finally:
        _sys.settrace(None)
def _sem_laco_infinito(f, *args):
    passos = [0]
    def conferir():
        passos[0] += 1
        if passos[0] > 50_000:
            raise AssertionError(f"{f.__name__} executou mais de 50 000 linhas numa entrada pequena: o laço não termina, ou não descarta metade do intervalo a cada volta. Simule à mão o caso em que hi = lo + 1 e confira se as duas saídas do if encolhem o intervalo.")
    return _vigiar(f, args, conferir)
def _no_prazo(segundos, msg, f, *args):
    fim = _time.perf_counter() + segundos
    def conferir():
        if _time.perf_counter() > fim:
            raise AssertionError(msg)
    return _vigiar(f, args, conferir)
_lento = "com pilhas de até 10**18 redações, a sua função passou de 1 s: testar v = 1, 2, 3, … não termina. Use busca binária entre o menor e o maior ritmo possível"
r = _no_prazo(1.0, _lento, ritmo_minimo, [10**18], 3)
assert r == 333333333333333334, f"esperado 333333333333333334, veio {r}. Se você usou p / v, o float perde precisão com números desse tamanho: calcule o teto só com inteiros"
r = _no_prazo(1.0, _lento, ritmo_minimo, [10**18, 1], 2)
assert r == 10**18, f"esperado 10**18, veio {r}"`},{name:`muitas pilhas: confere a fronteira`,code:`import sys as _sys, time as _time
def _vigiar(f, args, conferir):
    def _linha(frame, evento, arg):
        if evento == "line":
            conferir()
        return _linha
    def _chamada(frame, evento, arg):
        return _linha if frame.f_code.co_filename == "main.py" else None
    _sys.settrace(_chamada)
    try:
        return f(*args)
    finally:
        _sys.settrace(None)
def _sem_laco_infinito(f, *args):
    passos = [0]
    def conferir():
        passos[0] += 1
        if passos[0] > 50_000:
            raise AssertionError(f"{f.__name__} executou mais de 50 000 linhas numa entrada pequena: o laço não termina, ou não descarta metade do intervalo a cada volta. Simule à mão o caso em que hi = lo + 1 e confira se as duas saídas do if encolhem o intervalo.")
    return _vigiar(f, args, conferir)
def _no_prazo(segundos, msg, f, *args):
    fim = _time.perf_counter() + segundos
    def conferir():
        if _time.perf_counter() > fim:
            raise AssertionError(msg)
    return _vigiar(f, args, conferir)
import random
r = _no_prazo(1.0, "com uma pilha de 10**9 redações, a sua função passou de 1 s: testar os ritmos um a um não termina. Use busca binária", ritmo_minimo, [10**9, 1], 2)
assert r == 10**9, f"ritmo_minimo([10**9, 1], 2) deu {r}, esperado 10**9"
random.seed(11)
def _horas(pilhas, v):
    return sum((p + v - 1) // v for p in pilhas)
for _ in range(30):
    pilhas = [random.randint(1, 10**9) for _ in range(random.randint(1, 300))]
    h = random.randint(len(pilhas), 5 * len(pilhas) + 10)
    r = ritmo_minimo(pilhas, h)
    assert _horas(pilhas, r) <= h, f"com ritmo {r} ela não termina em {h} horas"
    assert r == 1 or _horas(pilhas, r - 1) > h, f"o ritmo {r - 1} também bastaria: {r} não é o mínimo"`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e4-resposta-desafio`,kind:`code`,lang:`python`,prompt:"Num festival de praia, `pontos` traz as posições (em metros, inteiros, **fora de ordem** e talvez repetidas) das tomadas ao longo da orla. A organização vai instalar `c` caixas de som (2 ≤ c ≤ len(pontos)), no máximo uma por tomada, e quer **maximizar a menor distância** entre duas caixas, para o som de uma não abafar o da outra. Escreva `maior_distancia_minima(pontos, c)`, sem alterar a lista recebida.\n\nExemplo: com `pontos = [1, 2, 8, 4, 9]` e `c = 3`, a resposta é 3 (caixas em 1, 4 e 8, ou em 1, 4 e 9).\n\nPode haver 20 000 tomadas com posições até 10⁹: tentar todas as escolhas, ou todas as distâncias uma a uma, não termina a tempo.",difficulty:`desafio`,skills:[`alg-busca`],hints:[`Se dá para instalar as c caixas com distância mínima d, dá com d − 1? Que molde isso pede, o do mínimo ou o do máximo?`,`Para um d fixo, como decidir rápido se cabem c caixas? Ajuda ter os pontos em ordem?`,`Para um d fixo, onde faz sentido pôr a primeira caixa? E a segunda: existe motivo para deixá-la mais longe da primeira do que o necessário?`,`Qual o menor valor possível da resposta, e qual o maior? Lembre do arredondamento no molde do máximo.`],explanation:`Maximizar o mínimo é o caso típico do molde do máximo: "cabem c caixas com distância ≥ d?" é V…V F…F, porque o que cabe com d também cabe com qualquer distância menor. O verificador é guloso sobre os pontos ordenados: cada caixa vai no primeiro ponto a pelo menos d da anterior; pôr uma caixa o mais à esquerda possível nunca atrapalha as seguintes, porque sobra mais espaço à direita. Ordenar custa O(n log n) uma vez; cada verificação custa O(n), e são O(log(max − min)) delas, cerca de 30 para posições até 10⁹. O espaço de busca vai de 0 (sempre viável) até max − min, e o meio arredondado para cima evita o loop infinito.`,starter:`def maior_distancia_minima(pontos, c):
    # maior d tal que dá para escolher c pontos com distância >= d entre quaisquer dois
    pass`,solution:`def cabe(ps, c, d):
    # ps ordenada: põe cada caixa no primeiro ponto a pelo menos d da anterior
    colocadas, ultima = 1, ps[0]
    for i in range(1, len(ps)):
        if ps[i] - ultima >= d:
            colocadas += 1
            ultima = ps[i]
            if colocadas == c:
                return True
    return colocadas >= c


def maior_distancia_minima(pontos, c):
    ps = sorted(pontos)
    lo, hi = 0, ps[-1] - ps[0]
    while lo < hi:
        meio = (lo + hi + 1) // 2
        if cabe(ps, c, meio):
            lo = meio
        else:
            hi = meio - 1
    return lo`,tests:[{name:`exemplo`,code:`import sys as _sys, time as _time
def _vigiar(f, args, conferir):
    def _linha(frame, evento, arg):
        if evento == "line":
            conferir()
        return _linha
    def _chamada(frame, evento, arg):
        return _linha if frame.f_code.co_filename == "main.py" else None
    _sys.settrace(_chamada)
    try:
        return f(*args)
    finally:
        _sys.settrace(None)
def _sem_laco_infinito(f, *args):
    passos = [0]
    def conferir():
        passos[0] += 1
        if passos[0] > 50_000:
            raise AssertionError(f"{f.__name__} executou mais de 50 000 linhas numa entrada pequena: o laço não termina, ou não descarta metade do intervalo a cada volta. Simule à mão o caso em que hi = lo + 1 e confira se as duas saídas do if encolhem o intervalo.")
    return _vigiar(f, args, conferir)
def _no_prazo(segundos, msg, f, *args):
    fim = _time.perf_counter() + segundos
    def conferir():
        if _time.perf_counter() > fim:
            raise AssertionError(msg)
    return _vigiar(f, args, conferir)
r = _sem_laco_infinito(maior_distancia_minima, [1, 2, 8, 4, 9], 3)
assert r == 3, f"esperado 3, veio {r}"`},{name:`dois pontos e repetidos`,code:`import sys as _sys, time as _time
def _vigiar(f, args, conferir):
    def _linha(frame, evento, arg):
        if evento == "line":
            conferir()
        return _linha
    def _chamada(frame, evento, arg):
        return _linha if frame.f_code.co_filename == "main.py" else None
    _sys.settrace(_chamada)
    try:
        return f(*args)
    finally:
        _sys.settrace(None)
def _sem_laco_infinito(f, *args):
    passos = [0]
    def conferir():
        passos[0] += 1
        if passos[0] > 50_000:
            raise AssertionError(f"{f.__name__} executou mais de 50 000 linhas numa entrada pequena: o laço não termina, ou não descarta metade do intervalo a cada volta. Simule à mão o caso em que hi = lo + 1 e confira se as duas saídas do if encolhem o intervalo.")
    return _vigiar(f, args, conferir)
def _no_prazo(segundos, msg, f, *args):
    fim = _time.perf_counter() + segundos
    def conferir():
        if _time.perf_counter() > fim:
            raise AssertionError(msg)
    return _vigiar(f, args, conferir)
for pontos, c, esperado in [([10, 3], 2, 7), ([5, 5], 2, 0), ([0, 0, 0, 7], 3, 0), ([0, 0, 0, 7], 2, 7)]:
    r = _sem_laco_infinito(maior_distancia_minima, pontos, c)
    assert r == esperado, f"maior_distancia_minima({pontos}, {c}) deu {r}, esperado {esperado}"`},{name:`todos os pontos e negativos`,code:`import sys as _sys, time as _time
def _vigiar(f, args, conferir):
    def _linha(frame, evento, arg):
        if evento == "line":
            conferir()
        return _linha
    def _chamada(frame, evento, arg):
        return _linha if frame.f_code.co_filename == "main.py" else None
    _sys.settrace(_chamada)
    try:
        return f(*args)
    finally:
        _sys.settrace(None)
def _sem_laco_infinito(f, *args):
    passos = [0]
    def conferir():
        passos[0] += 1
        if passos[0] > 50_000:
            raise AssertionError(f"{f.__name__} executou mais de 50 000 linhas numa entrada pequena: o laço não termina, ou não descarta metade do intervalo a cada volta. Simule à mão o caso em que hi = lo + 1 e confira se as duas saídas do if encolhem o intervalo.")
    return _vigiar(f, args, conferir)
def _no_prazo(segundos, msg, f, *args):
    fim = _time.perf_counter() + segundos
    def conferir():
        if _time.perf_counter() > fim:
            raise AssertionError(msg)
    return _vigiar(f, args, conferir)
for pontos, c, esperado in [([1, 10, 4, 20], 4, 3), ([-10, 0, 10], 2, 20), ([-10, 0, 10], 3, 10)]:
    r = _sem_laco_infinito(maior_distancia_minima, pontos, c)
    assert r == esperado, f"maior_distancia_minima({pontos}, {c}) deu {r}, esperado {esperado}"`},{name:`não altera a lista`,code:`import sys as _sys, time as _time
def _vigiar(f, args, conferir):
    def _linha(frame, evento, arg):
        if evento == "line":
            conferir()
        return _linha
    def _chamada(frame, evento, arg):
        return _linha if frame.f_code.co_filename == "main.py" else None
    _sys.settrace(_chamada)
    try:
        return f(*args)
    finally:
        _sys.settrace(None)
def _sem_laco_infinito(f, *args):
    passos = [0]
    def conferir():
        passos[0] += 1
        if passos[0] > 50_000:
            raise AssertionError(f"{f.__name__} executou mais de 50 000 linhas numa entrada pequena: o laço não termina, ou não descarta metade do intervalo a cada volta. Simule à mão o caso em que hi = lo + 1 e confira se as duas saídas do if encolhem o intervalo.")
    return _vigiar(f, args, conferir)
def _no_prazo(segundos, msg, f, *args):
    fim = _time.perf_counter() + segundos
    def conferir():
        if _time.perf_counter() > fim:
            raise AssertionError(msg)
    return _vigiar(f, args, conferir)
p = [9, 1, 5]
_sem_laco_infinito(maior_distancia_minima, p, 2)
assert p == [9, 1, 5], f"a lista recebida mudou para {p}: ordene uma cópia"`},{name:`comparação com força bruta`,code:`import sys as _sys, time as _time
def _vigiar(f, args, conferir):
    def _linha(frame, evento, arg):
        if evento == "line":
            conferir()
        return _linha
    def _chamada(frame, evento, arg):
        return _linha if frame.f_code.co_filename == "main.py" else None
    _sys.settrace(_chamada)
    try:
        return f(*args)
    finally:
        _sys.settrace(None)
def _sem_laco_infinito(f, *args):
    passos = [0]
    def conferir():
        passos[0] += 1
        if passos[0] > 50_000:
            raise AssertionError(f"{f.__name__} executou mais de 50 000 linhas numa entrada pequena: o laço não termina, ou não descarta metade do intervalo a cada volta. Simule à mão o caso em que hi = lo + 1 e confira se as duas saídas do if encolhem o intervalo.")
    return _vigiar(f, args, conferir)
def _no_prazo(segundos, msg, f, *args):
    fim = _time.perf_counter() + segundos
    def conferir():
        if _time.perf_counter() > fim:
            raise AssertionError(msg)
    return _vigiar(f, args, conferir)
import random
from itertools import combinations
random.seed(3)
def _bruta(pontos, c):
    melhor = 0
    for comb in combinations(sorted(pontos), c):
        melhor = max(melhor, min(comb[i + 1] - comb[i] for i in range(c - 1)))
    return melhor
for _ in range(300):
    pontos = [random.randint(-30, 30) for _ in range(random.randint(2, 7))]
    c = random.randint(2, len(pontos))
    r = _sem_laco_infinito(maior_distancia_minima, list(pontos), c)
    e = _bruta(pontos, c)
    assert r == e, f"maior_distancia_minima({pontos}, {c}) deu {r}, esperado {e}"`},{name:`20 000 tomadas`,code:`import sys as _sys, time as _time
def _vigiar(f, args, conferir):
    def _linha(frame, evento, arg):
        if evento == "line":
            conferir()
        return _linha
    def _chamada(frame, evento, arg):
        return _linha if frame.f_code.co_filename == "main.py" else None
    _sys.settrace(_chamada)
    try:
        return f(*args)
    finally:
        _sys.settrace(None)
def _sem_laco_infinito(f, *args):
    passos = [0]
    def conferir():
        passos[0] += 1
        if passos[0] > 50_000:
            raise AssertionError(f"{f.__name__} executou mais de 50 000 linhas numa entrada pequena: o laço não termina, ou não descarta metade do intervalo a cada volta. Simule à mão o caso em que hi = lo + 1 e confira se as duas saídas do if encolhem o intervalo.")
    return _vigiar(f, args, conferir)
def _no_prazo(segundos, msg, f, *args):
    fim = _time.perf_counter() + segundos
    def conferir():
        if _time.perf_counter() > fim:
            raise AssertionError(msg)
    return _vigiar(f, args, conferir)
import random, time
_sem_laco_infinito(maior_distancia_minima, [1, 2, 8, 4, 9], 3)
def _cabe(ps, c, d):
    n, ultima = 1, ps[0]
    for p in ps[1:]:
        if p - ultima >= d:
            n, ultima = n + 1, p
    return n >= c
random.seed(6)
medio = random.sample(range(10**9), 500)
r = _no_prazo(1.5, "com 500 tomadas a sua função já passou de 1,5 s: tentar as escolhas, ou as distâncias uma a uma, não termina com 20 000. Busque a distância por busca binária, com um verificador O(n)", maior_distancia_minima, list(medio), 20)
ps = sorted(medio)
assert _cabe(ps, 20, r) and not _cabe(ps, 20, r + 1), f"com 500 tomadas e 20 caixas, a resposta {r} está errada"
random.seed(5)
pontos = random.sample(range(10**9), 20_000)
t0 = time.perf_counter()
r = maior_distancia_minima(pontos, 50)
dt = time.perf_counter() - t0
ps = sorted(pontos)
assert _cabe(ps, 50, r), f"com distância mínima {r} não cabem 50 caixas"
assert not _cabe(ps, 50, r + 1), f"cabem 50 caixas com distância {r + 1}: {r} não é o máximo"
assert dt < 2.0, f"levou {dt:.2f} s: busque a distância por busca binária, não uma a uma"`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:"**Miniprojeto: simulador de financiamento.** Na Tabela Price, uma dívida de `pv` reais com juros de `i` ao mês é paga em `n` parcelas iguais; todo mês o saldo cresce com os juros e cai com a parcela: `saldo = saldo * (1 + i) - parcela`. Escreva `parcela_minima(pv, i, n)`, que acha, **em centavos inteiros**, a menor parcela que zera a dívida em n meses, com busca binária na resposta. Qual é o verificador, e por que ele é monotônico? Que `lo` e `hi` são seguros? Confira o resultado contra a fórmula fechada `pv * i / (1 - (1 + i) ** -n)` e explique por que a diferença fica abaixo de um centavo. Depois inverta a pergunta: com um orçamento de R$ 900 por mês e juros de 1,5% ao mês, qual o **maior** valor financiável em 48 parcelas? (Agora é o molde do máximo.)"}]},{stage:`revisao`,blocks:[{type:`md`,text:'- Busca na resposta: quando é mais fácil **verificar** um chute do que calcular a resposta, e o verificador é monotônico.\n- Mínimo (F…F V…V): `meio = (lo + hi) // 2`; verdadeiro → `hi = meio`; falso → `lo = meio + 1`.\n- Máximo (V…V F…F): `meio = (lo + hi + 1) // 2`; verdadeiro → `lo = meio`; falso → `hi = meio − 1`.\n- `[lo, hi]` precisa conter a resposta: confira que o extremo "garantido" é mesmo viável.\n- Custo: O(log(hi − lo)) chamadas ao verificador. Verificadores usam ≤ ou ≥, nunca ==.\n- Teto inteiro: `(p + v - 1) // v`. Respostas reais: número fixo de iterações.'},{type:`callout`,tone:`english`,text:`- **binary search on the answer**: busca binária na resposta
- **feasibility check / feasible**: verificador / viável
- **monotonic predicate**: predicado monotônico
- **search space**: espaço de busca
- **minimize the maximum / maximize the minimum**: minimizar o máximo / maximizar o mínimo

Frase típica de entrevista: *"Feasibility is monotonic: if we can ship everything with capacity C, we can with any larger capacity. So I binary search on C between max(weights) and sum(weights), which costs O(n log(sum of weights))."*`,title:`English corner`}]}],cards:[{id:`l4-busca-na-resposta#1`,front:`Que propriedade o verificador precisa ter para permitir busca binária na resposta?`,back:`Ser monotônico: percorrendo as respostas em ordem, ele muda de falso para verdadeiro (ou o contrário) uma única vez.`},{id:`l4-busca-na-resposta#2`,front:"No molde do máximo (V…V F…F), por que o meio é `(lo + hi + 1) // 2`?",back:`Porque o ramo verdadeiro faz lo = meio; com hi = lo + 1 e arredondamento para baixo, o meio seria o próprio lo e o laço não avançaria.`},{id:`l4-busca-na-resposta#3`,front:`Na capacidade mínima do caminhão, quais são lo e hi, e por quê?`,back:`lo = max(pesos), pois abaixo disso o pacote mais pesado nunca embarca; hi = sum(pesos), que despacha tudo num dia e é sempre viável.`},{id:`l4-busca-na-resposta#4`,front:`Quanto custa uma busca binária na resposta com verificador O(n)?`,back:`O(n · log(hi − lo)): no máximo ⌈log₂(hi − lo + 1)⌉ chamadas ao verificador.`},{id:`l4-busca-na-resposta#5`,front:`Por que o verificador deve perguntar "dias(C) ≤ D" e não "dias(C) == D"?`,back:`Porque == não é monotônico: com C grande os dias ficam abaixo de D e a resposta volta a ser falsa.`},{id:`l4-busca-na-resposta#6`,front:"Como calcular ⌈p / v⌉ com inteiros em Python, e por que evitar `math.ceil(p / v)`?",back:`(p + v − 1) // v, ou −(−p // v). p / v passa por float, que perde precisão com inteiros acima de 2⁵³.`},{id:`l4-busca-na-resposta#7`,front:`Como fazer busca binária quando a resposta é um número real?`,back:`meio = (lo + hi) / 2 com lo = meio ou hi = meio, por um número fixo de iterações (100, por exemplo), em vez de esperar o intervalo ficar menor que um epsilon.`}]};export{e as default};
//# sourceMappingURL=l4-busca-na-resposta-BjQnezFz.js.map