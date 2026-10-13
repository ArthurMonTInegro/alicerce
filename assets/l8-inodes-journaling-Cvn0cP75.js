var e={id:`l8-inodes-journaling`,moduleId:`m8-2`,title:`Sistemas de arquivos por dentro: inodes, diretórios, links e journaling`,titleEn:`File systems inside: inodes, directories, links and journaling`,summary:`Como um sistema de arquivos no estilo Unix acha os blocos de um arquivo com ponteiros diretos e indiretos (e extents), transforma um caminho num número de inode, por que hard links e links simbólicos se comportam de jeitos tão diferentes, quando o espaço de um arquivo apagado volta de fato, e como o journaling e o fsync protegem os dados de uma queda de energia.`,minutes:50,objectives:[`Dizer o que um inode guarda (e que o nome não está nele) e calcular o tamanho máximo de arquivo com ponteiros diretos e indiretos`,`Localizar em qual ponteiro do inode está um byte de um arquivo`,`Resolver um caminho componente por componente, como o kernel, inclusive com ".." e links simbólicos`,`Diferenciar hard link e link simbólico e prever quando os blocos de um arquivo apagado são liberados`,`Explicar por que uma queda de energia pode corromper o disco, como o journaling resolve e por que write() sem fsync não garante nada`],skills:[`so-memoria`],terms:[{pt:`bloco`,en:`block`,def:`Unidade de alocação do sistema de arquivos, de tamanho fixo (normalmente 4 KiB); o disco só conhece blocos numerados.`},{pt:`inode`,en:`inode`,def:`Estrutura com os metadados de um arquivo (tipo, permissões, dono, tamanho, datas, contagem de links) e a localização dos seus blocos.`,example:`No space left on device can also mean the file system ran out of inodes: check df -i.`},{pt:`número do inode`,en:`inode number`,def:`Identificador do inode, único dentro de um sistema de arquivos; aparece na primeira coluna de ls -i.`},{pt:`ponteiro indireto`,en:`indirect pointer`,def:`Número de um bloco que não guarda dados, e sim mais números de bloco.`},{pt:`extent`,en:`extent`,def:`Faixa contínua de blocos descrita por (início lógico, início físico, comprimento); usada pelo ext4, XFS e Btrfs no lugar de um ponteiro por bloco.`},{pt:`entrada de diretório`,en:`directory entry`,def:`Par (nome, número do inode) guardado dentro de um diretório.`},{pt:`contagem de links`,en:`link count`,def:`Quantas entradas de diretório apontam para um inode; o rm desconta 1.`},{pt:`hard link`,en:`hard link`,def:`Uma entrada de diretório a mais para o mesmo inode: outro nome, mesmo arquivo.`},{pt:`link simbólico`,en:`symbolic link (symlink)`,def:`Arquivo especial cujo conteúdo é um caminho, seguido durante a resolução; pode ficar pendurado.`,example:`Too many levels of symbolic links`},{pt:`consistência após queda`,en:`crash consistency`,def:`Garantia de que as estruturas do disco continuam coerentes entre si mesmo se a energia acabar no meio de uma atualização.`},{pt:`journaling`,en:`journaling`,def:`Técnica de gravar antes, num diário, a descrição da mudança, para refazê-la depois de uma queda.`},{pt:`diário`,en:`journal`,def:`Área reservada do disco onde o journaling grava as transações antes de aplicá-las.`},{pt:`checkpoint`,en:`checkpoint`,def:`Copiar as mudanças já confirmadas no diário para os lugares definitivos no disco.`},{pt:`fsync`,en:`fsync`,def:`Chamada de sistema que só retorna depois que os dados e metadados de um arquivo chegaram ao armazenamento.`,example:`Call fsync() on the file and then on its parent directory to make a rename durable.`}],references:[`ostep`,`linux-man`,`tanenbaum-so`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`O disco não sabe o que é um arquivo. Para ele só existem {{blocos|blocks}} numerados, de tamanho fixo, normalmente 4 KiB. Nomes, pastas, permissões e tamanhos são uma estrutura de dados que o **sistema de arquivos** (ext4, XFS, Btrfs, NTFS, APFS) monta em cima desses blocos. Ela precisa ser rápida para arquivos de 1 KB e de 100 GB, e precisa sobreviver a uma queda de energia no meio de uma gravação.

A primeira lição deste módulo resumiu tudo em uma frase: arquivo = inode + entrada de diretório, e o journaling protege contra quedas. Agora vamos abrir cada peça. Como um inode com espaço para 15 números de bloco localiza os milhões de blocos de um vídeo? Como \`/home/ana/notas.txt\` vira um número de inode? Por que apagar um log de 50 GB às vezes não libera espaço nenhum? E o que acontece no milissegundo em que a luz acaba enquanto o sistema da loja grava uma nota fiscal?`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`### O que o inode guarda (e o que não guarda)
Todo arquivo tem um **inode**, identificado por um {{número de inode|inode number}} único dentro daquele sistema de arquivos. Ele guarda:

- o **tipo** (arquivo comum, diretório, link simbólico, dispositivo...) e as **permissões**;
- o **dono** e o **grupo** (uid e gid);
- o **tamanho** em bytes;
- as **datas**: \`atime\` (último acesso), \`mtime\` (última mudança no conteúdo) e \`ctime\` (última mudança no **inode**, como trocar a permissão; não é a data de criação, que o ext4 guarda à parte e o \`stat\` mostra como *Birth*);
- a {{contagem de links|link count}}: quantos nomes apontam para ele;
- onde estão os **blocos de dados**.

O que ele **não** guarda é o nome. O nome mora no diretório. É isso que permite a um arquivo ter dois nomes, ou nenhum.`},{type:`code`,lang:`text`,code:`$ ls -li notas.txt
1679531 -rw-r--r-- 1 ana ana 5120 mar  1 18:02 notas.txt
$ stat -c 'inode %i, %h link(s), %s bytes, %b unidades de %B bytes' notas.txt
inode 1679531, 1 link(s), 5120 bytes, 16 unidades de 512 bytes`,runnable:!1,caption:`A primeira coluna do ls -li é o número do inode; o número logo depois das permissões é a contagem de links. Os 5 120 bytes ocupam 2 blocos de 4 KiB, que o stat conta em unidades de 512 bytes: 16.`},{type:`md`,text:`### Do byte ao bloco: ponteiros diretos e indiretos
No ext2 e no ext3 (e no sistema de arquivos clássico do Unix, de onde a ideia vem), o inode tem 15 números de bloco:

- 12 **diretos**: cada um aponta para um bloco de dados;
- 1 **indireto simples**: aponta para um bloco cheio de números de bloco, cada um apontando para dados;
- 1 **indireto duplo**: aponta para um bloco de números de blocos de números de bloco;
- 1 **indireto triplo**: mais um nível.

Um {{ponteiro indireto|indirect pointer}} aponta para um bloco que não guarda dados, e sim mais ponteiros. Com blocos de 4 KiB e números de bloco de 4 bytes, cada um desses blocos guarda 4096 / 4 = 1024 números.`},{type:`table`,head:[`Ponteiro`,`Blocos de dados alcançados`,`Bytes (blocos de 4 KiB)`,`Leituras extras até o dado`],rows:[[`12 diretos`,`12`,`48 KiB`,`0`],[`indireto simples`,`1024`,`4 MiB`,`1`],[`indireto duplo`,`1024² = 1 048 576`,`4 GiB`,`2`],[`indireto triplo`,`1024³ ≈ 1,07 bilhão`,`4 TiB`,`3`]],caption:`Somando tudo, pouco mais de 4 TiB. No ext3 real, outro campo do inode (a contagem de setores de 512 bytes, de 32 bits) limita o arquivo a 2 TiB antes disso. As leituras extras são dos blocos de ponteiros, que ficam no cache da memória depois do primeiro acesso.`},{type:`md`,text:"Por que um formato tão desequilibrado? Porque a maioria dos arquivos é pequena: um arquivo de até 48 KiB é localizado só com o inode, sem nenhuma leitura extra. Arquivos grandes são poucos, e para eles uma ou duas leituras a mais pesam pouco perto do tamanho da transferência.\n\nPara achar o byte na posição `pos` de um arquivo:\n\n1. bloco lógico: `b = pos // 4096` (o deslocamento dentro do bloco é `pos % 4096`, como na paginação);\n2. se `b < 12`: é o ponteiro direto número b;\n3. senão, desconte 12; se o que sobrou é menor que 1024, é essa posição dentro do bloco indireto simples;\n4. senão, desconte 1024; se o que sobrou é menor que 1024², use o indireto duplo: a entrada `b // 1024` no primeiro nível e `b % 1024` no segundo;\n5. senão, desconte 1024² e use o triplo, com três índices.\n\nÉ a mesma ideia da tabela de páginas em vários níveis da lição anterior: uma árvore rasa e larga, em que cada nível escolhe um entre 1024 filhos."},{type:`callout`,tone:`deep`,text:`Um ponteiro por bloco desperdiça espaço em arquivos grandes: um vídeo de 1 GiB gravado em sequência precisa de 262 144 números de bloco, quase todos consecutivos. O ext4 (e também o XFS e o Btrfs) usa {{extents|extents}}: cada extent diz "a partir do bloco lógico L, N blocos seguidos, começando no bloco físico F". No ext4, um extent cobre até 32 768 blocos (128 MiB com blocos de 4 KiB), e o inode tem espaço para 4 extents; com mais que isso, o ext4 monta uma pequena árvore de extents. Aquele vídeo, se o disco tiver espaço contíguo, precisa de só 8 extents. O ext4 continua lendo arquivos com ponteiros indiretos, herdados do ext3.`,title:`Extents: a versão moderna`},{type:`md`,text:'### Diretórios: uma tabela de nome para inode\nUm diretório é um arquivo cujo conteúdo é uma lista de {{entradas de diretório|directory entries}}: pares (nome, número do inode). Todo diretório tem duas entradas especiais: `.` (ele mesmo) e `..` (o diretório pai). O diretório raiz tem um número conhecido de antemão (no ext2/3/4, o inode 2), e o `..` da raiz aponta para ela mesma.\n\nAbrir `/home/ana/notas.txt` é uma busca componente por componente, que o kernel chama de *path resolution*:\n\n1. comece no inode 2, a raiz (um caminho sem `/` no início começa no diretório de trabalho do processo);\n2. leia esse diretório e procure `home`: o inode 12, digamos;\n3. confira que o 12 é um diretório (e que você tem permissão para atravessá-lo) e procure `ana` dentro dele;\n4. repita até o último nome, que dá o inode do arquivo.\n\nCada componente custa uma busca num diretório, por isso o Linux guarda as traduções recentes num cache de entradas de diretório, o *dcache*. E, por causa das entradas `..`, a contagem de links de um diretório é 2 + o número de subdiretórios: o nome dele no pai, o `.` dentro dele e um `..` em cada filho.\n\n### Hard links e links simbólicos\n`ln notas.txt copia.txt` cria um {{hard link|hard link}}: uma nova entrada de diretório com o **mesmo** número de inode. A contagem de links vai a 2, e não existe "original" e "cópia": são dois nomes iguais para o mesmo arquivo. Mudar o conteúdo por um nome muda pelo outro.\n\n`rm` não apaga o arquivo: ele chama `unlink`, que remove **um nome** e desconta 1 da contagem. Os blocos só são liberados quando duas coisas valem ao mesmo tempo: a contagem chegou a zero **e** nenhum processo está com o arquivo aberto. Um arquivo aberto mantém o inode vivo mesmo sem nome nenhum.\n\n`ln -s /home/ana/notas.txt atalho` cria um {{link simbólico|symbolic link}}: um inode **novo**, do tipo link, cujo conteúdo é o texto de um caminho. Durante a resolução, quando o kernel encontra um link simbólico, ele continua a busca pelo caminho guardado ali.'},{type:`table`,head:[``,`Hard link`,`Link simbólico`],rows:[[`O que é`,`outra entrada de diretório para o mesmo inode`,`um inode próprio cujo conteúdo é um caminho`],[`No ls -l aparece como`,`arquivo comum, com contagem de links maior que 1`,`atalho -> /home/ana/notas.txt`],[`Pode apontar para outro sistema de arquivos?`,`não: um número de inode só vale dentro do seu sistema de arquivos`,`sim`],[`Pode apontar para um diretório?`,`não ("hard link not allowed for directory"), para a árvore não ganhar ciclos`,`sim`],[`Se o alvo for apagado`,`nada muda: o inode continua vivo pelo outro nome`,`o link fica pendurado: "No such file or directory"`],[`Caminho relativo`,`—`,`resolvido a partir do diretório onde o link está, não de onde você está`],[`Uso típico`,`backups incrementais que repetem arquivos sem copiá-los (rsync --link-dest)`,`/usr/bin/python3 -> python3.12, sites-enabled do nginx, trocar de versão de uma vez`]]},{type:`md`,text:'Links simbólicos podem formar ciclos (a → b → a). Para não rodar para sempre, o Linux segue no máximo 40 links simbólicos numa mesma resolução de caminho; o 41º dá o erro `ELOOP`: "Too many levels of symbolic links". E um detalhe que confunde muita gente: `..` depois de um link simbólico para diretório leva ao pai **físico** do alvo. Se `/atalho` aponta para `/home/ana`, `ls /atalho/..` lista `/home`, e não `/`. O `cd ..` do bash é uma exceção de propósito: por padrão, ele volta pelo caminho que você digitou.'},{type:`callout`,tone:`warn`,text:"Apagar um log gigante que um servidor ainda está escrevendo não libera espaço: o `rm` tirou o nome, mas o processo mantém o arquivo aberto. O `df` continua mostrando o disco cheio, e o `du`, que só soma o que tem nome, não acha os gigabytes. `lsof +L1` lista os arquivos abertos com contagem de links zero. Para esvaziar o arquivo sem fechá-lo, trunque em vez de apagar (`truncate -s 0 app.log`), ou reinicie o processo.",title:`O disco cheio que o du não explica`},{type:`md`,text:`### Quando a luz acaba no meio da gravação
Acrescentar um bloco a um arquivo exige gravar **três** estruturas em lugares diferentes do disco: o bloco de dados novo, o inode (com o ponteiro novo e o tamanho novo) e o mapa de bits dos blocos livres (marcando o bloco como usado). O disco grava uma coisa de cada vez, e a energia pode acabar entre duas gravações. O resultado depende do que chegou ao disco:`},{type:`table`,head:[`Chegou ao disco`,`Estado depois da queda`],rows:[[`só o bloco de dados`,`consistente: é como se a gravação não tivesse acontecido (o dado se perdeu, mas nada aponta para ele)`],[`só o inode`,`o inode aponta para um bloco com lixo, e o mapa diz que esse bloco está livre: ele pode ser entregue a outro arquivo`],[`só o mapa de bits`,`vazamento de espaço: um bloco marcado como usado que ninguém usa`],[`inode e mapa, sem os dados`,`estrutura consistente, mas o arquivo mostra lixo no lugar do conteúdo novo`],[`inode e dados, sem o mapa`,`inode e mapa discordam: de novo, o bloco pode ser entregue a outro arquivo`],[`mapa e dados, sem o inode`,`bloco ocupado que ninguém aponta: vazamento, e o dado novo se perdeu`]],caption:`Os seis casos de uma queda no meio de um acréscimo (OSTEP, capítulo 42). Do ponto de vista da estrutura, só o primeiro e o quarto ficam consistentes, e o quarto ainda mostra lixo para o usuário.`},{type:`md`,text:`A solução antiga era o \`fsck\`: depois de uma queda, varrer o disco **inteiro** conferindo inodes, mapas e diretórios. Funciona, mas o tempo é proporcional ao tamanho do disco, não ao tamanho da mudança: num disco de vários terabytes, horas de máquina parada por causa de uma gravação de 4 KiB.

O **journaling** usa a ideia do *write-ahead log* dos bancos de dados (o log que garante a durabilidade do COMMIT, do nível 7): **antes** de mexer nos lugares definitivos, descreva a mudança num {{diário|journal}}, uma área reservada do disco.

1. **Gravar a transação no diário**: um marcador de início, as versões novas dos blocos (inode, mapa, dados) e, só depois que tudo isso estiver no disco, um marcador de **commit**.
2. **{{Checkpoint|checkpoint}}**: copiar os blocos para os lugares definitivos.
3. **Liberar** a transação no diário, para o espaço ser reaproveitado.

Na volta de uma queda, a **recuperação** lê o diário: transações com commit são **refeitas** (*replay*), copiando os blocos de novo para os lugares definitivos; transações sem commit são **ignoradas**, como se nunca tivessem começado. Refazer é seguro mesmo que o checkpoint já tivesse acontecido em parte, porque gravar o mesmo conteúdo duas vezes dá o mesmo resultado. A recuperação custa o tamanho do diário (segundos), não o do disco.`},{type:`table`,head:[`Modo no ext3/ext4 (opção data=)`,`O que passa pelo diário`,`Depois de uma queda`],rows:[[`data=journal`,`metadados e dados`,`o mais seguro; tudo é gravado duas vezes, então é o mais lento`],[`data=ordered (o padrão)`,`só os metadados, mas os blocos de dados são gravados no lugar definitivo antes do commit dos metadados`,`um inode nunca aponta para um bloco com lixo; uma sobrescrita no meio de um arquivo ainda pode ficar pela metade`],[`data=writeback`,`só os metadados, sem ordem em relação aos dados`,`a estrutura fica consistente, mas um arquivo pode mostrar dados velhos ou lixo`]]},{type:`callout`,tone:`deep`,text:`Por que o commit vem separado, só depois do resto? Os discos reordenam gravações para ganhar desempenho. Se o marcador de commit chegasse antes dos blocos, a recuperação refaria uma transação "confirmada" com lixo dentro. Por isso o sistema de arquivos espera o disco confirmar a primeira etapa (com um *flush* do cache do disco) antes de gravar o commit. O ext4 também pode gravar uma soma de verificação (*checksum*) da transação junto do commit; se a soma não bater, a recuperação descarta a transação.

Outra família evita o problema por outro caminho: sistemas **copy-on-write**, como Btrfs, ZFS e APFS, nunca sobrescrevem um bloco em uso. Gravam as versões novas em lugares livres e, no fim, trocam um único ponteiro na raiz da árvore, de forma atômica. Antes da troca vale a versão antiga inteira; depois, a nova inteira.`,title:`O commit, os discos e o copy-on-write`},{type:`md`,text:"### write() não é gravar no disco: fsync\nO journaling protege a **estrutura** do sistema de arquivos, não os dados que ainda estão na memória. Quando um programa chama `write()`, o kernel copia os bytes para o *page cache* (na RAM), marca as páginas como sujas e devolve o controle na hora; elas vão para o disco depois. No Linux, por padrão, uma página suja há mais de 30 segundos é gravada na próxima passada do kernel, que acontece a cada 5 segundos. Uma queda nesse intervalo perde o que o programa achava que tinha gravado.\n\nQuem precisa de garantia chama {{fsync|fsync}} (`os.fsync` em Python), que só retorna depois que os dados e os metadados do arquivo chegaram ao armazenamento. Bancos de dados chamam `fsync` no log a cada COMMIT, e é por isso que um commit custa caro.\n\nPara trocar o conteúdo de um arquivo sem nunca deixar uma versão pela metade, o padrão é: gravar um arquivo temporário; dar `fsync` nele; renomeá-lo por cima do original (no POSIX, `rename` é atômico: quem abrir o arquivo vê a versão velha ou a nova inteira, nunca uma mistura); e dar `fsync` no diretório, para o próprio rename ficar durável."},{type:`code`,lang:`python`,code:`import os

def salvar_atomico(caminho, dados: bytes):
    tmp = caminho + ".tmp"
    with open(tmp, "wb") as f:
        f.write(dados)
        f.flush()                  # do buffer do Python para o kernel
        os.fsync(f.fileno())       # do page cache para o disco
    os.replace(tmp, caminho)       # rename atômico por cima do original
    pasta = os.open(os.path.dirname(os.path.abspath(caminho)), os.O_RDONLY)
    try:
        os.fsync(pasta)            # torna o próprio rename durável
    finally:
        os.close(pasta)

salvar_atomico("nota-fiscal.xml", b"<nfe>...</nfe>")`,runnable:!1,caption:`Para rodar no seu computador, em Linux ou macOS: no navegador não há disco de verdade, e no Windows os.open não abre diretórios. No macOS, fsync não esvazia o cache interno do disco; quem precisa dessa garantia usa fcntl com F_FULLFSYNC, como o SQLite faz com PRAGMA fullfsync.`}]},{stage:`exemplo`,blocks:[{type:`md`,text:`Um pedaço de um disco ext3 (ponteiros diretos e indiretos, como na explicação; num ext4 com extents, o inode guardaria um extent em vez dos ponteiros), com cada diretório mostrado como a sua tabela nome → inode:`},{type:`table`,head:[`Inode`,`Tipo`,`Conteúdo`],rows:[[`2`,`diretório (a raiz, /)`,`. → 2, .. → 2, home → 12, tmp → 198`],[`12`,`diretório`,`. → 12, .. → 2, ana → 1500`],[`1500`,`diretório`,`. → 1500, .. → 12, notas.txt → 1679531, fotos → 1600`],[`1600`,`diretório`,`. → 1600, .. → 1500`],[`1679531`,`arquivo comum, 5 120 bytes, 1 link`,`ponteiros diretos 0 e 1: blocos 88 213 e 88 214`]]},{type:`md`,text:"**Resolvendo /home/ana/notas.txt.** Começa no inode 2; em 2, `home` → 12; em 12, `ana` → 1500; em 1500, `notas.txt` → 1679531. Três diretórios lidos e quatro inodes consultados; com o dcache aquecido, quase nada disso vai ao disco. O caminho relativo `../ana/fotos`, com diretório de trabalho `/home/ana` (1500): `..` → 12, `ana` → 1500, `fotos` → 1600.\n\n**Contagens de links dos diretórios.** O 1500 tem 3: a entrada `ana` em 12, o próprio `.` e o `..` de `fotos`. O 12 também tem 3 (`home` na raiz, o seu `.` e o `..` de `ana`). A raiz tem 4: `.`, `..` e os `..` de `home` e de `tmp`.\n\n**Onde está o byte 5 000 000 de um arquivo grande?** Bloco lógico 5 000 000 // 4096 = 1220. Não é direto (1220 ≥ 12); descontando 12 sobram 1208, que não cabem no indireto simples (1208 ≥ 1024); descontando 1024 sobram 184: indireto duplo, entrada 184 // 1024 = 0 do primeiro nível e 184 % 1024 = 184 do segundo. Sem cache, são três leituras até o dado: o bloco do indireto duplo, o bloco de ponteiros que ele indica e, por fim, o bloco de dados.\n\n**Links e rm.** Agora uma sequência de comandos sobre o arquivo 1679531:"},{type:`table`,head:[`Comando`,`Contagem de links`,`Processos com o arquivo aberto`,`Blocos liberados?`],rows:[[`ln notas.txt backup.txt`,`2`,`0`,`não`],[`rm notas.txt`,`1`,`0`,`não: backup.txt ainda é um nome`],[`um editor abre backup.txt`,`1`,`1`,`não`],[`rm backup.txt`,`0`,`1`,`não: o arquivo está aberto, mesmo sem nome nenhum`],[`o editor fecha o arquivo`,`0`,`0`,`sim: o inode e os blocos 88 213 e 88 214 voltam a ficar livres`]]},{type:`md`,text:"**Uma queda com o diário pela metade.** O ext3, montado com `data=journal`, estava acrescentando um bloco a `notas.txt` e criando `relatorio.pdf` quando a energia acabou. O diário ficou assim:"},{type:`code`,lang:`text`,code:`T41: início | inode 1679531 (tamanho 9 216, ponteiro direto 2 = bloco 88 215)
     | mapa de bits (88 215 usado) | bloco 88 215 (dados) | commit
T42: início | diretório 1500 (nova entrada relatorio.pdf → 1700) | inode 1700
     ... (a gravação parou aqui)`,runnable:!1},{type:`md`,text:"Na volta, a recuperação refaz a T41: copia o inode, o mapa e o bloco de dados para os lugares definitivos (se o checkpoint já tinha copiado parte deles, copiar de novo não muda nada). A T42 não tem commit e é ignorada: `relatorio.pdf` não existe, como se o programa nunca tivesse tentado criá-lo. O disco fica consistente em segundos, sem varrer nada além do diário."}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`# Um sistema de arquivos de brinquedo: inodes num dict, diretórios como dicts nome -> inode
inodes = {
    2:    {"tipo": "dir", "entradas": {".": 2, "..": 2, "home": 12}},
    12:   {"tipo": "dir", "entradas": {".": 12, "..": 2, "ana": 1500}},
    1500: {"tipo": "dir", "entradas": {".": 1500, "..": 12, "notas.txt": 77}},
    77:   {"tipo": "arq", "links": 1, "abertos": 0, "dados": "Pix recebido: R$ 50"},
}

def busca(caminho, cwd=2):
    atual = 2 if caminho.startswith("/") else cwd
    for nome in caminho.split("/"):
        if nome:                                     # ignora barras repetidas
            atual = inodes[atual]["entradas"][nome]  # KeyError = No such file or directory
    return atual

def ln(alvo, novo):          # hard link: entrada nova, mesmo inode
    pasta, nome = novo.rsplit("/", 1)
    ino = busca(alvo)
    inodes[busca(pasta or "/")]["entradas"][nome] = ino
    inodes[ino]["links"] += 1

def talvez_liberar(ino):
    no = inodes[ino]
    if no["links"] == 0 and no["abertos"] == 0:
        del inodes[ino]
        print(f"  inode {ino} liberado")

def rm(caminho):             # unlink: tira um nome
    pasta, nome = caminho.rsplit("/", 1)
    ino = inodes[busca(pasta or "/")]["entradas"].pop(nome)
    inodes[ino]["links"] -= 1
    talvez_liberar(ino)

def abre(caminho):
    ino = busca(caminho)
    inodes[ino]["abertos"] += 1
    return ino               # o arquivo aberto guarda o inode, não o nome

def fecha(ino):
    inodes[ino]["abertos"] -= 1
    talvez_liberar(ino)

print("notas.txt -> inode", busca("/home/ana/notas.txt"))
print("relativo  -> inode", busca("../ana/./notas.txt", cwd=1500))
ln("/home/ana/notas.txt", "/home/ana/backup.txt")
print("links:", inodes[77]["links"])
aberto = abre("/home/ana/backup.txt")
rm("/home/ana/notas.txt")
rm("/home/ana/backup.txt")
print("sem nomes; links =", inodes[77]["links"], "| ainda dá para ler:", inodes[aberto]["dados"])
fecha(aberto)
print("inode 77 existe?", 77 in inodes)`,runnable:!0,caption:`O inode só some quando a contagem de links e a de aberturas chegam a zero. Experimente fechar antes do segundo rm e veja em que linha o inode é liberado.`},{type:`code`,lang:`python`,code:`def tamanho_maximo(bloco, tam_numero=4, diretos=12):
    p = bloco // tam_numero                  # números de bloco por bloco de ponteiros
    blocos = diretos + p + p**2 + p**3       # diretos + simples + duplo + triplo
    return blocos * bloco

def legivel(n):
    for unidade in ["bytes", "KiB", "MiB", "GiB", "TiB"]:
        if n < 1024 or unidade == "TiB":
            return f"{n:.1f} {unidade}"
        n /= 1024

for bloco in [1024, 2048, 4096]:
    print(f"bloco de {bloco} bytes: só diretos {legivel(12 * bloco)}, máximo {legivel(tamanho_maximo(bloco))}")`,runnable:!0,caption:`O limite que vem só dos ponteiros. O ext2/ext3 real tem 16 GiB, 256 GiB e 2 TiB para esses tamanhos de bloco: nos dois primeiros, os ponteiros são o limite; com 4 KiB, a contagem de setores de 32 bits trava antes.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e8-fs-1`,kind:`mcq`,prompt:"Você renomeia `relatorio.pdf` (2 GB) para `relatorio-final.pdf`, na mesma pasta, com `mv`. O comando termina instantaneamente. O que mudou no disco?",difficulty:`facil`,skills:[`so-memoria`],hints:[`Em qual estrutura fica o nome de um arquivo: no inode, nos blocos de dados ou em outro lugar?`,`Se os 2 GB precisassem ser copiados, o comando seria instantâneo?`],explanation:"O nome mora na **entrada de diretório**, não no inode. Renomear na mesma pasta (ou dentro do mesmo sistema de arquivos) é a chamada `rename`: troca o nome na entrada e pronto. O inode, o número dele e os blocos de dados continuam os mesmos (no inode, no máximo o `ctime` é atualizado), e o custo não depende do tamanho do arquivo. Já um `mv` para **outro** sistema de arquivos (um pendrive, outra partição) não pode só mexer em entradas, porque números de inode só valem dentro do seu sistema de arquivos: aí o mv copia os dados e apaga o original.",options:[{text:`Só a entrada no diretório: o inode e os blocos de dados continuam os mesmos`,correct:!0,feedback:`Isso. O nome está no diretório; o rename troca o nome da entrada, sem tocar nos 2 GB.`},{text:`O campo de nome dentro do inode foi reescrito`,feedback:`O inode não tem campo de nome. É justamente por isso que um arquivo pode ter vários nomes (hard links).`},{text:`Os dados foram copiados para blocos novos e os antigos, liberados`,feedback:`Copiar 2 GB levaria segundos ou minutos. Isso só acontece quando o mv atravessa para outro sistema de arquivos.`},{text:`O arquivo ganhou um número de inode novo, e o antigo foi liberado`,feedback:`O inode identifica o arquivo, e renomear não cria arquivo novo. Confira com ls -i antes e depois: o número é o mesmo.`}]}},{type:`exercise`,exercise:{id:`e8-fs-2`,kind:`predict`,lang:`python`,prompt:`Um diretório de brinquedo com hard links e links simbólicos. O que o programa imprime?`,difficulty:`intermediario`,skills:[`so-memoria`],hints:["Depois de cada ln e ln_s, anote o que há em `pasta` e a contagem de links do inode 10.",`O que o link simbólico guarda: o número do inode ou um nome?`,`Na última linha: quando conta.txt volta a existir, o que acontece com quem guardava esse nome?`],explanation:'`ln` acrescenta copia.txt apontando para o inode 10 (2 links). `ln_s` cria o inode 11, do tipo link, que guarda o **nome** "conta.txt". O `rm("conta.txt")` tira um nome: o inode 10 fica com 1 link e continua vivo por copia.txt. Por isso `cat("copia.txt")` lê "boleto", mas o link simbólico procura "conta.txt", que não existe mais: está pendurado. Na segunda parte, um hard link recria o nome conta.txt, apontando de novo para o inode 10, e o link simbólico "volta a funcionar", porque ele só sabe o nome. No fim existem 2 inodes: o 10 (com 2 links) e o 11 (o link simbólico).',code:`inodes = {10: {"links": 1, "dados": "boleto"}}
pasta = {"conta.txt": 10}

def ln(alvo, novo):
    pasta[novo] = pasta[alvo]
    inodes[pasta[alvo]]["links"] += 1

def ln_s(alvo, novo):
    ino = max(inodes) + 1
    inodes[ino] = {"links": 1, "link_para": alvo}
    pasta[novo] = ino

def rm(nome):
    ino = pasta.pop(nome)
    inodes[ino]["links"] -= 1
    if inodes[ino]["links"] == 0:
        del inodes[ino]

def cat(nome):
    if nome not in pasta:
        return "No such file or directory"
    no = inodes[pasta[nome]]
    if "link_para" in no:
        return cat(no["link_para"])
    return no["dados"]

ln("conta.txt", "copia.txt")
ln_s("conta.txt", "atalho")
rm("conta.txt")
print(cat("copia.txt"), "|", cat("atalho"), "|", inodes[10]["links"])
ln("copia.txt", "conta.txt")
print(cat("atalho"), "|", len(inodes))`,answer:`boleto | No such file or directory | 1
boleto | 2`}},{type:`exercise`,exercise:{id:`e8-fs-3`,kind:`code`,lang:`python`,prompt:'Escreva `localizar(pos, bloco=4096, tam_numero=4)`, que diz por qual ponteiro do inode (12 diretos, 1 indireto simples, 1 duplo e 1 triplo, como no ext2/ext3) se chega ao byte de posição `pos` de um arquivo. Cada bloco de ponteiros guarda `bloco // tam_numero` números de bloco. Devolva:\n\n- `("direto", i)`: o ponteiro direto i (de 0 a 11);\n- `("simples", i)`: a entrada i do bloco indireto simples;\n- `("duplo", i, j)`: a entrada i do primeiro nível do indireto duplo e a entrada j do segundo;\n- `("triplo", i, j, k)`: os três índices do indireto triplo;\n- `None`, se `pos` passar do maior tamanho de arquivo possível.\n\nExemplo da lição: `localizar(5_000_000)` devolve `("duplo", 0, 184)`.',difficulty:`intermediario`,skills:[`so-memoria`],hints:[`Primeiro transforme a posição em bytes num número de bloco lógico. Qual conta faz isso?`,`Quantos blocos lógicos cada tipo de ponteiro cobre? Depois de passar pelos diretos, o que você precisa descontar do número do bloco antes de olhar o indireto simples?`,`No indireto duplo, cada entrada do primeiro nível cobre quantos blocos? Como tirar dois índices de um número só?`,`Qual é o último bloco lógico alcançável? Teste as fronteiras: o último bloco de cada faixa e o primeiro da seguinte.`],explanation:"O bloco lógico é `pos // bloco`. Os diretos cobrem os blocos 0 a 11; depois, cada faixa começa em 0 de novo: desconte 12 para entrar no simples (p blocos, p = bloco // tam_numero), desconte p para entrar no duplo (p² blocos) e p² para o triplo (p³ blocos). Dentro do duplo, cada entrada do primeiro nível cobre p blocos, então os índices são `divmod(b, p)`; no triplo, o primeiro índice é `b // p²` e os outros dois saem de `divmod(b % p², p)`. É a mesma conta de separar um endereço virtual em índices de vários níveis de tabela de páginas. O erro mais comum é esquecer de descontar as faixas anteriores, o que dá índices fora de 0..p − 1.",starter:`def localizar(pos, bloco=4096, tam_numero=4):
    # devolva ("direto", i), ("simples", i), ("duplo", i, j), ("triplo", i, j, k) ou None
    pass`,solution:`def localizar(pos, bloco=4096, tam_numero=4):
    p = bloco // tam_numero
    b = pos // bloco
    if b < 12:
        return ("direto", b)
    b -= 12
    if b < p:
        return ("simples", b)
    b -= p
    if b < p * p:
        i, j = divmod(b, p)
        return ("duplo", i, j)
    b -= p * p
    if b < p ** 3:
        i, resto = divmod(b, p * p)
        j, k = divmod(resto, p)
        return ("triplo", i, j, k)
    return None`,tests:[{name:`exemplos com blocos de 4 KiB`,code:`casos = [
    (0, ("direto", 0)),
    (5000, ("direto", 1)),
    (12 * 4096 - 1, ("direto", 11)),
    (5_000_000, ("duplo", 0, 184)),
]
for pos, esperado in casos:
    r = localizar(pos)
    assert r == esperado, f"localizar({pos}) deu {r}, esperado {esperado}"`},{name:`fronteiras entre as faixas`,code:`B = 4096
casos = [
    (12 * B, ("simples", 0), "o primeiro bloco depois dos 12 diretos é a entrada 0 do indireto simples"),
    ((12 + 1024) * B - 1, ("simples", 1023), "o último byte do indireto simples"),
    ((12 + 1024) * B, ("duplo", 0, 0), "o primeiro bloco do indireto duplo"),
    ((12 + 1024 + 1024) * B, ("duplo", 1, 0), "cada entrada do primeiro nível do duplo cobre 1024 blocos"),
    ((12 + 1024 + 1024 ** 2) * B - 1, ("duplo", 1023, 1023), "o último byte do indireto duplo"),
    ((12 + 1024 + 1024 ** 2) * B, ("triplo", 0, 0, 0), "o primeiro bloco do indireto triplo"),
    ((12 + 1024 + 1024 ** 2 + 1024 ** 2 + 1024 + 1) * B, ("triplo", 1, 1, 1), "no triplo, o primeiro índice anda a cada 1024² blocos e o segundo a cada 1024"),
    ((12 + 1024 + 1024 ** 2 + 1024 + 2) * B + 7, ("triplo", 0, 1, 2), "no triplo, o primeiro índice anda a cada 1024² blocos, o segundo a cada 1024 e o terceiro a cada bloco"),
]
for pos, esperado, porque in casos:
    r = localizar(pos)
    assert r == esperado, f"localizar({pos}) deu {r}, esperado {esperado}: {porque}"`},{name:`além do tamanho máximo`,code:`B = 4096
ultimo = (12 + 1024 + 1024 ** 2 + 1024 ** 3) * B - 1
r = localizar(ultimo)
assert r == ("triplo", 1023, 1023, 1023), f"o último byte possível fica em ('triplo', 1023, 1023, 1023); veio {r}"
r = localizar(ultimo + 1)
assert r is None, f"um byte depois do máximo, devolva None; veio {r}"`},{name:`blocos pequenos (16 bytes, 4 números por bloco)`,code:`casos = [
    (191, ("direto", 11)),
    (192, ("simples", 0)),
    (255, ("simples", 3)),
    (256, ("duplo", 0, 0)),
    (16 * (12 + 4 + 5), ("duplo", 1, 1)),
    (16 * (12 + 4 + 16), ("triplo", 0, 0, 0)),
    (16 * (12 + 4 + 16 + 16 + 4 + 1), ("triplo", 1, 1, 1)),
    (16 * (12 + 4 + 16 + 2 * 16 + 1 * 4 + 3) + 5, ("triplo", 2, 1, 3)),
    (16 * (12 + 4 + 16 + 64) - 1, ("triplo", 3, 3, 3)),
    (16 * (12 + 4 + 16 + 64), None),
]
for pos, esperado in casos:
    r = localizar(pos, bloco=16)
    assert r == esperado, f"localizar({pos}, bloco=16) deu {r}, esperado {esperado}. Com blocos de 16 bytes e números de 4, cada bloco de ponteiros guarda 4 números"
r = localizar(2048, bloco=1024, tam_numero=8)
assert r == ("direto", 2), f"localizar(2048, bloco=1024, tam_numero=8) deu {r}, esperado ('direto', 2)"
r = localizar(1024 * (12 + 128), bloco=1024, tam_numero=8)
assert r == ("duplo", 0, 0), f"com blocos de 1024 e números de 8 bytes, cada bloco guarda 128 números: o bloco 140 é o primeiro do duplo; veio {r}"`}]}},{type:`exercise`,exercise:{id:`e8-fs-4`,kind:`fill`,lang:`python`,prompt:"Complete `salvar_atomico`, que grava a nota fiscal de modo que, mesmo com uma queda de energia, o arquivo `caminho` tenha a versão antiga inteira ou a nova inteira, nunca uma mistura.",difficulty:`facil`,skills:[`so-memoria`],hints:[`O objeto arquivo do Python tem um buffer próprio. Qual método empurra esse buffer para o kernel?`,`Qual chamada do módulo os espera os dados saírem do page cache e chegarem ao disco?`,`Qual função do módulo os troca o nome de um arquivo, substituindo o destino de forma atômica se ele existir?`],explanation:"`flush()` passa o que está no buffer do objeto Python para o kernel (sem ele, o fsync poderia não ver os últimos bytes). `os.fsync` espera o kernel levar os dados do page cache para o disco. `os.replace` faz o rename atômico por cima do original: quem abrir o arquivo vê a versão velha ou a nova, inteira. `os.rename` faz o mesmo no Linux e no macOS, mas no Windows falha se o destino existir; por isso `os.replace` é o recomendado. Para o rename sobreviver a uma queda, falta ainda um fsync no diretório.",template:`import os

def salvar_atomico(caminho, dados):
    tmp = caminho + ".tmp"
    with open(tmp, "wb") as f:
        f.write(dados)
        f.___()
        os.___(f.fileno())
    os.___(tmp, caminho)`,blanks:[[`flush`],[`fsync`],[`replace`,`rename`]]}},{type:`exercise`,exercise:{id:`e8-fs-5`,kind:`fix`,lang:`python`,prompt:'Depois de uma queda, `recuperar(disco, diario)` deve refazer o diário sobre o disco e devolver o disco recuperado, sem alterar o dict recebido. `disco` é um dict número do bloco → conteúdo; `diario` é a lista de registros na ordem em que foram gravados:\n\n- `("inicio", tx)`: começo da transação tx;\n- `("bloco", tx, numero, conteudo)`: a versão nova de um bloco;\n- `("commit", tx)`: a transação tx está completa.\n\nAs transações aparecem uma de cada vez, sem se misturar, e só a última pode estar incompleta (a queda interrompeu a gravação dela). Regra: transações com commit são refeitas, na ordem do diário; transações sem commit são ignoradas. O código atual refaz tudo, inclusive a transação interrompida. Corrija.',difficulty:`intermediario`,skills:[`so-memoria`],hints:[`Quando o código lê um registro "bloco", ele já sabe se aquela transação vai ter commit?`,`Onde guardar as gravações de uma transação enquanto o commit não aparece?`,`O que deve acontecer com o que estiver guardado quando o diário acabar sem commit?`],explanation:`Ao ler um bloco, ainda não se sabe se a transação chegou ao commit. A correção guarda as gravações da transação atual numa lista de pendentes e só as aplica ao encontrar o commit; se o diário acabar antes, os pendentes são descartados. Aplicar na ordem do diário garante que, se duas transações confirmadas gravaram o mesmo bloco, vale a mais recente. Como refazer só copia conteúdos, rodar a recuperação duas vezes (uma queda durante a recuperação) dá o mesmo resultado: é idempotente.`,starter:`def recuperar(disco, diario):
    disco = dict(disco)
    for registro in diario:
        if registro[0] == "bloco":
            _, tx, numero, conteudo = registro
            disco[numero] = conteudo
    return disco`,solution:`def recuperar(disco, diario):
    disco = dict(disco)
    pendentes = []
    for registro in diario:
        if registro[0] == "inicio":
            pendentes = []
        elif registro[0] == "bloco":
            _, tx, numero, conteudo = registro
            pendentes.append((numero, conteudo))
        elif registro[0] == "commit":
            for numero, conteudo in pendentes:
                disco[numero] = conteudo
            pendentes = []
    return disco`,tests:[{name:`transação interrompida é ignorada`,code:`disco = {1: "inode v1", 2: "mapa v1", 3: "dados v1"}
diario = [
    ("inicio", 41), ("bloco", 41, 1, "inode v2"), ("bloco", 41, 3, "dados v2"), ("commit", 41),
    ("inicio", 42), ("bloco", 42, 2, "mapa v3"),
]
r = recuperar(disco, diario)
esperado = {1: "inode v2", 2: "mapa v1", 3: "dados v2"}
assert r == esperado, f"esperado {esperado}, veio {r}: a T42 não tem commit e não pode aparecer no disco"
assert disco == {1: "inode v1", 2: "mapa v1", 3: "dados v1"}, "não altere o dict recebido: devolva um novo"`},{name:`só transações completas`,code:`disco = {7: "a"}
diario = [("inicio", 1), ("bloco", 1, 7, "b"), ("bloco", 1, 8, "c"), ("commit", 1)]
r = recuperar(disco, diario)
assert r == {7: "b", 8: "c"}, f"esperado {{7: 'b', 8: 'c'}}, veio {r}"`},{name:`a mais recente vence`,code:`disco = {5: "original"}
diario = [
    ("inicio", 1), ("bloco", 1, 5, "primeira"), ("commit", 1),
    ("inicio", 2), ("bloco", 2, 5, "segunda"), ("commit", 2),
    ("inicio", 3), ("bloco", 3, 5, "terceira"),
]
r = recuperar(disco, diario)
assert r == {5: "segunda"}, f"T1 e T2 têm commit e gravam o bloco 5: vale a T2, a mais recente; a T3 está incompleta. Veio {r}"`},{name:`bordas: diário vazio, só início, interrompido antes de qualquer bloco`,code:`assert recuperar({1: "x"}, []) == {1: "x"}, "sem diário, o disco fica como está"
assert recuperar({1: "x"}, [("inicio", 9)]) == {1: "x"}, "uma transação só com início não muda nada"
r = recuperar({1: "x"}, [("inicio", 9), ("bloco", 9, 1, "y"), ("bloco", 9, 2, "z")])
assert r == {1: "x"}, f"a única transação não tem commit: nada muda; veio {r}"`},{name:`recuperar duas vezes dá o mesmo resultado`,code:`disco = {1: "a", 2: "b"}
diario = [("inicio", 1), ("bloco", 1, 2, "c"), ("commit", 1), ("inicio", 2), ("bloco", 2, 1, "d")]
uma = recuperar(disco, diario)
duas = recuperar(uma, diario)
assert uma == duas == {1: "a", 2: "c"}, f"refazer é idempotente: esperado {{1: 'a', 2: 'c'}} nas duas vezes; veio {uma} e {duas}"`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e8-fs-desafio`,kind:`code`,lang:`python`,prompt:'Escreva `resolver(fs, caminho, cwd=2)`, que faz a resolução de caminhos do kernel e devolve o número do inode final. `fs` é um dict número do inode → inode, em que cada inode é um destes:\n\n- `{"tipo": "dir", "entradas": entradas}`, em que `entradas` é um dict nome → número do inode, incluindo `"."` e `".."` (na raiz, inode 2, as duas apontam para 2);\n- `{"tipo": "arq"}`;\n- `{"tipo": "link", "alvo": "caminho"}`: um link simbólico.\n\nRegras, como no Linux:\n\n- um caminho que começa com `/` parte da raiz (2); os outros partem de `cwd`. Barras repetidas são ignoradas, e nenhum caminho dos testes termina em barra (fora o próprio `"/"`).\n- Links simbólicos são seguidos em **qualquer** componente, inclusive no último. Um alvo absoluto recomeça da raiz; um alvo relativo é resolvido a partir do diretório **onde o link está**. Depois do alvo, a resolução continua com o resto do caminho.\n- Erros: nome inexistente ou caminho vazio → `FileNotFoundError`; procurar um nome dentro de algo que não é diretório → `NotADirectoryError`; mais de 40 links simbólicos seguidos numa mesma resolução → `OSError` com `errno.ELOOP` (`raise OSError(errno.ELOOP, "Too many levels of symbolic links")`).',difficulty:`desafio`,skills:[`so-memoria`,`prog-strings`],hints:[`Pense na resolução como uma fila de nomes ainda por processar e um diretório atual. O que acontece com essa fila quando você encontra um link simbólico?`,`Os nomes do alvo do link entram antes ou depois dos que ainda faltavam no caminho original?`,`Um alvo relativo parte do diretório onde o link está. Na hora em que você encontra o link, qual variável já guarda esse diretório?`,`O limite de 40 vale por link ou para a resolução inteira? Onde fica o contador?`,`Por que você não pode simplificar ".." direto no texto do caminho antes de começar? Pense em "/atalho/..".`],explanation:'A resolução mantém o diretório atual e uma fila com os nomes que faltam. Para cada nome: se o atual não é diretório, é `NotADirectoryError`; se o nome não está nas entradas, `FileNotFoundError`. Se o inode encontrado é um link, o contador sobe (acima de 40, `ELOOP`), os nomes do alvo entram **na frente** da fila e, se o alvo for absoluto, o atual volta para a raiz; se for relativo, o atual continua sendo o diretório onde o link está, que é exatamente o diretório em que você estava procurando. `"."` e `".."` não têm tratamento especial: são entradas como as outras. É por isso que `/atalho/..` dá `/home` (o pai físico de `/home/ana`) e não `/`: quem simplifica o texto antes, como `os.path.normpath`, erra. O kernel faz o mesmo com cache (o dcache) e permissões, e conta os links da resolução inteira: um caminho com 41 passagens pelo mesmo link para diretório também dá ELOOP.',starter:`import errno

def resolver(fs, caminho, cwd=2):
    # devolva o número do inode final, seguindo links simbólicos
    # FileNotFoundError, NotADirectoryError ou OSError(errno.ELOOP, ...)
    pass`,solution:`import errno
from collections import deque

def resolver(fs, caminho, cwd=2):
    if caminho == "":
        raise FileNotFoundError("caminho vazio")
    atual = 2 if caminho.startswith("/") else cwd
    faltam = deque(c for c in caminho.split("/") if c)
    saltos = 0
    while faltam:
        nome = faltam.popleft()
        no = fs[atual]
        if no["tipo"] != "dir":
            raise NotADirectoryError(nome)
        if nome not in no["entradas"]:
            raise FileNotFoundError(nome)
        proximo = no["entradas"][nome]
        if fs[proximo]["tipo"] == "link":
            saltos += 1
            if saltos > 40:
                raise OSError(errno.ELOOP, "Too many levels of symbolic links")
            alvo = fs[proximo]["alvo"]
            faltam.extendleft(reversed([c for c in alvo.split("/") if c]))
            if alvo.startswith("/"):
                atual = 2
        else:
            atual = proximo
    return atual`,tests:[{name:`caminhos sem links`,code:`import errno as _errno

def _fs():
    fs = {
        2: {"tipo": "dir", "entradas": {".": 2, "..": 2, "home": 12, "etc": 30, "atalho": 40, "laco": 41, "vai": 45, "volta": 46, "h": 47}},
        12: {"tipo": "dir", "entradas": {".": 12, "..": 2, "ana": 1500}},
        1500: {"tipo": "dir", "entradas": {".": 1500, "..": 12, "notas.txt": 77, "foto.png": 78, "docs": 1600, "ultimo": 42, "quebrado": 43}},
        1600: {"tipo": "dir", "entradas": {".": 1600, "..": 1500, "relatorio.pdf": 79, "acima": 44}},
        30: {"tipo": "dir", "entradas": {".": 30, "..": 2, "hosts": 80}},
        77: {"tipo": "arq"},
        78: {"tipo": "arq"},
        79: {"tipo": "arq"},
        80: {"tipo": "arq"},
        40: {"tipo": "link", "alvo": "/home/ana"},
        41: {"tipo": "link", "alvo": "laco"},
        42: {"tipo": "link", "alvo": "docs/relatorio.pdf"},
        43: {"tipo": "link", "alvo": "/home/ana/nao-existe"},
        44: {"tipo": "link", "alvo": "../foto.png"},
        45: {"tipo": "link", "alvo": "volta"},
        46: {"tipo": "link", "alvo": "/vai"},
        47: {"tipo": "link", "alvo": "home"},
    }
    return fs

def _corrente(n):
    """Raiz com o arquivo c0 (inode 500) e os links c1 -> c0, c2 -> c1, ..., cn -> c(n-1)."""
    fs = {2: {"tipo": "dir", "entradas": {".": 2, "..": 2, "c0": 500}}, 500: {"tipo": "arq"}}
    for i in range(1, n + 1):
        fs[500 + i] = {"tipo": "link", "alvo": f"c{i - 1}"}
        fs[2]["entradas"][f"c{i}"] = 500 + i
    return fs

def _erro(fs, caminho, cwd=2):
    try:
        r = resolver(fs, caminho, cwd)
    except Exception as e:
        return e
    return r
fs = _fs()
casos = [
    ("/home/ana/notas.txt", 2, 77),
    ("/", 2, 2),
    ("//home///ana", 2, 1500),
    ("notas.txt", 1500, 77),
    ("docs/relatorio.pdf", 1500, 79),
    ("../ana/./docs", 1500, 1600),
    ("/..", 2, 2),
    ("../../../../..", 1600, 2),
    ("/etc/hosts", 1600, 80),
]
for caminho, cwd, esperado in casos:
    r = _erro(fs, caminho, cwd)
    assert r == esperado, f"resolver(fs, {caminho!r}, cwd={cwd}) deu {r!r}, esperado {esperado}"`},{name:`links absolutos e relativos`,code:`import errno as _errno

def _fs():
    fs = {
        2: {"tipo": "dir", "entradas": {".": 2, "..": 2, "home": 12, "etc": 30, "atalho": 40, "laco": 41, "vai": 45, "volta": 46, "h": 47}},
        12: {"tipo": "dir", "entradas": {".": 12, "..": 2, "ana": 1500}},
        1500: {"tipo": "dir", "entradas": {".": 1500, "..": 12, "notas.txt": 77, "foto.png": 78, "docs": 1600, "ultimo": 42, "quebrado": 43}},
        1600: {"tipo": "dir", "entradas": {".": 1600, "..": 1500, "relatorio.pdf": 79, "acima": 44}},
        30: {"tipo": "dir", "entradas": {".": 30, "..": 2, "hosts": 80}},
        77: {"tipo": "arq"},
        78: {"tipo": "arq"},
        79: {"tipo": "arq"},
        80: {"tipo": "arq"},
        40: {"tipo": "link", "alvo": "/home/ana"},
        41: {"tipo": "link", "alvo": "laco"},
        42: {"tipo": "link", "alvo": "docs/relatorio.pdf"},
        43: {"tipo": "link", "alvo": "/home/ana/nao-existe"},
        44: {"tipo": "link", "alvo": "../foto.png"},
        45: {"tipo": "link", "alvo": "volta"},
        46: {"tipo": "link", "alvo": "/vai"},
        47: {"tipo": "link", "alvo": "home"},
    }
    return fs

def _corrente(n):
    """Raiz com o arquivo c0 (inode 500) e os links c1 -> c0, c2 -> c1, ..., cn -> c(n-1)."""
    fs = {2: {"tipo": "dir", "entradas": {".": 2, "..": 2, "c0": 500}}, 500: {"tipo": "arq"}}
    for i in range(1, n + 1):
        fs[500 + i] = {"tipo": "link", "alvo": f"c{i - 1}"}
        fs[2]["entradas"][f"c{i}"] = 500 + i
    return fs

def _erro(fs, caminho, cwd=2):
    try:
        r = resolver(fs, caminho, cwd)
    except Exception as e:
        return e
    return r
fs = _fs()
casos = [
    ("/atalho", 2, 1500, "/atalho aponta para /home/ana"),
    ("/atalho/docs/relatorio.pdf", 2, 79, "um link no meio do caminho: depois do alvo, a resolução continua com docs/relatorio.pdf"),
    ("/home/ana/ultimo", 2, 79, "o alvo relativo docs/relatorio.pdf parte de /home/ana, onde o link está"),
    ("/home/ana/ultimo", 30, 79, "o cwd não importa para um link relativo: ele parte do diretório onde o link está"),
    ("ultimo", 1500, 79, "caminho relativo que termina num link relativo"),
    ("/home/ana/docs/acima", 2, 78, "acima -> ../foto.png, a partir de /home/ana/docs"),
]
for caminho, cwd, esperado, porque in casos:
    r = _erro(fs, caminho, cwd)
    assert r == esperado, f"resolver(fs, {caminho!r}, cwd={cwd}) deu {r!r}, esperado {esperado}: {porque}"`},{name:`.. depois de um link vai ao pai físico`,code:`import errno as _errno

def _fs():
    fs = {
        2: {"tipo": "dir", "entradas": {".": 2, "..": 2, "home": 12, "etc": 30, "atalho": 40, "laco": 41, "vai": 45, "volta": 46, "h": 47}},
        12: {"tipo": "dir", "entradas": {".": 12, "..": 2, "ana": 1500}},
        1500: {"tipo": "dir", "entradas": {".": 1500, "..": 12, "notas.txt": 77, "foto.png": 78, "docs": 1600, "ultimo": 42, "quebrado": 43}},
        1600: {"tipo": "dir", "entradas": {".": 1600, "..": 1500, "relatorio.pdf": 79, "acima": 44}},
        30: {"tipo": "dir", "entradas": {".": 30, "..": 2, "hosts": 80}},
        77: {"tipo": "arq"},
        78: {"tipo": "arq"},
        79: {"tipo": "arq"},
        80: {"tipo": "arq"},
        40: {"tipo": "link", "alvo": "/home/ana"},
        41: {"tipo": "link", "alvo": "laco"},
        42: {"tipo": "link", "alvo": "docs/relatorio.pdf"},
        43: {"tipo": "link", "alvo": "/home/ana/nao-existe"},
        44: {"tipo": "link", "alvo": "../foto.png"},
        45: {"tipo": "link", "alvo": "volta"},
        46: {"tipo": "link", "alvo": "/vai"},
        47: {"tipo": "link", "alvo": "home"},
    }
    return fs

def _corrente(n):
    """Raiz com o arquivo c0 (inode 500) e os links c1 -> c0, c2 -> c1, ..., cn -> c(n-1)."""
    fs = {2: {"tipo": "dir", "entradas": {".": 2, "..": 2, "c0": 500}}, 500: {"tipo": "arq"}}
    for i in range(1, n + 1):
        fs[500 + i] = {"tipo": "link", "alvo": f"c{i - 1}"}
        fs[2]["entradas"][f"c{i}"] = 500 + i
    return fs

def _erro(fs, caminho, cwd=2):
    try:
        r = resolver(fs, caminho, cwd)
    except Exception as e:
        return e
    return r
fs = _fs()
r = _erro(fs, "/atalho/..")
assert r == 12, f"/atalho aponta para /home/ana; o '..' dali é /home (inode 12), não a raiz. Veio {r!r}. Simplificar '..' no texto antes de resolver dá a resposta errada"
r = _erro(fs, "/atalho/../ana/notas.txt")
assert r == 77, f"/atalho/../ana/notas.txt é /home/ana/notas.txt; veio {r!r}"`},{name:`erros: não existe e não é diretório`,code:`import errno as _errno

def _fs():
    fs = {
        2: {"tipo": "dir", "entradas": {".": 2, "..": 2, "home": 12, "etc": 30, "atalho": 40, "laco": 41, "vai": 45, "volta": 46, "h": 47}},
        12: {"tipo": "dir", "entradas": {".": 12, "..": 2, "ana": 1500}},
        1500: {"tipo": "dir", "entradas": {".": 1500, "..": 12, "notas.txt": 77, "foto.png": 78, "docs": 1600, "ultimo": 42, "quebrado": 43}},
        1600: {"tipo": "dir", "entradas": {".": 1600, "..": 1500, "relatorio.pdf": 79, "acima": 44}},
        30: {"tipo": "dir", "entradas": {".": 30, "..": 2, "hosts": 80}},
        77: {"tipo": "arq"},
        78: {"tipo": "arq"},
        79: {"tipo": "arq"},
        80: {"tipo": "arq"},
        40: {"tipo": "link", "alvo": "/home/ana"},
        41: {"tipo": "link", "alvo": "laco"},
        42: {"tipo": "link", "alvo": "docs/relatorio.pdf"},
        43: {"tipo": "link", "alvo": "/home/ana/nao-existe"},
        44: {"tipo": "link", "alvo": "../foto.png"},
        45: {"tipo": "link", "alvo": "volta"},
        46: {"tipo": "link", "alvo": "/vai"},
        47: {"tipo": "link", "alvo": "home"},
    }
    return fs

def _corrente(n):
    """Raiz com o arquivo c0 (inode 500) e os links c1 -> c0, c2 -> c1, ..., cn -> c(n-1)."""
    fs = {2: {"tipo": "dir", "entradas": {".": 2, "..": 2, "c0": 500}}, 500: {"tipo": "arq"}}
    for i in range(1, n + 1):
        fs[500 + i] = {"tipo": "link", "alvo": f"c{i - 1}"}
        fs[2]["entradas"][f"c{i}"] = 500 + i
    return fs

def _erro(fs, caminho, cwd=2):
    try:
        r = resolver(fs, caminho, cwd)
    except Exception as e:
        return e
    return r
fs = _fs()
for caminho, porque in [("/home/bia", "não há bia em /home"), ("/home/ana/quebrado", "o link quebrado aponta para um nome inexistente"), ("", "caminho vazio"), ("/etc/nada/hosts", "nada não existe em /etc")]:
    r = _erro(fs, caminho)
    assert isinstance(r, FileNotFoundError), f"resolver(fs, {caminho!r}) deveria levantar FileNotFoundError ({porque}); veio {r!r}"
for caminho in ["/home/ana/notas.txt/x", "/etc/hosts/.", "/atalho/notas.txt/.."]:
    r = _erro(fs, caminho)
    assert isinstance(r, NotADirectoryError), f"resolver(fs, {caminho!r}) deveria levantar NotADirectoryError: não dá para procurar um nome dentro de um arquivo comum; veio {r!r}"
assert fs == _fs(), "não altere o dict fs"`},{name:`ciclos de links`,code:`import errno as _errno

def _fs():
    fs = {
        2: {"tipo": "dir", "entradas": {".": 2, "..": 2, "home": 12, "etc": 30, "atalho": 40, "laco": 41, "vai": 45, "volta": 46, "h": 47}},
        12: {"tipo": "dir", "entradas": {".": 12, "..": 2, "ana": 1500}},
        1500: {"tipo": "dir", "entradas": {".": 1500, "..": 12, "notas.txt": 77, "foto.png": 78, "docs": 1600, "ultimo": 42, "quebrado": 43}},
        1600: {"tipo": "dir", "entradas": {".": 1600, "..": 1500, "relatorio.pdf": 79, "acima": 44}},
        30: {"tipo": "dir", "entradas": {".": 30, "..": 2, "hosts": 80}},
        77: {"tipo": "arq"},
        78: {"tipo": "arq"},
        79: {"tipo": "arq"},
        80: {"tipo": "arq"},
        40: {"tipo": "link", "alvo": "/home/ana"},
        41: {"tipo": "link", "alvo": "laco"},
        42: {"tipo": "link", "alvo": "docs/relatorio.pdf"},
        43: {"tipo": "link", "alvo": "/home/ana/nao-existe"},
        44: {"tipo": "link", "alvo": "../foto.png"},
        45: {"tipo": "link", "alvo": "volta"},
        46: {"tipo": "link", "alvo": "/vai"},
        47: {"tipo": "link", "alvo": "home"},
    }
    return fs

def _corrente(n):
    """Raiz com o arquivo c0 (inode 500) e os links c1 -> c0, c2 -> c1, ..., cn -> c(n-1)."""
    fs = {2: {"tipo": "dir", "entradas": {".": 2, "..": 2, "c0": 500}}, 500: {"tipo": "arq"}}
    for i in range(1, n + 1):
        fs[500 + i] = {"tipo": "link", "alvo": f"c{i - 1}"}
        fs[2]["entradas"][f"c{i}"] = 500 + i
    return fs

def _erro(fs, caminho, cwd=2):
    try:
        r = resolver(fs, caminho, cwd)
    except Exception as e:
        return e
    return r
fs = _fs()
for caminho in ["/laco", "/vai", "/home/../laco/x"]:
    r = _erro(fs, caminho)
    assert isinstance(r, OSError) and getattr(r, "errno", None) == _errno.ELOOP, f"resolver(fs, {caminho!r}) cai num ciclo de links: deveria levantar OSError com errno.ELOOP; veio {r!r}"`},{name:`limite de 40 links por resolução`,code:`import errno as _errno

def _fs():
    fs = {
        2: {"tipo": "dir", "entradas": {".": 2, "..": 2, "home": 12, "etc": 30, "atalho": 40, "laco": 41, "vai": 45, "volta": 46, "h": 47}},
        12: {"tipo": "dir", "entradas": {".": 12, "..": 2, "ana": 1500}},
        1500: {"tipo": "dir", "entradas": {".": 1500, "..": 12, "notas.txt": 77, "foto.png": 78, "docs": 1600, "ultimo": 42, "quebrado": 43}},
        1600: {"tipo": "dir", "entradas": {".": 1600, "..": 1500, "relatorio.pdf": 79, "acima": 44}},
        30: {"tipo": "dir", "entradas": {".": 30, "..": 2, "hosts": 80}},
        77: {"tipo": "arq"},
        78: {"tipo": "arq"},
        79: {"tipo": "arq"},
        80: {"tipo": "arq"},
        40: {"tipo": "link", "alvo": "/home/ana"},
        41: {"tipo": "link", "alvo": "laco"},
        42: {"tipo": "link", "alvo": "docs/relatorio.pdf"},
        43: {"tipo": "link", "alvo": "/home/ana/nao-existe"},
        44: {"tipo": "link", "alvo": "../foto.png"},
        45: {"tipo": "link", "alvo": "volta"},
        46: {"tipo": "link", "alvo": "/vai"},
        47: {"tipo": "link", "alvo": "home"},
    }
    return fs

def _corrente(n):
    """Raiz com o arquivo c0 (inode 500) e os links c1 -> c0, c2 -> c1, ..., cn -> c(n-1)."""
    fs = {2: {"tipo": "dir", "entradas": {".": 2, "..": 2, "c0": 500}}, 500: {"tipo": "arq"}}
    for i in range(1, n + 1):
        fs[500 + i] = {"tipo": "link", "alvo": f"c{i - 1}"}
        fs[2]["entradas"][f"c{i}"] = 500 + i
    return fs

def _erro(fs, caminho, cwd=2):
    try:
        r = resolver(fs, caminho, cwd)
    except Exception as e:
        return e
    return r
fs = _corrente(41)
r = _erro(fs, "/c40")
assert r == 500, f"/c40 segue 40 links até c0: ainda é permitido (o limite é mais de 40); veio {r!r}"
r = _erro(fs, "/c41")
assert isinstance(r, OSError) and getattr(r, "errno", None) == _errno.ELOOP, f"/c41 exige 41 links: deveria ser ELOOP; veio {r!r}"
fs = _fs()
r = _erro(fs, "/" + "h/../" * 40 + "home/ana/notas.txt")
assert r == 77, f"/h aponta para home (relativo, a partir da raiz); 40 passagens por /h, cada uma seguida de '..', ainda cabem no limite; veio {r!r}"
r = _erro(fs, "/" + "h/../" * 41 + "home/ana/notas.txt")
assert isinstance(r, OSError) and getattr(r, "errno", None) == _errno.ELOOP, f"41 passagens pelo mesmo link numa resolução: o limite de 40 vale para a resolução inteira; veio {r!r}"`}]}}]},{stage:`revisao`,blocks:[{type:`md`,text:"- Inode: tipo, permissões, dono, tamanho, datas, contagem de links e onde estão os blocos. O nome fica na entrada de diretório.\n- Ponteiros: 12 diretos (48 KiB), indireto simples (+4 MiB), duplo (+4 GiB), triplo (+4 TiB), com blocos de 4 KiB. O ext4 usa extents: (início, comprimento).\n- Diretório: tabela nome → inode, com `.` e `..`. Resolver um caminho é procurar componente por componente a partir da raiz (inode 2) ou do diretório de trabalho.\n- Hard link: outro nome para o mesmo inode; não atravessa sistemas de arquivos nem aponta para diretório. Link simbólico: um inode com um caminho; pode ficar pendurado, e o Linux segue no máximo 40 por resolução (ELOOP).\n- `rm` = `unlink`: os blocos voltam quando a contagem de links é zero e ninguém tem o arquivo aberto.\n- Queda no meio de uma atualização deixa inode, mapa de bits e dados discordando. Journaling: transação no diário, commit, checkpoint; a recuperação refaz o que tem commit e ignora o resto.\n- `write()` só chega ao page cache; `fsync` garante o disco. Troca atômica: temporário, fsync, rename, fsync no diretório."},{type:`callout`,tone:`english`,text:`- **inode, inode number, link count**: inode, número do inode, contagem de links
- **directory entry (dentry), path resolution**: entrada de diretório, resolução de caminho
- **hard link, symbolic link (symlink), dangling symlink**: hard link, link simbólico, link pendurado
- **crash consistency, journal, write-ahead logging, checkpoint, replay**
- **page cache, dirty page, fsync, durable**: cache de páginas, página suja, fsync, durável

Frase típica de entrevista: *"Deleting a file only removes a directory entry. The inode and its blocks are freed when the link count drops to zero and no process still has the file open, which is why df can show a full disk after you rm a huge log."*

Frase típica de documentação (man page de rename): *"If newpath already exists, it will be atomically replaced, so that there is no point at which another process attempting to access newpath will find it missing."*`,title:`English corner`}]}],cards:[{id:`l8-inodes-journaling#1`,front:`O que um inode guarda, e o que ele não guarda?`,back:`Tipo, permissões, dono, tamanho, datas, contagem de links e a localização dos blocos. Não guarda o nome, que fica na entrada de diretório.`},{id:`l8-inodes-journaling#2`,front:`Com blocos de 4 KiB e números de bloco de 4 bytes, quanto cobrem os 12 ponteiros diretos e quanto o indireto simples acrescenta?`,back:`Os diretos cobrem 48 KiB (12 blocos); o indireto simples acrescenta 1024 blocos, 4 MiB.`},{id:`l8-inodes-journaling#3`,front:`Como o kernel transforma /home/ana/notas.txt num número de inode?`,back:`Começa no inode da raiz (2 no ext4) e, componente por componente, procura o nome nas entradas do diretório atual para achar o próximo inode.`},{id:`l8-inodes-journaling#4`,front:`Quando os blocos de um arquivo apagado com rm voltam de fato a ficar livres?`,back:`Quando a contagem de links chega a zero e nenhum processo está com o arquivo aberto.`},{id:`l8-inodes-journaling#5`,front:`Três diferenças entre hard link e link simbólico?`,back:`O hard link é outra entrada para o mesmo inode; o simbólico é um inode próprio com um caminho. Só o simbólico atravessa sistemas de arquivos e aponta para diretórios, e só ele fica pendurado quando o alvo é apagado.`},{id:`l8-inodes-journaling#6`,front:`Na recuperação depois de uma queda, o que o journaling faz com transações com e sem commit?`,back:`Refaz as que têm commit, na ordem do diário; ignora as que não têm, como se nunca tivessem começado.`},{id:`l8-inodes-journaling#7`,front:`Por que write() sozinho não garante que os dados sobrevivem a uma queda, e o que garante?`,back:`write() só copia os dados para o page cache, na RAM. fsync espera os dados e metadados chegarem ao disco.`},{id:`l8-inodes-journaling#8`,front:`Qual é o padrão para substituir um arquivo sem nunca deixá-lo pela metade?`,back:`Gravar um temporário, dar fsync nele, renomeá-lo por cima do original (rename é atômico) e dar fsync no diretório.`}]};export{e as default};
//# sourceMappingURL=l8-inodes-journaling-Cvn0cP75.js.map