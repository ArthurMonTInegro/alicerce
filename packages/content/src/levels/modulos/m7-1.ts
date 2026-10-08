/** Lições adicionais do módulo m7-1 (modelo relacional e sql). */
import type { Lesson } from '../../types.ts';
import { code, dedent, deep, english, lesson, md, py, t, tip, trace, warn } from '../../helpers.ts';

/* ------------------------------------------------------------------ */
/* Tabelas com regras: restrições, INSERT, UPDATE e DELETE             */
/* ------------------------------------------------------------------ */

const SETUP_MERCADINHO = dedent(`
  CREATE TABLE produtos (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, categoria TEXT NOT NULL, preco_centavos INTEGER NOT NULL CHECK (preco_centavos >= 0));
  INSERT INTO produtos VALUES
    (1, 'Banana prata (kg)', 'hortifruti', 599),
    (2, 'Alface crespa', 'hortifruti', 299),
    (3, 'Tomate (kg)', 'hortifruti', 899),
    (4, 'Cheiro-verde', 'hortifruti', 250),
    (5, 'Arroz 5 kg', 'mercearia', 2899),
    (6, 'Sal 1 kg', 'mercearia', 349),
    (7, 'Limão taiti (kg)', 'hortifruti', 500),
    (8, 'Cebola (kg)', 'hortifruti', 479);
`);

/** Ferramentas dos testes do esquema da operadora: banco novo a cada teste, com chaves estrangeiras ligadas. */
const OPERADORA_AJUDA = dedent(`
  import sqlite3

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
`);

/** Ferramentas dos testes do desafio do catálogo. */
const CATALOGO_AJUDA = dedent(`
  import sqlite3

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
`);

const restricoes = lesson({
  id: 'l7-restricoes-dml',
  moduleId: 'm7-1',
  title: 'Tabelas com regras: restrições, INSERT, UPDATE e DELETE',
  titleEn: 'Tables with rules: constraints, INSERT, UPDATE and DELETE',
  summary:
    'Criar tabelas com CREATE TABLE e pôr as regras do negócio no próprio banco (NOT NULL, UNIQUE, CHECK, DEFAULT, chave primária, composta e estrangeira com ON DELETE), escolher tipos no SQLite e no PostgreSQL, e alterar dados com INSERT, UPDATE, DELETE, UPSERT e RETURNING seguindo o ritual de conferir antes e depois.',
  minutes: 45,
  objectives: [
    'Escrever um CREATE TABLE com tipos adequados e as restrições NOT NULL, UNIQUE, CHECK e DEFAULT, sabendo exatamente o que cada uma recusa (e o que deixa passar)',
    'Escolher entre chave natural e substituta, usar chave composta e declarar chaves estrangeiras com a ação ON DELETE certa, ligando-as no SQLite',
    'Inserir, atualizar e remover linhas com INSERT, UPDATE e DELETE, conferindo antes com um SELECT e depois com rowcount ou RETURNING',
    'Usar UPSERT (ON CONFLICT) e exclusão lógica, e explicar por que INSERT OR REPLACE pode apagar dados relacionados',
  ],
  skills: ['bd-sql'],
  terms: [
    t('linguagem de definição de dados', 'data definition language (DDL)', 'A parte do SQL que cria e muda a estrutura do banco: CREATE, ALTER e DROP.', 'Schema changes are written as DDL statements such as CREATE TABLE and ALTER TABLE.'),
    t('linguagem de manipulação de dados', 'data manipulation language (DML)', 'A parte do SQL que lê e altera linhas: SELECT, INSERT, UPDATE e DELETE.'),
    t('restrição', 'constraint', 'Regra declarada na tabela que o banco confere em toda escrita; a escrita que a viola é recusada.', 'sqlite3.IntegrityError: UNIQUE constraint failed: clientes.cpf'),
    t('afinidade de tipo', 'type affinity', 'No SQLite, o tipo declarado de uma coluna é uma preferência: o valor é convertido quando dá e guardado como veio quando não dá.'),
    t('chave natural', 'natural key', 'Chave que já existe no mundo real, como CPF, placa ou ISBN.'),
    t('chave substituta', 'surrogate key', 'Identificador criado pelo próprio sistema, sem significado fora dele (um id numérico).', 'We use a surrogate key and keep a UNIQUE constraint on the natural key.'),
    t('chave composta', 'composite key', 'Chave formada por mais de uma coluna; o que não pode se repetir é a combinação.'),
    t('integridade referencial', 'referential integrity', 'Garantia de que toda chave estrangeira aponta para uma linha que existe.'),
    t('ação referencial', 'referential action', 'O que acontece com as linhas filhas quando a linha mãe é apagada ou tem a chave alterada: NO ACTION, RESTRICT, CASCADE, SET NULL.', 'ON DELETE CASCADE removes the child rows automatically when the parent row is deleted.'),
    t('inserir ou atualizar', 'upsert', 'Comando que insere a linha ou, se a chave já existe, atualiza a existente.', 'INSERT ... ON CONFLICT (sku) DO UPDATE SET preco = excluded.preco'),
    t('exclusão lógica', 'soft delete', 'Marcar a linha como inativa (ativo = 0, excluido_em = data) em vez de apagá-la, para preservar o histórico.'),
  ],
  stages: {
    conceito: [
      md(`
        Até aqui você consultou um banco pronto. Nesta lição você constrói um e muda o que tem dentro. O SQL tem duas metades: a {{linguagem de definição de dados|data definition language (DDL)}} (\`CREATE TABLE\`, \`ALTER TABLE\`, \`DROP TABLE\`) descreve a estrutura, e a {{linguagem de manipulação de dados|data manipulation language (DML)}} (\`SELECT\`, \`INSERT\`, \`UPDATE\`, \`DELETE\`) lê e altera as linhas.

        Uma tabela bem definida não é só um lugar onde cabem linhas: ela carrega as regras do negócio. "Não existem dois clientes com o mesmo CPF", "preço não é negativo", "todo pedido é de um cliente que existe". Essas regras são {{restrições|constraints}}, e o banco as confere em **toda** escrita, venha ela do site, do aplicativo, do script que importa a planilha do fornecedor ou de alguém digitando no terminal às 23h de sexta. A escrita que viola uma restrição é recusada inteira, com um erro que diz qual regra foi quebrada.

        Por que não basta validar no formulário? Primeiro, porque o formulário não é o único caminho até o banco. Segundo, porque a checagem feita pelo programa tem uma corrida: duas requisições chegam juntas, as duas perguntam "esse CPF já existe?", as duas ouvem "não" e as duas inserem. Só a restrição \`UNIQUE\`, conferida pelo próprio banco no momento da escrita, fecha essa porta. Validar no programa continua útil para mostrar uma mensagem amigável; a **garantia** mora no banco.

        A outra metade da lição é escrever. \`INSERT\`, \`UPDATE\` e \`DELETE\` não têm Ctrl+Z, e um \`WHERE\` esquecido muda a tabela inteira. Você vai aprender o ritual que profissionais seguem: conferir antes, mudar, conferir depois.
      `),
    ],
    explicacao: [
      md(`
        ### Anatomia de um CREATE TABLE
        Uma loja online com clientes, pedidos e os itens de cada pedido. Cada coluna tem nome, tipo e, depois, as restrições dela; restrições que envolvem várias colunas, como a chave composta de \`itens_pedido\`, vêm no fim da lista, separadas por vírgula.
      `),
      code('sql', `
        CREATE TABLE clientes (
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
        );
      `, 'O esquema da loja usado no resto da lição.'),
      {
        type: 'table',
        head: ['Restrição', 'O que o banco recusa', 'Cuidado'],
        rows: [
          ['`NOT NULL`', 'linha sem valor na coluna', 'é a única que obriga a ter valor; as outras deixam NULL passar'],
          ['`UNIQUE`', 'valor repetido na coluna (ou combinação repetida, em `UNIQUE (a, b)`)', 'NULL não conta como repetido: vários clientes podem ficar com `email` NULL'],
          ['`CHECK (expressão)`', 'linha em que a expressão dá falso', 'com NULL, `preco >= 0` não dá nem verdadeiro nem falso, e a linha **passa**; junte com NOT NULL'],
          ['`DEFAULT valor`', 'nada: é o valor usado quando o INSERT não cita a coluna', 'um NULL escrito explicitamente no INSERT continua NULL'],
          ['`PRIMARY KEY`', 'valor repetido e, pelo padrão SQL, NULL', 'só uma por tabela; no SQLite, por um erro histórico, uma chave que não seja `INTEGER PRIMARY KEY` aceita NULL se você não escrever NOT NULL'],
          ['`REFERENCES t(col)`', 'valor que não existe na coluna referenciada', 'NULL passa (a linha fica sem mãe); no SQLite, só vale com `PRAGMA foreign_keys = ON`'],
        ],
        caption: 'O que cada restrição garante, e o buraco que cada uma deixa se usada sozinha.',
      },
      tip(`
        Dê nome às restrições importantes: \`CONSTRAINT preco_nao_negativo CHECK (preco_centavos >= 0)\`. Sem nome, o erro mostra a expressão (\`CHECK constraint failed: preco_centavos >= 0\`); com nome, mostra \`CHECK constraint failed: preco_nao_negativo\`, que dá para traduzir numa mensagem amigável para o usuário.
      `, 'Restrições com nome'),
      md(`
        ### Tipos: o que cada dado vira
      `),
      {
        type: 'table',
        head: ['Dado', 'No SQLite', 'No PostgreSQL', 'Por quê'],
        rows: [
          ['ids, quantidades', '`INTEGER`', '`integer` ou `bigint`', 'contas exatas'],
          ['dinheiro', '`INTEGER` em centavos', '`numeric(12, 2)` ou centavos em `bigint`', 'o float binário não representa 0,10 exatamente, e as somas acumulam erros de arredondamento'],
          ['texto', '`TEXT`', '`text` ou `varchar(n)`', '—'],
          ['data e hora', '`TEXT` no formato ISO 8601 (`2026-10-07 14:30:00`)', '`date`, `timestamp`, `timestamptz`', 'o SQLite não tem tipo de data; o formato ISO ordena certo como texto e é o que as funções de data dele entendem'],
          ['sim ou não', '`INTEGER` 0 ou 1, com `CHECK (ativo IN (0, 1))`', '`boolean`', 'o SQLite não tem tipo booleano'],
          ['CPF, CEP, telefone', '`TEXT`', '`text`', 'não são quantidades: como número, o CEP 01310100 vira 1310100, e ninguém soma CPFs'],
        ],
      },
      md(`
        No SQLite, o tipo declarado é uma {{afinidade de tipo|type affinity}}, uma preferência. Numa coluna \`INTEGER\`, o texto \`'42'\` é convertido para o número 42 (e \`'01310100'\` vira 1310100, sem o zero), mas o texto \`'abc'\` é guardado como texto, **sem erro nenhum**. Desde a versão 3.37 (2021), uma tabela criada com a palavra \`STRICT\` no fim, \`CREATE TABLE t (...) STRICT\`, recusa valores do tipo errado. O PostgreSQL sempre recusa: inserir \`'abc'\` numa coluna \`integer\` dá erro.

        ### Chaves
        A **chave primária** identifica cada linha: não repete e não é nula. No SQLite, uma coluna declarada exatamente como \`INTEGER PRIMARY KEY\` é um apelido para o número interno da linha (o *rowid*): se o INSERT não informa o id, o banco usa o maior id da tabela mais 1. Isso quer dizer que, se você apagar a última linha, o id dela pode ser reaproveitado; com \`INTEGER PRIMARY KEY AUTOINCREMENT\`, nunca é (a um pequeno custo extra). No PostgreSQL, o equivalente é \`id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY\`.

        Qual coluna escolher como chave? Um CPF já identifica a pessoa, então por que inventar um id?
      `),
      {
        type: 'table',
        head: ['', 'Chave natural (CPF, placa, ISBN)', 'Chave substituta (id gerado)'],
        rows: [
          ['Significado', 'existe fora do sistema', 'nenhum: só identifica a linha'],
          ['Pode mudar?', 'pode: CPF digitado errado, placa convertida para o padrão Mercosul, e-mail novo', 'nunca precisa mudar'],
          ['Onde se espalha', 'é copiada em toda chave estrangeira que aponta para ela: se mudar, muda em todas as tabelas, e um dado pessoal fica espalhado pelo banco', 'só um número nas chaves estrangeiras'],
          ['Impede duplicata do mundo real?', 'sim', 'sozinha, não: a mesma pessoa pode ser cadastrada duas vezes com ids diferentes'],
        ],
        caption: 'O meio-termo usual: {{chave substituta|surrogate key}} como PRIMARY KEY **e** UNIQUE na {{chave natural|natural key}}. É o que a tabela clientes faz com o CPF.',
      },
      md(`
        Uma {{chave composta|composite key}} usa várias colunas: em \`itens_pedido\`, a chave é o par \`(pedido_id, sku)\`, então o mesmo produto não aparece duas vezes no mesmo pedido (para mudar a quantidade, faz-se UPDATE). Repare que a tabela \`matriculas\` do banco da escola, que você consultou na lição anterior, **não tem** chave: nada impede matricular Ana duas vezes em Algoritmos, e a média dela contaria a nota em dobro. Um \`PRIMARY KEY (aluno_id, disciplina_id)\` resolveria.

        A **chave estrangeira** (\`REFERENCES\`) garante a {{integridade referencial|referential integrity}}: \`pedidos.cliente_id\` só aceita ids que existem em \`clientes\`. E ela decide o que acontece quando alguém tenta apagar a linha mãe, com uma {{ação referencial|referential action}}:
      `),
      {
        type: 'table',
        head: ['Ação', 'Ao apagar uma linha mãe que tem filhas', 'Quando usar'],
        rows: [
          ['`NO ACTION` (o padrão) ou `RESTRICT`', 'recusa o DELETE', 'a filha não pode sumir junto: os pedidos de um cliente são histórico e base de nota fiscal'],
          ['`CASCADE`', 'apaga as filhas junto', 'a filha é parte da mãe: os itens de um pedido'],
          ['`SET NULL`', 'põe NULL na chave estrangeira das filhas (a coluna precisa aceitar NULL)', 'a ligação é opcional: o vendedor que atendeu um pedido foi removido do cadastro'],
        ],
        caption: 'Também existe ON UPDATE, para quando a chave da mãe muda; com chaves substitutas, que não mudam, ele quase nunca importa. NO ACTION e RESTRICT diferem só no momento da conferência.',
      },
      warn(`
        No SQLite, as chaves estrangeiras vêm **desligadas**, por compatibilidade com programas antigos: sem \`PRAGMA foreign_keys = ON\`, um pedido do cliente 999 entra em silêncio. O PRAGMA vale por conexão, então rode-o logo depois de conectar, toda vez. E rode-o fora de transação: o módulo \`sqlite3\` do Python abre uma transação sozinho antes de um INSERT, UPDATE ou DELETE, e um PRAGMA executado com essa transação aberta simplesmente não faz nada. No PostgreSQL, chaves estrangeiras valem sempre.
      `, 'Chaves estrangeiras no SQLite'),
      md(`
        ### Escrever: INSERT, UPDATE e DELETE
      `),
      code('sql', `
        -- INSERT: sempre com a lista de colunas; as que ficarem de fora recebem o DEFAULT (ou NULL)
        INSERT INTO clientes (cpf, nome, uf) VALUES
          ('12345678901', 'Ana', 'SP'),
          ('98765432100', 'Bruno', 'RJ');

        -- UPDATE: o SET pode usar o valor atual da própria linha
        UPDATE pedidos SET status = 'pago' WHERE id = 42;
        UPDATE produtos SET preco_centavos = preco_centavos + 50 WHERE categoria = 'cafe';

        -- DELETE: apaga linhas; a tabela continua existindo, vazia ou não
        DELETE FROM pedidos WHERE status = 'cancelado' AND id < 1000;

        -- DROP TABLE: apaga a tabela inteira, estrutura e dados
        DROP TABLE IF EXISTS importacao_temporaria;
      `),
      md(`
        - **INSERT com lista de colunas.** \`INSERT INTO clientes VALUES (...)\`, sem a lista, depende da ordem das colunas no CREATE TABLE e quebra no dia em que alguém acrescentar uma coluna. \`INSERT INTO destino (...) SELECT ...\` copia o resultado de uma consulta para outra tabela.
        - **O SET vê a linha antiga.** Todas as expressões do SET usam os valores de antes da mudança: \`SET a = b, b = a\` troca os dois valores no SQLite e no PostgreSQL. (O MySQL avalia as atribuições da esquerda para a direita, e lá isso não troca nada.)
        - **Um comando é tudo ou nada.** Se um UPDATE que mexe em 1 000 linhas violar uma restrição na 900ª, as 899 anteriores são desfeitas e o comando inteiro falha. No SQLite, esse é o comportamento padrão diante de uma violação (ABORT). Juntar **vários** comandos num bloco tudo ou nada é assunto do módulo de transações.

        ### O ritual: conferir, mudar, conferir
        1. **Conferir antes.** Escreva o SELECT com exatamente o mesmo WHERE e veja quais e quantas linhas vêm. Se vierem 3 000 quando você esperava 3, o WHERE está errado, e você descobriu isso sem estrago.
        2. **Mudar.** Troque \`SELECT ... FROM\` por \`UPDATE ... SET\` ou \`DELETE FROM\`, sem tocar no WHERE.
        3. **Conferir depois.** O banco informa quantas linhas foram afetadas (\`cursor.rowcount\` no Python, \`UPDATE 3\` no terminal do PostgreSQL), e esse número tem de bater com o passo 1. Com \`RETURNING\` no fim, o próprio UPDATE, INSERT ou DELETE devolve as linhas que mexeu, já com os valores novos (SQLite 3.35+ e PostgreSQL; o MySQL não tem).

        Em produção, acrescente ao ritual uma transação (para poder desfazer, no módulo de transações) e um backup recente.
      `),
      code('sql', `
        -- 1. conferir
        SELECT sku, nome, preco_centavos FROM produtos WHERE categoria = 'cafe' AND ativo = 1;

        -- 2. mudar, com o mesmo WHERE, e 3. ver o que mudou
        UPDATE produtos SET preco_centavos = preco_centavos + 50
        WHERE categoria = 'cafe' AND ativo = 1
        RETURNING sku, nome, preco_centavos;
      `),
      md(`
        ### UPSERT: inserir ou atualizar
        Importações vivem de "se o produto é novo, insere; se já existe, atualiza o preço". Fazer isso com um SELECT seguido de INSERT ou UPDATE reabre a corrida do começo da lição. O {{UPSERT|upsert}} faz tudo num comando:
      `),
      code('sql', `
        INSERT INTO produtos (sku, nome, preco_centavos) VALUES ('CAFE500', 'Café 500 g', 1990)
        ON CONFLICT (sku) DO UPDATE SET nome = excluded.nome, preco_centavos = excluded.preco_centavos;

        -- ou: se já existe, deixa como está
        INSERT INTO produtos (sku, nome, preco_centavos) VALUES ('CAFE500', 'Café 500 g', 1990)
        ON CONFLICT (sku) DO NOTHING;
      `),
      md(`
        \`excluded\` é a linha que você tentou inserir. A coluna do \`ON CONFLICT\` precisa ser a PRIMARY KEY ou ter UNIQUE. Essa sintaxe vale no SQLite (3.24+) e no PostgreSQL (9.5+); o MySQL usa \`INSERT ... ON DUPLICATE KEY UPDATE\`.
      `),
      warn(`
        O SQLite também tem \`INSERT OR REPLACE\` (ou só \`REPLACE\`), que parece um upsert, mas não é: quando a chave já existe, ele **apaga** a linha antiga e insere uma nova. As colunas que você não informou voltam ao DEFAULT ou a NULL, e, se alguma chave estrangeira aponta para a linha com ON DELETE CASCADE, as linhas filhas são apagadas junto, mesmo que a linha nova tenha a mesma chave. O segundo programa da etapa Código mostra os itens de venda de um produto sumindo assim. Para atualizar, use \`ON CONFLICT ... DO UPDATE\`.
      `, 'REPLACE não é UPDATE'),
      md(`
        ### Apagar ou desativar?
        Um produto que já foi vendido aparece em notas fiscais e relatórios; apagá-lo quebraria esse histórico (e a chave estrangeira nem deixaria). A saída comum é a {{exclusão lógica|soft delete}}: uma coluna \`ativo\` (ou \`excluido_em\`, com a data) que o sistema marca em vez de apagar.

        - **Ganhos:** o histórico continua íntegro, e dá para desfazer.
        - **Custos:** toda consulta do dia a dia precisa lembrar do \`WHERE ativo = 1\`, e o UNIQUE continua contando as linhas inativas (um SKU desativado impede cadastrar outro produto com o mesmo SKU).
        - **Limite:** quando uma pessoa pede a eliminação dos dados pessoais dela com base na LGPD, marcar como inativo não é eliminar; é preciso apagar ou anonimizar de fato, ressalvados os dados que a lei obriga a guardar.
      `),
      deep(`
        \`ALTER TABLE\` muda a estrutura sem recriar a tabela. No SQLite ele faz pouco: renomear a tabela (\`RENAME TO\`) ou uma coluna (\`RENAME COLUMN\`, 3.25+), acrescentar uma coluna (\`ADD COLUMN\`) e remover uma (\`DROP COLUMN\`, 3.35+). A coluna acrescentada não pode ser PRIMARY KEY nem UNIQUE e, se for NOT NULL, precisa de um DEFAULT não nulo, que as linhas existentes recebem.

        Para pôr um CHECK ou uma chave estrangeira numa coluna que já existe, o caminho que a documentação do SQLite descreve é recriar: criar a tabela nova com as restrições, copiar com \`INSERT INTO nova (...) SELECT ... FROM antiga\`, apagar a antiga e renomear a nova. O PostgreSQL aceita \`ALTER TABLE ... ADD CONSTRAINT\` direto e confere as linhas que já existem.

        Em projetos reais, cada mudança de esquema vira um arquivo de **migração** versionado junto com o código (Alembic, migrations do Django, Flyway), para que todos os bancos, o seu, o dos testes e o de produção, passem pelas mesmas mudanças na mesma ordem.
      `, 'Mudar uma tabela que já existe'),
    ],
    exemplo: [
      md(`
        A loja da explicação, com \`PRAGMA foreign_keys = ON\`, recebe estes comandos, um depois do outro. Antes de olhar a coluna do resultado, tente prever cada um.
      `),
      {
        type: 'table',
        head: ['#', 'Comando', 'Resultado', 'Por quê'],
        rows: [
          ['1', "`INSERT INTO clientes (cpf, nome, uf) VALUES ('12345678901', 'Ana', 'SP')`", 'ok: Ana ganha o id 1', 'o id é gerado; `criado_em` recebe o DEFAULT; `email` fica NULL'],
          ['2', "o mesmo CPF, com nome `'Bruno'` e uf `'RJ'`", '`UNIQUE constraint failed: clientes.cpf`', 'CPF repetido'],
          ['3', "CPF `'123.456.789-01'`", '`CHECK constraint failed: length(cpf) = 11`', 'com a máscara são 14 caracteres; guarde só os dígitos'],
          ['4', "CPF `'98765432100'`, uf `'Rio de Janeiro'`", '`CHECK constraint failed: length(uf) = 2`', 'UF é a sigla'],
          ['5', "o mesmo, com uf `'RJ'`", 'ok: Bruno ganha o id 2', '—'],
          ['6', '`INSERT INTO pedidos (cliente_id, total_centavos) VALUES (7, 5000)`', '`FOREIGN KEY constraint failed`', 'não existe cliente 7; sem o PRAGMA, o SQLite aceitaria em silêncio'],
          ['7', 'o mesmo, com `cliente_id` 1', 'ok: pedido 1, da Ana', '`status` recebe o DEFAULT `aberto`'],
          ['8', "`INSERT INTO itens_pedido (pedido_id, sku, qtd) VALUES (1, 'CAFE500', 2), (1, 'ACUCAR1K', 1)`", 'ok: 2 linhas', 'um INSERT pode levar várias linhas'],
          ['9', "`INSERT INTO itens_pedido (pedido_id, sku, qtd) VALUES (1, 'CAFE500', 1)`", '`UNIQUE constraint failed: itens_pedido.pedido_id, itens_pedido.sku`', 'a chave composta impede o mesmo produto duas vezes no pedido'],
          ['10', "`UPDATE pedidos SET status = 'entregue' WHERE id = 1`", "`CHECK constraint failed: status IN ('aberto', 'pago', 'enviado', 'cancelado')`", "`'entregue'` não está na lista"],
          ['11', '`DELETE FROM clientes WHERE id = 1`', '`FOREIGN KEY constraint failed`', 'Ana tem um pedido, e a ação é RESTRICT'],
          ['12', '`DELETE FROM pedidos WHERE id = 1`', 'ok: 1 linha', 'os 2 itens do pedido vão junto (CASCADE)'],
          ['13', '`DELETE FROM clientes WHERE id = 1`', 'ok: 1 linha', 'sem pedidos, nada mais segura a Ana'],
        ],
        caption: 'Treze comandos, seis recusas. As mensagens são as do SQLite.',
      },
      md(`
        Repare em três coisas:

        1. Cada erro diz qual restrição foi violada. É por isso que vale a pena dar nome às restrições importantes.
        2. Nenhum comando recusado deixou rastro: depois de uma recusa, a tabela está exatamente como estava antes dela.
        3. Quem decidiu o destino dos itens no passo 12 e do cliente no passo 11 foi o **esquema**, e não o programa que mandou o DELETE. Qualquer outro programa que use este banco vai encontrar as mesmas regras.

        Agora o ritual, num reajuste de 10% nos produtos de hortifrúti que custam menos de R$ 5,00. A conferência:
      `),
      code('sql', `
        SELECT id, nome, preco_centavos, ROUND(preco_centavos * 1.10) AS novo
        FROM produtos
        WHERE categoria = 'hortifruti' AND preco_centavos < 500;
        -- 3 linhas: Alface 299 → 329, Cheiro-verde 250 → 275, Cebola 479 → 527
      `),
      md(`
        Três linhas, como esperado (o limão, que custa exatamente 500, fica de fora por causa do \`<\`). Só então o UPDATE, com o mesmo WHERE, e a conferência do número de linhas afetadas:
      `),
      code('sql', `
        UPDATE produtos SET preco_centavos = ROUND(preco_centavos * 1.10)
        WHERE categoria = 'hortifruti' AND preco_centavos < 500
        RETURNING id, preco_centavos;
        -- 3 linhas devolvidas: bate com a conferência
      `),
      md(`
        \`ROUND\` devolve um número real (329.0), mas a coluna é \`INTEGER\`, e a afinidade de tipo do SQLite guarda 329 como inteiro. O exercício de SQL desta lição usa exatamente essa tabela.
      `),
    ],
    codigo: [
      py(`
        import sqlite3

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
        print(con.execute("SELECT id, nome, criado_em FROM clientes").fetchall())
      `, { caption: 'Troque ON DELETE RESTRICT por CASCADE, ou apague a linha do PRAGMA, e rode de novo: compare o que muda.' }),
      py(`
        import sqlite3

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
        print("itens de venda depois do REPLACE:", con.execute("SELECT COUNT(*) FROM itens_venda").fetchone()[0])
      `, { caption: 'O mesmo sku, o mesmo produto, e as duas vendas do café sumiram. Troque o REPLACE pelo upsert e compare.' }),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e7-dml-1',
          kind: 'mcq',
          prompt: 'Na tabela de clientes de uma operadora de internet, o e-mail é **opcional**, mas dois clientes não podem ter o mesmo e-mail. Qual declaração da coluna atende exatamente a isso?',
          difficulty: 'facil',
          skills: ['bd-sql'],
          hints: [
            'São duas exigências: pode ficar vazio, e não pode repetir. Qual restrição cuida de cada uma?',
            'Como o UNIQUE trata dois clientes com e-mail NULL?',
          ],
          explanation: 'UNIQUE recusa valores repetidos e não considera dois NULL como repetidos, então quem não tem e-mail não atrapalha ninguém. NOT NULL tornaria o e-mail obrigatório; PRIMARY KEY faria do e-mail a identidade do cliente, que precisa existir e não deveria mudar; e um CHECK (email IS NOT NULL) só obriga a preencher, sem impedir repetição.',
          options: [
            { text: '`email TEXT UNIQUE`', correct: true, feedback: 'Isso: UNIQUE barra o repetido, e NULL não conta como repetido, então o campo continua opcional.' },
            { text: '`email TEXT NOT NULL UNIQUE`', feedback: 'O UNIQUE está certo, mas o NOT NULL torna o e-mail obrigatório, e o enunciado diz que ele é opcional.' },
            { text: '`email TEXT PRIMARY KEY`', feedback: 'A chave primária é a identidade da linha: precisa existir (pelo padrão SQL, não aceita NULL) e não deveria mudar. E-mail é opcional e muda; use um id como chave e UNIQUE no e-mail.' },
            { text: '`email TEXT CHECK (email IS NOT NULL)`', feedback: 'Esse CHECK só obriga a preencher (o mesmo que NOT NULL) e não impede dois clientes com o mesmo e-mail.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e7-dml-2',
          kind: 'fill',
          lang: 'sql',
          prompt: dedent(`
            Complete a tabela \`matriculas\` da escola para que:

            - quando um aluno for apagado do cadastro, as matrículas dele sejam apagadas junto;
            - a nota fique entre 0 e 10, podendo ficar vazia enquanto a disciplina não terminou;
            - a combinação aluno + disciplina identifique cada matrícula (seja a chave da tabela), impedindo a mesma matrícula duas vezes.
          `),
          difficulty: 'intermediario',
          skills: ['bd-sql'],
          hints: [
            'Qual palavra liga uma coluna à chave de outra tabela?',
            'Das ações de ON DELETE, qual apaga as filhas junto com a mãe?',
            'Qual restrição recusa uma linha em que uma expressão dá falso? E ela recusa uma nota NULL?',
            'Uma chave formada por duas colunas é declarada no fim da lista, com as colunas entre parênteses.',
          ],
          explanation: 'REFERENCES cria a chave estrangeira, e ON DELETE CASCADE apaga as matrículas quando o aluno é apagado. CHECK (nota BETWEEN 0 AND 10) recusa notas fora da faixa e deixa passar NULL, porque NULL BETWEEN 0 AND 10 não dá falso: é exatamente o "pode ficar vazia". PRIMARY KEY (aluno_id, disciplina_id) é a chave composta: a mesma dupla não pode aparecer duas vezes. Um UNIQUE (aluno_id, disciplina_id) também impediria a repetição, mas o enunciado pede que a combinação seja a chave da tabela.',
          template: dedent(`
            CREATE TABLE matriculas (
              aluno_id      INTEGER NOT NULL ___ alunos(id) ON DELETE ___,
              disciplina_id INTEGER NOT NULL REFERENCES disciplinas(id),
              nota          REAL ___ (nota BETWEEN 0 AND 10),
              ___ (aluno_id, disciplina_id)
            );
          `),
          blanks: [
            ['REFERENCES', 'references'],
            ['CASCADE', 'cascade'],
            ['CHECK', 'check'],
            ['PRIMARY KEY', 'primary key'],
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e7-dml-3',
          kind: 'predict',
          lang: 'python',
          prompt: 'O que este programa imprime? Atenção ao saldo de Caio e ao segundo UPDATE, que não tem WHERE.',
          difficulty: 'intermediario',
          skills: ['bd-sql'],
          hints: [
            'Qual é o saldo de Caio logo depois do INSERT, que não informa o saldo?',
            'Quantas linhas satisfazem saldo >= 50 no primeiro UPDATE?',
            'No segundo UPDATE, alguma linha ficaria negativa? O que acontece com as linhas que não ficariam?',
          ],
          explanation: 'Caio entra com saldo 0, o DEFAULT. O primeiro UPDATE só atinge Ana (100 ≥ 50), que fica com 50: rowcount é 1. O segundo UPDATE, sem WHERE, tenta tirar 40 de todos: Ana iria a 10, mas Bia iria a −10 e Caio a −40, violando o CHECK. Um comando que viola uma restrição é desfeito por inteiro, então nem a Ana muda. O saldo final é o mesmo de antes do segundo UPDATE.',
          code: dedent(`
            import sqlite3

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
            print(con.execute("SELECT titular, saldo FROM contas ORDER BY id").fetchall())
          `),
          answer: "1\nrecusado\n[('Ana', 50), ('Bia', 30), ('Caio', 0)]",
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e7-dml-4',
          kind: 'sql',
          prompt: dedent(`
            O mercadinho vai reajustar em 10% os produtos da categoria \`'hortifruti'\` que custam **menos** de R$ 6,00. Antes de rodar o UPDATE, escreva o SELECT de conferência: \`id\`, \`nome\`, \`preco_centavos\` (o preço atual) e \`novo\` (o preço reajustado, arredondado para centavos inteiros), só das linhas que o UPDATE vai atingir, em ordem de \`id\`.
          `),
          difficulty: 'intermediario',
          skills: ['bd-sql'],
          hints: [
            'O WHERE da conferência é o mesmo que o UPDATE vai usar. Quais são as duas condições?',
            'R$ 6,00 em centavos é quanto? "Menos de" inclui o próprio valor?',
            'O preço novo é uma expressão calculada no SELECT, com um apelido (AS). Que função arredonda?',
          ],
          explanation: "SELECT id, nome, preco_centavos, ROUND(preco_centavos * 1.10) AS novo FROM produtos WHERE categoria = 'hortifruti' AND preco_centavos < 600 ORDER BY id; — a conferência usa exatamente o WHERE do UPDATE e mostra o antes e o depois de cada linha. Sem ROUND, 299 × 1,10 daria 328.90000000000003; sem o filtro de categoria, o sal (349) entraria por engano; com <= 600, nada muda aqui, mas um produto de exatamente R$ 6,00 entraria sem dever.",
          setup: SETUP_MERCADINHO,
          starter: "SELECT id, nome, preco_centavos FROM produtos WHERE categoria = 'hortifruti';",
          solution: "SELECT id, nome, preco_centavos, ROUND(preco_centavos * 1.10) AS novo FROM produtos WHERE categoria = 'hortifruti' AND preco_centavos < 600 ORDER BY id;",
          ordered: true,
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e7-dml-5',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Uma operadora de internet guarda planos e assinantes. Complete o DDL em \`SCHEMA\` (as colunas já estão lá) para que **o banco** recuse tudo o que fere estas regras:

            **planos**
            - \`id\`: inteiro, chave primária gerada pelo banco;
            - \`nome\`: obrigatório e sem repetição;
            - \`velocidade_mbps\`: inteiro obrigatório, maior que 0;
            - \`preco_centavos\`: inteiro obrigatório, maior ou igual a 0 (existe plano de cortesia).

            **assinantes**
            - \`id\`: inteiro, chave primária gerada pelo banco;
            - \`cpf\`: texto obrigatório, sem repetição, com exatamente 11 caracteres (só os dígitos);
            - \`nome\`: obrigatório;
            - \`cep\`: texto obrigatório com exatamente 8 caracteres;
            - \`plano_id\`: obrigatório, precisa ser um plano que existe, e não se pode apagar um plano que ainda tem assinantes;
            - \`ativo\`: obrigatório, só 0 ou 1, valendo 1 quando o INSERT não informa.

            Os testes criam um banco novo, ligam \`PRAGMA foreign_keys = ON\` e rodam \`executescript(SCHEMA)\`.
          `),
          difficulty: 'intermediario',
          skills: ['bd-sql'],
          hints: [
            'Para cada regra, pergunte: qual restrição recusa exatamente isso? Algumas regras precisam de duas.',
            'Um CHECK (velocidade_mbps > 0) recusa uma velocidade NULL? O que obriga a ter valor?',
            'O tamanho de um texto no SQLite sai da função length(). Por que CPF e CEP precisam ser TEXT, e não INTEGER?',
            'Qual palavra liga plano_id a planos(id)? Entre as ações de ON DELETE, qual recusa apagar a mãe que tem filhas?',
          ],
          explanation: 'Cada regra vira uma restrição: NOT NULL para "obrigatório" (um CHECK sozinho deixa NULL passar), UNIQUE para "sem repetição", CHECK para as faixas e tamanhos, DEFAULT 1 para o valor padrão de ativo, e REFERENCES planos(id) para o plano existir. ON DELETE RESTRICT (ou o padrão, NO ACTION) impede apagar um plano com assinantes; CASCADE apagaria os assinantes junto. CPF e CEP são TEXT porque, numa coluna INTEGER, a afinidade de tipo do SQLite converteria 01310100 em 1310100, e o CHECK de 8 caracteres passaria a recusar um CEP válido.',
          starter: dedent(`
            SCHEMA = """
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
            # acrescente as restrições pedidas no enunciado
          `),
          solution: dedent(`
            SCHEMA = """
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
            """
          `),
          tests: [
            {
              name: 'dados válidos entram, com os valores certos',
              code: OPERADORA_AJUDA + '\n' + dedent(`
                con = _banco()
                pid = _aceita(con, _PLANO, ("Fibra 500", 500, 9990), "um plano válido").lastrowid
                _aceita(con, _PLANO, ("Cortesia", 50, 0), "um plano de preço 0 (cortesia)")
                aid = _aceita(con, _ASSINANTE, ("01234567890", "Ana", "01310100", pid), "um assinante válido").lastrowid
                cpf, cep, ativo = con.execute("SELECT cpf, cep, ativo FROM assinantes WHERE id = ?", (aid,)).fetchone()
                assert ativo == 1, f"quando o INSERT não informa ativo, ele deveria valer 1, mas veio {ativo!r}: falta um DEFAULT"
                assert cep == "01310100", f"o CEP 01310100 voltou do banco como {cep!r}: declare o CEP como TEXT para não perder o zero à esquerda"
                assert cpf == "01234567890", f"o CPF 01234567890 voltou do banco como {cpf!r}: declare o CPF como TEXT"
                _aceita(con, _ASSINANTE_ATIVO, ("98765432100", "Bia", "69005040", pid, 0), "um assinante inativo (ativo = 0)")
              `),
            },
            {
              name: 'campos obrigatórios',
              code: OPERADORA_AJUDA + '\n' + dedent(`
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
                _recusa(con, _ASSINANTE_ATIVO, ("01234567890", "Ana", "01310100", pid, None), "um assinante com ativo NULL", dica)
              `),
            },
            {
              name: 'sem repetição',
              code: OPERADORA_AJUDA + '\n' + dedent(`
                con = _banco()
                pid = _aceita(con, _PLANO, ("Fibra 500", 500, 9990), "um plano válido").lastrowid
                _recusa(con, _PLANO, ("Fibra 500", 600, 10990), "dois planos com o mesmo nome")
                _aceita(con, _ASSINANTE, ("01234567890", "Ana", "01310100", pid), "um assinante válido")
                _recusa(con, _ASSINANTE, ("01234567890", "Ana Souza", "50030230", pid), "dois assinantes com o mesmo CPF")
              `),
            },
            {
              name: 'faixas e tamanhos (CHECK)',
              code: OPERADORA_AJUDA + '\n' + dedent(`
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
              `),
            },
            {
              name: 'chave estrangeira',
              code: OPERADORA_AJUDA + '\n' + dedent(`
                con = _banco()
                p1 = _aceita(con, _PLANO, ("Fibra 500", 500, 9990), "um plano válido").lastrowid
                p2 = _aceita(con, _PLANO, ("Fibra 1 giga", 1000, 14990), "um plano válido").lastrowid
                _recusa(con, _ASSINANTE, ("01234567890", "Ana", "01310100", 999), "um assinante do plano 999, que não existe")
                _aceita(con, _ASSINANTE, ("01234567890", "Ana", "01310100", p1), "um assinante válido")
                _recusa(con, "DELETE FROM planos WHERE id = ?", (p1,), "apagar um plano que ainda tem assinantes", "Qual ação de ON DELETE recusa apagar a mãe que tem filhas? (CASCADE apagaria os assinantes junto.)")
                n = con.execute("SELECT COUNT(*) FROM assinantes").fetchone()[0]
                assert n == 1, f"depois da tentativa de apagar o plano, sobraram {n} assinantes; deveria continuar 1"
                _aceita(con, "DELETE FROM planos WHERE id = ?", (p2,), "apagar um plano sem assinantes")
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
          id: 'e7-dml-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Toda noite, o fornecedor de um mercadinho manda o catálogo **completo** de hoje: uma lista de \`(sku, nome, preco_centavos)\`. Escreva \`sincronizar(con, catalogo)\`, que deixa a tabela \`produtos\` de acordo com o catálogo sem destruir o histórico de vendas. As tabelas (os testes ligam \`PRAGMA foreign_keys = ON\`):

            \`\`\`sql
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
            \`\`\`

            Regras:

            1. **Valide antes de escrever.** Se o catálogo tiver um sku repetido ou um preço negativo, lance \`ValueError\` sem mudar **nada** na tabela.
            2. sku que não está na tabela: insira, ativo.
            3. sku que já está na tabela: se o nome ou o preço mudaram, ou se ele estava inativo, atualize nome e preço e deixe-o ativo. Se nada mudou, não mexa.
            4. sku que está na tabela mas saiu do catálogo: se já foi vendido (aparece em \`itens_venda\`), desative-o (\`ativo = 0\`); se nunca foi vendido, apague-o.
            5. Devolva um dict com quatro contagens: \`inseridos\`, \`atualizados\` (inclui os reativados), \`desativados\` (só os que estavam ativos) e \`removidos\`.

            Exemplo: com a tabela ARROZ5 (2899), CAFE500 (1890), FEIJAO1 (899), OLEO900 (799) e SAL1 (349, inativo), vendas de ARROZ5, OLEO900 e SAL1, e o catálogo ARROZ5 a 2999, CAFE500 a 1890, SAL1 a 349 e o novo ACUCAR1 a 549, o resultado é \`{"inseridos": 1, "atualizados": 2, "desativados": 1, "removidos": 1}\`: ACUCAR1 entra; ARROZ5 muda de preço e SAL1 volta a ficar ativo; OLEO900 sai do catálogo mas tem venda, então é desativado; FEIJAO1 sai e nunca foi vendido, então é apagado. Rodar de novo com o mesmo catálogo não muda nada e devolve tudo zero.
          `),
          difficulty: 'desafio',
          skills: ['bd-sql'],
          hints: [
            'Antes de escrever qualquer linha, o que você precisa saber sobre o catálogo inteiro? E sobre a tabela?',
            'Para decidir entre inserir, atualizar ou não mexer, você precisa do estado atual de cada sku. Uma consulta só, guardada num dict, resolve.',
            'Para saber quem já foi vendido, que consulta em itens_venda dá o conjunto de skus?',
            'O que acontece se você tentar apagar um produto que tem venda, com as chaves estrangeiras ligadas? Como evitar tentar?',
            'Quando é que um produto que saiu do catálogo não deve ser contado como desativado?',
          ],
          explanation: 'Validar primeiro (skus repetidos com um set, preços negativos com any) garante que nada é escrito a partir de um catálogo ruim; validar no meio do caminho deixaria parte das mudanças feitas, e desfazer um lote inteiro é trabalho de transação. Depois, uma consulta carrega o estado atual num dict e outra carrega o conjunto de skus vendidos; cada item do catálogo vira INSERT, UPDATE ou nada, comparando a tupla (nome, preço, ativo) atual com (nome, preço, 1). Os skus que sobraram viram UPDATE ativo = 0 (só se estavam ativos) ou DELETE (só se nunca foram vendidos, senão a chave estrangeira recusaria). Todos os comandos usam parâmetros (?). Um UPSERT com ON CONFLICT DO UPDATE ... WHERE também faria as linhas 2 e 3, mas não diria quantas foram inserções e quantas foram atualizações; por isso a leitura do estado atual é útil aqui.',
          starter: dedent(`
            def sincronizar(con, catalogo):
                # catalogo: lista de (sku, nome, preco_centavos), o catálogo completo do fornecedor
                # devolva {"inseridos": ..., "atualizados": ..., "desativados": ..., "removidos": ...}
                pass
          `),
          solution: dedent(`
            def sincronizar(con, catalogo):
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
                return cont
          `),
          tests: [
            {
              name: 'o exemplo do enunciado',
              code: CATALOGO_AJUDA + '\n' + dedent(`
                con = _banco_loja(_LOJA, _VENDAS)
                r = sincronizar(con, _CATALOGO)
                esperado = {"inseridos": 1, "atualizados": 2, "desativados": 1, "removidos": 1}
                assert r == esperado, f"contagens {r}, esperado {esperado}. ACUCAR1 é novo; ARROZ5 mudou de preço e SAL1 estava inativo (2 atualizados); OLEO900 saiu e tem venda (desativado); FEIJAO1 saiu e nunca foi vendido (removido); CAFE500 não mudou"
                final = [("ACUCAR1", "Açúcar 1 kg", 549, 1), ("ARROZ5", "Arroz 5 kg", 2999, 1), ("CAFE500", "Café 500 g", 1890, 1),
                         ("OLEO900", "Óleo 900 ml", 799, 0), ("SAL1", "Sal 1 kg", 349, 1)]
                assert _estado(con) == final, f"a tabela ficou {_estado(con)}, esperado {final}"
              `),
            },
            {
              name: 'rodar de novo não muda nada',
              code: CATALOGO_AJUDA + '\n' + dedent(`
                con = _banco_loja(_LOJA, _VENDAS)
                sincronizar(con, _CATALOGO)
                depois_da_primeira = _estado(con)
                r = sincronizar(con, _CATALOGO)
                assert r == _zeros(), f"a segunda sincronização com o mesmo catálogo devolveu {r}, esperado tudo zero: só conte o que de fato mudou (um produto inativo que continua fora do catálogo não é desativado de novo)"
                assert _estado(con) == depois_da_primeira, "a segunda sincronização com o mesmo catálogo mudou a tabela"
              `),
            },
            {
              name: 'catálogo vazio',
              code: CATALOGO_AJUDA + '\n' + dedent(`
                con = _banco_loja([("A", "a", 100, 1), ("B", "b", 200, 0), ("C", "c", 300, 1), ("D", "d", 400, 0)],
                                  [(1, "A", 1), (2, "B", 1)])
                r = sincronizar(con, [])
                esperado = {"inseridos": 0, "atualizados": 0, "desativados": 1, "removidos": 2}
                assert r == esperado, f"com catálogo vazio, deu {r}, esperado {esperado}: A (vendido, ativo) é desativado; B (vendido, já inativo) fica como está e não conta; C e D (nunca vendidos) são apagados"
                assert _estado(con) == [("A", "a", 100, 0), ("B", "b", 200, 0)], f"a tabela ficou {_estado(con)}"
              `),
            },
            {
              name: 'mudança só de nome também é atualização',
              code: CATALOGO_AJUDA + '\n' + dedent(`
                con = _banco_loja([("CAFE500", "Café 500 g", 1890, 1)])
                r = sincronizar(con, [("CAFE500", "Café Tradicional 500 g", 1890)])
                assert r == {"inseridos": 0, "atualizados": 1, "desativados": 0, "removidos": 0}, f"o nome mudou e o preço não: esperado 1 atualizado, veio {r}"
                assert _estado(con) == [("CAFE500", "Café Tradicional 500 g", 1890, 1)], f"a tabela ficou {_estado(con)}"
              `),
            },
            {
              name: 'catálogo inválido não muda nada',
              code: CATALOGO_AJUDA + '\n' + dedent(`
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
                    assert _estado(con) == antes, f"catálogo inválido ({motivo}): a tabela mudou para {_estado(con)}. Valide o catálogo inteiro antes de escrever qualquer coisa"
              `),
            },
            {
              name: 'cenários aleatórios',
              code: CATALOGO_AJUDA + '\n' + dedent(`
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
                    assert _estado(con) == estado_esperado, f"tabela {produtos}, vendidos {sorted(vendidos)}, catálogo {catalogo}: a tabela ficou {_estado(con)}, esperado {estado_esperado}"
              `),
            },
          ],
        },
      },
    ],
    projeto: [
      md(`
        **Sistema de cadastro: esquema com regras.** Antes de trocar o armazenamento do cadastro por SQLite (a parte 4 do projeto), escreva o esquema com as restrições: matrícula do aluno como chave, CPF e e-mail com UNIQUE, CHECK nas faixas que fizerem sentido, chaves estrangeiras com a ação ON DELETE de cada relação (e o PRAGMA ligado na conexão). Escreva um teste para cada regra, tentando inserir um dado inválido e esperando \`sqlite3.IntegrityError\`, como nos testes do exercício da operadora.
      `),
      { type: 'project', projectId: 'p3-cadastro' },
    ],
    revisao: [
      md(`
        - DDL define a estrutura (CREATE, ALTER, DROP); DML lê e altera as linhas (SELECT, INSERT, UPDATE, DELETE).
        - Restrições no banco valem para todo programa e fecham a corrida da checagem no app: NOT NULL, UNIQUE, CHECK, DEFAULT, PRIMARY KEY, REFERENCES.
        - CHECK e UNIQUE deixam NULL passar; só NOT NULL obriga a ter valor.
        - Tipos: dinheiro em centavos (INTEGER), datas em ISO 8601, CPF e CEP como TEXT. No SQLite o tipo é afinidade; STRICT ou PostgreSQL recusam o tipo errado.
        - Id substituto como chave primária e UNIQUE na chave natural; chave composta para pares que não podem repetir.
        - Chave estrangeira: RESTRICT/NO ACTION recusa, CASCADE apaga junto, SET NULL solta. No SQLite, \`PRAGMA foreign_keys = ON\` em cada conexão.
        - Um comando que viola uma restrição é desfeito por inteiro.
        - Ritual: SELECT com o mesmo WHERE, o comando, conferir rowcount ou RETURNING.
        - UPSERT com ON CONFLICT; INSERT OR REPLACE apaga a linha antiga (e dispara o CASCADE). Exclusão lógica preserva o histórico.
      `),
      english(`
        - **DDL / DML**: definição / manipulação de dados
        - **constraint / to violate a constraint**: restrição / violar uma restrição
        - **primary key, foreign key, composite key**: chave primária, estrangeira, composta
        - **natural key / surrogate key**: chave natural / substituta
        - **cascade delete**: exclusão em cascata
        - **soft delete**: exclusão lógica
        - **upsert**: inserir ou atualizar

        Frase típica de entrevista: *"I'd enforce uniqueness with a UNIQUE constraint in the database, not just a check in the application: two concurrent requests can both pass the check and insert duplicates."*

        Frase típica de documentação: *"Foreign key constraints are disabled by default, so they must be enabled separately for each database connection."*
      `),
    ],
  },
  review: [
    ['Por que pôr as regras (CPF único, preço ≥ 0) no banco, e não só no formulário?', 'Porque o banco confere toda escrita, venha de onde vier, e porque checar no programa antes de inserir tem corrida: duas requisições simultâneas podem passar pela checagem e inserir duplicatas.'],
    ['O que acontece com CHECK (preco >= 0) quando o preço é NULL? Como obrigar o valor?', 'A linha passa: o CHECK só recusa quando a expressão dá falso, e com NULL ela não dá falso. Para obrigar, junte NOT NULL.'],
    ['O que é preciso fazer no SQLite para as chaves estrangeiras valerem?', 'Rodar PRAGMA foreign_keys = ON em cada conexão, logo depois de conectar e fora de transação (com uma transação aberta, o PRAGMA não faz nada).'],
    ['O que fazem ON DELETE RESTRICT, CASCADE e SET NULL?', 'RESTRICT (e o padrão NO ACTION) recusa apagar a mãe que tem filhas; CASCADE apaga as filhas junto; SET NULL põe NULL na chave estrangeira das filhas.'],
    ['Chave natural ou substituta como chave primária: qual a recomendação usual, e por quê?', 'Id substituto como chave primária e UNIQUE na chave natural: a natural (CPF, placa) pode mudar ou ser corrigida, e a chave primária é copiada em todas as chaves estrangeiras.'],
    ['Quais são os três passos do ritual de um UPDATE ou DELETE?', 'Rodar antes um SELECT com o mesmo WHERE e contar as linhas; executar o comando com esse WHERE; conferir rowcount (ou RETURNING) contra a contagem.'],
    ['Por que INSERT OR REPLACE é perigoso, e o que usar no lugar?', 'Ele apaga a linha antiga e insere outra: colunas não informadas voltam ao padrão e, com ON DELETE CASCADE, as filhas são apagadas. Use INSERT ... ON CONFLICT (...) DO UPDATE.'],
    ['Por que guardar CEP e CPF como TEXT?', 'Não são quantidades: como número, perdem o zero à esquerda (01310100 vira 1310100), e ninguém faz conta com eles.'],
  ],
  references: ['sqlite-docs', 'postgres-docs', 'cmu-15445'],
});

/* ------------------------------------------------------------------ */
/* SQL no Python: consultas parametrizadas, cursores e paginação       */
/* ------------------------------------------------------------------ */

const SETUP_VITRINE = dedent(`
  CREATE TABLE produtos (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, preco_centavos INTEGER NOT NULL);
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
    (12, 'Pano de chão', 449);
`);

/** Conexão "espiã": repassa tudo para a conexão de verdade e anota o texto de cada SQL executado. */
const ESPIAO = dedent(`
  import sqlite3

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
`);

const CIDADES_AJUDA = ESPIAO + '\n' + dedent(`
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
`);

const ORDENS_AJUDA = dedent(`
  import sqlite3

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
`);

const BUSCA_AJUDA = ESPIAO + '\n' + dedent(`
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
`);

const parametrizadas = lesson({
  id: 'l7-sql-no-python',
  moduleId: 'm7-1',
  title: 'SQL no Python: consultas parametrizadas, cursores e paginação',
  titleEn: 'SQL from Python: parameterized queries, cursors and pagination',
  summary:
    'Como um programa conversa com o banco pelo módulo sqlite3 (DB-API): cursores, fetchone e fetchall, Row, executemany, rowcount e lastrowid; por que um valor passado como parâmetro nunca vira SQL num comando preparado; o que não pode ser parâmetro e como a lista branca resolve; listas no IN, buscas com LIKE e paginação com LIMIT/OFFSET e por chave.',
  minutes: 45,
  objectives: [
    'Executar consultas e comandos pelo sqlite3 e ler o resultado com fetchone, fetchall, iteração e sqlite3.Row, usando rowcount e lastrowid',
    'Explicar o que acontece num comando preparado e por que um valor vinculado a um marcador nunca é interpretado como SQL',
    'Passar valores com ? e :nome, inclusive listas de tamanho variável no IN e termos com % e _ no LIKE',
    'Tratar nomes de coluna e direção de ordenação com lista branca, já que não podem ser parâmetros',
    'Paginar com LIMIT/OFFSET de forma determinística, contar o total e saber quando trocar pela paginação por chave',
  ],
  skills: ['bd-sql'],
  terms: [
    t('consulta parametrizada', 'parameterized query', 'Comando SQL com marcadores no lugar dos valores; os valores vão separados, e o banco os recebe como dados.', 'Always use parameterized queries; never build SQL with string formatting.'),
    t('marcador', 'placeholder', 'O sinal que marca o lugar de um valor no SQL: ? ou :nome no sqlite3, %s no psycopg.'),
    t('cursor', 'cursor', 'Objeto que executa um comando e entrega as linhas do resultado.'),
    t('comando preparado', 'prepared statement', 'Comando SQL já compilado pelo banco, com espaços onde os valores serão encaixados; pode ser reusado com valores diferentes.'),
    t('vincular', 'bind', 'Encaixar um valor num marcador de um comando preparado.', 'sqlite3.ProgrammingError: Incorrect number of bindings supplied.'),
    t('injeção de SQL', 'SQL injection', 'Ataque em que um valor vindo de fora é interpretado como parte do comando SQL.'),
    t('lista branca', 'allowlist', 'Conjunto fechado de opções aceitas; qualquer coisa fora dele é recusada.', 'Sort columns are validated against an allowlist before being added to the query.'),
    t('caractere curinga', 'wildcard', 'No LIKE, % casa com qualquer sequência de caracteres e _ com exatamente um caractere.'),
    t('paginação por chave', 'keyset pagination', 'Pedir a próxima página a partir da última linha vista (WHERE (nome, id) > (?, ?)) em vez de pular linhas com OFFSET.', 'Keyset pagination performs consistently no matter how deep you page.'),
  ],
  stages: {
    conceito: [
      md(`
        Num sistema de verdade, ninguém digita SQL: o programa monta os comandos e os manda ao banco, e muitos valores vêm de fora: o que a pessoa digitou na busca, o número da página na URL, a planilha que o fornecedor mandou. A pergunta desta lição é **como esses valores entram no comando**.

        A resposta é a {{consulta parametrizada|parameterized query}}: o texto do SQL vai com {{marcadores|placeholders}} (\`?\`) no lugar dos valores, e os valores vão **separados**. O banco compila o comando primeiro, quando ainda nem sabe os valores, e só depois os encaixa como dados. Por isso um nome como "Joana D'Arc" não quebra nada, e um "nome" como \`' OR '1'='1\` é só um texto esquisito que não casa com ninguém, e não uma ordem para devolver a tabela inteira.

        Você já viu o \`?\` na primeira lição do módulo. Agora vai entender o que acontece por baixo, ler resultados do jeito certo, descobrir o que **não** pode virar parâmetro (nome de coluna, ASC/DESC) e resolver três situações do dia a dia que pegam muita gente: listas no IN, buscas com LIKE e paginação.
      `),
    ],
    explicacao: [
      md(`
        ### Do Python ao banco e de volta
        O módulo \`sqlite3\` da biblioteca padrão segue a especificação DB-API 2.0 (PEP 249), a mesma de praticamente todos os drivers de banco do Python: trocar de SQLite para PostgreSQL muda a conexão e o estilo do marcador, e quase nada mais. O roteiro é sempre este:
      `),
      code('python', `
        import sqlite3

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
        con.close()
      `, 'O esqueleto de qualquer programa com sqlite3 (para ler, não para rodar: ele abre um arquivo).'),
      md(`
        \`con.execute\` é um atalho: cria um {{cursor|cursor}}, o objeto que executa o comando e entrega as linhas, e devolve esse cursor. O que você vai usar o tempo todo:
      `),
      {
        type: 'table',
        head: ['Recurso', 'O que faz', 'Detalhe que pega'],
        rows: [
          ['`cur.fetchone()`', 'a próxima linha, como tupla', 'devolve None quando não há linha: confira antes de desempacotar'],
          ['`cur.fetchall()` ou `for linha in cur`', 'todas as linhas de uma vez, ou uma de cada vez', 'com milhões de linhas, iterar evita carregar tudo na memória'],
          ['`con.executemany(sql, lista)`', 'o mesmo comando para cada item da lista', 'compila uma vez e encaixa os valores N vezes'],
          ['`cur.rowcount`', 'quantas linhas o último INSERT, UPDATE ou DELETE afetou', 'vale -1 depois de um SELECT'],
          ['`cur.lastrowid`', 'o id da linha criada pelo último INSERT feito com `execute`', 'não é atualizado por `executemany`'],
          ['`con.row_factory = sqlite3.Row`', 'linhas acessíveis pelo nome da coluna: `linha["nome"]`', 'continuam aceitando índice (`linha[0]`) e viram dict com `dict(linha)`'],
          ['`con.commit()`', 'confirma as mudanças pendentes', 'o módulo abre uma transação sozinho antes de INSERT, UPDATE e DELETE; fechar a conexão sem commit descarta as mudanças'],
          ['`con.executescript(texto)`', 'vários comandos separados por `;`', 'não aceita parâmetros: só para esquemas e dados fixos. O `execute` recusa mais de um comando por chamada'],
        ],
      },
      warn(`
        \`con.execute("SELECT * FROM clientes WHERE cidade = ?", ("Recife"))\` falha com \`Incorrect number of bindings supplied. The current statement uses 1, and there are 6 supplied.\` Parênteses sozinhos não criam tupla: \`("Recife")\` é só a string, e uma string é uma sequência de 6 caracteres, que o driver tenta encaixar um em cada marcador. A tupla de um elemento leva vírgula, \`("Recife",)\`, e uma lista também serve: \`["Recife"]\`.
      `, 'A vírgula que falta'),
      md(`
        ### O que acontece com um parâmetro
        1. **Preparar.** O driver entrega ao SQLite só o texto, com os marcadores. O SQLite analisa a sintaxe e compila o comando num pequeno programa para a máquina virtual dele: é o {{comando preparado|prepared statement}} (na biblioteca C, a função \`sqlite3_prepare_v2\`). É nesse momento que se decide o que é tabela, o que é coluna e o que é operador.
        2. **Vincular.** Os valores são encaixados ({{vinculados|bound}}) nos espaços do programa já compilado, cada um com seu tipo (\`sqlite3_bind_text\`, \`sqlite3_bind_int64\`...). Não há mais análise de sintaxe: o texto \`' OR '1'='1\` é uma string de 11 caracteres a ser comparada com a coluna, e nada além disso.
        3. **Executar.** O programa roda e devolve as linhas.

        O \`sqlite3\` do Python ainda guarda os últimos 128 comandos preparados: rodar a mesma consulta com valores diferentes, ou um \`executemany\` com mil linhas, não recompila nada.

        Montar o SQL com f-string ou \`+\` põe o valor **dentro do texto** antes do passo 1, e aí o banco o interpreta como SQL:
      `),
      {
        type: 'table',
        head: ['Valor digitado na busca', "Com f-string: `f\"... WHERE nome LIKE '%{busca}%'\"`", 'Com parâmetro: `"... WHERE nome LIKE ?"` e `(f"%{busca}%",)`'],
        rows: [
          ['`suco`', 'funciona', 'funciona'],
          ["`D'Ávila`", '`OperationalError: near "Ávila": syntax error`: o apóstrofo fechou a string do SQL', 'funciona: o apóstrofo é só um caractere do valor'],
          ["`' OR 1=1 --`", "vira `WHERE nome LIKE '%' OR 1=1 --%'`: o `--` comenta o resto, e a consulta devolve **todos** os produtos", 'procura nomes que contenham esse texto: nenhum'],
        ],
        caption: 'Na segunda coluna, o f-string monta o SQL; na terceira, monta só o valor, o que é inofensivo.',
      },
      md(`
        Essa é a {{injeção de SQL|SQL injection}}, que o nível de segurança estuda com ataques reais. Aqui basta a regra: **valor que vem de fora nunca entra no texto do SQL**.

        Os tipos atravessam assim: \`None\` ↔ NULL, \`int\` ↔ INTEGER, \`float\` ↔ REAL, \`str\` ↔ TEXT, \`bytes\` ↔ BLOB. Os outros você converte antes de passar: datas com \`d.isoformat()\` (os conversores automáticos de data do módulo estão obsoletos desde o Python 3.12) e dinheiro em centavos, com \`int\`. Cuidado com NULL: \`WHERE email = ?\` com \`None\` não casa com nada, porque em SQL qualquer comparação com \`=\` envolvendo NULL dá "desconhecido", nunca verdadeiro. No SQLite, \`WHERE email IS ?\` compara aceitando NULL; no PostgreSQL, o equivalente é \`IS NOT DISTINCT FROM\`.

        ### Estilos de marcador
        Cada driver escolhe o seu (a PEP 249 chama isso de *paramstyle*):
      `),
      {
        type: 'table',
        head: ['Driver', 'Banco', 'Marcadores'],
        rows: [
          ['`sqlite3` (biblioteca padrão)', 'SQLite', '`?` (com tupla ou lista) e `:nome` (com dict)'],
          ['`psycopg`', 'PostgreSQL', '`%s` e `%(nome)s`'],
          ['`mysql-connector-python`, `PyMySQL`', 'MySQL e MariaDB', '`%s` e `%(nome)s`'],
        ],
      },
      warn(`
        O \`%s\` do psycopg **não** é a formatação de strings do Python. O certo é \`cur.execute("SELECT * FROM t WHERE id = %s", (7,))\`, com os valores no segundo argumento; \`cur.execute("SELECT * FROM t WHERE id = %s" % 7)\` monta o texto antes e volta ao problema da tabela acima. O mesmo vale para \`:nome\` no sqlite3: os valores vão num dict, no segundo argumento.
      `, 'Parece formatação, mas não é'),
      md(`
        ### Até onde vai um marcador
        Um marcador fica onde poderia estar um **valor literal**, como \`'Recife'\` ou \`42\`. Nome de tabela, nome de coluna, ASC/DESC e operadores fazem parte da estrutura do comando, que é decidida no passo 1, antes de qualquer valor existir:
      `),
      {
        type: 'table',
        head: ['Onde', 'Marcador funciona?', 'O que fazer'],
        rows: [
          ['valor em WHERE, SET ou VALUES', 'sim', 'parâmetro'],
          ['LIMIT e OFFSET', 'sim', 'parâmetro (garanta que é `int`)'],
          ['nome de tabela: `FROM ?`', 'não: erro de sintaxe', 'lista branca'],
          ['direção ou operador: `ORDER BY nome ?`', 'não: erro de sintaxe', 'lista branca'],
          ['coluna de ordenação: `ORDER BY ?`', 'roda **sem erro**, mas ordena por uma constante, e a ordem não muda', 'lista branca'],
          ['vários valores: `IN (?)` recebendo uma lista', "não: o driver recusa a lista (`type 'list' is not supported`)", 'um `?` por item'],
        ],
      },
      md(`
        A {{lista branca|allowlist}} resolve o que não pode ser parâmetro: o usuário escolhe uma **chave** de um conjunto fechado, e o trecho de SQL correspondente foi escrito por você.
      `),
      code('python', `
        ORDENS = {
            "nome": "nome, id",
            "preco": "preco_centavos, id",
            "-preco": "preco_centavos DESC, id",
        }
        if ordem not in ORDENS:
            raise ValueError(f"ordem inválida: {ordem!r}")
        sql = f"SELECT id, nome FROM produtos ORDER BY {ORDENS[ordem]} LIMIT ?"
        linhas = con.execute(sql, (por_pagina,)).fetchall()
      `),
      md(`
        Repare: essa linha monta SQL com f-string, e está certa. A regra não é "nunca use f-string no SQL"; é "**nada que veio de fora entra no texto**". O que entra aqui é \`ORDENS[ordem]\`, escrito por você; o que veio de fora, \`ordem\`, só serviu para escolher. Ferramentas de análise como o Bandit avisam sobre qualquer SQL montado com strings, e um comentário explicando a lista branca ajuda quem revisar o código.

        ### Listas no IN
        Gere um \`?\` por item. O texto ganha só pontos de interrogação e vírgulas, criados pelo seu código; os itens continuam indo como parâmetros:
      `),
      code('python', `
        cidades = ["Recife", "Olinda", "Caruaru"]
        marcadores = ", ".join(["?"] * len(cidades))          # "?, ?, ?"
        sql = f"SELECT nome FROM clientes WHERE cidade IN ({marcadores})"
        linhas = con.execute(sql, cidades).fetchall()
      `),
      md(`
        - **Lista vazia:** o SQLite aceita \`IN ()\` (dá sempre falso), mas o PostgreSQL e o padrão SQL não. Trate a lista vazia antes e devolva o resultado vazio sem consultar.
        - **Limite:** o SQLite aceita até 32 766 marcadores por comando desde a versão 3.32 (antes eram 999). Para dezenas de milhares de itens, divida em lotes ou carregue os valores numa tabela temporária e faça JOIN.

        ### Buscas com LIKE
        O curinga vai no **valor**: \`nome LIKE ?\` com \`f"%{termo}%"\`. Esse f-string monta o valor, não o SQL, e está certo. Mas o termo digitado pode ter seus próprios \`%\` e \`_\`, que o LIKE trata como {{caracteres curinga|wildcards}} (\`%\` casa com qualquer sequência; \`_\`, com exatamente um caractere): quem busca \`100%\` acharia também "Suco de caju 1000 ml". Para tratá-los como texto, escape-os e diga ao LIKE qual é o caractere de escape:
      `),
      code('python', String.raw`
        def escapar_like(termo):
            # a ordem importa: primeiro o próprio caractere de escape, depois os curingas
            return termo.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")

        sql = "SELECT nome FROM produtos WHERE nome LIKE ? ESCAPE '\\'"
        linhas = con.execute(sql, (f"%{escapar_like(termo)}%",)).fetchall()
      `),
      md(`
        Duas diferenças entre bancos: o LIKE do SQLite ignora maiúsculas e minúsculas, mas **só nas letras ASCII** (\`'ana' LIKE 'ANA'\` é verdadeiro; \`'água' LIKE 'Água'\` é falso), e o do PostgreSQL diferencia sempre (para ignorar, lá existe \`ILIKE\`). Para buscas que ignorem acentos, o caminho usual é guardar uma coluna normalizada, sem acentos e em minúsculas, e buscar nela.

        ### Paginação
        Uma vitrine com 10 000 produtos mostra 20 por vez:
      `),
      code('python', `
        sql = "SELECT id, nome, preco_centavos FROM produtos ORDER BY nome, id LIMIT ? OFFSET ?"
        linhas = con.execute(sql, (por_pagina, (pagina - 1) * por_pagina)).fetchall()
      `),
      md(`
        - **A ordem precisa ser única.** Uma tabela não tem ordem própria: sem ORDER BY, ou com empates no ORDER BY, o banco pode devolver as linhas empatadas em ordens diferentes a cada consulta, e um item aparece em duas páginas enquanto outro não aparece em nenhuma. A documentação do PostgreSQL avisa exatamente isso sobre LIMIT. Desempate sempre por uma coluna única, como o id.
        - **O total vem de outra consulta**, com o mesmo WHERE: \`SELECT COUNT(*) FROM produtos WHERE ...\`. O número de páginas é o total dividido por \`por_pagina\`, arredondado para cima. Monte o WHERE e a lista de parâmetros uma vez e use nas duas consultas.
        - **Valide a entrada.** \`pagina\` e \`por_pagina\` vêm da URL: converta para \`int\`, recuse página menor que 1 e limite o tamanho da página (ninguém precisa de \`por_pagina=1000000\`).
      `),
      deep(`
        \`OFFSET 100000\` não pula direto para a linha 100 001: o banco gera e descarta as 100 000 anteriores (a documentação do PostgreSQL diz isso com todas as letras), e a página fica mais lenta quanto mais longe. E se alguém cadastrar um produto enquanto o cliente navega, tudo escorrega uma posição: um item se repete na página seguinte.

        A {{paginação por chave|keyset pagination}} pede "os próximos 20 depois do último que eu vi":

        \`\`\`sql
        SELECT id, nome FROM produtos
        WHERE (nome, id) > (?, ?)        -- nome e id da última linha da página anterior
        ORDER BY nome, id
        LIMIT 20
        \`\`\`

        Com um índice em \`(nome, id)\` (assunto do módulo de índices), cada página custa o mesmo, seja a 1ª ou a 5 000ª, e inserções não fazem itens se repetirem. O preço: não dá para pular direto para a página 37, só seguir em frente (ou voltar, invertendo a comparação). É o que fazem os feeds com "carregar mais". A comparação de linhas \`(a, b) > (?, ?)\` existe no SQLite desde a 3.15 e no PostgreSQL; com direções misturadas (preço decrescente, id crescente), escreva por extenso: \`preco_centavos < ? OR (preco_centavos = ? AND id > ?)\`.
      `, 'OFFSET fica caro: paginação por chave'),
    ],
    exemplo: [
      md(`
        Uma loja online recebe \`GET /produtos?busca=100%25&categoria=bebidas&categoria=hortifruti\` (\`%25\` é o \`%\` codificado na URL; o framework já entrega \`busca = "100%"\`). Acompanhe a montagem do WHERE e da lista de parâmetros, linha a linha:
      `),
      trace(String.raw`
        busca = "100%"
        categorias = ["bebidas", "hortifruti"]

        condicoes = []
        params = []
        if busca:
            escapado = busca.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            condicoes.append("nome LIKE ? ESCAPE '\\'")
            params.append("%" + escapado + "%")
        if categorias:
            marcadores = ", ".join(["?"] * len(categorias))
            condicoes.append("categoria IN (" + marcadores + ")")
            params.extend(categorias)
        where = " AND ".join(condicoes)
        sql = "SELECT id, nome FROM produtos WHERE " + where
        print(sql)
        print(params)
      `, 'A lista de parâmetros aparece com a barra dobrada porque é assim que o Python mostra uma barra dentro de uma string; o valor tem uma barra só.'),
      {
        type: 'table',
        head: ['Pedaço da entrada', 'Onde foi parar', 'Técnica'],
        rows: [
          ['`busca = "100%"`', 'parâmetro 1: `%100\\%%`', 'escape dos curingas, e o `%` de "contém" em volta, no valor'],
          ['`categorias = ["bebidas", "hortifruti"]`', 'parâmetros 2 e 3; no texto, só `IN (?, ?)`', 'um marcador por item'],
          ['nenhum', "`nome LIKE ? ESCAPE '\\'`, `AND`, `categoria IN (`", 'texto escrito pelo programa'],
        ],
        caption: 'O texto final do SQL só tem palavras escritas pelo programador e pontos de interrogação.',
      },
      md(`
        Isso dá um teste simples para qualquer código seu: imprima o \`sql\` e procure nele qualquer coisa que o usuário digitou. Se achar, há um buraco. Os exercícios desta lição fazem exatamente essa conferência, com uma conexão "espiã" que anota o texto de cada comando executado.

        E se a mesma busca viesse com \`ordem=-preco&pagina=2\`? A ordem passa pela lista branca (\`ORDENS["-preco"]\` vira \`preco_centavos DESC, id\` no texto), e a página vira mais dois parâmetros no fim: \`LIMIT ? OFFSET ?\` com \`(por_pagina, por_pagina)\`. O mesmo \`where\` e a mesma lista de parâmetros, sem o LIMIT, servem para o \`SELECT COUNT(*)\` que calcula o total.
      `),
    ],
    codigo: [
      py(`
        import sqlite3

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
            print("erro:", e)
      `, { caption: 'Os recursos da tabela da explicação, um por linha. Troque ("Recife") por ("Recife",) e veja o erro sumir.' }),
      py(String.raw`
        import sqlite3

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
            escapado = termo.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            sql = ("SELECT nome, preco_centavos FROM produtos WHERE nome LIKE ? ESCAPE '\\' "
                   f"ORDER BY {ORDENS[ordem]} LIMIT ? OFFSET ?")
            return con.execute(sql, (f"%{escapado}%", por_pagina, (pagina - 1) * por_pagina)).fetchall()

        print(buscar(con, "suco"))
        print(buscar(con, "suco", pagina=2))
        print(buscar(con, "100%", ordem="-preco"))     # % literal: o "1000 ml" não entra
        print(buscar(con, "' OR 1=1 --"))               # só um texto que nenhum nome contém
        try:
            buscar(con, "suco", ordem="nome; DROP TABLE produtos")
        except ValueError as e:
            print(e)
      `, { caption: 'Tire o escape (use só f"%{termo}%") e busque "100%" de novo: o suco de caju de 1000 ml aparece.' }),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e7-param-1',
          kind: 'mcq',
          prompt: 'Em qual destes comandos o marcador `?` funciona como o programador esperava?',
          difficulty: 'facil',
          skills: ['bd-sql'],
          hints: [
            'Um marcador ocupa o lugar de que tipo de coisa no SQL?',
            'Em que momento o banco decide o que é tabela e o que é coluna: antes ou depois de receber os valores?',
          ],
          explanation: 'Um marcador ocupa o lugar de um valor literal, como \'Recife\'. Nomes de tabela e de coluna e palavras como DESC fazem parte da estrutura, decidida quando o comando é compilado, antes de os valores chegarem. FROM ? e ORDER BY nome ? são erros de sintaxe; ORDER BY ? é pior: roda sem erro e ordena por uma constante. Para esses casos, use lista branca.',
          options: [
            { text: '`SELECT nome FROM clientes WHERE cidade = ?` com `("Recife",)`', correct: true, feedback: 'Isso: o ? está no lugar de um valor, e o valor vai separado, como dado.' },
            { text: '`SELECT nome FROM ? WHERE id = 1` com `("clientes",)`', feedback: 'Nome de tabela faz parte da estrutura do comando, decidida antes de qualquer valor existir: é erro de sintaxe. Use uma lista branca de tabelas permitidas.' },
            { text: '`SELECT nome FROM clientes ORDER BY ?` com `("nome",)`', feedback: 'Esse é traiçoeiro: roda sem erro, mas o ? vira o valor constante \'nome\', igual para todas as linhas, e a ordem não muda. Coluna de ordenação vem de uma lista branca.' },
            { text: '`SELECT nome FROM clientes ORDER BY nome ?` com `("DESC",)`', feedback: 'DESC é uma palavra da linguagem, não um valor: é erro de sintaxe. Escolha entre trechos fixos de SQL com uma lista branca.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e7-param-2',
          kind: 'sql',
          prompt: dedent(`
            A vitrine mostra **4 produtos por página**, do mais barato para o mais caro; em empate de preço, em ordem alfabética de nome. Escreva a consulta da **página 3** (colunas \`id\`, \`nome\`, \`preco_centavos\`).
          `),
          difficulty: 'facil',
          skills: ['bd-sql'],
          hints: [
            'Quantos produtos as páginas 1 e 2 já mostraram? É quantos a página 3 precisa pular.',
            'Qual cláusula limita a quantidade de linhas, e qual pula as primeiras?',
            'Vários produtos têm o mesmo preço. O que o ORDER BY precisa ter para a ordem entre eles ser sempre a mesma?',
          ],
          explanation: 'SELECT id, nome, preco_centavos FROM produtos ORDER BY preco_centavos, nome LIMIT 4 OFFSET 8; — a página p pula (p − 1) × 4 linhas. O segundo critério do ORDER BY desempata os produtos de mesmo preço; sem ele, a ordem entre empatados fica a critério do banco, e um produto pode aparecer em duas páginas enquanto outro some. No programa, 4 e 8 viriam como parâmetros: LIMIT ? OFFSET ?.',
          setup: SETUP_VITRINE,
          starter: 'SELECT id, nome, preco_centavos FROM produtos ORDER BY preco_centavos LIMIT 4;',
          solution: 'SELECT id, nome, preco_centavos FROM produtos ORDER BY preco_centavos, nome LIMIT 4 OFFSET 8;',
          ordered: true,
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e7-param-3',
          kind: 'predict',
          lang: 'python',
          prompt: 'O que este programa imprime? Compare a consulta com parâmetro e a consulta com f-string, e preste atenção ao LIKE.',
          difficulty: 'intermediario',
          skills: ['bd-sql'],
          hints: [
            'Com o parâmetro, o banco compara a coluna nome com qual texto exatamente?',
            "Monte à mão o SQL do f-string: o que fica depois de nome = ? Repare onde cada apóstrofo abre e fecha uma string.",
            "Quais nomes terminam em a? O LIKE do SQLite liga para maiúsculas nas letras ASCII?",
            'O que fetchone() devolve quando nenhuma linha satisfaz o WHERE?',
          ],
          explanation: "Com o parâmetro, o banco procura alguém chamado literalmente x' OR '1'='1: ninguém, 0. Com o f-string, o texto vira WHERE nome = 'x' OR '1'='1', e '1'='1' é verdadeiro para todas as linhas: 3. O LIKE '%a' pega os nomes terminados em a (Ana e Carla; o SQLite ignora maiúsculas nas letras ASCII), então rowcount é 2 e os dois viram maiúsculas. Não há cliente de id 9, e fetchone() devolve None.",
          code: dedent(`
            import sqlite3

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
            print(con.execute("SELECT nome FROM clientes ORDER BY id").fetchall())
          `),
          answer: "0\n3\n2\nNone\n[('ANA',), ('Bruno',), ('CARLA',)]",
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e7-param-4',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Escreva \`clientes_das_cidades(con, cidades)\`, que devolve a lista com o **nome** dos clientes cuja cidade está na lista \`cidades\`, em ordem alfabética. A tabela é \`clientes(id, nome, cidade)\`.

            - \`cidades\` pode ter de 0 a centenas de nomes, inclusive com apóstrofo (Santa Bárbara d'Oeste, Olho d'Água das Flores).
            - Lista vazia devolve \`[]\`, sem erro.
            - Nenhum valor de \`cidades\` pode aparecer dentro do texto do SQL: os testes conferem o texto de cada comando que você executa.
          `),
          difficulty: 'intermediario',
          skills: ['bd-sql'],
          hints: [
            'Um único ? pode receber uma lista inteira?',
            'Se a lista tem 3 cidades, quantos marcadores o IN precisa ter? Como gerar esse texto a partir do tamanho da lista?',
            'O que o texto do IN fica com zero cidades? Isso funciona em todo banco?',
          ],
          explanation: 'Gere um marcador por cidade com ", ".join(["?"] * len(cidades)) e passe a lista como parâmetros: o texto do SQL ganha só pontos de interrogação, e as cidades vão como dados, com apóstrofo e tudo. A lista vazia é tratada antes de consultar (IN () funciona no SQLite, mas não no PostgreSQL). Montar o IN com aspas em volta de cada cidade quebra com o apóstrofo de d\'Oeste e abre espaço para injeção; os testes detectam as duas coisas.',
          starter: dedent(`
            def clientes_das_cidades(con, cidades):
                # devolva os nomes dos clientes cuja cidade está em cidades, em ordem alfabética;
                # cada cidade vai como parâmetro, nunca dentro do texto do SQL
                pass
          `),
          solution: dedent(`
            def clientes_das_cidades(con, cidades):
                if not cidades:
                    return []
                marcadores = ", ".join(["?"] * len(cidades))
                sql = f"SELECT nome FROM clientes WHERE cidade IN ({marcadores}) ORDER BY nome"
                return [nome for (nome,) in con.execute(sql, list(cidades))]
          `),
          tests: [
            {
              name: 'uma ou várias cidades',
              code: CIDADES_AJUDA + '\n' + dedent(`
                con = _banco()
                casos = [
                    (["Recife"], ["Ana", "Bruno"]),
                    (["Manaus", "Recife"], ["Ana", "Bruno", "Davi"]),
                    (["Recife", "Manaus", "São Paulo"], ["Ana", "Bruno", "Davi", "Fábio"]),
                    (["Curitiba"], []),
                ]
                for cidades, esperado in casos:
                    r = clientes_das_cidades(con, cidades)
                    assert r == esperado, f"clientes_das_cidades(con, {cidades}) devolveu {r!r}, esperado {esperado} (só os nomes, em ordem alfabética)"
              `),
            },
            {
              name: 'cidades com apóstrofo',
              code: CIDADES_AJUDA + '\n' + dedent(`
                con = _banco()
                cidades = ["Santa Bárbara d'Oeste", "Olho d'Água das Flores"]
                r = clientes_das_cidades(con, cidades)
                assert r == ["Caio", "Joana"], f"com {cidades}, veio {r!r}, esperado ['Caio', 'Joana']"
              `),
            },
            {
              name: 'lista vazia',
              code: CIDADES_AJUDA + '\n' + dedent(`
                con = _banco()
                r = clientes_das_cidades(con, [])
                assert r == [], f"com a lista vazia, esperado [], veio {r!r}"
              `),
            },
            {
              name: 'tentativas de injeção não devolvem ninguém',
              code: CIDADES_AJUDA + '\n' + dedent(`
                con = _banco()
                for ataque in ["x') OR ('1'='1", "Recife') OR 1=1 --", 'x") OR 1=1 --']:
                    r = clientes_das_cidades(con, [ataque])
                    assert r == [], f"com a cidade {ataque!r}, que não existe, veio {r!r}: o valor foi interpretado como SQL"
                n = con.execute("SELECT COUNT(*) FROM clientes").fetchone()[0]
                assert n == 7, "a tabela clientes perdeu linhas"
              `),
            },
            {
              name: 'valores só como parâmetros',
              code: CIDADES_AJUDA + '\n' + dedent(`
                espiao = _Espiao(_banco())
                cidades = ["Pau dos Ferros", "Santa Bárbara d'Oeste", "São Paulo"]
                r = clientes_das_cidades(espiao, cidades)
                assert r == ["Eva", "Fábio", "Joana"], f"com {cidades}, veio {r!r}"
                _sem_valores_no_sql(espiao, cidades)
              `),
            },
            {
              name: 'lista com 500 cidades',
              code: CIDADES_AJUDA + '\n' + dedent(`
                con = _banco()
                cidades = [f"Cidade {i}" for i in range(498)] + ["Recife", "Manaus"]
                r = clientes_das_cidades(con, cidades)
                assert r == ["Ana", "Bruno", "Davi"], f"com 500 cidades (entre elas Recife e Manaus), veio {r!r}"
              `),
            },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e7-param-5',
          kind: 'fix',
          lang: 'python',
          prompt: dedent(`
            Um colega leu que não se deve pôr valor do usuário dentro do SQL e escreveu \`listar_produtos(con, ordem)\` com um marcador. Roda sem erro nenhum, mas a lista sai sempre na mesma ordem, qualquer que seja \`ordem\`. Corrija:

            - \`"nome"\`: de A a Z;
            - \`"preco"\`: do mais barato ao mais caro;
            - \`"-preco"\`: do mais caro ao mais barato;
            - em empate de preço, por nome (de A a Z);
            - qualquer outro valor de \`ordem\` lança \`ValueError\`, sem executar nada no banco.

            A tabela é \`produtos(id, nome, preco_centavos)\`, e a função devolve a lista de nomes.
          `),
          difficulty: 'intermediario',
          skills: ['bd-sql'],
          hints: [
            'O que o banco faz com um ? no ORDER BY? Por qual valor cada linha está sendo ordenada?',
            'Nome de coluna e DESC podem ser parâmetros? Se não podem, de onde vem o trecho do ORDER BY?',
            'Como garantir que só três trechos de SQL, escritos por você, possam entrar no texto?',
            'Como desempatar dois produtos com o mesmo preço?',
          ],
          explanation: 'ORDER BY ? recebe o valor como uma constante (o texto \'preco\', igual para todas as linhas), e ordenar por uma constante não muda nada. Coluna e direção fazem parte da estrutura do comando, então vêm de uma lista branca: um dict que leva cada opção válida a um trecho fixo de SQL, com o desempate por nome. Qualquer chave fora do dict vira ValueError antes de executar. Colar a ordem com f-string resolveria "nome", mas deixaria "nome; DROP TABLE produtos" chegar ao banco; e conferir se a coluna existe aceitaria "id", que não está na lista.',
          starter: dedent(`
            def listar_produtos(con, ordem="nome"):
                sql = "SELECT nome FROM produtos ORDER BY ?"
                return [nome for (nome,) in con.execute(sql, (ordem,))]
          `),
          solution: dedent(`
            ORDENS = {
                "nome": "nome",
                "preco": "preco_centavos, nome",
                "-preco": "preco_centavos DESC, nome",
            }

            def listar_produtos(con, ordem="nome"):
                if ordem not in ORDENS:
                    raise ValueError(f"ordem inválida: {ordem!r}")
                sql = "SELECT nome FROM produtos ORDER BY " + ORDENS[ordem]
                return [nome for (nome,) in con.execute(sql)]
          `),
          tests: [
            {
              name: 'as três ordens',
              code: ORDENS_AJUDA + '\n' + dedent(`
                con = _banco()
                for ordem, esperado in [("nome", _POR_NOME), ("preco", _POR_PRECO), ("-preco", _POR_PRECO_DESC)]:
                    r = listar_produtos(con, ordem)
                    assert r == esperado, f"listar_produtos(con, {ordem!r}) devolveu {r}, esperado {esperado}"
              `),
            },
            {
              name: 'empate de preço desempata por nome',
              code: ORDENS_AJUDA + '\n' + dedent(`
                con = _banco()
                r = listar_produtos(con, "-preco")
                assert r[-2:] == ["Açúcar 1 kg", "Biscoito de polvilho"], f"Açúcar e Biscoito custam o mesmo (549): em empate, a ordem é por nome, mesmo na ordem decrescente de preço. Veio {r[-2:]}"
              `),
            },
            {
              name: 'ordem padrão',
              code: ORDENS_AJUDA + '\n' + dedent(`
                con = _banco()
                r = listar_produtos(con)
                assert r == _POR_NOME, f"sem informar a ordem, esperado {_POR_NOME}, veio {r}"
              `),
            },
            {
              name: 'valores fora da lista branca',
              code: ORDENS_AJUDA + '\n' + dedent(`
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
                assert n == 6, "a tabela produtos perdeu linhas"
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
          id: 'e7-param-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Escreva a busca da vitrine de um mercado online: \`buscar_produtos(con, termo="", categorias=None, ordem="nome", pagina=1, por_pagina=10)\`, sobre a tabela \`produtos(id, nome, categoria, preco_centavos)\`. Ela devolve \`{"total": t, "itens": [(id, nome, preco_centavos), ...]}\`, em que \`total\` conta **todos** os produtos que satisfazem a busca, e \`itens\` traz só os da página pedida.

            - \`termo\`: produtos cujo nome **contém** o termo, ignorando maiúsculas e minúsculas nas letras ASCII (o comportamento do LIKE do SQLite). \`%\` e \`_\` no termo são caracteres comuns: quem busca \`100%\` não quer "1000 ml". Termo vazio não filtra.
            - \`categorias\`: \`None\` não filtra; uma lista restringe às categorias dela; a lista vazia não encontra nada (\`{"total": 0, "itens": []}\`).
            - \`ordem\`: \`"nome"\` (A a Z), \`"preco"\` (mais barato primeiro) ou \`"-preco"\` (mais caro primeiro); em qualquer empate, o menor \`id\` primeiro. Outro valor: \`ValueError\`.
            - \`pagina\` começa em 1, e \`por_pagina\` vai de 1 a 50; fora disso, \`ValueError\`. Uma página além da última devolve \`itens\` vazio, com o \`total\` certo.
            - A página e o total vêm do banco (LIMIT/OFFSET e COUNT), e nenhum valor recebido aparece no texto do SQL: os testes conferem.
          `),
          difficulty: 'desafio',
          skills: ['bd-sql'],
          hints: [
            'Separe em partes: validar os argumentos, montar o WHERE com a lista de parâmetros, contar, buscar a página. Qual parte depende de qual?',
            'O WHERE pode ter zero, uma ou duas condições. Que estrutura acumula as condições e, em paralelo, os parâmetros de cada uma?',
            'Como fazer o LIKE tratar % e _ como texto? E o próprio caractere de escape, se aparecer no termo?',
            'A ordem não pode ser parâmetro. De onde vem o trecho do ORDER BY, com o desempate por id?',
            'As duas consultas, a do total e a da página, compartilham que pedaços?',
          ],
          explanation: 'Valide primeiro (ordem na lista branca, pagina ≥ 1, 1 ≤ por_pagina ≤ 50) e trate a lista vazia de categorias antes de consultar. Depois acumule condições e parâmetros lado a lado: o LIKE com o termo escapado (\\ antes, depois % e _) e ESCAPE, e o IN com um ? por categoria. O mesmo WHERE e os mesmos parâmetros alimentam o SELECT COUNT(*), que dá o total, e o SELECT da página, que acrescenta ORDER BY vindo da lista branca (com id no fim, para a ordem ser única) e LIMIT ? OFFSET ?. O texto do SQL só tem trechos escritos por você e marcadores; tudo o que veio de fora vai como parâmetro. Buscar tudo e fatiar em Python funcionaria numa tabela pequena, mas numa vitrine com 100 000 produtos transfere o catálogo inteiro a cada página.',
          starter: dedent(`
            def buscar_produtos(con, termo="", categorias=None, ordem="nome", pagina=1, por_pagina=10):
                # devolva {"total": ..., "itens": [(id, nome, preco_centavos), ...]}
                pass
          `),
          solution: dedent(String.raw`
            ORDENS = {
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
                    escapado = termo.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
                    condicoes.append("nome LIKE ? ESCAPE '\\'")
                    params.append(f"%{escapado}%")
                if categorias is not None:
                    condicoes.append("categoria IN (" + ", ".join(["?"] * len(categorias)) + ")")
                    params.extend(categorias)
                where = " WHERE " + " AND ".join(condicoes) if condicoes else ""

                (total,) = con.execute("SELECT COUNT(*) FROM produtos" + where, params).fetchone()
                sql = ("SELECT id, nome, preco_centavos FROM produtos" + where
                       + " ORDER BY " + ORDENS[ordem] + " LIMIT ? OFFSET ?")
                itens = con.execute(sql, params + [por_pagina, (pagina - 1) * por_pagina]).fetchall()
                return {"total": total, "itens": itens}
          `),
          tests: [
            {
              name: 'busca simples: total e primeira página',
              code: BUSCA_AJUDA + '\n' + dedent(`
                con = _banco()
                _confere(con, "suco", None, "nome", 1, 2)
                _confere(con, "SUCO", None, "nome", 2, 2)
                _confere(con, "", None, "nome", 1, 5)
              `),
            },
            {
              name: '% e _ no termo são caracteres comuns',
              code: BUSCA_AJUDA + '\n' + dedent(`
                con = _banco()
                r = buscar_produtos(con, "100%")
                assert r["total"] == 1, f"buscar '100%' deveria achar só o suco de uva 100%, e não o suco de caju 1000 ml; veio {r}"
                r = buscar_produtos(con, "c_ju")
                assert r["total"] == 0, f"buscar 'c_ju' não deveria achar caju: o _ do termo é um caractere comum, não um curinga; veio {r}"
                _confere(con, "%", None, "nome", 1, 10)
                _confere(con, "_", None, "nome", 1, 10)
              `),
            },
            {
              name: 'apóstrofo e tentativas de injeção',
              code: BUSCA_AJUDA + '\n' + dedent(`
                con = _banco()
                _confere(con, "d'ouro", None, "nome", 1, 10)
                for ataque in ["' OR 1=1 --", "x' OR '1'='1"]:
                    r = buscar_produtos(con, ataque)
                    assert r == {"total": 0, "itens": []}, f"o termo {ataque!r} não está em nenhum nome; veio {r}"
                r = buscar_produtos(con, "", ["bebidas') OR ('1'='1"])
                assert r == {"total": 0, "itens": []}, f"a categoria \\"bebidas') OR ('1'='1\\" não existe; veio {r}"
              `),
            },
            {
              name: 'categorias',
              code: BUSCA_AJUDA + '\n' + dedent(`
                con = _banco()
                r = buscar_produtos(con, "", [])
                assert r == {"total": 0, "itens": []}, f"com a lista de categorias vazia, esperado total 0 e nenhum item; veio {r}"
                _confere(con, "", None, "nome", 1, 50)
                _confere(con, "", ["hortifruti", "congelados"], "preco", 1, 10)
                _confere(con, "caju", ["bebidas", "hortifruti"], "nome", 1, 10)
                _confere(con, "", ["papelaria"], "nome", 1, 10)
              `),
            },
            {
              name: 'ordens e desempate por id',
              code: BUSCA_AJUDA + '\n' + dedent(`
                con = _banco()
                for ordem in ["nome", "preco", "-preco"]:
                    _confere(con, "", None, ordem, 1, 50)
              `),
            },
            {
              name: 'paginação',
              code: BUSCA_AJUDA + '\n' + dedent(`
                con = _banco()
                for pagina in range(1, 6):
                    _confere(con, "", None, "-preco", pagina, 4)
                r = buscar_produtos(con, "", None, "nome", 9, 3)
                assert r["itens"] == [] and r["total"] == 14, f"a página 9 de 3 em 3 está além da última: itens vazio e total 14; veio {r}"
              `),
            },
            {
              name: 'argumentos inválidos',
              code: BUSCA_AJUDA + '\n' + dedent(`
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
                assert r["total"] == 14 and len(r["itens"]) == 14, f"por_pagina = 50 é permitido; veio {r}"
              `),
            },
            {
              name: 'nada de fora no texto do SQL; página e total no banco',
              code: BUSCA_AJUDA + '\n' + dedent(`
                espiao = _Espiao(_banco())
                r = buscar_produtos(espiao, "suco de uva", ["bebidas", "hortifruti"], "preco", 1, 2)
                e = _ref("suco de uva", ["bebidas", "hortifruti"], "preco", 1, 2)
                assert r == e, f"devolveu {r}, esperado {e}"
                _sem_valores_no_sql(espiao, ["suco de uva", "bebidas", "hortifruti"])
                textos = " ".join(espiao.sqls).lower()
                assert "limit" in textos, "a página deve vir do banco, com LIMIT e OFFSET, e não de fatiar em Python uma lista com todos os resultados"
                assert "count(" in textos.replace(" ", ""), "o total deve vir do banco, com COUNT(*), e não de len() sobre todos os resultados"
              `),
            },
            {
              name: 'buscas aleatórias',
              code: BUSCA_AJUDA + '\n' + dedent(`
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
                    _confere(con, termo, categorias, ordem, random.randint(1, 4), random.randint(1, 6))
              `),
            },
          ],
        },
      },
    ],
    projeto: [
      md(`
        **Sistema de cadastro: busca paginada.** Na camada de armazenamento SQLite do cadastro (parte 4 do projeto), escreva \`buscar_alunos(termo, curso, ordem, pagina)\` com tudo desta lição: LIKE com escape, lista branca para a ordem, LIMIT/OFFSET com desempate por matrícula e o total de páginas. Escreva um teste com uma conexão espiã, como a dos exercícios, que falha se algum valor recebido aparecer no texto do SQL.
      `),
      { type: 'project', projectId: 'p3-cadastro' },
    ],
    revisao: [
      md(`
        - DB-API: \`execute\` devolve um cursor; \`fetchone\` (ou None), \`fetchall\`, iteração; \`executemany\`; \`rowcount\`, \`lastrowid\`; \`sqlite3.Row\`; \`commit\`.
        - Comando preparado: o SQL é compilado só com os marcadores; os valores são vinculados depois, como dados, e nunca viram SQL.
        - Tupla de um elemento leva vírgula: \`("Recife",)\`. \`:nome\` vai com dict. O \`%s\` do psycopg é marcador, não formatação.
        - Marcador só onde caberia um valor literal (inclusive LIMIT e OFFSET). Coluna, tabela e ASC/DESC: lista branca. \`ORDER BY ?\` roda e não ordena.
        - f-string no SQL só com texto escrito por você: marcadores gerados, trechos da lista branca.
        - IN: um \`?\` por item; trate a lista vazia antes.
        - LIKE: curingas no valor; escape \`\\\`, \`%\` e \`_\` com ESCAPE. No SQLite, LIKE ignora maiúsculas só em ASCII.
        - Paginação: ORDER BY com desempate único, \`LIMIT ? OFFSET ?\`, total com COUNT e o mesmo WHERE; em listas grandes, paginação por chave.
      `),
      english(`
        - **parameterized query / prepared statement**: consulta parametrizada / comando preparado
        - **placeholder / to bind a parameter**: marcador / vincular um parâmetro
        - **cursor, fetch, row count**: cursor, buscar linhas, número de linhas afetadas
        - **allowlist**: lista branca (o termo antigo *whitelist* está caindo em desuso)
        - **wildcard / escape character**: curinga / caractere de escape
        - **offset pagination / keyset (cursor-based) pagination**: paginação por deslocamento / por chave

        Frase típica de entrevista: *"I never interpolate user input into SQL. Values are passed as bound parameters, and things that can't be parameters, like the sort column, go through an allowlist."*

        Frase típica de documentação: *"SQL operations usually need to use values from Python variables. However, beware of using Python's string operations to assemble queries, as they are vulnerable to SQL injection attacks."*
      `),
    ],
  },
  review: [
    ['Num comando preparado, por que um valor passado com ? nunca é interpretado como SQL?', 'Porque o comando é compilado antes, só com os marcadores; o valor é vinculado depois, como dado tipado, quando não há mais análise de sintaxe.'],
    ['Por que con.execute("... = ?", ("Recife")) falha, e como corrigir?', 'Sem vírgula não é tupla: é a string, e cada um dos 6 caracteres vira um parâmetro. Use ("Recife",) ou ["Recife"].'],
    ['Como ordenar por uma coluna escolhida pelo usuário com segurança? Por que ORDER BY ? não serve?', 'Com uma lista branca: um dict que leva a escolha a um trecho de SQL escrito por você, recusando o resto. ORDER BY ? roda, mas ordena por uma constante.'],
    ['Como passar uma lista de tamanho variável para um IN?', 'Gerar um ? por item, com ", ".join(["?"] * len(lista)), e passar os itens como parâmetros; tratar a lista vazia antes de consultar.'],
    ['Por que buscar "100%" com LIKE pode achar "1000 ml", e como evitar?', 'Porque % e _ do termo viram curingas. Escape o caractere de escape, depois % e _, e use ESCAPE no LIKE.'],
    ['O que a paginação com LIMIT/OFFSET exige para ser estável, e como se calcula o total?', 'Um ORDER BY com desempate por coluna única (como id); o total vem de um SELECT COUNT(*) com o mesmo WHERE e os mesmos parâmetros.'],
    ['Quando trocar OFFSET por paginação por chave?', 'Em listas grandes ou que mudam enquanto se navega: OFFSET percorre e descarta as linhas puladas e pode repetir itens; a paginação por chave continua a partir da última linha vista.'],
    ['O que informam cursor.rowcount e cursor.lastrowid?', 'rowcount: quantas linhas o último INSERT, UPDATE ou DELETE afetou (-1 num SELECT). lastrowid: o id da linha criada pelo último INSERT feito com execute.'],
  ],
  references: ['python-docs', 'sqlite-docs', 'postgres-docs', 'owasp-cheatsheets'],
});

export const lessons: Lesson[] = [restricoes, parametrizadas];
