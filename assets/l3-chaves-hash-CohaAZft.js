var e={id:`l3-chaves-hash`,moduleId:`m3-3`,title:`Funções hash e chaves: o contrato entre hash e igualdade`,titleEn:`Hash functions and keys: the hash/equality contract`,summary:`O que uma função hash precisa garantir para a tabela funcionar, por que somar as letras espalha mal, como criar chaves próprias com __eq__ e __hash__ (ou dataclass congelada), por que uma chave que muda se perde e como escolher a chave certa, do CEP ao Two Sum.`,minutes:50,objectives:[`Enunciar os requisitos de uma função hash para tabelas e o que quebra quando cada um falha`,`Explicar por que a soma dos códigos das letras espalha mal e como o hash polinomial resolve`,`Escrever __eq__ e __hash__ coerentes, ou usar @dataclass(frozen=True), para usar objetos próprios como chave`,`Prever o que acontece quando uma chave muda depois de inserida e escolher chaves imutáveis e canônicas`,`Escolher a chave de busca em problemas da família Two Sum`],skills:[`ed-hash`,`prog-dicionarios`],terms:[{pt:`hash polinomial`,en:`polynomial hash`,def:`Função hash que trata o texto como algarismos de um número numa base B: h = h·B + código da letra, letra a letra, guardando o resto da divisão por um número grande.`,example:`Java's String.hashCode() is a polynomial hash with base 31.`},{pt:`efeito avalanche`,en:`avalanche effect`,def:`Propriedade de boas funções hash: mudar um único bit da entrada muda, em média, metade dos bits da saída.`},{pt:`ataque por inundação de hash`,en:`hash flooding (HashDoS)`,def:`Ataque que envia muitas chaves com o mesmo hash para que buscas O(1) virem O(n) e o servidor trave.`},{pt:`métodos especiais`,en:`special methods (dunder methods)`,def:`Métodos com nome entre sublinhados duplos, como __eq__ e __hash__, que o Python chama sozinho em certas operações (==, hash(), dict, set).`},{pt:`não hashável`,en:`unhashable`,def:`Objeto sem hash, que não pode ser chave de dict nem elemento de set.`,example:`TypeError: unhashable type: 'set'`},{pt:`classe de dados congelada`,en:`frozen dataclass`,def:`Classe criada com @dataclass(frozen=True): os campos não podem mudar depois de criados, e __eq__ e __hash__ são gerados de forma coerente.`,example:`dataclasses.FrozenInstanceError: cannot assign to field 'x'`},{pt:`chave composta`,en:`composite key`,def:`Chave formada por mais de um valor, geralmente uma tupla, como (linha, ponto).`},{pt:`forma canônica`,en:`canonical form`,def:`Representação única escolhida para valores que devem contar como iguais, como o CEP só com dígitos.`},{pt:`soma acumulada`,en:`prefix sum`,def:`Soma dos elementos desde o início da lista até uma posição; a soma de um trecho é a diferença entre duas somas acumuladas.`}],references:[`python-docs`,`sedgewick-algs`,`clrs`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:'Toda busca num `dict` ou num `set` faz duas perguntas à chave. A primeira é **"onde procurar?"**, e quem responde é `hash(chave)`: ele escolhe a posição onde a sondagem começa. A segunda, feita em cada posição ocupada do caminho, é **"é você mesma?"**, e quem responde é o `==`. A tabela confia cegamente nas duas respostas.\n\nCom `int` e `str`, o Python já responde do jeito certo. Quando a chave é um objeto seu, ou quando você escolhe *o que* usar como chave, a responsabilidade passa a ser sua. Esta lição mostra o que uma função hash precisa garantir, o que quebra quando ela falha (a chave "perdida" é o caso mais traiçoeiro) e como escolher chaves que funcionam, do CEP ao Two Sum.'}]},{stage:`explicacao`,blocks:[{type:`md`,text:`### O que a tabela exige da função hash`},{type:`table`,head:[`Requisito`,`O que significa`,`Se falhar...`],rows:[["Coerência com `==`","se `a == b`, então `hash(a) == hash(b)`",`duas chaves iguais começam a busca em lugares diferentes: duplicatas no set, buscas que não acham`],[`Estabilidade`,`o hash de uma chave não muda enquanto ela está na tabela`,`a chave se perde: continua lá dentro, mas nenhuma busca a encontra`],[`Espalhamento`,`chaves diferentes recebem hashes bem distribuídos`,`muitas colisões: as buscas ficam lentas, até O(n) no pior caso`],[`Rapidez`,`calcular o hash custa pouco`,`toda operação paga esse custo, até as que acertam de primeira`]],caption:`Os dois primeiros requisitos são de correção; os dois últimos, de desempenho.`},{type:`md`,text:'Repare no que **não** está na lista: chaves diferentes podem ter o mesmo hash. Isso é uma colisão, é permitido, e quem desempata é o `==`. A regra só vale num sentido: `a == b` obriga hashes iguais, mas hashes iguais não obrigam `a == b`. A tabela usa a contrapositiva (hashes diferentes ⇒ chaves diferentes) para pular quase todas as posições do caminho sem chamar `==`: no CPython, o `==` só é chamado quando o hash guardado na posição é igual ao da chave procurada, e, antes dele, ainda há um teste mais barato, o de ser o mesmo objeto (`is`).\n\n### Espalhar bem: soma das letras × hash polinomial\nUma ideia ingênua para texto é somar os códigos das letras. É coerente e estável, mas espalha mal por dois motivos:\n\n- **Ignora a ordem**: `"amor"`, `"roma"`, `"ramo"`, `"mora"` e `"omar"` têm as mesmas letras, logo a mesma soma. Todo anagrama colide.\n- **Gera poucos valores**: toda palavra de 3 letras minúsculas sem acento soma entre 3 × 97 = 291 e 3 × 122 = 366. São só 76 hashes possíveis para 17.576 palavras.\n\nO {{hash polinomial|polynomial hash}} trata o texto como os algarismos de um número numa base *B*: `h = h * B + ord(letra)`, letra a letra, guardando só o resto da divisão por um número grande. Agora a posição importa: em `"amor"`, o código do `a` é multiplicado por B³; em `"roma"`, por 1. O `String.hashCode()` do Java é exatamente isso, com B = 31 (o "resto" fica por conta do estouro do inteiro de 32 bits). Calcular assim, multiplicando o acumulado a cada letra, é o método de Horner: n multiplicações para n letras.\n\nO CPython, o Python que você instala no computador, vai além. Nele, o hash de `str` e `bytes` é o **SipHash** (PEP 456), que tem {{efeito avalanche|avalanche effect}}: trocar uma única letra muda, em média, metade dos bits do resultado. E ele usa uma chave secreta sorteada **a cada vez que o interpretador inicia**: num terminal, rode duas vezes `python3 -c "print(hash(\'ana\'))"` e veja números diferentes. (O Python que roda no navegador, aqui na plataforma, foi compilado com um algoritmo mais simples, o FNV, mas também sorteia a chave a cada início.) O motivo é o {{ataque por inundação de hash|hash flooding}}: em 2011, pesquisadores mostraram que dava para travar servidores web de várias linguagens enviando milhares de parâmetros escolhidos para ter o mesmo hash. Cada inserção virava O(n), e a requisição inteira, O(n²). Com a chave sorteada, o atacante não sabe quais textos colidem. Já o hash de inteiros não é sorteado: `hash(n) == n` para inteiros não negativos pequenos, e por isso os exemplos da lição anterior se repetem iguais em toda execução.\n\n### Coerência: quando a sua classe vira chave\nOs números mostram a regra em ação: `1 == 1.0 == True`, então os três **precisam** ter o mesmo hash, e têm. Para uma tabela, são a mesma chave.\n\nNuma classe sua, quem responde às duas perguntas são dois {{métodos especiais|special methods}}: o Python chama `__eq__` quando você escreve `a == b` e `__hash__` quando precisa de `hash(a)`. (Classes, métodos especiais e dataclasses ganham um módulo inteiro no Nível 5; aqui basta o necessário para usar objetos como chave.) Se a classe não define nenhum dos dois, o comportamento padrão é coerente: `==` compara identidade (é o mesmo objeto?) e o hash também vem da identidade. Dois `Ponto(1, 2)` criados separadamente são chaves **diferentes**.'},{type:`callout`,tone:`tip`,text:"Se você ainda não escreveu classes, isto basta para esta lição. `class Ponto:` cria um tipo novo, e as funções definidas dentro dela são os **métodos**. Escrever `p = Ponto(1, 2)` cria um objeto e chama `__init__(self, 1, 2)`, em que `self` é o próprio objeto recém-criado; `self.x = x` guarda o valor dentro dele, e depois `p.x` o lê. Num método como `__eq__(self, outro)`, `a == b` vira `a.__eq__(b)`: `self` é o objeto da esquerda e `outro`, o da direita.",title:`Classes em poucas linhas`},{type:`md`,text:'Quando você define `__eq__` para comparar por conteúdo, o hash por identidade deixaria de ser coerente, e o Python se protege: uma classe que define `__eq__` e não define `__hash__` fica **sem hash** (`__hash__ = None`), e usá-la como chave dá um `TypeError` avisando que o tipo é {{não hashável|unhashable}}. Por isso `__eq__` e `__hash__` andam juntos:\n\n- `__hash__` deve usar **os mesmos campos** que o `__eq__` compara, do mesmo jeito. O caminho recomendado é empacotar esses campos numa tupla e devolver o hash dela: `return hash((self.x, self.y))`.\n- Usar menos campos no hash continua coerente (só espalha pior). Usar um campo que o `__eq__` ignora, ou o campo num formato diferente do que o `__eq__` compara, quebra a regra.\n- `return 0` também é coerente, e transforma a tabela numa lista: todas as chaves colidem.\n\nO atalho é `@dataclass(frozen=True)`, do módulo `dataclasses`. Ele gera `__init__`, `__repr__`, um `__eq__` que compara os campos e um `__hash__` coerente com ele, e ainda impede alterar os campos depois da criação. É uma {{classe de dados congelada|frozen dataclass}}: o jeito mais simples de ter uma chave própria correta. Para usá-la, escreva `@dataclass(frozen=True)` na linha de cima da classe e liste os campos com o tipo de cada um (`linha: str`), como na seção Código.\n\n### Estabilidade: por que a chave precisa ser imutável\nSe o hash de uma chave muda depois que ela entrou na tabela, ela continua na posição calculada com o hash **antigo**, e uma busca pelo próprio objeto parte da posição do hash **novo**. Por isso `list`, `dict` e `set` são não hasháveis: são mutáveis. Uma tupla tem hash só se todos os seus elementos tiverem (usar `(1, [2])` como chave dá erro), e o `frozenset` é a versão imutável, e com hash, do `set`. A seção Exemplo mostra, passo a passo, uma chave se perdendo.\n\n### Escolher a chave certa\nMuitas vezes, a decisão mais importante é **o que** usar como chave:\n\n- **{{Chave composta|composite key}}**: o horário de um ônibus depende da linha e do ponto, então a chave é a tupla `(linha, ponto)`.\n- **{{Forma canônica|canonical form}}**: `"01310-100"`, `"01310100"` e `" 01310-100 "` são o mesmo CEP. Normalize (só os dígitos) antes de usar como chave, ou faça `__eq__` e `__hash__` usarem a forma normalizada. Para um par sem ordem, como uma partida entre dois times, use `frozenset({a, b})` ou `tuple(sorted((a, b)))`. Para anagramas, as letras ordenadas, como você fez no Nível 2.\n- **A chave do que você vai procurar**: no Two Sum, para cada número `x` a pergunta é "já vi `alvo - x`?". A chave é o número já visto; o valor é o que você quer receber quando achar, por exemplo o índice dele. Pergunte sempre: *que valor eu vou procurar, e o que quero de volta quando achar?*'},{type:`callout`,tone:`warn`,text:"Um objeto mutável pode ser chave **se** o `__eq__` e o `__hash__` dele dependerem só de partes que nunca mudam, como uma matrícula. O perigo é calcular o hash com campos que mudam. Na dúvida, use dados imutáveis: `str`, `int`, `tuple`, `frozenset` ou uma dataclass congelada.",title:`Mutável não é proibido; mudar o que entra no hash é`}]},{stage:`exemplo`,blocks:[{type:`viz`,viz:`hash-table`,caption:`Esta visualização usa como função hash a soma dos códigos das letras. Insira amor, roma, ramo e mora: todas caem no mesmo balde. Depois redimensione até 32 baldes: chaves que só dividiam um balde por acaso, como bia e caio, se separam, mas os anagramas continuam juntos, porque o hash deles é o mesmo.`},{type:`md`,text:`Agora, a chave perdida. A classe abaixo comete o erro clássico: o hash depende de atributos que podem mudar. Execute passo a passo e observe as três últimas linhas.`},{type:`trace`,code:`class Ponto:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __eq__(self, outro):
        return (self.x, self.y) == (outro.x, outro.y)

    def __hash__(self):
        return hash((self.x, self.y))   # depende de campos que podem mudar!

casa = Ponto(1, 2)
mapa = {casa: "minha casa"}
casa.x = 5                       # a chave muda DEPOIS de guardada
print(casa in mapa)
print(Ponto(1, 2) in mapa)
print(len(mapa), list(mapa.values()))`},{type:`table`,head:[`Busca`,`Começa na posição de`,`O que encontra`,`Resultado`],rows:[["`casa in mapa`","`hash((5, 2))`, o hash novo",`uma posição vazia: a entrada ficou na posição do hash antigo, fora desse caminho, e a busca para ali`,"`False`"],["`Ponto(1, 2) in mapa`","`hash((1, 2))`, o mesmo de quando a chave entrou","a entrada certa, e o hash bate; mas o `==` compara com o objeto guardado, que agora vale `(5, 2)`","`False`"],["`len(mapa)` e `list(mapa.values())`",`(nenhuma: só contam e percorrem as entradas)`,`a entrada continua lá`,"`1` e `['minha casa']`"]],caption:`A entrada virou um fantasma: ocupa espaço e aparece quando o dict é percorrido, mas nenhuma busca a encontra.`},{type:`md`,text:'Um detalhe deixa o bug ainda mais traiçoeiro. Antes até de comparar hashes, o `dict` do CPython confere se a entrada é o **mesmo objeto** (`is`). Se o hash novo, por acaso, levasse à mesma posição do antigo, `casa in mapa` daria `True`. Com outros valores de `x` e `y`, o mesmo código pode "funcionar", e o erro só aparece depois.\n\nCom `@dataclass(frozen=True)`, a linha `casa.x = 5` falharia na hora com `FrozenInstanceError`: o erro aparece onde foi cometido, e não muito depois, como uma busca que "misteriosamente" não acha nada.'}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`from dataclasses import dataclass

# 1. Números iguais têm o mesmo hash, mesmo sendo de tipos diferentes
print(hash(1) == hash(1.0) == hash(True))
print({1: "int", 1.0: "float", True: "bool"})

# 2. Soma das letras x hash polinomial
def hash_soma(s):
    return sum(ord(c) for c in s)

def hash_poli(s, base=31, mod=2**61 - 1):
    h = 0
    for c in s:
        h = (h * base + ord(c)) % mod    # método de Horner
    return h

palavras = ["amor", "roma", "ramo", "mora", "omar", "arma", "rama"]
print(len({hash_soma(p) for p in palavras}), "hashes distintos somando as letras")
print(len({hash_poli(p) for p in palavras}), "hashes distintos com o polinomial")

# 3. Uma chave própria, imutável e coerente
@dataclass(frozen=True)
class Parada:
    linha: str
    ponto: int

horarios = {Parada("107", 3): "07:40"}
print(horarios[Parada("107", 3)])        # outro objeto, mas igual: acha

# 4. O que pode e o que não pode ser chave
for candidato in [(1, 2), frozenset({1, 2}), (1, [2]), {1, 2}]:
    try:
        hash(candidato)
        print(type(candidato).__name__, "-> pode ser chave")
    except TypeError as erro:
        print(type(candidato).__name__, "->", erro)`,runnable:!0},{type:`code`,lang:`python`,code:`def dois_somam_indices(xs, alvo):
    visto = {}                       # número já visto -> índice dele
    for j, x in enumerate(xs):
        falta = alvo - x
        if falta in visto:           # procura ANTES de guardar x
            return visto[falta], j
        visto[x] = j
    return None

print(dois_somam_indices([8, 3, 5, 1], 9))
print(dois_somam_indices([3, 3], 6))
print(dois_somam_indices([5], 10))`,runnable:!0,caption:`Two Sum devolvendo índices em uma passada. Procurar antes de guardar impede usar o mesmo elemento duas vezes ([5] com alvo 10) sem impedir dois elementos iguais ([3, 3]).`},{type:`callout`,tone:`tip`,text:"Quer conferir se um objeto pode ser chave? Chame `hash(objeto)`: se der `TypeError`, ele não pode."}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e3-ch-1`,kind:`mcq`,prompt:`Você quer um dict que guarde a distância entre pares de capitais, identificadas pela sigla do estado, sem se importar com a ordem do par. Qual destes valores **pode** ser chave?`,difficulty:`facil`,skills:[`ed-hash`,`prog-dicionarios`],hints:[`O que os tipos que podem ser chave têm em comum? Algum deles pode mudar depois de criado?`,`Uma tupla é imutável, mas e o que está dentro dela?`],explanation:`Chaves precisam de hash estável, e os contêineres mutáveis do Python (list, set, dict) não têm hash. Tuplas têm hash só quando todos os elementos têm. O frozenset é o set imutável e, como ignora a ordem, serve de forma canônica para pares sem ordem.`,options:[{text:'`["SP", "RJ"]`',feedback:"Lista é mutável e, por isso, não tem hash: usá-la como chave dá um `TypeError` com *unhashable type: 'list'*."},{text:'`{"SP", "RJ"}`',feedback:`Um set é mutável (tem add e remove), então também não tem hash. A versão imutável dele está entre as opções.`},{text:'`("SP", ["RJ"])`',feedback:`Tupla só tem hash se todos os elementos tiverem. Esta carrega uma lista dentro, e o erro reclama dela: *unhashable type: 'list'*.`},{text:'`frozenset({"SP", "RJ"})`',correct:!0,feedback:'Isso: é imutável e tem hash. E, como não tem ordem, `frozenset({"SP", "RJ"}) == frozenset({"RJ", "SP"})`: é a mesma chave para SP–RJ e RJ–SP.'}]}},{type:`exercise`,exercise:{id:`e3-ch-2`,kind:`predict`,lang:`python`,prompt:`O que é impresso?`,difficulty:`intermediario`,skills:[`ed-hash`,`prog-dicionarios`],hints:["Quanto vale `1 == True`? E `1 == 1.0`?",`Se as chaves são iguais e têm o mesmo hash, a nova atribuição cria uma entrada ou atualiza a que existe? E qual objeto continua sendo a chave guardada?`],explanation:"`1`, `True` e `1.0` são iguais para o `==` e, pela regra, têm o mesmo hash: para o dict, são a mesma chave. Cada atribuição só troca o valor; a chave guardada continua sendo o primeiro objeto que entrou, o `1`. Por isso, misturar bool, int e float como chaves de um mesmo dict costuma esconder bugs.",code:`d = {}
d[1] = "um"
d[True] = "verdadeiro"
d[1.0] = "real"
print(d, len(d))`,answer:`{1: 'real'} 1`}},{type:`exercise`,exercise:{id:`e3-ch-3`,kind:`predict`,lang:`python`,prompt:"Duas classes, uma sem métodos especiais e outra só com `__eq__`. O que é impresso?",difficulty:`intermediario`,skills:[`ed-hash`],hints:["Sem `__eq__` nem `__hash__`, como o Python decide se dois objetos são iguais?","O que o Python faz com o `__hash__` de uma classe que define `__eq__` e não define `__hash__`? Por que ele faria isso?"],explanation:"`SemNada` usa o padrão: igualdade e hash por identidade. Dois objetos criados separadamente são diferentes, e o set fica com 2. `SoEq` define `__eq__` e não define `__hash__`, então o Python faz `__hash__ = None`: o hash por identidade deixaria de ser coerente, porque dois objetos iguais teriam hashes diferentes. Montar o set já falha com `TypeError`, e a mensagem diz que o tipo é *unhashable* (o texto exato muda um pouco entre versões do Python).",code:`class SemNada:
    def __init__(self, ra):
        self.ra = ra

class SoEq:
    def __init__(self, ra):
        self.ra = ra
    def __eq__(self, outro):
        return self.ra == outro.ra

print(len({SemNada(1), SemNada(1)}))
try:
    print(len({SoEq(1), SoEq(1)}))
except TypeError as e:
    print("erro:", type(e).__name__)`,answer:`2
erro: TypeError`}},{type:`exercise`,exercise:{id:`e3-ch-4`,kind:`fix`,lang:`python`,prompt:"A classe `Cep` considera iguais os CEPs escritos com ou sem ponto, hífen e espaços (o `__eq__` compara só os dígitos). Mesmo assim, um set de CEPs está ficando com repetidos, e buscas num dict falham quando o CEP vem em outro formato. Encontre e corrija o erro sem mudar o que o `__eq__` considera igual.",difficulty:`intermediario`,skills:[`ed-hash`],hints:['Pegue dois CEPs que o `__eq__` considera iguais, como "01310-100" e "01310100". Os hashes deles são iguais?',"Qual é a regra que liga `__eq__` e `__hash__`? Que informação o `__eq__` usa para comparar, e qual o `__hash__` usa?","A classe já tem um método que produz exatamente a forma que o `__eq__` compara."],explanation:'O `__eq__` compara os dígitos, mas o `__hash__` usava o texto cru. "01310-100" e "01310100" eram iguais com hashes diferentes, e o set nem chegava a compará-los: cada um começava a busca num lugar. Calcular o hash da mesma forma normalizada que o `__eq__` compara restaura a regra a == b ⇒ hash(a) == hash(b). Trocar o `__eq__` para comparar o texto cru também deixaria tudo coerente, mas mudaria o significado da classe: ela deixaria de reconhecer o mesmo CEP em formatos diferentes.',starter:`class Cep:
    def __init__(self, texto):
        self.texto = texto

    def digitos(self):
        return "".join(c for c in self.texto if c.isdigit())

    def __eq__(self, outro):
        return isinstance(outro, Cep) and self.digitos() == outro.digitos()

    def __hash__(self):
        return hash(self.texto)`,solution:`class Cep:
    def __init__(self, texto):
        self.texto = texto

    def digitos(self):
        return "".join(c for c in self.texto if c.isdigit())

    def __eq__(self, outro):
        return isinstance(outro, Cep) and self.digitos() == outro.digitos()

    def __hash__(self):
        return hash(self.digitos())`,tests:[{name:`o mesmo CEP em formatos diferentes vira um só no set`,code:`s = {Cep("01310-100"), Cep("01310100"), Cep(" 01310-100 "), Cep("01.310-100")}
assert len(s) == 1, f"o set ficou com {len(s)} CEPs; esperado 1, porque os quatro são o mesmo CEP"`},{name:`o dict acha o CEP escrito de outro jeito`,code:`d = {Cep("01310-100"): "Av. Paulista"}
r = d.get(Cep("01310100"))
assert r == "Av. Paulista", f"d.get(Cep('01310100')) devolveu {r!r}; o dict deveria achar o CEP sem hífen"`},{name:`CEPs diferentes continuam diferentes`,code:`assert Cep("01310-100") != Cep("20040-002"), "CEPs diferentes não podem ser iguais"
s = {Cep("01310-100"), Cep("20040-002"), Cep("70040010")}
assert len(s) == 3, f"o set com 3 CEPs diferentes ficou com {len(s)}"`},{name:`iguais têm o mesmo hash`,code:`pares = [("01310-100", "01310100"), ("20040-002", " 20040002"), ("70040 010", "70040-010"), ("40.020-000", "40020000")]
for a, b in pares:
    assert Cep(a) == Cep(b), f"Cep({a!r}) e Cep({b!r}) deveriam continuar iguais"
    assert hash(Cep(a)) == hash(Cep(b)), f"Cep({a!r}) == Cep({b!r}), mas os hashes são diferentes"`},{name:`o hash espalha`,code:`hs = {hash(Cep(f"{i:05d}-000")) for i in range(50)}
assert len(hs) > 40, f"entre 50 CEPs diferentes, o número de hashes distintos foi {len(hs)}: um hash constante, ou que ignora parte dos dígitos, é coerente, mas faz muitas chaves colidirem. Use todos os dígitos que o __eq__ compara"
hs = {hash(Cep(f"01310-{i:03d}")) for i in range(50)}
assert len(hs) > 40, "CEPs da mesma região (todos começam com 01310) ficaram com quase o mesmo hash: use todos os dígitos que o __eq__ compara, não só uma parte"`}]}},{type:`exercise`,exercise:{id:`e3-ch-5`,kind:`code`,lang:`python`,prompt:"Escreva `pares_soma(xs, alvo)`, que devolve um **set** com todos os pares **distintos** de valores `(a, b)`, com `a <= b`, tais que `a + b == alvo` e `a` e `b` estão em posições diferentes de `xs`. Exemplo: `pares_soma([1, 5, 3, 3, 4, 2], 6)` devolve `{(1, 5), (3, 3), (2, 4)}`. Faça em O(n), numa passada só.",difficulty:`intermediario`,skills:[`ed-hash`,`prog-dicionarios`],hints:[`Para cada x, qual número você precisaria já ter visto para formar um par?`,"Se o mesmo par de valores aparecer várias vezes, como garantir que ele entre uma vez só? Que forma do par faz `(5, 1)` e `(1, 5)` virarem a mesma coisa?","Cuidado com o par `(3, 3)`: ele só vale se houver dois 3 na lista. Em que momento você guarda x entre os vistos?"],explanation:'É o Two Sum com duas escolhas de chave. A primeira: o set dos números já vistos responde "já vi alvo − x?" em O(1). A segunda: o par entra no resultado na forma canônica `(min, max)`, uma tupla imutável, para que repetições virem uma só. Procurar antes de guardar x garante que `(3, 3)` só aparece com dois 3. Uma passada, O(n) em tempo e memória.',starter:`def pares_soma(xs, alvo):
    # devolva um set de tuplas (menor, maior)
    pass`,solution:`def pares_soma(xs, alvo):
    vistos = set()
    pares = set()
    for x in xs:
        y = alvo - x
        if y in vistos:
            pares.add((min(x, y), max(x, y)))
        vistos.add(x)
    return pares`,tests:[{name:`exemplo do enunciado`,code:`r = pares_soma([1, 5, 3, 3, 4, 2], 6)
assert isinstance(r, set), f"devolva um set, não {type(r).__name__}"
assert r == {(1, 5), (3, 3), (2, 4)}, f"devolveu {r}; esperado {{(1, 5), (3, 3), (2, 4)}}"`},{name:`vazio e um elemento`,code:`assert pares_soma([], 6) == set(), "lista vazia: nenhum par"
r = pares_soma([3], 6)
assert r == set(), f"pares_soma([3], 6) devolveu {r}; um único 3 não forma par com ele mesmo"`},{name:`pares repetidos aparecem uma vez, na ordem (menor, maior)`,code:`r = pares_soma([5, 1, 1, 5, 5, 1], 6)
assert r == {(1, 5)}, f"devolveu {r}; esperado {{(1, 5)}}, uma vez só e com o menor primeiro"
r = pares_soma([3, 3], 6)
assert r == {(3, 3)}, f"pares_soma([3, 3], 6) devolveu {r}; dois 3 formam o par (3, 3)"`},{name:`negativos e zero`,code:`r = pares_soma([-2, 8, 0, 6, 10, -4], 6)
assert r == {(-2, 8), (0, 6), (-4, 10)}, f"devolveu {r}; esperado {{(-2, 8), (0, 6), (-4, 10)}}"
r = pares_soma([0, 0, 0], 0)
assert r == {(0, 0)}, f"pares_soma([0, 0, 0], 0) devolveu {r}; esperado {{(0, 0)}}"`},{name:`eficiente`,code:`import time
class _Lista(list):
    leituras = 0
    def _ler(self, n=1):
        self.leituras += n
        assert self.leituras <= 10 * len(self), f"pares_soma já leu mais de {10 * len(self)} elementos de uma lista de {len(self)}: comparar cada x com todos os outros é O(n²). Para cada x, procure alvo - x num set"
    def __getitem__(self, i):
        self._ler(len(range(*i.indices(len(self)))) if isinstance(i, slice) else 1)
        return list.__getitem__(self, i)
    def __iter__(self):
        for x in list.__iter__(self):
            self._ler()
            yield x
    def __contains__(self, x):
        self._ler(len(self))
        return list.__contains__(self, x)
    def count(self, x):
        self._ler(len(self))
        return list.count(self, x)
    def index(self, *args):
        self._ler(len(self))
        return list.index(self, *args)
r = pares_soma(_Lista(range(0, 4000, 2)), -1)
assert r == set(), "nenhuma soma de dois números pares dá -1"
xs = list(range(0, 40000, 2))
t0 = time.perf_counter()
r = pares_soma(xs, -1)
dt = time.perf_counter() - t0
assert r == set(), "nenhuma soma de dois números pares dá -1"
assert dt < 0.5, f"levou {dt:.2f}s com 20.000 números: guarde os vistos num set (em uma lista, cada 'in' percorre tudo)"`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e3-ch-desafio`,kind:`code`,lang:`python`,prompt:"O extrato de uma conta mostra o saldo líquido de cada dia (Pix recebidos menos pagamentos), e os valores podem ser negativos. Escreva `contar_periodos(movs, k)`, que devolve **quantos períodos de dias consecutivos** (com pelo menos um dia) somam exatamente `k`.\n\nExemplos: `contar_periodos([10, -10, 10, -10], 0)` devolve `4`; `contar_periodos([1, 2, 3], 3)` devolve `2` (os períodos `[1, 2]` e `[3]`).\n\nFaça em O(n): testar todos os períodos é O(n²) e não passa no teste de desempenho.",difficulty:`desafio`,skills:[`ed-hash`,`prog-dicionarios`],hints:[`No Two Sum, para cada x você perguntava "já vi o número que completa x?". Existe uma pergunta parecida sobre a soma de todos os dias desde o primeiro até hoje?`,`Chame de S(j) a soma acumulada do dia 0 ao dia j. Quanto somam os dias de i + 1 até j, em termos de S? Para esse período valer k, quanto S(i) precisa valer?`,`Uma mesma soma acumulada pode ter aparecido em vários dias, e cada um deles começa um período diferente. O que o valor do dicionário deveria guardar?`,`E os períodos que começam no primeiro dia? Que soma acumulada "de antes do primeiro dia" precisa estar no dicionário desde o início?`],explanation:`A soma dos dias i + 1 a j é S(j) − S(i), e ela vale k exatamente quando S(i) = S(j) − k. É o Two Sum aplicado às somas acumuladas: a chave é a soma acumulada, e o valor é quantas vezes ela já apareceu, porque cada aparição é um começo de período diferente. Começar com {0: 1} representa a soma vazia de antes do primeiro dia, que conta os períodos iniciados no dia 0. Procurar antes de registrar a soma atual impede contar o período vazio. Alargar e encolher o período com dois índices, como nos problemas de dois ponteiros, não serve aqui: com valores negativos, aumentar o período pode diminuir a soma. O(n) em tempo e memória.`,starter:`def contar_periodos(movs, k):
    # devolva quantos trechos contíguos (não vazios) de movs somam k
    pass`,solution:`def contar_periodos(movs, k):
    vezes = {0: 1}       # soma acumulada -> quantas vezes apareceu
    soma = 0
    total = 0
    for v in movs:
        soma += v
        total += vezes.get(soma - k, 0)
        vezes[soma] = vezes.get(soma, 0) + 1
    return total`,tests:[{name:`exemplos do enunciado`,code:`for movs, k, esperado in [([10, -10, 10, -10], 0, 4), ([1, 2, 3], 3, 2)]:
    r = contar_periodos(movs, k)
    assert r == esperado, f"contar_periodos({movs}, {k}) devolveu {r}; esperado {esperado}"`},{name:`vazio, um dia e o período vazio`,code:`casos = [([], 0, 0, "lista vazia: nenhum período (o período vazio não conta)"),
         ([5], 5, 1, "um dia que vale k é um período"),
         ([5], 0, 0, "o período vazio soma 0, mas não conta"),
         ([1, 1, 1], 2, 2, "[1, 1] aparece em duas posições")]
for movs, k, esperado, motivo in casos:
    r = contar_periodos(movs, k)
    assert r == esperado, f"contar_periodos({movs}, {k}) devolveu {r}; esperado {esperado} ({motivo})"`},{name:`zeros e negativos`,code:`r = contar_periodos([0, 0, 0], 0)
assert r == 6, f"contar_periodos([0, 0, 0], 0) devolveu {r}; todo trecho soma 0: são 3 + 2 + 1 = 6"
r = contar_periodos([3, 4, -7, 1, 3, 3, 1, -4], 7)
assert r == 4, f"contar_periodos([3, 4, -7, 1, 3, 3, 1, -4], 7) devolveu {r}; esperado 4 (com negativos, aumentar o período pode diminuir a soma)"
r = contar_periodos([-1, -1, 1], 0)
assert r == 1, f"contar_periodos([-1, -1, 1], 0) devolveu {r}; esperado 1"`},{name:`confere com a força bruta em listas aleatórias`,code:`import random
random.seed(42)
def _bruta(movs, k):
    c = 0
    for i in range(len(movs)):
        s = 0
        for j in range(i, len(movs)):
            s += movs[j]
            if s == k:
                c += 1
    return c
for _ in range(200):
    movs = [random.randint(-5, 5) for _ in range(random.randint(0, 25))]
    k = random.randint(-6, 6)
    r, esperado = contar_periodos(movs, k), _bruta(movs, k)
    assert r == esperado, f"contar_periodos({movs}, {k}) devolveu {r}; esperado {esperado}"`},{name:`eficiente`,code:`import time
class _Lista(list):
    leituras = 0
    def _ler(self, n=1):
        self.leituras += n
        assert self.leituras <= 10 * len(self), f"contar_periodos já leu mais de {10 * len(self)} valores de uma lista de {len(self)} dias: testar todos os períodos é O(n²). Guarde num dict quantas vezes cada soma acumulada apareceu"
    def __getitem__(self, i):
        self._ler(len(range(*i.indices(len(self)))) if isinstance(i, slice) else 1)
        return list.__getitem__(self, i)
    def __iter__(self):
        for x in list.__iter__(self):
            self._ler()
            yield x
    def __contains__(self, x):
        self._ler(len(self))
        return list.__contains__(self, x)
    def count(self, x):
        self._ler(len(self))
        return list.count(self, x)
    def index(self, *args):
        self._ler(len(self))
        return list.index(self, *args)
r = contar_periodos(_Lista([1, -1] * 1000), 0)
assert r == 1000000, f"contar_periodos([1, -1] * 1000, 0) devolveu {r}; esperado 1000000"
movs = [1, -1] * 2500
t0 = time.perf_counter()
r = contar_periodos(movs, 0)
dt = time.perf_counter() - t0
assert r == 6250000, f"contar_periodos([1, -1] * 2500, 0) devolveu {r}; esperado 6250000"
assert dt < 0.25, f"levou {dt:.2f}s com 5.000 dias: em vez de testar todos os pares de somas acumuladas, guarde num dict quantas vezes cada soma apareceu"`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:"**Projeto 3: cadastro acadêmico.** Use as ideias desta lição na Parte 1 e na Parte 2: a matrícula (imutável) como chave do dict de alunos, nunca o objeto `Aluno` inteiro; um índice auxiliar por nome completo na forma canônica (minúsculas, sem espaços sobrando), para achar um nome exato em O(1) (a busca parcial ainda precisa percorrer os nomes); e, quando `Aluno` virar dataclass, lembre que uma dataclass comum, mutável, fica sem hash de propósito: para ela ir para um set ou virar chave, o caminho seguro é `frozen=True`."},{type:`project`,projectId:`p3-cadastro`}]},{stage:`revisao`,blocks:[{type:`md`,text:'- A tabela pergunta "onde procurar?" ao `hash` e "é você?" ao `==`. Regra: `a == b` ⇒ `hash(a) == hash(b)`; o contrário não é exigido.\n- Função hash boa: coerente, estável, espalha bem e é rápida. Somar letras espalha mal; o hash polinomial leva a posição em conta; o CPython usa SipHash com chave sorteada contra inundação de hash.\n- Classe própria como chave: `__hash__` com os mesmos campos do `__eq__` (`hash((campo1, campo2))`), ou `@dataclass(frozen=True)`. Definir só `__eq__` deixa a classe sem hash.\n- Chave que muda depois de inserida se perde. Use `str`, `int`, `tuple`, `frozenset` ou dataclass congelada.\n- Escolha a chave: composta (tupla), canônica (CEP só com dígitos, `frozenset` para pares sem ordem) ou "o que vou procurar" (Two Sum: `alvo - x`).\n- Períodos com soma k: a {{soma acumulada|prefix sum}} transforma o problema num Two Sum; o dict guarda quantas vezes cada soma apareceu, começando com `{0: 1}`.'},{type:`callout`,tone:`english`,text:`**Vocabulary**: *hashable / unhashable*, *special (dunder) methods*, *frozen dataclass*, *canonical form*, *composite key*, *polynomial hash*, *avalanche effect*, *hash flooding*, *prefix sum*.

From the Python Data Model documentation: *"The only required property is that objects which compare equal have the same hash value."*

Typical interview prompt: "Given an array of integers and a target, return the indices of the two numbers that add up to the target. Can you do it in one pass?" A common follow-up: "Now count the subarrays whose sum equals k."`,title:`English corner`}]}],cards:[{id:`l3-chaves-hash#1`,front:`Qual é a única regra obrigatória entre __eq__ e __hash__?`,back:`Se a == b, então hash(a) == hash(b).`},{id:`l3-chaves-hash#2`,front:`Hashes iguais garantem chaves iguais?`,back:`Não. Isso é uma colisão, permitida; quem decide é o ==.`},{id:`l3-chaves-hash#3`,front:`O que acontece com uma classe que define __eq__ e não define __hash__?`,back:`O Python faz __hash__ = None: a classe fica sem hash, e usá-la como chave dá TypeError (unhashable type).`},{id:`l3-chaves-hash#4`,front:`Uma chave muda depois de entrar no dict. Por que as buscas falham?`,back:`Ela ficou na posição do hash antigo. A busca pelo objeto parte do hash novo; a busca por um objeto igual ao antigo chega lá, mas o == falha.`},{id:`l3-chaves-hash#5`,front:`Quanto vale {1: "a", True: "b"}?`,back:`{1: "b"}: 1 == True e os dois têm o mesmo hash. Fica a primeira chave, com o último valor.`},{id:`l3-chaves-hash#6`,front:`Por que a soma dos códigos das letras é uma função hash ruim?`,back:`Ignora a ordem (todo anagrama colide) e gera poucos valores para palavras curtas.`},{id:`l3-chaves-hash#7`,front:`No Two Sum com índices, o que é chave e o que é valor do dict?`,back:`Chave: número já visto. Valor: o índice dele. Para cada x, procura alvo − x antes de guardar x.`},{id:`l3-chaves-hash#8`,front:`Como contar em O(n) os trechos contíguos com soma k?`,back:`Dict de somas acumuladas → quantas vezes apareceram, começando com {0: 1}; para cada soma S, some vezes[S − k].`}]};export{e as default};
//# sourceMappingURL=l3-chaves-hash-CohaAZft.js.map