var e={id:`l4-guloso-intervalos`,moduleId:`m4-5`,title:`Escolha gulosa e prova: escalonamento de intervalos`,titleEn:`Greedy choice and proof: interval scheduling`,summary:`Como saber se um algoritmo guloso está certo: derrubar regras plausíveis com contraexemplos e provar as que resistem com o argumento de troca e com o "guloso se mantém à frente". Aplicado à quadra do bairro (máximo de reservas), às salas da semana de provas (mínimo de salas) e ao ponto em que o guloso para de funcionar e a PD volta: intervalos com valores.`,minutes:50,objectives:[`Derrubar regras gulosas plausíveis com contraexemplos pequenos e com comparação contra força bruta`,`Implementar o escalonamento de intervalos (termina mais cedo primeiro) em O(n log n) e provar que ele é ótimo`,`Calcular o mínimo de salas pela profundidade e alocar salas com uma fila de prioridade`,`Reconhecer quando nenhum guloso serve e resolver intervalos com valores com PD e busca binária`],skills:[`alg-pd`],terms:[{pt:`contraexemplo`,en:`counterexample`,def:`Uma entrada concreta em que a regra dá resposta pior que a ótima; um só basta para derrubar a regra.`},{pt:`escalonamento de intervalos`,en:`interval scheduling`,def:`Escolher o maior número de intervalos que não se sobrepõem dois a dois.`,example:`Interval scheduling is solved by the earliest-finish-time-first greedy algorithm.`},{pt:`intervalo semiaberto`,en:`half-open interval`,def:`[início, fim): inclui o início e exclui o fim; uma reserva que termina às 10h não colide com outra que começa às 10h.`},{pt:`argumento de troca`,en:`exchange argument`,def:`Prova que pega uma solução ótima qualquer e troca, passo a passo, os elementos dela pelos do guloso sem piorar o resultado.`,example:`We prove optimality with an exchange argument.`},{pt:`propriedade da escolha gulosa`,en:`greedy-choice property`,def:`Existe uma solução ótima que contém a escolha gulosa; fazê-la nunca fecha a porta para o ótimo.`},{pt:`o guloso se mantém à frente`,en:`greedy stays ahead`,def:`Prova que mostra, por indução, que depois de cada passo o guloso está pelo menos tão bem quanto qualquer outra solução.`},{pt:`particionamento de intervalos`,en:`interval partitioning`,def:`Distribuir todos os intervalos no menor número de recursos (salas, máquinas) sem sobreposição dentro de cada recurso.`},{pt:`profundidade`,en:`depth`,def:`O maior número de intervalos que acontecem num mesmo instante; é o mínimo de salas necessário.`},{pt:`mochila fracionária`,en:`fractional knapsack`,def:`Mochila em que se pode levar uma fração de cada item; o guloso por valor/peso é ótimo.`},{pt:`escalonamento de intervalos com pesos`,en:`weighted interval scheduling`,def:`Variante em que cada intervalo tem um valor e se quer o maior valor total; nenhuma regra gulosa conhecida resolve, mas a PD resolve em O(n log n).`},{pt:`matroide`,en:`matroid`,def:`Estrutura combinatória em que o guloso "ordene por peso e pegue o que couber" é ótimo para quaisquer pesos; as florestas de um grafo (algoritmo de Kruskal) são o exemplo clássico.`}],references:[`kleinberg-tardos`,`clrs`,`stanford-cs161`,`python-docs`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Um algoritmo guloso monta a resposta uma decisão de cada vez, sempre pela opção que parece melhor agora, e nunca volta atrás. Quando funciona, é imbatível em simplicidade e velocidade: em geral, uma ordenação e uma passada, O(n log n). O problema é que "parece certo" não prova nada. Você já viu dois gulosos plausíveis errarem: o troco com moedas [1, 3, 4] e a mochila 0/1 pela maior razão valor/peso.

Esta lição é sobre o método completo: **propor** uma regra, **atacá-la** com entradas pequenas feitas para quebrá-la e, se ela resistir, **provar** que está certa. O laboratório é um problema do dia a dia: a quadra poliesportiva do bairro recebe pedidos de reserva para o sábado, cada um com hora de início e de fim, e só um grupo usa a quadra por vez. Como atender o maior número de grupos? É o {{escalonamento de intervalos|interval scheduling}}. Há pelo menos quatro regras naturais, e três delas estão erradas.

No fim, duas variações: quantas salas são necessárias para que **todos** os eventos aconteçam (outro guloso, outra prova) e o que muda quando cada pedido tem um valor diferente (o guloso perde, e a PD volta).`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`### O problema
Cada pedido é um {{intervalo semiaberto|half-open interval}} [início, fim): inclui o início e exclui o fim. Assim, uma reserva que termina às 10h e outra que começa às 10h são compatíveis, como na vida real. Dois pedidos p e q são compatíveis quando um termina antes de o outro começar: fim(p) ≤ início(q) ou fim(q) ≤ início(p). Todo pedido tem duração positiva. Queremos o maior conjunto de pedidos compatíveis dois a dois.

### Quatro regras
Todas seguem a mesma ideia: escolher o próximo pedido por algum critério e aceitá-lo se ele não colidir com os já aceitos. Muda só o critério. Para derrubar uma regra basta um {{contraexemplo|counterexample}}:`},{type:`table`,head:[`Regra`,`A intuição`,`Contraexemplo`,`Regra × ótimo`],rows:[[`Começa mais cedo`,`ocupar a quadra logo`,`[0, 10), [1, 2), [3, 4)`,`1 × 2`],[`Mais curto primeiro`,`gastar pouco tempo de quadra`,`[0, 5), [4, 6), [5, 10)`,`1 × 2`],[`Menos conflitos primeiro`,`escolher quem atrapalha menos`,`os 11 pedidos da figura abaixo`,`3 × 4`],[`Termina mais cedo`,`liberar a quadra o quanto antes`,`nenhum: é ótima (prova a seguir)`,`sempre igual`]]},{type:`md`,text:`Os dois primeiros contraexemplos se conferem de cabeça: [0, 10) começa antes de todos e bloqueia os dois pedidos curtos; [4, 6) é o mais curto e colide com [0, 5) e com [5, 10), que cabiam juntos. O terceiro precisa de mais pedidos:`},{type:`code`,lang:`text`,code:`    0  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19
T1  [===========)
T2                 [===========)
T3                                [===========)
T4                                               [===========)
L            [========)
L            [========)
L            [========)
M                           [========)
R                                          [========)
R                                          [========)
R                                          [========)`,runnable:!1,caption:`T1 a T4 são compatíveis entre si: o ótimo é 4. Os três L são iguais, e os três R também.`},{type:`md`,text:`Contando os conflitos: T1 e T4 têm 3 cada; T2, T3, cada L e cada R têm 4; M tem só 2 (T2 e T3). A regra escolhe M, que elimina T2 e T3. Do que sobra, o grupo da esquerda (T1 e os três L, que colidem todos com todos) rende um pedido, e o da direita também: total 3, contra 4 do ótimo, qualquer que seja o desempate.`},{type:`callout`,tone:`tip`,text:`Comece com 2 ou 3 intervalos. Pergunte o que a regra "gosta" de escolher (o mais curto, o que começa cedo) e monte um caso em que essa escolha atrapalha dois pedidos que caberiam juntos. Depois, automatize: compare a regra com a força bruta em centenas de entradas pequenas sorteadas, como no código desta lição. Só não confunda passar nos testes com estar certo: a regra "menos conflitos" passa em 300 sorteios e mesmo assim está errada. Teste derruba regras; só uma prova confirma.`,title:`Como caçar contraexemplos`},{type:`md`,text:`### O algoritmo: termina mais cedo primeiro
1. Ordene os pedidos pelo fim.
2. Percorra-os nessa ordem, guardando a hora em que a quadra fica livre (o fim do último aceito).
3. Aceite o pedido se ele começa quando a quadra já está livre (início ≥ livre) e atualize livre = fim dele.

Comparar só com o último aceito basta: os aceitos não se sobrepõem e saem em ordem de fim, então o último é o que termina mais tarde, e quem começa depois dele começa depois de todos. Custo: O(n log n) da ordenação mais O(n) da passada.

### Por que está certo: duas provas
**Argumento de troca.** O {{argumento de troca|exchange argument}} pega uma solução ótima qualquer e a transforma, sem piorar, até ela coincidir com a do guloso. Seja g o pedido que termina mais cedo de todos e seja O uma solução ótima, em ordem de fim, começando por o₁. Como g termina mais cedo de todos, fim(g) ≤ fim(o₁). Os outros pedidos de O começam a partir de fim(o₁), porque são compatíveis com o₁ e terminam depois dele; logo, também começam depois de fim(g). Trocar o₁ por g não cria conflito, e O continua com o mesmo tamanho. Existe, então, uma solução ótima que contém g: é a {{propriedade da escolha gulosa|greedy-choice property}}, a escolha gulosa nunca fecha a porta para o ótimo. Depois dela sobra o mesmo problema, menor, com os pedidos que começam a partir de fim(g) (subestrutura ótima), e por indução cada escolha seguinte também é segura.

**O guloso se mantém à frente.** A segunda técnica, {{o guloso se mantém à frente|greedy stays ahead}}, compara as duas soluções passo a passo. Sejam g₁, g₂, …, gₖ os pedidos do guloso e o₁, o₂, …, oₘ os de uma solução ótima, ambos em ordem de fim. Afirmação: fim(gᵣ) ≤ fim(oᵣ) para todo r ≤ k. Para r = 1, é a própria regra. Se vale para r − 1, então oᵣ começa a partir de fim(oᵣ₋₁) ≥ fim(gᵣ₋₁): oᵣ estava disponível quando o guloso fez a escolha r, e o guloso pegou o disponível que termina mais cedo; logo, fim(gᵣ) ≤ fim(oᵣ). Agora suponha m > k: oₖ₊₁ começaria a partir de fim(oₖ) ≥ fim(gₖ), e o guloso não teria parado com um pedido compatível sobrando. Então m = k.

### Outro problema, outra prova: quantas salas?
Agora a pergunta muda. Na semana de provas do cursinho, **todas** as provas precisam acontecer, cada uma numa sala, e uma sala não recebe duas provas ao mesmo tempo. Qual é o menor número de salas? É o {{particionamento de intervalos|interval partitioning}}.

Aqui a prova não é por troca, e sim por um **limite estrutural**. A {{profundidade|depth}} d de um conjunto de intervalos é o maior número deles acontecendo num mesmo instante. Ninguém resolve com menos de d salas, porque as d provas simultâneas precisam de salas diferentes. O guloso a seguir usa exatamente d:

1. Percorra as provas em ordem de **início**.
2. Se alguma sala já está livre no início da prova, use-a; senão, abra uma sala nova.

Por que nunca passa de d: suponha que a prova p obrigou a abrir a sala número k + 1. Então as k salas abertas estavam ocupadas no instante início(p), cada uma com uma prova que começou antes ou no mesmo horário (a ordem é de início) e ainda não terminou. Com p, são k + 1 provas acontecendo no mesmo instante, logo k + 1 ≤ d. Como d também é um limite inferior, o guloso é ótimo.

Para saber depressa se alguma sala está livre, basta olhar a que **fica livre mais cedo**: é trabalho para uma fila de prioridade (\`heapq\`), e o total fica O(n log n).`},{type:`callout`,tone:`warn`,text:`Trocar a ordem para "pelo fim", como no problema anterior, quebra o argumento. Com [2, 8), [3, 4), [6, 11) e [8, 10), essa versão abre 3 salas, mas a profundidade é 2: [2, 8) e [8, 10) cabem numa sala, [3, 4) e [6, 11) na outra. Cada guloso tem a sua ordem, e é a prova que diz qual é.`,title:`Aqui a ordem é pelo início`},{type:`md`,text:`### Quando nenhum guloso serve
Os dois problemas anteriores têm guloso provado. Basta mudar um detalhe para isso acabar:`},{type:`table`,head:[`Problema`,`Regra gulosa`,`Dá o ótimo?`,`Como resolver`],rows:[[`Escalonamento de intervalos`,`termina mais cedo`,`sim (troca ou "à frente")`,`guloso, O(n log n)`],[`Particionamento de intervalos`,`em ordem de início, sala que fica livre primeiro`,`sim (profundidade)`,`guloso com heap, O(n log n)`],[`Mochila fracionária`,`maior valor por kg; o último item entra fracionado`,`sim (troca)`,`guloso, O(n log n)`],[`Mochila 0/1`,`maior valor por kg`,`não`,`PD, Θ(n · W)`],[`Troco`,`maior moeda que cabe`,`depende das moedas: sim no real, não com [1, 3, 4]`,`PD, Θ(V · k) para k moedas`],[`Intervalos com valores`,`nenhuma regra conhecida`,`não`,`PD com busca binária, O(n log n)`]]},{type:`md`,text:`Na {{mochila fracionária|fractional knapsack}} (dá para levar meio saco de arroz), a troca funciona: se uma solução leva menos do que poderia do item de maior valor por kg e um pouco de um item pior, trocar um pedaço do pior pelo mesmo peso do melhor não diminui o valor. Na 0/1 essa troca é impossível, porque os itens não se dividem, e por isso o guloso falha.

O caso mais instrutivo é o {{escalonamento de intervalos com pesos|weighted interval scheduling}}. O salão de festas do condomínio recebe propostas de aluguel, cada uma com um valor, e quer o maior faturamento:

- **termina mais cedo**: com [0, 3) por R$ 100 e [2, 10) por R$ 1 000, aceita a primeira e perde a segunda;
- **maior valor primeiro**: com [0, 10) por R$ 1 000, [0, 5) por R$ 600 e [5, 10) por R$ 600, aceita a de R$ 1 000 e perde para R$ 1 200;
- não se conhece regra gulosa que funcione: saber se uma proposta vale a pena exige comparar a melhor agenda com ela e sem ela.

É programação dinâmica de novo, e com uma busca binária ela roda em O(n log n): é o desafio desta lição.`},{type:`callout`,tone:`deep`,text:`Existe uma teoria por trás de parte dos gulosos corretos. Quando os conjuntos "viáveis" de um problema formam um {{matroide|matroid}} (entre outras condições: se A e B são viáveis e B é maior, algum elemento de B pode ser acrescentado a A sem perder a viabilidade), o guloso "ordene por peso e pegue o que couber" é ótimo para **quaisquer** pesos não negativos (teorema de Rado–Edmonds). O exemplo clássico são as florestas de um grafo, e o guloso correspondente é o algoritmo de Kruskal da árvore geradora mínima.

O escalonamento de intervalos **não** é um matroide: A = {[0, 10)} e B = {[0, 1), [2, 3)} são viáveis, B é maior, e nenhum elemento de B cabe junto com [0, 10). Por isso a prova dele é feita à mão, com troca ou "à frente". Fora dos matroides, cada guloso novo precisa da sua própria prova.`,title:`Por que alguns gulosos funcionam?`}]},{stage:`exemplo`,blocks:[{type:`md`,text:`### A quadra no sábado
Nove pedidos chegaram para a quadra (horas do dia, intervalos semiabertos):`},{type:`code`,lang:`text`,code:`              6  7  8  9  10 11 12 13 14 15 16
Corrida       [=======================)
Ginástica        [=====)
Futsal sub-15       [=====)
Vôlei                  [=====)
Basquete                  [========)
Handebol                     [==)
Futsal adulto                      [=====)
Capoeira                              [=====)
Festa junina                    [===========)`,runnable:!1},{type:`md`,text:`Ordenados pelo fim, o guloso decide assim ("livre" é a hora em que a quadra fica livre):`},{type:`table`,head:[`Pedido`,`Horário`,`Livre a partir de`,`Decisão`],rows:[[`Ginástica`,`[7, 9)`,`—`,`**aceita**; livre = 9`],[`Futsal sub-15`,`[8, 10)`,`9`,`recusa: começa às 8, antes das 9`],[`Vôlei`,`[9, 11)`,`9`,`**aceita** (começa exatamente às 9); livre = 11`],[`Handebol`,`[11, 12)`,`11`,`**aceita**; livre = 12`],[`Basquete`,`[10, 13)`,`12`,`recusa`],[`Corrida`,`[6, 14)`,`12`,`recusa`],[`Futsal adulto`,`[13, 15)`,`12`,`**aceita**; livre = 15`],[`Capoeira`,`[14, 16)`,`15`,`recusa`],[`Festa junina`,`[12, 16)`,`15`,`recusa`]],caption:`Quatro grupos atendidos: Ginástica, Vôlei, Handebol e Futsal adulto. A força bruta confirma que 4 é o máximo.`},{type:`md`,text:`Compare com as outras regras nos mesmos pedidos:

- **começa mais cedo** aceita a Corrida (das 6h às 14h), que bloqueia a manhã inteira, e depois só a Capoeira: **2** grupos;
- **mais curto primeiro** começa pelo Handebol (1 hora) e, nesta entrada, desempatando os pedidos de 2 horas pela ordem da lista, também chega a 4. Uma regra errada pode acertar em muitas entradas: quem prova o erro é o contraexemplo, não o caso que deu certo.

E veja o "se mantém à frente" funcionando. Outra agenda ótima é Ginástica, Vôlei, Handebol e Capoeira, que termina às 9, 11, 12 e 16. A do guloso termina às 9, 11, 12 e 15: em cada posição, empatada ou à frente.`}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`import random
from itertools import combinations

def agenda(pedidos):
    """Guloso ótimo: termina mais cedo primeiro. O(n log n)."""
    aceitos, livre = [], float("-inf")
    for nome, ini, fim in sorted(pedidos, key=lambda p: p[2]):
        if ini >= livre:                 # [ini, fim) não colide com o último aceito
            aceitos.append(nome)
            livre = fim
    return aceitos

def compativeis(p, q):
    return p[2] <= q[1] or q[2] <= p[1]   # um termina antes de o outro começar

def guloso_por(chave, pedidos):           # esqueleto genérico: confere com todos os aceitos
    aceitos = []
    for p in sorted(pedidos, key=chave):
        if all(compativeis(p, q) for q in aceitos):
            aceitos.append(p)
    return len(aceitos)

def menos_conflitos(pedidos):
    resto, total = list(pedidos), 0
    while resto:
        p = min(resto, key=lambda p: sum(not compativeis(p, q) for q in resto if q is not p))
        total += 1
        resto = [q for q in resto if q is not p and compativeis(p, q)]
    return total

def otimo(pedidos):                       # força bruta: do maior grupo para o menor
    for k in range(len(pedidos), 0, -1):
        for grupo in combinations(pedidos, k):
            if all(compativeis(p, q) for p, q in combinations(grupo, 2)):
                return k
    return 0

quadra = [("Corrida", 6, 14), ("Ginástica", 7, 9), ("Futsal sub-15", 8, 10), ("Vôlei", 9, 11),
          ("Basquete", 10, 13), ("Handebol", 11, 12), ("Futsal adulto", 13, 15),
          ("Capoeira", 14, 16), ("Festa junina", 12, 16)]
print("Agenda da quadra:", agenda(quadra))

regras = {
    "começa mais cedo": lambda ps: guloso_por(lambda p: p[1], ps),
    "mais curto": lambda ps: guloso_por(lambda p: p[2] - p[1], ps),
    "menos conflitos": menos_conflitos,
    "termina mais cedo": lambda ps: len(agenda(ps)),
}
random.seed(2026)
falhas = dict.fromkeys(regras, 0)
for _ in range(300):
    ps = [(k, ini, ini + random.randint(1, 8)) for k, ini in enumerate(random.choices(range(20), k=8))]
    melhor = otimo(ps)
    for nome, regra in regras.items():
        falhas[nome] += regra(ps) < melhor
print("Em 300 sorteios de 8 pedidos, vezes em que a regra perdeu para o ótimo:")
for nome, n in falhas.items():
    print(f"  {nome:<18} {n}")`,runnable:!0,caption:`Força bruta como juiz: duas regras caem logo; "menos conflitos" passa em todos os sorteios e ainda assim está errada (veja a figura da explicação). Mude a semente, o tamanho e a duração máxima dos pedidos e rode de novo.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e4-int-1`,kind:`mcq`,prompt:`A regra "aceite primeiro o pedido que **começa mais cedo**" recebe [8h, 12h), [9h, 10h) e [10h, 11h). Quantos grupos ela atende, e quantos o ótimo atende?`,difficulty:`facil`,skills:[`alg-pd`],hints:[`Qual dos três pedidos começa primeiro? Depois de aceitá-lo, algum outro ainda cabe?`,`[9h, 10h) e [10h, 11h) colidem? Lembre que o fim fica de fora do intervalo.`],explanation:`A regra aceita [8h, 12h) por começar primeiro, e ele colide com os outros dois. Já [9h, 10h) e [10h, 11h) são compatíveis (um termina exatamente quando o outro começa), então o ótimo é 2. Começar cedo não diz nada sobre quanto tempo o pedido prende a quadra.`,options:[{text:`1 contra 2: ela aceita [8h, 12h), que bloqueia os outros dois, compatíveis entre si.`,correct:!0,feedback:`Isso. Um único pedido longo, escolhido por começar cedo, ocupa o lugar de dois.`},{text:`2 contra 2: [9h, 10h) e [10h, 11h) também começam cedo.`,feedback:`A regra olha primeiro quem começa mais cedo de todos, [8h, 12h). Depois de aceitá-lo, os outros dois colidem com ele e são recusados.`},{text:`1 contra 1: os três pedidos colidem entre si.`,feedback:`[9h, 10h) e [10h, 11h) não colidem: com intervalos semiabertos, terminar às 10h e começar às 10h não é conflito.`},{text:`3 contra 3: começando cedo, sobra tempo para todos.`,feedback:`[8h, 12h) colide com os outros dois, então nenhuma agenda tem os três.`}]}},{type:`exercise`,exercise:{id:`e4-int-2`,kind:`predict`,lang:`python`,prompt:`O que este código imprime? Ele roda o mesmo esqueleto guloso com dois critérios de ordenação.`,difficulty:`intermediario`,skills:[`alg-pd`],hints:[`p[1] é o início e p[2] é o fim. Em que ordem cada chamada percorre os pedidos?`,`Na primeira chamada, depois de aceitar a Ana, quanto vale livre? Quem começa a partir desse horário?`,`Na segunda, acompanhe livre a cada aceite: 10, depois…?`],explanation:`Por início, Ana (8h às 12h) entra primeiro e prende a quadra até as 12h; Bruno, Carla e Davi começam antes disso e são recusados, e só Eva (12h) cabe. Por fim, a ordem é Bruno (10), Carla (11), Ana (12), Davi (13), Eva (14): Bruno entra (livre = 10), Carla começa às 10 e entra (livre = 11), Ana começa às 8 e fica de fora, Davi começa às 11 e entra (livre = 13), Eva começa às 12 e fica de fora. Três contra dois.`,code:`def guloso(pedidos, chave):
    escolhidos, livre = [], 0
    for nome, ini, fim in sorted(pedidos, key=chave):
        if ini >= livre:
            escolhidos.append(nome)
            livre = fim
    return escolhidos

pedidos = [("Ana", 8, 12), ("Bruno", 9, 10), ("Carla", 10, 11),
           ("Davi", 11, 13), ("Eva", 12, 14)]
print(guloso(pedidos, lambda p: p[1]))
print(guloso(pedidos, lambda p: p[2]))`,answer:`['Ana', 'Eva']
['Bruno', 'Carla', 'Davi']`}},{type:`exercise`,exercise:{id:`e4-int-3`,kind:`mcq`,prompt:`Na prova por troca, g é o pedido que termina mais cedo de todos e o₁ é o primeiro pedido (em ordem de fim) de uma solução ótima O. Por que trocar o₁ por g em O não cria conflito?`,difficulty:`intermediario`,skills:[`alg-pd`],hints:[`O que a definição de g garante sobre o fim de g, comparado com o fim de o₁?`,`Os outros pedidos de O começam antes ou depois de o₁ terminar? Por quê?`,`Junte as duas coisas: onde termina g, e onde começam os outros pedidos de O?`],explanation:`A troca só usa duas desigualdades: fim(g) ≤ fim(o₁), porque g termina mais cedo de todos, e início(oᵢ) ≥ fim(o₁) para i ≥ 2, porque O não tem conflitos e está em ordem de fim. Juntas, dão início(oᵢ) ≥ fim(g): g cabe no lugar de o₁. Nada sobre a duração ou o início de g é usado, e é por isso que as regras "mais curto" e "começa mais cedo" não têm essa prova (nem estão certas).`,options:[{text:`Porque fim(g) ≤ fim(o₁), e todos os outros pedidos de O começam a partir de fim(o₁); logo, começam depois que g termina.`,correct:!0,feedback:`Isso. As duas desigualdades juntas garantem que g ocupa o lugar de o₁ sem esbarrar em ninguém.`},{text:`Porque g é o pedido mais curto, e um pedido mais curto colide com menos pedidos.`,feedback:`g não precisa ser o mais curto, e "mais curto primeiro" tem contraexemplo. O que importa é onde g termina, não quanto ele dura.`},{text:`Porque g começa antes de todos os outros pedidos.`,feedback:`g pode começar tarde; ele só termina cedo. E começar cedo não evita conflito: [8h, 12h) começa cedo e atrapalha todo mundo.`},{text:`Porque g não colide com nenhum outro pedido da entrada.`,feedback:`g pode colidir com vários pedidos da entrada, inclusive com o₁. A prova só precisa que ele não colida com os pedidos que continuam em O depois da troca.`}]}},{type:`exercise`,exercise:{id:`e4-int-4`,kind:`code`,lang:`python`,prompt:"A coordenação do cursinho precisa marcar as provas da semana. Cada prova é uma tupla `(inicio, fim)` com horários inteiros e intervalo semiaberto [inicio, fim), e uma sala não pode receber duas provas ao mesmo tempo (uma que termina às 10 e outra que começa às 10 podem usar a mesma sala).\n\nEscreva `salas_necessarias(provas)` que devolve o **menor número de salas** para todas as provas acontecerem. Exemplo: `salas_necessarias([(8, 10), (9, 12), (9, 11), (10, 11), (11, 13)])` devolve 3.\n\nFaça em O(n log n): os testes contam as comparações entre horários com 2 000 provas.",difficulty:`intermediario`,skills:[`alg-pd`,`ed-arvores`],hints:[`Antes de programar: se em algum instante 3 provas acontecem ao mesmo tempo, dá para usar menos de 3 salas? E pode ser preciso mais do que o máximo de provas simultâneas?`,`Em que ordem as provas devem ser consideradas para que o guloso da lição funcione?`,`Para cada prova, basta saber se a sala que fica livre mais cedo já está livre. Que estrutura devolve o menor elemento em O(log n)?`,`Uma prova que começa exatamente quando outra termina pode usar a mesma sala. A sua comparação usa < ou <=?`,`Teste [(2, 8), (3, 4), (6, 11), (8, 10)]: a resposta é 2. Por qual campo você está ordenando?`],explanation:`Em ordem de início, cada prova reaproveita a sala que fica livre mais cedo, se ela já estiver livre (fim <= início, porque o intervalo é semiaberto), ou abre uma sala nova. Uma heap com o horário de fim de cada sala responde isso em O(log n), e o total é O(n log n). O número de salas abertas nunca passa da profundidade, que também é o mínimo possível. Outra solução válida varre os eventos (+1 no início, −1 no fim, com os fins antes dos inícios no mesmo horário) e devolve o maior valor da soma acumulada.`,starter:`import heapq

def salas_necessarias(provas):
    # devolva o menor número de salas para que nenhuma sala
    # receba duas provas ao mesmo tempo
    pass`,solution:`import heapq

def salas_necessarias(provas):
    livres_em = []                     # heap: horário em que cada sala aberta fica livre
    for inicio, fim in sorted(provas):
        if livres_em and livres_em[0] <= inicio:
            heapq.heapreplace(livres_em, fim)    # reaproveita a sala que liberou primeiro
        else:
            heapq.heappush(livres_em, fim)       # todas ocupadas: abre uma sala
    return len(livres_em)`,tests:[{name:`exemplo do enunciado`,code:`_r = salas_necessarias([(8, 10), (9, 12), (9, 11), (10, 11), (11, 13)])
assert _r == 3, f"às 10h30 acontecem (9, 12), (9, 11) e (10, 11): são precisas 3 salas; veio {_r}"`},{name:`nenhuma, uma, encostadas, iguais e aninhadas`,code:`_casos = [
    ([], 0, "sem provas, nenhuma sala"),
    ([(8, 9)], 1, "uma prova, uma sala"),
    ([(8, 10), (10, 12)], 1, "a prova das 10 pode usar a sala que liberou às 10 (intervalo semiaberto)"),
    ([(9, 11), (9, 11), (9, 11)], 3, "três provas no mesmo horário precisam de três salas"),
    ([(8, 18), (9, 10), (11, 12)], 2, "a prova longa ocupa uma sala; as curtas revezam a outra"),
]
for _provas, _esperado, _motivo in _casos:
    _r = salas_necessarias(list(_provas))
    assert _r == _esperado, f"salas_necessarias({_provas}) deveria ser {_esperado} ({_motivo}); veio {_r}"`},{name:`a ordem é pelo início`,code:`_r = salas_necessarias([(2, 8), (3, 4), (6, 11), (8, 10)])
assert _r == 2, f"[(2, 8), (3, 4), (6, 11), (8, 10)] cabe em 2 salas: (2, 8) e (8, 10) numa, (3, 4) e (6, 11) na outra; veio {_r}. Se você ordenou pelo fim, troque para o início: pelo fim, o guloso abre sala demais"`},{name:`aleatório`,code:`import random

def _profundidade(provas):
    eventos = sorted([(f, -1) for _, f in provas] + [(i, 1) for i, _ in provas])
    atual = maior = 0
    for _, d in eventos:
        atual += d
        maior = max(maior, atual)
    return maior

for _ in range(300):
    _provas = []
    for _ in range(random.randint(0, 12)):
        _i = random.randint(0, 20)
        _provas.append((_i, _i + random.randint(1, 6)))
    _r = salas_necessarias(list(_provas))
    _e = _profundidade(_provas)
    assert _r == _e, f"salas_necessarias({_provas}) deveria ser {_e}; veio {_r}"`},{name:`O(n log n) com 2 000 provas`,code:`class _Hora(int):
    usadas = 0
    limite = None
    msg = ""

    @classmethod
    def prepara(cls, limite, msg):
        cls.usadas, cls.limite, cls.msg = 0, limite, msg

    def _conta(self):
        _Hora.usadas += 1
        if _Hora.limite is not None and _Hora.usadas > _Hora.limite:
            _Hora.limite = None
            raise AssertionError(_Hora.msg)

    def __lt__(self, o):
        self._conta()
        return int.__lt__(self, o)

    def __le__(self, o):
        self._conta()
        return int.__le__(self, o)

    def __gt__(self, o):
        self._conta()
        return int.__gt__(self, o)

    def __ge__(self, o):
        self._conta()
        return int.__ge__(self, o)
import random

def _profundidade(provas):
    eventos = sorted([(f, -1) for _, f in provas] + [(i, 1) for i, _ in provas])
    atual = maior = 0
    for _, d in eventos:
        atual += d
        maior = max(maior, atual)
    return maior

_provas = []
for _ in range(2000):
    _i = random.randrange(1000000)
    _provas.append((_i, _i + random.randint(1, 500000)))
_e = _profundidade(_provas)
_Hora.prepara(300000, "com 2 000 provas, a sua função passou de 300 000 comparações entre horários (a versão com heap faz cerca de 40 000). Você está procurando uma sala livre percorrendo todas? Use uma fila de prioridade (heapq) com o horário em que cada sala fica livre.")
_r = salas_necessarias([(_Hora(a), _Hora(b)) for a, b in _provas])
_Hora.limite = None
assert _r == _e, f"com 2 000 provas, o mínimo é {_e} salas; veio {_r}"`}]}},{type:`exercise`,exercise:{id:`e4-int-5`,kind:`fix`,lang:`python`,prompt:'Na feira livre de domingo, cada barraca fica aberta num intervalo **fechado** `[abre, fecha]` (inclui os dois horários). A fiscal da vigilância sanitária faz visitas instantâneas: uma visita no horário t fiscaliza todas as barracas abertas em t. `visitas_minimas(barracas)` deveria devolver o menor número de visitas para fiscalizar todas, com o guloso "marque a visita no último instante da barraca que **fecha** primeiro e pule as que essa visita já pegou".\n\nO código tem **dois** defeitos: para `[(1, 10), (2, 3), (4, 5)]` ele devolve 1 (o certo é 2) e para `[(1, 3), (3, 5)]` devolve 2 (o certo é 1, com uma visita às 3). Corrija-os.',difficulty:`intermediario`,skills:[`alg-pd`],hints:[`Em que ordem o código percorre as barracas? Em que ordem o guloso descrito no enunciado deveria percorrer?`,`Com [(1, 10), (2, 3), (4, 5)], a primeira visita fica marcada para que horário? A barraca (2, 3) está aberta nesse horário?`,`Com intervalos fechados, uma barraca que abre exatamente no horário da última visita foi fiscalizada ou não?`,`Releia a condição do if: ela pergunta "a última visita deixou esta barraca de fora?". Para quais valores de abre a resposta é sim?`],explanation:`Defeito 1: sorted(barracas) ordena pela abertura. O argumento de troca vale para a barraca que **fecha** primeiro: visitá-la no último instante (fecha) pega o máximo de outras barracas. Ordenando pela abertura, a visita às 10 da barraca (1, 10) "passa por cima" da (2, 3), que já tinha fechado. Defeito 2: com intervalos fechados, a barraca que abre exatamente no horário da última visita está aberta naquele instante e já foi fiscalizada; só é preciso visita nova quando abre > ultima. É o mesmo raciocínio do escalonamento de intervalos, e as barracas que forçam uma visita nova não têm nenhum horário em comum duas a duas, o que prova que menos visitas não bastam.`,starter:`def visitas_minimas(barracas):
    # barracas: lista de (abre, fecha), intervalos FECHADOS [abre, fecha]
    visitas = 0
    ultima = None                    # horário da última visita marcada
    for abre, fecha in sorted(barracas):
        if ultima is None or abre >= ultima:    # a última visita não pegou esta barraca
            visitas += 1
            ultima = fecha           # visita no último instante em que ela está aberta
    return visitas`,solution:`def visitas_minimas(barracas):
    # barracas: lista de (abre, fecha), intervalos FECHADOS [abre, fecha]
    visitas = 0
    ultima = None                    # horário da última visita marcada
    for abre, fecha in sorted(barracas, key=lambda b: b[1]):
        if ultima is None or abre > ultima:     # a última visita não pegou esta barraca
            visitas += 1
            ultima = fecha           # visita no último instante em que ela está aberta
    return visitas`,tests:[{name:`barraca aberta a feira toda`,code:`_r = visitas_minimas([(1, 10), (2, 3), (4, 5)])
assert _r == 2, f"[(1, 10), (2, 3), (4, 5)] precisa de 2 visitas (às 3 e às 5); veio {_r}. Uma visita às 10 não pega a barraca (2, 3)"`},{name:`horários encostados (intervalo fechado)`,code:`_r = visitas_minimas([(1, 3), (3, 5)])
assert _r == 1, f"[(1, 3), (3, 5)]: uma visita às 3 pega as duas barracas, porque os intervalos são fechados; veio {_r}"`},{name:`bordas`,code:`for _bs, _e in [([], 0), ([(2, 6)], 1), ([(5, 5)], 1), ([(1, 4), (1, 4), (1, 4)], 1), ([(1, 2), (3, 4), (5, 6)], 3)]:
    _r = visitas_minimas(list(_bs))
    assert _r == _e, f"visitas_minimas({_bs}) deveria ser {_e}; veio {_r}"`},{name:`aleatório contra força bruta`,code:`import random
from itertools import combinations

def _minimo(barracas):
    if not barracas:
        return 0
    pontos = sorted({f for _, f in barracas})
    for k in range(1, len(barracas) + 1):
        for grupo in combinations(pontos, k):
            if all(any(a <= p <= f for p in grupo) for a, f in barracas):
                return k

for _ in range(300):
    _bs = []
    for _ in range(random.randint(0, 7)):
        _a = random.randint(0, 15)
        _bs.append((_a, _a + random.randint(0, 5)))
    _r = visitas_minimas(list(_bs))
    _e = _minimo(_bs)
    assert _r == _e, f"visitas_minimas({_bs}) deveria ser {_e}; veio {_r}"`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e4-int-desafio`,kind:`code`,lang:`python`,prompt:"O salão de festas do condomínio recebe propostas de aluguel. Cada proposta é uma tupla `(inicio, fim, valor)`: horários inteiros com inicio < fim, intervalo semiaberto [inicio, fim), e valor em reais (inteiro positivo). Só cabe um evento por vez; um que termina às 18 e outro que começa às 18 são compatíveis.\n\nEscreva `melhor_faturamento(propostas)` que devolve o **maior faturamento total** possível com propostas compatíveis entre si. Exemplo: `melhor_faturamento([(0, 10, 1000), (0, 5, 600), (5, 10, 600)])` devolve 1200.\n\nA solução precisa ser O(n log n): os testes contam as comparações entre horários com 4 000 propostas muito sobrepostas, e nesse teste os horários são números grandes (milissegundos, como os do relógio do sistema). Como n chega a milhares, prefira PD bottom-up a recursão (o limite de recursão do Python fica perto de 1 000).",difficulty:`desafio`,skills:[`alg-pd`,`alg-busca`],hints:[`Ordene as propostas pelo fim e pense na última delas. Na agenda ótima, ela entra ou não entra? O que sobra para decidir em cada caso?`,`Se ela não entra, a resposta é o ótimo das propostas anteriores. Se entra, quais das anteriores continuam compatíveis com ela? Elas formam um prefixo da lista ordenada?`,`Defina melhor[j] = maior faturamento usando só as j primeiras propostas, em ordem de fim. Qual é a recorrência, e quanto vale melhor[0]?`,`Para achar quantas propostas anteriores terminam até o início da proposta j, não é preciso percorrer a lista: os fins estão em ordem. Que módulo da biblioteca padrão faz busca binária? Um fim igual ao início deve contar como compatível?`,`Se o teste de comparações falhou: quantas comparações a sua busca pela última proposta compatível faz, por proposta, quando há muita sobreposição?`],explanation:`Em ordem de fim, seja p(j) o número de propostas anteriores que terminam até o início da j-ésima; elas formam um prefixo, porque os fins estão ordenados. Então melhor[j] = max(melhor[j − 1], valor_j + melhor[p(j)]): ou a proposta j fica de fora, ou entra e só as p(j) primeiras continuam disponíveis. São n estados, cada um com uma busca binária (bisect_right nos fins, para que fim igual ao início conte como compatível): O(n log n), contando a ordenação. Procurar p(j) andando para trás na lista também está certo, mas custa O(n) por proposta quando há muita sobreposição, O(n²) no total. Uma PD indexada pelo horário (o melhor até cada instante t) também acerta, mas é pseudopolinomial, como a mochila: com horários em milissegundos, a tabela não cabe na memória. Nenhuma regra gulosa resolve, como mostram os contraexemplos da lição: é o ponto em que a PD retoma o lugar do guloso.`,starter:`def melhor_faturamento(propostas):
    # propostas: lista de (inicio, fim, valor)
    # devolva o maior faturamento com propostas que não se sobrepõem
    pass`,solution:`from bisect import bisect_right

def melhor_faturamento(propostas):
    ps = sorted(propostas, key=lambda p: p[1])
    fins = [p[1] for p in ps]
    melhor = [0] * (len(ps) + 1)        # melhor[j]: ótimo com as j primeiras (por fim)
    for j, (inicio, fim, valor) in enumerate(ps, start=1):
        k = bisect_right(fins, inicio, 0, j - 1)   # anteriores que terminam até inicio
        melhor[j] = max(melhor[j - 1], valor + melhor[k])
    return melhor[-1]`,tests:[{name:`exemplos: os gulosos perdem`,code:`_r = melhor_faturamento([(0, 10, 1000), (0, 5, 600), (5, 10, 600)])
assert _r == 1200, f"(0, 5) e (5, 10) juntas valem 1200, mais que a de 1000 sozinha; veio {_r}"
_r = melhor_faturamento([(0, 3, 100), (2, 10, 1000)])
assert _r == 1000, f"as duas colidem, e a de 1000 vale mais, mesmo terminando depois; veio {_r}"`},{name:`bordas`,code:`_casos = [
    ([], 0, "sem propostas, nada a faturar"),
    ([(8, 12, 500)], 500, "uma proposta só"),
    ([(8, 10, 5), (10, 12, 5)], 10, "terminar às 10 e começar às 10 é compatível"),
    ([(1, 5, 3), (1, 5, 3), (1, 5, 3)], 3, "propostas iguais colidem entre si"),
    ([(0, 100, 50), (10, 20, 30), (30, 40, 30)], 60, "duas curtas dentro da longa valem mais que ela"),
]
for _ps, _e, _motivo in _casos:
    _r = melhor_faturamento(list(_ps))
    assert _r == _e, f"melhor_faturamento({_ps}) deveria ser {_e} ({_motivo}); veio {_r}"`},{name:`aleatório contra força bruta`,code:`import random
from itertools import combinations

def _forca_bruta(ps):
    melhor = 0
    for k in range(1, len(ps) + 1):
        for g in combinations(ps, k):
            if all(p[1] <= q[0] or q[1] <= p[0] for p, q in combinations(g, 2)):
                melhor = max(melhor, sum(p[2] for p in g))
    return melhor

for _ in range(300):
    _ps = []
    for _ in range(random.randint(0, 9)):
        _i = random.randint(0, 20)
        _ps.append((_i, _i + random.randint(1, 8), random.randint(1, 50)))
    _r = melhor_faturamento(list(_ps))
    _e = _forca_bruta(_ps)
    assert _r == _e, f"melhor_faturamento({_ps}) deveria ser {_e}; veio {_r}"`},{name:`O(n log n) com 4 000 propostas sobrepostas`,code:`class _Hora(int):
    usadas = 0
    limite = None
    msg = ""

    @classmethod
    def prepara(cls, limite, msg):
        cls.usadas, cls.limite, cls.msg = 0, limite, msg

    def _conta(self):
        _Hora.usadas += 1
        if _Hora.limite is not None and _Hora.usadas > _Hora.limite:
            _Hora.limite = None
            raise AssertionError(_Hora.msg)

    def __lt__(self, o):
        self._conta()
        return int.__lt__(self, o)

    def __le__(self, o):
        self._conta()
        return int.__le__(self, o)

    def __gt__(self, o):
        self._conta()
        return int.__gt__(self, o)

    def __ge__(self, o):
        self._conta()
        return int.__ge__(self, o)
_x = 2026

def _prox():
    global _x
    _x = (_x * 1103515245 + 12345) % 2147483648
    return _x

_base = 1760000000000              # horários em milissegundos
_ps = []
for _ in range(4000):
    _i = _prox() % 1000000
    _f = _i + 1 + _prox() % 500000
    _ps.append((_base + _i * 1000, _base + _f * 1000, 1 + _prox() % 1000))

import sys
_lim = sys.getrecursionlimit()
sys.setrecursionlimit(200)         # no navegador, recursão funda derruba o Python; assim ela vira RecursionError
_erro = None
_Hora.prepara(400000, "com 4 000 propostas muito sobrepostas, a sua função passou de 400 000 comparações entre horários (a versão com busca binária faz cerca de 85 000). Como você acha a última proposta compatível? Os fins estão ordenados: use busca binária (bisect).")
try:
    _r = melhor_faturamento([(_Hora(a), _Hora(b), v) for a, b, v in _ps])
except RecursionError:
    _erro = "com 4 000 propostas, a recursão ficou funda demais (RecursionError). Escreva a PD bottom-up, com um laço que preenche melhor[j] do menor j para o maior."
except (MemoryError, OverflowError):
    _erro = "a sua função tentou criar uma lista do tamanho dos horários, e aqui eles são números enormes (milissegundos). Indexe a PD pelas propostas em ordem de fim, não pelo horário."
finally:
    sys.setrecursionlimit(_lim)
    _Hora.limite = None
assert _erro is None, _erro
assert _r == 42823, f"com essas 4 000 propostas, o maior faturamento é 42823; veio {_r}"`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:`**Mini-projeto: alocador de salas da semana de provas**. Leia uma lista de provas (disciplina, dia, início, fim) e, para cada dia, diga **qual sala** cada prova usa, não só quantas salas são necessárias. Imprima um quadro por sala, em ordem de horário, e confira automaticamente que nenhuma sala tem duas provas ao mesmo tempo.

Depois: (1) acrescente salas com capacidade diferente e provas com número de alunos (o guloso continua ótimo? procure um contraexemplo); (2) faça a versão do salão de festas que devolve **quais** propostas aceitar, reconstruindo a solução a partir da tabela melhor[j], como na lição anterior.`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Guloso = uma escolha local por vez, sem voltar atrás. Rápido, mas só vale com prova; um contraexemplo derruba a regra, e passar em testes não prova nada.
- Escalonamento de intervalos: ordene pelo fim e aceite quem começa depois do último aceito. O(n log n). "Começa cedo", "mais curto" e "menos conflitos" estão erradas.
- Provas: argumento de troca (existe ótimo que contém a escolha gulosa) e "o guloso se mantém à frente" (fim(gᵣ) ≤ fim(oᵣ) a cada passo).
- Particionamento: em ordem de início, reaproveite a sala que fica livre primeiro (heap). Usa exatamente a profundidade, que é o mínimo.
- Mochila fracionária e intervalos sem valor: guloso. Mochila 0/1 e intervalos com valores: PD.`},{type:`callout`,tone:`english`,text:`- **greedy algorithm / greedy choice**: algoritmo guloso / escolha gulosa
- **counterexample**: contraexemplo
- **exchange argument / greedy stays ahead**: argumento de troca / o guloso se mantém à frente
- **interval scheduling / interval partitioning**: escalonamento / particionamento de intervalos
- **earliest finish time first**: termina mais cedo primeiro
- **weighted interval scheduling**: escalonamento de intervalos com pesos

Frase típica de entrevista: *"I sort the intervals by end time and greedily take each one that starts after the last one I took. By an exchange argument, some optimal solution contains the interval that finishes first, so the greedy choice is safe. It runs in O(n log n) because of the sort."*

Frase típica de enunciado: *"Given an array of meeting time intervals, return the minimum number of conference rooms required."*`,title:`English corner`}]}],cards:[{id:`l4-guloso-intervalos#1`,front:`Qual regra gulosa resolve o escalonamento de intervalos, e quanto custa?`,back:`Ordenar pelo fim e aceitar cada pedido que começa a partir do fim do último aceito. O(n log n), por causa da ordenação.`},{id:`l4-guloso-intervalos#2`,front:`Dê um contraexemplo para "o mais curto primeiro" no escalonamento de intervalos.`,back:`[0, 5), [4, 6), [5, 10): a regra pega [4, 6), que colide com os outros dois; o ótimo é [0, 5) e [5, 10).`},{id:`l4-guloso-intervalos#3`,front:`Resuma o argumento de troca do escalonamento de intervalos.`,back:`Numa solução ótima, troque o primeiro pedido pelo que termina mais cedo de todos: ele termina antes ou junto, então não colide com os demais. Logo existe ótimo com a escolha gulosa.`},{id:`l4-guloso-intervalos#4`,front:`Qual é o menor número de salas para um conjunto de intervalos, e por que não dá para usar menos?`,back:`A profundidade: o maior número de intervalos num mesmo instante. Esses intervalos simultâneos precisam de salas diferentes.`},{id:`l4-guloso-intervalos#5`,front:`No particionamento de intervalos, em que ordem processar e como achar uma sala livre depressa?`,back:`Em ordem de início; uma heap com o horário em que cada sala fica livre diz se a que libera primeiro já está livre.`},{id:`l4-guloso-intervalos#6`,front:`A regra passou em 300 testes aleatórios contra a força bruta. Ela está certa?`,back:`Não necessariamente: "menos conflitos" passa em sorteios pequenos e tem contraexemplo com 11 intervalos. Só uma prova garante.`},{id:`l4-guloso-intervalos#7`,front:`Por que o guloso por valor/peso funciona na mochila fracionária e falha na 0/1?`,back:`Na fracionária dá para trocar um pedaço de item pior pelo mesmo peso de um melhor sem perder valor; na 0/1 os itens não se dividem.`},{id:`l4-guloso-intervalos#8`,front:`Como resolver intervalos com valores (weighted interval scheduling)?`,back:`PD em ordem de fim: melhor[j] = max(melhor[j − 1], valor_j + melhor[p(j)]), com p(j) achado por busca binária. O(n log n).`}]};export{e as default};
//# sourceMappingURL=l4-guloso-intervalos-BsByfPze.js.map