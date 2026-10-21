var e={id:`l8-prioridades-mlfq`,moduleId:`m8-1`,title:`Prioridades, MLFQ e o custo da troca de contexto`,titleEn:`Priorities, MLFQ and the cost of context switching`,summary:`Como medir um escalonador (retorno × resposta), como prioridades causam inanição e o envelhecimento a evita, como a fila multinível com realimentação aprende quem é interativo sem saber a duração de ninguém, o que acontece numa troca de contexto e como o tamanho do quantum equilibra resposta e desperdício.`,minutes:50,objectives:[`Calcular tempo de retorno e tempo de resposta e explicar por que o Round Robin vai bem num e mal no outro`,`Simular escalonamento por prioridade e explicar inanição e envelhecimento`,`Aplicar as cinco regras da MLFQ e explicar para que serve cada uma, inclusive contra quem tenta enganar o escalonador`,`Descrever os passos de uma troca de contexto e diferenciar trocas voluntárias e involuntárias`,`Calcular o desperdício de CPU de um quantum e escolher entre quantum curto e longo`,`Relacionar nice, CFS/EEVDF e as políticas de tempo real do Linux com esses conceitos`],skills:[`so-processos`],terms:[{pt:`tempo de retorno`,en:`turnaround time`,def:`Da chegada do processo até ele terminar: término − chegada.`},{pt:`tempo de resposta`,en:`response time`,def:`Da chegada até a primeira vez que o processo roda: primeira execução − chegada.`,example:`Round Robin trades turnaround time for response time.`},{pt:`menor tempo restante primeiro`,en:`shortest remaining time first (SRTF)`,def:`Versão preemptiva do SJF: um processo que chega com duração menor do que o que falta ao atual toma a CPU.`},{pt:`escalonamento por prioridade`,en:`priority scheduling`,def:`A CPU vai para o processo pronto de maior prioridade; empates se resolvem com outra política, como FCFS ou Round Robin.`},{pt:`inanição`,en:`starvation`,def:`Situação em que um processo pronto nunca recebe a CPU porque sempre há alguém mais prioritário.`},{pt:`envelhecimento`,en:`aging`,def:`Aumentar aos poucos a prioridade de quem espera há muito tempo, para evitar a inanição.`},{pt:`fila multinível com realimentação`,en:`multi-level feedback queue (MLFQ)`,def:`Várias filas de prioridade; o processo desce ou volta ao topo conforme o comportamento observado.`},{pt:`limite de tempo`,en:`time allotment`,def:`Na MLFQ, quanto tempo de CPU um processo pode gastar num nível antes de descer.`},{pt:`reforço de prioridade`,en:`priority boost`,def:`Na MLFQ, devolver periodicamente todos os processos à fila mais alta.`},{pt:`interrupção do temporizador`,en:`timer interrupt`,def:`Interrupção periódica do hardware que devolve o controle ao kernel e torna a preempção possível.`},{pt:`troca voluntária`,en:`voluntary context switch`,def:`Troca de contexto que acontece porque o processo bloqueou (E/S, sleep, wait).`},{pt:`troca involuntária`,en:`involuntary context switch`,def:`Troca de contexto em que o kernel tira a CPU do processo (fim do quantum ou alguém mais prioritário).`},{pt:`sobrecarga`,en:`overhead`,def:`Trabalho que não é do usuário, como trocar de contexto; reduz a fração útil da CPU.`},{pt:`valor nice`,en:`nice value`,def:`No Linux, a "gentileza" de um processo comum, de −20 (mais prioridade) a 19 (menos); o padrão é 0.`,example:`Run the backup with nice -n 19 so it does not slow down the server.`}],references:[`ostep`,`tanenbaum-so`,`linux-man`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`FCFS, SJF e Round Robin, da primeira lição deste módulo, ou supõem que todo processo é igual, ou supõem que o sistema sabe quanto cada um vai durar. No seu computador, nenhuma das duas coisas é verdade: enquanto um \`npm install\` ou o treino de um modelo consome CPU por minutos, você digita num editor que precisa responder em milissegundos, e o sistema não sabe de antemão quem é quem.

A resposta dos sistemas reais é a **prioridade**: alguns processos passam na frente. Ela pode ser dada por alguém (o \`nice\` do Linux) ou aprendida pelo sistema, observando o comportamento: quem usa a fatia de CPU inteira parece um trabalho longo e desce; quem larga a CPU cedo para esperar o teclado parece interativo e fica no alto. Essa é a ideia da {{fila multinível com realimentação|multi-level feedback queue (MLFQ)}}.

E toda troca tem preço: cada troca de contexto gasta um tempo que não é de ninguém. Escolher o tamanho do quantum é escolher entre responder rápido e desperdiçar CPU.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`### Duas réguas: retorno e resposta
Para comparar escalonadores, a primeira lição deste módulo usou o tempo de espera. Duas outras medidas dizem mais sobre o que o usuário sente:

- {{tempo de retorno|turnaround time}} = término − chegada. É o que importa num trabalho em lote: o relatório, a compilação, o backup.
- {{tempo de resposta|response time}} = primeira execução − chegada. É o que importa num programa interativo: o clique precisa dar sinal de vida logo, mesmo que o trabalho todo demore.

Três processos, A, B e C, chegam juntos no instante 0 e precisam de 5 unidades de CPU cada:`},{type:`table`,head:[`Política`,`Linha do tempo`,`Retorno de A, B, C`,`Retorno médio`,`Resposta de A, B, C`,`Resposta média`],rows:[[`FCFS (aqui igual ao SJF)`,`AAAAA BBBBB CCCCC`,`5, 10, 15`,`10`,`0, 5, 10`,`5`],[`Round Robin, quantum 1`,`ABCABCABCABCABC`,`13, 14, 15`,`14`,`0, 1, 2`,`1`]]},{type:`md`,text:`O Round Robin é o melhor possível em resposta e um dos piores em retorno: ele estica todo mundo até o fim. Nenhuma política vence nas duas réguas ao mesmo tempo, e quem escolhe um escalonador está escolhendo qual delas sacrificar.

Se as durações fossem conhecidas, o melhor para o retorno médio seria o {{menor tempo restante primeiro|shortest remaining time first (SRTF)}}, a versão preemptiva do SJF: quando chega um processo mais curto do que o que falta ao atual, ele toma a CPU. O problema de sempre: o sistema não sabe quanto cada processo vai durar.

### Prioridades, inanição e envelhecimento
No {{escalonamento por prioridade|priority scheduling}}, cada processo tem um número, e a CPU vai para o processo pronto de maior prioridade; empates se resolvem com FCFS ou Round Robin. Ele pode ser **preemptivo** (um processo mais prioritário que fica pronto toma a CPU na hora) ou **não preemptivo** (espera o atual terminar ou bloquear). O SJF é um caso particular, em que a prioridade é a duração.`},{type:`callout`,tone:`warn`,text:'Qual número é "mais prioritário" depende do sistema. No Linux, um `nice` **menor** é mais prioritário (−20 é o mais favorecido), e muitos livros também tratam 0 como a prioridade mais alta. No Windows é o contrário: 31 é a mais alta. Antes de ler um número de prioridade, descubra a convenção. Nesta lição, **menor número = mais prioridade**.',title:`Número maior, prioridade maior?`},{type:`md`,text:`O risco é a {{inanição|starvation}}: com um fluxo constante de processos mais prioritários, um processo de baixa prioridade pode nunca rodar. Um boato famoso, registrado no livro de sistemas operacionais de Silberschatz, conta que, quando desligaram o IBM 7094 do MIT em 1973, encontraram um processo de baixa prioridade enviado em 1967 que ainda não tinha rodado.

O remédio clássico é o {{envelhecimento|aging}}: quanto mais tempo um processo espera, mais a prioridade dele sobe, até ele passar na frente de todo mundo. Uma regra simples: prioridade efetiva = prioridade − (tempo esperando) // k. Com k = 10, um processo de prioridade 20 que espera há 100 unidades fica tão urgente quanto um de prioridade 10 que acabou de chegar.

### MLFQ: aprender com o passado
A MLFQ não pede a duração de ninguém: ela observa. São várias filas, cada uma com um nível de prioridade e o seu quantum (em geral maior nas filas de baixo). As regras, como o OSTEP as apresenta:

1. Se a prioridade de A é maior que a de B, A roda (B não).
2. Se A e B têm a mesma prioridade, eles revezam em Round Robin, com o quantum daquela fila.
3. Um processo novo entra na fila mais alta.
4. Quando um processo gasta todo o seu {{limite de tempo|time allotment}} num nível, somando todas as vezes que rodou ali (não importa quantas vezes largou a CPU antes), ele desce um nível.
5. A cada período S, todos os processos voltam para a fila mais alta, e a contagem recomeça: é o {{reforço de prioridade|priority boost}}.

Cada regra tem um motivo:`},{type:`table`,head:[`Situação`,`O que a MLFQ faz`,`Regra`],rows:[[`processo novo, de duração desconhecida`,`aposta que ele é curto e o põe no topo; se for mesmo curto, termina rápido`,`3`],[`processo que usa a CPU sem parar`,`gasta o limite e desce, nível a nível, até a fila de baixo, onde roda com quantum maior e menos trocas`,`4`],[`processo interativo (editor, terminal)`,`usa pouca CPU de cada vez e demora a somar o limite; se usar menos que o limite entre dois reforços, nunca sai do topo`,`4 e 5`],[`processo que tenta enganar o escalonador`,`faz uma E/S logo antes do fim de cada quantum para parecer interativo, mas o tempo é somado e ele desce do mesmo jeito`,`4`],[`processo longo esquecido lá embaixo`,`volta ao topo no próximo reforço e ganha CPU, mesmo com muitos interativos`,`5`],[`programa que muda de comportamento`,`um cálculo que vira interativo volta ao topo no reforço e tem a chance de mostrar o novo perfil`,`5`]]},{type:`md`,text:`Assim a MLFQ se aproxima do SJF sem saber durações: os curtos terminam lá em cima, os longos afundam e deixam de atrapalhar. As constantes (quantas filas, o quantum de cada uma, o período S) não têm resposta certa: um S grande demais traz a inanição de volta; pequeno demais, todo mundo parece interativo. O Solaris, por exemplo, usava 60 filas, com quanta de 20 ms no topo a algumas centenas de ms na base, e um reforço mais ou menos a cada segundo.

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
Suponha que cada processo use o quantum q inteiro e que cada troca custe s. A cada q + s de tempo, s vai para a {{sobrecarga|overhead}}: a fração desperdiçada é **s / (q + s)**. Com 10 processos prontos na fila, o último só começa depois de 9 × (q + s).`},{type:`table`,head:[`Quantum q`,`Troca s`,`Desperdício s / (q + s)`,`Com 10 prontos, o último começa após`],rows:[[`1 ms`,`1 ms`,`50%`,`18 ms`],[`4 ms`,`1 ms`,`20%`,`45 ms`],[`19 ms`,`1 ms`,`5%`,`180 ms`],[`99 ms`,`1 ms`,`1%`,`900 ms`]],caption:`Uma troca de 1 ms é um exagero proposital (é o exemplo clássico do livro do Tanenbaum): a conta mostra a forma do compromisso, e o custo indireto faz o s real ser maior do que parece.`},{type:`md`,text:'Quantum curto: resposta rápida, muita CPU jogada fora. Quantum longo: pouca sobrecarga, mas o Round Robin vira FCFS e o clique espera. Uma regra prática: o quantum deve ser um pouco maior que uma interação típica, para que um processo interativo termine o seu surto de CPU dentro de um quantum e bloqueie por conta própria; o Tanenbaum sugere algo entre 20 e 50 ms como compromisso razoável. É também por isso que a MLFQ usa quanta curtos no topo (onde ficam os interativos) e longos na base (onde ficam os longos, que agradecem a menor sobrecarga).\n\n### No Linux: nice, CFS/EEVDF e tempo real\n- Processos comuns (política `SCHED_OTHER`) têm um {{valor nice|nice value}} de −20 a 19, com padrão 0. Cada passo vale cerca de 10% de CPU quando dois processos disputam a mesma CPU: o peso de nice 0 é 1024, o de nice 1 é 820 e o de nice −1 é 1277 (cerca de 1,25× por passo). Dois laços infinitos, um com nice 0 e outro com nice 1, dividem a CPU em 1024 / 1844 ≈ 55,5% e 820 / 1844 ≈ 44,5%.\n- `nice -n 10 comando` já começa com nice 10; `renice -n 5 -p 1234` muda o de um processo que está rodando. Usuários comuns só podem aumentar o nice (ficar mais "gentis"); diminuir exige privilégio de administrador.\n- O escalonador desses processos não usa filas fixas. O CFS (Linux 2.6.23, de 2007) dava a CPU a quem tinha recebido menos *tempo virtual*, o tempo de CPU ponderado pelo peso do nice. Desde o Linux 6.6 (2023), o EEVDF ocupa o lugar dele: mantém os pesos e acrescenta prazos para melhorar a latência. A interatividade aparece sozinha: quem dorme muito acumula pouco tempo de CPU e tende a ser escolhido logo que acorda.\n- As políticas de tempo real `SCHED_FIFO` e `SCHED_RR` têm prioridades de 1 a 99 e passam na frente de qualquer processo comum. `SCHED_FIFO` roda até bloquear ou ceder a CPU; `SCHED_RR` reveza, com quantum, entre processos da mesma prioridade. Como um laço infinito em `SCHED_FIFO` travaria um núcleo, o Linux reserva por padrão 5% de cada segundo aos processos comuns (`/proc/sys/kernel/sched_rt_runtime_us` vale 950000).'}]},{stage:`exemplo`,blocks:[{type:`md`,text:`Uma MLFQ com três filas: F0 (a mais alta, quantum 1), F1 (quantum 2) e F2 (a mais baixa, quantum 4). O limite de tempo de cada nível é um quantum, e não há reforço. Para simplificar, o escalonador só decide no fim de cada fatia (num sistema real, um processo mais prioritário que chega interrompe o atual na hora; neste exemplo isso não muda nada, porque as chegadas caem em fins de fatia).

Três processos: A, uma compilação, chega em 0 e precisa de 10 unidades; B, uma busca no editor, chega em 3 e precisa de 2; C, um clique, chega em 4 e precisa de 1. Ninguém conta essas durações ao escalonador.`},{type:`table`,head:[`t`,`Chegou`,`Filas antes de decidir (F0 | F1 | F2)`,`Roda`,`Depois`],rows:[[`0`,`A`,`A | — | —`,`A de 0 a 1`,`usou o quantum inteiro: desce para F1`],[`1`,`—`,`— | A | —`,`A de 1 a 3`,`usou o quantum inteiro: desce para F2 (faltam 7)`],[`3`,`B`,`B | — | A`,`B de 3 a 4`,`desce para F1 (falta 1)`],[`4`,`C`,`C | B | A`,`C de 4 a 5`,`terminou: retorno 1`],[`5`,`—`,`— | B | A`,`B de 5 a 6`,`terminou antes do fim do quantum: retorno 6 − 3 = 3`],[`6`,`—`,`— | — | A`,`A de 6 a 10`,`fica em F2 (faltam 3)`],[`10`,`—`,`— | — | A`,`A de 10 a 13`,`terminou: retorno 13`]]},{type:`md`,text:`Agora compare com as outras políticas, nos mesmos três processos:`},{type:`table`,head:[`Política`,`Linha do tempo`,`Retorno de A, B, C`,`Retorno médio`,`Resposta média`,`Trocas de contexto`],rows:[[`FCFS`,`A 0–10, B 10–12, C 12–13`,`10, 9, 9`,`9,33`,`5`,`2`],[`Round Robin, quantum 1`,`A 0–3, B 3–4, A 4–5, C 5–6, B 6–7, A 7–13`,`13, 4, 2`,`6,33`,`0,33`,`5`],[`MLFQ (quanta 1, 2, 4)`,`A 0–3, B 3–4, C 4–5, B 5–6, A 6–13`,`13, 3, 1`,`5,67`,`0`,`4`],[`SRTF (conhece as durações)`,`A 0–3, B 3–5, C 5–6, A 6–13`,`13, 2, 2`,`5,67`,`0,33`,`3`]],caption:`Trechos seguidos do mesmo processo foram juntados na linha do tempo. Trocas de contexto contam só as passagens de um processo para outro.`},{type:`md`,text:`Sem saber nenhuma duração, a MLFQ empatou com o SRTF no retorno médio e respondeu na hora aos dois processos curtos. A compilação pagou um pouco (terminou em 13, e não em 10), mas rodou a maior parte do tempo em fatias de 4, com poucas trocas.`},{type:`viz`,viz:`scheduler`,caption:`O simulador tem quatro processos fixos. Escolha Round Robin e mude o quantum de 1 para 4: as trocas de contexto caem de 13 para 4. O simulador não cobra nada por elas; numa CPU real, cada uma custaria tempo.`}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`from collections import deque

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
          f"resposta média: {resp:6.1f} ms | retorno médio: {ret:7.1f} ms")`,runnable:!0,caption:`Com processos todos iguais, o quantum longo vence no retorno e perde feio na resposta. Mude o custo da troca, ou troque um dos processos de 100 ms por um de 2 ms, e veja quem ganha.`},{type:`code`,lang:`python`,code:`import resource
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
print("calculando:", v2 - v1, "voluntárias,", i2 - i1, "involuntárias")`,runnable:!1,caption:`Rode no seu computador (Linux): o módulo resource não existe no Windows nem no navegador. Com a máquina ociosa, o cálculo pode ter poucas trocas involuntárias; rode outro programa pesado ao mesmo tempo e veja o número subir.`},{type:`code`,lang:`bash`,code:`# prioridade, estado e trocas de contexto de um processo
ps -o pid,ni,stat,cmd -p 1234
grep ctxt /proc/1234/status

# trocas de contexto do sistema inteiro, por segundo (coluna cs)
vmstat 1 5

# rodar um backup com a menor prioridade comum
nice -n 19 tar czf backup.tar.gz ~/fotos

# mudar o nice de um processo que já está rodando
renice -n 5 -p 1234

# tempo real (precisa de root): SCHED_FIFO com prioridade 50
sudo chrt -f 50 ./controlador`,runnable:!1,caption:`Comandos do Linux para observar e mudar prioridades.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e8-mlfq-1`,kind:`mcq`,prompt:`Uma MLFQ tem limite de 10 ms de CPU na fila mais alta e reforço de prioridade a cada 1 segundo. Um editor de texto usa cerca de 1 ms de CPU por tecla, e você digita 5 teclas por segundo. Onde o editor tende a ficar?`,difficulty:`facil`,skills:[`so-processos`],hints:[`Quanto tempo de CPU o editor usa por segundo?`,`O que a regra 4 conta: o tempo de CPU ou o tempo total desde que o processo chegou?`,`O que acontece com a contagem a cada reforço?`],explanation:`Na MLFQ, o que rebaixa um processo é gastar o limite de tempo de CPU do nível (regra 4). O editor usa 5 ms por segundo, e o reforço a cada segundo (regra 5) devolve todos ao topo com a contagem zerada: ele nunca chega aos 10 ms. Por isso processos interativos ficam no alto e respondem rápido, enquanto quem usa CPU sem parar gasta o limite e desce.`,options:[{text:`Na fila mais alta: entre dois reforços ele usa cerca de 5 ms, menos que o limite de 10 ms`,correct:!0,feedback:`Isso: a MLFQ só rebaixa quem soma o limite no nível. 5 teclas × 1 ms = 5 ms por segundo, e a cada segundo o reforço recomeça a contagem.`},{text:`Na fila mais baixa, porque passa quase todo o tempo bloqueado esperando teclas`,feedback:`Tempo bloqueado não é tempo de CPU. A MLFQ conta só o tempo em que o processo usou a CPU; esperar o teclado não pesa contra ele.`},{text:`Desce um nível a cada tecla, porque larga a CPU antes do fim do quantum`,feedback:`É o contrário: largar a CPU cedo não rebaixa ninguém. O que rebaixa é somar o limite de tempo do nível.`},{text:`Desce depois de 10 teclas e nunca mais volta ao topo`,feedback:`10 teclas levam 2 segundos, e antes disso vem um reforço que devolve todos ao topo e zera a contagem. Sem a regra 5, aí sim ele acabaria descendo.`}]}},{type:`exercise`,exercise:{id:`e8-mlfq-2`,kind:`predict`,lang:`python`,prompt:`O que este programa imprime? Cada linha mostra o quantum, a resposta média e o retorno médio.`,difficulty:`intermediario`,skills:[`so-processos`,`ed-pilhas-filas`],hints:[`Com quantum 10, algum processo é interrompido? Com que política o Round Robin se parece, então?`,`Com quantum 1, monte a linha do tempo unidade por unidade: A, B, C, A, ... Quando cada um roda pela primeira vez, e quando termina?`,`Quantas casas decimais round(x, 2) mostra para 7,333...? E para 1,0?`],explanation:`Com quantum 1, a linha do tempo é A B C A B C A C A: as primeiras execuções são 0, 1 e 2 (resposta média 1,0) e os términos são A 9, B 5 e C 8 (retorno médio 22/3 ≈ 7,33). Com quantum 10 ninguém é interrompido e o Round Robin vira FCFS: as primeiras execuções são 0, 4 e 6 (resposta média 10/3 ≈ 3,33) e os términos 4, 6 e 9 (retorno médio 19/3 ≈ 6,33). O quantum curto melhorou a resposta e piorou o retorno: as duas réguas puxam para lados opostos.`,code:`from collections import deque

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
    print(q, round(resposta, 2), round(retorno, 2))`,answer:`1 1.0 7.33
10 3.33 6.33`}},{type:`exercise`,exercise:{id:`e8-mlfq-3`,kind:`code`,lang:`python`,prompt:"Um servidor usa escalonamento por prioridade **não preemptivo**, com envelhecimento. Escreva `ordem_com_envelhecimento(processos, k)`:\n\n- `processos` é uma lista de tuplas `(nome, chegada, duracao, prioridade)`; **menor número = mais prioridade**;\n- quando a CPU fica livre no instante `t`, escolha, entre os que já chegaram (`chegada <= t`) e ainda não rodaram, o de menor **prioridade efetiva** = `prioridade - (t - chegada) // k`. Empate: o que chegou primeiro; persistindo, o de menor nome;\n- o escolhido roda até o fim (`duracao` unidades); se ninguém chegou ainda, a CPU fica ociosa até a próxima chegada;\n- devolva a lista de nomes na ordem em que rodam.",difficulty:`intermediario`,skills:[`so-processos`],hints:[`Simule um relógio t. Em cada decisão, quem são os candidatos?`,`A prioridade efetiva muda com o tempo. Em que momento ela precisa ser calculada?`,`Se nenhum processo chegou ainda, para onde o relógio deve pular?`,`Uma chave de comparação pode ser uma tupla. O que vem primeiro nela, e o que desempata?`],explanation:`A prioridade efetiva precisa ser recalculada a cada decisão, porque depende de t: quem espera ganha um nível a cada k unidades. No teste do backup, sem envelhecimento ele só roda depois dos 15 cliques; com k = 2, ele chega à prioridade 0 em t = 20 e vence o empate com o clique que acabou de chegar, porque chegou antes. Repare no //: com a divisão comum, a prioridade subiria continuamente e mudaria o vencedor de alguns empates. E calcular a idade a partir de t = 0, em vez da chegada de cada um, dá o mesmo bônus a todos, o que é o mesmo que não ter envelhecimento.`,starter:`def ordem_com_envelhecimento(processos, k):
    # processos: lista de (nome, chegada, duracao, prioridade); menor número = mais prioridade
    # devolva a lista de nomes na ordem em que rodam
    pass`,solution:`def ordem_com_envelhecimento(processos, k):
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
    return ordem`,tests:[{name:`prioridade sem envelhecimento`,code:`r = ordem_com_envelhecimento([("A", 0, 3, 2), ("B", 1, 2, 1), ("C", 2, 1, 3)], 10**9)
assert r == ["A", "B", "C"], f"em t = 0 só A chegou; em t = 3, B (prioridade 1) vence C (3). Esperado ['A', 'B', 'C'], veio {r}"
r = ordem_com_envelhecimento([("longo", 0, 10, 5), ("urgente", 1, 1, 0)], 10**9)
assert r == ["longo", "urgente"], f"não preemptivo: quem já começou vai até o fim, mesmo que chegue alguém mais prioritário. Esperado ['longo', 'urgente'], veio {r}"
assert ordem_com_envelhecimento([], 3) == [], "sem processos, devolva a lista vazia"`},{name:`o backup não morre de fome`,code:`fluxo = [("backup", 0, 3, 10)] + [(f"c{i:02d}", 2 * i, 2, 0) for i in range(15)]
r = ordem_com_envelhecimento(fluxo, 10**9)
assert r[-1] == "backup", f"sem envelhecimento (k enorme), o backup só roda depois de todos os cliques; veio {r}"
r = ordem_com_envelhecimento(fluxo, 2)
assert r.index("backup") == 10, f"com k = 2, em t = 20 o backup (10 - 20 // 2 = 0) empata com o clique c10, que acabou de chegar (0 - 0 = 0), e vence porque chegou antes: ele deve ser o 11º a rodar. Veio {r}"
r = ordem_com_envelhecimento(fluxo, 1)
assert r.index("backup") == 5, f"com k = 1, o backup chega à prioridade efetiva 0 em t = 10 e roda em 6º lugar. Veio {r}"`},{name:`envelhecimento conta a partir da chegada, com //`,code:`r = ordem_com_envelhecimento([("X", 0, 6, 0), ("B", 0, 1, 5), ("A", 3, 1, 4)], 4)
assert r == ["X", "B", "A"], f"em t = 6: B tem 5 - 6 // 4 = 4 e A tem 4 - 3 // 4 = 4; empate, e B chegou antes. Esperado ['X', 'B', 'A'], veio {r}. A divisão é inteira (//), e a espera conta a partir da chegada de cada um"`},{name:`CPU ociosa e entrada fora de ordem`,code:`r = ordem_com_envelhecimento([("A", 5, 2, 1), ("B", 6, 1, 0)], 3)
assert r == ["A", "B"], f"até t = 5 ninguém chegou; A roda de 5 a 7 e depois B. Veio {r}"
r = ordem_com_envelhecimento([("tarde", 10, 1, 0), ("cedo", 0, 2, 9)], 3)
assert r == ["cedo", "tarde"], f"a lista pode não estar em ordem de chegada; em t = 0 só 'cedo' chegou. Veio {r}"`},{name:`desempates`,code:`r = ordem_com_envelhecimento([("b", 0, 1, 3), ("a", 0, 1, 3)], 10**9)
assert r == ["a", "b"], f"mesma prioridade e mesma chegada: desempate pelo menor nome. Veio {r}"
r = ordem_com_envelhecimento([("Z", 0, 4, 0), ("y", 2, 1, 2), ("x", 4, 1, 2)], 10**9)
assert r == ["Z", "y", "x"], f"y e x têm a mesma prioridade, mas y chegou antes; o nome só desempata se a chegada também for igual. Veio {r}"`},{name:`cenários aleatórios`,code:`def _ref_envelhecimento(processos, k):
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
import random
rng = random.Random(21)
for _ in range(300):
    n = rng.randint(1, 8)
    nomes = rng.sample("abcdefghij", n)
    ps = [(nomes[i], rng.randint(0, 12), rng.randint(1, 5), rng.randint(0, 6)) for i in range(n)]
    k = rng.choice([1, 2, 3, 5, 10**9])
    esperado = _ref_envelhecimento(ps, k)
    r = ordem_com_envelhecimento(ps, k)
    assert r == esperado, f"ordem_com_envelhecimento({ps}, {k}) deu {r}, esperado {esperado}"`}]}},{type:`exercise`,exercise:{id:`e8-mlfq-4`,kind:`mcq`,prompt:`Numa versão ingênua da MLFQ, a regra 4 é: "se o processo largar a CPU antes do fim do quantum, mantém a prioridade". Um programa esperto roda 9,9 ms de cada quantum de 10 ms e então faz uma leitura de disco de 0,1 ms. O que acontece, e o que resolve?`,difficulty:`intermediario`,skills:[`so-processos`],hints:[`Na regra ingênua, o que o programa precisa fazer para nunca descer?`,`Qual regra olha para o comportamento acumulado, e não para uma rodada só?`],explanation:`A regra ingênua olha só para cada rodada isolada, e isso é fácil de enganar: basta ceder a CPU um instante antes do fim. A regra 4 do OSTEP soma o tempo gasto no nível, e o processo desce quando chega ao limite, faça quantas pausas fizer. O reforço (regra 5) resolve outro problema: os processos longos que ficariam sem CPU lá embaixo.`,options:[{text:`Ele fica no topo para sempre e leva quase toda a CPU; resolve somar o tempo usado no nível, não importa quantas vezes ele largou a CPU`,correct:!0,feedback:`Isso: é a regra 4 do OSTEP. Somando o tempo, os 9,9 ms de cada rodada se acumulam, e ele desce ao gastar o limite, como qualquer processo que usa muita CPU.`},{text:`Ele desce de nível, porque leitura de disco é lenta`,feedback:`Na versão ingênua, largar a CPU antes do fim do quantum é justamente o que mantém a prioridade. A lentidão do disco não entra na conta.`},{text:`O reforço de prioridade (regra 5) resolve sozinho`,feedback:`O reforço sobe todos para o topo de tempos em tempos, mas o programa esperto já está no topo e continua lá, roubando CPU entre um reforço e outro. O reforço combate a inanição, não a trapaça.`},{text:`Basta diminuir o quantum da fila mais alta para 5 ms`,feedback:`O programa só ajusta o truque: roda 4,9 ms e faz a leitura. Qualquer quantum pode ser enganado enquanto a regra olhar só para "largou antes do fim".`}]}},{type:`exercise`,exercise:{id:`e8-mlfq-5`,kind:`fill`,lang:`text`,prompt:`Complete as contas, supondo que todo processo usa o quantum inteiro e que cada troca de contexto custa s. Responda só com números.`,difficulty:`facil`,skills:[`so-processos`],hints:[`Na fórmula s / (q + s), quanto vale q + s em cada caso?`,`Quantos processos rodam antes do último? Quanto tempo cada um ocupa, contando a troca?`],explanation:`1 / (9 + 1) = 10% e 1 / (49 + 1) = 2%. Antes do último dos 20 processos, rodam 19, e cada um ocupa 49 ms de quantum mais 1 ms de troca: 19 × 50 = 950 ms. O quantum maior desperdiça menos, mas quase um segundo de espera para começar é perceptível para quem clicou.`,template:`troca s = 1 ms, quantum q = 9 ms
fração da CPU gasta com trocas = s / (q + s) = ___ %

troca s = 1 ms, quantum q = 49 ms
fração da CPU gasta com trocas = ___ %

20 processos prontos, q = 49 ms, s = 1 ms
o último da fila começa a rodar depois de ___ ms`,blanks:[[`10`,`10,0`,`10.0`],[`2`,`2,0`,`2.0`],[`950`]]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e8-mlfq-desafio`,kind:`code`,lang:`python`,prompt:'Escreva `mlfq(processos, quanta, s)`, que simula uma MLFQ e devolve o diagrama de Gantt: a lista de fatias `(nome, inicio, fim)`, na ordem em que acontecem (uma tupla por fatia, mesmo que o mesmo processo rode duas fatias seguidas).\n\n- `processos`: lista de `(nome, chegada, duracao)`, com nomes distintos e durações ≥ 1 (a lista pode não estar em ordem de chegada);\n- `quanta`: o quantum de cada fila, da mais alta para a mais baixa; `[1, 2, 4]` são três filas;\n- `s`: o período do reforço de prioridade, ou `None` para não ter reforço.\n\nO escalonador só decide no fim de cada fatia. Em cada instante de decisão `t`, nesta ordem:\n\n1. entram no fim da fila mais alta os processos com `chegada <= t` que ainda não entraram, em ordem de chegada (empate: a ordem da lista);\n2. o processo que acabou de rodar, se não terminou, usou o quantum inteiro: vai para o fim da fila **um nível abaixo** (na última fila, volta para o fim dela mesma);\n3. se há reforço e `t` já alcançou o próximo instante de reforço (o primeiro é `s`), todos os processos das filas vão para a fila mais alta, nesta ordem: primeiro os que já estavam nela, depois os da segunda fila, e assim por diante; o próximo reforço passa a ser o primeiro múltiplo de `s` maior que `t`;\n4. roda o primeiro processo da fila mais alta que não está vazia, por `min(quantum da fila, o que falta)`.\n\nSe todas as filas estão vazias, a CPU fica ociosa até a próxima chegada. O exemplo da lição, `mlfq([("A", 0, 10), ("B", 3, 2), ("C", 4, 1)], [1, 2, 4], None)`, deve dar `[("A", 0, 1), ("A", 1, 3), ("B", 3, 4), ("C", 4, 5), ("B", 5, 6), ("A", 6, 10), ("A", 10, 13)]`.',difficulty:`desafio`,skills:[`so-processos`,`ed-pilhas-filas`],hints:[`Que estrutura guarda as filas? Uma lista com uma fila por nível é um bom começo.`,`Além das filas, o que precisa ser lembrado de uma decisão para a outra: quem acabou de rodar, em que nível, quanto falta a cada processo?`,`Os passos 1 a 4 acontecem em toda decisão, sempre nessa ordem. Que laço tem exatamente esses quatro passos no corpo?`,`Quando a CPU fica ociosa, o relógio pula para onde?`,`Que conta com // dá o primeiro múltiplo de s maior que t?`],explanation:`A simulação é um laço de decisões: as chegadas entram no topo, quem usou o quantum inteiro desce um nível, o reforço devolve todos ao topo e a fila mais alta não vazia escolhe quem roda. Com uma fila só, a MLFQ vira Round Robin; com um quantum enorme no topo, vira FCFS. O teste do fluxo de cliques mostra o papel do reforço: sem ele, o processo longo só volta a rodar quando os cliques acabam; com ele, ganha uma fatia a cada período. É assim que se avalia uma política antes de mexer no kernel: simulando cargas e medindo retorno, resposta e trocas.`,starter:`from collections import deque

def mlfq(processos, quanta, s):
    # processos: lista de (nome, chegada, duracao)
    # quanta: quantum de cada fila, da mais alta para a mais baixa
    # s: período do reforço de prioridade, ou None
    # devolva a lista de fatias (nome, inicio, fim)
    pass`,solution:`from collections import deque

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
    return gantt`,tests:[{name:`exemplo da lição`,code:`r = mlfq([("A", 0, 10), ("B", 3, 2), ("C", 4, 1)], [1, 2, 4], None)
esperado = [("A", 0, 1), ("A", 1, 3), ("B", 3, 4), ("C", 4, 5), ("B", 5, 6), ("A", 6, 10), ("A", 10, 13)]
assert r == esperado, f"veio {r}, esperado {esperado}. Confira a tabela do exemplo: quem usa o quantum inteiro desce um nível"
assert mlfq([], [1, 2], None) == [], "sem processos, devolva a lista vazia"`},{name:`uma fila só é Round Robin`,code:`r = mlfq([("A", 0, 5), ("B", 0, 2), ("C", 1, 3)], [2], None)
esperado = [("A", 0, 2), ("B", 2, 4), ("C", 4, 6), ("A", 6, 8), ("C", 8, 9), ("A", 9, 10)]
assert r == esperado, f"veio {r}, esperado {esperado}. Em t = 2, C (que chegou em 1) entra na fila antes de A voltar para o fim dela: as chegadas vêm antes de quem acabou de rodar"`},{name:`CPU ociosa, chegadas fora de ordem e empates`,code:`r = mlfq([("B", 10, 1), ("A", 3, 2)], [1, 2], None)
esperado = [("A", 3, 4), ("A", 4, 5), ("B", 10, 11)]
assert r == esperado, f"veio {r}, esperado {esperado}: a CPU fica ociosa até t = 3 e de 5 a 10; a lista não precisa estar em ordem de chegada"
r = mlfq([("Y", 0, 1), ("X", 0, 1)], [1], None)
assert r == [("Y", 0, 1), ("X", 1, 2)], f"chegadas no mesmo instante entram na ordem da lista; veio {r}"`},{name:`sem reforço, o longo espera todos os cliques`,code:`ps = [("L", 0, 6)] + [(f"S{i}", i, 1) for i in range(1, 13)]
r = mlfq(ps, [1, 2], None)
esperado = [("L", 0, 1)] + [(f"S{i}", i, i + 1) for i in range(1, 13)] + [("L", 13, 15), ("L", 15, 17), ("L", 17, 18)]
assert r == esperado, f"veio {r}, esperado {esperado}: cada clique chega no topo e passa na frente de L, que está na fila de baixo"`},{name:`com reforço, o longo ganha fatias no meio do fluxo`,code:`def _ref_mlfq(processos, quanta, s):
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
ps = [("L", 0, 6)] + [(f"S{i}", i, 1) for i in range(1, 13)]
r = mlfq(ps, [1, 2], 4)
fatias_de_L = [f for f in r if f[0] == "L" and f[1] < 13]
assert len(fatias_de_L) >= 3, f"com reforço a cada 4 unidades, L deveria voltar ao topo e rodar durante o fluxo de cliques; veio {r}"
_confere_mlfq(ps, [1, 2], 4, "no reforço, os que já estavam na fila mais alta ficam na frente dos que sobem")
_confere_mlfq([("A", 0, 9), ("B", 0, 9), ("C", 2, 4)], [1, 3], 5, "o reforço pode ser percebido num t que não é múltiplo de s; o próximo é o primeiro múltiplo de s maior que t")`},{name:`cenários aleatórios`,code:`def _ref_mlfq(processos, quanta, s):
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
import random
rng = random.Random(42)
for _ in range(300):
    n = rng.randint(0, 6)
    nomes = rng.sample("ABCDEFGH", n)
    ps = [(nomes[i], rng.randint(0, 12), rng.randint(1, 8)) for i in range(n)]
    quanta = [rng.randint(1, 5) for _ in range(rng.randint(1, 3))]
    s = rng.choice([None, None, 2, 3, 5, 7, 10])
    _confere_mlfq(ps, quanta, s)`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:'**Laboratório de prioridades (no seu Linux).** Num terminal, rode dois laços infinitos presos ao mesmo núcleo: `taskset -c 0 python3 -c "while True: pass" &` e `taskset -c 0 nice -n 1 python3 -c "while True: pass" &`. No `top`, a divisão deve ficar perto de 55% e 45%. Troque o nice do segundo para 19 com `renice` e preveja a nova divisão antes de olhar (1024 / (1024 + 15) ≈ 98,6%). Compare as trocas involuntárias dos dois em `/proc/<PID>/status`. Rode tudo no mesmo terminal: com o *autogroup* do Linux, o nice só compara processos da mesma sessão. No fim, `kill %1 %2`.'}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Retorno = término − chegada; resposta = primeira execução − chegada. Round Robin: ótima resposta, retorno ruim.
- SRTF (SJF preemptivo) minimiza o retorno médio, mas precisa conhecer as durações.
- Prioridade: a CPU vai para o mais prioritário; o risco é a inanição, e o envelhecimento sobe a prioridade de quem espera.
- MLFQ: o novo entra no topo; quem gasta o limite de tempo do nível desce; o reforço periódico devolve todos ao topo. Aproxima o SJF sem saber durações e não se deixa enganar por quem cede a CPU no último instante.
- Troca de contexto: voluntária (o processo bloqueou) ou involuntária (temporizador, alguém mais prioritário). O custo direto é pequeno; o indireto (caches e TLB frios) pode ser maior. Entre threads do mesmo processo, é mais barata.
- Desperdício do quantum: s / (q + s). Quantum curto responde rápido e desperdiça; quantum longo transforma o Round Robin em FCFS.
- Linux: nice de −20 a 19 (≈ 10% de CPU por passo); CFS e, desde o 6.6, EEVDF; tempo real com SCHED_FIFO e SCHED_RR (prioridades 1 a 99).`},{type:`callout`,tone:`english`,text:`- **turnaround time / response time**: tempo de retorno / tempo de resposta
- **starvation / aging**: inanição / envelhecimento
- **multi-level feedback queue (MLFQ), time allotment, priority boost**: fila multinível com realimentação, limite de tempo, reforço de prioridade
- **voluntary / involuntary context switch, timer interrupt, overhead**: troca voluntária / involuntária, interrupção do temporizador, sobrecarga
- **niceness, real-time policy**: gentileza (nice), política de tempo real

Frase típica de entrevista: *"Round Robin gives great response time but poor turnaround time. MLFQ approximates SJF without knowing job lengths: new jobs start at the highest priority, and a job that uses up its time allotment moves down a level."*

Frase típica de documentação (man 7 sched): *"The nice value is an attribute that can be used to influence the CPU scheduler to favor or disfavor a process in scheduling decisions."*`,title:`English corner`}]}],cards:[{id:`l8-prioridades-mlfq#1`,front:`Como se calculam o tempo de retorno e o tempo de resposta?`,back:`Retorno = término − chegada. Resposta = primeira execução − chegada.`},{id:`l8-prioridades-mlfq#2`,front:`Por que o Round Robin tem boa resposta e retorno ruim?`,back:`Todo processo roda logo (um quantum depois do outro), mas todos são esticados até perto do fim, porque ninguém termina antes de os outros também avançarem.`},{id:`l8-prioridades-mlfq#3`,front:`O que é inanição e como o envelhecimento a evita?`,back:`Um processo pronto que nunca recebe a CPU porque sempre há alguém mais prioritário. O envelhecimento aumenta a prioridade de quem espera, até ele passar na frente.`},{id:`l8-prioridades-mlfq#4`,front:`Quais são as cinco regras da MLFQ?`,back:`1) maior prioridade roda; 2) mesma prioridade reveza em Round Robin; 3) processo novo entra no topo; 4) quem gasta o limite de tempo do nível desce; 5) a cada período S, todos voltam ao topo.`},{id:`l8-prioridades-mlfq#5`,front:`Como a MLFQ impede que um processo a engane fazendo E/S logo antes do fim do quantum?`,back:`Somando todo o tempo de CPU usado no nível (regra 4): ao chegar ao limite, ele desce, não importa quantas vezes tenha largado a CPU.`},{id:`l8-prioridades-mlfq#6`,front:`Para que serve o reforço de prioridade da MLFQ?`,back:`Para evitar a inanição dos processos longos lá embaixo e para dar nova chance a um processo que mudou de comportamento.`},{id:`l8-prioridades-mlfq#7`,front:`Qual é a diferença entre troca de contexto voluntária e involuntária?`,back:`Voluntária: o processo bloqueou (E/S, sleep, wait). Involuntária: o kernel tirou a CPU dele, no fim do quantum ou porque ficou pronto alguém mais prioritário.`},{id:`l8-prioridades-mlfq#8`,front:`Que fração da CPU se perde com quantum q e troca de custo s?`,back:`s / (q + s), supondo que cada processo use o quantum inteiro.`},{id:`l8-prioridades-mlfq#9`,front:`Por que trocar entre threads do mesmo processo é mais barato que entre processos?`,back:`O espaço de endereçamento é o mesmo: não há tabela de páginas para trocar, e as traduções da TLB continuam valendo.`},{id:`l8-prioridades-mlfq#10`,front:`No Linux, qual é a faixa do valor nice, qual é o padrão e que ponta dá mais prioridade?`,back:`De −20 a 19, com padrão 0. Quanto menor o nice, maior a prioridade: −20 é o mais favorecido.`}]};export{e as default};
//# sourceMappingURL=l8-prioridades-mlfq-Cy0zIiD_.js.map