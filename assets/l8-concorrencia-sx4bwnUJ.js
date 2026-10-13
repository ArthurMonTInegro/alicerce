var e={id:`l8-concorrencia`,moduleId:`m8-3`,title:`Concorrência, condições de corrida e sincronização`,titleEn:`Concurrency, race conditions and synchronization`,summary:"Por que `contador += 1` pode dar errado com duas threads, e como locks resolvem (e criam deadlocks).",minutes:40,objectives:[`Explicar uma condição de corrida`,`Identificar seções críticas`,`Usar locks/mutex`,`Reconhecer as condições de deadlock`],skills:[`so-concorrencia`],terms:[{pt:`condição de corrida`,en:`race condition`,def:`Resultado depende da ordem imprevisível de execução.`},{pt:`seção crítica`,en:`critical section`,def:`Trecho que acessa dado compartilhado e não pode ser intercalado.`},{pt:`trava / exclusão mútua`,en:`lock / mutex`,def:`Mecanismo que garante que só uma thread entre na seção crítica.`},{pt:`impasse`,en:`deadlock`,def:`Threads esperando umas pelas outras para sempre.`},{pt:`atômico`,en:`atomic`,def:`Indivisível: acontece por inteiro, sem intercalação.`}],references:[`ostep`,`tanenbaum-so`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`**Concorrência** é ter várias tarefas em andamento ao mesmo tempo. Quando duas threads mexem no **mesmo dado**, a ordem em que suas instruções se intercalam pode mudar o resultado: isso é uma **{{condição de corrida|race condition}}**, um dos bugs mais difíceis de reproduzir.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`\`contador += 1\` parece uma operação, mas são três: **ler** contador, **somar** 1, **escrever**. Se duas threads leem o mesmo valor (10) antes de qualquer uma escrever, as duas escrevem 11 — um incremento se perdeu.

**Solução**: proteger a **seção crítica** com um **lock** (mutex): só uma thread por vez entra.

\`\`\`
lock = threading.Lock()
with lock:
    contador += 1
\`\`\`

**Deadlock** acontece quando há, ao mesmo tempo (condições de Coffman): exclusão mútua, posse-e-espera, não preempção e **espera circular** (T1 tem A e quer B; T2 tem B e quer A). Prevenção comum: **sempre adquirir locks na mesma ordem**.`},{type:`callout`,tone:`info`,text:`No navegador, o Python do Alicerce (Pyodide) não cria threads de verdade. Por isso, a demonstração abaixo **simula** o escalonador intercalando passos de duas "threads" — o que é ótimo para ver exatamente onde o incremento se perde.`}]},{stage:`exemplo`,blocks:[{type:`code`,lang:`python`,code:`# Simulação: cada "thread" executa ler -> somar -> escrever.
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
print("intercalada:", executar(intercalada))   # 1  <- incremento perdido!`,runnable:!0}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`# No seu computador (CPython), com threads reais:
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
print(contador)  # 400000 com lock`,runnable:!1,caption:`Rode no seu computador. Sem o lock, o resultado pode variar entre execuções.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e8-conc-0`,kind:`mcq`,prompt:"Duas threads fazem `contador += 1` ao mesmo tempo, sem lock. O que pode acontecer?",difficulty:`facil`,skills:[`so-concorrencia`],hints:["`contador += 1` é ler, somar e escrever: três passos."],explanation:`A operação não é atômica: as duas threads podem ler o mesmo valor antigo e escrever o mesmo resultado, perdendo um incremento. Isso é uma condição de corrida (race condition).`,options:[{text:`Um dos incrementos pode se perder`,correct:!0,feedback:`Exatamente: condição de corrida.`},{text:`O programa sempre trava`,feedback:`Travar para sempre é deadlock, que exige locks.`},{text:`Nada, += é sempre seguro`,feedback:`Não é atômico: são vários passos.`},{text:`O Python lança um erro`,feedback:`Não há erro: o resultado só fica errado, às vezes. Por isso é difícil de achar.`}]}},{type:`exercise`,exercise:{id:`e8-conc-1`,kind:`mcq`,prompt:"Duas threads executam `saldo = saldo - 100` em paralelo sobre saldo = 500, sem lock. Quais resultados finais são possíveis?",difficulty:`intermediario`,skills:[`so-concorrencia`],hints:[`Cada operação é ler → calcular → escrever. E se as duas lerem 500?`],explanation:`Se uma termina antes da outra ler: 300. Se as duas leem 500: ambas escrevem 400. Logo, 300 ou 400.`,options:[{text:`Só 300`,feedback:`Seria verdade se a operação fosse atômica.`},{text:`300 ou 400`,correct:!0,feedback:`Isso: o 400 é a atualização perdida (lost update).`},{text:`300, 400 ou 500`,feedback:`Pelo menos uma escrita de 400 sempre acontece.`},{text:`Erro de execução`,feedback:`Não há erro: é exatamente isso que torna o bug traiçoeiro.`}]}},{type:`exercise`,exercise:{id:`e8-conc-2`,kind:`code`,lang:`python`,prompt:'Usando a simulação da lição, escreva `todas_intercalacoes()` que devolve o **conjunto** de resultados finais possíveis para as duas "threads" (cada uma faz ler, somar, escrever, nessa ordem, começando com contador = 0). Gere todas as intercalações que respeitam a ordem interna de cada thread.',difficulty:`avancado`,skills:[`so-concorrencia`,`alg-recursao`],hints:[`Uma intercalação escolhe, a cada passo, avançar T1 ou T2 (se ainda houver passos).`,"Recursão: `gerar(i, j, prefixo)`, onde i e j são quantos passos cada thread já fez."],explanation:`Há C(6,3) = 20 intercalações e só dois resultados: {1, 2}. Raciocinar sobre todas as intercalações é a base de técnicas de verificação de programas concorrentes (model checking).`,starter:`PASSOS = ["ler", "somar", "escrever"]

def executar(ordem):
    c = 0
    local = {}
    for th, passo in ordem:
        if passo == "ler": local[th] = c
        elif passo == "somar": local[th] += 1
        else: c = local[th]
    return c

def todas_intercalacoes():
    pass`,solution:`PASSOS = ["ler", "somar", "escrever"]

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
    return resultados`,tests:[{name:`resultados possíveis`,code:`assert todas_intercalacoes() == {1, 2}`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e8-conc-desafio`,kind:`code`,lang:`python`,prompt:'Detecte deadlock: escreva `tem_deadlock(espera)` que recebe um dict "thread → thread pela qual ela espera" (ou None) e devolve True se há **espera circular**.',difficulty:`avancado`,skills:[`so-concorrencia`,`ed-grafos`],hints:[`Isso é um grafo (grafo de espera, *wait-for graph*). Deadlock = ciclo.`,`Como cada thread espera no máximo uma, siga a cadeia a partir de cada thread, guardando as visitadas no caminho.`],explanation:`Sistemas operacionais e bancos de dados detectam deadlocks procurando ciclos no grafo de espera — e então abortam uma das transações.`,starter:`def tem_deadlock(espera):
    pass
`,solution:`def tem_deadlock(espera):
    for inicio in espera:
        caminho = set()
        t = inicio
        while t is not None:
            if t in caminho:
                return True
            caminho.add(t)
            t = espera.get(t)
    return False`,tests:[{name:`ciclo de 2`,code:`assert tem_deadlock({"T1": "T2", "T2": "T1"})`},{name:`cadeia sem ciclo`,code:`assert not tem_deadlock({"T1": "T2", "T2": "T3", "T3": None})`},{name:`ciclo de 3`,code:`assert tem_deadlock({"A": "B", "B": "C", "C": "A", "D": None})`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:`**No seu computador**: escreva um programa com duas threads e dois locks que **causa** um deadlock (adquirindo em ordens diferentes), observe-o travar, e depois corrija impondo uma ordem global de aquisição.`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Race condition: resultado depende da intercalação.
- Seção crítica + lock = exclusão mútua.
- Deadlock: espera circular; previna com ordem fixa de locks.`}]}],cards:[{id:`l8-concorrencia#1`,front:"Por que `x += 1` não é seguro entre threads?",back:`Porque são várias operações (ler, somar, escrever) que podem ser intercaladas.`},{id:`l8-concorrencia#2`,front:`Como prevenir deadlocks de forma simples?`,back:`Adquirindo os locks sempre na mesma ordem.`}]};export{e as default};
//# sourceMappingURL=l8-concorrencia-sx4bwnUJ.js.map