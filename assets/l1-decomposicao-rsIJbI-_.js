var e={id:`l1-decomposicao`,moduleId:`m1-5`,title:`Resolvendo problemas: a receita de projeto`,titleEn:`Problem solving: the design recipe`,summary:`Um método passo a passo para sair do enunciado e chegar a um programa correto e testado.`,minutes:30,objectives:[`Aplicar a receita de projeto: assinatura, propósito, exemplos, implementação, testes`,`Decompor um problema em funções auxiliares`,`Escrever exemplos antes do código`],skills:[`logica-decomposicao`],terms:[{pt:`assinatura`,en:`signature`,def:`Nome, parâmetros e tipos de uma função: media(notas: list[float]) -> float.`},{pt:`propósito`,en:`purpose statement`,def:`Uma frase dizendo o que a função faz.`},{pt:`exemplo / caso de teste`,en:`example / test case`,def:`Entrada e saída esperada, escritas antes do código.`},{pt:`função auxiliar`,en:`helper function`,def:`Função pequena que resolve uma parte do problema.`}],references:[`htdp`,`waterloo-cs135`,`polya`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Programadores experientes **não** começam digitando código. Eles seguem um **método**. Aqui usamos uma versão da **receita de projeto** (*design recipe*), ensinada no livro *How to Design Programs* e em cursos como o CS 135 de Waterloo.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`**Receita de projeto, em 5 passos:**

1. **Assinatura**: nome da função, o que entra e o que sai (com tipos). \`desconto(preco: float, cupom: str) -> float\`
2. **Propósito**: uma frase. *"Devolve o preço final após aplicar o cupom."*
3. **Exemplos**: escreva entradas e saídas esperadas **antes** do código, incluindo bordas. \`desconto(100, "DEZ") == 90\`, \`desconto(100, "XYZ") == 100\`.
4. **Implementação**: agora sim, o código. Se ficar complicado, **decomponha** em funções auxiliares.
5. **Testes**: transforme os exemplos em \`assert\`s e rode.

Os exemplos do passo 3 fazem você **entender** o problema — se você não consegue escrever o exemplo, ainda não entendeu o enunciado.`},{type:`callout`,tone:`tip`,text:`Se uma função passa de ~20 linhas ou faz "isto **e** aquilo", ela provavelmente deveria ser duas.`}]},{stage:`exemplo`,blocks:[{type:`md`,text:`**Problema**: dado um texto, devolver a palavra mais longa (em caso de empate, a primeira).`},{type:`code`,lang:`python`,code:`def palavra_mais_longa(texto: str) -> str:
    """Devolve a palavra mais longa do texto (a primeira, se houver empate)."""
    melhor = ""
    for palavra in texto.split():
        if len(palavra) > len(melhor):
            melhor = palavra
    return melhor

# exemplos viram testes
assert palavra_mais_longa("o rato roeu a roupa") == "roupa"
assert palavra_mais_longa("ab cd") == "ab"     # empate: a primeira
assert palavra_mais_longa("") == ""            # borda: texto vazio
print("todos os testes passaram")`,runnable:!0}]},{stage:`codigo`,blocks:[{type:`md`,text:`**Decomposição** na prática: um validador de senha forte fica muito mais claro com funções auxiliares.`},{type:`code`,lang:`python`,code:`def tem_digito(s):
    return any(c.isdigit() for c in s)

def tem_maiuscula(s):
    return any(c.isupper() for c in s)

def senha_forte(s):
    return len(s) >= 8 and tem_digito(s) and tem_maiuscula(s)

print(senha_forte("abc"), senha_forte("Alicerce2026"))`,runnable:!0},{type:`callout`,tone:`english`,text:`*"Write the examples first"*, *"break the problem down into smaller pieces"*, *"helper function"* e *"edge case"* são expressões que você vai ouvir em code reviews e entrevistas.`,title:`English corner`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e1-dec-1`,kind:`mcq`,prompt:`Você recebeu o enunciado "calcule o frete". Pela receita de projeto, qual deve ser seu **primeiro** passo?`,difficulty:`facil`,skills:[`logica-decomposicao`],hints:[`O que entra e o que sai da função?`],explanation:`Antes de tudo, defina a assinatura (entradas, saída e tipos). Se não souber o que entra (peso? CEP? valor?), pergunte — é parte de entender o problema.`,options:[{text:`Começar a escrever os if/else`,feedback:`Código antes de entender o problema leva a retrabalho.`},{text:`Definir a assinatura: o que entra (peso, distância...) e o que sai (valor)`,correct:!0,feedback:`Isso.`},{text:`Escolher o nome das variáveis internas`,feedback:`É detalhe de implementação: vem depois.`},{text:`Otimizar o desempenho`,feedback:`"Premature optimization is the root of all evil" (Knuth).`}]}},{type:`exercise`,exercise:{id:`e1-dec-2`,kind:`code`,lang:`python`,prompt:'Siga a receita: escreva `iniciais(nome)` que devolve as iniciais em maiúsculas. `iniciais("ada lovelace") == "AL"`. Ignore espaços extras.',difficulty:`intermediario`,skills:[`logica-decomposicao`,`prog-funcoes`],hints:[`Escreva primeiro 3 exemplos, incluindo um com espaços duplos.`,"`texto.split()` (sem argumentos) já ignora espaços extras.","Para cada palavra, pegue `palavra[0].upper()` e acumule."],explanation:'`"".join(p[0].upper() for p in nome.split())` resolve em uma linha, mas o importante é o processo: exemplos primeiro.',starter:`def iniciais(nome):
    pass
`,solution:`def iniciais(nome):
    return "".join(p[0].upper() for p in nome.split())
`,tests:[{name:`ada lovelace → AL`,code:`assert iniciais("ada lovelace") == "AL"`},{name:`espaços extras`,code:`assert iniciais("  grace   brewster hopper ") == "GBH"`},{name:`vazio`,code:`assert iniciais("") == ""`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e1-dec-desafio`,kind:`code`,lang:`python`,prompt:'Escreva `valida_cpf(cpf)` que recebe uma string com 11 dígitos (pode conter "." e "-") e devolve True se os\n**dígitos verificadores** estão corretos. Regra: para o 1º dígito, multiplique os 9 primeiros por 10, 9, ..., 2,\nsome, calcule `(soma * 10) % 11`; se der 10, vira 0. Para o 2º, faça o mesmo com os 10 primeiros e pesos 11..2.\nCPFs com todos os dígitos iguais são inválidos. **Decomponha** em funções auxiliares.',difficulty:`desafio`,skills:[`logica-decomposicao`,`prog-loops`],hints:[`Quais são os subproblemas? (1) limpar a string, (2) calcular um dígito verificador, (3) juntar tudo.`,"Uma auxiliar `digito(nums, peso_inicial)` pode calcular os dois dígitos: muda só o peso inicial (10 ou 11).",`Exemplo válido para testar: "529.982.247-25".`],explanation:`A mesma regra serve aos dois dígitos com pesos iniciais diferentes: perceber isso (padrão) e extrair uma auxiliar (decomposição) evita duplicação.`,starter:`def valida_cpf(cpf):
    pass
`,solution:`def limpar(cpf):
    return [int(c) for c in cpf if c.isdigit()]

def digito(nums, peso):
    soma = sum(n * p for n, p in zip(nums, range(peso, 1, -1)))
    d = (soma * 10) % 11
    return 0 if d == 10 else d

def valida_cpf(cpf):
    nums = limpar(cpf)
    if len(nums) != 11 or len(set(nums)) == 1:
        return False
    return digito(nums[:9], 10) == nums[9] and digito(nums[:10], 11) == nums[10]`,tests:[{name:`CPF válido formatado`,code:`assert valida_cpf("529.982.247-25") is True`},{name:`dígito errado`,code:`assert valida_cpf("529.982.247-26") is False`},{name:`todos iguais`,code:`assert valida_cpf("111.111.111-11") is False`},{name:`tamanho errado`,code:`assert valida_cpf("123") is False`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:`**Projeto 2 — Lista de tarefas no terminal**: aplique a receita de projeto a cada função (adicionar, listar, concluir, remover). Ele começa no fim deste nível e cresce no Nível 2, quando você aprender listas e arquivos.`},{type:`project`,projectId:`p2-todo`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Receita: assinatura → propósito → exemplos → implementação → testes.
- Exemplos antes do código revelam se você entendeu o problema.
- Funções grandes ou que fazem "isto e aquilo" devem ser divididas.`}]}],cards:[{id:`l1-decomposicao#1`,front:`Quais são os 5 passos da receita de projeto?`,back:`Assinatura, propósito, exemplos, implementação e testes.`},{id:`l1-decomposicao#2`,front:`Por que escrever exemplos antes do código?`,back:`Para garantir que entendeu o problema e já ter os testes prontos.`}]};export{e as default};
//# sourceMappingURL=l1-decomposicao-rsIJbI-_.js.map