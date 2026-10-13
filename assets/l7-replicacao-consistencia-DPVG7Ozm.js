var e={id:`l7-replicacao-consistencia`,moduleId:`m7-4`,title:`Replicação a fundo: atraso, quóruns e conflitos`,titleEn:`Replication in depth: lag, quorums and conflicts`,summary:`O que acontece entre o líder e as réplicas: replicação síncrona e assíncrona, as anomalias do atraso e como evitá-las, failover e cérebro dividido, quóruns sem líder com R + W > N e reparo na leitura, conflitos resolvidos pela última escrita ou por CRDTs, e o CAP refinado pelo PACELC.`,minutes:50,objectives:[`Comparar replicação síncrona, semissíncrona e assíncrona pelo que se perde quando o líder cai`,`Reconhecer as anomalias do atraso de replicação e escolher uma técnica para garantir ler as próprias escritas e leituras monotônicas`,`Explicar o que pode dar errado numa troca de líder: escritas perdidas e cérebro dividido`,`Calcular se uma configuração de quórum (N, W, R) garante sobreposição e quantas falhas ela tolera`,`Resolver escritas concorrentes pela última escrita ou com um CRDT, sabendo o que cada um perde`,`Situar uma configuração no CAP e no PACELC, distinguindo o C do CAP do C do ACID`],skills:[`bd-nosql`],terms:[{pt:`replicação síncrona`,en:`synchronous replication`,def:`O líder só confirma a escrita ao cliente depois que réplicas escolhidas também a gravaram.`,example:`With synchronous replication, the leader waits until the follower has confirmed the write before reporting success to the client.`},{pt:`replicação assíncrona`,en:`asynchronous replication`,def:`O líder confirma assim que grava no próprio disco e envia às réplicas depois; uma queda pode perder escritas já confirmadas.`},{pt:`atraso de replicação`,en:`replication lag`,def:`Quanto uma réplica está atrás do líder, em tempo ou em posição no log.`,example:`Replication lag on the read replica spiked to 40 seconds during the nightly batch job.`},{pt:`ler as próprias escritas`,en:`read-your-writes consistency`,def:`Garantia de que um usuário sempre vê o que ele mesmo gravou.`},{pt:`leituras monotônicas`,en:`monotonic reads`,def:`Garantia de que, depois de ver um estado, o usuário não vê um estado mais antigo.`},{pt:`troca de líder`,en:`failover`,def:`Promover uma réplica a líder quando o líder atual falha.`},{pt:`cérebro dividido`,en:`split brain`,def:`Situação em que dois nós agem como líder ao mesmo tempo e aceitam escritas conflitantes.`},{pt:`quórum`,en:`quorum`,def:`Número mínimo de réplicas que precisam responder para uma escrita (W) ou uma leitura (R) valer.`,example:`We read and write at QUORUM, so with a replication factor of 3 we can lose one node.`},{pt:`reparo na leitura`,en:`read repair`,def:`Quando uma leitura encontra réplicas com versões velhas, o coordenador grava nelas a versão mais nova.`},{pt:`última escrita vence`,en:`last write wins (LWW)`,def:`Resolver escritas concorrentes ficando com a de maior carimbo de tempo e descartando as outras.`},{pt:`CRDT`,en:`conflict-free replicated data type`,def:`Tipo de dado cujas versões divergentes sempre podem ser juntadas automaticamente, sem perder atualizações.`},{pt:`linearizabilidade`,en:`linearizability`,def:`Garantia de que o sistema se comporta como uma cópia única dos dados: toda leitura vê a escrita mais recente já concluída.`}],references:[`ddia`,`postgres-docs`,`cmu-15445`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`A lição de NoSQL resumiu replicação numa frase: um líder recebe as escritas e as copia para seguidores, que podem estar "um pouco atrasados". Esta lição abre esse "um pouco". Quanto atraso, e o que o usuário vê enquanto ele dura? O que acontece com uma escrita já confirmada se o líder cair antes de copiá-la? E, se não houver líder nenhum, como no Cassandra, quem decide qual escrita vale?

Essas perguntas aparecem em qualquer sistema com mais de uma cópia dos dados, do PostgreSQL do seu projeto com uma réplica de leitura até um serviço espalhado por três regiões. As respostas não se resumem a "consistente" ou "inconsistente": são garantias específicas, cada uma com um custo em latência ou em disponibilidade, que você escolhe operação por operação.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`### Síncrona ou assíncrona: o que se perde quando o líder cai
Toda escrita chega ao líder, que a grava no seu log (no PostgreSQL, o WAL, o mesmo log que garante a durabilidade das transações) e a envia aos seguidores. A diferença está em **quando o líder responde "ok" ao cliente**. Na {{replicação síncrona|synchronous replication}}, ele espera a confirmação de réplicas escolhidas; na {{replicação assíncrona|asynchronous replication}}, responde assim que grava no próprio disco.`},{type:`table`,head:[`Modo`,`O líder confirma depois de`,`Se o líder morrer logo após confirmar`,`Custo`],rows:[[`síncrona`,`gravar e receber a confirmação das réplicas síncronas`,`a escrita está em pelo menos mais uma máquina`,`cada escrita espera a rede e a réplica mais lenta; se uma réplica síncrona sai do ar, as escritas travam`],[`semissíncrona`,`receber a confirmação de **uma** réplica; as outras recebem depois`,`a escrita está em pelo menos mais uma máquina`,`espera uma réplica só; se ela cair, outra assume o papel de síncrona`],[`assíncrona`,`gravar no próprio disco`,`as escritas confirmadas que ainda não tinham sido copiadas se perdem`,`a mais rápida, e muito comum como padrão`]],caption:`No PostgreSQL, a replicação por streaming é assíncrona por padrão. Listar réplicas em synchronous_standby_names a torna síncrona, e synchronous_commit escolhe até onde esperar: com on, até a réplica gravar o WAL em disco; com remote_apply, até ela aplicar a mudança e torná-la visível às consultas.`},{type:`md`,text:`Com replicação assíncrona, cada seguidor fica algum tempo atrás do líder: é o {{atraso de replicação|replication lag}}. Em operação normal, ele é de uma fração de segundo. Com o seguidor sobrecarregado, a rede congestionada ou uma réplica se recuperando de uma queda, vira segundos ou minutos. Enquanto ele durar, ler de um seguidor é ler o passado.

### As anomalias do atraso, e como evitá-las
Mandar leituras para os seguidores é a forma mais barata de aguentar mais leituras, e é aí que o atraso aparece para o usuário. Três anomalias clássicas:

1. **Não ver a própria escrita.** Você troca a foto do perfil, a página recarrega, a leitura cai num seguidor que ainda não recebeu a mudança, e a foto antiga volta. A garantia que falta se chama {{ler as próprias escritas|read-your-writes}}: o usuário sempre vê o que ele mesmo gravou (o que os outros gravaram pode demorar).
2. **Voltar no tempo.** Você abre os comentários de um vídeo e vê um comentário novo; recarrega, a leitura vai a outro seguidor, mais atrasado, e o comentário some. A garantia que falta são as {{leituras monotônicas|monotonic reads}}: depois de ver um estado, você nunca vê um estado mais antigo.
3. **Ver a resposta antes da pergunta.** Num banco particionado, a pergunta e a resposta de uma conversa ficam em partições diferentes, cada uma com o seu atraso, e um leitor vê a resposta primeiro. A garantia que falta é o **prefixo consistente**: quem lê uma sequência de escritas as vê na ordem em que aconteceram.`},{type:`table`,head:[`Garantia`,`Técnica comum`],rows:[[`ler as próprias escritas`,`ler do líder o que o usuário pode ter mudado (o próprio perfil), ou tudo dele por um minuto depois de cada escrita; ou guardar a posição no log da última escrita do usuário e só ler de réplicas que já chegaram até ela`],[`leituras monotônicas`,`mandar cada usuário sempre para a mesma réplica, escolhida por hash do id dele; se ela cair, a escolha muda e a garantia pode falhar nesse momento`],[`prefixo consistente`,`gravar na mesma partição o que tem relação de causa (as mensagens de uma conversa), ou rastrear as dependências entre escritas`]],caption:`No PostgreSQL, pg_current_wal_lsn() no líder e pg_last_wal_replay_lsn() na réplica dão as posições no log. O MongoDB oferece sessões com consistência causal, que entregam ler as próprias escritas e leituras monotônicas.`},{type:`md`,text:`### Troca de líder: escritas perdidas e cérebro dividido
Quando o líder cai, alguém precisa perceber (em geral, por um tempo limite sem resposta), escolher um novo líder (de preferência a réplica mais atualizada) e fazer clientes e réplicas obedecerem a ele. Essa {{troca de líder|failover}} pode ser manual ou automática, e cada passo tem uma armadilha:

- **Escritas perdidas.** Com replicação assíncrona, o novo líder pode não ter as últimas escritas do antigo. Quando o antigo volta, essas escritas conflitam com as que o novo já aceitou, e o normal é descartá-las: o MongoDB, por exemplo, desfaz (*rollback*) as escritas que o antigo primário não chegou a replicar para a maioria dos membros e as guarda em arquivos à parte. Para o cliente, uma escrita confirmada sumiu. É por isso que, desde a versão 5.0, o padrão do MongoDB é \`w: "majority"\` (salvo em algumas configurações com árbitros): só confirma quando a maioria dos membros tem a escrita.
- **Tempo limite.** Curto demais, um pico de carga dispara uma troca de líder desnecessária, que piora a carga; longo demais, o sistema fica mais tempo sem aceitar escritas.
- **{{Cérebro dividido|split brain}}.** O antigo líder estava só isolado por uma falha de rede, não morto, e continua aceitando escritas: agora há dois líderes. A saída é exigir **maioria**. Um líder só é eleito com votos da maioria dos nós, e cada eleição ganha um número de mandato (*term*) maior; mensagens com um mandato antigo são recusadas. Duas maiorias do mesmo grupo sempre têm um nó em comum, então não há dois líderes no mesmo mandato. É o núcleo de algoritmos de consenso como o Raft, usado no etcd e que inspirou o protocolo de replicação do MongoDB.`},{type:`callout`,tone:`warn`,text:`Em 2012, no GitHub, uma réplica MySQL desatualizada foi promovida a líder. O banco gerava as chaves primárias com autoincremento, e o contador do novo líder estava atrás do antigo: ele reutilizou chaves já usadas. Um Redis guardava dados indexados por essas mesmas chaves, e alguns dados privados apareceram para os usuários errados. Escritas que se perdem numa troca de líder não somem só do banco: elas podem estar referenciadas em outros sistemas. (O caso está no DDIA, capítulo 5.)`,title:`Uma troca de líder que vazou dados`},{type:`md`,text:`### Sem líder: quóruns
Bancos inspirados no Dynamo da Amazon (o sistema descrito num artigo de 2007, não o serviço DynamoDB, que usa um líder por partição), como Cassandra e ScyllaDB, não têm líder. O cliente, ou um nó coordenador, manda cada escrita para as **N** réplicas da chave e a considera feita quando **W** delas confirmam; cada leitura pergunta a **R** réplicas e fica com a versão mais nova entre as respostas. Esse número mínimo de respostas é o {{quórum|quorum}}.

A regra central é uma contagem: se **R + W > N**, todo conjunto de R réplicas lidas tem pelo menos uma réplica em comum com o conjunto de W réplicas que confirmou a escrita (não cabem R réplicas fora de um grupo que já ocupa W das N). Então a leitura alcança pelo menos uma cópia da última escrita confirmada. Com N = 3, a escolha comum é W = 2 e R = 2.`},{type:`table`,head:[`N, W, R`,`R + W > N?`,`Réplicas que podem estar fora`,`Bom para`],rows:[[`3, 2, 2`,`sim (4 > 3)`,`1 para escrever e 1 para ler`,`o equilíbrio padrão`],[`3, 3, 1`,`sim (4 > 3)`,`nenhuma para escrever; 2 para ler`,`muita leitura, pouca escrita`],[`3, 1, 3`,`sim (4 > 3)`,`2 para escrever; nenhuma para ler`,`muita escrita, leitura rara`],[`3, 1, 1`,`não (2 ≤ 3)`,`2 para escrever e 2 para ler`,`latência mínima, aceitando ler dado velho`]],caption:`Com R + W ≤ N, ler e escrever ficam mais rápidos e mais tolerantes a falhas, mas uma leitura pode não encontrar nenhuma cópia da escrita mais recente. No Cassandra, o cliente escolhe o nível por consulta: ONE, QUORUM, ALL e variantes por data center, como LOCAL_QUORUM.`},{type:`md`,text:`Como as réplicas atrasadas alcançam as outras? Pelo {{reparo na leitura|read repair}}: quando uma leitura recebe versões diferentes, o coordenador devolve a mais nova ao cliente e a grava nas réplicas que responderam com a velha. Dados pouco lidos dependem de um processo de fundo, a anti-entropia (*anti-entropy*), que compara as réplicas e copia o que falta. E, enquanto uma réplica está fora do ar, outro nó pode guardar as escritas destinadas a ela e entregá-las quando ela voltar (*hinted handoff*).`},{type:`callout`,tone:`warn`,text:`R + W > N não transforma o sistema numa cópia única. Uma escrita que não juntou W confirmações é informada ao cliente como falha, mas **não é desfeita** nas réplicas que a gravaram, e leituras futuras podem encontrá-la. Duas escritas concorrentes na mesma chave precisam de uma regra de desempate. E, com um quórum "relaxado" (*sloppy quorum*), uma escrita pode ser aceita por nós de fora das N réplicas durante uma falha, e a sobreposição deixa de valer até tudo ser reparado. Por isso o DDIA recomenda tratar W e R como um ajuste da probabilidade de ler dado velho, e não como garantia absoluta.`,title:`Os limites do quórum`},{type:`md`,text:`### Escritas concorrentes: quem vence?
Sem líder, ou com vários líderes (um por região), dois clientes podem gravar a mesma chave ao mesmo tempo em réplicas diferentes. Quando as réplicas se encontram, alguém tem de decidir.

- **{{Última escrita vence|last write wins (LWW)}}.** Cada escrita leva um carimbo de tempo, e fica a de carimbo maior. É simples e sempre converge, e é o que o Cassandra faz, coluna por coluna. O custo: a outra escrita é descartada em silêncio, mesmo que as duas tenham sido confirmadas aos clientes. E "última" é pelo relógio das máquinas, que nunca estão perfeitamente sincronizados: se o relógio de um nó está alguns milissegundos atrasado (ou segundos, se o NTP falhar), a escrita que de fato veio depois pode perder.
- **Detectar e guardar as duas.** Com vetores de versão, o banco sabe se uma escrita "viu" a outra (então a sobrescreve) ou se elas foram concorrentes (nenhuma viu a outra). No segundo caso, guarda as duas versões irmãs, e a aplicação as junta na próxima leitura: um carrinho de compras pode ficar com a união dos itens. O artigo do Dynamo conta o efeito colateral: um item removido de um lado pode reaparecer depois da junção.
- **Tipos que se juntam sozinhos.** Um {{CRDT|conflict-free replicated data type}} é um tipo de dado desenhado para que quaisquer duas versões tenham uma junção certa, que não depende da ordem nem de quantas vezes é aplicada. O mais simples é o contador que só cresce (*G-counter*): cada réplica conta **só os seus** incrementos, juntar é tirar o máximo de cada posição, e o valor é a soma. Dois servidores contando curtidas durante uma partição nunca perdem uma curtida.`},{type:`callout`,tone:`deep`,text:`Se o problema da última escrita é o relógio, por que não usar relógios melhores? O Spanner, do Google, faz isso: com GPS e relógios atômicos nos data centers, cada carimbo vem com um intervalo de incerteza explícito, de poucos milissegundos, e antes de confirmar uma transação o Spanner espera a incerteza passar. Assim, uma transação que começa depois de outra terminar sempre recebe um carimbo maior. O preço é essa espera em toda escrita e um hardware que poucos têm. Sem isso, a saída é não confiar no relógio para ordenar eventos: vetores de versão rastreiam a causalidade (quem viu quem), e CRDTs dispensam a ordem, porque a junção dá o mesmo resultado em qualquer ordem.`,title:`Relógios: o Spanner e o TrueTime`},{type:`md`,text:`### CAP com mais precisão, e o PACELC
O C do CAP é a {{linearizabilidade|linearizability}}: o sistema se comporta como se houvesse uma cópia só dos dados, e toda leitura que começa depois de uma escrita terminar vê essa escrita (ou uma mais nova). Não é o C do ACID, que você viu no m7-3: lá, consistência é cada transação respeitar as regras do banco (chaves, restrições, CHECK). O A do CAP também é estrito: todo nó que está funcionando responde a toda requisição.

Com essas definições, o teorema diz o que a lição de NoSQL resumiu: durante uma partição, escolha entre recusar (C) e responder com o que tem (A). Os quóruns mostram a escolha na prática. Com N = 3 e W = R = 2, o lado da partição que ficou com um nó só não junta quórum e recusa: é o comportamento de C, embora, como você viu, o quórum sozinho não garanta linearizabilidade. Com W = R = 1, os dois lados continuam respondendo e podem divergir: é o comportamento de A.

Mas partição é rara, e a escolha que você faz **o tempo todo** é outra. O **PACELC**, proposto por Daniel Abadi em 2012, completa o CAP: se há Partição, escolha entre A e C; senão (*Else*), entre Latência e Consistência. Esperar a confirmação de uma réplica em outra cidade, ou de duas em três, deixa toda escrita mais lenta mesmo num dia sem falha nenhuma. O Cassandra com nível ONE é PA/EL: responde sempre e rápido, aceitando ler dado velho. Um PostgreSQL com réplica síncrona e leituras no líder fica do outro lado, PC/EC: trava as escritas se a réplica síncrona some, e paga a ida e volta até ela em cada confirmação.`},{type:`callout`,tone:`tip`,text:`Você não escolhe a consistência do sistema inteiro de uma vez: escolhe por operação. No mesmo app de banco, o saldo antes de um Pix é lido do líder (ou com quórum), e a lista de contatos frequentes pode vir de uma réplica atrasada. Para cada leitura, pergunte: o que acontece se ela vier com alguns segundos de atraso?`,title:`Escolha por operação`}]},{stage:`exemplo`,blocks:[{type:`md`,text:`**Atraso de replicação, segundo a segundo.** Um líder e duas réplicas assíncronas: a réplica 1 costuma estar 0,2 s atrás, e a réplica 2, sobrecarregada, 3 s. O balanceador manda cada leitura para uma réplica qualquer.`},{type:`table`,head:[`Instante`,`Evento`,`Líder`,`Réplica 1`,`Réplica 2`],rows:[[`0,0 s`,`Ana troca a foto do perfil (v1 → v2); o líder grava e confirma`,`v2`,`v1`,`v1`],[`0,2 s`,`a réplica 1 aplica a mudança`,`v2`,`v2`,`v1`],[`0,5 s`,`a página recarrega; a leitura vai à réplica 2`,`v2`,`v2`,`**v1**: Ana vê a foto antiga`],[`1,0 s`,`Ana recarrega; a leitura cai na réplica 1`,`v2`,`**v2**: a foto nova aparece`,`v1`],[`1,5 s`,`recarrega de novo; réplica 2`,`v2`,`v2`,`**v1**: a foto nova some`],[`3,0 s`,`a réplica 2 aplica a mudança`,`v2`,`v2`,`v2`]],caption:`Em 0,5 s, falta ler as próprias escritas. Entre 1,0 s e 1,5 s, falta a leitura monotônica: Ana viu v2 e depois voltou a ver v1.`},{type:`md`,text:`A correção por posição no log: a escrita da Ana ficou na posição 1043 do log do líder, e o app guarda esse número na sessão dela. Antes de cada leitura dos dados da Ana, o roteador compara com a posição que cada réplica já aplicou. Em 0,5 s, a réplica 1 está em 1043 e a réplica 2 em 1040, então a leitura vai à réplica 1 (ou ao líder, se nenhuma tiver chegado lá). Os outros usuários, que não sabem da foto nova, continuam lendo de qualquer réplica.

**Quórum com uma réplica fora do ar.** N = 3 réplicas (A, B e C), W = 2 e R = 2, guardando o status do pedido P-1001 como (versão, valor):`},{type:`table`,head:[`Passo`,`O que acontece`,`A`,`B`,`C`],rows:[[`1`,`estado inicial`,`(1, preparando)`,`(1, preparando)`,`(1, preparando)`],[`2`,`C sai do ar`,`(1, preparando)`,`(1, preparando)`,`fora do ar`],[`3`,`escrita (2, a caminho) com W = 2: A e B confirmam; sucesso`,`(2, a caminho)`,`(2, a caminho)`,`fora do ar`],[`4`,`C volta sem a escrita; agora A sai do ar`,`fora do ar`,`(2, a caminho)`,`(1, preparando)`],[`5`,`leitura com R = 2: B responde a versão 2, C a versão 1; o cliente recebe "a caminho"`,`fora do ar`,`(2, a caminho)`,`(1, preparando)`],[`6`,`reparo na leitura: o coordenador grava a versão 2 em C`,`fora do ar`,`(2, a caminho)`,`(2, a caminho)`]],caption:`Com uma réplica fora de cada vez, a escrita e a leitura continuaram funcionando, e a leitura achou a versão nova porque B estava nos dois quóruns.`},{type:`md`,text:`Agora com W = 1 e R = 1, mais rápido e mais tolerante. No passo 3, a escrita é confirmada assim que A responde. No passo 5, a leitura pergunta só a C e devolve "preparando": o cliente vê o pedido voltar no tempo. Nada quebrou; essa configuração simplesmente não promete mais nada.

**Curtidas durante uma partição.** Duas réplicas, em São Paulo e no Rio, contam as curtidas de um post com um G-counter. Cada uma guarda quanto **cada réplica** contou:`},{type:`table`,head:[`Momento`,`Réplica SP`,`Réplica RJ`,`Valor em SP / RJ`],rows:[[`antes da partição`,"`{SP: 10, RJ: 5}`","`{SP: 10, RJ: 5}`",`15 / 15`],[`partição: 3 curtidas chegam a SP e 2 ao RJ`,"`{SP: 13, RJ: 5}`","`{SP: 10, RJ: 7}`",`18 / 17`],[`a rede volta; cada lado junta o estado do outro (máximo de cada posição)`,"`{SP: 13, RJ: 7}`","`{SP: 13, RJ: 7}`",`20 / 20`]],caption:`Com um número só e a última escrita vencendo, o resultado seria 18 ou 17: 2 ou 3 curtidas sumiriam, sem erro nenhum.`}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`import random

def taxa_de_leitura_velha(n, w, r, rodadas=10000, semente=1):
    """Pior caso: só as W réplicas que confirmaram têm a escrita nova."""
    rng = random.Random(semente)
    nos = list(range(n))
    velhas = 0
    for _ in range(rodadas):
        com_escrita = set(rng.sample(nos, w))   # as W que confirmaram
        lidas = set(rng.sample(nos, r))         # as R que responderam à leitura
        if not (com_escrita & lidas):
            velhas += 1
    return velhas / rodadas

for n, w, r in [(3, 2, 2), (3, 3, 1), (3, 1, 1), (3, 1, 2), (5, 3, 3), (5, 2, 2)]:
    promessa = "R+W>N" if r + w > n else "R+W<=N"
    print(f"N={n} W={w} R={r} ({promessa}): leituras velhas = {taxa_de_leitura_velha(n, w, r):.1%}")`,runnable:!0,caption:`No pior caso, as réplicas fora do quórum de escrita ainda não receberam nada. Na prática, elas recebem a escrita milissegundos depois e a taxa real é bem menor; com R + W > N, ela é zero mesmo no pior caso (dentro deste modelo, sem escritas falhas nem concorrentes).`},{type:`code`,lang:`python`,code:`def juntar(a, b):
    """Junção do G-counter: o máximo de cada posição."""
    return {no: max(a.get(no, 0), b.get(no, 0)) for no in a.keys() | b.keys()}

sp = {"SP": 10, "RJ": 5}
rj = dict(sp)

# partição: cada lado conta só as suas curtidas, na sua posição
sp["SP"] += 3
rj["RJ"] += 2
print("durante a partição:", sum(sp.values()), sum(rj.values()))

juntos = juntar(sp, rj)
print("depois de juntar:", sum(juntos.values()), dict(sorted(juntos.items())))
print("juntar de novo não muda nada:", juntar(juntos, sp) == juntos)
print("a ordem não importa:", juntar(sp, rj) == juntar(rj, sp))

# última escrita vence, com um número só: (carimbo, valor)
# a escrita do RJ aconteceu depois, às 1000,300 s do relógio real,
# mas o relógio do nó RJ está 120 ms atrasado e carimbou 1000,180
lww_sp = (1000.250, 18)
lww_rj = (1000.180, 17)
vencedora = max(lww_sp, lww_rj)
print("LWW guarda:", vencedora[1], "e descarta a escrita do RJ, que foi a última")`,runnable:!0,caption:`O G-counter chega a 20 nos dois lados, em qualquer ordem de junção. A última escrita vence guarda 18, perde as 2 curtidas do Rio e ainda escolhe a escrita errada por causa do relógio.`},{type:`md`,text:`Os bancos reais expõem essas escolhas como parâmetros de cada operação. Só para leitura (rode num servidor de verdade):`},{type:`code`,lang:`text`,code:`-- PostgreSQL: nesta sessão, cada commit espera a réplica síncrona aplicar a mudança
SET synchronous_commit = remote_apply;

// MongoDB: confirma só quando a maioria tem a escrita; lê só o que a maioria já tem
db.pedidos.updateOne({ _id: "P-1001" }, { $set: { status: "a caminho" } },
                     { writeConcern: { w: "majority" } })
db.pedidos.find({ _id: "P-1001" }).readConcern("majority")

-- Cassandra (cqlsh): nível de consistência das próximas consultas
CONSISTENCY QUORUM;
SELECT status FROM pedidos WHERE id = 'P-1001';`,runnable:!1}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e7-repl-1`,kind:`mcq`,prompt:`O app lê de réplicas assíncronas para aliviar o líder. Ana troca o endereço de entrega, a tela recarrega e mostra o endereço antigo; um minuto depois, aparece o novo. Que garantia faltou, e qual técnica a resolve?`,difficulty:`facil`,skills:[`bd-nosql`],hints:[`Onde estava o endereço novo no momento da recarga: no líder, na réplica que respondeu, nos dois?`,`Quem precisa ver o endereço novo imediatamente: todos os usuários ou só a Ana?`,`A técnica precisa lembrar de alguma coisa sobre a escrita da Ana. Do quê?`],explanation:`É a anomalia de não ver a própria escrita, causada pelo atraso de replicação. Basta dar a garantia a quem escreveu: ler do líder, por um tempo, o que a Ana pode ter mudado, ou guardar a posição no log da última escrita dela e só ler de réplicas que já passaram dessa posição. Os outros usuários continuam lendo das réplicas, aceitando o atraso.`,options:[{text:`Ler as próprias escritas: por um tempo depois de cada escrita da Ana, ler os dados dela do líder ou de uma réplica que já chegou à posição no log daquela escrita`,correct:!0,feedback:`Isso: o problema é a Ana não ver o que ela mesma gravou, e a solução usa alguma memória da escrita dela (o horário ou a posição no log).`},{text:`Atomicidade: a troca do endereço precisava de uma transação`,feedback:`A escrita foi atômica e confirmada no líder; quem estava atrás era a réplica que atendeu a leitura. Uma transação no líder não muda o que uma réplica atrasada devolve.`},{text:`Leituras monotônicas: basta mandar a Ana sempre para a mesma réplica`,feedback:`Leituras monotônicas impedem voltar no tempo entre duas leituras, mas uma réplica fixa e atrasada mostraria o endereço antigo do mesmo jeito: ela ainda não recebeu o novo.`},{text:`Durabilidade: o endereço só tinha sido gravado em memória`,feedback:`O endereço novo apareceu um minuto depois sem ninguém gravá-lo de novo: ele estava durável no líder e só não tinha chegado à réplica.`}]}},{type:`exercise`,exercise:{id:`e7-repl-2`,kind:`predict`,lang:`python`,prompt:`A escrita nova foi confirmada pelas réplicas A e B (W = 2), e C ainda não a recebeu. O programa enumera todos os conjuntos de R réplicas que uma leitura poderia consultar. O que ele imprime?`,difficulty:`intermediario`,skills:[`bd-nosql`],hints:[`Quantos conjuntos de tamanho r existem com 3 réplicas, para r = 1, 2 e 3?`,`Um conjunto entra em sem_a_escrita quando a interseção com {A, B} é vazia. Qual conjunto de tamanho 1 é assim?`,`Para r = 2: existe algum par de réplicas, entre três, que não contém nem A nem B?`],explanation:`Com R = 1, só a leitura que consulta C perde a escrita: R + W = 3 não passa de N = 3. A partir de R = 2, R + W = 4 > 3, e todo conjunto lido contém pelo menos uma das réplicas que confirmaram: não cabem 2 réplicas fora de um grupo que já ocupa 2 das 3. É o princípio da casa dos pombos por trás da regra R + W > N.`,code:`from itertools import combinations

nos = ["A", "B", "C"]
confirmaram = {"A", "B"}          # W = 2

for r in (1, 2, 3):
    leituras = list(combinations(nos, r))
    sem_a_escrita = [l for l in leituras if not confirmaram & set(l)]
    print(r, len(leituras), sem_a_escrita)`,answer:`1 3 [('C',)]
2 3 []
3 1 []`}},{type:`exercise`,exercise:{id:`e7-repl-3`,kind:`sql`,prompt:"A tabela `replicas` tem uma linha por réplica e chave, com a `versao` e o `valor` que aquela réplica guarda. Para o processo de anti-entropia, liste as **réplicas desatualizadas**: as linhas cuja versão é menor que a maior versão da mesma chave. Colunas `chave`, `no`, `versao` e `ultima` (a maior versão daquela chave), em ordem de chave e depois de nó.",difficulty:`intermediario`,skills:[`bd-nosql`,`bd-joins`],hints:[`Para decidir se uma linha está velha, você compara a versão dela com o quê?`,`Calcule a maior versão de cada chave numa consulta à parte. Como pôr esse resultado ao lado de cada linha de replicas?`,`Uma tabela derivada (subconsulta no FROM) com GROUP BY chave pode ser juntada a replicas pela chave. Que filtro sobra depois?`],explanation:`SELECT r.chave, r.no, r.versao, m.ultima FROM replicas r JOIN (SELECT chave, MAX(versao) AS ultima FROM replicas GROUP BY chave) AS m ON m.chave = r.chave WHERE r.versao < m.ultima ORDER BY r.chave, r.no; A tabela derivada calcula a versão mais nova de cada chave uma vez, e o JOIN a põe ao lado de cada réplica. A pedido:1003, igual nas três, não aparece; a pedido:1004 tem duas réplicas atrás. Uma subconsulta correlacionada no WHERE também resolve, mas não entrega a coluna ultima sem repetir a subconsulta no SELECT. Repare no que esta consulta não pega: uma réplica que nem tem a chave não tem linha nenhuma. Para encontrá-la, cruze a lista de nós com a de chaves e procure os pares sem linha, com um anti-join.`,setup:`CREATE TABLE replicas (no TEXT NOT NULL, chave TEXT NOT NULL, versao INTEGER NOT NULL, valor TEXT, PRIMARY KEY (no, chave));
INSERT INTO replicas VALUES
('A', 'pedido:1001', 3, 'entregue'),
('B', 'pedido:1001', 3, 'entregue'),
('C', 'pedido:1001', 2, 'a caminho'),
('A', 'pedido:1002', 1, 'preparando'),
('B', 'pedido:1002', 2, 'a caminho'),
('C', 'pedido:1002', 2, 'a caminho'),
('A', 'pedido:1003', 1, 'preparando'),
('B', 'pedido:1003', 1, 'preparando'),
('C', 'pedido:1003', 1, 'preparando'),
('A', 'pedido:1004', 5, 'cancelado'),
('B', 'pedido:1004', 4, 'entregue'),
('C', 'pedido:1004', 2, 'a caminho');`,starter:`SELECT chave, MAX(versao) AS ultima FROM replicas GROUP BY chave;`,solution:`SELECT r.chave, r.no, r.versao, m.ultima FROM replicas r JOIN (SELECT chave, MAX(versao) AS ultima FROM replicas GROUP BY chave) AS m ON m.chave = r.chave WHERE r.versao < m.ultima ORDER BY r.chave, r.no;`,ordered:!0}},{type:`exercise`,exercise:{id:`e7-repl-4`,kind:`code`,lang:`python`,prompt:"Implemente o contador que só cresce (G-counter) na classe `ContadorG(no)`, em que `no` é o nome da réplica dona daquele objeto. Guarde o estado no atributo `contagens`, um dict que diz quanto cada réplica contou.\n\n- `incrementar(qtd=1)`: soma `qtd` (um inteiro ≥ 1) **na posição da própria réplica**.\n- `valor()`: o total contado por todas as réplicas conhecidas.\n- `juntar(outro)`: incorpora o estado de outro `ContadorG` (de outra réplica) **sem alterar o outro**, nem agora nem depois. A junção precisa ser comutativa, associativa e idempotente: juntar duas vezes o mesmo estado não pode contar em dobro.",difficulty:`intermediario`,skills:[`bd-nosql`],hints:[`Por que cada réplica conta numa posição só dela, e não num número único compartilhado?`,`Na junção, se as duas réplicas conhecem a posição de SP com valores diferentes, qual dos dois é o mais recente? Um contador que só cresce pode diminuir?`,`Que operação entre dois números dá o mesmo resultado quando repetida e não depende da ordem? A soma tem essas propriedades?`,`Depois de juntar, o seu dict é um objeto novo ou o mesmo dict do outro contador?`],explanation:`Cada réplica só escreve na própria posição, então a posição de SP no estado de qualquer réplica é um retrato, possivelmente atrasado, do que SP contou, e o retrato mais novo é o maior número: a junção tira o máximo de cada posição. Máximo é comutativo, associativo e idempotente, a soma não é: somar as contagens na junção conta em dobro cada vez que o mesmo estado chega de novo (e, numa rede real, ele chega). Tirar o máximo dos totais também erra: perde as curtidas do lado menor. Para curtidas que também podem ser desfeitas, existe o PN-counter: dois G-counters, um de incrementos e outro de decrementos, e o valor é a diferença.`,starter:`class ContadorG:
    def __init__(self, no):
        self.no = no
        self.contagens = {}    # réplica -> quanto ela contou

    def incrementar(self, qtd=1):
        pass

    def valor(self):
        pass

    def juntar(self, outro):
        # incorpore o estado de outro, sem alterá-lo
        pass`,solution:`class ContadorG:
    def __init__(self, no):
        self.no = no
        self.contagens = {}

    def incrementar(self, qtd=1):
        self.contagens[self.no] = self.contagens.get(self.no, 0) + qtd

    def valor(self):
        return sum(self.contagens.values())

    def juntar(self, outro):
        for no, n in outro.contagens.items():
            self.contagens[no] = max(self.contagens.get(no, 0), n)`,tests:[{name:`uma réplica sozinha`,code:`c = ContadorG("SP")
assert c.valor() == 0, f"um contador novo vale 0; veio {c.valor()!r}"
c.incrementar()
c.incrementar(4)
assert c.valor() == 5, f"1 + 4 = 5; veio {c.valor()!r}"
assert c.contagens == {"SP": 5}, f"os incrementos ficam na posição da própria réplica: esperado {{'SP': 5}}, veio {c.contagens}"`},{name:`partição e junção`,code:`sp, rj = ContadorG("SP"), ContadorG("RJ")
sp.incrementar(3)
rj.incrementar(2)
sp.juntar(rj)
rj.juntar(sp)
assert sp.valor() == 5 and rj.valor() == 5, f"depois de juntar nos dois sentidos, os dois lados valem 3 + 2 = 5; vieram {sp.valor()} e {rj.valor()}. A junção não pode escolher um lado: guarde quanto cada réplica contou"`},{name:`juntar de novo não conta em dobro`,code:`sp, rj = ContadorG("SP"), ContadorG("RJ")
sp.incrementar(3)
rj.incrementar(2)
for _ in range(3):
    sp.juntar(rj)
assert sp.valor() == 5, f"juntar o mesmo estado três vezes deu {sp.valor()}, e não 5: a junção precisa ser idempotente, porque numa rede real o mesmo estado chega mais de uma vez"
sp.juntar(sp)
assert sp.valor() == 5, "juntar um contador com ele mesmo não pode mudar nada"`},{name:`não altera o outro, nem depois`,code:`sp, rj = ContadorG("SP"), ContadorG("RJ")
rj.incrementar(2)
sp.juntar(rj)
sp.incrementar(10)
assert rj.contagens == {"RJ": 2}, f"juntar não pode mudar o outro contador, nem agora nem depois: rj ficou com {rj.contagens}. Copie os números, não reaproveite o dict do outro"
assert sp.valor() == 12, f"sp conhece 2 do RJ e contou 10; veio {sp.valor()}"`},{name:`continua contando depois de juntar`,code:`sp, rj = ContadorG("SP"), ContadorG("RJ")
sp.incrementar(3)
rj.incrementar(2)
sp.juntar(rj)
rj.juntar(sp)
sp.incrementar(1)
rj.incrementar(4)
sp.juntar(rj)
assert sp.valor() == 10, f"3 + 2 + 1 + 4 = 10 curtidas; veio {sp.valor()}"
assert sp.contagens == {"SP": 4, "RJ": 6}, f"cada réplica soma só na própria posição, antes e depois de juntar: esperado {{'SP': 4, 'RJ': 6}}, veio {sp.contagens}"`},{name:`trocas aleatórias de estado`,code:`import random
random.seed(11)
for rodada in range(200):
    rep = {n: ContadorG(n) for n in "ABC"}
    total = 0
    for _ in range(30):
        if random.random() < 0.6:
            n = random.choice("ABC")
            q = random.randint(1, 3)
            rep[n].incrementar(q)
            total += q
        else:
            a, b = random.sample("ABC", 2)
            rep[a].juntar(rep[b])
    for a in "ABC":
        for b in "ABC":
            rep[a].juntar(rep[b])
    valores = [rep[n].valor() for n in "ABC"]
    assert valores == [total] * 3, f"rodada {rodada}: depois de trocas de estado em ordem aleatória e de uma rodada final em que todas se juntam, as três réplicas deveriam valer {total}; vieram {valores}"`}]}},{type:`exercise`,exercise:{id:`e7-repl-5`,kind:`mcq`,prompt:`Um banco com um líder e duas réplicas **assíncronas** confirma ao cliente um Pix de R$ 50 às 10:00:00,000. Às 10:00:00,040, o líder queima, antes de enviar essa escrita a qualquer réplica, e a troca automática de líder promove a réplica mais atualizada. O que acontece com o Pix?`,difficulty:`avancado`,skills:[`bd-nosql`],hints:[`Em que momento um líder assíncrono responde "ok" ao cliente?`,`Às 10:00:00,040, em quantas máquinas a escrita existe?`,`O que teria de mudar no momento da confirmação para a escrita sobreviver à queda de uma máquina?`],explanation:'Na replicação assíncrona, "confirmado" quer dizer "gravado no líder". Se o líder some antes de copiar, a escrita some com ele, e o novo líder segue sem ela; se o antigo voltar, as escritas que só ele tinha são descartadas ou separadas para análise. Por isso sistemas de pagamento esperam a confirmação de pelo menos uma réplica (replicação síncrona ou semissíncrona, ou maioria, como o `w: "majority"` do MongoDB) antes de responder: alguns milissegundos a mais em toda escrita, em troca de não perder uma escrita confirmada quando uma máquina cai.',options:[{text:`Nada se perde: o cliente recebeu a confirmação, então a escrita está garantida`,feedback:`A confirmação só garante o que o líder garantia, e com replicação assíncrona ele confirma ao gravar no próprio disco. Esse disco agora está fora do sistema.`},{text:`O novo líder não tem o Pix; se o antigo voltar, o normal é descartar a escrita. Para não perder, a confirmação teria de esperar pelo menos uma réplica`,correct:!0,feedback:`Isso: a replicação assíncrona troca a segurança das escritas recém-confirmadas por latência. Dinheiro pede esperar a cópia antes de confirmar.`},{text:`Quando o líder antigo voltar, o novo recebe dele a escrita e tudo se acerta`,feedback:`Juntar de volta as escritas do líder antigo pode conflitar com o que o novo já aceitou: ids reaproveitados, saldos diferentes. Os bancos costumam descartá-las ou guardá-las à parte para análise manual, como o rollback do MongoDB.`},{text:`A troca de líder não promove ninguém até o líder antigo voltar, justamente para não perder escritas`,feedback:`Esperar o líder antigo é uma escolha possível (consistência em vez de disponibilidade), mas o enunciado diz que a troca automática promoveu uma réplica.`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e7-repl-desafio`,kind:`code`,lang:`python`,prompt:"Implemente um armazenamento sem líder, com quóruns e reparo na leitura. `Cluster(nos)` recebe a lista com os nomes das N réplicas; cada réplica guarda, para cada chave, um par `(ts, valor)` em `self.dados[no][chave]`. Uma réplica pode sair do ar e voltar (`derrubar(no)` e `religar(no)`, já prontos); quem sai do ar não perde o que tinha.\n\n- `escrever(chave, valor, ts, w)`: envia a escrita a **todas** as réplicas no ar. Cada uma grava o par se ainda não tiver a chave ou se `ts` for **maior** que o carimbo que ela tem (a última escrita vence; carimbo igual ou menor é ignorado). Se menos de `w` réplicas estiverem no ar, levante `SemQuorum`, **sem desfazer** o que as réplicas no ar gravaram (é o que bancos reais fazem).\n- `ler(chave, r)`: consulta as **r primeiras réplicas no ar, na ordem da lista** `nos`. Se houver menos de `r` no ar, levante `SemQuorum`. Devolva o valor de maior carimbo entre as respostas (`None` se nenhuma tiver a chave) e faça o **reparo na leitura**: cada réplica consultada que estava sem a chave ou com carimbo menor recebe o par mais novo. Réplicas não consultadas não mudam, e ler uma chave que ninguém tem não cria a chave em lugar nenhum.",difficulty:`desafio`,skills:[`bd-nosql`],hints:[`Comece pelo que as duas operações têm em comum. Que lista você precisa montar antes de qualquer outra coisa?`,`Na escrita, o que vem primeiro: gravar nas réplicas no ar ou conferir o quórum? Releia o que acontece com uma escrita que não juntou w réplicas.`,`Na leitura, as respostas podem ser pares ou None. Como achar o par de maior carimbo sem tropeçar nos None?`,`Depois de achar o par mais novo, quais réplicas recebem o reparo, e qual condição cada uma precisa cumprir?`],explanation:'As duas operações começam pela lista de réplicas no ar, na ordem de `nos`. A escrita grava em todas elas (com a última escrita vencendo pelo carimbo, não pela ordem de chegada) e só depois confere o quórum, então uma escrita que falhou para o cliente fica nas réplicas que a receberam. A leitura pega as r primeiras, escolhe o par de maior carimbo e repara as consultadas que estavam atrás. Os testes mostram, nas mesmas três réplicas, as faces do quórum: com W = R = 2, a leitura sempre encontra uma réplica com a escrita e ainda conserta a atrasada; com W = R = 1, ela pode ler o passado; e uma escrita "falha" aparece numa leitura posterior. Bancos reais acrescentam o que ficou de fora: o coordenador espera só as W ou R primeiras respostas em vez de saber de antemão quem está no ar, há timeouts, *hinted handoff* para as escritas destinadas a um nó caído e anti-entropia em segundo plano para as chaves que ninguém lê.',starter:`class SemQuorum(Exception):
    pass

class Cluster:
    def __init__(self, nos):
        self.nos = list(nos)
        self.dados = {no: {} for no in self.nos}   # no -> {chave: (ts, valor)}
        self.fora = set()                           # réplicas fora do ar

    def derrubar(self, no):
        self.fora.add(no)

    def religar(self, no):
        self.fora.discard(no)
    def escrever(self, chave, valor, ts, w):
        # grave em todas as réplicas no ar (a última escrita vence) e confira o quórum
        pass

    def ler(self, chave, r):
        # consulte as r primeiras réplicas no ar, devolva o valor mais novo e repare as atrasadas
        pass`,solution:`class SemQuorum(Exception):
    pass

class Cluster:
    def __init__(self, nos):
        self.nos = list(nos)
        self.dados = {no: {} for no in self.nos}   # no -> {chave: (ts, valor)}
        self.fora = set()                           # réplicas fora do ar

    def derrubar(self, no):
        self.fora.add(no)

    def religar(self, no):
        self.fora.discard(no)
    def _no_ar(self):
        return [no for no in self.nos if no not in self.fora]

    def escrever(self, chave, valor, ts, w):
        no_ar = self._no_ar()
        for no in no_ar:
            atual = self.dados[no].get(chave)
            if atual is None or ts > atual[0]:
                self.dados[no][chave] = (ts, valor)
        if len(no_ar) < w:
            raise SemQuorum(f"só {len(no_ar)} réplica(s) no ar; w = {w}")

    def ler(self, chave, r):
        no_ar = self._no_ar()
        if len(no_ar) < r:
            raise SemQuorum(f"só {len(no_ar)} réplica(s) no ar; r = {r}")
        consultadas = no_ar[:r]
        respostas = [self.dados[no].get(chave) for no in consultadas]
        existentes = [p for p in respostas if p is not None]
        if not existentes:
            return None
        mais_novo = max(existentes, key=lambda p: p[0])
        for no in consultadas:
            atual = self.dados[no].get(chave)
            if atual is None or atual[0] < mais_novo[0]:
                self.dados[no][chave] = mais_novo
        return mais_novo[1]`,tests:[{name:`tudo no ar`,code:`c = Cluster(["A", "B", "C"])
c.escrever("pedido:1", "preparando", 1, 2)
c.escrever("pedido:1", "a caminho", 2, 2)
v = c.ler("pedido:1", 2)
assert v == "a caminho", f"com todas as réplicas no ar, a leitura devolve a escrita mais nova; veio {v!r}"
for no in "ABC":
    p = c.dados[no].get("pedido:1")
    assert p == (2, "a caminho"), f"a escrita vai para todas as réplicas no ar, não só para w delas: {no} ficou com {p}"`},{name:`o mais novo, não o primeiro`,code:`c = Cluster(["A", "B", "C"])
c.escrever("pedido:1", "preparando", 1, 3)
c.derrubar("A")
c.escrever("pedido:1", "a caminho", 2, 2)     # só B e C recebem
c.religar("A")
v = c.ler("pedido:1", 2)                       # consulta A (velha) e B (nova)
assert v == "a caminho", f"A respondeu (1, 'preparando') e B respondeu (2, 'a caminho'): devolva o de maior carimbo, não a primeira resposta. Veio {v!r}"
assert c.dados["A"]["pedido:1"] == (2, "a caminho"), f"A foi consultada e estava atrasada: o reparo na leitura grava nela o par mais novo. A ficou com {c.dados['A']['pedido:1']}"`},{name:`reparo só nas consultadas`,code:`def _levanta(f, *args):
    try:
        f(*args)
    except SemQuorum:
        return True
    return False
c = Cluster(["A", "B", "C", "D"])
c.escrever("k", "v1", 1, 4)
for no in "BCD":
    c.derrubar(no)
assert not _levanta(c.escrever, "k", "v2", 2, 1), "com w = 1 e A no ar, a escrita tem quórum: não levante SemQuorum"
for no in "BCD":
    c.religar(no)
v = c.ler("k", 2)
assert v == "v2", f"a leitura consulta A e B, e A tem a versão 2; veio {v!r}"
assert c.dados["B"]["k"] == (2, "v2"), "B foi consultada (é a 2ª réplica no ar) e estava atrasada: precisa ser reparada"
assert c.dados["C"]["k"] == (1, "v1") and c.dados["D"]["k"] == (1, "v1"), "C e D não foram consultadas (r = 2): o reparo na leitura só toca as réplicas que responderam"`},{name:`R + W ≤ N pode ler o passado`,code:`c = Cluster(["A", "B", "C"])
c.escrever("pedido:7", "preparando", 1, 1)
c.derrubar("A")
c.derrubar("B")
c.escrever("pedido:7", "a caminho", 2, 1)      # só C recebe
c.religar("A")
c.religar("B")
v = c.ler("pedido:7", 1)                        # consulta só A
assert v == "preparando", f"com W = 1 e R = 1, a leitura consulta só A, que não recebeu a escrita nova: o esperado é ler o passado ('preparando'). Veio {v!r}. Consulte só as r primeiras réplicas no ar"
assert c.dados["B"]["pedido:7"] == (1, "preparando"), "B não foi consultada e não pode mudar"
v = c.ler("pedido:7", 3)
assert v == "a caminho", f"com R = 3, a leitura alcança C e acha a escrita nova; veio {v!r}"
assert all(c.dados[no]["pedido:7"] == (2, "a caminho") for no in "ABC"), "depois da leitura com R = 3, o reparo deixa as três réplicas com a versão nova"`},{name:`sem quórum na leitura; réplica fora do ar não é consultada`,code:`def _levanta(f, *args):
    try:
        f(*args)
    except SemQuorum:
        return True
    return False
c = Cluster(["A", "B", "C"])
c.escrever("k", "x", 1, 3)
c.derrubar("A")
c.derrubar("C")
assert _levanta(c.ler, "k", 2), "só B está no ar e r = 2: levante SemQuorum"
assert c.ler("k", 1) == "x", "com r = 1, B basta"

c = Cluster(["A", "B", "C"])
c.escrever("k", "v1", 1, 3)
c.derrubar("A")
c.escrever("k", "v2", 2, 2)                    # B e C recebem; A continua fora do ar
v = c.ler("k", 1)
assert v == "v2", f"A está fora do ar: a leitura consulta as r primeiras réplicas no ar (aqui, B). Veio {v!r}"
assert c.dados["A"]["k"] == (1, "v1"), "A está fora do ar: não pode ser consultada nem reparada"`},{name:`escrita sem quórum não é desfeita`,code:`def _levanta(f, *args):
    try:
        f(*args)
    except SemQuorum:
        return True
    return False
c = Cluster(["A", "B", "C"])
c.escrever("pix:9", "pendente", 1, 2)
c.derrubar("B")
c.derrubar("C")
assert _levanta(c.escrever, "pix:9", "cancelado", 2, 2), "só A está no ar e w = 2: levante SemQuorum"
assert c.dados["A"]["pix:9"] == (2, "cancelado"), "a escrita que não juntou quórum não é desfeita: A, que estava no ar, fica com ela. Grave antes de conferir o quórum"
assert c.dados["B"]["pix:9"] == (1, "pendente"), "B estava fora do ar e não recebe nada"
c.religar("B")
c.religar("C")
v = c.ler("pix:9", 1)
assert v == "cancelado", f"a escrita que falhou para o cliente aparece numa leitura posterior, que consulta A: é um dos limites do quórum. Veio {v!r}"`},{name:`a última escrita vence pelo carimbo`,code:`c = Cluster(["A", "B", "C"])
c.escrever("k", "x", 5, 3)
c.escrever("k", "y", 3, 3)                     # chega depois, mas com carimbo menor
v = c.ler("k", 3)
assert v == "x", f"a escrita de carimbo 3 chegou depois, mas o carimbo dela é menor que 5: a última escrita vence pelo carimbo, não pela ordem de chegada. Veio {v!r}"
c.escrever("k", "z", 5, 3)                     # carimbo igual: ignorada
assert all(c.dados[no]["k"] == (5, "x") for no in "ABC"), "carimbo igual ao que a réplica já tem é ignorado"`},{name:`chave que ninguém tem`,code:`c = Cluster(["A", "B"])
c.escrever("outra", "x", 1, 2)
assert c.ler("nada", 2) is None, "nenhuma réplica tem a chave: devolva None"
assert all("nada" not in c.dados[no] for no in "AB"), "ler uma chave que ninguém tem não pode criar a chave nas réplicas"`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:"**Mini-projeto: atraso de verdade na simulação.** Estenda o `Cluster` do desafio com um relógio simulado: cada escrita chega a cada réplica depois de um atraso sorteado (por exemplo, entre 1 e 50 ms), e as leituras acontecem em instantes sorteados, às vezes antes de a escrita chegar a todas. Meça a fração de leituras que devolvem dado velho para (N, W, R) = (3, 1, 1), (3, 2, 2) e (5, 2, 2), variando o atraso médio, e monte uma tabela. Depois dê a uma das réplicas um relógio 100 ms atrasado, gere escritas concorrentes na mesma chave e conte quantas escritas a última-escrita-vence descarta. Troque o valor por um G-counter e compare."}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Síncrona: o líder espera réplicas antes de confirmar (não perde escrita confirmada quando uma máquina cai, mas é mais lenta). Assíncrona: confirma na hora e pode perder as últimas escritas numa troca de líder.
- Atraso de replicação causa anomalias: não ver a própria escrita, voltar no tempo, ver a resposta antes da pergunta. Técnicas: ler do líder ou pela posição no log, réplica fixa por usuário, partição por causalidade.
- Troca de líder: escritas perdidas, tempo limite difícil de acertar e cérebro dividido; maioria e números de mandato evitam dois líderes.
- Quórum: R + W > N garante sobreposição; N = 3, W = R = 2 aguenta uma réplica fora. Reparo na leitura e anti-entropia alcançam as atrasadas. Não é linearizabilidade.
- Escritas concorrentes: a última escrita vence (simples, perde dados, depende do relógio), vetores de versão (guardam as irmãs) ou CRDTs (juntam sozinhos, como o G-counter).
- CAP: C é linearizabilidade, não o C do ACID. PACELC: sem partição, ainda se troca latência por consistência, a toda operação.`},{type:`callout`,tone:`english`,text:`- **leader / follower (replica)**: líder / seguidor (réplica)
- **replication lag**: atraso de replicação
- **read-your-writes / monotonic reads / consistent prefix**: ler as próprias escritas / leituras monotônicas / prefixo consistente
- **failover / split brain / term**: troca de líder / cérebro dividido / mandato
- **quorum / read repair / anti-entropy / hinted handoff**: quórum / reparo na leitura / anti-entropia / entrega adiada
- **last write wins / version vector / CRDT**: última escrita vence / vetor de versão / CRDT
- **linearizability**: linearizabilidade

Frase típica de entrevista: *"With N = 3, I'd use W = 2 and R = 2, so every read quorum overlaps every write quorum and we can lose one node. That still isn't linearizable: concurrent writes are resolved with last-write-wins, which can silently drop data."*

Frase típica de documentação (PostgreSQL, synchronous_commit): *"When set to remote_apply, commits will wait until replies from the current synchronous standby(s) indicate they have received the commit record of the transaction and applied it, so that it has become visible to queries on the standby(s), and also written to durable storage on the standbys."*`,title:`English corner`}]}],cards:[{id:`l7-replicacao-consistencia#1`,front:`O que se perde quando um líder com replicação assíncrona cai logo depois de confirmar uma escrita?`,back:`A escrita, se ainda não tinha sido copiada: o novo líder não a tem e, quando o antigo volta, ela costuma ser descartada.`},{id:`l7-replicacao-consistencia#2`,front:`Você grava, recarrega e vê o valor antigo. Que garantia faltou, e que técnica a dá?`,back:`Ler as próprias escritas. Ler do líder o que o usuário mudou (por um tempo), ou só ler de réplicas que já chegaram à posição no log da escrita dele.`},{id:`l7-replicacao-consistencia#3`,front:`Como garantir leituras monotônicas com várias réplicas?`,back:`Mandando cada usuário sempre para a mesma réplica, por exemplo por hash do id dele.`},{id:`l7-replicacao-consistencia#4`,front:`O que é cérebro dividido, e como os algoritmos de consenso o evitam?`,back:`Dois nós agindo como líder ao mesmo tempo. Exigindo votos da maioria para eleger e numerando os mandatos, recusando mensagens de mandatos antigos.`},{id:`l7-replicacao-consistencia#5`,front:`Por que R + W > N faz a leitura alcançar a última escrita confirmada?`,back:`Porque qualquer conjunto de R réplicas lidas tem pelo menos uma em comum com as W que confirmaram a escrita: não cabem R réplicas fora delas.`},{id:`l7-replicacao-consistencia#6`,front:`Com N = 3, W = 2 e R = 2, quantas réplicas podem estar fora do ar para ler e para escrever?`,back:`Uma, nos dois casos.`},{id:`l7-replicacao-consistencia#7`,front:`O que a última-escrita-vence perde, e por que o relógio é um problema?`,back:`Descarta em silêncio as escritas concorrentes que perderam; com relógios desalinhados, a escrita que de fato veio depois pode perder.`},{id:`l7-replicacao-consistencia#8`,front:`Como o G-counter junta duas réplicas sem perder incrementos?`,back:`Cada réplica conta só na própria posição; juntar é tirar o máximo de cada posição, e o valor é a soma. A junção é comutativa, associativa e idempotente.`},{id:`l7-replicacao-consistencia#9`,front:`Qual a diferença entre o C do CAP e o C do ACID?`,back:`CAP: linearizabilidade, comportar-se como uma cópia única. ACID: cada transação respeita as regras do banco (chaves, restrições).`},{id:`l7-replicacao-consistencia#10`,front:`O que o PACELC acrescenta ao CAP?`,back:`Que, sem partição (Else), ainda há uma escolha entre latência e consistência, feita a cada operação.`}]};export{e as default};
//# sourceMappingURL=l7-replicacao-consistencia-DPVG7Ozm.js.map