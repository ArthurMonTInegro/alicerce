var e={id:`l3-hash`,moduleId:`m3-3`,title:`Tabelas hash`,titleEn:`Hash tables`,summary:`Como dict e set conseguem buscar em tempo constante: funções hash, buckets e colisões.`,minutes:30,objectives:[`Explicar como uma função hash mapeia chaves em posições`,`Entender colisões e como são tratadas`,`Saber por que chaves precisam ser imutáveis`,`Escolher entre lista, set e dict`],skills:[`ed-hash`],terms:[{pt:`tabela hash / tabela de dispersão`,en:`hash table / hash map`,def:`Estrutura que usa uma função hash para localizar chaves rapidamente.`},{pt:`função hash`,en:`hash function`,def:`Função que transforma uma chave em um número.`},{pt:`colisão`,en:`collision`,def:`Quando duas chaves diferentes caem na mesma posição.`},{pt:`balde`,en:`bucket`,def:`Posição da tabela onde ficam os itens.`},{pt:`fator de carga`,en:`load factor`,def:`Quantidade de itens dividida pelo número de posições.`},{pt:`hashável`,en:`hashable`,def:`Objeto que pode ser usado como chave (imutável).`,example:`TypeError: unhashable type: 'list'`}],references:[`clrs`,`mit-6006`,`python-docs`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:"Uma **{{tabela hash|hash table}}** guarda pares chave → valor em um array. Para saber **onde** colocar uma chave, calcula-se `hash(chave) % tamanho`. Para buscar, faz-se a mesma conta e vai-se direto à posição: em média **O(1)**, sem percorrer nada. É assim que `dict` e `set` funcionam."}]},{stage:`explicacao`,blocks:[{type:`md`,text:`1. **Função hash**: transforma a chave em um inteiro. Deve ser **determinística** (mesma chave → mesmo número) e **espalhar bem** as chaves.
2. **Índice**: \`hash(chave) % m\`, onde *m* é o número de posições (*buckets*).
3. **Colisões**: duas chaves podem cair no mesmo índice. Soluções: **encadeamento** (*chaining* — cada posição tem uma lista) ou **endereçamento aberto** (*open addressing* — procura a próxima posição livre; é o que o CPython usa).
4. **Redimensionamento**: quando o **fator de carga** fica alto, a tabela cresce e todas as chaves são reinseridas — custo amortizado O(1), como na lista dinâmica.

**Por que chaves imutáveis?** Se uma lista mudasse depois de inserida, seu hash mudaria e ela ficaria "perdida" na posição antiga. Por isso \`{[1, 2]: "x"}\` dá \`TypeError: unhashable type: 'list'\`; use uma tupla.`},{type:`callout`,tone:`warn`,text:`O(1) é o caso **médio**. Com uma função hash ruim (ou um atacante que força colisões), tudo cai na mesma posição e a busca vira O(n). Por isso o Python randomiza o hash de strings a cada execução (*hash randomization*).`}]},{stage:`exemplo`,blocks:[{type:`viz`,viz:`hash-table`,caption:`Insira chaves e veja em que bucket cada uma cai e como as colisões formam listas (chaining).`}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`print(hash(42), hash("ana") % 8, hash((1, 2)) % 8)

# comparando a busca em list e set
import time
n = 200_000
lista = list(range(n))
conjunto = set(lista)
t0 = time.perf_counter(); (n - 1) in lista; t1 = time.perf_counter()
(n - 1) in conjunto; t2 = time.perf_counter()
print(f"list: {t1 - t0:.6f}s   set: {t2 - t1:.6f}s")`,runnable:!0}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e3-hash-1`,kind:`mcq`,prompt:`Você precisa verificar milhões de vezes se um CPF já está cadastrado. Qual estrutura usar?`,difficulty:`facil`,skills:[`ed-hash`],hints:["Qual é o custo de `x in estrutura` em cada caso?"],explanation:"Em set, `in` custa O(1) em média; em list, O(n). Para milhões de buscas, a diferença é enorme.",options:[{text:`Uma lista ordenada de CPFs`,feedback:`Busca binária seria O(log n) — bom, mas manter a ordem ao inserir é O(n).`},{text:`Um set de CPFs`,correct:!0,feedback:`Isso: pertencimento O(1) em média.`},{text:`Uma lista comum`,feedback:"`in` em lista é O(n) a cada busca."},{text:`Uma string com todos os CPFs concatenados`,feedback:`Buscar substring também é linear — e propenso a falsos positivos.`}]}},{type:`exercise`,exercise:{id:`e3-hash-2`,kind:`code`,lang:`python`,prompt:"Escreva `dois_somam(xs, alvo)` que devolve True se existem **dois elementos em posições diferentes** cuja soma é `alvo`. A lista **não** está ordenada. Exija O(n) usando um set.",difficulty:`intermediario`,skills:[`ed-hash`],hints:[`Para cada x, que número você precisaria ter visto antes?`,"Guarde num set os números já vistos e pergunte se `alvo - x` está lá."],explanation:`Este é o famoso *Two Sum*. Trocar o loop interno por uma consulta O(1) a um set reduz O(n²) para O(n) — trocar memória por tempo.`,starter:`def dois_somam(xs, alvo):
    for i in range(len(xs)):
        for j in range(i + 1, len(xs)):
            if xs[i] + xs[j] == alvo:
                return True
    return False
`,solution:`def dois_somam(xs, alvo):
    vistos = set()
    for x in xs:
        if alvo - x in vistos:
            return True
        vistos.add(x)
    return False`,tests:[{name:`encontra`,code:`assert dois_somam([8, 3, 5, 1], 9)`},{name:`não usa o mesmo elemento duas vezes`,code:`assert not dois_somam([5], 10) and dois_somam([5, 5], 10)`},{name:`eficiente`,code:`import time
xs = list(range(0, 400000, 2))
t0 = time.perf_counter()
r = dois_somam(xs, -1)
assert r is False and time.perf_counter() - t0 < 1.5, "muito lento: use um set"`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e3-hash-desafio`,kind:`code`,lang:`python`,prompt:"Implemente sua própria tabela hash com **encadeamento**: `class TabelaHash` com `__init__(self, m=8)`, `put(chave, valor)`,\n`get(chave)` (lança `KeyError` se não existir) e `__len__`. Quando `len / m > 0.75`, dobre `m` e reinsira tudo.\nNão use dict nem set internamente.",difficulty:`desafio`,skills:[`ed-hash`],hints:["Represente os buckets como uma lista de listas de pares `[chave, valor]`.",`put: calcule o índice, procure a chave no bucket; se achar, atualize; senão, acrescente e verifique o fator de carga.`,`Para redimensionar, guarde os pares antigos, recrie os buckets com o dobro e reinsira.`],explanation:`Implementar a estrutura por dentro consolida as ideias: índice = hash % m, colisões em listas, redimensionamento para manter o fator de carga baixo.`,starter:`class TabelaHash:
    def __init__(self, m=8):
        pass
`,solution:`class TabelaHash:
    def __init__(self, m=8):
        self.m = m
        self.n = 0
        self.buckets = [[] for _ in range(m)]

    def _idx(self, chave):
        return hash(chave) % self.m

    def put(self, chave, valor):
        b = self.buckets[self._idx(chave)]
        for par in b:
            if par[0] == chave:
                par[1] = valor
                return
        b.append([chave, valor])
        self.n += 1
        if self.n / self.m > 0.75:
            self._crescer()

    def _crescer(self):
        pares = [p for b in self.buckets for p in b]
        self.m *= 2
        self.buckets = [[] for _ in range(self.m)]
        self.n = 0
        for k, v in pares:
            self.put(k, v)

    def get(self, chave):
        for k, v in self.buckets[self._idx(chave)]:
            if k == chave:
                return v
        raise KeyError(chave)

    def __len__(self):
        return self.n`,tests:[{name:`put/get`,code:`t = TabelaHash()
t.put("a", 1); t.put("b", 2); t.put("a", 3)
assert t.get("a") == 3 and t.get("b") == 2 and len(t) == 2`},{name:`KeyError`,code:`t = TabelaHash()
try:
    t.get("x")
    assert False, "deveria lançar KeyError"
except KeyError:
    pass`},{name:`redimensiona`,code:`t = TabelaHash(4)
for i in range(100):
    t.put(i, i * i)
assert len(t) == 100 and t.get(77) == 5929 and t.m >= 128`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:`**Projeto 3 — Sistema de cadastro** (começa aqui): um cadastro de alunos em memória, com busca por matrícula em O(1) (dict), busca por nome e relatórios. Ele vai ganhar arquivos, testes e, mais adiante, um banco de dados.`},{type:`project`,projectId:`p3-cadastro`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- hash(chave) % m → posição.
- Colisões: encadeamento ou endereçamento aberto.
- O(1) em média; O(n) no pior caso.
- Chaves precisam ser imutáveis (hashable).`}]}],cards:[{id:`l3-hash#1`,front:`Como uma tabela hash encontra a posição de uma chave?`,back:`Calcula hash(chave) % número_de_buckets.`},{id:`l3-hash#2`,front:`O que é uma colisão?`,back:`Duas chaves diferentes mapeadas para a mesma posição.`},{id:`l3-hash#3`,front:`Por que uma lista não pode ser chave de dict?`,back:`Porque é mutável: seu hash poderia mudar depois de inserida.`}]};export{e as default};
//# sourceMappingURL=l3-hash-BRrHzO3p.js.map