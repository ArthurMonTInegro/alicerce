/** Lições adicionais do módulo m8-1 (processos, threads e escalonamento). */
import type { Lesson } from '../../types.ts';
import { code, dedent, deep, english, lesson, md, py, t, warn } from '../../helpers.ts';

/* ------------------------------------------------------------------ */
/* Criando processos: PCB, fork, exec, wait, zumbis e órfãos           */
/* ------------------------------------------------------------------ */

/** Tabela de processos usada nos testes do exercício de wait. */
const TABELA_WAIT = dedent(`
  def _tabela():
      return {
          1: {"ppid": 0, "estado": "executando", "status": None},
          200: {"ppid": 1, "estado": "executando", "status": None},
          201: {"ppid": 200, "estado": "zumbi", "status": 3},
          202: {"ppid": 200, "estado": "bloqueado", "status": None},
          203: {"ppid": 202, "estado": "zumbi", "status": 7},
          204: {"ppid": 200, "estado": "zumbi", "status": 0},
      }
`);

/** Referência e gerador de eventos válidos para o desafio do kernel simulado. */
const REF_KERNEL = dedent(`
  import random as _random

  def _ref_simular(eventos):
      pai, estado, codigo = {1: 0}, {1: "ativo"}, {1: None}
      colhidos, prox = [], 2
      def colhe(p, f):
          colhidos.append((p, f, codigo[f]))
          del pai[f], estado[f], codigo[f]
      for ev in eventos:
          if ev[0] == "fork":
              pai[prox], estado[prox], codigo[prox] = ev[1], "ativo", None
              prox += 1
          elif ev[0] == "exit":
              p = ev[1]
              estado[p], codigo[p] = "zumbi", ev[2]
              for f in sorted(x for x in pai if pai[x] == p):
                  pai[f] = 1
                  if estado[f] == "zumbi":
                      colhe(1, f)
              if pai[p] == 1:
                  colhe(1, p)
              elif estado[pai[p]] == "bloqueado":
                  estado[pai[p]] = "ativo"
                  colhe(pai[p], p)
          else:
              p = ev[1]
              filhos = sorted(x for x in pai if pai[x] == p)
              zumbis = [x for x in filhos if estado[x] == "zumbi"]
              if not filhos:
                  colhidos.append((p, -1, None))
              elif zumbis:
                  colhe(p, zumbis[0])
              else:
                  estado[p] = "bloqueado"
      return colhidos, {x: (pai[x], estado[x]) for x in pai}

  def _gera_eventos(rng, n):
      eventos = []
      for _ in range(n):
          _, tab = _ref_simular(eventos)
          ativos = [x for x in tab if tab[x][1] == "ativo"]
          outros = [x for x in ativos if x != 1]
          op = rng.choice(["fork", "fork", "exit", "wait"]) if outros else "fork"
          if op == "fork":
              eventos.append(("fork", rng.choice(ativos)))
          elif op == "exit":
              eventos.append(("exit", rng.choice(outros), rng.randint(0, 3)))
          else:
              eventos.append(("wait", rng.choice(outros)))
      return eventos

  def _confere_kernel(eventos, dica=""):
      esperado = _ref_simular(eventos)
      r = simular(eventos)
      assert isinstance(r, tuple) and len(r) == 2, f"devolva a tupla (colhidos, tabela); veio {r!r}"
      colhidos, tabela = r
      assert colhidos == esperado[0], f"eventos {eventos}: colhidos = {colhidos}, esperado {esperado[0]}. {dica}"
      assert tabela == esperado[1], f"eventos {eventos}: tabela = {tabela}, esperado {esperado[1]}. {dica}"
`);

const criacao = lesson({
  id: 'l8-fork-exec-wait',
  moduleId: 'm8-1',
  title: 'Criando processos: fork, exec, wait e a árvore de processos',
  titleEn: 'Creating processes: fork, exec, wait and the process tree',
  summary: 'O que o kernel guarda sobre cada processo, como o Unix cria processos com fork, troca o programa com exec e recolhe o resultado com wait, de onde vêm zumbis e órfãos, como o shell faz redirecionamentos, por que cd não pode ser um programa à parte e onde as threads entram nessa história.',
  minutes: 45,
  objectives: [
    'Listar o que o bloco de controle de processo (PCB) guarda e associar cada transição de estado ao evento que a provoca',
    'Prever o valor devolvido por fork em cada processo e quantos processos um programa com fork cria',
    'Explicar o que exec troca e o que preserva (PID, descritores de arquivo, diretório)',
    'Usar wait/waitpid e interpretar o código de saída, inclusive o 128 + sinal do bash',
    'Explicar como surgem zumbis e órfãos e quem os recolhe',
    'Explicar por que fork e exec são separados, usando redirecionamento, pipes e o comando cd',
    'Relacionar processos e threads no Linux à chamada clone e saber por que fork e threads não combinam',
  ],
  skills: ['so-processos'],
  terms: [
    t('processo pai / processo filho', 'parent / child process', 'O processo que pediu a criação (pai) e o processo criado (filho). O filho sabe o PID do pai (PPID).'),
    t('bifurcar', 'fork', 'Criar um processo filho quase idêntico ao pai. A chamada fork retorna duas vezes, uma em cada processo.', "fork() returns 0 in the child and the child's PID in the parent."),
    t('executar outro programa', 'exec', 'Família de chamadas (execve, execvp...) que substitui o programa do processo atual por outro, mantendo o mesmo PID.', 'On success, execve() does not return.'),
    t('esperar', 'wait / waitpid', 'Chamada em que o pai bloqueia até um filho terminar e recolhe o código de saída dele.'),
    t('código de saída', 'exit status', 'Número de 0 a 255 que o processo devolve ao terminar; 0 significa sucesso. No shell, fica em $?.', 'The command exited with a non-zero exit status.'),
    t('bloco de controle de processo', 'process control block (PCB)', 'Estrutura do kernel com tudo o que ele sabe de um processo: PID, estado, registradores salvos, memória, arquivos abertos, prioridade.', 'In Linux, the PCB is the task_struct.'),
    t('identificador de processo', 'process ID (PID)', 'Número que o kernel dá a cada processo. O PID do pai é o PPID.'),
    t('descritor de arquivo', 'file descriptor', 'Número inteiro que identifica um arquivo, pipe ou socket aberto pelo processo; 0, 1 e 2 são a entrada, a saída e o erro padrão.', 'dup2(fd, 1) makes file descriptor 1 refer to the same open file as fd.'),
    t('cópia na escrita', 'copy-on-write', 'Otimização do fork: pai e filho compartilham as páginas de memória até que um deles escreva; só então a página é copiada.'),
    t('processo zumbi', 'zombie process', 'Processo que já terminou, mas cujo pai ainda não chamou wait; sobra só a entrada na tabela de processos.', 'A zombie process shows up as <defunct> in ps.'),
    t('processo órfão', 'orphan process', 'Processo cujo pai terminou antes dele; é adotado pelo init (PID 1) ou por um subreaper, que o recolhe quando ele terminar.'),
    t('comando interno', 'shell builtin', 'Comando que o próprio shell executa, sem fork, porque precisa mudar o estado do shell (cd, export, exit).', 'cd is a shell builtin.'),
  ],
  stages: {
    conceito: [
      md(`
        Todo processo, menos o primeiro, nasce de outro. Quando você digita \`python3 app.py\` no terminal, o shell não se transforma no Python: ele cria um {{processo filho|child process}}, faz esse filho trocar de programa e fica esperando ele terminar. O shell é o {{processo pai|parent process}}. No Unix (Linux, macOS, Android), isso é feito com três chamadas de sistema, os pedidos ao kernel que você viu no nível 0:

        - \`fork()\` **{{bifurca|fork}}** o processo: a partir dali existem dois, pai e filho, rodando o mesmo código;
        - \`exec()\` **{{executa outro programa|exec}}** no lugar do atual, dentro do mesmo processo, sem criar processo novo;
        - \`wait()\` faz o pai **{{esperar|wait}}** um filho terminar e recolher o {{código de saída|exit status}} dele.

        Separar "criar um processo" de "trocar de programa" parece estranho, mas é o que permite ao shell fazer \`>\`, \`<\` e \`|\`, e é o motivo de \`cd\` não poder ser um programa à parte. Essas três chamadas também explicam os processos \`<defunct>\` que aparecem no \`ps\` de um servidor com bug, o que o \`subprocess.run\` do Python faz por baixo e por que, no Linux, processo e thread saem da mesma chamada de sistema.
      `),
    ],
    explicacao: [
      md(`
        ### O que o kernel guarda de cada processo
        Para pausar um processo e retomá-lo depois como se nada tivesse acontecido, o kernel guarda tudo o que define aquele processo numa estrutura chamada {{bloco de controle de processo|process control block (PCB)}}. No Linux ela se chama \`task_struct\`; no xv6, o sistema operacional de ensino do MIT, \`struct proc\`. Cada processo tem um número, o {{identificador de processo|process ID (PID)}}, e o PCB guarda também o PID do pai, o PPID.

        Entre os campos está a tabela de {{descritores de arquivo|file descriptors}}: números pequenos que identificam cada arquivo, pipe ou socket aberto pelo processo. Por convenção, 0 é a entrada padrão, 1 é a saída padrão e 2 é a saída de erro.
      `),
      {
        type: 'table',
        head: ['Campo do PCB', 'Para que serve', 'Exemplo'],
        rows: [
          ['PID e PPID', 'identificar o processo e quem o criou', 'PID 1201, PPID 1200 (o shell)'],
          ['estado', 'em que ponto do ciclo de vida ele está', 'pronto, executando, bloqueado, zumbi'],
          ['registradores salvos', 'onde ele parou: contador de programa, ponteiro de pilha e os demais registradores, guardados na troca de contexto', 'PC = endereço da próxima instrução'],
          ['memória', 'onde está o espaço de endereçamento do processo (tabela de páginas, assunto do módulo m8-2)', '—'],
          ['descritores de arquivo', 'o que está aberto, cada coisa com um número', '0 = teclado, 1 e 2 = terminal, 3 = notas.txt'],
          ['diretório atual e credenciais', 'de onde partem os caminhos relativos; com que usuário o processo roda', '/home/ana, usuária ana'],
          ['escalonamento', 'prioridade e quanto de CPU já usou', 'nice 0, 3,2 s de CPU'],
          ['código de saída', 'guardado quando o processo termina, até o pai recolher', '0'],
        ],
        caption: 'No Linux, parte disso aparece em /proc/<PID>/status. Experimente `cat /proc/self/status` (o self é o próprio cat).',
      },
      md(`
        ### Estados: o que provoca cada transição
        A lição anterior mostrou os estados. Falta o principal: **o que faz um processo mudar de estado, e quem age em cada caso**.
      `),
      {
        type: 'table',
        head: ['Transição', 'O que provoca', 'Quem age'],
        rows: [
          ['novo → pronto', 'o fork terminou de montar o PCB e a memória do filho', 'kernel'],
          ['pronto → executando', 'o escalonador escolheu o processo para uma CPU', 'escalonador'],
          ['executando → pronto', 'acabou o quantum (interrupção do temporizador) ou ficou pronto alguém mais prioritário', 'kernel (preempção)'],
          ['executando → bloqueado', 'o processo pediu algo que demora: ler do disco, da rede ou do teclado, `wait` por um filho, `sleep`', 'o próprio processo, ao fazer a chamada de sistema'],
          ['bloqueado → pronto', 'o evento aconteceu: os dados chegaram, o filho terminou, o tempo passou', 'kernel, em geral avisado por uma interrupção do dispositivo'],
          ['executando → zumbi', 'o processo chamou `exit` ou foi morto por um sinal', 'o processo, ou quem mandou o sinal'],
          ['zumbi → fora da tabela', 'o pai chamou `wait` e recolheu o código de saída', 'o pai'],
        ],
      },
      md(`
        - Bloqueado **nunca** vai direto para executando: quando o evento acontece, o processo volta para a fila de prontos e espera a vez.
        - No \`ps\` do Linux, a coluna STAT usa letras: **R** (executando *ou* pronto: o Linux não separa os dois ali), **S** (bloqueado esperando um evento), **D** (bloqueado sem poder ser interrompido, quase sempre E/S de disco), **T** (parado, por exemplo com Ctrl+Z) e **Z** (zumbi).
        - O estado zumbi é o "terminado" da lição anterior visto de perto: o processo acabou, mas ainda ocupa uma linha na tabela.

        ### fork: um processo vira dois
        \`pid = fork()\` pede ao kernel um processo novo, montado como cópia do pai: o mesmo código, uma cópia da memória (as variáveis têm os mesmos valores), os mesmos arquivos abertos, o mesmo diretório atual. Depois, **os dois voltam da mesma chamada**, cada um no seu processo, e seguem para a linha seguinte. O que os distingue é o valor devolvido:
      `),
      {
        type: 'table',
        head: ['', 'No pai', 'No filho'],
        rows: [
          ['valor devolvido pelo fork', 'o PID do filho (maior que 0)', '0'],
          ['PID', 'o mesmo de antes', 'um número novo'],
          ['PPID', 'o mesmo de antes', 'o PID do pai'],
          ['memória', 'a original', 'uma cópia: mudar uma variável num processo não muda no outro'],
          ['descritores abertos', 'os mesmos', 'cópias que apontam para os mesmos arquivos abertos e compartilham com o pai a posição de leitura e escrita: se um lê 10 bytes, o outro continua do byte 10'],
        ],
      },
      md(`
        Se o fork falha (por exemplo, porque o usuário atingiu o limite de processos), em C ele devolve −1 e nenhum filho é criado; no Python, \`os.fork()\` levanta \`OSError\`.

        **Quem roda primeiro depois do fork?** Não está definido: é decisão do escalonador, pode mudar de uma execução para outra, e os dois podem até rodar ao mesmo tempo em núcleos diferentes. Código que depende dessa ordem tem bug.

        Copiar toda a memória de um processo de 2 GB a cada fork seria lento. Por isso o Linux usa {{cópia na escrita|copy-on-write}}: pai e filho passam a compartilhar as mesmas páginas de memória física, marcadas como somente leitura, e o kernel só copia uma página quando um dos dois escreve nela. Como o filho quase sempre chama exec logo em seguida, quase nada chega a ser copiado. (Páginas são assunto do módulo m8-2.)

        **Contando processos.** Cada fork duplica todos os processos que passam por ele. Três forks seguidos, sem nenhum \`if\`, deixam 2 × 2 × 2 = **8** processos: o original e mais 7.

        ### exec: mesmo processo, outro programa
        A chamada de sistema é \`execve(caminho, argumentos, ambiente)\`; \`execvp\`, \`execl\` e companhia são variações da biblioteca que procuram o programa no PATH ou recebem os argumentos de outro jeito. O kernel descarta o código, os dados, o heap e a pilha do programa atual, carrega o executável do disco e começa a rodá-lo do início.

        - **Muda**: o programa inteiro, isto é, o código e a memória.
        - **Fica**: PID, PPID, diretório atual, usuário (salvo nos programas *setuid*, como o \`sudo\`, que rodam com o usuário dono do arquivo) e os descritores abertos, exceto os marcados para fechar no exec (*close-on-exec*). No Python, os arquivos que você abre já vêm marcados assim (PEP 446); os descritores 0, 1 e 2, não.
        - Se o exec dá certo, ele **não retorna**: o código que o chamou não existe mais. Se retornou, falhou. Quando o programa não existe, o bash mostra *command not found* e o filho termina com código 127; quando existe, mas não tem permissão de execução, mostra *Permission denied* e o código é 126.

        ### wait: recolher o filho
        \`waitpid(pid, &status, 0)\` bloqueia o pai até o filho \`pid\` terminar; \`wait(&status)\` espera qualquer filho. As duas devolvem o PID de quem terminou e preenchem \`status\`, que codifica como ele terminou. Em C você lê com macros (\`WIFEXITED\`, \`WEXITSTATUS\`); no Python, com \`os.waitstatus_to_exitcode(status)\`. Se o pai não tem nenhum filho, a chamada falha na hora com o erro \`ECHILD\`.

        O código de saída vai de 0 a 255: só sobram os 8 bits mais baixos do número passado a \`exit\` (\`exit(256)\` vira 0). A convenção é **0 = sucesso** e qualquer outro valor = algum erro. O shell guarda o código do último comando em \`$?\`, e é ele que \`&&\` e \`||\` consultam: em \`make && ./app\`, o app só roda se o make terminou com 0. Quando o processo é morto por um sinal, o bash mostra 128 + o número do sinal.
      `),
      {
        type: 'table',
        head: ['Como o processo terminou', '`$?` no bash'],
        rows: [
          ['`exit(0)`, ou `return 0` no `main`', '0'],
          ['`exit(3)`', '3'],
          ['comando não encontrado (o exec falhou)', '127'],
          ['arquivo sem permissão de execução (o exec falhou)', '126'],
          ['Ctrl+C (sinal SIGINT, número 2)', '130'],
          ['`kill -9` (sinal SIGKILL, número 9)', '137'],
          ['falha de segmentação (sinal SIGSEGV, número 11)', '139'],
        ],
      },
      md(`
        ### Zumbis e órfãos
        Pai e filho podem terminar em qualquer ordem, e cada ordem tem um nome.

        - **O filho termina antes de o pai chamar wait.** O filho vira um {{processo zumbi|zombie process}}: a memória já foi liberada, mas a entrada na tabela de processos fica, com o PID e o código de saída, esperando o pai buscar. O \`ps\` mostra \`Z\` e \`<defunct>\`. Zumbis passageiros são normais; um servidor que cria filhos e nunca chama wait acumula milhares e pode esgotar os PIDs disponíveis (o limite está em \`/proc/sys/kernel/pid_max\`). \`kill -9\` não resolve: o zumbi já está morto. O conserto é o pai chamar wait, ou o pai terminar.
        - **O pai termina antes do filho.** O filho vira um {{processo órfão|orphan process}} e continua rodando normalmente, mas é adotado pelo init, o processo de PID 1 (o systemd, na maioria das distribuições), ou por um processo marcado como *subreaper*. O adotante chama wait por ele quando ele terminar. É por isso que os zumbis de um pai que morreu somem: são adotados e recolhidos na hora.
      `),
      warn(`
        Num container, o seu programa costuma ser o PID 1. Se ele cria filhos e não chama wait por eles (nem pelos órfãos que herda), os zumbis se acumulam dentro do container. Por isso existe \`docker run --init\`, que põe um init mínimo (o tini) como PID 1 para recolher zumbis e repassar sinais.
      `, 'PID 1 em containers'),
      md(`
        ### Por que fork e exec são separados
        Entre o fork e o exec, o filho ainda está rodando o código do shell e pode **preparar o ambiente** do programa que vem depois. O novo programa herda os descritores, o diretório e as variáveis sem saber de nada. É assim que o shell implementa:

        - **\`cmd > saida.txt\`**: no filho, abre saida.txt e usa \`dup2(fd, 1)\` para que o descritor 1 (a saída padrão) passe a apontar para o arquivo; depois, exec do cmd. \`dup2(velho, novo)\` faz o descritor \`novo\` apontar para o mesmo arquivo aberto que \`velho\`, fechando antes o que \`novo\` era.
        - **\`cmd < entrada.txt\`**: o mesmo, com o descritor 0.
        - **\`a | b\`**: o shell cria um pipe (dois descritores, um de escrita e um de leitura) e faz dois forks. Num filho, a ponta de escrita vira o descritor 1 e ele faz exec de a; no outro, a ponta de leitura vira o 0 e ele faz exec de b.

        E o \`cd\`? Se ele fosse um programa à parte, rodaria num filho: o filho mudaria o **próprio** diretório e terminaria, e o shell continuaria onde estava. Por isso \`cd\`, \`export\` e \`exit\` são {{comandos internos|shell builtins}}: o shell os executa ele mesmo, sem fork (\`type cd\` responde *cd is a shell builtin*).

        O Windows seguiu outro caminho: \`CreateProcess\` cria o processo e carrega o programa numa chamada só, recebendo como parâmetros os redirecionamentos e o diretório. O POSIX também tem uma chamada combinada, \`posix_spawn\`. O \`subprocess\` do Python usa fork + exec, \`vfork\` ou \`posix_spawn\`, conforme o caso, mas a ideia é a mesma.

        ### E as threads?
        No Linux, processos e threads são, para o kernel, a mesma coisa: **tarefas**, cada uma com o seu \`task_struct\`. As duas nascem da mesma chamada de sistema, \`clone()\` (a função \`fork()\` da glibc também a usa por baixo). O que muda são as opções:

        - para um processo, o filho recebe **cópias**: memória, tabela de descritores, diretório;
        - para uma thread (\`pthread_create\` em C, \`threading.Thread\` no Python), o \`clone\` pede para **compartilhar** a memória (\`CLONE_VM\`), a tabela de descritores (\`CLONE_FILES\`), o diretório (\`CLONE_FS\`) e os tratadores de sinais (\`CLONE_SIGHAND\`), e para entrar no mesmo grupo (\`CLONE_THREAD\`).

        Cada thread tem a sua pilha, os seus registradores e um identificador próprio (TID), mas \`getpid()\` devolve o mesmo número em todas as threads do processo: o identificador do grupo. No \`ps -eLf\`, cada thread aparece numa linha, com o TID na coluna LWP.
      `),
      warn(`
        Num programa com várias threads, o fork copia **só a thread que o chamou**. Se outra thread estava segurando um lock naquele instante (dentro do \`malloc\` ou de um logger, por exemplo), o filho herda o lock fechado e ninguém vai abri-lo: o filho pode travar para sempre. Por isso, desde o Python 3.12, \`os.fork()\` emite um \`DeprecationWarning\` quando detecta várias threads, e no Python 3.14 o \`multiprocessing\` deixou de usar "fork" como padrão no Linux (passou a usar "forkserver"). Regra prática: num programa com threads, o filho de um fork só deve chamar exec; ou use \`subprocess\`.
      `, 'fork e threads não combinam'),
      deep(`
        \`printf("oi")\` em C sem quebra de linha, ou \`print("oi")\` no Python com a saída redirecionada para um arquivo ou pipe, não escreve na hora: o texto fica num buffer, na memória do processo, esperando encher. Se houver um fork nesse meio-tempo, o filho recebe uma cópia do buffer, e o "oi" sai **duas vezes** quando cada processo esvazia o seu. O remédio é chamar \`sys.stdout.flush()\` antes do fork e, num filho que não vai fazer exec, terminar com \`os._exit()\`, que não esvazia buffers nem roda as rotinas de saída herdadas do pai.
      `, 'Por que a saída às vezes aparece duplicada'),
    ],
    exemplo: [
      md(`
        O bash, com PID 1200, recebe a linha \`wc -l < notas.txt > total.txt\`: contar as linhas de notas.txt e guardar o resultado em total.txt. Acompanhe os processos e os descritores 0 (entrada), 1 (saída) e 2 (erro) de cada um:
      `),
      {
        type: 'table',
        head: ['Passo', 'Processo', 'O que faz', 'Descritores 0 / 1 / 2', 'Estado depois'],
        rows: [
          ['1', 'bash (1200)', 'lê a linha e separa: programa wc, argumento -l, entrada notas.txt, saída total.txt', 'terminal / terminal / terminal', 'executando'],
          ['2', 'bash (1200)', '`fork()` devolve 1201', 'o filho 1201 nasce com os mesmos três: terminal / terminal / terminal', 'pai e filho prontos ou executando'],
          ['3', 'bash (1200)', '`waitpid(1201)`: o filho ainda não terminou', '—', 'bash bloqueado'],
          ['4', 'filho (1201)', '`open("notas.txt")` devolve 3; `dup2(3, 0)`; `close(3)`', 'notas.txt / terminal / terminal', 'executando'],
          ['5', 'filho (1201)', '`open("total.txt")` para escrita, criando e truncando, devolve 3; `dup2(3, 1)`; `close(3)`', 'notas.txt / total.txt / terminal', 'executando'],
          ['6', 'filho (1201)', '`execvp("wc", ["wc", "-l"])`: o código do bash some do processo 1201 e entra o do wc', 'notas.txt / total.txt / terminal (o exec preserva)', 'executando, ainda com PID 1201'],
          ['7', 'wc (1201)', 'lê o descritor 0 até o fim, escreve "42" no 1 e chama `exit(0)`', '—', 'zumbi'],
          ['8', 'bash (1200)', 'o kernel acorda o bash; `waitpid` devolve 1201 e o status; o bash guarda `$?` = 0, e a entrada do 1201 sai da tabela', '—', 'bash pronto, depois executando'],
        ],
        caption: 'Os passos 3 e 4 podem acontecer em qualquer ordem, ou ao mesmo tempo em núcleos diferentes: depois do fork, quem roda primeiro é decisão do escalonador.',
      },
      md(`
        Repare em três detalhes:

        - **O wc não sabe de arquivo nenhum.** Ele lê do 0 e escreve no 1, como faria no terminal. Quem ligou os fios foi o shell, no filho, entre o fork e o exec.
        - **O total.txt é truncado no passo 5, antes de o wc rodar.** Por isso \`sort dados.txt > dados.txt\` apaga o arquivo: quando o sort vai ler dados.txt, o shell já o esvaziou.
        - **Entre os passos 7 e 8, o 1201 é um zumbi.** Aqui isso dura microssegundos, porque o bash já estava bloqueado no waitpid. Se o pai demorasse a chamar wait, um \`ps\` em outro terminal mostraria:
      `),
      code('text', `
        $ ps -o pid,ppid,stat,cmd -p 1200,1201
            PID    PPID STAT CMD
           1200    1100 Ss   bash
           1201    1200 Z    [wc] <defunct>
      `),
    ],
    codigo: [
      md('O Python do navegador (Pyodide) não cria processos: não há `os.fork` aqui, nem no Windows. O primeiro programa é para rodar no seu computador, com Linux ou macOS. O segundo é uma simulação que roda aqui e mostra a regra mais estranha do fork: ele retorna duas vezes.'),
      code('python', `
        import os
        import sys

        print(f"shell de brinquedo, PID {os.getpid()}")
        sys.stdout.flush()                        # não deixa o buffer ser copiado para o filho

        pid = os.fork()
        if pid == 0:                              # filho
            fd = os.open("lista.txt", os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o644)
            os.dup2(fd, 1)                        # saída padrão -> lista.txt
            os.close(fd)
            try:
                os.execvp("ls", ["ls", "-l"])     # se der certo, não volta
            except OSError as erro:
                print("exec falhou:", erro, file=sys.stderr)
                os._exit(127)                     # 127: "comando não encontrado"
        else:                                     # pai
            _, status = os.waitpid(pid, 0)
            print(f"filho {pid} terminou com código {os.waitstatus_to_exitcode(status)}")
            with open("lista.txt") as f:
                print(f.read()[:200])
      `, 'Rode no seu computador (Linux ou macOS): é o que o shell faz para ls -l > lista.txt.'),
      code('python', `
        import subprocess

        with open("lista.txt", "w") as saida:
            r = subprocess.run(["ls", "-l"], stdout=saida)   # cria o processo, redireciona, executa e espera
        print("código de saída:", r.returncode)
      `, 'O mesmo com a biblioteca padrão, que é o que você deve usar no dia a dia.'),
      py(`
        from collections import deque

        def rodar(programa):
            """Simula processos que executam o mesmo programa, uma instrução por vez, em revezamento."""
            proximo_pid = 101
            prontos = deque([{"pid": 100, "ppid": 99, "pc": 0, "mem": {"x": 0}}])
            while prontos:
                p = prontos.popleft()
                if p["pc"] == len(programa):
                    print(f"  [{p['pid']}] fim (pai: {p['ppid']})")
                    continue
                op, arg = programa[p["pc"]]
                p["pc"] += 1                                # o contador de programa avança
                if op == "fork":
                    filho = {"pid": proximo_pid, "ppid": p["pid"],
                             "pc": p["pc"],                 # o filho continua da MESMA instrução
                             "mem": dict(p["mem"])}         # com uma CÓPIA da memória
                    proximo_pid += 1
                    p["mem"][arg] = filho["pid"]            # no pai, fork devolve o PID do filho
                    filho["mem"][arg] = 0                   # no filho, devolve 0
                    prontos.append(filho)
                elif op == "soma":
                    p["mem"]["x"] += arg
                elif op == "soma_se_filho":
                    if p["mem"]["r"] == 0:
                        p["mem"]["x"] += arg
                elif op == "print":
                    print(f"  [{p['pid']}] {p['mem']}")
                prontos.append(p)

        print("Programa 1: um fork, e só o filho soma 100")
        rodar([("soma", 1), ("fork", "r"), ("soma_se_filho", 100), ("print", None)])
        print("Programa 2: dois forks seguidos")
        rodar([("fork", "a"), ("fork", "b"), ("print", None)])
      `, { caption: 'Cada processo simulado tem PID, contador de programa (pc) e memória própria. No programa 2, o processo 102 é neto do 100. Invente outros programas e preveja a saída antes de rodar.' }),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e8-fork-1',
          kind: 'mcq',
          prompt: 'Logo depois de `pid = os.fork()`, dois processos executam a linha seguinte. Que valor `pid` tem em cada um?',
          difficulty: 'facil',
          skills: ['so-processos'],
          hints: [
            'Os dois processos rodam o mesmo código. Como cada um descobre que papel tem?',
            'Qual dos dois precisa saber o PID do outro para poder esperar por ele com waitpid?',
          ],
          explanation: 'O fork devolve no pai o PID do filho, porque é o pai quem precisa dele para chamar waitpid; no filho devolve 0, que não pode ser o PID de um filho. O filho descobre o PID do pai com os.getppid(). A memória é copiada, mas o valor de retorno é posto depois, diferente em cada processo; e o filho continua da mesma instrução, não do começo do programa.',
          options: [
            { text: 'No pai, o PID do filho; no filho, 0', correct: true, feedback: 'Isso: o pai recebe o número de que precisa para esperar o filho, e o filho recebe 0, que nunca é o PID de um filho.' },
            { text: 'No pai, 0; no filho, o PID do pai', feedback: 'Está invertido. O filho não precisa receber o PID do pai: ele o obtém com os.getppid(). Quem precisa de um número é o pai, para chamar waitpid.' },
            { text: 'Nos dois, o PID do filho, porque a memória do pai é copiada para o filho', feedback: 'A memória é copiada, mas o valor de retorno do fork é colocado por último, e é diferente em cada processo. Se fosse igual, os dois não teriam como saber quem é quem.' },
            { text: 'Só o pai executa a linha seguinte: o filho começa do início do programa', feedback: 'O filho recebe uma cópia dos registradores, inclusive do contador de programa, e por isso continua exatamente do ponto do fork. Começar um programa do início é o que acontece depois de um exec.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e8-fork-2',
          kind: 'mcq',
          prompt: 'Quantas vezes este programa imprime `oi`? (Resolva de cabeça: no navegador não há fork.)',
          code: {
            lang: 'python',
            code: dedent(`
              import os

              for i in range(3):
                  if os.fork() == 0:
                      break
              print("oi")
            `),
          },
          difficulty: 'intermediario',
          skills: ['so-processos'],
          hints: [
            'Que valor o fork devolve no filho? O que o filho faz em seguida com esse valor?',
            'Algum filho chega a fazer outro fork? E o processo original, quantos forks faz?',
            'O processo original também chega ao print?',
          ],
          explanation: 'Cada filho recebe 0 do fork, sai do laço com break e vai direto ao print, sem fazer fork nenhum. Só o processo original passa pelas três voltas, criando 3 filhos, e depois também imprime: 1 + 3 = 4. Sem o break, cada fork duplicaria todos os processos que passam por ele, e seriam 2³ = 8. Com `if os.fork() != 0: break` (o pai sai e o filho continua), o resultado seria uma corrente pai → filho → neto → bisneto, também com 4 processos.',
          options: [
            { text: '4', correct: true, feedback: 'Isso: o processo original faz 3 forks e cada filho sai do laço na hora. São 3 filhos mais o original.' },
            { text: '8', feedback: 'Seriam 8 sem o break: aí cada fork duplicaria todos os processos que passam por ele (2³). Aqui o filho recebe 0 e sai do laço sem fazer mais forks.' },
            { text: '3', feedback: 'Você contou os filhos, mas esqueceu o processo original: depois das três voltas, ele também chega ao print.' },
            { text: '7', feedback: '7 é o número de processos criados por três forks sem o break (8 − 1). Aqui os filhos não fazem fork, e o original também imprime.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e8-fork-3',
          kind: 'parsons',
          lang: 'python',
          prompt: 'Monte o código (para Linux ou macOS) que faz o que o shell faz em `ls -l > lista.txt`: o filho redireciona a saída padrão para o arquivo e troca de programa; o pai espera e mostra o código de saída. O `import os` já foi feito.',
          difficulty: 'intermediario',
          skills: ['so-processos'],
          hints: [
            'Quem deve abrir o arquivo e mexer nos descritores: o pai ou o filho? O que aconteceria com a saída do próprio shell se fosse o pai?',
            'O dup2 precisa de um descritor que já exista. E depois de um exec bem-sucedido, alguma linha do filho ainda rodaria?',
            'Depois do dup2, o descritor 1 já aponta para o arquivo. O descritor devolvido pelo open ainda é necessário?',
          ],
          explanation: 'O fork vem primeiro. O filho (pid == 0) abre o arquivo, faz o descritor 1 apontar para ele com dup2, fecha a cópia que sobrou (o 1 continua apontando para o arquivo) e só então chama execvp, que não retorna se der certo; por isso ele é a última linha do filho. O pai, no else, bloqueia em waitpid até o ls terminar e converte o status em código de saída. Se o pai abrisse o arquivo e fizesse o dup2, a saída do próprio shell iria para lista.txt. Detalhe do Python: o descritor devolvido por os.open é marcado para fechar no exec (PEP 446), mas o os.dup2 cria o descritor 1 herdável, e é ele que o ls recebe.',
          lines: [
            'pid = os.fork()',
            'if pid == 0:',
            '    fd = os.open("lista.txt", os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o644)',
            '    os.dup2(fd, 1)',
            '    os.close(fd)',
            '    os.execvp("ls", ["ls", "-l"])',
            'else:',
            '    _, status = os.waitpid(pid, 0)',
            '    print("ls terminou com código", os.waitstatus_to_exitcode(status))',
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e8-fork-4',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            A tabela de processos de um kernel simulado é um dict \`PID → {"ppid": ..., "estado": ..., "status": ...}\`, com estados \`"executando"\`, \`"pronto"\`, \`"bloqueado"\` ou \`"zumbi"\`; \`status\` é o código de saída (só faz sentido nos zumbis).

            Escreva \`esperar(tabela, pai)\`, que imita o \`wait\` do processo \`pai\`:

            - se \`pai\` tem algum filho zumbi, recolha o de **menor PID**: remova-o da tabela e devolva a tupla \`(pid, status)\`;
            - se \`pai\` tem filhos, mas nenhum é zumbi, devolva \`None\` (no sistema de verdade, o pai ficaria bloqueado);
            - se \`pai\` não tem filho nenhum, devolva \`-1\` (o erro \`ECHILD\`).

            Só contam os filhos diretos (quem tem \`ppid == pai\`), não os netos.
          `),
          difficulty: 'intermediario',
          skills: ['so-processos'],
          hints: [
            'Quem são os filhos de pai? Que campo da tabela diz isso?',
            'Há três situações: nenhum filho, filhos sem zumbi, ao menos um zumbi. Em que ordem é mais simples testá-las?',
            'A ordem de um dict é a ordem de inserção. Ela garante o menor PID? Que função devolve o menor valor de uma coleção?',
            'Recolher é tirar da tabela. Que método de dict remove uma chave e devolve o valor ao mesmo tempo?',
          ],
          explanation: 'É o que o kernel faz num wait: procura entre os filhos diretos um que já terminou; se acha, devolve PID e código de saída e libera a entrada (o zumbi deixa de existir); se todos ainda estão vivos, o pai bloqueia; se não há filhos, falha com ECHILD. Um zumbi só é recolhido pelo próprio pai: o 203 do teste é neto do 200, e só o 202 pode recolhê-lo. Por isso um servidor que esquece o wait acumula zumbis, por mais que outros processos chamem wait.',
          starter: dedent(`
            def esperar(tabela, pai):
                # tabela: dict PID -> {"ppid": ..., "estado": ..., "status": ...}
                # devolva (pid, status) do filho zumbi de menor PID, removendo-o da tabela;
                # None se pai tem filhos, mas nenhum zumbi; -1 se pai não tem filhos
                pass
          `),
          solution: dedent(`
            def esperar(tabela, pai):
                filhos = [pid for pid, p in tabela.items() if p["ppid"] == pai]
                if not filhos:
                    return -1
                zumbis = [pid for pid in filhos if tabela[pid]["estado"] == "zumbi"]
                if not zumbis:
                    return None
                pid = min(zumbis)
                status = tabela.pop(pid)["status"]
                return (pid, status)
          `),
          tests: [
            {
              name: 'recolhe zumbis do menor PID para o maior',
              code: TABELA_WAIT + '\n' + dedent(`
                t = _tabela()
                r = esperar(t, 200)
                assert r == (201, 3), f"o processo 200 tem dois filhos zumbis (201 e 204): recolha o de menor PID e devolva (pid, status); veio {r!r}"
                assert 201 not in t, "depois de recolhido, o zumbi 201 precisa sair da tabela: é isso que libera a entrada dele"
                r = esperar(t, 200)
                assert r == (204, 0), f"na segunda chamada sobra o zumbi 204, que terminou com status 0; veio {r!r}"
                assert 204 not in t, "o zumbi 204 também precisa sair da tabela"
              `),
            },
            {
              name: 'filhos vivos e nenhum zumbi: o pai bloquearia',
              code: TABELA_WAIT + '\n' + dedent(`
                t = _tabela()
                del t[201], t[204]
                r = esperar(t, 200)
                assert r is None, f"200 tem um filho vivo (202, bloqueado) e nenhum zumbi: o pai ficaria bloqueado, então devolva None; veio {r!r}"
                assert 202 in t, "202 está vivo: não pode sair da tabela"
                t = {1: {"ppid": 0, "estado": "executando", "status": None},
                     7: {"ppid": 1, "estado": "pronto", "status": None}}
                r = esperar(t, 1)
                assert r is None, f"o filho 7 está pronto (vivo): devolva None; veio {r!r}"
              `),
            },
            {
              name: 'só filhos diretos contam',
              code: TABELA_WAIT + '\n' + dedent(`
                t = _tabela()
                r = esperar(t, 1)
                assert r is None, f"o init (1) tem um filho vivo (200); o 203 é zumbi, mas é neto do init, e não filho: devolva None; veio {r!r}"
                assert 203 in t, "o 203 não é filho do 1: não pode ser recolhido por ele"
                r = esperar(t, 202)
                assert r == (203, 7), f"o 203 é filho do 202 e terminou com status 7; veio {r!r}"
              `),
            },
            {
              name: 'sem filhos: -1',
              code: TABELA_WAIT + '\n' + dedent(`
                t = _tabela()
                r = esperar(t, 204)
                assert r == -1, f"204 não tem filhos: o wait falharia na hora (ECHILD), então devolva -1; veio {r!r}"
                r = esperar(t, 999)
                assert r == -1, f"um processo sem filhos na tabela devolve -1; veio {r!r}"
                t = {1: {"ppid": 0, "estado": "executando", "status": None},
                     5: {"ppid": 1, "estado": "zumbi", "status": 0}}
                r = esperar(t, 1)
                assert r == (5, 0), f"o filho 5 é zumbi com status 0: devolva (5, 0); veio {r!r}"
                r = esperar(t, 1)
                assert r == -1, f"depois de recolher o único filho, o pai não tem mais filhos: -1; veio {r!r}"
              `),
            },
            {
              name: 'menor PID mesmo fora da ordem do dict',
              code: dedent(`
                t = {1: {"ppid": 0, "estado": "executando", "status": None},
                     300: {"ppid": 1, "estado": "zumbi", "status": 30},
                     250: {"ppid": 1, "estado": "zumbi", "status": 25},
                     280: {"ppid": 1, "estado": "executando", "status": None}}
                r = esperar(t, 1)
                assert r == (250, 25), f"os zumbis filhos do 1 são 300 e 250: o de menor PID é o 250, mesmo aparecendo depois no dict; veio {r!r}"
                r = esperar(t, 1)
                assert r == (300, 30), f"depois sobra o zumbi 300; veio {r!r}"
                r = esperar(t, 1)
                assert r is None, f"sobrou só o 280, vivo: None; veio {r!r}"
              `),
            },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e8-fork-5',
          kind: 'fix',
          lang: 'python',
          prompt: dedent(`
            Este mini-shell simula o fork com \`copy.deepcopy\`: cada comando roda numa **cópia** do estado do shell (diretório atual e variáveis de ambiente), como um processo filho. \`NOME=valor comando\` define uma variável só para aquele comando, como no bash.

            O problema: \`cd /tmp\` seguido de \`pwd\` continua mostrando o diretório antigo, e \`export\` não tem efeito. Corrija \`rodar\` para que \`cd\` e \`export\` funcionem como no bash, sem estragar o resto: os outros comandos continuam rodando numa cópia, e \`LANG=C printenv LANG\` não pode mudar o \`LANG\` do shell. Vale o mesmo para um comando interno: \`LANG=C cd /tmp\` muda o diretório do shell, mas não o \`LANG\` dele.
          `),
          difficulty: 'intermediario',
          skills: ['so-processos'],
          hints: [
            'Rode cd /tmp e depois pwd. O cd mudou o diretório de quem?',
            'Quando o filho termina, o que acontece com as mudanças que ele fez na própria cópia?',
            'No bash de verdade, o cd passa por fork? Que comandos precisam rodar no próprio shell?',
            'Se você simplesmente remover a cópia, o que acontece com LANG=C printenv LANG?',
          ],
          explanation: 'cd e export mudam o estado do próprio shell, e um filho não consegue mudar o estado do pai: quando ele termina, a cópia some com ele. Por isso o bash trata esses comandos como internos (builtins) e os executa antes de qualquer fork. Os demais continuam numa cópia, e é isso que faz NOME=valor comando valer só para aquele comando. Tirar o deepcopy de tudo "consertaria" o cd, mas faria o LANG=C vazar para o shell.',
          starter: dedent(`
            import copy

            def rodar(shell, linha):
                """Executa uma linha no mini-shell e devolve a saída (str).
                shell = {"cwd": diretório atual, "env": dict de variáveis de ambiente}"""
                palavras = linha.split()
                filho = copy.deepcopy(shell)          # fork(): o filho começa como uma cópia do shell
                # NOME=valor antes do comando vale só para aquele comando
                while "=" in palavras[0]:
                    nome, valor = palavras.pop(0).split("=", 1)
                    filho["env"][nome] = valor
                comando, args = palavras[0], palavras[1:]
                # daqui para baixo, é o programa que o filho roda depois do exec
                if comando == "cd":
                    filho["cwd"] = args[0]
                    return ""
                if comando == "export":
                    nome, valor = args[0].split("=", 1)
                    filho["env"][nome] = valor
                    return ""
                if comando == "pwd":
                    return filho["cwd"]
                if comando == "printenv":
                    return filho["env"].get(args[0], "")
                return comando + ": comando não encontrado"
          `),
          solution: dedent(`
            import copy

            def rodar(shell, linha):
                """Executa uma linha no mini-shell e devolve a saída (str).
                shell = {"cwd": diretório atual, "env": dict de variáveis de ambiente}"""
                palavras = linha.split()
                # NOME=valor antes do comando vale só para aquele comando
                temporarias = []
                while "=" in palavras[0]:
                    temporarias.append(palavras.pop(0).split("=", 1))
                comando, args = palavras[0], palavras[1:]
                # comandos internos: mudam o estado do próprio shell, então rodam sem fork
                if comando == "cd":
                    shell["cwd"] = args[0]
                    return ""
                if comando == "export":
                    nome, valor = args[0].split("=", 1)
                    shell["env"][nome] = valor
                    return ""
                filho = copy.deepcopy(shell)          # fork(): o filho começa como uma cópia do shell
                for nome, valor in temporarias:
                    filho["env"][nome] = valor
                # daqui para baixo, é o programa que o filho roda depois do exec
                if comando == "pwd":
                    return filho["cwd"]
                if comando == "printenv":
                    return filho["env"].get(args[0], "")
                return comando + ": comando não encontrado"
          `),
          tests: [
            {
              name: 'cd muda o diretório do shell',
              code: dedent(`
                sh = {"cwd": "/home/ana", "env": {"LANG": "pt_BR.UTF-8", "HOME": "/home/ana"}}
                assert rodar(sh, "pwd") == "/home/ana", "pwd deve mostrar o diretório atual do shell"
                assert rodar(sh, "cd /tmp") == "", "cd não imprime nada"
                r = rodar(sh, "pwd")
                assert r == "/tmp", f"depois de 'cd /tmp', pwd deveria mostrar /tmp, mas mostrou {r!r}: o cd mudou o diretório de quem?"
                rodar(sh, "cd /var/log")
                assert sh["cwd"] == "/var/log", "o diretório atual do próprio shell (shell['cwd']) precisa mudar"
              `),
            },
            {
              name: 'export muda o ambiente do shell',
              code: dedent(`
                sh = {"cwd": "/home/ana", "env": {"LANG": "pt_BR.UTF-8", "HOME": "/home/ana"}}
                rodar(sh, "export CIDADE=Recife")
                r = rodar(sh, "printenv CIDADE")
                assert r == "Recife", f"depois de 'export CIDADE=Recife', printenv CIDADE deveria dar 'Recife', mas deu {r!r}"
                rodar(sh, "export LANG=C")
                r = rodar(sh, "printenv LANG")
                assert r == "C", f"depois de 'export LANG=C', printenv LANG deveria dar 'C', mas deu {r!r}"
              `),
            },
            {
              name: 'NOME=valor comando não vaza para o shell',
              code: dedent(`
                def _novo():
                    return {"cwd": "/home/ana", "env": {"LANG": "pt_BR.UTF-8", "HOME": "/home/ana"}}
                sh = _novo()
                r = rodar(sh, "LANG=C printenv LANG")
                assert r == "C", f"'LANG=C printenv LANG' vale para aquele comando: deveria imprimir C, imprimiu {r!r}"
                r = rodar(sh, "printenv LANG")
                assert r == "pt_BR.UTF-8", f"'LANG=C comando' não pode mudar o shell: depois dele, LANG continua pt_BR.UTF-8, mas veio {r!r}. Os comandos que não são internos ainda precisam rodar numa cópia (o fork continua necessário para eles)"
                rodar(sh, "pwd")
                rodar(sh, "ls -l")
                assert sh == _novo(), "pwd e programas externos não podem alterar o estado do shell"
              `),
            },
            {
              name: 'NOME=valor antes de um comando interno também é temporário',
              code: dedent(`
                sh = {"cwd": "/home/ana", "env": {"LANG": "pt_BR.UTF-8", "HOME": "/home/ana"}}
                assert rodar(sh, "LANG=C cd /tmp") == "", "cd não imprime nada, mesmo com NOME=valor na frente"
                r = rodar(sh, "pwd")
                assert r == "/tmp", f"'LANG=C cd /tmp' ainda é um cd: o diretório do shell deveria virar /tmp, mas pwd mostrou {r!r}"
                r = rodar(sh, "printenv LANG")
                assert r == "pt_BR.UTF-8", f"no bash, 'LANG=C cd /tmp' muda o diretório, mas o LANG=C vale só durante o cd: depois dele, LANG continua pt_BR.UTF-8, e veio {r!r}. O shell não pode copiar para si tudo o que o filho mudou"
              `),
            },
            {
              name: 'comando desconhecido',
              code: dedent(`
                sh = {"cwd": "/home/ana", "env": {}}
                r = rodar(sh, "ls -l")
                assert r == "ls: comando não encontrado", f"comando desconhecido: veio {r!r}"
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
          id: 'e8-fork-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Simule a tabela de processos de um kernel Unix. Escreva \`simular(eventos)\`, que devolve a tupla \`(colhidos, tabela)\`.

            O sistema começa só com o init: PID 1, sem pai (PPID 0). Os PIDs novos são 2, 3, 4, ..., em ordem de criação, e nunca são reaproveitados. Os eventos são:

            - \`("fork", p)\`: p cria um filho, que começa \`"ativo"\`;
            - \`("exit", p, codigo)\`: p termina e vira \`"zumbi"\` com esse código;
            - \`("wait", p)\`: se p tem filho zumbi, recolhe o de menor PID; se tem filhos, mas nenhum zumbi, p fica \`"bloqueado"\`; se não tem filho nenhum, a chamada falha na hora.

            Regras do kernel:

            1. Quando p termina, os filhos dele (vivos ou zumbis) são adotados pelo init.
            2. O init está sempre esperando: todo zumbi filho do init, inclusive um que acabou de ser adotado, é recolhido por ele na hora.
            3. Um processo bloqueado em wait é acordado quando um filho dele termina: recolhe esse filho na hora e volta a \`"ativo"\`.

            \`colhidos\` é a lista de tuplas \`(pai, filho, codigo)\`, na ordem em que acontecem; um wait que falha registra \`(p, -1, None)\`. Quando um exit causa várias colheitas, primeiro vêm as dos zumbis adotados pelo init, em ordem crescente de PID, e por último a do próprio processo que terminou.

            \`tabela\` é um dict \`PID → (PPID, estado)\` com todos os processos que ainda estão na tabela (\`"ativo"\`, \`"bloqueado"\` ou \`"zumbi"\`), inclusive \`1: (0, "ativo")\`. Os eventos nunca pedem exit ou wait do init, nem citam processo inexistente, zumbi ou bloqueado.
          `),
          difficulty: 'desafio',
          skills: ['so-processos'],
          hints: [
            'Que informações você precisa guardar de cada processo para responder: quem é o pai, em que estado está, com que código terminou?',
            'No exit de p, quais são os destinos possíveis do próprio p? Do que isso depende?',
            'Antes de decidir o destino de p, resolva os filhos dele. Algum já era zumbi? Quem é o pai deles agora?',
            'Um wait que bloqueia não registra nada na hora. Em que evento ele termina, e quem registra a colheita?',
            'Cuidado ao remover itens de um dict enquanto percorre esse mesmo dict.',
          ],
          explanation: 'O núcleo do problema é o exit: o processo vira zumbi, os filhos dele passam para o init (que recolhe na hora os que já eram zumbis) e, por fim, o próprio zumbi é recolhido se o pai é o init ou está bloqueado em wait; senão, ele fica na tabela até o pai chamar wait. O wait é a outra metade: recolhe se já há zumbi, bloqueia se há filhos vivos, falha se não há filhos. É a mesma lógica que o Linux segue no exit e no wait, e é por isso que zumbis só se acumulam quando um pai vivo nunca chama wait: órfãos sempre acabam recolhidos pelo init.',
          starter: dedent(`
            def simular(eventos):
                # devolva (colhidos, tabela)
                # colhidos: lista de (pai, filho, codigo), na ordem em que acontecem
                # tabela: dict PID -> (PPID, estado) dos processos que ainda estão na tabela
                pass
          `),
          solution: dedent(`
            def simular(eventos):
                tabela = {1: {"ppid": 0, "estado": "ativo", "codigo": None}}
                colhidos = []
                proximo = 2

                def recolher(pai, filho):
                    colhidos.append((pai, filho, tabela.pop(filho)["codigo"]))

                for ev in eventos:
                    if ev[0] == "fork":
                        tabela[proximo] = {"ppid": ev[1], "estado": "ativo", "codigo": None}
                        proximo += 1
                    elif ev[0] == "exit":
                        _, p, codigo = ev
                        tabela[p]["estado"] = "zumbi"
                        tabela[p]["codigo"] = codigo
                        for pid in sorted(tabela):
                            if pid in tabela and tabela[pid]["ppid"] == p:
                                tabela[pid]["ppid"] = 1
                                if tabela[pid]["estado"] == "zumbi":
                                    recolher(1, pid)
                        pai = tabela[p]["ppid"]
                        if pai == 1:
                            recolher(1, p)
                        elif tabela[pai]["estado"] == "bloqueado":
                            tabela[pai]["estado"] = "ativo"
                            recolher(pai, p)
                    elif ev[0] == "wait":
                        p = ev[1]
                        filhos = sorted(pid for pid in tabela if tabela[pid]["ppid"] == p)
                        zumbis = [pid for pid in filhos if tabela[pid]["estado"] == "zumbi"]
                        if not filhos:
                            colhidos.append((p, -1, None))
                        elif zumbis:
                            recolher(p, zumbis[0])
                        else:
                            tabela[p]["estado"] = "bloqueado"
                return colhidos, {pid: (x["ppid"], x["estado"]) for pid, x in tabela.items()}
          `),
          tests: [
            {
              name: 'o shell roda um comando e espera',
              code: REF_KERNEL + '\n' + dedent(`
                _confere_kernel([("fork", 1)], "o init (1) cria o 2, que começa ativo; nada é recolhido")
                _confere_kernel([("fork", 1), ("fork", 2), ("wait", 2)], "o shell (2) tem um filho vivo: ele bloqueia e nada é recolhido ainda")
                _confere_kernel([("fork", 1), ("fork", 2), ("wait", 2), ("exit", 3, 0)], "quando o 3 termina, o pai bloqueado (2) acorda, recolhe o 3 e volta a ativo")
              `),
            },
            {
              name: 'zumbi espera o wait do pai',
              code: REF_KERNEL + '\n' + dedent(`
                _confere_kernel([("fork", 1), ("fork", 2), ("exit", 3, 7)], "o pai (2) ainda não chamou wait: o 3 fica na tabela como zumbi")
                _confere_kernel([("fork", 1), ("fork", 2), ("exit", 3, 7), ("wait", 2)], "o wait do 2 recolhe o zumbi 3, com código 7")
                _confere_kernel([("fork", 1), ("wait", 2)], "o 2 não tem filhos: o wait falha na hora e registra (2, -1, None)")
              `),
            },
            {
              name: 'órfãos são adotados e recolhidos pelo init',
              code: REF_KERNEL + '\n' + dedent(`
                _confere_kernel([("fork", 1), ("fork", 2), ("exit", 2, 0)], "o 2 é filho do init, que o recolhe na hora; o 3, órfão, passa a ter PPID 1")
                _confere_kernel([("fork", 1), ("fork", 2), ("exit", 2, 0), ("exit", 3, 5)], "o 3 foi adotado pelo init, então o init o recolhe quando ele termina")
                _confere_kernel([("fork", 1), ("fork", 2), ("fork", 2), ("exit", 4, 9), ("exit", 2, 1)], "o zumbi 4 é adotado e recolhido pelo init antes de o próprio 2 ser recolhido")
                _confere_kernel([("fork", 1), ("fork", 2), ("fork", 3), ("wait", 3), ("exit", 2, 0)], "o 3 está bloqueado esperando o 4; ao ser adotado pelo init, continua bloqueado")
                _confere_kernel([("fork", 1), ("fork", 2), ("fork", 2), ("fork", 2), ("exit", 5, 5), ("exit", 3, 3), ("exit", 2, 2)], "o 2 termina com dois filhos zumbis (3 e 5) e um vivo (4): o init recolhe o 3, depois o 5 (ordem crescente de PID), e por último o próprio 2; o 4 fica órfão, com PPID 1")
              `),
            },
            {
              name: 'wait recolhe o menor PID e bloqueia quando só há vivos',
              code: REF_KERNEL + '\n' + dedent(`
                eventos = [("fork", 1), ("fork", 2), ("fork", 2), ("fork", 2), ("exit", 5, 50), ("exit", 4, 40),
                           ("wait", 2), ("wait", 2), ("wait", 2), ("exit", 3, 30), ("wait", 2)]
                _confere_kernel(eventos, "o 2 recolhe o 4 e depois o 5 (menor PID primeiro), bloqueia esperando o 3, é acordado quando o 3 termina e, sem filhos, o último wait falha")
              `),
            },
            {
              name: 'quem acorda o pai bloqueado',
              code: REF_KERNEL + '\n' + dedent(`
                _confere_kernel([("fork", 1), ("fork", 2), ("fork", 3), ("exit", 4, 4), ("wait", 2), ("exit", 3, 3)], "quando o 3 termina, o init recolhe primeiro o zumbi 4 (que era filho do 3) e depois o 2, bloqueado, recolhe o 3")
                _confere_kernel([("fork", 1), ("fork", 2), ("fork", 1), ("wait", 2), ("exit", 4, 0)], "o 4 não é filho do 2: o fim dele não acorda o 2, que continua bloqueado")
                _confere_kernel([("fork", 1), ("exit", 2, 0), ("fork", 1)], "PIDs não são reaproveitados: depois do 2, o próximo é o 3")
              `),
            },
            {
              name: 'sequências aleatórias',
              code: REF_KERNEL + '\n' + dedent(`
                rng = _random.Random(8)
                for _ in range(200):
                    _confere_kernel(_gera_eventos(rng, rng.randint(1, 18)))
              `),
            },
          ],
        },
      },
    ],
    projeto: [
      md(`
        **Mini-shell de verdade.** No seu computador (Linux ou macOS), escreva em Python um shell que lê uma linha, separa as palavras com \`shlex.split\` e executa com \`os.fork\`, \`os.execvp\` e \`os.waitpid\`. Vá por partes: (1) comandos simples, mostrando o código de saída; (2) \`cd\` e \`exit\` como comandos internos; (3) \`> arquivo\` e \`< arquivo\` com \`os.open\` e \`os.dup2\`; (4) um pipe \`a | b\` com \`os.pipe()\` e dois forks; (5) faça o pai demorar a chamar wait (um \`time.sleep\` antes do waitpid) e encontre o zumbi no \`ps\` de outro terminal. O OSTEP propõe um projeto parecido, em C: o shell *wish*, no repositório ostep-projects.
      `),
    ],
    revisao: [
      md(`
        - PCB (\`task_struct\` no Linux): PID, PPID, estado, registradores salvos, memória, descritores, diretório, prioridade, código de saída.
        - Transições: bloqueado volta para pronto, nunca direto para executando; a preempção leva de executando para pronto.
        - \`fork\`: devolve o PID do filho no pai e 0 no filho; memória copiada (com cópia na escrita); a ordem de execução depois dele é indefinida. n forks seguidos deixam 2ⁿ processos.
        - \`exec\`: troca o programa e mantém PID, diretório e descritores; se der certo, não retorna.
        - \`wait\`/\`waitpid\`: bloqueia até um filho terminar e recolhe o código (0 = sucesso; morto pelo sinal n → 128 + n no bash).
        - Zumbi: terminou e o pai não chamou wait. Órfão: o pai terminou antes; o init adota e recolhe.
        - Entre o fork e o exec, o shell prepara redirecionamentos e pipes com \`dup2\`; \`cd\` e \`export\` são internos porque mudam o próprio shell.
        - No Linux, processo e thread saem de \`clone()\`: a thread compartilha memória e descritores. Fork num programa com threads copia só a thread que chamou.
      `),
      english(`
        - **fork / exec / wait**: as três chamadas que criam processos, trocam o programa e recolhem o filho
        - **parent / child process**: processo pai / filho
        - **exit status / exit code**: código de saída
        - **zombie (defunct) process**: processo zumbi
        - **orphan process / reparenting**: processo órfão / adoção pelo init
        - **file descriptor, redirection, pipe**: descritor de arquivo, redirecionamento, pipe
        - **shell builtin**: comando interno do shell

        Frase típica de entrevista: *"fork() returns twice: it returns the child's PID in the parent and zero in the child. The shell forks, sets up redirections in the child, and then calls exec, so the new program inherits the file descriptors."*

        Frase típica de documentação (man 2 wait): *"A child that terminates, but has not been waited for becomes a zombie."*
      `),
    ],
  },
  review: [
    ['O que fork() devolve no pai e no filho? E se falhar?', 'No pai, o PID do filho; no filho, 0. Se falhar, devolve −1 no pai (em C) e nenhum filho é criado; no Python, levanta OSError.'],
    ['O que exec troca e o que preserva?', 'Troca o programa inteiro (código, dados, heap e pilha). Preserva PID, PPID, diretório atual e os descritores abertos, exceto os marcados close-on-exec. Se der certo, não retorna.'],
    ['O que é um processo zumbi e como ele desaparece?', 'Um processo que terminou, mas cujo pai ainda não chamou wait. Desaparece quando o pai chama wait ou quando o pai termina e o init o adota e recolhe.'],
    ['O que acontece com um processo órfão?', 'Continua rodando, adotado pelo init (PID 1) ou por um subreaper, que chama wait por ele quando ele terminar.'],
    ['Por que cd precisa ser um comando interno do shell?', 'Porque o diretório atual pertence ao processo. Num filho, o cd mudaria só o diretório do filho, que logo termina, e o shell ficaria onde estava.'],
    ['Como o shell executa `cmd > arq.txt`?', 'Faz fork; no filho, abre arq.txt, usa dup2 para que ele vire o descritor 1 e faz exec do cmd; o pai espera com waitpid.'],
    ['Qual é o $? no bash de um processo morto por kill -9?', '137, isto é, 128 + 9 (SIGKILL).'],
    ['No Linux, o que diferencia criar uma thread de criar um processo?', 'Os dois usam clone(). A thread compartilha memória, descritores e grupo (CLONE_VM, CLONE_FILES, CLONE_THREAD...); o processo recebe cópias.'],
  ],
  references: ['ostep', 'linux-man', 'tanenbaum-so', 'python-docs'],
});

/* ------------------------------------------------------------------ */
/* Prioridades, MLFQ e o custo da troca de contexto                    */
/* ------------------------------------------------------------------ */

/** Referência do escalonamento por prioridade com envelhecimento (testes aleatórios). */
const REF_ENVELHECIMENTO = dedent(`
  def _ref_envelhecimento(processos, k):
      restantes = sorted(processos, key=lambda p: p[1])
      t, ordem = 0, []
      while restantes:
          prontos = [p for p in restantes if p[1] <= t]
          if not prontos:
              t = restantes[0][1]
              continue
          escolhido = prontos[0]
          for p in prontos[1:]:
              a = (p[3] - (t - p[1]) // k, p[1], p[0])
              b = (escolhido[3] - (t - escolhido[1]) // k, escolhido[1], escolhido[0])
              if a < b:
                  escolhido = p
          ordem.append(escolhido[0])
          t += escolhido[2]
          restantes.remove(escolhido)
      return ordem
`);

/** Referência da MLFQ do desafio (testes aleatórios). */
const REF_MLFQ = dedent(`
  def _ref_mlfq(processos, quanta, s):
      ordem = sorted(enumerate(processos), key=lambda ip: (ip[1][1], ip[0]))
      pendentes = [p for _, p in ordem]
      resta = {p[0]: p[2] for p in processos}
      filas = [[] for _ in quanta]
      gantt, t, prox_ref, ultimo = [], 0, s, None
      while pendentes or any(filas) or ultimo:
          while pendentes and pendentes[0][1] <= t:
              filas[0].append(pendentes.pop(0)[0])
          if ultimo:
              nome, nivel = ultimo
              filas[min(nivel + 1, len(quanta) - 1)].append(nome)
              ultimo = None
          if s is not None and t >= prox_ref:
              filas = [sum(filas, [])] + [[] for _ in quanta[1:]]
              prox_ref = (t // s + 1) * s
          cheias = [i for i, f in enumerate(filas) if f]
          if not cheias:
              t = pendentes[0][1]
              continue
          nivel = cheias[0]
          nome = filas[nivel].pop(0)
          fatia = min(quanta[nivel], resta[nome])
          gantt.append((nome, t, t + fatia))
          t += fatia
          resta[nome] -= fatia
          if resta[nome]:
              ultimo = (nome, nivel)
      return gantt

  def _confere_mlfq(processos, quanta, s, dica=""):
      esperado = _ref_mlfq(processos, quanta, s)
      r = mlfq(processos, quanta, s)
      assert r == esperado, f"mlfq({processos}, {quanta}, {s}) devolveu {r}, esperado {esperado}. {dica}"
`);

const prioridades = lesson({
  id: 'l8-prioridades-mlfq',
  moduleId: 'm8-1',
  title: 'Prioridades, MLFQ e o custo da troca de contexto',
  titleEn: 'Priorities, MLFQ and the cost of context switching',
  summary: 'Como medir um escalonador (retorno × resposta), como prioridades causam inanição e o envelhecimento a evita, como a fila multinível com realimentação aprende quem é interativo sem saber a duração de ninguém, o que acontece numa troca de contexto e como o tamanho do quantum equilibra resposta e desperdício.',
  minutes: 50,
  objectives: [
    'Calcular tempo de retorno e tempo de resposta e explicar por que o Round Robin vai bem num e mal no outro',
    'Simular escalonamento por prioridade e explicar inanição e envelhecimento',
    'Aplicar as cinco regras da MLFQ e explicar para que serve cada uma, inclusive contra quem tenta enganar o escalonador',
    'Descrever os passos de uma troca de contexto e diferenciar trocas voluntárias e involuntárias',
    'Calcular o desperdício de CPU de um quantum e escolher entre quantum curto e longo',
    'Relacionar nice, CFS/EEVDF e as políticas de tempo real do Linux com esses conceitos',
  ],
  skills: ['so-processos'],
  terms: [
    t('tempo de retorno', 'turnaround time', 'Da chegada do processo até ele terminar: término − chegada.'),
    t('tempo de resposta', 'response time', 'Da chegada até a primeira vez que o processo roda: primeira execução − chegada.', 'Round Robin trades turnaround time for response time.'),
    t('menor tempo restante primeiro', 'shortest remaining time first (SRTF)', 'Versão preemptiva do SJF: um processo que chega com duração menor do que o que falta ao atual toma a CPU.'),
    t('escalonamento por prioridade', 'priority scheduling', 'A CPU vai para o processo pronto de maior prioridade; empates se resolvem com outra política, como FCFS ou Round Robin.'),
    t('inanição', 'starvation', 'Situação em que um processo pronto nunca recebe a CPU porque sempre há alguém mais prioritário.'),
    t('envelhecimento', 'aging', 'Aumentar aos poucos a prioridade de quem espera há muito tempo, para evitar a inanição.'),
    t('fila multinível com realimentação', 'multi-level feedback queue (MLFQ)', 'Várias filas de prioridade; o processo desce ou volta ao topo conforme o comportamento observado.'),
    t('limite de tempo', 'time allotment', 'Na MLFQ, quanto tempo de CPU um processo pode gastar num nível antes de descer.'),
    t('reforço de prioridade', 'priority boost', 'Na MLFQ, devolver periodicamente todos os processos à fila mais alta.'),
    t('interrupção do temporizador', 'timer interrupt', 'Interrupção periódica do hardware que devolve o controle ao kernel e torna a preempção possível.'),
    t('troca voluntária', 'voluntary context switch', 'Troca de contexto que acontece porque o processo bloqueou (E/S, sleep, wait).'),
    t('troca involuntária', 'involuntary context switch', 'Troca de contexto em que o kernel tira a CPU do processo (fim do quantum ou alguém mais prioritário).'),
    t('sobrecarga', 'overhead', 'Trabalho que não é do usuário, como trocar de contexto; reduz a fração útil da CPU.'),
    t('valor nice', 'nice value', 'No Linux, a "gentileza" de um processo comum, de −20 (mais prioridade) a 19 (menos); o padrão é 0.', 'Run the backup with nice -n 19 so it does not slow down the server.'),
  ],
  stages: {
    conceito: [
      md(`
        FCFS, SJF e Round Robin, da primeira lição deste módulo, ou supõem que todo processo é igual, ou supõem que o sistema sabe quanto cada um vai durar. No seu computador, nenhuma das duas coisas é verdade: enquanto um \`npm install\` ou o treino de um modelo consome CPU por minutos, você digita num editor que precisa responder em milissegundos, e o sistema não sabe de antemão quem é quem.

        A resposta dos sistemas reais é a **prioridade**: alguns processos passam na frente. Ela pode ser dada por alguém (o \`nice\` do Linux) ou aprendida pelo sistema, observando o comportamento: quem usa a fatia de CPU inteira parece um trabalho longo e desce; quem larga a CPU cedo para esperar o teclado parece interativo e fica no alto. Essa é a ideia da {{fila multinível com realimentação|multi-level feedback queue (MLFQ)}}.

        E toda troca tem preço: cada troca de contexto gasta um tempo que não é de ninguém. Escolher o tamanho do quantum é escolher entre responder rápido e desperdiçar CPU.
      `),
    ],
    explicacao: [
      md(`
        ### Duas réguas: retorno e resposta
        Para comparar escalonadores, a primeira lição deste módulo usou o tempo de espera. Duas outras medidas dizem mais sobre o que o usuário sente:

        - {{tempo de retorno|turnaround time}} = término − chegada. É o que importa num trabalho em lote: o relatório, a compilação, o backup.
        - {{tempo de resposta|response time}} = primeira execução − chegada. É o que importa num programa interativo: o clique precisa dar sinal de vida logo, mesmo que o trabalho todo demore.

        Três processos, A, B e C, chegam juntos no instante 0 e precisam de 5 unidades de CPU cada:
      `),
      {
        type: 'table',
        head: ['Política', 'Linha do tempo', 'Retorno de A, B, C', 'Retorno médio', 'Resposta de A, B, C', 'Resposta média'],
        rows: [
          ['FCFS (aqui igual ao SJF)', 'AAAAA BBBBB CCCCC', '5, 10, 15', '10', '0, 5, 10', '5'],
          ['Round Robin, quantum 1', 'ABCABCABCABCABC', '13, 14, 15', '14', '0, 1, 2', '1'],
        ],
      },
      md(`
        O Round Robin é o melhor possível em resposta e um dos piores em retorno: ele estica todo mundo até o fim. Nenhuma política vence nas duas réguas ao mesmo tempo, e quem escolhe um escalonador está escolhendo qual delas sacrificar.

        Se as durações fossem conhecidas, o melhor para o retorno médio seria o {{menor tempo restante primeiro|shortest remaining time first (SRTF)}}, a versão preemptiva do SJF: quando chega um processo mais curto do que o que falta ao atual, ele toma a CPU. O problema de sempre: o sistema não sabe quanto cada processo vai durar.

        ### Prioridades, inanição e envelhecimento
        No {{escalonamento por prioridade|priority scheduling}}, cada processo tem um número, e a CPU vai para o processo pronto de maior prioridade; empates se resolvem com FCFS ou Round Robin. Ele pode ser **preemptivo** (um processo mais prioritário que fica pronto toma a CPU na hora) ou **não preemptivo** (espera o atual terminar ou bloquear). O SJF é um caso particular, em que a prioridade é a duração.
      `),
      warn(`
        Qual número é "mais prioritário" depende do sistema. No Linux, um \`nice\` **menor** é mais prioritário (−20 é o mais favorecido), e muitos livros também tratam 0 como a prioridade mais alta. No Windows é o contrário: 31 é a mais alta. Antes de ler um número de prioridade, descubra a convenção. Nesta lição, **menor número = mais prioridade**.
      `, 'Número maior, prioridade maior?'),
      md(`
        O risco é a {{inanição|starvation}}: com um fluxo constante de processos mais prioritários, um processo de baixa prioridade pode nunca rodar. Um boato famoso, registrado no livro de sistemas operacionais de Silberschatz, conta que, quando desligaram o IBM 7094 do MIT em 1973, encontraram um processo de baixa prioridade enviado em 1967 que ainda não tinha rodado.

        O remédio clássico é o {{envelhecimento|aging}}: quanto mais tempo um processo espera, mais a prioridade dele sobe, até ele passar na frente de todo mundo. Uma regra simples: prioridade efetiva = prioridade − (tempo esperando) // k. Com k = 10, um processo de prioridade 20 que espera há 100 unidades fica tão urgente quanto um de prioridade 10 que acabou de chegar.

        ### MLFQ: aprender com o passado
        A MLFQ não pede a duração de ninguém: ela observa. São várias filas, cada uma com um nível de prioridade e o seu quantum (em geral maior nas filas de baixo). As regras, como o OSTEP as apresenta:

        1. Se a prioridade de A é maior que a de B, A roda (B não).
        2. Se A e B têm a mesma prioridade, eles revezam em Round Robin, com o quantum daquela fila.
        3. Um processo novo entra na fila mais alta.
        4. Quando um processo gasta todo o seu {{limite de tempo|time allotment}} num nível, somando todas as vezes que rodou ali (não importa quantas vezes largou a CPU antes), ele desce um nível.
        5. A cada período S, todos os processos voltam para a fila mais alta, e a contagem recomeça: é o {{reforço de prioridade|priority boost}}.

        Cada regra tem um motivo:
      `),
      {
        type: 'table',
        head: ['Situação', 'O que a MLFQ faz', 'Regra'],
        rows: [
          ['processo novo, de duração desconhecida', 'aposta que ele é curto e o põe no topo; se for mesmo curto, termina rápido', '3'],
          ['processo que usa a CPU sem parar', 'gasta o limite e desce, nível a nível, até a fila de baixo, onde roda com quantum maior e menos trocas', '4'],
          ['processo interativo (editor, terminal)', 'usa pouca CPU de cada vez e demora a somar o limite; se usar menos que o limite entre dois reforços, nunca sai do topo', '4 e 5'],
          ['processo que tenta enganar o escalonador', 'faz uma E/S logo antes do fim de cada quantum para parecer interativo, mas o tempo é somado e ele desce do mesmo jeito', '4'],
          ['processo longo esquecido lá embaixo', 'volta ao topo no próximo reforço e ganha CPU, mesmo com muitos interativos', '5'],
          ['programa que muda de comportamento', 'um cálculo que vira interativo volta ao topo no reforço e tem a chance de mostrar o novo perfil', '5'],
        ],
      },
      md(`
        Assim a MLFQ se aproxima do SJF sem saber durações: os curtos terminam lá em cima, os longos afundam e deixam de atrapalhar. As constantes (quantas filas, o quantum de cada uma, o período S) não têm resposta certa: um S grande demais traz a inanição de volta; pequeno demais, todo mundo parece interativo. O Solaris, por exemplo, usava 60 filas, com quanta de 20 ms no topo a algumas centenas de ms na base, e um reforço mais ou menos a cada segundo.

        A MLFQ foi descrita por Fernando Corbató e colegas no CTSS, em 1962 (Corbató recebeu o Prêmio Turing em 1990), e versões dela são a base dos escalonadores de sistemas da família BSD, do Solaris e do Windows.

        ### Troca de contexto por dentro
        Para trocar de processo, o kernel precisa estar rodando. Mas, enquanto um programa de usuário ocupa a CPU, o kernel está parado. Ele recupera o controle de dois jeitos:

        - **Por iniciativa do processo**: o processo faz uma chamada de sistema que bloqueia (\`read\` sem dados, \`wait\`, \`sleep\`). O kernel já está rodando para atender a chamada e aproveita para escolher outro. É uma {{troca voluntária|voluntary context switch}}.
        - **À força**: a {{interrupção do temporizador|timer interrupt}}, gerada pelo hardware a cada poucos milissegundos, ou a interrupção de um dispositivo que acorda um processo mais prioritário devolve a CPU ao kernel, que decide tirá-la do processo atual. É uma {{troca involuntária|involuntary context switch}}.

        Sem o temporizador, um programa num laço infinito ficaria com a CPU para sempre. Era o que podia acontecer na multitarefa cooperativa dos programas do Windows 3.x e do Mac OS clássico (antes do Mac OS X): cada programa tinha de devolver a CPU por conta própria.

        Quando o temporizador interrompe o processo A e o escalonador escolhe B, acontece isto (é o protocolo de *execução direta limitada* do OSTEP):

        1. **Hardware**: salva os registradores de A na pilha do kernel de A, passa para o modo kernel e pula para o tratador da interrupção.
        2. **Kernel**: contabiliza o tempo que A usou (para o quantum, para a MLFQ) e chama o escalonador, que escolhe B.
        3. **Kernel**: guarda o resto do estado de A no PCB de A, carrega o de B do PCB de B e passa para a pilha do kernel de B. Se B é de outro processo, troca também o espaço de endereçamento (no x86, o registrador CR3, que aponta para a tabela de páginas).
        4. **Retorno da interrupção**: o hardware restaura os registradores de B, volta ao modo usuário, e B continua exatamente de onde parou, no contador de programa salvo.

        Isso tem dois custos:

        - **Direto**: salvar e restaurar registradores, rodar o escalonador, trocar o espaço de endereçamento. O OSTEP cita medições do lmbench: cerca de 6 µs por troca em 1996, numa CPU de 200 MHz, e menos de 1 µs em máquinas atuais.
        - **Indireto**: B encontra os caches cheios de dados de A e passa um tempo buscando os próprios dados na memória (caches "frios"). Se B é de outro processo, as traduções de endereço guardadas na TLB também não servem (TLB é assunto do módulo m8-2). Dependendo de quanta memória cada um usa, esse custo pode ser bem maior que o direto.

        Trocar entre threads do mesmo processo é mais barato: o espaço de endereçamento é o mesmo, e não há tabela de páginas para trocar. É um dos motivos de existirem threads.

        O Linux conta as duas trocas de cada processo: \`grep ctxt /proc/<PID>/status\` mostra \`voluntary_ctxt_switches\` e \`nonvoluntary_ctxt_switches\`. Muitas voluntárias indicam um processo que espera bastante por E/S (normal num servidor); muitas involuntárias, um processo que queria CPU e foi tirado dela (CPU disputada).

        ### O quantum: resposta × desperdício
        Suponha que cada processo use o quantum q inteiro e que cada troca custe s. A cada q + s de tempo, s vai para a {{sobrecarga|overhead}}: a fração desperdiçada é **s / (q + s)**. Com 10 processos prontos na fila, o último só começa depois de 9 × (q + s).
      `),
      {
        type: 'table',
        head: ['Quantum q', 'Troca s', 'Desperdício s / (q + s)', 'Com 10 prontos, o último começa após'],
        rows: [
          ['1 ms', '1 ms', '50%', '18 ms'],
          ['4 ms', '1 ms', '20%', '45 ms'],
          ['19 ms', '1 ms', '5%', '180 ms'],
          ['99 ms', '1 ms', '1%', '900 ms'],
        ],
        caption: 'Uma troca de 1 ms é um exagero proposital (é o exemplo clássico do livro do Tanenbaum): a conta mostra a forma do compromisso, e o custo indireto faz o s real ser maior do que parece.',
      },
      md(`
        Quantum curto: resposta rápida, muita CPU jogada fora. Quantum longo: pouca sobrecarga, mas o Round Robin vira FCFS e o clique espera. Uma regra prática: o quantum deve ser um pouco maior que uma interação típica, para que um processo interativo termine o seu surto de CPU dentro de um quantum e bloqueie por conta própria; o Tanenbaum sugere algo entre 20 e 50 ms como compromisso razoável. É também por isso que a MLFQ usa quanta curtos no topo (onde ficam os interativos) e longos na base (onde ficam os longos, que agradecem a menor sobrecarga).

        ### No Linux: nice, CFS/EEVDF e tempo real
        - Processos comuns (política \`SCHED_OTHER\`) têm um {{valor nice|nice value}} de −20 a 19, com padrão 0. Cada passo vale cerca de 10% de CPU quando dois processos disputam a mesma CPU: o peso de nice 0 é 1024, o de nice 1 é 820 e o de nice −1 é 1277 (cerca de 1,25× por passo). Dois laços infinitos, um com nice 0 e outro com nice 1, dividem a CPU em 1024 / 1844 ≈ 55,5% e 820 / 1844 ≈ 44,5%.
        - \`nice -n 10 comando\` já começa com nice 10; \`renice -n 5 -p 1234\` muda o de um processo que está rodando. Usuários comuns só podem aumentar o nice (ficar mais "gentis"); diminuir exige privilégio de administrador.
        - O escalonador desses processos não usa filas fixas. O CFS (Linux 2.6.23, de 2007) dava a CPU a quem tinha recebido menos *tempo virtual*, o tempo de CPU ponderado pelo peso do nice. Desde o Linux 6.6 (2023), o EEVDF ocupa o lugar dele: mantém os pesos e acrescenta prazos para melhorar a latência. A interatividade aparece sozinha: quem dorme muito acumula pouco tempo de CPU e tende a ser escolhido logo que acorda.
        - As políticas de tempo real \`SCHED_FIFO\` e \`SCHED_RR\` têm prioridades de 1 a 99 e passam na frente de qualquer processo comum. \`SCHED_FIFO\` roda até bloquear ou ceder a CPU; \`SCHED_RR\` reveza, com quantum, entre processos da mesma prioridade. Como um laço infinito em \`SCHED_FIFO\` travaria um núcleo, o Linux reserva por padrão 5% de cada segundo aos processos comuns (\`/proc/sys/kernel/sched_rt_runtime_us\` vale 950000).
      `),
    ],
    exemplo: [
      md(`
        Uma MLFQ com três filas: F0 (a mais alta, quantum 1), F1 (quantum 2) e F2 (a mais baixa, quantum 4). O limite de tempo de cada nível é um quantum, e não há reforço. Para simplificar, o escalonador só decide no fim de cada fatia (num sistema real, um processo mais prioritário que chega interrompe o atual na hora; neste exemplo isso não muda nada, porque as chegadas caem em fins de fatia).

        Três processos: A, uma compilação, chega em 0 e precisa de 10 unidades; B, uma busca no editor, chega em 3 e precisa de 2; C, um clique, chega em 4 e precisa de 1. Ninguém conta essas durações ao escalonador.
      `),
      {
        type: 'table',
        head: ['t', 'Chegou', 'Filas antes de decidir (F0 | F1 | F2)', 'Roda', 'Depois'],
        rows: [
          ['0', 'A', 'A | — | —', 'A de 0 a 1', 'usou o quantum inteiro: desce para F1'],
          ['1', '—', '— | A | —', 'A de 1 a 3', 'usou o quantum inteiro: desce para F2 (faltam 7)'],
          ['3', 'B', 'B | — | A', 'B de 3 a 4', 'desce para F1 (falta 1)'],
          ['4', 'C', 'C | B | A', 'C de 4 a 5', 'terminou: retorno 1'],
          ['5', '—', '— | B | A', 'B de 5 a 6', 'terminou antes do fim do quantum: retorno 6 − 3 = 3'],
          ['6', '—', '— | — | A', 'A de 6 a 10', 'fica em F2 (faltam 3)'],
          ['10', '—', '— | — | A', 'A de 10 a 13', 'terminou: retorno 13'],
        ],
      },
      md('Agora compare com as outras políticas, nos mesmos três processos:'),
      {
        type: 'table',
        head: ['Política', 'Linha do tempo', 'Retorno de A, B, C', 'Retorno médio', 'Resposta média', 'Trocas de contexto'],
        rows: [
          ['FCFS', 'A 0–10, B 10–12, C 12–13', '10, 9, 9', '9,33', '5', '2'],
          ['Round Robin, quantum 1', 'A 0–3, B 3–4, A 4–5, C 5–6, B 6–7, A 7–13', '13, 4, 2', '6,33', '0,33', '5'],
          ['MLFQ (quanta 1, 2, 4)', 'A 0–3, B 3–4, C 4–5, B 5–6, A 6–13', '13, 3, 1', '5,67', '0', '4'],
          ['SRTF (conhece as durações)', 'A 0–3, B 3–5, C 5–6, A 6–13', '13, 2, 2', '5,67', '0,33', '3'],
        ],
        caption: 'Trechos seguidos do mesmo processo foram juntados na linha do tempo. Trocas de contexto contam só as passagens de um processo para outro.',
      },
      md(`
        Sem saber nenhuma duração, a MLFQ empatou com o SRTF no retorno médio e respondeu na hora aos dois processos curtos. A compilação pagou um pouco (terminou em 13, e não em 10), mas rodou a maior parte do tempo em fatias de 4, com poucas trocas.
      `),
      { type: 'viz', viz: 'scheduler', caption: 'O simulador tem quatro processos fixos. Escolha Round Robin e mude o quantum de 1 para 4: as trocas de contexto caem de 13 para 4. O simulador não cobra nada por elas; numa CPU real, cada uma custaria tempo.' },
    ],
    codigo: [
      py(`
        from collections import deque

        def rr_com_trocas(duracoes, q, s):
            """Round Robin em que cada troca de contexto custa s ms. Todos chegam em t = 0."""
            fila = deque(enumerate(duracoes))
            t, anterior, trocas = 0, None, 0
            primeira, fim = {}, {}
            while fila:
                i, resta = fila.popleft()
                if anterior is not None and anterior != i:
                    t += s                      # salvar o estado de um, restaurar o do outro
                    trocas += 1
                primeira.setdefault(i, t)
                fatia = min(q, resta)
                t += fatia
                anterior = i
                if resta > fatia:
                    fila.append((i, resta - fatia))
                else:
                    fim[i] = t
            n = len(duracoes)
            util = sum(duracoes) / t           # fração do tempo gasta com trabalho de verdade
            return trocas, util, sum(primeira.values()) / n, sum(fim.values()) / n

        print("10 processos de 100 ms cada; cada troca custa 1 ms")
        for q in [1, 5, 20, 100]:
            trocas, util, resp, ret = rr_com_trocas([100] * 10, q, 1)
            print(f"q = {q:>3} ms | trocas: {trocas:>4} | CPU útil: {util:6.1%} | "
                  f"resposta média: {resp:6.1f} ms | retorno médio: {ret:7.1f} ms")
      `, { caption: 'Com processos todos iguais, o quantum longo vence no retorno e perde feio na resposta. Mude o custo da troca, ou troque um dos processos de 100 ms por um de 2 ms, e veja quem ganha.' }),
      code('python', `
        import resource
        import time

        def trocas():
            uso = resource.getrusage(resource.RUSAGE_SELF)
            return uso.ru_nvcsw, uso.ru_nivcsw      # voluntárias, involuntárias

        v0, i0 = trocas()
        for _ in range(200):
            time.sleep(0.001)                       # bloqueia: troca voluntária
        v1, i1 = trocas()
        x = 0
        for k in range(50_000_000):                 # só CPU: o kernel pode tirá-la à força
            x += k
        v2, i2 = trocas()
        print("dormindo:  ", v1 - v0, "voluntárias,", i1 - i0, "involuntárias")
        print("calculando:", v2 - v1, "voluntárias,", i2 - i1, "involuntárias")
      `, 'Rode no seu computador (Linux): o módulo resource não existe no Windows nem no navegador. Com a máquina ociosa, o cálculo pode ter poucas trocas involuntárias; rode outro programa pesado ao mesmo tempo e veja o número subir.'),
      code('bash', `
        # prioridade, estado e trocas de contexto de um processo
        ps -o pid,ni,stat,cmd -p 1234
        grep ctxt /proc/1234/status

        # trocas de contexto do sistema inteiro, por segundo (coluna cs)
        vmstat 1 5

        # rodar um backup com a menor prioridade comum
        nice -n 19 tar czf backup.tar.gz ~/fotos

        # mudar o nice de um processo que já está rodando
        renice -n 5 -p 1234

        # tempo real (precisa de root): SCHED_FIFO com prioridade 50
        sudo chrt -f 50 ./controlador
      `, 'Comandos do Linux para observar e mudar prioridades.'),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e8-mlfq-1',
          kind: 'mcq',
          prompt: 'Uma MLFQ tem limite de 10 ms de CPU na fila mais alta e reforço de prioridade a cada 1 segundo. Um editor de texto usa cerca de 1 ms de CPU por tecla, e você digita 5 teclas por segundo. Onde o editor tende a ficar?',
          difficulty: 'facil',
          skills: ['so-processos'],
          hints: [
            'Quanto tempo de CPU o editor usa por segundo?',
            'O que a regra 4 conta: o tempo de CPU ou o tempo total desde que o processo chegou?',
            'O que acontece com a contagem a cada reforço?',
          ],
          explanation: 'Na MLFQ, o que rebaixa um processo é gastar o limite de tempo de CPU do nível (regra 4). O editor usa 5 ms por segundo, e o reforço a cada segundo (regra 5) devolve todos ao topo com a contagem zerada: ele nunca chega aos 10 ms. Por isso processos interativos ficam no alto e respondem rápido, enquanto quem usa CPU sem parar gasta o limite e desce.',
          options: [
            { text: 'Na fila mais alta: entre dois reforços ele usa cerca de 5 ms, menos que o limite de 10 ms', correct: true, feedback: 'Isso: a MLFQ só rebaixa quem soma o limite no nível. 5 teclas × 1 ms = 5 ms por segundo, e a cada segundo o reforço recomeça a contagem.' },
            { text: 'Na fila mais baixa, porque passa quase todo o tempo bloqueado esperando teclas', feedback: 'Tempo bloqueado não é tempo de CPU. A MLFQ conta só o tempo em que o processo usou a CPU; esperar o teclado não pesa contra ele.' },
            { text: 'Desce um nível a cada tecla, porque larga a CPU antes do fim do quantum', feedback: 'É o contrário: largar a CPU cedo não rebaixa ninguém. O que rebaixa é somar o limite de tempo do nível.' },
            { text: 'Desce depois de 10 teclas e nunca mais volta ao topo', feedback: '10 teclas levam 2 segundos, e antes disso vem um reforço que devolve todos ao topo e zera a contagem. Sem a regra 5, aí sim ele acabaria descendo.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e8-mlfq-2',
          kind: 'predict',
          lang: 'python',
          prompt: 'O que este programa imprime? Cada linha mostra o quantum, a resposta média e o retorno médio.',
          difficulty: 'intermediario',
          skills: ['so-processos', 'ed-pilhas-filas'],
          hints: [
            'Com quantum 10, algum processo é interrompido? Com que política o Round Robin se parece, então?',
            'Com quantum 1, monte a linha do tempo unidade por unidade: A, B, C, A, ... Quando cada um roda pela primeira vez, e quando termina?',
            'Quantas casas decimais round(x, 2) mostra para 7,333...? E para 1,0?',
          ],
          explanation: 'Com quantum 1, a linha do tempo é A B C A B C A C A: as primeiras execuções são 0, 1 e 2 (resposta média 1,0) e os términos são A 9, B 5 e C 8 (retorno médio 22/3 ≈ 7,33). Com quantum 10 ninguém é interrompido e o Round Robin vira FCFS: as primeiras execuções são 0, 4 e 6 (resposta média 10/3 ≈ 3,33) e os términos 4, 6 e 9 (retorno médio 19/3 ≈ 6,33). O quantum curto melhorou a resposta e piorou o retorno: as duas réguas puxam para lados opostos.',
          code: dedent(`
            from collections import deque

            def rr(duracoes, q):
                fila = deque(duracoes.items())     # todos chegam em t = 0, nesta ordem
                t, primeira, fim = 0, {}, {}
                while fila:
                    nome, resta = fila.popleft()
                    primeira.setdefault(nome, t)
                    fatia = min(q, resta)
                    t += fatia
                    if resta > fatia:
                        fila.append((nome, resta - fatia))
                    else:
                        fim[nome] = t
                return primeira, fim

            for q in (1, 10):
                primeira, fim = rr({"A": 4, "B": 2, "C": 3}, q)
                resposta = sum(primeira.values()) / 3
                retorno = sum(fim.values()) / 3
                print(q, round(resposta, 2), round(retorno, 2))
          `),
          answer: '1 1.0 7.33\n10 3.33 6.33',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e8-mlfq-3',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Um servidor usa escalonamento por prioridade **não preemptivo**, com envelhecimento. Escreva \`ordem_com_envelhecimento(processos, k)\`:

            - \`processos\` é uma lista de tuplas \`(nome, chegada, duracao, prioridade)\`; **menor número = mais prioridade**;
            - quando a CPU fica livre no instante \`t\`, escolha, entre os que já chegaram (\`chegada <= t\`) e ainda não rodaram, o de menor **prioridade efetiva** = \`prioridade - (t - chegada) // k\`. Empate: o que chegou primeiro; persistindo, o de menor nome;
            - o escolhido roda até o fim (\`duracao\` unidades); se ninguém chegou ainda, a CPU fica ociosa até a próxima chegada;
            - devolva a lista de nomes na ordem em que rodam.
          `),
          difficulty: 'intermediario',
          skills: ['so-processos'],
          hints: [
            'Simule um relógio t. Em cada decisão, quem são os candidatos?',
            'A prioridade efetiva muda com o tempo. Em que momento ela precisa ser calculada?',
            'Se nenhum processo chegou ainda, para onde o relógio deve pular?',
            'Uma chave de comparação pode ser uma tupla. O que vem primeiro nela, e o que desempata?',
          ],
          explanation: 'A prioridade efetiva precisa ser recalculada a cada decisão, porque depende de t: quem espera ganha um nível a cada k unidades. No teste do backup, sem envelhecimento ele só roda depois dos 15 cliques; com k = 2, ele chega à prioridade 0 em t = 20 e vence o empate com o clique que acabou de chegar, porque chegou antes. Repare no //: com a divisão comum, a prioridade subiria continuamente e mudaria o vencedor de alguns empates. E calcular a idade a partir de t = 0, em vez da chegada de cada um, dá o mesmo bônus a todos, o que é o mesmo que não ter envelhecimento.',
          starter: dedent(`
            def ordem_com_envelhecimento(processos, k):
                # processos: lista de (nome, chegada, duracao, prioridade); menor número = mais prioridade
                # devolva a lista de nomes na ordem em que rodam
                pass
          `),
          solution: dedent(`
            def ordem_com_envelhecimento(processos, k):
                pendentes = list(processos)
                t, ordem = 0, []
                while pendentes:
                    chegaram = [p for p in pendentes if p[1] <= t]
                    if not chegaram:
                        t = min(p[1] for p in pendentes)
                        continue
                    p = min(chegaram, key=lambda p: (p[3] - (t - p[1]) // k, p[1], p[0]))
                    ordem.append(p[0])
                    t += p[2]
                    pendentes.remove(p)
                return ordem
          `),
          tests: [
            {
              name: 'prioridade sem envelhecimento',
              code: dedent(`
                r = ordem_com_envelhecimento([("A", 0, 3, 2), ("B", 1, 2, 1), ("C", 2, 1, 3)], 10**9)
                assert r == ["A", "B", "C"], f"em t = 0 só A chegou; em t = 3, B (prioridade 1) vence C (3). Esperado ['A', 'B', 'C'], veio {r}"
                r = ordem_com_envelhecimento([("longo", 0, 10, 5), ("urgente", 1, 1, 0)], 10**9)
                assert r == ["longo", "urgente"], f"não preemptivo: quem já começou vai até o fim, mesmo que chegue alguém mais prioritário. Esperado ['longo', 'urgente'], veio {r}"
                assert ordem_com_envelhecimento([], 3) == [], "sem processos, devolva a lista vazia"
              `),
            },
            {
              name: 'o backup não morre de fome',
              code: dedent(`
                fluxo = [("backup", 0, 3, 10)] + [(f"c{i:02d}", 2 * i, 2, 0) for i in range(15)]
                r = ordem_com_envelhecimento(fluxo, 10**9)
                assert r[-1] == "backup", f"sem envelhecimento (k enorme), o backup só roda depois de todos os cliques; veio {r}"
                r = ordem_com_envelhecimento(fluxo, 2)
                assert r.index("backup") == 10, f"com k = 2, em t = 20 o backup (10 - 20 // 2 = 0) empata com o clique c10, que acabou de chegar (0 - 0 = 0), e vence porque chegou antes: ele deve ser o 11º a rodar. Veio {r}"
                r = ordem_com_envelhecimento(fluxo, 1)
                assert r.index("backup") == 5, f"com k = 1, o backup chega à prioridade efetiva 0 em t = 10 e roda em 6º lugar. Veio {r}"
              `),
            },
            {
              name: 'envelhecimento conta a partir da chegada, com //',
              code: dedent(`
                r = ordem_com_envelhecimento([("X", 0, 6, 0), ("B", 0, 1, 5), ("A", 3, 1, 4)], 4)
                assert r == ["X", "B", "A"], f"em t = 6: B tem 5 - 6 // 4 = 4 e A tem 4 - 3 // 4 = 4; empate, e B chegou antes. Esperado ['X', 'B', 'A'], veio {r}. A divisão é inteira (//), e a espera conta a partir da chegada de cada um"
              `),
            },
            {
              name: 'CPU ociosa e entrada fora de ordem',
              code: dedent(`
                r = ordem_com_envelhecimento([("A", 5, 2, 1), ("B", 6, 1, 0)], 3)
                assert r == ["A", "B"], f"até t = 5 ninguém chegou; A roda de 5 a 7 e depois B. Veio {r}"
                r = ordem_com_envelhecimento([("tarde", 10, 1, 0), ("cedo", 0, 2, 9)], 3)
                assert r == ["cedo", "tarde"], f"a lista pode não estar em ordem de chegada; em t = 0 só 'cedo' chegou. Veio {r}"
              `),
            },
            {
              name: 'desempates',
              code: dedent(`
                r = ordem_com_envelhecimento([("b", 0, 1, 3), ("a", 0, 1, 3)], 10**9)
                assert r == ["a", "b"], f"mesma prioridade e mesma chegada: desempate pelo menor nome. Veio {r}"
                r = ordem_com_envelhecimento([("Z", 0, 4, 0), ("y", 2, 1, 2), ("x", 4, 1, 2)], 10**9)
                assert r == ["Z", "y", "x"], f"y e x têm a mesma prioridade, mas y chegou antes; o nome só desempata se a chegada também for igual. Veio {r}"
              `),
            },
            {
              name: 'cenários aleatórios',
              code: REF_ENVELHECIMENTO + '\n' + dedent(`
                import random
                rng = random.Random(21)
                for _ in range(300):
                    n = rng.randint(1, 8)
                    nomes = rng.sample("abcdefghij", n)
                    ps = [(nomes[i], rng.randint(0, 12), rng.randint(1, 5), rng.randint(0, 6)) for i in range(n)]
                    k = rng.choice([1, 2, 3, 5, 10**9])
                    esperado = _ref_envelhecimento(ps, k)
                    r = ordem_com_envelhecimento(ps, k)
                    assert r == esperado, f"ordem_com_envelhecimento({ps}, {k}) deu {r}, esperado {esperado}"
              `),
            },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e8-mlfq-4',
          kind: 'mcq',
          prompt: 'Numa versão ingênua da MLFQ, a regra 4 é: "se o processo largar a CPU antes do fim do quantum, mantém a prioridade". Um programa esperto roda 9,9 ms de cada quantum de 10 ms e então faz uma leitura de disco de 0,1 ms. O que acontece, e o que resolve?',
          difficulty: 'intermediario',
          skills: ['so-processos'],
          hints: [
            'Na regra ingênua, o que o programa precisa fazer para nunca descer?',
            'Qual regra olha para o comportamento acumulado, e não para uma rodada só?',
          ],
          explanation: 'A regra ingênua olha só para cada rodada isolada, e isso é fácil de enganar: basta ceder a CPU um instante antes do fim. A regra 4 do OSTEP soma o tempo gasto no nível, e o processo desce quando chega ao limite, faça quantas pausas fizer. O reforço (regra 5) resolve outro problema: os processos longos que ficariam sem CPU lá embaixo.',
          options: [
            { text: 'Ele fica no topo para sempre e leva quase toda a CPU; resolve somar o tempo usado no nível, não importa quantas vezes ele largou a CPU', correct: true, feedback: 'Isso: é a regra 4 do OSTEP. Somando o tempo, os 9,9 ms de cada rodada se acumulam, e ele desce ao gastar o limite, como qualquer processo que usa muita CPU.' },
            { text: 'Ele desce de nível, porque leitura de disco é lenta', feedback: 'Na versão ingênua, largar a CPU antes do fim do quantum é justamente o que mantém a prioridade. A lentidão do disco não entra na conta.' },
            { text: 'O reforço de prioridade (regra 5) resolve sozinho', feedback: 'O reforço sobe todos para o topo de tempos em tempos, mas o programa esperto já está no topo e continua lá, roubando CPU entre um reforço e outro. O reforço combate a inanição, não a trapaça.' },
            { text: 'Basta diminuir o quantum da fila mais alta para 5 ms', feedback: 'O programa só ajusta o truque: roda 4,9 ms e faz a leitura. Qualquer quantum pode ser enganado enquanto a regra olhar só para "largou antes do fim".' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e8-mlfq-5',
          kind: 'fill',
          lang: 'text',
          prompt: 'Complete as contas, supondo que todo processo usa o quantum inteiro e que cada troca de contexto custa s. Responda só com números.',
          difficulty: 'facil',
          skills: ['so-processos'],
          hints: [
            'Na fórmula s / (q + s), quanto vale q + s em cada caso?',
            'Quantos processos rodam antes do último? Quanto tempo cada um ocupa, contando a troca?',
          ],
          explanation: '1 / (9 + 1) = 10% e 1 / (49 + 1) = 2%. Antes do último dos 20 processos, rodam 19, e cada um ocupa 49 ms de quantum mais 1 ms de troca: 19 × 50 = 950 ms. O quantum maior desperdiça menos, mas quase um segundo de espera para começar é perceptível para quem clicou.',
          template: dedent(`
            troca s = 1 ms, quantum q = 9 ms
            fração da CPU gasta com trocas = s / (q + s) = ___ %

            troca s = 1 ms, quantum q = 49 ms
            fração da CPU gasta com trocas = ___ %

            20 processos prontos, q = 49 ms, s = 1 ms
            o último da fila começa a rodar depois de ___ ms
          `),
          blanks: [['10', '10,0', '10.0'], ['2', '2,0', '2.0'], ['950']],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e8-mlfq-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Escreva \`mlfq(processos, quanta, s)\`, que simula uma MLFQ e devolve o diagrama de Gantt: a lista de fatias \`(nome, inicio, fim)\`, na ordem em que acontecem (uma tupla por fatia, mesmo que o mesmo processo rode duas fatias seguidas).

            - \`processos\`: lista de \`(nome, chegada, duracao)\`, com nomes distintos e durações ≥ 1 (a lista pode não estar em ordem de chegada);
            - \`quanta\`: o quantum de cada fila, da mais alta para a mais baixa; \`[1, 2, 4]\` são três filas;
            - \`s\`: o período do reforço de prioridade, ou \`None\` para não ter reforço.

            O escalonador só decide no fim de cada fatia. Em cada instante de decisão \`t\`, nesta ordem:

            1. entram no fim da fila mais alta os processos com \`chegada <= t\` que ainda não entraram, em ordem de chegada (empate: a ordem da lista);
            2. o processo que acabou de rodar, se não terminou, usou o quantum inteiro: vai para o fim da fila **um nível abaixo** (na última fila, volta para o fim dela mesma);
            3. se há reforço e \`t\` já alcançou o próximo instante de reforço (o primeiro é \`s\`), todos os processos das filas vão para a fila mais alta, nesta ordem: primeiro os que já estavam nela, depois os da segunda fila, e assim por diante; o próximo reforço passa a ser o primeiro múltiplo de \`s\` maior que \`t\`;
            4. roda o primeiro processo da fila mais alta que não está vazia, por \`min(quantum da fila, o que falta)\`.

            Se todas as filas estão vazias, a CPU fica ociosa até a próxima chegada. O exemplo da lição, \`mlfq([("A", 0, 10), ("B", 3, 2), ("C", 4, 1)], [1, 2, 4], None)\`, deve dar \`[("A", 0, 1), ("A", 1, 3), ("B", 3, 4), ("C", 4, 5), ("B", 5, 6), ("A", 6, 10), ("A", 10, 13)]\`.
          `),
          difficulty: 'desafio',
          skills: ['so-processos', 'ed-pilhas-filas'],
          hints: [
            'Que estrutura guarda as filas? Uma lista com uma fila por nível é um bom começo.',
            'Além das filas, o que precisa ser lembrado de uma decisão para a outra: quem acabou de rodar, em que nível, quanto falta a cada processo?',
            'Os passos 1 a 4 acontecem em toda decisão, sempre nessa ordem. Que laço tem exatamente esses quatro passos no corpo?',
            'Quando a CPU fica ociosa, o relógio pula para onde?',
            'Que conta com // dá o primeiro múltiplo de s maior que t?',
          ],
          explanation: 'A simulação é um laço de decisões: as chegadas entram no topo, quem usou o quantum inteiro desce um nível, o reforço devolve todos ao topo e a fila mais alta não vazia escolhe quem roda. Com uma fila só, a MLFQ vira Round Robin; com um quantum enorme no topo, vira FCFS. O teste do fluxo de cliques mostra o papel do reforço: sem ele, o processo longo só volta a rodar quando os cliques acabam; com ele, ganha uma fatia a cada período. É assim que se avalia uma política antes de mexer no kernel: simulando cargas e medindo retorno, resposta e trocas.',
          starter: dedent(`
            from collections import deque

            def mlfq(processos, quanta, s):
                # processos: lista de (nome, chegada, duracao)
                # quanta: quantum de cada fila, da mais alta para a mais baixa
                # s: período do reforço de prioridade, ou None
                # devolva a lista de fatias (nome, inicio, fim)
                pass
          `),
          solution: dedent(`
            from collections import deque

            def mlfq(processos, quanta, s):
                por_chegada = sorted(range(len(processos)), key=lambda i: (processos[i][1], i))
                a_chegar = deque(processos[i] for i in por_chegada)
                resta = {nome: dur for nome, _, dur in processos}
                filas = [deque() for _ in quanta]
                gantt = []
                t = 0
                proximo_reforco = s
                acabou_de_rodar = None              # (nome, nível) de quem rodou a última fatia e não terminou
                while a_chegar or any(filas) or acabou_de_rodar:
                    while a_chegar and a_chegar[0][1] <= t:
                        filas[0].append(a_chegar.popleft()[0])
                    if acabou_de_rodar is not None:
                        nome, nivel = acabou_de_rodar
                        filas[min(nivel + 1, len(filas) - 1)].append(nome)
                        acabou_de_rodar = None
                    if s is not None and t >= proximo_reforco:
                        todos = [nome for fila in filas for nome in fila]
                        for fila in filas:
                            fila.clear()
                        filas[0].extend(todos)
                        proximo_reforco = (t // s + 1) * s
                    nivel = next((i for i, fila in enumerate(filas) if fila), None)
                    if nivel is None:
                        t = a_chegar[0][1]
                        continue
                    nome = filas[nivel].popleft()
                    fatia = min(quanta[nivel], resta[nome])
                    gantt.append((nome, t, t + fatia))
                    t += fatia
                    resta[nome] -= fatia
                    if resta[nome] > 0:
                        acabou_de_rodar = (nome, nivel)
                return gantt
          `),
          tests: [
            {
              name: 'exemplo da lição',
              code: dedent(`
                r = mlfq([("A", 0, 10), ("B", 3, 2), ("C", 4, 1)], [1, 2, 4], None)
                esperado = [("A", 0, 1), ("A", 1, 3), ("B", 3, 4), ("C", 4, 5), ("B", 5, 6), ("A", 6, 10), ("A", 10, 13)]
                assert r == esperado, f"veio {r}, esperado {esperado}. Confira a tabela do exemplo: quem usa o quantum inteiro desce um nível"
                assert mlfq([], [1, 2], None) == [], "sem processos, devolva a lista vazia"
              `),
            },
            {
              name: 'uma fila só é Round Robin',
              code: dedent(`
                r = mlfq([("A", 0, 5), ("B", 0, 2), ("C", 1, 3)], [2], None)
                esperado = [("A", 0, 2), ("B", 2, 4), ("C", 4, 6), ("A", 6, 8), ("C", 8, 9), ("A", 9, 10)]
                assert r == esperado, f"veio {r}, esperado {esperado}. Em t = 2, C (que chegou em 1) entra na fila antes de A voltar para o fim dela: as chegadas vêm antes de quem acabou de rodar"
              `),
            },
            {
              name: 'CPU ociosa, chegadas fora de ordem e empates',
              code: dedent(`
                r = mlfq([("B", 10, 1), ("A", 3, 2)], [1, 2], None)
                esperado = [("A", 3, 4), ("A", 4, 5), ("B", 10, 11)]
                assert r == esperado, f"veio {r}, esperado {esperado}: a CPU fica ociosa até t = 3 e de 5 a 10; a lista não precisa estar em ordem de chegada"
                r = mlfq([("Y", 0, 1), ("X", 0, 1)], [1], None)
                assert r == [("Y", 0, 1), ("X", 1, 2)], f"chegadas no mesmo instante entram na ordem da lista; veio {r}"
              `),
            },
            {
              name: 'sem reforço, o longo espera todos os cliques',
              code: dedent(`
                ps = [("L", 0, 6)] + [(f"S{i}", i, 1) for i in range(1, 13)]
                r = mlfq(ps, [1, 2], None)
                esperado = [("L", 0, 1)] + [(f"S{i}", i, i + 1) for i in range(1, 13)] + [("L", 13, 15), ("L", 15, 17), ("L", 17, 18)]
                assert r == esperado, f"veio {r}, esperado {esperado}: cada clique chega no topo e passa na frente de L, que está na fila de baixo"
              `),
            },
            {
              name: 'com reforço, o longo ganha fatias no meio do fluxo',
              code: REF_MLFQ + '\n' + dedent(`
                ps = [("L", 0, 6)] + [(f"S{i}", i, 1) for i in range(1, 13)]
                r = mlfq(ps, [1, 2], 4)
                fatias_de_L = [f for f in r if f[0] == "L" and f[1] < 13]
                assert len(fatias_de_L) >= 3, f"com reforço a cada 4 unidades, L deveria voltar ao topo e rodar durante o fluxo de cliques; veio {r}"
                _confere_mlfq(ps, [1, 2], 4, "no reforço, os que já estavam na fila mais alta ficam na frente dos que sobem")
                _confere_mlfq([("A", 0, 9), ("B", 0, 9), ("C", 2, 4)], [1, 3], 5, "o reforço pode ser percebido num t que não é múltiplo de s; o próximo é o primeiro múltiplo de s maior que t")
              `),
            },
            {
              name: 'cenários aleatórios',
              code: REF_MLFQ + '\n' + dedent(`
                import random
                rng = random.Random(42)
                for _ in range(300):
                    n = rng.randint(0, 6)
                    nomes = rng.sample("ABCDEFGH", n)
                    ps = [(nomes[i], rng.randint(0, 12), rng.randint(1, 8)) for i in range(n)]
                    quanta = [rng.randint(1, 5) for _ in range(rng.randint(1, 3))]
                    s = rng.choice([None, None, 2, 3, 5, 7, 10])
                    _confere_mlfq(ps, quanta, s)
              `),
            },
          ],
        },
      },
    ],
    projeto: [
      md(`
        **Laboratório de prioridades (no seu Linux).** Num terminal, rode dois laços infinitos presos ao mesmo núcleo: \`taskset -c 0 python3 -c "while True: pass" &\` e \`taskset -c 0 nice -n 1 python3 -c "while True: pass" &\`. No \`top\`, a divisão deve ficar perto de 55% e 45%. Troque o nice do segundo para 19 com \`renice\` e preveja a nova divisão antes de olhar (1024 / (1024 + 15) ≈ 98,6%). Compare as trocas involuntárias dos dois em \`/proc/<PID>/status\`. Rode tudo no mesmo terminal: com o *autogroup* do Linux, o nice só compara processos da mesma sessão. No fim, \`kill %1 %2\`.
      `),
    ],
    revisao: [
      md(`
        - Retorno = término − chegada; resposta = primeira execução − chegada. Round Robin: ótima resposta, retorno ruim.
        - SRTF (SJF preemptivo) minimiza o retorno médio, mas precisa conhecer as durações.
        - Prioridade: a CPU vai para o mais prioritário; o risco é a inanição, e o envelhecimento sobe a prioridade de quem espera.
        - MLFQ: o novo entra no topo; quem gasta o limite de tempo do nível desce; o reforço periódico devolve todos ao topo. Aproxima o SJF sem saber durações e não se deixa enganar por quem cede a CPU no último instante.
        - Troca de contexto: voluntária (o processo bloqueou) ou involuntária (temporizador, alguém mais prioritário). O custo direto é pequeno; o indireto (caches e TLB frios) pode ser maior. Entre threads do mesmo processo, é mais barata.
        - Desperdício do quantum: s / (q + s). Quantum curto responde rápido e desperdiça; quantum longo transforma o Round Robin em FCFS.
        - Linux: nice de −20 a 19 (≈ 10% de CPU por passo); CFS e, desde o 6.6, EEVDF; tempo real com SCHED_FIFO e SCHED_RR (prioridades 1 a 99).
      `),
      english(`
        - **turnaround time / response time**: tempo de retorno / tempo de resposta
        - **starvation / aging**: inanição / envelhecimento
        - **multi-level feedback queue (MLFQ), time allotment, priority boost**: fila multinível com realimentação, limite de tempo, reforço de prioridade
        - **voluntary / involuntary context switch, timer interrupt, overhead**: troca voluntária / involuntária, interrupção do temporizador, sobrecarga
        - **niceness, real-time policy**: gentileza (nice), política de tempo real

        Frase típica de entrevista: *"Round Robin gives great response time but poor turnaround time. MLFQ approximates SJF without knowing job lengths: new jobs start at the highest priority, and a job that uses up its time allotment moves down a level."*

        Frase típica de documentação (man 7 sched): *"The nice value is an attribute that can be used to influence the CPU scheduler to favor or disfavor a process in scheduling decisions."*
      `),
    ],
  },
  review: [
    ['Como se calculam o tempo de retorno e o tempo de resposta?', 'Retorno = término − chegada. Resposta = primeira execução − chegada.'],
    ['Por que o Round Robin tem boa resposta e retorno ruim?', 'Todo processo roda logo (um quantum depois do outro), mas todos são esticados até perto do fim, porque ninguém termina antes de os outros também avançarem.'],
    ['O que é inanição e como o envelhecimento a evita?', 'Um processo pronto que nunca recebe a CPU porque sempre há alguém mais prioritário. O envelhecimento aumenta a prioridade de quem espera, até ele passar na frente.'],
    ['Quais são as cinco regras da MLFQ?', '1) maior prioridade roda; 2) mesma prioridade reveza em Round Robin; 3) processo novo entra no topo; 4) quem gasta o limite de tempo do nível desce; 5) a cada período S, todos voltam ao topo.'],
    ['Como a MLFQ impede que um processo a engane fazendo E/S logo antes do fim do quantum?', 'Somando todo o tempo de CPU usado no nível (regra 4): ao chegar ao limite, ele desce, não importa quantas vezes tenha largado a CPU.'],
    ['Para que serve o reforço de prioridade da MLFQ?', 'Para evitar a inanição dos processos longos lá embaixo e para dar nova chance a um processo que mudou de comportamento.'],
    ['Qual é a diferença entre troca de contexto voluntária e involuntária?', 'Voluntária: o processo bloqueou (E/S, sleep, wait). Involuntária: o kernel tirou a CPU dele, no fim do quantum ou porque ficou pronto alguém mais prioritário.'],
    ['Que fração da CPU se perde com quantum q e troca de custo s?', 's / (q + s), supondo que cada processo use o quantum inteiro.'],
    ['Por que trocar entre threads do mesmo processo é mais barato que entre processos?', 'O espaço de endereçamento é o mesmo: não há tabela de páginas para trocar, e as traduções da TLB continuam valendo.'],
    ['No Linux, qual é a faixa do valor nice, qual é o padrão e que ponta dá mais prioridade?', 'De −20 a 19, com padrão 0. Quanto menor o nice, maior a prioridade: −20 é o mais favorecido.'],
  ],
  references: ['ostep', 'tanenbaum-so', 'linux-man'],
});

export const lessons: Lesson[] = [criacao, prioridades];
