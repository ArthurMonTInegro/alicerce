/** Lições adicionais do módulo m4-2 (busca). */
import type { Lesson } from '../../types.ts';
import { code, dedent, deep, english, lesson, md, py, t, tip, trace, warn } from '../../helpers.ts';

/**
 * Prefixo de testes com dois vigias, que acompanham cada linha executada no código do estudante (main.py):
 * - `_sem_laco_infinito(f, *args)` chama f(*args) e reprova se passar de 50 000 linhas. Numa entrada
 *   pequena isso só acontece com laço infinito (o erro clássico: lo = meio com o meio arredondado para
 *   baixo) ou com uma busca que testa candidato por candidato.
 * - `_no_prazo(segundos, msg, f, *args)` chama f(*args) e reprova com `msg` se passar do prazo.
 * Os testes rodam todos na mesma execução: sem os vigias, uma solução lenta estouraria o tempo do
 * executor e o estudante perderia as mensagens de todos os testes.
 */
const GUARDA_LACO = dedent(`
  import sys as _sys, time as _time
  def _vigiar(f, args, conferir):
      def _linha(frame, evento, arg):
          if evento == "line":
              conferir()
          return _linha
      def _chamada(frame, evento, arg):
          return _linha if frame.f_code.co_filename == "main.py" else None
      _sys.settrace(_chamada)
      try:
          return f(*args)
      finally:
          _sys.settrace(None)
  def _sem_laco_infinito(f, *args):
      passos = [0]
      def conferir():
          passos[0] += 1
          if passos[0] > 50_000:
              raise AssertionError(f"{f.__name__} executou mais de 50 000 linhas numa entrada pequena: o laço não termina, ou não descarta metade do intervalo a cada volta. Simule à mão o caso em que hi = lo + 1 e confira se as duas saídas do if encolhem o intervalo.")
      return _vigiar(f, args, conferir)
  def _no_prazo(segundos, msg, f, *args):
      fim = _time.perf_counter() + segundos
      def conferir():
          if _time.perf_counter() > fim:
              raise AssertionError(msg)
      return _vigiar(f, args, conferir)
`);

/* ------------------------------------------------------------------ */
/* Fronteiras: limite inferior, limite superior e bisect               */
/* ------------------------------------------------------------------ */

const fronteiras = lesson({
  id: 'l4-bisect-fronteiras',
  moduleId: 'm4-2',
  title: 'Fronteiras: primeira e última ocorrência com bisect',
  titleEn: 'Boundaries: lower bound, upper bound and bisect',
  summary: 'Trocar "onde está x?" por "onde x começa e onde termina?": o molde do intervalo semiaberto, bisect_left e bisect_right, contagens e faixas em O(log n), e quando ordenar compensa.',
  minutes: 45,
  objectives: [
    'Implementar o limite inferior e o limite superior com o molde do intervalo semiaberto [lo, hi)',
    'Responder primeira e última ocorrência, contagem, faixa, piso e teto com bisect_left e bisect_right',
    'Escolher entre bisect_left e bisect_right em tabelas de faixas ("até" × "a partir de")',
    'Decidir entre busca linear, lista ordenada com bisect e set/dict pelo número e pelo tipo de consultas',
  ],
  skills: ['alg-busca'],
  terms: [
    t('fronteira', 'boundary', 'Primeira posição em que um predicado passa de falso para verdadeiro numa sequência do tipo F…F V…V.'),
    t('limite inferior', 'lower bound', 'Primeira posição cujo valor é maior ou igual ao alvo; é o que bisect_left devolve.', 'std::lower_bound returns the first element that is not less than the value.'),
    t('limite superior', 'upper bound', 'Primeira posição cujo valor é estritamente maior que o alvo; é o que bisect_right devolve.'),
    t('predicado', 'predicate', 'Pergunta de sim ou não sobre um valor, como "xs[i] >= alvo?".'),
    t('ponto de inserção', 'insertion point', 'Posição onde o alvo entraria para a lista continuar ordenada.', 'The returned insertion point ip partitions the array a into two slices.'),
    t('intervalo semiaberto', 'half-open interval', 'Intervalo [lo, hi) que inclui lo e exclui hi, o mesmo padrão de range() e das fatias.'),
    t('piso', 'floor', 'Numa coleção ordenada, o maior valor menor ou igual a x.', 'floor(key) returns the largest key less than or equal to key.'),
    t('teto', 'ceiling', 'Numa coleção ordenada, o menor valor maior ou igual a x.'),
  ],
  stages: {
    conceito: [
      md(`
        Na lição anterior, a busca binária respondia a uma pergunta só: **o alvo está na lista? Em que posição?** No dia a dia, as perguntas sobre dados ordenados costumam ser outras:

        - Quantos Pix de exatamente R$ 20 a loja recebeu hoje? (contar repetidos)
        - Quantas notas da turma ficaram entre 6 e 8? (contar uma faixa)
        - Qual é o primeiro ônibus que sai a partir das 7h30? (o próximo valor da lista)
        - Em que posição entra um novo inscrito para a lista continuar em ordem alfabética? (onde inserir)

        Todas se resolvem com uma busca binária que **nunca falha**: em vez de procurar o alvo e devolver -1, ela procura uma **{{fronteira|boundary}}**, o ponto da lista em que os valores deixam de ser menores que o alvo (ou, na outra versão, deixam de ser menores ou iguais a ele). Com duas fronteiras, o **{{limite inferior|lower bound}}** e o **{{limite superior|upper bound}}**, você sabe onde um valor começa, onde termina e quantas vezes aparece, tudo em O(log n).

        O módulo \`bisect\` do Python entrega as duas prontas. O difícil não é chamá-lo: é saber **qual** das duas usar, porque a escolha errada só aparece nos valores que caem exatamente em cima de uma fronteira.
      `),
    ],
    explicacao: [
      md(`
        ### A pergunta certa: onde o predicado vira
        Pegue a lista ordenada \`xs = [10, 20, 20, 20, 30, 40]\` e faça, para cada posição, uma pergunta de sim ou não, um {{predicado|predicate}}: "\`xs[i] >= 20\`?". Depois troque por "\`xs[i] > 20\`?".
      `),
      {
        type: 'table',
        head: ['i', '0', '1', '2', '3', '4', '5'],
        rows: [
          ['`xs[i]`', '10', '20', '20', '20', '30', '40'],
          ['`xs[i] >= 20`', 'F', '**V**', 'V', 'V', 'V', 'V'],
          ['`xs[i] > 20`', 'F', 'F', 'F', 'F', '**V**', 'V'],
        ],
        caption: 'Numa lista ordenada, os dois predicados são falsos num começo e verdadeiros no resto. A fronteira é o primeiro V.',
      },
      md(`
        Como a lista está ordenada, uma vez que o predicado fica verdadeiro ele nunca volta a ser falso: o padrão é sempre F…F V…V. A primeira posição verdadeira de "\`xs[i] >= alvo\`" é o **limite inferior** (aqui, 1); a de "\`xs[i] > alvo\`" é o **limite superior** (aqui, 4). Se nenhuma posição for verdadeira, a fronteira é \`len(xs)\`: "depois do último".

        Essas duas posições contam a história inteira do 20: ele começa na posição 1, a última cópia está na posição 4 − 1 = 3, e ele aparece 4 − 1 = 3 vezes. Se o alvo não estiver na lista (25, por exemplo), as duas fronteiras coincidem: ambas valem 4, a contagem dá 0, e 4 é o **{{ponto de inserção|insertion point}}**, a posição onde o 25 entraria sem desarrumar a ordem.

        ### O molde do intervalo semiaberto
        Para achar a fronteira, a busca trabalha com um {{intervalo semiaberto|half-open interval}} \`[lo, hi)\`: \`lo\` entra e \`hi\` não, como em \`range(lo, hi)\` e na fatia \`xs[lo:hi]\`.
      `),
      code('python', `
        def limite_inferior(xs, alvo):
            lo, hi = 0, len(xs)          # hi = len(xs): "depois do último" também é resposta
            while lo < hi:               # ainda há posições não classificadas
                meio = (lo + hi) // 2
                if xs[meio] < alvo:      # predicado falso no meio: a fronteira está depois
                    lo = meio + 1
                else:                    # predicado verdadeiro: o meio pode ser a fronteira
                    hi = meio
            return lo                    # lo == hi: a fronteira
      `, 'Para o limite superior, troque uma única comparação: xs[meio] < alvo vira xs[meio] <= alvo.'),
      md(`
        A **invariante** agora é outra: tudo **antes** de \`lo\` é menor que o alvo, e tudo **de \`hi\` em diante** é maior ou igual. Só as posições de \`lo\` a \`hi − 1\` ainda não foram classificadas. Quando \`lo == hi\`, não sobra nenhuma, e \`lo\` é exatamente a fronteira.

        E por que \`hi = meio\` não causa loop infinito? Com \`lo < hi\`, o meio arredondado para baixo satisfaz \`lo <= meio < hi\`. Então \`lo = meio + 1\` sempre aumenta \`lo\`, e \`hi = meio\` sempre diminui \`hi\`: o intervalo encolhe a cada volta. Compare com a versão da lição anterior:
      `),
      {
        type: 'table',
        head: ['', 'Busca do valor (lição anterior)', 'Busca da fronteira'],
        rows: [
          ['Intervalo', 'fechado `[lo, hi]`, começa com `hi = len(xs) - 1`', 'semiaberto `[lo, hi)`, começa com `hi = len(xs)`'],
          ['Laço', '`while lo <= hi`', '`while lo < hi`'],
          ['Quando o meio "serve"', 'devolve o meio na hora', '`hi = meio`: guarda o meio e continua à esquerda'],
          ['Quando para', 'ao achar o alvo ou quando o intervalo fica vazio', 'só quando `lo == hi`, depois de cerca de log₂ n voltas'],
          ['Devolve', 'um índice do alvo, ou -1', 'uma posição de 0 a `len(xs)`, sempre'],
        ],
      },
      md(`
        ### O módulo bisect
        O \`bisect\` implementa esse molde (em C, no CPython) e acrescenta a inserção ordenada:
      `),
      {
        type: 'table',
        head: ['Função', 'O que faz', 'Custo'],
        rows: [
          ['`bisect_left(xs, x)`', 'limite inferior: primeira posição com `xs[i] >= x`', 'O(log n)'],
          ['`bisect_right(xs, x)`, ou só `bisect`', 'limite superior: primeira posição com `xs[i] > x`', 'O(log n)'],
          ['`insort_left(xs, x)`, `insort_right(xs, x)`, ou só `insort`', 'insere `x` na fronteira correspondente, mantendo a ordem', 'O(log n) para achar + O(n) para deslocar os seguintes = **O(n)**'],
        ],
        caption: 'Todas aceitam lo e hi opcionais, para buscar só num trecho da lista.',
      },
      md(`
        ### Cada pergunta vira uma conta
        Com as duas fronteiras, as perguntas do começo da lição viram contas de uma linha. Duas delas pedem o {{piso|floor}} de x (o maior valor ≤ x) e o {{teto|ceiling}} de x (o menor valor ≥ x).
      `),
      {
        type: 'table',
        head: ['Pergunta (xs ordenada)', 'Conta', 'Cuidado'],
        rows: [
          ['x está na lista?', '`i = bisect_left(xs, x)` e depois `i < len(xs) and xs[i] == x`', 'teste `i < len(xs)` antes de ler `xs[i]`'],
          ['Primeira ocorrência de x', '`bisect_left(xs, x)`', 'só é ocorrência se x estiver lá; senão é o ponto de inserção'],
          ['Última ocorrência de x', '`bisect_right(xs, x) - 1`', 'o limite superior fica **uma posição depois** da última cópia'],
          ['Quantas vezes x aparece', '`bisect_right(xs, x) - bisect_left(xs, x)`', 'dá 0 quando x não está: dispensa o `if`'],
          ['Quantos valores em `[a, b]`', '`bisect_right(xs, b) - bisect_left(xs, a)`', 'com `a > b` a conta pode dar negativa'],
          ['Quantos valores menores que x', '`bisect_left(xs, x)`', 'menores **ou iguais**: `bisect_right(xs, x)`'],
          ['Teto: menor valor ≥ x', '`xs[bisect_left(xs, x)]`', 'não existe se a posição for `len(xs)`'],
          ['Piso: maior valor ≤ x', '`xs[bisect_right(xs, x) - 1]`', 'não existe se a posição for -1, e `xs[-1]` não dá erro: devolve o **último** elemento'],
        ],
      },
      warn(`
        O \`bisect\` confia em você: ele **não confere** se a lista está ordenada. Numa lista fora de ordem, devolve uma posição qualquer, sem erro nenhum. E \`insort\` dentro de um laço monta uma lista ordenada em O(n²) no pior caso, porque cada inserção desloca os elementos seguintes. Se você já tem todos os valores, \`sorted()\` faz o mesmo em O(n log n).
      `, 'Duas armadilhas'),
      md(`
        ### Busca linear, lista ordenada ou set?
        Ordenar custa O(n log n). Vale a pena? Depende de **quantas** consultas você vai fazer e de **que tipo** elas são. Para q consultas numa coleção de n itens:
      `),
      {
        type: 'table',
        head: ['Estratégia', 'Preparo', 'Cada consulta', 'Total com q consultas', 'Responde faixa, piso e teto?'],
        rows: [
          ['Busca linear (`in`, `for`)', 'nenhum', 'O(n)', 'O(q · n)', 'sim, mas olhando tudo: O(n) cada'],
          ['`sorted` + `bisect`', 'O(n log n)', 'O(log n)', 'O((n + q) log n)', 'sim, em O(log n)'],
          ['`set` / `dict` / `Counter`', 'O(n) em média', 'O(1) em média', 'O(n + q) em média', 'não: hash não guarda ordem'],
        ],
        caption: 'Com n = 1 000 000 e q = 1 000: cerca de 10⁹ passos na busca linear contra cerca de 2 × 10⁷ com sorted + bisect (quase todos gastos no sorted).',
      },
      md(`
        Para **uma** consulta numa lista ainda fora de ordem, a busca linear vence: o preparo de O(n log n) já custa mais que o O(n) dela. Se a pergunta é só "x está lá?" ou "quantas vezes x aparece?", um \`set\` ou um \`Counter\` responde em O(1) médio. A lista ordenada com \`bisect\` brilha quando a **ordem** importa: faixas, piso e teto, posição de inserção, os k vizinhos mais próximos.
      `),
      deep(`
        Desde o Python 3.10, todas as funções do \`bisect\` aceitam \`key=\`, para buscar numa lista de registros ordenada por um campo. Por exemplo, com \`saidas\` ordenada pelo horário, \`bisect_left(saidas, 450, key=horario)\` acha a primeira saída com \`horario(s) >= 450\`.

        Há uma assimetria que confunde muita gente: em \`bisect_left\` e \`bisect_right\`, a \`key\` é aplicada só aos elementos da lista, **não** ao x (você passa o valor da chave, 450, e não um registro); já em \`insort_left\` e \`insort_right\`, ela é aplicada ao x também (você passa o registro inteiro). E a lista precisa estar ordenada pela mesma chave.
      `, 'bisect com key'),
    ],
    exemplo: [
      md(`Siga as duas buscas em \`xs = [10, 20, 20, 20, 30, 40]\` com alvo 20. Primeiro o limite inferior, que avança \`lo\` só quando \`xs[meio] < 20\`:`),
      {
        type: 'table',
        head: ['Passo', 'lo', 'hi', 'meio', 'xs[meio]', 'xs[meio] < 20?', 'Ação'],
        rows: [
          ['1', '0', '6', '3', '20', 'não', '`hi = 3`'],
          ['2', '0', '3', '1', '20', 'não', '`hi = 1`'],
          ['3', '0', '1', '0', '10', 'sim', '`lo = 1`'],
          ['fim', '1', '1', '', '', '', 'devolve **1**'],
        ],
        caption: 'Limite inferior: bisect_left(xs, 20) == 1.',
      },
      md('Agora o limite superior. A única mudança é a pergunta: ele avança `lo` quando `xs[meio] <= 20`.'),
      {
        type: 'table',
        head: ['Passo', 'lo', 'hi', 'meio', 'xs[meio]', 'xs[meio] <= 20?', 'Ação'],
        rows: [
          ['1', '0', '6', '3', '20', 'sim', '`lo = 4`'],
          ['2', '4', '6', '5', '40', 'não', '`hi = 5`'],
          ['3', '4', '5', '4', '30', 'não', '`hi = 4`'],
          ['fim', '4', '4', '', '', '', 'devolve **4**'],
        ],
        caption: 'Limite superior: bisect_right(xs, 20) == 4.',
      },
      md(`
        Repare no passo 1 das duas tabelas: o meio caiu num 20, e mesmo assim nenhuma das buscas parou. Achar **um** 20 não responde à pergunta, que agora é **onde o bloco de 20 começa** (posição 1) e **onde ele termina** (posição 4, exclusiva). Daí saem a primeira ocorrência (1), a última (4 − 1 = 3) e a contagem (4 − 1 = 3).

        Execute o limite inferior passo a passo, inclusive com alvos que não estão na lista:
      `),
      trace(`
        def limite_inferior(xs, alvo):
            lo, hi = 0, len(xs)
            while lo < hi:
                meio = (lo + hi) // 2
                if xs[meio] < alvo:
                    lo = meio + 1
                else:
                    hi = meio
            return lo

        xs = [10, 20, 20, 20, 30, 40]
        print(limite_inferior(xs, 20), limite_inferior(xs, 25), limite_inferior(xs, 99))
      `, 'Com 25 e 99 o laço também termina sem "achar" nada: devolve onde eles entrariam (4 e 6).'),
    ],
    codigo: [
      py(`
        from bisect import bisect_left, bisect_right, insort

        # Tabela de frete: "até 1 kg: R$ 15", "até 5 kg: R$ 25", "até 10 kg: R$ 40", "até 30 kg: R$ 80"
        limites = [1, 5, 10, 30]
        precos = [15, 25, 40, 80]

        def frete(peso):
            i = bisect_left(limites, peso)    # primeira faixa cujo limite é >= peso
            if i == len(limites):
                return "não aceita"
            return f"R$ {precos[i]}"

        for peso in [0.5, 1, 1.2, 5, 30, 31]:
            print(f"{peso} kg: {frete(peso)}")

        # Pix recebidos no dia, em reais, já ordenados
        pix = [5, 12, 20, 20, 20, 35, 50, 50, 120]
        print("Pix de R$ 20:", bisect_right(pix, 20) - bisect_left(pix, 20))
        print("entre R$ 20 e R$ 50:", bisect_right(pix, 50) - bisect_left(pix, 20))
        print("posição do último Pix de R$ 50:", bisect_right(pix, 50) - 1)

        # Próxima saída de ônibus a partir das 7h30 (horários em minutos desde 0h)
        saidas = [(370, "101"), (445, "230"), (460, "101"), (485, "230")]

        def horario(saida):
            return saida[0]

        i = bisect_left(saidas, 7 * 60 + 30, key=horario)
        if i < len(saidas):
            h, m = divmod(saidas[i][0], 60)
            print(f"próxima saída: {h}h{m:02d}, linha {saidas[i][1]}")
        else:
            print("hoje não sai mais nenhum")

        insort(pix, 30)
        print(pix)
      `, { caption: 'Um peso em cima do limite (1 kg, 5 kg, 30 kg) fica na faixa de baixo, porque a tabela diz "até": por isso bisect_left. Troque por bisect_right e veja o pacote de 1 kg pagar R$ 25.' }),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e4-fronteira-1',
          kind: 'mcq',
          prompt: 'Com `xs = [3, 5, 5, 5, 8]`, quanto valem `bisect_left(xs, 5)` e `bisect_right(xs, 5)`, nessa ordem?',
          difficulty: 'facil',
          skills: ['alg-busca'],
          hints: [
            'bisect_left procura a primeira posição em que xs[i] >= 5. Qual é?',
            'bisect_right procura a primeira posição em que xs[i] > 5. Ela aponta para um 5 ou para o que vem depois do bloco?',
          ],
          explanation: '`bisect_left(xs, 5)` é o limite inferior: a primeira posição com valor >= 5, o primeiro 5 (posição 1). `bisect_right(xs, 5)` é o limite superior: a primeira posição com valor > 5, o 8 na posição 4. O bloco de 5 ocupa a fatia semiaberta `xs[1:4]` e tem 4 − 1 = 3 elementos.',
          options: [
            { text: '1 e 4', correct: true, feedback: 'Isso: o primeiro 5 está na posição 1 e o primeiro valor maior que 5 (o 8) está na posição 4. A diferença, 3, é quantas vezes o 5 aparece.' },
            { text: '1 e 3', feedback: 'A posição 3 é a da **última** ocorrência. O bisect_right devolve a posição seguinte, onde um novo 5 entraria se fosse colocado depois dos outros.' },
            { text: '2 e 2', feedback: 'Essa seria a resposta da busca binária da lição anterior, que para no primeiro 5 que encontra (o do meio). bisect_left e bisect_right não param ao achar: continuam até a fronteira do bloco de 5.' },
            { text: '0 e 4', feedback: 'A posição 0 tem o 3, que é menor que 5. O limite inferior é a primeira posição com valor >= 5, e o 3 não satisfaz isso.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e4-fronteira-2',
          kind: 'predict',
          lang: 'python',
          prompt: 'O que este programa imprime?',
          difficulty: 'intermediario',
          skills: ['alg-busca'],
          hints: [
            'Quando o valor não está na lista, existe diferença entre "primeiro >= 5" e "primeiro > 5"?',
            'A segunda linha é uma contagem. Quantas vezes o 4 aparece?',
            'Para um valor menor que todos, ou maior que todos, onde ele entraria? As funções do bisect podem devolver -1?',
          ],
          explanation: 'Com valor ausente (5), as duas fronteiras coincidem no ponto de inserção: 3, entre o 4 e o 7. A diferença `bisect_right − bisect_left` conta as cópias do 4: 3 − 1 = 2. Um valor menor que todos entra na posição 0 e um maior que todos em `len(xs) = 5`: o bisect nunca devolve -1 nem dá IndexError. Por fim, `bisect_right(xs, 9) − 1 = 4` é a posição da última ocorrência do 9.',
          code: dedent(`
            from bisect import bisect_left, bisect_right

            xs = [2, 4, 4, 7, 9]
            print(bisect_left(xs, 5), bisect_right(xs, 5))
            print(bisect_right(xs, 4) - bisect_left(xs, 4))
            print(bisect_left(xs, 1), bisect_right(xs, 10))
            print(bisect_right(xs, 9) - 1)
          `),
          answer: '3 3\n2\n0 5\n4',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e4-fronteira-3',
          kind: 'fix',
          lang: 'python',
          prompt: 'Numa escola, a nota vira conceito por esta tabela: **a partir de** 9,0 é A; a partir de 7,0 é B; a partir de 5,0 é C; abaixo de 5,0 é D. A função abaixo erra justamente as notas que caem **em cima** de um corte. Corrija-a, mantendo a busca com `bisect`.',
          difficulty: 'intermediario',
          skills: ['alg-busca'],
          hints: [
            'Que conceito a função dá para a nota 7,0? E qual deveria dar?',
            'Com a nota exatamente igual a um corte, bisect_left devolve a posição do próprio corte ou a seguinte?',
            'A tabela diz "a partir de": o corte pertence à faixa de cima. Releia na explicação qual das funções trata um valor igual como "já passou da fronteira".',
          ],
          explanation: '`bisect_left(CORTES, nota)` conta quantos cortes são **menores** que a nota; `bisect_right` conta quantos são **menores ou iguais**. Com 7,0, há um corte menor (5,0) e dois menores ou iguais (5,0 e 7,0): a versão com `bisect_left` dá "C", a correta dá "B". Regra prática: tabela de "até" (o limite é o último valor da faixa, como no frete) pede `bisect_left`; tabela de "a partir de" (o corte é o primeiro valor da faixa) pede `bisect_right`. É o mesmo exemplo de notas da documentação do `bisect`.',
          starter: dedent(`
            from bisect import bisect_left

            CORTES = [5.0, 7.0, 9.0]
            CONCEITOS = "DCBA"

            def conceito(nota):
                return CONCEITOS[bisect_left(CORTES, nota)]
          `),
          solution: dedent(`
            from bisect import bisect_right

            CORTES = [5.0, 7.0, 9.0]
            CONCEITOS = "DCBA"

            def conceito(nota):
                return CONCEITOS[bisect_right(CORTES, nota)]
          `),
          tests: [
            { name: 'notas no meio das faixas', code: 'for nota, esperado in [(0, "D"), (4.9, "D"), (6.0, "C"), (8.5, "B"), (9.7, "A")]:\n    r = conceito(nota)\n    assert r == esperado, f"conceito({nota}) deu {r!r}, esperado {esperado!r}"' },
            { name: 'notas em cima dos cortes', code: 'for nota, esperado in [(5.0, "C"), (7.0, "B"), (9.0, "A"), (10.0, "A")]:\n    r = conceito(nota)\n    assert r == esperado, f"conceito({nota}) deu {r!r}, esperado {esperado!r}: \\"a partir de\\" inclui o próprio corte"' },
            { name: 'notas logo abaixo dos cortes', code: 'for nota, esperado in [(4.99, "D"), (6.999, "C"), (8.9999, "B"), (5.001, "C")]:\n    r = conceito(nota)\n    assert r == esperado, f"conceito({nota}) deu {r!r}, esperado {esperado!r}: abaixo do corte ainda é a faixa de baixo. Em vez de somar uma folga à nota ou mudar os cortes, troque a função de busca"' },
            { name: 'notas a um fio do corte', code: 'import math\nfor corte, esperado in [(5.0, "D"), (7.0, "C"), (9.0, "B")]:\n    nota = math.nextafter(corte, 0)\n    r = conceito(nota)\n    assert r == esperado, f"conceito({nota!r}) deu {r!r}, esperado {esperado!r}: essa nota é o maior float abaixo de {corte}. Uma folga somada à nota, ou cortes deslocados, sempre erram em algum caso assim; o certo é a função de busca que já trata o empate do jeito da tabela"' },
            { name: 'continua usando bisect', code: dedent(`
              import ast
              chamadas = set()
              for no in ast.walk(ast.parse(_source)):
                  if isinstance(no, ast.Call):
                      chamadas.add(getattr(no.func, "id", None) or getattr(no.func, "attr", None))
              assert chamadas & {"bisect", "bisect_left", "bisect_right"}, "mantenha a busca com o módulo bisect, em vez de uma cadeia de if"
            `) },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e4-fronteira-4',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `limite_superior(xs, alvo)`, que devolve a primeira posição de `xs` (ordenada) com valor **maior** que `alvo`, ou `len(xs)` se não houver, exatamente como `bisect_right`. Use o molde do intervalo semiaberto, em O(log n), **sem** importar `bisect`. Depois, use-a em `ultima_ocorrencia(xs, alvo)`, que devolve o índice da última ocorrência do alvo, ou -1 se ele não estiver na lista.',
          difficulty: 'intermediario',
          skills: ['alg-busca'],
          hints: [
            'Qual é o predicado do limite superior? Escreva a linha da tabela F…F V…V para xs = [10, 20, 20, 30] e alvo 20.',
            'Partindo do molde do limite inferior, qual comparação muda? E qual valor inicial de hi permite devolver len(xs)?',
            'Se o limite superior é p, onde está a última cópia do alvo? Em que caso essa posição não é uma cópia do alvo?',
            'Teste ultima_ocorrencia com a lista vazia: que índice você tentaria ler?',
          ],
          explanation: 'O limite superior é a fronteira do predicado `xs[i] > alvo`. No molde, o lado "falso" (`xs[meio] <= alvo`) faz `lo = meio + 1`, e o lado "verdadeiro" faz `hi = meio`. A última ocorrência fica uma posição antes da fronteira, mas só é ocorrência se essa posição existir (`>= 0`) e guardar o alvo. Sem o teste `i >= 0`, a lista vazia dá IndexError em `xs[-1]`; e em contas parecidas, como a do piso, ler `xs[-1]` numa lista não vazia devolveria o último elemento sem erro nenhum.',
          starter: dedent(`
            def limite_superior(xs, alvo):
                # primeira posição com xs[i] > alvo (ou len(xs)); use [lo, hi)
                pass


            def ultima_ocorrencia(xs, alvo):
                # use limite_superior; devolva -1 se o alvo não estiver em xs
                pass
          `),
          solution: dedent(`
            def limite_superior(xs, alvo):
                lo, hi = 0, len(xs)
                while lo < hi:
                    meio = (lo + hi) // 2
                    if xs[meio] <= alvo:
                        lo = meio + 1
                    else:
                        hi = meio
                return lo


            def ultima_ocorrencia(xs, alvo):
                i = limite_superior(xs, alvo) - 1
                if i >= 0 and xs[i] == alvo:
                    return i
                return -1
          `),
          tests: [
            { name: 'exemplos', code: `${GUARDA_LACO}\n` + 'xs = [10, 20, 20, 20, 30, 40]\nfor alvo, esperado in [(20, 4), (25, 4), (5, 0), (40, 6), (10, 1)]:\n    r = _sem_laco_infinito(limite_superior, xs, alvo)\n    assert r == esperado, f"limite_superior({xs}, {alvo}) deu {r}, esperado {esperado}"' },
            { name: 'vazia e um elemento', code: `${GUARDA_LACO}\n` + 'assert _sem_laco_infinito(limite_superior, [], 3) == 0, "lista vazia: a fronteira é 0"\nassert _sem_laco_infinito(limite_superior, [7], 7) == 1, "limite_superior([7], 7) deve ser 1: o 7 não é maior que 7"\nassert _sem_laco_infinito(limite_superior, [7], 6) == 0, "limite_superior([7], 6) deve ser 0"\nassert _sem_laco_infinito(ultima_ocorrencia, [], 3) == -1, "lista vazia: -1"\nassert _sem_laco_infinito(ultima_ocorrencia, [7], 7) == 0, "ultima_ocorrencia([7], 7) deve ser 0"' },
            { name: 'igual ao bisect_right', code: `${GUARDA_LACO}\n` + dedent(`
              import random
              from bisect import bisect_right
              random.seed(4)
              for _ in range(300):
                  xs = sorted(random.randint(-5, 5) for _ in range(random.randint(0, 12)))
                  for alvo in range(-7, 8):
                      r = _sem_laco_infinito(limite_superior, xs, alvo)
                      e = bisect_right(xs, alvo)
                      assert r == e, f"limite_superior({xs}, {alvo}) deu {r}, esperado {e}"
            `) },
            { name: 'última ocorrência', code: `${GUARDA_LACO}\n` + 'for xs, alvo, esperado, msg in [([1, 2, 2, 2, 3], 2, 3, "o último 2 está na posição 3"), ([1, 3, 5], 4, -1, "4 não está na lista: -1"), ([1, 3, 5], 0, -1, "0 é menor que todos: -1"), ([1, 3, 5], 9, -1, "9 é maior que todos: -1"), ([-4, -4, -1], -4, 1, "o último -4 está na posição 1")]:\n    r = _sem_laco_infinito(ultima_ocorrencia, xs, alvo)\n    assert r == esperado, f"ultima_ocorrencia({xs}, {alvo}) deu {r}: {msg}"' },
            { name: 'precisa ser O(log n)', code: `${GUARDA_LACO}\n` + dedent(`
              import time
              _sem_laco_infinito(limite_superior, [1, 2, 2, 3], 2)
              _sem_laco_infinito(ultima_ocorrencia, [1, 2, 2, 3], 9)
              xs = [5] * 2_000_000
              t0 = time.perf_counter()
              for _ in range(300):
                  a = limite_superior(xs, 5)
                  b = ultima_ocorrencia(xs, 5)
                  c = limite_superior(xs, 4)
                  d = ultima_ocorrencia(xs, 6)
                  e = ultima_ocorrencia(xs, 4)
                  if time.perf_counter() - t0 > 0.5:
                      break
              assert (a, b, c, d, e) == (2_000_000, 1_999_999, 0, -1, -1), f"resultados errados numa lista de 2 milhões de cincos: {(a, b, c, d, e)}"
              assert time.perf_counter() - t0 < 0.5, "muito lento: não percorra a lista (nem com in, index, fatias ou um laço de trás para frente). Descarte metade a cada passo em limite_superior, e use-a em ultima_ocorrencia"
            `) },
            { name: 'sem bisect', code: dedent(`
              import ast
              nomes = set()
              for no in ast.walk(ast.parse(_source)):
                  if isinstance(no, ast.Import):
                      nomes.update(a.name for a in no.names)
                  elif isinstance(no, ast.ImportFrom):
                      nomes.add(no.module or "")
                  elif isinstance(no, ast.Name):
                      nomes.add(no.id)
                  elif isinstance(no, ast.Attribute):
                      nomes.add(no.attr)
              assert not any(n.startswith(("bisect", "insort")) for n in nomes), "implemente a busca você mesmo, sem o módulo bisect"
            `) },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e4-fronteira-5',
          kind: 'code',
          lang: 'python',
          prompt: '`extrato` traz os Pix (em reais) que uma loja recebeu no mês, **na ordem em que chegaram**, ou seja, fora de ordem de valor; estornos aparecem como valores negativos. O gerente quer fazer muitas perguntas do tipo "quantos Pix ficaram entre `a` e `b` reais, com os dois extremos incluídos?". Escreva `contar_faixas(extrato, consultas)`, que recebe uma lista de pares `(a, b)` e devolve a lista com a resposta de cada consulta, na mesma ordem. Se `a > b`, a resposta daquela consulta é 0. Não altere a lista `extrato`. Meta: O((n + q) log n) no total, para n Pix e q consultas.',
          difficulty: 'intermediario',
          skills: ['alg-busca'],
          hints: [
            'Se o extrato estivesse ordenado por valor, como você contaria uma faixa sem olhar os valores do meio?',
            'Quantas vezes você precisa ordenar: uma vez por consulta ou uma vez no total? Compare O(q · n log n) com O(n log n + q log n). E como ordenar sem mexer na lista de quem chamou?',
            'Os dois extremos contam. Qual função do bisect deixa os iguais a b do lado de dentro, e qual deixa os iguais a a do lado de dentro?',
            'O que a sua conta devolve para a consulta (3, 1)?',
          ],
          explanation: 'Ordenar uma cópia (`sorted`) uma única vez custa O(n log n). Depois, cada consulta são duas buscas binárias: `bisect_left(valores, a)` é quantos valores são menores que a, e `bisect_right(valores, b)` é quantos são menores ou iguais a b; a diferença é quantos estão em `[a, b]`. Total: O((n + q) log n). Ordenar dentro de cada consulta custaria O(q · n log n), pior até que a busca linear, O(q · n). `extrato.sort()` também ordena, mas bagunça a lista de quem chamou a função. Com `a > b`, a diferença pode ficar negativa, por isso o caso especial; e como Pix têm centavos, truques como `b + 1` não funcionam.',
          starter: dedent(`
            from bisect import bisect_left, bisect_right

            def contar_faixas(extrato, consultas):
                # extrato: valores fora de ordem; consultas: lista de pares (a, b)
                # devolva [quantos v com a <= v <= b, para cada (a, b)], em O((n + q) log n)
                pass
          `),
          solution: dedent(`
            from bisect import bisect_left, bisect_right

            def contar_faixas(extrato, consultas):
                valores = sorted(extrato)    # uma vez só, e numa cópia
                respostas = []
                for a, b in consultas:
                    if a > b:
                        respostas.append(0)
                    else:
                        respostas.append(bisect_right(valores, b) - bisect_left(valores, a))
                return respostas
          `),
          tests: [
            { name: 'exemplo', code: 'ext = [20, 5, 50, 120, 20, 12, 35, 50, 20]\nconsultas = [(20, 50), (13, 19), (0, 1000), (6, 34)]\nr = contar_faixas(ext, consultas)\nassert r == [6, 0, 9, 4], f"contar_faixas({ext}, {consultas}) deu {r}, esperado [6, 0, 9, 4]"' },
            { name: 'extremos inclusos', code: 'ext = [20, 5, 50, 120, 20, 12, 35, 50, 20]\nr = contar_faixas(ext, [(20, 20), (50, 120), (5, 12)])\nassert r == [3, 3, 2], f"deu {r}, esperado [3, 3, 2]: os dois extremos contam (a <= v <= b), e os três Pix de R$ 20 estão em [20, 20]"' },
            { name: 'vazios e a > b', code: 'r = contar_faixas([], [(1, 5)])\nassert r == [0], f"extrato vazio: esperado [0], veio {r}"\nr = contar_faixas([1, 2, 3], [])\nassert r == [], f"sem consultas: esperado [], veio {r}"\nr = contar_faixas([1, 2, 3], [(3, 1)])\nassert r == [0], f"com a > b não há valor possível: esperado [0], veio {r}"\nr = contar_faixas([20, 5, 50, 120, 20, 12, 35, 50, 20], [(50, 20), (20, 50)])\nassert r == [0, 6], f"esperado [0, 6] (a primeira consulta tem a > b), veio {r}"' },
            { name: 'estornos negativos', code: 'ext = [0, -10, 15, -30, -10]\nr = contar_faixas(ext, [(-10, 0), (-100, -20), (16, 99)])\nassert r == [3, 1, 0], f"deu {r}, esperado [3, 1, 0]: em [-10, 0] há -10, -10 e 0, e em [-100, -20] só o -30"' },
            { name: 'valores com centavos', code: 'ext = [10.99, 9.9, 20.5, 10.0, 11.0, 10.5]\nconsultas = [(10, 10.5), (10.5, 11), (10.01, 10.98), (10, 11)]\nr = contar_faixas(ext, consultas)\nassert r == [2, 3, 1, 4], f"contar_faixas({ext}, {consultas}) deu {r}, esperado [2, 3, 1, 4]. Pix têm centavos: truques como b + 1 só funcionam com inteiros"' },
            { name: 'não altera o extrato', code: 'ext = [30, -5, 12, 12, 7]\ncontar_faixas(ext, [(0, 20)])\nassert ext == [30, -5, 12, 12, 7], f"o extrato mudou para {ext}: ordene uma cópia"' },
            { name: 'muitas consultas', code: `${GUARDA_LACO}\n` + dedent(`
              import random
              from bisect import bisect_left as _bl, bisect_right as _br
              random.seed(8)
              ext = [random.randint(-1_000, 100_000) for _ in range(200_000)]
              consultas = []
              for i in range(10_000):
                  if i % 10:
                      a, b = random.randint(-2_000, 30_000), random.randint(70_000, 101_000)
                  else:
                      a, b = random.randint(-2_000, 101_000), random.randint(-2_000, 101_000)
                  consultas.append((a, b))
              _ord = sorted(ext)
              esperado = [max(0, _br(_ord, b) - _bl(_ord, a)) for a, b in consultas]
              r = _no_prazo(1.5, "com 200 000 Pix e 10 000 consultas, a sua função passou de 1,5 s: ordene uma vez só e responda cada consulta com duas buscas binárias, sem percorrer a lista, sem fatiar a faixa encontrada e sem reordenar a cada consulta", contar_faixas, ext, consultas)
              assert r == esperado, "com 200 000 Pix e 10 000 consultas, algumas contagens vieram erradas"
            `) },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e4-fronteira-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            \`kms\` é a lista **ordenada** das posições (em km) dos postos de combustível ao longo de uma rodovia; pode haver dois postos no mesmo km. Escreva \`postos_mais_proximos(kms, x, k)\`, que devolve uma lista, **em ordem crescente**, com as posições dos \`k\` postos mais próximos do km \`x\` (0 ≤ k ≤ len(kms)). Em caso de empate na distância, prefira o posto de km **menor**.

            Exemplos: \`postos_mais_proximos([10, 25, 40, 41, 70], 38, 3)\` devolve \`[25, 40, 41]\`; \`postos_mais_proximos([10, 20, 30], 20, 2)\` devolve \`[10, 20]\` (10 e 30 empatam, e o 10 tem km menor).

            A mesma função vai atender consultas numa lista de um milhão de posições: cada chamada deve custar **O(log n + k)**, sem percorrer nem ordenar a lista inteira.
          `),
          difficulty: 'desafio',
          skills: ['alg-busca'],
          hints: [
            'Os k postos mais próximos de x formam um bloco contíguo da lista ordenada? Por quê?',
            'Onde x entraria na lista? Esse ponto separa os candidatos da esquerda (menores que x) dos da direita.',
            'A partir desse ponto, mantenha dois índices, um andando para a esquerda e outro para a direita, como nos dois ponteiros do Nível 3. A cada passo, qual dos dois candidatos você pega?',
            'E quando um dos lados acaba antes de completar k? Confira também a regra de empate.',
          ],
          explanation: 'Como a lista está ordenada, os k mais próximos de x formam uma fatia contígua: se um posto entrou na resposta, qualquer posto entre ele e x está pelo menos tão perto. `bisect_left` acha em O(log n) onde x entraria; dali, dois ponteiros aumentam a fatia um posto por vez, sempre pegando o lado mais perto (no empate, o da esquerda, que tem km menor): O(k). Total O(log n + k), contra O(n log n) de ordenar todos pela distância. Existe ainda uma solução que faz busca binária direto no **início** da janela de k postos, em O(log(n − k) + k): ela já é uma busca binária na resposta, assunto da próxima lição.',
          starter: dedent(`
            def postos_mais_proximos(kms, x, k):
                # devolva os k valores de kms mais próximos de x, em ordem crescente;
                # empate na distância: prefira o km menor. Meta: O(log n + k)
                pass
          `),
          solution: dedent(`
            from bisect import bisect_left

            def postos_mais_proximos(kms, x, k):
                direita = bisect_left(kms, x)     # primeiro posto com km >= x
                esquerda = direita - 1            # último posto com km < x
                for _ in range(k):
                    if esquerda < 0:
                        direita += 1
                    elif direita >= len(kms):
                        esquerda -= 1
                    elif x - kms[esquerda] <= kms[direita] - x:
                        esquerda -= 1
                    else:
                        direita += 1
                return kms[esquerda + 1:direita]
          `),
          tests: [
            { name: 'exemplos do enunciado', code: 'r = postos_mais_proximos([10, 25, 40, 41, 70], 38, 3)\nassert r == [25, 40, 41], f"esperado [25, 40, 41], veio {r}"\nr = postos_mais_proximos([10, 20, 30], 20, 2)\nassert r == [10, 20], f"10 e 30 empatam a 10 km: fica o de km menor. Esperado [10, 20], veio {r}"' },
            { name: 'bordas', code: 'assert postos_mais_proximos([10, 20, 30], 15, 0) == [], "k = 0: lista vazia"\nr = postos_mais_proximos([10, 20, 30], 0, 2)\nassert r == [10, 20], f"x antes de todos: esperado [10, 20], veio {r}"\nr = postos_mais_proximos([10, 20, 30], 99, 2)\nassert r == [20, 30], f"x depois de todos: esperado [20, 30], veio {r}"\nr = postos_mais_proximos([10, 20, 30], 26, 3)\nassert r == [10, 20, 30], f"k = len(kms): todos, em ordem. Veio {r}"\nr = postos_mais_proximos([7], 7, 1)\nassert r == [7], f"um posto só: esperado [7], veio {r}"' },
            { name: 'repetidos e negativos', code: 'kms = [-5, -5, 0, 3, 3, 3, 8]\nr = postos_mais_proximos(kms, 2, 4)\nassert r == [0, 3, 3, 3], f"esperado [0, 3, 3, 3], veio {r}"\nr = postos_mais_proximos(kms, -5, 3)\nassert r == [-5, -5, 0], f"esperado [-5, -5, 0], veio {r}"' },
            { name: 'comparação com força bruta', code: dedent(`
              import random
              random.seed(7)
              for _ in range(400):
                  kms = sorted(random.randint(-20, 20) for _ in range(random.randint(1, 10)))
                  x = random.randint(-25, 25)
                  k = random.randint(0, len(kms))
                  esperado = sorted(sorted(kms, key=lambda v: (abs(v - x), v))[:k])
                  r = postos_mais_proximos(kms, x, k)
                  assert r == esperado, f"postos_mais_proximos({kms}, {x}, {k}) deu {r}, esperado {esperado}"
            `) },
            { name: 'O(log n + k) por consulta', code: `${GUARDA_LACO}\n` + dedent(`
              from bisect import bisect_left as _bl
              kms = list(range(0, 2_000_000, 2))
              xs = [1001] + [q * 1999 for q in range(1000)]
              def _consultas():
                  return [postos_mais_proximos(kms, x, 3) for x in xs]
              rs = _no_prazo(1.0, "1 001 consultas numa lista de 1 milhão de postos passaram de 1 s: cada consulta deve custar O(log n + k), sem percorrer nem ordenar a lista", _consultas)
              assert rs[0] == [998, 1000, 1002], f"postos_mais_proximos(kms, 1001, 3): esperado [998, 1000, 1002] (998 e 1004 empatam, fica o 998), veio {rs[0]}"
              for x, r in zip(xs, rs):
                  i = _bl(kms, x)
                  perto = kms[max(0, i - 4):i + 4]
                  e = sorted(sorted(perto, key=lambda v: (abs(v - x), v))[:3])
                  assert r == e, f"postos_mais_proximos(kms, {x}, 3) deu {r}, esperado {e}"
            `) },
          ],
        },
      },
    ],
    projeto: [
      md('**Miniprojeto: autocompletar de cidades.** Monte uma lista com nomes de municípios brasileiros em minúsculas (umas centenas bastam), ordene-a uma vez e responda aos prefixos que o usuário digita. Todas as cidades que começam com `"sao "` ocupam uma **fatia contígua** da lista ordenada: o começo é `bisect_left(nomes, "sao ")`, e o fim é `bisect_left(nomes, "sao!")`, porque `"!"` é o caractere seguinte ao espaço (`chr(ord(" ") + 1)`). Generalize trocando o último caractere do prefixo pelo seguinte. Mostre as 10 primeiras sugestões a cada tecla e compare o tempo com `[c for c in nomes if c.startswith(p)]` em 100 000 nomes gerados aleatoriamente. **Extensão**: o que acontece com a ordem quando há acentos ("são" × "sao")? Use `unicodedata.normalize("NFD", s)` para separar os acentos das letras e descartá-los antes de ordenar.'),
    ],
    revisao: [
      md(`
        - Em lista ordenada, "\`xs[i] >= x\`" e "\`xs[i] > x\`" são F…F V…V: a busca procura a **fronteira**, não o valor.
        - Molde semiaberto: \`lo, hi = 0, len(xs)\`, \`while lo < hi\`, falso → \`lo = meio + 1\`, verdadeiro → \`hi = meio\`. Devolve de 0 a \`len(xs)\`, nunca -1.
        - \`bisect_left\` = limite inferior (primeiro ≥ x); \`bisect_right\` = limite superior (primeiro > x).
        - Contagem de x: \`bisect_right − bisect_left\`. Faixa [a, b]: \`bisect_right(b) − bisect_left(a)\`. Última ocorrência: \`bisect_right − 1\`.
        - Tabela de "até" pede \`bisect_left\`; tabela de "a partir de" pede \`bisect_right\`.
        - \`insort\` é O(n) por inserção. Ordenar só compensa com muitas consultas; para pertinência pura, \`set\`.
      `),
      english(`
        - **lower bound / upper bound**: limite inferior / limite superior
        - **insertion point**: ponto de inserção
        - **half-open interval**: intervalo semiaberto, como \`[lo, hi)\`
        - **floor / ceiling**: piso / teto
        - **off-by-one error**: erro de um a mais ou a menos, o bug clássico das fronteiras

        Da documentação do \`bisect\`: *"Locate the insertion point for x in a to maintain sorted order. (…) If x is already present in a, the insertion point will be before (to the left of) any existing entries."*

        Frase típica de entrevista: *"I'd sort once in O(n log n) and answer each range query with two binary searches, so q queries cost O((n + q) log n)."*
      `),
    ],
  },
  review: [
    ['O que `bisect_left(xs, x)` devolve, descrito como fronteira de um predicado?', 'A primeira posição i com xs[i] >= x, ou len(xs) se não houver: o limite inferior.'],
    ['Como contar em O(log n) quantas vezes x aparece numa lista ordenada?', 'bisect_right(xs, x) − bisect_left(xs, x). Dá 0 se x não estiver.'],
    ['No molde semiaberto, por que o ramo verdadeiro faz `hi = meio`, e por que isso não trava o laço?', 'Porque o meio pode ser a própria fronteira. Como lo < hi e o meio é arredondado para baixo, meio < hi: o intervalo encolhe mesmo assim.'],
    ['Numa tabela de faixas, quando usar `bisect_left` e quando usar `bisect_right`?', '"Até X" (o limite é o último valor da faixa): bisect_left nos limites. "A partir de X" (o corte é o primeiro valor da faixa): bisect_right nos cortes.'],
    ['Como achar o maior valor ≤ x (o piso) numa lista ordenada, e qual a armadilha?', 'i = bisect_right(xs, x) − 1. Se i == −1 não existe piso, e xs[−1] devolveria o último elemento sem dar erro.'],
    ['Quanto custa `insort`, e por quê?', 'O(n): achar a posição é O(log n), mas inserir no meio da lista desloca todos os elementos seguintes.'],
    ['Com q consultas em n itens, quando vale ordenar e usar bisect em vez de busca linear?', 'Quando q é grande: O((n + q) log n) contra O(q · n). Para uma consulta só, a busca linear ganha; para pertinência pura, set é melhor.'],
  ],
  references: ['python-docs', 'sedgewick-algs', 'bentley-pearls', 'python-time-complexity'],
});

/* ------------------------------------------------------------------ */
/* Busca binária na resposta                                           */
/* ------------------------------------------------------------------ */

/**
 * Envolve `pedacos` para acusar laço infinito com uma mensagem, em vez de estourar o tempo. Se o estudante
 * contar os pedaços sem chamar `pedacos`, o vigia de linhas de GUARDA_LACO faz o mesmo papel.
 */
const GUARDA_PEDACOS = `${GUARDA_LACO}\n` + dedent(`
  if "_pedacos_original" not in globals() and "pedacos" in globals():
      _pedacos_original = pedacos
  _contador = [0]
  if "_pedacos_original" in globals():
      def pedacos(rolos, L):
          _contador[0] += 1
          assert _contador[0] <= 100, "pedacos foi chamada mais de 100 vezes numa única chamada de maior_pedaco: o laço não está terminando (ou não descarta metade do intervalo a cada volta). Simule à mão o caso em que hi = lo + 1."
          return _pedacos_original(rolos, L)
  def _chama(rolos, k):
      _contador[0] = 0
      return _sem_laco_infinito(maior_pedaco, rolos, k)
`);

const naResposta = lesson({
  id: 'l4-busca-na-resposta',
  moduleId: 'm4-2',
  title: 'Busca binária na resposta',
  titleEn: 'Binary search on the answer',
  summary: 'Quando não há lista para buscar: chutar a resposta, verificar o chute e usar a monotonicidade para descartar metade das respostas possíveis a cada teste.',
  minutes: 50,
  objectives: [
    'Reconhecer quando um problema de otimização tem um verificador monotônico ("dá para fazer com x?")',
    'Escrever o verificador e escolher limites lo e hi que garantidamente contêm a resposta',
    'Aplicar os moldes do mínimo (primeiro verdadeiro) e do máximo (último verdadeiro) sem loop infinito',
    'Calcular o custo O(log(hi − lo) × custo do verificador) e compará-lo com testar resposta por resposta',
  ],
  skills: ['alg-busca'],
  terms: [
    t('busca binária na resposta', 'binary search on the answer', 'Buscar o valor ótimo num intervalo de respostas possíveis, testando cada chute com um verificador.', 'Binary search on the answer works whenever feasibility is monotonic.'),
    t('espaço de busca', 'search space', 'Conjunto das respostas candidatas; aqui, um intervalo de inteiros [lo, hi].'),
    t('verificador', 'feasibility check', 'Função que diz se um chute de resposta é viável, como "dá para despachar tudo em D dias com capacidade C?".'),
    t('viável', 'feasible', 'Que satisfaz todas as restrições do problema.', 'Return the least capacity such that a feasible schedule exists.'),
    t('predicado monotônico', 'monotonic predicate', 'Predicado que, percorrendo os valores em ordem, muda de resposta no máximo uma vez: F…F V…V ou V…V F…F.'),
    t('minimizar o máximo', 'minimize the maximum', 'Família de problemas em que se quer o menor valor possível para o pior caso, como a maior carga diária de um caminhão.'),
    t('maximizar o mínimo', 'maximize the minimum', 'Família de problemas em que se quer o maior valor possível para o pior caso, como a menor distância entre duas caixas de som.'),
    t('teto da divisão', 'ceiling division', 'Divisão arredondada para cima, ⌈p / v⌉; com inteiros em Python, (p + v - 1) // v.'),
  ],
  stages: {
    conceito: [
      md(`
        Na lição anterior a busca binária procurou uma fronteira **dentro de uma lista**. Mas a ideia de descartar metade a cada passo vale para qualquer coisa que tenha ordem, inclusive **as próprias respostas** de um problema.

        Uma transportadora precisa despachar pacotes de 3, 2, 2, 4, 1 e 4 kg, **na ordem da esteira**, em até 3 dias, com um caminhão que faz uma viagem por dia. Qual a **menor capacidade** de caminhão que dá conta? Não há fórmula direta. Mas, para um chute, a pergunta é fácil: **"com capacidade C, dá para despachar tudo em até 3 dias?"**. E ela tem uma propriedade preciosa: se dá com C, dá com qualquer capacidade maior. Ao longo de C = 1, 2, 3, … as respostas formam F…F V…V, e a menor capacidade que serve é a **fronteira**, exatamente o que você aprendeu a achar.

        Essa técnica se chama **{{busca binária na resposta|binary search on the answer}}**: em vez de testar C = 1, 2, 3, … até dar certo, você testa o meio do intervalo de respostas possíveis e descarta metade dele a cada teste. Um uso famoso fora das provas: o \`git bisect\` (o Git é assunto do Nível 10) acha qual entre milhares de commits introduziu um bug testando cerca de log₂ n deles. Se o bug, uma vez introduzido, continua lá, "este commit já tem o bug?" é F…F V…V ao longo da história.
      `),
    ],
    explicacao: [
      md(`
        ### Os três ingredientes
        1. **Um {{espaço de busca|search space}} ordenado**: as respostas candidatas são inteiros de \`lo\` a \`hi\` (capacidade, velocidade, tamanho, distância).
        2. **Um {{verificador|feasibility check}}** \`pode(x)\`, que diz se o chute x é {{viável|feasible}}. Ele costuma ser bem mais simples que o problema original: muitas vezes é um único laço de O(n).
        3. **Monotonicidade**: \`pode\` é um {{predicado monotônico|monotonic predicate}}. Em problemas de **mínimo**, se x é viável, x + 1 também é (F…F V…V). Em problemas de **máximo**, se x é viável, x − 1 também é (V…V F…F).

        Se faltar o terceiro ingrediente, a busca binária não dá erro: ela pode devolver uma resposta errada, em silêncio.

        ### Molde do mínimo: o primeiro verdadeiro
      `),
      code('python', `
        def primeiro_verdadeiro(pode, lo, hi):
            # requer: pode é F...F V...V em [lo, hi] e pode(hi) é True
            while lo < hi:
                meio = (lo + hi) // 2
                if pode(meio):
                    hi = meio          # meio serve; talvez exista um menor
                else:
                    lo = meio + 1      # meio não serve, e nada abaixo dele serve
            return lo
      `),
      md(`
        É o molde do limite inferior da lição anterior, trocando "\`xs[meio] >= alvo\`" por "\`pode(meio)\`". A invariante: \`pode(hi)\` é sempre verdadeiro, e tudo abaixo de \`lo\` é falso.

        ### Molde do máximo: o último verdadeiro
        Para V…V F…F ("o maior tamanho de pedaço que ainda rende k pedaços"), espelhe o molde:
      `),
      code('python', `
        def ultimo_verdadeiro(pode, lo, hi):
            # requer: pode é V...V F...F em [lo, hi] e pode(lo) é True
            while lo < hi:
                meio = (lo + hi + 1) // 2   # arredonda para CIMA
                if pode(meio):
                    lo = meio
                else:
                    hi = meio - 1
            return lo
      `),
      warn(`
        O \`+ 1\` no meio não é enfeite. Com \`lo = 3\` e \`hi = 4\`, \`(3 + 4) // 2\` dá 3; se \`pode(3)\` for verdadeiro, \`lo = meio\` deixa \`lo\` em 3 e o laço nunca termina. Arredondando para cima, o meio é 4, e as duas saídas (\`lo = 4\` ou \`hi = 3\`) encolhem o intervalo. A regra: **o ramo que faz \`lo = meio\` exige o meio arredondado para cima; o ramo que faz \`hi = meio\` exige o meio arredondado para baixo.**
      `, 'Loop infinito à espreita'),
      md(`
        Muitos problemas de otimização têm uma destas duas caras. **{{Minimizar o máximo|minimize the maximum}}**: a capacidade do caminhão é a menor carga diária máxima possível, e usa o molde do mínimo. **{{Maximizar o mínimo|maximize the minimum}}**: espalhar caixas de som para que a menor distância entre duas seja a maior possível, e usa o molde do máximo. Quando um enunciado tiver essa forma, desconfie de busca na resposta.

        ### Escolhendo lo e hi
        - \`lo\`: um valor abaixo do qual com certeza nada funciona, ou o menor valor permitido. Para o caminhão: \`max(pesos)\`, porque com menos que isso o pacote mais pesado nunca embarca.
        - \`hi\`: um valor que **com certeza** funciona. Para o caminhão: \`sum(pesos)\`, que leva tudo num dia só.

        No molde do máximo os papéis se invertem: \`lo\` é o valor que com certeza funciona, e \`hi\`, um valor acima do qual com certeza nada funciona.

        Se a resposta estiver fora de \`[lo, hi]\`, a busca nunca a encontra, e o erro é silencioso: com \`lo\` alto demais, o molde do mínimo devolve um valor que serve, mas não é o menor; com \`hi\` baixo demais, devolve \`hi\` mesmo que ele não sirva. Na dúvida, teste \`pode(hi)\` antes e trate o caso "impossível".

        ### Quanto custa
      `),
      {
        type: 'table',
        head: ['Abordagem', 'Chamadas ao verificador', 'Total (verificador O(n))'],
        rows: [
          ['Testar lo, lo + 1, lo + 2, … até dar certo', 'até hi − lo + 1', 'O(n · (hi − lo))'],
          ['Busca binária na resposta', 'no máximo ⌈log₂(hi − lo + 1)⌉', 'O(n · log(hi − lo))'],
        ],
        caption: 'Com 100 000 pacotes de até 10 000 kg, hi − lo chega perto de 10⁹: cerca de 30 chamadas ao verificador (3 × 10⁶ passos), contra até um bilhão de chamadas.',
      },
      tip(`
        Muitos verificadores dividem e arredondam para cima: uma pilha de p itens, num ritmo de v por hora, leva ⌈p / v⌉ horas. Esse é o **{{teto da divisão|ceiling division}}**, e com inteiros ele sai sem float: \`(p + v - 1) // v\`, ou \`-(-p // v)\`. Evite \`math.ceil(p / v)\`: \`p / v\` vira float, que só garante representar todos os inteiros exatamente até 2⁵³ (cerca de 9 × 10¹⁵), e com números maiores o arredondamento pode sair errado.
      `, 'Arredondar para cima sem float'),
      deep(`
        O verificador do caminhão enche o dia de forma gulosa: põe pacotes enquanto couberem e, quando o próximo não cabe, fecha o dia. Encher o máximo possível nunca atrapalha os dias seguintes, então esse laço dá o menor número de dias para uma capacidade fixa.

        Agora compare dois caminhões, com capacidades C < C'. Ao fim de cada dia, o maior já despachou **pelo menos** tantos pacotes quanto o menor: por indução, se ele começa o dia igual ou adiantado, os pacotes que o menor leva naquele dia, a partir do ponto em que o maior está, pesam no máximo C ≤ C' e cabem nele. Logo \`dias(C') <= dias(C)\`, e "\`dias(C) <= D\`" é F…F V…V.

        Repare no **≤**. A pergunta "\`dias(C) == D\`?" **não** é monotônica: com C enorme tudo vai em 1 dia, que é ≤ D, mas não == D. Verificadores quase sempre usam ≤ ou ≥.
      `, 'Por que o verificador é monotônico'),
      deep(`
        Quando a resposta é um número real (a raiz cúbica de 10, a taxa de juros embutida numa compra parcelada), não há "\`meio + 1\`". Use \`meio = (lo + hi) / 2\` e faça \`lo = meio\` ou \`hi = meio\`, por um **número fixo de iterações**: cada uma divide o intervalo por 2, e 100 iterações levariam um intervalo de 10⁹ para abaixo de 10⁻²⁰; na prática, ele para antes, no limite de precisão do float, e o laço termina do mesmo jeito. Um \`while hi - lo > 1e-9\` parece mais natural, mas pode nunca terminar: perto de 10⁹, dois floats vizinhos distam mais de 10⁻⁷, e o intervalo para de encolher antes de chegar a 10⁻⁹.
      `, 'Respostas reais'),
    ],
    exemplo: [
      md('Pacotes `[3, 2, 2, 4, 1, 4]`, prazo de **3 dias**. O espaço de busca vai de `lo = max = 4` a `hi = sum = 16`. Primeiro, veja que o verificador é mesmo F…F V…V:'),
      {
        type: 'table',
        head: ['Capacidade C', '4', '5', '6', '7', '8', '9', '…', '15', '16'],
        rows: [
          ['dias(C)', '5', '4', '3', '3', '3', '2', '…', '2', '1'],
          ['dias(C) <= 3?', 'F', 'F', '**V**', 'V', 'V', 'V', '…', 'V', 'V'],
        ],
        caption: 'Com C = 6, o caminhão leva 3 + 2 no dia 1, 2 + 4 no dia 2 e 1 + 4 no dia 3.',
      },
      md('A busca binária acha a fronteira sem calcular a tabela inteira:'),
      {
        type: 'table',
        head: ['Passo', 'lo', 'hi', 'meio', 'dias(meio)', 'pode(meio)?', 'Ação'],
        rows: [
          ['1', '4', '16', '10', '2', 'sim', '`hi = 10`'],
          ['2', '4', '10', '7', '3', 'sim', '`hi = 7`'],
          ['3', '4', '7', '5', '4', 'não', '`lo = 6`'],
          ['4', '6', '7', '6', '3', 'sim', '`hi = 6`'],
          ['fim', '6', '6', '', '', '', 'devolve **6**'],
        ],
        caption: '4 chamadas ao verificador para 13 candidatos (⌈log₂ 13⌉ = 4).',
      },
      md(`
        No passo 1, \`dias(10) = 2\` já cumpre o prazo, mas a busca não para: talvez exista capacidade menor. No passo 3, \`dias(5) = 4\` estoura o prazo, e a monotonicidade garante que 4 e 5 podem ser descartados juntos. Siga o verificador num chute que falha:
      `),
      trace(`
        def dias_necessarios(pesos, capacidade):
            dias, carga = 1, 0
            for p in pesos:
                if carga + p > capacidade:   # não cabe: fecha o dia
                    dias += 1
                    carga = 0
                carga += p
            return dias

        print(dias_necessarios([3, 2, 2, 4, 1, 4], 5))
      `, 'Com capacidade 5: [3, 2], [2], [4, 1], [4]. São 4 dias, um a mais que o prazo.'),
    ],
    codigo: [
      py(`
        import random

        def dias_necessarios(pesos, capacidade):
            # supõe capacidade >= max(pesos)
            dias, carga = 1, 0
            for p in pesos:
                if carga + p > capacidade:
                    dias += 1
                    carga = 0
                carga += p
            return dias

        def capacidade_minima(pesos, prazo):
            lo, hi = max(pesos), sum(pesos)
            chamadas = 0
            while lo < hi:
                meio = (lo + hi) // 2
                chamadas += 1
                if dias_necessarios(pesos, meio) <= prazo:
                    hi = meio
                else:
                    lo = meio + 1
            return lo, chamadas

        print(capacidade_minima([3, 2, 2, 4, 1, 4], 3))

        random.seed(1)
        pesos = [random.randint(1, 10_000) for _ in range(20_000)]
        cap, chamadas = capacidade_minima(pesos, 30)
        print(f"20 000 pacotes em 30 dias: capacidade {cap} kg")
        print(f"candidatos: {sum(pesos) - max(pesos) + 1}, chamadas ao verificador: {chamadas}")
        print("confere:", dias_necessarios(pesos, cap) <= 30, dias_necessarios(pesos, cap - 1) > 30)
      `, { caption: 'Cerca de 100 milhões de candidatos, 27 chamadas ao verificador. A última linha confere a fronteira: cap serve e cap − 1 não.' }),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e4-resposta-1',
          kind: 'mcq',
          prompt: 'Você quer a **menor** velocidade média inteira, em km/h, para um ônibus fazer 600 km dentro do horário de 8 horas. Qual verificador `pode(v)` permite usar busca binária na resposta?',
          difficulty: 'facil',
          skills: ['alg-busca'],
          hints: [
            'Para cada opção, imagine a resposta para v = 50, 60, 70, 80, 90… Ela muda de resposta uma única vez?',
            'Se uma velocidade serve, uma velocidade maior pode deixar de servir?',
            'Um predicado monotônico que não usa os 600 km nem as 8 horas consegue encontrar a velocidade que o problema pede?',
          ],
          explanation: 'Busca binária na resposta exige um verificador que vire de falso para verdadeiro uma única vez ao longo das respostas em ordem. "Termina em até 8 h" tem isso: o tempo 600 / v diminui quando v aumenta, e a fronteira é 75 km/h. "Exatamente" e "inteiro" são verdadeiros em pontos isolados. Por isso verificadores quase sempre usam ≤ ou ≥, nunca ==.',
          options: [
            { text: 'Com velocidade v, a viagem termina em **até** 8 horas?', correct: true, feedback: 'Isso: se termina em até 8 h com v, termina também com qualquer velocidade maior. O padrão é F…F V…V, e a resposta é a fronteira (75 km/h).' },
            { text: 'Com velocidade v, a viagem dura **exatamente** 8 horas?', feedback: 'Esse predicado é verdadeiro num único ponto (v = 75) e falso dos dois lados. Ao testar um meio falso, a busca não tem como saber para que lado ir.' },
            { text: 'Com velocidade v, a viagem dura um número **inteiro** de horas?', feedback: 'Verdadeiro para v = 50, 60, 75, 100, 120… e falso entre eles: vai e volta. Sem monotonicidade, descartar metade pode jogar fora a resposta.' },
            { text: 'A velocidade v é menor que 80 km/h, o limite da via?', feedback: 'Esse predicado é monotônico (V…V F…F), mas não fala da viagem: a fronteira dele é sempre 80, qualquer que seja a distância. O verificador precisa testar a condição do problema.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e4-resposta-2',
          kind: 'parsons',
          lang: 'python',
          prompt: 'Monte o molde do **mínimo**: a função devolve o menor x em `[lo, hi]` com `pode(x)` verdadeiro, supondo que `pode` é F…F V…V e que `pode(hi)` é verdadeiro.',
          difficulty: 'facil',
          skills: ['alg-busca'],
          hints: [
            'Qual linha precisa vir antes de todas as outras dentro do laço?',
            'Se pode(meio) é verdadeiro, o meio pode ser a resposta: você o mantém dentro do intervalo ou o descarta?',
            'O return fica dentro ou fora do while?',
          ],
          explanation: 'Quando `pode(meio)` é verdadeiro, o meio pode ser a resposta, então ele fica no intervalo (`hi = meio`). Quando é falso, ele e tudo abaixo dele estão descartados (`lo = meio + 1`). Com o meio arredondado para baixo, `meio < hi`, então os dois ramos encolhem o intervalo, e o laço termina com `lo == hi` na fronteira.',
          lines: [
            'def primeiro_verdadeiro(pode, lo, hi):',
            '    while lo < hi:',
            '        meio = (lo + hi) // 2',
            '        if pode(meio):',
            '            hi = meio',
            '        else:',
            '            lo = meio + 1',
            '    return lo',
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e4-resposta-3',
          kind: 'predict',
          lang: 'python',
          prompt: 'O que este programa imprime? Acompanhe `lo` e `hi` a cada volta.',
          difficulty: 'intermediario',
          skills: ['alg-busca'],
          hints: [
            'Este é o molde do último verdadeiro: qual é o maior x com x * x <= 50?',
            'Calcule o primeiro meio com cuidado: (0 + 50 + 1) // 2.',
            'Anote lo e hi depois de cada passo; o laço para quando eles ficam iguais.',
          ],
          explanation: 'O laço procura o maior x com x² ≤ 50, a raiz quadrada inteira de 50: 7 (7² = 49 e 8² = 64). O último meio testado é 8: com lo = 7 e hi = 8, o arredondamento para cima escolhe 8, que falha, e hi cai para 7. Com arredondamento para baixo, o meio seria 7, pode(7) seria verdadeiro, `lo = 7` não mudaria nada e o laço rodaria para sempre. Na biblioteca padrão, `math.isqrt(50)` faz essa conta.',
          code: dedent(`
            def pode(x):
                return x * x <= 50

            lo, hi = 0, 50
            meios = []
            while lo < hi:
                meio = (lo + hi + 1) // 2
                meios.append(meio)
                if pode(meio):
                    lo = meio
                else:
                    hi = meio - 1
            print(meios)
            print(lo)
          `),
          answer: '[25, 12, 6, 9, 7, 8]\n7',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e4-resposta-4',
          kind: 'fix',
          lang: 'python',
          prompt: 'Uma eletricista tem rolos de cabo com `rolos[i]` metros (inteiros) e precisa de `k` pedaços **do mesmo tamanho inteiro**, o maior possível. Sobras são descartadas e não dá para emendar: com pedaços de L metros, um rolo de c metros rende `c // L` pedaços. `maior_pedaco(rolos, k)` deve devolver o maior L, ou 0 se nem com L = 1 der. A versão abaixo às vezes **trava** e às vezes devolve um tamanho **menor** que o possível. São dois erros, ambos ligados às regras desta lição. Corrija-os.',
          difficulty: 'intermediario',
          skills: ['alg-busca'],
          hints: [
            'Simule o laço com lo = 2 e hi = 3, supondo que pedaços de 2 m bastam. Qual é o meio? O que muda depois dessa volta?',
            'No molde do último verdadeiro, para que lado o meio precisa ser arredondado?',
            'Com rolos = [1, 100] e k = 2, qual é a resposta certa? Ela está dentro do intervalo [lo, hi] que o código usa?',
            'hi precisa ser um valor que nenhum pedaço viável ultrapasse. Qual é o maior pedaço que algum rolo consegue render?',
          ],
          explanation: 'Dois erros clássicos. (1) Espaço de busca curto demais: um pedaço pode ser maior que o menor rolo, que simplesmente vira sobra; o limite certo é o maior rolo, porque um pedaço maior que ele não sai de rolo nenhum. Com a resposta fora de [lo, hi], a busca nunca a encontra, e o erro é silencioso. (2) No molde do máximo, o ramo verdadeiro faz `lo = meio`; com o meio arredondado para baixo e hi = lo + 1, o meio é o próprio lo e nada muda. Com `(lo + hi + 1) // 2`, o meio é sempre maior que lo. O custo fica O(n · log(max(rolos))).',
          starter: dedent(`
            def pedacos(rolos, L):
                total = 0
                for c in rolos:
                    total += c // L
                return total


            def maior_pedaco(rolos, k):
                if pedacos(rolos, 1) < k:
                    return 0
                lo, hi = 1, min(rolos)
                while lo < hi:
                    meio = (lo + hi) // 2
                    if pedacos(rolos, meio) >= k:
                        lo = meio
                    else:
                        hi = meio - 1
                return lo
          `),
          solution: dedent(`
            def pedacos(rolos, L):
                total = 0
                for c in rolos:
                    total += c // L
                return total


            def maior_pedaco(rolos, k):
                if pedacos(rolos, 1) < k:
                    return 0
                lo, hi = 1, max(rolos)
                while lo < hi:
                    meio = (lo + hi + 1) // 2
                    if pedacos(rolos, meio) >= k:
                        lo = meio
                    else:
                        hi = meio - 1
                return lo
          `),
          tests: [
            { name: 'exemplo', code: `${GUARDA_PEDACOS}\nr = _chama([8, 5, 3], 4)\nassert r == 3, f"maior_pedaco([8, 5, 3], 4) deu {r}, esperado 3 (2 + 1 + 1 pedaços de 3 m)"` },
            { name: 'pedaço maior que o menor rolo', code: `${GUARDA_PEDACOS}\nr = _chama([1, 100], 2)\nassert r == 50, f"maior_pedaco([1, 100], 2) deu {r}, esperado 50: o rolo de 1 m pode simplesmente sobrar, e a resposta passa do menor rolo. O seu intervalo [lo, hi] contém o 50?"` },
            { name: 'impossível e bordas', code: `${GUARDA_PEDACOS}\nassert _chama([3, 2], 6) == 0, "só há 5 m de cabo: 6 pedaços é impossível, devolva 0"\nr = _chama([7], 1)\nassert r == 7, f"um rolo de 7 m e 1 pedaço: esperado 7, veio {r}"\nr = _chama([5, 5, 5], 3)\nassert r == 5, f"três rolos de 5 m e 3 pedaços: esperado 5, veio {r}"\nr = _chama([10], 10)\nassert r == 1, f"um rolo de 10 m e 10 pedaços: esperado 1, veio {r}"` },
            { name: 'rolos enormes', code: `${GUARDA_PEDACOS}\nr = _chama([10**9, 10**9 - 1], 3)\nassert r == 500_000_000, f"esperado 500000000 (2 pedaços do primeiro rolo e 1 do segundo), veio {r}"` },
            { name: 'comparação com força bruta', code: `${GUARDA_PEDACOS}\n` + dedent(`
              import random
              random.seed(9)
              for _ in range(300):
                  rolos = [random.randint(1, 30) for _ in range(random.randint(1, 6))]
                  k = random.randint(1, 15)
                  esperado = 0
                  for L in range(1, max(rolos) + 1):
                      if sum(c // L for c in rolos) >= k:
                          esperado = L
                  r = _chama(rolos, k)
                  assert r == esperado, f"maior_pedaco({rolos}, {k}) deu {r}, esperado {esperado}"
            `) },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e4-resposta-5',
          kind: 'code',
          lang: 'python',
          prompt: 'Uma professora tem pilhas de redações para corrigir: a pilha i tem `pilhas[i]` redações. Ela corrige `v` redações por hora, uma pilha de cada vez: se uma pilha acaba no meio de uma hora, ela descansa o resto dessa hora e só começa a próxima pilha na hora seguinte. Assim, a pilha i leva ⌈pilhas[i] / v⌉ horas. Escreva `ritmo_minimo(pilhas, h)`, que devolve o **menor** v inteiro com o qual ela termina tudo em até `h` horas. Garantias: `h >= len(pilhas)` e toda pilha tem pelo menos 1 redação. Para testar a técnica, os números podem ser enormes (até 10¹⁸): use só aritmética inteira.',
          difficulty: 'intermediario',
          skills: ['alg-busca'],
          hints: [
            'Se ela termina a tempo com ritmo v, termina com v + 1? Que forma tem o predicado?',
            'Qual o menor ritmo que faz sentido? E um ritmo que com certeza basta, sabendo que h >= len(pilhas)?',
            'Escreva primeiro uma função que calcula as horas gastas com um ritmo v. Como calcular ⌈p / v⌉ sem passar por float?',
          ],
          explanation: 'O total de horas só diminui (ou fica igual) quando v aumenta, então "horas(v) <= h" é F…F V…V e o molde do mínimo se aplica, com lo = 1 e hi = max(pilhas): nesse ritmo cada pilha leva 1 hora, e h >= len(pilhas) garante que basta. O custo é O(n · log(max(pilhas))): cerca de 60 passadas pela lista mesmo com pilhas de 10¹⁸. O teto inteiro `(p + v - 1) // v` evita o float: com p = 10¹⁸, `p / v` perde precisão e `math.ceil` pode arredondar errado, fazendo um ritmo insuficiente parecer viável.',
          starter: dedent(`
            def ritmo_minimo(pilhas, h):
                # menor v inteiro tal que a soma de ⌈p / v⌉ (para p em pilhas) seja <= h
                pass
          `),
          solution: dedent(`
            def horas(pilhas, v):
                total = 0
                for p in pilhas:
                    total += (p + v - 1) // v
                return total


            def ritmo_minimo(pilhas, h):
                lo, hi = 1, max(pilhas)
                while lo < hi:
                    meio = (lo + hi) // 2
                    if horas(pilhas, meio) <= h:
                        hi = meio
                    else:
                        lo = meio + 1
                return lo
          `),
          tests: [
            { name: 'exemplos', code: 'for pilhas, h, esperado in [([3, 6, 7, 11], 8, 4), ([30, 11, 23, 4, 20], 5, 30), ([30, 11, 23, 4, 20], 6, 23)]:\n    r = ritmo_minimo(pilhas, h)\n    assert r == esperado, f"ritmo_minimo({pilhas}, {h}) deu {r}, esperado {esperado}"' },
            { name: 'uma pilha', code: 'for h, esperado in [(1, 10), (3, 4), (10, 1)]:\n    r = ritmo_minimo([10], h)\n    assert r == esperado, f"ritmo_minimo([10], {h}) deu {r}, esperado {esperado}"\nr = ritmo_minimo([10], 100)\nassert r == 1, f"com folga de sobra, o ritmo mínimo é 1 (nunca 0); veio {r}"' },
            { name: 'h igual ao número de pilhas', code: 'r = ritmo_minimo([5, 9, 2], 3)\nassert r == 9, f"com uma hora por pilha, o ritmo é a maior pilha: esperado 9, veio {r}"' },
            { name: 'números enormes, só inteiros', code: `${GUARDA_LACO}\n` + dedent(`
              _lento = "com pilhas de até 10**18 redações, a sua função passou de 1 s: testar v = 1, 2, 3, … não termina. Use busca binária entre o menor e o maior ritmo possível"
              r = _no_prazo(1.0, _lento, ritmo_minimo, [10**18], 3)
              assert r == 333333333333333334, f"esperado 333333333333333334, veio {r}. Se você usou p / v, o float perde precisão com números desse tamanho: calcule o teto só com inteiros"
              r = _no_prazo(1.0, _lento, ritmo_minimo, [10**18, 1], 2)
              assert r == 10**18, f"esperado 10**18, veio {r}"
            `) },
            { name: 'muitas pilhas: confere a fronteira', code: `${GUARDA_LACO}\n` + dedent(`
              import random
              r = _no_prazo(1.0, "com uma pilha de 10**9 redações, a sua função passou de 1 s: testar os ritmos um a um não termina. Use busca binária", ritmo_minimo, [10**9, 1], 2)
              assert r == 10**9, f"ritmo_minimo([10**9, 1], 2) deu {r}, esperado 10**9"
              random.seed(11)
              def _horas(pilhas, v):
                  return sum((p + v - 1) // v for p in pilhas)
              for _ in range(30):
                  pilhas = [random.randint(1, 10**9) for _ in range(random.randint(1, 300))]
                  h = random.randint(len(pilhas), 5 * len(pilhas) + 10)
                  r = ritmo_minimo(pilhas, h)
                  assert _horas(pilhas, r) <= h, f"com ritmo {r} ela não termina em {h} horas"
                  assert r == 1 or _horas(pilhas, r - 1) > h, f"o ritmo {r - 1} também bastaria: {r} não é o mínimo"
            `) },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e4-resposta-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Num festival de praia, \`pontos\` traz as posições (em metros, inteiros, **fora de ordem** e talvez repetidas) das tomadas ao longo da orla. A organização vai instalar \`c\` caixas de som (2 ≤ c ≤ len(pontos)), no máximo uma por tomada, e quer **maximizar a menor distância** entre duas caixas, para o som de uma não abafar o da outra. Escreva \`maior_distancia_minima(pontos, c)\`, sem alterar a lista recebida.

            Exemplo: com \`pontos = [1, 2, 8, 4, 9]\` e \`c = 3\`, a resposta é 3 (caixas em 1, 4 e 8, ou em 1, 4 e 9).

            Pode haver 20 000 tomadas com posições até 10⁹: tentar todas as escolhas, ou todas as distâncias uma a uma, não termina a tempo.
          `),
          difficulty: 'desafio',
          skills: ['alg-busca'],
          hints: [
            'Se dá para instalar as c caixas com distância mínima d, dá com d − 1? Que molde isso pede, o do mínimo ou o do máximo?',
            'Para um d fixo, como decidir rápido se cabem c caixas? Ajuda ter os pontos em ordem?',
            'Para um d fixo, onde faz sentido pôr a primeira caixa? E a segunda: existe motivo para deixá-la mais longe da primeira do que o necessário?',
            'Qual o menor valor possível da resposta, e qual o maior? Lembre do arredondamento no molde do máximo.',
          ],
          explanation: 'Maximizar o mínimo é o caso típico do molde do máximo: "cabem c caixas com distância ≥ d?" é V…V F…F, porque o que cabe com d também cabe com qualquer distância menor. O verificador é guloso sobre os pontos ordenados: cada caixa vai no primeiro ponto a pelo menos d da anterior; pôr uma caixa o mais à esquerda possível nunca atrapalha as seguintes, porque sobra mais espaço à direita. Ordenar custa O(n log n) uma vez; cada verificação custa O(n), e são O(log(max − min)) delas, cerca de 30 para posições até 10⁹. O espaço de busca vai de 0 (sempre viável) até max − min, e o meio arredondado para cima evita o loop infinito.',
          starter: dedent(`
            def maior_distancia_minima(pontos, c):
                # maior d tal que dá para escolher c pontos com distância >= d entre quaisquer dois
                pass
          `),
          solution: dedent(`
            def cabe(ps, c, d):
                # ps ordenada: põe cada caixa no primeiro ponto a pelo menos d da anterior
                colocadas, ultima = 1, ps[0]
                for i in range(1, len(ps)):
                    if ps[i] - ultima >= d:
                        colocadas += 1
                        ultima = ps[i]
                        if colocadas == c:
                            return True
                return colocadas >= c


            def maior_distancia_minima(pontos, c):
                ps = sorted(pontos)
                lo, hi = 0, ps[-1] - ps[0]
                while lo < hi:
                    meio = (lo + hi + 1) // 2
                    if cabe(ps, c, meio):
                        lo = meio
                    else:
                        hi = meio - 1
                return lo
          `),
          tests: [
            { name: 'exemplo', code: `${GUARDA_LACO}\n` + 'r = _sem_laco_infinito(maior_distancia_minima, [1, 2, 8, 4, 9], 3)\nassert r == 3, f"esperado 3, veio {r}"' },
            { name: 'dois pontos e repetidos', code: `${GUARDA_LACO}\n` + 'for pontos, c, esperado in [([10, 3], 2, 7), ([5, 5], 2, 0), ([0, 0, 0, 7], 3, 0), ([0, 0, 0, 7], 2, 7)]:\n    r = _sem_laco_infinito(maior_distancia_minima, pontos, c)\n    assert r == esperado, f"maior_distancia_minima({pontos}, {c}) deu {r}, esperado {esperado}"' },
            { name: 'todos os pontos e negativos', code: `${GUARDA_LACO}\n` + 'for pontos, c, esperado in [([1, 10, 4, 20], 4, 3), ([-10, 0, 10], 2, 20), ([-10, 0, 10], 3, 10)]:\n    r = _sem_laco_infinito(maior_distancia_minima, pontos, c)\n    assert r == esperado, f"maior_distancia_minima({pontos}, {c}) deu {r}, esperado {esperado}"' },
            { name: 'não altera a lista', code: `${GUARDA_LACO}\n` + 'p = [9, 1, 5]\n_sem_laco_infinito(maior_distancia_minima, p, 2)\nassert p == [9, 1, 5], f"a lista recebida mudou para {p}: ordene uma cópia"' },
            { name: 'comparação com força bruta', code: `${GUARDA_LACO}\n` + dedent(`
              import random
              from itertools import combinations
              random.seed(3)
              def _bruta(pontos, c):
                  melhor = 0
                  for comb in combinations(sorted(pontos), c):
                      melhor = max(melhor, min(comb[i + 1] - comb[i] for i in range(c - 1)))
                  return melhor
              for _ in range(300):
                  pontos = [random.randint(-30, 30) for _ in range(random.randint(2, 7))]
                  c = random.randint(2, len(pontos))
                  r = _sem_laco_infinito(maior_distancia_minima, list(pontos), c)
                  e = _bruta(pontos, c)
                  assert r == e, f"maior_distancia_minima({pontos}, {c}) deu {r}, esperado {e}"
            `) },
            { name: '20 000 tomadas', code: `${GUARDA_LACO}\n` + dedent(`
              import random, time
              _sem_laco_infinito(maior_distancia_minima, [1, 2, 8, 4, 9], 3)
              def _cabe(ps, c, d):
                  n, ultima = 1, ps[0]
                  for p in ps[1:]:
                      if p - ultima >= d:
                          n, ultima = n + 1, p
                  return n >= c
              random.seed(6)
              medio = random.sample(range(10**9), 500)
              r = _no_prazo(1.5, "com 500 tomadas a sua função já passou de 1,5 s: tentar as escolhas, ou as distâncias uma a uma, não termina com 20 000. Busque a distância por busca binária, com um verificador O(n)", maior_distancia_minima, list(medio), 20)
              ps = sorted(medio)
              assert _cabe(ps, 20, r) and not _cabe(ps, 20, r + 1), f"com 500 tomadas e 20 caixas, a resposta {r} está errada"
              random.seed(5)
              pontos = random.sample(range(10**9), 20_000)
              t0 = time.perf_counter()
              r = maior_distancia_minima(pontos, 50)
              dt = time.perf_counter() - t0
              ps = sorted(pontos)
              assert _cabe(ps, 50, r), f"com distância mínima {r} não cabem 50 caixas"
              assert not _cabe(ps, 50, r + 1), f"cabem 50 caixas com distância {r + 1}: {r} não é o máximo"
              assert dt < 2.0, f"levou {dt:.2f} s: busque a distância por busca binária, não uma a uma"
            `) },
          ],
        },
      },
    ],
    projeto: [
      md('**Miniprojeto: simulador de financiamento.** Na Tabela Price, uma dívida de `pv` reais com juros de `i` ao mês é paga em `n` parcelas iguais; todo mês o saldo cresce com os juros e cai com a parcela: `saldo = saldo * (1 + i) - parcela`. Escreva `parcela_minima(pv, i, n)`, que acha, **em centavos inteiros**, a menor parcela que zera a dívida em n meses, com busca binária na resposta. Qual é o verificador, e por que ele é monotônico? Que `lo` e `hi` são seguros? Confira o resultado contra a fórmula fechada `pv * i / (1 - (1 + i) ** -n)` e explique por que a diferença fica abaixo de um centavo. Depois inverta a pergunta: com um orçamento de R$ 900 por mês e juros de 1,5% ao mês, qual o **maior** valor financiável em 48 parcelas? (Agora é o molde do máximo.)'),
    ],
    revisao: [
      md(`
        - Busca na resposta: quando é mais fácil **verificar** um chute do que calcular a resposta, e o verificador é monotônico.
        - Mínimo (F…F V…V): \`meio = (lo + hi) // 2\`; verdadeiro → \`hi = meio\`; falso → \`lo = meio + 1\`.
        - Máximo (V…V F…F): \`meio = (lo + hi + 1) // 2\`; verdadeiro → \`lo = meio\`; falso → \`hi = meio − 1\`.
        - \`[lo, hi]\` precisa conter a resposta: confira que o extremo "garantido" é mesmo viável.
        - Custo: O(log(hi − lo)) chamadas ao verificador. Verificadores usam ≤ ou ≥, nunca ==.
        - Teto inteiro: \`(p + v - 1) // v\`. Respostas reais: número fixo de iterações.
      `),
      english(`
        - **binary search on the answer**: busca binária na resposta
        - **feasibility check / feasible**: verificador / viável
        - **monotonic predicate**: predicado monotônico
        - **search space**: espaço de busca
        - **minimize the maximum / maximize the minimum**: minimizar o máximo / maximizar o mínimo

        Frase típica de entrevista: *"Feasibility is monotonic: if we can ship everything with capacity C, we can with any larger capacity. So I binary search on C between max(weights) and sum(weights), which costs O(n log(sum of weights))."*
      `),
    ],
  },
  review: [
    ['Que propriedade o verificador precisa ter para permitir busca binária na resposta?', 'Ser monotônico: percorrendo as respostas em ordem, ele muda de falso para verdadeiro (ou o contrário) uma única vez.'],
    ['No molde do máximo (V…V F…F), por que o meio é `(lo + hi + 1) // 2`?', 'Porque o ramo verdadeiro faz lo = meio; com hi = lo + 1 e arredondamento para baixo, o meio seria o próprio lo e o laço não avançaria.'],
    ['Na capacidade mínima do caminhão, quais são lo e hi, e por quê?', 'lo = max(pesos), pois abaixo disso o pacote mais pesado nunca embarca; hi = sum(pesos), que despacha tudo num dia e é sempre viável.'],
    ['Quanto custa uma busca binária na resposta com verificador O(n)?', 'O(n · log(hi − lo)): no máximo ⌈log₂(hi − lo + 1)⌉ chamadas ao verificador.'],
    ['Por que o verificador deve perguntar "dias(C) ≤ D" e não "dias(C) == D"?', 'Porque == não é monotônico: com C grande os dias ficam abaixo de D e a resposta volta a ser falsa.'],
    ['Como calcular ⌈p / v⌉ com inteiros em Python, e por que evitar `math.ceil(p / v)`?', '(p + v − 1) // v, ou −(−p // v). p / v passa por float, que perde precisão com inteiros acima de 2⁵³.'],
    ['Como fazer busca binária quando a resposta é um número real?', 'meio = (lo + hi) / 2 com lo = meio ou hi = meio, por um número fixo de iterações (100, por exemplo), em vez de esperar o intervalo ficar menor que um epsilon.'],
  ],
  references: ['bentley-pearls', 'clrs', 'pro-git', 'python-docs'],
});

export const lessons: Lesson[] = [fronteiras, naResposta];
