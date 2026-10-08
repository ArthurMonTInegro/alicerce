var e={id:`l2-erros-excecoes`,moduleId:`m2-4`,title:`Erros e exceções`,titleEn:`Errors and exceptions`,summary:`Tipos de erro, como ler um traceback, try/except/else/finally e lançar exceções.`,minutes:35,objectives:[`Diferenciar erros de sintaxe, exceções em tempo de execução e erros de lógica`,`Ler um traceback completo`,`Tratar exceções específicas com try/except`,`Lançar exceções com raise`],skills:[`py-excecoes`,`en-leitura-erros`],terms:[{pt:`exceção`,en:`exception`,def:`Erro detectado durante a execução, que interrompe o fluxo normal.`},{pt:`rastreamento da pilha`,en:`traceback / stack trace`,def:`Relatório das chamadas ativas quando o erro aconteceu.`},{pt:`lançar`,en:`raise / throw`,def:`Sinalizar uma exceção.`},{pt:`capturar`,en:`catch / handle`,def:`Tratar uma exceção com except.`},{pt:`erro de lógica`,en:`logic error / bug`,def:`O programa roda, mas faz a coisa errada.`}],references:[`python-tutorial`,`python-docs`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Existem três tipos de erro: **de sintaxe** (o Python nem consegue ler o código), **{{exceções|exceptions}}** (algo dá errado durante a execução, como dividir por zero) e **erros de lógica** (o programa roda mas o resultado está errado — os mais difíceis). Exceções podem ser **tratadas** para o programa reagir em vez de quebrar.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`**Lendo um traceback** (de baixo para cima):

\`\`\`
Traceback (most recent call last):
  File "main.py", line 7, in <module>
    print(media([]))
  File "main.py", line 2, in media
    return sum(xs) / len(xs)
ZeroDivisionError: division by zero
\`\`\`

1. **Última linha**: tipo (\`ZeroDivisionError\`) e mensagem (*division by zero*).
2. **Linha acima**: onde aconteceu (função \`media\`, linha 2).
3. **Mais acima**: quem chamou (linha 7). Isso é a **pilha de chamadas**.

**Tratando**:

\`\`\`
try:
    idade = int(input("Idade: "))
except ValueError:
    print("Digite um número inteiro.")
else:
    print("ok")          # só se não houve exceção
finally:
    print("sempre roda") # limpeza
\`\`\``},{type:`callout`,tone:`warn`,text:'Nunca use `except:` sozinho ou `except Exception:` para "silenciar" erros. Capture a exceção **específica** que você sabe tratar. *"Errors should never pass silently."*',title:`Não esconda erros`},{type:`table`,head:[`Exceção`,`Causa típica`],rows:[[`NameError`,`nome não definido (erro de digitação, variável fora do escopo)`],[`TypeError`,`operação com tipo errado ("a" + 1), argumentos errados`],[`ValueError`,`tipo certo, valor inválido (int("abc"))`],[`IndexError`,`índice fora da lista`],[`KeyError`,`chave inexistente no dict`],[`AttributeError`,`objeto não tem esse atributo/método (None.append)`],[`ZeroDivisionError`,`divisão por zero`],[`FileNotFoundError`,`arquivo/caminho não existe`]]}]},{stage:`exemplo`,blocks:[{type:`code`,lang:`python`,code:`def ler_idade(texto):
    try:
        idade = int(texto)
    except ValueError:
        return None
    if idade < 0:
        raise ValueError("idade não pode ser negativa")
    return idade

print(ler_idade("17"), ler_idade("abc"))
print(ler_idade("-3"))   # veja o traceback e a explicação`,runnable:!0}]},{stage:`codigo`,blocks:[{type:`md`,text:`Toda vez que seu código der erro aqui, o Alicerce mostra o traceback original **em inglês** e, logo abaixo, uma explicação em português: o que aconteceu, por que, como investigar, como corrigir e como evitar. Experimente provocar erros:`},{type:`code`,lang:`python`,code:`dados = {"nome": "Ana"}
print(dados["idade"])`,runnable:!0}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e2-exc-1`,kind:`mcq`,prompt:'Qual exceção `int("3.5")` lança?',difficulty:`facil`,skills:[`py-excecoes`],hints:[`O argumento é uma string (tipo certo para int()), mas o **valor** é aceitável?`],explanation:'`int()` aceita strings, mas "3.5" não é um inteiro válido: ValueError (*invalid literal for int() with base 10*). Use `int(float("3.5"))` se quiser truncar.',options:[{text:`TypeError`,feedback:`O tipo (str) é aceito por int(); o problema é o valor.`},{text:`ValueError`,correct:!0,feedback:`Isso: tipo certo, valor inválido.`},{text:`SyntaxError`,feedback:`O código está escrito corretamente.`},{text:`Nenhuma: devolve 3`,feedback:`int("3.5") não trunca; int(3.5) (float) truncaria.`}]}},{type:`exercise`,exercise:{id:`e2-exc-2`,kind:`code`,lang:`python`,prompt:'Escreva `dividir_seguro(a, b)` que devolve `a / b`, ou a string `"erro: divisão por zero"` se b for 0, ou `"erro: valores inválidos"` se a ou b não forem números (TypeError).',difficulty:`intermediario`,skills:[`py-excecoes`],hints:[`Coloque só a operação arriscada no try.`,`Use dois except, um para cada exceção específica.`],explanation:`Capturar exceções específicas, cada uma com sua resposta, é muito melhor do que um except genérico que esconderia outros bugs.`,starter:`def dividir_seguro(a, b):
    return a / b
`,solution:`def dividir_seguro(a, b):
    try:
        return a / b
    except ZeroDivisionError:
        return "erro: divisão por zero"
    except TypeError:
        return "erro: valores inválidos"`,tests:[{name:`divide`,code:`assert dividir_seguro(10, 4) == 2.5`},{name:`por zero`,code:`assert dividir_seguro(1, 0) == "erro: divisão por zero"`},{name:`tipo inválido`,code:`assert dividir_seguro("a", 2) == "erro: valores inválidos"`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e2-exc-desafio`,kind:`code`,lang:`python`,prompt:'Escreva `sacar(saldo, valor)` que devolve o novo saldo. Lance `ValueError("valor deve ser positivo")` se valor <= 0 e `ValueError("saldo insuficiente")` se valor > saldo. Os testes verificam as mensagens.',difficulty:`intermediario`,skills:[`py-excecoes`],hints:[`Valide as condições no começo da função (guard clauses).`,'`raise ValueError("mensagem")`.'],explanation:`Lançar exceções com mensagens claras é parte do **contrato** de uma função: quem chama sabe exatamente o que deu errado.`,starter:`def sacar(saldo, valor):
    return saldo - valor
`,solution:`def sacar(saldo, valor):
    if valor <= 0:
        raise ValueError("valor deve ser positivo")
    if valor > saldo:
        raise ValueError("saldo insuficiente")
    return saldo - valor`,tests:[{name:`saque normal`,code:`assert sacar(100, 30) == 70`},{name:`saldo insuficiente`,code:`try:
    sacar(10, 50)
    assert False, "deveria lançar ValueError"
except ValueError as e:
    assert str(e) == "saldo insuficiente", str(e)`},{name:`valor negativo`,code:`try:
    sacar(10, -1)
    assert False, "deveria lançar ValueError"
except ValueError as e:
    assert str(e) == "valor deve ser positivo", str(e)`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:`**Lista de tarefas (parte 4)**: trate entrada inválida (número de tarefa que não existe, texto no lugar de número) e o arquivo inexistente na primeira execução.`},{type:`project`,projectId:`p2-todo`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Sintaxe × exceção × lógica.
- Traceback: leia a última linha e suba.
- Capture exceções específicas; nunca silencie erros.
- raise para sinalizar contratos violados.`}]}],cards:[{id:`l2-erros-excecoes#1`,front:`Como ler um traceback?`,back:`De baixo para cima: tipo e mensagem na última linha, depois o local, depois quem chamou.`},{id:`l2-erros-excecoes#2`,front:`Diferença entre ValueError e TypeError?`,back:`TypeError: tipo inadequado. ValueError: tipo certo, valor inválido.`},{id:`l2-erros-excecoes#3`,front:`Quando o bloco else de um try executa?`,back:`Quando nenhuma exceção ocorreu no try.`}]};export{e as default};
//# sourceMappingURL=l2-erros-excecoes-BdAMwVjc.js.map