var e={id:`l8-ponteiros-heap-c`,moduleId:`m8-2`,title:`Ponteiros e o heap em C: endereços, malloc, free e os bugs clássicos`,titleEn:`Pointers and the heap in C: addresses, malloc, free and the classic bugs`,summary:`O mapa do espaço de endereçamento de um processo, ponteiros e aritmética de ponteiros em C, como malloc e free funcionam por dentro (cabeçalho, lista livre, divisão e coalescência) e os erros de memória por trás da maior parte das falhas graves de segurança: vazamento, double free, use-after-free e estouro de buffer, com as ferramentas que os denunciam.`,minutes:50,objectives:[`Desenhar o espaço de endereçamento de um processo (texto, dados, heap, mapeamentos, pilha) e dizer onde mora cada variável de um programa C`,`Ler código C com &, * e aritmética de ponteiros, calculando o endereço que cada expressão produz`,`Explicar o contrato de malloc e free e como um alocador usa cabeçalho, lista livre, divisão e coalescência`,`Reconhecer vazamento, double free, use-after-free, estouro de buffer e ponteiro para variável local, e saber qual ferramenta denuncia cada um`,`Comparar a gestão manual de memória do C com a contagem de referências do Python`],skills:[`so-memoria`],terms:[{pt:`espaço de endereçamento`,en:`address space`,def:`Conjunto de endereços virtuais que um processo pode usar, organizado em regiões com permissões próprias: código, dados, heap, mapeamentos e pilha.`,example:`Each process has its own virtual address space.`},{pt:`segmento de texto`,en:`text segment`,def:`Região com as instruções de máquina do programa; pode ser lida e executada, mas não escrita.`},{pt:`ponteiro`,en:`pointer`,def:`Em C, uma variável cujo valor é um endereço de memória; o tipo do ponteiro diz o que existe naquele endereço.`,example:`Dereferencing a NULL pointer is undefined behavior.`},{pt:`desreferenciar`,en:`dereference`,def:`Seguir o endereço guardado num ponteiro para ler ou escrever o valor que está lá (*p em C).`},{pt:`aritmética de ponteiros`,en:`pointer arithmetic`,def:`Somar n a um ponteiro avança n elementos, isto é, n × sizeof(tipo) bytes; v[i] é *(v + i).`},{pt:`alocador`,en:`allocator`,def:`Código da biblioteca (malloc, free) que reparte o heap em blocos e controla quais estão livres.`,example:`glibc's allocator keeps freed chunks in per-thread caches.`},{pt:`cabeçalho`,en:`header`,def:`Bytes que o alocador guarda logo antes do bloco entregue, com o tamanho dele; é assim que free(p) sabe quanto liberar.`},{pt:`lista livre`,en:`free list`,def:`Lista dos blocos livres do heap que o alocador consulta para atender um malloc.`},{pt:`coalescência`,en:`coalescing`,def:`Juntar blocos livres vizinhos num bloco maior quando um deles é liberado.`},{pt:`fragmentação externa`,en:`external fragmentation`,def:`Memória livre suficiente no total, mas espalhada em pedaços pequenos demais para atender um pedido.`},{pt:`fragmentação interna`,en:`internal fragmentation`,def:`Espaço desperdiçado dentro de um bloco entregue: cabeçalho, alinhamento, arredondamento.`},{pt:`ponteiro pendurado`,en:`dangling pointer`,def:`Ponteiro para memória já liberada ou para um frame que já saiu da pilha.`},{pt:`uso após liberação`,en:`use-after-free`,def:`Ler ou escrever por um ponteiro pendurado; o bloco pode já pertencer a outro objeto.`,example:`ERROR: AddressSanitizer: heap-use-after-free on address 0x502000000010`},{pt:`estouro de buffer`,en:`buffer overflow`,def:`Escrever além do fim de um vetor, sobrescrevendo o que estiver ao lado.`},{pt:`comportamento indefinido`,en:`undefined behavior`,def:`Operação para a qual o padrão C não define resultado: o programa pode parecer funcionar, quebrar ou ser explorado.`,example:`Reading past the end of an array is undefined behavior.`},{pt:`ASLR`,en:`address space layout randomization`,def:`Sorteio, a cada execução, dos endereços onde começam pilha, heap, bibliotecas e código, para dificultar ataques.`}],references:[`cmu-15213`,`ostep`,`cs50`,`linux-man`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:"Em Python você nunca vê um endereço. `notas = [7, 9, 10]` cria um objeto em algum lugar do heap, o nome `notas` passa a se referir a ele, e o interpretador o libera sozinho quando ninguém mais o usa. Em C, o endereço é um **valor**: você o guarda numa variável, soma números a ele, passa para funções e, no fim, devolve a memória à mão. Esse controle deixa C rápido e previsível, e é por isso que o núcleo do Linux, o próprio CPython, o SQLite e o PostgreSQL são escritos nele.\n\nO preço é alto. A Microsoft relatou em 2019 que cerca de 70% das vulnerabilidades a que ela atribui um CVE a cada ano são erros de **segurança de memória**, e o projeto Chromium chegou ao mesmo número para os seus bugs de segurança de alta gravidade. São erros como usar memória depois de liberá-la ou escrever além do fim de um vetor, que em C não dão erro na hora: o programa segue em frente com dados corrompidos.\n\nNesta lição você vai desenhar o mapa do {{espaço de endereçamento|address space}} de um processo e dizer onde mora cada variável, ler {{ponteiros|pointers}} e aritmética de ponteiros, abrir a caixa do `malloc` e do `free` (um {{alocador|allocator}} é uma estrutura de dados em cima de um grande vetor de bytes) e catalogar os bugs clássicos, com as ferramentas que os denunciam."}]},{stage:`explicacao`,blocks:[{type:`md`,text:`### O mapa do processo
Na lição anterior, cada processo ganhou um espaço de endereços virtual só dele. Esse espaço não é usado de qualquer jeito: o SO o organiza em **regiões**, cada uma com permissões próprias (ler, escrever, executar). No Linux em x86-64, dos endereços menores para os maiores:`},{type:`table`,head:[`Região`,`O que guarda`,`Exemplo em C`,`Permissões`],rows:[[`texto (código)`,`as instruções de máquina do programa`,`o corpo de main e das outras funções`,`ler e executar`],[`dados só de leitura`,`constantes e literais de texto`,`"Olá" em char *s = "Olá";`,`só ler`],[`dados e BSS`,`variáveis globais e static: as com valor inicial diferente de zero ficam em dados; as sem valor inicial (ou zeradas), na BSS, que o SO entrega zerada`,`int limite = 10; (dados) e static int total; (BSS)`,`ler e escrever`],[`heap`,`os blocos pedidos com malloc; cresce em direção aos endereços maiores`,`malloc(100 * sizeof(int))`,`ler e escrever`],[`mapeamentos`,`bibliotecas compartilhadas (como a libc), arquivos mapeados em memória e blocos grandes de malloc`,`o código de printf mora aqui`,`depende do trecho`],[`pilha`,`um frame por chamada em andamento: parâmetros, variáveis locais, endereço de retorno; cresce em direção aos endereços menores`,`int i declarado dentro de uma função`,`ler e escrever`],[`núcleo`,`o código e os dados do SO, na metade de cima dos endereços`,`—`,`nenhuma, para o processo`]],caption:`A ordem exata e os endereços variam entre sistemas; regiões com permissões diferentes existem em todos.`},{type:`md`,text:`Três consequências práticas:

- **O meio é quase todo vazio.** Entre o heap e a pilha há terabytes de endereços sem nada mapeado. Acessar ali, ou no endereço 0 (\`NULL\`), cuja página fica sem mapeamento de propósito, causa uma falta de página que o SO não tem como atender: é a *segmentation fault*.
- **Permissões pegam erros e ataques.** Escrever no código do programa ou executar dados da pilha também termina em falha de segmentação, e isso barra muitos ataques que tentam injetar código.
- **Os endereços mudam a cada execução.** Com o {{ASLR|address space layout randomization}}, o SO sorteia onde começam a pilha, o heap, as bibliotecas e (em executáveis PIE, o padrão nas distribuições Linux atuais) o próprio código. Quem explora um bug não sabe de antemão onde está o que quer atacar.`},{type:`code`,lang:`text`,code:`$ cat /proc/self/maps        # o mapa do próprio processo cat (saída resumida)
557788768000-55778876a000 r--p 00000000 fe:00 210908   /usr/bin/cat
55778876a000-55778876f000 r-xp 00002000 fe:00 210908   /usr/bin/cat
557788772000-557788773000 rw-p 00009000 fe:00 210908   /usr/bin/cat
55779d66c000-55779d68d000 rw-p 00000000 00:00 0        [heap]
7fe271c28000-7fe271db1000 r-xp 00028000 fe:00 211544   /usr/lib/x86_64-linux-gnu/libc.so.6
7ffebe777000-7ffebe79a000 rw-p 00000000 00:00 0        [stack]`,runnable:!1,caption:`No Linux, /proc/<pid>/maps lista as regiões de um processo: faixa de endereços, permissões (r ler, w escrever, x executar, p privada), deslocamento no arquivo, dispositivo, inode e arquivo de origem. O código tem r-x, os dados têm rw-, e entre o [heap] (0x5577...) e a libc (0x7fe2...), já perto da pilha (0x7ffe...), há um buraco de dezenas de terabytes. Rode duas vezes e os endereços mudam: é o ASLR.`},{type:`callout`,tone:`deep`,text:`Se a tabela de páginas da lição anterior fosse um vetor simples, com uma entrada por página, um espaço de 2⁴⁸ bytes (256 TiB, o espaço virtual de um x86-64 com 4 níveis de tabela) em páginas de 4 KiB teria 2³⁶ entradas: com 8 bytes cada, 512 GiB **por processo**. A saída é uma tabela em **vários níveis**, como o índice de um livro com capítulos e seções. No x86-64, os 48 bits do endereço viram quatro índices de 9 bits (um por nível) e 12 bits de deslocamento. Cada tabela ocupa exatamente uma página (512 entradas de 8 bytes) e só existe se alguma página abaixo dela estiver mapeada.

Por isso o buraco entre o heap e a pilha não custa quase nada: as entradas correspondentes nos níveis de cima ficam marcadas como "não presente", e as tabelas de baixo nem são criadas. O preço é que uma tradução sem a ajuda do TLB custa até 4 leituras de memória, e é por isso que o TLB importa tanto. Processadores recentes oferecem 5 níveis, com endereços de 57 bits.`,title:`Por que um espaço quase vazio sai barato`},{type:`md`,text:'### Ponteiros: o endereço como valor\nUm **ponteiro** é uma variável cujo valor é um endereço. O tipo do ponteiro diz o que existe naquele endereço: `int *p` é "um endereço onde há um `int`".'},{type:`code`,lang:`text`,code:`#include <stdio.h>

int main(void) {
    int x = 42;          // x mora na pilha, no frame de main
    int *p = &x;         // p guarda o endereço de x
    printf("%d\\n", *p);  // 42: *p segue o endereço e lê o int que está lá
    *p = 7;              // escreve através do ponteiro
    printf("%d\\n", x);   // 7: x mudou sem aparecer do lado esquerdo de nenhuma atribuição
    return 0;
}`,runnable:!1,caption:`Código C, para ler. Para rodar no seu computador: gcc -Wall ponteiro.c -o ponteiro && ./ponteiro`},{type:`table`,head:[`Expressão`,`Lê-se`,`O que dá`],rows:[[`&x`,`o endereço de x`,`um ponteiro (int *, se x é int)`],[`*p`,`o que está no endereço p`,`o int guardado lá; serve para ler e para escrever`],[`p + 1`,`o próximo int depois de p`,`o endereço p mais sizeof(int) bytes: 4 a mais nas plataformas comuns`],[`v[i]`,`o elemento i do vetor v`,`por definição, *(v + i)`],[`NULL`,`endereço nenhum`,`desreferenciar é comportamento indefinido; no Linux, na prática, falha de segmentação`]]},{type:`md`,text:'O `*` tem dois papéis: na declaração (`int *p`) ele diz que p é um ponteiro; numa expressão (`*p = 7`) ele **desreferencia**, isto é, segue o endereço. O `&` faz o caminho inverso, de uma variável para o endereço dela.\n\nA {{aritmética de ponteiros|pointer arithmetic}} anda em **elementos**, não em bytes: `p + 3` avança `3 * sizeof(*p)` bytes. Num `int *` são 12 bytes; num `double *`, 24; num `char *`, 3. É isso que faz `v[i]` funcionar com qualquer tipo, já que `v[i]` é só uma abreviação de `*(v + i)`. E é também por isso que C não confere limites: `v[10]` num vetor de 4 elementos calcula um endereço e lê o que estiver lá, sem erro nenhum.\n\nPara que servem ponteiros?\n\n- **Para uma função mudar variáveis de quem a chamou.** C sempre passa cópias. `troca(&x, &y)` passa os endereços, e a função escreve neles com `*a = *b`.\n- **Para não copiar coisas grandes.** Passar um registro de 1 MB por endereço custa 8 bytes.\n- **Para memória dinâmica.** `malloc` devolve um ponteiro para o bloco que reservou.\n- **Para estruturas encadeadas.** O "próximo" de uma lista ligada e os filhos de uma árvore, do nível 3, são ponteiros.'},{type:`callout`,tone:`tip`,text:"Em Python, nomes também são referências, só que opacas: não dá para somar 1 a uma referência nem apontar para o meio de um objeto. No CPython, `id(x)` devolve justamente o endereço do objeto na memória, mas isso é detalhe de implementação, não uma garantia da linguagem.",title:`E em Python?`},{type:`md`,text:"### malloc e free: o contrato\n- `malloc(n)` devolve o endereço de um bloco com **pelo menos** n bytes, alinhado para qualquer tipo (16 bytes na glibc em x86-64), com conteúdo **indefinido** (lixo do uso anterior), ou `NULL` se não conseguir. Ele não sabe o tipo: quem calcula os bytes é você, com `sizeof`.\n- `calloc(n, tam)` reserva n × tam bytes **zerados**. `realloc(p, n)` muda o tamanho e **pode mover** o bloco: depois dele, o endereço antigo não vale mais.\n- `free(p)` devolve o bloco. p precisa ser exatamente um endereço que veio de `malloc`, `calloc` ou `realloc` e que ainda não foi liberado; `free(NULL)` não faz nada.\n- Depois do `free`, a variável p **continua** guardando o mesmo endereço. Ninguém a apaga; o bloco é que deixou de ser seu."},{type:`code`,lang:`text`,code:`#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n = 5;
    int *notas = malloc(n * sizeof *notas);   // 5 ints = 20 bytes no heap
    if (notas == NULL) {
        return 1;                              // sem memória: trate, não ignore
    }
    for (int i = 0; i < n; i++) {
        notas[i] = 6 + i;                      // o mesmo que *(notas + i) = 6 + i
    }
    printf("última nota: %d\\n", notas[n - 1]); // última nota: 10
    free(notas);                               // devolve os 20 bytes
    notas = NULL;                              // evita usar o endereço velho por engano
    return 0;
}`,runnable:!1,caption:`sizeof *notas é o tamanho de um elemento (4 bytes). Se o tipo de notas mudar para double, a conta continua certa sem mexer nessa linha.`},{type:`md`,text:`### Por dentro do alocador
O heap é um grande vetor de bytes, e o alocador é uma estrutura de dados em cima dele. O problema que ele resolve: atender pedidos de tamanhos variados, em qualquer ordem, desperdiçando pouco e respondendo depressa.

- **Cabeçalho.** \`free(p)\` recebe só o endereço e mesmo assim sabe quantos bytes devolver. O truque: o alocador guarda o tamanho do bloco num {{cabeçalho|header}} logo antes do endereço que entrega. Na glibc em x86-64, são os 8 bytes imediatamente anteriores a p.
- **Lista livre.** Os blocos livres ficam numa {{lista livre|free list}}. Num \`malloc(n)\`, a política decide qual usar: o **primeiro que couber** (*first fit*), o que couber **mais justo** (*best fit*) ou o próximo que couber a partir de onde a última busca parou (*next fit*).
- **Divisão.** Se o bloco escolhido é maior que o pedido, ele é dividido: uma parte é entregue, o resto continua livre.
- **Coalescência.** No \`free\`, se o vizinho da esquerda ou o da direita também estiver livre, os blocos se juntam num só. Sem {{coalescência|coalescing}}, o heap vira um monte de pedacinhos.`},{type:`table`,head:[``,`Fragmentação interna`,`Fragmentação externa`],rows:[[`O que é`,`espaço desperdiçado dentro de um bloco entregue`,`espaço livre entre blocos, em pedaços pequenos demais`],[`Causa`,`cabeçalho, alinhamento, arredondamento para tamanhos padrão`,`pedidos e liberações de tamanhos variados, sem coalescência ou com azar na ordem`],[`Exemplo`,`malloc(1) ocupa 32 bytes na glibc em x86-64`,`50 bytes livres no total, em dois pedaços de 25, e um pedido de 40 falha`]],caption:`A fragmentação interna também é chamada assim em inglês: internal fragmentation; a externa, external fragmentation.`},{type:`md`,text:"Alocadores reais combinam essas ideias com outras. A glibc separa os blocos livres em listas por faixa de tamanho, mantém um cache por thread (o *tcache*) que entrega primeiro o último bloco liberado de cada tamanho e atende pedidos grandes (a partir de 128 KiB por padrão, limite que ela ajusta durante a execução) com `mmap`, direto do SO. Alternativas conhecidas são o jemalloc, o tcmalloc e o mimalloc. O heap cresce pedindo memória ao SO (com `brk` ou `mmap`), e um `free` nem sempre devolve essa memória ao SO: é normal o uso de memória de um processo não cair logo depois de ele liberar muita coisa."},{type:`callout`,tone:`deep`,text:'Um `malloc` de 1 GB costuma voltar na hora, mesmo numa máquina com pouca RAM livre. O SO só reservou **endereços**: as páginas físicas aparecem uma a uma, na primeira vez que cada página é tocada, por meio de faltas de página que o SO atende entregando um quadro zerado (as faltas de página da lição anterior, agora usadas de propósito: é a *paginação sob demanda*). Com a configuração padrão de *overcommit* do Linux, o SO pode prometer mais memória do que tem; se todo mundo resolver usar a promessa ao mesmo tempo, o *OOM killer* escolhe um processo e o encerra. Num servidor, "o malloc não devolveu NULL" não quer dizer "a memória existe".',title:`O malloc que nunca falha`},{type:`md`,text:`### Os bugs clássicos
O padrão da linguagem C chama de {{comportamento indefinido|undefined behavior}} tudo o que vem a seguir: ele não diz o que acontece, e o compilador pode otimizar o código supondo que nunca acontece. Na prática, o programa pode parecer funcionar no seu computador, quebrar em produção ou virar porta de entrada para um ataque.

Um ponteiro para memória já liberada, ou para um frame que já saiu da pilha, é um {{ponteiro pendurado|dangling pointer}}; usá-lo é um {{uso após liberação|use-after-free}}. Escrever além do fim de um vetor é um {{estouro de buffer|buffer overflow}}: na pilha, ele pode alcançar o endereço de retorno da função, e quem controla os bytes escritos passa a controlar para onde o programa salta.`},{type:`table`,head:[`Bug`,`Como aparece no código`,`O que acontece`,`Quem denuncia`],rows:[[`vazamento (memory leak)`,`malloc sem free, ou o último ponteiro para o bloco sobrescrito`,`a memória do processo só cresce; num servidor que roda por semanas, acaba no OOM killer`,`Valgrind ("definitely lost"), LeakSanitizer`],[`double free`,`free(p); ... free(p);`,`corrompe as listas do alocador; a glibc costuma abortar com "free(): double free detected in tcache 2"`,`a própria glibc (nem sempre), ASan ("attempting double-free")`],[`use-after-free`,`free(p); e depois p->saldo = 0;`,`o bloco pode já ter sido entregue a outro malloc: você lê ou altera dados de outro objeto`,`ASan ("heap-use-after-free"), Valgrind ("Invalid read"), gcc -Wall em casos simples`],[`estouro de buffer`,`char nome[8]; strcpy(nome, "Maria Aparecida");`,`escreve 16 bytes num espaço de 8 e sobrescreve os vizinhos`,`ASan ("stack-buffer-overflow"), proteção de pilha ("*** stack smashing detected ***"), o próprio gcc em casos simples ("writing 16 bytes into a region of size 8")`],[`ponteiro para local que morreu`,`int *f(void) { int x = 5; return &x; }`,`o frame de f foi descartado; a próxima chamada reaproveita aquele pedaço da pilha`,`gcc -Wall ("function returns address of local variable")`],[`leitura não inicializada`,`usar um bloco de malloc antes de escrever nele`,`lixo do uso anterior; resultados que mudam de uma execução para outra`,`Valgrind ("uninitialised value"), MemorySanitizer`]],caption:`As mensagens entre aspas são as que essas ferramentas imprimem de fato (gcc e glibc no Ubuntu 24.04).`},{type:`md`,text:"Nenhum desses erros dá mensagem garantida em C puro. Por isso, ninguém escreve C sério sem ferramentas:\n\n- `gcc -Wall -Wextra`: avisos do compilador. Pegam parte dos erros sem nem rodar o programa.\n- `gcc -g -fsanitize=address prog.c`: o **AddressSanitizer** (ASan) instrumenta cada acesso, deixa uma zona proibida em volta de cada bloco e põe os blocos liberados em **quarentena** antes de reaproveitá-los. Deixa o programa cerca de 2 vezes mais lento: é para testes e CI, não para produção.\n- `valgrind --leak-check=full ./prog`: roda o programa num processador simulado conferindo cada acesso, sem recompilar. É bem mais lento (de 20 a 30 vezes, segundo a documentação), mas é ótimo para achar vazamentos.\n\n### E o Python?\nO CPython é escrito em C e chama o `malloc` e o `free` por você. Cada objeto carrega uma **contagem de referências**: `b = a` soma 1, o fim de uma variável local subtrai 1, e quando a contagem chega a zero o objeto é liberado na hora. Referências em ciclo (um objeto que aponta para outro que aponta de volta) nunca chegam a zero sozinhas; para elas existe o coletor de ciclos do módulo `gc`. Objetos pequenos (até 512 bytes) vêm de um alocador próprio, o *pymalloc*, que pede memória ao sistema em pedaços grandes e os reparte.\n\nEm Python puro não dá para fazer double free nem use-after-free: não existe `free`, e um objeto só some quando ninguém mais o alcança. Vazamento ainda existe, de outro tipo: um dict usado como cache que só cresce, ou uma lista global que acumula requisições, mantém os objetos alcançáveis para sempre. Rust tenta o meio-termo: memória sem coletor de lixo, mas com regras de posse (*ownership*) que o compilador confere, recusando, em código seguro (sem `unsafe`), programas com use-after-free ou double free."}]},{stage:`exemplo`,blocks:[{type:`md`,text:"Um heap de brinquedo com 100 bytes, endereços de 0 a 99, e um alocador **primeiro que couber**, com divisão e coalescência. Para simplificar, ignore cabeçalhos e alinhamento: `malloc(20)` ocupa exatamente 20 bytes. Os blocos livres aparecem como [início, fim), com o fim de fora."},{type:`table`,head:[`Passo`,`Operação`,`O que acontece`,`Blocos livres depois`],rows:[[`0`,`—`,`heap vazio`,`[0, 100)`],[`1`,`a = malloc(20)`,`a = 0; o bloco livre é dividido`,`[20, 100)`],[`2`,`b = malloc(30)`,`b = 20`,`[50, 100)`],[`3`,`c = malloc(10)`,`c = 50`,`[60, 100)`],[`4`,`free(b)`,`os vizinhos de b (a e c) estão ocupados: nada a juntar`,`[20, 50), [60, 100)`],[`5`,`d = malloc(40)`,`[20, 50) tem só 30 bytes; o primeiro que cabe é [60, 100), usado inteiro`,`[20, 50)`],[`6`,`free(a)`,`[0, 20) encosta em [20, 50): coalescência`,`[0, 50)`],[`7`,`e = malloc(45)`,`e = 0`,`[45, 50)`]],caption:`No fim: e ocupa [0, 45), c ocupa [50, 60) e d ocupa [60, 100). Sobram 5 bytes livres.`},{type:`md`,text:`Agora refaça o passo 6 **sem** coalescência: os livres ficam [0, 20) e [20, 50), dois pedaços que somam 50 bytes, e o \`malloc(45)\` do passo 7 **falha**, porque nenhum pedaço sozinho tem 45 bytes. Isso é {{fragmentação externa|external fragmentation}}. Repare também no passo 5: com *best fit* o resultado seria o mesmo, porque só um bloco servia. A diferença entre as políticas aparece quando vários blocos servem.

**Use-after-free na prática.** Agora o reaproveitamento. O tcache da glibc entrega primeiro o último bloco liberado de cada tamanho, então o programa abaixo recebe o **mesmo** bloco duas vezes:`},{type:`code`,lang:`text`,code:`int *conta = malloc(sizeof *conta);
*conta = 100;                         // saldo da conta
free(conta);                          // conta ainda guarda o endereço antigo
int *senha = malloc(sizeof *senha);   // o alocador entrega o MESMO bloco
*senha = 4321;
printf("%d\\n", *conta);               // use-after-free`,runnable:!1,caption:`Compilado com gcc -O0 no Linux, imprime 4321 (e o gcc -Wall ainda avisa: "pointer 'conta' used after 'free'"). Com -O2, no mesmo computador, imprimiu um número sem sentido: é comportamento indefinido.`},{type:`md`,text:'O ponteiro velho agora enxerga o dado de outro objeto. Se o código ainda **escrevesse** por `conta` ("zerar o saldo"), apagaria a senha. É esse reaproveitamento previsível que torna o use-after-free explorável: o atacante libera um objeto, faz o programa alocar no lugar um dado que ele controla e espera o ponteiro velho ser usado. Por isso o ASan segura os blocos liberados em quarentena antes de reaproveitá-los.'}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`import struct

memoria = bytearray(64)       # uma "RAM" de 64 bytes, toda zerada
TAM_INT = 4                   # sizeof(int) nas plataformas comuns

def guarda(endereco, valor):  # *(int *)endereco = valor
    struct.pack_into("<i", memoria, endereco, valor)

def le(endereco):             # *(int *)endereco
    return struct.unpack_from("<i", memoria, endereco)[0]

# int v[4] começa no endereço 16; a variável saldo mora logo depois, no 32
v, saldo = 16, 32
guarda(saldo, 500)
for i, nota in enumerate([7, 9, 10, 6]):
    guarda(v + i * TAM_INT, nota)          # v[i] = nota, ou seja, *(v + i) = nota

print("v[2] =", le(v + 2 * TAM_INT))
print("bytes de v[0]:", list(memoria[v:v + TAM_INT]))   # little-endian
print("v[4] =", le(v + 4 * TAM_INT), "<- não é do vetor: é o saldo")
guarda(v + 4 * TAM_INT, -1)                # estouro de buffer: nenhum erro
print("saldo depois do estouro:", le(saldo))
print("bytes do saldo:", list(memoria[saldo:saldo + TAM_INT]))`,runnable:!0,caption:`A memória como um vetor de bytes e ponteiros como números. Em C o compilador multiplica por sizeof sozinho; aqui, como num char *, a conta é sua. O -1 em complemento de dois são quatro bytes 255.`},{type:`code`,lang:`python`,code:`import struct

memoria = bytearray(64)
livres = {}      # tamanho -> pilha de endereços liberados (o último a entrar sai primeiro)
topo = 0         # até onde o heap já foi usado

def malloc(n):
    global topo
    if livres.get(n):
        return livres[n].pop()     # reaproveita o último bloco liberado desse tamanho
    p, topo = topo, topo + n
    return p

def free(p, n):                    # o C real lê n no cabeçalho; aqui passamos à mão
    livres.setdefault(n, []).append(p)

def guarda(p, valor):
    struct.pack_into("<i", memoria, p, valor)

def le(p):
    return struct.unpack_from("<i", memoria, p)[0]

conta = malloc(4)
guarda(conta, 100)
print("saldo:", le(conta))
free(conta, 4)                     # conta continua com o mesmo número: ponteiro pendurado
senha = malloc(4)
guarda(senha, 4321)
print("conta =", conta, "| senha =", senha)
print("saldo lido pelo ponteiro velho:", le(conta))
guarda(conta, 0)                   # "zerar o saldo" pelo ponteiro velho...
print("senha agora:", le(senha))   # ...apagou a senha`,runnable:!0,caption:`Um alocador que reaproveita o último bloco liberado de cada tamanho, como o tcache. Troque a ordem (aloque senha antes do free) e veja o problema sumir: o bug depende da sequência, por isso aparece "de vez em quando".`},{type:`callout`,tone:`english`,text:`Mensagens reais que você vai encontrar: **free(): double free detected in tcache 2** (glibc abortando o programa), **ERROR: AddressSanitizer: heap-use-after-free on address 0x...** e **definitely lost: 1,200 bytes in 3 blocks** (resumo de vazamentos do Valgrind). Em code review: *"This pointer is still used after free(); set it to NULL or restructure the ownership."*`,title:`English corner`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e8-ptr-1`,kind:`mcq`,prompt:"Neste trecho de C, onde ficam o ponteiro `v` e o bloco para o qual ele aponta?",code:{lang:`text`,code:`int visitas = 0;

void registra(int n) {
    int *v = malloc(n * sizeof *v);
    /* ... usa v ... */
    free(v);
}`},difficulty:`facil`,skills:[`so-memoria`],hints:[`São duas coisas diferentes: uma variável que guarda um endereço e os bytes que estão naquele endereço. Quem criou cada uma?`,`Onde moram as variáveis declaradas dentro de uma função? E de onde vem a memória que malloc devolve?`],explanation:"`v` é uma variável local de `registra`: mora no frame da função, na **pilha**, e some quando a função retorna. O bloco de n inteiros vem do `malloc`, no **heap** (ou num mapeamento próprio, se for muito grande), e vive até o `free`, independentemente da função. Esquecer o `free` aqui vazaria o bloco: a variável `v` desaparece no retorno, mas o bloco continua reservado, sem ninguém que saiba o endereço dele. `visitas`, global, mora na região de dados (BSS, por ser zerada).",options:[{text:"`v` na pilha; o bloco no heap",correct:!0,feedback:`Isso. A variável que guarda o endereço é local; os bytes vieram do alocador e vivem até o free.`},{text:`Os dois no heap, porque v foi criado com malloc`,feedback:`O malloc cria o bloco, não a variável. v é uma variável local comum, de 8 bytes, que guarda o endereço que o malloc devolveu.`},{text:`Os dois na pilha, porque foram criados dentro da função`,feedback:`"Dentro da função" decide onde mora a variável v, não o bloco. O bloco do malloc continua existindo depois do retorno; se morasse na pilha, seria descartado junto com o frame.`},{text:`v na região de dados, junto com visitas; o bloco no heap`,feedback:`Na região de dados ficam as variáveis globais e static, como visitas. v é local e não é static: mora no frame de registra, na pilha.`}]}},{type:`exercise`,exercise:{id:`e8-ptr-2`,kind:`predict`,lang:`python`,prompt:`Este alocador de brinquedo reaproveita o último bloco liberado de cada tamanho, como o tcache da glibc. O que o programa imprime?`,difficulty:`intermediario`,skills:[`so-memoria`],hints:[`Anote o valor de topo depois de cada malloc que não reaproveita nada.`,`Depois dos dois free, como está a pilha de endereços de tamanho 16? Qual sai primeiro?`,`O pedido de 32 bytes pode reaproveitar um bloco de 16?`],explanation:`a, b e c saem do topo: 0, 16 e 32 (topo vai a 64). Os dois free empilham 0 e depois 16 na lista de tamanho 16. d pede 16 e recebe o último liberado, 16 (o antigo b). e pede 32: não há bloco livre de 32, então sai do topo, 64. f pede 16 e recebe 0 (o antigo a). Se o código ainda usasse o ponteiro b, estaria mexendo nos dados de d: é o use-after-free da lição. E repare que blocos de tamanhos diferentes não se misturam: o 32 não aproveitou os blocos de 16 livres, nem que fossem vizinhos.`,code:`livres = {}
topo = 0

def malloc(n):
    global topo
    if livres.get(n):
        return livres[n].pop()
    p = topo
    topo += n
    return p

def free(p, n):
    livres.setdefault(n, []).append(p)

a = malloc(16)
b = malloc(16)
c = malloc(32)
free(a, 16)
free(b, 16)
d = malloc(16)
e = malloc(32)
f = malloc(16)
print(a, b, c)
print(d, e, f)`,answer:`0 16 32
16 64 0`}},{type:`exercise`,exercise:{id:`e8-ptr-3`,kind:`fill`,lang:`text`,prompt:"Complete o padrão de memória dinâmica em C: reservar espaço para `n` valores `double` sem escrever o tipo duas vezes, tratar a falta de memória, devolver o bloco e não deixar um ponteiro pendurado.",difficulty:`facil`,skills:[`so-memoria`],hints:[`malloc conta em bytes. Qual operador dá o tamanho de um elemento, e como escrevê-lo a partir da própria variável?`,`O que malloc devolve quando não consegue reservar a memória?`,`Depois de devolver o bloco, que valor deixa claro que o ponteiro não aponta para nada?`],explanation:'`malloc(n * sizeof *precos)` pede n vezes o tamanho de um elemento; escrever `sizeof *precos` em vez de `sizeof(double)` mantém a conta certa se o tipo mudar. malloc devolve `NULL` quando falha, e usar esse NULL depois seria comportamento indefinido. `free` devolve o bloco, e `precos = NULL` evita que um uso posterior leia memória que já não é sua: desreferenciar NULL falha na hora (segfault), enquanto um ponteiro pendurado pode "funcionar" e corromper dados em silêncio.',template:`double *precos = malloc(n * ___);
if (precos ___ NULL) {
    return -1;
}
/* ... usa precos[0] até precos[n - 1] ... */
___(precos);
precos = ___;`,blanks:[[`sizeof *precos`,`sizeof(*precos)`,`sizeof (*precos)`],[`==`],[`free`],[`NULL`]]}},{type:`exercise`,exercise:{id:`e8-ptr-4`,kind:`fix`,lang:`python`,prompt:'Um sensor de uma câmara fria grava temperaturas como `int` de C: 4 bytes cada, little-endian, com sinal, uma depois da outra, num `bytearray` (é um vetor de `int` visto como bytes). `le_vetor(memoria, base, n)` deveria devolver a lista com os n inteiros que começam no endereço `base`, mas devolve números absurdos. Corrija.\n\nOs formatos de `struct` que importam aqui: `"<i"` é um inteiro de 4 bytes **com** sinal, little-endian; `"<I"` é o mesmo **sem** sinal.',difficulty:`intermediario`,skills:[`so-memoria`],hints:[`Rode com o vetor [5, -3] gravado no endereço 0. Em qual endereço o código procura o segundo elemento? Em qual ele está?`,`Em C, p + i avança i elementos. Quantos bytes isso dá quando cada elemento tem 4 bytes?`,`Corrigido o endereço, sobra um número enorme no lugar de -3. Como os bytes de um número negativo são lidos se o formato diz que não há sinal?`],explanation:"Dois erros, os dois sobre o **tipo** do ponteiro. Primeiro, o passo: num vetor de int, o elemento i está em base + i × 4. Em C, `p + i` multiplica por sizeof sozinho; com a memória vista como bytes (um `char *`, ou um bytearray), a multiplicação é sua. Segundo, a interpretação: os mesmos 4 bytes FD FF FF FF são -3 lidos como `int` e 4 294 967 293 lidos como `unsigned int`. O tipo de um ponteiro decide quantos bytes andar e como ler o que está lá.",starter:`import struct

def le_vetor(memoria, base, n):
    valores = []
    for i in range(n):
        endereco = base + i            # o elemento i do vetor
        valores.append(struct.unpack_from("<I", memoria, endereco)[0])
    return valores`,solution:`import struct

def le_vetor(memoria, base, n):
    valores = []
    for i in range(n):
        endereco = base + i * 4        # o elemento i do vetor: i * sizeof(int) bytes depois
        valores.append(struct.unpack_from("<i", memoria, endereco)[0])
    return valores`,tests:[{name:`vetor no início da memória`,code:`import struct
m = bytearray(struct.pack("<3i", 4, 7, 2))
r = le_vetor(m, 0, 3)
assert r == [4, 7, 2], f"esperado [4, 7, 2], veio {r}: o elemento i está i * 4 bytes depois do início"`},{name:`temperaturas negativas`,code:`import struct
m = bytearray(struct.pack("<4i", 5, -3, -18, 0))
r = le_vetor(m, 0, 4)
assert r == [5, -3, -18, 0], f"esperado [5, -3, -18, 0], veio {r}: o int de C tem sinal; os bytes de -3 lidos sem sinal viram 4294967293"`},{name:`vetor no meio da memória`,code:`import struct
m = bytearray(8) + bytearray(struct.pack("<3i", -1, 300, 7)) + bytearray(struct.pack("<i", 999))
r = le_vetor(m, 8, 3)
assert r == [-1, 300, 7], f"com base 8, esperado [-1, 300, 7], veio {r}"
assert le_vetor(m, 12, 2) == [300, 7], "começando no endereço 12, o primeiro elemento é 300"`},{name:`bordas: n = 0 e n = 1`,code:`import struct
m = bytearray(struct.pack("<2i", 42, -42))
assert le_vetor(m, 0, 0) == [], "com n = 0, devolva a lista vazia"
assert le_vetor(m, 4, 1) == [-42], "um elemento só, no endereço 4: -42"`}]}},{type:`exercise`,exercise:{id:`e8-ptr-5`,kind:`code`,lang:`python`,prompt:'Escreva `diagnostico(eventos)`, um mini-Valgrind. `eventos` é a lista, em ordem, do que um programa C fez com a memória, usando endereços inteiros:\n\n- `("malloc", p)`: o alocador entregou o bloco que começa em p. Pode ser um endereço reaproveitado, liberado antes; o alocador nunca entrega um bloco que ainda está em uso.\n- `("free", p)`: o programa chamou `free(p)`.\n- `("usa", p)`: o programa leu ou escreveu no bloco que começa em p.\n\nDevolva a tupla `(erros, vazamentos)`:\n\n- `erros`: lista de pares `(i, tipo)` na ordem dos eventos, em que i é a posição do evento na lista (começando em 0) e tipo é `"double-free"` (free de um endereço já liberado), `"invalid-free"` (free de um endereço que nunca veio de malloc), `"use-after-free"` (uso de um endereço liberado) ou `"invalid-access"` (uso de um endereço que nunca veio de malloc);\n- `vazamentos`: lista **ordenada** dos endereços ainda alocados no fim.\n\nUm evento com erro não muda nada: um double free não "libera de novo".',difficulty:`intermediario`,skills:[`so-memoria`],hints:[`Que estados um endereço pode ter ao longo do programa? Bastam dois conjuntos?`,`Um endereço liberado e depois entregue de novo por malloc está em qual estado? Usá-lo é erro?`,`Para separar "double-free" de "invalid-free", você precisa saber se o endereço já veio de malloc alguma vez.`],explanation:"Cada endereço está em um de três estados: nunca alocado, alocado ou liberado. `malloc` leva ao estado alocado (inclusive um endereço liberado antes: é o reaproveitamento), `free` de um alocado leva a liberado, e o resto é erro conforme o estado. Os vazamentos são os que terminam alocados. Repare na limitação: se o alocador reaproveita um endereço, um uso pelo ponteiro **velho** fica indistinguível de um uso pelo novo dono. Ferramentas reais contornam isso adiando o reaproveitamento (a quarentena do ASan) e acompanhando cada acesso byte a byte, não só o endereço inicial do bloco.",starter:`def diagnostico(eventos):
    # devolva (erros, vazamentos)
    # erros: lista de (indice, tipo), tipo em "double-free", "invalid-free", "use-after-free", "invalid-access"
    # vazamentos: lista ordenada dos endereços ainda alocados no fim
    return [], []`,solution:`def diagnostico(eventos):
    alocados = set()
    liberados = set()
    erros = []
    for i, (op, p) in enumerate(eventos):
        if op == "malloc":
            alocados.add(p)
            liberados.discard(p)
        elif op == "free":
            if p in alocados:
                alocados.remove(p)
                liberados.add(p)
            elif p in liberados:
                erros.append((i, "double-free"))
            else:
                erros.append((i, "invalid-free"))
        elif op == "usa":
            if p in liberados:
                erros.append((i, "use-after-free"))
            elif p not in alocados:
                erros.append((i, "invalid-access"))
    return erros, sorted(alocados)`,tests:[{name:`programa sem erros`,code:`ev = [("malloc", 16), ("usa", 16), ("malloc", 48), ("usa", 48), ("free", 16), ("free", 48)]
r = diagnostico(ev)
assert r == ([], []), f"programa correto: esperado ([], []), veio {r}"`},{name:`os quatro erros e um vazamento`,code:`ev = [
    ("malloc", 100),   # 0
    ("malloc", 200),   # 1
    ("free", 100),     # 2
    ("usa", 100),      # 3 use-after-free
    ("free", 100),     # 4 double-free
    ("free", 300),     # 5 invalid-free
    ("usa", 999),      # 6 invalid-access
]
erros, vaz = diagnostico(ev)
esperado = [(3, "use-after-free"), (4, "double-free"), (5, "invalid-free"), (6, "invalid-access")]
assert erros == esperado, f"esperado {esperado}, veio {erros}"
assert vaz == [200], f"o bloco 200 nunca foi liberado: vazamentos deveria ser [200], veio {vaz}"`},{name:`endereço reaproveitado`,code:`ev = [("malloc", 8), ("free", 8), ("malloc", 8), ("usa", 8), ("free", 8)]
r = diagnostico(ev)
assert r == ([], []), f"8 foi liberado e entregue de novo pelo malloc: usar e liberar de novo é legítimo. Esperado ([], []), veio {r}"
ev = [("malloc", 8), ("free", 8), ("malloc", 8), ("free", 8), ("free", 8), ("usa", 8)]
r = diagnostico(ev)
assert r == ([(4, "double-free"), (5, "use-after-free")], []), f"depois do segundo ciclo malloc/free, o free do índice 4 é double free e o uso do índice 5 é use-after-free; veio {r}"`},{name:`erro não muda o estado`,code:`ev = [("free", 5), ("usa", 5), ("malloc", 5), ("usa", 5)]
r = diagnostico(ev)
assert r == ([(0, "invalid-free"), (1, "invalid-access")], [5]), f"o free inválido não torna 5 'liberado': o uso seguinte é invalid-access. Depois do malloc, 5 é válido e termina vazado. Veio {r}"
ev = [("malloc", 1), ("free", 1), ("free", 1), ("free", 1)]
r = diagnostico(ev)
assert r == ([(2, "double-free"), (3, "double-free")], []), f"cada free extra é um double free; veio {r}"`},{name:`vazamentos em ordem e lista vazia`,code:`assert diagnostico([]) == ([], []), "sem eventos, devolva ([], [])"
ev = [("malloc", 300), ("malloc", 20), ("malloc", 1000), ("malloc", 4), ("free", 1000)]
erros, vaz = diagnostico(ev)
assert erros == [], f"não há erros aqui; veio {erros}"
assert vaz == [4, 20, 300], f"os vazamentos devem vir em ordem crescente de endereço: esperado [4, 20, 300], veio {vaz}"`},{name:`programas aleatórios`,code:`import random

def _ref(ev):
    estado = {}
    erros = []
    for i, (op, p) in enumerate(ev):
        s = estado.get(p, "nunca")
        if op == "malloc":
            estado[p] = "alocado"
        elif op == "free":
            if s == "alocado":
                estado[p] = "liberado"
            else:
                erros.append((i, "double-free" if s == "liberado" else "invalid-free"))
        elif s != "alocado":
            erros.append((i, "use-after-free" if s == "liberado" else "invalid-access"))
    return erros, sorted(p for p, s in estado.items() if s == "alocado")

random.seed(82)
for _ in range(300):
    vivos = set()
    ev = []
    for _ in range(random.randint(0, 25)):
        x = random.random()
        if x < 0.35:
            livres = [p for p in range(0, 80, 8) if p not in vivos]
            if livres:
                p = random.choice(livres)
                vivos.add(p)
                ev.append(("malloc", p))
        elif x < 0.65:
            p = random.randrange(0, 88, 8)
            vivos.discard(p)
            ev.append(("free", p))
        else:
            ev.append(("usa", random.randrange(0, 88, 8)))
    esperado = _ref(ev)
    r = diagnostico(ev)
    assert r == esperado, f"diagnostico({ev}) deu {r}, esperado {esperado}"`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e8-ptr-desafio`,kind:`code`,lang:`python`,prompt:"Implemente o alocador do exemplo da lição: a classe `Heap`, com política **primeiro que couber**, divisão e coalescência. Como no exemplo, ignore cabeçalhos e alinhamento (o tamanho de cada bloco alocado pode ficar num dict à parte).\n\n- `Heap(tamanho)`: um heap com endereços de 0 a tamanho − 1, todo livre.\n- `malloc(n)` (n ≥ 1): entre os blocos livres com pelo menos n bytes, escolha o de **menor endereço**. Entregue os n primeiros bytes dele (o resto continua livre) e devolva o endereço inicial. Se nenhum bloco livre sozinho tiver n bytes, devolva `None`.\n- `free(p)`: p precisa ser o início de um bloco alocado e ainda não liberado; senão, levante `ValueError` sem mudar nada. O bloco volta a ser livre e se **junta** aos vizinhos livres da esquerda e da direita.\n- `livres()`: lista de tuplas `(inicio, tamanho)` dos blocos livres, em ordem de endereço. Como a coalescência é imediata, nunca há dois blocos livres encostados.",difficulty:`desafio`,skills:[`so-memoria`,`ed-arrays`],hints:[`Que estruturas você precisa guardar? Os blocos alocados precisam ser achados pelo endereço inicial; os livres precisam ser percorridos em ordem de endereço.`,`No malloc, o que sobra de um bloco livre maior que o pedido? Onde ele começa? E se o bloco tiver exatamente n bytes?`,`No free, o bloco que volta tem um início e um fim. Como saber se existe um bloco livre que termina exatamente no início dele? E um que começa exatamente no fim dele?`,`Se os dois vizinhos estiverem livres, quantos blocos livres devem sobrar depois da junção?`],explanation:`Os blocos livres ficam numa lista ordenada por endereço, e os alocados num dict início → tamanho (o papel do cabeçalho). O malloc percorre a lista e usa o primeiro que cabe: se sobra espaço, o bloco livre encolhe e passa a começar n bytes adiante; se não sobra, sai da lista. O free confere o dict (o que pega double free e free inválido de uma vez), acha a posição do bloco na lista ordenada (com bisect) e olha só os dois vizinhos: o anterior se junta se terminar exatamente onde o bloco começa; o seguinte, se começar exatamente onde o bloco termina. O malloc custa O(número de blocos livres), como num alocador de lista simples; alocadores reais usam listas separadas por tamanho para não percorrer tudo, e guardam o tamanho também no fim de cada bloco (*boundary tag*) para achar o vizinho da esquerda em O(1) sem lista ordenada.`,starter:`class Heap:
    def __init__(self, tamanho):
        # o heap vai do endereço 0 a tamanho - 1 e começa todo livre
        pass

    def malloc(self, n):
        # primeiro bloco livre (menor endereço) com pelo menos n bytes:
        # entregue os n primeiros bytes e devolva o endereço, ou None se nenhum couber
        pass

    def free(self, p):
        # p precisa ser o início de um bloco alocado; senão, ValueError
        # o bloco volta a ser livre, juntando-se aos vizinhos livres
        pass

    def livres(self):
        # lista de (inicio, tamanho) dos blocos livres, em ordem de endereço
        return []`,solution:`import bisect

class Heap:
    def __init__(self, tamanho):
        self.livre = [(0, tamanho)] if tamanho > 0 else []
        self.alocado = {}

    def malloc(self, n):
        for i, (inicio, tam) in enumerate(self.livre):
            if tam >= n:
                if tam == n:
                    self.livre.pop(i)
                else:
                    self.livre[i] = (inicio + n, tam - n)
                self.alocado[inicio] = n
                return inicio
        return None

    def free(self, p):
        if p not in self.alocado:
            raise ValueError(f"free inválido: {p} não é o início de um bloco alocado")
        n = self.alocado.pop(p)
        inicio, fim = p, p + n
        i = bisect.bisect_left(self.livre, (p, 0))
        if i < len(self.livre) and self.livre[i][0] == fim:
            fim += self.livre[i][1]
            self.livre.pop(i)
        if i > 0 and self.livre[i - 1][0] + self.livre[i - 1][1] == inicio:
            inicio = self.livre[i - 1][0]
            self.livre.pop(i - 1)
            i -= 1
        self.livre.insert(i, (inicio, fim - inicio))

    def livres(self):
        return list(self.livre)`,tests:[{name:`o exemplo da lição`,code:`def _faixas_livres(dono):
    blocos, i, n = [], 0, len(dono)
    while i < n:
        if dono[i] is None:
            j = i
            while j < n and dono[j] is None:
                j += 1
            blocos.append((i, j - i))
            i = j
        else:
            i += 1
    return blocos

def _livres_de(h):
    r = h.livres()
    assert isinstance(r, list), f"livres() deve devolver uma lista; veio {r!r}"
    return [tuple(b) for b in r]
h = Heap(100)
assert _livres_de(h) == [(0, 100)], f"um heap novo de 100 bytes tem um único bloco livre (0, 100); veio {_livres_de(h)}"
a = h.malloc(20); b = h.malloc(30); c = h.malloc(10)
assert (a, b, c) == (0, 20, 50), f"esperado a, b, c = 0, 20, 50; veio {(a, b, c)}"
assert _livres_de(h) == [(60, 40)], f"depois de três mallocs, esperado [(60, 40)]; veio {_livres_de(h)}"
h.free(b)
assert _livres_de(h) == [(20, 30), (60, 40)], f"depois de free(b), esperado [(20, 30), (60, 40)]; veio {_livres_de(h)}"
d = h.malloc(40)
assert d == 60, f"[20, 50) tem só 30 bytes: d = malloc(40) deve usar o bloco em 60; veio {d}"
assert _livres_de(h) == [(20, 30)], f"o bloco (60, 40) foi usado inteiro: não deve sobrar (100, 0) nem nada parecido; veio {_livres_de(h)}"
h.free(a)
assert _livres_de(h) == [(0, 50)], f"[0, 20) encosta em [20, 50): a coalescência deve deixar um bloco só, (0, 50); veio {_livres_de(h)}"
e = h.malloc(45)
assert e == 0, f"com a coalescência, malloc(45) cabe no endereço 0; veio {e}"
assert _livres_de(h) == [(45, 5)], f"esperado [(45, 5)]; veio {_livres_de(h)}"`},{name:`primeiro que couber, não o mais justo`,code:`def _faixas_livres(dono):
    blocos, i, n = [], 0, len(dono)
    while i < n:
        if dono[i] is None:
            j = i
            while j < n and dono[j] is None:
                j += 1
            blocos.append((i, j - i))
            i = j
        else:
            i += 1
    return blocos

def _livres_de(h):
    r = h.livres()
    assert isinstance(r, list), f"livres() deve devolver uma lista; veio {r!r}"
    return [tuple(b) for b in r]
h = Heap(100)
a = h.malloc(30); b = h.malloc(10); c = h.malloc(20); d = h.malloc(10)
h.free(a); h.free(c)
assert _livres_de(h) == [(0, 30), (40, 20), (70, 30)], f"esperado [(0, 30), (40, 20), (70, 30)]; veio {_livres_de(h)}"
x = h.malloc(15)
assert x == 0, f"o primeiro bloco que cabe 15 bytes começa em 0 (o best fit escolheria o de 40); veio {x}"
assert _livres_de(h) == [(15, 15), (40, 20), (70, 30)], f"esperado [(15, 15), (40, 20), (70, 30)]; veio {_livres_de(h)}"
y = h.malloc(25)
assert y == 70, f"só o bloco em 70 tem 25 bytes; veio {y}"`},{name:`coalescência dos dois lados e só de um`,code:`def _faixas_livres(dono):
    blocos, i, n = [], 0, len(dono)
    while i < n:
        if dono[i] is None:
            j = i
            while j < n and dono[j] is None:
                j += 1
            blocos.append((i, j - i))
            i = j
        else:
            i += 1
    return blocos

def _livres_de(h):
    r = h.livres()
    assert isinstance(r, list), f"livres() deve devolver uma lista; veio {r!r}"
    return [tuple(b) for b in r]
h = Heap(30)
a = h.malloc(10); b = h.malloc(10); c = h.malloc(10)
h.free(a); h.free(c)
assert _livres_de(h) == [(0, 10), (20, 10)], f"esperado [(0, 10), (20, 10)]; veio {_livres_de(h)}"
h.free(b)
assert _livres_de(h) == [(0, 30)], f"liberar b, entre dois livres, deve juntar os três num bloco (0, 30); veio {_livres_de(h)}"
assert h.malloc(30) == 0, "depois de juntar tudo, malloc(30) cabe no endereço 0"

h = Heap(30)
a = h.malloc(10); b = h.malloc(10); c = h.malloc(10)
h.free(b)
h.free(c)
assert _livres_de(h) == [(10, 20)], f"c foi liberado com o vizinho da ESQUERDA (b) livre: esperado [(10, 20)]; veio {_livres_de(h)}"
h2 = Heap(30)
a = h2.malloc(10); b = h2.malloc(10); c = h2.malloc(10)
h2.free(b)
h2.free(a)
assert _livres_de(h2) == [(0, 20)], f"a foi liberado com o vizinho da DIREITA (b) livre: esperado [(0, 20)]; veio {_livres_de(h2)}"`},{name:`fragmentação: None sem mudar nada`,code:`def _faixas_livres(dono):
    blocos, i, n = [], 0, len(dono)
    while i < n:
        if dono[i] is None:
            j = i
            while j < n and dono[j] is None:
                j += 1
            blocos.append((i, j - i))
            i = j
        else:
            i += 1
    return blocos

def _livres_de(h):
    r = h.livres()
    assert isinstance(r, list), f"livres() deve devolver uma lista; veio {r!r}"
    return [tuple(b) for b in r]
h = Heap(50)
a = h.malloc(25); b = h.malloc(25)
assert h.malloc(1) is None, "o heap está cheio: malloc(1) deve devolver None"
h.free(a)
assert h.malloc(30) is None, "só há 25 bytes livres: malloc(30) deve devolver None"
assert _livres_de(h) == [(0, 25)], f"um malloc que falha não muda nada; veio {_livres_de(h)}"
h = Heap(60)
xs = [h.malloc(10) for _ in range(6)]
h.free(xs[1]); h.free(xs[3]); h.free(xs[5])
assert h.malloc(20) is None, "há 30 bytes livres, mas em três pedaços de 10 que não se encostam: malloc(20) deve falhar (fragmentação externa)"`},{name:`free inválido e double free`,code:`def _faixas_livres(dono):
    blocos, i, n = [], 0, len(dono)
    while i < n:
        if dono[i] is None:
            j = i
            while j < n and dono[j] is None:
                j += 1
            blocos.append((i, j - i))
            i = j
        else:
            i += 1
    return blocos

def _livres_de(h):
    r = h.livres()
    assert isinstance(r, list), f"livres() deve devolver uma lista; veio {r!r}"
    return [tuple(b) for b in r]
h = Heap(40)
a = h.malloc(10); b = h.malloc(10)
for p, porque in [(5, "5 fica no meio do bloco a, não no início"), (30, "30 está livre: nunca foi entregue"), (99, "99 está fora do heap")]:
    try:
        h.free(p)
    except ValueError:
        pass
    else:
        raise AssertionError(f"free({p}) deveria levantar ValueError: {porque}")
assert _livres_de(h) == [(20, 20)], f"um free inválido não pode mudar nada; veio {_livres_de(h)}"
h.free(a)
try:
    h.free(a)
except ValueError:
    pass
else:
    raise AssertionError("liberar a duas vezes (double free) deveria levantar ValueError")
assert _livres_de(h) == [(0, 10), (20, 20)], f"o double free não pode mudar nada; veio {_livres_de(h)}"
c = h.malloc(10)
assert c == 0, f"o bloco de a foi liberado e pode ser reaproveitado; veio {c}"
h.free(c)`},{name:`sequências aleatórias`,code:`def _faixas_livres(dono):
    blocos, i, n = [], 0, len(dono)
    while i < n:
        if dono[i] is None:
            j = i
            while j < n and dono[j] is None:
                j += 1
            blocos.append((i, j - i))
            i = j
        else:
            i += 1
    return blocos

def _livres_de(h):
    r = h.livres()
    assert isinstance(r, list), f"livres() deve devolver uma lista; veio {r!r}"
    return [tuple(b) for b in r]
import random
random.seed(15)
for rodada in range(150):
    tamanho = random.randint(1, 120)
    h = Heap(tamanho)
    dono = [None] * tamanho
    vivos = {}
    historico = []
    for _ in range(40):
        if vivos and random.random() < 0.45:
            p = random.choice(list(vivos))
            historico.append(f"free({p})")
            h.free(p)
            for k in range(p, p + vivos.pop(p)):
                dono[k] = None
        else:
            n = random.randint(1, max(1, tamanho // 3))
            historico.append(f"malloc({n})")
            esperado = next((ini for ini, tam in _faixas_livres(dono) if tam >= n), None)
            r = h.malloc(n)
            assert r == esperado, f"Heap({tamanho}), depois de {historico}: malloc devolveu {r}, esperado {esperado}"
            if r is not None:
                vivos[r] = n
                for k in range(r, r + n):
                    dono[k] = r
        assert _livres_de(h) == _faixas_livres(dono), f"Heap({tamanho}), depois de {historico}: livres() deu {_livres_de(h)}, esperado {_faixas_livres(dono)}"`}]}}]},{stage:`revisao`,blocks:[{type:`md`,text:"- Espaço de endereçamento: texto (r-x), dados e BSS (globais), heap (malloc, cresce para cima), mapeamentos (bibliotecas, blocos grandes), pilha (frames, cresce para baixo). O meio é quase todo vazio, e o ASLR sorteia as posições.\n- Ponteiro = endereço com tipo. `&x` dá o endereço; `*p` segue o endereço; `p + i` anda i elementos (i × sizeof bytes); `v[i]` é `*(v + i)`, sem conferir limites.\n- `malloc(n)`: pelo menos n bytes, conteúdo indefinido, `NULL` se falhar. `free(p)`: só endereços vindos de malloc, uma vez só; depois dele, p fica pendurado.\n- Alocador: cabeçalho com o tamanho, lista livre, política (first fit, best fit), divisão e coalescência. Sem coalescência, fragmentação externa.\n- Bugs: vazamento, double free, use-after-free, estouro de buffer, ponteiro para local, leitura não inicializada. Todos são comportamento indefinido.\n- Ferramentas: `-Wall`, AddressSanitizer (`-fsanitize=address`) e Valgrind.\n- Python: contagem de referências + coletor de ciclos; sem free, mas ainda é possível vazar mantendo objetos alcançáveis."},{type:`callout`,tone:`english`,text:`- **address space / memory layout**: espaço de endereçamento / mapa de memória
- **pointer, dereference, pointer arithmetic**: ponteiro, desreferenciar, aritmética de ponteiros
- **allocator, free list, coalescing, fragmentation**: alocador, lista livre, coalescência, fragmentação
- **memory leak, double free, use-after-free, buffer overflow, dangling pointer**
- **undefined behavior (UB)**: comportamento indefinido
- **memory safety / memory-safe language**: segurança de memória / linguagem com segurança de memória

Frase típica de entrevista: *"A use-after-free happens when code keeps using a pointer after the memory was freed. The allocator may already have handed that block to another object, so reads return someone else's data and writes corrupt it. I'd catch it with AddressSanitizer in CI."*

Frase típica de documentação (man page de malloc): *"The free() function frees the memory space pointed to by ptr, which must have been returned by a previous call to malloc() or related functions. Otherwise, or if ptr has already been freed, undefined behavior occurs. If ptr is NULL, no operation is performed."*`,title:`English corner`}]}],cards:[{id:`l8-ponteiros-heap-c#1`,front:`Em que região do processo ficam: uma variável local, um bloco de malloc, uma variável global e o código de main?`,back:`Local: pilha. Bloco de malloc: heap (ou um mapeamento próprio, se for grande). Global: dados ou BSS. Código: segmento de texto.`},{id:`l8-ponteiros-heap-c#2`,front:`Se p é um int * que vale 1000 e sizeof(int) é 4, quanto vale p + 3? E v[i] equivale a quê?`,back:`1012: a aritmética de ponteiros anda em elementos (3 × 4 bytes). v[i] é *(v + i).`},{id:`l8-ponteiros-heap-c#3`,front:`Como free(p) sabe quantos bytes liberar, se recebe só o endereço?`,back:`O alocador guardou o tamanho num cabeçalho logo antes do endereço que entregou.`},{id:`l8-ponteiros-heap-c#4`,front:`O que é coalescência, e que problema ela evita?`,back:`Juntar blocos livres vizinhos num só quando um deles é liberado. Evita a fragmentação externa: memória livre suficiente no total, mas em pedaços pequenos demais.`},{id:`l8-ponteiros-heap-c#5`,front:`Por que um use-after-free pode ler os dados de outro objeto?`,back:`Depois do free, o alocador pode entregar o mesmo bloco a outro malloc; o ponteiro velho passa a ler e escrever os dados do novo dono.`},{id:`l8-ponteiros-heap-c#6`,front:`Que ferramentas denunciam erros de memória em C?`,back:`Os avisos do compilador (gcc -Wall), o AddressSanitizer (compilar com -fsanitize=address) e o Valgrind (valgrind --leak-check=full).`},{id:`l8-ponteiros-heap-c#7`,front:`Como o CPython libera memória sem free, e que tipo de vazamento ainda é possível?`,back:`Contagem de referências (libera quando chega a zero) mais um coletor para ciclos. Ainda vaza quem mantém objetos alcançáveis sem precisar, como um cache que só cresce.`}]};export{e as default};
//# sourceMappingURL=l8-ponteiros-heap-c-DBKEEhIL.js.map