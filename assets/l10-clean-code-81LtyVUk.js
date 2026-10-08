var e={id:`l10-clean-code`,moduleId:`m10-2`,title:`Código limpo, refatoração e code review`,titleEn:`Clean code, refactoring and code review`,summary:`Nomes, funções pequenas, duplicação, code smells e como revisar código dos outros (e receber revisão).`,minutes:35,objectives:[`Aplicar princípios de legibilidade`,`Reconhecer code smells`,`Refatorar com segurança, apoiado em testes`,`Fazer e receber code review`],skills:[`eng-clean-code`],terms:[{pt:`refatoração`,en:`refactoring`,def:`Melhorar a estrutura do código sem mudar seu comportamento.`},{pt:`mau cheiro`,en:`code smell`,def:`Indício superficial de um problema de design.`},{pt:`revisão de código`,en:`code review`,def:`Outra pessoa analisar o código antes de integrá-lo.`},{pt:`dívida técnica`,en:`technical debt`,def:`Custo futuro de atalhos tomados hoje.`},{pt:`legibilidade`,en:`readability`,def:`Facilidade de entender o código.`},{pt:`DRY`,en:`DRY (don't repeat yourself)`,def:`Evitar duplicação de conhecimento.`}],references:[`refactoring`,`swe-at-google`,`pragmatic-programmer`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Código é **lido** muito mais vezes do que é escrito. **Código limpo** é código que outra pessoa (ou você daqui a 6 meses) entende rápido e muda com segurança. **Refatorar** é melhorar a estrutura **sem mudar o comportamento** — e os **testes** são o que garante que nada mudou.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:'**Princípios práticos**:\n\n- **Nomes que revelam intenção**: `dias_desde_ultimo_acesso` em vez de `d`.\n- **Funções pequenas que fazem uma coisa**, num só nível de abstração.\n- **Sem números mágicos**: `if idade >= IDADE_MINIMA`.\n- **Retorno antecipado** (*guard clauses*) em vez de `if`s aninhados.\n- **DRY**, com moderação: duplicação de **conhecimento** é ruim; semelhança acidental pode ficar.\n- **Comentários** explicam o **porquê**, não o quê.\n\n**Code smells** comuns: função longa, lista enorme de parâmetros, nomes vagos (`dados`, `tmp`, `gerenciador`), código duplicado, comentários desatualizados, flags booleanas que mudam o comportamento da função.\n\n**Code review**: revise o **código**, não a pessoa; faça perguntas ("o que acontece se a lista vier vazia?"); separe bloqueadores de sugestões ("nit:"); elogie o que está bom. Ao receber: não leve para o lado pessoal, explique decisões, agradeça.'}]},{stage:`exemplo`,blocks:[{type:`code`,lang:`python`,code:`# ANTES
def p(l, t):
    r = []
    for i in l:
        if t == 1:
            if i["v"] > 100:
                r.append(i["n"])
        else:
            if i["v"] <= 100:
                r.append(i["n"])
    return r

# DEPOIS
LIMITE_PRECO_ALTO = 100

def nomes_caros(produtos):
    return [p["nome"] for p in produtos if p["valor"] > LIMITE_PRECO_ALTO]

def nomes_baratos(produtos):
    return [p["nome"] for p in produtos if p["valor"] <= LIMITE_PRECO_ALTO]

produtos = [{"nome": "teclado", "valor": 150}, {"nome": "caneta", "valor": 3}]
print(nomes_caros(produtos), nomes_baratos(produtos))`,runnable:!0}]},{stage:`codigo`,blocks:[{type:`md`,text:`Ferramentas automatizam parte disso: **formatadores** (black, ruff format, prettier), **linters** (ruff, eslint) e **type checkers** (mypy, TypeScript). Eles rodam no editor e na CI, liberando a revisão humana para o que importa: design e correção.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e10-clean-1`,kind:`fix`,lang:`python`,prompt:"Refatore `f` sem mudar o comportamento: dê nomes claros (a função deve se chamar `calcular_frete`), remova o número mágico e use retorno antecipado. Os testes verificam o comportamento **e** o nome.",difficulty:`intermediario`,skills:[`eng-clean-code`],hints:[`O que a função calcula? Leia o código e descubra o domínio.`,`Crie constantes como FRETE_GRATIS_A_PARTIR_DE = 200.`],explanation:`O comportamento é idêntico (os testes provam), mas agora o código se explica. Refatorar apoiado em testes é o que torna a mudança segura.`,starter:`def f(v, p):
    if v < 200:
        if p > 10:
            return 15 + (p - 10) * 2
        else:
            return 15
    else:
        return 0`,solution:`FRETE_GRATIS_A_PARTIR_DE = 200
FRETE_BASE = 15
PESO_INCLUIDO_KG = 10
CUSTO_POR_KG_EXTRA = 2

def calcular_frete(valor_compra, peso_kg):
    if valor_compra >= FRETE_GRATIS_A_PARTIR_DE:
        return 0
    excesso = max(0, peso_kg - PESO_INCLUIDO_KG)
    return FRETE_BASE + excesso * CUSTO_POR_KG_EXTRA`,tests:[{name:`mesmo comportamento`,code:`casos = [(100, 5), (100, 12), (250, 30), (199.99, 10), (200, 1)]
esperado = [15, 19, 0, 15, 0]
assert [calcular_frete(v, p) for v, p in casos] == esperado`},{name:`não usa mais o nome f`,code:`assert "f" not in dir() or not callable(globals().get("f"))`}]}},{type:`exercise`,exercise:{id:`e10-clean-2`,kind:`mcq`,prompt:`Num code review, qual comentário é mais útil?`,difficulty:`facil`,skills:[`eng-clean-code`],hints:[`Qual ajuda o autor a agir, sem atacá-lo?`],explanation:`Comentários específicos, com o caso concreto e uma sugestão, ajudam o autor a agir.`,options:[{text:`"Isso está horrível."`,feedback:`Ataca e não ajuda a melhorar.`},{text:'"O que acontece aqui se `itens` vier vazio? Acho que dá ZeroDivisionError na linha 12; que tal tratar antes?"',correct:!0,feedback:`Específico, gentil e acionável.`},{text:`"LGTM" sem ler`,feedback:`Aprovação sem revisão não protege ninguém.`},{text:`"Eu faria diferente."`,feedback:`Diferente como? Por quê?`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e10-clean-desafio`,kind:`fix`,lang:`python`,prompt:"O relatório abaixo duplica a lógica de formatação três vezes. Refatore extraindo uma função `formatar_linha(rotulo, valor)` e mantenha a saída **idêntica**.",difficulty:`avancado`,skills:[`eng-clean-code`],hints:[`O que muda entre as três linhas? Só o rótulo e o valor.`,"O teste verifica a saída e a existência de `formatar_linha`."],explanation:`Extrair a função elimina a duplicação de conhecimento (o formato). Se o formato mudar, muda em um lugar só.`,starter:`def relatorio(total, media, maximo):
    linhas = []
    linhas.append("Total".ljust(10, ".") + f"{total:>10.2f}")
    linhas.append("Média".ljust(10, ".") + f"{media:>10.2f}")
    linhas.append("Máximo".ljust(10, ".") + f"{maximo:>10.2f}")
    return "\\n".join(linhas)`,solution:`def formatar_linha(rotulo, valor):
    return rotulo.ljust(10, ".") + f"{valor:>10.2f}"

def relatorio(total, media, maximo):
    return "\\n".join(formatar_linha(r, v) for r, v in [("Total", total), ("Média", media), ("Máximo", maximo)])`,tests:[{name:`saída idêntica`,code:`assert relatorio(10, 2.5, 7) == "Total.....     10.00\\nMédia.....      2.50\\nMáximo....      7.00"`},{name:`função extraída`,code:`assert formatar_linha("X", 1) == "X.........      1.00"`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:`**Revise seu próprio código**: abra o projeto da lista de tarefas, encontre 5 code smells e refatore cada um em um commit separado, rodando os testes a cada passo. Escreva a descrição do PR explicando as mudanças.`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Nomes claros, funções pequenas, sem números mágicos, guard clauses.
- Refatorar = mudar estrutura, não comportamento — com testes.
- Code review: específico, gentil, acionável.`}]}],cards:[{id:`l10-clean-code#1`,front:`O que é refatoração?`,back:`Melhorar a estrutura do código sem alterar seu comportamento externo.`},{id:`l10-clean-code#2`,front:`O que comentários devem explicar?`,back:`O porquê de decisões que o código não deixa claro, não o quê.`}]};export{e as default};
//# sourceMappingURL=l10-clean-code-81LtyVUk.js.map