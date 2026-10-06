import type { Level } from '../types.ts';
import { lessons as m4_1 } from './modulos/m4-1.ts';
import { lessons as m4_2 } from './modulos/m4-2.ts';
import { lessons as m4_3 } from './modulos/m4-3.ts';
import { lessons as m4_4 } from './modulos/m4-4.ts';
import { lessons as m4_5 } from './modulos/m4-5.ts';
import { lessons as m4_6 } from './modulos/m4-6.ts';
import { dedent, deep, info, lesson, md, py, t, tip, trace, warn } from '../helpers.ts';

const bigO = lesson({
  id: 'l4-big-o',
  moduleId: 'm4-1',
  title: 'Complexidade e notação Big O',
  titleEn: 'Complexity and Big O notation',
  summary: 'Como medir a eficiência de um algoritmo independentemente do computador.',
  minutes: 35,
  objectives: ['Explicar o que Big O mede (crescimento, não tempo absoluto)', 'Classificar código em O(1), O(log n), O(n), O(n log n), O(n²), O(2ⁿ)', 'Analisar loops aninhados e chamadas de função', 'Diferenciar complexidade de tempo e de espaço'],
  skills: ['alg-complexidade'],
  terms: [
    t('complexidade de tempo', 'time complexity', 'Como o número de operações cresce com o tamanho da entrada.'),
    t('complexidade de espaço', 'space complexity', 'Como a memória extra usada cresce com a entrada.'),
    t('notação O grande', 'Big O notation', 'Limite superior do crescimento, ignorando constantes.'),
    t('pior caso', 'worst case', 'A entrada que faz o algoritmo trabalhar mais.'),
    t('logarítmico', 'logarithmic', 'Cresce muito devagar: dobrar n soma um passo.'),
    t('quadrático', 'quadratic', 'Dobrar n quadruplica o trabalho.'),
  ],
  stages: {
    conceito: [md('Big O descreve **como o trabalho cresce** quando a entrada cresce. Não diz "leva 2 segundos" (isso depende do computador), e sim "se a entrada dobrar, o trabalho dobra" (O(n)) ou "quadruplica" (O(n²)). É a linguagem comum para comparar algoritmos.')],
    explicacao: [
      md(`
        **Regras práticas**:

        1. **Ignore constantes**: 3n + 5 é O(n). Interessa o crescimento para n grande.
        2. **Fique com o termo dominante**: n² + n é O(n²).
        3. **Sequência soma, aninhamento multiplica**: dois loops seguidos sobre n → O(n); um loop dentro do outro → O(n²).
        4. **Divide pela metade a cada passo** → O(log n) (busca binária).
        5. **Cuidado com operações escondidas**: \`x in lista\`, \`lista.insert(0, x)\`, \`s1 + s2\` em loop, \`sorted()\` (O(n log n)).
      `),
      { type: 'table', head: ['Classe', 'Nome', 'Exemplo', 'n = 1 000 000'], rows: [
        ['O(1)', 'constante', 'acesso por índice, dict[k]', '1'],
        ['O(log n)', 'logarítmica', 'busca binária', '~20'],
        ['O(n)', 'linear', 'percorrer uma lista', '1 000 000'],
        ['O(n log n)', 'linearítmica', 'merge sort, sorted()', '~20 000 000'],
        ['O(n²)', 'quadrática', 'dois loops aninhados', '10¹²  (horas!)'],
        ['O(2ⁿ)', 'exponencial', 'todos os subconjuntos', 'impraticável'],
      ], caption: 'Número aproximado de passos. Um computador comum faz da ordem de 10⁸–10⁹ operações simples por segundo.' },
      deep('Formalmente, f(n) = O(g(n)) se existem constantes c > 0 e n₀ tais que f(n) ≤ c·g(n) para todo n ≥ n₀. Também existem Ω (limite inferior) e Θ (limite justo). Em conversas e entrevistas, "Big O" costuma ser usado no sentido de Θ do pior caso.', 'Definição formal'),
    ],
    exemplo: [{ type: 'viz', viz: 'big-o', caption: 'Arraste o tamanho da entrada e compare as curvas de crescimento.' }],
    codigo: [py(`
      def tem_duplicado_lento(xs):     # O(n²)
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
          print(f"n={n}: lento {t1-t0:.3f}s | rápido {t2-t1:.5f}s")
    `, { caption: 'Observe: dobrar n multiplica por ~4 o tempo do lento.' })],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e4-bigo-1',
          kind: 'mcq',
          prompt: 'Qual a complexidade deste código?',
          code: { lang: 'python', code: dedent(`
            def f(xs):
                total = 0
                for x in xs:
                    total += x
                for x in xs:
                    total -= 1
                return total
          `) },
          difficulty: 'facil',
          skills: ['alg-complexidade'],
          hints: ['Os loops estão aninhados ou em sequência?'],
          explanation: 'Dois loops em sequência: n + n = 2n → O(n). Constantes são ignoradas.',
          options: [
            { text: 'O(1)', feedback: 'O trabalho depende do tamanho de xs.' },
            { text: 'O(n)', correct: true, feedback: 'Isso: 2n é O(n).' },
            { text: 'O(n²)', feedback: 'Seria O(n²) se um loop estivesse dentro do outro.' },
            { text: 'O(2n)', feedback: 'Correto em espírito, mas Big O ignora constantes: escreve-se O(n).' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e4-bigo-2',
          kind: 'mcq',
          prompt: 'Qual a complexidade deste código?',
          code: { lang: 'python', code: dedent(`
            def g(n):
                passos = 0
                while n > 1:
                    n = n // 2
                    passos += 1
                return passos
          `) },
          difficulty: 'intermediario',
          skills: ['alg-complexidade'],
          hints: ['Quantas vezes você divide 1024 por 2 até chegar a 1?'],
          explanation: 'n cai pela metade a cada volta: log₂ n voltas → O(log n).',
          options: [
            { text: 'O(n)', feedback: 'n não diminui de 1 em 1, e sim pela metade.' },
            { text: 'O(log n)', correct: true, feedback: 'Isso: 1024 → 10 passos.' },
            { text: 'O(n/2)', feedback: 'Não: são divisões sucessivas, não metade dos passos.' },
            { text: 'O(1)', feedback: 'O número de passos cresce com n (bem devagar).' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e4-bigo-3',
          kind: 'mcq',
          prompt: 'Este código parece O(n). Qual é a complexidade real?',
          code: { lang: 'python', code: dedent(`
            def unicos(xs):
                out = []
                for x in xs:
                    if x not in out:
                        out.append(x)
                return out
          `) },
          difficulty: 'avancado',
          skills: ['alg-complexidade'],
          hints: ['Quanto custa `x not in out` quando out é uma lista?'],
          explanation: '`in` em lista é O(n) e está dentro de um loop de n: O(n²). Com um set auxiliar, vira O(n).',
          options: [
            { text: 'O(n)', feedback: 'Há um loop escondido no `in`.' },
            { text: 'O(n²)', correct: true, feedback: 'Isso: operações escondidas contam.' },
            { text: 'O(log n)', feedback: 'Nada é dividido pela metade.' },
            { text: 'O(n log n)', feedback: 'Não há ordenação nem divisão.' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e4-bigo-desafio',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `maior_subarray(xs)` que devolve a **maior soma** de um trecho contíguo e não vazio da lista (pode haver negativos). A versão ingênua testa todos os trechos (O(n²) ou O(n³)). Exija O(n). (Algoritmo de Kadane.)',
          difficulty: 'desafio',
          skills: ['alg-complexidade', 'alg-pd'],
          hints: ['Percorra uma vez guardando "a melhor soma de um trecho que **termina aqui**".', 'Em cada x: ou o trecho começa de novo em x, ou estende o anterior: `atual = max(x, atual + x)`.', 'Guarde também o melhor visto até agora.'],
          explanation: 'Kadane decide localmente se vale continuar o trecho. Cada elemento é visto uma vez: O(n) tempo e O(1) espaço — um exemplo de programação dinâmica com memória mínima.',
          starter: 'def maior_subarray(xs):\n    melhor = xs[0]\n    for i in range(len(xs)):\n        for j in range(i, len(xs)):\n            melhor = max(melhor, sum(xs[i:j + 1]))\n    return melhor\n',
          solution: dedent(`
            def maior_subarray(xs):
                atual = melhor = xs[0]
                for x in xs[1:]:
                    atual = max(x, atual + x)
                    melhor = max(melhor, atual)
                return melhor
          `),
          tests: [
            { name: 'exemplo clássico', code: 'assert maior_subarray([-2, 1, -3, 4, -1, 2, 1, -5, 4]) == 6' },
            { name: 'todos negativos', code: 'assert maior_subarray([-3, -1, -2]) == -1' },
            { name: 'precisa ser O(n)', code: 'import time\nxs = [(-1) ** i * (i % 7) for i in range(200000)]\nt0 = time.perf_counter()\nmaior_subarray(xs)\nassert time.perf_counter() - t0 < 1.5, "muito lento: busque uma solução de uma passada"' },
          ],
        },
      },
    ],
    projeto: [md('**Laboratório de desempenho**: escolha dois exercícios que você já resolveu e meça o tempo com n = 1 000, 10 000 e 100 000. Faça um gráfico (pode ser à mão) e confira se o crescimento bate com a sua análise Big O.')],
    revisao: [md('- Big O mede crescimento, não tempo absoluto.\n- Ignore constantes e termos menores.\n- Sequência soma; aninhamento multiplica; dividir pela metade → log n.\n- Atenção a operações escondidas (`in` em lista, insert(0), concatenação).')],
  },
  review: [
    ['Qual a complexidade de dois loops aninhados sobre n?', 'O(n²).'],
    ['O que significa O(log n)?', 'O trabalho cresce com o logaritmo: dobrar a entrada acrescenta um passo.'],
    ['Por que Big O ignora constantes?', 'Porque descreve o crescimento para n grande, independentemente da máquina.'],
  ],
  references: ['clrs', 'mit-6006', 'stanford-cs161', 'mit-6042'],
});

const busca = lesson({
  id: 'l4-busca',
  moduleId: 'm4-2',
  title: 'Busca linear e busca binária',
  titleEn: 'Linear and binary search',
  summary: 'Por que dados ordenados permitem buscar em O(log n), e os detalhes que fazem a busca binária dar errado.',
  minutes: 30,
  objectives: ['Implementar busca linear e binária', 'Entender a invariante da busca binária', 'Evitar os bugs clássicos (limites, loop infinito)', 'Usar o módulo bisect'],
  skills: ['alg-busca'],
  terms: [
    t('busca linear', 'linear search', 'Olhar elemento por elemento.'),
    t('busca binária', 'binary search', 'Em dados ordenados, comparar com o meio e descartar metade.'),
    t('invariante', 'invariant', 'Propriedade que permanece verdadeira a cada passo do algoritmo.'),
    t('ponto médio', 'midpoint', 'O índice do meio do intervalo atual.'),
  ],
  stages: {
    conceito: [md('Para achar um nome numa lista bagunçada, você precisa olhar um por um: **busca linear**, O(n). Num dicionário (ordenado!), você abre no meio e descarta metade: **busca binária**, O(log n). Para 1 bilhão de itens: ~1 bilhão de passos contra ~30.')],
    explicacao: [
      md(`
        **Busca binária** (lista ordenada \`xs\`, procurando \`alvo\`):

        1. Mantenha o intervalo \`[lo, hi]\` onde o alvo **pode** estar (essa é a **invariante**).
        2. \`meio = (lo + hi) // 2\`.
        3. Se \`xs[meio] == alvo\`, achou. Se for menor, o alvo só pode estar à direita: \`lo = meio + 1\`. Se maior: \`hi = meio - 1\`.
        4. Se \`lo > hi\`, o intervalo ficou vazio: não está lá.
      `),
      warn('Busca binária é famosa por ser fácil de explicar e difícil de acertar. Jon Bentley relatou que a maioria dos programadores profissionais errou ao implementá-la. Os bugs típicos: usar `lo = meio` (loop infinito), errar `<` × `<=`, ou esquecer que a lista precisa estar **ordenada**.'),
    ],
    exemplo: [{ type: 'viz', viz: 'binary-search', caption: 'Veja o intervalo [lo, hi] encolher pela metade a cada comparação.' }],
    codigo: [trace(`
      def busca_binaria(xs, alvo):
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

      print(busca_binaria([2, 5, 8, 12, 16, 23, 38], 23))
    `)],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e4-busca-1',
          kind: 'mcq',
          prompt: 'No máximo quantas comparações a busca binária faz em uma lista ordenada de **1 000** elementos?',
          difficulty: 'facil',
          skills: ['alg-busca'],
          hints: ['Quantas vezes você divide 1000 por 2 até sobrar 1? 2¹⁰ = 1024.'],
          explanation: '⌈log₂ 1001⌉ = 10 comparações no pior caso.',
          options: [
            { text: '~10', correct: true, feedback: 'Isso: 2¹⁰ = 1024 ≥ 1000.' },
            { text: '~100', feedback: 'Bem menos: cada passo divide por 2.' },
            { text: '500', feedback: 'Isso seria metade de uma busca linear.' },
            { text: '1000', feedback: 'Esse é o pior caso da busca linear.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e4-busca-2',
          kind: 'fix',
          lang: 'python',
          prompt: 'Esta busca binária **trava** em alguns casos (loop infinito) e erra outros. Corrija mantendo O(log n).',
          difficulty: 'intermediario',
          skills: ['alg-busca'],
          hints: ['Simule com xs = [1, 3] e alvo = 3. O que acontece com lo?', 'Se xs[meio] < alvo, o meio já foi descartado: lo deve ir para **meio + 1**.', 'E a condição do while deve permitir intervalos de 1 elemento: `lo <= hi`.'],
          explanation: 'Com `lo = meio`, quando lo e hi são vizinhos, meio == lo e nada muda: loop infinito. E `while lo < hi` nunca testa o último elemento restante.',
          starter: dedent(`
            def busca(xs, alvo):
                lo, hi = 0, len(xs) - 1
                while lo < hi:
                    meio = (lo + hi) // 2
                    if xs[meio] == alvo:
                        return meio
                    if xs[meio] < alvo:
                        lo = meio
                    else:
                        hi = meio - 1
                return -1
          `),
          solution: dedent(`
            def busca(xs, alvo):
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
          `),
          tests: [
            { name: 'encontra o último', code: 'assert busca([1, 3], 3) == 1' },
            { name: 'lista de 1 elemento', code: 'assert busca([7], 7) == 0' },
            { name: 'não encontra', code: 'assert busca([1, 3, 5], 4) == -1 and busca([], 1) == -1' },
            { name: 'todos os elementos', code: 'xs = list(range(0, 200, 3))\nassert all(busca(xs, x) == i for i, x in enumerate(xs))' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e4-busca-desafio',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `primeira_ocorrencia(xs, alvo)` que devolve o índice da **primeira** ocorrência do alvo numa lista ordenada **com repetições**, em O(log n), ou -1. Não use `bisect`.',
          difficulty: 'desafio',
          skills: ['alg-busca'],
          hints: ['Ao achar o alvo, não pare: ele pode aparecer antes.', 'Guarde o índice encontrado e continue buscando à **esquerda** (hi = meio - 1).'],
          explanation: 'Variante clássica: ao encontrar, registre e continue na metade esquerda. A mesma técnica dá a última ocorrência (continue à direita) — e é o que `bisect_left` faz.',
          starter: 'def primeira_ocorrencia(xs, alvo):\n    return xs.index(alvo) if alvo in xs else -1\n',
          solution: dedent(`
            def primeira_ocorrencia(xs, alvo):
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
                return resp
          `),
          tests: [
            { name: 'repetições', code: 'assert primeira_ocorrencia([1, 2, 2, 2, 3], 2) == 1' },
            { name: 'ausente', code: 'assert primeira_ocorrencia([1, 3], 2) == -1' },
            { name: 'precisa ser O(log n)', code: 'import time\nxs = [5] * 3_000_000\nt0 = time.perf_counter()\nfor _ in range(300):\n    r = primeira_ocorrencia(xs, 6)\nassert r == -1 and time.perf_counter() - t0 < 0.5, "muito lento: não percorra a lista"' },
          ],
        },
      },
    ],
    projeto: [md('**Jogo: adivinhe o número**. O computador escolhe um número de 1 a 1000 e responde "maior" ou "menor". Depois inverta: **você** escolhe e o programa adivinha usando busca binária. Ele sempre acerta em até 10 tentativas — por quê?')],
    revisao: [md('- Linear: O(n), funciona sem ordem.\n- Binária: O(log n), exige ordenação.\n- Invariante: o alvo, se existir, está em [lo, hi].\n- lo = meio + 1, hi = meio - 1, while lo <= hi.')],
  },
  review: [
    ['Qual a pré-condição da busca binária?', 'A sequência precisa estar ordenada.'],
    ['Qual a invariante da busca binária?', 'Se o alvo existe, ele está no intervalo [lo, hi].'],
  ],
  references: ['clrs', 'bentley-pearls', 'python-docs'],
});

const ordenacao = lesson({
  id: 'l4-ordenacao',
  moduleId: 'm4-3',
  title: 'Algoritmos de ordenação',
  titleEn: 'Sorting algorithms',
  summary: 'Bubble, insertion, merge e quick sort: como funcionam, quanto custam e quando usar cada um.',
  minutes: 40,
  objectives: ['Implementar insertion sort e merge sort', 'Comparar complexidades e estabilidade', 'Entender o limite Ω(n log n) para ordenação por comparação', 'Usar sorted() com key'],
  skills: ['alg-ordenacao'],
  terms: [
    t('ordenação', 'sorting', 'Colocar elementos em ordem.'),
    t('estável', 'stable', 'Mantém a ordem relativa de elementos iguais.'),
    t('no lugar', 'in-place', 'Usa memória extra constante (ou quase).'),
    t('pivô', 'pivot', 'Elemento usado pelo quicksort para dividir a lista.'),
    t('intercalar', 'merge', 'Juntar duas listas ordenadas em uma ordenada.'),
  ],
  stages: {
    conceito: [md('Ordenar é uma das operações mais comuns da computação — e estudar ordenação ensina as grandes ideias de algoritmos: **incremental** (insertion), **dividir e conquistar** (merge, quick), análise de **pior caso × caso médio** e **estabilidade**.')],
    explicacao: [
      { type: 'table', head: ['Algoritmo', 'Ideia', 'Tempo (médio / pior)', 'Espaço', 'Estável?'], rows: [
        ['Bubble sort', 'troca vizinhos fora de ordem, várias passadas', 'O(n²) / O(n²)', 'O(1)', 'sim'],
        ['Insertion sort', 'insere cada item na parte já ordenada', 'O(n²) / O(n²) — mas O(n) se quase ordenada', 'O(1)', 'sim'],
        ['Merge sort', 'divide ao meio, ordena cada metade, intercala', 'O(n log n) / O(n log n)', 'O(n)', 'sim'],
        ['Quick sort', 'escolhe pivô, separa menores e maiores, recursão', 'O(n log n) / O(n²)', 'O(log n)', 'não (em geral)'],
        ['Timsort (sorted do Python)', 'híbrido de merge + insertion, aproveita trechos já ordenados', 'O(n log n) / O(n log n)', 'O(n)', 'sim'],
      ] },
      deep('Qualquer algoritmo que ordena **apenas comparando** elementos precisa de Ω(n log n) comparações no pior caso: existem n! ordens possíveis, e cada comparação no máximo divide as possibilidades ao meio, então são necessárias log₂(n!) ≈ n log₂ n comparações. Algoritmos como counting sort e radix sort escapam desse limite porque não comparam — usam a estrutura das chaves.', 'Por que n log n é o limite?'),
      tip('Na prática, use `sorted(xs)` ou `xs.sort()`, com `key=` para critérios: `sorted(alunos, key=lambda a: (-a["nota"], a["nome"]))` ordena por nota decrescente e, em empate, por nome. Implementar ordenações serve para **entender**, não para substituir a biblioteca.'),
    ],
    exemplo: [{ type: 'viz', viz: 'sorting', caption: 'Escolha o algoritmo, embaralhe e acompanhe comparações e trocas. Compare o número de operações.' }],
    codigo: [py(`
      def merge_sort(xs):
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

      print(merge_sort([38, 27, 43, 3, 9, 82, 10]))
    `)],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e4-sort-0',
          kind: 'predict',
          lang: 'python',
          prompt: "O que este código imprime?",
          code: "nums = [3, 1, 2]\nordenada = sorted(nums)\nprint(nums)\nprint(ordenada)",
          answer: "[3, 1, 2]\n[1, 2, 3]",
          difficulty: 'facil',
          skills: ["alg-ordenacao"],
          hints: ["sorted() devolve uma lista nova; .sort() altera a lista e devolve None."],
          explanation: "sorted(nums) cria uma nova lista ordenada e não mexe em nums. Por isso a primeira linha mostra a ordem original e a segunda a ordenada.",
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e4-sort-1',
          kind: 'code',
          lang: 'python',
          prompt: 'Implemente `insertion_sort(xs)` que ordena a lista **no lugar** (e também a devolve). Não use sort/sorted.',
          difficulty: 'intermediario',
          skills: ['alg-ordenacao'],
          hints: ['Para cada i a partir de 1, a parte xs[0:i] já está ordenada.', 'Guarde x = xs[i] e desloque para a direita os elementos maiores que x; depois coloque x no buraco.'],
          explanation: 'Insertion sort é O(n²) no pior caso, mas muito rápido em listas pequenas ou quase ordenadas — por isso o Timsort o usa em trechos curtos.',
          starter: 'def insertion_sort(xs):\n    return xs\n',
          solution: dedent(`
            def insertion_sort(xs):
                for i in range(1, len(xs)):
                    x = xs[i]
                    j = i - 1
                    while j >= 0 and xs[j] > x:
                        xs[j + 1] = xs[j]
                        j -= 1
                    xs[j + 1] = x
                return xs
          `),
          tests: [
            { name: 'ordena', code: 'assert insertion_sort([5, 2, 9, 1, 5, 6]) == [1, 2, 5, 5, 6, 9]' },
            { name: 'no lugar', code: 'xs = [3, 1, 2]\ninsertion_sort(xs)\nassert xs == [1, 2, 3]' },
            { name: 'bordas', code: 'assert insertion_sort([]) == [] and insertion_sort([1]) == [1]' },
            { name: 'aleatório', code: 'import random\nxs = [random.randint(-50, 50) for _ in range(200)]\nassert insertion_sort(xs[:]) == sorted(xs)' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e4-sort-2',
          kind: 'mcq',
          prompt: 'Você ordena uma planilha por **cidade** e depois, de forma **estável**, por **estado**. Como fica a ordem das cidades dentro de cada estado?',
          difficulty: 'avancado',
          skills: ['alg-ordenacao'],
          hints: ['Estável = elementos com a mesma chave mantêm a ordem que tinham antes.'],
          explanation: 'A segunda ordenação (estável) agrupa por estado preservando a ordem anterior entre itens do mesmo estado — que era alfabética por cidade. É assim que se ordena por múltiplas chaves.',
          options: [
            { text: 'Aleatória', feedback: 'Seria possível com uma ordenação instável.' },
            { text: 'Alfabética por cidade', correct: true, feedback: 'Isso: a estabilidade preserva a ordenação anterior.' },
            { text: 'Inversa', feedback: 'Nada inverte a ordem.' },
            { text: 'Na ordem original da planilha', feedback: 'A ordem "original" já tinha sido trocada pela ordenação por cidade.' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e4-sort-desafio',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `contar_inversoes(xs)`: o número de pares (i, j) com i < j e xs[i] > xs[j]. Mede "quão desordenada" está a lista. Exija O(n log n): adapte o merge sort.',
          difficulty: 'desafio',
          skills: ['alg-ordenacao', 'alg-recursao'],
          hints: ['Inversões = inversões da metade esquerda + da direita + as "cruzadas".', 'No merge, quando você pega um elemento da direita antes de elementos restantes da esquerda, ele forma inversão com **todos** os que restam na esquerda.'],
          explanation: 'Ao intercalar, se dir[j] < esq[i], então dir[j] é menor que esq[i:], somando len(esq) - i inversões de uma vez. Dividir e conquistar transforma O(n²) em O(n log n).',
          starter: 'def contar_inversoes(xs):\n    c = 0\n    for i in range(len(xs)):\n        for j in range(i + 1, len(xs)):\n            if xs[i] > xs[j]:\n                c += 1\n    return c\n',
          solution: dedent(`
            def contar_inversoes(xs):
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
                return ordena(list(xs))[1]
          `),
          tests: [
            { name: 'exemplo', code: 'assert contar_inversoes([2, 4, 1, 3, 5]) == 3' },
            { name: 'ordenada e invertida', code: 'assert contar_inversoes([1, 2, 3]) == 0 and contar_inversoes([3, 2, 1]) == 3' },
            { name: 'precisa ser O(n log n)', code: 'import time\nxs = list(range(30000, 0, -1))\nt0 = time.perf_counter()\nr = contar_inversoes(xs)\nassert r == 30000 * 29999 // 2 and time.perf_counter() - t0 < 2.5, "muito lento"' },
          ],
        },
      },
    ],
    projeto: [md('**Benchmark**: implemente bubble, insertion e merge sort, e compare com `sorted()` para n = 1 000, 10 000 e 100 000 (pule os O(n²) quando ficarem lentos demais). Teste também com listas **quase ordenadas**. Escreva 3 conclusões.')],
    revisao: [md('- O(n²): bubble, insertion (ótimo para quase ordenadas).\n- O(n log n): merge (estável, O(n) memória), quick (rápido na média, O(n²) no pior).\n- Limite Ω(n log n) para ordenação por comparação.\n- Na prática: sorted/sort com key.')],
  },
  review: [
    ['O que é uma ordenação estável?', 'Uma que mantém a ordem relativa dos elementos com chaves iguais.'],
    ['Pior caso do quicksort e quando acontece?', 'O(n²), quando o pivô é sempre o menor ou o maior (ex.: pivô fixo em lista já ordenada).'],
    ['Por que merge sort é O(n log n)?', 'São log n níveis de divisão, e cada nível intercala n elementos no total.'],
  ],
  references: ['clrs', 'sedgewick-algs', 'mit-6006', 'python-sorting-howto'],
});

const recursao = lesson({
  id: 'l4-recursao',
  moduleId: 'm4-4',
  title: 'Recursão e dividir para conquistar',
  titleEn: 'Recursion and divide and conquer',
  summary: 'Funções que chamam a si mesmas: caso base, passo recursivo, pilha de chamadas e memoização.',
  minutes: 40,
  objectives: ['Escrever funções recursivas com caso base e passo recursivo', 'Visualizar a pilha de chamadas', 'Identificar recursão exponencial e corrigir com memoização', 'Aplicar dividir para conquistar'],
  skills: ['alg-recursao'],
  terms: [
    t('recursão', 'recursion', 'Quando uma função chama a si mesma para resolver um problema menor.'),
    t('caso base', 'base case', 'Situação resolvida diretamente, sem nova chamada.'),
    t('passo recursivo', 'recursive step / recursive case', 'Reduz o problema e chama a função de novo.'),
    t('estouro de pilha', 'stack overflow', 'Erro quando há chamadas aninhadas demais.', 'RecursionError: maximum recursion depth exceeded'),
    t('memoização', 'memoization', 'Guardar resultados já calculados para não recalcular.'),
    t('dividir para conquistar', 'divide and conquer', 'Dividir em subproblemas, resolver e combinar.'),
  ],
  stages: {
    conceito: [md('Uma função **recursiva** resolve um problema usando a **mesma função** para uma versão **menor** do problema. Toda recursão precisa de um **{{caso base|base case}}** (o problema tão pequeno que a resposta é direta) e de um **{{passo recursivo|recursive step}}** que se aproxima do caso base.')],
    explicacao: [
      md(`
        **Exemplo**: \`fatorial(n) = n × fatorial(n − 1)\`, com \`fatorial(0) = 1\`.

        **Como pensar** ("salto de fé recursivo", *recursive leap of faith*): **suponha** que a função já funciona para o problema menor e pergunte apenas: *como uso essa resposta para resolver o problema atual?*

        Cada chamada empilha um **quadro** na pilha de chamadas. Sem caso base (ou se ele nunca é alcançado), a pilha cresce até \`RecursionError\` (o Python limita a ~1000 níveis por padrão).

        **Dividir para conquistar**: divida em partes (merge sort divide ao meio), resolva cada parte recursivamente e **combine** (intercalar). Custo típico: O(n log n).
      `),
      warn('Recursão ingênua pode refazer o mesmo trabalho exponencialmente. `fib(n) = fib(n-1) + fib(n-2)` chama `fib(30)` mais de 1,6 milhão de vezes. Solução: **memoização** (`@functools.cache`) ou programação dinâmica.', 'Cuidado com a explosão exponencial'),
    ],
    exemplo: [trace(`
      def fatorial(n):
          if n == 0:
              return 1
          return n * fatorial(n - 1)

      print(fatorial(4))
    `, 'Observe a pilha crescer até n == 0 e depois "desempilhar" multiplicando.')],
    codigo: [py(`
      from functools import cache
      import time

      def fib_lento(n):
          return n if n < 2 else fib_lento(n - 1) + fib_lento(n - 2)

      @cache
      def fib(n):
          return n if n < 2 else fib(n - 1) + fib(n - 2)

      t0 = time.perf_counter(); fib_lento(25); t1 = time.perf_counter()
      fib(25); t2 = time.perf_counter()
      print(f"sem cache: {t1-t0:.3f}s  com cache: {t2-t1:.6f}s")
      print(fib(200))
    `)],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e4-rec-1',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `soma_digitos(n)` **recursiva** que devolve a soma dos dígitos de um inteiro n >= 0. `soma_digitos(1234) == 10`. Sem loops e sem converter para string.',
          difficulty: 'facil',
          skills: ['alg-recursao'],
          hints: ['Qual é o caso mais simples? Um número de um dígito.', '`n % 10` é o último dígito; `n // 10` é o número sem ele.'],
          explanation: 'Caso base: n < 10 → n. Passo: último dígito + soma_digitos(resto). A cada chamada, n perde um dígito: aproxima-se do caso base.',
          starter: 'def soma_digitos(n):\n    pass\n',
          solution: 'def soma_digitos(n):\n    if n < 10:\n        return n\n    return n % 10 + soma_digitos(n // 10)\n',
          tests: [
            { name: '1234 → 10', code: 'assert soma_digitos(1234) == 10' },
            { name: '0 → 0', code: 'assert soma_digitos(0) == 0' },
            { name: '99999 → 45', code: 'assert soma_digitos(99999) == 45' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e4-rec-2',
          kind: 'fix',
          lang: 'python',
          prompt: '`potencia(b, e)` causa `RecursionError` para alguns valores e está lenta. Corrija o caso base e use "exponenciação rápida": b^e = (b^(e/2))² quando e é par.',
          difficulty: 'intermediario',
          skills: ['alg-recursao'],
          hints: ['Para e = 0 o que deveria acontecer? O caso base atual cobre e = 0?', 'Calcule `metade = potencia(b, e // 2)` **uma vez** e use metade * metade.'],
          explanation: 'Com caso base correto (e == 0 → 1) e reaproveitando o resultado da metade, o número de chamadas cai de O(e) para O(log e).',
          starter: dedent(`
            def potencia(b, e):
                if e == 1:
                    return b
                return b * potencia(b, e - 1)
          `),
          solution: dedent(`
            def potencia(b, e):
                if e == 0:
                    return 1
                metade = potencia(b, e // 2)
                if e % 2 == 0:
                    return metade * metade
                return metade * metade * b
          `),
          tests: [
            { name: 'potencia(2, 10) == 1024', code: 'assert potencia(2, 10) == 1024' },
            { name: 'expoente 0', code: 'assert potencia(5, 0) == 1' },
            { name: 'expoente grande (precisa ser log)', code: 'assert potencia(3, 5000) == 3 ** 5000' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e4-rec-desafio',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `permutacoes(xs)` que devolve a lista de **todas** as permutações de `xs` (lista de elementos distintos), em qualquer ordem, usando recursão. Não use `itertools`.',
          difficulty: 'desafio',
          skills: ['alg-recursao'],
          hints: ['Caso base: lista vazia tem exatamente uma permutação (a vazia).', 'Para cada elemento x: x na frente + cada permutação dos **demais**.'],
          explanation: 'Escolher o primeiro e permutar o resto é *backtracking* em sua forma mais simples. São n! resultados: crescimento fatorial, inviável para n grande.',
          starter: 'def permutacoes(xs):\n    pass\n',
          solution: dedent(`
            def permutacoes(xs):
                if not xs:
                    return [[]]
                out = []
                for i, x in enumerate(xs):
                    for p in permutacoes(xs[:i] + xs[i + 1:]):
                        out.append([x] + p)
                return out
          `),
          tests: [
            { name: '3 elementos', code: 'assert sorted(permutacoes([1, 2, 3])) == [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]' },
            { name: 'vazia', code: 'assert permutacoes([]) == [[]]' },
            { name: 'quantidade = n!', code: 'assert len(permutacoes(list(range(6)))) == 720' },
          ],
        },
      },
    ],
    projeto: [md('**Mini-projeto: Torre de Hanói**. Escreva `hanoi(n, origem, destino, aux)` que imprime os movimentos para mover n discos. Prove (ou verifique) que são 2ⁿ − 1 movimentos. Esse problema é o exemplo clássico de como a recursão torna simples algo que parece complicado.')],
    revisao: [md('- Recursão = caso base + passo recursivo que se aproxima dele.\n- Cada chamada ocupa um quadro na pilha; profundidade demais → RecursionError.\n- Recursões que repetem subproblemas: memoize.\n- Dividir para conquistar: dividir, resolver, combinar.')],
  },
  review: [
    ['Quais os dois elementos de toda função recursiva?', 'Caso base e passo recursivo que se aproxima dele.'],
    ['O que é memoização?', 'Guardar resultados de chamadas já feitas para não recalcular.'],
    ['Por que fib recursiva ingênua é lenta?', 'Recalcula os mesmos subproblemas repetidamente: crescimento exponencial.'],
  ],
  references: ['cs61a', 'composing-programs', 'sicp', 'clrs'],
});

const pd = lesson({
  id: 'l4-pd-guloso',
  moduleId: 'm4-5',
  title: 'Programação dinâmica e algoritmos gulosos',
  titleEn: 'Dynamic programming and greedy algorithms',
  summary: 'Subproblemas sobrepostos, subestrutura ótima, tabelas de PD e quando a escolha gulosa funciona.',
  minutes: 45,
  objectives: ['Reconhecer subproblemas sobrepostos e subestrutura ótima', 'Transformar recursão em PD (top-down e bottom-up)', 'Saber quando um algoritmo guloso é correto e quando falha'],
  skills: ['alg-pd'],
  terms: [
    t('programação dinâmica', 'dynamic programming (DP)', 'Resolver cada subproblema uma vez e reutilizar a resposta.'),
    t('subestrutura ótima', 'optimal substructure', 'A solução ótima é composta de soluções ótimas de subproblemas.'),
    t('subproblemas sobrepostos', 'overlapping subproblems', 'Os mesmos subproblemas aparecem várias vezes.'),
    t('guloso', 'greedy', 'Escolhe a melhor opção local a cada passo, sem voltar atrás.'),
    t('tabela', 'table / tabulation', 'Estrutura onde a PD bottom-up guarda os resultados.'),
  ],
  stages: {
    conceito: [md('**Programação dinâmica** é recursão + memória: quando um problema se divide em subproblemas que **se repetem**, resolvemos cada um **uma vez** e guardamos. **Algoritmos gulosos** fazem a melhor escolha **local** a cada passo — funcionam às vezes, e é preciso **provar** que funcionam.')],
    explicacao: [
      md(`
        **Receita de PD**:

        1. Defina o **estado**: o que identifica um subproblema? (ex.: \`melhor(i)\` = melhor resposta usando os primeiros i itens.)
        2. Escreva a **recorrência**: como \`melhor(i)\` depende de estados menores?
        3. Defina os **casos base**.
        4. Escolha a **ordem**: top-down (recursão + cache) ou bottom-up (preencher uma tabela do menor para o maior).

        **Exemplo — troco mínimo**: menor número de moedas para dar o valor V com moedas \`[1, 3, 4]\`.
        \`troco(v) = 1 + min(troco(v − m) para cada moeda m ≤ v)\`, com \`troco(0) = 0\`.

        **Guloso falha aqui**: para V = 6, pegar sempre a maior moeda dá 4 + 1 + 1 (3 moedas), mas o ótimo é 3 + 3 (2 moedas). Com as moedas do real (1, 5, 10, 25, 50, 100) o guloso funciona — sistemas de moedas reais são escolhidos para isso.
      `),
      info('Problemas famosos de PD: mochila (*knapsack*), maior subsequência comum (*LCS*, usada no `diff` e no Git), distância de edição (*edit distance*, usada em corretores ortográficos), caminhos em grade. Gulosos corretos: Dijkstra, Kruskal/Prim (árvore geradora mínima), codificação de Huffman, escalonamento de intervalos.'),
    ],
    exemplo: [py(`
      def troco_minimo(moedas, valor):
          INF = float("inf")
          dp = [0] + [INF] * valor          # dp[v] = menor nº de moedas para v
          for v in range(1, valor + 1):
              for m in moedas:
                  if m <= v and dp[v - m] + 1 < dp[v]:
                      dp[v] = dp[v - m] + 1
          return dp[valor] if dp[valor] != INF else -1

      print(troco_minimo([1, 3, 4], 6))   # 2 (3 + 3)
    `)],
    codigo: [trace(`
      def caminhos(linhas, colunas):
          dp = [[1] * colunas for _ in range(linhas)]
          for i in range(1, linhas):
              for j in range(1, colunas):
                  dp[i][j] = dp[i - 1][j] + dp[i][j - 1]
          return dp[-1][-1]

      print(caminhos(3, 3))
    `, 'Quantos caminhos de canto a canto numa grade, andando só para a direita e para baixo? Cada célula soma a de cima e a da esquerda.')],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e4-pd-0',
          kind: 'predict',
          lang: 'python',
          prompt: "O que este código imprime? Observe o dicionário `memo`.",
          code: "memo = {}\ncalls = 0\n\ndef fib(n):\n    global calls\n    if n in memo:\n        return memo[n]\n    calls += 1\n    memo[n] = n if n < 2 else fib(n - 1) + fib(n - 2)\n    return memo[n]\n\nprint(fib(5), calls)",
          answer: "5 6",
          difficulty: 'facil',
          skills: ["alg-pd"],
          hints: ["Siga quantas vezes a linha `calls += 1` roda: cada n de 0 a 5 só é calculado uma vez."],
          explanation: "Com memoização, cada valor de n é calculado uma única vez (6 chamadas que chegam ao cálculo, de 0 a 5). fib(5) = 5.",
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e4-pd-1',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `escadas(n)`: de quantas formas é possível subir n degraus dando passos de 1 ou 2? (`escadas(1) == 1`, `escadas(2) == 2`, `escadas(3) == 3`). Precisa funcionar para n = 500.',
          difficulty: 'intermediario',
          skills: ['alg-pd'],
          hints: ['Para chegar ao degrau n, o último passo veio de n−1 ou de n−2.', 'escadas(n) = escadas(n−1) + escadas(n−2). Bottom-up com duas variáveis.'],
          explanation: 'É a sequência de Fibonacci disfarçada. Bottom-up com duas variáveis: O(n) tempo, O(1) espaço, sem risco de RecursionError.',
          starter: 'def escadas(n):\n    if n <= 2:\n        return n\n    return escadas(n - 1) + escadas(n - 2)\n',
          solution: dedent(`
            def escadas(n):
                a, b = 1, 1
                for _ in range(n - 1):
                    a, b = b, a + b
                return b if n > 0 else 1
          `),
          tests: [
            { name: 'pequenos', code: 'assert [escadas(i) for i in (1, 2, 3, 4, 5)] == [1, 2, 3, 5, 8]' },
            { name: 'n = 500 (precisa ser eficiente)', code: 'a, b = 1, 1\nfor _ in range(499):\n    a, b = b, a + b\nassert escadas(500) == b' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e4-pd-2',
          kind: 'mcq',
          prompt: 'Moedas disponíveis: 1, 6 e 10. Valor: 12. O que o algoritmo **guloso** (sempre a maior moeda possível) devolve, e qual é o ótimo?',
          difficulty: 'intermediario',
          skills: ['alg-pd'],
          hints: ['Guloso: 10 primeiro. Sobra quanto?', 'Existe forma com 2 moedas?'],
          explanation: 'Guloso: 10 + 1 + 1 = 3 moedas. Ótimo: 6 + 6 = 2 moedas. Guloso não é sempre ótimo; PD é.',
          options: [
            { text: 'Guloso 3 moedas; ótimo 2 moedas', correct: true, feedback: 'Isso: 10+1+1 contra 6+6.' },
            { text: 'Os dois dão 2 moedas', feedback: 'O guloso pega o 10 primeiro e fica preso com 2 de resto.' },
            { text: 'Guloso 2; ótimo 3', feedback: 'O ótimo nunca é pior que o guloso.' },
            { text: 'Os dois dão 3 moedas', feedback: '6 + 6 usa só 2.' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e4-pd-desafio',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `distancia_edicao(a, b)`: o menor número de inserções, remoções ou substituições de caracteres para transformar a em b (distância de Levenshtein). `distancia_edicao("gato", "pato") == 1`.',
          difficulty: 'desafio',
          skills: ['alg-pd'],
          hints: ['Estado: dp[i][j] = distância entre os i primeiros caracteres de a e os j primeiros de b.', 'Bases: dp[i][0] = i, dp[0][j] = j.', 'Se a[i-1] == b[j-1]: dp[i][j] = dp[i-1][j-1]; senão 1 + min(remover, inserir, substituir).'],
          explanation: 'Clássico de PD em tabela 2D, O(len(a) × len(b)). Usado em corretores ortográficos, bioinformática e no "Did you mean...?" do próprio Python.',
          starter: 'def distancia_edicao(a, b):\n    pass\n',
          solution: dedent(`
            def distancia_edicao(a, b):
                dp = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
                for i in range(len(a) + 1):
                    dp[i][0] = i
                for j in range(len(b) + 1):
                    dp[0][j] = j
                for i in range(1, len(a) + 1):
                    for j in range(1, len(b) + 1):
                        if a[i - 1] == b[j - 1]:
                            dp[i][j] = dp[i - 1][j - 1]
                        else:
                            dp[i][j] = 1 + min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
                return dp[-1][-1]
          `),
          tests: [
            { name: 'gato → pato', code: 'assert distancia_edicao("gato", "pato") == 1' },
            { name: 'kitten → sitting', code: 'assert distancia_edicao("kitten", "sitting") == 3' },
            { name: 'vazios', code: 'assert distancia_edicao("", "abc") == 3 and distancia_edicao("", "") == 0' },
          ],
        },
      },
    ],
    projeto: [md('**Mini-projeto: corretor ortográfico**. Com uma lista de palavras (um dicionário de português) e `distancia_edicao`, sugira as 3 palavras mais próximas do que o usuário digitou. Como deixar rápido para 100 mil palavras? (Pesquise: *BK-tree*.)')],
    revisao: [md('- PD: estado, recorrência, bases, ordem (top-down ou bottom-up).\n- Exige subproblemas sobrepostos e subestrutura ótima.\n- Guloso: rápido e simples, mas só é correto com prova.')],
  },
  review: [
    ['Quais as duas propriedades que indicam PD?', 'Subproblemas sobrepostos e subestrutura ótima.'],
    ['Top-down × bottom-up?', 'Top-down: recursão com cache. Bottom-up: preencher a tabela dos menores para os maiores.'],
    ['Quando o guloso falha no problema do troco?', 'Quando o sistema de moedas não é "canônico", ex.: [1, 3, 4] para 6.'],
  ],
  references: ['clrs', 'mit-6006', 'stanford-cs161', 'kleinberg-tardos'],
});

const algGrafos = lesson({
  id: 'l4-dijkstra',
  moduleId: 'm4-6',
  title: 'Caminhos mínimos com pesos: Dijkstra',
  titleEn: 'Weighted shortest paths: Dijkstra',
  summary: 'Quando as arestas têm custo, a BFS não basta. Dijkstra usa uma fila de prioridade.',
  minutes: 35,
  objectives: ['Entender por que BFS falha com pesos', 'Implementar Dijkstra com heapq', 'Saber a limitação com pesos negativos'],
  skills: ['alg-grafos'],
  terms: [
    t('grafo ponderado', 'weighted graph', 'Grafo em que cada aresta tem um custo.'),
    t('fila de prioridade', 'priority queue', 'Estrutura que sempre devolve o item de menor prioridade primeiro.'),
    t('heap', 'heap', 'Árvore que implementa fila de prioridade com inserção/remoção O(log n).'),
    t('relaxar uma aresta', 'edge relaxation', 'Atualizar a distância de um vértice se um caminho melhor foi encontrado.'),
  ],
  stages: {
    conceito: [md('Num mapa, as estradas têm **comprimentos** diferentes: o caminho com menos estradas não é necessariamente o mais curto. O **algoritmo de Dijkstra** encontra os menores caminhos a partir de uma origem quando os pesos são **não negativos**.')],
    explicacao: [
      md(`
        Ideia (gulosa, e provadamente correta para pesos ≥ 0):

        1. dist[origem] = 0; todos os outros = ∞.
        2. Repita: pegue o vértice **não finalizado com menor distância** (fila de prioridade / heap).
        3. Para cada vizinho, **relaxe** a aresta: se dist[v] + peso < dist[w], atualize dist[w].

        Com \`heapq\`: O((V + E) log V). Com pesos negativos, Dijkstra pode errar — use Bellman-Ford.
      `),
    ],
    exemplo: [py(`
      import heapq

      def dijkstra(g, origem):
          dist = {origem: 0}
          heap = [(0, origem)]
          while heap:
              d, v = heapq.heappop(heap)
              if d > dist.get(v, float("inf")):
                  continue                       # entrada antiga, ignore
              for w, peso in g[v]:
                  nd = d + peso
                  if nd < dist.get(w, float("inf")):
                      dist[w] = nd
                      heapq.heappush(heap, (nd, w))
          return dist

      mapa = {"A": [("B", 4), ("C", 1)], "B": [("D", 1)], "C": [("B", 2), ("D", 5)], "D": []}
      print(dijkstra(mapa, "A"))   # B por C é mais curto: 1 + 2 = 3
    `)],
    codigo: [md('`heapq` transforma uma lista em um **min-heap**: `heappush` e `heappop` em O(log n), e o menor elemento sempre em `heap[0]`.'), py(`
      import heapq
      tarefas = []
      heapq.heappush(tarefas, (3, "estudar grafos"))
      heapq.heappush(tarefas, (1, "revisar flashcards"))
      heapq.heappush(tarefas, (2, "fazer desafio"))
      while tarefas:
          print(heapq.heappop(tarefas))
    `)],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e4-dij-1',
          kind: 'mcq',
          prompt: 'Por que a BFS não serve para menor caminho em grafo **com pesos**?',
          difficulty: 'facil',
          skills: ['alg-grafos'],
          hints: ['O que a BFS minimiza: o número de arestas ou a soma dos pesos?'],
          explanation: 'BFS minimiza o número de arestas. Um caminho com mais arestas pode ter soma de pesos menor.',
          options: [
            { text: 'Porque a BFS minimiza o número de arestas, não a soma dos pesos', correct: true, feedback: 'Isso.' },
            { text: 'Porque a BFS não termina em grafos com pesos', feedback: 'Ela termina, só não responde a pergunta certa.' },
            { text: 'Porque a BFS só funciona em árvores', feedback: 'BFS funciona em qualquer grafo.' },
            { text: 'Porque pesos tornam o grafo direcionado', feedback: 'Peso e direção são independentes.' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e4-dij-desafio',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `custo_minimo(g, a, b)` que devolve o custo do menor caminho de a até b (ou `None`), em um grafo `{v: [(w, peso), ...]}` com pesos não negativos.',
          difficulty: 'avancado',
          skills: ['alg-grafos'],
          hints: ['Adapte o Dijkstra do exemplo.', 'Você pode parar assim que retirar b do heap: a distância dele já é final.'],
          explanation: 'Quando um vértice sai do heap pela primeira vez (com distância atual), sua distância é definitiva — é exatamente a propriedade gulosa provada para pesos não negativos.',
          starter: 'import heapq\n\ndef custo_minimo(g, a, b):\n    pass\n',
          solution: dedent(`
            import heapq

            def custo_minimo(g, a, b):
                dist = {a: 0}
                heap = [(0, a)]
                while heap:
                    d, v = heapq.heappop(heap)
                    if v == b:
                        return d
                    if d > dist[v]:
                        continue
                    for w, p in g.get(v, []):
                        if d + p < dist.get(w, float("inf")):
                            dist[w] = d + p
                            heapq.heappush(heap, (d + p, w))
                return None
          `),
          tests: [
            { name: 'caminho indireto mais barato', code: 'g = {"A": [("B", 4), ("C", 1)], "B": [("D", 1)], "C": [("B", 2), ("D", 5)], "D": []}\nassert custo_minimo(g, "A", "D") == 4' },
            { name: 'inalcançável', code: 'assert custo_minimo({"A": [], "B": []}, "A", "B") is None' },
            { name: 'origem', code: 'assert custo_minimo({"A": []}, "A", "A") == 0' },
          ],
        },
      },
    ],
    projeto: [md('**Mini-projeto: rotas no metrô**. Modele algumas estações do metrô da sua cidade (ou uma inventada) com tempos entre estações e baldeações. Implemente "como chegar mais rápido de X a Y" mostrando o caminho, não só o custo.')],
    revisao: [md('- Pesos → Dijkstra (pesos ≥ 0), fila de prioridade, relaxamento.\n- O((V + E) log V) com heap.\n- Pesos negativos: Bellman-Ford.')],
  },
  review: [
    ['Qual estrutura o Dijkstra usa para escolher o próximo vértice?', 'Uma fila de prioridade (heap) pela menor distância.'],
    ['Quando o Dijkstra pode falhar?', 'Com arestas de peso negativo.'],
  ],
  references: ['clrs', 'sedgewick-algs', 'python-docs'],
});

export const level4: Level = {
  id: 'n4',
  number: 4,
  title: 'Algoritmos',
  titleEn: 'Algorithms',
  goal: 'Analisar e projetar algoritmos eficientes: complexidade, busca, ordenação, recursão, PD, gulosos e grafos.',
  why: 'É aqui que o pensamento computacional vira técnica: você aprende a provar que algo funciona, medir quanto custa e escolher entre abordagens. É também o núcleo das entrevistas técnicas e das disciplinas de algoritmos da graduação.',
  modules: [
    {
      id: 'm4-1', levelId: 'n4', title: 'Complexidade e Big O', titleEn: 'Complexity and Big O',
      description: 'Medir a eficiência de algoritmos.',
      prerequisites: ['m3-1'],
      skills: [{ id: 'alg-complexidade', pt: 'Análise de complexidade', en: 'Complexity analysis' }],
      outline: ['Crescimento de funções', 'Big O, Ω e Θ', 'Tempo e espaço', 'Operações escondidas', 'Análise amortizada'],
      lessons: [bigO, ...m4_1],
      references: ['clrs', 'mit-6006'],
    },
    {
      id: 'm4-2', levelId: 'n4', title: 'Busca', titleEn: 'Searching',
      description: 'Busca linear, binária e suas variantes.',
      prerequisites: ['m4-1'],
      skills: [{ id: 'alg-busca', pt: 'Algoritmos de busca', en: 'Searching algorithms' }],
      outline: ['Busca linear', 'Busca binária e invariantes', 'Primeira/última ocorrência', 'bisect', 'Busca binária na resposta'],
      lessons: [busca, ...m4_2],
      references: ['clrs', 'bentley-pearls'],
    },
    {
      id: 'm4-3', levelId: 'n4', title: 'Ordenação', titleEn: 'Sorting',
      description: 'Algoritmos clássicos de ordenação e seus custos.',
      prerequisites: ['m4-2', 'm4-4'],
      skills: [{ id: 'alg-ordenacao', pt: 'Algoritmos de ordenação', en: 'Sorting algorithms' }],
      outline: ['Bubble e insertion', 'Merge sort', 'Quick sort', 'Estabilidade', 'Limite n log n', 'Counting e radix sort'],
      lessons: [ordenacao, ...m4_3],
      references: ['clrs', 'sedgewick-algs'],
    },
    {
      id: 'm4-4', levelId: 'n4', title: 'Recursão e dividir para conquistar', titleEn: 'Recursion and divide and conquer',
      description: 'Pensar recursivamente e dividir problemas.',
      prerequisites: ['m2-4'],
      skills: [{ id: 'alg-recursao', pt: 'Recursão', en: 'Recursion' }],
      outline: ['Caso base e passo recursivo', 'Pilha de chamadas', 'Memoização', 'Dividir para conquistar', 'Backtracking'],
      lessons: [recursao, ...m4_4],
      references: ['cs61a', 'sicp'],
    },
    {
      id: 'm4-5', levelId: 'n4', title: 'Programação dinâmica e gulosos', titleEn: 'Dynamic programming and greedy',
      description: 'Técnicas de projeto para problemas de otimização.',
      prerequisites: ['m4-4', 'm3-3'],
      skills: [{ id: 'alg-pd', pt: 'Programação dinâmica e algoritmos gulosos', en: 'Dynamic programming and greedy algorithms' }],
      outline: ['Estado e recorrência', 'Top-down e bottom-up', 'Troco, mochila, LCS, edição', 'Escolha gulosa e prova', 'Escalonamento de intervalos'],
      lessons: [pd, ...m4_5],
      references: ['clrs', 'kleinberg-tardos'],
    },
    {
      id: 'm4-6', levelId: 'n4', title: 'Algoritmos em grafos', titleEn: 'Graph algorithms',
      description: 'Caminhos mínimos, árvores geradoras e ordenação topológica.',
      prerequisites: ['m3-5', 'm4-1'],
      skills: [{ id: 'alg-grafos', pt: 'Algoritmos em grafos', en: 'Graph algorithms' }],
      outline: ['Dijkstra', 'Bellman-Ford', 'Ordenação topológica', 'Árvore geradora mínima (Kruskal, Prim)', 'Union-Find'],
      lessons: [algGrafos, ...m4_6],
      references: ['clrs', 'sedgewick-algs'],
    },
  ],
};

