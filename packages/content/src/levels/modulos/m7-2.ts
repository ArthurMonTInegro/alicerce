/** Lições adicionais do módulo m7-2 (relacionamentos e joins). */
import type { Lesson } from '../../types.ts';
import { dedent, deep, english, info, lesson, md, py, t, tip, trace, warn } from '../../helpers.ts';
import { SETUP_ESCOLA } from '../../sql-setup.ts';

/* ------------------------------------------------------------------ */
/* Bancos de exemplo desta lição                                       */
/* ------------------------------------------------------------------ */

/** Escola com valores ausentes: aluno sem curso, disciplina sem matrícula e notas não lançadas. */
const ESCOLA_NULL = SETUP_ESCOLA + '\n' + dedent(`
  INSERT INTO alunos VALUES (6, 'Fábio', NULL, 2);
  INSERT INTO disciplinas VALUES (5, 'Sistemas Operacionais', 4);
  INSERT INTO matriculas VALUES (2, 3, NULL), (6, 1, NULL), (6, 2, 7.0);
`);

/** Escola com mensalidades pagas; o pagamento 5 é um Pix sem identificação do aluno. */
const ESCOLA_PAGAMENTOS = SETUP_ESCOLA + '\n' + dedent(`
  CREATE TABLE pagamentos (id INTEGER PRIMARY KEY, aluno_id INTEGER REFERENCES alunos(id), valor REAL NOT NULL, forma TEXT);
  INSERT INTO pagamentos VALUES (1, 1, 450.0, 'pix'), (2, 1, 450.0, 'boleto'), (3, 2, 380.0, 'pix'), (4, 3, 450.0, 'pix'), (5, NULL, 380.0, 'pix'), (6, 5, 450.0, 'cartao');
`);

/** Monta, nos testes, um banco da escola em memória a partir de listas Python. */
const BANCO_TESTE = dedent(`
  import sqlite3 as _sqlite3

  def _banco(alunos, disciplinas, matriculas):
      con = _sqlite3.connect(":memory:")
      con.executescript("""
          CREATE TABLE alunos (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, curso TEXT, ano INTEGER);
          CREATE TABLE disciplinas (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, creditos INTEGER);
          CREATE TABLE matriculas (aluno_id INTEGER REFERENCES alunos(id), disciplina_id INTEGER REFERENCES disciplinas(id), nota REAL);
      """)
      con.executemany("INSERT INTO alunos VALUES (?, ?, 'CC', 1)", alunos)
      con.executemany("INSERT INTO disciplinas VALUES (?, ?, 4)", disciplinas)
      con.executemany("INSERT INTO matriculas VALUES (?, ?, ?)", matriculas)
      con.commit()
      return con

  _ESCOLA_ALUNOS = [(1, "Ana"), (2, "Bia"), (3, "Caio"), (4, "Davi"), (5, "Eva"), (6, "Fábio")]
  _ESCOLA_DISCIPLINAS = [(1, "Algoritmos"), (2, "Banco de Dados"), (3, "Redes"), (4, "Cálculo"), (5, "Sistemas Operacionais")]
  _ESCOLA_MATRICULAS = [(1, 1, 9.0), (1, 2, 8.5), (2, 2, 7.0), (3, 1, 6.0), (3, 3, 8.0), (4, 2, 5.5), (1, 4, 7.5)]
  _ESCOLA_PENDENTES = [(2, 3, None), (6, 1, None), (6, 2, 7.0)]
`);

/** Conferência e referência do boletim por disciplina (desafio da lição de NULL). */
const BOLETIM_TESTE = BANCO_TESTE + '\n' + dedent(`
  import math as _math

  def _ref_boletim(disciplinas, matriculas):
      out = []
      for did, nome in sorted(disciplinas, key=lambda d: d[1]):
          notas = [n for a, d, n in matriculas if d == did]
          lancadas = [n for n in notas if n is not None]
          media = sum(lancadas) / len(lancadas) if lancadas else None
          out.append((nome, len(notas), len(notas) - len(lancadas), media))
      return out

  def _confere_boletim(r, esperado, contexto):
      assert isinstance(r, list), f"{contexto}: devolva uma lista de tuplas (o fetchall() da consulta serve); veio {r!r}"
      r = [tuple(x) for x in r]
      nomes_r = [x[0] for x in r]
      nomes_e = [x[0] for x in esperado]
      assert nomes_r == nomes_e, f"{contexto}: vieram as disciplinas {nomes_r}, esperado {nomes_e}. Todas as disciplinas aparecem, inclusive as sem matrícula, em ordem de nome"
      for linha, exp in zip(r, esperado):
          assert len(linha) == 4, f"{contexto}: cada linha tem 4 valores (nome, matriculados, pendentes, media); veio {linha}"
          nome, mat, pend, media = linha
          _, emat, epend, emedia = exp
          if mat != emat:
              dica = " COUNT(*) conta também a linha de NULL que o LEFT JOIN cria para a disciplina sem par; conte uma coluna da direita." if emat == 0 else ""
              raise AssertionError(f"{contexto}: {nome} tem {emat} matrícula(s), e veio {mat}.{dica}")
          if pend != epend:
              dica = " A linha de NULL do LEFT JOIN não é uma matrícula pendente: ela nem é matrícula." if emat == 0 else " Pendente é matrícula que existe e está com nota NULL."
              raise AssertionError(f"{contexto}: {nome} tem {epend} pendente(s), e veio {pend}.{dica}")
          if emedia is None:
              assert media is None, f"{contexto}: {nome} não tem nenhuma nota lançada; a média deve ser None (NULL), e veio {media!r}"
          else:
              assert media is not None and _math.isclose(media, emedia, abs_tol=1e-9), f"{contexto}: a média de {nome} veio {media!r}, esperado {emedia}. A média é só das notas lançadas: pendente não vale zero"
`);

/** Referência dos destaques por disciplina (desafio da lição de subconsultas). */
const DESTAQUES_TESTE = BANCO_TESTE + '\n' + dedent(`
  def _ref_destaques(alunos, disciplinas, matriculas):
      nome_a = dict(alunos)
      nome_d = dict(disciplinas)
      out = []
      for did in nome_d:
          notas = [(a, n) for a, d, n in matriculas if d == did and n is not None]
          if notas:
              maior = max(n for _, n in notas)
              out += [(nome_d[did], nome_a[a], n) for a, n in notas if n == maior]
      return sorted(out)

  def _linhas(r):
      assert isinstance(r, list), f"devolva uma lista de tuplas (o fetchall() da consulta serve); veio {r!r}"
      return [tuple(x) for x in r]
`);

/* ------------------------------------------------------------------ */
/* NULL e a lógica de três valores                                     */
/* ------------------------------------------------------------------ */

const nulos = lesson({
  id: 'l7-null-tres-valores',
  moduleId: 'm7-2',
  title: 'NULL e a lógica de três valores',
  titleEn: 'NULL and three-valued logic',
  summary: 'Por que uma comparação com NULL não dá verdadeiro nem falso, quais linhas o WHERE descarta por isso, como COUNT, SUM e AVG tratam valores ausentes, COALESCE e NULLIF, e as armadilhas do LEFT JOIN: filtrar no WHERE o que devia estar no ON e contar 1 onde devia ser 0.',
  minutes: 45,
  objectives: [
    'Avaliar expressões com NULL pela lógica de três valores (TRUE, FALSE, UNKNOWN) e prever quais linhas WHERE, HAVING e ON mantêm',
    'Escolher entre = NULL, IS NULL e a comparação segura para nulos (IS DISTINCT FROM, ou IS e IS NOT no SQLite)',
    'Prever o resultado de COUNT(*), COUNT(coluna), SUM e AVG em colunas com NULL e decidir quando usar COALESCE',
    'Decidir se um filtro sobre a tabela da direita de um LEFT JOIN vai no ON ou no WHERE',
    'Contar zero corretamente em relatórios com LEFT JOIN',
  ],
  skills: ['bd-joins', 'bd-sql'],
  terms: [
    t('lógica de três valores', 'three-valued logic (3VL)', 'A lógica do SQL, com três valores-verdade: TRUE, FALSE e UNKNOWN. Qualquer comparação com NULL dá UNKNOWN.', 'SQL uses three-valued logic: comparing anything with NULL yields UNKNOWN.'),
    t('desconhecido', 'UNKNOWN', 'O terceiro valor-verdade do SQL. WHERE, HAVING e ON descartam as linhas em que a condição dá UNKNOWN; no SQLite ele aparece como NULL.'),
    t('predicado', 'predicate', 'Expressão que resulta num valor-verdade, como nota >= 7 ou curso IS NULL.', 'Rows for which the WHERE predicate is not true are filtered out.'),
    t('comparação segura para nulos', 'null-safe comparison', 'Comparação que trata dois NULL como iguais e nunca dá UNKNOWN: IS [NOT] DISTINCT FROM no padrão SQL e no PostgreSQL, IS e IS NOT no SQLite, <=> no MySQL.', 'Use IS DISTINCT FROM for a null-safe comparison.'),
    t('valor padrão', 'default value', 'Valor posto no lugar de NULL numa consulta, em geral com COALESCE, como em COALESCE(SUM(valor), 0).'),
    t('tabela preservada', 'preserved table', 'Num LEFT JOIN, a tabela da esquerda: todas as linhas dela aparecem no resultado, com ou sem par.'),
    t('relacionamento opcional', 'optional relationship', 'Relacionamento em que a chave estrangeira pode ser NULL: a linha existe sem par do outro lado.', 'The foreign key is nullable, so the relationship is optional.'),
  ],
  stages: {
    conceito: [
      md(`
        Na lição anterior, o NULL apareceu como o "vazio" que o LEFT JOIN põe onde não há par, e você viu que \`= NULL\` não funciona. Agora vamos entender **por quê**, porque o mesmo mecanismo faz relatórios perderem linhas sem dar erro nenhum.

        \`NULL\` não é zero, não é texto vazio e não é falso: é a marca de que **não há valor ali**. A nota que o professor ainda não lançou no sistema acadêmico é NULL, e isso é diferente de uma nota 0. O complemento de um endereço que não tem complemento, o telefone que o cliente não informou, a data de entrega de um pedido que ainda não chegou: tudo NULL.

        Como o banco não sabe qual é o valor, ele também não sabe se \`nota >= 7\` é verdade. A resposta é um terceiro valor, {{desconhecido|UNKNOWN}}, e o SQL inteiro funciona com essa {{lógica de três valores|three-valued logic}}. A regra que mais importa: **o WHERE só fica com as linhas em que a condição dá TRUE**. As que dão UNKNOWN somem em silêncio, e é daí que vêm as médias que mudam, os alunos que desaparecem do relatório e o LEFT JOIN que vira INNER JOIN sem ninguém perceber.
      `),
    ],
    explicacao: [
      md(`
        ### Comparar com NULL dá UNKNOWN
        Qualquer comparação (=, <>, <, >= ...) em que um dos lados é NULL dá UNKNOWN, inclusive \`NULL = NULL\`: dois valores desconhecidos podem ser iguais ou não, e o banco não arrisca. Contas e concatenações também propagam o NULL: \`nota + 1\` e \`'Ana' || NULL\` dão NULL.

        Para perguntar se **há** valor existe um {{predicado|predicate}} próprio, que só dá TRUE ou FALSE: \`IS NULL\` e \`IS NOT NULL\`.
      `),
      {
        type: 'table',
        head: ['Expressão', 'Resultado', 'Por quê'],
        rows: [
          ['`nota = NULL`', 'UNKNOWN, seja qual for a nota', 'é uma comparação com NULL'],
          ['`NULL = NULL`', 'UNKNOWN', 'dois desconhecidos não são iguais com certeza'],
          ['`NULL <> 1`', 'UNKNOWN', 'o desconhecido pode ser 1'],
          ['`nota IS NULL`', 'TRUE ou FALSE', 'pergunta se há valor; nunca dá UNKNOWN'],
          ["`NULL + 1`, `'Ana' || NULL`", 'NULL', 'conta com valor ausente dá valor ausente'],
        ],
        caption: 'No SQLite, TRUE aparece como 1, FALSE como 0 e UNKNOWN como NULL. Pelo módulo sqlite3 do Python, como 1, 0 e None.',
      },
      md(`
        ### AND, OR e NOT com UNKNOWN
        Pense em UNKNOWN como "pode ser TRUE, pode ser FALSE". Se o resultado for o mesmo nos dois casos, ele é certo; se mudar, é UNKNOWN. \`FALSE AND UNKNOWN\` é FALSE (com um lado falso, o AND já é falso), mas \`TRUE AND UNKNOWN\` é UNKNOWN (depende do lado desconhecido).
      `),
      {
        type: 'table',
        head: ['a', 'b', 'a AND b', 'a OR b'],
        rows: [
          ['TRUE', 'UNKNOWN', 'UNKNOWN', 'TRUE'],
          ['FALSE', 'UNKNOWN', 'FALSE', 'UNKNOWN'],
          ['UNKNOWN', 'UNKNOWN', 'UNKNOWN', 'UNKNOWN'],
        ],
        caption: 'NOT UNKNOWN continua UNKNOWN. Com TRUE e FALSE dos dois lados, vale a lógica de sempre.',
      },
      md(`
        ### O WHERE só fica com TRUE
        WHERE e HAVING mantêm uma linha, e o ON de um JOIN forma um par, **só se** a condição der TRUE; FALSE e UNKNOWN são descartados do mesmo jeito. Consequência: \`WHERE nota >= 7\` e \`WHERE NOT (nota >= 7)\` **juntos não cobrem a tabela**. As matrículas sem nota não estão em nenhum dos dois, porque para elas as duas condições dão UNKNOWN. Na lógica do SQL, "p ou não p" nem sempre é verdade.

        O mesmo vale para \`<>\`: \`WHERE curso <> 'CC'\` não traz quem tem curso NULL. Se você quer essas linhas, peça explicitamente: \`WHERE curso <> 'CC' OR curso IS NULL\`.

        ### IN é uma série de =
        \`x IN (a, b, c)\` é \`x = a OR x = b OR x = c\`, e \`x NOT IN (a, b, c)\` é \`x <> a AND x <> b AND x <> c\`. Por isso:

        - \`2 IN (1, 2, NULL)\` é TRUE: um dos = deu TRUE, e para o OR isso basta.
        - \`3 IN (1, 2, NULL)\` é UNKNOWN: \`3 = NULL\` poderia ser verdade.
        - \`3 NOT IN (1, 2, NULL)\` é UNKNOWN: \`3 <> NULL\` é UNKNOWN, e o AND não chega a TRUE.

        Ou seja, **um único NULL na lista impede o NOT IN de dar TRUE em qualquer linha**. Na próxima lição essa lista vai vir de uma subconsulta, e aí a armadilha fica bem mais difícil de ver.
      `),
      warn(`
        Uma restrição CHECK funciona ao contrário do WHERE: ela só rejeita a linha se a condição der FALSE. Com \`CHECK (saldo >= 0)\`, um saldo NULL passa, porque \`NULL >= 0\` é UNKNOWN. Se a coluna não pode ficar vazia, declare-a também NOT NULL.
      `, 'CHECK aceita UNKNOWN'),
      md(`
        ### Comparar duas colunas que podem ser NULL
        Para saber se o e-mail de um cliente **mudou** entre duas tabelas, \`novo.email <> antigo.email\` falha quando um dos dois é NULL: o resultado é UNKNOWN, e a mudança de "sem e-mail" para "com e-mail" passa despercebida. Use a {{comparação segura para nulos|null-safe comparison}}, que trata NULL como um valor qualquer:
      `),
      {
        type: 'table',
        head: ['Banco', 'São diferentes', 'São iguais'],
        rows: [
          ['padrão SQL, PostgreSQL, SQLite 3.39 ou mais novo', '`a IS DISTINCT FROM b`', '`a IS NOT DISTINCT FROM b`'],
          ['SQLite (também nas versões antigas)', '`a IS NOT b`', '`a IS b`'],
          ['MySQL', '`NOT (a <=> b)`', '`a <=> b`'],
        ],
        caption: 'Com NULL dos dois lados, "são iguais" dá TRUE; com NULL de um lado só, "são diferentes" dá TRUE. O resultado nunca é UNKNOWN.',
      },
      md(`
        ### Funções para lidar com NULL
        - \`COALESCE(a, b, ...)\` devolve o primeiro argumento que não é NULL. Serve para pôr um {{valor padrão|default value}} na saída: \`COALESCE(telefone, 'não informado')\`. No SQLite e no MySQL, \`IFNULL(a, b)\` faz o mesmo com dois argumentos.
        - \`NULLIF(a, b)\` devolve NULL se a = b; senão, devolve a. O uso clássico é evitar divisão por zero: \`total / NULLIF(qtd, 0)\` dá NULL em vez de erro quando qtd é 0. (No PostgreSQL, dividir por zero é erro; o SQLite devolve NULL sem avisar.)

        ### Agregações ignoram NULL
        COUNT(coluna), SUM, AVG, MIN e MAX **pulam** os NULL. Só COUNT(*) conta linhas, tenha a linha NULL ou não.
      `),
      {
        type: 'table',
        head: ['Função', 'O que faz com NULL', 'Quando não há nenhum valor (só NULL, ou nenhuma linha)'],
        rows: [
          ['`COUNT(*)`', 'conta a linha mesmo assim', 'o número de linhas, mesmo que só tenham NULL (0 se não houver linha)'],
          ['`COUNT(nota)`', 'não conta', '0'],
          ['`SUM(nota)`', 'ignora', '**NULL**, e não 0'],
          ['`AVG(nota)`', 'ignora: é SUM(nota) dividido por COUNT(nota)', 'NULL'],
          ['`MIN(nota)`, `MAX(nota)`', 'ignoram', 'NULL'],
        ],
      },
      md(`
        Repare no AVG: a média das notas **lançadas** não é a média com as pendentes valendo zero. \`AVG(nota)\` divide por COUNT(nota); \`AVG(COALESCE(nota, 0))\` divide por COUNT(*). As duas são legítimas, mas respondem a perguntas diferentes, e quem decide qual é a certa é a regra do negócio ("nota pendente conta como zero?"), e não o SQL.
      `),
      tip(`
        O SQLite tem \`total(x)\`, que devolve 0.0 em vez de NULL quando não há valores. É uma extensão só dele; no PostgreSQL, escreva \`COALESCE(SUM(x), 0)\`.
      `),
      md(`
        ### NULL em GROUP BY, DISTINCT, UNIQUE e ORDER BY
        Para agrupar e eliminar repetidos, o SQL trata os NULL como **um mesmo valor**: \`GROUP BY curso\` junta todos os alunos sem curso num único grupo, e DISTINCT devolve um só NULL. Já uma coluna UNIQUE, no SQLite e no PostgreSQL, aceita **vários** NULL, porque dois NULL não são "iguais" (o PostgreSQL 15 trouxe \`UNIQUE NULLS NOT DISTINCT\` para proibir isso).

        Na ordenação, cada banco escolhe um lado. O SQLite e o MySQL consideram NULL menor que tudo: ele aparece **primeiro** num ORDER BY crescente. O PostgreSQL e o Oracle o consideram maior que tudo: ele aparece **por último**. Se a posição importa, diga qual quer: \`ORDER BY curso NULLS LAST\` funciona no PostgreSQL e no SQLite 3.30 ou mais novo.

        ### NULL na chave estrangeira: relacionamento opcional
        Uma chave estrangeira que aceita NULL modela um {{relacionamento opcional|optional relationship}}: \`alunos.orientador_id\` NULL quer dizer "ainda sem orientador". A restrição de chave estrangeira não confere linhas com NULL na chave (não há o que conferir), e um JOIN não liga um NULL a nada, porque \`NULL = id\` é UNKNOWN. Por isso, um INNER JOIN de alunos com professores pelo orientador **some** com quem não tem orientador; para listar todos, é LEFT JOIN. Se o relacionamento é obrigatório, declare a coluna NOT NULL.
      `),
      info(`
        No SQLite, as chaves estrangeiras só são verificadas depois de \`PRAGMA foreign_keys = ON\`, e isso vale por conexão: sem o PRAGMA, o banco aceita uma matrícula de um aluno que não existe.
      `),
      md(`
        ### LEFT JOIN, parte 1: o filtro vai no ON ou no WHERE?
        Você quer listar **todos** os alunos com a nota em Banco de Dados, com NULL para quem não cursa. A tentativa natural é:

        \`\`\`
        SELECT a.nome, m.nota
        FROM alunos a
        LEFT JOIN matriculas m ON m.aluno_id = a.id
        WHERE m.disciplina_id = 2;
        \`\`\`

        Ela devolve só quem cursa BD. Para Caio e Eva, o LEFT JOIN até gerou linhas (as de Caio, com outras disciplinas; a de Eva, com NULL em todas as colunas de matriculas), mas o WHERE as avalia **depois** da junção: \`1 = 2\` é FALSE, \`NULL = 2\` é UNKNOWN, e as linhas somem. Um filtro no WHERE sobre a tabela da direita transforma o LEFT JOIN num INNER JOIN.

        O filtro vai no ON:

        \`\`\`
        SELECT a.nome, m.nota
        FROM alunos a
        LEFT JOIN matriculas m ON m.aluno_id = a.id AND m.disciplina_id = 2;
        \`\`\`

        A regra: **o ON decide quais pares se formam; o WHERE filtra o resultado já pronto.** No LEFT JOIN, toda linha da {{tabela preservada|preserved table}} aparece pelo menos uma vez, tenha par ou não, seja o que for que esteja no ON. Por isso, uma condição sobre a tabela da **esquerda** no ON não tira ninguém do resultado: \`ON m.aluno_id = a.id AND a.curso = 'CC'\` continua listando todos os alunos, só que os de outros cursos ficam sem nenhuma matrícula ao lado. Filtro sobre a esquerda vai no WHERE. Num INNER JOIN, tanto faz: nada é preservado, e ON e WHERE dão o mesmo resultado.
      `),
      {
        type: 'table',
        head: ['Onde está o filtro', 'INNER JOIN', 'LEFT JOIN'],
        rows: [
          ['no ON, sobre a tabela da direita', 'filtra os pares', 'escolhe os pares; quem fica sem par aparece com NULL'],
          ['no WHERE, sobre a tabela da direita', 'filtra os pares (mesmo resultado)', 'apaga as linhas com NULL: vira INNER JOIN'],
          ['no ON, sobre a tabela da esquerda', 'filtra (mesmo resultado que no WHERE)', '**não filtra**: a linha aparece, só que sem par'],
          ['no WHERE, sobre a tabela da esquerda', 'filtra', 'filtra'],
        ],
      },
      md(`
        ### LEFT JOIN, parte 2: anti-join e contagem
        Dois detalhes que dependem de escolher **qual coluna** testar:

        - No anti-join da lição anterior (LEFT JOIN + \`IS NULL\`), teste uma coluna que **nunca é NULL num par de verdade**: a coluna da junção ou a chave primária da tabela da direita. \`WHERE m.nota IS NULL\` mistura dois grupos, os alunos sem matrícula e os que têm matrícula com nota pendente.
        - Para contar quantas matrículas cada aluno tem, \`COUNT(*)\` dá **1** para quem não tem nenhuma: a linha de NULL que o LEFT JOIN criou é uma linha. Conte uma coluna da direita que nunca é NULL num par, como \`COUNT(m.aluno_id)\`, e quem não tem par fica com 0.
      `),
      deep(`
        Em Python, \`None == None\` é True: None é um valor como outro qualquer. O NULL do SQL lembra mais o NaN do ponto flutuante (IEEE 754), que é diferente até de si mesmo: \`float("nan") == float("nan")\` é False. Mesmo assim, não é a mesma coisa: com NaN a comparação dá False, e não "desconhecido", e por isso \`not (nan == 1)\` é True, enquanto \`NOT (NULL = 1)\` continua UNKNOWN.

        O próprio Codd, criador do modelo relacional, chegou a propor duas marcas diferentes, uma para "o valor existe, mas não se sabe" e outra para "não se aplica". O SQL ficou com um NULL só, e cabe a quem modela o banco documentar o que ele significa em cada coluna.
      `, 'NULL não é None'),
    ],
    exemplo: [
      md(`
        Vamos usar o banco da escola com três novidades, que também aparecem nos exercícios: Fábio (id 6), ainda sem curso definido (curso NULL); a disciplina Sistemas Operacionais (id 5), sem ninguém matriculado; e três matrículas novas, duas com nota ainda não lançada (Bia em Redes e Fábio em Algoritmos). São 10 matrículas. Veja o que três condições fazem com cada uma:
      `),
      {
        type: 'table',
        head: ['Matrícula', 'nota', '`nota >= 7`', '`NOT (nota >= 7)`', '`nota >= 7 OR nota IS NULL`'],
        rows: [
          ['Ana, Algoritmos', '9.0', 'TRUE', 'FALSE', 'TRUE'],
          ['Ana, Banco de Dados', '8.5', 'TRUE', 'FALSE', 'TRUE'],
          ['Bia, Banco de Dados', '7.0', 'TRUE', 'FALSE', 'TRUE'],
          ['Caio, Algoritmos', '6.0', 'FALSE', 'TRUE', 'FALSE'],
          ['Caio, Redes', '8.0', 'TRUE', 'FALSE', 'TRUE'],
          ['Davi, Banco de Dados', '5.5', 'FALSE', 'TRUE', 'FALSE'],
          ['Ana, Cálculo', '7.5', 'TRUE', 'FALSE', 'TRUE'],
          ['Bia, Redes', 'NULL', 'UNKNOWN', 'UNKNOWN', 'TRUE (UNKNOWN OR TRUE)'],
          ['Fábio, Algoritmos', 'NULL', 'UNKNOWN', 'UNKNOWN', 'TRUE (UNKNOWN OR TRUE)'],
          ['Fábio, Banco de Dados', '7.0', 'TRUE', 'FALSE', 'TRUE'],
        ],
        caption: 'WHERE nota >= 7 traz 6 linhas, e WHERE NOT (nota >= 7) traz 2: somadas, 8 das 10. As duas pendentes só aparecem quando você pergunta por elas.',
      },
      md(`
        As agregações sobre as mesmas 10 linhas:
      `),
      {
        type: 'table',
        head: ['Expressão', 'Resultado', 'De onde vem'],
        rows: [
          ['`COUNT(*)`', '10', 'todas as linhas'],
          ['`COUNT(nota)`', '8', 'só as notas lançadas'],
          ['`SUM(nota)`', '58.5', 'soma das 8 notas'],
          ['`AVG(nota)`', '7.3125', '58,5 ÷ 8'],
          ['`AVG(COALESCE(nota, 0))`', '5.85', '58,5 ÷ 10: as pendentes valendo zero'],
        ],
      },
      md(`
        Agora o LEFT JOIN de alunos com matrículas, com o filtro de Banco de Dados (\`disciplina_id = 2\`) em cada um dos dois lugares:
      `),
      {
        type: 'table',
        head: ['nome', 'filtro no WHERE', 'filtro no ON'],
        rows: [
          ['Ana', '8.5', '8.5'],
          ['Bia', '7.0', '7.0'],
          ['Caio', '(some)', 'NULL'],
          ['Davi', '5.5', '5.5'],
          ['Eva', '(some)', 'NULL'],
          ['Fábio', '7.0', '7.0'],
        ],
        caption: 'Caio tem matrículas, mas em outras disciplinas: com o filtro no WHERE, as linhas dele dão FALSE. Eva não tem matrícula nenhuma: a linha de NULL dela dá UNKNOWN. Os dois somem.',
      },
      { type: 'viz', viz: 'sql-join', caption: 'Volte à visualização da lição anterior e localize as linhas com NULL do LEFT JOIN: são exatamente essas que um filtro sobre a tabela da direita, posto no WHERE, elimina.' },
    ],
    codigo: [
      md('Um banco menor, com os mesmos fenômenos. Rode e confira cada linha da saída com o que você viu acima; pelo módulo `sqlite3`, NULL chega ao Python como `None`.'),
      py(`
        import sqlite3

        con = sqlite3.connect(":memory:")
        con.executescript("""
        CREATE TABLE alunos (id INTEGER PRIMARY KEY, nome TEXT, curso TEXT);
        CREATE TABLE matriculas (aluno_id INTEGER, disciplina_id INTEGER, nota REAL);
        INSERT INTO alunos VALUES (1, 'Ana', 'CC'), (2, 'Bia', 'SI'), (3, 'Caio', 'CC'),
                                  (4, 'Eva', 'CC'), (5, 'Fábio', NULL);
        INSERT INTO matriculas VALUES (1, 2, 8.5), (2, 2, 7.0), (2, 3, NULL),
                                      (3, 1, 6.0), (5, 2, NULL);
        """)

        def mostra(titulo, sql):
            print(titulo, con.execute(sql).fetchall())

        # TRUE e FALSE chegam como 1 e 0; UNKNOWN chega como None
        mostra("três valores:", "SELECT NULL = NULL, NULL IS NULL, 3 NOT IN (1, 2, NULL), 1 IS NOT NULL")
        mostra("curso <> 'CC':", "SELECT nome FROM alunos WHERE curso <> 'CC'")
        mostra("curso IS NOT 'CC':", "SELECT nome FROM alunos WHERE curso IS NOT 'CC'")
        mostra("agregações:", "SELECT COUNT(*), COUNT(nota), AVG(nota), AVG(COALESCE(nota, 0)) FROM matriculas")
        mostra("filtro no WHERE:", """
            SELECT a.nome, m.nota FROM alunos a
            LEFT JOIN matriculas m ON m.aluno_id = a.id
            WHERE m.disciplina_id = 2
            ORDER BY a.nome""")
        mostra("filtro no ON:", """
            SELECT a.nome, m.nota FROM alunos a
            LEFT JOIN matriculas m ON m.aluno_id = a.id AND m.disciplina_id = 2
            ORDER BY a.nome""")
        mostra("contagem:", """
            SELECT a.nome, COUNT(*) AS errado, COUNT(m.aluno_id) AS certo
            FROM alunos a
            LEFT JOIN matriculas m ON m.aluno_id = a.id
            GROUP BY a.id, a.nome
            ORDER BY a.nome""")
      `, { caption: 'Com o filtro no ON, Caio e Eva aparecem com None. Fábio aparece com None nas duas versões, mas por outro motivo: ele cursa BD e a nota ainda não foi lançada. Um None no resultado de um LEFT JOIN não diz, sozinho, se faltou o par ou se faltou o valor.' }),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e7-null-1',
          kind: 'mcq',
          prompt: 'Qual consulta lista os alunos que **ainda não têm curso definido** (curso NULL)?',
          difficulty: 'facil',
          skills: ['bd-joins'],
          hints: [
            'Quanto vale `curso = NULL` numa linha em que o curso é NULL? E numa em que é "CC"?',
            'Qual predicado pergunta se há valor e só responde TRUE ou FALSE?',
          ],
          explanation: '`IS NULL` é o único jeito de perguntar se falta o valor. `curso = NULL` dá UNKNOWN em toda linha, e o WHERE descarta todas, sem erro. Texto vazio é um valor como outro qualquer. E qualquer condição que compare curso com algo (=, <>, IN) dá UNKNOWN justamente nas linhas sem curso, então nenhuma delas consegue selecioná-las.',
          options: [
            { text: "SELECT nome FROM alunos WHERE curso = NULL;", feedback: 'Roda sem erro e devolve zero linhas: `curso = NULL` é UNKNOWN para todo aluno, inclusive os sem curso, e o WHERE só fica com TRUE.' },
            { text: 'SELECT nome FROM alunos WHERE curso IS NULL;', correct: true, feedback: 'Isso. IS NULL dá TRUE ou FALSE, nunca UNKNOWN, e é feito para essa pergunta.' },
            { text: "SELECT nome FROM alunos WHERE curso = '';", feedback: "Texto vazio é um valor, diferente de NULL: essa consulta acharia quem tem curso '' cadastrado, não quem não tem curso. (O Oracle é a exceção conhecida: lá, texto vazio é tratado como NULL.)" },
            { text: "SELECT nome FROM alunos WHERE NOT (curso IN ('CC', 'SI', 'ADS'));", feedback: 'Para curso NULL, `curso IN (...)` dá UNKNOWN, e NOT UNKNOWN continua UNKNOWN: justamente quem você queria fica de fora. Além disso, a consulta traria alunos de qualquer outro curso.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e7-null-2',
          kind: 'sql',
          prompt: "Neste banco, Fábio ainda não tem curso definido (curso NULL). Liste o **nome** de todos os alunos que **não** são do curso CC, inclusive quem não tem curso, em ordem alfabética.",
          difficulty: 'facil',
          skills: ['bd-joins', 'bd-sql'],
          hints: [
            'Rode a consulta inicial e olhe a coluna curso. Quem não tem curso?',
            "Para Fábio, quanto vale `curso <> 'CC'`? O WHERE fica com essa linha?",
            'Você pode pedir as linhas sem curso explicitamente, com um segundo predicado ligado por OR.',
          ],
          explanation: "SELECT nome FROM alunos WHERE curso <> 'CC' OR curso IS NULL ORDER BY nome; Para Fábio, `curso <> 'CC'` dá UNKNOWN e `curso IS NULL` dá TRUE; UNKNOWN OR TRUE é TRUE, e ele fica. Só com `<>`, Fábio some sem aviso. No SQLite, `WHERE curso IS NOT 'CC'` faz o mesmo numa comparação só (no padrão SQL e no PostgreSQL, `curso IS DISTINCT FROM 'CC'`).",
          setup: ESCOLA_NULL,
          starter: 'SELECT nome, curso FROM alunos ORDER BY nome;',
          solution: "SELECT nome FROM alunos WHERE curso <> 'CC' OR curso IS NULL ORDER BY nome;",
          ordered: true,
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e7-null-3',
          kind: 'predict',
          lang: 'python',
          prompt: 'O que este programa imprime? Lembre que o `sqlite3` entrega NULL como `None` e TRUE/FALSE como `1`/`0`.',
          difficulty: 'intermediario',
          skills: ['bd-joins', 'bd-sql'],
          hints: [
            'A tabela tem 4 linhas, e duas delas são NULL. Quais funções contam linhas e quais contam valores?',
            'AVG divide a soma pelo número de valores ou pelo número de linhas?',
            'Para as linhas NULL, quanto valem `x <> 1` e `NOT (x <> 1)`? O WHERE fica com elas?',
            'Na última consulta, nenhuma linha passa no WHERE. Quanto vale SUM de nada? E COUNT de nada?',
          ],
          explanation: 'COUNT(*) conta as 4 linhas; COUNT(x) só os 2 valores; SUM(x) = 1 + 3 = 4; AVG(x) = 4 ÷ 2 = 2.0 (as linhas NULL não entram nem na soma nem na divisão). `x <> 1` só é TRUE para o 3: o 1 dá FALSE e os NULL dão UNKNOWN. `NOT (x <> 1)` só é TRUE para o 1, porque NOT UNKNOWN continua UNKNOWN. As duas consultas somam 2 linhas, não 4. Na quarta linha: NULL = NULL é UNKNOWN (None), NULL IS NULL é TRUE (1), 2 IN (1, 2, NULL) é TRUE (1) e 3 NOT IN (1, 2, NULL) é UNKNOWN (None). Por fim, sem nenhuma linha, SUM dá NULL, e COUNT dá 0.',
          code: dedent(`
            import sqlite3

            con = sqlite3.connect(":memory:")
            con.executescript("""
            CREATE TABLE t (x INTEGER);
            INSERT INTO t VALUES (1), (NULL), (3), (NULL);
            """)

            def q(sql):
                print(con.execute(sql).fetchone())

            q("SELECT COUNT(*), COUNT(x), SUM(x), AVG(x) FROM t")
            q("SELECT COUNT(*) FROM t WHERE x <> 1")
            q("SELECT COUNT(*) FROM t WHERE NOT (x <> 1)")
            q("SELECT NULL = NULL, NULL IS NULL, 2 IN (1, 2, NULL), 3 NOT IN (1, 2, NULL)")
            q("SELECT SUM(x), COUNT(x) FROM t WHERE x > 5")
          `),
          answer: '(4, 2, 4, 2.0)\n(1,)\n(1,)\n(None, 1, 1, None)\n(None, 0)',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e7-null-4',
          kind: 'sql',
          prompt: 'A consulta inicial deveria listar **todos** os alunos com a `nota` deles em Banco de Dados (`disciplina_id = 2`), com NULL para quem não cursa a disciplina, em ordem de nome. Ela usa LEFT JOIN, mas Caio e Eva somem. Corrija-a, mantendo as colunas `nome` e `nota`.',
          difficulty: 'intermediario',
          skills: ['bd-joins'],
          hints: [
            'Antes do WHERE, que linhas o LEFT JOIN gera para Caio? E para Eva, que não tem matrícula?',
            'Para essas linhas, quanto vale `m.disciplina_id = 2`? O WHERE as mantém?',
            'Em que parte da consulta um filtro escolhe os pares, em vez de apagar linhas do resultado pronto?',
          ],
          explanation: 'SELECT a.nome, m.nota FROM alunos a LEFT JOIN matriculas m ON m.aluno_id = a.id AND m.disciplina_id = 2 ORDER BY a.nome; No ON, o filtro decide quais matrículas formam par; quem fica sem par continua no resultado, com NULL. No WHERE, ele roda depois da junção e apaga as linhas de Caio (FALSE) e de Eva (UNKNOWN). Um conserto comum, e errado, é `WHERE m.disciplina_id = 2 OR m.disciplina_id IS NULL`: recupera Eva, cuja única linha é de NULL, mas não Caio, cujas linhas são de outras disciplinas.',
          setup: ESCOLA_NULL,
          starter: 'SELECT a.nome, m.nota\nFROM alunos a\nLEFT JOIN matriculas m ON m.aluno_id = a.id\nWHERE m.disciplina_id = 2\nORDER BY a.nome;',
          solution: 'SELECT a.nome, m.nota FROM alunos a LEFT JOIN matriculas m ON m.aluno_id = a.id AND m.disciplina_id = 2 ORDER BY a.nome;',
          ordered: true,
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e7-null-5',
          kind: 'fix',
          lang: 'python',
          prompt: dedent(`
            Vamos simular a lógica de três valores em Python, com \`None\` no papel de UNKNOWN. O código usa \`and\`, \`or\`, \`not\` e \`in\` do próprio Python e acerta vários casos, mas não todos. Corrija as quatro funções para que sigam as tabelas do SQL:

            - \`e3(a, b)\`, \`ou3(a, b)\` e \`nao3(a)\` recebem True, False ou None e devolvem True, False ou None (o AND, o OR e o NOT do SQL);
            - \`em3(x, valores)\` é o \`x IN (valores)\` do SQL: \`x\` e os itens da lista (que nunca é vazia) são números ou None.

            Devolva exatamente True, False ou None, e não 1 ou 0.
          `),
          difficulty: 'intermediario',
          skills: ['bd-joins', 'prog-condicionais'],
          hints: [
            'Em Python, None é "falso" num if. Quanto vale `None and False`? E `None or False`? E `not None`? Compare com as tabelas da lição.',
            'No AND, que valor decide sozinho o resultado, seja qual for o outro lado? E no OR?',
            'Depois de tratar o valor que decide sozinho, em que situação sobra UNKNOWN?',
            '`x IN (a, b, c)` é `x = a OR x = b OR x = c`. Quanto vale cada = quando um dos lados é None? Você já tem a função que faz o OR.',
          ],
          explanation: 'O `and` e o `or` do Python devolvem um dos operandos conforme ele seja "verdadeiro" ou "falso" num if, e None conta como falso. Daí `None and False` dá None (o SQL diz FALSE: um lado falso basta), `None or False` dá False (o SQL diz UNKNOWN) e `not None` dá True (o SQL diz UNKNOWN). A correção segue a regra da lição: no AND, FALSE decide sozinho; no OR, TRUE decide sozinho; fora isso, qualquer UNKNOWN deixa o resultado UNKNOWN. Já o `in` do Python usa ==, e `None == None` é True, então `None in [None]` dá True e `3 in [1, 2, None]` dá False, onde o SQL diz UNKNOWN nos dois casos. Escrevendo o IN como uma série de = ligados por `ou3`, com cada = valendo None quando um dos lados é None, o NOT IN sai de graça: `nao3(em3(3, [1, 2, None]))` é None.',
          starter: dedent(`
            # None faz o papel de UNKNOWN (o NULL lógico do SQL)

            def e3(a, b):
                return a and b

            def ou3(a, b):
                return a or b

            def nao3(a):
                return not a

            def em3(x, valores):
                return x in valores
          `),
          solution: dedent(`
            # None faz o papel de UNKNOWN (o NULL lógico do SQL)

            def e3(a, b):
                if a is False or b is False:
                    return False
                if a is None or b is None:
                    return None
                return True

            def ou3(a, b):
                if a is True or b is True:
                    return True
                if a is None or b is None:
                    return None
                return False

            def nao3(a):
                if a is None:
                    return None
                return not a

            def em3(x, valores):
                resultado = False
                for v in valores:
                    if x is None or v is None:
                        igual = None
                    else:
                        igual = x == v
                    resultado = ou3(resultado, igual)
                return resultado
          `),
          tests: [
            {
              name: 'tabela do AND',
              code: dedent(`
                _esperado = {
                    (True, True): True, (True, False): False, (True, None): None,
                    (False, True): False, (False, False): False, (False, None): False,
                    (None, True): None, (None, False): False, (None, None): None,
                }
                for (a, b), esp in _esperado.items():
                    r = e3(a, b)
                    assert r is None or isinstance(r, bool), f"e3({a}, {b}) devolveu {r!r}: devolva exatamente True, False ou None, e não 1 ou 0"
                    assert r is esp, f"e3({a}, {b}) deu {r!r}, esperado {esp!r}. No AND, um lado FALSE basta para dar FALSE; sem nenhum FALSE, qualquer UNKNOWN deixa o resultado UNKNOWN"
              `),
            },
            {
              name: 'tabela do OR',
              code: dedent(`
                _esperado = {
                    (True, True): True, (True, False): True, (True, None): True,
                    (False, True): True, (False, False): False, (False, None): None,
                    (None, True): True, (None, False): None, (None, None): None,
                }
                for (a, b), esp in _esperado.items():
                    r = ou3(a, b)
                    assert r is None or isinstance(r, bool), f"ou3({a}, {b}) devolveu {r!r}: devolva exatamente True, False ou None, e não 1 ou 0"
                    assert r is esp, f"ou3({a}, {b}) deu {r!r}, esperado {esp!r}. No OR, um lado TRUE basta para dar TRUE; sem nenhum TRUE, qualquer UNKNOWN deixa o resultado UNKNOWN"
              `),
            },
            {
              name: 'NOT',
              code: dedent(`
                for a, esp in [(True, False), (False, True), (None, None)]:
                    r = nao3(a)
                    assert r is None or isinstance(r, bool), f"nao3({a}) devolveu {r!r}: devolva exatamente True, False ou None, e não 1 ou 0"
                    assert r is esp, f"nao3({a}) deu {r!r}, esperado {esp!r}: o contrário de desconhecido continua desconhecido"
              `),
            },
            {
              name: 'IN com NULL',
              code: dedent(`
                casos = [
                    (2, [1, 2, None], True, "um dos = deu TRUE, e para o OR isso basta"),
                    (3, [1, 2, None], None, "3 = NULL poderia ser verdade"),
                    (3, [1, 2], False, "sem NULL na lista e sem nenhum igual, é FALSE"),
                    (None, [1, 2], None, "NULL = 1 e NULL = 2 são UNKNOWN"),
                    (None, [None], None, "NULL = NULL é UNKNOWN, e não TRUE como em Python"),
                    (1, [None, 1], True, "o igual pode aparecer depois do NULL"),
                ]
                for x, valores, esp, porque in casos:
                    r = em3(x, valores)
                    assert r is esp, f"em3({x}, {valores}) deu {r!r}, esperado {esp!r}: {porque}"
              `),
            },
            {
              name: 'NOT IN com NULL',
              code: dedent(`
                r = nao3(em3(3, [1, 2, None]))
                assert r is None, f"3 NOT IN (1, 2, NULL) deveria ser UNKNOWN (None), veio {r!r}: um NULL na lista impede o NOT IN de dar TRUE"
                r = nao3(em3(3, [1, 2]))
                assert r is True, f"3 NOT IN (1, 2) deveria ser TRUE, veio {r!r}"
                r = nao3(em3(1, [1, None]))
                assert r is False, f"1 NOT IN (1, NULL) deveria ser FALSE, veio {r!r}: 1 = 1 já decide o IN"
              `),
            },
            { name: 'sem atalhos', code: 'assert "sqlite3" not in _source, "não use o sqlite3 para calcular as respostas: o exercício é escrever a lógica de três valores à mão"' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e7-null-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            A coordenação quer um boletim por disciplina. Escreva \`boletim(con)\`, que recebe uma conexão \`sqlite3\` com as tabelas da escola (\`alunos\`, \`disciplinas\`, \`matriculas\`) e devolve uma lista de tuplas \`(nome, matriculados, pendentes, media)\`, uma por disciplina, **inclusive as que não têm matrícula**, em ordem de nome (os nomes de disciplina são únicos):

            - \`matriculados\`: quantas matrículas a disciplina tem;
            - \`pendentes\`: quantas dessas matrículas ainda estão sem nota (nota NULL);
            - \`media\`: a média só das notas lançadas, sem arredondar, ou \`None\` se não houver nenhuma.

            Resolva com **uma** consulta SQL. Os testes rodam sua função em vários bancos, inclusive com disciplinas sem matrícula e disciplinas só com notas pendentes.
          `),
          difficulty: 'avancado',
          skills: ['bd-joins', 'bd-sql'],
          hints: [
            'Toda disciplina precisa aparecer, mesmo sem matrícula. Qual JOIN, e qual tabela fica à esquerda?',
            'Numa disciplina sem matrícula, quantas linhas o LEFT JOIN gera? O que COUNT(*) conta nela?',
            'Pendente é uma matrícula que existe e está sem nota. Que duas contagens, subtraídas, dão isso sem contar a linha de NULL do LEFT JOIN?',
            'AVG já ignora os NULL. A média precisa de COALESCE?',
          ],
          explanation: 'SELECT d.nome, COUNT(m.disciplina_id), COUNT(m.disciplina_id) - COUNT(m.nota), AVG(m.nota) FROM disciplinas d LEFT JOIN matriculas m ON m.disciplina_id = d.id GROUP BY d.id, d.nome ORDER BY d.nome. O LEFT JOIN a partir de disciplinas preserva as sem matrícula. COUNT(m.disciplina_id) conta só os pares de verdade (a coluna da junção nunca é NULL num par), e COUNT(m.nota) só as notas lançadas: a diferença são as pendentes. Com COUNT(*), a disciplina sem matrícula teria 1 matriculado e 1 pendente, por causa da linha de NULL. AVG(m.nota) já é a média só das lançadas e dá NULL quando não há nenhuma; AVG(COALESCE(m.nota, 0)) responderia outra pergunta, com as pendentes valendo zero. E filtrar `WHERE m.nota IS NOT NULL` faria sumir as pendentes da contagem e as disciplinas só com pendentes.',
          starter: dedent(`
            import sqlite3

            def boletim(con):
                # Uma tupla (nome, matriculados, pendentes, media) por disciplina,
                # inclusive as sem matrícula, em ordem de nome.
                sql = """
                    SELECT d.nome
                    FROM disciplinas d
                    ORDER BY d.nome
                """
                return con.execute(sql).fetchall()
          `),
          solution: dedent(`
            import sqlite3

            def boletim(con):
                sql = """
                    SELECT d.nome,
                           COUNT(m.disciplina_id) AS matriculados,
                           COUNT(m.disciplina_id) - COUNT(m.nota) AS pendentes,
                           AVG(m.nota) AS media
                    FROM disciplinas d
                    LEFT JOIN matriculas m ON m.disciplina_id = d.id
                    GROUP BY d.id, d.nome
                    ORDER BY d.nome
                """
                return con.execute(sql).fetchall()
          `),
          tests: [
            {
              name: 'banco da lição',
              code: BOLETIM_TESTE + '\n' + dedent(`
                _con = _banco(_ESCOLA_ALUNOS, _ESCOLA_DISCIPLINAS, _ESCOLA_MATRICULAS + _ESCOLA_PENDENTES)
                _esperado = [
                    ("Algoritmos", 3, 1, 7.5),
                    ("Banco de Dados", 4, 0, 7.0),
                    ("Cálculo", 1, 0, 7.5),
                    ("Redes", 2, 1, 8.0),
                    ("Sistemas Operacionais", 0, 0, None),
                ]
                _confere_boletim(boletim(_con), _esperado, "banco da lição")
              `),
            },
            {
              name: 'sem matrícula e só pendentes',
              code: BOLETIM_TESTE + '\n' + dedent(`
                _con = _banco([(1, "Ana"), (2, "Bia"), (3, "Caio")],
                              [(10, "Redes"), (20, "Grafos"), (30, "Compiladores")],
                              [(1, 20, None), (2, 20, None), (1, 30, 8.0), (2, 30, None), (3, 30, 6.0)])
                _esperado = [
                    ("Compiladores", 3, 1, 7.0),
                    ("Grafos", 2, 2, None),
                    ("Redes", 0, 0, None),
                ]
                _confere_boletim(boletim(_con), _esperado, "disciplina só com pendentes e disciplina sem matrícula")
              `),
            },
            {
              name: 'sem disciplinas',
              code: BOLETIM_TESTE + '\n' + dedent(`
                r = boletim(_banco([], [], []))
                assert list(r) == [], f"sem disciplinas, o boletim é a lista vazia; veio {r!r}"
              `),
            },
            {
              name: 'bancos aleatórios',
              code: BOLETIM_TESTE + '\n' + dedent(`
                import random
                random.seed(21)
                _nomes = ["Algoritmos", "Redes", "Banco", "Compiladores", "Estatistica", "Fisica", "Grafos"]
                for rodada in range(150):
                    nd = random.randint(0, 5)
                    disciplinas = list(zip(range(1, nd + 1), random.sample(_nomes, nd)))
                    alunos = [(i, f"Aluno {i}") for i in range(1, 7)]
                    matriculas = []
                    for a, _ in alunos:
                        for d, _ in disciplinas:
                            if random.random() < 0.4:
                                matriculas.append((a, d, random.choice([None, None, 5.0, 6.5, 7.0, 8.0, 9.5, 10.0])))
                    random.shuffle(matriculas)
                    _confere_boletim(boletim(_banco(alunos, disciplinas, matriculas)), _ref_boletim(disciplinas, matriculas), f"banco aleatório {rodada} (disciplinas {disciplinas}, matrículas {matriculas})")
              `),
            },
          ],
        },
      },
    ],
    projeto: [
      md(`
        **Sistema de cadastro (parte 5, continuação)**: no boletim do aluno, mostre "pendente" quando a nota ainda não foi lançada. Faça isso na camada de apresentação, em Python, ou no SQL com \`COALESCE(CAST(nota AS TEXT), 'pendente')\` (no PostgreSQL, todos os argumentos do COALESCE precisam ser do mesmo tipo, por isso o CAST). Acrescente um relatório por disciplina com matriculados, pendentes e média, e escreva testes que cubram uma disciplina sem matrícula e uma só com notas pendentes.
      `),
      { type: 'project', projectId: 'p3-cadastro' },
    ],
    revisao: [
      md(`
        - NULL é "não há valor": não é zero, nem texto vazio, nem falso.
        - Comparação com NULL dá UNKNOWN, inclusive NULL = NULL. Para perguntar se falta o valor: IS NULL / IS NOT NULL.
        - AND: FALSE decide sozinho. OR: TRUE decide sozinho. Fora isso, qualquer UNKNOWN deixa o resultado UNKNOWN; NOT UNKNOWN é UNKNOWN.
        - WHERE, HAVING e ON só ficam com TRUE. \`p\` e \`NOT p\` juntos não cobrem as linhas em que p é UNKNOWN. CHECK, ao contrário, só rejeita FALSE.
        - Um NULL na lista impede o NOT IN de dar TRUE.
        - Comparação segura para nulos: IS [NOT] DISTINCT FROM; no SQLite, IS e IS NOT.
        - COUNT(*) conta linhas; COUNT(col), SUM, AVG, MIN e MAX ignoram NULL. SUM de nada é NULL: COALESCE(SUM(x), 0).
        - LEFT JOIN: filtro sobre a direita vai no ON (no WHERE, vira INNER JOIN); para contar pares, COUNT de uma coluna da direita que nunca é NULL num par.
      `),
      english(`
        - **NULL / missing value**: NULL / valor ausente
        - **three-valued logic, UNKNOWN**: lógica de três valores, desconhecido
        - **null-safe comparison**: comparação segura para nulos (IS DISTINCT FROM)
        - **preserved table**: tabela preservada (a da esquerda, no LEFT JOIN)
        - **nullable column**: coluna que aceita NULL

        Frase típica de entrevista: *"Putting that condition in the WHERE clause turns the left join into an inner join: rows without a match have NULLs there, the predicate evaluates to unknown, and they get filtered out. I'd move it into the ON clause."*

        Frase da documentação do PostgreSQL: *"Do not write expression = NULL because NULL is not 'equal to' NULL. (The null value represents an unknown value, and it is not known whether two unknown values are equal.)"*
      `),
    ],
  },
  review: [
    ['Por que `WHERE nota = NULL` não devolve nenhuma linha, nem dá erro?', 'Comparar com NULL dá UNKNOWN em toda linha, e o WHERE só fica com as linhas em que a condição é TRUE. O certo é `nota IS NULL`.'],
    ['Quanto valem FALSE AND UNKNOWN, TRUE AND UNKNOWN e TRUE OR UNKNOWN?', 'FALSE, UNKNOWN e TRUE. Se o resultado não depende do lado desconhecido, ele é certo; se depende, é UNKNOWN.'],
    ['Por que `WHERE p` e `WHERE NOT p` juntos podem não trazer todas as linhas?', 'Nas linhas em que p dá UNKNOWN, NOT p também dá UNKNOWN, e o WHERE descarta as duas.'],
    ['Por que `3 NOT IN (1, 2, NULL)` não é TRUE?', 'NOT IN é uma série de <> ligados por AND, e `3 <> NULL` é UNKNOWN: o AND não chega a TRUE.'],
    ['O que COUNT(*) e COUNT(nota) contam?', 'COUNT(*) conta linhas; COUNT(nota) conta só as linhas em que nota não é NULL.'],
    ['AVG(nota) e AVG(COALESCE(nota, 0)) dividem a soma por quanto?', 'AVG(nota) divide por COUNT(nota), ignorando as pendentes; com COALESCE, divide por COUNT(*), e as pendentes valem zero.'],
    ['Quanto dá SUM de uma coluna sem nenhum valor, e como trocar por 0?', 'Dá NULL, e não 0. Use COALESCE(SUM(x), 0).'],
    ['Num LEFT JOIN, o que acontece se o filtro sobre a tabela da direita fica no WHERE?', 'As linhas sem par (com NULL) dão UNKNOWN e somem: o LEFT JOIN vira INNER JOIN. O filtro tem de ir no ON.'],
    ['Num LEFT JOIN agrupado, por que COUNT(*) dá 1 para quem não tem par, e o que usar?', 'A linha de NULL criada pelo LEFT JOIN é uma linha. Conte uma coluna da direita que nunca é NULL num par, como COUNT(m.aluno_id).'],
    ['Como comparar duas colunas tratando NULL como um valor comum?', 'Com IS DISTINCT FROM / IS NOT DISTINCT FROM (padrão SQL e PostgreSQL), ou IS NOT / IS no SQLite.'],
  ],
  references: ['postgres-docs', 'sqlite-docs', 'cmu-15445'],
});

/* ------------------------------------------------------------------ */
/* Subconsultas: IN, EXISTS e tabelas derivadas                        */
/* ------------------------------------------------------------------ */

const subconsultas = lesson({
  id: 'l7-subconsultas',
  moduleId: 'm7-2',
  title: 'Subconsultas: IN, EXISTS e tabelas derivadas',
  titleEn: 'Subqueries: IN, EXISTS and derived tables',
  summary: 'Consultas dentro de consultas: a subconsulta escalar que compara cada linha com uma média, a correlacionada que é refeita para cada linha, IN e EXISTS para filtrar sem repetir linhas, NOT EXISTS no lugar do NOT IN que quebra com NULL, e tabelas derivadas e WITH para agregar antes de juntar sem multiplicar linhas.',
  minutes: 50,
  objectives: [
    'Comparar cada linha com um valor calculado usando uma subconsulta escalar, e prever o que acontece quando ela devolve zero ou várias linhas',
    'Ler e escrever subconsultas correlacionadas, que dependem da linha de fora',
    'Filtrar com IN e EXISTS (semijunção) sem as repetições que um JOIN produziria',
    'Escrever anti-joins com NOT EXISTS e explicar por que NOT IN devolve vazio quando a subconsulta traz um NULL',
    'Agregar antes de juntar, com tabelas derivadas e WITH, para evitar a multiplicação de linhas (fan-out)',
  ],
  skills: ['bd-joins', 'bd-sql'],
  terms: [
    t('subconsulta', 'subquery', 'Um SELECT entre parênteses dentro de outro comando SQL.', 'A subquery can appear in the SELECT list, in the FROM clause or in the WHERE clause.'),
    t('subconsulta escalar', 'scalar subquery', 'Subconsulta que devolve uma coluna e no máximo uma linha, usada como um valor. Sem nenhuma linha, ela vale NULL.', 'ERROR: more than one row returned by a subquery used as an expression'),
    t('subconsulta correlacionada', 'correlated subquery', 'Subconsulta que usa uma coluna da consulta de fora; logicamente, é refeita para cada linha de fora.', 'A correlated subquery is evaluated once for each row of the outer query.'),
    t('semijunção', 'semi-join', 'Mantém as linhas da esquerda que têm pelo menos um par, cada uma uma única vez. É o que IN e EXISTS fazem.', 'The planner turned the EXISTS into a hash semi-join.'),
    t('antijunção', 'anti-join', 'Mantém as linhas da esquerda que não têm nenhum par: NOT EXISTS, ou LEFT JOIN com IS NULL.'),
    t('tabela derivada', 'derived table', 'Subconsulta no FROM, usada como se fosse uma tabela.'),
    t('expressão de tabela comum', 'common table expression (CTE)', 'Subconsulta com nome, declarada com WITH antes do SELECT principal.', 'WITH totals AS (SELECT ...) SELECT ... FROM totals;'),
    t('multiplicação de linhas', 'fan-out', 'O que acontece ao juntar, a partir da mesma linha, duas tabelas 1:N independentes: cada linha de uma se combina com cada linha da outra, e SUM e COUNT saem inflados.'),
  ],
  stages: {
    conceito: [
      md(`
        Algumas perguntas têm um passo no meio. "Quem tirou nota acima da média?" exige calcular a média **antes** de comparar. "Quais alunos não pagaram nenhuma mensalidade?" exige olhar outra tabela só para saber se existe alguma linha lá. "Quanto cada aluno já pagou, e quantos créditos cursa?" exige somar duas coisas separadamente antes de juntar.

        Uma {{subconsulta|subquery}} é um SELECT entre parênteses dentro de outro, e resolve os três casos. Ela pode virar um valor (a média), uma lista (os ids de quem pagou), um teste de existência ou uma tabela inteira. Nesta lição você vai aprender a escolher entre essas formas e a escapar de duas armadilhas que passam em todos os testes feitos com dados limpos e quebram em produção: o NOT IN que encontra um NULL e o JOIN que multiplica as somas.
      `),
    ],
    explicacao: [
      md(`
        Nesta lição o banco da escola ganha a tabela \`pagamentos(id, aluno_id, valor, forma)\`, com as mensalidades pagas. Um dos pagamentos é um Pix que chegou **sem identificação** do aluno, com \`aluno_id\` NULL.

        ### Onde uma subconsulta pode aparecer
      `),
      {
        type: 'table',
        head: ['Forma', 'Devolve', 'Exemplo'],
        rows: [
          ['escalar, como um valor', 'uma coluna e no máximo uma linha', '`WHERE nota > (SELECT AVG(nota) FROM matriculas)`'],
          ['lista, com IN / NOT IN', 'uma coluna, várias linhas', '`WHERE id IN (SELECT aluno_id FROM pagamentos)`'],
          ['teste, com EXISTS / NOT EXISTS', 'qualquer coisa: só importa se há linha', '`WHERE EXISTS (SELECT 1 FROM pagamentos p WHERE p.aluno_id = a.id)`'],
          ['tabela, no FROM ou no WITH', 'uma tabela inteira', '`FROM (SELECT aluno_id, SUM(valor) AS pago FROM pagamentos GROUP BY aluno_id) AS t`'],
        ],
      },
      md(`
        ### Subconsulta escalar
        Por que não escrever \`WHERE nota > AVG(nota)\`? Lembre da ordem lógica vista na primeira lição do nível: o WHERE roda **antes** de qualquer agregação, linha a linha, e nessa hora ainda não existe média. O banco recusa (no SQLite, *misuse of aggregate function AVG()*; no PostgreSQL, *aggregate functions are not allowed in WHERE*). A saída é calcular a média numa {{subconsulta escalar|scalar subquery}}, que roda à parte e vira um número:

        \`\`\`
        SELECT aluno_id, disciplina_id, nota
        FROM matriculas
        WHERE nota > (SELECT AVG(nota) FROM matriculas);
        \`\`\`

        Uma subconsulta escalar precisa devolver **uma coluna e no máximo uma linha**. Sem nenhuma linha, ela vale NULL, e a comparação vira UNKNOWN. Com mais de uma, o PostgreSQL dá erro (*more than one row returned by a subquery used as an expression*), mas o **SQLite usa a primeira linha e segue em frente, sem avisar**. Se a subconsulta pode trazer várias linhas, o que você quer é IN ou EXISTS, e não =.

        ### Subconsulta correlacionada
        E "acima da média **da própria disciplina**"? Agora a média depende da linha que está sendo testada:

        \`\`\`
        SELECT m.aluno_id, m.disciplina_id, m.nota
        FROM matriculas m
        WHERE m.nota > (SELECT AVG(m2.nota)
                        FROM matriculas m2
                        WHERE m2.disciplina_id = m.disciplina_id);
        \`\`\`

        O \`m.disciplina_id\` dentro dos parênteses vem da consulta de **fora**: é uma {{subconsulta correlacionada|correlated subquery}}. O significado é o de um laço aninhado: para cada linha m, calcule a média da disciplina de m e compare. Os apelidos (m e m2) são indispensáveis aqui, porque a tabela é a mesma dos dois lados; sem eles, \`disciplina_id = disciplina_id\` compararia a coluna de dentro com ela mesma.

        Uma subconsulta correlacionada também pode ficar no SELECT, como uma coluna calculada linha a linha:

        \`\`\`
        SELECT d.nome,
               (SELECT COUNT(*) FROM matriculas m WHERE m.disciplina_id = d.id) AS matriculados
        FROM disciplinas d;
        \`\`\`

        Esse COUNT dá 0 para disciplina sem matrícula, sem LEFT JOIN nem GROUP BY: o COUNT de nenhuma linha é 0.
      `),
      warn(`
        Laço aninhado é o **significado**, não necessariamente a execução: o otimizador pode reescrever a consulta. Mas, no SQLite, o \`EXPLAIN QUERY PLAN\` de uma consulta assim costuma mostrar *CORRELATED SCALAR SUBQUERY*, e a subconsulta roda de novo para cada linha de fora. Com um índice na coluna da ligação (aqui, \`matriculas(disciplina_id)\`), cada rodada vira uma busca rápida; sem índice, é uma varredura por linha, O(n · m). Você vai medir isso com EXPLAIN no próximo módulo.
      `, 'Quanto custa'),
      md(`
        ### IN e EXISTS: filtrar sem repetir
        "Quais alunos cursam alguma disciplina de 6 créditos?" Com JOIN:

        \`\`\`
        SELECT a.nome
        FROM alunos a
        JOIN matriculas m  ON m.aluno_id = a.id
        JOIN disciplinas d ON d.id = m.disciplina_id
        WHERE d.creditos = 6;
        \`\`\`

        Ana aparece **duas vezes** (Algoritmos e Cálculo): o JOIN devolve uma linha por **par**, e Ana tem dois. Um \`DISTINCT a.nome\` esconde o sintoma, mas cria outro problema: duas alunas diferentes chamadas Ana viram uma só. O que a pergunta pede é uma {{semijunção|semi-join}}: cada aluno **uma vez**, se tiver pelo menos um par. É o que IN e EXISTS fazem:

        \`\`\`
        SELECT nome FROM alunos
        WHERE id IN (SELECT m.aluno_id
                     FROM matriculas m JOIN disciplinas d ON d.id = m.disciplina_id
                     WHERE d.creditos = 6);

        SELECT a.nome FROM alunos a
        WHERE EXISTS (SELECT 1
                      FROM matriculas m JOIN disciplinas d ON d.id = m.disciplina_id
                      WHERE m.aluno_id = a.id AND d.creditos = 6);
        \`\`\`

        - **IN** pergunta se o valor está na lista que a subconsulta devolve (em geral, uma subconsulta não correlacionada).
        - **EXISTS** pergunta se a subconsulta devolve **pelo menos uma linha**. O que vai no SELECT dela não importa, e \`SELECT 1\` é só uma convenção. EXISTS nunca dá UNKNOWN: é TRUE ou FALSE.

        Se você precisa de colunas da outra tabela no resultado (o nome da disciplina, a nota), aí é JOIN mesmo. Subconsulta com IN ou EXISTS serve para **filtrar** pela existência de um par.

        ### Anti-join: NOT EXISTS, e por que não NOT IN
        Para "alunos **sem** pagamento", a {{antijunção|anti-join}}, a tentação é negar o IN:

        \`\`\`
        SELECT nome FROM alunos
        WHERE id NOT IN (SELECT aluno_id FROM pagamentos);
        \`\`\`

        Com os nossos dados, isso devolve **zero linhas**, embora Davi não tenha pago nada. O Pix sem identificação pôs um NULL na lista, e você viu na lição anterior o que acontece: para Davi, \`4 NOT IN (1, 1, 2, 3, NULL, 5)\` termina em \`... AND 4 <> NULL\`, que é UNKNOWN. Nenhum aluno passa. Sem erro, sem aviso: o relatório de inadimplentes simplesmente sai vazio.

        NOT EXISTS não tem esse problema. Dentro dele, a linha do Pix anônimo dá \`NULL = a.id\`, UNKNOWN, e só deixa de contar como par:

        \`\`\`
        SELECT a.nome FROM alunos a
        WHERE NOT EXISTS (SELECT 1 FROM pagamentos p WHERE p.aluno_id = a.id);
        \`\`\`
      `),
      {
        type: 'table',
        head: ['Forma do anti-join', 'Com NULL na tabela de dentro', 'Observação'],
        rows: [
          ['`NOT EXISTS (... WHERE p.aluno_id = a.id)`', 'funciona', 'a forma recomendada; o PostgreSQL costuma executá-la como anti-junção (*Anti Join* no EXPLAIN)'],
          ['`LEFT JOIN ... WHERE p.id IS NULL`', 'funciona', 'o padrão da lição de JOINs; teste uma coluna que nunca é NULL num par'],
          ['`NOT IN (SELECT aluno_id ...)`', '**devolve vazio**', 'só é seguro com `WHERE aluno_id IS NOT NULL` na subconsulta ou com a coluna NOT NULL; por causa do NULL, o otimizador também tem menos liberdade com ele'],
        ],
      },
      warn(`
        Esse bug passa em todos os testes feitos com dados "limpos". Ele aparece no dia em que entra a primeira linha com NULL na coluna da subconsulta, às vezes meses depois do deploy. Use NOT EXISTS por padrão; a página *Don't Do This*, na wiki do PostgreSQL, recomenda o mesmo.
      `, 'Por que o NOT IN é perigoso'),
      md(`
        ### Tabelas derivadas e WITH: agregar antes de juntar
        Agora o relatório financeiro: para cada aluno, os créditos cursados e o total pago. Juntando tudo de uma vez:

        \`\`\`
        SELECT a.nome, SUM(d.creditos) AS creditos, SUM(p.valor) AS pago
        FROM alunos a
        LEFT JOIN matriculas m  ON m.aluno_id = a.id
        LEFT JOIN disciplinas d ON d.id = m.disciplina_id
        LEFT JOIN pagamentos p  ON p.aluno_id = a.id
        GROUP BY a.id, a.nome;
        \`\`\`

        Ana aparece com 32 créditos e R$ 2.700 pagos; o certo é 16 créditos e R$ 900. Ela tem 3 matrículas e 2 pagamentos, e o JOIN combina **cada matrícula com cada pagamento**: 3 × 2 = 6 linhas, em que cada crédito aparece 2 vezes e cada pagamento aparece 3. É a {{multiplicação de linhas|fan-out}}: sempre que você junta, a partir da mesma linha, **duas** tabelas 1:N independentes, as linhas se multiplicam, e SUM e COUNT saem inflados. Nenhum erro avisa.

        O remédio é agregar cada lado **antes** de juntar, para que cada aluno tenha no máximo uma linha de cada lado. Uma subconsulta no FROM, a {{tabela derivada|derived table}}, faz isso; o WITH dá nome a ela, e ela vira uma {{expressão de tabela comum|common table expression (CTE)}}:

        \`\`\`
        WITH cred AS (
          SELECT m.aluno_id, SUM(d.creditos) AS creditos
          FROM matriculas m JOIN disciplinas d ON d.id = m.disciplina_id
          GROUP BY m.aluno_id
        ),
        pago AS (
          SELECT aluno_id, SUM(valor) AS pago
          FROM pagamentos
          GROUP BY aluno_id
        )
        SELECT a.nome,
               COALESCE(c.creditos, 0) AS creditos,
               COALESCE(p.pago, 0)     AS pago
        FROM alunos a
        LEFT JOIN cred c ON c.aluno_id = a.id
        LEFT JOIN pago p ON p.aluno_id = a.id
        ORDER BY a.nome;
        \`\`\`

        Cada CTE tem no máximo uma linha por aluno, então os dois LEFT JOIN são, na prática, 1:1, e nada se multiplica. O COALESCE da lição anterior põe 0 para quem não tem matrícula ou pagamento. Duas subconsultas escalares correlacionadas no SELECT dariam o mesmo resultado.
      `),
      tip(`
        WITH não muda o que a consulta calcula; muda a leitura. Você dá nome a cada passo e lê de cima para baixo, como funções num programa. No PostgreSQL, desde a versão 12, uma CTE usada uma única vez (e que não é recursiva nem altera dados) é incorporada à consulta principal pelo otimizador; antes disso, ela era sempre calculada à parte, o que às vezes deixava tudo mais lento. Já a tabela derivada no FROM precisava de apelido no PostgreSQL até a versão 15: dê sempre um, que não custa nada.
      `, 'WITH ou subconsulta no FROM?'),
      deep(`
        Uma CTE pode se referir a si mesma. Com uma tabela \`prerequisitos(disciplina_id, pre_id)\`, todos os pré-requisitos, diretos e indiretos, da disciplina 7 saem assim:

        \`\`\`
        WITH RECURSIVE antes(id) AS (
          SELECT pre_id FROM prerequisitos WHERE disciplina_id = 7
          UNION
          SELECT p.pre_id FROM prerequisitos p JOIN antes ON p.disciplina_id = antes.id
        )
        SELECT d.nome FROM disciplinas d WHERE d.id IN (SELECT id FROM antes);
        \`\`\`

        A primeira parte dá os pré-requisitos diretos; a segunda é repetida, subindo um nível de cada vez, até não surgir nenhuma linha nova. É uma busca em grafo, como as que você escreveu em Python, só que em SQL. O UNION (e não UNION ALL) descarta as linhas repetidas, e por isso a recursão termina mesmo que o cadastro tenha um ciclo.
      `, 'Uma CTE que chama a si mesma'),
    ],
    exemplo: [
      md(`
        Vamos executar à mão a subconsulta correlacionada "acima da média da própria disciplina", nas 7 matrículas do banco da escola. Para cada linha de fora, a subconsulta calcula a média da disciplina daquela linha:
      `),
      {
        type: 'table',
        head: ['Linha de fora (m)', 'nota', 'Subconsulta: média da disciplina', 'nota > média?'],
        rows: [
          ['Ana, Algoritmos', '9.0', '(9.0 + 6.0) ÷ 2 = 7.5', 'TRUE: fica'],
          ['Ana, Banco de Dados', '8.5', '(8.5 + 7.0 + 5.5) ÷ 3 = 7.0', 'TRUE: fica'],
          ['Bia, Banco de Dados', '7.0', '7.0', 'FALSE'],
          ['Caio, Algoritmos', '6.0', '7.5', 'FALSE'],
          ['Caio, Redes', '8.0', '8.0 (só ele cursa)', 'FALSE'],
          ['Davi, Banco de Dados', '5.5', '7.0', 'FALSE'],
          ['Ana, Cálculo', '7.5', '7.5 (só ela cursa)', 'FALSE'],
        ],
        caption: 'Resultado: duas linhas. Numa disciplina com um aluno só, ninguém fica acima da média, porque a média é a própria nota. Logicamente, a subconsulta rodou 7 vezes, uma por linha de fora, e calculou a média de Banco de Dados três vezes.',
      },
      md(`
        O mesmo raciocínio em Python, para acompanhar passo a passo: o \`for\` é a consulta de fora, e a lista \`notas\`, refeita a cada volta, é a subconsulta.
      `),
      trace(`
        matriculas = [("Ana", "Alg", 9.0), ("Caio", "Alg", 6.0),
                      ("Ana", "BD", 8.5), ("Bia", "BD", 7.0), ("Davi", "BD", 5.5)]
        acima = []
        for aluno, disc, nota in matriculas:      # consulta de fora: uma linha por vez
            notas = [n for _, d, n in matriculas if d == disc]   # subconsulta, refeita a cada linha
            media = sum(notas) / len(notas)
            if nota > media:
                acima.append((aluno, disc, nota))
        print(acima)
      `, 'Repare que a média de BD é recalculada para Ana, Bia e Davi: é o custo do laço aninhado.'),
      md(`
        **A multiplicação de linhas, de perto.** Estas são as linhas de Ana no JOIN de alunos com matrículas, disciplinas e pagamentos, antes do GROUP BY:
      `),
      {
        type: 'table',
        head: ['Matrícula', 'Créditos', 'Pagamento', 'Valor'],
        rows: [
          ['Algoritmos', '6', '1 (Pix)', 'R$ 450,00'],
          ['Algoritmos', '6', '2 (boleto)', 'R$ 450,00'],
          ['Banco de Dados', '4', '1 (Pix)', 'R$ 450,00'],
          ['Banco de Dados', '4', '2 (boleto)', 'R$ 450,00'],
          ['Cálculo', '6', '1 (Pix)', 'R$ 450,00'],
          ['Cálculo', '6', '2 (boleto)', 'R$ 450,00'],
        ],
        caption: 'SUM dos créditos = 32, o dobro de 16: cada matrícula aparece uma vez por pagamento. SUM dos valores = R$ 2.700, o triplo de R$ 900: cada pagamento aparece uma vez por matrícula.',
      },
    ],
    codigo: [
      py(`
        import sqlite3

        con = sqlite3.connect(":memory:")
        con.executescript("""
        CREATE TABLE alunos (id INTEGER PRIMARY KEY, nome TEXT);
        CREATE TABLE disciplinas (id INTEGER PRIMARY KEY, nome TEXT, creditos INTEGER);
        CREATE TABLE matriculas (aluno_id INTEGER, disciplina_id INTEGER, nota REAL);
        CREATE TABLE pagamentos (id INTEGER PRIMARY KEY, aluno_id INTEGER, valor REAL);
        INSERT INTO alunos VALUES (1, 'Ana'), (2, 'Bia'), (3, 'Caio'), (4, 'Davi');
        INSERT INTO disciplinas VALUES (1, 'Algoritmos', 6), (2, 'Banco de Dados', 4), (4, 'Cálculo', 6);
        INSERT INTO matriculas VALUES (1, 1, 9.0), (1, 2, 8.5), (1, 4, 7.5), (2, 2, 7.0),
                                      (3, 1, 6.0), (4, 2, 5.5);
        INSERT INTO pagamentos VALUES (1, 1, 450), (2, 1, 450), (3, 2, 380), (4, 3, 450),
                                      (5, NULL, 380);
        """)

        def mostra(titulo, sql):
            print(titulo, con.execute(sql).fetchall())

        mostra("acima da média geral:", """
            SELECT aluno_id, disciplina_id, nota FROM matriculas
            WHERE nota > (SELECT AVG(nota) FROM matriculas)""")
        mostra("JOIN repete Ana:", """
            SELECT a.nome FROM alunos a
            JOIN matriculas m ON m.aluno_id = a.id
            JOIN disciplinas d ON d.id = m.disciplina_id
            WHERE d.creditos = 6""")
        mostra("EXISTS não repete:", """
            SELECT a.nome FROM alunos a
            WHERE EXISTS (SELECT 1 FROM matriculas m JOIN disciplinas d ON d.id = m.disciplina_id
                          WHERE m.aluno_id = a.id AND d.creditos = 6)""")
        mostra("NOT IN:", "SELECT nome FROM alunos WHERE id NOT IN (SELECT aluno_id FROM pagamentos)")
        mostra("NOT EXISTS:", """
            SELECT a.nome FROM alunos a
            WHERE NOT EXISTS (SELECT 1 FROM pagamentos p WHERE p.aluno_id = a.id)""")
        mostra("tudo junto (errado):", """
            SELECT a.nome, SUM(d.creditos), SUM(p.valor) FROM alunos a
            LEFT JOIN matriculas m ON m.aluno_id = a.id
            LEFT JOIN disciplinas d ON d.id = m.disciplina_id
            LEFT JOIN pagamentos p ON p.aluno_id = a.id
            GROUP BY a.id, a.nome""")
        mostra("agregando antes:", """
            WITH cred AS (
                SELECT m.aluno_id, SUM(d.creditos) AS creditos
                FROM matriculas m JOIN disciplinas d ON d.id = m.disciplina_id
                GROUP BY m.aluno_id
            ), pago AS (
                SELECT aluno_id, SUM(valor) AS pago FROM pagamentos GROUP BY aluno_id
            )
            SELECT a.nome, COALESCE(c.creditos, 0), COALESCE(p.pago, 0) FROM alunos a
            LEFT JOIN cred c ON c.aluno_id = a.id
            LEFT JOIN pago p ON p.aluno_id = a.id""")
      `, { caption: 'Troque o NOT IN por NOT IN (SELECT aluno_id FROM pagamentos WHERE aluno_id IS NOT NULL) e veja Davi aparecer. Depois apague o pagamento 5 do INSERT e rode de novo: o NOT IN original volta a funcionar, o que mostra por que o bug passa nos testes.' }),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e7-subq-1',
          kind: 'mcq',
          prompt: 'Qual consulta lista as matrículas com nota **acima da média geral** de todas as matrículas?',
          difficulty: 'facil',
          skills: ['bd-joins', 'bd-sql'],
          hints: [
            'Em que momento da execução o WHERE roda: antes ou depois das agregações?',
            'Como calcular a média "à parte" e usar o resultado como um número?',
          ],
          explanation: 'A média precisa ser calculada antes da comparação, numa subconsulta escalar, que devolve uma coluna e uma linha e vira um valor. AVG direto no WHERE é recusado, porque o WHERE roda linha a linha, antes das agregações. No HAVING, o AVG é a média de cada grupo, e não da tabela. E uma subconsulta que devolve várias linhas não pode ser usada com >: é erro no PostgreSQL, e no SQLite usa só a primeira linha, em silêncio.',
          options: [
            { text: 'SELECT * FROM matriculas WHERE nota > AVG(nota);', feedback: 'O WHERE roda linha a linha, antes de qualquer agregação, e o banco recusa a consulta: no SQLite, "misuse of aggregate function AVG()"; no PostgreSQL, "aggregate functions are not allowed in WHERE".' },
            { text: 'SELECT * FROM matriculas WHERE nota > (SELECT AVG(nota) FROM matriculas);', correct: true, feedback: 'Isso: a subconsulta escalar calcula a média uma vez, e cada linha é comparada com esse número.' },
            { text: 'SELECT nota FROM matriculas GROUP BY nota HAVING nota > AVG(nota);', feedback: 'Roda, mas o AVG do HAVING é a média de cada grupo, e cada grupo aqui reúne linhas com a mesma nota: a média do grupo é a própria nota, e nada é maior que si mesmo. Resultado vazio. O HAVING compara dentro do grupo, não com a tabela inteira.' },
            { text: 'SELECT * FROM matriculas WHERE nota > (SELECT nota FROM matriculas);', feedback: 'A subconsulta devolve todas as notas, não a média. No PostgreSQL isso é erro (mais de uma linha numa subconsulta usada como valor); no SQLite, ela vale só a primeira linha (9.0 no banco da escola), e a consulta devolve vazio sem avisar.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e7-subq-2',
          kind: 'predict',
          lang: 'python',
          prompt: 'O que este programa imprime? Os quatro primeiros números são quantidades de linhas. Atenção ao pagamento com aluno NULL.',
          difficulty: 'intermediario',
          skills: ['bd-joins'],
          hints: [
            'No JOIN, quantos pares cada aluno forma? Quem tem dois pagamentos aparece quantas vezes?',
            'IN pergunta se o id está na lista. Um aluno com dois pagamentos entra duas vezes no resultado?',
            'Quanto vale `3 NOT IN (1, 1, 2, NULL)`? E para os outros alunos?',
            'Dentro do NOT EXISTS, a linha com aluno NULL forma par com alguém?',
            'Uma subconsulta escalar que não encontra nenhuma linha vale o quê?',
          ],
          explanation: 'O JOIN devolve uma linha por par: Ana tem 2 pagamentos e Bia 1, então 3 linhas (o pagamento sem aluno não se liga a ninguém, e Caio não tem par). O IN é uma semijunção: Ana e Bia, uma vez cada, 2 linhas. O NOT IN encontra o NULL na lista: para Caio, `3 NOT IN (1, 1, 2, NULL)` é UNKNOWN, e para Ana e Bia é FALSE, então 0 linhas. O NOT EXISTS ignora a linha sem aluno (NULL = id é UNKNOWN, e ela só não conta como par) e devolve Caio: 1 linha. A última subconsulta escalar não encontra nenhum pagamento de Caio e vale NULL, que chega ao Python como None.',
          code: dedent(`
            import sqlite3

            con = sqlite3.connect(":memory:")
            con.executescript("""
            CREATE TABLE alunos (id INTEGER PRIMARY KEY, nome TEXT);
            CREATE TABLE pagamentos (aluno_id INTEGER, valor REAL);
            INSERT INTO alunos VALUES (1, 'Ana'), (2, 'Bia'), (3, 'Caio');
            INSERT INTO pagamentos VALUES (1, 450), (1, 450), (2, 380), (NULL, 380);
            """)

            def linhas(sql):
                print(len(con.execute(sql).fetchall()))

            linhas("SELECT a.nome FROM alunos a JOIN pagamentos p ON p.aluno_id = a.id")
            linhas("SELECT nome FROM alunos WHERE id IN (SELECT aluno_id FROM pagamentos)")
            linhas("SELECT nome FROM alunos WHERE id NOT IN (SELECT aluno_id FROM pagamentos)")
            linhas("SELECT a.nome FROM alunos a WHERE NOT EXISTS (SELECT 1 FROM pagamentos p WHERE p.aluno_id = a.id)")
            print(con.execute("SELECT (SELECT valor FROM pagamentos WHERE aluno_id = 3)").fetchone())
          `),
          answer: '3\n2\n0\n1\n(None,)',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e7-subq-3',
          kind: 'sql',
          prompt: 'O relatório de inadimplência usa a consulta inicial para listar os alunos **sem nenhum pagamento**, mas ele sai vazio, embora haja aluno que não pagou. Olhe a tabela `pagamentos`, descubra o motivo e corrija. Devolva só a coluna `nome`.',
          difficulty: 'intermediario',
          skills: ['bd-joins'],
          hints: [
            'Rode `SELECT * FROM pagamentos;`. Há algum aluno_id estranho?',
            'Para Davi, NOT IN vira uma série de <> ligados por AND. Quanto vale o pedaço `4 <> NULL`?',
            'Que forma de anti-join pergunta "existe algum pagamento deste aluno?" e não se abala com um NULL na tabela de dentro?',
          ],
          explanation: 'SELECT a.nome FROM alunos a WHERE NOT EXISTS (SELECT 1 FROM pagamentos p WHERE p.aluno_id = a.id); O Pix sem identificação (aluno_id NULL) põe um NULL na lista do NOT IN, e aí `id NOT IN (...)` nunca dá TRUE: para Davi, termina em `4 <> NULL`, UNKNOWN. Com NOT EXISTS, a linha anônima só não forma par com ninguém. Também servem o LEFT JOIN com `WHERE p.id IS NULL` e o NOT IN com `WHERE aluno_id IS NOT NULL` dentro da subconsulta, mas este último depende de alguém lembrar do filtro em toda consulta.',
          setup: ESCOLA_PAGAMENTOS,
          starter: 'SELECT nome FROM alunos\nWHERE id NOT IN (SELECT aluno_id FROM pagamentos);',
          solution: 'SELECT a.nome FROM alunos a WHERE NOT EXISTS (SELECT 1 FROM pagamentos p WHERE p.aluno_id = a.id);',
          ordered: false,
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e7-subq-4',
          kind: 'sql',
          prompt: 'Para **cada aluno**, mostre `nome`, `creditos` (soma dos créditos das disciplinas em que está matriculado) e `pago` (soma dos pagamentos dele), com 0 onde não houver nada, em ordem de nome. A consulta inicial junta tudo de uma vez: rode-a, confira os números de Ana e de Caio contra as tabelas e corrija.',
          difficulty: 'avancado',
          skills: ['bd-joins', 'bd-sql'],
          hints: [
            'Ana tem 3 matrículas e 2 pagamentos. Antes do GROUP BY, quantas linhas dela o JOIN produz?',
            'Se cada aluno tivesse no máximo uma linha de créditos e uma linha de pagamentos, ainda haveria multiplicação?',
            'Some os créditos por aluno numa subconsulta, some os pagamentos por aluno em outra (com WITH ou no FROM) e só então junte com alunos.',
            'Quem não tem matrícula ou pagamento fica com NULL depois do LEFT JOIN. Como trocar por 0?',
          ],
          explanation: 'WITH cred AS (SELECT m.aluno_id, SUM(d.creditos) AS creditos FROM matriculas m JOIN disciplinas d ON d.id = m.disciplina_id GROUP BY m.aluno_id), pago AS (SELECT aluno_id, SUM(valor) AS pago FROM pagamentos GROUP BY aluno_id) SELECT a.nome, COALESCE(c.creditos, 0) AS creditos, COALESCE(p.pago, 0) AS pago FROM alunos a LEFT JOIN cred c ON c.aluno_id = a.id LEFT JOIN pago p ON p.aluno_id = a.id ORDER BY a.nome; Juntando as duas tabelas 1:N de uma vez, cada matrícula se combina com cada pagamento: Ana fica com 3 × 2 = 6 linhas (32 créditos e R$ 2.700), e Caio, com 2 matrículas e 1 pagamento, com 2 linhas (R$ 900 em vez de R$ 450). Agregando antes, cada lado tem no máximo uma linha por aluno, e nada se multiplica. Subconsultas escalares correlacionadas no SELECT também resolvem.',
          setup: ESCOLA_PAGAMENTOS,
          starter: 'SELECT a.nome, COALESCE(SUM(d.creditos), 0) AS creditos, COALESCE(SUM(p.valor), 0) AS pago\nFROM alunos a\nLEFT JOIN matriculas m ON m.aluno_id = a.id\nLEFT JOIN disciplinas d ON d.id = m.disciplina_id\nLEFT JOIN pagamentos p ON p.aluno_id = a.id\nGROUP BY a.id, a.nome\nORDER BY a.nome;',
          solution: 'WITH cred AS (SELECT m.aluno_id, SUM(d.creditos) AS creditos FROM matriculas m JOIN disciplinas d ON d.id = m.disciplina_id GROUP BY m.aluno_id), pago AS (SELECT aluno_id, SUM(valor) AS pago FROM pagamentos GROUP BY aluno_id) SELECT a.nome, COALESCE(c.creditos, 0) AS creditos, COALESCE(p.pago, 0) AS pago FROM alunos a LEFT JOIN cred c ON c.aluno_id = a.id LEFT JOIN pago p ON p.aluno_id = a.id ORDER BY a.nome;',
          ordered: true,
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e7-subq-5',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Por baixo de um IN ou de um EXISTS, o banco não precisa comparar cada aluno com cada pagamento. O PostgreSQL, por exemplo, costuma montar uma tabela hash com as chaves da tabela de dentro (*Hash Semi Join* e *Hash Anti Join* no EXPLAIN) e consultá-la uma vez para cada linha de fora: O(n + m), em vez de O(n · m).

            Faça o mesmo em Python puro. \`alunos\` é uma lista de tuplas \`(id, nome)\`, com ids distintos (nomes podem se repetir); \`pagamentos\` é uma lista de tuplas \`(id, aluno_id, valor)\`, em que \`aluno_id\` pode ser \`None\` (Pix não identificado) ou um id que não está em \`alunos\`.

            - \`com_pagamento(alunos, pagamentos)\`: os nomes dos alunos com **pelo menos um** pagamento, como num \`WHERE EXISTS\`: cada aluno uma vez, na ordem de \`alunos\`.
            - \`sem_pagamento(alunos, pagamentos)\`: os nomes dos alunos **sem nenhum** pagamento, como num \`WHERE NOT EXISTS\`: um pagamento sem aluno não é de ninguém e não pode esconder ninguém.

            Meta: O(n + m).
          `),
          difficulty: 'intermediario',
          skills: ['bd-joins', 'ed-hash'],
          hints: [
            'Para decidir sobre um aluno, você precisa da lista inteira de pagamentos, ou só de saber se o id dele aparece lá?',
            'Que estrutura do nível 3 responde "este valor está aqui?" em O(1), em média?',
            'Ana com dois pagamentos aparece quantas vezes? E duas alunas diferentes chamadas Ana: o que identifica um aluno, o nome ou o id?',
            'Um None entre as chaves atrapalha a busca de um id inteiro num conjunto do Python?',
          ],
          explanation: 'Monte uma vez o conjunto dos aluno_id dos pagamentos, em O(m), e percorra os alunos testando `id in pagantes`, O(1) em média por aluno: O(n + m) no total. Percorrer a lista de alunos, e não a de pagamentos, garante cada aluno uma vez e na ordem certa, mesmo com vários pagamentos. Testar pelo id mantém duas Anas diferentes como dois alunos e não deixa a Ana que pagou esconder a Ana que não pagou (é o mesmo problema do DISTINCT por nome). O None no conjunto não atrapalha: nenhum id é None, então ele nunca é encontrado. Esse é o comportamento do NOT EXISTS; o NOT IN do SQL, com o NULL no meio, devolveria a lista vazia. Comparar cada aluno com cada pagamento, ou procurar o id numa lista (o `in` de lista percorre a lista inteira), custa O(n · m).',
          starter: dedent(`
            def com_pagamento(alunos, pagamentos):
                # alunos: lista de (id, nome); pagamentos: lista de (id, aluno_id, valor)
                # devolva os nomes de quem tem pelo menos um pagamento,
                # cada aluno uma vez, na ordem da lista alunos
                pass

            def sem_pagamento(alunos, pagamentos):
                # devolva os nomes de quem não tem nenhum pagamento (como NOT EXISTS)
                pass
          `),
          solution: dedent(`
            def com_pagamento(alunos, pagamentos):
                pagantes = {aluno_id for _, aluno_id, _ in pagamentos}
                return [nome for id_, nome in alunos if id_ in pagantes]

            def sem_pagamento(alunos, pagamentos):
                pagantes = {aluno_id for _, aluno_id, _ in pagamentos}
                return [nome for id_, nome in alunos if id_ not in pagantes]
          `),
          tests: [
            {
              name: 'banco da lição',
              code: dedent(`
                _alunos = [(1, "Ana"), (2, "Bia"), (3, "Caio"), (4, "Davi"), (5, "Eva")]
                _pags = [(1, 1, 450.0), (2, 1, 450.0), (3, 2, 380.0), (4, 3, 450.0), (5, None, 380.0), (6, 5, 450.0)]
                r = com_pagamento(_alunos, _pags)
                assert r == ["Ana", "Bia", "Caio", "Eva"], f"com_pagamento deu {r!r}, esperado ['Ana', 'Bia', 'Caio', 'Eva']: cada aluno aparece uma vez, na ordem da lista de alunos, mesmo com vários pagamentos"
                r = sem_pagamento(_alunos, _pags)
                assert r == ["Davi"], f"sem_pagamento deu {r!r}, esperado ['Davi']: o Pix sem aluno (aluno_id None) não é de ninguém e não pode esconder ninguém, como no NOT EXISTS"
              `),
            },
            {
              name: 'nomes repetidos',
              code: dedent(`
                _alunos = [(1, "Ana"), (2, "Ana"), (3, "Bia")]
                r = sem_pagamento(_alunos, [(1, 2, 10.0)])
                assert r == ["Ana", "Bia"], f"sem_pagamento deu {r!r}, esperado ['Ana', 'Bia']: só a Ana de id 2 pagou; a de id 1 não. Identifique o aluno pelo id, não pelo nome"
                r = com_pagamento(_alunos, [(1, 1, 10.0), (2, 2, 10.0)])
                assert r == ["Ana", "Ana"], f"com_pagamento deu {r!r}, esperado ['Ana', 'Ana']: são duas alunas diferentes com o mesmo nome, e as duas pagaram"
              `),
            },
            {
              name: 'bordas',
              code: dedent(`
                assert com_pagamento([], [(1, 1, 5.0)]) == [], "sem alunos, com_pagamento devolve a lista vazia"
                assert sem_pagamento([], []) == [], "sem alunos, sem_pagamento devolve a lista vazia"
                _alunos = [(7, "Gil"), (8, "Hugo")]
                r = com_pagamento(_alunos, [])
                assert r == [], f"sem pagamentos, ninguém pagou; veio {r!r}"
                r = sem_pagamento(_alunos, [])
                assert r == ["Gil", "Hugo"], f"sem pagamentos, todos estão sem pagamento; veio {r!r}"
                r = sem_pagamento(_alunos, [(1, None, 1.0), (2, 99, 1.0)])
                assert r == ["Gil", "Hugo"], f"pagamento sem aluno ou de um aluno que não está na lista não esconde ninguém; veio {r!r}"
                r = com_pagamento(_alunos, [(1, None, 1.0), (2, 99, 1.0), (3, 8, 2.0)])
                assert r == ["Hugo"], f"esperado ['Hugo'], veio {r!r}"
              `),
            },
            {
              name: 'casos aleatórios',
              code: dedent(`
                import random
                random.seed(5)
                for _ in range(300):
                    ids = random.sample(range(1, 20), random.randint(0, 8))
                    _alunos = [(i, random.choice(["Ana", "Bia", "Caio"])) for i in ids]
                    _pags = [(k, random.choice(ids + [None, 99]), 1.0) for k in range(random.randint(0, 10))]
                    chaves = [p[1] for p in _pags]
                    esp_com = [nm for i, nm in _alunos if i in chaves]
                    esp_sem = [nm for i, nm in _alunos if i not in chaves]
                    r = com_pagamento(_alunos, _pags)
                    assert r == esp_com, f"com_pagamento({_alunos}, {_pags}) deu {r!r}, esperado {esp_com!r}"
                    r = sem_pagamento(_alunos, _pags)
                    assert r == esp_sem, f"sem_pagamento({_alunos}, {_pags}) deu {r!r}, esperado {esp_sem!r}"
              `),
            },
            {
              name: '3 000 alunos e 3 000 pagamentos',
              code: dedent(`
                import random

                class _Demais(BaseException):
                    pass

                class _Id(int):
                    """Id de aluno que conta as comparações de igualdade feitas com ele."""
                    comparacoes = 0
                    def __eq__(self, outro):
                        _Id.comparacoes += 1
                        if _Id.comparacoes > 100_000:
                            raise _Demais()
                        return int.__eq__(self, outro)
                    def __ne__(self, outro):
                        r = self.__eq__(outro)
                        return r if r is NotImplemented else not r
                    __hash__ = int.__hash__

                random.seed(11)
                n = 3000
                _alunos = [(_Id(i), f"aluno{i}") for i in range(n)]
                _pags = [(k, _Id(random.randrange(2 * n)), 10.0) for k in range(n)]
                _pags.append((n, None, 5.0))
                _Id.comparacoes = 0
                try:
                    r1 = com_pagamento(_alunos, _pags)
                    r2 = sem_pagamento(_alunos, _pags)
                except _Demais:
                    raise AssertionError("com 3 000 alunos e 3 000 pagamentos, suas funções passaram de 100 000 comparações entre ids: isso é comparar cada aluno com cada pagamento (ou procurar numa lista), O(n · m). Que estrutura responde 'este id está entre os pagantes?' sem percorrer tudo?")
                _Id.comparacoes = -10 ** 9
                pagantes = {int(p[1]) for p in _pags if p[1] is not None}
                assert r1 == [nm for i, nm in _alunos if int(i) in pagantes], "com_pagamento errou no teste com 3 000 alunos"
                assert r2 == [nm for i, nm in _alunos if int(i) not in pagantes], "sem_pagamento errou no teste com 3 000 alunos"
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
          id: 'e7-subq-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            A escola vai premiar o destaque de cada disciplina. Escreva \`destaques(con)\`, que recebe uma conexão \`sqlite3\` com as tabelas \`alunos\`, \`disciplinas\` e \`matriculas\` e devolve uma lista de tuplas \`(disciplina, aluno, nota)\`: para cada disciplina, o aluno com a **maior nota lançada** nela. Regras:

            - em empate no topo, **todos** os empatados aparecem;
            - nota NULL (não lançada) não concorre, e uma disciplina sem nenhuma nota lançada não aparece;
            - ordene por nome da disciplina e depois por nome do aluno (os nomes são únicos).

            Resolva com **uma** consulta SQL, usando uma subconsulta. Os testes rodam sua função em vários bancos.
          `),
          difficulty: 'desafio',
          skills: ['bd-joins', 'bd-sql'],
          hints: [
            'Para decidir se uma matrícula é destaque, que número você precisa conhecer? Ele depende de qual coluna da própria linha?',
            'Esse número é a maior nota da disciplina daquela linha. Que tipo de subconsulta usa uma coluna da consulta de fora?',
            'Imagine dois alunos empatados no topo. Um GROUP BY por disciplina devolve quantas linhas para ela?',
            'E uma matrícula com nota NULL: quanto vale a sua condição para ela? Lembre que MAX ignora NULL, mas uma comparação com NULL dá UNKNOWN; e um NOT EXISTS sobre "alguém com nota maior"?',
          ],
          explanation: 'SELECT d.nome, a.nome, m.nota FROM matriculas m JOIN alunos a ON a.id = m.aluno_id JOIN disciplinas d ON d.id = m.disciplina_id WHERE m.nota = (SELECT MAX(m2.nota) FROM matriculas m2 WHERE m2.disciplina_id = m.disciplina_id) ORDER BY d.nome, a.nome. A subconsulta correlacionada calcula a maior nota da disciplina de cada linha, e todas as linhas com essa nota ficam, o que inclui os empates. O NULL se resolve sozinho: MAX ignora as notas NULL, `NULL = máximo` dá UNKNOWN e a linha sai, e numa disciplina só com pendentes o MAX é NULL e nada passa. Uma tabela derivada com o MAX por disciplina, juntada por disciplina e nota, também resolve. Duas tentativas comuns falham: `SELECT d.nome, a.nome, MAX(m.nota) ... GROUP BY d.id` roda no SQLite (ele pega o nome de uma das linhas com o máximo), mas devolve um aluno só por disciplina, mesmo com empate, e no PostgreSQL nem roda; e `WHERE NOT EXISTS (SELECT 1 ... WHERE m2.disciplina_id = m.disciplina_id AND m2.nota > m.nota)` premia as notas NULL, porque `m2.nota > NULL` nunca é TRUE e o NOT EXISTS vira TRUE (só funciona acrescentando `m.nota IS NOT NULL`).',
          starter: dedent(`
            import sqlite3

            def destaques(con):
                # Para cada disciplina, o(s) aluno(s) com a maior nota lançada.
                # Devolva uma lista de tuplas (disciplina, aluno, nota),
                # em ordem de disciplina e depois de aluno.
                sql = """
                    SELECT d.nome, a.nome, m.nota
                    FROM matriculas m
                    JOIN alunos a ON a.id = m.aluno_id
                    JOIN disciplinas d ON d.id = m.disciplina_id
                    ORDER BY d.nome, a.nome
                """
                return con.execute(sql).fetchall()
          `),
          solution: dedent(`
            import sqlite3

            def destaques(con):
                sql = """
                    SELECT d.nome, a.nome, m.nota
                    FROM matriculas m
                    JOIN alunos a ON a.id = m.aluno_id
                    JOIN disciplinas d ON d.id = m.disciplina_id
                    WHERE m.nota = (SELECT MAX(m2.nota)
                                    FROM matriculas m2
                                    WHERE m2.disciplina_id = m.disciplina_id)
                    ORDER BY d.nome, a.nome
                """
                return con.execute(sql).fetchall()
          `),
          tests: [
            {
              name: 'banco da escola',
              code: DESTAQUES_TESTE + '\n' + dedent(`
                r = _linhas(destaques(_banco(_ESCOLA_ALUNOS, _ESCOLA_DISCIPLINAS, _ESCOLA_MATRICULAS)))
                esperado = [("Algoritmos", "Ana", 9.0), ("Banco de Dados", "Ana", 8.5), ("Cálculo", "Ana", 7.5), ("Redes", "Caio", 8.0)]
                assert r == esperado, f"veio {r!r}, esperado {esperado!r}. O destaque é o maior de cada disciplina, e não o maior da escola"
              `),
            },
            {
              name: 'empate no topo',
              code: DESTAQUES_TESTE + '\n' + dedent(`
                _con = _banco([(1, "Rui"), (2, "Lia"), (3, "Ivo"), (4, "Gal")],
                              [(1, "Redes"), (2, "Grafos")],
                              [(1, 1, 9.0), (2, 1, 9.0), (3, 1, 7.0), (4, 2, 6.0), (3, 2, 8.5), (1, 2, 8.5)])
                r = _linhas(destaques(_con))
                esperado = [("Grafos", "Ivo", 8.5), ("Grafos", "Rui", 8.5), ("Redes", "Lia", 9.0), ("Redes", "Rui", 9.0)]
                assert r == esperado, f"veio {r!r}, esperado {esperado!r}. Em empate, todos os empatados aparecem: agrupar por disciplina devolve uma linha só por grupo"
              `),
            },
            {
              name: 'notas pendentes',
              code: DESTAQUES_TESTE + '\n' + dedent(`
                _con = _banco([(1, "Rui"), (2, "Lia"), (3, "Ivo")],
                              [(1, "Redes"), (2, "Grafos"), (3, "Compiladores")],
                              [(1, 1, None), (2, 1, 7.0), (3, 1, None), (1, 2, None), (2, 2, None), (3, 3, 6.0)])
                r = _linhas(destaques(_con))
                esperado = [("Compiladores", "Ivo", 6.0), ("Redes", "Lia", 7.0)]
                assert r == esperado, f"veio {r!r}, esperado {esperado!r}. Nota NULL não concorre, e Grafos, só com notas pendentes, não tem destaque. Se apareceram linhas com None, pense no que a sua condição dá quando m.nota é NULL"
              `),
            },
            {
              name: 'sem matrículas',
              code: DESTAQUES_TESTE + '\n' + dedent(`
                r = _linhas(destaques(_banco([(1, "Rui")], [(1, "Redes")], [])))
                assert r == [], f"sem matrículas, não há destaques; veio {r!r}"
              `),
            },
            {
              name: 'bancos aleatórios',
              code: DESTAQUES_TESTE + '\n' + dedent(`
                import random
                random.seed(33)
                _nomes_d = ["Algoritmos", "Redes", "Banco", "Compiladores", "Grafos"]
                _nomes_a = ["Ana", "Bia", "Caio", "Davi", "Eva", "Gil"]
                for rodada in range(150):
                    disciplinas = list(zip(range(1, 6), random.sample(_nomes_d, 5)))[: random.randint(0, 5)]
                    alunos = list(zip(range(1, 7), random.sample(_nomes_a, 6)))
                    matriculas = []
                    for a, _ in alunos:
                        for d, _ in disciplinas:
                            if random.random() < 0.5:
                                matriculas.append((a, d, random.choice([None, 6.0, 7.0, 8.0, 8.0, 9.0])))
                    random.shuffle(matriculas)
                    r = _linhas(destaques(_banco(alunos, disciplinas, matriculas)))
                    esperado = _ref_destaques(alunos, disciplinas, matriculas)
                    assert r == esperado, f"banco aleatório {rodada}: veio {r!r}, esperado {esperado!r} (alunos {alunos}, disciplinas {disciplinas}, matrículas {matriculas})"
              `),
            },
          ],
        },
      },
    ],
    projeto: [
      md(`
        **Sistema de cadastro (parte 5, relatórios)**: acrescente três relatórios com subconsultas, cada um com teste num banco \`:memory:\`: (1) alunos com alguma nota abaixo da média da própria disciplina (subconsulta correlacionada); (2) disciplinas sem nenhum aluno matriculado (NOT EXISTS); (3) o destaque de cada disciplina, com empates. Em cada teste, insira uma linha com NULL na coluna usada pela subconsulta e confirme que o resultado continua certo.
      `),
      { type: 'project', projectId: 'p3-cadastro' },
    ],
    revisao: [
      md(`
        - Subconsulta escalar: uma coluna, no máximo uma linha; sem linha, vale NULL. Com várias, é erro no PostgreSQL, e o SQLite usa a primeira, em silêncio.
        - Agregação não vai no WHERE: calcule-a numa subconsulta.
        - Subconsulta correlacionada: usa uma coluna de fora e, logicamente, é refeita para cada linha de fora (um laço aninhado). Um índice na coluna da ligação ajuda.
        - JOIN devolve uma linha por par; para filtrar pela existência de um par, sem repetir, use IN ou EXISTS (semijunção).
        - Anti-join: NOT EXISTS por padrão. NOT IN com um NULL na subconsulta devolve vazio.
        - Juntar duas tabelas 1:N independentes multiplica as linhas (fan-out): agregue cada lado antes, numa tabela derivada ou num WITH.
        - WITH dá nome aos passos; WITH RECURSIVE percorre hierarquias.
      `),
      english(`
        - **subquery / nested query**: subconsulta
        - **scalar subquery**: subconsulta escalar
        - **correlated subquery**: subconsulta correlacionada
        - **semi-join / anti-join**: semijunção / antijunção
        - **derived table, CTE (WITH clause)**: tabela derivada, expressão de tabela comum
        - **fan-out**: multiplicação de linhas num JOIN

        Frase típica de entrevista: *"I'd use NOT EXISTS rather than NOT IN here: if the subquery ever returns a NULL, NOT IN can never be true, and the query silently returns no rows."*

        Frase da documentação do PostgreSQL sobre NOT IN: *"Note that if the left-hand expression yields null, or if there are no equal right-hand values and at least one right-hand row yields null, the result of the NOT IN construct will be null, not true."*
      `),
    ],
  },
  review: [
    ['Por que `WHERE nota > AVG(nota)` não funciona, e como resolver?', 'O WHERE roda linha a linha, antes das agregações. Calcule a média numa subconsulta escalar: `WHERE nota > (SELECT AVG(nota) FROM matriculas)`.'],
    ['Quanto vale uma subconsulta escalar sem nenhuma linha? E uma com várias?', 'Sem linhas, NULL. Com várias, é erro no PostgreSQL; o SQLite usa a primeira linha, sem avisar.'],
    ['O que torna uma subconsulta correlacionada, e qual é o significado dela?', 'Ela usa uma coluna da consulta de fora. Logicamente, é refeita para cada linha de fora, como um laço aninhado.'],
    ['Por que filtrar com JOIN pode repetir linhas, e o que usar no lugar?', 'O JOIN devolve uma linha por par, e quem tem vários pares aparece várias vezes. Para filtrar pela existência de um par, use IN ou EXISTS (semijunção): cada linha aparece uma vez.'],
    ['Por que `id NOT IN (SELECT aluno_id FROM pagamentos)` pode devolver zero linhas?', 'Se a subconsulta trouxer um NULL, cada `id <> NULL` é UNKNOWN, e o NOT IN nunca chega a TRUE.'],
    ['Qual é a forma recomendada de anti-join, e por quê?', 'NOT EXISTS com a condição de ligação: um NULL na tabela de dentro não o afeta, e o otimizador sabe executá-lo como anti-junção.'],
    ['O que é fan-out num JOIN, e como evitá-lo?', 'Juntar duas tabelas 1:N independentes combina cada linha de uma com cada linha da outra e infla SUM e COUNT. Agregue cada lado antes (tabela derivada ou WITH) e junte depois.'],
    ['Para que serve o WITH?', 'Para dar nome a subconsultas (CTEs) e ler a consulta em passos, de cima para baixo. WITH RECURSIVE percorre hierarquias, como cadeias de pré-requisitos.'],
  ],
  references: ['postgres-docs', 'sqlite-docs', 'cmu-15445'],
});

export const lessons: Lesson[] = [nulos, subconsultas];
