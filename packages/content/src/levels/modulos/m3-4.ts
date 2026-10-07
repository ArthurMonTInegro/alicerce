/** Lições adicionais do módulo m3-4 (árvores e heaps). */
import type { Lesson } from '../../types.ts';
import { dedent, deep, english, lesson, md, py, t, warn } from '../../helpers.ts';

/* ------------------------------------------------------------------ */
/* Código compartilhado                                               */
/* ------------------------------------------------------------------ */

/** AVL com inserção: aparece na etapa Código e como base do desafio de remoção. */
const AVL_BASE = dedent(`
  class No:
      def __init__(self, valor):
          self.valor = valor
          self.esq = None
          self.dir = None
          self.altura = 0                      # folha: altura 0

  def h(no):
      return no.altura if no else -1          # árvore vazia: -1

  def atualizar(no):
      no.altura = 1 + max(h(no.esq), h(no.dir))

  def fb(no):                                  # fator de balanceamento
      return h(no.esq) - h(no.dir)

  def girar_direita(y):
      x = y.esq
      y.esq = x.dir                            # a subárvore B muda de dono
      x.dir = y
      atualizar(y)                             # y ficou embaixo: atualize-o primeiro
      atualizar(x)
      return x                                 # x é a nova raiz da subárvore

  def girar_esquerda(x):                       # o espelho da anterior
      y = x.dir
      x.dir = y.esq
      y.esq = x
      atualizar(x)
      atualizar(y)
      return y

  def rebalancear(no):
      atualizar(no)
      if fb(no) > 1:                           # pesado à esquerda
          if fb(no.esq) < 0:                   # zigue-zague (LR): endireita primeiro
              no.esq = girar_esquerda(no.esq)
          return girar_direita(no)             # linha reta (LL)
      if fb(no) < -1:                          # pesado à direita
          if fb(no.dir) > 0:                   # zigue-zague (RL)
              no.dir = girar_direita(no.dir)
          return girar_esquerda(no)            # linha reta (RR)
      return no

  def inserir(no, v):
      if no is None:
          return No(v)
      if v < no.valor:
          no.esq = inserir(no.esq, v)
      elif v > no.valor:
          no.dir = inserir(no.dir, v)
      else:
          return no                            # valor repetido: nada muda
      return rebalancear(no)                   # conserta na volta da recursão
`);

/** Confere, nos testes do desafio, a regra da BST, o balanceamento e as alturas guardadas. */
const CONFERIR_AVL = dedent(`
  def _conferir(no, lo=float("-inf"), hi=float("inf")):
      if no is None:
          return -1
      assert lo < no.valor < hi, f"a regra da BST foi violada no nó {no.valor}"
      he = _conferir(no.esq, lo, no.valor)
      hd = _conferir(no.dir, no.valor, hi)
      assert abs(he - hd) <= 1, f"o nó {no.valor} ficou desbalanceado: alturas {he} (esq.) e {hd} (dir.). Você chamou rebalancear na volta?"
      assert no.altura == 1 + max(he, hd), f"a altura guardada no nó {no.valor} é {no.altura}, mas deveria ser {1 + max(he, hd)}"
      return no.altura

  def _valores(no):
      return [] if no is None else _valores(no.esq) + [no.valor] + _valores(no.dir)

  def _montar(vs):
      r = None
      for v in vs:
          r = inserir(r, v)
      return r
`);

const HEAP_OK = dedent(`
  def _heap_ok(h):
      return all(h[(i - 1) // 2] <= h[i] for i in range(1, len(h)))
`);

const SUBIR_DESCER = dedent(`
  def subir(h, i):
      while i > 0:
          pai = (i - 1) // 2
          if h[i] >= h[pai]:
              break
          h[i], h[pai] = h[pai], h[i]
          i = pai

  def descer(h, i):
      n = len(h)
      while True:
          menor = i
          for f in (2 * i + 1, 2 * i + 2):
              if f < n and h[f] < h[menor]:
                  menor = f
          if menor == i:
              return
          h[i], h[menor] = h[menor], h[i]
          i = menor
`);

/* ------------------------------------------------------------------ */
/* Lição 2 do módulo: árvores balanceadas (AVL e rubro-negra)         */
/* ------------------------------------------------------------------ */

const balanceadas = lesson({
  id: 'l3-arvores-balanceadas',
  moduleId: 'm3-4',
  title: 'Árvores balanceadas: rotações e AVL',
  titleEn: 'Balanced trees: rotations and AVL trees',
  summary: 'Como uma BST mantém altura O(log n) em qualquer ordem de chegada: rotações, a regra da AVL, os quatro casos de desequilíbrio, a remoção e uma visão da rubro-negra.',
  minutes: 50,
  objectives: [
    'Explicar por que uma rotação muda a altura sem quebrar a ordem da BST',
    'Calcular fatores de balanceamento e reconhecer os casos LL, RR, LR e RL',
    'Justificar por que a altura de uma AVL é O(log n), usando a recorrência do menor número de nós',
    'Remover de uma BST (folha, um filho, dois filhos) e rebalancear na volta',
    'Comparar AVL e rubro-negra e saber onde cada uma aparece na prática',
  ],
  skills: ['ed-arvores'],
  terms: [
    t('árvore balanceada', 'balanced tree', 'Árvore cuja altura se mantém O(log n), qualquer que seja a ordem das inserções e remoções.', 'Balanced search trees guarantee logarithmic height.'),
    t('autobalanceável', 'self-balancing', 'Que se reorganiza sozinha, a cada inserção ou remoção, para continuar balanceada.', 'A self-balancing binary search tree keeps its height small automatically.'),
    t('rotação', 'rotation', 'Troca local entre um nó e um filho que muda as profundidades e preserva o percurso em ordem; custa O(1).', 'A right rotation at y makes its left child x the new root of the subtree.'),
    t('fator de balanceamento', 'balance factor', 'Altura da subárvore esquerda menos a altura da direita; numa AVL fica entre −1 e +1 em todo nó.'),
    t('árvore AVL', 'AVL tree', 'BST em que, em todo nó, as alturas das duas subárvores diferem no máximo em 1. O nome vem de Adelson-Velsky e Landis (1962).'),
    t('invariante', 'invariant', 'Propriedade que a estrutura garante antes e depois de toda operação.', 'Every operation must restore the AVL invariant before returning.'),
    t('rotação dupla', 'double rotation', 'Duas rotações seguidas, primeiro no filho e depois no nó, que corrigem os casos em zigue-zague (LR e RL).'),
    t('sucessor', 'in-order successor', 'O próximo valor no percurso em ordem; numa BST, o menor valor da subárvore direita.'),
    t('árvore rubro-negra', 'red-black tree', 'BST balanceada em que cada nó é vermelho ou preto; as regras de cor garantem altura de no máximo 2·log₂(n + 1).', 'A Red-Black tree based NavigableMap implementation.'),
  ],
  stages: {
    conceito: [
      md(`
        Na lição anterior, inserir 1, 2, 3, 4, 5 em ordem transformou a BST numa "lista": altura 4 e busca O(n). Isso não é azar raro. Dados reais chegam ordenados o tempo todo: números de pedido crescentes, horários de transações Pix, matrículas, as datas de um extrato.

        Uma {{árvore balanceada|balanced tree}} garante altura O(log n) para **qualquer** ordem de chegada. Ela é {{autobalanceável|self-balancing}}: depois de cada inserção ou remoção, confere se algum nó ficou torto e o conserta com uma {{rotação|rotation}}, uma troca local de três ponteiros. Com 1 milhão de chaves, uma BST comum pode chegar à altura 999 999; uma AVL fica com altura de no máximo 27.

        Elas estão por baixo de muita coisa que você vai usar: o \`TreeMap\` do Java e o \`std::map\` do C++, por exemplo, são árvores balanceadas. Nesta lição você vai entender a mais didática delas, a **AVL**, e ter uma visão da **rubro-negra**, a mais usada nas bibliotecas.
      `),
    ],
    explicacao: [
      md(`
        ### Rotação: o conserto local
        \`\`\`text
                y                      x
               / \\                    / \\
              x   C     ------->     A   y
             / \\                        / \\
            A   B                      B   C

                rotação à direita em y
        \`\`\`

        A, B e C são subárvores inteiras (podem ser vazias). Antes e depois vale a mesma ordem: **A < x < B < y < C**. Por isso a rotação nunca quebra a regra da BST: o percurso em ordem é idêntico. O que muda são as profundidades: A sobe um nível, C desce um, B fica onde estava. Se o lado esquerdo estava alto demais, a rotação à direita o nivela.

        São só três ponteiros: \`y.esq\` passa a ser B, \`x.dir\` passa a ser y, e quem apontava para y (o pai dele, ou a variável da raiz) passa a apontar para x. Custo O(1), qualquer que seja o tamanho das subárvores. A rotação à esquerda é o espelho.

        ### A regra da AVL
        O {{fator de balanceamento|balance factor}} de um nó é \`altura(esq) − altura(dir)\`, com altura da árvore vazia = −1 (a convenção da lição anterior). Uma {{árvore AVL|AVL tree}} é uma BST com um {{invariante|invariant}} a mais: **em todo nó**, o fator é −1, 0 ou +1. Todo nó, não só a raiz: uma raiz equilibrada pode esconder um galho torto lá embaixo.

        Para o fator sair em O(1), cada nó **guarda a própria altura**, atualizada na volta de cada inserção, em vez de recalculá-la percorrendo a subárvore.

        Por que essa regra garante altura O(log n)? Pense na AVL mais "magra" possível de altura h: uma subárvore com altura h − 1 e a outra com h − 2, a menor que a regra permite. Se N(h) é o menor número de nós de uma AVL de altura h, então **N(h) = 1 + N(h − 1) + N(h − 2)**, com N(0) = 1 e N(1) = 2. É quase a recorrência de Fibonacci: N(h) cresce exponencialmente, multiplicando-se por cerca de 1,618 a cada nível. Invertendo a conta, a altura cresce só logaritmicamente com n: no pior caso, cerca de **1,44 · log₂ n**, no máximo uns 44% acima de uma árvore perfeita.

        ### Inserir: insere como BST e conserta na volta
        1. Insira como numa BST comum, recursivamente.
        2. Na volta da recursão, do novo nó até a raiz, atualize a altura de cada nó e calcule o fator.
        3. O primeiro nó (o mais baixo) com fator +2 ou −2 é consertado conforme um dos quatro casos. O nome do caso diz o caminho do nó desequilibrado até o neto do lado pesado: L de *left* (esquerda), R de *right* (direita).

        Nos casos em linha reta basta uma rotação. Nos casos em zigue-zague é preciso uma {{rotação dupla|double rotation}}: uma rotação simples só espelharia o zigue-zague, e o desequilíbrio trocaria de lado. A primeira rotação, no filho, endireita o zigue-zague numa linha reta; a segunda, no nó, resolve a linha reta.
      `),
      {
        type: 'table',
        head: ['Caso', 'Como reconhecer', 'Conserto'],
        rows: [
          ['LL (linha reta à esquerda)', 'fb(nó) = +2 e fb(filho esq.) ≥ 0', 'rotação à direita no nó'],
          ['RR (linha reta à direita)', 'fb(nó) = −2 e fb(filho dir.) ≤ 0', 'rotação à esquerda no nó'],
          ['LR (zigue-zague)', 'fb(nó) = +2 e fb(filho esq.) < 0', 'rotação à esquerda no filho esq., depois à direita no nó'],
          ['RL (zigue-zague)', 'fb(nó) = −2 e fb(filho dir.) > 0', 'rotação à direita no filho dir., depois à esquerda no nó'],
        ],
        caption: 'Na inserção, o filho nunca tem fator 0 quando o pai chega a ±2; o caso "= 0" só aparece na remoção e se resolve com rotação simples.',
      },
      md(`
        Depois do conserto, a subárvore volta **exatamente** à altura que tinha antes da inserção. Por isso nenhum ancestral muda e, na inserção, **um** conserto (simples ou duplo) basta. Custo total: descer O(log n) + no máximo 2 rotações O(1) + atualizar alturas na volta O(log n) = **O(log n) no pior caso**.

        ### Remover (e por que dá mais trabalho)
        Primeiro, a remoção numa BST comum, que ainda não tínhamos visto. Ache o nó e veja quantos filhos ele tem:
        - **nenhum** (folha): basta tirá-lo;
        - **um**: o filho sobe e ocupa o lugar dele;
        - **dois**: copie para ele o valor do {{sucessor|in-order successor}}, o menor valor da subárvore direita (um passo à direita e depois sempre à esquerda), e remova o sucessor lá de baixo. Como o sucessor não tem filho à esquerda, essa segunda remoção cai num dos casos fáceis.

        Na AVL, depois de remover, rebalanceie na volta da recursão, como na inserção. A diferença: aqui um conserto pode **diminuir** a altura da subárvore, e o desequilíbrio pode reaparecer mais acima. Uma remoção pode exigir rotações em vários níveis, até O(log n) delas; o custo total continua O(log n).

        ### A rubro-negra e o mundo real
        A {{árvore rubro-negra|red-black tree}} troca a regra das alturas por regras de cor:
        1. todo nó é vermelho ou preto, e a raiz é preta;
        2. um nó vermelho não tem filho vermelho;
        3. a partir de qualquer nó, todos os caminhos até as posições vazias abaixo dele passam pelo **mesmo número de nós pretos**.

        O caminho mais curto possível só tem nós pretos; o mais longo alterna preto e vermelho. Logo, nenhum caminho da raiz até uma posição vazia tem mais que o dobro de nós de outro. E, se o caminho mais curto tem k nós, todos os k primeiros níveis estão cheios: n ≥ 2ᵏ − 1, ou seja, k ≤ log₂(n + 1). Por isso a altura fica em no máximo 2 · log₂(n + 1). Ela é menos rígida que a AVL (pode ficar um pouco mais alta), mas conserta com menos rotações.
      `),
      {
        type: 'table',
        head: ['Estrutura', 'Altura no pior caso', 'Rotações por inserção', 'Rotações por remoção', 'Onde aparece'],
        rows: [
          ['BST comum', 'n − 1', '0', '0', 'ensino; dados que chegam em ordem aleatória'],
          ['AVL', 'cerca de 1,44 · log₂ n', 'no máximo 2', 'até O(log n)', 'quando há muito mais buscas que alterações (no pior caso, é a mais baixa das três)'],
          ['Rubro-negra', '2 · log₂(n + 1)', 'no máximo 2', 'no máximo 3', '`TreeMap` e `TreeSet` do Java, `std::map` e `std::set` nas implementações comuns de C++, o escalonador de processos do kernel Linux'],
        ],
        caption: 'As três buscam, inserem e removem em O(h). Nas balanceadas, h = O(log n) no pior caso; com 1 milhão de chaves: AVL até 27, rubro-negra até 39, contra 19 da árvore mais baixa possível.',
      },
      warn('O Python **não** tem árvore balanceada na biblioteca padrão. Para busca exata, use `dict` e `set` (hash, O(1) em média). Quando a **ordem** importa (o próximo maior, todos os valores de um intervalo), as opções comuns são uma lista ordenada com o módulo `bisect` (busca O(log n), mas inserir no meio é O(n), porque desloca elementos) ou o pacote externo `sortedcontainers`. Bancos de dados usam **B-trees**, árvores balanceadas com muitos filhos por nó (Nível 7).', 'E no Python?'),
      deep('Uma BST **completa** (todos os níveis cheios, menos talvez o último, preenchido da esquerda para a direita) tem a menor altura possível, mas mantê-la assim custa caro. Numa árvore perfeita com os valores 2 a 8, inserir o 9 obriga o novo nó a nascer no canto esquerdo do último nível, posição que precisa guardar o menor valor: todos os valores mudam de lugar, O(n) por inserção. A AVL aceita até ~44% a mais de altura em troca de consertos O(1) por nível; a rubro-negra aceita até 100% a mais em troca de ainda menos rotações. É um padrão de projeto que você vai rever muitas vezes: relaxar um pouco a garantia para tornar a manutenção barata.', 'Por que não exigir balanceamento perfeito?'),
    ],
    exemplo: [
      md('Vamos inserir 10, 20, 30, 40, 50 e 25 numa AVL vazia. Para caber numa tabela, a árvore está escrita como `x(E, D)`: o nó x com a subárvore esquerda E e a direita D; `—` é vazio, e uma folha aparece só como o número.'),
      {
        type: 'table',
        head: ['Insere', 'Antes do conserto', 'Nó mais baixo com fator ±2', 'Caso e conserto', 'Depois'],
        rows: [
          ['10', '`10`', 'nenhum', '—', '`10`'],
          ['20', '`10(—, 20)`', 'nenhum (fb(10) = −1 é permitido)', '—', '`10(—, 20)`'],
          ['30', '`10(—, 20(—, 30))`', '10: fb = −2, e fb(20) = −1', 'RR: rotação à esquerda em 10', '`20(10, 30)`'],
          ['40', '`20(10, 30(—, 40))`', 'nenhum (fb(20) = −1, fb(30) = −1)', '—', '`20(10, 30(—, 40))`'],
          ['50', '`20(10, 30(—, 40(—, 50)))`', '30: fb = −2, e fb(40) = −1 (o 20 também está em −2, mas o conserto começa pelo mais baixo)', 'RR: rotação à esquerda em 30', '`20(10, 40(30, 50))`'],
          ['25', '`20(10, 40(30(25, —), 50))`', '20: fb = −2, e fb(40) = +1', 'RL: rotação à direita em 40, depois à esquerda em 20', '`30(20(10, 25), 40(—, 50))`'],
        ],
        caption: 'Depois do conserto em 30, o 20 volta sozinho para fb = −1: consertar o mais baixo devolve à subárvore a altura que ela tinha antes.',
      },
      md(`
        O último passo, em desenho. O 25 entrou em zigue-zague (direita do 20, esquerda do 40). A primeira rotação endireita; a segunda nivela:

        \`\`\`text
          antes            1ª: à direita em 40        2ª: à esquerda em 20

            20                  20                           30
           /  \\                /  \\                         /  \\
         10    40            10    30                     20    40
              /  \\                /  \\                   /  \\     \\
            30    50            25    40               10    25    50
           /                            \\
         25                              50
        \`\`\`

        Seis valores, altura 2: o mínimo possível para seis nós.
      `),
      { type: 'viz', viz: 'tree', caption: 'Esta visualização é de uma BST comum, sem balanceamento. Clique em Esvaziar e insira 10, 20, 30, 40, 50 e 25: a altura chega a 4, contra 2 da AVL acima, com os mesmos seis valores.' },
    ],
    codigo: [
      py(
        AVL_BASE +
          '\n\n' +
          dedent(`
            def desenhar(no):                            # a notação x(E, D) do exemplo
                if no is None:
                    return "—"
                if no.esq is None and no.dir is None:
                    return str(no.valor)
                return f"{no.valor}({desenhar(no.esq)}, {desenhar(no.dir)})"

            raiz = None
            for v in [10, 20, 30, 40, 50, 25]:
                raiz = inserir(raiz, v)
                print(f"insere {v}: {desenhar(raiz)}")

            def altura_bst_comum(valores):               # BST sem balanceamento
                # sem recursão: com 1 000 níveis, a recursão passaria do limite do Python
                raiz, maior = None, 0
                for v in valores:
                    if raiz is None:
                        raiz = No(v)
                        continue
                    no, prof = raiz, 1                   # prof: profundidade de um filho de no
                    while True:
                        if v < no.valor:
                            if no.esq is None:
                                no.esq = No(v)
                                break
                            no = no.esq
                        else:
                            if no.dir is None:
                                no.dir = No(v)
                                break
                            no = no.dir
                        prof += 1
                    maior = max(maior, prof)
                return maior

            n = 1000
            avl = None
            for v in range(n):
                avl = inserir(avl, v)
            print(f"{n} chaves em ordem: BST comum com altura {altura_bst_comum(range(n))}, AVL com altura {avl.altura}")
          `),
        { caption: 'A mesma sequência do exemplo e, depois, 1 000 chaves em ordem crescente: a BST comum vira uma lista (altura 999); a AVL fica com altura 9, o mínimo possível para 1 000 nós.' },
      ),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e3-avl-1',
          kind: 'mcq',
          prompt: 'Uma rotação à direita no nó `y` (cujo filho esquerdo é `x`) reorganiza a subárvore. O que **continua igual** depois dela?',
          difficulty: 'facil',
          skills: ['ed-arvores'],
          hints: [
            'O que a BST exige de cada nó? Uma rotação que mudasse isso seria útil?',
            'Olhando o desenho, liste x, y e as subárvores A, B e C na sequência do percurso em ordem, antes e depois da rotação. O que mudou?',
          ],
          explanation: 'A rotação só troca quem é pai de quem entre x e y e muda a subárvore B de dono. A ordem relativa A < x < B < y < C é a mesma, e o percurso em ordem lista justamente essa ordem. Já a raiz da subárvore, as profundidades e, possivelmente, a altura mudam: é para isso que a rotação serve.',
          options: [
            { text: 'A sequência do percurso em ordem (esquerda, nó, direita)', correct: true, feedback: 'Isso: A < x < B < y < C antes e depois. Por isso a rotação nunca quebra a regra da BST.' },
            { text: 'A raiz da subárvore', feedback: 'A raiz muda: x sobe e vira a raiz da subárvore, e y desce para a direita de x.' },
            { text: 'A altura da subárvore', feedback: 'Mudar a altura é justamente o objetivo: A sobe um nível e C desce um, o que pode diminuir a altura da subárvore em 1.' },
            { text: 'A profundidade de cada nó', feedback: 'Não: x e a subárvore A sobem um nível; y e a subárvore C descem um. Só a subárvore B fica na mesma profundidade.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e3-avl-2',
          kind: 'mcq',
          prompt: 'Numa AVL vazia, inserimos 30, depois 10, depois 20. Logo depois de inserir o 20, qual é o caso de desequilíbrio e que valor fica na raiz depois do conserto?',
          difficulty: 'intermediario',
          skills: ['ed-arvores'],
          hints: [
            'Desenhe primeiro a BST comum com 30, 10 e 20. De que lado do 10 o 20 fica?',
            'Calcule fb(30) e fb(10), lembrando que a altura de uma subárvore vazia é −1.',
            'Os dois fatores têm o mesmo sinal ou sinais opostos? O que isso diz: linha reta ou zigue-zague?',
          ],
          explanation: 'Sem conserto, a árvore fica `30(10(—, 20), —)`: fb(30) = +2 e fb(10) = −1. Sinais opostos indicam zigue-zague, caso LR. A rotação à esquerda no 10 endireita para `30(20(10, —), —)`, uma linha reta (LL), e a rotação à direita no 30 resulta em `20(10, 30)`.',
          options: [
            { text: 'LR (esquerda-direita); a raiz vira 20', correct: true, feedback: 'Isso: o 20 entrou à direita do filho esquerdo. Rotação à esquerda no 10 e depois à direita no 30: `20(10, 30)`.' },
            { text: 'LL (esquerda-esquerda); a raiz vira 10', feedback: 'Seria LL se o 20 estivesse à esquerda do 10. Aqui fb(10) = −1, um zigue-zague. Uma rotação simples à direita no 30 levaria a `10(—, 30(20, —))`, ainda com fator −2 no 10.' },
            { text: 'RL (direita-esquerda); a raiz vira 20', feedback: 'A raiz final está certa, mas o caso não: o lado pesado do 30 é o esquerdo (fb = +2), então o caso começa com L. RL é o espelho, quando fb(nó) = −2.' },
            { text: 'Nenhum: a árvore continua sendo AVL', feedback: 'Calcule fb(30): a subárvore esquerda (o 10 com o filho 20) tem altura 1 e a direita está vazia (altura −1). A diferença é 2, fora do limite.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e3-avl-3',
          kind: 'predict',
          lang: 'python',
          prompt: 'O que é impresso? (Os nós aqui não guardam altura: o foco é só a rotação.)',
          difficulty: 'intermediario',
          skills: ['ed-arvores', 'alg-recursao'],
          hints: [
            'Desenhe a árvore antes da rotação. Quem é x, quem é y e quem é a subárvore B (a que muda de dono)?',
            'Depois de `girar_esquerda`, quem é a nova raiz? E para onde foi o 15?',
            'A pré-ordem visita o nó, depois toda a subárvore esquerda, depois toda a direita.',
          ],
          explanation: 'Antes: `10(5, 20(15, 30))`. Na rotação à esquerda em 10, o 20 sobe, o 10 desce para a esquerda dele e o 15 (que estava à esquerda do 20) passa para a direita do 10: `20(10(5, 15), 30)`. A pré-ordem é [20, 10, 5, 15, 30], e `r.esq.dir` é o 15. Repare que o percurso em ordem continua 5, 10, 15, 20, 30.',
          code: dedent(`
            class No:
                def __init__(self, valor, esq=None, dir=None):
                    self.valor, self.esq, self.dir = valor, esq, dir

            def girar_esquerda(x):
                y = x.dir
                x.dir = y.esq
                y.esq = x
                return y

            def pre_ordem(no):
                if no is None:
                    return []
                return [no.valor] + pre_ordem(no.esq) + pre_ordem(no.dir)

            r = No(10, No(5), No(20, No(15), No(30)))
            r = girar_esquerda(r)
            print(pre_ordem(r))
            print(r.esq.dir.valor)
          `),
          answer: '[20, 10, 5, 15, 30]\n15',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e3-avl-4',
          kind: 'fill',
          lang: 'text',
          prompt: 'Seja N(h) o **menor** número de nós de uma AVL de altura h. A AVL mais magra de altura h tem uma subárvore de altura h − 1 e outra de altura h − 2, ambas também as mais magras possíveis. Complete as contas e conclua: qual a **maior** altura possível de uma AVL com 11 nós?',
          difficulty: 'intermediario',
          skills: ['ed-arvores', 'alg-recursao'],
          hints: [
            'Por que a subárvore mais baixa tem altura h − 2, e não h − 3?',
            'Cada linha usa os resultados das duas anteriores.',
            'Para ter altura 4, de quantos nós uma AVL precisa no mínimo? 11 nós são suficientes?',
          ],
          explanation: 'A recorrência dá 1, 2, 4, 7, 12, 20, 33, ..., que cresce como Fibonacci (cada termo é cerca de 1,618 vezes o anterior). Altura 4 exige pelo menos 12 nós; com 11, a altura é no máximo 3. Como N(h) cresce exponencialmente, h cresce só logaritmicamente: h < 1,45 · log₂(n + 2). Para comparar, uma BST comum com 11 nós pode ter altura 10.',
          template: dedent(`
            N(0) = 1
            N(1) = 2
            N(2) = 1 + N(1) + N(0) = ___
            N(3) = 1 + N(2) + N(1) = ___
            N(4) = 1 + N(3) + N(2) = ___
            Com 11 nós, a altura é no máximo ___
          `),
          blanks: [['4'], ['7'], ['12'], ['3']],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e3-avl-5',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `eh_avl(raiz)`, que devolve `True` se **todo** nó da árvore tem fator de balanceamento entre −1 e +1 (altura da árvore vazia = −1, de uma folha = 0). Não é preciso conferir a ordem da BST, só o balanceamento. Aqui os nós **não** guardam a altura: calcule-a. Desafio extra: faça tudo numa única passada pela árvore.',
          difficulty: 'intermediario',
          skills: ['ed-arvores', 'alg-recursao'],
          hints: [
            'Conferir só a raiz basta? Imagine uma raiz com fator 0 e um galho torto lá embaixo.',
            'Para saber se um nó está balanceado, você precisa da altura das duas subárvores dele. Como calcular a altura recursivamente?',
            'Para uma passada só, faça uma função auxiliar que devolve a altura da subárvore e, ao mesmo tempo, avisa se encontrou algum nó desbalanceado (por exemplo, devolvendo um par, ou um valor especial).',
          ],
          explanation: 'Todo nó precisa respeitar |altura(esq) − altura(dir)| ≤ 1. A versão direta (calcular a altura em cada nó e recursar nos filhos) é correta, mas recalcula alturas muitas vezes: cada nó é visitado de novo por todos os seus ancestrais, o que dá O(n log n) numa AVL e pode ser bem pior em árvores altas. A versão de uma passada devolve a altura de baixo para cima e para no primeiro desequilíbrio: O(n). É a mesma ideia de guardar a altura no nó, como a AVL faz.',
          starter: dedent(`
            class No:
                def __init__(self, valor, esq=None, dir=None):
                    self.valor, self.esq, self.dir = valor, esq, dir

            def eh_avl(raiz):
                # devolva True se, em TODO nó, |altura(esq) - altura(dir)| <= 1
                pass
          `),
          solution: dedent(`
            class No:
                def __init__(self, valor, esq=None, dir=None):
                    self.valor, self.esq, self.dir = valor, esq, dir

            def eh_avl(raiz):
                def altura_ou_falha(no):
                    # devolve a altura da subárvore, ou None se achar desequilíbrio
                    if no is None:
                        return -1
                    he = altura_ou_falha(no.esq)
                    if he is None:
                        return None
                    hd = altura_ou_falha(no.dir)
                    if hd is None or abs(he - hd) > 1:
                        return None
                    return 1 + max(he, hd)
                return altura_ou_falha(raiz) is not None
          `),
          tests: [
            {
              name: 'vazia e um nó',
              code: 'assert eh_avl(None) is True, "a árvore vazia é AVL"\nassert eh_avl(No(7)) is True, "um nó sozinho é AVL"',
            },
            {
              name: 'árvores balanceadas',
              code: dedent(`
                perfeita = No(4, No(2, No(1), No(3)), No(6, No(5), No(7)))
                assert eh_avl(perfeita), "a árvore perfeita de 7 nós é AVL"
                exemplo = No(30, No(20, No(10), No(25)), No(40, None, No(50)))
                assert eh_avl(exemplo), "a AVL do exemplo da lição deveria dar True"
                magra = No(5, No(3, No(2, No(1)), No(4)), No(7, No(6)))
                assert eh_avl(magra), "fatores +1 em vários nós são permitidos: esta é a AVL mais magra de altura 3"
              `),
            },
            {
              name: 'desequilíbrio de 2 na raiz',
              code: dedent(`
                assert not eh_avl(No(1, None, No(2, None, No(3)))), "a cadeia 1 -> 2 -> 3 tem fator -2 na raiz"
                r = No(10, No(5, No(2), No(7)), None)
                assert not eh_avl(r), "a raiz tem subárvore esquerda de altura 1 e direita vazia (altura -1): fator +2. Confira a altura da árvore vazia"
                r = No(10, No(5, No(2, No(1)), No(7)), No(15))
                assert not eh_avl(r), "a raiz tem dois filhos, mas a subárvore esquerda tem altura 2 e a direita, 0: fator +2. Ter os dois filhos não basta: compare as alturas"
              `),
            },
            {
              name: 'raiz equilibrada, galho torto',
              code: dedent(`
                torto = No(5, No(3, No(1)))
                direita = No(15, No(12), No(20, None, No(25)))
                r = No(10, torto, direita)
                assert not eh_avl(r), "a raiz tem fator 0, mas o nó 5 tem fator +2: confira TODOS os nós, não só a raiz"
                esquerda2 = No(4, No(2, No(1), No(3)), No(6, No(5), No(7)))
                direita2 = No(12, No(10, No(9), No(11)), No(14, None, No(15, None, No(16))))
                r = No(8, esquerda2, direita2)
                assert not eh_avl(r), "a raiz e os filhos dela estão equilibrados, mas o nó 14, dois níveis abaixo, à direita, tem fator -2: a conferência precisa descer pelos dois lados até as folhas"
              `),
            },
            {
              name: '300 árvores aleatórias',
              code: dedent(`
                import random

                def _bst(vs):
                    r = None
                    for v in vs:
                        if r is None:
                            r = No(v)
                            continue
                        no = r
                        while True:
                            if v < no.valor:
                                if no.esq is None:
                                    no.esq = No(v)
                                    break
                                no = no.esq
                            else:
                                if no.dir is None:
                                    no.dir = No(v)
                                    break
                                no = no.dir
                    return r

                def _desenho(no):
                    if no is None:
                        return "—"
                    if no.esq is None and no.dir is None:
                        return str(no.valor)
                    return f"{no.valor}({_desenho(no.esq)}, {_desenho(no.dir)})"

                def _altura_avl(no):
                    if no is None:
                        return -1
                    he, hd = _altura_avl(no.esq), _altura_avl(no.dir)
                    if he is None or hd is None or abs(he - hd) > 1:
                        return None
                    return 1 + max(he, hd)

                _rng = random.Random(8)
                for _ in range(300):
                    vs = _rng.sample(range(100), _rng.randint(0, 14))
                    r = _bst(vs)
                    esperado = _altura_avl(r) is not None
                    assert eh_avl(r) == esperado, f"para a árvore {_desenho(r)} (na notação x(E, D) da lição), eh_avl devolveu {eh_avl(r)}; esperado {esperado}"
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
          id: 'e3-avl-desafio',
          kind: 'code',
          lang: 'python',
          prompt: 'O código inicial traz uma AVL completa com inserção (a mesma da etapa Código). Escreva `remover(no, v)`, que remove `v` da subárvore e devolve a nova raiz dela, mantendo a regra da BST, o balanceamento AVL e corretas as alturas guardadas nos nós. Se `v` não estiver na árvore, nada muda. No caso de dois filhos, use o {{sucessor|in-order successor}} (o menor valor da subárvore direita).',
          difficulty: 'desafio',
          skills: ['ed-arvores', 'alg-recursao'],
          hints: [
            'Comece pela parte de BST, sem pensar em balanceamento: como achar o nó, e o que fazer em cada um dos três casos (folha, um filho, dois filhos)?',
            'No caso de dois filhos, o valor do sucessor vem para o nó atual. Como tirar o sucessor da subárvore direita sem escrever código novo?',
            'A estrutura é a mesma de `inserir`: desça recursivamente, troque o filho pelo resultado da chamada e, na volta, devolva o nó já rebalanceado. Que funções do código inicial você pode reaproveitar?',
          ],
          explanation: 'A remoção tem a mesma forma da inserção: recursão até o nó, os três casos da BST (no de dois filhos, o valor do sucessor sobe e o sucessor é removido da subárvore direita) e `rebalancear` em cada nó do caminho, na volta. Note que `rebalancear` trata fb(filho) = 0 com rotação simples, caso que só aparece na remoção. E, ao contrário da inserção, um conserto pode encurtar a subárvore e desequilibrar um ancestral: um dos testes provoca rotações em dois níveis com uma única remoção. Custo: O(log n).',
          starter:
            AVL_BASE +
            '\n\n' +
            dedent(`
              def remover(no, v):
                  # 1. desça como na busca até achar v (chegou a None: v não está na árvore)
                  # 2. trate os três casos: folha, um filho, dois filhos (use o sucessor)
                  # 3. na volta da recursão, devolva cada nó do caminho rebalanceado
                  return no
            `),
          solution:
            AVL_BASE +
            '\n\n' +
            dedent(`
              def remover(no, v):
                  if no is None:
                      return None
                  if v < no.valor:
                      no.esq = remover(no.esq, v)
                  elif v > no.valor:
                      no.dir = remover(no.dir, v)
                  else:
                      if no.esq is None:
                          return no.dir
                      if no.dir is None:
                          return no.esq
                      suc = no.dir
                      while suc.esq is not None:
                          suc = suc.esq
                      no.valor = suc.valor
                      no.dir = remover(no.dir, suc.valor)
                  return rebalancear(no)
            `),
          tests: [
            {
              name: 'remove uma folha',
              code: CONFERIR_AVL + '\n' + dedent(`
                r = remover(_montar([20, 10, 30, 5]), 5)
                _conferir(r)
                assert _valores(r) == [10, 20, 30], f"esperado [10, 20, 30] em ordem; veio {_valores(r)}"
              `),
            },
            {
              name: 'remove um nó com um filho',
              code: CONFERIR_AVL + '\n' + dedent(`
                r = remover(_montar([20, 10, 30, 5]), 10)
                _conferir(r)
                assert _valores(r) == [5, 20, 30], f"o 5 deveria ocupar o lugar do 10; em ordem veio {_valores(r)}"
              `),
            },
            {
              name: 'remove um nó com dois filhos (a raiz)',
              code: CONFERIR_AVL + '\n' + dedent(`
                r = remover(_montar([20, 10, 30, 25, 35]), 20)
                _conferir(r)
                assert _valores(r) == [10, 25, 30, 35], f"esperado [10, 25, 30, 35]; veio {_valores(r)}"
              `),
            },
            {
              name: 'remoção que exige rotação simples e dupla',
              code: CONFERIR_AVL + '\n' + dedent(`
                r = remover(_montar([20, 10, 30, 35]), 10)
                _conferir(r)
                assert r.valor == 30, f"sem o 10, o 20 fica com fator -2 (caso RR): a raiz deveria virar 30, veio {r.valor}"
                r = remover(_montar([20, 10, 30, 25]), 10)
                _conferir(r)
                assert r.valor == 25, f"sem o 10, o 20 fica com fator -2 e o 30 com +1 (caso RL): a raiz deveria virar 25, veio {r.valor}"
              `),
            },
            {
              name: 'uma remoção, rotações em dois níveis',
              code: CONFERIR_AVL + '\n' + dedent(`
                vs = [11, 12, 3, 5, 10, 9, 2, 6, 8, 4, 1, 7]
                r = remover(_montar(vs), 3)
                _conferir(r)
                assert _valores(r) == [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12], f"em ordem veio {_valores(r)}"
              `),
            },
            {
              name: 'valor ausente, árvore vazia e esvaziar tudo',
              code: CONFERIR_AVL + '\n' + dedent(`
                assert remover(None, 3) is None, "remover de uma árvore vazia devolve None"
                r = remover(_montar([2, 1, 3]), 99)
                _conferir(r)
                assert _valores(r) == [1, 2, 3], "remover um valor ausente não deve mudar nada"
                r = _montar(range(1, 41))
                for v in [20, 1, 40, 10, 30] + list(range(1, 41)):
                    r = remover(r, v)
                    _conferir(r)
                assert r is None, "depois de remover todos os valores, a árvore deve ficar vazia (None)"
              `),
            },
            {
              name: '600 operações aleatórias contra um set',
              code: CONFERIR_AVL + '\n' + dedent(`
                import random
                rng = random.Random(42)
                r, conj = None, set()
                for passo in range(600):
                    v = rng.randint(0, 60)
                    if rng.random() < 0.55:
                        r = inserir(r, v)
                        conj.add(v)
                    else:
                        r = remover(r, v)
                        conj.discard(v)
                    _conferir(r)
                    assert _valores(r) == sorted(conj), f"no passo {passo}, a árvore tem {_valores(r)}; esperado {sorted(conj)}"
              `),
            },
            {
              name: 'não reconstrói a árvore',
              code: CONFERIR_AVL + '\n' + dedent(`
                r = _montar(range(300))
                criados = [0]
                _init_original = No.__init__
                def _contando(self, *args, **kwargs):
                    criados[0] += 1
                    _init_original(self, *args, **kwargs)
                No.__init__ = _contando
                try:
                    for v in range(0, 300, 3):
                        r = remover(r, v)
                finally:
                    No.__init__ = _init_original
                _conferir(r)
                assert criados[0] <= 100, f"{criados[0]} nós criados em 100 remoções: remova ajustando os ponteiros, sem reconstruir a árvore"
              `),
            },
          ],
        },
      },
    ],
    projeto: [
      md('**Experimento: índice de CEPs.** Gere 50 000 CEPs aleatórios de 8 dígitos e guarde-os de duas formas: na sua AVL (com a remoção do desafio) e numa lista ordenada mantida com `bisect.insort`. Meça o tempo para inserir todos, para remover 10 000 e para listar os CEPs de uma faixa, como 01000-000 a 05999-999 (a maior parte da capital paulista); na AVL, faça um percurso em ordem que só desce para os lados que podem ter valores da faixa. Qual estrutura venceu em cada operação? Explique usando O(log n) × O(n) e o fato de `bisect.insort` deslocar memória com código em C, enquanto a AVL roda em Python puro.'),
    ],
    revisao: [
      md(`
        - Rotação: troca local O(1) que preserva o percurso em ordem e muda as profundidades.
        - AVL: em todo nó, fator de balanceamento −1, 0 ou +1; cada nó guarda a altura.
        - N(h) = 1 + N(h − 1) + N(h − 2) cresce como Fibonacci, então h ≈ 1,44 · log₂ n no pior caso.
        - Inserção: insere como BST e conserta o nó mais baixo com fator ±2. Linha reta (LL, RR): uma rotação; zigue-zague (LR, RL): rotação dupla. Um conserto basta.
        - Remoção: três casos da BST (no de dois filhos, entra o sucessor) e rebalanceamento na volta, possivelmente em vários níveis.
        - Rubro-negra: regras de cor, altura até 2 · log₂(n + 1), poucas rotações; é a de \`TreeMap\` e \`std::map\`. O Python não tem árvore balanceada na biblioteca padrão.
      `),
      english(`
        **Vocabulary**: *balanced / self-balancing tree*, *left / right rotation*, *balance factor*, *AVL tree*, *double rotation*, *invariant*, *in-order successor*, *red-black tree*.

        From the Java documentation (class TreeMap): *"A Red-Black tree based NavigableMap implementation. [...] This implementation provides guaranteed log(n) time cost for the containsKey, get, put and remove operations."*

        Typical interview question: "What happens to a binary search tree when you insert keys in sorted order, and how do self-balancing trees prevent it?"
      `),
    ],
  },
  review: [
    ['O que uma rotação preserva e o que ela muda?', 'Preserva a ordem do percurso em ordem (a regra da BST). Muda a raiz da subárvore, as profundidades e, possivelmente, a altura.'],
    ['Qual é o invariante de uma AVL?', 'Em todo nó, |altura(esq) − altura(dir)| ≤ 1, ou seja, fator de balanceamento −1, 0 ou +1.'],
    ['Como reconhecer o caso LR e como consertá-lo?', 'fb(nó) = +2 e fb(filho esquerdo) < 0 (zigue-zague). Rotação à esquerda no filho esquerdo e depois rotação à direita no nó.'],
    ['Por que a altura de uma AVL é O(log n)?', 'O menor número de nós de uma AVL de altura h segue N(h) = 1 + N(h − 1) + N(h − 2), que cresce exponencialmente (como Fibonacci); logo h ≈ 1,44 · log₂ n no pior caso.'],
    ['Quantos consertos uma inserção numa AVL exige? E uma remoção?', 'Inserção: um só (no máximo 2 rotações), pois a subárvore volta à altura antiga. Remoção: pode exigir rotações em vários níveis, até O(log n).'],
    ['Ao remover de uma BST um nó com dois filhos, quem toma o lugar dele?', 'O sucessor: o menor valor da subárvore direita (um passo à direita e depois sempre à esquerda). Depois, o sucessor é removido lá de baixo.'],
    ['Qual a altura máxima de uma rubro-negra com n nós, e onde ela é usada?', 'No máximo 2 · log₂(n + 1). TreeMap e TreeSet do Java, std::map nas implementações comuns de C++, kernel Linux.'],
    ['O Python tem árvore balanceada na biblioteca padrão? O que usar no lugar?', 'Não. dict e set para busca exata; lista ordenada com bisect (ou o pacote sortedcontainers) quando a ordem importa.'],
  ],
  references: ['clrs', 'sedgewick-algs', 'mit-6006'],
});

/* ------------------------------------------------------------------ */
/* Lição 3 do módulo: heaps por dentro                                */
/* ------------------------------------------------------------------ */

const heaps = lesson({
  id: 'l3-heap-binario',
  moduleId: 'm3-4',
  title: 'Heaps por dentro: a árvore guardada numa lista',
  titleEn: 'Binary heaps inside: a tree stored in an array',
  summary: 'Como o heapq funciona: árvore binária completa dentro de uma lista, subir e descer, construir um heap em O(n) e ordenar no lugar com heapsort.',
  minutes: 45,
  objectives: [
    'Navegar numa árvore binária completa guardada em lista com os índices 2i + 1, 2i + 2 e (i − 1) // 2',
    'Implementar inserção (subir) e retirada do mínimo (descer) e justificar o custo O(log n)',
    'Explicar por que construir um heap de baixo para cima custa O(n), e não O(n log n)',
    'Ordenar uma lista no lugar com heapsort e saber quando ele vale a pena',
  ],
  skills: ['ed-arvores'],
  terms: [
    t('heap binário', 'binary heap', 'Árvore binária completa com a propriedade de heap, guardada numa lista, sem nós nem ponteiros.', 'Heaps are binary trees for which every parent node has a value less than or equal to any of its children.'),
    t('árvore binária completa', 'complete binary tree', 'Árvore binária com todos os níveis cheios, exceto talvez o último, que é preenchido da esquerda para a direita.'),
    t('propriedade de heap', 'heap property / heap invariant', 'Num heap mínimo, todo pai é menor ou igual aos seus filhos; entre irmãos não há regra.', 'We refer to this condition as the heap invariant.'),
    t('subir', 'sift up', 'Trocar um elemento com o pai enquanto ele for menor que o pai, levando-o em direção à raiz.'),
    t('descer', 'sift down', 'Trocar um elemento com o menor dos filhos enquanto ele for maior que algum filho, levando-o em direção às folhas.'),
    t('construção de baixo para cima', 'bottom-up heap construction', 'Montar um heap fazendo descer cada pai, do último até a raiz; custa O(n). É o que heapq.heapify faz.', 'Transform list x into a heap, in-place, in linear time.'),
    t('no lugar', 'in-place', 'Que trabalha dentro da própria lista, com memória extra O(1).', 'This method sorts the list in place, using only < comparisons between items.'),
    t('heapsort', 'heapsort', 'Ordenação que monta um heap máximo e manda o maior para o fim repetidamente; O(n log n) no pior caso, no lugar, não estável.'),
  ],
  stages: {
    conceito: [
      md(`
        Na lição de filas de prioridade, você usou o \`heapq\` como caixa-preta: \`h[0]\` é sempre o menor, \`heappush\` e \`heappop\` custam O(log n) e \`heapify\` custa O(n). Agora vamos abrir a caixa.

        Um {{heap binário|binary heap}} é uma árvore, mas com uma regra mais fraca que a da BST e um formato tão regular que dispensa nós e ponteiros: a árvore inteira mora numa \`list\` comum, e pai e filhos se encontram por contas com os índices. Isso dá ao heap vantagens que uma BST não tem: o mínimo sempre na posição 0, altura que **nunca** degenera sem precisar de rotações e nenhuma memória gasta com ponteiros.

        Entender o heap por dentro explica por que a lista do \`heapq\` "parece bagunçada", permite operações que o módulo não oferece (como cancelar um item do meio) e traz de brinde um algoritmo de ordenação: o heapsort.
      `),
    ],
    explicacao: [
      md(`
        ### Duas regras
        1. **Forma**: o heap é uma {{árvore binária completa|complete binary tree}}: todos os níveis cheios, exceto talvez o último, que é preenchido da esquerda para a direita, sem buracos. Com n nós, a altura é sempre ⌊log₂ n⌋: 1 milhão de elementos cabem em 20 níveis (altura 19), qualquer que seja a ordem de chegada.
        2. **Ordem**: a {{propriedade de heap|heap property}}. Num heap mínimo, **todo pai é menor ou igual aos filhos**. Entre irmãos ou primos, nada é exigido.
      `),
      {
        type: 'table',
        head: ['Aspecto', 'BST', 'Heap mínimo'],
        rows: [
          ['Ordem exigida', 'esquerda < nó < direita (ordem "horizontal")', 'pai ≤ filhos (ordem só "vertical")'],
          ['Onde está o menor', 'no nó mais à esquerda: O(h)', 'na raiz: O(1)'],
          ['Buscar um valor qualquer', 'O(h): desce por um caminho só', 'O(n): ele pode estar em qualquer ramo'],
          ['Percurso em ordem sai ordenado?', 'sim', 'não'],
          ['Altura', 'BST comum: depende da ordem de chegada (pode ser n − 1); AVL ou rubro-negra: O(log n), à custa de rotações', 'sempre ⌊log₂ n⌋, sem rotações'],
        ],
        caption: 'O heap abre mão da busca rápida por qualquer valor em troca de achar o mínimo em O(1) e nunca degenerar.',
      },
      md(`
        ### A árvore dentro da lista
        Numere os nós nível por nível, da esquerda para a direita, começando do 0. Como a forma não tem buracos, a numeração vira índice de lista, e as relações viram contas:
        - filhos do índice i: **2i + 1** e **2i + 2**;
        - pai do índice i: **(i − 1) // 2**;
        - as folhas são os índices de n // 2 até n − 1 (metade da lista!), e o último pai é o índice n // 2 − 1.

        \`\`\`text
        índice:   0   1   2   3   4   5   6   7
        lista:  [ 1,  3,  2,  7,  4,  5,  9,  8 ]

                       1                 nível 0: índice 0
                    /     \\
                   3       2             nível 1: índices 1 e 2
                  / \\     / \\
                 7   4   5   9           nível 2: índices 3 a 6
                /
               8                         nível 3: índice 7
        \`\`\`

        Confira: os filhos do índice 1 (valor 3) estão nos índices 3 e 4 (valores 7 e 4); o pai do índice 7 (valor 8) está em (7 − 1) // 2 = 3 (valor 7). É a mesma ideia do acesso por índice em arrays: a posição é calculada, não procurada.

        ### Inserir: entra no fim e sobe
        1. Coloque o novo elemento no fim da lista (\`append\`). A forma continua completa.
        2. {{Subir|sift up}}: enquanto ele for menor que o pai, troque os dois.

        Cada troca sobe um nível: no máximo ⌊log₂ n⌋ trocas, **O(log n)**.

        ### Retirar o mínimo: o último vai para a raiz e desce
        1. Guarde \`h[0]\`: é a resposta.
        2. Tire o **último** elemento da lista e coloque-o na posição 0. A forma continua completa.
        3. {{Descer|sift down}}: enquanto ele for maior que algum filho, troque-o com o **menor** dos filhos.

        Duas comparações e no máximo uma troca por nível: **O(log n)**.
      `),
      warn('Trocar com o filho **maior** quebraria o heap: ele subiria e viraria pai do filho menor. Trocando com o menor dos dois, o novo pai é menor ou igual ao irmão que ficou embaixo.', 'Por que o menor dos filhos?'),
      md(`
        ### Construir um heap: O(n), não O(n log n)
        Há duas formas de transformar n valores num heap:
        - **n inserções**: cada uma pode subir até a raiz. No pior caso (num heap mínimo, valores chegando em ordem decrescente), o total cresce como n log n.
        - **{{De baixo para cima|bottom-up heap construction}}**: as folhas, metade da lista, já são heaps de um elemento. Faça descer cada pai, do último (n // 2 − 1) até a raiz. Quando chega a vez do índice i, as duas subárvores dele já são heaps, então descer i conserta a subárvore inteira. É o que \`heapq.heapify\` faz (o método é de Robert Floyd, 1964).

        Por que de baixo para cima é O(n)? Um nó só desce até as folhas, ou seja, no máximo a **altura dele**. E quase todos os nós estão perto do fundo: cerca de n/2 são folhas (descem 0 níveis), n/4 descem no máximo 1, n/8 no máximo 2, e assim por diante. A soma n/4 · 1 + n/8 · 2 + n/16 · 3 + ... nunca passa de n. Com inserções acontece o contrário: um nó **sobe** no máximo a sua **profundidade**, e quase todos os nós estão lá embaixo, longe da raiz.
      `),
      {
        type: 'table',
        head: ['Operação', 'Custo', 'Por quê'],
        rows: [
          ['Espiar o mínimo (`h[0]`)', 'O(1)', 'está sempre na raiz'],
          ['Inserir (subir)', 'O(log n)', 'no máximo uma troca por nível'],
          ['Retirar o mínimo (descer)', 'O(log n)', 'duas comparações e uma troca por nível'],
          ['Construir com n inserções', 'O(n log n) no pior caso', 'cada nó pode subir da sua profundidade até a raiz'],
          ['Construir de baixo para cima (`heapify`)', 'O(n)', 'cada nó desce no máximo a sua altura, e a maioria tem altura pequena'],
          ['Achar um valor qualquer', 'O(n)', 'a ordem é só vertical; com o índice em mãos, remover custa O(log n)'],
        ],
      },
      md(`
        ### Heapsort
        Um heap também ordena uma lista **{{no lugar|in-place}}**, com memória extra O(1):
        1. Transforme a lista num heap **máximo** (pai ≥ filhos), de baixo para cima: O(n).
        2. O maior está em \`xs[0]\`. Troque-o com o último elemento da parte que ainda é heap: ele acaba de chegar à posição definitiva. A parte que é heap encolhe uma posição; faça o novo \`xs[0]\` descer dentro dela. Repita até sobrar um elemento.

        O {{heapsort|heapsort}} custa **O(n log n) no pior caso**, com qualquer entrada, sem memória extra. Mas não é estável (iguais podem trocar de ordem entre si) e, na prática, costuma ser mais lento que um merge sort ou um quick sort bem implementados (o \`sorted\` do Python usa o Timsort, derivado do merge sort), porque salta de i para 2i + 1 na memória e aproveita mal o cache. Ele brilha como rede de segurança: o \`std::sort\` do C++, nas implementações comuns (o *introsort*), começa com quick sort e passa para heapsort se a recursão ficar funda demais, garantindo O(n log n).
      `),
      deep(`
        Vale ler o arquivo \`heapq.py\` (o Python usa uma versão em C, mas o código em Python está lá, comentado). Duas surpresas:
        - Os nomes estão ao contrário do que a maioria dos livros usa: \`_siftdown\` é a função que faz o item **subir** (ela "desce os pais" para abrir espaço) e \`_siftup\` é a que faz **descer**.
        - O \`heappop\` usa um truque: em vez de comparar o elemento que veio do fim com os filhos a cada nível, ele sobe o menor filho até abrir um buraco numa folha e só então faz o elemento subir o pouco que precisar. Como quem vem do fim quase sempre pertence ao fundo, isso economiza comparações em média.
      `, 'Lendo o código-fonte do heapq'),
    ],
    exemplo: [
      md('Partimos do heap `[2, 5, 3, 9, 6, 4]`, inserimos 1 e depois retiramos o mínimo. Em cada passo, as contas de índice dizem exatamente quem comparar: só um caminho da raiz até uma folha é visitado.'),
      {
        type: 'table',
        head: ['Passo', 'Lista', 'O que aconteceu'],
        rows: [
          ['início', '`[2, 5, 3, 9, 6, 4]`', 'heap válido: 2 ≤ 5 e 3; 5 ≤ 9 e 6; 3 ≤ 4'],
          ['inserir 1: append', '`[2, 5, 3, 9, 6, 4, 1]`', 'o 1 entra no índice 6; o pai é o índice (6 − 1) // 2 = 2 (valor 3)'],
          ['subir', '`[2, 5, 1, 9, 6, 4, 3]`', '1 < 3: troca. Agora o 1 está no índice 2, e o pai é o índice 0 (valor 2)'],
          ['subir', '`[1, 5, 2, 9, 6, 4, 3]`', '1 < 2: troca. Chegou à raiz: 2 trocas, a altura do heap'],
          ['retirar: guarda `h[0]`', '`[1, 5, 2, 9, 6, 4, 3]`', 'a resposta é 1'],
          ['o último vai para a raiz', '`[3, 5, 2, 9, 6, 4]`', 'o 3 sai do índice 6 e ocupa o 0; a lista encolhe'],
          ['descer', '`[2, 5, 3, 9, 6, 4]`', 'filhos do índice 0: 5 e 2. O menor é 2, e 3 > 2: troca'],
          ['descer', '`[2, 5, 3, 9, 6, 4]`', 'o 3 está no índice 2; o único filho é o índice 5 (valor 4) e 3 ≤ 4: para'],
        ],
        caption: 'O heapq faz exatamente isso: heappush(h, 1) deixa [1, 5, 2, 9, 6, 4, 3], e o heappop seguinte devolve 1 e deixa [2, 5, 3, 9, 6, 4].',
      },
      md(`
        \`\`\`text
          depois de inserir 1          depois de retirar o 1

                 1                            2
               /   \\                        /   \\
              5     2                      5     3
             / \\   / \\                    / \\   /
            9   6 4   3                  9   6 4
        \`\`\`
      `),
    ],
    codigo: [
      py(`
        def subir(h, i):
            trocas = 0
            while i > 0:
                pai = (i - 1) // 2
                if h[i] >= h[pai]:                 # já respeita o pai: para
                    break
                h[i], h[pai] = h[pai], h[i]
                i, trocas = pai, trocas + 1
            return trocas                          # (só para medirmos o custo)

        def descer(h, i):
            n = len(h)
            trocas = 0
            while True:
                menor = i
                for f in (2 * i + 1, 2 * i + 2):   # os dois filhos de i
                    if f < n and h[f] < h[menor]:
                        menor = f
                if menor == i:                     # não é maior que os filhos: para
                    return trocas
                h[i], h[menor] = h[menor], h[i]
                i, trocas = menor, trocas + 1

        def inserir(h, x):
            h.append(x)                            # 1. mantém a forma
            subir(h, len(h) - 1)                   # 2. restaura a ordem

        def retirar_min(h):
            ultimo = h.pop()                       # lista vazia: IndexError, como no heappop
            if not h:
                return ultimo
            menor, h[0] = h[0], ultimo             # o último vai para a raiz...
            descer(h, 0)                           # ...e desce até o lugar dele
            return menor

        h = []
        for x in [5, 3, 8, 1, 4]:
            inserir(h, x)
            print(f"inseriu {x}: {h}")
        print("retirou", retirar_min(h), "->", h)

        # Construir um heap com 4 095 valores em ordem decrescente (o pior caso das inserções)
        n = 4095
        xs = list(range(n, 0, -1))
        um_a_um, trocas_insercoes = [], 0
        for x in xs:
            um_a_um.append(x)
            trocas_insercoes += subir(um_a_um, len(um_a_um) - 1)
        de_baixo = list(xs)
        trocas_baixo = sum(descer(de_baixo, i) for i in range(n // 2 - 1, -1, -1))
        print(f"n = {n}: {trocas_insercoes} trocas com n inserções; {trocas_baixo} de baixo para cima")
        print("os primeiros a sair:", [retirar_min(de_baixo) for _ in range(5)])
      `, { caption: 'Com n = 4 095, as inserções fazem 40 962 trocas (da ordem de n · log₂ n ≈ 49 000) e a construção de baixo para cima, 4 083 (menos que n).' }),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e3-heap-1',
          kind: 'mcq',
          prompt: 'Num heap guardado em lista (índices a partir de 0), um elemento está no índice 4. Em que índices estão o pai e os filhos dele?',
          difficulty: 'facil',
          skills: ['ed-arvores', 'ed-arrays'],
          hints: [
            'Quantos nós cabem em cada nível? Escreva os índices de 0 a 10 nível por nível.',
            'No seu desenho, quem está logo acima do 4? E logo abaixo?',
          ],
          explanation: 'Com índices a partir de 0, os filhos de i são 2i + 1 e 2i + 2, e o pai é (i − 1) // 2. Para i = 4: filhos 9 e 10, pai 1. No desenho por níveis (0; 1 2; 3 4 5 6; 7 8 9 10 11 12 13 14), o 4 é o segundo filho do 1; como ele é o segundo nó do seu nível, os filhos dele formam o segundo par do nível de baixo: 9 e 10.',
          options: [
            { text: 'Pai no índice 1; filhos nos índices 9 e 10', correct: true, feedback: 'Isso: (4 − 1) // 2 = 1, 2 · 4 + 1 = 9 e 2 · 4 + 2 = 10.' },
            { text: 'Pai no índice 2; filhos nos índices 8 e 9', feedback: 'Essas são as contas da numeração a partir de 1 (pai i // 2, filhos 2i e 2i + 1). Na lista do Python os índices começam em 0, e as contas viram (i − 1) // 2, 2i + 1 e 2i + 2.' },
            { text: 'Pai no índice 3; filhos nos índices 5 e 6', feedback: 'Vizinhos na lista não são pai e filho: os índices 3, 5 e 6 estão no mesmo nível que o 4. A cada nível abaixo, o índice praticamente dobra.' },
            { text: 'Pai no índice 2; filhos nos índices 10 e 11', feedback: 'Errou por um nos dois: o índice 2 é pai de 5 e 6, não de 4; e os filhos de i começam em 2i + 1, não em 2i + 2.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e3-heap-2',
          kind: 'mcq',
          prompt: 'Montar um heap com n `heappush` seguidos custa O(n log n) no pior caso, mas `heapify` (de baixo para cima) custa O(n). De onde vem essa diferença?',
          difficulty: 'avancado',
          skills: ['ed-arvores'],
          hints: [
            'Num heap com n nós, quantos estão no último nível? E no penúltimo?',
            'Quanto um nó pode andar ao descer, se ele está a k níveis das folhas? E ao subir, se está a k níveis da raiz?',
          ],
          explanation: 'O trabalho de cada nó é limitado pela distância que ele pode percorrer. Descendo, é a altura do nó; subindo, é a profundidade. Como metade dos nós são folhas, um quarto está logo acima e assim por diante, a soma das alturas não passa de n, enquanto a soma das profundidades é da ordem de n · log₂ n.',
          options: [
            { text: 'No heapify, cada nó desce no máximo a sua altura, e a maioria dos nós está perto das folhas, onde descer é barato', correct: true, feedback: 'Isso: metade dos nós não desce nada, um quarto desce no máximo 1 nível, um oitavo no máximo 2... a soma fica abaixo de n.' },
            { text: 'O heapify não compara elementos, só os move', feedback: 'Compara sim: descer escolhe o menor dos filhos e compara com ele. A economia está em quantos níveis cada nó percorre.' },
            { text: 'O heapify só processa metade da lista', feedback: 'Ele processa só os pais, mas n/2 pais descendo log n níveis cada ainda dariam O(n log n). O ganho vem de a maioria desses pais estar perto do fundo.' },
            { text: 'heappush é mais lento porque usa append, que é O(n)', feedback: 'append é O(1) amortizado. O custo do heappush está em subir: no pior caso (valores em ordem decrescente num heap mínimo), cada novo elemento sobe até a raiz.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e3-heap-3',
          kind: 'predict',
          lang: 'python',
          prompt: 'O código monta um heap mínimo de baixo para cima e imprime a lista depois de cada `descer`. O que é impresso?',
          difficulty: 'intermediario',
          skills: ['ed-arvores'],
          hints: [
            'Por que o laço começa em `len(h) // 2 - 1`, e não em `len(h) - 1`? Quais índices ele visita?',
            'Em cada i, compare h[i] com os filhos 2i + 1 e 2i + 2 (se existirem) e troque com o menor deles, se ele for menor que h[i].',
            'Quando i = 0, depois da primeira troca o 9 ainda pode estar maior que os novos filhos. Confira.',
          ],
          explanation: 'Os índices 3 a 6 são folhas e já são heaps. i = 2: o 7 troca com o menor filho, o 3. i = 1: o 4 troca com o 1. i = 0: o 9 troca com o 1 e, no índice 1, ainda é maior que o filho 2, então troca de novo. Foram 4 trocas para 7 elementos.',
          code: dedent(`
            def descer(h, i):
                n = len(h)
                while True:
                    menor = i
                    for f in (2 * i + 1, 2 * i + 2):
                        if f < n and h[f] < h[menor]:
                            menor = f
                    if menor == i:
                        return
                    h[i], h[menor] = h[menor], h[i]
                    i = menor

            h = [9, 4, 7, 1, 2, 6, 3]
            for i in range(len(h) // 2 - 1, -1, -1):
                descer(h, i)
                print(i, h)
          `),
          answer: '2 [9, 4, 3, 1, 2, 6, 7]\n1 [9, 1, 3, 4, 2, 6, 7]\n0 [1, 2, 3, 4, 9, 6, 7]',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e3-heap-4',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `eh_heap(h)`, que devolve `True` se a lista `h` respeita a propriedade de heap **mínimo** (todo pai menor ou igual aos filhos) e `False` caso contrário. Lista vazia e lista com um elemento são heaps. Não use `heapq`.',
          difficulty: 'facil',
          skills: ['ed-arvores', 'ed-arrays'],
          hints: [
            'Cada elemento precisa ser comparado com quem?',
            'Você pode percorrer os pais e olhar os filhos, ou percorrer os filhos e olhar o pai de cada um. Qual dos dois dispensa testar se o índice existe?',
            'Cuidado com o último pai: ele pode ter só o filho da esquerda.',
          ],
          explanation: 'Basta conferir cada ligação pai → filho uma vez: para i de 1 a n − 1, `h[(i - 1) // 2] <= h[i]`. São n − 1 comparações, O(n). Conferir só se `h[0]` é o mínimo não basta (a regra vale em todos os níveis), e exigir a lista ordenada é forte demais: `[1, 5, 2, 6, 7, 3]` é heap sem estar ordenada.',
          starter: dedent(`
            def eh_heap(h):
                # devolva True se todo pai for <= aos seus filhos (índices 2i + 1 e 2i + 2)
                pass
          `),
          solution: dedent(`
            def eh_heap(h):
                for i in range(1, len(h)):
                    if h[(i - 1) // 2] > h[i]:
                        return False
                return True
          `),
          tests: [
            {
              name: 'heaps válidos (inclusive não ordenados)',
              code: dedent(`
                assert eh_heap([1, 3, 2, 7, 4, 5, 9, 8]) is True, "[1, 3, 2, 7, 4, 5, 9, 8] é um heap mínimo válido"
                assert eh_heap([1, 5, 2, 6, 7, 3]) is True, "[1, 5, 2, 6, 7, 3] é heap: um heap não precisa estar ordenado"
              `),
            },
            {
              name: 'vazia, um elemento, repetidos e negativos',
              code: dedent(`
                assert eh_heap([]) is True, "a lista vazia é um heap"
                assert eh_heap([7]) is True, "um elemento sozinho é um heap"
                assert eh_heap([2, 2, 2]) is True, "iguais são permitidos: a regra é pai <= filho"
                assert eh_heap([-5, -1, -3]) is True, "[-5, -1, -3] é heap: -5 <= -1 e -5 <= -3"
              `),
            },
            {
              name: 'violações',
              code: dedent(`
                assert eh_heap([3, 1]) is False, "[3, 1]: o pai 3 é maior que o filho 1"
                assert eh_heap([1, 2, 0]) is False, "[1, 2, 0]: o filho da DIREITA (índice 2) é menor que o pai"
                assert eh_heap([1, 5, 2, 3]) is False, "[1, 5, 2, 3]: o índice 3 é filho do índice 1, e 5 > 3 (não basta o menor estar na raiz)"
                assert eh_heap([1, 2, 3, 4, 0]) is False, "[1, 2, 3, 4, 0]: o índice 4 é filho do índice 1, e 2 > 0"
              `),
            },
            {
              name: '400 listas aleatórias',
              code: dedent(`
                import heapq, random
                rng = random.Random(5)
                for _ in range(400):
                    xs = [rng.randint(-9, 9) for _ in range(rng.randint(0, 12))]
                    esperado = all(xs[(i - 1) // 2] <= xs[i] for i in range(1, len(xs)))
                    assert eh_heap(xs) == esperado, f"eh_heap({xs}) devolveu {eh_heap(xs)}; esperado {esperado}"
                    heapq.heapify(xs)
                    assert eh_heap(xs) is True, f"{xs} saiu de heapify e é heap"
              `),
            },
            {
              name: 'sem heapq',
              code: 'assert "heapq" not in _source, "não use heapq: confira a regra pai <= filho você mesmo"',
            },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e3-heap-5',
          kind: 'fix',
          lang: 'python',
          prompt: 'Num app de corridas, um heap guarda os pedidos pelo horário de partida, e o passageiro pode **cancelar** um pedido que está no meio do heap. A função `remover_em(h, i)` deveria remover e devolver `h[i]`, mantendo `h` um heap mínimo em O(log n), mas tem **dois** defeitos: com certos valores de `i` ela quebra com erro, e em outros casos devolve o valor certo mas deixa um heap inválido. Corrija-a (`subir` e `descer` estão corretas).',
          difficulty: 'avancado',
          skills: ['ed-arvores'],
          hints: [
            'Teste de cabeça com `i` igual ao último índice. O que `h.pop()` faz com a posição `i`?',
            'O elemento que veio do fim da lista é sempre maior que os ancestrais da posição `i`? De que parte da árvore ele veio?',
            'Depois de pôr o substituto em `i`, ele pode precisar descer **ou** subir. Há algum problema em tentar os dois?',
          ],
          explanation: 'O último elemento vem de outro ramo da árvore: pode ser maior que os filhos de i (precisa descer) ou menor que o pai de i (precisa subir). Em `[1, 10, 2, 11, 12, 3, 4]`, remover o 11 põe o 4 embaixo do 10. Chamar subir e descer é seguro, porque no máximo um dos dois move alguma coisa. E, se i era a última posição, o `pop` já resolve. Custo: O(log n), se você souber o índice; achar o índice de um valor custa O(n), por isso filas de prioridade reais guardam um dict valor → índice ou usam a remoção preguiçosa vista em Filas de prioridade.',
          starter:
            SUBIR_DESCER +
            '\n\n' +
            dedent(`
              def remover_em(h, i):
                  """Remove e devolve h[i], mantendo h um heap mínimo."""
                  removido = h[i]
                  h[i] = h.pop()
                  descer(h, i)
                  return removido
            `),
          solution:
            SUBIR_DESCER +
            '\n\n' +
            dedent(`
              def remover_em(h, i):
                  """Remove e devolve h[i], mantendo h um heap mínimo."""
                  removido = h[i]
                  ultimo = h.pop()
                  if i < len(h):
                      h[i] = ultimo
                      subir(h, i)
                      descer(h, i)
                  return removido
            `),
          tests: [
            {
              name: 'remover a raiz',
              code: HEAP_OK + '\n' + dedent(`
                h = [1, 3, 2, 7, 4, 5, 9, 8]
                r = remover_em(h, 0)
                assert r == 1, f"deveria devolver 1; devolveu {r}"
                assert _heap_ok(h) and sorted(h) == [2, 3, 4, 5, 7, 8, 9], f"depois de remover a raiz, a lista ficou {h}"
              `),
            },
            {
              name: 'remover o último índice e o único elemento',
              code: dedent(`
                h = [1, 3, 2]
                r = remover_em(h, 2)
                assert r == 2 and h == [1, 3], f"remover o último índice de [1, 3, 2] deveria devolver 2 e deixar [1, 3]; devolveu {r} e deixou {h}"
                h = [5]
                r = remover_em(h, 0)
                assert r == 5 and h == [], f"remover o único elemento deveria devolver 5 e deixar []; deixou {h}"
              `),
            },
            {
              name: 'o substituto às vezes precisa subir',
              code: HEAP_OK + '\n' + dedent(`
                h = [1, 10, 2, 11, 12, 3, 4]
                r = remover_em(h, 3)
                assert r == 11, f"deveria devolver 11; devolveu {r}"
                assert _heap_ok(h), f"o heap ficou inválido: {h}. O 4 veio do fim e foi parar embaixo do 10"
                assert sorted(h) == [1, 2, 3, 4, 10, 12], f"os elementos que sobraram estão errados: {h}"
              `),
            },
            {
              name: '300 remoções aleatórias',
              code: HEAP_OK + '\n' + dedent(`
                import heapq, random
                rng = random.Random(11)
                for _ in range(300):
                    h = [rng.randint(0, 50) for _ in range(rng.randint(1, 25))]
                    heapq.heapify(h)
                    antes = list(h)
                    i = rng.randrange(len(h))
                    r = remover_em(h, i)
                    assert r == antes[i], f"remover_em({antes}, {i}) devolveu {r}; esperado {antes[i]}"
                    esperado = sorted(antes[:i] + antes[i + 1:])
                    assert sorted(h) == esperado, f"remover_em({antes}, {i}) deixou elementos errados: {h}"
                    assert _heap_ok(h), f"remover_em({antes}, {i}) deixou um heap inválido: {h}"
              `),
            },
            {
              name: 'O(log n) comparações',
              code: dedent(`
                class _Contado:
                    comparacoes = 0
                    def __init__(self, v):
                        self.v = v
                    def __lt__(self, o):
                        _Contado.comparacoes += 1
                        return self.v < o.v
                    def __le__(self, o):
                        _Contado.comparacoes += 1
                        return self.v <= o.v
                    def __gt__(self, o):
                        _Contado.comparacoes += 1
                        return self.v > o.v
                    def __ge__(self, o):
                        _Contado.comparacoes += 1
                        return self.v >= o.v
                    def __eq__(self, o):
                        _Contado.comparacoes += 1
                        return self.v == o.v

                n = 1023
                for i in (0, 1, 300, 600, n - 2):
                    h = [_Contado(v) for v in range(n)]    # uma lista crescente já é um heap mínimo
                    _Contado.comparacoes = 0
                    r = remover_em(h, i)
                    assert r.v == i, f"remover_em no índice {i} devolveu o valor {r.v}; esperado {i}"
                    assert _Contado.comparacoes <= 40, f"{_Contado.comparacoes} comparações para remover o índice {i} de um heap com {n} itens: isso é O(n), não O(log n). Mexa só no caminho do substituto (subir ou descer), sem reorganizar o heap inteiro"
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
          id: 'e3-heap-desafio',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `heapsort(xs)`, que ordena a lista **no lugar**, em ordem crescente, em O(n log n) no pior caso e com memória extra O(1): sem criar outra lista e sem usar `heapq`, `sorted` ou `.sort`. Plano: transforme a própria lista num heap **máximo** e, repetidamente, mande o maior para o fim da parte que ainda não está ordenada.',
          difficulty: 'desafio',
          skills: ['ed-arvores', 'ed-arrays'],
          hints: [
            'Num heap máximo, onde está o maior elemento? E em que posição ele deveria ficar na lista ordenada?',
            'Depois de mandar o maior para o fim, a parte final da lista já está pronta e não pode mais ser mexida. Que informação a sua função de descer precisa receber para não invadir essa parte?',
            'Primeiro construa o heap máximo (de baixo para cima). Depois, quantas vezes você precisa repetir "trocar o topo com o fim da parte heap e descer o novo topo"?',
          ],
          explanation: 'Construir o heap máximo custa O(n); cada uma das n − 1 retiradas custa O(log n): O(n log n) no pior caso, com qualquer entrada, inclusive já ordenada ou invertida. A memória extra é O(1) porque a parte ordenada cresce no fim da própria lista enquanto o heap encolhe no começo. O preço: não é estável e aproveita mal o cache (salta de i para 2i + 1), por isso as bibliotecas costumam preferir variantes de merge sort e quick sort e guardam o heapsort como rede de segurança.',
          starter: dedent(`
            def heapsort(xs):
                # 1. transforme xs num heap MÁXIMO (de baixo para cima)
                # 2. repita: troque xs[0] com o último da parte que ainda é heap,
                #    encolha essa parte e faça o novo xs[0] descer dentro dela
                pass
          `),
          solution: dedent(`
            def descer_max(xs, i, n):
                # desce xs[i] considerando só as posições 0..n-1
                while True:
                    maior = i
                    for f in (2 * i + 1, 2 * i + 2):
                        if f < n and xs[f] > xs[maior]:
                            maior = f
                    if maior == i:
                        return
                    xs[i], xs[maior] = xs[maior], xs[i]
                    i = maior

            def heapsort(xs):
                n = len(xs)
                for i in range(n // 2 - 1, -1, -1):
                    descer_max(xs, i, n)
                for fim in range(n - 1, 0, -1):
                    xs[0], xs[fim] = xs[fim], xs[0]
                    descer_max(xs, 0, fim)
          `),
          tests: [
            {
              name: 'exemplo',
              code: 'xs = [5, 2, 9, 1, 5, 6]\nheapsort(xs)\nassert xs == [1, 2, 5, 5, 6, 9], f"esperado [1, 2, 5, 5, 6, 9]; a lista ficou {xs}"',
            },
            {
              name: 'casos de borda',
              code: dedent(`
                for entrada in [[], [7], [2, 1], [1, 2], [3, 3, 3], [0, -4, 8, -4, -1]]:
                    xs = list(entrada)
                    heapsort(xs)
                    assert xs == sorted(entrada), f"heapsort({entrada}) deixou {xs}"
              `),
            },
            {
              name: 'já ordenada e invertida',
              code: dedent(`
                xs = list(range(60))
                heapsort(xs)
                assert xs == list(range(60)), "uma lista já ordenada deve continuar ordenada"
                xs = list(range(60, 0, -1))
                heapsort(xs)
                assert xs == list(range(1, 61)), f"a lista invertida não ficou ordenada: {xs[:10]}..."
              `),
            },
            {
              name: 'ordena no lugar',
              code: dedent(`
                xs = [3, 1, 2]
                devolvido = heapsort(xs)
                assert not (devolvido == [1, 2, 3] and xs != [1, 2, 3]), "você devolveu uma lista ordenada nova, mas a lista recebida ficou como estava: ordene no lugar, trocando os elementos dentro dela"
                assert xs == [1, 2, 3], f"heapsort([3, 1, 2]) deixou {xs}"
              `),
            },
            {
              name: '200 listas aleatórias',
              code: dedent(`
                import random
                rng = random.Random(9)
                for _ in range(200):
                    entrada = [rng.randint(-30, 30) for _ in range(rng.randint(0, 40))]
                    xs = list(entrada)
                    heapsort(xs)
                    assert xs == sorted(entrada), f"heapsort({entrada}) deixou {xs}"
              `),
            },
            {
              name: 'sem atalhos',
              code: dedent(`
                for proibido in ["sorted(", ".sort(", "heapq"]:
                    assert proibido not in _source, f"não use {proibido.strip('(.')}: o objetivo é implementar o heapsort"
              `),
            },
            {
              name: 'O(n log n) comparações',
              code: dedent(`
                import random, math

                class _Contado:
                    comparacoes = 0
                    def __init__(self, v):
                        self.v = v
                    def __lt__(self, o):
                        _Contado.comparacoes += 1
                        return self.v < o.v
                    def __le__(self, o):
                        _Contado.comparacoes += 1
                        return self.v <= o.v
                    def __gt__(self, o):
                        _Contado.comparacoes += 1
                        return self.v > o.v
                    def __ge__(self, o):
                        _Contado.comparacoes += 1
                        return self.v >= o.v
                    def __eq__(self, o):
                        _Contado.comparacoes += 1
                        return self.v == o.v

                n = 1024
                limite = int(4 * n * math.log2(n))
                aleatoria = list(range(n))
                random.Random(3).shuffle(aleatoria)
                entradas = {
                    "aleatória": aleatoria,
                    "já ordenada": list(range(n)),
                    "invertida": list(range(n - 1, -1, -1)),
                    "com todos iguais": [7] * n,
                }
                for nome, vals in entradas.items():
                    xs = [_Contado(v) for v in vals]
                    _Contado.comparacoes = 0
                    heapsort(xs)
                    assert [x.v for x in xs] == sorted(vals), f"a lista {nome} de 1 024 elementos não ficou ordenada"
                    assert _Contado.comparacoes <= limite, f"{_Contado.comparacoes} comparações para a lista {nome} de n = {n} (limite {limite}): isso cresce como n², não como n log n. O heapsort garante O(n log n) com qualquer entrada"
              `),
            },
            {
              name: 'memória extra O(1)',
              code: dedent(`
                xs = [(i * 7919) % 1009 for i in range(1000)]
                try:
                    import tracemalloc
                    tracemalloc.start()
                    medir = True
                except Exception:
                    medir = False
                heapsort(xs)
                if medir:
                    _, pico = tracemalloc.get_traced_memory()
                    tracemalloc.stop()
                    assert pico < 4000, f"pico de {pico} bytes de memória extra: parece que outra lista foi criada; troque os elementos dentro da própria lista"
                assert xs == sorted((i * 7919) % 1009 for i in range(1000)), "a lista não ficou ordenada"
              `),
            },
          ],
        },
      },
    ],
    projeto: [
      md('**Mini-projeto: mediana do tempo de espera no ponto de ônibus.** Os tempos de espera chegam um a um, e o painel precisa mostrar a **mediana** a cada novo valor. Manter os tempos numa lista ordenada custaria O(n) por chegada, porque inserir no meio desloca os elementos. Use dois heaps: um heap máximo (com o sinal trocado, no `heapq`) com a metade menor dos tempos e um heap mínimo com a metade maior, mantendo os tamanhos com diferença de no máximo 1. A mediana está no topo de um deles (ou é a média dos dois topos). Cada chegada custa O(log n) e a mediana sai em O(1). Teste contra `statistics.median` em listas aleatórias.'),
      md('Mais adiante, no planejador de rotas, o heap é o motor do algoritmo de Dijkstra: a fila de prioridade decide qual cidade explorar em seguida.'),
      { type: 'project', projectId: 'p6-rotas' },
    ],
    revisao: [
      md(`
        - Heap binário: árvore binária completa (forma) + pai ≤ filhos (ordem), guardada numa lista.
        - Índices a partir de 0: filhos de i em 2i + 1 e 2i + 2; pai em (i − 1) // 2; folhas de n // 2 a n − 1.
        - Inserir: append e subir, O(log n). Retirar o mínimo: o último vai para a raiz e desce trocando com o **menor** filho, O(log n).
        - Construir de baixo para cima (\`heapify\`): O(n), porque cada nó desce no máximo a sua altura e a maioria dos nós tem altura pequena.
        - Achar um valor qualquer é O(n): a ordem do heap é só vertical. Ao remover do meio, o substituto pode precisar subir ou descer.
        - Heapsort: heap máximo + mandar o maior para o fim; O(n log n) no pior caso, no lugar, não estável.
      `),
      english(`
        **Vocabulary**: *binary heap*, *complete binary tree*, *heap property / heap invariant*, *sift up*, *sift down*, *bottom-up heapify*, *in-place*, *heapsort*.

        From the Python docs (module heapq): *"Heaps are binary trees for which every parent node has a value less than or equal to any of its children. We refer to this condition as the heap invariant."* The same page shows the index arithmetic: \`heap[k] <= heap[2*k+1]\` and \`heap[k] <= heap[2*k+2]\`, "counting elements from zero".

        Typical interview question: "Why can you build a heap in linear time, while sorting by comparisons needs O(n log n)?"
      `),
    ],
  },
  review: [
    ['Num heap em lista (índices a partir de 0), onde estão os filhos e o pai do índice i?', 'Filhos em 2i + 1 e 2i + 2; pai em (i − 1) // 2.'],
    ['Qual a diferença entre a regra da BST e a regra do heap mínimo?', 'BST: esquerda < nó < direita (busca qualquer valor em O(h)). Heap: pai ≤ filhos, ordem só vertical (mínimo em O(1), mas buscar um valor qualquer é O(n)).'],
    ['Como funciona a inserção num heap, e quanto custa?', 'Coloca no fim da lista e sobe trocando com o pai enquanto for menor que ele: O(log n).'],
    ['Ao retirar o mínimo, por que o elemento que desce troca com o MENOR dos filhos?', 'Porque quem sobe vira pai do outro filho; só o menor dos dois garante pai ≤ filho.'],
    ['Por que construir um heap de baixo para cima custa O(n)?', 'Cada nó desce no máximo a sua altura, e a maioria dos nós está perto das folhas: metade não desce nada, um quarto desce no máximo 1... a soma não passa de n.'],
    ['Por que a altura de um heap nunca degenera, ao contrário da BST?', 'Porque a forma é sempre uma árvore binária completa: altura ⌊log₂ n⌋, qualquer que seja a ordem de chegada.'],
    ['Ao remover um elemento do meio do heap, o que pode acontecer com o substituto que veio do fim?', 'Ele pode precisar descer (se for maior que um filho) ou subir (se for menor que o novo pai), pois veio de outro ramo.'],
    ['Quais as garantias e os pontos fracos do heapsort?', 'O(n log n) no pior caso e memória extra O(1); não é estável e aproveita mal o cache, então costuma perder para merge sort e quick sort bem implementados.'],
  ],
  references: ['clrs', 'sedgewick-algs', 'python-docs'],
});

export const lessons: Lesson[] = [balanceadas, heaps];
