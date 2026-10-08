/** Lições adicionais do módulo m7-3 (normalização, índices e transações). */
import type { Lesson } from '../../types.ts';
import { code, dedent, deep, english, lesson, md, py, t, tip, trace, warn } from '../../helpers.ts';

/* ------------------------------------------------------------------ */
/* Bancos e ajudantes de teste                                         */
/* ------------------------------------------------------------------ */

/** Modelo simplificado do MVCC: versões de linha com quem criou e quem apagou. */
const SETUP_VERSOES = dedent(`
  CREATE TABLE transacoes (id INTEGER PRIMARY KEY, status TEXT NOT NULL CHECK (status IN ('ativa', 'confirmada', 'abortada')), confirmada_em INTEGER);
  CREATE TABLE versoes (conta INTEGER NOT NULL, saldo INTEGER NOT NULL, criada_por INTEGER NOT NULL REFERENCES transacoes(id), apagada_por INTEGER REFERENCES transacoes(id));
  INSERT INTO transacoes VALUES (1, 'confirmada', 10), (2, 'confirmada', 30), (3, 'abortada', NULL), (4, 'confirmada', 60), (5, 'ativa', NULL), (6, 'confirmada', 45), (7, 'confirmada', 55), (8, 'confirmada', 40);
  INSERT INTO versoes VALUES (1, 100, 1, 2), (1, 70, 2, NULL), (2, 200, 1, 3), (2, 999, 3, NULL), (3, 300, 1, 4), (3, 250, 4, NULL), (4, 400, 1, 5), (4, 0, 5, NULL), (5, 500, 6, NULL), (6, 600, 7, NULL), (7, 700, 1, 8);
`);

/** Clientes e pedidos de uma distribuidora (valores em centavos). */
const SETUP_PEDIDOS = dedent(`
  CREATE TABLE clientes (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, cidade TEXT);
  CREATE TABLE pedidos (id INTEGER PRIMARY KEY, cliente_id INTEGER NOT NULL REFERENCES clientes(id), valor_centavos INTEGER NOT NULL, feito_em TEXT NOT NULL);
  INSERT INTO clientes VALUES (1, 'Padaria Pão Quente', 'Recife'), (2, 'Mercadinho Bom Preço', 'Salvador'), (3, 'Oficina do Zé', 'Belém'), (4, 'Livraria Saber', 'Curitiba'), (5, 'Farmácia Vida', 'Manaus');
  INSERT INTO pedidos VALUES (1, 1, 15000, '2025-01-10'), (2, 1, 8000, '2025-02-03'), (3, 2, 23050, '2025-01-22'), (4, 3, 5000, '2024-12-30'), (5, 1, 12000, '2024-11-15'), (6, 4, 9990, '2025-03-01'), (7, 2, 1000, '2025-03-05'), (8, 4, 500, '2025-03-09');
`);

/** Conexão de teste em que outro caixa eletrônico debita da conta 1 entre o 1º e o 2º comando do aluno. */
const CAIXA_VIZINHO = dedent(`
  import sqlite3 as _sqlite3

  class _CaixaVizinho:
      def __init__(self, saldo_inicial, debito_vizinho=30):
          self._con = _sqlite3.connect(":memory:")
          self._con.execute("CREATE TABLE contas (id INTEGER PRIMARY KEY, saldo INTEGER NOT NULL)")
          self._con.execute("INSERT INTO contas VALUES (1, ?)", (saldo_inicial,))
          self._con.commit()
          self._comandos = 0
          self._vizinho = debito_vizinho
          self.vizinho_debitou = 0

      def execute(self, sql, params=()):
          if self._comandos == 1 and self._vizinho:
              cur = self._con.execute("UPDATE contas SET saldo = saldo - ? WHERE id = 1 AND saldo >= ?", (self._vizinho, self._vizinho))
              if cur.rowcount == 1:
                  self.vizinho_debitou = self._vizinho
              self._vizinho = 0
          self._comandos += 1
          return self._con.execute(sql, params)

      def __enter__(self):
          self._con.__enter__()
          return self

      def __exit__(self, *exc):
          return self._con.__exit__(*exc)

      def __getattr__(self, nome):
          return getattr(self._con, nome)

      def saldo(self):
          return self._con.execute("SELECT saldo FROM contas WHERE id = 1").fetchone()[0]
`);

const ESPERA_ERRO = dedent(`
  def _espera_erro(erro, f, *args, msg=""):
      try:
          f(*args)
      except erro:
          return
      raise AssertionError(msg)
`);

/** Banco de notas fiscais para conferir os planos do exercício de índices. */
const NOTAS_PLANOS = dedent(`
  import sqlite3 as _sqlite3
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
`);

/** Dados e referência por força bruta para o desafio do índice composto. */
const INDICE_TESTE = dedent(`
  def _espera_valueerror(f, *args, msg=""):
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
`);

/* ------------------------------------------------------------------ */
/* Transações concorrentes e níveis de isolamento                      */
/* ------------------------------------------------------------------ */

const isolamento = lesson({
  id: 'l7-isolamento-concorrencia',
  moduleId: 'm7-3',
  title: 'Transações concorrentes e níveis de isolamento',
  titleEn: 'Concurrent transactions and isolation levels',
  summary: 'O que dá errado quando duas transações mexem nos mesmos dados ao mesmo tempo (leitura suja, leitura não repetível, fantasma, atualização perdida e write skew), o que cada nível de isolamento garante no padrão SQL, no PostgreSQL e no SQLite, como o MVCC entrega instantâneos e como escrever código que não perde dinheiro: UPDATE atômico, FOR UPDATE, versão otimista e repetição.',
  minutes: 50,
  objectives: [
    'Reconhecer, num escalonamento de duas transações, leitura suja, leitura não repetível, leitura fantasma, atualização perdida e write skew',
    'Dizer o que READ COMMITTED, REPEATABLE READ e SERIALIZABLE garantem no padrão SQL e no PostgreSQL, e qual nível cada banco comum usa por padrão',
    'Explicar como o MVCC usa versões e instantâneos para que quem lê não bloqueie quem escreve',
    'Evitar a atualização perdida com UPDATE atômico condicional, bloqueio (FOR UPDATE), controle otimista por versão ou nível serializável com repetição',
  ],
  skills: ['bd-modelagem'],
  terms: [
    t('nível de isolamento', 'isolation level', 'Quanto uma transação fica protegida dos efeitos das transações concorrentes. O padrão SQL define quatro.', 'Read Committed is the default isolation level in PostgreSQL.'),
    t('escalonamento', 'schedule', 'A ordem em que o banco intercala as operações de transações concorrentes.'),
    t('serializável', 'serializable', 'Execução concorrente com o mesmo efeito de alguma execução em série, uma transação por vez.', 'Serializable isolation makes concurrent transactions behave as if they ran one at a time.'),
    t('leitura suja', 'dirty read', 'Ler um dado que outra transação escreveu e ainda não confirmou.'),
    t('leitura não repetível', 'non-repeatable read', 'Reler, na mesma transação, uma linha que outra transação alterou e confirmou no meio, e ver outro valor.'),
    t('leitura fantasma', 'phantom read', 'Repetir uma consulta com WHERE e receber outro conjunto de linhas, porque outra transação inseriu ou apagou linhas que satisfazem a condição.'),
    t('atualização perdida', 'lost update', 'Duas transações leem o mesmo valor, calculam um novo e gravam; a segunda escrita apaga a primeira.'),
    t('distorção de escrita', 'write skew', 'Duas transações leem os mesmos dados, decidem com base neles e escrevem linhas diferentes, quebrando juntas uma regra que cada uma respeitava.'),
    t('anomalia de serialização', 'serialization anomaly', 'Resultado de transações concorrentes que nenhuma ordem serial produziria.'),
    t('bloqueio', 'lock', 'Reserva de um recurso (uma linha, uma tabela) por uma transação; quem chega depois espera.', 'SELECT ... FOR UPDATE acquires a row-level lock on the returned rows.'),
    t('controle de concorrência multiversão', 'multiversion concurrency control (MVCC)', 'Guardar várias versões de cada linha para que cada transação leia as que estavam confirmadas no seu instantâneo.'),
    t('instantâneo', 'snapshot', 'A visão do banco que uma transação usa: o que já estava confirmado num certo momento.'),
    t('isolamento de instantâneo', 'snapshot isolation', 'Cada transação lê de um único instantâneo, e o primeiro a confirmar vence quando duas escrevem a mesma linha. É o REPEATABLE READ do PostgreSQL.'),
    t('controle otimista', 'optimistic concurrency control', 'Gravar só se ninguém mudou o dado desde a leitura (por exemplo, conferindo uma coluna de versão) e tentar de novo se mudou.'),
    t('falha de serialização', 'serialization failure', 'Erro com que o banco aborta uma transação para manter o isolamento (SQLSTATE 40001). A aplicação deve repetir a transação inteira.', 'ERROR: could not serialize access due to concurrent update'),
  ],
  stages: {
    conceito: [
      md(`
        Na lição anterior, o **I** de ACID coube numa frase: transações concorrentes não veem os estados intermediários umas das outras, "e há níveis de isolamento". Esta lição abre essa caixa, porque é nela que mora uma classe inteira de bugs que **não dá erro nenhum**: o saldo que fica errado, o assento de ônibus vendido duas vezes, o estoque que fica negativo.

        Cada transação, sozinha, pode estar perfeita. O problema aparece quando duas rodam **ao mesmo tempo** e o banco intercala as operações delas. Pense em dois Pix saindo de uma conta conjunta no mesmo segundo, cada um mandado por um titular: os dois leem o saldo de R$ 100, cada um calcula o novo saldo e grava. Um dos débitos some.

        O ideal seria que o resultado fosse sempre igual ao de alguma execução **uma depois da outra**: é o isolamento {{serializável|serializable}}. Ele custa espera e transações abortadas, então os bancos oferecem {{níveis de isolamento|isolation levels}} mais fracos, e os servidores mais usados não vêm em serializável por padrão: o PostgreSQL vem em READ COMMITTED. Para escrever código correto, você precisa saber quais anomalias o seu nível deixa passar e como se defender delas.
      `),
    ],
    explicacao: [
      md(`
        ### Escalonamento: operações intercaladas
        Uma transação é uma sequência de leituras e escritas. Quando várias rodam juntas, o banco intercala as operações delas numa certa ordem, o {{escalonamento|schedule}}. Um escalonamento é **serial** quando cada transação termina antes de a próxima começar, e **serializável** quando o efeito final é igual ao de algum escalonamento serial (qualquer um). O serial é seguro e lento; o trabalho do banco é deixar as transações se intercalarem sem produzir um resultado que nenhuma ordem serial produziria.

        ### As anomalias
        Cada anomalia é um jeito de a intercalação dar errado. As três primeiras são as que o padrão SQL usa para definir os níveis. As duas últimas ficaram de fora dessa definição; um artigo de 1995 que a criticou (*A Critique of ANSI SQL Isolation Levels*, de Berenson e colegas) mostrou por que elas importam, e são elas que mais aparecem em sistemas reais.

        - **{{Leitura suja|dirty read}}**: T2 lê um valor que T1 escreveu e **ainda não confirmou**. Se T1 desfizer tudo com ROLLBACK, T2 usou um valor que nunca existiu. Exemplo: o app mostra um saldo que já desconta um Pix que depois falhou e foi desfeito.
        - **{{Leitura não repetível|non-repeatable read}}**: T1 lê uma linha, T2 altera essa linha e confirma, e T1, ao ler de novo, vê outro valor. Exemplo: um relatório confere o saldo de uma conta duas vezes e cada leitura dá um número.
        - **{{Leitura fantasma|phantom read}}**: T1 repete uma consulta com WHERE e o **conjunto** de linhas mudou, porque T2 inseriu ou apagou linhas que satisfazem a condição. Exemplo: a contagem de reservas do assento 12 dá 0 e, logo depois, 1.
        - **{{Atualização perdida|lost update}}**: T1 e T2 leem o mesmo valor, cada uma calcula um novo a partir dele e grava; a segunda escrita apaga a primeira. Exemplo: os dois Pix da conta conjunta.
        - **{{Distorção de escrita|write skew}}**: T1 e T2 leem os mesmos dados, cada uma decide com base neles e escreve numa linha **diferente**; juntas, quebram uma regra que nenhuma quebraria sozinha. Exemplo: no hospital, a regra é ter pelo menos uma médica de plantão; Ana e Bia estão de plantão e pedem para sair ao mesmo tempo; cada transação vê "duas de plantão, posso sair", e o plantão fica vazio.

        ### Os quatro níveis do padrão SQL
        O padrão define cada nível pelas anomalias que ele proíbe. A tabela segue a da documentação do PostgreSQL, que acrescenta uma coluna para a {{anomalia de serialização|serialization anomaly}}: qualquer resultado que nenhuma ordem serial produziria. A atualização perdida e o write skew são casos dela.
      `),
      {
        type: 'table',
        head: ['Nível', 'Leitura suja', 'Leitura não repetível', 'Leitura fantasma', 'Anomalia de serialização'],
        rows: [
          ['READ UNCOMMITTED', 'permitida (mas não acontece no PostgreSQL)', 'possível', 'possível', 'possível'],
          ['READ COMMITTED', 'impossível', 'possível', 'possível', 'possível'],
          ['REPEATABLE READ', 'impossível', 'impossível', 'permitida (mas não acontece no PostgreSQL)', 'possível'],
          ['SERIALIZABLE', 'impossível', 'impossível', 'impossível', 'impossível'],
        ],
        caption: 'O padrão diz o mínimo que cada nível garante; um banco pode garantir mais. "Possível" quer dizer que o nível não impede a anomalia.',
      },
      md(`
        O nome do nível não conta a história toda, porque cada banco o implementa do seu jeito:

        - **PostgreSQL**: o padrão é READ COMMITTED, em que cada **comando** enxerga o que estava confirmado quando ele começou. READ UNCOMMITTED se comporta igual a READ COMMITTED. REPEATABLE READ usa um único instantâneo para a transação inteira (tirado no primeiro comando dela), técnica conhecida como {{isolamento de instantâneo|snapshot isolation}}. SERIALIZABLE acrescenta a detecção de conflitos do SSI (*Serializable Snapshot Isolation*): quando vê um padrão de leituras e escritas que poderia não ter equivalente serial, aborta uma das transações (às vezes, por precaução, sem que houvesse anomalia de fato).
        - **MySQL (InnoDB)**: o padrão é REPEATABLE READ, com regras próprias sobre o que cada comando enxerga. Mesmo nome, garantias diferentes: leia a documentação do banco que você usa.
        - **SQLite**: só existe um escritor por vez. Nas palavras da documentação, ele implementa transações serializáveis "serializando de fato as escritas": quem quer escrever espera a vez ou recebe o erro \`database is locked\`.

        ### Como o banco isola: bloqueios e versões
        Há duas ferramentas básicas. Um {{bloqueio|lock}} reserva uma linha (ou a tabela, ou o banco inteiro) para uma transação, e quem chega depois espera. É simples, mas faz leitores e escritores esperarem uns pelos outros.

        O {{controle de concorrência multiversão|multiversion concurrency control (MVCC)}}, usado pelo PostgreSQL, pelo InnoDB e pelo Oracle, guarda **várias versões** de cada linha. Um UPDATE não destrói a versão anterior: no PostgreSQL, ele marca a versão antiga como apagada e grava uma nova ao lado; no InnoDB e no Oracle, a versão antiga fica num registro de desfazer (*undo log*). Cada transação lê a partir de um {{instantâneo|snapshot}}, uma "foto" de quais transações já estavam confirmadas, e enxerga a versão certa para aquela foto. Por isso, como diz a documentação do PostgreSQL, ler nunca bloqueia escrever e escrever nunca bloqueia ler. Versões antigas que nenhuma transação enxerga mais são limpas depois (no PostgreSQL, pelo VACUUM). Duas transações que querem **escrever** a mesma linha continuam se bloqueando: a segunda espera a primeira terminar.

        ### Defesas que funcionam
      `),
      {
        type: 'table',
        head: ['Defesa', 'Como fica', 'Quando usar'],
        rows: [
          ['UPDATE atômico e condicional', '`UPDATE contas SET saldo = saldo - 30 WHERE id = 1 AND saldo >= 30` e conferir quantas linhas mudaram', 'sempre que a regra cabe num comando: ler, conferir e gravar viram uma coisa só. No READ COMMITTED do PostgreSQL, um segundo UPDATE na mesma linha espera o primeiro e reavalia o WHERE sobre a versão nova'],
          ['Bloqueio pessimista', '`SELECT ... FOR UPDATE` (PostgreSQL, MySQL) trava as linhas lidas até o fim da transação; no SQLite, `BEGIN IMMEDIATE` pega a vaga de escritor logo no começo', 'quando o programa precisa ler, pensar e depois gravar, e o conflito é frequente'],
          ['{{Controle otimista|optimistic concurrency control}} por versão', 'uma coluna `versao`; grave com `WHERE id = ? AND versao = ?` e some 1 à versão', 'quando o conflito é raro. Zero linhas afetadas quer dizer que alguém mudou antes: releia e tente de novo'],
          ['Restrição', '`UNIQUE (viagem, numero)`, `CHECK (saldo >= 0)`', 'o banco confere a regra de forma atômica. Resolve a reserva dupla quando cada reserva é uma linha nova (INSERT), caso que nenhum FOR UPDATE resolve: não há linha para travar antes de ela existir'],
          ['SERIALIZABLE com repetição', '`BEGIN ISOLATION LEVEL SERIALIZABLE` e um laço que repete a transação inteira se vier uma {{falha de serialização|serialization failure}} (SQLSTATE 40001)', 'quando as regras envolvem várias linhas, como no plantão; protege até contra o write skew sem você prever cada conflito'],
        ],
      },
      warn(`
        No módulo \`sqlite3\` do Python, no modo padrão (o legado, controlado por \`isolation_level\`), o BEGIN implícito só é enviado antes de um INSERT, UPDATE, DELETE ou REPLACE. Um SELECT que vem antes deles roda **fora** da transação, mesmo dentro de \`with con:\`. Num programa com várias conexões, a verificação feita por esse SELECT pode estar velha quando o UPDATE chegar. Para ler e escrever na mesma transação, abra-a você mesmo: conecte com \`isolation_level=None\`, execute \`BEGIN IMMEDIATE\` antes da leitura e \`COMMIT\` no fim (ou \`ROLLBACK\`, se der erro). No Python 3.12 ou mais novo, \`sqlite3.connect(..., autocommit=False)\` mantém sempre uma transação aberta, como pede a PEP 249.
      `, 'O SELECT que ficou de fora'),
      deep(`
        Em REPEATABLE READ e SERIALIZABLE, o PostgreSQL resolve certos conflitos **abortando** uma das transações, e isso vale até para o UPDATE atômico: se a linha foi alterada e confirmada por outra transação depois do seu instantâneo, o UPDATE recebe \`could not serialize access due to concurrent update\`. Nesses níveis, todo código que escreve precisa de um laço que repete a transação inteira (com um limite de tentativas). A documentação diz isso com todas as letras: aplicações que usam esses níveis precisam estar preparadas para repetir transações. E um detalhe de nomes: no Oracle, o nível chamado SERIALIZABLE é, na verdade, isolamento de instantâneo, e deixa o write skew passar.
      `, 'O preço dos níveis mais fortes'),
    ],
    exemplo: [
      md(`
        Rita e Júlio são titulares da mesma conta conjunta, com saldo de R$ 100. No mesmo segundo, Rita manda um Pix de R$ 30 e Júlio, um de R$ 50. O aplicativo faz o que parece natural: lê o saldo, confere se dá, calcula o novo valor e grava. O banco está em READ COMMITTED.
      `),
      {
        type: 'table',
        head: ['Instante', 'T1 (Pix de R$ 30)', 'T2 (Pix de R$ 50)', 'Saldo confirmado'],
        rows: [
          ['1', '`SELECT saldo` → 100', '', '100'],
          ['2', '', '`SELECT saldo` → 100', '100'],
          ['3', '`UPDATE contas SET saldo = 70`; `COMMIT`', '', '70'],
          ['4', '', '`UPDATE contas SET saldo = 50`; `COMMIT`', '50'],
        ],
        caption: 'Saíram R$ 80, mas o saldo caiu só R$ 50: o débito de T1 se perdeu. Nenhum comando deu erro, e cada transação, sozinha, estava certa.',
      },
      trace(`
        saldo = 100                # o valor confirmado no banco

        lido_t1 = saldo            # T1: SELECT saldo -> 100
        lido_t2 = saldo            # T2: SELECT saldo -> 100
        saldo = lido_t1 - 30       # T1: UPDATE ... SET saldo = 70; COMMIT
        saldo = lido_t2 - 50       # T2: UPDATE ... SET saldo = 50; COMMIT
        print("saldo final:", saldo, "(em série seria 20)")
      `, 'Cada transação calcula o novo saldo a partir da própria leitura. A leitura de T2 ficou velha no instante em que T1 gravou.'),
      md(`
        Agora o mesmo par de Pix com o UPDATE atômico e condicional, ainda em READ COMMITTED, no PostgreSQL:
      `),
      {
        type: 'table',
        head: ['Instante', 'T1 (Pix de R$ 30)', 'T2 (Pix de R$ 50)', 'Saldo confirmado'],
        rows: [
          ['1', '`UPDATE contas SET saldo = saldo - 30 WHERE id = 1 AND saldo >= 30`: trava a linha e cria a versão 70, ainda não confirmada', '', '100'],
          ['2', '', 'o mesmo UPDATE com 50: encontra a linha travada e **espera**', '100'],
          ['3', '`COMMIT`', 'acorda, pega a versão recém-confirmada (70), reavalia o WHERE (70 >= 50) e grava 20', '70'],
          ['4', '', '`COMMIT`', '20'],
        ],
        caption: 'O banco pôs as duas escritas na mesma linha em fila. Se o saldo inicial fosse R$ 60, o WHERE reavaliado daria falso e o UPDATE de T2 mudaria 0 linhas: o programa saberia que o Pix de Júlio foi recusado.',
      },
      md(`
        E se o banco estivesse em REPEATABLE READ, com o código de ler, calcular e gravar? No instante 4, T2 tentaria atualizar uma linha que outra transação alterou e confirmou depois do instantâneo de T2. O PostgreSQL recusa com \`ERROR: could not serialize access due to concurrent update\`, e T2 precisa recomeçar do zero: na segunda tentativa, ela lê 70 e grava 20. A atualização não se perde, mas o código precisa saber **repetir**.
      `),
    ],
    codigo: [
      md(`
        Aqui no navegador, o banco em memória vive numa conexão só, então não dá para ter duas transações simultâneas de verdade. Mas o controle otimista não precisa disso para ser demonstrado: basta que as duas **leituras** aconteçam antes das duas escritas, como no exemplo. Veja a reserva de assento numa viagem de ônibus, com uma coluna \`versao\`:
      `),
      py(`
        import sqlite3

        con = sqlite3.connect(":memory:")
        con.executescript("""
        CREATE TABLE assentos (
            viagem INTEGER, numero INTEGER, passageiro TEXT,
            versao INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (viagem, numero)
        );
        INSERT INTO assentos (viagem, numero) VALUES (1001, 12), (1001, 13);
        """)

        def ler(viagem, numero):
            return con.execute("SELECT passageiro, versao FROM assentos WHERE viagem = ? AND numero = ?",
                               (viagem, numero)).fetchone()

        def reservar(viagem, numero, passageiro, versao_lida):
            with con:  # commit no fim do bloco; rollback se houver exceção
                cur = con.execute(
                    "UPDATE assentos SET passageiro = ?, versao = versao + 1 "
                    "WHERE viagem = ? AND numero = ? AND versao = ? AND passageiro IS NULL",
                    (passageiro, viagem, numero, versao_lida))
            return cur.rowcount == 1  # 0 linhas: o assento mudou depois da nossa leitura

        # Ana e Caio abrem o app ao mesmo tempo: os dois veem o assento 12 livre, na versão 0
        _, versao_ana = ler(1001, 12)
        _, versao_caio = ler(1001, 12)
        print("Ana reservou o 12?", reservar(1001, 12, "Ana", versao_ana))
        print("Caio reservou o 12?", reservar(1001, 12, "Caio", versao_caio))
        print("assento 12:", ler(1001, 12))

        # Caio relê, vê que perdeu o 12 e tenta o 13 com a versão que acabou de ler
        _, versao = ler(1001, 13)
        print("Caio reservou o 13?", reservar(1001, 13, "Caio", versao))
        print("assento 13:", ler(1001, 13))
      `, { caption: 'O UPDATE só grava se a versão ainda é a que foi lida. O segundo a gravar muda 0 linhas, fica sabendo do conflito e pode tentar de novo, em vez de sobrescrever a reserva de outra pessoa.' }),
      md(`
        Num PostgreSQL de verdade, as outras defesas ficam assim (para rodar no seu computador, não neste navegador):
      `),
      code('sql', `
        -- 1. Operação atômica: funciona em qualquer nível de isolamento.
        --    O programa confere quantas linhas mudaram (0 = saldo insuficiente).
        UPDATE contas SET saldo = saldo - 30 WHERE id = 1 AND saldo >= 30;

        -- 2. Bloqueio pessimista: trava a linha até o fim da transação.
        BEGIN;
        SELECT saldo FROM contas WHERE id = 1 FOR UPDATE;  -- quem vier depois espera aqui
        UPDATE contas SET saldo = 70 WHERE id = 1;
        COMMIT;

        -- 3. Serializável: o banco detecta o conflito e aborta uma das transações.
        BEGIN ISOLATION LEVEL SERIALIZABLE;
        SELECT saldo FROM contas WHERE id = 1;
        UPDATE contas SET saldo = 70 WHERE id = 1;
        COMMIT;  -- o UPDATE ou o COMMIT pode falhar com SQLSTATE 40001: repita a transação inteira
      `, 'Três formas de fazer o débito no PostgreSQL sem perder atualizações.'),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e7-iso-anomalia',
          kind: 'mcq',
          prompt: 'Um relatório abre uma transação e lê o saldo da conta 7: R$ 500. Enquanto isso, outra transação registra um Pix de R$ 150 dessa conta e confirma. O relatório, ainda na mesma transação, lê de novo a conta 7 e vê R$ 350. Que anomalia é essa?',
          difficulty: 'facil',
          skills: ['bd-modelagem'],
          hints: [
            'O Pix já estava confirmado quando o relatório leu pela segunda vez?',
            'O que mudou entre as duas leituras: o valor de uma linha que já existia ou quais linhas existem?',
          ],
          explanation: 'É uma leitura não repetível: a mesma linha, lida duas vezes na mesma transação, mudou porque outra transação confirmou uma alteração entre as leituras. No READ COMMITTED (o padrão do PostgreSQL), cada comando enxerga o que estava confirmado quando começou, e por isso a segunda leitura vê o Pix. Em REPEATABLE READ, a transação inteira usa o mesmo instantâneo e as duas leituras dariam R$ 500.',
          options: [
            { text: 'Leitura suja', feedback: 'Leitura suja seria ver o Pix **antes** do COMMIT dele. Aqui o Pix já estava confirmado quando o relatório releu.' },
            { text: 'Leitura não repetível', correct: true, feedback: 'Isso: a mesma linha, relida na mesma transação, tem outro valor porque outra transação confirmou uma mudança no meio. READ COMMITTED deixa acontecer; REPEATABLE READ impede.' },
            { text: 'Leitura fantasma', feedback: 'O fantasma é sobre o **conjunto** de linhas de um WHERE mudar: linhas novas ou removidas. Aqui é a mesma linha, com outro valor.' },
            { text: 'Atualização perdida', feedback: 'O relatório só leu. Para perder uma atualização, duas transações precisam gravar, e uma escrita apagar a outra.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e7-iso-escala',
          kind: 'predict',
          lang: 'python',
          prompt: 'O código simula três transações sobre o mesmo saldo. `"gravar"` grava um valor calculado a partir da leitura que a transação fez antes (ler, calcular, gravar); `"atomico"` faz como `UPDATE ... SET saldo = saldo - valor`, usando o saldo do momento. O que é impresso?',
          difficulty: 'intermediario',
          skills: ['bd-modelagem'],
          hints: [
            'Quando T1 lê, quanto vale o saldo? Esse valor guardado em `lido` muda depois?',
            'Em "gravar", a conta usa `banco["saldo"]` ou `lido[tx]`?',
            'Siga linha a linha e anote `banco["saldo"]` depois de cada passo.',
          ],
          explanation: 'T1 lê 100 e guarda. T2 debita 50 de forma atômica (100 → 50). T1 grava 100 − 30 = 70, calculado sobre a leitura velha: o débito de T2 some. T3 debita 10 do valor atual (70 → 60). Em série, o saldo terminaria em 100 − 50 − 30 − 10 = 10. Repare que T2 fez a coisa certa e mesmo assim perdeu o débito: basta **um** caminho de escrita do tipo ler, calcular e gravar para estragar os outros. Por isso a defesa precisa valer em todo lugar do código que grava naquela coluna.',
          code: dedent(`
            banco = {"saldo": 100}
            lido = {}

            def passo(tx, op, valor=0):
                if op == "ler":
                    lido[tx] = banco["saldo"]
                elif op == "gravar":    # grava o que calculou a partir da própria leitura
                    banco["saldo"] = lido[tx] - valor
                elif op == "atomico":   # como UPDATE contas SET saldo = saldo - valor
                    banco["saldo"] = banco["saldo"] - valor
                print(tx, op, banco["saldo"])

            passo("T1", "ler")
            passo("T2", "atomico", 50)
            passo("T1", "gravar", 30)
            passo("T3", "atomico", 10)
            print("final:", banco["saldo"])
          `),
          answer: 'T1 ler 100\nT2 atomico 50\nT1 gravar 70\nT3 atomico 60\nfinal: 60',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e7-iso-debito',
          kind: 'fix',
          lang: 'python',
          prompt: dedent(`
            A função abaixo debita de uma conta, mas tem uma condição de corrida: entre o SELECT e o UPDATE, outro cliente pode debitar da mesma conta, e então um dos débitos se perde ou o saldo fica negativo. Corrija \`debitar(con, conta_id, valor)\`:

            - devolve \`True\` se debitou e \`False\` se o saldo não cobre o valor ou se a conta não existe;
            - lança \`ValueError\` se \`valor <= 0\`, sem mexer no banco;
            - confirma a mudança (commit) antes de devolver;
            - o saldo nunca pode ficar negativo, e nenhum débito pode se perder.

            A tabela é \`contas(id, saldo)\`. Os testes usam uma conexão especial: entre o seu 1º e o seu 2º comando, **outro caixa eletrônico debita R$ 30 da conta 1** (com um UPDATE condicional) e confirma.
          `),
          difficulty: 'intermediario',
          skills: ['bd-modelagem', 'bd-sql'],
          hints: [
            'O que o outro caixa pode fazer entre o seu SELECT e o seu UPDATE? Que valor o seu UPDATE grava, então?',
            'Dá para o próprio UPDATE conferir se o saldo cobre o valor, no mesmo instante em que grava?',
            'Depois de um UPDATE, como o Python diz quantas linhas ele mudou?',
            'Se quiser manter o SELECT, a gravação precisa falhar quando o saldo mudou desde a leitura. E o que você faz quando ela falha?',
          ],
          explanation: 'O UPDATE condicional `UPDATE contas SET saldo = saldo - ? WHERE id = ? AND saldo >= ?` junta leitura, verificação e escrita num comando só, que o banco executa de forma atômica, e `cur.rowcount` diz se a linha mudou (1) ou não (0: saldo insuficiente ou conta inexistente). Não sobra intervalo entre ler e gravar para outro cliente entrar. A versão otimista (SELECT, depois UPDATE com `AND saldo = ?` igual ao valor lido, repetindo quando mudar 0 linhas) também passa, só que é mais longa. Conferir com SELECT e depois gravar `saldo = saldo - ?` não basta: a conferência fica velha, e o saldo pode ficar negativo.',
          starter: dedent(`
            def debitar(con, conta_id, valor):
                # condição de corrida: entre este SELECT e o UPDATE, outro cliente pode debitar
                linha = con.execute("SELECT saldo FROM contas WHERE id = ?", (conta_id,)).fetchone()
                saldo = linha[0]
                if saldo < valor:
                    return False
                con.execute("UPDATE contas SET saldo = ? WHERE id = ?", (saldo - valor, conta_id))
                con.commit()
                return True
          `),
          solution: dedent(`
            def debitar(con, conta_id, valor):
                if valor <= 0:
                    raise ValueError("o valor do débito precisa ser positivo")
                cur = con.execute(
                    "UPDATE contas SET saldo = saldo - ? WHERE id = ? AND saldo >= ?",
                    (valor, conta_id, valor),
                )
                con.commit()
                return cur.rowcount == 1
          `),
          tests: [
            {
              name: 'outro caixa debita no meio',
              code: CAIXA_VIZINHO + '\n' + dedent(`
                con = _CaixaVizinho(100)
                ok = debitar(con, 1, 40)
                final = con.saldo()
                esperado = 100 - 40 - con.vizinho_debitou
                assert ok is True, f"havia saldo para os dois débitos (os seus 40 e os 30 do outro caixa), mas debitar devolveu {ok!r}. Se a sua gravação depende do valor lido, o que fazer quando outro cliente mudou a linha antes?"
                assert final == esperado, f"saldo final {final}, esperado {esperado}: o outro caixa debitou {con.vizinho_debitou} e você, 40. Um dos débitos se perdeu, porque o seu UPDATE gravou um valor calculado a partir de uma leitura velha"
              `),
            },
            {
              name: 'o saldo nunca fica negativo',
              code: CAIXA_VIZINHO + '\n' + dedent(`
                con = _CaixaVizinho(100)
                ok = debitar(con, 1, 80)
                final = con.saldo()
                assert final >= 0, f"o saldo ficou {final}: entre a sua verificação e o seu débito, o outro caixa sacou 30. A verificação e o débito precisam ser uma coisa só"
                assert final == 100 - (80 if ok else 0) - con.vizinho_debitou, f"o saldo final {final} não fecha com os débitos feitos (o seu: {80 if ok else 0}; o do outro caixa: {con.vizinho_debitou})"
                assert ok or con.vizinho_debitou, "nenhum dos dois débitos aconteceu, mas o primeiro deles sempre cabia no saldo de 100"
              `),
            },
            {
              name: 'saldo insuficiente',
              code: CAIXA_VIZINHO + '\n' + dedent(`
                con = _CaixaVizinho(50, debito_vizinho=0)
                ok = debitar(con, 1, 80)
                assert ok is False, f"o saldo de 50 não cobre 80: debitar deveria devolver False, e devolveu {ok!r}"
                assert con.saldo() == 50, f"um débito recusado não pode mudar o saldo, mas ele ficou {con.saldo()}"
              `),
            },
            {
              name: 'valor exato zera a conta',
              code: CAIXA_VIZINHO + '\n' + dedent(`
                con = _CaixaVizinho(80, debito_vizinho=0)
                ok = debitar(con, 1, 80)
                assert ok is True and con.saldo() == 0, f"com saldo 80, um débito de 80 é permitido e zera a conta; veio {ok!r} e saldo {con.saldo()}. Confira se a condição é >= ou >"
              `),
            },
            {
              name: 'conta inexistente',
              code: CAIXA_VIZINHO + '\n' + dedent(`
                con = _CaixaVizinho(100, debito_vizinho=0)
                ok = debitar(con, 99, 10)
                assert ok is False, f"a conta 99 não existe: debitar deveria devolver False, e devolveu {ok!r}"
                assert con.saldo() == 100, "debitar da conta 99 não pode mexer na conta 1"
              `),
            },
            {
              name: 'o valor precisa ser positivo',
              code: CAIXA_VIZINHO + '\n' + dedent(`
                con = _CaixaVizinho(100, debito_vizinho=0)
                try:
                    debitar(con, 1, -50)
                    assert False, "debitar(con, 1, -50) deveria lançar ValueError: um débito negativo viraria um crédito de 50"
                except ValueError:
                    pass
                assert con.saldo() == 100, f"depois do ValueError, o saldo deveria continuar 100, mas ficou {con.saldo()}"
              `),
            },
            {
              name: 'a mudança é confirmada',
              code: CAIXA_VIZINHO + '\n' + dedent(`
                con = _CaixaVizinho(100, debito_vizinho=0)
                debitar(con, 1, 10)
                assert not con.in_transaction, "debitar terminou com uma transação aberta: confirme (commit) antes de devolver, senão o débito some quando a conexão fechar"
                ok = debitar(con, 1, 10)
                assert ok is True and con.saldo() == 80, f"dois débitos seguidos de 10 deveriam deixar 80; ficou {con.saldo()}"
              `),
            },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e7-iso-plantao',
          kind: 'mcq',
          prompt: dedent(`
            No hospital, a regra é ter pelo menos uma médica de plantão. Ana e Bia estão de plantão e, ao mesmo tempo, cada uma pede para sair. O pedido de cada uma roda assim:

            \`\`\`sql
            BEGIN;
            SELECT COUNT(*) FROM plantao WHERE turno = 42 AND de_plantao;  -- as duas veem 2
            -- se for 2 ou mais, pode sair:
            UPDATE plantao SET de_plantao = false WHERE turno = 42 AND medica = 'Ana';  -- ou 'Bia'
            COMMIT;
            \`\`\`

            No PostgreSQL, qual é o nível de isolamento **mais fraco** em que esse código, sem nenhuma outra mudança, nunca deixa o plantão vazio?
          `),
          difficulty: 'avancado',
          skills: ['bd-modelagem'],
          hints: [
            'As duas transações escrevem na mesma linha?',
            'O isolamento de instantâneo detecta duas escritas na mesma linha. Aqui, o conflito está entre o que uma transação leu e o que a outra escreveu.',
          ],
          explanation: 'É o write skew: cada transação lê o mesmo conjunto (as médicas de plantão), decide com base nele e escreve numa linha diferente. READ COMMITTED e REPEATABLE READ deixam passar, porque não há duas escritas na mesma linha para detectar. No SERIALIZABLE, o PostgreSQL acompanha também o que cada transação leu, percebe que cada uma leu o que a outra escreveu e aborta uma delas com SQLSTATE 40001; a aplicação repete a transação e, na segunda vez, conta 1 e não sai. Sem SERIALIZABLE, a saída é travar as linhas lidas: `SELECT medica FROM plantao WHERE turno = 42 AND de_plantao FOR UPDATE` (o FOR UPDATE não pode ser usado junto com COUNT) e contar no programa.',
          options: [
            { text: 'READ COMMITTED', feedback: 'Cada SELECT vê o que estava confirmado quando começou. As duas contam 2 antes de qualquer UPDATE ser confirmado, e as duas saem.' },
            { text: 'REPEATABLE READ', feedback: 'Esse nível é isolamento de instantâneo: cada transação conta 2 no seu instantâneo e, como elas atualizam linhas **diferentes**, não há conflito de escrita para detectar. As duas confirmam.' },
            { text: 'SERIALIZABLE', correct: true, feedback: 'Isso: o SSI percebe que cada transação leu o que a outra escreveu, um ciclo sem ordem serial possível, e aborta uma delas. Repetida, ela conta 1 e não sai.' },
            { text: 'Nenhum: só uma restrição UNIQUE resolveria', feedback: 'UNIQUE não expressa "pelo menos uma". E existe nível que resolve; além dele, também resolveria travar as linhas lidas com FOR UPDATE, fazendo a segunda transação esperar a primeira.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e7-iso-versoes',
          kind: 'sql',
          prompt: dedent(`
            Num modelo simplificado do MVCC do PostgreSQL, cada versão de linha guarda quem a criou e quem a apagou (um UPDATE apaga a versão velha e cria uma nova):

            - \`transacoes(id, status, confirmada_em)\`: \`status\` é \`'ativa'\`, \`'confirmada'\` ou \`'abortada'\`; \`confirmada_em\` é o instante do COMMIT (NULL se não confirmou);
            - \`versoes(conta, saldo, criada_por, apagada_por)\`: \`apagada_por\` é NULL se ninguém apagou aquela versão.

            Um leitor tirou o instantâneo no **instante 50**. Para ele, uma versão é visível quando a transação que a criou foi confirmada até o instante 50 **e** ninguém a apagou ou quem a apagou ainda não estava confirmado no instante 50 (está ativa, abortou ou confirmou depois). Liste \`conta\` e \`saldo\` das versões visíveis, em ordem de conta.
          `),
          difficulty: 'avancado',
          skills: ['bd-modelagem', 'bd-joins'],
          hints: [
            'Cada versão depende de duas transações: a que criou e a que apagou. Quantas vezes a tabela transacoes precisa entrar na consulta?',
            'Nem toda versão foi apagada. Que tipo de JOIN mantém a versão quando apagada_por é NULL?',
            'Escreva a condição "a versão continua viva" do lado de quem apagou e teste-a com a linha toda NULL: quanto vale uma comparação com NULL?',
            'Outra saída: NOT EXISTS de uma transação confirmada até 50 que apagou a versão.',
          ],
          explanation: "SELECT v.conta, v.saldo FROM versoes v JOIN transacoes c ON c.id = v.criada_por LEFT JOIN transacoes a ON a.id = v.apagada_por WHERE c.status = 'confirmada' AND c.confirmada_em <= 50 AND (a.id IS NULL OR a.status <> 'confirmada' OR a.confirmada_em > 50) ORDER BY v.conta; A transação que criou entra com JOIN e precisa estar confirmada até 50: isso esconde as versões de transações ativas (não há leitura suja), abortadas e confirmadas depois do instantâneo. A que apagou entra com LEFT JOIN, porque a maioria das versões nunca foi apagada; a versão continua visível se `a.id IS NULL` ou se quem apagou não estava confirmado no instante 50. Sem o `a.id IS NULL`, as comparações com NULL dão UNKNOWN e as versões vivas somem. O resultado tem uma versão por conta, cada uma do jeito que estava no instante 50. O PostgreSQL de verdade guarda essas duas informações em colunas ocultas de cada linha, `xmin` e `xmax`, e decide a visibilidade pela lista de transações em andamento no instantâneo, em vez de um relógio.",
          setup: SETUP_VERSOES,
          starter: 'SELECT conta, saldo FROM versoes ORDER BY conta;',
          solution: "SELECT v.conta, v.saldo FROM versoes v JOIN transacoes c ON c.id = v.criada_por LEFT JOIN transacoes a ON a.id = v.apagada_por WHERE c.status = 'confirmada' AND c.confirmada_em <= 50 AND (a.id IS NULL OR a.status <> 'confirmada' OR a.confirmada_em > 50) ORDER BY v.conta;",
          ordered: true,
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e7-iso-mvcc',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Implemente um pequeno banco chave-valor com **isolamento de instantâneo** (o REPEATABLE READ do PostgreSQL). Cada chave guarda a lista das suas versões confirmadas, como pares \`(instante, valor)\`; um relógio inteiro começa em 0, e os dados iniciais são versões do instante 0.

            - \`begin()\`: devolve um id novo (inteiro) e anota o instante atual do relógio como o instantâneo da transação.
            - \`ler(tx, chave)\`: se a transação já escreveu a chave, devolve o que ela escreveu; senão, a versão mais recente confirmada **até o instante do instantâneo**; \`None\` se não havia nenhuma.
            - \`escrever(tx, chave, valor)\`: guarda numa área privada da transação; ninguém mais vê antes do commit.
            - \`commit(tx)\`: se alguma chave que a transação escreveu ganhou uma versão confirmada **depois** do instantâneo dela, a transação é descartada e o commit lança \`ConflitoDeEscrita\` (vence quem confirma primeiro). Senão, avança o relógio em 1 e publica todas as escritas como versões desse instante.
            - \`rollback(tx)\`: descarta a transação.
            - Usar uma transação que não está ativa (que nunca existiu, já confirmou, foi desfeita ou levou conflito) lança \`ValueError\`.

            Só escritas na mesma chave entram em conflito; leituras não.
          `),
          difficulty: 'desafio',
          skills: ['bd-modelagem', 'poo-classes'],
          hints: [
            'Que informações cada transação ativa precisa carregar? Pense no instante do instantâneo e nas escritas ainda não publicadas.',
            'Para ler no instantâneo, percorra as versões da chave da mais nova para a mais antiga. Qual é a primeira que serve?',
            'No commit, como descobrir se outra transação confirmou a mesma chave depois do seu begin? Olhe o instante da versão mais nova de cada chave escrita.',
            'Atomicidade: confira todas as chaves antes de publicar qualquer uma.',
            'Um leitor antigo precisa continuar vendo a versão dele: nunca apague nem sobrescreva versões.',
          ],
          explanation: 'Cada transação guarda o instante do instantâneo e um dicionário de escritas privadas. Ler procura primeiro nas próprias escritas e depois a versão mais nova com instante menor ou igual ao do instantâneo. Daí vêm as garantias: não há leitura suja (escritas não confirmadas não estão nas versões), a leitura se repete (versões novas têm instante maior) e não há fantasma (uma chave criada depois não tem versão visível). O commit aplica a regra "vence quem confirma primeiro", que transforma a atualização perdida em erro, e só publica depois de conferir todas as chaves. O teste do plantão mostra o limite do modelo: as duas transações escrevem chaves diferentes, as duas confirmam, e o write skew passa. Para pegá-lo, o banco teria de acompanhar também o que cada transação leu, que é o que o SERIALIZABLE do PostgreSQL (SSI) faz. Bancos reais ainda apagam as versões que nenhum instantâneo ativo enxerga mais (o VACUUM do PostgreSQL).',
          starter: dedent(`
            class ConflitoDeEscrita(Exception):
                pass


            class BancoMVCC:
                def __init__(self, dados):
                    # dados: dicionário chave -> valor, confirmados no instante 0.
                    # Guarde, para cada chave, a lista de versões (instante, valor).
                    pass

                def begin(self):
                    # devolve um id novo e anota o instante do instantâneo da transação
                    pass

                def ler(self, tx, chave):
                    # primeiro as escritas da própria tx; senão, a versão mais recente
                    # confirmada até o instante em que tx começou (None se não havia)
                    pass

                def escrever(self, tx, chave, valor):
                    # guarda numa área privada da tx: ninguém mais vê antes do commit
                    pass

                def commit(self, tx):
                    # conflito (chave escrita com versão confirmada depois do início de tx):
                    # descarte a tx e lance ConflitoDeEscrita. Senão, avance o relógio e publique.
                    pass

                def rollback(self, tx):
                    # descarta a tx
                    pass
          `),
          solution: dedent(`
            class ConflitoDeEscrita(Exception):
                pass


            class BancoMVCC:
                def __init__(self, dados):
                    self.relogio = 0
                    # chave -> versões (instante da confirmação, valor), da mais antiga para a mais nova
                    self.versoes = {chave: [(0, valor)] for chave, valor in dados.items()}
                    self.ativas = {}
                    self.proximo_id = 1

                def _ativa(self, tx):
                    if tx not in self.ativas:
                        raise ValueError(f"a transação {tx} não está ativa")
                    return self.ativas[tx]

                def begin(self):
                    tx = self.proximo_id
                    self.proximo_id += 1
                    self.ativas[tx] = {"inicio": self.relogio, "escritas": {}}
                    return tx

                def ler(self, tx, chave):
                    t = self._ativa(tx)
                    if chave in t["escritas"]:
                        return t["escritas"][chave]
                    for instante, valor in reversed(self.versoes.get(chave, [])):
                        if instante <= t["inicio"]:
                            return valor
                    return None

                def escrever(self, tx, chave, valor):
                    self._ativa(tx)["escritas"][chave] = valor

                def commit(self, tx):
                    t = self._ativa(tx)
                    del self.ativas[tx]
                    for chave in t["escritas"]:
                        historico = self.versoes.get(chave, [])
                        if historico and historico[-1][0] > t["inicio"]:
                            raise ConflitoDeEscrita(f"{chave} mudou depois do início da transação {tx}")
                    self.relogio += 1
                    for chave, valor in t["escritas"].items():
                        self.versoes.setdefault(chave, []).append((self.relogio, valor))

                def rollback(self, tx):
                    self._ativa(tx)
                    del self.ativas[tx]
          `),
          tests: [
            {
              name: 'lê os dados iniciais e as próprias escritas',
              code: ESPERA_ERRO + '\n' + dedent(`
                b = BancoMVCC({"a": 1})
                t = b.begin()
                assert isinstance(t, int), f"begin() deveria devolver o id (um inteiro) da transação; veio {t!r}"
                assert b.ler(t, "a") == 1, f"a transação deveria ler o valor inicial 1; leu {b.ler(t, 'a')!r}"
                b.escrever(t, "a", 5)
                assert b.ler(t, "a") == 5, "depois de escrever 5, a própria transação lê 5: ela vê as próprias escritas"
                assert b.ler(t, "x") is None, "uma chave que não existe no instantâneo vale None"
                b.commit(t)
                t2 = b.begin()
                assert t2 != t, "cada begin() devolve um id novo"
                assert b.ler(t2, "a") == 5, "depois do commit, uma transação nova vê o 5"
              `),
            },
            {
              name: 'sem leitura suja',
              code: ESPERA_ERRO + '\n' + dedent(`
                b = BancoMVCC({"a": 1})
                t1 = b.begin()
                b.escrever(t1, "a", 99)
                t2 = b.begin()
                assert b.ler(t2, "a") == 1, f"t2 leu {b.ler(t2, 'a')!r}: o 99 de t1 ainda não foi confirmado, e ninguém mais pode vê-lo (seria uma leitura suja)"
                b.commit(t1)
                assert b.ler(t2, "a") == 1, "t2 começou antes do commit de t1: o instantâneo dela continua com 1"
                t3 = b.begin()
                assert b.ler(t3, "a") == 99, "t3 começou depois do commit de t1 e deveria ver 99"
              `),
            },
            {
              name: 'leitura repetível e sem fantasma',
              code: ESPERA_ERRO + '\n' + dedent(`
                b = BancoMVCC({"a": 1})
                t1 = b.begin()
                assert b.ler(t1, "a") == 1, "t1 deveria ler o valor inicial 1"
                t2 = b.begin()
                b.escrever(t2, "a", 2)
                b.escrever(t2, "nova", 10)
                b.commit(t2)
                assert b.ler(t1, "a") == 1, f"t1 releu e veio {b.ler(t1, 'a')!r}: dentro de t1, a mesma leitura deve dar o mesmo valor, porque o instantâneo é do início de t1"
                assert b.ler(t1, "nova") is None, "a chave criada por t2 depois do início de t1 não existe no instantâneo de t1"
              `),
            },
            {
              name: 'um leitor antigo ainda vê a versão dele',
              code: ESPERA_ERRO + '\n' + dedent(`
                b = BancoMVCC({"a": 1})
                leitor = b.begin()
                for i in range(2, 52):
                    t = b.begin()
                    b.escrever(t, "a", i)
                    b.commit(t)
                assert b.ler(leitor, "a") == 1, f"depois de 50 confirmações, o leitor que começou antes de todas leu {b.ler(leitor, 'a')!r} em vez de 1: não apague nem sobrescreva versões antigas"
                novo = b.begin()
                assert b.ler(novo, "a") == 51, f"uma transação nova deveria ver a versão mais recente, 51; viu {b.ler(novo, 'a')!r}"
              `),
            },
            {
              name: 'atualização perdida vira erro',
              code: ESPERA_ERRO + '\n' + dedent(`
                b = BancoMVCC({"saldo": 100})
                t1 = b.begin()
                t2 = b.begin()
                s1 = b.ler(t1, "saldo")
                s2 = b.ler(t2, "saldo")
                b.escrever(t1, "saldo", s1 - 30)
                b.commit(t1)
                b.escrever(t2, "saldo", s2 - 50)
                _espera_erro(ConflitoDeEscrita, b.commit, t2, msg="t2 gravou um saldo calculado sobre uma leitura velha, e t1 confirmou outra versão do saldo depois do início de t2: o commit de t2 deveria lançar ConflitoDeEscrita")
                t3 = b.begin()
                assert b.ler(t3, "saldo") == 70, f"depois do conflito, vale o saldo de t1 (70); veio {b.ler(t3, 'saldo')!r}"
                _espera_erro(ValueError, b.ler, t2, "saldo", msg="depois do conflito, t2 foi descartada: usá-la de novo deveria lançar ValueError")
              `),
            },
            {
              name: 'vence quem confirma primeiro',
              code: ESPERA_ERRO + '\n' + dedent(`
                b = BancoMVCC({"a": 0})
                t1 = b.begin()
                t2 = b.begin()
                b.escrever(t1, "a", 1)
                b.escrever(t2, "a", 2)
                b.commit(t2)
                _espera_erro(ConflitoDeEscrita, b.commit, t1, msg="t1 escreveu primeiro, mas t2 confirmou primeiro: o conflito é de quem confirma depois (t1)")
                assert b.ler(b.begin(), "a") == 2, "depois do conflito de t1, vale o valor de t2 (2)"
              `),
            },
            {
              name: 'sem conflito com quem confirmou antes do begin',
              code: ESPERA_ERRO + '\n' + dedent(`
                b = BancoMVCC({"a": 0})
                t1 = b.begin()
                b.escrever(t1, "a", 1)
                b.commit(t1)
                t2 = b.begin()
                b.escrever(t2, "a", b.ler(t2, "a") + 1)
                b.commit(t2)
                t3 = b.begin()
                b.commit(t3)
                assert b.ler(b.begin(), "a") == 2, "t2 começou depois do commit de t1, então não há conflito: o valor final é 2"
              `),
            },
            {
              name: 'conflito descarta todas as escritas da transação',
              code: ESPERA_ERRO + '\n' + dedent(`
                b = BancoMVCC({"a": 0, "b": 0})
                t1 = b.begin()
                t2 = b.begin()
                b.escrever(t1, "a", 1)
                b.commit(t1)
                b.escrever(t2, "b", 7)
                b.escrever(t2, "a", 7)
                _espera_erro(ConflitoDeEscrita, b.commit, t2, msg="t2 escreveu em a, que t1 confirmou depois do início de t2: o commit de t2 deveria lançar ConflitoDeEscrita")
                t3 = b.begin()
                assert b.ler(t3, "b") == 0, f"t2 foi descartada, então nada dela pode aparecer; mas b ficou {b.ler(t3, 'b')!r}. Confira todas as chaves antes de publicar qualquer uma (atomicidade)"
                assert b.ler(t3, "a") == 1, "a deveria ter o valor de t1 (1)"
              `),
            },
            {
              name: 'write skew passa (é o limite do instantâneo)',
              code: ESPERA_ERRO + '\n' + dedent(`
                b = BancoMVCC({"ana": True, "bia": True})
                t1 = b.begin()
                t2 = b.begin()
                if b.ler(t1, "ana") and b.ler(t1, "bia"):
                    b.escrever(t1, "ana", False)
                if b.ler(t2, "ana") and b.ler(t2, "bia"):
                    b.escrever(t2, "bia", False)
                try:
                    b.commit(t1)
                    b.commit(t2)
                except ConflitoDeEscrita:
                    raise AssertionError("t1 e t2 escreveram chaves diferentes: pela regra pedida (só escrita contra escrita na mesma chave), as duas confirmam. É exatamente o write skew que o isolamento de instantâneo deixa passar")
                t3 = b.begin()
                assert (b.ler(t3, "ana"), b.ler(t3, "bia")) == (False, False), "as duas saídas deveriam ter sido publicadas"
              `),
            },
            {
              name: 'rollback e transações encerradas',
              code: ESPERA_ERRO + '\n' + dedent(`
                b = BancoMVCC({"a": 1})
                t1 = b.begin()
                b.escrever(t1, "a", 50)
                b.rollback(t1)
                assert b.ler(b.begin(), "a") == 1, "rollback descarta as escritas: a continua 1"
                _espera_erro(ValueError, b.ler, t1, "a", msg="t1 já terminou (rollback): ler(t1, ...) deveria lançar ValueError")
                _espera_erro(ValueError, b.commit, t1, msg="t1 já terminou (rollback): commit(t1) deveria lançar ValueError")
                t2 = b.begin()
                b.commit(t2)
                _espera_erro(ValueError, b.commit, t2, msg="confirmar duas vezes a mesma transação deveria lançar ValueError")
                _espera_erro(ValueError, b.escrever, 999, "a", 0, msg="a transação 999 nunca existiu: escrever deveria lançar ValueError")
              `),
            },
          ],
        },
      },
    ],
    projeto: [
      md(`
        **Sistema de cadastro (parte 6, concorrência)**: dê a cada disciplina um limite de vagas e faça a matrícula com um UPDATE condicional (\`UPDATE disciplinas SET vagas = vagas - 1 WHERE id = ? AND vagas > 0\`), conferindo \`rowcount\` na mesma transação que insere a matrícula. Garanta com \`UNIQUE (aluno_id, disciplina_id)\` que ninguém se matricule duas vezes na mesma disciplina. Escreva um teste em que dois alunos disputam a última vaga, com as duas leituras antes das duas escritas, como no exemplo do assento.
      `),
      { type: 'project', projectId: 'p3-cadastro' },
    ],
    revisao: [
      md(`
        - Escalonamento serializável: o efeito é igual ao de alguma execução em série. É o ideal, e não é o padrão dos bancos.
        - Anomalias: leitura suja (dado não confirmado), leitura não repetível (a mesma linha muda), fantasma (o conjunto de linhas muda), atualização perdida (uma escrita apaga a outra) e write skew (escritas em linhas diferentes quebram juntas uma regra).
        - PostgreSQL: READ COMMITTED por padrão (instantâneo por comando); REPEATABLE READ é isolamento de instantâneo; SERIALIZABLE (SSI) aborta transações com SQLSTATE 40001, e a aplicação repete. MySQL/InnoDB: REPEATABLE READ por padrão. SQLite: um escritor por vez.
        - MVCC: UPDATE cria versão nova; cada transação lê do seu instantâneo; ler não bloqueia escrever.
        - Defesas: UPDATE atômico condicional + rowcount; SELECT ... FOR UPDATE (BEGIN IMMEDIATE no SQLite); coluna de versão com nova tentativa; restrições (UNIQUE, CHECK); SERIALIZABLE com laço de repetição.
      `),
      english(`
        - **isolation level**: nível de isolamento
        - **dirty read / non-repeatable read / phantom read**: leitura suja / não repetível / fantasma
        - **lost update / write skew**: atualização perdida / distorção de escrita
        - **snapshot isolation, MVCC**: isolamento de instantâneo, controle de concorrência multiversão
        - **pessimistic / optimistic locking**: bloqueio pessimista / otimista
        - **serialization failure**: falha de serialização (SQLSTATE 40001)

        Frase típica de entrevista: *"Read committed only guarantees you never see uncommitted data. To avoid lost updates, I'd use an atomic conditional UPDATE, lock the row with SELECT ... FOR UPDATE, or run the transaction as serializable and retry on serialization failures."*

        Da documentação do PostgreSQL, sobre REPEATABLE READ: *"Applications using this level must be prepared to retry transactions due to serialization failures."*
      `),
    ],
  },
  review: [
    ['O que torna um escalonamento serializável?', 'O efeito final dele é igual ao de alguma execução em série das mesmas transações, uma depois da outra.'],
    ['Qual é a diferença entre leitura não repetível e leitura fantasma?', 'Não repetível: a mesma linha, relida na mesma transação, tem outro valor. Fantasma: a mesma consulta com WHERE, repetida, traz outro conjunto de linhas (linhas novas ou removidas).'],
    ['Como acontece uma atualização perdida, e qual é a defesa mais simples?', 'Duas transações leem o mesmo valor, calculam um novo e gravam; a segunda escrita apaga a primeira. Defesa: UPDATE atômico e condicional (saldo = saldo - x WHERE saldo >= x), conferindo quantas linhas mudaram.'],
    ['Qual é o nível de isolamento padrão do PostgreSQL, e o que cada comando enxerga nele?', 'READ COMMITTED: cada comando enxerga os dados confirmados até o momento em que ele começou.'],
    ['O que é write skew, e o que o impede no PostgreSQL?', 'Duas transações leem os mesmos dados, decidem com base neles e escrevem linhas diferentes, quebrando juntas uma regra. Impede: SERIALIZABLE (SSI), ou travar as linhas lidas com SELECT ... FOR UPDATE.'],
    ['Como o MVCC deixa uma transação ler enquanto outra escreve a mesma linha?', 'O UPDATE cria uma versão nova em vez de sobrescrever; quem lê enxerga a versão visível no seu instantâneo, sem esperar.'],
    ['O que a aplicação deve fazer ao receber uma falha de serialização (SQLSTATE 40001)?', 'Repetir a transação inteira desde o começo, com um limite de tentativas.'],
    ['No sqlite3 do Python (modo legado), um SELECT feito antes do primeiro UPDATE, dentro de `with con:`, está na transação?', 'Não: o BEGIN implícito só vem antes de INSERT, UPDATE, DELETE ou REPLACE. Para ler na mesma transação, abra-a explicitamente (por exemplo, BEGIN IMMEDIATE com isolation_level=None).'],
  ],
  references: ['postgres-docs', 'sqlite-docs', 'ddia', 'cmu-15445', 'python-docs'],
});

/* ------------------------------------------------------------------ */
/* Otimização de consultas: índices compostos e EXPLAIN                */
/* ------------------------------------------------------------------ */

const otimizacao = lesson({
  id: 'l7-otimizacao-consultas',
  moduleId: 'm7-3',
  title: 'Otimização de consultas: índices compostos e EXPLAIN',
  titleEn: 'Query optimization: composite indexes and EXPLAIN',
  summary: 'Como um índice B-tree é organizado por dentro, por que a ordem das colunas de um índice composto decide quais consultas ele acelera (regra do prefixo mais à esquerda), índices de cobertura, condições que impedem o uso do índice, como ler o EXPLAIN do SQLite e do PostgreSQL e como achar e corrigir o problema N+1.',
  minutes: 50,
  objectives: [
    'Explicar como uma B-tree acha uma chave e lê um intervalo, e por que poucas páginas bastam para milhões de linhas',
    'Escolher a ordem das colunas de um índice composto pela regra do prefixo mais à esquerda: igualdades primeiro, depois um intervalo ou a ordenação',
    'Ler planos do SQLite (SCAN, SEARCH, COVERING INDEX, TEMP B-TREE) e do PostgreSQL (Seq Scan, Index Scan, Index Only Scan, Bitmap Heap Scan)',
    'Reescrever condições que escondem a coluna do índice e reconhecer quando um índice não compensa (seletividade)',
    'Reconhecer o problema N+1 e trocá-lo por uma consulta com JOIN e GROUP BY',
  ],
  skills: ['bd-modelagem'],
  terms: [
    t('página', 'page', 'Bloco de tamanho fixo em que o banco guarda tabelas e índices: 4 KiB no SQLite e 8 KiB no PostgreSQL, por padrão.'),
    t('fator de ramificação', 'fan-out', 'Quantos filhos cada página interna de uma B-tree aponta. Quanto maior, mais baixa a árvore.'),
    t('índice composto', 'composite index (multicolumn index)', 'Índice sobre várias colunas, ordenado pela primeira e, dentro de cada valor dela, pela segunda, e assim por diante.'),
    t('prefixo mais à esquerda', 'leftmost prefix', 'Regra de uso de um índice composto: ele só desce na árvore pelas suas primeiras colunas, em ordem.', 'The index is most efficient when there are constraints on the leading (leftmost) columns.'),
    t('índice de cobertura', 'covering index', 'Índice que contém todas as colunas que a consulta usa, dispensando a visita à tabela.'),
    t('condição sargável', 'sargable predicate', 'Condição que um índice consegue usar para descer na árvore, como coluna = valor ou coluna >= valor (de Search ARGument ABLE).'),
    t('índice de expressão', 'expression index', 'Índice sobre o resultado de uma expressão, como lower(email), e não sobre a coluna pura.'),
    t('varredura completa', 'full table scan', 'Ler todas as linhas da tabela: SCAN no SQLite, Seq Scan no PostgreSQL.'),
    t('seletividade', 'selectivity', 'Fração das linhas que uma condição deixa passar. Quanto menor, mais um índice ajuda.'),
    t('planejador de consultas', 'query planner (optimizer)', 'Parte do banco que escolhe o plano de execução de cada consulta, estimando o custo das alternativas.', 'The planner chose a sequential scan because the filter is not selective.'),
    t('problema N+1', 'N+1 query problem', 'Uma consulta para buscar uma lista e mais uma consulta para cada item dela.', 'Use eager loading to avoid the N+1 query problem.'),
    t('carregamento antecipado', 'eager loading', 'Buscar de uma vez os dados relacionados de que o código vai precisar, em vez de um item por vez.'),
  ],
  stages: {
    conceito: [
      md(`
        Na primeira lição deste módulo, um índice em \`email\` trocou o \`SCAN\` (varrer a tabela) por \`SEARCH ... USING INDEX\` (ir direto na linha). Consultas de verdade raramente são tão simples: têm duas ou três condições, um ORDER BY com LIMIT, um JOIN. E aí aparecem as surpresas: o índice existe e o banco não o usa; ele usa, mas ainda ordena milhares de linhas à parte; a tela lista cem pedidos e dispara cento e uma consultas.

        Otimizar uma consulta é um ciclo curto: **ler o plano** com EXPLAIN, achar onde o banco lê ou ordena mais do que precisa, corrigir (com o índice certo ou reescrevendo a consulta) e medir de novo. Para fazer isso sem chutar, você precisa de um modelo de como o índice funciona por dentro. Com ele, a regra mais importante desta lição deixa de ser decoreba: num índice composto, **a ordem das colunas** decide quais consultas ele acelera.
      `),
    ],
    explicacao: [
      md(`
        ### Por dentro de um índice B-tree
        Um índice B-tree é, no fundo, uma **lista ordenada** de entradas, cada uma com o valor indexado e o endereço da linha na tabela (no SQLite, o rowid; no PostgreSQL, a posição física da linha). Essa lista é guardada em {{páginas|pages}} de tamanho fixo (4 KiB por padrão no SQLite, 8 KiB no PostgreSQL), as **folhas**, e por cima delas há páginas internas que funcionam como um sumário: "chaves até X, desça por aqui".

        Como cada página interna aponta para centenas de páginas abaixo (é o {{fator de ramificação|fan-out}}), a árvore é baixíssima: com 100 filhos por página, 3 níveis já cobrem 1 milhão de entradas, e 4 níveis, 100 milhões. Segundo a documentação do PostgreSQL, mais de 99% das páginas de um índice B-tree costumam ser folhas.

        O índice faz bem duas coisas, e tudo o que ele acelera sai delas:

        1. **Descer**: da raiz até a folha, achar a primeira entrada maior ou igual a um valor. São poucas páginas, O(log n), como a busca binária do Nível 4, só que com centenas de caminhos por passo em vez de dois.
        2. **Percorrer**: dali em diante, ler as entradas **em ordem**, até a condição deixar de valer.

        Igualdade (\`=\`), intervalo (\`>=\`, \`<\`, \`BETWEEN\`) e ORDER BY sem ordenar à parte são combinações dessas duas operações.

        ### Índice composto: a ordem das colunas importa
        Um {{índice composto|composite index}} em \`(cnpj, emitida_em)\` ordena as entradas por cnpj e, **dentro do mesmo cnpj**, por data. É como a lista de chamada de uma escola, ordenada por turma e, dentro da turma, por nome: achar a turma 3B é fácil, achar a Ana da 3B também; já achar todas as Anas da escola obriga a abrir a lista de cada turma.
      `),
      {
        type: 'table',
        head: ['Condição (índice em cnpj, emitida_em)', 'O índice ajuda?', 'Por quê'],
        rows: [
          ['`cnpj = ?`', 'sim', 'as notas do CNPJ estão juntas: desce até a primeira e percorre'],
          ['`cnpj = ? AND emitida_em >= ? AND emitida_em < ?`', 'sim, nas duas colunas', 'dentro do CNPJ, as datas estão em ordem: o intervalo é um trecho contínuo'],
          ['`cnpj = ? ORDER BY emitida_em DESC LIMIT 10`', 'sim, e sem ordenar', 'basta ler o trecho do CNPJ de trás para frente e parar na 10ª entrada'],
          ['`emitida_em >= ?` (sem cnpj)', 'não para descer', 'as datas estão espalhadas, um pedaço em cada CNPJ; no máximo dá para varrer o índice inteiro'],
          ['`cnpj > ? AND emitida_em = ?`', 'só na primeira coluna', 'depois de um intervalo em cnpj, as datas não formam mais um trecho contínuo, e cada entrada é conferida uma a uma'],
        ],
        caption: 'O índice serve às condições que fixam as suas primeiras colunas, em ordem.',
      },
      md(`
        É a regra do {{prefixo mais à esquerda|leftmost prefix}}. Para montar um índice composto para uma consulta:

        1. primeiro, as colunas comparadas por **igualdade** (\`=\` ou \`IN\`);
        2. depois, **uma** coluna de intervalo **ou** a coluna do ORDER BY;
        3. por fim, se valer a pena, colunas que a consulta só lê, para o índice cobri-la (veja abaixo).

        Um índice em \`(a, b)\` também serve a quem só precisa de \`a\`. Por isso, quando você cria \`(a, b)\`, um índice sozinho em \`(a)\` costuma virar peso morto.
      `),
      deep(`
        O SQLite e o PostgreSQL (a partir da versão 18) têm o *skip scan*: quando a primeira coluna tem poucos valores distintos, o banco pode pular de valor em valor dela e usar o índice para a segunda coluna. No SQLite, isso só acontece depois que um ANALYZE mostra que a primeira coluna se repete muito. É uma otimização oportunista: projete o índice pela regra do prefixo e trate o skip scan como bônus.
      `, 'E se a consulta não usar a primeira coluna?'),
      md(`
        ### Índice de cobertura
        Achar a entrada no índice é só metade do trabalho: com o endereço em mãos, o banco ainda visita a tabela para buscar as outras colunas, e cada visita pode cair numa página diferente. Se **todas** as colunas que a consulta usa estão no índice, essa segunda etapa some: é um {{índice de cobertura|covering index}}. O SQLite mostra \`USING COVERING INDEX\`; o PostgreSQL, \`Index Only Scan\`. No SQLite, o rowid já faz parte de cada entrada, então \`SELECT id\` sai de graça; no PostgreSQL, \`CREATE INDEX ... ON notas (cnpj, emitida_em) INCLUDE (valor)\` acrescenta colunas só para leitura. O preço é um índice maior.

        ### Condições que escondem a coluna
        O índice está ordenado pelos **valores da coluna**. Se a condição aplica uma função ou uma conta à coluna, o banco não sabe onde descer e volta a conferir linha por linha. Uma condição que o índice consegue usar é uma {{condição sargável|sargable predicate}} (de *Search ARGument ABLE*).
      `),
      {
        type: 'table',
        head: ['Em vez de', 'Escreva', 'Por quê'],
        rows: [
          ["`WHERE strftime('%Y-%m', emitida_em) = '2025-03'`", "`WHERE emitida_em >= '2025-03-01' AND emitida_em < '2025-04-01'`", 'o intervalo usa a ordem do índice; a função, não'],
          ['`WHERE lower(email) = ?`', 'guarde o e-mail já normalizado, ou crie um {{índice de expressão|expression index}}: `CREATE INDEX idx_email_min ON usuarios(lower(email))`', 'o índice comum está ordenado por `email`, não por `lower(email)`'],
          ['`WHERE valor_centavos * 2 > 10000`', '`WHERE valor_centavos > 5000`', 'deixe a coluna sozinha de um lado da comparação'],
          ["`WHERE nome LIKE '%silva'`", 'busca textual (FTS5 no SQLite, `tsvector` no PostgreSQL)', 'sem o começo do texto, não há onde descer'],
        ],
      },
      md(`
        Até o prefixo (\`LIKE 'silva%'\`) só desce no índice em certas condições: no SQLite, o LIKE ignora maiúsculas e minúsculas por padrão e precisa de um índice com \`COLLATE NOCASE\`; no PostgreSQL, de colação C ou da classe de operadores \`text_pattern_ops\`.

        ### Lendo o plano
      `),
      {
        type: 'table',
        head: ['SQLite: EXPLAIN QUERY PLAN', 'PostgreSQL: EXPLAIN', 'O que significa'],
        rows: [
          ['`SCAN notas`', '`Seq Scan on notas`', '{{varredura completa|full table scan}}: lê a tabela inteira'],
          ['`SCAN notas USING INDEX i` ou `USING COVERING INDEX i`', '`Index Scan` ou `Index Only Scan` sem `Index Cond`', 'percorre o índice **inteiro** (em geral para entregar em ordem); ainda é varredura completa'],
          ['`SEARCH notas USING INDEX i (cnpj=? AND emitida_em>?)`', '`Index Scan using i` com `Index Cond: ...`', 'desce na árvore e percorre só um trecho; os parênteses dizem quais colunas foram usadas para descer'],
          ['`SEARCH notas USING COVERING INDEX i (...)`', '`Index Only Scan using i`', 'responde só com o índice, sem visitar a tabela'],
          ['`SEARCH notas USING INTEGER PRIMARY KEY (rowid=?)`', '`Index Scan using notas_pkey`', 'busca pela chave primária'],
          ['`USE TEMP B-TREE FOR ORDER BY`', '`Sort`', 'precisou ordenar à parte'],
          ['`SEARCH p USING AUTOMATIC COVERING INDEX (cliente_id=?)`', '(não existe)', 'o SQLite montou um índice temporário só para esta execução: sinal de índice faltando'],
          ['(não existe)', '`Bitmap Index Scan` + `Bitmap Heap Scan`', 'junta os endereços de muitas entradas e lê as páginas da tabela na ordem física: o meio-termo entre Index Scan e Seq Scan'],
        ],
      },
      warn(`
        O \`EXPLAIN\` do PostgreSQL mostra o plano com custos e linhas **estimados**. \`EXPLAIN ANALYZE\` **executa** a consulta e mostra também o tempo e as linhas reais de cada etapa; uma diferença grande entre linhas estimadas e reais costuma indicar estatísticas desatualizadas. Como ele executa de verdade, um \`EXPLAIN ANALYZE\` de UPDATE ou DELETE muda os dados: rode \`BEGIN; EXPLAIN ANALYZE ...; ROLLBACK;\`.
      `, 'EXPLAIN ANALYZE executa'),
      deep(`
        O {{planejador de consultas|query planner}} do PostgreSQL decide por custo: para cada plano possível, estima quantas linhas cada etapa vai produzir e quanto isso custa, e fica com o mais barato. As estimativas vêm de estatísticas por coluna (valores mais comuns, histogramas), que o \`ANALYZE\` coleta e o autovacuum atualiza de tempos em tempos. A {{seletividade|selectivity}} de uma condição é a fração das linhas que ela deixa passar. Uma condição muito seletiva (um CPF, uma chave de nota) vai de Index Scan. Uma que deixa passar boa parte da tabela vai de Seq Scan: ler a tabela em sequência sai mais barato do que pular de entrada em entrada do índice para páginas espalhadas. No meio do caminho aparece o Bitmap Heap Scan. O SQLite também decide por custo e usa as estatísticas do \`ANALYZE\` (a documentação recomenda rodar \`PRAGMA optimize\` de vez em quando), com um modelo mais simples.
      `, 'Por que o banco às vezes ignora o índice'),
      md(`
        ### O problema N+1
        O plano de **uma** consulta pode estar perfeito e a tela continuar lenta, porque o problema está no programa: uma consulta para buscar a lista e mais **uma por item** dela. É o {{problema N+1|N+1 query problem}}:

        \`\`\`python
        clientes = con.execute("SELECT id, nome FROM clientes").fetchall()   # 1 consulta
        for cid, nome in clientes:                                             # + N consultas
            total = con.execute("SELECT SUM(valor_centavos) FROM pedidos WHERE cliente_id = ?", (cid,)).fetchone()
        \`\`\`

        Num banco cliente-servidor como o PostgreSQL, cada consulta paga pelo menos uma ida e volta pela rede, além de ser analisada e planejada. Com 100 clientes, são 101 idas e voltas para o que uma consulta com JOIN e GROUP BY entrega de uma vez. Os ORMs produzem N+1 sem você ver, quando o código acessa um relacionamento dentro de um laço; para isso eles oferecem o {{carregamento antecipado|eager loading}} (\`select_related\` e \`prefetch_related\` no Django, \`joinedload\` e \`selectinload\` no SQLAlchemy).

        O SQLite é um caso à parte: ele roda dentro do seu processo, sem rede, e a própria documentação diz que muitas consultas pequenas são eficientes nele. Mesmo assim, cada uma das N consultas precisa de um índice na coluna da ligação; sem ele, cada uma varre a tabela inteira.
      `),
      tip(`
        Indexe as chaves estrangeiras que você usa para juntar ou filtrar. Nem o SQLite nem o PostgreSQL fazem isso sozinhos: a chave primária e as colunas UNIQUE ganham índice automaticamente, mas a coluna que referencia outra tabela, não. E lembre que cada índice deixa INSERT, UPDATE e DELETE mais lentos: no PostgreSQL, a visão \`pg_stat_user_indexes\` mostra quantas vezes cada índice foi usado (\`idx_scan\`), e a extensão \`pg_stat_statements\` mostra quais consultas consomem mais tempo. Otimize o que as medições apontam.
      `),
    ],
    exemplo: [
      md(`
        Um sistema de notas fiscais eletrônicas tem a tabela \`notas(id, cnpj, uf, emitida_em, valor)\`, com 20 000 notas de 500 emitentes. A tela do emitente faz duas consultas: as **10 últimas notas** de um CNPJ e o **faturamento de março** desse CNPJ, que lê só \`emitida_em\` e \`valor\`. Os planos abaixo são os do SQLite, os mesmos que o código da próxima etapa imprime.
      `),
      {
        type: 'table',
        head: ['Índice', 'Últimas 10: `cnpj = ? ORDER BY emitida_em DESC LIMIT 10`', 'Março: `cnpj = ? AND emitida_em >= ? AND emitida_em < ?`'],
        rows: [
          ['nenhum', '`SCAN notas` + `USE TEMP B-TREE FOR ORDER BY`: lê as 20 000 linhas e ordena as do CNPJ', '`SCAN notas`: lê as 20 000 linhas'],
          ['`(cnpj)`', '`SEARCH ... (cnpj=?)` + `USE TEMP B-TREE FOR ORDER BY`: lê só as cerca de 40 notas do CNPJ, mas ainda ordena', '`SEARCH ... (cnpj=?)`: lê as cerca de 40 notas e confere a data de cada uma'],
          ['`(cnpj, emitida_em)`', '`SEARCH ... (cnpj=?)`, sem ordenar: lê o trecho de trás para frente e para na 10ª', '`SEARCH ... (cnpj=? AND emitida_em>? AND emitida_em<?)`: desce direto no começo de março'],
          ['`(cnpj, emitida_em, valor)`', 'igual à linha de cima', '`SEARCH ... USING COVERING INDEX (...)`: nem visita a tabela'],
          ['`(emitida_em, cnpj)`', '`SCAN notas USING INDEX ...`: percorre o índice inteiro, de trás para frente, procurando o CNPJ', '`SEARCH ... (emitida_em>? AND emitida_em<?)`: lê as notas de março de todos os CNPJs'],
        ],
        caption: 'As mesmas colunas em outra ordem mudam tudo: em (emitida_em, cnpj), o CNPJ deixa de ser o prefixo.',
      },
      md(`
        Descer no índice é uma busca binária generalizada. Acompanhe uma numa folha de índice minúscula sobre \`uf\`, em que cada entrada é \`(uf, id)\`: primeiro a descida até a primeira entrada de SP, depois a leitura em ordem enquanto a condição vale.
      `),
      trace(`
        # folha de um índice em uf: entradas (uf, id), em ordem
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
        print("desceu até a posição", lo, "e achou os ids", achados)
      `, 'Três comparações para achar o começo e uma leitura em sequência. Num índice de verdade, cada passo da descida é uma página com centenas de chaves.'),
    ],
    codigo: [
      md(`
        Rode o experimento do exemplo: o mesmo banco, quatro situações de índice, o plano e o tempo médio de cada consulta.
      `),
      py(`
        import random, sqlite3, time

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
                t0 = time.perf_counter()
                for _ in range(100):
                    con.execute(sql, params).fetchall()
                micros = (time.perf_counter() - t0) / 100 * 1_000_000
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
        medir("índice em (emitida_em, cnpj)")
      `, { caption: 'Os tempos variam de uma execução para outra; compare a ordem de grandeza: do SCAN para o SEARCH, o tempo cai dezenas de vezes ou mais. No último caso, as mesmas colunas em outra ordem levam de volta a um SCAN.' }),
      md(`
        Agora o N+1: o mesmo relatório (quantidade e total de pedidos por cliente) feito com uma consulta por cliente e com um único JOIN, antes e depois de indexar a chave estrangeira.
      `),
      py(`
        import random, sqlite3, time

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
        print("mesmo resultado nos quatro?", a == b == c == d)
      `, { caption: 'Sem índice, cada uma das 500 consultas do N+1 varre os 5 000 pedidos; o JOIN sem índice se sai bem porque o SQLite monta um índice automático uma vez. Com índice, no SQLite, as duas versões ficam próximas; num servidor, as 501 idas e voltas pesariam.' }),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e7-otim-prefixo',
          kind: 'mcq',
          prompt: 'A tabela `notas` tem um índice em `(cnpj, emitida_em)` e nenhum outro. Qual consulta **não** consegue descer na árvore desse índice?',
          difficulty: 'facil',
          skills: ['bd-modelagem'],
          hints: [
            'Na lista de chamada ordenada por turma e nome, que busca obriga a abrir a lista de todas as turmas?',
            'Qual das consultas não diz nada sobre a primeira coluna do índice?',
          ],
          explanation: 'Um índice composto só desce pelas colunas do começo: serve a `cnpj = ?`, a `cnpj = ?` com intervalo em `emitida_em` e à ordenação por data dentro do CNPJ. Para filtrar só por data, seria preciso um índice que começasse por `emitida_em`.',
          options: [
            { text: '`SELECT * FROM notas WHERE cnpj = ?`', feedback: 'Essa usa o prefixo (cnpj): desce até a primeira nota do CNPJ e percorre o trecho.' },
            { text: "`SELECT * FROM notas WHERE cnpj = ? AND emitida_em >= '2025-06-01'`", feedback: 'Igualdade na primeira coluna e intervalo na segunda é o caso ideal: desce direto no começo de junho daquele CNPJ.' },
            { text: "`SELECT * FROM notas WHERE emitida_em >= '2025-06-01'`", correct: true, feedback: 'Isso: sem a primeira coluna, as datas estão espalhadas, um trecho em cada CNPJ. O banco, no máximo, varre o índice inteiro ou a tabela.' },
            { text: '`SELECT * FROM notas WHERE cnpj = ? ORDER BY emitida_em`', feedback: 'Essa até dispensa a ordenação: dentro do CNPJ, as entradas já estão em ordem de data.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e7-otim-bisect',
          kind: 'predict',
          lang: 'python',
          prompt: 'Uma folha de índice em `(uf, emitida_em)` pode ser imitada por uma lista ordenada de tuplas `(uf, data, id)`. O que o código imprime?',
          difficulty: 'intermediario',
          skills: ['bd-modelagem', 'alg-busca'],
          hints: [
            'Primeiro, ordene a lista à mão: tuplas se comparam pelo primeiro elemento e, no empate, pelo seguinte.',
            '`bisect_left(lista, x)` devolve a primeira posição cujo elemento é maior ou igual a x. Como `("SP", "2025-03-01")` se compara com `("SP", "2025-03-02", 1)`?',
            'Quando uma tupla é prefixo de outra, ela é a menor das duas.',
          ],
          explanation: 'Ordenada, a lista fica BA, RJ, SP 01-20, SP 03-02, SP 03-10. A primeira entrada maior ou igual a ("SP", "2025-03-01") está na posição 3 (SP, 03-02), e a primeira maior ou igual a ("SP", "2025-04-01") estaria depois do fim: posição 5. A fatia [3:5] traz os ids 1 e 7, as notas de SP em março, em ordem de data. É o que um índice em (uf, emitida_em) faz: duas descidas para achar as pontas do intervalo e uma leitura em sequência entre elas.',
          code: dedent(`
            from bisect import bisect_left

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
            print([linha_id for _, _, linha_id in indice[ini:fim]])
          `),
          answer: '3 5\n[1, 7]',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e7-otim-n1',
          kind: 'sql',
          prompt: dedent(`
            Este relatório faz N+1 consultas: uma para os clientes e mais uma por cliente.

            \`\`\`python
            for cid, nome in con.execute("SELECT id, nome FROM clientes ORDER BY nome").fetchall():
                qtd, total = con.execute(
                    "SELECT COUNT(*), COALESCE(SUM(valor_centavos), 0) FROM pedidos "
                    "WHERE cliente_id = ? AND feito_em >= '2025-01-01'", (cid,)).fetchone()
                print(nome, qtd, total)
            \`\`\`

            Escreva **uma única consulta** que devolva o mesmo relatório: \`nome\`, \`qtd\` e \`total\` de **todos** os clientes (quem não tem pedidos em 2025 aparece com 0 e 0), em ordem de nome.
          `),
          difficulty: 'intermediario',
          skills: ['bd-modelagem', 'bd-joins'],
          hints: [
            'Que tipo de JOIN mantém os clientes sem nenhum pedido em 2025?',
            'O filtro de data é sobre a tabela da direita do LEFT JOIN. Se ele for para o WHERE, o que acontece com quem só tem pedidos de 2024?',
            'COUNT(*) conta a linha de NULL que o LEFT JOIN cria para quem não tem par. Que coluna contar no lugar?',
            'Para o total, SUM de nada é NULL: o mesmo COALESCE do laço resolve.',
          ],
          explanation: "SELECT c.nome, COUNT(p.id) AS qtd, COALESCE(SUM(p.valor_centavos), 0) AS total FROM clientes c LEFT JOIN pedidos p ON p.cliente_id = c.id AND p.feito_em >= '2025-01-01' GROUP BY c.id, c.nome ORDER BY c.nome; O filtro de data fica no ON para não descartar a Oficina do Zé, que só comprou em 2024; COUNT(p.id) dá 0 para quem não tem par. É uma consulta e uma ida ao banco, e o banco escolhe como juntar: com um índice em pedidos(cliente_id), cada cliente vira uma descida no índice.",
          setup: SETUP_PEDIDOS,
          starter: 'SELECT id, nome FROM clientes ORDER BY nome;',
          solution: "SELECT c.nome, COUNT(p.id) AS qtd, COALESCE(SUM(p.valor_centavos), 0) AS total FROM clientes c LEFT JOIN pedidos p ON p.cliente_id = c.id AND p.feito_em >= '2025-01-01' GROUP BY c.id, c.nome ORDER BY c.nome;",
          ordered: true,
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e7-otim-indices',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            A tabela \`notas(id, cnpj, uf, emitida_em, valor)\` atende a três consultas frequentes:

            \`\`\`sql
            -- 1. últimas notas do emitente
            SELECT * FROM notas WHERE cnpj = ? ORDER BY emitida_em DESC LIMIT 10;
            -- 2. faturamento do mês do emitente
            SELECT emitida_em, valor FROM notas WHERE cnpj = ? AND emitida_em >= ? AND emitida_em < ?;
            -- 3. notas de uma UF desde uma data
            SELECT COUNT(*) FROM notas WHERE uf = ? AND emitida_em >= ?;
            \`\`\`

            Escreva \`criar_indices(con)\`, que cria **no máximo dois** índices em \`notas\` (com \`CREATE INDEX\`) de modo que, no EXPLAIN QUERY PLAN do SQLite:

            - nenhuma das três consultas tenha \`SCAN\` (nem da tabela, nem do índice inteiro);
            - nenhuma precise de \`USE TEMP B-TREE\` (ordenar à parte);
            - a consulta 2 desça usando \`cnpj\` **e** o intervalo de \`emitida_em\`, num índice de **cobertura**;
            - a consulta 3 desça usando \`uf\` **e** \`emitida_em\`.

            O código inicial cria um índice para cada coluna filtrada. Rode e leia as mensagens dos testes: elas mostram o plano de cada consulta.
          `),
          difficulty: 'intermediario',
          skills: ['bd-modelagem'],
          hints: [
            'Quais colunas aparecem com = em cada consulta? Elas vão no começo de cada índice.',
            'Na consulta 1, depois do cnpj, que coluna faria as entradas já saírem na ordem pedida?',
            'Um mesmo índice pode servir às consultas 1 e 2? O que cada uma precisa depois do cnpj?',
            'Cobertura: que coluna a consulta 2 lê e ainda não está no índice?',
          ],
          explanation: 'Com `(cnpj, emitida_em, valor)`, as consultas 1 e 2 usam o mesmo índice: o cnpj fixa o emitente, emitida_em vem logo depois (serve ao intervalo e à ordem do ORDER BY) e valor no fim deixa a consulta 2 ser respondida só pelo índice. A consulta 3 precisa de outro índice, que comece pela igualdade (uf) e continue pelo intervalo (emitida_em): `(uf, emitida_em)`, que de quebra cobre o COUNT(*). Índices de uma coluna só deixam a ordenação e o filtro de data para depois; a ordem trocada, `(emitida_em, cnpj, valor)`, perde o prefixo e faz o banco percorrer o índice inteiro.',
          starter: dedent(`
            def criar_indices(con):
                # no máximo dois índices; a ordem das colunas decide quais consultas eles servem
                con.execute("CREATE INDEX idx_notas_cnpj ON notas(cnpj)")
                con.execute("CREATE INDEX idx_notas_uf ON notas(uf)")
          `),
          solution: dedent(`
            def criar_indices(con):
                con.execute("CREATE INDEX idx_notas_cnpj_data_valor ON notas(cnpj, emitida_em, valor)")
                con.execute("CREATE INDEX idx_notas_uf_data ON notas(uf, emitida_em)")
          `),
          tests: [
            {
              name: 'no máximo dois índices',
              code: NOTAS_PLANOS + '\n' + dedent(`
                con, planos = _preparado()
                nomes = [n for (n,) in con.execute("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'notas' AND name NOT LIKE 'sqlite_%'")]
                assert len(nomes) >= 1, "nenhum índice foi criado na tabela notas: use CREATE INDEX dentro de criar_indices"
                assert len(nomes) <= 2, f"foram criados {len(nomes)} índices ({', '.join(nomes)}); o limite é 2. Um índice composto bem ordenado pode servir a mais de uma consulta"
              `),
            },
            {
              name: 'nenhuma varredura completa',
              code: NOTAS_PLANOS + '\n' + dedent(`
                con, planos = _preparado()
                for nome, linhas in planos.items():
                    for linha in linhas:
                        assert not linha.startswith("SCAN"), f"na consulta '{nome}', o plano tem '{linha}': SCAN percorre a tabela (ou o índice) inteira. Qual coluna essa consulta compara com = e onde ela está no índice?"
              `),
            },
            {
              name: 'nenhuma ordenação à parte',
              code: NOTAS_PLANOS + '\n' + dedent(`
                con, planos = _preparado()
                for nome, linhas in planos.items():
                    for linha in linhas:
                        assert "TEMP B-TREE" not in linha, f"na consulta '{nome}', o plano tem '{linha}': o banco precisou ordenar à parte. Depois das colunas comparadas com =, qual coluna deveria vir no índice para as entradas já saírem na ordem pedida?"
              `),
            },
            {
              name: 'o mês usa as duas colunas e é coberto',
              code: NOTAS_PLANOS + '\n' + dedent(`
                con, planos = _preparado()
                linha = " | ".join(planos["faturamento do mês"])
                assert "cnpj=?" in linha and "emitida_em>?" in linha, f"o plano do faturamento do mês é '{linha}': ele deveria descer no índice usando cnpj e o intervalo de emitida_em, como em (cnpj=? AND emitida_em>? AND emitida_em<?)"
                assert "COVERING INDEX" in linha, f"o plano do faturamento do mês é '{linha}': ele ainda visita a tabela para buscar alguma coluna. Que coluna a consulta lê que não está no índice?"
              `),
            },
            {
              name: 'a UF usa as duas colunas',
              code: NOTAS_PLANOS + '\n' + dedent(`
                con, planos = _preparado()
                linha = " | ".join(planos["notas da UF desde uma data"])
                assert "uf=?" in linha and "emitida_em>?" in linha, f"o plano da contagem por UF é '{linha}': ele deveria descer usando uf e a data, como em (uf=? AND emitida_em>?). Se só aparece uma das duas, a outra é conferida entrada por entrada"
              `),
            },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e7-otim-seletividade',
          kind: 'mcq',
          prompt: "No PostgreSQL, a tabela `clientes` tem 1 milhão de linhas, 45% delas com `uf = 'SP'`, e um índice B-tree em `uf`. O `EXPLAIN` de `SELECT * FROM clientes WHERE uf = 'SP'` mostra `Seq Scan on clientes`. O que explica a escolha?",
          difficulty: 'intermediario',
          skills: ['bd-modelagem'],
          hints: [
            'Quantas linhas essa consulta devolve? Quantas páginas da tabela o banco teria de visitar indo pelo índice?',
            'O planejador do PostgreSQL decide por custo estimado, com base em estatísticas da coluna.',
          ],
          explanation: 'Pelas estatísticas da coluna (coletadas pelo ANALYZE), o planejador estima que cerca de 450 mil linhas satisfazem a condição. Ir pelo índice significaria visitar a tabela entrada por entrada, em páginas fora de ordem; a varredura sequencial lê cada página uma vez, em ordem, e sai mais barata. Um índice compensa quando a condição é seletiva, isto é, deixa passar uma fração pequena das linhas. Em casos intermediários, o PostgreSQL costuma usar Bitmap Heap Scan.',
          options: [
            { text: 'O índice está corrompido e precisa ser recriado com REINDEX.', feedback: 'Um índice ignorado não é sinal de corrupção. O planejador comparou custos e preferiu outro plano.' },
            { text: 'Pelas estatísticas, quase metade da tabela sai no resultado; ler tudo em sequência custa menos do que ir de entrada em entrada do índice até páginas espalhadas da tabela.', correct: true, feedback: "Isso: a condição tem baixa seletividade. Para `uf = 'AC'`, com poucas linhas, o mesmo índice provavelmente seria usado." },
            { text: 'O PostgreSQL só usa índices B-tree em consultas com ORDER BY.', feedback: 'O B-tree serve a igualdades e intervalos, com ou sem ORDER BY.' },
            { text: 'Índices B-tree não funcionam com colunas de texto.', feedback: 'Funcionam: texto tem ordem. O que o B-tree não faz é procurar pelo meio do texto, como num LIKE com % no começo.' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e7-otim-indice-composto',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Implemente a folha de um índice composto como uma lista ordenada, e a busca que ele faz.

            - \`IndiceComposto(linhas, colunas)\`: \`linhas\` é uma lista de dicionários, todos com a chave \`"id"\` e com as colunas do índice; \`colunas\` é a tupla com os nomes das colunas, na ordem do índice. Guarde as entradas \`(valor da 1ª coluna, valor da 2ª, ..., id)\` em ordem.
            - \`buscar(prefixo, intervalo=None)\`: \`prefixo\` é uma tupla (pode ser vazia) com valores para as **primeiras** colunas, comparados por igualdade; \`intervalo\`, se vier, é \`(minimo, maximo)\`, inclusivos, para a coluna **logo depois** do prefixo. Devolve a lista de ids que casam, na ordem do índice (pelos valores e, no empate, pelo id).
            - Se o prefixo tiver mais valores do que o índice tem colunas, ou se vier um intervalo quando o prefixo já usa todas as colunas, lance \`ValueError\`.

            A busca precisa descer na lista, como a B-tree desce na árvore: um teste conta as comparações de valores e reprova quem percorre as entradas uma a uma.
          `),
          difficulty: 'desafio',
          skills: ['bd-modelagem', 'alg-busca'],
          hints: [
            'Que operação sobre uma lista ordenada faz o papel de "descer na árvore"? Você já a usou no Nível 4.',
            'Para achar as duas pontas do trecho, você precisa de duas buscas. O que muda entre a ponta da esquerda e a da direita?',
            'Com `key=`, o `bisect` compara só uma parte de cada entrada. Que parte, quando o prefixo tem p valores? E quando há intervalo?',
            'Intervalo inclusivo: a ponta da direita precisa ficar depois da última entrada igual ao máximo.',
          ],
          explanation: 'Com as entradas ordenadas como tuplas (valores..., id), todas as que começam por um prefixo de p valores formam um trecho contínuo. `bisect_left(entradas, prefixo, key=lambda e: e[:p])` acha o começo, e `bisect_right` com a mesma chave acha o fim; com intervalo, a chave passa a ser `e[:p + 1]` e as pontas são `prefixo + (minimo,)` (à esquerda) e `prefixo + (maximo,)` (à direita). São duas descidas de O(log n) e uma fatia de k entradas: O(log n + k), o custo de uma busca num índice B-tree. O que não dá para fazer também ensina: sem a primeira coluna, não existe trecho contínuo para achar. É a regra do prefixo mais à esquerda vista por dentro.',
          starter: dedent(`
            from bisect import bisect_left, bisect_right


            class IndiceComposto:
                def __init__(self, linhas, colunas):
                    # monte a lista ORDENADA de entradas: os valores das colunas, na ordem
                    # do índice, e o id da linha no fim (ele desempata)
                    pass

                def buscar(self, prefixo, intervalo=None):
                    # prefixo: valores (igualdade) para as primeiras colunas do índice
                    # intervalo: None ou (minimo, maximo), inclusivos, para a coluna seguinte
                    # devolva os ids que casam, na ordem do índice, sem percorrer todas as entradas
                    pass
          `),
          solution: dedent(`
            from bisect import bisect_left, bisect_right


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
                    return [e[-1] for e in self.entradas[ini:fim]]
          `),
          tests: [
            {
              name: 'busca por prefixo',
              code: INDICE_TESTE + '\n' + dedent(`
                ind = IndiceComposto(_NOTAS, ("uf", "data"))
                r = ind.buscar(("SP",))
                assert r == [4, 1, 5, 7], f"buscar(('SP',)) devolveu {r!r}; esperado [4, 1, 5, 7]: as notas de SP na ordem do índice (data e, no empate, id)"
                r = ind.buscar(("SP", "2025-03-10"))
                assert r == [5, 7], f"buscar(('SP', '2025-03-10')) devolveu {r!r}; esperado [5, 7]: as duas notas com esses valores, desempatadas pelo id"
                r = ind.buscar(("AM",))
                assert r == [], f"não há notas do AM, mas veio {r!r}"
              `),
            },
            {
              name: 'intervalo na coluna seguinte',
              code: INDICE_TESTE + '\n' + dedent(`
                ind = IndiceComposto(_NOTAS, ("uf", "data"))
                r = ind.buscar(("SP",), ("2025-03-01", "2025-03-31"))
                assert r == [1, 5, 7], f"notas de SP em março: esperado [1, 5, 7], veio {r!r}"
                r = ind.buscar(("SP",), ("2025-01-20", "2025-03-02"))
                assert r == [4, 1], f"o intervalo é inclusivo nas duas pontas: esperado [4, 1], veio {r!r}"
                r = ind.buscar((), ("MG", "RJ"))
                assert r == [3, 2], f"com prefixo vazio, o intervalo vale para a primeira coluna (uf de MG a RJ): esperado [3, 2], veio {r!r}"
                r = ind.buscar(("SP",), ("2025-04-01", "2025-03-01"))
                assert r == [], f"um intervalo com mínimo maior que o máximo não casa com nada; veio {r!r}"
              `),
            },
            {
              name: 'prefixo vazio devolve tudo, em ordem',
              code: INDICE_TESTE + '\n' + dedent(`
                ind = IndiceComposto(_NOTAS, ("uf", "data"))
                r = ind.buscar(())
                assert r == [9, 3, 2, 4, 1, 5, 7], f"sem prefixo nem intervalo, vêm todas as entradas na ordem do índice: esperado [9, 3, 2, 4, 1, 5, 7], veio {r!r}"
              `),
            },
            {
              name: 'pedidos impossíveis',
              code: INDICE_TESTE + '\n' + dedent(`
                ind = IndiceComposto(_NOTAS, ("uf", "data"))
                _espera_valueerror(ind.buscar, ("SP", "2025-03-10", "x"), msg="o índice tem 2 colunas: um prefixo com 3 valores deveria lançar ValueError")
                _espera_valueerror(ind.buscar, ("SP", "2025-03-10"), ("a", "z"), msg="com as 2 colunas no prefixo, não sobra coluna para o intervalo: deveria lançar ValueError")
              `),
            },
            {
              name: 'dados aleatórios',
              code: INDICE_TESTE + '\n' + dedent(`
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
                        raise AssertionError(f"buscar({prefixo!r}, {intervalo!r}) devolveu {len(r)} ids, e o esperado são {len(esperado)}: {esperado[:10]!r}...")
              `),
            },
            {
              name: 'busca sem percorrer tudo',
              code: INDICE_TESTE + '\n' + dedent(`
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
                    assert r == _forca_bruta(linhas, ("cnpj", "data"), prefixo, intervalo), f"buscar({prefixo!r}, {intervalo!r}) devolveu ids errados"
              `),
            },
          ],
        },
      },
    ],
    projeto: [
      md(`
        **Sistema de cadastro (parte 6, desempenho)**: liste as três consultas mais usadas do seu cadastro (por exemplo, busca por matrícula, boletim do aluno e alunos de um curso), rode \`EXPLAIN QUERY PLAN\` em cada uma e registre no README o plano antes e depois dos índices, com uma frase que justifique cada índice: a quais consultas ele serve e por que as colunas estão nessa ordem. Procure laços que fazem uma consulta por aluno e troque-os por um JOIN.
      `),
      { type: 'project', projectId: 'p3-cadastro' },
    ],
    revisao: [
      md(`
        - B-tree: lista ordenada em páginas, com um sumário por cima; descer é O(log n) e ler em ordem é sequencial. Com fan-out alto, 3 ou 4 níveis cobrem milhões de linhas.
        - Índice composto: prefixo mais à esquerda. Igualdades primeiro, depois uma coluna de intervalo ou de ORDER BY; colunas só lidas no fim, para cobrir a consulta.
        - Plano no SQLite: SCAN (tudo), SEARCH (desce), COVERING INDEX (nem visita a tabela), TEMP B-TREE (ordenou à parte), AUTOMATIC INDEX (faltou índice). No PostgreSQL: Seq Scan, Index Scan, Index Only Scan, Bitmap Heap Scan, Sort; EXPLAIN ANALYZE executa de verdade.
        - Deixe a coluna sozinha na comparação: intervalo em vez de função; índice de expressão quando não der.
        - Seletividade: índice compensa para poucas linhas; para muitas, a varredura sequencial ganha.
        - N+1: uma consulta por item. Troque por JOIN/GROUP BY ou IN, use carregamento antecipado no ORM e indexe as chaves estrangeiras.
      `),
      english(`
        - **query plan, query planner (optimizer)**: plano de execução, planejador de consultas
        - **full table scan / sequential scan**: varredura completa
        - **composite (multicolumn) index, leftmost prefix**: índice composto, prefixo mais à esquerda
        - **covering index / index-only scan**: índice de cobertura
        - **selectivity**: seletividade
        - **sargable predicate**: condição sargável
        - **N+1 query problem, eager loading**: problema N+1, carregamento antecipado

        Frase típica de entrevista: *"I'd start by reading the query plan. If it shows a sequential scan on a selective filter, I'd add a composite index with the equality columns first and the range column last, then confirm the change with EXPLAIN ANALYZE."*

        Da documentação do PostgreSQL, sobre índices de várias colunas: *"A multicolumn B-tree index can be used with query conditions that involve any subset of the index's columns, but the index is most efficient when there are constraints on the leading (leftmost) columns."*
      `),
    ],
  },
  review: [
    ['Por que um índice B-tree com milhões de entradas tem só 3 ou 4 níveis?', 'Cada página interna aponta para centenas de páginas abaixo (fan-out alto): com 100 filhos por página, 3 níveis cobrem 1 milhão de entradas.'],
    ['O que diz a regra do prefixo mais à esquerda?', 'Um índice composto só desce na árvore pelas suas primeiras colunas, em ordem: igualdades primeiro, depois no máximo uma coluna de intervalo ou de ORDER BY.'],
    ['Em que ordem ficam as colunas de um índice para `WHERE cnpj = ? AND emitida_em >= ? ORDER BY emitida_em`?', '(cnpj, emitida_em): a coluna da igualdade primeiro, a do intervalo e da ordenação depois.'],
    ['O que é um índice de cobertura, e como ele aparece no plano?', 'Um índice que contém todas as colunas que a consulta usa, que então não precisa visitar a tabela. No SQLite, USING COVERING INDEX; no PostgreSQL, Index Only Scan.'],
    ["Como reescrever `WHERE strftime('%Y-%m', emitida_em) = '2025-03'` para usar um índice em emitida_em?", "Como intervalo sobre a coluna pura: emitida_em >= '2025-03-01' AND emitida_em < '2025-04-01'."],
    ['No EXPLAIN QUERY PLAN do SQLite, o que indicam SCAN, SEARCH e USE TEMP B-TREE FOR ORDER BY?', 'SCAN: percorre a tabela ou o índice inteiro. SEARCH: desce na árvore e lê só um trecho. TEMP B-TREE: precisou ordenar à parte.'],
    ['Por que o PostgreSQL pode preferir um Seq Scan mesmo havendo índice na coluna filtrada?', 'Se a condição deixa passar uma fração grande das linhas (baixa seletividade), ler a tabela em sequência custa menos do que visitar páginas espalhadas a partir do índice.'],
    ['O que é o problema N+1, e como corrigi-lo?', 'Uma consulta para a lista e mais uma para cada item. Troque por uma consulta com JOIN e GROUP BY (ou com IN) e use carregamento antecipado no ORM.'],
    ['O PostgreSQL cria índice nas colunas de chave estrangeira?', 'Não: só a chave primária e as colunas UNIQUE ganham índice automático. Indexe as chaves estrangeiras que você usa em JOINs e filtros.'],
  ],
  references: ['postgres-docs', 'sqlite-docs', 'cmu-15445', 'ddia'],
});

export const lessons: Lesson[] = [isolamento, otimizacao];
