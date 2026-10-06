import type { Level } from '../types.ts';
import { lessons as m3_1 } from './modulos/m3-1.ts';
import { lessons as m3_2 } from './modulos/m3-2.ts';
import { lessons as m3_3 } from './modulos/m3-3.ts';
import { lessons as m3_4 } from './modulos/m3-4.ts';
import { lessons as m3_5 } from './modulos/m3-5.ts';
import { dedent, deep, english, info, lesson, md, py, t, tip, trace, warn } from '../helpers.ts';

const arrays = lesson({
  id: 'l3-arrays',
  moduleId: 'm3-1',
  title: 'Arrays e listas dinâmicas',
  titleEn: 'Arrays and dynamic arrays',
  summary: 'Memória contígua, acesso por índice em O(1), custo de inserir no meio e a mágica da lista que cresce.',
  minutes: 30,
  objectives: ['Explicar por que o acesso por índice é O(1)', 'Estimar o custo de inserir/remover no início, meio e fim', 'Entender o crescimento amortizado de listas dinâmicas'],
  skills: ['ed-arrays'],
  terms: [
    t('arranjo / vetor', 'array', 'Sequência de elementos em posições de memória contíguas.'),
    t('contíguo', 'contiguous', 'Lado a lado, sem buracos, na memória.'),
    t('estrutura de dados', 'data structure', 'Forma de organizar dados para que certas operações sejam eficientes.'),
    t('custo amortizado', 'amortized cost', 'Custo médio por operação ao longo de muitas operações.'),
    t('capacidade', 'capacity', 'Espaço reservado; pode ser maior que o tamanho usado.'),
  ],
  stages: {
    conceito: [md('Uma **{{estrutura de dados|data structure}}** é uma forma de organizar dados para tornar certas operações rápidas. A mais fundamental é o **{{array|array}}**: elementos guardados **lado a lado** na memória. A lista do Python é um *array dinâmico*.')],
    explicacao: [
      md(`
        Se o array começa no endereço \`base\` e cada elemento ocupa \`t\` bytes, o elemento \`i\` está em \`base + i × t\`. Uma conta — não importa o tamanho do array. Por isso **acesso por índice é O(1)** (tempo constante).

        Mas **inserir no início** exige empurrar todos os elementos uma posição para frente: custo proporcional a *n*, ou **O(n)**.
      `),
      { type: 'table', head: ['Operação na list do Python', 'Custo', 'Por quê'], rows: [
        ['xs[i], xs[i] = v', 'O(1)', 'cálculo de endereço'],
        ['xs.append(v)', 'O(1) amortizado', 'normalmente há espaço sobrando'],
        ['xs.pop()', 'O(1)', 'remove do fim, nada se move'],
        ['xs.insert(0, v), xs.pop(0)', 'O(n)', 'todos os elementos se deslocam'],
        ['v in xs', 'O(n)', 'pode precisar olhar todos'],
      ] },
      deep('Quando a lista enche, o Python aloca um array **maior** (cerca de 1,125× + constante no CPython) e copia tudo. Copiar custa O(n), mas acontece raramente: somando todas as cópias ao longo de *n* appends, o custo total é O(n), ou seja, **O(1) amortizado** por append. Com crescimento por um fator constante, é sempre assim.', 'Como a lista cresce'),
    ],
    exemplo: [py(`
      import sys
      xs = []
      ultimo = sys.getsizeof(xs)
      for i in range(40):
          xs.append(i)
          tam = sys.getsizeof(xs)
          if tam != ultimo:
              print(f"len={len(xs):>2} -> {tam} bytes (realocou)")
              ultimo = tam
    `, { caption: 'Veja a capacidade crescer em saltos, não a cada append.' })],
    codigo: [py(`
      import time

      def medir(f, n):
          t0 = time.perf_counter(); f(n); return time.perf_counter() - t0

      def no_fim(n):
          xs = []
          for i in range(n): xs.append(i)

      def no_inicio(n):
          xs = []
          for i in range(n): xs.insert(0, i)

      for n in [2000, 4000, 8000]:
          print(n, f"fim: {medir(no_fim, n):.4f}s  início: {medir(no_inicio, n):.4f}s")
    `, { caption: 'Dobrar n quase dobra o tempo de "fim" (linear no total) e quase quadruplica o de "início" (quadrático no total).' })],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e3-arr-1',
          kind: 'mcq',
          prompt: 'Por que `xs[500000]` é tão rápido quanto `xs[0]` em uma lista com um milhão de elementos?',
          difficulty: 'facil',
          skills: ['ed-arrays'],
          hints: ['Como se calcula o endereço do elemento i?'],
          explanation: 'Com memória contígua, o endereço é base + i × tamanho: uma conta, independente de i e de n.',
          options: [
            { text: 'Porque o Python percorre a lista muito rápido', feedback: 'Não há percurso: é cálculo direto do endereço.' },
            { text: 'Porque o endereço é calculado diretamente: base + i × tamanho', correct: true, feedback: 'Isso: acesso O(1).' },
            { text: 'Porque a lista está ordenada', feedback: 'Ordenação não importa para acesso por índice.' },
            { text: 'Porque fica em cache', feedback: 'O cache ajuda, mas o motivo fundamental é o cálculo de endereço.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e3-arr-2',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `inverter_no_lugar(xs)` que inverte a lista **sem criar outra lista** (sem `[::-1]`, `reversed` ou `reverse`). Use dois índices que se aproximam.',
          difficulty: 'intermediario',
          skills: ['ed-arrays'],
          hints: ['Troque o primeiro com o último, o segundo com o penúltimo...', 'Use `i = 0`, `j = len(xs) - 1` e troque enquanto `i < j`.'],
          explanation: 'A técnica de **dois ponteiros** (*two pointers*) inverte em O(n) com O(1) de memória extra. Ela aparece em muitos problemas de entrevista.',
          starter: 'def inverter_no_lugar(xs):\n    pass\n',
          solution: dedent(`
            def inverter_no_lugar(xs):
                i, j = 0, len(xs) - 1
                while i < j:
                    xs[i], xs[j] = xs[j], xs[i]
                    i += 1
                    j -= 1
          `),
          tests: [
            { name: 'ímpar', code: 'xs = [1, 2, 3, 4, 5]\ninverter_no_lugar(xs)\nassert xs == [5, 4, 3, 2, 1]' },
            { name: 'par e vazia', code: 'xs = [1, 2]\ninverter_no_lugar(xs)\nys = []\ninverter_no_lugar(ys)\nassert xs == [2, 1] and ys == []' },
            { name: 'é no lugar (mesmo objeto)', code: 'xs = [1, 2, 3]\nident = id(xs)\ninverter_no_lugar(xs)\nassert id(xs) == ident and xs == [3, 2, 1]' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e3-arr-desafio',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `soma_alvo_ordenada(xs, alvo)` que recebe uma lista **ordenada** e devolve uma tupla `(i, j)` com `i < j` e `xs[i] + xs[j] == alvo`, ou `None`. Exija O(n): sem dois loops aninhados.',
          difficulty: 'desafio',
          skills: ['ed-arrays', 'alg-complexidade'],
          hints: ['Comece com um índice em cada ponta.', 'Se a soma for pequena demais, qual índice você move? E se for grande demais?'],
          explanation: 'Dois ponteiros: soma < alvo → avance i (aumenta a soma); soma > alvo → recue j. Cada passo descarta uma possibilidade; total O(n).',
          starter: 'def soma_alvo_ordenada(xs, alvo):\n    pass\n',
          solution: dedent(`
            def soma_alvo_ordenada(xs, alvo):
                i, j = 0, len(xs) - 1
                while i < j:
                    s = xs[i] + xs[j]
                    if s == alvo:
                        return (i, j)
                    if s < alvo:
                        i += 1
                    else:
                        j -= 1
                return None
          `),
          tests: [
            { name: 'encontra', code: 'assert soma_alvo_ordenada([1, 3, 4, 6, 9], 10) in [(0, 4), (2, 3)]' },
            { name: 'não encontra', code: 'assert soma_alvo_ordenada([1, 2, 3], 10) is None' },
            { name: 'grande (precisa ser linear)', code: 'xs = list(range(200000))\nassert soma_alvo_ordenada(xs, 399997) == (199998, 199999)' },
          ],
        },
      },
    ],
    projeto: [md('**Experimento**: implemente uma lista dinâmica (`class ListaDinamica`) com capacidade inicial 1 que **dobra** quando enche. Conte quantas cópias de elementos acontecem em 1 000 appends. Compare com uma versão que aumenta a capacidade em +1. (Você vai precisar de classes — se ainda não viu, volte depois do Nível 5.)')],
    revisao: [md('- Array: memória contígua → acesso O(1).\n- Inserir/remover no início: O(n).\n- append: O(1) amortizado por crescimento geométrico.\n- Dois ponteiros: técnica O(n) para arrays.')],
  },
  review: [
    ['Por que inserir no início de uma lista é O(n)?', 'Porque todos os elementos precisam se deslocar uma posição.'],
    ['O que significa append ser O(1) amortizado?', 'Às vezes custa O(n) (realocação), mas a média ao longo de muitas operações é constante.'],
  ],
  references: ['clrs', 'mit-6006', 'python-time-complexity'],
});

const pilhasFilas = lesson({
  id: 'l3-pilhas-filas',
  moduleId: 'm3-2',
  title: 'Pilhas e filas',
  titleEn: 'Stacks and queues',
  summary: 'LIFO e FIFO, onde aparecem (desfazer, chamadas de função, filas de impressão, BFS) e como implementar.',
  minutes: 30,
  objectives: ['Diferenciar LIFO de FIFO', 'Implementar pilha com list e fila com deque', 'Resolver problemas clássicos com pilha (parênteses balanceados)'],
  skills: ['ed-pilhas-filas'],
  terms: [
    t('pilha', 'stack', 'Estrutura LIFO: o último a entrar é o primeiro a sair.'),
    t('fila', 'queue', 'Estrutura FIFO: o primeiro a entrar é o primeiro a sair.'),
    t('empilhar / desempilhar', 'push / pop', 'Colocar e retirar do topo da pilha.'),
    t('enfileirar / desenfileirar', 'enqueue / dequeue', 'Colocar no fim e retirar do início da fila.'),
    t('topo', 'top / peek', 'O elemento que sairia primeiro.'),
    t('fila dupla', 'deque (double-ended queue)', 'Estrutura que permite inserir e remover nas duas pontas em O(1).'),
  ],
  stages: {
    conceito: [md('Uma **{{pilha|stack}}** é como uma pilha de pratos: você coloca e tira **do topo** (LIFO — *last in, first out*). Uma **{{fila|queue}}** é como a fila do banco: quem chega primeiro é atendido primeiro (FIFO — *first in, first out*).')],
    explicacao: [
      md(`
        **Onde aparecem pilhas**: Ctrl+Z (desfazer), o botão voltar do navegador, a **pilha de chamadas** de funções, avaliação de expressões, verificação de parênteses, DFS.

        **Onde aparecem filas**: fila de impressão, requisições a um servidor, mensagens entre sistemas, escalonamento de processos, BFS.

        **Em Python**:
        - Pilha: \`list\` com \`append\` (push) e \`pop\` (pop) — ambos O(1) no fim.
        - Fila: \`collections.deque\` com \`append\` e \`popleft\` — O(1). **Não** use \`list.pop(0)\`, que é O(n).
      `),
    ],
    exemplo: [{ type: 'viz', viz: 'stack-queue', caption: 'Faça push/pop na pilha e enqueue/dequeue na fila e compare a ordem de saída.' }],
    codigo: [py(`
      from collections import deque

      pilha = []
      for x in ["a", "b", "c"]:
          pilha.append(x)
      print("pilha sai:", pilha.pop(), pilha.pop(), pilha.pop())

      fila = deque()
      for x in ["a", "b", "c"]:
          fila.append(x)
      print("fila sai:", fila.popleft(), fila.popleft(), fila.popleft())
    `)],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e3-sq-1',
          kind: 'predict',
          lang: 'python',
          prompt: 'O que é impresso?',
          difficulty: 'facil',
          skills: ['ed-pilhas-filas'],
          hints: ['append coloca no topo; pop tira do topo.', 'Depois de 1, 2, 3 empilhados e um pop, quem está no topo?'],
          explanation: 'Empilha 1, 2, 3; pop tira 3; empilha 4; pilha = [1, 2, 4]; pop tira 4.',
          code: dedent(`
            s = []
            s.append(1); s.append(2); s.append(3)
            s.pop()
            s.append(4)
            print(s.pop(), s)
          `),
          answer: '4 [1, 2]',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e3-sq-2',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `balanceado(s)` que devolve True se os delimitadores `()[]{}` do texto estão balanceados e corretamente aninhados. Outros caracteres são ignorados.',
          difficulty: 'intermediario',
          skills: ['ed-pilhas-filas'],
          hints: ['Quando aparece um fechamento, ele precisa corresponder ao **último** abertura ainda não fechada. Que estrutura dá o "último"?', 'Empilhe aberturas. Num fechamento: se a pilha está vazia ou o topo não corresponde, é falso.', 'No fim, a pilha precisa estar vazia.'],
          explanation: 'A pilha guarda as aberturas pendentes; o topo é sempre a mais recente — exatamente a que deve fechar primeiro. Esse é o princípio usado por compiladores e editores.',
          starter: 'def balanceado(s):\n    pass\n',
          solution: dedent(`
            def balanceado(s):
                pares = {")": "(", "]": "[", "}": "{"}
                pilha = []
                for c in s:
                    if c in "([{":
                        pilha.append(c)
                    elif c in pares:
                        if not pilha or pilha.pop() != pares[c]:
                            return False
                return not pilha
          `),
          tests: [
            { name: 'balanceado', code: 'assert balanceado("f(x[1]) {ok}")' },
            { name: 'ordem errada', code: 'assert not balanceado("([)]")' },
            { name: 'sobra abertura', code: 'assert not balanceado("((")' },
            { name: 'fecha sem abrir', code: 'assert not balanceado(")(")' },
            { name: 'vazio', code: 'assert balanceado("")' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e3-sq-desafio',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `avaliar_rpn(expr)` que avalia uma expressão em **notação polonesa reversa** (tokens separados por espaço, operadores + - * /). Ex.: `"3 4 + 2 *"` → `14`. Use divisão real (/).',
          difficulty: 'desafio',
          skills: ['ed-pilhas-filas'],
          hints: ['Números vão para a pilha. E quando aparece um operador?', 'Operador: desempilhe b, depois a (a ordem importa para - e /), calcule a op b e empilhe o resultado.'],
          explanation: 'A RPN dispensa parênteses e é avaliada com uma pilha — a mesma ideia das máquinas virtuais baseadas em pilha (como a do Python, que você viu no `dis`).',
          starter: 'def avaliar_rpn(expr):\n    pass\n',
          solution: dedent(`
            def avaliar_rpn(expr):
                pilha = []
                ops = {"+": lambda a, b: a + b, "-": lambda a, b: a - b, "*": lambda a, b: a * b, "/": lambda a, b: a / b}
                for tok in expr.split():
                    if tok in ops:
                        b = pilha.pop()
                        a = pilha.pop()
                        pilha.append(ops[tok](a, b))
                    else:
                        pilha.append(float(tok))
                return pilha.pop()
          `),
          tests: [
            { name: '"3 4 + 2 *" == 14', code: 'assert avaliar_rpn("3 4 + 2 *") == 14' },
            { name: 'ordem dos operandos', code: 'assert avaliar_rpn("10 2 -") == 8 and avaliar_rpn("8 2 /") == 4' },
            { name: 'composta', code: 'assert avaliar_rpn("5 1 2 + 4 * + 3 -") == 14' },
          ],
        },
      },
    ],
    projeto: [md('**Mini-projeto: editor com desfazer/refazer**. Implemente um editor de texto de linha única com comandos `escrever <texto>`, `desfazer`, `refazer`, usando **duas pilhas**. Pense: quando o usuário escreve algo novo depois de desfazer, o que acontece com a pilha de refazer?')],
    revisao: [md('- Pilha: LIFO, push/pop no topo (list).\n- Fila: FIFO, append/popleft (deque).\n- Pilha resolve aninhamento (parênteses, chamadas); fila resolve ordem de chegada (BFS, servidores).')],
  },
  review: [
    ['LIFO ou FIFO: pilha?', 'LIFO (last in, first out).'],
    ['Por que não usar list.pop(0) como fila?', 'Porque é O(n): desloca todos os elementos. Use deque.popleft(), que é O(1).'],
    ['Que estrutura verifica parênteses balanceados?', 'Uma pilha.'],
  ],
  references: ['clrs', 'sedgewick-algs', 'python-docs'],
});

const hash = lesson({
  id: 'l3-hash',
  moduleId: 'm3-3',
  title: 'Tabelas hash',
  titleEn: 'Hash tables',
  summary: 'Como dict e set conseguem buscar em tempo constante: funções hash, buckets e colisões.',
  minutes: 30,
  objectives: ['Explicar como uma função hash mapeia chaves em posições', 'Entender colisões e como são tratadas', 'Saber por que chaves precisam ser imutáveis', 'Escolher entre lista, set e dict'],
  skills: ['ed-hash'],
  terms: [
    t('tabela hash / tabela de dispersão', 'hash table / hash map', 'Estrutura que usa uma função hash para localizar chaves rapidamente.'),
    t('função hash', 'hash function', 'Função que transforma uma chave em um número.'),
    t('colisão', 'collision', 'Quando duas chaves diferentes caem na mesma posição.'),
    t('balde', 'bucket', 'Posição da tabela onde ficam os itens.'),
    t('fator de carga', 'load factor', 'Quantidade de itens dividida pelo número de posições.'),
    t('hashável', 'hashable', 'Objeto que pode ser usado como chave (imutável).', "TypeError: unhashable type: 'list'"),
  ],
  stages: {
    conceito: [md('Uma **{{tabela hash|hash table}}** guarda pares chave → valor em um array. Para saber **onde** colocar uma chave, calcula-se `hash(chave) % tamanho`. Para buscar, faz-se a mesma conta e vai-se direto à posição: em média **O(1)**, sem percorrer nada. É assim que `dict` e `set` funcionam.')],
    explicacao: [
      md(`
        1. **Função hash**: transforma a chave em um inteiro. Deve ser **determinística** (mesma chave → mesmo número) e **espalhar bem** as chaves.
        2. **Índice**: \`hash(chave) % m\`, onde *m* é o número de posições (*buckets*).
        3. **Colisões**: duas chaves podem cair no mesmo índice. Soluções: **encadeamento** (*chaining* — cada posição tem uma lista) ou **endereçamento aberto** (*open addressing* — procura a próxima posição livre; é o que o CPython usa).
        4. **Redimensionamento**: quando o **fator de carga** fica alto, a tabela cresce e todas as chaves são reinseridas — custo amortizado O(1), como na lista dinâmica.

        **Por que chaves imutáveis?** Se uma lista mudasse depois de inserida, seu hash mudaria e ela ficaria "perdida" na posição antiga. Por isso \`{[1, 2]: "x"}\` dá \`TypeError: unhashable type: 'list'\`; use uma tupla.
      `),
      warn('O(1) é o caso **médio**. Com uma função hash ruim (ou um atacante que força colisões), tudo cai na mesma posição e a busca vira O(n). Por isso o Python randomiza o hash de strings a cada execução (*hash randomization*).'),
    ],
    exemplo: [{ type: 'viz', viz: 'hash-table', caption: 'Insira chaves e veja em que bucket cada uma cai e como as colisões formam listas (chaining).' }],
    codigo: [py(`
      print(hash(42), hash("ana") % 8, hash((1, 2)) % 8)

      # comparando a busca em list e set
      import time
      n = 200_000
      lista = list(range(n))
      conjunto = set(lista)
      t0 = time.perf_counter(); (n - 1) in lista; t1 = time.perf_counter()
      (n - 1) in conjunto; t2 = time.perf_counter()
      print(f"list: {t1 - t0:.6f}s   set: {t2 - t1:.6f}s")
    `)],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e3-hash-1',
          kind: 'mcq',
          prompt: 'Você precisa verificar milhões de vezes se um CPF já está cadastrado. Qual estrutura usar?',
          difficulty: 'facil',
          skills: ['ed-hash'],
          hints: ['Qual é o custo de `x in estrutura` em cada caso?'],
          explanation: 'Em set, `in` custa O(1) em média; em list, O(n). Para milhões de buscas, a diferença é enorme.',
          options: [
            { text: 'Uma lista ordenada de CPFs', feedback: 'Busca binária seria O(log n) — bom, mas manter a ordem ao inserir é O(n).' },
            { text: 'Um set de CPFs', correct: true, feedback: 'Isso: pertencimento O(1) em média.' },
            { text: 'Uma lista comum', feedback: '`in` em lista é O(n) a cada busca.' },
            { text: 'Uma string com todos os CPFs concatenados', feedback: 'Buscar substring também é linear — e propenso a falsos positivos.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e3-hash-2',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `dois_somam(xs, alvo)` que devolve True se existem **dois elementos em posições diferentes** cuja soma é `alvo`. A lista **não** está ordenada. Exija O(n) usando um set.',
          difficulty: 'intermediario',
          skills: ['ed-hash'],
          hints: ['Para cada x, que número você precisaria ter visto antes?', 'Guarde num set os números já vistos e pergunte se `alvo - x` está lá.'],
          explanation: 'Este é o famoso *Two Sum*. Trocar o loop interno por uma consulta O(1) a um set reduz O(n²) para O(n) — trocar memória por tempo.',
          starter: 'def dois_somam(xs, alvo):\n    for i in range(len(xs)):\n        for j in range(i + 1, len(xs)):\n            if xs[i] + xs[j] == alvo:\n                return True\n    return False\n',
          solution: dedent(`
            def dois_somam(xs, alvo):
                vistos = set()
                for x in xs:
                    if alvo - x in vistos:
                        return True
                    vistos.add(x)
                return False
          `),
          tests: [
            { name: 'encontra', code: 'assert dois_somam([8, 3, 5, 1], 9)' },
            { name: 'não usa o mesmo elemento duas vezes', code: 'assert not dois_somam([5], 10) and dois_somam([5, 5], 10)' },
            { name: 'eficiente', code: 'import time\nxs = list(range(0, 400000, 2))\nt0 = time.perf_counter()\nr = dois_somam(xs, -1)\nassert r is False and time.perf_counter() - t0 < 1.5, "muito lento: use um set"' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e3-hash-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Implemente sua própria tabela hash com **encadeamento**: \`class TabelaHash\` com \`__init__(self, m=8)\`, \`put(chave, valor)\`,
            \`get(chave)\` (lança \`KeyError\` se não existir) e \`__len__\`. Quando \`len / m > 0.75\`, dobre \`m\` e reinsira tudo.
            Não use dict nem set internamente.
          `),
          difficulty: 'desafio',
          skills: ['ed-hash'],
          hints: ['Represente os buckets como uma lista de listas de pares `[chave, valor]`.', 'put: calcule o índice, procure a chave no bucket; se achar, atualize; senão, acrescente e verifique o fator de carga.', 'Para redimensionar, guarde os pares antigos, recrie os buckets com o dobro e reinsira.'],
          explanation: 'Implementar a estrutura por dentro consolida as ideias: índice = hash % m, colisões em listas, redimensionamento para manter o fator de carga baixo.',
          starter: 'class TabelaHash:\n    def __init__(self, m=8):\n        pass\n',
          solution: dedent(`
            class TabelaHash:
                def __init__(self, m=8):
                    self.m = m
                    self.n = 0
                    self.buckets = [[] for _ in range(m)]

                def _idx(self, chave):
                    return hash(chave) % self.m

                def put(self, chave, valor):
                    b = self.buckets[self._idx(chave)]
                    for par in b:
                        if par[0] == chave:
                            par[1] = valor
                            return
                    b.append([chave, valor])
                    self.n += 1
                    if self.n / self.m > 0.75:
                        self._crescer()

                def _crescer(self):
                    pares = [p for b in self.buckets for p in b]
                    self.m *= 2
                    self.buckets = [[] for _ in range(self.m)]
                    self.n = 0
                    for k, v in pares:
                        self.put(k, v)

                def get(self, chave):
                    for k, v in self.buckets[self._idx(chave)]:
                        if k == chave:
                            return v
                    raise KeyError(chave)

                def __len__(self):
                    return self.n
          `),
          tests: [
            { name: 'put/get', code: 't = TabelaHash()\nt.put("a", 1); t.put("b", 2); t.put("a", 3)\nassert t.get("a") == 3 and t.get("b") == 2 and len(t) == 2' },
            { name: 'KeyError', code: 't = TabelaHash()\ntry:\n    t.get("x")\n    assert False, "deveria lançar KeyError"\nexcept KeyError:\n    pass' },
            { name: 'redimensiona', code: 't = TabelaHash(4)\nfor i in range(100):\n    t.put(i, i * i)\nassert len(t) == 100 and t.get(77) == 5929 and t.m >= 128' },
          ],
        },
      },
    ],
    projeto: [md('**Projeto 3 — Sistema de cadastro** (começa aqui): um cadastro de alunos em memória, com busca por matrícula em O(1) (dict), busca por nome e relatórios. Ele vai ganhar arquivos, testes e, mais adiante, um banco de dados.'), { type: 'project', projectId: 'p3-cadastro' }],
    revisao: [md('- hash(chave) % m → posição.\n- Colisões: encadeamento ou endereçamento aberto.\n- O(1) em média; O(n) no pior caso.\n- Chaves precisam ser imutáveis (hashable).')],
  },
  review: [
    ['Como uma tabela hash encontra a posição de uma chave?', 'Calcula hash(chave) % número_de_buckets.'],
    ['O que é uma colisão?', 'Duas chaves diferentes mapeadas para a mesma posição.'],
    ['Por que uma lista não pode ser chave de dict?', 'Porque é mutável: seu hash poderia mudar depois de inserida.'],
  ],
  references: ['clrs', 'mit-6006', 'python-docs'],
});

const arvores = lesson({
  id: 'l3-arvores',
  moduleId: 'm3-4',
  title: 'Árvores e árvores binárias de busca',
  titleEn: 'Trees and binary search trees',
  summary: 'Estruturas hierárquicas, percursos e a BST, que busca em O(log n) quando balanceada.',
  minutes: 35,
  objectives: ['Usar o vocabulário de árvores (raiz, folha, altura)', 'Implementar inserção e busca em BST', 'Fazer percursos em ordem, pré e pós-ordem', 'Entender por que o balanceamento importa'],
  skills: ['ed-arvores'],
  terms: [
    t('árvore', 'tree', 'Estrutura hierárquica de nós ligados, sem ciclos.'),
    t('nó', 'node', 'Cada elemento da árvore.'),
    t('raiz', 'root', 'O nó do topo, sem pai.'),
    t('folha', 'leaf', 'Nó sem filhos.'),
    t('altura', 'height', 'Maior número de arestas da raiz até uma folha.'),
    t('árvore binária de busca', 'binary search tree (BST)', 'Árvore em que, para cada nó, à esquerda ficam menores e à direita maiores.'),
    t('percurso', 'traversal', 'Forma de visitar todos os nós.'),
  ],
  stages: {
    conceito: [md('Uma **{{árvore|tree}}** organiza dados de forma **hierárquica**: pastas do computador, o DOM de uma página HTML, a estrutura de um JSON, um organograma. Cada **{{nó|node}}** tem filhos; o do topo é a **{{raiz|root}}**; os sem filhos são **{{folhas|leaves}}**.')],
    explicacao: [
      md(`
        Em uma **{{árvore binária de busca|binary search tree}}** (BST), cada nó tem no máximo dois filhos e vale a regra: **tudo à esquerda é menor, tudo à direita é maior**. Para buscar, você compara com o nó e desce para um lado — descartando metade da árvore a cada passo (se ela estiver balanceada).

        - Busca/inserção: **O(h)**, onde *h* é a altura. Balanceada: h ≈ log₂ n. Degenerada (inserir já ordenado!): h = n.
        - **Percursos**: em ordem (*in-order*: esquerda, nó, direita — em uma BST, sai **ordenado**), pré-ordem (nó primeiro) e pós-ordem (nó por último).

        Árvores **auto-balanceáveis** (AVL, rubro-negra) mantêm h ≈ log n automaticamente; bancos de dados usam **B-trees** para índices (Nível 7).
      `),
      info('Árvores são definidas **recursivamente**: uma árvore é um nó com subárvores. Por isso quase todo algoritmo de árvore é recursivo. Se recursão ainda for nova, faça a lição de recursão (Nível 4) — ela é pré-requisito deste módulo.'),
    ],
    exemplo: [{ type: 'viz', viz: 'tree', caption: 'Insira números e veja a BST se formar. Tente inserir 1, 2, 3, 4, 5 em ordem: a árvore vira uma "lista".' }],
    codigo: [trace(`
      class No:
          def __init__(self, valor):
              self.valor = valor
              self.esq = None
              self.dir = None

      def inserir(raiz, v):
          if raiz is None:
              return No(v)
          if v < raiz.valor:
              raiz.esq = inserir(raiz.esq, v)
          else:
              raiz.dir = inserir(raiz.dir, v)
          return raiz

      def em_ordem(raiz):
          if raiz is None:
              return []
          return em_ordem(raiz.esq) + [raiz.valor] + em_ordem(raiz.dir)

      r = None
      for v in [5, 3, 8, 1]:
          r = inserir(r, v)
      print(em_ordem(r))
    `)],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e3-tree-0',
          kind: 'mcq',
          prompt: "Em uma árvore binária de busca (BST), onde ficam os valores **menores** que a raiz?",
          difficulty: 'facil',
          skills: ["ed-arvores"],
          hints: ["Lembre a regra que dá nome à árvore \"de busca\"."],
          explanation: "Na BST, toda a subárvore esquerda tem valores menores que o nó e toda a direita, maiores. É isso que permite descartar metade a cada passo (quando ela está balanceada).",
          options: [
            { text: "Na subárvore esquerda", correct: true, feedback: "Isso: esquerda < nó < direita." },
            { text: "Na subárvore direita", feedback: "À direita ficam os maiores." },
            { text: "Em qualquer lugar", feedback: "Sem regra de posição, não seria possível buscar rápido." },
            { text: "Sempre nas folhas", feedback: "Valores menores podem estar em nós internos também." },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e3-tree-1',
          kind: 'mcq',
          prompt: 'Inserindo 10, 20, 30, 40, 50 (nessa ordem) em uma BST simples, qual a altura resultante?',
          difficulty: 'intermediario',
          skills: ['ed-arvores'],
          hints: ['Cada novo valor é maior que todos os anteriores. Para que lado ele vai?'],
          explanation: 'Cada valor vai sempre para a direita: a árvore vira uma cadeia de 5 nós, altura 4 — a busca degenera para O(n). Por isso existem árvores balanceadas.',
          options: [
            { text: '2 (balanceada)', feedback: 'Seria o ideal, mas BST simples não se balanceia sozinha.' },
            { text: '4 (uma "lista" para a direita)', correct: true, feedback: 'Isso: inserção ordenada degenera a BST.' },
            { text: '5', feedback: 'Altura conta arestas: 5 nós em cadeia têm altura 4.' },
            { text: '1', feedback: 'Cada nó tem só um filho, à direita.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e3-tree-2',
          kind: 'code',
          lang: 'python',
          prompt: 'Usando a classe `No` (já definida no código inicial), escreva `altura(raiz)` (árvore vazia tem altura -1; um nó só, 0) e `contem(raiz, v)` para BST.',
          difficulty: 'intermediario',
          skills: ['ed-arvores', 'alg-recursao'],
          hints: ['Altura de um nó = 1 + a maior altura entre as duas subárvores.', '`contem`: compare v com o valor do nó e desça só para um lado.'],
          explanation: 'Os dois são recursivos: caso base (None) + combinação dos resultados dos filhos. `contem` aproveita a propriedade da BST para descer por um único caminho: O(h).',
          starter: dedent(`
            class No:
                def __init__(self, valor, esq=None, dir=None):
                    self.valor, self.esq, self.dir = valor, esq, dir

            def altura(raiz):
                pass

            def contem(raiz, v):
                pass
          `),
          solution: dedent(`
            class No:
                def __init__(self, valor, esq=None, dir=None):
                    self.valor, self.esq, self.dir = valor, esq, dir

            def altura(raiz):
                if raiz is None:
                    return -1
                return 1 + max(altura(raiz.esq), altura(raiz.dir))

            def contem(raiz, v):
                while raiz is not None:
                    if v == raiz.valor:
                        return True
                    raiz = raiz.esq if v < raiz.valor else raiz.dir
                return False
          `),
          tests: [
            { name: 'altura', code: 'r = No(5, No(3, No(1)), No(8))\nassert altura(None) == -1 and altura(No(1)) == 0 and altura(r) == 2' },
            { name: 'contem', code: 'r = No(5, No(3, No(1)), No(8))\nassert contem(r, 1) and contem(r, 8) and not contem(r, 4)' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e3-tree-desafio',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `eh_bst(raiz)` que verifica se uma árvore binária é uma BST **válida** (valores distintos). Cuidado: comparar cada nó só com os filhos diretos **não** basta.',
          difficulty: 'desafio',
          skills: ['ed-arvores', 'alg-recursao'],
          hints: ['Na árvore 5 → esq 3 → dir 7, cada nó respeita os filhos, mas 7 está à esquerda de 5!', 'Passe para baixo o **intervalo** permitido (mínimo, máximo) de cada subárvore.'],
          explanation: 'Cada nó precisa estar dentro de um intervalo herdado dos ancestrais. Alternativa: o percurso em ordem deve ser estritamente crescente.',
          starter: dedent(`
            class No:
                def __init__(self, valor, esq=None, dir=None):
                    self.valor, self.esq, self.dir = valor, esq, dir

            def eh_bst(raiz):
                pass
          `),
          solution: dedent(`
            class No:
                def __init__(self, valor, esq=None, dir=None):
                    self.valor, self.esq, self.dir = valor, esq, dir

            def eh_bst(raiz, lo=float("-inf"), hi=float("inf")):
                if raiz is None:
                    return True
                if not (lo < raiz.valor < hi):
                    return False
                return eh_bst(raiz.esq, lo, raiz.valor) and eh_bst(raiz.dir, raiz.valor, hi)
          `),
          tests: [
            { name: 'válida', code: 'assert eh_bst(No(5, No(3, No(1), No(4)), No(8)))' },
            { name: 'armadilha do neto', code: 'assert not eh_bst(No(5, No(3, None, No(7)), No(8)))' },
            { name: 'vazia', code: 'assert eh_bst(None)' },
          ],
        },
      },
    ],
    projeto: [md('**Mini-projeto: explorador de pastas**. Usando `pathlib`, monte uma árvore da pasta atual e imprima no estilo do comando `tree`, com indentação. Calcule o tamanho total de cada pasta com um percurso **pós-ordem** (filhos antes do pai).')],
    revisao: [md('- Árvore: hierarquia sem ciclos; raiz, filhos, folhas, altura.\n- BST: esquerda < nó < direita; busca O(h).\n- Em ordem numa BST = ordenado.\n- Balanceamento mantém h ≈ log n.')],
  },
  review: [
    ['Qual percurso de uma BST produz os valores em ordem crescente?', 'O percurso em ordem (in-order): esquerda, nó, direita.'],
    ['Quando uma BST simples degenera?', 'Quando os valores são inseridos já ordenados: vira uma cadeia e a busca fica O(n).'],
  ],
  references: ['clrs', 'sedgewick-algs', 'mit-6006'],
});

const grafos = lesson({
  id: 'l3-grafos',
  moduleId: 'm3-5',
  title: 'Grafos e busca em largura',
  titleEn: 'Graphs and breadth-first search',
  summary: 'Vértices e arestas, listas de adjacência, BFS e DFS.',
  minutes: 35,
  objectives: ['Modelar problemas como grafos', 'Representar grafos com lista de adjacência', 'Implementar BFS e DFS', 'Encontrar o menor caminho em grafos sem peso'],
  skills: ['ed-grafos'],
  terms: [
    t('grafo', 'graph', 'Conjunto de vértices ligados por arestas.'),
    t('vértice', 'vertex / node', 'Um elemento do grafo (uma pessoa, uma cidade, uma página).'),
    t('aresta', 'edge', 'Uma ligação entre dois vértices.'),
    t('lista de adjacência', 'adjacency list', 'Para cada vértice, a lista dos vizinhos.'),
    t('busca em largura', 'breadth-first search (BFS)', 'Explora por camadas, usando uma fila.'),
    t('busca em profundidade', 'depth-first search (DFS)', 'Explora um caminho até o fim antes de voltar, usando pilha ou recursão.'),
    t('direcionado', 'directed', 'Arestas com sentido (seguir no Instagram).'),
  ],
  stages: {
    conceito: [md('Um **{{grafo|graph}}** é um conjunto de **{{vértices|vertices}}** ligados por **{{arestas|edges}}**. Redes sociais, mapas, links da web, dependências de pacotes, a própria árvore de conhecimento do Alicerce — tudo isso são grafos. Árvores são um caso particular de grafo.')],
    explicacao: [
      md(`
        **Representação**: a mais comum é a **{{lista de adjacência|adjacency list}}**, um dict de vértice → vizinhos:

        \`\`\`
        g = {"A": ["B", "C"], "B": ["D"], "C": ["D"], "D": []}
        \`\`\`

        **BFS** (*breadth-first search*): começa na origem e visita os vizinhos, depois os vizinhos dos vizinhos — **por camadas**, usando uma **fila**. Em grafos sem peso, a BFS encontra o **menor caminho** (em número de arestas).

        **DFS** (*depth-first search*): vai fundo por um caminho antes de voltar, usando uma **pilha** (ou recursão). Útil para detectar ciclos, ordenação topológica, componentes conectados.

        Os dois visitam cada vértice e aresta uma vez: **O(V + E)**. O detalhe essencial: marcar **visitados** para não andar em círculos.
      `),
    ],
    exemplo: [{ type: 'viz', viz: 'graph-bfs', caption: 'Execute a BFS passo a passo: observe a fila e as camadas de distância.' }],
    codigo: [py(`
      from collections import deque

      def bfs_distancias(g, origem):
          dist = {origem: 0}
          fila = deque([origem])
          while fila:
              v = fila.popleft()
              for w in g[v]:
                  if w not in dist:          # visitado?
                      dist[w] = dist[v] + 1
                      fila.append(w)
          return dist

      amigos = {"Ana": ["Bia", "Caio"], "Bia": ["Ana", "Davi"], "Caio": ["Ana", "Davi"], "Davi": ["Bia", "Caio", "Eva"], "Eva": ["Davi"]}
      print(bfs_distancias(amigos, "Ana"))
    `)],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e3-graph-1',
          kind: 'mcq',
          prompt: 'Você quer o **menor número de conexões** entre duas pessoas em uma rede social. Qual algoritmo usar?',
          difficulty: 'facil',
          skills: ['ed-grafos'],
          hints: ['Qual busca explora por camadas de distância?'],
          explanation: 'BFS visita vértices em ordem crescente de distância; a primeira vez que alcança o destino é pelo menor caminho (grafo sem pesos).',
          options: [
            { text: 'DFS', feedback: 'DFS pode achar um caminho longo primeiro.' },
            { text: 'BFS', correct: true, feedback: 'Isso: por camadas, garante o menor caminho sem pesos.' },
            { text: 'Ordenação', feedback: 'Ordenar não resolve caminhos.' },
            { text: 'Busca binária', feedback: 'Busca binária é para dados ordenados, não grafos.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e3-graph-2',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `alcancaveis(g, origem)` que devolve o **conjunto** de vértices alcançáveis a partir da origem (incluindo ela), usando DFS com uma pilha explícita.',
          difficulty: 'intermediario',
          skills: ['ed-grafos'],
          hints: ['Comece com pilha = [origem] e um set de visitados.', 'Enquanto a pilha não estiver vazia: pop; se não visitado, marque e empilhe os vizinhos.'],
          explanation: 'Trocar a fila da BFS por uma pilha transforma a busca em DFS. O set de visitados evita loops em grafos com ciclos.',
          starter: 'def alcancaveis(g, origem):\n    pass\n',
          solution: dedent(`
            def alcancaveis(g, origem):
                visitados = set()
                pilha = [origem]
                while pilha:
                    v = pilha.pop()
                    if v in visitados:
                        continue
                    visitados.add(v)
                    pilha.extend(g.get(v, []))
                return visitados
          `),
          tests: [
            { name: 'grafo com ciclo', code: 'g = {1: [2], 2: [3], 3: [1], 4: [1]}\nassert alcancaveis(g, 1) == {1, 2, 3}' },
            { name: 'isolado', code: 'assert alcancaveis({1: []}, 1) == {1}' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e3-graph-desafio',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `menor_caminho(g, a, b)` que devolve a **lista de vértices** do menor caminho de a até b (grafo sem pesos), ou `None` se não houver. Dica: BFS guardando de onde veio cada vértice.',
          difficulty: 'desafio',
          skills: ['ed-grafos'],
          hints: ['Na BFS, quando descobrir w a partir de v, guarde `pai[w] = v`.', 'Ao chegar em b, reconstrua o caminho seguindo `pai` de trás para frente e inverta.'],
          explanation: 'Guardar o predecessor de cada vértice permite reconstruir o caminho. É a mesma ideia usada em GPS (com Dijkstra, quando há pesos — Nível 4).',
          starter: 'from collections import deque\n\ndef menor_caminho(g, a, b):\n    pass\n',
          solution: dedent(`
            from collections import deque

            def menor_caminho(g, a, b):
                pai = {a: None}
                fila = deque([a])
                while fila:
                    v = fila.popleft()
                    if v == b:
                        caminho = []
                        while v is not None:
                            caminho.append(v)
                            v = pai[v]
                        return caminho[::-1]
                    for w in g.get(v, []):
                        if w not in pai:
                            pai[w] = v
                            fila.append(w)
                return None
          `),
          tests: [
            { name: 'menor caminho', code: 'g = {"A": ["B", "C"], "B": ["D"], "C": ["D", "E"], "D": ["E"], "E": []}\nassert menor_caminho(g, "A", "E") == ["A", "C", "E"]' },
            { name: 'sem caminho', code: 'assert menor_caminho({"A": [], "B": []}, "A", "B") is None' },
            { name: 'origem = destino', code: 'assert menor_caminho({"A": []}, "A", "A") == ["A"]' },
          ],
        },
      },
    ],
    projeto: [md('**Mini-projeto: graus de separação**. Monte um grafo de "quem segue quem" a partir de um arquivo CSV (`origem,destino`) e responda: qual o menor caminho entre duas pessoas? Quem tem mais seguidores? Existe alguém inalcançável?')],
    revisao: [md('- Grafo: vértices + arestas; árvores são casos particulares.\n- Lista de adjacência: dict de vizinhos.\n- BFS (fila, camadas, menor caminho sem pesos); DFS (pilha/recursão).\n- Sempre marque visitados. Custo O(V + E).')],
  },
  review: [
    ['Que estrutura a BFS usa? E a DFS?', 'BFS usa fila; DFS usa pilha (ou recursão).'],
    ['Qual o custo de BFS/DFS com lista de adjacência?', 'O(V + E).'],
    ['Por que marcar vértices visitados?', 'Para não visitar de novo e não entrar em loop em grafos com ciclos.'],
  ],
  references: ['clrs', 'sedgewick-algs', 'mit-6006', 'stanford-cs161'],
});

export const level3: Level = {
  id: 'n3',
  number: 3,
  title: 'Estruturas de Dados',
  titleEn: 'Data Structures',
  goal: 'Escolher e implementar a estrutura certa para cada problema, sabendo o custo de cada operação.',
  why: 'Programas eficientes começam pela forma como os dados estão organizados. Este nível transforma "funciona" em "funciona bem com milhões de dados" — e é o tema central de entrevistas técnicas.',
  modules: [
    {
      id: 'm3-1', levelId: 'n3', title: 'Arrays e listas', titleEn: 'Arrays and lists',
      description: 'Memória contígua, custos de operações e listas dinâmicas.',
      prerequisites: ['m2-2'],
      skills: [{ id: 'ed-arrays', pt: 'Arrays e listas dinâmicas', en: 'Arrays and dynamic arrays' }],
      outline: ['Memória contígua', 'Custos de operações', 'Crescimento amortizado', 'Dois ponteiros'],
      lessons: [arrays, ...m3_1],
      references: ['clrs', 'mit-6006'],
    },
    {
      id: 'm3-2', levelId: 'n3', title: 'Pilhas e filas', titleEn: 'Stacks and queues',
      description: 'LIFO, FIFO, deque e problemas clássicos.',
      prerequisites: ['m3-1'],
      skills: [{ id: 'ed-pilhas-filas', pt: 'Pilhas e filas', en: 'Stacks and queues' }],
      outline: ['LIFO e FIFO', 'list como pilha, deque como fila', 'Parênteses balanceados', 'Notação polonesa reversa', 'Filas de prioridade (introdução)'],
      lessons: [pilhasFilas, ...m3_2],
      references: ['clrs', 'sedgewick-algs'],
    },
    {
      id: 'm3-3', levelId: 'n3', title: 'Tabelas hash e conjuntos', titleEn: 'Hash tables and sets',
      description: 'Como dict e set alcançam O(1) em média.',
      prerequisites: ['m3-1'],
      skills: [{ id: 'ed-hash', pt: 'Tabelas hash', en: 'Hash tables' }],
      outline: ['Funções hash', 'Colisões', 'Fator de carga e redimensionamento', 'Two Sum', 'Imutabilidade das chaves'],
      lessons: [hash, ...m3_3],
      references: ['clrs', 'mit-6006'],
    },
    {
      id: 'm3-4', levelId: 'n3', title: 'Árvores e heaps', titleEn: 'Trees and heaps',
      description: 'Árvores, BST, percursos, balanceamento e heaps.',
      prerequisites: ['m3-2', 'm4-4'],
      skills: [{ id: 'ed-arvores', pt: 'Árvores', en: 'Trees' }],
      outline: ['Vocabulário de árvores', 'BST: busca e inserção', 'Percursos', 'Balanceamento (AVL, rubro-negra)', 'Heaps e filas de prioridade (heapq)', 'Tries'],
      lessons: [arvores, ...m3_4],
      references: ['clrs', 'sedgewick-algs'],
    },
    {
      id: 'm3-5', levelId: 'n3', title: 'Grafos', titleEn: 'Graphs',
      description: 'Modelagem, representação, BFS e DFS.',
      prerequisites: ['m3-4'],
      skills: [{ id: 'ed-grafos', pt: 'Grafos', en: 'Graphs' }],
      outline: ['Vértices e arestas', 'Lista × matriz de adjacência', 'BFS e menor caminho', 'DFS', 'Union-Find (estruturas avançadas)'],
      lessons: [grafos, ...m3_5],
      references: ['clrs', 'stanford-cs161'],
    },
  ],
};

