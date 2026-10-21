var e={id:`l8-processos-threads`,moduleId:`m8-1`,title:`Processos, threads e escalonamento`,titleEn:`Processes, threads and scheduling`,summary:`Como o SO cria a ilusão de que tudo roda ao mesmo tempo, e a diferença entre processo e thread.`,minutes:40,objectives:[`Diferenciar processo e thread`,`Descrever os estados de um processo`,`Comparar FCFS, SJF e Round Robin`,`Calcular tempo médio de espera`],skills:[`so-processos`],terms:[{pt:`escalonador`,en:`scheduler`,def:`Parte do SO que decide qual processo/thread usa a CPU.`},{pt:`fatia de tempo`,en:`time slice / quantum`,def:`Tempo máximo que um processo usa a CPU antes de ser trocado.`},{pt:`troca de contexto`,en:`context switch`,def:`Salvar o estado de um processo e restaurar o de outro.`},{pt:`thread`,en:`thread`,def:`Fluxo de execução dentro de um processo; threads compartilham a memória do processo.`},{pt:`preempção`,en:`preemption`,def:`O SO interromper um processo para dar a CPU a outro.`},{pt:`tempo de espera`,en:`waiting time`,def:`Quanto tempo um processo ficou pronto, mas sem CPU.`}],references:[`ostep`,`tanenbaum-so`,`linux-man`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Um computador com 8 núcleos roda centenas de processos "ao mesmo tempo". O truque é o **{{escalonador|scheduler}}**: ele dá a cada um uma pequena **{{fatia de tempo|time slice}}** de CPU e troca rapidamente (**{{troca de contexto|context switch}}**). Uma **thread** é um fluxo de execução dentro de um processo; threads do mesmo processo **compartilham memória**.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`**Estados de um processo**: *novo* → **pronto** (esperando CPU) ⇄ **executando** → **bloqueado** (esperando E/S, como disco ou rede) → pronto ... → *terminado*.

**Processo × thread**:`},{type:`table`,head:[``,`Processo`,`Thread`],rows:[[`Memória`,`própria e isolada`,`compartilhada com as outras threads do processo`],[`Criação e troca`,`mais caras`,`mais baratas`],[`Falha`,`não derruba outros processos`,`pode corromper o processo inteiro`],[`Comunicação`,`pipes, sockets, arquivos (IPC)`,`variáveis compartilhadas (cuidado: concorrência!)`]]},{type:`md`,text:`**Algoritmos de escalonamento clássicos**:

- **FCFS** (*first come, first served*): fila simples. Um processo longo na frente faz todos esperarem (*efeito comboio*).
- **SJF** (*shortest job first*): o mais curto primeiro — minimiza o tempo médio de espera, mas exige saber a duração e pode causar *starvation*.
- **Round Robin**: cada um roda no máximo um *quantum* e volta para o fim da fila. Bom tempo de resposta para sistemas interativos.

Sistemas reais (como o CFS/EEVDF do Linux) combinam prioridades, justiça e interatividade.`},{type:`callout`,tone:`deep`,text:"No CPython, o **GIL** (Global Interpreter Lock) permite que só uma thread execute bytecode Python por vez — threads ajudam com E/S, mas não aceleram cálculo puro; para isso usa-se `multiprocessing`. O Python 3.13+ oferece uma versão experimental sem GIL (*free-threaded*).",title:`Python e o GIL`}]},{stage:`exemplo`,blocks:[{type:`viz`,viz:`scheduler`,caption:`Simule FCFS, SJF e Round Robin com os mesmos processos e compare o tempo médio de espera.`}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`def fcfs(processos):
    """processos: lista de (nome, duração), todos chegando no tempo 0."""
    t, espera = 0, {}
    for nome, dur in processos:
        espera[nome] = t
        t += dur
    return espera

ps = [("A", 8), ("B", 1), ("C", 2)]
e = fcfs(ps)
print("FCFS:", e, "média =", sum(e.values()) / len(e))
e = fcfs(sorted(ps, key=lambda p: p[1]))
print("SJF: ", e, "média =", sum(e.values()) / len(e))`,runnable:!0}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e8-proc-1`,kind:`mcq`,prompt:`Um processo pediu para ler um arquivo do disco e está esperando os dados. Em que estado ele está?`,difficulty:`facil`,skills:[`so-processos`],hints:[`Ele poderia usar a CPU agora, se ela estivesse livre?`],explanation:`Bloqueado (waiting): mesmo com a CPU livre, ele não pode continuar até a E/S terminar. Enquanto isso, o SO dá a CPU a outro.`,options:[{text:`Executando`,feedback:`Não está usando a CPU enquanto espera o disco.`},{text:`Pronto`,feedback:`Pronto significa "só falta CPU". Ele falta dados.`},{text:`Bloqueado`,correct:!0,feedback:`Isso: esperando E/S.`},{text:`Terminado`,feedback:`Ainda não terminou.`}]}},{type:`exercise`,exercise:{id:`e8-proc-2`,kind:`code`,lang:`python`,prompt:"Escreva `round_robin(processos, quantum)` que recebe `[(nome, duração), ...]` (todos chegam no tempo 0, na ordem da lista) e devolve a **lista de nomes na ordem em que terminam**.",difficulty:`intermediario`,skills:[`so-processos`,`ed-pilhas-filas`],hints:[`Use uma fila (deque) de [nome, restante].`,`Retire da frente, rode min(quantum, restante); se ainda sobrar, volte para o fim; senão, registre que terminou.`],explanation:`Round Robin é uma fila circular: cada processo roda um quantum e volta para o fim. É uma aplicação direta da estrutura de fila do Nível 3.`,starter:`from collections import deque

def round_robin(processos, quantum):
    pass
`,solution:`from collections import deque

def round_robin(processos, quantum):
    fila = deque([nome, dur] for nome, dur in processos)
    ordem = []
    while fila:
        p = fila.popleft()
        p[1] -= min(quantum, p[1])
        if p[1] > 0:
            fila.append(p)
        else:
            ordem.append(p[0])
    return ordem`,tests:[{name:`quantum 2`,code:`assert round_robin([("A", 5), ("B", 2), ("C", 3)], 2) == ["B", "C", "A"]`},{name:`quantum grande = FCFS`,code:`assert round_robin([("A", 5), ("B", 2)], 100) == ["A", "B"]`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e8-proc-desafio`,kind:`code`,lang:`python`,prompt:"Escreva `espera_media_sjf(processos)` para processos com **chegadas diferentes**: `[(nome, chegada, duração)]`, SJF **não preemptivo** (quando a CPU fica livre, escolhe o mais curto entre os que já chegaram; empate pelo que chegou antes). Devolva a média do tempo de espera, arredondada a 2 casas.",difficulty:`desafio`,skills:[`so-processos`],hints:[`Simule o relógio t. Disponíveis = os que já chegaram e não rodaram.`,`Se ninguém chegou ainda, avance t até a próxima chegada.`,`Espera = início - chegada.`],explanation:`Simular o relógio e escolher entre os disponíveis é a forma geral de avaliar qualquer política de escalonamento. Com um heap, a escolha fica O(log n).`,starter:`def espera_media_sjf(processos):
    pass
`,solution:`def espera_media_sjf(processos):
    pendentes = sorted(processos, key=lambda p: p[1])
    t, total, n = 0, 0, len(processos)
    while pendentes:
        prontos = [p for p in pendentes if p[1] <= t]
        if not prontos:
            t = pendentes[0][1]
            continue
        p = min(prontos, key=lambda p: (p[2], p[1]))
        total += t - p[1]
        t += p[2]
        pendentes.remove(p)
    return round(total / n, 2)`,tests:[{name:`clássico`,code:`assert espera_media_sjf([("A", 0, 7), ("B", 2, 4), ("C", 4, 1), ("D", 5, 4)]) == 4.0`},{name:`CPU ociosa no início`,code:`assert espera_media_sjf([("A", 3, 2), ("B", 3, 1)]) == 0.5`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:'**Investigue no seu sistema**: rode `ps -eLf | head` (Linux) ou o Monitor de Atividade e descubra quantas **threads** tem o seu navegador. Por que um navegador moderno usa vários **processos** (um por aba ou site)? Pesquise *"site isolation"*.'}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Processo: programa em execução com memória própria; thread: fluxo dentro do processo, memória compartilhada.
- Estados: pronto, executando, bloqueado.
- FCFS, SJF, Round Robin: trade-offs entre espera média, justiça e resposta.`}]}],cards:[{id:`l8-processos-threads#1`,front:`Processo × thread?`,back:`Processos têm memória isolada; threads de um processo compartilham a memória.`},{id:`l8-processos-threads#2`,front:`O que é uma troca de contexto?`,back:`Salvar o estado (registradores etc.) de um processo e restaurar o de outro para trocar quem usa a CPU.`},{id:`l8-processos-threads#3`,front:`Qual política minimiza o tempo médio de espera?`,back:`SJF (shortest job first), se as durações forem conhecidas.`}]};export{e as default};
//# sourceMappingURL=l8-processos-threads-Dd670qXb.js.map