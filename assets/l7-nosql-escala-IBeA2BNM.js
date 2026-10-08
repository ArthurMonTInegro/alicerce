var e={id:`l7-nosql-escala`,moduleId:`m7-4`,title:`NoSQL, replicação, particionamento e CAP`,titleEn:`NoSQL, replication, partitioning and CAP`,summary:`Quando um banco relacional não é a melhor escolha, os modelos NoSQL (documento, chave-valor, coluna, grafo) e como dados são espalhados por várias máquinas.`,minutes:45,objectives:[`Comparar os modelos relacional, documento, chave-valor e grafo`,`Explicar replicação e particionamento (sharding)`,`Interpretar o teorema CAP sem simplificações erradas`,`Escolher o banco certo para um caso concreto`],skills:[`bd-nosql`],terms:[{pt:`banco de documentos`,en:`document database`,def:`Guarda documentos (parecidos com JSON) com estrutura flexível.`,example:`MongoDB`},{pt:`chave-valor`,en:`key-value store`,def:`Dicionário gigante e rápido: dada a chave, devolve o valor.`,example:`Redis`},{pt:`replicação`,en:`replication`,def:`Manter cópias dos mesmos dados em várias máquinas.`},{pt:`particionamento`,en:`partitioning (sharding)`,def:`Dividir os dados entre máquinas, cada uma com uma parte.`},{pt:`consistência eventual`,en:`eventual consistency`,def:`Réplicas podem divergir por um tempo, mas convergem se as escritas pararem.`},{pt:`partição de rede`,en:`network partition`,def:`Falha que separa as máquinas em grupos que não se comunicam.`},{pt:`cache`,en:`cache`,def:`Cópia rápida de dados caros de obter.`}],references:[`ddia`,`cmu-15445`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`**NoSQL** é um guarda-chuva para bancos que não usam (só) tabelas relacionais. Eles existem porque alguns problemas pedem outro **modelo de dados** (documentos aninhados, grafos de relações) ou outra forma de **escalar** (espalhar dados por muitas máquinas). Não são "melhores" que SQL: trocam garantias por flexibilidade ou escala.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`### Modelos

- **Relacional (SQL)**: tabelas, JOINs, transações ACID. Ótimo padrão para quase tudo.
- **Documento** (MongoDB): um pedido com seus itens em um documento só. Leitura do objeto inteiro é simples; relações entre documentos são o ponto fraco.
- **Chave-valor** (Redis): \`GET sessao:123\`. Rapidíssimo; usado para cache, filas, contadores e sessões.
- **Colunar/largas colunas** (Cassandra): muitas escritas distribuídas, consultas planejadas pela chave.
- **Grafo** (Neo4j): "amigos dos amigos que gostam de X". Relações são o centro.

### Escalando

- **Replicação**: um líder recebe escritas e as copia para seguidores. Leituras podem ir aos seguidores (podem estar um pouco atrasados).
- **Particionamento**: os dados são divididos por chave. Ex.: \`hash(usuario_id) % 4\` escolhe a máquina. Problema: mudar de 4 para 5 máquinas move quase tudo; por isso existe o **hash consistente**.

### CAP, sem mito

Durante uma **partição de rede** (P), o sistema precisa escolher: responder mesmo podendo estar desatualizado (**disponibilidade**, A) ou recusar até ter certeza (**consistência**, C). Fora de partições, dá para ter as duas. "Escolha 2 de 3" é uma simplificação ruim: partição não é opcional numa rede real.`},{type:`callout`,tone:`info`,text:`Comece com PostgreSQL. Adicione Redis quando medir que precisa de cache. Considere outro banco quando o modelo de dados ou a escala realmente pedirem. "Usar MongoDB porque é moderno" não é motivo.`,title:`Regra prática`}]},{stage:`exemplo`,blocks:[{type:`code`,lang:`python`,code:`import json

# O mesmo pedido em dois modelos
relacional = {
    "pedidos": [(1, "ana", "2026-10-01")],
    "itens":   [(1, 1, "caderno", 2), (2, 1, "caneta", 5)],   # (id, pedido_id, produto, qtd)
}
documento = {"_id": 1, "cliente": "ana", "data": "2026-10-01",
             "itens": [{"produto": "caderno", "qtd": 2}, {"produto": "caneta", "qtd": 5}]}

print("Relacional: precisa de JOIN para montar o pedido")
print("Documento:", json.dumps(documento, ensure_ascii=False))`,runnable:!0}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`import hashlib

def maquina(chave, n):
    h = int(hashlib.md5(chave.encode()).hexdigest(), 16)
    return h % n

usuarios = [f"user{i}" for i in range(1000)]
antes = {u: maquina(u, 4) for u in usuarios}
depois = {u: maquina(u, 5) for u in usuarios}
movidos = sum(antes[u] != depois[u] for u in usuarios)
print(f"Indo de 4 para 5 máquinas com hash % n, {movidos / 10:.0f}% das chaves mudam de lugar")`,runnable:!0,caption:`Por que "hash módulo n" é ruim para crescer: quase todas as chaves mudam de máquina.`},{type:`callout`,tone:`deep`,text:`O **hash consistente** coloca máquinas e chaves num mesmo "anel" de hashes; cada chave fica na próxima máquina do anel. Ao adicionar uma máquina, só as chaves entre ela e a anterior se movem (cerca de 1/n). DynamoDB e Cassandra usam variações disso.`,title:`Aprofundando`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e7-nosql-0`,kind:`mcq`,prompt:`Você precisa guardar sessões de login que expiram em 30 minutos e são lidas a cada requisição. Qual tipo de banco encaixa melhor?`,difficulty:`facil`,skills:[`bd-nosql`],hints:[`Acesso sempre pela chave (o id da sessão), leitura muito frequente e expiração automática.`],explanation:`Um **chave-valor em memória** como Redis faz exatamente isso, inclusive com expiração automática (TTL). Um banco relacional também resolve em sistemas pequenos.`,options:[{text:`Banco de grafos`,feedback:`Não há relações entre sessões para explorar.`},{text:`Chave-valor em memória (ex.: Redis)`,correct:!0,feedback:`Isso: leitura por chave, rápida, com TTL.`},{text:`Data warehouse colunar`,feedback:`Feito para análises sobre muitos dados, não para leituras pontuais rápidas.`},{text:`Arquivo CSV`,feedback:`Sem concorrência, sem expiração, lento para buscar.`}]}},{type:`exercise`,exercise:{id:`e7-nosql-1`,kind:`code`,lang:`python`,prompt:"Implemente um **cache com expiração**: `Cache()` com `set(chave, valor, ttl, agora)` e `get(chave, agora)`.\n`get` devolve o valor se `agora < momento_da_gravacao + ttl`, senão devolve `None` e **remove** a chave.\nO tempo é passado como número (`agora`) para facilitar os testes.",difficulty:`intermediario`,skills:[`bd-nosql`],hints:[`Guarde junto do valor o instante em que ele expira.`,`No get, compare agora com o instante de expiração.`],explanation:"É o comportamento do `SET chave valor EX segundos` do Redis. Receber o tempo como parâmetro (em vez de chamar time.time() lá dentro) é uma técnica para deixar código dependente de relógio testável.",starter:`class Cache:
    def __init__(self):
        self.dados = {}

    def set(self, chave, valor, ttl, agora):
        pass

    def get(self, chave, agora):
        return None
`,solution:`class Cache:
    def __init__(self):
        self.dados = {}

    def set(self, chave, valor, ttl, agora):
        self.dados[chave] = (valor, agora + ttl)

    def get(self, chave, agora):
        item = self.dados.get(chave)
        if item is None:
            return None
        valor, expira = item
        if agora >= expira:
            del self.dados[chave]
            return None
        return valor`,tests:[{name:`antes de expirar`,code:`c = Cache()
c.set("s1", "ana", 30, 100)
assert c.get("s1", 129) == "ana"`},{name:`expirado e removido`,code:`c = Cache()
c.set("s1", "ana", 30, 100)
assert c.get("s1", 130) is None
assert "s1" not in c.dados`},{name:`sobrescrever renova`,code:`c = Cache()
c.set("k", 1, 10, 0)
c.set("k", 2, 10, 5)
assert c.get("k", 12) == 2`},{name:`chave ausente`,code:`assert Cache().get("x", 0) is None`}]}},{type:`exercise`,exercise:{id:`e7-nosql-2`,kind:`mcq`,prompt:`Durante uma partição de rede, um sistema que prioriza **consistência** (CP) faz o quê?`,difficulty:`avancado`,skills:[`bd-nosql`],hints:[`Do lado da partição que não consegue confirmar com a maioria, responder pode significar devolver dado velho.`],explanation:`Um sistema CP recusa (ou atrasa) operações que não consegue confirmar, para nunca devolver dado inconsistente. Um sistema AP responde, aceitando divergir por um tempo.`,options:[{text:`Continua aceitando escritas dos dois lados e resolve depois`,feedback:`Isso é priorizar disponibilidade (AP).`},{text:`Recusa ou adia operações que não consegue confirmar`,correct:!0,feedback:`Exato: prefere não responder a responder errado.`},{text:`Ignora a partição, porque CAP só vale em teoria`,feedback:`Partições acontecem em redes reais; é por isso que CAP importa.`},{text:`Desliga a replicação permanentemente`,feedback:`A replicação continua existindo; a questão é o que fazer durante a falha.`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e7-nosql-desafio`,kind:`code`,lang:`python`,prompt:"Implemente **hash consistente**. `Anel(maquinas)` posiciona cada máquina no anel em `h(nome)`, onde\n`h(texto) = int(hashlib.md5(texto.encode()).hexdigest(), 16) % 1000`.\n`dono(chave)` devolve a máquina na **primeira posição maior ou igual** a `h(chave)`, dando a volta no anel se necessário.\n`adicionar(nome)` inclui uma máquina nova.",difficulty:`desafio`,skills:[`bd-nosql`],hints:[`Mantenha uma lista ordenada de (posição, nome).`,`Para achar o dono, percorra a lista (ou use bisect) procurando a primeira posição >= h(chave).`,`Se nenhuma posição for >= h(chave), o dono é a primeira máquina da lista (volta do anel).`],explanation:`Com hash consistente, adicionar uma máquina só move as chaves que caem entre ela e a máquina anterior no anel. Sistemas reais colocam cada máquina em várias posições ("nós virtuais") para dividir a carga de forma mais igual.`,starter:`import hashlib

def h(texto):
    return int(hashlib.md5(texto.encode()).hexdigest(), 16) % 1000

class Anel:
    def __init__(self, maquinas):
        pass

    def adicionar(self, nome):
        pass

    def dono(self, chave):
        pass
`,solution:`import bisect
import hashlib

def h(texto):
    return int(hashlib.md5(texto.encode()).hexdigest(), 16) % 1000

class Anel:
    def __init__(self, maquinas):
        self.pos = []
        for m in maquinas:
            self.adicionar(m)

    def adicionar(self, nome):
        bisect.insort(self.pos, (h(nome), nome))

    def dono(self, chave):
        i = bisect.bisect_left(self.pos, (h(chave), ""))
        if i == len(self.pos):
            i = 0
        return self.pos[i][1]`,tests:[{name:`dono respeita o anel`,code:`a = Anel(["m1", "m2", "m3"])
for k in ["ana", "bia", "caio", "duda", "eva"]:
    hk = h(k)
    cands = sorted((h(m), m) for m in ["m1", "m2", "m3"])
    esperado = next((m for p, m in cands if p >= hk), cands[0][1])
    assert a.dono(k) == esperado, k`},{name:`adicionar move poucas chaves`,code:`a = Anel(["m1", "m2", "m3", "m4"])
chaves = [f"k{i}" for i in range(300)]
antes = {k: a.dono(k) for k in chaves}
a.adicionar("m5")
mov = [k for k in chaves if a.dono(k) != antes[k]]
assert all(a.dono(k) == "m5" for k in mov)
assert len(mov) < 300 * 0.6`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:"**Mini-projeto**: adicione um cache com expiração à sua API do Nível 6 para uma consulta lenta (simule com `time.sleep`). Meça o tempo antes e depois, e escreva no README quando o cache pode devolver dado desatualizado e por que isso é aceitável (ou não) no seu caso."}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Documento, chave-valor, colunar e grafo resolvem problemas diferentes; SQL continua sendo o padrão.
- Replicação copia; particionamento divide.
- \`hash % n\` move quase tudo ao crescer; hash consistente move ~1/n.
- CAP: durante uma partição, escolha entre responder (A) ou ter certeza (C).`}]}],cards:[{id:`l7-nosql-escala#1`,front:`Diferença entre replicação e particionamento?`,back:`Replicação: cópias dos mesmos dados em várias máquinas. Particionamento: cada máquina guarda uma parte diferente.`},{id:`l7-nosql-escala#2`,front:`O que o teorema CAP realmente diz?`,back:`Durante uma partição de rede, é preciso escolher entre consistência e disponibilidade.`},{id:`l7-nosql-escala#3`,front:`Por que hash consistente?`,back:`Para que adicionar ou remover máquinas mova só uma fração pequena das chaves.`},{id:`l7-nosql-escala#4`,front:`Um bom uso de Redis?`,back:`Cache, sessões, contadores, filas: acesso rápido por chave, com expiração.`}]};export{e as default};
//# sourceMappingURL=l7-nosql-escala-IBeA2BNM.js.map