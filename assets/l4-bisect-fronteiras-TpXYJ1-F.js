var e={id:`l4-bisect-fronteiras`,moduleId:`m4-2`,title:`Fronteiras: primeira e última ocorrência com bisect`,titleEn:`Boundaries: lower bound, upper bound and bisect`,summary:`Trocar "onde está x?" por "onde x começa e onde termina?": o molde do intervalo semiaberto, bisect_left e bisect_right, contagens e faixas em O(log n), e quando ordenar compensa.`,minutes:45,objectives:[`Implementar o limite inferior e o limite superior com o molde do intervalo semiaberto [lo, hi)`,`Responder primeira e última ocorrência, contagem, faixa, piso e teto com bisect_left e bisect_right`,`Escolher entre bisect_left e bisect_right em tabelas de faixas ("até" × "a partir de")`,`Decidir entre busca linear, lista ordenada com bisect e set/dict pelo número e pelo tipo de consultas`],skills:[`alg-busca`],terms:[{pt:`fronteira`,en:`boundary`,def:`Primeira posição em que um predicado passa de falso para verdadeiro numa sequência do tipo F…F V…V.`},{pt:`limite inferior`,en:`lower bound`,def:`Primeira posição cujo valor é maior ou igual ao alvo; é o que bisect_left devolve.`,example:`std::lower_bound returns the first element that is not less than the value.`},{pt:`limite superior`,en:`upper bound`,def:`Primeira posição cujo valor é estritamente maior que o alvo; é o que bisect_right devolve.`},{pt:`predicado`,en:`predicate`,def:`Pergunta de sim ou não sobre um valor, como "xs[i] >= alvo?".`},{pt:`ponto de inserção`,en:`insertion point`,def:`Posição onde o alvo entraria para a lista continuar ordenada.`,example:`The returned insertion point ip partitions the array a into two slices.`},{pt:`intervalo semiaberto`,en:`half-open interval`,def:`Intervalo [lo, hi) que inclui lo e exclui hi, o mesmo padrão de range() e das fatias.`},{pt:`piso`,en:`floor`,def:`Numa coleção ordenada, o maior valor menor ou igual a x.`,example:`floor(key) returns the largest key less than or equal to key.`},{pt:`teto`,en:`ceiling`,def:`Numa coleção ordenada, o menor valor maior ou igual a x.`}],references:[`python-docs`,`sedgewick-algs`,`bentley-pearls`,`python-time-complexity`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Na lição anterior, a busca binária respondia a uma pergunta só: **o alvo está na lista? Em que posição?** No dia a dia, as perguntas sobre dados ordenados costumam ser outras:

- Quantos Pix de exatamente R$ 20 a loja recebeu hoje? (contar repetidos)
- Quantas notas da turma ficaram entre 6 e 8? (contar uma faixa)
- Qual é o primeiro ônibus que sai a partir das 7h30? (o próximo valor da lista)
- Em que posição entra um novo inscrito para a lista continuar em ordem alfabética? (onde inserir)

Todas se resolvem com uma busca binária que **nunca falha**: em vez de procurar o alvo e devolver -1, ela procura uma **{{fronteira|boundary}}**, o ponto da lista em que os valores deixam de ser menores que o alvo (ou, na outra versão, deixam de ser menores ou iguais a ele). Com duas fronteiras, o **{{limite inferior|lower bound}}** e o **{{limite superior|upper bound}}**, você sabe onde um valor começa, onde termina e quantas vezes aparece, tudo em O(log n).

O módulo \`bisect\` do Python entrega as duas prontas. O difícil não é chamá-lo: é saber **qual** das duas usar, porque a escolha errada só aparece nos valores que caem exatamente em cima de uma fronteira.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:'### A pergunta certa: onde o predicado vira\nPegue a lista ordenada `xs = [10, 20, 20, 20, 30, 40]` e faça, para cada posição, uma pergunta de sim ou não, um {{predicado|predicate}}: "`xs[i] >= 20`?". Depois troque por "`xs[i] > 20`?".'},{type:`table`,head:[`i`,`0`,`1`,`2`,`3`,`4`,`5`],rows:[["`xs[i]`",`10`,`20`,`20`,`20`,`30`,`40`],["`xs[i] >= 20`",`F`,`**V**`,`V`,`V`,`V`,`V`],["`xs[i] > 20`",`F`,`F`,`F`,`F`,`**V**`,`V`]],caption:`Numa lista ordenada, os dois predicados são falsos num começo e verdadeiros no resto. A fronteira é o primeiro V.`},{type:`md`,text:'Como a lista está ordenada, uma vez que o predicado fica verdadeiro ele nunca volta a ser falso: o padrão é sempre F…F V…V. A primeira posição verdadeira de "`xs[i] >= alvo`" é o **limite inferior** (aqui, 1); a de "`xs[i] > alvo`" é o **limite superior** (aqui, 4). Se nenhuma posição for verdadeira, a fronteira é `len(xs)`: "depois do último".\n\nEssas duas posições contam a história inteira do 20: ele começa na posição 1, a última cópia está na posição 4 − 1 = 3, e ele aparece 4 − 1 = 3 vezes. Se o alvo não estiver na lista (25, por exemplo), as duas fronteiras coincidem: ambas valem 4, a contagem dá 0, e 4 é o **{{ponto de inserção|insertion point}}**, a posição onde o 25 entraria sem desarrumar a ordem.\n\n### O molde do intervalo semiaberto\nPara achar a fronteira, a busca trabalha com um {{intervalo semiaberto|half-open interval}} `[lo, hi)`: `lo` entra e `hi` não, como em `range(lo, hi)` e na fatia `xs[lo:hi]`.'},{type:`code`,lang:`python`,code:`def limite_inferior(xs, alvo):
    lo, hi = 0, len(xs)          # hi = len(xs): "depois do último" também é resposta
    while lo < hi:               # ainda há posições não classificadas
        meio = (lo + hi) // 2
        if xs[meio] < alvo:      # predicado falso no meio: a fronteira está depois
            lo = meio + 1
        else:                    # predicado verdadeiro: o meio pode ser a fronteira
            hi = meio
    return lo                    # lo == hi: a fronteira`,runnable:!1,caption:`Para o limite superior, troque uma única comparação: xs[meio] < alvo vira xs[meio] <= alvo.`},{type:`md`,text:"A **invariante** agora é outra: tudo **antes** de `lo` é menor que o alvo, e tudo **de `hi` em diante** é maior ou igual. Só as posições de `lo` a `hi − 1` ainda não foram classificadas. Quando `lo == hi`, não sobra nenhuma, e `lo` é exatamente a fronteira.\n\nE por que `hi = meio` não causa loop infinito? Com `lo < hi`, o meio arredondado para baixo satisfaz `lo <= meio < hi`. Então `lo = meio + 1` sempre aumenta `lo`, e `hi = meio` sempre diminui `hi`: o intervalo encolhe a cada volta. Compare com a versão da lição anterior:"},{type:`table`,head:[``,`Busca do valor (lição anterior)`,`Busca da fronteira`],rows:[[`Intervalo`,"fechado `[lo, hi]`, começa com `hi = len(xs) - 1`","semiaberto `[lo, hi)`, começa com `hi = len(xs)`"],[`Laço`,"`while lo <= hi`","`while lo < hi`"],[`Quando o meio "serve"`,`devolve o meio na hora`,"`hi = meio`: guarda o meio e continua à esquerda"],[`Quando para`,`ao achar o alvo ou quando o intervalo fica vazio`,"só quando `lo == hi`, depois de cerca de log₂ n voltas"],[`Devolve`,`um índice do alvo, ou -1`,"uma posição de 0 a `len(xs)`, sempre"]]},{type:`md`,text:"### O módulo bisect\nO `bisect` implementa esse molde (em C, no CPython) e acrescenta a inserção ordenada:"},{type:`table`,head:[`Função`,`O que faz`,`Custo`],rows:[["`bisect_left(xs, x)`","limite inferior: primeira posição com `xs[i] >= x`",`O(log n)`],["`bisect_right(xs, x)`, ou só `bisect`","limite superior: primeira posição com `xs[i] > x`",`O(log n)`],["`insort_left(xs, x)`, `insort_right(xs, x)`, ou só `insort`","insere `x` na fronteira correspondente, mantendo a ordem",`O(log n) para achar + O(n) para deslocar os seguintes = **O(n)**`]],caption:`Todas aceitam lo e hi opcionais, para buscar só num trecho da lista.`},{type:`md`,text:`### Cada pergunta vira uma conta
Com as duas fronteiras, as perguntas do começo da lição viram contas de uma linha. Duas delas pedem o {{piso|floor}} de x (o maior valor ≤ x) e o {{teto|ceiling}} de x (o menor valor ≥ x).`},{type:`table`,head:[`Pergunta (xs ordenada)`,`Conta`,`Cuidado`],rows:[[`x está na lista?`,"`i = bisect_left(xs, x)` e depois `i < len(xs) and xs[i] == x`","teste `i < len(xs)` antes de ler `xs[i]`"],[`Primeira ocorrência de x`,"`bisect_left(xs, x)`",`só é ocorrência se x estiver lá; senão é o ponto de inserção`],[`Última ocorrência de x`,"`bisect_right(xs, x) - 1`",`o limite superior fica **uma posição depois** da última cópia`],[`Quantas vezes x aparece`,"`bisect_right(xs, x) - bisect_left(xs, x)`","dá 0 quando x não está: dispensa o `if`"],["Quantos valores em `[a, b]`","`bisect_right(xs, b) - bisect_left(xs, a)`","com `a > b` a conta pode dar negativa"],[`Quantos valores menores que x`,"`bisect_left(xs, x)`","menores **ou iguais**: `bisect_right(xs, x)`"],[`Teto: menor valor ≥ x`,"`xs[bisect_left(xs, x)]`","não existe se a posição for `len(xs)`"],[`Piso: maior valor ≤ x`,"`xs[bisect_right(xs, x) - 1]`","não existe se a posição for -1, e `xs[-1]` não dá erro: devolve o **último** elemento"]]},{type:`callout`,tone:`warn`,text:"O `bisect` confia em você: ele **não confere** se a lista está ordenada. Numa lista fora de ordem, devolve uma posição qualquer, sem erro nenhum. E `insort` dentro de um laço monta uma lista ordenada em O(n²) no pior caso, porque cada inserção desloca os elementos seguintes. Se você já tem todos os valores, `sorted()` faz o mesmo em O(n log n).",title:`Duas armadilhas`},{type:`md`,text:`### Busca linear, lista ordenada ou set?
Ordenar custa O(n log n). Vale a pena? Depende de **quantas** consultas você vai fazer e de **que tipo** elas são. Para q consultas numa coleção de n itens:`},{type:`table`,head:[`Estratégia`,`Preparo`,`Cada consulta`,`Total com q consultas`,`Responde faixa, piso e teto?`],rows:[["Busca linear (`in`, `for`)",`nenhum`,`O(n)`,`O(q · n)`,`sim, mas olhando tudo: O(n) cada`],["`sorted` + `bisect`",`O(n log n)`,`O(log n)`,`O((n + q) log n)`,`sim, em O(log n)`],["`set` / `dict` / `Counter`",`O(n) em média`,`O(1) em média`,`O(n + q) em média`,`não: hash não guarda ordem`]],caption:`Com n = 1 000 000 e q = 1 000: cerca de 10⁹ passos na busca linear contra cerca de 2 × 10⁷ com sorted + bisect (quase todos gastos no sorted).`},{type:`md`,text:'Para **uma** consulta numa lista ainda fora de ordem, a busca linear vence: o preparo de O(n log n) já custa mais que o O(n) dela. Se a pergunta é só "x está lá?" ou "quantas vezes x aparece?", um `set` ou um `Counter` responde em O(1) médio. A lista ordenada com `bisect` brilha quando a **ordem** importa: faixas, piso e teto, posição de inserção, os k vizinhos mais próximos.'},{type:`callout`,tone:`deep`,text:"Desde o Python 3.10, todas as funções do `bisect` aceitam `key=`, para buscar numa lista de registros ordenada por um campo. Por exemplo, com `saidas` ordenada pelo horário, `bisect_left(saidas, 450, key=horario)` acha a primeira saída com `horario(s) >= 450`.\n\nHá uma assimetria que confunde muita gente: em `bisect_left` e `bisect_right`, a `key` é aplicada só aos elementos da lista, **não** ao x (você passa o valor da chave, 450, e não um registro); já em `insort_left` e `insort_right`, ela é aplicada ao x também (você passa o registro inteiro). E a lista precisa estar ordenada pela mesma chave.",title:`bisect com key`}]},{stage:`exemplo`,blocks:[{type:`md`,text:"Siga as duas buscas em `xs = [10, 20, 20, 20, 30, 40]` com alvo 20. Primeiro o limite inferior, que avança `lo` só quando `xs[meio] < 20`:"},{type:`table`,head:[`Passo`,`lo`,`hi`,`meio`,`xs[meio]`,`xs[meio] < 20?`,`Ação`],rows:[[`1`,`0`,`6`,`3`,`20`,`não`,"`hi = 3`"],[`2`,`0`,`3`,`1`,`20`,`não`,"`hi = 1`"],[`3`,`0`,`1`,`0`,`10`,`sim`,"`lo = 1`"],[`fim`,`1`,`1`,``,``,``,`devolve **1**`]],caption:`Limite inferior: bisect_left(xs, 20) == 1.`},{type:`md`,text:"Agora o limite superior. A única mudança é a pergunta: ele avança `lo` quando `xs[meio] <= 20`."},{type:`table`,head:[`Passo`,`lo`,`hi`,`meio`,`xs[meio]`,`xs[meio] <= 20?`,`Ação`],rows:[[`1`,`0`,`6`,`3`,`20`,`sim`,"`lo = 4`"],[`2`,`4`,`6`,`5`,`40`,`não`,"`hi = 5`"],[`3`,`4`,`5`,`4`,`30`,`não`,"`hi = 4`"],[`fim`,`4`,`4`,``,``,``,`devolve **4**`]],caption:`Limite superior: bisect_right(xs, 20) == 4.`},{type:`md`,text:`Repare no passo 1 das duas tabelas: o meio caiu num 20, e mesmo assim nenhuma das buscas parou. Achar **um** 20 não responde à pergunta, que agora é **onde o bloco de 20 começa** (posição 1) e **onde ele termina** (posição 4, exclusiva). Daí saem a primeira ocorrência (1), a última (4 − 1 = 3) e a contagem (4 − 1 = 3).

Execute o limite inferior passo a passo, inclusive com alvos que não estão na lista:`},{type:`trace`,code:`def limite_inferior(xs, alvo):
    lo, hi = 0, len(xs)
    while lo < hi:
        meio = (lo + hi) // 2
        if xs[meio] < alvo:
            lo = meio + 1
        else:
            hi = meio
    return lo

xs = [10, 20, 20, 20, 30, 40]
print(limite_inferior(xs, 20), limite_inferior(xs, 25), limite_inferior(xs, 99))`,caption:`Com 25 e 99 o laço também termina sem "achar" nada: devolve onde eles entrariam (4 e 6).`}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`from bisect import bisect_left, bisect_right, insort

# Tabela de frete: "até 1 kg: R$ 15", "até 5 kg: R$ 25", "até 10 kg: R$ 40", "até 30 kg: R$ 80"
limites = [1, 5, 10, 30]
precos = [15, 25, 40, 80]

def frete(peso):
    i = bisect_left(limites, peso)    # primeira faixa cujo limite é >= peso
    if i == len(limites):
        return "não aceita"
    return f"R$ {precos[i]}"

for peso in [0.5, 1, 1.2, 5, 30, 31]:
    print(f"{peso} kg: {frete(peso)}")

# Pix recebidos no dia, em reais, já ordenados
pix = [5, 12, 20, 20, 20, 35, 50, 50, 120]
print("Pix de R$ 20:", bisect_right(pix, 20) - bisect_left(pix, 20))
print("entre R$ 20 e R$ 50:", bisect_right(pix, 50) - bisect_left(pix, 20))
print("posição do último Pix de R$ 50:", bisect_right(pix, 50) - 1)

# Próxima saída de ônibus a partir das 7h30 (horários em minutos desde 0h)
saidas = [(370, "101"), (445, "230"), (460, "101"), (485, "230")]

def horario(saida):
    return saida[0]

i = bisect_left(saidas, 7 * 60 + 30, key=horario)
if i < len(saidas):
    h, m = divmod(saidas[i][0], 60)
    print(f"próxima saída: {h}h{m:02d}, linha {saidas[i][1]}")
else:
    print("hoje não sai mais nenhum")

insort(pix, 30)
print(pix)`,runnable:!0,caption:`Um peso em cima do limite (1 kg, 5 kg, 30 kg) fica na faixa de baixo, porque a tabela diz "até": por isso bisect_left. Troque por bisect_right e veja o pacote de 1 kg pagar R$ 25.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e4-fronteira-1`,kind:`mcq`,prompt:"Com `xs = [3, 5, 5, 5, 8]`, quanto valem `bisect_left(xs, 5)` e `bisect_right(xs, 5)`, nessa ordem?",difficulty:`facil`,skills:[`alg-busca`],hints:[`bisect_left procura a primeira posição em que xs[i] >= 5. Qual é?`,`bisect_right procura a primeira posição em que xs[i] > 5. Ela aponta para um 5 ou para o que vem depois do bloco?`],explanation:"`bisect_left(xs, 5)` é o limite inferior: a primeira posição com valor >= 5, o primeiro 5 (posição 1). `bisect_right(xs, 5)` é o limite superior: a primeira posição com valor > 5, o 8 na posição 4. O bloco de 5 ocupa a fatia semiaberta `xs[1:4]` e tem 4 − 1 = 3 elementos.",options:[{text:`1 e 4`,correct:!0,feedback:`Isso: o primeiro 5 está na posição 1 e o primeiro valor maior que 5 (o 8) está na posição 4. A diferença, 3, é quantas vezes o 5 aparece.`},{text:`1 e 3`,feedback:`A posição 3 é a da **última** ocorrência. O bisect_right devolve a posição seguinte, onde um novo 5 entraria se fosse colocado depois dos outros.`},{text:`2 e 2`,feedback:`Essa seria a resposta da busca binária da lição anterior, que para no primeiro 5 que encontra (o do meio). bisect_left e bisect_right não param ao achar: continuam até a fronteira do bloco de 5.`},{text:`0 e 4`,feedback:`A posição 0 tem o 3, que é menor que 5. O limite inferior é a primeira posição com valor >= 5, e o 3 não satisfaz isso.`}]}},{type:`exercise`,exercise:{id:`e4-fronteira-2`,kind:`predict`,lang:`python`,prompt:`O que este programa imprime?`,difficulty:`intermediario`,skills:[`alg-busca`],hints:[`Quando o valor não está na lista, existe diferença entre "primeiro >= 5" e "primeiro > 5"?`,`A segunda linha é uma contagem. Quantas vezes o 4 aparece?`,`Para um valor menor que todos, ou maior que todos, onde ele entraria? As funções do bisect podem devolver -1?`],explanation:"Com valor ausente (5), as duas fronteiras coincidem no ponto de inserção: 3, entre o 4 e o 7. A diferença `bisect_right − bisect_left` conta as cópias do 4: 3 − 1 = 2. Um valor menor que todos entra na posição 0 e um maior que todos em `len(xs) = 5`: o bisect nunca devolve -1 nem dá IndexError. Por fim, `bisect_right(xs, 9) − 1 = 4` é a posição da última ocorrência do 9.",code:`from bisect import bisect_left, bisect_right

xs = [2, 4, 4, 7, 9]
print(bisect_left(xs, 5), bisect_right(xs, 5))
print(bisect_right(xs, 4) - bisect_left(xs, 4))
print(bisect_left(xs, 1), bisect_right(xs, 10))
print(bisect_right(xs, 9) - 1)`,answer:`3 3
2
0 5
4`}},{type:`exercise`,exercise:{id:`e4-fronteira-3`,kind:`fix`,lang:`python`,prompt:"Numa escola, a nota vira conceito por esta tabela: **a partir de** 9,0 é A; a partir de 7,0 é B; a partir de 5,0 é C; abaixo de 5,0 é D. A função abaixo erra justamente as notas que caem **em cima** de um corte. Corrija-a, mantendo a busca com `bisect`.",difficulty:`intermediario`,skills:[`alg-busca`],hints:[`Que conceito a função dá para a nota 7,0? E qual deveria dar?`,`Com a nota exatamente igual a um corte, bisect_left devolve a posição do próprio corte ou a seguinte?`,`A tabela diz "a partir de": o corte pertence à faixa de cima. Releia na explicação qual das funções trata um valor igual como "já passou da fronteira".`],explanation:'`bisect_left(CORTES, nota)` conta quantos cortes são **menores** que a nota; `bisect_right` conta quantos são **menores ou iguais**. Com 7,0, há um corte menor (5,0) e dois menores ou iguais (5,0 e 7,0): a versão com `bisect_left` dá "C", a correta dá "B". Regra prática: tabela de "até" (o limite é o último valor da faixa, como no frete) pede `bisect_left`; tabela de "a partir de" (o corte é o primeiro valor da faixa) pede `bisect_right`. É o mesmo exemplo de notas da documentação do `bisect`.',starter:`from bisect import bisect_left

CORTES = [5.0, 7.0, 9.0]
CONCEITOS = "DCBA"

def conceito(nota):
    return CONCEITOS[bisect_left(CORTES, nota)]`,solution:`from bisect import bisect_right

CORTES = [5.0, 7.0, 9.0]
CONCEITOS = "DCBA"

def conceito(nota):
    return CONCEITOS[bisect_right(CORTES, nota)]`,tests:[{name:`notas no meio das faixas`,code:`for nota, esperado in [(0, "D"), (4.9, "D"), (6.0, "C"), (8.5, "B"), (9.7, "A")]:
    r = conceito(nota)
    assert r == esperado, f"conceito({nota}) deu {r!r}, esperado {esperado!r}"`},{name:`notas em cima dos cortes`,code:`for nota, esperado in [(5.0, "C"), (7.0, "B"), (9.0, "A"), (10.0, "A")]:
    r = conceito(nota)
    assert r == esperado, f"conceito({nota}) deu {r!r}, esperado {esperado!r}: \\"a partir de\\" inclui o próprio corte"`},{name:`notas logo abaixo dos cortes`,code:`for nota, esperado in [(4.99, "D"), (6.999, "C"), (8.9999, "B"), (5.001, "C")]:
    r = conceito(nota)
    assert r == esperado, f"conceito({nota}) deu {r!r}, esperado {esperado!r}: abaixo do corte ainda é a faixa de baixo. Em vez de somar uma folga à nota ou mudar os cortes, troque a função de busca"`},{name:`notas a um fio do corte`,code:`import math
for corte, esperado in [(5.0, "D"), (7.0, "C"), (9.0, "B")]:
    nota = math.nextafter(corte, 0)
    r = conceito(nota)
    assert r == esperado, f"conceito({nota!r}) deu {r!r}, esperado {esperado!r}: essa nota é o maior float abaixo de {corte}. Uma folga somada à nota, ou cortes deslocados, sempre erram em algum caso assim; o certo é a função de busca que já trata o empate do jeito da tabela"`},{name:`continua usando bisect`,code:`import ast
chamadas = set()
for no in ast.walk(ast.parse(_source)):
    if isinstance(no, ast.Call):
        chamadas.add(getattr(no.func, "id", None) or getattr(no.func, "attr", None))
assert chamadas & {"bisect", "bisect_left", "bisect_right"}, "mantenha a busca com o módulo bisect, em vez de uma cadeia de if"`}]}},{type:`exercise`,exercise:{id:`e4-fronteira-4`,kind:`code`,lang:`python`,prompt:"Escreva `limite_superior(xs, alvo)`, que devolve a primeira posição de `xs` (ordenada) com valor **maior** que `alvo`, ou `len(xs)` se não houver, exatamente como `bisect_right`. Use o molde do intervalo semiaberto, em O(log n), **sem** importar `bisect`. Depois, use-a em `ultima_ocorrencia(xs, alvo)`, que devolve o índice da última ocorrência do alvo, ou -1 se ele não estiver na lista.",difficulty:`intermediario`,skills:[`alg-busca`],hints:[`Qual é o predicado do limite superior? Escreva a linha da tabela F…F V…V para xs = [10, 20, 20, 30] e alvo 20.`,`Partindo do molde do limite inferior, qual comparação muda? E qual valor inicial de hi permite devolver len(xs)?`,`Se o limite superior é p, onde está a última cópia do alvo? Em que caso essa posição não é uma cópia do alvo?`,`Teste ultima_ocorrencia com a lista vazia: que índice você tentaria ler?`],explanation:'O limite superior é a fronteira do predicado `xs[i] > alvo`. No molde, o lado "falso" (`xs[meio] <= alvo`) faz `lo = meio + 1`, e o lado "verdadeiro" faz `hi = meio`. A última ocorrência fica uma posição antes da fronteira, mas só é ocorrência se essa posição existir (`>= 0`) e guardar o alvo. Sem o teste `i >= 0`, a lista vazia dá IndexError em `xs[-1]`; e em contas parecidas, como a do piso, ler `xs[-1]` numa lista não vazia devolveria o último elemento sem erro nenhum.',starter:`def limite_superior(xs, alvo):
    # primeira posição com xs[i] > alvo (ou len(xs)); use [lo, hi)
    pass


def ultima_ocorrencia(xs, alvo):
    # use limite_superior; devolva -1 se o alvo não estiver em xs
    pass`,solution:`def limite_superior(xs, alvo):
    lo, hi = 0, len(xs)
    while lo < hi:
        meio = (lo + hi) // 2
        if xs[meio] <= alvo:
            lo = meio + 1
        else:
            hi = meio
    return lo


def ultima_ocorrencia(xs, alvo):
    i = limite_superior(xs, alvo) - 1
    if i >= 0 and xs[i] == alvo:
        return i
    return -1`,tests:[{name:`exemplos`,code:`import sys as _sys, time as _time
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
xs = [10, 20, 20, 20, 30, 40]
for alvo, esperado in [(20, 4), (25, 4), (5, 0), (40, 6), (10, 1)]:
    r = _sem_laco_infinito(limite_superior, xs, alvo)
    assert r == esperado, f"limite_superior({xs}, {alvo}) deu {r}, esperado {esperado}"`},{name:`vazia e um elemento`,code:`import sys as _sys, time as _time
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
assert _sem_laco_infinito(limite_superior, [], 3) == 0, "lista vazia: a fronteira é 0"
assert _sem_laco_infinito(limite_superior, [7], 7) == 1, "limite_superior([7], 7) deve ser 1: o 7 não é maior que 7"
assert _sem_laco_infinito(limite_superior, [7], 6) == 0, "limite_superior([7], 6) deve ser 0"
assert _sem_laco_infinito(ultima_ocorrencia, [], 3) == -1, "lista vazia: -1"
assert _sem_laco_infinito(ultima_ocorrencia, [7], 7) == 0, "ultima_ocorrencia([7], 7) deve ser 0"`},{name:`igual ao bisect_right`,code:`import sys as _sys, time as _time
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
from bisect import bisect_right
random.seed(4)
for _ in range(300):
    xs = sorted(random.randint(-5, 5) for _ in range(random.randint(0, 12)))
    for alvo in range(-7, 8):
        r = _sem_laco_infinito(limite_superior, xs, alvo)
        e = bisect_right(xs, alvo)
        assert r == e, f"limite_superior({xs}, {alvo}) deu {r}, esperado {e}"`},{name:`última ocorrência`,code:`import sys as _sys, time as _time
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
for xs, alvo, esperado, msg in [([1, 2, 2, 2, 3], 2, 3, "o último 2 está na posição 3"), ([1, 3, 5], 4, -1, "4 não está na lista: -1"), ([1, 3, 5], 0, -1, "0 é menor que todos: -1"), ([1, 3, 5], 9, -1, "9 é maior que todos: -1"), ([-4, -4, -1], -4, 1, "o último -4 está na posição 1")]:
    r = _sem_laco_infinito(ultima_ocorrencia, xs, alvo)
    assert r == esperado, f"ultima_ocorrencia({xs}, {alvo}) deu {r}: {msg}"`},{name:`precisa ser O(log n)`,code:`import sys as _sys, time as _time
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
import time
_sem_laco_infinito(limite_superior, [1, 2, 2, 3], 2)
_sem_laco_infinito(ultima_ocorrencia, [1, 2, 2, 3], 9)
xs = [5] * 2_000_000
t0 = time.perf_counter()
for _ in range(300):
    a = limite_superior(xs, 5)
    b = ultima_ocorrencia(xs, 5)
    c = limite_superior(xs, 4)
    d = ultima_ocorrencia(xs, 6)
    e = ultima_ocorrencia(xs, 4)
    if time.perf_counter() - t0 > 0.5:
        break
assert (a, b, c, d, e) == (2_000_000, 1_999_999, 0, -1, -1), f"resultados errados numa lista de 2 milhões de cincos: {(a, b, c, d, e)}"
assert time.perf_counter() - t0 < 0.5, "muito lento: não percorra a lista (nem com in, index, fatias ou um laço de trás para frente). Descarte metade a cada passo em limite_superior, e use-a em ultima_ocorrencia"`},{name:`sem bisect`,code:`import ast
nomes = set()
for no in ast.walk(ast.parse(_source)):
    if isinstance(no, ast.Import):
        nomes.update(a.name for a in no.names)
    elif isinstance(no, ast.ImportFrom):
        nomes.add(no.module or "")
    elif isinstance(no, ast.Name):
        nomes.add(no.id)
    elif isinstance(no, ast.Attribute):
        nomes.add(no.attr)
assert not any(n.startswith(("bisect", "insort")) for n in nomes), "implemente a busca você mesmo, sem o módulo bisect"`}]}},{type:`exercise`,exercise:{id:`e4-fronteira-5`,kind:`code`,lang:`python`,prompt:'`extrato` traz os Pix (em reais) que uma loja recebeu no mês, **na ordem em que chegaram**, ou seja, fora de ordem de valor; estornos aparecem como valores negativos. O gerente quer fazer muitas perguntas do tipo "quantos Pix ficaram entre `a` e `b` reais, com os dois extremos incluídos?". Escreva `contar_faixas(extrato, consultas)`, que recebe uma lista de pares `(a, b)` e devolve a lista com a resposta de cada consulta, na mesma ordem. Se `a > b`, a resposta daquela consulta é 0. Não altere a lista `extrato`. Meta: O((n + q) log n) no total, para n Pix e q consultas.',difficulty:`intermediario`,skills:[`alg-busca`],hints:[`Se o extrato estivesse ordenado por valor, como você contaria uma faixa sem olhar os valores do meio?`,`Quantas vezes você precisa ordenar: uma vez por consulta ou uma vez no total? Compare O(q · n log n) com O(n log n + q log n). E como ordenar sem mexer na lista de quem chamou?`,`Os dois extremos contam. Qual função do bisect deixa os iguais a b do lado de dentro, e qual deixa os iguais a a do lado de dentro?`,`O que a sua conta devolve para a consulta (3, 1)?`],explanation:"Ordenar uma cópia (`sorted`) uma única vez custa O(n log n). Depois, cada consulta são duas buscas binárias: `bisect_left(valores, a)` é quantos valores são menores que a, e `bisect_right(valores, b)` é quantos são menores ou iguais a b; a diferença é quantos estão em `[a, b]`. Total: O((n + q) log n). Ordenar dentro de cada consulta custaria O(q · n log n), pior até que a busca linear, O(q · n). `extrato.sort()` também ordena, mas bagunça a lista de quem chamou a função. Com `a > b`, a diferença pode ficar negativa, por isso o caso especial; e como Pix têm centavos, truques como `b + 1` não funcionam.",starter:`from bisect import bisect_left, bisect_right

def contar_faixas(extrato, consultas):
    # extrato: valores fora de ordem; consultas: lista de pares (a, b)
    # devolva [quantos v com a <= v <= b, para cada (a, b)], em O((n + q) log n)
    pass`,solution:`from bisect import bisect_left, bisect_right

def contar_faixas(extrato, consultas):
    valores = sorted(extrato)    # uma vez só, e numa cópia
    respostas = []
    for a, b in consultas:
        if a > b:
            respostas.append(0)
        else:
            respostas.append(bisect_right(valores, b) - bisect_left(valores, a))
    return respostas`,tests:[{name:`exemplo`,code:`ext = [20, 5, 50, 120, 20, 12, 35, 50, 20]
consultas = [(20, 50), (13, 19), (0, 1000), (6, 34)]
r = contar_faixas(ext, consultas)
assert r == [6, 0, 9, 4], f"contar_faixas({ext}, {consultas}) deu {r}, esperado [6, 0, 9, 4]"`},{name:`extremos inclusos`,code:`ext = [20, 5, 50, 120, 20, 12, 35, 50, 20]
r = contar_faixas(ext, [(20, 20), (50, 120), (5, 12)])
assert r == [3, 3, 2], f"deu {r}, esperado [3, 3, 2]: os dois extremos contam (a <= v <= b), e os três Pix de R$ 20 estão em [20, 20]"`},{name:`vazios e a > b`,code:`r = contar_faixas([], [(1, 5)])
assert r == [0], f"extrato vazio: esperado [0], veio {r}"
r = contar_faixas([1, 2, 3], [])
assert r == [], f"sem consultas: esperado [], veio {r}"
r = contar_faixas([1, 2, 3], [(3, 1)])
assert r == [0], f"com a > b não há valor possível: esperado [0], veio {r}"
r = contar_faixas([20, 5, 50, 120, 20, 12, 35, 50, 20], [(50, 20), (20, 50)])
assert r == [0, 6], f"esperado [0, 6] (a primeira consulta tem a > b), veio {r}"`},{name:`estornos negativos`,code:`ext = [0, -10, 15, -30, -10]
r = contar_faixas(ext, [(-10, 0), (-100, -20), (16, 99)])
assert r == [3, 1, 0], f"deu {r}, esperado [3, 1, 0]: em [-10, 0] há -10, -10 e 0, e em [-100, -20] só o -30"`},{name:`valores com centavos`,code:`ext = [10.99, 9.9, 20.5, 10.0, 11.0, 10.5]
consultas = [(10, 10.5), (10.5, 11), (10.01, 10.98), (10, 11)]
r = contar_faixas(ext, consultas)
assert r == [2, 3, 1, 4], f"contar_faixas({ext}, {consultas}) deu {r}, esperado [2, 3, 1, 4]. Pix têm centavos: truques como b + 1 só funcionam com inteiros"`},{name:`não altera o extrato`,code:`ext = [30, -5, 12, 12, 7]
contar_faixas(ext, [(0, 20)])
assert ext == [30, -5, 12, 12, 7], f"o extrato mudou para {ext}: ordene uma cópia"`},{name:`muitas consultas`,code:`import sys as _sys, time as _time
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
from bisect import bisect_left as _bl, bisect_right as _br
random.seed(8)
ext = [random.randint(-1_000, 100_000) for _ in range(200_000)]
consultas = []
for i in range(10_000):
    if i % 10:
        a, b = random.randint(-2_000, 30_000), random.randint(70_000, 101_000)
    else:
        a, b = random.randint(-2_000, 101_000), random.randint(-2_000, 101_000)
    consultas.append((a, b))
_ord = sorted(ext)
esperado = [max(0, _br(_ord, b) - _bl(_ord, a)) for a, b in consultas]
r = _no_prazo(1.5, "com 200 000 Pix e 10 000 consultas, a sua função passou de 1,5 s: ordene uma vez só e responda cada consulta com duas buscas binárias, sem percorrer a lista, sem fatiar a faixa encontrada e sem reordenar a cada consulta", contar_faixas, ext, consultas)
assert r == esperado, "com 200 000 Pix e 10 000 consultas, algumas contagens vieram erradas"`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e4-fronteira-desafio`,kind:`code`,lang:`python`,prompt:"`kms` é a lista **ordenada** das posições (em km) dos postos de combustível ao longo de uma rodovia; pode haver dois postos no mesmo km. Escreva `postos_mais_proximos(kms, x, k)`, que devolve uma lista, **em ordem crescente**, com as posições dos `k` postos mais próximos do km `x` (0 ≤ k ≤ len(kms)). Em caso de empate na distância, prefira o posto de km **menor**.\n\nExemplos: `postos_mais_proximos([10, 25, 40, 41, 70], 38, 3)` devolve `[25, 40, 41]`; `postos_mais_proximos([10, 20, 30], 20, 2)` devolve `[10, 20]` (10 e 30 empatam, e o 10 tem km menor).\n\nA mesma função vai atender consultas numa lista de um milhão de posições: cada chamada deve custar **O(log n + k)**, sem percorrer nem ordenar a lista inteira.",difficulty:`desafio`,skills:[`alg-busca`],hints:[`Os k postos mais próximos de x formam um bloco contíguo da lista ordenada? Por quê?`,`Onde x entraria na lista? Esse ponto separa os candidatos da esquerda (menores que x) dos da direita.`,`A partir desse ponto, mantenha dois índices, um andando para a esquerda e outro para a direita, como nos dois ponteiros do Nível 3. A cada passo, qual dos dois candidatos você pega?`,`E quando um dos lados acaba antes de completar k? Confira também a regra de empate.`],explanation:"Como a lista está ordenada, os k mais próximos de x formam uma fatia contígua: se um posto entrou na resposta, qualquer posto entre ele e x está pelo menos tão perto. `bisect_left` acha em O(log n) onde x entraria; dali, dois ponteiros aumentam a fatia um posto por vez, sempre pegando o lado mais perto (no empate, o da esquerda, que tem km menor): O(k). Total O(log n + k), contra O(n log n) de ordenar todos pela distância. Existe ainda uma solução que faz busca binária direto no **início** da janela de k postos, em O(log(n − k) + k): ela já é uma busca binária na resposta, assunto da próxima lição.",starter:`def postos_mais_proximos(kms, x, k):
    # devolva os k valores de kms mais próximos de x, em ordem crescente;
    # empate na distância: prefira o km menor. Meta: O(log n + k)
    pass`,solution:`from bisect import bisect_left

def postos_mais_proximos(kms, x, k):
    direita = bisect_left(kms, x)     # primeiro posto com km >= x
    esquerda = direita - 1            # último posto com km < x
    for _ in range(k):
        if esquerda < 0:
            direita += 1
        elif direita >= len(kms):
            esquerda -= 1
        elif x - kms[esquerda] <= kms[direita] - x:
            esquerda -= 1
        else:
            direita += 1
    return kms[esquerda + 1:direita]`,tests:[{name:`exemplos do enunciado`,code:`r = postos_mais_proximos([10, 25, 40, 41, 70], 38, 3)
assert r == [25, 40, 41], f"esperado [25, 40, 41], veio {r}"
r = postos_mais_proximos([10, 20, 30], 20, 2)
assert r == [10, 20], f"10 e 30 empatam a 10 km: fica o de km menor. Esperado [10, 20], veio {r}"`},{name:`bordas`,code:`assert postos_mais_proximos([10, 20, 30], 15, 0) == [], "k = 0: lista vazia"
r = postos_mais_proximos([10, 20, 30], 0, 2)
assert r == [10, 20], f"x antes de todos: esperado [10, 20], veio {r}"
r = postos_mais_proximos([10, 20, 30], 99, 2)
assert r == [20, 30], f"x depois de todos: esperado [20, 30], veio {r}"
r = postos_mais_proximos([10, 20, 30], 26, 3)
assert r == [10, 20, 30], f"k = len(kms): todos, em ordem. Veio {r}"
r = postos_mais_proximos([7], 7, 1)
assert r == [7], f"um posto só: esperado [7], veio {r}"`},{name:`repetidos e negativos`,code:`kms = [-5, -5, 0, 3, 3, 3, 8]
r = postos_mais_proximos(kms, 2, 4)
assert r == [0, 3, 3, 3], f"esperado [0, 3, 3, 3], veio {r}"
r = postos_mais_proximos(kms, -5, 3)
assert r == [-5, -5, 0], f"esperado [-5, -5, 0], veio {r}"`},{name:`comparação com força bruta`,code:`import random
random.seed(7)
for _ in range(400):
    kms = sorted(random.randint(-20, 20) for _ in range(random.randint(1, 10)))
    x = random.randint(-25, 25)
    k = random.randint(0, len(kms))
    esperado = sorted(sorted(kms, key=lambda v: (abs(v - x), v))[:k])
    r = postos_mais_proximos(kms, x, k)
    assert r == esperado, f"postos_mais_proximos({kms}, {x}, {k}) deu {r}, esperado {esperado}"`},{name:`O(log n + k) por consulta`,code:`import sys as _sys, time as _time
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
from bisect import bisect_left as _bl
kms = list(range(0, 2_000_000, 2))
xs = [1001] + [q * 1999 for q in range(1000)]
def _consultas():
    return [postos_mais_proximos(kms, x, 3) for x in xs]
rs = _no_prazo(1.0, "1 001 consultas numa lista de 1 milhão de postos passaram de 1 s: cada consulta deve custar O(log n + k), sem percorrer nem ordenar a lista", _consultas)
assert rs[0] == [998, 1000, 1002], f"postos_mais_proximos(kms, 1001, 3): esperado [998, 1000, 1002] (998 e 1004 empatam, fica o 998), veio {rs[0]}"
for x, r in zip(xs, rs):
    i = _bl(kms, x)
    perto = kms[max(0, i - 4):i + 4]
    e = sorted(sorted(perto, key=lambda v: (abs(v - x), v))[:3])
    assert r == e, f"postos_mais_proximos(kms, {x}, 3) deu {r}, esperado {e}"`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:'**Miniprojeto: autocompletar de cidades.** Monte uma lista com nomes de municípios brasileiros em minúsculas (umas centenas bastam), ordene-a uma vez e responda aos prefixos que o usuário digita. Todas as cidades que começam com `"sao "` ocupam uma **fatia contígua** da lista ordenada: o começo é `bisect_left(nomes, "sao ")`, e o fim é `bisect_left(nomes, "sao!")`, porque `"!"` é o caractere seguinte ao espaço (`chr(ord(" ") + 1)`). Generalize trocando o último caractere do prefixo pelo seguinte. Mostre as 10 primeiras sugestões a cada tecla e compare o tempo com `[c for c in nomes if c.startswith(p)]` em 100 000 nomes gerados aleatoriamente. **Extensão**: o que acontece com a ordem quando há acentos ("são" × "sao")? Use `unicodedata.normalize("NFD", s)` para separar os acentos das letras e descartá-los antes de ordenar.'}]},{stage:`revisao`,blocks:[{type:`md`,text:'- Em lista ordenada, "`xs[i] >= x`" e "`xs[i] > x`" são F…F V…V: a busca procura a **fronteira**, não o valor.\n- Molde semiaberto: `lo, hi = 0, len(xs)`, `while lo < hi`, falso → `lo = meio + 1`, verdadeiro → `hi = meio`. Devolve de 0 a `len(xs)`, nunca -1.\n- `bisect_left` = limite inferior (primeiro ≥ x); `bisect_right` = limite superior (primeiro > x).\n- Contagem de x: `bisect_right − bisect_left`. Faixa [a, b]: `bisect_right(b) − bisect_left(a)`. Última ocorrência: `bisect_right − 1`.\n- Tabela de "até" pede `bisect_left`; tabela de "a partir de" pede `bisect_right`.\n- `insort` é O(n) por inserção. Ordenar só compensa com muitas consultas; para pertinência pura, `set`.'},{type:`callout`,tone:`english`,text:`- **lower bound / upper bound**: limite inferior / limite superior
- **insertion point**: ponto de inserção
- **half-open interval**: intervalo semiaberto, como \`[lo, hi)\`
- **floor / ceiling**: piso / teto
- **off-by-one error**: erro de um a mais ou a menos, o bug clássico das fronteiras

Da documentação do \`bisect\`: *"Locate the insertion point for x in a to maintain sorted order. (…) If x is already present in a, the insertion point will be before (to the left of) any existing entries."*

Frase típica de entrevista: *"I'd sort once in O(n log n) and answer each range query with two binary searches, so q queries cost O((n + q) log n)."*`,title:`English corner`}]}],cards:[{id:`l4-bisect-fronteiras#1`,front:"O que `bisect_left(xs, x)` devolve, descrito como fronteira de um predicado?",back:`A primeira posição i com xs[i] >= x, ou len(xs) se não houver: o limite inferior.`},{id:`l4-bisect-fronteiras#2`,front:`Como contar em O(log n) quantas vezes x aparece numa lista ordenada?`,back:`bisect_right(xs, x) − bisect_left(xs, x). Dá 0 se x não estiver.`},{id:`l4-bisect-fronteiras#3`,front:"No molde semiaberto, por que o ramo verdadeiro faz `hi = meio`, e por que isso não trava o laço?",back:`Porque o meio pode ser a própria fronteira. Como lo < hi e o meio é arredondado para baixo, meio < hi: o intervalo encolhe mesmo assim.`},{id:`l4-bisect-fronteiras#4`,front:"Numa tabela de faixas, quando usar `bisect_left` e quando usar `bisect_right`?",back:`"Até X" (o limite é o último valor da faixa): bisect_left nos limites. "A partir de X" (o corte é o primeiro valor da faixa): bisect_right nos cortes.`},{id:`l4-bisect-fronteiras#5`,front:`Como achar o maior valor ≤ x (o piso) numa lista ordenada, e qual a armadilha?`,back:`i = bisect_right(xs, x) − 1. Se i == −1 não existe piso, e xs[−1] devolveria o último elemento sem dar erro.`},{id:`l4-bisect-fronteiras#6`,front:"Quanto custa `insort`, e por quê?",back:`O(n): achar a posição é O(log n), mas inserir no meio da lista desloca todos os elementos seguintes.`},{id:`l4-bisect-fronteiras#7`,front:`Com q consultas em n itens, quando vale ordenar e usar bisect em vez de busca linear?`,back:`Quando q é grande: O((n + q) log n) contra O(q · n). Para uma consulta só, a busca linear ganha; para pertinência pura, set é melhor.`}]};export{e as default};
//# sourceMappingURL=l4-bisect-fronteiras-TpXYJ1-F.js.map