var e={id:`l3-pilhas-filas`,moduleId:`m3-2`,title:`Pilhas e filas`,titleEn:`Stacks and queues`,summary:`LIFO e FIFO, onde aparecem (desfazer, chamadas de função, filas de impressão, BFS) e como implementar.`,minutes:30,objectives:[`Diferenciar LIFO de FIFO`,`Implementar pilha com list e fila com deque`,`Resolver problemas clássicos com pilha (parênteses balanceados)`],skills:[`ed-pilhas-filas`],terms:[{pt:`pilha`,en:`stack`,def:`Estrutura LIFO: o último a entrar é o primeiro a sair.`},{pt:`fila`,en:`queue`,def:`Estrutura FIFO: o primeiro a entrar é o primeiro a sair.`},{pt:`empilhar / desempilhar`,en:`push / pop`,def:`Colocar e retirar do topo da pilha.`},{pt:`enfileirar / desenfileirar`,en:`enqueue / dequeue`,def:`Colocar no fim e retirar do início da fila.`},{pt:`topo`,en:`top / peek`,def:`O elemento que sairia primeiro.`},{pt:`fila dupla`,en:`deque (double-ended queue)`,def:`Estrutura que permite inserir e remover nas duas pontas em O(1).`}],references:[`clrs`,`sedgewick-algs`,`python-docs`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Uma **{{pilha|stack}}** é como uma pilha de pratos: você coloca e tira **do topo** (LIFO — *last in, first out*). Uma **{{fila|queue}}** é como a fila do banco: quem chega primeiro é atendido primeiro (FIFO — *first in, first out*).`}]},{stage:`explicacao`,blocks:[{type:`md`,text:"**Onde aparecem pilhas**: Ctrl+Z (desfazer), o botão voltar do navegador, a **pilha de chamadas** de funções, avaliação de expressões, verificação de parênteses, DFS.\n\n**Onde aparecem filas**: fila de impressão, requisições a um servidor, mensagens entre sistemas, escalonamento de processos, BFS.\n\n**Em Python**:\n- Pilha: `list` com `append` (push) e `pop` (pop) — ambos O(1) no fim.\n- Fila: `collections.deque` com `append` e `popleft` — O(1). **Não** use `list.pop(0)`, que é O(n)."}]},{stage:`exemplo`,blocks:[{type:`viz`,viz:`stack-queue`,caption:`Faça push/pop na pilha e enqueue/dequeue na fila e compare a ordem de saída.`}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`from collections import deque

pilha = []
for x in ["a", "b", "c"]:
    pilha.append(x)
print("pilha sai:", pilha.pop(), pilha.pop(), pilha.pop())

fila = deque()
for x in ["a", "b", "c"]:
    fila.append(x)
print("fila sai:", fila.popleft(), fila.popleft(), fila.popleft())`,runnable:!0}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e3-sq-1`,kind:`predict`,lang:`python`,prompt:`O que é impresso?`,difficulty:`facil`,skills:[`ed-pilhas-filas`],hints:[`append coloca no topo; pop tira do topo.`,`Depois de 1, 2, 3 empilhados e um pop, quem está no topo?`],explanation:`Empilha 1, 2, 3; pop tira 3; empilha 4; pilha = [1, 2, 4]; pop tira 4.`,code:`s = []
s.append(1); s.append(2); s.append(3)
s.pop()
s.append(4)
print(s.pop(), s)`,answer:`4 [1, 2]`}},{type:`exercise`,exercise:{id:`e3-sq-2`,kind:`code`,lang:`python`,prompt:"Escreva `balanceado(s)` que devolve True se os delimitadores `()[]{}` do texto estão balanceados e corretamente aninhados. Outros caracteres são ignorados.",difficulty:`intermediario`,skills:[`ed-pilhas-filas`],hints:[`Quando aparece um fechamento, ele precisa corresponder ao **último** abertura ainda não fechada. Que estrutura dá o "último"?`,`Empilhe aberturas. Num fechamento: se a pilha está vazia ou o topo não corresponde, é falso.`,`No fim, a pilha precisa estar vazia.`],explanation:`A pilha guarda as aberturas pendentes; o topo é sempre a mais recente — exatamente a que deve fechar primeiro. Esse é o princípio usado por compiladores e editores.`,starter:`def balanceado(s):
    pass
`,solution:`def balanceado(s):
    pares = {")": "(", "]": "[", "}": "{"}
    pilha = []
    for c in s:
        if c in "([{":
            pilha.append(c)
        elif c in pares:
            if not pilha or pilha.pop() != pares[c]:
                return False
    return not pilha`,tests:[{name:`balanceado`,code:`assert balanceado("f(x[1]) {ok}")`},{name:`ordem errada`,code:`assert not balanceado("([)]")`},{name:`sobra abertura`,code:`assert not balanceado("((")`},{name:`fecha sem abrir`,code:`assert not balanceado(")(")`},{name:`vazio`,code:`assert balanceado("")`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e3-sq-desafio`,kind:`code`,lang:`python`,prompt:'Escreva `avaliar_rpn(expr)` que avalia uma expressão em **notação polonesa reversa** (tokens separados por espaço, operadores + - * /). Ex.: `"3 4 + 2 *"` → `14`. Use divisão real (/).',difficulty:`desafio`,skills:[`ed-pilhas-filas`],hints:[`Números vão para a pilha. E quando aparece um operador?`,`Operador: desempilhe b, depois a (a ordem importa para - e /), calcule a op b e empilhe o resultado.`],explanation:"A RPN dispensa parênteses e é avaliada com uma pilha — a mesma ideia das máquinas virtuais baseadas em pilha (como a do Python, que você viu no `dis`).",starter:`def avaliar_rpn(expr):
    pass
`,solution:`def avaliar_rpn(expr):
    pilha = []
    ops = {"+": lambda a, b: a + b, "-": lambda a, b: a - b, "*": lambda a, b: a * b, "/": lambda a, b: a / b}
    for tok in expr.split():
        if tok in ops:
            b = pilha.pop()
            a = pilha.pop()
            pilha.append(ops[tok](a, b))
        else:
            pilha.append(float(tok))
    return pilha.pop()`,tests:[{name:`"3 4 + 2 *" == 14`,code:`assert avaliar_rpn("3 4 + 2 *") == 14`},{name:`ordem dos operandos`,code:`assert avaliar_rpn("10 2 -") == 8 and avaliar_rpn("8 2 /") == 4`},{name:`composta`,code:`assert avaliar_rpn("5 1 2 + 4 * + 3 -") == 14`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:"**Mini-projeto: editor com desfazer/refazer**. Implemente um editor de texto de linha única com comandos `escrever <texto>`, `desfazer`, `refazer`, usando **duas pilhas**. Pense: quando o usuário escreve algo novo depois de desfazer, o que acontece com a pilha de refazer?"}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Pilha: LIFO, push/pop no topo (list).
- Fila: FIFO, append/popleft (deque).
- Pilha resolve aninhamento (parênteses, chamadas); fila resolve ordem de chegada (BFS, servidores).`}]}],cards:[{id:`l3-pilhas-filas#1`,front:`LIFO ou FIFO: pilha?`,back:`LIFO (last in, first out).`},{id:`l3-pilhas-filas#2`,front:`Por que não usar list.pop(0) como fila?`,back:`Porque é O(n): desloca todos os elementos. Use deque.popleft(), que é O(1).`},{id:`l3-pilhas-filas#3`,front:`Que estrutura verifica parênteses balanceados?`,back:`Uma pilha.`}]};export{e as default};
//# sourceMappingURL=l3-pilhas-filas-DGg3-4Am.js.map