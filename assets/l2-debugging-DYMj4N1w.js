var e={id:`l2-debugging`,moduleId:`m2-4`,title:`Depuração com método`,titleEn:`Systematic debugging`,summary:`Reproduzir, isolar, formular hipóteses, testar. Print debugging, assert e o depurador.`,minutes:30,objectives:[`Aplicar o método científico à depuração`,`Usar prints estratégicos e assert`,`Conhecer breakpoints e o pdb`,`Explicar o código em voz alta (rubber duck)`],skills:[`py-debugging`],terms:[{pt:`depuração`,en:`debugging`,def:`Processo de encontrar e corrigir defeitos.`},{pt:`reproduzir`,en:`reproduce`,def:`Fazer o bug acontecer de forma confiável.`},{pt:`ponto de parada`,en:`breakpoint`,def:`Lugar onde o depurador pausa a execução.`},{pt:`depurador`,en:`debugger`,def:`Ferramenta para executar passo a passo e inspecionar variáveis.`},{pt:`hipótese`,en:`hypothesis`,def:`Explicação provisória que você testa.`}],references:[`python-docs`,`missing-semester`,`cs50`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`**Depurar** não é mudar coisas aleatoriamente até funcionar. É um processo **científico**: observar, formular uma hipótese, fazer um experimento, concluir. Programadores experientes não erram menos — eles **encontram** erros mais rápido porque seguem um método.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:'**O método em 5 passos:**\n\n1. **Reproduza**: descubra uma entrada que sempre causa o bug. Sem reprodução, não há como saber se corrigiu.\n2. **Isole**: reduza o problema. Qual a **menor** entrada que falha? Qual função? Comente partes, teste funções sozinhas.\n3. **Hipótese**: "acho que `total` está zerando dentro do loop".\n4. **Experimento**: um `print(f"{i=} {total=}")` ou um `assert` confirma ou derruba a hipótese.\n5. **Corrija e previna**: corrija, rode de novo, e **escreva um teste** que pegaria esse bug no futuro.\n\n**Ferramentas**: `print(f"{x=}")` (mostra nome e valor), `assert condicao, "mensagem"`, o passo a passo do Alicerce, e o depurador de verdade: `breakpoint()` no código abre o `pdb` (no VS Code, clique ao lado do número da linha).\n\n**Rubber duck debugging**: explique o código, linha por linha, em voz alta (para um patinho de borracha, se preciso). Muitas vezes você encontra o bug no meio da explicação.'}]},{stage:`exemplo`,blocks:[{type:`md`,text:`Um bug real: a função deveria devolver a média das notas **acima de 5**, mas devolve um valor estranho. Use o passo a passo para formular uma hipótese:`},{type:`trace`,code:`def media_acima_de_5(notas):
    soma = 0
    qtd = 0
    for n in notas:
        if n > 5:
            soma += n
        qtd += 1
    return soma / qtd

print(media_acima_de_5([4, 6, 8]))`,caption:`qtd está contando todas as notas, não só as acima de 5: indentação errada.`}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`def fatorial(n):
    resultado = 1
    for i in range(1, n):
        resultado *= i
        print(f"{i=} {resultado=}")   # print estratégico
    return resultado

print(fatorial(4))   # deveria ser 24... qual é a hipótese?`,runnable:!0}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e2-dbg-1`,kind:`fix`,lang:`python`,prompt:"Corrija `fatorial(n)` do exemplo acima. `fatorial(4)` deve ser 24 e `fatorial(0)` deve ser 1.",difficulty:`facil`,skills:[`py-debugging`],hints:[`Com os prints, quais valores de i aparecem? Falta algum?`,`range(1, n) para antes de n. Off-by-one!`],explanation:`range(1, n) gera 1..n-1. O correto é range(1, n + 1). Um clássico off-by-one.`,starter:`def fatorial(n):
    resultado = 1
    for i in range(1, n):
        resultado *= i
    return resultado`,solution:`def fatorial(n):
    resultado = 1
    for i in range(1, n + 1):
        resultado *= i
    return resultado`,tests:[{name:`fatorial(4) == 24`,code:`assert fatorial(4) == 24`},{name:`fatorial(0) == 1`,code:`assert fatorial(0) == 1`},{name:`fatorial(1) == 1`,code:`assert fatorial(1) == 1`}]}},{type:`exercise`,exercise:{id:`e2-dbg-2`,kind:`fix`,lang:`python`,prompt:"Corrija `media_acima_de_5` (do exemplo). Para uma lista sem notas acima de 5, devolva 0.",difficulty:`intermediario`,skills:[`py-debugging`],hints:["O que `qtd` deveria contar?","Em que nível de indentação está `qtd += 1`?"],explanation:"`qtd += 1` precisa estar dentro do if. E é preciso proteger a divisão quando qtd == 0.",starter:`def media_acima_de_5(notas):
    soma = 0
    qtd = 0
    for n in notas:
        if n > 5:
            soma += n
        qtd += 1
    return soma / qtd`,solution:`def media_acima_de_5(notas):
    soma = 0
    qtd = 0
    for n in notas:
        if n > 5:
            soma += n
            qtd += 1
    return soma / qtd if qtd else 0`,tests:[{name:`[4, 6, 8] → 7`,code:`assert media_acima_de_5([4, 6, 8]) == 7`},{name:`sem notas acima de 5`,code:`assert media_acima_de_5([1, 2]) == 0`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e2-dbg-desafio`,kind:`fix`,lang:`python`,prompt:`Esta função deveria devolver a **segunda maior** nota distinta (ou None se não existir), mas falha em vários casos. Reproduza, isole e corrija. Os testes revelam os casos.`,difficulty:`desafio`,skills:[`py-debugging`],hints:[`Teste com [5, 5, 3]. E com [3, 8, 5]? Qual falha?`,"O que acontece com `segunda` quando aparece um novo maior?",`Quando surge um novo maior, o antigo maior vira a segunda. Ignore valores iguais ao maior.`],explanation:`Os bugs: não "rebaixar" o antigo maior para segundo, e não ignorar empates com o maior. Escrever casos pequenos e específicos (isolar) revela cada um.`,starter:`def segunda_maior(xs):
    maior = None
    segunda = None
    for x in xs:
        if maior is None or x > maior:
            maior = x
        elif segunda is None or x > segunda:
            segunda = x
    return segunda`,solution:`def segunda_maior(xs):
    maior = None
    segunda = None
    for x in xs:
        if maior is None or x > maior:
            segunda = maior
            maior = x
        elif x != maior and (segunda is None or x > segunda):
            segunda = x
    return segunda`,tests:[{name:`[3, 8, 5] → 5`,code:`assert segunda_maior([3, 8, 5]) == 5`},{name:`[3, 5, 8] → 5`,code:`assert segunda_maior([3, 5, 8]) == 5`},{name:`[5, 5, 3] → 3`,code:`assert segunda_maior([5, 5, 3]) == 3`},{name:`[7, 7] → None`,code:`assert segunda_maior([7, 7]) is None`},{name:`[] → None`,code:`assert segunda_maior([]) is None`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:`**Diário de bugs**: a partir de hoje, toda vez que um bug levar mais de 10 minutos, anote: sintoma, causa, como encontrou, como evitar. Em poucas semanas você terá seu próprio catálogo de erros — e ótimos exemplos para entrevistas ("conte sobre um bug difícil que você resolveu").`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Reproduza → isole → hipótese → experimento → corrija e escreva um teste.
- \`print(f"{x=}")\`, assert, breakpoint().
- Explique o código em voz alta.`}]}],cards:[{id:`l2-debugging#1`,front:`Quais são os passos da depuração sistemática?`,back:`Reproduzir, isolar, formular hipótese, experimentar, corrigir e prevenir com um teste.`},{id:`l2-debugging#2`,front:`O que é rubber duck debugging?`,back:`Explicar o código linha a linha em voz alta para encontrar o erro.`}]};export{e as default};
//# sourceMappingURL=l2-debugging-DYMj4N1w.js.map