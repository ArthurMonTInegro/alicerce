var e={id:`l7-subconsultas`,moduleId:`m7-2`,title:`Subconsultas: IN, EXISTS e tabelas derivadas`,titleEn:`Subqueries: IN, EXISTS and derived tables`,summary:`Consultas dentro de consultas: a subconsulta escalar que compara cada linha com uma média, a correlacionada que é refeita para cada linha, IN e EXISTS para filtrar sem repetir linhas, NOT EXISTS no lugar do NOT IN que quebra com NULL, e tabelas derivadas e WITH para agregar antes de juntar sem multiplicar linhas.`,minutes:50,objectives:[`Comparar cada linha com um valor calculado usando uma subconsulta escalar, e prever o que acontece quando ela devolve zero ou várias linhas`,`Ler e escrever subconsultas correlacionadas, que dependem da linha de fora`,`Filtrar com IN e EXISTS (semijunção) sem as repetições que um JOIN produziria`,`Escrever anti-joins com NOT EXISTS e explicar por que NOT IN devolve vazio quando a subconsulta traz um NULL`,`Agregar antes de juntar, com tabelas derivadas e WITH, para evitar a multiplicação de linhas (fan-out)`],skills:[`bd-joins`,`bd-sql`],terms:[{pt:`subconsulta`,en:`subquery`,def:`Um SELECT entre parênteses dentro de outro comando SQL.`,example:`A subquery can appear in the SELECT list, in the FROM clause or in the WHERE clause.`},{pt:`subconsulta escalar`,en:`scalar subquery`,def:`Subconsulta que devolve uma coluna e no máximo uma linha, usada como um valor. Sem nenhuma linha, ela vale NULL.`,example:`ERROR: more than one row returned by a subquery used as an expression`},{pt:`subconsulta correlacionada`,en:`correlated subquery`,def:`Subconsulta que usa uma coluna da consulta de fora; logicamente, é refeita para cada linha de fora.`,example:`A correlated subquery is evaluated once for each row of the outer query.`},{pt:`semijunção`,en:`semi-join`,def:`Mantém as linhas da esquerda que têm pelo menos um par, cada uma uma única vez. É o que IN e EXISTS fazem.`,example:`The planner turned the EXISTS into a hash semi-join.`},{pt:`antijunção`,en:`anti-join`,def:`Mantém as linhas da esquerda que não têm nenhum par: NOT EXISTS, ou LEFT JOIN com IS NULL.`},{pt:`tabela derivada`,en:`derived table`,def:`Subconsulta no FROM, usada como se fosse uma tabela.`},{pt:`expressão de tabela comum`,en:`common table expression (CTE)`,def:`Subconsulta com nome, declarada com WITH antes do SELECT principal.`,example:`WITH totals AS (SELECT ...) SELECT ... FROM totals;`},{pt:`multiplicação de linhas`,en:`fan-out`,def:`O que acontece ao juntar, a partir da mesma linha, duas tabelas 1:N independentes: cada linha de uma se combina com cada linha da outra, e SUM e COUNT saem inflados.`}],references:[`postgres-docs`,`sqlite-docs`,`cmu-15445`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Algumas perguntas têm um passo no meio. "Quem tirou nota acima da média?" exige calcular a média **antes** de comparar. "Quais alunos não pagaram nenhuma mensalidade?" exige olhar outra tabela só para saber se existe alguma linha lá. "Quanto cada aluno já pagou, e quantos créditos cursa?" exige somar duas coisas separadamente antes de juntar.

Uma {{subconsulta|subquery}} é um SELECT entre parênteses dentro de outro, e resolve os três casos. Ela pode virar um valor (a média), uma lista (os ids de quem pagou), um teste de existência ou uma tabela inteira. Nesta lição você vai aprender a escolher entre essas formas e a escapar de duas armadilhas que passam em todos os testes feitos com dados limpos e quebram em produção: o NOT IN que encontra um NULL e o JOIN que multiplica as somas.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:"Nesta lição o banco da escola ganha a tabela `pagamentos(id, aluno_id, valor, forma)`, com as mensalidades pagas. Um dos pagamentos é um Pix que chegou **sem identificação** do aluno, com `aluno_id` NULL, e outro foi lançado pela secretaria sem a forma de pagamento (`forma` NULL).\n\n### Onde uma subconsulta pode aparecer"},{type:`table`,head:[`Forma`,`Devolve`,`Exemplo`],rows:[[`escalar, como um valor`,`uma coluna e no máximo uma linha`,"`WHERE nota > (SELECT AVG(nota) FROM matriculas)`"],[`lista, com IN / NOT IN`,`uma coluna, várias linhas`,"`WHERE id IN (SELECT aluno_id FROM pagamentos)`"],[`teste, com EXISTS / NOT EXISTS`,`qualquer coisa: só importa se há linha`,"`WHERE EXISTS (SELECT 1 FROM pagamentos p WHERE p.aluno_id = a.id)`"],[`tabela, no FROM ou no WITH`,`uma tabela inteira`,"`FROM (SELECT aluno_id, SUM(valor) AS pago FROM pagamentos GROUP BY aluno_id) AS t`"]]},{type:`md`,text:`### Subconsulta escalar
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

Esse COUNT dá 0 para disciplina sem matrícula, sem LEFT JOIN nem GROUP BY: o COUNT de nenhuma linha é 0.`},{type:`callout`,tone:`warn`,text:"Laço aninhado é o **significado**, não necessariamente a execução: o otimizador pode reescrever a consulta. Mas, no SQLite, o `EXPLAIN QUERY PLAN` de uma consulta assim costuma mostrar *CORRELATED SCALAR SUBQUERY*, e a subconsulta roda de novo para cada linha de fora. Com um índice na coluna da ligação (aqui, `matriculas(disciplina_id)`), cada rodada vira uma busca rápida; sem índice, é uma varredura por linha, O(n · m). Você vai medir isso com EXPLAIN no próximo módulo.",title:`Quanto custa`},{type:`md`,text:`### IN e EXISTS: filtrar sem repetir
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
\`\`\``},{type:`table`,head:[`Forma do anti-join`,`Com NULL na tabela de dentro`,`Observação`],rows:[["`NOT EXISTS (... WHERE p.aluno_id = a.id)`",`funciona`,`a forma recomendada; o PostgreSQL costuma executá-la como anti-junção (*Anti Join* no EXPLAIN)`],["`LEFT JOIN ... WHERE p.id IS NULL`",`funciona`,`o padrão da lição de JOINs; teste uma coluna que nunca é NULL num par`],["`NOT IN (SELECT aluno_id ...)`",`**devolve vazio**`,"só é seguro com `WHERE aluno_id IS NOT NULL` na subconsulta ou com a coluna NOT NULL; por causa do NULL, o otimizador também tem menos liberdade com ele"]]},{type:`callout`,tone:`warn`,text:`Esse bug passa em todos os testes feitos com dados "limpos". Ele aparece no dia em que entra a primeira linha com NULL na coluna da subconsulta, às vezes meses depois do deploy. Use NOT EXISTS por padrão; a página *Don't Do This*, na wiki do PostgreSQL, recomenda o mesmo.`,title:`Por que o NOT IN é perigoso`},{type:`md`,text:`### Tabelas derivadas e WITH: agregar antes de juntar
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

Cada CTE tem no máximo uma linha por aluno, então os dois LEFT JOIN são, na prática, 1:1, e nada se multiplica. O COALESCE da lição anterior põe 0 para quem não tem matrícula ou pagamento. Duas subconsultas escalares correlacionadas no SELECT dariam o mesmo resultado.`},{type:`callout`,tone:`tip`,text:`WITH não muda o que a consulta calcula; muda a leitura. Você dá nome a cada passo e lê de cima para baixo, como funções num programa. No PostgreSQL, desde a versão 12, uma CTE usada uma única vez (e que não é recursiva nem altera dados) é incorporada à consulta principal pelo otimizador; antes disso, ela era sempre calculada à parte, o que às vezes deixava tudo mais lento. Já a tabela derivada no FROM precisava de apelido no PostgreSQL até a versão 15: dê sempre um, que não custa nada.`,title:`WITH ou subconsulta no FROM?`},{type:`callout`,tone:`deep`,text:`Uma CTE pode se referir a si mesma. Com uma tabela \`prerequisitos(disciplina_id, pre_id)\`, todos os pré-requisitos, diretos e indiretos, da disciplina 7 saem assim:

\`\`\`
WITH RECURSIVE antes(id) AS (
  SELECT pre_id FROM prerequisitos WHERE disciplina_id = 7
  UNION
  SELECT p.pre_id FROM prerequisitos p JOIN antes ON p.disciplina_id = antes.id
)
SELECT d.nome FROM disciplinas d WHERE d.id IN (SELECT id FROM antes);
\`\`\`

A primeira parte dá os pré-requisitos diretos; a segunda é repetida, subindo um nível de cada vez, até não surgir nenhuma linha nova. É uma busca em grafo, como as que você escreveu em Python, só que em SQL. O UNION (e não UNION ALL) descarta as linhas repetidas, e por isso a recursão termina mesmo que o cadastro tenha um ciclo.`,title:`Uma CTE que chama a si mesma`}]},{stage:`exemplo`,blocks:[{type:`md`,text:`Vamos executar à mão a subconsulta correlacionada "acima da média da própria disciplina", nas 7 matrículas do banco da escola. Para cada linha de fora, a subconsulta calcula a média da disciplina daquela linha:`},{type:`table`,head:[`Linha de fora (m)`,`nota`,`Subconsulta: média da disciplina`,`nota > média?`],rows:[[`Ana, Algoritmos`,`9.0`,`(9.0 + 6.0) ÷ 2 = 7.5`,`TRUE: fica`],[`Ana, Banco de Dados`,`8.5`,`(8.5 + 7.0 + 5.5) ÷ 3 = 7.0`,`TRUE: fica`],[`Bia, Banco de Dados`,`7.0`,`7.0`,`FALSE`],[`Caio, Algoritmos`,`6.0`,`7.5`,`FALSE`],[`Caio, Redes`,`8.0`,`8.0 (só ele cursa)`,`FALSE`],[`Davi, Banco de Dados`,`5.5`,`7.0`,`FALSE`],[`Ana, Cálculo`,`7.5`,`7.5 (só ela cursa)`,`FALSE`]],caption:`Resultado: duas linhas. Numa disciplina com um aluno só, ninguém fica acima da média, porque a média é a própria nota. Logicamente, a subconsulta rodou 7 vezes, uma por linha de fora, e calculou a média de Banco de Dados três vezes.`},{type:`md`,text:"O mesmo raciocínio em Python, para acompanhar passo a passo: o `for` é a consulta de fora, e a lista `notas`, refeita a cada volta, é a subconsulta."},{type:`trace`,code:`matriculas = [("Ana", "Alg", 9.0), ("Caio", "Alg", 6.0),
              ("Ana", "BD", 8.5), ("Bia", "BD", 7.0), ("Davi", "BD", 5.5)]
acima = []
for aluno, disc, nota in matriculas:      # consulta de fora: uma linha por vez
    notas = [n for _, d, n in matriculas if d == disc]   # subconsulta, refeita a cada linha
    media = sum(notas) / len(notas)
    if nota > media:
        acima.append((aluno, disc, nota))
print(acima)`,caption:`Repare que a média de BD é recalculada para Ana, Bia e Davi: é o custo do laço aninhado.`},{type:`md`,text:`**A multiplicação de linhas, de perto.** Estas são as linhas de Ana no JOIN de alunos com matrículas, disciplinas e pagamentos, antes do GROUP BY:`},{type:`table`,head:[`Matrícula`,`Créditos`,`Pagamento`,`Valor`],rows:[[`Algoritmos`,`6`,`1 (Pix)`,`R$ 450,00`],[`Algoritmos`,`6`,`2 (boleto)`,`R$ 450,00`],[`Banco de Dados`,`4`,`1 (Pix)`,`R$ 450,00`],[`Banco de Dados`,`4`,`2 (boleto)`,`R$ 450,00`],[`Cálculo`,`6`,`1 (Pix)`,`R$ 450,00`],[`Cálculo`,`6`,`2 (boleto)`,`R$ 450,00`]],caption:`SUM dos créditos = 32, o dobro de 16: cada matrícula aparece uma vez por pagamento. SUM dos valores = R$ 2.700, o triplo de R$ 900: cada pagamento aparece uma vez por matrícula.`}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`import sqlite3

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
    GROUP BY a.id, a.nome
    ORDER BY a.nome""")
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
    LEFT JOIN pago p ON p.aluno_id = a.id
    ORDER BY a.nome""")`,runnable:!0,caption:`Troque o NOT IN por NOT IN (SELECT aluno_id FROM pagamentos WHERE aluno_id IS NOT NULL) e veja Davi aparecer. Depois apague o pagamento 5 do INSERT e rode de novo: o NOT IN original volta a funcionar, o que mostra por que o bug passa nos testes.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e7-subq-1`,kind:`mcq`,prompt:`Qual consulta lista as matrículas com nota **acima da média geral** de todas as matrículas?`,difficulty:`facil`,skills:[`bd-joins`,`bd-sql`],hints:[`Em que momento da execução o WHERE roda: antes ou depois das agregações?`,`Como calcular a média "à parte" e usar o resultado como um número?`],explanation:`A média precisa ser calculada antes da comparação, numa subconsulta escalar, que devolve uma coluna e uma linha e vira um valor. AVG direto no WHERE é recusado, porque o WHERE roda linha a linha, antes das agregações. No HAVING, o AVG é a média de cada grupo, e não da tabela. E uma subconsulta que devolve várias linhas não pode ser usada com >: é erro no PostgreSQL, e no SQLite usa só a primeira linha, em silêncio.`,options:[{text:`SELECT * FROM matriculas WHERE nota > AVG(nota);`,feedback:`O WHERE roda linha a linha, antes de qualquer agregação, e o banco recusa a consulta: no SQLite, "misuse of aggregate function AVG()"; no PostgreSQL, "aggregate functions are not allowed in WHERE".`},{text:`SELECT * FROM matriculas WHERE nota > (SELECT AVG(nota) FROM matriculas);`,correct:!0,feedback:`Isso: a subconsulta escalar calcula a média uma vez, e cada linha é comparada com esse número.`},{text:`SELECT nota FROM matriculas GROUP BY nota HAVING nota > AVG(nota);`,feedback:`Roda, mas o AVG do HAVING é a média de cada grupo, e cada grupo aqui reúne linhas com a mesma nota: a média do grupo é a própria nota, e nada é maior que si mesmo. Resultado vazio. O HAVING compara dentro do grupo, não com a tabela inteira.`},{text:`SELECT * FROM matriculas WHERE nota > (SELECT nota FROM matriculas);`,feedback:`A subconsulta devolve todas as notas, não a média. No PostgreSQL isso é erro (mais de uma linha numa subconsulta usada como valor); no SQLite, ela vale só a primeira linha (9.0 no banco da escola), e a consulta devolve vazio sem avisar.`}]}},{type:`exercise`,exercise:{id:`e7-subq-2`,kind:`predict`,lang:`python`,prompt:`O que este programa imprime? Os quatro primeiros números são quantidades de linhas. Atenção ao pagamento com aluno NULL.`,difficulty:`intermediario`,skills:[`bd-joins`],hints:[`No JOIN, quantos pares cada aluno forma? Quem tem dois pagamentos aparece quantas vezes?`,`IN pergunta se o id está na lista. Um aluno com dois pagamentos entra duas vezes no resultado?`,"Quanto vale `3 NOT IN (1, 1, 2, NULL)`? E para os outros alunos?",`Dentro do NOT EXISTS, a linha com aluno NULL forma par com alguém?`,`Uma subconsulta escalar que não encontra nenhuma linha vale o quê?`],explanation:"O JOIN devolve uma linha por par: Ana tem 2 pagamentos e Bia 1, então 3 linhas (o pagamento sem aluno não se liga a ninguém, e Caio não tem par). O IN é uma semijunção: Ana e Bia, uma vez cada, 2 linhas. O NOT IN encontra o NULL na lista: para Caio, `3 NOT IN (1, 1, 2, NULL)` é UNKNOWN, e para Ana e Bia é FALSE, então 0 linhas. O NOT EXISTS ignora a linha sem aluno (NULL = id é UNKNOWN, e ela só não conta como par) e devolve Caio: 1 linha. A última subconsulta escalar não encontra nenhum pagamento de Caio e vale NULL, que chega ao Python como None.",code:`import sqlite3

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
print(con.execute("SELECT (SELECT valor FROM pagamentos WHERE aluno_id = 3)").fetchone())`,answer:`3
2
0
1
(None,)`}},{type:`exercise`,exercise:{id:`e7-subq-3`,kind:`sql`,prompt:"O relatório de inadimplência usa a consulta inicial para listar os alunos **sem nenhum pagamento**, mas ele sai vazio, embora haja aluno que não pagou. Olhe a tabela `pagamentos`, descubra o motivo e corrija. Devolva só a coluna `nome`.",difficulty:`intermediario`,skills:[`bd-joins`],hints:["Rode `SELECT * FROM pagamentos;`. Há algum aluno_id estranho?","Para Davi, NOT IN vira uma série de <> ligados por AND. Quanto vale o pedaço `4 <> NULL`?",`Que forma de anti-join pergunta "existe algum pagamento deste aluno?" e não se abala com um NULL na tabela de dentro?`],explanation:"SELECT a.nome FROM alunos a WHERE NOT EXISTS (SELECT 1 FROM pagamentos p WHERE p.aluno_id = a.id); O Pix sem identificação (aluno_id NULL) põe um NULL na lista do NOT IN, e aí `id NOT IN (...)` nunca dá TRUE: para Davi, termina em `4 <> NULL`, UNKNOWN. Com NOT EXISTS, a linha anônima só não forma par com ninguém. Também servem o LEFT JOIN com `WHERE p.id IS NULL` (testando uma coluna que nunca é NULL num par: `p.forma IS NULL` traria também Bia, cujo pagamento está sem a forma registrada) e o NOT IN com `WHERE aluno_id IS NOT NULL` dentro da subconsulta, mas este último depende de alguém lembrar do filtro em toda consulta.",setup:`CREATE TABLE alunos (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, curso TEXT, ano INTEGER);
CREATE TABLE disciplinas (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, creditos INTEGER);
CREATE TABLE matriculas (aluno_id INTEGER REFERENCES alunos(id), disciplina_id INTEGER REFERENCES disciplinas(id), nota REAL);
INSERT INTO alunos VALUES (1,'Ana','CC',2), (2,'Bia','SI',1), (3,'Caio','CC',3), (4,'Davi','ADS',1), (5,'Eva','CC',1);
INSERT INTO disciplinas VALUES (1,'Algoritmos',6), (2,'Banco de Dados',4), (3,'Redes',4), (4,'Cálculo',6);
INSERT INTO matriculas VALUES (1,1,9.0), (1,2,8.5), (2,2,7.0), (3,1,6.0), (3,3,8.0), (4,2,5.5), (1,4,7.5);
CREATE TABLE pagamentos (id INTEGER PRIMARY KEY, aluno_id INTEGER REFERENCES alunos(id), valor REAL NOT NULL, forma TEXT);
INSERT INTO pagamentos VALUES (1, 1, 450.0, 'pix'), (2, 1, 450.0, 'boleto'), (3, 2, 380.0, NULL), (4, 3, 450.0, 'pix'), (5, NULL, 380.0, 'pix'), (6, 5, 450.0, 'cartao');`,starter:`SELECT nome FROM alunos
WHERE id NOT IN (SELECT aluno_id FROM pagamentos);`,solution:`SELECT a.nome FROM alunos a WHERE NOT EXISTS (SELECT 1 FROM pagamentos p WHERE p.aluno_id = a.id);`,ordered:!1}},{type:`exercise`,exercise:{id:`e7-subq-4`,kind:`sql`,prompt:"Para **cada aluno**, mostre `nome`, `creditos` (soma dos créditos das disciplinas em que está matriculado) e `pago` (soma dos pagamentos dele), com 0 onde não houver nada, do maior total pago para o menor; em empate, por nome. A consulta inicial junta tudo de uma vez: rode-a, confira os números de Ana e de Caio contra as tabelas e corrija.",difficulty:`avancado`,skills:[`bd-joins`,`bd-sql`],hints:[`Ana tem 3 matrículas e 2 pagamentos. Antes do GROUP BY, quantas linhas dela o JOIN produz?`,`Se cada aluno tivesse no máximo uma linha de créditos e uma linha de pagamentos, ainda haveria multiplicação?`,`Some os créditos por aluno numa subconsulta, some os pagamentos por aluno em outra (com WITH ou no FROM) e só então junte com alunos.`,`Quem não tem matrícula ou pagamento fica com NULL depois do LEFT JOIN. Como trocar por 0?`],explanation:`WITH cred AS (SELECT m.aluno_id, SUM(d.creditos) AS creditos FROM matriculas m JOIN disciplinas d ON d.id = m.disciplina_id GROUP BY m.aluno_id), pago AS (SELECT aluno_id, SUM(valor) AS pago FROM pagamentos GROUP BY aluno_id) SELECT a.nome, COALESCE(c.creditos, 0) AS creditos, COALESCE(p.pago, 0) AS pago FROM alunos a LEFT JOIN cred c ON c.aluno_id = a.id LEFT JOIN pago p ON p.aluno_id = a.id ORDER BY pago DESC, a.nome; Juntando as duas tabelas 1:N de uma vez, cada matrícula se combina com cada pagamento: Ana fica com 3 × 2 = 6 linhas (32 créditos e R$ 2.700), e Caio, com 2 matrículas e 1 pagamento, com 2 linhas (R$ 900 em vez de R$ 450). Agregando antes, cada lado tem no máximo uma linha por aluno, e nada se multiplica. Subconsultas escalares correlacionadas no SELECT também resolvem.`,setup:`CREATE TABLE alunos (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, curso TEXT, ano INTEGER);
CREATE TABLE disciplinas (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, creditos INTEGER);
CREATE TABLE matriculas (aluno_id INTEGER REFERENCES alunos(id), disciplina_id INTEGER REFERENCES disciplinas(id), nota REAL);
INSERT INTO alunos VALUES (1,'Ana','CC',2), (2,'Bia','SI',1), (3,'Caio','CC',3), (4,'Davi','ADS',1), (5,'Eva','CC',1);
INSERT INTO disciplinas VALUES (1,'Algoritmos',6), (2,'Banco de Dados',4), (3,'Redes',4), (4,'Cálculo',6);
INSERT INTO matriculas VALUES (1,1,9.0), (1,2,8.5), (2,2,7.0), (3,1,6.0), (3,3,8.0), (4,2,5.5), (1,4,7.5);
CREATE TABLE pagamentos (id INTEGER PRIMARY KEY, aluno_id INTEGER REFERENCES alunos(id), valor REAL NOT NULL, forma TEXT);
INSERT INTO pagamentos VALUES (1, 1, 450.0, 'pix'), (2, 1, 450.0, 'boleto'), (3, 2, 380.0, NULL), (4, 3, 450.0, 'pix'), (5, NULL, 380.0, 'pix'), (6, 5, 450.0, 'cartao');`,starter:`SELECT a.nome, COALESCE(SUM(d.creditos), 0) AS creditos, COALESCE(SUM(p.valor), 0) AS pago
FROM alunos a
LEFT JOIN matriculas m ON m.aluno_id = a.id
LEFT JOIN disciplinas d ON d.id = m.disciplina_id
LEFT JOIN pagamentos p ON p.aluno_id = a.id
GROUP BY a.id, a.nome
ORDER BY pago DESC, a.nome;`,solution:`WITH cred AS (SELECT m.aluno_id, SUM(d.creditos) AS creditos FROM matriculas m JOIN disciplinas d ON d.id = m.disciplina_id GROUP BY m.aluno_id), pago AS (SELECT aluno_id, SUM(valor) AS pago FROM pagamentos GROUP BY aluno_id) SELECT a.nome, COALESCE(c.creditos, 0) AS creditos, COALESCE(p.pago, 0) AS pago FROM alunos a LEFT JOIN cred c ON c.aluno_id = a.id LEFT JOIN pago p ON p.aluno_id = a.id ORDER BY pago DESC, a.nome;`,ordered:!0}},{type:`exercise`,exercise:{id:`e7-subq-5`,kind:`code`,lang:`python`,prompt:"Por baixo de um IN ou de um EXISTS, o banco não precisa comparar cada aluno com cada pagamento. O PostgreSQL, por exemplo, costuma montar uma tabela hash com as chaves da tabela de dentro (*Hash Semi Join* e *Hash Anti Join* no EXPLAIN) e consultá-la uma vez para cada linha de fora: O(n + m), em vez de O(n · m).\n\nFaça o mesmo em Python puro. `alunos` é uma lista de tuplas `(id, nome)`, com ids distintos (nomes podem se repetir); `pagamentos` é uma lista de tuplas `(id, aluno_id, valor)`, em que `aluno_id` pode ser `None` (Pix não identificado) ou um id que não está em `alunos`.\n\n- `com_pagamento(alunos, pagamentos)`: os nomes dos alunos com **pelo menos um** pagamento, como num `WHERE EXISTS`: cada aluno uma vez, na ordem de `alunos`.\n- `sem_pagamento(alunos, pagamentos)`: os nomes dos alunos **sem nenhum** pagamento, como num `WHERE NOT EXISTS`: um pagamento sem aluno não é de ninguém e não pode esconder ninguém.\n\nMeta: O(n + m).",difficulty:`intermediario`,skills:[`bd-joins`,`ed-hash`],hints:[`Para decidir sobre um aluno, você precisa da lista inteira de pagamentos, ou só de saber se o id dele aparece lá?`,`Que estrutura do nível 3 responde "este valor está aqui?" em O(1), em média?`,`Ana com dois pagamentos aparece quantas vezes? E duas alunas diferentes chamadas Ana: o que identifica um aluno, o nome ou o id?`,`Um None entre as chaves atrapalha a busca de um id inteiro num conjunto do Python?`],explanation:"Monte uma vez o conjunto dos aluno_id dos pagamentos, em O(m), e percorra os alunos testando `id in pagantes`, O(1) em média por aluno: O(n + m) no total. Percorrer a lista de alunos, e não a de pagamentos, garante cada aluno uma vez e na ordem certa, mesmo com vários pagamentos. Testar pelo id mantém duas Anas diferentes como dois alunos e não deixa a Ana que pagou esconder a Ana que não pagou (é o mesmo problema do DISTINCT por nome). O None no conjunto não atrapalha: nenhum id é None, então ele nunca é encontrado. Esse é o comportamento do NOT EXISTS; o NOT IN do SQL, com o NULL no meio, devolveria a lista vazia. Comparar cada aluno com cada pagamento, ou procurar o id numa lista (o `in` de lista percorre a lista inteira), custa O(n · m).",starter:`def com_pagamento(alunos, pagamentos):
    # alunos: lista de (id, nome); pagamentos: lista de (id, aluno_id, valor)
    # devolva os nomes de quem tem pelo menos um pagamento,
    # cada aluno uma vez, na ordem da lista alunos
    pass

def sem_pagamento(alunos, pagamentos):
    # devolva os nomes de quem não tem nenhum pagamento (como NOT EXISTS)
    pass`,solution:`def com_pagamento(alunos, pagamentos):
    pagantes = {aluno_id for _, aluno_id, _ in pagamentos}
    return [nome for id_, nome in alunos if id_ in pagantes]

def sem_pagamento(alunos, pagamentos):
    pagantes = {aluno_id for _, aluno_id, _ in pagamentos}
    return [nome for id_, nome in alunos if id_ not in pagantes]`,tests:[{name:`banco da lição`,code:`_alunos = [(1, "Ana"), (2, "Bia"), (3, "Caio"), (4, "Davi"), (5, "Eva")]
_pags = [(1, 1, 450.0), (2, 1, 450.0), (3, 2, 380.0), (4, 3, 450.0), (5, None, 380.0), (6, 5, 450.0)]
r = com_pagamento(_alunos, _pags)
assert r == ["Ana", "Bia", "Caio", "Eva"], f"com_pagamento deu {r!r}, esperado ['Ana', 'Bia', 'Caio', 'Eva']: cada aluno aparece uma vez, na ordem da lista de alunos, mesmo com vários pagamentos"
r = sem_pagamento(_alunos, _pags)
assert r == ["Davi"], f"sem_pagamento deu {r!r}, esperado ['Davi']: o Pix sem aluno (aluno_id None) não é de ninguém e não pode esconder ninguém, como no NOT EXISTS"`},{name:`nomes repetidos`,code:`_alunos = [(1, "Ana"), (2, "Ana"), (3, "Bia")]
r = sem_pagamento(_alunos, [(1, 2, 10.0)])
assert r == ["Ana", "Bia"], f"sem_pagamento deu {r!r}, esperado ['Ana', 'Bia']: só a Ana de id 2 pagou; a de id 1 não. Identifique o aluno pelo id, não pelo nome"
r = com_pagamento(_alunos, [(1, 1, 10.0), (2, 2, 10.0)])
assert r == ["Ana", "Ana"], f"com_pagamento deu {r!r}, esperado ['Ana', 'Ana']: são duas alunas diferentes com o mesmo nome, e as duas pagaram"`},{name:`bordas`,code:`assert com_pagamento([], [(1, 1, 5.0)]) == [], "sem alunos, com_pagamento devolve a lista vazia"
assert sem_pagamento([], []) == [], "sem alunos, sem_pagamento devolve a lista vazia"
_alunos = [(7, "Gil"), (8, "Hugo")]
r = com_pagamento(_alunos, [])
assert r == [], f"sem pagamentos, ninguém pagou; veio {r!r}"
r = sem_pagamento(_alunos, [])
assert r == ["Gil", "Hugo"], f"sem pagamentos, todos estão sem pagamento; veio {r!r}"
r = sem_pagamento(_alunos, [(1, None, 1.0), (2, 99, 1.0)])
assert r == ["Gil", "Hugo"], f"pagamento sem aluno ou de um aluno que não está na lista não esconde ninguém; veio {r!r}"
r = com_pagamento(_alunos, [(1, None, 1.0), (2, 99, 1.0), (3, 8, 2.0)])
assert r == ["Hugo"], f"esperado ['Hugo'], veio {r!r}"`},{name:`casos aleatórios`,code:`import random
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
    assert r == esp_sem, f"sem_pagamento({_alunos}, {_pags}) deu {r!r}, esperado {esp_sem!r}"`},{name:`3 000 alunos e 3 000 pagamentos`,code:`import random

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
assert r2 == [nm for i, nm in _alunos if int(i) not in pagantes], "sem_pagamento errou no teste com 3 000 alunos"`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e7-subq-desafio`,kind:`code`,lang:`python`,prompt:"A escola vai premiar o destaque de cada disciplina. Escreva `destaques(con)`, que recebe uma conexão `sqlite3` com as tabelas `alunos`, `disciplinas` e `matriculas` e devolve uma lista de tuplas `(disciplina, aluno, nota)`: para cada disciplina, o aluno com a **maior nota lançada** nela. Regras:\n\n- em empate no topo, **todos** os empatados aparecem;\n- nota NULL (não lançada) não concorre, e uma disciplina sem nenhuma nota lançada não aparece;\n- ordene por nome da disciplina e depois por nome do aluno (os nomes são únicos).\n\nResolva com **uma** consulta SQL, usando uma subconsulta. Os testes rodam sua função em vários bancos.",difficulty:`desafio`,skills:[`bd-joins`,`bd-sql`],hints:[`Para decidir se uma matrícula é destaque, que número você precisa conhecer? Ele depende de qual coluna da própria linha?`,`Esse número é a maior nota da disciplina daquela linha. Que tipo de subconsulta usa uma coluna da consulta de fora?`,`Imagine dois alunos empatados no topo. Um GROUP BY por disciplina devolve quantas linhas para ela?`,`E uma matrícula com nota NULL: quanto vale a sua condição para ela? Lembre que MAX ignora NULL, mas uma comparação com NULL dá UNKNOWN; e um NOT EXISTS sobre "alguém com nota maior"?`],explanation:"SELECT d.nome, a.nome, m.nota FROM matriculas m JOIN alunos a ON a.id = m.aluno_id JOIN disciplinas d ON d.id = m.disciplina_id WHERE m.nota = (SELECT MAX(m2.nota) FROM matriculas m2 WHERE m2.disciplina_id = m.disciplina_id) ORDER BY d.nome, a.nome. A subconsulta correlacionada calcula a maior nota da disciplina de cada linha, e todas as linhas com essa nota ficam, o que inclui os empates. O NULL se resolve sozinho: MAX ignora as notas NULL, `NULL = máximo` dá UNKNOWN e a linha sai, e numa disciplina só com pendentes o MAX é NULL e nada passa. Uma tabela derivada com o MAX por disciplina, juntada por disciplina e nota, também resolve. Duas tentativas comuns falham: `SELECT d.nome, a.nome, MAX(m.nota) ... GROUP BY d.id` roda no SQLite (ele pega o nome de uma das linhas com o máximo), mas devolve um aluno só por disciplina, mesmo com empate, e no PostgreSQL nem roda; e `WHERE NOT EXISTS (SELECT 1 ... WHERE m2.disciplina_id = m.disciplina_id AND m2.nota > m.nota)` premia as notas NULL, porque `m2.nota > NULL` nunca é TRUE e o NOT EXISTS vira TRUE (só funciona acrescentando `m.nota IS NOT NULL`).",starter:`import sqlite3

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
    return con.execute(sql).fetchall()`,solution:`import sqlite3

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
    return con.execute(sql).fetchall()`,tests:[{name:`banco da escola`,code:`import sqlite3 as _sqlite3

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
r = _linhas(destaques(_banco(_ESCOLA_ALUNOS, _ESCOLA_DISCIPLINAS, _ESCOLA_MATRICULAS)))
esperado = [("Algoritmos", "Ana", 9.0), ("Banco de Dados", "Ana", 8.5), ("Cálculo", "Ana", 7.5), ("Redes", "Caio", 8.0)]
assert r == esperado, f"veio {r!r}, esperado {esperado!r}. O destaque é o maior de cada disciplina, e não o maior da escola"`},{name:`empate no topo`,code:`import sqlite3 as _sqlite3

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
_con = _banco([(1, "Rui"), (2, "Lia"), (3, "Ivo"), (4, "Gal")],
              [(1, "Redes"), (2, "Grafos")],
              [(1, 1, 9.0), (2, 1, 9.0), (3, 1, 7.0), (4, 2, 6.0), (3, 2, 8.5), (1, 2, 8.5)])
r = _linhas(destaques(_con))
esperado = [("Grafos", "Ivo", 8.5), ("Grafos", "Rui", 8.5), ("Redes", "Lia", 9.0), ("Redes", "Rui", 9.0)]
assert r == esperado, f"veio {r!r}, esperado {esperado!r}. Em empate, todos os empatados aparecem: agrupar por disciplina devolve uma linha só por grupo"`},{name:`notas pendentes`,code:`import sqlite3 as _sqlite3

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
_con = _banco([(1, "Rui"), (2, "Lia"), (3, "Ivo")],
              [(1, "Redes"), (2, "Grafos"), (3, "Compiladores")],
              [(1, 1, None), (2, 1, 7.0), (3, 1, None), (1, 2, None), (2, 2, None), (3, 3, 6.0)])
r = _linhas(destaques(_con))
esperado = [("Compiladores", "Ivo", 6.0), ("Redes", "Lia", 7.0)]
assert r == esperado, f"veio {r!r}, esperado {esperado!r}. Nota NULL não concorre, e Grafos, só com notas pendentes, não tem destaque. Se apareceram linhas com None, pense no que a sua condição dá quando m.nota é NULL"`},{name:`sem matrículas`,code:`import sqlite3 as _sqlite3

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
r = _linhas(destaques(_banco([(1, "Rui")], [(1, "Redes")], [])))
assert r == [], f"sem matrículas, não há destaques; veio {r!r}"`},{name:`bancos aleatórios`,code:`import sqlite3 as _sqlite3

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
    assert r == esperado, f"banco aleatório {rodada}: veio {r!r}, esperado {esperado!r} (alunos {alunos}, disciplinas {disciplinas}, matrículas {matriculas})"`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:"**Sistema de cadastro (parte 5, relatórios)**: acrescente três relatórios com subconsultas, cada um com teste num banco `:memory:`: (1) alunos com alguma nota abaixo da média da própria disciplina (subconsulta correlacionada); (2) disciplinas sem nenhum aluno matriculado (NOT EXISTS); (3) o destaque de cada disciplina, com empates. Em cada teste, insira uma linha com NULL na coluna usada pela subconsulta e confirme que o resultado continua certo."},{type:`project`,projectId:`p3-cadastro`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Subconsulta escalar: uma coluna, no máximo uma linha; sem linha, vale NULL. Com várias, é erro no PostgreSQL, e o SQLite usa a primeira, em silêncio.
- Agregação não vai no WHERE: calcule-a numa subconsulta.
- Subconsulta correlacionada: usa uma coluna de fora e, logicamente, é refeita para cada linha de fora (um laço aninhado). Um índice na coluna da ligação ajuda.
- JOIN devolve uma linha por par; para filtrar pela existência de um par, sem repetir, use IN ou EXISTS (semijunção).
- Anti-join: NOT EXISTS por padrão. NOT IN com um NULL na subconsulta devolve vazio.
- Juntar duas tabelas 1:N independentes multiplica as linhas (fan-out): agregue cada lado antes, numa tabela derivada ou num WITH.
- WITH dá nome aos passos; WITH RECURSIVE percorre hierarquias.`},{type:`callout`,tone:`english`,text:`- **subquery / nested query**: subconsulta
- **scalar subquery**: subconsulta escalar
- **correlated subquery**: subconsulta correlacionada
- **semi-join / anti-join**: semijunção / antijunção
- **derived table, CTE (WITH clause)**: tabela derivada, expressão de tabela comum
- **fan-out**: multiplicação de linhas num JOIN

Frase típica de entrevista: *"I'd use NOT EXISTS rather than NOT IN here: if the subquery ever returns a NULL, NOT IN can never be true, and the query silently returns no rows."*

Frase da documentação do PostgreSQL sobre NOT IN: *"Note that if the left-hand expression yields null, or if there are no equal right-hand values and at least one right-hand row yields null, the result of the NOT IN construct will be null, not true."*`,title:`English corner`}]}],cards:[{id:`l7-subconsultas#1`,front:"Por que `WHERE nota > AVG(nota)` não funciona, e como resolver?",back:"O WHERE roda linha a linha, antes das agregações. Calcule a média numa subconsulta escalar: `WHERE nota > (SELECT AVG(nota) FROM matriculas)`."},{id:`l7-subconsultas#2`,front:`Quanto vale uma subconsulta escalar sem nenhuma linha? E uma com várias?`,back:`Sem linhas, NULL. Com várias, é erro no PostgreSQL; o SQLite usa a primeira linha, sem avisar.`},{id:`l7-subconsultas#3`,front:`O que torna uma subconsulta correlacionada, e qual é o significado dela?`,back:`Ela usa uma coluna da consulta de fora. Logicamente, é refeita para cada linha de fora, como um laço aninhado.`},{id:`l7-subconsultas#4`,front:`Por que filtrar com JOIN pode repetir linhas, e o que usar no lugar?`,back:`O JOIN devolve uma linha por par, e quem tem vários pares aparece várias vezes. Para filtrar pela existência de um par, use IN ou EXISTS (semijunção): cada linha aparece uma vez.`},{id:`l7-subconsultas#5`,front:"Por que `id NOT IN (SELECT aluno_id FROM pagamentos)` pode devolver zero linhas?",back:"Se a subconsulta trouxer um NULL, cada `id <> NULL` é UNKNOWN, e o NOT IN nunca chega a TRUE."},{id:`l7-subconsultas#6`,front:`Qual é a forma recomendada de anti-join, e por quê?`,back:`NOT EXISTS com a condição de ligação: um NULL na tabela de dentro não o afeta, e o otimizador sabe executá-lo como anti-junção.`},{id:`l7-subconsultas#7`,front:`O que é fan-out num JOIN, e como evitá-lo?`,back:`Juntar duas tabelas 1:N independentes combina cada linha de uma com cada linha da outra e infla SUM e COUNT. Agregue cada lado antes (tabela derivada ou WITH) e junte depois.`},{id:`l7-subconsultas#8`,front:`Para que serve o WITH?`,back:`Para dar nome a subconsultas (CTEs) e ler a consulta em passos, de cima para baixo. WITH RECURSIVE percorre hierarquias, como cadeias de pré-requisitos.`}]};export{e as default};
//# sourceMappingURL=l7-subconsultas-C9joyVeh.js.map