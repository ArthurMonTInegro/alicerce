import type { Level } from '../types.ts';
import { dedent, deep, english, info, lesson, md, py, t, tip, trace, warn } from '../helpers.ts';

const porQuePython = lesson({
  id: 'l2-por-que-python',
  moduleId: 'm2-1',
  title: 'Por que Python, e como ele executa seu código',
  titleEn: 'Why Python, and how it runs your code',
  summary: 'A justificativa técnica da escolha, o interpretador, o REPL, PEP 8 e como ler a documentação oficial.',
  minutes: 20,
  objectives: ['Entender os critérios da escolha de Python como primeira linguagem', 'Saber o que é um interpretador e o que é bytecode', 'Conhecer o PEP 8 e a documentação oficial'],
  skills: ['py-ambiente'],
  terms: [
    t('interpretador', 'interpreter', 'Programa que lê e executa código-fonte (o python).'),
    t('código-fonte', 'source code', 'O texto do programa escrito por pessoas.'),
    t('sintaxe', 'syntax', 'As regras de escrita de uma linguagem.', 'SyntaxError: invalid syntax'),
    t('semântica', 'semantics', 'O significado do que está escrito: o que o código faz.'),
    t('biblioteca padrão', 'standard library', 'Módulos que já vêm com a linguagem.'),
    t('guia de estilo', 'style guide', 'Convenções de formatação (em Python, o PEP 8).'),
  ],
  stages: {
    conceito: [md('Você já escreveu Python nas lições anteriores. Agora vamos entender **por que** ele é a primeira linguagem desta trilha e **o que acontece** quando você clica em Executar.')],
    explicacao: [
      md(`
        **Critérios que usamos para escolher a primeira linguagem** e como as opções se comparam:
      `),
      { type: 'table', head: ['Critério', 'Python', 'JavaScript', 'C', 'Java'], rows: [
        ['Sintaxe com pouco "ruído" para iniciante', '✔✔', '✔', '✘', '✘'],
        ['Erros com mensagens claras', '✔✔ (3.10+ sugere correções)', '✔', '✘ (segfault)', '✔'],
        ['Roda no navegador sem instalar nada', '✔ (Pyodide/WebAssembly)', '✔✔', '✘', '✘'],
        ['Ensina modelo de memória baixo nível', '✘', '✘', '✔✔', '✔'],
        ['Uso em universidades de referência', 'MIT 6.100L, Berkeley CS61A, Stanford CS106A, CMU 15-112', 'NUS CS1101S (subconjunto)', 'Harvard CS50 (início)', 'Princeton COS 126'],
        ['Mercado e aplicações', 'dados, IA, back-end, automação', 'web (front e back)', 'sistemas, embarcados', 'corporativo, Android'],
      ] },
      md(`
        **Decisão**: Python como primeira linguagem, porque reduz a carga cognitiva com a sintaxe e deixa o foco nos **conceitos** (variáveis, controle de fluxo, decomposição), tem mensagens de erro didáticas e roda no navegador — o que permite feedback imediato. As limitações são cobertas depois: **C** aparece no Nível 8 (memória e ponteiros), **JavaScript** no Nível 6 (web) e **tipagem estática** com type hints e TypeScript.

        **Como seu código executa**: o interpretador CPython (1) lê o texto e verifica a {{sintaxe|syntax}}, (2) compila para **bytecode** (instruções de uma máquina virtual), e (3) a máquina virtual executa o bytecode. Aqui no Alicerce, esse mesmo CPython foi compilado para **WebAssembly** (projeto Pyodide) e roda dentro do seu navegador, isolado.
      `),
      deep('Linguagem "interpretada" × "compilada" é uma propriedade da **implementação**, não da linguagem. CPython compila para bytecode; PyPy compila para código de máquina em tempo de execução (JIT). C é normalmente compilado antecipadamente (AOT) para código de máquina.', 'Interpretada ou compilada?'),
    ],
    exemplo: [
      md('Você pode ver o bytecode de uma função com o módulo `dis` (*disassembler*):'),
      py(`
        import dis

        def soma(a, b):
            return a + b

        dis.dis(soma)
      `),
    ],
    codigo: [
      md('O **Zen of Python** resume a filosofia da linguagem. Leia em inglês e tente traduzir 3 linhas:'),
      py('import this'),
      english('*"Readability counts."* — a legibilidade importa. *"Errors should never pass silently."* — erros nunca devem passar em silêncio. Essas frases aparecem em code reviews do mundo inteiro.'),
      tip('O **PEP 8** é o guia de estilo oficial: 4 espaços de indentação, `snake_case` para funções e variáveis, `PascalCase` para classes, linhas de até ~79–99 caracteres. Ferramentas como **ruff** e **black** aplicam isso automaticamente.'),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e2-py-1',
          kind: 'mcq',
          prompt: 'Segundo o PEP 8, qual nome segue a convenção para uma **função**?',
          difficulty: 'facil',
          skills: ['py-ambiente'],
          hints: ['Funções e variáveis usam o mesmo estilo.'],
          explanation: 'Funções e variáveis: `snake_case`. Classes: `PascalCase`. Constantes: `MAIUSCULAS_COM_UNDERSCORE`.',
          options: [
            { text: 'CalcularMedia', feedback: 'PascalCase é para classes.' },
            { text: 'calcular_media', correct: true, feedback: 'snake_case: correto para funções.' },
            { text: 'calcularMedia', feedback: 'camelCase é comum em JavaScript e Java, não em Python.' },
            { text: 'CALCULAR_MEDIA', feedback: 'Maiúsculas indicam constantes.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e2-py-2',
          kind: 'mcq',
          prompt: 'Qual frase sobre o Python no Alicerce está **correta**?',
          difficulty: 'intermediario',
          skills: ['py-ambiente'],
          hints: ['Releia o parágrafo "Como seu código executa".'],
          explanation: 'O CPython (o mesmo interpretador oficial) foi compilado para WebAssembly e roda no seu navegador, isolado do seu sistema.',
          options: [
            { text: 'Seu código é enviado a um servidor que o executa', feedback: 'Não: a execução é local, no navegador, o que também protege sua privacidade.' },
            { text: 'É uma versão simplificada que não é Python de verdade', feedback: 'É o CPython oficial, compilado para WebAssembly.' },
            { text: 'O CPython foi compilado para WebAssembly e roda no navegador', correct: true, feedback: 'Correto.' },
            { text: 'O navegador traduz Python para JavaScript linha a linha', feedback: 'Não há tradução para JS: o interpretador inteiro roda em WebAssembly.' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e2-py-desafio',
          kind: 'fix',
          lang: 'python',
          prompt: 'Este código tem **três** erros de sintaxe/indentação. Leia cada `SyntaxError` em inglês, corrija um de cada vez e faça `area(3, 4)` devolver `12`.',
          difficulty: 'intermediario',
          skills: ['py-ambiente', 'en-leitura-erros'],
          hints: ['Execute e leia a última linha do erro: ela aponta a linha e o tipo do problema.', 'Toda linha que abre um bloco (def, if, for) termina com `:`.', 'Parênteses abertos precisam ser fechados; o corpo da função precisa de indentação.'],
          explanation: 'Corrigir um erro por vez, relendo a mensagem, é a forma mais rápida — o Python para no primeiro erro de sintaxe que encontra.',
          starter: dedent(`
            def area(base, altura)
            resultado = base * altura
                return (resultado
          `),
          solution: dedent(`
            def area(base, altura):
                resultado = base * altura
                return resultado
          `),
          tests: [{ name: 'area(3, 4) == 12', code: 'assert area(3, 4) == 12' }],
        },
      },
    ],
    projeto: [md('**Instale Python no seu computador** pelo site oficial [python.org](https://www.python.org/downloads/). Rode `python --version` (ou `python3 --version`) no terminal e abra o REPL com `python`. Digite `help(len)` e leia a ajuda em inglês.')],
    revisao: [md('- Python foi escolhido por legibilidade, mensagens de erro e execução no navegador.\n- CPython: código-fonte → bytecode → máquina virtual.\n- PEP 8: snake_case, 4 espaços, legibilidade.')],
  },
  review: [
    ['Por que Python é a primeira linguagem desta trilha?', 'Sintaxe com pouco ruído, mensagens de erro claras, execução no navegador e uso em cursos de referência; outras linguagens entram depois para cobrir o que Python esconde.'],
    ['O que é bytecode?', 'Instruções de uma máquina virtual geradas a partir do código-fonte e executadas pelo interpretador.'],
  ],
  references: ['python-docs', 'pep8', 'pyodide', 'mit-6100l', 'cs61a', 'cmu-15112'],
});

const listas = lesson({
  id: 'l2-listas',
  moduleId: 'm2-2',
  title: 'Listas',
  titleEn: 'Lists',
  summary: 'Índices, fatias, métodos, iteração, mutabilidade e compreensões de lista.',
  minutes: 35,
  objectives: ['Criar, indexar e fatiar listas', 'Usar append, insert, pop, remove, sort', 'Entender mutabilidade e aliasing', 'Escrever list comprehensions'],
  skills: ['prog-listas'],
  terms: [
    t('lista', 'list', 'Sequência ordenada e mutável de valores.'),
    t('índice', 'index', 'Posição de um elemento, começando em 0.', 'IndexError: list index out of range'),
    t('fatia', 'slice', 'Pedaço de uma sequência: lista[1:3].'),
    t('mutável', 'mutable', 'Que pode ser alterado depois de criado.'),
    t('apelido (aliasing)', 'aliasing', 'Dois nomes apontando para o mesmo objeto.'),
    t('compreensão de lista', 'list comprehension', 'Forma compacta de criar listas: [x*2 for x in xs].'),
  ],
  stages: {
    conceito: [md('Uma **{{lista|list}}** guarda vários valores **em ordem**: `notas = [7, 8.5, 10]`. Você acessa cada um pelo **{{índice|index}}**, que começa em **0**. Listas são **{{mutáveis|mutable}}**: dá para mudar, adicionar e remover elementos.')],
    explicacao: [
      md(`
        - \`xs[0]\` é o primeiro; \`xs[-1]\` é o último; \`len(xs)\` é o tamanho.
        - **Fatias**: \`xs[1:3]\` (do índice 1 até antes do 3), \`xs[:2]\`, \`xs[2:]\`, \`xs[::-1]\` (invertida).
        - **Métodos**: \`append(x)\` adiciona no fim; \`insert(i, x)\`; \`pop()\` remove e devolve o último; \`remove(x)\` remove a primeira ocorrência; \`sort()\` ordena no lugar; \`x in xs\` testa pertencimento.
        - **Compreensão**: \`[n * n for n in range(5) if n % 2 == 0]\` → \`[0, 4, 16]\`.
      `),
      warn('**Aliasing**: `b = a` **não copia** a lista — os dois nomes apontam para a mesma. Para copiar, use `b = a.copy()` ou `b = a[:]`.', 'A armadilha mais comum com listas'),
    ],
    exemplo: [trace(`
      a = [1, 2, 3]
      b = a
      b.append(4)
      c = a.copy()
      c.append(5)
      print(a, b, c)
    `, 'Repare que a e b são o mesmo objeto; c é uma cópia.')],
    codigo: [
      py(`
        frutas = ["maçã", "banana", "uva"]
        frutas.append("manga")
        frutas.sort()
        print(frutas, len(frutas))
        print(frutas[0], frutas[-1], frutas[1:3])

        quadrados = [n ** 2 for n in range(1, 6)]
        print(quadrados)

        for i, fruta in enumerate(frutas):   # índice e valor juntos
            print(i, fruta)
      `),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e2-list-1',
          kind: 'predict',
          lang: 'python',
          prompt: 'O que é impresso?',
          difficulty: 'facil',
          skills: ['prog-listas'],
          hints: ['xs[1:4] vai do índice 1 até **antes** do 4.', 'Índices: 0→10, 1→20, 2→30, 3→40, 4→50.'],
          explanation: 'xs[1:4] = [20, 30, 40] e xs[-2] = 40.',
          code: 'xs = [10, 20, 30, 40, 50]\nprint(xs[1:4], xs[-2])',
          answer: '[20, 30, 40] 40',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e2-list-2',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `remover_duplicados(xs)` que devolve uma **nova** lista sem elementos repetidos, **mantendo a ordem** da primeira aparição.',
          difficulty: 'intermediario',
          skills: ['prog-listas'],
          hints: ['Percorra a lista e só adicione ao resultado o que ainda não está nele.', '`if x not in resultado:` funciona. (No Nível 3 você vai ver por que um `set` deixaria isso bem mais rápido.)'],
          explanation: '`list(set(xs))` remove duplicados mas **não** preserva a ordem. Percorrer e checar mantém a ordem. Versão eficiente: usar um set auxiliar para lembrar o que já viu.',
          starter: 'def remover_duplicados(xs):\n    pass\n',
          solution: dedent(`
            def remover_duplicados(xs):
                vistos = set()
                out = []
                for x in xs:
                    if x not in vistos:
                        vistos.add(x)
                        out.append(x)
                return out
          `),
          tests: [
            { name: 'mantém a ordem', code: 'assert remover_duplicados([3, 1, 3, 2, 1]) == [3, 1, 2]' },
            { name: 'lista vazia', code: 'assert remover_duplicados([]) == []' },
            { name: 'não altera a original', code: 'xs = [1, 1]\nremover_duplicados(xs)\nassert xs == [1, 1]' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e2-list-3',
          kind: 'fix',
          lang: 'python',
          prompt: '`dobrar(xs)` deveria devolver uma nova lista com os valores dobrados **sem modificar** a original, mas está alterando a lista recebida. Corrija.',
          difficulty: 'intermediario',
          skills: ['prog-listas'],
          hints: ['`resultado = xs` copia a lista ou só cria outro nome para ela?', 'Crie uma lista nova — com `.copy()` ou, melhor, com uma list comprehension.'],
          explanation: '`resultado = xs` é aliasing. `[x * 2 for x in xs]` cria uma lista nova e deixa a original intacta — funções sem efeitos colaterais são mais fáceis de testar.',
          starter: dedent(`
            def dobrar(xs):
                resultado = xs
                for i in range(len(resultado)):
                    resultado[i] = resultado[i] * 2
                return resultado
          `),
          solution: 'def dobrar(xs):\n    return [x * 2 for x in xs]\n',
          tests: [
            { name: 'dobra', code: 'assert dobrar([1, 2]) == [2, 4]' },
            { name: 'não altera a original', code: 'xs = [1, 2]\ndobrar(xs)\nassert xs == [1, 2], f"a original virou {xs}"' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e2-list-desafio',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `rotacionar(xs, k)` que devolve a lista rotacionada `k` posições para a direita: `rotacionar([1,2,3,4,5], 2) == [4,5,1,2,3]`. Funcione para k maior que o tamanho e para lista vazia.',
          difficulty: 'desafio',
          skills: ['prog-listas'],
          hints: ['Rotacionar por len(xs) devolve a mesma lista. O que isso sugere sobre k grande?', 'Use `k % len(xs)` e fatias: os últimos k elementos + os primeiros.'],
          explanation: '`k %= len(xs)`; `xs[-k:] + xs[:-k]`. Cuidado: com k == 0, `xs[-0:]` é a lista inteira — trate esse caso.',
          starter: 'def rotacionar(xs, k):\n    pass\n',
          solution: dedent(`
            def rotacionar(xs, k):
                if not xs:
                    return []
                k %= len(xs)
                if k == 0:
                    return xs[:]
                return xs[-k:] + xs[:-k]
          `),
          tests: [
            { name: 'k=2', code: 'assert rotacionar([1, 2, 3, 4, 5], 2) == [4, 5, 1, 2, 3]' },
            { name: 'k maior que o tamanho', code: 'assert rotacionar([1, 2, 3], 4) == [3, 1, 2]' },
            { name: 'k=0 e vazia', code: 'assert rotacionar([1, 2], 0) == [1, 2] and rotacionar([], 3) == []' },
          ],
        },
      },
    ],
    projeto: [md('**Lista de tarefas (parte 1)**: guarde as tarefas em uma lista de strings. Implemente adicionar, listar com números (`enumerate`) e remover pelo número.'), { type: 'project', projectId: 'p2-todo' }],
    revisao: [md('- Índices começam em 0; -1 é o último.\n- Fatias excluem o fim.\n- `b = a` não copia; use `a.copy()`.\n- Compreensões: `[expr for x in xs if cond]`.')],
  },
  review: [
    ['O que `xs[::-1]` faz?', 'Devolve uma cópia invertida da lista.'],
    ['Como copiar uma lista?', 'xs.copy(), xs[:] ou list(xs).'],
    ['Qual erro aparece ao acessar um índice que não existe?', 'IndexError: list index out of range.'],
  ],
  references: ['python-tutorial', 'cs61a', 'python-tutor'],
});

const dicionarios = lesson({
  id: 'l2-dicionarios',
  moduleId: 'm2-2',
  title: 'Dicionários, conjuntos e tuplas',
  titleEn: 'Dictionaries, sets and tuples',
  summary: 'Mapear chaves a valores, guardar elementos únicos e agrupar dados imutáveis.',
  minutes: 30,
  objectives: ['Usar dict para associar chaves a valores', 'Usar set para pertencimento e unicidade', 'Saber quando usar tupla', 'Contar frequências'],
  skills: ['prog-dicionarios'],
  terms: [
    t('dicionário', 'dictionary (dict)', 'Coleção de pares chave → valor.', "KeyError: 'idade'"),
    t('chave', 'key', 'Identificador usado para buscar um valor no dicionário.'),
    t('conjunto', 'set', 'Coleção sem ordem e sem repetição.'),
    t('tupla', 'tuple', 'Sequência imutável: (lat, long).'),
    t('imutável', 'immutable', 'Que não pode ser alterado depois de criado.'),
  ],
  stages: {
    conceito: [md('Um **{{dicionário|dictionary}}** associa **{{chaves|keys}}** a **valores**: `aluno = {"nome": "Ana", "idade": 17}`. Em vez de lembrar "a idade está na posição 1", você pede `aluno["idade"]`. Um **{{conjunto|set}}** guarda elementos únicos; uma **{{tupla|tuple}}** é uma sequência que não muda.')],
    explicacao: [
      md(`
        **dict**: \`d[chave]\` lê (dá \`KeyError\` se não existir); \`d.get(chave, padrao)\` lê com valor padrão; \`d[chave] = valor\` cria/atualiza; \`for k, v in d.items():\` percorre.
        Chaves precisam ser **imutáveis** (str, int, tuple).

        **set**: \`{1, 2, 3}\`; \`add\`, \`remove\`; operações de conjuntos: \`|\` união, \`&\` interseção, \`-\` diferença. Testar \`x in s\` é muito rápido.

        **tuple**: \`ponto = (3, 4)\`; desempacotar: \`x, y = ponto\`. Use para dados que andam juntos e não mudam.
      `),
      info('Buscar uma chave em um dict ou um elemento em um set leva, em média, **tempo constante**, não importa o tamanho. Em uma lista, `x in lista` precisa olhar elemento por elemento. Você vai entender o porquê na aula de **hash tables** (Nível 3).', 'Por que dict e set são rápidos?'),
    ],
    exemplo: [
      md('**Padrão contagem de frequência** — um dos mais usados em programação e em entrevistas:'),
      trace(`
        texto = "banana"
        freq = {}
        for letra in texto:
            freq[letra] = freq.get(letra, 0) + 1
        print(freq)
      `),
    ],
    codigo: [
      py(`
        estoque = {"caneta": 10, "caderno": 3}
        estoque["borracha"] = 7
        estoque["caderno"] -= 1
        for item, qtd in estoque.items():
            print(f"{item}: {qtd}")

        a = {"python", "sql", "git"}
        b = {"git", "docker"}
        print(a & b, a | b, a - b)

        from collections import Counter
        print(Counter("mississippi").most_common(2))
      `),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e2-dict-1',
          kind: 'predict',
          lang: 'python',
          prompt: 'O que é impresso?',
          difficulty: 'facil',
          skills: ['prog-dicionarios'],
          hints: ['`get` devolve o valor padrão quando a chave não existe.'],
          explanation: '"b" existe (2); "z" não existe, então get devolve o padrão 0.',
          code: 'd = {"a": 1, "b": 2}\nprint(d.get("b", 0), d.get("z", 0))',
          answer: '2 0',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e2-dict-2',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `contar_palavras(texto)` que devolve um dict com a frequência de cada palavra, ignorando maiúsculas/minúsculas.',
          difficulty: 'intermediario',
          skills: ['prog-dicionarios'],
          hints: ['Normalize primeiro: `texto.lower().split()`.', 'Padrão: `freq[p] = freq.get(p, 0) + 1`.'],
          explanation: 'Normalizar (lower) antes de contar evita que "Casa" e "casa" sejam contadas separadamente.',
          starter: 'def contar_palavras(texto):\n    pass\n',
          solution: dedent(`
            def contar_palavras(texto):
                freq = {}
                for p in texto.lower().split():
                    freq[p] = freq.get(p, 0) + 1
                return freq
          `),
          tests: [
            { name: 'conta', code: 'assert contar_palavras("a casa A") == {"a": 2, "casa": 1}' },
            { name: 'vazio', code: 'assert contar_palavras("") == {}' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e2-dict-desafio',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `anagramas(palavras)` que agrupa palavras que são anagramas entre si. Devolva uma lista de grupos (listas), cada grupo na ordem original de aparição, e os grupos na ordem em que apareceram. Ex.: `["amor", "roma", "ramo", "sol", "los"]` → `[["amor","roma","ramo"], ["sol","los"]]`.',
          difficulty: 'desafio',
          skills: ['prog-dicionarios', 'prog-listas'],
          hints: ['Duas palavras são anagramas se têm as mesmas letras. Que "assinatura" igual elas têm?', 'A assinatura pode ser `"".join(sorted(palavra))`. Use-a como chave de um dict de listas.', 'Dicionários preservam a ordem de inserção (Python 3.7+).'],
          explanation: 'Escolher a **chave certa** (as letras ordenadas) transforma o problema em agrupamento simples. É um problema clássico de entrevista (*group anagrams*).',
          starter: 'def anagramas(palavras):\n    pass\n',
          solution: dedent(`
            def anagramas(palavras):
                grupos = {}
                for p in palavras:
                    grupos.setdefault("".join(sorted(p)), []).append(p)
                return list(grupos.values())
          `),
          tests: [
            { name: 'exemplo', code: 'assert anagramas(["amor", "roma", "ramo", "sol", "los"]) == [["amor", "roma", "ramo"], ["sol", "los"]]' },
            { name: 'sem anagramas', code: 'assert anagramas(["a", "b"]) == [["a"], ["b"]]' },
          ],
        },
      },
    ],
    projeto: [md('**Lista de tarefas (parte 2)**: cada tarefa vira um dict `{"titulo": ..., "feita": False, "prioridade": 1}`. Permita marcar como feita e listar por prioridade.'), { type: 'project', projectId: 'p2-todo' }],
    revisao: [md('- dict: chave → valor; `get` com padrão evita KeyError.\n- set: únicos, pertencimento rápido, operações de conjunto.\n- tuple: imutável, desempacotamento.')],
  },
  review: [
    ['Como ler uma chave de dict sem risco de KeyError?', 'd.get(chave, valor_padrao).'],
    ['Quando usar um set?', 'Para elementos únicos e testes de pertencimento rápidos.'],
    ['O que pode ser chave de dict?', 'Valores imutáveis (hashable): str, int, float, tuple de imutáveis.'],
  ],
  references: ['python-tutorial', 'python-docs'],
});

const strings = lesson({
  id: 'l2-strings',
  moduleId: 'm2-3',
  title: 'Strings em profundidade',
  titleEn: 'Strings in depth',
  summary: 'Métodos de texto, imutabilidade, fatias, busca e formatação.',
  minutes: 25,
  objectives: ['Usar métodos split, join, strip, replace, find, lower/upper', 'Entender que strings são imutáveis', 'Processar texto caractere a caractere'],
  skills: ['prog-strings'],
  terms: [
    t('caractere', 'character (char)', 'Um símbolo: letra, dígito, espaço, emoji.'),
    t('separar', 'split', 'Dividir um texto em partes.'),
    t('juntar', 'join', 'Unir partes em um texto com um separador.'),
    t('remover espaços das pontas', 'strip / trim', 'Tirar espaços (e \\n) do início e do fim.'),
    t('subcadeia', 'substring', 'Parte de uma string.'),
  ],
  stages: {
    conceito: [md('Uma **string** é uma sequência de caracteres. Ela se comporta como uma lista para leitura (índices, fatias, `for`), mas é **imutável**: métodos como `upper()` **devolvem uma nova string**, sem alterar a original.')],
    explicacao: [
      { type: 'table', head: ['Método', 'Exemplo', 'Resultado'], rows: [
        ['split', '"a,b,c".split(",")', '["a", "b", "c"]'],
        ['join', '"-".join(["a", "b"])', '"a-b"'],
        ['strip', '"  oi \\n".strip()', '"oi"'],
        ['replace', '"casa".replace("a", "o")', '"coso"'],
        ['find', '"banana".find("na")', '2 (ou -1 se não achar)'],
        ['lower / upper', '"Oi".lower()', '"oi"'],
        ['startswith', '"main.py".endswith(".py")', 'True'],
        ['isdigit', '"123".isdigit()', 'True'],
      ] },
      warn('`s.upper()` sozinho não faz nada visível: o resultado precisa ser guardado: `s = s.upper()`.'),
    ],
    exemplo: [py(`
      linha = "  Ana;17;São Paulo  "
      nome, idade, cidade = linha.strip().split(";")
      print(nome, int(idade) + 1, cidade.upper())
    `)],
    codigo: [py(`
      palavra = "Alicerce"
      print(palavra[0], palavra[-1], palavra[:3], palavra[::-1])
      print(len(palavra), palavra.count("e"), "ce" in palavra)
      s = "programar"
      s.upper()
      print(s)          # não mudou!
      s = s.upper()
      print(s)
    `)],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e2-str-1',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `eh_palindromo(s)` que devolve True se o texto é palíndromo, ignorando espaços e maiúsculas. `"Socorram me subi no onibus em Marrocos"` é palíndromo.',
          difficulty: 'intermediario',
          skills: ['prog-strings'],
          hints: ['Primeiro normalize: minúsculas e sem espaços.', 'Compare a string normalizada com ela invertida (`[::-1]`).'],
          explanation: 'Normalizar e depois comparar com o reverso. Note que acentos fariam diferença ("ô" ≠ "o"); normalizar acentos exige o módulo `unicodedata`.',
          starter: 'def eh_palindromo(s):\n    pass\n',
          solution: dedent(`
            def eh_palindromo(s):
                limpo = s.lower().replace(" ", "")
                return limpo == limpo[::-1]
          `),
          tests: [
            { name: 'frase palíndroma', code: 'assert eh_palindromo("Socorram me subi no onibus em Marrocos")' },
            { name: 'não palíndromo', code: 'assert not eh_palindromo("alicerce")' },
            { name: 'vazio é palíndromo', code: 'assert eh_palindromo("")' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e2-str-2',
          kind: 'predict',
          lang: 'python',
          prompt: 'O que é impresso?',
          difficulty: 'facil',
          skills: ['prog-strings'],
          hints: ['split sem argumentos separa por espaços; join une com o separador.'],
          explanation: 'split → ["um", "dois", "tres"]; "-".join(...) → "um-dois-tres".',
          code: 'print("-".join("um dois tres".split()))',
          answer: 'um-dois-tres',
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e2-str-desafio',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `comprimir(s)` que faz *run-length encoding*: `"aaabccdddd"` → `"a3b1c2d4"`. String vazia devolve `""`.',
          difficulty: 'desafio',
          skills: ['prog-strings', 'prog-loops'],
          hints: ['Percorra guardando o caractere atual e quantas vezes ele repetiu.', 'Quando o caractere muda, escreva o par anterior e reinicie a contagem. Não esqueça do último grupo depois do loop.'],
          explanation: 'O erro clássico é esquecer de emitir o último grupo após o loop. Para muitos pedaços, acumule em lista e use `"".join` — concatenar strings em loop cria várias cópias.',
          starter: 'def comprimir(s):\n    pass\n',
          solution: dedent(`
            def comprimir(s):
                if not s:
                    return ""
                partes = []
                atual, n = s[0], 0
                for c in s:
                    if c == atual:
                        n += 1
                    else:
                        partes.append(f"{atual}{n}")
                        atual, n = c, 1
                partes.append(f"{atual}{n}")
                return "".join(partes)
          `),
          tests: [
            { name: 'exemplo', code: 'assert comprimir("aaabccdddd") == "a3b1c2d4"' },
            { name: 'um caractere', code: 'assert comprimir("z") == "z1"' },
            { name: 'vazio', code: 'assert comprimir("") == ""' },
          ],
        },
      },
    ],
    projeto: [md('**Mini-projeto: limpador de CSV**. Escreva uma função que recebe linhas como `"  ana ; 17;SP "` e devolve dicts limpos `{"nome": "Ana", "idade": 17, "uf": "SP"}`. Você vai usar isso com arquivos na próxima lição.')],
    revisao: [md('- Strings são imutáveis: métodos devolvem novas strings.\n- split/join, strip, replace, find, lower/upper.\n- Para montar textos grandes, acumule em lista e use join.')],
  },
  review: [
    ['O que acontece com s depois de `s.upper()` sem atribuição?', 'Nada: strings são imutáveis; o resultado precisa ser guardado.'],
    ['Como transformar "a,b,c" em ["a","b","c"]?', '"a,b,c".split(",")'],
  ],
  references: ['python-docs', 'python-tutorial'],
});

const arquivos = lesson({
  id: 'l2-arquivos',
  moduleId: 'm2-3',
  title: 'Arquivos e dados persistentes',
  titleEn: 'Files and persistent data',
  summary: 'Ler e escrever arquivos de texto, CSV e JSON com segurança usando with.',
  minutes: 30,
  objectives: ['Abrir arquivos com with open(...)', 'Ler linha a linha e escrever', 'Usar os módulos csv e json', 'Entender encoding'],
  skills: ['prog-arquivos'],
  terms: [
    t('abrir', 'open', 'Obter acesso a um arquivo para ler ou escrever.'),
    t('modo', 'mode', '"r" ler, "w" escrever (apaga), "a" acrescentar.'),
    t('gerenciador de contexto', 'context manager', 'Estrutura with que garante que o arquivo seja fechado.'),
    t('serializar', 'serialize', 'Transformar dados em texto/bytes para guardar ou enviar (ex.: JSON).'),
    t('JSON', 'JSON (JavaScript Object Notation)', 'Formato de texto para dados estruturados, usado em APIs.'),
  ],
  stages: {
    conceito: [md('Variáveis somem quando o programa termina. Para **persistir** dados, gravamos em **arquivos**. O jeito seguro em Python é `with open(caminho, modo, encoding="utf-8") as f:` — o `with` fecha o arquivo automaticamente, mesmo se der erro.')],
    explicacao: [
      md(`
        - Modos: \`"r"\` (ler, padrão), \`"w"\` (escrever — **apaga** o conteúdo anterior), \`"a"\` (acrescentar no fim).
        - Ler tudo: \`f.read()\`; ler linha a linha: \`for linha in f:\` (eficiente para arquivos grandes).
        - Escrever: \`f.write("texto\\n")\` — você precisa colocar o \`\\n\`.
        - **Sempre** informe \`encoding="utf-8"\`: o padrão varia entre sistemas (no Windows pode ser outro), e é daí que vêm os "Ã§".
        - **JSON**: \`json.dump(dados, f)\` grava; \`json.load(f)\` lê. É o formato das APIs web (Nível 6).
      `),
    ],
    exemplo: [py(`
      import json

      tarefas = [{"titulo": "estudar listas", "feita": True}, {"titulo": "praticar arquivos", "feita": False}]
      with open("tarefas.json", "w", encoding="utf-8") as f:
          json.dump(tarefas, f, ensure_ascii=False, indent=2)

      with open("tarefas.json", encoding="utf-8") as f:
          print(f.read())

      with open("tarefas.json", encoding="utf-8") as f:
          carregadas = json.load(f)
      print(carregadas[1]["titulo"])
    `)],
    codigo: [py(`
      import csv

      with open("notas.csv", "w", newline="", encoding="utf-8") as f:
          w = csv.writer(f)
          w.writerow(["nome", "nota"])
          w.writerows([["Ana", 9], ["Bia", 7.5], ["Caio", 8]])

      with open("notas.csv", encoding="utf-8") as f:
          for linha in csv.DictReader(f):
              print(linha["nome"], float(linha["nota"]))
    `)],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e2-file-1',
          kind: 'mcq',
          prompt: 'Você abriu um arquivo com dados importantes usando `open("dados.txt", "w")`. O que aconteceu com o conteúdo antigo?',
          difficulty: 'facil',
          skills: ['prog-arquivos'],
          hints: ['"w" de *write*... e o que acontece com o que já existia?'],
          explanation: 'O modo "w" trunca o arquivo (apaga tudo) ao abrir. Para acrescentar, use "a".',
          options: [
            { text: 'Foi mantido, e o novo texto vai para o fim', feedback: 'Esse é o modo "a" (append).' },
            { text: 'Foi apagado assim que o arquivo foi aberto', correct: true, feedback: 'Isso. Cuidado com "w"!' },
            { text: 'O Python dá erro porque o arquivo já existe', feedback: 'Dar erro se existir é o modo "x".' },
            { text: 'Fica salvo em um backup automático', feedback: 'Não há backup automático.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e2-file-2',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `salvar_e_contar(caminho, linhas)` que grava cada string da lista em uma linha do arquivo e depois **lê o arquivo** e devolve quantas linhas não vazias ele tem.',
          difficulty: 'intermediario',
          skills: ['prog-arquivos'],
          hints: ['Use dois blocos with: um para escrever ("w"), outro para ler.', 'Ao escrever, adicione "\\n" a cada linha. Ao ler, use `linha.strip()` para ignorar as vazias.'],
          explanation: 'Escrever e ler de volta é como testar persistência. `strip()` remove o "\\n" e espaços, então linhas só com espaços contam como vazias.',
          starter: 'def salvar_e_contar(caminho, linhas):\n    pass\n',
          solution: dedent(`
            def salvar_e_contar(caminho, linhas):
                with open(caminho, "w", encoding="utf-8") as f:
                    for l in linhas:
                        f.write(l + "\\n")
                with open(caminho, encoding="utf-8") as f:
                    return sum(1 for l in f if l.strip())
          `),
          tests: [
            { name: 'conta não vazias', code: 'assert salvar_e_contar("t.txt", ["a", "", "b", "  "]) == 2' },
            { name: 'arquivo foi gravado', code: 'salvar_e_contar("u.txt", ["olá"])\nassert open("u.txt", encoding="utf-8").read() == "olá\\n"' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e2-file-desafio',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `media_por_aluno(caminho)` que lê um CSV com colunas `nome,nota` (um aluno pode aparecer várias vezes) e devolve um dict `{nome: média}` com médias arredondadas para 2 casas.',
          difficulty: 'desafio',
          skills: ['prog-arquivos', 'prog-dicionarios'],
          hints: ['Use `csv.DictReader` para ler cada linha como dict.', 'Guarde, por aluno, a soma e a quantidade (ou a lista de notas).', '`round(valor, 2)` no final.'],
          explanation: 'Agrupar e agregar (*group by*) é a operação mais comum em análise de dados — você vai vê-la de novo em SQL (`GROUP BY`) no Nível 7.',
          starter: 'import csv\n\ndef media_por_aluno(caminho):\n    pass\n',
          solution: dedent(`
            import csv

            def media_por_aluno(caminho):
                notas = {}
                with open(caminho, encoding="utf-8") as f:
                    for linha in csv.DictReader(f):
                        notas.setdefault(linha["nome"], []).append(float(linha["nota"]))
                return {n: round(sum(v) / len(v), 2) for n, v in notas.items()}
          `),
          tests: [
            { name: 'agrega por aluno', code: 'open("n.csv", "w", encoding="utf-8").write("nome,nota\\nAna,9\\nBia,7\\nAna,8\\n")\nassert media_por_aluno("n.csv") == {"Ana": 8.5, "Bia": 7.0}' },
          ],
        },
      },
    ],
    projeto: [md('**Lista de tarefas (parte 3)**: salve as tarefas em `tarefas.json` ao sair e carregue ao abrir. Se o arquivo não existir, comece com lista vazia (você vai precisar de `try/except FileNotFoundError` — próxima lição).'), { type: 'project', projectId: 'p2-todo' }],
    revisao: [md('- `with open(..., encoding="utf-8")` fecha o arquivo sozinho.\n- "w" apaga, "a" acrescenta, "r" lê.\n- csv e json da biblioteca padrão resolvem formatos comuns.')],
  },
  review: [
    ['Por que usar `with` ao abrir arquivos?', 'Garante que o arquivo seja fechado, mesmo se ocorrer uma exceção.'],
    ['Por que sempre passar encoding="utf-8"?', 'Porque o padrão varia entre sistemas operacionais e causa erros de acentuação.'],
  ],
  references: ['python-docs', 'python-tutorial'],
});

const erros = lesson({
  id: 'l2-erros-excecoes',
  moduleId: 'm2-4',
  title: 'Erros e exceções',
  titleEn: 'Errors and exceptions',
  summary: 'Tipos de erro, como ler um traceback, try/except/else/finally e lançar exceções.',
  minutes: 35,
  objectives: ['Diferenciar erros de sintaxe, exceções em tempo de execução e erros de lógica', 'Ler um traceback completo', 'Tratar exceções específicas com try/except', 'Lançar exceções com raise'],
  skills: ['py-excecoes', 'en-leitura-erros'],
  terms: [
    t('exceção', 'exception', 'Erro detectado durante a execução, que interrompe o fluxo normal.'),
    t('rastreamento da pilha', 'traceback / stack trace', 'Relatório das chamadas ativas quando o erro aconteceu.'),
    t('lançar', 'raise / throw', 'Sinalizar uma exceção.'),
    t('capturar', 'catch / handle', 'Tratar uma exceção com except.'),
    t('erro de lógica', 'logic error / bug', 'O programa roda, mas faz a coisa errada.'),
  ],
  stages: {
    conceito: [md('Existem três tipos de erro: **de sintaxe** (o Python nem consegue ler o código), **{{exceções|exceptions}}** (algo dá errado durante a execução, como dividir por zero) e **erros de lógica** (o programa roda mas o resultado está errado — os mais difíceis). Exceções podem ser **tratadas** para o programa reagir em vez de quebrar.')],
    explicacao: [
      md(`
        **Lendo um traceback** (de baixo para cima):

        \`\`\`
        Traceback (most recent call last):
          File "main.py", line 7, in <module>
            print(media([]))
          File "main.py", line 2, in media
            return sum(xs) / len(xs)
        ZeroDivisionError: division by zero
        \`\`\`

        1. **Última linha**: tipo (\`ZeroDivisionError\`) e mensagem (*division by zero*).
        2. **Linha acima**: onde aconteceu (função \`media\`, linha 2).
        3. **Mais acima**: quem chamou (linha 7). Isso é a **pilha de chamadas**.

        **Tratando**:

        \`\`\`
        try:
            idade = int(input("Idade: "))
        except ValueError:
            print("Digite um número inteiro.")
        else:
            print("ok")          # só se não houve exceção
        finally:
            print("sempre roda") # limpeza
        \`\`\`
      `),
      warn('Nunca use `except:` sozinho ou `except Exception:` para "silenciar" erros. Capture a exceção **específica** que você sabe tratar. *"Errors should never pass silently."*', 'Não esconda erros'),
      { type: 'table', head: ['Exceção', 'Causa típica'], rows: [
        ['NameError', 'nome não definido (erro de digitação, variável fora do escopo)'],
        ['TypeError', 'operação com tipo errado ("a" + 1), argumentos errados'],
        ['ValueError', 'tipo certo, valor inválido (int("abc"))'],
        ['IndexError', 'índice fora da lista'],
        ['KeyError', 'chave inexistente no dict'],
        ['AttributeError', 'objeto não tem esse atributo/método (None.append)'],
        ['ZeroDivisionError', 'divisão por zero'],
        ['FileNotFoundError', 'arquivo/caminho não existe'],
      ] },
    ],
    exemplo: [py(`
      def ler_idade(texto):
          try:
              idade = int(texto)
          except ValueError:
              return None
          if idade < 0:
              raise ValueError("idade não pode ser negativa")
          return idade

      print(ler_idade("17"), ler_idade("abc"))
      print(ler_idade("-3"))   # veja o traceback e a explicação
    `)],
    codigo: [
      md('Toda vez que seu código der erro aqui, o Alicerce mostra o traceback original **em inglês** e, logo abaixo, uma explicação em português: o que aconteceu, por que, como investigar, como corrigir e como evitar. Experimente provocar erros:'),
      py(`
        dados = {"nome": "Ana"}
        print(dados["idade"])
      `),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e2-exc-1',
          kind: 'mcq',
          prompt: 'Qual exceção `int("3.5")` lança?',
          difficulty: 'facil',
          skills: ['py-excecoes'],
          hints: ['O argumento é uma string (tipo certo para int()), mas o **valor** é aceitável?'],
          explanation: '`int()` aceita strings, mas "3.5" não é um inteiro válido: ValueError (*invalid literal for int() with base 10*). Use `int(float("3.5"))` se quiser truncar.',
          options: [
            { text: 'TypeError', feedback: 'O tipo (str) é aceito por int(); o problema é o valor.' },
            { text: 'ValueError', correct: true, feedback: 'Isso: tipo certo, valor inválido.' },
            { text: 'SyntaxError', feedback: 'O código está escrito corretamente.' },
            { text: 'Nenhuma: devolve 3', feedback: 'int("3.5") não trunca; int(3.5) (float) truncaria.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e2-exc-2',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `dividir_seguro(a, b)` que devolve `a / b`, ou a string `"erro: divisão por zero"` se b for 0, ou `"erro: valores inválidos"` se a ou b não forem números (TypeError).',
          difficulty: 'intermediario',
          skills: ['py-excecoes'],
          hints: ['Coloque só a operação arriscada no try.', 'Use dois except, um para cada exceção específica.'],
          explanation: 'Capturar exceções específicas, cada uma com sua resposta, é muito melhor do que um except genérico que esconderia outros bugs.',
          starter: 'def dividir_seguro(a, b):\n    return a / b\n',
          solution: dedent(`
            def dividir_seguro(a, b):
                try:
                    return a / b
                except ZeroDivisionError:
                    return "erro: divisão por zero"
                except TypeError:
                    return "erro: valores inválidos"
          `),
          tests: [
            { name: 'divide', code: 'assert dividir_seguro(10, 4) == 2.5' },
            { name: 'por zero', code: 'assert dividir_seguro(1, 0) == "erro: divisão por zero"' },
            { name: 'tipo inválido', code: 'assert dividir_seguro("a", 2) == "erro: valores inválidos"' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e2-exc-desafio',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `sacar(saldo, valor)` que devolve o novo saldo. Lance `ValueError("valor deve ser positivo")` se valor <= 0 e `ValueError("saldo insuficiente")` se valor > saldo. Os testes verificam as mensagens.',
          difficulty: 'intermediario',
          skills: ['py-excecoes'],
          hints: ['Valide as condições no começo da função (guard clauses).', '`raise ValueError("mensagem")`.'],
          explanation: 'Lançar exceções com mensagens claras é parte do **contrato** de uma função: quem chama sabe exatamente o que deu errado.',
          starter: 'def sacar(saldo, valor):\n    return saldo - valor\n',
          solution: dedent(`
            def sacar(saldo, valor):
                if valor <= 0:
                    raise ValueError("valor deve ser positivo")
                if valor > saldo:
                    raise ValueError("saldo insuficiente")
                return saldo - valor
          `),
          tests: [
            { name: 'saque normal', code: 'assert sacar(100, 30) == 70' },
            { name: 'saldo insuficiente', code: 'try:\n    sacar(10, 50)\n    assert False, "deveria lançar ValueError"\nexcept ValueError as e:\n    assert str(e) == "saldo insuficiente", str(e)' },
            { name: 'valor negativo', code: 'try:\n    sacar(10, -1)\n    assert False, "deveria lançar ValueError"\nexcept ValueError as e:\n    assert str(e) == "valor deve ser positivo", str(e)' },
          ],
        },
      },
    ],
    projeto: [md('**Lista de tarefas (parte 4)**: trate entrada inválida (número de tarefa que não existe, texto no lugar de número) e o arquivo inexistente na primeira execução.'), { type: 'project', projectId: 'p2-todo' }],
    revisao: [md('- Sintaxe × exceção × lógica.\n- Traceback: leia a última linha e suba.\n- Capture exceções específicas; nunca silencie erros.\n- raise para sinalizar contratos violados.')],
  },
  review: [
    ['Como ler um traceback?', 'De baixo para cima: tipo e mensagem na última linha, depois o local, depois quem chamou.'],
    ['Diferença entre ValueError e TypeError?', 'TypeError: tipo inadequado. ValueError: tipo certo, valor inválido.'],
    ['Quando o bloco else de um try executa?', 'Quando nenhuma exceção ocorreu no try.'],
  ],
  references: ['python-tutorial', 'python-docs'],
});

const debugging = lesson({
  id: 'l2-debugging',
  moduleId: 'm2-4',
  title: 'Depuração com método',
  titleEn: 'Systematic debugging',
  summary: 'Reproduzir, isolar, formular hipóteses, testar. Print debugging, assert e o depurador.',
  minutes: 30,
  objectives: ['Aplicar o método científico à depuração', 'Usar prints estratégicos e assert', 'Conhecer breakpoints e o pdb', 'Explicar o código em voz alta (rubber duck)'],
  skills: ['py-debugging'],
  terms: [
    t('depuração', 'debugging', 'Processo de encontrar e corrigir defeitos.'),
    t('reproduzir', 'reproduce', 'Fazer o bug acontecer de forma confiável.'),
    t('ponto de parada', 'breakpoint', 'Lugar onde o depurador pausa a execução.'),
    t('depurador', 'debugger', 'Ferramenta para executar passo a passo e inspecionar variáveis.'),
    t('hipótese', 'hypothesis', 'Explicação provisória que você testa.'),
  ],
  stages: {
    conceito: [md('**Depurar** não é mudar coisas aleatoriamente até funcionar. É um processo **científico**: observar, formular uma hipótese, fazer um experimento, concluir. Programadores experientes não erram menos — eles **encontram** erros mais rápido porque seguem um método.')],
    explicacao: [
      md(`
        **O método em 5 passos:**

        1. **Reproduza**: descubra uma entrada que sempre causa o bug. Sem reprodução, não há como saber se corrigiu.
        2. **Isole**: reduza o problema. Qual a **menor** entrada que falha? Qual função? Comente partes, teste funções sozinhas.
        3. **Hipótese**: "acho que \`total\` está zerando dentro do loop".
        4. **Experimento**: um \`print(f"{i=} {total=}")\` ou um \`assert\` confirma ou derruba a hipótese.
        5. **Corrija e previna**: corrija, rode de novo, e **escreva um teste** que pegaria esse bug no futuro.

        **Ferramentas**: \`print(f"{x=}")\` (mostra nome e valor), \`assert condicao, "mensagem"\`, o passo a passo do Alicerce, e o depurador de verdade: \`breakpoint()\` no código abre o \`pdb\` (no VS Code, clique ao lado do número da linha).

        **Rubber duck debugging**: explique o código, linha por linha, em voz alta (para um patinho de borracha, se preciso). Muitas vezes você encontra o bug no meio da explicação.
      `),
    ],
    exemplo: [
      md('Um bug real: a função deveria devolver a média das notas **acima de 5**, mas devolve um valor estranho. Use o passo a passo para formular uma hipótese:'),
      trace(`
        def media_acima_de_5(notas):
            soma = 0
            qtd = 0
            for n in notas:
                if n > 5:
                    soma += n
                qtd += 1
            return soma / qtd

        print(media_acima_de_5([4, 6, 8]))
      `, 'qtd está contando todas as notas, não só as acima de 5: indentação errada.'),
    ],
    codigo: [py(`
      def fatorial(n):
          resultado = 1
          for i in range(1, n):
              resultado *= i
              print(f"{i=} {resultado=}")   # print estratégico
          return resultado

      print(fatorial(4))   # deveria ser 24... qual é a hipótese?
    `)],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e2-dbg-1',
          kind: 'fix',
          lang: 'python',
          prompt: 'Corrija `fatorial(n)` do exemplo acima. `fatorial(4)` deve ser 24 e `fatorial(0)` deve ser 1.',
          difficulty: 'facil',
          skills: ['py-debugging'],
          hints: ['Com os prints, quais valores de i aparecem? Falta algum?', 'range(1, n) para antes de n. Off-by-one!'],
          explanation: 'range(1, n) gera 1..n-1. O correto é range(1, n + 1). Um clássico off-by-one.',
          starter: dedent(`
            def fatorial(n):
                resultado = 1
                for i in range(1, n):
                    resultado *= i
                return resultado
          `),
          solution: dedent(`
            def fatorial(n):
                resultado = 1
                for i in range(1, n + 1):
                    resultado *= i
                return resultado
          `),
          tests: [
            { name: 'fatorial(4) == 24', code: 'assert fatorial(4) == 24' },
            { name: 'fatorial(0) == 1', code: 'assert fatorial(0) == 1' },
            { name: 'fatorial(1) == 1', code: 'assert fatorial(1) == 1' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e2-dbg-2',
          kind: 'fix',
          lang: 'python',
          prompt: 'Corrija `media_acima_de_5` (do exemplo). Para uma lista sem notas acima de 5, devolva 0.',
          difficulty: 'intermediario',
          skills: ['py-debugging'],
          hints: ['O que `qtd` deveria contar?', 'Em que nível de indentação está `qtd += 1`?'],
          explanation: '`qtd += 1` precisa estar dentro do if. E é preciso proteger a divisão quando qtd == 0.',
          starter: dedent(`
            def media_acima_de_5(notas):
                soma = 0
                qtd = 0
                for n in notas:
                    if n > 5:
                        soma += n
                    qtd += 1
                return soma / qtd
          `),
          solution: dedent(`
            def media_acima_de_5(notas):
                soma = 0
                qtd = 0
                for n in notas:
                    if n > 5:
                        soma += n
                        qtd += 1
                return soma / qtd if qtd else 0
          `),
          tests: [
            { name: '[4, 6, 8] → 7', code: 'assert media_acima_de_5([4, 6, 8]) == 7' },
            { name: 'sem notas acima de 5', code: 'assert media_acima_de_5([1, 2]) == 0' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e2-dbg-desafio',
          kind: 'fix',
          lang: 'python',
          prompt: 'Esta função deveria devolver a **segunda maior** nota distinta (ou None se não existir), mas falha em vários casos. Reproduza, isole e corrija. Os testes revelam os casos.',
          difficulty: 'desafio',
          skills: ['py-debugging'],
          hints: ['Teste com [5, 5, 3]. E com [3, 8, 5]? Qual falha?', 'O que acontece com `segunda` quando aparece um novo maior?', 'Quando surge um novo maior, o antigo maior vira a segunda. Ignore valores iguais ao maior.'],
          explanation: 'Os bugs: não "rebaixar" o antigo maior para segundo, e não ignorar empates com o maior. Escrever casos pequenos e específicos (isolar) revela cada um.',
          starter: dedent(`
            def segunda_maior(xs):
                maior = None
                segunda = None
                for x in xs:
                    if maior is None or x > maior:
                        maior = x
                    elif segunda is None or x > segunda:
                        segunda = x
                return segunda
          `),
          solution: dedent(`
            def segunda_maior(xs):
                maior = None
                segunda = None
                for x in xs:
                    if maior is None or x > maior:
                        segunda = maior
                        maior = x
                    elif x != maior and (segunda is None or x > segunda):
                        segunda = x
                return segunda
          `),
          tests: [
            { name: '[3, 8, 5] → 5', code: 'assert segunda_maior([3, 8, 5]) == 5' },
            { name: '[3, 5, 8] → 5', code: 'assert segunda_maior([3, 5, 8]) == 5' },
            { name: '[5, 5, 3] → 3', code: 'assert segunda_maior([5, 5, 3]) == 3' },
            { name: '[7, 7] → None', code: 'assert segunda_maior([7, 7]) is None' },
            { name: '[] → None', code: 'assert segunda_maior([]) is None' },
          ],
        },
      },
    ],
    projeto: [md('**Diário de bugs**: a partir de hoje, toda vez que um bug levar mais de 10 minutos, anote: sintoma, causa, como encontrou, como evitar. Em poucas semanas você terá seu próprio catálogo de erros — e ótimos exemplos para entrevistas ("conte sobre um bug difícil que você resolveu").')],
    revisao: [md('- Reproduza → isole → hipótese → experimento → corrija e escreva um teste.\n- `print(f"{x=}")`, assert, breakpoint().\n- Explique o código em voz alta.')],
  },
  review: [
    ['Quais são os passos da depuração sistemática?', 'Reproduzir, isolar, formular hipótese, experimentar, corrigir e prevenir com um teste.'],
    ['O que é rubber duck debugging?', 'Explicar o código linha a linha em voz alta para encontrar o erro.'],
  ],
  references: ['python-docs', 'missing-semester', 'cs50'],
});

const modulos = lesson({
  id: 'l2-modulos',
  moduleId: 'm2-5',
  title: 'Módulos, pacotes e a biblioteca padrão',
  titleEn: 'Modules, packages and the standard library',
  summary: 'import, organizar código em arquivos, pip e ambientes virtuais.',
  minutes: 25,
  objectives: ['Importar módulos e funções', 'Conhecer módulos úteis da biblioteca padrão', 'Entender pip, PyPI e ambientes virtuais', 'Organizar um projeto em arquivos'],
  skills: ['py-modulos'],
  terms: [
    t('módulo', 'module', 'Um arquivo .py que pode ser importado.'),
    t('pacote', 'package', 'Uma pasta de módulos; ou uma biblioteca instalável.'),
    t('importar', 'import', 'Trazer código de outro módulo.', "ModuleNotFoundError: No module named 'requests'"),
    t('dependência', 'dependency', 'Biblioteca de terceiros que seu projeto usa.'),
    t('ambiente virtual', 'virtual environment (venv)', 'Pasta isolada com as dependências de um projeto.'),
  ],
  stages: {
    conceito: [md('Um **{{módulo|module}}** é simplesmente um arquivo `.py`. Com `import`, você reutiliza código de outros arquivos, da **biblioteca padrão** (que já vem com o Python) ou de **pacotes** de terceiros instalados com `pip`.')],
    explicacao: [
      md(`
        \`\`\`
        import math                 # usa math.sqrt(2)
        from random import choice   # usa choice([...])
        import datetime as dt       # apelido
        \`\`\`

        **Biblioteca padrão** que vale conhecer: \`math\`, \`random\`, \`datetime\`, \`collections\` (Counter, deque, defaultdict), \`itertools\`, \`json\`, \`csv\`, \`pathlib\`, \`re\` (expressões regulares), \`unittest\`.

        **Pacotes de terceiros**: ficam no PyPI e são instalados com \`pip install nome\`. Para cada projeto, crie um **ambiente virtual** (\`python -m venv .venv\`) para que as versões das {{dependências|dependencies}} de um projeto não conflitem com as de outro.

        **if __name__ == "__main__":** — código dentro desse bloco só roda quando o arquivo é executado diretamente, não quando é importado.
      `),
      tip('Antes de instalar um pacote, confira se a biblioteca padrão já resolve. Menos dependências = menos riscos de segurança e manutenção.'),
    ],
    exemplo: [py(`
      import math
      from collections import Counter, deque
      from datetime import date

      print(math.sqrt(16), math.pi)
      print(Counter(["a", "b", "a"]))
      fila = deque([1, 2, 3]); fila.appendleft(0); print(fila)
      print((date(2026, 12, 25) - date(2026, 10, 6)).days, "dias até o Natal")
    `)],
    codigo: [
      { type: 'code', lang: 'text', runnable: false, code: dedent(`
        meu_projeto/
        ├── .venv/              # ambiente virtual (não vai para o Git)
        ├── requirements.txt    # dependências: requests==2.32.3
        ├── tarefas/
        │   ├── __init__.py
        │   ├── modelo.py       # dados e regras
        │   └── armazenamento.py# salvar/carregar JSON
        ├── main.py             # interface com o usuário
        └── tests/
            └── test_modelo.py
      `), caption: 'Estrutura típica de um projeto Python pequeno. Separar regras, armazenamento e interface é o começo da arquitetura de software.' },
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e2-mod-1',
          kind: 'mcq',
          prompt: 'Ao rodar seu programa aparece `ModuleNotFoundError: No module named \'requests\'`. Qual é a causa mais provável?',
          difficulty: 'facil',
          skills: ['py-modulos', 'en-leitura-erros'],
          hints: ['*No module named* = nenhum módulo chamado...', 'requests faz parte da biblioteca padrão?'],
          explanation: 'requests é um pacote de terceiros. Instale no ambiente virtual ativo: `pip install requests`. Se já instalou, provavelmente instalou em outro ambiente.',
          options: [
            { text: 'Há um erro de sintaxe na linha do import', feedback: 'Seria SyntaxError.' },
            { text: 'O pacote não está instalado no ambiente Python em uso', correct: true, feedback: 'Isso: instale com pip no ambiente virtual ativo.' },
            { text: 'A internet caiu', feedback: 'Importar não usa a internet.' },
            { text: 'O nome da variável está errado', feedback: 'Seria NameError.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e2-mod-2',
          kind: 'code',
          lang: 'python',
          prompt: 'Usando `collections.Counter`, escreva `mais_comum(xs)` que devolve o elemento mais frequente da lista (em empate, o que aparece primeiro).',
          difficulty: 'facil',
          skills: ['py-modulos'],
          hints: ['Leia a documentação de `Counter.most_common`.', '`Counter(xs).most_common(1)` devolve `[(elemento, contagem)]`.'],
          explanation: 'Conhecer a biblioteca padrão evita reinventar a roda. `most_common` mantém a ordem de inserção em empates.',
          starter: 'from collections import Counter\n\ndef mais_comum(xs):\n    pass\n',
          solution: 'from collections import Counter\n\ndef mais_comum(xs):\n    return Counter(xs).most_common(1)[0][0]\n',
          tests: [
            { name: 'mais frequente', code: 'assert mais_comum([1, 2, 2, 3]) == 2' },
            { name: 'empate → primeiro', code: 'assert mais_comum(["b", "a", "a", "b"]) == "b"' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e2-mod-desafio',
          kind: 'code',
          lang: 'python',
          prompt: 'Usando o módulo `re` (expressões regulares), escreva `extrair_emails(texto)` que devolve a lista de e-mails no texto, na ordem. Considere e-mails no formato `nome@dominio.ext` com letras, números, ponto, hífen e underline.',
          difficulty: 'avancado',
          skills: ['py-modulos', 'prog-strings'],
          hints: ['Procure por `re.findall` na documentação.', 'Um padrão possível: `[\\w.-]+@[\\w-]+(\\.[\\w-]+)+` — mas cuidado: grupos com parênteses mudam o que findall devolve.', 'Use grupo não capturante `(?:...)`.'],
          explanation: 'Em `re.findall`, grupos capturantes fazem a função devolver só o grupo. `(?:...)` agrupa sem capturar. Validar e-mail perfeitamente por regex é notoriamente difícil; aqui buscamos um padrão prático.',
          starter: 'import re\n\ndef extrair_emails(texto):\n    pass\n',
          solution: 'import re\n\ndef extrair_emails(texto):\n    return re.findall(r"[\\w.-]+@[\\w-]+(?:\\.[\\w-]+)+", texto)\n',
          tests: [
            { name: 'encontra dois', code: 'assert extrair_emails("fale com ana.silva@exemplo.com.br ou bia_2@site.org!") == ["ana.silva@exemplo.com.br", "bia_2@site.org"]' },
            { name: 'nenhum', code: 'assert extrair_emails("sem contato") == []' },
          ],
        },
      },
    ],
    projeto: [md('**Lista de tarefas (parte 5)**: separe o projeto em `modelo.py`, `armazenamento.py` e `main.py`, no seu computador, com um ambiente virtual. Sim: agora é um projeto de verdade, com estrutura profissional.'), { type: 'project', projectId: 'p2-todo' }],
    revisao: [md('- Módulo = arquivo .py; pacote = pasta de módulos.\n- Biblioteca padrão primeiro; pip/PyPI depois.\n- Um ambiente virtual por projeto.\n- `if __name__ == "__main__":`')],
  },
  review: [
    ['Para que serve um ambiente virtual?', 'Isolar as dependências (e versões) de cada projeto.'],
    ['O que faz `if __name__ == "__main__":`?', 'Executa o bloco só quando o arquivo é rodado diretamente, não quando importado.'],
  ],
  references: ['python-docs', 'python-packaging'],
});

const testes = lesson({
  id: 'l2-testes',
  moduleId: 'm2-5',
  title: 'Testes automatizados',
  titleEn: 'Automated testing',
  summary: 'assert, testes de unidade, unittest/pytest, casos de borda e TDD.',
  minutes: 30,
  objectives: ['Escrever testes de unidade com assert', 'Organizar testes com unittest ou pytest', 'Escolher bons casos de teste (classes de equivalência e bordas)', 'Praticar o ciclo TDD'],
  skills: ['py-testes'],
  terms: [
    t('teste de unidade', 'unit test', 'Teste de uma pequena parte isolada do código (uma função).'),
    t('asserção', 'assertion', 'Afirmação que deve ser verdadeira; se não for, o teste falha.', 'AssertionError: expected 5, got 4'),
    t('caso de teste', 'test case', 'Uma entrada com o resultado esperado.'),
    t('desenvolvimento guiado por testes', 'test-driven development (TDD)', 'Escrever o teste antes do código: red → green → refactor.'),
    t('regressão', 'regression', 'Bug que volta depois de corrigido; testes previnem.'),
  ],
  stages: {
    conceito: [md('Um **teste automatizado** é código que verifica outro código. Em vez de testar manualmente toda vez, você escreve uma vez e roda sempre. Todos os exercícios do Alicerce são corrigidos assim — agora você vai escrever os seus.')],
    explicacao: [
      md(`
        **Como escolher casos de teste**:

        - **Caso típico**: uma entrada comum.
        - **Bordas**: vazio, zero, um elemento, o máximo, valores iguais.
        - **Classes de equivalência**: se positivos se comportam igual, um positivo representa todos; teste um de cada classe (negativo, zero, positivo).
        - **Entradas inválidas**: o que deve acontecer? Uma exceção?

        **TDD (Test-Driven Development)** em 3 passos: 🔴 escreva um teste que falha → 🟢 escreva o mínimo de código para passar → 🔵 refatore com segurança.

        Em projetos reais, use **pytest** (\`pip install pytest\`, funções \`test_*\`, roda com \`pytest\`) ou **unittest** (biblioteca padrão).
      `),
      { type: 'code', lang: 'python', runnable: false, code: dedent(`
        # tests/test_texto.py  — rode com: pytest
        from texto import eh_palindromo

        def test_palindromo_simples():
            assert eh_palindromo("arara")

        def test_ignora_maiusculas_e_espacos():
            assert eh_palindromo("Ame a ema")

        def test_nao_palindromo():
            assert not eh_palindromo("python")
      `), caption: 'Estilo pytest: funções que começam com test_ e usam assert.' },
    ],
    exemplo: [py(`
      import unittest

      def desconto(preco, pct):
          if not 0 <= pct <= 100:
              raise ValueError("percentual inválido")
          return round(preco * (1 - pct / 100), 2)

      class TestDesconto(unittest.TestCase):
          def test_tipico(self):
              self.assertEqual(desconto(100, 10), 90)

          def test_bordas(self):
              self.assertEqual(desconto(100, 0), 100)
              self.assertEqual(desconto(100, 100), 0)

          def test_invalido(self):
              with self.assertRaises(ValueError):
                  desconto(100, 150)

      unittest.main(argv=["x"], exit=False, verbosity=2)
    `)],
    codigo: [md('Agora inverta os papéis: **você** escreve os testes. No próximo exercício, os testes do Alicerce verificam se os **seus testes** detectam implementações erradas — isso se chama *mutation testing*.')],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e2-test-1',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Escreva a função \`testar(f)\` que recebe uma implementação \`f\` de "valor absoluto" e devolve True se \`f\` passa
            nos **seus** casos de teste e False caso contrário. Os testes do Alicerce vão passar implementações corretas e
            erradas: seus casos precisam pegar as erradas (ex.: uma que esquece os negativos, outra que erra o zero).
          `),
          difficulty: 'avancado',
          skills: ['py-testes'],
          hints: ['Que classes de entrada existem para valor absoluto?', 'Negativo, zero e positivo. Teste pelo menos um de cada.', 'Use `try/except` se uma implementação errada puder lançar erro, e devolva False nesse caso.'],
          explanation: 'Casos de teste bons cobrem as classes de equivalência e as bordas. Avaliar testes com implementações "mutantes" é exatamente como ferramentas de mutation testing medem a qualidade de uma suíte.',
          starter: 'def testar(f):\n    return f(3) == 3\n',
          solution: dedent(`
            def testar(f):
                try:
                    return f(-5) == 5 and f(0) == 0 and f(7) == 7 and f(-0.5) == 0.5
                except Exception:
                    return False
          `),
          tests: [
            { name: 'aceita a implementação correta', code: 'assert testar(abs) is True' },
            { name: 'rejeita: esquece negativos', code: 'assert testar(lambda x: x) is False' },
            { name: 'rejeita: erra o zero', code: 'assert testar(lambda x: abs(x) if x != 0 else 1) is False' },
            { name: 'rejeita: só funciona com inteiros', code: 'assert testar(lambda x: x if x >= 0 else -int(x)) is False' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e2-test-desafio',
          kind: 'code',
          lang: 'python',
          prompt: 'Pratique TDD: os testes já estão escritos (veja nos resultados). Implemente `validar_senha(s)` que devolve uma **lista de problemas** (strings) ou lista vazia se a senha for válida. Regras: mínimo 8 caracteres ("curta"), ao menos um dígito ("sem dígito"), ao menos uma maiúscula ("sem maiúscula"). A ordem dos problemas é a das regras.',
          difficulty: 'intermediario',
          skills: ['py-testes', 'prog-strings'],
          hints: ['Rode primeiro: veja quais testes falham (vermelho).', 'Uma regra por vez: faça um teste passar, depois o próximo (verde).'],
          explanation: 'Devolver a **lista de problemas** em vez de um simples bool dá feedback melhor ao usuário — um bom exemplo de como o design da função nasce dos testes.',
          starter: 'def validar_senha(s):\n    return []\n',
          solution: dedent(`
            def validar_senha(s):
                problemas = []
                if len(s) < 8:
                    problemas.append("curta")
                if not any(c.isdigit() for c in s):
                    problemas.append("sem dígito")
                if not any(c.isupper() for c in s):
                    problemas.append("sem maiúscula")
                return problemas
          `),
          tests: [
            { name: 'senha válida', code: 'assert validar_senha("Alicerce2026") == []' },
            { name: 'curta', code: 'assert validar_senha("Ab1") == ["curta"]' },
            { name: 'todos os problemas', code: 'assert validar_senha("abc") == ["curta", "sem dígito", "sem maiúscula"]' },
            { name: 'sem maiúscula', code: 'assert validar_senha("alicerce2026") == ["sem maiúscula"]' },
          ],
        },
      },
    ],
    projeto: [md('**Lista de tarefas (final)**: escreva testes com pytest para `modelo.py` (adicionar, concluir, remover, casos inválidos). Meta: todas as regras testadas. Projeto 2 concluído!'), { type: 'project', projectId: 'p2-todo' }],
    revisao: [md('- Testes automatizados verificam código continuamente.\n- Casos: típico, bordas, classes de equivalência, inválidos.\n- TDD: vermelho → verde → refatorar.\n- pytest para projetos; unittest na biblioteca padrão.')],
  },
  review: [
    ['Quais são as etapas do TDD?', 'Red (teste falhando), green (código mínimo para passar), refactor.'],
    ['O que são classes de equivalência?', 'Grupos de entradas que o programa deve tratar da mesma forma; testa-se um representante de cada.'],
    ['O que é uma regressão?', 'Um bug que reaparece após ter sido corrigido.'],
  ],
  references: ['python-docs', 'pytest-docs', 'swe-at-google'],
});

export const level2: Level = {
  id: 'n2',
  number: 2,
  title: 'Primeira Linguagem: Python',
  titleEn: 'First Language: Python',
  goal: 'Dominar uma linguagem de verdade: coleções, texto, arquivos, erros, depuração, módulos e testes.',
  why: 'Conhecer uma linguagem a fundo — incluindo erros, depuração e testes — é o que separa "segui um tutorial" de "consigo construir sozinho". Esses hábitos se transferem para qualquer outra linguagem.',
  modules: [
    {
      id: 'm2-1', levelId: 'n2', title: 'Python e seu ambiente', titleEn: 'Python and its environment',
      description: 'Por que Python, como o código executa, estilo e documentação.',
      prerequisites: ['m1-5'],
      skills: [{ id: 'py-ambiente', pt: 'Ambiente e execução do Python', en: 'Python runtime and tooling' }],
      outline: ['Critérios de escolha da linguagem', 'Interpretador e bytecode', 'PEP 8 e Zen of Python', 'Documentação oficial'],
      lessons: [porQuePython],
      references: ['python-docs', 'pep8', 'pyodide'],
    },
    {
      id: 'm2-2', levelId: 'n2', title: 'Coleções', titleEn: 'Collections',
      description: 'Listas, dicionários, conjuntos e tuplas.',
      prerequisites: ['m2-1'],
      skills: [
        { id: 'prog-listas', pt: 'Listas', en: 'Lists' },
        { id: 'prog-dicionarios', pt: 'Dicionários e conjuntos', en: 'Dictionaries and sets' },
      ],
      outline: ['Índices e fatias', 'Mutabilidade e aliasing', 'List comprehensions', 'dict, set, tuple', 'Contagem de frequência'],
      lessons: [listas, dicionarios],
      references: ['python-tutorial'],
    },
    {
      id: 'm2-3', levelId: 'n2', title: 'Texto e arquivos', titleEn: 'Text and files',
      description: 'Processar strings e persistir dados em arquivos, CSV e JSON.',
      prerequisites: ['m2-2'],
      skills: [
        { id: 'prog-strings', pt: 'Manipulação de strings', en: 'String manipulation' },
        { id: 'prog-arquivos', pt: 'Arquivos, CSV e JSON', en: 'Files, CSV and JSON' },
      ],
      outline: ['Métodos de string', 'Imutabilidade', 'with open', 'Encoding', 'csv e json'],
      lessons: [strings, arquivos],
      references: ['python-docs'],
    },
    {
      id: 'm2-4', levelId: 'n2', title: 'Erros e depuração', titleEn: 'Errors and debugging',
      description: 'Exceções, tracebacks e um método científico para encontrar bugs.',
      prerequisites: ['m2-2'],
      skills: [
        { id: 'py-excecoes', pt: 'Exceções', en: 'Exceptions' },
        { id: 'py-debugging', pt: 'Depuração', en: 'Debugging' },
      ],
      outline: ['Tipos de erro', 'Lendo tracebacks', 'try/except/else/finally', 'raise', 'Método de depuração', 'pdb e breakpoints'],
      lessons: [erros, debugging],
      references: ['python-tutorial', 'missing-semester'],
    },
    {
      id: 'm2-5', levelId: 'n2', title: 'Módulos e testes', titleEn: 'Modules and testing',
      description: 'Organizar código em módulos, usar dependências e testar automaticamente.',
      prerequisites: ['m2-4', 'm2-3'],
      skills: [
        { id: 'py-modulos', pt: 'Módulos e pacotes', en: 'Modules and packages' },
        { id: 'py-testes', pt: 'Testes automatizados', en: 'Automated testing' },
      ],
      outline: ['import e biblioteca padrão', 'pip, PyPI, venv', 'Estrutura de projeto', 'Testes de unidade', 'TDD'],
      lessons: [modulos, testes],
      references: ['python-docs', 'pytest-docs', 'python-packaging'],
    },
  ],
};

