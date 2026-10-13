/** Lições adicionais do módulo m8-2 (memória e sistemas de arquivos). */
import type { Lesson } from '../../types.ts';
import { code, dedent, deep, english, lesson, md, py, t, tip, warn } from '../../helpers.ts';

/* ------------------------------------------------------------------ */
/* Ajudantes de teste                                                   */
/* ------------------------------------------------------------------ */

/** Referência do alocador: um mapa de bytes (None = livre) e os blocos livres como faixas máximas. */
const REF_HEAP = dedent(`
  def _faixas_livres(dono):
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
`);

/** Sistema de arquivos de teste para o desafio de resolução de caminhos. */
const FS_TESTE = dedent(`
  import errno as _errno

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
`);

/* ------------------------------------------------------------------ */
/* Lição 2: ponteiros, malloc/free e os bugs de memória em C           */
/* ------------------------------------------------------------------ */

const ponteiros = lesson({
  id: 'l8-ponteiros-heap-c',
  moduleId: 'm8-2',
  title: 'Ponteiros e o heap em C: endereços, malloc, free e os bugs clássicos',
  titleEn: 'Pointers and the heap in C: addresses, malloc, free and the classic bugs',
  summary: 'O mapa do espaço de endereçamento de um processo, ponteiros e aritmética de ponteiros em C, como malloc e free funcionam por dentro (cabeçalho, lista livre, divisão e coalescência) e os erros de memória por trás da maior parte das falhas graves de segurança: vazamento, double free, use-after-free e estouro de buffer, com as ferramentas que os denunciam.',
  minutes: 50,
  objectives: [
    'Desenhar o espaço de endereçamento de um processo (texto, dados, heap, mapeamentos, pilha) e dizer onde mora cada variável de um programa C',
    'Ler código C com &, * e aritmética de ponteiros, calculando o endereço que cada expressão produz',
    'Explicar o contrato de malloc e free e como um alocador usa cabeçalho, lista livre, divisão e coalescência',
    'Reconhecer vazamento, double free, use-after-free, estouro de buffer e ponteiro para variável local, e saber qual ferramenta denuncia cada um',
    'Comparar a gestão manual de memória do C com a contagem de referências do Python',
  ],
  skills: ['so-memoria'],
  terms: [
    t('espaço de endereçamento', 'address space', 'Conjunto de endereços virtuais que um processo pode usar, organizado em regiões com permissões próprias: código, dados, heap, mapeamentos e pilha.', 'Each process has its own virtual address space.'),
    t('segmento de texto', 'text segment', 'Região com as instruções de máquina do programa; pode ser lida e executada, mas não escrita.'),
    t('ponteiro', 'pointer', 'Em C, uma variável cujo valor é um endereço de memória; o tipo do ponteiro diz o que existe naquele endereço.', 'Dereferencing a NULL pointer is undefined behavior.'),
    t('desreferenciar', 'dereference', 'Seguir o endereço guardado num ponteiro para ler ou escrever o valor que está lá (*p em C).'),
    t('aritmética de ponteiros', 'pointer arithmetic', 'Somar n a um ponteiro avança n elementos, isto é, n × sizeof(tipo) bytes; v[i] é *(v + i).'),
    t('alocador', 'allocator', 'Código da biblioteca (malloc, free) que reparte o heap em blocos e controla quais estão livres.', "glibc's allocator keeps freed chunks in per-thread caches."),
    t('cabeçalho', 'header', 'Bytes que o alocador guarda logo antes do bloco entregue, com o tamanho dele; é assim que free(p) sabe quanto liberar.'),
    t('lista livre', 'free list', 'Lista dos blocos livres do heap que o alocador consulta para atender um malloc.'),
    t('coalescência', 'coalescing', 'Juntar blocos livres vizinhos num bloco maior quando um deles é liberado.'),
    t('fragmentação externa', 'external fragmentation', 'Memória livre suficiente no total, mas espalhada em pedaços pequenos demais para atender um pedido.'),
    t('fragmentação interna', 'internal fragmentation', 'Espaço desperdiçado dentro de um bloco entregue: cabeçalho, alinhamento, arredondamento.'),
    t('ponteiro pendurado', 'dangling pointer', 'Ponteiro para memória já liberada ou para um frame que já saiu da pilha.'),
    t('uso após liberação', 'use-after-free', 'Ler ou escrever por um ponteiro pendurado; o bloco pode já pertencer a outro objeto.', 'ERROR: AddressSanitizer: heap-use-after-free on address 0x502000000010'),
    t('estouro de buffer', 'buffer overflow', 'Escrever além do fim de um vetor, sobrescrevendo o que estiver ao lado.'),
    t('comportamento indefinido', 'undefined behavior', 'Operação para a qual o padrão C não define resultado: o programa pode parecer funcionar, quebrar ou ser explorado.', 'Reading past the end of an array is undefined behavior.'),
    t('ASLR', 'address space layout randomization', 'Sorteio, a cada execução, dos endereços onde começam pilha, heap, bibliotecas e código, para dificultar ataques.'),
  ],
  stages: {
    conceito: [
      md(`
        Em Python você nunca vê um endereço. \`notas = [7, 9, 10]\` cria um objeto em algum lugar do heap, o nome \`notas\` passa a se referir a ele, e o interpretador o libera sozinho quando ninguém mais o usa. Em C, o endereço é um **valor**: você o guarda numa variável, soma números a ele, passa para funções e, no fim, devolve a memória à mão. Esse controle deixa C rápido e previsível, e é por isso que o núcleo do Linux, o próprio CPython, o SQLite e o PostgreSQL são escritos nele.

        O preço é alto. A Microsoft relatou em 2019 que cerca de 70% das vulnerabilidades a que ela atribui um CVE a cada ano são erros de **segurança de memória**, e o projeto Chromium chegou ao mesmo número para os seus bugs de segurança de alta gravidade. São erros como usar memória depois de liberá-la ou escrever além do fim de um vetor, que em C não dão erro na hora: o programa segue em frente com dados corrompidos.

        Nesta lição você vai desenhar o mapa do {{espaço de endereçamento|address space}} de um processo e dizer onde mora cada variável, ler {{ponteiros|pointers}} e aritmética de ponteiros, abrir a caixa do \`malloc\` e do \`free\` (um {{alocador|allocator}} é uma estrutura de dados em cima de um grande vetor de bytes) e catalogar os bugs clássicos, com as ferramentas que os denunciam.
      `),
    ],
    explicacao: [
      md(`
        ### O mapa do processo
        Na lição anterior, cada processo ganhou um espaço de endereços virtual só dele. Esse espaço não é usado de qualquer jeito: o SO o organiza em **regiões**, cada uma com permissões próprias (ler, escrever, executar). No Linux em x86-64, dos endereços menores para os maiores:
      `),
      {
        type: 'table',
        head: ['Região', 'O que guarda', 'Exemplo em C', 'Permissões'],
        rows: [
          ['texto (código)', 'as instruções de máquina do programa', 'o corpo de main e das outras funções', 'ler e executar'],
          ['dados só de leitura', 'constantes e literais de texto', '"Olá" em char *s = "Olá";', 'só ler'],
          ['dados e BSS', 'variáveis globais e static: as com valor inicial diferente de zero ficam em dados; as sem valor inicial (ou zeradas), na BSS, que o SO entrega zerada', 'int limite = 10; (dados) e static int total; (BSS)', 'ler e escrever'],
          ['heap', 'os blocos pedidos com malloc; cresce em direção aos endereços maiores', 'malloc(100 * sizeof(int))', 'ler e escrever'],
          ['mapeamentos', 'bibliotecas compartilhadas (como a libc), arquivos mapeados em memória e blocos grandes de malloc', 'o código de printf mora aqui', 'depende do trecho'],
          ['pilha', 'um frame por chamada em andamento: parâmetros, variáveis locais, endereço de retorno; cresce em direção aos endereços menores', 'int i declarado dentro de uma função', 'ler e escrever'],
          ['núcleo', 'o código e os dados do SO, na metade de cima dos endereços', '—', 'nenhuma, para o processo'],
        ],
        caption: 'A ordem exata e os endereços variam entre sistemas; regiões com permissões diferentes existem em todos.',
      },
      md(`
        Três consequências práticas:

        - **O meio é quase todo vazio.** Entre o heap e a pilha há terabytes de endereços sem nada mapeado. Acessar ali, ou no endereço 0 (\`NULL\`), cuja página fica sem mapeamento de propósito, causa uma falta de página que o SO não tem como atender: é a *segmentation fault*.
        - **Permissões pegam erros e ataques.** Escrever no código do programa ou executar dados da pilha também termina em falha de segmentação, e isso barra muitos ataques que tentam injetar código.
        - **Os endereços mudam a cada execução.** Com o {{ASLR|address space layout randomization}}, o SO sorteia onde começam a pilha, o heap, as bibliotecas e (em executáveis PIE, o padrão nas distribuições Linux atuais) o próprio código. Quem explora um bug não sabe de antemão onde está o que quer atacar.
      `),
      code('text', `
        $ cat /proc/self/maps        # o mapa do próprio processo cat (saída resumida)
        557788768000-55778876a000 r--p 00000000 fe:00 210908   /usr/bin/cat
        55778876a000-55778876f000 r-xp 00002000 fe:00 210908   /usr/bin/cat
        557788772000-557788773000 rw-p 00009000 fe:00 210908   /usr/bin/cat
        55779d66c000-55779d68d000 rw-p 00000000 00:00 0        [heap]
        7fe271c28000-7fe271db1000 r-xp 00028000 fe:00 211544   /usr/lib/x86_64-linux-gnu/libc.so.6
        7ffebe777000-7ffebe79a000 rw-p 00000000 00:00 0        [stack]
      `, 'No Linux, /proc/<pid>/maps lista as regiões de um processo: faixa de endereços, permissões (r ler, w escrever, x executar, p privada), deslocamento no arquivo, dispositivo, inode e arquivo de origem. O código tem r-x, os dados têm rw-, e entre o [heap] (0x5577...) e a pilha (0x7ffe...) há um buraco de dezenas de terabytes. Rode duas vezes e os endereços mudam: é o ASLR.'),
      deep(`
        Se a tabela de páginas da lição anterior fosse um vetor simples, com uma entrada por página, um espaço de 2⁴⁸ bytes (256 TiB, o espaço virtual de um x86-64 com 4 níveis de tabela) em páginas de 4 KiB teria 2³⁶ entradas: com 8 bytes cada, 512 GiB **por processo**. A saída é uma tabela em **vários níveis**, como o índice de um livro com capítulos e seções. No x86-64, os 48 bits do endereço viram quatro índices de 9 bits (um por nível) e 12 bits de deslocamento. Cada tabela ocupa exatamente uma página (512 entradas de 8 bytes) e só existe se alguma página abaixo dela estiver mapeada.

        Por isso o buraco entre o heap e a pilha não custa quase nada: as entradas correspondentes nos níveis de cima ficam marcadas como "não presente", e as tabelas de baixo nem são criadas. O preço é que uma tradução sem a ajuda do TLB custa até 4 leituras de memória, e é por isso que o TLB importa tanto. Processadores recentes oferecem 5 níveis, com endereços de 57 bits.
      `, 'Por que um espaço quase vazio sai barato'),
      md(`
        ### Ponteiros: o endereço como valor
        Um **ponteiro** é uma variável cujo valor é um endereço. O tipo do ponteiro diz o que existe naquele endereço: \`int *p\` é "um endereço onde há um \`int\`".
      `),
      code('text', `
        #include <stdio.h>

        int main(void) {
            int x = 42;          // x mora na pilha, no frame de main
            int *p = &x;         // p guarda o endereço de x
            printf("%d\\n", *p);  // 42: *p segue o endereço e lê o int que está lá
            *p = 7;              // escreve através do ponteiro
            printf("%d\\n", x);   // 7: x mudou sem aparecer do lado esquerdo de nenhuma atribuição
            return 0;
        }
      `, 'Código C, para ler. Para rodar no seu computador: gcc -Wall ponteiro.c -o ponteiro && ./ponteiro'),
      {
        type: 'table',
        head: ['Expressão', 'Lê-se', 'O que dá'],
        rows: [
          ['&x', 'o endereço de x', 'um ponteiro (int *, se x é int)'],
          ['*p', 'o que está no endereço p', 'o int guardado lá; serve para ler e para escrever'],
          ['p + 1', 'o próximo int depois de p', 'o endereço p mais sizeof(int) bytes: 4 a mais nas plataformas comuns'],
          ['v[i]', 'o elemento i do vetor v', 'por definição, *(v + i)'],
          ['NULL', 'endereço nenhum', 'desreferenciar é comportamento indefinido; no Linux, na prática, falha de segmentação'],
        ],
      },
      md(`
        O \`*\` tem dois papéis: na declaração (\`int *p\`) ele diz que p é um ponteiro; numa expressão (\`*p = 7\`) ele **desreferencia**, isto é, segue o endereço. O \`&\` faz o caminho inverso, de uma variável para o endereço dela.

        A {{aritmética de ponteiros|pointer arithmetic}} anda em **elementos**, não em bytes: \`p + 3\` avança \`3 * sizeof(*p)\` bytes. Num \`int *\` são 12 bytes; num \`double *\`, 24; num \`char *\`, 3. É isso que faz \`v[i]\` funcionar com qualquer tipo, já que \`v[i]\` é só uma abreviação de \`*(v + i)\`. E é também por isso que C não confere limites: \`v[10]\` num vetor de 4 elementos calcula um endereço e lê o que estiver lá, sem erro nenhum.

        Para que servem ponteiros?

        - **Para uma função mudar variáveis de quem a chamou.** C sempre passa cópias. \`troca(&x, &y)\` passa os endereços, e a função escreve neles com \`*a = *b\`.
        - **Para não copiar coisas grandes.** Passar um registro de 1 MB por endereço custa 8 bytes.
        - **Para memória dinâmica.** \`malloc\` devolve um ponteiro para o bloco que reservou.
        - **Para estruturas encadeadas.** O "próximo" de uma lista ligada e os filhos de uma árvore, do nível 3, são ponteiros.
      `),
      tip(`
        Em Python, nomes também são referências, só que opacas: não dá para somar 1 a uma referência nem apontar para o meio de um objeto. No CPython, \`id(x)\` devolve justamente o endereço do objeto na memória, mas isso é detalhe de implementação, não uma garantia da linguagem.
      `, 'E em Python?'),
      md(`
        ### malloc e free: o contrato
        - \`malloc(n)\` devolve o endereço de um bloco com **pelo menos** n bytes, alinhado para qualquer tipo (16 bytes na glibc em x86-64), com conteúdo **indefinido** (lixo do uso anterior), ou \`NULL\` se não conseguir. Ele não sabe o tipo: quem calcula os bytes é você, com \`sizeof\`.
        - \`calloc(n, tam)\` reserva n × tam bytes **zerados**. \`realloc(p, n)\` muda o tamanho e **pode mover** o bloco: depois dele, o endereço antigo não vale mais.
        - \`free(p)\` devolve o bloco. p precisa ser exatamente um endereço que veio de \`malloc\`, \`calloc\` ou \`realloc\` e que ainda não foi liberado; \`free(NULL)\` não faz nada.
        - Depois do \`free\`, a variável p **continua** guardando o mesmo endereço. Ninguém a apaga; o bloco é que deixou de ser seu.
      `),
      code('text', `
        #include <stdio.h>
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
        }
      `, 'sizeof *notas é o tamanho de um elemento (4 bytes). Se o tipo de notas mudar para double, a conta continua certa sem mexer nessa linha.'),
      md(`
        ### Por dentro do alocador
        O heap é um grande vetor de bytes, e o alocador é uma estrutura de dados em cima dele. O problema que ele resolve: atender pedidos de tamanhos variados, em qualquer ordem, desperdiçando pouco e respondendo depressa.

        - **Cabeçalho.** \`free(p)\` recebe só o endereço e mesmo assim sabe quantos bytes devolver. O truque: o alocador guarda o tamanho do bloco num {{cabeçalho|header}} logo antes do endereço que entrega. Na glibc em x86-64, são os 8 bytes imediatamente anteriores a p.
        - **Lista livre.** Os blocos livres ficam numa {{lista livre|free list}}. Num \`malloc(n)\`, a política decide qual usar: o **primeiro que couber** (*first fit*), o que couber **mais justo** (*best fit*) ou o próximo que couber a partir de onde a última busca parou (*next fit*).
        - **Divisão.** Se o bloco escolhido é maior que o pedido, ele é dividido: uma parte é entregue, o resto continua livre.
        - **Coalescência.** No \`free\`, se o vizinho da esquerda ou o da direita também estiver livre, os blocos se juntam num só. Sem {{coalescência|coalescing}}, o heap vira um monte de pedacinhos.
      `),
      {
        type: 'table',
        head: ['', 'Fragmentação interna', 'Fragmentação externa'],
        rows: [
          ['O que é', 'espaço desperdiçado dentro de um bloco entregue', 'espaço livre entre blocos, em pedaços pequenos demais'],
          ['Causa', 'cabeçalho, alinhamento, arredondamento para tamanhos padrão', 'pedidos e liberações de tamanhos variados, sem coalescência ou com azar na ordem'],
          ['Exemplo', 'malloc(1) ocupa 32 bytes na glibc em x86-64', '50 bytes livres no total, em dois pedaços de 25, e um pedido de 40 falha'],
        ],
        caption: 'A fragmentação interna também é chamada assim em inglês: internal fragmentation; a externa, external fragmentation.',
      },
      md(`
        Alocadores reais combinam essas ideias com outras. A glibc separa os blocos livres em listas por faixa de tamanho, mantém um cache por thread (o *tcache*) que entrega primeiro o último bloco liberado de cada tamanho e atende pedidos grandes (a partir de 128 KiB por padrão, limite que ela ajusta durante a execução) com \`mmap\`, direto do SO. Alternativas conhecidas são o jemalloc, o tcmalloc e o mimalloc. O heap cresce pedindo memória ao SO (com \`brk\` ou \`mmap\`), e um \`free\` nem sempre devolve essa memória ao SO: é normal o uso de memória de um processo não cair logo depois de ele liberar muita coisa.
      `),
      deep(`
        Um \`malloc\` de 1 GB costuma voltar na hora, mesmo numa máquina com pouca RAM livre. O SO só reservou **endereços**: as páginas físicas aparecem uma a uma, na primeira vez que cada página é tocada, por meio de faltas de página que o SO atende entregando um quadro zerado (a paginação sob demanda da lição anterior). Com a configuração padrão de *overcommit* do Linux, o SO pode prometer mais memória do que tem; se todo mundo resolver usar a promessa ao mesmo tempo, o *OOM killer* escolhe um processo e o encerra. Num servidor, "o malloc não devolveu NULL" não quer dizer "a memória existe".
      `, 'O malloc que nunca falha'),
      md(`
        ### Os bugs clássicos
        O padrão da linguagem C chama de {{comportamento indefinido|undefined behavior}} tudo o que vem a seguir: ele não diz o que acontece, e o compilador pode otimizar o código supondo que nunca acontece. Na prática, o programa pode parecer funcionar no seu computador, quebrar em produção ou virar porta de entrada para um ataque.

        Um ponteiro para memória já liberada, ou para um frame que já saiu da pilha, é um {{ponteiro pendurado|dangling pointer}}; usá-lo é um {{uso após liberação|use-after-free}}. Escrever além do fim de um vetor é um {{estouro de buffer|buffer overflow}}: na pilha, ele pode alcançar o endereço de retorno da função, e quem controla os bytes escritos passa a controlar para onde o programa salta.
      `),
      {
        type: 'table',
        head: ['Bug', 'Como aparece no código', 'O que acontece', 'Quem denuncia'],
        rows: [
          ['vazamento (memory leak)', 'malloc sem free, ou o último ponteiro para o bloco sobrescrito', 'a memória do processo só cresce; num servidor que roda por semanas, acaba no OOM killer', 'Valgrind ("definitely lost"), LeakSanitizer'],
          ['double free', 'free(p); ... free(p);', 'corrompe as listas do alocador; a glibc costuma abortar com "free(): double free detected in tcache 2"', 'a própria glibc (nem sempre), ASan ("attempting double-free")'],
          ['use-after-free', 'free(p); e depois p->saldo = 0;', 'o bloco pode já ter sido entregue a outro malloc: você lê ou altera dados de outro objeto', 'ASan ("heap-use-after-free"), Valgrind ("Invalid read"), gcc -Wall em casos simples'],
          ['estouro de buffer', 'char nome[8]; strcpy(nome, "Maria Aparecida");', 'escreve 16 bytes num espaço de 8 e sobrescreve os vizinhos', 'ASan ("stack-buffer-overflow"), proteção de pilha ("*** stack smashing detected ***")'],
          ['ponteiro para local que morreu', 'int *f(void) { int x = 5; return &x; }', 'o frame de f foi descartado; a próxima chamada reaproveita aquele pedaço da pilha', 'gcc -Wall ("function returns address of local variable")'],
          ['leitura não inicializada', 'usar um bloco de malloc antes de escrever nele', 'lixo do uso anterior; resultados que mudam de uma execução para outra', 'Valgrind ("uninitialised value"), MemorySanitizer'],
        ],
        caption: 'As mensagens entre aspas são as que essas ferramentas imprimem de fato (gcc e glibc no Ubuntu 24.04).',
      },
      md(`
        Nenhum desses erros dá mensagem garantida em C puro. Por isso, ninguém escreve C sério sem ferramentas:

        - \`gcc -Wall -Wextra\`: avisos do compilador. Pegam parte dos erros sem nem rodar o programa.
        - \`gcc -g -fsanitize=address prog.c\`: o **AddressSanitizer** (ASan) instrumenta cada acesso, deixa uma zona proibida em volta de cada bloco e põe os blocos liberados em **quarentena** antes de reaproveitá-los. Deixa o programa cerca de 2 vezes mais lento: é para testes e CI, não para produção.
        - \`valgrind --leak-check=full ./prog\`: roda o programa num processador simulado conferindo cada acesso, sem recompilar. É bem mais lento (de 20 a 30 vezes, segundo a documentação), mas é ótimo para achar vazamentos.

        ### E o Python?
        O CPython é escrito em C e chama o \`malloc\` e o \`free\` por você. Cada objeto carrega uma **contagem de referências**: \`b = a\` soma 1, o fim de uma variável local subtrai 1, e quando a contagem chega a zero o objeto é liberado na hora. Referências em ciclo (um objeto que aponta para outro que aponta de volta) nunca chegam a zero sozinhas; para elas existe o coletor de ciclos do módulo \`gc\`. Objetos pequenos (até 512 bytes) vêm de um alocador próprio, o *pymalloc*, que pede memória ao sistema em pedaços grandes e os reparte.

        Em Python puro não dá para fazer double free nem use-after-free: não existe \`free\`, e um objeto só some quando ninguém mais o alcança. Vazamento ainda existe, de outro tipo: um dict usado como cache que só cresce, ou uma lista global que acumula requisições, mantém os objetos alcançáveis para sempre. Rust tenta o meio-termo: memória sem coletor de lixo, mas com regras de posse (*ownership*) que o compilador confere, recusando, em código seguro (sem \`unsafe\`), programas com use-after-free ou double free.
      `),
    ],
    exemplo: [
      md(`
        Um heap de brinquedo com 100 bytes, endereços de 0 a 99, e um alocador **primeiro que couber**, com divisão e coalescência. Para simplificar, ignore cabeçalhos e alinhamento: \`malloc(20)\` ocupa exatamente 20 bytes. Os blocos livres aparecem como [início, fim), com o fim de fora.
      `),
      {
        type: 'table',
        head: ['Passo', 'Operação', 'O que acontece', 'Blocos livres depois'],
        rows: [
          ['0', '—', 'heap vazio', '[0, 100)'],
          ['1', 'a = malloc(20)', 'a = 0; o bloco livre é dividido', '[20, 100)'],
          ['2', 'b = malloc(30)', 'b = 20', '[50, 100)'],
          ['3', 'c = malloc(10)', 'c = 50', '[60, 100)'],
          ['4', 'free(b)', 'os vizinhos de b (a e c) estão ocupados: nada a juntar', '[20, 50), [60, 100)'],
          ['5', 'd = malloc(40)', '[20, 50) tem só 30 bytes; o primeiro que cabe é [60, 100), usado inteiro', '[20, 50)'],
          ['6', 'free(a)', '[0, 20) encosta em [20, 50): coalescência', '[0, 50)'],
          ['7', 'e = malloc(45)', 'e = 0', '[45, 50)'],
        ],
        caption: 'No fim: e ocupa [0, 45), c ocupa [50, 60) e d ocupa [60, 100). Sobram 5 bytes livres.',
      },
      md(`
        Agora refaça o passo 6 **sem** coalescência: os livres ficam [0, 20) e [20, 50), dois pedaços que somam 50 bytes, e o \`malloc(45)\` do passo 7 **falha**, porque nenhum pedaço sozinho tem 45 bytes. Isso é {{fragmentação externa|external fragmentation}}. Repare também no passo 5: com *best fit* o resultado seria o mesmo, porque só um bloco servia. A diferença entre as políticas aparece quando vários blocos servem.

        **Use-after-free na prática.** Agora o reaproveitamento. O tcache da glibc entrega primeiro o último bloco liberado de cada tamanho, então o programa abaixo recebe o **mesmo** bloco duas vezes:
      `),
      code('text', `
        int *conta = malloc(sizeof *conta);
        *conta = 100;                         // saldo da conta
        free(conta);                          // conta ainda guarda o endereço antigo
        int *senha = malloc(sizeof *senha);   // o alocador entrega o MESMO bloco
        *senha = 4321;
        printf("%d\\n", *conta);               // use-after-free
      `, 'Compilado com gcc -O0 no Linux, imprime 4321 (e o gcc -Wall ainda avisa: "pointer \'conta\' used after \'free\'"). Com -O2, no mesmo computador, imprimiu um número sem sentido: é comportamento indefinido.'),
      md(`
        O ponteiro velho agora enxerga o dado de outro objeto. Se o código ainda **escrevesse** por \`conta\` ("zerar o saldo"), apagaria a senha. É esse reaproveitamento previsível que torna o use-after-free explorável: o atacante libera um objeto, faz o programa alocar no lugar um dado que ele controla e espera o ponteiro velho ser usado. Por isso o ASan segura os blocos liberados em quarentena antes de reaproveitá-los.
      `),
    ],
    codigo: [
      py(`
        import struct

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
        print("bytes do saldo:", list(memoria[saldo:saldo + TAM_INT]))
      `, { caption: 'A memória como um vetor de bytes e ponteiros como números. Em C o compilador multiplica por sizeof sozinho; aqui, como num char *, a conta é sua. O -1 em complemento de dois são quatro bytes 255.' }),
      py(`
        import struct

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
        print("senha agora:", le(senha))   # ...apagou a senha
      `, { caption: 'Um alocador que reaproveita o último bloco liberado de cada tamanho, como o tcache. Troque a ordem (aloque senha antes do free) e veja o problema sumir: o bug depende da sequência, por isso aparece "de vez em quando".' }),
      english(`
        Mensagens reais que você vai encontrar: **free(): double free detected in tcache 2** (glibc abortando o programa), **ERROR: AddressSanitizer: heap-use-after-free on address 0x...** e **definitely lost: 1,200 bytes in 3 blocks** (resumo de vazamentos do Valgrind). Em code review: *"This pointer is still used after free(); set it to NULL or restructure the ownership."*
      `),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e8-ptr-1',
          kind: 'mcq',
          prompt: 'Neste trecho de C, onde ficam o ponteiro `v` e o bloco para o qual ele aponta?',
          code: {
            lang: 'text',
            code: dedent(`
              int visitas = 0;

              void registra(int n) {
                  int *v = malloc(n * sizeof *v);
                  /* ... usa v ... */
                  free(v);
              }
            `),
          },
          difficulty: 'facil',
          skills: ['so-memoria'],
          hints: [
            'São duas coisas diferentes: uma variável que guarda um endereço e os bytes que estão naquele endereço. Quem criou cada uma?',
            'Onde moram as variáveis declaradas dentro de uma função? E de onde vem a memória que malloc devolve?',
          ],
          explanation: '`v` é uma variável local de `registra`: mora no frame da função, na **pilha**, e some quando a função retorna. O bloco de n inteiros vem do `malloc`, no **heap** (ou num mapeamento próprio, se for muito grande), e vive até o `free`, independentemente da função. Esquecer o `free` aqui vazaria o bloco: a variável `v` desaparece no retorno, mas o bloco continua reservado, sem ninguém que saiba o endereço dele. `visitas`, global, mora na região de dados (BSS, por ser zerada).',
          options: [
            { text: '`v` na pilha; o bloco no heap', correct: true, feedback: 'Isso. A variável que guarda o endereço é local; os bytes vieram do alocador e vivem até o free.' },
            { text: 'Os dois no heap, porque v foi criado com malloc', feedback: 'O malloc cria o bloco, não a variável. v é uma variável local comum, de 8 bytes, que guarda o endereço que o malloc devolveu.' },
            { text: 'Os dois na pilha, porque foram criados dentro da função', feedback: '"Dentro da função" decide onde mora a variável v, não o bloco. O bloco do malloc continua existindo depois do retorno; se morasse na pilha, seria descartado junto com o frame.' },
            { text: 'v na região de dados, junto com visitas; o bloco no heap', feedback: 'Na região de dados ficam as variáveis globais e static, como visitas. v é local e não é static: mora no frame de registra, na pilha.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e8-ptr-2',
          kind: 'predict',
          lang: 'python',
          prompt: 'Este alocador de brinquedo reaproveita o último bloco liberado de cada tamanho, como o tcache da glibc. O que o programa imprime?',
          difficulty: 'intermediario',
          skills: ['so-memoria'],
          hints: [
            'Anote o valor de topo depois de cada malloc que não reaproveita nada.',
            'Depois dos dois free, como está a pilha de endereços de tamanho 16? Qual sai primeiro?',
            'O pedido de 32 bytes pode reaproveitar um bloco de 16?',
          ],
          explanation: 'a, b e c saem do topo: 0, 16 e 32 (topo vai a 64). Os dois free empilham 0 e depois 16 na lista de tamanho 16. d pede 16 e recebe o último liberado, 16 (o antigo b). e pede 32: não há bloco livre de 32, então sai do topo, 64. f pede 16 e recebe 0 (o antigo a). Se o código ainda usasse o ponteiro b, estaria mexendo nos dados de d: é o use-after-free da lição. E repare que blocos de tamanhos diferentes não se misturam: o 32 não aproveitou os blocos de 16 livres, nem que fossem vizinhos.',
          code: dedent(`
            livres = {}
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
            print(d, e, f)
          `),
          answer: '0 16 32\n16 64 0',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e8-ptr-3',
          kind: 'fill',
          lang: 'text',
          prompt: dedent(`
            Complete o padrão de memória dinâmica em C: reservar espaço para \`n\` valores \`double\` sem escrever o tipo duas vezes, tratar a falta de memória, devolver o bloco e não deixar um ponteiro pendurado.
          `),
          difficulty: 'facil',
          skills: ['so-memoria'],
          hints: [
            'malloc conta em bytes. Qual operador dá o tamanho de um elemento, e como escrevê-lo a partir da própria variável?',
            'O que malloc devolve quando não consegue reservar a memória?',
            'Depois de devolver o bloco, que valor deixa claro que o ponteiro não aponta para nada?',
          ],
          explanation: '`malloc(n * sizeof *precos)` pede n vezes o tamanho de um elemento; escrever `sizeof *precos` em vez de `sizeof(double)` mantém a conta certa se o tipo mudar. malloc devolve `NULL` quando falha, e usar esse NULL depois seria comportamento indefinido. `free` devolve o bloco, e `precos = NULL` evita que um uso posterior leia memória que já não é sua: desreferenciar NULL falha na hora (segfault), enquanto um ponteiro pendurado pode "funcionar" e corromper dados em silêncio.',
          template: dedent(`
            double *precos = malloc(n * ___);
            if (precos ___ NULL) {
                return -1;
            }
            /* ... usa precos[0] até precos[n - 1] ... */
            ___(precos);
            precos = ___;
          `),
          blanks: [
            ['sizeof *precos', 'sizeof(*precos)', 'sizeof (*precos)', 'sizeof(double)', 'sizeof (double)'],
            ['=='],
            ['free'],
            ['NULL'],
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e8-ptr-4',
          kind: 'fix',
          lang: 'python',
          prompt: dedent(`
            Um sensor de uma câmara fria grava temperaturas como \`int\` de C: 4 bytes cada, little-endian, com sinal, uma depois da outra, num \`bytearray\` (é um vetor de \`int\` visto como bytes). \`le_vetor(memoria, base, n)\` deveria devolver a lista com os n inteiros que começam no endereço \`base\`, mas devolve números absurdos. Corrija.

            Os formatos de \`struct\` que importam aqui: \`"<i"\` é um inteiro de 4 bytes **com** sinal, little-endian; \`"<I"\` é o mesmo **sem** sinal.
          `),
          difficulty: 'intermediario',
          skills: ['so-memoria'],
          hints: [
            'Rode com o vetor [5, -3] gravado no endereço 0. Em qual endereço o código procura o segundo elemento? Em qual ele está?',
            'Em C, p + i avança i elementos. Quantos bytes isso dá quando cada elemento tem 4 bytes?',
            'Corrigido o endereço, sobra um número enorme no lugar de -3. Como os bytes de um número negativo são lidos se o formato diz que não há sinal?',
          ],
          explanation: 'Dois erros, os dois sobre o **tipo** do ponteiro. Primeiro, o passo: num vetor de int, o elemento i está em base + i × 4. Em C, `p + i` multiplica por sizeof sozinho; com a memória vista como bytes (um `char *`, ou um bytearray), a multiplicação é sua. Segundo, a interpretação: os mesmos 4 bytes FD FF FF FF são -3 lidos como `int` e 4 294 967 293 lidos como `unsigned int`. O tipo de um ponteiro decide quantos bytes andar e como ler o que está lá.',
          starter: dedent(`
            import struct

            def le_vetor(memoria, base, n):
                valores = []
                for i in range(n):
                    endereco = base + i            # o elemento i do vetor
                    valores.append(struct.unpack_from("<I", memoria, endereco)[0])
                return valores
          `),
          solution: dedent(`
            import struct

            def le_vetor(memoria, base, n):
                valores = []
                for i in range(n):
                    endereco = base + i * 4        # o elemento i do vetor: i * sizeof(int) bytes depois
                    valores.append(struct.unpack_from("<i", memoria, endereco)[0])
                return valores
          `),
          tests: [
            {
              name: 'vetor no início da memória',
              code: dedent(`
                import struct
                m = bytearray(struct.pack("<3i", 4, 7, 2))
                r = le_vetor(m, 0, 3)
                assert r == [4, 7, 2], f"esperado [4, 7, 2], veio {r}: o elemento i está i * 4 bytes depois do início"
              `),
            },
            {
              name: 'temperaturas negativas',
              code: dedent(`
                import struct
                m = bytearray(struct.pack("<4i", 5, -3, -18, 0))
                r = le_vetor(m, 0, 4)
                assert r == [5, -3, -18, 0], f"esperado [5, -3, -18, 0], veio {r}: o int de C tem sinal; os bytes de -3 lidos sem sinal viram 4294967293"
              `),
            },
            {
              name: 'vetor no meio da memória',
              code: dedent(`
                import struct
                m = bytearray(8) + bytearray(struct.pack("<3i", -1, 300, 7)) + bytearray(struct.pack("<i", 999))
                r = le_vetor(m, 8, 3)
                assert r == [-1, 300, 7], f"com base 8, esperado [-1, 300, 7], veio {r}"
                assert le_vetor(m, 12, 2) == [300, 7], "começando no endereço 12, o primeiro elemento é 300"
              `),
            },
            {
              name: 'bordas: n = 0 e n = 1',
              code: dedent(`
                import struct
                m = bytearray(struct.pack("<2i", 42, -42))
                assert le_vetor(m, 0, 0) == [], "com n = 0, devolva a lista vazia"
                assert le_vetor(m, 4, 1) == [-42], "um elemento só, no endereço 4: -42"
              `),
            },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e8-ptr-5',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Escreva \`diagnostico(eventos)\`, um mini-Valgrind. \`eventos\` é a lista, em ordem, do que um programa C fez com a memória, usando endereços inteiros:

            - \`("malloc", p)\`: o alocador entregou o bloco que começa em p. Pode ser um endereço reaproveitado, liberado antes; o alocador nunca entrega um bloco que ainda está em uso.
            - \`("free", p)\`: o programa chamou \`free(p)\`.
            - \`("usa", p)\`: o programa leu ou escreveu no bloco que começa em p.

            Devolva a tupla \`(erros, vazamentos)\`:

            - \`erros\`: lista de pares \`(i, tipo)\` na ordem dos eventos, em que i é a posição do evento na lista (começando em 0) e tipo é \`"double-free"\` (free de um endereço já liberado), \`"invalid-free"\` (free de um endereço que nunca veio de malloc), \`"use-after-free"\` (uso de um endereço liberado) ou \`"invalid-access"\` (uso de um endereço que nunca veio de malloc);
            - \`vazamentos\`: lista **ordenada** dos endereços ainda alocados no fim.

            Um evento com erro não muda nada: um double free não "libera de novo".
          `),
          difficulty: 'intermediario',
          skills: ['so-memoria'],
          hints: [
            'Que estados um endereço pode ter ao longo do programa? Bastam dois conjuntos?',
            'Um endereço liberado e depois entregue de novo por malloc está em qual estado? Usá-lo é erro?',
            'Para separar "double-free" de "invalid-free", você precisa saber se o endereço já veio de malloc alguma vez.',
          ],
          explanation: 'Cada endereço está em um de três estados: nunca alocado, alocado ou liberado. `malloc` leva ao estado alocado (inclusive um endereço liberado antes: é o reaproveitamento), `free` de um alocado leva a liberado, e o resto é erro conforme o estado. Os vazamentos são os que terminam alocados. Repare na limitação: se o alocador reaproveita um endereço, um uso pelo ponteiro **velho** fica indistinguível de um uso pelo novo dono. Ferramentas reais contornam isso adiando o reaproveitamento (a quarentena do ASan) e acompanhando cada acesso byte a byte, não só o endereço inicial do bloco.',
          starter: dedent(`
            def diagnostico(eventos):
                # devolva (erros, vazamentos)
                # erros: lista de (indice, tipo), tipo em "double-free", "invalid-free", "use-after-free", "invalid-access"
                # vazamentos: lista ordenada dos endereços ainda alocados no fim
                return [], []
          `),
          solution: dedent(`
            def diagnostico(eventos):
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
                return erros, sorted(alocados)
          `),
          tests: [
            {
              name: 'programa sem erros',
              code: dedent(`
                ev = [("malloc", 16), ("usa", 16), ("malloc", 48), ("usa", 48), ("free", 16), ("free", 48)]
                r = diagnostico(ev)
                assert r == ([], []), f"programa correto: esperado ([], []), veio {r}"
              `),
            },
            {
              name: 'os quatro erros e um vazamento',
              code: dedent(`
                ev = [
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
                assert vaz == [200], f"o bloco 200 nunca foi liberado: vazamentos deveria ser [200], veio {vaz}"
              `),
            },
            {
              name: 'endereço reaproveitado',
              code: dedent(`
                ev = [("malloc", 8), ("free", 8), ("malloc", 8), ("usa", 8), ("free", 8)]
                r = diagnostico(ev)
                assert r == ([], []), f"8 foi liberado e entregue de novo pelo malloc: usar e liberar de novo é legítimo. Esperado ([], []), veio {r}"
                ev = [("malloc", 8), ("free", 8), ("malloc", 8), ("free", 8), ("free", 8), ("usa", 8)]
                r = diagnostico(ev)
                assert r == ([(4, "double-free"), (5, "use-after-free")], []), f"depois do segundo ciclo malloc/free, o free do índice 4 é double free e o uso do índice 5 é use-after-free; veio {r}"
              `),
            },
            {
              name: 'erro não muda o estado',
              code: dedent(`
                ev = [("free", 5), ("usa", 5), ("malloc", 5), ("usa", 5)]
                r = diagnostico(ev)
                assert r == ([(0, "invalid-free"), (1, "invalid-access")], [5]), f"o free inválido não torna 5 'liberado': o uso seguinte é invalid-access. Depois do malloc, 5 é válido e termina vazado. Veio {r}"
                ev = [("malloc", 1), ("free", 1), ("free", 1), ("free", 1)]
                r = diagnostico(ev)
                assert r == ([(2, "double-free"), (3, "double-free")], []), f"cada free extra é um double free; veio {r}"
              `),
            },
            {
              name: 'vazamentos em ordem e lista vazia',
              code: dedent(`
                assert diagnostico([]) == ([], []), "sem eventos, devolva ([], [])"
                ev = [("malloc", 300), ("malloc", 20), ("malloc", 1000), ("malloc", 4), ("free", 1000)]
                erros, vaz = diagnostico(ev)
                assert erros == [], f"não há erros aqui; veio {erros}"
                assert vaz == [4, 20, 300], f"os vazamentos devem vir em ordem crescente de endereço: esperado [4, 20, 300], veio {vaz}"
              `),
            },
            {
              name: 'programas aleatórios',
              code: dedent(`
                import random

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
                    assert r == esperado, f"diagnostico({ev}) deu {r}, esperado {esperado}"
              `),
            },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e8-ptr-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Implemente o alocador do exemplo da lição: a classe \`Heap\`, com política **primeiro que couber**, divisão e coalescência. Como no exemplo, ignore cabeçalhos e alinhamento (o tamanho de cada bloco alocado pode ficar num dict à parte).

            - \`Heap(tamanho)\`: um heap com endereços de 0 a tamanho − 1, todo livre.
            - \`malloc(n)\` (n ≥ 1): entre os blocos livres com pelo menos n bytes, escolha o de **menor endereço**. Entregue os n primeiros bytes dele (o resto continua livre) e devolva o endereço inicial. Se nenhum bloco livre sozinho tiver n bytes, devolva \`None\`.
            - \`free(p)\`: p precisa ser o início de um bloco alocado e ainda não liberado; senão, levante \`ValueError\` sem mudar nada. O bloco volta a ser livre e se **junta** aos vizinhos livres da esquerda e da direita.
            - \`livres()\`: lista de tuplas \`(inicio, tamanho)\` dos blocos livres, em ordem de endereço. Como a coalescência é imediata, nunca há dois blocos livres encostados.
          `),
          difficulty: 'desafio',
          skills: ['so-memoria', 'ed-arrays'],
          hints: [
            'Que estruturas você precisa guardar? Os blocos alocados precisam ser achados pelo endereço inicial; os livres precisam ser percorridos em ordem de endereço.',
            'No malloc, o que sobra de um bloco livre maior que o pedido? Onde ele começa? E se o bloco tiver exatamente n bytes?',
            'No free, o bloco que volta tem um início e um fim. Como saber se existe um bloco livre que termina exatamente no início dele? E um que começa exatamente no fim dele?',
            'Se os dois vizinhos estiverem livres, quantos blocos livres devem sobrar depois da junção?',
          ],
          explanation: 'Os blocos livres ficam numa lista ordenada por endereço, e os alocados num dict início → tamanho (o papel do cabeçalho). O malloc percorre a lista e usa o primeiro que cabe: se sobra espaço, o bloco livre encolhe e passa a começar n bytes adiante; se não sobra, sai da lista. O free confere o dict (o que pega double free e free inválido de uma vez), acha a posição do bloco na lista ordenada (com bisect) e olha só os dois vizinhos: o anterior se junta se terminar exatamente onde o bloco começa; o seguinte, se começar exatamente onde o bloco termina. O malloc custa O(número de blocos livres), como num alocador de lista simples; alocadores reais usam listas separadas por tamanho para não percorrer tudo, e guardam o tamanho também no fim de cada bloco (*boundary tag*) para achar o vizinho da esquerda em O(1) sem lista ordenada.',
          starter: dedent(`
            class Heap:
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
                    return []
          `),
          solution: dedent(`
            import bisect

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
                    return list(self.livre)
          `),
          tests: [
            {
              name: 'o exemplo da lição',
              code: REF_HEAP + '\n' + dedent(`
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
                assert _livres_de(h) == [(45, 5)], f"esperado [(45, 5)]; veio {_livres_de(h)}"
              `),
            },
            {
              name: 'primeiro que couber, não o mais justo',
              code: REF_HEAP + '\n' + dedent(`
                h = Heap(100)
                a = h.malloc(30); b = h.malloc(10); c = h.malloc(20); d = h.malloc(10)
                h.free(a); h.free(c)
                assert _livres_de(h) == [(0, 30), (40, 20), (70, 30)], f"esperado [(0, 30), (40, 20), (70, 30)]; veio {_livres_de(h)}"
                x = h.malloc(15)
                assert x == 0, f"o primeiro bloco que cabe 15 bytes começa em 0 (o best fit escolheria o de 40); veio {x}"
                assert _livres_de(h) == [(15, 15), (40, 20), (70, 30)], f"esperado [(15, 15), (40, 20), (70, 30)]; veio {_livres_de(h)}"
                y = h.malloc(25)
                assert y == 70, f"só o bloco em 70 tem 25 bytes; veio {y}"
              `),
            },
            {
              name: 'coalescência dos dois lados e só de um',
              code: REF_HEAP + '\n' + dedent(`
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
                assert _livres_de(h2) == [(0, 20)], f"a foi liberado com o vizinho da DIREITA (b) livre: esperado [(0, 20)]; veio {_livres_de(h2)}"
              `),
            },
            {
              name: 'fragmentação: None sem mudar nada',
              code: REF_HEAP + '\n' + dedent(`
                h = Heap(50)
                a = h.malloc(25); b = h.malloc(25)
                assert h.malloc(1) is None, "o heap está cheio: malloc(1) deve devolver None"
                h.free(a)
                assert h.malloc(30) is None, "só há 25 bytes livres: malloc(30) deve devolver None"
                assert _livres_de(h) == [(0, 25)], f"um malloc que falha não muda nada; veio {_livres_de(h)}"
                h = Heap(60)
                xs = [h.malloc(10) for _ in range(6)]
                h.free(xs[1]); h.free(xs[3]); h.free(xs[5])
                assert h.malloc(20) is None, "há 30 bytes livres, mas em três pedaços de 10 que não se encostam: malloc(20) deve falhar (fragmentação externa)"
              `),
            },
            {
              name: 'free inválido e double free',
              code: REF_HEAP + '\n' + dedent(`
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
                h.free(c)
              `),
            },
            {
              name: 'sequências aleatórias',
              code: REF_HEAP + '\n' + dedent(`
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
                        assert _livres_de(h) == _faixas_livres(dono), f"Heap({tamanho}), depois de {historico}: livres() deu {_livres_de(h)}, esperado {_faixas_livres(dono)}"
              `),
            },
          ],
        },
      },
    ],
    revisao: [
      md(`
        - Espaço de endereçamento: texto (r-x), dados e BSS (globais), heap (malloc, cresce para cima), mapeamentos (bibliotecas, blocos grandes), pilha (frames, cresce para baixo). O meio é quase todo vazio, e o ASLR sorteia as posições.
        - Ponteiro = endereço com tipo. \`&x\` dá o endereço; \`*p\` segue o endereço; \`p + i\` anda i elementos (i × sizeof bytes); \`v[i]\` é \`*(v + i)\`, sem conferir limites.
        - \`malloc(n)\`: pelo menos n bytes, conteúdo indefinido, \`NULL\` se falhar. \`free(p)\`: só endereços vindos de malloc, uma vez só; depois dele, p fica pendurado.
        - Alocador: cabeçalho com o tamanho, lista livre, política (first fit, best fit), divisão e coalescência. Sem coalescência, fragmentação externa.
        - Bugs: vazamento, double free, use-after-free, estouro de buffer, ponteiro para local, leitura não inicializada. Todos são comportamento indefinido.
        - Ferramentas: \`-Wall\`, AddressSanitizer (\`-fsanitize=address\`) e Valgrind.
        - Python: contagem de referências + coletor de ciclos; sem free, mas ainda é possível vazar mantendo objetos alcançáveis.
      `),
      english(`
        - **address space / memory layout**: espaço de endereçamento / mapa de memória
        - **pointer, dereference, pointer arithmetic**: ponteiro, desreferenciar, aritmética de ponteiros
        - **allocator, free list, coalescing, fragmentation**: alocador, lista livre, coalescência, fragmentação
        - **memory leak, double free, use-after-free, buffer overflow, dangling pointer**
        - **undefined behavior (UB)**: comportamento indefinido
        - **memory safety / memory-safe language**: segurança de memória / linguagem com segurança de memória

        Frase típica de entrevista: *"A use-after-free happens when code keeps using a pointer after the memory was freed. The allocator may already have handed that block to another object, so reads return someone else's data and writes corrupt it. I'd catch it with AddressSanitizer in CI."*

        Frase típica de documentação (man page de malloc): *"The free() function frees the memory space pointed to by ptr, which must have been returned by a previous call to malloc() or related functions. Otherwise, or if ptr has already been freed, undefined behavior occurs. If ptr is NULL, no operation is performed."*
      `),
    ],
  },
  review: [
    ['Em que região do processo ficam: uma variável local, um bloco de malloc, uma variável global e o código de main?', 'Local: pilha. Bloco de malloc: heap (ou um mapeamento próprio, se for grande). Global: dados ou BSS. Código: segmento de texto.'],
    ['Se p é um int * que vale 1000 e sizeof(int) é 4, quanto vale p + 3? E v[i] equivale a quê?', '1012: a aritmética de ponteiros anda em elementos (3 × 4 bytes). v[i] é *(v + i).'],
    ['Como free(p) sabe quantos bytes liberar, se recebe só o endereço?', 'O alocador guardou o tamanho num cabeçalho logo antes do endereço que entregou.'],
    ['O que é coalescência, e que problema ela evita?', 'Juntar blocos livres vizinhos num só quando um deles é liberado. Evita a fragmentação externa: memória livre suficiente no total, mas em pedaços pequenos demais.'],
    ['Por que um use-after-free pode ler os dados de outro objeto?', 'Depois do free, o alocador pode entregar o mesmo bloco a outro malloc; o ponteiro velho passa a ler e escrever os dados do novo dono.'],
    ['Que ferramentas denunciam erros de memória em C?', 'Os avisos do compilador (gcc -Wall), o AddressSanitizer (compilar com -fsanitize=address) e o Valgrind (valgrind --leak-check=full).'],
    ['Como o CPython libera memória sem free, e que tipo de vazamento ainda é possível?', 'Contagem de referências (libera quando chega a zero) mais um coletor para ciclos. Ainda vaza quem mantém objetos alcançáveis sem precisar, como um cache que só cresce.'],
  ],
  references: ['cmu-15213', 'ostep', 'cs50', 'linux-man'],
});

/* ------------------------------------------------------------------ */
/* Lição 3: inodes, diretórios, links e journaling                     */
/* ------------------------------------------------------------------ */

const arquivos = lesson({
  id: 'l8-inodes-journaling',
  moduleId: 'm8-2',
  title: 'Sistemas de arquivos por dentro: inodes, diretórios, links e journaling',
  titleEn: 'File systems inside: inodes, directories, links and journaling',
  summary: 'Como um sistema de arquivos no estilo Unix acha os blocos de um arquivo com ponteiros diretos e indiretos (e extents), transforma um caminho num número de inode, por que hard links e links simbólicos se comportam de jeitos tão diferentes, quando o espaço de um arquivo apagado volta de fato, e como o journaling e o fsync protegem os dados de uma queda de energia.',
  minutes: 50,
  objectives: [
    'Dizer o que um inode guarda (e que o nome não está nele) e calcular o tamanho máximo de arquivo com ponteiros diretos e indiretos',
    'Localizar em qual ponteiro do inode está um byte de um arquivo',
    'Resolver um caminho componente por componente, como o kernel, inclusive com ".." e links simbólicos',
    'Diferenciar hard link e link simbólico e prever quando os blocos de um arquivo apagado são liberados',
    'Explicar por que uma queda de energia pode corromper o disco, como o journaling resolve e por que write() sem fsync não garante nada',
  ],
  skills: ['so-memoria'],
  terms: [
    t('bloco', 'block', 'Unidade de alocação do sistema de arquivos, de tamanho fixo (normalmente 4 KiB); o disco só conhece blocos numerados.'),
    t('inode', 'inode', 'Estrutura com os metadados de um arquivo (tipo, permissões, dono, tamanho, datas, contagem de links) e a localização dos seus blocos.', 'No space left on device can also mean the file system ran out of inodes: check df -i.'),
    t('número do inode', 'inode number', 'Identificador do inode, único dentro de um sistema de arquivos; aparece na primeira coluna de ls -i.'),
    t('ponteiro indireto', 'indirect pointer', 'Número de um bloco que não guarda dados, e sim mais números de bloco.'),
    t('extent', 'extent', 'Faixa contínua de blocos descrita por (início lógico, início físico, comprimento); usada pelo ext4, XFS e Btrfs no lugar de um ponteiro por bloco.'),
    t('entrada de diretório', 'directory entry', 'Par (nome, número do inode) guardado dentro de um diretório.'),
    t('contagem de links', 'link count', 'Quantas entradas de diretório apontam para um inode; o rm desconta 1.'),
    t('hard link', 'hard link', 'Uma entrada de diretório a mais para o mesmo inode: outro nome, mesmo arquivo.'),
    t('link simbólico', 'symbolic link (symlink)', 'Arquivo especial cujo conteúdo é um caminho, seguido durante a resolução; pode ficar pendurado.', 'Too many levels of symbolic links'),
    t('consistência após queda', 'crash consistency', 'Garantia de que as estruturas do disco continuam coerentes entre si mesmo se a energia acabar no meio de uma atualização.'),
    t('journaling', 'journaling', 'Técnica de gravar antes, num diário, a descrição da mudança, para refazê-la depois de uma queda.'),
    t('diário', 'journal', 'Área reservada do disco onde o journaling grava as transações antes de aplicá-las.'),
    t('checkpoint', 'checkpoint', 'Copiar as mudanças já confirmadas no diário para os lugares definitivos no disco.'),
    t('fsync', 'fsync', 'Chamada de sistema que só retorna depois que os dados e metadados de um arquivo chegaram ao armazenamento.', 'Call fsync() on the file and then on its parent directory to make a rename durable.'),
  ],
  stages: {
    conceito: [
      md(`
        O disco não sabe o que é um arquivo. Para ele só existem {{blocos|blocks}} numerados, de tamanho fixo, normalmente 4 KiB. Nomes, pastas, permissões e tamanhos são uma estrutura de dados que o **sistema de arquivos** (ext4, XFS, Btrfs, NTFS, APFS) monta em cima desses blocos. Ela precisa ser rápida para arquivos de 1 KB e de 100 GB, e precisa sobreviver a uma queda de energia no meio de uma gravação.

        A lição anterior resumiu tudo em uma frase: arquivo = inode + entrada de diretório, e o journaling protege contra quedas. Agora vamos abrir cada peça. Como um inode com espaço para 15 números de bloco localiza os milhões de blocos de um vídeo? Como \`/home/ana/notas.txt\` vira um número de inode? Por que apagar um log de 50 GB às vezes não libera espaço nenhum? E o que acontece no milissegundo em que a luz acaba enquanto o sistema da loja grava uma nota fiscal?
      `),
    ],
    explicacao: [
      md(`
        ### O que o inode guarda (e o que não guarda)
        Todo arquivo tem um **inode**, identificado por um {{número de inode|inode number}} único dentro daquele sistema de arquivos. Ele guarda:

        - o **tipo** (arquivo comum, diretório, link simbólico, dispositivo...) e as **permissões**;
        - o **dono** e o **grupo** (uid e gid);
        - o **tamanho** em bytes;
        - as **datas**: \`atime\` (último acesso), \`mtime\` (última mudança no conteúdo) e \`ctime\` (última mudança no **inode**, como trocar a permissão; não é a data de criação, que o ext4 guarda à parte e o \`stat\` mostra como *Birth*);
        - a {{contagem de links|link count}}: quantos nomes apontam para ele;
        - onde estão os **blocos de dados**.

        O que ele **não** guarda é o nome. O nome mora no diretório. É isso que permite a um arquivo ter dois nomes, ou nenhum.
      `),
      code('text', `
        $ ls -li notas.txt
        1679531 -rw-r--r-- 1 ana ana 5120 mar  1 18:02 notas.txt
        $ stat -c 'inode %i, %h link(s), %s bytes, %b unidades de %B bytes' notas.txt
        inode 1679531, 1 link(s), 5120 bytes, 16 unidades de 512 bytes
      `, 'A primeira coluna do ls -li é o número do inode; o número logo depois das permissões é a contagem de links. Os 5 120 bytes ocupam 2 blocos de 4 KiB, que o stat conta em unidades de 512 bytes: 16.'),
      md(`
        ### Do byte ao bloco: ponteiros diretos e indiretos
        No ext2 e no ext3 (e no sistema de arquivos clássico do Unix, de onde a ideia vem), o inode tem 15 números de bloco:

        - 12 **diretos**: cada um aponta para um bloco de dados;
        - 1 **indireto simples**: aponta para um bloco cheio de números de bloco, cada um apontando para dados;
        - 1 **indireto duplo**: aponta para um bloco de números de blocos de números de bloco;
        - 1 **indireto triplo**: mais um nível.

        Um {{ponteiro indireto|indirect pointer}} aponta para um bloco que não guarda dados, e sim mais ponteiros. Com blocos de 4 KiB e números de bloco de 4 bytes, cada um desses blocos guarda 4096 / 4 = 1024 números.
      `),
      {
        type: 'table',
        head: ['Ponteiro', 'Blocos de dados alcançados', 'Bytes (blocos de 4 KiB)', 'Leituras extras até o dado'],
        rows: [
          ['12 diretos', '12', '48 KiB', '0'],
          ['indireto simples', '1024', '4 MiB', '1'],
          ['indireto duplo', '1024² = 1 048 576', '4 GiB', '2'],
          ['indireto triplo', '1024³ ≈ 1,07 bilhão', '4 TiB', '3'],
        ],
        caption: 'Somando tudo, pouco mais de 4 TiB. No ext3 real, outro campo do inode (a contagem de setores de 512 bytes, de 32 bits) limita o arquivo a 2 TiB antes disso. As leituras extras são dos blocos de ponteiros, que ficam no cache da memória depois do primeiro acesso.',
      },
      md(`
        Por que um formato tão desequilibrado? Porque a maioria dos arquivos é pequena: um arquivo de até 48 KiB é localizado só com o inode, sem nenhuma leitura extra. Arquivos grandes são poucos, e para eles uma ou duas leituras a mais pesam pouco perto do tamanho da transferência.

        Para achar o byte na posição \`pos\` de um arquivo:

        1. bloco lógico: \`b = pos // 4096\` (o deslocamento dentro do bloco é \`pos % 4096\`, como na paginação);
        2. se \`b < 12\`: é o ponteiro direto número b;
        3. senão, desconte 12; se o que sobrou é menor que 1024, é essa posição dentro do bloco indireto simples;
        4. senão, desconte 1024; se o que sobrou é menor que 1024², use o indireto duplo: a entrada \`b // 1024\` no primeiro nível e \`b % 1024\` no segundo;
        5. senão, desconte 1024² e use o triplo, com três índices.

        É a mesma ideia da tabela de páginas em vários níveis da lição anterior: uma árvore rasa e larga, em que cada nível escolhe um entre 1024 filhos.
      `),
      deep(`
        Um ponteiro por bloco desperdiça espaço em arquivos grandes: um vídeo de 1 GiB gravado em sequência precisa de 262 144 números de bloco, quase todos consecutivos. O ext4 (e também o XFS e o Btrfs) usa {{extents|extents}}: cada extent diz "a partir do bloco lógico L, N blocos seguidos, começando no bloco físico F". No ext4, um extent cobre até 32 768 blocos (128 MiB com blocos de 4 KiB), e o inode tem espaço para 4 extents; com mais que isso, o ext4 monta uma pequena árvore de extents. Aquele vídeo, se o disco tiver espaço contíguo, precisa de só 8 extents. O ext4 continua lendo arquivos com ponteiros indiretos, herdados do ext3.
      `, 'Extents: a versão moderna'),
      md(`
        ### Diretórios: uma tabela de nome para inode
        Um diretório é um arquivo cujo conteúdo é uma lista de {{entradas de diretório|directory entries}}: pares (nome, número do inode). Todo diretório tem duas entradas especiais: \`.\` (ele mesmo) e \`..\` (o diretório pai). O diretório raiz tem um número conhecido de antemão (no ext2/3/4, o inode 2), e o \`..\` da raiz aponta para ela mesma.

        Abrir \`/home/ana/notas.txt\` é uma busca componente por componente, que o kernel chama de *path resolution*:

        1. comece no inode 2, a raiz (um caminho sem \`/\` no início começa no diretório de trabalho do processo);
        2. leia esse diretório e procure \`home\`: o inode 12, digamos;
        3. confira que o 12 é um diretório (e que você tem permissão para atravessá-lo) e procure \`ana\` dentro dele;
        4. repita até o último nome, que dá o inode do arquivo.

        Cada componente custa uma busca num diretório, por isso o Linux guarda as traduções recentes num cache de entradas de diretório, o *dcache*. E, por causa das entradas \`..\`, a contagem de links de um diretório é 2 + o número de subdiretórios: o nome dele no pai, o \`.\` dentro dele e um \`..\` em cada filho.

        ### Hard links e links simbólicos
        \`ln notas.txt copia.txt\` cria um {{hard link|hard link}}: uma nova entrada de diretório com o **mesmo** número de inode. A contagem de links vai a 2, e não existe "original" e "cópia": são dois nomes iguais para o mesmo arquivo. Mudar o conteúdo por um nome muda pelo outro.

        \`rm\` não apaga o arquivo: ele chama \`unlink\`, que remove **um nome** e desconta 1 da contagem. Os blocos só são liberados quando duas coisas valem ao mesmo tempo: a contagem chegou a zero **e** nenhum processo está com o arquivo aberto. Um arquivo aberto mantém o inode vivo mesmo sem nome nenhum.

        \`ln -s /home/ana/notas.txt atalho\` cria um {{link simbólico|symbolic link}}: um inode **novo**, do tipo link, cujo conteúdo é o texto de um caminho. Durante a resolução, quando o kernel encontra um link simbólico, ele continua a busca pelo caminho guardado ali.
      `),
      {
        type: 'table',
        head: ['', 'Hard link', 'Link simbólico'],
        rows: [
          ['O que é', 'outra entrada de diretório para o mesmo inode', 'um inode próprio cujo conteúdo é um caminho'],
          ['No ls -l aparece como', 'arquivo comum, com contagem de links maior que 1', 'atalho -> /home/ana/notas.txt'],
          ['Pode apontar para outro sistema de arquivos?', 'não: um número de inode só vale dentro do seu sistema de arquivos', 'sim'],
          ['Pode apontar para um diretório?', 'não ("hard link not allowed for directory"), para a árvore não ganhar ciclos', 'sim'],
          ['Se o alvo for apagado', 'nada muda: o inode continua vivo pelo outro nome', 'o link fica pendurado: "No such file or directory"'],
          ['Caminho relativo', '—', 'resolvido a partir do diretório onde o link está, não de onde você está'],
          ['Uso típico', 'backups incrementais que repetem arquivos sem copiá-los (rsync --link-dest)', '/usr/bin/python3 -> python3.12, sites-enabled do nginx, trocar de versão de uma vez'],
        ],
      },
      md(`
        Links simbólicos podem formar ciclos (a → b → a). Para não rodar para sempre, o Linux segue no máximo 40 links simbólicos numa mesma resolução de caminho; o 41º dá o erro \`ELOOP\`: "Too many levels of symbolic links". E um detalhe que confunde muita gente: \`..\` depois de um link simbólico para diretório leva ao pai **físico** do alvo. Se \`/atalho\` aponta para \`/home/ana\`, \`ls /atalho/..\` lista \`/home\`, e não \`/\`. O \`cd ..\` do bash é uma exceção de propósito: por padrão, ele volta pelo caminho que você digitou.
      `),
      warn(`
        Apagar um log gigante que um servidor ainda está escrevendo não libera espaço: o \`rm\` tirou o nome, mas o processo mantém o arquivo aberto. O \`df\` continua mostrando o disco cheio, e o \`du\`, que só soma o que tem nome, não acha os gigabytes. \`lsof +L1\` lista os arquivos abertos com contagem de links zero. Para esvaziar o arquivo sem fechá-lo, trunque em vez de apagar (\`truncate -s 0 app.log\`), ou reinicie o processo.
      `, 'O disco cheio que o du não explica'),
      md(`
        ### Quando a luz acaba no meio da gravação
        Acrescentar um bloco a um arquivo exige gravar **três** estruturas em lugares diferentes do disco: o bloco de dados novo, o inode (com o ponteiro novo e o tamanho novo) e o mapa de bits dos blocos livres (marcando o bloco como usado). O disco grava uma coisa de cada vez, e a energia pode acabar entre duas gravações. O resultado depende do que chegou ao disco:
      `),
      {
        type: 'table',
        head: ['Chegou ao disco', 'Estado depois da queda'],
        rows: [
          ['só o bloco de dados', 'consistente: é como se a gravação não tivesse acontecido (o dado se perdeu, mas nada aponta para ele)'],
          ['só o inode', 'o inode aponta para um bloco com lixo, e o mapa diz que esse bloco está livre: ele pode ser entregue a outro arquivo'],
          ['só o mapa de bits', 'vazamento de espaço: um bloco marcado como usado que ninguém usa'],
          ['inode e mapa, sem os dados', 'estrutura consistente, mas o arquivo mostra lixo no lugar do conteúdo novo'],
          ['inode e dados, sem o mapa', 'inode e mapa discordam: de novo, o bloco pode ser entregue a outro arquivo'],
          ['mapa e dados, sem o inode', 'bloco ocupado que ninguém aponta: vazamento, e o dado novo se perdeu'],
        ],
        caption: 'Os seis casos de uma queda no meio de um acréscimo (OSTEP, capítulo 42). Do ponto de vista da estrutura, só o primeiro e o quarto ficam consistentes, e o quarto ainda mostra lixo para o usuário.',
      },
      md(`
        A solução antiga era o \`fsck\`: depois de uma queda, varrer o disco **inteiro** conferindo inodes, mapas e diretórios. Funciona, mas o tempo é proporcional ao tamanho do disco, não ao tamanho da mudança: num disco de vários terabytes, horas de máquina parada por causa de uma gravação de 4 KiB.

        O **journaling** usa a ideia do *write-ahead log* dos bancos de dados (o log que garante a durabilidade do COMMIT, do nível 7): **antes** de mexer nos lugares definitivos, descreva a mudança num {{diário|journal}}, uma área reservada do disco.

        1. **Gravar a transação no diário**: um marcador de início, as versões novas dos blocos (inode, mapa, dados) e, só depois que tudo isso estiver no disco, um marcador de **commit**.
        2. **{{Checkpoint|checkpoint}}**: copiar os blocos para os lugares definitivos.
        3. **Liberar** a transação no diário, para o espaço ser reaproveitado.

        Na volta de uma queda, a **recuperação** lê o diário: transações com commit são **refeitas** (*replay*), copiando os blocos de novo para os lugares definitivos; transações sem commit são **ignoradas**, como se nunca tivessem começado. Refazer é seguro mesmo que o checkpoint já tivesse acontecido em parte, porque gravar o mesmo conteúdo duas vezes dá o mesmo resultado. A recuperação custa o tamanho do diário (segundos), não o do disco.
      `),
      {
        type: 'table',
        head: ['Modo no ext3/ext4 (opção data=)', 'O que passa pelo diário', 'Depois de uma queda'],
        rows: [
          ['data=journal', 'metadados e dados', 'o mais seguro; tudo é gravado duas vezes, então é o mais lento'],
          ['data=ordered (o padrão)', 'só os metadados, mas os blocos de dados são gravados no lugar definitivo antes do commit dos metadados', 'um inode nunca aponta para um bloco com lixo; uma sobrescrita no meio de um arquivo ainda pode ficar pela metade'],
          ['data=writeback', 'só os metadados, sem ordem em relação aos dados', 'a estrutura fica consistente, mas um arquivo pode mostrar dados velhos ou lixo'],
        ],
      },
      deep(`
        Por que o commit vem separado, só depois do resto? Os discos reordenam gravações para ganhar desempenho. Se o marcador de commit chegasse antes dos blocos, a recuperação refaria uma transação "confirmada" com lixo dentro. Por isso o sistema de arquivos espera o disco confirmar a primeira etapa (com um *flush* do cache do disco) antes de gravar o commit. O ext4 também pode gravar uma soma de verificação (*checksum*) da transação junto do commit; se a soma não bater, a recuperação descarta a transação.

        Outra família evita o problema por outro caminho: sistemas **copy-on-write**, como Btrfs, ZFS e APFS, nunca sobrescrevem um bloco em uso. Gravam as versões novas em lugares livres e, no fim, trocam um único ponteiro na raiz da árvore, de forma atômica. Antes da troca vale a versão antiga inteira; depois, a nova inteira.
      `, 'O commit, os discos e o copy-on-write'),
      md(`
        ### write() não é gravar no disco: fsync
        O journaling protege a **estrutura** do sistema de arquivos, não os dados que ainda estão na memória. Quando um programa chama \`write()\`, o kernel copia os bytes para o *page cache* (na RAM), marca as páginas como sujas e devolve o controle na hora; elas vão para o disco depois. No Linux, por padrão, uma página suja há mais de 30 segundos é gravada na próxima passada do kernel, que acontece a cada 5 segundos. Uma queda nesse intervalo perde o que o programa achava que tinha gravado.

        Quem precisa de garantia chama {{fsync|fsync}} (\`os.fsync\` em Python), que só retorna depois que os dados e os metadados do arquivo chegaram ao armazenamento. Bancos de dados chamam \`fsync\` no log a cada COMMIT, e é por isso que um commit custa caro.

        Para trocar o conteúdo de um arquivo sem nunca deixar uma versão pela metade, o padrão é: gravar um arquivo temporário; dar \`fsync\` nele; renomeá-lo por cima do original (no POSIX, \`rename\` é atômico: quem abrir o arquivo vê a versão velha ou a nova inteira, nunca uma mistura); e dar \`fsync\` no diretório, para o próprio rename ficar durável.
      `),
      code('python', `
        import os

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

        salvar_atomico("nota-fiscal.xml", b"<nfe>...</nfe>")
      `, 'Para rodar no seu computador, em Linux ou macOS: no navegador não há disco de verdade, e no Windows os.open não abre diretórios. No macOS, fsync não esvazia o cache interno do disco; quem precisa dessa garantia usa fcntl com F_FULLFSYNC, como o SQLite faz com PRAGMA fullfsync.'),
    ],
    exemplo: [
      md(`
        Um pedaço de um disco ext4, com cada diretório mostrado como a sua tabela nome → inode:
      `),
      {
        type: 'table',
        head: ['Inode', 'Tipo', 'Conteúdo'],
        rows: [
          ['2', 'diretório (a raiz, /)', '. → 2, .. → 2, home → 12, tmp → 198'],
          ['12', 'diretório', '. → 12, .. → 2, ana → 1500'],
          ['1500', 'diretório', '. → 1500, .. → 12, notas.txt → 1679531, fotos → 1600'],
          ['1600', 'diretório', '. → 1600, .. → 1500'],
          ['1679531', 'arquivo comum, 5 120 bytes, 1 link', 'ponteiros diretos 0 e 1: blocos 88 213 e 88 214'],
        ],
      },
      md(`
        **Resolvendo /home/ana/notas.txt.** Começa no inode 2; em 2, \`home\` → 12; em 12, \`ana\` → 1500; em 1500, \`notas.txt\` → 1679531. Três diretórios lidos e quatro inodes consultados; com o dcache aquecido, quase nada disso vai ao disco. O caminho relativo \`../ana/fotos\`, com diretório de trabalho \`/home/ana\` (1500): \`..\` → 12, \`ana\` → 1500, \`fotos\` → 1600.

        **Contagens de link dos diretórios.** O 1500 tem 3: a entrada \`ana\` em 12, o próprio \`.\` e o \`..\` de \`fotos\`. O 12 também tem 3 (\`home\` na raiz, o seu \`.\` e o \`..\` de \`ana\`). A raiz tem 4: \`.\`, \`..\` e os \`..\` de \`home\` e de \`tmp\`.

        **Onde está o byte 5 000 000 de um arquivo grande?** Bloco lógico 5 000 000 // 4096 = 1220. Não é direto (1220 ≥ 12); descontando 12 sobram 1208, que não cabem no indireto simples (1208 ≥ 1024); descontando 1024 sobram 184: indireto duplo, entrada 184 // 1024 = 0 do primeiro nível e 184 % 1024 = 184 do segundo. Sem cache, são três leituras até o dado: o bloco do indireto duplo, o bloco de ponteiros que ele indica e, por fim, o bloco de dados.

        **Links e rm.** Agora uma sequência de comandos sobre o arquivo 1679531:
      `),
      {
        type: 'table',
        head: ['Comando', 'Contagem de links', 'Processos com o arquivo aberto', 'Blocos liberados?'],
        rows: [
          ['ln notas.txt backup.txt', '2', '0', 'não'],
          ['rm notas.txt', '1', '0', 'não: backup.txt ainda é um nome'],
          ['um editor abre backup.txt', '1', '1', 'não'],
          ['rm backup.txt', '0', '1', 'não: o arquivo está aberto, mesmo sem nome nenhum'],
          ['o editor fecha o arquivo', '0', '0', 'sim: o inode e os blocos 88 213 e 88 214 voltam a ficar livres'],
        ],
      },
      md(`
        **Uma queda com o diário pela metade.** O ext4, montado com \`data=journal\`, estava acrescentando um bloco a \`notas.txt\` e criando \`relatorio.pdf\` quando a energia acabou. O diário ficou assim:
      `),
      code('text', `
        T41: início | inode 1679531 (tamanho 9 216, ponteiro direto 2 = bloco 88 215)
             | mapa de bits (88 215 usado) | bloco 88 215 (dados) | commit
        T42: início | diretório 1500 (nova entrada relatorio.pdf → 1700) | inode 1700
             ... (a gravação parou aqui)
      `),
      md(`
        Na volta, a recuperação refaz a T41: copia o inode, o mapa e o bloco de dados para os lugares definitivos (se o checkpoint já tinha copiado parte deles, copiar de novo não muda nada). A T42 não tem commit e é ignorada: \`relatorio.pdf\` não existe, como se o programa nunca tivesse tentado criá-lo. O disco fica consistente em segundos, sem varrer nada além do diário.
      `),
    ],
    codigo: [
      py(`
        # Um sistema de arquivos de brinquedo: inodes num dict, diretórios como dicts nome -> inode
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
        print("inode 77 existe?", 77 in inodes)
      `, { caption: 'O inode só some quando a contagem de links e a de aberturas chegam a zero. Experimente fechar antes do segundo rm e veja em que linha o inode é liberado.' }),
      py(`
        def tamanho_maximo(bloco, tam_numero=4, diretos=12):
            p = bloco // tam_numero                  # números de bloco por bloco de ponteiros
            blocos = diretos + p + p**2 + p**3       # diretos + simples + duplo + triplo
            return blocos * bloco

        def legivel(n):
            for unidade in ["bytes", "KiB", "MiB", "GiB", "TiB"]:
                if n < 1024 or unidade == "TiB":
                    return f"{n:.1f} {unidade}"
                n /= 1024

        for bloco in [1024, 2048, 4096]:
            print(f"bloco de {bloco} bytes: só diretos {legivel(12 * bloco)}, máximo {legivel(tamanho_maximo(bloco))}")
      `, { caption: 'O limite que vem só dos ponteiros. O ext2/ext3 real tem 16 GiB, 256 GiB e 2 TiB para esses tamanhos de bloco: nos dois primeiros, os ponteiros são o limite; com 4 KiB, a contagem de setores de 32 bits trava antes.' }),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e8-fs-1',
          kind: 'mcq',
          prompt: 'Você renomeia `relatorio.pdf` (2 GB) para `relatorio-final.pdf`, na mesma pasta, com `mv`. O comando termina instantaneamente. O que mudou no disco?',
          difficulty: 'facil',
          skills: ['so-memoria'],
          hints: [
            'Em qual estrutura fica o nome de um arquivo: no inode, nos blocos de dados ou em outro lugar?',
            'Se os 2 GB precisassem ser copiados, o comando seria instantâneo?',
          ],
          explanation: 'O nome mora na **entrada de diretório**, não no inode. Renomear na mesma pasta (ou dentro do mesmo sistema de arquivos) é a chamada `rename`: troca o nome na entrada e pronto. O inode, o número dele e os blocos de dados continuam iguais, e o custo não depende do tamanho do arquivo. Já um `mv` para **outro** sistema de arquivos (um pendrive, outra partição) não pode só mexer em entradas, porque números de inode só valem dentro do seu sistema de arquivos: aí o mv copia os dados e apaga o original.',
          options: [
            { text: 'Só a entrada no diretório: o inode e os blocos de dados continuam os mesmos', correct: true, feedback: 'Isso. O nome está no diretório; o rename troca o nome da entrada, sem tocar nos 2 GB.' },
            { text: 'O campo de nome dentro do inode foi reescrito', feedback: 'O inode não tem campo de nome. É justamente por isso que um arquivo pode ter vários nomes (hard links).' },
            { text: 'Os dados foram copiados para blocos novos e os antigos, liberados', feedback: 'Copiar 2 GB levaria segundos ou minutos. Isso só acontece quando o mv atravessa para outro sistema de arquivos.' },
            { text: 'O arquivo ganhou um número de inode novo, e o antigo foi liberado', feedback: 'O inode identifica o arquivo, e renomear não cria arquivo novo. Confira com ls -i antes e depois: o número é o mesmo.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e8-fs-2',
          kind: 'predict',
          lang: 'python',
          prompt: 'Um diretório de brinquedo com hard links e links simbólicos. O que o programa imprime?',
          difficulty: 'intermediario',
          skills: ['so-memoria'],
          hints: [
            'Depois de cada ln e ln_s, anote o que há em `pasta` e a contagem de links do inode 10.',
            'O que o link simbólico guarda: o número do inode ou um nome?',
            'Na última linha: quando conta.txt volta a existir, o que acontece com quem guardava esse nome?',
          ],
          explanation: '`ln` acrescenta copia.txt apontando para o inode 10 (2 links). `ln_s` cria o inode 11, do tipo link, que guarda o **nome** "conta.txt". O `rm("conta.txt")` tira um nome: o inode 10 fica com 1 link e continua vivo por copia.txt. Por isso `cat("copia.txt")` lê "boleto", mas o link simbólico procura "conta.txt", que não existe mais: está pendurado. Na segunda parte, um hard link recria o nome conta.txt, apontando de novo para o inode 10, e o link simbólico "volta a funcionar", porque ele só sabe o nome. No fim existem 2 inodes: o 10 (com 2 links) e o 11 (o link simbólico).',
          code: dedent(`
            inodes = {10: {"links": 1, "dados": "boleto"}}
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
            print(cat("atalho"), "|", len(inodes))
          `),
          answer: 'boleto | No such file or directory | 1\nboleto | 2',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e8-fs-3',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Escreva \`localizar(pos, bloco=4096, tam_numero=4)\`, que diz por qual ponteiro do inode (12 diretos, 1 indireto simples, 1 duplo e 1 triplo, como no ext2/ext3) se chega ao byte de posição \`pos\` de um arquivo. Cada bloco de ponteiros guarda \`bloco // tam_numero\` números de bloco. Devolva:

            - \`("direto", i)\`: o ponteiro direto i (de 0 a 11);
            - \`("simples", i)\`: a entrada i do bloco indireto simples;
            - \`("duplo", i, j)\`: a entrada i do primeiro nível do indireto duplo e a entrada j do segundo;
            - \`("triplo", i, j, k)\`: os três índices do indireto triplo;
            - \`None\`, se \`pos\` passar do maior tamanho de arquivo possível.

            Exemplo da lição: \`localizar(5_000_000)\` devolve \`("duplo", 0, 184)\`.
          `),
          difficulty: 'intermediario',
          skills: ['so-memoria'],
          hints: [
            'Primeiro transforme a posição em bytes num número de bloco lógico. Qual conta faz isso?',
            'Quantos blocos lógicos cada tipo de ponteiro cobre? Depois de passar pelos diretos, o que você precisa descontar do número do bloco antes de olhar o indireto simples?',
            'No indireto duplo, cada entrada do primeiro nível cobre quantos blocos? Como tirar dois índices de um número só?',
            'Qual é o último bloco lógico alcançável? Teste as fronteiras: o último bloco de cada faixa e o primeiro da seguinte.',
          ],
          explanation: 'O bloco lógico é `pos // bloco`. Os diretos cobrem os blocos 0 a 11; depois, cada faixa começa em 0 de novo: desconte 12 para entrar no simples (p blocos, p = bloco // tam_numero), desconte p para entrar no duplo (p² blocos) e p² para o triplo (p³ blocos). Dentro do duplo, cada entrada do primeiro nível cobre p blocos, então os índices são `divmod(b, p)`; no triplo, o primeiro índice é `b // p²` e os outros dois saem de `divmod(b % p², p)`. É a mesma conta de separar um endereço virtual em índices de vários níveis de tabela de páginas. O erro mais comum é esquecer de descontar as faixas anteriores, o que dá índices fora de 0..p − 1.',
          starter: dedent(`
            def localizar(pos, bloco=4096, tam_numero=4):
                # devolva ("direto", i), ("simples", i), ("duplo", i, j), ("triplo", i, j, k) ou None
                pass
          `),
          solution: dedent(`
            def localizar(pos, bloco=4096, tam_numero=4):
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
                return None
          `),
          tests: [
            {
              name: 'exemplos com blocos de 4 KiB',
              code: dedent(`
                casos = [
                    (0, ("direto", 0)),
                    (5000, ("direto", 1)),
                    (12 * 4096 - 1, ("direto", 11)),
                    (5_000_000, ("duplo", 0, 184)),
                ]
                for pos, esperado in casos:
                    r = localizar(pos)
                    assert r == esperado, f"localizar({pos}) deu {r}, esperado {esperado}"
              `),
            },
            {
              name: 'fronteiras entre as faixas',
              code: dedent(`
                B = 4096
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
                    assert r == esperado, f"localizar({pos}) deu {r}, esperado {esperado}: {porque}"
              `),
            },
            {
              name: 'além do tamanho máximo',
              code: dedent(`
                B = 4096
                ultimo = (12 + 1024 + 1024 ** 2 + 1024 ** 3) * B - 1
                r = localizar(ultimo)
                assert r == ("triplo", 1023, 1023, 1023), f"o último byte possível fica em ('triplo', 1023, 1023, 1023); veio {r}"
                r = localizar(ultimo + 1)
                assert r is None, f"um byte depois do máximo, devolva None; veio {r}"
              `),
            },
            {
              name: 'blocos pequenos (16 bytes, 4 números por bloco)',
              code: dedent(`
                casos = [
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
                assert r == ("duplo", 0, 0), f"com blocos de 1024 e números de 8 bytes, cada bloco guarda 128 números: o bloco 140 é o primeiro do duplo; veio {r}"
              `),
            },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e8-fs-4',
          kind: 'fill',
          lang: 'python',
          prompt: 'Complete `salvar_atomico`, que grava a nota fiscal de modo que, mesmo com uma queda de energia, o arquivo `caminho` tenha a versão antiga inteira ou a nova inteira, nunca uma mistura.',
          difficulty: 'facil',
          skills: ['so-memoria'],
          hints: [
            'O objeto arquivo do Python tem um buffer próprio. Qual método empurra esse buffer para o kernel?',
            'Qual chamada do módulo os espera os dados saírem do page cache e chegarem ao disco?',
            'Qual função do módulo os troca o nome de um arquivo, substituindo o destino de forma atômica se ele existir?',
          ],
          explanation: '`flush()` passa o que está no buffer do objeto Python para o kernel (sem ele, o fsync poderia não ver os últimos bytes). `os.fsync` espera o kernel levar os dados do page cache para o disco. `os.replace` faz o rename atômico por cima do original: quem abrir o arquivo vê a versão velha ou a nova, inteira. `os.rename` faz o mesmo no Linux e no macOS, mas no Windows falha se o destino existir; por isso `os.replace` é o recomendado. Para o rename sobreviver a uma queda, falta ainda um fsync no diretório.',
          template: dedent(`
            import os

            def salvar_atomico(caminho, dados):
                tmp = caminho + ".tmp"
                with open(tmp, "wb") as f:
                    f.write(dados)
                    f.___()
                    os.___(f.fileno())
                os.___(tmp, caminho)
          `),
          blanks: [['flush'], ['fsync'], ['replace', 'rename']],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e8-fs-5',
          kind: 'fix',
          lang: 'python',
          prompt: dedent(`
            Depois de uma queda, \`recuperar(disco, diario)\` deve refazer o diário sobre o disco e devolver o disco recuperado, sem alterar o dict recebido. \`disco\` é um dict número do bloco → conteúdo; \`diario\` é a lista de registros na ordem em que foram gravados:

            - \`("inicio", tx)\`: começo da transação tx;
            - \`("bloco", tx, numero, conteudo)\`: a versão nova de um bloco;
            - \`("commit", tx)\`: a transação tx está completa.

            As transações aparecem uma de cada vez, sem se misturar, e só a última pode estar incompleta (a queda interrompeu a gravação dela). Regra: transações com commit são refeitas, na ordem do diário; transações sem commit são ignoradas. O código atual refaz tudo, inclusive a transação interrompida. Corrija.
          `),
          difficulty: 'intermediario',
          skills: ['so-memoria'],
          hints: [
            'Quando o código lê um registro "bloco", ele já sabe se aquela transação vai ter commit?',
            'Onde guardar as gravações de uma transação enquanto o commit não aparece?',
            'O que deve acontecer com o que estiver guardado quando o diário acabar sem commit?',
          ],
          explanation: 'Ao ler um bloco, ainda não se sabe se a transação chegou ao commit. A correção guarda as gravações da transação atual numa lista de pendentes e só as aplica ao encontrar o commit; se o diário acabar antes, os pendentes são descartados. Aplicar na ordem do diário garante que, se duas transações confirmadas gravaram o mesmo bloco, vale a mais recente. Como refazer só copia conteúdos, rodar a recuperação duas vezes (uma queda durante a recuperação) dá o mesmo resultado: é idempotente.',
          starter: dedent(`
            def recuperar(disco, diario):
                disco = dict(disco)
                for registro in diario:
                    if registro[0] == "bloco":
                        _, tx, numero, conteudo = registro
                        disco[numero] = conteudo
                return disco
          `),
          solution: dedent(`
            def recuperar(disco, diario):
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
                return disco
          `),
          tests: [
            {
              name: 'transação interrompida é ignorada',
              code: dedent(`
                disco = {1: "inode v1", 2: "mapa v1", 3: "dados v1"}
                diario = [
                    ("inicio", 41), ("bloco", 41, 1, "inode v2"), ("bloco", 41, 3, "dados v2"), ("commit", 41),
                    ("inicio", 42), ("bloco", 42, 2, "mapa v3"),
                ]
                r = recuperar(disco, diario)
                esperado = {1: "inode v2", 2: "mapa v1", 3: "dados v2"}
                assert r == esperado, f"esperado {esperado}, veio {r}: a T42 não tem commit e não pode aparecer no disco"
                assert disco == {1: "inode v1", 2: "mapa v1", 3: "dados v1"}, "não altere o dict recebido: devolva um novo"
              `),
            },
            {
              name: 'só transações completas',
              code: dedent(`
                disco = {7: "a"}
                diario = [("inicio", 1), ("bloco", 1, 7, "b"), ("bloco", 1, 8, "c"), ("commit", 1)]
                r = recuperar(disco, diario)
                assert r == {7: "b", 8: "c"}, f"esperado {{7: 'b', 8: 'c'}}, veio {r}"
              `),
            },
            {
              name: 'a mais recente vence',
              code: dedent(`
                disco = {5: "original"}
                diario = [
                    ("inicio", 1), ("bloco", 1, 5, "primeira"), ("commit", 1),
                    ("inicio", 2), ("bloco", 2, 5, "segunda"), ("commit", 2),
                    ("inicio", 3), ("bloco", 3, 5, "terceira"),
                ]
                r = recuperar(disco, diario)
                assert r == {5: "segunda"}, f"T1 e T2 têm commit e gravam o bloco 5: vale a T2, a mais recente; a T3 está incompleta. Veio {r}"
              `),
            },
            {
              name: 'bordas: diário vazio, só início, interrompido antes de qualquer bloco',
              code: dedent(`
                assert recuperar({1: "x"}, []) == {1: "x"}, "sem diário, o disco fica como está"
                assert recuperar({1: "x"}, [("inicio", 9)]) == {1: "x"}, "uma transação só com início não muda nada"
                r = recuperar({1: "x"}, [("inicio", 9), ("bloco", 9, 1, "y"), ("bloco", 9, 2, "z")])
                assert r == {1: "x"}, f"a única transação não tem commit: nada muda; veio {r}"
              `),
            },
            {
              name: 'recuperar duas vezes dá o mesmo resultado',
              code: dedent(`
                disco = {1: "a", 2: "b"}
                diario = [("inicio", 1), ("bloco", 1, 2, "c"), ("commit", 1), ("inicio", 2), ("bloco", 2, 1, "d")]
                uma = recuperar(disco, diario)
                duas = recuperar(uma, diario)
                assert uma == duas == {1: "a", 2: "c"}, f"refazer é idempotente: esperado {{1: 'a', 2: 'c'}} nas duas vezes; veio {uma} e {duas}"
              `),
            },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e8-fs-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Escreva \`resolver(fs, caminho, cwd=2)\`, que faz a resolução de caminhos do kernel e devolve o número do inode final. \`fs\` é um dict número do inode → inode, em que cada inode é um destes:

            - \`{"tipo": "dir", "entradas": entradas}\`, em que \`entradas\` é um dict nome → número do inode, incluindo \`"."\` e \`".."\` (na raiz, inode 2, as duas apontam para 2);
            - \`{"tipo": "arq"}\`;
            - \`{"tipo": "link", "alvo": "caminho"}\`: um link simbólico.

            Regras, como no Linux:

            - um caminho que começa com \`/\` parte da raiz (2); os outros partem de \`cwd\`. Barras repetidas são ignoradas, e nenhum caminho dos testes termina em barra (fora o próprio \`"/"\`).
            - Links simbólicos são seguidos em **qualquer** componente, inclusive no último. Um alvo absoluto recomeça da raiz; um alvo relativo é resolvido a partir do diretório **onde o link está**. Depois do alvo, a resolução continua com o resto do caminho.
            - Erros: nome inexistente ou caminho vazio → \`FileNotFoundError\`; procurar um nome dentro de algo que não é diretório → \`NotADirectoryError\`; mais de 40 links simbólicos seguidos numa mesma resolução → \`OSError\` com \`errno.ELOOP\` (\`raise OSError(errno.ELOOP, "Too many levels of symbolic links")\`).
          `),
          difficulty: 'desafio',
          skills: ['so-memoria', 'prog-strings'],
          hints: [
            'Pense na resolução como uma fila de nomes ainda por processar e um diretório atual. O que acontece com essa fila quando você encontra um link simbólico?',
            'Os nomes do alvo do link entram antes ou depois dos que ainda faltavam no caminho original?',
            'Um alvo relativo parte do diretório onde o link está. Na hora em que você encontra o link, qual variável já guarda esse diretório?',
            'O limite de 40 vale por link ou para a resolução inteira? Onde fica o contador?',
            'Por que você não pode simplificar ".." direto no texto do caminho antes de começar? Pense em "/atalho/..".',
          ],
          explanation: 'A resolução mantém o diretório atual e uma fila com os nomes que faltam. Para cada nome: se o atual não é diretório, é `NotADirectoryError`; se o nome não está nas entradas, `FileNotFoundError`. Se o inode encontrado é um link, o contador sobe (acima de 40, `ELOOP`), os nomes do alvo entram **na frente** da fila e, se o alvo for absoluto, o atual volta para a raiz; se for relativo, o atual continua sendo o diretório onde o link está, que é exatamente o diretório em que você estava procurando. `"."` e `".."` não têm tratamento especial: são entradas como as outras. É por isso que `/atalho/..` dá `/home` (o pai físico de `/home/ana`) e não `/`: quem simplifica o texto antes, como `os.path.normpath`, erra. O kernel faz o mesmo com cache (o dcache) e permissões, e conta os links da resolução inteira: um caminho com 41 passagens pelo mesmo link para diretório também dá ELOOP.',
          starter: dedent(`
            import errno

            def resolver(fs, caminho, cwd=2):
                # devolva o número do inode final, seguindo links simbólicos
                # FileNotFoundError, NotADirectoryError ou OSError(errno.ELOOP, ...)
                pass
          `),
          solution: dedent(`
            import errno
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
                return atual
          `),
          tests: [
            {
              name: 'caminhos sem links',
              code: FS_TESTE + '\n' + dedent(`
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
                    assert r == esperado, f"resolver(fs, {caminho!r}, cwd={cwd}) deu {r!r}, esperado {esperado}"
              `),
            },
            {
              name: 'links absolutos e relativos',
              code: FS_TESTE + '\n' + dedent(`
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
                    assert r == esperado, f"resolver(fs, {caminho!r}, cwd={cwd}) deu {r!r}, esperado {esperado}: {porque}"
              `),
            },
            {
              name: '.. depois de um link vai ao pai físico',
              code: FS_TESTE + '\n' + dedent(`
                fs = _fs()
                r = _erro(fs, "/atalho/..")
                assert r == 12, f"/atalho aponta para /home/ana; o '..' dali é /home (inode 12), não a raiz. Veio {r!r}. Simplificar '..' no texto antes de resolver dá a resposta errada"
                r = _erro(fs, "/atalho/../ana/notas.txt")
                assert r == 77, f"/atalho/../ana/notas.txt é /home/ana/notas.txt; veio {r!r}"
              `),
            },
            {
              name: 'erros: não existe e não é diretório',
              code: FS_TESTE + '\n' + dedent(`
                fs = _fs()
                for caminho, porque in [("/home/bia", "não há bia em /home"), ("/home/ana/quebrado", "o link quebrado aponta para um nome inexistente"), ("", "caminho vazio"), ("/etc/nada/hosts", "nada não existe em /etc")]:
                    r = _erro(fs, caminho)
                    assert isinstance(r, FileNotFoundError), f"resolver(fs, {caminho!r}) deveria levantar FileNotFoundError ({porque}); veio {r!r}"
                for caminho in ["/home/ana/notas.txt/x", "/etc/hosts/.", "/atalho/notas.txt/.."]:
                    r = _erro(fs, caminho)
                    assert isinstance(r, NotADirectoryError), f"resolver(fs, {caminho!r}) deveria levantar NotADirectoryError: não dá para procurar um nome dentro de um arquivo comum; veio {r!r}"
                assert fs == _fs(), "não altere o dict fs"
              `),
            },
            {
              name: 'ciclos de links',
              code: FS_TESTE + '\n' + dedent(`
                fs = _fs()
                for caminho in ["/laco", "/vai", "/home/../laco/x"]:
                    r = _erro(fs, caminho)
                    assert isinstance(r, OSError) and getattr(r, "errno", None) == _errno.ELOOP, f"resolver(fs, {caminho!r}) cai num ciclo de links: deveria levantar OSError com errno.ELOOP; veio {r!r}"
              `),
            },
            {
              name: 'limite de 40 links por resolução',
              code: FS_TESTE + '\n' + dedent(`
                fs = _corrente(41)
                r = _erro(fs, "/c40")
                assert r == 500, f"/c40 segue 40 links até c0: ainda é permitido (o limite é mais de 40); veio {r!r}"
                r = _erro(fs, "/c41")
                assert isinstance(r, OSError) and getattr(r, "errno", None) == _errno.ELOOP, f"/c41 exige 41 links: deveria ser ELOOP; veio {r!r}"
                fs = _fs()
                r = _erro(fs, "/" + "h/../" * 40 + "home/ana/notas.txt")
                assert r == 77, f"/h aponta para home (relativo, a partir da raiz); 40 passagens por /h, cada uma seguida de '..', ainda cabem no limite; veio {r!r}"
                r = _erro(fs, "/" + "h/../" * 41 + "home/ana/notas.txt")
                assert isinstance(r, OSError) and getattr(r, "errno", None) == _errno.ELOOP, f"41 passagens pelo mesmo link numa resolução: o limite de 40 vale para a resolução inteira; veio {r!r}"
              `),
            },
          ],
        },
      },
    ],
    revisao: [
      md(`
        - Inode: tipo, permissões, dono, tamanho, datas, contagem de links e onde estão os blocos. O nome fica na entrada de diretório.
        - Ponteiros: 12 diretos (48 KiB), indireto simples (+4 MiB), duplo (+4 GiB), triplo (+4 TiB), com blocos de 4 KiB. O ext4 usa extents: (início, comprimento).
        - Diretório: tabela nome → inode, com \`.\` e \`..\`. Resolver um caminho é procurar componente por componente a partir da raiz (inode 2) ou do diretório de trabalho.
        - Hard link: outro nome para o mesmo inode; não atravessa sistemas de arquivos nem aponta para diretório. Link simbólico: um inode com um caminho; pode ficar pendurado, e o Linux segue no máximo 40 por resolução (ELOOP).
        - \`rm\` = \`unlink\`: os blocos voltam quando a contagem de links é zero e ninguém tem o arquivo aberto.
        - Queda no meio de uma atualização deixa inode, mapa de bits e dados discordando. Journaling: transação no diário, commit, checkpoint; a recuperação refaz o que tem commit e ignora o resto.
        - \`write()\` só chega ao page cache; \`fsync\` garante o disco. Troca atômica: temporário, fsync, rename, fsync no diretório.
      `),
      english(`
        - **inode, inode number, link count**: inode, número do inode, contagem de links
        - **directory entry (dentry), path resolution**: entrada de diretório, resolução de caminho
        - **hard link, symbolic link (symlink), dangling symlink**: hard link, link simbólico, link pendurado
        - **crash consistency, journal, write-ahead logging, checkpoint, replay**
        - **page cache, dirty page, fsync, durable**: cache de páginas, página suja, fsync, durável

        Frase típica de entrevista: *"Deleting a file only removes a directory entry. The inode and its blocks are freed when the link count drops to zero and no process still has the file open, which is why df can show a full disk after you rm a huge log."*

        Frase típica de documentação (man page de rename): *"If newpath already exists, it will be atomically replaced, so that there is no point at which another process attempting to access newpath will find it missing."*
      `),
    ],
  },
  review: [
    ['O que um inode guarda, e o que ele não guarda?', 'Tipo, permissões, dono, tamanho, datas, contagem de links e a localização dos blocos. Não guarda o nome, que fica na entrada de diretório.'],
    ['Com blocos de 4 KiB e números de bloco de 4 bytes, quanto cobrem os 12 ponteiros diretos e quanto o indireto simples acrescenta?', 'Os diretos cobrem 48 KiB (12 blocos); o indireto simples acrescenta 1024 blocos, 4 MiB.'],
    ['Como o kernel transforma /home/ana/notas.txt num número de inode?', 'Começa no inode da raiz (2 no ext4) e, componente por componente, procura o nome nas entradas do diretório atual para achar o próximo inode.'],
    ['Quando os blocos de um arquivo apagado com rm voltam de fato a ficar livres?', 'Quando a contagem de links chega a zero e nenhum processo está com o arquivo aberto.'],
    ['Três diferenças entre hard link e link simbólico?', 'O hard link é outra entrada para o mesmo inode; o simbólico é um inode próprio com um caminho. Só o simbólico atravessa sistemas de arquivos e aponta para diretórios, e só ele fica pendurado quando o alvo é apagado.'],
    ['Na recuperação depois de uma queda, o que o journaling faz com transações com e sem commit?', 'Refaz as que têm commit, na ordem do diário; ignora as que não têm, como se nunca tivessem começado.'],
    ['Por que write() sozinho não garante que os dados sobrevivem a uma queda, e o que garante?', 'write() só copia os dados para o page cache, na RAM. fsync espera os dados e metadados chegarem ao disco.'],
    ['Qual é o padrão para substituir um arquivo sem nunca deixá-lo pela metade?', 'Gravar um temporário, dar fsync nele, renomeá-lo por cima do original (rename é atômico) e dar fsync no diretório.'],
  ],
  references: ['ostep', 'linux-man', 'tanenbaum-so'],
});

export const lessons: Lesson[] = [ponteiros, arquivos];
