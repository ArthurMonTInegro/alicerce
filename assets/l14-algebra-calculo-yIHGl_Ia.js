var e={id:`l14-algebra-calculo`,moduleId:`m14-4`,title:`Vetores, matrizes, derivadas e gradiente`,titleEn:`Vectors, matrices, derivatives and gradient`,summary:`A matemática por trás de gráficos, recomendação e redes neurais: produto escalar, multiplicação de matrizes, derivadas e a descida do gradiente.`,minutes:55,objectives:[`Calcular produto escalar, norma e similaridade de cosseno`,`Multiplicar matrizes e interpretar uma matriz como transformação`,`Estimar derivadas numericamente e aplicar a regra da cadeia`,`Implementar descida do gradiente para minimizar uma função`],skills:[`mat-algebra`],terms:[{pt:`vetor`,en:`vector`,def:`Lista ordenada de números; ponto ou direção num espaço.`},{pt:`produto escalar`,en:`dot product`,def:`Soma dos produtos coordenada a coordenada; mede alinhamento.`},{pt:`norma`,en:`norm`,def:`Comprimento de um vetor: raiz do produto escalar dele com ele mesmo.`},{pt:`matriz`,en:`matrix`,def:`Tabela de números; representa uma transformação linear ou um conjunto de dados.`},{pt:`derivada`,en:`derivative`,def:`Taxa de variação instantânea de uma função.`},{pt:`regra da cadeia`,en:`chain rule`,def:`A derivada de f(g(x)) é f'(g(x)) · g'(x).`},{pt:`gradiente`,en:`gradient`,def:`Vetor das derivadas parciais; aponta para onde a função mais cresce.`},{pt:`taxa de aprendizado`,en:`learning rate`,def:`Tamanho do passo na descida do gradiente.`}],references:[`mit-1806`,`mml-book`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Uma imagem é uma matriz de pixels; um usuário pode ser um vetor de gostos; uma camada de rede neural é uma multiplicação de matriz seguida de uma função. **Álgebra linear** dá a linguagem; **cálculo** dá a forma de ajustar os números: o **gradiente** diz em que direção mudar os parâmetros para o erro diminuir.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`### Vetores

- **Produto escalar**: u · v = Σ uᵢvᵢ. Se for 0, os vetores são perpendiculares.
- **Norma**: ‖u‖ = √(u · u).
- **Similaridade de cosseno**: (u · v) / (‖u‖‖v‖), entre −1 e 1. Sistemas de recomendação e busca semântica comparam vetores assim.

### Matrizes

O produto C = A·B existe se o número de colunas de A é igual ao de linhas de B; Cᵢⱼ = (linha i de A) · (coluna j de B). Atenção: A·B ≠ B·A em geral. Uma matriz 2×2 transforma o plano: \`[[0, -1], [1, 0]]\` gira 90°; \`[[2, 0], [0, 2]]\` dobra o tamanho. Uma camada de rede neural calcula **y = f(W·x + b)**.

### Derivadas e gradiente

- Derivada: f'(x) ≈ (f(x + h) − f(x − h)) / 2h para h pequeno (diferença central).
- Regras: (xⁿ)' = n·xⁿ⁻¹; regra da cadeia (f(g(x)))' = f'(g(x))·g'(x). A **retropropagação** das redes neurais é a regra da cadeia aplicada camada por camada.
- Para funções de várias variáveis, o **gradiente** ∇f reúne as derivadas parciais.

### Descida do gradiente

Para minimizar f: repita **θ ← θ − α·∇f(θ)**, com α (taxa de aprendizado) pequeno. α grande demais faz oscilar ou divergir; pequeno demais, demora.`}]},{stage:`exemplo`,blocks:[{type:`code`,lang:`python`,code:`import math

def escalar(u, v):
    return sum(a * b for a, b in zip(u, v))

def cosseno(u, v):
    return escalar(u, v) / (math.sqrt(escalar(u, u)) * math.sqrt(escalar(v, v)))

# gostos: [ação, comédia, drama, documentário]
ana = [5, 1, 4, 0]
bia = [4, 0, 5, 1]
caio = [0, 5, 1, 4]
print("ana~bia:", round(cosseno(ana, bia), 2), " ana~caio:", round(cosseno(ana, caio), 2))`,runnable:!0}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`def f(x):
    return (x - 3) ** 2 + 1      # mínimo em x = 3

def derivada(f, x, h=1e-5):
    return (f(x + h) - f(x - h)) / (2 * h)

x, alfa = 10.0, 0.1
for passo in range(30):
    x -= alfa * derivada(f, x)
    if passo % 5 == 0:
        print(f"passo {passo:2}: x = {x:.4f}, f(x) = {f(x):.4f}")
print("chegou perto de 3?", round(x, 3))`,runnable:!0,caption:`Troque alfa para 1.1 e veja a descida divergir.`},{type:`viz`,viz:`neuron`,caption:`Um neurônio artificial: produto escalar dos pesos com a entrada, mais o viés, passando por uma ativação.`},{type:`callout`,tone:`english`,text:`In ML papers: *"we minimize the loss with stochastic gradient descent (SGD)"*, *"the gradient vanishes"*, *"matrix multiplication (matmul)"*, *"embedding vectors"*, *"cosine similarity"*.`,title:`English corner`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e14-alg-0`,kind:`mcq`,prompt:`Qual o produto escalar de u = (2, −1, 3) e v = (1, 5, 1)?`,difficulty:`facil`,skills:[`mat-algebra`],hints:[`Multiplique coordenada a coordenada e some.`],explanation:`2·1 + (−1)·5 + 3·1 = 2 − 5 + 3 = **0**: os vetores são perpendiculares.`,options:[{text:`0`,correct:!0,feedback:`Isso, e por isso são perpendiculares.`},{text:`10`,feedback:`Confira o sinal de (−1)·5.`},{text:`(2, −5, 3)`,feedback:`Isso é o produto coordenada a coordenada; falta somar.`},{text:`6`,feedback:`Refaça a soma: 2 − 5 + 3.`}]}},{type:`exercise`,exercise:{id:`e14-alg-1`,kind:`code`,lang:`python`,prompt:'Escreva `matmul(A, B)` para matrizes como listas de listas. Se as dimensões forem incompatíveis,\nlance `ValueError("dimensões incompatíveis")`.',difficulty:`intermediario`,skills:[`mat-algebra`],hints:[`A é n×m, B precisa ser m×p; o resultado é n×p.`,`C[i][j] = soma de A[i][k] * B[k][j] para k de 0 a m−1.`],explanation:`São três laços aninhados: O(n·m·p). Bibliotecas como NumPy e as GPUs fazem a mesma conta de forma otimizada e paralela; é a operação que mais consome tempo no treino de redes neurais.`,starter:`def matmul(A, B):
    pass
`,solution:`def matmul(A, B):
    if not A or not B or len(A[0]) != len(B):
        raise ValueError("dimensões incompatíveis")
    return [[sum(A[i][k] * B[k][j] for k in range(len(B))) for j in range(len(B[0]))] for i in range(len(A))]`,tests:[{name:`2x2`,code:`assert matmul([[1, 2], [3, 4]], [[5, 6], [7, 8]]) == [[19, 22], [43, 50]]`},{name:`retangular`,code:`assert matmul([[1, 2, 3]], [[1], [0], [2]]) == [[7]]`},{name:`rotação de 90°`,code:`assert matmul([[0, -1], [1, 0]], [[1], [0]]) == [[0], [1]]`},{name:`incompatível`,code:`try:
    matmul([[1, 2]], [[1, 2]])
    assert False
except ValueError:
    pass`}]}},{type:`exercise`,exercise:{id:`e14-alg-2`,kind:`mcq`,prompt:`Qual a derivada de h(x) = (3x + 1)²?`,difficulty:`intermediario`,skills:[`mat-algebra`],hints:[`É f(g(x)) com f(u) = u² e g(x) = 3x + 1.`,`Regra da cadeia: f'(g(x)) · g'(x).`],explanation:`f'(u) = 2u e g'(x) = 3, então h'(x) = 2(3x + 1)·3 = **6(3x + 1)** = 18x + 6.`,options:[{text:`2(3x + 1)`,feedback:`Faltou multiplicar pela derivada de dentro (3).`},{text:`6(3x + 1)`,correct:!0,feedback:`Isso: regra da cadeia.`},{text:`(3x + 1)`,feedback:`Reveja a regra da potência.`},{text:`9x² + 1`,feedback:`Isso não é derivada; e (3x+1)² nem é 9x² + 1.`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e14-alg-desafio`,kind:`code`,lang:`python`,prompt:`Ajuste uma reta y = w·x + b aos pontos dados minimizando o **erro quadrático médio** com descida do gradiente.
Escreva \`ajustar(xs, ys, alfa=0.01, passos=5000)\` que começa em w = b = 0 e devolve \`(w, b)\`.

Gradientes do erro E = média de (w·x + b − y)²:
∂E/∂w = média de 2·(w·x + b − y)·x e ∂E/∂b = média de 2·(w·x + b − y).`,difficulty:`desafio`,skills:[`mat-algebra`],hints:[`A cada passo, calcule os dois gradientes usando todos os pontos.`,`Atualize w e b ao mesmo tempo, com os gradientes calculados antes de mudar qualquer um.`],explanation:`Isso é a regressão linear do Nível 13 treinada "do jeito das redes neurais". O mesmo laço, com milhões de parâmetros e gradientes calculados por retropropagação, treina os modelos de IA modernos.`,starter:`def ajustar(xs, ys, alfa=0.01, passos=5000):
    w, b = 0.0, 0.0
    return w, b
`,solution:`def ajustar(xs, ys, alfa=0.01, passos=5000):
    w, b = 0.0, 0.0
    n = len(xs)
    for _ in range(passos):
        erros = [w * x + b - y for x, y in zip(xs, ys)]
        gw = sum(2 * e * x for e, x in zip(erros, xs)) / n
        gb = sum(2 * e for e in erros) / n
        w -= alfa * gw
        b -= alfa * gb
    return w, b`,tests:[{name:`reta exata`,code:`w, b = ajustar([0, 1, 2, 3, 4], [1, 3, 5, 7, 9])
assert abs(w - 2) < 0.01 and abs(b - 1) < 0.01`},{name:`com ruído`,code:`w, b = ajustar([1, 2, 3, 4, 5, 6], [2.1, 3.9, 6.2, 7.8, 10.1, 12.0])
assert abs(w - 1.98) < 0.05 and abs(b - 0.08) < 0.15`}]}}]},{stage:`projeto`,blocks:[{type:`project`,projectId:`p7-ml`},{type:`md`,text:`No projeto de **machine learning**, implemente primeiro a regressão com descida do gradiente "à mão" (como no desafio), depois compare com a versão do scikit-learn ou NumPy, e mostre num gráfico como o erro cai a cada passo para três taxas de aprendizado diferentes.`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- u · v = Σ uᵢvᵢ; cosseno mede alinhamento; 0 = perpendiculares.
- (n×m)·(m×p) = n×p; A·B ≠ B·A.
- Derivada numérica por diferença central; regra da cadeia = base da retropropagação.
- Descida do gradiente: θ ← θ − α∇f(θ); α controla o passo.`},{type:`callout`,tone:`deep`,text:`*Mathematics for Machine Learning* (Deisenroth, Faisal e Ong) é gratuito e cobre exatamente este caminho. As aulas de Gilbert Strang (MIT 18.06) são a melhor introdução visual à álgebra linear.`,title:`Aprofundando`}]}],cards:[{id:`l14-algebra-calculo#1`,front:`O que significa produto escalar zero?`,back:`Os vetores são perpendiculares (ortogonais).`},{id:`l14-algebra-calculo#2`,front:`Quando A·B está definido?`,back:`Quando o número de colunas de A é igual ao número de linhas de B.`},{id:`l14-algebra-calculo#3`,front:`Fórmula da atualização na descida do gradiente?`,back:`θ ← θ − α·∇f(θ).`},{id:`l14-algebra-calculo#4`,front:`O que a regra da cadeia tem a ver com redes neurais?`,back:`A retropropagação calcula os gradientes aplicando a regra da cadeia camada por camada.`}]};export{e as default};
//# sourceMappingURL=l14-algebra-calculo-yIHGl_Ia.js.map