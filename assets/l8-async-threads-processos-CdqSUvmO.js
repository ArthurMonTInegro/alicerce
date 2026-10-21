var e={id:`l8-async-threads-processos`,moduleId:`m8-3`,title:`async/await, threads ou processos: escolhendo o modelo de concorrência`,titleEn:`async/await vs threads vs processes: choosing a concurrency model`,summary:`Concorrência não é paralelismo. Como corrotinas e o laço de eventos trocam de tarefa só nos await, por que threads no CPython não aceleram cálculo, quando pagar o preço de processos, e as corridas que continuam existindo mesmo numa thread só.`,minutes:50,objectives:[`Diferenciar concorrência de paralelismo e classificar uma tarefa como limitada por E/S ou por CPU`,`Explicar como um laço de eventos executa corrotinas, usando geradores como modelo de "pausar e retomar"`,`Prever o efeito de uma chamada bloqueante dentro de uma corrotina e saber como tirá-la do laço`,`Explicar o que o GIL impede e o que não impede, e quando processos compensam o custo de criação e serialização`,`Identificar condições de corrida entre await e corrigi-las`,`Escolher entre asyncio, threads e processos para um problema concreto e estimar o ganho com a lei de Amdahl`],skills:[`so-concorrencia`,`so-processos`],terms:[{pt:`paralelismo`,en:`parallelism`,def:`Executar várias coisas literalmente ao mesmo tempo, em núcleos diferentes.`,example:`Concurrency is about dealing with lots of things at once. Parallelism is about doing lots of things at once.`},{pt:`limitado por E/S`,en:`I/O-bound`,def:`Tarefa que passa a maior parte do tempo esperando rede, disco ou banco de dados.`},{pt:`limitado por CPU`,en:`CPU-bound`,def:`Tarefa que passa a maior parte do tempo calculando; só acelera com mais núcleos trabalhando.`},{pt:`corrotina`,en:`coroutine`,def:`Função que pode pausar no meio e ser retomada depois do mesmo ponto; no Python, definida com async def.`,example:`RuntimeWarning: coroutine 'buscar' was never awaited`},{pt:`laço de eventos`,en:`event loop`,def:`Laço que, numa thread só, escolhe a próxima tarefa pronta, roda até ela pausar e espera eventos de E/S.`},{pt:`multitarefa cooperativa`,en:`cooperative multitasking`,def:`A tarefa só cede a vez quando quer (no await); ninguém a interrompe à força.`},{pt:`gerador`,en:`generator`,def:`Função com yield: cada next() roda até o próximo yield e pausa ali, guardando o estado.`},{pt:`chamada bloqueante`,en:`blocking call`,def:`Chamada que segura a thread parada até terminar, como time.sleep ou uma requisição síncrona.`},{pt:`trava global do interpretador`,en:`Global Interpreter Lock (GIL)`,def:`Lock do CPython que deixa só uma thread executar bytecode Python por vez.`},{pt:`serialização`,en:`serialization / pickling`,def:`Converter objetos em bytes para mandá-los a outro processo; no Python, feita pelo pickle.`},{pt:`lei de Amdahl`,en:`Amdahl's law`,def:`O ganho máximo de paralelizar é limitado pela parte que continua sequencial: S = 1 / ((1 − p) + p/n).`}],references:[`ostep`,`python-docs`,`tanenbaum-so`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Um garçom atende dez mesas: anota um pedido, leva à cozinha e, enquanto o prato fica pronto, vai à próxima mesa. Ele lida com muitas coisas ao mesmo tempo, sem fazer duas ao mesmo tempo. Isso é **concorrência**. Dez cozinheiros fritando dez pastéis em dez fogões é {{paralelismo|parallelism}}.

Em Python você tem três jeitos de ter várias tarefas em andamento, e cada um paga um preço diferente:

- **async/await** (\`asyncio\`): uma thread só, com muitas {{corrotinas|coroutines}} que se revezam **nos await**. É o garçom.
- **Threads**: o sistema operacional troca de thread quando quer. No CPython com o GIL, só uma executa Python por vez.
- **Processos**: cada um com seu interpretador e sua memória. É o único dos três que põe vários núcleos para **calcular Python puro** ao mesmo tempo no CPython padrão.

A pergunta que decide tudo é: o programa passa o tempo **esperando** ({{limitado por E/S|I/O-bound}}) ou **calculando** ({{limitado por CPU|CPU-bound}})?`}]},{stage:`explicacao`,blocks:[{type:`md`,text:'### Pausar e retomar: geradores\nUma função comum roda do começo ao fim. Um {{gerador|generator}}, que é uma função com `yield`, **pausa** no yield e guarda variáveis locais e posição; `next(g)` a retoma do ponto exato até o próximo yield. Quando a função acaba, `next` levanta `StopIteration`.\n\n```\ndef tarefa():\n    print("parte 1")\n    yield            # pausa aqui\n    print("parte 2")\n\ng = tarefa()         # nada roda ainda\nnext(g)              # imprime "parte 1" e pausa no yield\nnext(g)              # imprime "parte 2" e levanta StopIteration\n```\n\nAs corrotinas do Python nasceram desse mecanismo (geradores com `send`, depois `yield from`, até ganharem a sintaxe `async`/`await` no Python 3.5, PEP 492). Hoje são um tipo próprio, mas a ideia é a mesma: **`await` é um ponto onde a corrotina pode pausar e devolver o controle a quem a está executando**.\n\n### O laço de eventos\nQuem executa as corrotinas é o {{laço de eventos|event loop}}, numa thread só:\n\n1. pega uma tarefa pronta e a roda até ela chegar a um `await` de algo que ainda não terminou (resposta da rede, um temporizador);\n2. guarda a tarefa como "esperando aquele evento" e pega a próxima pronta;\n3. sem tarefas prontas, pergunta ao sistema operacional quais eventos aconteceram (no Linux via `epoll`, no macOS via `kqueue`, pelo módulo `selectors`; no Windows, o laço padrão usa IOCP) e marca as tarefas correspondentes como prontas.\n\nÉ {{multitarefa cooperativa|cooperative multitasking}}: a tarefa só sai da CPU quando chega a um await. Daí as duas consequências mais importantes deste modelo:\n\n- **Uma chamada bloqueante congela tudo.** `time.sleep(2)`, `requests.get(...)` ou um laço de cálculo de 2 segundos dentro de uma corrotina param o laço inteiro: nenhuma outra tarefa roda, nenhum outro cliente é atendido. Para esperar, use a versão assíncrona (`await asyncio.sleep(2)`, um cliente HTTP assíncrono); para uma chamada bloqueante que você não pode trocar, `await asyncio.to_thread(f, x)` (Python 3.9+) a roda numa thread à parte; para cálculo pesado, mande-o a um processo com `loop.run_in_executor` e um `ProcessPoolExecutor`.\n- **Chamar uma corrotina não a executa.** `buscar_cep("01001-000")` sem await só cria o objeto corrotina; nada acontece, e o Python avisa *"RuntimeWarning: coroutine \'buscar_cep\' was never awaited"*. Para rodar várias ao mesmo tempo, use `asyncio.gather(...)`, `asyncio.create_task(...)` ou, desde o 3.11, `asyncio.TaskGroup`.\n\n### Threads e o GIL\nThreads são escalonadas pelo sistema operacional, com preempção: a troca pode acontecer **entre quaisquer duas instruções**. No CPython, a {{trava global do interpretador|Global Interpreter Lock (GIL)}} deixa só uma thread executar bytecode Python por vez. A thread que está rodando é convidada a soltar o GIL a cada 5 ms (`sys.getswitchinterval()`) e o solta sempre que faz uma {{chamada bloqueante|blocking call}} de E/S. Daí:\n\n- para **E/S**, threads funcionam bem: enquanto uma espera a rede, sem o GIL, outra roda;\n- para **cálculo em Python puro**, 4 threads levam o mesmo tempo que uma, ou mais;\n- extensões em C podem soltar o GIL enquanto calculam: o `hashlib` faz isso para dados maiores que 2047 bytes, e o NumPy em boa parte das operações;\n- **o GIL não deixa o seu código seguro**: ele protege o interpretador, não a sua lógica. O `contador += 1` da lição anterior continua sendo ler, somar e escrever, e a troca de thread pode cair no meio.\n\nO Python 3.13 trouxe uma versão experimental sem GIL (*free-threaded*, PEP 703), e no 3.14 ela passou a ser oficialmente suportada (PEP 779), mas continua sendo uma versão separada, não a padrão. Nela, threads calculam em paralelo, e os locks passam a importar ainda mais.\n\n### Processos\nCada processo tem o próprio interpretador, o próprio GIL e a própria memória: com `ProcessPoolExecutor`, 4 processos em 4 núcleos fazem cálculo puro cerca de 4 vezes mais rápido. O preço:\n\n- **criar** um processo custa muito mais que uma thread, e cada um carrega um interpretador inteiro na memória;\n- nada é compartilhado de graça: argumentos e resultados viajam por {{serialização|serialization / pickling}} (pickle), e mandar 500 MB para um processo filho pode custar mais que o cálculo;\n- com os métodos de início *spawn* (padrão no Windows e no macOS) e *forkserver* (padrão no Linux desde o 3.14), o filho reimporta o seu módulo principal, então o código que cria os processos precisa ficar dentro de `if __name__ == "__main__":`.\n\n### Lado a lado'},{type:`table`,head:[``,`asyncio (corrotinas)`,`Threads`,`Processos`],rows:[[`Quem decide a troca`,`a própria tarefa, no await (cooperativa)`,`o SO, a qualquer momento (preemptiva)`,`o SO, a qualquer momento (preemptiva)`],[`Memória`,`compartilhada, numa thread só`,`compartilhada entre as threads`,`isolada: cada processo tem a sua`],[`Cálculo Python em paralelo (CPython com GIL)`,`não`,`não`,`sim`],[`Custo de cada unidade`,`muito baixo: dezenas de milhares de tarefas são comuns`,`médio: cada thread tem a sua pilha e é escalonada pelo SO`,`alto: um interpretador inteiro por processo`],[`Onde pode haver corrida`,`só nos pontos de await`,`entre quaisquer duas instruções`,`só no que é externo: arquivos, banco, memória compartilhada explícita`],[`Ponto fraco`,`uma chamada bloqueante trava todas as tarefas; precisa de bibliotecas assíncronas`,`locks e corridas; GIL para cálculo`,`criação e serialização caras`]]},{type:`md`,text:"### Corridas numa thread só\nComo a troca só acontece no await, o trecho **entre dois await** é atômico em relação às outras tarefas do mesmo laço. Isso elimina muitos bugs, mas não todos. Um saque via Pix que **confere o saldo, faz `await` na consulta antifraude e só depois debita** tem a mesma corrida de ler-somar-escrever: duas tarefas conferem o saldo de R$ 100, as duas esperam a antifraude, as duas debitam R$ 80. A regra é a mesma da lição anterior, com outro nome: **nada de await entre conferir e agir**. Ou se reconfere depois do await, ou se usa `asyncio.Lock`. O `asyncio` tem `Lock`, `Semaphore`, `Event`, `Condition` e `Queue` com a mesma ideia das versões de `threading`, mas eles **não são seguros entre threads**: servem só para tarefas do mesmo laço.\n\n### Quanto paralelizar ajuda: a lei de Amdahl\nSe uma fração **p** do trabalho pode ser dividida entre **n** núcleos e o resto é sequencial, o ganho máximo é a {{lei de Amdahl|Amdahl's law}}:\n\n**S = 1 / ((1 − p) + p / n)**\n\nUm relatório de notas fiscais que gasta 10% lendo o arquivo (sequencial) e 90% calculando impostos (paralelizável), em 8 núcleos: S = 1 / (0,1 + 0,9/8) ≈ **4,7 vezes**, e não 8. Com núcleos infinitos, o limite é 1 / 0,1 = 10 vezes. Antes de pagar o custo de processos, meça quanto do tempo é paralelizável."},{type:`table`,head:[`Situação`,`Escolha em Python`,`Por quê`],rows:[[`Milhares de conexões ou chamadas de API esperando a rede (chat, crawler, gateway)`,"`asyncio`",`tarefas baratas, troca só no await; precisa de bibliotecas assíncronas`],[`Algumas dezenas de chamadas de E/S com uma biblioteca síncrona (requests, driver de banco síncrono)`,"threads (`ThreadPoolExecutor`)",`o GIL é liberado durante a espera; não exige reescrever o código`],[`Cálculo pesado em Python puro (gerar PDFs, comprimir imagens, simulações)`,"processos (`ProcessPoolExecutor`)",`cada processo tem o seu GIL e o seu núcleo`],[`Cálculo pesado em bibliotecas que soltam o GIL (NumPy, hashlib)`,`threads podem bastar`,`o trabalho pesado roda em C, fora do GIL`],[`Servidor asyncio que precisa de um cálculo pesado de vez em quando`,"`asyncio` + `run_in_executor` com processos",`o laço continua atendendo enquanto o processo calcula`]]},{type:`callout`,tone:`info`,text:"O JavaScript do nível 6 usa o mesmo modelo do `asyncio`: uma thread com laço de eventos, e Promises no papel das corrotinas. Por isso um laço pesado trava a página inteira, e para calcular em paralelo no navegador existem os Web Workers, que têm memória separada e conversam por mensagens, como processos.",title:`Você já viu isso no JavaScript`}]},{stage:`exemplo`,blocks:[{type:`md`,text:`A finalização de compra de uma loja virtual faz três chamadas a serviços externos (E/S) e depois gera quatro PDFs de nota fiscal (CPU, Python puro). Os tempos de cada etapa:

- consulta do CEP: 300 ms; cálculo do frete: 500 ms; reserva no estoque: 200 ms;
- cada PDF: 400 ms de cálculo.

Quanto tempo cada modelo leva, numa máquina com 4 núcleos e CPython com GIL?`},{type:`table`,head:[`Modelo`,`3 chamadas de E/S`,`4 PDFs (CPU)`,`O que aconteceu`],rows:[[`Sequencial`,`300 + 500 + 200 = 1000 ms`,`4 × 400 = 1600 ms`,`cada etapa espera a anterior`],[`asyncio (gather)`,`≈ 500 ms (a mais lenta)`,`1600 ms, e o laço fica congelado`,`as esperas se sobrepõem; o cálculo não tem await, então ninguém mais roda`],[`4 threads`,`≈ 500 ms`,`≈ 1600 ms ou mais`,`na espera de rede o GIL é liberado; no cálculo, só uma thread roda Python por vez`],[`4 processos`,`≈ 500 ms, pagando a criação dos processos`,`≈ 400 ms + criação + serialização`,`cada processo usa um núcleo; compensa para cálculo, é exagero para esperar rede`]],caption:`A combinação natural aqui: asyncio para as chamadas e um ProcessPoolExecutor, via run_in_executor, para os PDFs.`},{type:`md`,text:`Veja a linha do tempo do asyncio nas chamadas de E/S, num laço de eventos com relógio:

- **t = 0**: o laço roda a tarefa do CEP até o await (a requisição sai); depois a do frete e a do estoque, cada uma até o seu await. As três estão esperando; o laço pergunta ao SO e dorme.
- **t = 200**: chega a resposta do estoque; a tarefa volta, termina, e o laço volta a dormir.
- **t = 300**: chega a do CEP. **t = 500**: chega a do frete; o \`gather\` devolve os três resultados.

Em nenhum momento duas tarefas rodaram ao mesmo tempo: o ganho vem só de **esperar ao mesmo tempo**. Se a tarefa do CEP chamasse \`time.sleep(0.3)\` em vez de \`await asyncio.sleep(0.3)\`, o laço ficaria preso nela por 300 ms: a do frete e a do estoque nem começariam antes disso, e o total iria para 800 ms. Com as três bloqueando, o total voltaria aos 1000 ms do sequencial.`}]},{stage:`codigo`,blocks:[{type:`md`,text:"Aqui roda uma simulação: as tarefas são geradores e o laço é um `deque` de tarefas prontas. Cada `yield` faz o papel de um `await`. Repare na tarefa de cálculo, que não tem nenhum yield no meio: enquanto ela calcula, as outras não andam."},{type:`code`,lang:`python`,code:`from collections import deque

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

laco([baixar("CEP", 2), calcular_sem_pausa(200_000), baixar("frete", 2)])`,runnable:!0,caption:`Mude o número de partes e a ordem das tarefas e preveja a saída antes de rodar.`},{type:`md`,text:`Os três modelos de verdade, para rodar no seu computador:`},{type:`code`,lang:`python`,code:`import asyncio
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

asyncio.run(main())`,runnable:!1,caption:`Rode no seu computador. Troque os três await asyncio.sleep por time.sleep e veja o total voltar a 1 s. Depois troque só o do frete e preveja o total antes de rodar.`},{type:`code`,lang:`python`,code:`import time
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
        print(f"{Pool.__name__}: {time.perf_counter() - inicio:.2f} s")`,runnable:!1,caption:`Rode no seu computador com 4 núcleos ou mais: as threads empatam com o sequencial ou ficam piores (GIL); os processos caem para perto de 1/4, um pouco acima por causa do custo de criá-los.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e8-async-0`,kind:`mcq`,prompt:`Você precisa redimensionar 5.000 fotos de produtos com uma função escrita em Python puro (só cálculo, sem rede), no CPython padrão, numa máquina com 8 núcleos. O que mais encurta o tempo?`,difficulty:`facil`,skills:[`so-concorrencia`],hints:[`Esse trabalho passa o tempo esperando ou calculando?`,`Qual dos três modelos consegue pôr vários núcleos para executar Python ao mesmo tempo, com o GIL?`],explanation:`É trabalho limitado por CPU em Python puro. Threads e corrotinas rodam Python numa thread por vez (GIL e laço de eventos), então não usam os outros núcleos. Processos têm cada um o seu interpretador e o seu GIL: com 8 processos, o tempo cai perto de 1/8, menos o custo de criação e de serializar as imagens.`,options:[{text:`Um ProcessPoolExecutor com 8 processos`,correct:!0,feedback:`Isso: cálculo em Python puro só acelera com vários interpretadores, um por núcleo.`},{text:`asyncio.gather com 5.000 corrotinas`,feedback:`Corrotinas se revezam numa thread só e só trocam no await. Cálculo sem await roda inteiro, uma foto depois da outra, e ainda congela o laço.`},{text:`Um ThreadPoolExecutor com 8 threads`,feedback:`Com o GIL, só uma thread executa bytecode Python por vez. Threads ajudam quando a espera é de E/S, não com cálculo em Python puro.`},{text:`Nenhum: concorrência nunca acelera um programa`,feedback:`Concorrência sem paralelismo não acelera cálculo, mas processos em núcleos diferentes são paralelismo de verdade.`}]}},{type:`exercise`,exercise:{id:`e8-async-1`,kind:`mcq`,prompt:"Um servidor `asyncio` atende centenas de clientes. Alguém escreveu o handler abaixo para respeitar o limite de requisições de uma API externa. O que acontece quando um cliente chama `/frete`?",code:{lang:`python`,code:`async def frete(request):
    time.sleep(2)              # espera o limite da API
    dados = await api.consultar(request.cep)
    return dados`},difficulty:`intermediario`,skills:[`so-concorrencia`],hints:[`Quantas threads executam as corrotinas desse servidor?`,`time.sleep devolve o controle ao laço de eventos? Onde uma corrotina pode ceder a vez?`,`Que versão do sleep cede a vez enquanto espera?`],explanation:`time.sleep é uma chamada bloqueante: segura a thread do laço de eventos por 2 s, e como todas as corrotinas rodam nessa mesma thread, nenhum outro cliente é atendido nesse tempo. A troca de tarefa só acontece no await. A correção é await asyncio.sleep(2); para uma função bloqueante que você não pode trocar, await asyncio.to_thread(funcao).`,options:[{text:`O servidor inteiro para de atender todos os clientes por 2 segundos`,correct:!0,feedback:`Isso: time.sleep não tem await, então o laço de eventos fica preso nessa corrotina. Use await asyncio.sleep(2).`},{text:`Só esse cliente espera 2 segundos; os outros seguem normalmente`,feedback:`Seria assim com await asyncio.sleep(2). time.sleep bloqueia a thread, e o laço de eventos inteiro roda nela.`},{text:`O Python levanta um erro, porque não se pode chamar time.sleep dentro de async def`,feedback:`Não há erro nenhum: o código roda, só que bloqueia o laço. É por isso que o bug passa despercebido em testes com um cliente só.`},{text:`O asyncio move a chamada para uma thread separada automaticamente`,feedback:`O asyncio não sabe que time.sleep bloqueia. Mandar para outra thread é algo que você pede explicitamente, com asyncio.to_thread.`}]}},{type:`exercise`,exercise:{id:`e8-async-2`,kind:`predict`,lang:`python`,prompt:"O laço abaixo é o mesmo da etapa Código. Cada `next` roda a tarefa até o próximo `yield`. O que o programa imprime?",code:`from collections import deque

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
print("fim")`,answer:`A começa
B começa
A passo 0
B passo 0
B passo 1
fim`,difficulty:`intermediario`,skills:[`so-concorrencia`],hints:[`Criar o gerador, tarefa("A", 1), já imprime alguma coisa?`,`No primeiro next de cada tarefa, até onde o código vai? O print do passo fica antes ou depois do yield?`,`Quando A imprime "passo 0", o for dela acaba. O que o next levanta nesse caso, e A volta para a fila?`],explanation:`Criar o gerador não executa nada. O primeiro next de A imprime "A começa" e pausa no yield; o mesmo com B. No segundo next, A imprime "A passo 0", o for acaba, a função termina, e o next levanta StopIteration: A sai da fila. B segue sozinho: "B passo 0", pausa, "B passo 1", termina. É exatamente o que um laço de eventos faz: cada tarefa roda até o próximo ponto de pausa, e o código entre dois pontos de pausa nunca é interrompido.`}},{type:`exercise`,exercise:{id:`e8-async-3`,kind:`code`,lang:`python`,prompt:'Escreva um laço de eventos com **relógio virtual** (nada de esperar de verdade). `rodar(tarefas)` recebe uma lista de pares `(nome, gerador)`. Cada `yield ms` de um gerador significa "`await asyncio.sleep` de `ms` milissegundos".\n\n- O relógio começa em 0 e todas as tarefas começam prontas no instante 0, na ordem da lista.\n- O laço sempre retoma a tarefa com o **menor instante** de acordar. Ao retomá-la, o relógio salta para esse instante; se ela fizer `yield ms`, passa a acordar em `relógio + ms`.\n- Empate no instante: acorda primeiro quem foi **agendado antes** (pela ordem em que os agendamentos foram feitos, não pelo nome).\n- Quando um gerador termina, registre `(nome, relógio)`.\n\nDevolva a lista desses pares, na ordem em que as tarefas terminaram.',difficulty:`intermediario`,skills:[`so-concorrencia`,`ed-pilhas-filas`],hints:[`Que estrutura de dados entrega sempre o menor elemento de forma eficiente? Você a viu com filas de prioridade.`,`O que cada entrada dessa estrutura precisa guardar para você saber quando e quem retomar?`,`Como desempatar dois agendamentos com o mesmo instante sem comparar nomes nem geradores? Pense num número que só cresce.`,`Como você descobre que um gerador terminou?`],explanation:`É o coração do asyncio: uma fila de prioridade de temporizadores (o asyncio usa heapq de verdade para os call_later) e um relógio que salta direto para o próximo evento, em vez de esperar. O contador crescente no desempate garante a ordem FIFO entre agendamentos no mesmo instante e evita que o heapq tente comparar geradores. O tempo total é o da tarefa mais lenta, e não a soma: as esperas se sobrepõem, embora só uma tarefa rode por vez.`,starter:`def rodar(tarefas):
    # tarefas: lista de (nome, gerador); cada yield ms = dormir ms
    # devolva [(nome, instante_em_que_terminou), ...] na ordem de término
    pass`,solution:`import heapq

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
    return fim`,tests:[{name:`esperas se sobrepõem`,code:`def _req(ms):
    yield ms
r = rodar([("cep", _req(300)), ("frete", _req(500)), ("estoque", _req(200))])
assert r == [("estoque", 200), ("cep", 300), ("frete", 500)], f"cada uma termina no próprio tempo, e o total é o da mais lenta (500), não a soma; veio {r!r}"`},{name:`vários yield na mesma tarefa`,code:`def _etapas(*ms):
    for x in ms:
        yield x
r = rodar([("pedido", _etapas(100, 50, 25)), ("outro", _etapas(150))])
assert r == [("outro", 150), ("pedido", 175)], f"o pedido dorme 100, depois 50, depois 25: termina em 175; veio {r!r}"`},{name:`empate: quem foi agendado antes`,code:`def _etapas(*ms):
    for x in ms:
        yield x
r = rodar([("A", _etapas(100)), ("B", _etapas(100))])
assert r == [("A", 100), ("B", 100)], f"mesmo instante: A foi agendada antes; veio {r!r}"
r = rodar([("A", _etapas(50, 50)), ("B", _etapas(100))])
assert r == [("B", 100), ("A", 100)], f"as duas acordam em 100, mas B foi agendada para 100 no instante 0, e A só no instante 50: B primeiro; veio {r!r}"`},{name:`tarefas sem espera e yield 0`,code:`def _nada():
    return
    yield
def _etapas(*ms):
    for x in ms:
        yield x
r = rodar([("x", _nada()), ("y", _nada())])
assert r == [("x", 0), ("y", 0)], f"geradores que terminam sem yield acabam no instante 0, na ordem da lista; veio {r!r}"
r = rodar([("a", _etapas(0, 0)), ("b", _etapas(0))])
assert r == [("b", 0), ("a", 0)], f"yield 0 cede a vez sem avançar o relógio, como asyncio.sleep(0); veio {r!r}"
assert rodar([]) == [], "sem tarefas, devolva lista vazia"`},{name:`relógio virtual, sem espera de verdade`,code:`assert "time.sleep" not in _source and "import asyncio" not in _source, "use um relógio virtual: nada de time.sleep nem asyncio"
def _req(ms):
    yield ms
r = rodar([(f"t{i}", _req(10_000)) for i in range(50)])
assert len(r) == 50 and all(t == 10_000 for _, t in r), "50 tarefas de 10 s cada terminam todas no instante 10000"
assert [n for n, _ in r] == [f"t{i}" for i in range(50)], "com todos os instantes iguais, a ordem de término é a de agendamento"`}]}},{type:`exercise`,exercise:{id:`e8-async-4`,kind:`fix`,lang:`python`,prompt:"Cada saque Pix é uma tarefa (um gerador) num laço cooperativo; o `yield` representa o `await` da consulta ao serviço antifraude. Com dois saques de R$ 80 numa conta com R$ 100, o saldo termina em **−60**. Corrija `saque` para que o saldo nunca fique negativo e só seja aprovado o que o saldo cobre.\n\nA consulta antifraude não pode sumir: todo saque que for aprovado precisa passar por pelo menos um `yield` antes de terminar. O laço `rodar` está certo; não mexa nele.",difficulty:`intermediario`,skills:[`so-concorrencia`],hints:[`Rode os dois saques à mão: o que cada tarefa viu quando conferiu o saldo?`,`Entre conferir o saldo e debitar, outra tarefa pode rodar? Onde exatamente?`,`O trecho entre dois yield nunca é interrompido. Como usar isso para que conferir e debitar aconteçam sem ninguém no meio?`],explanation:`Mesmo numa thread só, o yield (o await) é um ponto onde outra tarefa roda. A versão original confere o saldo, cede a vez e debita depois, confiando numa informação velha: é o check-then-act da lição anterior, com o await no lugar da troca de thread. A correção é não deixar nenhum ponto de pausa entre conferir e debitar: faça a consulta antes e então confira e debite juntos, reconfira o saldo depois do await, ou debite antes do await (reservando o valor) e devolva se a antifraude recusar. Em asyncio real, a alternativa é segurar um asyncio.Lock durante todo o trecho.`,starter:`from collections import deque

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
print(conta, log)`,solution:`from collections import deque

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
print(conta, log)`,tests:[{name:`dois saques de 80 com saldo 100`,code:`from collections import deque as _dq
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
assert sorted(l) == [("aprovado", 80), ("recusado", 80)], f"um aprovado e um recusado; veio {l!r}"`},{name:`três saques: 30, 30 e 50 com saldo 100`,code:`from collections import deque as _dq
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
assert c["saldo"] == 40 and sorted(l) == [("aprovado", 30), ("aprovado", 30), ("recusado", 50)], f"30 e 30 cabem; depois sobram 40 e os 50 não cabem; veio saldo {c['saldo']} e log {l!r}"`},{name:`a consulta antifraude continua lá`,code:`c, l = {"saldo": 100}, []
g = saque(c, 10, l)
try:
    next(g)
except StopIteration:
    raise AssertionError("um saque que será aprovado precisa pausar pelo menos uma vez (o await da antifraude); a sua tarefa terminou sem nenhum yield")
for _ in g:
    pass
assert c["saldo"] == 90 and l == [("aprovado", 10)], f"sozinho, o saque de 10 é aprovado; veio saldo {c['saldo']} e log {l!r}"`},{name:`saque sozinho: no limite e acima do saldo`,code:`c, l = {"saldo": 100}, []
for _ in saque(c, 100, l):
    pass
assert c["saldo"] == 0 and l == [("aprovado", 100)], f"sacar exatamente o saldo é permitido; veio saldo {c['saldo']} e log {l!r}"
c, l = {"saldo": 100}, []
for _ in saque(c, 150, l):
    pass
assert c["saldo"] == 100 and l == [("recusado", 150)], f"150 com saldo 100 é recusado e o saldo não muda; veio saldo {c['saldo']} e log {l!r}"`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e8-async-desafio`,kind:`code`,lang:`python`,prompt:'Uma API de CEP aceita no máximo `limite` requisições simultâneas, e o seu programa usa um `asyncio.Semaphore(limite)` para respeitar isso. Simule esse laço de eventos com relógio virtual. `rodar(tarefas, limite)` recebe uma lista de pares `(nome, gerador)`; os geradores fazem `yield` de pedidos:\n\n- `("dormir", ms)`: a tarefa acorda em `relógio + ms` (como no exercício anterior: menor instante primeiro; empate, quem foi agendado antes; todas começam no instante 0, na ordem da lista);\n- `("adquirir",)`: se há permissão livre, pega uma e **continua na hora**, sem ceder a vez. Senão, entra no fim da fila de espera do semáforo;\n- `("liberar",)`: se há alguém na fila de espera, o primeiro recebe a permissão direto (entrega direta) e é agendado para o **relógio atual**. Senão, a permissão volta a ficar livre. Se isso deixaria mais permissões livres que `limite`, levante `ValueError`, como o `BoundedSemaphore`. Em qualquer caso, quem liberou continua na hora.\n\nDevolva a lista `(nome, instante)` na ordem em que as tarefas terminaram.',difficulty:`desafio`,skills:[`so-concorrencia`,`ed-pilhas-filas`],hints:[`Comece do laço com relógio do exercício anterior. O que muda quando um pedido não é "dormir"?`,`Quando um pedido não faz a tarefa ceder a vez, como você pede o próximo pedido da mesma tarefa sem passar pela fila de prioridade?`,`Quantas estruturas de espera existem agora? A fila do semáforo precisa de prioridade por tempo ou só da ordem de chegada?`,`Na entrega direta, o número de permissões livres muda? E quem acorda: em que instante ele deve ser agendado?`,`Teste o caso em que quem liberou tenta adquirir de novo logo em seguida, com alguém esperando. Quem deve ficar com a permissão?`],explanation:`É, em essência, o que o asyncio.Semaphore faz para limitar requisições simultâneas: um contador, uma fila FIFO de quem espera e o laço de eventos para acordar as tarefas. A entrega direta impede que quem acabou de liberar "fure a fila" pegando a permissão de volta antes de quem já esperava. Note que adquirir com permissão livre não cede a vez: o asyncio também só suspende uma tarefa quando ela realmente precisa esperar.`,starter:`def rodar(tarefas, limite):
    # tarefas: lista de (nome, gerador)
    # pedidos: ("dormir", ms), ("adquirir",), ("liberar",)
    # devolva [(nome, instante_em_que_terminou), ...] na ordem de término
    pass`,solution:`import heapq
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
    return fim`,tests:[{name:`limite 2 com quatro requisições`,code:`def _req(ms):
    yield ("adquirir",)
    yield ("dormir", ms)
    yield ("liberar",)
r = rodar([("A", _req(300)), ("B", _req(100)), ("C", _req(200)), ("D", _req(100))], 2)
assert r == [("B", 100), ("A", 300), ("C", 300), ("D", 400)], f"A e B começam; C entra quando B libera (100) e D quando A libera (300); veio {r!r}"`},{name:`limite 1 serializa, em ordem de chegada`,code:`def _req(ms):
    yield ("adquirir",)
    yield ("dormir", ms)
    yield ("liberar",)
r = rodar([("A", _req(100)), ("B", _req(200)), ("C", _req(50))], 1)
assert r == [("A", 100), ("B", 300), ("C", 350)], f"com limite 1, uma por vez, na ordem em que pediram; veio {r!r}"
r = rodar([("A", _req(100)), ("B", _req(10)), ("C", _req(10))], 1)
assert r == [("A", 100), ("B", 110), ("C", 120)], f"quem espera é atendido em ordem de chegada (FIFO); veio {r!r}"`},{name:`limite folgado: como se não houvesse semáforo`,code:`def _req(ms):
    yield ("adquirir",)
    yield ("dormir", ms)
    yield ("liberar",)
r = rodar([("A", _req(300)), ("B", _req(100)), ("C", _req(200))], 5)
assert r == [("B", 100), ("C", 200), ("A", 300)], f"com 5 permissões, as três rodam juntas; veio {r!r}"
def _so_dorme(*ms):
    for x in ms:
        yield ("dormir", x)
r = rodar([("x", _so_dorme(50, 50)), ("y", _so_dorme(70))], 1)
assert r == [("y", 70), ("x", 100)], f"tarefas que não usam o semáforo só dormem; veio {r!r}"`},{name:`nunca mais que limite ao mesmo tempo`,code:`_ativos = {"agora": 0, "max": 0}
def _medida(ms):
    yield ("adquirir",)
    _ativos["agora"] += 1
    _ativos["max"] = max(_ativos["max"], _ativos["agora"])
    yield ("dormir", ms)
    _ativos["agora"] -= 1
    yield ("liberar",)
r = rodar([(f"r{i}", _medida(10 * (i % 4) + 10)) for i in range(10)], 3)
assert _ativos["max"] == 3, f"no máximo 3 requisições ao mesmo tempo (e devem chegar a 3); chegaram a {_ativos['max']}"
assert len(r) == 10, f"todas as 10 terminam; vieram {len(r)}"`},{name:`entrega direta: quem liberou não fura a fila`,code:`def _duas_vezes():
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
assert r == [("B", 110), ("A", 210)], f"em 100, A libera e a permissão vai direto para B, que já esperava; A espera B terminar. Veio {r!r}"`},{name:`adquirir com permissão livre não cede a vez`,code:`def _x():
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
assert r == [("X", 50), ("Y", 60)], f"X adquire, libera e adquire de novo sem ceder a vez; Y espera até 50. Veio {r!r}"`},{name:`liberar demais é erro`,code:`def _so_libera():
    yield ("liberar",)
try:
    rodar([("x", _so_libera())], 2)
except ValueError:
    pass
else:
    raise AssertionError("liberar sem ter adquirido deixaria 3 permissões num limite de 2: levante ValueError")`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:"No **chat em rede**, você vai juntar tudo: um servidor `asyncio` com muitos clientes, estado compartilhado (salas e apelidos) alterado sem corrida entre os await, e nenhuma chamada bloqueante dentro dos handlers. Antes de começar, liste em que pontos do seu código há await entre conferir e alterar o estado."},{type:`project`,projectId:`p8-chat`}]},{stage:`revisao`,blocks:[{type:`md`,text:'- Concorrência é lidar com várias tarefas ao mesmo tempo; paralelismo é executá-las ao mesmo tempo. Esperar em paralelo resolve E/S; calcular em paralelo exige vários núcleos.\n- asyncio: uma thread, laço de eventos, troca só no await (cooperativa). Uma chamada bloqueante congela tudo: use a versão assíncrona, `asyncio.to_thread` ou um processo.\n- Chamar uma corrotina sem await não a executa ("coroutine was never awaited"); para várias juntas, `gather`, `create_task` ou `TaskGroup`.\n- Threads: troca a qualquer momento (preemptiva). No CPython com GIL, ajudam com E/S e não com cálculo em Python puro. O GIL não torna o seu código seguro.\n- Processos: paralelismo de verdade para cálculo, pagando criação, memória e serialização; `if __name__ == "__main__":` com spawn/forkserver.\n- Corridas também existem com asyncio: nada de await entre conferir e agir, ou use `asyncio.Lock`.\n- Lei de Amdahl: S = 1 / ((1 − p) + p/n); a parte sequencial limita o ganho.'},{type:`callout`,tone:`english`,text:`- **concurrency vs. parallelism**: concorrência × paralelismo
- **I/O-bound / CPU-bound**: limitado por E/S / por CPU
- **coroutine, event loop, await, task**: corrotina, laço de eventos, ponto de espera, tarefa
- **cooperative vs. preemptive multitasking**: multitarefa cooperativa × preemptiva
- **blocking call, "don't block the event loop"**: chamada bloqueante, "não bloqueie o laço de eventos"
- **GIL, free-threaded build**: trava global do interpretador, versão sem GIL
- **process pool, pickling, Amdahl's law**: pool de processos, serialização, lei de Amdahl

Frase de palestra (Rob Pike, *Concurrency is not parallelism*, 2012): *"Concurrency is about dealing with lots of things at once. Parallelism is about doing lots of things at once."*

Frase típica de entrevista: *"For I/O-bound work I'd use asyncio or a thread pool; for CPU-bound work in CPython I'd use a process pool, because the GIL lets only one thread execute Python bytecode at a time."*`,title:`English corner`}]}],cards:[{id:`l8-async-threads-processos#1`,front:`Qual é a diferença entre concorrência e paralelismo?`,back:`Concorrência é ter várias tarefas em andamento, revezando; paralelismo é executar várias literalmente ao mesmo tempo, em núcleos diferentes.`},{id:`l8-async-threads-processos#2`,front:`Em que pontos uma corrotina asyncio pode ceder a vez a outra?`,back:`Só nos await (de algo que precise esperar). Entre dois await, nenhuma outra tarefa do mesmo laço roda.`},{id:`l8-async-threads-processos#3`,front:`O que acontece com um servidor asyncio se um handler chama time.sleep(2)?`,back:`O laço de eventos inteiro fica parado 2 s: nenhum outro cliente é atendido. A correção é await asyncio.sleep(2) ou asyncio.to_thread para código bloqueante.`},{id:`l8-async-threads-processos#4`,front:`Por que threads não aceleram cálculo em Python puro no CPython padrão?`,back:`Por causa do GIL: só uma thread executa bytecode Python por vez. Ele é liberado na espera de E/S, por isso threads ajudam com E/S.`},{id:`l8-async-threads-processos#5`,front:`Quais são os custos de usar processos em vez de threads?`,back:`Criação mais cara, um interpretador inteiro de memória por processo e serialização (pickle) de argumentos e resultados entre processos.`},{id:`l8-async-threads-processos#6`,front:`Como pode haver condição de corrida num programa asyncio de uma thread só?`,back:`Quando há um await entre conferir um estado e agir sobre ele: outra tarefa roda no meio e muda o estado. Reconfira depois do await ou use asyncio.Lock.`},{id:`l8-async-threads-processos#7`,front:`Pela lei de Amdahl, qual é o ganho com 8 núcleos se 90% do trabalho é paralelizável?`,back:`1 / (0,1 + 0,9/8) ≈ 4,7 vezes; o limite, com núcleos infinitos, é 10 vezes.`}]};export{e as default};
//# sourceMappingURL=l8-async-threads-processos-CdqSUvmO.js.map