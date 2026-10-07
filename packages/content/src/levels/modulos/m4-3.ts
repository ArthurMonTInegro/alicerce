/** Lições adicionais do módulo m4-3 (ordenação). */
import type { Lesson } from '../../types.ts';
import { code, dedent, deep, english, info, lesson, md, py, t, tip, trace, warn } from '../../helpers.ts';

/* ------------------------------------------------------------------ */
/* Trechos reaproveitados pelos testes                                 */
/* ------------------------------------------------------------------ */

/** Proíbe sorted() e .sort() no código do estudante (comentários não contam). */
const SEM_SORTED = dedent(`
  import ast
  _achou = set()
  for _no in ast.walk(ast.parse(_source)):
      if isinstance(_no, ast.Call):
          if isinstance(_no.func, ast.Name) and _no.func.id == "sorted":
              _achou.add("sorted()")
          if isinstance(_no.func, ast.Attribute) and _no.func.attr == "sort":
              _achou.add(".sort()")
  assert not _achou, "implemente o algoritmo à mão, sem " + " nem ".join(sorted(_achou))
`);

/**
 * Inteiro que conta as comparações (<, <=, >, >=) feitas com ele e interrompe o
 * código do estudante com uma mensagem quando passa do orçamento.
 */
const CONTADO = dedent(`
  class Contado(int):
      usadas = 0
      limite = None
      msg = ""

      @classmethod
      def prepara(cls, limite, msg):
          cls.usadas, cls.limite, cls.msg = 0, limite, msg

      def _conta(self):
          Contado.usadas += 1
          if Contado.limite is not None and Contado.usadas > Contado.limite:
              Contado.limite = None
              raise AssertionError(Contado.msg)

      def __lt__(self, o):
          self._conta()
          return int.__lt__(self, o)

      def __le__(self, o):
          self._conta()
          return int.__le__(self, o)

      def __gt__(self, o):
          self._conta()
          return int.__gt__(self, o)

      def __ge__(self, o):
          self._conta()
          return int.__ge__(self, o)
`);

/** O mesmo, para strings: conta comparações entre palavras inteiras. */
const PALAVRA = dedent(`
  class Palavra(str):
      usadas = 0
      limite = None
      msg = ""

      @classmethod
      def prepara(cls, limite, msg):
          cls.usadas, cls.limite, cls.msg = 0, limite, msg

      def _conta(self):
          Palavra.usadas += 1
          if Palavra.limite is not None and Palavra.usadas > Palavra.limite:
              Palavra.limite = None
              raise AssertionError(Palavra.msg)

      def __lt__(self, o):
          self._conta()
          return str.__lt__(self, o)

      def __le__(self, o):
          self._conta()
          return str.__le__(self, o)

      def __gt__(self, o):
          self._conta()
          return str.__gt__(self, o)

      def __ge__(self, o):
          self._conta()
          return str.__ge__(self, o)
`);

/* ------------------------------------------------------------------ */
/* Quicksort por dentro                                                */
/* ------------------------------------------------------------------ */

const quicksort = lesson({
  id: 'l4-quicksort',
  moduleId: 'm4-3',
  title: 'Quicksort por dentro: partição, pivô e valores repetidos',
  titleEn: 'Quicksort in depth: partitioning, pivots and duplicate keys',
  summary: 'Como a partição de Lomuto põe o pivô no lugar definitivo, por que a posição em que o pivô cai decide entre Θ(n log n) e Θ(n²), o que o pivô aleatório garante (e o que não garante), como a partição em três vias resolve valores repetidos e o que as bibliotecas usam de verdade.',
  minutes: 50,
  objectives: [
    'Particionar um trecho no lugar com o esquema de Lomuto e justificar cada passo pela invariante',
    'Explicar por que o quicksort custa Θ(n log n) com pivôs razoáveis e Θ(n²) com pivôs sempre na ponta, e reconhecer as entradas reais que causam cada caso',
    'Diferenciar tempo esperado (pivô aleatório) de caso médio (pivô fixo, entrada aleatória)',
    'Tratar muitos valores repetidos com a partição em três vias e usar a partição no lugar para achar o k-ésimo menor (seleção rápida)',
  ],
  skills: ['alg-ordenacao', 'alg-recursao'],
  terms: [
    t('particionamento', 'partitioning', 'Reorganizar um trecho em torno de um pivô: menores de um lado, maiores do outro e o pivô na posição definitiva entre eles.', 'Quicksort does all of its real work in the partitioning step.'),
    t('esquema de Lomuto', 'Lomuto partition scheme', 'Partição em que o pivô é o último elemento, um índice varre o trecho e outro marca o fim da região dos menores; um trecho de m elementos custa m − 1 comparações.'),
    t('esquema de Hoare', 'Hoare partition scheme', 'A partição original do quicksort: dois índices partem das pontas e trocam os pares fora do lugar; faz menos trocas e divide ao meio um trecho de valores iguais.'),
    t('mediana de três', 'median-of-three', 'Escolher como pivô a mediana entre o primeiro, o do meio e o último elemento do trecho.'),
    t('pivô aleatório', 'random pivot', 'Pivô sorteado entre as posições do trecho; deixa o tempo esperado em O(n log n) para qualquer entrada.', 'Choosing the pivot uniformly at random gives O(n log n) expected time on every input.'),
    t('algoritmo aleatorizado', 'randomized algorithm', 'Algoritmo que faz sorteios durante a execução; a mesma entrada pode seguir caminhos e custos diferentes.'),
    t('tempo esperado', 'expected running time', 'Média do custo sobre os sorteios do próprio algoritmo, com a entrada fixa (qualquer uma). Não confunda com caso médio, que faz a média sobre as entradas.', 'Randomized quicksort runs in O(n log n) expected time, regardless of the input order.'),
    t('partição em três vias', 'three-way partitioning', 'Partição que separa menores, iguais e maiores que o pivô; os iguais já ficam no lugar e saem da recursão. É o problema da bandeira holandesa (Dutch national flag), de Dijkstra.', 'Use three-way partitioning when the input has many duplicate keys.'),
    t('introsort', 'introsort', 'Híbrido usado em bibliotecas: quicksort que troca para heapsort quando a recursão fica funda demais e usa insertion sort em trechos pequenos; O(n log n) no pior caso.'),
    t('seleção rápida', 'quickselect', 'Variante do quicksort que, depois de particionar, continua só no lado que contém a posição k; acha o k-ésimo menor em tempo esperado O(n).', 'Quickselect finds the k-th smallest element in expected linear time.'),
  ],
  stages: {
    conceito: [
      md(`
        Na lição anterior o quicksort ocupou uma linha da tabela: O(n log n) em média, O(n²) no pior caso, não estável. Agora vamos abrir a caixa.

        Merge sort e quicksort são os dois exemplos clássicos de dividir e conquistar, mas fazem o trabalho em momentos opostos. O merge sort divide sem pensar (ao meio) e faz o trabalho pesado na hora de **juntar**. O quicksort faz o trabalho pesado na hora de **dividir**: o {{particionamento|partitioning}} escolhe um pivô e manda os menores para a esquerda e os maiores para a direita. Depois não há nada para juntar: com os dois lados ordenados, o trecho inteiro está ordenado.

        Pense numa fila de banco organizada por número de senha. O gerente pega uma senha como referência e anuncia: "senhas menores, para a esquerda; maiores, para a direita". Quem tem a senha de referência já está no lugar definitivo, e cada grupo repete o processo sozinho, sem precisar falar com o outro.

        Tudo no quicksort decorre de **onde o pivô cai**. Perto do meio, o custo é Θ(n log n); sempre na ponta, Θ(n²). Nesta lição você vai ver por quê, quais entradas do mundo real provocam o desastre (uma lista já ordenada, uma lista cheia de valores repetidos) e as defesas: pivô aleatório, partição em três vias e o introsort das bibliotecas. No fim, a mesma partição resolve outro problema: achar a mediana sem ordenar tudo.
      `),
    ],
    explicacao: [
      md(`
        ### A partição de Lomuto
        O {{esquema de Lomuto|Lomuto partition scheme}} usa o **último** elemento do trecho xs[lo..hi] como pivô e dois índices: j varre o trecho da esquerda para a direita, e i marca onde termina a região dos menores que o pivô. Durante toda a varredura vale a invariante:
      `),
      code('text', `
        [  < pivô   |   >= pivô    |  não vistos   | pivô ]
         ↑           ↑              ↑                ↑
         lo          i              j                hi
      `, 'xs[lo:i] < pivô, xs[i:j] >= pivô, xs[j:hi] ainda não foram olhados, xs[hi] é o pivô.'),
      md(`
        - Se xs[j] >= pivô, basta avançar j: o elemento já está na região certa.
        - Se xs[j] < pivô, ele troca de lugar com xs[i] (o primeiro da região >= pivô) e i avança: a região dos menores cresceu uma posição.
        - No fim, xs[i] troca com o pivô. Agora o pivô está na **posição definitiva**: à esquerda só há menores, à direita só maiores ou iguais, e nenhum dos lados precisa estar em ordem.

        Um trecho de m elementos custa sempre m − 1 comparações, uma para cada elemento além do pivô. A memória extra são duas variáveis: por isso o quicksort ordena no lugar (*in-place*), sem a lista auxiliar de tamanho n que o merge sort usa para intercalar.

        ### Quanto custa: depende só de onde o pivô cai
      `),
      {
        type: 'table',
        head: ['Onde o pivô cai', 'Recorrência', 'Níveis de recursão', 'Comparações'],
        rows: [
          ['Sempre na mediana', 'T(n) = 2T(n/2) + (n − 1)', '≈ log₂ n', '≈ n log₂ n'],
          ['Sempre em 10% / 90%', 'T(n) = T(n/10) + T(9n/10) + (n − 1)', '≈ log de n na base 10/9 ≈ 6,6 · log₂ n', 'Θ(n log n), com constante maior'],
          ['Sempre na ponta (menor ou maior)', 'T(n) = T(n − 1) + (n − 1)', 'n − 1', 'n(n − 1)/2 = Θ(n²)'],
          ['Posição sorteada (pivô aleatório)', 'média sobre os sorteios', 'O(log n) esperado', '≈ 2n ln n ≈ 1,39 · n log₂ n esperadas'],
        ],
        caption: 'Cada nível da recursão faz no máximo n comparações no total. O que muda de linha para linha é quantos níveis existem.',
      },
      md(`
        Duas consequências que surpreendem:

        - **Não precisa acertar a mediana.** Mesmo cortando sempre em 10% e 90%, a recursão tem uns 6,6 · log₂ n níveis, cada um com no máximo n comparações: ainda Θ(n log n). O quicksort só fica quadrático quando erra **sempre, e por muito**.
        - **Com pivô fixo, o pior caso é uma entrada comum.** Usando o último elemento como pivô, uma lista já ordenada (ou invertida) faz o pivô cair sempre na ponta. E dados já ordenados são o que mais aparece: um extrato bancário em ordem de data, uma planilha que alguém já ordenou e na qual só acrescentou duas linhas.

        ### Escolhendo o pivô
        - **Fixo** (primeiro ou último): simples e quadrático em listas ordenadas ou invertidas.
        - {{Mediana de três|median-of-three}}: o pivô é a mediana entre o primeiro, o do meio e o último elemento. Resolve listas ordenadas e invertidas, mas existem entradas montadas de propósito que ainda a levam a Θ(n²).
        - {{Pivô aleatório|random pivot}}: sorteie uma posição do trecho e troque-a com a última antes de particionar (duas linhas a mais). O quicksort vira um {{algoritmo aleatorizado|randomized algorithm}}, e para **qualquer** entrada o {{tempo esperado|expected running time}} é O(n log n).
      `),
      info(`
        O **caso médio** faz a média sobre as **entradas**, supondo que todas as ordens são igualmente prováveis. O quicksort com pivô fixo tem caso médio O(n log n), mas quem entregar uma lista ordenada leva Θ(n²) toda vez, inclusive alguém que conheça o código e queira derrubar o seu servidor (existem ataques de negação de serviço que exploram exatamente isso).

        O **tempo esperado** faz a média sobre os **sorteios do algoritmo**, com a entrada fixa e escolhida pelo pior adversário. O pior caso Θ(n²) continua existindo (uma sequência de sorteios azarados), mas agora depende de azar, não da entrada, e a chance de ficar muito acima da média despenca à medida que n cresce.
      `, 'Tempo esperado não é caso médio'),
      warn(`
        Com pivô fixo e uma lista ordenada de 5 000 elementos, o quicksort recursivo empilha cerca de 5 000 chamadas, e o Python desiste perto de 1 000: \`RecursionError: maximum recursion depth exceeded\`. A defesa clássica é fazer a recursão só no lado **menor** e tratar o lado maior com um laço. Cada chamada recursiva recebe no máximo metade do trecho, então a pilha fica O(log n) mesmo quando o tempo é quadrático.
      `, 'Em Python, a pilha estoura antes'),
      md(`
        ### Valores repetidos: o caso que o sorteio não resolve
        Imagine ordenar 100 000 respostas de uma pesquisa de satisfação, com notas de 1 a 5. Na partição de Lomuto, quem é igual ao pivô vai para a região >= pivô. Quando um trecho só tem valores iguais, todos ficam do mesmo lado, o pivô cai na ponta e o trecho diminui de apenas um elemento. Sortear o pivô não adianta: todos os candidatos são iguais.

        Há duas saídas:

        - O {{esquema de Hoare|Hoare partition scheme}}, o original do quicksort: dois índices partem das pontas, um em direção ao outro, e trocam os pares fora do lugar, **parando também nos iguais ao pivô**. Num trecho todo igual, eles se encontram no meio e a divisão sai equilibrada. Numa lista aleatória, ele faz cerca de três vezes menos trocas que o de Lomuto.
        - A {{partição em três vias|three-way partitioning}}: separa o trecho em **menores, iguais e maiores** que o pivô. Os iguais já estão na posição definitiva e saem da recursão. Um trecho todo igual é resolvido numa única passada, Θ(n), e com k ≥ 2 valores distintos o custo esperado cai para O(n log k). É o problema da bandeira holandesa, proposto por Dijkstra, e você vai implementá-lo no desafio.
      `),
      {
        type: 'table',
        head: ['Esquema', 'Ideia', 'Trecho todo igual', 'Observação'],
        rows: [
          ['Lomuto', 'um índice varre, outro marca o fim dos menores', 'Θ(n²)', 'o mais fácil de escrever e de provar; o pivô termina no lugar'],
          ['Hoare', 'dois índices se aproximam pelas pontas', 'Θ(n log n)', 'menos trocas; o pivô não termina necessariamente na posição final'],
          ['Três vias', 'três regiões: <, = e >', 'Θ(n)', 'ideal com muitos repetidos; um pouco mais de comparações quando tudo é distinto'],
        ],
      },
      md(`
        ### Por que o quicksort não é estável
        A partição troca elementos distantes, e um deles pode saltar por cima de outro igual. Ordene por valor os Pix \`[("Ana", 50), ("Bia", 80), ("Caio", 50)]\` com Lomuto: o pivô é o Pix do Caio (50); nem Ana nem Bia são menores que 50, então a troca final leva o Caio para a posição 0, à frente da Ana. Resultado: \`[("Caio", 50), ("Ana", 50), ("Bia", 80)]\`. Se a ordem de chegada importa, use uma ordenação estável (merge sort, Timsort) ou coloque o desempate na própria chave.
      `),
      deep(`
        Para achar a mediana, ou o k-ésimo menor, não é preciso ordenar tudo. Depois de uma partição o pivô está na posição definitiva p. Se p = k, achou. Se k < p, a resposta está à esquerda; senão, à direita. **Só um lado** continua: é a {{seleção rápida|quickselect}}. No módulo de recursão ela aparece separando os valores em listas novas; com a partição de Lomuto, tudo acontece dentro da própria lista, e k continua sendo uma posição da lista inteira.

        Se o pivô cortasse sempre ao meio, seriam n + n/2 + n/4 + … < 2n comparações. Com pivô aleatório, o tempo esperado é O(n) (para a mediana, cerca de 3,4n comparações, contra ~1,39 · n log₂ n para ordenar tudo). O pior caso continua Θ(n²); existe um método determinístico O(n) no pior caso, a mediana das medianas, mas com constante bem maior. Compare com a biblioteca do Python: \`statistics.median\` ordena os dados (O(n log n)), e \`heapq.nsmallest(k, xs)\` custa O(n log k).
      `, 'Seleção rápida: metade do trabalho'),
      deep(`
        - **C++** (\`std::sort\`): desde o C++11 a norma exige O(n log n) comparações no pior caso, e as principais implementações usam o {{introsort|introsort}}: quicksort com mediana de três que vigia a profundidade da recursão; se ela passa de cerca de 2 log₂ n, aquele trecho é terminado com heapsort, e trechos pequenos vão para o insertion sort.
        - **Java**: \`Arrays.sort\` usa um quicksort com **dois** pivôs para tipos primitivos (int, double…) e Timsort para objetos, porque objetos carregam outros dados e a estabilidade passa a importar.
        - **Go**: desde a versão 1.19, o pacote \`sort\` usa o pdqsort, outro híbrido de quicksort que detecta padrões ruins na entrada.
        - **Python**: \`list.sort\` e \`sorted\` usam Timsort para tudo. Nada de quicksort, e estabilidade garantida.

        Por que o quicksort ganha nas linguagens compiladas, se faz cerca de 39% mais comparações que o merge sort? Ele ordena no lugar, percorre a memória em sequência (o cache agradece) e o laço interno é mínimo: comparar, talvez trocar, avançar.
      `, 'O que as bibliotecas fazem'),
    ],
    exemplo: [
      md(`
        Acompanhe a partição de Lomuto em \`[7, 2, 9, 4, 3, 8, 5]\`. O pivô é o último, **5**, e i começa em 0. Tudo antes de i já é menor que 5.
      `),
      {
        type: 'table',
        head: ['j', 'xs[j]', 'xs[j] < 5?', 'Ação', 'Lista depois', 'i'],
        rows: [
          ['0', '7', 'não', 'nada', '[7, 2, 9, 4, 3, 8, 5]', '0'],
          ['1', '2', 'sim', 'troca xs[0] ↔ xs[1]', '[2, 7, 9, 4, 3, 8, 5]', '1'],
          ['2', '9', 'não', 'nada', '[2, 7, 9, 4, 3, 8, 5]', '1'],
          ['3', '4', 'sim', 'troca xs[1] ↔ xs[3]', '[2, 4, 9, 7, 3, 8, 5]', '2'],
          ['4', '3', 'sim', 'troca xs[2] ↔ xs[4]', '[2, 4, 3, 7, 9, 8, 5]', '3'],
          ['5', '8', 'não', 'nada', '[2, 4, 3, 7, 9, 8, 5]', '3'],
          ['fim', '—', '—', 'troca xs[3] ↔ xs[6] (pivô)', '[2, 4, 3, 5, 9, 8, 7]', '3'],
        ],
        caption: 'Seis comparações (m − 1, com m = 7). O 5 ficou na posição 3, a definitiva: [2, 4, 3] à esquerda e [9, 8, 7] à direita, nenhum dos dois em ordem.',
      },
      md('Rode o mesmo código passo a passo e observe i, j e a lista mudando:'),
      trace(`
        def particiona(xs, lo, hi):
            pivo = xs[hi]
            i = lo
            for j in range(lo, hi):
                if xs[j] < pivo:
                    xs[i], xs[j] = xs[j], xs[i]
                    i += 1
            xs[i], xs[hi] = xs[hi], xs[i]
            return i

        xs = [7, 2, 9, 4, 3, 8, 5]
        p = particiona(xs, 0, len(xs) - 1)
        print(xs, p)
      `, 'A função devolve 3, a posição final do pivô. As chamadas seguintes do quicksort trabalham em xs[0..2] e xs[4..6].'),
      md('Depois, cada lado repete o processo sozinho:'),
      code('text', `
        [7, 2, 9, 4, 3, 8, 5]      pivô 5 → 6 comparações
        ├── [2, 4, 3]              pivô 3 → 2 comparações
        │   ├── [2]
        │   └── [4]
        └── [9, 8, 7]              pivô 7 → 2 comparações (7 é o menor: o lado esquerdo sai vazio)
            └── [8, 9]             pivô 9 → 1 comparação
                └── [8]
      `),
      md(`
        Total: 6 + 2 + 2 + 1 = 11 comparações. Repare no lado direito: \`[9, 8, 7]\` estava em ordem decrescente, o pivô 7 era o menor do trecho e um dos lados saiu vazio. Em escala, é exatamente esse o desastre de Θ(n²). Veja acontecer com mais elementos:
      `),
      { type: 'viz', viz: 'sorting', caption: 'Escolha Quicksort (é a partição de Lomuto, com o último elemento como pivô) e tamanho 32. Rode até o fim depois de "Embaralhar" e depois de "Já ordenado", e compare os totais de comparações: no segundo caso são exatamente 32 · 31 / 2 = 496.' },
    ],
    codigo: [
      py(`
        import random

        comparacoes = 0

        def particiona(xs, lo, hi):
            """Lomuto: pivô = xs[hi]. Devolve a posição final do pivô."""
            global comparacoes
            pivo = xs[hi]
            i = lo                              # xs[lo:i] < pivô
            for j in range(lo, hi):             # xs[i:j] >= pivô
                comparacoes += 1
                if xs[j] < pivo:
                    xs[i], xs[j] = xs[j], xs[i]
                    i += 1
            xs[i], xs[hi] = xs[hi], xs[i]       # o pivô vai para o lugar definitivo
            return i

        def quicksort(xs, lo=0, hi=None, aleatorio=False):
            if hi is None:
                hi = len(xs) - 1
            if lo < hi:
                if aleatorio:
                    r = random.randint(lo, hi)        # sorteia o pivô...
                    xs[r], xs[hi] = xs[hi], xs[r]     # ...e o leva para o fim
                p = particiona(xs, lo, hi)
                quicksort(xs, lo, p - 1, aleatorio)
                quicksort(xs, p + 1, hi, aleatorio)
            return xs

        random.seed(2026)
        n = 300
        entradas = {"embaralhada": random.sample(range(n), n), "já ordenada": list(range(n))}
        print(f"{'entrada':<12} {'pivô':<10} comparações")
        for nome, base in entradas.items():
            for aleatorio in (False, True):
                comparacoes = 0
                xs = quicksort(base[:], aleatorio=aleatorio)
                assert xs == sorted(base)
                tipo = "aleatório" if aleatorio else "último"
                print(f"{nome:<12} {tipo:<10} {comparacoes:>11}")
        H = sum(1 / k for k in range(1, n + 1))     # 1 + 1/2 + ... + 1/n
        print(f"pior caso, n(n - 1)/2 = {n * (n - 1) // 2}")
        print(f"esperado com pivô aleatório, 2(n + 1)·H - 4n ≈ {round(2 * (n + 1) * H - 4 * n)}")
      `, { caption: 'Mesma função, quatro experimentos. Com pivô fixo, a lista já ordenada custa exatamente n(n − 1)/2 comparações; com pivô sorteado, a ordem da entrada deixa de importar e o custo fica perto do valor esperado 2(n + 1)·Hₙ − 4n, em que Hₙ = 1 + 1/2 + … + 1/n (para n grande, isso dá ≈ 1,39 · n log₂ n). Mude n e a semente e rode de novo; com pivô fixo e n perto de 1 000, a lista ordenada estoura o limite de recursão do Python.' }),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e4-qs-1',
          kind: 'mcq',
          prompt: 'Depois de **uma** chamada de `particiona` (Lomuto) num trecho com pivô p, o que está garantido?',
          difficulty: 'facil',
          skills: ['alg-ordenacao'],
          hints: [
            'O que acontece com o pivô na última linha da partição?',
            'Depois da partição, algum elemento à esquerda do pivô ainda pode ir parar à direita dele?',
            'Olhe o resultado do exemplo, [2, 4, 3, 5, 9, 8, 7]. Como estão os dois lados?',
          ],
          explanation: 'A partição só faz duas coisas: põe o pivô na posição definitiva e separa os menores (à esquerda) dos maiores ou iguais (à direita). A ordem dentro de cada lado fica para as chamadas recursivas. É por isso que o quicksort não precisa de uma etapa de "juntar": quando os dois lados estiverem ordenados, o trecho todo estará.',
          options: [
            { text: 'p está na posição definitiva; à esquerda dele só há menores que p e à direita só maiores ou iguais, cada lado ainda em qualquer ordem.', correct: true, feedback: 'Isso. A partição não ordena os lados; ela só garante que nenhum elemento precisará atravessar o pivô depois.' },
            { text: 'O trecho inteiro está ordenado.', feedback: 'Uma passada de m − 1 comparações não ordena m elementos (isso exigiria Ω(m log m) comparações). No exemplo, [2, 4, 3] e [9, 8, 7] continuam fora de ordem depois da partição.' },
            { text: 'p fica exatamente no meio do trecho.', feedback: 'Só se p for a mediana. O pivô vai para a posição igual ao número de elementos menores que ele: se p é o menor do trecho, vai para a primeira posição.' },
            { text: 'Os dois lados já estão ordenados; só falta intercalá-los, como no merge sort.', feedback: 'Essa é a lógica do merge sort, que ordena as metades primeiro e junta depois. No quicksort a partição vem antes da recursão, e depois não há nada para juntar.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e4-qs-2',
          kind: 'predict',
          lang: 'python',
          prompt: 'O que este código imprime? Faça a partição à mão, como na tabela do exemplo.',
          difficulty: 'intermediario',
          skills: ['alg-ordenacao'],
          hints: [
            'Qual é o pivô? Qual é o valor inicial de i?',
            'Só os elementos menores que o pivô provocam troca. Quais são eles, na ordem em que aparecem?',
            'Depois de cada troca, i avança. Onde i termina, e com quem o pivô troca no final?',
          ],
          explanation: 'O pivô é 5. Os menores que 5 são 4, 1 e 3, nessa ordem: o 4 troca consigo mesmo (i vai a 1), o 1 troca com o 8 ([4, 1, 8, 6, 3, 5], i = 2) e o 3 troca com o 8 ([4, 1, 3, 6, 8, 5], i = 3). No fim o pivô troca com xs[3] = 6: [4, 1, 3, 5, 8, 6], e a função devolve 3. Os dois lados, [4, 1, 3] e [8, 6], continuam fora de ordem: a partição só garante a posição do pivô e o lado de cada elemento.',
          code: dedent(`
            def particiona(xs, lo, hi):
                pivo = xs[hi]
                i = lo
                for j in range(lo, hi):
                    if xs[j] < pivo:
                        xs[i], xs[j] = xs[j], xs[i]
                        i += 1
                xs[i], xs[hi] = xs[hi], xs[i]
                return i

            xs = [4, 8, 1, 6, 3, 5]
            p = particiona(xs, 0, 5)
            print(xs, p)
          `),
          answer: '[4, 1, 3, 5, 8, 6] 3',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e4-qs-3',
          kind: 'mcq',
          prompt: 'Você troca o pivô fixo (último elemento) por um **pivô aleatório**. O que essa mudança garante?',
          difficulty: 'intermediario',
          skills: ['alg-ordenacao', 'alg-complexidade'],
          hints: [
            'Depois da mudança, ainda existe alguma sequência de sorteios que escolhe sempre o pior pivô?',
            'Com pivô fixo, de que depende o quicksort ser rápido? E com pivô sorteado, de onde vem a aleatoriedade?',
            'A partição continua trocando elementos distantes?',
          ],
          explanation: 'O pivô aleatório transfere a aleatoriedade da entrada para o algoritmo. Com pivô fixo, o quicksort só é rápido se a entrada "colaborar"; com pivô sorteado, toda entrada (inclusive a já ordenada) tem tempo esperado O(n log n). O pior caso Θ(n²) não desaparece: só passa a depender de sorteios muito azarados, cuja probabilidade despenca com n. Garantir O(n log n) no pior caso exige outra estratégia, como o introsort ou o merge sort.',
          options: [
            { text: 'Para qualquer entrada, inclusive já ordenada, o tempo esperado (média sobre os sorteios) é O(n log n); o pior caso continua Θ(n²), mas depende de azar, não da entrada.', correct: true, feedback: 'Isso. Tempo esperado sobre os sorteios, para toda entrada; o pior caso fica improvável, mas existe.' },
            { text: 'O pior caso passa a ser O(n log n).', feedback: 'Ainda existe uma sequência de sorteios que escolhe sempre o menor ou o maior elemento, e ela dá Θ(n²). Ela só fica extremamente improvável. Garantia no pior caso exige, por exemplo, o introsort (que troca para heapsort) ou o merge sort.' },
            { text: 'Só ajuda quando a entrada já é aleatória; numa lista ordenada continua quadrático.', feedback: 'É o contrário: quem depende de a entrada ser aleatória é o pivô fixo. Sorteando o pivô, a ordem da entrada deixa de importar, e a lista ordenada vira uma entrada como outra qualquer.' },
            { text: 'Torna o quicksort estável, porque a ordem dos iguais passa a ser sorteada.', feedback: 'Ordem sorteada é o oposto de estabilidade, que exige preservar a ordem original dos iguais. O pivô aleatório não muda as trocas de longa distância da partição.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e4-qs-4',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Escreva \`k_esimo(xs, k)\` que devolve o **k-ésimo menor** elemento de xs, contando a partir de 0: \`k = 0\` é o menor e \`k = len(xs) - 1\` é o maior. Exemplo: \`k_esimo([7, 2, 9, 4, 3, 8, 5], 3)\` devolve 5, a mediana.

            Na lição de dividir para conquistar você fez a seleção rápida separando os valores em listas novas, o que gasta memória O(n). Aqui a ideia é a mesma, mas sem memória extra: reaproveite a partição de Lomuto desta lição.

            Exija **tempo esperado O(n)**: particione como no quicksort, com **pivô aleatório**, mas continue só no lado que contém a posição k (a seleção rápida). Trabalhe **no lugar**: a função pode reordenar xs à vontade, mas não deve criar listas novas nem fatias. Não use \`sorted\`, \`.sort\` nem \`heapq\`, e não ordene a lista inteira: os testes contam as comparações.
          `),
          difficulty: 'intermediario',
          skills: ['alg-ordenacao', 'alg-busca'],
          hints: [
            'Depois de uma partição, o pivô está numa posição p definitiva. Se p for igual a k, o que você já sabe?',
            'Se k < p, em qual lado está a resposta? Algum elemento do outro lado ainda pode ser o k-ésimo menor?',
            'k é uma posição da lista inteira, não do trecho. Ao continuar num lado, o que muda: k, ou só os limites lo e hi?',
            'Como só um lado continua, você precisa mesmo de recursão, ou um laço que ajusta lo e hi resolve?',
            'Teste com list(range(3000)) e k = 1500. Quantas partições a sua versão faz? Como o pivô está sendo escolhido?',
          ],
          explanation: 'Cada partição põe o pivô na posição definitiva e descarta o lado que não contém k. Como tudo acontece dentro de xs, k é sempre uma posição da lista inteira: só lo e hi mudam. Com pivô aleatório, o trecho encolhe em média por um fator constante a cada passo, e a soma n + (uma fração de n) + … é O(n): cerca de 3,4n comparações para a mediana, contra ~1,39 · n log₂ n para ordenar tudo. Com pivô fixo, uma lista já ordenada faz o trecho encolher de um em um, e o custo volta a Θ(n²). Um heap também não serve: tirar os k menores custa O(n + k log n), que para a mediana é O(n log n).',
          starter: dedent(`
            def k_esimo(xs, k):
                # devolva o k-ésimo menor elemento de xs (k = 0 é o menor),
                # particionando e continuando só no lado que contém a posição k
                pass
          `),
          solution: dedent(`
            import random

            def particiona(xs, lo, hi):
                r = random.randint(lo, hi)
                xs[r], xs[hi] = xs[hi], xs[r]
                pivo = xs[hi]
                i = lo
                for j in range(lo, hi):
                    if xs[j] < pivo:
                        xs[i], xs[j] = xs[j], xs[i]
                        i += 1
                xs[i], xs[hi] = xs[hi], xs[i]
                return i

            def k_esimo(xs, k):
                lo, hi = 0, len(xs) - 1
                while True:
                    p = particiona(xs, lo, hi)
                    if p == k:
                        return xs[p]
                    if k < p:
                        hi = p - 1
                    else:
                        lo = p + 1
          `),
          tests: [
            { name: 'mediana do exemplo', code: 'r = k_esimo([7, 2, 9, 4, 3, 8, 5], 3)\nassert r == 5, f"o 3º menor (contando do 0) de [7, 2, 9, 4, 3, 8, 5] é 5; veio {r}"' },
            {
              name: 'menor, maior e um só elemento',
              code: dedent(`
                r = k_esimo([42], 0)
                assert r == 42, f"com um só elemento, k = 0 devolve ele mesmo; veio {r}"
                r = k_esimo([5, -3, 8, 0], 0)
                assert r == -3, f"k = 0 é o menor (-3); veio {r}"
                r = k_esimo([5, -3, 8, 0], 3)
                assert r == 8, f"k = len - 1 é o maior (8); veio {r}"
              `),
            },
            {
              name: 'repetidos e negativos',
              code: dedent(`
                base = [5, -1, 5, -1, 5, 0]
                esperado = [-1, -1, 0, 5, 5, 5]
                for k in range(6):
                    r = k_esimo(base[:], k)
                    assert r == esperado[k], f"k_esimo({base}, {k}) deveria ser {esperado[k]}; veio {r}"
              `),
            },
            {
              name: 'aleatório',
              code: dedent(`
                import random
                for _ in range(200):
                    xs = [random.randint(-20, 20) for _ in range(random.randint(1, 30))]
                    k = random.randrange(len(xs))
                    esperado = sorted(xs)[k]
                    r = k_esimo(xs[:], k)
                    assert r == esperado, f"k_esimo({xs}, {k}) deveria ser {esperado}; veio {r}"
              `),
            },
            { name: 'sem sorted() nem .sort()', code: SEM_SORTED },
            {
              name: 'no lugar: sem listas novas, fatias nem heapq',
              code: dedent(`
                import ast
                _arvore = ast.parse(_source)
                _ruins = set()
                for _no in ast.walk(_arvore):
                    if isinstance(_no, ast.Import) and any(a.name in ("heapq", "statistics") for a in _no.names):
                        _ruins.add("heapq/statistics")
                    elif isinstance(_no, ast.ImportFrom) and _no.module in ("heapq", "statistics"):
                        _ruins.add("heapq/statistics")
                for _f in ast.walk(_arvore):
                    if not isinstance(_f, ast.FunctionDef):
                        continue
                    for _no in ast.walk(_f):
                        if isinstance(_no, (ast.List, ast.ListComp)):
                            _ruins.add("listas novas")
                        elif isinstance(_no, ast.Slice):
                            _ruins.add("fatias como xs[a:b]")
                        elif isinstance(_no, ast.Call) and isinstance(_no.func, ast.Attribute) and _no.func.attr in ("append", "extend", "insert", "copy"):
                            _ruins.add("." + _no.func.attr + "()")
                        elif isinstance(_no, ast.Call) and isinstance(_no.func, ast.Name) and _no.func.id in ("list", "filter"):
                            _ruins.add(_no.func.id + "()")
                assert not _ruins, "particione dentro de xs, trocando elementos de lugar e ajustando lo e hi, sem " + ", ".join(sorted(_ruins))
              `),
            },
            {
              name: 'o pivô é sorteado',
              code: dedent(`
                import random
                base = random.sample(range(1000), 60)
                arranjos = set()
                for _ in range(8):
                    xs = base[:]
                    r = k_esimo(xs, 30)
                    assert r == sorted(base)[30], f"o elemento de posição 30 deveria ser {sorted(base)[30]}; veio {r}"
                    arranjos.add(tuple(xs))
                assert arranjos != {tuple(sorted(base))}, "a sua função deixou a lista inteira ordenada em todas as rodadas: ela está ordenando tudo. Depois de cada partição, siga só pelo lado que contém a posição k."
                assert len(arranjos) > 1, "com a mesma entrada, a sua função reorganizou a lista exatamente do mesmo jeito em 8 rodadas: o pivô não está sendo sorteado. Todo pivô fixo (o primeiro, o último, o do meio, a mediana de três) tem entradas que o levam a Θ(n²); sorteie uma posição entre lo e hi."
              `),
            },
            {
              name: 'tempo esperado O(n): não ordena tudo',
              code: CONTADO + '\n' + dedent(`
                import random
                n = 10000
                Contado.prepara(45 * n, "em 5 buscas da mediana em listas de 10 000 elementos, a sua função passou de 450 000 comparações; ordenar as listas inteiras custaria mais de 590 000. Continue só no lado que contém a posição k.")
                for _ in range(5):
                    valores = random.sample(range(1000000), n)
                    esperado = sorted(valores)[n // 2]
                    r = k_esimo([Contado(v) for v in valores], n // 2)
                    assert int(r) == esperado, f"a mediana deveria ser {esperado}; veio {r}"
                Contado.limite = None
              `),
            },
            {
              name: 'lista já ordenada',
              code: CONTADO + '\n' + dedent(`
                n = 3000
                Contado.prepara(15 * n, "numa lista já ordenada de 3 000 elementos, a sua função passou de 45 000 comparações. Como o pivô está sendo escolhido? Releia 'Escolhendo o pivô'.")
                r = k_esimo([Contado(v) for v in range(n)], n // 2)
                Contado.limite = None
                assert int(r) == n // 2, f"em range({n}), o elemento de posição {n // 2} é {n // 2}; veio {r}"
              `),
            },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e4-qs-5',
          kind: 'mcq',
          prompt: 'Uma pesquisa de satisfação tem 100 000 respostas, cada uma com nota de 1 a 5. Você ordena com quicksort de **pivô aleatório** e partição de **Lomuto** (os iguais ao pivô vão para a direita). O que acontece?',
          difficulty: 'avancado',
          skills: ['alg-ordenacao', 'alg-complexidade'],
          hints: [
            'Depois de algumas partições, os trechos passam a ter só uma nota. Como fica um trecho só com notas 3?',
            'Num trecho todo igual, que diferença faz sortear o pivô?',
            'Se um trecho de m elementos iguais diminui de um em um, quantas comparações ele custa no total?',
          ],
          explanation: 'Com só 5 valores, logo os trechos passam a conter uma nota só. Num trecho todo igual, nenhum elemento é menor que o pivô: a partição de Lomuto deixa todos à direita, o pivô cai na ponta e o trecho perde um único elemento. Um grupo de m iguais custa m(m − 1)/2 comparações; se as notas forem equilibradas (cerca de 20 000 respostas por nota), são 5 × 2 × 10⁸ = 10⁹ comparações, e a recursão chegaria a uns 20 000 níveis. A partição em três vias (ou a de Hoare) resolve isso.',
          options: [
            { text: 'Θ(n log n): o pivô aleatório protege contra qualquer entrada.', feedback: 'O sorteio protege contra a **ordem** da entrada, não contra valores iguais. Num trecho só com notas 3, qualquer pivô sorteado é 3, e a partição de Lomuto manda todos os outros para o mesmo lado.' },
            { text: 'Fica quadrático: cada trecho só com notas iguais diminui de um em um; com ~20 000 respostas por nota, são cerca de 10⁹ comparações (e, em Python, a recursão estoura antes).', correct: true, feedback: 'Isso. Cada grupo de m iguais custa m(m − 1)/2 comparações; com ~20 000 respostas por nota, dá 5 × 2 × 10⁸ = 10⁹. A recursão chegaria a ~20 000 níveis, muito acima do limite de 1 000 do Python.' },
            { text: 'Fica mais rápido do que com valores distintos, porque só há 5 valores para comparar.', feedback: 'Essa intuição vale para a partição em três vias, que tira os iguais da recursão. A de Lomuto não separa os iguais ao pivô: eles continuam no trecho e são particionados de novo, um a um.' },
            { text: 'Θ(n), porque com 5 valores distintos bastam 5 partições.', feedback: 'Com a partição em três vias, poucas rodadas bastariam (custo esperado O(n log k)). Com Lomuto, cada partição fixa só **um** elemento, o pivô; os outros iguais a ele continuam no trecho.' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e4-qs-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Implemente o quicksort com **partição em três vias** (a bandeira holandesa de Dijkstra), no lugar, em duas funções:

            - \`particiona3(xs, lo, hi)\`: sorteia um pivô p entre xs[lo..hi] e reorganiza **só esse trecho** em três faixas. Devolve \`(lt, gt)\` tal que \`xs[lo:lt]\` < p, \`xs[lt:gt + 1]\` == p e \`xs[gt + 1:hi + 1]\` > p. Faça isso trocando elementos dentro de xs, sem criar listas novas.
            - \`quicksort3(xs)\`: ordena xs no lugar usando \`particiona3\` e devolve xs.

            Não use \`sorted\` nem \`.sort\`. Os testes contam comparações em duas entradas que derrubam o quicksort comum: 10 000 valores que só podem ser 0, 1 ou 2, e uma lista já ordenada de 5 000 elementos.
          `),
          difficulty: 'desafio',
          skills: ['alg-ordenacao', 'alg-recursao'],
          hints: [
            'Durante a partição, quantas regiões o trecho tem? Além das três faixas do resultado, existe a dos elementos ainda não vistos. Onde cada uma começa e termina?',
            'Com três índices, lt, i e gt, o que deveria valer para xs[lo:lt], xs[lt:i] e xs[gt + 1:hi + 1] a cada passo?',
            'Quando xs[i] é maior que p e você o troca com um elemento do fim, o que você sabe sobre o elemento que acabou de chegar à posição i?',
            'Quando o laço termina? Ainda sobra algum elemento não visto quando i passa de gt?',
            'No quicksort3, em quais das três faixas ainda vale a pena fazer recursão?',
          ],
          explanation: 'A invariante tem quatro regiões: xs[lo:lt] < p, xs[lt:i] == p, xs[i:gt + 1] ainda não vistos e xs[gt + 1:hi + 1] > p. Se xs[i] < p, ele troca com xs[lt] (que é igual a p, ou é o próprio xs[i]) e lt e i avançam. Se xs[i] > p, ele troca com xs[gt] e só gt recua, porque o elemento que veio do fim ainda não foi examinado. Se é igual, só i avança. Os iguais ao pivô ficam no meio e saem da recursão: um trecho todo igual custa uma passada, e com k valores distintos o custo esperado é O(n log k). O pivô sorteado protege da lista ordenada; recursão no lado menor e laço no maior deixam a pilha em O(log n).',
          starter: dedent(`
            import random

            def particiona3(xs, lo, hi):
                # sorteie p em xs[lo..hi] e separe o trecho em < p, == p e > p;
                # devolva (lt, gt) com xs[lt:gt + 1] == p
                pass

            def quicksort3(xs):
                # ordene xs no lugar usando particiona3 e devolva xs
                return xs
          `),
          solution: dedent(`
            import random

            def particiona3(xs, lo, hi):
                p = xs[random.randint(lo, hi)]
                lt, i, gt = lo, lo, hi
                while i <= gt:
                    if xs[i] < p:
                        xs[lt], xs[i] = xs[i], xs[lt]
                        lt += 1
                        i += 1
                    elif xs[i] > p:
                        xs[i], xs[gt] = xs[gt], xs[i]
                        gt -= 1
                    else:
                        i += 1
                return lt, gt

            def quicksort3(xs, lo=0, hi=None):
                if hi is None:
                    hi = len(xs) - 1
                while lo < hi:
                    lt, gt = particiona3(xs, lo, hi)
                    # recursão no lado menor, laço no maior: pilha O(log n)
                    if lt - lo < hi - gt:
                        quicksort3(xs, lo, lt - 1)
                        lo = gt + 1
                    else:
                        quicksort3(xs, gt + 1, hi)
                        hi = lt - 1
                return xs
          `),
          tests: [
            {
              name: 'particiona3 separa <, = e >',
              code: dedent(`
                import random
                for _ in range(300):
                    n = random.randint(1, 25)
                    xs = [random.randint(0, 6) for _ in range(n)]
                    lo = random.randint(0, n - 1)
                    hi = random.randint(lo, n - 1)
                    antes = xs[:]
                    r = particiona3(xs, lo, hi)
                    assert isinstance(r, tuple) and len(r) == 2, f"particiona3 deve devolver uma tupla (lt, gt); veio {r!r}"
                    lt, gt = r
                    assert lo <= lt <= gt <= hi, f"em {antes} com lo={lo}, hi={hi}: esperava lo <= lt <= gt <= hi; veio lt={lt}, gt={gt}"
                    assert xs[:lo] == antes[:lo] and xs[hi + 1:] == antes[hi + 1:], f"particiona3 mexeu fora de [lo, hi]: {antes} virou {xs} (lo={lo}, hi={hi})"
                    trecho_antes = antes[lo:hi + 1]
                    trecho_antes.sort()
                    trecho = xs[lo:hi + 1]
                    trecho.sort()
                    assert trecho == trecho_antes, f"o trecho perdeu ou ganhou elementos: {antes[lo:hi + 1]} virou {xs[lo:hi + 1]}"
                    p = xs[lt]
                    assert all(x == p for x in xs[lt:gt + 1]), f"xs[lt:gt + 1] deveria ter só valores iguais ao pivô: {xs[lt:gt + 1]}"
                    assert all(x < p for x in xs[lo:lt]), f"xs[lo:lt] deveria ter só menores que {p}: {xs[lo:lt]}"
                    assert all(x > p for x in xs[gt + 1:hi + 1]), f"xs[gt + 1:hi + 1] deveria ter só maiores que {p}: {xs[gt + 1:hi + 1]}"
              `),
            },
            {
              name: 'ordena no lugar (inclusive bordas)',
              code: dedent(`
                import random
                casos = [[], [1], [2, 1], [3, 3, 3], [5, -2, 9, -2, 0, 7, 5], list(range(10, 0, -1))]
                casos += [[random.randint(-50, 50) for _ in range(random.randint(0, 80))] for _ in range(100)]
                for xs in casos:
                    esperado = sorted(xs)
                    copia = xs[:]
                    r = quicksort3(copia)
                    assert copia == esperado, f"quicksort3 deveria ordenar a própria lista: {xs} ficou {copia}"
                    assert r is copia, "quicksort3 deve devolver a mesma lista que recebeu (ordenada no lugar)"
              `),
            },
            { name: 'sem sorted() nem .sort()', code: SEM_SORTED },
            {
              name: 'particiona3 troca no lugar, sem listas auxiliares',
              code: dedent(`
                import ast
                _defs = [no for no in ast.walk(ast.parse(_source)) if isinstance(no, ast.FunctionDef) and no.name == "particiona3"]
                assert _defs, "defina a função particiona3(xs, lo, hi)"
                _ruins = set()
                for _no in ast.walk(_defs[0]):
                    if isinstance(_no, (ast.List, ast.ListComp)):
                        _ruins.add("listas novas")
                    elif isinstance(_no, ast.Slice):
                        _ruins.add("fatias como xs[a:b]")
                    elif isinstance(_no, ast.Call) and isinstance(_no.func, ast.Attribute) and _no.func.attr in ("append", "extend", "insert", "copy"):
                        _ruins.add("." + _no.func.attr + "()")
                    elif isinstance(_no, ast.Call) and isinstance(_no.func, ast.Name) and _no.func.id in ("list", "sorted"):
                        _ruins.add(_no.func.id + "()")
                assert not _ruins, "particiona3 deve reorganizar o trecho trocando elementos dentro de xs, sem " + ", ".join(sorted(_ruins))
              `),
            },
            {
              name: 'particiona3 sorteia o pivô',
              code: dedent(`
                import random
                base = random.sample(range(1000), 40)
                saidas = set()
                for _ in range(10):
                    xs = base[:]
                    saidas.add(tuple(particiona3(xs, 0, len(xs) - 1)))
                assert len(saidas) > 1, f"em 10 chamadas com a mesma lista, particiona3 devolveu sempre {saidas.pop()}: o pivô não está sendo sorteado. Um pivô fixo (o primeiro, o do meio, a mediana de três) tem entradas que o levam a Θ(n²); sorteie uma posição entre lo e hi."
              `),
            },
            {
              name: 'muitos repetidos: só 0, 1 e 2',
              code: CONTADO + '\n' + dedent(`
                import random
                n = 10000
                valores = [random.randint(0, 2) for _ in range(n)]
                Contado.prepara(10 * n, "com 10 000 valores entre 0 e 2, a sua versão passou de 100 000 comparações: os iguais ao pivô ainda estão entrando na recursão?")
                xs = [Contado(v) for v in valores]
                quicksort3(xs)
                Contado.limite = None
                assert [int(v) for v in xs] == sorted(valores), "a lista com muitos repetidos não ficou ordenada"
              `),
            },
            {
              name: 'lista já ordenada',
              code: CONTADO + '\n' + dedent(`
                n = 5000
                Contado.prepara(250000, "numa lista já ordenada de 5 000 elementos, a sua versão passou de 250 000 comparações (o esperado é perto de 110 000). Como o pivô está sendo escolhido?")
                xs = [Contado(v) for v in range(n)]
                quicksort3(xs)
                Contado.limite = None
                assert [int(v) for v in xs] == list(range(n)), "a lista já ordenada saiu fora de ordem"
              `),
            },
          ],
        },
      },
    ],
    revisao: [
      md(`
        - A partição de Lomuto põe o pivô na posição definitiva, com menores à esquerda e maiores ou iguais à direita, em m − 1 comparações e memória O(1).
        - O custo depende só de onde o pivô cai: dividir em qualquer proporção fixa dá Θ(n log n); cair sempre na ponta dá Θ(n²).
        - Pivô fixo + lista ordenada (ou invertida) = pior caso. Pivô aleatório dá tempo **esperado** O(n log n) para qualquer entrada; o pior caso continua existindo, mas depende de azar.
        - Muitos repetidos derrubam Lomuto mesmo com pivô aleatório; Hoare e a partição em três vias resolvem.
        - Quicksort não é estável. Recursão no lado menor deixa a pilha em O(log n).
        - Seleção rápida (quickselect): particionar e seguir só por um lado acha o k-ésimo menor em tempo esperado O(n), no lugar.
      `),
      english(`
        - **partition / pivot**: partição / pivô
        - **in-place**: no lugar, sem memória auxiliar proporcional a n
        - **randomized / expected running time**: aleatorizado / tempo esperado
        - **worst case / degenerate case**: pior caso / caso degenerado
        - **three-way partitioning (Dutch national flag)**: partição em três vias (bandeira holandesa)
        - **quickselect**: seleção rápida; **introsort**: o nome não é traduzido

        Frase típica de entrevista: *"Quicksort is O(n log n) in expectation with a random pivot, but it degrades to O(n²) when the pivot is always the smallest or largest element, for example on an already sorted array with a fixed last-element pivot."*

        Frase típica de documentação: *"This sort is unstable (i.e., it may reorder equal elements) and in-place (i.e., it does not allocate)."*
      `),
    ],
  },
  review: [
    ['O que a partição de Lomuto garante quando termina?', 'O pivô está na posição definitiva; à esquerda só há menores, à direita só maiores ou iguais, sem ordem dentro de cada lado.'],
    ['Qual recorrência descreve o quicksort quando o pivô cai sempre na ponta, e quanto ela dá?', 'T(n) = T(n − 1) + (n − 1), que soma n(n − 1)/2: Θ(n²).'],
    ['Se o pivô dividisse sempre em 10% e 90%, o quicksort ficaria quadrático?', 'Não: a recursão teria ≈ 6,6 · log₂ n níveis, com no máximo n comparações cada, ainda Θ(n log n).'],
    ['Qual a diferença entre o tempo esperado do quicksort aleatorizado e o caso médio do quicksort de pivô fixo?', 'O caso médio faz a média sobre entradas supostamente aleatórias; o tempo esperado faz a média sobre os sorteios do algoritmo e vale para qualquer entrada, inclusive ordenada.'],
    ['Por que o pivô aleatório não salva a partição de Lomuto numa lista cheia de valores iguais? O que salva?', 'Num trecho todo igual, qualquer pivô sorteado é igual aos outros, e Lomuto manda todos para o mesmo lado. Salvam a partição em três vias (<, =, >) e a de Hoare.'],
    ['Como garantir pilha O(log n) no quicksort, mesmo no pior caso de tempo?', 'Fazer a recursão no lado menor e tratar o lado maior com um laço: cada chamada recursiva recebe no máximo metade do trecho.'],
    ['Na seleção rápida no lugar, a partição de xs[lo..hi] deixou o pivô na posição p, e k > p. O que muda para a próxima rodada: k, lo ou hi?', 'Só lo, que passa a p + 1. k continua igual, porque é uma posição da lista inteira e o pivô já está na posição definitiva.'],
  ],
  references: ['clrs', 'sedgewick-algs', 'mit-6006', 'stanford-cs161'],
});

/* ------------------------------------------------------------------ */
/* Abaixo de n log n: counting sort e radix sort                       */
/* ------------------------------------------------------------------ */

const linear = lesson({
  id: 'l4-ordenacao-linear',
  moduleId: 'm4-3',
  title: 'Abaixo de n log n: árvore de decisão, counting sort e radix sort',
  titleEn: 'Beating n log n: decision trees, counting sort and radix sort',
  summary: 'Por que nenhuma ordenação por comparação faz menos que log₂(n!) comparações no pior caso, e como counting sort e radix sort ordenam em tempo linear usando a própria chave como endereço, com a estabilidade como peça central.',
  minutes: 50,
  objectives: [
    'Provar o limite inferior Ω(n log n) com a árvore de decisão e calcular ⌈log₂(n!)⌉ para n pequeno',
    'Implementar o counting sort estável com somas de prefixos e dizer quando Θ(n + k) compensa',
    'Executar o radix sort LSD à mão e explicar por que cada passada precisa ser estável',
    'Escolher entre ordenação por comparação, counting sort e radix sort pelo tipo e pela faixa das chaves',
  ],
  skills: ['alg-ordenacao', 'alg-complexidade'],
  terms: [
    t('ordenação por comparação', 'comparison sort', 'Algoritmo que só descobre a ordem perguntando "a < b?" entre dois elementos; merge, quick, heap e insertion sort são assim.', 'Any comparison sort must make Ω(n log n) comparisons in the worst case.'),
    t('árvore de decisão', 'decision tree', 'Árvore binária com todas as sequências de comparações que um algoritmo pode fazer para um tamanho n; cada folha é uma ordem final.'),
    t('ordenação por contagem', 'counting sort', 'Conta quantas vezes cada chave inteira aparece e usa as contagens para calcular a posição de cada item; Θ(n + k) para chaves em uma faixa de k valores.', 'Counting sort runs in O(n + k) time, where k is the range of the keys.'),
    t('soma de prefixos', 'prefix sum', 'Lista em que cada posição guarda a soma dos elementos do início até ela (versão inclusiva) ou só dos anteriores a ela (versão exclusiva); também chamada de soma acumulada.', 'Take the prefix sums of the counts to find where each key starts in the output.'),
    t('ordenação por dígitos', 'radix sort', 'Ordena chaves de d dígitos com d passadas estáveis, uma por dígito; Θ(d · (n + b)) na base b.'),
    t('dígito menos significativo', 'least significant digit (LSD)', 'O dígito mais à direita, o que menos pesa no valor; o radix sort LSD começa por ele.'),
    t('base', 'radix', 'Quantos valores um dígito pode ter: 10 em decimal, 256 quando cada "dígito" é um byte.'),
    t('ordenação por baldes', 'bucket sort', 'Espalha os itens em baldes por faixa de valor e ordena cada balde; tempo esperado Θ(n) quando as chaves são uniformes.'),
  ],
  stages: {
    conceito: [
      md(`
        A primeira lição do módulo afirmou, num quadro de aprofundamento, que ordenar comparando exige Ω(n log n) comparações e que counting sort e radix sort "escapam" desse limite. Agora você vai ver a prova e o escape funcionando.

        Duas ideias:

        1. Uma {{ordenação por comparação|comparison sort}} só aprende sobre a ordem fazendo perguntas de sim ou não ("a < b?"). No pior caso, cada resposta elimina no máximo metade das ordens que ainda são possíveis. Como n elementos podem estar em n! ordens, são necessárias pelo menos log₂(n!) ≈ n log₂ n perguntas. Nenhum truque de pivô, de memória ou de sorteio escapa disso.
        2. Se a chave é um inteiro pequeno (nota de 0 a 10, idade, dia do mês, um dígito do CEP), não é preciso perguntar nada: a chave **é** o endereço. Pense num censo: para montar a distribuição por idade, ninguém compara pessoas entre si; basta contar quantas têm 0 anos, quantas têm 1 ano, e assim por diante. Essa é a {{ordenação por contagem|counting sort}}, em Θ(n + k). A {{ordenação por dígitos|radix sort}} estende a ideia para chaves grandes, como CEPs, passando dígito por dígito, e só funciona graças à **estabilidade**.
      `),
    ],
    explicacao: [
      md(`
        ### O limite inferior: a árvore de decisão
        Fixe n. Tudo o que uma ordenação por comparação pode fazer com entradas de tamanho n cabe numa {{árvore de decisão|decision tree}}: cada nó interno é uma comparação "aᵢ < aⱼ?", com um filho para "sim" e outro para "não", e cada folha é a ordem final que o algoritmo devolve. Rodar o algoritmo numa entrada é descer da raiz até uma folha, e o número de comparações é a profundidade dessa folha.

        1. **Pelo menos n! folhas.** Se duas ordens diferentes da entrada chegassem à mesma folha, o algoritmo faria o mesmo rearranjo nas duas, e pelo menos uma sairia errada. Então cada uma das n! ordens precisa da sua folha.
        2. **No máximo 2ʰ folhas.** Uma árvore binária de altura h tem no máximo 2ʰ folhas.
        3. **Conclusão.** 2ʰ ≥ n!, logo h ≥ log₂(n!). Pela aproximação de Stirling, log₂(n!) ≈ n log₂ n − 1,44n: Ω(n log n) comparações no pior caso.

        O argumento vale também para a **média**: numa árvore binária com N folhas, a profundidade média das folhas é pelo menos log₂ N. E sortear pivôs não ajuda: para cada resultado fixo dos sorteios o algoritmo é uma árvore de decisão como outra qualquer.
      `),
      {
        type: 'table',
        head: ['n', 'n!', '⌈log₂(n!)⌉: limite inferior para o pior caso', 'merge sort (pior caso)', 'insertion sort (pior caso)'],
        rows: [
          ['3', '6', '3', '3', '3'],
          ['4', '24', '5', '5', '6'],
          ['5', '120', '7', '8', '10'],
          ['10', '3 628 800', '22', '25', '45'],
          ['100', '≈ 9,3 × 10¹⁵⁷', '525', '573', '4 950'],
          ['1 000', '2 568 algarismos', '8 530', '8 977', '499 500'],
        ],
        caption: 'Com n grande, o merge sort fica a poucos por cento do limite (cerca de 5% em n = 1 000). E o limite é quase atingível: para n = 5 existe um método (Ford–Johnson) que ordena com 7 comparações.',
      },
      md(`
        ### O que o limite **não** proíbe
        O argumento supõe que a única fonte de informação são comparações de sim ou não. Se a chave é um inteiro entre 0 e k − 1, a instrução \`cont[x] += 1\` escolhe uma entre k gavetas de uma vez só: é uma decisão de k vias, não de duas. Esse é o "escape". Não há contradição: é outro modelo de computação, que só serve quando as chaves têm essa estrutura.

        ### Counting sort
        Três passadas, para n itens com chaves inteiras de 0 a k − 1:

        1. **Contar**: cont[v] = quantos itens têm chave v. São n passos.
        2. **Somar prefixos**: inicio[v] = quantos itens têm chave **menor** que v, que é onde o primeiro item de chave v vai ficar na saída. É uma {{soma de prefixos|prefix sum}} (ou soma acumulada), k passos.
        3. **Posicionar**: percorrer a entrada **na ordem original** e colocar cada item em saida[inicio[chave]], somando 1 a inicio[chave]. Mais n passos.

        Total: Θ(n + k) de tempo e Θ(n + k) de memória extra. É **estável**: a passada 3 visita os itens na ordem original e preenche a região de cada chave da esquerda para a direita, então iguais mantêm a ordem em que chegaram.

        - **Quando compensa**: k = O(n). Idades de 5 milhões de pessoas (k = 121), notas de 0 a 1 000, dias do ano.
        - **Quando não compensa**: k muito maior que n. Mil CPFs tratados como inteiros têm k ≈ 10¹¹: o vetor de contagens seria 100 milhões de vezes maior que a entrada.
        - **Negativos**: desloque pelo menor valor (índice = x − mínimo).
        - **Só inteiros, sem dados junto**: dá para pular as somas de prefixos e reescrever a saída direto das contagens. Com registros (nome, idade), a passada 3 é obrigatória.

        ### Radix sort LSD
        Chaves com d dígitos na {{base|radix}} b: ordene pelo {{dígito menos significativo|least significant digit (LSD)}} primeiro, depois pelo seguinte, até o mais significativo por último, e cada passada precisa ser uma ordenação **estável** por aquele dígito (um counting sort com k = b).

        **Por que funciona** (a invariante): depois da passada i, a lista está ordenada pelos i últimos dígitos. A passada i + 1 ordena pelo dígito seguinte; entre chaves que empatam nesse dígito, a estabilidade mantém a ordem anterior, que já estava certa pelos i últimos. Logo a lista fica ordenada pelos i + 1 últimos dígitos. Sem estabilidade, a última passada embaralharia as chaves com o mesmo primeiro dígito e todo o trabalho anterior se perderia.

        Custo: **Θ(d · (n + b))**.
        - CEPs: d = 8 dígitos, b = 10, ou seja, 8 passadas de n + 10 passos.
        - Inteiros de 32 bits: com cada "dígito" sendo um byte, b = 256 e d = 4 passadas.
        - Inteiros menores que n²: use base n. Um milhão de números menores que 10¹² cabem em d = 2 dígitos na base 10⁶: duas passadas, Θ(n).
      `),
      {
        type: 'table',
        head: ['Método', 'Tempo', 'Memória extra', 'Estável?', 'Quando usar'],
        rows: [
          ['Por comparação (merge sort, Timsort)', 'Θ(n log n) no pior caso', 'Θ(n)', 'sim', 'qualquer chave comparável: strings, tuplas, datas, reais'],
          ['Counting sort', 'Θ(n + k)', 'Θ(n + k)', 'sim (versão com somas de prefixos)', 'chaves inteiras numa faixa pequena, k = O(n)'],
          ['Radix sort LSD', 'Θ(d · (n + b))', 'Θ(n + b)', 'sim', 'chaves de tamanho fixo: CEP, CPF, inteiros de 32 ou 64 bits'],
          ['Bucket sort', 'Θ(n) esperado; Θ(n²) no pior caso', 'Θ(n)', 'sim, se cada balde usar um método estável', 'reais com distribuição uniforme conhecida'],
        ],
      },
      tip(`
        Em Python, \`sorted()\` é escrito em C, e um radix sort em Python puro costuma perder para ele mesmo com n grande: a constante de cada passo interpretado é alta. O Θ(n) aparece na prática em linguagens compiladas e em bibliotecas (a NumPy, por exemplo, usa radix sort em \`np.sort(..., kind="stable")\` para alguns tipos inteiros), em bancos de dados e em placas de vídeo (GPUs). Aqui, implementar serve para **entender**; no dia a dia, use \`sorted\` com \`key\`.
      `),
      deep(`
        - **Radix MSD** (do dígito mais significativo): separa pelo primeiro dígito em b baldes e ordena cada balde recursivamente pelo dígito seguinte. Para cedo quando um balde tem um item só, por isso é a escolha natural para strings de tamanhos muito diferentes. Não depende de estabilidade entre passadas, mas a recursão cria muitos baldes pequenos.
        - **{{Ordenação por baldes|bucket sort}}**: para chaves reais uniformemente distribuídas em [0, 1), espalha os n itens em n baldes (o balde de x é ⌊n · x⌋), ordena cada balde com insertion sort e concatena. Em média cada balde tem O(1) itens, e o tempo esperado é Θ(n). Se a distribuição não for uniforme e tudo cair num balde só, o custo volta a Θ(n²).
      `, 'Duas variações'),
    ],
    exemplo: [
      md(`
        ### 1. A árvore de decisão do insertion sort para n = 3
        Elementos a, b e c. Cada caminho da raiz até uma folha é uma execução; cada folha, uma das 3! = 6 ordens.
      `),
      code('text', `
                          a < b ?
                  sim /           \\ não
               b < c ?             a < c ?
             sim /  \\ não        sim /  \\ não
         [a, b, c]   a < c ?   [b, a, c]   b < c ?
                   sim /  \\ não         sim /  \\ não
              [a, c, b] [c, a, b]   [b, c, a] [c, b, a]
      `),
      md(`
        Duas folhas estão na profundidade 2 (melhor caso: 2 comparações) e quatro na profundidade 3. Nenhum algoritmo por comparação ordena 3 elementos com no máximo 2 comparações: 2 perguntas de sim ou não distinguem no máximo 2² = 4 casos, e são 6 ordens. ⌈log₂ 6⌉ = 3, e o insertion sort atinge o limite.

        ### 2. Counting sort estável, passo a passo
        Na fila do banco, cada cliente tem um tipo de atendimento: 0 = preferencial, 1 = agendado, 2 = comum. Queremos ordenar por tipo **sem mudar a ordem de chegada** dentro de cada tipo. Entrada: Ana (2), Beto (0), Caio (2), Duda (1), Eva (0).

        Contagens: cont = [2, 1, 2] (dois preferenciais, um agendado, dois comuns). Somas de prefixos exclusivas: inicio = [0, 2, 3], ou seja, os preferenciais começam no índice 0, o agendado no 2 e os comuns no 3. Agora a passada 3, na ordem de chegada:
      `),
      {
        type: 'table',
        head: ['Cliente', 'Tipo', 'inicio antes', 'Vai para o índice', 'inicio depois'],
        rows: [
          ['Ana', '2', '[0, 2, 3]', '3', '[0, 2, 4]'],
          ['Beto', '0', '[0, 2, 4]', '0', '[1, 2, 4]'],
          ['Caio', '2', '[1, 2, 4]', '4', '[1, 2, 5]'],
          ['Duda', '1', '[1, 2, 5]', '2', '[1, 3, 5]'],
          ['Eva', '0', '[1, 3, 5]', '1', '[2, 3, 5]'],
        ],
        caption: 'Saída: Beto (0), Eva (0), Duda (1), Ana (2), Caio (2). Beto continua antes de Eva e Ana antes de Caio: estável. Nenhum cliente foi comparado com outro.',
      },
      md(`
        ### 3. Radix sort LSD à mão
        Sete códigos de três dígitos. Cada coluna é o resultado de uma passada estável pelo dígito indicado:
      `),
      {
        type: 'table',
        head: ['Entrada', 'Após as unidades', 'Após as dezenas', 'Após as centenas'],
        rows: [
          ['329', '720', '720', '329'],
          ['457', '355', '329', '355'],
          ['657', '436', '436', '436'],
          ['839', '457', '839', '457'],
          ['436', '657', '355', '657'],
          ['720', '329', '457', '720'],
          ['355', '839', '657', '839'],
        ],
        caption: 'Depois de cada passada, a lista fica ordenada pelos dígitos já processados: primeiro pelo último, depois pelos dois últimos, depois pelos três.',
      },
      md(`
        Olhe o 329 e o 355 na última passada: os dois têm centena 3, então essa passada não os distingue. Quem decide é a ordem que eles já tinham (329 antes de 355, graças às dezenas), e a passada estável a preserva. Uma passada instável poderia devolver 355 antes de 329.
      `),
    ],
    codigo: [
      py(`
        def passada_estavel(itens, digito):
            """Counting sort estável pela chave digito(item), que vai de 0 a 9."""
            cont = [0] * 10
            for it in itens:
                cont[digito(it)] += 1
            inicio = [0] * 10                 # inicio[d] = quantos itens têm dígito < d
            for d in range(1, 10):
                inicio[d] = inicio[d - 1] + cont[d - 1]
            saida = [None] * len(itens)
            for it in itens:                  # ordem original: é isso que garante a estabilidade
                d = digito(it)
                saida[inicio[d]] = it
                inicio[d] += 1
            return saida

        def radix_ceps(pedidos):
            """pedidos: lista de (cep, cliente). Ordena por CEP, do último dígito para o primeiro."""
            posicoes = [0, 1, 2, 3, 4, 6, 7, 8]   # índices dos dígitos em "01310-100" (pula o hífen)
            for pos in reversed(posicoes):
                pedidos = passada_estavel(pedidos, lambda p: int(p[0][pos]))
            return pedidos

        pedidos = [("22041-001", "Ana"), ("01310-100", "Bia"), ("70040-010", "Caio"),
                   ("22041-001", "Davi"), ("01310-930", "Eva"), ("40020-000", "Fábio")]
        for cep, cliente in radix_ceps(pedidos):
            print(cep, cliente)
        print("igual ao sorted estável?", radix_ceps(pedidos) == sorted(pedidos, key=lambda p: p[0]))
      `, { caption: 'Oito passadas de counting sort, uma por dígito, do último para o primeiro. Ana e Davi têm o mesmo CEP e saem na ordem em que chegaram. Experimente trocar reversed(posicoes) por posicoes e veja a ordem quebrar.' }),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e4-lin-1',
          kind: 'mcq',
          prompt: 'Em qual destas situações o counting sort é a melhor escolha?',
          difficulty: 'facil',
          skills: ['alg-ordenacao'],
          hints: [
            'O custo do counting sort depende de duas quantidades. Quais?',
            'Em cada situação, quanto vale k (a quantidade de valores possíveis da chave) comparado com n?',
            'O counting sort usa a chave como índice de uma lista. Toda chave serve como índice?',
          ],
          explanation: 'O counting sort custa Θ(n + k) e precisa de chaves inteiras numa faixa de k valores. Compensa quando k é pequeno perto de n, como as idades de um censo (k = 121, n = 5 milhões). Com CPFs, k é astronômico; com nomes, a chave nem é um inteiro; com 50 preços, n é tão pequeno que qualquer método serve.',
          options: [
            { text: 'Ordenar as idades (0 a 120 anos) de 5 milhões de pessoas de um censo.', correct: true, feedback: 'Isso: k = 121 é minúsculo perto de n = 5 milhões. São Θ(n + k) passos, e o vetor de contagens tem só 121 posições.' },
            { text: 'Ordenar 1 000 CPFs, tratados como números inteiros de 11 dígitos.', feedback: 'A faixa de valores é k ≈ 10¹¹: o vetor de contagens teria 100 bilhões de posições para guardar 1 000 números. Quando k é muito maior que n, o counting sort é inviável. Um radix sort por dígitos, ou o próprio sorted(), resolve.' },
            { text: 'Ordenar 10 000 nomes de clientes em ordem alfabética.', feedback: 'Nomes não são inteiros numa faixa pequena: cada nome é uma sequência de letras de tamanho variável. Para strings, use sorted() ou um radix sort por posição, como no desafio desta lição.' },
            { text: 'Ordenar 50 preços com centavos, como 19,90 e 1 234,56.', feedback: 'Com n = 50, qualquer método serve, e sorted() é o mais simples. Convertendo para centavos, a faixa iria de 1 990 a 123 456: mais de 120 mil contadores para ordenar 50 números.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e4-lin-2',
          kind: 'predict',
          lang: 'python',
          prompt: 'O que este código imprime?',
          difficulty: 'intermediario',
          skills: ['alg-ordenacao', 'prog-listas'],
          hints: [
            'Depois do primeiro laço, cont[v] é quantas vezes v aparece. Quantos 3 há na lista?',
            'No segundo laço, cada posição recebe a soma dela com a anterior, que já foi atualizada. Faça as contas da esquerda para a direita.',
            'Depois do segundo laço, cont[2] conta quantas notas são menores ou iguais a 2. Se são essas as primeiras da saída, em qual índice fica a última delas?',
          ],
          explanation: 'Contagens: um 0, um 1, um 2 e três 3, então [1, 1, 1, 3]. Somas de prefixos inclusivas: [1, 1 + 1, 2 + 1, 3 + 3] = [1, 2, 3, 6]. Agora cont[v] é quantas notas são ≤ v, isto é, onde **termina** a região da chave v na saída: as notas ≤ 2 ocupam os índices 0, 1 e 2, e a última delas fica em cont[2] − 1 = 2. É por isso que a versão do livro de Cormen et al. (CLRS) percorre a entrada de trás para frente: cada item de chave v ocupa a última vaga livre da sua região, e cont[v] diminui a cada uso.',
          code: dedent(`
            notas = [3, 1, 3, 0, 2, 3]
            cont = [0] * 4
            for x in notas:
                cont[x] += 1
            print(cont)
            for v in range(1, 4):
                cont[v] += cont[v - 1]
            print(cont)
            print(cont[2] - 1)
          `),
          answer: '[1, 1, 1, 3]\n[1, 2, 3, 6]\n2',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e4-lin-3',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `counting_sort(xs)` para uma lista de inteiros **que pode ter negativos**. Devolva uma lista nova, em ordem crescente, sem alterar xs, em Θ(n + k), com k = máximo − mínimo + 1. Não use `sorted` nem `.sort`, e não compare elementos entre si além do necessário para achar o menor e o maior: os testes contam as comparações.',
          difficulty: 'intermediario',
          skills: ['alg-ordenacao', 'prog-listas'],
          hints: [
            'Em qual posição de uma lista de contadores você guardaria a contagem do −3? O que o Python faz com um índice negativo?',
            'Se o menor valor é m, que deslocamento transforma m no índice 0?',
            'Quantas posições a lista de contadores precisa ter para ir do menor ao maior valor, incluindo os dois?',
            'E se a lista estiver vazia? O que min([]) faz?',
          ],
          explanation: 'Deslocando cada valor pelo mínimo (índice = x − m), a faixa [m, M] vira [0, k − 1], com k = M − m + 1. Contar custa Θ(n); percorrer os k contadores e reescrever a saída custa Θ(n + k). Sem o deslocamento, cont[-3] não dá erro em Python: acessa a terceira posição a partir do fim e corrompe a contagem em silêncio. Com inteiros puros, reescrever a partir das contagens basta; com registros, como (nome, idade), é preciso a versão estável com somas de prefixos.',
          starter: dedent(`
            def counting_sort(xs):
                # devolva uma lista nova com os valores de xs em ordem crescente,
                # contando quantas vezes cada valor aparece (xs pode ter negativos)
                return xs
          `),
          solution: dedent(`
            def counting_sort(xs):
                if not xs:
                    return []
                menor, maior = min(xs), max(xs)
                cont = [0] * (maior - menor + 1)
                for x in xs:
                    cont[x - menor] += 1
                saida = []
                for i, c in enumerate(cont):
                    saida.extend([i + menor] * c)
                return saida
          `),
          tests: [
            { name: 'exemplo com negativos', code: 'r = counting_sort([3, -1, 2, -1, 0])\nassert r == [-1, -1, 0, 2, 3], f"esperava [-1, -1, 0, 2, 3]; veio {r}"' },
            {
              name: 'bordas: vazia, um elemento, todos iguais, só negativos',
              code: dedent(`
                r = counting_sort([])
                assert r == [], f"lista vazia deve devolver []; veio {r}"
                r = counting_sort([7])
                assert r == [7], f"[7] deve devolver [7]; veio {r}"
                r = counting_sort([4, 4, 4])
                assert r == [4, 4, 4], f"[4, 4, 4] deve devolver [4, 4, 4]; veio {r}"
                r = counting_sort([-3, -10, -7])
                assert r == [-10, -7, -3], f"[-3, -10, -7] deve devolver [-10, -7, -3]; veio {r}"
              `),
            },
            {
              name: 'faixa que você não conhece de antemão',
              code: dedent(`
                xs = [5000, -4000, 4999, -4000, 0, 123]
                try:
                    r = counting_sort(xs)
                except IndexError:
                    raise AssertionError(f"counting_sort({xs}) deu IndexError: o tamanho da lista de contadores precisa vir do menor e do maior valor da entrada, não de uma faixa fixa")
                assert r == [-4000, -4000, 0, 123, 4999, 5000], f"para {xs} esperava [-4000, -4000, 0, 123, 4999, 5000]; veio {r}"
              `),
            },
            {
              name: 'devolve uma lista nova, sem alterar a recebida',
              code: dedent(`
                xs = [3, -1, 2, -1, 0]
                r = counting_sort(xs)
                assert xs == [3, -1, 2, -1, 0], f"a lista recebida foi alterada: virou {xs}"
                assert r is not xs, "devolva uma lista nova, não a própria lista recebida"
              `),
            },
            {
              name: 'aleatório',
              code: dedent(`
                import random
                for _ in range(100):
                    xs = [random.randint(-30, 30) for _ in range(random.randint(0, 60))]
                    r = counting_sort(xs[:])
                    assert r == sorted(xs), f"para {xs} esperava {sorted(xs)}; veio {r}"
              `),
            },
            { name: 'sem sorted() nem .sort()', code: SEM_SORTED },
            {
              name: 'não compara elementos entre si',
              code: CONTADO + '\n' + dedent(`
                import random
                n = 3000
                valores = [random.randint(-100, 100) for _ in range(n)]
                Contado.prepara(4 * n, "com 3 000 valores, a sua função passou de 12 000 comparações. O counting sort só compara para achar o menor e o maior; o resto é contar, usando o valor como índice.")
                r = counting_sort([Contado(v) for v in valores])
                Contado.limite = None
                assert [int(v) for v in r] == sorted(valores), "com 3 000 valores entre -100 e 100, o resultado saiu errado"
              `),
            },
            {
              name: 'Θ(n + k): uma passada para contar',
              code: dedent(`
                import random

                class Igual(int):
                    usadas = 0
                    limite = None

                    def _conta(self):
                        Igual.usadas += 1
                        if Igual.limite is not None and Igual.usadas > Igual.limite:
                            Igual.limite = None
                            raise AssertionError("com 3 000 valores entre -100 e 100, a sua função fez mais de 12 000 testes de igualdade (==). Ela parece percorrer a lista uma vez para cada valor possível, o que custa Θ(n · k), não Θ(n + k). Conte tudo numa passada só, usando o valor (deslocado) como índice.")

                    def __eq__(self, o):
                        self._conta()
                        return int.__eq__(self, o)

                    def __ne__(self, o):
                        self._conta()
                        return int.__ne__(self, o)

                    __hash__ = int.__hash__

                n = 3000
                valores = [random.randint(-100, 100) for _ in range(n)]
                Igual.usadas, Igual.limite = 0, 4 * n
                r = counting_sort([Igual(v) for v in valores])
                Igual.limite = None
                assert [int(v) for v in r] == sorted(valores), "com 3 000 valores entre -100 e 100, o resultado saiu errado"
              `),
            },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e4-lin-4',
          kind: 'fix',
          lang: 'python',
          prompt: 'A função abaixo deveria ordenar pessoas por idade **de forma estável** (numa fila de vacinação, quem tem a mesma idade e chegou antes continua antes). Ela acerta a ordem das idades, mas os testes de estabilidade falham. Encontre e corrija o erro sem trocar de algoritmo: nada de `sorted` ou `.sort`.',
          difficulty: 'intermediario',
          skills: ['alg-ordenacao', 'py-debugging'],
          hints: [
            'Rode com [("Ana", 30), ("Caio", 30)]. Quem sai primeiro? Por quê?',
            'Depois das somas de prefixos, cont[v] aponta para o começo ou para o fim da região da idade v na saída?',
            'Se a região de cada idade é preenchida de trás para frente, em que ordem a entrada precisa ser percorrida para que quem chegou primeiro fique na frente?',
          ],
          explanation: 'Depois das somas de prefixos inclusivas, cont[v] é quantas pessoas têm idade ≤ v, ou seja, o fim da região da idade v. Diminuir e posicionar preenche cada região de trás para frente; percorrendo a entrada do começo para o fim, o primeiro de cada idade vai para o fim da sua região, e a ordem dos iguais sai invertida. Há duas correções equivalentes: percorrer a entrada de trás para frente (como no CLRS) ou transformar cont em posições iniciais (soma de prefixos exclusiva) e preencher cada região da esquerda para a direita, como no código da lição.',
          starter: dedent(`
            def ordenar_por_idade(pessoas):
                """pessoas: lista de (nome, idade), com idades de 0 a 120.
                Devolve uma lista nova ordenada por idade; quem tem a mesma idade
                mantém a ordem em que aparecia (ordenação estável)."""
                cont = [0] * 121
                for nome, idade in pessoas:
                    cont[idade] += 1
                for v in range(1, 121):
                    cont[v] += cont[v - 1]          # cont[v] = quantas pessoas têm idade <= v
                saida = [None] * len(pessoas)
                for nome, idade in pessoas:
                    cont[idade] -= 1
                    saida[cont[idade]] = (nome, idade)
                return saida
          `),
          solution: dedent(`
            def ordenar_por_idade(pessoas):
                """pessoas: lista de (nome, idade), com idades de 0 a 120.
                Devolve uma lista nova ordenada por idade; quem tem a mesma idade
                mantém a ordem em que aparecia (ordenação estável)."""
                cont = [0] * 121
                for nome, idade in pessoas:
                    cont[idade] += 1
                for v in range(1, 121):
                    cont[v] += cont[v - 1]          # cont[v] = quantas pessoas têm idade <= v
                saida = [None] * len(pessoas)
                for nome, idade in reversed(pessoas):
                    cont[idade] -= 1
                    saida[cont[idade]] = (nome, idade)
                return saida
          `),
          tests: [
            {
              name: 'ordena pela idade',
              code: dedent(`
                r = ordenar_por_idade([("Ana", 30), ("Bia", 65), ("Caio", 18)])
                assert [p[1] for p in r] == [18, 30, 65], f"as idades deveriam sair [18, 30, 65]; veio {r}"
              `),
            },
            {
              name: 'estável: mesma idade mantém a ordem de chegada',
              code: dedent(`
                fila = [("Ana", 30), ("Bia", 65), ("Caio", 30), ("Duda", 65), ("Eva", 30)]
                esperado = [("Ana", 30), ("Caio", 30), ("Eva", 30), ("Bia", 65), ("Duda", 65)]
                r = ordenar_por_idade(fila)
                assert r == esperado, f"com a mesma idade, quem veio antes deve continuar antes. Esperava {esperado}; veio {r}"
              `),
            },
            {
              name: 'bordas: vazia, uma pessoa, idades 0 e 120',
              code: dedent(`
                assert ordenar_por_idade([]) == [], "lista vazia deve devolver []"
                assert ordenar_por_idade([("Zé", 40)]) == [("Zé", 40)], "uma pessoa só deve sair igual"
                r = ordenar_por_idade([("Avó", 120), ("Bebê", 0), ("Bisa", 120), ("Neném", 0)])
                esperado = [("Bebê", 0), ("Neném", 0), ("Avó", 120), ("Bisa", 120)]
                assert r == esperado, f"esperava {esperado}; veio {r}"
              `),
            },
            {
              name: 'aleatório, comparado com uma ordenação estável',
              code: dedent(`
                import random
                for _ in range(50):
                    fila = [(f"p{i}", random.randint(0, 120)) for i in range(random.randint(0, 80))]
                    antes = fila[:]
                    r = ordenar_por_idade(fila)
                    esperado = sorted(antes, key=lambda p: p[1])
                    assert r == esperado, f"para {antes} esperava {esperado}; veio {r}"
                    assert fila == antes, "a função não deve alterar a lista recebida"
              `),
            },
            { name: 'sem sorted() nem .sort()', code: SEM_SORTED },
            {
              name: 'continua sendo counting sort: não compara idades',
              code: CONTADO + '\n' + dedent(`
                import random
                n = 400
                fila = [(f"p{i}", random.randint(0, 120)) for i in range(n)]
                Contado.prepara(n, "a sua versão comparou idades entre si (<, >, <=, >=) mais de 400 vezes numa fila de 400 pessoas. O exercício pede para consertar o counting sort, que usa a idade como índice, e não para trocá-lo por uma ordenação por comparação.")
                r = ordenar_por_idade([(nome, Contado(idade)) for nome, idade in fila])
                Contado.limite = None
                assert [(nome, int(idade)) for nome, idade in r] == sorted(fila, key=lambda p: p[1]), "com 400 pessoas, a ordem saiu errada ou não é estável"
              `),
            },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e4-lin-5',
          kind: 'mcq',
          prompt: 'Um colega afirma ter criado uma ordenação **por comparação** que ordena qualquer lista de n números distintos com no máximo **2n** comparações. O que você responde?',
          difficulty: 'avancado',
          skills: ['alg-ordenacao', 'alg-complexidade'],
          hints: [
            'Quantas ordens diferentes n números distintos podem ter?',
            'Cada comparação tem duas respostas. Com c comparações, quantos caminhos diferentes o algoritmo pode seguir, no máximo?',
            'Compare 4ⁿ com n! para n = 8, 9 e 10.',
          ],
          explanation: 'Com no máximo 2n comparações, a árvore de decisão tem altura 2n e, portanto, no máximo 2²ⁿ = 4ⁿ folhas. Ela precisa de uma folha para cada uma das n! ordens. Para n = 8, 4⁸ = 65 536 ≥ 8! = 40 320 e ainda não há contradição; para n = 9, 9! = 362 880 > 4⁹ = 262 144, e daí em diante n! cresce mais rápido (cada passo multiplica n! por n + 1 > 4 e 4ⁿ só por 4). A afirmação é falsa para todo n ≥ 9: em cada um desses tamanhos, existe alguma lista que exige mais de 2n comparações.',
          options: [
            { text: 'Impossível para n ≥ 9: 2n comparações distinguem no máximo 2²ⁿ = 4ⁿ casos, e 9! = 362 880 já passa de 4⁹ = 262 144.', correct: true, feedback: 'Isso. A árvore de decisão precisa de n! folhas e uma de altura 2n tem no máximo 4ⁿ. Como n! cresce mais rápido que 4ⁿ, a afirmação quebra em n = 9 e só piora depois.' },
            { text: 'Possível: o counting sort já faz isso em Θ(n + k).', feedback: 'O counting sort não compara elementos: usa o valor como índice. O limite da árvore de decisão vale para quem só obtém informação por comparações, e o colega disse que o algoritmo dele compara.' },
            { text: 'Possível, se o algoritmo sortear os pivôs: o limite só vale para algoritmos determinísticos.', feedback: 'Sorteios não trazem informação sobre a ordem dos dados. Para cada resultado fixo dos sorteios, o algoritmo é uma árvore de decisão com pelo menos n! folhas, e até a média de comparações fica em pelo menos log₂(n!).' },
            { text: 'Impossível, porque toda ordenação por comparação precisa de pelo menos n² comparações.', feedback: 'O merge sort faz cerca de n log₂ n comparações, bem menos que n². O limite inferior é log₂(n!) ≈ n log₂ n − 1,44n, não n².' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e4-lin-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Escreva \`radix_palavras(palavras)\` que devolve uma lista nova com as palavras na **mesma ordem que \`sorted()\` daria**, usando radix sort LSD. As palavras têm só letras minúsculas de 'a' a 'z' e **tamanhos diferentes** (pode haver a palavra vazia e palavras repetidas). Exemplo: \`radix_palavras(["banana", "ana", "bala", "a", "ab", "b"])\` devolve \`["a", "ab", "ana", "b", "bala", "banana"]\`.

            Faça uma passada estável por posição, da última para a primeira. Não use \`sorted\` nem \`.sort\`, e não compare palavras entre si: os testes contam as comparações.
          `),
          difficulty: 'desafio',
          skills: ['alg-ordenacao', 'prog-strings'],
          hints: [
            'Para o sorted(), por que "ab" vem antes de "abc"? O que significa, numa comparação, uma palavra acabar antes da outra?',
            'Se você completasse as palavras curtas com um caractere imaginário, ele teria de vir antes ou depois do "a"?',
            'Quantas passadas são necessárias, e a partir de qual posição? Pense na maior palavra.',
            'Em cada passada, quantos baldes você precisa? Um para cada letra… e mais qual?',
          ],
          explanation: 'Completar as palavras curtas com um "caractere vazio" menor que todas as letras (o balde 0) faz o radix LSD reproduzir a ordem do dicionário: "ab" se comporta como "ab_" e fica antes de "abc". São L passadas, com L o tamanho da maior palavra, cada uma estável com 27 baldes: Θ(L · (n + 27)). Quando os tamanhos variam muito (uma palavra de 1 000 letras e o resto curtas), o LSD paga 1 000 passadas sobre todas as palavras; aí o radix MSD, que para cedo em baldes pequenos, ou o próprio sorted(), são melhores.',
          starter: dedent(`
            def radix_palavras(palavras):
                # devolva uma lista nova na mesma ordem que sorted() daria, com radix sort LSD:
                # uma passada estável por posição, da última para a primeira
                return list(palavras)
          `),
          solution: dedent(`
            def radix_palavras(palavras):
                saida = list(palavras)
                maior = 0
                for p in saida:
                    if len(p) > maior:
                        maior = len(p)
                for pos in range(maior - 1, -1, -1):
                    baldes = [[] for _ in range(27)]     # balde 0: a palavra já acabou
                    for p in saida:
                        b = ord(p[pos]) - ord("a") + 1 if pos < len(p) else 0
                        baldes[b].append(p)
                    saida = [p for balde in baldes for p in balde]
                return saida
          `),
          tests: [
            {
              name: 'exemplo',
              code: dedent(`
                r = radix_palavras(["banana", "ana", "bala", "a", "ab", "b"])
                esperado = ["a", "ab", "ana", "b", "bala", "banana"]
                assert r == esperado, f"esperava {esperado}; veio {r}"
              `),
            },
            {
              name: 'prefixos, repetidas e a palavra vazia',
              code: dedent(`
                r = radix_palavras(["abc", "", "ab", "a", "", "abc", "b"])
                esperado = ["", "", "a", "ab", "abc", "abc", "b"]
                assert r == esperado, f"uma palavra que é prefixo de outra vem antes dela, e a vazia vem antes de todas. Esperava {esperado}; veio {r}"
              `),
            },
            {
              name: 'bordas: lista vazia e uma palavra',
              code: dedent(`
                assert radix_palavras([]) == [], "lista vazia deve devolver []"
                assert radix_palavras(["x"]) == ["x"], "uma palavra só deve sair igual"
                assert radix_palavras([""]) == [""], "uma palavra vazia só deve sair igual"
              `),
            },
            {
              name: 'cidades',
              code: dedent(`
                cidades = ["itu", "ita", "itabira", "itaquaquecetuba", "itajai", "ita", "jau", "jundiai", "ipatinga", "ibitinga"]
                r = radix_palavras(cidades)
                assert r == sorted(cidades), f"esperava {sorted(cidades)}; veio {r}"
              `),
            },
            {
              name: 'palavras longas com o mesmo começo',
              code: dedent(`
                ps = ["constitucionalmente", "constituinte", "constitucional", "constituicao", "constitucionalidade", "constitui"]
                r = radix_palavras(ps)
                assert r == sorted(ps), f"estas palavras têm as mesmas 8 primeiras letras. Esperava {sorted(ps)}; veio {r}. O número de passadas depende da maior palavra da entrada?"
              `),
            },
            {
              name: 'aleatório',
              code: dedent(`
                import random
                for _ in range(100):
                    ps = ["".join(random.choice("abc") for _ in range(random.randint(0, 6))) for _ in range(random.randint(0, 40))]
                    antes = ps[:]
                    r = radix_palavras(ps)
                    assert r == sorted(antes), f"para {antes} esperava {sorted(antes)}; veio {r}"
                    assert ps == antes, "a função não deve alterar a lista recebida"
              `),
            },
            { name: 'sem sorted() nem .sort()', code: SEM_SORTED },
            {
              name: 'não compara palavras entre si',
              code: PALAVRA + '\n' + dedent(`
                import random
                n = 2000
                ps = ["".join(random.choice("abcdefghij") for _ in range(random.randint(1, 8))) for _ in range(n)]
                Palavra.prepara(n, "a sua função comparou palavras inteiras (<, >, <=, >=) mais de 2 000 vezes em 2 000 palavras. O radix sort distribui por letra, sem comparar palavras.")
                r = radix_palavras([Palavra(p) for p in ps])
                Palavra.limite = None
                assert [str(p) for p in r] == sorted(ps), "com 2 000 palavras aleatórias, o resultado saiu errado"
              `),
            },
          ],
        },
      },
    ],
    revisao: [
      md(`
        - Toda ordenação por comparação é uma árvore de decisão com pelo menos n! folhas; altura h exige 2ʰ ≥ n!, logo h ≥ log₂(n!) ≈ n log₂ n − 1,44n. Vale também para a média e para algoritmos com sorteio.
        - Counting sort: contar, somar prefixos, posicionar na ordem original. Θ(n + k), estável; só compensa com k = O(n).
        - Radix sort LSD: uma passada estável por dígito, do menos para o mais significativo. Θ(d · (n + b)). Sem estabilidade, não funciona.
        - Esses métodos não violam o limite: eles não comparam, usam a chave como índice.
        - Na prática, em Python: \`sorted\` com \`key\`. Counting e radix brilham em linguagens compiladas, com chaves inteiras de faixa conhecida.
      `),
      english(`
        - **comparison sort / decision tree**: ordenação por comparação / árvore de decisão
        - **lower bound**: limite inferior
        - **counting sort, radix sort, bucket sort**: os nomes costumam ficar em inglês
        - **prefix sum (cumulative sum)**: soma de prefixos (soma acumulada)
        - **least / most significant digit (LSD / MSD)**: dígito menos / mais significativo
        - **stable pass**: passada estável

        Frase típica de entrevista: *"Counting sort runs in O(n + k) time. It doesn't contradict the Ω(n log n) lower bound, because it never compares two elements: it uses the key as an array index."*

        Em livros e documentação: *"Radix sort requires the intermediate sort on each digit to be stable; otherwise, the order established by the less significant digits would be lost."*
      `),
    ],
  },
  review: [
    ['Por que toda ordenação por comparação faz pelo menos log₂(n!) comparações no pior caso?', 'A árvore de decisão precisa de uma folha para cada uma das n! ordens, e uma árvore binária de altura h tem no máximo 2ʰ folhas: 2ʰ ≥ n!.'],
    ['Por que é impossível ordenar 3 elementos com no máximo 2 comparações?', '2 comparações distinguem no máximo 2² = 4 casos, e 3 elementos têm 3! = 6 ordens possíveis.'],
    ['Por que o counting sort não contradiz o limite Ω(n log n)?', 'Ele não compara elementos: usa a chave como índice, e cada acesso cont[x] escolhe entre k possibilidades de uma vez.'],
    ['Quanto custa o counting sort, e quando ele não compensa?', 'Θ(n + k), com k a faixa das chaves. Não compensa quando k é muito maior que n, como CPFs tratados como inteiros.'],
    ['Em que ordem o radix sort LSD processa os dígitos, e que propriedade cada passada precisa ter?', 'Do dígito menos significativo para o mais significativo; cada passada precisa ser estável.'],
    ['Quanto custa o radix sort LSD para n chaves de d dígitos na base b?', 'Θ(d · (n + b)).'],
    ['No counting sort com soma de prefixos inclusiva, por que a entrada é percorrida de trás para frente?', 'Porque cont[v] aponta para o fim da região da chave v; percorrendo de trás para frente, o último a chegar ocupa o fim da região e a ordem dos iguais é preservada.'],
  ],
  references: ['clrs', 'sedgewick-algs', 'mit-6006', 'python-sorting-howto'],
});

export const lessons: Lesson[] = [quicksort, linear];
