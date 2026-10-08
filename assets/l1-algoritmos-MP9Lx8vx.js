var e={id:`l1-algoritmos`,moduleId:`m1-1`,title:`Algoritmos e pensamento computacional`,titleEn:`Algorithms and computational thinking`,summary:`Decomposição, padrões, abstração e algoritmos: as quatro ferramentas para resolver qualquer problema com computação.`,minutes:25,objectives:[`Definir algoritmo e reconhecer suas propriedades (finito, preciso, com entrada e saída)`,`Aplicar decomposição, reconhecimento de padrões e abstração`,`Escrever pseudocódigo para um problema simples`],skills:[`logica-algoritmos`,`logica-pseudocodigo`],terms:[{pt:`algoritmo`,en:`algorithm`,def:`Sequência finita e precisa de passos que resolve um problema.`},{pt:`pseudocódigo`,en:`pseudocode`,def:`Descrição de um algoritmo em linguagem estruturada, sem regras rígidas de sintaxe.`},{pt:`decomposição`,en:`decomposition`,def:`Dividir um problema grande em partes menores.`},{pt:`abstração`,en:`abstraction`,def:`Ignorar detalhes irrelevantes para focar no essencial.`},{pt:`passo`,en:`step`,def:`Uma ação individual de um algoritmo.`}],references:[`cs50`,`polya`,`mit-6100l`,`cs2023`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Um **{{algoritmo|algorithm}}** é uma sequência **finita** de passos **precisos** que transforma uma **entrada** em uma **saída**. Receitas, instruções de montagem e o caminho do GPS são algoritmos. Programar é escrever algoritmos em uma linguagem que o computador executa.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`Um bom algoritmo é:

- **Finito**: termina depois de um número finito de passos.
- **Preciso** (não ambíguo): cada passo tem um único significado. "Adicione sal a gosto" não é preciso; "adicione 5 g de sal" é.
- **Efetivo**: cada passo pode ser realmente executado.
- Tem **entrada** e **saída** bem definidas.

O **pensamento computacional** reúne quatro hábitos para chegar a um algoritmo:

1. **{{Decomposição|decomposition}}**: quebrar o problema em subproblemas.
2. **Reconhecimento de padrões**: perceber o que se repete ("para cada aluno, faça...").
3. **{{Abstração|abstraction}}**: descartar o que não importa (a cor da camisa do aluno não importa para a média).
4. **Algoritmo**: escrever os passos.`},{type:`callout`,tone:`deep`,text:`George Pólya, em *How to Solve It* (1945), propôs quatro fases que continuam valendo para programação: **entender o problema**, **criar um plano**, **executar o plano** e **revisar**. A maioria dos erros de iniciantes vem de pular a primeira fase e começar a digitar código.`,title:`Pólya: como resolver problemas`}]},{stage:`exemplo`,blocks:[{type:`md`,text:`**Problema**: descobrir o maior número de uma lista de notas.

*Entender*: entrada = lista de números (não vazia); saída = o maior deles.
*Padrão*: comparar cada número com "o maior até agora".

Pseudocódigo:`},{type:`code`,lang:`text`,code:`maior ← primeiro número da lista
para cada número n da lista:
    se n > maior:
        maior ← n
devolva maior`},{type:`md`,text:`Repare: não importa se são 3 ou 3 milhões de notas — o mesmo algoritmo funciona. Essa é a força da **generalização**.`}]},{stage:`codigo`,blocks:[{type:`md`,text:"O mesmo algoritmo em Python. Use o botão **Passo a passo** para ver o valor de `maior` mudar a cada volta:"},{type:`trace`,code:`notas = [7, 4, 9, 6]
maior = notas[0]
for n in notas:
    if n > maior:
        maior = n
print(maior)`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e1-alg-1`,kind:`mcq`,prompt:`Qual destas instruções **não** serve como passo de algoritmo para um computador?`,difficulty:`facil`,skills:[`logica-algoritmos`],hints:[`Um passo precisa ter um único significado possível.`],explanation:`"Mexa até ficar bom" é ambíguo: o que é "bom"? Algoritmos exigem precisão.`,options:[{text:`Some 1 ao contador`,feedback:`Preciso e executável.`},{text:`Mexa até ficar bom`,correct:!0,feedback:`Isso: "bom" é ambíguo, não dá para executar de forma determinística.`},{text:`Se x for maior que 10, imprima "grande"`,feedback:`Preciso: a condição é clara.`},{text:`Repita 5 vezes: imprima "oi"`,feedback:`Preciso e finito.`}]}},{type:`exercise`,exercise:{id:`e1-alg-2`,kind:`parsons`,lang:`text`,prompt:`Ordene o pseudocódigo que calcula a **soma** de uma lista.`,difficulty:`facil`,skills:[`logica-pseudocodigo`],hints:[`Antes de somar, a soma precisa começar com algum valor.`,`O "devolva" vem depois de percorrer tudo.`],explanation:`Inicializar o acumulador, percorrer somando, devolver no final: é o padrão **acumulador** (*accumulator*).`,lines:[`soma ← 0`,`para cada número n da lista:`,`    soma ← soma + n`,`devolva soma`]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e1-alg-desafio`,kind:`code`,lang:`python`,prompt:"Escreva `menor(lista)` que devolve o **menor** número de uma lista não vazia, **sem** usar `min()`. Adapte o algoritmo do exemplo.",difficulty:`intermediario`,skills:[`logica-algoritmos`],hints:[`O que muda em relação ao algoritmo do "maior"?`,`Comece com o primeiro elemento e troque o sinal da comparação.`],explanation:`Basta inverter a comparação. Reaproveitar um algoritmo conhecido mudando um detalhe é **reconhecimento de padrões** em ação.`,starter:`def menor(lista):
    pass`,solution:`def menor(lista):
    m = lista[0]
    for x in lista:
        if x < m:
            m = x
    return m`,tests:[{name:`menor([7, 4, 9, 6]) == 4`,code:`assert menor([7, 4, 9, 6]) == 4`},{name:`um elemento`,code:`assert menor([3]) == 3`},{name:`negativos`,code:`assert menor([-1, -8, 2]) == -8`},{name:`menor no fim`,code:`assert menor([5, 5, 1]) == 1`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:`**Algoritmo do cotidiano**: escreva o pseudocódigo de uma tarefa real (separar o lixo reciclável, decidir que ônibus pegar, fazer café). Depois troque com alguém e peça para executar *literalmente* o que está escrito. Onde a pessoa ficou em dúvida, o algoritmo estava ambíguo.`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Algoritmo: finito, preciso, efetivo, com entrada e saída.
- Pensamento computacional: decomposição, padrões, abstração, algoritmo.
- Pólya: entender → planejar → executar → revisar.`}]}],cards:[{id:`l1-algoritmos#1`,front:`Quais propriedades um algoritmo deve ter?`,back:`Ser finito, preciso (não ambíguo), efetivo e ter entrada e saída definidas.`},{id:`l1-algoritmos#2`,front:`O que é decomposição?`,back:`Dividir um problema grande em subproblemas menores e mais fáceis.`},{id:`l1-algoritmos#3`,front:`Quais são as quatro fases de Pólya?`,back:`Entender o problema, criar um plano, executar o plano, revisar.`}]};export{e as default};
//# sourceMappingURL=l1-algoritmos-MP9Lx8vx.js.map