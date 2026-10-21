// Cópia da aula publicada na main em cb86308 (antes da separação do conteúdo pago). Fica aqui só enquanto os níveis 2 a 14 estão abertos; veja aberto.ts.
/** Lições adicionais do módulo m8-3 (concorrência e sincronização). */
import type { Lesson } from '../../types.ts';
import { code, dedent, deep, english, info, lesson, md, py, t, tip, warn } from '../../helpers.ts';

/* ------------------------------------------------------------------ */
/* Semáforos, variáveis de condição e o produtor-consumidor            */
/* ------------------------------------------------------------------ */

const semaforos = lesson({
  id: 'l8-semaforos-condicao',
  moduleId: 'm8-3',
  title: 'Esperar sem desperdiçar: semáforos, variáveis de condição e o produtor-consumidor',
  titleEn: 'Waiting without spinning: semaphores, condition variables and the producer-consumer problem',
  summary: 'O lock garante que só uma thread mexe no dado; falta fazer uma thread esperar até algo acontecer. Semáforos contadores, variáveis de condição, o buffer limitado e o deadlock que nasce de inverter dois acquire.',
  minutes: 45,
  objectives: [
    'Explicar por que um lock sozinho não resolve "esperar até haver item" e por que a espera ativa desperdiça CPU',
    'Usar semáforos contadores para limitar acesso (N vagas) e semáforos iniciados em 0 para impor ordem',
    'Usar variáveis de condição corretamente: com o lock na mão, dentro de um while, avisando depois de mudar o estado',
    'Montar o buffer limitado do produtor-consumidor com semáforos e com variáveis de condição',
    'Mostrar como inverter a ordem de dois acquire no produtor-consumidor causa deadlock, ligando-o às quatro condições de Coffman',
  ],
  skills: ['so-concorrencia'],
  terms: [
    t('espera ativa', 'busy waiting / spinning', 'Ficar testando uma condição num laço, gastando CPU, em vez de dormir até ser avisado.'),
    t('semáforo', 'semaphore', 'Contador inteiro, nunca negativo, com duas operações atômicas: P (espera o contador ficar positivo e decrementa) e V (incrementa e acorda quem espera).', 'sem_wait() decrements the semaphore; if the value is zero, the call blocks until it becomes possible to perform the decrement.'),
    t('semáforo contador', 'counting semaphore', 'Semáforo iniciado com N: deixa até N threads passarem ao mesmo tempo.'),
    t('semáforo binário', 'binary semaphore', 'Semáforo que só vale 0 ou 1; usado como exclusão mútua ou como sinal entre duas threads.'),
    t('variável de condição', 'condition variable', 'Fila de espera associada a um lock: wait libera o lock e dorme; notify acorda quem espera. Não guarda memória do aviso.', 'Condition variables must be used with a mutex: wait() atomically releases the lock and suspends the thread.'),
    t('monitor', 'monitor', 'Objeto que junta dados, um lock e variáveis de condição: só uma thread por vez executa seus métodos.'),
    t('produtor-consumidor', 'producer-consumer', 'Problema clássico: threads que produzem itens e threads que os consomem, ligadas por um buffer compartilhado.'),
    t('buffer limitado', 'bounded buffer', 'Fila com capacidade máxima: o produtor espera se ela está cheia; o consumidor, se está vazia.'),
    t('despertar espúrio', 'spurious wakeup', 'Retorno de wait sem que ninguém tenha avisado; permitido pelo POSIX, e mais um motivo para reconferir a condição.', 'Spurious wakeups from pthread_cond_wait() may occur.'),
    t('aviso perdido', 'lost wakeup', 'Aviso (notify) feito quando ninguém estava esperando: some, e quem for esperar depois dorme para sempre.'),
    t('semântica Mesa', 'Mesa semantics', 'Regra em que notify é só uma dica: a thread acordada volta a disputar o lock e, quando roda, o estado pode ter mudado.'),
  ],
  stages: {
    conceito: [
      md(`
        Na lição anterior, o lock resolveu um problema: **duas threads não mexem no mesmo dado ao mesmo tempo**. Mas muitos programas precisam de outra coisa: **esperar até algo acontecer**. O caixa da padaria só passa o cartão depois que o pedido foi registrado; a thread que envia notas fiscais à Sefaz só trabalha quando há nota na fila; no máximo 10 threads podem usar as 10 conexões do banco de dados.

        Testar a condição num laço (\`while not fila: pass\`) é {{espera ativa|busy waiting}}: a thread queima um núcleo inteiro perguntando "já tem?". O sistema operacional oferece algo melhor: a thread **dorme** (fica bloqueada, sem usar CPU) e outra thread a **acorda** quando a condição muda. As duas ferramentas clássicas são o {{semáforo|semaphore}} e a {{variável de condição|condition variable}}. Com elas se resolve o {{produtor-consumidor|producer-consumer}}, o padrão por trás de toda fila de tarefas, de pool de conexões e do \`queue.Queue\` do Python.
      `),
    ],
    explicacao: [
      md(`
        ### Semáforo: um contador que faz dormir
        Proposto por Edsger Dijkstra nos anos 1960, o semáforo é um inteiro que **nunca fica negativo**, com duas operações atômicas:

        - **P** (*wait*, \`acquire\`, \`sem_wait\` no POSIX): se o contador é maior que 0, decrementa e segue; se é 0, a thread **bloqueia** até poder decrementar;
        - **V** (*signal*, \`release\`, \`sem_post\`): incrementa e, se há threads bloqueadas, acorda uma.

        As letras vêm do holandês (V de *verhogen*, aumentar). O que importa é a leitura: **o valor é quantas permissões estão disponíveis agora**. E, ao contrário do lock, o semáforo **não tem dono**: é normal uma thread fazer P e **outra** fazer V. É isso que permite usá-lo como sinal.

        O valor inicial decide o papel do semáforo:
      `),
      {
        type: 'table',
        head: ['Valor inicial', 'Papel', 'Exemplo'],
        rows: [
          ['1', '{{semáforo binário|binary semaphore}} usado como exclusão mútua (um lock sem dono)', 'só uma thread por vez grava no arquivo de log'],
          ['N', '{{semáforo contador|counting semaphore}}: até N threads ao mesmo tempo', '10 conexões com o banco; 3 caixas abertos na agência'],
          ['0', 'sinal / ordem: quem faz P espera até alguém fazer V', 'a thread da NF-e só emite depois que a thread do Pix confirma o pagamento'],
        ],
      },
      md(`
        Um detalhe que pega muita gente: o semáforo **tem memória**. Se a thread do Pix faz V **antes** de a thread da NF-e chegar ao P, o contador vira 1 e o P passa direto depois. O aviso não se perde.

        ### Variável de condição: esperar por uma condição qualquer
        O semáforo conta. Mas muitas condições não são contagens: "o saldo cobre o saque", "a fila tem um pedido de prioridade alta", "todas as 4 threads terminaram a etapa". Para isso existe a variável de condição: uma **fila de espera ligada a um lock**. A condição em si fica numa variável comum, protegida pelo lock.

        - \`cond.wait()\`: precisa ser chamado **com o lock na mão**. Ele **libera o lock e dorme**, numa operação atômica; quando a thread é acordada, \`wait\` só retorna **depois de readquirir o lock**.
        - \`cond.notify()\` (\`pthread_cond_signal\`): acorda **uma** thread que espera (o POSIX garante só "pelo menos uma"); \`cond.notify_all()\` (\`pthread_cond_broadcast\`) acorda **todas**.
        - O aviso **não tem memória**: um notify sem ninguém esperando simplesmente some.

        Lock, dados e variáveis de condição juntos formam um {{monitor|monitor}}: os métodos \`synchronized\` do Java com \`wait\`/\`notify\` são isso. Em Python, você monta um com uma classe que guarda os dados, um \`threading.Lock\` e uma ou mais \`threading.Condition\` sobre ele.

        ### As três regras da variável de condição
        **1. Espere dentro de um \`while\`, nunca de um \`if\`.** Quase todos os sistemas usam a {{semântica Mesa|Mesa semantics}} (do sistema Mesa, da Xerox PARC, descrita por Lampson e Redell em 1980): o notify é só uma **dica**. A thread acordada volta para a fila do lock e, até ela rodar, outra thread pode ter chegado antes e mudado o estado (pegado o único item, por exemplo). Além disso, o POSIX permite o {{despertar espúrio|spurious wakeup}}: \`wait\` retornar sem notify nenhum. A documentação do Python pede o mesmo laço, ou \`cond.wait_for(predicado)\`, que faz o laço por você. (Na semântica de Hoare, a thread acordada rodaria na hora, com a condição garantida; ela é mais fácil de raciocinar e quase ninguém a implementa.)

        **2. Teste e espere com o lock na mão.** Se a thread olha \`fila\` sem o lock, vê que está vazia e, antes de chamar \`wait\`, o produtor insere e faz notify, o aviso é perdido ({{aviso perdido|lost wakeup}}): o consumidor dorme com um item na fila. Por isso o Python levanta \`RuntimeError\` se você chama \`wait\` ou \`notify\` sem o lock.

        **3. Mude o estado e só depois avise, ainda com o lock.** Quem acorda vai reconferir a condição; ela precisa já estar verdadeira.

        ### Semáforo × variável de condição × lock
      `),
      {
        type: 'table',
        head: ['', 'Lock (mutex)', 'Semáforo', 'Variável de condição'],
        rows: [
          ['Pergunta que responde', '"alguém está usando?"', '"há permissão disponível?"', '"a condição que eu quero já vale?"'],
          ['Guarda estado?', 'livre ou ocupado', 'sim: o contador lembra Vs antigos', 'não: o aviso sem ninguém esperando some'],
          ['Tem dono?', 'conceitualmente sim: quem trancou destranca', 'não: P numa thread, V em outra é o uso normal', 'é usada junto de um lock, que tem dono'],
          ['Uso típico', 'proteger uma seção crítica', 'limitar a N; sinalizar ordem', 'esperar por qualquer condição sobre dados compartilhados'],
          ['No Python', '`threading.Lock`', '`threading.Semaphore`, `BoundedSemaphore`', '`threading.Condition`'],
        ],
        caption: 'Uma variável de condição sem um lock e sem uma variável de estado não serve para nada; um semáforo carrega o próprio estado.',
      },
      md(`
        ### O produtor-consumidor com buffer limitado
        Produtores colocam itens num {{buffer limitado|bounded buffer}} de capacidade N; consumidores retiram. Três regras: ninguém mexe no buffer ao mesmo tempo; o produtor espera se o buffer está cheio; o consumidor espera se está vazio. Com semáforos, a solução clássica (OSTEP, cap. 31) usa três:

        - \`vazios\`, iniciado com **N**: quantas vagas há;
        - \`cheios\`, iniciado com **0**: quantos itens prontos há;
        - \`mutex\`, iniciado com **1** (ou um lock): protege o buffer.

        O produtor faz \`P(vazios)\`, \`P(mutex)\`, insere, \`V(mutex)\`, \`V(cheios)\`. O consumidor faz o espelho: \`P(cheios)\`, \`P(mutex)\`, retira, \`V(mutex)\`, \`V(vazios)\`. A ordem dos dois P **não é detalhe**: se o produtor pegar o mutex antes de esperar a vaga, e o buffer estiver cheio, ele dorme **segurando o mutex**, e o consumidor, que é quem abriria a vaga, fica preso esperando o mutex. É um deadlock, que o exemplo a seguir mostra passo a passo.

        Com variáveis de condição, use **duas**, \`nao_cheio\` e \`nao_vazio\`, sobre o mesmo lock. Com uma só e \`notify()\`, um consumidor pode acordar outro consumidor em vez do produtor, e todos acabam dormindo (OSTEP mostra o caso em detalhe). Com uma só e \`notify_all()\` funciona, mas acorda gente à toa.
      `),
      warn(`
        \`threading.Semaphore\` **não tem teto**: um \`release()\` a mais deixa o contador acima do valor inicial, e o seu "limite de 10 conexões" vira 11 sem aviso. Se o contador nunca deve passar do inicial, use \`threading.BoundedSemaphore\`, que levanta \`ValueError\` nesse caso. E a ordem em que as threads bloqueadas acordam não é garantida pela documentação: não escreva código que dependa dela.
      `, 'Semaphore × BoundedSemaphore'),
      tip(`
        No dia a dia de Python, quase nunca você escreve o buffer na mão: \`queue.Queue(maxsize=N)\` já é um buffer limitado seguro entre threads. Por dentro ele é exatamente um monitor: um lock e três \`threading.Condition\` (\`not_empty\`, \`not_full\` e \`all_tasks_done\`). Saber montar o seu é o que permite entender, depurar e adaptar o dele.
      `, 'Na prática: queue.Queue'),
    ],
    exemplo: [
      md(`
        Um produtor P gera 3 itens e um consumidor C retira 3, com buffer de capacidade 2. O escalonador desta simulação é simples e implacável: **roda sempre o produtor enquanto ele conseguir avançar**; o consumidor só roda quando o produtor bloqueia. Começamos com \`vazios = 2\`, \`cheios = 0\`, \`mutex = 1\`.

        **Ordem certa** (\`P(vazios)\` antes de \`P(mutex)\`):
      `),
      {
        type: 'table',
        head: ['Passo', 'Thread', 'O que faz', 'vazios', 'cheios', 'mutex', 'buffer'],
        rows: [
          ['1', 'P', 'P(vazios), P(mutex), põe 1, V(mutex), V(cheios)', '1', '1', '1', '[1]'],
          ['2', 'P', 'o mesmo com o item 2', '0', '2', '1', '[1, 2]'],
          ['3', 'P', 'P(vazios) com vazios = 0: **bloqueia**, sem segurar nada', '0', '2', '1', '[1, 2]'],
          ['4', 'C', 'P(cheios), P(mutex), tira 1, V(mutex), V(vazios): o V acorda P', '1 → 0 (a vaga vai para P)', '1', '1', '[2]'],
          ['5', 'P', 'termina o P(vazios), P(mutex), põe 3, V(mutex), V(cheios)', '0', '2', '1', '[2, 3]'],
          ['6', 'C', 'tira 2 e tira 3', '2', '0', '1', '[]'],
        ],
        caption: 'No fim, os semáforos voltam aos valores iniciais: cada vaga ocupada foi devolvida, cada item produzido foi consumido.',
      },
      md(`
        **Ordem invertida** (\`P(mutex)\` antes de \`P(vazios)\`). Os passos 1 e 2 são iguais. No terceiro item:
      `),
      {
        type: 'table',
        head: ['Passo', 'Thread', 'O que faz', 'vazios', 'cheios', 'mutex', 'Estado'],
        rows: [
          ['3', 'P', 'P(mutex): pega o mutex', '0', '2', '0', 'P executando'],
          ['3', 'P', 'P(vazios) com vazios = 0: bloqueia **segurando o mutex**', '0', '2', '0', 'P bloqueado em vazios'],
          ['4', 'C', 'P(cheios): passa', '0', '1', '0', 'C executando'],
          ['4', 'C', 'P(mutex) com mutex = 0: bloqueia', '0', '1', '0', 'C bloqueado em mutex'],
          ['—', '—', 'ninguém pode avançar', '0', '1', '0', '**deadlock**'],
        ],
      },
      md(`
        As quatro condições de Coffman da lição anterior estão todas aqui, só que com um semáforo no meio, e não dois locks: **exclusão mútua** (o mutex), **posse e espera** (P segura o mutex e espera uma vaga), **não preempção** (ninguém tira o mutex de P) e **espera circular** (P espera a vaga que só C pode criar; C espera o mutex que só P pode soltar). O conserto é a regra de sempre: **segure o lock pelo menor tempo possível e nunca durma esperando outra coisa com ele na mão**. Esperar a vaga primeiro e só então pegar o mutex quebra a posse e espera.
      `),
    ],
    codigo: [
      md('Threads de verdade não rodam no Python do navegador. A simulação abaixo executa as duas "threads" como listas de instruções, com o mesmo escalonador do exemplo, e detecta o deadlock quando ninguém consegue avançar. Rode e compare as duas ordens.'),
      py(`
        def rodar(programas, sems):
            """Cada thread é uma lista de instruções (operação, argumento).
            Escalonador: executa uma instrução da PRIMEIRA thread (na ordem do dict)
            que consegue avançar; depois recomeça a busca do início."""
            pc = {nome: 0 for nome in programas}       # próxima instrução de cada thread
            buffer = []
            while True:
                avancou = False
                for nome, prog in programas.items():
                    if pc[nome] == len(prog):
                        continue                       # esta thread já terminou
                    op, arg = prog[pc[nome]]
                    if op == "P":
                        if sems[arg] == 0:
                            continue                   # bloqueada: tenta a próxima thread
                        sems[arg] -= 1
                    elif op == "V":
                        sems[arg] += 1
                    elif op == "põe":
                        buffer.append(arg)
                        print(f"  {nome} põe {arg}   buffer={buffer}")
                    elif op == "tira":
                        print(f"  {nome} tira {buffer.pop(0)}  buffer={buffer}")
                    pc[nome] += 1
                    avancou = True
                    break
                if not avancou:
                    break
            presas = [f"{n} espera {p[pc[n]][1]}" for n, p in programas.items() if pc[n] < len(p)]
            print("  resultado:", ("DEADLOCK: " + "; ".join(presas)) if presas else "todas terminaram", sems)

        def produtor(itens, mutex_antes):
            prog = []
            for item in itens:
                if mutex_antes:     # ordem ERRADA: pega o mutex e só depois espera vaga
                    prog += [("P", "mutex"), ("P", "vazios")]
                else:               # ordem certa: espera vaga e só depois pega o mutex
                    prog += [("P", "vazios"), ("P", "mutex")]
                prog += [("põe", item), ("V", "mutex"), ("V", "cheios")]
            return prog

        consumidor = [("P", "cheios"), ("P", "mutex"), ("tira", None), ("V", "mutex"), ("V", "vazios")] * 3

        for errado in (False, True):
            print("mutex antes de vazios:" if errado else "vazios antes do mutex:")
            rodar({"produtor": produtor([1, 2, 3], errado), "consumidor": consumidor},
                  {"vazios": 2, "cheios": 0, "mutex": 1})
      `, { caption: 'Troque a capacidade (o valor inicial de vazios) para 3: a ordem errada ainda trava? Por quê?' }),
      md('Agora o código real, para rodar no seu computador: o mesmo buffer limitado como monitor, com um lock e duas variáveis de condição.'),
      code('python', `
        import threading
        from collections import deque

        class BufferLimitado:
            def __init__(self, capacidade):
                self.itens = deque()
                self.capacidade = capacidade
                self.lock = threading.Lock()
                self.nao_cheio = threading.Condition(self.lock)   # as duas condições usam o MESMO lock
                self.nao_vazio = threading.Condition(self.lock)

            def por(self, item):
                with self.lock:
                    while len(self.itens) == self.capacidade:     # while, nunca if
                        self.nao_cheio.wait()                      # libera o lock e dorme
                    self.itens.append(item)                        # muda o estado...
                    self.nao_vazio.notify()                        # ...e só depois avisa

            def tirar(self):
                with self.lock:
                    while not self.itens:
                        self.nao_vazio.wait()
                    item = self.itens.popleft()
                    self.nao_cheio.notify()
                    return item

        buf = BufferLimitado(2)
        def produtor():
            for n in range(1, 6):
                buf.por(f"NF-e {n}")
            buf.por(None)                       # sentinela: "acabou"

        def consumidor():
            while (nota := buf.tirar()) is not None:
                print("enviando à Sefaz:", nota)

        ts = [threading.Thread(target=produtor), threading.Thread(target=consumidor)]
        for th in ts: th.start()
        for th in ts: th.join()
      `, 'Rode no seu computador. Troque os while por if e acrescente um segundo consumidor: o erro pode demorar a aparecer, e é justamente isso que o torna perigoso.'),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e8-sem-0',
          kind: 'mcq',
          prompt: 'Uma agência tem 3 caixas, controlados por um semáforo iniciado com 3. Chegam 5 clientes (threads) ao mesmo tempo e cada um faz `acquire()` antes de ser atendido e `release()` ao sair. Enquanto nenhum atendimento termina, quantos clientes ficam bloqueados?',
          difficulty: 'facil',
          skills: ['so-concorrencia'],
          hints: [
            'O que o valor de um semáforo representa?',
            'Acompanhe o contador a cada acquire: 3, 2, ... O que acontece quando ele chega a 0?',
          ],
          explanation: 'Os três primeiros acquire levam o contador de 3 a 0 e passam; os outros dois encontram 0 e bloqueiam. Cada release, ao fim de um atendimento, deixa um dos bloqueados passar. É o semáforo contador limitando o acesso a N recursos, como um pool com 3 conexões.',
          options: [
            { text: '2', correct: true, feedback: 'Isso: o contador vai de 3 a 0 com os três primeiros; os outros dois esperam um release.' },
            { text: '3', feedback: '3 é quantos passam, não quantos esperam: o valor inicial é o número de permissões disponíveis.' },
            { text: '0', feedback: 'Se ninguém bloqueasse, o semáforo não estaria limitando nada. O acquire com contador 0 bloqueia.' },
            { text: '4', feedback: 'Parece que você tratou o semáforo como um lock (só um passa). Um semáforo iniciado com 3 deixa passar três.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e8-sem-1',
          kind: 'mcq',
          prompt: 'Um sistema tem dois consumidores e um produtor que faz `fila.append(p)` seguido de `cond.notify()`, com o lock na mão. Os consumidores usam o código abaixo, e de vez em quando um deles quebra com `IndexError: pop from an empty deque`. Qual é a causa?',
          code: {
            lang: 'python',
            code: dedent(`
              with cond:
                  if not fila:
                      cond.wait()
                  pedido = fila.popleft()
            `),
          },
          difficulty: 'intermediario',
          skills: ['so-concorrencia'],
          hints: [
            'Quando wait() retorna, quem garante que a fila ainda tem o item que motivou o aviso?',
            'Entre o notify e o momento em que o consumidor acordado consegue o lock de volta, outra thread pode rodar?',
            'O que muda se a mesma condição for testada de novo depois de acordar?',
          ],
          explanation: 'Com a semântica Mesa, notify só tira a thread da fila de espera; ela ainda precisa readquirir o lock. Nesse intervalo, o outro consumidor (que nem estava dormindo) pode pegar o lock e o item. O acordado volta do wait, não reconfere nada e chama popleft numa fila vazia. Wait também pode retornar sem aviso (despertar espúrio). O conserto é trocar o if por while, ou usar cond.wait_for(lambda: fila).',
          options: [
            { text: 'Entre o aviso e a volta do wait, outro consumidor pode pegar o item; com if, ninguém reconfere a fila', correct: true, feedback: 'Isso: notify é uma dica (semântica Mesa), e wait pode até voltar sem aviso. A condição precisa ser reconferida num while.' },
            { text: 'wait() não libera o lock, então o produtor não consegue inserir', feedback: 'wait libera o lock enquanto dorme e o readquire antes de voltar. Se não liberasse, o sintoma seria travar para sempre, não IndexError.' },
            { text: 'O deque não é seguro entre threads', feedback: 'append e popleft do deque são seguros entre threads, e aqui todo acesso já acontece com o lock. O problema é lógico: a condição não é reconferida.' },
            { text: 'O produtor deveria chamar notify() antes do append()', feedback: 'Com o lock na mão, a ordem não muda nada para quem acorda: ele só roda depois que o produtor solta o lock. E o costume é o contrário: mudar o estado e depois avisar.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e8-sem-2',
          kind: 'predict',
          lang: 'python',
          prompt: 'O `acquire(blocking=False)` não bloqueia: devolve True se conseguiu a permissão e False se o contador estava em 0. O que este programa imprime?',
          code: dedent(`
            import threading

            s = threading.Semaphore(2)
            print(s.acquire(blocking=False))
            print(s.acquire(blocking=False))
            print(s.acquire(blocking=False))
            s.release()
            s.release()
            s.release()
            print(s.acquire(blocking=False), s.acquire(blocking=False), s.acquire(blocking=False), s.acquire(blocking=False))

            b = threading.BoundedSemaphore(1)
            try:
                b.release()
            except ValueError:
                print("ValueError")
          `),
          answer: 'True\nTrue\nFalse\nTrue True True False\nValueError',
          difficulty: 'intermediario',
          skills: ['so-concorrencia'],
          hints: [
            'Anote o valor do contador depois de cada linha.',
            'Depois de três release seguidos, o contador volta a 2 ou passa disso? Existe um teto no Semaphore comum?',
            'Qual é a diferença entre Semaphore e BoundedSemaphore quando o release passa do valor inicial?',
          ],
          explanation: 'O contador vai 2 → 1 → 0, e o terceiro acquire falha. Os três release levam o contador a 3, acima do valor inicial: o Semaphore comum não tem teto e lembra cada release. Por isso, depois, três acquire passam e o quarto falha. O BoundedSemaphore(1) já está em 1; um release a mais passaria do inicial, e ele levanta ValueError. É a proteção contra o release duplicado que transforma um limite de N em N + 1.',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e8-sem-3',
          kind: 'fill',
          lang: 'python',
          prompt: 'Complete o buffer limitado com semáforos: `vazios` conta as vagas e `cheios` conta os itens prontos.',
          template: dedent(`
            import threading
            from collections import deque

            CAP = 5
            buffer = deque()
            mutex = threading.Lock()
            vazios = threading.Semaphore(___)   # vagas livres no começo
            cheios = threading.Semaphore(___)   # itens prontos no começo

            def produtor(item):
                ___.acquire()                   # espera uma vaga
                with mutex:
                    buffer.append(item)
                ___.release()                   # avisa: um item a mais

            def consumidor():
                ___.acquire()                   # espera um item
                with mutex:
                    item = buffer.popleft()
                ___.release()                   # avisa: uma vaga a mais
                return item
          `),
          blanks: [['CAP', '5'], ['0'], ['vazios'], ['cheios'], ['cheios'], ['vazios']],
          difficulty: 'facil',
          skills: ['so-concorrencia'],
          hints: [
            'No começo, o buffer está vazio. Quantas vagas e quantos itens existem?',
            'O produtor consome o quê e gera o quê? E o consumidor?',
            'Cada thread espera (acquire) pelo recurso de que precisa e avisa (release) sobre o recurso que acabou de criar.',
          ],
          explanation: 'No início há CAP vagas e 0 itens. O produtor gasta uma vaga (vazios.acquire) e cria um item (cheios.release); o consumidor faz o espelho, gasta um item e cria uma vaga. Repare que o acquire do semáforo vem antes do mutex: esperar a vaga com o mutex na mão é o deadlock do exemplo.',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e8-sem-4',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Implemente um semáforo de simulação (sem threads de verdade): a "thread" é só um nome.

            - \`Semaforo(valor)\`: guarda \`self.valor\` e \`self.fila\` (lista de nomes à espera, na ordem de chegada). Se \`valor\` for negativo, levante \`ValueError\`.
            - \`p(thread)\`: se \`valor > 0\`, decrementa e devolve \`True\` (passou). Senão, põe \`thread\` no fim da fila e devolve \`False\` (bloqueou).
            - \`v()\`: se há alguém na fila, tira o **primeiro** e devolve o nome dele. É uma **entrega direta**: a permissão vai para quem acordou, então \`valor\` não muda. Se a fila está vazia, incrementa \`valor\` e devolve \`None\`.
          `),
          difficulty: 'intermediario',
          skills: ['so-concorrencia', 'ed-pilhas-filas'],
          hints: [
            'Quais são os dois estados que o semáforo precisa guardar? Onde eles devem ser criados para que dois semáforos não dividam a mesma fila?',
            'Em p, há dois caminhos. Em qual deles o valor muda?',
            'Em v, se alguém estava esperando, por que o valor não deve subir? Pense em quem ficaria com a permissão.',
            'Quem chegou primeiro à fila deve acordar primeiro. Que extremidade da lista você tira?',
          ],
          explanation: 'O valor nunca fica negativo: quando não há permissão, quem chega vai para a fila. No V, se há alguém esperando, a permissão é entregue direto a ele; incrementar o valor e também acordar alguém criaria uma permissão a mais, e uma terceira thread poderia passar junto. Sem ninguém esperando, o V fica guardado no contador: é a memória que a variável de condição não tem. (No threading.Semaphore real, a ordem de quem acorda não é garantida; aqui usamos FIFO para a simulação ser previsível.)',
          starter: dedent(`
            class Semaforo:
                def __init__(self, valor):
                    # guarde o valor e a fila de espera; valor negativo -> ValueError
                    pass

                def p(self, thread):
                    # True se passou; False se bloqueou (entra no fim da fila)
                    pass

                def v(self):
                    # acorda o primeiro da fila (devolve o nome) ou incrementa o valor (devolve None)
                    pass
          `),
          solution: dedent(`
            class Semaforo:
                def __init__(self, valor):
                    if valor < 0:
                        raise ValueError("o valor inicial de um semáforo não pode ser negativo")
                    self.valor = valor
                    self.fila = []

                def p(self, thread):
                    if self.valor > 0:
                        self.valor -= 1
                        return True
                    self.fila.append(thread)
                    return False

                def v(self):
                    if self.fila:
                        return self.fila.pop(0)
                    self.valor += 1
                    return None
          `),
          tests: [
            {
              name: 'contador limita quantos passam',
              code: dedent(`
                s = Semaforo(2)
                r = [s.p("A"), s.p("B"), s.p("C")]
                assert r == [True, True, False], f"com valor 2, os dois primeiros passam e o terceiro bloqueia; veio {r!r}"
                assert s.valor == 0, f"depois de duas passagens, o valor deve ser 0 (nunca negativo); veio {s.valor!r}"
                assert s.fila == ["C"], f"quem bloqueou vai para a fila; veio {s.fila!r}"
              `),
            },
            {
              name: 'v acorda em ordem de chegada, com entrega direta',
              code: dedent(`
                s = Semaforo(0)
                for nome in ["A", "B", "C"]:
                    assert s.p(nome) is False, "com valor 0, p deve bloquear"
                r = s.v()
                assert r == "A", f"o primeiro a chegar deve ser o primeiro a acordar; v() devolveu {r!r}"
                assert s.valor == 0, f"havia alguém esperando: a permissão vai direto para A, e o valor continua 0; veio {s.valor!r}"
                assert s.fila == ["B", "C"], f"A sai da fila; sobram B e C; veio {s.fila!r}"
                assert s.v() == "B" and s.v() == "C", "depois de A, acordam B e C, nessa ordem"
                r = s.v()
                assert r is None and s.valor == 1, f"sem ninguém na fila, v incrementa o valor e devolve None; veio {r!r} com valor {s.valor!r}"
                assert s.p("D") is True and s.valor == 0, "a permissão guardada deixa D passar e o valor volta a 0"
              `),
            },
            {
              name: 'o semáforo lembra os V antigos',
              code: dedent(`
                s = Semaforo(0)
                assert s.v() is None and s.v() is None, "sem fila, v devolve None"
                assert s.valor == 2, f"dois V sem ninguém esperando deixam o valor em 2; veio {s.valor!r}"
                r = [s.p("x"), s.p("y"), s.p("z")]
                assert r == [True, True, False], f"as duas permissões guardadas deixam passar duas threads; veio {r!r}"
              `),
            },
            {
              name: 'valor inicial inválido e semáforos independentes',
              code: dedent(`
                try:
                    Semaforo(-1)
                except ValueError:
                    pass
                else:
                    raise AssertionError("Semaforo(-1) deveria levantar ValueError")
                a, b = Semaforo(0), Semaforo(0)
                a.p("T1")
                assert b.fila == [], f"cada semáforo precisa da própria fila; a fila de b recebeu {b.fila!r}. A lista foi criada fora do __init__?"
                assert b.v() is None and b.valor == 1, "b não tinha ninguém esperando"
                assert a.fila == ["T1"] and a.valor == 0, "mexer em b não pode mudar a"
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
          id: 'e8-sem-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Escreva o escalonador de uma máquina com semáforos. \`executar(threads, iniciais)\` recebe:

            - \`threads\`: dict nome → lista de instruções, cada uma \`("P", sem)\`, \`("V", sem)\` ou \`("log", texto)\`;
            - \`iniciais\`: dict semáforo → valor inicial (não o modifique).

            Regras:

            1. Há uma fila de **prontas**, que começa com todas as threads na ordem do dict. O escalonador tira a primeira pronta e a executa **até ela terminar ou bloquear** (sem preempção); depois tira a próxima. Acaba quando não houver prontas.
            2. \`("log", texto)\` acrescenta \`"nome: texto"\` à lista de log.
            3. \`("P", s)\`: se o valor de \`s\` é maior que 0, decrementa e segue. Senão, a thread entra no fim da fila de espera de \`s\` e para. Quando acordar, continua **depois** do P.
            4. \`("V", s)\`: se há alguém esperando em \`s\`, o primeiro sai da espera e vai para o **fim das prontas** (entrega direta: o valor não muda). Senão, incrementa o valor. Em qualquer caso, a thread que fez o V continua rodando.

            Devolva \`(log, presas)\`, em que \`presas\` é um dict nome → semáforo de cada thread que terminou bloqueada (vazio se todas terminaram). Se \`presas\` não estiver vazio, houve deadlock.
          `),
          difficulty: 'desafio',
          skills: ['so-concorrencia', 'ed-pilhas-filas'],
          hints: [
            'Que estado o escalonador precisa guardar de cada thread para retomá-la mais tarde do ponto certo?',
            'Quais filas existem? Uma para as prontas e quantas para as que esperam?',
            'Quando uma thread bloqueia num P, em que instrução ela deve continuar ao acordar? Quando você avança o contador de instruções dela?',
            'Um V que acorda alguém e também incrementa o valor dá uma permissão a mais. Que teste mostraria isso?',
            'No fim, quem está presa? Você precisa lembrar em que semáforo cada uma parou, e esquecer isso quando ela acorda.',
          ],
          explanation: 'É o que um núcleo de sistema operacional faz com semáforos: cada thread tem um contador de instruções; P sem permissão tira a thread das prontas e a põe na fila do semáforo; V move uma thread de volta para as prontas. Avançar o contador antes de bloquear faz a thread acordar já depois do P, porque a permissão foi entregue a ela. Com o produtor-consumidor na ordem invertida, o resultado mostra exatamente o ciclo do exemplo: o produtor preso em vazios e o consumidor preso em mutex.',
          starter: dedent(`
            def executar(threads, iniciais):
                # threads: dict nome -> lista de ("P", s) / ("V", s) / ("log", texto)
                # iniciais: dict semáforo -> valor inicial
                # devolva (log, presas)
                pass
          `),
          solution: dedent(`
            from collections import deque

            def executar(threads, iniciais):
                valor = dict(iniciais)
                espera = {s: deque() for s in iniciais}
                pc = {nome: 0 for nome in threads}
                prontas = deque(threads)
                presas = {}
                log = []
                while prontas:
                    nome = prontas.popleft()
                    prog = threads[nome]
                    while pc[nome] < len(prog):
                        op, arg = prog[pc[nome]]
                        pc[nome] += 1
                        if op == "log":
                            log.append(f"{nome}: {arg}")
                        elif op == "P":
                            if valor[arg] > 0:
                                valor[arg] -= 1
                            else:
                                espera[arg].append(nome)
                                presas[nome] = arg
                                break
                        elif op == "V":
                            if espera[arg]:
                                acordada = espera[arg].popleft()
                                del presas[acordada]
                                prontas.append(acordada)
                            else:
                                valor[arg] += 1
                return log, presas
          `),
          tests: [
            {
              name: 'semáforo em 0 impõe ordem',
              code: dedent(`
                th = {"nfe": [("P", "pago"), ("log", "emite NF-e")],
                      "pix": [("log", "confirma Pix"), ("V", "pago")]}
                r = executar(th, {"pago": 0})
                assert r == (["pix: confirma Pix", "nfe: emite NF-e"], {}), f"a NF-e começa primeiro, mas bloqueia até o Pix fazer V; veio {r!r}"
                r = executar({"pix": [("V", "pago")], "nfe": [("P", "pago"), ("log", "emite")]}, {"pago": 0})
                assert r == (["nfe: emite"], {}), f"V antes do P fica guardado no contador; veio {r!r}"
              `),
            },
            {
              name: 'produtor-consumidor na ordem certa',
              code: dedent(`
                def _prod(itens, errado):
                    prog = []
                    for i in itens:
                        prog += [("P", "mutex"), ("P", "vazios")] if errado else [("P", "vazios"), ("P", "mutex")]
                        prog += [("log", f"põe {i}"), ("V", "mutex"), ("V", "cheios")]
                    return prog
                _cons = [("P", "cheios"), ("P", "mutex"), ("log", "tira"), ("V", "mutex"), ("V", "vazios")] * 3
                ini = {"vazios": 2, "cheios": 0, "mutex": 1}
                log, presas = executar({"prod": _prod([1, 2, 3], False), "cons": _cons}, ini)
                esperado = ["prod: põe 1", "prod: põe 2", "cons: tira", "cons: tira", "prod: põe 3", "cons: tira"]
                assert presas == {}, f"na ordem certa ninguém fica preso; presas = {presas!r}"
                assert log == esperado, f"log esperado {esperado!r}, veio {log!r}. Lembre: quem faz V continua rodando, e quem acorda vai para o fim das prontas"
                assert ini == {"vazios": 2, "cheios": 0, "mutex": 1}, "não modifique o dict de valores iniciais"
              `),
            },
            {
              name: 'ordem invertida: deadlock',
              code: dedent(`
                def _prod(itens):
                    prog = []
                    for i in itens:
                        prog += [("P", "mutex"), ("P", "vazios"), ("log", f"põe {i}"), ("V", "mutex"), ("V", "cheios")]
                    return prog
                _cons = [("P", "cheios"), ("P", "mutex"), ("log", "tira"), ("V", "mutex"), ("V", "vazios")] * 3
                ini = {"vazios": 2, "cheios": 0, "mutex": 1}
                log, presas = executar({"prod": _prod([1, 2, 3]), "cons": _cons}, ini)
                assert ini == {"vazios": 2, "cheios": 0, "mutex": 1}, f"não modifique o dict de valores iniciais (copie-o antes de mexer); ele virou {ini!r}"
                assert log == ["prod: põe 1", "prod: põe 2"], f"o produtor põe dois itens e trava no terceiro; veio {log!r}"
                assert presas == {"prod": "vazios", "cons": "mutex"}, f"o produtor fica preso em vazios (segurando o mutex) e o consumidor em mutex; veio {presas!r}"
              `),
            },
            {
              name: 'entrega direta: V com alguém esperando não incrementa',
              code: dedent(`
                th = {"A": [("P", "s"), ("log", "passou")],
                      "B": [("V", "s"), ("P", "s"), ("log", "passou")]}
                log, presas = executar(th, {"s": 0})
                assert log == ["A: passou"], f"o V de B entrega a permissão a A; o P seguinte de B não tem permissão; veio {log!r}"
                assert presas == {"B": "s"}, f"B termina preso em s: se ele passou, o V criou uma permissão a mais; veio {presas!r}"
              `),
            },
            {
              name: 'quem espera acorda em ordem de chegada',
              code: dedent(`
                th = {"c1": [("P", "s"), ("log", "1")], "c2": [("P", "s"), ("log", "2")], "c3": [("P", "s"), ("log", "3")],
                      "v": [("V", "s"), ("V", "s"), ("log", "fim do v")]}
                log, presas = executar(th, {"s": 0})
                assert log == ["v: fim do v", "c1: 1", "c2: 2"], f"o v roda até o fim (sem preempção) e acorda c1 e c2, nessa ordem; veio {log!r}"
                assert presas == {"c3": "s"}, f"só houve dois V: c3 continua preso; veio {presas!r}"
              `),
            },
            {
              name: 'casos simples',
              code: dedent(`
                assert executar({}, {"s": 1}) == ([], {}), "sem threads, nada acontece"
                r = executar({"t": [("log", "a"), ("log", "b")]}, {})
                assert r == (["t: a", "t: b"], {}), f"uma thread só com logs; veio {r!r}"
                r = executar({"t": [("P", "m"), ("log", "dentro"), ("V", "m"), ("P", "m"), ("log", "de novo")]}, {"m": 1})
                assert r == (["t: dentro", "t: de novo"], {}), f"P, V e P de novo na mesma thread; veio {r!r}"
                r = executar({"t": [("P", "m"), ("P", "m")]}, {"m": 1})
                assert r == ([], {"t": "m"}), f"uma thread que pede duas vezes um semáforo de valor 1 trava sozinha; veio {r!r}"
              `),
            },
          ],
        },
      },
    ],
    revisao: [
      md(`
        - Lock dá exclusão mútua; esperar até algo acontecer exige outra ferramenta. Espera ativa gasta CPU à toa.
        - Semáforo: contador nunca negativo. P espera e decrementa; V incrementa e acorda. Começa em 1 (exclusão), em N (limite) ou em 0 (ordem). Tem memória e não tem dono.
        - \`threading.Semaphore\` não tem teto; \`BoundedSemaphore\` levanta ValueError num release a mais.
        - Variável de condição: wait libera o lock e dorme, e readquire antes de voltar; notify acorda um, notify_all acorda todos; sem memória.
        - Regras: teste e espere com o lock; espere num while (semântica Mesa, despertar espúrio); mude o estado e depois avise.
        - Buffer limitado: vazios = N, cheios = 0, mutex = 1. Espere o semáforo antes de pegar o mutex; o contrário fecha um ciclo de espera (deadlock).
        - Na prática, em Python: \`queue.Queue(maxsize=N)\`, que é um monitor com três Conditions.
      `),
      english(`
        - **semaphore, P / V, wait / post, acquire / release**: semáforo e suas operações
        - **counting / binary semaphore**: semáforo contador / binário
        - **condition variable, wait / signal / broadcast**: variável de condição; notify e notify_all no Python
        - **busy waiting, spurious wakeup, lost wakeup**: espera ativa, despertar espúrio, aviso perdido
        - **bounded buffer, producer-consumer**: buffer limitado, produtor-consumidor
        - **monitor, Mesa semantics**: monitor, semântica Mesa

        Frase típica de entrevista: *"I always wait on a condition variable inside a while loop, because with Mesa semantics a signal is only a hint: by the time the thread reacquires the lock, the condition may no longer hold."*

        Frase típica de documentação (Python, threading.Condition): *"The while loop checking for the application's condition is necessary because wait() can return after an arbitrary long time, and the condition which prompted the notify() call may no longer hold true."*
      `),
    ],
  },
  review: [
    ['Que três papéis um semáforo assume conforme o valor inicial (1, N, 0)?', 'Com 1, exclusão mútua; com N, limita a N threads ao mesmo tempo (pool de recursos); com 0, sinal de ordem: quem faz P espera alguém fazer V.'],
    ['O que wait() de uma variável de condição faz com o lock?', 'Libera o lock e dorme numa operação atômica; ao ser acordada, a thread readquire o lock antes de wait() retornar.'],
    ['Por que se espera numa variável de condição dentro de um while e não de um if?', 'Porque notify é só uma dica (semântica Mesa): outra thread pode mudar o estado antes de a acordada readquirir o lock, e wait pode voltar sem aviso (despertar espúrio).'],
    ['Diferença de memória entre semáforo e variável de condição?', 'O semáforo guarda os V no contador; um notify sem ninguém esperando se perde.'],
    ['Quais são os três semáforos do buffer limitado e seus valores iniciais?', 'vazios = N (vagas), cheios = 0 (itens prontos), mutex = 1 (protege o buffer).'],
    ['O que acontece se o produtor fizer P(mutex) antes de P(vazios) com o buffer cheio?', 'Dorme segurando o mutex; o consumidor, que abriria a vaga, bloqueia no mutex: deadlock por espera circular.'],
    ['Por que preferir BoundedSemaphore a Semaphore para limitar conexões?', 'Porque Semaphore aceita release acima do valor inicial e o limite cresce sem aviso; BoundedSemaphore levanta ValueError.'],
  ],
  references: ['ostep', 'tanenbaum-so', 'python-docs', 'linux-man'],
});

/* ------------------------------------------------------------------ */
/* async/await × threads × processos                                   */
/* ------------------------------------------------------------------ */

const modelos = lesson({
  id: 'l8-async-threads-processos',
  moduleId: 'm8-3',
  title: 'async/await, threads ou processos: escolhendo o modelo de concorrência',
  titleEn: 'async/await vs threads vs processes: choosing a concurrency model',
  summary: 'Concorrência não é paralelismo. Como corrotinas e o laço de eventos trocam de tarefa só nos await, por que threads no CPython não aceleram cálculo, quando pagar o preço de processos, e as corridas que continuam existindo mesmo numa thread só.',
  minutes: 50,
  objectives: [
    'Diferenciar concorrência de paralelismo e classificar uma tarefa como limitada por E/S ou por CPU',
    'Explicar como um laço de eventos executa corrotinas, usando geradores como modelo de "pausar e retomar"',
    'Prever o efeito de uma chamada bloqueante dentro de uma corrotina e saber como tirá-la do laço',
    'Explicar o que o GIL impede e o que não impede, e quando processos compensam o custo de criação e serialização',
    'Identificar condições de corrida entre await e corrigi-las',
    'Escolher entre asyncio, threads e processos para um problema concreto e estimar o ganho com a lei de Amdahl',
  ],
  skills: ['so-concorrencia', 'so-processos'],
  terms: [
    t('paralelismo', 'parallelism', 'Executar várias coisas literalmente ao mesmo tempo, em núcleos diferentes.', 'Concurrency is about dealing with lots of things at once. Parallelism is about doing lots of things at once.'),
    t('limitado por E/S', 'I/O-bound', 'Tarefa que passa a maior parte do tempo esperando rede, disco ou banco de dados.'),
    t('limitado por CPU', 'CPU-bound', 'Tarefa que passa a maior parte do tempo calculando; só acelera com mais núcleos trabalhando.'),
    t('corrotina', 'coroutine', 'Função que pode pausar no meio e ser retomada depois do mesmo ponto; no Python, definida com async def.', "RuntimeWarning: coroutine 'buscar' was never awaited"),
    t('laço de eventos', 'event loop', 'Laço que, numa thread só, escolhe a próxima tarefa pronta, roda até ela pausar e espera eventos de E/S.'),
    t('multitarefa cooperativa', 'cooperative multitasking', 'A tarefa só cede a vez quando quer (no await); ninguém a interrompe à força.'),
    t('gerador', 'generator', 'Função com yield: cada next() roda até o próximo yield e pausa ali, guardando o estado.'),
    t('chamada bloqueante', 'blocking call', 'Chamada que segura a thread parada até terminar, como time.sleep ou uma requisição síncrona.'),
    t('trava global do interpretador', 'Global Interpreter Lock (GIL)', 'Lock do CPython que deixa só uma thread executar bytecode Python por vez.'),
    t('serialização', 'serialization / pickling', 'Converter objetos em bytes para mandá-los a outro processo; no Python, feita pelo pickle.'),
    t('lei de Amdahl', "Amdahl's law", 'O ganho máximo de paralelizar é limitado pela parte que continua sequencial: S = 1 / ((1 − p) + p/n).'),
  ],
  stages: {
    conceito: [
      md(`
        Um garçom atende dez mesas: anota um pedido, leva à cozinha e, enquanto o prato fica pronto, vai à próxima mesa. Ele lida com muitas coisas ao mesmo tempo, sem fazer duas ao mesmo tempo. Isso é **concorrência**. Dez cozinheiros fritando dez pastéis em dez fogões é {{paralelismo|parallelism}}.

        Em Python você tem três jeitos de ter várias tarefas em andamento, e cada um paga um preço diferente:

        - **async/await** (\`asyncio\`): uma thread só, com muitas {{corrotinas|coroutines}} que se revezam **nos await**. É o garçom.
        - **Threads**: o sistema operacional troca de thread quando quer. No CPython com o GIL, só uma executa Python por vez.
        - **Processos**: cada um com seu interpretador e sua memória. É o único dos três que põe vários núcleos para **calcular Python puro** ao mesmo tempo no CPython padrão.

        A pergunta que decide tudo é: o programa passa o tempo **esperando** ({{limitado por E/S|I/O-bound}}) ou **calculando** ({{limitado por CPU|CPU-bound}})?
      `),
    ],
    explicacao: [
      md(`
        ### Pausar e retomar: geradores
        Uma função comum roda do começo ao fim. Um {{gerador|generator}}, que é uma função com \`yield\`, **pausa** no yield e guarda variáveis locais e posição; \`next(g)\` a retoma do ponto exato até o próximo yield. Quando a função acaba, \`next\` levanta \`StopIteration\`.

        \`\`\`
        def tarefa():
            print("parte 1")
            yield            # pausa aqui
            print("parte 2")

        g = tarefa()         # nada roda ainda
        next(g)              # imprime "parte 1" e pausa no yield
        next(g)              # imprime "parte 2" e levanta StopIteration
        \`\`\`

        As corrotinas do Python nasceram desse mecanismo (geradores com \`send\`, depois \`yield from\`, até ganharem a sintaxe \`async\`/\`await\` no Python 3.5, PEP 492). Hoje são um tipo próprio, mas a ideia é a mesma: **\`await\` é um ponto onde a corrotina pode pausar e devolver o controle a quem a está executando**.

        ### O laço de eventos
        Quem executa as corrotinas é o {{laço de eventos|event loop}}, numa thread só:

        1. pega uma tarefa pronta e a roda até ela chegar a um \`await\` de algo que ainda não terminou (resposta da rede, um temporizador);
        2. guarda a tarefa como "esperando aquele evento" e pega a próxima pronta;
        3. sem tarefas prontas, pergunta ao sistema operacional quais eventos aconteceram (no Linux via \`epoll\`, no macOS via \`kqueue\`, pelo módulo \`selectors\`; no Windows, o laço padrão usa IOCP) e marca as tarefas correspondentes como prontas.

        É {{multitarefa cooperativa|cooperative multitasking}}: a tarefa só sai da CPU quando chega a um await. Daí as duas consequências mais importantes deste modelo:

        - **Uma chamada bloqueante congela tudo.** \`time.sleep(2)\`, \`requests.get(...)\` ou um laço de cálculo de 2 segundos dentro de uma corrotina param o laço inteiro: nenhuma outra tarefa roda, nenhum outro cliente é atendido. Para esperar, use a versão assíncrona (\`await asyncio.sleep(2)\`, um cliente HTTP assíncrono); para uma chamada bloqueante que você não pode trocar, \`await asyncio.to_thread(f, x)\` (Python 3.9+) a roda numa thread à parte; para cálculo pesado, mande-o a um processo com \`loop.run_in_executor\` e um \`ProcessPoolExecutor\`.
        - **Chamar uma corrotina não a executa.** \`buscar_cep("01001-000")\` sem await só cria o objeto corrotina; nada acontece, e o Python avisa *"RuntimeWarning: coroutine 'buscar_cep' was never awaited"*. Para rodar várias ao mesmo tempo, use \`asyncio.gather(...)\`, \`asyncio.create_task(...)\` ou, desde o 3.11, \`asyncio.TaskGroup\`.

        ### Threads e o GIL
        Threads são escalonadas pelo sistema operacional, com preempção: a troca pode acontecer **entre quaisquer duas instruções**. No CPython, a {{trava global do interpretador|Global Interpreter Lock (GIL)}} deixa só uma thread executar bytecode Python por vez. A thread que está rodando é convidada a soltar o GIL a cada 5 ms (\`sys.getswitchinterval()\`) e o solta sempre que faz uma {{chamada bloqueante|blocking call}} de E/S. Daí:

        - para **E/S**, threads funcionam bem: enquanto uma espera a rede, sem o GIL, outra roda;
        - para **cálculo em Python puro**, 4 threads levam o mesmo tempo que uma, ou mais;
        - extensões em C podem soltar o GIL enquanto calculam: o \`hashlib\` faz isso para dados maiores que 2047 bytes, e o NumPy em boa parte das operações;
        - **o GIL não deixa o seu código seguro**: ele protege o interpretador, não a sua lógica. O \`contador += 1\` da lição anterior continua sendo ler, somar e escrever, e a troca de thread pode cair no meio.

        O Python 3.13 trouxe uma versão experimental sem GIL (*free-threaded*, PEP 703), e no 3.14 ela passou a ser oficialmente suportada (PEP 779), mas continua sendo uma versão separada, não a padrão. Nela, threads calculam em paralelo, e os locks passam a importar ainda mais.

        ### Processos
        Cada processo tem o próprio interpretador, o próprio GIL e a própria memória: com \`ProcessPoolExecutor\`, 4 processos em 4 núcleos fazem cálculo puro cerca de 4 vezes mais rápido. O preço:

        - **criar** um processo custa muito mais que uma thread, e cada um carrega um interpretador inteiro na memória;
        - nada é compartilhado de graça: argumentos e resultados viajam por {{serialização|serialization / pickling}} (pickle), e mandar 500 MB para um processo filho pode custar mais que o cálculo;
        - com os métodos de início *spawn* (padrão no Windows e no macOS) e *forkserver* (padrão no Linux desde o 3.14), o filho reimporta o seu módulo principal, então o código que cria os processos precisa ficar dentro de \`if __name__ == "__main__":\`.

        ### Lado a lado
      `),
      {
        type: 'table',
        head: ['', 'asyncio (corrotinas)', 'Threads', 'Processos'],
        rows: [
          ['Quem decide a troca', 'a própria tarefa, no await (cooperativa)', 'o SO, a qualquer momento (preemptiva)', 'o SO, a qualquer momento (preemptiva)'],
          ['Memória', 'compartilhada, numa thread só', 'compartilhada entre as threads', 'isolada: cada processo tem a sua'],
          ['Cálculo Python em paralelo (CPython com GIL)', 'não', 'não', 'sim'],
          ['Custo de cada unidade', 'muito baixo: dezenas de milhares de tarefas são comuns', 'médio: cada thread tem a sua pilha e é escalonada pelo SO', 'alto: um interpretador inteiro por processo'],
          ['Onde pode haver corrida', 'só nos pontos de await', 'entre quaisquer duas instruções', 'só no que é externo: arquivos, banco, memória compartilhada explícita'],
          ['Ponto fraco', 'uma chamada bloqueante trava todas as tarefas; precisa de bibliotecas assíncronas', 'locks e corridas; GIL para cálculo', 'criação e serialização caras'],
        ],
      },
      md(`
        ### Corridas numa thread só
        Como a troca só acontece no await, o trecho **entre dois await** é atômico em relação às outras tarefas do mesmo laço. Isso elimina muitos bugs, mas não todos. Um saque via Pix que **confere o saldo, faz \`await\` na consulta antifraude e só depois debita** tem a mesma corrida de ler-somar-escrever: duas tarefas conferem o saldo de R$ 100, as duas esperam a antifraude, as duas debitam R$ 80. A regra é a mesma da lição anterior, com outro nome: **nada de await entre conferir e agir**. Ou se reconfere depois do await, ou se usa \`asyncio.Lock\`. O \`asyncio\` tem \`Lock\`, \`Semaphore\`, \`Event\`, \`Condition\` e \`Queue\` com a mesma ideia das versões de \`threading\`, mas eles **não são seguros entre threads**: servem só para tarefas do mesmo laço.

        ### Quanto paralelizar ajuda: a lei de Amdahl
        Se uma fração **p** do trabalho pode ser dividida entre **n** núcleos e o resto é sequencial, o ganho máximo é a {{lei de Amdahl|Amdahl's law}}:

        **S = 1 / ((1 − p) + p / n)**

        Um relatório de notas fiscais que gasta 10% lendo o arquivo (sequencial) e 90% calculando impostos (paralelizável), em 8 núcleos: S = 1 / (0,1 + 0,9/8) ≈ **4,7 vezes**, e não 8. Com núcleos infinitos, o limite é 1 / 0,1 = 10 vezes. Antes de pagar o custo de processos, meça quanto do tempo é paralelizável.
      `),
      {
        type: 'table',
        head: ['Situação', 'Escolha em Python', 'Por quê'],
        rows: [
          ['Milhares de conexões ou chamadas de API esperando a rede (chat, crawler, gateway)', '`asyncio`', 'tarefas baratas, troca só no await; precisa de bibliotecas assíncronas'],
          ['Algumas dezenas de chamadas de E/S com uma biblioteca síncrona (requests, driver de banco síncrono)', 'threads (`ThreadPoolExecutor`)', 'o GIL é liberado durante a espera; não exige reescrever o código'],
          ['Cálculo pesado em Python puro (gerar PDFs, comprimir imagens, simulações)', 'processos (`ProcessPoolExecutor`)', 'cada processo tem o seu GIL e o seu núcleo'],
          ['Cálculo pesado em bibliotecas que soltam o GIL (NumPy, hashlib)', 'threads podem bastar', 'o trabalho pesado roda em C, fora do GIL'],
          ['Servidor asyncio que precisa de um cálculo pesado de vez em quando', '`asyncio` + `run_in_executor` com processos', 'o laço continua atendendo enquanto o processo calcula'],
        ],
      },
      info(`
        O JavaScript do nível 6 usa o mesmo modelo do \`asyncio\`: uma thread com laço de eventos, e Promises no papel das corrotinas. Por isso um laço pesado trava a página inteira, e para calcular em paralelo no navegador existem os Web Workers, que têm memória separada e conversam por mensagens, como processos.
      `, 'Você já viu isso no JavaScript'),
    ],
    exemplo: [
      md(`
        A finalização de compra de uma loja virtual faz três chamadas a serviços externos (E/S) e depois gera quatro PDFs de nota fiscal (CPU, Python puro). Os tempos de cada etapa:

        - consulta do CEP: 300 ms; cálculo do frete: 500 ms; reserva no estoque: 200 ms;
        - cada PDF: 400 ms de cálculo.

        Quanto tempo cada modelo leva, numa máquina com 4 núcleos e CPython com GIL?
      `),
      {
        type: 'table',
        head: ['Modelo', '3 chamadas de E/S', '4 PDFs (CPU)', 'O que aconteceu'],
        rows: [
          ['Sequencial', '300 + 500 + 200 = 1000 ms', '4 × 400 = 1600 ms', 'cada etapa espera a anterior'],
          ['asyncio (gather)', '≈ 500 ms (a mais lenta)', '1600 ms, e o laço fica congelado', 'as esperas se sobrepõem; o cálculo não tem await, então ninguém mais roda'],
          ['4 threads', '≈ 500 ms', '≈ 1600 ms ou mais', 'na espera de rede o GIL é liberado; no cálculo, só uma thread roda Python por vez'],
          ['4 processos', '≈ 500 ms, pagando a criação dos processos', '≈ 400 ms + criação + serialização', 'cada processo usa um núcleo; compensa para cálculo, é exagero para esperar rede'],
        ],
        caption: 'A combinação natural aqui: asyncio para as chamadas e um ProcessPoolExecutor, via run_in_executor, para os PDFs.',
      },
      md(`
        Veja a linha do tempo do asyncio nas chamadas de E/S, num laço de eventos com relógio:

        - **t = 0**: o laço roda a tarefa do CEP até o await (a requisição sai); depois a do frete e a do estoque, cada uma até o seu await. As três estão esperando; o laço pergunta ao SO e dorme.
        - **t = 200**: chega a resposta do estoque; a tarefa volta, termina, e o laço volta a dormir.
        - **t = 300**: chega a do CEP. **t = 500**: chega a do frete; o \`gather\` devolve os três resultados.

        Em nenhum momento duas tarefas rodaram ao mesmo tempo: o ganho vem só de **esperar ao mesmo tempo**. Se a tarefa do CEP chamasse \`time.sleep(0.3)\` em vez de \`await asyncio.sleep(0.3)\`, o laço ficaria preso nela por 300 ms: a do frete e a do estoque nem começariam antes disso, e o total iria para 800 ms. Com as três bloqueando, o total voltaria aos 1000 ms do sequencial.
      `),
    ],
    codigo: [
      md('Aqui roda uma simulação: as tarefas são geradores e o laço é um `deque` de tarefas prontas. Cada `yield` faz o papel de um `await`. Repare na tarefa de cálculo, que não tem nenhum yield no meio: enquanto ela calcula, as outras não andam.'),
      py(`
        from collections import deque

        def baixar(nome, partes):
            for i in range(1, partes + 1):
                print(f"{nome}: pedi a parte {i}/{partes}, esperando a rede...")
                yield                    # aqui um 'await' devolveria o controle ao laço
            print(f"{nome}: pronto")

        def calcular_sem_pausa(n):
            total = sum(i * i for i in range(n))   # nenhum yield: ninguém mais roda até acabar
            print(f"cálculo: terminei ({total})")
            yield

        def laco(tarefas):
            prontas = deque(tarefas)
            voltas = 0
            while prontas:
                tarefa = prontas.popleft()
                try:
                    next(tarefa)                   # roda a tarefa até o próximo yield
                    prontas.append(tarefa)         # pausou: volta para o fim da fila
                except StopIteration:
                    pass                           # terminou: sai do laço
                voltas += 1
            print("voltas do laço:", voltas)

        laco([baixar("CEP", 2), calcular_sem_pausa(200_000), baixar("frete", 2)])
      `, { caption: 'Mude o número de partes e a ordem das tarefas e preveja a saída antes de rodar.' }),
      md('Os três modelos de verdade, para rodar no seu computador:'),
      code('python', `
        import asyncio
        import time

        async def consultar(servico, segundos):
            print(f"pedindo {servico}...")
            await asyncio.sleep(segundos)          # no lugar de uma requisição de rede de verdade
            return f"{servico}: ok"

        async def main():
            inicio = time.perf_counter()
            resultados = await asyncio.gather(
                consultar("CEP", 0.3),
                consultar("frete", 0.5),
                consultar("estoque", 0.2),
            )
            print(resultados, f"{time.perf_counter() - inicio:.2f} s")   # ~0.5 s, não 1.0 s

        asyncio.run(main())
      `, 'Rode no seu computador. Troque os três await asyncio.sleep por time.sleep e veja o total voltar a 1 s. Depois troque só o do frete e preveja o total antes de rodar.'),
      code('python', `
        import time
        from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor

        def gerar_pdf(n):                          # CPU-bound em Python puro
            total = 0
            for i in range(n):
                total += i * i % 7
            return total

        if __name__ == "__main__":                 # obrigatório com spawn/forkserver
            trabalhos = [5_000_000] * 4
            inicio = time.perf_counter()
            for n in trabalhos:
                gerar_pdf(n)
            print(f"sequencial: {time.perf_counter() - inicio:.2f} s")
            for Pool in (ThreadPoolExecutor, ProcessPoolExecutor):
                inicio = time.perf_counter()
                with Pool(max_workers=4) as pool:
                    list(pool.map(gerar_pdf, trabalhos))
                print(f"{Pool.__name__}: {time.perf_counter() - inicio:.2f} s")
      `, 'Rode no seu computador com 4 núcleos ou mais: as threads empatam com o sequencial ou ficam piores (GIL); os processos caem para perto de 1/4, um pouco acima por causa do custo de criá-los.'),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e8-async-0',
          kind: 'mcq',
          prompt: 'Você precisa redimensionar 5.000 fotos de produtos com uma função escrita em Python puro (só cálculo, sem rede), no CPython padrão, numa máquina com 8 núcleos. O que mais encurta o tempo?',
          difficulty: 'facil',
          skills: ['so-concorrencia'],
          hints: [
            'Esse trabalho passa o tempo esperando ou calculando?',
            'Qual dos três modelos consegue pôr vários núcleos para executar Python ao mesmo tempo, com o GIL?',
          ],
          explanation: 'É trabalho limitado por CPU em Python puro. Threads e corrotinas rodam Python numa thread por vez (GIL e laço de eventos), então não usam os outros núcleos. Processos têm cada um o seu interpretador e o seu GIL: com 8 processos, o tempo cai perto de 1/8, menos o custo de criação e de serializar as imagens.',
          options: [
            { text: 'Um ProcessPoolExecutor com 8 processos', correct: true, feedback: 'Isso: cálculo em Python puro só acelera com vários interpretadores, um por núcleo.' },
            { text: 'asyncio.gather com 5.000 corrotinas', feedback: 'Corrotinas se revezam numa thread só e só trocam no await. Cálculo sem await roda inteiro, uma foto depois da outra, e ainda congela o laço.' },
            { text: 'Um ThreadPoolExecutor com 8 threads', feedback: 'Com o GIL, só uma thread executa bytecode Python por vez. Threads ajudam quando a espera é de E/S, não com cálculo em Python puro.' },
            { text: 'Nenhum: concorrência nunca acelera um programa', feedback: 'Concorrência sem paralelismo não acelera cálculo, mas processos em núcleos diferentes são paralelismo de verdade.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e8-async-1',
          kind: 'mcq',
          prompt: 'Um servidor `asyncio` atende centenas de clientes. Alguém escreveu o handler abaixo para respeitar o limite de requisições de uma API externa. O que acontece quando um cliente chama `/frete`?',
          code: {
            lang: 'python',
            code: dedent(`
              async def frete(request):
                  time.sleep(2)              # espera o limite da API
                  dados = await api.consultar(request.cep)
                  return dados
            `),
          },
          difficulty: 'intermediario',
          skills: ['so-concorrencia'],
          hints: [
            'Quantas threads executam as corrotinas desse servidor?',
            'time.sleep devolve o controle ao laço de eventos? Onde uma corrotina pode ceder a vez?',
            'Que versão do sleep cede a vez enquanto espera?',
          ],
          explanation: 'time.sleep é uma chamada bloqueante: segura a thread do laço de eventos por 2 s, e como todas as corrotinas rodam nessa mesma thread, nenhum outro cliente é atendido nesse tempo. A troca de tarefa só acontece no await. A correção é await asyncio.sleep(2); para uma função bloqueante que você não pode trocar, await asyncio.to_thread(funcao).',
          options: [
            { text: 'O servidor inteiro para de atender todos os clientes por 2 segundos', correct: true, feedback: 'Isso: time.sleep não tem await, então o laço de eventos fica preso nessa corrotina. Use await asyncio.sleep(2).' },
            { text: 'Só esse cliente espera 2 segundos; os outros seguem normalmente', feedback: 'Seria assim com await asyncio.sleep(2). time.sleep bloqueia a thread, e o laço de eventos inteiro roda nela.' },
            { text: 'O Python levanta um erro, porque não se pode chamar time.sleep dentro de async def', feedback: 'Não há erro nenhum: o código roda, só que bloqueia o laço. É por isso que o bug passa despercebido em testes com um cliente só.' },
            { text: 'O asyncio move a chamada para uma thread separada automaticamente', feedback: 'O asyncio não sabe que time.sleep bloqueia. Mandar para outra thread é algo que você pede explicitamente, com asyncio.to_thread.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e8-async-2',
          kind: 'predict',
          lang: 'python',
          prompt: 'O laço abaixo é o mesmo da etapa Código. Cada `next` roda a tarefa até o próximo `yield`. O que o programa imprime?',
          code: dedent(`
            from collections import deque

            def tarefa(nome, n):
                print(nome, "começa")
                for i in range(n):
                    yield
                    print(nome, "passo", i)

            fila = deque([tarefa("A", 1), tarefa("B", 2)])
            while fila:
                t = fila.popleft()
                try:
                    next(t)
                    fila.append(t)
                except StopIteration:
                    pass
            print("fim")
          `),
          answer: 'A começa\nB começa\nA passo 0\nB passo 0\nB passo 1\nfim',
          difficulty: 'intermediario',
          skills: ['so-concorrencia'],
          hints: [
            'Criar o gerador, tarefa("A", 1), já imprime alguma coisa?',
            'No primeiro next de cada tarefa, até onde o código vai? O print do passo fica antes ou depois do yield?',
            'Quando A imprime "passo 0", o for dela acaba. O que o next levanta nesse caso, e A volta para a fila?',
          ],
          explanation: 'Criar o gerador não executa nada. O primeiro next de A imprime "A começa" e pausa no yield; o mesmo com B. No segundo next, A imprime "A passo 0", o for acaba, a função termina, e o next levanta StopIteration: A sai da fila. B segue sozinho: "B passo 0", pausa, "B passo 1", termina. É exatamente o que um laço de eventos faz: cada tarefa roda até o próximo ponto de pausa, e o código entre dois pontos de pausa nunca é interrompido.',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e8-async-3',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Escreva um laço de eventos com **relógio virtual** (nada de esperar de verdade). \`rodar(tarefas)\` recebe uma lista de pares \`(nome, gerador)\`. Cada \`yield ms\` de um gerador significa "\`await asyncio.sleep\` de \`ms\` milissegundos".

            - O relógio começa em 0 e todas as tarefas começam prontas no instante 0, na ordem da lista.
            - O laço sempre retoma a tarefa com o **menor instante** de acordar. Ao retomá-la, o relógio salta para esse instante; se ela fizer \`yield ms\`, passa a acordar em \`relógio + ms\`.
            - Empate no instante: acorda primeiro quem foi **agendado antes** (pela ordem em que os agendamentos foram feitos, não pelo nome).
            - Quando um gerador termina, registre \`(nome, relógio)\`.

            Devolva a lista desses pares, na ordem em que as tarefas terminaram.
          `),
          difficulty: 'intermediario',
          skills: ['so-concorrencia', 'ed-pilhas-filas'],
          hints: [
            'Que estrutura de dados entrega sempre o menor elemento de forma eficiente? Você a viu com filas de prioridade.',
            'O que cada entrada dessa estrutura precisa guardar para você saber quando e quem retomar?',
            'Como desempatar dois agendamentos com o mesmo instante sem comparar nomes nem geradores? Pense num número que só cresce.',
            'Como você descobre que um gerador terminou?',
          ],
          explanation: 'É o coração do asyncio: uma fila de prioridade de temporizadores (o asyncio usa heapq de verdade para os call_later) e um relógio que salta direto para o próximo evento, em vez de esperar. O contador crescente no desempate garante a ordem FIFO entre agendamentos no mesmo instante e evita que o heapq tente comparar geradores. O tempo total é o da tarefa mais lenta, e não a soma: as esperas se sobrepõem, embora só uma tarefa rode por vez.',
          starter: dedent(`
            def rodar(tarefas):
                # tarefas: lista de (nome, gerador); cada yield ms = dormir ms
                # devolva [(nome, instante_em_que_terminou), ...] na ordem de término
                pass
          `),
          solution: dedent(`
            import heapq

            def rodar(tarefas):
                fila = []
                seq = 0
                for nome, gen in tarefas:
                    heapq.heappush(fila, (0, seq, nome, gen))
                    seq += 1
                fim = []
                while fila:
                    relogio, _, nome, gen = heapq.heappop(fila)
                    try:
                        ms = next(gen)
                    except StopIteration:
                        fim.append((nome, relogio))
                        continue
                    heapq.heappush(fila, (relogio + ms, seq, nome, gen))
                    seq += 1
                return fim
          `),
          tests: [
            {
              name: 'esperas se sobrepõem',
              code: dedent(`
                def _req(ms):
                    yield ms
                r = rodar([("cep", _req(300)), ("frete", _req(500)), ("estoque", _req(200))])
                assert r == [("estoque", 200), ("cep", 300), ("frete", 500)], f"cada uma termina no próprio tempo, e o total é o da mais lenta (500), não a soma; veio {r!r}"
              `),
            },
            {
              name: 'vários yield na mesma tarefa',
              code: dedent(`
                def _etapas(*ms):
                    for x in ms:
                        yield x
                r = rodar([("pedido", _etapas(100, 50, 25)), ("outro", _etapas(150))])
                assert r == [("outro", 150), ("pedido", 175)], f"o pedido dorme 100, depois 50, depois 25: termina em 175; veio {r!r}"
              `),
            },
            {
              name: 'empate: quem foi agendado antes',
              code: dedent(`
                def _etapas(*ms):
                    for x in ms:
                        yield x
                r = rodar([("A", _etapas(100)), ("B", _etapas(100))])
                assert r == [("A", 100), ("B", 100)], f"mesmo instante: A foi agendada antes; veio {r!r}"
                r = rodar([("A", _etapas(50, 50)), ("B", _etapas(100))])
                assert r == [("B", 100), ("A", 100)], f"as duas acordam em 100, mas B foi agendada para 100 no instante 0, e A só no instante 50: B primeiro; veio {r!r}"
              `),
            },
            {
              name: 'tarefas sem espera e yield 0',
              code: dedent(`
                def _nada():
                    return
                    yield
                def _etapas(*ms):
                    for x in ms:
                        yield x
                r = rodar([("x", _nada()), ("y", _nada())])
                assert r == [("x", 0), ("y", 0)], f"geradores que terminam sem yield acabam no instante 0, na ordem da lista; veio {r!r}"
                r = rodar([("a", _etapas(0, 0)), ("b", _etapas(0))])
                assert r == [("b", 0), ("a", 0)], f"yield 0 cede a vez sem avançar o relógio, como asyncio.sleep(0); veio {r!r}"
                assert rodar([]) == [], "sem tarefas, devolva lista vazia"
              `),
            },
            {
              name: 'relógio virtual, sem espera de verdade',
              code: dedent(`
                assert "time.sleep" not in _source and "import asyncio" not in _source, "use um relógio virtual: nada de time.sleep nem asyncio"
                def _req(ms):
                    yield ms
                r = rodar([(f"t{i}", _req(10_000)) for i in range(50)])
                assert len(r) == 50 and all(t == 10_000 for _, t in r), "50 tarefas de 10 s cada terminam todas no instante 10000"
                assert [n for n, _ in r] == [f"t{i}" for i in range(50)], "com todos os instantes iguais, a ordem de término é a de agendamento"
              `),
            },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e8-async-4',
          kind: 'fix',
          lang: 'python',
          prompt: dedent(`
            Cada saque Pix é uma tarefa (um gerador) num laço cooperativo; o \`yield\` representa o \`await\` da consulta ao serviço antifraude. Com dois saques de R$ 80 numa conta com R$ 100, o saldo termina em **−60**. Corrija \`saque\` para que o saldo nunca fique negativo e só seja aprovado o que o saldo cobre.

            A consulta antifraude não pode sumir: todo saque que for aprovado precisa passar por pelo menos um \`yield\` antes de terminar. O laço \`rodar\` está certo; não mexa nele.
          `),
          difficulty: 'intermediario',
          skills: ['so-concorrencia'],
          hints: [
            'Rode os dois saques à mão: o que cada tarefa viu quando conferiu o saldo?',
            'Entre conferir o saldo e debitar, outra tarefa pode rodar? Onde exatamente?',
            'O trecho entre dois yield nunca é interrompido. Como usar isso para que conferir e debitar aconteçam sem ninguém no meio?',
          ],
          explanation: 'Mesmo numa thread só, o yield (o await) é um ponto onde outra tarefa roda. A versão original confere o saldo, cede a vez e debita depois, confiando numa informação velha: é o check-then-act da lição anterior, com o await no lugar da troca de thread. A correção é não deixar nenhum ponto de pausa entre conferir e debitar: faça a consulta antes e então confira e debite juntos, reconfira o saldo depois do await, ou debite antes do await (reservando o valor) e devolva se a antifraude recusar. Em asyncio real, a alternativa é segurar um asyncio.Lock durante todo o trecho.',
          starter: dedent(`
            from collections import deque

            def rodar(tarefas):
                """Laço cooperativo: roda cada tarefa até o próximo yield, em revezamento."""
                prontas = deque(tarefas)
                while prontas:
                    t = prontas.popleft()
                    try:
                        next(t)
                        prontas.append(t)
                    except StopIteration:
                        pass

            def saque(conta, valor, log):
                if conta["saldo"] >= valor:
                    yield                        # await antifraude.verificar(...)
                    conta["saldo"] -= valor
                    log.append(("aprovado", valor))
                else:
                    log.append(("recusado", valor))

            conta = {"saldo": 100}
            log = []
            rodar([saque(conta, 80, log), saque(conta, 80, log)])
            print(conta, log)
          `),
          solution: dedent(`
            from collections import deque

            def rodar(tarefas):
                """Laço cooperativo: roda cada tarefa até o próximo yield, em revezamento."""
                prontas = deque(tarefas)
                while prontas:
                    t = prontas.popleft()
                    try:
                        next(t)
                        prontas.append(t)
                    except StopIteration:
                        pass

            def saque(conta, valor, log):
                yield                            # await antifraude.verificar(...)
                # entre aqui e o fim não há yield: conferir e debitar acontecem sem ninguém no meio
                if conta["saldo"] >= valor:
                    conta["saldo"] -= valor
                    log.append(("aprovado", valor))
                else:
                    log.append(("recusado", valor))

            conta = {"saldo": 100}
            log = []
            rodar([saque(conta, 80, log), saque(conta, 80, log)])
            print(conta, log)
          `),
          tests: [
            {
              name: 'dois saques de 80 com saldo 100',
              code: dedent(`
                from collections import deque as _dq
                def _rr(gens):
                    f = _dq(gens)
                    while f:
                        g = f.popleft()
                        try:
                            next(g); f.append(g)
                        except StopIteration:
                            pass
                c, l = {"saldo": 100}, []
                _rr([saque(c, 80, l), saque(c, 80, l)])
                assert c["saldo"] >= 0, f"o saldo ficou negativo ({c['saldo']}): as duas tarefas conferiram o saldo antes de qualquer débito?"
                assert c["saldo"] == 20, f"só um saque de 80 cabe em 100: o saldo deve terminar em 20; veio {c['saldo']}"
                assert sorted(l) == [("aprovado", 80), ("recusado", 80)], f"um aprovado e um recusado; veio {l!r}"
              `),
            },
            {
              name: 'três saques: 30, 30 e 50 com saldo 100',
              code: dedent(`
                from collections import deque as _dq
                def _rr(gens):
                    f = _dq(gens)
                    while f:
                        g = f.popleft()
                        try:
                            next(g); f.append(g)
                        except StopIteration:
                            pass
                c, l = {"saldo": 100}, []
                _rr([saque(c, 30, l), saque(c, 30, l), saque(c, 50, l)])
                aprovado = sum(v for s, v in l if s == "aprovado")
                assert c["saldo"] >= 0, f"saldo negativo: {c['saldo']}"
                assert aprovado == 100 - c["saldo"], "o que saiu da conta tem de ser exatamente o total aprovado"
                assert c["saldo"] == 40 and sorted(l) == [("aprovado", 30), ("aprovado", 30), ("recusado", 50)], f"30 e 30 cabem; depois sobram 40 e os 50 não cabem; veio saldo {c['saldo']} e log {l!r}"
              `),
            },
            {
              name: 'a consulta antifraude continua lá',
              code: dedent(`
                c, l = {"saldo": 100}, []
                g = saque(c, 10, l)
                try:
                    next(g)
                except StopIteration:
                    raise AssertionError("um saque que será aprovado precisa pausar pelo menos uma vez (o await da antifraude); a sua tarefa terminou sem nenhum yield")
                for _ in g:
                    pass
                assert c["saldo"] == 90 and l == [("aprovado", 10)], f"sozinho, o saque de 10 é aprovado; veio saldo {c['saldo']} e log {l!r}"
              `),
            },
            {
              name: 'saque sozinho: no limite e acima do saldo',
              code: dedent(`
                c, l = {"saldo": 100}, []
                for _ in saque(c, 100, l):
                    pass
                assert c["saldo"] == 0 and l == [("aprovado", 100)], f"sacar exatamente o saldo é permitido; veio saldo {c['saldo']} e log {l!r}"
                c, l = {"saldo": 100}, []
                for _ in saque(c, 150, l):
                    pass
                assert c["saldo"] == 100 and l == [("recusado", 150)], f"150 com saldo 100 é recusado e o saldo não muda; veio saldo {c['saldo']} e log {l!r}"
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
          id: 'e8-async-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Uma API de CEP aceita no máximo \`limite\` requisições simultâneas, e o seu programa usa um \`asyncio.Semaphore(limite)\` para respeitar isso. Simule esse laço de eventos com relógio virtual. \`rodar(tarefas, limite)\` recebe uma lista de pares \`(nome, gerador)\`; os geradores fazem \`yield\` de pedidos:

            - \`("dormir", ms)\`: a tarefa acorda em \`relógio + ms\` (como no exercício anterior: menor instante primeiro; empate, quem foi agendado antes; todas começam no instante 0, na ordem da lista);
            - \`("adquirir",)\`: se há permissão livre, pega uma e **continua na hora**, sem ceder a vez. Senão, entra no fim da fila de espera do semáforo;
            - \`("liberar",)\`: se há alguém na fila de espera, o primeiro recebe a permissão direto (entrega direta) e é agendado para o **relógio atual**. Senão, a permissão volta a ficar livre. Se isso deixaria mais permissões livres que \`limite\`, levante \`ValueError\`, como o \`BoundedSemaphore\`. Em qualquer caso, quem liberou continua na hora.

            Devolva a lista \`(nome, instante)\` na ordem em que as tarefas terminaram.
          `),
          difficulty: 'desafio',
          skills: ['so-concorrencia', 'ed-pilhas-filas'],
          hints: [
            'Comece do laço com relógio do exercício anterior. O que muda quando um pedido não é "dormir"?',
            'Quando um pedido não faz a tarefa ceder a vez, como você pede o próximo pedido da mesma tarefa sem passar pela fila de prioridade?',
            'Quantas estruturas de espera existem agora? A fila do semáforo precisa de prioridade por tempo ou só da ordem de chegada?',
            'Na entrega direta, o número de permissões livres muda? E quem acorda: em que instante ele deve ser agendado?',
            'Teste o caso em que quem liberou tenta adquirir de novo logo em seguida, com alguém esperando. Quem deve ficar com a permissão?',
          ],
          explanation: 'É, em essência, o que o asyncio.Semaphore faz para limitar requisições simultâneas: um contador, uma fila FIFO de quem espera e o laço de eventos para acordar as tarefas. A entrega direta impede que quem acabou de liberar "fure a fila" pegando a permissão de volta antes de quem já esperava. Note que adquirir com permissão livre não cede a vez: o asyncio também só suspende uma tarefa quando ela realmente precisa esperar.',
          starter: dedent(`
            def rodar(tarefas, limite):
                # tarefas: lista de (nome, gerador)
                # pedidos: ("dormir", ms), ("adquirir",), ("liberar",)
                # devolva [(nome, instante_em_que_terminou), ...] na ordem de término
                pass
          `),
          solution: dedent(`
            import heapq
            from collections import deque

            def rodar(tarefas, limite):
                fila = []
                seq = 0
                livres = limite
                esperando = deque()
                fim = []

                def agendar(instante, nome, gen):
                    nonlocal seq
                    heapq.heappush(fila, (instante, seq, nome, gen))
                    seq += 1

                for nome, gen in tarefas:
                    agendar(0, nome, gen)
                while fila:
                    relogio, _, nome, gen = heapq.heappop(fila)
                    while True:
                        try:
                            pedido = next(gen)
                        except StopIteration:
                            fim.append((nome, relogio))
                            break
                        if pedido[0] == "dormir":
                            agendar(relogio + pedido[1], nome, gen)
                            break
                        if pedido[0] == "adquirir":
                            if livres > 0:
                                livres -= 1
                                continue
                            esperando.append((nome, gen))
                            break
                        if pedido[0] == "liberar":
                            if esperando:
                                n2, g2 = esperando.popleft()
                                agendar(relogio, n2, g2)
                            elif livres == limite:
                                raise ValueError("liberar sem adquirir")
                            else:
                                livres += 1
                return fim
          `),
          tests: [
            {
              name: 'limite 2 com quatro requisições',
              code: dedent(`
                def _req(ms):
                    yield ("adquirir",)
                    yield ("dormir", ms)
                    yield ("liberar",)
                r = rodar([("A", _req(300)), ("B", _req(100)), ("C", _req(200)), ("D", _req(100))], 2)
                assert r == [("B", 100), ("A", 300), ("C", 300), ("D", 400)], f"A e B começam; C entra quando B libera (100) e D quando A libera (300); veio {r!r}"
              `),
            },
            {
              name: 'limite 1 serializa, em ordem de chegada',
              code: dedent(`
                def _req(ms):
                    yield ("adquirir",)
                    yield ("dormir", ms)
                    yield ("liberar",)
                r = rodar([("A", _req(100)), ("B", _req(200)), ("C", _req(50))], 1)
                assert r == [("A", 100), ("B", 300), ("C", 350)], f"com limite 1, uma por vez, na ordem em que pediram; veio {r!r}"
                r = rodar([("A", _req(100)), ("B", _req(10)), ("C", _req(10))], 1)
                assert r == [("A", 100), ("B", 110), ("C", 120)], f"quem espera é atendido em ordem de chegada (FIFO); veio {r!r}"
              `),
            },
            {
              name: 'limite folgado: como se não houvesse semáforo',
              code: dedent(`
                def _req(ms):
                    yield ("adquirir",)
                    yield ("dormir", ms)
                    yield ("liberar",)
                r = rodar([("A", _req(300)), ("B", _req(100)), ("C", _req(200))], 5)
                assert r == [("B", 100), ("C", 200), ("A", 300)], f"com 5 permissões, as três rodam juntas; veio {r!r}"
                def _so_dorme(*ms):
                    for x in ms:
                        yield ("dormir", x)
                r = rodar([("x", _so_dorme(50, 50)), ("y", _so_dorme(70))], 1)
                assert r == [("y", 70), ("x", 100)], f"tarefas que não usam o semáforo só dormem; veio {r!r}"
              `),
            },
            {
              name: 'nunca mais que limite ao mesmo tempo',
              code: dedent(`
                _ativos = {"agora": 0, "max": 0}
                def _medida(ms):
                    yield ("adquirir",)
                    _ativos["agora"] += 1
                    _ativos["max"] = max(_ativos["max"], _ativos["agora"])
                    yield ("dormir", ms)
                    _ativos["agora"] -= 1
                    yield ("liberar",)
                r = rodar([(f"r{i}", _medida(10 * (i % 4) + 10)) for i in range(10)], 3)
                assert _ativos["max"] == 3, f"no máximo 3 requisições ao mesmo tempo (e devem chegar a 3); chegaram a {_ativos['max']}"
                assert len(r) == 10, f"todas as 10 terminam; vieram {len(r)}"
              `),
            },
            {
              name: 'entrega direta: quem liberou não fura a fila',
              code: dedent(`
                def _duas_vezes():
                    yield ("adquirir",)
                    yield ("dormir", 100)
                    yield ("liberar",)
                    yield ("adquirir",)
                    yield ("dormir", 100)
                    yield ("liberar",)
                def _uma(ms):
                    yield ("adquirir",)
                    yield ("dormir", ms)
                    yield ("liberar",)
                r = rodar([("A", _duas_vezes()), ("B", _uma(10))], 1)
                assert r == [("B", 110), ("A", 210)], f"em 100, A libera e a permissão vai direto para B, que já esperava; A espera B terminar. Veio {r!r}"
              `),
            },
            {
              name: 'adquirir com permissão livre não cede a vez',
              code: dedent(`
                def _x():
                    yield ("adquirir",)
                    yield ("liberar",)
                    yield ("adquirir",)
                    yield ("dormir", 50)
                    yield ("liberar",)
                def _y():
                    yield ("adquirir",)
                    yield ("dormir", 10)
                    yield ("liberar",)
                r = rodar([("X", _x()), ("Y", _y())], 1)
                assert r == [("X", 50), ("Y", 60)], f"X adquire, libera e adquire de novo sem ceder a vez; Y espera até 50. Veio {r!r}"
              `),
            },
            {
              name: 'liberar demais é erro',
              code: dedent(`
                def _so_libera():
                    yield ("liberar",)
                try:
                    rodar([("x", _so_libera())], 2)
                except ValueError:
                    pass
                else:
                    raise AssertionError("liberar sem ter adquirido deixaria 3 permissões num limite de 2: levante ValueError")
              `),
            },
          ],
        },
      },
    ],
    projeto: [
      md('No **chat em rede**, você vai juntar tudo: um servidor `asyncio` com muitos clientes, estado compartilhado (salas e apelidos) alterado sem corrida entre os await, e nenhuma chamada bloqueante dentro dos handlers. Antes de começar, liste em que pontos do seu código há await entre conferir e alterar o estado.'),
      { type: 'project', projectId: 'p8-chat' },
    ],
    revisao: [
      md(`
        - Concorrência é lidar com várias tarefas ao mesmo tempo; paralelismo é executá-las ao mesmo tempo. Esperar em paralelo resolve E/S; calcular em paralelo exige vários núcleos.
        - asyncio: uma thread, laço de eventos, troca só no await (cooperativa). Uma chamada bloqueante congela tudo: use a versão assíncrona, \`asyncio.to_thread\` ou um processo.
        - Chamar uma corrotina sem await não a executa ("coroutine was never awaited"); para várias juntas, \`gather\`, \`create_task\` ou \`TaskGroup\`.
        - Threads: troca a qualquer momento (preemptiva). No CPython com GIL, ajudam com E/S e não com cálculo em Python puro. O GIL não torna o seu código seguro.
        - Processos: paralelismo de verdade para cálculo, pagando criação, memória e serialização; \`if __name__ == "__main__":\` com spawn/forkserver.
        - Corridas também existem com asyncio: nada de await entre conferir e agir, ou use \`asyncio.Lock\`.
        - Lei de Amdahl: S = 1 / ((1 − p) + p/n); a parte sequencial limita o ganho.
      `),
      english(`
        - **concurrency vs. parallelism**: concorrência × paralelismo
        - **I/O-bound / CPU-bound**: limitado por E/S / por CPU
        - **coroutine, event loop, await, task**: corrotina, laço de eventos, ponto de espera, tarefa
        - **cooperative vs. preemptive multitasking**: multitarefa cooperativa × preemptiva
        - **blocking call, "don't block the event loop"**: chamada bloqueante, "não bloqueie o laço de eventos"
        - **GIL, free-threaded build**: trava global do interpretador, versão sem GIL
        - **process pool, pickling, Amdahl's law**: pool de processos, serialização, lei de Amdahl

        Frase de palestra (Rob Pike, *Concurrency is not parallelism*, 2012): *"Concurrency is about dealing with lots of things at once. Parallelism is about doing lots of things at once."*

        Frase típica de entrevista: *"For I/O-bound work I'd use asyncio or a thread pool; for CPU-bound work in CPython I'd use a process pool, because the GIL lets only one thread execute Python bytecode at a time."*
      `),
    ],
  },
  review: [
    ['Qual é a diferença entre concorrência e paralelismo?', 'Concorrência é ter várias tarefas em andamento, revezando; paralelismo é executar várias literalmente ao mesmo tempo, em núcleos diferentes.'],
    ['Em que pontos uma corrotina asyncio pode ceder a vez a outra?', 'Só nos await (de algo que precise esperar). Entre dois await, nenhuma outra tarefa do mesmo laço roda.'],
    ['O que acontece com um servidor asyncio se um handler chama time.sleep(2)?', 'O laço de eventos inteiro fica parado 2 s: nenhum outro cliente é atendido. A correção é await asyncio.sleep(2) ou asyncio.to_thread para código bloqueante.'],
    ['Por que threads não aceleram cálculo em Python puro no CPython padrão?', 'Por causa do GIL: só uma thread executa bytecode Python por vez. Ele é liberado na espera de E/S, por isso threads ajudam com E/S.'],
    ['Quais são os custos de usar processos em vez de threads?', 'Criação mais cara, um interpretador inteiro de memória por processo e serialização (pickle) de argumentos e resultados entre processos.'],
    ['Como pode haver condição de corrida num programa asyncio de uma thread só?', 'Quando há um await entre conferir um estado e agir sobre ele: outra tarefa roda no meio e muda o estado. Reconfira depois do await ou use asyncio.Lock.'],
    ['Pela lei de Amdahl, qual é o ganho com 8 núcleos se 90% do trabalho é paralelizável?', '1 / (0,1 + 0,9/8) ≈ 4,7 vezes; o limite, com núcleos infinitos, é 10 vezes.'],
  ],
  references: ['ostep', 'python-docs', 'tanenbaum-so'],
});

export const lessons: Lesson[] = [semaforos, modelos];
