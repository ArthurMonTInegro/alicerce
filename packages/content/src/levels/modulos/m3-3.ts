/** Lições adicionais do módulo m3-3 (tabelas hash). */
import type { Lesson } from '../../types.ts';
import { dedent, deep, english, lesson, md, py, t, tip, trace, warn } from '../../helpers.ts';

/* ------------------------------------------------------------------ */
/* Lição 2: colisões por dentro (endereçamento aberto e fator de carga) */
/* ------------------------------------------------------------------ */

const enderecamentoAberto = lesson({
  id: 'l3-enderecamento-aberto',
  moduleId: 'm3-3',
  title: 'Colisões por dentro: endereçamento aberto e fator de carga',
  titleEn: 'Collisions up close: open addressing and load factor',
  summary: 'Por que colisões são inevitáveis, como a sondagem linear resolve conflitos sem listas, por que remover exige lápides e como o fator de carga decide o custo de cada busca e a hora de reconstruir a tabela.',
  minutes: 45,
  objectives: [
    'Explicar, com o paradoxo do aniversário, por que colisões acontecem mesmo com uma boa função hash',
    'Inserir, buscar e remover à mão numa tabela com sondagem linear, inclusive com lápides',
    'Relacionar o fator de carga ao número esperado de sondagens e justificar o limite de 2/3 do dict',
    'Distinguir crescer a tabela de apenas limpar as lápides, e explicar por que a reconstrução custa O(1) amortizado',
  ],
  skills: ['ed-hash'],
  terms: [
    t('encadeamento', 'separate chaining', 'Estratégia de colisão em que cada posição da tabela guarda uma lista com todas as chaves que caíram nela.'),
    t('endereçamento aberto', 'open addressing', 'Estratégia de colisão em que cada posição guarda no máximo uma chave; se a posição está ocupada, procura-se outra seguindo uma regra fixa.', 'CPython dictionaries use open addressing to resolve hash collisions.'),
    t('sondagem linear', 'linear probing', 'Regra de endereçamento aberto que, depois da posição de origem, tenta a seguinte (i + 1, i + 2, ...), dando a volta no fim do array.'),
    t('sequência de sondagem', 'probe sequence', 'Ordem das posições visitadas ao inserir ou procurar uma chave.'),
    t('lápide', 'tombstone', 'Marca deixada na posição de uma chave removida, para que as buscas continuem passando por ali.', 'Deleted entries are replaced by a dummy (tombstone) so that probe sequences are not broken.'),
    t('agrupamento primário', 'primary clustering', 'Tendência da sondagem linear de formar blocos contíguos de posições ocupadas, que crescem e deixam as buscas cada vez mais longas.'),
    t('paradoxo do aniversário', 'birthday paradox', 'Com só 23 pessoas, a chance de duas fazerem aniversário no mesmo dia passa de 50%; com m posições, cerca de 1,2·√m chaves já dão 50% de chance de colisão.'),
    t('reconstrução', 'rehashing', 'Criar um array novo e reinserir nele todas as chaves vivas; acontece para crescer a tabela ou para limpar lápides.', 'When the load factor exceeds the threshold, the table is resized and every entry is rehashed.'),
  ],
  stages: {
    conceito: [
      md(`
        Na lição anterior, você resolveu colisões guardando uma lista em cada posição da tabela: o {{encadeamento|separate chaining}}. A lição citou a alternativa que o \`dict\` e o \`set\` do Python usam, o {{endereçamento aberto|open addressing}}; agora é hora de vê-la por dentro. Cada posição do array guarda **no máximo uma** chave; se a posição calculada já está ocupada, a tabela tenta outra, sempre seguindo a mesma regra. Fica tudo num único array, sem listas extras, o que gasta menos memória e aproveita melhor o cache.

        Esse desenho cobra um preço em três lugares, e eles são o assunto desta lição: a tabela nunca pode encher (o fator de carga fica sempre abaixo de 1), **remover** uma chave exige um truque e o custo de cada busca dispara quando a tabela fica cheia demais. É por isso que o \`dict\` cresce bem antes de lotar.
      `),
    ],
    explicacao: [
      md(`
        ### Colisões são inevitáveis
        Nem uma função hash perfeita evita colisões. Pense no {{paradoxo do aniversário|birthday paradox}}: numa sala com só **23 pessoas**, a chance de duas fazerem aniversário no mesmo dia já passa de 50%, embora o ano tenha 365 dias. Com chaves espalhadas ao acaso por *m* posições, a chance de haver alguma colisão chega a 50% com cerca de **1,2·√m** chaves. Numa tabela com 1 milhão de posições, bastam umas 1.200 chaves. A pergunta certa, então, não é "como evitar colisões?", e sim "como lidar com elas gastando pouco?".

        ### Sondagem linear: tente a próxima
        A forma mais simples de endereçamento aberto é a {{sondagem linear|linear probing}}. A {{sequência de sondagem|probe sequence}} de uma chave começa na posição de origem \`i = hash(chave) % m\` e continua em \`i + 1\`, \`i + 2\` e assim por diante, dando a volta no fim do array com \`(i + 1) % m\`.

        - **Inserir**: siga a sequência até achar a própria chave (aí basta trocar o valor) ou uma posição vazia (grave ali).
        - **Buscar**: siga a mesma sequência. Achou a chave: pronto. Achou uma posição **vazia**: a chave não existe, porque, se existisse, teria sido gravada naquele vazio ou antes dele.

        Esse "ou antes dele" é o invariante que sustenta tudo: **entre a posição de origem de uma chave e a posição onde ela está, nenhuma posição está vazia**.

        ### Remover: a lápide
        Apagar a chave, pondo \`None\` na posição, quebra o invariante. Uma busca por outra chave que precisou passar por ali para ser gravada vai parar no buraco e concluir, errado, que a chave não existe. A saída é trocar a chave removida por uma {{lápide|tombstone}}: uma marca que diz "já teve alguém aqui, continue procurando".

        - A **busca** passa por cima das lápides e só para na chave ou numa posição vazia.
        - A **inserção** pode reaproveitar a primeira lápide do caminho, mas só **depois** de conferir que a chave não está mais adiante. Senão, a mesma chave fica duas vezes na tabela.
        - Lápides ocupam lugar: uma tabela com poucas chaves e muitas lápides tem buscas tão longas quanto uma tabela cheia. Por isso elas **contam** na hora de decidir se é preciso reconstruir.

        ### Agrupamento primário
        Na sondagem linear, as posições ocupadas tendem a formar blocos contíguos. Uma chave que cai em qualquer ponto de um bloco vai parar no fim dele e o aumenta, e blocos vizinhos acabam se fundindo. É o {{agrupamento primário|primary clustering}}: bloco grande atrai mais chaves, e as buscas que caem nele ficam longas. Por isso o custo não cresce em linha reta com a ocupação: ele explode quando a tabela se aproxima de cheia.

        ### Fator de carga e custo
        Com *n* chaves num array de *m* posições, o fator de carga é **α = n/m**. No endereçamento aberto, α < 1 sempre: cada posição guarda uma chave só. (Se houver lápides, conte-as junto: para a busca, elas ocupam lugar como chaves.) Supondo que a função hash espalhe as chaves ao acaso, Donald Knuth calculou quantas posições a sondagem linear visita em média:
      `),
      {
        type: 'table',
        head: ['α (ocupação)', 'Encadeamento, busca sem sucesso: ≈ 1 + α', 'Sondagem linear, busca com sucesso: ≈ ½(1 + 1/(1 − α))', 'Sondagem linear, busca sem sucesso: ≈ ½(1 + 1/(1 − α)²)'],
        rows: [
          ['0,25', '1,25', '1,17', '1,39'],
          ['0,50', '1,5', '1,5', '2,5'],
          ['2/3 ≈ 0,67', '1,67', '2,0', '5,0'],
          ['0,75', '1,75', '2,5', '8,5'],
          ['0,90', '1,9', '5,5', '50,5'],
          ['0,99', '1,99', '50,5', '5.000,5'],
        ],
        caption: 'Médias esperadas em tabelas grandes com chaves bem espalhadas. No encadeamento, conta-se o balde mais os α itens da lista, e α pode até passar de 1; na sondagem linear, contam-se as posições visitadas, incluindo o vazio onde a busca sem sucesso para.',
      },
      md(`
        Olhe as últimas linhas: com 90% de ocupação, uma busca por chave ausente visita 50 posições em média; com 99%, 5.000. Com 2/3, são 5 posições na busca sem sucesso e 2 na busca com sucesso. Esse é o motivo do limite do \`dict\`: o CPython mantém no máximo 2/3 das posições em uso e, quando passaria disso, faz uma {{reconstrução|rehashing}}.

        ### Crescer ou só limpar
        Reconstruir é criar um array novo e reinserir nele **só as chaves vivas**. As lápides somem, e as chaves mudam de lugar, porque \`hash(chave) % m\` depende de *m*. O tamanho novo deve ser decidido pelas chaves vivas: se a ocupação vinha quase toda de lápides, um array do **mesmo** tamanho basta, e a reconstrução só faz faxina.

        Reconstruir custa O(m), mas, logo depois de uma reconstrução, a ocupação fica em torno de 1/3 ou menos, e são necessárias pelo menos umas m/3 inserções em posições vazias para ela chegar de novo a 2/3. Espalhado por essas operações, o custo dá **O(1) amortizado** por operação, a mesma conta do \`append\` da lista dinâmica.
      `),
      warn(`
        Num \`dict\` ou \`set\`, operações valem O(1) **em média** e **amortizado**. Uma busca específica pode visitar várias posições, e uma inserção específica pode disparar uma reconstrução O(n). Quando cada operação precisa ser rápida, como num jogo que desenha 60 quadros por segundo, esse pico eventual importa.
      `, 'O(1) não é sempre'),
      deep(`
        - **Sondagem com perturbação**: o CPython não anda de 1 em 1. A variável \`perturb\` começa igual ao hash inteiro e, a cada passo, perde 5 bits (\`perturb >>= 5\`); a próxima posição é \`i = (5*i + 1 + perturb) % m\`. Assim os bits altos do hash também influenciam o caminho, e o agrupamento primário praticamente some. Quando \`perturb\` chega a zero, a regra \`5*i + 1\` passa por todas as posições de uma tabela cujo tamanho é potência de 2.
        - **Ordem de inserção**: desde o Python 3.7, o \`dict\` lembra a ordem em que as chaves entraram. O truque são dois arrays: um de índices, esparso, onde acontece a sondagem, e um de entradas, compacto, na ordem de inserção. A sondagem descobre "é a entrada nº 3"; a iteração percorre as entradas em ordem.
        - **Hash anotado**: o CPython não recalcula o hash das chaves que já estão na tabela; ele fica guardado (na entrada ou, no caso de strings, no próprio objeto). Isso barateia a reconstrução e permite comparar hashes antes de chamar \`==\`.
      `, 'Como o dict do CPython faz'),
    ],
    exemplo: [
      md(`
        Uma tabela com **m = 8** posições e chaves inteiras. No CPython, \`hash(n) == n\` para inteiros não negativos pequenos, então a posição de origem é simplesmente \`n % 8\`. Na última coluna, \`·\` é posição vazia e \`†\` é lápide.
      `),
      {
        type: 'table',
        head: ['Operação', 'Posições visitadas', 'O que acontece', 'Tabela (posições 0 a 7)'],
        rows: [
          ['`put(3)`', '3', 'vazia: grava', '`· · · 3 · · · ·`'],
          ['`put(11)`', '3, 4', '11 % 8 = 3, ocupada pelo 3; grava na 4', '`· · · 3 11 · · ·`'],
          ['`put(19)`', '3, 4, 5', 'mesma origem 3; grava na 5', '`· · · 3 11 19 · ·`'],
          ['`put(4)`', '4, 5, 6', 'nenhuma outra chave tem origem 4, mas o bloco 3–5 cresceu por cima dela: grava na 6 (agrupamento primário)', '`· · · 3 11 19 4 ·`'],
          ['`remove(11)`', '3, 4', 'acha o 11 na posição 4 e põe uma lápide', '`· · · 3 † 19 4 ·`'],
          ['`get(19)`', '3, 4, 5', 'a lápide não para a busca: acha na 5', '(igual)'],
          ['`put(19, novo)`', '3, 4, 5', 'anota a lápide da 4, mas continua: o 19 está na 5 e é atualizado ali', '(igual)'],
          ['`put(27)`', '3, 4, 5, 6, 7', '27 % 8 = 3; chega ao vazio da 7 sem achar o 27; grava na primeira lápide do caminho, a 4', '`· · · 3 27 19 4 ·`'],
          ['`get(35)`', '3, 4, 5, 6, 7', '35 % 8 = 3; chega ao vazio da 7: o 35 não existe', '(igual)'],
        ],
        caption: 'Cada linha começa da tabela deixada pela linha anterior.',
      },
      md(`
        Agora imagine que o \`remove(11)\` tivesse posto \`None\` na posição 4. O \`get(19)\` olharia a 3 (é o 3, não o 19), depois a 4 (vazia) e pararia dizendo que o 19 não existe, embora ele esteja na 5. E o \`put(19, novo)\` gravaria um **segundo** 19 na posição 4. A lápide evita os dois erros.
      `),
    ],
    codigo: [
      md('O programa abaixo enche tabelas de 4.096 posições com chaves aleatórias até vários fatores de carga e mede quantas posições uma busca por chave ausente visita. Compare com a fórmula da tabela de custos.'),
      py(`
        import random

        def inserir(tabela, chave):
            m = len(tabela)
            i = hash(chave) % m
            while tabela[i] is not None and tabela[i] != chave:
                i = (i + 1) % m                  # sondagem linear, com volta
            tabela[i] = chave

        def sondagens_sem_sucesso(tabela, chave):
            m = len(tabela)
            i = hash(chave) % m
            passos = 1
            while tabela[i] is not None:         # só para no vazio
                i = (i + 1) % m
                passos += 1
            return passos

        random.seed(2024)
        m = 4096
        print("   α   medido   previsto")
        for alfa in [0.25, 0.5, 2 / 3, 0.75, 0.9]:
            tabela = [None] * m
            for k in random.sample(range(10**9), int(alfa * m)):
                inserir(tabela, k)
            ausentes = random.sample(range(10**9, 2 * 10**9), 2000)
            media = sum(sondagens_sem_sucesso(tabela, k) for k in ausentes) / len(ausentes)
            previsto = 0.5 * (1 + 1 / (1 - alfa) ** 2)
            print(f"{alfa:5.2f} {media:8.2f} {previsto:9.2f}")
      `, { caption: 'Com 90% de ocupação, a medida varia bastante de uma semente para outra: poucos blocos enormes dominam a média.' }),
      py(`
        import sys

        d = {}
        tamanho = sys.getsizeof(d)
        print(f"{len(d):>3} chaves: {tamanho} bytes")
        for i in range(100):
            d[i] = i
            novo = sys.getsizeof(d)
            if novo != tamanho:                  # a tabela foi alocada ou reconstruída
                print(f"{len(d):>3} chaves: {novo} bytes")
                tamanho = novo
      `, { caption: 'O dict cresce aos saltos. O primeiro, na 1ª chave, é só a criação da tabela inicial de 8 posições. Os seguintes, no CPython, costumam vir na 6ª, 11ª, 22ª, 43ª e 86ª chave: é quando tabelas de 8, 16, 32, 64 e 128 posições passariam de 2/3 (cabem 5, 10, 21, 42 e 85). Os bytes exatos mudam com a versão e a plataforma.' }),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e3-ea-1',
          kind: 'mcq',
          prompt: 'Numa tabela com sondagem linear e lápides, em que momento uma busca pode concluir que a chave **não existe**?',
          difficulty: 'facil',
          skills: ['ed-hash'],
          hints: [
            'Qual é o invariante da sondagem linear: o que nunca existe entre a posição de origem de uma chave e a posição onde ela está?',
            'Qual das situações garante que a chave procurada não pode estar mais adiante no caminho?',
          ],
          explanation: 'Pelo invariante, entre a origem de uma chave e a posição dela não há vazios. Logo, se a busca chega a um vazio, a chave não está mais adiante. Lápides, chaves de outras origens e colisões na origem não dizem nada: a busca precisa continuar.',
          options: [
            { text: 'Quando chega a uma posição vazia (que nunca foi usada)', correct: true, feedback: 'Isso: se a chave existisse, ela teria sido gravada naquele vazio ou antes dele.' },
            { text: 'Quando chega a uma lápide', feedback: 'A lápide quer dizer "já teve alguém aqui, continue". A chave pode estar logo depois, como o 19 depois da lápide da posição 4 no exemplo.' },
            { text: 'Quando encontra uma chave cuja posição de origem é outra', feedback: 'Chaves de outras origens podem estar no meio do bloco, como o 4 na posição 6 do exemplo. Encontrar uma delas não encerra nada: continue.' },
            { text: 'Quando a posição de origem está ocupada por outra chave', feedback: 'Isso só mostra que houve colisão. No endereçamento aberto não há lista no balde: a chave procurada pode estar nas posições seguintes.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e3-ea-2',
          kind: 'predict',
          lang: 'python',
          prompt: 'Inserção com sondagem linear numa tabela de 7 posições, sem remoções. O que é impresso?',
          difficulty: 'intermediario',
          skills: ['ed-hash'],
          hints: [
            'Desenhe as posições 0 a 6 e insira uma chave por vez. Qual é a origem (k % 7) de cada uma?',
            'Quatro chaves têm a mesma origem. E o 5: o que acontece quando a sondagem passa da última posição?',
          ],
          explanation: '10, 3, 17 e 24 têm origem 3 (são 3 mais múltiplos de 7) e ocupam as posições 3, 4, 5 e 6. O 5 tem origem 5, que o 17 já tomou: ele não colidiu com nenhuma chave de mesma origem, e sim com o bloco que cresceu por cima dela (agrupamento primário). Passa pela 6 e dá a volta, porque `(6 + 1) % 7 == 0`.',
          code: dedent(`
            m = 7
            t = [None] * m
            for k in [10, 3, 17, 24, 5]:
                i = k % m
                while t[i] is not None:
                    i = (i + 1) % m
                t[i] = k
            print(t)
          `),
          answer: '[5, None, None, 10, 3, 17, 24]',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e3-ea-3',
          kind: 'mcq',
          prompt: 'Uma tabela com sondagem linear tem 1.000 posições e 900 chaves bem espalhadas. Em média, quantas posições uma busca por uma chave **ausente** visita?',
          difficulty: 'intermediario',
          skills: ['ed-hash'],
          hints: [
            'Qual é o fator de carga α dessa tabela?',
            'Que fórmula da tabela de custos vale para a busca sem sucesso? Quanto dá 1 − α, e o que acontece quando ele aparece ao quadrado no denominador?',
          ],
          explanation: 'Com α = 0,9, a busca sem sucesso custa ≈ ½(1 + 1/(1 − 0,9)²) = ½(1 + 100) ≈ 50 posições. Ela precisa atravessar o bloco inteiro até um vazio, e com 90% de ocupação os blocos são enormes. Por isso implementações reais reconstroem a tabela bem antes: o dict do CPython, em 2/3.',
          options: [
            { text: 'Cerca de 2', feedback: 'Perto de 1 + α = 1,9 é o custo do encadeamento, em que a busca só percorre a lista de um balde. Na sondagem linear, a busca sem sucesso atravessa o bloco inteiro até achar um vazio, e a 90% de ocupação o agrupamento primário deixa os blocos enormes.' },
            { text: 'Cerca de 5', feedback: 'Perto de 5,5 é o custo da busca **com sucesso** a 90%. A busca sem sucesso precisa chegar ao fim do bloco, e a fórmula dela tem (1 − α) ao quadrado.' },
            { text: 'Cerca de 50', correct: true, feedback: 'Isso: ½(1 + 1/0,1²) = ½(1 + 100) ≈ 50.' },
            { text: 'Cerca de 900', feedback: 'Esse é o pior caso (todas as chaves num único bloco), não a média com chaves bem espalhadas.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e3-ea-4',
          kind: 'code',
          lang: 'python',
          prompt: 'A tabela usa sondagem linear e é uma lista em que cada posição é `None` (nunca usada), `LAPIDE` (chave removida) ou uma tupla `(chave, valor)`. Escreva `buscar(tabela, chave)`, que devolve o valor associado à chave ou lança `KeyError`. A origem é `hash(chave) % len(tabela)`. Cuidado com a volta no fim da lista e com tabelas sem nenhum `None` (só chaves e lápides): a busca não pode girar para sempre.',
          difficulty: 'intermediario',
          skills: ['ed-hash'],
          hints: [
            'Em quais situações a busca termina? Liste todas, inclusive a que não depende do conteúdo da posição.',
            'Antes de olhar `item[0]`, o que você precisa saber sobre o item? Dá para indexar uma lápide?',
            'Quantas posições, no máximo, uma busca precisa visitar antes de ter certeza de que já viu a tabela inteira?',
          ],
          explanation: 'A busca para em três casos: achou a chave (devolve o valor), achou um `None` (a chave não existe, pelo invariante) ou já visitou as m posições (tabela sem vazios). Lápides são puladas, e é preciso compará-las com `is LAPIDE` antes de olhar `item[0]`. Parar no primeiro `None` é o que faz a busca sem sucesso custar pouco quando a tabela não está cheia.',
          starter: dedent(`
            LAPIDE = object()  # marca de chave removida

            def buscar(tabela, chave):
                # comece em hash(chave) % len(tabela) e siga a sondagem linear
                pass
          `),
          solution: dedent(`
            LAPIDE = object()  # marca de chave removida

            def buscar(tabela, chave):
                m = len(tabela)
                i = hash(chave) % m
                for _ in range(m):
                    item = tabela[i]
                    if item is None:
                        break
                    if item is not LAPIDE and item[0] == chave:
                        return item[1]
                    i = (i + 1) % m
                raise KeyError(chave)
          `),
          tests: [
            {
              name: 'acha na origem e depois de colisões',
              code: dedent(`
                t = [None] * 8
                t[3] = (3, "a"); t[4] = (11, "b"); t[5] = (19, "c"); t[6] = (4, "d")
                for k, v in [(3, "a"), (11, "b"), (19, "c"), (4, "d")]:
                    r = buscar(t, k)
                    assert r == v, f"buscar(t, {k}) devolveu {r!r}; esperado {v!r}"
              `),
            },
            {
              name: 'chave ausente lança KeyError',
              code: dedent(`
                t = [None] * 8
                t[3] = (3, "a"); t[4] = (11, "b")
                for k in [27, 0, 5]:
                    try:
                        r = buscar(t, k)
                    except KeyError:
                        continue
                    assert False, f"buscar(t, {k}) devolveu {r!r}; deveria lançar KeyError"
              `),
            },
            {
              name: 'passa por cima das lápides',
              code: dedent(`
                t = [None] * 8
                t[3] = (3, "a"); t[4] = LAPIDE; t[5] = (19, "c"); t[6] = (4, "d")
                r = buscar(t, 19)
                assert r == "c", f"buscar(t, 19) devolveu {r!r}; a lápide na posição 4 não pode parar a busca"
                assert buscar(t, 4) == "d", "buscar(t, 4) deveria achar o 4 na posição 6, depois da lápide"
                try:
                    buscar(t, 11)
                    assert False, "o 11 foi removido (há uma lápide no lugar): buscar(t, 11) deveria lançar KeyError"
                except KeyError:
                    pass
              `),
            },
            {
              name: 'para na primeira posição vazia',
              code: dedent(`
                t = [None] * 8
                t[2] = (1, "x")  # a origem do 1 é a posição 1, que está vazia
                try:
                    r = buscar(t, 1)
                    assert False, f"buscar(t, 1) devolveu {r!r}: a busca deve parar no primeiro vazio do caminho (posição 1), porque, se a chave existisse, estaria antes dele"
                except KeyError:
                    pass
              `),
            },
            {
              name: 'dá a volta no fim da lista',
              code: dedent(`
                t = [None] * 8
                t[7] = (7, "sete"); t[0] = (15, "quinze")  # 15 % 8 == 7, ocupada: foi para a 0
                r = buscar(t, 15)
                assert r == "quinze", f"buscar(t, 15) devolveu {r!r}; depois da posição 7 vem a 0"
              `),
            },
            {
              name: 'funciona com chaves de texto',
              code: dedent(`
                def _poe(t, k, v):
                    i = hash(k) % len(t)
                    while t[i] is not None:
                        i = (i + 1) % len(t)
                    t[i] = (k, v)
                t = [None] * 16
                for nome, cep in [("ana", "01310-100"), ("bia", "20040-002"), ("caio", "70040-010"), ("davi", "40020-000")]:
                    _poe(t, nome, cep)
                assert buscar(t, "caio") == "70040-010", "não achou a chave 'caio'"
                assert buscar(t, "ana") == "01310-100", "não achou a chave 'ana'"
                try:
                    buscar(t, "eva")
                    assert False, "buscar(t, 'eva') deveria lançar KeyError"
                except KeyError:
                    pass
              `),
            },
            {
              name: 'tabela sem nenhum vazio: visita as m posições e não trava',
              code: dedent(`
                class _Tabela(list):
                    leituras = 0
                    def __getitem__(self, i):
                        self.leituras += 1
                        assert self.leituras <= 40, "a busca já fez mais de 40 leituras numa tabela de 4 posições e não parou: numa tabela sem nenhum None, desista depois de visitar as m posições"
                        return list.__getitem__(self, i)
                t = _Tabela([LAPIDE] * 4)
                t[2] = (6, "seis")    # origem 2
                t[0] = (5, "cinco")   # origem 1: o caminho foi 1, 2, 3 e deu a volta até a 0
                try:
                    r = buscar(t, 5)
                except KeyError:
                    raise AssertionError("buscar(t, 5) lançou KeyError, mas o 5 está na posição 0: o caminho dele é 1, 2, 3, 0, e a busca precisa visitar todas as m posições (não m - 1) antes de desistir") from None
                assert r == "cinco", f"buscar(t, 5) devolveu {r!r}; esperado 'cinco'"
                t.leituras = 0
                try:
                    buscar(t, 2)
                    assert False, "buscar(t, 2) deveria lançar KeyError depois de visitar as 4 posições"
                except KeyError:
                    pass
              `),
            },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e3-ea-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Implemente \`TabelaAberta\`, um dicionário com endereçamento aberto e sondagem linear. O \`__init__\` já está pronto e fixa a representação: \`self.slots\` é uma lista de \`self.m\` posições, cada uma \`None\` (nunca usada), \`LAPIDE\` (chave removida) ou uma tupla \`(chave, valor)\`; \`self.n\` conta as chaves vivas e \`self.lapides\`, as lápides. A origem de uma chave é \`hash(chave) % self.m\`.

            - \`get(chave)\`: devolve o valor ou lança \`KeyError\`.
            - \`put(chave, valor)\`: se a chave existe, troca o valor no mesmo lugar; senão, grava na **primeira lápide** do caminho ou, se não houver lápide, na posição vazia onde a busca parou. Depois, se \`(n + lapides) / m\` passar de **2/3**, reconstrua.
            - \`remove(chave)\`: troca a entrada por \`LAPIDE\`; lança \`KeyError\` se a chave não existe.
            - **Reconstruir**: se mais de 1/3 das posições tem chave viva (\`n / m > 1/3\`), use o dobro de posições; senão, mantenha \`m\` (só limpa as lápides). Recomece com todas as posições \`None\` e reinsira apenas as chaves vivas.

            Não use \`dict\` nem \`set\`.
          `),
          difficulty: 'desafio',
          skills: ['ed-hash'],
          hints: [
            'As três operações começam com a mesma caminhada a partir da origem. O que cada uma precisa saber quando a caminhada termina?',
            'No `put`, por que não dá para gravar na primeira lápide assim que ela aparece? O que ainda pode estar mais adiante no caminho?',
            'Uma função auxiliar pode caminhar até achar a chave ou um `None` e devolver duas posições: onde a chave está (se estiver) e a primeira posição livre vista (lápide ou o próprio `None`). Ela serve às três operações.',
            'Na reconstrução, separe as entradas vivas antes de mexer em qualquer coisa, decida o novo `m` olhando só `self.n`, recrie `slots`, zere os dois contadores e reinsira com o próprio `put`.',
          ],
          explanation: 'A caminhada comum é o coração da estrutura: ela só para na chave ou num vazio, nunca numa lápide, e lembra a primeira lápide para reaproveitar. Reaproveitar só depois de conferir o resto do caminho evita chaves duplicadas. Contar lápides no limite impede que a tabela se encha delas até não sobrar nenhum vazio, o que faria a busca girar para sempre. E decidir o tamanho novo pelas chaves vivas separa crescer de faxinar: depois de qualquer reconstrução a ocupação fica em cerca de 1/3 ou menos, faltam pelo menos umas m/3 inserções até a próxima, e o custo O(m) dela se dilui em O(1) amortizado.',
          starter: dedent(`
            LAPIDE = object()  # marca de chave removida

            class TabelaAberta:
                def __init__(self, m=8):
                    self.m = m
                    self.slots = [None] * m   # None, LAPIDE ou (chave, valor)
                    self.n = 0                # chaves vivas
                    self.lapides = 0          # posições com LAPIDE

                def get(self, chave):
                    pass

                def put(self, chave, valor):
                    pass

                def remove(self, chave):
                    pass

                def __len__(self):
                    return self.n
          `),
          solution: dedent(`
            LAPIDE = object()  # marca de chave removida

            class TabelaAberta:
                def __init__(self, m=8):
                    self.m = m
                    self.slots = [None] * m   # None, LAPIDE ou (chave, valor)
                    self.n = 0                # chaves vivas
                    self.lapides = 0          # posições com LAPIDE

                def _caminhar(self, chave):
                    """Devolve (posição da chave ou None, primeira posição livre do caminho)."""
                    i = hash(chave) % self.m
                    livre = None
                    while True:
                        item = self.slots[i]
                        if item is None:
                            return None, (i if livre is None else livre)
                        if item is LAPIDE:
                            if livre is None:
                                livre = i
                        elif item[0] == chave:
                            return i, livre
                        i = (i + 1) % self.m

                def get(self, chave):
                    pos, _ = self._caminhar(chave)
                    if pos is None:
                        raise KeyError(chave)
                    return self.slots[pos][1]

                def put(self, chave, valor):
                    pos, livre = self._caminhar(chave)
                    if pos is not None:
                        self.slots[pos] = (chave, valor)
                        return
                    if self.slots[livre] is LAPIDE:
                        self.lapides -= 1
                    self.slots[livre] = (chave, valor)
                    self.n += 1
                    if (self.n + self.lapides) * 3 > 2 * self.m:
                        self._reconstruir()

                def remove(self, chave):
                    pos, _ = self._caminhar(chave)
                    if pos is None:
                        raise KeyError(chave)
                    self.slots[pos] = LAPIDE
                    self.n -= 1
                    self.lapides += 1

                def _reconstruir(self):
                    vivas = [item for item in self.slots if item is not None and item is not LAPIDE]
                    if self.n * 3 > self.m:
                        self.m *= 2
                    self.slots = [None] * self.m
                    self.n = 0
                    self.lapides = 0
                    for chave, valor in vivas:
                        self.put(chave, valor)

                def __len__(self):
                    return self.n
          `),
          tests: [
            {
              name: 'put, get e atualização',
              code: dedent(`
                t = TabelaAberta()
                t.put("a", 1); t.put("b", 2); t.put("a", 3)
                assert t.get("a") == 3, f"get('a') devolveu {t.get('a')!r}; o segundo put deveria ter trocado o valor para 3"
                assert t.get("b") == 2, "get('b') deveria devolver 2"
                assert len(t) == 2, f"len(t) == {len(t)}; atualizar uma chave não cria outra"
                try:
                    t.get("z")
                    assert False, "get('z') deveria lançar KeyError"
                except KeyError:
                    pass
              `),
            },
            {
              name: 'sondagem linear nas posições certas',
              code: dedent(`
                t = TabelaAberta(8)
                for k in [3, 11, 19, 4]:
                    t.put(k, str(k))
                pos = {it[0]: i for i, it in enumerate(t.slots) if it is not None and it is not LAPIDE}
                assert pos == {3: 3, 11: 4, 19: 5, 4: 6}, f"posições {pos}; esperado 3→3, 11→4, 19→5, 4→6 (origem k % 8 e depois a próxima posição)"
              `),
            },
            {
              name: 'get segue a sondagem e para no primeiro vazio',
              code: dedent(`
                t = TabelaAberta(8)
                t.slots[2] = (1, "fora do caminho")   # a origem do 1 é a posição 1, que está vazia
                t.n = 1
                try:
                    r = t.get(1)
                    assert False, f"get(1) devolveu {r!r}, mas a origem do 1 (posição 1) está vazia: a busca começa em hash(chave) % m e para no primeiro None, sem varrer a tabela inteira"
                except KeyError:
                    pass
              `),
            },
            {
              name: 'remove deixa lápide e a busca continua',
              code: dedent(`
                t = TabelaAberta(8)
                for k in [3, 11, 19, 4]:
                    t.put(k, str(k))
                t.remove(11)
                assert t.slots[4] is LAPIDE, f"depois de remove(11), a posição 4 deveria ter LAPIDE, e tem {t.slots[4]!r}"
                assert t.get(19) == "19" and t.get(4) == "4", "a lápide na posição 4 não pode interromper a busca pelo 19 e pelo 4"
                assert len(t) == 3 and t.lapides == 1, f"len(t) == {len(t)} e lapides == {t.lapides}; esperado 3 e 1"
                for acao in ("get", "remove"):
                    try:
                        getattr(t, acao)(11)
                        assert False, f"{acao}(11) depois da remoção deveria lançar KeyError"
                    except KeyError:
                        pass
              `),
            },
            {
              name: 'put não duplica a chave nem desperdiça a lápide',
              code: dedent(`
                t = TabelaAberta(8)
                for k in [3, 11, 19, 4]:
                    t.put(k, str(k))
                t.remove(11)
                t.put(19, "novo")
                copias = sum(1 for it in t.slots if it is not None and it is not LAPIDE and it[0] == 19)
                assert copias == 1, f"o 19 aparece {copias} vezes em slots: antes de usar a lápide, confira se a chave está mais adiante"
                assert t.get(19) == "novo" and len(t) == 3, "put(19, 'novo') deveria só atualizar o valor"
                t.put(27, "x")
                assert t.slots[4] is not LAPIDE and t.slots[4][0] == 27, f"o 27 (origem 3) deveria reaproveitar a lápide da posição 4; slots[4] = {t.slots[4]!r}"
                assert t.lapides == 0 and len(t) == 4, f"lapides == {t.lapides} e len(t) == {len(t)}; esperado 0 e 4"
              `),
            },
            {
              name: 'cresce ao passar de 2/3 e mantém tudo',
              code: dedent(`
                t = TabelaAberta(8)
                for k in range(5):
                    t.put(k, k)
                assert t.m == 8, f"com 5 chaves em 8 posições (5/8 < 2/3), m deveria continuar 8, e é {t.m}"
                t.put(5, 5)
                assert t.m == 16, f"a 6ª chave passa de 2/3 de 8: m deveria dobrar para 16, e é {t.m}"
                t = TabelaAberta(8)
                for k in range(100):
                    assert None in t.slots, f"antes de inserir a chave {k}, a tabela (m = {t.m}) já não tinha nenhuma posição vazia: ela precisa reconstruir ao passar de 2/3"
                    t.put(k, k * k)
                assert len(t) == 100, f"len(t) == {len(t)}; esperado 100"
                assert all(t.get(k) == k * k for k in range(100)), "alguma chave se perdeu ao reconstruir"
                assert (len(t) + t.lapides) * 3 <= 2 * t.m, "a ocupação passou de 2/3"
              `),
            },
            {
              name: 'lápides contam para reconstruir',
              code: dedent(`
                t = TabelaAberta(8)
                for k in range(5):
                    t.put(k, k)
                for k in range(4):
                    t.remove(k)
                t.put(100, "cem")
                assert t.lapides == 0, f"5 posições vivas ou com lápide + 1 nova passam de 2/3 de 8: deveria ter reconstruído e limpado as lápides, mas lapides == {t.lapides}"
                assert t.m == 8, f"só 2 chaves vivas em 8 posições: a reconstrução deveria manter m = 8, e m é {t.m}"
                assert len(t) == 2 and t.get(4) == 4 and t.get(100) == "cem", "as chaves vivas precisam sobreviver à reconstrução"
              `),
            },
            {
              name: 'muitas inserções e remoções não incham a tabela',
              code: dedent(`
                t = TabelaAberta(8)
                for i in range(1000):
                    t.put(i, i)
                    t.remove(i)
                    assert None in t.slots, f"depois de {i + 1} pares put/remove, a tabela ficou sem nenhuma posição vazia: as lápides precisam contar no limite de 2/3, senão a próxima busca gira para sempre"
                assert len(t) == 0, f"len(t) == {len(t)}; tudo foi removido"
                assert t.m <= 16, f"nunca houve mais de 1 chave viva, mas m chegou a {t.m}: decida o tamanho novo pelas chaves vivas, não pelas lápides"
              `),
            },
            {
              name: 'texto, mistura e remoções em sequência',
              code: dedent(`
                import random
                random.seed(7)
                t = TabelaAberta()
                nomes = [f"aluno{i}" for i in range(300)]
                for i, nome in enumerate(nomes):
                    assert None in t.slots, f"antes de inserir {nome!r}, a tabela (m = {t.m}) já não tinha nenhuma posição vazia: ela precisa reconstruir ao passar de 2/3"
                    t.put(nome, i)
                for nome in nomes[::2]:
                    t.remove(nome)
                for nome in nomes[1::2]:
                    assert t.get(nome) == int(nome[5:]), f"get({nome!r}) falhou depois das remoções"
                assert len(t) == 150, f"len(t) == {len(t)}; esperado 150"
                for nome in random.sample(nomes[::2], 20):
                    try:
                        t.get(nome)
                        assert False, f"{nome!r} foi removido; get deveria lançar KeyError"
                    except KeyError:
                        pass
              `),
            },
          ],
        },
      },
    ],
    revisao: [
      md(`
        - Colisões são inevitáveis: com *m* posições, cerca de 1,2·√m chaves já dão 50% de chance de colisão (paradoxo do aniversário).
        - Endereçamento aberto: uma chave por posição, fator de carga sempre abaixo de 1.
        - Sondagem linear: origem \`hash % m\`, depois a próxima, com volta. A busca para na chave ou num vazio.
        - Remoção com lápide: a busca passa por cima; a inserção reaproveita a primeira lápide, mas só depois de conferir o caminho até o vazio.
        - Busca sem sucesso ≈ ½(1 + 1/(1 − α)²): 2,5 com metade da tabela ocupada, 5 com 2/3, 50 com 90%.
        - Reconstrução: reinsere só as chaves vivas; o tamanho novo depende delas; custa O(1) amortizado. O dict do CPython mantém a ocupação em até 2/3.
      `),
      english(`
        **Vocabulary**: *open addressing*, *separate chaining*, *linear probing*, *probe sequence*, *tombstone*, *primary clustering*, *load factor*, *rehashing*, *birthday paradox*.

        Typical sentence in documentation: *"When a key is deleted, its slot is marked with a tombstone so that later lookups keep probing past it."*

        Typical interview question: "How does a hash table handle collisions? What happens to lookup time as the load factor approaches 1, and why do you need tombstones when you delete with open addressing?"
      `),
    ],
  },
  review: [
    ['Numa tabela com sondagem linear, quando uma busca pode concluir que a chave não existe?', 'Quando chega a uma posição vazia (nunca usada). Lápides não param a busca.'],
    ['Por que remover não pode simplesmente pôr None na posição?', 'Quebraria o caminho: buscas por chaves que passaram por ali parariam no vazio e diriam que elas não existem.'],
    ['Ao inserir, por que não gravar na primeira lápide assim que ela aparece?', 'A chave pode existir mais adiante; é preciso ir até achá-la ou chegar a um vazio, senão ela fica duplicada.'],
    ['Qual o custo esperado de uma busca sem sucesso com sondagem linear, em função de α?', '≈ ½(1 + 1/(1 − α)²): 2,5 com α = 0,5; 5 com α = 2/3; 50 com α = 0,9.'],
    ['Até que ocupação o dict do CPython vai antes de reconstruir?', '2/3 das posições.'],
    ['Quantas chaves aleatórias dão 50% de chance de colisão numa tabela de m posições?', 'Cerca de 1,2·√m (23 para m = 365, o paradoxo do aniversário).'],
    ['Quando a reconstrução pode manter o mesmo tamanho?', 'Quando a ocupação vem quase toda de lápides: há poucas chaves vivas, e reconstruir só limpa as lápides.'],
  ],
  references: ['sedgewick-algs', 'clrs', 'mit-6006'],
});

/* ------------------------------------------------------------------ */
/* Lição 3: funções hash e chaves (o contrato entre hash e igualdade)  */
/* ------------------------------------------------------------------ */

const chavesHash = lesson({
  id: 'l3-chaves-hash',
  moduleId: 'm3-3',
  title: 'Funções hash e chaves: o contrato entre hash e igualdade',
  titleEn: 'Hash functions and keys: the hash/equality contract',
  summary: 'O que uma função hash precisa garantir para a tabela funcionar, por que somar as letras espalha mal, como criar chaves próprias com __eq__ e __hash__ (ou dataclass congelada), por que uma chave que muda se perde e como escolher a chave certa, do CEP ao Two Sum.',
  minutes: 50,
  objectives: [
    'Enunciar os requisitos de uma função hash para tabelas e o que quebra quando cada um falha',
    'Explicar por que a soma dos códigos das letras espalha mal e como o hash polinomial resolve',
    'Escrever __eq__ e __hash__ coerentes, ou usar @dataclass(frozen=True), para usar objetos próprios como chave',
    'Prever o que acontece quando uma chave muda depois de inserida e escolher chaves imutáveis e canônicas',
    'Escolher a chave de busca em problemas da família Two Sum',
  ],
  skills: ['ed-hash', 'prog-dicionarios'],
  terms: [
    t('hash polinomial', 'polynomial hash', 'Função hash que trata o texto como algarismos de um número numa base B: h = h·B + código da letra, letra a letra, guardando o resto da divisão por um número grande.', "Java's String.hashCode() is a polynomial hash with base 31."),
    t('efeito avalanche', 'avalanche effect', 'Propriedade de boas funções hash: mudar um único bit da entrada muda, em média, metade dos bits da saída.'),
    t('ataque por inundação de hash', 'hash flooding (HashDoS)', 'Ataque que envia muitas chaves com o mesmo hash para que buscas O(1) virem O(n) e o servidor trave.'),
    t('métodos especiais', 'special methods (dunder methods)', 'Métodos com nome entre sublinhados duplos, como __eq__ e __hash__, que o Python chama sozinho em certas operações (==, hash(), dict, set).'),
    t('não hashável', 'unhashable', 'Objeto sem hash, que não pode ser chave de dict nem elemento de set.', "TypeError: unhashable type: 'set'"),
    t('classe de dados congelada', 'frozen dataclass', 'Classe criada com @dataclass(frozen=True): os campos não podem mudar depois de criados, e __eq__ e __hash__ são gerados de forma coerente.', "dataclasses.FrozenInstanceError: cannot assign to field 'x'"),
    t('chave composta', 'composite key', 'Chave formada por mais de um valor, geralmente uma tupla, como (linha, ponto).'),
    t('forma canônica', 'canonical form', 'Representação única escolhida para valores que devem contar como iguais, como o CEP só com dígitos.'),
    t('soma acumulada', 'prefix sum', 'Soma dos elementos desde o início da lista até uma posição; a soma de um trecho é a diferença entre duas somas acumuladas.'),
  ],
  stages: {
    conceito: [
      md(`
        Toda busca num \`dict\` ou num \`set\` faz duas perguntas à chave. A primeira é **"onde procurar?"**, e quem responde é \`hash(chave)\`: ele escolhe a posição onde a sondagem começa. A segunda, feita em cada posição ocupada do caminho, é **"é você mesma?"**, e quem responde é o \`==\`. A tabela confia cegamente nas duas respostas.

        Com \`int\` e \`str\`, o Python já responde do jeito certo. Quando a chave é um objeto seu, ou quando você escolhe *o que* usar como chave, a responsabilidade passa a ser sua. Esta lição mostra o que uma função hash precisa garantir, o que quebra quando ela falha (a chave "perdida" é o caso mais traiçoeiro) e como escolher chaves que funcionam, do CEP ao Two Sum.
      `),
    ],
    explicacao: [
      md('### O que a tabela exige da função hash'),
      {
        type: 'table',
        head: ['Requisito', 'O que significa', 'Se falhar...'],
        rows: [
          ['Coerência com `==`', 'se `a == b`, então `hash(a) == hash(b)`', 'duas chaves iguais começam a busca em lugares diferentes: duplicatas no set, buscas que não acham'],
          ['Estabilidade', 'o hash de uma chave não muda enquanto ela está na tabela', 'a chave se perde: continua lá dentro, mas nenhuma busca a encontra'],
          ['Espalhamento', 'chaves diferentes recebem hashes bem distribuídos', 'muitas colisões: as buscas ficam O(n)'],
          ['Rapidez', 'calcular o hash custa pouco', 'toda operação paga esse custo, até as que acertam de primeira'],
        ],
        caption: 'Os dois primeiros requisitos são de correção; os dois últimos, de desempenho.',
      },
      md(`
        Repare no que **não** está na lista: chaves diferentes podem ter o mesmo hash. Isso é uma colisão, é permitido, e quem desempata é o \`==\`. A regra só vale num sentido: \`a == b\` obriga hashes iguais, mas hashes iguais não obrigam \`a == b\`. A tabela usa a contrapositiva (hashes diferentes ⇒ chaves diferentes) para pular quase todas as posições do caminho sem chamar \`==\`: no CPython, o \`==\` só é chamado quando o hash guardado na posição é igual ao da chave procurada, e, antes dele, ainda há um teste mais barato, o de ser o mesmo objeto (\`is\`).

        ### Espalhar bem: soma das letras × hash polinomial
        Uma ideia ingênua para texto é somar os códigos das letras. É coerente e estável, mas espalha mal por dois motivos:

        - **Ignora a ordem**: \`"amor"\`, \`"roma"\`, \`"ramo"\`, \`"mora"\` e \`"omar"\` têm as mesmas letras, logo a mesma soma. Todo anagrama colide.
        - **Gera poucos valores**: toda palavra de 3 letras minúsculas sem acento soma entre 3 × 97 = 291 e 3 × 122 = 366. São só 76 hashes possíveis para 17.576 palavras.

        O {{hash polinomial|polynomial hash}} trata o texto como os algarismos de um número numa base *B*: \`h = h * B + ord(letra)\`, letra a letra, guardando só o resto da divisão por um número grande. Agora a posição importa: em \`"amor"\`, o código do \`a\` é multiplicado por B³; em \`"roma"\`, por 1. O \`String.hashCode()\` do Java é exatamente isso, com B = 31 (o "resto" fica por conta do estouro do inteiro de 32 bits). Calcular assim, multiplicando o acumulado a cada letra, é o método de Horner: n multiplicações para n letras.

        O CPython, o Python que você instala no computador, vai além. Nele, o hash de \`str\` e \`bytes\` é o **SipHash** (PEP 456), que tem {{efeito avalanche|avalanche effect}}: trocar uma única letra muda, em média, metade dos bits do resultado. E ele usa uma chave secreta sorteada **a cada vez que o interpretador inicia**: num terminal, rode duas vezes \`python3 -c "print(hash('ana'))"\` e veja números diferentes. (O Python que roda no navegador, aqui na plataforma, foi compilado com um algoritmo mais simples, o FNV, mas também sorteia a chave a cada início.) O motivo é o {{ataque por inundação de hash|hash flooding}}: em 2011, pesquisadores mostraram que dava para travar servidores web de várias linguagens enviando milhares de parâmetros escolhidos para ter o mesmo hash. Cada inserção virava O(n), e a requisição inteira, O(n²). Com a chave sorteada, o atacante não sabe quais textos colidem. Já o hash de inteiros não é sorteado: \`hash(n) == n\` para inteiros não negativos pequenos, e por isso os exemplos da lição anterior se repetem iguais em toda execução.

        ### Coerência: quando a sua classe vira chave
        Os números mostram a regra em ação: \`1 == 1.0 == True\`, então os três **precisam** ter o mesmo hash, e têm. Para uma tabela, são a mesma chave.

        Numa classe sua, quem responde às duas perguntas são dois {{métodos especiais|special methods}}: o Python chama \`__eq__\` quando você escreve \`a == b\` e \`__hash__\` quando precisa de \`hash(a)\`. (Classes, métodos especiais e dataclasses ganham um módulo inteiro no Nível 5; aqui basta o necessário para usar objetos como chave.) Se a classe não define nenhum dos dois, o comportamento padrão é coerente: \`==\` compara identidade (é o mesmo objeto?) e o hash também vem da identidade. Dois \`Ponto(1, 2)\` criados separadamente são chaves **diferentes**.

        Quando você define \`__eq__\` para comparar por conteúdo, o hash por identidade deixaria de ser coerente, e o Python se protege: uma classe que define \`__eq__\` e não define \`__hash__\` fica **sem hash** (\`__hash__ = None\`), e usá-la como chave dá um \`TypeError\` avisando que o tipo é *unhashable*. Por isso \`__eq__\` e \`__hash__\` andam juntos:

        - \`__hash__\` deve usar **os mesmos campos** que o \`__eq__\` compara, do mesmo jeito. O caminho recomendado é empacotar esses campos numa tupla e devolver o hash dela: \`return hash((self.x, self.y))\`.
        - Usar menos campos no hash continua coerente (só espalha pior). Usar um campo que o \`__eq__\` ignora, ou o campo num formato diferente do que o \`__eq__\` compara, quebra a regra.
        - \`return 0\` também é coerente, e transforma a tabela numa lista: todas as chaves colidem.

        O atalho é \`@dataclass(frozen=True)\`, do módulo \`dataclasses\`. Ele gera \`__init__\`, \`__repr__\`, um \`__eq__\` que compara os campos e um \`__hash__\` coerente com ele, e ainda impede alterar os campos depois da criação. É uma {{classe de dados congelada|frozen dataclass}}: o jeito mais simples de ter uma chave própria correta. Para usá-la, escreva \`@dataclass(frozen=True)\` na linha de cima da classe e liste os campos com o tipo de cada um (\`linha: str\`), como na seção Código.

        ### Estabilidade: por que a chave precisa ser imutável
        Se o hash de uma chave muda depois que ela entrou na tabela, ela continua na posição calculada com o hash **antigo**, e uma busca pelo próprio objeto parte da posição do hash **novo**. Por isso \`list\`, \`dict\` e \`set\` são {{não hasháveis|unhashable}}: são mutáveis. Uma tupla tem hash só se todos os seus elementos tiverem (\`(1, [2])\` dá erro), e o \`frozenset\` é a versão imutável, e com hash, do \`set\`. A seção Exemplo mostra, passo a passo, uma chave se perdendo.

        ### Escolher a chave certa
        Muitas vezes, a decisão mais importante é **o que** usar como chave:

        - **{{Chave composta|composite key}}**: o horário de um ônibus depende da linha e do ponto, então a chave é a tupla \`(linha, ponto)\`.
        - **{{Forma canônica|canonical form}}**: \`"01310-100"\`, \`"01310100"\` e \`" 01310-100 "\` são o mesmo CEP. Normalize (só os dígitos) antes de usar como chave, ou faça \`__eq__\` e \`__hash__\` usarem a forma normalizada. Para um par sem ordem, como uma partida entre dois times, use \`frozenset({a, b})\` ou \`tuple(sorted((a, b)))\`. Para anagramas, as letras ordenadas, como você fez no Nível 2.
        - **A chave do que você vai procurar**: no Two Sum, para cada número \`x\` a pergunta é "já vi \`alvo - x\`?". A chave é o número já visto; o valor é o que você quer receber quando achar, por exemplo o índice dele. Pergunte sempre: *que valor eu vou procurar, e o que quero de volta quando achar?*
      `),
      warn(`
        Um objeto mutável pode ser chave **se** o \`__eq__\` e o \`__hash__\` dele dependerem só de partes que nunca mudam, como uma matrícula. O perigo é calcular o hash com campos que mudam. Na dúvida, use dados imutáveis: \`str\`, \`int\`, \`tuple\`, \`frozenset\` ou uma dataclass congelada.
      `, 'Mutável não é proibido; mudar o que entra no hash é'),
    ],
    exemplo: [
      { type: 'viz', viz: 'hash-table', caption: 'Esta visualização usa como função hash a soma dos códigos das letras. Insira amor, roma, ramo e mora: todas caem no mesmo balde. Depois redimensione até 32 baldes: chaves que só dividiam um balde por acaso, como bia e caio, se separam, mas os anagramas continuam juntos, porque o hash deles é o mesmo.' },
      md('Agora, a chave perdida. A classe abaixo comete o erro clássico: o hash depende de atributos que podem mudar. Execute passo a passo e observe as três últimas linhas.'),
      trace(`
        class Ponto:
            def __init__(self, x, y):
                self.x = x
                self.y = y

            def __eq__(self, outro):
                return (self.x, self.y) == (outro.x, outro.y)

            def __hash__(self):
                return hash((self.x, self.y))   # depende de campos que podem mudar!

        casa = Ponto(1, 2)
        mapa = {casa: "minha casa"}
        casa.x = 5                       # a chave muda DEPOIS de guardada
        print(casa in mapa)
        print(Ponto(1, 2) in mapa)
        print(len(mapa), list(mapa.values()))
      `),
      {
        type: 'table',
        head: ['Busca', 'Começa na posição de', 'O que encontra', 'Resultado'],
        rows: [
          ['`casa in mapa`', '`hash((5, 2))`, o hash novo', 'uma posição vazia: a entrada ficou na posição do hash antigo, fora desse caminho, e a busca para ali', '`False`'],
          ['`Ponto(1, 2) in mapa`', '`hash((1, 2))`, o mesmo de quando a chave entrou', 'a entrada certa, e o hash bate; mas o `==` compara com o objeto guardado, que agora vale `(5, 2)`', '`False`'],
          ['`len(mapa)` e `list(mapa.values())`', '(percorre tudo)', 'a entrada continua lá', "`1` e `['minha casa']`"],
        ],
        caption: 'A entrada virou um fantasma: ocupa espaço e aparece quando o dict é percorrido, mas nenhuma busca a encontra.',
      },
      md(`
        Um detalhe deixa o bug ainda mais traiçoeiro. Antes até de comparar hashes, o \`dict\` do CPython confere se a entrada é o **mesmo objeto** (\`is\`). Se o hash novo, por acaso, levasse à mesma posição do antigo, \`casa in mapa\` daria \`True\`. Com outros valores de \`x\` e \`y\`, o mesmo código pode "funcionar", e o erro só aparece depois.

        Com \`@dataclass(frozen=True)\`, a linha \`casa.x = 5\` falharia na hora com \`FrozenInstanceError\`: o erro aparece onde foi cometido, e não muito depois, como uma busca que "misteriosamente" não acha nada.
      `),
    ],
    codigo: [
      py(`
        from dataclasses import dataclass

        # 1. Números iguais têm o mesmo hash, mesmo sendo de tipos diferentes
        print(hash(1) == hash(1.0) == hash(True))
        print({1: "int", 1.0: "float", True: "bool"})

        # 2. Soma das letras x hash polinomial
        def hash_soma(s):
            return sum(ord(c) for c in s)

        def hash_poli(s, base=31, mod=2**61 - 1):
            h = 0
            for c in s:
                h = (h * base + ord(c)) % mod    # método de Horner
            return h

        palavras = ["amor", "roma", "ramo", "mora", "omar", "arma", "rama"]
        print(len({hash_soma(p) for p in palavras}), "hashes distintos somando as letras")
        print(len({hash_poli(p) for p in palavras}), "hashes distintos com o polinomial")

        # 3. Uma chave própria, imutável e coerente
        @dataclass(frozen=True)
        class Parada:
            linha: str
            ponto: int

        horarios = {Parada("107", 3): "07:40"}
        print(horarios[Parada("107", 3)])        # outro objeto, mas igual: acha

        # 4. O que pode e o que não pode ser chave
        for candidato in [(1, 2), frozenset({1, 2}), (1, [2]), {1, 2}]:
            try:
                hash(candidato)
                print(type(candidato).__name__, "-> pode ser chave")
            except TypeError as erro:
                print(type(candidato).__name__, "->", erro)
      `),
      py(`
        def dois_somam_indices(xs, alvo):
            visto = {}                       # número já visto -> índice dele
            for j, x in enumerate(xs):
                falta = alvo - x
                if falta in visto:           # procura ANTES de guardar x
                    return visto[falta], j
                visto[x] = j
            return None

        print(dois_somam_indices([8, 3, 5, 1], 9))
        print(dois_somam_indices([3, 3], 6))
        print(dois_somam_indices([5], 10))
      `, { caption: 'Two Sum devolvendo índices em uma passada. Procurar antes de guardar impede usar o mesmo elemento duas vezes ([5] com alvo 10) sem impedir dois elementos iguais ([3, 3]).' }),
      tip('Quer conferir se um objeto pode ser chave? Chame `hash(objeto)`: se der `TypeError`, ele não pode.'),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e3-ch-1',
          kind: 'mcq',
          prompt: 'Você quer um dict que guarde a distância entre pares de capitais, identificadas pela sigla do estado, sem se importar com a ordem do par. Qual destes valores **pode** ser chave?',
          difficulty: 'facil',
          skills: ['ed-hash', 'prog-dicionarios'],
          hints: [
            'O que os tipos que podem ser chave têm em comum? Algum deles pode mudar depois de criado?',
            'Uma tupla é imutável, mas e o que está dentro dela?',
          ],
          explanation: 'Chaves precisam de hash estável, e os contêineres mutáveis do Python (list, set, dict) não têm hash. Tuplas têm hash só quando todos os elementos têm. O frozenset é o set imutável e, como ignora a ordem, serve de forma canônica para pares sem ordem.',
          options: [
            { text: '`["SP", "RJ"]`', feedback: "Lista é mutável e, por isso, não tem hash: usá-la como chave dá um `TypeError` com *unhashable type: 'list'*." },
            { text: '`{"SP", "RJ"}`', feedback: 'Um set é mutável (tem add e remove), então também não tem hash. A versão imutável dele está entre as opções.' },
            { text: '`("SP", ["RJ"])`', feedback: "Tupla só tem hash se todos os elementos tiverem. Esta carrega uma lista dentro, e o erro reclama dela: *unhashable type: 'list'*." },
            { text: '`frozenset({"SP", "RJ"})`', correct: true, feedback: 'Isso: é imutável e tem hash. E, como não tem ordem, `frozenset({"SP", "RJ"}) == frozenset({"RJ", "SP"})`: é a mesma chave para SP–RJ e RJ–SP.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e3-ch-2',
          kind: 'predict',
          lang: 'python',
          prompt: 'O que é impresso?',
          difficulty: 'intermediario',
          skills: ['ed-hash', 'prog-dicionarios'],
          hints: [
            'Quanto vale `1 == True`? E `1 == 1.0`?',
            'Se as chaves são iguais e têm o mesmo hash, a nova atribuição cria uma entrada ou atualiza a que existe? E qual objeto continua sendo a chave guardada?',
          ],
          explanation: '`1`, `True` e `1.0` são iguais para o `==` e, pela regra, têm o mesmo hash: para o dict, são a mesma chave. Cada atribuição só troca o valor; a chave guardada continua sendo o primeiro objeto que entrou, o `1`. Por isso, misturar bool, int e float como chaves de um mesmo dict costuma esconder bugs.',
          code: dedent(`
            d = {}
            d[1] = "um"
            d[True] = "verdadeiro"
            d[1.0] = "real"
            print(d, len(d))
          `),
          answer: "{1: 'real'} 1",
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e3-ch-3',
          kind: 'predict',
          lang: 'python',
          prompt: 'Duas classes, uma sem métodos especiais e outra só com `__eq__`. O que é impresso?',
          difficulty: 'intermediario',
          skills: ['ed-hash'],
          hints: [
            'Sem `__eq__` nem `__hash__`, como o Python decide se dois objetos são iguais?',
            'O que o Python faz com o `__hash__` de uma classe que define `__eq__` e não define `__hash__`? Por que ele faria isso?',
          ],
          explanation: '`SemNada` usa o padrão: igualdade e hash por identidade. Dois objetos criados separadamente são diferentes, e o set fica com 2. `SoEq` define `__eq__` e não define `__hash__`, então o Python faz `__hash__ = None`: o hash por identidade deixaria de ser coerente, porque dois objetos iguais teriam hashes diferentes. Montar o set já falha com `TypeError`, e a mensagem diz que o tipo é *unhashable* (o texto exato muda um pouco entre versões do Python).',
          code: dedent(`
            class SemNada:
                def __init__(self, ra):
                    self.ra = ra

            class SoEq:
                def __init__(self, ra):
                    self.ra = ra
                def __eq__(self, outro):
                    return self.ra == outro.ra

            print(len({SemNada(1), SemNada(1)}))
            try:
                print(len({SoEq(1), SoEq(1)}))
            except TypeError as e:
                print("erro:", type(e).__name__)
          `),
          answer: '2\nerro: TypeError',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e3-ch-4',
          kind: 'fix',
          lang: 'python',
          prompt: 'A classe `Cep` considera iguais os CEPs escritos com ou sem ponto, hífen e espaços (o `__eq__` compara só os dígitos). Mesmo assim, um set de CEPs está ficando com repetidos, e buscas num dict falham quando o CEP vem em outro formato. Encontre e corrija o erro sem mudar o que o `__eq__` considera igual.',
          difficulty: 'intermediario',
          skills: ['ed-hash'],
          hints: [
            'Pegue dois CEPs que o `__eq__` considera iguais, como "01310-100" e "01310100". Os hashes deles são iguais?',
            'Qual é a regra que liga `__eq__` e `__hash__`? Que informação o `__eq__` usa para comparar, e qual o `__hash__` usa?',
            'A classe já tem um método que produz exatamente a forma que o `__eq__` compara.',
          ],
          explanation: 'O `__eq__` compara os dígitos, mas o `__hash__` usava o texto cru. "01310-100" e "01310100" eram iguais com hashes diferentes, e o set nem chegava a compará-los: cada um começava a busca num lugar. Calcular o hash da mesma forma normalizada que o `__eq__` compara restaura a regra a == b ⇒ hash(a) == hash(b). Trocar o `__eq__` para comparar o texto cru também deixaria tudo coerente, mas mudaria o significado da classe: ela deixaria de reconhecer o mesmo CEP em formatos diferentes.',
          starter: dedent(`
            class Cep:
                def __init__(self, texto):
                    self.texto = texto

                def digitos(self):
                    return "".join(c for c in self.texto if c.isdigit())

                def __eq__(self, outro):
                    return isinstance(outro, Cep) and self.digitos() == outro.digitos()

                def __hash__(self):
                    return hash(self.texto)
          `),
          solution: dedent(`
            class Cep:
                def __init__(self, texto):
                    self.texto = texto

                def digitos(self):
                    return "".join(c for c in self.texto if c.isdigit())

                def __eq__(self, outro):
                    return isinstance(outro, Cep) and self.digitos() == outro.digitos()

                def __hash__(self):
                    return hash(self.digitos())
          `),
          tests: [
            {
              name: 'o mesmo CEP em formatos diferentes vira um só no set',
              code: dedent(`
                s = {Cep("01310-100"), Cep("01310100"), Cep(" 01310-100 "), Cep("01.310-100")}
                assert len(s) == 1, f"o set ficou com {len(s)} CEPs; esperado 1, porque os quatro são o mesmo CEP"
              `),
            },
            {
              name: 'o dict acha o CEP escrito de outro jeito',
              code: dedent(`
                d = {Cep("01310-100"): "Av. Paulista"}
                r = d.get(Cep("01310100"))
                assert r == "Av. Paulista", f"d.get(Cep('01310100')) devolveu {r!r}; o dict deveria achar o CEP sem hífen"
              `),
            },
            {
              name: 'CEPs diferentes continuam diferentes',
              code: dedent(`
                assert Cep("01310-100") != Cep("20040-002"), "CEPs diferentes não podem ser iguais"
                s = {Cep("01310-100"), Cep("20040-002"), Cep("70040010")}
                assert len(s) == 3, f"o set com 3 CEPs diferentes ficou com {len(s)}"
              `),
            },
            {
              name: 'iguais têm o mesmo hash',
              code: dedent(`
                pares = [("01310-100", "01310100"), ("20040-002", " 20040002"), ("70040 010", "70040-010"), ("40.020-000", "40020000")]
                for a, b in pares:
                    assert Cep(a) == Cep(b), f"Cep({a!r}) e Cep({b!r}) deveriam continuar iguais"
                    assert hash(Cep(a)) == hash(Cep(b)), f"Cep({a!r}) == Cep({b!r}), mas os hashes são diferentes"
              `),
            },
            {
              name: 'o hash espalha',
              code: dedent(`
                hs = {hash(Cep(f"{i:05d}-000")) for i in range(50)}
                assert len(hs) > 40, "o hash precisa variar com o CEP: um hash constante é coerente, mas faz todas as chaves colidirem"
                hs = {hash(Cep(f"01310-{i:03d}")) for i in range(50)}
                assert len(hs) > 40, "CEPs da mesma região (todos começam com 01310) ficaram com quase o mesmo hash: use todos os dígitos que o __eq__ compara, não só uma parte"
              `),
            },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e3-ch-5',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `pares_soma(xs, alvo)`, que devolve um **set** com todos os pares **distintos** de valores `(a, b)`, com `a <= b`, tais que `a + b == alvo` e `a` e `b` estão em posições diferentes de `xs`. Exemplo: `pares_soma([1, 5, 3, 3, 4, 2], 6)` devolve `{(1, 5), (3, 3), (2, 4)}`. Faça em O(n), numa passada só.',
          difficulty: 'intermediario',
          skills: ['ed-hash', 'prog-dicionarios'],
          hints: [
            'Para cada x, qual número você precisaria já ter visto para formar um par?',
            'Se o mesmo par de valores aparecer várias vezes, como garantir que ele entre uma vez só? Que forma do par faz `(5, 1)` e `(1, 5)` virarem a mesma coisa?',
            'Cuidado com o par `(3, 3)`: ele só vale se houver dois 3 na lista. Em que momento você guarda x entre os vistos?',
          ],
          explanation: 'É o Two Sum com duas escolhas de chave. A primeira: o set dos números já vistos responde "já vi alvo − x?" em O(1). A segunda: o par entra no resultado na forma canônica `(min, max)`, uma tupla imutável, para que repetições virem uma só. Procurar antes de guardar x garante que `(3, 3)` só aparece com dois 3. Uma passada, O(n) em tempo e memória.',
          starter: dedent(`
            def pares_soma(xs, alvo):
                # devolva um set de tuplas (menor, maior)
                pass
          `),
          solution: dedent(`
            def pares_soma(xs, alvo):
                vistos = set()
                pares = set()
                for x in xs:
                    y = alvo - x
                    if y in vistos:
                        pares.add((min(x, y), max(x, y)))
                    vistos.add(x)
                return pares
          `),
          tests: [
            {
              name: 'exemplo do enunciado',
              code: dedent(`
                r = pares_soma([1, 5, 3, 3, 4, 2], 6)
                assert isinstance(r, set), f"devolva um set, não {type(r).__name__}"
                assert r == {(1, 5), (3, 3), (2, 4)}, f"devolveu {r}; esperado {{(1, 5), (3, 3), (2, 4)}}"
              `),
            },
            {
              name: 'vazio e um elemento',
              code: dedent(`
                assert pares_soma([], 6) == set(), "lista vazia: nenhum par"
                r = pares_soma([3], 6)
                assert r == set(), f"pares_soma([3], 6) devolveu {r}; um único 3 não forma par com ele mesmo"
              `),
            },
            {
              name: 'pares repetidos aparecem uma vez, na ordem (menor, maior)',
              code: dedent(`
                r = pares_soma([5, 1, 1, 5, 5, 1], 6)
                assert r == {(1, 5)}, f"devolveu {r}; esperado {{(1, 5)}}, uma vez só e com o menor primeiro"
                r = pares_soma([3, 3], 6)
                assert r == {(3, 3)}, f"pares_soma([3, 3], 6) devolveu {r}; dois 3 formam o par (3, 3)"
              `),
            },
            {
              name: 'negativos e zero',
              code: dedent(`
                r = pares_soma([-2, 8, 0, 6, 10, -4], 6)
                assert r == {(-2, 8), (0, 6), (-4, 10)}, f"devolveu {r}; esperado {{(-2, 8), (0, 6), (-4, 10)}}"
                r = pares_soma([0, 0, 0], 0)
                assert r == {(0, 0)}, f"pares_soma([0, 0, 0], 0) devolveu {r}; esperado {{(0, 0)}}"
              `),
            },
            {
              name: 'eficiente',
              code: dedent(`
                import time
                class _Lista(list):
                    leituras = 0
                    def _ler(self):
                        self.leituras += 1
                        assert self.leituras <= 10 * len(self), f"pares_soma já leu mais de {10 * len(self)} elementos de uma lista de {len(self)}: comparar cada x com todos os outros é O(n²). Para cada x, procure alvo - x num set"
                    def __getitem__(self, i):
                        self._ler()
                        return list.__getitem__(self, i)
                    def __iter__(self):
                        for x in list.__iter__(self):
                            self._ler()
                            yield x
                r = pares_soma(_Lista(range(0, 4000, 2)), -1)
                assert r == set(), "nenhuma soma de dois números pares dá -1"
                xs = list(range(0, 40000, 2))
                t0 = time.perf_counter()
                r = pares_soma(xs, -1)
                dt = time.perf_counter() - t0
                assert r == set(), "nenhuma soma de dois números pares dá -1"
                assert dt < 0.5, f"levou {dt:.2f}s com 20.000 números: guarde os vistos num set (em uma lista, cada 'in' percorre tudo)"
              `),
            },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e3-ch-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            O extrato de uma conta mostra o saldo líquido de cada dia (Pix recebidos menos pagamentos), e os valores podem ser negativos. Escreva \`contar_periodos(movs, k)\`, que devolve **quantos períodos de dias consecutivos** (com pelo menos um dia) somam exatamente \`k\`.

            Exemplos: \`contar_periodos([10, -10, 10, -10], 0)\` devolve \`4\`; \`contar_periodos([1, 2, 3], 3)\` devolve \`2\` (os períodos \`[1, 2]\` e \`[3]\`).

            Faça em O(n): testar todos os períodos é O(n²) e não passa no teste de desempenho.
          `),
          difficulty: 'desafio',
          skills: ['ed-hash', 'prog-dicionarios'],
          hints: [
            'No Two Sum, para cada x você perguntava "já vi o número que completa x?". Existe uma pergunta parecida sobre a soma de todos os dias desde o primeiro até hoje?',
            'Chame de S(j) a soma acumulada do dia 0 ao dia j. Quanto somam os dias de i + 1 até j, em termos de S? Para esse período valer k, quanto S(i) precisa valer?',
            'Uma mesma soma acumulada pode ter aparecido em vários dias, e cada um deles começa um período diferente. O que o valor do dicionário deveria guardar?',
            'E os períodos que começam no primeiro dia? Que soma acumulada "de antes do primeiro dia" precisa estar no dicionário desde o início?',
          ],
          explanation: 'A soma dos dias i + 1 a j é S(j) − S(i), e ela vale k exatamente quando S(i) = S(j) − k. É o Two Sum aplicado às somas acumuladas: a chave é a soma acumulada, e o valor é quantas vezes ela já apareceu, porque cada aparição é um começo de período diferente. Começar com {0: 1} representa a soma vazia de antes do primeiro dia, que conta os períodos iniciados no dia 0. Procurar antes de registrar a soma atual impede contar o período vazio. Alargar e encolher o período com dois índices, como nos problemas de dois ponteiros, não serve aqui: com valores negativos, aumentar o período pode diminuir a soma. O(n) em tempo e memória.',
          starter: dedent(`
            def contar_periodos(movs, k):
                # devolva quantos trechos contíguos (não vazios) de movs somam k
                pass
          `),
          solution: dedent(`
            def contar_periodos(movs, k):
                vezes = {0: 1}       # soma acumulada -> quantas vezes apareceu
                soma = 0
                total = 0
                for v in movs:
                    soma += v
                    total += vezes.get(soma - k, 0)
                    vezes[soma] = vezes.get(soma, 0) + 1
                return total
          `),
          tests: [
            {
              name: 'exemplos do enunciado',
              code: dedent(`
                for movs, k, esperado in [([10, -10, 10, -10], 0, 4), ([1, 2, 3], 3, 2)]:
                    r = contar_periodos(movs, k)
                    assert r == esperado, f"contar_periodos({movs}, {k}) devolveu {r}; esperado {esperado}"
              `),
            },
            {
              name: 'vazio, um dia e o período vazio',
              code: dedent(`
                casos = [([], 0, 0, "lista vazia: nenhum período (o período vazio não conta)"),
                         ([5], 5, 1, "um dia que vale k é um período"),
                         ([5], 0, 0, "o período vazio soma 0, mas não conta"),
                         ([1, 1, 1], 2, 2, "[1, 1] aparece em duas posições")]
                for movs, k, esperado, motivo in casos:
                    r = contar_periodos(movs, k)
                    assert r == esperado, f"contar_periodos({movs}, {k}) devolveu {r}; esperado {esperado} ({motivo})"
              `),
            },
            {
              name: 'zeros e negativos',
              code: dedent(`
                r = contar_periodos([0, 0, 0], 0)
                assert r == 6, f"contar_periodos([0, 0, 0], 0) devolveu {r}; todo trecho soma 0: são 3 + 2 + 1 = 6"
                r = contar_periodos([3, 4, -7, 1, 3, 3, 1, -4], 7)
                assert r == 4, f"contar_periodos([3, 4, -7, 1, 3, 3, 1, -4], 7) devolveu {r}; esperado 4 (com negativos, aumentar o período pode diminuir a soma)"
                r = contar_periodos([-1, -1, 1], 0)
                assert r == 1, f"contar_periodos([-1, -1, 1], 0) devolveu {r}; esperado 1"
              `),
            },
            {
              name: 'confere com a força bruta em listas aleatórias',
              code: dedent(`
                import random
                random.seed(42)
                def _bruta(movs, k):
                    c = 0
                    for i in range(len(movs)):
                        s = 0
                        for j in range(i, len(movs)):
                            s += movs[j]
                            if s == k:
                                c += 1
                    return c
                for _ in range(200):
                    movs = [random.randint(-5, 5) for _ in range(random.randint(0, 25))]
                    k = random.randint(-6, 6)
                    r, esperado = contar_periodos(movs, k), _bruta(movs, k)
                    assert r == esperado, f"contar_periodos({movs}, {k}) devolveu {r}; esperado {esperado}"
              `),
            },
            {
              name: 'eficiente',
              code: dedent(`
                import time
                class _Lista(list):
                    leituras = 0
                    def _ler(self):
                        self.leituras += 1
                        assert self.leituras <= 10 * len(self), f"contar_periodos já leu mais de {10 * len(self)} valores de uma lista de {len(self)} dias: testar todos os períodos é O(n²). Guarde num dict quantas vezes cada soma acumulada apareceu"
                    def __getitem__(self, i):
                        self._ler()
                        return list.__getitem__(self, i)
                    def __iter__(self):
                        for x in list.__iter__(self):
                            self._ler()
                            yield x
                r = contar_periodos(_Lista([1, -1] * 1000), 0)
                assert r == 1000000, f"contar_periodos([1, -1] * 1000, 0) devolveu {r}; esperado 1000000"
                movs = [1, -1] * 2500
                t0 = time.perf_counter()
                r = contar_periodos(movs, 0)
                dt = time.perf_counter() - t0
                assert r == 6250000, f"contar_periodos([1, -1] * 2500, 0) devolveu {r}; esperado 6250000"
                assert dt < 0.25, f"levou {dt:.2f}s com 5.000 dias: em vez de testar todos os pares de somas acumuladas, guarde num dict quantas vezes cada soma apareceu"
              `),
            },
          ],
        },
      },
    ],
    projeto: [
      md('**Projeto 3: cadastro acadêmico.** Use as ideias desta lição na Parte 1 e na Parte 2: a matrícula (imutável) como chave do dict de alunos, nunca o objeto `Aluno` inteiro; um índice auxiliar por nome completo na forma canônica (minúsculas, sem espaços sobrando), para achar um nome exato em O(1) (a busca parcial ainda precisa percorrer os nomes); e, quando `Aluno` virar dataclass, lembre que uma dataclass comum, mutável, fica sem hash de propósito: para ela ir para um set ou virar chave, o caminho seguro é `frozen=True`.'),
      { type: 'project', projectId: 'p3-cadastro' },
    ],
    revisao: [
      md(`
        - A tabela pergunta "onde procurar?" ao \`hash\` e "é você?" ao \`==\`. Regra: \`a == b\` ⇒ \`hash(a) == hash(b)\`; o contrário não é exigido.
        - Função hash boa: coerente, estável, espalha bem e é rápida. Somar letras espalha mal; o hash polinomial leva a posição em conta; o CPython usa SipHash com chave sorteada contra inundação de hash.
        - Classe própria como chave: \`__hash__\` com os mesmos campos do \`__eq__\` (\`hash((campo1, campo2))\`), ou \`@dataclass(frozen=True)\`. Definir só \`__eq__\` deixa a classe sem hash.
        - Chave que muda depois de inserida se perde. Use \`str\`, \`int\`, \`tuple\`, \`frozenset\` ou dataclass congelada.
        - Escolha a chave: composta (tupla), canônica (CEP só com dígitos, \`frozenset\` para pares sem ordem) ou "o que vou procurar" (Two Sum: \`alvo - x\`).
        - Períodos com soma k: a {{soma acumulada|prefix sum}} transforma o problema num Two Sum; o dict guarda quantas vezes cada soma apareceu, começando com \`{0: 1}\`.
      `),
      english(`
        **Vocabulary**: *hashable / unhashable*, *special (dunder) methods*, *frozen dataclass*, *canonical form*, *composite key*, *polynomial hash*, *avalanche effect*, *hash flooding*, *prefix sum*.

        From the Python Data Model documentation: *"The only required property is that objects which compare equal have the same hash value."*

        Typical interview prompt: "Given an array of integers and a target, return the indices of the two numbers that add up to the target. Can you do it in one pass?" A common follow-up: "Now count the subarrays whose sum equals k."
      `),
    ],
  },
  review: [
    ['Qual é a única regra obrigatória entre __eq__ e __hash__?', 'Se a == b, então hash(a) == hash(b).'],
    ['Hashes iguais garantem chaves iguais?', 'Não. Isso é uma colisão, permitida; quem decide é o ==.'],
    ['O que acontece com uma classe que define __eq__ e não define __hash__?', 'O Python faz __hash__ = None: a classe fica sem hash, e usá-la como chave dá TypeError (unhashable type).'],
    ['Uma chave muda depois de entrar no dict. Por que as buscas falham?', 'Ela ficou na posição do hash antigo. A busca pelo objeto parte do hash novo; a busca por um objeto igual ao antigo chega lá, mas o == falha.'],
    ['Quanto vale {1: "a", True: "b"}?', '{1: "b"}: 1 == True e os dois têm o mesmo hash. Fica a primeira chave, com o último valor.'],
    ['Por que a soma dos códigos das letras é uma função hash ruim?', 'Ignora a ordem (todo anagrama colide) e gera poucos valores para palavras curtas.'],
    ['No Two Sum com índices, o que é chave e o que é valor do dict?', 'Chave: número já visto. Valor: o índice dele. Para cada x, procura alvo − x antes de guardar x.'],
    ['Como contar em O(n) os trechos contíguos com soma k?', 'Dict de somas acumuladas → quantas vezes apareceram, começando com {0: 1}; para cada soma S, some vezes[S − k].'],
  ],
  references: ['python-docs', 'sedgewick-algs', 'clrs'],
});

export const lessons: Lesson[] = [enderecamentoAberto, chavesHash];
