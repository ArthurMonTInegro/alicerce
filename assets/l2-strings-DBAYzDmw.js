var e={id:`l2-strings`,moduleId:`m2-3`,title:`Strings em profundidade`,titleEn:`Strings in depth`,summary:`Métodos de texto, imutabilidade, fatias, busca e formatação.`,minutes:25,objectives:[`Usar métodos split, join, strip, replace, find, lower/upper`,`Entender que strings são imutáveis`,`Processar texto caractere a caractere`],skills:[`prog-strings`],terms:[{pt:`caractere`,en:`character (char)`,def:`Um símbolo: letra, dígito, espaço, emoji.`},{pt:`separar`,en:`split`,def:`Dividir um texto em partes.`},{pt:`juntar`,en:`join`,def:`Unir partes em um texto com um separador.`},{pt:`remover espaços das pontas`,en:`strip / trim`,def:`Tirar espaços (e \\n) do início e do fim.`},{pt:`subcadeia`,en:`substring`,def:`Parte de uma string.`}],references:[`python-docs`,`python-tutorial`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:"Uma **string** é uma sequência de caracteres. Ela se comporta como uma lista para leitura (índices, fatias, `for`), mas é **imutável**: métodos como `upper()` **devolvem uma nova string**, sem alterar a original."}]},{stage:`explicacao`,blocks:[{type:`table`,head:[`Método`,`Exemplo`,`Resultado`],rows:[[`split`,`"a,b,c".split(",")`,`["a", "b", "c"]`],[`join`,`"-".join(["a", "b"])`,`"a-b"`],[`strip`,`"  oi \\n".strip()`,`"oi"`],[`replace`,`"casa".replace("a", "o")`,`"coso"`],[`find`,`"banana".find("na")`,`2 (ou -1 se não achar)`],[`lower / upper`,`"Oi".lower()`,`"oi"`],[`startswith`,`"main.py".endswith(".py")`,`True`],[`isdigit`,`"123".isdigit()`,`True`]]},{type:`callout`,tone:`warn`,text:"`s.upper()` sozinho não faz nada visível: o resultado precisa ser guardado: `s = s.upper()`."}]},{stage:`exemplo`,blocks:[{type:`code`,lang:`python`,code:`linha = "  Ana;17;São Paulo  "
nome, idade, cidade = linha.strip().split(";")
print(nome, int(idade) + 1, cidade.upper())`,runnable:!0}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`palavra = "Alicerce"
print(palavra[0], palavra[-1], palavra[:3], palavra[::-1])
print(len(palavra), palavra.count("e"), "ce" in palavra)
s = "programar"
s.upper()
print(s)          # não mudou!
s = s.upper()
print(s)`,runnable:!0}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e2-str-1`,kind:`code`,lang:`python`,prompt:'Escreva `eh_palindromo(s)` que devolve True se o texto é palíndromo, ignorando espaços e maiúsculas. `"Socorram me subi no onibus em Marrocos"` é palíndromo.',difficulty:`intermediario`,skills:[`prog-strings`],hints:[`Primeiro normalize: minúsculas e sem espaços.`,"Compare a string normalizada com ela invertida (`[::-1]`)."],explanation:'Normalizar e depois comparar com o reverso. Note que acentos fariam diferença ("ô" ≠ "o"); normalizar acentos exige o módulo `unicodedata`.',starter:`def eh_palindromo(s):
    pass
`,solution:`def eh_palindromo(s):
    limpo = s.lower().replace(" ", "")
    return limpo == limpo[::-1]`,tests:[{name:`frase palíndroma`,code:`assert eh_palindromo("Socorram me subi no onibus em Marrocos")`},{name:`não palíndromo`,code:`assert not eh_palindromo("alicerce")`},{name:`vazio é palíndromo`,code:`assert eh_palindromo("")`}]}},{type:`exercise`,exercise:{id:`e2-str-2`,kind:`predict`,lang:`python`,prompt:`O que é impresso?`,difficulty:`facil`,skills:[`prog-strings`],hints:[`split sem argumentos separa por espaços; join une com o separador.`],explanation:`split → ["um", "dois", "tres"]; "-".join(...) → "um-dois-tres".`,code:`print("-".join("um dois tres".split()))`,answer:`um-dois-tres`}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e2-str-desafio`,kind:`code`,lang:`python`,prompt:'Escreva `comprimir(s)` que faz *run-length encoding*: `"aaabccdddd"` → `"a3b1c2d4"`. String vazia devolve `""`.',difficulty:`desafio`,skills:[`prog-strings`,`prog-loops`],hints:[`Percorra guardando o caractere atual e quantas vezes ele repetiu.`,`Quando o caractere muda, escreva o par anterior e reinicie a contagem. Não esqueça do último grupo depois do loop.`],explanation:'O erro clássico é esquecer de emitir o último grupo após o loop. Para muitos pedaços, acumule em lista e use `"".join` — concatenar strings em loop cria várias cópias.',starter:`def comprimir(s):
    pass
`,solution:`def comprimir(s):
    if not s:
        return ""
    partes = []
    atual, n = s[0], 0
    for c in s:
        if c == atual:
            n += 1
        else:
            partes.append(f"{atual}{n}")
            atual, n = c, 1
    partes.append(f"{atual}{n}")
    return "".join(partes)`,tests:[{name:`exemplo`,code:`assert comprimir("aaabccdddd") == "a3b1c2d4"`},{name:`um caractere`,code:`assert comprimir("z") == "z1"`},{name:`vazio`,code:`assert comprimir("") == ""`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:'**Mini-projeto: limpador de CSV**. Escreva uma função que recebe linhas como `"  ana ; 17;SP "` e devolve dicts limpos `{"nome": "Ana", "idade": 17, "uf": "SP"}`. Você vai usar isso com arquivos na próxima lição.'}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Strings são imutáveis: métodos devolvem novas strings.
- split/join, strip, replace, find, lower/upper.
- Para montar textos grandes, acumule em lista e use join.`}]}],cards:[{id:`l2-strings#1`,front:"O que acontece com s depois de `s.upper()` sem atribuição?",back:`Nada: strings são imutáveis; o resultado precisa ser guardado.`},{id:`l2-strings#2`,front:`Como transformar "a,b,c" em ["a","b","c"]?`,back:`"a,b,c".split(",")`}]};export{e as default};
//# sourceMappingURL=l2-strings-DBAYzDmw.js.map