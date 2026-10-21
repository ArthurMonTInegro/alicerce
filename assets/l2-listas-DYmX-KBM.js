var e={id:`l2-listas`,moduleId:`m2-2`,title:`Listas`,titleEn:`Lists`,summary:`Índices, fatias, métodos, iteração, mutabilidade e compreensões de lista.`,minutes:35,objectives:[`Criar, indexar e fatiar listas`,`Usar append, insert, pop, remove, sort`,`Entender mutabilidade e aliasing`,`Escrever list comprehensions`],skills:[`prog-listas`],terms:[{pt:`lista`,en:`list`,def:`Sequência ordenada e mutável de valores.`},{pt:`índice`,en:`index`,def:`Posição de um elemento, começando em 0.`,example:`IndexError: list index out of range`},{pt:`fatia`,en:`slice`,def:`Pedaço de uma sequência: lista[1:3].`},{pt:`mutável`,en:`mutable`,def:`Que pode ser alterado depois de criado.`},{pt:`apelido (aliasing)`,en:`aliasing`,def:`Dois nomes apontando para o mesmo objeto.`},{pt:`compreensão de lista`,en:`list comprehension`,def:`Forma compacta de criar listas: [x*2 for x in xs].`}],references:[`python-tutorial`,`cs61a`,`python-tutor`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:"Uma **{{lista|list}}** guarda vários valores **em ordem**: `notas = [7, 8.5, 10]`. Você acessa cada um pelo **{{índice|index}}**, que começa em **0**. Listas são **{{mutáveis|mutable}}**: dá para mudar, adicionar e remover elementos."}]},{stage:`explicacao`,blocks:[{type:`md`,text:"- `xs[0]` é o primeiro; `xs[-1]` é o último; `len(xs)` é o tamanho.\n- **Fatias**: `xs[1:3]` (do índice 1 até antes do 3), `xs[:2]`, `xs[2:]`, `xs[::-1]` (invertida).\n- **Métodos**: `append(x)` adiciona no fim; `insert(i, x)`; `pop()` remove e devolve o último; `remove(x)` remove a primeira ocorrência; `sort()` ordena no lugar; `x in xs` testa pertencimento.\n- **Compreensão**: `[n * n for n in range(5) if n % 2 == 0]` → `[0, 4, 16]`."},{type:`callout`,tone:`warn`,text:"**Aliasing**: `b = a` **não copia** a lista — os dois nomes apontam para a mesma. Para copiar, use `b = a.copy()` ou `b = a[:]`.",title:`A armadilha mais comum com listas`}]},{stage:`exemplo`,blocks:[{type:`trace`,code:`a = [1, 2, 3]
b = a
b.append(4)
c = a.copy()
c.append(5)
print(a, b, c)`,caption:`Repare que a e b são o mesmo objeto; c é uma cópia.`}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`frutas = ["maçã", "banana", "uva"]
frutas.append("manga")
frutas.sort()
print(frutas, len(frutas))
print(frutas[0], frutas[-1], frutas[1:3])

quadrados = [n ** 2 for n in range(1, 6)]
print(quadrados)

for i, fruta in enumerate(frutas):   # índice e valor juntos
    print(i, fruta)`,runnable:!0}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e2-list-1`,kind:`predict`,lang:`python`,prompt:`O que é impresso?`,difficulty:`facil`,skills:[`prog-listas`],hints:[`xs[1:4] vai do índice 1 até **antes** do 4.`,`Índices: 0→10, 1→20, 2→30, 3→40, 4→50.`],explanation:`xs[1:4] = [20, 30, 40] e xs[-2] = 40.`,code:`xs = [10, 20, 30, 40, 50]
print(xs[1:4], xs[-2])`,answer:`[20, 30, 40] 40`}},{type:`exercise`,exercise:{id:`e2-list-2`,kind:`code`,lang:`python`,prompt:"Escreva `remover_duplicados(xs)` que devolve uma **nova** lista sem elementos repetidos, **mantendo a ordem** da primeira aparição.",difficulty:`intermediario`,skills:[`prog-listas`],hints:[`Percorra a lista e só adicione ao resultado o que ainda não está nele.`,"`if x not in resultado:` funciona. (No Nível 3 você vai ver por que um `set` deixaria isso bem mais rápido.)"],explanation:"`list(set(xs))` remove duplicados mas **não** preserva a ordem. Percorrer e checar mantém a ordem. Versão eficiente: usar um set auxiliar para lembrar o que já viu.",starter:`def remover_duplicados(xs):
    pass
`,solution:`def remover_duplicados(xs):
    vistos = set()
    out = []
    for x in xs:
        if x not in vistos:
            vistos.add(x)
            out.append(x)
    return out`,tests:[{name:`mantém a ordem`,code:`assert remover_duplicados([3, 1, 3, 2, 1]) == [3, 1, 2]`},{name:`lista vazia`,code:`assert remover_duplicados([]) == []`},{name:`não altera a original`,code:`xs = [1, 1]
remover_duplicados(xs)
assert xs == [1, 1]`}]}},{type:`exercise`,exercise:{id:`e2-list-3`,kind:`fix`,lang:`python`,prompt:"`dobrar(xs)` deveria devolver uma nova lista com os valores dobrados **sem modificar** a original, mas está alterando a lista recebida. Corrija.",difficulty:`intermediario`,skills:[`prog-listas`],hints:["`resultado = xs` copia a lista ou só cria outro nome para ela?","Crie uma lista nova — com `.copy()` ou, melhor, com uma list comprehension."],explanation:"`resultado = xs` é aliasing. `[x * 2 for x in xs]` cria uma lista nova e deixa a original intacta — funções sem efeitos colaterais são mais fáceis de testar.",starter:`def dobrar(xs):
    resultado = xs
    for i in range(len(resultado)):
        resultado[i] = resultado[i] * 2
    return resultado`,solution:`def dobrar(xs):
    return [x * 2 for x in xs]
`,tests:[{name:`dobra`,code:`assert dobrar([1, 2]) == [2, 4]`},{name:`não altera a original`,code:`xs = [1, 2]
dobrar(xs)
assert xs == [1, 2], f"a original virou {xs}"`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e2-list-desafio`,kind:`code`,lang:`python`,prompt:"Escreva `rotacionar(xs, k)` que devolve a lista rotacionada `k` posições para a direita: `rotacionar([1,2,3,4,5], 2) == [4,5,1,2,3]`. Funcione para k maior que o tamanho e para lista vazia.",difficulty:`desafio`,skills:[`prog-listas`],hints:[`Rotacionar por len(xs) devolve a mesma lista. O que isso sugere sobre k grande?`,"Use `k % len(xs)` e fatias: os últimos k elementos + os primeiros."],explanation:"`k %= len(xs)`; `xs[-k:] + xs[:-k]`. Cuidado: com k == 0, `xs[-0:]` é a lista inteira — trate esse caso.",starter:`def rotacionar(xs, k):
    pass
`,solution:`def rotacionar(xs, k):
    if not xs:
        return []
    k %= len(xs)
    if k == 0:
        return xs[:]
    return xs[-k:] + xs[:-k]`,tests:[{name:`k=2`,code:`assert rotacionar([1, 2, 3, 4, 5], 2) == [4, 5, 1, 2, 3]`},{name:`k maior que o tamanho`,code:`assert rotacionar([1, 2, 3], 4) == [3, 1, 2]`},{name:`k=0 e vazia`,code:`assert rotacionar([1, 2], 0) == [1, 2] and rotacionar([], 3) == []`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:"**Lista de tarefas (parte 1)**: guarde as tarefas em uma lista de strings. Implemente adicionar, listar com números (`enumerate`) e remover pelo número."},{type:`project`,projectId:`p2-todo`}]},{stage:`revisao`,blocks:[{type:`md`,text:"- Índices começam em 0; -1 é o último.\n- Fatias excluem o fim.\n- `b = a` não copia; use `a.copy()`.\n- Compreensões: `[expr for x in xs if cond]`."}]}],cards:[{id:`l2-listas#1`,front:"O que `xs[::-1]` faz?",back:`Devolve uma cópia invertida da lista.`},{id:`l2-listas#2`,front:`Como copiar uma lista?`,back:`xs.copy(), xs[:] ou list(xs).`},{id:`l2-listas#3`,front:`Qual erro aparece ao acessar um índice que não existe?`,back:`IndexError: list index out of range.`}]};export{e as default};
//# sourceMappingURL=l2-listas-DYmX-KBM.js.map