var e={id:`l8-semaforos-condicao`,moduleId:`m8-3`,title:`Esperar sem desperdiçar: semáforos, variáveis de condição e o produtor-consumidor`,titleEn:`Waiting without spinning: semaphores, condition variables and the producer-consumer problem`,summary:`O lock garante que só uma thread mexe no dado; falta fazer uma thread esperar até algo acontecer. Semáforos contadores, variáveis de condição, o buffer limitado e o deadlock que nasce de inverter dois acquire.`,minutes:45,objectives:[`Explicar por que um lock sozinho não resolve "esperar até haver item" e por que a espera ativa desperdiça CPU`,`Usar semáforos contadores para limitar acesso (N vagas) e semáforos iniciados em 0 para impor ordem`,`Usar variáveis de condição corretamente: com o lock na mão, dentro de um while, avisando depois de mudar o estado`,`Montar o buffer limitado do produtor-consumidor com semáforos e com variáveis de condição`,`Mostrar como inverter a ordem de dois acquire no produtor-consumidor causa deadlock, ligando-o às quatro condições de Coffman`],skills:[`so-concorrencia`],terms:[{pt:`espera ativa`,en:`busy waiting / spinning`,def:`Ficar testando uma condição num laço, gastando CPU, em vez de dormir até ser avisado.`},{pt:`semáforo`,en:`semaphore`,def:`Contador inteiro, nunca negativo, com duas operações atômicas: P (espera o contador ficar positivo e decrementa) e V (incrementa e acorda quem espera).`,example:`sem_wait() decrements the semaphore; if the value is zero, the call blocks until it becomes possible to perform the decrement.`},{pt:`semáforo contador`,en:`counting semaphore`,def:`Semáforo iniciado com N: deixa até N threads passarem ao mesmo tempo.`},{pt:`semáforo binário`,en:`binary semaphore`,def:`Semáforo que só vale 0 ou 1; usado como exclusão mútua ou como sinal entre duas threads.`},{pt:`variável de condição`,en:`condition variable`,def:`Fila de espera associada a um lock: wait libera o lock e dorme; notify acorda quem espera. Não guarda memória do aviso.`,example:`Condition variables must be used with a mutex: wait() atomically releases the lock and suspends the thread.`},{pt:`monitor`,en:`monitor`,def:`Objeto que junta dados, um lock e variáveis de condição: só uma thread por vez executa seus métodos.`},{pt:`produtor-consumidor`,en:`producer-consumer`,def:`Problema clássico: threads que produzem itens e threads que os consomem, ligadas por um buffer compartilhado.`},{pt:`buffer limitado`,en:`bounded buffer`,def:`Fila com capacidade máxima: o produtor espera se ela está cheia; o consumidor, se está vazia.`},{pt:`despertar espúrio`,en:`spurious wakeup`,def:`Retorno de wait sem que ninguém tenha avisado; permitido pelo POSIX, e mais um motivo para reconferir a condição.`,example:`Spurious wakeups from pthread_cond_wait() may occur.`},{pt:`aviso perdido`,en:`lost wakeup`,def:`Aviso (notify) feito quando ninguém estava esperando: some, e quem for esperar depois dorme para sempre.`},{pt:`semântica Mesa`,en:`Mesa semantics`,def:`Regra em que notify é só uma dica: a thread acordada volta a disputar o lock e, quando roda, o estado pode ter mudado.`}],references:[`ostep`,`tanenbaum-so`,`python-docs`,`linux-man`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:'Na lição anterior, o lock resolveu um problema: **duas threads não mexem no mesmo dado ao mesmo tempo**. Mas muitos programas precisam de outra coisa: **esperar até algo acontecer**. O caixa da padaria só passa o cartão depois que o pedido foi registrado; a thread que envia notas fiscais à Sefaz só trabalha quando há nota na fila; no máximo 10 threads podem usar as 10 conexões do banco de dados.\n\nTestar a condição num laço (`while not fila: pass`) é {{espera ativa|busy waiting}}: a thread queima um núcleo inteiro perguntando "já tem?". O sistema operacional oferece algo melhor: a thread **dorme** (fica bloqueada, sem usar CPU) e outra thread a **acorda** quando a condição muda. As duas ferramentas clássicas são o {{semáforo|semaphore}} e a {{variável de condição|condition variable}}. Com elas se resolve o {{produtor-consumidor|producer-consumer}}, o padrão por trás de toda fila de tarefas, de pool de conexões e do `queue.Queue` do Python.'}]},{stage:`explicacao`,blocks:[{type:`md`,text:`### Semáforo: um contador que faz dormir
Proposto por Edsger Dijkstra nos anos 1960, o semáforo é um inteiro que **nunca fica negativo**, com duas operações atômicas:

- **P** (*wait*, \`acquire\`, \`sem_wait\` no POSIX): se o contador é maior que 0, decrementa e segue; se é 0, a thread **bloqueia** até poder decrementar;
- **V** (*signal*, \`release\`, \`sem_post\`): incrementa e, se há threads bloqueadas, acorda uma.

As letras vêm do holandês (V de *verhogen*, aumentar). O que importa é a leitura: **o valor é quantas permissões estão disponíveis agora**. E, ao contrário do lock, o semáforo **não tem dono**: é normal uma thread fazer P e **outra** fazer V. É isso que permite usá-lo como sinal.

O valor inicial decide o papel do semáforo:`},{type:`table`,head:[`Valor inicial`,`Papel`,`Exemplo`],rows:[[`1`,`{{semáforo binário|binary semaphore}} usado como exclusão mútua (um lock sem dono)`,`só uma thread por vez grava no arquivo de log`],[`N`,`{{semáforo contador|counting semaphore}}: até N threads ao mesmo tempo`,`10 conexões com o banco; 3 caixas abertos na agência`],[`0`,`sinal / ordem: quem faz P espera até alguém fazer V`,`a thread da NF-e só emite depois que a thread do Pix confirma o pagamento`]]},{type:`md`,text:'Um detalhe que pega muita gente: o semáforo **tem memória**. Se a thread do Pix faz V **antes** de a thread da NF-e chegar ao P, o contador vira 1 e o P passa direto depois. O aviso não se perde.\n\n### Variável de condição: esperar por uma condição qualquer\nO semáforo conta. Mas muitas condições não são contagens: "o saldo cobre o saque", "a fila tem um pedido de prioridade alta", "todas as 4 threads terminaram a etapa". Para isso existe a variável de condição: uma **fila de espera ligada a um lock**. A condição em si fica numa variável comum, protegida pelo lock.\n\n- `cond.wait()`: precisa ser chamado **com o lock na mão**. Ele **libera o lock e dorme**, numa operação atômica; quando a thread é acordada, `wait` só retorna **depois de readquirir o lock**.\n- `cond.notify()` (`pthread_cond_signal`): acorda **uma** thread que espera (o POSIX garante só "pelo menos uma"); `cond.notify_all()` (`pthread_cond_broadcast`) acorda **todas**.\n- O aviso **não tem memória**: um notify sem ninguém esperando simplesmente some.\n\nLock, dados e variáveis de condição juntos formam um {{monitor|monitor}}: os métodos `synchronized` do Java com `wait`/`notify` são isso. Em Python, você monta um com uma classe que guarda os dados, um `threading.Lock` e uma ou mais `threading.Condition` sobre ele.\n\n### As três regras da variável de condição\n**1. Espere dentro de um `while`, nunca de um `if`.** Quase todos os sistemas usam a {{semântica Mesa|Mesa semantics}} (do sistema Mesa, da Xerox PARC, descrita por Lampson e Redell em 1980): o notify é só uma **dica**. A thread acordada volta para a fila do lock e, até ela rodar, outra thread pode ter chegado antes e mudado o estado (pegado o único item, por exemplo). Além disso, o POSIX permite o {{despertar espúrio|spurious wakeup}}: `wait` retornar sem notify nenhum. A documentação do Python pede o mesmo laço, ou `cond.wait_for(predicado)`, que faz o laço por você. (Na semântica de Hoare, a thread acordada rodaria na hora, com a condição garantida; ela é mais fácil de raciocinar e quase ninguém a implementa.)\n\n**2. Teste e espere com o lock na mão.** Se a thread olha `fila` sem o lock, vê que está vazia e, antes de chamar `wait`, o produtor insere e faz notify, o aviso é perdido ({{aviso perdido|lost wakeup}}): o consumidor dorme com um item na fila. Por isso o Python levanta `RuntimeError` se você chama `wait` ou `notify` sem o lock.\n\n**3. Mude o estado e só depois avise, ainda com o lock.** Quem acorda vai reconferir a condição; ela precisa já estar verdadeira.\n\n### Semáforo × variável de condição × lock'},{type:`table`,head:[``,`Lock (mutex)`,`Semáforo`,`Variável de condição`],rows:[[`Pergunta que responde`,`"alguém está usando?"`,`"há permissão disponível?"`,`"a condição que eu quero já vale?"`],[`Guarda estado?`,`livre ou ocupado`,`sim: o contador lembra Vs antigos`,`não: o aviso sem ninguém esperando some`],[`Tem dono?`,`conceitualmente sim: quem trancou destranca`,`não: P numa thread, V em outra é o uso normal`,`é usada junto de um lock, que tem dono`],[`Uso típico`,`proteger uma seção crítica`,`limitar a N; sinalizar ordem`,`esperar por qualquer condição sobre dados compartilhados`],[`No Python`,"`threading.Lock`","`threading.Semaphore`, `BoundedSemaphore`","`threading.Condition`"]],caption:`Uma variável de condição sem um lock e sem uma variável de estado não serve para nada; um semáforo carrega o próprio estado.`},{type:`md`,text:"### O produtor-consumidor com buffer limitado\nProdutores colocam itens num {{buffer limitado|bounded buffer}} de capacidade N; consumidores retiram. Três regras: ninguém mexe no buffer ao mesmo tempo; o produtor espera se o buffer está cheio; o consumidor espera se está vazio. Com semáforos, a solução clássica (OSTEP, cap. 31) usa três:\n\n- `vazios`, iniciado com **N**: quantas vagas há;\n- `cheios`, iniciado com **0**: quantos itens prontos há;\n- `mutex`, iniciado com **1** (ou um lock): protege o buffer.\n\nO produtor faz `P(vazios)`, `P(mutex)`, insere, `V(mutex)`, `V(cheios)`. O consumidor faz o espelho: `P(cheios)`, `P(mutex)`, retira, `V(mutex)`, `V(vazios)`. A ordem dos dois P **não é detalhe**: se o produtor pegar o mutex antes de esperar a vaga, e o buffer estiver cheio, ele dorme **segurando o mutex**, e o consumidor, que é quem abriria a vaga, fica preso esperando o mutex. É um deadlock, que o exemplo a seguir mostra passo a passo.\n\nCom variáveis de condição, use **duas**, `nao_cheio` e `nao_vazio`, sobre o mesmo lock. Com uma só e `notify()`, um consumidor pode acordar outro consumidor em vez do produtor, e todos acabam dormindo (OSTEP mostra o caso em detalhe). Com uma só e `notify_all()` funciona, mas acorda gente à toa."},{type:`callout`,tone:`warn`,text:'`threading.Semaphore` **não tem teto**: um `release()` a mais deixa o contador acima do valor inicial, e o seu "limite de 10 conexões" vira 11 sem aviso. Se o contador nunca deve passar do inicial, use `threading.BoundedSemaphore`, que levanta `ValueError` nesse caso. E a ordem em que as threads bloqueadas acordam não é garantida pela documentação: não escreva código que dependa dela.',title:`Semaphore × BoundedSemaphore`},{type:`callout`,tone:`tip`,text:"No dia a dia de Python, quase nunca você escreve o buffer na mão: `queue.Queue(maxsize=N)` já é um buffer limitado seguro entre threads. Por dentro ele é exatamente um monitor: um lock e três `threading.Condition` (`not_empty`, `not_full` e `all_tasks_done`). Saber montar o seu é o que permite entender, depurar e adaptar o dele.",title:`Na prática: queue.Queue`}]},{stage:`exemplo`,blocks:[{type:`md`,text:"Um produtor P gera 3 itens e um consumidor C retira 3, com buffer de capacidade 2. O escalonador desta simulação é simples e implacável: **roda sempre o produtor enquanto ele conseguir avançar**; o consumidor só roda quando o produtor bloqueia. Começamos com `vazios = 2`, `cheios = 0`, `mutex = 1`.\n\n**Ordem certa** (`P(vazios)` antes de `P(mutex)`):"},{type:`table`,head:[`Passo`,`Thread`,`O que faz`,`vazios`,`cheios`,`mutex`,`buffer`],rows:[[`1`,`P`,`P(vazios), P(mutex), põe 1, V(mutex), V(cheios)`,`1`,`1`,`1`,`[1]`],[`2`,`P`,`o mesmo com o item 2`,`0`,`2`,`1`,`[1, 2]`],[`3`,`P`,`P(vazios) com vazios = 0: **bloqueia**, sem segurar nada`,`0`,`2`,`1`,`[1, 2]`],[`4`,`C`,`P(cheios), P(mutex), tira 1, V(mutex), V(vazios): o V acorda P`,`1 → 0 (a vaga vai para P)`,`1`,`1`,`[2]`],[`5`,`P`,`termina o P(vazios), P(mutex), põe 3, V(mutex), V(cheios)`,`0`,`2`,`1`,`[2, 3]`],[`6`,`C`,`tira 2 e tira 3`,`2`,`0`,`1`,`[]`]],caption:`No fim, os semáforos voltam aos valores iniciais: cada vaga ocupada foi devolvida, cada item produzido foi consumido.`},{type:`md`,text:"**Ordem invertida** (`P(mutex)` antes de `P(vazios)`). Os passos 1 e 2 são iguais. No terceiro item:"},{type:`table`,head:[`Passo`,`Thread`,`O que faz`,`vazios`,`cheios`,`mutex`,`Estado`],rows:[[`3`,`P`,`P(mutex): pega o mutex`,`0`,`2`,`0`,`P executando`],[`3`,`P`,`P(vazios) com vazios = 0: bloqueia **segurando o mutex**`,`0`,`2`,`0`,`P bloqueado em vazios`],[`4`,`C`,`P(cheios): passa`,`0`,`1`,`0`,`C executando`],[`4`,`C`,`P(mutex) com mutex = 0: bloqueia`,`0`,`1`,`0`,`C bloqueado em mutex`],[`—`,`—`,`ninguém pode avançar`,`0`,`1`,`0`,`**deadlock**`]]},{type:`md`,text:`As quatro condições de Coffman da lição anterior estão todas aqui, só que com um semáforo no meio, e não dois locks: **exclusão mútua** (o mutex), **posse e espera** (P segura o mutex e espera uma vaga), **não preempção** (ninguém tira o mutex de P) e **espera circular** (P espera a vaga que só C pode criar; C espera o mutex que só P pode soltar). O conserto é a regra de sempre: **segure o lock pelo menor tempo possível e nunca durma esperando outra coisa com ele na mão**. Esperar a vaga primeiro e só então pegar o mutex quebra a posse e espera.`}]},{stage:`codigo`,blocks:[{type:`md`,text:`Threads de verdade não rodam no Python do navegador. A simulação abaixo executa as duas "threads" como listas de instruções, com o mesmo escalonador do exemplo, e detecta o deadlock quando ninguém consegue avançar. Rode e compare as duas ordens.`},{type:`code`,lang:`python`,code:`def rodar(programas, sems):
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
          {"vazios": 2, "cheios": 0, "mutex": 1})`,runnable:!0,caption:`Troque a capacidade (o valor inicial de vazios) para 3: a ordem errada ainda trava? Por quê?`},{type:`md`,text:`Agora o código real, para rodar no seu computador: o mesmo buffer limitado como monitor, com um lock e duas variáveis de condição.`},{type:`code`,lang:`python`,code:`import threading
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
for th in ts: th.join()`,runnable:!1,caption:`Rode no seu computador. Troque os while por if e acrescente um segundo consumidor: o erro pode demorar a aparecer, e é justamente isso que o torna perigoso.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e8-sem-0`,kind:`mcq`,prompt:"Uma agência tem 3 caixas, controlados por um semáforo iniciado com 3. Chegam 5 clientes (threads) ao mesmo tempo e cada um faz `acquire()` antes de ser atendido e `release()` ao sair. Enquanto nenhum atendimento termina, quantos clientes ficam bloqueados?",difficulty:`facil`,skills:[`so-concorrencia`],hints:[`O que o valor de um semáforo representa?`,`Acompanhe o contador a cada acquire: 3, 2, ... O que acontece quando ele chega a 0?`],explanation:`Os três primeiros acquire levam o contador de 3 a 0 e passam; os outros dois encontram 0 e bloqueiam. Cada release, ao fim de um atendimento, deixa um dos bloqueados passar. É o semáforo contador limitando o acesso a N recursos, como um pool com 3 conexões.`,options:[{text:`2`,correct:!0,feedback:`Isso: o contador vai de 3 a 0 com os três primeiros; os outros dois esperam um release.`},{text:`3`,feedback:`3 é quantos passam, não quantos esperam: o valor inicial é o número de permissões disponíveis.`},{text:`0`,feedback:`Se ninguém bloqueasse, o semáforo não estaria limitando nada. O acquire com contador 0 bloqueia.`},{text:`4`,feedback:`Parece que você tratou o semáforo como um lock (só um passa). Um semáforo iniciado com 3 deixa passar três.`}]}},{type:`exercise`,exercise:{id:`e8-sem-1`,kind:`mcq`,prompt:"Um sistema tem dois consumidores e um produtor que faz `fila.append(p)` seguido de `cond.notify()`, com o lock na mão. Os consumidores usam o código abaixo, e de vez em quando um deles quebra com `IndexError: pop from an empty deque`. Qual é a causa?",code:{lang:`python`,code:`with cond:
    if not fila:
        cond.wait()
    pedido = fila.popleft()`},difficulty:`intermediario`,skills:[`so-concorrencia`],hints:[`Quando wait() retorna, quem garante que a fila ainda tem o item que motivou o aviso?`,`Entre o notify e o momento em que o consumidor acordado consegue o lock de volta, outra thread pode rodar?`,`O que muda se a mesma condição for testada de novo depois de acordar?`],explanation:`Com a semântica Mesa, notify só tira a thread da fila de espera; ela ainda precisa readquirir o lock. Nesse intervalo, o outro consumidor (que nem estava dormindo) pode pegar o lock e o item. O acordado volta do wait, não reconfere nada e chama popleft numa fila vazia. Wait também pode retornar sem aviso (despertar espúrio). O conserto é trocar o if por while, ou usar cond.wait_for(lambda: fila).`,options:[{text:`Entre o aviso e a volta do wait, outro consumidor pode pegar o item; com if, ninguém reconfere a fila`,correct:!0,feedback:`Isso: notify é uma dica (semântica Mesa), e wait pode até voltar sem aviso. A condição precisa ser reconferida num while.`},{text:`wait() não libera o lock, então o produtor não consegue inserir`,feedback:`wait libera o lock enquanto dorme e o readquire antes de voltar. Se não liberasse, o sintoma seria travar para sempre, não IndexError.`},{text:`O deque não é seguro entre threads`,feedback:`append e popleft do deque são seguros entre threads, e aqui todo acesso já acontece com o lock. O problema é lógico: a condição não é reconferida.`},{text:`O produtor deveria chamar notify() antes do append()`,feedback:`Com o lock na mão, a ordem não muda nada para quem acorda: ele só roda depois que o produtor solta o lock. E o costume é o contrário: mudar o estado e depois avisar.`}]}},{type:`exercise`,exercise:{id:`e8-sem-2`,kind:`predict`,lang:`python`,prompt:"O `acquire(blocking=False)` não bloqueia: devolve True se conseguiu a permissão e False se o contador estava em 0. O que este programa imprime?",code:`import threading

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
    print("ValueError")`,answer:`True
True
False
True True True False
ValueError`,difficulty:`intermediario`,skills:[`so-concorrencia`],hints:[`Anote o valor do contador depois de cada linha.`,`Depois de três release seguidos, o contador volta a 2 ou passa disso? Existe um teto no Semaphore comum?`,`Qual é a diferença entre Semaphore e BoundedSemaphore quando o release passa do valor inicial?`],explanation:`O contador vai 2 → 1 → 0, e o terceiro acquire falha. Os três release levam o contador a 3, acima do valor inicial: o Semaphore comum não tem teto e lembra cada release. Por isso, depois, três acquire passam e o quarto falha. O BoundedSemaphore(1) já está em 1; um release a mais passaria do inicial, e ele levanta ValueError. É a proteção contra o release duplicado que transforma um limite de N em N + 1.`}},{type:`exercise`,exercise:{id:`e8-sem-3`,kind:`fill`,lang:`python`,prompt:"Complete o buffer limitado com semáforos: `vazios` conta as vagas e `cheios` conta os itens prontos.",template:`import threading
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
    return item`,blanks:[[`CAP`,`5`],[`0`],[`vazios`],[`cheios`],[`cheios`],[`vazios`]],difficulty:`facil`,skills:[`so-concorrencia`],hints:[`No começo, o buffer está vazio. Quantas vagas e quantos itens existem?`,`O produtor consome o quê e gera o quê? E o consumidor?`,`Cada thread espera (acquire) pelo recurso de que precisa e avisa (release) sobre o recurso que acabou de criar.`],explanation:`No início há CAP vagas e 0 itens. O produtor gasta uma vaga (vazios.acquire) e cria um item (cheios.release); o consumidor faz o espelho, gasta um item e cria uma vaga. Repare que o acquire do semáforo vem antes do mutex: esperar a vaga com o mutex na mão é o deadlock do exemplo.`}},{type:`exercise`,exercise:{id:`e8-sem-4`,kind:`code`,lang:`python`,prompt:'Implemente um semáforo de simulação (sem threads de verdade): a "thread" é só um nome.\n\n- `Semaforo(valor)`: guarda `self.valor` e `self.fila` (lista de nomes à espera, na ordem de chegada). Se `valor` for negativo, levante `ValueError`.\n- `p(thread)`: se `valor > 0`, decrementa e devolve `True` (passou). Senão, põe `thread` no fim da fila e devolve `False` (bloqueou).\n- `v()`: se há alguém na fila, tira o **primeiro** e devolve o nome dele. É uma **entrega direta**: a permissão vai para quem acordou, então `valor` não muda. Se a fila está vazia, incrementa `valor` e devolve `None`.',difficulty:`intermediario`,skills:[`so-concorrencia`,`ed-pilhas-filas`],hints:[`Quais são os dois estados que o semáforo precisa guardar? Onde eles devem ser criados para que dois semáforos não dividam a mesma fila?`,`Em p, há dois caminhos. Em qual deles o valor muda?`,`Em v, se alguém estava esperando, por que o valor não deve subir? Pense em quem ficaria com a permissão.`,`Quem chegou primeiro à fila deve acordar primeiro. Que extremidade da lista você tira?`],explanation:`O valor nunca fica negativo: quando não há permissão, quem chega vai para a fila. No V, se há alguém esperando, a permissão é entregue direto a ele; incrementar o valor e também acordar alguém criaria uma permissão a mais, e uma terceira thread poderia passar junto. Sem ninguém esperando, o V fica guardado no contador: é a memória que a variável de condição não tem. (No threading.Semaphore real, a ordem de quem acorda não é garantida; aqui usamos FIFO para a simulação ser previsível.)`,starter:`class Semaforo:
    def __init__(self, valor):
        # guarde o valor e a fila de espera; valor negativo -> ValueError
        pass

    def p(self, thread):
        # True se passou; False se bloqueou (entra no fim da fila)
        pass

    def v(self):
        # acorda o primeiro da fila (devolve o nome) ou incrementa o valor (devolve None)
        pass`,solution:`class Semaforo:
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
        return None`,tests:[{name:`contador limita quantos passam`,code:`s = Semaforo(2)
r = [s.p("A"), s.p("B"), s.p("C")]
assert r == [True, True, False], f"com valor 2, os dois primeiros passam e o terceiro bloqueia; veio {r!r}"
assert s.valor == 0, f"depois de duas passagens, o valor deve ser 0 (nunca negativo); veio {s.valor!r}"
assert s.fila == ["C"], f"quem bloqueou vai para a fila; veio {s.fila!r}"`},{name:`v acorda em ordem de chegada, com entrega direta`,code:`s = Semaforo(0)
for nome in ["A", "B", "C"]:
    assert s.p(nome) is False, "com valor 0, p deve bloquear"
r = s.v()
assert r == "A", f"o primeiro a chegar deve ser o primeiro a acordar; v() devolveu {r!r}"
assert s.valor == 0, f"havia alguém esperando: a permissão vai direto para A, e o valor continua 0; veio {s.valor!r}"
assert s.fila == ["B", "C"], f"A sai da fila; sobram B e C; veio {s.fila!r}"
assert s.v() == "B" and s.v() == "C", "depois de A, acordam B e C, nessa ordem"
r = s.v()
assert r is None and s.valor == 1, f"sem ninguém na fila, v incrementa o valor e devolve None; veio {r!r} com valor {s.valor!r}"
assert s.p("D") is True and s.valor == 0, "a permissão guardada deixa D passar e o valor volta a 0"`},{name:`o semáforo lembra os V antigos`,code:`s = Semaforo(0)
assert s.v() is None and s.v() is None, "sem fila, v devolve None"
assert s.valor == 2, f"dois V sem ninguém esperando deixam o valor em 2; veio {s.valor!r}"
r = [s.p("x"), s.p("y"), s.p("z")]
assert r == [True, True, False], f"as duas permissões guardadas deixam passar duas threads; veio {r!r}"`},{name:`valor inicial inválido e semáforos independentes`,code:`try:
    Semaforo(-1)
except ValueError:
    pass
else:
    raise AssertionError("Semaforo(-1) deveria levantar ValueError")
a, b = Semaforo(0), Semaforo(0)
a.p("T1")
assert b.fila == [], f"cada semáforo precisa da própria fila; a fila de b recebeu {b.fila!r}. A lista foi criada fora do __init__?"
assert b.v() is None and b.valor == 1, "b não tinha ninguém esperando"
assert a.fila == ["T1"] and a.valor == 0, "mexer em b não pode mudar a"`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e8-sem-desafio`,kind:`code`,lang:`python`,prompt:'Escreva o escalonador de uma máquina com semáforos. `executar(threads, iniciais)` recebe:\n\n- `threads`: dict nome → lista de instruções, cada uma `("P", sem)`, `("V", sem)` ou `("log", texto)`;\n- `iniciais`: dict semáforo → valor inicial (não o modifique).\n\nRegras:\n\n1. Há uma fila de **prontas**, que começa com todas as threads na ordem do dict. O escalonador tira a primeira pronta e a executa **até ela terminar ou bloquear** (sem preempção); depois tira a próxima. Acaba quando não houver prontas.\n2. `("log", texto)` acrescenta `"nome: texto"` à lista de log.\n3. `("P", s)`: se o valor de `s` é maior que 0, decrementa e segue. Senão, a thread entra no fim da fila de espera de `s` e para. Quando acordar, continua **depois** do P.\n4. `("V", s)`: se há alguém esperando em `s`, o primeiro sai da espera e vai para o **fim das prontas** (entrega direta: o valor não muda). Senão, incrementa o valor. Em qualquer caso, a thread que fez o V continua rodando.\n\nDevolva `(log, presas)`, em que `presas` é um dict nome → semáforo de cada thread que terminou bloqueada (vazio se todas terminaram). Se `presas` não estiver vazio, houve deadlock.',difficulty:`desafio`,skills:[`so-concorrencia`,`ed-pilhas-filas`],hints:[`Que estado o escalonador precisa guardar de cada thread para retomá-la mais tarde do ponto certo?`,`Quais filas existem? Uma para as prontas e quantas para as que esperam?`,`Quando uma thread bloqueia num P, em que instrução ela deve continuar ao acordar? Quando você avança o contador de instruções dela?`,`Um V que acorda alguém e também incrementa o valor dá uma permissão a mais. Que teste mostraria isso?`,`No fim, quem está presa? Você precisa lembrar em que semáforo cada uma parou, e esquecer isso quando ela acorda.`],explanation:`É o que um núcleo de sistema operacional faz com semáforos: cada thread tem um contador de instruções; P sem permissão tira a thread das prontas e a põe na fila do semáforo; V move uma thread de volta para as prontas. Avançar o contador antes de bloquear faz a thread acordar já depois do P, porque a permissão foi entregue a ela. Com o produtor-consumidor na ordem invertida, o resultado mostra exatamente o ciclo do exemplo: o produtor preso em vazios e o consumidor preso em mutex.`,starter:`def executar(threads, iniciais):
    # threads: dict nome -> lista de ("P", s) / ("V", s) / ("log", texto)
    # iniciais: dict semáforo -> valor inicial
    # devolva (log, presas)
    pass`,solution:`from collections import deque

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
    return log, presas`,tests:[{name:`semáforo em 0 impõe ordem`,code:`th = {"nfe": [("P", "pago"), ("log", "emite NF-e")],
      "pix": [("log", "confirma Pix"), ("V", "pago")]}
r = executar(th, {"pago": 0})
assert r == (["pix: confirma Pix", "nfe: emite NF-e"], {}), f"a NF-e começa primeiro, mas bloqueia até o Pix fazer V; veio {r!r}"
r = executar({"pix": [("V", "pago")], "nfe": [("P", "pago"), ("log", "emite")]}, {"pago": 0})
assert r == (["nfe: emite"], {}), f"V antes do P fica guardado no contador; veio {r!r}"`},{name:`produtor-consumidor na ordem certa`,code:`def _prod(itens, errado):
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
assert ini == {"vazios": 2, "cheios": 0, "mutex": 1}, "não modifique o dict de valores iniciais"`},{name:`ordem invertida: deadlock`,code:`def _prod(itens):
    prog = []
    for i in itens:
        prog += [("P", "mutex"), ("P", "vazios"), ("log", f"põe {i}"), ("V", "mutex"), ("V", "cheios")]
    return prog
_cons = [("P", "cheios"), ("P", "mutex"), ("log", "tira"), ("V", "mutex"), ("V", "vazios")] * 3
ini = {"vazios": 2, "cheios": 0, "mutex": 1}
log, presas = executar({"prod": _prod([1, 2, 3]), "cons": _cons}, ini)
assert ini == {"vazios": 2, "cheios": 0, "mutex": 1}, f"não modifique o dict de valores iniciais (copie-o antes de mexer); ele virou {ini!r}"
assert log == ["prod: põe 1", "prod: põe 2"], f"o produtor põe dois itens e trava no terceiro; veio {log!r}"
assert presas == {"prod": "vazios", "cons": "mutex"}, f"o produtor fica preso em vazios (segurando o mutex) e o consumidor em mutex; veio {presas!r}"`},{name:`entrega direta: V com alguém esperando não incrementa`,code:`th = {"A": [("P", "s"), ("log", "passou")],
      "B": [("V", "s"), ("P", "s"), ("log", "passou")]}
log, presas = executar(th, {"s": 0})
assert log == ["A: passou"], f"o V de B entrega a permissão a A; o P seguinte de B não tem permissão; veio {log!r}"
assert presas == {"B": "s"}, f"B termina preso em s: se ele passou, o V criou uma permissão a mais; veio {presas!r}"`},{name:`quem espera acorda em ordem de chegada`,code:`th = {"c1": [("P", "s"), ("log", "1")], "c2": [("P", "s"), ("log", "2")], "c3": [("P", "s"), ("log", "3")],
      "v": [("V", "s"), ("V", "s"), ("log", "fim do v")]}
log, presas = executar(th, {"s": 0})
assert log == ["v: fim do v", "c1: 1", "c2: 2"], f"o v roda até o fim (sem preempção) e acorda c1 e c2, nessa ordem; veio {log!r}"
assert presas == {"c3": "s"}, f"só houve dois V: c3 continua preso; veio {presas!r}"`},{name:`casos simples`,code:`assert executar({}, {"s": 1}) == ([], {}), "sem threads, nada acontece"
r = executar({"t": [("log", "a"), ("log", "b")]}, {})
assert r == (["t: a", "t: b"], {}), f"uma thread só com logs; veio {r!r}"
r = executar({"t": [("P", "m"), ("log", "dentro"), ("V", "m"), ("P", "m"), ("log", "de novo")]}, {"m": 1})
assert r == (["t: dentro", "t: de novo"], {}), f"P, V e P de novo na mesma thread; veio {r!r}"
r = executar({"t": [("P", "m"), ("P", "m")]}, {"m": 1})
assert r == ([], {"t": "m"}), f"uma thread que pede duas vezes um semáforo de valor 1 trava sozinha; veio {r!r}"`}]}}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Lock dá exclusão mútua; esperar até algo acontecer exige outra ferramenta. Espera ativa gasta CPU à toa.
- Semáforo: contador nunca negativo. P espera e decrementa; V incrementa e acorda. Começa em 1 (exclusão), em N (limite) ou em 0 (ordem). Tem memória e não tem dono.
- \`threading.Semaphore\` não tem teto; \`BoundedSemaphore\` levanta ValueError num release a mais.
- Variável de condição: wait libera o lock e dorme, e readquire antes de voltar; notify acorda um, notify_all acorda todos; sem memória.
- Regras: teste e espere com o lock; espere num while (semântica Mesa, despertar espúrio); mude o estado e depois avise.
- Buffer limitado: vazios = N, cheios = 0, mutex = 1. Espere o semáforo antes de pegar o mutex; o contrário fecha um ciclo de espera (deadlock).
- Na prática, em Python: \`queue.Queue(maxsize=N)\`, que é um monitor com três Conditions.`},{type:`callout`,tone:`english`,text:`- **semaphore, P / V, wait / post, acquire / release**: semáforo e suas operações
- **counting / binary semaphore**: semáforo contador / binário
- **condition variable, wait / signal / broadcast**: variável de condição; notify e notify_all no Python
- **busy waiting, spurious wakeup, lost wakeup**: espera ativa, despertar espúrio, aviso perdido
- **bounded buffer, producer-consumer**: buffer limitado, produtor-consumidor
- **monitor, Mesa semantics**: monitor, semântica Mesa

Frase típica de entrevista: *"I always wait on a condition variable inside a while loop, because with Mesa semantics a signal is only a hint: by the time the thread reacquires the lock, the condition may no longer hold."*

Frase típica de documentação (Python, threading.Condition): *"The while loop checking for the application's condition is necessary because wait() can return after an arbitrary long time, and the condition which prompted the notify() call may no longer hold true."*`,title:`English corner`}]}],cards:[{id:`l8-semaforos-condicao#1`,front:`Que três papéis um semáforo assume conforme o valor inicial (1, N, 0)?`,back:`Com 1, exclusão mútua; com N, limita a N threads ao mesmo tempo (pool de recursos); com 0, sinal de ordem: quem faz P espera alguém fazer V.`},{id:`l8-semaforos-condicao#2`,front:`O que wait() de uma variável de condição faz com o lock?`,back:`Libera o lock e dorme numa operação atômica; ao ser acordada, a thread readquire o lock antes de wait() retornar.`},{id:`l8-semaforos-condicao#3`,front:`Por que se espera numa variável de condição dentro de um while e não de um if?`,back:`Porque notify é só uma dica (semântica Mesa): outra thread pode mudar o estado antes de a acordada readquirir o lock, e wait pode voltar sem aviso (despertar espúrio).`},{id:`l8-semaforos-condicao#4`,front:`Diferença de memória entre semáforo e variável de condição?`,back:`O semáforo guarda os V no contador; um notify sem ninguém esperando se perde.`},{id:`l8-semaforos-condicao#5`,front:`Quais são os três semáforos do buffer limitado e seus valores iniciais?`,back:`vazios = N (vagas), cheios = 0 (itens prontos), mutex = 1 (protege o buffer).`},{id:`l8-semaforos-condicao#6`,front:`O que acontece se o produtor fizer P(mutex) antes de P(vazios) com o buffer cheio?`,back:`Dorme segurando o mutex; o consumidor, que abriria a vaga, bloqueia no mutex: deadlock por espera circular.`},{id:`l8-semaforos-condicao#7`,front:`Por que preferir BoundedSemaphore a Semaphore para limitar conexões?`,back:`Porque Semaphore aceita release acima do valor inicial e o limite cresce sem aviso; BoundedSemaphore levanta ValueError.`}]};export{e as default};
//# sourceMappingURL=l8-semaforos-condicao-CWgomFz5.js.map