var e={id:`l14-discreta`,moduleId:`m14-3`,title:`Indução, invariantes, recorrências, grafos e aritmética modular`,titleEn:`Induction, invariants, recurrences, graphs and modular arithmetic`,summary:`As ferramentas para provar que um algoritmo está certo, calcular quanto ele custa e trabalhar com os números da criptografia.`,minutes:55,objectives:[`Escrever uma prova por indução simples`,`Usar um invariante de laço para justificar a corretude de um algoritmo`,`Resolver recorrências comuns e aplicar o Teorema Mestre`,`Usar aritmética modular e exponenciação rápida`],skills:[`mat-discreta`],terms:[{pt:`indução matemática`,en:`mathematical induction`,def:`Provar P(0) e que P(k) implica P(k+1); então P vale para todo n.`},{pt:`invariante de laço`,en:`loop invariant`,def:`Propriedade verdadeira antes e depois de cada volta do laço.`},{pt:`relação de recorrência`,en:`recurrence relation`,def:`Equação que define T(n) em termos de valores menores, como T(n) = 2T(n/2) + n.`},{pt:`Teorema Mestre`,en:`Master Theorem`,def:`Fórmula pronta para recorrências de divisão e conquista.`},{pt:`grafo bipartido`,en:`bipartite graph`,def:`Grafo cujos vértices se dividem em dois grupos, com arestas só entre grupos.`},{pt:`aritmética modular`,en:`modular arithmetic`,def:`Contas "no relógio": só importa o resto da divisão por m.`},{pt:`exponenciação rápida`,en:`exponentiation by squaring`,def:`Calcular b^e em O(log e) multiplicações.`}],references:[`mit-6042`,`rosen-discrete`,`clrs`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Testes mostram que um programa funciona **nos casos testados**. Matemática discreta permite afirmar que ele funciona **em todos os casos**, e calcular quanto custa sem rodar. Indução é o "laço" das provas: prove o primeiro caso e que cada caso garante o próximo.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`### Indução

Afirmação: 1 + 3 + 5 + … + (2n − 1) = n².
- **Base**: n = 1 → 1 = 1². ✓
- **Passo**: suponha que vale para k (hipótese de indução). Então 1 + … + (2k − 1) + (2k + 1) = k² + 2k + 1 = (k + 1)². ✓

### Invariantes de laço

Para provar que \`maximo(lista)\` está certo: **invariante** "antes da volta i, \`m\` é o maior entre \`lista[0..i-1]\`". Vale no início, cada volta mantém, e ao final (i = n) diz exatamente o que queremos. É indução aplicada a um laço; é também como se raciocina sobre busca binária sem errar os índices.

### Recorrências

- Busca binária: T(n) = T(n/2) + 1 → **O(log n)**.
- Merge sort: T(n) = 2T(n/2) + n → **O(n log n)**.
- Torre de Hanói: T(n) = 2T(n − 1) + 1 → **2ⁿ − 1** (exponencial!).

**Teorema Mestre** para T(n) = a·T(n/b) + O(n^d): compare d com log_b(a).
Se d > log_b a → O(n^d); se d = log_b a → O(n^d log n); se d < log_b a → O(n^(log_b a)).

### Grafos

Vértices e arestas modelam redes, dependências, mapas. Fatos úteis: a soma dos graus é 2 × arestas; uma árvore com n vértices tem n − 1 arestas; um grafo é **bipartido** se e só se não tem ciclo ímpar (dá para testar colorindo com duas cores numa BFS).

### Aritmética modular

(a + b) mod m = ((a mod m) + (b mod m)) mod m, e o mesmo vale para a multiplicação. Isso permite calcular 7^1000 mod 13 sem números gigantes. **Exponenciação rápida**: b^e = (b^(e/2))² se e é par, b·b^(e−1) se é ímpar → O(log e) multiplicações. É a operação central do RSA e do Diffie-Hellman.`}]},{stage:`exemplo`,blocks:[{type:`code`,lang:`python`,code:`# Testando (não provando!) a fórmula para muitos n — útil para achar erros antes de tentar provar
print(all(sum(2 * i - 1 for i in range(1, n + 1)) == n * n for n in range(1, 500)))

def hanoi(n, origem="A", destino="C", aux="B", movimentos=None):
    if movimentos is None:
        movimentos = []
    if n > 0:
        hanoi(n - 1, origem, aux, destino, movimentos)
        movimentos.append((origem, destino))
        hanoi(n - 1, aux, destino, origem, movimentos)
    return movimentos

for n in range(1, 8):
    print(n, "discos:", len(hanoi(n)), "movimentos; 2^n - 1 =", 2**n - 1)`,runnable:!0}]},{stage:`codigo`,blocks:[{type:`trace`,code:`def maximo(lista):
    m = lista[0]
    # invariante: m é o maior de lista[0..i-1]
    for i in range(1, len(lista)):
        if lista[i] > m:
            m = lista[i]
    return m

print(maximo([3, 9, 2, 11, 5]))`,caption:`Acompanhe passo a passo e confira o invariante a cada volta.`},{type:`code`,lang:`python`,code:`print(pow(7, 1000, 13))        # Python já tem exponenciação modular rápida
print((123456789 * 987654321) % 97 == ((123456789 % 97) * (987654321 % 97)) % 97)`,runnable:!0}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e14-disc-0`,kind:`mcq`,prompt:`Numa prova por indução, o que se precisa mostrar no **passo indutivo**?`,difficulty:`facil`,skills:[`mat-discreta`],hints:[`A base cuida do primeiro caso. O passo liga cada caso ao seguinte.`],explanation:`Que, **supondo** P(k) verdadeira (hipótese de indução), P(k + 1) também é. Junto com a base, isso cobre todos os n, como dominós em fila.`,options:[{text:`Que P(n) vale para n = 0, 1 e 2`,feedback:`Exemplos não provam o caso geral.`},{text:`Que se P(k) vale, então P(k + 1) vale`,correct:!0,feedback:`Isso: cada dominó derruba o próximo.`},{text:`Que P(k + 1) implica P(k)`,feedback:`É a direção contrária.`},{text:`Que P(n) vale para um n bem grande`,feedback:`Um caso, por maior que seja, não prova todos.`}]}},{type:`exercise`,exercise:{id:`e14-disc-1`,kind:`code`,lang:`python`,prompt:"Implemente `pot_mod(b, e, m)` com **exponenciação rápida** (sem usar `pow` nem `**` com o expoente inteiro), devolvendo b^e mod m.",difficulty:`intermediario`,skills:[`mat-discreta`],hints:[`Percorra os bits de e: enquanto e > 0, se e é ímpar multiplique o resultado por b.`,`A cada volta, b = b * b % m e e = e // 2.`,`Reduza módulo m a cada multiplicação para os números não crescerem.`],explanation:`Com e de 2048 bits, são cerca de 2048 voltas em vez de 2²⁰⁴⁸ multiplicações. O invariante é: resultado × b^e ≡ valor procurado (mod m).`,starter:`def pot_mod(b, e, m):
    pass
`,solution:`def pot_mod(b, e, m):
    resultado = 1 % m
    b %= m
    while e > 0:
        if e % 2 == 1:
            resultado = resultado * b % m
        b = b * b % m
        e //= 2
    return resultado
`,tests:[{name:`valores`,code:`assert pot_mod(7, 1000, 13) == pow(7, 1000, 13)
assert pot_mod(2, 10, 1000) == 24
assert pot_mod(5, 0, 7) == 1`},{name:`grande`,code:`assert pot_mod(123456789, 10**18, 1_000_000_007) == pow(123456789, 10**18, 1_000_000_007)`},{name:`sem pow`,code:`assert "pow(" not in _source and "**" not in _source, "implemente sem pow() e sem **"`}]}},{type:`exercise`,exercise:{id:`e14-disc-2`,kind:`mcq`,prompt:`Pelo Teorema Mestre, qual a complexidade de T(n) = 4·T(n/2) + n?`,difficulty:`avancado`,skills:[`mat-discreta`],hints:[`a = 4, b = 2, d = 1. Calcule log₂ 4.`,`Compare d com log_b a.`],explanation:`log₂ 4 = 2 > d = 1, então domina o número de subproblemas: **O(n²)**. (É o custo da multiplicação de inteiros "escolar" feita por divisão e conquista ingênua.)`,options:[{text:`O(n log n)`,feedback:`Seria o caso d = log_b a, como no merge sort (a = 2).`},{text:`O(n²)`,correct:!0,feedback:`Isso: log₂ 4 = 2 > 1.`},{text:`O(n)`,feedback:`Seria se d > log_b a.`},{text:`O(2ⁿ)`,feedback:`Recorrências que dividem n por uma constante não ficam exponenciais.`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e14-disc-desafio`,kind:`code`,lang:`python`,prompt:'Escreva `bipartido(grafo)` que recebe um grafo não dirigido como dicionário de listas de adjacência\n(`{"a": ["b"], "b": ["a"]}`) e devolve `True` se ele for bipartido. O grafo pode ter **várias componentes**.',difficulty:`desafio`,skills:[`mat-discreta`],hints:[`Faça uma BFS colorindo cada vizinho com a cor oposta (0/1).`,`Se encontrar um vizinho já colorido com a mesma cor, não é bipartido.`,`Repita a BFS a partir de cada vértice ainda sem cor (componentes separadas).`],explanation:`A coloração por BFS é uma prova construtiva: ou produz a divisão em dois grupos, ou encontra uma aresta entre vértices de mesma cor, que fecha um ciclo ímpar. Aplicações: escalas de horários, emparelhamentos, detecção de conflitos.`,starter:`from collections import deque

def bipartido(grafo):
    return True
`,solution:`from collections import deque

def bipartido(grafo):
    cor = {}
    for inicio in grafo:
        if inicio in cor:
            continue
        cor[inicio] = 0
        fila = deque([inicio])
        while fila:
            v = fila.popleft()
            for w in grafo[v]:
                if w not in cor:
                    cor[w] = 1 - cor[v]
                    fila.append(w)
                elif cor[w] == cor[v]:
                    return False
    return True`,tests:[{name:`quadrado`,code:`g = {"a": ["b", "d"], "b": ["a", "c"], "c": ["b", "d"], "d": ["c", "a"]}
assert bipartido(g)`},{name:`triângulo`,code:`g = {1: [2, 3], 2: [1, 3], 3: [1, 2]}
assert not bipartido(g)`},{name:`duas componentes`,code:`g = {1: [2], 2: [1], 3: [4, 5], 4: [3, 5], 5: [3, 4]}
assert not bipartido(g)`},{name:`vértice isolado`,code:`assert bipartido({"x": []})`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:`**Mini-projeto**: escolha três algoritmos que você já escreveu na trilha (por exemplo, busca binária, merge sort e BFS). Para cada um, escreva em comentários o **invariante** do laço principal e a **recorrência** do custo, e confira empiricamente contando operações para n = 1 000, 10 000 e 100 000.`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Indução: base + passo (P(k) ⇒ P(k+1)).
- Invariante de laço: vale antes, é mantido, e no fim dá o resultado.
- Recorrências: T(n/2)+1 → log n; 2T(n/2)+n → n log n; 2T(n−1)+1 → 2ⁿ.
- Teorema Mestre: compare d com log_b a.
- Grafo bipartido ⇔ sem ciclo ímpar; teste com BFS e duas cores.
- Aritmética modular + exponenciação rápida = base do RSA.`}]}],cards:[{id:`l14-discreta#1`,front:`Quais as duas partes de uma prova por indução?`,back:`O caso base e o passo indutivo (P(k) implica P(k+1)).`},{id:`l14-discreta#2`,front:`O que é um invariante de laço?`,back:`Uma propriedade verdadeira antes e depois de cada iteração, usada para provar que o laço produz o resultado certo.`},{id:`l14-discreta#3`,front:`Solução de T(n) = 2T(n/2) + n?`,back:`O(n log n).`},{id:`l14-discreta#4`,front:`Como testar se um grafo é bipartido?`,back:`Colorir com duas cores numa BFS; se uma aresta liga vértices de mesma cor, não é.`},{id:`l14-discreta#5`,front:`Quantas multiplicações a exponenciação rápida faz?`,back:`O(log e), uma ou duas por bit do expoente.`}]};export{e as default};
//# sourceMappingURL=l14-discreta-Dju0jkdk.js.map