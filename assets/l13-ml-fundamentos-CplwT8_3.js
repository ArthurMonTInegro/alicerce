var e={id:`l13-ml-fundamentos`,moduleId:`m13-1`,title:`Fundamentos de machine learning`,titleEn:`Machine learning fundamentals`,summary:`Aprender com dados: treino, validação e teste, regressão linear do zero, overfitting e métricas.`,minutes:45,objectives:[`Explicar aprendizado supervisionado e não supervisionado`,`Separar dados em treino, validação e teste`,`Treinar uma regressão linear com gradiente descendente do zero`,`Reconhecer overfitting e escolher métricas`],skills:[`ia-ml`],terms:[{pt:`aprendizado de máquina`,en:`machine learning (ML)`,def:`Programas que melhoram seu desempenho a partir de dados.`},{pt:`conjunto de treino`,en:`training set`,def:`Dados usados para ajustar o modelo.`},{pt:`conjunto de teste`,en:`test set`,def:`Dados nunca vistos no treino, usados para avaliar.`},{pt:`sobreajuste`,en:`overfitting`,def:`O modelo decora o treino e generaliza mal.`},{pt:`função de perda`,en:`loss function`,def:`Mede o erro do modelo; o treino tenta minimizá-la.`},{pt:`gradiente descendente`,en:`gradient descent`,def:`Ajustar parâmetros na direção que mais reduz a perda.`},{pt:`rótulo`,en:`label`,def:`A resposta correta de um exemplo (no aprendizado supervisionado).`}],references:[`stanford-cs229`,`aima`,`google-ml-crash`,`goodfellow-dl`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Em vez de escrever as regras, em **machine learning** mostramos **exemplos** e um algoritmo **ajusta os parâmetros** de um modelo para minimizar o erro. Ex.: dado o tamanho de casas e seus preços, aprender uma função que estima o preço de uma casa nova.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`- **Supervisionado**: exemplos com **rótulo** (preço, spam/não spam). Regressão (número) ou classificação (categoria).
- **Não supervisionado**: sem rótulos — agrupar clientes parecidos (*clustering*).
- **Por reforço**: um agente aprende por tentativa e recompensa.

**Treinar** = minimizar uma **função de perda**. Para regressão linear \`ŷ = w·x + b\`, a perda pode ser o erro quadrático médio (MSE). O **gradiente descendente** calcula a derivada da perda em relação a w e b e dá um pequeno passo (**taxa de aprendizado**) na direção oposta.

**Avaliação honesta**: separe **treino** (ajustar), **validação** (escolher hiperparâmetros) e **teste** (medir no fim, uma vez). Avaliar no próprio treino esconde o **overfitting**: o modelo decora em vez de aprender o padrão.

**Métricas**: regressão → MSE, MAE; classificação → acurácia, precisão, revocação (*recall*), F1. Com classes desbalanceadas (1% de fraudes), acurácia engana: um modelo que diz "nunca é fraude" tem 99%.`},{type:`callout`,tone:`deep`,text:`Dados contam mais que algoritmos: dados enviesados produzem modelos enviesados. Perguntas obrigatórias: de onde vieram os dados? Quem está sub-representado? O que o modelo vai decidir sobre pessoas reais?`,title:`Dados e vieses`}]},{stage:`exemplo`,blocks:[{type:`code`,lang:`python`,code:`# Regressão linear do zero, com gradiente descendente
xs = [1, 2, 3, 4, 5]          # ex.: anos de experiência
ys = [2.1, 3.9, 6.2, 7.8, 10.1]  # ex.: salário (milhares)

w, b, taxa = 0.0, 0.0, 0.02
for epoca in range(2000):
    n = len(xs)
    dw = sum(2 * (w * x + b - y) * x for x, y in zip(xs, ys)) / n
    db = sum(2 * (w * x + b - y) for x, y in zip(xs, ys)) / n
    w -= taxa * dw
    b -= taxa * db
    if epoca % 500 == 0:
        mse = sum((w * x + b - y) ** 2 for x, y in zip(xs, ys)) / n
        print(f"época {epoca:4d}  MSE={mse:.4f}")
print(f"modelo: y = {w:.2f}x + {b:.2f}  | previsão para x=6: {w * 6 + b:.2f}")`,runnable:!0}]},{stage:`codigo`,blocks:[{type:`viz`,viz:`neuron`,caption:`Ajuste peso e viés à mão e veja a perda; depois deixe o gradiente descendente fazer isso por você.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e13-ml-1`,kind:`mcq`,prompt:`Seu modelo tem 99% de acurácia no treino e 62% no teste. O que está acontecendo?`,difficulty:`facil`,skills:[`ia-ml`],hints:[`Desempenho ótimo nos dados vistos, ruim nos novos...`],explanation:`Overfitting: o modelo memorizou o treino. Soluções: mais dados, modelo mais simples, regularização, validação cruzada.`,options:[{text:`Underfitting`,feedback:`Underfitting seria ruim também no treino.`},{text:`Overfitting`,correct:!0,feedback:`Isso: decorou em vez de generalizar.`},{text:`O modelo está perfeito`,feedback:`O que importa é o desempenho em dados novos.`},{text:`O teste está errado`,feedback:`Possível, mas a explicação mais provável é overfitting.`}]}},{type:`exercise`,exercise:{id:`e13-ml-2`,kind:`code`,lang:`python`,prompt:"Escreva `metricas(reais, previstos)` para classificação binária (listas de 0/1) que devolve um dict com `acuracia`, `precisao` e `recall`, arredondados a 2 casas (use 0.0 quando o denominador for zero).",difficulty:`intermediario`,skills:[`ia-ml`],hints:[`Conte VP (1 e 1), FP (real 0, previsto 1), FN (real 1, previsto 0), VN.`,`precisão = VP / (VP + FP); recall = VP / (VP + FN).`],explanation:`Precisão: dos que o modelo marcou como positivos, quantos eram? Recall: dos positivos reais, quantos o modelo achou? Em diagnóstico médico, recall costuma importar mais.`,starter:`def metricas(reais, previstos):
    pass
`,solution:`def metricas(reais, previstos):
    vp = sum(1 for r, p in zip(reais, previstos) if r == 1 and p == 1)
    fp = sum(1 for r, p in zip(reais, previstos) if r == 0 and p == 1)
    fn = sum(1 for r, p in zip(reais, previstos) if r == 1 and p == 0)
    acertos = sum(1 for r, p in zip(reais, previstos) if r == p)
    div = lambda a, b: round(a / b, 2) if b else 0.0
    return {"acuracia": div(acertos, len(reais)), "precisao": div(vp, vp + fp), "recall": div(vp, vp + fn)}`,tests:[{name:`caso típico`,code:`assert metricas([1, 0, 1, 1, 0], [1, 1, 0, 1, 0]) == {"acuracia": 0.6, "precisao": 0.67, "recall": 0.67}`},{name:`modelo que nunca diz 1`,code:`assert metricas([0] * 99 + [1], [0] * 100) == {"acuracia": 0.99, "precisao": 0.0, "recall": 0.0}`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e13-ml-desafio`,kind:`code`,lang:`python`,prompt:"Implemente `knn(treino, ponto, k)` — k vizinhos mais próximos. `treino` é uma lista de `((x, y), rotulo)`. Devolva o rótulo mais comum entre os k pontos mais próximos (distância euclidiana); em empate de votos, o rótulo do vizinho mais próximo entre os empatados.",difficulty:`desafio`,skills:[`ia-ml`,`alg-ordenacao`],hints:[`Ordene o treino pela distância até o ponto e pegue os k primeiros.`,`Conte os votos; para desempatar, percorra os vizinhos em ordem de distância e escolha o primeiro rótulo com o máximo de votos.`],explanation:`k-NN não "treina" nada: guarda os dados e decide por semelhança. É simples, interpretável, e mostra a importância da escolha de k e da escala das variáveis.`,starter:`def knn(treino, ponto, k):
    pass
`,solution:`from collections import Counter

def knn(treino, ponto, k):
    def dist(p):
        return ((p[0] - ponto[0]) ** 2 + (p[1] - ponto[1]) ** 2) ** 0.5
    vizinhos = sorted(treino, key=lambda item: dist(item[0]))[:k]
    votos = Counter(r for _, r in vizinhos)
    maximo = max(votos.values())
    for _, r in vizinhos:
        if votos[r] == maximo:
            return r`,tests:[{name:`classifica`,code:`treino = [((0, 0), "A"), ((0, 1), "A"), ((5, 5), "B"), ((6, 5), "B"), ((5, 6), "B")]
assert knn(treino, (1, 0), 3) == "A" and knn(treino, (5, 5.5), 3) == "B"`},{name:`empate → mais próximo`,code:`treino = [((0, 0), "A"), ((3, 0), "B")]
assert knn(treino, (1, 0), 2) == "A"`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:`**Projeto 7 — Classificador do zero**: com um conjunto de dados público (ex.: Iris, ou dados abertos do governo brasileiro), separe treino/teste, implemente k-NN e uma regressão logística simples, compare métricas e escreva um relatório honesto sobre limitações e vieses.`},{type:`project`,projectId:`p7-ml`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- ML: ajustar parâmetros para minimizar uma perda a partir de dados.
- Treino / validação / teste separados.
- Overfitting: ótimo no treino, ruim em dados novos.
- Métricas certas para o problema (precisão, recall).`}]}],cards:[{id:`l13-ml-fundamentos#1`,front:`Para que serve o conjunto de teste?`,back:`Para estimar, uma única vez no fim, o desempenho em dados nunca vistos.`},{id:`l13-ml-fundamentos#2`,front:`Precisão × recall?`,back:`Precisão: dos marcados como positivos, quantos são. Recall: dos positivos reais, quantos foram encontrados.`},{id:`l13-ml-fundamentos#3`,front:`O que o gradiente descendente faz?`,back:`Ajusta os parâmetros na direção oposta ao gradiente da perda, reduzindo o erro passo a passo.`}]};export{e as default};
//# sourceMappingURL=l13-ml-fundamentos-CplwT8_3.js.map