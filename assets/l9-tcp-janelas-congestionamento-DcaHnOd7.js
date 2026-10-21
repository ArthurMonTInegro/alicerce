var e={id:`l9-tcp-janelas-congestionamento`,moduleId:`m9-1`,title:`TCP por dentro: sequência, retransmissão, janelas e congestionamento (e o que o QUIC muda)`,titleEn:`TCP in depth: sequence numbers, retransmission, windows and congestion control (and what QUIC changes)`,summary:`Como o TCP numera bytes e confirma com ACKs cumulativos, quando retransmite (temporizador com RTO adaptativo e três ACKs duplicados), por que a janela limita a vazão a janela/RTT, a diferença entre controle de fluxo e de congestionamento, o dente de serra do Reno, o que fazem o CUBIC e o BBR, e por que o QUIC reconstruiu tudo isso sobre o UDP.`,minutes:50,objectives:[`Calcular números de sequência e de ACK a partir do tamanho dos segmentos, inclusive o efeito de SYN e FIN`,`Simular um receptor TCP que guarda segmentos fora de ordem e envia ACKs cumulativos e duplicados`,`Explicar os dois gatilhos de retransmissão e calcular o RTO pela RFC 6298`,`Usar a relação vazão ≤ janela / RTT e o produto banda × atraso para achar o gargalo de uma conexão`,`Distinguir controle de fluxo (rwnd, o receptor) de controle de congestionamento (cwnd, a rede)`,`Simular a partida lenta, o aumento aditivo e as reações do Reno a três ACKs duplicados e a um timeout`,`Explicar o bloqueio de cabeça de fila e o que o QUIC muda: fluxos independentes, handshake com TLS e migração de conexão`],skills:[`redes-tcpip`],terms:[{pt:`melhor esforço`,en:`best effort`,def:`Serviço que tenta entregar cada pacote, mas não promete entrega, ordem nem prazo; é o que o IP oferece.`,example:`IP provides a best-effort delivery service.`},{pt:`segmento`,en:`segment`,def:`A unidade do TCP: um cabeçalho TCP (20 bytes ou mais) mais um pedaço do fluxo de bytes.`},{pt:`número de sequência`,en:`sequence number`,def:`Posição, no fluxo de bytes, do primeiro byte de dados do segmento. Começa num valor aleatório (ISN) em cada conexão.`,example:`The sequence number of the first data octet in this segment.`},{pt:`confirmação cumulativa`,en:`cumulative acknowledgment`,def:`O ACK informa o próximo byte esperado, o que confirma de uma vez todos os bytes anteriores.`},{pt:`ACK duplicado`,en:`duplicate ACK`,def:`ACK repetido, com o mesmo número, enviado quando chega um segmento fora de ordem: sinal de que há um buraco.`},{pt:`retransmissão rápida`,en:`fast retransmit`,def:`Reenviar um segmento ao receber três ACKs duplicados, sem esperar o temporizador.`},{pt:`tempo de ida e volta`,en:`round-trip time (RTT)`,def:`Tempo entre enviar um segmento e receber a confirmação dele.`},{pt:`tempo limite de retransmissão`,en:`retransmission timeout (RTO)`,def:`Quanto o remetente espera por um ACK antes de reenviar; calculado a partir das medidas de RTT.`,example:`The RTO is doubled after each retransmission (exponential backoff).`},{pt:`tamanho máximo de segmento`,en:`maximum segment size (MSS)`,def:`Maior quantidade de dados num segmento, anunciada no SYN; 1460 bytes numa Ethernet de MTU 1500.`},{pt:`janela deslizante`,en:`sliding window`,def:`Limite de bytes enviados e ainda não confirmados; à medida que chegam ACKs, a janela anda para a frente.`},{pt:`controle de fluxo`,en:`flow control`,def:`Mecanismo para o remetente não mandar mais do que o buffer do receptor comporta (janela de recepção, rwnd).`},{pt:`controle de congestionamento`,en:`congestion control`,def:`Mecanismo para o remetente não mandar mais do que a rede comporta (janela de congestionamento, cwnd).`,example:`Linux uses CUBIC as the default congestion control algorithm.`},{pt:`partida lenta`,en:`slow start`,def:`Fase em que a cwnd dobra a cada RTT, do valor inicial até o limiar ssthresh.`},{pt:`aumento aditivo, diminuição multiplicativa`,en:`additive increase, multiplicative decrease (AIMD)`,def:`Regra que soma 1 MSS por RTT enquanto vai bem e corta a janela pela metade numa perda; produz o gráfico em dente de serra.`},{pt:`produto banda × atraso`,en:`bandwidth-delay product (BDP)`,def:`Capacidade do enlace vezes o RTT: quantos bytes precisam estar em voo para ocupar o enlace inteiro.`},{pt:`bloqueio de cabeça de fila`,en:`head-of-line blocking`,def:`Quando um dado perdido segura a entrega de tudo o que vem depois dele, mesmo do que já chegou.`},{pt:`migração de conexão`,en:`connection migration`,def:`No QUIC, a conexão continua quando o IP ou a porta do cliente mudam, porque é identificada por um ID de conexão.`}],references:[`kurose-ross`,`rfc9293`,`stanford-cs144`,`cloudflare-learning`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`O IP entrega no **{{melhor esforço|best effort}}**: um pacote pode se perder (a fila de um roteador encheu), chegar duplicado, chegar fora de ordem ou corrompido. A lição anterior listou o que o TCP promete por cima disso. Agora abrimos a máquina, que tem quatro peças:

1. **{{números de sequência|sequence number}}** contando bytes, e **ACKs** dizendo "recebi tudo até aqui";
2. **retransmissão**, por um temporizador que se adapta ao RTT medido e por um alarme mais rápido, os ACKs duplicados;
3. uma **{{janela deslizante|sliding window}}**, que deixa vários segmentos em voo ao mesmo tempo;
4. dois freios diferentes: o **{{controle de fluxo|flow control}}**, para não afogar o receptor, e o **{{controle de congestionamento|congestion control}}**, para não afogar a rede.

Entender essas peças explica por que um download do outro lado do mundo é mais lento que um daqui com a mesma fibra, por que a chamada de vídeo trava quando alguém da casa baixa um jogo, e por que o HTTP/3 trocou o TCP pelo QUIC, que roda sobre UDP.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`### Um fluxo de bytes numerado
O TCP não numera segmentos: numera **bytes**. Cada conexão começa num número inicial aleatório, o ISN (a RFC 9293 recomenda gerá-lo de um jeito imprevisível, para dificultar que alguém injete segmentos falsos numa conexão alheia). Um {{segmento|segment}} com \`seq = 1001\` e 500 bytes de dados carrega os bytes 1001 a 1500, e o próximo começa em 1501.

O campo ACK traz **o próximo byte que o receptor espera**. "ACK 1501" quer dizer "recebi tudo até 1500, mande o 1501". É uma {{confirmação cumulativa|cumulative acknowledgment}}: um único ACK confirma todos os bytes anteriores, então perder um ACK raramente importa, porque o próximo cobre o mesmo trecho.

Dois detalhes: o **SYN e o FIN consomem um número de sequência cada**, embora não levem dados. Por isso, se o cliente escolhe ISN = x, o primeiro byte de dados dele é x + 1. E o Wireshark, para facilitar, mostra números **relativos**, começando em 0 no SYN.

O tamanho de cada segmento é limitado pelo {{tamanho máximo de segmento|maximum segment size (MSS)}}, que cada lado anuncia no SYN: 1460 bytes numa Ethernet com MTU 1500 (ou 1452 numa conexão PPPoE, comum em fibra no Brasil).

Se chega um segmento **fora de ordem**, o receptor o guarda no buffer, mas o ACK não pode pular o buraco: ele repete o mesmo número. Esse é o **{{ACK duplicado|duplicate ACK}}**, e a RFC 5681 pede que ele seja enviado na hora, sem atraso, porque é informação valiosa para o remetente. (Com tudo em ordem, o receptor pode atrasar um pouco o ACK para confirmar dois segmentos de uma vez; a RFC 9293 limita esse atraso a menos de meio segundo.)

### Quando reenviar
**Gatilho 1: o temporizador.** Se o ACK não chega em RTO segundos, o segmento mais antigo não confirmado é reenviado. O {{RTO|retransmission timeout (RTO)}} não pode ser fixo: um RTT de 1 ms numa rede local e de 600 ms num satélite geoestacionário pedem esperas bem diferentes. A RFC 6298 manda o remetente medir o {{tempo de ida e volta|round-trip time (RTT)}} e manter duas médias móveis:`},{type:`table`,head:[`Quando`,`Atualização (R = nova medida de RTT)`],rows:[[`primeira medida`,`SRTT = R; RTTVAR = R / 2`],[`medidas seguintes, nesta ordem`,`RTTVAR = ¾ · RTTVAR + ¼ · |SRTT − R|, e depois SRTT = ⅞ · SRTT + ⅛ · R`],[`sempre`,`RTO = SRTT + 4 · RTTVAR (a fórmula exata é SRTT + max(G, 4 · RTTVAR), em que G é a granularidade do relógio; a RFC recomenda um piso de 1 s, e o Linux usa piso de 200 ms)`],[`a cada timeout`,`RTO dobra (recuo exponencial) até um ACK novo chegar`]],caption:`O RTTVAR mede o quanto o RTT oscila. Numa rede instável, o RTO fica bem acima da média, para não reenviar à toa.`},{type:`md`,text:`Uma sutileza, o **algoritmo de Karn**: não se mede o RTT de um segmento retransmitido, porque, quando o ACK chega, não dá para saber se ele confirma o envio original ou a cópia.

**Gatilho 2: três ACKs duplicados.** Esperar o RTO é lento. Se o remetente recebe **três ACKs duplicados** (quatro ACKs iguais seguidos), conclui que um segmento se perdeu e os seguintes estão chegando, e faz a **{{retransmissão rápida|fast retransmit}}** daquele segmento na hora. Por que três e não um? Porque a rede às vezes só troca a ordem de dois pacotes, o que gera um ou dois duplicados sem perda nenhuma.

Com a opção **SACK** (RFC 2018, ativa por padrão nos sistemas atuais), o receptor também conta quais blocos depois do buraco ele já tem, e o remetente reenvia só o que falta.

### Janela deslizante: a vazão é janela / RTT
Se o remetente mandasse um segmento e esperasse o ACK para mandar o próximo, faria 1 segmento por RTT: com 1460 bytes e RTT de 100 ms, uns 117 kbit/s, numa fibra de 500 Mbit/s. Por isso o TCP deixa até **W bytes em voo** (enviados e ainda não confirmados). Cada ACK que chega libera espaço e a janela "desliza" para a frente. A conta que manda em tudo:

**vazão máxima ≈ W / RTT**

Para ocupar um enlace de capacidade C, a janela precisa ser pelo menos **C × RTT**, o {{produto banda × atraso|bandwidth-delay product (BDP)}}. Uma fibra de 100 Mbit/s até um servidor nos Estados Unidos, com RTT da ordem de 120 ms, pede 100 Mbit/s × 0,12 s = 12 Mbit = **1,5 MB** em voo. O campo de janela do cabeçalho TCP tem só 16 bits (máximo 65.535 bytes), o que limitaria essa conexão a 65.535 × 8 / 0,12 ≈ 4,4 Mbit/s. Por isso existe a opção **window scale** (RFC 7323), negociada no SYN, que multiplica o campo por até 2¹⁴, permitindo janelas de quase 1 GiB.

A janela efetiva é o **menor de dois limites**: \`min(rwnd, cwnd)\`, um imposto pelo receptor e outro pela rede.

### Controle de fluxo: o receptor manda no ritmo
Todo segmento leva, no campo de janela, a **rwnd**: quanto espaço livre ainda há no buffer de recepção. Se o aplicativo do outro lado lê devagar (um programa que processa cada linha recebida antes de ler a próxima), o buffer enche, a rwnd cai e chega a 0; o remetente para. Para não ficar travado se o aviso de "abri espaço" se perder, ele manda de tempos em tempos uma sondagem de janela (o *persist timer*).

### Controle de congestionamento: adivinhando a rede
Ninguém avisa ao remetente quanto a rede aguenta. Ele **descobre**: a perda de um pacote é o sinal de que alguma fila de roteador encheu. A janela de congestionamento, **cwnd**, segue as regras da RFC 5681 (o TCP Reno), medidas em MSS:`},{type:`table`,head:[`Situação`,`O que acontece com a cwnd`,`Ritmo`],rows:[[`início da conexão`,`começa na janela inicial: 10 MSS no Linux e na maioria dos sistemas (RFC 6928)`,`—`],[`{{partida lenta|slow start}} (cwnd < ssthresh)`,`+1 MSS a cada ACK`,`dobra a cada RTT: crescimento exponencial`],[`evitar congestionamento (cwnd ≥ ssthresh)`,`+1 MSS a cada RTT, aproximadamente`,`cresce em linha reta: aumento aditivo`],[`3 ACKs duplicados (perda isolada)`,`ssthresh = metade do que estava em voo (mínimo 2 MSS); cwnd = ssthresh (na recuperação rápida, temporariamente ssthresh + 3)`,`diminuição multiplicativa`],[`timeout (perda grave, nada chegando)`,`ssthresh = metade do que estava em voo (mínimo 2 MSS); cwnd = 1 MSS, e volta à partida lenta`,`recomeça do zero`]],caption:`O ssthresh (slow start threshold) é a memória do TCP: "da última vez, os problemas começaram por volta daqui".`},{type:`md`,text:`A combinação "soma devagar, corta pela metade" é o **{{AIMD|additive increase, multiplicative decrease (AIMD)}}**, que dá o famoso gráfico em **dente de serra**. Ela também é justa: duas conexões AIMD com o mesmo RTT dividindo o mesmo gargalo convergem para metades parecidas da banda (o argumento clássico de Chiu e Jain, que o Kurose & Ross desenha).

Por que um timeout é tratado como pior do que três ACKs duplicados? Porque ACKs duplicados provam que os segmentos seguintes **estão chegando**: a rede ainda funciona, só perdeu um. Um timeout significa que nada voltou.

O Reno é o modelo de ensino. Na prática:

- o **CUBIC** (RFC 9438) é o padrão no Linux, no Windows e no macOS: depois de uma perda, a janela cresce como uma função cúbica do tempo (rápido longe do ponto da última perda, devagar perto dele) e corta para 70%, e não 50%, o que aproveita melhor enlaces de BDP alto;
- o **BBR**, criado pelo Google, não espera perda: estima a banda do gargalo e o menor RTT e tenta manter em voo só o produto dos dois.

Por que isso importa no dia a dia: roteadores domésticos com filas enormes deixam os algoritmos baseados em perda encherem a fila antes de verem qualquer perda. Quando alguém da casa baixa um jogo, o RTT de todo mundo sobe de 20 ms para centenas de milissegundos e a chamada de vídeo trava. O fenômeno se chama *bufferbloat*.`},{type:`callout`,tone:`deep`,text:`Uma aproximação clássica (Mathis et al., 1997) para o TCP Reno em regime: vazão ≈ (MSS / RTT) · (1,22 / √p), em que p é a taxa de perda. Com MSS de 1460 bytes, RTT de 100 ms e só **1%** de perda, dá 14.600 B/s × 12,2 ≈ 178 kB/s, cerca de 1,4 Mbit/s, por mais rápida que seja a fibra. Duas lições: a vazão cai com o RTT (servidores perto do usuário, as CDNs, ajudam muito) e com a raiz da perda (um Wi-Fi ruim derruba a conexão inteira).`,title:`Quanto custa 1% de perda`},{type:`md`,text:`### Abrir e fechar
O handshake da lição anterior faz mais do que "dizer oi": cada lado informa o **próprio ISN** (e o outro confirma com ISN + 1) e as opções que suporta: MSS, window scale, SACK e timestamps. No fechamento, **cada sentido fecha separado**: um lado manda FIN, o outro confirma; depois o outro manda o próprio FIN, que também é confirmado. Quem fechou primeiro fica no estado **TIME_WAIT** por 2 × MSL (no Linux, 60 s), para reenviar o último ACK se ele se perder e para que segmentos atrasados não se misturem com uma conexão nova entre as mesmas portas. É por isso que um servidor com muitas conexões curtas mostra milhares de sockets em TIME_WAIT no \`ss -tan\`.

### UDP e QUIC: refazendo o transporte por cima do UDP
O cabeçalho UDP tem 8 bytes: porta de origem, porta de destino, comprimento e soma de verificação. Nada de sequência, ACK ou janela. Isso parece pobre, mas é uma página em branco: qualquer coisa pode ser construída por cima, **fora do kernel**. Foi o que o Google começou e a IETF padronizou como **QUIC** (RFC 9000, 9001 e 9002, de 2021), o transporte do HTTP/3. As peças desta lição estão todas lá (números, ACKs, retransmissão, controle de fluxo e de congestionamento), mas reorganizadas:`},{type:`table`,head:[``,`TCP (+ TLS 1.3)`,`QUIC`],rows:[[`onde roda`,`no kernel do sistema operacional`,`no próprio aplicativo ou biblioteca, sobre UDP (em geral na porta 443)`],[`até o primeiro byte de dados de uma conexão nova`,`2 RTT: 1 do handshake TCP + 1 do TLS`,`1 RTT: transporte e TLS 1.3 no mesmo handshake; 0 RTT ao retomar uma conexão (os dados 0-RTT podem ser repetidos por um atacante, então só servem para pedidos idempotentes)`],[`vários fluxos (CSS, JS, imagens)`,`um único fluxo de bytes: uma perda segura tudo o que vem depois`,`fluxos independentes: uma perda só atrasa o fluxo a que o dado pertence`],[`numeração`,`números de sequência dos bytes; a retransmissão reusa o número`,`números de pacote que nunca se repetem; o dado reenviado vai num pacote novo, então medir RTT nunca é ambíguo`],[`identidade da conexão`,`IP e porta de origem e de destino`,`um ID de conexão: sobrevive à troca do Wi-Fi pelo 4G`],[`cabeçalhos`,`visíveis para qualquer equipamento no caminho`,`quase tudo cifrado, inclusive os números de pacote`],[`controle de congestionamento`,`Reno, CUBIC, BBR no kernel`,`as mesmas ideias (a RFC 9002 descreve um parecido com o NewReno); cada implementação escolhe`]]},{type:`md`,text:`O **{{bloqueio de cabeça de fila|head-of-line blocking}}** é a motivação principal. O HTTP/2 manda vários arquivos misturados numa única conexão TCP; se um pacote com um pedaço do JavaScript se perde, o TCP segura **todos** os bytes que chegaram depois, inclusive os das imagens, até a retransmissão chegar, porque ele só sabe entregar um fluxo em ordem. O QUIC conhece os fluxos e entrega cada um assim que ele estiver completo.

A **{{migração de conexão|connection migration}}** é a outra vantagem visível: no ônibus, o celular troca do Wi-Fi da rodoviária para o 4G e muda de IP. Uma conexão TCP é identificada pelo par de IPs e portas e morre; uma conexão QUIC continua, porque é identificada pelo ID de conexão.

Por que não melhorar o TCP? Porque mudanças no TCP dependem de atualizar o kernel de bilhões de aparelhos e de não serem barradas por equipamentos no caminho (firewalls e NATs que conhecem o cabeçalho TCP e descartam o que estranham). Rodar no espaço do usuário e cifrar os cabeçalhos é o jeito de o protocolo continuar podendo evoluir. O custo: algumas redes bloqueiam ou limitam UDP, e por isso os navegadores voltam para o TCP quando o QUIC não passa; e processar pacotes fora do kernel gasta mais CPU.`},{type:`callout`,tone:`info`,text:`A lição anterior disse que o TCP dá entrega "sem duplicatas". Isso vale **dentro de uma conexão**. Se a conexão cai depois que o servidor processou um Pix, mas antes de a resposta chegar, o aplicativo não sabe se deu certo e pode tentar de novo por outra conexão. Por isso APIs de pagamento usam chaves de idempotência: garantias de transporte não substituem garantias de aplicação.`,title:`O que o TCP não garante`}]},{stage:`exemplo`,blocks:[{type:`md`,text:`Um servidor envia segmentos de 1000 bytes, com números relativos começando em 1, e a cwnd permite 5 em voo. O segundo segmento se perde num roteador congestionado. Acompanhe os ACKs:`},{type:`table`,head:[`Passo`,`Remetente envia`,`O que acontece no receptor`,`ACK devolvido`,`Remetente pensa`],rows:[[`1`,`seq 1 (bytes 1–1000)`,`chega em ordem`,`ACK 1001`,`tudo certo; a janela anda`],[`2`,`seq 1001 (bytes 1001–2000)`,`**perdido** no caminho`,`—`,`—`],[`3`,`seq 2001`,`chega fora de ordem: guarda no buffer`,`ACK 1001 (duplicado 1)`,`pode ser só reordenação`],[`4`,`seq 3001`,`guarda no buffer`,`ACK 1001 (duplicado 2)`,`ainda pode ser reordenação`],[`5`,`seq 4001`,`guarda no buffer`,`ACK 1001 (duplicado 3)`,`três duplicados: o 1001 se perdeu; retransmissão rápida e ssthresh = metade do que estava em voo`],[`6`,`seq 1001 de novo`,`tapa o buraco; o buffer já tem 2001–5000`,`ACK 5001`,`um ACK confirmou 4000 bytes de uma vez (cumulativo); nada de timeout`]],caption:`Sem os ACKs duplicados, o remetente só perceberia a perda quando o RTO estourasse, em geral bem depois de um RTT.`},{type:`md`,text:`Agora, de longe, a cwnd ao longo de várias rodadas (uma rodada = um RTT), em unidades de MSS, começando com cwnd = 1 e ssthresh = 16 para o gráfico caber na tela. Na rodada 8 acontecem três ACKs duplicados; na 11, um timeout:`},{type:`table`,head:[`Rodada`,`0`,`1`,`2`,`3`,`4`,`5`,`6`,`7`,`8`,`9`,`10`,`11`,`12`,`13`,`14`,`15`,`16`],rows:[[`cwnd`,`1`,`2`,`4`,`8`,`16`,`17`,`18`,`19`,`20`,`10`,`11`,`12`,`1`,`2`,`4`,`6`,`7`],[`ssthresh`,`16`,`16`,`16`,`16`,`16`,`16`,`16`,`16`,`16`,`10`,`10`,`10`,`6`,`6`,`6`,`6`,`6`],[`fase`,`partida lenta`,``,``,``,`evitar congest.`,``,``,``,`3 dup`,`evitar congest.`,``,`timeout`,`partida lenta`,``,``,`evitar congest.`,``]],caption:`Dobra até 16, sobe de 1 em 1, cai pela metade (20 → 10) nos três duplicados e despenca para 1 no timeout, com ssthresh = 12 / 2 = 6. É o dente de serra. No desafio, você vai escrever o simulador que gera esta tabela.`}]},{stage:`codigo`,blocks:[{type:`md`,text:`Duas simulações que rodam aqui. A primeira é o estimador de RTO da RFC 6298: veja o que um único RTT alto faz com ele. A segunda compara o TCP (um fluxo de bytes só) com o QUIC (um fluxo por arquivo) quando um pacote se perde.`},{type:`code`,lang:`python`,code:`# 1. Estimador de RTO (RFC 6298), sem o piso de 1 s e sem a granularidade do relógio
def estimar(amostras_ms, alfa=1/8, beta=1/4, k=4):
    srtt = rttvar = None
    for r in amostras_ms:
        if srtt is None:                                # primeira medida
            srtt, rttvar = r, r / 2
        else:                                           # RTTVAR primeiro, com o SRTT antigo
            rttvar = (1 - beta) * rttvar + beta * abs(srtt - r)
            srtt = (1 - alfa) * srtt + alfa * r
        print(f"RTT {r:>3} ms -> SRTT {srtt:6.1f}  RTTVAR {rttvar:5.1f}  RTO {srtt + k * rttvar:6.1f} ms")

estimar([100, 120, 80, 100, 300, 100, 100])

# 2. Bloqueio de cabeça de fila: o pacote 2 se perde e a cópia só chega em t = 10 ms
pacotes = [(1, "css"), (2, "js"), (3, "img"), (4, "css"), (5, "img"), (6, "js")]  # um por ms

def chegada(n):
    return 10 if n == 2 else n

def termino(uma_fila_por_fluxo):
    pronto, ultimo = {}, {}
    for n, fluxo in pacotes:
        fila = fluxo if uma_fila_por_fluxo else "tudo"
        ultimo[fila] = max(ultimo.get(fila, 0), chegada(n))   # só entrega quando tudo antes, na mesma fila, chegou
        pronto[fluxo] = ultimo[fila]
    return pronto

print("TCP  (um fluxo de bytes):", termino(False))
print("QUIC (fluxos separados): ", termino(True))`,runnable:!0,caption:`No TCP, o CSS e a imagem ficam prontos só em t = 10, esperando um pedaço do JavaScript que nem é deles. No QUIC, só o JavaScript espera. Mude o pacote perdido e veja quem sofre.`},{type:`code`,lang:`text`,code:`$ ss -ti dst 198.51.100.80
ESTAB 0 0 192.168.0.23:51000 198.51.100.80:https
     cubic wscale:7,7 rto:232 rtt:31.4/4.2 mss:1448 cwnd:10 ssthresh:7 bytes_acked:52417 retrans:0/2 rcv_space:14480`,runnable:!1,caption:"No Linux, `ss -ti` mostra, para cada conexão, o algoritmo (cubic), o window scale, o RTO e o RTT médio/variação em ms, o MSS, a cwnd e o ssthresh em MSS, e as retransmissões. (O mss de 1448 é 1460 menos os 12 bytes da opção de timestamps.)"}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e9-tcpcc-1`,kind:`fill`,lang:`text`,prompt:`Complete com números. O receptor já recebeu, em ordem, todos os bytes até o 4000.`,template:`O segmento com seq = 4001 e 500 bytes de dados carrega os bytes de ___ a ___.
Ao recebê-lo, o receptor responde com ACK ___.
Se o próximo segmento a chegar fosse o de seq = 5001, o ACK seria ___ (duplicado).`,blanks:[[`4001`],[`4500`],[`4501`],[`4501`]],difficulty:`facil`,skills:[`redes-tcpip`],hints:[`O número de sequência é a posição do primeiro byte. Se o primeiro é o 4001 e são 500 bytes, qual é o último?`,`O ACK diz o próximo byte que o receptor espera, e não o último que chegou.`,`Se o segmento de seq 5001 chega, que bytes ainda estão faltando antes dele?`],explanation:`Os 500 bytes vão de 4001 a 4500 (4001 + 500 − 1). O ACK é o próximo esperado, 4501. Se depois chega o segmento de 5001, os bytes 4501 a 5000 estão faltando: o receptor guarda o segmento, mas o ACK cumulativo não pode pular o buraco e repete 4501, um ACK duplicado.`}},{type:`exercise`,exercise:{id:`e9-tcpcc-2`,kind:`predict`,lang:`python`,prompt:`Esta é a regra da cwnd, por rodada, quando nada se perde. O que o programa imprime?`,code:`cwnd, ssthresh = 1, 8
for rodada in range(6):
    print(rodada, cwnd)
    if cwnd < ssthresh:
        cwnd = min(2 * cwnd, ssthresh)
    else:
        cwnd = cwnd + 1`,answer:`0 1
1 2
2 4
3 8
4 9
5 10`,difficulty:`facil`,skills:[`redes-tcpip`],hints:[`Enquanto cwnd < ssthresh, o que acontece com ela a cada rodada?`,"Quando cwnd chega a 8, a condição `cwnd < ssthresh` ainda é verdadeira?"],explanation:`Partida lenta: 1, 2, 4, 8 (dobra a cada rodada, sem passar do ssthresh). Com cwnd = 8 = ssthresh, a condição é falsa e começa o aumento aditivo: 9, 10. O print vem antes da atualização, por isso a rodada 0 mostra o valor inicial.`}},{type:`exercise`,exercise:{id:`e9-tcpcc-3`,kind:`code`,lang:`python`,prompt:"Escreva `acks(segmentos, inicio)`, o lado receptor do TCP. `inicio` é o primeiro byte esperado; `segmentos` é a lista, na ordem de chegada, de pares `(seq, tamanho)`, e cada segmento cobre os bytes de `seq` a `seq + tamanho − 1` (tamanho ≥ 1). Devolva a lista dos ACKs enviados, um por segmento recebido.\n\nO ACK é sempre o próximo byte esperado. O receptor guarda segmentos que chegam fora de ordem e os aproveita quando o buraco for tapado. Segmentos podem chegar repetidos, já confirmados, ou se sobrepor em parte ao que já chegou (uma retransmissão pode juntar dois segmentos num só). Exemplo: `acks([(1, 100), (201, 100), (101, 100)], 1)` devolve `[101, 101, 301]`.",difficulty:`intermediario`,skills:[`redes-tcpip`],hints:[`Que variável representa o estado do receptor? Quando ela muda?`,`Um segmento que começa depois do byte esperado não pode ser confirmado ainda. Onde ele fica?`,`Quando o esperado avança, algum segmento guardado pode passar a encostar nele. Uma única verificação basta, ou um avanço pode destravar outro?`,"Um segmento que começa antes do esperado, mas termina depois dele, deve ser ignorado? Qual condição sobre `seq` e `seq + tamanho` diz que o segmento cobre o byte esperado?"],explanation:"O estado do receptor é o próximo byte esperado mais um conjunto de trechos guardados. A cada chegada, guarde o trecho se ele tiver algo novo e repita: se algum trecho guardado cobre o byte esperado (seq ≤ esperado < fim), avance o esperado até o fim dele. Isso trata tudo de uma vez: segmento em ordem, buraco tapado que destrava vários guardados (o ACK pula, como no ACK 5001 do exemplo), duplicatas (nada muda, o ACK se repete) e sobreposições. Comparar só `seq == esperado` falha quando uma retransmissão ou um trecho guardado começa antes do esperado e termina depois.",starter:`def acks(segmentos, inicio):
    # segmentos: lista de (seq, tamanho) na ordem de chegada
    # devolva a lista de ACKs (próximo byte esperado após cada chegada)
    pass`,solution:`def acks(segmentos, inicio):
    esperado = inicio
    guardados = []                 # trechos (inicio, fim) ainda não encaixados
    resposta = []
    for seq, tamanho in segmentos:
        fim = seq + tamanho
        if fim > esperado:
            guardados.append((seq, fim))
        avancou = True
        while avancou:
            avancou = False
            for s, f in guardados:
                if s <= esperado < f:
                    esperado = f
                    avancou = True
            guardados = [(s, f) for s, f in guardados if f > esperado]
        resposta.append(esperado)
    return resposta`,tests:[{name:`em ordem e o exemplo do enunciado`,code:`r = acks([(1, 1000), (1001, 1000), (2001, 500)], 1)
assert r == [1001, 2001, 2501], f"em ordem, cada ACK é seq + tamanho do último; veio {r}"
r = acks([(1, 100), (201, 100), (101, 100)], 1)
assert r == [101, 101, 301], f"o segmento 201 fica guardado (ACK 101 duplicado) e é aproveitado quando o 101 chega; veio {r}"`},{name:`o exemplo da lição: três duplicados e o ACK que pula`,code:`segs = [(1, 1000), (2001, 1000), (3001, 1000), (4001, 1000), (1001, 1000)]
r = acks(segs, 1)
assert r == [1001, 1001, 1001, 1001, 5001], f"veio {r}; esperado [1001, 1001, 1001, 1001, 5001]: o 1001 tapa o buraco e os três guardados são confirmados de uma vez"`},{name:`duplicatas e segmentos já confirmados`,code:`r = acks([(1, 100), (1, 100), (51, 50)], 1)
assert r == [101, 101, 101], f"um segmento repetido ou já confirmado não muda nada: o ACK se repete; veio {r}"
r = acks([(500, 10)], 500)
assert r == [510], f"o primeiro byte esperado é o 500 (inicio); veio {r}"`},{name:`sobreposições`,code:`r = acks([(1, 100), (51, 100)], 1)
assert r == [101, 151], f"o segundo segmento repete 51–100, mas traz 101–150 de novo: o ACK vai a 151; veio {r}"
r = acks([(1, 10), (21, 10), (15, 10), (11, 10)], 1)
assert r == [11, 11, 11, 31], f"quando o 11 chega, ele encosta no trecho 15–24, que encosta no 21–30: o ACK precisa ir a 31; veio {r}"`},{name:`vários buracos tapados de trás para a frente`,code:`r = acks([(1, 10), (41, 10), (31, 10), (21, 10), (11, 10)], 1)
assert r == [11, 11, 11, 11, 51], f"veio {r}"
r = acks([(11, 10), (21, 10)], 1)
assert r == [1, 1], f"sem o byte 1, nada pode ser confirmado: o ACK fica em 1; veio {r}"`},{name:`casos aleatórios`,code:`import random as _random

def _ref_acks(segmentos, inicio):
    esperado, guardados, saida = inicio, [], []
    for seq, tam in segmentos:
        if seq + tam > esperado:
            guardados.append((seq, seq + tam))
        mudou = True
        while mudou:
            mudou = False
            for s, f in guardados:
                if s <= esperado < f:
                    esperado, mudou = f, True
            guardados = [(s, f) for s, f in guardados if f > esperado]
        saida.append(esperado)
    return saida
_rng = _random.Random(9293)
for _ in range(300):
    inicio = _rng.randint(1, 5000)
    segs = []
    for _ in range(_rng.randint(1, 12)):
        segs.append((inicio + _rng.randint(-20, 120), _rng.randint(1, 40)))
    esperado = _ref_acks(segs, inicio)
    r = acks(list(segs), inicio)
    assert r == esperado, f"acks({segs}, {inicio}) devolveu {r}, esperado {esperado}"`}]}},{type:`exercise`,exercise:{id:`e9-tcpcc-4`,kind:`mcq`,prompt:`Um servidor antigo não negocia window scale, então a janela de recepção fica em 65.535 bytes. Um cliente em Fortaleza, com fibra de 500 Mbit/s, baixa um arquivo dele com RTT de 200 ms. Qual é, aproximadamente, a vazão máxima dessa conexão?`,difficulty:`intermediario`,skills:[`redes-tcpip`],hints:[`Quantos bytes podem estar em voo, no máximo, sem um ACK?`,`Quanto tempo leva para um ACK voltar e liberar a janela de novo?`,`A conta dá bytes por segundo. Quantos bits tem um byte?`],explanation:`Com no máximo 65.535 bytes em voo e um RTT de 200 ms, o remetente manda uma janela a cada 0,2 s: 65.535 / 0,2 ≈ 327.675 bytes/s ≈ 2,6 Mbit/s. A fibra de 500 Mbit/s não é o gargalo: a janela é. Para ocupar 500 Mbit/s com 200 ms seriam necessários 500 Mbit/s × 0,2 s = 12,5 MB em voo, o que só a opção window scale permite.`,options:[{text:`Cerca de 2,6 Mbit/s`,correct:!0,feedback:`Isso: 65.535 bytes × 8 / 0,2 s ≈ 2,6 Mbit/s. A janela, e não a fibra, limita a conexão.`},{text:`Cerca de 500 Mbit/s, a velocidade da fibra`,feedback:`A fibra é só um dos limites. O remetente não pode ter mais que a janela em voo sem um ACK, e o ACK demora um RTT para voltar: vazão ≤ janela / RTT.`},{text:`Cerca de 327 kbit/s`,feedback:`327 mil é o número de bytes por segundo (65.535 / 0,2). Em bits, multiplique por 8: cerca de 2,6 Mbit/s.`},{text:`Cerca de 105 kbit/s`,feedback:`Isso sai de multiplicar a janela pelo RTT. A janela é enviada uma vez a cada RTT: divida pelo RTT, não multiplique.`}]}},{type:`exercise`,exercise:{id:`e9-tcpcc-5`,kind:`mcq`,prompt:`Num ônibus, o celular sai do alcance do Wi-Fi da rodoviária e passa para o 4G no meio de um download. Com HTTP/3 (QUIC), o download continua; com HTTP/1.1 sobre TCP, a conexão cai e o aplicativo precisa reconectar. Por quê?`,difficulty:`intermediario`,skills:[`redes-tcpip`],hints:[`O que muda no celular quando ele troca de rede?`,`Como cada protocolo sabe a que conexão pertence um pacote que chega?`],explanation:`Uma conexão TCP é identificada pelos quatro valores: IP e porta de origem e de destino. Com o IP novo do 4G, os pacotes do celular não pertencem a nenhuma conexão que o servidor conheça. O QUIC identifica a conexão por um ID de conexão que vai em cada pacote; o servidor reconhece o ID, valida o novo caminho e segue, com as chaves e o estado que já tinha.`,options:[{text:`O QUIC identifica a conexão por um ID de conexão, não pelo IP e pela porta, que mudaram`,correct:!0,feedback:`Isso: é a migração de conexão. O TCP só conhece o par de IPs e portas, e o IP do celular mudou.`},{text:`O UDP garante a entrega mesmo quando o IP muda`,feedback:`O UDP não garante nada, nem entrega. As garantias do QUIC são construídas por ele mesmo, por cima do UDP.`},{text:`O QUIC retransmite mais rápido, então o servidor nem percebe a troca`,feedback:`Retransmitir mais rápido não ajudaria: com o IP novo, o servidor TCP não saberia a que conexão os pacotes pertencem. A diferença está em como a conexão é identificada.`},{text:`O 4G bloqueia conexões TCP vindas do Wi-Fi`,feedback:`Não há bloqueio: o problema é que a conexão TCP antiga estava amarrada ao IP do Wi-Fi, e esse IP não existe mais para o celular.`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e9-tcpcc-desafio`,kind:`code`,lang:`python`,prompt:'Simule o controle de congestionamento do TCP Reno rodada por rodada (uma rodada = um RTT), em unidades de MSS. Escreva `reno(eventos, rwnd, cwnd=1, ssthresh=64)`. Cada item de `eventos` diz o que aconteceu numa rodada: `"ok"` (tudo confirmado), `"3dup"` (perda detectada por três ACKs duplicados) ou `"timeout"`.\n\nEm cada rodada, o remetente põe em voo `em_voo = min(cwnd, rwnd)` segmentos. Depois, conforme o evento:\n- `"ok"`: se `cwnd < ssthresh`, partida lenta: `cwnd = min(2 * cwnd, ssthresh)`; senão, `cwnd += 1`. **Mas** se a rodada foi limitada pelo receptor (`cwnd > rwnd`), a cwnd não cresce: o TCP não aprendeu nada sobre a rede (o Linux faz assim).\n- `"3dup"`: `ssthresh = max(em_voo // 2, 2)` e `cwnd = ssthresh`.\n- `"timeout"`: `ssthresh = max(em_voo // 2, 2)` e `cwnd = 1`.\n\nRepare que a metade é do que estava **em voo**, como manda a RFC 5681, e não da cwnd. Devolva a lista de tuplas `(cwnd, ssthresh, em_voo)` com o estado no **início** de cada rodada, mais uma tupla final com o estado depois do último evento: `len(eventos) + 1` tuplas. Exemplo: `reno(["ok", "ok", "3dup"], rwnd=100, cwnd=4, ssthresh=8)` devolve `[(4, 8, 4), (8, 8, 8), (9, 8, 9), (4, 4, 4)]`.',difficulty:`avancado`,skills:[`redes-tcpip`],hints:[`Que três valores formam o estado do remetente? Qual deles é calculado a partir dos outros dois, e não guardado?`,`Em que momento você deve registrar a tupla da rodada: antes ou depois de aplicar o evento?`,`Na partida lenta, a cwnd pode passar do ssthresh? Confira com cwnd = 6 e ssthresh = 8.`,`Numa perda, a metade é de qual número? Teste com cwnd = 40 e rwnd = 10.`,`Quando a rodada foi limitada pelo receptor, qual dos ramos do "ok" deve ser pulado?`],explanation:`O estado é (cwnd, ssthresh); em_voo é derivado. A cada rodada, registre o estado e só depois aplique o evento. Partida lenta dobra até o ssthresh (nunca passa dele) e, dali em diante, o crescimento é de 1 por rodada. Nas perdas, o ssthresh vira a metade do que estava em voo, com piso de 2, e a cwnd vai para o ssthresh (3dup) ou para 1 (timeout). Os dois detalhes que derrubam soluções apressadas vêm da prática: com uma rwnd pequena, a metade da cwnd seria maior do que o que estava de fato na rede, e uma cwnd que cresce sem ter sido usada não mede nada (por isso o Linux só a aumenta quando ela foi o limite). Esta tabela, desenhada, é o dente de serra do exemplo.`,starter:`def reno(eventos, rwnd, cwnd=1, ssthresh=64):
    # devolva a lista de (cwnd, ssthresh, em_voo) no início de cada rodada,
    # mais o estado final: len(eventos) + 1 tuplas
    pass`,solution:`def reno(eventos, rwnd, cwnd=1, ssthresh=64):
    rodadas = []
    for evento in eventos:
        em_voo = min(cwnd, rwnd)
        rodadas.append((cwnd, ssthresh, em_voo))
        if evento == "ok":
            if cwnd <= rwnd:                  # só cresce se a cwnd foi o limite
                if cwnd < ssthresh:
                    cwnd = min(2 * cwnd, ssthresh)
                else:
                    cwnd += 1
        elif evento == "3dup":
            ssthresh = max(em_voo // 2, 2)
            cwnd = ssthresh
        elif evento == "timeout":
            ssthresh = max(em_voo // 2, 2)
            cwnd = 1
    rodadas.append((cwnd, ssthresh, min(cwnd, rwnd)))
    return rodadas`,tests:[{name:`o exemplo do enunciado`,code:`import random as _random

def _ref_reno(eventos, rwnd, cwnd=1, ssthresh=64):
    rodadas = []
    for ev in eventos:
        voo = min(cwnd, rwnd)
        rodadas.append((cwnd, ssthresh, voo))
        if ev == "ok":
            if cwnd <= rwnd:
                cwnd = min(2 * cwnd, ssthresh) if cwnd < ssthresh else cwnd + 1
        elif ev == "3dup":
            ssthresh = max(voo // 2, 2)
            cwnd = ssthresh
        else:
            ssthresh = max(voo // 2, 2)
            cwnd = 1
    rodadas.append((cwnd, ssthresh, min(cwnd, rwnd)))
    return rodadas

def _confere_reno(eventos, rwnd, cwnd=1, ssthresh=64, dica=""):
    esperado = _ref_reno(eventos, rwnd, cwnd, ssthresh)
    r = reno(list(eventos), rwnd, cwnd, ssthresh)
    assert isinstance(r, list), f"devolva uma lista de tuplas (cwnd, ssthresh, em_voo); veio {r!r}"
    assert len(r) == len(eventos) + 1, f"com {len(eventos)} eventos, a lista precisa de {len(eventos) + 1} tuplas (o estado no início de cada rodada e o estado final); veio {len(r)}"
    for i, (a, b) in enumerate(zip(r, esperado)):
        assert tuple(a) == b, f"reno({eventos}, rwnd={rwnd}, cwnd={cwnd}, ssthresh={ssthresh}): na posição {i} veio {tuple(a)}, esperado {b} (cwnd, ssthresh, em_voo). Lista esperada: {esperado}. {dica}"
r = reno(["ok", "ok", "3dup"], rwnd=100, cwnd=4, ssthresh=8)
assert [tuple(x) for x in r] == [(4, 8, 4), (8, 8, 8), (9, 8, 9), (4, 4, 4)], f"veio {r}"`},{name:`o dente de serra da lição`,code:`import random as _random

def _ref_reno(eventos, rwnd, cwnd=1, ssthresh=64):
    rodadas = []
    for ev in eventos:
        voo = min(cwnd, rwnd)
        rodadas.append((cwnd, ssthresh, voo))
        if ev == "ok":
            if cwnd <= rwnd:
                cwnd = min(2 * cwnd, ssthresh) if cwnd < ssthresh else cwnd + 1
        elif ev == "3dup":
            ssthresh = max(voo // 2, 2)
            cwnd = ssthresh
        else:
            ssthresh = max(voo // 2, 2)
            cwnd = 1
    rodadas.append((cwnd, ssthresh, min(cwnd, rwnd)))
    return rodadas

def _confere_reno(eventos, rwnd, cwnd=1, ssthresh=64, dica=""):
    esperado = _ref_reno(eventos, rwnd, cwnd, ssthresh)
    r = reno(list(eventos), rwnd, cwnd, ssthresh)
    assert isinstance(r, list), f"devolva uma lista de tuplas (cwnd, ssthresh, em_voo); veio {r!r}"
    assert len(r) == len(eventos) + 1, f"com {len(eventos)} eventos, a lista precisa de {len(eventos) + 1} tuplas (o estado no início de cada rodada e o estado final); veio {len(r)}"
    for i, (a, b) in enumerate(zip(r, esperado)):
        assert tuple(a) == b, f"reno({eventos}, rwnd={rwnd}, cwnd={cwnd}, ssthresh={ssthresh}): na posição {i} veio {tuple(a)}, esperado {b} (cwnd, ssthresh, em_voo). Lista esperada: {esperado}. {dica}"
ev = ["ok"] * 8 + ["3dup"] + ["ok"] * 2 + ["timeout"] + ["ok"] * 4
r = reno(ev, rwnd=1000, cwnd=1, ssthresh=16)
janelas = [x[0] for x in r]
assert janelas == [1, 2, 4, 8, 16, 17, 18, 19, 20, 10, 11, 12, 1, 2, 4, 6, 7], f"as cwnd deveriam ser as da tabela do exemplo; vieram {janelas}"
_confere_reno(ev, 1000, 1, 16)`},{name:`partida lenta não passa do ssthresh`,code:`import random as _random

def _ref_reno(eventos, rwnd, cwnd=1, ssthresh=64):
    rodadas = []
    for ev in eventos:
        voo = min(cwnd, rwnd)
        rodadas.append((cwnd, ssthresh, voo))
        if ev == "ok":
            if cwnd <= rwnd:
                cwnd = min(2 * cwnd, ssthresh) if cwnd < ssthresh else cwnd + 1
        elif ev == "3dup":
            ssthresh = max(voo // 2, 2)
            cwnd = ssthresh
        else:
            ssthresh = max(voo // 2, 2)
            cwnd = 1
    rodadas.append((cwnd, ssthresh, min(cwnd, rwnd)))
    return rodadas

def _confere_reno(eventos, rwnd, cwnd=1, ssthresh=64, dica=""):
    esperado = _ref_reno(eventos, rwnd, cwnd, ssthresh)
    r = reno(list(eventos), rwnd, cwnd, ssthresh)
    assert isinstance(r, list), f"devolva uma lista de tuplas (cwnd, ssthresh, em_voo); veio {r!r}"
    assert len(r) == len(eventos) + 1, f"com {len(eventos)} eventos, a lista precisa de {len(eventos) + 1} tuplas (o estado no início de cada rodada e o estado final); veio {len(r)}"
    for i, (a, b) in enumerate(zip(r, esperado)):
        assert tuple(a) == b, f"reno({eventos}, rwnd={rwnd}, cwnd={cwnd}, ssthresh={ssthresh}): na posição {i} veio {tuple(a)}, esperado {b} (cwnd, ssthresh, em_voo). Lista esperada: {esperado}. {dica}"
_confere_reno(["ok", "ok", "ok"], 1000, 6, 8, "de 6, a partida lenta iria a 12, mas para em 8; depois, +1")
_confere_reno(["ok"] * 4, 1000, 1, 64, "1, 2, 4, 8, 16: longe do ssthresh, só dobra")`},{name:`perdas: metade do que estava em voo, mínimo 2`,code:`import random as _random

def _ref_reno(eventos, rwnd, cwnd=1, ssthresh=64):
    rodadas = []
    for ev in eventos:
        voo = min(cwnd, rwnd)
        rodadas.append((cwnd, ssthresh, voo))
        if ev == "ok":
            if cwnd <= rwnd:
                cwnd = min(2 * cwnd, ssthresh) if cwnd < ssthresh else cwnd + 1
        elif ev == "3dup":
            ssthresh = max(voo // 2, 2)
            cwnd = ssthresh
        else:
            ssthresh = max(voo // 2, 2)
            cwnd = 1
    rodadas.append((cwnd, ssthresh, min(cwnd, rwnd)))
    return rodadas

def _confere_reno(eventos, rwnd, cwnd=1, ssthresh=64, dica=""):
    esperado = _ref_reno(eventos, rwnd, cwnd, ssthresh)
    r = reno(list(eventos), rwnd, cwnd, ssthresh)
    assert isinstance(r, list), f"devolva uma lista de tuplas (cwnd, ssthresh, em_voo); veio {r!r}"
    assert len(r) == len(eventos) + 1, f"com {len(eventos)} eventos, a lista precisa de {len(eventos) + 1} tuplas (o estado no início de cada rodada e o estado final); veio {len(r)}"
    for i, (a, b) in enumerate(zip(r, esperado)):
        assert tuple(a) == b, f"reno({eventos}, rwnd={rwnd}, cwnd={cwnd}, ssthresh={ssthresh}): na posição {i} veio {tuple(a)}, esperado {b} (cwnd, ssthresh, em_voo). Lista esperada: {esperado}. {dica}"
_confere_reno(["3dup"], 1000, 3, 64, "3 // 2 = 1, mas o piso é 2: ssthresh = 2 e cwnd = 2")
_confere_reno(["timeout", "ok", "ok", "ok"], 1000, 20, 64, "timeout: ssthresh = 10, cwnd = 1; depois a partida lenta recomeça: 2, 4, 8")
_confere_reno(["timeout", "ok", "ok"], 1000, 1, 64, "um timeout com cwnd = 1 deixa ssthresh = 2 (piso) e cwnd = 1; depois 2 e 3")`},{name:`receptor limitando: a metade é do que estava em voo`,code:`import random as _random

def _ref_reno(eventos, rwnd, cwnd=1, ssthresh=64):
    rodadas = []
    for ev in eventos:
        voo = min(cwnd, rwnd)
        rodadas.append((cwnd, ssthresh, voo))
        if ev == "ok":
            if cwnd <= rwnd:
                cwnd = min(2 * cwnd, ssthresh) if cwnd < ssthresh else cwnd + 1
        elif ev == "3dup":
            ssthresh = max(voo // 2, 2)
            cwnd = ssthresh
        else:
            ssthresh = max(voo // 2, 2)
            cwnd = 1
    rodadas.append((cwnd, ssthresh, min(cwnd, rwnd)))
    return rodadas

def _confere_reno(eventos, rwnd, cwnd=1, ssthresh=64, dica=""):
    esperado = _ref_reno(eventos, rwnd, cwnd, ssthresh)
    r = reno(list(eventos), rwnd, cwnd, ssthresh)
    assert isinstance(r, list), f"devolva uma lista de tuplas (cwnd, ssthresh, em_voo); veio {r!r}"
    assert len(r) == len(eventos) + 1, f"com {len(eventos)} eventos, a lista precisa de {len(eventos) + 1} tuplas (o estado no início de cada rodada e o estado final); veio {len(r)}"
    for i, (a, b) in enumerate(zip(r, esperado)):
        assert tuple(a) == b, f"reno({eventos}, rwnd={rwnd}, cwnd={cwnd}, ssthresh={ssthresh}): na posição {i} veio {tuple(a)}, esperado {b} (cwnd, ssthresh, em_voo). Lista esperada: {esperado}. {dica}"
_confere_reno(["3dup"], 10, 40, 64, "com rwnd = 10, só 10 segmentos estavam em voo: ssthresh = 5, e não 20")
_confere_reno(["timeout"], 6, 30, 64, "em voo = min(30, 6) = 6: ssthresh = 3")`},{name:`receptor limitando: a cwnd não cresce`,code:`import random as _random

def _ref_reno(eventos, rwnd, cwnd=1, ssthresh=64):
    rodadas = []
    for ev in eventos:
        voo = min(cwnd, rwnd)
        rodadas.append((cwnd, ssthresh, voo))
        if ev == "ok":
            if cwnd <= rwnd:
                cwnd = min(2 * cwnd, ssthresh) if cwnd < ssthresh else cwnd + 1
        elif ev == "3dup":
            ssthresh = max(voo // 2, 2)
            cwnd = ssthresh
        else:
            ssthresh = max(voo // 2, 2)
            cwnd = 1
    rodadas.append((cwnd, ssthresh, min(cwnd, rwnd)))
    return rodadas

def _confere_reno(eventos, rwnd, cwnd=1, ssthresh=64, dica=""):
    esperado = _ref_reno(eventos, rwnd, cwnd, ssthresh)
    r = reno(list(eventos), rwnd, cwnd, ssthresh)
    assert isinstance(r, list), f"devolva uma lista de tuplas (cwnd, ssthresh, em_voo); veio {r!r}"
    assert len(r) == len(eventos) + 1, f"com {len(eventos)} eventos, a lista precisa de {len(eventos) + 1} tuplas (o estado no início de cada rodada e o estado final); veio {len(r)}"
    for i, (a, b) in enumerate(zip(r, esperado)):
        assert tuple(a) == b, f"reno({eventos}, rwnd={rwnd}, cwnd={cwnd}, ssthresh={ssthresh}): na posição {i} veio {tuple(a)}, esperado {b} (cwnd, ssthresh, em_voo). Lista esperada: {esperado}. {dica}"
_confere_reno(["ok"] * 6, 10, 1, 64, "1, 2, 4, 8, 16 (a rodada com cwnd 8 ainda era limitada pela cwnd, então ela dobra) e aí para: com cwnd 16 > rwnd 10, ela não cresce mais")
_confere_reno(["ok", "ok", "ok"], 10, 10, 8, "cwnd = rwnd = 10 ainda conta como limitada pela cwnd: cresce para 11; depois, com 11 > 10, para")`},{name:`sequências aleatórias`,code:`import random as _random

def _ref_reno(eventos, rwnd, cwnd=1, ssthresh=64):
    rodadas = []
    for ev in eventos:
        voo = min(cwnd, rwnd)
        rodadas.append((cwnd, ssthresh, voo))
        if ev == "ok":
            if cwnd <= rwnd:
                cwnd = min(2 * cwnd, ssthresh) if cwnd < ssthresh else cwnd + 1
        elif ev == "3dup":
            ssthresh = max(voo // 2, 2)
            cwnd = ssthresh
        else:
            ssthresh = max(voo // 2, 2)
            cwnd = 1
    rodadas.append((cwnd, ssthresh, min(cwnd, rwnd)))
    return rodadas

def _confere_reno(eventos, rwnd, cwnd=1, ssthresh=64, dica=""):
    esperado = _ref_reno(eventos, rwnd, cwnd, ssthresh)
    r = reno(list(eventos), rwnd, cwnd, ssthresh)
    assert isinstance(r, list), f"devolva uma lista de tuplas (cwnd, ssthresh, em_voo); veio {r!r}"
    assert len(r) == len(eventos) + 1, f"com {len(eventos)} eventos, a lista precisa de {len(eventos) + 1} tuplas (o estado no início de cada rodada e o estado final); veio {len(r)}"
    for i, (a, b) in enumerate(zip(r, esperado)):
        assert tuple(a) == b, f"reno({eventos}, rwnd={rwnd}, cwnd={cwnd}, ssthresh={ssthresh}): na posição {i} veio {tuple(a)}, esperado {b} (cwnd, ssthresh, em_voo). Lista esperada: {esperado}. {dica}"
_rng = _random.Random(5681)
for _ in range(300):
    n = _rng.randint(0, 25)
    ev = [_rng.choice(["ok", "ok", "ok", "ok", "3dup", "timeout"]) for _ in range(n)]
    _confere_reno(ev, _rng.randint(2, 80), _rng.randint(1, 40), _rng.randint(2, 64))`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:"**Veja o TCP trabalhando.** No seu computador, abra o Wireshark, comece a captura e baixe um arquivo grande de um site. Filtre por `tcp.stream eq N` (a conexão do download) e use *Statistics → TCP Stream Graphs → Stevens* para ver os números de sequência crescendo: a inclinação é a vazão. Procure retransmissões com o filtro `tcp.analysis.retransmission` e ACKs duplicados com `tcp.analysis.duplicate_ack`. No Linux, rode `ss -ti` durante o download e anote cwnd, ssthresh, rtt e rto em alguns momentos. Depois, compare: baixe do mesmo jeito de um servidor perto (uma CDN no Brasil) e de um distante. Explique a diferença com vazão ≈ janela / RTT."}]},{stage:`revisao`,blocks:[{type:`md`,text:`- O TCP numera **bytes**; o ACK é o próximo byte esperado e confirma tudo antes dele. SYN e FIN consomem um número cada; o ISN é aleatório.
- Segmento fora de ordem → o receptor guarda e repete o ACK (duplicado). Buraco tapado → o ACK pula de uma vez.
- Retransmissão: por timeout (RTO = SRTT + 4·RTTVAR, que dobra a cada timeout) ou por 3 ACKs duplicados (retransmissão rápida). SACK diz o que já chegou.
- Vazão ≤ janela / RTT. Para ocupar o enlace, janela ≥ banda × RTT (BDP); window scale permite janelas acima de 64 KiB.
- Janela efetiva = min(rwnd, cwnd): rwnd é o controle de fluxo (receptor); cwnd é o controle de congestionamento (rede).
- Reno: partida lenta (dobra por RTT até ssthresh), +1 MSS por RTT, metade em 3 duplicados, volta a 1 em timeout. CUBIC é o padrão hoje; BBR estima banda e RTT.
- QUIC (sobre UDP): handshake com TLS em 1 RTT, fluxos sem bloqueio de cabeça de fila entre eles, números de pacote que não se repetem, ID de conexão que sobrevive à troca de rede.`},{type:`callout`,tone:`english`,text:`- **sequence number, acknowledgment number, cumulative ACK, duplicate ACK**: número de sequência, número de confirmação, ACK cumulativo, ACK duplicado
- **retransmission timeout (RTO), fast retransmit, selective acknowledgment (SACK)**: tempo limite de retransmissão, retransmissão rápida, confirmação seletiva
- **sliding window, receive window, congestion window (cwnd), slow start threshold (ssthresh)**: janela deslizante, janela de recepção, janela de congestionamento, limiar da partida lenta
- **bandwidth-delay product, bufferbloat, head-of-line blocking, connection migration**: produto banda × atraso, inchaço de buffers, bloqueio de cabeça de fila, migração de conexão

Frase típica de entrevista: *"Flow control protects the receiver: the sender never has more unacknowledged data than the receive window advertised. Congestion control protects the network: the sender limits itself to the congestion window, which grows during slow start and congestion avoidance and shrinks when loss is detected."*

Frase típica de RFC (RFC 9000): *"QUIC is a connection-oriented protocol that creates a stateful interaction between a client and server."*`,title:`English corner`}]}],cards:[{id:`l9-tcp-janelas-congestionamento#1`,front:`Um segmento tem seq = 7001 e 1000 bytes. Que bytes ele carrega e qual ACK confirma que ele chegou (com tudo antes)?`,back:`Bytes 7001 a 8000; ACK 8001, o próximo byte esperado.`},{id:`l9-tcp-janelas-congestionamento#2`,front:`O que o receptor faz quando chega um segmento fora de ordem?`,back:`Guarda no buffer e manda na hora um ACK duplicado, com o número do primeiro byte que falta.`},{id:`l9-tcp-janelas-congestionamento#3`,front:`Quais são os dois gatilhos de retransmissão do TCP?`,back:`O temporizador (RTO) estourar e a chegada de três ACKs duplicados (retransmissão rápida).`},{id:`l9-tcp-janelas-congestionamento#4`,front:`Como a RFC 6298 calcula o RTO?`,back:`RTO = SRTT + 4 · RTTVAR, em que SRTT é a média móvel do RTT (peso ⅛ para a medida nova) e RTTVAR, a da variação (peso ¼); dobra a cada timeout.`},{id:`l9-tcp-janelas-congestionamento#5`,front:`Qual a vazão máxima com janela de 64 KB e RTT de 100 ms?`,back:`Cerca de 64 KB / 0,1 s = 640 KB/s, uns 5 Mbit/s, qualquer que seja a velocidade do enlace.`},{id:`l9-tcp-janelas-congestionamento#6`,front:`Qual a diferença entre rwnd e cwnd?`,back:`rwnd é anunciada pelo receptor (espaço no buffer, controle de fluxo); cwnd é estimada pelo remetente (o que a rede aguenta, controle de congestionamento). Vale o menor.`},{id:`l9-tcp-janelas-congestionamento#7`,front:`O que o Reno faz com três ACKs duplicados e com um timeout?`,back:`3 duplicados: ssthresh = metade do que estava em voo e cwnd = ssthresh. Timeout: o mesmo ssthresh e cwnd = 1, de volta à partida lenta.`},{id:`l9-tcp-janelas-congestionamento#8`,front:`Por que a partida lenta se chama "lenta" se ela dobra a cada RTT?`,back:`Porque começa de uma janela pequena, em vez de mandar a janela inteira de uma vez como os TCPs antigos faziam; o crescimento é exponencial.`},{id:`l9-tcp-janelas-congestionamento#9`,front:`O que é bloqueio de cabeça de fila no TCP, e como o QUIC o evita?`,back:`Uma perda segura todos os bytes que vêm depois, mesmo de outros arquivos, porque o TCP entrega um fluxo só, em ordem. O QUIC tem fluxos independentes: a perda só atrasa o fluxo dela.`},{id:`l9-tcp-janelas-congestionamento#10`,front:`Por que uma conexão QUIC sobrevive à troca de Wi-Fi para 4G e uma TCP não?`,back:`O TCP identifica a conexão por IPs e portas; o QUIC, por um ID de conexão que não muda quando o IP muda.`}]};export{e as default};
//# sourceMappingURL=l9-tcp-janelas-congestionamento-DcaHnOd7.js.map