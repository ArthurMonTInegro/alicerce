var e={id:`l7-otimizacao-consultas`,moduleId:`m7-3`,title:`Otimização de consultas: índices compostos e EXPLAIN`,titleEn:`Query optimization: composite indexes and EXPLAIN`,summary:`Como um índice B-tree é organizado por dentro, por que a ordem das colunas de um índice composto decide quais consultas ele acelera (regra do prefixo mais à esquerda), índices de cobertura, condições que impedem o uso do índice, como ler o EXPLAIN do SQLite e do PostgreSQL e como achar e corrigir o problema N+1.`,minutes:50,objectives:[`Explicar como uma B-tree acha uma chave e lê um intervalo, e por que poucas páginas bastam para milhões de linhas`,`Escolher a ordem das colunas de um índice composto pela regra do prefixo mais à esquerda: igualdades primeiro, depois um intervalo ou a ordenação`,`Ler planos do SQLite (SCAN, SEARCH, COVERING INDEX, TEMP B-TREE) e do PostgreSQL (Seq Scan, Index Scan, Index Only Scan, Bitmap Heap Scan)`,`Reescrever condições que escondem a coluna do índice e reconhecer quando um índice não compensa (seletividade)`,`Reconhecer o problema N+1 e trocá-lo por uma consulta com JOIN e GROUP BY`],skills:[`bd-modelagem`],terms:[{pt:`página`,en:`page`,def:`Bloco de tamanho fixo em que o banco guarda tabelas e índices: 4 KiB no SQLite e 8 KiB no PostgreSQL, por padrão.`},{pt:`fator de ramificação`,en:`fan-out`,def:`Quantos filhos cada página interna de uma B-tree aponta. Quanto maior, mais baixa a árvore.`},{pt:`índice composto`,en:`composite index (multicolumn index)`,def:`Índice sobre várias colunas, ordenado pela primeira e, dentro de cada valor dela, pela segunda, e assim por diante.`},{pt:`prefixo mais à esquerda`,en:`leftmost prefix`,def:`Regra de uso de um índice composto: ele só desce na árvore pelas suas primeiras colunas, em ordem.`,example:`The index is most efficient when there are constraints on the leading (leftmost) columns.`},{pt:`índice de cobertura`,en:`covering index`,def:`Índice que contém todas as colunas que a consulta usa, dispensando a visita à tabela.`},{pt:`condição sargável`,en:`sargable predicate`,def:`Condição que um índice consegue usar para descer na árvore, como coluna = valor ou coluna >= valor (de Search ARGument ABLE).`},{pt:`índice de expressão`,en:`expression index`,def:`Índice sobre o resultado de uma expressão, como lower(email), e não sobre a coluna pura.`},{pt:`varredura completa`,en:`full table scan`,def:`Ler todas as linhas da tabela: SCAN no SQLite, Seq Scan no PostgreSQL.`},{pt:`seletividade`,en:`selectivity`,def:`Fração das linhas que uma condição deixa passar. Quanto menor, mais um índice ajuda.`},{pt:`planejador de consultas`,en:`query planner (optimizer)`,def:`Parte do banco que escolhe o plano de execução de cada consulta, estimando o custo das alternativas.`,example:`The planner chose a sequential scan because the filter is not selective.`},{pt:`problema N+1`,en:`N+1 query problem`,def:`Uma consulta para buscar uma lista e mais uma consulta para cada item dela.`,example:`Use eager loading to avoid the N+1 query problem.`},{pt:`carregamento antecipado`,en:`eager loading`,def:`Buscar de uma vez os dados relacionados de que o código vai precisar, em vez de um item por vez.`}],references:[`postgres-docs`,`sqlite-docs`,`cmu-15445`,`ddia`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:"Na primeira lição deste módulo, um índice em `email` trocou o `SCAN` (varrer a tabela) por `SEARCH ... USING INDEX` (ir direto na linha). Consultas de verdade raramente são tão simples: têm duas ou três condições, um ORDER BY com LIMIT, um JOIN. E aí aparecem as surpresas: o índice existe e o banco não o usa; ele usa, mas ainda ordena milhares de linhas à parte; a tela lista cem pedidos e dispara cento e uma consultas.\n\nOtimizar uma consulta é um ciclo curto: **ler o plano** com EXPLAIN, achar onde o banco lê ou ordena mais do que precisa, corrigir (com o índice certo ou reescrevendo a consulta) e medir de novo. Para fazer isso sem chutar, você precisa de um modelo de como o índice funciona por dentro. Com ele, a regra mais importante desta lição deixa de ser decoreba: num índice composto, **a ordem das colunas** decide quais consultas ele acelera."}]},{stage:`explicacao`,blocks:[{type:`md`,text:`### Por dentro de um índice B-tree
Um índice B-tree é, no fundo, uma **lista ordenada** de entradas, cada uma com o valor indexado e o endereço da linha na tabela (no SQLite, o rowid; no PostgreSQL, a posição física da linha). Essa lista é guardada em {{páginas|pages}} de tamanho fixo (4 KiB por padrão no SQLite, 8 KiB no PostgreSQL), as **folhas**, e por cima delas há páginas internas que funcionam como um sumário: "chaves até X, desça por aqui".

Como cada página interna aponta para centenas de páginas abaixo (é o {{fator de ramificação|fan-out}}), a árvore é baixíssima: com 100 filhos por página, 3 níveis já cobrem 1 milhão de entradas, e 4 níveis, 100 milhões. Segundo a documentação do PostgreSQL, mais de 99% das páginas de um índice B-tree costumam ser folhas.

O índice faz bem duas coisas, e tudo o que ele acelera sai delas:

1. **Descer**: da raiz até a folha, achar a primeira entrada maior ou igual a um valor. São poucas páginas, O(log n), como a busca binária do Nível 4, só que com centenas de caminhos por passo em vez de dois.
2. **Percorrer**: dali em diante, ler as entradas **em ordem**, até a condição deixar de valer.

Igualdade (\`=\`), intervalo (\`>=\`, \`<\`, \`BETWEEN\`) e ORDER BY sem ordenar à parte são combinações dessas duas operações.

### Índice composto: a ordem das colunas importa
Um {{índice composto|composite index}} em \`(cnpj, emitida_em)\` ordena as entradas por cnpj e, **dentro do mesmo cnpj**, por data. É como a lista de chamada de uma escola, ordenada por turma e, dentro da turma, por nome: achar a turma 3B é fácil, achar a Ana da 3B também; já achar todas as Anas da escola obriga a abrir a lista de cada turma.`},{type:`table`,head:[`Condição (índice em cnpj, emitida_em)`,`O índice ajuda?`,`Por quê`],rows:[["`cnpj = ?`",`sim`,`as notas do CNPJ estão juntas: desce até a primeira e percorre`],["`cnpj = ? AND emitida_em >= ? AND emitida_em < ?`",`sim, nas duas colunas`,`dentro do CNPJ, as datas estão em ordem: o intervalo é um trecho contínuo`],["`cnpj = ? ORDER BY emitida_em DESC LIMIT 10`",`sim, e sem ordenar`,`basta ler o trecho do CNPJ de trás para frente e parar na 10ª entrada`],["`emitida_em >= ?` (sem cnpj)",`não para descer`,`as datas estão espalhadas, um pedaço em cada CNPJ; no máximo dá para varrer o índice inteiro`],["`cnpj > ? AND emitida_em = ?`",`só na primeira coluna`,`depois de um intervalo em cnpj, as datas não formam mais um trecho contínuo, e cada entrada é conferida uma a uma`]],caption:`O índice serve às condições que fixam as suas primeiras colunas, em ordem.`},{type:`md`,text:"É a regra do {{prefixo mais à esquerda|leftmost prefix}}. Para montar um índice composto para uma consulta:\n\n1. primeiro, as colunas comparadas por **igualdade** (`=` ou `IN`);\n2. depois, **uma** coluna de intervalo **ou** a coluna do ORDER BY;\n3. por fim, se valer a pena, colunas que a consulta só lê, para o índice cobri-la (veja abaixo).\n\nUm índice em `(a, b)` também serve a quem só precisa de `a`. Por isso, quando você cria `(a, b)`, um índice sozinho em `(a)` costuma virar peso morto."},{type:`callout`,tone:`deep`,text:`O SQLite e o PostgreSQL (a partir da versão 18) têm o *skip scan*: quando a primeira coluna tem poucos valores distintos, o banco pode pular de valor em valor dela e usar o índice para a segunda coluna. No SQLite, isso só acontece depois que um ANALYZE mostra que a primeira coluna se repete muito. É uma otimização oportunista: projete o índice pela regra do prefixo e trate o skip scan como bônus.`,title:`E se a consulta não usar a primeira coluna?`},{type:`md`,text:"### Índice de cobertura\nAchar a entrada no índice é só metade do trabalho: com o endereço em mãos, o banco ainda visita a tabela para buscar as outras colunas, e cada visita pode cair numa página diferente. Se **todas** as colunas que a consulta usa estão no índice, essa segunda etapa some: é um {{índice de cobertura|covering index}}. O SQLite mostra `USING COVERING INDEX`; o PostgreSQL, `Index Only Scan`. No SQLite, o rowid já faz parte de cada entrada, então `SELECT id` sai de graça; no PostgreSQL, `CREATE INDEX ... ON notas (cnpj, emitida_em) INCLUDE (valor)` acrescenta colunas só para leitura. O preço é um índice maior.\n\n### Condições que escondem a coluna\nO índice está ordenado pelos **valores da coluna**. Se a condição aplica uma função ou uma conta à coluna, o banco não sabe onde descer e volta a conferir linha por linha. Uma condição que o índice consegue usar é uma {{condição sargável|sargable predicate}} (de *Search ARGument ABLE*)."},{type:`table`,head:[`Em vez de`,`Escreva`,`Por quê`],rows:[["`WHERE strftime('%Y-%m', emitida_em) = '2025-03'`","`WHERE emitida_em >= '2025-03-01' AND emitida_em < '2025-04-01'`",`o intervalo usa a ordem do índice; a função, não`],["`WHERE lower(email) = ?`","guarde o e-mail já normalizado, ou crie um {{índice de expressão|expression index}}: `CREATE INDEX idx_email_min ON usuarios(lower(email))`","o índice comum está ordenado por `email`, não por `lower(email)`"],["`WHERE valor_centavos * 2 > 10000`","`WHERE valor_centavos > 5000`",`deixe a coluna sozinha de um lado da comparação`],["`WHERE nome LIKE '%silva'`","busca textual (FTS5 no SQLite, `tsvector` no PostgreSQL)",`sem o começo do texto, não há onde descer`]]},{type:`md`,text:"Até o prefixo (`LIKE 'silva%'`) só desce no índice em certas condições: no SQLite, o LIKE ignora maiúsculas e minúsculas por padrão e precisa de um índice com `COLLATE NOCASE`; no PostgreSQL, de colação C ou da classe de operadores `text_pattern_ops`.\n\n### Lendo o plano"},{type:`table`,head:[`SQLite: EXPLAIN QUERY PLAN`,`PostgreSQL: EXPLAIN`,`O que significa`],rows:[["`SCAN notas`","`Seq Scan on notas`",`{{varredura completa|full table scan}}: lê a tabela inteira`],["`SCAN notas USING INDEX i` ou `USING COVERING INDEX i`","`Index Scan` ou `Index Only Scan` sem `Index Cond`",`percorre o índice **inteiro** (em geral para entregar em ordem); ainda é varredura completa`],["`SEARCH notas USING INDEX i (cnpj=? AND emitida_em>?)`","`Index Scan using i` com `Index Cond: ...`",`desce na árvore e percorre só um trecho; os parênteses dizem quais colunas foram usadas para descer`],["`SEARCH notas USING COVERING INDEX i (...)`","`Index Only Scan using i`",`responde só com o índice, sem visitar a tabela`],["`SEARCH notas USING INTEGER PRIMARY KEY (rowid=?)`","`Index Scan using notas_pkey`",`busca pela chave primária`],["`USE TEMP B-TREE FOR ORDER BY`","`Sort`",`precisou ordenar à parte`],["`SEARCH p USING AUTOMATIC COVERING INDEX (cliente_id=?)`",`(não existe)`,`o SQLite montou um índice temporário só para esta execução: sinal de índice faltando`],[`(não existe)`,"`Bitmap Index Scan` + `Bitmap Heap Scan`",`junta os endereços de muitas entradas e lê as páginas da tabela na ordem física: o meio-termo entre Index Scan e Seq Scan`]]},{type:`callout`,tone:`warn`,text:"O `EXPLAIN` do PostgreSQL mostra o plano com custos e linhas **estimados**. `EXPLAIN ANALYZE` **executa** a consulta e mostra também o tempo e as linhas reais de cada etapa; uma diferença grande entre linhas estimadas e reais costuma indicar estatísticas desatualizadas. Como ele executa de verdade, um `EXPLAIN ANALYZE` de UPDATE ou DELETE muda os dados: rode `BEGIN; EXPLAIN ANALYZE ...; ROLLBACK;`.",title:`EXPLAIN ANALYZE executa`},{type:`callout`,tone:`deep`,text:"O {{planejador de consultas|query planner}} do PostgreSQL decide por custo: para cada plano possível, estima quantas linhas cada etapa vai produzir e quanto isso custa, e fica com o mais barato. As estimativas vêm de estatísticas por coluna (valores mais comuns, histogramas), que o `ANALYZE` coleta e o autovacuum atualiza de tempos em tempos. A {{seletividade|selectivity}} de uma condição é a fração das linhas que ela deixa passar. Uma condição muito seletiva (um CPF, uma chave de nota) vai de Index Scan. Uma que deixa passar boa parte da tabela vai de Seq Scan: ler a tabela em sequência sai mais barato do que pular de entrada em entrada do índice para páginas espalhadas. No meio do caminho aparece o Bitmap Heap Scan. O SQLite também decide por custo e usa as estatísticas do `ANALYZE` (a documentação recomenda rodar `PRAGMA optimize` de vez em quando), com um modelo mais simples.",title:`Por que o banco às vezes ignora o índice`},{type:`md`,text:'### O problema N+1\nO plano de **uma** consulta pode estar perfeito e a tela continuar lenta, porque o problema está no programa: uma consulta para buscar a lista e mais **uma por item** dela. É o {{problema N+1|N+1 query problem}}:\n\n```python\nclientes = con.execute("SELECT id, nome FROM clientes").fetchall()   # 1 consulta\nfor cid, nome in clientes:                                             # + N consultas\n    total = con.execute("SELECT SUM(valor_centavos) FROM pedidos WHERE cliente_id = ?", (cid,)).fetchone()\n```\n\nNum banco cliente-servidor como o PostgreSQL, cada consulta paga pelo menos uma ida e volta pela rede, além de ser analisada e planejada. Com 100 clientes, são 101 idas e voltas para o que uma consulta com JOIN e GROUP BY entrega de uma vez. Os ORMs produzem N+1 sem você ver, quando o código acessa um relacionamento dentro de um laço; para isso eles oferecem o {{carregamento antecipado|eager loading}} (`select_related` e `prefetch_related` no Django, `joinedload` e `selectinload` no SQLAlchemy).\n\nO SQLite é um caso à parte: ele roda dentro do seu processo, sem rede, e a própria documentação diz que muitas consultas pequenas são eficientes nele. Mesmo assim, cada uma das N consultas precisa de um índice na coluna da ligação; sem ele, cada uma varre a tabela inteira.'},{type:`callout`,tone:`tip`,text:"Indexe as chaves estrangeiras que você usa para juntar ou filtrar. Nem o SQLite nem o PostgreSQL fazem isso sozinhos: a chave primária e as colunas UNIQUE ganham índice automaticamente, mas a coluna que referencia outra tabela, não. E lembre que cada índice deixa INSERT, UPDATE e DELETE mais lentos: no PostgreSQL, a visão `pg_stat_user_indexes` mostra quantas vezes cada índice foi usado (`idx_scan`), e a extensão `pg_stat_statements` mostra quais consultas consomem mais tempo. Otimize o que as medições apontam."}]},{stage:`exemplo`,blocks:[{type:`md`,text:"Um sistema de notas fiscais eletrônicas tem a tabela `notas(id, cnpj, uf, emitida_em, valor)`, com 20 000 notas de 500 emitentes. A tela do emitente faz duas consultas: as **10 últimas notas** de um CNPJ e o **faturamento de março** desse CNPJ, que lê só `emitida_em` e `valor`. Os planos abaixo são os do SQLite, os mesmos que o código da próxima etapa imprime."},{type:`table`,head:[`Índice`,"Últimas 10: `cnpj = ? ORDER BY emitida_em DESC LIMIT 10`","Março: `cnpj = ? AND emitida_em >= ? AND emitida_em < ?`"],rows:[[`nenhum`,"`SCAN notas` + `USE TEMP B-TREE FOR ORDER BY`: lê as 20 000 linhas e ordena as do CNPJ","`SCAN notas`: lê as 20 000 linhas"],["`(cnpj)`","`SEARCH ... (cnpj=?)` + `USE TEMP B-TREE FOR ORDER BY`: lê só as cerca de 40 notas do CNPJ, mas ainda ordena","`SEARCH ... (cnpj=?)`: lê as cerca de 40 notas e confere a data de cada uma"],["`(cnpj, emitida_em)`","`SEARCH ... (cnpj=?)`, sem ordenar: lê o trecho de trás para frente e para na 10ª","`SEARCH ... (cnpj=? AND emitida_em>? AND emitida_em<?)`: desce direto no começo de março"],["`(cnpj, emitida_em, valor)`",`igual à linha de cima`,"`SEARCH ... USING COVERING INDEX (...)`: nem visita a tabela"],["`(emitida_em, cnpj)`","`SCAN notas USING INDEX ...`: percorre o índice inteiro, de trás para frente, procurando o CNPJ","`SEARCH ... (emitida_em>? AND emitida_em<?)`: lê as notas de março de todos os CNPJs"]],caption:`As mesmas colunas em outra ordem mudam tudo: em (emitida_em, cnpj), o CNPJ deixa de ser o prefixo.`},{type:`md`,text:"Descer no índice é uma busca binária generalizada. Acompanhe uma numa folha de índice minúscula sobre `uf`, em que cada entrada é `(uf, id)`: primeiro a descida até a primeira entrada de SP, depois a leitura em ordem enquanto a condição vale."},{type:`trace`,code:`# folha de um índice em uf: entradas (uf, id), em ordem
indice = [("BA", 9), ("MG", 3), ("RJ", 2), ("SP", 1), ("SP", 4), ("SP", 5), ("SP", 7)]
alvo = "SP"

lo, hi = 0, len(indice)
while lo < hi:                  # descer: a primeira entrada com uf >= alvo
    meio = (lo + hi) // 2
    if indice[meio][0] < alvo:
        lo = meio + 1
    else:
        hi = meio

achados = []
i = lo
while i < len(indice) and indice[i][0] == alvo:   # percorrer em ordem
    achados.append(indice[i][1])
    i += 1
print("desceu até a posição", lo, "e achou os ids", achados)`,caption:`Três comparações para achar o começo e uma leitura em sequência. Num índice de verdade, cada passo da descida é uma página com centenas de chaves.`}]},{stage:`codigo`,blocks:[{type:`md`,text:`Rode o experimento do exemplo: o mesmo banco, quatro situações de índice, o plano e o tempo médio de cada consulta.`},{type:`code`,lang:`python`,code:`import random, sqlite3, time

random.seed(2025)
con = sqlite3.connect(":memory:")
con.execute("CREATE TABLE notas (id INTEGER PRIMARY KEY, cnpj TEXT, uf TEXT, emitida_em TEXT, valor INTEGER)")
cnpjs = [f"{random.randrange(10**13, 10**14):014d}" for _ in range(500)]
con.executemany(
    "INSERT INTO notas (cnpj, uf, emitida_em, valor) VALUES (?, ?, ?, ?)",
    [(random.choice(cnpjs), random.choice(["SP", "RJ", "MG", "BA"]),
      f"2025-{random.randint(1, 12):02d}-{random.randint(1, 28):02d}", random.randint(100, 500_000))
     for _ in range(20_000)])

ULTIMAS = "SELECT * FROM notas WHERE cnpj = ? ORDER BY emitida_em DESC LIMIT 10"
MARCO = "SELECT emitida_em, valor FROM notas WHERE cnpj = ? AND emitida_em >= ? AND emitida_em < ?"
consultas = [(ULTIMAS, (cnpjs[0],)), (MARCO, (cnpjs[0], "2025-03-01", "2025-04-01"))]

def medir(rotulo):
    print("---", rotulo)
    for sql, params in consultas:
        plano = [linha[3] for linha in con.execute("EXPLAIN QUERY PLAN " + sql, params)]
        con.execute(sql, params).fetchall()  # aquecimento: a primeira execução prepara o comando
        t0 = time.perf_counter()
        for _ in range(20):
            con.execute(sql, params).fetchall()
        micros = (time.perf_counter() - t0) / 20 * 1_000_000
        print(f"{micros:8.1f} µs  {' + '.join(plano)}")

medir("sem índice")
con.execute("CREATE INDEX idx_cnpj ON notas(cnpj)")
medir("índice em (cnpj)")
con.execute("DROP INDEX idx_cnpj")
con.execute("CREATE INDEX idx_cnpj_data ON notas(cnpj, emitida_em)")
medir("índice em (cnpj, emitida_em)")
con.execute("DROP INDEX idx_cnpj_data")
con.execute("CREATE INDEX idx_cnpj_data_valor ON notas(cnpj, emitida_em, valor)")
medir("índice em (cnpj, emitida_em, valor)")
con.execute("DROP INDEX idx_cnpj_data_valor")
con.execute("CREATE INDEX idx_data_cnpj ON notas(emitida_em, cnpj)")
medir("índice em (emitida_em, cnpj)")`,runnable:!0,caption:`Os tempos variam de uma execução para outra; compare a ordem de grandeza: do SCAN para o SEARCH, o tempo cai dezenas de vezes ou mais. No último caso, as mesmas colunas em outra ordem levam de volta a um SCAN.`},{type:`md`,text:`Agora o N+1: o mesmo relatório (quantidade e total de pedidos por cliente) feito com uma consulta por cliente e com um único JOIN, antes e depois de indexar a chave estrangeira.`},{type:`code`,lang:`python`,code:`import random, sqlite3, time

random.seed(7)
con = sqlite3.connect(":memory:")
con.executescript("""
CREATE TABLE clientes (id INTEGER PRIMARY KEY, nome TEXT);
CREATE TABLE pedidos (id INTEGER PRIMARY KEY, cliente_id INTEGER REFERENCES clientes(id), valor_centavos INTEGER);
""")
con.executemany("INSERT INTO clientes (nome) VALUES (?)", [(f"cliente {i:03d}",) for i in range(500)])
con.executemany("INSERT INTO pedidos (cliente_id, valor_centavos) VALUES (?, ?)",
                [(random.randint(1, 500), random.randint(500, 50_000)) for _ in range(5_000)])

def relatorio_n_mais_1():
    linhas = []
    clientes = con.execute("SELECT id, nome FROM clientes ORDER BY nome").fetchall()
    for cid, nome in clientes:
        qtd, total = con.execute(
            "SELECT COUNT(*), COALESCE(SUM(valor_centavos), 0) FROM pedidos WHERE cliente_id = ?",
            (cid,)).fetchone()
        linhas.append((nome, qtd, total))
    return linhas, 1 + len(clientes)

def relatorio_join():
    linhas = con.execute("""
        SELECT c.nome, COUNT(p.id), COALESCE(SUM(p.valor_centavos), 0)
        FROM clientes c LEFT JOIN pedidos p ON p.cliente_id = c.id
        GROUP BY c.id, c.nome ORDER BY c.nome""").fetchall()
    return linhas, 1

IDA_E_VOLTA_MS = 0.5   # suposição: servidor de banco na mesma rede local

def medir(rotulo, relatorio):
    t0 = time.perf_counter()
    linhas, n = relatorio()
    ms = (time.perf_counter() - t0) * 1000
    print(f"{rotulo:<20} {n:>4} consultas {ms:7.2f} ms  (+{n * IDA_E_VOLTA_MS:6.1f} ms de rede num servidor)")
    return linhas

a = medir("N+1 sem índice", relatorio_n_mais_1)
b = medir("JOIN sem índice", relatorio_join)
con.execute("CREATE INDEX idx_pedidos_cliente ON pedidos(cliente_id)")
c = medir("N+1 com índice", relatorio_n_mais_1)
d = medir("JOIN com índice", relatorio_join)
print("mesmo resultado nos quatro?", a == b == c == d)`,runnable:!0,caption:`Sem índice, cada uma das 500 consultas do N+1 varre os 5 000 pedidos; o JOIN sem índice se sai bem porque o SQLite monta um índice automático uma vez. Com índice, no SQLite, as duas versões ficam próximas; num servidor, as 501 idas e voltas pesariam.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e7-otim-prefixo`,kind:`mcq`,prompt:"A tabela `notas` tem um índice em `(cnpj, emitida_em)` e nenhum outro. Qual consulta **não** consegue descer na árvore desse índice?",difficulty:`facil`,skills:[`bd-modelagem`],hints:[`Na lista de chamada ordenada por turma e nome, que busca obriga a abrir a lista de todas as turmas?`,`Qual das consultas não diz nada sobre a primeira coluna do índice?`],explanation:"Um índice composto só desce pelas colunas do começo: serve a `cnpj = ?`, a `cnpj = ?` com intervalo em `emitida_em` e à ordenação por data dentro do CNPJ. Para filtrar só por data, seria preciso um índice que começasse por `emitida_em`.",options:[{text:"`SELECT * FROM notas WHERE cnpj = ?`",feedback:`Essa usa o prefixo (cnpj): desce até a primeira nota do CNPJ e percorre o trecho.`},{text:"`SELECT * FROM notas WHERE cnpj = ? AND emitida_em >= '2025-06-01'`",feedback:`Igualdade na primeira coluna e intervalo na segunda é o caso ideal: desce direto no começo de junho daquele CNPJ.`},{text:"`SELECT * FROM notas WHERE emitida_em >= '2025-06-01'`",correct:!0,feedback:`Isso: sem a primeira coluna, as datas estão espalhadas, um trecho em cada CNPJ. O banco, no máximo, varre o índice inteiro ou a tabela.`},{text:"`SELECT * FROM notas WHERE cnpj = ? ORDER BY emitida_em`",feedback:`Essa até dispensa a ordenação: dentro do CNPJ, as entradas já estão em ordem de data.`}]}},{type:`exercise`,exercise:{id:`e7-otim-bisect`,kind:`predict`,lang:`python`,prompt:"Uma folha de índice em `(uf, emitida_em)` pode ser imitada por uma lista ordenada de tuplas `(uf, data, id)`. O que o código imprime?",difficulty:`intermediario`,skills:[`bd-modelagem`,`alg-busca`],hints:[`Primeiro, ordene a lista à mão: tuplas se comparam pelo primeiro elemento e, no empate, pelo seguinte.`,'`bisect_left(lista, x)` devolve a primeira posição cujo elemento é maior ou igual a x. Como `("SP", "2025-03-01")` se compara com `("SP", "2025-03-02", 1)`?',`Quando uma tupla é prefixo de outra, ela é a menor das duas.`],explanation:`Ordenada, a lista fica BA, RJ, SP 01-20, SP 03-02, SP 03-10. A primeira entrada maior ou igual a ("SP", "2025-03-01") está na posição 3 (SP, 03-02), e a primeira maior ou igual a ("SP", "2025-04-01") estaria depois do fim: posição 5. A fatia [3:5] traz os ids 1 e 7, as notas de SP em março, em ordem de data. É o que um índice em (uf, emitida_em) faz: duas descidas para achar as pontas do intervalo e uma leitura em sequência entre elas.`,code:`from bisect import bisect_left

indice = sorted([
    ("SP", "2025-03-10", 7),
    ("RJ", "2025-01-05", 2),
    ("SP", "2025-01-20", 4),
    ("BA", "2025-02-01", 9),
    ("SP", "2025-03-02", 1),
])
ini = bisect_left(indice, ("SP", "2025-03-01"))
fim = bisect_left(indice, ("SP", "2025-04-01"))
print(ini, fim)
print([linha_id for _, _, linha_id in indice[ini:fim]])`,answer:`3 5
[1, 7]`}},{type:`exercise`,exercise:{id:`e7-otim-n1`,kind:`sql`,prompt:`Este relatório faz N+1 consultas: uma para os clientes e mais uma por cliente.

\`\`\`python
for cid, nome in con.execute("SELECT id, nome FROM clientes ORDER BY nome").fetchall():
    qtd, total = con.execute(
        "SELECT COUNT(*), COALESCE(SUM(valor_centavos), 0) FROM pedidos "
        "WHERE cliente_id = ? AND feito_em >= '2025-01-01'", (cid,)).fetchone()
    print(nome, qtd, total)
\`\`\`

Escreva **uma única consulta** que devolva o mesmo relatório: \`nome\`, \`qtd\` e \`total\` de **todos** os clientes (quem não tem pedidos em 2025 aparece com 0 e 0), em ordem de nome.`,difficulty:`intermediario`,skills:[`bd-modelagem`,`bd-joins`],hints:[`Que tipo de JOIN mantém os clientes sem nenhum pedido em 2025?`,`O filtro de data é sobre a tabela da direita do LEFT JOIN. Se ele for para o WHERE, o que acontece com quem só tem pedidos de 2024?`,`COUNT(*) conta a linha de NULL que o LEFT JOIN cria para quem não tem par. Que coluna contar no lugar?`,`Para o total, SUM de nada é NULL: o mesmo COALESCE do laço resolve.`],explanation:`SELECT c.nome, COUNT(p.id) AS qtd, COALESCE(SUM(p.valor_centavos), 0) AS total FROM clientes c LEFT JOIN pedidos p ON p.cliente_id = c.id AND p.feito_em >= '2025-01-01' GROUP BY c.id, c.nome ORDER BY c.nome; O filtro de data fica no ON para não descartar a Oficina do Zé, que só comprou em 2024; COUNT(p.id) dá 0 para quem não tem par. É uma consulta e uma ida ao banco, e o banco escolhe como juntar: com um índice em pedidos(cliente_id), cada cliente vira uma descida no índice.`,setup:`CREATE TABLE clientes (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, cidade TEXT);
CREATE TABLE pedidos (id INTEGER PRIMARY KEY, cliente_id INTEGER NOT NULL REFERENCES clientes(id), valor_centavos INTEGER NOT NULL, feito_em TEXT NOT NULL);
INSERT INTO clientes VALUES (1, 'Padaria Pão Quente', 'Recife'), (2, 'Mercadinho Bom Preço', 'Salvador'), (3, 'Oficina do Zé', 'Belém'), (4, 'Livraria Saber', 'Curitiba'), (5, 'Farmácia Vida', 'Manaus');
INSERT INTO pedidos VALUES (1, 1, 15000, '2025-01-10'), (2, 1, 8000, '2025-02-03'), (3, 2, 23050, '2025-01-22'), (4, 3, 5000, '2024-12-30'), (5, 1, 12000, '2024-11-15'), (6, 4, 9990, '2025-03-01'), (7, 2, 1000, '2025-03-05'), (8, 4, 500, '2025-03-09'), (9, 2, 4500, '2025-01-01');`,starter:`SELECT id, nome FROM clientes ORDER BY nome;`,solution:`SELECT c.nome, COUNT(p.id) AS qtd, COALESCE(SUM(p.valor_centavos), 0) AS total FROM clientes c LEFT JOIN pedidos p ON p.cliente_id = c.id AND p.feito_em >= '2025-01-01' GROUP BY c.id, c.nome ORDER BY c.nome;`,ordered:!0}},{type:`exercise`,exercise:{id:`e7-otim-indices`,kind:`code`,lang:`python`,prompt:"A tabela `notas(id, cnpj, uf, emitida_em, valor)` atende a três consultas frequentes:\n\n```sql\n-- 1. últimas notas do emitente\nSELECT * FROM notas WHERE cnpj = ? ORDER BY emitida_em DESC LIMIT 10;\n-- 2. faturamento do mês do emitente\nSELECT emitida_em, valor FROM notas WHERE cnpj = ? AND emitida_em >= ? AND emitida_em < ?;\n-- 3. notas de uma UF desde uma data\nSELECT COUNT(*) FROM notas WHERE uf = ? AND emitida_em >= ?;\n```\n\nEscreva `criar_indices(con)`, que cria **no máximo dois** índices em `notas` (com `CREATE INDEX`) de modo que, no EXPLAIN QUERY PLAN do SQLite:\n\n- nenhuma das três consultas tenha `SCAN` (nem da tabela, nem do índice inteiro);\n- nenhuma precise de `USE TEMP B-TREE` (ordenar à parte);\n- a consulta 2 desça usando `cnpj` **e** o intervalo de `emitida_em`, num índice de **cobertura**;\n- a consulta 3 desça usando `uf` **e** `emitida_em`.\n\nO código inicial cria um índice para cada coluna filtrada. Rode e leia as mensagens dos testes: elas mostram o plano de cada consulta.",difficulty:`intermediario`,skills:[`bd-modelagem`],hints:[`Quais colunas aparecem com = em cada consulta? Elas vão no começo de cada índice.`,`Na consulta 1, depois do cnpj, que coluna faria as entradas já saírem na ordem pedida?`,`Um mesmo índice pode servir às consultas 1 e 2? O que cada uma precisa depois do cnpj?`,`Cobertura: que coluna a consulta 2 lê e ainda não está no índice?`],explanation:"Com `(cnpj, emitida_em, valor)`, as consultas 1 e 2 usam o mesmo índice: o cnpj fixa o emitente, emitida_em vem logo depois (serve ao intervalo e à ordem do ORDER BY) e valor no fim deixa a consulta 2 ser respondida só pelo índice. A consulta 3 precisa de outro índice, que comece pela igualdade (uf) e continue pelo intervalo (emitida_em): `(uf, emitida_em)`, que de quebra cobre o COUNT(*). Índices de uma coluna só deixam a ordenação e o filtro de data para depois; a ordem trocada, `(emitida_em, cnpj, valor)`, perde o prefixo e faz o banco percorrer o índice inteiro.",starter:`def criar_indices(con):
    # no máximo dois índices; a ordem das colunas decide quais consultas eles servem
    con.execute("CREATE INDEX idx_notas_cnpj ON notas(cnpj)")
    con.execute("CREATE INDEX idx_notas_uf ON notas(uf)")`,solution:`def criar_indices(con):
    con.execute("CREATE INDEX idx_notas_cnpj_data_valor ON notas(cnpj, emitida_em, valor)")
    con.execute("CREATE INDEX idx_notas_uf_data ON notas(uf, emitida_em)")`,tests:[{name:`no máximo dois índices`,code:`import sqlite3 as _sqlite3
import random as _random

def _banco_notas():
    _rnd = _random.Random(7)
    con = _sqlite3.connect(":memory:")
    con.execute("CREATE TABLE notas (id INTEGER PRIMARY KEY, cnpj TEXT NOT NULL, uf TEXT NOT NULL, emitida_em TEXT NOT NULL, valor INTEGER NOT NULL)")
    cnpjs = [f"{_rnd.randrange(10**13, 10**14):014d}" for _ in range(80)]
    linhas = [(_rnd.choice(cnpjs), _rnd.choice(["SP", "SP", "SP", "RJ", "MG", "BA", "PR", "PE"]), f"2025-{_rnd.randint(1, 12):02d}-{_rnd.randint(1, 28):02d}", _rnd.randint(500, 900_000)) for _ in range(3000)]
    con.executemany("INSERT INTO notas (cnpj, uf, emitida_em, valor) VALUES (?, ?, ?, ?)", linhas)
    con.commit()
    return con, cnpjs[0]

_CONSULTAS = {
    "últimas notas do emitente": "SELECT * FROM notas WHERE cnpj = ? ORDER BY emitida_em DESC LIMIT 10",
    "faturamento do mês": "SELECT emitida_em, valor FROM notas WHERE cnpj = ? AND emitida_em >= ? AND emitida_em < ?",
    "notas da UF desde uma data": "SELECT COUNT(*) FROM notas WHERE uf = ? AND emitida_em >= ?",
}

def _params(nome, cnpj):
    return {
        "últimas notas do emitente": (cnpj,),
        "faturamento do mês": (cnpj, "2025-03-01", "2025-04-01"),
        "notas da UF desde uma data": ("BA", "2025-06-01"),
    }[nome]

def _preparado():
    con, cnpj = _banco_notas()
    antes = con.execute("SELECT COUNT(*), SUM(valor) FROM notas").fetchone()
    criar_indices(con)
    depois = con.execute("SELECT COUNT(*), SUM(valor) FROM notas").fetchone()
    assert antes == depois, "criar_indices só pode criar índices, mas os dados da tabela notas mudaram"
    planos = {}
    for nome, sql in _CONSULTAS.items():
        planos[nome] = [linha[3] for linha in con.execute("EXPLAIN QUERY PLAN " + sql, _params(nome, cnpj))]
    return con, planos
con, planos = _preparado()
nomes = [n for (n,) in con.execute("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'notas' AND name NOT LIKE 'sqlite_%'")]
assert len(nomes) >= 1, "nenhum índice foi criado na tabela notas: use CREATE INDEX dentro de criar_indices"
assert len(nomes) <= 2, f"foram criados {len(nomes)} índices ({', '.join(nomes)}); o limite é 2. Um índice composto bem ordenado pode servir a mais de uma consulta"`},{name:`nenhuma varredura completa`,code:`import sqlite3 as _sqlite3
import random as _random

def _banco_notas():
    _rnd = _random.Random(7)
    con = _sqlite3.connect(":memory:")
    con.execute("CREATE TABLE notas (id INTEGER PRIMARY KEY, cnpj TEXT NOT NULL, uf TEXT NOT NULL, emitida_em TEXT NOT NULL, valor INTEGER NOT NULL)")
    cnpjs = [f"{_rnd.randrange(10**13, 10**14):014d}" for _ in range(80)]
    linhas = [(_rnd.choice(cnpjs), _rnd.choice(["SP", "SP", "SP", "RJ", "MG", "BA", "PR", "PE"]), f"2025-{_rnd.randint(1, 12):02d}-{_rnd.randint(1, 28):02d}", _rnd.randint(500, 900_000)) for _ in range(3000)]
    con.executemany("INSERT INTO notas (cnpj, uf, emitida_em, valor) VALUES (?, ?, ?, ?)", linhas)
    con.commit()
    return con, cnpjs[0]

_CONSULTAS = {
    "últimas notas do emitente": "SELECT * FROM notas WHERE cnpj = ? ORDER BY emitida_em DESC LIMIT 10",
    "faturamento do mês": "SELECT emitida_em, valor FROM notas WHERE cnpj = ? AND emitida_em >= ? AND emitida_em < ?",
    "notas da UF desde uma data": "SELECT COUNT(*) FROM notas WHERE uf = ? AND emitida_em >= ?",
}

def _params(nome, cnpj):
    return {
        "últimas notas do emitente": (cnpj,),
        "faturamento do mês": (cnpj, "2025-03-01", "2025-04-01"),
        "notas da UF desde uma data": ("BA", "2025-06-01"),
    }[nome]

def _preparado():
    con, cnpj = _banco_notas()
    antes = con.execute("SELECT COUNT(*), SUM(valor) FROM notas").fetchone()
    criar_indices(con)
    depois = con.execute("SELECT COUNT(*), SUM(valor) FROM notas").fetchone()
    assert antes == depois, "criar_indices só pode criar índices, mas os dados da tabela notas mudaram"
    planos = {}
    for nome, sql in _CONSULTAS.items():
        planos[nome] = [linha[3] for linha in con.execute("EXPLAIN QUERY PLAN " + sql, _params(nome, cnpj))]
    return con, planos
con, planos = _preparado()
for nome, linhas in planos.items():
    for linha in linhas:
        assert not linha.startswith("SCAN"), f"na consulta '{nome}', o plano tem '{linha}': SCAN percorre a tabela (ou o índice) inteira. Qual coluna essa consulta compara com = e onde ela está no índice?"`},{name:`nenhuma ordenação à parte`,code:`import sqlite3 as _sqlite3
import random as _random

def _banco_notas():
    _rnd = _random.Random(7)
    con = _sqlite3.connect(":memory:")
    con.execute("CREATE TABLE notas (id INTEGER PRIMARY KEY, cnpj TEXT NOT NULL, uf TEXT NOT NULL, emitida_em TEXT NOT NULL, valor INTEGER NOT NULL)")
    cnpjs = [f"{_rnd.randrange(10**13, 10**14):014d}" for _ in range(80)]
    linhas = [(_rnd.choice(cnpjs), _rnd.choice(["SP", "SP", "SP", "RJ", "MG", "BA", "PR", "PE"]), f"2025-{_rnd.randint(1, 12):02d}-{_rnd.randint(1, 28):02d}", _rnd.randint(500, 900_000)) for _ in range(3000)]
    con.executemany("INSERT INTO notas (cnpj, uf, emitida_em, valor) VALUES (?, ?, ?, ?)", linhas)
    con.commit()
    return con, cnpjs[0]

_CONSULTAS = {
    "últimas notas do emitente": "SELECT * FROM notas WHERE cnpj = ? ORDER BY emitida_em DESC LIMIT 10",
    "faturamento do mês": "SELECT emitida_em, valor FROM notas WHERE cnpj = ? AND emitida_em >= ? AND emitida_em < ?",
    "notas da UF desde uma data": "SELECT COUNT(*) FROM notas WHERE uf = ? AND emitida_em >= ?",
}

def _params(nome, cnpj):
    return {
        "últimas notas do emitente": (cnpj,),
        "faturamento do mês": (cnpj, "2025-03-01", "2025-04-01"),
        "notas da UF desde uma data": ("BA", "2025-06-01"),
    }[nome]

def _preparado():
    con, cnpj = _banco_notas()
    antes = con.execute("SELECT COUNT(*), SUM(valor) FROM notas").fetchone()
    criar_indices(con)
    depois = con.execute("SELECT COUNT(*), SUM(valor) FROM notas").fetchone()
    assert antes == depois, "criar_indices só pode criar índices, mas os dados da tabela notas mudaram"
    planos = {}
    for nome, sql in _CONSULTAS.items():
        planos[nome] = [linha[3] for linha in con.execute("EXPLAIN QUERY PLAN " + sql, _params(nome, cnpj))]
    return con, planos
con, planos = _preparado()
for nome, linhas in planos.items():
    for linha in linhas:
        assert "TEMP B-TREE" not in linha, f"na consulta '{nome}', o plano tem '{linha}': o banco precisou ordenar à parte. Depois das colunas comparadas com =, qual coluna deveria vir no índice para as entradas já saírem na ordem pedida?"`},{name:`o mês usa as duas colunas e é coberto`,code:`import sqlite3 as _sqlite3
import random as _random

def _banco_notas():
    _rnd = _random.Random(7)
    con = _sqlite3.connect(":memory:")
    con.execute("CREATE TABLE notas (id INTEGER PRIMARY KEY, cnpj TEXT NOT NULL, uf TEXT NOT NULL, emitida_em TEXT NOT NULL, valor INTEGER NOT NULL)")
    cnpjs = [f"{_rnd.randrange(10**13, 10**14):014d}" for _ in range(80)]
    linhas = [(_rnd.choice(cnpjs), _rnd.choice(["SP", "SP", "SP", "RJ", "MG", "BA", "PR", "PE"]), f"2025-{_rnd.randint(1, 12):02d}-{_rnd.randint(1, 28):02d}", _rnd.randint(500, 900_000)) for _ in range(3000)]
    con.executemany("INSERT INTO notas (cnpj, uf, emitida_em, valor) VALUES (?, ?, ?, ?)", linhas)
    con.commit()
    return con, cnpjs[0]

_CONSULTAS = {
    "últimas notas do emitente": "SELECT * FROM notas WHERE cnpj = ? ORDER BY emitida_em DESC LIMIT 10",
    "faturamento do mês": "SELECT emitida_em, valor FROM notas WHERE cnpj = ? AND emitida_em >= ? AND emitida_em < ?",
    "notas da UF desde uma data": "SELECT COUNT(*) FROM notas WHERE uf = ? AND emitida_em >= ?",
}

def _params(nome, cnpj):
    return {
        "últimas notas do emitente": (cnpj,),
        "faturamento do mês": (cnpj, "2025-03-01", "2025-04-01"),
        "notas da UF desde uma data": ("BA", "2025-06-01"),
    }[nome]

def _preparado():
    con, cnpj = _banco_notas()
    antes = con.execute("SELECT COUNT(*), SUM(valor) FROM notas").fetchone()
    criar_indices(con)
    depois = con.execute("SELECT COUNT(*), SUM(valor) FROM notas").fetchone()
    assert antes == depois, "criar_indices só pode criar índices, mas os dados da tabela notas mudaram"
    planos = {}
    for nome, sql in _CONSULTAS.items():
        planos[nome] = [linha[3] for linha in con.execute("EXPLAIN QUERY PLAN " + sql, _params(nome, cnpj))]
    return con, planos
con, planos = _preparado()
linha = " | ".join(planos["faturamento do mês"])
assert "cnpj=?" in linha and "emitida_em>?" in linha, f"o plano do faturamento do mês é '{linha}': ele deveria descer no índice usando cnpj e o intervalo de emitida_em, como em (cnpj=? AND emitida_em>? AND emitida_em<?)"
assert "COVERING INDEX" in linha, f"o plano do faturamento do mês é '{linha}': ele ainda visita a tabela para buscar alguma coluna. Que coluna a consulta lê que não está no índice?"`},{name:`a UF usa as duas colunas`,code:`import sqlite3 as _sqlite3
import random as _random

def _banco_notas():
    _rnd = _random.Random(7)
    con = _sqlite3.connect(":memory:")
    con.execute("CREATE TABLE notas (id INTEGER PRIMARY KEY, cnpj TEXT NOT NULL, uf TEXT NOT NULL, emitida_em TEXT NOT NULL, valor INTEGER NOT NULL)")
    cnpjs = [f"{_rnd.randrange(10**13, 10**14):014d}" for _ in range(80)]
    linhas = [(_rnd.choice(cnpjs), _rnd.choice(["SP", "SP", "SP", "RJ", "MG", "BA", "PR", "PE"]), f"2025-{_rnd.randint(1, 12):02d}-{_rnd.randint(1, 28):02d}", _rnd.randint(500, 900_000)) for _ in range(3000)]
    con.executemany("INSERT INTO notas (cnpj, uf, emitida_em, valor) VALUES (?, ?, ?, ?)", linhas)
    con.commit()
    return con, cnpjs[0]

_CONSULTAS = {
    "últimas notas do emitente": "SELECT * FROM notas WHERE cnpj = ? ORDER BY emitida_em DESC LIMIT 10",
    "faturamento do mês": "SELECT emitida_em, valor FROM notas WHERE cnpj = ? AND emitida_em >= ? AND emitida_em < ?",
    "notas da UF desde uma data": "SELECT COUNT(*) FROM notas WHERE uf = ? AND emitida_em >= ?",
}

def _params(nome, cnpj):
    return {
        "últimas notas do emitente": (cnpj,),
        "faturamento do mês": (cnpj, "2025-03-01", "2025-04-01"),
        "notas da UF desde uma data": ("BA", "2025-06-01"),
    }[nome]

def _preparado():
    con, cnpj = _banco_notas()
    antes = con.execute("SELECT COUNT(*), SUM(valor) FROM notas").fetchone()
    criar_indices(con)
    depois = con.execute("SELECT COUNT(*), SUM(valor) FROM notas").fetchone()
    assert antes == depois, "criar_indices só pode criar índices, mas os dados da tabela notas mudaram"
    planos = {}
    for nome, sql in _CONSULTAS.items():
        planos[nome] = [linha[3] for linha in con.execute("EXPLAIN QUERY PLAN " + sql, _params(nome, cnpj))]
    return con, planos
con, planos = _preparado()
linha = " | ".join(planos["notas da UF desde uma data"])
assert "uf=?" in linha and "emitida_em>?" in linha, f"o plano da contagem por UF é '{linha}': ele deveria descer usando uf e a data, como em (uf=? AND emitida_em>?). Se só aparece uma das duas, a outra é conferida entrada por entrada"`}]}},{type:`exercise`,exercise:{id:`e7-otim-seletividade`,kind:`mcq`,prompt:"No PostgreSQL, a tabela `clientes` tem 1 milhão de linhas, 45% delas com `uf = 'SP'`, e um índice B-tree em `uf`. O `EXPLAIN` de `SELECT * FROM clientes WHERE uf = 'SP'` mostra `Seq Scan on clientes`. O que explica a escolha?",difficulty:`intermediario`,skills:[`bd-modelagem`],hints:[`Quantas linhas essa consulta devolve? Quantas páginas da tabela o banco teria de visitar indo pelo índice?`,`O planejador do PostgreSQL decide por custo estimado, com base em estatísticas da coluna.`],explanation:`Pelas estatísticas da coluna (coletadas pelo ANALYZE), o planejador estima que cerca de 450 mil linhas satisfazem a condição. Ir pelo índice significaria visitar a tabela entrada por entrada, em páginas fora de ordem; a varredura sequencial lê cada página uma vez, em ordem, e sai mais barata. Um índice compensa quando a condição é seletiva, isto é, deixa passar uma fração pequena das linhas. Em casos intermediários, o PostgreSQL costuma usar Bitmap Heap Scan.`,options:[{text:`O índice está corrompido e precisa ser recriado com REINDEX.`,feedback:`Um índice ignorado não é sinal de corrupção. O planejador comparou custos e preferiu outro plano.`},{text:`Pelas estatísticas, quase metade da tabela sai no resultado; ler tudo em sequência custa menos do que ir de entrada em entrada do índice até páginas espalhadas da tabela.`,correct:!0,feedback:"Isso: a condição tem baixa seletividade. Para `uf = 'AC'`, com poucas linhas, o mesmo índice provavelmente seria usado."},{text:`O PostgreSQL só usa índices B-tree em consultas com ORDER BY.`,feedback:`O B-tree serve a igualdades e intervalos, com ou sem ORDER BY.`},{text:`Índices B-tree não funcionam com colunas de texto.`,feedback:`Funcionam: texto tem ordem. O que o B-tree não faz é procurar pelo meio do texto, como num LIKE com % no começo.`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e7-otim-indice-composto`,kind:`code`,lang:`python`,prompt:'Implemente a folha de um índice composto como uma lista ordenada, e a busca que ele faz.\n\n- `IndiceComposto(linhas, colunas)`: `linhas` é uma lista de dicionários, todos com a chave `"id"` e com as colunas do índice; `colunas` é a tupla com os nomes das colunas, na ordem do índice. Guarde as entradas `(valor da 1ª coluna, valor da 2ª, ..., id)` em ordem.\n- `buscar(prefixo, intervalo=None)`: `prefixo` é uma tupla (pode ser vazia) com valores para as **primeiras** colunas, comparados por igualdade; `intervalo`, se vier, é `(minimo, maximo)`, inclusivos, para a coluna **logo depois** do prefixo. Devolve a lista de ids que casam, na ordem do índice (pelos valores e, no empate, pelo id).\n- Se o prefixo tiver mais valores do que o índice tem colunas, ou se vier um intervalo quando o prefixo já usa todas as colunas, lance `ValueError`.\n\nA busca precisa descer na lista, como a B-tree desce na árvore: um teste conta as comparações de valores e reprova quem percorre as entradas uma a uma.',difficulty:`desafio`,skills:[`bd-modelagem`,`alg-busca`],hints:[`Que operação sobre uma lista ordenada faz o papel de "descer na árvore"? Você já a usou no Nível 4.`,`Para achar as duas pontas do trecho, você precisa de duas buscas. O que muda entre a ponta da esquerda e a da direita?`,"Com `key=`, o `bisect` compara só uma parte de cada entrada. Que parte, quando o prefixo tem p valores? E quando há intervalo?",`Intervalo inclusivo: a ponta da direita precisa ficar depois da última entrada igual ao máximo.`],explanation:"Com as entradas ordenadas como tuplas (valores..., id), todas as que começam por um prefixo de p valores formam um trecho contínuo. `bisect_left(entradas, prefixo, key=lambda e: e[:p])` acha o começo, e `bisect_right` com a mesma chave acha o fim; com intervalo, a chave passa a ser `e[:p + 1]` e as pontas são `prefixo + (minimo,)` (à esquerda) e `prefixo + (maximo,)` (à direita). São duas descidas de O(log n) e uma fatia de k entradas: O(log n + k), o custo de uma busca num índice B-tree. O que não dá para fazer também ensina: sem a primeira coluna, não existe trecho contínuo para achar. É a regra do prefixo mais à esquerda vista por dentro.",starter:`from bisect import bisect_left, bisect_right


class IndiceComposto:
    def __init__(self, linhas, colunas):
        # monte a lista ORDENADA de entradas: os valores das colunas, na ordem
        # do índice, e o id da linha no fim (ele desempata)
        pass

    def buscar(self, prefixo, intervalo=None):
        # prefixo: valores (igualdade) para as primeiras colunas do índice
        # intervalo: None ou (minimo, maximo), inclusivos, para a coluna seguinte
        # devolva os ids que casam, na ordem do índice, sem percorrer todas as entradas
        pass`,solution:`from bisect import bisect_left, bisect_right


class IndiceComposto:
    def __init__(self, linhas, colunas):
        self.colunas = tuple(colunas)
        self.entradas = sorted(tuple(linha[c] for c in self.colunas) + (linha["id"],) for linha in linhas)

    def buscar(self, prefixo, intervalo=None):
        prefixo = tuple(prefixo)
        p = len(prefixo)
        if p > len(self.colunas):
            raise ValueError("o prefixo tem mais valores do que o índice tem colunas")
        if intervalo is None:
            chave = lambda e: e[:p]
            ini = bisect_left(self.entradas, prefixo, key=chave)
            fim = bisect_right(self.entradas, prefixo, key=chave)
        else:
            if p == len(self.colunas):
                raise ValueError("não sobra coluna depois do prefixo para o intervalo")
            minimo, maximo = intervalo
            chave = lambda e: e[:p + 1]
            ini = bisect_left(self.entradas, prefixo + (minimo,), key=chave)
            fim = bisect_right(self.entradas, prefixo + (maximo,), key=chave)
        return [e[-1] for e in self.entradas[ini:fim]]`,tests:[{name:`busca por prefixo`,code:`def _espera_valueerror(f, *args, msg=""):
    try:
        f(*args)
    except ValueError:
        return
    raise AssertionError(msg)

def _forca_bruta(linhas, colunas, prefixo, intervalo=None):
    p = len(prefixo)
    def casa(l):
        if tuple(l[c] for c in colunas[:p]) != tuple(prefixo):
            return False
        return intervalo is None or intervalo[0] <= l[colunas[p]] <= intervalo[1]
    ok = [l for l in linhas if casa(l)]
    ok.sort(key=lambda l: tuple(l[c] for c in colunas) + (l["id"],))
    return [l["id"] for l in ok]

_NOTAS = [
    {"id": 7, "uf": "SP", "data": "2025-03-10"},
    {"id": 2, "uf": "RJ", "data": "2025-01-05"},
    {"id": 4, "uf": "SP", "data": "2025-01-20"},
    {"id": 9, "uf": "BA", "data": "2025-02-01"},
    {"id": 1, "uf": "SP", "data": "2025-03-02"},
    {"id": 5, "uf": "SP", "data": "2025-03-10"},
    {"id": 3, "uf": "MG", "data": "2025-03-15"},
]
ind = IndiceComposto(_NOTAS, ("uf", "data"))
r = ind.buscar(("SP",))
assert r == [4, 1, 5, 7], f"buscar(('SP',)) devolveu {r!r}; esperado [4, 1, 5, 7]: as notas de SP na ordem do índice (data e, no empate, id)"
r = ind.buscar(("SP", "2025-03-10"))
assert r == [5, 7], f"buscar(('SP', '2025-03-10')) devolveu {r!r}; esperado [5, 7]: as duas notas com esses valores, desempatadas pelo id"
r = ind.buscar(("AM",))
assert r == [], f"não há notas do AM, mas veio {r!r}"`},{name:`intervalo na coluna seguinte`,code:`def _espera_valueerror(f, *args, msg=""):
    try:
        f(*args)
    except ValueError:
        return
    raise AssertionError(msg)

def _forca_bruta(linhas, colunas, prefixo, intervalo=None):
    p = len(prefixo)
    def casa(l):
        if tuple(l[c] for c in colunas[:p]) != tuple(prefixo):
            return False
        return intervalo is None or intervalo[0] <= l[colunas[p]] <= intervalo[1]
    ok = [l for l in linhas if casa(l)]
    ok.sort(key=lambda l: tuple(l[c] for c in colunas) + (l["id"],))
    return [l["id"] for l in ok]

_NOTAS = [
    {"id": 7, "uf": "SP", "data": "2025-03-10"},
    {"id": 2, "uf": "RJ", "data": "2025-01-05"},
    {"id": 4, "uf": "SP", "data": "2025-01-20"},
    {"id": 9, "uf": "BA", "data": "2025-02-01"},
    {"id": 1, "uf": "SP", "data": "2025-03-02"},
    {"id": 5, "uf": "SP", "data": "2025-03-10"},
    {"id": 3, "uf": "MG", "data": "2025-03-15"},
]
ind = IndiceComposto(_NOTAS, ("uf", "data"))
r = ind.buscar(("SP",), ("2025-03-01", "2025-03-31"))
assert r == [1, 5, 7], f"notas de SP em março: esperado [1, 5, 7], veio {r!r}"
r = ind.buscar(("SP",), ("2025-01-20", "2025-03-02"))
assert r == [4, 1], f"o intervalo é inclusivo nas duas pontas: esperado [4, 1], veio {r!r}"
r = ind.buscar((), ("MG", "RJ"))
assert r == [3, 2], f"com prefixo vazio, o intervalo vale para a primeira coluna (uf de MG a RJ): esperado [3, 2], veio {r!r}"
r = ind.buscar(("SP",), ("2025-04-01", "2025-03-01"))
assert r == [], f"um intervalo com mínimo maior que o máximo não casa com nada; veio {r!r}"`},{name:`prefixo vazio devolve tudo, em ordem`,code:`def _espera_valueerror(f, *args, msg=""):
    try:
        f(*args)
    except ValueError:
        return
    raise AssertionError(msg)

def _forca_bruta(linhas, colunas, prefixo, intervalo=None):
    p = len(prefixo)
    def casa(l):
        if tuple(l[c] for c in colunas[:p]) != tuple(prefixo):
            return False
        return intervalo is None or intervalo[0] <= l[colunas[p]] <= intervalo[1]
    ok = [l for l in linhas if casa(l)]
    ok.sort(key=lambda l: tuple(l[c] for c in colunas) + (l["id"],))
    return [l["id"] for l in ok]

_NOTAS = [
    {"id": 7, "uf": "SP", "data": "2025-03-10"},
    {"id": 2, "uf": "RJ", "data": "2025-01-05"},
    {"id": 4, "uf": "SP", "data": "2025-01-20"},
    {"id": 9, "uf": "BA", "data": "2025-02-01"},
    {"id": 1, "uf": "SP", "data": "2025-03-02"},
    {"id": 5, "uf": "SP", "data": "2025-03-10"},
    {"id": 3, "uf": "MG", "data": "2025-03-15"},
]
ind = IndiceComposto(_NOTAS, ("uf", "data"))
r = ind.buscar(())
assert r == [9, 3, 2, 4, 1, 5, 7], f"sem prefixo nem intervalo, vêm todas as entradas na ordem do índice: esperado [9, 3, 2, 4, 1, 5, 7], veio {r!r}"`},{name:`pedidos impossíveis`,code:`def _espera_valueerror(f, *args, msg=""):
    try:
        f(*args)
    except ValueError:
        return
    raise AssertionError(msg)

def _forca_bruta(linhas, colunas, prefixo, intervalo=None):
    p = len(prefixo)
    def casa(l):
        if tuple(l[c] for c in colunas[:p]) != tuple(prefixo):
            return False
        return intervalo is None or intervalo[0] <= l[colunas[p]] <= intervalo[1]
    ok = [l for l in linhas if casa(l)]
    ok.sort(key=lambda l: tuple(l[c] for c in colunas) + (l["id"],))
    return [l["id"] for l in ok]

_NOTAS = [
    {"id": 7, "uf": "SP", "data": "2025-03-10"},
    {"id": 2, "uf": "RJ", "data": "2025-01-05"},
    {"id": 4, "uf": "SP", "data": "2025-01-20"},
    {"id": 9, "uf": "BA", "data": "2025-02-01"},
    {"id": 1, "uf": "SP", "data": "2025-03-02"},
    {"id": 5, "uf": "SP", "data": "2025-03-10"},
    {"id": 3, "uf": "MG", "data": "2025-03-15"},
]
ind = IndiceComposto(_NOTAS, ("uf", "data"))
_espera_valueerror(ind.buscar, ("SP", "2025-03-10", "x"), msg="o índice tem 2 colunas: um prefixo com 3 valores deveria lançar ValueError")
_espera_valueerror(ind.buscar, ("SP", "2025-03-10"), ("a", "z"), msg="com as 2 colunas no prefixo, não sobra coluna para o intervalo: deveria lançar ValueError")`},{name:`dados aleatórios`,code:`def _espera_valueerror(f, *args, msg=""):
    try:
        f(*args)
    except ValueError:
        return
    raise AssertionError(msg)

def _forca_bruta(linhas, colunas, prefixo, intervalo=None):
    p = len(prefixo)
    def casa(l):
        if tuple(l[c] for c in colunas[:p]) != tuple(prefixo):
            return False
        return intervalo is None or intervalo[0] <= l[colunas[p]] <= intervalo[1]
    ok = [l for l in linhas if casa(l)]
    ok.sort(key=lambda l: tuple(l[c] for c in colunas) + (l["id"],))
    return [l["id"] for l in ok]

_NOTAS = [
    {"id": 7, "uf": "SP", "data": "2025-03-10"},
    {"id": 2, "uf": "RJ", "data": "2025-01-05"},
    {"id": 4, "uf": "SP", "data": "2025-01-20"},
    {"id": 9, "uf": "BA", "data": "2025-02-01"},
    {"id": 1, "uf": "SP", "data": "2025-03-02"},
    {"id": 5, "uf": "SP", "data": "2025-03-10"},
    {"id": 3, "uf": "MG", "data": "2025-03-15"},
]
import random
rnd = random.Random(42)
colunas = ("uf", "cidade", "dia")
linhas = [{"id": i, "uf": rnd.choice("ABC"), "cidade": rnd.choice("xyz"), "dia": rnd.randint(1, 9)} for i in range(400)]
rnd.shuffle(linhas)
ind = IndiceComposto(linhas, colunas)
for _ in range(300):
    p = rnd.randint(0, 3)
    prefixo = tuple(rnd.choice(v) for v in ["ABC", "xyz", range(1, 10)][:p])
    intervalo = None
    if p < 3 and rnd.random() < 0.6:
        opcoes = [list("ABC"), list("xyz"), list(range(1, 10))][p]
        a, b = sorted(rnd.sample(opcoes, 2)) if rnd.random() < 0.8 else [rnd.choice(opcoes)] * 2
        intervalo = (a, b)
    r = ind.buscar(prefixo, intervalo) if intervalo else ind.buscar(prefixo)
    esperado = _forca_bruta(linhas, colunas, prefixo, intervalo)
    if r != esperado:
        if sorted(r) == sorted(esperado):
            raise AssertionError(f"buscar({prefixo!r}, {intervalo!r}) trouxe os ids certos fora de ordem: {r[:10]!r}... O id entra na entrada para desempatar?")
        raise AssertionError(f"buscar({prefixo!r}, {intervalo!r}) devolveu {len(r)} ids, e o esperado são {len(esperado)}: {esperado[:10]!r}...")`},{name:`busca sem percorrer tudo`,code:`def _espera_valueerror(f, *args, msg=""):
    try:
        f(*args)
    except ValueError:
        return
    raise AssertionError(msg)

def _forca_bruta(linhas, colunas, prefixo, intervalo=None):
    p = len(prefixo)
    def casa(l):
        if tuple(l[c] for c in colunas[:p]) != tuple(prefixo):
            return False
        return intervalo is None or intervalo[0] <= l[colunas[p]] <= intervalo[1]
    ok = [l for l in linhas if casa(l)]
    ok.sort(key=lambda l: tuple(l[c] for c in colunas) + (l["id"],))
    return [l["id"] for l in ok]

_NOTAS = [
    {"id": 7, "uf": "SP", "data": "2025-03-10"},
    {"id": 2, "uf": "RJ", "data": "2025-01-05"},
    {"id": 4, "uf": "SP", "data": "2025-01-20"},
    {"id": 9, "uf": "BA", "data": "2025-02-01"},
    {"id": 1, "uf": "SP", "data": "2025-03-02"},
    {"id": 5, "uf": "SP", "data": "2025-03-10"},
    {"id": 3, "uf": "MG", "data": "2025-03-15"},
]
import math, random

class _V:
    """Valor que conta quantas vezes é comparado."""
    comparacoes = 0
    __slots__ = ("x",)
    def __init__(self, x): self.x = x
    def _o(self, o):
        _V.comparacoes += 1
        return o.x if isinstance(o, _V) else o
    def __eq__(self, o): return self.x == self._o(o)
    def __ne__(self, o): return self.x != self._o(o)
    def __lt__(self, o): return self.x < self._o(o)
    def __le__(self, o): return self.x <= self._o(o)
    def __gt__(self, o): return self.x > self._o(o)
    def __ge__(self, o): return self.x >= self._o(o)
    def __hash__(self): return hash(self.x)
    def __repr__(self): return repr(self.x)

rnd = random.Random(5)
n = 20000
cnpjs = [f"{i:014d}" for i in range(0, 4000 * 7, 7)]
linhas = [{"id": i, "cnpj": _V(cnpjs[i % len(cnpjs)]), "data": _V(f"2025-{rnd.randint(1, 12):02d}-{rnd.randint(1, 28):02d}")} for i in range(n)]
ind = IndiceComposto(linhas, ("cnpj", "data"))
limite_base = 50 * (math.log2(n) + 1)
consultas = [
    ((_V(cnpjs[123]),), None),
    ((_V(cnpjs[2500]),), (_V("2025-01-01"), _V("2025-06-30"))),
    ((), (_V(cnpjs[10]), _V(cnpjs[14]))),
    ((_V(cnpjs[77]), linhas[77]["data"]), None),
]
for prefixo, intervalo in consultas:
    _V.comparacoes = 0
    r = ind.buscar(prefixo, intervalo) if intervalo else ind.buscar(prefixo)
    gasto = _V.comparacoes
    limite = limite_base + 6 * (len(r) + 1)
    assert gasto <= limite, f"buscar({prefixo!r}, {intervalo!r}) fez {gasto} comparações de valores para devolver {len(r)} ids num índice de {n} entradas; uma busca que desce na lista ordenada faz no máximo cerca de {int(limite)}. Ela está percorrendo as entradas uma a uma?"
    assert r == _forca_bruta(linhas, ("cnpj", "data"), prefixo, intervalo), f"buscar({prefixo!r}, {intervalo!r}) devolveu ids errados"`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:"**Sistema de cadastro (parte 6, desempenho)**: liste as três consultas mais usadas do seu cadastro (por exemplo, busca por matrícula, boletim do aluno e alunos de um curso), rode `EXPLAIN QUERY PLAN` em cada uma e registre no README o plano antes e depois dos índices, com uma frase que justifique cada índice: a quais consultas ele serve e por que as colunas estão nessa ordem. Procure laços que fazem uma consulta por aluno e troque-os por um JOIN."},{type:`project`,projectId:`p3-cadastro`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- B-tree: lista ordenada em páginas, com um sumário por cima; descer é O(log n) e ler em ordem é sequencial. Com fan-out alto, 3 ou 4 níveis cobrem milhões de linhas.
- Índice composto: prefixo mais à esquerda. Igualdades primeiro, depois uma coluna de intervalo ou de ORDER BY; colunas só lidas no fim, para cobrir a consulta.
- Plano no SQLite: SCAN (tudo), SEARCH (desce), COVERING INDEX (nem visita a tabela), TEMP B-TREE (ordenou à parte), AUTOMATIC INDEX (faltou índice). No PostgreSQL: Seq Scan, Index Scan, Index Only Scan, Bitmap Heap Scan, Sort; EXPLAIN ANALYZE executa de verdade.
- Deixe a coluna sozinha na comparação: intervalo em vez de função; índice de expressão quando não der.
- Seletividade: índice compensa para poucas linhas; para muitas, a varredura sequencial ganha.
- N+1: uma consulta por item. Troque por JOIN/GROUP BY ou IN, use carregamento antecipado no ORM e indexe as chaves estrangeiras.`},{type:`callout`,tone:`english`,text:`- **query plan, query planner (optimizer)**: plano de execução, planejador de consultas
- **full table scan / sequential scan**: varredura completa
- **composite (multicolumn) index, leftmost prefix**: índice composto, prefixo mais à esquerda
- **covering index / index-only scan**: índice de cobertura
- **selectivity**: seletividade
- **sargable predicate**: condição sargável
- **N+1 query problem, eager loading**: problema N+1, carregamento antecipado

Frase típica de entrevista: *"I'd start by reading the query plan. If it shows a sequential scan on a selective filter, I'd add a composite index with the equality columns first and the range column last, then confirm the change with EXPLAIN ANALYZE."*

Da documentação do PostgreSQL, sobre índices de várias colunas: *"A multicolumn B-tree index can be used with query conditions that involve any subset of the index's columns, but the index is most efficient when there are constraints on the leading (leftmost) columns."*`,title:`English corner`}]}],cards:[{id:`l7-otimizacao-consultas#1`,front:`Por que um índice B-tree com milhões de entradas tem só 3 ou 4 níveis?`,back:`Cada página interna aponta para centenas de páginas abaixo (fan-out alto): com 100 filhos por página, 3 níveis cobrem 1 milhão de entradas.`},{id:`l7-otimizacao-consultas#2`,front:`O que diz a regra do prefixo mais à esquerda?`,back:`Um índice composto só desce na árvore pelas suas primeiras colunas, em ordem: igualdades primeiro, depois no máximo uma coluna de intervalo ou de ORDER BY.`},{id:`l7-otimizacao-consultas#3`,front:"Em que ordem ficam as colunas de um índice para `WHERE cnpj = ? AND emitida_em >= ? ORDER BY emitida_em`?",back:`(cnpj, emitida_em): a coluna da igualdade primeiro, a do intervalo e da ordenação depois.`},{id:`l7-otimizacao-consultas#4`,front:`O que é um índice de cobertura, e como ele aparece no plano?`,back:`Um índice que contém todas as colunas que a consulta usa, que então não precisa visitar a tabela. No SQLite, USING COVERING INDEX; no PostgreSQL, Index Only Scan.`},{id:`l7-otimizacao-consultas#5`,front:"Como reescrever `WHERE strftime('%Y-%m', emitida_em) = '2025-03'` para usar um índice em emitida_em?",back:`Como intervalo sobre a coluna pura: emitida_em >= '2025-03-01' AND emitida_em < '2025-04-01'.`},{id:`l7-otimizacao-consultas#6`,front:`No EXPLAIN QUERY PLAN do SQLite, o que indicam SCAN, SEARCH e USE TEMP B-TREE FOR ORDER BY?`,back:`SCAN: percorre a tabela ou o índice inteiro. SEARCH: desce na árvore e lê só um trecho. TEMP B-TREE: precisou ordenar à parte.`},{id:`l7-otimizacao-consultas#7`,front:`Por que o PostgreSQL pode preferir um Seq Scan mesmo havendo índice na coluna filtrada?`,back:`Se a condição deixa passar uma fração grande das linhas (baixa seletividade), ler a tabela em sequência custa menos do que visitar páginas espalhadas a partir do índice.`},{id:`l7-otimizacao-consultas#8`,front:`O que é o problema N+1, e como corrigi-lo?`,back:`Uma consulta para a lista e mais uma para cada item. Troque por uma consulta com JOIN e GROUP BY (ou com IN) e use carregamento antecipado no ORM.`},{id:`l7-otimizacao-consultas#9`,front:`O PostgreSQL cria índice nas colunas de chave estrangeira?`,back:`Não: só a chave primária e as colunas UNIQUE ganham índice automático. Indexe as chaves estrangeiras que você usa em JOINs e filtros.`}]};export{e as default};
//# sourceMappingURL=l7-otimizacao-consultas-BHvdal9a.js.map