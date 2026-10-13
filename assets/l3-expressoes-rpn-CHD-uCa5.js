var e={id:`l3-expressoes-rpn`,moduleId:`m3-2`,title:`Expressões com pilhas: da infixa à notação polonesa reversa`,titleEn:`Expressions with stacks: from infix to Reverse Polish Notation`,summary:`Por que a notação pós-fixa dispensa parênteses, como precedência e associatividade decidem a ordem das contas e como o algoritmo do pátio de manobras transforma 3 + 4 * 2 em 3 4 2 * + com uma pilha.`,minutes:45,objectives:[`Converter expressões à mão entre as notações infixa, pós-fixa (RPN) e prefixa`,"Explicar precedência e associatividade e por que `8 - 3 - 2` vale 3 e `2 ** 3 ** 2` vale 512",`Implementar o algoritmo do pátio de manobras (shunting-yard), inclusive com parênteses`,`Reconhecer onde a pós-fixa aparece: calculadoras HP, bytecode do Python, JVM e WebAssembly`],skills:[`ed-pilhas-filas`,`logica-operadores`],terms:[{pt:`notação infixa`,en:`infix notation`,def:`O operador fica entre os operandos, como em 3 + 4. Precisa de regras de precedência e de parênteses.`,example:`Most programming languages use infix notation for arithmetic.`},{pt:`operando`,en:`operand`,def:`Valor sobre o qual um operador age. Em 3 + 4, os operandos são 3 e 4.`,example:`TypeError: unsupported operand type(s) for +: 'int' and 'str'`},{pt:`notação polonesa reversa / pós-fixa`,en:`Reverse Polish Notation (RPN) / postfix notation`,def:`O operador vem depois dos operandos, como em 3 4 +. Não precisa de parênteses nem de precedência.`,example:`HP calculators such as the HP 12C use Reverse Polish Notation.`},{pt:`notação prefixa / polonesa`,en:`prefix notation / Polish notation`,def:`O operador vem antes dos operandos, como em + 3 4. Proposta por Jan Łukasiewicz em 1924.`},{pt:`precedência`,en:`operator precedence`,def:`Regra que diz qual operador é aplicado primeiro quando estão em níveis diferentes: * antes de +.`},{pt:`associatividade`,en:`associativity`,def:`Regra de desempate entre operadores de mesma precedência: à esquerda, (8 - 3) - 2; à direita, 2 ** (3 ** 2).`,example:`Operators in the same box group left to right (except for exponentiation and conditional expressions, which group from right to left).`},{pt:`algoritmo do pátio de manobras`,en:`shunting-yard algorithm`,def:`Método publicado por Edsger Dijkstra em 1961 (não confundir com o algoritmo de Dijkstra de menor caminho) que converte infixa em pós-fixa usando uma pilha de operadores.`,example:`The shunting-yard algorithm converts an infix expression to postfix in linear time.`},{pt:`token`,en:`token`,def:`Menor pedaço com significado em um texto: um número, um operador, um parêntese.`,example:`The tokenize module provides a lexical scanner for Python source code.`},{pt:`máquina de pilha`,en:`stack machine`,def:`Máquina (real ou virtual) cujas instruções tiram operandos de uma pilha e empilham o resultado. CPython, JVM e WebAssembly funcionam assim.`}],references:[`sedgewick-algs`,`python-docs`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Na escola você aprendeu a escrever \`3 + 4 * 2\` e a fazer a multiplicação primeiro. Essa é a {{notação infixa|infix notation}}: o operador fica **entre** os {{operandos|operands}}. Para pessoas ela é confortável, mas depende de regras extras: quem é calculado primeiro, como desempatar, onde estão os parênteses.

Na {{notação polonesa reversa|Reverse Polish Notation (RPN)}}, também chamada de {{notação pós-fixa|postfix notation}}, o operador vem **depois** dos operandos: \`3 4 2 * +\`. A ordem das contas já está escrita na própria sequência, então não há parênteses nem tabela de precedência, e uma única pilha basta para calcular.

No desafio da lição anterior você **avaliou** RPN com uma pilha. Esta lição cuida da outra metade: **produzir** RPN a partir do que uma pessoa digita. É o que fazem calculadoras, planilhas e compiladores: ler o texto infixo, convertê-lo para uma forma sem ambiguidade e só então calcular.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`### Três notações para a mesma conta`},{type:`table`,head:[`Notação`,"Para `(3 + 4) * 2`","Para `3 + 4 * 2`",`Onde aparece`],rows:[[`Infixa`,"`(3 + 4) * 2`","`3 + 4 * 2`",`matemática da escola, Python, planilhas`],[`{{Prefixa (polonesa)|prefix notation (Polish notation)}}`,"`* + 3 4 2`","`+ 3 * 4 2`","Lisp: `(* (+ 3 4) 2)`"],[`Pós-fixa (polonesa reversa, RPN)`,"`3 4 + 2 *`","`3 4 2 * +`",`calculadoras HP, bytecode, PostScript`]],caption:"Com operadores de dois operandos, a prefixa e a pós-fixa não precisam de parênteses: a posição de cada operador já diz sobre quais operandos ele age. O Lisp usa parênteses por outro motivo: para permitir qualquer número de operandos, como em `(+ 1 2 3)`."},{type:`md`,text:"Repare em duas coisas. Primeiro, **os números nunca mudam de ordem**: converter de uma notação para outra só muda a posição dos operadores. Segundo, na pós-fixa os parênteses somem porque cada operador age sobre os dois valores mais recentes que ainda não foram usados (em `3 4 2 * +`, o `*` junta 4 e 2; o `+` junta 3 e o 8 que acabou de surgir); na prefixa, sobre as duas subexpressões que vêm logo depois dele.\n\n**Para converter à mão**: ponha parênteses em volta de cada conta, na ordem em que ela é feita; depois leve cada operador para logo depois do parêntese que fecha a conta dele e apague os parênteses.\n`3 + 4 * 2` → `(3 + (4 * 2))` → `3 4 2 * +`. Para a prefixa, leve cada operador para logo antes do parêntese que abre a conta dele: `+ 3 * 4 2`.\n\n### Precedência e associatividade\nA {{precedência|operator precedence}} decide entre operadores de **níveis diferentes**: `*` e `/` antes de `+` e `-` (você viu isso no Nível 1). E quando os operadores estão **no mesmo nível**, como `-` e `-`, ou `+` e `-`? Quem decide é a {{associatividade|associativity}}:\n\n- **À esquerda** (`+ - * /` em Python): `8 - 3 - 2` é `(8 - 3) - 2`, que vale 3, e não `8 - (3 - 2)`, que vale 7.\n- **À direita** (`**` em Python): `2 ** 3 ** 2` é `2 ** (3 ** 2)`, que vale 512, e não `(2 ** 3) ** 2`, que vale 64.\n\nEm RPN essas leituras viram sequências diferentes: `8 3 - 2 -` vale 3 e `8 3 2 - -` vale 7. Um conversor precisa acertar isso.\n\n### O algoritmo do pátio de manobras\nEm 1961, Edsger Dijkstra descreveu um método para converter infixa em pós-fixa com **uma pilha de operadores**. O nome, {{algoritmo do pátio de manobras|shunting-yard algorithm}}, vem dos pátios ferroviários, onde vagões são desviados para um trilho lateral e depois devolvidos à linha na ordem certa. Leia os {{tokens|tokens}} (números, operadores e parênteses) da esquerda para a direita:\n\n1. **Número**: vai direto para a saída.\n2. **Operador**: enquanto o topo da pilha for um operador **mais forte**, ou **igual** (quando o novo é associativo à esquerda), desempilhe esse topo para a saída. Depois, empilhe o novo.\n3. **Abre parêntese**: empilhe. Ele funciona como uma parede: nada que está abaixo dele sai antes do fecha parêntese correspondente.\n4. **Fecha parêntese**: desempilhe para a saída até encontrar o `(` e descarte os dois parênteses. Se a pilha esvaziar sem achar `(`, a expressão está malformada.\n5. **Fim do texto**: desempilhe tudo para a saída. Se sobrar um `(`, faltou fechar um parêntese.\n\nA intuição: um operador fica **esperando** na pilha porque ainda pode chegar, à direita, alguém mais forte que precisa ser calculado antes. Quando chega um operador mais fraco (ou igual, na associatividade à esquerda), quem esperava já tem os dois operandos completos e pode sair.\n\n**Custo**: cada token entra e sai da pilha no máximo uma vez, então a conversão é **O(n)** em tempo, com O(n) de memória extra no pior caso (muitos parênteses abertos)."},{type:`callout`,tone:`warn`,text:'`eval("3 + 4 * 2")` funciona, mas executa **qualquer** código Python. Se o texto vier de um usuário, ele pode digitar um comando que apaga arquivos ou lê dados que não deveria. Calculadoras e planilhas de verdade fazem o que esta lição ensina: separam o texto em tokens, convertem e calculam só o que é permitido.',title:`Por que não usar eval`},{type:`callout`,tone:`deep`,text:'- **Calculadoras HP**, como a HP 12C (até hoje comum em matemática financeira), trabalham em RPN: você digita `3 ENTER 4 +`.\n- O **CPython** compila seu código para instruções de uma {{máquina de pilha|stack machine}}: `a + b * c` vira "carregue a, carregue b, carregue c, multiplique, some". Isso é RPN (veja o segundo bloco da seção Código). A JVM e o WebAssembly também são máquinas de pilha.\n- Compiladores costumam montar uma **árvore** da expressão em vez de uma string. A RPN é a leitura dessa árvore "filhos primeiro, depois o pai", o percurso em pós-ordem que você verá no módulo de árvores.',title:`Onde a pós-fixa vive hoje`}]},{stage:`exemplo`,blocks:[{type:`md`,text:"Vamos converter `5 * ( 6 - 2 ) - 8 / 4` token a token. A pilha guarda só operadores e parênteses; os números passam direto para a saída."},{type:`table`,head:[`Token`,`O que acontece`,`Pilha (topo à direita)`,`Saída`],rows:[["`5`",`número: vai para a saída`,`(vazia)`,"`5`"],["`*`",`pilha vazia: empilha`,"`*`","`5`"],["`(`",`abre a "parede": empilha`,"`* (`","`5`"],["`6`",`número: saída`,"`* (`","`5 6`"],["`-`","o topo é `(`: ninguém sai; empilha","`* ( -`","`5 6`"],["`2`",`número: saída`,"`* ( -`","`5 6 2`"],["`)`","desempilha até o `(`: sai o `-`; descarta os parênteses","`*`","`5 6 2 -`"],["`-`","o topo `*` é mais forte: sai; a pilha esvazia; empilha o `-`","`-`","`5 6 2 - *`"],["`8`",`número: saída`,"`-`","`5 6 2 - * 8`"],["`/`","o topo `-` é mais fraco: fica; empilha o `/`","`- /`","`5 6 2 - * 8`"],["`4`",`número: saída`,"`- /`","`5 6 2 - * 8 4`"],[`fim`,"esvazia a pilha do topo para baixo: `/`, depois `-`",`(vazia)`,"`5 6 2 - * 8 4 / -`"]],caption:"Conversão de `5 * ( 6 - 2 ) - 8 / 4` pelo pátio de manobras."},{type:`md`,text:"Confira avaliando a saída com uma pilha de valores: `5 6 2 -` deixa 5 e 4 na pilha; `*` dá 20; `8 4 /` dá 2; o `-` final dá **18**. É o mesmo que `5 * (6 - 2) - 8 / 4`, ou seja, 20 - 2."}]},{stage:`codigo`,blocks:[{type:`md`,text:`A versão abaixo já trata precedência e associatividade à esquerda, mas **ainda não** trata parênteses (essa parte fica para você no exercício). Os tokens vêm separados por espaço.`},{type:`code`,lang:`python`,code:`PREC = {"+": 1, "-": 1, "*": 2, "/": 2}

def para_rpn(expr):
    saida, pilha = [], []
    for tok in expr.split():
        if tok in PREC:
            # sai quem é mais forte ou igual (associatividade à esquerda)
            while pilha and PREC[pilha[-1]] >= PREC[tok]:
                saida.append(pilha.pop())
            pilha.append(tok)
        else:
            saida.append(tok)          # número: direto para a saída
    while pilha:                       # fim: esvazia a pilha
        saida.append(pilha.pop())
    return " ".join(saida)

for e in ["3 + 4 * 2", "8 - 3 - 2", "2 * 3 + 4 * 5", "9 / 3 / 3"]:
    print(f"{e:<15} ->  {para_rpn(e)}")`,runnable:!0},{type:`code`,lang:`python`,code:`import dis
dis.dis("a + b * c")`,runnable:!0,caption:`O bytecode do Python é RPN: três LOAD, depois a multiplicação, depois a soma. Os nomes exatos das instruções mudam entre versões do Python.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e3-rpn-1`,kind:`mcq`,prompt:"Qual é a forma pós-fixa (RPN) de `(5 + 2) * 3`?",difficulty:`facil`,skills:[`ed-pilhas-filas`,`logica-operadores`],hints:[`Qual conta é feita primeiro? Escreva só ela em pós-fixa: dois números e, depois, o operador.`,`O resultado dessa primeira conta vira o primeiro operando da próxima. Onde entra o segundo operador?`],explanation:"Em RPN cada operador age sobre os dois valores mais recentes: `5 2 +` produz 7 e `7 3 *` produz 21. A ordem dos números (5, 2, 3) é a mesma da infixa; converter só reposiciona os operadores.",options:[{text:"`5 2 + 3 *`",correct:!0,feedback:"Isso: primeiro a conta entre parênteses (`5 2 +`), depois o resultado vezes 3."},{text:"`5 2 3 + *`",feedback:"Essa é a RPN de `5 * (2 + 3)`: o + agiria sobre 2 e 3. Os parênteses originais agrupam 5 e 2."},{text:"`5 + 2 3 *`",feedback:`Na pós-fixa todo operador vem depois dos seus dois operandos. Aqui o + continua entre 5 e 2, como na infixa.`},{text:"`* + 5 2 3`",feedback:`Essa é a forma prefixa (polonesa), com os operadores antes dos operandos. A pós-fixa é o contrário.`}]}},{type:`exercise`,exercise:{id:`e3-rpn-2`,kind:`predict`,lang:`python`,prompt:`Simule o pátio de manobras (a mesma função da seção Código). O que é impresso?`,difficulty:`intermediario`,skills:[`ed-pilhas-filas`],hints:[`Monte uma tabela com três colunas: token, pilha e saída. Os números são fáceis; concentre-se nos operadores.`,"Quando o `-` chega, o `while` compara a precedência dele com a do topo. Depois de tirar um operador, o laço para ou compara de novo com o novo topo?"],explanation:"O `*` espera na pilha em cima do `+`. Quando chega o `-`, ele tira o `*` (precedência maior) e também o `+` (precedência igual, associatividade à esquerda) e só então entra. Resultado: `1 2 3 * + 4 -`, que vale 1 + 6 - 4 = 3.",code:`PREC = {"+": 1, "-": 1, "*": 2, "/": 2}

def para_rpn(expr):
    saida, pilha = [], []
    for tok in expr.split():
        if tok in PREC:
            while pilha and PREC[pilha[-1]] >= PREC[tok]:
                saida.append(pilha.pop())
            pilha.append(tok)
        else:
            saida.append(tok)
    while pilha:
        saida.append(pilha.pop())
    return " ".join(saida)

print(para_rpn("1 + 2 * 3 - 4"))`,answer:`1 2 3 * + 4 -`}},{type:`exercise`,exercise:{id:`e3-rpn-3`,kind:`mcq`,prompt:"Alguém trocou `>=` por `>` no laço do pátio de manobras: `while pilha and PREC[pilha[-1]] > PREC[tok]`. Para qual entrada a RPN produzida passa a ter um **valor** diferente do correto?",difficulty:`intermediario`,skills:[`ed-pilhas-filas`,`logica-operadores`],hints:[`A troca só muda alguma coisa quando as duas precedências comparadas são **iguais**. Em quais opções isso acontece?`,`Entre essas, em qual o jeito de agrupar muda o resultado da conta?`],explanation:"O `>=` implementa a associatividade à esquerda: num empate, o operador que já esperava (o da esquerda) é aplicado primeiro. Para um operador associativo à direita, como `**`, o certo é justamente `>`: em `2 ** 3 ** 2`, o primeiro `**` precisa continuar esperando.",options:[{text:"`8 - 3 - 2`",correct:!0,feedback:"Isso: com `>`, o primeiro `-` não sai quando chega o segundo, e a saída vira `8 3 2 - -`, que calcula 8 - (3 - 2) = 7 em vez de 3. A subtração não é associativa."},{text:"`8 + 3 + 2`",feedback:"A saída muda para `8 3 2 + +`, mas o valor não: 8 + (3 + 2) = (8 + 3) + 2. Na adição de inteiros, o agrupamento não altera o resultado."},{text:"`8 * 3 - 2`",feedback:"As precedências são diferentes (2 contra 1): quando o `-` chega, o `*` sai tanto com `>` quanto com `>=`."},{text:"`8 - 3 * 2`",feedback:"Quando o `*` chega, o topo é o `-`, mais fraco: ninguém sai, com `>` ou com `>=`. A saída continua `8 3 2 * -`."}]}},{type:`exercise`,exercise:{id:`e3-rpn-4`,kind:`code`,lang:`python`,prompt:'A função abaixo converte infixa em RPN, mas ainda não entende parênteses. Complete-a para tratar `(` e `)` com as regras do pátio de manobras. Os tokens vêm separados por espaço (ex.: `"( 3 + 4 ) * 2"` → `"3 4 + 2 *"`). Se os parênteses estiverem desbalanceados (um `)` sem par ou um `(` que nunca fecha), lance `ValueError`.',difficulty:`intermediario`,skills:[`ed-pilhas-filas`,`logica-operadores`],hints:["Quando chega um `(`, ele vai para a saída ou para a pilha? E o que o laço dos operadores deve fazer se encontrar um `(` no topo?","Quando chega um `)`, o que precisa sair da pilha, e até onde? O que acontece com o próprio `(`?","Para os erros: em que momento você descobre um `)` sem par? E um `(` que nunca fechou?"],explanation:'O `(` entra na pilha e funciona como fundo falso: o laço dos operadores para nele (por isso a condição `pilha[-1] != "("`), então nada que está fora dos parênteses sai antes da hora. O `)` despeja tudo o que se acumulou dentro do par e descarta o `(`. Os dois erros são os mesmos da verificação de parênteses balanceados: fechar sem ter aberto e terminar com algo aberto.',starter:`PREC = {"+": 1, "-": 1, "*": 2, "/": 2}

def para_rpn(expr):
    saida, pilha = [], []
    for tok in expr.split():
        if tok in PREC:
            while pilha and PREC[pilha[-1]] >= PREC[tok]:
                saida.append(pilha.pop())
            pilha.append(tok)
        # trate "(" e ")" aqui, antes do caso do número
        else:
            saida.append(tok)
    while pilha:
        saida.append(pilha.pop())
    return " ".join(saida)`,solution:`PREC = {"+": 1, "-": 1, "*": 2, "/": 2}

def para_rpn(expr):
    saida, pilha = [], []
    for tok in expr.split():
        if tok in PREC:
            while pilha and pilha[-1] != "(" and PREC[pilha[-1]] >= PREC[tok]:
                saida.append(pilha.pop())
            pilha.append(tok)
        elif tok == "(":
            pilha.append(tok)
        elif tok == ")":
            while pilha and pilha[-1] != "(":
                saida.append(pilha.pop())
            if not pilha:
                raise ValueError("')' sem '(' correspondente")
            pilha.pop()
        else:
            saida.append(tok)
    while pilha:
        if pilha[-1] == "(":
            raise ValueError("'(' sem ')' correspondente")
        saida.append(pilha.pop())
    return " ".join(saida)`,tests:[{name:`sem parênteses continua funcionando`,code:`for e, esperado in [("3 + 4 * 2", "3 4 2 * +"), ("8 - 3 - 2", "8 3 - 2 -"), ("7", "7"), ("", "")]:
    r = para_rpn(e)
    assert r == esperado, f"para_rpn({e!r}) devolveu {r!r}; esperado {esperado!r}"`},{name:`parênteses mudam a ordem`,code:`for e, esperado in [("( 3 + 4 ) * 2", "3 4 + 2 *"), ("8 - ( 3 - 2 )", "8 3 2 - -"), ("5 * ( 6 - 2 ) - 8 / 4", "5 6 2 - * 8 4 / -")]:
    r = para_rpn(e)
    assert r == esperado, f"para_rpn({e!r}) devolveu {r!r}; esperado {esperado!r}"`},{name:`o "(" funciona como parede para os operadores`,code:`for e, esperado in [("2 * ( 3 + 4 * 5 )", "2 3 4 5 * + *"), ("( ( 1 + 2 ) * ( 3 - 4 ) ) / 5", "1 2 + 3 4 - * 5 /"), ("( ( 7 ) )", "7")]:
    r = para_rpn(e)
    assert r == esperado, f"para_rpn({e!r}) devolveu {r!r}; esperado {esperado!r}"`},{name:`parênteses desbalanceados geram ValueError`,code:`for e in ["( 1 + 2", "1 + 2 )", ") 1 + 2 (", "( ( 1 ) + 2"]:
    try:
        r = para_rpn(e)
    except ValueError:
        continue
    assert False, f"para_rpn({e!r}) devolveu {r!r}; deveria lançar ValueError (parênteses desbalanceados)"`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e3-rpn-desafio`,kind:`code`,lang:`python`,prompt:'Faça o caminho de volta. Escreva `rpn_para_infixa(expr)` que recebe uma expressão em RPN (tokens separados por espaço; operadores `+ - * /`; números inteiros não negativos) e devolve a infixa com o **mínimo de parênteses** para que o Python, lendo com suas regras de precedência e associatividade à esquerda, agrupe as contas exatamente como a RPN indica. Use um espaço de cada lado de cada operador e nenhum espaço colado aos parênteses.\n\nExemplos: `"3 4 + 2 *"` → `"(3 + 4) * 2"`; `"3 4 2 * +"` → `"3 + 4 * 2"`; `"8 3 2 - -"` → `"8 - (3 - 2)"`; `"8 3 - 2 -"` → `"8 - 3 - 2"`. O que conta é o agrupamento, não só o valor: `"1 2 3 + +"` → `"1 + (2 + 3)"`, porque sem os parênteses o Python somaria 1 + 2 primeiro.\n\nSe a RPN for inválida (faltam ou sobram operandos, ou está vazia), lance `ValueError`.',difficulty:`desafio`,skills:[`ed-pilhas-filas`,`logica-operadores`],hints:[`Na avaliação, a pilha guardava números. Aqui, além do texto de cada pedaço, o que você precisaria lembrar dele para decidir, mais tarde, se ele precisa de parênteses?`,'Pense no operador "principal" de cada pedaço (o último aplicado). Um número sozinho nunca precisa de parênteses: que valor de precedência faria esse caso funcionar sem um `if` especial?',"Compare a precedência de cada operando com a do operador novo. Num empate, o lado esquerdo e o lado direito se comportam igual? Pense em `8 - 3 - 2` contra `8 - (3 - 2)`."],explanation:`A pilha guarda pares (texto, precedência do operador principal), e números ganham uma precedência maior que todas. O operando esquerdo leva parênteses só se for mais fraco que o operador novo; o direito leva também no empate, porque o Python agruparia pela esquerda. Esse é o percurso inverso do pátio de manobras e mostra que a pilha pode guardar qualquer coisa: números (avaliação), textos (conversão) ou, num compilador, nós de uma árvore sintática.`,starter:`PREC = {"+": 1, "-": 1, "*": 2, "/": 2}

def rpn_para_infixa(expr):
    # percorra os tokens com uma pilha: cada operador junta os dois
    # últimos pedaços em um maior, com parênteses só onde precisa
    pass`,solution:`PREC = {"+": 1, "-": 1, "*": 2, "/": 2}

def rpn_para_infixa(expr):
    pilha = []  # pares (texto, precedência do operador principal)
    for tok in expr.split():
        if tok in PREC:
            if len(pilha) < 2:
                raise ValueError(f"faltam operandos para {tok}")
            dir_txt, dir_p = pilha.pop()
            esq_txt, esq_p = pilha.pop()
            p = PREC[tok]
            if esq_p < p:
                esq_txt = f"({esq_txt})"
            if dir_p <= p:
                dir_txt = f"({dir_txt})"
            pilha.append((f"{esq_txt} {tok} {dir_txt}", p))
        else:
            pilha.append((tok, 3))
    if len(pilha) != 1:
        raise ValueError("expressão RPN inválida")
    return pilha[0][0]`,tests:[{name:`exemplos do enunciado`,code:`for e, esperado in [("3 4 + 2 *", "(3 + 4) * 2"), ("3 4 2 * +", "3 + 4 * 2"), ("8 3 2 - -", "8 - (3 - 2)"), ("8 3 - 2 -", "8 - 3 - 2")]:
    r = rpn_para_infixa(e)
    assert r == esperado, f"rpn_para_infixa({e!r}) devolveu {r!r}; esperado {esperado!r}"`},{name:`um número sozinho`,code:`for e in ["7", "42"]:
    r = rpn_para_infixa(e)
    assert r == e, f"rpn_para_infixa({e!r}) devolveu {r!r}; um número sozinho não leva parênteses"`},{name:`empate à direita precisa de parênteses; à esquerda, não`,code:`casos = [("1 2 3 + +", "1 + (2 + 3)"), ("6 2 3 * /", "6 / (2 * 3)"), ("1 2 + 3 +", "1 + 2 + 3"), ("2 3 * 4 /", "2 * 3 / 4")]
for e, esperado in casos:
    r = rpn_para_infixa(e)
    assert r == esperado, f"rpn_para_infixa({e!r}) devolveu {r!r}; esperado {esperado!r}"`},{name:`precedência dos dois lados e aninhamento`,code:`casos = [
    ("1 2 + 3 4 - *", "(1 + 2) * (3 - 4)"),
    ("2 3 * 4 5 * +", "2 * 3 + 4 * 5"),
    ("1 2 3 4 + * -", "1 - 2 * (3 + 4)"),
    ("5 1 2 + 4 * + 3 -", "5 + (1 + 2) * 4 - 3"),
    ("1 2 - 3 - 4 5 - -", "1 - 2 - 3 - (4 - 5)"),
    ("1 2 3 * + 4 *", "(1 + 2 * 3) * 4"),
    ("2 3 * 4 + 5 *", "(2 * 3 + 4) * 5"),
    ("1 2 3 * 4 - -", "1 - (2 * 3 - 4)"),
]
for e, esperado in casos:
    r = rpn_para_infixa(e)
    assert r == esperado, f"rpn_para_infixa({e!r}) devolveu {r!r}; esperado {esperado!r}"`},{name:`RPN inválida gera ValueError`,code:`for e in ["3 +", "3 4", "", "+", "1 2 + +"]:
    try:
        r = rpn_para_infixa(e)
    except ValueError:
        continue
    assert False, f"rpn_para_infixa({e!r}) devolveu {r!r}; deveria lançar ValueError"`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:'**Calculadora que entende expressões.** Volte ao Projeto 1 e implemente a extensão "aceitar a expressão inteira em uma linha": um tokenizador que separa `12*(3+4)` em `12`, `*`, `(`, `3`, `+`, `4`, `)`; o pátio de manobras do exercício; e o avaliador de RPN da lição anterior. Nada de `eval`. Para ir além: `**` associativo à direita (pense em qual comparação muda) e mensagens claras para parênteses desbalanceados e divisão por zero.'},{type:`project`,projectId:`p1-calculadora`}]},{stage:`revisao`,blocks:[{type:`md`,text:"- A infixa precisa de precedência, associatividade e parênteses; a pós-fixa (RPN) não precisa de nada disso.\n- Converter não muda a ordem dos números, só a posição dos operadores.\n- Associatividade à esquerda: `8 - 3 - 2` = `(8 - 3) - 2`. À direita (`**`): `2 ** 3 ** 2` = `2 ** 9`.\n- Pátio de manobras: número vai para a saída; operador tira da pilha os mais fortes (e os iguais, se for associativo à esquerda) e entra; `(` empilha; `)` desempilha até o `(`; no fim, esvazia a pilha.\n- Custo O(n): cada token entra e sai da pilha no máximo uma vez."},{type:`callout`,tone:`english`,text:`**Vocabulary**: *infix / prefix / postfix notation*, *Reverse Polish Notation (RPN)*, *operand*, *operator precedence*, *left-associative / right-associative*, *token*, *shunting-yard algorithm*, *stack machine*.

From the Python Language Reference: *"Operators in the same box group left to right (except for exponentiation and conditional expressions, which group from right to left)."*

Typical interview prompt: "Convert this infix expression to postfix and walk me through the operator stack. What is the time complexity?"`,title:`English corner`}]}],cards:[{id:`l3-expressoes-rpn#1`,front:"Converta `(2 + 3) - 4` e `2 + 3 - 4` para RPN.",back:"Os dois viram `2 3 + 4 -`: `+` e `-` têm a mesma precedência e se agrupam à esquerda, então `2 + 3 - 4` já é `(2 + 3) - 4` e os parênteses não mudam nada."},{id:`l3-expressoes-rpn#2`,front:"Quanto vale `8 - 3 - 2` em Python, e por quê?",back:`3: operadores de mesma precedência se agrupam à esquerda, então é (8 - 3) - 2.`},{id:`l3-expressoes-rpn#3`,front:"Quanto vale `2 ** 3 ** 2` em Python, e por quê?",back:"512: `**` é associativo à direita, então é `2 ** (3 ** 2)`, ou seja, `2 ** 9`."},{id:`l3-expressoes-rpn#4`,front:"No pátio de manobras, o que acontece quando chega um `)`?",back:"Desempilha operadores para a saída até achar o `(`; depois descarta os dois parênteses."},{id:`l3-expressoes-rpn#5`,front:"No laço dos operadores, por que `>=` e não `>`?",back:"O `>=` faz o operador da esquerda sair no empate, o que implementa a associatividade à esquerda."},{id:`l3-expressoes-rpn#6`,front:`Por que o pátio de manobras é O(n)?`,back:`Cada token entra e sai da pilha no máximo uma vez.`},{id:`l3-expressoes-rpn#7`,front:`Ao converter infixa para RPN, o que muda de lugar: números ou operadores?`,back:`Só os operadores. Os números mantêm a ordem original.`}]};export{e as default};
//# sourceMappingURL=l3-expressoes-rpn-CHD-uCa5.js.map