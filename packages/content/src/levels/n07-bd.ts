import type { Level } from '../types.ts';
import { code, dedent, deep, english, info, lesson, md, py, t, warn } from '../helpers.ts';
import { nosql } from './aprofundamento-a.ts';
import { SETUP_ESCOLA } from '../sql-setup.ts';

export { SETUP_ESCOLA };

const sql = lesson({
  id: 'l7-sql',
  moduleId: 'm7-1',
  title: 'Modelo relacional e SQL',
  titleEn: 'The relational model and SQL',
  summary: 'Tabelas, chaves, SELECT, WHERE, ORDER BY, agregações e GROUP BY.',
  minutes: 40,
  objectives: ['Explicar tabelas, linhas, colunas, chave primária e estrangeira', 'Escrever consultas com SELECT, WHERE, ORDER BY e LIMIT', 'Agregar com COUNT, AVG, SUM e GROUP BY/HAVING', 'Inserir, atualizar e remover dados com segurança'],
  skills: ['bd-sql'],
  terms: [
    t('banco de dados', 'database', 'Coleção organizada de dados gerenciada por um SGBD.'),
    t('tabela', 'table / relation', 'Conjunto de linhas com as mesmas colunas.'),
    t('chave primária', 'primary key', 'Coluna(s) que identificam unicamente cada linha.'),
    t('chave estrangeira', 'foreign key', 'Coluna que referencia a chave primária de outra tabela.'),
    t('consulta', 'query', 'Pedido de dados ao banco, em SQL.'),
    t('agregação', 'aggregation', 'Resumir várias linhas em um valor: COUNT, AVG, SUM.'),
  ],
  stages: {
    conceito: [md('Um **banco de dados relacional** guarda dados em **tabelas** (relações). Cada linha é um registro, cada coluna um atributo. **SQL** é a linguagem declarativa para consultar: você diz **o que** quer, e o SGBD (PostgreSQL, MySQL, SQLite...) decide **como** buscar.')],
    explicacao: [
      md(`
        Neste nível usamos um pequeno banco de uma escola (SQLite, rodando no seu navegador):

        - \`alunos(id, nome, curso, ano)\`
        - \`disciplinas(id, nome, creditos)\`
        - \`matriculas(aluno_id, disciplina_id, nota)\` — liga alunos a disciplinas (**chaves estrangeiras**).

        A ordem **lógica** de uma consulta é diferente da ordem em que se escreve:
      `),
      { type: 'table', head: ['Escreve-se', 'É avaliado na ordem'], rows: [
        ['SELECT colunas', '5. escolhe as colunas'],
        ['FROM tabela', '1. de qual tabela'],
        ['WHERE condição', '2. filtra linhas'],
        ['GROUP BY coluna', '3. agrupa'],
        ['HAVING condição', '4. filtra grupos'],
        ['ORDER BY coluna', '6. ordena'],
        ['LIMIT n', '7. limita'],
      ] },
      warn('`UPDATE` e `DELETE` sem `WHERE` afetam **todas** as linhas. Em produção, escreva primeiro o `SELECT` com o mesmo WHERE para ver o que será afetado, e use transações.'),
    ],
    exemplo: [code('sql', `
      SELECT curso, COUNT(*) AS qtd, AVG(ano) AS ano_medio
      FROM alunos
      WHERE ano >= 1
      GROUP BY curso
      HAVING COUNT(*) >= 1
      ORDER BY qtd DESC;
    `, 'Quantos alunos por curso, do maior para o menor.')],
    codigo: [md('Python acessa bancos com o módulo `sqlite3`. Repare no `?`: **nunca** monte SQL concatenando strings do usuário (SQL injection, Nível 11).'), py(`
      import sqlite3
      con = sqlite3.connect(":memory:")
      con.executescript("""
      CREATE TABLE alunos (id INTEGER PRIMARY KEY, nome TEXT, curso TEXT);
      INSERT INTO alunos (nome, curso) VALUES ('Ana', 'CC'), ('Bia', 'SI'), ('Caio', 'CC');
      """)
      curso = "CC"
      for linha in con.execute("SELECT id, nome FROM alunos WHERE curso = ? ORDER BY nome", (curso,)):
          print(linha)
    `)],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e7-sql-1',
          kind: 'sql',
          prompt: 'Liste o **nome** dos alunos do curso **CC**, em ordem alfabética.',
          difficulty: 'facil',
          skills: ['bd-sql'],
          hints: ['Você precisa de SELECT, FROM, WHERE e ORDER BY.', "Textos em SQL ficam entre aspas simples: 'CC'."],
          explanation: "SELECT nome FROM alunos WHERE curso = 'CC' ORDER BY nome;",
          setup: SETUP_ESCOLA,
          starter: 'SELECT * FROM alunos;',
          solution: "SELECT nome FROM alunos WHERE curso = 'CC' ORDER BY nome;",
          ordered: true,
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e7-sql-2',
          kind: 'sql',
          prompt: 'Mostre cada **curso** e a **quantidade de alunos** nele (colunas: curso, qtd), do curso com mais alunos para o com menos; em empate, em ordem alfabética de curso.',
          difficulty: 'intermediario',
          skills: ['bd-sql'],
          hints: ['Agrupe por curso com GROUP BY.', 'COUNT(*) conta as linhas de cada grupo. Ordene por essa contagem, DESC.'],
          explanation: 'SELECT curso, COUNT(*) AS qtd FROM alunos GROUP BY curso ORDER BY qtd DESC, curso; — o segundo critério de ORDER BY desempata.',
          setup: SETUP_ESCOLA,
          starter: 'SELECT curso FROM alunos;',
          solution: 'SELECT curso, COUNT(*) AS qtd FROM alunos GROUP BY curso ORDER BY qtd DESC, curso;',
          ordered: true,
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e7-sql-3',
          kind: 'mcq',
          prompt: 'Qual a diferença entre WHERE e HAVING?',
          difficulty: 'intermediario',
          skills: ['bd-sql'],
          hints: ['Reveja a ordem lógica de avaliação.'],
          explanation: 'WHERE filtra linhas antes do agrupamento; HAVING filtra grupos depois (por isso pode usar agregações como COUNT).',
          options: [
            { text: 'São sinônimos', feedback: 'Atuam em momentos diferentes da consulta.' },
            { text: 'WHERE filtra linhas antes de agrupar; HAVING filtra grupos depois', correct: true, feedback: 'Isso.' },
            { text: 'HAVING é mais rápido', feedback: 'Não é questão de desempenho, e sim de semântica.' },
            { text: 'WHERE só funciona com números', feedback: 'WHERE funciona com qualquer tipo.' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e7-sql-desafio',
          kind: 'sql',
          prompt: 'Para cada disciplina **com pelo menos 2 matrículas**, mostre `disciplina_id` e a **média das notas** (coluna `media`, arredondada a 2 casas), da maior média para a menor.',
          difficulty: 'avancado',
          skills: ['bd-sql'],
          hints: ['A tabela é matriculas. Agrupe por disciplina_id.', 'Filtro sobre grupos usa HAVING COUNT(*) >= 2.', 'ROUND(AVG(nota), 2).'],
          explanation: 'SELECT disciplina_id, ROUND(AVG(nota), 2) AS media FROM matriculas GROUP BY disciplina_id HAVING COUNT(*) >= 2 ORDER BY media DESC;',
          setup: SETUP_ESCOLA,
          starter: 'SELECT * FROM matriculas;',
          solution: 'SELECT disciplina_id, ROUND(AVG(nota), 2) AS media FROM matriculas GROUP BY disciplina_id HAVING COUNT(*) >= 2 ORDER BY media DESC;',
          ordered: true,
        },
      },
    ],
    projeto: [md('**Sistema de cadastro (parte 4)**: troque o armazenamento JSON por SQLite. Crie as tabelas, use consultas parametrizadas (`?`) e mantenha a mesma interface de antes — se o código estava bem separado em camadas, só o módulo de armazenamento muda.'), { type: 'project', projectId: 'p3-cadastro' }],
    revisao: [md('- Tabelas, linhas, colunas; chaves primária e estrangeira.\n- Ordem lógica: FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT.\n- Agregações: COUNT, SUM, AVG, MIN, MAX.\n- Consultas parametrizadas, sempre.')],
  },
  review: [
    ['O que é uma chave estrangeira?', 'Coluna que referencia a chave primária de outra tabela, criando um relacionamento.'],
    ['WHERE × HAVING?', 'WHERE filtra linhas antes do GROUP BY; HAVING filtra grupos depois.'],
    ['Por que usar `?` em consultas no Python?', 'Para passar valores como parâmetros e evitar SQL injection.'],
  ],
  references: ['postgres-docs', 'sqlite-docs', 'cmu-15445'],
});

const joins = lesson({
  id: 'l7-joins',
  moduleId: 'm7-2',
  title: 'Relacionamentos e JOINs',
  titleEn: 'Relationships and JOINs',
  summary: 'Um-para-muitos, muitos-para-muitos, INNER e LEFT JOIN.',
  minutes: 35,
  objectives: ['Modelar relacionamentos 1:N e N:N', 'Combinar tabelas com INNER JOIN e LEFT JOIN', 'Encontrar registros sem correspondência'],
  skills: ['bd-joins'],
  terms: [
    t('junção', 'join', 'Combinar linhas de duas tabelas por uma condição.'),
    t('junção interna', 'inner join', 'Só as linhas com correspondência nos dois lados.'),
    t('junção externa à esquerda', 'left (outer) join', 'Todas as linhas da esquerda, com NULL quando não há correspondência.'),
    t('relacionamento muitos-para-muitos', 'many-to-many relationship', 'Exige uma tabela associativa (como matriculas).'),
    t('nulo', 'NULL', 'Ausência de valor. Compare com IS NULL, não com = NULL.'),
  ],
  stages: {
    conceito: [md('Dados relacionados ficam em tabelas separadas para evitar repetição. Um **JOIN** junta-as de volta numa consulta: "o nome do aluno + o nome da disciplina + a nota" combina três tabelas.')],
    explicacao: [
      md(`
        - **1:N** (um-para-muitos): um curso tem muitos alunos → \`alunos.curso_id\` referencia \`cursos.id\`.
        - **N:N** (muitos-para-muitos): alunos ↔ disciplinas → tabela associativa \`matriculas(aluno_id, disciplina_id, nota)\`.

        \`\`\`
        SELECT a.nome, d.nome AS disciplina, m.nota
        FROM matriculas m
        JOIN alunos a      ON a.id = m.aluno_id
        JOIN disciplinas d ON d.id = m.disciplina_id;
        \`\`\`

        **INNER JOIN** (ou só \`JOIN\`) descarta quem não tem par. **LEFT JOIN** mantém todos da tabela da esquerda; as colunas da direita viram \`NULL\` quando não há par — perfeito para "quem **não** tem...".
      `),
      warn('Em SQL, `NULL = NULL` não é verdadeiro (é desconhecido). Use `IS NULL` / `IS NOT NULL`.'),
    ],
    exemplo: [{ type: 'viz', viz: 'sql-join', caption: 'Compare INNER e LEFT JOIN entre alunos e matrículas: veja quais linhas aparecem e onde surge NULL.' }],
    codigo: [code('sql', `
      -- alunos que não estão matriculados em nada
      SELECT a.nome
      FROM alunos a
      LEFT JOIN matriculas m ON m.aluno_id = a.id
      WHERE m.aluno_id IS NULL;
    `)],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e7-join-0',
          kind: 'mcq',
          prompt: "Qual JOIN devolve **somente** as linhas que têm correspondência nas duas tabelas?",
          difficulty: 'facil',
          skills: ["bd-joins"],
          hints: ["Pense na interseção de dois conjuntos."],
          explanation: "INNER JOIN (ou só JOIN) mantém apenas os pares que satisfazem a condição. LEFT JOIN mantém também as linhas da esquerda sem par, com NULL.",
          options: [
            { text: "INNER JOIN", correct: true, feedback: "Isso: só as correspondências." },
            { text: "LEFT JOIN", feedback: "LEFT JOIN também traz as linhas da esquerda sem par." },
            { text: "FULL OUTER JOIN", feedback: "Esse traz tudo dos dois lados." },
            { text: "CROSS JOIN", feedback: "CROSS JOIN combina todas as linhas com todas, sem condição." },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e7-join-1',
          kind: 'sql',
          prompt: 'Liste `nome` do aluno, `disciplina` (nome da disciplina) e `nota` de todas as matrículas, ordenado por nome do aluno e depois por disciplina.',
          difficulty: 'intermediario',
          skills: ['bd-joins'],
          hints: ['Comece de matriculas e faça JOIN com alunos e com disciplinas.', 'Use apelidos (m, a, d) e `d.nome AS disciplina`.'],
          explanation: 'Dois JOINs a partir da tabela associativa recuperam os nomes das duas pontas do relacionamento N:N.',
          setup: SETUP_ESCOLA,
          starter: 'SELECT * FROM matriculas;',
          solution: 'SELECT a.nome, d.nome AS disciplina, m.nota FROM matriculas m JOIN alunos a ON a.id = m.aluno_id JOIN disciplinas d ON d.id = m.disciplina_id ORDER BY a.nome, d.nome;',
          ordered: true,
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e7-join-2',
          kind: 'sql',
          prompt: 'Liste o **nome** dos alunos que **não** têm nenhuma matrícula.',
          difficulty: 'intermediario',
          skills: ['bd-joins'],
          hints: ['INNER JOIN esconderia justamente esses alunos. Qual JOIN mantém todos da esquerda?', 'Depois do LEFT JOIN, filtre onde a coluna da matrícula IS NULL.'],
          explanation: 'LEFT JOIN + WHERE ... IS NULL é o padrão "anti-join". Alternativa: WHERE id NOT IN (SELECT aluno_id FROM matriculas) — cuidado com NULLs no NOT IN.',
          setup: SETUP_ESCOLA,
          starter: 'SELECT a.nome FROM alunos a JOIN matriculas m ON m.aluno_id = a.id;',
          solution: 'SELECT a.nome FROM alunos a LEFT JOIN matriculas m ON m.aluno_id = a.id WHERE m.aluno_id IS NULL;',
          ordered: false,
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e7-join-desafio',
          kind: 'sql',
          prompt: 'Para **cada aluno** (inclusive os sem matrícula), mostre `nome` e o total de `creditos` cursados (0 se nenhum), do maior total para o menor; em empate, por nome.',
          difficulty: 'desafio',
          skills: ['bd-joins', 'bd-sql'],
          hints: ['Você precisa de alunos → matriculas → disciplinas, mantendo todos os alunos: LEFT JOIN nos dois.', 'SUM de nada é NULL: use COALESCE(SUM(d.creditos), 0).', 'Agrupe por aluno.'],
          explanation: 'LEFT JOIN em cadeia + GROUP BY + COALESCE é um padrão de relatórios. Sem COALESCE, alunos sem matrícula apareceriam com NULL.',
          setup: SETUP_ESCOLA,
          starter: 'SELECT nome FROM alunos;',
          solution: 'SELECT a.nome, COALESCE(SUM(d.creditos), 0) AS creditos FROM alunos a LEFT JOIN matriculas m ON m.aluno_id = a.id LEFT JOIN disciplinas d ON d.id = m.disciplina_id GROUP BY a.id, a.nome ORDER BY creditos DESC, a.nome;',
          ordered: true,
        },
      },
    ],
    projeto: [md('**Sistema de cadastro (parte 5)**: adicione disciplinas e matrículas (N:N) e um relatório "boletim do aluno" com JOIN. Escreva testes que usem um banco em memória (`:memory:`).'), { type: 'project', projectId: 'p3-cadastro' }],
    revisao: [md('- 1:N com chave estrangeira; N:N com tabela associativa.\n- INNER JOIN: só com par; LEFT JOIN: todos da esquerda.\n- "Quem não tem": LEFT JOIN + IS NULL.\n- COALESCE trata NULL em agregações.')],
  },
  review: [
    ['Como modelar muitos-para-muitos?', 'Com uma tabela associativa contendo as chaves estrangeiras das duas tabelas.'],
    ['INNER × LEFT JOIN?', 'INNER mantém só linhas com correspondência; LEFT mantém todas as da esquerda, com NULL quando não há par.'],
  ],
  references: ['postgres-docs', 'sqlite-docs', 'cmu-15445'],
});

const transacoes = lesson({
  id: 'l7-normalizacao-indices',
  moduleId: 'm7-3',
  title: 'Normalização, índices e transações',
  titleEn: 'Normalization, indexes and transactions',
  summary: 'Evitar anomalias, acelerar consultas com índices B-tree e garantir consistência com ACID.',
  minutes: 40,
  objectives: ['Reconhecer redundância e aplicar 1FN, 2FN e 3FN', 'Explicar como um índice acelera buscas e quando atrapalha', 'Usar transações e explicar ACID'],
  skills: ['bd-modelagem'],
  terms: [
    t('normalização', 'normalization', 'Organizar tabelas para reduzir redundância e anomalias.'),
    t('índice', 'index', 'Estrutura auxiliar (geralmente B-tree) que acelera buscas por uma coluna.'),
    t('transação', 'transaction', 'Grupo de operações que acontece por completo ou não acontece.'),
    t('confirmar / desfazer', 'commit / rollback', 'Confirmar ou desfazer as operações de uma transação.'),
    t('ACID', 'ACID', 'Atomicidade, Consistência, Isolamento, Durabilidade.'),
    t('plano de execução', 'query plan', 'Como o banco decidiu executar a consulta (EXPLAIN).'),
  ],
  stages: {
    conceito: [md('Três ferramentas para bancos que funcionam bem em produção: **normalização** (não repetir dados, para não haver versões conflitantes), **índices** (encontrar linhas sem varrer a tabela inteira) e **transações** (operações que acontecem por inteiro ou não acontecem).')],
    explicacao: [
      md(`
        **Normalização** — se o nome do curso está repetido em cada linha de aluno e alguém o corrige em uma só, o banco fica inconsistente (*anomalia de atualização*).

        - **1FN**: valores atômicos (nada de "telefones: 1111, 2222" numa coluna).
        - **2FN**: cada coluna depende da chave **inteira** (importante em chaves compostas).
        - **3FN**: nenhuma coluna depende de outra coluna não-chave (o nome do curso depende do curso, não do aluno → tabela \`cursos\`).

        **Índices**: um índice B-tree em \`alunos(email)\` transforma a busca de O(n) (varrer tudo) em O(log n). Custo: espaço extra e escritas mais lentas (o índice precisa ser atualizado). Crie índices para colunas usadas em WHERE, JOIN e ORDER BY frequentes; confira com \`EXPLAIN\`.

        **Transações e ACID**:

        - **Atomicidade**: transferir R$ 100 = debitar A **e** creditar B. Se falhar no meio, \`ROLLBACK\` desfaz tudo.
        - **Consistência**: regras (chaves, CHECK) valem antes e depois.
        - **Isolamento**: transações concorrentes não veem estados intermediários umas das outras (há níveis de isolamento).
        - **Durabilidade**: depois do \`COMMIT\`, sobrevive a quedas de energia (graças ao *write-ahead log*).
      `),
      deep('Desnormalizar (repetir dados de propósito) é uma técnica legítima para leitura muito rápida — em data warehouses e caches. A regra é: normalize por padrão, desnormalize com motivo medido.', 'Sempre normalizar?'),
    ],
    exemplo: [py(`
      import sqlite3, time
      con = sqlite3.connect(":memory:")
      con.execute("CREATE TABLE usuarios (id INTEGER PRIMARY KEY, email TEXT)")
      con.executemany("INSERT INTO usuarios (email) VALUES (?)", ((f"u{i}@ex.com",) for i in range(200_000)))

      def buscar():
          t0 = time.perf_counter()
          con.execute("SELECT id FROM usuarios WHERE email = ?", ("u199999@ex.com",)).fetchone()
          return time.perf_counter() - t0

      print("plano:", con.execute("EXPLAIN QUERY PLAN SELECT id FROM usuarios WHERE email = 'x'").fetchall())
      print(f"sem índice: {buscar():.5f}s")
      con.execute("CREATE INDEX idx_email ON usuarios(email)")
      print("plano:", con.execute("EXPLAIN QUERY PLAN SELECT id FROM usuarios WHERE email = 'x'").fetchall())
      print(f"com índice: {buscar():.5f}s")
    `, { caption: 'SCAN = varre a tabela; SEARCH ... USING INDEX = usa o índice.' })],
    codigo: [py(`
      import sqlite3
      con = sqlite3.connect(":memory:")
      con.execute("CREATE TABLE contas (id INTEGER PRIMARY KEY, saldo REAL CHECK (saldo >= 0))")
      con.executemany("INSERT INTO contas VALUES (?, ?)", [(1, 100.0), (2, 50.0)])
      con.commit()

      def transferir(origem, destino, valor):
          try:
              with con:  # abre transação; commit se ok, rollback se exceção
                  con.execute("UPDATE contas SET saldo = saldo + ? WHERE id = ?", (valor, destino))
                  con.execute("UPDATE contas SET saldo = saldo - ? WHERE id = ?", (valor, origem))
          except sqlite3.IntegrityError as e:
              print("falhou, desfeito:", e)

      transferir(1, 2, 30)
      transferir(1, 2, 500)   # violaria o CHECK: tudo é desfeito, inclusive o crédito
      print(con.execute("SELECT * FROM contas").fetchall())
    `)],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e7-norm-1',
          kind: 'mcq',
          prompt: 'A tabela `pedidos(id, cliente_nome, cliente_email, produto, preco)` repete nome e e-mail do cliente em cada pedido. Qual o principal problema?',
          difficulty: 'intermediario',
          skills: ['bd-modelagem'],
          hints: ['O que acontece quando o cliente muda de e-mail?'],
          explanation: 'Anomalia de atualização: o e-mail precisa ser alterado em todas as linhas; se uma ficar para trás, os dados ficam inconsistentes. Solução: tabela clientes e pedidos.cliente_id.',
          options: [
            { text: 'A tabela fica lenta para inserir', feedback: 'Pode ficar maior, mas o problema central é consistência.' },
            { text: 'Anomalias de atualização: o mesmo dado repetido pode ficar inconsistente', correct: true, feedback: 'Isso: normalize em clientes + pedidos.' },
            { text: 'Não é possível fazer JOIN', feedback: 'Não há relação com JOINs.' },
            { text: 'Nenhum: repetir dados sempre é melhor', feedback: 'Só com motivo medido (desnormalização consciente).' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e7-idx-1',
          kind: 'mcq',
          prompt: 'Qual é um **custo** de adicionar um índice?',
          difficulty: 'facil',
          skills: ['bd-modelagem'],
          hints: ['Quando você insere uma linha, o que mais precisa ser atualizado?'],
          explanation: 'Cada INSERT/UPDATE/DELETE precisa manter o índice atualizado, e ele ocupa espaço. Por isso não se indexa tudo.',
          options: [
            { text: 'Consultas por aquela coluna ficam mais lentas', feedback: 'Pelo contrário: ficam mais rápidas.' },
            { text: 'Escritas ficam mais lentas e o banco ocupa mais espaço', correct: true, feedback: 'Isso: é uma troca.' },
            { text: 'Os dados podem ser perdidos', feedback: 'Índices não afetam a durabilidade.' },
            { text: 'Impede o uso de JOIN', feedback: 'Índices costumam acelerar JOINs.' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e7-tx-desafio',
          kind: 'code',
          lang: 'python',
          prompt: 'Com `sqlite3`, escreva `transferir(con, origem, destino, valor)` que move o valor entre contas **atomicamente**: se a origem não tiver saldo suficiente (ou o valor for <= 0), lance `ValueError` e **nada** pode mudar no banco. A tabela é `contas(id, saldo)`.',
          difficulty: 'desafio',
          skills: ['bd-modelagem'],
          hints: ['`with con:` abre uma transação: commit no fim, rollback se houver exceção dentro.', 'Leia o saldo da origem dentro da transação antes de debitar.'],
          explanation: 'Fazer a verificação e as duas atualizações dentro do mesmo bloco transacional garante atomicidade: ou as duas atualizações acontecem, ou nenhuma.',
          starter: dedent(`
            import sqlite3

            def transferir(con, origem, destino, valor):
                con.execute("UPDATE contas SET saldo = saldo - ? WHERE id = ?", (valor, origem))
                con.execute("UPDATE contas SET saldo = saldo + ? WHERE id = ?", (valor, destino))
                con.commit()
          `),
          solution: dedent(`
            import sqlite3

            def transferir(con, origem, destino, valor):
                with con:
                    if valor <= 0:
                        raise ValueError("valor inválido")
                    (saldo,) = con.execute("SELECT saldo FROM contas WHERE id = ?", (origem,)).fetchone()
                    if saldo < valor:
                        raise ValueError("saldo insuficiente")
                    con.execute("UPDATE contas SET saldo = saldo - ? WHERE id = ?", (valor, origem))
                    con.execute("UPDATE contas SET saldo = saldo + ? WHERE id = ?", (valor, destino))
          `),
          tests: [
            { name: 'transferência válida', code: 'import sqlite3\ncon = sqlite3.connect(":memory:")\ncon.execute("CREATE TABLE contas (id INTEGER PRIMARY KEY, saldo REAL)")\ncon.executemany("INSERT INTO contas VALUES (?, ?)", [(1, 100), (2, 0)]); con.commit()\ntransferir(con, 1, 2, 40)\nassert con.execute("SELECT saldo FROM contas ORDER BY id").fetchall() == [(60,), (40,)]' },
            { name: 'saldo insuficiente não muda nada', code: 'import sqlite3\ncon = sqlite3.connect(":memory:")\ncon.execute("CREATE TABLE contas (id INTEGER PRIMARY KEY, saldo REAL)")\ncon.executemany("INSERT INTO contas VALUES (?, ?)", [(1, 10), (2, 0)]); con.commit()\ntry:\n    transferir(con, 1, 2, 50)\n    assert False, "deveria lançar ValueError"\nexcept ValueError:\n    pass\nassert con.execute("SELECT saldo FROM contas ORDER BY id").fetchall() == [(10,), (0,)]' },
          ],
        },
      },
    ],
    projeto: [md('**Sistema de cadastro (parte 6)**: normalize o esquema até a 3FN, crie índices para as buscas mais comuns (confira com EXPLAIN QUERY PLAN) e faça a matrícula em várias disciplinas numa única transação.'), { type: 'project', projectId: 'p3-cadastro' }],
    revisao: [md('- 1FN, 2FN, 3FN reduzem redundância e anomalias.\n- Índice B-tree: leitura O(log n), custo em escrita e espaço.\n- Transações ACID: commit/rollback.')],
  },
  review: [
    ['O que significa o A de ACID?', 'Atomicidade: a transação acontece por completo ou não acontece.'],
    ['Quando criar um índice?', 'Em colunas usadas com frequência em WHERE, JOIN ou ORDER BY, verificando com EXPLAIN.'],
    ['O que é a 3FN?', 'Nenhum atributo não-chave depende de outro atributo não-chave (sem dependências transitivas).'],
  ],
  references: ['cmu-15445', 'postgres-docs', 'sqlite-docs', 'ddia'],
});

export const level7: Level = {
  id: 'n7',
  number: 7,
  title: 'Banco de Dados',
  titleEn: 'Databases',
  goal: 'Modelar, consultar e manter dados com consistência e desempenho.',
  why: 'Quase todo sistema real gira em torno dos seus dados. Saber SQL, modelagem e transações é exigido de qualquer desenvolvedor back-end, de dados ou full stack.',
  modules: [
    {
      id: 'm7-1', levelId: 'n7', title: 'Modelo relacional e SQL', titleEn: 'Relational model and SQL',
      description: 'Tabelas, chaves e consultas.',
      prerequisites: ['m2-2'],
      skills: [{ id: 'bd-sql', pt: 'SQL', en: 'SQL' }],
      outline: ['Tabelas e chaves', 'SELECT, WHERE, ORDER BY, LIMIT', 'Agregações e GROUP BY', 'INSERT, UPDATE, DELETE', 'Consultas parametrizadas'],
      lessons: [sql],
      references: ['postgres-docs', 'sqlite-docs'],
    },
    {
      id: 'm7-2', levelId: 'n7', title: 'Relacionamentos e JOINs', titleEn: 'Relationships and JOINs',
      description: 'Combinar tabelas relacionadas.',
      prerequisites: ['m7-1'],
      skills: [{ id: 'bd-joins', pt: 'Relacionamentos e JOINs', en: 'Relationships and JOINs' }],
      outline: ['1:N e N:N', 'INNER JOIN', 'LEFT JOIN e anti-join', 'NULL', 'Subconsultas'],
      lessons: [joins],
      references: ['postgres-docs'],
    },
    {
      id: 'm7-3', levelId: 'n7', title: 'Normalização, índices e transações', titleEn: 'Normalization, indexes and transactions',
      description: 'Consistência e desempenho.',
      prerequisites: ['m7-2'],
      skills: [{ id: 'bd-modelagem', pt: 'Modelagem, índices e transações', en: 'Modeling, indexes and transactions' }],
      outline: ['Formas normais', 'Índices B-tree e EXPLAIN', 'ACID', 'Níveis de isolamento', 'Otimização de consultas'],
      lessons: [transacoes],
      references: ['cmu-15445', 'ddia'],
    },
    {
      id: 'm7-4', levelId: 'n7', title: 'NoSQL e dados em escala', titleEn: 'NoSQL and data at scale',
      description: 'Documentos, chave-valor, grafos e quando usar cada um.',
      prerequisites: ['m7-3'],
      skills: [{ id: 'bd-nosql', pt: 'NoSQL', en: 'NoSQL' }],
      outline: ['Documentos (MongoDB)', 'Chave-valor (Redis)', 'Colunares e grafos', 'Teorema CAP', 'Replicação e particionamento', 'Escolhendo o banco certo'],
      lessons: [nosql],
      references: ['ddia', 'cmu-15445'],
    },
  ],
};

