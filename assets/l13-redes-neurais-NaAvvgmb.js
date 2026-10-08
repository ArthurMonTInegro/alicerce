var e={id:`l13-redes-neurais`,moduleId:`m13-2`,title:`Redes neurais e deep learning`,titleEn:`Neural networks and deep learning`,summary:`O neurônio artificial, ativações, camadas, retropropagação e por que profundidade importa.`,minutes:40,objectives:[`Descrever um neurônio artificial (soma ponderada + ativação)`,`Explicar por que funções de ativação não lineares são necessárias`,`Entender a ideia da retropropagação`,`Conhecer arquiteturas: MLP, CNN, transformer`],skills:[`ia-redes-neurais`],terms:[{pt:`neurônio artificial`,en:`artificial neuron / perceptron`,def:`Calcula uma soma ponderada das entradas e aplica uma ativação.`},{pt:`peso`,en:`weight`,def:`Parâmetro que multiplica cada entrada.`},{pt:`viés`,en:`bias`,def:`Parâmetro somado ao resultado.`},{pt:`função de ativação`,en:`activation function`,def:`Não linearidade aplicada à soma: ReLU, sigmoide.`},{pt:`retropropagação`,en:`backpropagation`,def:`Algoritmo que calcula o gradiente da perda em relação a todos os pesos (regra da cadeia).`},{pt:`época`,en:`epoch`,def:`Uma passada completa pelos dados de treino.`}],references:[`goodfellow-dl`,`stanford-cs231n`,`aima`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:"Um **neurônio artificial** calcula `ativação(w₁x₁ + w₂x₂ + ... + b)`. Empilhando neurônios em **camadas**, uma rede neural consegue aproximar funções muito complexas. **Deep learning** é usar redes com muitas camadas, treinadas com **retropropagação** e gradiente descendente."}]},{stage:`explicacao`,blocks:[{type:`md`,text:`- **Sem ativação não linear**, empilhar camadas lineares dá... outra função linear. A **ReLU** (\`max(0, x)\`) é simples e funciona muito bem.
- **Retropropagação**: aplica a **regra da cadeia** do cálculo para obter, de trás para frente, quanto cada peso contribuiu para o erro. É gradiente descendente com contabilidade eficiente.
- **Arquiteturas**: MLP (camadas densas), **CNN** (convoluções, para imagens), **RNN** (sequências, hoje menos usadas), **Transformer** (atenção; base dos grandes modelos de linguagem).
- Na prática usa-se **PyTorch** ou **JAX**, que calculam gradientes automaticamente (*autograd*).`},{type:`callout`,tone:`info`,text:`Um perceptron sozinho não aprende o XOR (os pontos não são separáveis por uma reta). Com uma camada escondida, aprende. Esse resultado (Minsky e Papert, 1969) e sua superação explicam boa parte da história da IA.`}]},{stage:`exemplo`,blocks:[{type:`viz`,viz:`neuron`,caption:`Um neurônio com duas entradas: ajuste pesos e viés e veja a fronteira de decisão para as portas AND e OR.`}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`# Perceptron aprendendo a porta AND
dados = [((0, 0), 0), ((0, 1), 0), ((1, 0), 0), ((1, 1), 1)]
w1, w2, b, taxa = 0.0, 0.0, 0.0, 0.1

def prever(x1, x2):
    return 1 if w1 * x1 + w2 * x2 + b > 0 else 0

for epoca in range(20):
    erros = 0
    for (x1, x2), y in dados:
        erro = y - prever(x1, x2)
        if erro:
            erros += 1
            w1 += taxa * erro * x1
            w2 += taxa * erro * x2
            b += taxa * erro
    if erros == 0:
        print("convergiu na época", epoca)
        break
print([prever(*x) for x, _ in dados], (round(w1, 2), round(w2, 2), round(b, 2)))`,runnable:!0}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e13-nn-1`,kind:`predict`,lang:`python`,prompt:`O que este neurônio com ReLU imprime?`,difficulty:`facil`,skills:[`ia-redes-neurais`],hints:[`Soma ponderada: 2·1 + (−1)·3 + 0.5.`,`ReLU(z) = max(0, z).`],explanation:`z = 2 − 3 + 0.5 = −0.5; ReLU(−0.5) = 0.`,code:`x = [1, 3]
w = [2, -1]
b = 0.5
z = sum(wi * xi for wi, xi in zip(w, x)) + b
print(max(0, z))`,answer:`0`}},{type:`exercise`,exercise:{id:`e13-nn-2`,kind:`mcq`,prompt:`Por que redes neurais precisam de funções de ativação **não lineares**?`,difficulty:`intermediario`,skills:[`ia-redes-neurais`],hints:[`O que é a composição de duas funções lineares?`],explanation:`Composição de funções lineares é linear: sem não linearidade, uma rede profunda equivale a uma única camada linear e não aprende padrões como o XOR.`,options:[{text:`Para treinar mais rápido`,feedback:`Não é o motivo principal.`},{text:`Porque sem elas várias camadas equivalem a uma única transformação linear`,correct:!0,feedback:`Isso.`},{text:`Para economizar memória`,feedback:`Não tem relação com memória.`},{text:`Para evitar números negativos`,feedback:`Algumas ativações aceitam negativos (tanh).`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e13-nn-desafio`,kind:`code`,lang:`python`,prompt:"Sem treinar, escolha pesos à mão para uma rede de **duas camadas** com ativação degrau que calcula **XOR**. Implemente `xor(a, b)` usando apenas neurônios `degrau(w1*a + w2*b + bias)` (degrau = 1 se > 0, senão 0): dois na camada escondida e um na saída.",difficulty:`desafio`,skills:[`ia-redes-neurais`,`mat-logica`],hints:[`XOR = (a OR b) AND NOT (a AND b).`,`Um neurônio faz OR (w=1,1; bias=−0.5), outro faz AND (w=1,1; bias=−1.5). A saída combina: h_or − h_and − 0.5.`],explanation:`Com uma camada escondida, a rede cria duas fronteiras lineares e as combina — exatamente o que um único perceptron não consegue.`,starter:`def degrau(z):
    return 1 if z > 0 else 0

def xor(a, b):
    return degrau(a + b - 0.5)
`,solution:`def degrau(z):
    return 1 if z > 0 else 0

def xor(a, b):
    h_or = degrau(a + b - 0.5)
    h_and = degrau(a + b - 1.5)
    return degrau(h_or - h_and - 0.5)`,tests:[{name:`tabela-verdade do XOR`,code:`assert [xor(a, b) for a, b in [(0, 0), (0, 1), (1, 0), (1, 1)]] == [0, 1, 1, 0]`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:`**Projeto 7 (parte 2)**: implemente uma rede de uma camada escondida do zero (com NumPy, no seu computador) para classificar dígitos do conjunto MNIST, e depois reimplemente em PyTorch. Compare a quantidade de código e a acurácia.`},{type:`project`,projectId:`p7-ml`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Neurônio: soma ponderada + viés + ativação.
- Não linearidade é essencial.
- Retropropagação = regra da cadeia para calcular gradientes.
- CNN para imagens; Transformer para linguagem.`}]}],cards:[{id:`l13-redes-neurais#1`,front:`O que a retropropagação calcula?`,back:`O gradiente da perda em relação a cada peso, usando a regra da cadeia.`},{id:`l13-redes-neurais#2`,front:`O que faz a ReLU?`,back:`Devolve max(0, x).`}]};export{e as default};
//# sourceMappingURL=l13-redes-neurais-NaAvvgmb.js.map