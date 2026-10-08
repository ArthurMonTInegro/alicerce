var e={id:`l2-dicionarios`,moduleId:`m2-2`,title:`Dicionários, conjuntos e tuplas`,titleEn:`Dictionaries, sets and tuples`,summary:`Mapear chaves a valores, guardar elementos únicos e agrupar dados imutáveis.`,minutes:30,objectives:[`Usar dict para associar chaves a valores`,`Usar set para pertencimento e unicidade`,`Saber quando usar tupla`,`Contar frequências`],skills:[`prog-dicionarios`],terms:[{pt:`dicionário`,en:`dictionary (dict)`,def:`Coleção de pares chave → valor.`,example:`KeyError: 'idade'`},{pt:`chave`,en:`key`,def:`Identificador usado para buscar um valor no dicionário.`},{pt:`conjunto`,en:`set`,def:`Coleção sem ordem e sem repetição.`},{pt:`tupla`,en:`tuple`,def:`Sequência imutável: (lat, long).`},{pt:`imutável`,en:`immutable`,def:`Que não pode ser alterado depois de criado.`}],references:[`python-tutorial`,`python-docs`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:'Um **{{dicionário|dictionary}}** associa **{{chaves|keys}}** a **valores**: `aluno = {"nome": "Ana", "idade": 17}`. Em vez de lembrar "a idade está na posição 1", você pede `aluno["idade"]`. Um **{{conjunto|set}}** guarda elementos únicos; uma **{{tupla|tuple}}** é uma sequência que não muda.'}]},{stage:`explicacao`,blocks:[{type:`md`,text:"**dict**: `d[chave]` lê (dá `KeyError` se não existir); `d.get(chave, padrao)` lê com valor padrão; `d[chave] = valor` cria/atualiza; `for k, v in d.items():` percorre.\nChaves precisam ser **imutáveis** (str, int, tuple).\n\n**set**: `{1, 2, 3}`; `add`, `remove`; operações de conjuntos: `|` união, `&` interseção, `-` diferença. Testar `x in s` é muito rápido.\n\n**tuple**: `ponto = (3, 4)`; desempacotar: `x, y = ponto`. Use para dados que andam juntos e não mudam."},{type:`callout`,tone:`info`,text:"Buscar uma chave em um dict ou um elemento em um set leva, em média, **tempo constante**, não importa o tamanho. Em uma lista, `x in lista` precisa olhar elemento por elemento. Você vai entender o porquê na aula de **hash tables** (Nível 3).",title:`Por que dict e set são rápidos?`}]},{stage:`exemplo`,blocks:[{type:`md`,text:`**Padrão contagem de frequência** — um dos mais usados em programação e em entrevistas:`},{type:`trace`,code:`texto = "banana"
freq = {}
for letra in texto:
    freq[letra] = freq.get(letra, 0) + 1
print(freq)`}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`estoque = {"caneta": 10, "caderno": 3}
estoque["borracha"] = 7
estoque["caderno"] -= 1
for item, qtd in estoque.items():
    print(f"{item}: {qtd}")

a = {"python", "sql", "git"}
b = {"git", "docker"}
print(a & b, a | b, a - b)

from collections import Counter
print(Counter("mississippi").most_common(2))`,runnable:!0}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e2-dict-1`,kind:`predict`,lang:`python`,prompt:`O que é impresso?`,difficulty:`facil`,skills:[`prog-dicionarios`],hints:["`get` devolve o valor padrão quando a chave não existe."],explanation:`"b" existe (2); "z" não existe, então get devolve o padrão 0.`,code:`d = {"a": 1, "b": 2}
print(d.get("b", 0), d.get("z", 0))`,answer:`2 0`}},{type:`exercise`,exercise:{id:`e2-dict-2`,kind:`code`,lang:`python`,prompt:"Escreva `contar_palavras(texto)` que devolve um dict com a frequência de cada palavra, ignorando maiúsculas/minúsculas.",difficulty:`intermediario`,skills:[`prog-dicionarios`],hints:["Normalize primeiro: `texto.lower().split()`.","Padrão: `freq[p] = freq.get(p, 0) + 1`."],explanation:`Normalizar (lower) antes de contar evita que "Casa" e "casa" sejam contadas separadamente.`,starter:`def contar_palavras(texto):
    pass
`,solution:`def contar_palavras(texto):
    freq = {}
    for p in texto.lower().split():
        freq[p] = freq.get(p, 0) + 1
    return freq`,tests:[{name:`conta`,code:`assert contar_palavras("a casa A") == {"a": 2, "casa": 1}`},{name:`vazio`,code:`assert contar_palavras("") == {}`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e2-dict-desafio`,kind:`code`,lang:`python`,prompt:'Escreva `anagramas(palavras)` que agrupa palavras que são anagramas entre si. Devolva uma lista de grupos (listas), cada grupo na ordem original de aparição, e os grupos na ordem em que apareceram. Ex.: `["amor", "roma", "ramo", "sol", "los"]` → `[["amor","roma","ramo"], ["sol","los"]]`.',difficulty:`desafio`,skills:[`prog-dicionarios`,`prog-listas`],hints:[`Duas palavras são anagramas se têm as mesmas letras. Que "assinatura" igual elas têm?`,'A assinatura pode ser `"".join(sorted(palavra))`. Use-a como chave de um dict de listas.',`Dicionários preservam a ordem de inserção (Python 3.7+).`],explanation:`Escolher a **chave certa** (as letras ordenadas) transforma o problema em agrupamento simples. É um problema clássico de entrevista (*group anagrams*).`,starter:`def anagramas(palavras):
    pass
`,solution:`def anagramas(palavras):
    grupos = {}
    for p in palavras:
        grupos.setdefault("".join(sorted(p)), []).append(p)
    return list(grupos.values())`,tests:[{name:`exemplo`,code:`assert anagramas(["amor", "roma", "ramo", "sol", "los"]) == [["amor", "roma", "ramo"], ["sol", "los"]]`},{name:`sem anagramas`,code:`assert anagramas(["a", "b"]) == [["a"], ["b"]]`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:'**Lista de tarefas (parte 2)**: cada tarefa vira um dict `{"titulo": ..., "feita": False, "prioridade": 1}`. Permita marcar como feita e listar por prioridade.'},{type:`project`,projectId:`p2-todo`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- dict: chave → valor; \`get\` com padrão evita KeyError.
- set: únicos, pertencimento rápido, operações de conjunto.
- tuple: imutável, desempacotamento.`}]}],cards:[{id:`l2-dicionarios#1`,front:`Como ler uma chave de dict sem risco de KeyError?`,back:`d.get(chave, valor_padrao).`},{id:`l2-dicionarios#2`,front:`Quando usar um set?`,back:`Para elementos únicos e testes de pertencimento rápidos.`},{id:`l2-dicionarios#3`,front:`O que pode ser chave de dict?`,back:`Valores imutáveis (hashable): str, int, float, tuple de imutáveis.`}]};export{e as default};
//# sourceMappingURL=l2-dicionarios-CujBktfb.js.map