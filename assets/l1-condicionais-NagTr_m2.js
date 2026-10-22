var e={id:`l1-condicionais`,moduleId:`m1-3`,title:`Condicionais: tomando decisões`,titleEn:`Conditionals: making decisions`,summary:`if, elif, else, condições compostas, aninhamento e tabelas-verdade.`,minutes:42,objectives:[`Escrever decisões com if/elif/else`,`Construir condições compostas corretas`,`Testar todos os caminhos de um programa (casos de borda)`,`Construir decisões sem lacunas nem sobreposições acidentais e justificar casos de fronteira.`],skills:[`prog-condicionais`],terms:[{pt:`condicional`,en:`conditional statement`,def:`Estrutura que executa código só se uma condição for verdadeira.`},{pt:`senão`,en:`else`,def:`Bloco executado quando a condição do if é falsa.`},{pt:`senão se`,en:`elif (else if)`,def:`Testa outra condição se as anteriores foram falsas.`},{pt:`bloco / indentação`,en:`block / indentation`,def:`Linhas recuadas que pertencem a uma estrutura.`,example:`IndentationError: expected an indented block`},{pt:`caso de borda`,en:`edge case`,def:`Entrada nos limites (0, vazio, máximo) onde bugs costumam aparecer.`}],references:[`python-tutorial`,`cs50`,`mit-6100l`,`htdp`,`ies-study-guide`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:"Programas precisam **decidir**. Um **{{condicional|conditional}}** executa um bloco de código apenas **se** uma condição for verdadeira: `if condição:`. Com `elif` e `else`, você escolhe entre vários caminhos."}]},{stage:`explicacao`,blocks:[{type:`md`,text:`Em Python, o que pertence ao \`if\` é definido pela **{{indentação|indentation}}** (4 espaços por convenção):

\`\`\`
if temperatura > 30:
    print("Calor")        # dentro do if
elif temperatura > 20:
    print("Agradável")
else:
    print("Frio")
print("fim")              # fora: executa sempre
\`\`\`

As condições são testadas **de cima para baixo** e só o **primeiro** bloco verdadeiro executa. Por isso a **ordem importa**: se você testar \`> 20\` antes de \`> 30\`, nunca vai imprimir "Calor".`},{type:`table`,head:[`A`,`B`,`A and B`,`A or B`,`not A`],rows:[[`True`,`True`,`True`,`True`,`False`],[`True`,`False`,`False`,`True`,`False`],[`False`,`True`,`False`,`True`,`True`],[`False`,`False`,`False`,`False`,`True`]],caption:`Tabela-verdade (truth table). Você vai revê-la em Lógica Matemática (Nível 14) e em circuitos digitais.`},{type:`callout`,tone:`tip`,text:`Teste **todos os caminhos** e os **casos de borda** (*edge cases*). Se a regra é "maior ou igual a 7 aprova", teste 6.9, 7 e 7.1.`},{type:`md`,text:`### Aprofundamento teórico: Partições do domínio e prioridade das regras`},{type:`callout`,tone:`info`,title:`Antes de aprofundar`,text:`Ler if, elif, else e comparações.`},{type:`md`,text:`### Uma decisão divide possibilidades
Uma regra condicional separa entradas em grupos. Para classificar uma duração, podemos ter menos de 15 minutos, de 15 até menos de 30 e 30 ou mais. Esses intervalos cobrem os valores não negativos sem sobreposição. Se durações negativas forem inválidas, precisamos declarar essa restrição ou rejeitá-las; colocá-las por acidente no primeiro grupo muda o significado do resultado.

### Ordem expressa prioridade
Em uma cadeia if/elif, só o primeiro ramo verdadeiro é escolhido. Quando uma condição inclui outra, testar a mais ampla primeiro pode tornar a segunda inalcançável. Já dois if independentes permitem duas ações. A escolha depende do requisito: classificar em uma categoria costuma pedir exclusividade; emitir avisos independentes pode pedir mais de uma ação.

### Bordas revelam ambiguidades
Termos como “até”, “acima” e “a partir” precisam virar comparações exatas. Para um limite inteiro, teste o valor anterior, o próprio limite e o seguinte. Não é necessário inventar milhares de exemplos para descobrir se 30 pertence ao intervalo inferior ou superior; é necessário definir a regra e observar essa fronteira.`},{type:`callout`,tone:`warn`,title:`Um equívoco para evitar`,text:`“else significa qualquer valor válido.” Ele inclui tudo que não entrou antes, inclusive entradas inválidas caso não tenham sido tratadas.`},{type:`md`,text:`### Fontes para estudar além
Estas referências apoiam os conceitos; os exemplos desta ampliação são originais.

- [The Python Tutorial](https://docs.python.org/3/tutorial/) — Python Software Foundation
- [How to Design Programs](https://htdp.org/) — Felleisen, Findler, Flatt, Krishnamurthi`}]},{stage:`exemplo`,blocks:[{type:`trace`,code:`nota = 6.5
if nota >= 7:
    situacao = "aprovado"
elif nota >= 5:
    situacao = "recuperação"
else:
    situacao = "reprovado"
print(situacao)`,caption:`Observe que, ao entrar no elif, o else nem é avaliado.`},{type:`md`,text:"### Exemplo resolvido: sessões de estudo\nContrato: receber minutos inteiros não negativos. Menos de 15 é “breve”; de 15 a 29 é “regular”; 30 ou mais é “longa”. Testamos primeiro `minutos < 15`, depois `minutos < 30`, e por fim else.\n\nPara 20, o primeiro teste falha; o segundo passa, logo a sessão é regular. Não precisamos repetir `minutos >= 15`: chegar ao segundo teste já informa que o primeiro falhou. Para 30, os dois testes falham e escolhemos longa. Essa economia é correta apenas dentro da cadeia; transformar o segundo teste num if independente muda as possibilidades de execução."}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`idade = 17
tem_autorizacao = True
if idade >= 18 or tem_autorizacao:
    print("Pode participar")
else:
    print("Não pode participar")`,runnable:!0}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e1-if-1`,kind:`predict`,lang:`python`,prompt:`O que é impresso?`,difficulty:`facil`,skills:[`prog-condicionais`],hints:[`Só o primeiro bloco verdadeiro executa.`,`15 > 10 já é verdadeiro.`],explanation:`x > 10 é True, então imprime "A" e pula o resto, mesmo que x > 5 também seja verdade.`,code:`x = 15
if x > 10:
    print("A")
elif x > 5:
    print("B")
else:
    print("C")`,answer:`A`}},{type:`exercise`,exercise:{id:`e1-if-2`,kind:`fix`,lang:`python`,prompt:'A função deveria classificar a temperatura, mas `classificar(35)` devolve "agradável". Encontre e corrija o bug.',difficulty:`intermediario`,skills:[`prog-condicionais`],hints:["Simule `classificar(35)`: qual condição é testada primeiro?",`Qual é a ordem correta: da condição mais restrita para a mais ampla?`],explanation:`35 > 20 é verdadeiro, então o primeiro ramo captura tudo acima de 20. Teste a condição mais restritiva (> 30) primeiro.`,starter:`def classificar(t):
    if t > 20:
        return "agradável"
    elif t > 30:
        return "calor"
    else:
        return "frio"`,solution:`def classificar(t):
    if t > 30:
        return "calor"
    elif t > 20:
        return "agradável"
    else:
        return "frio"`,tests:[{name:`35 → calor`,code:`assert classificar(35) == "calor"`},{name:`25 → agradável`,code:`assert classificar(25) == "agradável"`},{name:`10 → frio`,code:`assert classificar(10) == "frio"`},{name:`bordas: 30 → agradável, 20 → frio`,code:`assert classificar(30) == "agradável" and classificar(20) == "frio"`}]}},{type:`exercise`,exercise:{id:`e1-if-3`,kind:`code`,lang:`python`,prompt:"Escreva `maior_de_tres(a, b, c)` que devolve o maior dos três números, **sem** usar `max()`.",difficulty:`intermediario`,skills:[`prog-condicionais`],hints:["Quando `a` é o maior? Quando ele é >= aos outros dois.","Use `and` para combinar as duas comparações. Pense no caso de empates."],explanation:`Uma solução: se a >= b and a >= c → a; elif b >= c → b; senão c. Usar >= (e não >) trata os empates.`,starter:`def maior_de_tres(a, b, c):
    pass
`,solution:`def maior_de_tres(a, b, c):
    if a >= b and a >= c:
        return a
    elif b >= c:
        return b
    return c`,tests:[{name:`maior no meio`,code:`assert maior_de_tres(1, 9, 3) == 9`},{name:`maior no fim`,code:`assert maior_de_tres(1, 2, 3) == 3`},{name:`maior no início`,code:`assert maior_de_tres(5, 2, 3) == 5`},{name:`empates`,code:`assert maior_de_tres(4, 4, 1) == 4 and maior_de_tres(2, 7, 7) == 7`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e1-if-desafio`,kind:`code`,lang:`python`,prompt:'Escreva `triangulo(a, b, c)` que devolve `"inválido"` se os lados não formam triângulo (cada lado deve ser menor que a soma dos outros dois e todos positivos), ou então `"equilátero"`, `"isósceles"` ou `"escaleno"`.',difficulty:`desafio`,skills:[`prog-condicionais`,`logica-operadores`],hints:[`Primeiro valide; só depois classifique.`,"Desigualdade triangular: `a < b + c and b < a + c and c < a + b`.",`Isósceles: pelo menos dois lados iguais (e não os três).`],explanation:`Validar antes de processar é um padrão importante (*guard clause*): devolva cedo nos casos inválidos e o resto do código fica mais simples.`,starter:`def triangulo(a, b, c):
    pass
`,solution:`def triangulo(a, b, c):
    if a <= 0 or b <= 0 or c <= 0 or a >= b + c or b >= a + c or c >= a + b:
        return "inválido"
    if a == b == c:
        return "equilátero"
    if a == b or b == c or a == c:
        return "isósceles"
    return "escaleno"`,tests:[{name:`equilátero`,code:`assert triangulo(3, 3, 3) == "equilátero"`},{name:`isósceles`,code:`assert triangulo(5, 5, 8) == "isósceles"`},{name:`escaleno`,code:`assert triangulo(3, 4, 5) == "escaleno"`},{name:`degenerado é inválido`,code:`assert triangulo(1, 2, 3) == "inválido"`},{name:`negativo é inválido`,code:`assert triangulo(-1, 2, 2) == "inválido"`}]}},{type:`callout`,tone:`deep`,title:`Explique com suas palavras`,text:"Se usarmos primeiro `minutos >= 15` e depois `elif minutos >= 30`, uma sessão de 40 chegará ao segundo ramo? Por quê?\n\nAnote sua justificativa antes de consultar a etapa Revisão. Esta reflexão não recebe nota automática."},{type:`md`,text:`### Transfira para outro problema
Faça uma tabela com 0, 14, 15, 29 e 30. Acrescente -1 e explique se deve ser rejeitado antes de classificar.`}]},{stage:`projeto`,blocks:[{type:`md`,text:"**Calculadora (parte 4)**: peça também a operação (`+`, `-`, `*`, `/`) e use `if/elif` para escolher o cálculo. Trate a divisão por zero com uma mensagem amigável."},{type:`project`,projectId:`p1-calculadora`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- if / elif / else: testados de cima para baixo; só o primeiro verdadeiro executa.
- Indentação define o bloco.
- Ordem das condições importa.
- Teste todos os caminhos e as bordas.`},{type:`md`,text:`### Confira seu raciocínio
Não. A primeira condição já é verdadeira para 40 e encerra a escolha da cadeia. Para distinguir os grupos, teste primeiro o limite maior ou use limites superiores crescentes.

Compare com sua justificativa: identifique a regra usada, o caso limite e o que você mudaria na resposta. Refaça a explicação em outro dia, sem consultar o texto.`}]}],cards:[{id:`l1-condicionais#1`,front:`Se duas condições de um if/elif forem verdadeiras, quantos blocos executam?`,back:`Apenas o primeiro verdadeiro.`},{id:`l1-condicionais#2`,front:`O que é um edge case?`,back:`Um caso nos limites da entrada (0, vazio, valor máximo, igualdade) onde bugs costumam aparecer.`},{id:`l1-condicionais#3`,front:"Quando `A or B` é falso?",back:`Somente quando A e B são falsos.`}],theoryTitle:`Partições do domínio e prioridade das regras`};export{e as default};
//# sourceMappingURL=l1-condicionais-NagTr_m2.js.map