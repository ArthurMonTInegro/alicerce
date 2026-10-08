var e={id:`l4-ordenacao-linear`,moduleId:`m4-3`,title:`Abaixo de n log n: árvore de decisão, counting sort e radix sort`,titleEn:`Beating n log n: decision trees, counting sort and radix sort`,summary:`Por que nenhuma ordenação por comparação faz menos que log₂(n!) comparações no pior caso, e como counting sort e radix sort ordenam em tempo linear usando a própria chave como endereço, com a estabilidade como peça central.`,minutes:50,objectives:[`Provar o limite inferior Ω(n log n) com a árvore de decisão e calcular ⌈log₂(n!)⌉ para n pequeno`,`Implementar o counting sort estável com somas de prefixos e dizer quando Θ(n + k) compensa`,`Executar o radix sort LSD à mão e explicar por que cada passada precisa ser estável`,`Escolher entre ordenação por comparação, counting sort e radix sort pelo tipo e pela faixa das chaves`],skills:[`alg-ordenacao`,`alg-complexidade`],terms:[{pt:`ordenação por comparação`,en:`comparison sort`,def:`Algoritmo que só descobre a ordem perguntando "a < b?" entre dois elementos; merge, quick, heap e insertion sort são assim.`,example:`Any comparison sort must make Ω(n log n) comparisons in the worst case.`},{pt:`árvore de decisão`,en:`decision tree`,def:`Árvore binária com todas as sequências de comparações que um algoritmo pode fazer para um tamanho n; cada folha é uma ordem final.`},{pt:`ordenação por contagem`,en:`counting sort`,def:`Conta quantas vezes cada chave inteira aparece e usa as contagens para calcular a posição de cada item; Θ(n + k) para chaves em uma faixa de k valores.`,example:`Counting sort runs in O(n + k) time, where k is the range of the keys.`},{pt:`soma de prefixos`,en:`prefix sum`,def:`Lista em que cada posição guarda a soma dos elementos do início até ela (versão inclusiva) ou só dos anteriores a ela (versão exclusiva); também chamada de soma acumulada.`,example:`Take the prefix sums of the counts to find where each key starts in the output.`},{pt:`ordenação por dígitos`,en:`radix sort`,def:`Ordena chaves de d dígitos com d passadas estáveis, uma por dígito; Θ(d · (n + b)) na base b.`},{pt:`dígito menos significativo`,en:`least significant digit (LSD)`,def:`O dígito mais à direita, o que menos pesa no valor; o radix sort LSD começa por ele.`},{pt:`base`,en:`radix`,def:`Quantos valores um dígito pode ter: 10 em decimal, 256 quando cada "dígito" é um byte.`},{pt:`ordenação por baldes`,en:`bucket sort`,def:`Espalha os itens em baldes por faixa de valor e ordena cada balde; tempo esperado Θ(n) quando as chaves são uniformes.`}],references:[`clrs`,`sedgewick-algs`,`mit-6006`,`python-sorting-howto`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`A primeira lição do módulo afirmou, num quadro de aprofundamento, que ordenar comparando exige Ω(n log n) comparações e que counting sort e radix sort "escapam" desse limite. Agora você vai ver a prova e o escape funcionando.

Duas ideias:

1. Uma {{ordenação por comparação|comparison sort}} só aprende sobre a ordem fazendo perguntas de sim ou não ("a < b?"). No pior caso, cada resposta elimina no máximo metade das ordens que ainda são possíveis. Como n elementos podem estar em n! ordens, são necessárias pelo menos log₂(n!) ≈ n log₂ n perguntas. Nenhum truque de pivô, de memória ou de sorteio escapa disso.
2. Se a chave é um inteiro pequeno (nota de 0 a 10, idade, dia do mês, um dígito do CEP), não é preciso perguntar nada: a chave **é** o endereço. Pense num censo: para montar a distribuição por idade, ninguém compara pessoas entre si; basta contar quantas têm 0 anos, quantas têm 1 ano, e assim por diante. Essa é a {{ordenação por contagem|counting sort}}, em Θ(n + k). A {{ordenação por dígitos|radix sort}} estende a ideia para chaves grandes, como CEPs, passando dígito por dígito, e só funciona graças à **estabilidade**.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`### O limite inferior: a árvore de decisão
Fixe n. Tudo o que uma ordenação por comparação pode fazer com entradas de tamanho n cabe numa {{árvore de decisão|decision tree}}: cada nó interno é uma comparação "aᵢ < aⱼ?", com um filho para "sim" e outro para "não", e cada folha é a ordem final que o algoritmo devolve. Rodar o algoritmo numa entrada é descer da raiz até uma folha, e o número de comparações é a profundidade dessa folha.

1. **Pelo menos n! folhas.** Se duas ordens diferentes da entrada chegassem à mesma folha, o algoritmo faria o mesmo rearranjo nas duas, e pelo menos uma sairia errada. Então cada uma das n! ordens precisa da sua folha.
2. **No máximo 2ʰ folhas.** Uma árvore binária de altura h tem no máximo 2ʰ folhas.
3. **Conclusão.** 2ʰ ≥ n!, logo h ≥ log₂(n!). Pela aproximação de Stirling, log₂(n!) ≈ n log₂ n − 1,44n: Ω(n log n) comparações no pior caso.

O argumento vale também para a **média**: numa árvore binária com N folhas, a profundidade média das folhas é pelo menos log₂ N. E sortear pivôs não ajuda: para cada resultado fixo dos sorteios o algoritmo é uma árvore de decisão como outra qualquer.`},{type:`table`,head:[`n`,`n!`,`⌈log₂(n!)⌉: limite inferior para o pior caso`,`merge sort (pior caso)`,`insertion sort (pior caso)`],rows:[[`3`,`6`,`3`,`3`,`3`],[`4`,`24`,`5`,`5`,`6`],[`5`,`120`,`7`,`8`,`10`],[`10`,`3 628 800`,`22`,`25`,`45`],[`100`,`≈ 9,3 × 10¹⁵⁷`,`525`,`573`,`4 950`],[`1 000`,`2 568 algarismos`,`8 530`,`8 977`,`499 500`]],caption:`Com n grande, o merge sort fica a poucos por cento do limite (cerca de 5% em n = 1 000). E o limite é quase atingível: para n = 5 existe um método (Ford–Johnson) que ordena com 7 comparações.`},{type:`md`,text:`### O que o limite **não** proíbe
O argumento supõe que a única fonte de informação são comparações de sim ou não. Se a chave é um inteiro entre 0 e k − 1, a instrução \`cont[x] += 1\` escolhe uma entre k gavetas de uma vez só: é uma decisão de k vias, não de duas. Esse é o "escape". Não há contradição: é outro modelo de computação, que só serve quando as chaves têm essa estrutura.

### Counting sort
Três passadas, para n itens com chaves inteiras de 0 a k − 1:

1. **Contar**: cont[v] = quantos itens têm chave v. São n passos.
2. **Somar prefixos**: inicio[v] = quantos itens têm chave **menor** que v, que é onde o primeiro item de chave v vai ficar na saída. É uma {{soma de prefixos|prefix sum}} (ou soma acumulada), k passos.
3. **Posicionar**: percorrer a entrada **na ordem original** e colocar cada item em saida[inicio[chave]], somando 1 a inicio[chave]. Mais n passos.

Total: Θ(n + k) de tempo e Θ(n + k) de memória extra. É **estável**: a passada 3 visita os itens na ordem original e preenche a região de cada chave da esquerda para a direita, então iguais mantêm a ordem em que chegaram.

- **Quando compensa**: k = O(n). Idades de 5 milhões de pessoas (k = 121), notas de 0 a 1 000, dias do ano.
- **Quando não compensa**: k muito maior que n. Mil CPFs tratados como inteiros têm k ≈ 10¹¹: o vetor de contagens seria 100 milhões de vezes maior que a entrada.
- **Negativos**: desloque pelo menor valor (índice = x − mínimo).
- **Só inteiros, sem dados junto**: dá para pular as somas de prefixos e reescrever a saída direto das contagens. Com registros (nome, idade), a passada 3 é obrigatória.

### Radix sort LSD
Chaves com d dígitos na {{base|radix}} b: ordene pelo {{dígito menos significativo|least significant digit (LSD)}} primeiro, depois pelo seguinte, até o mais significativo por último, e cada passada precisa ser uma ordenação **estável** por aquele dígito (um counting sort com k = b).

**Por que funciona** (a invariante): depois da passada i, a lista está ordenada pelos i últimos dígitos. A passada i + 1 ordena pelo dígito seguinte; entre chaves que empatam nesse dígito, a estabilidade mantém a ordem anterior, que já estava certa pelos i últimos. Logo a lista fica ordenada pelos i + 1 últimos dígitos. Sem estabilidade, a última passada embaralharia as chaves com o mesmo primeiro dígito e todo o trabalho anterior se perderia.

Custo: **Θ(d · (n + b))**.
- CEPs: d = 8 dígitos, b = 10, ou seja, 8 passadas de n + 10 passos.
- Inteiros de 32 bits: com cada "dígito" sendo um byte, b = 256 e d = 4 passadas.
- Inteiros menores que n²: use base n. Um milhão de números menores que 10¹² cabem em d = 2 dígitos na base 10⁶: duas passadas, Θ(n).`},{type:`table`,head:[`Método`,`Tempo`,`Memória extra`,`Estável?`,`Quando usar`],rows:[[`Por comparação (merge sort, Timsort)`,`Θ(n log n) no pior caso`,`Θ(n)`,`sim`,`qualquer chave comparável: strings, tuplas, datas, reais`],[`Counting sort`,`Θ(n + k)`,`Θ(n + k)`,`sim (versão com somas de prefixos)`,`chaves inteiras numa faixa pequena, k = O(n)`],[`Radix sort LSD`,`Θ(d · (n + b))`,`Θ(n + b)`,`sim`,`chaves de tamanho fixo: CEP, CPF, inteiros de 32 ou 64 bits`],[`Bucket sort`,`Θ(n) esperado; Θ(n²) no pior caso`,`Θ(n)`,`sim, se cada balde usar um método estável`,`reais com distribuição uniforme conhecida`]]},{type:`callout`,tone:`tip`,text:'Em Python, `sorted()` é escrito em C, e um radix sort em Python puro costuma perder para ele mesmo com n grande: a constante de cada passo interpretado é alta. O Θ(n) aparece na prática em linguagens compiladas e em bibliotecas (a NumPy, por exemplo, usa radix sort em `np.sort(..., kind="stable")` para alguns tipos inteiros), em bancos de dados e em placas de vídeo (GPUs). Aqui, implementar serve para **entender**; no dia a dia, use `sorted` com `key`.'},{type:`callout`,tone:`deep`,text:`- **Radix MSD** (do dígito mais significativo): separa pelo primeiro dígito em b baldes e ordena cada balde recursivamente pelo dígito seguinte. Para cedo quando um balde tem um item só, por isso é a escolha natural para strings de tamanhos muito diferentes. Não depende de estabilidade entre passadas, mas a recursão cria muitos baldes pequenos.
- **{{Ordenação por baldes|bucket sort}}**: para chaves reais uniformemente distribuídas em [0, 1), espalha os n itens em n baldes (o balde de x é ⌊n · x⌋), ordena cada balde com insertion sort e concatena. Em média cada balde tem O(1) itens, e o tempo esperado é Θ(n). Se a distribuição não for uniforme e tudo cair num balde só, o custo volta a Θ(n²).`,title:`Duas variações`}]},{stage:`exemplo`,blocks:[{type:`md`,text:`### 1. A árvore de decisão do insertion sort para n = 3
Elementos a, b e c. Cada caminho da raiz até uma folha é uma execução; cada folha, uma das 3! = 6 ordens.`},{type:`code`,lang:`text`,code:`                 a < b ?
         sim /           \\ não
      b < c ?             a < c ?
    sim /  \\ não        sim /  \\ não
[a, b, c]   a < c ?   [b, a, c]   b < c ?
          sim /  \\ não         sim /  \\ não
     [a, c, b] [c, a, b]   [b, c, a] [c, b, a]`,runnable:!1},{type:`md`,text:`Duas folhas estão na profundidade 2 (melhor caso: 2 comparações) e quatro na profundidade 3. Nenhum algoritmo por comparação ordena 3 elementos com no máximo 2 comparações: 2 perguntas de sim ou não distinguem no máximo 2² = 4 casos, e são 6 ordens. ⌈log₂ 6⌉ = 3, e o insertion sort atinge o limite.

### 2. Counting sort estável, passo a passo
Na fila do banco, cada cliente tem um tipo de atendimento: 0 = preferencial, 1 = agendado, 2 = comum. Queremos ordenar por tipo **sem mudar a ordem de chegada** dentro de cada tipo. Entrada: Ana (2), Beto (0), Caio (2), Duda (1), Eva (0).

Contagens: cont = [2, 1, 2] (dois preferenciais, um agendado, dois comuns). Somas de prefixos exclusivas: inicio = [0, 2, 3], ou seja, os preferenciais começam no índice 0, o agendado no 2 e os comuns no 3. Agora a passada 3, na ordem de chegada:`},{type:`table`,head:[`Cliente`,`Tipo`,`inicio antes`,`Vai para o índice`,`inicio depois`],rows:[[`Ana`,`2`,`[0, 2, 3]`,`3`,`[0, 2, 4]`],[`Beto`,`0`,`[0, 2, 4]`,`0`,`[1, 2, 4]`],[`Caio`,`2`,`[1, 2, 4]`,`4`,`[1, 2, 5]`],[`Duda`,`1`,`[1, 2, 5]`,`2`,`[1, 3, 5]`],[`Eva`,`0`,`[1, 3, 5]`,`1`,`[2, 3, 5]`]],caption:`Saída: Beto (0), Eva (0), Duda (1), Ana (2), Caio (2). Beto continua antes de Eva e Ana antes de Caio: estável. Nenhum cliente foi comparado com outro.`},{type:`md`,text:`### 3. Radix sort LSD à mão
Sete códigos de três dígitos. Cada coluna é o resultado de uma passada estável pelo dígito indicado:`},{type:`table`,head:[`Entrada`,`Após as unidades`,`Após as dezenas`,`Após as centenas`],rows:[[`329`,`720`,`720`,`329`],[`457`,`355`,`329`,`355`],[`657`,`436`,`436`,`436`],[`839`,`457`,`839`,`457`],[`436`,`657`,`355`,`657`],[`720`,`329`,`457`,`720`],[`355`,`839`,`657`,`839`]],caption:`Depois de cada passada, a lista fica ordenada pelos dígitos já processados: primeiro pelo último, depois pelos dois últimos, depois pelos três.`},{type:`md`,text:`Olhe o 329 e o 355 na última passada: os dois têm centena 3, então essa passada não os distingue. Quem decide é a ordem que eles já tinham (329 antes de 355, graças às dezenas), e a passada estável a preserva. Uma passada instável poderia devolver 355 antes de 329.`}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`def passada_estavel(itens, digito):
    """Counting sort estável pela chave digito(item), que vai de 0 a 9."""
    cont = [0] * 10
    for it in itens:
        cont[digito(it)] += 1
    inicio = [0] * 10                 # inicio[d] = quantos itens têm dígito < d
    for d in range(1, 10):
        inicio[d] = inicio[d - 1] + cont[d - 1]
    saida = [None] * len(itens)
    for it in itens:                  # ordem original: é isso que garante a estabilidade
        d = digito(it)
        saida[inicio[d]] = it
        inicio[d] += 1
    return saida

def radix_ceps(pedidos):
    """pedidos: lista de (cep, cliente). Ordena por CEP, do último dígito para o primeiro."""
    posicoes = [0, 1, 2, 3, 4, 6, 7, 8]   # índices dos dígitos em "01310-100" (pula o hífen)
    for pos in reversed(posicoes):
        pedidos = passada_estavel(pedidos, lambda p: int(p[0][pos]))
    return pedidos

pedidos = [("22041-001", "Ana"), ("01310-100", "Bia"), ("70040-010", "Caio"),
           ("22041-001", "Davi"), ("01310-930", "Eva"), ("40020-000", "Fábio")]
for cep, cliente in radix_ceps(pedidos):
    print(cep, cliente)
print("igual ao sorted estável?", radix_ceps(pedidos) == sorted(pedidos, key=lambda p: p[0]))`,runnable:!0,caption:`Oito passadas de counting sort, uma por dígito, do último para o primeiro. Ana e Davi têm o mesmo CEP e saem na ordem em que chegaram. Experimente trocar reversed(posicoes) por posicoes e veja a ordem quebrar.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e4-lin-1`,kind:`mcq`,prompt:`Em qual destas situações o counting sort é a melhor escolha?`,difficulty:`facil`,skills:[`alg-ordenacao`],hints:[`O custo do counting sort depende de duas quantidades. Quais?`,`Em cada situação, quanto vale k (a quantidade de valores possíveis da chave) comparado com n?`,`O counting sort usa a chave como índice de uma lista. Toda chave serve como índice?`],explanation:`O counting sort custa Θ(n + k) e precisa de chaves inteiras numa faixa de k valores. Compensa quando k é pequeno perto de n, como as idades de um censo (k = 121, n = 5 milhões). Com CPFs, k é astronômico; com nomes, a chave nem é um inteiro; com 50 preços, n é tão pequeno que qualquer método serve.`,options:[{text:`Ordenar as idades (0 a 120 anos) de 5 milhões de pessoas de um censo.`,correct:!0,feedback:`Isso: k = 121 é minúsculo perto de n = 5 milhões. São Θ(n + k) passos, e o vetor de contagens tem só 121 posições.`},{text:`Ordenar 1 000 CPFs, tratados como números inteiros de 11 dígitos.`,feedback:`A faixa de valores é k ≈ 10¹¹: o vetor de contagens teria 100 bilhões de posições para guardar 1 000 números. Quando k é muito maior que n, o counting sort é inviável. Um radix sort por dígitos, ou o próprio sorted(), resolve.`},{text:`Ordenar 10 000 nomes de clientes em ordem alfabética.`,feedback:`Nomes não são inteiros numa faixa pequena: cada nome é uma sequência de letras de tamanho variável. Para strings, use sorted() ou um radix sort por posição, como no desafio desta lição.`},{text:`Ordenar 50 preços com centavos, como 19,90 e 1 234,56.`,feedback:`Com n = 50, qualquer método serve, e sorted() é o mais simples. Convertendo para centavos, a faixa iria de 1 990 a 123 456: mais de 120 mil contadores para ordenar 50 números.`}]}},{type:`exercise`,exercise:{id:`e4-lin-2`,kind:`predict`,lang:`python`,prompt:`O que este código imprime?`,difficulty:`intermediario`,skills:[`alg-ordenacao`,`prog-listas`],hints:[`Depois do primeiro laço, cont[v] é quantas vezes v aparece. Quantos 3 há na lista?`,`No segundo laço, cada posição recebe a soma dela com a anterior, que já foi atualizada. Faça as contas da esquerda para a direita.`,`Depois do segundo laço, cont[2] conta quantas notas são menores ou iguais a 2. Se são essas as primeiras da saída, em qual índice fica a última delas?`],explanation:`Contagens: um 0, um 1, um 2 e três 3, então [1, 1, 1, 3]. Somas de prefixos inclusivas: [1, 1 + 1, 2 + 1, 3 + 3] = [1, 2, 3, 6]. Agora cont[v] é quantas notas são ≤ v, isto é, onde **termina** a região da chave v na saída: as notas ≤ 2 ocupam os índices 0, 1 e 2, e a última delas fica em cont[2] − 1 = 2. É por isso que a versão do livro de Cormen et al. (CLRS) percorre a entrada de trás para frente: cada item de chave v ocupa a última vaga livre da sua região, e cont[v] diminui a cada uso.`,code:`notas = [3, 1, 3, 0, 2, 3]
cont = [0] * 4
for x in notas:
    cont[x] += 1
print(cont)
for v in range(1, 4):
    cont[v] += cont[v - 1]
print(cont)
print(cont[2] - 1)`,answer:`[1, 1, 1, 3]
[1, 2, 3, 6]
2`}},{type:`exercise`,exercise:{id:`e4-lin-3`,kind:`code`,lang:`python`,prompt:"Escreva `counting_sort(xs)` para uma lista de inteiros **que pode ter negativos**. Devolva uma lista nova, em ordem crescente, sem alterar xs, em Θ(n + k), com k = máximo − mínimo + 1. Não use `sorted` nem `.sort`, e não compare elementos entre si além do necessário para achar o menor e o maior: os testes contam as comparações.",difficulty:`intermediario`,skills:[`alg-ordenacao`,`prog-listas`],hints:[`Em qual posição de uma lista de contadores você guardaria a contagem do −3? O que o Python faz com um índice negativo?`,`Se o menor valor é m, que deslocamento transforma m no índice 0?`,`Quantas posições a lista de contadores precisa ter para ir do menor ao maior valor, incluindo os dois?`,`E se a lista estiver vazia? O que min([]) faz?`],explanation:`Deslocando cada valor pelo mínimo (índice = x − m), a faixa [m, M] vira [0, k − 1], com k = M − m + 1. Contar custa Θ(n); percorrer os k contadores e reescrever a saída custa Θ(n + k). Sem o deslocamento, cont[-3] não dá erro em Python: acessa a terceira posição a partir do fim e corrompe a contagem em silêncio. Com inteiros puros, reescrever a partir das contagens basta; com registros, como (nome, idade), é preciso a versão estável com somas de prefixos.`,starter:`def counting_sort(xs):
    # devolva uma lista nova com os valores de xs em ordem crescente,
    # contando quantas vezes cada valor aparece (xs pode ter negativos)
    return xs`,solution:`def counting_sort(xs):
    if not xs:
        return []
    menor, maior = min(xs), max(xs)
    cont = [0] * (maior - menor + 1)
    for x in xs:
        cont[x - menor] += 1
    saida = []
    for i, c in enumerate(cont):
        saida.extend([i + menor] * c)
    return saida`,tests:[{name:`exemplo com negativos`,code:`r = counting_sort([3, -1, 2, -1, 0])
assert r == [-1, -1, 0, 2, 3], f"esperava [-1, -1, 0, 2, 3]; veio {r}"`},{name:`bordas: vazia, um elemento, todos iguais, só negativos`,code:`r = counting_sort([])
assert r == [], f"lista vazia deve devolver []; veio {r}"
r = counting_sort([7])
assert r == [7], f"[7] deve devolver [7]; veio {r}"
r = counting_sort([4, 4, 4])
assert r == [4, 4, 4], f"[4, 4, 4] deve devolver [4, 4, 4]; veio {r}"
r = counting_sort([-3, -10, -7])
assert r == [-10, -7, -3], f"[-3, -10, -7] deve devolver [-10, -7, -3]; veio {r}"`},{name:`faixa que você não conhece de antemão`,code:`xs = [5000, -4000, 4999, -4000, 0, 123]
try:
    r = counting_sort(xs)
except IndexError:
    raise AssertionError(f"counting_sort({xs}) deu IndexError: o tamanho da lista de contadores precisa vir do menor e do maior valor da entrada, não de uma faixa fixa")
assert r == [-4000, -4000, 0, 123, 4999, 5000], f"para {xs} esperava [-4000, -4000, 0, 123, 4999, 5000]; veio {r}"`},{name:`devolve uma lista nova, sem alterar a recebida`,code:`xs = [3, -1, 2, -1, 0]
r = counting_sort(xs)
assert xs == [3, -1, 2, -1, 0], f"a lista recebida foi alterada: virou {xs}"
assert r is not xs, "devolva uma lista nova, não a própria lista recebida"`},{name:`aleatório`,code:`import random
for _ in range(100):
    xs = [random.randint(-30, 30) for _ in range(random.randint(0, 60))]
    r = counting_sort(xs[:])
    assert r == sorted(xs), f"para {xs} esperava {sorted(xs)}; veio {r}"`},{name:`sem sorted() nem .sort()`,code:`import ast
_achou = set()
for _no in ast.walk(ast.parse(_source)):
    if isinstance(_no, ast.Call):
        if isinstance(_no.func, ast.Name) and _no.func.id == "sorted":
            _achou.add("sorted()")
        if isinstance(_no.func, ast.Attribute) and _no.func.attr == "sort":
            _achou.add(".sort()")
assert not _achou, "implemente o algoritmo à mão, sem " + " nem ".join(sorted(_achou))`},{name:`não compara elementos entre si`,code:`class Contado(int):
    usadas = 0
    limite = None
    msg = ""

    @classmethod
    def prepara(cls, limite, msg):
        cls.usadas, cls.limite, cls.msg = 0, limite, msg

    def _conta(self):
        Contado.usadas += 1
        if Contado.limite is not None and Contado.usadas > Contado.limite:
            Contado.limite = None
            raise AssertionError(Contado.msg)

    def __lt__(self, o):
        self._conta()
        return int.__lt__(self, o)

    def __le__(self, o):
        self._conta()
        return int.__le__(self, o)

    def __gt__(self, o):
        self._conta()
        return int.__gt__(self, o)

    def __ge__(self, o):
        self._conta()
        return int.__ge__(self, o)
import random
n = 3000
valores = [random.randint(-100, 100) for _ in range(n)]
Contado.prepara(4 * n, "com 3 000 valores, a sua função passou de 12 000 comparações. O counting sort só compara para achar o menor e o maior; o resto é contar, usando o valor como índice.")
r = counting_sort([Contado(v) for v in valores])
Contado.limite = None
assert [int(v) for v in r] == sorted(valores), "com 3 000 valores entre -100 e 100, o resultado saiu errado"`},{name:`Θ(n + k): uma passada para contar`,code:`import random

class Igual(int):
    usadas = 0
    limite = None

    def _conta(self):
        Igual.usadas += 1
        if Igual.limite is not None and Igual.usadas > Igual.limite:
            Igual.limite = None
            raise AssertionError("com 3 000 valores entre -100 e 100, a sua função fez mais de 12 000 testes de igualdade (==). Ela parece percorrer a lista uma vez para cada valor possível, o que custa Θ(n · k), não Θ(n + k). Conte tudo numa passada só, usando o valor (deslocado) como índice.")

    def __eq__(self, o):
        self._conta()
        return int.__eq__(self, o)

    def __ne__(self, o):
        self._conta()
        return int.__ne__(self, o)

    __hash__ = int.__hash__

n = 3000
valores = [random.randint(-100, 100) for _ in range(n)]
Igual.usadas, Igual.limite = 0, 4 * n
r = counting_sort([Igual(v) for v in valores])
Igual.limite = None
assert [int(v) for v in r] == sorted(valores), "com 3 000 valores entre -100 e 100, o resultado saiu errado"`}]}},{type:`exercise`,exercise:{id:`e4-lin-4`,kind:`fix`,lang:`python`,prompt:"A função abaixo deveria ordenar pessoas por idade **de forma estável** (numa fila de vacinação, quem tem a mesma idade e chegou antes continua antes). Ela acerta a ordem das idades, mas os testes de estabilidade falham. Encontre e corrija o erro sem trocar de algoritmo: nada de `sorted` ou `.sort`.",difficulty:`intermediario`,skills:[`alg-ordenacao`,`py-debugging`],hints:[`Rode com [("Ana", 30), ("Caio", 30)]. Quem sai primeiro? Por quê?`,`Depois das somas de prefixos, cont[v] aponta para o começo ou para o fim da região da idade v na saída?`,`Se a região de cada idade é preenchida de trás para frente, em que ordem a entrada precisa ser percorrida para que quem chegou primeiro fique na frente?`],explanation:`Depois das somas de prefixos inclusivas, cont[v] é quantas pessoas têm idade ≤ v, ou seja, o fim da região da idade v. Diminuir e posicionar preenche cada região de trás para frente; percorrendo a entrada do começo para o fim, o primeiro de cada idade vai para o fim da sua região, e a ordem dos iguais sai invertida. Há duas correções equivalentes: percorrer a entrada de trás para frente (como no CLRS) ou transformar cont em posições iniciais (soma de prefixos exclusiva) e preencher cada região da esquerda para a direita, como no código da lição.`,starter:`def ordenar_por_idade(pessoas):
    """pessoas: lista de (nome, idade), com idades de 0 a 120.
    Devolve uma lista nova ordenada por idade; quem tem a mesma idade
    mantém a ordem em que aparecia (ordenação estável)."""
    cont = [0] * 121
    for nome, idade in pessoas:
        cont[idade] += 1
    for v in range(1, 121):
        cont[v] += cont[v - 1]          # cont[v] = quantas pessoas têm idade <= v
    saida = [None] * len(pessoas)
    for nome, idade in pessoas:
        cont[idade] -= 1
        saida[cont[idade]] = (nome, idade)
    return saida`,solution:`def ordenar_por_idade(pessoas):
    """pessoas: lista de (nome, idade), com idades de 0 a 120.
    Devolve uma lista nova ordenada por idade; quem tem a mesma idade
    mantém a ordem em que aparecia (ordenação estável)."""
    cont = [0] * 121
    for nome, idade in pessoas:
        cont[idade] += 1
    for v in range(1, 121):
        cont[v] += cont[v - 1]          # cont[v] = quantas pessoas têm idade <= v
    saida = [None] * len(pessoas)
    for nome, idade in reversed(pessoas):
        cont[idade] -= 1
        saida[cont[idade]] = (nome, idade)
    return saida`,tests:[{name:`ordena pela idade`,code:`r = ordenar_por_idade([("Ana", 30), ("Bia", 65), ("Caio", 18)])
assert [p[1] for p in r] == [18, 30, 65], f"as idades deveriam sair [18, 30, 65]; veio {r}"`},{name:`estável: mesma idade mantém a ordem de chegada`,code:`fila = [("Ana", 30), ("Bia", 65), ("Caio", 30), ("Duda", 65), ("Eva", 30)]
esperado = [("Ana", 30), ("Caio", 30), ("Eva", 30), ("Bia", 65), ("Duda", 65)]
r = ordenar_por_idade(fila)
assert r == esperado, f"com a mesma idade, quem veio antes deve continuar antes. Esperava {esperado}; veio {r}"`},{name:`bordas: vazia, uma pessoa, idades 0 e 120`,code:`assert ordenar_por_idade([]) == [], "lista vazia deve devolver []"
assert ordenar_por_idade([("Zé", 40)]) == [("Zé", 40)], "uma pessoa só deve sair igual"
r = ordenar_por_idade([("Avó", 120), ("Bebê", 0), ("Bisa", 120), ("Neném", 0)])
esperado = [("Bebê", 0), ("Neném", 0), ("Avó", 120), ("Bisa", 120)]
assert r == esperado, f"esperava {esperado}; veio {r}"`},{name:`aleatório, comparado com uma ordenação estável`,code:`import random
for _ in range(50):
    fila = [(f"p{i}", random.randint(0, 120)) for i in range(random.randint(0, 80))]
    antes = fila[:]
    r = ordenar_por_idade(fila)
    esperado = sorted(antes, key=lambda p: p[1])
    assert r == esperado, f"para {antes} esperava {esperado}; veio {r}"
    assert fila == antes, "a função não deve alterar a lista recebida"`},{name:`sem sorted() nem .sort()`,code:`import ast
_achou = set()
for _no in ast.walk(ast.parse(_source)):
    if isinstance(_no, ast.Call):
        if isinstance(_no.func, ast.Name) and _no.func.id == "sorted":
            _achou.add("sorted()")
        if isinstance(_no.func, ast.Attribute) and _no.func.attr == "sort":
            _achou.add(".sort()")
assert not _achou, "implemente o algoritmo à mão, sem " + " nem ".join(sorted(_achou))`},{name:`continua sendo counting sort: não compara idades`,code:`class Contado(int):
    usadas = 0
    limite = None
    msg = ""

    @classmethod
    def prepara(cls, limite, msg):
        cls.usadas, cls.limite, cls.msg = 0, limite, msg

    def _conta(self):
        Contado.usadas += 1
        if Contado.limite is not None and Contado.usadas > Contado.limite:
            Contado.limite = None
            raise AssertionError(Contado.msg)

    def __lt__(self, o):
        self._conta()
        return int.__lt__(self, o)

    def __le__(self, o):
        self._conta()
        return int.__le__(self, o)

    def __gt__(self, o):
        self._conta()
        return int.__gt__(self, o)

    def __ge__(self, o):
        self._conta()
        return int.__ge__(self, o)
import random
n = 400
fila = [(f"p{i}", random.randint(0, 120)) for i in range(n)]
Contado.prepara(n, "a sua versão comparou idades entre si (<, >, <=, >=) mais de 400 vezes numa fila de 400 pessoas. O exercício pede para consertar o counting sort, que usa a idade como índice, e não para trocá-lo por uma ordenação por comparação.")
r = ordenar_por_idade([(nome, Contado(idade)) for nome, idade in fila])
Contado.limite = None
assert [(nome, int(idade)) for nome, idade in r] == sorted(fila, key=lambda p: p[1]), "com 400 pessoas, a ordem saiu errada ou não é estável"`}]}},{type:`exercise`,exercise:{id:`e4-lin-5`,kind:`mcq`,prompt:`Um colega afirma ter criado uma ordenação **por comparação** que ordena qualquer lista de n números distintos com no máximo **2n** comparações. O que você responde?`,difficulty:`avancado`,skills:[`alg-ordenacao`,`alg-complexidade`],hints:[`Quantas ordens diferentes n números distintos podem ter?`,`Cada comparação tem duas respostas. Com c comparações, quantos caminhos diferentes o algoritmo pode seguir, no máximo?`,`Compare 4ⁿ com n! para n = 8, 9 e 10.`],explanation:`Com no máximo 2n comparações, a árvore de decisão tem altura 2n e, portanto, no máximo 2²ⁿ = 4ⁿ folhas. Ela precisa de uma folha para cada uma das n! ordens. Para n = 8, 4⁸ = 65 536 ≥ 8! = 40 320 e ainda não há contradição; para n = 9, 9! = 362 880 > 4⁹ = 262 144, e daí em diante n! cresce mais rápido (cada passo multiplica n! por n + 1 > 4 e 4ⁿ só por 4). A afirmação é falsa para todo n ≥ 9: em cada um desses tamanhos, existe alguma lista que exige mais de 2n comparações.`,options:[{text:`Impossível para n ≥ 9: 2n comparações distinguem no máximo 2²ⁿ = 4ⁿ casos, e 9! = 362 880 já passa de 4⁹ = 262 144.`,correct:!0,feedback:`Isso. A árvore de decisão precisa de n! folhas e uma de altura 2n tem no máximo 4ⁿ. Como n! cresce mais rápido que 4ⁿ, a afirmação quebra em n = 9 e só piora depois.`},{text:`Possível: o counting sort já faz isso em Θ(n + k).`,feedback:`O counting sort não compara elementos: usa o valor como índice. O limite da árvore de decisão vale para quem só obtém informação por comparações, e o colega disse que o algoritmo dele compara.`},{text:`Possível, se o algoritmo sortear os pivôs: o limite só vale para algoritmos determinísticos.`,feedback:`Sorteios não trazem informação sobre a ordem dos dados. Para cada resultado fixo dos sorteios, o algoritmo é uma árvore de decisão com pelo menos n! folhas, e até a média de comparações fica em pelo menos log₂(n!).`},{text:`Impossível, porque toda ordenação por comparação precisa de pelo menos n² comparações.`,feedback:`O merge sort faz cerca de n log₂ n comparações, bem menos que n². O limite inferior é log₂(n!) ≈ n log₂ n − 1,44n, não n².`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e4-lin-desafio`,kind:`code`,lang:`python`,prompt:'Escreva `radix_palavras(palavras)` que devolve uma lista nova com as palavras na **mesma ordem que `sorted()` daria**, usando radix sort LSD. As palavras têm só letras minúsculas de \'a\' a \'z\' e **tamanhos diferentes** (pode haver a palavra vazia e palavras repetidas). Exemplo: `radix_palavras(["banana", "ana", "bala", "a", "ab", "b"])` devolve `["a", "ab", "ana", "b", "bala", "banana"]`.\n\nFaça uma passada estável por posição, da última para a primeira. Não use `sorted` nem `.sort`, e não compare palavras entre si: os testes contam as comparações.',difficulty:`desafio`,skills:[`alg-ordenacao`,`prog-strings`],hints:[`Para o sorted(), por que "ab" vem antes de "abc"? O que significa, numa comparação, uma palavra acabar antes da outra?`,`Se você completasse as palavras curtas com um caractere imaginário, ele teria de vir antes ou depois do "a"?`,`Quantas passadas são necessárias, e a partir de qual posição? Pense na maior palavra.`,`Em cada passada, quantos baldes você precisa? Um para cada letra… e mais qual?`],explanation:`Completar as palavras curtas com um "caractere vazio" menor que todas as letras (o balde 0) faz o radix LSD reproduzir a ordem do dicionário: "ab" se comporta como "ab_" e fica antes de "abc". São L passadas, com L o tamanho da maior palavra, cada uma estável com 27 baldes: Θ(L · (n + 27)). Quando os tamanhos variam muito (uma palavra de 1 000 letras e o resto curtas), o LSD paga 1 000 passadas sobre todas as palavras; aí o radix MSD, que para cedo em baldes pequenos, ou o próprio sorted(), são melhores.`,starter:`def radix_palavras(palavras):
    # devolva uma lista nova na mesma ordem que sorted() daria, com radix sort LSD:
    # uma passada estável por posição, da última para a primeira
    return list(palavras)`,solution:`def radix_palavras(palavras):
    saida = list(palavras)
    maior = 0
    for p in saida:
        if len(p) > maior:
            maior = len(p)
    for pos in range(maior - 1, -1, -1):
        baldes = [[] for _ in range(27)]     # balde 0: a palavra já acabou
        for p in saida:
            b = ord(p[pos]) - ord("a") + 1 if pos < len(p) else 0
            baldes[b].append(p)
        saida = [p for balde in baldes for p in balde]
    return saida`,tests:[{name:`exemplo`,code:`r = radix_palavras(["banana", "ana", "bala", "a", "ab", "b"])
esperado = ["a", "ab", "ana", "b", "bala", "banana"]
assert r == esperado, f"esperava {esperado}; veio {r}"`},{name:`prefixos, repetidas e a palavra vazia`,code:`r = radix_palavras(["abc", "", "ab", "a", "", "abc", "b"])
esperado = ["", "", "a", "ab", "abc", "abc", "b"]
assert r == esperado, f"uma palavra que é prefixo de outra vem antes dela, e a vazia vem antes de todas. Esperava {esperado}; veio {r}"`},{name:`bordas: lista vazia e uma palavra`,code:`assert radix_palavras([]) == [], "lista vazia deve devolver []"
assert radix_palavras(["x"]) == ["x"], "uma palavra só deve sair igual"
assert radix_palavras([""]) == [""], "uma palavra vazia só deve sair igual"`},{name:`cidades`,code:`cidades = ["itu", "ita", "itabira", "itaquaquecetuba", "itajai", "ita", "jau", "jundiai", "ipatinga", "ibitinga"]
r = radix_palavras(cidades)
assert r == sorted(cidades), f"esperava {sorted(cidades)}; veio {r}"`},{name:`palavras longas com o mesmo começo`,code:`ps = ["constitucionalmente", "constituinte", "constitucional", "constituicao", "constitucionalidade", "constitui"]
r = radix_palavras(ps)
assert r == sorted(ps), f"estas palavras têm as mesmas 8 primeiras letras. Esperava {sorted(ps)}; veio {r}. O número de passadas depende da maior palavra da entrada?"`},{name:`aleatório`,code:`import random
for _ in range(100):
    ps = ["".join(random.choice("abc") for _ in range(random.randint(0, 6))) for _ in range(random.randint(0, 40))]
    antes = ps[:]
    r = radix_palavras(ps)
    assert r == sorted(antes), f"para {antes} esperava {sorted(antes)}; veio {r}"
    assert ps == antes, "a função não deve alterar a lista recebida"`},{name:`sem sorted() nem .sort()`,code:`import ast
_achou = set()
for _no in ast.walk(ast.parse(_source)):
    if isinstance(_no, ast.Call):
        if isinstance(_no.func, ast.Name) and _no.func.id == "sorted":
            _achou.add("sorted()")
        if isinstance(_no.func, ast.Attribute) and _no.func.attr == "sort":
            _achou.add(".sort()")
assert not _achou, "implemente o algoritmo à mão, sem " + " nem ".join(sorted(_achou))`},{name:`não compara palavras entre si`,code:`class Palavra(str):
    usadas = 0
    limite = None
    msg = ""

    @classmethod
    def prepara(cls, limite, msg):
        cls.usadas, cls.limite, cls.msg = 0, limite, msg

    def _conta(self):
        Palavra.usadas += 1
        if Palavra.limite is not None and Palavra.usadas > Palavra.limite:
            Palavra.limite = None
            raise AssertionError(Palavra.msg)

    def __lt__(self, o):
        self._conta()
        return str.__lt__(self, o)

    def __le__(self, o):
        self._conta()
        return str.__le__(self, o)

    def __gt__(self, o):
        self._conta()
        return str.__gt__(self, o)

    def __ge__(self, o):
        self._conta()
        return str.__ge__(self, o)
import random
n = 2000
ps = ["".join(random.choice("abcdefghij") for _ in range(random.randint(1, 8))) for _ in range(n)]
Palavra.prepara(n, "a sua função comparou palavras inteiras (<, >, <=, >=) mais de 2 000 vezes em 2 000 palavras. O radix sort distribui por letra, sem comparar palavras.")
r = radix_palavras([Palavra(p) for p in ps])
Palavra.limite = None
assert [str(p) for p in r] == sorted(ps), "com 2 000 palavras aleatórias, o resultado saiu errado"`}]}}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Toda ordenação por comparação é uma árvore de decisão com pelo menos n! folhas; altura h exige 2ʰ ≥ n!, logo h ≥ log₂(n!) ≈ n log₂ n − 1,44n. Vale também para a média e para algoritmos com sorteio.
- Counting sort: contar, somar prefixos, posicionar na ordem original. Θ(n + k), estável; só compensa com k = O(n).
- Radix sort LSD: uma passada estável por dígito, do menos para o mais significativo. Θ(d · (n + b)). Sem estabilidade, não funciona.
- Esses métodos não violam o limite: eles não comparam, usam a chave como índice.
- Na prática, em Python: \`sorted\` com \`key\`. Counting e radix brilham em linguagens compiladas, com chaves inteiras de faixa conhecida.`},{type:`callout`,tone:`english`,text:`- **comparison sort / decision tree**: ordenação por comparação / árvore de decisão
- **lower bound**: limite inferior
- **counting sort, radix sort, bucket sort**: os nomes costumam ficar em inglês
- **prefix sum (cumulative sum)**: soma de prefixos (soma acumulada)
- **least / most significant digit (LSD / MSD)**: dígito menos / mais significativo
- **stable pass**: passada estável

Frase típica de entrevista: *"Counting sort runs in O(n + k) time. It doesn't contradict the Ω(n log n) lower bound, because it never compares two elements: it uses the key as an array index."*

Em livros e documentação: *"Radix sort requires the intermediate sort on each digit to be stable; otherwise, the order established by the less significant digits would be lost."*`,title:`English corner`}]}],cards:[{id:`l4-ordenacao-linear#1`,front:`Por que toda ordenação por comparação faz pelo menos log₂(n!) comparações no pior caso?`,back:`A árvore de decisão precisa de uma folha para cada uma das n! ordens, e uma árvore binária de altura h tem no máximo 2ʰ folhas: 2ʰ ≥ n!.`},{id:`l4-ordenacao-linear#2`,front:`Por que é impossível ordenar 3 elementos com no máximo 2 comparações?`,back:`2 comparações distinguem no máximo 2² = 4 casos, e 3 elementos têm 3! = 6 ordens possíveis.`},{id:`l4-ordenacao-linear#3`,front:`Por que o counting sort não contradiz o limite Ω(n log n)?`,back:`Ele não compara elementos: usa a chave como índice, e cada acesso cont[x] escolhe entre k possibilidades de uma vez.`},{id:`l4-ordenacao-linear#4`,front:`Quanto custa o counting sort, e quando ele não compensa?`,back:`Θ(n + k), com k a faixa das chaves. Não compensa quando k é muito maior que n, como CPFs tratados como inteiros.`},{id:`l4-ordenacao-linear#5`,front:`Em que ordem o radix sort LSD processa os dígitos, e que propriedade cada passada precisa ter?`,back:`Do dígito menos significativo para o mais significativo; cada passada precisa ser estável.`},{id:`l4-ordenacao-linear#6`,front:`Quanto custa o radix sort LSD para n chaves de d dígitos na base b?`,back:`Θ(d · (n + b)).`},{id:`l4-ordenacao-linear#7`,front:`No counting sort com soma de prefixos inclusiva, por que a entrada é percorrida de trás para frente?`,back:`Porque cont[v] aponta para o fim da região da chave v; percorrendo de trás para frente, o último a chegar ocupa o fim da região e a ordem dos iguais é preservada.`}]};export{e as default};
//# sourceMappingURL=l4-ordenacao-linear-CEd1jbfv.js.map