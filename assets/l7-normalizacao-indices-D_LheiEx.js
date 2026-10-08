var e={id:`l7-normalizacao-indices`,moduleId:`m7-3`,title:`Normalização, índices e transações`,titleEn:`Normalization, indexes and transactions`,summary:`Evitar anomalias, acelerar consultas com índices B-tree e garantir consistência com ACID.`,minutes:40,objectives:[`Reconhecer redundância e aplicar 1FN, 2FN e 3FN`,`Explicar como um índice acelera buscas e quando atrapalha`,`Usar transações e explicar ACID`],skills:[`bd-modelagem`],terms:[{pt:`normalização`,en:`normalization`,def:`Organizar tabelas para reduzir redundância e anomalias.`},{pt:`índice`,en:`index`,def:`Estrutura auxiliar (geralmente B-tree) que acelera buscas por uma coluna.`},{pt:`transação`,en:`transaction`,def:`Grupo de operações que acontece por completo ou não acontece.`},{pt:`confirmar / desfazer`,en:`commit / rollback`,def:`Confirmar ou desfazer as operações de uma transação.`},{pt:`ACID`,en:`ACID`,def:`Atomicidade, Consistência, Isolamento, Durabilidade.`},{pt:`plano de execução`,en:`query plan`,def:`Como o banco decidiu executar a consulta (EXPLAIN).`}],references:[`cmu-15445`,`postgres-docs`,`sqlite-docs`,`ddia`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Três ferramentas para bancos que funcionam bem em produção: **normalização** (não repetir dados, para não haver versões conflitantes), **índices** (encontrar linhas sem varrer a tabela inteira) e **transações** (operações que acontecem por inteiro ou não acontecem).`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`**Normalização** — se o nome do curso está repetido em cada linha de aluno e alguém o corrige em uma só, o banco fica inconsistente (*anomalia de atualização*).

- **1FN**: valores atômicos (nada de "telefones: 1111, 2222" numa coluna).
- **2FN**: cada coluna depende da chave **inteira** (importante em chaves compostas).
- **3FN**: nenhuma coluna depende de outra coluna não-chave (o nome do curso depende do curso, não do aluno → tabela \`cursos\`).

**Índices**: um índice B-tree em \`alunos(email)\` transforma a busca de O(n) (varrer tudo) em O(log n). Custo: espaço extra e escritas mais lentas (o índice precisa ser atualizado). Crie índices para colunas usadas em WHERE, JOIN e ORDER BY frequentes; confira com \`EXPLAIN\`.

**Transações e ACID**:

- **Atomicidade**: transferir R$ 100 = debitar A **e** creditar B. Se falhar no meio, \`ROLLBACK\` desfaz tudo.
- **Consistência**: regras (chaves, CHECK) valem antes e depois.
- **Isolamento**: transações concorrentes não veem estados intermediários umas das outras (há níveis de isolamento).
- **Durabilidade**: depois do \`COMMIT\`, sobrevive a quedas de energia (graças ao *write-ahead log*).`},{type:`callout`,tone:`deep`,text:`Desnormalizar (repetir dados de propósito) é uma técnica legítima para leitura muito rápida — em data warehouses e caches. A regra é: normalize por padrão, desnormalize com motivo medido.`,title:`Sempre normalizar?`}]},{stage:`exemplo`,blocks:[{type:`code`,lang:`python`,code:`import sqlite3, time
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
print(f"com índice: {buscar():.5f}s")`,runnable:!0,caption:`SCAN = varre a tabela; SEARCH ... USING INDEX = usa o índice.`}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`import sqlite3
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
print(con.execute("SELECT * FROM contas").fetchall())`,runnable:!0}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e7-norm-1`,kind:`mcq`,prompt:"A tabela `pedidos(id, cliente_nome, cliente_email, produto, preco)` repete nome e e-mail do cliente em cada pedido. Qual o principal problema?",difficulty:`intermediario`,skills:[`bd-modelagem`],hints:[`O que acontece quando o cliente muda de e-mail?`],explanation:`Anomalia de atualização: o e-mail precisa ser alterado em todas as linhas; se uma ficar para trás, os dados ficam inconsistentes. Solução: tabela clientes e pedidos.cliente_id.`,options:[{text:`A tabela fica lenta para inserir`,feedback:`Pode ficar maior, mas o problema central é consistência.`},{text:`Anomalias de atualização: o mesmo dado repetido pode ficar inconsistente`,correct:!0,feedback:`Isso: normalize em clientes + pedidos.`},{text:`Não é possível fazer JOIN`,feedback:`Não há relação com JOINs.`},{text:`Nenhum: repetir dados sempre é melhor`,feedback:`Só com motivo medido (desnormalização consciente).`}]}},{type:`exercise`,exercise:{id:`e7-idx-1`,kind:`mcq`,prompt:`Qual é um **custo** de adicionar um índice?`,difficulty:`facil`,skills:[`bd-modelagem`],hints:[`Quando você insere uma linha, o que mais precisa ser atualizado?`],explanation:`Cada INSERT/UPDATE/DELETE precisa manter o índice atualizado, e ele ocupa espaço. Por isso não se indexa tudo.`,options:[{text:`Consultas por aquela coluna ficam mais lentas`,feedback:`Pelo contrário: ficam mais rápidas.`},{text:`Escritas ficam mais lentas e o banco ocupa mais espaço`,correct:!0,feedback:`Isso: é uma troca.`},{text:`Os dados podem ser perdidos`,feedback:`Índices não afetam a durabilidade.`},{text:`Impede o uso de JOIN`,feedback:`Índices costumam acelerar JOINs.`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e7-tx-desafio`,kind:`code`,lang:`python`,prompt:"Com `sqlite3`, escreva `transferir(con, origem, destino, valor)` que move o valor entre contas **atomicamente**: se a origem não tiver saldo suficiente (ou o valor for <= 0), lance `ValueError` e **nada** pode mudar no banco. A tabela é `contas(id, saldo)`.",difficulty:`desafio`,skills:[`bd-modelagem`],hints:["`with con:` abre uma transação: commit no fim, rollback se houver exceção dentro.",`Leia o saldo da origem dentro da transação antes de debitar.`],explanation:`Fazer a verificação e as duas atualizações dentro do mesmo bloco transacional garante atomicidade: ou as duas atualizações acontecem, ou nenhuma.`,starter:`import sqlite3

def transferir(con, origem, destino, valor):
    con.execute("UPDATE contas SET saldo = saldo - ? WHERE id = ?", (valor, origem))
    con.execute("UPDATE contas SET saldo = saldo + ? WHERE id = ?", (valor, destino))
    con.commit()`,solution:`import sqlite3

def transferir(con, origem, destino, valor):
    with con:
        if valor <= 0:
            raise ValueError("valor inválido")
        (saldo,) = con.execute("SELECT saldo FROM contas WHERE id = ?", (origem,)).fetchone()
        if saldo < valor:
            raise ValueError("saldo insuficiente")
        con.execute("UPDATE contas SET saldo = saldo - ? WHERE id = ?", (valor, origem))
        con.execute("UPDATE contas SET saldo = saldo + ? WHERE id = ?", (valor, destino))`,tests:[{name:`transferência válida`,code:`import sqlite3
con = sqlite3.connect(":memory:")
con.execute("CREATE TABLE contas (id INTEGER PRIMARY KEY, saldo REAL)")
con.executemany("INSERT INTO contas VALUES (?, ?)", [(1, 100), (2, 0)]); con.commit()
transferir(con, 1, 2, 40)
assert con.execute("SELECT saldo FROM contas ORDER BY id").fetchall() == [(60,), (40,)]`},{name:`saldo insuficiente não muda nada`,code:`import sqlite3
con = sqlite3.connect(":memory:")
con.execute("CREATE TABLE contas (id INTEGER PRIMARY KEY, saldo REAL)")
con.executemany("INSERT INTO contas VALUES (?, ?)", [(1, 10), (2, 0)]); con.commit()
try:
    transferir(con, 1, 2, 50)
    assert False, "deveria lançar ValueError"
except ValueError:
    pass
assert con.execute("SELECT saldo FROM contas ORDER BY id").fetchall() == [(10,), (0,)]`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:`**Sistema de cadastro (parte 6)**: normalize o esquema até a 3FN, crie índices para as buscas mais comuns (confira com EXPLAIN QUERY PLAN) e faça a matrícula em várias disciplinas numa única transação.`},{type:`project`,projectId:`p3-cadastro`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- 1FN, 2FN, 3FN reduzem redundância e anomalias.
- Índice B-tree: leitura O(log n), custo em escrita e espaço.
- Transações ACID: commit/rollback.`}]}],cards:[{id:`l7-normalizacao-indices#1`,front:`O que significa o A de ACID?`,back:`Atomicidade: a transação acontece por completo ou não acontece.`},{id:`l7-normalizacao-indices#2`,front:`Quando criar um índice?`,back:`Em colunas usadas com frequência em WHERE, JOIN ou ORDER BY, verificando com EXPLAIN.`},{id:`l7-normalizacao-indices#3`,front:`O que é a 3FN?`,back:`Nenhum atributo não-chave depende de outro atributo não-chave (sem dependências transitivas).`}]};export{e as default};
//# sourceMappingURL=l7-normalizacao-indices-D_LheiEx.js.map