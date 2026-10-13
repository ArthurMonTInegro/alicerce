/** Lições adicionais do módulo m9-3 (sockets e arquitetura cliente-servidor). */
import type { Block, Lesson } from '../../types.ts';
import { code, dedent, deep, english, info, lesson, md, py, t, tip, warn } from '../../helpers.ts';

/** Bloco de JavaScript só de leitura (o helper `code` deixaria executável, e aqui não há servidor para conectar). */
const jsLeitura = (src: string, caption: string): Block => ({ type: 'code', lang: 'javascript', code: dedent(src), runnable: false, caption });

/* ------------------------------------------------------------------ */
/* WebSockets: handshake, quadros, máscara, controle e conexões longas */
/* ------------------------------------------------------------------ */

/** Referência e montador de quadros usados nos testes do desafio de WebSocket. */
const REF_WS = dedent(`
  import random as _random

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
`);

const websockets = lesson({
  id: 'l9-websockets',
  moduleId: 'm9-3',
  title: 'WebSockets: do HTTP a um canal bidirecional em tempo real',
  titleEn: 'WebSockets: from HTTP to a real-time bidirectional channel',
  summary: 'Por que o HTTP sozinho não deixa o servidor falar primeiro, como o WebSocket nasce de um GET com Upgrade, como é cada quadro por dentro (FIN, opcode, tamanho em 7, 16 ou 64 bits, máscara), para que servem ping, pong e o fechamento com código, e o que um servidor com milhares de conexões longas precisa vigiar: Origin, heartbeat, tamanho máximo e clientes lentos.',
  minutes: 50,
  objectives: [
    'Comparar polling, long polling, Server-Sent Events e WebSocket e escolher o mais simples que resolve um caso concreto',
    'Descrever o handshake de abertura e calcular o Sec-WebSocket-Accept a partir da chave do cliente',
    'Ler e montar um quadro byte a byte: FIN, opcode, tamanho em 7, 16 ou 64 bits, bit de máscara e chave',
    'Explicar por que só o cliente mascara, e o que a máscara protege (e o que não protege)',
    'Usar ping, pong e o fechamento com código para manter e encerrar conexões',
    'Listar os cuidados de um servidor com muitas conexões longas: Origin, autenticação, heartbeat, limite de tamanho e contrapressão',
  ],
  skills: ['redes-sockets'],
  terms: [
    t('WebSocket', 'WebSocket', 'Protocolo (RFC 6455) que transforma uma conexão HTTP em um canal bidirecional de mensagens, nos dois sentidos, a qualquer momento.', 'WebSocket connection to \'wss://example.com/ws\' failed'),
    t('consulta periódica', 'polling', 'O cliente pergunta ao servidor, de tempos em tempos, se há novidade.'),
    t('consulta longa', 'long polling', 'O cliente faz uma requisição que o servidor só responde quando há novidade (ou quando o tempo limite estoura); a cada resposta, o cliente abre outra.'),
    t('eventos enviados pelo servidor', 'Server-Sent Events (SSE)', 'Resposta HTTP que nunca termina, pela qual o servidor envia eventos de texto ao cliente; só no sentido servidor → cliente.', 'The EventSource interface is a connection to a server sending server-sent events.'),
    t('troca de protocolo', 'protocol upgrade', 'Mecanismo do HTTP/1.1 (cabeçalho Upgrade, resposta 101) para passar a falar outro protocolo na mesma conexão.', '101 Switching Protocols'),
    t('handshake de abertura', 'opening handshake', 'O GET com Upgrade e a resposta 101 que estabelecem a conexão WebSocket.'),
    t('quadro', 'frame', 'Unidade de transmissão do WebSocket: cabeçalho de 2 a 14 bytes seguido dos dados.'),
    t('código de operação', 'opcode', 'Os 4 bits do quadro que dizem o que ele carrega: texto, binário, continuação, close, ping ou pong.'),
    t('chave de máscara', 'masking key', '4 bytes aleatórios que o cliente usa, com XOR, para embaralhar os dados de cada quadro.'),
    t('quadro de controle', 'control frame', 'Quadro de close, ping ou pong: no máximo 125 bytes de dados e nunca fragmentado.'),
    t('fragmentação', 'fragmentation', 'Dividir uma mensagem em vários quadros: o primeiro com o opcode, os seguintes como continuação, o último com FIN = 1.'),
    t('batimento', 'heartbeat', 'Mensagem periódica (no WebSocket, ping e pong) para provar que a conexão continua viva e impedir que intermediários a derrubem por inatividade.'),
    t('contrapressão', 'backpressure', 'Fazer quem produz dados mais rápido desacelerar (ou descartar) quando quem consome não dá conta, em vez de acumular sem limite.'),
    t('sequestro de WebSocket entre sites', 'cross-site WebSocket hijacking (CSWSH)', 'Ataque em que uma página maliciosa abre um WebSocket para o seu servidor usando os cookies do usuário; evitado conferindo o Origin.'),
  ],
  stages: {
    conceito: [
      md(`
        O HTTP é **pergunta e resposta**: o cliente pergunta, o servidor responde, e o servidor nunca fala primeiro. Isso não serve bem para um chat, para o aviso "Pix recebido" que aparece sozinho na tela da loja, para a posição do ônibus andando no mapa ou para um jogo: nesses casos, quem tem a novidade é o servidor, e ela precisa chegar **agora**.

        O {{WebSocket|WebSocket}} (RFC 6455) resolve isso com um truque elegante: a conexão começa como uma requisição HTTP comum, um GET que pede uma {{troca de protocolo|protocol upgrade}}. Se o servidor aceita (resposta **101**), a **mesma conexão TCP** deixa de falar HTTP e vira um canal de **mensagens nos dois sentidos**, que qualquer lado pode usar a qualquer momento, por horas.

        Na lição anterior você viu que o TCP entrega um fluxo de bytes e que a aplicação precisa enquadrar as mensagens. O WebSocket é exatamente isso, padronizado: um **protocolo de enquadramento** sobre TCP, que o navegador já sabe falar.
      `),
    ],
    explicacao: [
      md(`
        ### Antes do WebSocket: como o servidor "fala primeiro"
      `),
      {
        type: 'table',
        head: ['Técnica', 'Como funciona', 'Sentido', 'Custo e limites'],
        rows: [
          ['{{Consulta periódica|polling}}', 'o cliente pergunta "tem novidade?" a cada N segundos', 'cliente puxa', 'atraso de até N s; a maioria das respostas vem vazia, cada uma com cabeçalhos HTTP completos'],
          ['{{Consulta longa|long polling}}', 'o servidor segura a requisição até ter novidade (ou até um tempo limite); o cliente reabre logo em seguida', 'servidor responde quando quer', 'funciona em qualquer infraestrutura HTTP; uma requisição inteira por mensagem; o que chega entre uma resposta e a reabertura precisa ficar guardado'],
          ['{{Eventos enviados pelo servidor|Server-Sent Events (SSE)}}', 'uma resposta \`text/event-stream\` que nunca termina; no navegador, \`EventSource\`', 'só servidor → cliente', 'texto; reconexão automática com \`Last-Event-ID\`; no HTTP/1.1, o navegador limita a 6 conexões por domínio'],
          ['WebSocket', 'GET com Upgrade, resposta 101, depois quadros nos dois sentidos', 'bidirecional', '2 a 14 bytes de cabeçalho por quadro; texto ou binário; exige cuidado com proxies e com estado no servidor'],
        ],
        caption: 'Escolha o mais simples que resolve. Placar ao vivo ou notificações: SSE basta. Chat, jogo, edição colaborativa: WebSocket.',
      },
      md(`
        ### O {{handshake de abertura|opening handshake}}

        Depois do handshake do TCP (e do TLS, se for \`wss://\`), o cliente envia:

        \`\`\`
        GET /chat HTTP/1.1
        Host: loja.exemplo.com.br
        Upgrade: websocket
        Connection: Upgrade
        Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
        Sec-WebSocket-Version: 13
        Origin: https://loja.exemplo.com.br
        \`\`\`

        E o servidor, se aceitar, responde:

        \`\`\`
        HTTP/1.1 101 Switching Protocols
        Upgrade: websocket
        Connection: Upgrade
        Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
        \`\`\`

        - **Sec-WebSocket-Key** são 16 bytes aleatórios em base64, novos a cada conexão.
        - **Sec-WebSocket-Accept** = base64( SHA-1( chave + \`"258EAFA5-E914-47DA-95CA-C5AB0DC85B11"\` ) ). Esse texto fixo (um GUID) está na RFC.
        - A conta **não é autenticação nem criptografia**: ela só prova que quem respondeu entendeu WebSocket, e não é um servidor HTTP qualquer ou um cache devolvendo uma resposta velha.
        - Cabeçalhos que começam com \`Sec-\` não podem ser definidos por \`fetch\` nem por \`XMLHttpRequest\` no navegador. Por isso uma página não consegue fingir um handshake WebSocket com uma requisição comum.
        - Se o servidor não fala a versão pedida, responde com erro (por exemplo **426 Upgrade Required**) e um cabeçalho \`Sec-WebSocket-Version\` com as versões que aceita. A única versão em uso é a 13.
        - Opcionais: \`Sec-WebSocket-Protocol\` negocia um subprotocolo (por exemplo, \`mqtt\`), e \`Sec-WebSocket-Extensions\` negocia extensões, como a compressão \`permessage-deflate\` (RFC 7692).

        Depois do 101, **acabou o HTTP** naquela conexão: o que trafega são quadros. \`ws://\` usa a porta 80 e \`wss://\` usa a 443, com TLS. Prefira \`wss://\`: além da segurança, proxies no meio do caminho que não entendem WebSocket costumam atrapalhar tráfego aberto na porta 80, mas não conseguem mexer no que vai cifrado.

        ### O {{quadro|frame}} por dentro
      `),
      {
        type: 'table',
        head: ['Campo', 'Bits', 'Significado'],
        rows: [
          ['FIN', '1', '1 = último quadro da mensagem'],
          ['RSV1, RSV2, RSV3', '3', 'reservados para extensões (a compressão usa o RSV1); sem extensão negociada, têm de ser 0'],
          ['{{código de operação|opcode}}', '4', '0x0 continuação, 0x1 texto, 0x2 binário, 0x8 close, 0x9 ping, 0xA pong; os demais são reservados'],
          ['MASK', '1', '1 = os dados vêm mascarados e há uma chave de 4 bytes'],
          ['tamanho', '7', '0 a 125: é o tamanho; 126: o tamanho está nos 2 bytes seguintes (16 bits); 127: está nos 8 bytes seguintes (64 bits, bit mais alto 0)'],
          ['{{chave de máscara|masking key}}', '0 ou 32', 'presente só se MASK = 1'],
          ['dados', '8 × tamanho', 'o conteúdo (payload)'],
        ],
        caption: 'Todos os números com mais de um byte vão em big-endian (ordem de rede). O tamanho tem de usar a forma mais curta possível: 100 bytes não podem ser declarados com 126 + 16 bits.',
      },
      md(`
        Uma mensagem curta do servidor custa só **2 bytes** de cabeçalho; uma do cliente, 6 (2 + 4 da chave). Compare com as centenas de bytes de cabeçalhos de cada requisição no polling.

        ### A máscara: só do cliente para o servidor

        Todo quadro do cliente **tem** de vir mascarado, e nenhum quadro do servidor pode vir. O servidor que recebe um quadro sem máscara deve fechar a conexão. Mascarar é fazer XOR de cada byte com a chave: \`dado[i] ^ chave[i % 4]\`. Desmascarar é a mesma conta, porque \`(x ^ k) ^ k == x\`.

        A chave viaja no próprio quadro, então **isso não é criptografia** (para sigilo existe o \`wss://\`). A máscara existe por causa de proxies e caches antigos no caminho: em 2010, durante a padronização, pesquisadores mostraram que, se o script de uma página escolhesse os bytes exatos que vão para a rede, poderia escrever algo que um proxy transparente mal implementado interpretasse como uma requisição HTTP, e envenenar o cache dele para outros usuários. Com uma chave nova e imprevisível a cada quadro, o script não controla mais os bytes que saem.

        ### Mensagens, {{fragmentação|fragmentation}} e {{quadros de controle|control frames}}

        - Uma mensagem pode ir em vários quadros: o primeiro com opcode 0x1 ou 0x2 e FIN = 0, os do meio com opcode 0x0 (continuação) e o último com FIN = 1. O texto só precisa ser UTF-8 válido **na mensagem inteira**: um "ç" pode ficar partido entre dois quadros, como no \`LeitorDeLinhas\` da lição anterior.
        - **Close, ping e pong** são quadros de controle: no máximo 125 bytes de dados, **nunca fragmentados**, e podem aparecer **no meio** dos fragmentos de uma mensagem.
        - Quem recebe um **ping** responde com um **pong** com os mesmos dados. É o {{batimento|heartbeat}} da conexão.
        - O **close** carrega, opcionalmente, um código de 2 bytes e um motivo em texto. Quem recebe responde com outro close, e só então a conexão TCP é fechada (de preferência, pelo servidor).
      `),
      {
        type: 'table',
        head: ['Código', 'Nome (registro da IANA)', 'Quando'],
        rows: [
          ['1000', 'Normal Closure', 'encerramento normal: o usuário saiu da sala'],
          ['1001', 'Going Away', 'o servidor vai desligar (deploy) ou a página foi fechada'],
          ['1002', 'Protocol Error', 'o outro lado violou o protocolo (por exemplo, quadro do cliente sem máscara)'],
          ['1003', 'Unsupported Data', 'tipo de dado que o lado não aceita (binário onde só se aceita texto)'],
          ['1006', 'Abnormal Closure', '**nunca vai na rede**: é o que a API informa quando a conexão caiu sem quadro de close'],
          ['1008', 'Policy Violation', 'violou uma regra da aplicação (por exemplo, Origin não permitido)'],
          ['1009', 'Message Too Big', 'mensagem maior que o limite aceito'],
          ['1011', 'Internal Error', 'o servidor encontrou um erro inesperado'],
        ],
      },
      md(`
        ### Um servidor com milhares de conexões longas

        Um servidor HTTP atende uma requisição e esquece o cliente. Um servidor WebSocket fica com **milhares de conexões abertas por horas**, quase sempre paradas. Isso muda as preocupações:

        - **Modelo de concorrência.** Uma thread por conexão, com 20 mil usuários conectados e calados, são 20 mil threads, cada uma com a sua pilha, paradas só esperando. É o caso típico de E/S assíncrona: uma conexão parada vira só um objeto com o seu buffer e o seu estado, e um único laço de eventos atende todas.
        - **Batimento.** Roteadores com NAT, firewalls e proxies derrubam conexões que ficam muito tempo sem tráfego (o Nginx, por padrão, fecha a conexão com o servidor depois de 60 s sem receber nada dele). E, quando o celular entra num túnel do metrô, o servidor não recebe aviso nenhum: a conexão fica **meio aberta**. Um ping a cada 20 a 30 s, fechando a conexão se o pong não vier a tempo, resolve as duas coisas.
        - **Tamanho máximo.** O cabeçalho permite declarar até 2⁶³ − 1 bytes. Decida pelo cabeçalho, antes de acumular os dados: se o tamanho declarado passa do limite, feche com 1009. A biblioteca \`websockets\` do Python limita a 1 MiB por padrão.
        - **Clientes lentos e {{contrapressão|backpressure}}.** Um placar enviado a 5 mil pessoas, e uma delas está num 3G ruim. Se o servidor enfileira sem limite tudo o que ela ainda não recebeu, a memória cresce até o processo cair. Limite a fila de cada cliente e decida o que fazer quando ela enche: descartar as mensagens velhas (num placar, só o último valor importa) ou desconectar o cliente.
        - **Origin e autenticação.** WebSocket **não passa pelo CORS**: qualquer página, de qualquer site, pode abrir uma conexão com o seu servidor, e o navegador pode mandar junto os cookies do seu domínio (a menos que o atributo SameSite do cookie impeça). Isso é o {{sequestro de WebSocket entre sites|cross-site WebSocket hijacking (CSWSH)}}. No handshake, confira o \`Origin\` contra uma lista de origens permitidas e autentique o usuário. A API do navegador não deixa definir cabeçalhos como \`Authorization\`: use o cookie de sessão (com a checagem de Origin) ou um bilhete de uso único e curta duração na primeira mensagem. Token na URL acaba gravado em logs.
      `),
      deep(`
        O WebSocket original vive numa conexão HTTP/1.1 inteira. A RFC 8441 definiu como abrir um WebSocket dentro de um **stream** do HTTP/2 (com o método CONNECT estendido), e a RFC 9220 fez o mesmo para o HTTP/3. Os quadros continuam os mesmos; muda só como o canal é aberto, e várias conexões WebSocket podem dividir uma única conexão com o servidor. O **WebTransport**, sobre HTTP/3 e QUIC, vai além: vários fluxos independentes e datagramas sem garantia de entrega, úteis para jogos e mídia.
      `),
    ],
    exemplo: [
      { type: 'viz', viz: 'tcp-handshake', caption: 'O handshake WebSocket só começa depois deste: primeiro o TCP em três vias (e, no wss://, o TLS). Só então vai o GET com Upgrade, já dentro da conexão estabelecida.' },
      md(`
        ### "Hello" de ida e volta, byte a byte

        O navegador manda a mensagem de texto "Hello". Na rede vão 11 bytes (o exemplo é da própria RFC 6455):

        \`81 85 37 fa 21 3d 7f 9f 4d 51 58\`
      `),
      {
        type: 'table',
        head: ['Bytes', 'Em binário', 'Leitura'],
        rows: [
          ['81', '1000 0001', 'FIN = 1 (mensagem inteira), RSV = 000, opcode = 0x1 (texto)'],
          ['85', '1000 0101', 'MASK = 1 (veio do cliente), tamanho = 5'],
          ['37 fa 21 3d', '', 'chave de máscara'],
          ['7f 9f 4d 51 58', '', 'dados mascarados'],
        ],
      },
      md('Para desmascarar, cada byte faz XOR com o byte da chave na posição `i % 4`:'),
      {
        type: 'table',
        head: ['i', 'mascarado', 'chave[i % 4]', 'XOR', 'letra'],
        rows: [
          ['0', '7f', '37', '48', 'H'],
          ['1', '9f', 'fa', '65', 'e'],
          ['2', '4d', '21', '6c', 'l'],
          ['3', '51', '3d', '6c', 'l'],
          ['4', '58', '37 (de novo a posição 0)', '6f', 'o'],
        ],
      },
      md(`
        O servidor responde o eco **sem máscara**: \`81 05 48 65 6c 6c 6f\`, 7 bytes. Outros quadros que você vai encontrar:

        - mensagem de 300 bytes do servidor: \`81 7e 01 2c\` + os 300 bytes (126 no campo de tamanho, e 0x012c = 300 nos 2 bytes seguintes);
        - ping do servidor, sem dados: \`89 00\`; o pong do cliente: \`8a 80\` + 4 bytes de chave (mascarado, mesmo sem dados);
        - close do servidor com o código 1000: \`88 02 03 e8\` (0x03e8 = 1000).
      `),
    ],
    codigo: [
      py(`
        import base64
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
        print("resposta:", resposta.hex(" "))
      `),
      code('python', `
        # chat_ws.py — rode no seu computador: pip install websockets
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

        asyncio.run(main())
      `, 'A biblioteca cuida do handshake, da máscara, dos fragmentos, do ping/pong e do close. O broadcast não espera clientes lentos: as mensagens se acumulam no buffer de escrita deles, e por isso a documentação recomenda batimentos curtos, que derrubam logo quem parou de responder.'),
      jsLeitura(`
        // Na página servida em http://localhost:8000 (por exemplo, com python -m http.server 8000)
        const ws = new WebSocket("ws://localhost:8765");
        ws.addEventListener("open", () => ws.send("olá, pessoal"));
        ws.addEventListener("message", (e) => console.log("chegou:", e.data));
        ws.addEventListener("close", (e) => console.log("fechou:", e.code, e.reason));
      `, 'O cliente do navegador. Abra duas abas: o que uma envia aparece nas duas. Abra a página por outro endereço (como 127.0.0.1:8000) e veja o handshake ser recusado por causa do Origin.'),
      tip('Na aba **Rede** (Network) das ferramentas do desenvolvedor, filtre por **WS** e clique na conexão: a guia **Mensagens** mostra cada quadro enviado e recebido, e os cabeçalhos mostram o handshake com o 101.'),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e9-ws-1',
          kind: 'mcq',
          prompt: 'O servidor respondeu `HTTP/1.1 101 Switching Protocols` ao GET com `Upgrade: websocket`. O que passa a trafegar naquela conexão TCP?',
          difficulty: 'facil',
          skills: ['redes-sockets'],
          hints: [
            'O que significa "trocar de protocolo" numa conexão que já existe?',
            'Depois do 101, ainda faz sentido haver linha de requisição e cabeçalhos HTTP em cada mensagem?',
          ],
          explanation: 'O 101 encerra o HTTP naquela conexão. A mesma conexão TCP passa a carregar quadros WebSocket, nos dois sentidos e a qualquer momento. Como o WebSocket tem enquadramento próprio, a aplicação recebe mensagens inteiras, e não pedaços de um fluxo de bytes.',
          options: [
            { text: 'Requisições e respostas HTTP comuns, uma para cada mensagem', feedback: 'Isso é o long polling. Depois do 101 não há mais requisições HTTP naquela conexão: cada mensagem custa só 2 a 14 bytes de cabeçalho.' },
            { text: 'Quadros WebSocket nos dois sentidos, na mesma conexão TCP', correct: true, feedback: 'Isso. A troca de protocolo reaproveita a conexão; daí em diante, qualquer lado envia quadros quando quiser.' },
            { text: 'Nada: o cliente abre uma nova conexão TCP, numa porta própria do WebSocket', feedback: 'O upgrade acontece na mesma conexão (e nas mesmas portas 80 ou 443). É justamente por começar como HTTP que o WebSocket passa por firewalls e proxies que só deixam passar a web.' },
            { text: 'Bytes soltos, sem fronteiras, como num socket TCP puro', feedback: 'O WebSocket tem enquadramento próprio (FIN, opcode, tamanho). A aplicação não precisa inventar delimitadores: recebe mensagens inteiras.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e9-ws-2',
          kind: 'fill',
          lang: 'python',
          prompt: 'Complete a leitura dos dois primeiros bytes de um quadro: o bit FIN (o mais alto do primeiro byte), o opcode (os 4 bits mais baixos do primeiro byte) e o tamanho (os 7 bits mais baixos do segundo byte). Use deslocamentos e máscaras de bits.',
          difficulty: 'intermediario',
          skills: ['redes-sockets'],
          hints: [
            'Num byte, os bits são numerados de 7 (o mais alto) a 0. Quantas posições o bit mais alto precisa andar para a direita até virar o bit 0?',
            'Para ficar só com os 4 bits de baixo, faça AND com um número que tem exatamente esses 4 bits ligados. Quanto vale 1111 em binário?',
            'O mesmo raciocínio vale para os 7 bits de baixo: que número tem os bits 0 a 6 ligados e o 7 desligado?',
          ],
          explanation: '`b0 >> 7` traz o bit mais alto para a posição 0 (o `& 1` é só garantia). `b0 & 0x0F` (15) zera os 4 bits de cima e deixa o opcode. `b1 & 0x7F` (127) zera o bit de máscara e deixa o tamanho de 7 bits. Com os bytes 0x81 e 0x85 do exemplo, isso dá FIN = 1, opcode = 1 e tamanho = 5.',
          template: 'b0, b1 = quadro[0], quadro[1]\nfin = (b0 >> ___) & 1\nopcode = b0 & ___\nmascarado = (b1 >> 7) & 1\ntamanho = b1 & ___',
          blanks: [
            ['7'],
            ['0x0F', '0x0f', '0xF', '0xf', '15', '0b1111', '0b00001111'],
            ['0x7F', '0x7f', '127', '0b1111111', '0b01111111'],
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e9-ws-3',
          kind: 'predict',
          lang: 'python',
          prompt: 'A função calcula quantos bytes de cabeçalho um quadro precisa, conforme o tamanho dos dados e a máscara. O que o programa imprime?',
          difficulty: 'intermediario',
          skills: ['redes-sockets'],
          hints: [
            'Quais são os três "degraus" do campo de tamanho, e em que valores exatos se passa de um para o outro?',
            '126 cabe nos 7 bits? Lembre que 126 e 127 são valores especiais nesse campo.',
            'A máscara acrescenta quantos bytes, e em quais quadros?',
          ],
          explanation: 'Até 125 bytes, o tamanho cabe nos 7 bits: 2 bytes de cabeçalho. De 126 a 65 535, entram mais 2 bytes (16 bits): 4 no total. Acima disso, mais 8 bytes (64 bits): 10. A máscara soma 4 bytes. Por isso 5 mascarado dá 6, 125 dá 2, 126 dá 4 e 65 536 mascarado dá 2 + 8 + 4 = 14.',
          code: dedent(`
            def tamanho_cabecalho(n, mascarado):
                total = 2
                if n > 65535:
                    total += 8
                elif n > 125:
                    total += 2
                if mascarado:
                    total += 4
                return total

            for n, m in [(5, True), (125, False), (126, False), (65536, True)]:
                print(n, tamanho_cabecalho(n, m))
          `),
          answer: '5 6\n125 2\n126 4\n65536 14',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e9-ws-4',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Escreva \`responder_handshake(requisicao)\`, que recebe o texto de uma requisição HTTP (linhas separadas por \`"\\r\\n"\`, terminando numa linha vazia) e devolve o texto da resposta:

            - **101**, se for um handshake WebSocket válido:
              \`"HTTP/1.1 101 Switching Protocols\\r\\nUpgrade: websocket\\r\\nConnection: Upgrade\\r\\nSec-WebSocket-Accept: <aceite>\\r\\n\\r\\n"\`
            - **400**, \`"HTTP/1.1 400 Bad Request\\r\\n\\r\\n"\`, se o método não for GET, se \`Upgrade\` não for \`websocket\`, se \`Connection\` não tiver o item \`Upgrade\` ou se \`Sec-WebSocket-Key\` não for base64 de exatamente 16 bytes;
            - **426**, \`"HTTP/1.1 426 Upgrade Required\\r\\nSec-WebSocket-Version: 13\\r\\n\\r\\n"\`, se estiver tudo certo menos a versão, que não é \`13\`.

            Como no HTTP, **nomes** de cabeçalho não diferenciam maiúsculas de minúsculas, e os valores de \`Upgrade\` e dos itens de \`Connection\` também não. \`Connection\` pode ser uma lista separada por vírgulas: o Firefox manda \`keep-alive, Upgrade\`. Ignore espaços em volta dos valores.
          `),
          difficulty: 'intermediario',
          skills: ['redes-sockets'],
          hints: [
            'Antes de validar qualquer coisa, como transformar as linhas de cabeçalho num dicionário que você consiga consultar sem se preocupar com maiúsculas?',
            'A primeira linha é diferente das outras. Que três partes ela tem, e qual delas diz o método?',
            '`Connection: keep-alive, Upgrade` tem dois itens. Como você confere se um deles é "upgrade"?',
            'Como saber se a chave é base64 de 16 bytes? Decodifique com `validate=True` e olhe o tamanho. E se a decodificação falhar, que exceção aparece? Teste com uma chave que tenha acento.',
            'A ordem das checagens importa: a versão só deve dar 426 quando todo o resto estiver certo.',
          ],
          explanation: dedent(`
            O roteiro é: separar a primeira linha (método, caminho, versão), montar um dicionário com os nomes em minúsculas, validar na ordem (método, Upgrade, Connection, chave) e, só no fim, a versão. O aceite é \`base64(SHA-1(chave + GUID))\`, calculado sobre a chave **como texto**, do jeito que chegou.

            Os detalhes que derrubam implementações reais são exatamente os dos testes: \`Connection\` com mais de um item, cabeçalhos em minúsculas (o HTTP/2 e muitos proxies mandam assim) e chaves inválidas. Um servidor de produção ainda confere o \`Host\` e o \`Origin\`, e pode negociar subprotocolos e extensões.
          `),
          starter: dedent(`
            import base64
            import hashlib

            GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

            def responder_handshake(requisicao):
                # 1. separe a linha de requisição dos cabeçalhos (dicionário com nomes em minúsculas)
                # 2. valide método, Upgrade, Connection e Sec-WebSocket-Key (400 se algo falhar)
                # 3. confira a versão (426 se não for 13)
                # 4. calcule o aceite e devolva a resposta 101
                pass
          `),
          solution: dedent(`
            import base64
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
                        f"Sec-WebSocket-Accept: {aceite}\\r\\n\\r\\n")
          `),
          tests: [
            {
              name: 'o exemplo da RFC 6455',
              code: dedent(`
                req = "GET /chat HTTP/1.1\\r\\nHost: exemplo.com.br\\r\\nUpgrade: websocket\\r\\nConnection: Upgrade\\r\\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\\r\\nSec-WebSocket-Version: 13\\r\\n\\r\\n"
                r = responder_handshake(req)
                esperado = "HTTP/1.1 101 Switching Protocols\\r\\nUpgrade: websocket\\r\\nConnection: Upgrade\\r\\nSec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=\\r\\n\\r\\n"
                assert r == esperado, f"para o exemplo da RFC a resposta deveria ser {esperado!r}; veio {r!r}"
              `),
            },
            {
              name: 'outra chave (o aceite é calculado, não copiado)',
              code: dedent(`
                import base64 as _b64, hashlib as _h
                _k = _b64.b64encode(bytes(range(16))).decode()
                _acc = _b64.b64encode(_h.sha1((_k + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").encode()).digest()).decode()
                req = f"GET / HTTP/1.1\\r\\nHost: a\\r\\nUpgrade: websocket\\r\\nConnection: Upgrade\\r\\nSec-WebSocket-Key: {_k}\\r\\nSec-WebSocket-Version: 13\\r\\n\\r\\n"
                r = responder_handshake(req)
                assert r is not None and f"Sec-WebSocket-Accept: {_acc}\\r\\n" in r, f"com a chave {_k!r}, o aceite deveria ser {_acc!r}; veio {r!r}"
              `),
            },
            {
              name: 'Connection com lista e cabeçalhos em minúsculas (Firefox, HTTP/2, proxies)',
              code: dedent(`
                req = "GET /chat HTTP/1.1\\r\\nhost: exemplo.com.br\\r\\nupgrade: WebSocket\\r\\nconnection: keep-alive, Upgrade\\r\\nsec-websocket-key:   dGhlIHNhbXBsZSBub25jZQ==  \\r\\nsec-websocket-version: 13\\r\\n\\r\\n"
                r = responder_handshake(req)
                assert r is not None and r.startswith("HTTP/1.1 101 "), f"'connection: keep-alive, Upgrade' tem o item Upgrade, e nomes de cabeçalho não diferenciam maiúsculas: deveria ser 101; veio {r!r}"
                assert "s3pPLMBiTxaQ9kYGzzhZRbK+xOo=" in r, f"os espaços em volta da chave não fazem parte dela; veio {r!r}"
              `),
            },
            {
              name: 'requisições inválidas dão 400',
              code: dedent(`
                base = {"Host": "a", "Upgrade": "websocket", "Connection": "Upgrade", "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==", "Sec-WebSocket-Version": "13"}
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
                    assert r == ruim, f"{motivo}: deveria ser {ruim!r}; veio {r!r}"
              `),
            },
            {
              name: 'versão errada dá 426, mas só se o resto estiver certo',
              code: dedent(`
                req = "GET / HTTP/1.1\\r\\nHost: a\\r\\nUpgrade: websocket\\r\\nConnection: Upgrade\\r\\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\\r\\nSec-WebSocket-Version: 8\\r\\n\\r\\n"
                r = responder_handshake(req)
                esperado = "HTTP/1.1 426 Upgrade Required\\r\\nSec-WebSocket-Version: 13\\r\\n\\r\\n"
                assert r == esperado, f"versão 8: deveria ser {esperado!r}; veio {r!r}"
                req2 = "POST / HTTP/1.1\\r\\nHost: a\\r\\nUpgrade: websocket\\r\\nConnection: Upgrade\\r\\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\\r\\nSec-WebSocket-Version: 8\\r\\n\\r\\n"
                r2 = responder_handshake(req2)
                assert r2 == "HTTP/1.1 400 Bad Request\\r\\n\\r\\n", f"POST com versão 8: o método já é inválido, então é 400; veio {r2!r}"
              `),
            },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e9-ws-5',
          kind: 'fix',
          lang: 'python',
          prompt: dedent(`
            \`montar_quadro(texto)\` deveria montar o quadro de texto que o **servidor** envia (FIN = 1, opcode 0x1, sem máscara), escolhendo o campo de tamanho de 7, 16 ou 64 bits. Ela funciona com "oi", mas quebra com "olá" e com mensagens longas. Encontre e corrija os dois erros.
          `),
          difficulty: 'intermediario',
          skills: ['redes-sockets', 'comp-binario'],
          hints: [
            'O campo de tamanho conta o quê: caracteres ou bytes? Quantos bytes tem "olá" em UTF-8?',
            'Rode com uma mensagem de 70 000 letras. Que erro aparece, e o que o formato "H" do struct consegue representar?',
            'Quantos bytes o tamanho estendido ocupa quando o campo de 7 bits vale 127? Qual letra do struct corresponde a esse tamanho?',
          ],
          explanation: 'Primeiro erro: o tamanho tem de ser `len(dados)`, em bytes, e não `len(texto)`, em caracteres. "olá" tem 3 caracteres e 4 bytes, e um cliente que lê 3 bytes perde o último e desalinha todos os quadros seguintes. Segundo erro: com 127 no campo de 7 bits, o tamanho vai em 8 bytes, formato "Q" (inteiro sem sinal de 64 bits); "H" só tem 16 bits e falha acima de 65 535. O "!" no formato garante a ordem de rede (big-endian).',
          starter: dedent(`
            import struct

            def montar_quadro(texto):
                dados = texto.encode("utf-8")
                n = len(texto)
                if n <= 125:
                    cabecalho = struct.pack("!BB", 0x81, n)
                elif n <= 65535:
                    cabecalho = struct.pack("!BBH", 0x81, 126, n)
                else:
                    cabecalho = struct.pack("!BBH", 0x81, 127, n)
                return cabecalho + dados
          `),
          solution: dedent(`
            import struct

            def montar_quadro(texto):
                dados = texto.encode("utf-8")
                n = len(dados)
                if n <= 125:
                    cabecalho = struct.pack("!BB", 0x81, n)
                elif n <= 65535:
                    cabecalho = struct.pack("!BBH", 0x81, 126, n)
                else:
                    cabecalho = struct.pack("!BBQ", 0x81, 127, n)
                return cabecalho + dados
          `),
          tests: [
            { name: 'mensagem curta', code: 'q = montar_quadro("oi")\nassert q == bytes([0x81, 2]) + b"oi", f"esperado 81 02 6f 69; veio {q.hex(\' \')}"' },
            {
              name: 'acentos: o tamanho é em bytes',
              code: dedent(`
                q = montar_quadro("olá")
                assert q[1] == 4, f"'olá' tem 3 caracteres, mas 4 bytes em UTF-8; o campo de tamanho veio {q[1]}"
                assert q[2:] == "olá".encode("utf-8"), "os dados devem ser o texto em UTF-8"
              `),
            },
            {
              name: 'fronteira 125 / 126',
              code: dedent(`
                q = montar_quadro("a" * 125)
                assert q[1] == 125 and len(q) == 127, "125 bytes ainda cabem no campo de 7 bits"
                q = montar_quadro("a" * 126)
                assert q[1] == 126 and q[2:4] == (126).to_bytes(2, "big") and len(q) == 4 + 126, "126 bytes já usam o tamanho estendido de 16 bits"
              `),
            },
            {
              name: 'acentos que cruzam a fronteira',
              code: dedent(`
                q = montar_quadro("é" * 100)
                assert q[1] == 126, f"100 letras 'é' são 200 bytes: precisa do tamanho de 16 bits (126); veio {q[1]}"
                assert int.from_bytes(q[2:4], "big") == 200, "o tamanho estendido deveria ser 200"
              `),
            },
            {
              name: 'fronteira 65 535 / 65 536 e 64 bits',
              code: dedent(`
                q = montar_quadro("a" * 65535)
                assert q[1] == 126 and int.from_bytes(q[2:4], "big") == 65535, "65 535 ainda cabe em 16 bits"
                q = montar_quadro("a" * 70000)
                assert q[1] == 127, "acima de 65 535, o campo de 7 bits vale 127"
                assert int.from_bytes(q[2:10], "big") == 70000 and len(q) == 10 + 70000, "o tamanho de 64 bits ocupa 8 bytes, logo depois dos 2 primeiros"
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
          id: 'e9-ws-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Escreva o leitor de quadros de um **servidor**: \`ler_quadros(buffer, limite=1_000_000)\` recebe os bytes acumulados de \`recv()\` e devolve \`(quadros, resto)\`, onde \`quadros\` é a lista de tuplas \`(fin, opcode, dados)\` dos quadros completos, **na ordem**, com \`fin\` booleano e \`dados\` já **desmascarados** (bytes), e \`resto\` são os bytes de um quadro ainda incompleto (ou \`b""\`).

            Levante \`ValueError\` (é o caso de fechar com 1002 ou 1009) se encontrar:
            - bits RSV ligados (nenhuma extensão foi negociada);
            - opcode reservado (só valem 0x0, 0x1, 0x2, 0x8, 0x9 e 0xA);
            - quadro **sem máscara** (todo quadro do cliente é mascarado);
            - quadro de controle (opcode 0x8 ou mais) com FIN = 0 ou com mais de 125 bytes;
            - tamanho declarado maior que \`limite\`. Atenção: decida isso **assim que o tamanho estiver no buffer**, sem esperar os dados chegarem.

            Não monte as mensagens: devolva cada quadro como veio, mesmo os fragmentos e os pings que aparecem no meio deles.
          `),
          difficulty: 'desafio',
          skills: ['redes-sockets', 'comp-binario'],
          hints: [
            'Quantos bytes você precisa ter no buffer para começar a ler um quadro? E para saber o tamanho dele, nos três casos do campo de 7 bits?',
            'Faça um laço que, a cada volta, tenta ler um quadro do começo do buffer. Em que situações ele deve parar e devolver o que sobrou?',
            'Escreva a posição onde começa a chave como uma variável que depende do caso (2, 4 ou 10). Onde começam os dados?',
            'As validações que dependem só dos dois primeiros bytes podem ser feitas antes de qualquer espera. E a do limite: com um cabeçalho que declara 1 TiB e nenhum dado, sua função levanta o erro ou fica esperando os dados?',
            'Para desmascarar, cada byte i dos dados faz XOR com a chave na posição i % 4. Teste com o "Hello" da RFC.',
          ],
          explanation: dedent(`
            O laço tenta ler um quadro do começo do buffer: com 2 bytes, já dá para validar RSV, opcode, máscara e as regras dos quadros de controle; com 2, 4 ou 10 bytes, sabe-se o tamanho, e é aí que o limite é conferido; com \`pos + 4 + n\` bytes, o quadro está completo e pode ser desmascarado e retirado do buffer. Faltou byte em qualquer etapa? Para e devolve o resto, e a próxima chamada recomeça do mesmo quadro.

            O ponto de segurança é o limite: um servidor que espera os dados antes de olhar o tamanho deixa qualquer cliente fazê-lo acumular bytes sem fim. Basta um cabeçalho de 14 bytes declarando 1 TiB e ir mandando dados. Bibliotecas reais fazem exatamente essas validações e, a partir daí, montam as mensagens: juntam os fragmentos até o FIN, conferem o UTF-8 da mensagem inteira e respondem pings sem esperar o fim da mensagem fragmentada.
          `),
          starter: dedent(`
            def ler_quadros(buffer, limite=1_000_000):
                # devolva (lista de (fin, opcode, dados desmascarados), bytes que sobraram)
                # levante ValueError nos casos do enunciado
                return [], buffer
          `),
          solution: dedent(`
            OPCODES = {0x0, 0x1, 0x2, 0x8, 0x9, 0xA}

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
                return quadros, buffer
          `),
          tests: [
            {
              name: 'o "Hello" da RFC',
              code: REF_WS + '\n' + dedent(`
                r = ler_quadros(bytes.fromhex("818537fa213d7f9f4d5158"))
                assert isinstance(r, tuple) and len(r) == 2, f"devolva uma tupla (quadros, resto); veio {r!r}"
                q, resto = r
                assert [tuple(x) for x in q] == [(True, 1, b"Hello")], f"esperado [(True, 1, b'Hello')]; veio {q!r}"
                assert resto == b"", f"não deveria sobrar nada; sobrou {resto!r}"
              `),
            },
            {
              name: 'vários quadros juntos e um incompleto no fim',
              code: REF_WS + '\n' + dedent(`
                fluxo = _quadro(b"oi") + _quadro(bytes([1, 2, 3]), opcode=2) + _quadro(b"tchau")[:5]
                q, resto = ler_quadros(fluxo)
                assert [tuple(x) for x in q] == [(True, 1, b"oi"), (True, 2, bytes([1, 2, 3]))], f"veio {q!r}"
                assert resto == _quadro(b"tchau")[:5], f"os 5 bytes do quadro incompleto devem sobrar; sobrou {resto!r}"
              `),
            },
            {
              name: 'tamanhos de 16 e 64 bits',
              code: REF_WS + '\n' + dedent(`
                medio = bytes(i % 251 for i in range(300))
                grande = bytes(i % 7 for i in range(70000))
                q, resto = ler_quadros(_quadro(medio, opcode=2) + _quadro(grande, opcode=2))
                assert len(q) == 2, f"deveriam sair 2 quadros; saíram {len(q)}"
                assert q[0][2] == medio, "o quadro de 300 bytes (tamanho em 16 bits) veio errado"
                assert q[1][2] == grande, "o quadro de 70 000 bytes (tamanho em 64 bits) veio errado"
                assert resto == b""
              `),
            },
            {
              name: 'cabeçalho chegando aos pedaços',
              code: REF_WS + '\n' + dedent(`
                f = _quadro(bytes(300), opcode=2)
                for corte in (1, 2, 3, 4, 6, 7, 8, 9, len(f) - 1):
                    q, resto = ler_quadros(f[:corte])
                    assert list(q) == [] and resto == f[:corte], f"com só {corte} bytes de um quadro de 300, nada sai e tudo sobra; veio {q!r} e resto de {len(resto)} bytes"
                rec, resto = _alimentar_em_pedacos(f + _quadro(b"fim"), [1, 3, 5, 200])
                assert rec == [(True, 2, bytes(300)), (True, 1, b"fim")], f"entregando o fluxo aos pedaços, deveriam sair os 2 quadros inteiros; veio {rec!r}"
              `),
            },
            {
              name: 'fragmentos com ping no meio',
              code: REF_WS + '\n' + dedent(`
                fluxo = _quadro("aç".encode()[:2], fin=False) + _quadro(b"!", opcode=9) + _quadro("aç".encode()[2:] + b"o", opcode=0)
                q, resto = ler_quadros(fluxo)
                esperado = [(False, 1, b"a" + "ç".encode()[:1]), (True, 9, b"!"), (True, 0, "ç".encode()[1:] + b"o")]
                assert [tuple(x) for x in q] == esperado, f"devolva cada quadro como veio, sem montar a mensagem; esperado {esperado!r}, veio {q!r}"
              `),
            },
            {
              name: 'quadros inválidos',
              code: REF_WS + '\n' + dedent(`
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
                    assert False, f"{motivo}: deveria levantar ValueError; devolveu {r!r}"
              `),
            },
            {
              name: 'limite decidido pelo cabeçalho, sem esperar os dados',
              code: REF_WS + '\n' + dedent(`
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
                assert len(q) == 1, "exatamente no limite ainda é aceito"
              `),
            },
            {
              name: 'fluxos aleatórios cortados em qualquer ponto',
              code: REF_WS + '\n' + dedent(`
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
                    assert rec == [tuple(x) for x in esperado] and resto == b"", f"com cortes em {cortes}, algum quadro saiu errado, faltou ou ficou no resto ({len(resto)} bytes sobraram)"
              `),
            },
          ],
        },
      },
    ],
    projeto: [
      { type: 'project', projectId: 'p8-chat' },
      md('Uma das extensões do **chat em rede** é um cliente web. Ponha um servidor WebSocket ao lado do servidor TCP (ou troque o TCP por ele), reaproveitando as salas e o broadcast. Confira o `Origin` no handshake, ligue o batimento, limite o tamanho das mensagens e limite também a fila de cada cliente: quando ela encher, desconecte o cliente lento com o código 1008 em vez de deixar a memória crescer.'),
    ],
    revisao: [
      md(`
        - HTTP não deixa o servidor falar primeiro. Polling e long polling contornam; SSE resolve para servidor → cliente; WebSocket é bidirecional.
        - Handshake: GET com \`Upgrade: websocket\` e \`Sec-WebSocket-Key\`; resposta **101** com \`Sec-WebSocket-Accept = base64(SHA-1(chave + GUID))\`. Depois disso, só quadros.
        - Quadro: FIN, RSV, opcode (texto, binário, continuação, close, ping, pong), MASK e tamanho em 7, 16 ou 64 bits (126 e 127 são sinais).
        - Cliente → servidor sempre mascarado, servidor → cliente nunca. A máscara protege proxies e caches antigos, não é sigilo: para isso, \`wss://\`.
        - Controle: no máximo 125 bytes, sem fragmentação; ping é respondido com pong; close leva um código (1000 normal, 1001 indo embora, 1009 grande demais; 1006 nunca vai na rede).
        - Em produção: conferir o Origin (não há CORS), batimento contra conexões meio abertas, limite de tamanho decidido pelo cabeçalho e fila limitada por cliente.
      `),
      english(`
        **Vocabulary:** *upgrade*, *handshake*, *frame*, *opcode*, *payload*, *masking key*, *fragment*, *ping/pong*, *close code*, *heartbeat*, *backpressure*, *slow consumer*.

        From RFC 6455: *"A client MUST mask all frames that it sends to the server. [...] A server MUST NOT mask any frames that it sends to the client."*

        Interview question: *"How would you push real-time updates to a browser? When would you choose Server-Sent Events over WebSockets?"* A good answer starts with the direction of the data: if only the server talks, SSE is simpler and reconnects by itself.
      `),
    ],
  },
  review: [
    ['Como o servidor calcula o Sec-WebSocket-Accept?', 'base64(SHA-1(Sec-WebSocket-Key + o GUID fixo 258EAFA5-E914-47DA-95CA-C5AB0DC85B11)). Prova que o servidor entendeu WebSocket; não é autenticação.'],
    ['Que lado mascara os quadros, e o que a máscara protege?', 'Só o cliente. Impede que um script escolha os bytes exatos na rede e engane proxies e caches no caminho; não é criptografia (a chave vai no próprio quadro).'],
    ['Como é codificado o tamanho dos dados num quadro?', '7 bits: de 0 a 125 é o próprio tamanho; 126 indica mais 2 bytes (16 bits); 127 indica mais 8 bytes (64 bits). Sempre na forma mais curta.'],
    ['Quais são os quadros de controle e que regras eles seguem?', 'Close (0x8), ping (0x9) e pong (0xA): no máximo 125 bytes, nunca fragmentados, podem vir no meio dos fragmentos de uma mensagem.'],
    ['Por que conferir o Origin no handshake WebSocket?', 'WebSocket não passa pelo CORS: qualquer site pode abrir a conexão e o navegador pode mandar os cookies do usuário (sequestro entre sites).'],
    ['Quando SSE basta no lugar de WebSocket?', 'Quando só o servidor envia (notificações, placar, progresso): é HTTP comum, texto, com reconexão automática.'],
    ['Para que serve o ping/pong num servidor WebSocket?', 'Manter a conexão ativa para NAT e proxies que derrubam conexões ociosas, e descobrir conexões meio abertas (o cliente sumiu sem fechar).'],
  ],
  references: ['kurose-ross', 'mdn', 'python-docs'],
});

/* ------------------------------------------------------------------ */
/* Proxies reversos e balanceamento de carga                           */
/* ------------------------------------------------------------------ */

const REF_LB = dedent(`
  import random as _random
  import ipaddress as _ipa

  class _RefMenos:
      def __init__(self, servidores):
          self.ordem = list(servidores)
          self.ativas = {s: 0 for s in self.ordem}
          self.ok = {s: True for s in self.ordem}
      def abrir(self):
          c = [s for s in self.ordem if self.ok[s]]
          if not c:
              raise RuntimeError("nenhum")
          e = min(c, key=lambda s: self.ativas[s])
          self.ativas[e] += 1
          return e
      def fechar(self, nome):
          self.ativas[nome] -= 1
      def marcar(self, nome, saudavel):
          self.ok[nome] = saudavel

  class _RefSuave:
      def __init__(self, pesos):
          self.pesos = dict(pesos)
          self.atual = {s: 0 for s in self.pesos}
          self.ok = {s: True for s in self.pesos}
      def escolher(self):
          vivos = [s for s in self.pesos if self.ok[s]]
          if not vivos:
              raise RuntimeError("nenhum")
          total, melhor = 0, None
          for s in vivos:
              self.atual[s] += self.pesos[s]
              total += self.pesos[s]
              if melhor is None or self.atual[s] > self.atual[melhor]:
                  melhor = s
          self.atual[melhor] -= total
          return melhor
      def marcar(self, nome, saudavel):
          if self.ok[nome] != saudavel:
              self.atual[nome] = 0
          self.ok[nome] = saudavel
`);

const balanceamento = lesson({
  id: 'l9-proxies-balanceamento',
  moduleId: 'm9-3',
  title: 'Proxies reversos e balanceamento de carga: um endereço, muitos servidores',
  titleEn: 'Reverse proxies and load balancing: one address, many servers',
  summary: 'O que fica entre o cliente e os seus servidores: proxy direto e reverso, balanceamento em camada 4 e em camada 7, os algoritmos (round robin, ponderado, menos conexões, dois aleatórios, hash), verificações de saúde, o IP real do cliente no X-Forwarded-For, quando um proxy pode repetir uma requisição e o que muda com conexões longas como WebSockets.',
  minutes: 50,
  objectives: [
    'Diferenciar proxy direto de proxy reverso, e balanceamento em camada 4 de balanceamento em camada 7',
    'Comparar round robin, round robin ponderado, menos conexões, dois aleatórios e hash, e escolher um para um caso concreto',
    'Explicar verificações de saúde ativas e passivas e o papel dos limiares de subida e de queda',
    'Recuperar o IP real do cliente a partir do X-Forwarded-For sem aceitar endereços forjados',
    'Decidir quando um proxy pode repetir uma requisição e por que conexões longas exigem drenagem e reconexão com espera aleatória',
  ],
  skills: ['redes-sockets'],
  terms: [
    t('proxy direto', 'forward proxy', 'Intermediário que age em nome dos clientes, como o proxy da empresa que filtra o acesso à internet.'),
    t('proxy reverso', 'reverse proxy', 'Intermediário que age em nome dos servidores: recebe as conexões dos clientes e as repassa a servidores internos.', 'NGINX can act as a reverse proxy and load balancer.'),
    t('grupo de servidores', 'upstream / backend pool', 'Conjunto de instâncias entre as quais o balanceador distribui o tráfego.'),
    t('balanceamento em camada 4', 'layer 4 load balancing', 'Decide por conexão olhando só IP, porta e protocolo de transporte; não entende o conteúdo.'),
    t('balanceamento em camada 7', 'layer 7 load balancing', 'Termina a conexão do cliente, entende o protocolo de aplicação (HTTP) e decide por requisição.'),
    t('terminação TLS', 'TLS termination', 'O proxy decifra o TLS com o certificado do site e fala com os servidores internos sem TLS ou com outra conexão TLS.'),
    t('round robin ponderado', 'weighted round robin', 'Revezamento em que cada servidor recebe uma parte proporcional ao seu peso.'),
    t('menos conexões', 'least connections', 'Escolhe o servidor com menos conexões ativas no momento.'),
    t('poder de duas escolhas', 'power of two choices', 'Sorteia dois servidores e manda para o menos carregado dos dois.'),
    t('verificação de saúde', 'health check', 'Teste periódico (ou observação do tráfego) que decide se um servidor continua recebendo tráfego.', 'Server app2 is DOWN, reason: Layer7 wrong status, code: 503'),
    t('sessão fixa', 'sticky session / session affinity', 'Mandar sempre o mesmo cliente para o mesmo servidor, por cookie ou por hash do IP.'),
    t('cabeçalho hop-by-hop', 'hop-by-hop header', 'Cabeçalho que vale só para uma conexão (como Connection e Upgrade) e que o proxy não repassa adiante.'),
    t('drenagem de conexões', 'connection draining', 'Parar de mandar conexões novas a um servidor e esperar (com prazo) as atuais terminarem antes de desligá-lo.'),
    t('espera exponencial com variação aleatória', 'exponential backoff with jitter', 'Esperar cada vez mais entre tentativas, com um sorteio no tempo, para que milhares de clientes não voltem todos no mesmo instante.'),
  ],
  stages: {
    conceito: [
      md(`
        Numa agência bancária, ninguém escolhe o caixa: há uma fila única e um painel que chama "próximo cliente, caixa 3". Quem chega vê **uma** entrada; atrás dela, vários atendentes. Se um caixa fecha para o almoço, o painel simplesmente para de chamá-lo.

        Na web, esse painel é o {{proxy reverso|reverse proxy}}. O cliente se conecta a \`loja.exemplo.com.br\`; quem atende é o proxy (Nginx, HAProxy, Envoy, o balanceador da nuvem, uma CDN), que escolhe uma instância do {{grupo de servidores|upstream / backend pool}} e repassa o pedido. Com isso você ganha:

        - **escala horizontal**: mais máquinas atrás do mesmo endereço;
        - **tolerância a falhas**: servidor doente sai da rotação sem o usuário perceber;
        - **deploy sem parar o site**: tira uma instância, atualiza, devolve;
        - **um lugar só** para TLS, compressão, cache, limite de requisições e logs.

        O preço é que agora há uma peça no meio, com regras próprias: ela muda o IP que o servidor vê, pode repetir requisições, derruba conexões ociosas e, se cair, derruba tudo.
      `),
    ],
    explicacao: [
      md(`
        ### Proxy direto × proxy reverso

        Os dois são intermediários; a diferença é **a quem servem**. O {{proxy direto|forward proxy}} serve os **clientes**: é o proxy da empresa ou da escola, configurado nos computadores, que filtra e registra o acesso à internet; os sites veem o IP do proxy, não o de cada funcionário. O proxy reverso serve os **servidores**: fica na frente deles, e o cliente nem sabe que existe.

        ### Camada 4 × camada 7
      `),
      {
        type: 'table',
        head: ['', '{{Camada 4|layer 4 load balancing}} (transporte)', '{{Camada 7|layer 7 load balancing}} (aplicação)'],
        rows: [
          ['O que enxerga', 'IPs, portas, TCP ou UDP', 'a requisição HTTP inteira: método, Host, caminho, cabeçalhos, cookies'],
          ['Unidade de decisão', 'a conexão: todos os bytes dela vão para o mesmo servidor', 'cada requisição: duas requisições da mesma conexão podem ir para servidores diferentes'],
          ['Conexões TCP', 'encaminha a conexão do cliente (ou os pacotes dela)', 'duas: cliente ↔ proxy e proxy ↔ servidor (esta muitas vezes reaproveitada)'],
          ['TLS', 'pode passar direto até o servidor (passthrough)', 'precisa fazer a {{terminação TLS|TLS termination}} para ler o HTTP'],
          ['Pode', 'balancear qualquer protocolo: banco de dados, MQTT, jogos em UDP', 'rotear por caminho ou domínio, reescrever cabeçalhos, comprimir, fazer cache, repetir requisições'],
          ['Exemplos', 'AWS NLB, HAProxy em mode tcp, Linux IPVS', 'Nginx, HAProxy em mode http, Envoy, AWS ALB'],
        ],
        caption: 'Uma consequência que pega muita gente: com HTTP/2 ou gRPC, o cliente manda tudo por uma conexão só. Um balanceador de camada 4 vê uma conexão e a manda inteira para um servidor; só um de camada 7 distribui as requisições de dentro dela.',
      },
      md(`
        ### Algoritmos de escolha
      `),
      {
        type: 'table',
        head: ['Algoritmo', 'Como escolhe', 'Bom quando', 'Cuidado'],
        rows: [
          ['Round robin', 'o próximo da lista, em revezamento', 'servidores iguais e requisições parecidas', 'ignora a carga real: um servidor com requisições lentas continua recebendo a mesma parte'],
          ['{{Round robin ponderado|weighted round robin}}', 'proporcional a um peso (máquina de 8 núcleos com peso 2, de 4 núcleos com peso 1)', 'máquinas de tamanhos diferentes', 'a versão ingênua manda rajadas (a, a, a, a, a, b, c); o Nginx usa uma versão "suave", que intercala'],
          ['{{Menos conexões|least connections}}', 'o servidor com menos conexões ativas agora', 'durações muito diferentes (relatório de 30 s junto com consulta de 5 ms) e conexões longas', 'cada balanceador só conhece as conexões que ele mesmo abriu; um servidor que acabou de voltar, com zero, recebe uma enxurrada'],
          ['{{Dois aleatórios|power of two choices}}', 'sorteia dois servidores e escolhe o menos carregado dos dois', 'vários balanceadores sem estado compartilhado', 'quase nenhum: é o padrão do Envoy para "menos requisições" e existe no Nginx (\`random two least_conn\`)'],
          ['Hash (IP, cookie, URL)', 'a mesma chave vai sempre para o mesmo servidor', 'aproveitar cache local; afinidade de sessão', 'com \`hash % n\`, mudar n remapeia quase tudo: use hash consistente (visto no Nível 7)'],
        ],
      },
      deep(`
        Por que sortear **dois** funciona tão bem? Distribuindo n requisições ao acaso entre n servidores, o mais carregado fica com cerca de log n / log log n delas. Sorteando dois e escolhendo o menos carregado, o máximo cai para cerca de log log n / log 2: uma melhora exponencial, e sortear três ou mais acrescenta pouco (Azar, Broder, Karlin e Upfal, 1994; Mitzenmacher, 2001). E, ao contrário de "sempre o menos carregado", dois aleatórios evita que dez balanceadores, cada um com a sua visão atrasada, mandem tudo juntos para o mesmo servidor que parecia vazio.
      `),
      md(`
        ### {{Verificações de saúde|health checks}}

        - **Ativas**: o balanceador pergunta, por exemplo \`GET /saude\` a cada 2 s. Para não ficar tirando e devolvendo um servidor a cada resposta isolada (o "pisca-pisca", em inglês *flapping*), usam-se **limiares**: só tira depois de *fall* falhas seguidas e só devolve depois de *rise* sucessos seguidos. No HAProxy, os padrões são \`inter 2s\`, \`rise 2\` e \`fall 3\`.
        - **Passivas**: o balanceador observa o tráfego real. No Nginx de código aberto (as verificações ativas são da versão paga, o NGINX Plus), \`max_fails=1 fail_timeout=10s\` são os padrões: uma falha dentro de 10 s tira o servidor da rotação por 10 s.
        - **O que \`/saude\` deve conferir**: que o processo consegue atender. Cuidado ao incluir dependências compartilhadas: se \`/saude\` testa o banco e o banco fica lento, **todos** os servidores ficam "doentes" juntos e o balanceador tira todos, transformando uma lentidão num site fora do ar.

        ### Estado: sessões fixas e conexões longas

        Se a sessão do usuário fica na memória do servidor A, a próxima requisição tem de voltar para A: é a {{sessão fixa|sticky session / session affinity}}, por cookie do balanceador ou por hash do IP. Funciona, mas A cair significa perder as sessões dele, e a carga fica desigual. A saída preferida é o servidor **sem estado**: sessão no Redis ou no banco, e qualquer instância atende qualquer requisição (é um dos fatores do Twelve-Factor App).

        Conexões longas, como as de WebSocket, são fixas por natureza: a conexão fica no mesmo servidor por horas. Daí:

        - a escolha é feita **uma vez por conexão**, então "menos conexões" funciona bem, e round robin pode deixar um servidor com o dobro de usuários do outro;
        - um servidor novo só recebe conexões **novas**: a carga demora a se redistribuir;
        - no deploy, faça a {{drenagem de conexões|connection draining}}: pare de mandar conexões novas ao servidor, envie close **1001** (indo embora) às atuais e dê um prazo. Os clientes reconectam e caem em outro servidor;
        - se 50 mil clientes reconectam no mesmo segundo, a "manada" (*thundering herd*) derruba o próximo servidor. Os clientes devem reconectar com {{espera exponencial com variação aleatória|exponential backoff with jitter}}: esperar um tempo sorteado entre 0 e 1 s, depois entre 0 e 2 s, depois entre 0 e 4 s, até um teto.

        Lembre também que \`Upgrade\` e \`Connection\` são {{cabeçalhos hop-by-hop|hop-by-hop headers}}: valem só para a conexão em que chegaram, e a RFC 9110 manda o proxy não repassá-los. Por isso o Nginx só faz proxy de WebSocket se você mandar repassar esses cabeçalhos explicitamente, e o \`proxy_read_timeout\`, de 60 s por padrão, derruba conexões silenciosas: o batimento precisa ser mais frequente que isso.

        ### O que o proxy esconde: o IP do cliente

        Num proxy de camada 7, o servidor vê a conexão vindo **do proxy**. Para não perder a informação, o proxy acrescenta cabeçalhos:

        - \`X-Forwarded-For\`: cada proxy **acrescenta no fim** o IP de quem se conectou a ele. Fica uma lista: \`cliente, proxy1, proxy2\`.
        - \`X-Forwarded-Proto\` (\`https\`) e \`X-Forwarded-Host\`: o servidor precisa deles para montar redirecionamentos e cookies \`Secure\` quando o TLS terminou no proxy.
        - \`Forwarded: for=203.0.113.7;proto=https\` é a versão padronizada (RFC 7239). Os \`X-Forwarded-*\` são convenção, mas são os mais usados.
        - Em camada 4, sem HTTP para pôr cabeçalhos, o HAProxy criou o **PROXY protocol**: uma linha no começo da conexão com o endereço original do cliente.

        **O cliente controla o começo da lista.** Qualquer um manda \`X-Forwarded-For: 192.0.2.1\`, e o proxy só acrescenta depois. Quem usa o **primeiro** IP da lista para limitar tentativas de login ou para registrar auditoria está aceitando um IP inventado. A regra segura: percorra a lista **da direita para a esquerda** (incluindo, no fim, o IP de quem se conectou a você), pulando os proxies **que são seus**; o primeiro endereço que não é de um proxy seu é o do cliente.

        ### Timeouts e novas tentativas

        Se o servidor falha no meio, o proxy pode tentar outro. Isso só é seguro para requisições **idempotentes** (GET, PUT, DELETE): repetir um \`POST /pagamentos\` que estourou o tempo limite pode cobrar o Pix duas vezes, porque timeout **não** quer dizer que o primeiro servidor não processou. Por isso o Nginx, desde a versão 1.9.13, não repassa ao próximo servidor requisições não idempotentes (POST, LOCK, PATCH), a menos que você peça (\`proxy_next_upstream ... non_idempotent\`). APIs de pagamento resolvem do outro lado: o cliente envia uma **chave de idempotência**, e o servidor reconhece a repetição. E limite as repetições: num sistema já sobrecarregado, cada camada que repete multiplica a carga.

        ### E se o balanceador cair?

        Ele vira o ponto único de falha. Na prática há sempre dois ou mais: com um IP virtual que passa de um para o outro (VRRP, com o keepalived), com vários IPs no DNS ou com anycast, em que o mesmo IP é anunciado de vários lugares e a rede leva cada cliente ao mais próximo, como fazem as CDNs.
      `),
    ],
    exemplo: [
      md(`
        ### Um Nginx na frente de três instâncias
      `),
      code('text', `
        upstream app {
            least_conn;                                   # menos conexões, respeitando os pesos
            server 10.0.0.11:8000 weight=2;               # máquina com o dobro de núcleos
            server 10.0.0.12:8000 max_fails=3 fail_timeout=30s;
            server 10.0.0.13:8000 backup;                 # só recebe se os outros caírem
        }

        server {
            listen 443 ssl;                               # terminação TLS aqui
            server_name loja.exemplo.com.br;
            ssl_certificate     /etc/ssl/loja.pem;
            ssl_certificate_key /etc/ssl/loja.key;

            location / {
                proxy_pass http://app;
                proxy_set_header Host              $host;
                proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme;
            }

            location /ws/ {                               # WebSocket
                proxy_pass http://app;
                proxy_http_version 1.1;
                proxy_set_header Upgrade    $http_upgrade;  # hop-by-hop: repassar à mão
                proxy_set_header Connection "upgrade";
                proxy_read_timeout 120s;                   # o batimento tem de ser mais frequente
            }
        }
      `, 'nginx.conf. $proxy_add_x_forwarded_for é o X-Forwarded-For que chegou com o IP de quem se conectou ao Nginx acrescentado no fim.'),
      md(`
        ### O caminho de uma requisição, cabeçalho por cabeçalho

        Uma cliente em 203.0.113.7 tenta ser esperta e manda \`X-Forwarded-For: 192.0.2.1\`. A requisição passa por uma CDN (198.51.100.9) e pelo Nginx (10.0.0.5) até a aplicação:
      `),
      {
        type: 'table',
        head: ['Trecho', 'IP de origem da conexão', 'X-Forwarded-For recebido'],
        rows: [
          ['cliente → CDN', '203.0.113.7', '192.0.2.1 (forjado)'],
          ['CDN → Nginx', '198.51.100.9', '192.0.2.1, 203.0.113.7'],
          ['Nginx → aplicação', '10.0.0.5', '192.0.2.1, 203.0.113.7, 198.51.100.9'],
        ],
        caption: 'A aplicação junta a lista e o IP da conexão: [192.0.2.1, 203.0.113.7, 198.51.100.9, 10.0.0.5]. Da direita: 10.0.0.5 é o Nginx (nosso), 198.51.100.9 é a CDN (contratada por nós, então confiável), 203.0.113.7 não é nosso: é a cliente. O 192.0.2.1 nunca é considerado.',
      },
      info('Os endereços 192.0.2.0/24, 198.51.100.0/24 e 203.0.113.0/24 são reservados para documentação (RFC 5737), por isso aparecem nos exemplos: nunca são de ninguém de verdade.'),
    ],
    codigo: [
      py(`
        # Fila do banco com 3 caixas. Chega 1 cliente por minuto; a cada 3,
        # um vem pagar uma pilha de boletos e demora 6 minutos.
        duracoes = [6, 1, 1] * 6

        def simular(escolher):
            fins = [[], [], []]            # para cada caixa, o minuto em que cada cliente dele termina
            esperas = []
            for chegada, dur in enumerate(duracoes):
                ativos = [sum(1 for fim in f if fim > chegada) for f in fins]
                caixa = escolher(chegada, ativos)
                inicio = max([chegada] + fins[caixa])   # espera o caixa terminar o que já tem
                esperas.append(inicio - chegada)
                fins[caixa].append(inicio + dur)
            return sum(esperas) / len(esperas), max(esperas)

        def round_robin(chegada, ativos):
            return chegada % 3

        def menos_conexoes(chegada, ativos):
            return ativos.index(min(ativos))

        for nome, f in [("round robin", round_robin), ("menos conexões", menos_conexoes)]:
            media, pior = simular(f)
            print(f"{nome:15} espera média {media:4.1f} min, pior espera {pior} min")
      `),
      md('O round robin manda **todos** os clientes dos boletos para o caixa 1, porque o padrão de chegada coincide com o revezamento, e a fila dele só cresce. Menos conexões olha quem está livre e ninguém espera. Coincidências assim acontecem de verdade: um cliente que manda lotes de requisições, sempre a mesma pesada seguida de duas leves, faz o mesmo papel. Troque `duracoes` por `[6, 1, 1, 1] * 5` e veja o que muda.'),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e9-lb-1',
          kind: 'mcq',
          prompt: 'A loja quer mandar `/api/*` para um grupo de servidores e `/imagens/*` para outro, no mesmo domínio e na mesma porta 443 com HTTPS. Que tipo de balanceador consegue fazer isso?',
          difficulty: 'facil',
          skills: ['redes-sockets'],
          hints: [
            'Em que parte da comunicação aparece o caminho `/api/...`: no cabeçalho TCP ou dentro da requisição HTTP?',
            'Com HTTPS, quem consegue ler a requisição HTTP no meio do caminho?',
          ],
          explanation: 'O caminho só existe dentro da requisição HTTP, e com HTTPS ela vai cifrada. Só um balanceador de camada 7 que faz a terminação TLS consegue lê-la e decidir por caminho. Um de camada 4 vê apenas IPs e portas, que são os mesmos para as duas rotas.',
          options: [
            { text: 'Um balanceador de camada 4, separando pela porta', feedback: 'As duas rotas usam a mesma porta, 443. E a camada 4 nem enxerga o caminho: ele está dentro do HTTP, que além disso vai cifrado.' },
            { text: 'Um balanceador de camada 7 que termina o TLS', correct: true, feedback: 'Isso: ele decifra, lê a linha de requisição e escolhe o grupo de servidores pelo caminho.' },
            { text: 'DNS com vários IPs para o mesmo nome', feedback: 'O DNS resolve nomes, não caminhos: o navegador pergunta o IP de loja.exemplo.com.br, e não o de /api.' },
            { text: 'Qualquer um: todo balanceador enxerga a URL', feedback: 'Só quem entende HTTP (camada 7) enxerga a URL, e só depois de decifrar o TLS. Em camada 4, a URL é apenas parte dos bytes cifrados.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e9-lb-2',
          kind: 'predict',
          lang: 'python',
          prompt: 'A função acompanha um servidor com verificações de saúde ativas, usando limiares de subida (`rise`) e de queda (`fall`). Cada item é o resultado de uma verificação (True = respondeu bem). O que o programa imprime?',
          difficulty: 'intermediario',
          skills: ['redes-sockets'],
          hints: [
            'O contador `seguidos` conta o quê: falhas, sucessos, ou resultados que contradizem o estado atual?',
            'O que acontece com o contador quando chega um resultado que confirma o estado atual?',
            'Siga a lista à mão, anotando o estado e o contador depois de cada item. Quantas falhas seguidas acontecem antes do primeiro True que interrompe?',
          ],
          explanation: 'Começa no ar. Duas falhas (contador 2) e um sucesso zera o contador: ainda no ar. Depois, três falhas seguidas atingem fall = 3: "muda para DOWN". Fora do ar, um sucesso conta 1, mas a falha seguinte confirma o estado e zera. Os dois sucessos finais atingem rise = 2: "muda para UP". O retorno é True. Os limiares são o que impede o pisca-pisca: falhas e sucessos isolados não mudam nada.',
          code: dedent(`
            def acompanhar(resultados, rise=2, fall=3):
                no_ar = True
                seguidos = 0
                for r in resultados:
                    if r == no_ar:          # o resultado confirma o estado atual
                        seguidos = 0
                        continue
                    seguidos += 1
                    if (no_ar and seguidos == fall) or (not no_ar and seguidos == rise):
                        no_ar = not no_ar
                        seguidos = 0
                        print("muda para", "UP" if no_ar else "DOWN")
                return no_ar

            print(acompanhar([True, False, False, True, False, False, False, True, False, True, True]))
          `),
          answer: 'muda para DOWN\nmuda para UP\nTrue',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e9-lb-3',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Implemente a classe \`MenosConexoes\`, o coração de um balanceador "menos conexões":

            - \`MenosConexoes(servidores)\`: recebe a lista de nomes; todos começam saudáveis e com 0 conexões ativas.
            - \`abrir()\`: escolhe, **entre os saudáveis**, o que tem menos conexões ativas (empate: o que aparece primeiro na lista), soma 1 às conexões dele e devolve o nome. Se nenhum estiver saudável, levante \`RuntimeError\`.
            - \`fechar(nome)\`: uma conexão daquele servidor terminou.
            - \`marcar(nome, saudavel)\`: liga ou desliga o servidor. Um servidor doente não recebe conexões novas, mas as que ele já tem continuam contando e podem ser fechadas.
          `),
          difficulty: 'intermediario',
          skills: ['redes-sockets'],
          hints: [
            'Que informações você precisa guardar sobre cada servidor? Onde guardar a ordem original, que decide os empates?',
            'Em `abrir`, primeiro filtre quem pode receber. O que fazer se sobrar ninguém?',
            '`min` com `key=` devolve o primeiro dos empatados na ordem em que percorre os itens. Em que ordem você está percorrendo?',
            'Ao marcar um servidor como doente, as conexões dele devem ser zeradas?',
          ],
          explanation: 'Guarde a lista na ordem original, um dicionário de conexões ativas e um de saúde. `abrir` filtra os saudáveis, pega o mínimo (o `min` do Python devolve o primeiro empatado, o que dá o desempate pela ordem) e incrementa. Repare no último teste: um servidor que volta com 0 conexões recebe todas as novas até alcançar os outros. Num sistema real, isso pode derrubá-lo de novo logo após voltar, e por isso o HAProxy e o Envoy têm um "aquecimento" (slow start), que aumenta aos poucos a parte dele.',
          starter: dedent(`
            class MenosConexoes:
                def __init__(self, servidores):
                    # guarde a ordem, as conexões ativas e a saúde de cada servidor
                    pass

                def abrir(self):
                    # escolha o saudável com menos conexões (empate: o primeiro da lista)
                    pass

                def fechar(self, nome):
                    pass

                def marcar(self, nome, saudavel):
                    pass
          `),
          solution: dedent(`
            class MenosConexoes:
                def __init__(self, servidores):
                    self.ordem = list(servidores)
                    self.ativas = {s: 0 for s in self.ordem}
                    self.saudavel = {s: True for s in self.ordem}

                def abrir(self):
                    candidatos = [s for s in self.ordem if self.saudavel[s]]
                    if not candidatos:
                        raise RuntimeError("nenhum servidor saudável")
                    escolhido = min(candidatos, key=lambda s: self.ativas[s])
                    self.ativas[escolhido] += 1
                    return escolhido

                def fechar(self, nome):
                    self.ativas[nome] -= 1

                def marcar(self, nome, saudavel):
                    self.saudavel[nome] = saudavel
          `),
          tests: [
            {
              name: 'reveza quando todos estão iguais',
              code: 'b = MenosConexoes(["a", "b", "c"])\nr = [b.abrir() for _ in range(5)]\nassert r == ["a", "b", "c", "a", "b"], f"com todos empatados, vence o primeiro da lista: esperado [a, b, c, a, b]; veio {r}"',
            },
            {
              name: 'fechar libera o servidor',
              code: dedent(`
                b = MenosConexoes(["a", "b", "c"])
                for _ in range(6):
                    b.abrir()
                b.fechar("c")
                b.fechar("c")
                b.fechar("b")
                r = [b.abrir(), b.abrir(), b.abrir()]
                assert r == ["c", "b", "c"], f"depois de fechar 2 de c e 1 de b, as próximas devem ser c, b, c; veio {r}"
              `),
            },
            {
              name: 'servidor doente fica de fora, mas as conexões dele contam',
              code: dedent(`
                b = MenosConexoes(["a", "b"])
                b.abrir(); b.abrir(); b.abrir()          # a, b, a
                b.marcar("a", False)
                r = [b.abrir() for _ in range(3)]
                assert r == ["b", "b", "b"], f"com a doente, tudo vai para b; veio {r}"
                b.fechar("a"); b.fechar("a")
                b.marcar("a", True)
                r = [b.abrir() for _ in range(5)]
                assert r == ["a", "a", "a", "a", "a"], f"a voltou com 0 conexões e b tem 4: as 4 próximas vão para a, e a quinta empata (a vence pela ordem); veio {r}"
              `),
            },
            {
              name: 'nenhum saudável',
              code: dedent(`
                b = MenosConexoes(["a", "b"])
                b.marcar("a", False)
                b.marcar("b", False)
                try:
                    r = b.abrir()
                except RuntimeError:
                    pass
                else:
                    assert False, f"sem servidores saudáveis, abrir() deve levantar RuntimeError; devolveu {r!r}"
              `),
            },
            {
              name: 'sequências aleatórias',
              code: REF_LB + '\n' + dedent(`
                _rng = _random.Random(1994)
                for _ in range(200):
                    nomes = [f"s{i}" for i in range(_rng.randint(1, 5))]
                    b, ref = MenosConexoes(nomes), _RefMenos(nomes)
                    abertas = []
                    for passo in range(40):
                        x = _rng.random()
                        if x < 0.5:
                            try:
                                e = ref.abrir()
                            except RuntimeError:
                                try:
                                    r = b.abrir()
                                except RuntimeError:
                                    continue
                                assert False, f"no passo {passo}, sem saudáveis, abrir() deveria levantar RuntimeError; devolveu {r!r}"
                            r = b.abrir()
                            assert r == e, f"no passo {passo}, abrir() deveria escolher {e}; escolheu {r}"
                            abertas.append(e)
                        elif x < 0.8 and abertas:
                            n = abertas.pop(_rng.randrange(len(abertas)))
                            b.fechar(n)
                            ref.fechar(n)
                        else:
                            n, s = _rng.choice(nomes), _rng.random() < 0.6
                            b.marcar(n, s)
                            ref.marcar(n, s)
              `),
            },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e9-lb-4',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Escreva \`ip_do_cliente(xff, ip_conexao, confiaveis)\`, que descobre o IP real do cliente:

            - \`xff\`: o valor do cabeçalho \`X-Forwarded-For\` (IPs separados por vírgula, com ou sem espaços), ou \`""\`/\`None\` se ele não veio;
            - \`ip_conexao\`: o IP de quem abriu a conexão com a sua aplicação;
            - \`confiaveis\`: lista de redes dos **seus** proxies, em notação CIDR (como \`"10.0.0.0/8"\`).

            Monte a cadeia (os IPs do cabeçalho seguidos de \`ip_conexao\`), percorra-a **da direita para a esquerda** e devolva o primeiro IP que **não** pertence a nenhuma rede confiável, como texto, sem espaços. Se todos forem confiáveis, devolva o mais à esquerda. Todos os itens são IPs válidos (IPv4 ou IPv6).
          `),
          difficulty: 'intermediario',
          skills: ['redes-sockets', 'redes-tcpip'],
          hints: [
            'Se a conexão chegou de um IP que não é de um proxy seu, quem escreveu o cabeçalho X-Forwarded-For? Dá para acreditar nele?',
            'Como transformar "a, b ,c" numa lista limpa? E o caso de o cabeçalho não ter vindo?',
            'O módulo `ipaddress` tem `ip_address(...)` e `ip_network(...)`. Como se pergunta se um endereço está dentro de uma rede?',
            'Percorrer de trás para a frente: `reversed(lista)`. Em que momento você para?',
          ],
          explanation: dedent(`
            Cada proxy **acrescenta no fim** o IP de quem se conectou a ele, então, lendo da direita, cada item foi escrito por alguém em quem você confia, até chegar ao primeiro IP que não é de um proxy seu: esse foi visto por um proxy seu, que o anotou, e é o cliente. Tudo à esquerda dele foi o próprio cliente quem escreveu e pode ser inventado.

            O primeiro e o segundo testes derrubam as duas soluções erradas mais comuns: pegar o **primeiro** da lista (forjável) e confiar no cabeçalho mesmo quando a conexão não veio de um proxy seu. Frameworks fazem isso com configurações como o \`ProxyFix(x_for=N)\` do Werkzeug ou o \`set_real_ip_from\` + \`real_ip_recursive on\` do Nginx: em todas, você declara quantos proxies, ou quais, são seus.
          `),
          starter: dedent(`
            import ipaddress

            def ip_do_cliente(xff, ip_conexao, confiaveis):
                # monte a cadeia: IPs do cabeçalho + ip_conexao
                # percorra da direita para a esquerda, pulando os IPs das redes confiáveis
                pass
          `),
          solution: dedent(`
            import ipaddress

            def ip_do_cliente(xff, ip_conexao, confiaveis):
                redes = [ipaddress.ip_network(r) for r in confiaveis]
                cadeia = [p.strip() for p in (xff or "").split(",") if p.strip()]
                cadeia.append(ip_conexao)
                for ip in reversed(cadeia):
                    endereco = ipaddress.ip_address(ip)
                    if not any(endereco in rede for rede in redes):
                        return ip
                return cadeia[0]
          `),
          tests: [
            {
              name: 'sem proxy no caminho, o cabeçalho é ignorado',
              code: dedent(`
                r = ip_do_cliente("192.0.2.1", "203.0.113.7", ["10.0.0.0/8"])
                assert r == "203.0.113.7", f"a conexão veio direto de 203.0.113.7, que não é proxy seu: o cabeçalho foi escrito pelo próprio cliente; esperado 203.0.113.7, veio {r!r}"
                r = ip_do_cliente("", "203.0.113.7", ["10.0.0.0/8"])
                assert r == "203.0.113.7", f"sem cabeçalho, é o IP da conexão; veio {r!r}"
                r = ip_do_cliente(None, "203.0.113.7", ["10.0.0.0/8"])
                assert r == "203.0.113.7", f"xff=None: é o IP da conexão; veio {r!r}"
              `),
            },
            {
              name: 'o primeiro da lista pode ser forjado',
              code: dedent(`
                r = ip_do_cliente("192.0.2.1, 203.0.113.7, 198.51.100.9", "10.0.0.5", ["10.0.0.0/8", "198.51.100.0/24"])
                assert r == "203.0.113.7", f"é o exemplo da lição: 10.0.0.5 e 198.51.100.9 são seus, 203.0.113.7 não é. O 192.0.2.1 foi o cliente que escreveu. Veio {r!r}"
                r = ip_do_cliente("203.0.113.50, 203.0.113.7", "10.0.0.5", ["10.0.0.0/8"])
                assert r == "203.0.113.7", f"pare no primeiro não confiável vindo da direita, e não no primeiro vindo da esquerda; veio {r!r}"
              `),
            },
            {
              name: 'um proxy só e espaços irregulares',
              code: dedent(`
                r = ip_do_cliente("203.0.113.7", "10.0.0.5", ["10.0.0.0/8"])
                assert r == "203.0.113.7", f"veio {r!r}"
                r = ip_do_cliente("  203.0.113.7 ,10.0.0.9", "10.0.0.5", ["10.0.0.0/8"])
                assert r == "203.0.113.7", f"tire os espaços em volta de cada IP; veio {r!r}"
              `),
            },
            {
              name: 'tudo confiável e redes de um IP só',
              code: dedent(`
                r = ip_do_cliente("10.1.1.1, 10.2.2.2", "10.0.0.5", ["10.0.0.0/8"])
                assert r == "10.1.1.1", f"se todos forem confiáveis, devolva o mais à esquerda; veio {r!r}"
                r = ip_do_cliente(None, "10.0.0.5", ["10.0.0.0/8"])
                assert r == "10.0.0.5", f"sem cabeçalho e com a conexão vinda de um IP confiável, só sobra o IP da conexão; veio {r!r}"
                r = ip_do_cliente("172.16.5.5", "172.16.0.1", ["172.16.0.1/32"])
                assert r == "172.16.5.5", f"só 172.16.0.1 é confiável (/32); 172.16.5.5 é o cliente; veio {r!r}"
              `),
            },
            {
              name: 'IPv6',
              code: dedent(`
                r = ip_do_cliente("2001:db8::1", "fd00::5", ["fd00::/8", "10.0.0.0/8"])
                assert r == "2001:db8::1", f"veio {r!r}"
                r = ip_do_cliente("2001:db8::1, 198.51.100.9", "fd00::5", ["fd00::/8", "198.51.100.0/24"])
                assert r == "2001:db8::1", f"cadeias podem misturar IPv4 e IPv6; veio {r!r}"
              `),
            },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e9-lb-5',
          kind: 'mcq',
          prompt: 'O proxy repassou um `POST /pagamentos` (um Pix de R$ 150) ao servidor A, que não respondeu dentro do tempo limite de leitura. O que o proxy deveria fazer?',
          difficulty: 'intermediario',
          skills: ['redes-sockets'],
          hints: [
            'Quando o tempo limite estoura, o proxy sabe se o servidor A processou o pagamento ou não?',
            'O que acontece se essa requisição for executada duas vezes? E se fosse um GET?',
          ],
          explanation: 'Timeout só diz que a resposta não chegou a tempo: A pode ter debitado e travado logo depois. POST não é idempotente, então o proxy não deve repeti-lo sozinho (o Nginx, desde a 1.9.13, não faz isso por padrão). Ele devolve um erro (504 Gateway Timeout), e a repetição fica com o cliente, usando uma chave de idempotência que permite ao servidor reconhecer que é o mesmo pagamento.',
          options: [
            { text: 'Reenviar na hora ao servidor B, porque A provavelmente caiu', feedback: 'Timeout não prova que A não processou. Se A debitou e só demorou a responder, B debita de novo: Pix em dobro.' },
            { text: 'Devolver erro (504) e deixar a repetição para o cliente, com uma chave de idempotência', correct: true, feedback: 'Isso. Só quem tem a chave de idempotência pode repetir com segurança, porque o servidor reconhece que é o mesmo pagamento.' },
            { text: 'Reenviar ao próprio A até ele responder', feedback: 'Mesmo problema da cobrança duplicada, e ainda insiste num servidor que já está lento: repetições em série pioram a sobrecarga.' },
            { text: 'Repetir como GET, que é idempotente', feedback: 'Trocar o método muda o significado da requisição: um GET em /pagamentos consulta, não paga. Idempotência é propriedade da operação, não um disfarce.' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e9-lb-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Implemente o **round robin ponderado suave** do Nginx na classe \`RoundRobinSuave\`:

            - \`RoundRobinSuave(pesos)\`: \`pesos\` é um dicionário \`nome → peso\` (inteiros ≥ 1), na ordem dos servidores. Cada servidor tem também um **peso atual**, que começa em 0.
            - \`escolher()\`: considerando **só os saudáveis**, (1) some a cada um o seu peso ao peso atual; (2) escolha o de maior peso atual (empate: o primeiro na ordem); (3) subtraia do escolhido a soma dos pesos dos saudáveis; (4) devolva o nome. Sem nenhum saudável, levante \`RuntimeError\`.
            - \`marcar(nome, saudavel)\`: liga ou desliga o servidor. Quando a saúde dele **muda**, o peso atual dele volta a 0.

            Com pesos \`{"a": 5, "b": 1, "c": 1}\`, sete escolhas dão \`a, a, b, a, c, a, a\`: as mesmas proporções do ingênuo \`a, a, a, a, a, b, c\`, mas intercaladas.
          `),
          difficulty: 'desafio',
          skills: ['redes-sockets'],
          hints: [
            'Que estado cada servidor carrega entre uma chamada e a próxima? Monte os dicionários no construtor.',
            'Faça à mão as três primeiras escolhas com 5, 1, 1: quais são os pesos atuais depois de cada passo?',
            'A soma que você subtrai é de todos os pesos ou só dos servidores saudáveis? E a soma de pesos atual, quanto dá depois de cada escolha quando todos estão saudáveis?',
            'Na escolha do maior, um `>` estrito ou um `>=` decide quem vence o empate. Qual dá "o primeiro na ordem"?',
            'Em `marcar`, compare a saúde nova com a antiga antes de zerar: marcar como saudável quem já estava saudável não pode mexer no peso atual.',
          ],
          explanation: dedent(`
            A cada escolha, o total dos pesos dos saudáveis é distribuído (cada um ganha o seu peso) e depois retirado inteiro do escolhido; com todos saudáveis, a soma dos pesos atuais volta a 0 depois de cada escolha. Quem tem peso maior acumula mais rápido e vence mais vezes, mas, ao vencer, cai bem abaixo dos outros e dá a vez. Em 7 escolhas com 5, 1, 1, o "a" vence 5 vezes, mas nunca mais de duas seguidas dentro do ciclo.

            O núcleo (passos 1 a 3) é exatamente o algoritmo do módulo upstream do Nginx (o \`current_weight\` e o \`effective_weight\` do código-fonte; o \`effective_weight\` ainda diminui temporariamente o peso de servidores que falham). Zerar o peso atual quando a saúde muda é uma simplificação deste exercício: o Nginx apenas pula o servidor indisponível, sem mexer no peso atual dele. A versão ingênua manda rajadas de 5 requisições seguidas para o mesmo servidor, o que, com conexões caras de abrir, sobrecarrega uma máquina enquanto as outras ficam paradas.
          `),
          starter: dedent(`
            class RoundRobinSuave:
                def __init__(self, pesos):
                    # guarde os pesos, o peso atual (começa em 0) e a saúde de cada servidor
                    pass

                def escolher(self):
                    # 1. some o peso de cada saudável ao seu peso atual
                    # 2. escolha o de maior peso atual (empate: o primeiro)
                    # 3. subtraia do escolhido a soma dos pesos dos saudáveis
                    pass

                def marcar(self, nome, saudavel):
                    pass
          `),
          solution: dedent(`
            class RoundRobinSuave:
                def __init__(self, pesos):
                    self.pesos = dict(pesos)
                    self.atual = {s: 0 for s in self.pesos}
                    self.saudavel = {s: True for s in self.pesos}

                def escolher(self):
                    vivos = [s for s in self.pesos if self.saudavel[s]]
                    if not vivos:
                        raise RuntimeError("nenhum servidor saudável")
                    total = 0
                    melhor = None
                    for s in vivos:
                        self.atual[s] += self.pesos[s]
                        total += self.pesos[s]
                        if melhor is None or self.atual[s] > self.atual[melhor]:
                            melhor = s
                    self.atual[melhor] -= total
                    return melhor

                def marcar(self, nome, saudavel):
                    if self.saudavel[nome] != saudavel:
                        self.atual[nome] = 0
                    self.saudavel[nome] = saudavel
          `),
          tests: [
            {
              name: 'a sequência do Nginx',
              code: dedent(`
                rr = RoundRobinSuave({"a": 5, "b": 1, "c": 1})
                r = [rr.escolher() for _ in range(14)]
                esperado = ["a", "a", "b", "a", "c", "a", "a"] * 2
                assert r == esperado, f"com pesos 5, 1, 1 a sequência é a a b a c a a (e se repete); veio {r}"
              `),
            },
            {
              name: 'proporções',
              code: dedent(`
                rr = RoundRobinSuave({"x": 3, "y": 2, "z": 1})
                r = [rr.escolher() for _ in range(600)]
                cont = {s: r.count(s) for s in "xyz"}
                assert cont == {"x": 300, "y": 200, "z": 100}, f"em 600 escolhas com pesos 3, 2, 1, esperado 300, 200, 100; veio {cont}"
                assert r[:6] == ["x", "y", "x", "z", "y", "x"], f"as 6 primeiras deveriam ser x y x z y x; vieram {r[:6]}"
              `),
            },
            {
              name: 'um servidor só e pesos iguais',
              code: dedent(`
                rr = RoundRobinSuave({"único": 4})
                assert [rr.escolher() for _ in range(3)] == ["único"] * 3
                rr = RoundRobinSuave({"a": 1, "b": 1, "c": 1})
                r = [rr.escolher() for _ in range(6)]
                assert r == ["a", "b", "c", "a", "b", "c"], f"pesos iguais viram round robin comum; veio {r}"
              `),
            },
            {
              name: 'servidor fora da rotação',
              code: dedent(`
                rr = RoundRobinSuave({"a": 2, "b": 1})
                assert rr.escolher() == "a"
                rr.marcar("a", False)
                r = [rr.escolher() for _ in range(3)]
                assert r == ["b", "b", "b"], f"com a fora, só b; veio {r}"
                rr.marcar("b", True)
                rr.marcar("a", True)
                r = [rr.escolher() for _ in range(6)]
                assert r == ["a", "b", "a", "a", "b", "a"], f"a voltou com peso atual 0, e marcar b como saudável (ele já estava) não mexe no peso atual dele; veio {r}"
                rr.marcar("a", False)
                rr.marcar("b", False)
                try:
                    x = rr.escolher()
                except RuntimeError:
                    pass
                else:
                    assert False, f"sem saudáveis, escolher() deve levantar RuntimeError; devolveu {x!r}"
              `),
            },
            {
              name: 'sequências aleatórias',
              code: REF_LB + '\n' + dedent(`
                _rng = _random.Random(2001)
                for _ in range(200):
                    pesos = {f"s{i}": _rng.randint(1, 6) for i in range(_rng.randint(1, 5))}
                    rr, ref = RoundRobinSuave(pesos), _RefSuave(pesos)
                    for passo in range(40):
                        if _rng.random() < 0.15:
                            n, s = _rng.choice(list(pesos)), _rng.random() < 0.6
                            rr.marcar(n, s)
                            ref.marcar(n, s)
                            continue
                        try:
                            e = ref.escolher()
                        except RuntimeError:
                            try:
                                x = rr.escolher()
                            except RuntimeError:
                                continue
                            assert False, f"sem saudáveis, escolher() deveria levantar RuntimeError; devolveu {x!r}"
                        x = rr.escolher()
                        assert x == e, f"pesos {pesos}, passo {passo}: esperado {e}, veio {x}"
              `),
            },
          ],
        },
      },
    ],
    revisao: [
      md(`
        - Proxy direto serve os clientes; proxy reverso serve os servidores e é a porta de entrada do sistema.
        - Camada 4 decide por conexão, só com IPs e portas; camada 7 termina a conexão (e o TLS), entende HTTP e decide por requisição.
        - Algoritmos: round robin (iguais), ponderado (máquinas diferentes; a versão suave intercala), menos conexões (durações variadas, conexões longas), dois aleatórios (vários balanceadores), hash (afinidade; prefira hash consistente).
        - Saúde: verificações ativas com limiares de subida e de queda; passivas pelo tráfego real; cuidado com \`/saude\` que depende do banco.
        - Prefira servidores sem estado; com conexões longas, drene no deploy e faça os clientes reconectarem com espera exponencial e variação aleatória.
        - IP do cliente: leia o X-Forwarded-For da direita para a esquerda, pulando só os seus proxies.
        - Proxy só repete requisições idempotentes; pagamentos usam chave de idempotência.
      `),
      english(`
        **Vocabulary:** *reverse proxy*, *upstream*, *backend pool*, *health check*, *rise/fall thresholds*, *sticky sessions*, *connection draining*, *TLS termination*, *retry budget*, *thundering herd*, *exponential backoff with jitter*.

        Typical system design interview prompt: *"Your service runs on three instances behind a load balancer. One instance becomes slow but keeps answering health checks. What happens to your users, and how would you detect it?"* A strong answer mentions least-request or power-of-two-choices balancing, passive health checks (outlier detection) and latency percentiles, not just averages.
      `),
    ],
  },
  review: [
    ['Qual a diferença entre proxy direto e proxy reverso?', 'O direto age em nome dos clientes (proxy da empresa); o reverso age em nome dos servidores, recebendo as conexões e repassando ao grupo de servidores.'],
    ['O que um balanceador de camada 7 consegue fazer que um de camada 4 não consegue?', 'Ler a requisição HTTP (depois de terminar o TLS) e decidir por requisição: rotear por caminho, domínio ou cabeçalho, reescrever, fazer cache, repetir.'],
    ['Por que round robin vai mal quando as requisições têm durações muito diferentes?', 'Ele ignora a carga real: um servidor com requisições lentas continua recebendo a mesma parte e a fila dele cresce. Menos conexões olha quem está livre.'],
    ['Como achar o IP real do cliente no X-Forwarded-For?', 'Juntar a lista com o IP da conexão e percorrer da direita para a esquerda, pulando os seus proxies; o primeiro que não é seu é o cliente. O começo da lista pode ser forjado.'],
    ['Para que servem os limiares rise e fall numa verificação de saúde?', 'Para só tirar um servidor depois de várias falhas seguidas e só devolvê-lo depois de vários sucessos seguidos, evitando o pisca-pisca.'],
    ['Por que um proxy não deve repetir sozinho um POST que estourou o tempo limite?', 'Timeout não prova que o servidor não processou; repetir pode duplicar o efeito (um Pix cobrado duas vezes). Só operações idempotentes, ou com chave de idempotência.'],
    ['Por que os clientes devem reconectar com espera exponencial e variação aleatória?', 'Para que milhares de clientes derrubados ao mesmo tempo (num deploy, por exemplo) não voltem todos no mesmo instante e derrubem o próximo servidor.'],
  ],
  references: ['kurose-ross', 'google-sre', 'rfc9110', 'cloudflare-learning', 'twelve-factor'],
});

export const lessons: Lesson[] = [websockets, balanceamento];
