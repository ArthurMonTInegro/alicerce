var e={id:`l7-sql-no-python`,moduleId:`m7-1`,title:`SQL no Python: consultas parametrizadas, cursores e paginação`,titleEn:`SQL from Python: parameterized queries, cursors and pagination`,summary:`Como um programa conversa com o banco pelo módulo sqlite3 (DB-API): cursores, fetchone e fetchall, Row, executemany, rowcount e lastrowid; por que um valor passado como parâmetro nunca vira SQL num comando preparado; o que não pode ser parâmetro e como a lista branca resolve; listas no IN, buscas com LIKE e paginação com LIMIT/OFFSET e por chave.`,minutes:45,objectives:[`Executar consultas e comandos pelo sqlite3 e ler o resultado com fetchone, fetchall, iteração e sqlite3.Row, usando rowcount e lastrowid`,`Explicar o que acontece num comando preparado e por que um valor vinculado a um marcador nunca é interpretado como SQL`,`Passar valores com ? e :nome, inclusive listas de tamanho variável no IN e termos com % e _ no LIKE`,`Tratar nomes de coluna e direção de ordenação com lista branca, já que não podem ser parâmetros`,`Paginar com LIMIT/OFFSET de forma determinística, contar o total e saber quando trocar pela paginação por chave`],skills:[`bd-sql`],terms:[{pt:`consulta parametrizada`,en:`parameterized query`,def:`Comando SQL com marcadores no lugar dos valores; os valores vão separados, e o banco os recebe como dados.`,example:`Always use parameterized queries; never build SQL with string formatting.`},{pt:`marcador`,en:`placeholder`,def:`O sinal que marca o lugar de um valor no SQL: ? ou :nome no sqlite3, %s no psycopg.`},{pt:`cursor`,en:`cursor`,def:`Objeto que executa um comando e entrega as linhas do resultado.`},{pt:`comando preparado`,en:`prepared statement`,def:`Comando SQL já compilado pelo banco, com espaços onde os valores serão encaixados; pode ser reusado com valores diferentes.`},{pt:`vincular`,en:`bind`,def:`Encaixar um valor num marcador de um comando preparado.`,example:`sqlite3.ProgrammingError: Incorrect number of bindings supplied.`},{pt:`injeção de SQL`,en:`SQL injection`,def:`Ataque em que um valor vindo de fora é interpretado como parte do comando SQL.`},{pt:`lista branca`,en:`allowlist`,def:`Conjunto fechado de opções aceitas; qualquer coisa fora dele é recusada.`,example:`Sort columns are validated against an allowlist before being added to the query.`},{pt:`caractere curinga`,en:`wildcard`,def:`No LIKE, % casa com qualquer sequência de caracteres e _ com exatamente um caractere.`},{pt:`paginação por chave`,en:`keyset pagination`,def:`Pedir a próxima página a partir da última linha vista (WHERE (nome, id) > (?, ?)) em vez de pular linhas com OFFSET.`,example:`Keyset pagination performs consistently no matter how deep you page.`}],references:[`python-docs`,`sqlite-docs`,`postgres-docs`,`owasp-cheatsheets`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Num sistema de verdade, ninguém digita SQL: o programa monta os comandos e os manda ao banco, e muitos valores vêm de fora: o que a pessoa digitou na busca, o número da página na URL, a planilha que o fornecedor mandou. A pergunta desta lição é **como esses valores entram no comando**.

A resposta é a {{consulta parametrizada|parameterized query}}: o texto do SQL vai com {{marcadores|placeholders}} (\`?\`) no lugar dos valores, e os valores vão **separados**. O banco compila o comando primeiro, quando ainda nem sabe os valores, e só depois os encaixa como dados. Por isso um nome como "Joana D'Arc" não quebra nada, e um "nome" como \`' OR '1'='1\` é só um texto esquisito que não casa com ninguém, e não uma ordem para devolver a tabela inteira.

Você já viu o \`?\` na primeira lição do módulo. Agora vai entender o que acontece por baixo, ler resultados do jeito certo, descobrir o que **não** pode virar parâmetro (nome de coluna, ASC/DESC) e resolver três situações do dia a dia que pegam muita gente: listas no IN, buscas com LIKE e paginação.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:"### Do Python ao banco e de volta\nO módulo `sqlite3` da biblioteca padrão segue a especificação DB-API 2.0 (PEP 249), a mesma de praticamente todos os drivers de banco do Python: trocar de SQLite para PostgreSQL muda, no código Python, a conexão e o estilo do marcador, e quase nada mais (o SQL em si pode ter diferenças de dialeto). O roteiro é sempre este:"},{type:`code`,lang:`python`,code:`import sqlite3

con = sqlite3.connect("loja.db")        # ou ":memory:", um banco temporário na memória
con.execute("PRAGMA foreign_keys = ON")

cur = con.execute("SELECT id, nome FROM clientes WHERE uf = ?", ("PE",))
primeira = cur.fetchone()     # a próxima linha, como tupla, ou None se não há mais
resto = cur.fetchall()        # todas as que faltam, numa lista
for id_, nome in con.execute("SELECT id, nome FROM clientes"):   # uma de cada vez
    ...

cur = con.execute("UPDATE clientes SET uf = ? WHERE id = ?", ("PE", 7))
print(cur.rowcount)           # quantas linhas o UPDATE afetou
con.commit()                  # confirma as mudanças
con.close()`,runnable:!1,caption:`O esqueleto de qualquer programa com sqlite3 (para ler, não para rodar: ele abre um arquivo).`},{type:`md`,text:"`con.execute` é um atalho: cria um {{cursor|cursor}}, o objeto que executa o comando e entrega as linhas, e devolve esse cursor. O que você vai usar o tempo todo:"},{type:`table`,head:[`Recurso`,`O que faz`,`Detalhe que pega`],rows:[["`cur.fetchone()`",`a próxima linha, como tupla`,`devolve None quando não há linha: confira antes de desempacotar`],["`cur.fetchall()` ou `for linha in cur`",`todas as linhas de uma vez, ou uma de cada vez`,`com milhões de linhas, iterar evita carregar tudo na memória`],["`con.executemany(sql, lista)`",`o mesmo comando para cada item da lista`,`compila uma vez e encaixa os valores N vezes`],["`cur.rowcount`",`quantas linhas o último INSERT, UPDATE ou DELETE afetou`,`vale -1 depois de um SELECT`],["`cur.lastrowid`","o id da linha criada pelo último INSERT feito com `execute`","não é atualizado por `executemany`"],["`con.row_factory = sqlite3.Row`",'linhas acessíveis pelo nome da coluna: `linha["nome"]`',"continuam aceitando índice (`linha[0]`) e viram dict com `dict(linha)`"],["`con.commit()`",`confirma as mudanças pendentes`,`o módulo abre uma transação sozinho antes de INSERT, UPDATE e DELETE; fechar a conexão sem commit descarta as mudanças`],["`con.executescript(texto)`","vários comandos separados por `;`","não aceita parâmetros: só para esquemas e dados fixos. O `execute` recusa mais de um comando por chamada"]]},{type:`callout`,tone:`warn`,text:'`con.execute("SELECT * FROM clientes WHERE cidade = ?", ("Recife"))` falha com `Incorrect number of bindings supplied. The current statement uses 1, and there are 6 supplied.` Parênteses sozinhos não criam tupla: `("Recife")` é só a string, e uma string é uma sequência de 6 caracteres, que o driver tenta encaixar um em cada marcador. A tupla de um elemento leva vírgula, `("Recife",)`, e uma lista também serve: `["Recife"]`.',title:`A vírgula que falta`},{type:`md`,text:"### O que acontece com um parâmetro\n1. **Preparar.** O driver entrega ao SQLite só o texto, com os marcadores. O SQLite analisa a sintaxe e compila o comando num pequeno programa para a máquina virtual dele: é o {{comando preparado|prepared statement}} (na biblioteca C, a função `sqlite3_prepare_v2`). É nesse momento que se decide o que é tabela, o que é coluna e o que é operador.\n2. **Vincular.** Os valores são encaixados ({{vinculados|bound}}) nos espaços do programa já compilado, cada um com seu tipo (`sqlite3_bind_text`, `sqlite3_bind_int64`...). Não há mais análise de sintaxe: o texto `' OR '1'='1` é uma string de 11 caracteres a ser comparada com a coluna, e nada além disso.\n3. **Executar.** O programa roda e devolve as linhas.\n\nO `sqlite3` do Python ainda guarda os últimos 128 comandos preparados: rodar a mesma consulta com valores diferentes, ou um `executemany` com mil linhas, não recompila nada.\n\nMontar o SQL com f-string ou `+` põe o valor **dentro do texto** antes do passo 1, e aí o banco o interpreta como SQL:"},{type:`table`,head:[`Valor digitado na busca`,`Com f-string: \`f"... WHERE nome LIKE '%{busca}%'"\``,'Com parâmetro: `"... WHERE nome LIKE ?"` e `(f"%{busca}%",)`'],rows:[["`suco`",`funciona`,`funciona`],["`D'Ávila`",'`OperationalError: near "Ávila": syntax error`: o apóstrofo fechou a string do SQL',`funciona: o apóstrofo é só um caractere do valor`],["`' OR 1=1 --`","vira `WHERE nome LIKE '%' OR 1=1 --%'`: o `--` comenta o resto, e a consulta devolve **todos** os produtos",`procura nomes que contenham esse texto: nenhum`]],caption:`Na segunda coluna, o f-string monta o SQL; na terceira, monta só o valor, o que é inofensivo.`},{type:`md`,text:'Essa é a {{injeção de SQL|SQL injection}}, que o nível de segurança estuda com ataques reais. Aqui basta a regra: **valor que vem de fora nunca entra no texto do SQL**.\n\nOs tipos atravessam assim: `None` ↔ NULL, `int` ↔ INTEGER, `float` ↔ REAL, `str` ↔ TEXT, `bytes` ↔ BLOB. Os outros você converte antes de passar: datas com `d.isoformat()` (os conversores automáticos de data do módulo estão obsoletos desde o Python 3.12) e dinheiro em centavos, com `int`. Cuidado com NULL: `WHERE email = ?` com `None` não casa com nada, porque em SQL qualquer comparação com `=` envolvendo NULL dá "desconhecido", nunca verdadeiro. No SQLite, `WHERE email IS ?` compara aceitando NULL; no PostgreSQL, o equivalente é `IS NOT DISTINCT FROM`.\n\n### Estilos de marcador\nCada driver escolhe o seu (a PEP 249 chama isso de *paramstyle*):'},{type:`table`,head:[`Driver`,`Banco`,`Marcadores`],rows:[["`sqlite3` (biblioteca padrão)",`SQLite`,"`?` (com tupla ou lista) e `:nome` (com dict)"],["`psycopg`",`PostgreSQL`,"`%s` e `%(nome)s`"],["`mysql-connector-python`, `PyMySQL`",`MySQL e MariaDB`,"`%s` e `%(nome)s`"]]},{type:`callout`,tone:`warn`,text:'O `%s` do psycopg **não** é a formatação de strings do Python. O certo é `cur.execute("SELECT * FROM t WHERE id = %s", (7,))`, com os valores no segundo argumento; `cur.execute("SELECT * FROM t WHERE id = %s" % 7)` monta o texto antes e volta ao problema da tabela acima. O mesmo vale para `:nome` no sqlite3: os valores vão num dict, no segundo argumento.',title:`Parece formatação, mas não é`},{type:`md`,text:"### Até onde vai um marcador\nUm marcador fica onde poderia estar um **valor literal**, como `'Recife'` ou `42`. Nome de tabela, nome de coluna, ASC/DESC e operadores fazem parte da estrutura do comando, que é decidida no passo 1, antes de qualquer valor existir:"},{type:`table`,head:[`Onde`,`Marcador funciona?`,`O que fazer`],rows:[[`valor em WHERE, SET ou VALUES`,`sim`,`parâmetro`],[`LIMIT e OFFSET`,`sim`,"parâmetro (garanta que é `int`)"],["nome de tabela: `FROM ?`",`não: erro de sintaxe`,`lista branca`],["direção ou operador: `ORDER BY nome ?`",`não: erro de sintaxe`,`lista branca`],["coluna de ordenação: `ORDER BY ?`",`roda **sem erro**, mas ordena por uma constante, e a ordem não muda`,`lista branca`],["vários valores: `IN (?)` recebendo uma lista","não: o driver recusa a lista (`type 'list' is not supported`)","um `?` por item"]]},{type:`md`,text:`A {{lista branca|allowlist}} resolve o que não pode ser parâmetro: o usuário escolhe uma **chave** de um conjunto fechado, e o trecho de SQL correspondente foi escrito por você.`},{type:`code`,lang:`python`,code:`ORDENS = {
    "nome": "nome, id",
    "preco": "preco_centavos, id",
    "-preco": "preco_centavos DESC, id",
}
if ordem not in ORDENS:
    raise ValueError(f"ordem inválida: {ordem!r}")
sql = f"SELECT id, nome FROM produtos ORDER BY {ORDENS[ordem]} LIMIT ?"
linhas = con.execute(sql, (por_pagina,)).fetchall()`,runnable:!1},{type:`md`,text:'Repare: essa linha monta SQL com f-string, e está certa. A regra não é "nunca use f-string no SQL"; é "**nada que veio de fora entra no texto**". O que entra aqui é `ORDENS[ordem]`, escrito por você; o que veio de fora, `ordem`, só serviu para escolher. Ferramentas de análise como o Bandit avisam sobre qualquer SQL montado com strings, e um comentário explicando a lista branca ajuda quem revisar o código.\n\n### Listas no IN\nGere um `?` por item. O texto ganha só pontos de interrogação e vírgulas, criados pelo seu código; os itens continuam indo como parâmetros:'},{type:`code`,lang:`python`,code:`cidades = ["Recife", "Olinda", "Caruaru"]
marcadores = ", ".join(["?"] * len(cidades))          # "?, ?, ?"
sql = f"SELECT nome FROM clientes WHERE cidade IN ({marcadores})"
linhas = con.execute(sql, cidades).fetchall()`,runnable:!1},{type:`md`,text:'- **Lista vazia:** o SQLite aceita `IN ()` (dá sempre falso), mas o PostgreSQL e o padrão SQL não. Trate a lista vazia antes e devolva o resultado vazio sem consultar.\n- **Limite:** o SQLite aceita até 32 766 marcadores por comando desde a versão 3.32 (antes eram 999). Para dezenas de milhares de itens, divida em lotes ou carregue os valores numa tabela temporária e faça JOIN.\n\n### Buscas com LIKE\nO curinga vai no **valor**: `nome LIKE ?` com `f"%{termo}%"`. Esse f-string monta o valor, não o SQL, e está certo. Mas o termo digitado pode ter seus próprios `%` e `_`, que o LIKE trata como {{caracteres curinga|wildcards}} (`%` casa com qualquer sequência; `_`, com exatamente um caractere): quem busca `100%` acharia também "Suco de caju 1000 ml". Para tratá-los como texto, escape-os e diga ao LIKE qual é o caractere de escape:'},{type:`code`,lang:`python`,code:`def escapar_like(termo):
    # a ordem importa: primeiro o próprio caractere de escape, depois os curingas
    return termo.replace("\\\\", "\\\\\\\\").replace("%", "\\\\%").replace("_", "\\\\_")

sql = "SELECT nome FROM produtos WHERE nome LIKE ? ESCAPE '\\\\'"
linhas = con.execute(sql, (f"%{escapar_like(termo)}%",)).fetchall()`,runnable:!1},{type:`md`,text:"Duas diferenças entre bancos: o LIKE do SQLite ignora maiúsculas e minúsculas, mas **só nas letras ASCII** (`'ana' LIKE 'ANA'` é verdadeiro; `'água' LIKE 'Água'` é falso), e o do PostgreSQL diferencia sempre (para ignorar, lá existe `ILIKE`). Para buscas que ignorem acentos, o caminho usual é guardar uma coluna normalizada, sem acentos e em minúsculas, e buscar nela.\n\n### Paginação\nUma vitrine com 10 000 produtos mostra 20 por vez:"},{type:`code`,lang:`python`,code:`sql = "SELECT id, nome, preco_centavos FROM produtos ORDER BY nome, id LIMIT ? OFFSET ?"
linhas = con.execute(sql, (por_pagina, (pagina - 1) * por_pagina)).fetchall()`,runnable:!1},{type:`md`,text:"- **A ordem precisa ser única.** Uma tabela não tem ordem própria: sem ORDER BY, ou com empates no ORDER BY, o banco pode devolver as linhas empatadas em ordens diferentes a cada consulta, e um item aparece em duas páginas enquanto outro não aparece em nenhuma. A documentação do PostgreSQL avisa exatamente isso sobre LIMIT. Desempate sempre por uma coluna única, como o id.\n- **O total vem de outra consulta**, com o mesmo WHERE: `SELECT COUNT(*) FROM produtos WHERE ...`. O número de páginas é o total dividido por `por_pagina`, arredondado para cima. Monte o WHERE e a lista de parâmetros uma vez e use nas duas consultas.\n- **Valide a entrada.** `pagina` e `por_pagina` vêm da URL: converta para `int`, recuse página menor que 1 e limite o tamanho da página (ninguém precisa de `por_pagina=1000000`)."},{type:`callout`,tone:`deep`,text:'`OFFSET 100000` não pula direto para a linha 100 001: o banco gera e descarta as 100 000 anteriores (a documentação do PostgreSQL diz isso com todas as letras), e a página fica mais lenta quanto mais longe. E se alguém cadastrar um produto enquanto o cliente navega, tudo escorrega uma posição: um item se repete na página seguinte.\n\nA {{paginação por chave|keyset pagination}} pede "os próximos 20 depois do último que eu vi":\n\n```sql\nSELECT id, nome FROM produtos\nWHERE (nome, id) > (?, ?)        -- nome e id da última linha da página anterior\nORDER BY nome, id\nLIMIT 20\n```\n\nCom um índice em `(nome, id)` (assunto do módulo de índices), cada página custa o mesmo, seja a 1ª ou a 5 000ª, e inserções não fazem itens se repetirem. O preço: não dá para pular direto para a página 37, só seguir em frente (ou voltar, invertendo a comparação). É o que fazem os feeds com "carregar mais". A comparação de linhas `(a, b) > (?, ?)` existe no SQLite desde a 3.15 e no PostgreSQL; com direções misturadas (preço decrescente, id crescente), escreva por extenso: `preco_centavos < ? OR (preco_centavos = ? AND id > ?)`.',title:`OFFSET fica caro: paginação por chave`}]},{stage:`exemplo`,blocks:[{type:`md`,text:'Uma loja online recebe `GET /produtos?busca=100%25&categoria=bebidas&categoria=hortifruti` (`%25` é o `%` codificado na URL; o framework já entrega `busca = "100%"`). Acompanhe a montagem do WHERE e da lista de parâmetros, linha a linha:'},{type:`trace`,code:`busca = "100%"
categorias = ["bebidas", "hortifruti"]

condicoes = []
params = []
if busca:
    escapado = busca.replace("\\\\", "\\\\\\\\").replace("%", "\\\\%").replace("_", "\\\\_")
    condicoes.append("nome LIKE ? ESCAPE '\\\\'")
    params.append("%" + escapado + "%")
if categorias:
    marcadores = ", ".join(["?"] * len(categorias))
    condicoes.append("categoria IN (" + marcadores + ")")
    params.extend(categorias)
where = " AND ".join(condicoes)
sql = "SELECT id, nome FROM produtos WHERE " + where
print(sql)
print(params)`,caption:`A lista de parâmetros aparece com a barra dobrada porque é assim que o Python mostra uma barra dentro de uma string; o valor tem uma barra só.`},{type:`table`,head:[`Pedaço da entrada`,`Onde foi parar`,`Técnica`],rows:[['`busca = "100%"`',"parâmetro 1: `%100\\%%`",'escape dos curingas, e o `%` de "contém" em volta, no valor'],['`categorias = ["bebidas", "hortifruti"]`',"parâmetros 2 e 3; no texto, só `IN (?, ?)`",`um marcador por item`],[`nenhum`,"`nome LIKE ? ESCAPE '\\'`, `AND`, `categoria IN (`",`texto escrito pelo programa`]],caption:`O texto final do SQL só tem palavras escritas pelo programador e pontos de interrogação.`},{type:`md`,text:'Isso dá um teste simples para qualquer código seu: imprima o `sql` e procure nele qualquer coisa que o usuário digitou. Se achar, há um buraco. Os exercícios desta lição fazem exatamente essa conferência, com uma conexão "espiã" que anota o texto de cada comando executado.\n\nE se a mesma busca viesse com `ordem=-preco&pagina=2`? A ordem passa pela lista branca (`ORDENS["-preco"]` vira `preco_centavos DESC, id` no texto), e a página vira mais dois parâmetros no fim: `LIMIT ? OFFSET ?` com `por_pagina` e `(2 - 1) * por_pagina`, ou seja, pula exatamente uma página. O mesmo `where` e a mesma lista de parâmetros, sem o LIMIT, servem para o `SELECT COUNT(*)` que calcula o total.'}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`import sqlite3

con = sqlite3.connect(":memory:")
con.execute("CREATE TABLE clientes (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, cidade TEXT, email TEXT)")

cur = con.execute("INSERT INTO clientes (nome, cidade) VALUES (?, ?)", ("Joana D'Arc", "Santa Bárbara d'Oeste"))
print("id gerado:", cur.lastrowid)

novos = [("Bruno", "Recife", "bruno@ex.com"), ("Carla", "Recife", None), ("Davi", "Manaus", "davi@ex.com")]
cur = con.executemany("INSERT INTO clientes (nome, cidade, email) VALUES (?, ?, ?)", novos)
print("inseridos:", cur.rowcount)
con.commit()

print(con.execute("SELECT nome, cidade FROM clientes WHERE id = ?", (1,)).fetchone())
print(con.execute("SELECT nome FROM clientes WHERE id = ?", (99,)).fetchone())    # nenhuma linha

con.row_factory = sqlite3.Row          # linhas acessíveis pelo nome da coluna
for linha in con.execute("SELECT nome, email FROM clientes WHERE cidade = :cidade ORDER BY nome", {"cidade": "Recife"}):
    print(linha["nome"], "->", linha["email"])

print("= NULL:", con.execute("SELECT COUNT(*) FROM clientes WHERE email = ?", (None,)).fetchone()[0])
print("IS NULL:", con.execute("SELECT COUNT(*) FROM clientes WHERE email IS ?", (None,)).fetchone()[0])

try:
    con.execute("SELECT * FROM clientes WHERE cidade = ?", ("Recife"))     # falta a vírgula
except sqlite3.ProgrammingError as e:
    print("erro:", e)`,runnable:!0,caption:`Os recursos da tabela da explicação, um por linha. Troque ("Recife") por ("Recife",) e veja o erro sumir.`},{type:`code`,lang:`python`,code:`import sqlite3

con = sqlite3.connect(":memory:")
con.execute("CREATE TABLE produtos (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, preco_centavos INTEGER NOT NULL)")
con.executemany("INSERT INTO produtos (nome, preco_centavos) VALUES (?, ?)", [
    ("Suco de uva 100% integral", 1290), ("Suco de laranja 1 L", 899), ("Água de coco 1 L", 1090),
    ("Suco de caju 1000 ml", 799), ("Refrigerante 2 L", 949), ("Suco de maçã 100% 1 L", 1190),
    ("Chá gelado 1,5 L", 699),
])

ORDENS = {   # lista branca: o usuário escolhe a chave; o texto do SQL é nosso
    "nome": "nome, id",
    "preco": "preco_centavos, id",
    "-preco": "preco_centavos DESC, id",
}

def buscar(con, termo, ordem="nome", pagina=1, por_pagina=3):
    if ordem not in ORDENS:
        raise ValueError(f"ordem inválida: {ordem!r}")
    escapado = termo.replace("\\\\", "\\\\\\\\").replace("%", "\\\\%").replace("_", "\\\\_")
    sql = ("SELECT nome, preco_centavos FROM produtos WHERE nome LIKE ? ESCAPE '\\\\' "
           f"ORDER BY {ORDENS[ordem]} LIMIT ? OFFSET ?")
    return con.execute(sql, (f"%{escapado}%", por_pagina, (pagina - 1) * por_pagina)).fetchall()

print(buscar(con, "suco"))
print(buscar(con, "suco", pagina=2))
print(buscar(con, "100%", ordem="-preco"))     # % literal: o "1000 ml" não entra
print(buscar(con, "' OR 1=1 --"))               # só um texto que nenhum nome contém
try:
    buscar(con, "suco", ordem="nome; DROP TABLE produtos")
except ValueError as e:
    print(e)`,runnable:!0,caption:`Tire o escape (use só f"%{termo}%") e busque "100%" de novo: o suco de caju de 1000 ml aparece.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e7-param-1`,kind:`mcq`,prompt:"Em qual destes comandos o marcador `?` funciona como o programador esperava?",difficulty:`facil`,skills:[`bd-sql`],hints:[`Um marcador ocupa o lugar de que tipo de coisa no SQL?`,`Em que momento o banco decide o que é tabela e o que é coluna: antes ou depois de receber os valores?`],explanation:`Um marcador ocupa o lugar de um valor literal, como 'Recife'. Nomes de tabela e de coluna e palavras como DESC fazem parte da estrutura, decidida quando o comando é compilado, antes de os valores chegarem. FROM ? e ORDER BY nome ? são erros de sintaxe; ORDER BY ? é pior: roda sem erro e ordena por uma constante. Para esses casos, use lista branca.`,options:[{text:'`SELECT nome FROM clientes WHERE cidade = ?` com `("Recife",)`',correct:!0,feedback:`Isso: o ? está no lugar de um valor, e o valor vai separado, como dado.`},{text:'`SELECT nome FROM ? WHERE id = 1` com `("clientes",)`',feedback:`Nome de tabela faz parte da estrutura do comando, decidida antes de qualquer valor existir: é erro de sintaxe. Use uma lista branca de tabelas permitidas.`},{text:'`SELECT nome FROM clientes ORDER BY ?` com `("nome",)`',feedback:`Esse é traiçoeiro: roda sem erro, mas o ? vira o valor constante 'nome', igual para todas as linhas, e a ordem não muda. Coluna de ordenação vem de uma lista branca.`},{text:'`SELECT nome FROM clientes ORDER BY nome ?` com `("DESC",)`',feedback:`DESC é uma palavra da linguagem, não um valor: é erro de sintaxe. Escolha entre trechos fixos de SQL com uma lista branca.`}]}},{type:`exercise`,exercise:{id:`e7-param-2`,kind:`sql`,prompt:"A vitrine mostra **4 produtos por página**, do mais barato para o mais caro; em empate de preço, em ordem alfabética de nome. Escreva a consulta da **página 3** (colunas `id`, `nome`, `preco_centavos`).",difficulty:`facil`,skills:[`bd-sql`],hints:[`Quantos produtos as páginas 1 e 2 já mostraram? É quantos a página 3 precisa pular.`,`Qual cláusula limita a quantidade de linhas, e qual pula as primeiras?`,`Vários produtos têm o mesmo preço. O que o ORDER BY precisa ter para a ordem entre eles ser sempre a mesma?`],explanation:`SELECT id, nome, preco_centavos FROM produtos ORDER BY preco_centavos, nome LIMIT 4 OFFSET 8; — a página p pula (p − 1) × 4 linhas. O segundo critério do ORDER BY desempata os produtos de mesmo preço; sem ele, a ordem entre empatados fica a critério do banco, e um produto pode aparecer em duas páginas enquanto outro some. No programa, 4 e 8 viriam como parâmetros: LIMIT ? OFFSET ?.`,setup:`CREATE TABLE produtos (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, preco_centavos INTEGER NOT NULL);
INSERT INTO produtos VALUES
  (1, 'Sabão em pó 1 kg', 1590),
  (2, 'Detergente 500 ml', 249),
  (3, 'Esponja dupla face', 299),
  (4, 'Amaciante 2 L', 1290),
  (5, 'Desinfetante 1 L', 899),
  (6, 'Papel toalha 2 rolos', 899),
  (7, 'Vassoura', 1590),
  (8, 'Limpa-vidros 500 ml', 899),
  (9, 'Saco de lixo 50 L', 1290),
  (10, 'Flanela', 449),
  (11, 'Lustra-móveis 200 ml', 1290),
  (12, 'Pano de chão', 449);`,starter:`SELECT id, nome, preco_centavos FROM produtos ORDER BY preco_centavos LIMIT 4;`,solution:`SELECT id, nome, preco_centavos FROM produtos ORDER BY preco_centavos, nome LIMIT 4 OFFSET 8;`,ordered:!0}},{type:`exercise`,exercise:{id:`e7-param-3`,kind:`predict`,lang:`python`,prompt:`O que este programa imprime? Compare a consulta com parâmetro e a consulta com f-string, e preste atenção ao LIKE.`,difficulty:`intermediario`,skills:[`bd-sql`],hints:[`Com o parâmetro, o banco compara a coluna nome com qual texto exatamente?`,`Monte à mão o SQL do f-string: o que fica depois de nome = ? Repare onde cada apóstrofo abre e fecha uma string.`,`Quais nomes terminam em a? O LIKE do SQLite liga para maiúsculas nas letras ASCII?`,`O que fetchone() devolve quando nenhuma linha satisfaz o WHERE?`],explanation:`Com o parâmetro, o banco procura alguém chamado literalmente x' OR '1'='1: ninguém, 0. Com o f-string, o texto vira WHERE nome = 'x' OR '1'='1', e '1'='1' é verdadeiro para todas as linhas: 3. O LIKE '%a' pega os nomes terminados em a (Ana e Carla; o SQLite ignora maiúsculas nas letras ASCII), então rowcount é 2 e os dois viram maiúsculas. Não há cliente de id 9, e fetchone() devolve None.`,code:`import sqlite3

con = sqlite3.connect(":memory:")
con.executescript("""
CREATE TABLE clientes (id INTEGER PRIMARY KEY, nome TEXT);
INSERT INTO clientes (nome) VALUES ('Ana'), ('Bruno'), ('Carla');
""")
nome = "x' OR '1'='1"
print(con.execute("SELECT COUNT(*) FROM clientes WHERE nome = ?", (nome,)).fetchone()[0])
print(con.execute(f"SELECT COUNT(*) FROM clientes WHERE nome = '{nome}'").fetchone()[0])
cur = con.execute("UPDATE clientes SET nome = upper(nome) WHERE nome LIKE ?", ("%a",))
print(cur.rowcount)
print(con.execute("SELECT nome FROM clientes WHERE id = ?", (9,)).fetchone())
print(con.execute("SELECT nome FROM clientes ORDER BY id").fetchall())`,answer:`0
3
2
None
[('ANA',), ('Bruno',), ('CARLA',)]`}},{type:`exercise`,exercise:{id:`e7-param-4`,kind:`code`,lang:`python`,prompt:"Escreva `clientes_das_cidades(con, cidades)`, que devolve a lista com o **nome** dos clientes cuja cidade está na lista `cidades`, em ordem alfabética. A tabela é `clientes(id, nome, cidade)`.\n\n- `cidades` pode ter de 0 a centenas de nomes, inclusive com apóstrofo (Santa Bárbara d'Oeste, Olho d'Água das Flores).\n- O filtro é feito no banco, com **uma** consulta que usa `IN`.\n- Lista vazia devolve `[]` sem consultar o banco (o `IN ()` vazio não funciona em todo banco).\n- Nenhum valor de `cidades` pode aparecer dentro do texto do SQL: os testes conferem o texto de cada comando que você executa.",difficulty:`intermediario`,skills:[`bd-sql`],hints:[`Um único ? pode receber uma lista inteira?`,`Se a lista tem 3 cidades, quantos marcadores o IN precisa ter? Como gerar esse texto a partir do tamanho da lista?`,`O que o texto do IN fica com zero cidades? Isso funciona em todo banco?`],explanation:`Gere um marcador por cidade com ", ".join(["?"] * len(cidades)) e passe a lista como parâmetros: o texto do SQL ganha só pontos de interrogação, e as cidades vão como dados, com apóstrofo e tudo. A lista vazia é tratada antes de consultar (IN () funciona no SQLite, mas não no PostgreSQL). Montar o IN com aspas em volta de cada cidade quebra com o apóstrofo de d'Oeste e abre espaço para injeção; os testes detectam as duas coisas.`,starter:`def clientes_das_cidades(con, cidades):
    # devolva os nomes dos clientes cuja cidade está em cidades, em ordem alfabética;
    # cada cidade vai como parâmetro, nunca dentro do texto do SQL
    pass`,solution:`def clientes_das_cidades(con, cidades):
    if not cidades:
        return []
    marcadores = ", ".join(["?"] * len(cidades))
    sql = f"SELECT nome FROM clientes WHERE cidade IN ({marcadores}) ORDER BY nome"
    return [nome for (nome,) in con.execute(sql, list(cidades))]`,tests:[{name:`uma ou várias cidades`,code:`import sqlite3

class _Espiao:
    def __init__(self, con):
        self._con = con
        self.sqls = []
    def execute(self, sql, params=()):
        self.sqls.append(sql)
        return self._con.execute(sql, params)
    def executemany(self, sql, seq):
        self.sqls.append(sql)
        return self._con.executemany(sql, seq)
    def cursor(self):
        return _CursorEspiao(self, self._con.cursor())
    def __getattr__(self, nome):
        return getattr(self._con, nome)

class _CursorEspiao:
    def __init__(self, espiao, cur):
        self._espiao = espiao
        self._cur = cur
    def execute(self, sql, params=()):
        self._espiao.sqls.append(sql)
        self._cur.execute(sql, params)
        return self
    def executemany(self, sql, seq):
        self._espiao.sqls.append(sql)
        self._cur.executemany(sql, seq)
        return self
    def __iter__(self):
        return iter(self._cur)
    def __getattr__(self, nome):
        return getattr(self._cur, nome)

def _sem_valores_no_sql(espiao, valores):
    for v in valores:
        for sql in espiao.sqls:
            assert v not in sql, f"o valor {v!r} apareceu dentro do texto do SQL: {sql!r}. Valores que vêm de fora vão como parâmetros (?), nunca dentro do texto"
def _banco():
    con = sqlite3.connect(":memory:")
    con.execute("CREATE TABLE clientes (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, cidade TEXT NOT NULL)")
    con.executemany("INSERT INTO clientes (nome, cidade) VALUES (?, ?)", [
        ("Joana", "Santa Bárbara d'Oeste"),
        ("Bruno", "Recife"),
        ("Ana", "Recife"),
        ("Caio", "Olho d'Água das Flores"),
        ("Davi", "Manaus"),
        ("Eva", "Pau dos Ferros"),
        ("Fábio", "São Paulo"),
    ])
    return con
con = _banco()
casos = [
    (["Recife"], ["Ana", "Bruno"]),
    (["Manaus", "Recife"], ["Ana", "Bruno", "Davi"]),
    (["Recife", "Manaus", "São Paulo"], ["Ana", "Bruno", "Davi", "Fábio"]),
    (["Curitiba"], []),
]
for cidades, esperado in casos:
    r = clientes_das_cidades(con, cidades)
    assert r == esperado, f"clientes_das_cidades(con, {cidades}) devolveu {r!r}, esperado {esperado} (só os nomes, em ordem alfabética)"`},{name:`cidades com apóstrofo`,code:`import sqlite3

class _Espiao:
    def __init__(self, con):
        self._con = con
        self.sqls = []
    def execute(self, sql, params=()):
        self.sqls.append(sql)
        return self._con.execute(sql, params)
    def executemany(self, sql, seq):
        self.sqls.append(sql)
        return self._con.executemany(sql, seq)
    def cursor(self):
        return _CursorEspiao(self, self._con.cursor())
    def __getattr__(self, nome):
        return getattr(self._con, nome)

class _CursorEspiao:
    def __init__(self, espiao, cur):
        self._espiao = espiao
        self._cur = cur
    def execute(self, sql, params=()):
        self._espiao.sqls.append(sql)
        self._cur.execute(sql, params)
        return self
    def executemany(self, sql, seq):
        self._espiao.sqls.append(sql)
        self._cur.executemany(sql, seq)
        return self
    def __iter__(self):
        return iter(self._cur)
    def __getattr__(self, nome):
        return getattr(self._cur, nome)

def _sem_valores_no_sql(espiao, valores):
    for v in valores:
        for sql in espiao.sqls:
            assert v not in sql, f"o valor {v!r} apareceu dentro do texto do SQL: {sql!r}. Valores que vêm de fora vão como parâmetros (?), nunca dentro do texto"
def _banco():
    con = sqlite3.connect(":memory:")
    con.execute("CREATE TABLE clientes (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, cidade TEXT NOT NULL)")
    con.executemany("INSERT INTO clientes (nome, cidade) VALUES (?, ?)", [
        ("Joana", "Santa Bárbara d'Oeste"),
        ("Bruno", "Recife"),
        ("Ana", "Recife"),
        ("Caio", "Olho d'Água das Flores"),
        ("Davi", "Manaus"),
        ("Eva", "Pau dos Ferros"),
        ("Fábio", "São Paulo"),
    ])
    return con
con = _banco()
cidades = ["Santa Bárbara d'Oeste", "Olho d'Água das Flores"]
r = clientes_das_cidades(con, cidades)
assert r == ["Caio", "Joana"], f"com {cidades}, veio {r!r}, esperado ['Caio', 'Joana']"`},{name:`lista vazia`,code:`import sqlite3

class _Espiao:
    def __init__(self, con):
        self._con = con
        self.sqls = []
    def execute(self, sql, params=()):
        self.sqls.append(sql)
        return self._con.execute(sql, params)
    def executemany(self, sql, seq):
        self.sqls.append(sql)
        return self._con.executemany(sql, seq)
    def cursor(self):
        return _CursorEspiao(self, self._con.cursor())
    def __getattr__(self, nome):
        return getattr(self._con, nome)

class _CursorEspiao:
    def __init__(self, espiao, cur):
        self._espiao = espiao
        self._cur = cur
    def execute(self, sql, params=()):
        self._espiao.sqls.append(sql)
        self._cur.execute(sql, params)
        return self
    def executemany(self, sql, seq):
        self._espiao.sqls.append(sql)
        self._cur.executemany(sql, seq)
        return self
    def __iter__(self):
        return iter(self._cur)
    def __getattr__(self, nome):
        return getattr(self._cur, nome)

def _sem_valores_no_sql(espiao, valores):
    for v in valores:
        for sql in espiao.sqls:
            assert v not in sql, f"o valor {v!r} apareceu dentro do texto do SQL: {sql!r}. Valores que vêm de fora vão como parâmetros (?), nunca dentro do texto"
def _banco():
    con = sqlite3.connect(":memory:")
    con.execute("CREATE TABLE clientes (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, cidade TEXT NOT NULL)")
    con.executemany("INSERT INTO clientes (nome, cidade) VALUES (?, ?)", [
        ("Joana", "Santa Bárbara d'Oeste"),
        ("Bruno", "Recife"),
        ("Ana", "Recife"),
        ("Caio", "Olho d'Água das Flores"),
        ("Davi", "Manaus"),
        ("Eva", "Pau dos Ferros"),
        ("Fábio", "São Paulo"),
    ])
    return con
espiao = _Espiao(_banco())
r = clientes_das_cidades(espiao, [])
assert r == [], f"com a lista vazia, esperado [], veio {r!r}"
assert espiao.sqls == [], f"com a lista vazia, nenhuma consulta deveria ir ao banco, mas foi executado {espiao.sqls}. Trate a lista vazia antes: o IN () é recusado pelo PostgreSQL"`},{name:`tentativas de injeção não devolvem ninguém`,code:`import sqlite3

class _Espiao:
    def __init__(self, con):
        self._con = con
        self.sqls = []
    def execute(self, sql, params=()):
        self.sqls.append(sql)
        return self._con.execute(sql, params)
    def executemany(self, sql, seq):
        self.sqls.append(sql)
        return self._con.executemany(sql, seq)
    def cursor(self):
        return _CursorEspiao(self, self._con.cursor())
    def __getattr__(self, nome):
        return getattr(self._con, nome)

class _CursorEspiao:
    def __init__(self, espiao, cur):
        self._espiao = espiao
        self._cur = cur
    def execute(self, sql, params=()):
        self._espiao.sqls.append(sql)
        self._cur.execute(sql, params)
        return self
    def executemany(self, sql, seq):
        self._espiao.sqls.append(sql)
        self._cur.executemany(sql, seq)
        return self
    def __iter__(self):
        return iter(self._cur)
    def __getattr__(self, nome):
        return getattr(self._cur, nome)

def _sem_valores_no_sql(espiao, valores):
    for v in valores:
        for sql in espiao.sqls:
            assert v not in sql, f"o valor {v!r} apareceu dentro do texto do SQL: {sql!r}. Valores que vêm de fora vão como parâmetros (?), nunca dentro do texto"
def _banco():
    con = sqlite3.connect(":memory:")
    con.execute("CREATE TABLE clientes (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, cidade TEXT NOT NULL)")
    con.executemany("INSERT INTO clientes (nome, cidade) VALUES (?, ?)", [
        ("Joana", "Santa Bárbara d'Oeste"),
        ("Bruno", "Recife"),
        ("Ana", "Recife"),
        ("Caio", "Olho d'Água das Flores"),
        ("Davi", "Manaus"),
        ("Eva", "Pau dos Ferros"),
        ("Fábio", "São Paulo"),
    ])
    return con
con = _banco()
for ataque in ["x') OR ('1'='1", "Recife') OR 1=1 --", 'x") OR 1=1 --']:
    r = clientes_das_cidades(con, [ataque])
    assert r == [], f"com a cidade {ataque!r}, que não existe, veio {r!r}: o valor foi interpretado como SQL"
n = con.execute("SELECT COUNT(*) FROM clientes").fetchone()[0]
assert n == 7, "a tabela clientes perdeu linhas"`},{name:`valores só como parâmetros`,code:`import sqlite3

class _Espiao:
    def __init__(self, con):
        self._con = con
        self.sqls = []
    def execute(self, sql, params=()):
        self.sqls.append(sql)
        return self._con.execute(sql, params)
    def executemany(self, sql, seq):
        self.sqls.append(sql)
        return self._con.executemany(sql, seq)
    def cursor(self):
        return _CursorEspiao(self, self._con.cursor())
    def __getattr__(self, nome):
        return getattr(self._con, nome)

class _CursorEspiao:
    def __init__(self, espiao, cur):
        self._espiao = espiao
        self._cur = cur
    def execute(self, sql, params=()):
        self._espiao.sqls.append(sql)
        self._cur.execute(sql, params)
        return self
    def executemany(self, sql, seq):
        self._espiao.sqls.append(sql)
        self._cur.executemany(sql, seq)
        return self
    def __iter__(self):
        return iter(self._cur)
    def __getattr__(self, nome):
        return getattr(self._cur, nome)

def _sem_valores_no_sql(espiao, valores):
    for v in valores:
        for sql in espiao.sqls:
            assert v not in sql, f"o valor {v!r} apareceu dentro do texto do SQL: {sql!r}. Valores que vêm de fora vão como parâmetros (?), nunca dentro do texto"
def _banco():
    con = sqlite3.connect(":memory:")
    con.execute("CREATE TABLE clientes (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, cidade TEXT NOT NULL)")
    con.executemany("INSERT INTO clientes (nome, cidade) VALUES (?, ?)", [
        ("Joana", "Santa Bárbara d'Oeste"),
        ("Bruno", "Recife"),
        ("Ana", "Recife"),
        ("Caio", "Olho d'Água das Flores"),
        ("Davi", "Manaus"),
        ("Eva", "Pau dos Ferros"),
        ("Fábio", "São Paulo"),
    ])
    return con
espiao = _Espiao(_banco())
cidades = ["Pau dos Ferros", "Santa Bárbara d'Oeste", "São Paulo"]
r = clientes_das_cidades(espiao, cidades)
assert r == ["Eva", "Fábio", "Joana"], f"com {cidades}, veio {r!r}"
_sem_valores_no_sql(espiao, cidades)
assert len(espiao.sqls) == 1, f"esperada uma única consulta, mas foram executadas {len(espiao.sqls)}: {espiao.sqls}"
sql = espiao.sqls[0]
assert " in " in sql.lower().replace("(", " ("), f"a consulta deveria filtrar no banco com IN: {sql!r}"
assert sql.count("?") == len(cidades), f"com {len(cidades)} cidades, o IN precisa de {len(cidades)} marcadores, mas o SQL tem {sql.count('?')}: {sql!r}"`},{name:`lista com 500 cidades`,code:`import sqlite3

class _Espiao:
    def __init__(self, con):
        self._con = con
        self.sqls = []
    def execute(self, sql, params=()):
        self.sqls.append(sql)
        return self._con.execute(sql, params)
    def executemany(self, sql, seq):
        self.sqls.append(sql)
        return self._con.executemany(sql, seq)
    def cursor(self):
        return _CursorEspiao(self, self._con.cursor())
    def __getattr__(self, nome):
        return getattr(self._con, nome)

class _CursorEspiao:
    def __init__(self, espiao, cur):
        self._espiao = espiao
        self._cur = cur
    def execute(self, sql, params=()):
        self._espiao.sqls.append(sql)
        self._cur.execute(sql, params)
        return self
    def executemany(self, sql, seq):
        self._espiao.sqls.append(sql)
        self._cur.executemany(sql, seq)
        return self
    def __iter__(self):
        return iter(self._cur)
    def __getattr__(self, nome):
        return getattr(self._cur, nome)

def _sem_valores_no_sql(espiao, valores):
    for v in valores:
        for sql in espiao.sqls:
            assert v not in sql, f"o valor {v!r} apareceu dentro do texto do SQL: {sql!r}. Valores que vêm de fora vão como parâmetros (?), nunca dentro do texto"
def _banco():
    con = sqlite3.connect(":memory:")
    con.execute("CREATE TABLE clientes (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, cidade TEXT NOT NULL)")
    con.executemany("INSERT INTO clientes (nome, cidade) VALUES (?, ?)", [
        ("Joana", "Santa Bárbara d'Oeste"),
        ("Bruno", "Recife"),
        ("Ana", "Recife"),
        ("Caio", "Olho d'Água das Flores"),
        ("Davi", "Manaus"),
        ("Eva", "Pau dos Ferros"),
        ("Fábio", "São Paulo"),
    ])
    return con
con = _banco()
cidades = [f"Cidade {i}" for i in range(498)] + ["Recife", "Manaus"]
r = clientes_das_cidades(con, cidades)
assert r == ["Ana", "Bruno", "Davi"], f"com 500 cidades (entre elas Recife e Manaus), veio {r!r}"`}]}},{type:`exercise`,exercise:{id:`e7-param-5`,kind:`fix`,lang:`python`,prompt:'Um colega leu que não se deve pôr valor do usuário dentro do SQL e escreveu `listar_produtos(con, ordem)` com um marcador. Roda sem erro nenhum, mas a lista sai sempre na mesma ordem, qualquer que seja `ordem`. Corrija:\n\n- `"nome"`: de A a Z;\n- `"preco"`: do mais barato ao mais caro;\n- `"-preco"`: do mais caro ao mais barato;\n- em empate de preço, por nome (de A a Z);\n- qualquer outro valor de `ordem` lança `ValueError`, sem executar nada no banco.\n- a ordenação continua sendo feita pelo banco, com ORDER BY.\n\nA tabela é `produtos(id, nome, preco_centavos)`, e a função devolve a lista de nomes.',difficulty:`intermediario`,skills:[`bd-sql`],hints:[`O que o banco faz com um ? no ORDER BY? Por qual valor cada linha está sendo ordenada?`,`Nome de coluna e DESC podem ser parâmetros? Se não podem, de onde vem o trecho do ORDER BY?`,`Como garantir que só três trechos de SQL, escritos por você, possam entrar no texto?`,`Como desempatar dois produtos com o mesmo preço?`],explanation:`ORDER BY ? recebe o valor como uma constante (o texto 'preco', igual para todas as linhas), e ordenar por uma constante não muda nada. Coluna e direção fazem parte da estrutura do comando, então vêm de uma lista branca: um dict que leva cada opção válida a um trecho fixo de SQL, com o desempate por nome. Qualquer chave fora do dict vira ValueError antes de executar. Colar a ordem com f-string resolveria "nome", mas deixaria "nome; DROP TABLE produtos" chegar ao banco; e conferir se a coluna existe aceitaria "id", que não está na lista.`,starter:`def listar_produtos(con, ordem="nome"):
    sql = "SELECT nome FROM produtos ORDER BY ?"
    return [nome for (nome,) in con.execute(sql, (ordem,))]`,solution:`ORDENS = {
    "nome": "nome",
    "preco": "preco_centavos, nome",
    "-preco": "preco_centavos DESC, nome",
}

def listar_produtos(con, ordem="nome"):
    if ordem not in ORDENS:
        raise ValueError(f"ordem inválida: {ordem!r}")
    sql = "SELECT nome FROM produtos ORDER BY " + ORDENS[ordem]
    return [nome for (nome,) in con.execute(sql)]`,tests:[{name:`as três ordens`,code:`import sqlite3

class _Espiao:
    def __init__(self, con):
        self._con = con
        self.sqls = []
    def execute(self, sql, params=()):
        self.sqls.append(sql)
        return self._con.execute(sql, params)
    def executemany(self, sql, seq):
        self.sqls.append(sql)
        return self._con.executemany(sql, seq)
    def cursor(self):
        return _CursorEspiao(self, self._con.cursor())
    def __getattr__(self, nome):
        return getattr(self._con, nome)

class _CursorEspiao:
    def __init__(self, espiao, cur):
        self._espiao = espiao
        self._cur = cur
    def execute(self, sql, params=()):
        self._espiao.sqls.append(sql)
        self._cur.execute(sql, params)
        return self
    def executemany(self, sql, seq):
        self._espiao.sqls.append(sql)
        self._cur.executemany(sql, seq)
        return self
    def __iter__(self):
        return iter(self._cur)
    def __getattr__(self, nome):
        return getattr(self._cur, nome)

def _sem_valores_no_sql(espiao, valores):
    for v in valores:
        for sql in espiao.sqls:
            assert v not in sql, f"o valor {v!r} apareceu dentro do texto do SQL: {sql!r}. Valores que vêm de fora vão como parâmetros (?), nunca dentro do texto"
def _banco():
    con = sqlite3.connect(":memory:")
    con.execute("CREATE TABLE produtos (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, preco_centavos INTEGER NOT NULL)")
    con.executemany("INSERT INTO produtos (nome, preco_centavos) VALUES (?, ?)", [
        ("Pão francês (kg)", 1690), ("Café 500 g", 1890), ("Biscoito de polvilho", 549),
        ("Leite 1 L", 589), ("Manteiga 200 g", 1290), ("Açúcar 1 kg", 549),
    ])
    return con

_POR_NOME = ["Açúcar 1 kg", "Biscoito de polvilho", "Café 500 g", "Leite 1 L", "Manteiga 200 g", "Pão francês (kg)"]
_POR_PRECO = ["Açúcar 1 kg", "Biscoito de polvilho", "Leite 1 L", "Manteiga 200 g", "Pão francês (kg)", "Café 500 g"]
_POR_PRECO_DESC = ["Café 500 g", "Pão francês (kg)", "Manteiga 200 g", "Leite 1 L", "Açúcar 1 kg", "Biscoito de polvilho"]
con = _banco()
for ordem, esperado in [("nome", _POR_NOME), ("preco", _POR_PRECO), ("-preco", _POR_PRECO_DESC)]:
    r = listar_produtos(con, ordem)
    assert r == esperado, f"listar_produtos(con, {ordem!r}) devolveu {r}, esperado {esperado}"`},{name:`empate de preço desempata por nome`,code:`import sqlite3

class _Espiao:
    def __init__(self, con):
        self._con = con
        self.sqls = []
    def execute(self, sql, params=()):
        self.sqls.append(sql)
        return self._con.execute(sql, params)
    def executemany(self, sql, seq):
        self.sqls.append(sql)
        return self._con.executemany(sql, seq)
    def cursor(self):
        return _CursorEspiao(self, self._con.cursor())
    def __getattr__(self, nome):
        return getattr(self._con, nome)

class _CursorEspiao:
    def __init__(self, espiao, cur):
        self._espiao = espiao
        self._cur = cur
    def execute(self, sql, params=()):
        self._espiao.sqls.append(sql)
        self._cur.execute(sql, params)
        return self
    def executemany(self, sql, seq):
        self._espiao.sqls.append(sql)
        self._cur.executemany(sql, seq)
        return self
    def __iter__(self):
        return iter(self._cur)
    def __getattr__(self, nome):
        return getattr(self._cur, nome)

def _sem_valores_no_sql(espiao, valores):
    for v in valores:
        for sql in espiao.sqls:
            assert v not in sql, f"o valor {v!r} apareceu dentro do texto do SQL: {sql!r}. Valores que vêm de fora vão como parâmetros (?), nunca dentro do texto"
def _banco():
    con = sqlite3.connect(":memory:")
    con.execute("CREATE TABLE produtos (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, preco_centavos INTEGER NOT NULL)")
    con.executemany("INSERT INTO produtos (nome, preco_centavos) VALUES (?, ?)", [
        ("Pão francês (kg)", 1690), ("Café 500 g", 1890), ("Biscoito de polvilho", 549),
        ("Leite 1 L", 589), ("Manteiga 200 g", 1290), ("Açúcar 1 kg", 549),
    ])
    return con

_POR_NOME = ["Açúcar 1 kg", "Biscoito de polvilho", "Café 500 g", "Leite 1 L", "Manteiga 200 g", "Pão francês (kg)"]
_POR_PRECO = ["Açúcar 1 kg", "Biscoito de polvilho", "Leite 1 L", "Manteiga 200 g", "Pão francês (kg)", "Café 500 g"]
_POR_PRECO_DESC = ["Café 500 g", "Pão francês (kg)", "Manteiga 200 g", "Leite 1 L", "Açúcar 1 kg", "Biscoito de polvilho"]
con = _banco()
r = listar_produtos(con, "-preco")
assert r[-2:] == ["Açúcar 1 kg", "Biscoito de polvilho"], f"Açúcar e Biscoito custam o mesmo (549): em empate, a ordem é por nome, mesmo na ordem decrescente de preço. Veio {r[-2:]}"`},{name:`ordem padrão`,code:`import sqlite3

class _Espiao:
    def __init__(self, con):
        self._con = con
        self.sqls = []
    def execute(self, sql, params=()):
        self.sqls.append(sql)
        return self._con.execute(sql, params)
    def executemany(self, sql, seq):
        self.sqls.append(sql)
        return self._con.executemany(sql, seq)
    def cursor(self):
        return _CursorEspiao(self, self._con.cursor())
    def __getattr__(self, nome):
        return getattr(self._con, nome)

class _CursorEspiao:
    def __init__(self, espiao, cur):
        self._espiao = espiao
        self._cur = cur
    def execute(self, sql, params=()):
        self._espiao.sqls.append(sql)
        self._cur.execute(sql, params)
        return self
    def executemany(self, sql, seq):
        self._espiao.sqls.append(sql)
        self._cur.executemany(sql, seq)
        return self
    def __iter__(self):
        return iter(self._cur)
    def __getattr__(self, nome):
        return getattr(self._cur, nome)

def _sem_valores_no_sql(espiao, valores):
    for v in valores:
        for sql in espiao.sqls:
            assert v not in sql, f"o valor {v!r} apareceu dentro do texto do SQL: {sql!r}. Valores que vêm de fora vão como parâmetros (?), nunca dentro do texto"
def _banco():
    con = sqlite3.connect(":memory:")
    con.execute("CREATE TABLE produtos (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, preco_centavos INTEGER NOT NULL)")
    con.executemany("INSERT INTO produtos (nome, preco_centavos) VALUES (?, ?)", [
        ("Pão francês (kg)", 1690), ("Café 500 g", 1890), ("Biscoito de polvilho", 549),
        ("Leite 1 L", 589), ("Manteiga 200 g", 1290), ("Açúcar 1 kg", 549),
    ])
    return con

_POR_NOME = ["Açúcar 1 kg", "Biscoito de polvilho", "Café 500 g", "Leite 1 L", "Manteiga 200 g", "Pão francês (kg)"]
_POR_PRECO = ["Açúcar 1 kg", "Biscoito de polvilho", "Leite 1 L", "Manteiga 200 g", "Pão francês (kg)", "Café 500 g"]
_POR_PRECO_DESC = ["Café 500 g", "Pão francês (kg)", "Manteiga 200 g", "Leite 1 L", "Açúcar 1 kg", "Biscoito de polvilho"]
con = _banco()
r = listar_produtos(con)
assert r == _POR_NOME, f"sem informar a ordem, esperado {_POR_NOME}, veio {r}"`},{name:`valores fora da lista branca`,code:`import sqlite3

class _Espiao:
    def __init__(self, con):
        self._con = con
        self.sqls = []
    def execute(self, sql, params=()):
        self.sqls.append(sql)
        return self._con.execute(sql, params)
    def executemany(self, sql, seq):
        self.sqls.append(sql)
        return self._con.executemany(sql, seq)
    def cursor(self):
        return _CursorEspiao(self, self._con.cursor())
    def __getattr__(self, nome):
        return getattr(self._con, nome)

class _CursorEspiao:
    def __init__(self, espiao, cur):
        self._espiao = espiao
        self._cur = cur
    def execute(self, sql, params=()):
        self._espiao.sqls.append(sql)
        self._cur.execute(sql, params)
        return self
    def executemany(self, sql, seq):
        self._espiao.sqls.append(sql)
        self._cur.executemany(sql, seq)
        return self
    def __iter__(self):
        return iter(self._cur)
    def __getattr__(self, nome):
        return getattr(self._cur, nome)

def _sem_valores_no_sql(espiao, valores):
    for v in valores:
        for sql in espiao.sqls:
            assert v not in sql, f"o valor {v!r} apareceu dentro do texto do SQL: {sql!r}. Valores que vêm de fora vão como parâmetros (?), nunca dentro do texto"
def _banco():
    con = sqlite3.connect(":memory:")
    con.execute("CREATE TABLE produtos (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, preco_centavos INTEGER NOT NULL)")
    con.executemany("INSERT INTO produtos (nome, preco_centavos) VALUES (?, ?)", [
        ("Pão francês (kg)", 1690), ("Café 500 g", 1890), ("Biscoito de polvilho", 549),
        ("Leite 1 L", 589), ("Manteiga 200 g", 1290), ("Açúcar 1 kg", 549),
    ])
    return con

_POR_NOME = ["Açúcar 1 kg", "Biscoito de polvilho", "Café 500 g", "Leite 1 L", "Manteiga 200 g", "Pão francês (kg)"]
_POR_PRECO = ["Açúcar 1 kg", "Biscoito de polvilho", "Leite 1 L", "Manteiga 200 g", "Pão francês (kg)", "Café 500 g"]
_POR_PRECO_DESC = ["Café 500 g", "Pão francês (kg)", "Manteiga 200 g", "Leite 1 L", "Açúcar 1 kg", "Biscoito de polvilho"]
con = _banco()
for ordem in ["nome; DROP TABLE produtos", "preco DESC", "Nome", "", "id", "(SELECT 1)", "nome --"]:
    try:
        listar_produtos(con, ordem)
    except ValueError:
        pass
    except Exception as e:
        raise AssertionError(f"com ordem={ordem!r}, esperado ValueError antes de executar qualquer coisa, mas veio {type(e).__name__}: {e}. O valor chegou ao banco")
    else:
        raise AssertionError(f"com ordem={ordem!r}, esperado ValueError: só 'nome', 'preco' e '-preco' são aceitos")
n = con.execute("SELECT COUNT(*) FROM produtos").fetchone()[0]
assert n == 6, "a tabela produtos perdeu linhas"`},{name:`quem ordena é o banco`,code:`import sqlite3

class _Espiao:
    def __init__(self, con):
        self._con = con
        self.sqls = []
    def execute(self, sql, params=()):
        self.sqls.append(sql)
        return self._con.execute(sql, params)
    def executemany(self, sql, seq):
        self.sqls.append(sql)
        return self._con.executemany(sql, seq)
    def cursor(self):
        return _CursorEspiao(self, self._con.cursor())
    def __getattr__(self, nome):
        return getattr(self._con, nome)

class _CursorEspiao:
    def __init__(self, espiao, cur):
        self._espiao = espiao
        self._cur = cur
    def execute(self, sql, params=()):
        self._espiao.sqls.append(sql)
        self._cur.execute(sql, params)
        return self
    def executemany(self, sql, seq):
        self._espiao.sqls.append(sql)
        self._cur.executemany(sql, seq)
        return self
    def __iter__(self):
        return iter(self._cur)
    def __getattr__(self, nome):
        return getattr(self._cur, nome)

def _sem_valores_no_sql(espiao, valores):
    for v in valores:
        for sql in espiao.sqls:
            assert v not in sql, f"o valor {v!r} apareceu dentro do texto do SQL: {sql!r}. Valores que vêm de fora vão como parâmetros (?), nunca dentro do texto"
def _banco():
    con = sqlite3.connect(":memory:")
    con.execute("CREATE TABLE produtos (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, preco_centavos INTEGER NOT NULL)")
    con.executemany("INSERT INTO produtos (nome, preco_centavos) VALUES (?, ?)", [
        ("Pão francês (kg)", 1690), ("Café 500 g", 1890), ("Biscoito de polvilho", 549),
        ("Leite 1 L", 589), ("Manteiga 200 g", 1290), ("Açúcar 1 kg", 549),
    ])
    return con

_POR_NOME = ["Açúcar 1 kg", "Biscoito de polvilho", "Café 500 g", "Leite 1 L", "Manteiga 200 g", "Pão francês (kg)"]
_POR_PRECO = ["Açúcar 1 kg", "Biscoito de polvilho", "Leite 1 L", "Manteiga 200 g", "Pão francês (kg)", "Café 500 g"]
_POR_PRECO_DESC = ["Café 500 g", "Pão francês (kg)", "Manteiga 200 g", "Leite 1 L", "Açúcar 1 kg", "Biscoito de polvilho"]
for ordem in ["nome", "preco", "-preco"]:
    espiao = _Espiao(_banco())
    listar_produtos(espiao, ordem)
    assert any("order by" in sql.lower() for sql in espiao.sqls), f"com ordem={ordem!r}, nenhuma consulta usou ORDER BY: a ordenação deve ser feita pelo banco, com um trecho da lista branca, e não em Python"`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e7-param-desafio`,kind:`code`,lang:`python`,prompt:'Escreva a busca da vitrine de um mercado online: `buscar_produtos(con, termo="", categorias=None, ordem="nome", pagina=1, por_pagina=10)`, sobre a tabela `produtos(id, nome, categoria, preco_centavos)`. Ela devolve `{"total": t, "itens": [(id, nome, preco_centavos), ...]}`, em que `total` conta **todos** os produtos que satisfazem a busca, e `itens` traz só os da página pedida.\n\n- `termo`: produtos cujo nome **contém** o termo, ignorando maiúsculas e minúsculas nas letras ASCII (o comportamento do LIKE do SQLite). `%`, `_` e `\\` no termo são caracteres comuns: quem busca `100%` não quer "1000 ml". Termo vazio não filtra.\n- `categorias`: `None` não filtra; uma lista restringe às categorias dela; a lista vazia não encontra nada (`{"total": 0, "itens": []}`).\n- `ordem`: `"nome"` (A a Z), `"preco"` (mais barato primeiro) ou `"-preco"` (mais caro primeiro); em qualquer empate, o menor `id` primeiro. Outro valor: `ValueError`.\n- `pagina` começa em 1, e `por_pagina` vai de 1 a 50; fora disso, `ValueError`. Uma página além da última devolve `itens` vazio, com o `total` certo.\n- A página e o total vêm do banco (LIMIT/OFFSET e COUNT), e nenhum valor recebido aparece no texto do SQL: os testes conferem.',difficulty:`desafio`,skills:[`bd-sql`],hints:[`Separe em partes: validar os argumentos, montar o WHERE com a lista de parâmetros, contar, buscar a página. Qual parte depende de qual?`,`O WHERE pode ter zero, uma ou duas condições. Que estrutura acumula as condições e, em paralelo, os parâmetros de cada uma?`,`Como fazer o LIKE tratar % e _ como texto? E o próprio caractere de escape, se aparecer no termo?`,`A ordem não pode ser parâmetro. De onde vem o trecho do ORDER BY, com o desempate por id?`,`As duas consultas, a do total e a da página, compartilham que pedaços?`],explanation:`Valide primeiro (ordem na lista branca, pagina ≥ 1, 1 ≤ por_pagina ≤ 50) e trate a lista vazia de categorias antes de consultar. Depois acumule condições e parâmetros lado a lado: o LIKE com o termo escapado (\\ antes, depois % e _) e ESCAPE, e o IN com um ? por categoria. O mesmo WHERE e os mesmos parâmetros alimentam o SELECT COUNT(*), que dá o total, e o SELECT da página, que acrescenta ORDER BY vindo da lista branca (com id no fim, para a ordem ser única) e LIMIT ? OFFSET ?. O texto do SQL só tem trechos escritos por você e marcadores; tudo o que veio de fora vai como parâmetro. Buscar tudo e fatiar em Python funcionaria numa tabela pequena, mas numa vitrine com 100 000 produtos transfere o catálogo inteiro a cada página.`,starter:`def buscar_produtos(con, termo="", categorias=None, ordem="nome", pagina=1, por_pagina=10):
    # devolva {"total": ..., "itens": [(id, nome, preco_centavos), ...]}
    pass`,solution:`ORDENS = {
    "nome": "nome, id",
    "preco": "preco_centavos, id",
    "-preco": "preco_centavos DESC, id",
}

def buscar_produtos(con, termo="", categorias=None, ordem="nome", pagina=1, por_pagina=10):
    if ordem not in ORDENS:
        raise ValueError(f"ordem inválida: {ordem!r}")
    if pagina < 1:
        raise ValueError("a página começa em 1")
    if not 1 <= por_pagina <= 50:
        raise ValueError("por_pagina vai de 1 a 50")
    if categorias is not None and len(categorias) == 0:
        return {"total": 0, "itens": []}

    condicoes, params = [], []
    if termo:
        escapado = termo.replace("\\\\", "\\\\\\\\").replace("%", "\\\\%").replace("_", "\\\\_")
        condicoes.append("nome LIKE ? ESCAPE '\\\\'")
        params.append(f"%{escapado}%")
    if categorias is not None:
        condicoes.append("categoria IN (" + ", ".join(["?"] * len(categorias)) + ")")
        params.extend(categorias)
    where = " WHERE " + " AND ".join(condicoes) if condicoes else ""

    (total,) = con.execute("SELECT COUNT(*) FROM produtos" + where, params).fetchone()
    sql = ("SELECT id, nome, preco_centavos FROM produtos" + where
           + " ORDER BY " + ORDENS[ordem] + " LIMIT ? OFFSET ?")
    itens = con.execute(sql, params + [por_pagina, (pagina - 1) * por_pagina]).fetchall()
    return {"total": total, "itens": itens}`,tests:[{name:`busca simples: total e primeira página`,code:`import sqlite3

class _Espiao:
    def __init__(self, con):
        self._con = con
        self.sqls = []
    def execute(self, sql, params=()):
        self.sqls.append(sql)
        return self._con.execute(sql, params)
    def executemany(self, sql, seq):
        self.sqls.append(sql)
        return self._con.executemany(sql, seq)
    def cursor(self):
        return _CursorEspiao(self, self._con.cursor())
    def __getattr__(self, nome):
        return getattr(self._con, nome)

class _CursorEspiao:
    def __init__(self, espiao, cur):
        self._espiao = espiao
        self._cur = cur
    def execute(self, sql, params=()):
        self._espiao.sqls.append(sql)
        self._cur.execute(sql, params)
        return self
    def executemany(self, sql, seq):
        self._espiao.sqls.append(sql)
        self._cur.executemany(sql, seq)
        return self
    def __iter__(self):
        return iter(self._cur)
    def __getattr__(self, nome):
        return getattr(self._cur, nome)

def _sem_valores_no_sql(espiao, valores):
    for v in valores:
        for sql in espiao.sqls:
            assert v not in sql, f"o valor {v!r} apareceu dentro do texto do SQL: {sql!r}. Valores que vêm de fora vão como parâmetros (?), nunca dentro do texto"
_PRODUTOS = [
    ("Suco de uva 100% integral 1 L", "bebidas", 1290),
    ("Suco de laranja 1 L", "bebidas", 899),
    ("Suco de caju 1000 ml", "bebidas", 799),
    ("Água de coco 1 L", "bebidas", 1090),
    ("Refrigerante de guaraná 2 L", "bebidas", 949),
    ("Polpa de açaí 1 kg", "congelados", 2490),
    ("Pão de queijo 1 kg", "congelados", 2190),
    ("Polpa de caju 1 kg", "congelados", 1290),
    ("Banana prata (kg)", "hortifruti", 599),
    ("Laranja pera (kg)", "hortifruti", 499),
    ("Caju (bandeja)", "hortifruti", 899),
    ("Doce de leite Minas d'Ouro", "mercearia", 1590),
    ("Café 500 g", "mercearia", 1890),
    ("Sabão em pó 1 kg", "limpeza", 1590),
]

def _banco():
    con = sqlite3.connect(":memory:")
    con.execute("CREATE TABLE produtos (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, categoria TEXT NOT NULL, preco_centavos INTEGER NOT NULL)")
    con.executemany("INSERT INTO produtos (nome, categoria, preco_centavos) VALUES (?, ?, ?)", _PRODUTOS)
    # como num banco de verdade, há um índice; com ele, empates no ORDER BY podem sair fora da ordem de id
    con.execute("CREATE INDEX produtos_preco_nome ON produtos (preco_centavos, nome)")
    return con

def _asc(s):
    # o LIKE do SQLite só iguala maiúsculas e minúsculas nas letras ASCII
    return "".join(ch.lower() if "A" <= ch <= "Z" else ch for ch in s)

def _ref(termo="", categorias=None, ordem="nome", pagina=1, por_pagina=10):
    if categorias is not None and len(categorias) == 0:
        return {"total": 0, "itens": []}
    todos = [(i + 1, n, c, p) for i, (n, c, p) in enumerate(_PRODUTOS)]
    sel = [x for x in todos if _asc(termo) in _asc(x[1]) and (categorias is None or x[2] in categorias)]
    chave = {"nome": lambda x: (x[1], x[0]), "preco": lambda x: (x[3], x[0]), "-preco": lambda x: (-x[3], x[0])}[ordem]
    sel.sort(key=chave)
    ini = (pagina - 1) * por_pagina
    return {"total": len(sel), "itens": [(x[0], x[1], x[3]) for x in sel[ini:ini + por_pagina]]}

def _confere(con, *args):
    r = buscar_produtos(con, *args)
    e = _ref(*args)
    assert r == e, f"buscar_produtos(con, {', '.join(map(repr, args))}) devolveu {r}, esperado {e}"
con = _banco()
_confere(con, "suco", None, "nome", 1, 2)
_confere(con, "SUCO", None, "nome", 2, 2)
_confere(con, "", None, "nome", 1, 5)`},{name:`%, _ e a barra no termo são caracteres comuns`,code:`import sqlite3

class _Espiao:
    def __init__(self, con):
        self._con = con
        self.sqls = []
    def execute(self, sql, params=()):
        self.sqls.append(sql)
        return self._con.execute(sql, params)
    def executemany(self, sql, seq):
        self.sqls.append(sql)
        return self._con.executemany(sql, seq)
    def cursor(self):
        return _CursorEspiao(self, self._con.cursor())
    def __getattr__(self, nome):
        return getattr(self._con, nome)

class _CursorEspiao:
    def __init__(self, espiao, cur):
        self._espiao = espiao
        self._cur = cur
    def execute(self, sql, params=()):
        self._espiao.sqls.append(sql)
        self._cur.execute(sql, params)
        return self
    def executemany(self, sql, seq):
        self._espiao.sqls.append(sql)
        self._cur.executemany(sql, seq)
        return self
    def __iter__(self):
        return iter(self._cur)
    def __getattr__(self, nome):
        return getattr(self._cur, nome)

def _sem_valores_no_sql(espiao, valores):
    for v in valores:
        for sql in espiao.sqls:
            assert v not in sql, f"o valor {v!r} apareceu dentro do texto do SQL: {sql!r}. Valores que vêm de fora vão como parâmetros (?), nunca dentro do texto"
_PRODUTOS = [
    ("Suco de uva 100% integral 1 L", "bebidas", 1290),
    ("Suco de laranja 1 L", "bebidas", 899),
    ("Suco de caju 1000 ml", "bebidas", 799),
    ("Água de coco 1 L", "bebidas", 1090),
    ("Refrigerante de guaraná 2 L", "bebidas", 949),
    ("Polpa de açaí 1 kg", "congelados", 2490),
    ("Pão de queijo 1 kg", "congelados", 2190),
    ("Polpa de caju 1 kg", "congelados", 1290),
    ("Banana prata (kg)", "hortifruti", 599),
    ("Laranja pera (kg)", "hortifruti", 499),
    ("Caju (bandeja)", "hortifruti", 899),
    ("Doce de leite Minas d'Ouro", "mercearia", 1590),
    ("Café 500 g", "mercearia", 1890),
    ("Sabão em pó 1 kg", "limpeza", 1590),
]

def _banco():
    con = sqlite3.connect(":memory:")
    con.execute("CREATE TABLE produtos (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, categoria TEXT NOT NULL, preco_centavos INTEGER NOT NULL)")
    con.executemany("INSERT INTO produtos (nome, categoria, preco_centavos) VALUES (?, ?, ?)", _PRODUTOS)
    # como num banco de verdade, há um índice; com ele, empates no ORDER BY podem sair fora da ordem de id
    con.execute("CREATE INDEX produtos_preco_nome ON produtos (preco_centavos, nome)")
    return con

def _asc(s):
    # o LIKE do SQLite só iguala maiúsculas e minúsculas nas letras ASCII
    return "".join(ch.lower() if "A" <= ch <= "Z" else ch for ch in s)

def _ref(termo="", categorias=None, ordem="nome", pagina=1, por_pagina=10):
    if categorias is not None and len(categorias) == 0:
        return {"total": 0, "itens": []}
    todos = [(i + 1, n, c, p) for i, (n, c, p) in enumerate(_PRODUTOS)]
    sel = [x for x in todos if _asc(termo) in _asc(x[1]) and (categorias is None or x[2] in categorias)]
    chave = {"nome": lambda x: (x[1], x[0]), "preco": lambda x: (x[3], x[0]), "-preco": lambda x: (-x[3], x[0])}[ordem]
    sel.sort(key=chave)
    ini = (pagina - 1) * por_pagina
    return {"total": len(sel), "itens": [(x[0], x[1], x[3]) for x in sel[ini:ini + por_pagina]]}

def _confere(con, *args):
    r = buscar_produtos(con, *args)
    e = _ref(*args)
    assert r == e, f"buscar_produtos(con, {', '.join(map(repr, args))}) devolveu {r}, esperado {e}"
con = _banco()
r = buscar_produtos(con, "100%")
assert r["total"] == 1, f"buscar '100%' deveria achar só o suco de uva 100%, e não o suco de caju 1000 ml; veio {r}"
r = buscar_produtos(con, "c_ju")
assert r["total"] == 0, f"buscar 'c_ju' não deveria achar caju: o _ do termo é um caractere comum, não um curinga; veio {r}"
_confere(con, "%", None, "nome", 1, 10)
_confere(con, "_", None, "nome", 1, 10)
barra = chr(92)
for termo in [barra, "1" + barra + "0", "0" + barra]:
    r = buscar_produtos(con, termo)
    assert r["total"] == 0, f"nenhum nome contém {termo!r}, mas veio {r}: a barra do termo também é um caractere comum. Se ela é o seu caractere de escape, escape-a primeiro"`},{name:`apóstrofo e tentativas de injeção`,code:`import sqlite3

class _Espiao:
    def __init__(self, con):
        self._con = con
        self.sqls = []
    def execute(self, sql, params=()):
        self.sqls.append(sql)
        return self._con.execute(sql, params)
    def executemany(self, sql, seq):
        self.sqls.append(sql)
        return self._con.executemany(sql, seq)
    def cursor(self):
        return _CursorEspiao(self, self._con.cursor())
    def __getattr__(self, nome):
        return getattr(self._con, nome)

class _CursorEspiao:
    def __init__(self, espiao, cur):
        self._espiao = espiao
        self._cur = cur
    def execute(self, sql, params=()):
        self._espiao.sqls.append(sql)
        self._cur.execute(sql, params)
        return self
    def executemany(self, sql, seq):
        self._espiao.sqls.append(sql)
        self._cur.executemany(sql, seq)
        return self
    def __iter__(self):
        return iter(self._cur)
    def __getattr__(self, nome):
        return getattr(self._cur, nome)

def _sem_valores_no_sql(espiao, valores):
    for v in valores:
        for sql in espiao.sqls:
            assert v not in sql, f"o valor {v!r} apareceu dentro do texto do SQL: {sql!r}. Valores que vêm de fora vão como parâmetros (?), nunca dentro do texto"
_PRODUTOS = [
    ("Suco de uva 100% integral 1 L", "bebidas", 1290),
    ("Suco de laranja 1 L", "bebidas", 899),
    ("Suco de caju 1000 ml", "bebidas", 799),
    ("Água de coco 1 L", "bebidas", 1090),
    ("Refrigerante de guaraná 2 L", "bebidas", 949),
    ("Polpa de açaí 1 kg", "congelados", 2490),
    ("Pão de queijo 1 kg", "congelados", 2190),
    ("Polpa de caju 1 kg", "congelados", 1290),
    ("Banana prata (kg)", "hortifruti", 599),
    ("Laranja pera (kg)", "hortifruti", 499),
    ("Caju (bandeja)", "hortifruti", 899),
    ("Doce de leite Minas d'Ouro", "mercearia", 1590),
    ("Café 500 g", "mercearia", 1890),
    ("Sabão em pó 1 kg", "limpeza", 1590),
]

def _banco():
    con = sqlite3.connect(":memory:")
    con.execute("CREATE TABLE produtos (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, categoria TEXT NOT NULL, preco_centavos INTEGER NOT NULL)")
    con.executemany("INSERT INTO produtos (nome, categoria, preco_centavos) VALUES (?, ?, ?)", _PRODUTOS)
    # como num banco de verdade, há um índice; com ele, empates no ORDER BY podem sair fora da ordem de id
    con.execute("CREATE INDEX produtos_preco_nome ON produtos (preco_centavos, nome)")
    return con

def _asc(s):
    # o LIKE do SQLite só iguala maiúsculas e minúsculas nas letras ASCII
    return "".join(ch.lower() if "A" <= ch <= "Z" else ch for ch in s)

def _ref(termo="", categorias=None, ordem="nome", pagina=1, por_pagina=10):
    if categorias is not None and len(categorias) == 0:
        return {"total": 0, "itens": []}
    todos = [(i + 1, n, c, p) for i, (n, c, p) in enumerate(_PRODUTOS)]
    sel = [x for x in todos if _asc(termo) in _asc(x[1]) and (categorias is None or x[2] in categorias)]
    chave = {"nome": lambda x: (x[1], x[0]), "preco": lambda x: (x[3], x[0]), "-preco": lambda x: (-x[3], x[0])}[ordem]
    sel.sort(key=chave)
    ini = (pagina - 1) * por_pagina
    return {"total": len(sel), "itens": [(x[0], x[1], x[3]) for x in sel[ini:ini + por_pagina]]}

def _confere(con, *args):
    r = buscar_produtos(con, *args)
    e = _ref(*args)
    assert r == e, f"buscar_produtos(con, {', '.join(map(repr, args))}) devolveu {r}, esperado {e}"
con = _banco()
_confere(con, "d'ouro", None, "nome", 1, 10)
for ataque in ["' OR 1=1 --", "x' OR '1'='1"]:
    r = buscar_produtos(con, ataque)
    assert r == {"total": 0, "itens": []}, f"o termo {ataque!r} não está em nenhum nome; veio {r}"
r = buscar_produtos(con, "", ["bebidas') OR ('1'='1"])
assert r == {"total": 0, "itens": []}, f"a categoria \\"bebidas') OR ('1'='1\\" não existe; veio {r}"`},{name:`categorias`,code:`import sqlite3

class _Espiao:
    def __init__(self, con):
        self._con = con
        self.sqls = []
    def execute(self, sql, params=()):
        self.sqls.append(sql)
        return self._con.execute(sql, params)
    def executemany(self, sql, seq):
        self.sqls.append(sql)
        return self._con.executemany(sql, seq)
    def cursor(self):
        return _CursorEspiao(self, self._con.cursor())
    def __getattr__(self, nome):
        return getattr(self._con, nome)

class _CursorEspiao:
    def __init__(self, espiao, cur):
        self._espiao = espiao
        self._cur = cur
    def execute(self, sql, params=()):
        self._espiao.sqls.append(sql)
        self._cur.execute(sql, params)
        return self
    def executemany(self, sql, seq):
        self._espiao.sqls.append(sql)
        self._cur.executemany(sql, seq)
        return self
    def __iter__(self):
        return iter(self._cur)
    def __getattr__(self, nome):
        return getattr(self._cur, nome)

def _sem_valores_no_sql(espiao, valores):
    for v in valores:
        for sql in espiao.sqls:
            assert v not in sql, f"o valor {v!r} apareceu dentro do texto do SQL: {sql!r}. Valores que vêm de fora vão como parâmetros (?), nunca dentro do texto"
_PRODUTOS = [
    ("Suco de uva 100% integral 1 L", "bebidas", 1290),
    ("Suco de laranja 1 L", "bebidas", 899),
    ("Suco de caju 1000 ml", "bebidas", 799),
    ("Água de coco 1 L", "bebidas", 1090),
    ("Refrigerante de guaraná 2 L", "bebidas", 949),
    ("Polpa de açaí 1 kg", "congelados", 2490),
    ("Pão de queijo 1 kg", "congelados", 2190),
    ("Polpa de caju 1 kg", "congelados", 1290),
    ("Banana prata (kg)", "hortifruti", 599),
    ("Laranja pera (kg)", "hortifruti", 499),
    ("Caju (bandeja)", "hortifruti", 899),
    ("Doce de leite Minas d'Ouro", "mercearia", 1590),
    ("Café 500 g", "mercearia", 1890),
    ("Sabão em pó 1 kg", "limpeza", 1590),
]

def _banco():
    con = sqlite3.connect(":memory:")
    con.execute("CREATE TABLE produtos (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, categoria TEXT NOT NULL, preco_centavos INTEGER NOT NULL)")
    con.executemany("INSERT INTO produtos (nome, categoria, preco_centavos) VALUES (?, ?, ?)", _PRODUTOS)
    # como num banco de verdade, há um índice; com ele, empates no ORDER BY podem sair fora da ordem de id
    con.execute("CREATE INDEX produtos_preco_nome ON produtos (preco_centavos, nome)")
    return con

def _asc(s):
    # o LIKE do SQLite só iguala maiúsculas e minúsculas nas letras ASCII
    return "".join(ch.lower() if "A" <= ch <= "Z" else ch for ch in s)

def _ref(termo="", categorias=None, ordem="nome", pagina=1, por_pagina=10):
    if categorias is not None and len(categorias) == 0:
        return {"total": 0, "itens": []}
    todos = [(i + 1, n, c, p) for i, (n, c, p) in enumerate(_PRODUTOS)]
    sel = [x for x in todos if _asc(termo) in _asc(x[1]) and (categorias is None or x[2] in categorias)]
    chave = {"nome": lambda x: (x[1], x[0]), "preco": lambda x: (x[3], x[0]), "-preco": lambda x: (-x[3], x[0])}[ordem]
    sel.sort(key=chave)
    ini = (pagina - 1) * por_pagina
    return {"total": len(sel), "itens": [(x[0], x[1], x[3]) for x in sel[ini:ini + por_pagina]]}

def _confere(con, *args):
    r = buscar_produtos(con, *args)
    e = _ref(*args)
    assert r == e, f"buscar_produtos(con, {', '.join(map(repr, args))}) devolveu {r}, esperado {e}"
con = _banco()
r = buscar_produtos(con, "", [])
assert r == {"total": 0, "itens": []}, f"com a lista de categorias vazia, esperado total 0 e nenhum item; veio {r}"
_confere(con, "", None, "nome", 1, 50)
_confere(con, "", ["hortifruti", "congelados"], "preco", 1, 10)
_confere(con, "caju", ["bebidas", "hortifruti"], "nome", 1, 10)
_confere(con, "", ["papelaria"], "nome", 1, 10)`},{name:`ordens e desempate por id`,code:`import sqlite3

class _Espiao:
    def __init__(self, con):
        self._con = con
        self.sqls = []
    def execute(self, sql, params=()):
        self.sqls.append(sql)
        return self._con.execute(sql, params)
    def executemany(self, sql, seq):
        self.sqls.append(sql)
        return self._con.executemany(sql, seq)
    def cursor(self):
        return _CursorEspiao(self, self._con.cursor())
    def __getattr__(self, nome):
        return getattr(self._con, nome)

class _CursorEspiao:
    def __init__(self, espiao, cur):
        self._espiao = espiao
        self._cur = cur
    def execute(self, sql, params=()):
        self._espiao.sqls.append(sql)
        self._cur.execute(sql, params)
        return self
    def executemany(self, sql, seq):
        self._espiao.sqls.append(sql)
        self._cur.executemany(sql, seq)
        return self
    def __iter__(self):
        return iter(self._cur)
    def __getattr__(self, nome):
        return getattr(self._cur, nome)

def _sem_valores_no_sql(espiao, valores):
    for v in valores:
        for sql in espiao.sqls:
            assert v not in sql, f"o valor {v!r} apareceu dentro do texto do SQL: {sql!r}. Valores que vêm de fora vão como parâmetros (?), nunca dentro do texto"
_PRODUTOS = [
    ("Suco de uva 100% integral 1 L", "bebidas", 1290),
    ("Suco de laranja 1 L", "bebidas", 899),
    ("Suco de caju 1000 ml", "bebidas", 799),
    ("Água de coco 1 L", "bebidas", 1090),
    ("Refrigerante de guaraná 2 L", "bebidas", 949),
    ("Polpa de açaí 1 kg", "congelados", 2490),
    ("Pão de queijo 1 kg", "congelados", 2190),
    ("Polpa de caju 1 kg", "congelados", 1290),
    ("Banana prata (kg)", "hortifruti", 599),
    ("Laranja pera (kg)", "hortifruti", 499),
    ("Caju (bandeja)", "hortifruti", 899),
    ("Doce de leite Minas d'Ouro", "mercearia", 1590),
    ("Café 500 g", "mercearia", 1890),
    ("Sabão em pó 1 kg", "limpeza", 1590),
]

def _banco():
    con = sqlite3.connect(":memory:")
    con.execute("CREATE TABLE produtos (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, categoria TEXT NOT NULL, preco_centavos INTEGER NOT NULL)")
    con.executemany("INSERT INTO produtos (nome, categoria, preco_centavos) VALUES (?, ?, ?)", _PRODUTOS)
    # como num banco de verdade, há um índice; com ele, empates no ORDER BY podem sair fora da ordem de id
    con.execute("CREATE INDEX produtos_preco_nome ON produtos (preco_centavos, nome)")
    return con

def _asc(s):
    # o LIKE do SQLite só iguala maiúsculas e minúsculas nas letras ASCII
    return "".join(ch.lower() if "A" <= ch <= "Z" else ch for ch in s)

def _ref(termo="", categorias=None, ordem="nome", pagina=1, por_pagina=10):
    if categorias is not None and len(categorias) == 0:
        return {"total": 0, "itens": []}
    todos = [(i + 1, n, c, p) for i, (n, c, p) in enumerate(_PRODUTOS)]
    sel = [x for x in todos if _asc(termo) in _asc(x[1]) and (categorias is None or x[2] in categorias)]
    chave = {"nome": lambda x: (x[1], x[0]), "preco": lambda x: (x[3], x[0]), "-preco": lambda x: (-x[3], x[0])}[ordem]
    sel.sort(key=chave)
    ini = (pagina - 1) * por_pagina
    return {"total": len(sel), "itens": [(x[0], x[1], x[3]) for x in sel[ini:ini + por_pagina]]}

def _confere(con, *args):
    r = buscar_produtos(con, *args)
    e = _ref(*args)
    assert r == e, f"buscar_produtos(con, {', '.join(map(repr, args))}) devolveu {r}, esperado {e}"
con = _banco()
for ordem in ["nome", "preco", "-preco"]:
    _confere(con, "", None, ordem, 1, 50)
r = buscar_produtos(con, "", None, "preco", 1, 50)["itens"]
empate = [x for x in r if x[2] == 899]
assert empate == sorted(empate), f"Suco de laranja (id 2) e Caju (id 11) custam o mesmo (899); em empate, o menor id vem primeiro, mas veio {empate}. Sem um desempate explícito no ORDER BY, a ordem dos empatados depende do plano de execução (aqui, de um índice)"`},{name:`paginação`,code:`import sqlite3

class _Espiao:
    def __init__(self, con):
        self._con = con
        self.sqls = []
    def execute(self, sql, params=()):
        self.sqls.append(sql)
        return self._con.execute(sql, params)
    def executemany(self, sql, seq):
        self.sqls.append(sql)
        return self._con.executemany(sql, seq)
    def cursor(self):
        return _CursorEspiao(self, self._con.cursor())
    def __getattr__(self, nome):
        return getattr(self._con, nome)

class _CursorEspiao:
    def __init__(self, espiao, cur):
        self._espiao = espiao
        self._cur = cur
    def execute(self, sql, params=()):
        self._espiao.sqls.append(sql)
        self._cur.execute(sql, params)
        return self
    def executemany(self, sql, seq):
        self._espiao.sqls.append(sql)
        self._cur.executemany(sql, seq)
        return self
    def __iter__(self):
        return iter(self._cur)
    def __getattr__(self, nome):
        return getattr(self._cur, nome)

def _sem_valores_no_sql(espiao, valores):
    for v in valores:
        for sql in espiao.sqls:
            assert v not in sql, f"o valor {v!r} apareceu dentro do texto do SQL: {sql!r}. Valores que vêm de fora vão como parâmetros (?), nunca dentro do texto"
_PRODUTOS = [
    ("Suco de uva 100% integral 1 L", "bebidas", 1290),
    ("Suco de laranja 1 L", "bebidas", 899),
    ("Suco de caju 1000 ml", "bebidas", 799),
    ("Água de coco 1 L", "bebidas", 1090),
    ("Refrigerante de guaraná 2 L", "bebidas", 949),
    ("Polpa de açaí 1 kg", "congelados", 2490),
    ("Pão de queijo 1 kg", "congelados", 2190),
    ("Polpa de caju 1 kg", "congelados", 1290),
    ("Banana prata (kg)", "hortifruti", 599),
    ("Laranja pera (kg)", "hortifruti", 499),
    ("Caju (bandeja)", "hortifruti", 899),
    ("Doce de leite Minas d'Ouro", "mercearia", 1590),
    ("Café 500 g", "mercearia", 1890),
    ("Sabão em pó 1 kg", "limpeza", 1590),
]

def _banco():
    con = sqlite3.connect(":memory:")
    con.execute("CREATE TABLE produtos (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, categoria TEXT NOT NULL, preco_centavos INTEGER NOT NULL)")
    con.executemany("INSERT INTO produtos (nome, categoria, preco_centavos) VALUES (?, ?, ?)", _PRODUTOS)
    # como num banco de verdade, há um índice; com ele, empates no ORDER BY podem sair fora da ordem de id
    con.execute("CREATE INDEX produtos_preco_nome ON produtos (preco_centavos, nome)")
    return con

def _asc(s):
    # o LIKE do SQLite só iguala maiúsculas e minúsculas nas letras ASCII
    return "".join(ch.lower() if "A" <= ch <= "Z" else ch for ch in s)

def _ref(termo="", categorias=None, ordem="nome", pagina=1, por_pagina=10):
    if categorias is not None and len(categorias) == 0:
        return {"total": 0, "itens": []}
    todos = [(i + 1, n, c, p) for i, (n, c, p) in enumerate(_PRODUTOS)]
    sel = [x for x in todos if _asc(termo) in _asc(x[1]) and (categorias is None or x[2] in categorias)]
    chave = {"nome": lambda x: (x[1], x[0]), "preco": lambda x: (x[3], x[0]), "-preco": lambda x: (-x[3], x[0])}[ordem]
    sel.sort(key=chave)
    ini = (pagina - 1) * por_pagina
    return {"total": len(sel), "itens": [(x[0], x[1], x[3]) for x in sel[ini:ini + por_pagina]]}

def _confere(con, *args):
    r = buscar_produtos(con, *args)
    e = _ref(*args)
    assert r == e, f"buscar_produtos(con, {', '.join(map(repr, args))}) devolveu {r}, esperado {e}"
con = _banco()
for pagina in range(1, 6):
    _confere(con, "", None, "-preco", pagina, 4)
r = buscar_produtos(con, "", None, "nome", 9, 3)
assert r["itens"] == [] and r["total"] == 14, f"a página 9 de 3 em 3 está além da última: itens vazio e total 14; veio {r}"`},{name:`argumentos inválidos`,code:`import sqlite3

class _Espiao:
    def __init__(self, con):
        self._con = con
        self.sqls = []
    def execute(self, sql, params=()):
        self.sqls.append(sql)
        return self._con.execute(sql, params)
    def executemany(self, sql, seq):
        self.sqls.append(sql)
        return self._con.executemany(sql, seq)
    def cursor(self):
        return _CursorEspiao(self, self._con.cursor())
    def __getattr__(self, nome):
        return getattr(self._con, nome)

class _CursorEspiao:
    def __init__(self, espiao, cur):
        self._espiao = espiao
        self._cur = cur
    def execute(self, sql, params=()):
        self._espiao.sqls.append(sql)
        self._cur.execute(sql, params)
        return self
    def executemany(self, sql, seq):
        self._espiao.sqls.append(sql)
        self._cur.executemany(sql, seq)
        return self
    def __iter__(self):
        return iter(self._cur)
    def __getattr__(self, nome):
        return getattr(self._cur, nome)

def _sem_valores_no_sql(espiao, valores):
    for v in valores:
        for sql in espiao.sqls:
            assert v not in sql, f"o valor {v!r} apareceu dentro do texto do SQL: {sql!r}. Valores que vêm de fora vão como parâmetros (?), nunca dentro do texto"
_PRODUTOS = [
    ("Suco de uva 100% integral 1 L", "bebidas", 1290),
    ("Suco de laranja 1 L", "bebidas", 899),
    ("Suco de caju 1000 ml", "bebidas", 799),
    ("Água de coco 1 L", "bebidas", 1090),
    ("Refrigerante de guaraná 2 L", "bebidas", 949),
    ("Polpa de açaí 1 kg", "congelados", 2490),
    ("Pão de queijo 1 kg", "congelados", 2190),
    ("Polpa de caju 1 kg", "congelados", 1290),
    ("Banana prata (kg)", "hortifruti", 599),
    ("Laranja pera (kg)", "hortifruti", 499),
    ("Caju (bandeja)", "hortifruti", 899),
    ("Doce de leite Minas d'Ouro", "mercearia", 1590),
    ("Café 500 g", "mercearia", 1890),
    ("Sabão em pó 1 kg", "limpeza", 1590),
]

def _banco():
    con = sqlite3.connect(":memory:")
    con.execute("CREATE TABLE produtos (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, categoria TEXT NOT NULL, preco_centavos INTEGER NOT NULL)")
    con.executemany("INSERT INTO produtos (nome, categoria, preco_centavos) VALUES (?, ?, ?)", _PRODUTOS)
    # como num banco de verdade, há um índice; com ele, empates no ORDER BY podem sair fora da ordem de id
    con.execute("CREATE INDEX produtos_preco_nome ON produtos (preco_centavos, nome)")
    return con

def _asc(s):
    # o LIKE do SQLite só iguala maiúsculas e minúsculas nas letras ASCII
    return "".join(ch.lower() if "A" <= ch <= "Z" else ch for ch in s)

def _ref(termo="", categorias=None, ordem="nome", pagina=1, por_pagina=10):
    if categorias is not None and len(categorias) == 0:
        return {"total": 0, "itens": []}
    todos = [(i + 1, n, c, p) for i, (n, c, p) in enumerate(_PRODUTOS)]
    sel = [x for x in todos if _asc(termo) in _asc(x[1]) and (categorias is None or x[2] in categorias)]
    chave = {"nome": lambda x: (x[1], x[0]), "preco": lambda x: (x[3], x[0]), "-preco": lambda x: (-x[3], x[0])}[ordem]
    sel.sort(key=chave)
    ini = (pagina - 1) * por_pagina
    return {"total": len(sel), "itens": [(x[0], x[1], x[3]) for x in sel[ini:ini + por_pagina]]}

def _confere(con, *args):
    r = buscar_produtos(con, *args)
    e = _ref(*args)
    assert r == e, f"buscar_produtos(con, {', '.join(map(repr, args))}) devolveu {r}, esperado {e}"
con = _banco()
invalidos = [
    {"ordem": "preco DESC"}, {"ordem": "id"}, {"ordem": ""},
    {"pagina": 0}, {"pagina": -1}, {"por_pagina": 0}, {"por_pagina": 51},
]
for kw in invalidos:
    try:
        buscar_produtos(con, "suco", **kw)
    except ValueError:
        pass
    except Exception as e:
        raise AssertionError(f"com {kw}, esperado ValueError, veio {type(e).__name__}: {e}")
    else:
        raise AssertionError(f"com {kw}, esperado ValueError")
r = buscar_produtos(con, "", None, "nome", 1, 50)
assert r["total"] == 14 and len(r["itens"]) == 14, f"por_pagina = 50 é permitido; veio {r}"`},{name:`nada de fora no texto do SQL; página e total no banco`,code:`import sqlite3

class _Espiao:
    def __init__(self, con):
        self._con = con
        self.sqls = []
    def execute(self, sql, params=()):
        self.sqls.append(sql)
        return self._con.execute(sql, params)
    def executemany(self, sql, seq):
        self.sqls.append(sql)
        return self._con.executemany(sql, seq)
    def cursor(self):
        return _CursorEspiao(self, self._con.cursor())
    def __getattr__(self, nome):
        return getattr(self._con, nome)

class _CursorEspiao:
    def __init__(self, espiao, cur):
        self._espiao = espiao
        self._cur = cur
    def execute(self, sql, params=()):
        self._espiao.sqls.append(sql)
        self._cur.execute(sql, params)
        return self
    def executemany(self, sql, seq):
        self._espiao.sqls.append(sql)
        self._cur.executemany(sql, seq)
        return self
    def __iter__(self):
        return iter(self._cur)
    def __getattr__(self, nome):
        return getattr(self._cur, nome)

def _sem_valores_no_sql(espiao, valores):
    for v in valores:
        for sql in espiao.sqls:
            assert v not in sql, f"o valor {v!r} apareceu dentro do texto do SQL: {sql!r}. Valores que vêm de fora vão como parâmetros (?), nunca dentro do texto"
_PRODUTOS = [
    ("Suco de uva 100% integral 1 L", "bebidas", 1290),
    ("Suco de laranja 1 L", "bebidas", 899),
    ("Suco de caju 1000 ml", "bebidas", 799),
    ("Água de coco 1 L", "bebidas", 1090),
    ("Refrigerante de guaraná 2 L", "bebidas", 949),
    ("Polpa de açaí 1 kg", "congelados", 2490),
    ("Pão de queijo 1 kg", "congelados", 2190),
    ("Polpa de caju 1 kg", "congelados", 1290),
    ("Banana prata (kg)", "hortifruti", 599),
    ("Laranja pera (kg)", "hortifruti", 499),
    ("Caju (bandeja)", "hortifruti", 899),
    ("Doce de leite Minas d'Ouro", "mercearia", 1590),
    ("Café 500 g", "mercearia", 1890),
    ("Sabão em pó 1 kg", "limpeza", 1590),
]

def _banco():
    con = sqlite3.connect(":memory:")
    con.execute("CREATE TABLE produtos (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, categoria TEXT NOT NULL, preco_centavos INTEGER NOT NULL)")
    con.executemany("INSERT INTO produtos (nome, categoria, preco_centavos) VALUES (?, ?, ?)", _PRODUTOS)
    # como num banco de verdade, há um índice; com ele, empates no ORDER BY podem sair fora da ordem de id
    con.execute("CREATE INDEX produtos_preco_nome ON produtos (preco_centavos, nome)")
    return con

def _asc(s):
    # o LIKE do SQLite só iguala maiúsculas e minúsculas nas letras ASCII
    return "".join(ch.lower() if "A" <= ch <= "Z" else ch for ch in s)

def _ref(termo="", categorias=None, ordem="nome", pagina=1, por_pagina=10):
    if categorias is not None and len(categorias) == 0:
        return {"total": 0, "itens": []}
    todos = [(i + 1, n, c, p) for i, (n, c, p) in enumerate(_PRODUTOS)]
    sel = [x for x in todos if _asc(termo) in _asc(x[1]) and (categorias is None or x[2] in categorias)]
    chave = {"nome": lambda x: (x[1], x[0]), "preco": lambda x: (x[3], x[0]), "-preco": lambda x: (-x[3], x[0])}[ordem]
    sel.sort(key=chave)
    ini = (pagina - 1) * por_pagina
    return {"total": len(sel), "itens": [(x[0], x[1], x[3]) for x in sel[ini:ini + por_pagina]]}

def _confere(con, *args):
    r = buscar_produtos(con, *args)
    e = _ref(*args)
    assert r == e, f"buscar_produtos(con, {', '.join(map(repr, args))}) devolveu {r}, esperado {e}"
espiao = _Espiao(_banco())
r = buscar_produtos(espiao, "suco de uva", ["bebidas", "hortifruti"], "preco", 1, 2)
e = _ref("suco de uva", ["bebidas", "hortifruti"], "preco", 1, 2)
assert r == e, f"devolveu {r}, esperado {e}"
_sem_valores_no_sql(espiao, ["suco de uva", "bebidas", "hortifruti"])
textos = " ".join(espiao.sqls).lower()
assert "limit" in textos, "a página deve vir do banco, com LIMIT e OFFSET, e não de fatiar em Python uma lista com todos os resultados"
assert "count(" in textos.replace(" ", ""), "o total deve vir do banco, com COUNT(*), e não de len() sobre todos os resultados"`},{name:`buscas aleatórias`,code:`import sqlite3

class _Espiao:
    def __init__(self, con):
        self._con = con
        self.sqls = []
    def execute(self, sql, params=()):
        self.sqls.append(sql)
        return self._con.execute(sql, params)
    def executemany(self, sql, seq):
        self.sqls.append(sql)
        return self._con.executemany(sql, seq)
    def cursor(self):
        return _CursorEspiao(self, self._con.cursor())
    def __getattr__(self, nome):
        return getattr(self._con, nome)

class _CursorEspiao:
    def __init__(self, espiao, cur):
        self._espiao = espiao
        self._cur = cur
    def execute(self, sql, params=()):
        self._espiao.sqls.append(sql)
        self._cur.execute(sql, params)
        return self
    def executemany(self, sql, seq):
        self._espiao.sqls.append(sql)
        self._cur.executemany(sql, seq)
        return self
    def __iter__(self):
        return iter(self._cur)
    def __getattr__(self, nome):
        return getattr(self._cur, nome)

def _sem_valores_no_sql(espiao, valores):
    for v in valores:
        for sql in espiao.sqls:
            assert v not in sql, f"o valor {v!r} apareceu dentro do texto do SQL: {sql!r}. Valores que vêm de fora vão como parâmetros (?), nunca dentro do texto"
_PRODUTOS = [
    ("Suco de uva 100% integral 1 L", "bebidas", 1290),
    ("Suco de laranja 1 L", "bebidas", 899),
    ("Suco de caju 1000 ml", "bebidas", 799),
    ("Água de coco 1 L", "bebidas", 1090),
    ("Refrigerante de guaraná 2 L", "bebidas", 949),
    ("Polpa de açaí 1 kg", "congelados", 2490),
    ("Pão de queijo 1 kg", "congelados", 2190),
    ("Polpa de caju 1 kg", "congelados", 1290),
    ("Banana prata (kg)", "hortifruti", 599),
    ("Laranja pera (kg)", "hortifruti", 499),
    ("Caju (bandeja)", "hortifruti", 899),
    ("Doce de leite Minas d'Ouro", "mercearia", 1590),
    ("Café 500 g", "mercearia", 1890),
    ("Sabão em pó 1 kg", "limpeza", 1590),
]

def _banco():
    con = sqlite3.connect(":memory:")
    con.execute("CREATE TABLE produtos (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, categoria TEXT NOT NULL, preco_centavos INTEGER NOT NULL)")
    con.executemany("INSERT INTO produtos (nome, categoria, preco_centavos) VALUES (?, ?, ?)", _PRODUTOS)
    # como num banco de verdade, há um índice; com ele, empates no ORDER BY podem sair fora da ordem de id
    con.execute("CREATE INDEX produtos_preco_nome ON produtos (preco_centavos, nome)")
    return con

def _asc(s):
    # o LIKE do SQLite só iguala maiúsculas e minúsculas nas letras ASCII
    return "".join(ch.lower() if "A" <= ch <= "Z" else ch for ch in s)

def _ref(termo="", categorias=None, ordem="nome", pagina=1, por_pagina=10):
    if categorias is not None and len(categorias) == 0:
        return {"total": 0, "itens": []}
    todos = [(i + 1, n, c, p) for i, (n, c, p) in enumerate(_PRODUTOS)]
    sel = [x for x in todos if _asc(termo) in _asc(x[1]) and (categorias is None or x[2] in categorias)]
    chave = {"nome": lambda x: (x[1], x[0]), "preco": lambda x: (x[3], x[0]), "-preco": lambda x: (-x[3], x[0])}[ordem]
    sel.sort(key=chave)
    ini = (pagina - 1) * por_pagina
    return {"total": len(sel), "itens": [(x[0], x[1], x[3]) for x in sel[ini:ini + por_pagina]]}

def _confere(con, *args):
    r = buscar_produtos(con, *args)
    e = _ref(*args)
    assert r == e, f"buscar_produtos(con, {', '.join(map(repr, args))}) devolveu {r}, esperado {e}"
import random
random.seed(5)
con = _banco()
nomes = [n for n, _, _ in _PRODUTOS]
cats = ["bebidas", "congelados", "hortifruti", "mercearia", "limpeza", "papelaria"]
for _ in range(250):
    sorteio = random.random()
    if sorteio < 0.2:
        termo = ""
    elif sorteio < 0.8:
        n = random.choice(nomes)
        i = random.randrange(len(n))
        j = random.randint(i + 1, min(len(n), i + 6))
        termo = "".join(ch.swapcase() if ch.isascii() and random.random() < 0.3 else ch for ch in n[i:j])
    else:
        termo = random.choice(["100%", "%", "_", "c_ju", "zzz", "'", "1 L"])
    categorias = random.choice([None, None, [], random.sample(cats, random.randint(1, 3))])
    ordem = random.choice(["nome", "preco", "-preco"])
    _confere(con, termo, categorias, ordem, random.randint(1, 4), random.randint(1, 6))`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:"**Sistema de cadastro: busca paginada.** Na camada de armazenamento SQLite do cadastro (parte 4 do projeto), escreva `buscar_alunos(termo, curso, ordem, pagina)` com tudo desta lição: LIKE com escape, lista branca para a ordem, LIMIT/OFFSET com desempate por matrícula e o total de páginas. Escreva um teste com uma conexão espiã, como a dos exercícios, que falha se algum valor recebido aparecer no texto do SQL."},{type:`project`,projectId:`p3-cadastro`}]},{stage:`revisao`,blocks:[{type:`md`,text:'- DB-API: `execute` devolve um cursor; `fetchone` (ou None), `fetchall`, iteração; `executemany`; `rowcount`, `lastrowid`; `sqlite3.Row`; `commit`.\n- Comando preparado: o SQL é compilado só com os marcadores; os valores são vinculados depois, como dados, e nunca viram SQL.\n- Tupla de um elemento leva vírgula: `("Recife",)`. `:nome` vai com dict. O `%s` do psycopg é marcador, não formatação.\n- Marcador só onde caberia um valor literal (inclusive LIMIT e OFFSET). Coluna, tabela e ASC/DESC: lista branca. `ORDER BY ?` roda e não ordena.\n- f-string no SQL só com texto escrito por você: marcadores gerados, trechos da lista branca.\n- IN: um `?` por item; trate a lista vazia antes.\n- LIKE: curingas no valor; escape `\\`, `%` e `_` com ESCAPE. No SQLite, LIKE ignora maiúsculas só em ASCII.\n- Paginação: ORDER BY com desempate único, `LIMIT ? OFFSET ?`, total com COUNT e o mesmo WHERE; em listas grandes, paginação por chave.'},{type:`callout`,tone:`english`,text:`- **parameterized query / prepared statement**: consulta parametrizada / comando preparado
- **placeholder / to bind a parameter**: marcador / vincular um parâmetro
- **cursor, fetch, row count**: cursor, buscar linhas, número de linhas afetadas
- **allowlist**: lista branca (o termo antigo *whitelist* está caindo em desuso)
- **wildcard / escape character**: curinga / caractere de escape
- **offset pagination / keyset (cursor-based) pagination**: paginação por deslocamento / por chave

Frase típica de entrevista: *"I never interpolate user input into SQL. Values are passed as bound parameters, and things that can't be parameters, like the sort column, go through an allowlist."*

Frase típica de documentação: *"SQL operations usually need to use values from Python variables. However, beware of using Python's string operations to assemble queries, as they are vulnerable to SQL injection attacks."*`,title:`English corner`}]}],cards:[{id:`l7-sql-no-python#1`,front:`Num comando preparado, por que um valor passado com ? nunca é interpretado como SQL?`,back:`Porque o comando é compilado antes, só com os marcadores; o valor é vinculado depois, como dado tipado, quando não há mais análise de sintaxe.`},{id:`l7-sql-no-python#2`,front:`Por que con.execute("... = ?", ("Recife")) falha, e como corrigir?`,back:`Sem vírgula não é tupla: é a string, e cada um dos 6 caracteres vira um parâmetro. Use ("Recife",) ou ["Recife"].`},{id:`l7-sql-no-python#3`,front:`Como ordenar por uma coluna escolhida pelo usuário com segurança? Por que ORDER BY ? não serve?`,back:`Com uma lista branca: um dict que leva a escolha a um trecho de SQL escrito por você, recusando o resto. ORDER BY ? roda, mas ordena por uma constante.`},{id:`l7-sql-no-python#4`,front:`Como passar uma lista de tamanho variável para um IN?`,back:`Gerar um ? por item, com ", ".join(["?"] * len(lista)), e passar os itens como parâmetros; tratar a lista vazia antes de consultar.`},{id:`l7-sql-no-python#5`,front:`Por que buscar "100%" com LIKE pode achar "1000 ml", e como evitar?`,back:`Porque % e _ do termo viram curingas. Escape o caractere de escape, depois % e _, e use ESCAPE no LIKE.`},{id:`l7-sql-no-python#6`,front:`O que a paginação com LIMIT/OFFSET exige para ser estável, e como se calcula o total?`,back:`Um ORDER BY com desempate por coluna única (como id); o total vem de um SELECT COUNT(*) com o mesmo WHERE e os mesmos parâmetros.`},{id:`l7-sql-no-python#7`,front:`Quando trocar OFFSET por paginação por chave?`,back:`Em listas grandes ou que mudam enquanto se navega: OFFSET percorre e descarta as linhas puladas e pode repetir itens; a paginação por chave continua a partir da última linha vista.`},{id:`l7-sql-no-python#8`,front:`O que informam cursor.rowcount e cursor.lastrowid?`,back:`rowcount: quantas linhas o último INSERT, UPDATE ou DELETE afetou (-1 num SELECT). lastrowid: o id da linha criada pelo último INSERT feito com execute.`}]};export{e as default};
//# sourceMappingURL=l7-sql-no-python-D7eE6av1.js.map