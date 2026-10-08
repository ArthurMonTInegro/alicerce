var e={id:`l8-memoria-arquivos`,moduleId:`m8-2`,title:`Memória virtual, pilha × heap e sistemas de arquivos`,titleEn:`Virtual memory, stack vs heap and file systems`,summary:`Como o sistema operacional dá a cada processo a ilusão de uma memória só dele, onde vivem as variáveis e como arquivos viram blocos no disco.`,minutes:50,objectives:[`Explicar endereços virtuais, páginas e tabela de páginas`,`Traduzir um endereço virtual em físico`,`Diferenciar pilha e heap e reconhecer vazamentos de memória`,`Descrever inodes, diretórios e journaling`],skills:[`so-memoria`],terms:[{pt:`memória virtual`,en:`virtual memory`,def:`Cada processo vê um espaço de endereços próprio, traduzido para a memória física pelo SO e pelo hardware.`},{pt:`página`,en:`page`,def:`Bloco de tamanho fixo (ex.: 4 KiB) em que a memória é dividida.`},{pt:`tabela de páginas`,en:`page table`,def:`Mapa de página virtual para quadro (frame) físico.`},{pt:`falta de página`,en:`page fault`,def:`Acesso a uma página que não está na memória física no momento.`},{pt:`pilha`,en:`stack`,def:`Região onde ficam as chamadas de função e suas variáveis locais.`},{pt:`heap`,en:`heap`,def:`Região para dados alocados dinamicamente, que vivem além da função que os criou.`},{pt:`vazamento de memória`,en:`memory leak`,def:`Memória que não é mais usada, mas nunca é liberada.`},{pt:`inode`,en:`inode`,def:`Estrutura que descreve um arquivo: tamanho, dono, permissões e onde estão seus blocos.`}],references:[`ostep`,`cmu-15213`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Cada processo acredita ter uma memória enorme, contínua e só dele. É uma ilusão útil chamada **memória virtual**: o SO e a MMU (um circuito da CPU) traduzem cada endereço que o programa usa para um endereço real da RAM. Isso isola processos (um não lê a memória do outro) e permite usar o disco como extensão da RAM.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`### Tradução de endereços

A memória é dividida em **páginas** de tamanho fixo, tipicamente 4096 bytes (2¹²). Um endereço virtual se divide em duas partes:

- **número da página** = endereço // 4096
- **deslocamento (offset)** = endereço % 4096

A **tabela de páginas** diz em qual **quadro físico** cada página está. Endereço físico = quadro × 4096 + deslocamento. Se a página não está mapeada na RAM, acontece uma **falta de página**: o SO busca a página no disco (lento!) ou encerra o processo se o acesso for inválido (*segmentation fault*).

Consultar a tabela a cada acesso seria lento, então a CPU guarda as traduções recentes num cache chamado **TLB**.

### Pilha × heap

- **Pilha (stack)**: cada chamada de função empilha um *frame* com parâmetros e variáveis locais; ao retornar, ele é descartado. Rápida e automática, mas limitada: recursão sem fim dá *stack overflow* (em Python, \`RecursionError\`).
- **Heap**: dados criados dinamicamente. Em C você chama \`malloc\` e \`free\`; esquecer o \`free\` é um **vazamento**, liberar duas vezes corrompe a memória. Python, Java e JavaScript usam **coleta de lixo** (*garbage collection*): o objeto é liberado quando ninguém mais o referencia.

### Sistemas de arquivos

Um arquivo é um **inode** (metadados + lista de blocos) e um nome numa **entrada de diretório** que aponta para o inode. Por isso existem *hard links*: dois nomes para o mesmo inode. **Journaling** registra a intenção da mudança antes de fazê-la, para o sistema se recuperar de uma queda de energia sem corromper o disco.`},{type:`code`,lang:`text`,code:`Endereço virtual 0x3A7F (= 14975)

  página        = 14975 // 4096 = 3
  deslocamento  = 14975 %  4096 = 2687

Tabela de páginas:  página 3 -> quadro 9

  físico = 9 * 4096 + 2687 = 39551  (0x9A7F)`,runnable:!1,caption:`Repare: com páginas de 4 KiB, os 3 dígitos hexadecimais finais (o deslocamento) não mudam.`}]},{stage:`exemplo`,blocks:[{type:`code`,lang:`python`,code:`TAM_PAGINA = 4096
tabela = {0: 5, 1: 2, 3: 9}   # página virtual -> quadro físico

def traduzir(endereco):
    pagina, desloc = divmod(endereco, TAM_PAGINA)
    if pagina not in tabela:
        return f"page fault na página {pagina}"
    return tabela[pagina] * TAM_PAGINA + desloc

for end in [100, 4100, 14975, 9000]:
    print(end, "->", traduzir(end))`,runnable:!0}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`import sys

def profundidade(n):
    return 0 if n == 0 else 1 + profundidade(n - 1)

print("limite de recursão do Python:", sys.getrecursionlimit())
print(profundidade(500))
try:
    profundidade(10**6)
except RecursionError as e:
    print("Pilha esgotada:", e)

# Referências e coleta de lixo
a = [1, 2, 3]
b = a          # dois nomes, um objeto (no heap)
b.append(4)
print(a, "mesmo objeto?", a is b)`,runnable:!0},{type:`callout`,tone:`english`,text:`Classic error messages: **Segmentation fault (core dumped)** — accessed memory you do not own. **Stack overflow** — too many nested calls. **Out of memory (OOM)** — the system could not give you more memory; on Linux the *OOM killer* may terminate a process.`,title:`English corner`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e8-mem-0`,kind:`mcq`,prompt:`Uma função recursiva sem caso base roda até o programa quebrar. Qual região de memória se esgota?`,difficulty:`facil`,skills:[`so-memoria`],hints:[`Cada chamada guarda seus parâmetros e variáveis locais em algum lugar.`,`Esse lugar cresce a cada chamada e diminui a cada retorno.`],explanation:`A **pilha**: cada chamada empilha um frame. Sem caso base, os frames só se acumulam até o limite (stack overflow; em Python, RecursionError).`,options:[{text:`O heap`,feedback:`O heap guarda objetos dinâmicos; as chamadas em si ficam em outro lugar.`},{text:`A pilha (stack)`,correct:!0,feedback:`Isso: um frame por chamada.`},{text:`O disco`,feedback:`O disco não guarda as chamadas de função em andamento.`},{text:`O cache L1`,feedback:`O cache é transparente para o programa; não é ele que "acaba".`}]}},{type:`exercise`,exercise:{id:`e8-mem-1`,kind:`code`,lang:`python`,prompt:'Escreva `traduzir(endereco, tabela, tam_pagina=4096)` que devolve o endereço físico, ou a string\n`"page fault"` se a página não estiver na tabela (um dicionário página → quadro).',difficulty:`intermediario`,skills:[`so-memoria`],hints:[`divmod(a, b) devolve quociente e resto de uma vez.`,`físico = quadro * tam_pagina + deslocamento.`],explanation:`É exatamente o que a MMU faz em hardware a cada acesso à memória, com a ajuda do TLB para não consultar a tabela toda vez.`,starter:`def traduzir(endereco, tabela, tam_pagina=4096):
    pass
`,solution:`def traduzir(endereco, tabela, tam_pagina=4096):
    pagina, desloc = divmod(endereco, tam_pagina)
    if pagina not in tabela:
        return "page fault"
    return tabela[pagina] * tam_pagina + desloc
`,tests:[{name:`exemplo da lição`,code:`assert traduzir(14975, {3: 9}) == 39551`},{name:`page fault`,code:`assert traduzir(9000, {0: 5}) == "page fault"`},{name:`página pequena`,code:`assert traduzir(25, {2: 7}, tam_pagina=10) == 75`}]}},{type:`exercise`,exercise:{id:`e8-mem-2`,kind:`predict`,lang:`python`,prompt:`O que este programa imprime?`,code:`a = [1, 2]
b = a
c = list(a)
b.append(3)
print(len(a), len(c))`,answer:`3 2`,difficulty:`intermediario`,skills:[`so-memoria`],hints:[`Quantos objetos lista existem no heap depois de cada linha?`,`list(a) cria um objeto novo.`],explanation:"`b = a` cria um segundo nome para o mesmo objeto; `list(a)` copia para um objeto novo. O append via `b` aparece em `a`, mas não em `c`."}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e8-mem-desafio`,kind:`code`,lang:`python`,prompt:`A memória física tem poucos quadros, então o SO precisa escolher qual página **despejar** quando falta espaço.
Escreva \`faltas_lru(acessos, quadros)\` que simula a política **LRU** (despeja a página usada há mais tempo) e devolve
quantas **faltas de página** ocorreram. A memória começa vazia.`,difficulty:`desafio`,skills:[`so-memoria`],hints:[`Mantenha uma lista em ordem de uso: a mais antiga no começo.`,`Página já presente: não é falta, mas ela vira a mais recente.`,`Falta com memória cheia: remova a primeira da lista.`],explanation:`LRU aproxima "despejar quem não será usado logo", explorando a localidade temporal. Na prática os SOs usam aproximações mais baratas (como o algoritmo do relógio), porque registrar cada acesso exato custa caro.`,starter:`def faltas_lru(acessos, quadros):
    return 0
`,solution:`def faltas_lru(acessos, quadros):
    memoria = []
    faltas = 0
    for p in acessos:
        if p in memoria:
            memoria.remove(p)
        else:
            faltas += 1
            if len(memoria) == quadros:
                memoria.pop(0)
        memoria.append(p)
    return faltas`,tests:[{name:`clássico`,code:`assert faltas_lru([7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2], 3) == 9`},{name:`cabe tudo`,code:`assert faltas_lru([1, 2, 1, 2, 1], 2) == 2`},{name:`um quadro`,code:`assert faltas_lru([1, 1, 2, 2, 1], 1) == 3`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:`**Mini-projeto**: compare as políticas FIFO, LRU e a ótima (que olha o futuro) para sequências de acessos aleatórias e com localidade. Faça uma tabela de faltas por número de quadros. Você vai ver a **anomalia de Belady** no FIFO: mais memória pode dar mais faltas.`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Endereço virtual = página + deslocamento; a tabela de páginas leva ao quadro físico; o TLB acelera.
- Falta de página: buscar no disco ou encerrar (segfault).
- Pilha: chamadas e locais, automática. Heap: objetos dinâmicos; GC ou free manual.
- Arquivo = inode + entrada de diretório; journaling protege contra quedas.`}]}],cards:[{id:`l8-memoria-arquivos#1`,front:`Como se calcula o deslocamento de um endereço virtual com páginas de 4096 bytes?`,back:`endereço % 4096.`},{id:`l8-memoria-arquivos#2`,front:`O que é uma falta de página?`,back:`Acesso a uma página que não está mapeada na RAM naquele momento.`},{id:`l8-memoria-arquivos#3`,front:`Diferença entre pilha e heap?`,back:`Pilha: frames das chamadas, liberados ao retornar. Heap: objetos dinâmicos, liberados por free ou pelo coletor de lixo.`},{id:`l8-memoria-arquivos#4`,front:`O que é um inode?`,back:`A estrutura com os metadados de um arquivo e a localização dos seus blocos.`}]};export{e as default};
//# sourceMappingURL=l8-memoria-arquivos-DUPAyf-r.js.map