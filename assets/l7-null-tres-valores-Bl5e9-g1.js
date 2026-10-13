var e={id:`l7-null-tres-valores`,moduleId:`m7-2`,title:`NULL e a lógica de três valores`,titleEn:`NULL and three-valued logic`,summary:`Por que uma comparação com NULL não dá verdadeiro nem falso, quais linhas o WHERE descarta por isso, como COUNT, SUM e AVG tratam valores ausentes, COALESCE e NULLIF, e as armadilhas do LEFT JOIN: filtrar no WHERE o que devia estar no ON e contar 1 onde devia ser 0.`,minutes:45,objectives:[`Avaliar expressões com NULL pela lógica de três valores (TRUE, FALSE, UNKNOWN) e prever quais linhas WHERE, HAVING e ON mantêm`,`Escolher entre = NULL, IS NULL e a comparação segura para nulos (IS DISTINCT FROM, ou IS e IS NOT no SQLite)`,`Prever o resultado de COUNT(*), COUNT(coluna), SUM e AVG em colunas com NULL e decidir quando usar COALESCE`,`Decidir se um filtro sobre a tabela da direita de um LEFT JOIN vai no ON ou no WHERE`,`Contar zero corretamente em relatórios com LEFT JOIN`],skills:[`bd-joins`,`bd-sql`],terms:[{pt:`lógica de três valores`,en:`three-valued logic (3VL)`,def:`A lógica do SQL, com três valores-verdade: TRUE, FALSE e UNKNOWN. Qualquer comparação com NULL dá UNKNOWN.`,example:`SQL uses three-valued logic: comparing anything with NULL yields UNKNOWN.`},{pt:`desconhecido`,en:`UNKNOWN`,def:`O terceiro valor-verdade do SQL. WHERE, HAVING e ON descartam as linhas em que a condição dá UNKNOWN; no SQLite ele aparece como NULL.`},{pt:`predicado`,en:`predicate`,def:`Expressão que resulta num valor-verdade, como nota >= 7 ou curso IS NULL.`,example:`Rows for which the WHERE predicate is not true are filtered out.`},{pt:`comparação segura para nulos`,en:`null-safe comparison`,def:`Comparação que trata dois NULL como iguais e nunca dá UNKNOWN: IS [NOT] DISTINCT FROM no padrão SQL e no PostgreSQL, IS e IS NOT no SQLite, <=> no MySQL.`,example:`Use IS DISTINCT FROM for a null-safe comparison.`},{pt:`valor padrão`,en:`default value`,def:`Valor posto no lugar de NULL numa consulta, em geral com COALESCE, como em COALESCE(SUM(valor), 0). Não confundir com a cláusula DEFAULT da coluna, que só age no INSERT.`,example:`COALESCE is often used to substitute a default value for null values when data is retrieved for display.`},{pt:`tabela preservada`,en:`preserved table`,def:`Num LEFT JOIN, a tabela da esquerda: todas as linhas dela aparecem no resultado, com ou sem par.`},{pt:`relacionamento opcional`,en:`optional relationship`,def:`Relacionamento em que a chave estrangeira pode ser NULL: a linha existe sem par do outro lado.`,example:`The foreign key is nullable, so the relationship is optional.`}],references:[`postgres-docs`,`sqlite-docs`,`cmu-15445`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:'Na lição anterior, o NULL apareceu como o "vazio" que o LEFT JOIN põe onde não há par, e você viu que `= NULL` não funciona. Agora vamos entender **por quê**, porque o mesmo mecanismo faz relatórios perderem linhas sem dar erro nenhum.\n\n`NULL` não é zero, não é texto vazio e não é falso: é a marca de que **não há valor ali**. A nota que o professor ainda não lançou no sistema acadêmico é NULL, e isso é diferente de uma nota 0. O complemento de um endereço que não tem complemento, o telefone que o cliente não informou, a data de entrega de um pedido que ainda não chegou: tudo NULL.\n\nComo o banco não sabe qual é o valor, ele também não sabe se `nota >= 7` é verdade. A resposta é um terceiro valor, {{desconhecido|UNKNOWN}}, e o SQL inteiro funciona com essa {{lógica de três valores|three-valued logic}}. A regra que mais importa: **o WHERE só fica com as linhas em que a condição dá TRUE**. As que dão UNKNOWN somem em silêncio, e é daí que vêm as médias que mudam, os alunos que desaparecem do relatório e o LEFT JOIN que vira INNER JOIN sem ninguém perceber.'}]},{stage:`explicacao`,blocks:[{type:`md`,text:"### Comparar com NULL dá UNKNOWN\nQualquer comparação (=, <>, <, >= ...) em que um dos lados é NULL dá UNKNOWN, inclusive `NULL = NULL`: dois valores desconhecidos podem ser iguais ou não, e o banco não arrisca. Contas e concatenações também propagam o NULL: `nota + 1` e `'Ana' || NULL` dão NULL.\n\nPara perguntar se **há** valor existe um {{predicado|predicate}} próprio, que só dá TRUE ou FALSE: `IS NULL` e `IS NOT NULL`."},{type:`table`,head:[`Expressão`,`Resultado`,`Por quê`],rows:[["`nota = NULL`",`UNKNOWN, seja qual for a nota`,`é uma comparação com NULL`],["`NULL = NULL`",`UNKNOWN`,`dois desconhecidos não são iguais com certeza`],["`NULL <> 1`",`UNKNOWN`,`o desconhecido pode ser 1`],["`nota IS NULL`",`TRUE ou FALSE`,`pergunta se há valor; nunca dá UNKNOWN`],["`NULL + 1`, `'Ana' || NULL`",`NULL`,`conta com valor ausente dá valor ausente`]],caption:`No SQLite, TRUE aparece como 1, FALSE como 0 e UNKNOWN como NULL. Pelo módulo sqlite3 do Python, como 1, 0 e None.`},{type:`md`,text:'### AND, OR e NOT com UNKNOWN\nPense em UNKNOWN como "pode ser TRUE, pode ser FALSE". Se o resultado for o mesmo nos dois casos, ele é certo; se mudar, é UNKNOWN. `FALSE AND UNKNOWN` é FALSE (com um lado falso, o AND já é falso), mas `TRUE AND UNKNOWN` é UNKNOWN (depende do lado desconhecido).'},{type:`table`,head:[`a`,`b`,`a AND b`,`a OR b`],rows:[[`TRUE`,`UNKNOWN`,`UNKNOWN`,`TRUE`],[`FALSE`,`UNKNOWN`,`FALSE`,`UNKNOWN`],[`UNKNOWN`,`UNKNOWN`,`UNKNOWN`,`UNKNOWN`]],caption:`NOT UNKNOWN continua UNKNOWN. Com TRUE e FALSE dos dois lados, vale a lógica de sempre.`},{type:`md`,text:"### O WHERE só fica com TRUE\nWHERE e HAVING mantêm uma linha, e o ON de um JOIN forma um par, **só se** a condição der TRUE; FALSE e UNKNOWN são descartados do mesmo jeito. Consequência: `WHERE nota >= 7` e `WHERE NOT (nota >= 7)` **juntos não cobrem a tabela**. As matrículas sem nota não estão em nenhum dos dois, porque para elas as duas condições dão UNKNOWN. Na lógica do SQL, \"p ou não p\" nem sempre é verdade.\n\nO mesmo vale para `<>`: `WHERE curso <> 'CC'` não traz quem tem curso NULL. Se você quer essas linhas, peça explicitamente: `WHERE curso <> 'CC' OR curso IS NULL`.\n\n### IN é uma série de =\n`x IN (a, b, c)` é `x = a OR x = b OR x = c`, e `x NOT IN (a, b, c)` é `x <> a AND x <> b AND x <> c`. Por isso:\n\n- `2 IN (1, 2, NULL)` é TRUE: um dos = deu TRUE, e para o OR isso basta.\n- `3 IN (1, 2, NULL)` é UNKNOWN: `3 = NULL` poderia ser verdade.\n- `3 NOT IN (1, 2, NULL)` é UNKNOWN: `3 <> NULL` é UNKNOWN, e o AND não chega a TRUE.\n\nOu seja, **um único NULL na lista impede o NOT IN de dar TRUE em qualquer linha**. Na próxima lição essa lista vai vir de uma subconsulta, e aí a armadilha fica bem mais difícil de ver."},{type:`callout`,tone:`warn`,text:"Uma restrição CHECK funciona ao contrário do WHERE: ela só rejeita a linha se a condição der FALSE. Com `CHECK (saldo >= 0)`, um saldo NULL passa, porque `NULL >= 0` é UNKNOWN. Se a coluna não pode ficar vazia, declare-a também NOT NULL.",title:`CHECK aceita UNKNOWN`},{type:`md`,text:'### Comparar duas colunas que podem ser NULL\nPara saber se o e-mail de um cliente **mudou** entre duas tabelas, `novo.email <> antigo.email` falha quando um dos dois é NULL: o resultado é UNKNOWN, e a mudança de "sem e-mail" para "com e-mail" passa despercebida. Use a {{comparação segura para nulos|null-safe comparison}}, que trata NULL como um valor qualquer:'},{type:`table`,head:[`Banco`,`São diferentes`,`São iguais`],rows:[[`padrão SQL, PostgreSQL, SQLite 3.39 ou mais novo`,"`a IS DISTINCT FROM b`","`a IS NOT DISTINCT FROM b`"],[`SQLite (também nas versões antigas)`,"`a IS NOT b`","`a IS b`"],[`MySQL`,"`NOT (a <=> b)`","`a <=> b`"]],caption:`Com NULL dos dois lados, "são iguais" dá TRUE; com NULL de um lado só, "são diferentes" dá TRUE. O resultado nunca é UNKNOWN.`},{type:`md`,text:"### Funções para lidar com NULL\n- `COALESCE(a, b, ...)` devolve o primeiro argumento que não é NULL. Serve para pôr um {{valor padrão|default value}} na saída: `COALESCE(telefone, 'não informado')`. No SQLite e no MySQL, `IFNULL(a, b)` faz o mesmo com dois argumentos.\n- `NULLIF(a, b)` devolve NULL se a = b; senão, devolve a. O uso clássico é evitar divisão por zero: `total / NULLIF(qtd, 0)` dá NULL em vez de erro quando qtd é 0. (No PostgreSQL, dividir por zero é erro; o SQLite devolve NULL sem avisar.)\n\n### Agregações ignoram NULL\nCOUNT(coluna), SUM, AVG, MIN e MAX **pulam** os NULL. Só COUNT(*) conta linhas, tenha a linha NULL ou não."},{type:`table`,head:[`Função`,`O que faz com NULL`,`Quando não há nenhum valor (só NULL, ou nenhuma linha)`],rows:[["`COUNT(*)`",`conta a linha mesmo assim`,`o número de linhas, mesmo que só tenham NULL (0 se não houver linha)`],["`COUNT(nota)`",`não conta`,`0`],["`SUM(nota)`",`ignora`,`**NULL**, e não 0`],["`AVG(nota)`",`ignora: é SUM(nota) dividido por COUNT(nota)`,`NULL`],["`MIN(nota)`, `MAX(nota)`",`ignoram`,`NULL`]]},{type:`md`,text:'Repare no AVG: a média das notas **lançadas** não é a média com as pendentes valendo zero. `AVG(nota)` divide por COUNT(nota); `AVG(COALESCE(nota, 0))` divide por COUNT(*). As duas são legítimas, mas respondem a perguntas diferentes, e quem decide qual é a certa é a regra do negócio ("nota pendente conta como zero?"), e não o SQL.'},{type:`callout`,tone:`tip`,text:"O SQLite tem `total(x)`, que devolve 0.0 em vez de NULL quando não há valores. É uma extensão só dele; no PostgreSQL, escreva `COALESCE(SUM(x), 0)`."},{type:`md`,text:'### NULL em GROUP BY, DISTINCT, UNIQUE e ORDER BY\nPara agrupar e eliminar repetidos, o SQL trata os NULL como **um mesmo valor**: `GROUP BY curso` junta todos os alunos sem curso num único grupo, e DISTINCT devolve um só NULL. Já uma coluna UNIQUE, no SQLite e no PostgreSQL, aceita **vários** NULL, porque dois NULL não são "iguais" (o PostgreSQL 15 trouxe `UNIQUE NULLS NOT DISTINCT` para proibir isso).\n\nNa ordenação, cada banco escolhe um lado. O SQLite e o MySQL consideram NULL menor que tudo: ele aparece **primeiro** num ORDER BY crescente. O PostgreSQL e o Oracle o consideram maior que tudo: ele aparece **por último**. Se a posição importa, diga qual quer: `ORDER BY curso NULLS LAST` funciona no PostgreSQL e no SQLite 3.30 ou mais novo.\n\n### NULL na chave estrangeira: relacionamento opcional\nUma chave estrangeira que aceita NULL modela um {{relacionamento opcional|optional relationship}}: `alunos.orientador_id` NULL quer dizer "ainda sem orientador". A restrição de chave estrangeira não confere linhas com NULL na chave (não há o que conferir), e um JOIN não liga um NULL a nada, porque `NULL = id` é UNKNOWN. Por isso, um INNER JOIN de alunos com professores pelo orientador **some** com quem não tem orientador; para listar todos, é LEFT JOIN. Se o relacionamento é obrigatório, declare a coluna NOT NULL.'},{type:`callout`,tone:`info`,text:"No SQLite, as chaves estrangeiras só são verificadas depois de `PRAGMA foreign_keys = ON`, e isso vale por conexão: sem o PRAGMA, o banco aceita uma matrícula de um aluno que não existe."},{type:`md`,text:`### LEFT JOIN, parte 1: o filtro vai no ON ou no WHERE?
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

A regra: **o ON decide quais pares se formam; o WHERE filtra o resultado já pronto.** No LEFT JOIN, toda linha da {{tabela preservada|preserved table}} aparece pelo menos uma vez, tenha par ou não, seja o que for que esteja no ON. Por isso, uma condição sobre a tabela da **esquerda** no ON não tira ninguém do resultado: \`ON m.aluno_id = a.id AND a.curso = 'CC'\` continua listando todos os alunos, só que os de outros cursos ficam sem nenhuma matrícula ao lado. Filtro sobre a esquerda vai no WHERE. Num INNER JOIN, tanto faz: nada é preservado, e ON e WHERE dão o mesmo resultado.`},{type:`table`,head:[`Onde está o filtro`,`INNER JOIN`,`LEFT JOIN`],rows:[[`no ON, sobre a tabela da direita`,`filtra os pares`,`escolhe os pares; quem fica sem par aparece com NULL`],[`no WHERE, sobre a tabela da direita`,`filtra os pares (mesmo resultado)`,`apaga as linhas com NULL: vira INNER JOIN`],[`no ON, sobre a tabela da esquerda`,`filtra (mesmo resultado que no WHERE)`,`**não filtra**: a linha aparece, só que sem par`],[`no WHERE, sobre a tabela da esquerda`,`filtra`,`filtra`]]},{type:`md`,text:"### LEFT JOIN, parte 2: anti-join e contagem\nDois detalhes que dependem de escolher **qual coluna** testar:\n\n- No anti-join da lição anterior (LEFT JOIN + `IS NULL`), teste uma coluna que **nunca é NULL num par de verdade**: a coluna da junção ou a chave primária da tabela da direita. `WHERE m.nota IS NULL` mistura dois grupos, os alunos sem matrícula e os que têm matrícula com nota pendente.\n- Para contar quantas matrículas cada aluno tem, `COUNT(*)` dá **1** para quem não tem nenhuma: a linha de NULL que o LEFT JOIN criou é uma linha. Conte uma coluna da direita que nunca é NULL num par, como `COUNT(m.aluno_id)`, e quem não tem par fica com 0."},{type:`callout`,tone:`deep`,text:'Em Python, `None == None` é True: None é um valor como outro qualquer. O NULL do SQL lembra mais o NaN do ponto flutuante (IEEE 754), que é diferente até de si mesmo: `float("nan") == float("nan")` é False. Mesmo assim, não é a mesma coisa: com NaN a comparação dá False, e não "desconhecido", e por isso `not (nan == 1)` é True, enquanto `NOT (NULL = 1)` continua UNKNOWN.\n\nO próprio Codd, criador do modelo relacional, chegou a propor duas marcas diferentes, uma para "o valor existe, mas não se sabe" e outra para "não se aplica". O SQL ficou com um NULL só, e cabe a quem modela o banco documentar o que ele significa em cada coluna.',title:`NULL não é None`}]},{stage:`exemplo`,blocks:[{type:`md`,text:`Vamos usar o banco da escola com três novidades, que também aparecem nos exercícios: Abel (id 6), ainda sem curso definido (curso NULL); a disciplina Sistemas Operacionais (id 5), sem ninguém matriculado; e três matrículas novas, duas com nota ainda não lançada (Bia em Redes e Abel em Algoritmos). São 10 matrículas. Veja o que três condições fazem com cada uma:`},{type:`table`,head:[`Matrícula`,`nota`,"`nota >= 7`","`NOT (nota >= 7)`","`nota >= 7 OR nota IS NULL`"],rows:[[`Ana, Algoritmos`,`9.0`,`TRUE`,`FALSE`,`TRUE`],[`Ana, Banco de Dados`,`8.5`,`TRUE`,`FALSE`,`TRUE`],[`Bia, Banco de Dados`,`7.0`,`TRUE`,`FALSE`,`TRUE`],[`Caio, Algoritmos`,`6.0`,`FALSE`,`TRUE`,`FALSE`],[`Caio, Redes`,`8.0`,`TRUE`,`FALSE`,`TRUE`],[`Davi, Banco de Dados`,`5.5`,`FALSE`,`TRUE`,`FALSE`],[`Ana, Cálculo`,`7.5`,`TRUE`,`FALSE`,`TRUE`],[`Bia, Redes`,`NULL`,`UNKNOWN`,`UNKNOWN`,`TRUE (UNKNOWN OR TRUE)`],[`Abel, Algoritmos`,`NULL`,`UNKNOWN`,`UNKNOWN`,`TRUE (UNKNOWN OR TRUE)`],[`Abel, Banco de Dados`,`7.0`,`TRUE`,`FALSE`,`TRUE`]],caption:`WHERE nota >= 7 traz 6 linhas, e WHERE NOT (nota >= 7) traz 2: somadas, 8 das 10. As duas pendentes só aparecem quando você pergunta por elas.`},{type:`md`,text:`As agregações sobre as mesmas 10 linhas:`},{type:`table`,head:[`Expressão`,`Resultado`,`De onde vem`],rows:[["`COUNT(*)`",`10`,`todas as linhas`],["`COUNT(nota)`",`8`,`só as notas lançadas`],["`SUM(nota)`",`58.5`,`soma das 8 notas`],["`AVG(nota)`",`7.3125`,`58,5 ÷ 8`],["`AVG(COALESCE(nota, 0))`",`5.85`,`58,5 ÷ 10: as pendentes valendo zero`]]},{type:`md`,text:"Agora o LEFT JOIN de alunos com matrículas, com o filtro de Banco de Dados (`disciplina_id = 2`) em cada um dos dois lugares:"},{type:`table`,head:[`nome`,`filtro no WHERE`,`filtro no ON`],rows:[[`Abel`,`7.0`,`7.0`],[`Ana`,`8.5`,`8.5`],[`Bia`,`7.0`,`7.0`],[`Caio`,`(some)`,`NULL`],[`Davi`,`5.5`,`5.5`],[`Eva`,`(some)`,`NULL`]],caption:`Caio tem matrículas, mas em outras disciplinas: com o filtro no WHERE, as linhas dele dão FALSE. Eva não tem matrícula nenhuma: a linha de NULL dela dá UNKNOWN. Os dois somem.`},{type:`viz`,viz:`sql-join`,caption:`Volte à visualização da lição anterior e localize as linhas com NULL do LEFT JOIN: são exatamente essas que um filtro sobre a tabela da direita, posto no WHERE, elimina.`}]},{stage:`codigo`,blocks:[{type:`md`,text:"Um banco menor, com os mesmos fenômenos. Rode e confira cada linha da saída com o que você viu acima; pelo módulo `sqlite3`, NULL chega ao Python como `None`."},{type:`code`,lang:`python`,code:`import sqlite3

con = sqlite3.connect(":memory:")
con.executescript("""
CREATE TABLE alunos (id INTEGER PRIMARY KEY, nome TEXT, curso TEXT);
CREATE TABLE matriculas (aluno_id INTEGER, disciplina_id INTEGER, nota REAL);
INSERT INTO alunos VALUES (1, 'Ana', 'CC'), (2, 'Bia', 'SI'), (3, 'Caio', 'CC'),
                          (4, 'Eva', 'CC'), (5, 'Abel', NULL);
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
    ORDER BY a.nome""")`,runnable:!0,caption:`Com o filtro no ON, Caio e Eva aparecem com None. Abel aparece com None nas duas versões, mas por outro motivo: ele cursa BD e a nota ainda não foi lançada. Um None no resultado de um LEFT JOIN não diz, sozinho, se faltou o par ou se faltou o valor.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e7-null-1`,kind:`mcq`,prompt:`Qual consulta lista os alunos que **ainda não têm curso definido** (curso NULL)?`,difficulty:`facil`,skills:[`bd-joins`],hints:['Quanto vale `curso = NULL` numa linha em que o curso é NULL? E numa em que é "CC"?',`Qual predicado pergunta se há valor e só responde TRUE ou FALSE?`],explanation:"`IS NULL` é o único jeito de perguntar se falta o valor. `curso = NULL` dá UNKNOWN em toda linha, e o WHERE descarta todas, sem erro. Texto vazio é um valor como outro qualquer. E qualquer condição que compare curso com algo (=, <>, IN) dá UNKNOWN justamente nas linhas sem curso, então nenhuma delas consegue selecioná-las.",options:[{text:`SELECT nome FROM alunos WHERE curso = NULL;`,feedback:"Roda sem erro e devolve zero linhas: `curso = NULL` é UNKNOWN para todo aluno, inclusive os sem curso, e o WHERE só fica com TRUE."},{text:`SELECT nome FROM alunos WHERE curso IS NULL;`,correct:!0,feedback:`Isso. IS NULL dá TRUE ou FALSE, nunca UNKNOWN, e é feito para essa pergunta.`},{text:`SELECT nome FROM alunos WHERE curso = '';`,feedback:`Texto vazio é um valor, diferente de NULL: essa consulta acharia quem tem curso '' cadastrado, não quem não tem curso. (O Oracle é a exceção conhecida: lá, texto vazio é tratado como NULL.)`},{text:`SELECT nome FROM alunos WHERE NOT (curso IN ('CC', 'SI', 'ADS'));`,feedback:"Para curso NULL, `curso IN (...)` dá UNKNOWN, e NOT UNKNOWN continua UNKNOWN: justamente quem você queria fica de fora. Além disso, a consulta traria alunos de qualquer outro curso."}]}},{type:`exercise`,exercise:{id:`e7-null-2`,kind:`sql`,prompt:`Neste banco, Abel ainda não tem curso definido (curso NULL). Liste o **nome** de todos os alunos que **não** são do curso CC, inclusive quem não tem curso, em ordem alfabética.`,difficulty:`facil`,skills:[`bd-joins`,`bd-sql`],hints:[`Rode a consulta inicial e olhe a coluna curso. Quem não tem curso?`,"Para Abel, quanto vale `curso <> 'CC'`? O WHERE fica com essa linha?",`Você pode pedir as linhas sem curso explicitamente, com um segundo predicado ligado por OR.`],explanation:"SELECT nome FROM alunos WHERE curso <> 'CC' OR curso IS NULL ORDER BY nome; Para Abel, `curso <> 'CC'` dá UNKNOWN e `curso IS NULL` dá TRUE; UNKNOWN OR TRUE é TRUE, e ele fica. Só com `<>`, Abel some sem aviso. No SQLite, `WHERE curso IS NOT 'CC'` faz o mesmo numa comparação só (no padrão SQL e no PostgreSQL, `curso IS DISTINCT FROM 'CC'`).",setup:`CREATE TABLE alunos (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, curso TEXT, ano INTEGER);
CREATE TABLE disciplinas (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, creditos INTEGER);
CREATE TABLE matriculas (aluno_id INTEGER REFERENCES alunos(id), disciplina_id INTEGER REFERENCES disciplinas(id), nota REAL);
INSERT INTO alunos VALUES (1,'Ana','CC',2), (2,'Bia','SI',1), (3,'Caio','CC',3), (4,'Davi','ADS',1), (5,'Eva','CC',1);
INSERT INTO disciplinas VALUES (1,'Algoritmos',6), (2,'Banco de Dados',4), (3,'Redes',4), (4,'Cálculo',6);
INSERT INTO matriculas VALUES (1,1,9.0), (1,2,8.5), (2,2,7.0), (3,1,6.0), (3,3,8.0), (4,2,5.5), (1,4,7.5);
INSERT INTO alunos VALUES (6, 'Abel', NULL, 2);
INSERT INTO disciplinas VALUES (5, 'Sistemas Operacionais', 4);
INSERT INTO matriculas VALUES (2, 3, NULL), (6, 1, NULL), (6, 2, 7.0);`,starter:`SELECT nome, curso FROM alunos ORDER BY nome;`,solution:`SELECT nome FROM alunos WHERE curso <> 'CC' OR curso IS NULL ORDER BY nome;`,ordered:!0}},{type:`exercise`,exercise:{id:`e7-null-3`,kind:`predict`,lang:`python`,prompt:"O que este programa imprime? Lembre que o `sqlite3` entrega NULL como `None` e TRUE/FALSE como `1`/`0`.",difficulty:`intermediario`,skills:[`bd-joins`,`bd-sql`],hints:[`A tabela tem 4 linhas, e duas delas são NULL. Quais funções contam linhas e quais contam valores?`,`AVG divide a soma pelo número de valores ou pelo número de linhas?`,"Para as linhas NULL, quanto valem `x <> 1` e `NOT (x <> 1)`? O WHERE fica com elas?",`Na última consulta, nenhuma linha passa no WHERE. Quanto vale SUM de nada? E COUNT de nada?`],explanation:"COUNT(*) conta as 4 linhas; COUNT(x) só os 2 valores; SUM(x) = 1 + 3 = 4; AVG(x) = 4 ÷ 2 = 2.0 (as linhas NULL não entram nem na soma nem na divisão). `x <> 1` só é TRUE para o 3: o 1 dá FALSE e os NULL dão UNKNOWN. `NOT (x <> 1)` só é TRUE para o 1, porque NOT UNKNOWN continua UNKNOWN. As duas consultas somam 2 linhas, não 4. Na quarta linha: NULL = NULL é UNKNOWN (None), NULL IS NULL é TRUE (1), 2 IN (1, 2, NULL) é TRUE (1) e 3 NOT IN (1, 2, NULL) é UNKNOWN (None). Por fim, sem nenhuma linha, SUM dá NULL, e COUNT dá 0.",code:`import sqlite3

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
q("SELECT SUM(x), COUNT(x) FROM t WHERE x > 5")`,answer:`(4, 2, 4, 2.0)
(1,)
(1,)
(None, 1, 1, None)
(None, 0)`}},{type:`exercise`,exercise:{id:`e7-null-4`,kind:`sql`,prompt:"A consulta inicial deveria listar **todos** os alunos com a `nota` deles em Banco de Dados (`disciplina_id = 2`), com NULL para quem não cursa a disciplina, em ordem de nome. Ela usa LEFT JOIN, mas Caio e Eva somem. Corrija-a, mantendo as colunas `nome` e `nota`.",difficulty:`intermediario`,skills:[`bd-joins`],hints:[`Antes do WHERE, que linhas o LEFT JOIN gera para Caio? E para Eva, que não tem matrícula?`,"Para essas linhas, quanto vale `m.disciplina_id = 2`? O WHERE as mantém?",`Em que parte da consulta um filtro escolhe os pares, em vez de apagar linhas do resultado pronto?`],explanation:"SELECT a.nome, m.nota FROM alunos a LEFT JOIN matriculas m ON m.aluno_id = a.id AND m.disciplina_id = 2 ORDER BY a.nome; No ON, o filtro decide quais matrículas formam par; quem fica sem par continua no resultado, com NULL. No WHERE, ele roda depois da junção e apaga as linhas de Caio (FALSE) e de Eva (UNKNOWN). Um conserto comum, e errado, é `WHERE m.disciplina_id = 2 OR m.disciplina_id IS NULL`: recupera Eva, cuja única linha é de NULL, mas não Caio, cujas linhas são de outras disciplinas.",setup:`CREATE TABLE alunos (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, curso TEXT, ano INTEGER);
CREATE TABLE disciplinas (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, creditos INTEGER);
CREATE TABLE matriculas (aluno_id INTEGER REFERENCES alunos(id), disciplina_id INTEGER REFERENCES disciplinas(id), nota REAL);
INSERT INTO alunos VALUES (1,'Ana','CC',2), (2,'Bia','SI',1), (3,'Caio','CC',3), (4,'Davi','ADS',1), (5,'Eva','CC',1);
INSERT INTO disciplinas VALUES (1,'Algoritmos',6), (2,'Banco de Dados',4), (3,'Redes',4), (4,'Cálculo',6);
INSERT INTO matriculas VALUES (1,1,9.0), (1,2,8.5), (2,2,7.0), (3,1,6.0), (3,3,8.0), (4,2,5.5), (1,4,7.5);
INSERT INTO alunos VALUES (6, 'Abel', NULL, 2);
INSERT INTO disciplinas VALUES (5, 'Sistemas Operacionais', 4);
INSERT INTO matriculas VALUES (2, 3, NULL), (6, 1, NULL), (6, 2, 7.0);`,starter:`SELECT a.nome, m.nota
FROM alunos a
LEFT JOIN matriculas m ON m.aluno_id = a.id
WHERE m.disciplina_id = 2
ORDER BY a.nome;`,solution:`SELECT a.nome, m.nota FROM alunos a LEFT JOIN matriculas m ON m.aluno_id = a.id AND m.disciplina_id = 2 ORDER BY a.nome;`,ordered:!0}},{type:`exercise`,exercise:{id:`e7-null-5`,kind:`fix`,lang:`python`,prompt:"Vamos simular a lógica de três valores em Python, com `None` no papel de UNKNOWN. O código usa `and`, `or`, `not` e `in` do próprio Python e acerta vários casos, mas não todos. Corrija as quatro funções para que sigam as tabelas do SQL:\n\n- `e3(a, b)`, `ou3(a, b)` e `nao3(a)` recebem True, False ou None e devolvem True, False ou None (o AND, o OR e o NOT do SQL);\n- `em3(x, valores)` é o `x IN (valores)` do SQL: `x` e os itens da lista (que nunca é vazia) são números ou None.\n\nDevolva exatamente True, False ou None, e não 1 ou 0.",difficulty:`intermediario`,skills:[`bd-joins`,`prog-condicionais`],hints:['Em Python, None é "falso" num if. Quanto vale `None and False`? E `None or False`? E `not None`? Compare com as tabelas da lição.',`No AND, que valor decide sozinho o resultado, seja qual for o outro lado? E no OR?`,`Depois de tratar o valor que decide sozinho, em que situação sobra UNKNOWN?`,"`x IN (a, b, c)` é `x = a OR x = b OR x = c`. Quanto vale cada = quando um dos lados é None? Você já tem a função que faz o OR."],explanation:'O `and` e o `or` do Python devolvem um dos operandos conforme ele seja "verdadeiro" ou "falso" num if, e None conta como falso. Daí `None and False` dá None (o SQL diz FALSE: um lado falso basta), `None or False` dá False (o SQL diz UNKNOWN) e `not None` dá True (o SQL diz UNKNOWN). A correção segue a regra da lição: no AND, FALSE decide sozinho; no OR, TRUE decide sozinho; fora isso, qualquer UNKNOWN deixa o resultado UNKNOWN. Já o `in` do Python usa ==, e `None == None` é True, então `None in [None]` dá True e `3 in [1, 2, None]` dá False, onde o SQL diz UNKNOWN nos dois casos. Escrevendo o IN como uma série de = ligados por `ou3`, com cada = valendo None quando um dos lados é None, o NOT IN sai de graça: `nao3(em3(3, [1, 2, None]))` é None.',starter:`# None faz o papel de UNKNOWN (o NULL lógico do SQL)

def e3(a, b):
    return a and b

def ou3(a, b):
    return a or b

def nao3(a):
    return not a

def em3(x, valores):
    return x in valores`,solution:`# None faz o papel de UNKNOWN (o NULL lógico do SQL)

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
    return resultado`,tests:[{name:`tabela do AND`,code:`_esperado = {
    (True, True): True, (True, False): False, (True, None): None,
    (False, True): False, (False, False): False, (False, None): False,
    (None, True): None, (None, False): False, (None, None): None,
}
for (a, b), esp in _esperado.items():
    r = e3(a, b)
    assert r is None or isinstance(r, bool), f"e3({a}, {b}) devolveu {r!r}: devolva exatamente True, False ou None, e não 1 ou 0"
    assert r is esp, f"e3({a}, {b}) deu {r!r}, esperado {esp!r}. No AND, um lado FALSE basta para dar FALSE; sem nenhum FALSE, qualquer UNKNOWN deixa o resultado UNKNOWN"`},{name:`tabela do OR`,code:`_esperado = {
    (True, True): True, (True, False): True, (True, None): True,
    (False, True): True, (False, False): False, (False, None): None,
    (None, True): True, (None, False): None, (None, None): None,
}
for (a, b), esp in _esperado.items():
    r = ou3(a, b)
    assert r is None or isinstance(r, bool), f"ou3({a}, {b}) devolveu {r!r}: devolva exatamente True, False ou None, e não 1 ou 0"
    assert r is esp, f"ou3({a}, {b}) deu {r!r}, esperado {esp!r}. No OR, um lado TRUE basta para dar TRUE; sem nenhum TRUE, qualquer UNKNOWN deixa o resultado UNKNOWN"`},{name:`NOT`,code:`for a, esp in [(True, False), (False, True), (None, None)]:
    r = nao3(a)
    assert r is None or isinstance(r, bool), f"nao3({a}) devolveu {r!r}: devolva exatamente True, False ou None, e não 1 ou 0"
    assert r is esp, f"nao3({a}) deu {r!r}, esperado {esp!r}: o contrário de desconhecido continua desconhecido"`},{name:`IN com NULL`,code:`casos = [
    (2, [1, 2, None], True, "um dos = deu TRUE, e para o OR isso basta"),
    (3, [1, 2, None], None, "3 = NULL poderia ser verdade"),
    (3, [1, 2], False, "sem NULL na lista e sem nenhum igual, é FALSE"),
    (None, [1, 2], None, "NULL = 1 e NULL = 2 são UNKNOWN"),
    (None, [None], None, "NULL = NULL é UNKNOWN, e não TRUE como em Python"),
    (1, [None, 1], True, "o igual pode aparecer depois do NULL"),
]
for x, valores, esp, porque in casos:
    r = em3(x, valores)
    assert r is esp, f"em3({x}, {valores}) deu {r!r}, esperado {esp!r}: {porque}"`},{name:`NOT IN com NULL`,code:`r = nao3(em3(3, [1, 2, None]))
assert r is None, f"3 NOT IN (1, 2, NULL) deveria ser UNKNOWN (None), veio {r!r}: um NULL na lista impede o NOT IN de dar TRUE"
r = nao3(em3(3, [1, 2]))
assert r is True, f"3 NOT IN (1, 2) deveria ser TRUE, veio {r!r}"
r = nao3(em3(1, [1, None]))
assert r is False, f"1 NOT IN (1, NULL) deveria ser FALSE, veio {r!r}: 1 = 1 já decide o IN"`},{name:`sem atalhos`,code:`assert "sqlite3" not in _source, "não use o sqlite3 para calcular as respostas: o exercício é escrever a lógica de três valores à mão"`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e7-null-desafio`,kind:`code`,lang:`python`,prompt:"A coordenação quer um boletim por disciplina. Escreva `boletim(con)`, que recebe uma conexão `sqlite3` com as tabelas da escola (`alunos`, `disciplinas`, `matriculas`) e devolve uma lista de tuplas `(nome, matriculados, pendentes, media)`, uma por disciplina, **inclusive as que não têm matrícula**, em ordem de nome (os nomes de disciplina são únicos):\n\n- `matriculados`: quantas matrículas a disciplina tem;\n- `pendentes`: quantas dessas matrículas ainda estão sem nota (nota NULL);\n- `media`: a média só das notas lançadas, sem arredondar, ou `None` se não houver nenhuma.\n\nResolva com **uma** consulta SQL. Os testes rodam sua função em vários bancos, inclusive com disciplinas sem matrícula e disciplinas só com notas pendentes.",difficulty:`avancado`,skills:[`bd-joins`,`bd-sql`],hints:[`Toda disciplina precisa aparecer, mesmo sem matrícula. Qual JOIN, e qual tabela fica à esquerda?`,`Numa disciplina sem matrícula, quantas linhas o LEFT JOIN gera? O que COUNT(*) conta nela?`,`Pendente é uma matrícula que existe e está sem nota. Que duas contagens, subtraídas, dão isso sem contar a linha de NULL do LEFT JOIN?`,`AVG já ignora os NULL. A média precisa de COALESCE?`],explanation:"SELECT d.nome, COUNT(m.disciplina_id), COUNT(m.disciplina_id) - COUNT(m.nota), AVG(m.nota) FROM disciplinas d LEFT JOIN matriculas m ON m.disciplina_id = d.id GROUP BY d.id, d.nome ORDER BY d.nome. O LEFT JOIN a partir de disciplinas preserva as sem matrícula. COUNT(m.disciplina_id) conta só os pares de verdade (a coluna da junção nunca é NULL num par), e COUNT(m.nota) só as notas lançadas: a diferença são as pendentes. Com COUNT(*), a disciplina sem matrícula teria 1 matriculado e 1 pendente, por causa da linha de NULL. AVG(m.nota) já é a média só das lançadas e dá NULL quando não há nenhuma; AVG(COALESCE(m.nota, 0)) responderia outra pergunta, com as pendentes valendo zero. E filtrar `WHERE m.nota IS NOT NULL` faria sumir as pendentes da contagem e as disciplinas só com pendentes.",starter:`import sqlite3

def boletim(con):
    # Uma tupla (nome, matriculados, pendentes, media) por disciplina,
    # inclusive as sem matrícula, em ordem de nome.
    sql = """
        SELECT d.nome
        FROM disciplinas d
        ORDER BY d.nome
    """
    return con.execute(sql).fetchall()`,solution:`import sqlite3

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
    return con.execute(sql).fetchall()`,tests:[{name:`banco da lição`,code:`import sqlite3 as _sqlite3

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

_ESCOLA_ALUNOS = [(1, "Ana"), (2, "Bia"), (3, "Caio"), (4, "Davi"), (5, "Eva"), (6, "Abel")]
_ESCOLA_DISCIPLINAS = [(1, "Algoritmos"), (2, "Banco de Dados"), (3, "Redes"), (4, "Cálculo"), (5, "Sistemas Operacionais")]
_ESCOLA_MATRICULAS = [(1, 1, 9.0), (1, 2, 8.5), (2, 2, 7.0), (3, 1, 6.0), (3, 3, 8.0), (4, 2, 5.5), (1, 4, 7.5)]
_ESCOLA_PENDENTES = [(2, 3, None), (6, 1, None), (6, 2, 7.0)]
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
_con = _banco(_ESCOLA_ALUNOS, _ESCOLA_DISCIPLINAS, _ESCOLA_MATRICULAS + _ESCOLA_PENDENTES)
_esperado = [
    ("Algoritmos", 3, 1, 7.5),
    ("Banco de Dados", 4, 0, 7.0),
    ("Cálculo", 1, 0, 7.5),
    ("Redes", 2, 1, 8.0),
    ("Sistemas Operacionais", 0, 0, None),
]
_confere_boletim(boletim(_con), _esperado, "banco da lição")`},{name:`sem matrícula e só pendentes`,code:`import sqlite3 as _sqlite3

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

_ESCOLA_ALUNOS = [(1, "Ana"), (2, "Bia"), (3, "Caio"), (4, "Davi"), (5, "Eva"), (6, "Abel")]
_ESCOLA_DISCIPLINAS = [(1, "Algoritmos"), (2, "Banco de Dados"), (3, "Redes"), (4, "Cálculo"), (5, "Sistemas Operacionais")]
_ESCOLA_MATRICULAS = [(1, 1, 9.0), (1, 2, 8.5), (2, 2, 7.0), (3, 1, 6.0), (3, 3, 8.0), (4, 2, 5.5), (1, 4, 7.5)]
_ESCOLA_PENDENTES = [(2, 3, None), (6, 1, None), (6, 2, 7.0)]
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
_con = _banco([(1, "Ana"), (2, "Bia"), (3, "Caio")],
              [(10, "Redes"), (20, "Grafos"), (30, "Compiladores")],
              [(1, 20, None), (2, 20, None), (1, 30, 8.0), (2, 30, None), (3, 30, 6.0)])
_esperado = [
    ("Compiladores", 3, 1, 7.0),
    ("Grafos", 2, 2, None),
    ("Redes", 0, 0, None),
]
_confere_boletim(boletim(_con), _esperado, "disciplina só com pendentes e disciplina sem matrícula")`},{name:`sem disciplinas`,code:`import sqlite3 as _sqlite3

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

_ESCOLA_ALUNOS = [(1, "Ana"), (2, "Bia"), (3, "Caio"), (4, "Davi"), (5, "Eva"), (6, "Abel")]
_ESCOLA_DISCIPLINAS = [(1, "Algoritmos"), (2, "Banco de Dados"), (3, "Redes"), (4, "Cálculo"), (5, "Sistemas Operacionais")]
_ESCOLA_MATRICULAS = [(1, 1, 9.0), (1, 2, 8.5), (2, 2, 7.0), (3, 1, 6.0), (3, 3, 8.0), (4, 2, 5.5), (1, 4, 7.5)]
_ESCOLA_PENDENTES = [(2, 3, None), (6, 1, None), (6, 2, 7.0)]
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
r = boletim(_banco([], [], []))
assert list(r) == [], f"sem disciplinas, o boletim é a lista vazia; veio {r!r}"`},{name:`bancos aleatórios`,code:`import sqlite3 as _sqlite3

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

_ESCOLA_ALUNOS = [(1, "Ana"), (2, "Bia"), (3, "Caio"), (4, "Davi"), (5, "Eva"), (6, "Abel")]
_ESCOLA_DISCIPLINAS = [(1, "Algoritmos"), (2, "Banco de Dados"), (3, "Redes"), (4, "Cálculo"), (5, "Sistemas Operacionais")]
_ESCOLA_MATRICULAS = [(1, 1, 9.0), (1, 2, 8.5), (2, 2, 7.0), (3, 1, 6.0), (3, 3, 8.0), (4, 2, 5.5), (1, 4, 7.5)]
_ESCOLA_PENDENTES = [(2, 3, None), (6, 1, None), (6, 2, 7.0)]
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
    _confere_boletim(boletim(_banco(alunos, disciplinas, matriculas)), _ref_boletim(disciplinas, matriculas), f"banco aleatório {rodada} (disciplinas {disciplinas}, matrículas {matriculas})")`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:`**Sistema de cadastro (parte 5, continuação)**: no boletim do aluno, mostre "pendente" quando a nota ainda não foi lançada. Faça isso na camada de apresentação, em Python, ou no SQL com \`COALESCE(CAST(nota AS TEXT), 'pendente')\` (no PostgreSQL, todos os argumentos do COALESCE precisam ser do mesmo tipo, por isso o CAST). Acrescente um relatório por disciplina com matriculados, pendentes e média, e escreva testes que cubram uma disciplina sem matrícula e uma só com notas pendentes.`},{type:`project`,projectId:`p3-cadastro`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- NULL é "não há valor": não é zero, nem texto vazio, nem falso.
- Comparação com NULL dá UNKNOWN, inclusive NULL = NULL. Para perguntar se falta o valor: IS NULL / IS NOT NULL.
- AND: FALSE decide sozinho. OR: TRUE decide sozinho. Fora isso, qualquer UNKNOWN deixa o resultado UNKNOWN; NOT UNKNOWN é UNKNOWN.
- WHERE, HAVING e ON só ficam com TRUE. \`p\` e \`NOT p\` juntos não cobrem as linhas em que p é UNKNOWN. CHECK, ao contrário, só rejeita FALSE.
- Um NULL na lista impede o NOT IN de dar TRUE.
- Comparação segura para nulos: IS [NOT] DISTINCT FROM; no SQLite, IS e IS NOT.
- COUNT(*) conta linhas; COUNT(col), SUM, AVG, MIN e MAX ignoram NULL. SUM de nada é NULL: COALESCE(SUM(x), 0).
- LEFT JOIN: filtro sobre a direita vai no ON (no WHERE, vira INNER JOIN); para contar pares, COUNT de uma coluna da direita que nunca é NULL num par.`},{type:`callout`,tone:`english`,text:`- **NULL / missing value**: NULL / valor ausente
- **three-valued logic, UNKNOWN**: lógica de três valores, desconhecido
- **null-safe comparison**: comparação segura para nulos (IS DISTINCT FROM)
- **preserved table**: tabela preservada (a da esquerda, no LEFT JOIN)
- **nullable column**: coluna que aceita NULL

Frase típica de entrevista: *"Putting that condition in the WHERE clause turns the left join into an inner join: rows without a match have NULLs there, the predicate evaluates to unknown, and they get filtered out. I'd move it into the ON clause."*

Frase da documentação do PostgreSQL: *"Do not write expression = NULL because NULL is not 'equal to' NULL. (The null value represents an unknown value, and it is not known whether two unknown values are equal.)"*`,title:`English corner`}]}],cards:[{id:`l7-null-tres-valores#1`,front:"Por que `WHERE nota = NULL` não devolve nenhuma linha, nem dá erro?",back:"Comparar com NULL dá UNKNOWN em toda linha, e o WHERE só fica com as linhas em que a condição é TRUE. O certo é `nota IS NULL`."},{id:`l7-null-tres-valores#2`,front:`Quanto valem FALSE AND UNKNOWN, TRUE AND UNKNOWN e TRUE OR UNKNOWN?`,back:`FALSE, UNKNOWN e TRUE. Se o resultado não depende do lado desconhecido, ele é certo; se depende, é UNKNOWN.`},{id:`l7-null-tres-valores#3`,front:"Por que `WHERE p` e `WHERE NOT p` juntos podem não trazer todas as linhas?",back:`Nas linhas em que p dá UNKNOWN, NOT p também dá UNKNOWN, e o WHERE descarta as duas.`},{id:`l7-null-tres-valores#4`,front:"Por que `3 NOT IN (1, 2, NULL)` não é TRUE?",back:"NOT IN é uma série de <> ligados por AND, e `3 <> NULL` é UNKNOWN: o AND não chega a TRUE."},{id:`l7-null-tres-valores#5`,front:`O que COUNT(*) e COUNT(nota) contam?`,back:`COUNT(*) conta linhas; COUNT(nota) conta só as linhas em que nota não é NULL.`},{id:`l7-null-tres-valores#6`,front:`AVG(nota) e AVG(COALESCE(nota, 0)) dividem a soma por quanto?`,back:`AVG(nota) divide por COUNT(nota), ignorando as pendentes; com COALESCE, divide por COUNT(*), e as pendentes valem zero.`},{id:`l7-null-tres-valores#7`,front:`Quanto dá SUM de uma coluna sem nenhum valor, e como trocar por 0?`,back:`Dá NULL, e não 0. Use COALESCE(SUM(x), 0).`},{id:`l7-null-tres-valores#8`,front:`Num LEFT JOIN, o que acontece se o filtro sobre a tabela da direita fica no WHERE?`,back:`As linhas sem par (com NULL) dão UNKNOWN e somem: o LEFT JOIN vira INNER JOIN. O filtro tem de ir no ON.`},{id:`l7-null-tres-valores#9`,front:`Num LEFT JOIN agrupado, por que COUNT(*) dá 1 para quem não tem par, e o que usar?`,back:`A linha de NULL criada pelo LEFT JOIN é uma linha. Conte uma coluna da direita que nunca é NULL num par, como COUNT(m.aluno_id).`},{id:`l7-null-tres-valores#10`,front:`Como comparar duas colunas tratando NULL como um valor comum?`,back:`Com IS DISTINCT FROM / IS NOT DISTINCT FROM (padrão SQL e PostgreSQL), ou IS NOT / IS no SQLite.`}]};export{e as default};
//# sourceMappingURL=l7-null-tres-valores-Bl5e9-g1.js.map