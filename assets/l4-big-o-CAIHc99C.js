var e={id:`l4-big-o`,moduleId:`m4-1`,title:`Complexidade e notação Big O`,titleEn:`Complexity and Big O notation`,summary:`Como medir a eficiência de um algoritmo independentemente do computador.`,minutes:35,objectives:[`Explicar o que Big O mede (crescimento, não tempo absoluto)`,`Classificar código em O(1), O(log n), O(n), O(n log n), O(n²), O(2ⁿ)`,`Analisar loops aninhados e chamadas de função`,`Diferenciar complexidade de tempo e de espaço`],skills:[`alg-complexidade`],terms:[{pt:`complexidade de tempo`,en:`time complexity`,def:`Como o número de operações cresce com o tamanho da entrada.`},{pt:`complexidade de espaço`,en:`space complexity`,def:`Como a memória extra usada cresce com a entrada.`},{pt:`notação O grande`,en:`Big O notation`,def:`Limite superior do crescimento, ignorando constantes.`},{pt:`pior caso`,en:`worst case`,def:`A entrada que faz o algoritmo trabalhar mais.`},{pt:`logarítmico`,en:`logarithmic`,def:`Cresce muito devagar: dobrar n soma um passo.`},{pt:`quadrático`,en:`quadratic`,def:`Dobrar n quadruplica o trabalho.`}],references:[`clrs`,`mit-6006`,`stanford-cs161`,`mit-6042`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Big O descreve **como o trabalho cresce** quando a entrada cresce. Não diz "leva 2 segundos" (isso depende do computador), e sim "se a entrada dobrar, o trabalho dobra" (O(n)) ou "quadruplica" (O(n²)). É a linguagem comum para comparar algoritmos.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:"**Regras práticas**:\n\n1. **Ignore constantes**: 3n + 5 é O(n). Interessa o crescimento para n grande.\n2. **Fique com o termo dominante**: n² + n é O(n²).\n3. **Sequência soma, aninhamento multiplica**: dois loops seguidos sobre n → O(n); um loop dentro do outro → O(n²).\n4. **Divide pela metade a cada passo** → O(log n) (busca binária).\n5. **Cuidado com operações escondidas**: `x in lista`, `lista.insert(0, x)`, `s1 + s2` em loop, `sorted()` (O(n log n))."},{type:`table`,head:[`Classe`,`Nome`,`Exemplo`,`n = 1 000 000`],rows:[[`O(1)`,`constante`,`acesso por índice, dict[k]`,`1`],[`O(log n)`,`logarítmica`,`busca binária`,`~20`],[`O(n)`,`linear`,`percorrer uma lista`,`1 000 000`],[`O(n log n)`,`linearítmica`,`merge sort, sorted()`,`~20 000 000`],[`O(n²)`,`quadrática`,`dois loops aninhados`,`10¹²  (horas!)`],[`O(2ⁿ)`,`exponencial`,`todos os subconjuntos`,`impraticável`]],caption:`Número aproximado de passos. Um computador comum faz da ordem de 10⁸–10⁹ operações simples por segundo.`},{type:`callout`,tone:`deep`,text:`Formalmente, f(n) = O(g(n)) se existem constantes c > 0 e n₀ tais que f(n) ≤ c·g(n) para todo n ≥ n₀. Também existem Ω (limite inferior) e Θ (limite justo). Em conversas e entrevistas, "Big O" costuma ser usado no sentido de Θ do pior caso.`,title:`Definição formal`}]},{stage:`exemplo`,blocks:[{type:`viz`,viz:`big-o`,caption:`Arraste o tamanho da entrada e compare as curvas de crescimento.`}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`def tem_duplicado_lento(xs):     # O(n²)
    for i in range(len(xs)):
        for j in range(i + 1, len(xs)):
            if xs[i] == xs[j]:
                return True
    return False

def tem_duplicado_rapido(xs):    # O(n) tempo, O(n) espaço
    return len(set(xs)) != len(xs)

import time
for n in [1000, 2000, 4000]:
    xs = list(range(n))
    t0 = time.perf_counter(); tem_duplicado_lento(xs); t1 = time.perf_counter()
    tem_duplicado_rapido(xs); t2 = time.perf_counter()
    print(f"n={n}: lento {t1-t0:.3f}s | rápido {t2-t1:.5f}s")`,runnable:!0,caption:`Observe: dobrar n multiplica por ~4 o tempo do lento.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e4-bigo-1`,kind:`mcq`,prompt:`Qual a complexidade deste código?`,code:{lang:`python`,code:`def f(xs):
    total = 0
    for x in xs:
        total += x
    for x in xs:
        total -= 1
    return total`},difficulty:`facil`,skills:[`alg-complexidade`],hints:[`Os loops estão aninhados ou em sequência?`],explanation:`Dois loops em sequência: n + n = 2n → O(n). Constantes são ignoradas.`,options:[{text:`O(1)`,feedback:`O trabalho depende do tamanho de xs.`},{text:`O(n)`,correct:!0,feedback:`Isso: 2n é O(n).`},{text:`O(n²)`,feedback:`Seria O(n²) se um loop estivesse dentro do outro.`},{text:`O(2n)`,feedback:`Correto em espírito, mas Big O ignora constantes: escreve-se O(n).`}]}},{type:`exercise`,exercise:{id:`e4-bigo-2`,kind:`mcq`,prompt:`Qual a complexidade deste código?`,code:{lang:`python`,code:`def g(n):
    passos = 0
    while n > 1:
        n = n // 2
        passos += 1
    return passos`},difficulty:`intermediario`,skills:[`alg-complexidade`],hints:[`Quantas vezes você divide 1024 por 2 até chegar a 1?`],explanation:`n cai pela metade a cada volta: log₂ n voltas → O(log n).`,options:[{text:`O(n)`,feedback:`n não diminui de 1 em 1, e sim pela metade.`},{text:`O(log n)`,correct:!0,feedback:`Isso: 1024 → 10 passos.`},{text:`O(n/2)`,feedback:`Não: são divisões sucessivas, não metade dos passos.`},{text:`O(1)`,feedback:`O número de passos cresce com n (bem devagar).`}]}},{type:`exercise`,exercise:{id:`e4-bigo-3`,kind:`mcq`,prompt:`Este código parece O(n). Qual é a complexidade real?`,code:{lang:`python`,code:`def unicos(xs):
    out = []
    for x in xs:
        if x not in out:
            out.append(x)
    return out`},difficulty:`avancado`,skills:[`alg-complexidade`],hints:["Quanto custa `x not in out` quando out é uma lista?"],explanation:"`in` em lista é O(n) e está dentro de um loop de n: O(n²). Com um set auxiliar, vira O(n).",options:[{text:`O(n)`,feedback:"Há um loop escondido no `in`."},{text:`O(n²)`,correct:!0,feedback:`Isso: operações escondidas contam.`},{text:`O(log n)`,feedback:`Nada é dividido pela metade.`},{text:`O(n log n)`,feedback:`Não há ordenação nem divisão.`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e4-bigo-desafio`,kind:`code`,lang:`python`,prompt:"Escreva `maior_subarray(xs)` que devolve a **maior soma** de um trecho contíguo e não vazio da lista (pode haver negativos). A versão ingênua testa todos os trechos (O(n²) ou O(n³)). Exija O(n). (Algoritmo de Kadane.)",difficulty:`desafio`,skills:[`alg-complexidade`,`alg-pd`],hints:[`Percorra uma vez guardando "a melhor soma de um trecho que **termina aqui**".`,"Em cada x: ou o trecho começa de novo em x, ou estende o anterior: `atual = max(x, atual + x)`.",`Guarde também o melhor visto até agora.`],explanation:`Kadane decide localmente se vale continuar o trecho. Cada elemento é visto uma vez: O(n) tempo e O(1) espaço — um exemplo de programação dinâmica com memória mínima.`,starter:`def maior_subarray(xs):
    melhor = xs[0]
    for i in range(len(xs)):
        for j in range(i, len(xs)):
            melhor = max(melhor, sum(xs[i:j + 1]))
    return melhor
`,solution:`def maior_subarray(xs):
    atual = melhor = xs[0]
    for x in xs[1:]:
        atual = max(x, atual + x)
        melhor = max(melhor, atual)
    return melhor`,tests:[{name:`exemplo clássico`,code:`assert maior_subarray([-2, 1, -3, 4, -1, 2, 1, -5, 4]) == 6`},{name:`todos negativos`,code:`assert maior_subarray([-3, -1, -2]) == -1`},{name:`precisa ser O(n)`,code:`import time
xs = [(-1) ** i * (i % 7) for i in range(200000)]
t0 = time.perf_counter()
maior_subarray(xs)
assert time.perf_counter() - t0 < 1.5, "muito lento: busque uma solução de uma passada"`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:`**Laboratório de desempenho**: escolha dois exercícios que você já resolveu e meça o tempo com n = 1 000, 10 000 e 100 000. Faça um gráfico (pode ser à mão) e confira se o crescimento bate com a sua análise Big O.`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Big O mede crescimento, não tempo absoluto.
- Ignore constantes e termos menores.
- Sequência soma; aninhamento multiplica; dividir pela metade → log n.
- Atenção a operações escondidas (\`in\` em lista, insert(0), concatenação).`}]}],cards:[{id:`l4-big-o#1`,front:`Qual a complexidade de dois loops aninhados sobre n?`,back:`O(n²).`},{id:`l4-big-o#2`,front:`O que significa O(log n)?`,back:`O trabalho cresce com o logaritmo: dobrar a entrada acrescenta um passo.`},{id:`l4-big-o#3`,front:`Por que Big O ignora constantes?`,back:`Porque descreve o crescimento para n grande, independentemente da máquina.`}]};export{e as default};
//# sourceMappingURL=l4-big-o-CAIHc99C.js.map