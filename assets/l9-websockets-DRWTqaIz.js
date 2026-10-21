var e={id:`l9-websockets`,moduleId:`m9-3`,title:`WebSockets: do HTTP a um canal bidirecional em tempo real`,titleEn:`WebSockets: from HTTP to a real-time bidirectional channel`,summary:`Por que o HTTP sozinho não deixa o servidor falar primeiro, como o WebSocket nasce de um GET com Upgrade, como é cada quadro por dentro (FIN, opcode, tamanho em 7, 16 ou 64 bits, máscara), para que servem ping, pong e o fechamento com código, e o que um servidor com milhares de conexões longas precisa vigiar: Origin, heartbeat, tamanho máximo e clientes lentos.`,minutes:50,objectives:[`Comparar polling, long polling, Server-Sent Events e WebSocket e escolher o mais simples que resolve um caso concreto`,`Descrever o handshake de abertura e calcular o Sec-WebSocket-Accept a partir da chave do cliente`,`Ler e montar um quadro byte a byte: FIN, opcode, tamanho em 7, 16 ou 64 bits, bit de máscara e chave`,`Explicar por que só o cliente mascara, e o que a máscara protege (e o que não protege)`,`Usar ping, pong e o fechamento com código para manter e encerrar conexões`,`Listar os cuidados de um servidor com muitas conexões longas: Origin, autenticação, heartbeat, limite de tamanho e contrapressão`],skills:[`redes-sockets`],terms:[{pt:`WebSocket`,en:`WebSocket`,def:`Protocolo (RFC 6455) que transforma uma conexão HTTP em um canal bidirecional de mensagens, nos dois sentidos, a qualquer momento.`,example:`WebSocket connection to 'wss://example.com/ws' failed`},{pt:`consulta periódica`,en:`polling`,def:`O cliente pergunta ao servidor, de tempos em tempos, se há novidade.`},{pt:`consulta longa`,en:`long polling`,def:`O cliente faz uma requisição que o servidor só responde quando há novidade (ou quando o tempo limite estoura); a cada resposta, o cliente abre outra.`},{pt:`eventos enviados pelo servidor`,en:`Server-Sent Events (SSE)`,def:`Resposta HTTP que nunca termina, pela qual o servidor envia eventos de texto ao cliente; só no sentido servidor → cliente.`,example:`The EventSource interface is a connection to a server sending server-sent events.`},{pt:`troca de protocolo`,en:`protocol upgrade`,def:`Mecanismo do HTTP/1.1 (cabeçalho Upgrade, resposta 101) para passar a falar outro protocolo na mesma conexão.`,example:`101 Switching Protocols`},{pt:`handshake de abertura`,en:`opening handshake`,def:`O GET com Upgrade e a resposta 101 que estabelecem a conexão WebSocket.`},{pt:`quadro`,en:`frame`,def:`Unidade de transmissão do WebSocket: cabeçalho de 2 a 14 bytes seguido dos dados.`},{pt:`código de operação`,en:`opcode`,def:`Os 4 bits do quadro que dizem o que ele carrega: texto, binário, continuação, close, ping ou pong.`},{pt:`chave de máscara`,en:`masking key`,def:`4 bytes aleatórios que o cliente usa, com XOR, para embaralhar os dados de cada quadro.`},{pt:`quadro de controle`,en:`control frame`,def:`Quadro de close, ping ou pong: no máximo 125 bytes de dados e nunca fragmentado.`},{pt:`fragmentação`,en:`fragmentation`,def:`Dividir uma mensagem em vários quadros: o primeiro com o opcode, os seguintes como continuação, o último com FIN = 1.`},{pt:`batimento`,en:`heartbeat`,def:`Mensagem periódica (no WebSocket, ping e pong) para provar que a conexão continua viva e impedir que intermediários a derrubem por inatividade.`},{pt:`contrapressão`,en:`backpressure`,def:`Fazer quem produz dados mais rápido desacelerar (ou descartar) quando quem consome não dá conta, em vez de acumular sem limite.`},{pt:`sequestro de WebSocket entre sites`,en:`cross-site WebSocket hijacking (CSWSH)`,def:`Ataque em que uma página maliciosa abre um WebSocket para o seu servidor usando os cookies do usuário; evitado conferindo o Origin.`}],references:[`kurose-ross`,`mdn`,`python-docs`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`O HTTP é **pergunta e resposta**: o cliente pergunta, o servidor responde, e o servidor nunca fala primeiro. Isso não serve bem para um chat, para o aviso "Pix recebido" que aparece sozinho na tela da loja, para a posição do ônibus andando no mapa ou para um jogo: nesses casos, quem tem a novidade é o servidor, e ela precisa chegar **agora**.

O {{WebSocket|WebSocket}} (RFC 6455) resolve isso com um truque elegante: a conexão começa como uma requisição HTTP comum, um GET que pede uma {{troca de protocolo|protocol upgrade}}. Se o servidor aceita (resposta **101**), a **mesma conexão TCP** deixa de falar HTTP e vira um canal de **mensagens nos dois sentidos**, que qualquer lado pode usar a qualquer momento, por horas.

Na lição anterior você viu que o TCP entrega um fluxo de bytes e que a aplicação precisa enquadrar as mensagens. O WebSocket é exatamente isso, padronizado: um **protocolo de enquadramento** sobre TCP, que o navegador já sabe falar.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`### Antes do WebSocket: como o servidor "fala primeiro"`},{type:`table`,head:[`Técnica`,`Como funciona`,`Sentido`,`Custo e limites`],rows:[[`{{Consulta periódica|polling}}`,`o cliente pergunta "tem novidade?" a cada N segundos`,`cliente puxa`,`atraso de até N s; a maioria das respostas vem vazia, cada uma com cabeçalhos HTTP completos`],[`{{Consulta longa|long polling}}`,`o servidor segura a requisição até ter novidade (ou até um tempo limite); o cliente reabre logo em seguida`,`servidor responde quando quer`,`funciona em qualquer infraestrutura HTTP; uma requisição inteira por mensagem; o que chega entre uma resposta e a reabertura precisa ficar guardado`],[`{{Eventos enviados pelo servidor|Server-Sent Events (SSE)}}`,"uma resposta `text/event-stream` que nunca termina; no navegador, `EventSource`",`só servidor → cliente`,"texto; reconexão automática com `Last-Event-ID`; no HTTP/1.1, o navegador limita a 6 conexões por domínio"],[`WebSocket`,`GET com Upgrade, resposta 101, depois quadros nos dois sentidos`,`bidirecional`,`2 a 14 bytes de cabeçalho por quadro; texto ou binário; exige cuidado com proxies e com estado no servidor`]],caption:`Escolha o mais simples que resolve. Placar ao vivo ou notificações: SSE basta. Chat, jogo, edição colaborativa: WebSocket.`},{type:`md`,text:'### O {{handshake de abertura|opening handshake}}\n\nDepois do handshake do TCP (e do TLS, se for `wss://`), o cliente envia:\n\n```\nGET /chat HTTP/1.1\nHost: loja.exemplo.com.br\nUpgrade: websocket\nConnection: Upgrade\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\nSec-WebSocket-Version: 13\nOrigin: https://loja.exemplo.com.br\n```\n\nE o servidor, se aceitar, responde:\n\n```\nHTTP/1.1 101 Switching Protocols\nUpgrade: websocket\nConnection: Upgrade\nSec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=\n```\n\n- **Sec-WebSocket-Key** são 16 bytes aleatórios em base64, novos a cada conexão.\n- **Sec-WebSocket-Accept** = base64( SHA-1( chave + `"258EAFA5-E914-47DA-95CA-C5AB0DC85B11"` ) ). Esse texto fixo (um GUID) está na RFC.\n- A conta **não é autenticação nem criptografia**: ela só prova que quem respondeu entendeu WebSocket, e não é um servidor HTTP qualquer ou um cache devolvendo uma resposta velha.\n- Cabeçalhos que começam com `Sec-` não podem ser definidos por `fetch` nem por `XMLHttpRequest` no navegador. Por isso uma página não consegue fingir um handshake WebSocket com uma requisição comum.\n- Se o servidor não fala a versão pedida, responde com erro (por exemplo **426 Upgrade Required**) e um cabeçalho `Sec-WebSocket-Version` com as versões que aceita. A única versão em uso é a 13.\n- Opcionais: `Sec-WebSocket-Protocol` negocia um subprotocolo (por exemplo, `mqtt`), e `Sec-WebSocket-Extensions` negocia extensões, como a compressão `permessage-deflate` (RFC 7692).\n\nDepois do 101, **acabou o HTTP** naquela conexão: o que trafega são quadros. `ws://` usa a porta 80 e `wss://` usa a 443, com TLS. Prefira `wss://`: além da segurança, proxies no meio do caminho que não entendem WebSocket costumam atrapalhar tráfego aberto na porta 80, mas não conseguem mexer no que vai cifrado.\n\n### O {{quadro|frame}} por dentro'},{type:`table`,head:[`Campo`,`Bits`,`Significado`],rows:[[`FIN`,`1`,`1 = último quadro da mensagem`],[`RSV1, RSV2, RSV3`,`3`,`reservados para extensões (a compressão usa o RSV1); sem extensão negociada, têm de ser 0`],[`{{código de operação|opcode}}`,`4`,`0x0 continuação, 0x1 texto, 0x2 binário, 0x8 close, 0x9 ping, 0xA pong; os demais são reservados`],[`MASK`,`1`,`1 = os dados vêm mascarados e há uma chave de 4 bytes`],[`tamanho`,`7`,`0 a 125: é o tamanho; 126: o tamanho está nos 2 bytes seguintes (16 bits); 127: está nos 8 bytes seguintes (64 bits, bit mais alto 0)`],[`{{chave de máscara|masking key}}`,`0 ou 32`,`presente só se MASK = 1`],[`dados`,`8 × tamanho`,`o conteúdo (payload)`]],caption:`Todos os números com mais de um byte vão em big-endian (ordem de rede). O tamanho tem de usar a forma mais curta possível: 100 bytes não podem ser declarados com 126 + 16 bits.`},{type:`md`,text:`Uma mensagem curta do servidor custa só **2 bytes** de cabeçalho; uma do cliente, 6 (2 + 4 da chave). Compare com as centenas de bytes de cabeçalhos de cada requisição no polling.

### A máscara: só do cliente para o servidor

Todo quadro do cliente **tem** de vir mascarado, e nenhum quadro do servidor pode vir. O servidor que recebe um quadro sem máscara deve fechar a conexão. Mascarar é fazer XOR de cada byte com a chave: \`dado[i] ^ chave[i % 4]\`. Desmascarar é a mesma conta, porque \`(x ^ k) ^ k == x\`.

A chave viaja no próprio quadro, então **isso não é criptografia** (para sigilo existe o \`wss://\`). A máscara existe por causa de proxies e caches antigos no caminho: em 2010, durante a padronização, pesquisadores mostraram que, se o script de uma página escolhesse os bytes exatos que vão para a rede, poderia escrever algo que um proxy transparente mal implementado interpretasse como uma requisição HTTP, e envenenar o cache dele para outros usuários. Com uma chave nova e imprevisível a cada quadro, o script não controla mais os bytes que saem.

### Mensagens, {{fragmentação|fragmentation}} e {{quadros de controle|control frames}}

- Uma mensagem pode ir em vários quadros: o primeiro com opcode 0x1 ou 0x2 e FIN = 0, os do meio com opcode 0x0 (continuação) e o último com FIN = 1. O texto só precisa ser UTF-8 válido **na mensagem inteira**: um "ç" pode ficar partido entre dois quadros, como no \`LeitorDeLinhas\` da lição anterior.
- **Close, ping e pong** são quadros de controle: no máximo 125 bytes de dados, **nunca fragmentados**, e podem aparecer **no meio** dos fragmentos de uma mensagem.
- Quem recebe um **ping** responde com um **pong** com os mesmos dados. É o {{batimento|heartbeat}} da conexão.
- O **close** carrega, opcionalmente, um código de 2 bytes e um motivo em texto. Quem recebe responde com outro close, e só então a conexão TCP é fechada (de preferência, pelo servidor).`},{type:`table`,head:[`Código`,`Nome (registro da IANA)`,`Quando`],rows:[[`1000`,`Normal Closure`,`encerramento normal: o usuário saiu da sala`],[`1001`,`Going Away`,`o servidor vai desligar (deploy) ou a página foi fechada`],[`1002`,`Protocol Error`,`o outro lado violou o protocolo (por exemplo, quadro do cliente sem máscara)`],[`1003`,`Unsupported Data`,`tipo de dado que o lado não aceita (binário onde só se aceita texto)`],[`1006`,`Abnormal Closure`,`**nunca vai na rede**: é o que a API informa quando a conexão caiu sem quadro de close`],[`1008`,`Policy Violation`,`violou uma regra da aplicação (por exemplo, Origin não permitido)`],[`1009`,`Message Too Big`,`mensagem maior que o limite aceito`],[`1011`,`Internal Error`,`o servidor encontrou um erro inesperado`]]},{type:`md`,text:`### Um servidor com milhares de conexões longas

Um servidor HTTP atende uma requisição e esquece o cliente. Um servidor WebSocket fica com **milhares de conexões abertas por horas**, quase sempre paradas. Isso muda as preocupações:

- **Modelo de concorrência.** Uma thread por conexão, com 20 mil usuários conectados e calados, são 20 mil threads, cada uma com a sua pilha, paradas só esperando. É o caso típico de E/S assíncrona: uma conexão parada vira só um objeto com o seu buffer e o seu estado, e um único laço de eventos atende todas.
- **Batimento.** Roteadores com NAT, firewalls e proxies derrubam conexões que ficam muito tempo sem tráfego (o Nginx, por padrão, fecha a conexão com o servidor depois de 60 s sem receber nada dele). E, quando o celular entra num túnel do metrô, o servidor não recebe aviso nenhum: a conexão fica **meio aberta**. Um ping a cada 20 a 30 s, fechando a conexão se o pong não vier a tempo, resolve as duas coisas.
- **Tamanho máximo.** O cabeçalho permite declarar até 2⁶³ − 1 bytes. Decida pelo cabeçalho, antes de acumular os dados: se o tamanho declarado passa do limite, feche com 1009. A biblioteca \`websockets\` do Python limita a 1 MiB por padrão.
- **Clientes lentos e {{contrapressão|backpressure}}.** Um placar enviado a 5 mil pessoas, e uma delas está num 3G ruim. Se o servidor enfileira sem limite tudo o que ela ainda não recebeu, a memória cresce até o processo cair. Limite a fila de cada cliente e decida o que fazer quando ela enche: descartar as mensagens velhas (num placar, só o último valor importa) ou desconectar o cliente.
- **Origin e autenticação.** WebSocket **não passa pelo CORS**: qualquer página, de qualquer site, pode abrir uma conexão com o seu servidor, e o navegador pode mandar junto os cookies do seu domínio (a menos que o atributo SameSite do cookie impeça). Isso é o {{sequestro de WebSocket entre sites|cross-site WebSocket hijacking (CSWSH)}}. No handshake, confira o \`Origin\` contra uma lista de origens permitidas e autentique o usuário. A API do navegador não deixa definir cabeçalhos como \`Authorization\`: use o cookie de sessão (com a checagem de Origin) ou um bilhete de uso único e curta duração na primeira mensagem. Token na URL acaba gravado em logs.`},{type:`callout`,tone:`deep`,text:`O WebSocket original vive numa conexão HTTP/1.1 inteira. A RFC 8441 definiu como abrir um WebSocket dentro de um **stream** do HTTP/2 (com o método CONNECT estendido), e a RFC 9220 fez o mesmo para o HTTP/3. Os quadros continuam os mesmos; muda só como o canal é aberto, e várias conexões WebSocket podem dividir uma única conexão com o servidor. O **WebTransport**, sobre HTTP/3 e QUIC, vai além: vários fluxos independentes e datagramas sem garantia de entrega, úteis para jogos e mídia.`,title:`Aprofundando`}]},{stage:`exemplo`,blocks:[{type:`viz`,viz:`tcp-handshake`,caption:`O handshake WebSocket só começa depois deste: primeiro o TCP em três vias (e, no wss://, o TLS). Só então vai o GET com Upgrade, já dentro da conexão estabelecida.`},{type:`md`,text:`### "Hello" de ida e volta, byte a byte

O navegador manda a mensagem de texto "Hello". Na rede vão 11 bytes (o exemplo é da própria RFC 6455):

\`81 85 37 fa 21 3d 7f 9f 4d 51 58\``},{type:`table`,head:[`Bytes`,`Em binário`,`Leitura`],rows:[[`81`,`1000 0001`,`FIN = 1 (mensagem inteira), RSV = 000, opcode = 0x1 (texto)`],[`85`,`1000 0101`,`MASK = 1 (veio do cliente), tamanho = 5`],[`37 fa 21 3d`,``,`chave de máscara`],[`7f 9f 4d 51 58`,``,`dados mascarados`]]},{type:`md`,text:"Para desmascarar, cada byte faz XOR com o byte da chave na posição `i % 4`:"},{type:`table`,head:[`i`,`mascarado`,`chave[i % 4]`,`XOR`,`letra`],rows:[[`0`,`7f`,`37`,`48`,`H`],[`1`,`9f`,`fa`,`65`,`e`],[`2`,`4d`,`21`,`6c`,`l`],[`3`,`51`,`3d`,`6c`,`l`],[`4`,`58`,`37 (de novo a posição 0)`,`6f`,`o`]]},{type:`md`,text:"O servidor responde o eco **sem máscara**: `81 05 48 65 6c 6c 6f`, 7 bytes. Outros quadros que você vai encontrar:\n\n- mensagem de 300 bytes do servidor: `81 7e 01 2c` + os 300 bytes (126 no campo de tamanho, e 0x012c = 300 nos 2 bytes seguintes);\n- ping do servidor, sem dados: `89 00`; o pong do cliente: `8a 80` + 4 bytes de chave (mascarado, mesmo sem dados);\n- close do servidor com o código 1000: `88 02 03 e8` (0x03e8 = 1000)."}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`import base64
import hashlib

GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

def aceite(chave):
    return base64.b64encode(hashlib.sha1((chave + GUID).encode()).digest()).decode()

print("Accept:", aceite("dGhlIHNhbXBsZSBub25jZQ=="))   # o exemplo da RFC 6455

# Lendo o quadro "Hello" que o navegador mandou
quadro = bytes.fromhex("81 85 37 fa 21 3d 7f 9f 4d 51 58")
fin, opcode = quadro[0] >> 7, quadro[0] & 0x0F
mascarado, tamanho = quadro[1] >> 7, quadro[1] & 0x7F
chave = quadro[2:6]
dados = bytes(b ^ chave[i % 4] for i, b in enumerate(quadro[6:6 + tamanho]))
print(f"FIN={fin} opcode={opcode} MASK={mascarado} tamanho={tamanho} ->", dados.decode())

# Montando a resposta do servidor: sem máscara
resposta = bytes([0x80 | 0x1, len(dados)]) + dados
print("resposta:", resposta.hex(" "))`,runnable:!0},{type:`code`,lang:`python`,code:`# chat_ws.py — rode no seu computador: pip install websockets
import asyncio
from websockets.asyncio.server import serve, broadcast

conectados = set()

async def chat(ws):
    conectados.add(ws)
    try:
        async for mensagem in ws:        # cada volta é uma mensagem inteira: já desmascarada e remontada
            broadcast(conectados, mensagem)
    finally:
        conectados.discard(ws)           # saiu, caiu ou fechou: tira da lista

async def main():
    async with serve(
        chat, "localhost", 8765,
        origins=["http://localhost:8000"],   # rejeita o handshake de outras origens
        ping_interval=20, ping_timeout=20,   # batimento: sem pong em 20 s, fecha
        max_size=64 * 1024,                  # mensagem maior: fecha com 1009
    ) as servidor:
        await servidor.serve_forever()

asyncio.run(main())`,runnable:!1,caption:`A biblioteca cuida do handshake, da máscara, dos fragmentos, do ping/pong e do close. O broadcast não espera clientes lentos: as mensagens se acumulam no buffer de escrita deles, e por isso a documentação recomenda batimentos curtos, que derrubam logo quem parou de responder.`},{type:`code`,lang:`javascript`,code:`// Na página servida em http://localhost:8000 (por exemplo, com python -m http.server 8000)
const ws = new WebSocket("ws://localhost:8765");
ws.addEventListener("open", () => ws.send("olá, pessoal"));
ws.addEventListener("message", (e) => console.log("chegou:", e.data));
ws.addEventListener("close", (e) => console.log("fechou:", e.code, e.reason));`,runnable:!1,caption:`O cliente do navegador. Abra duas abas: o que uma envia aparece nas duas. Abra a página por outro endereço (como 127.0.0.1:8000) e veja o handshake ser recusado por causa do Origin.`},{type:`callout`,tone:`tip`,text:`Na aba **Rede** (Network) das ferramentas do desenvolvedor, filtre por **WS** e clique na conexão: a guia **Mensagens** mostra cada quadro enviado e recebido, e os cabeçalhos mostram o handshake com o 101.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e9-ws-1`,kind:`mcq`,prompt:"O servidor respondeu `HTTP/1.1 101 Switching Protocols` ao GET com `Upgrade: websocket`. O que passa a trafegar naquela conexão TCP?",difficulty:`facil`,skills:[`redes-sockets`],hints:[`O que significa "trocar de protocolo" numa conexão que já existe?`,`Depois do 101, ainda faz sentido haver linha de requisição e cabeçalhos HTTP em cada mensagem?`],explanation:`O 101 encerra o HTTP naquela conexão. A mesma conexão TCP passa a carregar quadros WebSocket, nos dois sentidos e a qualquer momento. Como o WebSocket tem enquadramento próprio, a aplicação recebe mensagens inteiras, e não pedaços de um fluxo de bytes.`,options:[{text:`Requisições e respostas HTTP comuns, uma para cada mensagem`,feedback:`Isso é o long polling. Depois do 101 não há mais requisições HTTP naquela conexão: cada mensagem custa só 2 a 14 bytes de cabeçalho.`},{text:`Quadros WebSocket nos dois sentidos, na mesma conexão TCP`,correct:!0,feedback:`Isso. A troca de protocolo reaproveita a conexão; daí em diante, qualquer lado envia quadros quando quiser.`},{text:`Nada: o cliente abre uma nova conexão TCP, numa porta própria do WebSocket`,feedback:`O upgrade acontece na mesma conexão (e nas mesmas portas 80 ou 443). É justamente por começar como HTTP que o WebSocket passa por firewalls e proxies que só deixam passar a web.`},{text:`Bytes soltos, sem fronteiras, como num socket TCP puro`,feedback:`O WebSocket tem enquadramento próprio (FIN, opcode, tamanho). A aplicação não precisa inventar delimitadores: recebe mensagens inteiras.`}]}},{type:`exercise`,exercise:{id:`e9-ws-2`,kind:`fill`,lang:`python`,prompt:`Complete a leitura dos dois primeiros bytes de um quadro: o bit FIN (o mais alto do primeiro byte), o opcode (os 4 bits mais baixos do primeiro byte) e o tamanho (os 7 bits mais baixos do segundo byte). Use deslocamentos e máscaras de bits.`,difficulty:`intermediario`,skills:[`redes-sockets`],hints:[`Num byte, os bits são numerados de 7 (o mais alto) a 0. Quantas posições o bit mais alto precisa andar para a direita até virar o bit 0?`,`Para ficar só com os 4 bits de baixo, faça AND com um número que tem exatamente esses 4 bits ligados. Quanto vale 1111 em binário?`,`O mesmo raciocínio vale para os 7 bits de baixo: que número tem os bits 0 a 6 ligados e o 7 desligado?`],explanation:"`b0 >> 7` traz o bit mais alto para a posição 0 (o `& 1` é só garantia). `b0 & 0x0F` (15) zera os 4 bits de cima e deixa o opcode. `b1 & 0x7F` (127) zera o bit de máscara e deixa o tamanho de 7 bits. Com os bytes 0x81 e 0x85 do exemplo, isso dá FIN = 1, opcode = 1 e tamanho = 5.",template:`b0, b1 = quadro[0], quadro[1]
fin = (b0 >> ___) & 1
opcode = b0 & ___
mascarado = (b1 >> 7) & 1
tamanho = b1 & ___`,blanks:[[`7`],[`0x0F`,`0x0f`,`0xF`,`0xf`,`15`,`0b1111`,`0b00001111`],[`0x7F`,`0x7f`,`127`,`0b1111111`,`0b01111111`]]}},{type:`exercise`,exercise:{id:`e9-ws-3`,kind:`predict`,lang:`python`,prompt:`A função calcula quantos bytes de cabeçalho um quadro precisa, conforme o tamanho dos dados e a máscara. O que o programa imprime?`,difficulty:`intermediario`,skills:[`redes-sockets`],hints:[`Quais são os três "degraus" do campo de tamanho, e em que valores exatos se passa de um para o outro?`,`126 cabe nos 7 bits? Lembre que 126 e 127 são valores especiais nesse campo.`,`A máscara acrescenta quantos bytes, e em quais quadros?`],explanation:`Até 125 bytes, o tamanho cabe nos 7 bits: 2 bytes de cabeçalho. De 126 a 65 535, entram mais 2 bytes (16 bits): 4 no total. Acima disso, mais 8 bytes (64 bits): 10. A máscara soma 4 bytes. Por isso 5 mascarado dá 6, 125 dá 2, 126 dá 4 e 65 536 mascarado dá 2 + 8 + 4 = 14.`,code:`def tamanho_cabecalho(n, mascarado):
    total = 2
    if n > 65535:
        total += 8
    elif n > 125:
        total += 2
    if mascarado:
        total += 4
    return total

for n, m in [(5, True), (125, False), (126, False), (65536, True)]:
    print(n, tamanho_cabecalho(n, m))`,answer:`5 6
125 2
126 4
65536 14`}},{type:`exercise`,exercise:{id:`e9-ws-4`,kind:`code`,lang:`python`,prompt:'Escreva `responder_handshake(requisicao)`, que recebe o texto de uma requisição HTTP (linhas separadas por `"\\r\\n"`, terminando numa linha vazia) e devolve o texto da resposta:\n\n- **101**, se for um handshake WebSocket válido:\n  `"HTTP/1.1 101 Switching Protocols\\r\\nUpgrade: websocket\\r\\nConnection: Upgrade\\r\\nSec-WebSocket-Accept: <aceite>\\r\\n\\r\\n"`\n- **400**, `"HTTP/1.1 400 Bad Request\\r\\n\\r\\n"`, se o método não for GET, se `Upgrade` não for `websocket`, se `Connection` não tiver o item `Upgrade` ou se `Sec-WebSocket-Key` não for base64 de exatamente 16 bytes;\n- **426**, `"HTTP/1.1 426 Upgrade Required\\r\\nSec-WebSocket-Version: 13\\r\\n\\r\\n"`, se estiver tudo certo menos a versão, que não é `13`.\n\nComo no HTTP, **nomes** de cabeçalho não diferenciam maiúsculas de minúsculas, e os valores de `Upgrade` e dos itens de `Connection` também não. `Connection` pode ser uma lista separada por vírgulas: o Firefox manda `keep-alive, Upgrade`. Ignore espaços em volta dos valores.',difficulty:`intermediario`,skills:[`redes-sockets`],hints:[`Antes de validar qualquer coisa, como transformar as linhas de cabeçalho num dicionário que você consiga consultar sem se preocupar com maiúsculas?`,`A primeira linha é diferente das outras. Que três partes ela tem, e qual delas diz o método?`,'`Connection: keep-alive, Upgrade` tem dois itens. Como você confere se um deles é "upgrade"?',"Como saber se a chave é base64 de 16 bytes? Decodifique com `validate=True` e olhe o tamanho. E se a decodificação falhar, que exceção aparece? Teste com uma chave que tenha acento.",`A ordem das checagens importa: a versão só deve dar 426 quando todo o resto estiver certo.`],explanation:"O roteiro é: separar a primeira linha (método, caminho, versão), montar um dicionário com os nomes em minúsculas, validar na ordem (método, Upgrade, Connection, chave) e, só no fim, a versão. O aceite é `base64(SHA-1(chave + GUID))`, calculado sobre a chave **como texto**, do jeito que chegou.\n\nOs detalhes que derrubam implementações reais são exatamente os dos testes: `Connection` com mais de um item, cabeçalhos em minúsculas (o HTTP/2 e muitos proxies mandam assim) e chaves inválidas. Um servidor de produção ainda confere o `Host` e o `Origin`, e pode negociar subprotocolos e extensões.",starter:`import base64
import hashlib

GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

def responder_handshake(requisicao):
    # 1. separe a linha de requisição dos cabeçalhos (dicionário com nomes em minúsculas)
    # 2. valide método, Upgrade, Connection e Sec-WebSocket-Key (400 se algo falhar)
    # 3. confira a versão (426 se não for 13)
    # 4. calcule o aceite e devolva a resposta 101
    pass`,solution:`import base64
import hashlib

GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

def responder_handshake(requisicao):
    linhas = requisicao.split("\\r\\n")
    partes = linhas[0].split()
    cabecalhos = {}
    for linha in linhas[1:]:
        if not linha:
            break
        nome, _, valor = linha.partition(":")
        cabecalhos[nome.strip().lower()] = valor.strip()

    ruim = "HTTP/1.1 400 Bad Request\\r\\n\\r\\n"
    if len(partes) != 3 or partes[0] != "GET":
        return ruim
    if cabecalhos.get("upgrade", "").lower() != "websocket":
        return ruim
    itens = [i.strip().lower() for i in cabecalhos.get("connection", "").split(",")]
    if "upgrade" not in itens:
        return ruim
    chave = cabecalhos.get("sec-websocket-key", "")
    try:
        if len(base64.b64decode(chave, validate=True)) != 16:
            return ruim
    except ValueError:              # binascii.Error é um ValueError; texto não ASCII também dá ValueError
        return ruim
    if cabecalhos.get("sec-websocket-version") != "13":
        return "HTTP/1.1 426 Upgrade Required\\r\\nSec-WebSocket-Version: 13\\r\\n\\r\\n"

    aceite = base64.b64encode(hashlib.sha1((chave + GUID).encode()).digest()).decode()
    return ("HTTP/1.1 101 Switching Protocols\\r\\n"
            "Upgrade: websocket\\r\\n"
            "Connection: Upgrade\\r\\n"
            f"Sec-WebSocket-Accept: {aceite}\\r\\n\\r\\n")`,tests:[{name:`o exemplo da RFC 6455`,code:`req = "GET /chat HTTP/1.1\\r\\nHost: exemplo.com.br\\r\\nUpgrade: websocket\\r\\nConnection: Upgrade\\r\\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\\r\\nSec-WebSocket-Version: 13\\r\\n\\r\\n"
r = responder_handshake(req)
esperado = "HTTP/1.1 101 Switching Protocols\\r\\nUpgrade: websocket\\r\\nConnection: Upgrade\\r\\nSec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=\\r\\n\\r\\n"
assert r == esperado, f"para o exemplo da RFC a resposta deveria ser {esperado!r}; veio {r!r}"`},{name:`outra chave (o aceite é calculado, não copiado)`,code:`import base64 as _b64, hashlib as _h
_k = _b64.b64encode(bytes(range(16))).decode()
_acc = _b64.b64encode(_h.sha1((_k + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").encode()).digest()).decode()
req = f"GET / HTTP/1.1\\r\\nHost: a\\r\\nUpgrade: websocket\\r\\nConnection: Upgrade\\r\\nSec-WebSocket-Key: {_k}\\r\\nSec-WebSocket-Version: 13\\r\\n\\r\\n"
r = responder_handshake(req)
assert r is not None and f"Sec-WebSocket-Accept: {_acc}\\r\\n" in r, f"com a chave {_k!r}, o aceite deveria ser {_acc!r}; veio {r!r}"`},{name:`Connection com lista e cabeçalhos em minúsculas (Firefox, HTTP/2, proxies)`,code:`req = "GET /chat HTTP/1.1\\r\\nhost: exemplo.com.br\\r\\nupgrade: WebSocket\\r\\nconnection: keep-alive, Upgrade\\r\\nsec-websocket-key:   dGhlIHNhbXBsZSBub25jZQ==  \\r\\nsec-websocket-version: 13\\r\\n\\r\\n"
r = responder_handshake(req)
assert r is not None and r.startswith("HTTP/1.1 101 "), f"'connection: keep-alive, Upgrade' tem o item Upgrade, e nomes de cabeçalho não diferenciam maiúsculas: deveria ser 101; veio {r!r}"
assert "s3pPLMBiTxaQ9kYGzzhZRbK+xOo=" in r, f"os espaços em volta da chave não fazem parte dela; veio {r!r}"`},{name:`requisições inválidas dão 400`,code:`base = {"Host": "a", "Upgrade": "websocket", "Connection": "Upgrade", "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==", "Sec-WebSocket-Version": "13"}
def _monta(metodo="GET", **troca):
    cab = dict(base)
    for k, v in troca.items():
        k = k.replace("_", "-")
        if v is None:
            cab.pop(k, None)
        else:
            cab[k] = v
    return f"{metodo} /chat HTTP/1.1\\r\\n" + "".join(f"{k}: {v}\\r\\n" for k, v in cab.items()) + "\\r\\n"
ruim = "HTTP/1.1 400 Bad Request\\r\\n\\r\\n"
casos = [
    (_monta(metodo="POST"), "método POST"),
    (_monta(metodo="get"), "método 'get': no HTTP, o nome do método diferencia maiúsculas de minúsculas (só os nomes de cabeçalho não diferenciam)"),
    (_monta(Upgrade=None), "sem Upgrade"),
    (_monta(Upgrade="h2c"), "Upgrade para outro protocolo"),
    (_monta(Connection="keep-alive"), "Connection sem o item Upgrade"),
    (_monta(**{"Sec-WebSocket-Key": None}), "sem chave"),
    (_monta(**{"Sec-WebSocket-Key": "YWJj"}), "chave de 3 bytes (precisa ter 16)"),
    (_monta(**{"Sec-WebSocket-Key": "isto não é base64!!"}), "chave que não é base64"),
    (_monta(**{"Sec-WebSocket-Key": "dGhlIHNhbXBs-ZSBub25jZQ=="}), "chave com '-', que não existe no alfabeto do base64 (sem validate=True, o '-' seria ignorado)"),
    (_monta(Connection="keep-alive, X-Upgrade"), "Connection com um item que só contém a palavra upgrade (compare item a item, não por trecho do texto)"),
]
for req, motivo in casos:
    r = responder_handshake(req)
    assert r == ruim, f"{motivo}: deveria ser {ruim!r}; veio {r!r}"`},{name:`versão errada dá 426, mas só se o resto estiver certo`,code:`req = "GET / HTTP/1.1\\r\\nHost: a\\r\\nUpgrade: websocket\\r\\nConnection: Upgrade\\r\\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\\r\\nSec-WebSocket-Version: 8\\r\\n\\r\\n"
r = responder_handshake(req)
esperado = "HTTP/1.1 426 Upgrade Required\\r\\nSec-WebSocket-Version: 13\\r\\n\\r\\n"
assert r == esperado, f"versão 8: deveria ser {esperado!r}; veio {r!r}"
req2 = "POST / HTTP/1.1\\r\\nHost: a\\r\\nUpgrade: websocket\\r\\nConnection: Upgrade\\r\\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\\r\\nSec-WebSocket-Version: 8\\r\\n\\r\\n"
r2 = responder_handshake(req2)
assert r2 == "HTTP/1.1 400 Bad Request\\r\\n\\r\\n", f"POST com versão 8: o método já é inválido, então é 400; veio {r2!r}"`}]}},{type:`exercise`,exercise:{id:`e9-ws-5`,kind:`fix`,lang:`python`,prompt:'`montar_quadro(texto)` deveria montar o quadro de texto que o **servidor** envia (FIN = 1, opcode 0x1, sem máscara), escolhendo o campo de tamanho de 7, 16 ou 64 bits. Ela funciona com "oi", mas quebra com "olá" e com mensagens longas. Encontre e corrija os dois erros.',difficulty:`intermediario`,skills:[`redes-sockets`,`comp-binario`],hints:[`O campo de tamanho conta o quê: caracteres ou bytes? Quantos bytes tem "olá" em UTF-8?`,`Rode com uma mensagem de 70 000 letras. Que erro aparece, e o que o formato "H" do struct consegue representar?`,`Quantos bytes o tamanho estendido ocupa quando o campo de 7 bits vale 127? Qual letra do struct corresponde a esse tamanho?`],explanation:'Primeiro erro: o tamanho tem de ser `len(dados)`, em bytes, e não `len(texto)`, em caracteres. "olá" tem 3 caracteres e 4 bytes, e um cliente que lê 3 bytes perde o último e desalinha todos os quadros seguintes. Segundo erro: com 127 no campo de 7 bits, o tamanho vai em 8 bytes, formato "Q" (inteiro sem sinal de 64 bits); "H" só tem 16 bits e falha acima de 65 535. O "!" no formato garante a ordem de rede (big-endian).',starter:`import struct

def montar_quadro(texto):
    dados = texto.encode("utf-8")
    n = len(texto)
    if n <= 125:
        cabecalho = struct.pack("!BB", 0x81, n)
    elif n <= 65535:
        cabecalho = struct.pack("!BBH", 0x81, 126, n)
    else:
        cabecalho = struct.pack("!BBH", 0x81, 127, n)
    return cabecalho + dados`,solution:`import struct

def montar_quadro(texto):
    dados = texto.encode("utf-8")
    n = len(dados)
    if n <= 125:
        cabecalho = struct.pack("!BB", 0x81, n)
    elif n <= 65535:
        cabecalho = struct.pack("!BBH", 0x81, 126, n)
    else:
        cabecalho = struct.pack("!BBQ", 0x81, 127, n)
    return cabecalho + dados`,tests:[{name:`mensagem curta`,code:`q = montar_quadro("oi")
assert q == bytes([0x81, 2]) + b"oi", f"esperado 81 02 6f 69; veio {q.hex(' ')}"`},{name:`acentos: o tamanho é em bytes`,code:`q = montar_quadro("olá")
assert q[1] == 4, f"'olá' tem 3 caracteres, mas 4 bytes em UTF-8; o campo de tamanho veio {q[1]}"
assert q[2:] == "olá".encode("utf-8"), "os dados devem ser o texto em UTF-8"`},{name:`fronteira 125 / 126`,code:`q = montar_quadro("a" * 125)
assert q[1] == 125 and len(q) == 127, "125 bytes ainda cabem no campo de 7 bits"
q = montar_quadro("a" * 126)
assert q[1] == 126 and q[2:4] == (126).to_bytes(2, "big") and len(q) == 4 + 126, "126 bytes já usam o tamanho estendido de 16 bits"`},{name:`acentos que cruzam a fronteira`,code:`q = montar_quadro("é" * 100)
assert q[1] == 126, f"100 letras 'é' são 200 bytes: precisa do tamanho de 16 bits (126); veio {q[1]}"
assert int.from_bytes(q[2:4], "big") == 200, "o tamanho estendido deveria ser 200"`},{name:`fronteira 65 535 / 65 536 e 64 bits`,code:`q = montar_quadro("a" * 65535)
assert q[1] == 126 and int.from_bytes(q[2:4], "big") == 65535, "65 535 ainda cabe em 16 bits"
q = montar_quadro("a" * 70000)
assert q[1] == 127, "acima de 65 535, o campo de 7 bits vale 127"
assert int.from_bytes(q[2:10], "big") == 70000 and len(q) == 10 + 70000, "o tamanho de 64 bits ocupa 8 bytes, logo depois dos 2 primeiros"`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e9-ws-desafio`,kind:`code`,lang:`python`,prompt:'Escreva o leitor de quadros de um **servidor**: `ler_quadros(buffer, limite=1_000_000)` recebe os bytes acumulados de `recv()` e devolve `(quadros, resto)`, onde `quadros` é a lista de tuplas `(fin, opcode, dados)` dos quadros completos, **na ordem**, com `fin` booleano e `dados` já **desmascarados** (bytes), e `resto` são os bytes de um quadro ainda incompleto (ou `b""`).\n\nLevante `ValueError` (é o caso de fechar com 1002 ou 1009) se encontrar:\n- bits RSV ligados (nenhuma extensão foi negociada);\n- opcode reservado (só valem 0x0, 0x1, 0x2, 0x8, 0x9 e 0xA);\n- quadro **sem máscara** (todo quadro do cliente é mascarado);\n- quadro de controle (opcode 0x8 ou mais) com FIN = 0 ou com mais de 125 bytes;\n- tamanho declarado maior que `limite`. Atenção: decida isso **assim que o tamanho estiver no buffer**, sem esperar os dados chegarem.\n\nNão monte as mensagens: devolva cada quadro como veio, mesmo os fragmentos e os pings que aparecem no meio deles.',difficulty:`desafio`,skills:[`redes-sockets`,`comp-binario`],hints:[`Quantos bytes você precisa ter no buffer para começar a ler um quadro? E para saber o tamanho dele, nos três casos do campo de 7 bits?`,`Faça um laço que, a cada volta, tenta ler um quadro do começo do buffer. Em que situações ele deve parar e devolver o que sobrou?`,`Escreva a posição onde começa a chave como uma variável que depende do caso (2, 4 ou 10). Onde começam os dados?`,`As validações que dependem só dos dois primeiros bytes podem ser feitas antes de qualquer espera. E a do limite: com um cabeçalho que declara 1 TiB e nenhum dado, sua função levanta o erro ou fica esperando os dados?`,`Para desmascarar, cada byte i dos dados faz XOR com a chave na posição i % 4. Teste com o "Hello" da RFC.`],explanation:`O laço tenta ler um quadro do começo do buffer: com 2 bytes, já dá para validar RSV, opcode, máscara e as regras dos quadros de controle; com 2, 4 ou 10 bytes, sabe-se o tamanho, e é aí que o limite é conferido; com \`pos + 4 + n\` bytes, o quadro está completo e pode ser desmascarado e retirado do buffer. Faltou byte em qualquer etapa? Para e devolve o resto, e a próxima chamada recomeça do mesmo quadro.

O ponto de segurança é o limite: um servidor que espera os dados antes de olhar o tamanho deixa qualquer cliente fazê-lo acumular bytes sem fim. Basta um cabeçalho de 14 bytes declarando 1 TiB e ir mandando dados. Bibliotecas reais fazem exatamente essas validações e, a partir daí, montam as mensagens: juntam os fragmentos até o FIN, conferem o UTF-8 da mensagem inteira e respondem pings sem esperar o fim da mensagem fragmentada.`,starter:`def ler_quadros(buffer, limite=1_000_000):
    # devolva (lista de (fin, opcode, dados desmascarados), bytes que sobraram)
    # levante ValueError nos casos do enunciado
    return [], buffer`,solution:`OPCODES = {0x0, 0x1, 0x2, 0x8, 0x9, 0xA}

def ler_quadros(buffer, limite=1_000_000):
    quadros = []
    while len(buffer) >= 2:
        b0, b1 = buffer[0], buffer[1]
        fin = bool(b0 & 0x80)
        rsv = (b0 >> 4) & 0x7
        opcode = b0 & 0x0F
        mascarado = b1 & 0x80
        n = b1 & 0x7F
        if rsv:
            raise ValueError("bits RSV ligados sem extensão negociada")
        if opcode not in OPCODES:
            raise ValueError(f"opcode reservado: {opcode:#x}")
        if not mascarado:
            raise ValueError("quadro do cliente sem máscara")
        if opcode >= 0x8 and (not fin or n > 125):
            raise ValueError("quadro de controle fragmentado ou grande demais")

        pos = 2
        if n == 126:
            if len(buffer) < 4:
                break
            n, pos = int.from_bytes(buffer[2:4], "big"), 4
        elif n == 127:
            if len(buffer) < 10:
                break
            n, pos = int.from_bytes(buffer[2:10], "big"), 10
        if n > limite:
            raise ValueError(f"mensagem de {n} bytes passa do limite")
        if len(buffer) < pos + 4 + n:
            break

        chave = buffer[pos:pos + 4]
        dados = buffer[pos + 4:pos + 4 + n]
        quadros.append((fin, opcode, bytes(b ^ chave[i % 4] for i, b in enumerate(dados))))
        buffer = buffer[pos + 4 + n:]
    return quadros, buffer`,tests:[{name:`o "Hello" da RFC`,code:`import random as _random

def _quadro(payload, opcode=1, fin=True, chave=bytes([10, 11, 12, 13]), rsv=0, mascarar=True, tamanho=None):
    n = len(payload) if tamanho is None else tamanho
    b0 = (128 if fin else 0) | (rsv << 4) | opcode
    m = 128 if mascarar else 0
    if n <= 125:
        cab = bytes([b0, m | n])
    elif n <= 65535:
        cab = bytes([b0, m | 126]) + n.to_bytes(2, "big")
    else:
        cab = bytes([b0, m | 127]) + n.to_bytes(8, "big")
    if not mascarar:
        return cab + payload
    return cab + chave + bytes(b ^ chave[i % 4] for i, b in enumerate(payload))

def _ref_ler(buffer, limite=1_000_000):
    quadros = []
    while len(buffer) >= 2:
        b0, b1 = buffer[0], buffer[1]
        fin, rsv, op, n = bool(b0 & 128), (b0 >> 4) & 7, b0 & 15, b1 & 127
        if rsv or op not in (0, 1, 2, 8, 9, 10) or not (b1 & 128):
            raise ValueError("quadro inválido")
        if op >= 8 and (not fin or n > 125):
            raise ValueError("controle inválido")
        pos = 2
        if n == 126:
            if len(buffer) < 4:
                break
            n, pos = int.from_bytes(buffer[2:4], "big"), 4
        elif n == 127:
            if len(buffer) < 10:
                break
            n, pos = int.from_bytes(buffer[2:10], "big"), 10
        if n > limite:
            raise ValueError("grande demais")
        if len(buffer) < pos + 4 + n:
            break
        chave = buffer[pos:pos + 4]
        quadros.append((fin, op, bytes(b ^ chave[i % 4] for i, b in enumerate(buffer[pos + 4:pos + 4 + n]))))
        buffer = buffer[pos + 4 + n:]
    return quadros, buffer

def _alimentar_em_pedacos(fluxo, cortes):
    """Entrega o fluxo em pedaços, como recv() faria, acumulando o resto entre chamadas."""
    recebidos, buf, anterior = [], b"", 0
    for c in list(cortes) + [len(fluxo)]:
        buf += fluxo[anterior:c]
        anterior = c
        r = ler_quadros(buf)
        assert isinstance(r, tuple) and len(r) == 2, f"ler_quadros deve devolver uma tupla (quadros, resto); veio {r!r}"
        q, buf = r
        assert isinstance(buf, (bytes, bytearray)), f"o resto deve ser bytes; veio {type(buf).__name__}"
        recebidos += [tuple(x) for x in q]
    return recebidos, bytes(buf)
r = ler_quadros(bytes.fromhex("818537fa213d7f9f4d5158"))
assert isinstance(r, tuple) and len(r) == 2, f"devolva uma tupla (quadros, resto); veio {r!r}"
q, resto = r
assert [tuple(x) for x in q] == [(True, 1, b"Hello")], f"esperado [(True, 1, b'Hello')]; veio {q!r}"
assert resto == b"", f"não deveria sobrar nada; sobrou {resto!r}"`},{name:`vários quadros juntos e um incompleto no fim`,code:`import random as _random

def _quadro(payload, opcode=1, fin=True, chave=bytes([10, 11, 12, 13]), rsv=0, mascarar=True, tamanho=None):
    n = len(payload) if tamanho is None else tamanho
    b0 = (128 if fin else 0) | (rsv << 4) | opcode
    m = 128 if mascarar else 0
    if n <= 125:
        cab = bytes([b0, m | n])
    elif n <= 65535:
        cab = bytes([b0, m | 126]) + n.to_bytes(2, "big")
    else:
        cab = bytes([b0, m | 127]) + n.to_bytes(8, "big")
    if not mascarar:
        return cab + payload
    return cab + chave + bytes(b ^ chave[i % 4] for i, b in enumerate(payload))

def _ref_ler(buffer, limite=1_000_000):
    quadros = []
    while len(buffer) >= 2:
        b0, b1 = buffer[0], buffer[1]
        fin, rsv, op, n = bool(b0 & 128), (b0 >> 4) & 7, b0 & 15, b1 & 127
        if rsv or op not in (0, 1, 2, 8, 9, 10) or not (b1 & 128):
            raise ValueError("quadro inválido")
        if op >= 8 and (not fin or n > 125):
            raise ValueError("controle inválido")
        pos = 2
        if n == 126:
            if len(buffer) < 4:
                break
            n, pos = int.from_bytes(buffer[2:4], "big"), 4
        elif n == 127:
            if len(buffer) < 10:
                break
            n, pos = int.from_bytes(buffer[2:10], "big"), 10
        if n > limite:
            raise ValueError("grande demais")
        if len(buffer) < pos + 4 + n:
            break
        chave = buffer[pos:pos + 4]
        quadros.append((fin, op, bytes(b ^ chave[i % 4] for i, b in enumerate(buffer[pos + 4:pos + 4 + n]))))
        buffer = buffer[pos + 4 + n:]
    return quadros, buffer

def _alimentar_em_pedacos(fluxo, cortes):
    """Entrega o fluxo em pedaços, como recv() faria, acumulando o resto entre chamadas."""
    recebidos, buf, anterior = [], b"", 0
    for c in list(cortes) + [len(fluxo)]:
        buf += fluxo[anterior:c]
        anterior = c
        r = ler_quadros(buf)
        assert isinstance(r, tuple) and len(r) == 2, f"ler_quadros deve devolver uma tupla (quadros, resto); veio {r!r}"
        q, buf = r
        assert isinstance(buf, (bytes, bytearray)), f"o resto deve ser bytes; veio {type(buf).__name__}"
        recebidos += [tuple(x) for x in q]
    return recebidos, bytes(buf)
fluxo = _quadro(b"oi") + _quadro(bytes([1, 2, 3]), opcode=2) + _quadro(b"tchau")[:5]
q, resto = ler_quadros(fluxo)
assert [tuple(x) for x in q] == [(True, 1, b"oi"), (True, 2, bytes([1, 2, 3]))], f"veio {q!r}"
assert resto == _quadro(b"tchau")[:5], f"os 5 bytes do quadro incompleto devem sobrar; sobrou {resto!r}"`},{name:`tamanhos de 16 e 64 bits`,code:`import random as _random

def _quadro(payload, opcode=1, fin=True, chave=bytes([10, 11, 12, 13]), rsv=0, mascarar=True, tamanho=None):
    n = len(payload) if tamanho is None else tamanho
    b0 = (128 if fin else 0) | (rsv << 4) | opcode
    m = 128 if mascarar else 0
    if n <= 125:
        cab = bytes([b0, m | n])
    elif n <= 65535:
        cab = bytes([b0, m | 126]) + n.to_bytes(2, "big")
    else:
        cab = bytes([b0, m | 127]) + n.to_bytes(8, "big")
    if not mascarar:
        return cab + payload
    return cab + chave + bytes(b ^ chave[i % 4] for i, b in enumerate(payload))

def _ref_ler(buffer, limite=1_000_000):
    quadros = []
    while len(buffer) >= 2:
        b0, b1 = buffer[0], buffer[1]
        fin, rsv, op, n = bool(b0 & 128), (b0 >> 4) & 7, b0 & 15, b1 & 127
        if rsv or op not in (0, 1, 2, 8, 9, 10) or not (b1 & 128):
            raise ValueError("quadro inválido")
        if op >= 8 and (not fin or n > 125):
            raise ValueError("controle inválido")
        pos = 2
        if n == 126:
            if len(buffer) < 4:
                break
            n, pos = int.from_bytes(buffer[2:4], "big"), 4
        elif n == 127:
            if len(buffer) < 10:
                break
            n, pos = int.from_bytes(buffer[2:10], "big"), 10
        if n > limite:
            raise ValueError("grande demais")
        if len(buffer) < pos + 4 + n:
            break
        chave = buffer[pos:pos + 4]
        quadros.append((fin, op, bytes(b ^ chave[i % 4] for i, b in enumerate(buffer[pos + 4:pos + 4 + n]))))
        buffer = buffer[pos + 4 + n:]
    return quadros, buffer

def _alimentar_em_pedacos(fluxo, cortes):
    """Entrega o fluxo em pedaços, como recv() faria, acumulando o resto entre chamadas."""
    recebidos, buf, anterior = [], b"", 0
    for c in list(cortes) + [len(fluxo)]:
        buf += fluxo[anterior:c]
        anterior = c
        r = ler_quadros(buf)
        assert isinstance(r, tuple) and len(r) == 2, f"ler_quadros deve devolver uma tupla (quadros, resto); veio {r!r}"
        q, buf = r
        assert isinstance(buf, (bytes, bytearray)), f"o resto deve ser bytes; veio {type(buf).__name__}"
        recebidos += [tuple(x) for x in q]
    return recebidos, bytes(buf)
medio = bytes(i % 251 for i in range(300))
grande = bytes(i % 7 for i in range(70000))
q, resto = ler_quadros(_quadro(medio, opcode=2) + _quadro(grande, opcode=2))
assert len(q) == 2, f"deveriam sair 2 quadros; saíram {len(q)}"
assert q[0][2] == medio, "o quadro de 300 bytes (tamanho em 16 bits) veio errado"
assert q[1][2] == grande, "o quadro de 70 000 bytes (tamanho em 64 bits) veio errado"
assert resto == b""`},{name:`cabeçalho chegando aos pedaços`,code:`import random as _random

def _quadro(payload, opcode=1, fin=True, chave=bytes([10, 11, 12, 13]), rsv=0, mascarar=True, tamanho=None):
    n = len(payload) if tamanho is None else tamanho
    b0 = (128 if fin else 0) | (rsv << 4) | opcode
    m = 128 if mascarar else 0
    if n <= 125:
        cab = bytes([b0, m | n])
    elif n <= 65535:
        cab = bytes([b0, m | 126]) + n.to_bytes(2, "big")
    else:
        cab = bytes([b0, m | 127]) + n.to_bytes(8, "big")
    if not mascarar:
        return cab + payload
    return cab + chave + bytes(b ^ chave[i % 4] for i, b in enumerate(payload))

def _ref_ler(buffer, limite=1_000_000):
    quadros = []
    while len(buffer) >= 2:
        b0, b1 = buffer[0], buffer[1]
        fin, rsv, op, n = bool(b0 & 128), (b0 >> 4) & 7, b0 & 15, b1 & 127
        if rsv or op not in (0, 1, 2, 8, 9, 10) or not (b1 & 128):
            raise ValueError("quadro inválido")
        if op >= 8 and (not fin or n > 125):
            raise ValueError("controle inválido")
        pos = 2
        if n == 126:
            if len(buffer) < 4:
                break
            n, pos = int.from_bytes(buffer[2:4], "big"), 4
        elif n == 127:
            if len(buffer) < 10:
                break
            n, pos = int.from_bytes(buffer[2:10], "big"), 10
        if n > limite:
            raise ValueError("grande demais")
        if len(buffer) < pos + 4 + n:
            break
        chave = buffer[pos:pos + 4]
        quadros.append((fin, op, bytes(b ^ chave[i % 4] for i, b in enumerate(buffer[pos + 4:pos + 4 + n]))))
        buffer = buffer[pos + 4 + n:]
    return quadros, buffer

def _alimentar_em_pedacos(fluxo, cortes):
    """Entrega o fluxo em pedaços, como recv() faria, acumulando o resto entre chamadas."""
    recebidos, buf, anterior = [], b"", 0
    for c in list(cortes) + [len(fluxo)]:
        buf += fluxo[anterior:c]
        anterior = c
        r = ler_quadros(buf)
        assert isinstance(r, tuple) and len(r) == 2, f"ler_quadros deve devolver uma tupla (quadros, resto); veio {r!r}"
        q, buf = r
        assert isinstance(buf, (bytes, bytearray)), f"o resto deve ser bytes; veio {type(buf).__name__}"
        recebidos += [tuple(x) for x in q]
    return recebidos, bytes(buf)
f = _quadro(bytes(300), opcode=2)
for corte in (1, 2, 3, 4, 6, 7, 8, 9, len(f) - 1):
    q, resto = ler_quadros(f[:corte])
    assert list(q) == [] and resto == f[:corte], f"com só {corte} bytes de um quadro de 300, nada sai e tudo sobra; veio {q!r} e resto de {len(resto)} bytes"
rec, resto = _alimentar_em_pedacos(f + _quadro(b"fim"), [1, 3, 5, 200])
assert rec == [(True, 2, bytes(300)), (True, 1, b"fim")], f"entregando o fluxo aos pedaços, deveriam sair os 2 quadros inteiros; veio {rec!r}"`},{name:`fragmentos com ping no meio`,code:`import random as _random

def _quadro(payload, opcode=1, fin=True, chave=bytes([10, 11, 12, 13]), rsv=0, mascarar=True, tamanho=None):
    n = len(payload) if tamanho is None else tamanho
    b0 = (128 if fin else 0) | (rsv << 4) | opcode
    m = 128 if mascarar else 0
    if n <= 125:
        cab = bytes([b0, m | n])
    elif n <= 65535:
        cab = bytes([b0, m | 126]) + n.to_bytes(2, "big")
    else:
        cab = bytes([b0, m | 127]) + n.to_bytes(8, "big")
    if not mascarar:
        return cab + payload
    return cab + chave + bytes(b ^ chave[i % 4] for i, b in enumerate(payload))

def _ref_ler(buffer, limite=1_000_000):
    quadros = []
    while len(buffer) >= 2:
        b0, b1 = buffer[0], buffer[1]
        fin, rsv, op, n = bool(b0 & 128), (b0 >> 4) & 7, b0 & 15, b1 & 127
        if rsv or op not in (0, 1, 2, 8, 9, 10) or not (b1 & 128):
            raise ValueError("quadro inválido")
        if op >= 8 and (not fin or n > 125):
            raise ValueError("controle inválido")
        pos = 2
        if n == 126:
            if len(buffer) < 4:
                break
            n, pos = int.from_bytes(buffer[2:4], "big"), 4
        elif n == 127:
            if len(buffer) < 10:
                break
            n, pos = int.from_bytes(buffer[2:10], "big"), 10
        if n > limite:
            raise ValueError("grande demais")
        if len(buffer) < pos + 4 + n:
            break
        chave = buffer[pos:pos + 4]
        quadros.append((fin, op, bytes(b ^ chave[i % 4] for i, b in enumerate(buffer[pos + 4:pos + 4 + n]))))
        buffer = buffer[pos + 4 + n:]
    return quadros, buffer

def _alimentar_em_pedacos(fluxo, cortes):
    """Entrega o fluxo em pedaços, como recv() faria, acumulando o resto entre chamadas."""
    recebidos, buf, anterior = [], b"", 0
    for c in list(cortes) + [len(fluxo)]:
        buf += fluxo[anterior:c]
        anterior = c
        r = ler_quadros(buf)
        assert isinstance(r, tuple) and len(r) == 2, f"ler_quadros deve devolver uma tupla (quadros, resto); veio {r!r}"
        q, buf = r
        assert isinstance(buf, (bytes, bytearray)), f"o resto deve ser bytes; veio {type(buf).__name__}"
        recebidos += [tuple(x) for x in q]
    return recebidos, bytes(buf)
fluxo = _quadro("aç".encode()[:2], fin=False) + _quadro(b"!", opcode=9) + _quadro("aç".encode()[2:] + b"o", opcode=0)
q, resto = ler_quadros(fluxo)
esperado = [(False, 1, b"a" + "ç".encode()[:1]), (True, 9, b"!"), (True, 0, "ç".encode()[1:] + b"o")]
assert [tuple(x) for x in q] == esperado, f"devolva cada quadro como veio, sem montar a mensagem; esperado {esperado!r}, veio {q!r}"`},{name:`quadros inválidos`,code:`import random as _random

def _quadro(payload, opcode=1, fin=True, chave=bytes([10, 11, 12, 13]), rsv=0, mascarar=True, tamanho=None):
    n = len(payload) if tamanho is None else tamanho
    b0 = (128 if fin else 0) | (rsv << 4) | opcode
    m = 128 if mascarar else 0
    if n <= 125:
        cab = bytes([b0, m | n])
    elif n <= 65535:
        cab = bytes([b0, m | 126]) + n.to_bytes(2, "big")
    else:
        cab = bytes([b0, m | 127]) + n.to_bytes(8, "big")
    if not mascarar:
        return cab + payload
    return cab + chave + bytes(b ^ chave[i % 4] for i, b in enumerate(payload))

def _ref_ler(buffer, limite=1_000_000):
    quadros = []
    while len(buffer) >= 2:
        b0, b1 = buffer[0], buffer[1]
        fin, rsv, op, n = bool(b0 & 128), (b0 >> 4) & 7, b0 & 15, b1 & 127
        if rsv or op not in (0, 1, 2, 8, 9, 10) or not (b1 & 128):
            raise ValueError("quadro inválido")
        if op >= 8 and (not fin or n > 125):
            raise ValueError("controle inválido")
        pos = 2
        if n == 126:
            if len(buffer) < 4:
                break
            n, pos = int.from_bytes(buffer[2:4], "big"), 4
        elif n == 127:
            if len(buffer) < 10:
                break
            n, pos = int.from_bytes(buffer[2:10], "big"), 10
        if n > limite:
            raise ValueError("grande demais")
        if len(buffer) < pos + 4 + n:
            break
        chave = buffer[pos:pos + 4]
        quadros.append((fin, op, bytes(b ^ chave[i % 4] for i, b in enumerate(buffer[pos + 4:pos + 4 + n]))))
        buffer = buffer[pos + 4 + n:]
    return quadros, buffer

def _alimentar_em_pedacos(fluxo, cortes):
    """Entrega o fluxo em pedaços, como recv() faria, acumulando o resto entre chamadas."""
    recebidos, buf, anterior = [], b"", 0
    for c in list(cortes) + [len(fluxo)]:
        buf += fluxo[anterior:c]
        anterior = c
        r = ler_quadros(buf)
        assert isinstance(r, tuple) and len(r) == 2, f"ler_quadros deve devolver uma tupla (quadros, resto); veio {r!r}"
        q, buf = r
        assert isinstance(buf, (bytes, bytearray)), f"o resto deve ser bytes; veio {type(buf).__name__}"
        recebidos += [tuple(x) for x in q]
    return recebidos, bytes(buf)
casos = [
    (_quadro(b"oi", mascarar=False), "quadro sem máscara"),
    (_quadro(b"oi", rsv=4), "RSV1 ligado sem extensão"),
    (_quadro(b"oi", rsv=2), "RSV2 ligado sem extensão"),
    (_quadro(b"oi", rsv=1), "RSV3 ligado sem extensão"),
    (_quadro(b"oi", opcode=3), "opcode 0x3 é reservado"),
    (_quadro(b"oi", opcode=0xB), "opcode 0xB é reservado"),
    (_quadro(b"x", opcode=9, fin=False), "ping fragmentado"),
    (_quadro(bytes(126), opcode=8), "close com 126 bytes"),
    (_quadro(bytes(2000), opcode=2), "2000 bytes com limite 1000"),
]
for fluxo, motivo in casos:
    try:
        r = ler_quadros(fluxo, 1000)
    except ValueError:
        continue
    assert False, f"{motivo}: deveria levantar ValueError; devolveu {r!r}"`},{name:`limite decidido pelo cabeçalho, sem esperar os dados`,code:`import random as _random

def _quadro(payload, opcode=1, fin=True, chave=bytes([10, 11, 12, 13]), rsv=0, mascarar=True, tamanho=None):
    n = len(payload) if tamanho is None else tamanho
    b0 = (128 if fin else 0) | (rsv << 4) | opcode
    m = 128 if mascarar else 0
    if n <= 125:
        cab = bytes([b0, m | n])
    elif n <= 65535:
        cab = bytes([b0, m | 126]) + n.to_bytes(2, "big")
    else:
        cab = bytes([b0, m | 127]) + n.to_bytes(8, "big")
    if not mascarar:
        return cab + payload
    return cab + chave + bytes(b ^ chave[i % 4] for i, b in enumerate(payload))

def _ref_ler(buffer, limite=1_000_000):
    quadros = []
    while len(buffer) >= 2:
        b0, b1 = buffer[0], buffer[1]
        fin, rsv, op, n = bool(b0 & 128), (b0 >> 4) & 7, b0 & 15, b1 & 127
        if rsv or op not in (0, 1, 2, 8, 9, 10) or not (b1 & 128):
            raise ValueError("quadro inválido")
        if op >= 8 and (not fin or n > 125):
            raise ValueError("controle inválido")
        pos = 2
        if n == 126:
            if len(buffer) < 4:
                break
            n, pos = int.from_bytes(buffer[2:4], "big"), 4
        elif n == 127:
            if len(buffer) < 10:
                break
            n, pos = int.from_bytes(buffer[2:10], "big"), 10
        if n > limite:
            raise ValueError("grande demais")
        if len(buffer) < pos + 4 + n:
            break
        chave = buffer[pos:pos + 4]
        quadros.append((fin, op, bytes(b ^ chave[i % 4] for i, b in enumerate(buffer[pos + 4:pos + 4 + n]))))
        buffer = buffer[pos + 4 + n:]
    return quadros, buffer

def _alimentar_em_pedacos(fluxo, cortes):
    """Entrega o fluxo em pedaços, como recv() faria, acumulando o resto entre chamadas."""
    recebidos, buf, anterior = [], b"", 0
    for c in list(cortes) + [len(fluxo)]:
        buf += fluxo[anterior:c]
        anterior = c
        r = ler_quadros(buf)
        assert isinstance(r, tuple) and len(r) == 2, f"ler_quadros deve devolver uma tupla (quadros, resto); veio {r!r}"
        q, buf = r
        assert isinstance(buf, (bytes, bytearray)), f"o resto deve ser bytes; veio {type(buf).__name__}"
        recebidos += [tuple(x) for x in q]
    return recebidos, bytes(buf)
cab = bytes([0x82, 0x80 | 127]) + (2 ** 40).to_bytes(8, "big")
try:
    r = ler_quadros(cab)
except ValueError:
    pass
else:
    assert False, f"o cabeçalho declara 1 TiB: levante ValueError já, em vez de esperar os dados; devolveu {r!r}"
cab16 = bytes([0x82, 0x80 | 126]) + (5000).to_bytes(2, "big")
try:
    r = ler_quadros(cab16, 1000)
except ValueError:
    pass
else:
    assert False, f"5000 bytes declarados com limite 1000: levante ValueError assim que ler o tamanho; devolveu {r!r}"
q, resto = ler_quadros(_quadro(bytes(1000)), 1000)
assert len(q) == 1, "exatamente no limite ainda é aceito"`},{name:`fluxos aleatórios cortados em qualquer ponto`,code:`import random as _random

def _quadro(payload, opcode=1, fin=True, chave=bytes([10, 11, 12, 13]), rsv=0, mascarar=True, tamanho=None):
    n = len(payload) if tamanho is None else tamanho
    b0 = (128 if fin else 0) | (rsv << 4) | opcode
    m = 128 if mascarar else 0
    if n <= 125:
        cab = bytes([b0, m | n])
    elif n <= 65535:
        cab = bytes([b0, m | 126]) + n.to_bytes(2, "big")
    else:
        cab = bytes([b0, m | 127]) + n.to_bytes(8, "big")
    if not mascarar:
        return cab + payload
    return cab + chave + bytes(b ^ chave[i % 4] for i, b in enumerate(payload))

def _ref_ler(buffer, limite=1_000_000):
    quadros = []
    while len(buffer) >= 2:
        b0, b1 = buffer[0], buffer[1]
        fin, rsv, op, n = bool(b0 & 128), (b0 >> 4) & 7, b0 & 15, b1 & 127
        if rsv or op not in (0, 1, 2, 8, 9, 10) or not (b1 & 128):
            raise ValueError("quadro inválido")
        if op >= 8 and (not fin or n > 125):
            raise ValueError("controle inválido")
        pos = 2
        if n == 126:
            if len(buffer) < 4:
                break
            n, pos = int.from_bytes(buffer[2:4], "big"), 4
        elif n == 127:
            if len(buffer) < 10:
                break
            n, pos = int.from_bytes(buffer[2:10], "big"), 10
        if n > limite:
            raise ValueError("grande demais")
        if len(buffer) < pos + 4 + n:
            break
        chave = buffer[pos:pos + 4]
        quadros.append((fin, op, bytes(b ^ chave[i % 4] for i, b in enumerate(buffer[pos + 4:pos + 4 + n]))))
        buffer = buffer[pos + 4 + n:]
    return quadros, buffer

def _alimentar_em_pedacos(fluxo, cortes):
    """Entrega o fluxo em pedaços, como recv() faria, acumulando o resto entre chamadas."""
    recebidos, buf, anterior = [], b"", 0
    for c in list(cortes) + [len(fluxo)]:
        buf += fluxo[anterior:c]
        anterior = c
        r = ler_quadros(buf)
        assert isinstance(r, tuple) and len(r) == 2, f"ler_quadros deve devolver uma tupla (quadros, resto); veio {r!r}"
        q, buf = r
        assert isinstance(buf, (bytes, bytearray)), f"o resto deve ser bytes; veio {type(buf).__name__}"
        recebidos += [tuple(x) for x in q]
    return recebidos, bytes(buf)
_rng = _random.Random(6455)
for _ in range(150):
    fluxo = b""
    for _ in range(_rng.randint(1, 6)):
        op = _rng.choice([0, 1, 2, 2, 9, 10])
        n = _rng.choice([0, 1, 5, 125, 126, 127, 300]) if op < 8 else _rng.randint(0, 125)
        if op < 8 and _rng.random() < 0.15:
            n = 65536 + _rng.randint(0, 50)
        chave = bytes(_rng.randrange(256) for _ in range(4))
        fluxo += _quadro(bytes(_rng.randrange(256) for _ in range(n)), opcode=op, fin=(op >= 8 or _rng.random() < 0.7), chave=chave)
    cortes = sorted(_rng.sample(range(1, len(fluxo)), min(4, len(fluxo) - 1)))
    esperado = _ref_ler(fluxo)[0]
    rec, resto = _alimentar_em_pedacos(fluxo, cortes)
    assert rec == [tuple(x) for x in esperado] and resto == b"", f"com cortes em {cortes}, algum quadro saiu errado, faltou ou ficou no resto ({len(resto)} bytes sobraram)"`}]}}]},{stage:`projeto`,blocks:[{type:`project`,projectId:`p8-chat`},{type:`md`,text:"Uma das extensões do **chat em rede** é um cliente web. Ponha um servidor WebSocket ao lado do servidor TCP (ou troque o TCP por ele), reaproveitando as salas e o broadcast. Confira o `Origin` no handshake, ligue o batimento, limite o tamanho das mensagens e limite também a fila de cada cliente: quando ela encher, desconecte o cliente lento com o código 1008 em vez de deixar a memória crescer."}]},{stage:`revisao`,blocks:[{type:`md`,text:"- HTTP não deixa o servidor falar primeiro. Polling e long polling contornam; SSE resolve para servidor → cliente; WebSocket é bidirecional.\n- Handshake: GET com `Upgrade: websocket` e `Sec-WebSocket-Key`; resposta **101** com `Sec-WebSocket-Accept = base64(SHA-1(chave + GUID))`. Depois disso, só quadros.\n- Quadro: FIN, RSV, opcode (texto, binário, continuação, close, ping, pong), MASK e tamanho em 7, 16 ou 64 bits (126 e 127 são sinais).\n- Cliente → servidor sempre mascarado, servidor → cliente nunca. A máscara protege proxies e caches antigos, não é sigilo: para isso, `wss://`.\n- Controle: no máximo 125 bytes, sem fragmentação; ping é respondido com pong; close leva um código (1000 normal, 1001 indo embora, 1009 grande demais; 1006 nunca vai na rede).\n- Em produção: conferir o Origin (não há CORS), batimento contra conexões meio abertas, limite de tamanho decidido pelo cabeçalho e fila limitada por cliente."},{type:`callout`,tone:`english`,text:`**Vocabulary:** *upgrade*, *handshake*, *frame*, *opcode*, *payload*, *masking key*, *fragment*, *ping/pong*, *close code*, *heartbeat*, *backpressure*, *slow consumer*.

From RFC 6455: *"A client MUST mask all frames that it sends to the server. [...] A server MUST NOT mask any frames that it sends to the client."*

Interview question: *"How would you push real-time updates to a browser? When would you choose Server-Sent Events over WebSockets?"* A good answer starts with the direction of the data: if only the server talks, SSE is simpler and reconnects by itself.`,title:`English corner`}]}],cards:[{id:`l9-websockets#1`,front:`Como o servidor calcula o Sec-WebSocket-Accept?`,back:`base64(SHA-1(Sec-WebSocket-Key + o GUID fixo 258EAFA5-E914-47DA-95CA-C5AB0DC85B11)). Prova que o servidor entendeu WebSocket; não é autenticação.`},{id:`l9-websockets#2`,front:`Que lado mascara os quadros, e o que a máscara protege?`,back:`Só o cliente. Impede que um script escolha os bytes exatos na rede e engane proxies e caches no caminho; não é criptografia (a chave vai no próprio quadro).`},{id:`l9-websockets#3`,front:`Como é codificado o tamanho dos dados num quadro?`,back:`7 bits: de 0 a 125 é o próprio tamanho; 126 indica mais 2 bytes (16 bits); 127 indica mais 8 bytes (64 bits). Sempre na forma mais curta.`},{id:`l9-websockets#4`,front:`Quais são os quadros de controle e que regras eles seguem?`,back:`Close (0x8), ping (0x9) e pong (0xA): no máximo 125 bytes, nunca fragmentados, podem vir no meio dos fragmentos de uma mensagem.`},{id:`l9-websockets#5`,front:`Por que conferir o Origin no handshake WebSocket?`,back:`WebSocket não passa pelo CORS: qualquer site pode abrir a conexão e o navegador pode mandar os cookies do usuário (sequestro entre sites).`},{id:`l9-websockets#6`,front:`Quando SSE basta no lugar de WebSocket?`,back:`Quando só o servidor envia (notificações, placar, progresso): é HTTP comum, texto, com reconexão automática.`},{id:`l9-websockets#7`,front:`Para que serve o ping/pong num servidor WebSocket?`,back:`Manter a conexão ativa para NAT e proxies que derrubam conexões ociosas, e descobrir conexões meio abertas (o cliente sumiu sem fechar).`}]};export{e as default};
//# sourceMappingURL=l9-websockets-DRWTqaIz.js.map