var e={id:`l1-funcoes`,moduleId:`m1-5`,title:`Funções e escopo`,titleEn:`Functions and scope`,summary:`Definir funções, parâmetros, retorno, escopo local e por que funções são a base da organização.`,minutes:35,objectives:[`Definir funções com parâmetros e return`,`Diferenciar print de return`,`Entender escopo local e global`,`Escrever docstrings`],skills:[`prog-funcoes`,`prog-escopo`],terms:[{pt:`função`,en:`function`,def:`Bloco de código nomeado e reutilizável.`},{pt:`parâmetro`,en:`parameter`,def:`Nome que a função usa para receber um valor (na definição).`},{pt:`argumento`,en:`argument`,def:`Valor passado na chamada da função.`},{pt:`retorno`,en:`return value`,def:`Valor que a função devolve para quem chamou.`},{pt:`escopo`,en:`scope`,def:`Região do código onde um nome existe.`,example:`UnboundLocalError: cannot access local variable 'x'`},{pt:`chamar`,en:`call / invoke`,def:`Executar uma função: f(3).`},{pt:`docstring`,en:`docstring`,def:`Texto de documentação na primeira linha da função.`}],references:[`python-tutorial`,`cs61a`,`composing-programs`,`htdp`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Uma **{{função|function}}** é um pedaço de código com **nome**, que recebe **entradas** ({{parâmetros|parameters}}) e devolve uma **saída** ({{retorno|return value}}). Funções permitem **reutilizar** código e, mais importante, **pensar em partes**: cada função resolve um subproblema.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:'```\ndef area_retangulo(base, altura):\n    """Devolve a área de um retângulo."""\n    return base * altura\n\na = area_retangulo(3, 4)   # 3 e 4 são argumentos\n```\n\n- `def` define; `base` e `altura` são **parâmetros**; `3` e `4` são **argumentos**.\n- `return` **devolve** um valor e **encerra** a função. Sem `return`, a função devolve `None`.\n\n**print ≠ return.** `print` mostra na tela para um humano; `return` entrega o valor para o **código** que chamou, que pode guardá-lo, compará-lo, passá-lo adiante. Funções úteis quase sempre usam `return`.\n\n**{{Escopo|scope}}**: variáveis criadas dentro de uma função são **locais** — só existem enquanto a função executa e não são vistas de fora. Isso evita que funções interfiram umas nas outras.'},{type:`callout`,tone:`deep`,text:`Cada chamada de função cria um **quadro** (*frame*) na **pilha de chamadas** (*call stack*) com suas variáveis locais. Quando a função retorna, o quadro é descartado. É por isso que o traceback do Python mostra uma lista de chamadas: é a pilha no momento do erro. Você vai usar isso para entender recursão (Nível 4).`,title:`A pilha de chamadas`}]},{stage:`exemplo`,blocks:[{type:`trace`,code:`def dobro(x):
    resultado = x * 2
    return resultado

a = dobro(5)
b = dobro(a)
print(a, b)`,caption:`Observe o quadro da função surgir a cada chamada e sumir no return.`}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`def celsius_para_fahrenheit(c):
    """Converte graus Celsius para Fahrenheit."""
    return c * 9 / 5 + 32

for c in [0, 25, 100]:
    print(c, "°C =", celsius_para_fahrenheit(c), "°F")

help(celsius_para_fahrenheit)   # mostra a docstring`,runnable:!0}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e1-fn-1`,kind:`predict`,lang:`python`,prompt:`O que é impresso?`,difficulty:`intermediario`,skills:[`prog-funcoes`],hints:[`A função imprime algo, mas o que ela **devolve**?`,`Sem return, uma função devolve None.`],explanation:`A chamada imprime 6 (dentro da função) e devolve None; o print de fora imprime None.`,code:`def triplo(x):
    print(x * 3)

r = triplo(2)
print(r)`,answer:`6
None`}},{type:`exercise`,exercise:{id:`e1-fn-2`,kind:`code`,lang:`python`,prompt:"Escreva `media(notas)` que recebe uma lista de números e devolve a média. Se a lista estiver vazia, devolva `0`.",difficulty:`facil`,skills:[`prog-funcoes`],hints:[`Média = soma / quantidade.`,`Trate a lista vazia **antes** de dividir (por quê?).`],explanation:"Dividir por `len([])` = 0 causaria `ZeroDivisionError`. Tratar o caso vazio primeiro é uma *guard clause*.",starter:`def media(notas):
    pass
`,solution:`def media(notas):
    if not notas:
        return 0
    return sum(notas) / len(notas)`,tests:[{name:`media([7, 8, 9]) == 8`,code:`assert media([7, 8, 9]) == 8`},{name:`lista vazia → 0`,code:`assert media([]) == 0`},{name:`devolve (não imprime)`,code:`assert media([1, 2]) == 1.5`}]}},{type:`exercise`,exercise:{id:`e1-fn-3`,kind:`mcq`,prompt:`O que acontece ao executar este código?`,code:{lang:`python`,code:`def f():
    y = 10
f()
print(y)`},difficulty:`intermediario`,skills:[`prog-escopo`],hints:["Onde `y` foi criada? Ela existe fora da função?"],explanation:"`y` é local de `f` e deixa de existir quando `f` termina. Fora dela, `y` não está definida: `NameError`.",options:[{text:`Imprime 10`,feedback:`y só existe **dentro** de f.`},{text:`NameError: name 'y' is not defined`,correct:!0,feedback:`Isso: escopo local.`},{text:`Imprime None`,feedback:`None seria o retorno de f(), não o valor de y.`},{text:`SyntaxError`,feedback:`A sintaxe está correta; o erro acontece na execução.`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e1-fn-desafio`,kind:`code`,lang:`python`,prompt:"Escreva `eh_primo(n)` (devolve True se n é primo) e, **usando ela**, `primos_ate(n)` que devolve a lista de primos de 2 até n.",difficulty:`desafio`,skills:[`prog-funcoes`,`prog-loops`],hints:[`Um primo é > 1 e só é divisível por 1 e por ele mesmo.`,"Basta testar divisores de 2 até a raiz quadrada de n: `while d * d <= n`.","`primos_ate` só precisa de um loop chamando `eh_primo`."],explanation:`Dividir em duas funções separa responsabilidades: uma testa, a outra coleta. Testar até √n é suficiente porque, se n = a × b, um dos fatores é ≤ √n.`,starter:`def eh_primo(n):
    pass

def primos_ate(n):
    pass
`,solution:`def eh_primo(n):
    if n < 2:
        return False
    d = 2
    while d * d <= n:
        if n % d == 0:
            return False
        d += 1
    return True

def primos_ate(n):
    return [x for x in range(2, n + 1) if eh_primo(x)]`,tests:[{name:`eh_primo de casos básicos`,code:`assert [eh_primo(x) for x in [0, 1, 2, 3, 4, 9, 13]] == [False, False, True, True, False, False, True]`},{name:`primos_ate(20)`,code:`assert primos_ate(20) == [2, 3, 5, 7, 11, 13, 17, 19]`},{name:`número grande`,code:`assert eh_primo(7919) and not eh_primo(7917)`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:"**Calculadora (final)**: reorganize a calculadora em funções: `somar`, `subtrair`, `multiplicar`, `dividir` e `calcular(a, op, b)`. Seu programa principal só deve ler a entrada, chamar `calcular` e imprimir. Esse é o projeto 1 completo!"},{type:`project`,projectId:`p1-calculadora`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- def nome(parâmetros): ... return valor
- return devolve e encerra; sem return → None.
- print mostra; return entrega ao código.
- Variáveis de dentro da função são locais.`}]}],cards:[{id:`l1-funcoes#1`,front:`Diferença entre parâmetro e argumento?`,back:`Parâmetro é o nome na definição; argumento é o valor passado na chamada.`},{id:`l1-funcoes#2`,front:`O que uma função sem return devolve?`,back:`None.`},{id:`l1-funcoes#3`,front:`Por que preferir return a print em funções?`,back:`Porque return entrega o valor ao código, permitindo reutilizar, testar e combinar o resultado.`}]};export{e as default};
//# sourceMappingURL=l1-funcoes-Cbj96S6N.js.map