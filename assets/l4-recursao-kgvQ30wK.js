var e={id:`l4-recursao`,moduleId:`m4-4`,title:`Recursão e dividir para conquistar`,titleEn:`Recursion and divide and conquer`,summary:`Funções que chamam a si mesmas: caso base, passo recursivo, pilha de chamadas e memoização.`,minutes:40,objectives:[`Escrever funções recursivas com caso base e passo recursivo`,`Visualizar a pilha de chamadas`,`Identificar recursão exponencial e corrigir com memoização`,`Aplicar dividir para conquistar`],skills:[`alg-recursao`],terms:[{pt:`recursão`,en:`recursion`,def:`Quando uma função chama a si mesma para resolver um problema menor.`},{pt:`caso base`,en:`base case`,def:`Situação resolvida diretamente, sem nova chamada.`},{pt:`passo recursivo`,en:`recursive step / recursive case`,def:`Reduz o problema e chama a função de novo.`},{pt:`estouro de pilha`,en:`stack overflow`,def:`Erro quando há chamadas aninhadas demais.`,example:`RecursionError: maximum recursion depth exceeded`},{pt:`memoização`,en:`memoization`,def:`Guardar resultados já calculados para não recalcular.`},{pt:`dividir para conquistar`,en:`divide and conquer`,def:`Dividir em subproblemas, resolver e combinar.`}],references:[`cs61a`,`composing-programs`,`sicp`,`clrs`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Uma função **recursiva** resolve um problema usando a **mesma função** para uma versão **menor** do problema. Toda recursão precisa de um **{{caso base|base case}}** (o problema tão pequeno que a resposta é direta) e de um **{{passo recursivo|recursive step}}** que se aproxima do caso base.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`**Exemplo**: \`fatorial(n) = n × fatorial(n − 1)\`, com \`fatorial(0) = 1\`.

**Como pensar** ("salto de fé recursivo", *recursive leap of faith*): **suponha** que a função já funciona para o problema menor e pergunte apenas: *como uso essa resposta para resolver o problema atual?*

Cada chamada empilha um **quadro** na pilha de chamadas. Sem caso base (ou se ele nunca é alcançado), a pilha cresce até \`RecursionError\` (o Python limita a ~1000 níveis por padrão).

**Dividir para conquistar**: divida em partes (merge sort divide ao meio), resolva cada parte recursivamente e **combine** (intercalar). Custo típico: O(n log n).`},{type:`callout`,tone:`warn`,text:"Recursão ingênua pode refazer o mesmo trabalho exponencialmente. `fib(n) = fib(n-1) + fib(n-2)` chama `fib(30)` mais de 1,6 milhão de vezes. Solução: **memoização** (`@functools.cache`) ou programação dinâmica.",title:`Cuidado com a explosão exponencial`}]},{stage:`exemplo`,blocks:[{type:`trace`,code:`def fatorial(n):
    if n == 0:
        return 1
    return n * fatorial(n - 1)

print(fatorial(4))`,caption:`Observe a pilha crescer até n == 0 e depois "desempilhar" multiplicando.`}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`from functools import cache
import time

def fib_lento(n):
    return n if n < 2 else fib_lento(n - 1) + fib_lento(n - 2)

@cache
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)

t0 = time.perf_counter(); fib_lento(25); t1 = time.perf_counter()
fib(25); t2 = time.perf_counter()
print(f"sem cache: {t1-t0:.3f}s  com cache: {t2-t1:.6f}s")
print(fib(200))`,runnable:!0}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e4-rec-1`,kind:`code`,lang:`python`,prompt:"Escreva `soma_digitos(n)` **recursiva** que devolve a soma dos dígitos de um inteiro n >= 0. `soma_digitos(1234) == 10`. Sem loops e sem converter para string.",difficulty:`facil`,skills:[`alg-recursao`],hints:[`Qual é o caso mais simples? Um número de um dígito.`,"`n % 10` é o último dígito; `n // 10` é o número sem ele."],explanation:`Caso base: n < 10 → n. Passo: último dígito + soma_digitos(resto). A cada chamada, n perde um dígito: aproxima-se do caso base.`,starter:`def soma_digitos(n):
    pass
`,solution:`def soma_digitos(n):
    if n < 10:
        return n
    return n % 10 + soma_digitos(n // 10)
`,tests:[{name:`1234 → 10`,code:`assert soma_digitos(1234) == 10`},{name:`0 → 0`,code:`assert soma_digitos(0) == 0`},{name:`99999 → 45`,code:`assert soma_digitos(99999) == 45`}]}},{type:`exercise`,exercise:{id:`e4-rec-2`,kind:`fix`,lang:`python`,prompt:'`potencia(b, e)` causa `RecursionError` para alguns valores e está lenta. Corrija o caso base e use "exponenciação rápida": b^e = (b^(e/2))² quando e é par.',difficulty:`intermediario`,skills:[`alg-recursao`],hints:[`Para e = 0 o que deveria acontecer? O caso base atual cobre e = 0?`,"Calcule `metade = potencia(b, e // 2)` **uma vez** e use metade * metade."],explanation:`Com caso base correto (e == 0 → 1) e reaproveitando o resultado da metade, o número de chamadas cai de O(e) para O(log e).`,starter:`def potencia(b, e):
    if e == 1:
        return b
    return b * potencia(b, e - 1)`,solution:`def potencia(b, e):
    if e == 0:
        return 1
    metade = potencia(b, e // 2)
    if e % 2 == 0:
        return metade * metade
    return metade * metade * b`,tests:[{name:`potencia(2, 10) == 1024`,code:`assert potencia(2, 10) == 1024`},{name:`expoente 0`,code:`assert potencia(5, 0) == 1`},{name:`expoente grande (precisa ser log)`,code:`assert potencia(3, 5000) == 3 ** 5000`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e4-rec-desafio`,kind:`code`,lang:`python`,prompt:"Escreva `permutacoes(xs)` que devolve a lista de **todas** as permutações de `xs` (lista de elementos distintos), em qualquer ordem, usando recursão. Não use `itertools`.",difficulty:`desafio`,skills:[`alg-recursao`],hints:[`Caso base: lista vazia tem exatamente uma permutação (a vazia).`,`Para cada elemento x: x na frente + cada permutação dos **demais**.`],explanation:`Escolher o primeiro e permutar o resto é *backtracking* em sua forma mais simples. São n! resultados: crescimento fatorial, inviável para n grande.`,starter:`def permutacoes(xs):
    pass
`,solution:`def permutacoes(xs):
    if not xs:
        return [[]]
    out = []
    for i, x in enumerate(xs):
        for p in permutacoes(xs[:i] + xs[i + 1:]):
            out.append([x] + p)
    return out`,tests:[{name:`3 elementos`,code:`assert sorted(permutacoes([1, 2, 3])) == [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]`},{name:`vazia`,code:`assert permutacoes([]) == [[]]`},{name:`quantidade = n!`,code:`assert len(permutacoes(list(range(6)))) == 720`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:"**Mini-projeto: Torre de Hanói**. Escreva `hanoi(n, origem, destino, aux)` que imprime os movimentos para mover n discos. Prove (ou verifique) que são 2ⁿ − 1 movimentos. Esse problema é o exemplo clássico de como a recursão torna simples algo que parece complicado."}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Recursão = caso base + passo recursivo que se aproxima dele.
- Cada chamada ocupa um quadro na pilha; profundidade demais → RecursionError.
- Recursões que repetem subproblemas: memoize.
- Dividir para conquistar: dividir, resolver, combinar.`}]}],cards:[{id:`l4-recursao#1`,front:`Quais os dois elementos de toda função recursiva?`,back:`Caso base e passo recursivo que se aproxima dele.`},{id:`l4-recursao#2`,front:`O que é memoização?`,back:`Guardar resultados de chamadas já feitas para não recalcular.`},{id:`l4-recursao#3`,front:`Por que fib recursiva ingênua é lenta?`,back:`Recalcula os mesmos subproblemas repetidamente: crescimento exponencial.`}]};export{e as default};
//# sourceMappingURL=l4-recursao-kgvQ30wK.js.map