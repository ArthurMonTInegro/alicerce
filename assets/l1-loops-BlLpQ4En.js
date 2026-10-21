var e={id:`l1-loops`,moduleId:`m1-4`,title:`Laços de repetição`,titleEn:`Loops`,summary:`while, for, range, padrões de contador e acumulador, break/continue e loops infinitos.`,minutes:35,objectives:[`Usar while e for`,`Aplicar os padrões contador, acumulador e busca`,`Evitar e diagnosticar loops infinitos e erros de "um a mais" (off-by-one)`],skills:[`prog-loops`],terms:[{pt:`laço de repetição`,en:`loop`,def:`Estrutura que repete um bloco de código.`},{pt:`iteração`,en:`iteration`,def:`Cada repetição de um loop.`},{pt:`contador`,en:`counter`,def:`Variável que conta quantas vezes algo acontece.`},{pt:`acumulador`,en:`accumulator`,def:`Variável que acumula um resultado (soma, produto, texto).`},{pt:`laço infinito`,en:`infinite loop`,def:`Loop cuja condição nunca fica falsa.`},{pt:`erro de um a mais`,en:`off-by-one error`,def:`Erro em que o loop executa uma vez a mais ou a menos.`}],references:[`python-tutorial`,`cs50`,`cmu-15112`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:"Um **{{laço|loop}}** repete um bloco de código. `while` repete **enquanto** uma condição for verdadeira; `for` repete **para cada** item de uma sequência. Com loops, um programa de 5 linhas processa 5 milhões de itens."}]},{stage:`explicacao`,blocks:[{type:`md`,text:'**while** — quando você não sabe quantas repetições serão necessárias:\n\n```\nsenha = ""\nwhile senha != "1234":\n    senha = input("Senha: ")\n```\n\n**for** — para percorrer uma sequência. `range(n)` gera 0, 1, ..., n-1; `range(a, b)` gera a, ..., b-1; `range(a, b, passo)`.\n\n```\nfor i in range(1, 6):\n    print(i)        # 1 2 3 4 5 (o 6 não entra!)\n```\n\n**Padrões** que você vai usar a vida toda:\n\n- **Contador**: `c = 0` antes; `c += 1` dentro, quando algo acontece.\n- **Acumulador**: `soma = 0` antes; `soma += x` dentro.\n- **Busca**: percorrer até achar; `break` sai do loop na hora.\n\n`continue` pula para a próxima iteração.'},{type:`callout`,tone:`warn`,text:"Em um `while`, algo **dentro** do loop precisa mudar a condição. Se nada muda, o loop é infinito. O Alicerce interrompe programas que demoram demais e explica o que pode ter acontecido.",title:`Loops infinitos`}]},{stage:`exemplo`,blocks:[{type:`trace`,code:`soma = 0
for i in range(1, 5):
    soma = soma + i
print(soma)`,caption:`Acumulador: veja soma crescer 0 → 1 → 3 → 6 → 10.`}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`# tabuada do 7
for i in range(1, 11):
    print(f"7 x {i} = {7 * i}")

# contar vogais
frase = "programar é pensar"
vogais = 0
for letra in frase:
    if letra in "aeiouáéíóú":
        vogais += 1
print("vogais:", vogais)`,runnable:!0}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e1-loop-1`,kind:`predict`,lang:`python`,prompt:`O que é impresso? (cada número em uma linha)`,difficulty:`facil`,skills:[`prog-loops`],hints:[`range(2, 10, 3): começa em 2, soma 3 a cada passo, para **antes** de 10.`],explanation:`2, 5, 8 — o próximo seria 11, que passa de 10.`,code:`for i in range(2, 10, 3):
    print(i)`,answer:`2
5
8`}},{type:`exercise`,exercise:{id:`e1-loop-2`,kind:`code`,lang:`python`,prompt:"Escreva `soma_pares(n)` que devolve a soma de todos os números pares de 0 até n (inclusive).",difficulty:`facil`,skills:[`prog-loops`],hints:[`Padrão acumulador: comece com 0.`,"Use `range` com passo 2, ou teste `i % 2 == 0`. Lembre que range exclui o fim: use n + 1."],explanation:"`sum(range(0, n + 1, 2))` também resolve, mas escrever o acumulador ensina o padrão. O `+ 1` evita o off-by-one.",starter:`def soma_pares(n):
    pass
`,solution:`def soma_pares(n):
    soma = 0
    for i in range(0, n + 1, 2):
        soma += i
    return soma`,tests:[{name:`soma_pares(10) == 30`,code:`assert soma_pares(10) == 30`},{name:`soma_pares(7) == 12`,code:`assert soma_pares(7) == 12`},{name:`soma_pares(0) == 0`,code:`assert soma_pares(0) == 0`}]}},{type:`exercise`,exercise:{id:`e1-loop-3`,kind:`fix`,lang:`python`,prompt:"Esta função deveria contar regressivamente e devolver a lista `[n, n-1, ..., 1]`, mas trava (loop infinito). Corrija.",difficulty:`intermediario`,skills:[`prog-loops`],hints:[`O que precisa mudar a cada volta para a condição ficar falsa?`,`Olhe a variável da condição: ela muda dentro do loop?`],explanation:'Sem `n -= 1`, a condição `n > 0` nunca fica falsa. Em todo while, pergunte: "o que faz este loop terminar?".',starter:`def regressiva(n):
    resultado = []
    while n > 0:
        resultado.append(n)
    return resultado`,solution:`def regressiva(n):
    resultado = []
    while n > 0:
        resultado.append(n)
        n -= 1
    return resultado`,tests:[{name:`regressiva(3) == [3, 2, 1]`,code:`assert regressiva(3) == [3, 2, 1]`},{name:`regressiva(0) == []`,code:`assert regressiva(0) == []`}]}},{type:`exercise`,exercise:{id:`e1-loop-4`,kind:`parsons`,lang:`python`,prompt:"Monte a função que devolve o **primeiro** número negativo de uma lista, ou `None` se não houver.",difficulty:`intermediario`,skills:[`prog-loops`],hints:["O `return None` deve ficar fora do loop: só depois de olhar todos."],explanation:"Padrão busca: o `return` dentro do loop encerra na hora; o `return None` fora cobre o caso de não encontrar.",lines:[`def primeiro_negativo(lista):`,`    for x in lista:`,`        if x < 0:`,`            return x`,`    return None`]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e1-loop-desafio`,kind:`code`,lang:`python`,prompt:'Escreva `fizzbuzz(n)` que devolve uma **lista de strings** de 1 a n: múltiplos de 3 viram `"Fizz"`, de 5 `"Buzz"`, de ambos `"FizzBuzz"`, e os demais o próprio número como texto. (Sim, esta é uma pergunta clássica de entrevista.)',difficulty:`intermediario`,skills:[`prog-loops`,`prog-condicionais`],hints:[`Qual caso precisa ser testado primeiro?`,`Múltiplo de 3 e de 5 = múltiplo de 15. Teste-o antes dos outros.`],explanation:`O ponto central é a ordem das condições: o caso mais específico (15) vem primeiro.`,starter:`def fizzbuzz(n):
    pass
`,solution:`def fizzbuzz(n):
    out = []
    for i in range(1, n + 1):
        if i % 15 == 0:
            out.append("FizzBuzz")
        elif i % 3 == 0:
            out.append("Fizz")
        elif i % 5 == 0:
            out.append("Buzz")
        else:
            out.append(str(i))
    return out`,tests:[{name:`fizzbuzz(5)`,code:`assert fizzbuzz(5) == ["1", "2", "Fizz", "4", "Buzz"]`},{name:`15 vira FizzBuzz`,code:`assert fizzbuzz(15)[-1] == "FizzBuzz"`},{name:`tamanho`,code:`assert len(fizzbuzz(100)) == 100`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:"**Calculadora (parte 5)**: coloque a calculadora em um `while` para que o usuário faça várias contas até digitar `sair`. Seu primeiro programa interativo completo!"},{type:`project`,projectId:`p1-calculadora`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- while: enquanto a condição for verdadeira; algo precisa mudá-la.
- for: para cada item; range(a, b) exclui b.
- Padrões: contador, acumulador, busca.
- break sai; continue pula.`}]}],cards:[{id:`l1-loops#1`,front:`Quais números range(1, 5) gera?`,back:`1, 2, 3, 4.`},{id:`l1-loops#2`,front:`O que causa um loop infinito com while?`,back:`Nada dentro do loop muda a condição para falsa.`},{id:`l1-loops#3`,front:`O que é um off-by-one error?`,back:`Um erro em que o loop executa uma vez a mais ou a menos (geralmente por causa dos limites).`}]};export{e as default};
//# sourceMappingURL=l1-loops-BlLpQ4En.js.map