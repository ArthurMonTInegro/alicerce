var e={id:`l7-isolamento-concorrencia`,moduleId:`m7-3`,title:`Transações concorrentes e níveis de isolamento`,titleEn:`Concurrent transactions and isolation levels`,summary:`O que dá errado quando duas transações mexem nos mesmos dados ao mesmo tempo (leitura suja, leitura não repetível, fantasma, atualização perdida e write skew), o que cada nível de isolamento garante no padrão SQL, no PostgreSQL e no SQLite, como o MVCC entrega instantâneos e como escrever código que não perde dinheiro: UPDATE atômico, FOR UPDATE, versão otimista e repetição.`,minutes:50,objectives:[`Reconhecer, num escalonamento de duas transações, leitura suja, leitura não repetível, leitura fantasma, atualização perdida e write skew`,`Dizer o que READ COMMITTED, REPEATABLE READ e SERIALIZABLE garantem no padrão SQL e no PostgreSQL, e qual nível cada banco comum usa por padrão`,`Explicar como o MVCC usa versões e instantâneos para que quem lê não bloqueie quem escreve`,`Evitar a atualização perdida com UPDATE atômico condicional, bloqueio (FOR UPDATE), controle otimista por versão ou nível serializável com repetição`],skills:[`bd-modelagem`],terms:[{pt:`nível de isolamento`,en:`isolation level`,def:`Quanto uma transação fica protegida dos efeitos das transações concorrentes. O padrão SQL define quatro.`,example:`Read Committed is the default isolation level in PostgreSQL.`},{pt:`escalonamento`,en:`schedule`,def:`A ordem em que o banco intercala as operações de transações concorrentes.`},{pt:`serializável`,en:`serializable`,def:`Execução concorrente com o mesmo efeito de alguma execução em série, uma transação por vez.`,example:`Serializable isolation makes concurrent transactions behave as if they ran one at a time.`},{pt:`leitura suja`,en:`dirty read`,def:`Ler um dado que outra transação escreveu e ainda não confirmou.`},{pt:`leitura não repetível`,en:`non-repeatable read`,def:`Reler, na mesma transação, uma linha que outra transação alterou e confirmou no meio, e ver outro valor.`},{pt:`leitura fantasma`,en:`phantom read`,def:`Repetir uma consulta com WHERE e receber outro conjunto de linhas, porque outra transação inseriu ou apagou linhas que satisfazem a condição.`},{pt:`atualização perdida`,en:`lost update`,def:`Duas transações leem o mesmo valor, calculam um novo e gravam; a segunda escrita apaga a primeira.`},{pt:`distorção de escrita`,en:`write skew`,def:`Duas transações leem os mesmos dados, decidem com base neles e escrevem linhas diferentes, quebrando juntas uma regra que cada uma respeitava.`},{pt:`anomalia de serialização`,en:`serialization anomaly`,def:`Resultado de transações concorrentes que nenhuma ordem serial produziria.`},{pt:`bloqueio`,en:`lock`,def:`Reserva de um recurso (uma linha, uma tabela) por uma transação; quem chega depois espera.`,example:`SELECT ... FOR UPDATE acquires a row-level lock on the returned rows.`},{pt:`controle de concorrência multiversão`,en:`multiversion concurrency control (MVCC)`,def:`Guardar várias versões de cada linha para que cada transação leia as que estavam confirmadas no seu instantâneo.`},{pt:`instantâneo`,en:`snapshot`,def:`A visão do banco que uma transação usa: o que já estava confirmado num certo momento.`},{pt:`isolamento de instantâneo`,en:`snapshot isolation`,def:`Cada transação lê de um único instantâneo, e o primeiro a confirmar vence quando duas escrevem a mesma linha. É o REPEATABLE READ do PostgreSQL.`},{pt:`controle otimista`,en:`optimistic concurrency control`,def:`Gravar só se ninguém mudou o dado desde a leitura (por exemplo, conferindo uma coluna de versão) e tentar de novo se mudou.`},{pt:`falha de serialização`,en:`serialization failure`,def:`Erro com que o banco aborta uma transação para manter o isolamento (SQLSTATE 40001). A aplicação deve repetir a transação inteira.`,example:`ERROR: could not serialize access due to concurrent update`}],references:[`postgres-docs`,`sqlite-docs`,`ddia`,`cmu-15445`,`python-docs`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Na lição anterior, o **I** de ACID coube numa frase: transações concorrentes não veem os estados intermediários umas das outras, "e há níveis de isolamento". Esta lição abre essa caixa, porque é nela que mora uma classe inteira de bugs que **não dá erro nenhum**: o saldo que fica errado, o assento de ônibus vendido duas vezes, o estoque que fica negativo.

Cada transação, sozinha, pode estar perfeita. O problema aparece quando duas rodam **ao mesmo tempo** e o banco intercala as operações delas. Pense em dois Pix saindo de uma conta conjunta no mesmo segundo, cada um mandado por um titular: os dois leem o saldo de R$ 100, cada um calcula o novo saldo e grava. Um dos débitos some.

O ideal seria que o resultado fosse sempre igual ao de alguma execução **uma depois da outra**: é o isolamento {{serializável|serializable}}. Ele custa espera e transações abortadas, então os bancos oferecem {{níveis de isolamento|isolation levels}} mais fracos, e os servidores mais usados não vêm em serializável por padrão: o PostgreSQL vem em READ COMMITTED. Para escrever código correto, você precisa saber quais anomalias o seu nível deixa passar e como se defender delas.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`### Escalonamento: operações intercaladas
Uma transação é uma sequência de leituras e escritas. Quando várias rodam juntas, o banco intercala as operações delas numa certa ordem, o {{escalonamento|schedule}}. Um escalonamento é **serial** quando cada transação termina antes de a próxima começar, e **serializável** quando o efeito final é igual ao de algum escalonamento serial (qualquer um). O serial é seguro e lento; o trabalho do banco é deixar as transações se intercalarem sem produzir um resultado que nenhuma ordem serial produziria.

### As anomalias
Cada anomalia é um jeito de a intercalação dar errado. As três primeiras são as que o padrão SQL usa para definir os níveis. As duas últimas ficaram de fora dessa definição; um artigo de 1995 que a criticou (*A Critique of ANSI SQL Isolation Levels*, de Berenson e colegas) mostrou por que elas importam, e são elas que mais aparecem em sistemas reais.

- **{{Leitura suja|dirty read}}**: T2 lê um valor que T1 escreveu e **ainda não confirmou**. Se T1 desfizer tudo com ROLLBACK, T2 usou um valor que nunca existiu. Exemplo: o app mostra um saldo que já desconta um Pix que depois falhou e foi desfeito.
- **{{Leitura não repetível|non-repeatable read}}**: T1 lê uma linha, T2 altera essa linha e confirma, e T1, ao ler de novo, vê outro valor. Exemplo: um relatório confere o saldo de uma conta duas vezes e cada leitura dá um número.
- **{{Leitura fantasma|phantom read}}**: T1 repete uma consulta com WHERE e o **conjunto** de linhas mudou, porque T2 inseriu ou apagou linhas que satisfazem a condição. Exemplo: a contagem de reservas do assento 12 dá 0 e, logo depois, 1.
- **{{Atualização perdida|lost update}}**: T1 e T2 leem o mesmo valor, cada uma calcula um novo a partir dele e grava; a segunda escrita apaga a primeira. Exemplo: os dois Pix da conta conjunta.
- **{{Distorção de escrita|write skew}}**: T1 e T2 leem os mesmos dados, cada uma decide com base neles e escreve numa linha **diferente**; juntas, quebram uma regra que nenhuma quebraria sozinha. Exemplo: no hospital, a regra é ter pelo menos uma médica de plantão; Ana e Bia estão de plantão e pedem para sair ao mesmo tempo; cada transação vê "duas de plantão, posso sair", e o plantão fica vazio.

### Os quatro níveis do padrão SQL
O padrão define cada nível pelas anomalias que ele proíbe. A tabela segue a da documentação do PostgreSQL, que acrescenta uma coluna para a {{anomalia de serialização|serialization anomaly}}: qualquer resultado que nenhuma ordem serial produziria. A atualização perdida e o write skew são casos dela.`},{type:`table`,head:[`Nível`,`Leitura suja`,`Leitura não repetível`,`Leitura fantasma`,`Anomalia de serialização`],rows:[[`READ UNCOMMITTED`,`permitida (mas não acontece no PostgreSQL)`,`possível`,`possível`,`possível`],[`READ COMMITTED`,`impossível`,`possível`,`possível`,`possível`],[`REPEATABLE READ`,`impossível`,`impossível`,`permitida (mas não acontece no PostgreSQL)`,`possível`],[`SERIALIZABLE`,`impossível`,`impossível`,`impossível`,`impossível`]],caption:`O padrão diz o mínimo que cada nível garante; um banco pode garantir mais. "Possível" quer dizer que o nível não impede a anomalia.`},{type:`md`,text:`O nome do nível não conta a história toda, porque cada banco o implementa do seu jeito:

- **PostgreSQL**: o padrão é READ COMMITTED, em que cada **comando** enxerga o que estava confirmado quando ele começou. READ UNCOMMITTED se comporta igual a READ COMMITTED. REPEATABLE READ usa um único instantâneo para a transação inteira (tirado no primeiro comando dela), técnica conhecida como {{isolamento de instantâneo|snapshot isolation}}. SERIALIZABLE acrescenta a detecção de conflitos do SSI (*Serializable Snapshot Isolation*): quando vê um padrão de leituras e escritas que poderia não ter equivalente serial, aborta uma das transações (às vezes, por precaução, sem que houvesse anomalia de fato).
- **MySQL (InnoDB)**: o padrão é REPEATABLE READ, com regras próprias sobre o que cada comando enxerga. Mesmo nome, garantias diferentes: leia a documentação do banco que você usa.
- **SQLite**: só existe um escritor por vez. Nas palavras da documentação, ele implementa transações serializáveis "serializando de fato as escritas": quem quer escrever espera a vez ou recebe o erro \`database is locked\`.

### Como o banco isola: bloqueios e versões
Há duas ferramentas básicas. Um {{bloqueio|lock}} reserva uma linha (ou a tabela, ou o banco inteiro) para uma transação, e quem chega depois espera. É simples, mas faz leitores e escritores esperarem uns pelos outros.

O {{controle de concorrência multiversão|multiversion concurrency control (MVCC)}}, usado pelo PostgreSQL, pelo InnoDB e pelo Oracle, guarda **várias versões** de cada linha. Um UPDATE não destrói a versão anterior: no PostgreSQL, ele marca a versão antiga como apagada e grava uma nova ao lado; no InnoDB e no Oracle, a versão antiga fica num registro de desfazer (*undo log*). Cada transação lê a partir de um {{instantâneo|snapshot}}, uma "foto" de quais transações já estavam confirmadas, e enxerga a versão certa para aquela foto. Por isso, como diz a documentação do PostgreSQL, ler nunca bloqueia escrever e escrever nunca bloqueia ler. Versões antigas que nenhuma transação enxerga mais são limpas depois (no PostgreSQL, pelo VACUUM). Duas transações que querem **escrever** a mesma linha continuam se bloqueando: a segunda espera a primeira terminar.

### Defesas que funcionam`},{type:`table`,head:[`Defesa`,`Como fica`,`Quando usar`],rows:[[`UPDATE atômico e condicional`,"`UPDATE contas SET saldo = saldo - 30 WHERE id = 1 AND saldo >= 30` e conferir quantas linhas mudaram",`sempre que a regra cabe num comando: ler, conferir e gravar viram uma coisa só. No READ COMMITTED do PostgreSQL, um segundo UPDATE na mesma linha espera o primeiro e reavalia o WHERE sobre a versão nova`],[`Bloqueio pessimista`,"`SELECT ... FOR UPDATE` (PostgreSQL, MySQL) trava as linhas lidas até o fim da transação; no SQLite, `BEGIN IMMEDIATE` pega a vaga de escritor logo no começo",`quando o programa precisa ler, pensar e depois gravar, e o conflito é frequente`],[`{{Controle otimista|optimistic concurrency control}} por versão`,"uma coluna `versao`; grave com `WHERE id = ? AND versao = ?` e some 1 à versão",`quando o conflito é raro. Zero linhas afetadas quer dizer que alguém mudou antes: releia e tente de novo`],[`Restrição`,"`UNIQUE (viagem, numero)`, `CHECK (saldo >= 0)`",`o banco confere a regra de forma atômica. Resolve a reserva dupla quando cada reserva é uma linha nova (INSERT), caso que nenhum FOR UPDATE resolve: não há linha para travar antes de ela existir`],[`SERIALIZABLE com repetição`,"`BEGIN ISOLATION LEVEL SERIALIZABLE` e um laço que repete a transação inteira se vier uma {{falha de serialização|serialization failure}} (SQLSTATE 40001)",`quando as regras envolvem várias linhas, como no plantão; protege até contra o write skew sem você prever cada conflito`]]},{type:`callout`,tone:`warn`,text:"No módulo `sqlite3` do Python, no modo padrão (o legado, controlado por `isolation_level`), o BEGIN implícito só é enviado antes de um INSERT, UPDATE, DELETE ou REPLACE. Um SELECT que vem antes deles roda **fora** da transação, mesmo dentro de `with con:`. Num programa com várias conexões, a verificação feita por esse SELECT pode estar velha quando o UPDATE chegar. Para ler e escrever na mesma transação, abra-a você mesmo: conecte com `isolation_level=None`, execute `BEGIN IMMEDIATE` antes da leitura e `COMMIT` no fim (ou `ROLLBACK`, se der erro). No Python 3.12 ou mais novo, `sqlite3.connect(..., autocommit=False)` mantém sempre uma transação aberta, como pede a PEP 249.",title:`O SELECT que ficou de fora`},{type:`callout`,tone:`deep`,text:"Em REPEATABLE READ e SERIALIZABLE, o PostgreSQL resolve certos conflitos **abortando** uma das transações, e isso vale até para o UPDATE atômico: se a linha foi alterada e confirmada por outra transação depois do seu instantâneo, o UPDATE recebe `could not serialize access due to concurrent update`. Nesses níveis, todo código que escreve precisa de um laço que repete a transação inteira (com um limite de tentativas). A documentação diz isso com todas as letras: aplicações que usam esses níveis precisam estar preparadas para repetir transações. E um detalhe de nomes: no Oracle, o nível chamado SERIALIZABLE é, na verdade, isolamento de instantâneo, e deixa o write skew passar.",title:`O preço dos níveis mais fortes`}]},{stage:`exemplo`,blocks:[{type:`md`,text:`Rita e Júlio são titulares da mesma conta conjunta, com saldo de R$ 100. No mesmo segundo, Rita manda um Pix de R$ 30 e Júlio, um de R$ 50. O aplicativo faz o que parece natural: lê o saldo, confere se dá, calcula o novo valor e grava. O banco está em READ COMMITTED.`},{type:`table`,head:[`Instante`,`T1 (Pix de R$ 30)`,`T2 (Pix de R$ 50)`,`Saldo confirmado`],rows:[[`1`,"`SELECT saldo` → 100",``,`100`],[`2`,``,"`SELECT saldo` → 100",`100`],[`3`,"`UPDATE contas SET saldo = 70`; `COMMIT`",``,`70`],[`4`,``,"`UPDATE contas SET saldo = 50`; `COMMIT`",`50`]],caption:`Saíram R$ 80, mas o saldo caiu só R$ 50: o débito de T1 se perdeu. Nenhum comando deu erro, e cada transação, sozinha, estava certa.`},{type:`trace`,code:`saldo = 100                # o valor confirmado no banco

lido_t1 = saldo            # T1: SELECT saldo -> 100
lido_t2 = saldo            # T2: SELECT saldo -> 100
saldo = lido_t1 - 30       # T1: UPDATE ... SET saldo = 70; COMMIT
saldo = lido_t2 - 50       # T2: UPDATE ... SET saldo = 50; COMMIT
print("saldo final:", saldo, "(em série seria 20)")`,caption:`Cada transação calcula o novo saldo a partir da própria leitura. A leitura de T2 ficou velha no instante em que T1 gravou.`},{type:`md`,text:`Agora o mesmo par de Pix com o UPDATE atômico e condicional, ainda em READ COMMITTED, no PostgreSQL:`},{type:`table`,head:[`Instante`,`T1 (Pix de R$ 30)`,`T2 (Pix de R$ 50)`,`Saldo confirmado`],rows:[[`1`,"`UPDATE contas SET saldo = saldo - 30 WHERE id = 1 AND saldo >= 30`: trava a linha e cria a versão 70, ainda não confirmada",``,`100`],[`2`,``,`o mesmo UPDATE com 50: encontra a linha travada e **espera**`,`100`],[`3`,"`COMMIT`",`acorda, pega a versão recém-confirmada (70), reavalia o WHERE (70 >= 50) e grava 20`,`70`],[`4`,``,"`COMMIT`",`20`]],caption:`O banco pôs as duas escritas na mesma linha em fila. Se o saldo inicial fosse R$ 60, o WHERE reavaliado daria falso e o UPDATE de T2 mudaria 0 linhas: o programa saberia que o Pix de Júlio foi recusado.`},{type:`md`,text:"E se o banco estivesse em REPEATABLE READ, com o código de ler, calcular e gravar? No instante 4, T2 tentaria atualizar uma linha que outra transação alterou e confirmou depois do instantâneo de T2. O PostgreSQL recusa com `ERROR: could not serialize access due to concurrent update`, e T2 precisa recomeçar do zero: na segunda tentativa, ela lê 70 e grava 20. A atualização não se perde, mas o código precisa saber **repetir**."}]},{stage:`codigo`,blocks:[{type:`md`,text:"Aqui no navegador, o banco em memória vive numa conexão só, então não dá para ter duas transações simultâneas de verdade. Mas o controle otimista não precisa disso para ser demonstrado: basta que as duas **leituras** aconteçam antes das duas escritas, como no exemplo. Veja a reserva de assento numa viagem de ônibus, com uma coluna `versao`:"},{type:`code`,lang:`python`,code:`import sqlite3

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
print("assento 13:", ler(1001, 13))`,runnable:!0,caption:`O UPDATE só grava se a versão ainda é a que foi lida. O segundo a gravar muda 0 linhas, fica sabendo do conflito e pode tentar de novo, em vez de sobrescrever a reserva de outra pessoa.`},{type:`md`,text:`Num PostgreSQL de verdade, as outras defesas ficam assim (para rodar no seu computador, não neste navegador):`},{type:`code`,lang:`sql`,code:`-- 1. Operação atômica: funciona em qualquer nível de isolamento.
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
COMMIT;  -- o UPDATE ou o COMMIT pode falhar com SQLSTATE 40001: repita a transação inteira`,runnable:!1,caption:`Três formas de fazer o débito no PostgreSQL sem perder atualizações.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e7-iso-anomalia`,kind:`mcq`,prompt:`Um relatório abre uma transação e lê o saldo da conta 7: R$ 500. Enquanto isso, outra transação registra um Pix de R$ 150 dessa conta e confirma. O relatório, ainda na mesma transação, lê de novo a conta 7 e vê R$ 350. Que anomalia é essa?`,difficulty:`facil`,skills:[`bd-modelagem`],hints:[`O Pix já estava confirmado quando o relatório leu pela segunda vez?`,`O que mudou entre as duas leituras: o valor de uma linha que já existia ou quais linhas existem?`],explanation:`É uma leitura não repetível: a mesma linha, lida duas vezes na mesma transação, mudou porque outra transação confirmou uma alteração entre as leituras. No READ COMMITTED (o padrão do PostgreSQL), cada comando enxerga o que estava confirmado quando começou, e por isso a segunda leitura vê o Pix. Em REPEATABLE READ, a transação inteira usa o mesmo instantâneo e as duas leituras dariam R$ 500.`,options:[{text:`Leitura suja`,feedback:`Leitura suja seria ver o Pix **antes** do COMMIT dele. Aqui o Pix já estava confirmado quando o relatório releu.`},{text:`Leitura não repetível`,correct:!0,feedback:`Isso: a mesma linha, relida na mesma transação, tem outro valor porque outra transação confirmou uma mudança no meio. READ COMMITTED deixa acontecer; REPEATABLE READ impede.`},{text:`Leitura fantasma`,feedback:`O fantasma é sobre o **conjunto** de linhas de um WHERE mudar: linhas novas ou removidas. Aqui é a mesma linha, com outro valor.`},{text:`Atualização perdida`,feedback:`O relatório só leu. Para perder uma atualização, duas transações precisam gravar, e uma escrita apagar a outra.`}]}},{type:`exercise`,exercise:{id:`e7-iso-escala`,kind:`predict`,lang:`python`,prompt:'O código simula três transações sobre o mesmo saldo. `"gravar"` grava um valor calculado a partir da leitura que a transação fez antes (ler, calcular, gravar); `"atomico"` faz como `UPDATE ... SET saldo = saldo - valor`, usando o saldo do momento. O que é impresso?',difficulty:`intermediario`,skills:[`bd-modelagem`],hints:["Quando T1 lê, quanto vale o saldo? Esse valor guardado em `lido` muda depois?",'Em "gravar", a conta usa `banco["saldo"]` ou `lido[tx]`?','Siga linha a linha e anote `banco["saldo"]` depois de cada passo.'],explanation:`T1 lê 100 e guarda. T2 debita 50 de forma atômica (100 → 50). T1 grava 100 − 30 = 70, calculado sobre a leitura velha: o débito de T2 some. T3 debita 10 do valor atual (70 → 60). Em série, o saldo terminaria em 100 − 50 − 30 − 10 = 10. Repare que T2 fez a coisa certa e mesmo assim perdeu o débito: basta **um** caminho de escrita do tipo ler, calcular e gravar para estragar os outros. Por isso a defesa precisa valer em todo lugar do código que grava naquela coluna.`,code:`banco = {"saldo": 100}
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
print("final:", banco["saldo"])`,answer:`T1 ler 100
T2 atomico 50
T1 gravar 70
T3 atomico 60
final: 60`}},{type:`exercise`,exercise:{id:`e7-iso-debito`,kind:`fix`,lang:`python`,prompt:"A função abaixo debita de uma conta, mas tem uma condição de corrida: entre o SELECT e o UPDATE, outro cliente pode debitar da mesma conta, e então um dos débitos se perde ou o saldo fica negativo. Corrija `debitar(con, conta_id, valor)`:\n\n- devolve `True` se debitou e `False` se o saldo não cobre o valor ou se a conta não existe;\n- lança `ValueError` se `valor <= 0`, sem mexer no banco;\n- confirma a mudança (commit) antes de devolver;\n- o saldo nunca pode ficar negativo, e nenhum débito pode se perder.\n\nA tabela é `contas(id, saldo)`. Os testes usam uma conexão especial: se você ler a conta fora de uma transação, **outro caixa eletrônico debita R$ 30 da conta 1** (com um UPDATE condicional) e confirma antes do seu próximo comando de escrita, como aconteceria num servidor com vários clientes.",difficulty:`intermediario`,skills:[`bd-modelagem`,`bd-sql`],hints:[`O que o outro caixa pode fazer entre o seu SELECT e o seu UPDATE? Que valor o seu UPDATE grava, então?`,`Dá para o próprio UPDATE conferir se o saldo cobre o valor, no mesmo instante em que grava?`,`Depois de um UPDATE, como o Python diz quantas linhas ele mudou?`,`Se quiser manter o SELECT, a gravação precisa falhar quando o saldo mudou desde a leitura. E o que você faz quando ela falha?`],explanation:"O UPDATE condicional `UPDATE contas SET saldo = saldo - ? WHERE id = ? AND saldo >= ?` junta leitura, verificação e escrita num comando só, que o banco executa de forma atômica, e `cur.rowcount` diz se a linha mudou (1) ou não (0: saldo insuficiente ou conta inexistente). Não sobra intervalo entre ler e gravar para outro cliente entrar. A versão otimista (SELECT, depois UPDATE com `AND saldo = ?` igual ao valor lido, repetindo quando mudar 0 linhas) também passa, só que é mais longa; abrir a transação antes de ler (`BEGIN IMMEDIATE`, como no aviso da explicação) também. Conferir com SELECT e depois gravar `saldo = saldo - ?` não basta: a conferência fica velha, e o saldo pode ficar negativo. E pôr o SELECT dentro de `with con:` não muda nada: no modo legado do `sqlite3`, ele roda fora da transação.",starter:`def debitar(con, conta_id, valor):
    # condição de corrida: entre este SELECT e o UPDATE, outro cliente pode debitar
    linha = con.execute("SELECT saldo FROM contas WHERE id = ?", (conta_id,)).fetchone()
    saldo = linha[0]
    if saldo < valor:
        return False
    con.execute("UPDATE contas SET saldo = ? WHERE id = ?", (saldo - valor, conta_id))
    con.commit()
    return True`,solution:`def debitar(con, conta_id, valor):
    if valor <= 0:
        raise ValueError("o valor do débito precisa ser positivo")
    cur = con.execute(
        "UPDATE contas SET saldo = saldo - ? WHERE id = ? AND saldo >= ?",
        (valor, conta_id, valor),
    )
    con.commit()
    return cur.rowcount == 1`,tests:[{name:`outro caixa debita no meio`,code:`import sqlite3 as _sqlite3

class _CursorVizinho:
    def __init__(self, dono):
        self._dono = dono
        self._cur = dono._con.cursor()

    def execute(self, sql, params=()):
        self._dono._antes(sql)
        self._cur.execute(sql, params)
        return self

    def __iter__(self):
        return iter(self._cur)

    def __getattr__(self, nome):
        return getattr(self._cur, nome)

class _CaixaVizinho:
    _ESCRITAS = ("UPDATE", "INSERT", "DELETE", "REPLACE", "BEGIN")

    def __init__(self, saldo_inicial, debito_vizinho=30):
        self._con = _sqlite3.connect(":memory:")
        self._con.execute("CREATE TABLE contas (id INTEGER PRIMARY KEY, saldo INTEGER NOT NULL)")
        self._con.execute("INSERT INTO contas VALUES (1, ?)", (saldo_inicial,))
        self._con.commit()
        self._vizinho = debito_vizinho
        self._leu_fora = False
        self.vizinho_debitou = 0

    def _antes(self, sql):
        palavra = (sql.split() or [""])[0].upper()
        if palavra in self._ESCRITAS and self._leu_fora and self._vizinho and not self._con.in_transaction:
            cur = self._con.execute("UPDATE contas SET saldo = saldo - ? WHERE id = 1 AND saldo >= ?", (self._vizinho, self._vizinho))
            self._con.commit()
            if cur.rowcount == 1:
                self.vizinho_debitou = self._vizinho
            self._vizinho = 0
        if palavra in ("SELECT", "WITH") and not self._con.in_transaction:
            self._leu_fora = True

    def execute(self, sql, params=()):
        self._antes(sql)
        return self._con.execute(sql, params)

    def cursor(self):
        return _CursorVizinho(self)

    def __enter__(self):
        self._con.__enter__()
        return self

    def __exit__(self, *exc):
        return self._con.__exit__(*exc)

    def __getattr__(self, nome):
        return getattr(self._con, nome)

    def __setattr__(self, nome, valor):
        if nome.startswith("_") or nome == "vizinho_debitou":
            object.__setattr__(self, nome, valor)
        else:
            setattr(self._con, nome, valor)

    def saldo(self):
        return self._con.execute("SELECT saldo FROM contas WHERE id = 1").fetchone()[0]
con = _CaixaVizinho(100)
ok = debitar(con, 1, 40)
final = con.saldo()
esperado = 100 - 40 - con.vizinho_debitou
assert ok is True, f"havia saldo para os dois débitos (os seus 40 e os 30 do outro caixa), mas debitar devolveu {ok!r}. Se a sua gravação depende do valor lido, o que fazer quando outro cliente mudou a linha antes?"
assert final == esperado, f"saldo final {final}, esperado {esperado}: o outro caixa debitou {con.vizinho_debitou} e você, 40. Um dos débitos se perdeu, porque o seu UPDATE gravou um valor calculado a partir de uma leitura velha"`},{name:`o saldo nunca fica negativo`,code:`import sqlite3 as _sqlite3

class _CursorVizinho:
    def __init__(self, dono):
        self._dono = dono
        self._cur = dono._con.cursor()

    def execute(self, sql, params=()):
        self._dono._antes(sql)
        self._cur.execute(sql, params)
        return self

    def __iter__(self):
        return iter(self._cur)

    def __getattr__(self, nome):
        return getattr(self._cur, nome)

class _CaixaVizinho:
    _ESCRITAS = ("UPDATE", "INSERT", "DELETE", "REPLACE", "BEGIN")

    def __init__(self, saldo_inicial, debito_vizinho=30):
        self._con = _sqlite3.connect(":memory:")
        self._con.execute("CREATE TABLE contas (id INTEGER PRIMARY KEY, saldo INTEGER NOT NULL)")
        self._con.execute("INSERT INTO contas VALUES (1, ?)", (saldo_inicial,))
        self._con.commit()
        self._vizinho = debito_vizinho
        self._leu_fora = False
        self.vizinho_debitou = 0

    def _antes(self, sql):
        palavra = (sql.split() or [""])[0].upper()
        if palavra in self._ESCRITAS and self._leu_fora and self._vizinho and not self._con.in_transaction:
            cur = self._con.execute("UPDATE contas SET saldo = saldo - ? WHERE id = 1 AND saldo >= ?", (self._vizinho, self._vizinho))
            self._con.commit()
            if cur.rowcount == 1:
                self.vizinho_debitou = self._vizinho
            self._vizinho = 0
        if palavra in ("SELECT", "WITH") and not self._con.in_transaction:
            self._leu_fora = True

    def execute(self, sql, params=()):
        self._antes(sql)
        return self._con.execute(sql, params)

    def cursor(self):
        return _CursorVizinho(self)

    def __enter__(self):
        self._con.__enter__()
        return self

    def __exit__(self, *exc):
        return self._con.__exit__(*exc)

    def __getattr__(self, nome):
        return getattr(self._con, nome)

    def __setattr__(self, nome, valor):
        if nome.startswith("_") or nome == "vizinho_debitou":
            object.__setattr__(self, nome, valor)
        else:
            setattr(self._con, nome, valor)

    def saldo(self):
        return self._con.execute("SELECT saldo FROM contas WHERE id = 1").fetchone()[0]
con = _CaixaVizinho(100)
ok = debitar(con, 1, 80)
final = con.saldo()
assert final >= 0, f"o saldo ficou {final}: entre a sua verificação e o seu débito, o outro caixa sacou 30. A verificação e o débito precisam ser uma coisa só"
assert final == 100 - (80 if ok else 0) - con.vizinho_debitou, f"o saldo final {final} não fecha com os débitos feitos (o seu: {80 if ok else 0}; o do outro caixa: {con.vizinho_debitou})"
assert ok or con.vizinho_debitou, "nenhum dos dois débitos aconteceu, mas o primeiro deles sempre cabia no saldo de 100"`},{name:`saldo insuficiente`,code:`import sqlite3 as _sqlite3

class _CursorVizinho:
    def __init__(self, dono):
        self._dono = dono
        self._cur = dono._con.cursor()

    def execute(self, sql, params=()):
        self._dono._antes(sql)
        self._cur.execute(sql, params)
        return self

    def __iter__(self):
        return iter(self._cur)

    def __getattr__(self, nome):
        return getattr(self._cur, nome)

class _CaixaVizinho:
    _ESCRITAS = ("UPDATE", "INSERT", "DELETE", "REPLACE", "BEGIN")

    def __init__(self, saldo_inicial, debito_vizinho=30):
        self._con = _sqlite3.connect(":memory:")
        self._con.execute("CREATE TABLE contas (id INTEGER PRIMARY KEY, saldo INTEGER NOT NULL)")
        self._con.execute("INSERT INTO contas VALUES (1, ?)", (saldo_inicial,))
        self._con.commit()
        self._vizinho = debito_vizinho
        self._leu_fora = False
        self.vizinho_debitou = 0

    def _antes(self, sql):
        palavra = (sql.split() or [""])[0].upper()
        if palavra in self._ESCRITAS and self._leu_fora and self._vizinho and not self._con.in_transaction:
            cur = self._con.execute("UPDATE contas SET saldo = saldo - ? WHERE id = 1 AND saldo >= ?", (self._vizinho, self._vizinho))
            self._con.commit()
            if cur.rowcount == 1:
                self.vizinho_debitou = self._vizinho
            self._vizinho = 0
        if palavra in ("SELECT", "WITH") and not self._con.in_transaction:
            self._leu_fora = True

    def execute(self, sql, params=()):
        self._antes(sql)
        return self._con.execute(sql, params)

    def cursor(self):
        return _CursorVizinho(self)

    def __enter__(self):
        self._con.__enter__()
        return self

    def __exit__(self, *exc):
        return self._con.__exit__(*exc)

    def __getattr__(self, nome):
        return getattr(self._con, nome)

    def __setattr__(self, nome, valor):
        if nome.startswith("_") or nome == "vizinho_debitou":
            object.__setattr__(self, nome, valor)
        else:
            setattr(self._con, nome, valor)

    def saldo(self):
        return self._con.execute("SELECT saldo FROM contas WHERE id = 1").fetchone()[0]
con = _CaixaVizinho(50, debito_vizinho=0)
ok = debitar(con, 1, 80)
assert ok is False, f"o saldo de 50 não cobre 80: debitar deveria devolver False, e devolveu {ok!r}"
assert con.saldo() == 50, f"um débito recusado não pode mudar o saldo, mas ele ficou {con.saldo()}"`},{name:`valor exato zera a conta`,code:`import sqlite3 as _sqlite3

class _CursorVizinho:
    def __init__(self, dono):
        self._dono = dono
        self._cur = dono._con.cursor()

    def execute(self, sql, params=()):
        self._dono._antes(sql)
        self._cur.execute(sql, params)
        return self

    def __iter__(self):
        return iter(self._cur)

    def __getattr__(self, nome):
        return getattr(self._cur, nome)

class _CaixaVizinho:
    _ESCRITAS = ("UPDATE", "INSERT", "DELETE", "REPLACE", "BEGIN")

    def __init__(self, saldo_inicial, debito_vizinho=30):
        self._con = _sqlite3.connect(":memory:")
        self._con.execute("CREATE TABLE contas (id INTEGER PRIMARY KEY, saldo INTEGER NOT NULL)")
        self._con.execute("INSERT INTO contas VALUES (1, ?)", (saldo_inicial,))
        self._con.commit()
        self._vizinho = debito_vizinho
        self._leu_fora = False
        self.vizinho_debitou = 0

    def _antes(self, sql):
        palavra = (sql.split() or [""])[0].upper()
        if palavra in self._ESCRITAS and self._leu_fora and self._vizinho and not self._con.in_transaction:
            cur = self._con.execute("UPDATE contas SET saldo = saldo - ? WHERE id = 1 AND saldo >= ?", (self._vizinho, self._vizinho))
            self._con.commit()
            if cur.rowcount == 1:
                self.vizinho_debitou = self._vizinho
            self._vizinho = 0
        if palavra in ("SELECT", "WITH") and not self._con.in_transaction:
            self._leu_fora = True

    def execute(self, sql, params=()):
        self._antes(sql)
        return self._con.execute(sql, params)

    def cursor(self):
        return _CursorVizinho(self)

    def __enter__(self):
        self._con.__enter__()
        return self

    def __exit__(self, *exc):
        return self._con.__exit__(*exc)

    def __getattr__(self, nome):
        return getattr(self._con, nome)

    def __setattr__(self, nome, valor):
        if nome.startswith("_") or nome == "vizinho_debitou":
            object.__setattr__(self, nome, valor)
        else:
            setattr(self._con, nome, valor)

    def saldo(self):
        return self._con.execute("SELECT saldo FROM contas WHERE id = 1").fetchone()[0]
con = _CaixaVizinho(80, debito_vizinho=0)
ok = debitar(con, 1, 80)
assert ok is True and con.saldo() == 0, f"com saldo 80, um débito de 80 é permitido e zera a conta; veio {ok!r} e saldo {con.saldo()}. Confira se a condição é >= ou >"`},{name:`conta inexistente`,code:`import sqlite3 as _sqlite3

class _CursorVizinho:
    def __init__(self, dono):
        self._dono = dono
        self._cur = dono._con.cursor()

    def execute(self, sql, params=()):
        self._dono._antes(sql)
        self._cur.execute(sql, params)
        return self

    def __iter__(self):
        return iter(self._cur)

    def __getattr__(self, nome):
        return getattr(self._cur, nome)

class _CaixaVizinho:
    _ESCRITAS = ("UPDATE", "INSERT", "DELETE", "REPLACE", "BEGIN")

    def __init__(self, saldo_inicial, debito_vizinho=30):
        self._con = _sqlite3.connect(":memory:")
        self._con.execute("CREATE TABLE contas (id INTEGER PRIMARY KEY, saldo INTEGER NOT NULL)")
        self._con.execute("INSERT INTO contas VALUES (1, ?)", (saldo_inicial,))
        self._con.commit()
        self._vizinho = debito_vizinho
        self._leu_fora = False
        self.vizinho_debitou = 0

    def _antes(self, sql):
        palavra = (sql.split() or [""])[0].upper()
        if palavra in self._ESCRITAS and self._leu_fora and self._vizinho and not self._con.in_transaction:
            cur = self._con.execute("UPDATE contas SET saldo = saldo - ? WHERE id = 1 AND saldo >= ?", (self._vizinho, self._vizinho))
            self._con.commit()
            if cur.rowcount == 1:
                self.vizinho_debitou = self._vizinho
            self._vizinho = 0
        if palavra in ("SELECT", "WITH") and not self._con.in_transaction:
            self._leu_fora = True

    def execute(self, sql, params=()):
        self._antes(sql)
        return self._con.execute(sql, params)

    def cursor(self):
        return _CursorVizinho(self)

    def __enter__(self):
        self._con.__enter__()
        return self

    def __exit__(self, *exc):
        return self._con.__exit__(*exc)

    def __getattr__(self, nome):
        return getattr(self._con, nome)

    def __setattr__(self, nome, valor):
        if nome.startswith("_") or nome == "vizinho_debitou":
            object.__setattr__(self, nome, valor)
        else:
            setattr(self._con, nome, valor)

    def saldo(self):
        return self._con.execute("SELECT saldo FROM contas WHERE id = 1").fetchone()[0]
con = _CaixaVizinho(100, debito_vizinho=0)
ok = debitar(con, 99, 10)
assert ok is False, f"a conta 99 não existe: debitar deveria devolver False, e devolveu {ok!r}"
assert con.saldo() == 100, "debitar da conta 99 não pode mexer na conta 1"`},{name:`o valor precisa ser positivo`,code:`import sqlite3 as _sqlite3

class _CursorVizinho:
    def __init__(self, dono):
        self._dono = dono
        self._cur = dono._con.cursor()

    def execute(self, sql, params=()):
        self._dono._antes(sql)
        self._cur.execute(sql, params)
        return self

    def __iter__(self):
        return iter(self._cur)

    def __getattr__(self, nome):
        return getattr(self._cur, nome)

class _CaixaVizinho:
    _ESCRITAS = ("UPDATE", "INSERT", "DELETE", "REPLACE", "BEGIN")

    def __init__(self, saldo_inicial, debito_vizinho=30):
        self._con = _sqlite3.connect(":memory:")
        self._con.execute("CREATE TABLE contas (id INTEGER PRIMARY KEY, saldo INTEGER NOT NULL)")
        self._con.execute("INSERT INTO contas VALUES (1, ?)", (saldo_inicial,))
        self._con.commit()
        self._vizinho = debito_vizinho
        self._leu_fora = False
        self.vizinho_debitou = 0

    def _antes(self, sql):
        palavra = (sql.split() or [""])[0].upper()
        if palavra in self._ESCRITAS and self._leu_fora and self._vizinho and not self._con.in_transaction:
            cur = self._con.execute("UPDATE contas SET saldo = saldo - ? WHERE id = 1 AND saldo >= ?", (self._vizinho, self._vizinho))
            self._con.commit()
            if cur.rowcount == 1:
                self.vizinho_debitou = self._vizinho
            self._vizinho = 0
        if palavra in ("SELECT", "WITH") and not self._con.in_transaction:
            self._leu_fora = True

    def execute(self, sql, params=()):
        self._antes(sql)
        return self._con.execute(sql, params)

    def cursor(self):
        return _CursorVizinho(self)

    def __enter__(self):
        self._con.__enter__()
        return self

    def __exit__(self, *exc):
        return self._con.__exit__(*exc)

    def __getattr__(self, nome):
        return getattr(self._con, nome)

    def __setattr__(self, nome, valor):
        if nome.startswith("_") or nome == "vizinho_debitou":
            object.__setattr__(self, nome, valor)
        else:
            setattr(self._con, nome, valor)

    def saldo(self):
        return self._con.execute("SELECT saldo FROM contas WHERE id = 1").fetchone()[0]
con = _CaixaVizinho(100, debito_vizinho=0)
try:
    debitar(con, 1, -50)
    assert False, "debitar(con, 1, -50) deveria lançar ValueError: um débito negativo viraria um crédito de 50"
except ValueError:
    pass
assert con.saldo() == 100, f"depois do ValueError, o saldo deveria continuar 100, mas ficou {con.saldo()}"
try:
    debitar(con, 1, 0)
    assert False, "debitar(con, 1, 0) deveria lançar ValueError: um débito precisa ser maior que zero"
except ValueError:
    pass`},{name:`a mudança é confirmada`,code:`import sqlite3 as _sqlite3

class _CursorVizinho:
    def __init__(self, dono):
        self._dono = dono
        self._cur = dono._con.cursor()

    def execute(self, sql, params=()):
        self._dono._antes(sql)
        self._cur.execute(sql, params)
        return self

    def __iter__(self):
        return iter(self._cur)

    def __getattr__(self, nome):
        return getattr(self._cur, nome)

class _CaixaVizinho:
    _ESCRITAS = ("UPDATE", "INSERT", "DELETE", "REPLACE", "BEGIN")

    def __init__(self, saldo_inicial, debito_vizinho=30):
        self._con = _sqlite3.connect(":memory:")
        self._con.execute("CREATE TABLE contas (id INTEGER PRIMARY KEY, saldo INTEGER NOT NULL)")
        self._con.execute("INSERT INTO contas VALUES (1, ?)", (saldo_inicial,))
        self._con.commit()
        self._vizinho = debito_vizinho
        self._leu_fora = False
        self.vizinho_debitou = 0

    def _antes(self, sql):
        palavra = (sql.split() or [""])[0].upper()
        if palavra in self._ESCRITAS and self._leu_fora and self._vizinho and not self._con.in_transaction:
            cur = self._con.execute("UPDATE contas SET saldo = saldo - ? WHERE id = 1 AND saldo >= ?", (self._vizinho, self._vizinho))
            self._con.commit()
            if cur.rowcount == 1:
                self.vizinho_debitou = self._vizinho
            self._vizinho = 0
        if palavra in ("SELECT", "WITH") and not self._con.in_transaction:
            self._leu_fora = True

    def execute(self, sql, params=()):
        self._antes(sql)
        return self._con.execute(sql, params)

    def cursor(self):
        return _CursorVizinho(self)

    def __enter__(self):
        self._con.__enter__()
        return self

    def __exit__(self, *exc):
        return self._con.__exit__(*exc)

    def __getattr__(self, nome):
        return getattr(self._con, nome)

    def __setattr__(self, nome, valor):
        if nome.startswith("_") or nome == "vizinho_debitou":
            object.__setattr__(self, nome, valor)
        else:
            setattr(self._con, nome, valor)

    def saldo(self):
        return self._con.execute("SELECT saldo FROM contas WHERE id = 1").fetchone()[0]
con = _CaixaVizinho(100, debito_vizinho=0)
debitar(con, 1, 10)
assert not con.in_transaction, "debitar terminou com uma transação aberta: confirme (commit) antes de devolver, senão o débito some quando a conexão fechar"
ok = debitar(con, 1, 10)
assert ok is True and con.saldo() == 80, f"dois débitos seguidos de 10 deveriam deixar 80; ficou {con.saldo()}"`}]}},{type:`exercise`,exercise:{id:`e7-iso-plantao`,kind:`mcq`,prompt:`No hospital, a regra é ter pelo menos uma médica de plantão. Ana e Bia estão de plantão e, ao mesmo tempo, cada uma pede para sair. O pedido de cada uma roda assim:

\`\`\`sql
BEGIN;
SELECT COUNT(*) FROM plantao WHERE turno = 42 AND de_plantao;  -- as duas veem 2
-- se for 2 ou mais, pode sair:
UPDATE plantao SET de_plantao = false WHERE turno = 42 AND medica = 'Ana';  -- ou 'Bia'
COMMIT;
\`\`\`

No PostgreSQL, qual é o nível de isolamento **mais fraco** em que esse código, sem nenhuma outra mudança, nunca deixa o plantão vazio?`,difficulty:`avancado`,skills:[`bd-modelagem`],hints:[`As duas transações escrevem na mesma linha?`,`O isolamento de instantâneo detecta duas escritas na mesma linha. Aqui, o conflito está entre o que uma transação leu e o que a outra escreveu.`],explanation:"É o write skew: cada transação lê o mesmo conjunto (as médicas de plantão), decide com base nele e escreve numa linha diferente. READ COMMITTED e REPEATABLE READ deixam passar, porque não há duas escritas na mesma linha para detectar. No SERIALIZABLE, o PostgreSQL acompanha também o que cada transação leu, percebe que cada uma leu o que a outra escreveu e aborta uma delas com SQLSTATE 40001; a aplicação repete a transação e, na segunda vez, conta 1 e não sai. Sem SERIALIZABLE, a saída é travar as linhas lidas: `SELECT medica FROM plantao WHERE turno = 42 AND de_plantao FOR UPDATE` (o FOR UPDATE não pode ser usado junto com COUNT) e contar no programa.",options:[{text:`READ COMMITTED`,feedback:`Cada SELECT vê o que estava confirmado quando começou. As duas contam 2 antes de qualquer UPDATE ser confirmado, e as duas saem.`},{text:`REPEATABLE READ`,feedback:`Esse nível é isolamento de instantâneo: cada transação conta 2 no seu instantâneo e, como elas atualizam linhas **diferentes**, não há conflito de escrita para detectar. As duas confirmam.`},{text:`SERIALIZABLE`,correct:!0,feedback:`Isso: o SSI percebe que cada transação leu o que a outra escreveu, um ciclo sem ordem serial possível, e aborta uma delas. Repetida, ela conta 1 e não sai.`},{text:`Nenhum: só uma restrição UNIQUE resolveria`,feedback:`UNIQUE não expressa "pelo menos uma". E existe nível que resolve; além dele, também resolveria travar as linhas lidas com FOR UPDATE, fazendo a segunda transação esperar a primeira.`}]}},{type:`exercise`,exercise:{id:`e7-iso-versoes`,kind:`sql`,prompt:"Num modelo simplificado do MVCC do PostgreSQL, cada versão de linha guarda quem a criou e quem a apagou (um UPDATE apaga a versão velha e cria uma nova):\n\n- `transacoes(id, status, confirmada_em)`: `status` é `'ativa'`, `'confirmada'` ou `'abortada'`; `confirmada_em` é o instante do COMMIT (NULL se não confirmou);\n- `versoes(conta, saldo, criada_por, apagada_por)`: `apagada_por` é NULL se ninguém apagou aquela versão.\n\nUm leitor tirou o instantâneo no **instante 50**. Para ele, uma versão é visível quando a transação que a criou foi confirmada até o instante 50 **e** ninguém a apagou ou quem a apagou ainda não estava confirmado no instante 50 (está ativa, abortou ou confirmou depois). Liste `conta` e `saldo` das versões visíveis, em ordem de conta.",difficulty:`avancado`,skills:[`bd-modelagem`,`bd-joins`],hints:[`Cada versão depende de duas transações: a que criou e a que apagou. Quantas vezes a tabela transacoes precisa entrar na consulta?`,`Nem toda versão foi apagada. Que tipo de JOIN mantém a versão quando apagada_por é NULL?`,`Escreva a condição "a versão continua viva" do lado de quem apagou e teste-a com a linha toda NULL: quanto vale uma comparação com NULL?`,`Outra saída: NOT EXISTS de uma transação confirmada até 50 que apagou a versão.`],explanation:"SELECT v.conta, v.saldo FROM versoes v JOIN transacoes c ON c.id = v.criada_por LEFT JOIN transacoes a ON a.id = v.apagada_por WHERE c.status = 'confirmada' AND c.confirmada_em <= 50 AND (a.id IS NULL OR a.status <> 'confirmada' OR a.confirmada_em > 50) ORDER BY v.conta; A transação que criou entra com JOIN e precisa estar confirmada até 50: isso esconde as versões de transações ativas (não há leitura suja), abortadas e confirmadas depois do instantâneo. A que apagou entra com LEFT JOIN, porque a maioria das versões nunca foi apagada; a versão continua visível se `a.id IS NULL` ou se quem apagou não estava confirmado no instante 50. Sem o `a.id IS NULL`, as comparações com NULL dão UNKNOWN e as versões vivas somem. O resultado tem no máximo uma versão por conta, do jeito que estava no instante 50: a conta 6 ainda não existia e a 7 já tinha sido apagada. Repare nas pontas: quem confirmou exatamente no instante 50 já conta como confirmado. O PostgreSQL de verdade guarda essas duas informações em colunas ocultas de cada linha, `xmin` e `xmax`, e decide a visibilidade pela lista de transações em andamento no instantâneo, em vez de um relógio.",setup:`CREATE TABLE transacoes (id INTEGER PRIMARY KEY, status TEXT NOT NULL CHECK (status IN ('ativa', 'confirmada', 'abortada')), confirmada_em INTEGER);
CREATE TABLE versoes (conta INTEGER NOT NULL, saldo INTEGER NOT NULL, criada_por INTEGER NOT NULL REFERENCES transacoes(id), apagada_por INTEGER REFERENCES transacoes(id));
INSERT INTO transacoes VALUES (1, 'confirmada', 10), (2, 'confirmada', 30), (3, 'abortada', NULL), (4, 'confirmada', 60), (5, 'ativa', NULL), (6, 'confirmada', 50), (7, 'confirmada', 55), (8, 'confirmada', 50);
INSERT INTO versoes VALUES (1, 100, 1, 2), (1, 70, 2, NULL), (2, 200, 1, 3), (2, 999, 3, NULL), (3, 300, 1, 4), (3, 250, 4, NULL), (4, 400, 1, 5), (4, 0, 5, NULL), (5, 500, 6, NULL), (6, 600, 7, NULL), (7, 700, 1, 8);`,starter:`SELECT conta, saldo FROM versoes ORDER BY conta;`,solution:`SELECT v.conta, v.saldo FROM versoes v JOIN transacoes c ON c.id = v.criada_por LEFT JOIN transacoes a ON a.id = v.apagada_por WHERE c.status = 'confirmada' AND c.confirmada_em <= 50 AND (a.id IS NULL OR a.status <> 'confirmada' OR a.confirmada_em > 50) ORDER BY v.conta;`,ordered:!0}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e7-iso-mvcc`,kind:`code`,lang:`python`,prompt:"Implemente um pequeno banco chave-valor com **isolamento de instantâneo** (o REPEATABLE READ do PostgreSQL). Cada chave guarda a lista das suas versões confirmadas, como pares `(instante, valor)`; um relógio inteiro começa em 0, e os dados iniciais são versões do instante 0.\n\n- `begin()`: devolve um id novo (inteiro) e anota o instante atual do relógio como o instantâneo da transação.\n- `ler(tx, chave)`: se a transação já escreveu a chave, devolve o que ela escreveu; senão, a versão mais recente confirmada **até o instante do instantâneo**; `None` se não havia nenhuma.\n- `escrever(tx, chave, valor)`: guarda numa área privada da transação; ninguém mais vê antes do commit.\n- `commit(tx)`: se alguma chave que a transação escreveu ganhou uma versão confirmada **depois** do instantâneo dela, a transação é descartada e o commit lança `ConflitoDeEscrita` (vence quem confirma primeiro). Senão, avança o relógio em 1 e publica todas as escritas como versões desse instante.\n- `rollback(tx)`: descarta a transação.\n- Usar uma transação que não está ativa (que nunca existiu, já confirmou, foi desfeita ou levou conflito) lança `ValueError`.\n\nSó escritas na mesma chave entram em conflito; leituras não.",difficulty:`desafio`,skills:[`bd-modelagem`,`poo-classes`],hints:[`Que informações cada transação ativa precisa carregar? Pense no instante do instantâneo e nas escritas ainda não publicadas.`,`Para ler no instantâneo, percorra as versões da chave da mais nova para a mais antiga. Qual é a primeira que serve?`,`No commit, como descobrir se outra transação confirmou a mesma chave depois do seu begin? Olhe o instante da versão mais nova de cada chave escrita.`,`Atomicidade: confira todas as chaves antes de publicar qualquer uma.`,`Um leitor antigo precisa continuar vendo a versão dele: nunca apague nem sobrescreva versões.`],explanation:`Cada transação guarda o instante do instantâneo e um dicionário de escritas privadas. Ler procura primeiro nas próprias escritas e depois a versão mais nova com instante menor ou igual ao do instantâneo. Daí vêm as garantias: não há leitura suja (escritas não confirmadas não estão nas versões), a leitura se repete (versões novas têm instante maior) e não há fantasma (uma chave criada depois não tem versão visível). O commit aplica a regra "vence quem confirma primeiro", que transforma a atualização perdida em erro, e só publica depois de conferir todas as chaves. O teste do plantão mostra o limite do modelo: as duas transações escrevem chaves diferentes, as duas confirmam, e o write skew passa. Para pegá-lo, o banco teria de acompanhar também o que cada transação leu, que é o que o SERIALIZABLE do PostgreSQL (SSI) faz. Bancos reais ainda apagam as versões que nenhum instantâneo ativo enxerga mais (o VACUUM do PostgreSQL).`,starter:`class ConflitoDeEscrita(Exception):
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
        pass`,solution:`class ConflitoDeEscrita(Exception):
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
        del self.ativas[tx]`,tests:[{name:`lê os dados iniciais e as próprias escritas`,code:`def _espera_erro(erro, f, *args, msg=""):
    try:
        f(*args)
    except erro:
        return
    raise AssertionError(msg)
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
assert b.ler(t2, "a") == 5, "depois do commit, uma transação nova vê o 5"`},{name:`sem leitura suja`,code:`def _espera_erro(erro, f, *args, msg=""):
    try:
        f(*args)
    except erro:
        return
    raise AssertionError(msg)
b = BancoMVCC({"a": 1})
t1 = b.begin()
b.escrever(t1, "a", 99)
t2 = b.begin()
assert b.ler(t2, "a") == 1, f"t2 leu {b.ler(t2, 'a')!r}: o 99 de t1 ainda não foi confirmado, e ninguém mais pode vê-lo (seria uma leitura suja)"
b.commit(t1)
assert b.ler(t2, "a") == 1, "t2 começou antes do commit de t1: o instantâneo dela continua com 1"
t3 = b.begin()
assert b.ler(t3, "a") == 99, "t3 começou depois do commit de t1 e deveria ver 99"`},{name:`leitura repetível e sem fantasma`,code:`def _espera_erro(erro, f, *args, msg=""):
    try:
        f(*args)
    except erro:
        return
    raise AssertionError(msg)
b = BancoMVCC({"a": 1})
t1 = b.begin()
assert b.ler(t1, "a") == 1, "t1 deveria ler o valor inicial 1"
t2 = b.begin()
b.escrever(t2, "a", 2)
b.escrever(t2, "nova", 10)
b.commit(t2)
assert b.ler(t1, "a") == 1, f"t1 releu e veio {b.ler(t1, 'a')!r}: dentro de t1, a mesma leitura deve dar o mesmo valor, porque o instantâneo é do início de t1"
assert b.ler(t1, "nova") is None, "a chave criada por t2 depois do início de t1 não existe no instantâneo de t1"`},{name:`um leitor antigo ainda vê a versão dele`,code:`def _espera_erro(erro, f, *args, msg=""):
    try:
        f(*args)
    except erro:
        return
    raise AssertionError(msg)
b = BancoMVCC({"a": 1})
leitor = b.begin()
for i in range(2, 52):
    t = b.begin()
    b.escrever(t, "a", i)
    b.commit(t)
assert b.ler(leitor, "a") == 1, f"depois de 50 confirmações, o leitor que começou antes de todas leu {b.ler(leitor, 'a')!r} em vez de 1: não apague nem sobrescreva versões antigas"
novo = b.begin()
assert b.ler(novo, "a") == 51, f"uma transação nova deveria ver a versão mais recente, 51; viu {b.ler(novo, 'a')!r}"`},{name:`atualização perdida vira erro`,code:`def _espera_erro(erro, f, *args, msg=""):
    try:
        f(*args)
    except erro:
        return
    raise AssertionError(msg)
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
_espera_erro(ValueError, b.ler, t2, "saldo", msg="depois do conflito, t2 foi descartada: usá-la de novo deveria lançar ValueError")`},{name:`vence quem confirma primeiro`,code:`def _espera_erro(erro, f, *args, msg=""):
    try:
        f(*args)
    except erro:
        return
    raise AssertionError(msg)
b = BancoMVCC({"a": 0})
t1 = b.begin()
t2 = b.begin()
b.escrever(t1, "a", 1)
b.escrever(t2, "a", 2)
b.commit(t2)
_espera_erro(ConflitoDeEscrita, b.commit, t1, msg="t1 escreveu primeiro, mas t2 confirmou primeiro: o conflito é de quem confirma depois (t1)")
assert b.ler(b.begin(), "a") == 2, "depois do conflito de t1, vale o valor de t2 (2)"`},{name:`conflito mesmo quando o valor volta ao que era`,code:`def _espera_erro(erro, f, *args, msg=""):
    try:
        f(*args)
    except erro:
        return
    raise AssertionError(msg)
b = BancoMVCC({"a": 0})
t1 = b.begin()
for valor in (5, 0):
    t = b.begin()
    b.escrever(t, "a", valor)
    b.commit(t)
b.escrever(t1, "a", 9)
_espera_erro(ConflitoDeEscrita, b.commit, t1, msg="depois do início de t1, outras transações confirmaram duas versões de a (5 e depois 0). O valor voltou a ser 0, mas a chave ganhou versões novas: o commit de t1 deveria lançar ConflitoDeEscrita. Compare instantes, não valores")`},{name:`sem conflito com quem confirmou antes do begin`,code:`def _espera_erro(erro, f, *args, msg=""):
    try:
        f(*args)
    except erro:
        return
    raise AssertionError(msg)
b = BancoMVCC({"a": 0})
t1 = b.begin()
b.escrever(t1, "a", 1)
b.commit(t1)
t2 = b.begin()
b.escrever(t2, "a", b.ler(t2, "a") + 1)
b.commit(t2)
t3 = b.begin()
b.commit(t3)
assert b.ler(b.begin(), "a") == 2, "t2 começou depois do commit de t1, então não há conflito: o valor final é 2"`},{name:`conflito descarta todas as escritas da transação`,code:`def _espera_erro(erro, f, *args, msg=""):
    try:
        f(*args)
    except erro:
        return
    raise AssertionError(msg)
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
assert b.ler(t3, "a") == 1, "a deveria ter o valor de t1 (1)"`},{name:`write skew passa (é o limite do instantâneo)`,code:`def _espera_erro(erro, f, *args, msg=""):
    try:
        f(*args)
    except erro:
        return
    raise AssertionError(msg)
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
assert (b.ler(t3, "ana"), b.ler(t3, "bia")) == (False, False), "as duas saídas deveriam ter sido publicadas"`},{name:`rollback e transações encerradas`,code:`def _espera_erro(erro, f, *args, msg=""):
    try:
        f(*args)
    except erro:
        return
    raise AssertionError(msg)
b = BancoMVCC({"a": 1})
t1 = b.begin()
b.escrever(t1, "a", 50)
b.rollback(t1)
assert b.ler(b.begin(), "a") == 1, "rollback descarta as escritas: a continua 1"
_espera_erro(ValueError, b.ler, t1, "a", msg="t1 já terminou (rollback): ler(t1, ...) deveria lançar ValueError")
_espera_erro(ValueError, b.commit, t1, msg="t1 já terminou (rollback): commit(t1) deveria lançar ValueError")
_espera_erro(ValueError, b.rollback, t1, msg="t1 já terminou: um segundo rollback(t1) deveria lançar ValueError")
t2 = b.begin()
b.commit(t2)
_espera_erro(ValueError, b.commit, t2, msg="confirmar duas vezes a mesma transação deveria lançar ValueError")
_espera_erro(ValueError, b.escrever, 999, "a", 0, msg="a transação 999 nunca existiu: escrever deveria lançar ValueError")`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:"**Sistema de cadastro (parte 6, concorrência)**: dê a cada disciplina um limite de vagas e faça a matrícula com um UPDATE condicional (`UPDATE disciplinas SET vagas = vagas - 1 WHERE id = ? AND vagas > 0`), conferindo `rowcount` na mesma transação que insere a matrícula. Garanta com `UNIQUE (aluno_id, disciplina_id)` que ninguém se matricule duas vezes na mesma disciplina. Escreva um teste em que dois alunos disputam a última vaga, com as duas leituras antes das duas escritas, como no exemplo do assento."},{type:`project`,projectId:`p3-cadastro`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Escalonamento serializável: o efeito é igual ao de alguma execução em série. É o ideal, mas não é o padrão do PostgreSQL nem do MySQL.
- Anomalias: leitura suja (dado não confirmado), leitura não repetível (a mesma linha muda), fantasma (o conjunto de linhas muda), atualização perdida (uma escrita apaga a outra) e write skew (escritas em linhas diferentes quebram juntas uma regra).
- PostgreSQL: READ COMMITTED por padrão (instantâneo por comando); REPEATABLE READ é isolamento de instantâneo; SERIALIZABLE (SSI) aborta transações com SQLSTATE 40001, e a aplicação repete. MySQL/InnoDB: REPEATABLE READ por padrão. SQLite: um escritor por vez.
- MVCC: UPDATE cria versão nova; cada transação lê do seu instantâneo; ler não bloqueia escrever.
- Defesas: UPDATE atômico condicional + rowcount; SELECT ... FOR UPDATE (BEGIN IMMEDIATE no SQLite); coluna de versão com nova tentativa; restrições (UNIQUE, CHECK); SERIALIZABLE com laço de repetição.`},{type:`callout`,tone:`english`,text:`- **isolation level**: nível de isolamento
- **dirty read / non-repeatable read / phantom read**: leitura suja / não repetível / fantasma
- **lost update / write skew**: atualização perdida / distorção de escrita
- **snapshot isolation, MVCC**: isolamento de instantâneo, controle de concorrência multiversão
- **pessimistic / optimistic locking**: bloqueio pessimista / otimista
- **serialization failure**: falha de serialização (SQLSTATE 40001)

Frase típica de entrevista: *"Read committed only guarantees you never see uncommitted data. To avoid lost updates, I'd use an atomic conditional UPDATE, lock the row with SELECT ... FOR UPDATE, or run the transaction as serializable and retry on serialization failures."*

Da documentação do PostgreSQL, sobre REPEATABLE READ: *"Applications using this level must be prepared to retry transactions due to serialization failures."*`,title:`English corner`}]}],cards:[{id:`l7-isolamento-concorrencia#1`,front:`O que torna um escalonamento serializável?`,back:`O efeito final dele é igual ao de alguma execução em série das mesmas transações, uma depois da outra.`},{id:`l7-isolamento-concorrencia#2`,front:`Qual é a diferença entre leitura não repetível e leitura fantasma?`,back:`Não repetível: a mesma linha, relida na mesma transação, tem outro valor. Fantasma: a mesma consulta com WHERE, repetida, traz outro conjunto de linhas (linhas novas ou removidas).`},{id:`l7-isolamento-concorrencia#3`,front:`Como acontece uma atualização perdida, e qual é a defesa mais simples?`,back:`Duas transações leem o mesmo valor, calculam um novo e gravam; a segunda escrita apaga a primeira. Defesa: UPDATE atômico e condicional (saldo = saldo - x WHERE saldo >= x), conferindo quantas linhas mudaram.`},{id:`l7-isolamento-concorrencia#4`,front:`Qual é o nível de isolamento padrão do PostgreSQL, e o que cada comando enxerga nele?`,back:`READ COMMITTED: cada comando enxerga os dados confirmados até o momento em que ele começou.`},{id:`l7-isolamento-concorrencia#5`,front:`O que é write skew, e o que o impede no PostgreSQL?`,back:`Duas transações leem os mesmos dados, decidem com base neles e escrevem linhas diferentes, quebrando juntas uma regra. Impede: SERIALIZABLE (SSI), ou travar as linhas lidas com SELECT ... FOR UPDATE.`},{id:`l7-isolamento-concorrencia#6`,front:`Como o MVCC deixa uma transação ler enquanto outra escreve a mesma linha?`,back:`O UPDATE cria uma versão nova em vez de sobrescrever; quem lê enxerga a versão visível no seu instantâneo, sem esperar.`},{id:`l7-isolamento-concorrencia#7`,front:`O que a aplicação deve fazer ao receber uma falha de serialização (SQLSTATE 40001)?`,back:`Repetir a transação inteira desde o começo, com um limite de tentativas.`},{id:`l7-isolamento-concorrencia#8`,front:"No sqlite3 do Python (modo legado), um SELECT feito antes do primeiro UPDATE, dentro de `with con:`, está na transação?",back:`Não: o BEGIN implícito só vem antes de INSERT, UPDATE, DELETE ou REPLACE. Para ler na mesma transação, abra-a explicitamente (por exemplo, BEGIN IMMEDIATE com isolation_level=None).`}]};export{e as default};
//# sourceMappingURL=l7-isolamento-concorrencia-CD_UCDNO.js.map