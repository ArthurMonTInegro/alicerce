var e={id:`l3-arvores`,moduleId:`m3-4`,title:`Árvores e árvores binárias de busca`,titleEn:`Trees and binary search trees`,summary:`Estruturas hierárquicas, percursos e a BST, que busca em O(log n) quando balanceada.`,minutes:35,objectives:[`Usar o vocabulário de árvores (raiz, folha, altura)`,`Implementar inserção e busca em BST`,`Fazer percursos em ordem, pré e pós-ordem`,`Entender por que o balanceamento importa`],skills:[`ed-arvores`],terms:[{pt:`árvore`,en:`tree`,def:`Estrutura hierárquica de nós ligados, sem ciclos.`},{pt:`nó`,en:`node`,def:`Cada elemento da árvore.`},{pt:`raiz`,en:`root`,def:`O nó do topo, sem pai.`},{pt:`folha`,en:`leaf`,def:`Nó sem filhos.`},{pt:`altura`,en:`height`,def:`Maior número de arestas da raiz até uma folha.`},{pt:`árvore binária de busca`,en:`binary search tree (BST)`,def:`Árvore em que, para cada nó, à esquerda ficam menores e à direita maiores.`},{pt:`percurso`,en:`traversal`,def:`Forma de visitar todos os nós.`}],references:[`clrs`,`sedgewick-algs`,`mit-6006`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Uma **{{árvore|tree}}** organiza dados de forma **hierárquica**: pastas do computador, o DOM de uma página HTML, a estrutura de um JSON, um organograma. Cada **{{nó|node}}** tem filhos; o do topo é a **{{raiz|root}}**; os sem filhos são **{{folhas|leaves}}**.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`Em uma **{{árvore binária de busca|binary search tree}}** (BST), cada nó tem no máximo dois filhos e vale a regra: **tudo à esquerda é menor, tudo à direita é maior**. Para buscar, você compara com o nó e desce para um lado — descartando metade da árvore a cada passo (se ela estiver balanceada).

- Busca/inserção: **O(h)**, onde *h* é a altura. Balanceada: h ≈ log₂ n. Degenerada (inserir já ordenado!): h = n.
- **Percursos**: em ordem (*in-order*: esquerda, nó, direita — em uma BST, sai **ordenado**), pré-ordem (nó primeiro) e pós-ordem (nó por último).

Árvores **auto-balanceáveis** (AVL, rubro-negra) mantêm h ≈ log n automaticamente; bancos de dados usam **B-trees** para índices (Nível 7).`},{type:`callout`,tone:`info`,text:`Árvores são definidas **recursivamente**: uma árvore é um nó com subárvores. Por isso quase todo algoritmo de árvore é recursivo. Se recursão ainda for nova, faça a lição de recursão (Nível 4) — ela é pré-requisito deste módulo.`}]},{stage:`exemplo`,blocks:[{type:`viz`,viz:`tree`,caption:`Insira números e veja a BST se formar. Tente inserir 1, 2, 3, 4, 5 em ordem: a árvore vira uma "lista".`}]},{stage:`codigo`,blocks:[{type:`trace`,code:`class No:
    def __init__(self, valor):
        self.valor = valor
        self.esq = None
        self.dir = None

def inserir(raiz, v):
    if raiz is None:
        return No(v)
    if v < raiz.valor:
        raiz.esq = inserir(raiz.esq, v)
    else:
        raiz.dir = inserir(raiz.dir, v)
    return raiz

def em_ordem(raiz):
    if raiz is None:
        return []
    return em_ordem(raiz.esq) + [raiz.valor] + em_ordem(raiz.dir)

r = None
for v in [5, 3, 8, 1]:
    r = inserir(r, v)
print(em_ordem(r))`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e3-tree-0`,kind:`mcq`,prompt:`Em uma árvore binária de busca (BST), onde ficam os valores **menores** que a raiz?`,difficulty:`facil`,skills:[`ed-arvores`],hints:[`Lembre a regra que dá nome à árvore "de busca".`],explanation:`Na BST, toda a subárvore esquerda tem valores menores que o nó e toda a direita, maiores. É isso que permite descartar metade a cada passo (quando ela está balanceada).`,options:[{text:`Na subárvore esquerda`,correct:!0,feedback:`Isso: esquerda < nó < direita.`},{text:`Na subárvore direita`,feedback:`À direita ficam os maiores.`},{text:`Em qualquer lugar`,feedback:`Sem regra de posição, não seria possível buscar rápido.`},{text:`Sempre nas folhas`,feedback:`Valores menores podem estar em nós internos também.`}]}},{type:`exercise`,exercise:{id:`e3-tree-1`,kind:`mcq`,prompt:`Inserindo 10, 20, 30, 40, 50 (nessa ordem) em uma BST simples, qual a altura resultante?`,difficulty:`intermediario`,skills:[`ed-arvores`],hints:[`Cada novo valor é maior que todos os anteriores. Para que lado ele vai?`],explanation:`Cada valor vai sempre para a direita: a árvore vira uma cadeia de 5 nós, altura 4 — a busca degenera para O(n). Por isso existem árvores balanceadas.`,options:[{text:`2 (balanceada)`,feedback:`Seria o ideal, mas BST simples não se balanceia sozinha.`},{text:`4 (uma "lista" para a direita)`,correct:!0,feedback:`Isso: inserção ordenada degenera a BST.`},{text:`5`,feedback:`Altura conta arestas: 5 nós em cadeia têm altura 4.`},{text:`1`,feedback:`Cada nó tem só um filho, à direita.`}]}},{type:`exercise`,exercise:{id:`e3-tree-2`,kind:`code`,lang:`python`,prompt:"Usando a classe `No` (já definida no código inicial), escreva `altura(raiz)` (árvore vazia tem altura -1; um nó só, 0) e `contem(raiz, v)` para BST.",difficulty:`intermediario`,skills:[`ed-arvores`,`alg-recursao`],hints:[`Altura de um nó = 1 + a maior altura entre as duas subárvores.`,"`contem`: compare v com o valor do nó e desça só para um lado."],explanation:"Os dois são recursivos: caso base (None) + combinação dos resultados dos filhos. `contem` aproveita a propriedade da BST para descer por um único caminho: O(h).",starter:`class No:
    def __init__(self, valor, esq=None, dir=None):
        self.valor, self.esq, self.dir = valor, esq, dir

def altura(raiz):
    pass

def contem(raiz, v):
    pass`,solution:`class No:
    def __init__(self, valor, esq=None, dir=None):
        self.valor, self.esq, self.dir = valor, esq, dir

def altura(raiz):
    if raiz is None:
        return -1
    return 1 + max(altura(raiz.esq), altura(raiz.dir))

def contem(raiz, v):
    while raiz is not None:
        if v == raiz.valor:
            return True
        raiz = raiz.esq if v < raiz.valor else raiz.dir
    return False`,tests:[{name:`altura`,code:`r = No(5, No(3, No(1)), No(8))
assert altura(None) == -1 and altura(No(1)) == 0 and altura(r) == 2`},{name:`contem`,code:`r = No(5, No(3, No(1)), No(8))
assert contem(r, 1) and contem(r, 8) and not contem(r, 4)`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e3-tree-desafio`,kind:`code`,lang:`python`,prompt:"Escreva `eh_bst(raiz)` que verifica se uma árvore binária é uma BST **válida** (valores distintos). Cuidado: comparar cada nó só com os filhos diretos **não** basta.",difficulty:`desafio`,skills:[`ed-arvores`,`alg-recursao`],hints:[`Na árvore 5 → esq 3 → dir 7, cada nó respeita os filhos, mas 7 está à esquerda de 5!`,`Passe para baixo o **intervalo** permitido (mínimo, máximo) de cada subárvore.`],explanation:`Cada nó precisa estar dentro de um intervalo herdado dos ancestrais. Alternativa: o percurso em ordem deve ser estritamente crescente.`,starter:`class No:
    def __init__(self, valor, esq=None, dir=None):
        self.valor, self.esq, self.dir = valor, esq, dir

def eh_bst(raiz):
    pass`,solution:`class No:
    def __init__(self, valor, esq=None, dir=None):
        self.valor, self.esq, self.dir = valor, esq, dir

def eh_bst(raiz, lo=float("-inf"), hi=float("inf")):
    if raiz is None:
        return True
    if not (lo < raiz.valor < hi):
        return False
    return eh_bst(raiz.esq, lo, raiz.valor) and eh_bst(raiz.dir, raiz.valor, hi)`,tests:[{name:`válida`,code:`assert eh_bst(No(5, No(3, No(1), No(4)), No(8)))`},{name:`armadilha do neto`,code:`assert not eh_bst(No(5, No(3, None, No(7)), No(8)))`},{name:`vazia`,code:`assert eh_bst(None)`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:"**Mini-projeto: explorador de pastas**. Usando `pathlib`, monte uma árvore da pasta atual e imprima no estilo do comando `tree`, com indentação. Calcule o tamanho total de cada pasta com um percurso **pós-ordem** (filhos antes do pai)."}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Árvore: hierarquia sem ciclos; raiz, filhos, folhas, altura.
- BST: esquerda < nó < direita; busca O(h).
- Em ordem numa BST = ordenado.
- Balanceamento mantém h ≈ log n.`}]}],cards:[{id:`l3-arvores#1`,front:`Qual percurso de uma BST produz os valores em ordem crescente?`,back:`O percurso em ordem (in-order): esquerda, nó, direita.`},{id:`l3-arvores#2`,front:`Quando uma BST simples degenera?`,back:`Quando os valores são inseridos já ordenados: vira uma cadeia e a busca fica O(n).`}]};export{e as default};
//# sourceMappingURL=l3-arvores-DQIxGElg.js.map