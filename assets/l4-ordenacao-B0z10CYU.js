var e={id:`l4-ordenacao`,moduleId:`m4-3`,title:`Algoritmos de ordenação`,titleEn:`Sorting algorithms`,summary:`Bubble, insertion, merge e quick sort: como funcionam, quanto custam e quando usar cada um.`,minutes:40,objectives:[`Implementar insertion sort e merge sort`,`Comparar complexidades e estabilidade`,`Entender o limite Ω(n log n) para ordenação por comparação`,`Usar sorted() com key`],skills:[`alg-ordenacao`],terms:[{pt:`ordenação`,en:`sorting`,def:`Colocar elementos em ordem.`},{pt:`estável`,en:`stable`,def:`Mantém a ordem relativa de elementos iguais.`},{pt:`no lugar`,en:`in-place`,def:`Usa memória extra constante (ou quase).`},{pt:`pivô`,en:`pivot`,def:`Elemento usado pelo quicksort para dividir a lista.`},{pt:`intercalar`,en:`merge`,def:`Juntar duas listas ordenadas em uma ordenada.`}],references:[`clrs`,`sedgewick-algs`,`mit-6006`,`python-sorting-howto`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Ordenar é uma das operações mais comuns da computação — e estudar ordenação ensina as grandes ideias de algoritmos: **incremental** (insertion), **dividir e conquistar** (merge, quick), análise de **pior caso × caso médio** e **estabilidade**.`}]},{stage:`explicacao`,blocks:[{type:`table`,head:[`Algoritmo`,`Ideia`,`Tempo (médio / pior)`,`Espaço`,`Estável?`],rows:[[`Bubble sort`,`troca vizinhos fora de ordem, várias passadas`,`O(n²) / O(n²)`,`O(1)`,`sim`],[`Insertion sort`,`insere cada item na parte já ordenada`,`O(n²) / O(n²) — mas O(n) se quase ordenada`,`O(1)`,`sim`],[`Merge sort`,`divide ao meio, ordena cada metade, intercala`,`O(n log n) / O(n log n)`,`O(n)`,`sim`],[`Quick sort`,`escolhe pivô, separa menores e maiores, recursão`,`O(n log n) / O(n²)`,`O(log n)`,`não (em geral)`],[`Timsort (sorted do Python)`,`híbrido de merge + insertion, aproveita trechos já ordenados`,`O(n log n) / O(n log n)`,`O(n)`,`sim`]]},{type:`callout`,tone:`deep`,text:`Qualquer algoritmo que ordena **apenas comparando** elementos precisa de Ω(n log n) comparações no pior caso: existem n! ordens possíveis, e cada comparação no máximo divide as possibilidades ao meio, então são necessárias log₂(n!) ≈ n log₂ n comparações. Algoritmos como counting sort e radix sort escapam desse limite porque não comparam — usam a estrutura das chaves.`,title:`Por que n log n é o limite?`},{type:`callout`,tone:`tip`,text:'Na prática, use `sorted(xs)` ou `xs.sort()`, com `key=` para critérios: `sorted(alunos, key=lambda a: (-a["nota"], a["nome"]))` ordena por nota decrescente e, em empate, por nome. Implementar ordenações serve para **entender**, não para substituir a biblioteca.'}]},{stage:`exemplo`,blocks:[{type:`viz`,viz:`sorting`,caption:`Escolha o algoritmo, embaralhe e acompanhe comparações e trocas. Compare o número de operações.`}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`def merge_sort(xs):
    if len(xs) <= 1:
        return xs
    meio = len(xs) // 2
    esq, dir = merge_sort(xs[:meio]), merge_sort(xs[meio:])
    out, i, j = [], 0, 0
    while i < len(esq) and j < len(dir):
        if esq[i] <= dir[j]:          # <= mantém a estabilidade
            out.append(esq[i]); i += 1
        else:
            out.append(dir[j]); j += 1
    return out + esq[i:] + dir[j:]

print(merge_sort([38, 27, 43, 3, 9, 82, 10]))`,runnable:!0}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e4-sort-0`,kind:`predict`,lang:`python`,prompt:`O que este código imprime?`,code:`nums = [3, 1, 2]
ordenada = sorted(nums)
print(nums)
print(ordenada)`,answer:`[3, 1, 2]
[1, 2, 3]`,difficulty:`facil`,skills:[`alg-ordenacao`],hints:[`sorted() devolve uma lista nova; .sort() altera a lista e devolve None.`],explanation:`sorted(nums) cria uma nova lista ordenada e não mexe em nums. Por isso a primeira linha mostra a ordem original e a segunda a ordenada.`}},{type:`exercise`,exercise:{id:`e4-sort-1`,kind:`code`,lang:`python`,prompt:"Implemente `insertion_sort(xs)` que ordena a lista **no lugar** (e também a devolve). Não use sort/sorted.",difficulty:`intermediario`,skills:[`alg-ordenacao`],hints:[`Para cada i a partir de 1, a parte xs[0:i] já está ordenada.`,`Guarde x = xs[i] e desloque para a direita os elementos maiores que x; depois coloque x no buraco.`],explanation:`Insertion sort é O(n²) no pior caso, mas muito rápido em listas pequenas ou quase ordenadas — por isso o Timsort o usa em trechos curtos.`,starter:`def insertion_sort(xs):
    return xs
`,solution:`def insertion_sort(xs):
    for i in range(1, len(xs)):
        x = xs[i]
        j = i - 1
        while j >= 0 and xs[j] > x:
            xs[j + 1] = xs[j]
            j -= 1
        xs[j + 1] = x
    return xs`,tests:[{name:`ordena`,code:`assert insertion_sort([5, 2, 9, 1, 5, 6]) == [1, 2, 5, 5, 6, 9]`},{name:`no lugar`,code:`xs = [3, 1, 2]
insertion_sort(xs)
assert xs == [1, 2, 3]`},{name:`bordas`,code:`assert insertion_sort([]) == [] and insertion_sort([1]) == [1]`},{name:`aleatório`,code:`import random
xs = [random.randint(-50, 50) for _ in range(200)]
assert insertion_sort(xs[:]) == sorted(xs)`}]}},{type:`exercise`,exercise:{id:`e4-sort-2`,kind:`mcq`,prompt:`Você ordena uma planilha por **cidade** e depois, de forma **estável**, por **estado**. Como fica a ordem das cidades dentro de cada estado?`,difficulty:`avancado`,skills:[`alg-ordenacao`],hints:[`Estável = elementos com a mesma chave mantêm a ordem que tinham antes.`],explanation:`A segunda ordenação (estável) agrupa por estado preservando a ordem anterior entre itens do mesmo estado — que era alfabética por cidade. É assim que se ordena por múltiplas chaves.`,options:[{text:`Aleatória`,feedback:`Seria possível com uma ordenação instável.`},{text:`Alfabética por cidade`,correct:!0,feedback:`Isso: a estabilidade preserva a ordenação anterior.`},{text:`Inversa`,feedback:`Nada inverte a ordem.`},{text:`Na ordem original da planilha`,feedback:`A ordem "original" já tinha sido trocada pela ordenação por cidade.`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e4-sort-desafio`,kind:`code`,lang:`python`,prompt:'Escreva `contar_inversoes(xs)`: o número de pares (i, j) com i < j e xs[i] > xs[j]. Mede "quão desordenada" está a lista. Exija O(n log n): adapte o merge sort.',difficulty:`desafio`,skills:[`alg-ordenacao`,`alg-recursao`],hints:[`Inversões = inversões da metade esquerda + da direita + as "cruzadas".`,`No merge, quando você pega um elemento da direita antes de elementos restantes da esquerda, ele forma inversão com **todos** os que restam na esquerda.`],explanation:`Ao intercalar, se dir[j] < esq[i], então dir[j] é menor que esq[i:], somando len(esq) - i inversões de uma vez. Dividir e conquistar transforma O(n²) em O(n log n).`,starter:`def contar_inversoes(xs):
    c = 0
    for i in range(len(xs)):
        for j in range(i + 1, len(xs)):
            if xs[i] > xs[j]:
                c += 1
    return c
`,solution:`def contar_inversoes(xs):
    def ordena(v):
        if len(v) <= 1:
            return v, 0
        m = len(v) // 2
        a, ca = ordena(v[:m])
        b, cb = ordena(v[m:])
        out, i, j, c = [], 0, 0, ca + cb
        while i < len(a) and j < len(b):
            if a[i] <= b[j]:
                out.append(a[i]); i += 1
            else:
                out.append(b[j]); j += 1
                c += len(a) - i
        return out + a[i:] + b[j:], c
    return ordena(list(xs))[1]`,tests:[{name:`exemplo`,code:`assert contar_inversoes([2, 4, 1, 3, 5]) == 3`},{name:`ordenada e invertida`,code:`assert contar_inversoes([1, 2, 3]) == 0 and contar_inversoes([3, 2, 1]) == 3`},{name:`precisa ser O(n log n)`,code:`import time
xs = list(range(30000, 0, -1))
t0 = time.perf_counter()
r = contar_inversoes(xs)
assert r == 30000 * 29999 // 2 and time.perf_counter() - t0 < 2.5, "muito lento"`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:"**Benchmark**: implemente bubble, insertion e merge sort, e compare com `sorted()` para n = 1 000, 10 000 e 100 000 (pule os O(n²) quando ficarem lentos demais). Teste também com listas **quase ordenadas**. Escreva 3 conclusões."}]},{stage:`revisao`,blocks:[{type:`md`,text:`- O(n²): bubble, insertion (ótimo para quase ordenadas).
- O(n log n): merge (estável, O(n) memória), quick (rápido na média, O(n²) no pior).
- Limite Ω(n log n) para ordenação por comparação.
- Na prática: sorted/sort com key.`}]}],cards:[{id:`l4-ordenacao#1`,front:`O que é uma ordenação estável?`,back:`Uma que mantém a ordem relativa dos elementos com chaves iguais.`},{id:`l4-ordenacao#2`,front:`Pior caso do quicksort e quando acontece?`,back:`O(n²), quando o pivô é sempre o menor ou o maior (ex.: pivô fixo em lista já ordenada).`},{id:`l4-ordenacao#3`,front:`Por que merge sort é O(n log n)?`,back:`São log n níveis de divisão, e cada nível intercala n elementos no total.`}]};export{e as default};
//# sourceMappingURL=l4-ordenacao-B0z10CYU.js.map