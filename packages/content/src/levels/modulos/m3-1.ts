/** Lições adicionais do módulo m3-1 (arrays). */
import type { Lesson } from '../../types.ts';
import { dedent, deep, english, info, lesson, md, py, t, tip, trace, warn } from '../../helpers.ts';

/* ------------------------------------------------------------------ */
/* Crescimento amortizado                                              */
/* ------------------------------------------------------------------ */

const crescimento = lesson({
  id: 'l3-crescimento-amortizado',
  moduleId: 'm3-1',
  title: 'Crescimento amortizado: a conta do append',
  titleEn: 'Amortized growth: the math behind append',
  summary: 'Por que dobrar a capacidade deixa o append O(1) amortizado, por que crescer de pouco em pouco vira O(n²), quando encolher e onde se escondem cópias no seu código.',
  minutes: 40,
  objectives: [
    'Calcular o total de cópias de n appends com crescimento geométrico e com crescimento aritmético',
    'Distinguir custo amortizado, pior caso e caso médio',
    'Explicar por que uma lista dinâmica precisa de folga para encolher (histerese)',
    'Reconhecer cópias escondidas que deixam um laço O(n²)',
  ],
  skills: ['ed-arrays'],
  terms: [
    t('realocação', 'reallocation', 'Reservar um bloco de memória de outro tamanho e mover os elementos para ele.', 'The list is reallocated when it runs out of capacity.'),
    t('crescimento geométrico', 'geometric growth', 'Aumentar a capacidade multiplicando-a por um fator constante, como ×2 ou ×1,5.'),
    t('crescimento aritmético', 'arithmetic growth', 'Aumentar a capacidade somando uma constante, como +1 ou +100. Leva n appends a O(n²).'),
    t('fator de crescimento', 'growth factor', 'Número pelo qual a capacidade é multiplicada a cada realocação.', "Java's ArrayList uses a growth factor of 1.5."),
    t('pior caso', 'worst case', 'O maior custo possível de uma única execução de uma operação.'),
    t('caso médio', 'average case', 'Custo médio quando a entrada é sorteada segundo alguma distribuição; depende dessa suposição.'),
    t('método contábil', 'accounting method', 'Técnica de análise amortizada: operações baratas pagam um pouco a mais e guardam crédito para pagar as caras.'),
    t('histerese', 'hysteresis', 'Folga entre o ponto de crescer e o de encolher, para a estrutura não realocar a cada operação.'),
    t('pré-alocar', 'preallocate', 'Reservar todo o espaço de uma vez quando o tamanho final já é conhecido.', 'Preallocate the list with [None] * n to avoid repeated resizing.'),
  ],
  stages: {
    conceito: [
      md(`
        Na lição anterior você viu que \`append\` é **O(1) amortizado**: quase sempre é barato, mas de vez em quando a lista enche e precisa de uma **{{realocação|reallocation}}**, isto é, reservar um bloco maior e copiar tudo para ele. Agora vamos **fazer a conta** e entender por que ela fecha.

        A pergunta central é: **quanto crescer** quando a lista enche? Se a capacidade for **multiplicada** por um fator (×2, ×1,5), n appends custam O(n) no total. Se ela for **somada** de uma constante (+1, +100), os mesmos n appends custam **O(n²)**. A diferença entre os dois mundos é uma linha de código.

        Essa escolha aparece em todo lugar: o \`ArrayList\` do Java cresce 1,5×, o \`std::vector\` do GCC dobra, os *slices* do Go dobram enquanto são pequenos, e o \`dict\` e o \`set\` do Python usam a mesma ideia quando a tabela interna passa de certa ocupação. E a versão errada aparece, disfarçada, em código de iniciante: \`xs = xs + [v]\` dentro de um laço.
      `),
    ],
    explicacao: [
      md(`
        ### O modelo
        Uma lista dinâmica guarda um bloco com **capacidade** c e usa só as n primeiras posições. Em cada \`append\`:
        - se ainda há espaço (n < c), escreve na posição n: custo 1;
        - se está cheia (n = c), reserva um bloco maior, copia os n elementos e só então escreve: custo n + 1.

        O que muda de uma implementação para outra é a regra para a nova capacidade.

        ### Multiplicar: {{crescimento geométrico|geometric growth}}
        Começando com capacidade 1 e dobrando, as cópias acontecem quando a lista tem 1, 2, 4, 8, … elementos. Até o n-ésimo append, o total copiado é \`1 + 2 + 4 + … + 2^k\`, com \`2^k < n\`. Essa soma vale \`2^(k+1) − 1\`, que é **menor que 2n**. Somando as n escritas, tudo fica abaixo de **3n**: O(n) para n appends, ou seja, **O(1) amortizado** por append.

        Com outro {{fator de crescimento|growth factor}} r > 1 a conta é a mesma progressão geométrica: as cópias somam menos de \`n × r / (r − 1)\`. Para r = 1,5, menos de 3n. O fator muda a constante, não a ordem de grandeza.

        ### Somar: {{crescimento aritmético|arithmetic growth}}
        Crescendo de k em k, as cópias acontecem com k, 2k, 3k, … elementos: são cerca de n/k realocações, e as últimas copiam quase n elementos cada. O total é \`k × (1 + 2 + … + n/k)\`, perto de **n² / (2k)**: **O(n²)**. Um k maior só divide a constante; o crescimento continua quadrático.
      `),
      {
        type: 'table',
        head: ['Regra de crescimento', 'Cópias com n = 1 000', 'Cópias com n = 100 000', 'Aumento', 'n appends custam'],
        rows: [
          ['+1', '499 500', '4 999 950 000', '≈ 10 000×', 'O(n²)'],
          ['+100', '4 510', '49 951 000', '≈ 11 000×', 'O(n²)'],
          ['×1,5', '2 137', '276 521', '≈ 130×', 'O(n)'],
          ['×2', '1 023', '131 071', '≈ 130×', 'O(n)'],
        ],
        caption: 'Total de elementos copiados, começando com capacidade 1 (no ×1,5, a nova capacidade é c + c // 2, e no mínimo c + 1). O n cresceu 100×: nas regras que somam, as cópias cresceram cerca de 100² = 10 000×; nas que multiplicam, na mesma proporção que n, a menos de um fator constante (o 130× em vez de 100× vem de onde cada n cai entre duas realocações).',
      },
      md(`
        ### O cofrinho: por que a média fica constante
        Uma forma de enxergar o amortizado é o **{{método contábil|accounting method}}**: cada append paga um preço fixo, e o troco vai para um cofrinho que financia as cópias futuras. Na lista que dobra, cobre **3 moedas** por append: 1 paga a escrita do próprio elemento e 2 ficam guardadas.

        Logo depois de uma realocação de c/2 para c, suponha o pior: o cofrinho zerado (na conta exata sobra 1 moeda), com c/2 elementos antigos na lista. A próxima realocação só acontece quando ela chega a c elementos, depois de c/2 escritas novas (contando a que disparou a realocação). Elas guardaram 2 × c/2 = **c moedas**: exatamente o preço de copiar os c elementos. O cofrinho nunca fica negativo, então n appends custam no máximo 3n moedas.

        ### Amortizado não é média de sorteio
        Três medidas diferentes costumam ser confundidas: o **{{pior caso|worst case}}**, o custo amortizado e o **{{caso médio|average case}}**.
      `),
      {
        type: 'table',
        head: ['Medida', 'Pergunta que responde', 'Exemplo'],
        rows: [
          ['Pior caso de uma operação', 'Quanto **uma** chamada pode custar, no máximo?', '`append` que encontra a lista cheia: O(n)'],
          ['Custo amortizado', 'Pegando **qualquer** sequência de n operações a partir da estrutura vazia, quanto dá o custo total dividido por n?', '`append` na lista que dobra: O(1)'],
          ['Caso médio', 'Quanto custa, em média, quando a **entrada é sorteada**?', '`x in xs` com x numa posição aleatória: cerca de n/2 comparações, O(n)'],
        ],
      },
      warn(`
        O amortizado é uma **garantia sobre o total**, sem probabilidade nenhuma: vale até para a pior sequência possível. Mas ele não impede que **um** append isolado custe O(n). Quando cada operação tem prazo, isso importa: um jogo a 60 quadros por segundo tem cerca de 16 ms por quadro, e uma realocação de milhões de elementos no meio de um quadro vira um engasgo. Se você sabe o tamanho final, **{{pré-alocar|preallocate}}** com \`[None] * n\` e preencher por índice elimina as realocações. (Uma compreensão de lista não faz isso: por dentro, ela vai anexando um elemento por vez.)
      `, 'Amortizado não é instantâneo'),
      deep(`
        Quando muitos elementos saem, a lista pode devolver memória encolhendo. A regra ingênua, "encolher pela metade assim que só metade estiver ocupada", tem uma armadilha: com c elementos num bloco de capacidade c, um append dobra para 2c (copia c), um pop deixa metade ocupada e encolhe para c (copia c), o próximo append dobra de novo... **Cada operação custa O(n)**.

        A solução clássica (CLRS) é a **{{histerese|hysteresis}}**: dobrar quando enche, mas só reduzir à metade quando a ocupação cair **abaixo de 1/4**. Depois de qualquer realocação a lista fica com cerca de metade da capacidade ocupada, e são necessárias muitas operações até a próxima. O CPython faz algo parecido: só realoca para baixo quando a lista fica com menos da metade da capacidade e, mesmo assim, deixa uma folga de cerca de 12,5%.
      `, 'Encolher sem tremer'),
      md(`
        ### Cópias escondidas no seu código
        A mesma conta explica por que alguns laços inocentes ficam quadráticos:
      `),
      {
        type: 'table',
        head: ['Dentro de um laço de n passos', 'O que acontece a cada passo', 'Total do laço'],
        rows: [
          ['`xs.append(v)`', 'escreve no fim; de vez em quando realoca', 'O(n)'],
          ['`xs += [v]` ou `xs.extend(ys)`', 'estende **a mesma** lista, no lugar', 'O(n), ou O(total de itens)'],
          ['`xs = xs + [v]`', 'cria uma lista **nova** e copia tudo para ela', 'O(n²)'],
          ['`s = s + "x"` com strings', 'string é imutável: pode copiar a string inteira', 'O(n²) no pior caso'],
          ['`resto = xs[1:]`', 'toda fatia é uma cópia', 'O(n²) se repetida n vezes'],
        ],
      },
      tip(`
        \`xs = xs + [v]\` é a regra **+1 disfarçada**: a cada passo nasce uma lista exatamente um elemento maior, e tudo é copiado. Para strings, junte os pedaços em uma lista e chame \`"".join(pedacos)\` no fim. O CPython às vezes otimiza \`s += t\`, mas a PEP 8 pede para não contar com isso.
      `),
    ],
    exemplo: [
      md(`
        Veja 9 appends numa lista que começa com capacidade 1 e dobra quando enche. A coluna "tamanho antes" é quantos elementos já existiam quando o append começou.
      `),
      {
        type: 'table',
        head: ['Append nº', 'Tamanho antes', 'Capacidade antes', 'Realoca?', 'Cópias neste append', 'Cópias acumuladas', 'Capacidade depois'],
        rows: [
          ['1', '0', '1', 'não', '0', '0', '1'],
          ['2', '1', '1', 'sim', '1', '1', '2'],
          ['3', '2', '2', 'sim', '2', '3', '4'],
          ['4', '3', '4', 'não', '0', '3', '4'],
          ['5', '4', '4', 'sim', '4', '7', '8'],
          ['6', '5', '8', 'não', '0', '7', '8'],
          ['7', '6', '8', 'não', '0', '7', '8'],
          ['8', '7', '8', 'não', '0', '7', '8'],
          ['9', '8', '8', 'sim', '8', '15', '16'],
        ],
        caption: '15 cópias em 9 appends: menos que 2 × 9 = 18. Em troca, 7 das 16 posições estão vazias: o preço do crescimento geométrico é memória.',
      },
      md(`
        Repare que a realocação acontece no append que **encontra** a lista cheia (o 2º, o 3º, o 5º, o 9º), não no que a enche. A próxima só virá no 17º append, e vai copiar 16 elementos.

        O que significa "copiar"? Python não tem um bloco cru de tamanho fixo, então podemos fingir um com \`[None] * capacidade\` e nunca chamar \`append\` nele. Siga uma realocação passo a passo:
      `),
      trace(`
        bloco = [7, 3, 9]                  # cheio: tamanho 3, capacidade 3
        novo = [None] * (2 * len(bloco))   # reserva o dobro
        for i in range(len(bloco)):
            novo[i] = bloco[i]             # copia um por um: O(n)
        bloco = novo
        bloco[3] = 5                       # agora sim, escreve o 4º elemento
        print(bloco)
      `, 'A cópia é o laço do meio: ela custa um passo por elemento que já estava na lista.'),
    ],
    codigo: [
      py(`
        import time

        def com_append(n):
            xs = []
            for i in range(n):
                xs.append(i)        # estende a mesma lista
            return xs

        def com_soma(n):
            xs = []
            for i in range(n):
                xs = xs + [i]       # cria uma lista nova e copia tudo
            return xs

        for n in [2_000, 4_000, 8_000]:
            t0 = time.perf_counter()
            com_append(n)
            t1 = time.perf_counter()
            com_soma(n)
            t2 = time.perf_counter()
            print(f"n={n:>5}  append: {(t1 - t0) * 1000:6.2f} ms   xs = xs + [i]: {(t2 - t1) * 1000:7.2f} ms")

        xs = [1, 2, 3]
        antes = id(xs)
        xs += [4]
        print("depois de +=, mesma lista?", id(xs) == antes)
        xs = xs + [5]
        print("depois de xs + [5], mesma lista?", id(xs) == antes)
      `, { caption: 'Dobrar n mais ou menos dobra o tempo do append e quase quadruplica o de xs = xs + [i]. O id() mostra o motivo: + cria outra lista.' }),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e3-amort-1',
          kind: 'mcq',
          prompt: 'Numa lista que dobra de capacidade quando enche, o que a frase "append é O(1) amortizado" garante?',
          difficulty: 'facil',
          skills: ['ed-arrays'],
          hints: [
            'Todo append custa a mesma coisa? Pense no append que encontra a lista cheia.',
            '"Amortizado" fala de uma operação isolada ou de uma sequência delas?',
          ],
          explanation: 'A análise amortizada soma o custo de uma sequência inteira e divide pelo número de operações. Com a capacidade dobrando, n appends custam menos de 3n passos no total, embora o append que dispara a realocação, sozinho, custe O(n). Nenhuma probabilidade entra na conta.',
          options: [
            { text: 'Que todo append, sem exceção, leva tempo constante.', feedback: 'Não: o append que encontra a lista cheia copia todos os elementos e custa O(n). A garantia é sobre o total, não sobre cada chamada.' },
            { text: 'Que qualquer sequência de n appends, a partir da lista vazia, custa O(n) no total, mesmo que alguns appends isolados custem O(n).', correct: true, feedback: 'Isso. As realocações caras são raras o bastante para que o total fique linear, e isso vale para qualquer sequência.' },
            { text: 'Que, em média, para dados aleatórios, o append é rápido.', feedback: 'Isso descreve caso médio, que depende de supor uma distribuição dos dados. O amortizado não supõe nada: vale até para a pior sequência possível.' },
            { text: 'Que, como a capacidade dobra, o append nunca precisa copiar elementos.', feedback: 'Dobrar não elimina as cópias, só as torna raras. Cada realocação ainda copia todos os elementos para o bloco novo.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e3-amort-2',
          kind: 'predict',
          lang: 'python',
          prompt: 'O que é impresso? Lembre-se de que `b = a` não copia a lista.',
          difficulty: 'intermediario',
          skills: ['ed-arrays', 'prog-listas'],
          hints: [
            'Depois de `b = a`, quantas listas existem na memória?',
            '`a += [3]` modifica o objeto que `a` já aponta ou cria outro?',
            'E `a = a + [4]`? Para qual objeto o nome `a` aponta depois dessa linha? E o nome `b`?',
          ],
          explanation: '`a += [3]` estende a própria lista (é um `extend`), então `b`, que aponta para ela, também vê o 3. Já `a + [4]` cria uma lista nova, copiando os elementos, e a atribuição liga só o nome `a` a ela; `b` continua com a antiga. Num laço, essa cópia a cada passo é exatamente a regra +1: O(n²).',
          code: dedent(`
            a = [1, 2]
            b = a
            a += [3]
            print(b)
            a = a + [4]
            print(a, b)
          `),
          answer: '[1, 2, 3]\n[1, 2, 3, 4] [1, 2, 3]',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e3-amort-3',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `simular_appends(n, fator)` que simula n appends numa lista dinâmica que começa **vazia e com capacidade 1** e que, quando um append encontra a lista cheia, passa a ter `capacidade * fator` posições (`fator` é um inteiro ≥ 2). Cada realocação copia todos os elementos que a lista tem naquele momento. Devolva a tupla `(capacidade_final, total_de_copias)`.',
          difficulty: 'intermediario',
          skills: ['ed-arrays'],
          hints: [
            'Que três números você precisa acompanhar enquanto os appends acontecem?',
            'A realocação acontece antes ou depois de escrever o novo elemento? Compare com a tabela da etapa Exemplo.',
            'Quando a lista realoca, quantos elementos ela tem? É isso que entra no total de cópias.',
            'Confira com a tabela: 9 appends com fator 2 terminam com capacidade 16 e 15 cópias.',
          ],
          explanation: 'A realocação acontece no append que encontra `tamanho == capacidade`, antes da escrita, e copia `tamanho` elementos. Por isso 16 appends com fator 2 cabem exatamente em capacidade 16 (15 cópias) e só o 17º realoca. Com fator r, o total fica abaixo de n × r / (r − 1): menos de 2n para r = 2 e menos de 1,5n para r = 3, em troca de mais posições vazias.',
          starter: dedent(`
            def simular_appends(n, fator):
                # comece com a lista vazia e capacidade 1; a cada append,
                # realoque (copiando tudo) se estiver cheia e depois escreva.
                # devolva (capacidade_final, total_de_copias)
                pass
          `),
          solution: dedent(`
            def simular_appends(n, fator):
                capacidade, tamanho, copias = 1, 0, 0
                for _ in range(n):
                    if tamanho == capacidade:
                        copias += tamanho
                        capacidade *= fator
                    tamanho += 1
                return (capacidade, copias)
          `),
          tests: [
            { name: 'nenhum append', code: 'r = simular_appends(0, 2)\nassert r == (1, 0), f"sem appends nada muda: esperado (1, 0), veio {r}"' },
            { name: 'primeiros appends', code: 'for n, esperado in [(1, (1, 0)), (2, (2, 1)), (3, (4, 3))]:\n    r = simular_appends(n, 2)\n    assert r == esperado, f"simular_appends({n}, 2): esperado {esperado}, veio {r}"' },
            { name: 'a tabela da lição', code: 'r = simular_appends(9, 2)\nassert r == (16, 15), f"9 appends dobrando: esperado (16, 15), veio {r}. Refaça a tabela da etapa Exemplo."' },
            { name: 'potência exata de 2', code: 'r16 = simular_appends(16, 2)\nr17 = simular_appends(17, 2)\nassert r16 == (16, 15), f"16 appends enchem a capacidade 16 sem realocar de novo: esperado (16, 15), veio {r16}. A realocação é no append que ENCONTRA a lista cheia."\nassert r17 == (32, 31), f"o 17º append encontra a lista cheia: esperado (32, 31), veio {r17}"' },
            { name: 'fator 3', code: 'r9 = simular_appends(9, 3)\nr10 = simular_appends(10, 3)\nassert r9 == (9, 4), f"capacidades 1 → 3 → 9: esperado (9, 4), veio {r9}"\nassert r10 == (27, 13), f"o 10º append copia 9 elementos: esperado (27, 13), veio {r10}"' },
            { name: 'menos de 2n cópias', code: 'for n in [5, 100, 1000, 1025, 100000]:\n    cap, c = simular_appends(n, 2)\n    assert cap >= n and c < 2 * n, f"n={n}: capacidade {cap} e {c} cópias; com fator 2 as cópias deveriam ficar abaixo de {2 * n}"\nassert simular_appends(1000, 2) == (1024, 1023)\nassert simular_appends(100000, 2) == (131072, 131071)' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e3-amort-4',
          kind: 'mcq',
          prompt: 'Para economizar memória, uma equipe trocou o fator de crescimento da sua lista dinâmica de ×2 para ×1,25. O que acontece com o custo de n appends?',
          difficulty: 'intermediario',
          skills: ['ed-arrays'],
          hints: [
            'Com fator 1,25, os tamanhos copiados ainda formam uma progressão geométrica?',
            'Na tabela da explicação, a regra ×1,5 ficou do lado O(n) ou do lado O(n²)? O que separa os dois lados?',
          ],
          explanation: 'Qualquer fator constante r > 1 deixa as cópias somando menos de n × r / (r − 1): para 1,25, menos de 5n. Logo depois de crescer, a fração vazia do bloco é cerca de (r − 1) / r: 20% em vez de 50%. É uma troca de constantes entre tempo e memória; a ordem de grandeza continua O(n).',
          options: [
            { text: 'Continua O(n) no total: há mais realocações e o limite das cópias sobe de 2n para 5n, mas logo depois de crescer o bloco fica só 20% vazio (em vez de 50%).', correct: true, feedback: 'Isso. O fator ajusta a troca entre tempo e memória, sem mudar a ordem de grandeza.' },
            { text: 'Vira O(n²), porque 1,25 está perto demais de 1.', feedback: 'Qualquer fator constante maior que 1 deixa a soma das cópias geométrica, logo O(n). O que leva a O(n²) é somar uma constante (+k), por maior que ela seja.' },
            { text: 'Nada muda: o fator só afeta a memória, não o número de cópias.', feedback: 'Muda, sim: com fator menor a lista enche mais vezes e copia mais no total. Só a ordem de grandeza se mantém.' },
            { text: 'Vira O(n log n), porque passam a existir cerca de log n realocações.', feedback: 'Com fator 2 já existem cerca de log₂ n realocações. O que importa não é quantas são, mas a soma dos tamanhos copiados, que é geométrica e dá O(n).' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e3-amort-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Implemente uma lista dinâmica **com histerese**, guardada num dicionário criado por \`criar()\` (já pronto no código inicial): \`"bloco"\` é o bloco de memória (uma lista de tamanho fixo, e a capacidade é sempre \`len(arr["bloco"])\`), \`"tamanho"\` é quantas posições estão em uso e \`"copias"\` conta os elementos copiados em realocações. O bloco começa com capacidade 1.

            - \`anexar(arr, valor)\`: se o bloco estiver cheio, troque-o por um bloco com o **dobro** da capacidade, copiando os elementos em uso (cada um soma 1 em \`arr["copias"]\`); depois escreva o valor.
            - \`remover_ultimo(arr)\`: se estiver vazia, lance \`IndexError\`; senão, tire o último valor, deixe \`None\` na posição e devolva o valor. Depois disso, se a capacidade for maior que 1 **e** \`tamanho * 4 < capacidade\`, troque o bloco por um com **metade** da capacidade, copiando (e contando) os elementos em uso.

            Gerencie o bloco só com índices: não use \`append\`, \`pop\`, \`insert\`, \`extend\`, \`remove\`, \`clear\` nem \`del\`.
          `),
          difficulty: 'desafio',
          skills: ['ed-arrays', 'prog-dicionarios'],
          hints: [
            'Olhando só para `arr["tamanho"]` e `len(arr["bloco"])`, como você sabe que o bloco está cheio?',
            'Crescer e encolher são o mesmo trabalho com outra capacidade: criar um bloco novo e copiar os elementos em uso. Que tal uma função auxiliar `realocar(arr, nova_capacidade)`?',
            'Em `remover_ultimo`, siga uma ordem: testar se está vazia, guardar o valor, apagar a posição, diminuir o tamanho e só então testar a regra de 1/4.',
            'Teste a histerese: com 1 020 elementos num bloco de 1 024, alterne 10 anexar e 10 remover várias vezes. Quantas realocações a sua versão faz?',
          ],
          explanation: 'Depois de dobrar, a lista fica com metade da capacidade ocupada; depois de encolher, também (abaixo de 1/4, reduzir à metade deixa menos da metade em uso). Por isso, entre duas realocações sempre há uma quantidade de operações proporcional ao tamanho, e anexar e remover ficam O(1) amortizado mesmo misturados. Com a regra ingênua de encolher em 1/2, alternar operações na fronteira realoca a cada passo. Deixar `None` na posição liberada evita que a lista segure objetos que ninguém mais usa (o que Sedgewick chama de *loitering*).',
          starter: dedent(`
            def criar():
                # bloco de capacidade 1, ainda vazio
                return {"bloco": [None], "tamanho": 0, "copias": 0}


            def anexar(arr, valor):
                # se o bloco estiver cheio, troque-o por um com o dobro da capacidade
                # (copiando os elementos e contando as cópias); depois escreva o valor
                pass


            def remover_ultimo(arr):
                # vazia: IndexError. Senão: tire o último valor (deixe None no lugar) e devolva-o.
                # Depois, se capacidade > 1 e tamanho * 4 < capacidade, reduza o bloco à metade
                pass
          `),
          solution: dedent(`
            def criar():
                return {"bloco": [None], "tamanho": 0, "copias": 0}


            def realocar(arr, nova_capacidade):
                novo = [None] * nova_capacidade
                for i in range(arr["tamanho"]):
                    novo[i] = arr["bloco"][i]
                    arr["copias"] += 1
                arr["bloco"] = novo


            def anexar(arr, valor):
                if arr["tamanho"] == len(arr["bloco"]):
                    realocar(arr, 2 * len(arr["bloco"]))
                arr["bloco"][arr["tamanho"]] = valor
                arr["tamanho"] += 1


            def remover_ultimo(arr):
                if arr["tamanho"] == 0:
                    raise IndexError("remover de uma lista vazia")
                arr["tamanho"] -= 1
                valor = arr["bloco"][arr["tamanho"]]
                arr["bloco"][arr["tamanho"]] = None
                capacidade = len(arr["bloco"])
                if capacidade > 1 and arr["tamanho"] * 4 < capacidade:
                    realocar(arr, capacidade // 2)
                return valor
          `),
          tests: [
            {
              name: 'cresce dobrando',
              code: dedent(`
                arr = criar()
                for v in [10, 20, 30, 40, 50]:
                    anexar(arr, v)
                assert arr["tamanho"] == 5, f"depois de 5 anexar, o tamanho deveria ser 5; veio {arr['tamanho']}"
                assert len(arr["bloco"]) == 8, f"começando em 1 e dobrando, 5 elementos pedem capacidade 8; veio {len(arr['bloco'])}"
                assert arr["bloco"] == [10, 20, 30, 40, 50, None, None, None], f"bloco inesperado: {arr['bloco']}"
                assert arr["copias"] == 7, f"as realocações copiam 1 + 2 + 4 = 7 elementos; veio {arr['copias']}"
              `),
            },
            {
              name: 'remove do fim',
              code: dedent(`
                arr = criar()
                for v in [10, 20, 30, 40, 50]:
                    anexar(arr, v)
                a = remover_ultimo(arr)
                b = remover_ultimo(arr)
                assert (a, b) == (50, 40), f"remover_ultimo deveria devolver 50 e depois 40; veio {a} e {b}"
                assert arr["tamanho"] == 3, f"tamanho esperado 3, veio {arr['tamanho']}"
                assert arr["bloco"] == [10, 20, 30, None, None, None, None, None], f"com 3 de 8 em uso ainda não encolhe (3 * 4 = 12 não é menor que 8), e as posições liberadas viram None; veio {arr['bloco']}"
              `),
            },
            {
              name: 'realoca só quando encontra o bloco cheio',
              code: dedent(`
                arr = criar()
                anexar(arr, "a")
                assert len(arr["bloco"]) == 1 and arr["copias"] == 0, f"o 1º elemento cabe no bloco de capacidade 1: ainda não é hora de crescer (veio capacidade {len(arr['bloco'])} e {arr['copias']} cópias). Só cresça no anexar que ENCONTRA o bloco cheio."
                for v in ["b", "c", "d"]:
                    anexar(arr, v)
                assert arr["bloco"] == ["a", "b", "c", "d"], f"4 elementos enchem exatamente a capacidade 4, sem sobra; veio {arr['bloco']}"
                assert arr["copias"] == 3, f"para chegar à capacidade 4 as realocações copiam 1 + 2 = 3 elementos; veio {arr['copias']}"
              `),
            },
            {
              name: 'lista vazia',
              code: dedent(`
                arr = criar()
                try:
                    remover_ultimo(arr)
                except IndexError:
                    pass
                else:
                    raise AssertionError("remover de uma lista vazia deveria lançar IndexError")
                anexar(arr, 1)
                assert remover_ultimo(arr) == 1, "com um só elemento, remover_ultimo deveria devolvê-lo"
                assert len(arr["bloco"]) == 1, f"a capacidade nunca cai abaixo de 1 (por isso a regra exige capacidade > 1); veio {len(arr['bloco'])}"
                try:
                    remover_ultimo(arr)
                except IndexError:
                    pass
                else:
                    raise AssertionError("depois de remover o único elemento, a lista está vazia: deveria lançar IndexError")
                anexar(arr, 2)
                assert arr["tamanho"] == 1 and arr["bloco"] == [2], f"depois de esvaziar, a lista precisa continuar aceitando elementos; veio {arr}"
              `),
            },
            {
              name: 'encolhe abaixo de 1/4',
              code: dedent(`
                arr = criar()
                for v in range(1, 10):
                    anexar(arr, v)
                assert len(arr["bloco"]) == 16 and arr["copias"] == 15, f"9 elementos: capacidade 16 e 15 cópias esperadas; veio {len(arr['bloco'])} e {arr['copias']}"
                for _ in range(5):
                    remover_ultimo(arr)
                assert len(arr["bloco"]) == 16, f"com 4 de 16 em uso (exatamente 1/4) ainda não encolhe; a capacidade veio {len(arr['bloco'])}"
                remover_ultimo(arr)
                assert len(arr["bloco"]) == 8, f"com 3 de 16 em uso (menos de 1/4) deveria encolher para 8; veio {len(arr['bloco'])}"
                assert arr["bloco"][:3] == [1, 2, 3], f"ao encolher, os elementos em uso precisam ir junto; veio {arr['bloco']}"
                assert arr["copias"] == 18, f"encolher copia os 3 elementos em uso: 15 + 3 = 18 cópias; veio {arr['copias']}"
              `),
            },
            {
              name: 'não realoca a cada operação na fronteira',
              code: dedent(`
                arr = criar()
                for v in range(1020):
                    anexar(arr, v)
                base = arr["copias"]
                for _ in range(200):
                    for v in range(10):
                        anexar(arr, v)
                    for _ in range(10):
                        remover_ultimo(arr)
                extra = arr["copias"] - base
                assert extra <= 1024, f"alternar 10 anexar e 10 remover perto de 1 024 elementos fez {extra} cópias: a lista está crescendo e encolhendo sem parar. Revise a regra de 1/4."
                assert arr["tamanho"] == 1020 and arr["bloco"][1019] == 1019, "depois das alternâncias, os 1 020 elementos originais deveriam continuar lá"
              `),
            },
            {
              name: 'só índices no bloco',
              code: dedent(`
                import ast
                proibidos = {"append", "pop", "insert", "extend", "remove", "clear"}
                usados = set()
                for no in ast.walk(ast.parse(_source)):
                    if isinstance(no, ast.Call) and isinstance(no.func, ast.Attribute) and no.func.attr in proibidos:
                        usados.add(no.func.attr)
                    if isinstance(no, ast.Delete):
                        usados.add("del")
                assert not usados, f"gerencie o bloco só com índices (bloco[i] = ...); não use: {', '.join(sorted(usados))}"
              `),
            },
          ],
        },
      },
    ],
    revisao: [
      md(`
        - Lista dinâmica: bloco com capacidade ≥ tamanho; quando enche, realoca e copia tudo.
        - Multiplicar a capacidade por um fator r (×2, ×1,5): cópias somam menos de n × r / (r − 1), então n appends custam O(n): **O(1) amortizado**.
        - Somar uma constante k (+1, +100): cópias somam cerca de n² / (2k): **O(n²)**.
        - Amortizado é garantia sobre o total de qualquer sequência; um append isolado ainda pode custar O(n).
        - Para encolher sem tremer: dobrar quando enche, reduzir à metade só abaixo de 1/4 (histerese).
        - Cuidado com cópias escondidas: \`xs = xs + [v]\`, concatenação de strings e fatias dentro de laços.
      `),
      english(`
        - **amortized O(1)**: O(1) amortizado
        - **to reallocate / reallocation**: realocar / realocação
        - **growth factor**: fator de crescimento
        - **worst case**: pior caso
        - **to preallocate**: pré-alocar

        Frase típica de entrevista: *"Appending to a dynamic array is amortized O(1): a single append may trigger an O(n) copy, but because the capacity doubles, n appends cost O(n) in total."*
      `),
    ],
  },
  review: [
    ['Começando com capacidade 1 e dobrando, qual o limite para o total de cópias em n appends, e por quê?', 'Menos de 2n: as cópias são 1 + 2 + 4 + … + 2^k com 2^k < n, e essa soma é 2^(k+1) − 1. Com as n escritas, menos de 3n.'],
    ['Por que crescer a capacidade de k em k deixa n appends em O(n²)?', 'São cerca de n/k realocações, copiando k, 2k, 3k, … elementos: a soma fica perto de n²/(2k). O k só divide a constante.'],
    ['Qual a diferença entre custo amortizado e caso médio?', 'Amortizado é o custo total de qualquer sequência dividido pelo número de operações, sem probabilidade. Caso médio é a média sobre entradas sorteadas.'],
    ['Por que uma lista dinâmica não deve encolher assim que fica com metade da capacidade em uso?', 'Alternar append e pop na fronteira faria crescer e encolher a cada operação, O(n) cada. Encolher só abaixo de 1/4 deixa folga (histerese).'],
    ['Qual a diferença de custo entre `xs += [v]` e `xs = xs + [v]` dentro de um laço?', '`+=` estende a mesma lista: O(1) amortizado por passo. `xs + [v]` cria uma lista nova copiando tudo: O(n) por passo, O(n²) no laço.'],
    ['No método contábil para a lista que dobra, quanto cada append paga e para quê?', '3 moedas: 1 pela própria escrita e 2 guardadas, que somadas pagam a cópia de todos os elementos na próxima realocação.'],
  ],
  references: ['clrs', 'mit-6006', 'sedgewick-algs', 'pep8'],
});

/* ------------------------------------------------------------------ */
/* Dois ponteiros                                                      */
/* ------------------------------------------------------------------ */

const doisPonteiros = lesson({
  id: 'l3-dois-ponteiros',
  moduleId: 'm3-1',
  title: 'Dois ponteiros: padrões e invariantes',
  titleEn: 'Two pointers: patterns and invariants',
  summary: 'Três jeitos de andar com dois índices (convergentes, leitor e escritor, duas listas) que trocam laços aninhados por uma passada O(n), e como provar que nenhuma resposta fica para trás.',
  minutes: 50,
  objectives: [
    'Reconhecer qual dos três padrões de dois ponteiros um problema pede',
    'Justificar a correção com um argumento de descarte ou um invariante de laço',
    'Filtrar e compactar listas no lugar, em O(n) e com O(1) de memória extra',
    'Combinar duas listas ordenadas em O(n + m)',
  ],
  skills: ['ed-arrays'],
  terms: [
    t('dois ponteiros', 'two pointers', 'Técnica que percorre a lista com dois índices que só andam num sentido, descartando candidatos a cada passo.', 'This problem can be solved in O(n) with the two pointers technique.'),
    t('ponteiro', 'pointer', 'Aqui, uma variável que guarda uma posição (índice) da lista. Em C, é um endereço de memória.'),
    t('ponteiros convergentes', 'converging pointers', 'Um índice em cada ponta, andando um em direção ao outro até se cruzarem.'),
    t('leitor e escritor', 'read/write pointers', 'Dois índices no mesmo sentido: um lê todos os elementos, o outro só avança quando um elemento é mantido.'),
    t('invariante de laço', 'loop invariant', 'Afirmação verdadeira antes de cada volta do laço que, no fim, garante que o resultado está certo.', 'The loop invariant is that xs[:write] holds exactly the kept elements.'),
    t('no lugar', 'in place', 'Modificando a própria lista, com O(1) de memória extra.', 'Modify the input array in place with O(1) extra memory.'),
    t('espaço de busca', 'search space', 'Conjunto de candidatos que ainda podem ser a resposta.'),
    t('intercalar', 'merge', 'Juntar duas sequências ordenadas em uma só, também ordenada.'),
  ],
  stages: {
    conceito: [
      md(`
        Na primeira lição deste módulo você inverteu uma lista e achou um par com soma alvo usando dois índices. Esse truque tem nome: **{{dois ponteiros|two pointers}}**. Aqui, {{ponteiro|pointer}} é só uma variável que guarda uma posição da lista.

        Em vez de testar **todos os pares** com dois laços aninhados (O(n²)), você mantém dois índices que **só andam num sentido** e, a cada passo, descarta com segurança uma parte do problema. Como nenhum índice volta, o total de passos é no máximo n (ou n + m, com duas listas): **O(n)**, quase sempre com **O(1) de memória extra**.

        Quase todo problema desse tipo segue um de três padrões. Reconhecer o padrão é metade da solução; saber **por que** ele não perde respostas é a outra metade, e é o que o entrevistador vai perguntar em seguida.
      `),
    ],
    explicacao: [
      md(`
        ### Os três padrões
        - **{{Ponteiros convergentes|converging pointers}}**: \`i\` começa no início, \`j\` no fim, e eles se aproximam.
        - **{{Leitor e escritor|read/write pointers}}**: os dois andam para a frente; \`leitura\` avança sempre, \`escrita\` só quando um elemento fica. Também é chamado de ponteiros rápido e lento (*fast and slow*).
        - **Duas sequências**: um índice em cada lista ordenada; a cada passo avança o que aponta para o menor.
      `),
      {
        type: 'table',
        head: ['Padrão', 'Como os índices andam', 'Problemas típicos', 'Custo'],
        rows: [
          ['Convergentes', '`i` sobe, `j` desce, até `i >= j`', 'inverter, palíndromo, soma alvo em lista ordenada, maior área', 'O(n) tempo, O(1) memória'],
          ['Leitor e escritor', '`leitura` sobe a cada passo; `escrita` só quando algo fica', 'remover duplicatas ou um valor, mover zeros, filtrar no lugar', 'O(n) tempo, O(1) memória'],
          ['Duas sequências', 'um índice em cada lista; avança o do menor', 'intercalar, interseção, comparar listas ordenadas', 'O(n + m) tempo'],
        ],
        caption: 'Em todos, cada passo move pelo menos um índice e nenhum volta: o número de passos é limitado pelo tamanho da entrada.',
      },
      md(`
        ### Por que o convergente não perde o par certo
        Volte à soma alvo numa lista **ordenada**. O {{invariante de laço|loop invariant}} é: *se existe um par com a soma pedida, ele está dentro do intervalo de i a j.* No começo (i = 0, j = n − 1) isso é óbvio. A cada passo:

        - Se \`xs[i] + xs[j] < alvo\`: para qualquer k entre i e j, \`xs[k] <= xs[j]\`, então \`xs[i] + xs[k] <= xs[i] + xs[j] < alvo\`. **Nenhum par com i dá certo**: descarte i (\`i += 1\`).
        - Se \`xs[i] + xs[j] > alvo\`: pelo mesmo raciocínio, nenhum par com j dá certo: descarte j (\`j -= 1\`).

        Pense na tabela de todos os n² pares: cada passo risca uma linha ou uma coluna inteira do {{espaço de busca|search space}}. Por isso n passos bastam para examinar, sem olhar um por um, todos os pares.

        ### O invariante do leitor e escritor
        \`leitura\` percorre todos os elementos; \`escrita\` marca onde vai o próximo elemento mantido. O invariante: **\`xs[:escrita]\` contém exatamente os elementos mantidos entre os já lidos, na ordem original**. Como \`escrita <= leitura\`, nunca sobrescrevemos algo que ainda não foi lido. No fim, \`xs[:escrita]\` é a resposta e o resto é sobra: quem chama usa só esse começo, ou corta com \`del xs[escrita:]\`. Tudo {{no lugar|in place}}, sem lista auxiliar.

        ### Duas sequências
        Com duas listas ordenadas, o menor elemento ainda não usado está sempre na frente de uma delas. Compare as duas frentes, consuma a menor e avance só aquele índice. Isso é **{{intercalar|merge}}**, o coração do merge sort que você verá no Nível 4.
      `),
      warn(`
        O convergente da soma alvo **exige lista ordenada**: o argumento de descarte usa \`xs[k] <= xs[j]\`. Numa lista desordenada, ordenar antes custa O(n log n) e perde as posições originais; com um dicionário (assunto do módulo de tabelas hash), dá para resolver em O(n) em média.
      `, 'Confira a pré-condição'),
      info(`
        No dia a dia, \`[x for x in xs if x != 0]\` é o jeito mais legível de filtrar: O(n) de tempo, mas O(n) de memória extra e uma lista **nova**. O leitor e escritor importa quando a memória é apertada, quando outros nomes apontam para a mesma lista (aliasing) e quando a entrevista pede "in place". E fuja de remover itens de uma lista enquanto um \`for\` percorre essa mesma lista: o resultado sai errado (nos exercícios você vai ver por quê) e cada \`remove\` custa O(n).
      `, 'Compreensão de lista ou dois ponteiros?'),
    ],
    exemplo: [
      md(`
        Um aplicativo de ônibus registrou, em ordem crescente, as linhas que passaram num ponto: \`[107, 107, 175, 175, 175, 477, 702]\`. Queremos as linhas **sem repetição**, na própria lista. Como ela está ordenada, as repetições estão juntas: basta comparar cada elemento com o **último mantido**, \`xs[escrita - 1]\`.
      `),
      {
        type: 'table',
        head: ['leitura', 'xs[leitura]', 'último mantido', 'Ação', 'escrita depois'],
        rows: [
          ['1', '107', '107', 'repetido: só lê', '1'],
          ['2', '175', '107', 'novo: xs[1] = 175', '2'],
          ['3', '175', '175', 'repetido: só lê', '2'],
          ['4', '175', '175', 'repetido: só lê', '2'],
          ['5', '477', '175', 'novo: xs[2] = 477', '3'],
          ['6', '702', '477', 'novo: xs[3] = 702', '4'],
        ],
        caption: 'xs[0] sempre fica, então escrita começa em 1. Cada linha da tabela é uma volta do laço.',
      },
      trace(`
        def compactar(xs):
            if not xs:
                return 0
            escrita = 1                        # xs[0] sempre fica
            for leitura in range(1, len(xs)):
                if xs[leitura] != xs[escrita - 1]:
                    xs[escrita] = xs[leitura]
                    escrita += 1
            return escrita                     # xs[:escrita] não tem repetição

        linhas = [107, 107, 175, 175, 175, 477, 702]
        k = compactar(linhas)
        print(k, linhas[:k])
      `, 'Observe escrita ficar para trás de leitura a cada repetição. No fim, a lista inteira é [107, 175, 477, 702, 175, 477, 702]: o que vem depois de k é sobra.'),
    ],
    codigo: [
      py(`
        def intercalar(a, b):
            """Junta duas listas ordenadas numa nova lista ordenada: O(len(a) + len(b))."""
            i, j = 0, 0
            saida = []
            while i < len(a) and j < len(b):
                if a[i] <= b[j]:          # <= mantém primeiro quem veio de a, nos empates
                    saida.append(a[i])
                    i += 1
                else:
                    saida.append(b[j])
                    j += 1
            saida.extend(a[i:])           # no máximo uma das duas sobras não é vazia
            saida.extend(b[j:])
            return saida

        linha_107 = ["06:00", "06:40", "07:20", "08:00"]
        linha_175 = ["06:15", "06:40", "07:45"]
        print(intercalar(linha_107, linha_175))
        print(intercalar([], [1, 2]), intercalar([3], []))
      `, { caption: 'Horários de duas linhas no mesmo ponto, já ordenados, viram um quadro único. Strings no formato HH:MM, com zero à esquerda, comparam na ordem certa.' }),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e3-2p-1',
          kind: 'mcq',
          prompt: 'Numa lanchonete, a lista `pedidos` usa `0` para pedido cancelado. Você precisa tirar os cancelados **da própria lista**, mantendo a ordem dos outros, em O(n) e com O(1) de memória extra. Qual abordagem cumpre tudo isso?',
          difficulty: 'facil',
          skills: ['ed-arrays'],
          hints: [
            'Para cada abordagem, pergunte: quanto tempo leva, quanta memória extra usa e se mantém a ordem.',
            'Qual delas lê cada elemento uma vez e escreve no máximo uma vez, sem criar outra lista?',
          ],
          explanation: 'Leitor e escritor lê cada elemento uma vez e copia cada pedido válido no máximo uma vez para a frente: O(n) de tempo e só dois inteiros de memória extra. No fim, `del pedidos[escrita:]` corta a sobra.',
          options: [
            { text: 'Percorrer com `for p in pedidos` e chamar `pedidos.remove(0)` sempre que achar um zero.', feedback: 'Remover enquanto o `for` percorre a mesma lista faz o laço pular elementos, e cada `remove` desloca o resto da lista: O(n) por remoção, O(n²) no total.' },
            { text: 'Um índice de leitura que percorre tudo e um de escrita que só avança quando o pedido é válido; no fim, cortar o que sobrou depois da escrita.', correct: true, feedback: 'Isso: é o padrão leitor e escritor. O(n) de tempo, O(1) de memória extra e a ordem é mantida.' },
            { text: 'Criar `[p for p in pedidos if p != 0]` e usar essa nova lista.', feedback: 'É O(n) e é a escolha mais legível no dia a dia, mas cria outra lista do mesmo tamanho: O(n) de memória extra, e quem guardava a lista original não vê a mudança.' },
            { text: 'Ordenar a lista para juntar os zeros no começo e depois cortá-los.', feedback: 'Ordenar custa O(n log n) e destrói a ordem de chegada dos pedidos, que precisava ser mantida.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e3-2p-2',
          kind: 'predict',
          lang: 'python',
          prompt: 'Alguém tentou tirar os pedidos cancelados (zeros) removendo dentro do `for`. O que é impresso?',
          difficulty: 'intermediario',
          skills: ['ed-arrays', 'prog-listas'],
          hints: [
            'O `for` percorre a lista por posição: 0, 1, 2… O que acontece com as posições dos outros elementos quando um sai?',
            'Anote a lista e a posição atual do `for` a cada volta. Lembre que `remove(0)` apaga o **primeiro** zero da lista, não necessariamente o que o `for` está olhando.',
            'O laço para quando a posição atual passa do fim da lista **atual**, que vai encolhendo.',
          ],
          explanation: 'Volta 1 (posição 0): p = 0, `remove` apaga o primeiro zero → [0, 5, 0, 7]. Volta 2 (posição 1): p = 5, nada. Volta 3 (posição 2): p = 0, e `remove` apaga o primeiro zero da lista, que é o que tinha sido pulado → [5, 0, 7]. Volta 4: a posição 3 não existe mais, fim. Um zero sobreviveu. O padrão leitor e escritor resolve isso em uma passada.',
          code: dedent(`
            pedidos = [0, 0, 5, 0, 7]
            for p in pedidos:
                if p == 0:
                    pedidos.remove(p)
            print(pedidos)
          `),
          answer: '[5, 0, 7]',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e3-2p-3',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `mover_zeros(xs)` que leva todos os zeros para o **fim** da lista, mantendo a ordem relativa dos outros valores: `[0, 3, 0, 5, 7]` vira `[3, 5, 7, 0, 0]`. Modifique **a própria lista** (não devolva outra), em O(n) e com O(1) de memória extra: sem listas auxiliares, fatias (`xs[a:b]`) ou compreensões, e sem `sort`, `sorted`, `remove`, `insert`, `pop`, `append` ou `del`.',
          difficulty: 'intermediario',
          skills: ['ed-arrays'],
          hints: [
            'Que padrão da lição percorre a lista uma vez e mantém só alguns elementos, na ordem?',
            'Depois que todos os valores diferentes de zero estiverem compactados no começo, o que deve ir nas posições restantes?',
            'Um índice `leitura` passa por tudo; um índice `escrita` diz onde vai o próximo valor diferente de zero. Quando `leitura` termina, o que `escrita` está marcando?',
          ],
          explanation: 'Leitor e escritor: cada valor diferente de zero é copiado para `xs[escrita]`, e depois as posições de `escrita` até o fim recebem 0. Cada elemento é lido uma vez e cada posição recebe no máximo uma escrita: O(n), com dois inteiros de memória extra. A ordem relativa se mantém porque `escrita` nunca passa à frente de `leitura`. Uma alternativa equivalente é trocar `xs[escrita]` com `xs[leitura]` em vez de copiar.',
          starter: dedent(`
            def mover_zeros(xs):
                # leve os zeros para o fim, mantendo a ordem dos outros valores.
                # modifique a própria lista xs, sem criar outra
                pass
          `),
          solution: dedent(`
            def mover_zeros(xs):
                escrita = 0
                for leitura in range(len(xs)):
                    if xs[leitura] != 0:
                        xs[escrita] = xs[leitura]
                        escrita += 1
                for i in range(escrita, len(xs)):
                    xs[i] = 0
          `),
          tests: [
            { name: 'exemplo', code: 'xs = [0, 3, 0, 5, 7]\nmover_zeros(xs)\nassert xs == [3, 5, 7, 0, 0], f"esperado [3, 5, 7, 0, 0], a lista ficou {xs}"' },
            { name: 'mantém a ordem dos outros', code: 'xs = [4, 0, 1, 0, 3, 12]\nmover_zeros(xs)\nassert xs == [4, 1, 3, 12, 0, 0], f"a ordem dos valores diferentes de zero precisa ser mantida: esperado [4, 1, 3, 12, 0, 0], ficou {xs}"\nys = [-1, 0, -2, 0, 5]\nmover_zeros(ys)\nassert ys == [-1, -2, 5, 0, 0], f"negativos também ficam (só o zero vai para o fim): ficou {ys}"' },
            { name: 'casos de borda', code: 'for antes, depois in [([], []), ([0], [0]), ([7], [7]), ([0, 0, 0], [0, 0, 0]), ([1, 2, 3], [1, 2, 3]), ([0, 1], [1, 0])]:\n    xs = list(antes)\n    mover_zeros(xs)\n    assert xs == depois, f"mover_zeros({antes}) deveria deixar {depois}; ficou {xs}"' },
            { name: 'modifica a própria lista', code: 'xs = [0, 1, 0, 2]\nident = id(xs)\nmover_zeros(xs)\nassert id(xs) == ident and xs == [1, 2, 0, 0], f"altere a lista recebida (xs[i] = ...): quem chamou continua olhando para ela. Ficou {xs}"' },
            { name: 'sem atalhos nem lista auxiliar', code: dedent(`
              import ast
              proibidos = {"sorted", "sort", "remove", "insert", "pop", "append", "extend", "count", "copy", "list", "tuple", "filter", "index"}
              usados = set()
              for no in ast.walk(ast.parse(_source)):
                  if isinstance(no, ast.Call):
                      nome = no.func.id if isinstance(no.func, ast.Name) else getattr(no.func, "attr", "")
                      if nome in proibidos:
                          usados.add(nome)
                  if isinstance(no, ast.Delete):
                      usados.add("del")
                  if isinstance(no, (ast.ListComp, ast.GeneratorExp, ast.SetComp, ast.DictComp)):
                      usados.add("compreensão")
                  if isinstance(no, ast.List):
                      usados.add("lista auxiliar [...]")
                  if isinstance(no, ast.Slice):
                      usados.add("fatia xs[a:b]")
              assert not usados, f"resolva só com índices e atribuições (xs[i] = ...): outra lista ou uma fatia gasta O(n) de memória extra. Evite: {', '.join(sorted(usados))}"
            `) },
            { name: 'O(n) passos com os zeros no começo', code: dedent(`
              import sys

              class _Demais(BaseException):
                  pass

              def _contar_linhas(f, arg, limite):
                  passos = [0]
                  def rastro(frame, evento, _):
                      if frame.f_code.co_filename != "main.py":
                          return None
                      if evento == "line":
                          passos[0] += 1
                          if passos[0] > limite:
                              raise _Demais()
                      return rastro
                  sys.settrace(rastro)
                  try:
                      f(arg)
                  except _Demais:
                      pass
                  finally:
                      sys.settrace(None)
                  return passos[0]

              xs = [0] * 500 + list(range(1, 501))
              limite = 20 * len(xs)
              passos = _contar_linhas(mover_zeros, xs, limite)
              assert passos <= limite, f"com 500 zeros no começo de uma lista de 1 000, seu código executou mais de {limite} linhas: parece O(n²) (procurar o próximo valor ou deslocar a lista a cada zero). Com dois índices que só andam para a frente, cada elemento é visitado uma vez."
              assert xs == list(range(1, 501)) + [0] * 500, "resultado errado com 500 zeros no começo de uma lista de 1 000 elementos"
            `) },
            { name: 'poucas escritas (O(n))', code: dedent(`
              class ContaEscritas(list):
                  def __init__(self, valores):
                      super().__init__(valores)
                      self.escritas = 0
                  def __setitem__(self, i, v):
                      self.escritas += 1
                      super().__setitem__(i, v)
              valores = [0 if i % 2 == 0 else i for i in range(1000)]
              esperado = [x for x in valores if x != 0] + [0] * 500
              xs = ContaEscritas(valores)
              mover_zeros(xs)
              assert list(xs) == esperado, "resultado errado numa lista de 1 000 elementos com 500 zeros"
              assert xs.escritas <= 2 * len(xs), f"foram {xs.escritas} escritas numa lista de 1 000 elementos: parece que você desloca a lista a cada zero (O(n²)). Cada posição deveria ser escrita no máximo duas vezes."
            `) },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e3-2p-4',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `eh_palindromo(frase)` que diz se a frase se lê igual nos dois sentidos, **ignorando** tudo que não for letra ou dígito e sem diferenciar maiúsculas de minúsculas: `"A base do teto desaba"` dá `True`. Use O(1) de memória extra: compare direto na frase original, um caractere por vez, com dois ponteiros convergentes que pulam o que não interessa. Nada de montar uma frase limpa, chamar `lower()` na frase inteira, fatiar, `[::-1]`, `reversed`, `join` ou compreensões.',
          difficulty: 'intermediario',
          skills: ['ed-arrays', 'prog-strings'],
          hints: [
            'Onde começam os dois índices? Quando o laço pode parar com certeza de que é palíndromo?',
            'Se o caractere em `i` não é letra nem dígito, o que fazer com `i`, sem mexer em `j`? E o contrário?',
            '`str.isalnum()` diz se um caractere é letra ou dígito, e `str.lower()` ajuda a comparar sem diferenciar maiúsculas. Em cada volta, faça só uma coisa: pular em `i`, pular em `j` ou comparar.',
          ],
          explanation: 'Com `i` no começo e `j` no fim: se `frase[i]` não é alfanumérico, avance `i`; se `frase[j]` não é, recue `j`; senão compare em minúsculas e, se forem iguais, mova os dois. Cada volta move pelo menos um índice: O(n) de tempo e O(1) de memória, enquanto limpar a frase e comparar com `[::-1]` cria duas cópias dela. Curiosidade: "Socorram-me, subi no ônibus em Marrocos" só é palíndromo se você também tirar os acentos, porque "o" e "ô" são caracteres diferentes.',
          starter: dedent(`
            def eh_palindromo(frase):
                # i no começo, j no fim; pule o que não for letra ou dígito
                # e compare sem diferenciar maiúsculas de minúsculas
                pass
          `),
          solution: dedent(`
            def eh_palindromo(frase):
                i, j = 0, len(frase) - 1
                while i < j:
                    if not frase[i].isalnum():
                        i += 1
                    elif not frase[j].isalnum():
                        j -= 1
                    elif frase[i].lower() != frase[j].lower():
                        return False
                    else:
                        i += 1
                        j -= 1
                return True
          `),
          tests: [
            { name: 'frases palíndromas', code: 'for f in ["A base do teto desaba", "Anotaram a data da maratona", "Roma, me tem amor!", "A (torre) da derrota;", "\\"Ovo\\": ovo"]:\n    assert eh_palindromo(f) is True, f"{f!r} é palíndromo quando ignoramos espaços, pontuação e maiúsculas"' },
            { name: 'não palíndromos', code: 'for f in ["Alicerce", "ab", "Ovo frito", "abca"]:\n    assert eh_palindromo(f) is False, f"{f!r} não é palíndromo"' },
            { name: 'casos de borda', code: 'for f in ["", "a", "!!", "Aa", " ,a. "]:\n    assert eh_palindromo(f) is True, f"{f!r} deveria dar True (vazio, um caractere ou só pontuação contam como palíndromo)"' },
            { name: 'dígitos contam', code: 'assert eh_palindromo("12321") is True, "dígitos são comparados como letras"\nassert eh_palindromo("1231") is False, "\\"1231\\" não é palíndromo: os dígitos não podem ser ignorados"\nassert eh_palindromo("A1b-2B1a") is True, "\\"A1b-2B1a\\" é palíndromo: compare letras e dígitos, sem diferenciar maiúsculas"' },
            { name: 'sem inverter nem montar outra frase', code: dedent(`
              import ast

              def _monta_texto(no):
                  lados = [no.target, no.value] if isinstance(no, ast.AugAssign) else [no.left, no.right]
                  for x in lados:
                      if isinstance(x, (ast.Subscript, ast.JoinedStr)):
                          return True
                      if isinstance(x, ast.Constant) and isinstance(x.value, str):
                          return True
                      if isinstance(x, ast.Call) and getattr(x.func, "attr", "") in {"lower", "upper", "casefold"}:
                          return True
                  return False

              achados = set()
              for no in ast.walk(ast.parse(_source)):
                  if isinstance(no, ast.Call):
                      nome = no.func.id if isinstance(no.func, ast.Name) else getattr(no.func, "attr", "")
                      if nome in {"reversed", "reverse", "join", "list", "sorted"}:
                          achados.add(nome)
                  if isinstance(no, ast.Slice):
                      achados.add("fatia")
                  if isinstance(no, (ast.ListComp, ast.GeneratorExp, ast.SetComp, ast.DictComp)):
                      achados.add("compreensão")
                  if isinstance(no, (ast.AugAssign, ast.BinOp)) and isinstance(no.op, ast.Add) and _monta_texto(no):
                      achados.add("montar outra string com +")
              assert not achados, f"use dois índices sobre a própria frase, sem criar outra; evite: {', '.join(sorted(achados))}"
            `) },
            { name: 'direto na frase original', code: dedent(`
              class Frase(str):
                  usos = set()
                  def __iter__(self):
                      Frase.usos.add("for sobre a frase")
                      return super().__iter__()
                  def __getitem__(self, k):
                      if isinstance(k, slice):
                          Frase.usos.add("fatia")
                      return super().__getitem__(k)
                  def __str__(self):
                      Frase.usos.add("str(frase)")
                      return super().__str__()
                  def lower(self):
                      Frase.usos.add("frase.lower()")
                      return super().lower()
                  def upper(self):
                      Frase.usos.add("frase.upper()")
                      return super().upper()
                  def casefold(self):
                      Frase.usos.add("frase.casefold()")
                      return super().casefold()
                  def replace(self, *args):
                      Frase.usos.add("frase.replace()")
                      return super().replace(*args)
                  def translate(self, *args):
                      Frase.usos.add("frase.translate()")
                      return super().translate(*args)
                  def split(self, *args):
                      Frase.usos.add("frase.split()")
                      return super().split(*args)

              for texto, esperado in [("A base do teto desaba", True), ("Roma, me tem amor!", True), ("Alicerce", False)]:
                  Frase.usos = set()
                  r = eh_palindromo(Frase(texto))
                  assert not Frase.usos, f"compare a frase original caractere por caractere (frase[i], frase[j]), sem percorrê-la inteira nem copiá-la: a meta é O(1) de memória extra. Evite: {', '.join(sorted(Frase.usos))}"
                  assert r is esperado, f"eh_palindromo({texto!r}) deveria dar {esperado}; veio {r}"
            `) },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e3-2p-5',
          kind: 'parsons',
          lang: 'python',
          prompt: 'As listas `a` e `b` têm as matrículas dos alunos inscritos na monitoria de Cálculo e na de Programação, cada uma **ordenada e sem repetição**. Ordene as linhas de `intersecao(a, b)`, que devolve quem está nas duas, em O(len(a) + len(b)).',
          difficulty: 'intermediario',
          skills: ['ed-arrays'],
          hints: [
            'Se `a[i]` é menor que `b[j]`, `a[i]` ainda pode aparecer em `b` mais adiante? Qual índice deve andar?',
            'Só quando as duas frentes são iguais há um aluno comum. O que acontece com os dois índices nesse caso?',
          ],
          explanation: 'É o padrão de duas sequências: a frente menor não aparece no resto da outra lista (que só tem valores maiores), então pode ser descartada. Quando as frentes são iguais, o valor entra no resultado e os dois índices avançam. Cada volta avança pelo menos um índice: O(len(a) + len(b)), contra O(len(a) × len(b)) de testar `x in b` para cada x.',
          lines: [
            'def intersecao(a, b):',
            '    i, j, comuns = 0, 0, []',
            '    while i < len(a) and j < len(b):',
            '        if a[i] < b[j]:',
            '            i += 1',
            '        elif a[i] > b[j]:',
            '            j += 1',
            '        else:',
            '            comuns.append(a[i])',
            '            i, j = i + 1, j + 1',
            '    return comuns',
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e3-2p-desafio',
          kind: 'code',
          lang: 'python',
          prompt: 'Numa obra, tábuas verticais estão fincadas em linha reta, a 1 metro uma da outra; `alturas[i]` é a altura da tábua i. Escolhendo duas tábuas i < j, dá para represar água entre elas (as tábuas do meio não atrapalham): a área, vista de frente, é `(j - i) * min(alturas[i], alturas[j])`. Escreva `maior_area(alturas)` que devolve a maior área possível (0 se houver menos de duas tábuas) em **O(n)**: sem testar todos os pares e sem ordenar (ordenar já custaria O(n log n)).',
          difficulty: 'desafio',
          skills: ['ed-arrays'],
          hints: [
            'Comece com as duas tábuas das pontas: é o par mais largo. Para achar algo melhor você vai ter que estreitar. Qual das duas pontas vale a pena trocar?',
            'Suponha que a tábua da esquerda é a mais baixa das duas. Qualquer par que use essa tábua com outra mais para dentro tem largura menor; e a altura desse par fica limitada por quem?',
            'Se nenhum par com aquela tábua pode superar a área atual, ela pode ser descartada para sempre. É o mesmo argumento de descarte da soma alvo.',
            'E se as duas pontas tiverem a mesma altura? Teste sua ideia com `[4, 3, 2, 1, 4]`.',
          ],
          explanation: 'Com i e j nas pontas, suponha `alturas[i] <= alturas[j]`. Todo par (i, k) com i < k < j tem largura menor que j − i e altura no máximo `alturas[i]`, então uma área que não supera a atual. Logo i não participa de nenhum par melhor ainda não visto e pode ser descartado; o caso simétrico descarta j, e no empate qualquer um serve. Cada passo descarta uma tábua: n − 1 passos, O(n) de tempo e O(1) de memória, contra os n(n − 1)/2 pares da força bruta.',
          starter: dedent(`
            def maior_area(alturas):
                # comece com uma tábua em cada ponta e descarte uma por passo
                pass
          `),
          solution: dedent(`
            def maior_area(alturas):
                i, j = 0, len(alturas) - 1
                melhor = 0
                while i < j:
                    area = (j - i) * min(alturas[i], alturas[j])
                    if area > melhor:
                        melhor = area
                    if alturas[i] <= alturas[j]:
                        i += 1
                    else:
                        j -= 1
                return melhor
          `),
          tests: [
            { name: 'exemplo clássico', code: 'r = maior_area([1, 8, 6, 2, 5, 4, 8, 3, 7])\nassert r == 49, f"o melhor par é a tábua 1 (altura 8) com a 8 (altura 7): 7 × 7 = 49; veio {r}"' },
            { name: 'menos de duas tábuas', code: 'assert maior_area([]) == 0, "sem tábuas, a área é 0"\nassert maior_area([5]) == 0, "com uma tábua só não dá para represar: 0"' },
            { name: 'pares pequenos', code: 'for h, esperado in [([3, 3], 3), ([0, 0], 0), ([1, 2, 1], 2), ([1, 9, 9, 1], 9)]:\n    r = maior_area(h)\n    assert r == esperado, f"maior_area({h}) deveria ser {esperado}; veio {r}"' },
            { name: 'empates e pontas', code: 'for h, esperado in [([4, 3, 2, 1, 4], 16), ([6, 1, 1, 1, 1, 1, 1, 9, 9], 48), ([2, 3, 10, 5, 7, 8, 9], 36)]:\n    r = maior_area(h)\n    assert r == esperado, f"maior_area({h}) deveria ser {esperado}; veio {r}"' },
            { name: 'não altera a entrada', code: 'h = [3, 1, 2, 5]\ncopia = h[:]\nmaior_area(h)\nassert h == copia, "não modifique a lista de alturas: as posições das tábuas importam"' },
            { name: 'sem testar todos os pares (O(n))', code: dedent(`
              import sys

              class _Demais(BaseException):
                  pass

              def _contar_linhas(f, arg, limite):
                  passos = [0]
                  resultado = [None]
                  def rastro(frame, evento, _):
                      if frame.f_code.co_filename != "main.py":
                          return None
                      if evento == "line":
                          passos[0] += 1
                          if passos[0] > limite:
                              raise _Demais()
                      return rastro
                  sys.settrace(rastro)
                  try:
                      resultado[0] = f(arg)
                  except _Demais:
                      pass
                  finally:
                      sys.settrace(None)
                  return passos[0], resultado[0]

              alturas = [(i * 7919 + 13) % 1009 for i in range(1000)]
              limite = 30 * len(alturas)
              passos, r = _contar_linhas(maior_area, alturas, limite)
              assert passos <= limite, f"para 1 000 tábuas, maior_area executou mais de {limite} linhas: isso é testar todos os pares (O(n²)). Descarte uma tábua por passo."
              assert r == 965264, f"resultado errado para 1 000 tábuas: veio {r}"
            `) },
            { name: 'sem ordenar', code: dedent(`
              import ast
              achados = set()
              for no in ast.walk(ast.parse(_source)):
                  if isinstance(no, ast.Call):
                      nome = no.func.id if isinstance(no.func, ast.Name) else getattr(no.func, "attr", "")
                      if nome in {"sorted", "sort"}:
                          achados.add(nome)
              assert not achados, f"ordenar já custa O(n log n) e o pedido é O(n); evite: {', '.join(sorted(achados))}"
            `) },
          ],
        },
      },
    ],
    revisao: [
      md(`
        - Dois ponteiros: dois índices que nunca voltam; O(n) em vez de O(n²) pares, quase sempre com O(1) de memória.
        - **Convergentes**: um em cada ponta. Correção pelo descarte: cada passo elimina uma linha ou coluna inteira de pares. A soma alvo exige lista ordenada.
        - **Leitor e escritor**: \`xs[:escrita]\` guarda os elementos mantidos, na ordem. Filtra no lugar.
        - **Duas sequências**: avance a frente menor; intercalar e interseção em O(n + m).
        - Não remova itens de uma lista dentro de um \`for\` sobre ela.
      `),
      english(`
        - **two pointers**: dois ponteiros
        - **in place / in-place**: no lugar
        - **loop invariant**: invariante de laço
        - **to merge**: intercalar
        - **search space**: espaço de busca

        Frase típica de enunciado: *"Do this in-place with O(1) extra memory."*

        Frase típica de entrevista: *"Since the array is sorted, I use two pointers: if the sum is too small, I move the left pointer right; if it's too large, I move the right pointer left. Each step discards one candidate, so it runs in O(n) time."*
      `),
    ],
  },
  review: [
    ['Na soma alvo com dois ponteiros convergentes (lista ordenada), se xs[i] + xs[j] < alvo, por que é seguro descartar i?', 'Porque xs[i] somado a qualquer elemento até j dá no máximo xs[i] + xs[j], que já é pequeno demais: nenhum par com i ainda pode dar certo.'],
    ['Qual é o invariante do padrão leitor e escritor?', 'xs[:escrita] contém exatamente os elementos mantidos entre os já lidos, na ordem original (e escrita nunca passa de leitura).'],
    ['O que dá errado ao remover itens de uma lista dentro de um for sobre ela?', 'Os elementos seguintes se deslocam para a esquerda e o for avança a posição, então alguns são pulados; além disso, cada remove custa O(n).'],
    ['Qual o custo de intercalar duas listas ordenadas de tamanhos n e m, e por quê?', 'O(n + m): cada passo coloca um elemento na saída e nenhum índice volta.'],
    ['No problema da maior área, qual tábua você descarta a cada passo e por quê?', 'A mais baixa das duas pontas: qualquer par dela com uma tábua mais interna é mais estreito e tem altura limitada por ela, então não supera a área atual.'],
    ['Por que dois ponteiros é O(n) e não O(n²)?', 'Cada passo move pelo menos um índice, sempre no mesmo sentido; o total de passos é limitado pelo tamanho da entrada.'],
  ],
  references: ['clrs', 'sedgewick-algs', 'mit-6006'],
});

export const lessons: Lesson[] = [crescimento, doisPonteiros];
