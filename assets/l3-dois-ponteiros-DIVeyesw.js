var e={id:`l3-dois-ponteiros`,moduleId:`m3-1`,title:`Dois ponteiros: padrões e invariantes`,titleEn:`Two pointers: patterns and invariants`,summary:`Três jeitos de andar com dois índices (convergentes, leitor e escritor, duas listas) que trocam laços aninhados por uma passada O(n), e como provar que nenhuma resposta fica para trás.`,minutes:50,objectives:[`Reconhecer qual dos três padrões de dois ponteiros um problema pede`,`Justificar a correção com um argumento de descarte ou um invariante de laço`,`Filtrar e compactar listas no lugar, em O(n) e com O(1) de memória extra`,`Combinar duas listas ordenadas em O(n + m)`],skills:[`ed-arrays`],terms:[{pt:`dois ponteiros`,en:`two pointers`,def:`Técnica que percorre a lista com dois índices que nunca voltam atrás, descartando candidatos a cada passo.`,example:`This problem can be solved in O(n) with the two pointers technique.`},{pt:`ponteiro`,en:`pointer`,def:`Aqui, uma variável que guarda uma posição (índice) da lista. Em C, é um endereço de memória.`},{pt:`ponteiros convergentes`,en:`converging pointers`,def:`Um índice em cada ponta, andando um em direção ao outro até se cruzarem.`},{pt:`leitor e escritor`,en:`read/write pointers`,def:`Dois índices no mesmo sentido: um lê todos os elementos, o outro só avança quando um elemento é mantido.`},{pt:`invariante de laço`,en:`loop invariant`,def:`Afirmação verdadeira antes de cada volta do laço que, no fim, garante que o resultado está certo.`,example:`The loop invariant is that xs[:write] holds exactly the kept elements.`},{pt:`no lugar`,en:`in place`,def:`Modificando a própria lista, com O(1) de memória extra.`,example:`Modify the input array in place with O(1) extra memory.`},{pt:`espaço de busca`,en:`search space`,def:`Conjunto de candidatos que ainda podem ser a resposta.`},{pt:`intercalar`,en:`merge`,def:`Juntar duas sequências ordenadas em uma só, também ordenada.`}],references:[`clrs`,`sedgewick-algs`,`mit-6006`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Na primeira lição deste módulo você inverteu uma lista e achou um par com soma alvo usando dois índices. Esse truque tem nome: **{{dois ponteiros|two pointers}}**. Aqui, {{ponteiro|pointer}} é só uma variável que guarda uma posição da lista.

Em vez de testar **todos os pares** com dois laços aninhados (O(n²)), você mantém dois índices que **nunca voltam atrás** e, a cada passo, descarta com segurança uma parte do problema. Como cada passo move pelo menos um índice, o total de passos é no máximo n (ou n + m, com duas listas): **O(n)**, quase sempre com **O(1) de memória extra**.

Quase todo problema desse tipo segue um de três padrões. Reconhecer o padrão é metade da solução; saber **por que** ele não perde respostas é a outra metade, e é o que o entrevistador vai perguntar em seguida.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:"### Os três padrões\n- **{{Ponteiros convergentes|converging pointers}}**: `i` começa no início, `j` no fim, e eles se aproximam.\n- **{{Leitor e escritor|read/write pointers}}**: os dois andam para a frente; `leitura` avança sempre, `escrita` só quando um elemento fica. Serve para filtrar a lista {{no lugar|in place}}, sem criar outra. Também é chamado de ponteiros rápido e lento (*fast and slow*).\n- **Duas sequências**: um índice em cada lista ordenada; a cada passo avança o que aponta para o menor, como ao {{intercalar|merge}} duas listas."},{type:`table`,head:[`Padrão`,`Como os índices andam`,`Problemas típicos`,`Custo`],rows:[[`Convergentes`,"`i` sobe, `j` desce, até `i >= j`",`inverter, palíndromo, soma alvo em lista ordenada, maior área`,`O(n) tempo, O(1) memória`],[`Leitor e escritor`,"`leitura` sobe a cada passo; `escrita` só quando algo fica",`remover duplicatas ou um valor, mover zeros, filtrar no lugar`,`O(n) tempo, O(1) memória`],[`Duas sequências`,`um índice em cada lista; avança o do menor`,`intercalar, interseção, comparar listas ordenadas`,`O(n + m) tempo`]],caption:`Em todos, cada passo move pelo menos um índice e nenhum volta: o número de passos é limitado pelo tamanho da entrada.`},{type:`md`,text:"### Por que o convergente não perde o par certo\nVolte à soma alvo numa lista **ordenada**. O {{invariante de laço|loop invariant}} é: *se existe um par com a soma pedida, ele está dentro do intervalo de i a j.* No começo (i = 0, j = n − 1) isso é óbvio. A cada passo:\n\n- Se `xs[i] + xs[j] < alvo`: para qualquer k entre i e j, `xs[k] <= xs[j]`, então `xs[i] + xs[k] <= xs[i] + xs[j] < alvo`. **Nenhum par com i dá certo**: descarte i (`i += 1`).\n- Se `xs[i] + xs[j] > alvo`: pelo mesmo raciocínio, nenhum par com j dá certo: descarte j (`j -= 1`).\n\nPense na tabela de todos os n² pares: cada passo risca uma linha ou uma coluna inteira do {{espaço de busca|search space}}. Por isso n passos bastam para examinar, sem olhar um por um, todos os pares.\n\n### O invariante do leitor e escritor\n`leitura` percorre todos os elementos; `escrita` marca onde vai o próximo elemento mantido. O invariante: **`xs[:escrita]` contém exatamente os elementos mantidos entre os já lidos, na ordem original**. Como `escrita <= leitura`, nunca sobrescrevemos algo que ainda não foi lido. No fim, `xs[:escrita]` é a resposta e o resto é sobra: quem chama usa só esse começo, ou corta com `del xs[escrita:]`. Tudo no lugar, sem lista auxiliar.\n\n### Duas sequências\nCom duas listas ordenadas, o menor elemento ainda não usado está sempre na frente de uma delas. Compare as duas frentes, consuma a menor e avance só aquele índice. Isso é **intercalar**, o coração do merge sort que você verá no Nível 4."},{type:`callout`,tone:`warn`,text:"O convergente da soma alvo **exige lista ordenada**: o argumento de descarte usa `xs[k] <= xs[j]`. Numa lista desordenada, ordenar antes custa O(n log n) e perde as posições originais; com um dicionário (assunto do módulo de tabelas hash), dá para resolver em O(n) em média.",title:`Confira a pré-condição`},{type:`callout`,tone:`info`,text:'No dia a dia, `[x for x in xs if x != 0]` é o jeito mais legível de filtrar: O(n) de tempo, mas O(n) de memória extra e uma lista **nova**. O leitor e escritor importa quando a memória é apertada, quando outros nomes apontam para a mesma lista (o que em inglês se chama *aliasing*) e quando a entrevista pede "in place". E fuja de remover itens de uma lista enquanto um `for` percorre essa mesma lista: o resultado sai errado (nos exercícios você vai ver por quê) e cada `remove` custa O(n).',title:`Compreensão de lista ou dois ponteiros?`}]},{stage:`exemplo`,blocks:[{type:`md`,text:"Um aplicativo de ônibus registrou, em ordem crescente, as linhas que passaram num ponto: `[107, 107, 175, 175, 175, 477, 702]`. Queremos as linhas **sem repetição**, na própria lista. Como ela está ordenada, as repetições estão juntas: basta comparar cada elemento com o **último mantido**, `xs[escrita - 1]`."},{type:`table`,head:[`leitura`,`xs[leitura]`,`último mantido`,`Ação`,`escrita depois`],rows:[[`1`,`107`,`107`,`repetido: só lê`,`1`],[`2`,`175`,`107`,`novo: xs[1] = 175`,`2`],[`3`,`175`,`175`,`repetido: só lê`,`2`],[`4`,`175`,`175`,`repetido: só lê`,`2`],[`5`,`477`,`175`,`novo: xs[2] = 477`,`3`],[`6`,`702`,`477`,`novo: xs[3] = 702`,`4`]],caption:`xs[0] sempre fica, então escrita começa em 1. Cada linha da tabela é uma volta do laço.`},{type:`trace`,code:`def compactar(xs):
    if not xs:
        return 0
    escrita = 1                        # xs[0] sempre fica
    for leitura in range(1, len(xs)):
        if xs[leitura] != xs[escrita - 1]:
            xs[escrita] = xs[leitura]
            escrita += 1
    return escrita                     # xs[:escrita] não tem repetição

linhas = [107, 107, 175, 175, 175, 477, 702]
k = compactar(linhas)
print(k, linhas[:k])`,caption:`Observe escrita ficar para trás de leitura a cada repetição. No fim, a lista inteira é [107, 175, 477, 702, 175, 477, 702]: o que vem depois de k é sobra.`}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`def intercalar(a, b):
    """Junta duas listas ordenadas numa nova lista ordenada: O(len(a) + len(b))."""
    i, j = 0, 0
    saida = []
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:          # <= mantém primeiro quem veio de a, nos empates
            saida.append(a[i])
            i += 1
        else:
            saida.append(b[j])
            j += 1
    saida.extend(a[i:])           # no máximo uma das duas sobras não é vazia
    saida.extend(b[j:])
    return saida

linha_107 = ["06:00", "06:40", "07:20", "08:00"]
linha_175 = ["06:15", "06:40", "07:45"]
print(intercalar(linha_107, linha_175))
print(intercalar([], [1, 2]), intercalar([3], []))`,runnable:!0,caption:`Horários de duas linhas no mesmo ponto, já ordenados, viram um quadro único. Strings no formato HH:MM, com zero à esquerda, comparam na ordem certa.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e3-2p-1`,kind:`mcq`,prompt:"Numa lanchonete, a lista `pedidos` usa `0` para pedido cancelado. Você precisa tirar os cancelados **da própria lista**, mantendo a ordem dos outros, em O(n) e com O(1) de memória extra. Qual abordagem cumpre tudo isso?",difficulty:`facil`,skills:[`ed-arrays`],hints:[`Para cada abordagem, pergunte: quanto tempo leva, quanta memória extra usa e se mantém a ordem.`,`Qual delas lê cada elemento uma vez e escreve no máximo uma vez, sem criar outra lista?`],explanation:"Leitor e escritor lê cada elemento uma vez e copia cada pedido válido no máximo uma vez para a frente: O(n) de tempo e só dois inteiros de memória extra. No fim, `del pedidos[escrita:]` corta a sobra.",options:[{text:"Percorrer com `for p in pedidos` e chamar `pedidos.remove(0)` sempre que achar um zero.",feedback:"Remover enquanto o `for` percorre a mesma lista faz o laço pular elementos, e cada `remove` desloca o resto da lista: O(n) por remoção, O(n²) no total."},{text:`Um índice de leitura que percorre tudo e um de escrita que só avança quando o pedido é válido; no fim, cortar o que sobrou depois da escrita.`,correct:!0,feedback:`Isso: é o padrão leitor e escritor. O(n) de tempo, O(1) de memória extra e a ordem é mantida.`},{text:"Criar `[p for p in pedidos if p != 0]` e usar essa nova lista.",feedback:`É O(n) e é a escolha mais legível no dia a dia, mas cria outra lista com todos os pedidos válidos: O(n) de memória extra, e quem guardava a lista original não vê a mudança.`},{text:`Ordenar a lista para juntar os zeros no começo e depois cortá-los.`,feedback:`Ordenar custa O(n log n) e destrói a ordem de chegada dos pedidos, que precisava ser mantida.`}]}},{type:`exercise`,exercise:{id:`e3-2p-2`,kind:`predict`,lang:`python`,prompt:"Alguém tentou tirar os pedidos cancelados (zeros) removendo dentro do `for`. O que é impresso?",difficulty:`intermediario`,skills:[`ed-arrays`,`prog-listas`],hints:["O `for` percorre a lista por posição: 0, 1, 2… O que acontece com as posições dos outros elementos quando um sai?","Anote a lista e a posição atual do `for` a cada volta. Lembre que `remove(0)` apaga o **primeiro** zero da lista, não necessariamente o que o `for` está olhando.",`O laço para quando a posição atual passa do fim da lista **atual**, que vai encolhendo.`],explanation:"Volta 1 (posição 0): p = 0, `remove` apaga o primeiro zero → [0, 5, 0, 7]. Volta 2 (posição 1): p = 5, nada. Volta 3 (posição 2): p = 0, e `remove` apaga o primeiro zero da lista, que é o que tinha sido pulado → [5, 0, 7]. Volta 4: a posição 3 não existe mais, fim. Um zero sobreviveu. O padrão leitor e escritor resolve isso em uma passada.",code:`pedidos = [0, 0, 5, 0, 7]
for p in pedidos:
    if p == 0:
        pedidos.remove(p)
print(pedidos)`,answer:`[5, 0, 7]`}},{type:`exercise`,exercise:{id:`e3-2p-3`,kind:`code`,lang:`python`,prompt:"Escreva `mover_zeros(xs)` que leva todos os zeros para o **fim** da lista, mantendo a ordem relativa dos outros valores: `[0, 3, 0, 5, 7]` vira `[3, 5, 7, 0, 0]`. Modifique **a própria lista** (não devolva outra), em O(n) e com O(1) de memória extra: sem listas ou outras estruturas auxiliares, fatias (`xs[a:b]`) ou compreensões, e sem `sort`, `sorted`, `remove`, `insert`, `pop`, `append` ou `del`.",difficulty:`intermediario`,skills:[`ed-arrays`],hints:[`Que padrão da lição percorre a lista uma vez e mantém só alguns elementos, na ordem?`,`Depois que todos os valores diferentes de zero estiverem compactados no começo, o que deve ir nas posições restantes?`,"Um índice `leitura` passa por tudo; um índice `escrita` diz onde vai o próximo valor diferente de zero. Quando `leitura` termina, o que `escrita` está marcando?"],explanation:"Leitor e escritor: cada valor diferente de zero é copiado para `xs[escrita]`, e depois as posições de `escrita` até o fim recebem 0. Cada elemento é lido uma vez e cada posição recebe no máximo uma escrita: O(n), com dois inteiros de memória extra. A ordem relativa se mantém porque `escrita` nunca passa à frente de `leitura`. Uma alternativa equivalente é trocar `xs[escrita]` com `xs[leitura]` em vez de copiar.",starter:`def mover_zeros(xs):
    # leve os zeros para o fim, mantendo a ordem dos outros valores.
    # modifique a própria lista xs, sem criar outra
    pass`,solution:`def mover_zeros(xs):
    escrita = 0
    for leitura in range(len(xs)):
        if xs[leitura] != 0:
            xs[escrita] = xs[leitura]
            escrita += 1
    for i in range(escrita, len(xs)):
        xs[i] = 0`,tests:[{name:`exemplo`,code:`xs = [0, 3, 0, 5, 7]
mover_zeros(xs)
assert xs == [3, 5, 7, 0, 0], f"esperado [3, 5, 7, 0, 0], a lista ficou {xs}"`},{name:`mantém a ordem dos outros`,code:`xs = [4, 0, 1, 0, 3, 12]
mover_zeros(xs)
assert xs == [4, 1, 3, 12, 0, 0], f"a ordem dos valores diferentes de zero precisa ser mantida: esperado [4, 1, 3, 12, 0, 0], ficou {xs}"
ys = [-1, 0, -2, 0, 5]
mover_zeros(ys)
assert ys == [-1, -2, 5, 0, 0], f"negativos também ficam (só o zero vai para o fim): ficou {ys}"`},{name:`casos de borda`,code:`for antes, depois in [([], []), ([0], [0]), ([7], [7]), ([0, 0, 0], [0, 0, 0]), ([1, 2, 3], [1, 2, 3]), ([0, 1], [1, 0])]:
    xs = list(antes)
    mover_zeros(xs)
    assert xs == depois, f"mover_zeros({antes}) deveria deixar {depois}; ficou {xs}"`},{name:`modifica a própria lista`,code:`xs = [0, 1, 0, 2]
ident = id(xs)
mover_zeros(xs)
assert id(xs) == ident and xs == [1, 2, 0, 0], f"altere a lista recebida (xs[i] = ...): quem chamou continua olhando para ela. Ficou {xs}"`},{name:`sem atalhos nem lista auxiliar`,code:`import ast
proibidos = {"sorted", "sort", "remove", "insert", "pop", "append", "extend", "count", "copy", "list", "tuple", "dict", "set", "deque", "filter", "index"}
usados = set()
# só o código das funções: testes soltos no fim do arquivo, como mover_zeros([0, 1]), não contam
funcoes = [f for f in ast.walk(ast.parse(_source)) if isinstance(f, (ast.FunctionDef, ast.Lambda))]
for no in (n for f in funcoes for n in ast.walk(f)):
    if isinstance(no, ast.Call):
        nome = no.func.id if isinstance(no.func, ast.Name) else getattr(no.func, "attr", "")
        if nome in proibidos:
            usados.add(nome)
    if isinstance(no, ast.Delete):
        usados.add("del")
    if isinstance(no, (ast.ListComp, ast.GeneratorExp, ast.SetComp, ast.DictComp)):
        usados.add("compreensão")
    if isinstance(no, ast.List):
        usados.add("lista auxiliar [...]")
    if isinstance(no, (ast.Dict, ast.Set)):
        usados.add("dicionário ou conjunto auxiliar")
    if isinstance(no, ast.Slice):
        usados.add("fatia xs[a:b]")
assert not usados, f"resolva só com índices e atribuições (xs[i] = ...): outra estrutura ou uma fatia gasta O(n) de memória extra. Evite: {', '.join(sorted(usados))}"`},{name:`O(n) passos com os zeros no começo`,code:`import sys

class _Demais(BaseException):
    pass

def _contar_linhas(f, arg, limite):
    passos = [0]
    def rastro(frame, evento, _):
        if frame.f_code.co_filename != "main.py":
            return None
        if evento == "line":
            passos[0] += 1
            if passos[0] > limite:
                raise _Demais()
        return rastro
    sys.settrace(rastro)
    try:
        f(arg)
    except _Demais:
        pass
    finally:
        sys.settrace(None)
    return passos[0]

xs = [0] * 500 + list(range(1, 501))
limite = 20 * len(xs)
passos = _contar_linhas(mover_zeros, xs, limite)
assert passos <= limite, f"com 500 zeros no começo de uma lista de 1 000, seu código executou mais de {limite} linhas: parece O(n²) (procurar o próximo valor ou deslocar a lista a cada zero). Com dois índices que só andam para a frente, cada elemento é visitado uma vez."
assert xs == list(range(1, 501)) + [0] * 500, "resultado errado com 500 zeros no começo de uma lista de 1 000 elementos"`},{name:`poucas escritas (O(n))`,code:`class ContaEscritas(list):
    def __init__(self, valores):
        super().__init__(valores)
        self.escritas = 0
    def __setitem__(self, i, v):
        self.escritas += 1
        super().__setitem__(i, v)
valores = [0 if i % 2 == 0 else i for i in range(1000)]
esperado = [x for x in valores if x != 0] + [0] * 500
xs = ContaEscritas(valores)
mover_zeros(xs)
assert list(xs) == esperado, "resultado errado numa lista de 1 000 elementos com 500 zeros"
assert xs.escritas <= 2 * len(xs), f"foram {xs.escritas} escritas numa lista de 1 000 elementos: parece que você desloca a lista a cada zero (O(n²)). Cada posição deveria ser escrita no máximo duas vezes."`}]}},{type:`exercise`,exercise:{id:`e3-2p-4`,kind:`code`,lang:`python`,prompt:'Escreva `eh_palindromo(frase)` que diz se a frase se lê igual nos dois sentidos, **ignorando** tudo que não for letra ou dígito e sem diferenciar maiúsculas de minúsculas: `"A base do teto desaba"` dá `True`. Letras acentuadas são letras como as outras (`"ô"` e `"o"` são caracteres diferentes). Use O(1) de memória extra: compare direto na frase original, um caractere por vez, com dois ponteiros convergentes que pulam o que não interessa. Nada de montar uma frase limpa, chamar `lower()` na frase inteira, fatiar, `[::-1]`, `reversed`, `join` ou compreensões.',difficulty:`intermediario`,skills:[`ed-arrays`,`prog-strings`],hints:[`Onde começam os dois índices? Quando o laço pode parar com certeza de que é palíndromo?`,"Se o caractere em `i` não é letra nem dígito, o que fazer com `i`, sem mexer em `j`? E o contrário?","`str.isalnum()` diz se um caractere é letra ou dígito, e `str.lower()` ajuda a comparar sem diferenciar maiúsculas. Em cada volta, faça só uma coisa: pular em `i`, pular em `j` ou comparar."],explanation:'Com `i` no começo e `j` no fim: se `frase[i]` não é alfanumérico, avance `i`; se `frase[j]` não é, recue `j`; senão compare em minúsculas e, se forem iguais, mova os dois. Cada volta move pelo menos um índice: O(n) de tempo e O(1) de memória, enquanto limpar a frase e comparar com `[::-1]` cria duas cópias dela. Curiosidade: "Socorram-me, subi no ônibus em Marrocos" só é palíndromo se você também tirar os acentos, porque "o" e "ô" são caracteres diferentes.',starter:`def eh_palindromo(frase):
    # i no começo, j no fim; pule o que não for letra ou dígito
    # e compare sem diferenciar maiúsculas de minúsculas
    pass`,solution:`def eh_palindromo(frase):
    i, j = 0, len(frase) - 1
    while i < j:
        if not frase[i].isalnum():
            i += 1
        elif not frase[j].isalnum():
            j -= 1
        elif frase[i].lower() != frase[j].lower():
            return False
        else:
            i += 1
            j -= 1
    return True`,tests:[{name:`frases palíndromas`,code:`for f in ["A base do teto desaba", "Anotaram a data da maratona", "Roma, me tem amor!", "A (torre) da derrota;", "\\"Ovo\\": ovo"]:
    assert eh_palindromo(f) is True, f"{f!r} é palíndromo quando ignoramos espaços, pontuação e maiúsculas"`},{name:`não palíndromos`,code:`for f in ["Alicerce", "ab", "Ovo frito", "abca"]:
    assert eh_palindromo(f) is False, f"{f!r} não é palíndromo"
f = "Socorram-me, subi no ônibus em Marrocos"
assert eh_palindromo(f) is False, f"{f!r}: \\"ô\\" é letra (não pode ser ignorada) e é um caractere diferente de \\"o\\", então sem tirar acentos não é palíndromo. Use str.isalnum() para decidir o que é letra ou dígito."`},{name:`casos de borda`,code:`for f in ["", "a", "!!", "Aa", " ,a. "]:
    assert eh_palindromo(f) is True, f"{f!r} deveria dar True (vazio, um caractere ou só pontuação contam como palíndromo)"`},{name:`dígitos contam`,code:`assert eh_palindromo("12321") is True, "dígitos são comparados como letras"
assert eh_palindromo("1231") is False, "\\"1231\\" não é palíndromo: os dígitos não podem ser ignorados"
assert eh_palindromo("A1b-2B1a") is True, "\\"A1b-2B1a\\" é palíndromo: compare letras e dígitos, sem diferenciar maiúsculas"`},{name:`sem inverter nem montar outra frase`,code:`import ast

def _monta_texto(no):
    lados = [no.target, no.value] if isinstance(no, ast.AugAssign) else [no.left, no.right]
    for x in lados:
        if isinstance(x, (ast.Subscript, ast.JoinedStr)):
            return True
        if isinstance(x, ast.Constant) and isinstance(x.value, str):
            return True
        if isinstance(x, ast.Call) and getattr(x.func, "attr", "") in {"lower", "upper", "casefold"}:
            return True
    return False

achados = set()
# só o código das funções: testes soltos no fim do arquivo não contam
funcoes = [f for f in ast.walk(ast.parse(_source)) if isinstance(f, (ast.FunctionDef, ast.Lambda))]
for no in (n for f in funcoes for n in ast.walk(f)):
    if isinstance(no, ast.Call):
        nome = no.func.id if isinstance(no.func, ast.Name) else getattr(no.func, "attr", "")
        if nome in {"reversed", "reverse", "join", "list", "sorted", "filter", "map", "sub", "findall"}:
            achados.add(nome)
    if isinstance(no, ast.Slice):
        achados.add("fatia")
    if isinstance(no, (ast.ListComp, ast.GeneratorExp, ast.SetComp, ast.DictComp)):
        achados.add("compreensão")
    if isinstance(no, (ast.AugAssign, ast.BinOp)) and isinstance(no.op, ast.Add) and _monta_texto(no):
        achados.add("montar outra string com +")
assert not achados, f"use dois índices sobre a própria frase, sem criar outra; evite: {', '.join(sorted(achados))}"`},{name:`direto na frase original`,code:`class Frase(str):
    usos = set()
    def __iter__(self):
        Frase.usos.add("for sobre a frase")
        return super().__iter__()
    def __getitem__(self, k):
        if isinstance(k, slice):
            Frase.usos.add("fatia")
        return super().__getitem__(k)
    def __str__(self):
        Frase.usos.add("str(frase)")
        return super().__str__()
    def lower(self):
        Frase.usos.add("frase.lower()")
        return super().lower()
    def upper(self):
        Frase.usos.add("frase.upper()")
        return super().upper()
    def casefold(self):
        Frase.usos.add("frase.casefold()")
        return super().casefold()
    def replace(self, *args):
        Frase.usos.add("frase.replace()")
        return super().replace(*args)
    def translate(self, *args):
        Frase.usos.add("frase.translate()")
        return super().translate(*args)
    def split(self, *args):
        Frase.usos.add("frase.split()")
        return super().split(*args)

for texto, esperado in [("A base do teto desaba", True), ("Roma, me tem amor!", True), ("Alicerce", False)]:
    Frase.usos = set()
    r = eh_palindromo(Frase(texto))
    assert not Frase.usos, f"compare a frase original caractere por caractere (frase[i], frase[j]), sem percorrê-la inteira nem copiá-la: a meta é O(1) de memória extra. Evite: {', '.join(sorted(Frase.usos))}"
    assert r is esperado, f"eh_palindromo({texto!r}) deveria dar {esperado}; veio {r}"`}]}},{type:`exercise`,exercise:{id:`e3-2p-5`,kind:`parsons`,lang:`python`,prompt:"As listas `a` e `b` têm as matrículas dos alunos inscritos na monitoria de Cálculo e na de Programação, cada uma **ordenada e sem repetição**. Ordene as linhas de `intersecao(a, b)`, que devolve quem está nas duas, em O(len(a) + len(b)).",difficulty:`intermediario`,skills:[`ed-arrays`],hints:["Se `a[i]` é menor que `b[j]`, `a[i]` ainda pode aparecer em `b` mais adiante? Qual índice deve andar?",`Só quando as duas frentes são iguais há um aluno comum. O que acontece com os dois índices nesse caso?`],explanation:"É o padrão de duas sequências: a frente menor não aparece no resto da outra lista (que só tem valores maiores), então pode ser descartada. Quando as frentes são iguais, o valor entra no resultado e os dois índices avançam. Cada volta avança pelo menos um índice: O(len(a) + len(b)), contra O(len(a) × len(b)) de testar `x in b` para cada x.",lines:[`def intersecao(a, b):`,`    i, j, comuns = 0, 0, []`,`    while i < len(a) and j < len(b):`,`        if a[i] < b[j]:`,`            i += 1`,`        elif a[i] > b[j]:`,`            j += 1`,`        else:`,`            comuns.append(a[i])`,`            i, j = i + 1, j + 1`,`    return comuns`]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e3-2p-desafio`,kind:`code`,lang:`python`,prompt:"Numa obra, tábuas verticais estão fincadas em linha reta, a 1 metro uma da outra; `alturas[i]` é a altura da tábua i. Escolhendo duas tábuas i < j, dá para represar água entre elas (as tábuas do meio não atrapalham): a área, vista de frente, é `(j - i) * min(alturas[i], alturas[j])`. Escreva `maior_area(alturas)` que devolve a maior área possível (0 se houver menos de duas tábuas) em **O(n)**: sem testar todos os pares e sem ordenar (ordenar já custaria O(n log n)).",difficulty:`desafio`,skills:[`ed-arrays`],hints:[`Comece com as duas tábuas das pontas: é o par mais largo. Para achar algo melhor você vai ter que estreitar. Qual das duas pontas vale a pena trocar?`,`Suponha que a tábua da esquerda é a mais baixa das duas. Qualquer par que use essa tábua com outra mais para dentro tem largura menor; e a altura desse par fica limitada por quem?`,`Se nenhum par com aquela tábua pode superar a área atual, ela pode ser descartada para sempre. É o mesmo argumento de descarte da soma alvo.`,"E se as duas pontas tiverem a mesma altura? Teste sua ideia com `[4, 3, 2, 1, 4]`."],explanation:"Com i e j nas pontas, suponha `alturas[i] <= alturas[j]`. Todo par (i, k) com i < k < j tem largura menor que j − i e altura no máximo `alturas[i]`, então uma área que não supera a atual. Logo i não participa de nenhum par melhor ainda não visto e pode ser descartado; o caso simétrico descarta j, e no empate qualquer um serve. Cada passo descarta uma tábua: n − 1 passos, O(n) de tempo e O(1) de memória, contra os n(n − 1)/2 pares da força bruta.",starter:`def maior_area(alturas):
    # comece com uma tábua em cada ponta e descarte uma por passo
    pass`,solution:`def maior_area(alturas):
    i, j = 0, len(alturas) - 1
    melhor = 0
    while i < j:
        area = (j - i) * min(alturas[i], alturas[j])
        if area > melhor:
            melhor = area
        if alturas[i] <= alturas[j]:
            i += 1
        else:
            j -= 1
    return melhor`,tests:[{name:`exemplo clássico`,code:`r = maior_area([1, 8, 6, 2, 5, 4, 8, 3, 7])
assert r == 49, f"o melhor par é a tábua 1 (altura 8) com a 8 (altura 7): 7 × 7 = 49; veio {r}"`},{name:`menos de duas tábuas`,code:`assert maior_area([]) == 0, "sem tábuas, a área é 0"
assert maior_area([5]) == 0, "com uma tábua só não dá para represar: 0"`},{name:`pares pequenos`,code:`for h, esperado in [([3, 3], 3), ([0, 0], 0), ([1, 2, 1], 2), ([1, 9, 9, 1], 9)]:
    r = maior_area(h)
    assert r == esperado, f"maior_area({h}) deveria ser {esperado}; veio {r}"`},{name:`empates e pontas`,code:`for h, esperado in [([4, 3, 2, 1, 4], 16), ([6, 1, 1, 1, 1, 1, 1, 9, 9], 48), ([2, 3, 10, 5, 7, 8, 9], 36)]:
    r = maior_area(h)
    assert r == esperado, f"maior_area({h}) deveria ser {esperado}; veio {r}"`},{name:`não altera a entrada`,code:`h = [3, 1, 2, 5]
copia = h[:]
maior_area(h)
assert h == copia, "não modifique a lista de alturas: as posições das tábuas importam"`},{name:`sem testar todos os pares (O(n))`,code:`import sys

class _Demais(BaseException):
    pass

def _contar_linhas(f, arg, limite):
    passos = [0]
    resultado = [None]
    def rastro(frame, evento, _):
        if frame.f_code.co_filename != "main.py":
            return None
        if evento == "line":
            passos[0] += 1
            if passos[0] > limite:
                raise _Demais()
        return rastro
    sys.settrace(rastro)
    try:
        resultado[0] = f(arg)
    except _Demais:
        pass
    finally:
        sys.settrace(None)
    return passos[0], resultado[0]

casos = [
    ("alturas sorteadas", [(i * 7919 + 13) % 1009 for i in range(1000)], 965264),
    ("alturas em forma de montanha", [1000 - abs(500 - i) * 2 for i in range(1000)], 250000),
]
for nome, alturas, esperado in casos:
    limite = 30 * len(alturas)
    passos, r = _contar_linhas(maior_area, alturas, limite)
    assert passos <= limite, f"com 1 000 tábuas ({nome}), maior_area executou mais de {limite} linhas: isso é testar quase todos os pares (O(n²)), mesmo que você pule alguns. Descarte uma tábua por passo."
    assert r == esperado, f"resultado errado com 1 000 tábuas ({nome}): esperado {esperado}, veio {r}"`},{name:`sem ordenar`,code:`import ast
achados = set()
funcoes = [f for f in ast.walk(ast.parse(_source)) if isinstance(f, (ast.FunctionDef, ast.Lambda))]
for no in (n for f in funcoes for n in ast.walk(f)):
    if isinstance(no, ast.Call):
        nome = no.func.id if isinstance(no.func, ast.Name) else getattr(no.func, "attr", "")
        if nome in {"sorted", "sort"}:
            achados.add(nome)
assert not achados, f"ordenar já custa O(n log n) e o pedido é O(n); evite: {', '.join(sorted(achados))}"`}]}}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Dois ponteiros: dois índices que nunca voltam; O(n) em vez de O(n²) pares, quase sempre com O(1) de memória.
- **Convergentes**: um em cada ponta. Correção pelo descarte: cada passo elimina uma linha ou coluna inteira de pares. A soma alvo exige lista ordenada.
- **Leitor e escritor**: \`xs[:escrita]\` guarda os elementos mantidos, na ordem. Filtra no lugar.
- **Duas sequências**: avance a frente menor; intercalar e interseção em O(n + m).
- Não remova itens de uma lista dentro de um \`for\` sobre ela.`},{type:`callout`,tone:`english`,text:`- **two pointers**: dois ponteiros
- **in place / in-place**: no lugar
- **loop invariant**: invariante de laço
- **to merge**: intercalar
- **search space**: espaço de busca

Frase típica de enunciado: *"Do this in-place with O(1) extra memory."*

Frase típica de entrevista: *"Since the array is sorted, I use two pointers: if the sum is too small, I move the left pointer right; if it's too large, I move the right pointer left. Each step discards one candidate, so it runs in O(n) time."*`,title:`English corner`}]}],cards:[{id:`l3-dois-ponteiros#1`,front:`Na soma alvo com dois ponteiros convergentes (lista ordenada), se xs[i] + xs[j] < alvo, por que é seguro descartar i?`,back:`Porque xs[i] somado a qualquer elemento até j dá no máximo xs[i] + xs[j], que já é pequeno demais: nenhum par com i ainda pode dar certo.`},{id:`l3-dois-ponteiros#2`,front:`Qual é o invariante do padrão leitor e escritor?`,back:`xs[:escrita] contém exatamente os elementos mantidos entre os já lidos, na ordem original (e escrita nunca passa de leitura).`},{id:`l3-dois-ponteiros#3`,front:`O que dá errado ao remover itens de uma lista dentro de um for sobre ela?`,back:`Os elementos seguintes se deslocam para a esquerda e o for avança a posição, então alguns são pulados; além disso, cada remove custa O(n).`},{id:`l3-dois-ponteiros#4`,front:`Qual o custo de intercalar duas listas ordenadas de tamanhos n e m, e por quê?`,back:`O(n + m): cada passo coloca um elemento na saída e nenhum índice volta.`},{id:`l3-dois-ponteiros#5`,front:`No problema da maior área, qual tábua você descarta a cada passo e por quê?`,back:`A mais baixa das duas pontas: qualquer par dela com uma tábua mais interna é mais estreito e tem altura limitada por ela, então não supera a área atual.`},{id:`l3-dois-ponteiros#6`,front:`Por que dois ponteiros é O(n) e não O(n²)?`,back:`Cada passo move pelo menos um índice, sempre no mesmo sentido; o total de passos é limitado pelo tamanho da entrada.`}]};export{e as default};
//# sourceMappingURL=l3-dois-ponteiros-DIVeyesw.js.map