var e={id:`l3-arvores-balanceadas`,moduleId:`m3-4`,title:`Árvores balanceadas: rotações e AVL`,titleEn:`Balanced trees: rotations and AVL trees`,summary:`Como uma BST mantém altura O(log n) em qualquer ordem de chegada: rotações, a regra da AVL, os quatro casos de desequilíbrio, a remoção e uma visão da rubro-negra.`,minutes:50,objectives:[`Explicar por que uma rotação muda a altura sem quebrar a ordem da BST`,`Calcular fatores de balanceamento e reconhecer os casos LL, RR, LR e RL`,`Justificar por que a altura de uma AVL é O(log n), usando a recorrência do menor número de nós`,`Remover de uma BST (folha, um filho, dois filhos) e rebalancear na volta`,`Comparar AVL e rubro-negra e saber onde cada uma aparece na prática`],skills:[`ed-arvores`],terms:[{pt:`árvore balanceada`,en:`balanced tree`,def:`Árvore cuja altura se mantém O(log n), qualquer que seja a ordem das inserções e remoções.`,example:`Balanced search trees guarantee logarithmic height.`},{pt:`autobalanceável`,en:`self-balancing`,def:`Que se reorganiza sozinha, a cada inserção ou remoção, para continuar balanceada.`,example:`A self-balancing binary search tree keeps its height small automatically.`},{pt:`rotação`,en:`rotation`,def:`Troca local entre um nó e um filho que muda as profundidades e preserva o percurso em ordem; custa O(1).`,example:`A right rotation at y makes its left child x the new root of the subtree.`},{pt:`fator de balanceamento`,en:`balance factor`,def:`Altura da subárvore esquerda menos a altura da direita; numa AVL fica entre −1 e +1 em todo nó.`},{pt:`árvore AVL`,en:`AVL tree`,def:`BST em que, em todo nó, as alturas das duas subárvores diferem no máximo em 1. O nome vem de Adelson-Velsky e Landis (1962).`},{pt:`invariante`,en:`invariant`,def:`Propriedade que a estrutura garante antes e depois de toda operação.`,example:`Every operation must restore the AVL invariant before returning.`},{pt:`rotação dupla`,en:`double rotation`,def:`Duas rotações seguidas, primeiro no filho e depois no nó, que corrigem os casos em zigue-zague (LR e RL).`},{pt:`sucessor`,en:`in-order successor`,def:`O próximo valor no percurso em ordem; numa BST, o menor valor da subárvore direita.`},{pt:`árvore rubro-negra`,en:`red-black tree`,def:`BST balanceada em que cada nó é vermelho ou preto; as regras de cor garantem altura de no máximo 2·log₂(n + 1).`,example:`A Red-Black tree based NavigableMap implementation.`}],references:[`clrs`,`sedgewick-algs`,`mit-6006`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Na lição anterior, inserir 1, 2, 3, 4, 5 em ordem transformou a BST numa "lista": altura 4 e busca O(n). Isso não é azar raro. Dados reais chegam ordenados o tempo todo: números de pedido crescentes, horários de transações Pix, matrículas, as datas de um extrato.

Uma {{árvore balanceada|balanced tree}} garante altura O(log n) para **qualquer** ordem de chegada. Ela é {{autobalanceável|self-balancing}}: depois de cada inserção ou remoção, confere se algum nó ficou torto e o conserta com uma {{rotação|rotation}}, uma troca local de três ponteiros. Com 1 milhão de chaves, uma BST comum pode chegar à altura 999 999; uma AVL fica com altura de no máximo 27.

Elas estão por baixo de muita coisa que você vai usar: o \`TreeMap\` do Java e o \`std::map\` do C++, por exemplo, são árvores balanceadas. Nesta lição você vai entender a mais didática delas, a **AVL**, e ter uma visão da **rubro-negra**, a mais usada nas bibliotecas.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`### Rotação: o conserto local
\`\`\`text
        y                      x
       / \\                    / \\
      x   C     ------->     A   y
     / \\                        / \\
    A   B                      B   C

        rotação à direita em y
\`\`\`

A, B e C são subárvores inteiras (podem ser vazias). Antes e depois vale a mesma ordem: **A < x < B < y < C**. Por isso a rotação nunca quebra a regra da BST: o percurso em ordem é idêntico. O que muda são as profundidades: A sobe um nível, C desce um, B fica onde estava. Se o lado esquerdo estava alto demais, a rotação à direita o nivela.

São só três ponteiros: \`y.esq\` passa a ser B, \`x.dir\` passa a ser y, e quem apontava para y (o pai dele, ou a variável da raiz) passa a apontar para x. Custo O(1), qualquer que seja o tamanho das subárvores. A rotação à esquerda é o espelho.

### A regra da AVL
O {{fator de balanceamento|balance factor}} de um nó é \`altura(esq) − altura(dir)\`, com altura da árvore vazia = −1 (a convenção da lição anterior). Uma {{árvore AVL|AVL tree}} é uma BST com um {{invariante|invariant}} a mais: **em todo nó**, o fator é −1, 0 ou +1. Todo nó, não só a raiz: uma raiz equilibrada pode esconder um galho torto lá embaixo.

Para o fator sair em O(1), cada nó **guarda a própria altura**, atualizada na volta de cada inserção, em vez de recalculá-la percorrendo a subárvore.

Por que essa regra garante altura O(log n)? Pense na AVL mais "magra" possível de altura h: uma subárvore com altura h − 1 e a outra com h − 2, a menor que a regra permite. Se N(h) é o menor número de nós de uma AVL de altura h, então **N(h) = 1 + N(h − 1) + N(h − 2)**, com N(0) = 1 e N(1) = 2. É quase a recorrência de Fibonacci: N(h) cresce exponencialmente, multiplicando-se por cerca de 1,618 a cada nível. Invertendo a conta, a altura cresce só logaritmicamente com n: no pior caso, cerca de **1,44 · log₂ n**, no máximo uns 44% acima de uma árvore perfeita.

### Inserir: insere como BST e conserta na volta
1. Insira como numa BST comum, recursivamente.
2. Na volta da recursão, do novo nó até a raiz, atualize a altura de cada nó e calcule o fator.
3. O primeiro nó (o mais baixo) com fator +2 ou −2 é consertado conforme um dos quatro casos. O nome do caso diz o caminho do nó desequilibrado até o neto do lado pesado: L de *left* (esquerda), R de *right* (direita).

Nos casos em linha reta basta uma rotação. Nos casos em zigue-zague é preciso uma {{rotação dupla|double rotation}}: uma rotação simples só espelharia o zigue-zague, e o desequilíbrio trocaria de lado. A primeira rotação, no filho, endireita o zigue-zague numa linha reta; a segunda, no nó, resolve a linha reta.`},{type:`table`,head:[`Caso`,`Como reconhecer`,`Conserto`],rows:[[`LL (linha reta à esquerda)`,`fb(nó) = +2 e fb(filho esq.) ≥ 0`,`rotação à direita no nó`],[`RR (linha reta à direita)`,`fb(nó) = −2 e fb(filho dir.) ≤ 0`,`rotação à esquerda no nó`],[`LR (zigue-zague)`,`fb(nó) = +2 e fb(filho esq.) < 0`,`rotação à esquerda no filho esq., depois à direita no nó`],[`RL (zigue-zague)`,`fb(nó) = −2 e fb(filho dir.) > 0`,`rotação à direita no filho dir., depois à esquerda no nó`]],caption:`Na inserção, o filho nunca tem fator 0 quando o pai chega a ±2; o caso "= 0" só aparece na remoção e se resolve com rotação simples.`},{type:`md`,text:`Depois do conserto, a subárvore volta **exatamente** à altura que tinha antes da inserção. Por isso nenhum ancestral muda e, na inserção, **um** conserto (simples ou duplo) basta. Custo total: descer O(log n) + no máximo 2 rotações O(1) + atualizar alturas na volta O(log n) = **O(log n) no pior caso**.

### Remover (e por que dá mais trabalho)
Primeiro, a remoção numa BST comum, que ainda não tínhamos visto. Ache o nó e veja quantos filhos ele tem:
- **nenhum** (folha): basta tirá-lo;
- **um**: o filho sobe e ocupa o lugar dele;
- **dois**: copie para ele o valor do {{sucessor|in-order successor}}, o menor valor da subárvore direita (um passo à direita e depois sempre à esquerda), e remova o sucessor lá de baixo. Como o sucessor não tem filho à esquerda, essa segunda remoção cai num dos casos fáceis.

Na AVL, depois de remover, rebalanceie na volta da recursão, como na inserção. A diferença: aqui um conserto pode **diminuir** a altura da subárvore, e o desequilíbrio pode reaparecer mais acima. Uma remoção pode exigir rotações em vários níveis, até O(log n) delas; o custo total continua O(log n).

### A rubro-negra e o mundo real
A {{árvore rubro-negra|red-black tree}} troca a regra das alturas por regras de cor:
1. todo nó é vermelho ou preto, e a raiz é preta;
2. um nó vermelho não tem filho vermelho;
3. a partir de qualquer nó, todos os caminhos até as posições vazias abaixo dele passam pelo **mesmo número de nós pretos**.

O caminho mais curto possível só tem nós pretos; o mais longo alterna preto e vermelho. Logo, nenhum caminho da raiz até uma posição vazia tem mais que o dobro de nós de outro. E, se o caminho mais curto tem k nós, todos os k primeiros níveis estão cheios: n ≥ 2ᵏ − 1, ou seja, k ≤ log₂(n + 1). Por isso a altura fica em no máximo 2 · log₂(n + 1). Ela é menos rígida que a AVL (pode ficar um pouco mais alta), mas conserta com menos rotações.`},{type:`table`,head:[`Estrutura`,`Altura no pior caso`,`Rotações por inserção`,`Rotações por remoção`,`Onde aparece`],rows:[[`BST comum`,`n − 1`,`0`,`0`,`ensino; dados que chegam em ordem aleatória`],[`AVL`,`cerca de 1,44 · log₂ n`,`no máximo 2`,`até O(log n)`,`quando há muito mais buscas que alterações (no pior caso, é a mais baixa das três)`],[`Rubro-negra`,`no máximo 2 · log₂(n + 1)`,`no máximo 2`,`no máximo 3`,"`TreeMap` e `TreeSet` do Java, `std::map` e `std::set` nas implementações comuns de C++, o escalonador de processos do kernel Linux"]],caption:`As três buscam, inserem e removem em O(h). Nas balanceadas, h = O(log n) no pior caso. Com 1 milhão de chaves, a AVL chega no máximo à altura 27 e a rubro-negra, à 36 (a fórmula 2 · log₂(n + 1) é um teto um pouco folgado: dá 39). A árvore mais baixa possível tem altura 19.`},{type:`callout`,tone:`warn`,text:"O Python **não** tem árvore balanceada na biblioteca padrão. Para busca exata, use `dict` e `set` (hash, O(1) em média). Quando a **ordem** importa (o próximo maior, todos os valores de um intervalo), as opções comuns são uma lista ordenada com o módulo `bisect` (busca O(log n), mas inserir no meio é O(n), porque desloca elementos) ou o pacote externo `sortedcontainers`. Bancos de dados usam **B-trees**, árvores balanceadas com muitos filhos por nó (Nível 7).",title:`E no Python?`},{type:`callout`,tone:`deep`,text:`Uma BST **completa** (todos os níveis cheios, menos talvez o último, preenchido da esquerda para a direita) tem a menor altura possível, mas mantê-la assim custa caro. Numa árvore perfeita com os valores 2 a 8, inserir o 9 obriga o novo nó a nascer no canto esquerdo do último nível, posição que precisa guardar o menor valor: todos os valores mudam de lugar, um trabalho proporcional a n numa única inserção. A AVL aceita até ~44% a mais de altura em troca de consertos O(1) por nível; a rubro-negra aceita até 100% a mais em troca de ainda menos rotações. É um padrão de projeto que você vai rever muitas vezes: relaxar um pouco a garantia para tornar a manutenção barata.`,title:`Por que não exigir balanceamento perfeito?`}]},{stage:`exemplo`,blocks:[{type:`md`,text:"Vamos inserir 10, 20, 30, 40, 50 e 25 numa AVL vazia. Para caber numa tabela, a árvore está escrita como `x(E, D)`: o nó x com a subárvore esquerda E e a direita D; `—` é vazio, e uma folha aparece só como o número."},{type:`table`,head:[`Insere`,`Antes do conserto`,`Nó mais baixo com fator ±2`,`Caso e conserto`,`Depois`],rows:[[`10`,"`10`",`nenhum`,`—`,"`10`"],[`20`,"`10(—, 20)`",`nenhum (fb(10) = −1 é permitido)`,`—`,"`10(—, 20)`"],[`30`,"`10(—, 20(—, 30))`",`10: fb = −2, e fb(20) = −1`,`RR: rotação à esquerda em 10`,"`20(10, 30)`"],[`40`,"`20(10, 30(—, 40))`",`nenhum (fb(20) = −1, fb(30) = −1)`,`—`,"`20(10, 30(—, 40))`"],[`50`,"`20(10, 30(—, 40(—, 50)))`",`30: fb = −2, e fb(40) = −1 (o 20 também está em −2, mas o conserto começa pelo mais baixo)`,`RR: rotação à esquerda em 30`,"`20(10, 40(30, 50))`"],[`25`,"`20(10, 40(30(25, —), 50))`",`20: fb = −2, e fb(40) = +1`,`RL: rotação à direita em 40, depois à esquerda em 20`,"`30(20(10, 25), 40(—, 50))`"]],caption:`Depois do conserto em 30, o 20 volta sozinho para fb = −1: consertar o mais baixo devolve à subárvore a altura que ela tinha antes.`},{type:`md`,text:`O último passo, em desenho. O 25 entrou em zigue-zague (direita do 20, esquerda do 40). A primeira rotação endireita; a segunda nivela:

\`\`\`text
  antes            1ª: à direita em 40        2ª: à esquerda em 20

    20                  20                           30
   /  \\                /  \\                         /  \\
 10    40            10    30                     20    40
      /  \\                /  \\                   /  \\     \\
    30    50            25    40               10    25    50
   /                            \\
 25                              50
\`\`\`

Seis valores, altura 2: o mínimo possível para seis nós.`},{type:`viz`,viz:`tree`,caption:`Esta visualização é de uma BST comum, sem balanceamento. Clique em Esvaziar e insira 10, 20, 30, 40, 50 e 25: a altura chega a 4, contra 2 da AVL acima, com os mesmos seis valores.`}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`class No:
    def __init__(self, valor):
        self.valor = valor
        self.esq = None
        self.dir = None
        self.altura = 0                      # folha: altura 0

def h(no):
    return no.altura if no else -1          # árvore vazia: -1

def atualizar(no):
    no.altura = 1 + max(h(no.esq), h(no.dir))

def fb(no):                                  # fator de balanceamento
    return h(no.esq) - h(no.dir)

def girar_direita(y):
    x = y.esq
    y.esq = x.dir                            # a subárvore B muda de dono
    x.dir = y
    atualizar(y)                             # y ficou embaixo: atualize-o primeiro
    atualizar(x)
    return x                                 # x é a nova raiz da subárvore

def girar_esquerda(x):                       # o espelho da anterior
    y = x.dir
    x.dir = y.esq
    y.esq = x
    atualizar(x)
    atualizar(y)
    return y

def rebalancear(no):
    atualizar(no)
    if fb(no) > 1:                           # pesado à esquerda
        if fb(no.esq) < 0:                   # zigue-zague (LR): endireita primeiro
            no.esq = girar_esquerda(no.esq)
        return girar_direita(no)             # linha reta (LL)
    if fb(no) < -1:                          # pesado à direita
        if fb(no.dir) > 0:                   # zigue-zague (RL)
            no.dir = girar_direita(no.dir)
        return girar_esquerda(no)            # linha reta (RR)
    return no

def inserir(no, v):
    if no is None:
        return No(v)
    if v < no.valor:
        no.esq = inserir(no.esq, v)
    elif v > no.valor:
        no.dir = inserir(no.dir, v)
    else:
        return no                            # valor repetido: nada muda
    return rebalancear(no)                   # conserta na volta da recursão

def desenhar(no):                            # a notação x(E, D) do exemplo
    if no is None:
        return "—"
    if no.esq is None and no.dir is None:
        return str(no.valor)
    return f"{no.valor}({desenhar(no.esq)}, {desenhar(no.dir)})"

raiz = None
for v in [10, 20, 30, 40, 50, 25]:
    raiz = inserir(raiz, v)
    print(f"insere {v}: {desenhar(raiz)}")

def altura_bst_comum(valores):               # BST sem balanceamento
    # sem recursão: com 1 000 níveis, a recursão passaria do limite do Python
    raiz, maior = None, 0
    for v in valores:
        if raiz is None:
            raiz = No(v)
            continue
        no, prof = raiz, 1                   # prof: profundidade de um filho de no
        while True:
            if v < no.valor:
                if no.esq is None:
                    no.esq = No(v)
                    break
                no = no.esq
            else:
                if no.dir is None:
                    no.dir = No(v)
                    break
                no = no.dir
            prof += 1
        maior = max(maior, prof)
    return maior

n = 1000
avl = None
for v in range(n):
    avl = inserir(avl, v)
print(f"{n} chaves em ordem: BST comum com altura {altura_bst_comum(range(n))}, AVL com altura {avl.altura}")`,runnable:!0,caption:`A mesma sequência do exemplo e, depois, 1 000 chaves em ordem crescente: a BST comum vira uma lista (altura 999); a AVL fica com altura 9, o mínimo possível para 1 000 nós.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e3-avl-1`,kind:`mcq`,prompt:"Uma rotação à direita no nó `y` (cujo filho esquerdo é `x`) reorganiza a subárvore. O que **continua igual** depois dela?",difficulty:`facil`,skills:[`ed-arvores`],hints:[`O que a BST exige de cada nó? Uma rotação que mudasse isso seria útil?`,`Olhando o desenho, liste x, y e as subárvores A, B e C na sequência do percurso em ordem, antes e depois da rotação. O que mudou?`],explanation:`A rotação só troca quem é pai de quem entre x e y e muda a subárvore B de dono. A ordem relativa A < x < B < y < C é a mesma, e o percurso em ordem lista justamente essa ordem. Já a raiz da subárvore, as profundidades e, possivelmente, a altura mudam: é para isso que a rotação serve.`,options:[{text:`A sequência do percurso em ordem (esquerda, nó, direita)`,correct:!0,feedback:`Isso: A < x < B < y < C antes e depois. Por isso a rotação nunca quebra a regra da BST.`},{text:`A raiz da subárvore`,feedback:`A raiz muda: x sobe e vira a raiz da subárvore, e y desce para a direita de x.`},{text:`A altura da subárvore`,feedback:`Mudar a altura é justamente o objetivo: A sobe um nível e C desce um, o que pode diminuir a altura da subárvore em 1.`},{text:`A profundidade de cada nó`,feedback:`Não: x e a subárvore A sobem um nível; y e a subárvore C descem um. Só a subárvore B fica na mesma profundidade.`}]}},{type:`exercise`,exercise:{id:`e3-avl-2`,kind:`mcq`,prompt:`Numa AVL vazia, inserimos 30, depois 10, depois 20. Logo depois de inserir o 20, qual é o caso de desequilíbrio e que valor fica na raiz depois do conserto?`,difficulty:`intermediario`,skills:[`ed-arvores`],hints:[`Desenhe primeiro a BST comum com 30, 10 e 20. De que lado do 10 o 20 fica?`,`Calcule fb(30) e fb(10), lembrando que a altura de uma subárvore vazia é −1.`,`Os dois fatores têm o mesmo sinal ou sinais opostos? O que isso diz: linha reta ou zigue-zague?`],explanation:"Sem conserto, a árvore fica `30(10(—, 20), —)`: fb(30) = +2 e fb(10) = −1. Sinais opostos indicam zigue-zague, caso LR. A rotação à esquerda no 10 endireita para `30(20(10, —), —)`, uma linha reta (LL), e a rotação à direita no 30 resulta em `20(10, 30)`.",options:[{text:`LR (esquerda-direita); a raiz vira 20`,correct:!0,feedback:"Isso: o 20 entrou à direita do filho esquerdo. Rotação à esquerda no 10 e depois à direita no 30: `20(10, 30)`."},{text:`LL (esquerda-esquerda); a raiz vira 10`,feedback:"Seria LL se o 20 estivesse à esquerda do 10. Aqui fb(10) = −1, um zigue-zague. Uma rotação simples à direita no 30 levaria a `10(—, 30(20, —))`, ainda com fator −2 no 10."},{text:`RL (direita-esquerda); a raiz vira 20`,feedback:`A raiz final está certa, mas o caso não: o lado pesado do 30 é o esquerdo (fb = +2), então o caso começa com L. RL é o espelho, quando fb(nó) = −2.`},{text:`Nenhum: a árvore continua sendo AVL`,feedback:`Calcule fb(30): a subárvore esquerda (o 10 com o filho 20) tem altura 1 e a direita está vazia (altura −1). A diferença é 2, fora do limite.`}]}},{type:`exercise`,exercise:{id:`e3-avl-3`,kind:`predict`,lang:`python`,prompt:`O que é impresso? (Os nós aqui não guardam altura: o foco é só a rotação.)`,difficulty:`intermediario`,skills:[`ed-arvores`,`alg-recursao`],hints:[`Desenhe a árvore antes da rotação. Quem é x, quem é y e quem é a subárvore B (a que muda de dono)?`,"Depois de `girar_esquerda`, quem é a nova raiz? E para onde foi o 15?",`A pré-ordem visita o nó, depois toda a subárvore esquerda, depois toda a direita.`],explanation:"Antes: `10(5, 20(15, 30))`. Na rotação à esquerda em 10, o 20 sobe, o 10 desce para a esquerda dele e o 15 (que estava à esquerda do 20) passa para a direita do 10: `20(10(5, 15), 30)`. A pré-ordem é [20, 10, 5, 15, 30], e `r.esq.dir` é o 15. Repare que o percurso em ordem continua 5, 10, 15, 20, 30.",code:`class No:
    def __init__(self, valor, esq=None, dir=None):
        self.valor, self.esq, self.dir = valor, esq, dir

def girar_esquerda(x):
    y = x.dir
    x.dir = y.esq
    y.esq = x
    return y

def pre_ordem(no):
    if no is None:
        return []
    return [no.valor] + pre_ordem(no.esq) + pre_ordem(no.dir)

r = No(10, No(5), No(20, No(15), No(30)))
r = girar_esquerda(r)
print(pre_ordem(r))
print(r.esq.dir.valor)`,answer:`[20, 10, 5, 15, 30]
15`}},{type:`exercise`,exercise:{id:`e3-avl-4`,kind:`fill`,lang:`text`,prompt:`Seja N(h) o **menor** número de nós de uma AVL de altura h. A AVL mais magra de altura h tem uma subárvore de altura h − 1 e outra de altura h − 2, ambas também as mais magras possíveis. Complete as contas e conclua: qual a **maior** altura possível de uma AVL com 11 nós?`,difficulty:`intermediario`,skills:[`ed-arvores`,`alg-recursao`],hints:[`Por que a subárvore mais baixa tem altura h − 2, e não h − 3?`,`Cada linha usa os resultados das duas anteriores.`,`Para ter altura 4, de quantos nós uma AVL precisa no mínimo? 11 nós são suficientes?`],explanation:`A recorrência dá 1, 2, 4, 7, 12, 20, 33, ..., que cresce como Fibonacci (cada termo é cerca de 1,618 vezes o anterior). Altura 4 exige pelo menos 12 nós; com 11, a altura é no máximo 3. Como N(h) cresce exponencialmente, h cresce só logaritmicamente: h < 1,45 · log₂(n + 2). Para comparar, uma BST comum com 11 nós pode ter altura 10.`,template:`N(0) = 1
N(1) = 2
N(2) = 1 + N(1) + N(0) = ___
N(3) = 1 + N(2) + N(1) = ___
N(4) = 1 + N(3) + N(2) = ___
Com 11 nós, a altura é no máximo ___`,blanks:[[`4`],[`7`],[`12`],[`3`]]}},{type:`exercise`,exercise:{id:`e3-avl-5`,kind:`code`,lang:`python`,prompt:"Escreva `eh_avl(raiz)`, que devolve `True` se **todo** nó da árvore tem fator de balanceamento entre −1 e +1 (altura da árvore vazia = −1, de uma folha = 0). Não é preciso conferir a ordem da BST, só o balanceamento. Aqui os nós **não** guardam a altura: calcule-a. Desafio extra: faça tudo numa única passada pela árvore.",difficulty:`intermediario`,skills:[`ed-arvores`,`alg-recursao`],hints:[`Conferir só a raiz basta? Imagine uma raiz com fator 0 e um galho torto lá embaixo.`,`Para saber se um nó está balanceado, você precisa da altura das duas subárvores dele. Como calcular a altura recursivamente?`,`Para uma passada só, faça uma função auxiliar que devolve a altura da subárvore e, ao mesmo tempo, avisa se encontrou algum nó desbalanceado (por exemplo, devolvendo um par, ou um valor especial).`],explanation:`Todo nó precisa respeitar |altura(esq) − altura(dir)| ≤ 1. A versão direta (calcular a altura em cada nó e recursar nos filhos) é correta, mas recalcula alturas muitas vezes: cada nó é visitado de novo por todos os seus ancestrais, o que dá O(n log n) numa AVL e pode ser bem pior em árvores altas. A versão de uma passada devolve a altura de baixo para cima e para no primeiro desequilíbrio: O(n). É a mesma ideia de guardar a altura no nó, como a AVL faz.`,starter:`class No:
    def __init__(self, valor, esq=None, dir=None):
        self.valor, self.esq, self.dir = valor, esq, dir

def eh_avl(raiz):
    # devolva True se, em TODO nó, |altura(esq) - altura(dir)| <= 1
    pass`,solution:`class No:
    def __init__(self, valor, esq=None, dir=None):
        self.valor, self.esq, self.dir = valor, esq, dir

def eh_avl(raiz):
    def altura_ou_falha(no):
        # devolve a altura da subárvore, ou None se achar desequilíbrio
        if no is None:
            return -1
        he = altura_ou_falha(no.esq)
        if he is None:
            return None
        hd = altura_ou_falha(no.dir)
        if hd is None or abs(he - hd) > 1:
            return None
        return 1 + max(he, hd)
    return altura_ou_falha(raiz) is not None`,tests:[{name:`vazia e um nó`,code:`assert eh_avl(None) is True, "a árvore vazia é AVL"
assert eh_avl(No(7)) is True, "um nó sozinho é AVL"`},{name:`árvores balanceadas`,code:`perfeita = No(4, No(2, No(1), No(3)), No(6, No(5), No(7)))
assert eh_avl(perfeita), "a árvore perfeita de 7 nós é AVL"
exemplo = No(30, No(20, No(10), No(25)), No(40, None, No(50)))
assert eh_avl(exemplo), "a AVL do exemplo da lição deveria dar True"
magra = No(5, No(3, No(2, No(1)), No(4)), No(7, No(6)))
assert eh_avl(magra), "fatores +1 em vários nós são permitidos: esta é a AVL mais magra de altura 3"`},{name:`desequilíbrio de 2 na raiz`,code:`assert not eh_avl(No(1, None, No(2, None, No(3)))), "a cadeia 1 -> 2 -> 3 tem fator -2 na raiz"
r = No(10, No(5, No(2), No(7)), None)
assert not eh_avl(r), "a raiz tem subárvore esquerda de altura 1 e direita vazia (altura -1): fator +2. Confira a altura da árvore vazia"
r = No(10, No(5, No(2, No(1)), No(7)), No(15))
assert not eh_avl(r), "a raiz tem dois filhos, mas a subárvore esquerda tem altura 2 e a direita, 0: fator +2. Ter os dois filhos não basta: compare as alturas"`},{name:`raiz equilibrada, galho torto`,code:`torto = No(5, No(3, No(1)))
direita = No(15, No(12), No(20, None, No(25)))
r = No(10, torto, direita)
assert not eh_avl(r), "a raiz tem fator 0, mas o nó 5 tem fator +2: confira TODOS os nós, não só a raiz"
esquerda2 = No(4, No(2, No(1), No(3)), No(6, No(5), No(7)))
direita2 = No(12, No(10, No(9), No(11)), No(14, None, No(15, None, No(16))))
r = No(8, esquerda2, direita2)
assert not eh_avl(r), "a raiz e os filhos dela estão equilibrados, mas o nó 14, dois níveis abaixo, à direita, tem fator -2: a conferência precisa descer pelos dois lados até as folhas"`},{name:`300 árvores aleatórias`,code:`import random

def _bst(vs):
    r = None
    for v in vs:
        if r is None:
            r = No(v)
            continue
        no = r
        while True:
            if v < no.valor:
                if no.esq is None:
                    no.esq = No(v)
                    break
                no = no.esq
            else:
                if no.dir is None:
                    no.dir = No(v)
                    break
                no = no.dir
    return r

def _desenho(no):
    if no is None:
        return "—"
    if no.esq is None and no.dir is None:
        return str(no.valor)
    return f"{no.valor}({_desenho(no.esq)}, {_desenho(no.dir)})"

def _altura_avl(no):
    if no is None:
        return -1
    he, hd = _altura_avl(no.esq), _altura_avl(no.dir)
    if he is None or hd is None or abs(he - hd) > 1:
        return None
    return 1 + max(he, hd)

_rng = random.Random(8)
for _ in range(300):
    vs = _rng.sample(range(100), _rng.randint(0, 14))
    r = _bst(vs)
    esperado = _altura_avl(r) is not None
    assert eh_avl(r) == esperado, f"para a árvore {_desenho(r)} (na notação x(E, D) da lição), eh_avl devolveu {eh_avl(r)}; esperado {esperado}"`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e3-avl-desafio`,kind:`code`,lang:`python`,prompt:"O código inicial traz a AVL com inserção da etapa Código. Escreva `remover(no, v)`, que remove `v` da subárvore e devolve a nova raiz dela, mantendo a regra da BST, o balanceamento AVL e corretas as alturas guardadas nos nós. Se `v` não estiver na árvore, nada muda. No caso de dois filhos, use o {{sucessor|in-order successor}} (o menor valor da subárvore direita). A remoção deve custar O(log n): visite só os nós do caminho da busca (e, no caso de dois filhos, os do caminho até o sucessor).",difficulty:`desafio`,skills:[`ed-arvores`,`alg-recursao`],hints:[`Comece pela parte de BST, sem pensar em balanceamento: como achar o nó, e o que fazer em cada um dos três casos (folha, um filho, dois filhos)?`,`No caso de dois filhos, o valor do sucessor vem para o nó atual. Como tirar o sucessor da subárvore direita sem escrever código novo?`,"A estrutura é a mesma de `inserir`: desça recursivamente, troque o filho pelo resultado da chamada e, na volta, devolva o nó já rebalanceado. Que funções do código inicial você pode reaproveitar?"],explanation:'A remoção tem a mesma forma da inserção: recursão até o nó, os três casos da BST (no de dois filhos, o valor do sucessor sobe e o sucessor é removido da subárvore direita) e `rebalancear` em cada nó do caminho, na volta. Note que `rebalancear` trata fb(filho) = 0 com rotação simples, caso que só aparece na remoção. E, ao contrário da inserção, um conserto pode encurtar a subárvore e desequilibrar um ancestral: um dos testes provoca rotações em dois níveis com uma única remoção. Custo: O(log n), porque só os nós do caminho são visitados e rebalanceados; remover como numa BST comum e depois "consertar" a árvore inteira daria uma AVL válida, mas custaria O(n) por remoção.',starter:`class No:
    def __init__(self, valor):
        self.valor = valor
        self.esq = None
        self.dir = None
        self.altura = 0                      # folha: altura 0

def h(no):
    return no.altura if no else -1          # árvore vazia: -1

def atualizar(no):
    no.altura = 1 + max(h(no.esq), h(no.dir))

def fb(no):                                  # fator de balanceamento
    return h(no.esq) - h(no.dir)

def girar_direita(y):
    x = y.esq
    y.esq = x.dir                            # a subárvore B muda de dono
    x.dir = y
    atualizar(y)                             # y ficou embaixo: atualize-o primeiro
    atualizar(x)
    return x                                 # x é a nova raiz da subárvore

def girar_esquerda(x):                       # o espelho da anterior
    y = x.dir
    x.dir = y.esq
    y.esq = x
    atualizar(x)
    atualizar(y)
    return y

def rebalancear(no):
    atualizar(no)
    if fb(no) > 1:                           # pesado à esquerda
        if fb(no.esq) < 0:                   # zigue-zague (LR): endireita primeiro
            no.esq = girar_esquerda(no.esq)
        return girar_direita(no)             # linha reta (LL)
    if fb(no) < -1:                          # pesado à direita
        if fb(no.dir) > 0:                   # zigue-zague (RL)
            no.dir = girar_direita(no.dir)
        return girar_esquerda(no)            # linha reta (RR)
    return no

def inserir(no, v):
    if no is None:
        return No(v)
    if v < no.valor:
        no.esq = inserir(no.esq, v)
    elif v > no.valor:
        no.dir = inserir(no.dir, v)
    else:
        return no                            # valor repetido: nada muda
    return rebalancear(no)                   # conserta na volta da recursão

def remover(no, v):
    # 1. desça como na busca até achar v (chegou a None: v não está na árvore)
    # 2. trate os três casos: folha, um filho, dois filhos (use o sucessor)
    # 3. na volta da recursão, devolva cada nó do caminho rebalanceado
    return no`,solution:`class No:
    def __init__(self, valor):
        self.valor = valor
        self.esq = None
        self.dir = None
        self.altura = 0                      # folha: altura 0

def h(no):
    return no.altura if no else -1          # árvore vazia: -1

def atualizar(no):
    no.altura = 1 + max(h(no.esq), h(no.dir))

def fb(no):                                  # fator de balanceamento
    return h(no.esq) - h(no.dir)

def girar_direita(y):
    x = y.esq
    y.esq = x.dir                            # a subárvore B muda de dono
    x.dir = y
    atualizar(y)                             # y ficou embaixo: atualize-o primeiro
    atualizar(x)
    return x                                 # x é a nova raiz da subárvore

def girar_esquerda(x):                       # o espelho da anterior
    y = x.dir
    x.dir = y.esq
    y.esq = x
    atualizar(x)
    atualizar(y)
    return y

def rebalancear(no):
    atualizar(no)
    if fb(no) > 1:                           # pesado à esquerda
        if fb(no.esq) < 0:                   # zigue-zague (LR): endireita primeiro
            no.esq = girar_esquerda(no.esq)
        return girar_direita(no)             # linha reta (LL)
    if fb(no) < -1:                          # pesado à direita
        if fb(no.dir) > 0:                   # zigue-zague (RL)
            no.dir = girar_direita(no.dir)
        return girar_esquerda(no)            # linha reta (RR)
    return no

def inserir(no, v):
    if no is None:
        return No(v)
    if v < no.valor:
        no.esq = inserir(no.esq, v)
    elif v > no.valor:
        no.dir = inserir(no.dir, v)
    else:
        return no                            # valor repetido: nada muda
    return rebalancear(no)                   # conserta na volta da recursão

def remover(no, v):
    if no is None:
        return None
    if v < no.valor:
        no.esq = remover(no.esq, v)
    elif v > no.valor:
        no.dir = remover(no.dir, v)
    else:
        if no.esq is None:
            return no.dir
        if no.dir is None:
            return no.esq
        suc = no.dir
        while suc.esq is not None:
            suc = suc.esq
        no.valor = suc.valor
        no.dir = remover(no.dir, suc.valor)
    return rebalancear(no)`,tests:[{name:`remove uma folha`,code:`def _conferir(no, lo=float("-inf"), hi=float("inf")):
    if no is None:
        return -1
    assert lo < no.valor < hi, f"a regra da BST foi violada no nó {no.valor}"
    he = _conferir(no.esq, lo, no.valor)
    hd = _conferir(no.dir, no.valor, hi)
    assert abs(he - hd) <= 1, f"o nó {no.valor} ficou desbalanceado: alturas {he} (esq.) e {hd} (dir.). Você chamou rebalancear na volta?"
    assert no.altura == 1 + max(he, hd), f"a altura guardada no nó {no.valor} é {no.altura}, mas deveria ser {1 + max(he, hd)}"
    return no.altura

def _valores(no):
    return [] if no is None else _valores(no.esq) + [no.valor] + _valores(no.dir)

def _montar(vs):
    r = None
    for v in vs:
        r = inserir(r, v)
    return r
r = remover(_montar([20, 10, 30, 5]), 5)
_conferir(r)
assert _valores(r) == [10, 20, 30], f"esperado [10, 20, 30] em ordem; veio {_valores(r)}"`},{name:`remove um nó com um filho`,code:`def _conferir(no, lo=float("-inf"), hi=float("inf")):
    if no is None:
        return -1
    assert lo < no.valor < hi, f"a regra da BST foi violada no nó {no.valor}"
    he = _conferir(no.esq, lo, no.valor)
    hd = _conferir(no.dir, no.valor, hi)
    assert abs(he - hd) <= 1, f"o nó {no.valor} ficou desbalanceado: alturas {he} (esq.) e {hd} (dir.). Você chamou rebalancear na volta?"
    assert no.altura == 1 + max(he, hd), f"a altura guardada no nó {no.valor} é {no.altura}, mas deveria ser {1 + max(he, hd)}"
    return no.altura

def _valores(no):
    return [] if no is None else _valores(no.esq) + [no.valor] + _valores(no.dir)

def _montar(vs):
    r = None
    for v in vs:
        r = inserir(r, v)
    return r
r = remover(_montar([20, 10, 30, 5]), 10)
_conferir(r)
assert _valores(r) == [5, 20, 30], f"o 5 deveria ocupar o lugar do 10; em ordem veio {_valores(r)}"`},{name:`remove um nó com dois filhos (a raiz)`,code:`def _conferir(no, lo=float("-inf"), hi=float("inf")):
    if no is None:
        return -1
    assert lo < no.valor < hi, f"a regra da BST foi violada no nó {no.valor}"
    he = _conferir(no.esq, lo, no.valor)
    hd = _conferir(no.dir, no.valor, hi)
    assert abs(he - hd) <= 1, f"o nó {no.valor} ficou desbalanceado: alturas {he} (esq.) e {hd} (dir.). Você chamou rebalancear na volta?"
    assert no.altura == 1 + max(he, hd), f"a altura guardada no nó {no.valor} é {no.altura}, mas deveria ser {1 + max(he, hd)}"
    return no.altura

def _valores(no):
    return [] if no is None else _valores(no.esq) + [no.valor] + _valores(no.dir)

def _montar(vs):
    r = None
    for v in vs:
        r = inserir(r, v)
    return r
r = remover(_montar([20, 10, 30, 25, 35]), 20)
_conferir(r)
assert _valores(r) == [10, 25, 30, 35], f"esperado [10, 25, 30, 35]; veio {_valores(r)}"`},{name:`remoção que exige rotação simples e dupla`,code:`def _conferir(no, lo=float("-inf"), hi=float("inf")):
    if no is None:
        return -1
    assert lo < no.valor < hi, f"a regra da BST foi violada no nó {no.valor}"
    he = _conferir(no.esq, lo, no.valor)
    hd = _conferir(no.dir, no.valor, hi)
    assert abs(he - hd) <= 1, f"o nó {no.valor} ficou desbalanceado: alturas {he} (esq.) e {hd} (dir.). Você chamou rebalancear na volta?"
    assert no.altura == 1 + max(he, hd), f"a altura guardada no nó {no.valor} é {no.altura}, mas deveria ser {1 + max(he, hd)}"
    return no.altura

def _valores(no):
    return [] if no is None else _valores(no.esq) + [no.valor] + _valores(no.dir)

def _montar(vs):
    r = None
    for v in vs:
        r = inserir(r, v)
    return r
r = remover(_montar([20, 10, 30, 35]), 10)
_conferir(r)
assert r.valor == 30, f"sem o 10, o 20 fica com fator -2 (caso RR): a raiz deveria virar 30, veio {r.valor}"
r = remover(_montar([20, 10, 30, 25]), 10)
_conferir(r)
assert r.valor == 25, f"sem o 10, o 20 fica com fator -2 e o 30 com +1 (caso RL): a raiz deveria virar 25, veio {r.valor}"`},{name:`uma remoção, rotações em dois níveis`,code:`def _conferir(no, lo=float("-inf"), hi=float("inf")):
    if no is None:
        return -1
    assert lo < no.valor < hi, f"a regra da BST foi violada no nó {no.valor}"
    he = _conferir(no.esq, lo, no.valor)
    hd = _conferir(no.dir, no.valor, hi)
    assert abs(he - hd) <= 1, f"o nó {no.valor} ficou desbalanceado: alturas {he} (esq.) e {hd} (dir.). Você chamou rebalancear na volta?"
    assert no.altura == 1 + max(he, hd), f"a altura guardada no nó {no.valor} é {no.altura}, mas deveria ser {1 + max(he, hd)}"
    return no.altura

def _valores(no):
    return [] if no is None else _valores(no.esq) + [no.valor] + _valores(no.dir)

def _montar(vs):
    r = None
    for v in vs:
        r = inserir(r, v)
    return r
vs = [11, 12, 3, 5, 10, 9, 2, 6, 8, 4, 1, 7]
r = remover(_montar(vs), 3)
_conferir(r)
assert _valores(r) == [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12], f"em ordem veio {_valores(r)}"`},{name:`valor ausente, árvore vazia e esvaziar tudo`,code:`def _conferir(no, lo=float("-inf"), hi=float("inf")):
    if no is None:
        return -1
    assert lo < no.valor < hi, f"a regra da BST foi violada no nó {no.valor}"
    he = _conferir(no.esq, lo, no.valor)
    hd = _conferir(no.dir, no.valor, hi)
    assert abs(he - hd) <= 1, f"o nó {no.valor} ficou desbalanceado: alturas {he} (esq.) e {hd} (dir.). Você chamou rebalancear na volta?"
    assert no.altura == 1 + max(he, hd), f"a altura guardada no nó {no.valor} é {no.altura}, mas deveria ser {1 + max(he, hd)}"
    return no.altura

def _valores(no):
    return [] if no is None else _valores(no.esq) + [no.valor] + _valores(no.dir)

def _montar(vs):
    r = None
    for v in vs:
        r = inserir(r, v)
    return r
assert remover(None, 3) is None, "remover de uma árvore vazia devolve None"
r = remover(_montar([2, 1, 3]), 99)
_conferir(r)
assert _valores(r) == [1, 2, 3], "remover um valor ausente não deve mudar nada"
r = _montar(range(1, 41))
for v in [20, 1, 40, 10, 30] + list(range(1, 41)):
    r = remover(r, v)
    _conferir(r)
assert r is None, "depois de remover todos os valores, a árvore deve ficar vazia (None)"`},{name:`600 operações aleatórias contra um set`,code:`def _conferir(no, lo=float("-inf"), hi=float("inf")):
    if no is None:
        return -1
    assert lo < no.valor < hi, f"a regra da BST foi violada no nó {no.valor}"
    he = _conferir(no.esq, lo, no.valor)
    hd = _conferir(no.dir, no.valor, hi)
    assert abs(he - hd) <= 1, f"o nó {no.valor} ficou desbalanceado: alturas {he} (esq.) e {hd} (dir.). Você chamou rebalancear na volta?"
    assert no.altura == 1 + max(he, hd), f"a altura guardada no nó {no.valor} é {no.altura}, mas deveria ser {1 + max(he, hd)}"
    return no.altura

def _valores(no):
    return [] if no is None else _valores(no.esq) + [no.valor] + _valores(no.dir)

def _montar(vs):
    r = None
    for v in vs:
        r = inserir(r, v)
    return r
import random
rng = random.Random(42)
r, conj = None, set()
for passo in range(600):
    v = rng.randint(0, 60)
    if rng.random() < 0.55:
        r = inserir(r, v)
        conj.add(v)
    else:
        r = remover(r, v)
        conj.discard(v)
    _conferir(r)
    assert _valores(r) == sorted(conj), f"no passo {passo}, a árvore tem {_valores(r)}; esperado {sorted(conj)}"`},{name:`não reconstrói a árvore`,code:`def _conferir(no, lo=float("-inf"), hi=float("inf")):
    if no is None:
        return -1
    assert lo < no.valor < hi, f"a regra da BST foi violada no nó {no.valor}"
    he = _conferir(no.esq, lo, no.valor)
    hd = _conferir(no.dir, no.valor, hi)
    assert abs(he - hd) <= 1, f"o nó {no.valor} ficou desbalanceado: alturas {he} (esq.) e {hd} (dir.). Você chamou rebalancear na volta?"
    assert no.altura == 1 + max(he, hd), f"a altura guardada no nó {no.valor} é {no.altura}, mas deveria ser {1 + max(he, hd)}"
    return no.altura

def _valores(no):
    return [] if no is None else _valores(no.esq) + [no.valor] + _valores(no.dir)

def _montar(vs):
    r = None
    for v in vs:
        r = inserir(r, v)
    return r
r = _montar(range(300))
criados = [0]
_init_original = No.__init__
def _contando(self, *args, **kwargs):
    criados[0] += 1
    _init_original(self, *args, **kwargs)
No.__init__ = _contando
try:
    for v in range(0, 300, 3):
        r = remover(r, v)
finally:
    No.__init__ = _init_original
_conferir(r)
assert criados[0] <= 100, f"{criados[0]} nós criados em 100 remoções: remova ajustando os ponteiros, sem reconstruir a árvore"`},{name:`O(log n) por remoção`,code:`def _conferir(no, lo=float("-inf"), hi=float("inf")):
    if no is None:
        return -1
    assert lo < no.valor < hi, f"a regra da BST foi violada no nó {no.valor}"
    he = _conferir(no.esq, lo, no.valor)
    hd = _conferir(no.dir, no.valor, hi)
    assert abs(he - hd) <= 1, f"o nó {no.valor} ficou desbalanceado: alturas {he} (esq.) e {hd} (dir.). Você chamou rebalancear na volta?"
    assert no.altura == 1 + max(he, hd), f"a altura guardada no nó {no.valor} é {no.altura}, mas deveria ser {1 + max(he, hd)}"
    return no.altura

def _valores(no):
    return [] if no is None else _valores(no.esq) + [no.valor] + _valores(no.dir)

def _montar(vs):
    r = None
    for v in vs:
        r = inserir(r, v)
    return r
r = _montar(range(2000))
_leituras = [0]
def _contar(campo):
    # conta cada leitura de no.esq e no.dir feita durante as remoções
    def ler(self):
        _leituras[0] += 1
        return self.__dict__[campo]
    def escrever(self, valor):
        self.__dict__[campo] = valor
    return property(ler, escrever)
No.esq, No.dir = _contar("esq"), _contar("dir")
pior = 0
try:
    for v in list(range(0, 2000, 97)) + [5000]:
        antes = _leituras[0]
        r = remover(r, v)
        pior = max(pior, _leituras[0] - antes)
finally:
    del No.esq, No.dir
_conferir(r)
assert pior <= 1000, f"uma única remoção leu {pior} ligações esq/dir numa AVL de 2 000 nós: isso é O(n), como percorrer a árvore inteira. Visite só o caminho da busca (e, com dois filhos, o do sucessor) e rebalanceie só esses nós, na volta da recursão"`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:"**Experimento: índice de CEPs.** Gere 50 000 CEPs aleatórios de 8 dígitos e guarde-os de duas formas: na sua AVL (com a remoção do desafio) e numa lista ordenada mantida com `bisect.insort`. Meça o tempo para inserir todos, para remover 10 000 e para listar os CEPs de uma faixa, como 01000-000 a 05999-999 (a maior parte da capital paulista); na AVL, faça um percurso em ordem que só desce para os lados que podem ter valores da faixa. Qual estrutura venceu em cada operação? Explique usando O(log n) × O(n) e o fato de `bisect.insort` deslocar memória com código em C, enquanto a AVL roda em Python puro."}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Rotação: troca local O(1) que preserva o percurso em ordem e muda as profundidades.
- AVL: em todo nó, fator de balanceamento −1, 0 ou +1; cada nó guarda a altura.
- N(h) = 1 + N(h − 1) + N(h − 2) cresce como Fibonacci, então h ≈ 1,44 · log₂ n no pior caso.
- Inserção: insere como BST e conserta o nó mais baixo com fator ±2. Linha reta (LL, RR): uma rotação; zigue-zague (LR, RL): rotação dupla. Um conserto basta.
- Remoção: três casos da BST (no de dois filhos, entra o sucessor) e rebalanceamento na volta, possivelmente em vários níveis.
- Rubro-negra: regras de cor, altura até 2 · log₂(n + 1), poucas rotações; é a de \`TreeMap\` e \`std::map\`. O Python não tem árvore balanceada na biblioteca padrão.`},{type:`callout`,tone:`english`,text:`**Vocabulary**: *balanced / self-balancing tree*, *left / right rotation*, *balance factor*, *AVL tree*, *double rotation*, *invariant*, *in-order successor*, *red-black tree*.

From the Java documentation (class TreeMap): *"A Red-Black tree based NavigableMap implementation. [...] This implementation provides guaranteed log(n) time cost for the containsKey, get, put and remove operations."*

Typical interview question: "What happens to a binary search tree when you insert keys in sorted order, and how do self-balancing trees prevent it?"`,title:`English corner`}]}],cards:[{id:`l3-arvores-balanceadas#1`,front:`O que uma rotação preserva e o que ela muda?`,back:`Preserva a ordem do percurso em ordem (a regra da BST). Muda a raiz da subárvore, as profundidades e, possivelmente, a altura.`},{id:`l3-arvores-balanceadas#2`,front:`Qual é o invariante de uma AVL?`,back:`Em todo nó, |altura(esq) − altura(dir)| ≤ 1, ou seja, fator de balanceamento −1, 0 ou +1.`},{id:`l3-arvores-balanceadas#3`,front:`Como reconhecer o caso LR e como consertá-lo?`,back:`fb(nó) = +2 e fb(filho esquerdo) < 0 (zigue-zague). Rotação à esquerda no filho esquerdo e depois rotação à direita no nó.`},{id:`l3-arvores-balanceadas#4`,front:`Por que a altura de uma AVL é O(log n)?`,back:`O menor número de nós de uma AVL de altura h segue N(h) = 1 + N(h − 1) + N(h − 2), que cresce exponencialmente (como Fibonacci); logo h ≈ 1,44 · log₂ n no pior caso.`},{id:`l3-arvores-balanceadas#5`,front:`Quantos consertos uma inserção numa AVL exige? E uma remoção?`,back:`Inserção: um só (no máximo 2 rotações), pois a subárvore volta à altura antiga. Remoção: pode exigir rotações em vários níveis, até O(log n).`},{id:`l3-arvores-balanceadas#6`,front:`Ao remover de uma BST um nó com dois filhos, quem toma o lugar dele?`,back:`O sucessor: o menor valor da subárvore direita (um passo à direita e depois sempre à esquerda). Depois, o sucessor é removido lá de baixo.`},{id:`l3-arvores-balanceadas#7`,front:`Qual a altura máxima de uma rubro-negra com n nós, e onde ela é usada?`,back:`No máximo 2 · log₂(n + 1). TreeMap e TreeSet do Java, std::map nas implementações comuns de C++, kernel Linux.`},{id:`l3-arvores-balanceadas#8`,front:`O Python tem árvore balanceada na biblioteca padrão? O que usar no lugar?`,back:`Não. dict e set para busca exata; lista ordenada com bisect (ou o pacote sortedcontainers) quando a ordem importa.`}]};export{e as default};
//# sourceMappingURL=l3-arvores-balanceadas-Ib1JWs4c.js.map