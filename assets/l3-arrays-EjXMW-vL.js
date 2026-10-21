var e={id:`l3-arrays`,moduleId:`m3-1`,title:`Arrays e listas dinâmicas`,titleEn:`Arrays and dynamic arrays`,summary:`Memória contígua, acesso por índice em O(1), custo de inserir no meio e a mágica da lista que cresce.`,minutes:30,objectives:[`Explicar por que o acesso por índice é O(1)`,`Estimar o custo de inserir/remover no início, meio e fim`,`Entender o crescimento amortizado de listas dinâmicas`],skills:[`ed-arrays`],terms:[{pt:`arranjo / vetor`,en:`array`,def:`Sequência de elementos em posições de memória contíguas.`},{pt:`contíguo`,en:`contiguous`,def:`Lado a lado, sem buracos, na memória.`},{pt:`estrutura de dados`,en:`data structure`,def:`Forma de organizar dados para que certas operações sejam eficientes.`},{pt:`custo amortizado`,en:`amortized cost`,def:`Custo médio por operação ao longo de muitas operações.`},{pt:`capacidade`,en:`capacity`,def:`Espaço reservado; pode ser maior que o tamanho usado.`}],references:[`clrs`,`mit-6006`,`python-time-complexity`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Uma **{{estrutura de dados|data structure}}** é uma forma de organizar dados para tornar certas operações rápidas. A mais fundamental é o **{{array|array}}**: elementos guardados **lado a lado** na memória. A lista do Python é um *array dinâmico*.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:"Se o array começa no endereço `base` e cada elemento ocupa `t` bytes, o elemento `i` está em `base + i × t`. Uma conta — não importa o tamanho do array. Por isso **acesso por índice é O(1)** (tempo constante).\n\nMas **inserir no início** exige empurrar todos os elementos uma posição para frente: custo proporcional a *n*, ou **O(n)**."},{type:`table`,head:[`Operação na list do Python`,`Custo`,`Por quê`],rows:[[`xs[i], xs[i] = v`,`O(1)`,`cálculo de endereço`],[`xs.append(v)`,`O(1) amortizado`,`normalmente há espaço sobrando`],[`xs.pop()`,`O(1)`,`remove do fim, nada se move`],[`xs.insert(0, v), xs.pop(0)`,`O(n)`,`todos os elementos se deslocam`],[`v in xs`,`O(n)`,`pode precisar olhar todos`]]},{type:`callout`,tone:`deep`,text:`Quando a lista enche, o Python aloca um array **maior** (cerca de 1,125× + constante no CPython) e copia tudo. Copiar custa O(n), mas acontece raramente: somando todas as cópias ao longo de *n* appends, o custo total é O(n), ou seja, **O(1) amortizado** por append. Com crescimento por um fator constante, é sempre assim.`,title:`Como a lista cresce`}]},{stage:`exemplo`,blocks:[{type:`code`,lang:`python`,code:`import sys
xs = []
ultimo = sys.getsizeof(xs)
for i in range(40):
    xs.append(i)
    tam = sys.getsizeof(xs)
    if tam != ultimo:
        print(f"len={len(xs):>2} -> {tam} bytes (realocou)")
        ultimo = tam`,runnable:!0,caption:`Veja a capacidade crescer em saltos, não a cada append.`}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`import time

def medir(f, n):
    t0 = time.perf_counter(); f(n); return time.perf_counter() - t0

def no_fim(n):
    xs = []
    for i in range(n): xs.append(i)

def no_inicio(n):
    xs = []
    for i in range(n): xs.insert(0, i)

for n in [2000, 4000, 8000]:
    print(n, f"fim: {medir(no_fim, n):.4f}s  início: {medir(no_inicio, n):.4f}s")`,runnable:!0,caption:`Dobrar n quase dobra o tempo de "fim" (linear no total) e quase quadruplica o de "início" (quadrático no total).`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e3-arr-1`,kind:`mcq`,prompt:"Por que `xs[500000]` é tão rápido quanto `xs[0]` em uma lista com um milhão de elementos?",difficulty:`facil`,skills:[`ed-arrays`],hints:[`Como se calcula o endereço do elemento i?`],explanation:`Com memória contígua, o endereço é base + i × tamanho: uma conta, independente de i e de n.`,options:[{text:`Porque o Python percorre a lista muito rápido`,feedback:`Não há percurso: é cálculo direto do endereço.`},{text:`Porque o endereço é calculado diretamente: base + i × tamanho`,correct:!0,feedback:`Isso: acesso O(1).`},{text:`Porque a lista está ordenada`,feedback:`Ordenação não importa para acesso por índice.`},{text:`Porque fica em cache`,feedback:`O cache ajuda, mas o motivo fundamental é o cálculo de endereço.`}]}},{type:`exercise`,exercise:{id:`e3-arr-2`,kind:`code`,lang:`python`,prompt:"Escreva `inverter_no_lugar(xs)` que inverte a lista **sem criar outra lista** (sem `[::-1]`, `reversed` ou `reverse`). Use dois índices que se aproximam.",difficulty:`intermediario`,skills:[`ed-arrays`],hints:[`Troque o primeiro com o último, o segundo com o penúltimo...`,"Use `i = 0`, `j = len(xs) - 1` e troque enquanto `i < j`."],explanation:`A técnica de **dois ponteiros** (*two pointers*) inverte em O(n) com O(1) de memória extra. Ela aparece em muitos problemas de entrevista.`,starter:`def inverter_no_lugar(xs):
    pass
`,solution:`def inverter_no_lugar(xs):
    i, j = 0, len(xs) - 1
    while i < j:
        xs[i], xs[j] = xs[j], xs[i]
        i += 1
        j -= 1`,tests:[{name:`ímpar`,code:`xs = [1, 2, 3, 4, 5]
inverter_no_lugar(xs)
assert xs == [5, 4, 3, 2, 1]`},{name:`par e vazia`,code:`xs = [1, 2]
inverter_no_lugar(xs)
ys = []
inverter_no_lugar(ys)
assert xs == [2, 1] and ys == []`},{name:`é no lugar (mesmo objeto)`,code:`xs = [1, 2, 3]
ident = id(xs)
inverter_no_lugar(xs)
assert id(xs) == ident and xs == [3, 2, 1]`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e3-arr-desafio`,kind:`code`,lang:`python`,prompt:"Escreva `soma_alvo_ordenada(xs, alvo)` que recebe uma lista **ordenada** e devolve uma tupla `(i, j)` com `i < j` e `xs[i] + xs[j] == alvo`, ou `None`. Exija O(n): sem dois loops aninhados.",difficulty:`desafio`,skills:[`ed-arrays`,`alg-complexidade`],hints:[`Comece com um índice em cada ponta.`,`Se a soma for pequena demais, qual índice você move? E se for grande demais?`],explanation:`Dois ponteiros: soma < alvo → avance i (aumenta a soma); soma > alvo → recue j. Cada passo descarta uma possibilidade; total O(n).`,starter:`def soma_alvo_ordenada(xs, alvo):
    pass
`,solution:`def soma_alvo_ordenada(xs, alvo):
    i, j = 0, len(xs) - 1
    while i < j:
        s = xs[i] + xs[j]
        if s == alvo:
            return (i, j)
        if s < alvo:
            i += 1
        else:
            j -= 1
    return None`,tests:[{name:`encontra`,code:`assert soma_alvo_ordenada([1, 3, 4, 6, 9], 10) in [(0, 4), (2, 3)]`},{name:`não encontra`,code:`assert soma_alvo_ordenada([1, 2, 3], 10) is None`},{name:`grande (precisa ser linear)`,code:`xs = list(range(200000))
assert soma_alvo_ordenada(xs, 399997) == (199998, 199999)`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:"**Experimento**: implemente uma lista dinâmica (`class ListaDinamica`) com capacidade inicial 1 que **dobra** quando enche. Conte quantas cópias de elementos acontecem em 1 000 appends. Compare com uma versão que aumenta a capacidade em +1. (Você vai precisar de classes — se ainda não viu, volte depois do Nível 5.)"}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Array: memória contígua → acesso O(1).
- Inserir/remover no início: O(n).
- append: O(1) amortizado por crescimento geométrico.
- Dois ponteiros: técnica O(n) para arrays.`}]}],cards:[{id:`l3-arrays#1`,front:`Por que inserir no início de uma lista é O(n)?`,back:`Porque todos os elementos precisam se deslocar uma posição.`},{id:`l3-arrays#2`,front:`O que significa append ser O(1) amortizado?`,back:`Às vezes custa O(n) (realocação), mas a média ao longo de muitas operações é constante.`}]};export{e as default};
//# sourceMappingURL=l3-arrays-EjXMW-vL.js.map