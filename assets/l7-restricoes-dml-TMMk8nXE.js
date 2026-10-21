var e={id:`l7-restricoes-dml`,moduleId:`m7-1`,title:`Tabelas com regras: restrições, INSERT, UPDATE e DELETE`,titleEn:`Tables with rules: constraints, INSERT, UPDATE and DELETE`,summary:`Criar tabelas com CREATE TABLE e pôr as regras do negócio no próprio banco (NOT NULL, UNIQUE, CHECK, DEFAULT, chave primária, composta e estrangeira com ON DELETE), escolher tipos no SQLite e no PostgreSQL, e alterar dados com INSERT, UPDATE, DELETE, UPSERT e RETURNING seguindo o ritual de conferir antes e depois.`,minutes:45,objectives:[`Escrever um CREATE TABLE com tipos adequados e as restrições NOT NULL, UNIQUE, CHECK e DEFAULT, sabendo exatamente o que cada uma recusa (e o que deixa passar)`,`Escolher entre chave natural e substituta, usar chave composta e declarar chaves estrangeiras com a ação ON DELETE certa, ligando-as no SQLite`,`Inserir, atualizar e remover linhas com INSERT, UPDATE e DELETE, conferindo antes com um SELECT e depois com rowcount ou RETURNING`,`Usar UPSERT (ON CONFLICT) e exclusão lógica, e explicar por que INSERT OR REPLACE pode apagar dados relacionados`],skills:[`bd-sql`],terms:[{pt:`linguagem de definição de dados`,en:`data definition language (DDL)`,def:`A parte do SQL que cria e muda a estrutura do banco: CREATE, ALTER e DROP.`,example:`Schema changes are written as DDL statements such as CREATE TABLE and ALTER TABLE.`},{pt:`linguagem de manipulação de dados`,en:`data manipulation language (DML)`,def:`A parte do SQL que lê e altera linhas: SELECT, INSERT, UPDATE e DELETE.`},{pt:`restrição`,en:`constraint`,def:`Regra declarada na tabela que o banco confere em toda escrita; a escrita que a viola é recusada.`,example:`sqlite3.IntegrityError: UNIQUE constraint failed: clientes.cpf`},{pt:`afinidade de tipo`,en:`type affinity`,def:`No SQLite, o tipo declarado de uma coluna é uma preferência: o valor é convertido quando dá e guardado como veio quando não dá.`},{pt:`chave natural`,en:`natural key`,def:`Chave que já existe no mundo real, como CPF, placa ou ISBN.`},{pt:`chave substituta`,en:`surrogate key`,def:`Identificador criado pelo próprio sistema, sem significado fora dele (um id numérico).`,example:`We use a surrogate key and keep a UNIQUE constraint on the natural key.`},{pt:`chave composta`,en:`composite key`,def:`Chave formada por mais de uma coluna; o que não pode se repetir é a combinação.`},{pt:`integridade referencial`,en:`referential integrity`,def:`Garantia de que toda chave estrangeira aponta para uma linha que existe.`},{pt:`ação referencial`,en:`referential action`,def:`O que acontece com as linhas filhas quando a linha mãe é apagada ou tem a chave alterada: NO ACTION, RESTRICT, CASCADE, SET NULL.`,example:`ON DELETE CASCADE removes the child rows automatically when the parent row is deleted.`},{pt:`inserir ou atualizar`,en:`upsert`,def:`Comando que insere a linha ou, se a chave já existe, atualiza a existente.`,example:`INSERT ... ON CONFLICT (sku) DO UPDATE SET preco = excluded.preco`},{pt:`exclusão lógica`,en:`soft delete`,def:`Marcar a linha como inativa (ativo = 0, excluido_em = data) em vez de apagá-la, para preservar o histórico.`}],references:[`sqlite-docs`,`postgres-docs`,`cmu-15445`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:'Até aqui você consultou um banco pronto. Nesta lição você constrói um e muda o que tem dentro. O SQL tem duas metades: a {{linguagem de definição de dados|data definition language (DDL)}} (`CREATE TABLE`, `ALTER TABLE`, `DROP TABLE`) descreve a estrutura, e a {{linguagem de manipulação de dados|data manipulation language (DML)}} (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) lê e altera as linhas.\n\nUma tabela bem definida não é só um lugar onde cabem linhas: ela carrega as regras do negócio. "Não existem dois clientes com o mesmo CPF", "preço não é negativo", "todo pedido é de um cliente que existe". Essas regras são {{restrições|constraints}}, e o banco as confere em **toda** escrita, venha ela do site, do aplicativo, do script que importa a planilha do fornecedor ou de alguém digitando no terminal às 23h de sexta. A escrita que viola uma restrição é recusada inteira, com um erro que diz qual regra foi quebrada.\n\nPor que não basta validar no formulário? Primeiro, porque o formulário não é o único caminho até o banco. Segundo, porque a checagem feita pelo programa tem uma corrida: duas requisições chegam juntas, as duas perguntam "esse CPF já existe?", as duas ouvem "não" e as duas inserem. Só a restrição `UNIQUE`, conferida pelo próprio banco no momento da escrita, fecha essa porta. Validar no programa continua útil para mostrar uma mensagem amigável; a **garantia** mora no banco.\n\nA outra metade da lição é escrever. `INSERT`, `UPDATE` e `DELETE` não têm Ctrl+Z, e um `WHERE` esquecido muda a tabela inteira. Você vai aprender o ritual que profissionais seguem: conferir antes, mudar, conferir depois.'}]},{stage:`explicacao`,blocks:[{type:`md`,text:"### Anatomia de um CREATE TABLE\nUma loja online com clientes, pedidos e os itens de cada pedido. Cada coluna tem nome, tipo e, depois, as restrições dela; restrições que envolvem várias colunas, como a chave composta de `itens_pedido`, vêm no fim da lista, separadas por vírgula."},{type:`code`,lang:`sql`,code:`CREATE TABLE clientes (
  id        INTEGER PRIMARY KEY,              -- chave substituta, gerada pelo banco
  cpf       TEXT    NOT NULL UNIQUE CHECK (length(cpf) = 11),
  nome      TEXT    NOT NULL,
  email     TEXT    UNIQUE,                   -- opcional, mas sem repetição
  uf        TEXT    NOT NULL CHECK (length(uf) = 2),
  criado_em TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pedidos (
  id             INTEGER PRIMARY KEY,
  cliente_id     INTEGER NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  total_centavos INTEGER NOT NULL CHECK (total_centavos > 0),
  status         TEXT    NOT NULL DEFAULT 'aberto'
                 CHECK (status IN ('aberto', 'pago', 'enviado', 'cancelado'))
);

CREATE TABLE itens_pedido (
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  sku       TEXT    NOT NULL,
  qtd       INTEGER NOT NULL CHECK (qtd > 0),
  PRIMARY KEY (pedido_id, sku)                -- chave composta
);`,runnable:!1,caption:`O esquema da loja usado no resto da lição. Os exemplos de UPDATE mais abaixo usam também uma tabela produtos (sku, nome, categoria, preco_centavos, ativo).`},{type:`table`,head:[`Restrição`,`O que o banco recusa`,`Cuidado`],rows:[["`NOT NULL`",`linha sem valor na coluna`,`é a única que obriga a ter valor; as outras deixam NULL passar`],["`UNIQUE`","valor repetido na coluna (ou combinação repetida, em `UNIQUE (a, b)`)","NULL não conta como repetido: vários clientes podem ficar com `email` NULL"],["`CHECK (expressão)`",`linha em que a expressão dá falso`,"com NULL, `preco >= 0` não dá nem verdadeiro nem falso, e a linha **passa**; junte com NOT NULL"],["`DEFAULT valor`",`nada: é o valor usado quando o INSERT não cita a coluna`,`um NULL escrito explicitamente no INSERT continua NULL`],["`PRIMARY KEY`",`valor repetido e, pelo padrão SQL, NULL`,"só uma por tabela; no SQLite, por um erro histórico, uma chave que não seja `INTEGER PRIMARY KEY` aceita NULL se você não escrever NOT NULL"],["`REFERENCES t(col)`",`valor que não existe na coluna referenciada`,"NULL passa (a linha fica sem mãe); no SQLite, só vale com `PRAGMA foreign_keys = ON`"]],caption:`O que cada restrição garante, e o buraco que cada uma deixa se usada sozinha.`},{type:`callout`,tone:`tip`,text:"Dê nome às restrições importantes: `CONSTRAINT preco_nao_negativo CHECK (preco_centavos >= 0)`. Sem nome, o erro mostra a expressão (`CHECK constraint failed: preco_centavos >= 0`); com nome, mostra `CHECK constraint failed: preco_nao_negativo`, que dá para traduzir numa mensagem amigável para o usuário.",title:`Restrições com nome`},{type:`md`,text:`### Tipos: o que cada dado vira`},{type:`table`,head:[`Dado`,`No SQLite`,`No PostgreSQL`,`Por quê`],rows:[[`ids, quantidades`,"`INTEGER`","`integer` ou `bigint`",`contas exatas`],[`dinheiro`,"`INTEGER` em centavos","`numeric(12, 2)` ou centavos em `bigint`",`o float binário não representa 0,10 exatamente, e as somas acumulam erros de arredondamento`],[`texto`,"`TEXT`","`text` ou `varchar(n)`",`—`],[`data e hora`,"`TEXT` no formato ISO 8601 (`2026-10-07 14:30:00`)","`date`, `timestamp`, `timestamptz`",`o SQLite não tem tipo de data; o formato ISO ordena certo como texto e é o que as funções de data dele entendem`],[`sim ou não`,"`INTEGER` 0 ou 1, com `CHECK (ativo IN (0, 1))`","`boolean`",`o SQLite não tem tipo booleano`],[`CPF, CEP, telefone`,"`TEXT`","`text`",`não são quantidades: como número, o CEP 01310100 vira 1310100, e ninguém soma CPFs`]]},{type:`md`,text:"No SQLite, o tipo declarado é uma {{afinidade de tipo|type affinity}}, uma preferência. Numa coluna `INTEGER`, o texto `'42'` é convertido para o número 42 (e `'01310100'` vira 1310100, sem o zero), mas o texto `'abc'` é guardado como texto, **sem erro nenhum**. Desde a versão 3.37 (2021), uma tabela criada com a palavra `STRICT` no fim, `CREATE TABLE t (...) STRICT`, recusa valores do tipo errado. O PostgreSQL sempre recusa: inserir `'abc'` numa coluna `integer` dá erro.\n\n### Chaves\nA **chave primária** identifica cada linha: não repete e não é nula. No SQLite, uma coluna declarada exatamente como `INTEGER PRIMARY KEY` é um apelido para o número interno da linha (o *rowid*): se o INSERT não informa o id, o banco usa o maior id da tabela mais 1. Isso quer dizer que, se você apagar a última linha, o id dela pode ser reaproveitado; com `INTEGER PRIMARY KEY AUTOINCREMENT`, nunca é (a um pequeno custo extra). No PostgreSQL, o equivalente é `id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY`.\n\nQual coluna escolher como chave? Um CPF já identifica a pessoa, então por que inventar um id?"},{type:`table`,head:[``,`Chave natural (CPF, placa, ISBN)`,`Chave substituta (id gerado)`],rows:[[`Significado`,`existe fora do sistema`,`nenhum: só identifica a linha`],[`Pode mudar?`,`pode: CPF digitado errado, placa convertida para o padrão Mercosul, e-mail novo`,`nunca precisa mudar`],[`Onde se espalha`,`é copiada em toda chave estrangeira que aponta para ela: se mudar, muda em todas as tabelas, e um dado pessoal fica espalhado pelo banco`,`só um número nas chaves estrangeiras`],[`Impede duplicata do mundo real?`,`sim`,`sozinha, não: a mesma pessoa pode ser cadastrada duas vezes com ids diferentes`]],caption:`O meio-termo usual: {{chave substituta|surrogate key}} como PRIMARY KEY **e** UNIQUE na {{chave natural|natural key}}. É o que a tabela clientes faz com o CPF.`},{type:`md`,text:"Uma {{chave composta|composite key}} usa várias colunas: em `itens_pedido`, a chave é o par `(pedido_id, sku)`, então o mesmo produto não aparece duas vezes no mesmo pedido (para mudar a quantidade, faz-se UPDATE). Repare que a tabela `matriculas` do banco da escola, que você consultou na lição anterior, **não tem** chave: nada impede matricular Ana duas vezes em Algoritmos, e a média dela contaria a nota em dobro. Um `PRIMARY KEY (aluno_id, disciplina_id)` resolveria.\n\nA **chave estrangeira** (`REFERENCES`) garante a {{integridade referencial|referential integrity}}: `pedidos.cliente_id` só aceita ids que existem em `clientes`. E ela decide o que acontece quando alguém tenta apagar a linha mãe, com uma {{ação referencial|referential action}}:"},{type:`table`,head:[`Ação`,`Ao apagar uma linha mãe que tem filhas`,`Quando usar`],rows:[["`NO ACTION` (o padrão) ou `RESTRICT`",`recusa o DELETE`,`a filha não pode sumir junto: os pedidos de um cliente são histórico e base de nota fiscal`],["`CASCADE`",`apaga as filhas junto`,`a filha é parte da mãe: os itens de um pedido`],["`SET NULL`",`põe NULL na chave estrangeira das filhas (a coluna precisa aceitar NULL)`,`a ligação é opcional: o vendedor que atendeu um pedido foi removido do cadastro`]],caption:`Também existe ON UPDATE, para quando a chave da mãe muda; com chaves substitutas, que não mudam, ele quase nunca importa. NO ACTION e RESTRICT diferem só no momento da conferência.`},{type:`callout`,tone:`warn`,text:"No SQLite, as chaves estrangeiras vêm **desligadas**, por compatibilidade com programas antigos: sem `PRAGMA foreign_keys = ON`, um pedido do cliente 999 entra em silêncio. O PRAGMA vale por conexão, então rode-o logo depois de conectar, toda vez. E rode-o fora de transação: o módulo `sqlite3` do Python abre uma transação sozinho antes de um INSERT, UPDATE ou DELETE, e um PRAGMA executado com essa transação aberta simplesmente não faz nada. No PostgreSQL, chaves estrangeiras valem sempre.",title:`Chaves estrangeiras no SQLite`},{type:`md`,text:`### Escrever: INSERT, UPDATE e DELETE`},{type:`code`,lang:`sql`,code:`-- INSERT: sempre com a lista de colunas; as que ficarem de fora recebem o DEFAULT (ou NULL)
INSERT INTO clientes (cpf, nome, uf) VALUES
  ('12345678901', 'Ana', 'SP'),
  ('98765432100', 'Bruno', 'RJ');

-- UPDATE: o SET pode usar o valor atual da própria linha
UPDATE pedidos SET status = 'pago' WHERE id = 42;
UPDATE produtos SET preco_centavos = preco_centavos + 50 WHERE categoria = 'cafe';

-- DELETE: apaga linhas; a tabela continua existindo, vazia ou não
DELETE FROM pedidos WHERE status = 'cancelado' AND id < 1000;

-- DROP TABLE: apaga a tabela inteira, estrutura e dados
DROP TABLE IF EXISTS importacao_temporaria;`,runnable:!1},{type:`md`,text:"- **INSERT com lista de colunas.** `INSERT INTO clientes VALUES (...)`, sem a lista, depende da ordem das colunas no CREATE TABLE e quebra no dia em que alguém acrescentar uma coluna. `INSERT INTO destino (...) SELECT ...` copia o resultado de uma consulta para outra tabela.\n- **O SET vê a linha antiga.** Todas as expressões do SET usam os valores de antes da mudança: `SET a = b, b = a` troca os dois valores no SQLite e no PostgreSQL. (O MySQL avalia as atribuições da esquerda para a direita, e lá as duas colunas terminam com o valor antigo de `b`.)\n- **Um comando é tudo ou nada.** Se um UPDATE que mexe em 1 000 linhas violar uma restrição na 900ª, as 899 anteriores são desfeitas e o comando inteiro falha. No SQLite, esse é o comportamento padrão diante de uma violação (ABORT). Juntar **vários** comandos num bloco tudo ou nada é assunto do módulo de transações.\n\n### O ritual: conferir, mudar, conferir\n1. **Conferir antes.** Escreva o SELECT com exatamente o mesmo WHERE e veja quais e quantas linhas vêm. Se vierem 3 000 quando você esperava 3, o WHERE está errado, e você descobriu isso sem estrago.\n2. **Mudar.** Troque `SELECT ... FROM` por `UPDATE ... SET` ou `DELETE FROM`, sem tocar no WHERE.\n3. **Conferir depois.** O banco informa quantas linhas foram afetadas (`cursor.rowcount` no Python, `UPDATE 3` no terminal do PostgreSQL), e esse número tem de bater com o passo 1. Com `RETURNING` no fim, o próprio UPDATE, INSERT ou DELETE devolve as linhas que mexeu, já com os valores novos (SQLite 3.35+ e PostgreSQL; o MySQL não tem).\n\nEm produção, acrescente ao ritual uma transação (para poder desfazer, no módulo de transações) e um backup recente."},{type:`code`,lang:`sql`,code:`-- 1. conferir
SELECT sku, nome, preco_centavos FROM produtos WHERE categoria = 'cafe' AND ativo = 1;

-- 2. mudar, com o mesmo WHERE, e 3. ver o que mudou
UPDATE produtos SET preco_centavos = preco_centavos + 50
WHERE categoria = 'cafe' AND ativo = 1
RETURNING sku, nome, preco_centavos;`,runnable:!1},{type:`md`,text:`### UPSERT: inserir ou atualizar
Importações vivem de "se o produto é novo, insere; se já existe, atualiza o preço". Fazer isso com um SELECT seguido de INSERT ou UPDATE reabre a corrida do começo da lição. O UPSERT ({{inserir ou atualizar|upsert}}) faz tudo num comando:`},{type:`code`,lang:`sql`,code:`INSERT INTO produtos (sku, nome, preco_centavos) VALUES ('CAFE500', 'Café 500 g', 1990)
ON CONFLICT (sku) DO UPDATE SET nome = excluded.nome, preco_centavos = excluded.preco_centavos;

-- ou: se já existe, deixa como está
INSERT INTO produtos (sku, nome, preco_centavos) VALUES ('CAFE500', 'Café 500 g', 1990)
ON CONFLICT (sku) DO NOTHING;`,runnable:!1},{type:`md`,text:"`excluded` é a linha que você tentou inserir. A coluna do `ON CONFLICT` precisa ser a PRIMARY KEY ou ter UNIQUE. Essa sintaxe vale no SQLite (3.24+) e no PostgreSQL (9.5+); o MySQL usa `INSERT ... ON DUPLICATE KEY UPDATE`."},{type:`callout`,tone:`warn`,text:"O SQLite também tem `INSERT OR REPLACE` (ou só `REPLACE`), que parece um upsert, mas não é: quando a chave já existe, ele **apaga** a linha antiga e insere uma nova. As colunas que você não informou voltam ao DEFAULT ou a NULL, e, se alguma chave estrangeira aponta para a linha com ON DELETE CASCADE, as linhas filhas são apagadas junto, mesmo que a linha nova tenha a mesma chave. O segundo programa da etapa Código mostra os itens de venda de um produto sumindo assim. Para atualizar, use `ON CONFLICT ... DO UPDATE`.",title:`REPLACE não é UPDATE`},{type:`md`,text:"### Apagar ou desativar?\nUm produto que já foi vendido aparece em notas fiscais e relatórios; apagá-lo quebraria esse histórico (e a chave estrangeira nem deixaria). A saída comum é a {{exclusão lógica|soft delete}}: uma coluna `ativo` (ou `excluido_em`, com a data) que o sistema marca em vez de apagar.\n\n- **Ganhos:** o histórico continua íntegro, e dá para desfazer.\n- **Custos:** toda consulta do dia a dia precisa lembrar do `WHERE ativo = 1`, e o UNIQUE continua contando as linhas inativas (um SKU desativado impede cadastrar outro produto com o mesmo SKU).\n- **Limite:** quando uma pessoa pede a eliminação dos dados pessoais dela com base na LGPD, marcar como inativo não é eliminar; é preciso apagar ou anonimizar de fato, ressalvados os dados que a lei obriga a guardar."},{type:`callout`,tone:`deep`,text:"`ALTER TABLE` muda a estrutura sem recriar a tabela. No SQLite ele faz pouco: renomear a tabela (`RENAME TO`) ou uma coluna (`RENAME COLUMN`, 3.25+), acrescentar uma coluna (`ADD COLUMN`) e remover uma (`DROP COLUMN`, 3.35+). A coluna acrescentada não pode ser PRIMARY KEY nem UNIQUE e, se for NOT NULL, precisa de um DEFAULT não nulo, que as linhas existentes recebem.\n\nPara pôr um CHECK ou uma chave estrangeira numa coluna que já existe, o caminho que a documentação do SQLite descreve é recriar: criar a tabela nova com as restrições, copiar com `INSERT INTO nova (...) SELECT ... FROM antiga`, apagar a antiga e renomear a nova. O PostgreSQL aceita `ALTER TABLE ... ADD CONSTRAINT` direto e confere as linhas que já existem.\n\nEm projetos reais, cada mudança de esquema vira um arquivo de **migração** versionado junto com o código (Alembic, migrations do Django, Flyway), para que todos os bancos, o seu, o dos testes e o de produção, passem pelas mesmas mudanças na mesma ordem.",title:`Mudar uma tabela que já existe`}]},{stage:`exemplo`,blocks:[{type:`md`,text:"A loja da explicação, com `PRAGMA foreign_keys = ON`, recebe estes comandos, um depois do outro. Antes de olhar a coluna do resultado, tente prever cada um."},{type:`table`,head:[`#`,`Comando`,`Resultado`,`Por quê`],rows:[[`1`,"`INSERT INTO clientes (cpf, nome, uf) VALUES ('12345678901', 'Ana', 'SP')`",`ok: Ana ganha o id 1`,"o id é gerado; `criado_em` recebe o DEFAULT; `email` fica NULL"],[`2`,"o mesmo CPF, com nome `'Bruno'` e uf `'RJ'`","`UNIQUE constraint failed: clientes.cpf`",`CPF repetido`],[`3`,"CPF `'123.456.789-01'`","`CHECK constraint failed: length(cpf) = 11`",`com a máscara são 14 caracteres; guarde só os dígitos`],[`4`,"CPF `'98765432100'`, uf `'Rio de Janeiro'`","`CHECK constraint failed: length(uf) = 2`",`UF é a sigla`],[`5`,"o mesmo, com uf `'RJ'`",`ok: Bruno ganha o id 2`,`—`],[`6`,"`INSERT INTO pedidos (cliente_id, total_centavos) VALUES (7, 5000)`","`FOREIGN KEY constraint failed`",`não existe cliente 7; sem o PRAGMA, o SQLite aceitaria em silêncio`],[`7`,"o mesmo, com `cliente_id` 1",`ok: pedido 1, da Ana`,"`status` recebe o DEFAULT `aberto`"],[`8`,"`INSERT INTO itens_pedido (pedido_id, sku, qtd) VALUES (1, 'CAFE500', 2), (1, 'ACUCAR1K', 1)`",`ok: 2 linhas`,`um INSERT pode levar várias linhas`],[`9`,"`INSERT INTO itens_pedido (pedido_id, sku, qtd) VALUES (1, 'CAFE500', 1)`","`UNIQUE constraint failed: itens_pedido.pedido_id, itens_pedido.sku`",`a chave composta impede o mesmo produto duas vezes no pedido`],[`10`,"`UPDATE pedidos SET status = 'entregue' WHERE id = 1`","`CHECK constraint failed: status IN ('aberto', 'pago', 'enviado', 'cancelado')`","`'entregue'` não está na lista"],[`11`,"`DELETE FROM clientes WHERE id = 1`","`FOREIGN KEY constraint failed`",`Ana tem um pedido, e a ação é RESTRICT`],[`12`,"`DELETE FROM pedidos WHERE id = 1`",`ok: 1 linha`,`os 2 itens do pedido vão junto (CASCADE)`],[`13`,"`DELETE FROM clientes WHERE id = 1`",`ok: 1 linha`,`sem pedidos, nada mais segura a Ana`]],caption:`Treze comandos, seis recusas. As mensagens são as do SQLite.`},{type:`md`,text:`Repare em três coisas:

1. Cada erro diz qual restrição foi violada. É por isso que vale a pena dar nome às restrições importantes.
2. Nenhum comando recusado deixou rastro: depois de uma recusa, a tabela está exatamente como estava antes dela.
3. Quem decidiu o destino dos itens no passo 12 e do cliente no passo 11 foi o **esquema**, e não o programa que mandou o DELETE. Qualquer outro programa que use este banco vai encontrar as mesmas regras.

Agora o ritual, num reajuste de 10% nos produtos de hortifrúti que custam menos de R$ 5,00. A conferência:`},{type:`code`,lang:`sql`,code:`SELECT id, nome, preco_centavos, ROUND(preco_centavos * 1.10) AS novo
FROM produtos
WHERE categoria = 'hortifruti' AND preco_centavos < 500;
-- 3 linhas: Alface 299 → 329, Cheiro-verde 250 → 275, Cebola 479 → 527`,runnable:!1},{type:`md`,text:"Três linhas, como esperado (o limão, que custa exatamente 500, fica de fora por causa do `<`). Só então o UPDATE, com o mesmo WHERE, e a conferência do número de linhas afetadas:"},{type:`code`,lang:`sql`,code:`UPDATE produtos SET preco_centavos = ROUND(preco_centavos * 1.10)
WHERE categoria = 'hortifruti' AND preco_centavos < 500
RETURNING id, preco_centavos;
-- 3 linhas devolvidas: bate com a conferência`,runnable:!1},{type:`md`,text:"`ROUND` devolve um número real (329.0), mas a coluna é `INTEGER`, e a afinidade de tipo do SQLite guarda 329 como inteiro. O exercício de SQL desta lição usa exatamente essa tabela."}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`import sqlite3

con = sqlite3.connect(":memory:")
con.execute("PRAGMA foreign_keys = ON")   # logo depois de conectar, toda vez
con.executescript("""
CREATE TABLE clientes (
  id        INTEGER PRIMARY KEY,
  cpf       TEXT NOT NULL UNIQUE CHECK (length(cpf) = 11),
  nome      TEXT NOT NULL,
  uf        TEXT NOT NULL CHECK (length(uf) = 2),
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE pedidos (
  id             INTEGER PRIMARY KEY,
  cliente_id     INTEGER NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  total_centavos INTEGER NOT NULL CHECK (total_centavos > 0)
);
CREATE TABLE itens_pedido (
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  sku       TEXT NOT NULL,
  qtd       INTEGER NOT NULL CHECK (qtd > 0),
  PRIMARY KEY (pedido_id, sku)
);
""")

comandos = [
    "INSERT INTO clientes (cpf, nome, uf) VALUES ('12345678901', 'Ana', 'SP')",
    "INSERT INTO clientes (cpf, nome, uf) VALUES ('12345678901', 'Bruno', 'RJ')",
    "INSERT INTO clientes (cpf, nome, uf) VALUES ('123.456.789-01', 'Bruno', 'RJ')",
    "INSERT INTO pedidos (cliente_id, total_centavos) VALUES (7, 5000)",
    "INSERT INTO pedidos (cliente_id, total_centavos) VALUES (1, 5000)",
    "INSERT INTO itens_pedido VALUES (1, 'CAFE500', 2), (1, 'ACUCAR1K', 1)",
    "DELETE FROM clientes WHERE id = 1",
    "DELETE FROM pedidos WHERE id = 1",
]
for sql in comandos:
    try:
        cur = con.execute(sql)
        print(f"ok, {cur.rowcount} linha(s): {sql[:50]}")
    except sqlite3.IntegrityError as e:
        print(f"RECUSADO ({e}): {sql[:50]}")

print("itens que sobraram:", con.execute("SELECT COUNT(*) FROM itens_pedido").fetchone()[0])
print(con.execute("SELECT id, nome, criado_em FROM clientes").fetchall())`,runnable:!0,caption:`Troque ON DELETE RESTRICT por CASCADE, ou apague a linha do PRAGMA, e rode de novo: compare o que muda.`},{type:`code`,lang:`python`,code:`import sqlite3

con = sqlite3.connect(":memory:")
con.execute("PRAGMA foreign_keys = ON")
con.executescript("""
CREATE TABLE produtos (
  sku            TEXT    PRIMARY KEY NOT NULL,
  nome           TEXT    NOT NULL,
  preco_centavos INTEGER NOT NULL CHECK (preco_centavos >= 0)
);
CREATE TABLE itens_venda (
  venda_id INTEGER NOT NULL,
  sku      TEXT    NOT NULL REFERENCES produtos(sku) ON DELETE CASCADE,
  qtd      INTEGER NOT NULL
);
INSERT INTO produtos VALUES ('CAFE500', 'Café 500 g', 1890), ('ACUCAR1K', 'Açúcar 1 kg', 549),
                            ('LEITE1L', 'Leite 1 L', 589);
INSERT INTO itens_venda VALUES (1, 'CAFE500', 2), (2, 'CAFE500', 1);
""")

# o ritual: conferir, mudar com o mesmo WHERE, conferir
antes = con.execute("SELECT sku, preco_centavos FROM produtos WHERE preco_centavos < 600").fetchall()
print("vai mudar:", antes)
cur = con.execute("UPDATE produtos SET preco_centavos = preco_centavos + 30 WHERE preco_centavos < 600")
print("mudou:", cur.rowcount, "linha(s); esperado:", len(antes))

# RETURNING: o próprio UPDATE devolve as linhas afetadas, com os valores novos
print(con.execute("UPDATE produtos SET nome = upper(nome) WHERE sku = 'LEITE1L' RETURNING sku, nome").fetchall())

# UPSERT: insere ou, se o sku já existe, atualiza o preço
upsert = """INSERT INTO produtos (sku, nome, preco_centavos) VALUES (?, ?, ?)
            ON CONFLICT (sku) DO UPDATE SET preco_centavos = excluded.preco_centavos"""
con.execute(upsert, ("CAFE500", "Café 500 g", 1990))    # já existe: atualiza
con.execute(upsert, ("SAL1K", "Sal 1 kg", 349))         # não existe: insere
print(con.execute("SELECT * FROM produtos ORDER BY sku").fetchall())
print("itens de venda:", con.execute("SELECT COUNT(*) FROM itens_venda").fetchone()[0])

# a armadilha: REPLACE apaga a linha antiga, e o CASCADE leva as vendas junto
con.execute("INSERT OR REPLACE INTO produtos VALUES ('CAFE500', 'Café 500 g', 2090)")
print("itens de venda depois do REPLACE:", con.execute("SELECT COUNT(*) FROM itens_venda").fetchone()[0])`,runnable:!0,caption:`O mesmo sku, o mesmo produto, e as duas vendas do café sumiram. Troque o REPLACE pelo upsert e compare.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e7-dml-1`,kind:`mcq`,prompt:`Na tabela de clientes de uma operadora de internet, o e-mail é **opcional**, mas dois clientes não podem ter o mesmo e-mail. Qual declaração da coluna atende exatamente a isso?`,difficulty:`facil`,skills:[`bd-sql`],hints:[`São duas exigências: pode ficar vazio, e não pode repetir. Qual restrição cuida de cada uma?`,`Como o UNIQUE trata dois clientes com e-mail NULL?`],explanation:`UNIQUE recusa valores repetidos e não considera dois NULL como repetidos, então quem não tem e-mail não atrapalha ninguém. NOT NULL tornaria o e-mail obrigatório; PRIMARY KEY faria do e-mail a identidade do cliente, que precisa existir e não deveria mudar; e um CHECK (email IS NOT NULL) só obriga a preencher, sem impedir repetição.`,options:[{text:"`email TEXT UNIQUE`",correct:!0,feedback:`Isso: UNIQUE barra o repetido, e NULL não conta como repetido, então o campo continua opcional.`},{text:"`email TEXT NOT NULL UNIQUE`",feedback:`O UNIQUE está certo, mas o NOT NULL torna o e-mail obrigatório, e o enunciado diz que ele é opcional.`},{text:"`email TEXT PRIMARY KEY`",feedback:`A chave primária é a identidade da linha: precisa existir (pelo padrão SQL, não aceita NULL) e não deveria mudar. E-mail é opcional e muda; use um id como chave e UNIQUE no e-mail.`},{text:"`email TEXT CHECK (email IS NOT NULL)`",feedback:`Esse CHECK só obriga a preencher (o mesmo que NOT NULL) e não impede dois clientes com o mesmo e-mail.`}]}},{type:`exercise`,exercise:{id:`e7-dml-2`,kind:`fill`,lang:`sql`,prompt:`Complete a tabela \`matriculas\` da escola para que:

- quando um aluno for apagado do cadastro, as matrículas dele sejam apagadas junto;
- a nota fique entre 0 e 10, podendo ficar vazia enquanto a disciplina não terminou;
- a combinação aluno + disciplina identifique cada matrícula (seja a chave da tabela), impedindo a mesma matrícula duas vezes.`,difficulty:`intermediario`,skills:[`bd-sql`],hints:[`Qual palavra liga uma coluna à chave de outra tabela?`,`Das ações de ON DELETE, qual apaga as filhas junto com a mãe?`,`Qual restrição recusa uma linha em que uma expressão dá falso? E ela recusa uma nota NULL?`,`Uma chave formada por duas colunas é declarada no fim da lista, com as colunas entre parênteses.`],explanation:`REFERENCES cria a chave estrangeira, e ON DELETE CASCADE apaga as matrículas quando o aluno é apagado. CHECK (nota BETWEEN 0 AND 10) recusa notas fora da faixa e deixa passar NULL, porque NULL BETWEEN 0 AND 10 não dá falso: é exatamente o "pode ficar vazia". PRIMARY KEY (aluno_id, disciplina_id) é a chave composta: a mesma dupla não pode aparecer duas vezes. Um UNIQUE (aluno_id, disciplina_id) também impediria a repetição, mas o enunciado pede que a combinação seja a chave da tabela.`,template:`CREATE TABLE matriculas (
  aluno_id      INTEGER NOT NULL ___ alunos(id) ON DELETE ___,
  disciplina_id INTEGER NOT NULL REFERENCES disciplinas(id),
  nota          REAL ___ (nota BETWEEN 0 AND 10),
  ___ (aluno_id, disciplina_id)
);`,blanks:[[`REFERENCES`,`references`],[`CASCADE`,`cascade`],[`CHECK`,`check`],[`PRIMARY KEY`,`primary key`]]}},{type:`exercise`,exercise:{id:`e7-dml-3`,kind:`predict`,lang:`python`,prompt:`O que este programa imprime? Atenção ao saldo de Caio e ao segundo UPDATE, que não tem WHERE.`,difficulty:`intermediario`,skills:[`bd-sql`],hints:[`Qual é o saldo de Caio logo depois do INSERT, que não informa o saldo?`,`Quantas linhas satisfazem saldo >= 50 no primeiro UPDATE?`,`No segundo UPDATE, alguma linha ficaria negativa? O que acontece com as linhas que não ficariam?`],explanation:`Caio entra com saldo 0, o DEFAULT. O primeiro UPDATE só atinge Ana (100 ≥ 50), que fica com 50: rowcount é 1. O segundo UPDATE, sem WHERE, tenta tirar 40 de todos: Ana iria a 10, mas Bia iria a −10 e Caio a −40, violando o CHECK. Um comando que viola uma restrição é desfeito por inteiro, então nem a Ana muda. O saldo final é o mesmo de antes do segundo UPDATE.`,code:`import sqlite3

con = sqlite3.connect(":memory:")
con.executescript("""
CREATE TABLE contas (
  id      INTEGER PRIMARY KEY,
  titular TEXT    NOT NULL,
  saldo   INTEGER NOT NULL DEFAULT 0 CHECK (saldo >= 0)
);
INSERT INTO contas (titular, saldo) VALUES ('Ana', 100), ('Bia', 30);
INSERT INTO contas (titular) VALUES ('Caio');
""")
cur = con.execute("UPDATE contas SET saldo = saldo - 50 WHERE saldo >= 50")
print(cur.rowcount)
try:
    con.execute("UPDATE contas SET saldo = saldo - 40")
except sqlite3.IntegrityError:
    print("recusado")
print(con.execute("SELECT titular, saldo FROM contas ORDER BY id").fetchall())`,answer:`1
recusado
[('Ana', 50), ('Bia', 30), ('Caio', 0)]`}},{type:`exercise`,exercise:{id:`e7-dml-4`,kind:`sql`,prompt:"O mercadinho vai reajustar em 10% os produtos da categoria `'hortifruti'` que custam **menos** de R$ 6,00. Antes de rodar o UPDATE, escreva o SELECT de conferência: `id`, `nome`, `preco_centavos` (o preço atual) e `novo` (o preço reajustado, arredondado para centavos inteiros), só das linhas que o UPDATE vai atingir, em ordem de `id`.",difficulty:`intermediario`,skills:[`bd-sql`],hints:[`O WHERE da conferência é o mesmo que o UPDATE vai usar. Quais são as duas condições?`,`R$ 6,00 em centavos é quanto? "Menos de" inclui o próprio valor?`,`O preço novo é uma expressão calculada no SELECT, com um apelido (AS). Que função arredonda?`],explanation:`SELECT id, nome, preco_centavos, ROUND(preco_centavos * 1.10) AS novo FROM produtos WHERE categoria = 'hortifruti' AND preco_centavos < 600 ORDER BY id; — a conferência usa exatamente o WHERE do UPDATE e mostra o antes e o depois de cada linha. Sem ROUND, 299 × 1,10 daria 328.90000000000003; sem o filtro de categoria, o sal (349) entraria por engano; com <= 600, a batata, que custa exatamente R$ 6,00, entraria sem dever.`,setup:`CREATE TABLE produtos (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, categoria TEXT NOT NULL, preco_centavos INTEGER NOT NULL CHECK (preco_centavos >= 0));
INSERT INTO produtos VALUES
  (1, 'Banana prata (kg)', 'hortifruti', 599),
  (2, 'Alface crespa', 'hortifruti', 299),
  (3, 'Tomate (kg)', 'hortifruti', 899),
  (4, 'Cheiro-verde', 'hortifruti', 250),
  (5, 'Arroz 5 kg', 'mercearia', 2899),
  (6, 'Sal 1 kg', 'mercearia', 349),
  (7, 'Limão taiti (kg)', 'hortifruti', 500),
  (8, 'Cebola (kg)', 'hortifruti', 479),
  (9, 'Batata inglesa (kg)', 'hortifruti', 600);`,starter:`SELECT id, nome, preco_centavos FROM produtos WHERE categoria = 'hortifruti';`,solution:`SELECT id, nome, preco_centavos, ROUND(preco_centavos * 1.10) AS novo FROM produtos WHERE categoria = 'hortifruti' AND preco_centavos < 600 ORDER BY id;`,ordered:!0}},{type:`exercise`,exercise:{id:`e7-dml-5`,kind:`code`,lang:`python`,prompt:"Uma operadora de internet guarda planos e assinantes. Complete o DDL em `SCHEMA` (as colunas já estão lá) para que **o banco** recuse tudo o que fere estas regras:\n\n**planos**\n- `id`: inteiro, chave primária gerada pelo banco;\n- `nome`: obrigatório e sem repetição;\n- `velocidade_mbps`: inteiro obrigatório, maior que 0;\n- `preco_centavos`: inteiro obrigatório, maior ou igual a 0 (existe plano de cortesia).\n\n**assinantes**\n- `id`: inteiro, chave primária gerada pelo banco;\n- `cpf`: texto obrigatório, sem repetição, com exatamente 11 caracteres (só os dígitos);\n- `nome`: obrigatório;\n- `cep`: texto obrigatório com exatamente 8 caracteres;\n- `plano_id`: obrigatório, precisa ser um plano que existe, e não se pode apagar um plano que ainda tem assinantes;\n- `ativo`: obrigatório, só 0 ou 1, valendo 1 quando o INSERT não informa.\n\nOs testes criam um banco novo, ligam `PRAGMA foreign_keys = ON` e rodam `executescript(SCHEMA)`.",difficulty:`intermediario`,skills:[`bd-sql`],hints:[`Para cada regra, pergunte: qual restrição recusa exatamente isso? Algumas regras precisam de duas.`,`Um CHECK (velocidade_mbps > 0) recusa uma velocidade NULL? O que obriga a ter valor?`,`O tamanho de um texto no SQLite sai da função length(). Por que CPF e CEP precisam ser TEXT, e não INTEGER?`,`Qual palavra liga plano_id a planos(id)? Entre as ações de ON DELETE, qual recusa apagar a mãe que tem filhas?`],explanation:`Cada regra vira uma restrição: NOT NULL para "obrigatório" (um CHECK sozinho deixa NULL passar), UNIQUE para "sem repetição", CHECK para as faixas e tamanhos, DEFAULT 1 para o valor padrão de ativo, e REFERENCES planos(id) para o plano existir. ON DELETE RESTRICT (ou o padrão, NO ACTION) impede apagar um plano com assinantes; CASCADE apagaria os assinantes junto. CPF e CEP são TEXT porque, numa coluna INTEGER, a afinidade de tipo do SQLite converteria 01310100 em 1310100, e o CHECK de 8 caracteres passaria a recusar um CEP válido.`,starter:`SCHEMA = """
CREATE TABLE planos (
  id              INTEGER PRIMARY KEY,
  nome            TEXT,
  velocidade_mbps INTEGER,
  preco_centavos  INTEGER
);
CREATE TABLE assinantes (
  id       INTEGER PRIMARY KEY,
  cpf      TEXT,
  nome     TEXT,
  cep      TEXT,
  plano_id INTEGER,
  ativo    INTEGER
);
"""
# acrescente as restrições pedidas no enunciado`,solution:`SCHEMA = """
CREATE TABLE planos (
  id              INTEGER PRIMARY KEY,
  nome            TEXT    NOT NULL UNIQUE,
  velocidade_mbps INTEGER NOT NULL CHECK (velocidade_mbps > 0),
  preco_centavos  INTEGER NOT NULL CHECK (preco_centavos >= 0)
);
CREATE TABLE assinantes (
  id       INTEGER PRIMARY KEY,
  cpf      TEXT    NOT NULL UNIQUE CHECK (length(cpf) = 11),
  nome     TEXT    NOT NULL,
  cep      TEXT    NOT NULL CHECK (length(cep) = 8),
  plano_id INTEGER NOT NULL REFERENCES planos(id) ON DELETE RESTRICT,
  ativo    INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1))
);
"""`,tests:[{name:`dados válidos entram, com os valores certos`,code:`import sqlite3

def _banco():
    con = sqlite3.connect(":memory:")
    con.execute("PRAGMA foreign_keys = ON")
    con.executescript(SCHEMA)
    return con

def _recusa(con, sql, params, motivo, dica=""):
    try:
        con.execute(sql, params)
    except sqlite3.IntegrityError:
        return
    raise AssertionError(f"o banco aceitou {motivo}. {dica}".strip())

def _aceita(con, sql, params, motivo):
    try:
        return con.execute(sql, params)
    except sqlite3.IntegrityError as e:
        raise AssertionError(f"o banco recusou {motivo} ({e}), mas isso é permitido pelas regras")

_PLANO = "INSERT INTO planos (nome, velocidade_mbps, preco_centavos) VALUES (?, ?, ?)"
_ASSINANTE = "INSERT INTO assinantes (cpf, nome, cep, plano_id) VALUES (?, ?, ?, ?)"
_ASSINANTE_ATIVO = "INSERT INTO assinantes (cpf, nome, cep, plano_id, ativo) VALUES (?, ?, ?, ?, ?)"
con = _banco()
pid = _aceita(con, _PLANO, ("Fibra 500", 500, 9990), "um plano válido").lastrowid
_aceita(con, _PLANO, ("Cortesia", 50, 0), "um plano de preço 0 (cortesia)")
aid = _aceita(con, _ASSINANTE, ("01234567890", "Ana", "01310100", pid), "um assinante válido").lastrowid
cpf, cep, ativo = con.execute("SELECT cpf, cep, ativo FROM assinantes WHERE id = ?", (aid,)).fetchone()
assert ativo == 1, f"quando o INSERT não informa ativo, ele deveria valer 1, mas veio {ativo!r}: falta um DEFAULT"
assert cep == "01310100", f"o CEP 01310100 voltou do banco como {cep!r}: declare o CEP como TEXT para não perder o zero à esquerda"
assert cpf == "01234567890", f"o CPF 01234567890 voltou do banco como {cpf!r}: declare o CPF como TEXT"
_aceita(con, _ASSINANTE_ATIVO, ("98765432100", "Bia", "69005040", pid, 0), "um assinante inativo (ativo = 0)")`},{name:`campos obrigatórios`,code:`import sqlite3

def _banco():
    con = sqlite3.connect(":memory:")
    con.execute("PRAGMA foreign_keys = ON")
    con.executescript(SCHEMA)
    return con

def _recusa(con, sql, params, motivo, dica=""):
    try:
        con.execute(sql, params)
    except sqlite3.IntegrityError:
        return
    raise AssertionError(f"o banco aceitou {motivo}. {dica}".strip())

def _aceita(con, sql, params, motivo):
    try:
        return con.execute(sql, params)
    except sqlite3.IntegrityError as e:
        raise AssertionError(f"o banco recusou {motivo} ({e}), mas isso é permitido pelas regras")

_PLANO = "INSERT INTO planos (nome, velocidade_mbps, preco_centavos) VALUES (?, ?, ?)"
_ASSINANTE = "INSERT INTO assinantes (cpf, nome, cep, plano_id) VALUES (?, ?, ?, ?)"
_ASSINANTE_ATIVO = "INSERT INTO assinantes (cpf, nome, cep, plano_id, ativo) VALUES (?, ?, ?, ?, ?)"
con = _banco()
pid = _aceita(con, _PLANO, ("Fibra 500", 500, 9990), "um plano válido").lastrowid
dica = "Lembre: um CHECK sozinho deixa NULL passar; o que obriga a ter valor é NOT NULL."
_recusa(con, _PLANO, (None, 300, 7990), "um plano sem nome", dica)
_recusa(con, _PLANO, ("Fibra 300", None, 7990), "um plano sem velocidade", dica)
_recusa(con, _PLANO, ("Fibra 300", 300, None), "um plano sem preço", dica)
_recusa(con, _ASSINANTE, (None, "Ana", "01310100", pid), "um assinante sem CPF", dica)
_recusa(con, _ASSINANTE, ("01234567890", None, "01310100", pid), "um assinante sem nome", dica)
_recusa(con, _ASSINANTE, ("01234567890", "Ana", None, pid), "um assinante sem CEP", dica)
_recusa(con, _ASSINANTE, ("01234567890", "Ana", "01310100", None), "um assinante sem plano", dica)
_recusa(con, _ASSINANTE_ATIVO, ("01234567890", "Ana", "01310100", pid, None), "um assinante com ativo NULL", dica)`},{name:`sem repetição`,code:`import sqlite3

def _banco():
    con = sqlite3.connect(":memory:")
    con.execute("PRAGMA foreign_keys = ON")
    con.executescript(SCHEMA)
    return con

def _recusa(con, sql, params, motivo, dica=""):
    try:
        con.execute(sql, params)
    except sqlite3.IntegrityError:
        return
    raise AssertionError(f"o banco aceitou {motivo}. {dica}".strip())

def _aceita(con, sql, params, motivo):
    try:
        return con.execute(sql, params)
    except sqlite3.IntegrityError as e:
        raise AssertionError(f"o banco recusou {motivo} ({e}), mas isso é permitido pelas regras")

_PLANO = "INSERT INTO planos (nome, velocidade_mbps, preco_centavos) VALUES (?, ?, ?)"
_ASSINANTE = "INSERT INTO assinantes (cpf, nome, cep, plano_id) VALUES (?, ?, ?, ?)"
_ASSINANTE_ATIVO = "INSERT INTO assinantes (cpf, nome, cep, plano_id, ativo) VALUES (?, ?, ?, ?, ?)"
con = _banco()
pid = _aceita(con, _PLANO, ("Fibra 500", 500, 9990), "um plano válido").lastrowid
_recusa(con, _PLANO, ("Fibra 500", 600, 10990), "dois planos com o mesmo nome")
_aceita(con, _ASSINANTE, ("01234567890", "Ana", "01310100", pid), "um assinante válido")
_recusa(con, _ASSINANTE, ("01234567890", "Ana Souza", "50030230", pid), "dois assinantes com o mesmo CPF")`},{name:`faixas e tamanhos (CHECK)`,code:`import sqlite3

def _banco():
    con = sqlite3.connect(":memory:")
    con.execute("PRAGMA foreign_keys = ON")
    con.executescript(SCHEMA)
    return con

def _recusa(con, sql, params, motivo, dica=""):
    try:
        con.execute(sql, params)
    except sqlite3.IntegrityError:
        return
    raise AssertionError(f"o banco aceitou {motivo}. {dica}".strip())

def _aceita(con, sql, params, motivo):
    try:
        return con.execute(sql, params)
    except sqlite3.IntegrityError as e:
        raise AssertionError(f"o banco recusou {motivo} ({e}), mas isso é permitido pelas regras")

_PLANO = "INSERT INTO planos (nome, velocidade_mbps, preco_centavos) VALUES (?, ?, ?)"
_ASSINANTE = "INSERT INTO assinantes (cpf, nome, cep, plano_id) VALUES (?, ?, ?, ?)"
_ASSINANTE_ATIVO = "INSERT INTO assinantes (cpf, nome, cep, plano_id, ativo) VALUES (?, ?, ?, ?, ?)"
con = _banco()
pid = _aceita(con, _PLANO, ("Fibra 500", 500, 9990), "um plano válido").lastrowid
_recusa(con, _PLANO, ("Turbo zero", 0, 5000), "um plano de 0 Mbps")
_recusa(con, _PLANO, ("Ao contrário", -100, 5000), "um plano de velocidade negativa")
_recusa(con, _PLANO, ("Pago para usar", 100, -1), "um plano de preço negativo")
_recusa(con, _ASSINANTE, ("1234567890", "Ana", "01310100", pid), "um CPF com 10 dígitos")
_recusa(con, _ASSINANTE, ("012.345.678-90", "Ana", "01310100", pid), "um CPF com máscara (14 caracteres)")
_recusa(con, _ASSINANTE, ("01234567890", "Ana", "01310-100", pid), "um CEP com hífen (9 caracteres)")
_recusa(con, _ASSINANTE, ("01234567890", "Ana", "0131010", pid), "um CEP com 7 caracteres")
_recusa(con, _ASSINANTE_ATIVO, ("01234567890", "Ana", "01310100", pid, 2), "ativo = 2")
_recusa(con, _ASSINANTE_ATIVO, ("01234567890", "Ana", "01310100", pid, -1), "ativo = -1", "Só 0 e 1 valem: confira os dois lados da faixa.")`},{name:`chave estrangeira`,code:`import sqlite3

def _banco():
    con = sqlite3.connect(":memory:")
    con.execute("PRAGMA foreign_keys = ON")
    con.executescript(SCHEMA)
    return con

def _recusa(con, sql, params, motivo, dica=""):
    try:
        con.execute(sql, params)
    except sqlite3.IntegrityError:
        return
    raise AssertionError(f"o banco aceitou {motivo}. {dica}".strip())

def _aceita(con, sql, params, motivo):
    try:
        return con.execute(sql, params)
    except sqlite3.IntegrityError as e:
        raise AssertionError(f"o banco recusou {motivo} ({e}), mas isso é permitido pelas regras")

_PLANO = "INSERT INTO planos (nome, velocidade_mbps, preco_centavos) VALUES (?, ?, ?)"
_ASSINANTE = "INSERT INTO assinantes (cpf, nome, cep, plano_id) VALUES (?, ?, ?, ?)"
_ASSINANTE_ATIVO = "INSERT INTO assinantes (cpf, nome, cep, plano_id, ativo) VALUES (?, ?, ?, ?, ?)"
con = _banco()
p1 = _aceita(con, _PLANO, ("Fibra 500", 500, 9990), "um plano válido").lastrowid
p2 = _aceita(con, _PLANO, ("Fibra 1 giga", 1000, 14990), "um plano válido").lastrowid
_recusa(con, _ASSINANTE, ("01234567890", "Ana", "01310100", 999), "um assinante do plano 999, que não existe")
_aceita(con, _ASSINANTE, ("01234567890", "Ana", "01310100", p1), "um assinante válido")
_recusa(con, "DELETE FROM planos WHERE id = ?", (p1,), "apagar um plano que ainda tem assinantes", "Qual ação de ON DELETE recusa apagar a mãe que tem filhas? (CASCADE apagaria os assinantes junto.)")
try:
    con.execute("DELETE FROM planos WHERE id = ?", (p1,))
except sqlite3.IntegrityError as e:
    assert "FOREIGN KEY" in str(e), f"apagar o plano foi recusado, mas pela regra errada ({e}): quem deve recusar é a chave estrangeira. Com SET NULL, o banco tenta pôr NULL em plano_id e esbarra no NOT NULL; use a ação que recusa apagar a mãe"
n = con.execute("SELECT COUNT(*) FROM assinantes").fetchone()[0]
assert n == 1, f"depois da tentativa de apagar o plano, sobraram {n} assinantes; deveria continuar 1"
_aceita(con, "DELETE FROM planos WHERE id = ?", (p2,), "apagar um plano sem assinantes")`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e7-dml-desafio`,kind:`code`,lang:`python`,prompt:'Toda noite, o fornecedor de um mercadinho manda o catálogo **completo** de hoje: uma lista de `(sku, nome, preco_centavos)`. Escreva `sincronizar(con, catalogo)`, que deixa a tabela `produtos` de acordo com o catálogo sem destruir o histórico de vendas. As tabelas (os testes ligam `PRAGMA foreign_keys = ON`):\n\n```sql\nCREATE TABLE produtos (\n  sku            TEXT    PRIMARY KEY NOT NULL,\n  nome           TEXT    NOT NULL,\n  preco_centavos INTEGER NOT NULL CHECK (preco_centavos >= 0),\n  ativo          INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1))\n);\nCREATE TABLE itens_venda (\n  venda_id INTEGER NOT NULL,\n  sku      TEXT    NOT NULL REFERENCES produtos(sku),\n  qtd      INTEGER NOT NULL CHECK (qtd > 0)\n);\n```\n\nRegras:\n\n1. **Valide antes de escrever.** Se o catálogo tiver um sku repetido ou um preço negativo, lance `ValueError` sem mudar **nada** na tabela.\n2. sku que não está na tabela: insira, ativo.\n3. sku que já está na tabela: se o nome ou o preço mudaram, ou se ele estava inativo, atualize nome e preço e deixe-o ativo. Se nada mudou, não mexa.\n4. sku que está na tabela mas saiu do catálogo: se já foi vendido (aparece em `itens_venda`), desative-o (`ativo = 0`); se nunca foi vendido, apague-o.\n5. Devolva um dict com quatro contagens: `inseridos`, `atualizados` (inclui os reativados), `desativados` (só os que estavam ativos) e `removidos`.\n\nExemplo: com a tabela ARROZ5 (2899), CAFE500 (1890), FEIJAO1 (899), OLEO900 (799) e SAL1 (349, inativo), vendas de ARROZ5, OLEO900 e SAL1, e o catálogo ARROZ5 a 2999, CAFE500 a 1890, SAL1 a 349 e o novo ACUCAR1 a 549, o resultado é `{"inseridos": 1, "atualizados": 2, "desativados": 1, "removidos": 1}`: ACUCAR1 entra; ARROZ5 muda de preço e SAL1 volta a ficar ativo; OLEO900 sai do catálogo mas tem venda, então é desativado; FEIJAO1 sai e nunca foi vendido, então é apagado. Rodar de novo com o mesmo catálogo não muda nada e devolve tudo zero.',difficulty:`desafio`,skills:[`bd-sql`],hints:[`Antes de escrever qualquer linha, o que você precisa saber sobre o catálogo inteiro? E sobre a tabela?`,`Para decidir entre inserir, atualizar ou não mexer, você precisa do estado atual de cada sku. Uma consulta só, guardada num dict, resolve.`,`Para saber quem já foi vendido, que consulta em itens_venda dá o conjunto de skus?`,`O que acontece se você tentar apagar um produto que tem venda, com as chaves estrangeiras ligadas? Como evitar tentar?`,`Quando é que um produto que saiu do catálogo não deve ser contado como desativado?`],explanation:`Validar primeiro (skus repetidos com um set, preços negativos com any) garante que nada é escrito a partir de um catálogo ruim; validar no meio do caminho deixaria parte das mudanças feitas, e desfazer um lote inteiro é trabalho de transação. Depois, uma consulta carrega o estado atual num dict e outra carrega o conjunto de skus vendidos; cada item do catálogo vira INSERT, UPDATE ou nada, comparando a tupla (nome, preço, ativo) atual com (nome, preço, 1). Os skus que sobraram viram UPDATE ativo = 0 (só se estavam ativos) ou DELETE (só se nunca foram vendidos, senão a chave estrangeira recusaria). Todos os comandos usam parâmetros (?). Um UPSERT com ON CONFLICT DO UPDATE ... WHERE também faria as linhas 2 e 3, mas não diria quantas foram inserções e quantas foram atualizações; por isso a leitura do estado atual é útil aqui.`,starter:`def sincronizar(con, catalogo):
    # catalogo: lista de (sku, nome, preco_centavos), o catálogo completo do fornecedor
    # devolva {"inseridos": ..., "atualizados": ..., "desativados": ..., "removidos": ...}
    pass`,solution:`def sincronizar(con, catalogo):
    skus = [sku for sku, _, _ in catalogo]
    if len(set(skus)) != len(skus):
        raise ValueError("sku repetido no catálogo")
    if any(preco < 0 for _, _, preco in catalogo):
        raise ValueError("preço negativo no catálogo")

    atuais = {sku: (nome, preco, ativo) for sku, nome, preco, ativo
              in con.execute("SELECT sku, nome, preco_centavos, ativo FROM produtos")}
    vendidos = {sku for (sku,) in con.execute("SELECT DISTINCT sku FROM itens_venda")}
    cont = {"inseridos": 0, "atualizados": 0, "desativados": 0, "removidos": 0}

    for sku, nome, preco in catalogo:
        if sku not in atuais:
            con.execute("INSERT INTO produtos (sku, nome, preco_centavos) VALUES (?, ?, ?)", (sku, nome, preco))
            cont["inseridos"] += 1
        elif atuais[sku] != (nome, preco, 1):
            con.execute("UPDATE produtos SET nome = ?, preco_centavos = ?, ativo = 1 WHERE sku = ?", (nome, preco, sku))
            cont["atualizados"] += 1

    no_catalogo = set(skus)
    for sku, (_, _, ativo) in atuais.items():
        if sku in no_catalogo:
            continue
        if sku in vendidos:
            if ativo == 1:
                con.execute("UPDATE produtos SET ativo = 0 WHERE sku = ?", (sku,))
                cont["desativados"] += 1
        else:
            con.execute("DELETE FROM produtos WHERE sku = ?", (sku,))
            cont["removidos"] += 1
    return cont`,tests:[{name:`o exemplo do enunciado`,code:`import sqlite3

def _banco_loja(produtos, vendas=()):
    con = sqlite3.connect(":memory:")
    con.execute("PRAGMA foreign_keys = ON")
    con.executescript("""
        CREATE TABLE produtos (
          sku            TEXT    PRIMARY KEY NOT NULL,
          nome           TEXT    NOT NULL,
          preco_centavos INTEGER NOT NULL CHECK (preco_centavos >= 0),
          ativo          INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1))
        );
        CREATE TABLE itens_venda (
          venda_id INTEGER NOT NULL,
          sku      TEXT    NOT NULL REFERENCES produtos(sku),
          qtd      INTEGER NOT NULL CHECK (qtd > 0)
        );
    """)
    con.executemany("INSERT INTO produtos VALUES (?, ?, ?, ?)", produtos)
    con.executemany("INSERT INTO itens_venda VALUES (?, ?, ?)", vendas)
    return con

def _estado(con):
    return con.execute("SELECT sku, nome, preco_centavos, ativo FROM produtos ORDER BY sku").fetchall()

def _zeros():
    return {"inseridos": 0, "atualizados": 0, "desativados": 0, "removidos": 0}

_LOJA = [("ARROZ5", "Arroz 5 kg", 2899, 1), ("CAFE500", "Café 500 g", 1890, 1), ("FEIJAO1", "Feijão 1 kg", 899, 1),
         ("OLEO900", "Óleo 900 ml", 799, 1), ("SAL1", "Sal 1 kg", 349, 0)]
_VENDAS = [(1, "ARROZ5", 1), (1, "OLEO900", 2), (2, "SAL1", 1)]
_CATALOGO = [("ARROZ5", "Arroz 5 kg", 2999), ("CAFE500", "Café 500 g", 1890), ("SAL1", "Sal 1 kg", 349),
             ("ACUCAR1", "Açúcar 1 kg", 549)]
con = _banco_loja(_LOJA, _VENDAS)
r = sincronizar(con, _CATALOGO)
esperado = {"inseridos": 1, "atualizados": 2, "desativados": 1, "removidos": 1}
assert r == esperado, f"contagens {r}, esperado {esperado}. ACUCAR1 é novo; ARROZ5 mudou de preço e SAL1 estava inativo (2 atualizados); OLEO900 saiu e tem venda (desativado); FEIJAO1 saiu e nunca foi vendido (removido); CAFE500 não mudou"
final = [("ACUCAR1", "Açúcar 1 kg", 549, 1), ("ARROZ5", "Arroz 5 kg", 2999, 1), ("CAFE500", "Café 500 g", 1890, 1),
         ("OLEO900", "Óleo 900 ml", 799, 0), ("SAL1", "Sal 1 kg", 349, 1)]
assert _estado(con) == final, f"a tabela ficou {_estado(con)}, esperado {final}"`},{name:`rodar de novo não muda nada`,code:`import sqlite3

def _banco_loja(produtos, vendas=()):
    con = sqlite3.connect(":memory:")
    con.execute("PRAGMA foreign_keys = ON")
    con.executescript("""
        CREATE TABLE produtos (
          sku            TEXT    PRIMARY KEY NOT NULL,
          nome           TEXT    NOT NULL,
          preco_centavos INTEGER NOT NULL CHECK (preco_centavos >= 0),
          ativo          INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1))
        );
        CREATE TABLE itens_venda (
          venda_id INTEGER NOT NULL,
          sku      TEXT    NOT NULL REFERENCES produtos(sku),
          qtd      INTEGER NOT NULL CHECK (qtd > 0)
        );
    """)
    con.executemany("INSERT INTO produtos VALUES (?, ?, ?, ?)", produtos)
    con.executemany("INSERT INTO itens_venda VALUES (?, ?, ?)", vendas)
    return con

def _estado(con):
    return con.execute("SELECT sku, nome, preco_centavos, ativo FROM produtos ORDER BY sku").fetchall()

def _zeros():
    return {"inseridos": 0, "atualizados": 0, "desativados": 0, "removidos": 0}

_LOJA = [("ARROZ5", "Arroz 5 kg", 2899, 1), ("CAFE500", "Café 500 g", 1890, 1), ("FEIJAO1", "Feijão 1 kg", 899, 1),
         ("OLEO900", "Óleo 900 ml", 799, 1), ("SAL1", "Sal 1 kg", 349, 0)]
_VENDAS = [(1, "ARROZ5", 1), (1, "OLEO900", 2), (2, "SAL1", 1)]
_CATALOGO = [("ARROZ5", "Arroz 5 kg", 2999), ("CAFE500", "Café 500 g", 1890), ("SAL1", "Sal 1 kg", 349),
             ("ACUCAR1", "Açúcar 1 kg", 549)]
con = _banco_loja(_LOJA, _VENDAS)
sincronizar(con, _CATALOGO)
depois_da_primeira = _estado(con)
r = sincronizar(con, _CATALOGO)
assert r == _zeros(), f"a segunda sincronização com o mesmo catálogo devolveu {r}, esperado tudo zero: só conte o que de fato mudou (um produto inativo que continua fora do catálogo não é desativado de novo)"
assert _estado(con) == depois_da_primeira, "a segunda sincronização com o mesmo catálogo mudou a tabela"`},{name:`catálogo vazio`,code:`import sqlite3

def _banco_loja(produtos, vendas=()):
    con = sqlite3.connect(":memory:")
    con.execute("PRAGMA foreign_keys = ON")
    con.executescript("""
        CREATE TABLE produtos (
          sku            TEXT    PRIMARY KEY NOT NULL,
          nome           TEXT    NOT NULL,
          preco_centavos INTEGER NOT NULL CHECK (preco_centavos >= 0),
          ativo          INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1))
        );
        CREATE TABLE itens_venda (
          venda_id INTEGER NOT NULL,
          sku      TEXT    NOT NULL REFERENCES produtos(sku),
          qtd      INTEGER NOT NULL CHECK (qtd > 0)
        );
    """)
    con.executemany("INSERT INTO produtos VALUES (?, ?, ?, ?)", produtos)
    con.executemany("INSERT INTO itens_venda VALUES (?, ?, ?)", vendas)
    return con

def _estado(con):
    return con.execute("SELECT sku, nome, preco_centavos, ativo FROM produtos ORDER BY sku").fetchall()

def _zeros():
    return {"inseridos": 0, "atualizados": 0, "desativados": 0, "removidos": 0}

_LOJA = [("ARROZ5", "Arroz 5 kg", 2899, 1), ("CAFE500", "Café 500 g", 1890, 1), ("FEIJAO1", "Feijão 1 kg", 899, 1),
         ("OLEO900", "Óleo 900 ml", 799, 1), ("SAL1", "Sal 1 kg", 349, 0)]
_VENDAS = [(1, "ARROZ5", 1), (1, "OLEO900", 2), (2, "SAL1", 1)]
_CATALOGO = [("ARROZ5", "Arroz 5 kg", 2999), ("CAFE500", "Café 500 g", 1890), ("SAL1", "Sal 1 kg", 349),
             ("ACUCAR1", "Açúcar 1 kg", 549)]
con = _banco_loja([("A", "a", 100, 1), ("B", "b", 200, 0), ("C", "c", 300, 1), ("D", "d", 400, 0)],
                  [(1, "A", 1), (2, "B", 1)])
r = sincronizar(con, [])
esperado = {"inseridos": 0, "atualizados": 0, "desativados": 1, "removidos": 2}
assert r == esperado, f"com catálogo vazio, deu {r}, esperado {esperado}: A (vendido, ativo) é desativado; B (vendido, já inativo) fica como está e não conta; C e D (nunca vendidos) são apagados"
assert _estado(con) == [("A", "a", 100, 0), ("B", "b", 200, 0)], f"a tabela ficou {_estado(con)}"`},{name:`mudança só de nome também é atualização`,code:`import sqlite3

def _banco_loja(produtos, vendas=()):
    con = sqlite3.connect(":memory:")
    con.execute("PRAGMA foreign_keys = ON")
    con.executescript("""
        CREATE TABLE produtos (
          sku            TEXT    PRIMARY KEY NOT NULL,
          nome           TEXT    NOT NULL,
          preco_centavos INTEGER NOT NULL CHECK (preco_centavos >= 0),
          ativo          INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1))
        );
        CREATE TABLE itens_venda (
          venda_id INTEGER NOT NULL,
          sku      TEXT    NOT NULL REFERENCES produtos(sku),
          qtd      INTEGER NOT NULL CHECK (qtd > 0)
        );
    """)
    con.executemany("INSERT INTO produtos VALUES (?, ?, ?, ?)", produtos)
    con.executemany("INSERT INTO itens_venda VALUES (?, ?, ?)", vendas)
    return con

def _estado(con):
    return con.execute("SELECT sku, nome, preco_centavos, ativo FROM produtos ORDER BY sku").fetchall()

def _zeros():
    return {"inseridos": 0, "atualizados": 0, "desativados": 0, "removidos": 0}

_LOJA = [("ARROZ5", "Arroz 5 kg", 2899, 1), ("CAFE500", "Café 500 g", 1890, 1), ("FEIJAO1", "Feijão 1 kg", 899, 1),
         ("OLEO900", "Óleo 900 ml", 799, 1), ("SAL1", "Sal 1 kg", 349, 0)]
_VENDAS = [(1, "ARROZ5", 1), (1, "OLEO900", 2), (2, "SAL1", 1)]
_CATALOGO = [("ARROZ5", "Arroz 5 kg", 2999), ("CAFE500", "Café 500 g", 1890), ("SAL1", "Sal 1 kg", 349),
             ("ACUCAR1", "Açúcar 1 kg", 549)]
con = _banco_loja([("CAFE500", "Café 500 g", 1890, 1)])
r = sincronizar(con, [("CAFE500", "Café Tradicional 500 g", 1890)])
assert r == {"inseridos": 0, "atualizados": 1, "desativados": 0, "removidos": 0}, f"o nome mudou e o preço não: esperado 1 atualizado, veio {r}"
assert _estado(con) == [("CAFE500", "Café Tradicional 500 g", 1890, 1)], f"a tabela ficou {_estado(con)}"`},{name:`preço 0 é válido`,code:`import sqlite3

def _banco_loja(produtos, vendas=()):
    con = sqlite3.connect(":memory:")
    con.execute("PRAGMA foreign_keys = ON")
    con.executescript("""
        CREATE TABLE produtos (
          sku            TEXT    PRIMARY KEY NOT NULL,
          nome           TEXT    NOT NULL,
          preco_centavos INTEGER NOT NULL CHECK (preco_centavos >= 0),
          ativo          INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1))
        );
        CREATE TABLE itens_venda (
          venda_id INTEGER NOT NULL,
          sku      TEXT    NOT NULL REFERENCES produtos(sku),
          qtd      INTEGER NOT NULL CHECK (qtd > 0)
        );
    """)
    con.executemany("INSERT INTO produtos VALUES (?, ?, ?, ?)", produtos)
    con.executemany("INSERT INTO itens_venda VALUES (?, ?, ?)", vendas)
    return con

def _estado(con):
    return con.execute("SELECT sku, nome, preco_centavos, ativo FROM produtos ORDER BY sku").fetchall()

def _zeros():
    return {"inseridos": 0, "atualizados": 0, "desativados": 0, "removidos": 0}

_LOJA = [("ARROZ5", "Arroz 5 kg", 2899, 1), ("CAFE500", "Café 500 g", 1890, 1), ("FEIJAO1", "Feijão 1 kg", 899, 1),
         ("OLEO900", "Óleo 900 ml", 799, 1), ("SAL1", "Sal 1 kg", 349, 0)]
_VENDAS = [(1, "ARROZ5", 1), (1, "OLEO900", 2), (2, "SAL1", 1)]
_CATALOGO = [("ARROZ5", "Arroz 5 kg", 2999), ("CAFE500", "Café 500 g", 1890), ("SAL1", "Sal 1 kg", 349),
             ("ACUCAR1", "Açúcar 1 kg", 549)]
con = _banco_loja([("CAFE500", "Café 500 g", 1890, 1)])
try:
    r = sincronizar(con, [("CAFE500", "Café 500 g", 1890), ("BRINDE1", "Colher medidora (brinde)", 0)])
except ValueError as e:
    raise AssertionError(f"um item de preço 0 (brinde) foi recusado com ValueError({e}); só preço negativo é inválido")
assert r == {"inseridos": 1, "atualizados": 0, "desativados": 0, "removidos": 0}, f"esperado 1 inserido, veio {r}"
assert ("BRINDE1", "Colher medidora (brinde)", 0, 1) in _estado(con), f"a tabela ficou {_estado(con)}"`},{name:`catálogo inválido não muda nada`,code:`import sqlite3

def _banco_loja(produtos, vendas=()):
    con = sqlite3.connect(":memory:")
    con.execute("PRAGMA foreign_keys = ON")
    con.executescript("""
        CREATE TABLE produtos (
          sku            TEXT    PRIMARY KEY NOT NULL,
          nome           TEXT    NOT NULL,
          preco_centavos INTEGER NOT NULL CHECK (preco_centavos >= 0),
          ativo          INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1))
        );
        CREATE TABLE itens_venda (
          venda_id INTEGER NOT NULL,
          sku      TEXT    NOT NULL REFERENCES produtos(sku),
          qtd      INTEGER NOT NULL CHECK (qtd > 0)
        );
    """)
    con.executemany("INSERT INTO produtos VALUES (?, ?, ?, ?)", produtos)
    con.executemany("INSERT INTO itens_venda VALUES (?, ?, ?)", vendas)
    return con

def _estado(con):
    return con.execute("SELECT sku, nome, preco_centavos, ativo FROM produtos ORDER BY sku").fetchall()

def _zeros():
    return {"inseridos": 0, "atualizados": 0, "desativados": 0, "removidos": 0}

_LOJA = [("ARROZ5", "Arroz 5 kg", 2899, 1), ("CAFE500", "Café 500 g", 1890, 1), ("FEIJAO1", "Feijão 1 kg", 899, 1),
         ("OLEO900", "Óleo 900 ml", 799, 1), ("SAL1", "Sal 1 kg", 349, 0)]
_VENDAS = [(1, "ARROZ5", 1), (1, "OLEO900", 2), (2, "SAL1", 1)]
_CATALOGO = [("ARROZ5", "Arroz 5 kg", 2999), ("CAFE500", "Café 500 g", 1890), ("SAL1", "Sal 1 kg", 349),
             ("ACUCAR1", "Açúcar 1 kg", 549)]
casos = [
    ([("A", "a", 150), ("NOVO", "novo", 10), ("A", "a", 160)], "o sku A aparece duas vezes"),
    ([("NOVO", "novo", 10), ("A", "a", 150), ("X", "x", -5)], "o último item tem preço negativo"),
]
for catalogo, motivo in casos:
    con = _banco_loja([("A", "a", 100, 1), ("B", "b", 200, 1)], [(1, "A", 1)])
    antes = _estado(con)
    try:
        sincronizar(con, catalogo)
    except ValueError:
        pass
    else:
        raise AssertionError(f"catálogo inválido ({motivo}): deveria lançar ValueError")
    assert _estado(con) == antes, f"catálogo inválido ({motivo}): a tabela mudou para {_estado(con)}. Valide o catálogo inteiro antes de escrever qualquer coisa"`},{name:`cenários aleatórios`,code:`import sqlite3

def _banco_loja(produtos, vendas=()):
    con = sqlite3.connect(":memory:")
    con.execute("PRAGMA foreign_keys = ON")
    con.executescript("""
        CREATE TABLE produtos (
          sku            TEXT    PRIMARY KEY NOT NULL,
          nome           TEXT    NOT NULL,
          preco_centavos INTEGER NOT NULL CHECK (preco_centavos >= 0),
          ativo          INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1))
        );
        CREATE TABLE itens_venda (
          venda_id INTEGER NOT NULL,
          sku      TEXT    NOT NULL REFERENCES produtos(sku),
          qtd      INTEGER NOT NULL CHECK (qtd > 0)
        );
    """)
    con.executemany("INSERT INTO produtos VALUES (?, ?, ?, ?)", produtos)
    con.executemany("INSERT INTO itens_venda VALUES (?, ?, ?)", vendas)
    return con

def _estado(con):
    return con.execute("SELECT sku, nome, preco_centavos, ativo FROM produtos ORDER BY sku").fetchall()

def _zeros():
    return {"inseridos": 0, "atualizados": 0, "desativados": 0, "removidos": 0}

_LOJA = [("ARROZ5", "Arroz 5 kg", 2899, 1), ("CAFE500", "Café 500 g", 1890, 1), ("FEIJAO1", "Feijão 1 kg", 899, 1),
         ("OLEO900", "Óleo 900 ml", 799, 1), ("SAL1", "Sal 1 kg", 349, 0)]
_VENDAS = [(1, "ARROZ5", 1), (1, "OLEO900", 2), (2, "SAL1", 1)]
_CATALOGO = [("ARROZ5", "Arroz 5 kg", 2999), ("CAFE500", "Café 500 g", 1890), ("SAL1", "Sal 1 kg", 349),
             ("ACUCAR1", "Açúcar 1 kg", 549)]
import random

def _ref(estado, vendidos, catalogo):
    estado = dict(estado)
    cont = _zeros()
    novos = {s: (n, p) for s, n, p in catalogo}
    for s, (n, p) in novos.items():
        if s not in estado:
            estado[s] = (n, p, 1)
            cont["inseridos"] += 1
        elif estado[s] != (n, p, 1):
            estado[s] = (n, p, 1)
            cont["atualizados"] += 1
    for s in list(estado):
        if s in novos:
            continue
        if s in vendidos:
            if estado[s][2] == 1:
                estado[s] = estado[s][:2] + (0,)
                cont["desativados"] += 1
        else:
            del estado[s]
            cont["removidos"] += 1
    return cont, sorted((s,) + v for s, v in estado.items())

random.seed(11)
skus = [f"P{i:02d}" for i in range(15)]
for _ in range(40):
    produtos = [(s, random.choice(["x", "y"]), random.choice([100, 200]), random.choice([0, 1]))
                for s in random.sample(skus, random.randint(0, 10))]
    vendidos = {p[0] for p in produtos if random.random() < 0.4}
    vendas = [(i, s, 1) for i, s in enumerate(sorted(vendidos))]
    catalogo = [(s, random.choice(["x", "y"]), random.choice([100, 200]))
                for s in random.sample(skus, random.randint(0, 10))]
    con = _banco_loja(produtos, vendas)
    esperado, estado_esperado = _ref({s: (n, p, a) for s, n, p, a in produtos}, vendidos, catalogo)
    r = sincronizar(con, catalogo)
    assert r == esperado, f"tabela {produtos}, vendidos {sorted(vendidos)}, catálogo {catalogo}: contagens {r}, esperado {esperado}"
    assert _estado(con) == estado_esperado, f"tabela {produtos}, vendidos {sorted(vendidos)}, catálogo {catalogo}: a tabela ficou {_estado(con)}, esperado {estado_esperado}"`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:"**Sistema de cadastro: esquema com regras.** Antes de trocar o armazenamento do cadastro por SQLite (a parte 4 do projeto), escreva o esquema com as restrições: matrícula do aluno como chave, CPF e e-mail com UNIQUE, CHECK nas faixas que fizerem sentido, chaves estrangeiras com a ação ON DELETE de cada relação (e o PRAGMA ligado na conexão). Escreva um teste para cada regra, tentando inserir um dado inválido e esperando `sqlite3.IntegrityError`, como nos testes do exercício da operadora."},{type:`project`,projectId:`p3-cadastro`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- DDL define a estrutura (CREATE, ALTER, DROP); DML lê e altera as linhas (SELECT, INSERT, UPDATE, DELETE).
- Restrições no banco valem para todo programa e fecham a corrida da checagem no app: NOT NULL, UNIQUE, CHECK, DEFAULT, PRIMARY KEY, REFERENCES.
- CHECK e UNIQUE deixam NULL passar; só NOT NULL obriga a ter valor.
- Tipos: dinheiro em centavos (INTEGER), datas em ISO 8601, CPF e CEP como TEXT. No SQLite o tipo é afinidade; STRICT ou PostgreSQL recusam o tipo errado.
- Id substituto como chave primária e UNIQUE na chave natural; chave composta para pares que não podem repetir.
- Chave estrangeira: RESTRICT/NO ACTION recusa, CASCADE apaga junto, SET NULL solta. No SQLite, \`PRAGMA foreign_keys = ON\` em cada conexão.
- Um comando que viola uma restrição é desfeito por inteiro.
- Ritual: SELECT com o mesmo WHERE, o comando, conferir rowcount ou RETURNING.
- UPSERT com ON CONFLICT; INSERT OR REPLACE apaga a linha antiga (e dispara o CASCADE). Exclusão lógica preserva o histórico.`},{type:`callout`,tone:`english`,text:`- **DDL / DML**: definição / manipulação de dados
- **constraint / to violate a constraint**: restrição / violar uma restrição
- **primary key, foreign key, composite key**: chave primária, estrangeira, composta
- **natural key / surrogate key**: chave natural / substituta
- **cascade delete**: exclusão em cascata
- **soft delete**: exclusão lógica
- **upsert**: inserir ou atualizar

Frase típica de entrevista: *"I'd enforce uniqueness with a UNIQUE constraint in the database, not just a check in the application: two concurrent requests can both pass the check and insert duplicates."*

Frase típica de documentação: *"Foreign key constraints are disabled by default, so they must be enabled separately for each database connection."*`,title:`English corner`}]}],cards:[{id:`l7-restricoes-dml#1`,front:`Por que pôr as regras (CPF único, preço ≥ 0) no banco, e não só no formulário?`,back:`Porque o banco confere toda escrita, venha de onde vier, e porque checar no programa antes de inserir tem corrida: duas requisições simultâneas podem passar pela checagem e inserir duplicatas.`},{id:`l7-restricoes-dml#2`,front:`O que acontece com CHECK (preco >= 0) quando o preço é NULL? Como obrigar o valor?`,back:`A linha passa: o CHECK só recusa quando a expressão dá falso, e com NULL ela não dá falso. Para obrigar, junte NOT NULL.`},{id:`l7-restricoes-dml#3`,front:`O que é preciso fazer no SQLite para as chaves estrangeiras valerem?`,back:`Rodar PRAGMA foreign_keys = ON em cada conexão, logo depois de conectar e fora de transação (com uma transação aberta, o PRAGMA não faz nada).`},{id:`l7-restricoes-dml#4`,front:`O que fazem ON DELETE RESTRICT, CASCADE e SET NULL?`,back:`RESTRICT (e o padrão NO ACTION) recusa apagar a mãe que tem filhas; CASCADE apaga as filhas junto; SET NULL põe NULL na chave estrangeira das filhas.`},{id:`l7-restricoes-dml#5`,front:`Chave natural ou substituta como chave primária: qual a recomendação usual, e por quê?`,back:`Id substituto como chave primária e UNIQUE na chave natural: a natural (CPF, placa) pode mudar ou ser corrigida, e a chave primária é copiada em todas as chaves estrangeiras.`},{id:`l7-restricoes-dml#6`,front:`Quais são os três passos do ritual de um UPDATE ou DELETE?`,back:`Rodar antes um SELECT com o mesmo WHERE e contar as linhas; executar o comando com esse WHERE; conferir rowcount (ou RETURNING) contra a contagem.`},{id:`l7-restricoes-dml#7`,front:`Por que INSERT OR REPLACE é perigoso, e o que usar no lugar?`,back:`Ele apaga a linha antiga e insere outra: colunas não informadas voltam ao padrão e, com ON DELETE CASCADE, as filhas são apagadas. Use INSERT ... ON CONFLICT (...) DO UPDATE.`},{id:`l7-restricoes-dml#8`,front:`Por que guardar CEP e CPF como TEXT?`,back:`Não são quantidades: como número, perdem o zero à esquerda (01310100 vira 1310100), e ninguém faz conta com eles.`}]};export{e as default};
//# sourceMappingURL=l7-restricoes-dml-TMMk8nXE.js.map