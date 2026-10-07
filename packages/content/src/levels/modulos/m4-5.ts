/** Lições adicionais do módulo m4-5 (programação dinâmica e gulosos). */
import type { Lesson } from '../../types.ts';
import { code, dedent, deep, english, info, lesson, md, py, t, tip, warn } from '../../helpers.ts';

/* ------------------------------------------------------------------ */
/* Trechos reaproveitados pelos testes                                 */
/* ------------------------------------------------------------------ */

/**
 * Inteiro que representa um horário e conta as comparações (<, <=, >, >=)
 * feitas com ele; interrompe o código do estudante com uma mensagem quando
 * passa do orçamento. Serve para exigir O(n log n) sem depender de cronômetro.
 */
const HORA = dedent(`
  class _Hora(int):
      usadas = 0
      limite = None
      msg = ""

      @classmethod
      def prepara(cls, limite, msg):
          cls.usadas, cls.limite, cls.msg = 0, limite, msg

      def _conta(self):
          _Hora.usadas += 1
          if _Hora.limite is not None and _Hora.usadas > _Hora.limite:
              _Hora.limite = None
              raise AssertionError(_Hora.msg)

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

/** Confere uma resposta de subsequencia_comum: é subsequência das duas e tem o tamanho máximo. */
const CONFERE_LCS = dedent(`
  def _eh_subseq(s, t):
      it = iter(t)
      return all(ch in it for ch in s)

  def _lcs_tam(a, b):
      ant = [0] * (len(b) + 1)
      for x in a:
          cur = [0]
          for j, y in enumerate(b):
              cur.append(ant[j] + 1 if x == y else max(ant[j + 1], cur[j]))
          ant = cur
      return ant[-1]

  def _confere(a, b):
      r = subsequencia_comum(a, b)
      assert isinstance(r, str), f"subsequencia_comum({a!r}, {b!r}) deve devolver uma string; veio {r!r}"
      for t in (a, b):
          if _eh_subseq(r[::-1], t):
              dica = "as letras saem do fim para o começo; você inverteu a lista antes de devolver?"
          else:
              dica = "confira em que situação a reconstrução acrescenta uma letra e para onde ela anda depois"
          assert _eh_subseq(r, t), f"subsequencia_comum({a!r}, {b!r}) devolveu {r!r}, que não é subsequência de {t!r}: {dica}"
      esperado = _lcs_tam(a, b)
      assert len(r) == esperado, f"subsequencia_comum({a!r}, {b!r}) devolveu {r!r}, com {len(r)} letra(s); a maior subsequência comum tem {esperado}"
`);

/** Confere uma divisão de entregas: índices válidos, sem repetição e com o melhor tempo possível. */
const CONFERE_DIVIDE = dedent(`
  def _otimo(tempos):
      alcanca = 1
      for t in tempos:
          alcanca |= alcanca << t
      total = sum(tempos)
      s = max(x for x in range(total // 2 + 1) if (alcanca >> x) & 1)
      return total - s

  def _confere(tempos):
      r = divide(list(tempos))
      assert isinstance(r, list), f"divide deve devolver uma lista de índices; veio {r!r}"
      assert all(isinstance(i, int) and 0 <= i < len(tempos) for i in r), f"divide({tempos}) devolveu {r}: todo índice precisa estar entre 0 e {len(tempos) - 1}"
      assert len(set(r)) == len(r), f"divide({tempos}) devolveu {r}, com índices repetidos: cada entrega é feita uma vez só. Confira se você devolve índices (e não tempos) e se a mesma entrega não entra duas vezes na soma"
      a = sum(tempos[i] for i in r)
      b = sum(tempos) - a
      esperado = _otimo(tempos)
      assert max(a, b) == esperado, f"divide({tempos}): A ficou com {a} min e B com {b} min, e o último volta em {max(a, b)} min; dá para voltar em {esperado} min"
`);

/* ------------------------------------------------------------------ */
/* Mochila e LCS                                                       */
/* ------------------------------------------------------------------ */

const mochilaLcs = lesson({
  id: 'l4-pd-mochila-lcs',
  moduleId: 'm4-5',
  title: 'Mochila e LCS: PD em duas dimensões e a resposta por trás do número',
  titleEn: 'Knapsack and LCS: two-dimensional DP and recovering the solution',
  summary: 'Dois problemas que servem de molde para famílias inteiras de PD: escolher um subconjunto dentro de um limite (mochila 0/1) e alinhar duas sequências (maior subsequência comum). Como desenhar um estado com duas coordenadas, reconstruir a escolha a partir da tabela, guardar uma linha só sem trocar de problema, decidir entre top-down e bottom-up e entender por que Θ(n · W) não é polinomial.',
  minutes: 50,
  objectives: [
    'Modelar a mochila 0/1 com o estado (i, c) e mostrar com um exemplo por que o guloso por valor/peso falha',
    'Preencher a tabela da LCS e reconstruir uma subsequência ótima andando da última célula para trás',
    'Reduzir a memória da mochila para uma linha e explicar por que a capacidade precisa ser percorrida de cima para baixo',
    'Escolher entre top-down e bottom-up pelos estados alcançáveis, pela profundidade da recursão e pela memória',
    'Explicar por que o custo Θ(n · W) é pseudopolinomial',
  ],
  skills: ['alg-pd'],
  terms: [
    t('mochila 0/1', '0/1 knapsack', 'Escolher, entre itens com peso e valor, um subconjunto que caiba na capacidade W e tenha o maior valor total; cada item entra no máximo uma vez.', 'The 0/1 knapsack problem can be solved in O(nW) time with dynamic programming.'),
    t('mochila ilimitada', 'unbounded knapsack', 'Variante em que cada item pode ser usado quantas vezes se quiser; o troco mínimo é desse tipo.'),
    t('subsequência', 'subsequence', 'O que sobra de uma sequência quando se apagam zero ou mais elementos sem mudar a ordem dos demais; ao contrário da substring, não precisa ser contígua.'),
    t('maior subsequência comum', 'longest common subsequence (LCS)', 'A subsequência mais longa presente em duas sequências ao mesmo tempo.', 'diff works by finding a longest common subsequence of the lines of the two files.'),
    t('reconstrução da solução', 'solution reconstruction (traceback)', 'Percorrer a tabela da PD a partir da célula da resposta, refazendo a decisão que produziu cada valor, para obter a escolha e não só o número.'),
    t('vetor rolante', 'rolling array', 'Guardar só a última linha da tabela (ou as últimas) quando cada linha depende apenas da anterior.'),
    t('estados alcançáveis', 'reachable states', 'Os subproblemas que de fato aparecem a partir do problema original; a versão top-down calcula só esses.'),
    t('pseudopolinomial', 'pseudo-polynomial', 'Custo polinomial no valor numérico de um número da entrada (como W), mas exponencial na quantidade de bits usada para escrevê-lo.', 'The knapsack DP runs in pseudo-polynomial time.'),
    t('NP-difícil', 'NP-hard', 'Pelo menos tão difícil quanto qualquer problema de NP: um algoritmo polinomial para ele daria um para todos. Não se conhece nenhum.'),
  ],
  stages: {
    conceito: [
      md(`
        A lição anterior montou a receita da programação dinâmica (estado, recorrência, casos base e ordem) quase sempre com um estado de um número só: o valor do troco, o degrau da escada. Só a grade de caminhos e a distância de edição do desafio usaram tabelas com duas coordenadas. Agora vamos trabalhar de propósito com estados de duas dimensões, em dois problemas que servem de molde para muitos outros:

        - A {{mochila 0/1|0/1 knapsack}}: **escolher um subconjunto dentro de um limite**. Um entregador de aplicativo tem um baú que aguenta 8 kg e cinco pedidos esperando, cada um com peso e valor de corrida. Quais levar para ganhar o máximo? O mesmo molde serve para orçamento e projetos, tempo de prova e questões, espaço em disco e arquivos.
        - A {{maior subsequência comum|longest common subsequence (LCS)}}: **alinhar duas sequências**. É o que está por trás do \`diff\`, que mostra as linhas que mudaram entre duas versões de um arquivo, e da comparação de trechos de DNA.

        Também vamos responder a duas perguntas que ficaram no ar. A tabela diz que o melhor vale R$ 80, mas **quais** pedidos levar? (É a reconstrução da solução.) E, na prática, como escolher entre top-down e bottom-up?
      `),
    ],
    explicacao: [
      md(`
        ### Mochila 0/1: o guloso tropeça de novo
        O baú aguenta 8 kg. Os pedidos:
      `),
      {
        type: 'table',
        head: ['Pedido', 'Peso', 'Valor da corrida', 'R$ por kg'],
        rows: [
          ['farmácia', '1,2 kg', 'R$ 18', '15,0'],
          ['mercado', '3,4 kg', 'R$ 35', '10,3'],
          ['livraria', '2,5 kg', 'R$ 22', '8,8'],
          ['pet shop', '4,1 kg', 'R$ 40', '9,8'],
          ['padaria', '1,8 kg', 'R$ 15', '8,3'],
        ],
        caption: 'O guloso mais natural pega primeiro o pedido que rende mais por quilo.',
      },
      md(`
        Pelo R$/kg, o guloso leva farmácia e mercado (4,6 kg), descarta o pet shop (passaria de 8 kg), leva a livraria (7,1 kg) e descarta a padaria: **R$ 75**, com 900 g sobrando que nenhum pedido restante aproveita. O melhor é farmácia, livraria e pet shop: 7,8 kg e **R$ 80**. Levar o item mais rentável primeiro pode deixar uma sobra inútil, e o guloso nunca volta atrás. Testar todos os subconjuntos dá certo, mas são 2ⁿ: com 30 pedidos, mais de 1 bilhão.

        ### O estado precisa de duas coordenadas
        Decida um item de cada vez: o item i entra ou fica? Para decidir os itens seguintes, o que você precisa saber sobre as decisões já tomadas? Não importa **quais** itens entraram, só **quanto espaço sobrou**. Daí o estado:

        **dp[i][c] = o maior valor possível usando só os i primeiros itens, com capacidade c.**

        A recorrência olha o item i e compara as duas opções:

        - **deixar** o item i: dp[i − 1][c];
        - **levar** o item i, se peso_i ≤ c: valor_i + dp[i − 1][c − peso_i].

        dp[i][c] é o maior dos dois. Caso base: dp[0][c] = 0 (sem itens, valor zero). A resposta é dp[n][W]. São (n + 1) × (W + 1) células, cada uma calculada em O(1): Θ(n · W).

        Repare no i − 1 da opção "levar": depois que o item i vai para o baú, só os i − 1 primeiros continuam disponíveis. Com dp[i][c − peso_i], o mesmo item poderia entrar de novo, e você estaria resolvendo a {{mochila ilimitada|unbounded knapsack}}, em que cada item pode ser usado quantas vezes se quiser. O troco mínimo da lição anterior é desse tipo: a mesma moeda aparece várias vezes.
      `),
      {
        type: 'table',
        head: ['Abordagem', 'Tempo', 'Memória', 'Observação'],
        rows: [
          ['Força bruta (todos os subconjuntos)', 'Θ(2ⁿ · n)', 'Θ(n)', 'inviável a partir de uns 30 itens'],
          ['Guloso por valor/peso', 'Θ(n log n)', 'Θ(n)', 'rápido, mas errado na mochila 0/1'],
          ['PD com a tabela inteira', 'Θ(n · W)', 'Θ(n · W)', 'permite reconstruir a escolha'],
          ['PD com uma linha só', 'Θ(n · W)', 'Θ(W)', 'dá só o valor, sem a escolha'],
        ],
        caption: 'n itens, capacidade W (um inteiro, na unidade dos pesos).',
      },
      warn(`
        W é um **número**, e escrevê-lo ocupa só cerca de log₂ W dígitos binários. Por isso o custo Θ(n · W) é {{pseudopolinomial|pseudo-polynomial}}: polinomial no valor de W, exponencial no tamanho da entrada, porque cada dígito binário a mais em W pode dobrar a tabela. Com pesos em gramas e capacidade de 25 toneladas, W = 25 000 000, e 40 itens já dão uma tabela de 1 bilhão de células.

        Essa PD não contradiz o fato de a mochila 0/1 ser {{NP-difícil|NP-hard}} (ninguém conhece algoritmo polinomial no tamanho da entrada para ela). Na prática: com W pequeno (até alguns milhões de células no total), use a PD; senão, mude a unidade dos pesos se a precisão permitir, faça a PD indexada pelo valor em vez do peso quando os valores são pequenos, ou use busca com poda (*branch and bound*).
      `, 'Θ(n · W) parece polinomial, mas não é'),
      md(`
        ### Uma linha basta, se você andar de cima para baixo
        Cada linha i da tabela só lê a linha i − 1. Dá para guardar uma lista só, dp[c], e sobrescrevê-la item por item: é a técnica do {{vetor rolante|rolling array}}. O cuidado está no sentido do laço. Ao calcular dp[c], você lê dp[c − peso], que **precisa ainda conter o valor da linha anterior**.
      `),
      code('python', `
        dp = [0] * (W + 1)                      # dp[c]: melhor valor com capacidade c
        for peso, valor in itens:
            for c in range(W, peso - 1, -1):    # de W para baixo
                dp[c] = max(dp[c], valor + dp[c - peso])
      `, 'Mochila 0/1 em memória Θ(W).'),
      md(`
        Descendo de W até peso, quando você escreve dp[c], a posição menor c − peso ainda não foi reescrita nesta rodada: ela guarda a linha anterior, e o item entra no máximo uma vez. Subindo (de peso até W), dp[c − peso] pode já ter sido atualizada **com o mesmo item**, que então entra de novo: o código vira a mochila ilimitada. Mesmas linhas, sentido oposto, outro problema.

        ### Maior subsequência comum: alinhando duas sequências
        Uma {{subsequência|subsequence}} é o que sobra quando se apagam elementos sem mudar a ordem dos demais. "SPTO" é subsequência de "SAPATO" (apague os dois A), mas não é substring, porque substring precisa ser contígua. A LCS de duas sequências é a subsequência mais longa presente nas duas.

        O estado agora são **dois prefixos**: **dp[i][j] = tamanho da LCS de a[:i] e b[:j].** A recorrência olha os últimos caracteres, a[i − 1] e b[j − 1]:

        - **iguais**: dp[i][j] = dp[i − 1][j − 1] + 1. Parear os dois é sempre seguro: se uma LCS não usasse esse par, daria para trocar o último pareamento dela por ele sem perder tamanho.
        - **diferentes**: os dois não podem formar par, e pelo menos um deles fica de fora da LCS, então dp[i][j] = max(dp[i − 1][j], dp[i][j − 1]).

        Casos base: dp[0][j] = dp[i][0] = 0 (prefixo vazio). Para tamanhos m e n, o custo é Θ(m · n) em tempo e em memória.

        A tabela tem a mesma forma da distância de edição do desafio da lição anterior (prefixo contra prefixo), e as duas se conectam: quando só são permitidas **inserções e remoções** (sem substituição), o menor número de operações para transformar a em b é m + n − 2 · LCS. É isso que um \`diff\` mostra: as linhas da LCS ficam como estão; as outras aparecem como removidas (−) ou inseridas (+).
      `),
      info(`
        O \`git diff\` usa por padrão o algoritmo de Myers (1986), que encontra o menor conjunto de inserções e remoções de linhas (o mesmo que achar uma LCS das linhas) em tempo O((m + n) · D), em que D é o tamanho da diferença: muito rápido quando as duas versões são parecidas, que é o caso comum. Para não demorar em arquivos muito diferentes, o Git ainda corta caminho com heurísticas, e a opção \`--minimal\` pede o menor diff garantido. As opções \`--patience\` e \`--histogram\` usam outras heurísticas para produzir diffs mais fáceis de ler. Em bioinformática, o alinhamento global de sequências (Needleman–Wunsch) usa a mesma tabela, com pontuações para acertos, trocas e lacunas no lugar do +1.
      `, 'E o Git?'),
      md(`
        ### Reconstrução: do número à escolha
        A tabela guarda valores, não decisões. Mas cada valor veio de uma das opções da recorrência, e dá para descobrir qual comparando com as células vizinhas. A {{reconstrução da solução|solution reconstruction (traceback)}} começa na célula da resposta e refaz o caminho de trás para a frente:

        - **Mochila**, na linha i com capacidade c: se dp[i][c] == dp[i − 1][c], deixar o item i de fora já alcança esse valor; suba para a linha i − 1. Senão, o item i **entrou**: anote-o, faça c −= peso_i e suba. São n passos: Θ(n).
        - **LCS**, na célula (i, j): se a[i − 1] == b[j − 1], o caractere faz parte da LCS; anote-o e siga na diagonal para (i − 1, j − 1). Senão, vá para a célula de cima ou da esquerda que tiver o mesmo valor que dp[i][j]. Cada passo diminui i ou j: Θ(m + n). Os caracteres saem do último para o primeiro, então inverta no fim.

        Pode haver mais de uma resposta ótima. "ABCBDAB" e "BDCABA" têm três LCS de tamanho 4: BCBA, BCAB e BDAB. Qual delas sai depende de como você desempata quando as células de cima e da esquerda têm o mesmo valor.
      `),
      warn('A reconstrução precisa da tabela inteira, ou de uma tabela que registre a decisão de cada célula. A versão de uma linha só dá apenas o **valor**: as linhas antigas, que diriam o caminho, foram sobrescritas.', 'Reconstruir custa memória'),
      deep(`
        Para a LCS, dá para ter as duas coisas. O algoritmo de Hirschberg (1975) encontra uma LCS completa em tempo O(m · n) e memória linear, O(m + n). Ele roda a versão de uma linha só de cima para baixo e de baixo para cima para descobrir em que coluna a LCS cruza a linha do meio de a e então resolve recursivamente os dois pedaços, como em dividir para conquistar. O tempo continua O(m · n) porque, a cada nível da recursão, as subtabelas somam metade da área do nível anterior.
      `, 'Memória linear e reconstrução: Hirschberg'),
      md(`
        ### Top-down ou bottom-up, na prática
        A lição anterior apresentou as duas formas de PD. Com estados de duas dimensões, as diferenças começam a pesar:
      `),
      {
        type: 'table',
        head: ['Critério', 'Top-down (recursão + cache)', 'Bottom-up (tabela)'],
        rows: [
          ['Quais estados calcula', 'só os alcançáveis a partir do problema original', 'todos os da tabela, inclusive os que a resposta nunca usa'],
          ['Ordem de cálculo', 'a recursão descobre sozinha', 'você escolhe uma ordem em que cada dependência vem antes'],
          ['Pilha de chamadas', 'profundidade igual à maior cadeia de dependências: n na mochila, até m + n na LCS', 'nenhuma recursão'],
          ['Memória', 'um dicionário com cada estado visitado', 'pode guardar só a linha anterior'],
          ['Custo por estado', 'chamada de função e hash da chave', 'acesso a uma lista'],
        ],
        caption: 'O Python interrompe a recursão perto de 1 000 níveis (RecursionError): uma LCS top-down entre dois textos de 2 000 caracteres já passa disso. No Python que roda no navegador, uma recursão com @cache pode estourar a pilha antes desse limite.',
      },
      md(`
        Os {{estados alcançáveis|reachable states}} fazem muita diferença quando os pesos são "espalhados". No código desta lição, com pesos em gramas, a tabela tem 48 006 células e a versão top-down visita só 45 estados: partindo de (5, 8000), cada nível i só alcança as capacidades que sobram depois de alguma combinação dos itens já decididos, no máximo 2⁵⁻ⁱ delas. Regra prática: muitos estados inúteis (poucos itens, pesos grandes) favorecem o top-down; tabela densa, entradas longas ou memória apertada favorecem o bottom-up.
      `),
    ],
    exemplo: [
      md(`
        ### A tabela da mochila, célula por célula
        Quatro encomendas e um baú de 7 kg: A (1 kg, R$ 10), B (3 kg, R$ 40), C (4 kg, R$ 50) e D (5 kg, R$ 70). Cada linha acrescenta um item; cada coluna é uma capacidade c.
      `),
      {
        type: 'table',
        head: ['Itens disponíveis', 'c = 0', '1', '2', '3', '4', '5', '6', '7'],
        rows: [
          ['nenhum', '**0**', '0', '0', '0', '0', '0', '0', '0'],
          ['+ A (1 kg, R$ 10)', '**0**', '10', '10', '10', '10', '10', '10', '10'],
          ['+ B (3 kg, R$ 40)', '0', '10', '10', '**40**', '50', '50', '50', '50'],
          ['+ C (4 kg, R$ 50)', '0', '10', '10', '40', '50', '60', '60', '**90**'],
          ['+ D (5 kg, R$ 70)', '0', '10', '10', '40', '50', '70', '80', '**90**'],
        ],
        caption: 'Em negrito, o caminho da reconstrução, de baixo para cima.',
      },
      md(`
        Veja como sai uma célula. dp[3][7] (itens A, B e C; capacidade 7):

        - deixar C: dp[2][7] = 50;
        - levar C (4 kg): 50 + dp[2][3] = 50 + 40 = 90.

        O maior é 90. A opção "levar" lê a linha **de cima**, 4 colunas à esquerda: a capacidade que sobra depois de pôr C no baú.

        Reconstrução, a partir de dp[4][7] = 90:

        1. dp[4][7] = 90 = dp[3][7]: D pode ficar de fora. Sobe com c = 7.
        2. dp[3][7] = 90 ≠ dp[2][7] = 50: C **entrou**. c = 7 − 4 = 3.
        3. dp[2][3] = 40 ≠ dp[1][3] = 10: B **entrou**. c = 3 − 3 = 0.
        4. dp[1][0] = 0 = dp[0][0]: A fica de fora.

        Resposta: B e C, 7 kg, R$ 90. O guloso por R$/kg começaria por D (R$ 14/kg), não conseguiria encaixar B nem C nos 2 kg que sobram e terminaria com D e A: R$ 80.

        ### A tabela da LCS
        a = "SAPATO" nas linhas, b = "PASTO" nas colunas. A linha e a coluna do ∅ são os prefixos vazios.
      `),
      {
        type: 'table',
        head: ['', '∅', 'P', 'A', 'S', 'T', 'O'],
        rows: [
          ['∅', '0', '0', '0', '0', '0', '0'],
          ['S', '0', '0', '0', '1', '1', '1'],
          ['A', '**0**', '0', '1', '1', '1', '1'],
          ['P', '0', '**1**', '1', '1', '1', '1'],
          ['A', '0', '1', '**2**', '**2**', '2', '2'],
          ['T', '0', '1', '2', '2', '**3**', '3'],
          ['O', '0', '1', '2', '2', '3', '**4**'],
        ],
        caption: 'Em negrito, o caminho da reconstrução, da célula da resposta (canto inferior direito) até a borda.',
      },
      md(`
        Cada célula olha três vizinhas: a diagonal (quando as letras são iguais), a de cima e a da esquerda. Por exemplo, dp[4][2] compara "SAPA" com "PA": as últimas letras são iguais (A e A), então vale dp[3][1] + 1 = 1 + 1 = 2.

        Reconstrução, a partir de dp[6][5] = 4:

        1. O = O: entra **O**; diagonal para (5, 4).
        2. T = T: entra **T**; diagonal para (4, 3).
        3. A ≠ S: a célula de cima, dp[3][3], vale 1; a da esquerda, dp[4][2], vale 2, o mesmo que dp[4][3]. Vai para a esquerda.
        4. A = A: entra **A**; diagonal para (3, 1).
        5. P = P: entra **P**; diagonal para (2, 0), na borda. Fim.

        Lidas de trás para a frente, as letras O, T, A, P dão **PATO**, a única LCS de tamanho 4 dessas duas palavras.
      `),
    ],
    codigo: [
      py(`
        from functools import cache

        # (pedido, peso em gramas, valor da corrida em R$)
        pedidos = [("farmácia", 1200, 18), ("mercado", 3400, 35), ("livraria", 2500, 22),
                   ("pet shop", 4100, 40), ("padaria", 1800, 15)]
        W = 8000   # o baú aguenta 8 kg

        def bottom_up(pedidos, W):
            n = len(pedidos)
            dp = [[0] * (W + 1) for _ in range(n + 1)]   # dp[i][c]
            for i in range(1, n + 1):
                _, peso, valor = pedidos[i - 1]
                for c in range(W + 1):
                    dp[i][c] = dp[i - 1][c]                                    # deixa o pedido i
                    if peso <= c:
                        dp[i][c] = max(dp[i][c], valor + dp[i - 1][c - peso])  # leva o pedido i
            escolhidos, c = [], W                # reconstrução: da última linha para a primeira
            for i in range(n, 0, -1):
                if dp[i][c] != dp[i - 1][c]:     # o valor mudou na linha i: o pedido i entrou
                    escolhidos.append(pedidos[i - 1][0])
                    c -= pedidos[i - 1][1]
            return dp[n][W], escolhidos[::-1], (n + 1) * (W + 1)

        def top_down(pedidos, W):
            @cache
            def melhor(i, c):                    # melhor valor com os i primeiros e capacidade c
                if i == 0:
                    return 0
                _, peso, valor = pedidos[i - 1]
                fora = melhor(i - 1, c)
                if peso > c:
                    return fora
                return max(fora, valor + melhor(i - 1, c - peso))
            return melhor(len(pedidos), W), melhor.cache_info().currsize

        def guloso_por_kg(pedidos, W):
            total, livre = 0, W
            for _, peso, valor in sorted(pedidos, key=lambda p: p[2] / p[1], reverse=True):
                if peso <= livre:
                    total, livre = total + valor, livre - peso
            return total

        valor, quais, celulas = bottom_up(pedidos, W)
        print(f"bottom-up: R$ {valor} levando {quais} ({celulas} células)")
        valor, estados = top_down(pedidos, W)
        print(f"top-down:  R$ {valor} ({estados} estados visitados)")
        print(f"guloso por R$/kg: R$ {guloso_por_kg(pedidos, W)}")
      `, { caption: 'As duas formas de PD dão o mesmo valor, mas a tabela tem 48 006 células e o top-down visita só os estados alcançáveis. Experimente pesos em quilos inteiros (1, 3, 2, 4 e 2) com W = 8: a tabela cai para 54 células, o top-down visita 29, e a vantagem praticamente some. Repare também que arredondar os pesos mudou a resposta: trocar a unidade só vale quando a precisão perdida não importa.' }),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e4-mlcs-1',
          kind: 'fill',
          lang: 'python',
          prompt: 'Complete a mochila 0/1 bottom-up. Cada lacuna é um índice da tabela.',
          difficulty: 'facil',
          skills: ['alg-pd'],
          hints: [
            'Na opção "deixar o item i", quais itens continuam disponíveis para ocupar a capacidade c?',
            'Na opção "levar o item i", quanta capacidade sobra depois de pôr o item no baú? E o item i pode entrar de novo?',
            'As duas opções leem a mesma linha da tabela. Qual linha guarda o melhor resultado com um item a menos?',
          ],
          explanation: 'Deixar o item i vale dp[i − 1][c]: o melhor com os itens anteriores e a mesma capacidade. Levar vale valor + dp[i − 1][c − peso]: o item ocupa peso e não pode entrar de novo, então o resto vem da linha anterior. Com dp[i][c − peso] na segunda opção, o item poderia ser repetido, e o código resolveria a mochila ilimitada.',
          template: dedent(`
            def mochila(itens, W):
                n = len(itens)
                dp = [[0] * (W + 1) for _ in range(n + 1)]
                for i in range(1, n + 1):
                    peso, valor = itens[i - 1]
                    for c in range(W + 1):
                        dp[i][c] = dp[___][c]               # deixa o item i
                        if peso <= c:                       # cabe? então pode levar
                            dp[i][c] = max(dp[i][c], valor + dp[___][___])
                return dp[n][W]
          `),
          blanks: [['i - 1', 'i-1', 'i -1', 'i- 1'], ['i - 1', 'i-1', 'i -1', 'i- 1'], ['c - peso', 'c-peso', 'c -peso', 'c- peso']],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e4-mlcs-2',
          kind: 'predict',
          lang: 'python',
          prompt: 'Este código roda a mochila de uma linha só duas vezes, mudando apenas o sentido em que percorre a capacidade. O que ele imprime?',
          difficulty: 'intermediario',
          skills: ['alg-pd'],
          hints: [
            'Na mochila 0/1, que combinações dos dois itens cabem em 7? E se um item pudesse ser repetido?',
            'No sentido crescente, quando o código calcula dp[6] com o item de peso 3, dp[3] já foi atualizado com esse mesmo item nesta rodada?',
            'Faça à mão a primeira rodada (item de peso 3) nos dois sentidos e compare dp[6] e dp[7].',
          ],
          explanation: 'Descendo, cada item entra no máximo uma vez: os dois juntos pesam 8 e não cabem, então o melhor é o item de peso 5, que vale 70. Subindo, dp[3] já vale 50 quando dp[6] é calculado na mesma rodada, e dp[6] = 50 + dp[3] = 100: o item de peso 3 entrou duas vezes. É a mochila ilimitada, em que 3 + 3 = 6 kg valem 100, e dp[7] herda esse valor.',
          code: dedent(`
            def mochila_1d(itens, W, crescente):
                dp = [0] * (W + 1)
                for peso, valor in itens:
                    if crescente:
                        faixa = range(peso, W + 1)
                    else:
                        faixa = range(W, peso - 1, -1)
                    for c in faixa:
                        dp[c] = max(dp[c], valor + dp[c - peso])
                return dp[W]

            itens = [(3, 50), (5, 70)]
            print(mochila_1d(itens, 7, False), mochila_1d(itens, 7, True))
          `),
          answer: '70 100',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e4-mlcs-3',
          kind: 'parsons',
          lang: 'python',
          prompt: 'Monte a função que calcula o **tamanho** da LCS de a e b, preenchendo a tabela linha por linha (o laço de i fica por fora).',
          difficulty: 'intermediario',
          skills: ['alg-pd'],
          hints: [
            'O que precisa existir antes de qualquer laço?',
            'Qual comparação decide entre a diagonal e o maior dos vizinhos?',
            'Onde está a resposta quando a tabela inteira foi preenchida, e em que nível de indentação fica o return?',
          ],
          explanation: 'Primeiro, a tabela de zeros com uma linha e uma coluna a mais para os prefixos vazios. Depois, os dois laços, com i por fora; dentro deles, a comparação dos últimos caracteres decide entre diagonal + 1 e o maior dos vizinhos. O return fica fora dos laços, porque a resposta está na última célula. Preencher linha por linha funciona porque cada célula só depende de células da linha anterior ou da mesma linha, mais à esquerda.',
          lines: [
            'def tamanho_lcs(a, b):',
            '    dp = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]',
            '    for i in range(1, len(a) + 1):',
            '        for j in range(1, len(b) + 1):',
            '            if a[i - 1] == b[j - 1]:',
            '                dp[i][j] = dp[i - 1][j - 1] + 1',
            '            else:',
            '                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])',
            '    return dp[len(a)][len(b)]',
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e4-mlcs-4',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Escreva \`subsequencia_comum(a, b)\` que devolve **uma** maior subsequência comum de a e b, como string. Exemplo: \`subsequencia_comum("SAPATO", "PASTO")\` devolve \`"PATO"\`.

            Quando houver mais de uma resposta de tamanho máximo, qualquer uma serve. Os textos podem passar de cem caracteres, então testar todas as subsequências não termina a tempo.
          `),
          difficulty: 'intermediario',
          skills: ['alg-pd'],
          hints: [
            'Antes de achar as letras, você precisa saber o tamanho da LCS de todos os prefixos. Qual tabela dá isso?',
            'De que célula a reconstrução começa? Em cada célula, que pergunta revela de onde o valor veio?',
            'Se as letras são iguais, para onde você anda? Se são diferentes, como escolher entre a célula de cima e a da esquerda?',
            'Em que ordem as letras são encontradas? O que precisa acontecer antes de devolver?',
            'Teste ("", "ABC") e ("ABC", "XYZ"): o laço da reconstrução termina e devolve a string vazia?',
          ],
          explanation: 'A tabela dá dp[i][j] para todos os pares de prefixos em Θ(m · n). A reconstrução começa em (m, n): letras iguais entram na resposta e o caminho segue na diagonal; letras diferentes levam à célula vizinha que tem o mesmo valor (em caso de empate, qualquer uma). Como as letras aparecem do fim para o começo, é preciso inverter antes de devolver. Atalhos gulosos não servem: parear cada letra de a com a próxima ocorrência em b dá "ABA" para "ABCBDAB" e "BDCABA", mas a LCS tem 4 letras.',
          starter: dedent(`
            def subsequencia_comum(a, b):
                # 1. preencha dp[i][j] = tamanho da LCS de a[:i] e b[:j]
                # 2. ande de dp[len(a)][len(b)] até a borda refazendo as decisões
                #    e devolva as letras da LCS, na ordem certa, como uma string
                pass
          `),
          solution: dedent(`
            def subsequencia_comum(a, b):
                m, n = len(a), len(b)
                dp = [[0] * (n + 1) for _ in range(m + 1)]
                for i in range(1, m + 1):
                    for j in range(1, n + 1):
                        if a[i - 1] == b[j - 1]:
                            dp[i][j] = dp[i - 1][j - 1] + 1
                        else:
                            dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
                letras = []
                i, j = m, n
                while i > 0 and j > 0:
                    if a[i - 1] == b[j - 1]:
                        letras.append(a[i - 1])
                        i -= 1
                        j -= 1
                    elif dp[i - 1][j] >= dp[i][j - 1]:
                        i -= 1
                    else:
                        j -= 1
                return "".join(reversed(letras))
          `),
          tests: [
            {
              name: 'SAPATO e PASTO',
              code: CONFERE_LCS + '\n' + dedent(`
                _confere("SAPATO", "PASTO")
                _r = subsequencia_comum("SAPATO", "PASTO")
                assert _r == "PATO", f"a única LCS de SAPATO e PASTO é PATO; veio {_r!r}"
              `),
            },
            {
              name: 'vazias, nada em comum e iguais',
              code: CONFERE_LCS + '\n' + dedent(`
                for _a, _b in [("", "ABC"), ("ABC", ""), ("", ""), ("ABC", "XYZ"), ("A", "A"), ("BRASIL", "BRASIL")]:
                    _confere(_a, _b)
              `),
            },
            {
              name: 'letras repetidas e mais de uma resposta',
              code: CONFERE_LCS + '\n' + dedent(`
                for _a, _b in [("ABCBDAB", "BDCABA"), ("AAAA", "AA"), ("ABAB", "BABA"), ("PALMEIRAS", "PARMERA"), ("ARARA", "ARRAIA")]:
                    _confere(_a, _b)
              `),
            },
            {
              name: 'aleatório',
              code: CONFERE_LCS + '\n' + dedent(`
                import random
                for _ in range(300):
                    _a = "".join(random.choice("ACGT") for _ in range(random.randint(0, 12)))
                    _b = "".join(random.choice("ACGT") for _ in range(random.randint(0, 12)))
                    _confere(_a, _b)
              `),
            },
            {
              name: 'textos longos (precisa ser PD)',
              code: CONFERE_LCS + '\n' + dedent(`
                import random
                _a = "".join(random.choice("ACGT") for _ in range(160))
                _b = "".join(random.choice("ACGT") for _ in range(140))
                _confere(_a, _b)
              `),
            },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e4-mlcs-5',
          kind: 'mcq',
          prompt: 'A PD da mochila 0/1 roda em Θ(n · W). Mesmo assim, a mochila 0/1 é NP-difícil: não se conhece algoritmo polinomial para ela. Por que não há contradição?',
          difficulty: 'avancado',
          skills: ['alg-pd', 'alg-complexidade'],
          hints: [
            'Quantos dígitos binários você precisa para escrever o número 1 000 000? E quantas colunas a tabela teria com W = 1 000 000?',
            'Se você acrescenta um dígito binário a W, o que acontece com o tamanho da entrada? E com o número de colunas?',
            '"Polinomial" é medido em relação a quê?',
          ],
          explanation: 'O tamanho da entrada é a quantidade de bits para escrevê-la: os n pesos e valores e o número W, que ocupa uns log₂ W bits. Um custo proporcional a W é proporcional a 2 elevado ao número de bits de W, ou seja, exponencial no tamanho da entrada. Por isso a PD é chamada de pseudopolinomial. Ela é excelente quando W é pequeno (pesos em quilos, capacidade de alguns milhares) e inviável quando W é astronômico (pesos em gramas, capacidade em toneladas).',
          options: [
            { text: 'Polinomial se mede no tamanho da entrada em bits. W ocupa uns log₂ W bits, então n · W pode ser exponencial nesse tamanho: cada bit a mais em W pode dobrar a tabela.', correct: true, feedback: 'Isso. Θ(n · W) é pseudopolinomial: polinomial no valor numérico de W, não na quantidade de dígitos usada para escrevê-lo.' },
            { text: 'Porque Θ(n · W) é exponencial em n: cada item novo dobra o tamanho da tabela.', feedback: 'Cada item novo acrescenta só uma linha à tabela: em n, o custo é linear. O problema está em W, que pode ser enorme mesmo escrito com poucos dígitos.' },
            { text: 'Porque a PD só encontra uma aproximação do ótimo; a resposta exata exigiria testar todos os subconjuntos.', feedback: 'A PD é exata: em cada estado ela compara as duas opções e nunca descarta a melhor. O que pode ser inviável é o custo, não a resposta.' },
            { text: 'Porque a PD só funciona quando os pesos são todos diferentes; com pesos repetidos, ela pode errar.', feedback: 'Pesos repetidos não atrapalham: cada item tem a sua própria linha na tabela, qualquer que seja o peso.' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e4-mlcs-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Dois entregadores saem juntos do restaurante e dividem as entregas da noite. A entrega i leva \`tempos[i]\` minutos (ida e volta), e cada entregador faz as suas uma depois da outra. O restaurante fecha quando **o último** volta.

            Escreva \`divide(tempos)\` que devolve a lista de **índices** das entregas do entregador A (o B faz todas as outras) de modo que o último a voltar volte o mais cedo possível. Os tempos são inteiros positivos, e qualquer divisão ótima serve. Exemplo: para \`[3, 3, 2, 2, 2]\`, uma resposta é \`[0, 1]\` (A: 3 + 3 = 6 min; B: 2 + 2 + 2 = 6 min).

            Os testes usam até 60 entregas de até 150 minutos cada.
          `),
          difficulty: 'desafio',
          skills: ['alg-pd'],
          hints: [
            'Se A fica com soma s e o total é T, quando o último volta? Para que valores de s essa conta é a menor?',
            'A pergunta vira: qual é a maior soma s ≤ T // 2 que dá para formar com algumas entregas, cada uma usada no máximo uma vez? Com que problema da lição isso se parece?',
            'Que estado responde "dá para somar exatamente s usando só as i primeiras entregas?" Quais são as opções da recorrência?',
            'Para devolver os índices, e não só a soma, o que você precisa guardar? Andando da última linha para a primeira, em que situação a entrega i obrigatoriamente entrou?',
            'O guloso "a maior entrega vai para quem está mais livre" funciona em [3, 3, 2, 2, 2]?',
          ],
          explanation: 'Se A soma s, o último volta em max(s, T − s), que é mínimo quando s é a maior soma alcançável que não passa de T // 2. É uma mochila 0/1 em que o valor de cada item é o próprio peso (o problema da soma de subconjuntos, *subset sum*): alcanca[i][s] = alcanca[i − 1][s] ou (t_i ≤ s e alcanca[i − 1][s − t_i]). A tabela custa Θ(n · T), pseudopolinomial como a mochila. Na reconstrução, se alcanca[i − 1][s] é falso, a entrega i precisou entrar: anote-a e subtraia o tempo dela de s. O guloso (maior entrega para quem está mais livre) dá 7 minutos em [3, 3, 2, 2, 2]; o ótimo é 6.',
          starter: dedent(`
            def divide(tempos):
                # devolva a lista de índices das entregas do entregador A
                # (o B faz as outras) para que o último volte o mais cedo possível
                return []
          `),
          solution: dedent(`
            def divide(tempos):
                n = len(tempos)
                meta = sum(tempos) // 2
                # alcanca[i][s]: dá para somar exatamente s com as i primeiras entregas?
                alcanca = [[False] * (meta + 1) for _ in range(n + 1)]
                alcanca[0][0] = True
                for i in range(1, n + 1):
                    t = tempos[i - 1]
                    for s in range(meta + 1):
                        alcanca[i][s] = alcanca[i - 1][s] or (t <= s and alcanca[i - 1][s - t])
                s = max(x for x in range(meta + 1) if alcanca[n][x])
                escolhidas = []
                for i in range(n, 0, -1):
                    if not alcanca[i - 1][s]:      # sem a entrega i não chega em s: ela entrou
                        escolhidas.append(i - 1)
                        s -= tempos[i - 1]
                return escolhidas[::-1]
          `),
          tests: [
            { name: 'exemplo: o guloso não basta', code: CONFERE_DIVIDE + '\n_confere([3, 3, 2, 2, 2])' },
            {
              name: 'bordas: nenhuma, uma, iguais',
              code: CONFERE_DIVIDE + '\n' + dedent(`
                for _ts in ([], [7], [5, 5], [1, 1, 1], [10, 1, 1], [4, 4, 4, 4]):
                    _confere(_ts)
              `),
            },
            {
              name: 'aleatórios pequenos',
              code: CONFERE_DIVIDE + '\n' + dedent(`
                import random
                for _ in range(300):
                    _confere([random.randint(1, 20) for _ in range(random.randint(0, 10))])
              `),
            },
            {
              name: 'muitas entregas (precisa ser PD)',
              code: CONFERE_DIVIDE + '\n' + dedent(`
                import random
                for _ in range(3):
                    _confere([random.randint(1, 150) for _ in range(60)])
              `),
            },
          ],
        },
      },
    ],
    projeto: [
      md(`
        **Mini-projeto: o seu \`diff\`**. Escreva \`diff(antigo, novo)\` que recebe duas listas de linhas e imprime o resultado no estilo do Git: linhas comuns com dois espaços na frente, removidas com "- " e inseridas com "+ ", na ordem em que aparecem. Use a LCS das **linhas** (a mesma tabela, comparando strings inteiras em vez de caracteres) e a reconstrução. Teste com duas versões de um texto seu.

        Depois: (1) mostre só as linhas alteradas com duas linhas de contexto ao redor, como o \`git diff\`; (2) meça o tempo com arquivos de 5 000 linhas e explique por que o Git não monta a tabela inteira (pesquise *Myers diff algorithm*).
      `),
    ],
    revisao: [
      md(`
        - Mochila 0/1: dp[i][c] = melhor valor com os i primeiros itens e capacidade c; deixar (dp[i − 1][c]) ou levar (valor + dp[i − 1][c − peso]). Θ(n · W), pseudopolinomial.
        - Ler a linha i − 1 na opção "levar" impede repetir o item. Com uma linha só, percorra c de W para baixo; no sentido crescente, o código vira mochila ilimitada.
        - LCS: dp[i][j] para pares de prefixos; letras iguais → diagonal + 1; diferentes → max(cima, esquerda). Θ(m · n). Só com inserções e remoções, a distância é m + n − 2 · LCS.
        - Reconstrução: da célula da resposta para trás, refazendo a decisão de cada passo. Precisa da tabela inteira.
        - Top-down calcula só os estados alcançáveis, mas usa a pilha; bottom-up não tem recursão e permite guardar só a linha anterior.
      `),
      english(`
        - **knapsack (0/1, unbounded, fractional)**: mochila (0/1, ilimitada, fracionária)
        - **longest common subsequence (LCS)**: maior subsequência comum
        - **subsequence vs. substring**: subsequência (pode pular elementos) × substring (contígua)
        - **traceback / reconstruct the solution**: reconstruir a solução a partir da tabela
        - **pseudo-polynomial time**: tempo pseudopolinomial
        - **rolling array**: vetor rolante, guardar só a linha anterior

        Frase típica de entrevista: *"The table is n by W, so the DP runs in O(nW) time, which is pseudo-polynomial. If we only need the value, we can keep a single row and iterate the capacity backwards, so each item is used at most once."*

        Frase típica de documentação: *"Returns one longest common subsequence of the two sequences; if several exist, which one is returned is unspecified."*
      `),
    ],
  },
  review: [
    ['Na mochila 0/1, o que dp[i][c] representa e qual é a recorrência?', 'O maior valor usando só os i primeiros itens com capacidade c: max(dp[i − 1][c], valor_i + dp[i − 1][c − peso_i]), a segunda opção só quando peso_i ≤ c.'],
    ['Na mochila com uma linha só, em que sentido se percorre a capacidade, e o que acontece no outro sentido?', 'De W para baixo, para que dp[c − peso] ainda seja da linha anterior. De baixo para cima, o mesmo item entra várias vezes: vira a mochila ilimitada.'],
    ['Qual é a recorrência da LCS quando os últimos caracteres são iguais? E quando são diferentes?', 'Iguais: dp[i − 1][j − 1] + 1. Diferentes: max(dp[i − 1][j], dp[i][j − 1]).'],
    ['Como descobrir, olhando a tabela da mochila, se o item i entrou na solução?', 'Na capacidade c corrente, se dp[i][c] ≠ dp[i − 1][c], o item i entrou: anote-o, faça c −= peso_i e passe à linha i − 1.'],
    ['Por que Θ(n · W) não torna a mochila 0/1 um problema polinomial?', 'W ocupa só uns log₂ W bits na entrada; um custo proporcional a W é exponencial nesse tamanho (pseudopolinomial).'],
    ['Qual é o menor número de inserções e remoções que transforma a em b, em função da LCS?', 'm + n − 2 · LCS, com m e n os tamanhos de a e b.'],
    ['Quando o top-down leva vantagem sobre o bottom-up, e quando ele é perigoso em Python?', 'Quando poucos estados são alcançáveis (pesos grandes e espalhados). É perigoso quando a cadeia de dependências é longa: passa de ~1 000 níveis e dá RecursionError.'],
  ],
  references: ['clrs', 'kleinberg-tardos', 'mit-6006', 'stanford-cs161'],
});

/* ------------------------------------------------------------------ */
/* Escolha gulosa e prova: escalonamento de intervalos                 */
/* ------------------------------------------------------------------ */

const intervalos = lesson({
  id: 'l4-guloso-intervalos',
  moduleId: 'm4-5',
  title: 'Escolha gulosa e prova: escalonamento de intervalos',
  titleEn: 'Greedy choice and proof: interval scheduling',
  summary: 'Como saber se um algoritmo guloso está certo: derrubar regras plausíveis com contraexemplos e provar as que resistem com o argumento de troca e com o "guloso se mantém à frente". Aplicado à quadra do bairro (máximo de reservas), às salas da semana de provas (mínimo de salas) e ao ponto em que o guloso para de funcionar e a PD volta: intervalos com valores.',
  minutes: 50,
  objectives: [
    'Derrubar regras gulosas plausíveis com contraexemplos pequenos e com comparação contra força bruta',
    'Implementar o escalonamento de intervalos (termina mais cedo primeiro) em O(n log n) e provar que ele é ótimo',
    'Calcular o mínimo de salas pela profundidade e alocar salas com uma fila de prioridade',
    'Reconhecer quando nenhum guloso serve e resolver intervalos com valores com PD e busca binária',
  ],
  skills: ['alg-pd'],
  terms: [
    t('contraexemplo', 'counterexample', 'Uma entrada concreta em que a regra dá resposta pior que a ótima; um só basta para derrubar a regra.'),
    t('escalonamento de intervalos', 'interval scheduling', 'Escolher o maior número de intervalos que não se sobrepõem dois a dois.', 'Interval scheduling is solved by the earliest-finish-time-first greedy algorithm.'),
    t('intervalo semiaberto', 'half-open interval', '[início, fim): inclui o início e exclui o fim; uma reserva que termina às 10h não colide com outra que começa às 10h.'),
    t('argumento de troca', 'exchange argument', 'Prova que pega uma solução ótima qualquer e troca, passo a passo, os elementos dela pelos do guloso sem piorar o resultado.', 'We prove optimality with an exchange argument.'),
    t('propriedade da escolha gulosa', 'greedy-choice property', 'Existe uma solução ótima que contém a escolha gulosa; fazê-la nunca fecha a porta para o ótimo.'),
    t('o guloso se mantém à frente', 'greedy stays ahead', 'Prova que mostra, por indução, que depois de cada passo o guloso está pelo menos tão bem quanto qualquer outra solução.'),
    t('particionamento de intervalos', 'interval partitioning', 'Distribuir todos os intervalos no menor número de recursos (salas, máquinas) sem sobreposição dentro de cada recurso.'),
    t('profundidade', 'depth', 'O maior número de intervalos que acontecem num mesmo instante; é o mínimo de salas necessário.'),
    t('mochila fracionária', 'fractional knapsack', 'Mochila em que se pode levar uma fração de cada item; o guloso por valor/peso é ótimo.'),
    t('escalonamento de intervalos com pesos', 'weighted interval scheduling', 'Variante em que cada intervalo tem um valor e se quer o maior valor total; nenhuma regra gulosa conhecida resolve, mas a PD resolve em O(n log n).'),
    t('matroide', 'matroid', 'Estrutura combinatória em que o guloso "ordene por peso e pegue o que couber" é ótimo para quaisquer pesos; as florestas de um grafo (algoritmo de Kruskal) são o exemplo clássico.'),
  ],
  stages: {
    conceito: [
      md(`
        Um algoritmo guloso monta a resposta uma decisão de cada vez, sempre pela opção que parece melhor agora, e nunca volta atrás. Quando funciona, é imbatível em simplicidade e velocidade: em geral, uma ordenação e uma passada, O(n log n). O problema é que "parece certo" não prova nada. Você já viu dois gulosos plausíveis errarem: o troco com moedas [1, 3, 4] e a mochila 0/1 pela maior razão valor/peso.

        Esta lição é sobre o método completo: **propor** uma regra, **atacá-la** com entradas pequenas feitas para quebrá-la e, se ela resistir, **provar** que está certa. O laboratório é um problema do dia a dia: a quadra poliesportiva do bairro recebe pedidos de reserva para o sábado, cada um com hora de início e de fim, e só um grupo usa a quadra por vez. Como atender o maior número de grupos? É o {{escalonamento de intervalos|interval scheduling}}. Há pelo menos quatro regras naturais, e três delas estão erradas.

        No fim, duas variações: quantas salas são necessárias para que **todos** os eventos aconteçam (outro guloso, outra prova) e o que muda quando cada pedido tem um valor diferente (o guloso perde, e a PD volta).
      `),
    ],
    explicacao: [
      md(`
        ### O problema
        Cada pedido é um {{intervalo semiaberto|half-open interval}} [início, fim): inclui o início e exclui o fim. Assim, uma reserva que termina às 10h e outra que começa às 10h são compatíveis, como na vida real. Dois pedidos p e q são compatíveis quando um termina antes de o outro começar: fim(p) ≤ início(q) ou fim(q) ≤ início(p). Todo pedido tem duração positiva. Queremos o maior conjunto de pedidos compatíveis dois a dois.

        ### Quatro regras
        Todas seguem a mesma ideia: escolher o próximo pedido por algum critério e aceitá-lo se ele não colidir com os já aceitos. Muda só o critério. Para derrubar uma regra basta um {{contraexemplo|counterexample}}:
      `),
      {
        type: 'table',
        head: ['Regra', 'A intuição', 'Contraexemplo', 'Regra × ótimo'],
        rows: [
          ['Começa mais cedo', 'ocupar a quadra logo', '[0, 10), [1, 2), [3, 4)', '1 × 2'],
          ['Mais curto primeiro', 'gastar pouco tempo de quadra', '[0, 5), [4, 6), [5, 10)', '1 × 2'],
          ['Menos conflitos primeiro', 'escolher quem atrapalha menos', 'os 11 pedidos da figura abaixo', '3 × 4'],
          ['Termina mais cedo', 'liberar a quadra o quanto antes', 'nenhum: é ótima (prova a seguir)', 'sempre igual'],
        ],
      },
      md(`
        Os dois primeiros contraexemplos se conferem de cabeça: [0, 10) começa antes de todos e bloqueia os dois pedidos curtos; [4, 6) é o mais curto e colide com [0, 5) e com [5, 10), que cabiam juntos. O terceiro precisa de mais pedidos:
      `),
      code('text', `
            0  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19
        T1  [===========)
        T2                 [===========)
        T3                                [===========)
        T4                                               [===========)
        L            [========)
        L            [========)
        L            [========)
        M                           [========)
        R                                          [========)
        R                                          [========)
        R                                          [========)
      `, 'T1 a T4 são compatíveis entre si: o ótimo é 4. Os três L são iguais, e os três R também.'),
      md(`
        Contando os conflitos: T1 e T4 têm 3 cada; T2, T3, cada L e cada R têm 4; M tem só 2 (T2 e T3). A regra escolhe M, que elimina T2 e T3. Do que sobra, o grupo da esquerda (T1 e os três L, que colidem todos com todos) rende um pedido, e o da direita também: total 3, contra 4 do ótimo, qualquer que seja o desempate.
      `),
      tip(`
        Comece com 2 ou 3 intervalos. Pergunte o que a regra "gosta" de escolher (o mais curto, o que começa cedo) e monte um caso em que essa escolha atrapalha dois pedidos que caberiam juntos. Depois, automatize: compare a regra com a força bruta em centenas de entradas pequenas sorteadas, como no código desta lição. Só não confunda passar nos testes com estar certo: a regra "menos conflitos" passa em 300 sorteios e mesmo assim está errada. Teste derruba regras; só uma prova confirma.
      `, 'Como caçar contraexemplos'),
      md(`
        ### O algoritmo: termina mais cedo primeiro
        1. Ordene os pedidos pelo fim.
        2. Percorra-os nessa ordem, guardando a hora em que a quadra fica livre (o fim do último aceito).
        3. Aceite o pedido se ele começa quando a quadra já está livre (início ≥ livre) e atualize livre = fim dele.

        Comparar só com o último aceito basta: os aceitos não se sobrepõem e saem em ordem de fim, então o último é o que termina mais tarde, e quem começa depois dele começa depois de todos. Custo: O(n log n) da ordenação mais O(n) da passada.

        ### Por que está certo: duas provas
        **Argumento de troca.** O {{argumento de troca|exchange argument}} pega uma solução ótima qualquer e a transforma, sem piorar, até ela coincidir com a do guloso. Seja g o pedido que termina mais cedo de todos e seja O uma solução ótima, em ordem de fim, começando por o₁. Como g termina mais cedo de todos, fim(g) ≤ fim(o₁). Os outros pedidos de O começam a partir de fim(o₁), porque são compatíveis com o₁ e terminam depois dele; logo, também começam depois de fim(g). Trocar o₁ por g não cria conflito, e O continua com o mesmo tamanho. Existe, então, uma solução ótima que contém g: é a {{propriedade da escolha gulosa|greedy-choice property}}, a escolha gulosa nunca fecha a porta para o ótimo. Depois dela sobra o mesmo problema, menor, com os pedidos que começam a partir de fim(g) (subestrutura ótima), e por indução cada escolha seguinte também é segura.

        **O guloso se mantém à frente.** A segunda técnica, {{o guloso se mantém à frente|greedy stays ahead}}, compara as duas soluções passo a passo. Sejam g₁, g₂, …, gₖ os pedidos do guloso e o₁, o₂, …, oₘ os de uma solução ótima, ambos em ordem de fim. Afirmação: fim(gᵣ) ≤ fim(oᵣ) para todo r ≤ k. Para r = 1, é a própria regra. Se vale para r − 1, então oᵣ começa a partir de fim(oᵣ₋₁) ≥ fim(gᵣ₋₁): oᵣ estava disponível quando o guloso fez a escolha r, e o guloso pegou o disponível que termina mais cedo; logo, fim(gᵣ) ≤ fim(oᵣ). Agora suponha m > k: oₖ₊₁ começaria a partir de fim(oₖ) ≥ fim(gₖ), e o guloso não teria parado com um pedido compatível sobrando. Então m = k.

        ### Outro problema, outra prova: quantas salas?
        Agora a pergunta muda. Na semana de provas do cursinho, **todas** as provas precisam acontecer, cada uma numa sala, e uma sala não recebe duas provas ao mesmo tempo. Qual é o menor número de salas? É o {{particionamento de intervalos|interval partitioning}}.

        Aqui a prova não é por troca, e sim por um **limite estrutural**. A {{profundidade|depth}} d de um conjunto de intervalos é o maior número deles acontecendo num mesmo instante. Ninguém resolve com menos de d salas, porque as d provas simultâneas precisam de salas diferentes. O guloso a seguir usa exatamente d:

        1. Percorra as provas em ordem de **início**.
        2. Se alguma sala já está livre no início da prova, use-a; senão, abra uma sala nova.

        Por que nunca passa de d: suponha que a prova p obrigou a abrir a sala número k + 1. Então as k salas abertas estavam ocupadas no instante início(p), cada uma com uma prova que começou antes ou no mesmo horário (a ordem é de início) e ainda não terminou. Com p, são k + 1 provas acontecendo no mesmo instante, logo k + 1 ≤ d. Como d também é um limite inferior, o guloso é ótimo.

        Para saber depressa se alguma sala está livre, basta olhar a que **fica livre mais cedo**: é trabalho para uma fila de prioridade (\`heapq\`), e o total fica O(n log n).
      `),
      warn(`
        Trocar a ordem para "pelo fim", como no problema anterior, quebra o argumento. Com [2, 8), [3, 4), [6, 11) e [8, 10), essa versão abre 3 salas, mas a profundidade é 2: [2, 8) e [8, 10) cabem numa sala, [3, 4) e [6, 11) na outra. Cada guloso tem a sua ordem, e é a prova que diz qual é.
      `, 'Aqui a ordem é pelo início'),
      md(`
        ### Quando nenhum guloso serve
        Os dois problemas anteriores têm guloso provado. Basta mudar um detalhe para isso acabar:
      `),
      {
        type: 'table',
        head: ['Problema', 'Regra gulosa', 'Dá o ótimo?', 'Como resolver'],
        rows: [
          ['Escalonamento de intervalos', 'termina mais cedo', 'sim (troca ou "à frente")', 'guloso, O(n log n)'],
          ['Particionamento de intervalos', 'em ordem de início, sala que fica livre primeiro', 'sim (profundidade)', 'guloso com heap, O(n log n)'],
          ['Mochila fracionária', 'maior valor por kg; o último item entra fracionado', 'sim (troca)', 'guloso, O(n log n)'],
          ['Mochila 0/1', 'maior valor por kg', 'não', 'PD, Θ(n · W)'],
          ['Troco', 'maior moeda que cabe', 'depende das moedas: sim no real, não com [1, 3, 4]', 'PD, Θ(V · k) para k moedas'],
          ['Intervalos com valores', 'nenhuma regra conhecida', 'não', 'PD com busca binária, O(n log n)'],
        ],
      },
      md(`
        Na {{mochila fracionária|fractional knapsack}} (dá para levar meio saco de arroz), a troca funciona: se uma solução leva menos do que poderia do item de maior valor por kg e um pouco de um item pior, trocar um pedaço do pior pelo mesmo peso do melhor não diminui o valor. Na 0/1 essa troca é impossível, porque os itens não se dividem, e por isso o guloso falha.

        O caso mais instrutivo é o {{escalonamento de intervalos com pesos|weighted interval scheduling}}. O salão de festas do condomínio recebe propostas de aluguel, cada uma com um valor, e quer o maior faturamento:

        - **termina mais cedo**: com [0, 3) por R$ 100 e [2, 10) por R$ 1 000, aceita a primeira e perde a segunda;
        - **maior valor primeiro**: com [0, 10) por R$ 1 000, [0, 5) por R$ 600 e [5, 10) por R$ 600, aceita a de R$ 1 000 e perde para R$ 1 200;
        - não se conhece regra gulosa que funcione: saber se uma proposta vale a pena exige comparar a melhor agenda com ela e sem ela.

        É programação dinâmica de novo, e com uma busca binária ela roda em O(n log n): é o desafio desta lição.
      `),
      deep(`
        Existe uma teoria por trás de parte dos gulosos corretos. Quando os conjuntos "viáveis" de um problema formam um {{matroide|matroid}} (entre outras condições: se A e B são viáveis e B é maior, algum elemento de B pode ser acrescentado a A sem perder a viabilidade), o guloso "ordene por peso e pegue o que couber" é ótimo para **quaisquer** pesos não negativos (teorema de Rado–Edmonds). O exemplo clássico são as florestas de um grafo, e o guloso correspondente é o algoritmo de Kruskal da árvore geradora mínima.

        O escalonamento de intervalos **não** é um matroide: A = {[0, 10)} e B = {[0, 1), [2, 3)} são viáveis, B é maior, e nenhum elemento de B cabe junto com [0, 10). Por isso a prova dele é feita à mão, com troca ou "à frente". Fora dos matroides, cada guloso novo precisa da sua própria prova.
      `, 'Por que alguns gulosos funcionam?'),
    ],
    exemplo: [
      md(`
        ### A quadra no sábado
        Nove pedidos chegaram para a quadra (horas do dia, intervalos semiabertos):
      `),
      code('text', `
                      6  7  8  9  10 11 12 13 14 15 16
        Corrida       [=======================)
        Ginástica        [=====)
        Futsal sub-15       [=====)
        Vôlei                  [=====)
        Basquete                  [========)
        Handebol                     [==)
        Futsal adulto                      [=====)
        Capoeira                              [=====)
        Festa junina                    [===========)
      `),
      md('Ordenados pelo fim, o guloso decide assim ("livre" é a hora em que a quadra fica livre):'),
      {
        type: 'table',
        head: ['Pedido', 'Horário', 'Livre a partir de', 'Decisão'],
        rows: [
          ['Ginástica', '[7, 9)', '—', '**aceita**; livre = 9'],
          ['Futsal sub-15', '[8, 10)', '9', 'recusa: começa às 8, antes das 9'],
          ['Vôlei', '[9, 11)', '9', '**aceita** (começa exatamente às 9); livre = 11'],
          ['Handebol', '[11, 12)', '11', '**aceita**; livre = 12'],
          ['Basquete', '[10, 13)', '12', 'recusa'],
          ['Corrida', '[6, 14)', '12', 'recusa'],
          ['Futsal adulto', '[13, 15)', '12', '**aceita**; livre = 15'],
          ['Capoeira', '[14, 16)', '15', 'recusa'],
          ['Festa junina', '[12, 16)', '15', 'recusa'],
        ],
        caption: 'Quatro grupos atendidos: Ginástica, Vôlei, Handebol e Futsal adulto. A força bruta confirma que 4 é o máximo.',
      },
      md(`
        Compare com as outras regras nos mesmos pedidos:

        - **começa mais cedo** aceita a Corrida (das 6h às 14h), que bloqueia a manhã inteira, e depois só a Capoeira: **2** grupos;
        - **mais curto primeiro** começa pelo Handebol (1 hora) e, nesta entrada, desempatando os pedidos de 2 horas pela ordem da lista, também chega a 4. Uma regra errada pode acertar em muitas entradas: quem prova o erro é o contraexemplo, não o caso que deu certo.

        E veja o "se mantém à frente" funcionando. Outra agenda ótima é Ginástica, Vôlei, Handebol e Capoeira, que termina às 9, 11, 12 e 16. A do guloso termina às 9, 11, 12 e 15: em cada posição, empatada ou à frente.
      `),
    ],
    codigo: [
      py(`
        import random
        from itertools import combinations

        def agenda(pedidos):
            """Guloso ótimo: termina mais cedo primeiro. O(n log n)."""
            aceitos, livre = [], float("-inf")
            for nome, ini, fim in sorted(pedidos, key=lambda p: p[2]):
                if ini >= livre:                 # [ini, fim) não colide com o último aceito
                    aceitos.append(nome)
                    livre = fim
            return aceitos

        def compativeis(p, q):
            return p[2] <= q[1] or q[2] <= p[1]   # um termina antes de o outro começar

        def guloso_por(chave, pedidos):           # esqueleto genérico: confere com todos os aceitos
            aceitos = []
            for p in sorted(pedidos, key=chave):
                if all(compativeis(p, q) for q in aceitos):
                    aceitos.append(p)
            return len(aceitos)

        def menos_conflitos(pedidos):
            resto, total = list(pedidos), 0
            while resto:
                p = min(resto, key=lambda p: sum(not compativeis(p, q) for q in resto if q is not p))
                total += 1
                resto = [q for q in resto if q is not p and compativeis(p, q)]
            return total

        def otimo(pedidos):                       # força bruta: do maior grupo para o menor
            for k in range(len(pedidos), 0, -1):
                for grupo in combinations(pedidos, k):
                    if all(compativeis(p, q) for p, q in combinations(grupo, 2)):
                        return k
            return 0

        quadra = [("Corrida", 6, 14), ("Ginástica", 7, 9), ("Futsal sub-15", 8, 10), ("Vôlei", 9, 11),
                  ("Basquete", 10, 13), ("Handebol", 11, 12), ("Futsal adulto", 13, 15),
                  ("Capoeira", 14, 16), ("Festa junina", 12, 16)]
        print("Agenda da quadra:", agenda(quadra))

        regras = {
            "começa mais cedo": lambda ps: guloso_por(lambda p: p[1], ps),
            "mais curto": lambda ps: guloso_por(lambda p: p[2] - p[1], ps),
            "menos conflitos": menos_conflitos,
            "termina mais cedo": lambda ps: len(agenda(ps)),
        }
        random.seed(2026)
        falhas = dict.fromkeys(regras, 0)
        for _ in range(300):
            ps = [(k, ini, ini + random.randint(1, 8)) for k, ini in enumerate(random.choices(range(20), k=8))]
            melhor = otimo(ps)
            for nome, regra in regras.items():
                falhas[nome] += regra(ps) < melhor
        print("Em 300 sorteios de 8 pedidos, vezes em que a regra perdeu para o ótimo:")
        for nome, n in falhas.items():
            print(f"  {nome:<18} {n}")
      `, { caption: 'Força bruta como juiz: duas regras caem logo; "menos conflitos" passa em todos os sorteios e ainda assim está errada (veja a figura da explicação). Mude a semente, o tamanho e a duração máxima dos pedidos e rode de novo.' }),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e4-int-1',
          kind: 'mcq',
          prompt: 'A regra "aceite primeiro o pedido que **começa mais cedo**" recebe [8h, 12h), [9h, 10h) e [10h, 11h). Quantos grupos ela atende, e quantos o ótimo atende?',
          difficulty: 'facil',
          skills: ['alg-pd'],
          hints: [
            'Qual dos três pedidos começa primeiro? Depois de aceitá-lo, algum outro ainda cabe?',
            '[9h, 10h) e [10h, 11h) colidem? Lembre que o fim fica de fora do intervalo.',
          ],
          explanation: 'A regra aceita [8h, 12h) por começar primeiro, e ele colide com os outros dois. Já [9h, 10h) e [10h, 11h) são compatíveis (um termina exatamente quando o outro começa), então o ótimo é 2. Começar cedo não diz nada sobre quanto tempo o pedido prende a quadra.',
          options: [
            { text: '1 contra 2: ela aceita [8h, 12h), que bloqueia os outros dois, compatíveis entre si.', correct: true, feedback: 'Isso. Um único pedido longo, escolhido por começar cedo, ocupa o lugar de dois.' },
            { text: '2 contra 2: [9h, 10h) e [10h, 11h) também começam cedo.', feedback: 'A regra olha primeiro quem começa mais cedo de todos, [8h, 12h). Depois de aceitá-lo, os outros dois colidem com ele e são recusados.' },
            { text: '1 contra 1: os três pedidos colidem entre si.', feedback: '[9h, 10h) e [10h, 11h) não colidem: com intervalos semiabertos, terminar às 10h e começar às 10h não é conflito.' },
            { text: '3 contra 3: começando cedo, sobra tempo para todos.', feedback: '[8h, 12h) colide com os outros dois, então nenhuma agenda tem os três.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e4-int-2',
          kind: 'predict',
          lang: 'python',
          prompt: 'O que este código imprime? Ele roda o mesmo esqueleto guloso com dois critérios de ordenação.',
          difficulty: 'intermediario',
          skills: ['alg-pd'],
          hints: [
            'p[1] é o início e p[2] é o fim. Em que ordem cada chamada percorre os pedidos?',
            'Na primeira chamada, depois de aceitar a Ana, quanto vale livre? Quem começa a partir desse horário?',
            'Na segunda, acompanhe livre a cada aceite: 10, depois…?',
          ],
          explanation: 'Por início, Ana (8h às 12h) entra primeiro e prende a quadra até as 12h; Bruno, Carla e Davi começam antes disso e são recusados, e só Eva (12h) cabe. Por fim, a ordem é Bruno (10), Carla (11), Ana (12), Davi (13), Eva (14): Bruno entra (livre = 10), Carla começa às 10 e entra (livre = 11), Ana começa às 8 e fica de fora, Davi começa às 11 e entra (livre = 13), Eva começa às 12 e fica de fora. Três contra dois.',
          code: dedent(`
            def guloso(pedidos, chave):
                escolhidos, livre = [], 0
                for nome, ini, fim in sorted(pedidos, key=chave):
                    if ini >= livre:
                        escolhidos.append(nome)
                        livre = fim
                return escolhidos

            pedidos = [("Ana", 8, 12), ("Bruno", 9, 10), ("Carla", 10, 11),
                       ("Davi", 11, 13), ("Eva", 12, 14)]
            print(guloso(pedidos, lambda p: p[1]))
            print(guloso(pedidos, lambda p: p[2]))
          `),
          answer: "['Ana', 'Eva']\n['Bruno', 'Carla', 'Davi']",
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e4-int-3',
          kind: 'mcq',
          prompt: 'Na prova por troca, g é o pedido que termina mais cedo de todos e o₁ é o primeiro pedido (em ordem de fim) de uma solução ótima O. Por que trocar o₁ por g em O não cria conflito?',
          difficulty: 'intermediario',
          skills: ['alg-pd'],
          hints: [
            'O que a definição de g garante sobre o fim de g, comparado com o fim de o₁?',
            'Os outros pedidos de O começam antes ou depois de o₁ terminar? Por quê?',
            'Junte as duas coisas: onde termina g, e onde começam os outros pedidos de O?',
          ],
          explanation: 'A troca só usa duas desigualdades: fim(g) ≤ fim(o₁), porque g termina mais cedo de todos, e início(oᵢ) ≥ fim(o₁) para i ≥ 2, porque O não tem conflitos e está em ordem de fim. Juntas, dão início(oᵢ) ≥ fim(g): g cabe no lugar de o₁. Nada sobre a duração ou o início de g é usado, e é por isso que as regras "mais curto" e "começa mais cedo" não têm essa prova (nem estão certas).',
          options: [
            { text: 'Porque fim(g) ≤ fim(o₁), e todos os outros pedidos de O começam a partir de fim(o₁); logo, começam depois que g termina.', correct: true, feedback: 'Isso. As duas desigualdades juntas garantem que g ocupa o lugar de o₁ sem esbarrar em ninguém.' },
            { text: 'Porque g é o pedido mais curto, e um pedido mais curto colide com menos pedidos.', feedback: 'g não precisa ser o mais curto, e "mais curto primeiro" tem contraexemplo. O que importa é onde g termina, não quanto ele dura.' },
            { text: 'Porque g começa antes de todos os outros pedidos.', feedback: 'g pode começar tarde; ele só termina cedo. E começar cedo não evita conflito: [8h, 12h) começa cedo e atrapalha todo mundo.' },
            { text: 'Porque g não colide com nenhum outro pedido da entrada.', feedback: 'g pode colidir com vários pedidos da entrada, inclusive com o₁. A prova só precisa que ele não colida com os pedidos que continuam em O depois da troca.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e4-int-4',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            A coordenação do cursinho precisa marcar as provas da semana. Cada prova é uma tupla \`(inicio, fim)\` com horários inteiros e intervalo semiaberto [inicio, fim), e uma sala não pode receber duas provas ao mesmo tempo (uma que termina às 10 e outra que começa às 10 podem usar a mesma sala).

            Escreva \`salas_necessarias(provas)\` que devolve o **menor número de salas** para todas as provas acontecerem. Exemplo: \`salas_necessarias([(8, 10), (9, 12), (9, 11), (10, 11), (11, 13)])\` devolve 3.

            Faça em O(n log n): os testes contam as comparações entre horários com 2 000 provas.
          `),
          difficulty: 'intermediario',
          skills: ['alg-pd', 'ed-arvores'],
          hints: [
            'Antes de programar: se em algum instante 3 provas acontecem ao mesmo tempo, dá para usar menos de 3 salas? E pode ser preciso mais do que o máximo de provas simultâneas?',
            'Em que ordem as provas devem ser consideradas para que o guloso da lição funcione?',
            'Para cada prova, basta saber se a sala que fica livre mais cedo já está livre. Que estrutura devolve o menor elemento em O(log n)?',
            'Uma prova que começa exatamente quando outra termina pode usar a mesma sala. A sua comparação usa < ou <=?',
            'Teste [(2, 8), (3, 4), (6, 11), (8, 10)]: a resposta é 2. Por qual campo você está ordenando?',
          ],
          explanation: 'Em ordem de início, cada prova reaproveita a sala que fica livre mais cedo, se ela já estiver livre (fim <= início, porque o intervalo é semiaberto), ou abre uma sala nova. Uma heap com o horário de fim de cada sala responde isso em O(log n), e o total é O(n log n). O número de salas abertas nunca passa da profundidade, que também é o mínimo possível. Outra solução válida varre os eventos (+1 no início, −1 no fim, com os fins antes dos inícios no mesmo horário) e devolve o maior valor da soma acumulada.',
          starter: dedent(`
            import heapq

            def salas_necessarias(provas):
                # devolva o menor número de salas para que nenhuma sala
                # receba duas provas ao mesmo tempo
                pass
          `),
          solution: dedent(`
            import heapq

            def salas_necessarias(provas):
                livres_em = []                     # heap: horário em que cada sala aberta fica livre
                for inicio, fim in sorted(provas):
                    if livres_em and livres_em[0] <= inicio:
                        heapq.heapreplace(livres_em, fim)    # reaproveita a sala que liberou primeiro
                    else:
                        heapq.heappush(livres_em, fim)       # todas ocupadas: abre uma sala
                return len(livres_em)
          `),
          tests: [
            {
              name: 'exemplo do enunciado',
              code: dedent(`
                _r = salas_necessarias([(8, 10), (9, 12), (9, 11), (10, 11), (11, 13)])
                assert _r == 3, f"às 10h30 acontecem (9, 12), (9, 11) e (10, 11): são precisas 3 salas; veio {_r}"
              `),
            },
            {
              name: 'nenhuma, uma, encostadas, iguais e aninhadas',
              code: dedent(`
                _casos = [
                    ([], 0, "sem provas, nenhuma sala"),
                    ([(8, 9)], 1, "uma prova, uma sala"),
                    ([(8, 10), (10, 12)], 1, "a prova das 10 pode usar a sala que liberou às 10 (intervalo semiaberto)"),
                    ([(9, 11), (9, 11), (9, 11)], 3, "três provas no mesmo horário precisam de três salas"),
                    ([(8, 18), (9, 10), (11, 12)], 2, "a prova longa ocupa uma sala; as curtas revezam a outra"),
                ]
                for _provas, _esperado, _motivo in _casos:
                    _r = salas_necessarias(list(_provas))
                    assert _r == _esperado, f"salas_necessarias({_provas}) deveria ser {_esperado} ({_motivo}); veio {_r}"
              `),
            },
            {
              name: 'a ordem é pelo início',
              code: dedent(`
                _r = salas_necessarias([(2, 8), (3, 4), (6, 11), (8, 10)])
                assert _r == 2, f"[(2, 8), (3, 4), (6, 11), (8, 10)] cabe em 2 salas: (2, 8) e (8, 10) numa, (3, 4) e (6, 11) na outra; veio {_r}. Se você ordenou pelo fim, troque para o início: pelo fim, o guloso abre sala demais"
              `),
            },
            {
              name: 'aleatório',
              code: dedent(`
                import random

                def _profundidade(provas):
                    eventos = sorted([(f, -1) for _, f in provas] + [(i, 1) for i, _ in provas])
                    atual = maior = 0
                    for _, d in eventos:
                        atual += d
                        maior = max(maior, atual)
                    return maior

                for _ in range(300):
                    _provas = []
                    for _ in range(random.randint(0, 12)):
                        _i = random.randint(0, 20)
                        _provas.append((_i, _i + random.randint(1, 6)))
                    _r = salas_necessarias(list(_provas))
                    _e = _profundidade(_provas)
                    assert _r == _e, f"salas_necessarias({_provas}) deveria ser {_e}; veio {_r}"
              `),
            },
            {
              name: 'O(n log n) com 2 000 provas',
              code: HORA + '\n' + dedent(`
                import random

                def _profundidade(provas):
                    eventos = sorted([(f, -1) for _, f in provas] + [(i, 1) for i, _ in provas])
                    atual = maior = 0
                    for _, d in eventos:
                        atual += d
                        maior = max(maior, atual)
                    return maior

                _provas = []
                for _ in range(2000):
                    _i = random.randrange(1000000)
                    _provas.append((_i, _i + random.randint(1, 500000)))
                _e = _profundidade(_provas)
                _Hora.prepara(300000, "com 2 000 provas, a sua função passou de 300 000 comparações entre horários (a versão com heap faz cerca de 40 000). Você está procurando uma sala livre percorrendo todas? Use uma fila de prioridade (heapq) com o horário em que cada sala fica livre.")
                _r = salas_necessarias([(_Hora(a), _Hora(b)) for a, b in _provas])
                _Hora.limite = None
                assert _r == _e, f"com 2 000 provas, o mínimo é {_e} salas; veio {_r}"
              `),
            },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e4-int-5',
          kind: 'fix',
          lang: 'python',
          prompt: dedent(`
            Na feira livre de domingo, cada barraca fica aberta num intervalo **fechado** \`[abre, fecha]\` (inclui os dois horários). A fiscal da vigilância sanitária faz visitas instantâneas: uma visita no horário t fiscaliza todas as barracas abertas em t. \`visitas_minimas(barracas)\` deveria devolver o menor número de visitas para fiscalizar todas, com o guloso "marque a visita no último instante da barraca que **fecha** primeiro e pule as que essa visita já pegou".

            O código tem **dois** defeitos: para \`[(1, 10), (2, 3), (4, 5)]\` ele devolve 1 (o certo é 2) e para \`[(1, 3), (3, 5)]\` devolve 2 (o certo é 1, com uma visita às 3). Corrija-os.
          `),
          difficulty: 'intermediario',
          skills: ['alg-pd'],
          hints: [
            'Em que ordem o código percorre as barracas? Em que ordem o guloso descrito no enunciado deveria percorrer?',
            'Com [(1, 10), (2, 3), (4, 5)], a primeira visita fica marcada para que horário? A barraca (2, 3) está aberta nesse horário?',
            'Com intervalos fechados, uma barraca que abre exatamente no horário da última visita foi fiscalizada ou não?',
            'Releia a condição do if: ela pergunta "a última visita deixou esta barraca de fora?". Para quais valores de abre a resposta é sim?',
          ],
          explanation: 'Defeito 1: sorted(barracas) ordena pela abertura. O argumento de troca vale para a barraca que **fecha** primeiro: visitá-la no último instante (fecha) pega o máximo de outras barracas. Ordenando pela abertura, a visita às 10 da barraca (1, 10) "passa por cima" da (2, 3), que já tinha fechado. Defeito 2: com intervalos fechados, a barraca que abre exatamente no horário da última visita está aberta naquele instante e já foi fiscalizada; só é preciso visita nova quando abre > ultima. É o mesmo raciocínio do escalonamento de intervalos, e as barracas que forçam uma visita nova não têm nenhum horário em comum duas a duas, o que prova que menos visitas não bastam.',
          starter: dedent(`
            def visitas_minimas(barracas):
                # barracas: lista de (abre, fecha), intervalos FECHADOS [abre, fecha]
                visitas = 0
                ultima = None                    # horário da última visita marcada
                for abre, fecha in sorted(barracas):
                    if ultima is None or abre >= ultima:    # a última visita não pegou esta barraca
                        visitas += 1
                        ultima = fecha           # visita no último instante em que ela está aberta
                return visitas
          `),
          solution: dedent(`
            def visitas_minimas(barracas):
                # barracas: lista de (abre, fecha), intervalos FECHADOS [abre, fecha]
                visitas = 0
                ultima = None                    # horário da última visita marcada
                for abre, fecha in sorted(barracas, key=lambda b: b[1]):
                    if ultima is None or abre > ultima:     # a última visita não pegou esta barraca
                        visitas += 1
                        ultima = fecha           # visita no último instante em que ela está aberta
                return visitas
          `),
          tests: [
            {
              name: 'barraca aberta a feira toda',
              code: dedent(`
                _r = visitas_minimas([(1, 10), (2, 3), (4, 5)])
                assert _r == 2, f"[(1, 10), (2, 3), (4, 5)] precisa de 2 visitas (às 3 e às 5); veio {_r}. Uma visita às 10 não pega a barraca (2, 3)"
              `),
            },
            {
              name: 'horários encostados (intervalo fechado)',
              code: dedent(`
                _r = visitas_minimas([(1, 3), (3, 5)])
                assert _r == 1, f"[(1, 3), (3, 5)]: uma visita às 3 pega as duas barracas, porque os intervalos são fechados; veio {_r}"
              `),
            },
            {
              name: 'bordas',
              code: dedent(`
                for _bs, _e in [([], 0), ([(2, 6)], 1), ([(5, 5)], 1), ([(1, 4), (1, 4), (1, 4)], 1), ([(1, 2), (3, 4), (5, 6)], 3)]:
                    _r = visitas_minimas(list(_bs))
                    assert _r == _e, f"visitas_minimas({_bs}) deveria ser {_e}; veio {_r}"
              `),
            },
            {
              name: 'aleatório contra força bruta',
              code: dedent(`
                import random
                from itertools import combinations

                def _minimo(barracas):
                    if not barracas:
                        return 0
                    pontos = sorted({f for _, f in barracas})
                    for k in range(1, len(barracas) + 1):
                        for grupo in combinations(pontos, k):
                            if all(any(a <= p <= f for p in grupo) for a, f in barracas):
                                return k

                for _ in range(300):
                    _bs = []
                    for _ in range(random.randint(0, 7)):
                        _a = random.randint(0, 15)
                        _bs.append((_a, _a + random.randint(0, 5)))
                    _r = visitas_minimas(list(_bs))
                    _e = _minimo(_bs)
                    assert _r == _e, f"visitas_minimas({_bs}) deveria ser {_e}; veio {_r}"
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
          id: 'e4-int-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            O salão de festas do condomínio recebe propostas de aluguel. Cada proposta é uma tupla \`(inicio, fim, valor)\`: horários inteiros com inicio < fim, intervalo semiaberto [inicio, fim), e valor em reais (inteiro positivo). Só cabe um evento por vez; um que termina às 18 e outro que começa às 18 são compatíveis.

            Escreva \`melhor_faturamento(propostas)\` que devolve o **maior faturamento total** possível com propostas compatíveis entre si. Exemplo: \`melhor_faturamento([(0, 10, 1000), (0, 5, 600), (5, 10, 600)])\` devolve 1200.

            A solução precisa ser O(n log n): os testes contam as comparações entre horários com 4 000 propostas muito sobrepostas, e nesse teste os horários são números grandes (milissegundos, como os do relógio do sistema). Como n chega a milhares, prefira PD bottom-up a recursão (o limite de recursão do Python fica perto de 1 000).
          `),
          difficulty: 'desafio',
          skills: ['alg-pd', 'alg-busca'],
          hints: [
            'Ordene as propostas pelo fim e pense na última delas. Na agenda ótima, ela entra ou não entra? O que sobra para decidir em cada caso?',
            'Se ela não entra, a resposta é o ótimo das propostas anteriores. Se entra, quais das anteriores continuam compatíveis com ela? Elas formam um prefixo da lista ordenada?',
            'Defina melhor[j] = maior faturamento usando só as j primeiras propostas, em ordem de fim. Qual é a recorrência, e quanto vale melhor[0]?',
            'Para achar quantas propostas anteriores terminam até o início da proposta j, não é preciso percorrer a lista: os fins estão em ordem. Que módulo da biblioteca padrão faz busca binária? Um fim igual ao início deve contar como compatível?',
            'Se o teste de comparações falhou: quantas comparações a sua busca pela última proposta compatível faz, por proposta, quando há muita sobreposição?',
          ],
          explanation: 'Em ordem de fim, seja p(j) o número de propostas anteriores que terminam até o início da j-ésima; elas formam um prefixo, porque os fins estão ordenados. Então melhor[j] = max(melhor[j − 1], valor_j + melhor[p(j)]): ou a proposta j fica de fora, ou entra e só as p(j) primeiras continuam disponíveis. São n estados, cada um com uma busca binária (bisect_right nos fins, para que fim igual ao início conte como compatível): O(n log n), contando a ordenação. Procurar p(j) andando para trás na lista também está certo, mas custa O(n) por proposta quando há muita sobreposição, O(n²) no total. Uma PD indexada pelo horário (o melhor até cada instante t) também acerta, mas é pseudopolinomial, como a mochila: com horários em milissegundos, a tabela não cabe na memória. Nenhuma regra gulosa resolve, como mostram os contraexemplos da lição: é o ponto em que a PD retoma o lugar do guloso.',
          starter: dedent(`
            def melhor_faturamento(propostas):
                # propostas: lista de (inicio, fim, valor)
                # devolva o maior faturamento com propostas que não se sobrepõem
                pass
          `),
          solution: dedent(`
            from bisect import bisect_right

            def melhor_faturamento(propostas):
                ps = sorted(propostas, key=lambda p: p[1])
                fins = [p[1] for p in ps]
                melhor = [0] * (len(ps) + 1)        # melhor[j]: ótimo com as j primeiras (por fim)
                for j, (inicio, fim, valor) in enumerate(ps, start=1):
                    k = bisect_right(fins, inicio, 0, j - 1)   # anteriores que terminam até inicio
                    melhor[j] = max(melhor[j - 1], valor + melhor[k])
                return melhor[-1]
          `),
          tests: [
            {
              name: 'exemplos: os gulosos perdem',
              code: dedent(`
                _r = melhor_faturamento([(0, 10, 1000), (0, 5, 600), (5, 10, 600)])
                assert _r == 1200, f"(0, 5) e (5, 10) juntas valem 1200, mais que a de 1000 sozinha; veio {_r}"
                _r = melhor_faturamento([(0, 3, 100), (2, 10, 1000)])
                assert _r == 1000, f"as duas colidem, e a de 1000 vale mais, mesmo terminando depois; veio {_r}"
              `),
            },
            {
              name: 'bordas',
              code: dedent(`
                _casos = [
                    ([], 0, "sem propostas, nada a faturar"),
                    ([(8, 12, 500)], 500, "uma proposta só"),
                    ([(8, 10, 5), (10, 12, 5)], 10, "terminar às 10 e começar às 10 é compatível"),
                    ([(1, 5, 3), (1, 5, 3), (1, 5, 3)], 3, "propostas iguais colidem entre si"),
                    ([(0, 100, 50), (10, 20, 30), (30, 40, 30)], 60, "duas curtas dentro da longa valem mais que ela"),
                ]
                for _ps, _e, _motivo in _casos:
                    _r = melhor_faturamento(list(_ps))
                    assert _r == _e, f"melhor_faturamento({_ps}) deveria ser {_e} ({_motivo}); veio {_r}"
              `),
            },
            {
              name: 'aleatório contra força bruta',
              code: dedent(`
                import random
                from itertools import combinations

                def _forca_bruta(ps):
                    melhor = 0
                    for k in range(1, len(ps) + 1):
                        for g in combinations(ps, k):
                            if all(p[1] <= q[0] or q[1] <= p[0] for p, q in combinations(g, 2)):
                                melhor = max(melhor, sum(p[2] for p in g))
                    return melhor

                for _ in range(300):
                    _ps = []
                    for _ in range(random.randint(0, 9)):
                        _i = random.randint(0, 20)
                        _ps.append((_i, _i + random.randint(1, 8), random.randint(1, 50)))
                    _r = melhor_faturamento(list(_ps))
                    _e = _forca_bruta(_ps)
                    assert _r == _e, f"melhor_faturamento({_ps}) deveria ser {_e}; veio {_r}"
              `),
            },
            {
              name: 'O(n log n) com 4 000 propostas sobrepostas',
              code: HORA + '\n' + dedent(`
                _x = 2026

                def _prox():
                    global _x
                    _x = (_x * 1103515245 + 12345) % 2147483648
                    return _x

                _base = 1760000000000              # horários em milissegundos
                _ps = []
                for _ in range(4000):
                    _i = _prox() % 1000000
                    _f = _i + 1 + _prox() % 500000
                    _ps.append((_base + _i * 1000, _base + _f * 1000, 1 + _prox() % 1000))

                import sys
                _lim = sys.getrecursionlimit()
                sys.setrecursionlimit(200)         # no navegador, recursão funda derruba o Python; assim ela vira RecursionError
                _erro = None
                _Hora.prepara(400000, "com 4 000 propostas muito sobrepostas, a sua função passou de 400 000 comparações entre horários (a versão com busca binária faz cerca de 85 000). Como você acha a última proposta compatível? Os fins estão ordenados: use busca binária (bisect).")
                try:
                    _r = melhor_faturamento([(_Hora(a), _Hora(b), v) for a, b, v in _ps])
                except RecursionError:
                    _erro = "com 4 000 propostas, a recursão ficou funda demais (RecursionError). Escreva a PD bottom-up, com um laço que preenche melhor[j] do menor j para o maior."
                except (MemoryError, OverflowError):
                    _erro = "a sua função tentou criar uma lista do tamanho dos horários, e aqui eles são números enormes (milissegundos). Indexe a PD pelas propostas em ordem de fim, não pelo horário."
                finally:
                    sys.setrecursionlimit(_lim)
                    _Hora.limite = None
                assert _erro is None, _erro
                assert _r == 42823, f"com essas 4 000 propostas, o maior faturamento é 42823; veio {_r}"
              `),
            },
          ],
        },
      },
    ],
    projeto: [
      md(`
        **Mini-projeto: alocador de salas da semana de provas**. Leia uma lista de provas (disciplina, dia, início, fim) e, para cada dia, diga **qual sala** cada prova usa, não só quantas salas são necessárias. Imprima um quadro por sala, em ordem de horário, e confira automaticamente que nenhuma sala tem duas provas ao mesmo tempo.

        Depois: (1) acrescente salas com capacidade diferente e provas com número de alunos (o guloso continua ótimo? procure um contraexemplo); (2) faça a versão do salão de festas que devolve **quais** propostas aceitar, reconstruindo a solução a partir da tabela melhor[j], como na lição anterior.
      `),
    ],
    revisao: [
      md(`
        - Guloso = uma escolha local por vez, sem voltar atrás. Rápido, mas só vale com prova; um contraexemplo derruba a regra, e passar em testes não prova nada.
        - Escalonamento de intervalos: ordene pelo fim e aceite quem começa depois do último aceito. O(n log n). "Começa cedo", "mais curto" e "menos conflitos" estão erradas.
        - Provas: argumento de troca (existe ótimo que contém a escolha gulosa) e "o guloso se mantém à frente" (fim(gᵣ) ≤ fim(oᵣ) a cada passo).
        - Particionamento: em ordem de início, reaproveite a sala que fica livre primeiro (heap). Usa exatamente a profundidade, que é o mínimo.
        - Mochila fracionária e intervalos sem valor: guloso. Mochila 0/1 e intervalos com valores: PD.
      `),
      english(`
        - **greedy algorithm / greedy choice**: algoritmo guloso / escolha gulosa
        - **counterexample**: contraexemplo
        - **exchange argument / greedy stays ahead**: argumento de troca / o guloso se mantém à frente
        - **interval scheduling / interval partitioning**: escalonamento / particionamento de intervalos
        - **earliest finish time first**: termina mais cedo primeiro
        - **weighted interval scheduling**: escalonamento de intervalos com pesos

        Frase típica de entrevista: *"I sort the intervals by end time and greedily take each one that starts after the last one I took. By an exchange argument, some optimal solution contains the interval that finishes first, so the greedy choice is safe. It runs in O(n log n) because of the sort."*

        Frase típica de enunciado: *"Given an array of meeting time intervals, return the minimum number of conference rooms required."*
      `),
    ],
  },
  review: [
    ['Qual regra gulosa resolve o escalonamento de intervalos, e quanto custa?', 'Ordenar pelo fim e aceitar cada pedido que começa a partir do fim do último aceito. O(n log n), por causa da ordenação.'],
    ['Dê um contraexemplo para "o mais curto primeiro" no escalonamento de intervalos.', '[0, 5), [4, 6), [5, 10): a regra pega [4, 6), que colide com os outros dois; o ótimo é [0, 5) e [5, 10).'],
    ['Resuma o argumento de troca do escalonamento de intervalos.', 'Numa solução ótima, troque o primeiro pedido pelo que termina mais cedo de todos: ele termina antes ou junto, então não colide com os demais. Logo existe ótimo com a escolha gulosa.'],
    ['Qual é o menor número de salas para um conjunto de intervalos, e por que não dá para usar menos?', 'A profundidade: o maior número de intervalos num mesmo instante. Esses intervalos simultâneos precisam de salas diferentes.'],
    ['No particionamento de intervalos, em que ordem processar e como achar uma sala livre depressa?', 'Em ordem de início; uma heap com o horário em que cada sala fica livre diz se a que libera primeiro já está livre.'],
    ['A regra passou em 300 testes aleatórios contra a força bruta. Ela está certa?', 'Não necessariamente: "menos conflitos" passa em sorteios pequenos e tem contraexemplo com 11 intervalos. Só uma prova garante.'],
    ['Por que o guloso por valor/peso funciona na mochila fracionária e falha na 0/1?', 'Na fracionária dá para trocar um pedaço de item pior pelo mesmo peso de um melhor sem perder valor; na 0/1 os itens não se dividem.'],
    ['Como resolver intervalos com valores (weighted interval scheduling)?', 'PD em ordem de fim: melhor[j] = max(melhor[j − 1], valor_j + melhor[p(j)]), com p(j) achado por busca binária. O(n log n).'],
  ],
  references: ['kleinberg-tardos', 'clrs', 'stanford-cs161', 'python-docs'],
});

export const lessons: Lesson[] = [mochilaLcs, intervalos];
