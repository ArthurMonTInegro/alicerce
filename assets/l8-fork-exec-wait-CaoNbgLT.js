var e={id:`l8-fork-exec-wait`,moduleId:`m8-1`,title:`Criando processos: fork, exec, wait e a árvore de processos`,titleEn:`Creating processes: fork, exec, wait and the process tree`,summary:`O que o kernel guarda sobre cada processo, como o Unix cria processos com fork, troca o programa com exec e recolhe o resultado com wait, de onde vêm zumbis e órfãos, como o shell faz redirecionamentos, por que cd não pode ser um programa à parte e onde as threads entram nessa história.`,minutes:45,objectives:[`Listar o que o bloco de controle de processo (PCB) guarda e associar cada transição de estado ao evento que a provoca`,`Prever o valor devolvido por fork em cada processo e quantos processos um programa com fork cria`,`Explicar o que exec troca e o que preserva (PID, descritores de arquivo, diretório)`,`Usar wait/waitpid e interpretar o código de saída, inclusive o 128 + sinal do bash`,`Explicar como surgem zumbis e órfãos e quem os recolhe`,`Explicar por que fork e exec são separados, usando redirecionamento, pipes e o comando cd`,`Relacionar processos e threads no Linux à chamada clone e saber por que fork e threads não combinam`],skills:[`so-processos`],terms:[{pt:`processo pai / processo filho`,en:`parent / child process`,def:`O processo que pediu a criação (pai) e o processo criado (filho). O filho sabe o PID do pai (PPID).`},{pt:`bifurcar`,en:`fork`,def:`Criar um processo filho quase idêntico ao pai. A chamada fork retorna duas vezes, uma em cada processo.`,example:`fork() returns 0 in the child and the child's PID in the parent.`},{pt:`executar outro programa`,en:`exec`,def:`Família de chamadas (execve, execvp...) que substitui o programa do processo atual por outro, mantendo o mesmo PID.`,example:`On success, execve() does not return.`},{pt:`esperar`,en:`wait / waitpid`,def:`Chamada em que o pai bloqueia até um filho terminar e recolhe o código de saída dele.`},{pt:`código de saída`,en:`exit status`,def:`Número de 0 a 255 que o processo devolve ao terminar; 0 significa sucesso. No shell, fica em $?.`,example:`The command exited with a non-zero exit status.`},{pt:`bloco de controle de processo`,en:`process control block (PCB)`,def:`Estrutura do kernel com tudo o que ele sabe de um processo: PID, estado, registradores salvos, memória, arquivos abertos, prioridade.`,example:`In Linux, the PCB is the task_struct.`},{pt:`identificador de processo`,en:`process ID (PID)`,def:`Número que o kernel dá a cada processo. O PID do pai é o PPID.`},{pt:`descritor de arquivo`,en:`file descriptor`,def:`Número inteiro que identifica um arquivo, pipe ou socket aberto pelo processo; 0, 1 e 2 são a entrada, a saída e o erro padrão.`,example:`dup2(fd, 1) makes file descriptor 1 refer to the same open file as fd.`},{pt:`cópia na escrita`,en:`copy-on-write`,def:`Otimização do fork: pai e filho compartilham as páginas de memória até que um deles escreva; só então a página é copiada.`},{pt:`processo zumbi`,en:`zombie process`,def:`Processo que já terminou, mas cujo pai ainda não chamou wait; sobra só a entrada na tabela de processos.`,example:`A zombie process shows up as <defunct> in ps.`},{pt:`processo órfão`,en:`orphan process`,def:`Processo cujo pai terminou antes dele; é adotado pelo init (PID 1) ou por um subreaper, que o recolhe quando ele terminar.`},{pt:`comando interno`,en:`shell builtin`,def:`Comando que o próprio shell executa, sem fork, porque precisa mudar o estado do shell (cd, export, exit).`,example:`cd is a shell builtin.`}],references:[`ostep`,`linux-man`,`tanenbaum-so`,`python-docs`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:'Todo processo, menos o primeiro, nasce de outro. Quando você digita `python3 app.py` no terminal, o shell não se transforma no Python: ele cria um {{processo filho|child process}}, faz esse filho trocar de programa e fica esperando ele terminar. O shell é o {{processo pai|parent process}}. No Unix (Linux, macOS, Android), isso é feito com três chamadas de sistema, os pedidos ao kernel que você viu no nível 0:\n\n- `fork()` **{{bifurca|fork}}** o processo: a partir dali existem dois, pai e filho, rodando o mesmo código;\n- `exec()` **{{executa outro programa|exec}}** no lugar do atual, dentro do mesmo processo, sem criar processo novo;\n- `wait()` faz o pai **{{esperar|wait}}** um filho terminar e recolher o {{código de saída|exit status}} dele.\n\nSeparar "criar um processo" de "trocar de programa" parece estranho, mas é o que permite ao shell fazer `>`, `<` e `|`, e é o motivo de `cd` não poder ser um programa à parte. Essas três chamadas também explicam os processos `<defunct>` que aparecem no `ps` de um servidor com bug, o que o `subprocess.run` do Python faz por baixo e por que, no Linux, processo e thread saem da mesma chamada de sistema.'}]},{stage:`explicacao`,blocks:[{type:`md`,text:"### O que o kernel guarda de cada processo\nPara pausar um processo e retomá-lo depois como se nada tivesse acontecido, o kernel guarda tudo o que define aquele processo numa estrutura chamada {{bloco de controle de processo|process control block (PCB)}}. No Linux ela se chama `task_struct`; no xv6, o sistema operacional de ensino do MIT, `struct proc`. Cada processo tem um número, o {{identificador de processo|process ID (PID)}}, e o PCB guarda também o PID do pai, o PPID.\n\nEntre os campos está a tabela de {{descritores de arquivo|file descriptors}}: números pequenos que identificam cada arquivo, pipe ou socket aberto pelo processo. Por convenção, 0 é a entrada padrão, 1 é a saída padrão e 2 é a saída de erro."},{type:`table`,head:[`Campo do PCB`,`Para que serve`,`Exemplo`],rows:[[`PID e PPID`,`identificar o processo e quem o criou`,`PID 1201, PPID 1200 (o shell)`],[`estado`,`em que ponto do ciclo de vida ele está`,`pronto, executando, bloqueado, zumbi`],[`registradores salvos`,`onde ele parou: contador de programa, ponteiro de pilha e os demais registradores, guardados na troca de contexto`,`PC = endereço da próxima instrução`],[`memória`,`onde está o espaço de endereçamento do processo (tabela de páginas, assunto do módulo m8-2)`,`—`],[`descritores de arquivo`,`o que está aberto, cada coisa com um número`,`0 = teclado, 1 e 2 = terminal, 3 = notas.txt`],[`diretório atual e credenciais`,`de onde partem os caminhos relativos; com que usuário o processo roda`,`/home/ana, usuária ana`],[`escalonamento`,`prioridade e quanto de CPU já usou`,`nice 0, 3,2 s de CPU`],[`código de saída`,`guardado quando o processo termina, até o pai recolher`,`0`]],caption:"No Linux, parte disso aparece em /proc/<PID>/status. Experimente `cat /proc/self/status` (o self é o próprio cat)."},{type:`md`,text:`### Estados: o que provoca cada transição
A lição anterior mostrou os estados. Falta o principal: **o que faz um processo mudar de estado, e quem age em cada caso**.`},{type:`table`,head:[`Transição`,`O que provoca`,`Quem age`],rows:[[`novo → pronto`,`o fork terminou de montar o PCB e a memória do filho`,`kernel`],[`pronto → executando`,`o escalonador escolheu o processo para uma CPU`,`escalonador`],[`executando → pronto`,`acabou o quantum (interrupção do temporizador) ou ficou pronto alguém mais prioritário`,`kernel (preempção)`],[`executando → bloqueado`,"o processo pediu algo que demora: ler do disco, da rede ou do teclado, `wait` por um filho, `sleep`",`o próprio processo, ao fazer a chamada de sistema`],[`bloqueado → pronto`,`o evento aconteceu: os dados chegaram, o filho terminou, o tempo passou`,`kernel, em geral avisado por uma interrupção do dispositivo`],[`executando → zumbi`,"o processo chamou `exit` ou foi morto por um sinal",`o processo, ou quem mandou o sinal`],[`zumbi → fora da tabela`,"o pai chamou `wait` e recolheu o código de saída",`o pai`]]},{type:`md`,text:`- Bloqueado **nunca** vai direto para executando: quando o evento acontece, o processo volta para a fila de prontos e espera a vez.
- No \`ps\` do Linux, a coluna STAT usa letras: **R** (executando *ou* pronto: o Linux não separa os dois ali), **S** (bloqueado esperando um evento), **D** (bloqueado sem poder ser interrompido, quase sempre E/S de disco), **T** (parado, por exemplo com Ctrl+Z) e **Z** (zumbi).
- O estado zumbi é o "terminado" da lição anterior visto de perto: o processo acabou, mas ainda ocupa uma linha na tabela.

### fork: um processo vira dois
\`pid = fork()\` pede ao kernel um processo novo, montado como cópia do pai: o mesmo código, uma cópia da memória (as variáveis têm os mesmos valores), os mesmos arquivos abertos, o mesmo diretório atual. Depois, **os dois voltam da mesma chamada**, cada um no seu processo, e seguem para a linha seguinte. O que os distingue é o valor devolvido:`},{type:`table`,head:[``,`No pai`,`No filho`],rows:[[`valor devolvido pelo fork`,`o PID do filho (maior que 0)`,`0`],[`PID`,`o mesmo de antes`,`um número novo`],[`PPID`,`o mesmo de antes`,`o PID do pai`],[`memória`,`a original`,`uma cópia: mudar uma variável num processo não muda no outro`],[`descritores abertos`,`os mesmos`,`cópias que apontam para os mesmos arquivos abertos e compartilham com o pai a posição de leitura e escrita: se um lê 10 bytes, o outro continua do byte 10`]]},{type:`md`,text:"Se o fork falha (por exemplo, porque o usuário atingiu o limite de processos), em C ele devolve −1 e nenhum filho é criado; no Python, `os.fork()` levanta `OSError`.\n\n**Quem roda primeiro depois do fork?** Não está definido: é decisão do escalonador, pode mudar de uma execução para outra, e os dois podem até rodar ao mesmo tempo em núcleos diferentes. Código que depende dessa ordem tem bug.\n\nCopiar toda a memória de um processo de 2 GB a cada fork seria lento. Por isso o Linux usa {{cópia na escrita|copy-on-write}}: pai e filho passam a compartilhar as mesmas páginas de memória física, marcadas como somente leitura, e o kernel só copia uma página quando um dos dois escreve nela. Como o filho quase sempre chama exec logo em seguida, quase nada chega a ser copiado. (Páginas são assunto do módulo m8-2.)\n\n**Contando processos.** Cada fork duplica todos os processos que passam por ele. Três forks seguidos, sem nenhum `if`, deixam 2 × 2 × 2 = **8** processos: o original e mais 7.\n\n### exec: mesmo processo, outro programa\nA chamada de sistema é `execve(caminho, argumentos, ambiente)`; `execvp`, `execl` e companhia são variações da biblioteca que procuram o programa no PATH ou recebem os argumentos de outro jeito. O kernel descarta o código, os dados, o heap e a pilha do programa atual, carrega o executável do disco e começa a rodá-lo do início.\n\n- **Muda**: o programa inteiro, isto é, o código e a memória.\n- **Fica**: PID, PPID, diretório atual, usuário (salvo nos programas *setuid*, como o `sudo`, que rodam com o usuário dono do arquivo) e os descritores abertos, exceto os marcados para fechar no exec (*close-on-exec*). No Python, os arquivos que você abre já vêm marcados assim (PEP 446); os descritores 0, 1 e 2, não.\n- Se o exec dá certo, ele **não retorna**: o código que o chamou não existe mais. Se retornou, falhou. Quando o programa não existe, o bash mostra *command not found* e o filho termina com código 127; quando existe, mas não tem permissão de execução, mostra *Permission denied* e o código é 126.\n\n### wait: recolher o filho\n`waitpid(pid, &status, 0)` bloqueia o pai até o filho `pid` terminar; `wait(&status)` espera qualquer filho. As duas devolvem o PID de quem terminou e preenchem `status`, que codifica como ele terminou. Em C você lê com macros (`WIFEXITED`, `WEXITSTATUS`); no Python, com `os.waitstatus_to_exitcode(status)`. Se o pai não tem nenhum filho, a chamada falha na hora com o erro `ECHILD`.\n\nO código de saída vai de 0 a 255: só sobram os 8 bits mais baixos do número passado a `exit` (`exit(256)` vira 0). A convenção é **0 = sucesso** e qualquer outro valor = algum erro. O shell guarda o código do último comando em `$?`, e é ele que `&&` e `||` consultam: em `make && ./app`, o app só roda se o make terminou com 0. Quando o processo é morto por um sinal, o bash mostra 128 + o número do sinal."},{type:`table`,head:[`Como o processo terminou`,"`$?` no bash"],rows:[["`exit(0)`, ou `return 0` no `main`",`0`],["`exit(3)`",`3`],[`comando não encontrado (o exec falhou)`,`127`],[`arquivo sem permissão de execução (o exec falhou)`,`126`],[`Ctrl+C (sinal SIGINT, número 2)`,`130`],["`kill -9` (sinal SIGKILL, número 9)",`137`],[`falha de segmentação (sinal SIGSEGV, número 11)`,`139`]]},{type:`md`,text:"### Zumbis e órfãos\nPai e filho podem terminar em qualquer ordem, e cada ordem tem um nome.\n\n- **O filho termina antes de o pai chamar wait.** O filho vira um {{processo zumbi|zombie process}}: a memória já foi liberada, mas a entrada na tabela de processos fica, com o PID e o código de saída, esperando o pai buscar. O `ps` mostra `Z` e `<defunct>`. Zumbis passageiros são normais; um servidor que cria filhos e nunca chama wait acumula milhares e pode esgotar os PIDs disponíveis (o limite está em `/proc/sys/kernel/pid_max`). `kill -9` não resolve: o zumbi já está morto. O conserto é o pai chamar wait, ou o pai terminar.\n- **O pai termina antes do filho.** O filho vira um {{processo órfão|orphan process}} e continua rodando normalmente, mas é adotado pelo init, o processo de PID 1 (o systemd, na maioria das distribuições), ou por um processo marcado como *subreaper*. O adotante chama wait por ele quando ele terminar. É por isso que os zumbis de um pai que morreu somem: são adotados e recolhidos na hora."},{type:`callout`,tone:`warn`,text:"Num container, o seu programa costuma ser o PID 1. Se ele cria filhos e não chama wait por eles (nem pelos órfãos que herda), os zumbis se acumulam dentro do container. Por isso existe `docker run --init`, que põe um init mínimo (o tini) como PID 1 para recolher zumbis e repassar sinais.",title:`PID 1 em containers`},{type:`md`,text:"### Por que fork e exec são separados\nEntre o fork e o exec, o filho ainda está rodando o código do shell e pode **preparar o ambiente** do programa que vem depois. O novo programa herda os descritores, o diretório e as variáveis sem saber de nada. É assim que o shell implementa:\n\n- **`cmd > saida.txt`**: no filho, abre saida.txt e usa `dup2(fd, 1)` para que o descritor 1 (a saída padrão) passe a apontar para o arquivo; depois, exec do cmd. `dup2(velho, novo)` faz o descritor `novo` apontar para o mesmo arquivo aberto que `velho`, fechando antes o que `novo` era.\n- **`cmd < entrada.txt`**: o mesmo, com o descritor 0.\n- **`a | b`**: o shell cria um pipe (dois descritores, um de escrita e um de leitura) e faz dois forks. Num filho, a ponta de escrita vira o descritor 1 e ele faz exec de a; no outro, a ponta de leitura vira o 0 e ele faz exec de b.\n\nE o `cd`? Se ele fosse um programa à parte, rodaria num filho: o filho mudaria o **próprio** diretório e terminaria, e o shell continuaria onde estava. Por isso `cd`, `export` e `exit` são {{comandos internos|shell builtins}}: o shell os executa ele mesmo, sem fork (`type cd` responde *cd is a shell builtin*).\n\nO Windows seguiu outro caminho: `CreateProcess` cria o processo e carrega o programa numa chamada só, recebendo como parâmetros os redirecionamentos e o diretório. O POSIX também tem uma chamada combinada, `posix_spawn`. O `subprocess` do Python usa fork + exec, `vfork` ou `posix_spawn`, conforme o caso, mas a ideia é a mesma.\n\n### E as threads?\nNo Linux, processos e threads são, para o kernel, a mesma coisa: **tarefas**, cada uma com o seu `task_struct`. As duas nascem da mesma chamada de sistema, `clone()` (a função `fork()` da glibc também a usa por baixo). O que muda são as opções:\n\n- para um processo, o filho recebe **cópias**: memória, tabela de descritores, diretório;\n- para uma thread (`pthread_create` em C, `threading.Thread` no Python), o `clone` pede para **compartilhar** a memória (`CLONE_VM`), a tabela de descritores (`CLONE_FILES`), o diretório (`CLONE_FS`) e os tratadores de sinais (`CLONE_SIGHAND`), e para entrar no mesmo grupo (`CLONE_THREAD`).\n\nCada thread tem a sua pilha, os seus registradores e um identificador próprio (TID), mas `getpid()` devolve o mesmo número em todas as threads do processo: o identificador do grupo. No `ps -eLf`, cada thread aparece numa linha, com o TID na coluna LWP."},{type:`callout`,tone:`warn`,text:'Num programa com várias threads, o fork copia **só a thread que o chamou**. Se outra thread estava segurando um lock naquele instante (dentro do `malloc` ou de um logger, por exemplo), o filho herda o lock fechado e ninguém vai abri-lo: o filho pode travar para sempre. Por isso, desde o Python 3.12, `os.fork()` emite um `DeprecationWarning` quando detecta várias threads, e no Python 3.14 o `multiprocessing` deixou de usar "fork" como padrão no Linux (passou a usar "forkserver"). Regra prática: num programa com threads, o filho de um fork só deve chamar exec; ou use `subprocess`.',title:`fork e threads não combinam`},{type:`callout`,tone:`deep`,text:'`printf("oi")` em C sem quebra de linha, ou `print("oi")` no Python com a saída redirecionada para um arquivo ou pipe, não escreve na hora: o texto fica num buffer, na memória do processo, esperando encher. Se houver um fork nesse meio-tempo, o filho recebe uma cópia do buffer, e o "oi" sai **duas vezes** quando cada processo esvazia o seu. O remédio é chamar `sys.stdout.flush()` antes do fork e, num filho que não vai fazer exec, terminar com `os._exit()`, que não esvazia buffers nem roda as rotinas de saída herdadas do pai.',title:`Por que a saída às vezes aparece duplicada`}]},{stage:`exemplo`,blocks:[{type:`md`,text:"O bash, com PID 1200, recebe a linha `wc -l < notas.txt > total.txt`: contar as linhas de notas.txt e guardar o resultado em total.txt. Acompanhe os processos e os descritores 0 (entrada), 1 (saída) e 2 (erro) de cada um:"},{type:`table`,head:[`Passo`,`Processo`,`O que faz`,`Descritores 0 / 1 / 2`,`Estado depois`],rows:[[`1`,`bash (1200)`,`lê a linha e separa: programa wc, argumento -l, entrada notas.txt, saída total.txt`,`terminal / terminal / terminal`,`executando`],[`2`,`bash (1200)`,"`fork()` devolve 1201",`o filho 1201 nasce com os mesmos três: terminal / terminal / terminal`,`pai e filho prontos ou executando`],[`3`,`bash (1200)`,"`waitpid(1201)`: o filho ainda não terminou",`—`,`bash bloqueado`],[`4`,`filho (1201)`,'`open("notas.txt")` devolve 3; `dup2(3, 0)`; `close(3)`',`notas.txt / terminal / terminal`,`executando`],[`5`,`filho (1201)`,'`open("total.txt")` para escrita, criando e truncando, devolve 3; `dup2(3, 1)`; `close(3)`',`notas.txt / total.txt / terminal`,`executando`],[`6`,`filho (1201)`,'`execvp("wc", ["wc", "-l"])`: o código do bash some do processo 1201 e entra o do wc',`notas.txt / total.txt / terminal (o exec preserva)`,`executando, ainda com PID 1201`],[`7`,`wc (1201)`,'lê o descritor 0 até o fim, escreve "42" no 1 e chama `exit(0)`',`—`,`zumbi`],[`8`,`bash (1200)`,"o kernel acorda o bash; `waitpid` devolve 1201 e o status; o bash guarda `$?` = 0, e a entrada do 1201 sai da tabela",`—`,`bash pronto, depois executando`]],caption:`Os passos 3 e 4 podem acontecer em qualquer ordem, ou ao mesmo tempo em núcleos diferentes: depois do fork, quem roda primeiro é decisão do escalonador.`},{type:`md`,text:`Repare em três detalhes:

- **O wc não sabe de arquivo nenhum.** Ele lê do 0 e escreve no 1, como faria no terminal. Quem ligou os fios foi o shell, no filho, entre o fork e o exec.
- **O total.txt é truncado no passo 5, antes de o wc rodar.** Por isso \`sort dados.txt > dados.txt\` apaga o arquivo: quando o sort vai ler dados.txt, o shell já o esvaziou.
- **Entre os passos 7 e 8, o 1201 é um zumbi.** Aqui isso dura microssegundos, porque o bash já estava bloqueado no waitpid. Se o pai demorasse a chamar wait, um \`ps\` em outro terminal mostraria:`},{type:`code`,lang:`text`,code:`$ ps -o pid,ppid,stat,cmd -p 1200,1201
    PID    PPID STAT CMD
   1200    1100 Ss   bash
   1201    1200 Z    [wc] <defunct>`,runnable:!1}]},{stage:`codigo`,blocks:[{type:`md`,text:"O Python do navegador (Pyodide) não cria processos: não há `os.fork` aqui, nem no Windows. O primeiro programa é para rodar no seu computador, com Linux ou macOS. O segundo é uma simulação que roda aqui e mostra a regra mais estranha do fork: ele retorna duas vezes."},{type:`code`,lang:`python`,code:`import os
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
        print(f.read()[:200])`,runnable:!1,caption:`Rode no seu computador (Linux ou macOS): é o que o shell faz para ls -l > lista.txt.`},{type:`code`,lang:`python`,code:`import subprocess

with open("lista.txt", "w") as saida:
    r = subprocess.run(["ls", "-l"], stdout=saida)   # cria o processo, redireciona, executa e espera
print("código de saída:", r.returncode)`,runnable:!1,caption:`O mesmo com a biblioteca padrão, que é o que você deve usar no dia a dia.`},{type:`code`,lang:`python`,code:`from collections import deque

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
rodar([("fork", "a"), ("fork", "b"), ("print", None)])`,runnable:!0,caption:`Cada processo simulado tem PID, contador de programa (pc) e memória própria. No programa 2, o processo 102 é neto do 100. Invente outros programas e preveja a saída antes de rodar.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e8-fork-1`,kind:`mcq`,prompt:"Logo depois de `pid = os.fork()`, dois processos executam a linha seguinte. Que valor `pid` tem em cada um?",difficulty:`facil`,skills:[`so-processos`],hints:[`Os dois processos rodam o mesmo código. Como cada um descobre que papel tem?`,`Qual dos dois precisa saber o PID do outro para poder esperar por ele com waitpid?`],explanation:`O fork devolve no pai o PID do filho, porque é o pai quem precisa dele para chamar waitpid; no filho devolve 0, que não pode ser o PID de um filho. O filho descobre o PID do pai com os.getppid(). A memória é copiada, mas o valor de retorno é posto depois, diferente em cada processo; e o filho continua da mesma instrução, não do começo do programa.`,options:[{text:`No pai, o PID do filho; no filho, 0`,correct:!0,feedback:`Isso: o pai recebe o número de que precisa para esperar o filho, e o filho recebe 0, que nunca é o PID de um filho.`},{text:`No pai, 0; no filho, o PID do pai`,feedback:`Está invertido. O filho não precisa receber o PID do pai: ele o obtém com os.getppid(). Quem precisa de um número é o pai, para chamar waitpid.`},{text:`Nos dois, o PID do filho, porque a memória do pai é copiada para o filho`,feedback:`A memória é copiada, mas o valor de retorno do fork é colocado por último, e é diferente em cada processo. Se fosse igual, os dois não teriam como saber quem é quem.`},{text:`Só o pai executa a linha seguinte: o filho começa do início do programa`,feedback:`O filho recebe uma cópia dos registradores, inclusive do contador de programa, e por isso continua exatamente do ponto do fork. Começar um programa do início é o que acontece depois de um exec.`}]}},{type:`exercise`,exercise:{id:`e8-fork-2`,kind:`mcq`,prompt:"Quantas vezes este programa imprime `oi`? (Resolva de cabeça: no navegador não há fork.)",code:{lang:`python`,code:`import os

for i in range(3):
    if os.fork() == 0:
        break
print("oi")`},difficulty:`intermediario`,skills:[`so-processos`],hints:[`Que valor o fork devolve no filho? O que o filho faz em seguida com esse valor?`,`Algum filho chega a fazer outro fork? E o processo original, quantos forks faz?`,`O processo original também chega ao print?`],explanation:"Cada filho recebe 0 do fork, sai do laço com break e vai direto ao print, sem fazer fork nenhum. Só o processo original passa pelas três voltas, criando 3 filhos, e depois também imprime: 1 + 3 = 4. Sem o break, cada fork duplicaria todos os processos que passam por ele, e seriam 2³ = 8. Com `if os.fork() != 0: break` (o pai sai e o filho continua), o resultado seria uma corrente pai → filho → neto → bisneto, também com 4 processos.",options:[{text:`4`,correct:!0,feedback:`Isso: o processo original faz 3 forks e cada filho sai do laço na hora. São 3 filhos mais o original.`},{text:`8`,feedback:`Seriam 8 sem o break: aí cada fork duplicaria todos os processos que passam por ele (2³). Aqui o filho recebe 0 e sai do laço sem fazer mais forks.`},{text:`3`,feedback:`Você contou os filhos, mas esqueceu o processo original: depois das três voltas, ele também chega ao print.`},{text:`7`,feedback:`7 é o número de processos criados por três forks sem o break (8 − 1). Aqui os filhos não fazem fork, e o original também imprime.`}]}},{type:`exercise`,exercise:{id:`e8-fork-3`,kind:`parsons`,lang:`python`,prompt:"Monte o código (para Linux ou macOS) que faz o que o shell faz em `ls -l > lista.txt`: o filho redireciona a saída padrão para o arquivo e troca de programa; o pai espera e mostra o código de saída. O `import os` já foi feito.",difficulty:`intermediario`,skills:[`so-processos`],hints:[`Quem deve abrir o arquivo e mexer nos descritores: o pai ou o filho? O que aconteceria com a saída do próprio shell se fosse o pai?`,`O dup2 precisa de um descritor que já exista. E depois de um exec bem-sucedido, alguma linha do filho ainda rodaria?`,`Depois do dup2, o descritor 1 já aponta para o arquivo. O descritor devolvido pelo open ainda é necessário?`],explanation:`O fork vem primeiro. O filho (pid == 0) abre o arquivo, faz o descritor 1 apontar para ele com dup2, fecha a cópia que sobrou (o 1 continua apontando para o arquivo) e só então chama execvp, que não retorna se der certo; por isso ele é a última linha do filho. O pai, no else, bloqueia em waitpid até o ls terminar e converte o status em código de saída. Se o pai abrisse o arquivo e fizesse o dup2, a saída do próprio shell iria para lista.txt. Detalhe do Python: o descritor devolvido por os.open é marcado para fechar no exec (PEP 446), mas o os.dup2 cria o descritor 1 herdável, e é ele que o ls recebe.`,lines:[`pid = os.fork()`,`if pid == 0:`,`    fd = os.open("lista.txt", os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o644)`,`    os.dup2(fd, 1)`,`    os.close(fd)`,`    os.execvp("ls", ["ls", "-l"])`,`else:`,`    _, status = os.waitpid(pid, 0)`,`    print("ls terminou com código", os.waitstatus_to_exitcode(status))`]}},{type:`exercise`,exercise:{id:`e8-fork-4`,kind:`code`,lang:`python`,prompt:'A tabela de processos de um kernel simulado é um dict `PID → {"ppid": ..., "estado": ..., "status": ...}`, com estados `"executando"`, `"pronto"`, `"bloqueado"` ou `"zumbi"`; `status` é o código de saída (só faz sentido nos zumbis).\n\nEscreva `esperar(tabela, pai)`, que imita o `wait` do processo `pai`:\n\n- se `pai` tem algum filho zumbi, recolha o de **menor PID**: remova-o da tabela e devolva a tupla `(pid, status)`;\n- se `pai` tem filhos, mas nenhum é zumbi, devolva `None` (no sistema de verdade, o pai ficaria bloqueado);\n- se `pai` não tem filho nenhum, devolva `-1` (o erro `ECHILD`).\n\nSó contam os filhos diretos (quem tem `ppid == pai`), não os netos.',difficulty:`intermediario`,skills:[`so-processos`],hints:[`Quem são os filhos de pai? Que campo da tabela diz isso?`,`Há três situações: nenhum filho, filhos sem zumbi, ao menos um zumbi. Em que ordem é mais simples testá-las?`,`A ordem de um dict é a ordem de inserção. Ela garante o menor PID? Que função devolve o menor valor de uma coleção?`,`Recolher é tirar da tabela. Que método de dict remove uma chave e devolve o valor ao mesmo tempo?`],explanation:`É o que o kernel faz num wait: procura entre os filhos diretos um que já terminou; se acha, devolve PID e código de saída e libera a entrada (o zumbi deixa de existir); se todos ainda estão vivos, o pai bloqueia; se não há filhos, falha com ECHILD. Um zumbi só é recolhido pelo próprio pai: o 203 do teste é neto do 200, e só o 202 pode recolhê-lo. Por isso um servidor que esquece o wait acumula zumbis, por mais que outros processos chamem wait.`,starter:`def esperar(tabela, pai):
    # tabela: dict PID -> {"ppid": ..., "estado": ..., "status": ...}
    # devolva (pid, status) do filho zumbi de menor PID, removendo-o da tabela;
    # None se pai tem filhos, mas nenhum zumbi; -1 se pai não tem filhos
    pass`,solution:`def esperar(tabela, pai):
    filhos = [pid for pid, p in tabela.items() if p["ppid"] == pai]
    if not filhos:
        return -1
    zumbis = [pid for pid in filhos if tabela[pid]["estado"] == "zumbi"]
    if not zumbis:
        return None
    pid = min(zumbis)
    status = tabela.pop(pid)["status"]
    return (pid, status)`,tests:[{name:`recolhe zumbis do menor PID para o maior`,code:`def _tabela():
    return {
        1: {"ppid": 0, "estado": "executando", "status": None},
        200: {"ppid": 1, "estado": "executando", "status": None},
        201: {"ppid": 200, "estado": "zumbi", "status": 3},
        202: {"ppid": 200, "estado": "bloqueado", "status": None},
        203: {"ppid": 202, "estado": "zumbi", "status": 7},
        204: {"ppid": 200, "estado": "zumbi", "status": 0},
    }
t = _tabela()
r = esperar(t, 200)
assert r == (201, 3), f"o processo 200 tem dois filhos zumbis (201 e 204): recolha o de menor PID e devolva (pid, status); veio {r!r}"
assert 201 not in t, "depois de recolhido, o zumbi 201 precisa sair da tabela: é isso que libera a entrada dele"
r = esperar(t, 200)
assert r == (204, 0), f"na segunda chamada sobra o zumbi 204, que terminou com status 0; veio {r!r}"
assert 204 not in t, "o zumbi 204 também precisa sair da tabela"`},{name:`filhos vivos e nenhum zumbi: o pai bloquearia`,code:`def _tabela():
    return {
        1: {"ppid": 0, "estado": "executando", "status": None},
        200: {"ppid": 1, "estado": "executando", "status": None},
        201: {"ppid": 200, "estado": "zumbi", "status": 3},
        202: {"ppid": 200, "estado": "bloqueado", "status": None},
        203: {"ppid": 202, "estado": "zumbi", "status": 7},
        204: {"ppid": 200, "estado": "zumbi", "status": 0},
    }
t = _tabela()
del t[201], t[204]
r = esperar(t, 200)
assert r is None, f"200 tem um filho vivo (202, bloqueado) e nenhum zumbi: o pai ficaria bloqueado, então devolva None; veio {r!r}"
assert 202 in t, "202 está vivo: não pode sair da tabela"
t = {1: {"ppid": 0, "estado": "executando", "status": None},
     7: {"ppid": 1, "estado": "pronto", "status": None}}
r = esperar(t, 1)
assert r is None, f"o filho 7 está pronto (vivo): devolva None; veio {r!r}"`},{name:`só filhos diretos contam`,code:`def _tabela():
    return {
        1: {"ppid": 0, "estado": "executando", "status": None},
        200: {"ppid": 1, "estado": "executando", "status": None},
        201: {"ppid": 200, "estado": "zumbi", "status": 3},
        202: {"ppid": 200, "estado": "bloqueado", "status": None},
        203: {"ppid": 202, "estado": "zumbi", "status": 7},
        204: {"ppid": 200, "estado": "zumbi", "status": 0},
    }
t = _tabela()
r = esperar(t, 1)
assert r is None, f"o init (1) tem um filho vivo (200); o 203 é zumbi, mas é neto do init, e não filho: devolva None; veio {r!r}"
assert 203 in t, "o 203 não é filho do 1: não pode ser recolhido por ele"
r = esperar(t, 202)
assert r == (203, 7), f"o 203 é filho do 202 e terminou com status 7; veio {r!r}"`},{name:`sem filhos: -1`,code:`def _tabela():
    return {
        1: {"ppid": 0, "estado": "executando", "status": None},
        200: {"ppid": 1, "estado": "executando", "status": None},
        201: {"ppid": 200, "estado": "zumbi", "status": 3},
        202: {"ppid": 200, "estado": "bloqueado", "status": None},
        203: {"ppid": 202, "estado": "zumbi", "status": 7},
        204: {"ppid": 200, "estado": "zumbi", "status": 0},
    }
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
assert r == -1, f"depois de recolher o único filho, o pai não tem mais filhos: -1; veio {r!r}"`},{name:`menor PID mesmo fora da ordem do dict`,code:`t = {1: {"ppid": 0, "estado": "executando", "status": None},
     300: {"ppid": 1, "estado": "zumbi", "status": 30},
     250: {"ppid": 1, "estado": "zumbi", "status": 25},
     280: {"ppid": 1, "estado": "executando", "status": None}}
r = esperar(t, 1)
assert r == (250, 25), f"os zumbis filhos do 1 são 300 e 250: o de menor PID é o 250, mesmo aparecendo depois no dict; veio {r!r}"
r = esperar(t, 1)
assert r == (300, 30), f"depois sobra o zumbi 300; veio {r!r}"
r = esperar(t, 1)
assert r is None, f"sobrou só o 280, vivo: None; veio {r!r}"`}]}},{type:`exercise`,exercise:{id:`e8-fork-5`,kind:`fix`,lang:`python`,prompt:"Este mini-shell simula o fork com `copy.deepcopy`: cada comando roda numa **cópia** do estado do shell (diretório atual e variáveis de ambiente), como um processo filho. `NOME=valor comando` define uma variável só para aquele comando, como no bash.\n\nO problema: `cd /tmp` seguido de `pwd` continua mostrando o diretório antigo, e `export` não tem efeito. Corrija `rodar` para que `cd` e `export` funcionem como no bash, sem estragar o resto: os outros comandos continuam rodando numa cópia, e `LANG=C printenv LANG` não pode mudar o `LANG` do shell. Vale o mesmo para um comando interno: `LANG=C cd /tmp` muda o diretório do shell, mas não o `LANG` dele.",difficulty:`intermediario`,skills:[`so-processos`],hints:[`Rode cd /tmp e depois pwd. O cd mudou o diretório de quem?`,`Quando o filho termina, o que acontece com as mudanças que ele fez na própria cópia?`,`No bash de verdade, o cd passa por fork? Que comandos precisam rodar no próprio shell?`,`Se você simplesmente remover a cópia, o que acontece com LANG=C printenv LANG?`],explanation:`cd e export mudam o estado do próprio shell, e um filho não consegue mudar o estado do pai: quando ele termina, a cópia some com ele. Por isso o bash trata esses comandos como internos (builtins) e os executa antes de qualquer fork. Os demais continuam numa cópia, e é isso que faz NOME=valor comando valer só para aquele comando. Tirar o deepcopy de tudo "consertaria" o cd, mas faria o LANG=C vazar para o shell.`,starter:`import copy

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
    return comando + ": comando não encontrado"`,solution:`import copy

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
    return comando + ": comando não encontrado"`,tests:[{name:`cd muda o diretório do shell`,code:`sh = {"cwd": "/home/ana", "env": {"LANG": "pt_BR.UTF-8", "HOME": "/home/ana"}}
assert rodar(sh, "pwd") == "/home/ana", "pwd deve mostrar o diretório atual do shell"
assert rodar(sh, "cd /tmp") == "", "cd não imprime nada"
r = rodar(sh, "pwd")
assert r == "/tmp", f"depois de 'cd /tmp', pwd deveria mostrar /tmp, mas mostrou {r!r}: o cd mudou o diretório de quem?"
rodar(sh, "cd /var/log")
assert sh["cwd"] == "/var/log", "o diretório atual do próprio shell (shell['cwd']) precisa mudar"`},{name:`export muda o ambiente do shell`,code:`sh = {"cwd": "/home/ana", "env": {"LANG": "pt_BR.UTF-8", "HOME": "/home/ana"}}
rodar(sh, "export CIDADE=Recife")
r = rodar(sh, "printenv CIDADE")
assert r == "Recife", f"depois de 'export CIDADE=Recife', printenv CIDADE deveria dar 'Recife', mas deu {r!r}"
rodar(sh, "export LANG=C")
r = rodar(sh, "printenv LANG")
assert r == "C", f"depois de 'export LANG=C', printenv LANG deveria dar 'C', mas deu {r!r}"`},{name:`NOME=valor comando não vaza para o shell`,code:`def _novo():
    return {"cwd": "/home/ana", "env": {"LANG": "pt_BR.UTF-8", "HOME": "/home/ana"}}
sh = _novo()
r = rodar(sh, "LANG=C printenv LANG")
assert r == "C", f"'LANG=C printenv LANG' vale para aquele comando: deveria imprimir C, imprimiu {r!r}"
r = rodar(sh, "printenv LANG")
assert r == "pt_BR.UTF-8", f"'LANG=C comando' não pode mudar o shell: depois dele, LANG continua pt_BR.UTF-8, mas veio {r!r}. Os comandos que não são internos ainda precisam rodar numa cópia (o fork continua necessário para eles)"
rodar(sh, "pwd")
rodar(sh, "ls -l")
assert sh == _novo(), "pwd e programas externos não podem alterar o estado do shell"`},{name:`NOME=valor antes de um comando interno também é temporário`,code:`sh = {"cwd": "/home/ana", "env": {"LANG": "pt_BR.UTF-8", "HOME": "/home/ana"}}
assert rodar(sh, "LANG=C cd /tmp") == "", "cd não imprime nada, mesmo com NOME=valor na frente"
r = rodar(sh, "pwd")
assert r == "/tmp", f"'LANG=C cd /tmp' ainda é um cd: o diretório do shell deveria virar /tmp, mas pwd mostrou {r!r}"
r = rodar(sh, "printenv LANG")
assert r == "pt_BR.UTF-8", f"no bash, 'LANG=C cd /tmp' muda o diretório, mas o LANG=C vale só durante o cd: depois dele, LANG continua pt_BR.UTF-8, e veio {r!r}. O shell não pode copiar para si tudo o que o filho mudou"`},{name:`comando desconhecido`,code:`sh = {"cwd": "/home/ana", "env": {}}
r = rodar(sh, "ls -l")
assert r == "ls: comando não encontrado", f"comando desconhecido: veio {r!r}"`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e8-fork-desafio`,kind:`code`,lang:`python`,prompt:'Simule a tabela de processos de um kernel Unix. Escreva `simular(eventos)`, que devolve a tupla `(colhidos, tabela)`.\n\nO sistema começa só com o init: PID 1, sem pai (PPID 0). Os PIDs novos são 2, 3, 4, ..., em ordem de criação, e nunca são reaproveitados. Os eventos são:\n\n- `("fork", p)`: p cria um filho, que começa `"ativo"`;\n- `("exit", p, codigo)`: p termina e vira `"zumbi"` com esse código;\n- `("wait", p)`: se p tem filho zumbi, recolhe o de menor PID; se tem filhos, mas nenhum zumbi, p fica `"bloqueado"`; se não tem filho nenhum, a chamada falha na hora.\n\nRegras do kernel:\n\n1. Quando p termina, os filhos dele (vivos ou zumbis) são adotados pelo init.\n2. O init está sempre esperando: todo zumbi filho do init, inclusive um que acabou de ser adotado, é recolhido por ele na hora.\n3. Um processo bloqueado em wait é acordado quando um filho dele termina: recolhe esse filho na hora e volta a `"ativo"`.\n\n`colhidos` é a lista de tuplas `(pai, filho, codigo)`, na ordem em que acontecem; um wait que falha registra `(p, -1, None)`. Quando um exit causa várias colheitas, primeiro vêm as dos zumbis adotados pelo init, em ordem crescente de PID, e por último a do próprio processo que terminou.\n\n`tabela` é um dict `PID → (PPID, estado)` com todos os processos que ainda estão na tabela (`"ativo"`, `"bloqueado"` ou `"zumbi"`), inclusive `1: (0, "ativo")`. Os eventos nunca pedem exit ou wait do init, nem citam processo inexistente, zumbi ou bloqueado.',difficulty:`desafio`,skills:[`so-processos`],hints:[`Que informações você precisa guardar de cada processo para responder: quem é o pai, em que estado está, com que código terminou?`,`No exit de p, quais são os destinos possíveis do próprio p? Do que isso depende?`,`Antes de decidir o destino de p, resolva os filhos dele. Algum já era zumbi? Quem é o pai deles agora?`,`Um wait que bloqueia não registra nada na hora. Em que evento ele termina, e quem registra a colheita?`,`Cuidado ao remover itens de um dict enquanto percorre esse mesmo dict.`],explanation:`O núcleo do problema é o exit: o processo vira zumbi, os filhos dele passam para o init (que recolhe na hora os que já eram zumbis) e, por fim, o próprio zumbi é recolhido se o pai é o init ou está bloqueado em wait; senão, ele fica na tabela até o pai chamar wait. O wait é a outra metade: recolhe se já há zumbi, bloqueia se há filhos vivos, falha se não há filhos. É a mesma lógica que o Linux segue no exit e no wait, e é por isso que zumbis só se acumulam quando um pai vivo nunca chama wait: órfãos sempre acabam recolhidos pelo init.`,starter:`def simular(eventos):
    # devolva (colhidos, tabela)
    # colhidos: lista de (pai, filho, codigo), na ordem em que acontecem
    # tabela: dict PID -> (PPID, estado) dos processos que ainda estão na tabela
    pass`,solution:`def simular(eventos):
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
    return colhidos, {pid: (x["ppid"], x["estado"]) for pid, x in tabela.items()}`,tests:[{name:`o shell roda um comando e espera`,code:`import random as _random

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
_confere_kernel([("fork", 1)], "o init (1) cria o 2, que começa ativo; nada é recolhido")
_confere_kernel([("fork", 1), ("fork", 2), ("wait", 2)], "o shell (2) tem um filho vivo: ele bloqueia e nada é recolhido ainda")
_confere_kernel([("fork", 1), ("fork", 2), ("wait", 2), ("exit", 3, 0)], "quando o 3 termina, o pai bloqueado (2) acorda, recolhe o 3 e volta a ativo")`},{name:`zumbi espera o wait do pai`,code:`import random as _random

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
_confere_kernel([("fork", 1), ("fork", 2), ("exit", 3, 7)], "o pai (2) ainda não chamou wait: o 3 fica na tabela como zumbi")
_confere_kernel([("fork", 1), ("fork", 2), ("exit", 3, 7), ("wait", 2)], "o wait do 2 recolhe o zumbi 3, com código 7")
_confere_kernel([("fork", 1), ("wait", 2)], "o 2 não tem filhos: o wait falha na hora e registra (2, -1, None)")`},{name:`órfãos são adotados e recolhidos pelo init`,code:`import random as _random

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
_confere_kernel([("fork", 1), ("fork", 2), ("exit", 2, 0)], "o 2 é filho do init, que o recolhe na hora; o 3, órfão, passa a ter PPID 1")
_confere_kernel([("fork", 1), ("fork", 2), ("exit", 2, 0), ("exit", 3, 5)], "o 3 foi adotado pelo init, então o init o recolhe quando ele termina")
_confere_kernel([("fork", 1), ("fork", 2), ("fork", 2), ("exit", 4, 9), ("exit", 2, 1)], "o zumbi 4 é adotado e recolhido pelo init antes de o próprio 2 ser recolhido")
_confere_kernel([("fork", 1), ("fork", 2), ("fork", 3), ("wait", 3), ("exit", 2, 0)], "o 3 está bloqueado esperando o 4; ao ser adotado pelo init, continua bloqueado")
_confere_kernel([("fork", 1), ("fork", 2), ("fork", 2), ("fork", 2), ("exit", 5, 5), ("exit", 3, 3), ("exit", 2, 2)], "o 2 termina com dois filhos zumbis (3 e 5) e um vivo (4): o init recolhe o 3, depois o 5 (ordem crescente de PID), e por último o próprio 2; o 4 fica órfão, com PPID 1")`},{name:`wait recolhe o menor PID e bloqueia quando só há vivos`,code:`import random as _random

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
eventos = [("fork", 1), ("fork", 2), ("fork", 2), ("fork", 2), ("exit", 5, 50), ("exit", 4, 40),
           ("wait", 2), ("wait", 2), ("wait", 2), ("exit", 3, 30), ("wait", 2)]
_confere_kernel(eventos, "o 2 recolhe o 4 e depois o 5 (menor PID primeiro), bloqueia esperando o 3, é acordado quando o 3 termina e, sem filhos, o último wait falha")`},{name:`quem acorda o pai bloqueado`,code:`import random as _random

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
_confere_kernel([("fork", 1), ("fork", 2), ("fork", 3), ("exit", 4, 4), ("wait", 2), ("exit", 3, 3)], "quando o 3 termina, o init recolhe primeiro o zumbi 4 (que era filho do 3) e depois o 2, bloqueado, recolhe o 3")
_confere_kernel([("fork", 1), ("fork", 2), ("fork", 1), ("wait", 2), ("exit", 4, 0)], "o 4 não é filho do 2: o fim dele não acorda o 2, que continua bloqueado")
_confere_kernel([("fork", 1), ("exit", 2, 0), ("fork", 1)], "PIDs não são reaproveitados: depois do 2, o próximo é o 3")`},{name:`sequências aleatórias`,code:`import random as _random

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
rng = _random.Random(8)
for _ in range(200):
    _confere_kernel(_gera_eventos(rng, rng.randint(1, 18)))`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:"**Mini-shell de verdade.** No seu computador (Linux ou macOS), escreva em Python um shell que lê uma linha, separa as palavras com `shlex.split` e executa com `os.fork`, `os.execvp` e `os.waitpid`. Vá por partes: (1) comandos simples, mostrando o código de saída; (2) `cd` e `exit` como comandos internos; (3) `> arquivo` e `< arquivo` com `os.open` e `os.dup2`; (4) um pipe `a | b` com `os.pipe()` e dois forks; (5) faça o pai demorar a chamar wait (um `time.sleep` antes do waitpid) e encontre o zumbi no `ps` de outro terminal. O OSTEP propõe um projeto parecido, em C: o shell *wish*, no repositório ostep-projects."}]},{stage:`revisao`,blocks:[{type:`md`,text:"- PCB (`task_struct` no Linux): PID, PPID, estado, registradores salvos, memória, descritores, diretório, prioridade, código de saída.\n- Transições: bloqueado volta para pronto, nunca direto para executando; a preempção leva de executando para pronto.\n- `fork`: devolve o PID do filho no pai e 0 no filho; memória copiada (com cópia na escrita); a ordem de execução depois dele é indefinida. n forks seguidos deixam 2ⁿ processos.\n- `exec`: troca o programa e mantém PID, diretório e descritores; se der certo, não retorna.\n- `wait`/`waitpid`: bloqueia até um filho terminar e recolhe o código (0 = sucesso; morto pelo sinal n → 128 + n no bash).\n- Zumbi: terminou e o pai não chamou wait. Órfão: o pai terminou antes; o init adota e recolhe.\n- Entre o fork e o exec, o shell prepara redirecionamentos e pipes com `dup2`; `cd` e `export` são internos porque mudam o próprio shell.\n- No Linux, processo e thread saem de `clone()`: a thread compartilha memória e descritores. Fork num programa com threads copia só a thread que chamou."},{type:`callout`,tone:`english`,text:`- **fork / exec / wait**: as três chamadas que criam processos, trocam o programa e recolhem o filho
- **parent / child process**: processo pai / filho
- **exit status / exit code**: código de saída
- **zombie (defunct) process**: processo zumbi
- **orphan process / reparenting**: processo órfão / adoção pelo init
- **file descriptor, redirection, pipe**: descritor de arquivo, redirecionamento, pipe
- **shell builtin**: comando interno do shell

Frase típica de entrevista: *"fork() returns twice: it returns the child's PID in the parent and zero in the child. The shell forks, sets up redirections in the child, and then calls exec, so the new program inherits the file descriptors."*

Frase típica de documentação (man 2 wait): *"A child that terminates, but has not been waited for becomes a zombie."*`,title:`English corner`}]}],cards:[{id:`l8-fork-exec-wait#1`,front:`O que fork() devolve no pai e no filho? E se falhar?`,back:`No pai, o PID do filho; no filho, 0. Se falhar, devolve −1 no pai (em C) e nenhum filho é criado; no Python, levanta OSError.`},{id:`l8-fork-exec-wait#2`,front:`O que exec troca e o que preserva?`,back:`Troca o programa inteiro (código, dados, heap e pilha). Preserva PID, PPID, diretório atual e os descritores abertos, exceto os marcados close-on-exec. Se der certo, não retorna.`},{id:`l8-fork-exec-wait#3`,front:`O que é um processo zumbi e como ele desaparece?`,back:`Um processo que terminou, mas cujo pai ainda não chamou wait. Desaparece quando o pai chama wait ou quando o pai termina e o init o adota e recolhe.`},{id:`l8-fork-exec-wait#4`,front:`O que acontece com um processo órfão?`,back:`Continua rodando, adotado pelo init (PID 1) ou por um subreaper, que chama wait por ele quando ele terminar.`},{id:`l8-fork-exec-wait#5`,front:`Por que cd precisa ser um comando interno do shell?`,back:`Porque o diretório atual pertence ao processo. Num filho, o cd mudaria só o diretório do filho, que logo termina, e o shell ficaria onde estava.`},{id:`l8-fork-exec-wait#6`,front:"Como o shell executa `cmd > arq.txt`?",back:`Faz fork; no filho, abre arq.txt, usa dup2 para que ele vire o descritor 1 e faz exec do cmd; o pai espera com waitpid.`},{id:`l8-fork-exec-wait#7`,front:`Qual é o $? no bash de um processo morto por kill -9?`,back:`137, isto é, 128 + 9 (SIGKILL).`},{id:`l8-fork-exec-wait#8`,front:`No Linux, o que diferencia criar uma thread de criar um processo?`,back:`Os dois usam clone(). A thread compartilha memória, descritores e grupo (CLONE_VM, CLONE_FILES, CLONE_THREAD...); o processo recebe cópias.`}]};export{e as default};
//# sourceMappingURL=l8-fork-exec-wait-CaoNbgLT.js.map