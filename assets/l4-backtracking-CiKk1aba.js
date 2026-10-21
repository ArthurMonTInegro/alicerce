var e={id:`l4-backtracking`,moduleId:`m4-4`,title:`Backtracking: escolher, explorar, desfazer`,titleEn:`Backtracking: choose, explore, unchoose`,summary:`Montar a resposta uma decisão por vez numa árvore de decisões, voltar atrás quando não há saída e podar ramos sem futuro: subconjuntos, senhas, combinações, N rainhas e somas exatas.`,minutes:50,objectives:[`Modelar um problema de busca como árvore de decisões: o que se decide em cada nível e o que é uma folha`,`Escrever backtracking com o molde escolher, explorar, desfazer, registrando cópias das soluções`,`Estimar o tamanho de uma busca (2ⁿ, n!, 10ᵏ) e a profundidade da pilha que ela usa`,`Podar ramos que não podem levar a uma solução e evitar respostas repetidas quando há valores iguais`],skills:[`alg-recursao`],terms:[{pt:`busca com retrocesso`,en:`backtracking`,def:`Técnica que monta a solução uma escolha por vez e desfaz a última escolha quando ela não leva a nenhuma solução.`,example:`Backtracking abandons a partial candidate as soon as it determines that it cannot be completed to a valid solution.`},{pt:`árvore de decisões`,en:`decision tree / state-space tree`,def:`Árvore em que cada nível é uma decisão, cada nó é uma solução parcial e cada folha é uma candidata completa.`},{pt:`solução parcial`,en:`partial solution / partial candidate`,def:`As escolhas feitas até agora, ainda sem completar uma resposta.`},{pt:`busca em profundidade`,en:`depth-first search (DFS)`,def:`Explorar um ramo até o fim antes de passar ao vizinho; é a ordem em que a recursão percorre a árvore.`},{pt:`força bruta`,en:`brute force`,def:`Gerar todas as candidatas completas e só depois testar cada uma.`},{pt:`restrição`,en:`constraint`,def:`Regra que toda solução precisa obedecer, como "duas rainhas não podem se atacar".`},{pt:`poda`,en:`pruning`,def:`Abandonar uma solução parcial, e todo o ramo abaixo dela, assim que se sabe que ela não leva a nenhuma solução.`,example:`Pruning cuts off branches of the search tree that cannot contain a valid solution.`}],references:[`cs61a`,`composing-programs`,`aima`,`python-docs`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Alguns problemas não pedem um número, pedem **escolhas**. Quais vales-presente somam exatamente o valor da compra? Como encaixar as provas da semana nos horários sem que nenhum aluno tenha duas provas ao mesmo tempo? Como preencher um sudoku? Quais trios dá para formar com os 5 alunos de um grupo de estudos?

Em todos eles, a resposta é montada **uma decisão por vez**. A {{busca com retrocesso|backtracking}} faz exatamente isso: toma uma decisão, segue em frente com ela e, quando chega num beco sem saída (ou completa uma solução), **volta atrás** e tenta a próxima opção. É como andar num labirinto: em cada bifurcação você escolhe um corredor; se ele dá numa parede, você volta só até a última bifurcação, não até a entrada.

Por que isso importa? Para muitos desses problemas não se conhece algoritmo eficiente (o sudoku generalizado para tabuleiros n² × n² é NP-completo), e o backtracking com **poda** é a ferramenta prática. Ele também está por trás de geradores de combinações, resolvedores de quebra-cabeças e de uma família enorme de perguntas de entrevista. As permutações do desafio da primeira lição deste módulo já eram backtracking; agora você vai ver o molde inteiro, medir o tamanho da busca e aprender a cortá-la.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`### A árvore de decisões
Para listar os subconjuntos de [A, B, C], decida um item por vez: o nível 0 decide se A entra, o nível 1 decide B, o nível 2 decide C. Cada nó da {{árvore de decisões|decision tree}} é uma {{solução parcial|partial solution}} (as decisões tomadas até ali), e cada folha é um subconjunto completo:`},{type:`code`,lang:`text`,code:`[]                              nível 0: A entra?
├─ sim → [A]                    nível 1: B entra?
│   ├─ sim → [A, B]             nível 2: C entra?
│   │   ├─ sim → [A, B, C]      folha
│   │   └─ não → [A, B]         folha
│   └─ não → [A]
│       ├─ sim → [A, C]         folha
│       └─ não → [A]            folha
└─ não → []
    ├─ sim → [B]
    │   ├─ sim → [B, C]         folha
    │   └─ não → [B]            folha
    └─ não → []
        ├─ sim → [C]            folha
        └─ não → []             folha`,runnable:!1,caption:`Com 3 itens, 2³ = 8 folhas. Lida de cima para baixo, a árvore já está na ordem em que a recursão visita os nós.`},{type:`md`,text:`Percorrer essa árvore em {{busca em profundidade|depth-first search}}, descendo por um ramo até a folha antes de tentar o vizinho, é exatamente o que a recursão faz (é a mesma DFS dos grafos, no nível 3). Cada chamada é um nó, e a pilha de chamadas guarda o **caminho** da raiz até o nó atual. A árvore nunca é construída na memória: ela só é visitada.

### O molde: escolher, explorar, desfazer`},{type:`code`,lang:`text`,code:`bt(parcial):
    se parcial está completa:
        registre uma CÓPIA de parcial
        volte
    para cada opção válida neste nível:
        escolha a opção         (muda o estado compartilhado)
        bt(parcial)             (explora tudo o que vem depois dessa escolha)
        desfaça a opção         (devolve o estado como estava)`,runnable:!1,caption:`Pseudocódigo do backtracking.`},{type:`code`,lang:`python`,code:`def subconjuntos(xs):
    resultado = []
    atual = []                         # uma única lista, compartilhada por todas as chamadas

    def bt(i):
        if i == len(xs):               # todas as decisões tomadas: é uma folha
            resultado.append(atual[:]) # registra uma CÓPIA
            return
        atual.append(xs[i])            # escolhe: xs[i] entra
        bt(i + 1)                      # explora
        atual.pop()                    # desfaz
        bt(i + 1)                      # explora o ramo em que xs[i] não entra

    bt(0)
    return resultado

print(subconjuntos(["A", "B", "C"]))`,runnable:!0},{type:`md`,text:"### Por que desfazer, e por que copiar\nTodas as chamadas compartilham **uma única** lista `atual`. Quando `bt(i + 1)` termina, ela pode ter colocado e tirado vários itens, mas, como cada chamada desfaz o que fez, `atual` volta exatamente ao estado de antes. É isso que permite à chamada mãe tentar a próxima opção como se nada tivesse acontecido. A alternativa, criar uma lista nova a cada passo (`bt(i + 1, atual + [xs[i]])`), também funciona, mas copia O(n) elementos em cada nó."},{type:`callout`,tone:`warn`,text:"`resultado.append(atual)` guarda uma **referência** para a lista compartilhada, não uma foto dela. Como o backtracking esvazia `atual` ao voltar, no fim todas as entradas de `resultado` apontam para a mesma lista, vazia. Registre `atual[:]`, `list(atual)` ou `tuple(atual)`.",title:`Copie ao registrar`},{type:`md`,text:`### Quanto custa
O tempo é o número de nós visitados vezes o trabalho em cada nó. Sem poda, a árvore cresce exponencialmente com o número de decisões:`},{type:`table`,head:[`Problema`,`O que se decide em cada nível`,`Profundidade`,`Folhas`,`Listar tudo custa`],rows:[[`Subconjuntos de n itens`,`o item i entra ou não`,`n`,`2ⁿ`,`O(n · 2ⁿ)`],[`Permutações de n itens`,`qual item ainda livre vem agora`,`n`,`n!`,`O(n · n!)`],[`Senhas de k dígitos (0 a 9)`,`qual dígito vem agora`,`k`,`10ᵏ`,`O(k · 10ᵏ)`],[`8 rainhas, uma por linha`,`a coluna da rainha da linha atual`,`8`,`8⁸ = 16 777 216 sem poda`,`com poda: 2 057 nós no total`]],caption:`O fator n (ou k) na última coluna vem da cópia de cada solução registrada.`},{type:`md`,text:`Esses números explodem: 20 itens já têm mais de um milhão de subconjuntos, e 12 itens têm 479 milhões de permutações. Já a **profundidade** da pilha é só o número de decisões (n ou k), então o backtracking quase nunca estoura a pilha: o tempo acaba muito antes.

### Poda: cortar o que não tem futuro
A {{força bruta|brute force}} gera todas as candidatas completas e só então testa cada uma. O backtracking testa as {{restrições|constraints}} **no meio do caminho**: se a solução parcial já viola uma restrição, nenhuma folha abaixo dela serve, e o ramo inteiro é abandonado sem ser visitado. Isso é a {{poda|pruning}}. Exemplos:

- **N rainhas**: antes de pôr uma rainha, confira se a casa está atacada. Nas 8 rainhas, a força bruta testaria 16 777 216 tabuleiros; com a poda, a busca inteira visita 2 057 nós e acha as 92 soluções.
- **Soma exata com valores positivos**: se a soma parcial já passou do alvo, acrescentar valores só piora: corte. Com os valores ordenados, dá até para parar o laço no primeiro valor grande demais.
- **Combinações de k entre n**: se os itens que sobram não bastam para completar k, não adianta descer.`},{type:`callout`,tone:`warn`,text:`A poda só é válida quando é **segura**: ela não pode jogar fora nenhuma solução. "Soma parcial maior que o alvo" só é um beco sem saída se todos os valores forem positivos; com negativos, a soma ainda pode descer, e o corte perderia respostas certas.`,title:`Poda precisa ser segura`},{type:`callout`,tone:`deep`,text:`A poda raramente melhora a garantia de **pior caso**: o problema continua exponencial. Mas, na prática, ela muda o tempo em ordens de grandeza, e a qualidade das podas é o que separa um resolvedor de sudoku instantâneo de um que não termina.

Quando a busca passa várias vezes pelo **mesmo estado** (mesma posição i e mesma soma restante, por exemplo), dá para memoizar o resultado de cada estado, e o backtracking vira programação dinâmica: é o caminho do próximo módulo, com a mochila e o troco.`,title:`Backtracking, força bruta e programação dinâmica`}]},{stage:`exemplo`,blocks:[{type:`md`,text:"Coloque 4 rainhas num tabuleiro 4 × 4 sem que duas se ataquem (mesma linha, mesma coluna ou mesma diagonal). Como cada linha tem exatamente uma rainha, a decisão do nível i é **em que coluna fica a rainha da linha i**. A solução parcial é a lista das colunas escolhidas: `[0, 2]` quer dizer rainha na coluna 0 da linha 0 e na coluna 2 da linha 1. Siga a busca até a primeira solução:"},{type:`table`,head:[`Passo`,`Linha`,`Colunas tentadas`,`O que acontece`,`Rainhas`],rows:[[`1`,`0`,`0`,`livre: coloca`,`[0]`],[`2`,`1`,`0, 1, 2`,`0: mesma coluna; 1: diagonal; 2: livre`,`[0, 2]`],[`3`,`2`,`0, 1, 2, 3`,`todas atacadas: **volta**`,`[0]`],[`4`,`1`,`3`,`livre: coloca`,`[0, 3]`],[`5`,`2`,`0, 1`,`0: mesma coluna; 1: livre`,`[0, 3, 1]`],[`6`,`3`,`0, 1, 2, 3`,`todas atacadas: **volta**`,`[0, 3]`],[`7`,`2`,`2, 3`,`2: diagonal; 3: mesma coluna: **volta**`,`[0]`],[`8`,`1`,`(nenhuma sobrou)`,`a linha 1 já tentou tudo: **volta**`,`[]`],[`9`,`0`,`1`,`livre: coloca`,`[1]`],[`10`,`1`,`0, 1, 2, 3`,`0: diagonal; 1: mesma coluna; 2: diagonal; 3: livre`,`[1, 3]`],[`11`,`2`,`0`,`livre: coloca`,`[1, 3, 0]`],[`12`,`3`,`0, 1, 2`,`0 e 1: mesma coluna; 2: livre`,`[1, 3, 0, 2] **solução**`]],caption:`Cada "volta" é um retorno de chamada: a pilha perde um quadro e a linha de cima tenta a próxima coluna.`},{type:`md`,text:"Repare que nenhum tabuleiro completo inválido foi montado: a poda abandonou `[0, 2]` na linha 2 sem gastar nada com a linha 3. A busca completa das 4 rainhas visita 17 nós e acha as 2 soluções; a força bruta testaria 4⁴ = 256 tabuleiros.\n\nAgora veja o mecanismo de escolher e desfazer na pilha de chamadas, com os subconjuntos de [A, B]. Observe a lista `atual` crescer ao descer e encolher ao voltar, e os quadros de `bt` empilhando no máximo 3 de uma vez:"},{type:`trace`,code:`def subconjuntos(xs):
    resultado = []
    atual = []
    def bt(i):
        if i == len(xs):
            resultado.append(atual[:])
            return
        atual.append(xs[i])
        bt(i + 1)
        atual.pop()
        bt(i + 1)
    bt(0)
    return resultado

print(subconjuntos(["A", "B"]))`,caption:`Cada folha registra uma cópia; depois do append vem sempre o pop correspondente.`}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`def rainhas(n):
    colunas, diag1, diag2 = set(), set(), set()    # o que já está sob ataque
    nos = [0]                                      # quantos nós a busca visitou

    def bt(lin):                                   # devolve quantas soluções há abaixo deste nó
        nos[0] += 1
        if lin == n:
            return 1
        total = 0
        for c in range(n):
            if c in colunas or lin - c in diag1 or lin + c in diag2:
                continue                           # poda: casa atacada
            colunas.add(c)                         # escolhe
            diag1.add(lin - c)
            diag2.add(lin + c)
            total += bt(lin + 1)                   # explora
            colunas.remove(c)                      # desfaz
            diag1.remove(lin - c)
            diag2.remove(lin + c)
        return total

    return bt(0), nos[0]

print(" n  soluções    nós  força bruta (n^n)")
for n in range(4, 9):
    solucoes, nos = rainhas(n)
    print(f"{n:>2}  {solucoes:>8}  {nos:>5}  {n ** n:>17}")`,runnable:!0,caption:`Casas na mesma diagonal "descendo para a direita" têm o mesmo linha − coluna; na diagonal "descendo para a esquerda", o mesmo linha + coluna. Três conjuntos testam um ataque em O(1).`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e4-bt-1`,kind:`mcq`,prompt:`Você esqueceu a senha do cadeado da bicicleta: 3 rodinhas, cada uma com os dígitos de 0 a 9. Um programa de backtracking lista todas as senhas decidindo **um dígito por nível**. Quantas folhas tem a árvore de decisões, e quantas decisões ficam empilhadas na pilha de chamadas no máximo?`,difficulty:`facil`,skills:[`alg-recursao`],hints:[`Cada uma das 10 escolhas da primeira rodinha abre quantas escolhas para a segunda?`,`A pilha guarda a árvore inteira ou só o caminho da raiz até o nó atual?`],explanation:`São 10 opções em cada um dos 3 níveis, e as escolhas se multiplicam: 10 × 10 × 10 = 10³ = 1 000 folhas, uma por senha. A pilha guarda só o caminho até o nó atual, ou seja, uma decisão por nível: 3. Árvores largas e rasas como esta custam tempo (exponencial no número de rodinhas), não pilha.`,options:[{text:`30 folhas; 10 decisões empilhadas`,feedback:`As opções dos níveis não se somam, se multiplicam: cada escolha da primeira rodinha abre 10 da segunda, e assim por diante. E a profundidade conta decisões (rodinhas), não opções por rodinha.`},{text:`1 000 folhas; 3 decisões empilhadas`,correct:!0,feedback:`Isso: 10³ folhas, e a pilha só guarda o caminho da raiz até o nó atual, uma decisão por rodinha.`},{text:`1 000 folhas; 1 000 decisões empilhadas`,feedback:`O número de folhas está certo, mas a pilha não guarda a árvore inteira: quando uma chamada termina, o quadro dela sai antes de a próxima opção ser tentada. Só o caminho atual, de 3 decisões, fica empilhado.`},{text:`3¹⁰ folhas; 3 decisões empilhadas`,feedback:`Base e expoente trocados: são 10 opções em cada um dos 3 níveis, 10³. O número 3¹⁰ seria de 10 rodinhas com 3 opções cada.`}]}},{type:`exercise`,exercise:{id:`e4-bt-2`,kind:`predict`,lang:`python`,prompt:`Este backtracking deveria listar as 4 palavras de duas letras com "a" e "b". O que ele imprime de fato?`,difficulty:`intermediario`,skills:[`alg-recursao`],hints:["Quantas vezes `res.append` é executado?","O que `res.append(atual)` guarda: o conteúdo de `atual` naquele momento ou a própria lista?","Quando `bt(0)` termina, todo append já teve o seu pop. Como está `atual` nesse momento?"],explanation:'O append roda 4 vezes, uma por folha, mas guarda sempre a **mesma** lista `atual`, não uma cópia. Cada folha é visitada com `atual` certo (["a", "a"], ["a", "b"], ...), mas os pops seguintes continuam mexendo nela, e no fim ela está vazia. Como as 4 entradas de `res` são a mesma lista, o print mostra 4 listas vazias. A correção é `res.append(atual[:])`.',code:`res = []
atual = []

def bt(i):
    if i == 2:
        res.append(atual)
        return
    for x in "ab":
        atual.append(x)
        bt(i + 1)
        atual.pop()

bt(0)
print(res)`,answer:`[[], [], [], []]`}},{type:`exercise`,exercise:{id:`e4-bt-3`,kind:`parsons`,lang:`python`,prompt:'Ordene as linhas para que `senhas(digitos, k)` devolva todas as senhas de `k` dígitos formadas com os caracteres de `digitos`, em ordem: `senhas("01", 2)` deve devolver `["00", "01", "10", "11"]`. Como nos exemplos da lição, as listas `res` e `atual` são criadas logo no começo de `senhas`, antes da função interna.',difficulty:`intermediario`,skills:[`alg-recursao`],hints:[`Quando uma senha está completa? Esse teste vem antes ou depois de tentar as opções?`,`Dentro do laço, as três linhas seguem o molde: o que vem primeiro, o que vem no meio e o que vem por último?`,"A função interna precisa ser definida antes de ser chamada. O que sobra para o final de `senhas`?"],explanation:"O caso base vem primeiro: com `k` dígitos escolhidos, registra a senha (o `join` já cria uma string nova, então não há problema de referência) e volta. Senão, para cada dígito: escolhe (append), explora (bt) e desfaz (pop). Fora de `bt`, a função dispara a busca com `bt()` e devolve `res`. São 2ᵏ senhas com 2 dígitos, ou 10ᵏ com os dígitos de 0 a 9.",lines:[`def senhas(digitos, k):`,`    res, atual = [], []`,`    def bt():`,`        if len(atual) == k:`,`            res.append("".join(atual))`,`            return`,`        for d in digitos:`,`            atual.append(d)`,`            bt()`,`            atual.pop()`,`    bt()`,`    return res`]}},{type:`exercise`,exercise:{id:`e4-bt-4`,kind:`code`,lang:`python`,prompt:'Num grupo de estudos, o professor quer ver todas as formas de escolher `k` pessoas para apresentar o seminário. Escreva `combinacoes(xs, k)`, que devolve a lista de **todas** as combinações de `k` elementos de `xs`, cada uma como lista, na mesma ordem em que `itertools.combinations` as gera: as posições escolhidas sempre crescentes, e as combinações em ordem lexicográfica dessas posições. Exemplo: `combinacoes(["Ana", "Bia", "Caio"], 2)` devolve `[["Ana", "Bia"], ["Ana", "Caio"], ["Bia", "Caio"]]`.\n\nUse backtracking, sem `itertools`. Valores repetidos em `xs` são pessoas diferentes: `combinacoes([1, 1, 2], 2)` devolve `[[1, 1], [1, 2], [1, 2]]`. A função precisa responder na hora mesmo com 40 pessoas e `k = 38`.',difficulty:`intermediario`,skills:[`alg-recursao`],hints:[`Desenhe a árvore para xs = [A, B, C, D] e k = 2. O que se decide em cada nível?`,`Quando uma solução parcial está completa? O que você registra nesse momento: a lista ou uma cópia?`,`Para manter as posições crescentes, depois de escolher a posição j, de onde começam as opções do nível seguinte?`,`Com 40 pessoas e k = 38, quase todo ramo morre lá embaixo, sem completar k. Se você está na posição i, quantas pessoas ainda faltam escolher e quantas posições sobram? Elas bastam para completar k?`],explanation:'Cada nível decide a **próxima posição** escolhida, sempre depois da anterior: `for j in range(inicio, len(xs))`, escolhe xs[j], explora a partir de j + 1 e desfaz. Isso gera as combinações na ordem de `itertools.combinations`. Sem poda, a busca desce por inúmeros ramos que nunca completam k itens: com n = 40 e k = 38, a árvore teria perto de 2⁴⁰ nós, mais de um trilhão. A poda "faltam k − len(atual) itens e só sobram len(xs) − j posições" corta esses ramos (no laço, a última posição que vale tentar é `len(xs) − (k − len(atual))`), e a busca visita cerca de 11 mil nós para listar as C(40, 38) = 780 combinações. Testar a mesma condição no início de cada chamada, e voltar na hora, também é uma poda válida: custa uma chamada a mais por ramo cortado, mas não desce por ele.',starter:`def combinacoes(xs, k):
    # devolva todas as combinações de k elementos de xs (cada uma como lista),
    # na ordem de itertools.combinations, usando backtracking
    pass`,solution:`def combinacoes(xs, k):
    res, atual = [], []

    def bt(inicio):
        if len(atual) == k:
            res.append(atual[:])
            return
        faltam = k - len(atual)
        for j in range(inicio, len(xs) - faltam + 1):   # poda: sobram itens suficientes
            atual.append(xs[j])
            bt(j + 1)
            atual.pop()

    bt(0)
    return res`,tests:[{name:`exemplos`,code:`r = combinacoes(["Ana", "Bia", "Caio"], 2)
assert r == [["Ana", "Bia"], ["Ana", "Caio"], ["Bia", "Caio"]], f"veio {r}"
r = combinacoes([1, 2, 3, 4], 2)
assert r == [[1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4]], f"combinacoes([1, 2, 3, 4], 2) deu {r}"`},{name:`bordas`,code:`casos = [(([1, 2, 3], 0), [[]]), (([], 0), [[]]), (([], 1), []), (([1, 2], 3), []), (([1, 2, 3], 3), [[1, 2, 3]]), (([9], 1), [[9]])]
for (xs, k), esperado in casos:
    r = combinacoes(xs, k)
    assert r == esperado, f"combinacoes({xs}, {k}) deu {r}, esperado {esperado}"`},{name:`valores repetidos e negativos`,code:`r = combinacoes([1, 1, 2], 2)
assert r == [[1, 1], [1, 2], [1, 2]], f"valores repetidos são itens diferentes: esperado [[1, 1], [1, 2], [1, 2]], veio {r}"
r = combinacoes([-1, 0, -1], 2)
assert r == [[-1, 0], [-1, -1], [0, -1]], f"a ordem segue as posições, não os valores: veio {r}"`},{name:`igual ao itertools`,code:`import itertools, random
random.seed(8)
for _ in range(150):
    xs = [random.randint(-5, 5) for _ in range(random.randint(0, 8))]
    k = random.randint(0, len(xs) + 1)
    esperado = [list(c) for c in itertools.combinations(xs, k)]
    r = combinacoes(xs, k)
    assert r == esperado, f"combinacoes({xs}, {k}) deu {r}, esperado {esperado}"`},{name:`poda: 40 pessoas, k = 38`,code:`import sys

class _Estourou(Exception):
    pass

def _com_orcamento(limite, f, *args):
    """Devolve (coube no limite de chamadas?, resultado)."""
    cont = [0]
    def perfil(frame, evento, arg):
        if evento == "call" and frame.f_code.co_filename == "main.py":
            cont[0] += 1
            if cont[0] > limite:
                raise _Estourou()
    sys.setprofile(perfil)
    try:
        return True, f(*args)
    except _Estourou:
        return False, None
    finally:
        sys.setprofile(None)
coube, r = _com_orcamento(300_000, combinacoes, list(range(40)), 38)
assert coube, "com 40 pessoas e k = 38 a busca passou de 300 mil chamadas: ela está descendo por ramos que não conseguem mais completar k itens. Corte esses ramos antes de descer por eles."
assert isinstance(r, list) and len(r) == 780, f"são C(40, 38) = 780 combinações, vieram {len(r) if isinstance(r, list) else r}"
assert r[0] == list(range(38)) and r[-1] == list(range(2, 40)), "a primeira e a última combinação estão fora da ordem esperada"`},{name:`sem itertools`,code:`import io as _io, re as _re, tokenize as _tk

def _codigo(src):
    ignorar = {_tk.COMMENT, _tk.STRING}
    for nome in ("FSTRING_MIDDLE", "TSTRING_MIDDLE"):
        if hasattr(_tk, nome):
            ignorar.add(getattr(_tk, nome))
    try:
        return " ".join(t.string for t in _tk.generate_tokens(_io.StringIO(src).readline) if t.type not in ignorar)
    except (_tk.TokenError, SyntaxError):
        return src
assert not _re.search(r"\\bitertools\\b", _codigo(_source)), "implemente o backtracking você mesmo, sem itertools"`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e4-bt-desafio`,kind:`code`,lang:`python`,prompt:"No caixa da livraria, um cliente tem vários vales-presente (valores inteiros **positivos**, alguns repetidos) e quer saber **todas** as formas de pagar **exatamente** o valor da compra, usando cada vale no máximo uma vez. Escreva `combinacoes_soma(valores, alvo)`, que devolve a lista das combinações de valores cuja soma é `alvo`:\n\n- cada combinação em ordem crescente, e a lista toda em ordem crescente (lexicográfica);\n- **sem combinações repetidas**: vales de mesmo valor são indistinguíveis;\n- com `alvo = 0`, a resposta é `[[]]` (não usar vale nenhum); sem solução, `[]`;\n- sem alterar a lista `valores`.\n\nExemplo: `combinacoes_soma([10, 1, 2, 7, 6, 1, 5], 8)` devolve `[[1, 1, 6], [1, 2, 5], [1, 7], [2, 6]]`.\n\nA função precisa ser rápida com 40 vales diferentes ou com 30 vales iguais: gerar todas as combinações e filtrar (ou tirar repetidas com `set`) depois não serve.",difficulty:`desafio`,skills:[`alg-recursao`],hints:[`Ordene uma cópia dos valores primeiro. Que vantagem isso dá quando o próximo valor já é maior do que o que falta pagar?`,`Desenhe a árvore para [1, 1, 2] com alvo 3. De onde vêm as duas cópias de [1, 2]?`,`As duas cópias nascem no **mesmo nível**: o primeiro 1 e o segundo 1 são tentados como a mesma "próxima escolha". Como pular um valor igual ao anterior só nessa situação?`,`Se você pular **todo** valor igual ao anterior, o que acontece com [1, 1, 6]? Em que caso o segundo 1 precisa continuar disponível?`],explanation:"Com os valores ordenados, cada nível escolhe o próximo vale a partir de `inicio`. Duas podas resolvem o problema. (1) Soma: se `vs[j]` já é maior do que o que falta, todos os seguintes também são (estão ordenados e são positivos): `break`. (2) Repetidas: no mesmo nível, tentar o segundo 1 depois do primeiro geraria de novo tudo o que o primeiro gerou; por isso `if j > inicio and vs[j] == vs[j - 1]: continue`. A condição `j > inicio` é o detalhe: ela só pula iguais **entre irmãos**, e ainda deixa o segundo 1 ser escolhido logo **depois** do primeiro (descendo um nível), o que forma [1, 1, 6]. Com 30 vales de R$ 1 e alvo 12, só a poda pela soma ainda visitaria cerca de 194 milhões de nós (todo conjunto de até 12 posições), e gerar tudo para filtrar depois passaria de um bilhão; com as duas podas, são 13. A poda pela soma só é válida porque os valores são positivos.",starter:`def combinacoes_soma(valores, alvo):
    # todas as combinações (sem repetir) de valores que somam alvo;
    # cada uma em ordem crescente, e a lista também em ordem
    pass`,solution:`def combinacoes_soma(valores, alvo):
    vs = sorted(valores)
    res, atual = [], []

    def bt(inicio, resto):
        if resto == 0:
            res.append(atual[:])
            return
        for j in range(inicio, len(vs)):
            if j > inicio and vs[j] == vs[j - 1]:
                continue            # mesmo valor como mesma escolha: repetiria
            if vs[j] > resto:
                break               # ordenados e positivos: os próximos também passam
            atual.append(vs[j])
            bt(j + 1, resto - vs[j])
            atual.pop()

    bt(0, alvo)
    return res`,tests:[{name:`exemplo`,code:`r = combinacoes_soma([10, 1, 2, 7, 6, 1, 5], 8)
assert r == [[1, 1, 6], [1, 2, 5], [1, 7], [2, 6]], f"esperado [[1, 1, 6], [1, 2, 5], [1, 7], [2, 6]], veio {r}"`},{name:`bordas`,code:`casos = [(([], 0), [[]]), (([], 5), []), (([3], 3), [[3]]), (([3], 2), []), (([4, 5], 0), [[]]), (([5, 3], 1), [])]
for (valores, alvo), esperado in casos:
    r = combinacoes_soma(valores, alvo)
    assert r == esperado, f"combinacoes_soma({valores}, {alvo}) deu {r}, esperado {esperado}"`},{name:`valores repetidos`,code:`casos = [(([2, 2, 2, 2], 4), [[2, 2]]), (([1, 1, 1, 2, 2], 4), [[1, 1, 2], [2, 2]]), (([3, 1, 3, 5, 1, 1], 8), [[1, 1, 1, 5], [1, 1, 3, 3], [3, 5]])]
for (valores, alvo), esperado in casos:
    r = combinacoes_soma(valores, alvo)
    assert r == esperado, f"combinacoes_soma({valores}, {alvo}) deu {r}, esperado {esperado}"`},{name:`não altera os valores`,code:`valores = [5, 1, 3, 1]
combinacoes_soma(valores, 4)
assert valores == [5, 1, 3, 1], f"a lista recebida foi alterada: virou {valores}. Ordene uma cópia."`},{name:`comparação com força bruta`,code:`import itertools, random
random.seed(13)
for _ in range(150):
    valores = [random.randint(1, 6) for _ in range(random.randint(0, 9))]
    alvo = random.randint(0, 15)
    achadas = set()
    for r in range(len(valores) + 1):
        for c in itertools.combinations(valores, r):
            if sum(c) == alvo:
                achadas.add(tuple(sorted(c)))
    esperado = sorted(list(c) for c in achadas)
    r = combinacoes_soma(valores, alvo)
    assert r == esperado, f"combinacoes_soma({valores}, {alvo}) deu {r}, esperado {esperado}"`},{name:`poda pela soma: 40 vales diferentes`,code:`import sys

class _Estourou(Exception):
    pass

def _com_orcamento(limite, f, *args):
    """Devolve (coube no limite de chamadas?, resultado)."""
    cont = [0]
    def perfil(frame, evento, arg):
        if evento == "call" and frame.f_code.co_filename == "main.py":
            cont[0] += 1
            if cont[0] > limite:
                raise _Estourou()
    sys.setprofile(perfil)
    try:
        return True, f(*args)
    except _Estourou:
        return False, None
    finally:
        sys.setprofile(None)
coube, r = _com_orcamento(300_000, combinacoes_soma, list(range(1, 41)), 15)
assert coube, "com 40 vales (R$ 1 a R$ 40) e alvo 15, a busca passou de 300 mil chamadas: corte o ramo quando a soma já não cabe no alvo."
assert isinstance(r, list) and len(r) == 27 and [15] in r and [1, 2, 3, 4, 5] in r, f"esperadas 27 combinações, vieram {len(r) if isinstance(r, list) else r}"`},{name:`sem gerar repetidas: 30 vales iguais`,code:`import sys

class _Estourou(Exception):
    pass

def _com_orcamento(limite, f, *args):
    """Devolve (coube no limite de chamadas?, resultado)."""
    cont = [0]
    def perfil(frame, evento, arg):
        if evento == "call" and frame.f_code.co_filename == "main.py":
            cont[0] += 1
            if cont[0] > limite:
                raise _Estourou()
    sys.setprofile(perfil)
    try:
        return True, f(*args)
    except _Estourou:
        return False, None
    finally:
        sys.setprofile(None)
coube, r = _com_orcamento(300_000, combinacoes_soma, [1] * 30, 12)
assert coube, "com 30 vales de R$ 1 e alvo 12, a busca passou de 300 mil chamadas: ela gera a mesma combinação milhões de vezes. Evite repetir a mesma escolha no mesmo nível."
assert r == [[1] * 12], f"a única combinação é doze vales de R$ 1, veio {r[:3] if isinstance(r, list) else r}..."
coube, r = _com_orcamento(300_000, combinacoes_soma, [1] * 30 + [2] * 30, 20)
assert coube, "com 30 vales de R$ 1, 30 de R$ 2 e alvo 20, a busca passou de 300 mil chamadas: evite repetir a mesma escolha no mesmo nível."
assert isinstance(r, list) and len(r) == 11, f"esperadas 11 combinações, vieram {len(r) if isinstance(r, list) else r}"`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:"**Mini-projeto: resolvedor de sudoku.** Represente o tabuleiro 9 × 9 como lista de listas, com 0 nas casas vazias. A decisão de cada nível é que dígito vai na próxima casa vazia. Mantenha 27 conjuntos (9 linhas, 9 colunas e 9 quadrados 3 × 3) com os dígitos já usados, para testar uma casa em O(1); o quadrado da casa (i, j) é `(i // 3) * 3 + j // 3`. Escolha, coloque nos três conjuntos, explore, tire dos três conjuntos. Conte os nós visitados. **Extensão**: em vez da próxima casa vazia em ordem, escolha a casa com **menos** dígitos possíveis (a heurística MRV, *minimum remaining values*) e compare a contagem de nós num sudoku difícil."}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Backtracking = busca em profundidade na árvore de decisões: cada nível decide uma coisa, cada folha é uma candidata completa.
- Molde: **escolher, explorar, desfazer**, com um estado compartilhado; registre sempre uma **cópia** (\`atual[:]\`).
- A pilha guarda só o caminho atual: profundidade = número de decisões. O tempo é que explode: 2ⁿ, n!, 10ᵏ.
- **Poda**: abandone a solução parcial que já viola uma restrição; a força bruta só testa no fim. A poda precisa ser segura.
- Ordenar ajuda a podar (\`break\` quando o valor passa do que falta) e a evitar repetidas (pular iguais no mesmo nível).
- Estados que se repetem pedem memoização: aí começa a programação dinâmica.`},{type:`callout`,tone:`english`,text:`- **backtracking**: busca com retrocesso
- **choose, explore, unchoose**: escolher, explorar, desfazer
- **state-space tree / decision tree**: árvore de decisões
- **partial solution / candidate**: solução parcial / candidata
- **pruning**: poda
- **constraint**: restrição
- **brute force**: força bruta

Frase típica de entrevista: *"I'd use backtracking: build the combination one element at a time, prune as soon as the running sum exceeds the target, and skip equal values at the same depth so that no combination is generated twice."*`,title:`English corner`}]}],cards:[{id:`l4-backtracking#1`,front:`Quais são os três passos do molde de backtracking, e por que o terceiro é necessário?`,back:`Escolher, explorar, desfazer. Desfazer devolve o estado compartilhado ao que era antes, para a chamada mãe tentar a próxima opção.`},{id:`l4-backtracking#2`,front:"Por que se registra `atual[:]` e não `atual`?",back:`atual é uma lista compartilhada que o backtracking esvazia ao voltar; sem cópia, todas as respostas apontam para a mesma lista, vazia no fim.`},{id:`l4-backtracking#3`,front:`Quantas folhas tem a árvore dos subconjuntos de n itens? E a das permutações? Qual a profundidade da pilha nas duas?`,back:`2ⁿ e n! folhas; a profundidade é n, o número de decisões.`},{id:`l4-backtracking#4`,front:`O que é podar, e em que isso difere da força bruta?`,back:`Abandonar uma solução parcial que já viola uma restrição, junto com todo o ramo abaixo dela; a força bruta monta todas as candidatas completas e só então testa.`},{id:`l4-backtracking#5`,front:`Por que a poda "soma parcial maior que o alvo" exige valores positivos?`,back:`Com negativos, uma soma acima do alvo ainda pode descer; o corte jogaria fora respostas válidas.`},{id:`l4-backtracking#6`,front:`Com valores repetidos e ordenados, como evitar gerar a mesma combinação duas vezes?`,back:`No mesmo nível, pular um valor igual ao anterior (j > inicio e vs[j] == vs[j − 1]); descendo um nível, o valor repetido continua disponível.`},{id:`l4-backtracking#7`,front:`Como as N rainhas testam ataques em diagonal em O(1)?`,back:`Casas da mesma diagonal têm o mesmo linha − coluna (uma direção) ou o mesmo linha + coluna (a outra); guardam-se esses valores em conjuntos.`}]};export{e as default};
//# sourceMappingURL=l4-backtracking-CiKk1aba.js.map