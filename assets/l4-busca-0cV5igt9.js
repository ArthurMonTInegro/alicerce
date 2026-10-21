var e={id:`l4-busca`,moduleId:`m4-2`,title:`Busca linear e busca binária`,titleEn:`Linear and binary search`,summary:`Por que dados ordenados permitem buscar em O(log n), e os detalhes que fazem a busca binária dar errado.`,minutes:30,objectives:[`Implementar busca linear e binária`,`Entender a invariante da busca binária`,`Evitar os bugs clássicos (limites, loop infinito)`,`Usar o módulo bisect`],skills:[`alg-busca`],terms:[{pt:`busca linear`,en:`linear search`,def:`Olhar elemento por elemento.`},{pt:`busca binária`,en:`binary search`,def:`Em dados ordenados, comparar com o meio e descartar metade.`},{pt:`invariante`,en:`invariant`,def:`Propriedade que permanece verdadeira a cada passo do algoritmo.`},{pt:`ponto médio`,en:`midpoint`,def:`O índice do meio do intervalo atual.`}],references:[`clrs`,`bentley-pearls`,`python-docs`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Para achar um nome numa lista bagunçada, você precisa olhar um por um: **busca linear**, O(n). Num dicionário (ordenado!), você abre no meio e descarta metade: **busca binária**, O(log n). Para 1 bilhão de itens: ~1 bilhão de passos contra ~30.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:"**Busca binária** (lista ordenada `xs`, procurando `alvo`):\n\n1. Mantenha o intervalo `[lo, hi]` onde o alvo **pode** estar (essa é a **invariante**).\n2. `meio = (lo + hi) // 2`.\n3. Se `xs[meio] == alvo`, achou. Se for menor, o alvo só pode estar à direita: `lo = meio + 1`. Se maior: `hi = meio - 1`.\n4. Se `lo > hi`, o intervalo ficou vazio: não está lá."},{type:`callout`,tone:`warn`,text:"Busca binária é famosa por ser fácil de explicar e difícil de acertar. Jon Bentley relatou que a maioria dos programadores profissionais errou ao implementá-la. Os bugs típicos: usar `lo = meio` (loop infinito), errar `<` × `<=`, ou esquecer que a lista precisa estar **ordenada**."}]},{stage:`exemplo`,blocks:[{type:`viz`,viz:`binary-search`,caption:`Veja o intervalo [lo, hi] encolher pela metade a cada comparação.`}]},{stage:`codigo`,blocks:[{type:`trace`,code:`def busca_binaria(xs, alvo):
    lo, hi = 0, len(xs) - 1
    while lo <= hi:
        meio = (lo + hi) // 2
        if xs[meio] == alvo:
            return meio
        if xs[meio] < alvo:
            lo = meio + 1
        else:
            hi = meio - 1
    return -1

print(busca_binaria([2, 5, 8, 12, 16, 23, 38], 23))`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e4-busca-1`,kind:`mcq`,prompt:`No máximo quantas comparações a busca binária faz em uma lista ordenada de **1 000** elementos?`,difficulty:`facil`,skills:[`alg-busca`],hints:[`Quantas vezes você divide 1000 por 2 até sobrar 1? 2¹⁰ = 1024.`],explanation:`⌈log₂ 1001⌉ = 10 comparações no pior caso.`,options:[{text:`~10`,correct:!0,feedback:`Isso: 2¹⁰ = 1024 ≥ 1000.`},{text:`~100`,feedback:`Bem menos: cada passo divide por 2.`},{text:`500`,feedback:`Isso seria metade de uma busca linear.`},{text:`1000`,feedback:`Esse é o pior caso da busca linear.`}]}},{type:`exercise`,exercise:{id:`e4-busca-2`,kind:`fix`,lang:`python`,prompt:`Esta busca binária **trava** em alguns casos (loop infinito) e erra outros. Corrija mantendo O(log n).`,difficulty:`intermediario`,skills:[`alg-busca`],hints:[`Simule com xs = [1, 3] e alvo = 3. O que acontece com lo?`,`Se xs[meio] < alvo, o meio já foi descartado: lo deve ir para **meio + 1**.`,"E a condição do while deve permitir intervalos de 1 elemento: `lo <= hi`."],explanation:"Com `lo = meio`, quando lo e hi são vizinhos, meio == lo e nada muda: loop infinito. E `while lo < hi` nunca testa o último elemento restante.",starter:`def busca(xs, alvo):
    lo, hi = 0, len(xs) - 1
    while lo < hi:
        meio = (lo + hi) // 2
        if xs[meio] == alvo:
            return meio
        if xs[meio] < alvo:
            lo = meio
        else:
            hi = meio - 1
    return -1`,solution:`def busca(xs, alvo):
    lo, hi = 0, len(xs) - 1
    while lo <= hi:
        meio = (lo + hi) // 2
        if xs[meio] == alvo:
            return meio
        if xs[meio] < alvo:
            lo = meio + 1
        else:
            hi = meio - 1
    return -1`,tests:[{name:`encontra o último`,code:`assert busca([1, 3], 3) == 1`},{name:`lista de 1 elemento`,code:`assert busca([7], 7) == 0`},{name:`não encontra`,code:`assert busca([1, 3, 5], 4) == -1 and busca([], 1) == -1`},{name:`todos os elementos`,code:`xs = list(range(0, 200, 3))
assert all(busca(xs, x) == i for i, x in enumerate(xs))`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e4-busca-desafio`,kind:`code`,lang:`python`,prompt:"Escreva `primeira_ocorrencia(xs, alvo)` que devolve o índice da **primeira** ocorrência do alvo numa lista ordenada **com repetições**, em O(log n), ou -1. Não use `bisect`.",difficulty:`desafio`,skills:[`alg-busca`],hints:[`Ao achar o alvo, não pare: ele pode aparecer antes.`,`Guarde o índice encontrado e continue buscando à **esquerda** (hi = meio - 1).`],explanation:"Variante clássica: ao encontrar, registre e continue na metade esquerda. A mesma técnica dá a última ocorrência (continue à direita) — e é o que `bisect_left` faz.",starter:`def primeira_ocorrencia(xs, alvo):
    return xs.index(alvo) if alvo in xs else -1
`,solution:`def primeira_ocorrencia(xs, alvo):
    lo, hi, resp = 0, len(xs) - 1, -1
    while lo <= hi:
        meio = (lo + hi) // 2
        if xs[meio] == alvo:
            resp = meio
            hi = meio - 1
        elif xs[meio] < alvo:
            lo = meio + 1
        else:
            hi = meio - 1
    return resp`,tests:[{name:`repetições`,code:`assert primeira_ocorrencia([1, 2, 2, 2, 3], 2) == 1`},{name:`ausente`,code:`assert primeira_ocorrencia([1, 3], 2) == -1`},{name:`precisa ser O(log n)`,code:`import time
xs = [5] * 3_000_000
t0 = time.perf_counter()
for _ in range(300):
    r = primeira_ocorrencia(xs, 6)
assert r == -1 and time.perf_counter() - t0 < 0.5, "muito lento: não percorra a lista"`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:`**Jogo: adivinhe o número**. O computador escolhe um número de 1 a 1000 e responde "maior" ou "menor". Depois inverta: **você** escolhe e o programa adivinha usando busca binária. Ele sempre acerta em até 10 tentativas — por quê?`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Linear: O(n), funciona sem ordem.
- Binária: O(log n), exige ordenação.
- Invariante: o alvo, se existir, está em [lo, hi].
- lo = meio + 1, hi = meio - 1, while lo <= hi.`}]}],cards:[{id:`l4-busca#1`,front:`Qual a pré-condição da busca binária?`,back:`A sequência precisa estar ordenada.`},{id:`l4-busca#2`,front:`Qual a invariante da busca binária?`,back:`Se o alvo existe, ele está no intervalo [lo, hi].`}]};export{e as default};
//# sourceMappingURL=l4-busca-0cV5igt9.js.map