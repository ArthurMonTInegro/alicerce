import type { Level } from '../types.ts';
import { code, dedent, deep, english, info, lesson, md, py, t, warn } from '../helpers.ts';
import { memoria, sockets, arquitetura } from './aprofundamento-a.ts';
import { lessons as m8_1 } from './modulos/m8-1.ts';
import { lessons as m8_2 } from './modulos/m8-2.ts';
import { lessons as m8_3 } from './modulos/m8-3.ts';
import { lessons as m9_1 } from './modulos/m9-1.ts';
import { lessons as m9_2 } from './modulos/m9-2.ts';
import { lessons as m9_3 } from './modulos/m9-3.ts';

/* ========================= Nível 8 — Sistemas Operacionais ========================= */

const processos = lesson({
  id: 'l8-processos-threads',
  moduleId: 'm8-1',
  title: 'Processos, threads e escalonamento',
  titleEn: 'Processes, threads and scheduling',
  summary: 'Como o SO cria a ilusão de que tudo roda ao mesmo tempo, e a diferença entre processo e thread.',
  minutes: 40,
  objectives: ['Diferenciar processo e thread', 'Descrever os estados de um processo', 'Comparar FCFS, SJF e Round Robin', 'Calcular tempo médio de espera'],
  skills: ['so-processos'],
  terms: [
    t('escalonador', 'scheduler', 'Parte do SO que decide qual processo/thread usa a CPU.'),
    t('fatia de tempo', 'time slice / quantum', 'Tempo máximo que um processo usa a CPU antes de ser trocado.'),
    t('troca de contexto', 'context switch', 'Salvar o estado de um processo e restaurar o de outro.'),
    t('thread', 'thread', 'Fluxo de execução dentro de um processo; threads compartilham a memória do processo.'),
    t('preempção', 'preemption', 'O SO interromper um processo para dar a CPU a outro.'),
    t('tempo de espera', 'waiting time', 'Quanto tempo um processo ficou pronto, mas sem CPU.'),
  ],
  stages: {
    conceito: [md('Um computador com 8 núcleos roda centenas de processos "ao mesmo tempo". O truque é o **{{escalonador|scheduler}}**: ele dá a cada um uma pequena **{{fatia de tempo|time slice}}** de CPU e troca rapidamente (**{{troca de contexto|context switch}}**). Uma **thread** é um fluxo de execução dentro de um processo; threads do mesmo processo **compartilham memória**.')],
    explicacao: [
      md(`
        **Estados de um processo**: *novo* → **pronto** (esperando CPU) ⇄ **executando** → **bloqueado** (esperando E/S, como disco ou rede) → pronto ... → *terminado*.

        **Processo × thread**:
      `),
      { type: 'table', head: ['', 'Processo', 'Thread'], rows: [
        ['Memória', 'própria e isolada', 'compartilhada com as outras threads do processo'],
        ['Criação e troca', 'mais caras', 'mais baratas'],
        ['Falha', 'não derruba outros processos', 'pode corromper o processo inteiro'],
        ['Comunicação', 'pipes, sockets, arquivos (IPC)', 'variáveis compartilhadas (cuidado: concorrência!)'],
      ] },
      md(`
        **Algoritmos de escalonamento clássicos**:

        - **FCFS** (*first come, first served*): fila simples. Um processo longo na frente faz todos esperarem (*efeito comboio*).
        - **SJF** (*shortest job first*): o mais curto primeiro — minimiza o tempo médio de espera, mas exige saber a duração e pode causar *starvation*.
        - **Round Robin**: cada um roda no máximo um *quantum* e volta para o fim da fila. Bom tempo de resposta para sistemas interativos.

        Sistemas reais (como o CFS/EEVDF do Linux) combinam prioridades, justiça e interatividade.
      `),
      deep('No CPython, o **GIL** (Global Interpreter Lock) permite que só uma thread execute bytecode Python por vez — threads ajudam com E/S, mas não aceleram cálculo puro; para isso usa-se `multiprocessing`. O Python 3.13+ oferece uma versão experimental sem GIL (*free-threaded*).', 'Python e o GIL'),
    ],
    exemplo: [{ type: 'viz', viz: 'scheduler', caption: 'Simule FCFS, SJF e Round Robin com os mesmos processos e compare o tempo médio de espera.' }],
    codigo: [py(`
      def fcfs(processos):
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
      print("SJF: ", e, "média =", sum(e.values()) / len(e))
    `)],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e8-proc-1',
          kind: 'mcq',
          prompt: 'Um processo pediu para ler um arquivo do disco e está esperando os dados. Em que estado ele está?',
          difficulty: 'facil',
          skills: ['so-processos'],
          hints: ['Ele poderia usar a CPU agora, se ela estivesse livre?'],
          explanation: 'Bloqueado (waiting): mesmo com a CPU livre, ele não pode continuar até a E/S terminar. Enquanto isso, o SO dá a CPU a outro.',
          options: [
            { text: 'Executando', feedback: 'Não está usando a CPU enquanto espera o disco.' },
            { text: 'Pronto', feedback: 'Pronto significa "só falta CPU". Ele falta dados.' },
            { text: 'Bloqueado', correct: true, feedback: 'Isso: esperando E/S.' },
            { text: 'Terminado', feedback: 'Ainda não terminou.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e8-proc-2',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `round_robin(processos, quantum)` que recebe `[(nome, duração), ...]` (todos chegam no tempo 0, na ordem da lista) e devolve a **lista de nomes na ordem em que terminam**.',
          difficulty: 'intermediario',
          skills: ['so-processos', 'ed-pilhas-filas'],
          hints: ['Use uma fila (deque) de [nome, restante].', 'Retire da frente, rode min(quantum, restante); se ainda sobrar, volte para o fim; senão, registre que terminou.'],
          explanation: 'Round Robin é uma fila circular: cada processo roda um quantum e volta para o fim. É uma aplicação direta da estrutura de fila do Nível 3.',
          starter: 'from collections import deque\n\ndef round_robin(processos, quantum):\n    pass\n',
          solution: dedent(`
            from collections import deque

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
                return ordem
          `),
          tests: [
            { name: 'quantum 2', code: 'assert round_robin([("A", 5), ("B", 2), ("C", 3)], 2) == ["B", "C", "A"]' },
            { name: 'quantum grande = FCFS', code: 'assert round_robin([("A", 5), ("B", 2)], 100) == ["A", "B"]' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e8-proc-desafio',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `espera_media_sjf(processos)` para processos com **chegadas diferentes**: `[(nome, chegada, duração)]`, SJF **não preemptivo** (quando a CPU fica livre, escolhe o mais curto entre os que já chegaram; empate pelo que chegou antes). Devolva a média do tempo de espera, arredondada a 2 casas.',
          difficulty: 'desafio',
          skills: ['so-processos'],
          hints: ['Simule o relógio t. Disponíveis = os que já chegaram e não rodaram.', 'Se ninguém chegou ainda, avance t até a próxima chegada.', 'Espera = início - chegada.'],
          explanation: 'Simular o relógio e escolher entre os disponíveis é a forma geral de avaliar qualquer política de escalonamento. Com um heap, a escolha fica O(log n).',
          starter: 'def espera_media_sjf(processos):\n    pass\n',
          solution: dedent(`
            def espera_media_sjf(processos):
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
                return round(total / n, 2)
          `),
          tests: [
            { name: 'clássico', code: 'assert espera_media_sjf([("A", 0, 7), ("B", 2, 4), ("C", 4, 1), ("D", 5, 4)]) == 4.0' },
            { name: 'CPU ociosa no início', code: 'assert espera_media_sjf([("A", 3, 2), ("B", 3, 1)]) == 0.5' },
          ],
        },
      },
    ],
    projeto: [md('**Investigue no seu sistema**: rode `ps -eLf | head` (Linux) ou o Monitor de Atividade e descubra quantas **threads** tem o seu navegador. Por que um navegador moderno usa vários **processos** (um por aba ou site)? Pesquise *"site isolation"*.')],
    revisao: [md('- Processo: programa em execução com memória própria; thread: fluxo dentro do processo, memória compartilhada.\n- Estados: pronto, executando, bloqueado.\n- FCFS, SJF, Round Robin: trade-offs entre espera média, justiça e resposta.')],
  },
  review: [
    ['Processo × thread?', 'Processos têm memória isolada; threads de um processo compartilham a memória.'],
    ['O que é uma troca de contexto?', 'Salvar o estado (registradores etc.) de um processo e restaurar o de outro para trocar quem usa a CPU.'],
    ['Qual política minimiza o tempo médio de espera?', 'SJF (shortest job first), se as durações forem conhecidas.'],
  ],
  references: ['ostep', 'tanenbaum-so', 'linux-man'],
});

const concorrencia = lesson({
  id: 'l8-concorrencia',
  moduleId: 'm8-3',
  title: 'Concorrência, condições de corrida e sincronização',
  titleEn: 'Concurrency, race conditions and synchronization',
  summary: 'Por que `contador += 1` pode dar errado com duas threads, e como locks resolvem (e criam deadlocks).',
  minutes: 40,
  objectives: ['Explicar uma condição de corrida', 'Identificar seções críticas', 'Usar locks/mutex', 'Reconhecer as condições de deadlock'],
  skills: ['so-concorrencia'],
  terms: [
    t('condição de corrida', 'race condition', 'Resultado depende da ordem imprevisível de execução.'),
    t('seção crítica', 'critical section', 'Trecho que acessa dado compartilhado e não pode ser intercalado.'),
    t('trava / exclusão mútua', 'lock / mutex', 'Mecanismo que garante que só uma thread entre na seção crítica.'),
    t('impasse', 'deadlock', 'Threads esperando umas pelas outras para sempre.'),
    t('atômico', 'atomic', 'Indivisível: acontece por inteiro, sem intercalação.'),
  ],
  stages: {
    conceito: [md('**Concorrência** é ter várias tarefas em andamento ao mesmo tempo. Quando duas threads mexem no **mesmo dado**, a ordem em que suas instruções se intercalam pode mudar o resultado: isso é uma **{{condição de corrida|race condition}}**, um dos bugs mais difíceis de reproduzir.')],
    explicacao: [
      md(`
        \`contador += 1\` parece uma operação, mas são três: **ler** contador, **somar** 1, **escrever**. Se duas threads leem o mesmo valor (10) antes de qualquer uma escrever, as duas escrevem 11 — um incremento se perdeu.

        **Solução**: proteger a **seção crítica** com um **lock** (mutex): só uma thread por vez entra.

        \`\`\`
        lock = threading.Lock()
        with lock:
            contador += 1
        \`\`\`

        **Deadlock** acontece quando há, ao mesmo tempo (condições de Coffman): exclusão mútua, posse-e-espera, não preempção e **espera circular** (T1 tem A e quer B; T2 tem B e quer A). Prevenção comum: **sempre adquirir locks na mesma ordem**.
      `),
      info('No navegador, o Python do Alicerce (Pyodide) não cria threads de verdade. Por isso, a demonstração abaixo **simula** o escalonador intercalando passos de duas "threads" — o que é ótimo para ver exatamente onde o incremento se perde.'),
    ],
    exemplo: [py(`
      # Simulação: cada "thread" executa ler -> somar -> escrever.
      # O escalonador decide a intercalação.
      def executar(ordem):
          compartilhado = {"contador": 0}
          local = {"T1": None, "T2": None}
          for thread, passo in ordem:
              if passo == "ler":
                  local[thread] = compartilhado["contador"]
              elif passo == "somar":
                  local[thread] += 1
              elif passo == "escrever":
                  compartilhado["contador"] = local[thread]
          return compartilhado["contador"]

      sequencial = [("T1", "ler"), ("T1", "somar"), ("T1", "escrever"), ("T2", "ler"), ("T2", "somar"), ("T2", "escrever")]
      intercalada = [("T1", "ler"), ("T2", "ler"), ("T1", "somar"), ("T2", "somar"), ("T1", "escrever"), ("T2", "escrever")]
      print("sequencial:", executar(sequencial))     # 2
      print("intercalada:", executar(intercalada))   # 1  <- incremento perdido!
    `)],
    codigo: [code('python', `
      # No seu computador (CPython), com threads reais:
      import threading

      contador = 0
      lock = threading.Lock()

      def trabalhar():
          global contador
          for _ in range(100_000):
              with lock:          # remova o lock e rode várias vezes
                  contador += 1

      ts = [threading.Thread(target=trabalhar) for _ in range(4)]
      for t in ts: t.start()
      for t in ts: t.join()
      print(contador)  # 400000 com lock
    `, 'Rode no seu computador. Sem o lock, o resultado pode variar entre execuções.')],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e8-conc-0',
          kind: 'mcq',
          prompt: "Duas threads fazem `contador += 1` ao mesmo tempo, sem lock. O que pode acontecer?",
          difficulty: 'facil',
          skills: ["so-concorrencia"],
          hints: ["`contador += 1` é ler, somar e escrever: três passos."],
          explanation: "A operação não é atômica: as duas threads podem ler o mesmo valor antigo e escrever o mesmo resultado, perdendo um incremento. Isso é uma condição de corrida (race condition).",
          options: [
            { text: "Um dos incrementos pode se perder", correct: true, feedback: "Exatamente: condição de corrida." },
            { text: "O programa sempre trava", feedback: "Travar para sempre é deadlock, que exige locks." },
            { text: "Nada, += é sempre seguro", feedback: "Não é atômico: são vários passos." },
            { text: "O Python lança um erro", feedback: "Não há erro: o resultado só fica errado, às vezes. Por isso é difícil de achar." },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e8-conc-1',
          kind: 'mcq',
          prompt: 'Duas threads executam `saldo = saldo - 100` em paralelo sobre saldo = 500, sem lock. Quais resultados finais são possíveis?',
          difficulty: 'intermediario',
          skills: ['so-concorrencia'],
          hints: ['Cada operação é ler → calcular → escrever. E se as duas lerem 500?'],
          explanation: 'Se uma termina antes da outra ler: 300. Se as duas leem 500: ambas escrevem 400. Logo, 300 ou 400.',
          options: [
            { text: 'Só 300', feedback: 'Seria verdade se a operação fosse atômica.' },
            { text: '300 ou 400', correct: true, feedback: 'Isso: o 400 é a atualização perdida (lost update).' },
            { text: '300, 400 ou 500', feedback: 'Pelo menos uma escrita de 400 sempre acontece.' },
            { text: 'Erro de execução', feedback: 'Não há erro: é exatamente isso que torna o bug traiçoeiro.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e8-conc-2',
          kind: 'code',
          lang: 'python',
          prompt: 'Usando a simulação da lição, escreva `todas_intercalacoes()` que devolve o **conjunto** de resultados finais possíveis para as duas "threads" (cada uma faz ler, somar, escrever, nessa ordem, começando com contador = 0). Gere todas as intercalações que respeitam a ordem interna de cada thread.',
          difficulty: 'avancado',
          skills: ['so-concorrencia', 'alg-recursao'],
          hints: ['Uma intercalação escolhe, a cada passo, avançar T1 ou T2 (se ainda houver passos).', 'Recursão: `gerar(i, j, prefixo)`, onde i e j são quantos passos cada thread já fez.'],
          explanation: 'Há C(6,3) = 20 intercalações e só dois resultados: {1, 2}. Raciocinar sobre todas as intercalações é a base de técnicas de verificação de programas concorrentes (model checking).',
          starter: dedent(`
            PASSOS = ["ler", "somar", "escrever"]

            def executar(ordem):
                c = 0
                local = {}
                for th, passo in ordem:
                    if passo == "ler": local[th] = c
                    elif passo == "somar": local[th] += 1
                    else: c = local[th]
                return c

            def todas_intercalacoes():
                pass
          `),
          solution: dedent(`
            PASSOS = ["ler", "somar", "escrever"]

            def executar(ordem):
                c = 0
                local = {}
                for th, passo in ordem:
                    if passo == "ler": local[th] = c
                    elif passo == "somar": local[th] += 1
                    else: c = local[th]
                return c

            def todas_intercalacoes():
                resultados = set()
                def gerar(i, j, ordem):
                    if i == 3 and j == 3:
                        resultados.add(executar(ordem))
                        return
                    if i < 3:
                        gerar(i + 1, j, ordem + [("T1", PASSOS[i])])
                    if j < 3:
                        gerar(i, j + 1, ordem + [("T2", PASSOS[j])])
                gerar(0, 0, [])
                return resultados
          `),
          tests: [{ name: 'resultados possíveis', code: 'assert todas_intercalacoes() == {1, 2}' }],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e8-conc-desafio',
          kind: 'code',
          lang: 'python',
          prompt: 'Detecte deadlock: escreva `tem_deadlock(espera)` que recebe um dict "thread → thread pela qual ela espera" (ou None) e devolve True se há **espera circular**.',
          difficulty: 'avancado',
          skills: ['so-concorrencia', 'ed-grafos'],
          hints: ['Isso é um grafo (grafo de espera, *wait-for graph*). Deadlock = ciclo.', 'Como cada thread espera no máximo uma, siga a cadeia a partir de cada thread, guardando as visitadas no caminho.'],
          explanation: 'Sistemas operacionais e bancos de dados detectam deadlocks procurando ciclos no grafo de espera — e então abortam uma das transações.',
          starter: 'def tem_deadlock(espera):\n    pass\n',
          solution: dedent(`
            def tem_deadlock(espera):
                for inicio in espera:
                    caminho = set()
                    t = inicio
                    while t is not None:
                        if t in caminho:
                            return True
                        caminho.add(t)
                        t = espera.get(t)
                return False
          `),
          tests: [
            { name: 'ciclo de 2', code: 'assert tem_deadlock({"T1": "T2", "T2": "T1"})' },
            { name: 'cadeia sem ciclo', code: 'assert not tem_deadlock({"T1": "T2", "T2": "T3", "T3": None})' },
            { name: 'ciclo de 3', code: 'assert tem_deadlock({"A": "B", "B": "C", "C": "A", "D": None})' },
          ],
        },
      },
    ],
    projeto: [md('**No seu computador**: escreva um programa com duas threads e dois locks que **causa** um deadlock (adquirindo em ordens diferentes), observe-o travar, e depois corrija impondo uma ordem global de aquisição.')],
    revisao: [md('- Race condition: resultado depende da intercalação.\n- Seção crítica + lock = exclusão mútua.\n- Deadlock: espera circular; previna com ordem fixa de locks.')],
  },
  review: [
    ['Por que `x += 1` não é seguro entre threads?', 'Porque são várias operações (ler, somar, escrever) que podem ser intercaladas.'],
    ['Como prevenir deadlocks de forma simples?', 'Adquirindo os locks sempre na mesma ordem.'],
  ],
  references: ['ostep', 'tanenbaum-so'],
});

/* ========================= Nível 9 — Redes ========================= */

const tcpip = lesson({
  id: 'l9-camadas-tcp-udp',
  moduleId: 'm9-1',
  title: 'Camadas, IP, TCP e UDP',
  titleEn: 'Layers, IP, TCP and UDP',
  summary: 'O modelo em camadas, endereçamento IP, roteamento, portas e as garantias (ou não) de TCP e UDP.',
  minutes: 40,
  objectives: ['Descrever as camadas da pilha TCP/IP', 'Entender endereços IP, máscaras e roteamento', 'Comparar TCP e UDP', 'Explicar o three-way handshake'],
  skills: ['redes-tcpip'],
  terms: [
    t('protocolo', 'protocol', 'Conjunto de regras para comunicação.'),
    t('pacote', 'packet', 'Unidade de dados que trafega na rede.'),
    t('roteador', 'router', 'Equipamento que encaminha pacotes entre redes.'),
    t('aperto de mão em três vias', 'three-way handshake', 'SYN, SYN-ACK, ACK: abertura de conexão TCP.'),
    t('porta', 'port', 'Número que identifica um serviço em uma máquina (0–65535).'),
    t('perda de pacotes', 'packet loss', 'Pacotes que não chegam ao destino.'),
    t('latência', 'latency', 'Tempo para um dado ir de um ponto a outro.'),
  ],
  stages: {
    conceito: [md('Redes funcionam em **camadas**: cada uma resolve um problema e usa a de baixo, sem precisar conhecer seus detalhes. É a mesma ideia de **abstração** do Nível 0. O **IP** leva pacotes de uma máquina a outra (sem garantias); o **TCP** constrói, por cima, uma conexão **confiável e ordenada**; o **UDP** entrega mensagens sem garantias, mas com pouca latência.')],
    explicacao: [
      { type: 'table', head: ['Camada (TCP/IP)', 'Responsabilidade', 'Exemplos'], rows: [
        ['Aplicação', 'o que os programas trocam', 'HTTP, DNS, SMTP, SSH'],
        ['Transporte', 'comunicação entre processos (portas), confiabilidade', 'TCP, UDP, QUIC'],
        ['Rede (internet)', 'endereçamento e roteamento entre redes', 'IP (IPv4, IPv6), ICMP'],
        ['Enlace / física', 'transmitir quadros num meio físico', 'Ethernet, Wi-Fi'],
      ] },
      md(`
        **IP**: \`192.168.0.10/24\` — os primeiros 24 bits identificam a **rede**, o resto o **host**. Roteadores olham o destino e escolhem o próximo salto pela tabela de rotas. O IPv4 tem só ~4,3 bilhões de endereços (2³²); por isso existem **NAT** e o **IPv6** (2¹²⁸).

        **TCP** garante: entrega, ordem, sem duplicatas, controle de fluxo e de congestionamento. Custo: o *handshake* (SYN → SYN-ACK → ACK) e retransmissões.

        **UDP**: só envia. Ideal quando atraso é pior que perda: chamadas de vídeo, jogos, DNS. O **QUIC** (base do HTTP/3) é construído sobre UDP.
      `),
    ],
    exemplo: [{ type: 'viz', viz: 'tcp-handshake', caption: 'Veja o handshake, o envio de segmentos com números de sequência e a retransmissão de um pacote perdido.' }],
    codigo: [py(`
      import ipaddress

      rede = ipaddress.ip_network("192.168.0.0/24")
      print("endereços na rede:", rede.num_addresses)
      print("192.168.0.77 está na rede?", ipaddress.ip_address("192.168.0.77") in rede)
      print("8.8.8.8 é privado?", ipaddress.ip_address("8.8.8.8").is_private)
      print("máscara:", rede.netmask)
    `)],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e9-tcp-1',
          kind: 'mcq',
          prompt: 'Um jogo online prefere UDP para enviar a posição dos jogadores 60 vezes por segundo. Por quê?',
          difficulty: 'intermediario',
          skills: ['redes-tcpip'],
          hints: ['Se um pacote de posição se perder, vale a pena esperar a retransmissão?'],
          explanation: 'Uma posição antiga retransmitida já não serve: a próxima atualização chega logo. O TCP atrasaria tudo esperando a retransmissão (head-of-line blocking).',
          options: [
            { text: 'Porque UDP é criptografado', feedback: 'UDP não criptografa nada por si só.' },
            { text: 'Porque dados atrasados não servem; perder um pacote é melhor que esperar retransmissão', correct: true, feedback: 'Isso: latência importa mais que confiabilidade aqui.' },
            { text: 'Porque TCP não funciona na internet', feedback: 'TCP é a base da maior parte da internet.' },
            { text: 'Porque UDP garante a ordem', feedback: 'Quem garante ordem é o TCP.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e9-tcp-2',
          kind: 'parsons',
          lang: 'text',
          prompt: 'Ordene a abertura de uma conexão TCP e o primeiro envio de dados.',
          difficulty: 'facil',
          skills: ['redes-tcpip'],
          hints: ['Quem inicia manda SYN.'],
          explanation: 'SYN (cliente) → SYN-ACK (servidor) → ACK (cliente). Só então os dados fluem.',
          lines: ['Cliente envia SYN', 'Servidor responde SYN-ACK', 'Cliente envia ACK', 'Cliente envia a requisição (dados)', 'Servidor confirma com ACK e responde'],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e9-tcp-desafio',
          kind: 'code',
          lang: 'python',
          prompt: 'Sem usar `ipaddress`, escreva `mesma_rede(ip1, ip2, prefixo)` que diz se dois IPv4 (strings) estão na mesma rede para um prefixo /n (0–32).',
          difficulty: 'desafio',
          skills: ['redes-tcpip', 'comp-binario'],
          hints: ['Converta o IP para um inteiro de 32 bits: cada octeto ocupa 8 bits (`(a << 24) | (b << 16) | ...`).', 'A máscara de /n tem n bits 1 à esquerda: `((1 << n) - 1) << (32 - n)`.', 'Mesma rede ⇔ `ip1 & mascara == ip2 & mascara`.'],
          explanation: 'Roteadores fazem exatamente essa operação AND bit a bit para decidir para onde enviar cada pacote — um uso direto do binário do Nível 0.',
          starter: 'def mesma_rede(ip1, ip2, prefixo):\n    pass\n',
          solution: dedent(`
            def _para_int(ip):
                a, b, c, d = (int(x) for x in ip.split("."))
                return (a << 24) | (b << 16) | (c << 8) | d

            def mesma_rede(ip1, ip2, prefixo):
                mascara = ((1 << prefixo) - 1) << (32 - prefixo) if prefixo else 0
                return (_para_int(ip1) & mascara) == (_para_int(ip2) & mascara)
          `),
          tests: [
            { name: '/24 mesma rede', code: 'assert mesma_rede("192.168.0.10", "192.168.0.200", 24)' },
            { name: '/24 redes diferentes', code: 'assert not mesma_rede("192.168.0.10", "192.168.1.10", 24)' },
            { name: '/16 e /0', code: 'assert mesma_rede("10.1.2.3", "10.1.99.9", 16) and mesma_rede("1.1.1.1", "8.8.8.8", 0)' },
          ],
        },
      },
    ],
    projeto: [md('**Investigue sua rede**: rode `ping 8.8.8.8` e `traceroute` (`tracert` no Windows) para um site. Quantos saltos (roteadores) até lá? Qual a latência? Descubra seu IP local (`ip a` / `ipconfig`) e explique por que ele começa com 192.168, 10 ou 172.16–31 (endereços privados + NAT).')],
    revisao: [md('- Camadas: aplicação, transporte, rede, enlace.\n- IP endereça e roteia, sem garantias.\n- TCP: confiável e ordenado (handshake, retransmissão). UDP: rápido, sem garantias.\n- Máscara de rede: AND bit a bit.')],
  },
  review: [
    ['Quais as etapas do three-way handshake?', 'SYN, SYN-ACK, ACK.'],
    ['TCP × UDP?', 'TCP: conexão confiável e ordenada. UDP: datagramas sem garantias e com menos latência.'],
    ['O que significa /24 em 192.168.0.0/24?', 'Que os primeiros 24 bits identificam a rede (máscara 255.255.255.0).'],
  ],
  references: ['kurose-ross', 'rfc9293', 'stanford-cs144'],
});

const dnsHttps = lesson({
  id: 'l9-dns-https',
  moduleId: 'm9-2',
  title: 'DNS, HTTP(S) e TLS',
  titleEn: 'DNS, HTTP(S) and TLS',
  summary: 'Resolução de nomes, a evolução do HTTP e como o TLS protege a comunicação.',
  minutes: 35,
  objectives: ['Explicar a resolução DNS (recursiva e iterativa)', 'Conhecer os tipos de registro DNS', 'Entender o que o TLS garante: confidencialidade, integridade, autenticidade', 'Comparar HTTP/1.1, HTTP/2 e HTTP/3'],
  skills: ['redes-dns-tls'],
  terms: [
    t('resolvedor', 'resolver', 'Servidor que descobre o IP de um nome, consultando outros servidores.'),
    t('registro DNS', 'DNS record', 'Entrada do DNS: A, AAAA, CNAME, MX, TXT...'),
    t('tempo de vida', 'TTL (time to live)', 'Por quanto tempo uma resposta pode ficar em cache.'),
    t('certificado', 'certificate', 'Documento digital que liga um domínio a uma chave pública, assinado por uma autoridade.'),
    t('autoridade certificadora', 'certificate authority (CA)', 'Entidade confiável que assina certificados.'),
  ],
  stages: {
    conceito: [md('O **DNS** é um banco de dados distribuído e hierárquico que traduz nomes em endereços. O **HTTPS** é HTTP dentro de **TLS**, que garante que ninguém no meio do caminho consegue **ler** (confidencialidade), **alterar** (integridade) ou **se passar** pelo site (autenticidade).')],
    explicacao: [
      md(`
        **Resolução DNS** de \`www.exemplo.com.br\` (sem cache): seu resolvedor pergunta à **raiz** (".") → que indica os servidores de **.br** → que indicam os de **exemplo.com.br** → que respondem o IP. Respostas ficam em **cache** pelo **TTL**.

        Registros comuns: **A** (IPv4), **AAAA** (IPv6), **CNAME** (apelido para outro nome), **MX** (servidor de e-mail), **TXT** (verificações, SPF), **NS** (servidores do domínio).

        **TLS (simplificado)**: no *handshake*, o servidor apresenta um **certificado** assinado por uma **CA** em que seu sistema confia; cliente e servidor combinam uma **chave de sessão** (troca de chaves Diffie-Hellman) e daí em diante tudo é criptografado com criptografia simétrica (rápida).

        **Evolução do HTTP**: 1.1 (texto, uma requisição por vez por conexão) → 2 (binário, multiplexação numa conexão TCP) → 3 (sobre QUIC/UDP, sem bloqueio entre fluxos).
      `),
      warn('O cadeado do navegador garante que você fala com **o dono do domínio** de forma segura — não que o site seja honesto. Sites de phishing também têm HTTPS. Confira o domínio.'),
    ],
    exemplo: [code('bash', `
      $ dig +short exemplo.com A
      93.184.215.14
      $ dig exemplo.com MX
      $ curl -v https://exemplo.com 2>&1 | grep -E "SSL|TLS|subject|issuer"
    `, 'Ferramentas de linha de comando para investigar DNS e TLS no seu computador.')],
    codigo: [py(`
      # Um cache DNS com TTL, como o do seu sistema operacional
      class CacheDNS:
          def __init__(self):
              self.dados = {}
          def guardar(self, nome, ip, ttl, agora):
              self.dados[nome] = (ip, agora + ttl)
          def buscar(self, nome, agora):
              if nome in self.dados:
                  ip, expira = self.dados[nome]
                  if agora < expira:
                      return ip
                  del self.dados[nome]
              return None

      c = CacheDNS()
      c.guardar("exemplo.com", "93.184.215.14", ttl=300, agora=0)
      print(c.buscar("exemplo.com", agora=100), c.buscar("exemplo.com", agora=400))
    `)],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e9-dns-0',
          kind: 'mcq',
          prompt: "Qual a função principal do **DNS**?",
          difficulty: 'facil',
          skills: ["redes-dns-tls"],
          hints: ["Você digita nomes; a rede precisa de números."],
          explanation: "O DNS traduz nomes de domínio (exemplo.com) em endereços IP. É a \"agenda de contatos\" da internet.",
          options: [
            { text: "Traduzir nomes de domínio em endereços IP", correct: true, feedback: "Isso." },
            { text: "Criptografar a conexão", feedback: "Isso é papel do TLS." },
            { text: "Garantir que os pacotes cheguem em ordem", feedback: "Isso é papel do TCP." },
            { text: "Guardar as páginas em cache", feedback: "O DNS tem cache de respostas, mas não de páginas." },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e9-dns-1',
          kind: 'mcq',
          prompt: 'Você mudou o IP do seu site no DNS, mas alguns usuários continuam indo para o servidor antigo por horas. Causa mais provável?',
          difficulty: 'intermediario',
          skills: ['redes-dns-tls'],
          hints: ['Respostas DNS ficam guardadas por quanto tempo?'],
          explanation: 'Resolvedores e sistemas guardam a resposta antiga em cache até o TTL expirar. Antes de migrações, reduza o TTL com antecedência.',
          options: [
            { text: 'O TTL da resposta antiga ainda não expirou nos caches', correct: true, feedback: 'Isso.' },
            { text: 'O TCP guardou a conexão', feedback: 'Conexões não duram horas entre acessos distintos.' },
            { text: 'O certificado TLS expirou', feedback: 'Isso daria erro de certificado, não o servidor antigo.' },
            { text: 'O DNS só atualiza uma vez por dia no mundo todo', feedback: 'Não há atualização global; é cache com TTL.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e9-tls-1',
          kind: 'mcq',
          prompt: 'O que o HTTPS **não** protege?',
          difficulty: 'intermediario',
          skills: ['redes-dns-tls'],
          hints: ['Pense no que fica visível para o provedor de internet.'],
          explanation: 'O conteúdo, os caminhos e os cabeçalhos são criptografados, mas o IP de destino e (normalmente) o nome do site (SNI) e o volume de tráfego ainda são visíveis.',
          options: [
            { text: 'O conteúdo das páginas', feedback: 'Isso é criptografado.' },
            { text: 'A senha enviada no formulário', feedback: 'Também criptografada em trânsito.' },
            { text: 'O fato de você estar acessando aquele domínio/IP', correct: true, feedback: 'Isso: metadados como IP e, em geral, o nome do servidor ficam visíveis.' },
            { text: 'Os cookies', feedback: 'Cookies vão nos cabeçalhos, que são criptografados.' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e9-dns-desafio',
          kind: 'code',
          lang: 'python',
          prompt: 'Simule a resolução DNS iterativa: `resolver(nome, servidores)` recebe um dict de "zonas" (ex.: `{".": {"br": "ns-br"}, "ns-br": {"exemplo.br": "ns-ex"}, "ns-ex": {"www.exemplo.br": "1.2.3.4"}}`) e devolve `(ip, caminho)` onde caminho é a lista de servidores consultados, começando pela raiz ".". Em cada servidor, procure a entrada que é o **sufixo mais longo** do nome.',
          difficulty: 'desafio',
          skills: ['redes-dns-tls'],
          hints: ['Comece em ".". Em cada servidor, olhe as chaves que são sufixo do nome (`nome.endswith(chave)`).', 'Se a resposta for outro servidor (chave existe no dict de servidores), continue nele; senão, é o IP.'],
          explanation: 'É o processo de delegação do DNS: cada nível só sabe quem é responsável pelo próximo. Isso permite que o sistema seja distribuído e escalável.',
          starter: 'def resolver(nome, servidores):\n    pass\n',
          solution: dedent(`
            def resolver(nome, servidores):
                atual = "."
                caminho = []
                while True:
                    caminho.append(atual)
                    zona = servidores[atual]
                    candidatos = [k for k in zona if nome == k or nome.endswith("." + k) or k == nome]
                    if not candidatos:
                        return None, caminho
                    resposta = zona[max(candidatos, key=len)]
                    if resposta in servidores:
                        atual = resposta
                    else:
                        return resposta, caminho
          `),
          tests: [
            { name: 'resolução completa', code: 's = {".": {"br": "ns-br"}, "ns-br": {"exemplo.br": "ns-ex"}, "ns-ex": {"www.exemplo.br": "1.2.3.4"}}\nassert resolver("www.exemplo.br", s) == ("1.2.3.4", [".", "ns-br", "ns-ex"])' },
            { name: 'inexistente', code: 's = {".": {"br": "ns-br"}, "ns-br": {}}\nassert resolver("x.com", s) == (None, ["."])' },
          ],
        },
      },
    ],
    projeto: [md('**Investigue**: no navegador, clique no cadeado de um site → certificado. Quem é a autoridade certificadora? Quando expira? Depois rode `dig` (ou use um site de consulta DNS) para ver os registros A, MX e TXT do mesmo domínio.')],
    revisao: [md('- DNS: hierárquico, distribuído, com cache (TTL).\n- Registros A, AAAA, CNAME, MX, TXT, NS.\n- TLS: confidencialidade, integridade, autenticidade (certificados + CAs).\n- HTTP/2 multiplexa; HTTP/3 roda sobre QUIC.')],
  },
  review: [
    ['O que o TTL de um registro DNS controla?', 'Por quanto tempo a resposta pode ser mantida em cache.'],
    ['O que o TLS garante?', 'Confidencialidade, integridade e autenticidade do servidor.'],
  ],
  references: ['kurose-ross', 'mdn-http', 'rfc9110', 'cloudflare-learning'],
});

/* ========================= Nível 10 — Engenharia de Software ========================= */

const git = lesson({
  id: 'l10-git',
  moduleId: 'm10-1',
  title: 'Git e GitHub: controle de versão',
  titleEn: 'Git and GitHub: version control',
  summary: 'Commits, branches, merge, repositórios remotos e o fluxo de pull requests.',
  minutes: 45,
  objectives: ['Entender o modelo do Git (snapshots, working tree, staging, repositório)', 'Usar status, add, commit, log, diff', 'Criar branches, fazer merge e resolver conflitos', 'Trabalhar com remotos e pull requests'],
  skills: ['tools-git'],
  terms: [
    t('controle de versão', 'version control', 'Registrar a história das mudanças de um projeto.'),
    t('repositório', 'repository (repo)', 'Projeto com toda a sua história no Git.'),
    t('confirmação / commit', 'commit', 'Um snapshot do projeto com mensagem, autor e data.'),
    t('área de preparação', 'staging area / index', 'Onde você escolhe o que entra no próximo commit.'),
    t('ramificação', 'branch', 'Linha de desenvolvimento independente; um ponteiro para um commit.'),
    t('mesclar', 'merge', 'Juntar o trabalho de duas branches.'),
    t('conflito', 'merge conflict', 'Quando as duas branches mudaram as mesmas linhas.'),
    t('pedido de integração', 'pull request (PR)', 'Proposta de mudança revisada antes de entrar na branch principal.'),
  ],
  stages: {
    conceito: [md('**Git** guarda a história do seu projeto como uma sequência de **snapshots** (*commits*). Você pode voltar no tempo, trabalhar em várias ideias em paralelo (**{{branches|branches}}**) e colaborar sem sobrescrever o trabalho dos outros. **GitHub** hospeda repositórios Git e adiciona colaboração: pull requests, revisões, issues, CI.')],
    explicacao: [
      md(`
        **As três áreas**: **working tree** (seus arquivos) → \`git add\` → **staging area** → \`git commit\` → **repositório** (história).

        Fluxo diário:
      `),
      code('bash', `
        git status                     # o que mudou?
        git diff                       # quais linhas?
        git add src/tarefas.py         # prepara
        git commit -m "Adiciona prioridade às tarefas"
        git log --oneline --graph      # história

        git switch -c feature/filtro   # nova branch
        # ... trabalha, commita ...
        git switch main
        git merge feature/filtro       # junta

        git push -u origin feature/filtro   # envia ao GitHub e abre um PR
      `),
      md(`
        **Conflitos** aparecem quando duas branches mudam as mesmas linhas. O Git marca o arquivo com \`<<<<<<<\`, \`=======\` e \`>>>>>>>\`: você escolhe o resultado, remove as marcas, faz \`git add\` e \`git commit\`.

        **Boas mensagens de commit**: imperativo, curto, explica o **porquê** quando não é óbvio. *"Corrige divisão por zero na média"*, não *"ajustes"*.
      `),
      english('Git é todo em inglês, e o vocabulário vale para entrevistas: *commit, push, pull, fetch, merge, rebase, branch, checkout/switch, stash, cherry-pick, tag, remote, origin, upstream, fork, pull request, code review, "LGTM" (looks good to me), "nit" (detalhe pequeno), "WIP" (work in progress)*.'),
      warn('Nunca faça commit de senhas, tokens ou arquivos `.env`. Use `.gitignore`. Se vazar, considere a credencial comprometida: **revogue** — apagar o commit não basta, a história e os clones guardam tudo.'),
    ],
    exemplo: [md('**Fluxo de pull request** (GitHub flow): `main` sempre funcional → crie uma branch para cada mudança → commits pequenos → push → abra um PR → CI roda os testes → alguém revisa → ajustes → merge → apague a branch.')],
    codigo: [py(`
      # Um mini-Git: cada commit guarda o hash do conteúdo e o do pai.
      import hashlib, json

      def fazer_commit(arquivos, pai, msg):
          conteudo = json.dumps({"arquivos": arquivos, "pai": pai, "msg": msg}, sort_keys=True)
          return hashlib.sha1(conteudo.encode()).hexdigest()[:7], conteudo

      c1, _ = fazer_commit({"a.txt": "oi"}, None, "primeiro commit")
      c2, _ = fazer_commit({"a.txt": "oi, mundo"}, c1, "amplia saudação")
      print(c1, "<-", c2)
      # Mudar qualquer coisa no passado muda todos os hashes seguintes: a história é à prova de adulteração.
    `)],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e10-git-1',
          kind: 'parsons',
          lang: 'bash',
          prompt: 'Ordene os comandos para criar uma branch, commitar uma alteração e enviá-la ao GitHub.',
          difficulty: 'facil',
          skills: ['tools-git'],
          hints: ['Primeiro a branch; o add vem antes do commit; o push por último.'],
          explanation: 'switch -c → (editar) → add → commit → push.',
          lines: ['git switch -c feature/login', 'git add login.py', 'git commit -m "Adiciona tela de login"', 'git push -u origin feature/login'],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e10-git-2',
          kind: 'mcq',
          prompt: 'Você editou `app.py` e rodou `git commit -m "corrige bug"`, mas o Git disse *"nothing added to commit but untracked files present"*... ou *"no changes added to commit"*. O que faltou?',
          difficulty: 'facil',
          skills: ['tools-git', 'en-leitura-erros'],
          hints: ['*no changes added* = nenhuma mudança adicionada... adicionada onde?'],
          explanation: 'Faltou `git add app.py` para colocar a mudança na staging area. (Ou use `git commit -am`, que inclui arquivos já rastreados.)',
          options: [
            { text: 'git push', feedback: 'Push envia commits já feitos.' },
            { text: 'git add app.py', correct: true, feedback: 'Isso: preparar a mudança antes do commit.' },
            { text: 'git init', feedback: 'O repositório já existe.' },
            { text: 'git merge', feedback: 'Não há branches a juntar.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e10-git-3',
          kind: 'mcq',
          prompt: 'Qual a melhor mensagem de commit?',
          difficulty: 'facil',
          skills: ['tools-git'],
          hints: ['Imperativo, específico, curto.'],
          explanation: 'Mensagens específicas no imperativo dizem o que o commit faz quando aplicado e ajudam a ler a história anos depois.',
          options: [
            { text: 'mudanças', feedback: 'Não diz nada.' },
            { text: 'Corrige cálculo de média quando a lista está vazia', correct: true, feedback: 'Isso: o quê e onde, no imperativo.' },
            { text: 'arrumei umas coisas e tbm o bug daquele dia', feedback: 'Vaga e mistura assuntos.' },
            { text: 'WIP WIP WIP', feedback: 'Aceitável numa branch pessoal, nunca na história principal.' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e10-git-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            O Git encontra o **ancestral comum** de duas branches para fazer o merge. Escreva \`ancestral_comum(pais, a, b)\`:
            \`pais\` é um dict commit → lista de pais (commits de merge têm 2 pais; o primeiro tem []). Devolva o ancestral
            comum de a e b mais próximo de a (por BFS a partir de a), considerando que um commit é ancestral de si mesmo.
          `),
          difficulty: 'desafio',
          skills: ['tools-git', 'ed-grafos'],
          hints: ['A história do Git é um grafo acíclico dirigido (DAG).', 'Calcule o conjunto de todos os ancestrais de b. Depois faça BFS a partir de a e devolva o primeiro que está nesse conjunto.'],
          explanation: 'É o *merge base*: o Git compara as duas pontas com ele (merge de três vias). Você usou BFS (Nível 3) num caso real.',
          starter: 'from collections import deque\n\ndef ancestral_comum(pais, a, b):\n    pass\n',
          solution: dedent(`
            from collections import deque

            def ancestral_comum(pais, a, b):
                anc_b = set()
                pilha = [b]
                while pilha:
                    c = pilha.pop()
                    if c not in anc_b:
                        anc_b.add(c)
                        pilha.extend(pais.get(c, []))
                fila, vistos = deque([a]), {a}
                while fila:
                    c = fila.popleft()
                    if c in anc_b:
                        return c
                    for p in pais.get(c, []):
                        if p not in vistos:
                            vistos.add(p)
                            fila.append(p)
                return None
          `),
          tests: [
            { name: 'branches divergentes', code: 'pais = {"A": [], "B": ["A"], "C": ["B"], "D": ["B"], "E": ["D"]}\nassert ancestral_comum(pais, "C", "E") == "B"' },
            { name: 'um é ancestral do outro', code: 'pais = {"A": [], "B": ["A"], "C": ["B"]}\nassert ancestral_comum(pais, "C", "B") == "B"' },
          ],
        },
      },
    ],
    projeto: [md('**Projeto contínuo: tudo no GitHub.** Crie um repositório para cada projeto da trilha (calculadora, tarefas, cadastro, portfólio...), com README, `.gitignore`, commits pequenos e pelo menos um PR revisado por você mesmo. Seu GitHub vira seu portfólio.'), { type: 'project', projectId: 'p4-portfolio' }],
    revisao: [md('- Working tree → staging (add) → repositório (commit).\n- Branches são ponteiros baratos; merge junta; conflitos se resolvem à mão.\n- GitHub flow: branch → PR → revisão + CI → merge.\n- Nunca commite segredos.')],
  },
  review: [
    ['Para que serve a staging area?', 'Escolher exatamente o que entra no próximo commit.'],
    ['O que é uma branch no Git?', 'Um ponteiro móvel para um commit; uma linha de desenvolvimento independente.'],
    ['Vazou um token num commit público. O que fazer?', 'Revogar o token imediatamente; apagar o commit não basta.'],
  ],
  references: ['pro-git', 'github-docs', 'missing-semester'],
});

const cleanCode = lesson({
  id: 'l10-clean-code',
  moduleId: 'm10-2',
  title: 'Código limpo, refatoração e code review',
  titleEn: 'Clean code, refactoring and code review',
  summary: 'Nomes, funções pequenas, duplicação, code smells e como revisar código dos outros (e receber revisão).',
  minutes: 35,
  objectives: ['Aplicar princípios de legibilidade', 'Reconhecer code smells', 'Refatorar com segurança, apoiado em testes', 'Fazer e receber code review'],
  skills: ['eng-clean-code'],
  terms: [
    t('refatoração', 'refactoring', 'Melhorar a estrutura do código sem mudar seu comportamento.'),
    t('mau cheiro', 'code smell', 'Indício superficial de um problema de design.'),
    t('revisão de código', 'code review', 'Outra pessoa analisar o código antes de integrá-lo.'),
    t('dívida técnica', 'technical debt', 'Custo futuro de atalhos tomados hoje.'),
    t('legibilidade', 'readability', 'Facilidade de entender o código.'),
    t('DRY', "DRY (don't repeat yourself)", 'Evitar duplicação de conhecimento.'),
  ],
  stages: {
    conceito: [md('Código é **lido** muito mais vezes do que é escrito. **Código limpo** é código que outra pessoa (ou você daqui a 6 meses) entende rápido e muda com segurança. **Refatorar** é melhorar a estrutura **sem mudar o comportamento** — e os **testes** são o que garante que nada mudou.')],
    explicacao: [
      md(`
        **Princípios práticos**:

        - **Nomes que revelam intenção**: \`dias_desde_ultimo_acesso\` em vez de \`d\`.
        - **Funções pequenas que fazem uma coisa**, num só nível de abstração.
        - **Sem números mágicos**: \`if idade >= IDADE_MINIMA\`.
        - **Retorno antecipado** (*guard clauses*) em vez de \`if\`s aninhados.
        - **DRY**, com moderação: duplicação de **conhecimento** é ruim; semelhança acidental pode ficar.
        - **Comentários** explicam o **porquê**, não o quê.

        **Code smells** comuns: função longa, lista enorme de parâmetros, nomes vagos (\`dados\`, \`tmp\`, \`gerenciador\`), código duplicado, comentários desatualizados, flags booleanas que mudam o comportamento da função.

        **Code review**: revise o **código**, não a pessoa; faça perguntas ("o que acontece se a lista vier vazia?"); separe bloqueadores de sugestões ("nit:"); elogie o que está bom. Ao receber: não leve para o lado pessoal, explique decisões, agradeça.
      `),
    ],
    exemplo: [py(`
      # ANTES
      def p(l, t):
          r = []
          for i in l:
              if t == 1:
                  if i["v"] > 100:
                      r.append(i["n"])
              else:
                  if i["v"] <= 100:
                      r.append(i["n"])
          return r

      # DEPOIS
      LIMITE_PRECO_ALTO = 100

      def nomes_caros(produtos):
          return [p["nome"] for p in produtos if p["valor"] > LIMITE_PRECO_ALTO]

      def nomes_baratos(produtos):
          return [p["nome"] for p in produtos if p["valor"] <= LIMITE_PRECO_ALTO]

      produtos = [{"nome": "teclado", "valor": 150}, {"nome": "caneta", "valor": 3}]
      print(nomes_caros(produtos), nomes_baratos(produtos))
    `)],
    codigo: [md('Ferramentas automatizam parte disso: **formatadores** (black, ruff format, prettier), **linters** (ruff, eslint) e **type checkers** (mypy, TypeScript). Eles rodam no editor e na CI, liberando a revisão humana para o que importa: design e correção.')],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e10-clean-1',
          kind: 'fix',
          lang: 'python',
          prompt: 'Refatore `f` sem mudar o comportamento: dê nomes claros (a função deve se chamar `calcular_frete`), remova o número mágico e use retorno antecipado. Os testes verificam o comportamento **e** o nome.',
          difficulty: 'intermediario',
          skills: ['eng-clean-code'],
          hints: ['O que a função calcula? Leia o código e descubra o domínio.', 'Crie constantes como FRETE_GRATIS_A_PARTIR_DE = 200.'],
          explanation: 'O comportamento é idêntico (os testes provam), mas agora o código se explica. Refatorar apoiado em testes é o que torna a mudança segura.',
          starter: dedent(`
            def f(v, p):
                if v < 200:
                    if p > 10:
                        return 15 + (p - 10) * 2
                    else:
                        return 15
                else:
                    return 0
          `),
          solution: dedent(`
            FRETE_GRATIS_A_PARTIR_DE = 200
            FRETE_BASE = 15
            PESO_INCLUIDO_KG = 10
            CUSTO_POR_KG_EXTRA = 2

            def calcular_frete(valor_compra, peso_kg):
                if valor_compra >= FRETE_GRATIS_A_PARTIR_DE:
                    return 0
                excesso = max(0, peso_kg - PESO_INCLUIDO_KG)
                return FRETE_BASE + excesso * CUSTO_POR_KG_EXTRA
          `),
          tests: [
            { name: 'mesmo comportamento', code: 'casos = [(100, 5), (100, 12), (250, 30), (199.99, 10), (200, 1)]\nesperado = [15, 19, 0, 15, 0]\nassert [calcular_frete(v, p) for v, p in casos] == esperado' },
            { name: 'não usa mais o nome f', code: 'assert "f" not in dir() or not callable(globals().get("f"))' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e10-clean-2',
          kind: 'mcq',
          prompt: 'Num code review, qual comentário é mais útil?',
          difficulty: 'facil',
          skills: ['eng-clean-code'],
          hints: ['Qual ajuda o autor a agir, sem atacá-lo?'],
          explanation: 'Comentários específicos, com o caso concreto e uma sugestão, ajudam o autor a agir.',
          options: [
            { text: '"Isso está horrível."', feedback: 'Ataca e não ajuda a melhorar.' },
            { text: '"O que acontece aqui se `itens` vier vazio? Acho que dá ZeroDivisionError na linha 12; que tal tratar antes?"', correct: true, feedback: 'Específico, gentil e acionável.' },
            { text: '"LGTM" sem ler', feedback: 'Aprovação sem revisão não protege ninguém.' },
            { text: '"Eu faria diferente."', feedback: 'Diferente como? Por quê?' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e10-clean-desafio',
          kind: 'fix',
          lang: 'python',
          prompt: 'O relatório abaixo duplica a lógica de formatação três vezes. Refatore extraindo uma função `formatar_linha(rotulo, valor)` e mantenha a saída **idêntica**.',
          difficulty: 'avancado',
          skills: ['eng-clean-code'],
          hints: ['O que muda entre as três linhas? Só o rótulo e o valor.', 'O teste verifica a saída e a existência de `formatar_linha`.'],
          explanation: 'Extrair a função elimina a duplicação de conhecimento (o formato). Se o formato mudar, muda em um lugar só.',
          starter: dedent(`
            def relatorio(total, media, maximo):
                linhas = []
                linhas.append("Total".ljust(10, ".") + f"{total:>10.2f}")
                linhas.append("Média".ljust(10, ".") + f"{media:>10.2f}")
                linhas.append("Máximo".ljust(10, ".") + f"{maximo:>10.2f}")
                return "\\n".join(linhas)
          `),
          solution: dedent(`
            def formatar_linha(rotulo, valor):
                return rotulo.ljust(10, ".") + f"{valor:>10.2f}"

            def relatorio(total, media, maximo):
                return "\\n".join(formatar_linha(r, v) for r, v in [("Total", total), ("Média", media), ("Máximo", maximo)])
          `),
          tests: [
            { name: 'saída idêntica', code: 'assert relatorio(10, 2.5, 7) == "Total.....     10.00\\nMédia.....      2.50\\nMáximo....      7.00"' },
            { name: 'função extraída', code: 'assert formatar_linha("X", 1) == "X.........      1.00"' },
          ],
        },
      },
    ],
    projeto: [md('**Revise seu próprio código**: abra o projeto da lista de tarefas, encontre 5 code smells e refatore cada um em um commit separado, rodando os testes a cada passo. Escreva a descrição do PR explicando as mudanças.')],
    revisao: [md('- Nomes claros, funções pequenas, sem números mágicos, guard clauses.\n- Refatorar = mudar estrutura, não comportamento — com testes.\n- Code review: específico, gentil, acionável.')],
  },
  review: [
    ['O que é refatoração?', 'Melhorar a estrutura do código sem alterar seu comportamento externo.'],
    ['O que comentários devem explicar?', 'O porquê de decisões que o código não deixa claro, não o quê.'],
  ],
  references: ['refactoring', 'swe-at-google', 'pragmatic-programmer'],
});

const ci = lesson({
  id: 'l10-testes-ci',
  moduleId: 'm10-3',
  title: 'Estratégia de testes e integração contínua',
  titleEn: 'Testing strategy and continuous integration',
  summary: 'A pirâmide de testes, mocks, cobertura e pipelines de CI que rodam a cada push.',
  minutes: 30,
  objectives: ['Distinguir testes de unidade, integração e ponta a ponta', 'Usar test doubles (mocks, stubs, fakes)', 'Entender o que é um pipeline de CI', 'Interpretar cobertura com senso crítico'],
  skills: ['eng-testes-ci'],
  terms: [
    t('pirâmide de testes', 'test pyramid', 'Muitos testes de unidade, menos de integração, poucos ponta a ponta.'),
    t('teste de integração', 'integration test', 'Testa várias partes funcionando juntas.'),
    t('teste ponta a ponta', 'end-to-end (E2E) test', 'Testa o sistema como o usuário usa.'),
    t('dublê de teste', 'test double (mock, stub, fake)', 'Substituto de uma dependência real em testes.'),
    t('integração contínua', 'continuous integration (CI)', 'Rodar build e testes automaticamente a cada mudança.'),
    t('cobertura', 'code coverage', 'Porcentagem do código executada pelos testes.'),
  ],
  stages: {
    conceito: [md('Em um projeto real, os testes formam uma **pirâmide**: muitos testes de **unidade** (rápidos, isolados), alguns de **integração** e poucos **ponta a ponta** (lentos, frágeis, mas próximos do usuário). A **integração contínua** roda tudo automaticamente a cada push, para que nenhum erro chegue à branch principal.')],
    explicacao: [
      md(`
        - **Unidade**: uma função/classe, sem rede ou disco. Milissegundos.
        - **Integração**: módulo + banco real (ex.: SQLite em memória), API + rotas.
        - **E2E**: navegador automatizado (Playwright) clicando na interface.

        **Dublês de teste**: para testar uma função que envia e-mail, injete um **fake** que só registra as mensagens. Isso só é possível se a dependência for **injetada** (Inversão de Dependência, Nível 5).

        **CI** (ex.: GitHub Actions): a cada push/PR → instala dependências → lint → type check → testes → build. PR só entra com tudo verde.

        **Cobertura** mostra o que **não** foi testado, mas 100% de cobertura não prova correção: um teste sem asserts "cobre" o código e não verifica nada.
      `),
      code('text', `
        # .github/workflows/ci.yml
        name: CI
        on: [push, pull_request]
        jobs:
          test:
            runs-on: ubuntu-latest
            steps:
              - uses: actions/checkout@v4
              - uses: actions/setup-python@v5
                with: { python-version: "3.13" }
              - run: pip install -r requirements.txt
              - run: ruff check .
              - run: pytest -q
      `, 'Um pipeline mínimo de CI com GitHub Actions.'),
    ],
    exemplo: [py(`
      class EmailFake:
          def __init__(self):
              self.enviados = []
          def enviar(self, para, texto):
              self.enviados.append((para, texto))

      def cadastrar(nome, email, servico_email):
          if "@" not in email:
              raise ValueError("email inválido")
          servico_email.enviar(email, f"Bem-vindo(a), {nome}!")
          return {"nome": nome, "email": email}

      fake = EmailFake()
      cadastrar("Ana", "ana@ex.com", fake)
      assert fake.enviados == [("ana@ex.com", "Bem-vindo(a), Ana!")]
      print("teste com fake passou; nenhum e-mail real foi enviado")
    `)],
    codigo: [md('Esta plataforma tem sua própria estratégia de testes: unidade (motor de revisão espaçada, domínio, diagnóstico), **verificação automática de todos os exercícios** (cada solução de referência passa e cada código inicial falha), integração da API e E2E com verificação de acessibilidade. Veja `docs/TESTES.md` no repositório.')],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e10-ci-1',
          kind: 'mcq',
          prompt: 'Por que ter **mais** testes de unidade do que testes ponta a ponta?',
          difficulty: 'facil',
          skills: ['eng-testes-ci'],
          hints: ['Compare velocidade, estabilidade e facilidade de localizar o erro.'],
          explanation: 'Testes de unidade são rápidos, determinísticos e apontam exatamente onde está o erro. E2E são lentos e frágeis, mas pegam problemas de integração — por isso poucos e bem escolhidos.',
          options: [
            { text: 'Porque E2E não encontram bugs', feedback: 'Encontram, mas são caros e lentos.' },
            { text: 'Porque são rápidos, estáveis e localizam o erro com precisão', correct: true, feedback: 'Isso.' },
            { text: 'Porque cobertura de unidade é obrigatória por lei', feedback: 'Não há tal lei.' },
            { text: 'Não há motivo: deve haver só E2E', feedback: 'Uma suíte só de E2E fica lenta e instável.' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e10-ci-desafio',
          kind: 'code',
          lang: 'python',
          prompt: 'Torne `saudacao()` testável: hoje ela usa `datetime.now()` diretamente. Mude a assinatura para `saudacao(agora)` recebendo um datetime (injeção de dependência) e devolva "Bom dia" (5h–11h), "Boa tarde" (12h–17h) ou "Boa noite" (demais).',
          difficulty: 'intermediario',
          skills: ['eng-testes-ci'],
          hints: ['O teste precisa controlar a hora. Como, se a função lê o relógio por conta própria?', 'Receba `agora` como parâmetro e use `agora.hour`.'],
          explanation: 'Dependências escondidas (relógio, rede, aleatoriedade) tornam código difícil de testar. Recebê-las como parâmetro permite testes determinísticos.',
          starter: 'from datetime import datetime\n\ndef saudacao():\n    h = datetime.now().hour\n    return "Bom dia" if h < 12 else "Boa tarde"\n',
          solution: dedent(`
            from datetime import datetime

            def saudacao(agora):
                h = agora.hour
                if 5 <= h <= 11:
                    return "Bom dia"
                if 12 <= h <= 17:
                    return "Boa tarde"
                return "Boa noite"
          `),
          tests: [
            { name: 'manhã, tarde, noite', code: 'from datetime import datetime\nassert [saudacao(datetime(2026, 1, 1, h)) for h in (5, 11, 12, 17, 18, 3)] == ["Bom dia", "Bom dia", "Boa tarde", "Boa tarde", "Boa noite", "Boa noite"]' },
          ],
        },
      },
    ],
    projeto: [md('**API REST (parte 2)**: adicione GitHub Actions ao projeto da API com lint, testes de unidade, testes de integração com banco em memória e badge de status no README.'), { type: 'project', projectId: 'p5-api' }],
    revisao: [md('- Pirâmide: unidade > integração > E2E.\n- Dublês de teste exigem dependências injetáveis.\n- CI: todo push roda lint, tipos, testes e build.\n- Cobertura mostra lacunas, não prova correção.')],
  },
  review: [
    ['O que é integração contínua?', 'Rodar automaticamente build e testes a cada mudança enviada ao repositório.'],
    ['Por que 100% de cobertura não garante correção?', 'Porque código executado por um teste não significa comportamento verificado por asserts adequados.'],
  ],
  references: ['swe-at-google', 'github-docs', 'pytest-docs'],
});

export const level8: Level = {
  id: 'n8', number: 8, title: 'Sistemas Operacionais', titleEn: 'Operating Systems',
  goal: 'Entender processos, threads, memória, arquivos e concorrência — o que acontece por baixo de todo programa.',
  why: 'Bugs de desempenho, travamentos e condições de corrida só fazem sentido quando você entende o sistema operacional. É uma disciplina central em todas as graduações de referência (OSTEP, MIT 6.1810).',
  modules: [
    {
      id: 'm8-1', levelId: 'n8', title: 'Processos, threads e escalonamento', titleEn: 'Processes, threads and scheduling',
      description: 'Virtualização da CPU.',
      prerequisites: ['m0-2', 'm2-5'],
      skills: [{ id: 'so-processos', pt: 'Processos e escalonamento', en: 'Processes and scheduling' }],
      outline: ['Processos e estados', 'fork/exec', 'Threads', 'Escalonamento: FCFS, SJF, RR, prioridades', 'Troca de contexto'],
      lessons: [processos, ...m8_1],
      references: ['ostep'],
    },
    {
      id: 'm8-2', levelId: 'n8', title: 'Memória e sistemas de arquivos', titleEn: 'Memory and file systems',
      description: 'Memória virtual, paginação e como arquivos são guardados.',
      prerequisites: ['m8-1'],
      skills: [{ id: 'so-memoria', pt: 'Memória virtual e arquivos', en: 'Virtual memory and file systems' }],
      outline: ['Espaço de endereçamento', 'Paginação e TLB', 'Stack × heap', 'Ponteiros e gerenciamento de memória em C', 'Inodes, diretórios, journaling'],
      lessons: [memoria, ...m8_2],
      references: ['ostep', 'cmu-15213'],
    },
    {
      id: 'm8-3', levelId: 'n8', title: 'Concorrência e sincronização', titleEn: 'Concurrency and synchronization',
      description: 'Condições de corrida, locks, deadlocks.',
      prerequisites: ['m8-1'],
      skills: [{ id: 'so-concorrencia', pt: 'Concorrência e sincronização', en: 'Concurrency and synchronization' }],
      outline: ['Condições de corrida', 'Locks e mutex', 'Semáforos e variáveis de condição', 'Deadlock', 'async/await × threads × processos'],
      lessons: [concorrencia, ...m8_3],
      references: ['ostep'],
    },
  ],
};

export const level9: Level = {
  id: 'n9', number: 9, title: 'Redes de Computadores', titleEn: 'Computer Networks',
  goal: 'Explicar como os dados atravessam a internet, camada por camada, e programar comunicação em rede.',
  why: 'Todo sistema moderno é distribuído. Entender camadas, TCP, DNS e TLS é o que permite depurar "o site está lento", projetar APIs e pensar em segurança.',
  modules: [
    {
      id: 'm9-1', levelId: 'n9', title: 'Camadas, IP, TCP e UDP', titleEn: 'Layers, IP, TCP and UDP',
      description: 'A pilha TCP/IP de baixo para cima.',
      prerequisites: ['m0-3'],
      skills: [{ id: 'redes-tcpip', pt: 'TCP/IP', en: 'TCP/IP' }],
      outline: ['Modelo em camadas', 'IP, máscaras, roteamento, NAT', 'TCP: handshake, confiabilidade, congestionamento', 'UDP e QUIC'],
      lessons: [tcpip, ...m9_1],
      references: ['kurose-ross', 'stanford-cs144'],
    },
    {
      id: 'm9-2', levelId: 'n9', title: 'DNS, HTTP(S) e TLS', titleEn: 'DNS, HTTP(S) and TLS',
      description: 'A camada de aplicação que você usa todos os dias.',
      prerequisites: ['m9-1'],
      skills: [{ id: 'redes-dns-tls', pt: 'DNS, HTTP e TLS', en: 'DNS, HTTP and TLS' }],
      outline: ['Resolução DNS e cache', 'Tipos de registro', 'HTTP/1.1, 2 e 3', 'TLS e certificados'],
      lessons: [dnsHttps, ...m9_2],
      references: ['kurose-ross', 'rfc9110'],
    },
    {
      id: 'm9-3', levelId: 'n9', title: 'Sockets e arquitetura cliente-servidor', titleEn: 'Sockets and client-server architecture',
      description: 'Programar a comunicação em rede.',
      prerequisites: ['m9-2', 'm2-5'],
      skills: [{ id: 'redes-sockets', pt: 'Programação com sockets', en: 'Socket programming' }],
      outline: ['API de sockets', 'Servidor TCP de eco', 'Concorrência no servidor', 'WebSockets', 'Balanceamento de carga e proxies'],
      lessons: [sockets, ...m9_3],
      references: ['kurose-ross', 'python-docs'],
    },
  ],
};

export const level10: Level = {
  id: 'n10', number: 10, title: 'Engenharia de Software', titleEn: 'Software Engineering',
  goal: 'Trabalhar como um profissional: versionamento, código limpo, testes, CI/CD, arquitetura e colaboração.',
  why: 'Programar sozinho é diferente de construir software em equipe que dura anos. Este nível ensina as práticas que empresas esperam no primeiro dia de estágio — e o Git pode (e deve) ser estudado bem cedo.',
  modules: [
    {
      id: 'm10-1', levelId: 'n10', title: 'Git e GitHub', titleEn: 'Git and GitHub',
      description: 'Controle de versão e colaboração.',
      prerequisites: ['m0-2'],
      skills: [{ id: 'tools-git', pt: 'Git e GitHub', en: 'Git and GitHub' }],
      outline: ['Modelo do Git', 'Commits e história', 'Branches, merge e conflitos', 'Remotos, PRs e code review', 'rebase, stash, tags'],
      lessons: [git],
      references: ['pro-git', 'github-docs'],
    },
    {
      id: 'm10-2', levelId: 'n10', title: 'Código limpo e refatoração', titleEn: 'Clean code and refactoring',
      description: 'Legibilidade, code smells e revisão.',
      prerequisites: ['m2-5'],
      skills: [{ id: 'eng-clean-code', pt: 'Código limpo e refatoração', en: 'Clean code and refactoring' }],
      outline: ['Nomes e funções', 'Code smells', 'Refatorações seguras', 'Linters e formatadores', 'Code review'],
      lessons: [cleanCode],
      references: ['refactoring', 'swe-at-google'],
    },
    {
      id: 'm10-3', levelId: 'n10', title: 'Testes e CI/CD', titleEn: 'Testing and CI/CD',
      description: 'Estratégia de testes e automação.',
      prerequisites: ['m10-1', 'm10-2'],
      skills: [{ id: 'eng-testes-ci', pt: 'Estratégia de testes e CI', en: 'Testing strategy and CI' }],
      outline: ['Pirâmide de testes', 'Dublês de teste', 'Cobertura', 'GitHub Actions', 'Entrega contínua'],
      lessons: [ci],
      references: ['swe-at-google', 'github-docs'],
    },
    {
      id: 'm10-4', levelId: 'n10', title: 'Arquitetura e processos', titleEn: 'Architecture and processes',
      description: 'Organizar sistemas e equipes.',
      prerequisites: ['m10-3', 'm5-3'],
      skills: [{ id: 'eng-arquitetura', pt: 'Arquitetura de software', en: 'Software architecture' }],
      outline: ['Camadas e arquitetura limpa', 'Monólito × microsserviços', 'Documentação (README, ADRs)', 'Requisitos e histórias de usuário', 'Scrum, Kanban e métodos ágeis'],
      lessons: [arquitetura],
      references: ['ddia', 'swe-at-google', 'pragmatic-programmer'],
    },
  ],
};

