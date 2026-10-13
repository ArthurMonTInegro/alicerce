/** Lições adicionais do módulo m9-2 (dns, http(s) e tls). */
import type { Lesson } from '../../types.ts';
import { code, dedent, deep, english, lesson, md, py, t, tip, warn } from '../../helpers.ts';

/* ------------------------------------------------------------------ */
/* HTTP por dentro: enquadramento do 1.1, quadros do HTTP/2 e HTTP/3    */
/* ------------------------------------------------------------------ */

/** Gerador de fluxos HTTP/1.1 aleatórios (com a resposta esperada) para os testes do desafio. */
const GERA_HTTP = dedent(`
  import random as _random
  _CRLF = "\\r\\n"

  def _resp(status, campos, corpo=""):
      return f"HTTP/1.1 {status} Motivo" + _CRLF + "".join(c + _CRLF for c in campos) + _CRLF + corpo

  def _gera(rng):
      partes, metodos, esperado = [], [], []
      n = rng.randint(1, 5)
      for i in range(n):
          ultimo = i == n - 1
          metodo = rng.choice(["GET", "GET", "POST", "HEAD"])
          metodos.append(metodo)
          if rng.random() < 0.2:
              partes.append(_resp(100, []))
              esperado.append((100, ""))
          status = rng.choice([200, 200, 201, 204, 304, 404, 500])
          corpo = "".join(rng.choice("abcxyz0123 -;:") for _ in range(rng.randint(0, 40)))
          sem_corpo = metodo == "HEAD" or status in (204, 304)
          campos = ["Content-Type: text/plain"]
          modos = ["cl"] if sem_corpo else ["cl", "chunked"] + (["close"] if ultimo else [])
          modo = rng.choice(modos)
          if modo == "cl":
              nome = rng.choice(["Content-Length", "content-length", "CONTENT-LENGTH"])
              campos.append(f"{nome}:{rng.choice(['', ' ', '  '])}{len(corpo)}")
              texto = "" if sem_corpo else corpo
          elif modo == "chunked":
              campos.append(rng.choice(["Transfer-Encoding: chunked", "transfer-encoding: chunked"]))
              if rng.random() < 0.3:
                  campos.append(f"Content-Length: {rng.randint(0, 99)}")
              texto, j = "", 0
              while j < len(corpo):
                  k = rng.randint(1, 12)
                  pedaco = corpo[j:j + k]
                  texto += format(len(pedaco), rng.choice(["x", "X"])) + rng.choice(["", "", ";v=1"]) + _CRLF + pedaco + _CRLF
                  j += k
              texto += "0" + _CRLF
              if rng.random() < 0.3:
                  texto += "X-Soma: 42" + _CRLF
              texto += _CRLF
          else:
              texto = corpo
          partes.append(_resp(status, campos, texto))
          esperado.append((status, "" if sem_corpo else corpo))
      return "".join(partes), metodos, esperado

  def _confere(fluxo, metodos, esperado, dica=""):
      r = separar(fluxo, list(metodos))
      assert r is not None, "separar devolveu None: devolva a lista de (status, corpo)"
      r = [tuple(x) for x in r]
      assert r == esperado, f"separar({fluxo!r}, {metodos}) devolveu {r}, esperado {esperado}. {dica}"

  def _falha(fluxo, metodos, dica):
      try:
          r = separar(fluxo, list(metodos))
      except ValueError:
          return
      assert False, f"separar({fluxo!r}, {metodos}) devolveu {r}; esperado ValueError: {dica}"
`);

const httpVersoes = lesson({
  id: 'l9-http-versoes',
  moduleId: 'm9-2',
  title: 'HTTP por dentro: as mensagens do 1.1, os quadros do HTTP/2 e o HTTP/3',
  titleEn: 'HTTP in depth: HTTP/1.1 messages, HTTP/2 frames and HTTP/3',
  summary: 'A semântica do HTTP (métodos, status, cabeçalhos) é a mesma nas três versões; o que muda é o enquadramento. Como o HTTP/1.1 decide onde o corpo acaba (Content-Length, chunked, fechar a conexão), por que o pipelining não pegou, como o HTTP/2 corta tudo em quadros binários com fluxos multiplexados e comprime cabeçalhos com o HPACK, e o que o HTTP/3 delega ao QUIC e por que precisou do QPACK.',
  minutes: 50,
  objectives: [
    'Separar a semântica do HTTP (RFC 9110) do enquadramento de cada versão (RFC 9112, 9113 e 9114)',
    'Aplicar a regra do HTTP/1.1 para achar o fim do corpo: sem corpo, chunked, Content-Length ou fechar a conexão',
    'Decodificar uma resposta chunked e explicar por que esse formato existe',
    'Ler o cabeçalho de 9 bytes de um quadro HTTP/2 e explicar fluxos, IDs ímpares, END_STREAM e RST_STREAM',
    'Explicar como o HPACK comprime cabeçalhos com tabelas estática e dinâmica, e por que o HTTP/3 trocou o HPACK pelo QPACK',
    'Dizer como o navegador descobre que um site fala HTTP/3 (Alt-Svc e o registro DNS HTTPS)',
  ],
  skills: ['redes-dns-tls', 'web-http-api'],
  terms: [
    t('enquadramento', 'framing', 'A regra que diz onde cada mensagem começa e termina dentro de um fluxo de bytes.', 'HTTP/1.1 message framing relies on Content-Length or the chunked transfer coding.'),
    t('conexão persistente', 'persistent connection (keep-alive)', 'Conexão TCP reaproveitada para várias requisições seguidas; é o padrão no HTTP/1.1.'),
    t('encadeamento de requisições', 'HTTP pipelining', 'Mandar várias requisições sem esperar as respostas; as respostas precisam voltar na mesma ordem. Na prática, ficou desligado nos navegadores.'),
    t('codificação em pedaços', 'chunked transfer coding', 'Corpo enviado em pedaços, cada um precedido do tamanho em hexadecimal; um pedaço de tamanho 0 marca o fim.', 'Transfer-Encoding: chunked'),
    t('contrabando de requisições', 'HTTP request smuggling', 'Ataque que explora dois servidores (proxy e back-end) discordando sobre onde uma requisição termina.'),
    t('quadro', 'frame', 'A unidade do HTTP/2 e do HTTP/3: um cabeçalho curto (tipo e tamanho; no HTTP/2, também flags e o ID do fluxo) seguido do conteúdo.'),
    t('fluxo', 'stream', 'Sequência de quadros de uma mesma troca requisição/resposta dentro da conexão, identificada por um número.', 'Each HTTP/2 request is sent on a new stream with an odd stream identifier.'),
    t('multiplexação', 'multiplexing', 'Intercalar quadros de vários fluxos numa mesma conexão, sem que um tenha de esperar o outro terminar.'),
    t('pseudocabeçalho', 'pseudo-header field', 'Campo que começa com ":" e substitui a linha inicial do HTTP/1.1: :method, :scheme, :authority, :path e :status.'),
    t('compressão de cabeçalhos', 'header compression (HPACK, QPACK)', 'Trocar campos repetidos por índices em tabelas compartilhadas entre os dois lados.'),
    t('tabela dinâmica', 'dynamic table', 'Tabela do HPACK/QPACK que guarda campos já enviados na conexão, com tamanho limitado; os mais antigos saem primeiro.'),
    t('serviço alternativo', 'alternative service (Alt-Svc)', 'Cabeçalho em que o servidor anuncia que o mesmo site também atende por outro protocolo ou porta.', 'Alt-Svc: h3=":443"; ma=86400'),
  ],
  stages: {
    conceito: [
      md(`
        No nível 6 você usou métodos, códigos de status e cabeçalhos. Uma coisa que pouca gente percebe: **tudo isso é igual no HTTP/1.1, no HTTP/2 e no HTTP/3**. GET continua GET, 404 continua 404, \`Cache-Control\` continua \`Cache-Control\`. Essa parte é a **semântica**, descrita numa RFC só (a 9110). O que mudou de uma versão para outra é como a mensagem vira bytes: o {{enquadramento|framing}}, com uma RFC por versão (9112, 9113 e 9114).

        Cada versão responde de um jeito a três perguntas:

        1. **Onde termina uma mensagem?** Quem lê um fluxo de bytes precisa saber onde acaba uma resposta e começa a próxima.
        2. **Quantas requisições andam ao mesmo tempo numa conexão?**
        3. **Quanto custam os cabeçalhos repetidos?** Cookie, User-Agent e Accept vão em todas as requisições.

        Entender essas respostas explica coisas práticas: por que o navegador abria 6 conexões por site, por que juntar todos os ícones numa imagem só (os *sprites*) deixou de ajudar, como um proxy mal configurado vira falha de segurança, e por que o HTTP/3 não pôde simplesmente reaproveitar a compressão do HTTP/2.
      `),
    ],
    explicacao: [
      md(`
        ### HTTP/1.1: texto, e a pergunta "onde acaba?"
        Uma mensagem HTTP/1.1 é texto: uma linha inicial (\`GET /boleto HTTP/1.1\` ou \`HTTP/1.1 200 OK\`), os campos de cabeçalho (\`Nome: valor\`), uma **linha vazia** e o corpo. Toda linha termina em CRLF (\`\\r\\n\`). Os nomes dos campos não diferenciam maiúsculas de minúsculas, e o \`Host\` é obrigatório: um mesmo IP atende muitos sites, e é ele que diz qual site você quer.

        A linha vazia marca o fim do **cabeçalho**, não do corpo: o corpo pode ter linhas vazias, ou ser binário. Para achar o fim do corpo, a RFC 9112 (seção 6.3) define uma ordem de regras, e a primeira que se aplica vence:
      `),
      {
        type: 'table',
        head: ['Situação', 'Tamanho do corpo'],
        rows: [
          ['resposta a um HEAD, ou status 1xx, 204 ou 304', 'nenhum, **mesmo que venha um Content-Length** (no HEAD e no 304 ele descreve o corpo que um GET teria)'],
          ['`Transfer-Encoding` terminando em `chunked`', 'pedaços, até o pedaço de tamanho 0 (se também houver `Content-Length`, ele é ignorado)'],
          ['`Content-Length: n`', 'exatamente n bytes'],
          ['resposta sem nenhum dos dois', 'tudo até o servidor fechar a conexão'],
          ['requisição sem nenhum dos dois', 'corpo vazio'],
        ],
        caption: 'A ordem das regras de tamanho do corpo no HTTP/1.1 (RFC 9112, seção 6.3), simplificada.',
      },
      md(`
        A {{codificação em pedaços|chunked transfer coding}} existe porque muitas respostas são geradas enquanto são enviadas (um relatório que sai do banco aos poucos, um log ao vivo, a resposta de um assistente de IA aparecendo palavra por palavra) e o servidor não sabe o tamanho total quando começa. Sem ela, a única forma de dizer "acabou" seria fechar a conexão. O formato: o tamanho do pedaço **em hexadecimal**, CRLF, os bytes, CRLF; repete; no fim, \`0\`, CRLF, campos opcionais de *trailer* e uma linha vazia. Depois do tamanho pode vir uma extensão (\`1a;nome=valor\`), que quem não conhece ignora.

        **Conexões persistentes.** No HTTP/1.0, cada resposta fechava a conexão. No HTTP/1.1, a {{conexão persistente|persistent connection (keep-alive)}} é o padrão: a conexão fica aberta para a próxima requisição (até alguém mandar \`Connection: close\`), poupando o handshake do TCP e o do TLS a cada pedido. É justamente por isso que o enquadramento importa: numa conexão reaproveitada, errar o fim de uma resposta é ler o começo da próxima como se fosse corpo.

        **Uma requisição por vez.** O HTTP/1.1 até permite o {{encadeamento de requisições|HTTP pipelining}}: mandar três GETs sem esperar. Mas as respostas têm de voltar **na ordem** dos pedidos, então uma resposta lenta segura as rápidas que vêm atrás. É o {{bloqueio de cabeça de fila|head-of-line blocking}} que você viu no TCP, agora na aplicação. Somado a proxies que tratavam mal o pipelining, o resultado foi que os navegadores nunca o ligaram por padrão. Para carregar várias coisas ao mesmo tempo, eles abrem **conexões paralelas**, até 6 por origem no Chrome e no Firefox, e os sites criaram gambiarras para caber nisso: juntar CSS e JavaScript num arquivo só, juntar ícones num *sprite*, espalhar arquivos por vários subdomínios (\`static1.\`, \`static2.\`...) para ganhar mais 6 conexões em cada um.
      `),
      warn(`
        Quando um proxy (ou CDN) e o servidor de trás discordam sobre onde uma requisição termina, um atacante consegue "esconder" uma segunda requisição dentro do corpo da primeira: o proxy vê uma, o back-end vê duas, e a segunda pode acabar respondida para outro usuário. É o {{contrabando de requisições|HTTP request smuggling}}. O caso clássico é uma requisição com \`Content-Length\` **e** \`Transfer-Encoding: chunked\`, em que um lado usa um e o outro usa o outro. Por isso a RFC 9112 manda o \`Transfer-Encoding\` prevalecer, permite rejeitar a mensagem e exige fechar a conexão depois de responder. Não escreva o próprio parser de HTTP para produção; use o do servidor ou do framework, que já trata esses casos.
      `, 'Discordar sobre o fim é uma falha de segurança'),
      md(`
        ### HTTP/2: quadros binários e fluxos
        O HTTP/2 (RFC 9113) mantém a semântica e troca o texto por {{quadros|frame}} binários. Todo quadro começa com um cabeçalho fixo de **9 bytes**:
      `),
      {
        type: 'table',
        head: ['Campo', 'Tamanho', 'O que diz'],
        rows: [
          ['Length', '24 bits', 'quantos bytes de conteúdo vêm depois do cabeçalho (até 16.384 por padrão; dá para negociar mais)'],
          ['Type', '8 bits', 'o tipo: DATA (0), HEADERS (1), RST_STREAM (3), SETTINGS (4), PING (6), GOAWAY (7), WINDOW_UPDATE (8)...'],
          ['Flags', '8 bits', 'bits com significado por tipo: END_STREAM (0x1) e END_HEADERS (0x4) são os mais comuns'],
          ['R + Stream Identifier', '1 + 31 bits', 'um bit reservado, que se ignora, e o número do fluxo a que o quadro pertence'],
        ],
        caption: 'O cabeçalho de quadro do HTTP/2, em ordem de rede (big-endian).',
      },
      md(`
        Cada par requisição/resposta é um {{fluxo|stream}} com um número. O cliente usa números **ímpares** e crescentes (1, 3, 5...), nunca reaproveitados; o fluxo **0** é a própria conexão, por onde passam SETTINGS, PING e GOAWAY. O fim de uma mensagem é a flag **END_STREAM** no último quadro: não existe mais \`Content-Length\` como regra de enquadramento nem \`chunked\` (que é proibido no HTTP/2). A linha inicial vira {{pseudocabeçalhos|pseudo-header field}}: \`:method\`, \`:scheme\`, \`:authority\` (o antigo Host) e \`:path\` na requisição, \`:status\` na resposta. Os nomes dos campos vão sempre em minúsculas, e os campos que só faziam sentido para a conexão do HTTP/1.1 (\`Connection\`, \`Keep-Alive\`, \`Transfer-Encoding\`) são proibidos.

        Como cada quadro diz a que fluxo pertence, quadros de fluxos diferentes podem ser **intercalados** numa única conexão TCP: é a {{multiplexação|multiplexing}}. Uma resposta lenta não segura mais as outras no nível do HTTP, e cancelar um download é mandar um RST_STREAM naquele fluxo, sem derrubar a conexão (no HTTP/1.1, o único jeito de cancelar no meio é fechar a conexão). Cada fluxo tem o próprio controle de fluxo, com quadros WINDOW_UPDATE, para um download grande não ocupar todo o buffer do outro lado.

        Com uma conexão só, as gambiarras do HTTP/1.1 viram prejuízo: espalhar arquivos por subdomínios obriga a abrir novas conexões (novos handshakes) e atrapalha a priorização; juntar tudo num arquivo enorme invalida o cache inteiro quando um ícone muda.

        **HPACK: comprimir os cabeçalhos.** Uma página faz dezenas de requisições ao mesmo site, e cada uma repete centenas de bytes de cabeçalho (Cookie, User-Agent, Accept...). O HPACK (RFC 7541) troca campos por índices em duas tabelas que os dois lados mantêm iguais:

        - a **tabela estática**, fixa, com 61 entradas comuns: o índice 2 é \`:method: GET\`, o 4 é \`:path: /\`, o 7 é \`:scheme: https\`, o 8 é \`:status: 200\`;
        - a {{tabela dinâmica|dynamic table}}, que começa vazia e recebe os campos que o remetente pede para guardar. A entrada mais nova fica no índice 62 e empurra as outras para 63, 64... Cada entrada custa \`len(nome) + len(valor) + 32\` bytes, e a tabela tem um teto (4.096 bytes por padrão): quando passa, saem as **mais antigas**.

        A partir da segunda requisição, o Cookie de 300 bytes vira **um byte** com o índice dele. Valores novos ainda podem ir com um código de Huffman fixo, que encurta texto comum.
      `),
      deep(`
        Por que não comprimir os cabeçalhos com o deflate (o algoritmo do gzip), como o SPDY (o antecessor do HTTP/2) fazia? Por causa do ataque CRIME (2012). Quando um segredo (o cookie de sessão) é comprimido junto com texto que o atacante controla (o caminho de uma requisição que ele faz o navegador da vítima disparar), o tamanho do resultado cifrado encolhe quando o palpite do atacante acerta um pedaço do segredo. Medindo tamanhos, ele adivinha o cookie caractere por caractere. O HPACK só reaproveita **campos inteiros** (acertar metade de um cookie não encolhe nada) e permite marcar campos sensíveis como "nunca indexar".
      `, 'Por que um formato novo, e não gzip'),
      md(`
        Duas promessas do HTTP/2 não vingaram. A **árvore de prioridades** original foi pouco e mal implementada; a RFC 9113 a tornou obsoleta, e hoje se usa o esquema simples da RFC 9218 (cabeçalho \`Priority: u=0\` a \`u=7\`, de mais a menos urgente). O **server push**, em que o servidor mandava arquivos antes de serem pedidos, quase sempre empurrava o que o navegador já tinha em cache; o Chrome o removeu em 2022. No lugar dele entrou a resposta provisória **103 Early Hints**, que só sugere ao navegador o que ele vai precisar.

        Nos navegadores, o HTTP/2 só é usado com TLS: a escolha entre \`h2\` e \`http/1.1\` acontece dentro do handshake do TLS, sem custar um RTT a mais (o mecanismo, ALPN, está na próxima lição).
      `),
      deep(`
        Em outubro de 2023, Google, Cloudflare e AWS relataram os maiores ataques de negação de serviço já vistos até então (o Google mediu 398 milhões de requisições por segundo), todos com a mesma técnica, a **HTTP/2 Rapid Reset** (CVE-2023-44487). O atacante abre um fluxo com HEADERS e o cancela na hora com RST_STREAM, milhares de vezes por conexão. O limite de fluxos simultâneos não ajudava, porque um fluxo cancelado deixa de contar, mas o servidor já tinha começado a trabalhar em cada requisição. A correção foi limitar a taxa de cancelamentos por conexão. A lição de projeto: todo recurso barato para o cliente e caro para o servidor vira vetor de ataque.
      `, 'Rapid Reset: quando cancelar é o ataque'),
      md(`
        ### HTTP/3: o HTTP/2 refeito sobre o QUIC
        A multiplexação do HTTP/2 tem um limite que você já conhece da lição de TCP: os quadros de todos os fluxos viajam num **único fluxo de bytes TCP**, então um pacote perdido segura todos eles. O HTTP/3 (RFC 9114) roda sobre o QUIC, e o mapeamento fica mais simples: cada requisição usa um fluxo bidirecional do **próprio QUIC**. Como o QUIC já numera os fluxos, entrega cada um em ordem, faz controle de fluxo e marca o fim (com o bit FIN), os quadros do HTTP/3 perderam o ID de fluxo e quadros como WINDOW_UPDATE e RST_STREAM. Sobraram basicamente HEADERS e DATA nos fluxos de requisição, e SETTINGS e GOAWAY num fluxo de controle unidirecional.

        **Por que o HPACK não serviu.** O HPACK supõe que os blocos de cabeçalho são lidos **exatamente na ordem em que foram enviados**: a inserção na tabela dinâmica vai no meio de um bloco, e o bloco seguinte pode usar o índice novo. No TCP, a ordem é garantida. No QUIC, os fluxos são independentes: a requisição do fluxo 8, que usa a entrada "62", pode chegar antes da requisição do fluxo 4, que a criou. Esperar pelo fluxo 4 traria de volta o bloqueio de cabeça de fila que o QUIC acabou de eliminar. O **QPACK** (RFC 9204) resolve isso tirando as inserções do caminho: elas vão por um fluxo unidirecional próprio (o *encoder stream*), cada bloco de cabeçalho diz quantas inserções precisa já ter visto, e o codificador escolhe entre usar uma entrada ainda não confirmada (arriscando bloquear aquele fluxo, até um limite negociado) ou só entradas já confirmadas pelo outro lado. A tabela estática do QPACK tem 99 entradas.

        **Como o navegador descobre o HTTP/3.** A URL \`https://\` não diz a versão. Na primeira visita, o navegador costuma ir por TCP (HTTP/2) e o servidor anuncia, com o cabeçalho de {{serviço alternativo|alternative service (Alt-Svc)}}, \`Alt-Svc: h3=":443"; ma=86400\`: "também falo HTTP/3 na porta 443 UDP; lembre disso por um dia". Nas próximas, o navegador tenta o QUIC. O jeito mais novo é o registro DNS **HTTPS** (RFC 9460), consultado junto com o A/AAAA: \`loja.exemplo.com.br. 300 IN HTTPS 1 . alpn="h3,h2"\` avisa antes mesmo da primeira conexão. Se o UDP estiver bloqueado na rede, o navegador volta para o TCP.
      `),
      {
        type: 'table',
        head: ['', 'HTTP/1.1', 'HTTP/2', 'HTTP/3'],
        rows: [
          ['especificação', 'RFC 9112', 'RFC 9113', 'RFC 9114'],
          ['formato', 'texto', 'quadros binários', 'quadros binários sobre fluxos QUIC'],
          ['onde a mensagem acaba', 'sem corpo, chunked, Content-Length ou fechar a conexão', 'flag END_STREAM', 'fim do fluxo QUIC (FIN)'],
          ['requisições simultâneas numa conexão', '1 (pipelining desligado na prática); por isso, 6 conexões', 'muitas, multiplexadas', 'muitas, cada uma num fluxo QUIC'],
          ['cabeçalhos', 'texto repetido em cada requisição', 'HPACK', 'QPACK'],
          ['transporte', 'TCP', 'TCP', 'QUIC (sobre UDP)'],
          ['criptografia', 'opcional (HTTPS = HTTP/1.1 sobre TLS)', 'nos navegadores, sempre com TLS', 'sempre: o TLS 1.3 faz parte do QUIC'],
          ['um pacote perdido atrasa', 'a conexão em que ele estava', 'todos os fluxos da conexão', 'só o fluxo a que ele pertence'],
        ],
        caption: 'Mesma semântica (RFC 9110), três enquadramentos.',
      },
    ],
    exemplo: [
      md(`
        Vamos acompanhar a mesma conversa nos três formatos. Um sistema de cobrança gera, sob demanda, o comprovante de um boleto. Em **HTTP/1.1**, o servidor ainda não sabe o tamanho total quando começa a responder, então usa chunked. Os \`↵\` marcam os CRLF:
      `),
      code('text', `
        GET /boletos/8231/comprovante HTTP/1.1↵
        Host: cobranca.exemplo.com.br↵
        Accept: text/plain↵
        ↵
        HTTP/1.1 200 OK↵
        Content-Type: text/plain; charset=utf-8↵
        Transfer-Encoding: chunked↵
        ↵
        b↵                         ← 0xb = 11 bytes a seguir
        boleto pago↵
        f↵                         ← 0xf = 15 bytes
        , CEP 01310-100↵
        0↵                         ← pedaço de tamanho 0: acabou
        ↵                          ← linha vazia (não houve trailers)
      `, 'O corpo decodificado é "boleto pago, CEP 01310-100" (26 bytes). A conexão continua aberta para a próxima requisição.'),
      md(`
        Leitura passo a passo, como o cliente faz: (1) lê até a linha vazia e separa os campos; (2) não é HEAD nem 1xx/204/304; (3) há \`Transfer-Encoding: chunked\`, então lê a linha \`b\`, converte de hexadecimal (11), lê 11 bytes e confere o CRLF; (4) repete com \`f\` (15); (5) lê \`0\`, depois lê linhas até a vazia; (6) o próximo byte da conexão já é o começo da próxima resposta.

        Agora a página do boleto em **HTTP/2**, com o HTML, o CSS e o JavaScript. Os quadros, na ordem em que passam pela única conexão TCP (→ cliente para servidor, ← servidor para cliente):
      `),
      code('text', `
        → (prefácio "PRI * HTTP/2.0..." e SETTINGS no fluxo 0)
        ← SETTINGS        fluxo 0
        → HEADERS         fluxo 1  END_STREAM|END_HEADERS   :method GET  :path /boletos/8231
        ← HEADERS         fluxo 1  END_HEADERS              :status 200
        ← DATA            fluxo 1                           (primeiros 16 KB do HTML)
        → HEADERS         fluxo 3  END_STREAM|END_HEADERS   :path /estilo.css
        → HEADERS         fluxo 5  END_STREAM|END_HEADERS   :path /app.js
        ← HEADERS         fluxo 3  END_HEADERS              :status 200
        ← DATA            fluxo 3  END_STREAM               (o CSS inteiro, pequeno)
        ← HEADERS         fluxo 5  END_HEADERS              :status 200
        ← DATA            fluxo 5                           (JS, parte 1)
        ← DATA            fluxo 1  END_STREAM               (resto do HTML)
        ← DATA            fluxo 5  END_STREAM               (JS, parte 2)
      `, 'Requisições nos fluxos 1, 3 e 5 (ímpares, do cliente); as respostas se intercalam e cada uma termina com END_STREAM no próprio fluxo.'),
      md(`
        Repare: o CSS chegou inteiro **antes** do fim do HTML, que tinha sido pedido primeiro. Em HTTP/1.1 com uma conexão, isso seria impossível; com seis conexões, custaria seis handshakes. E as requisições 3 e 5 repetem quase todos os campos da 1: com o HPACK, \`:method GET\`, \`:scheme https\`, \`:authority\`, Cookie e User-Agent viram poucos bytes cada.

        Em **HTTP/3**, a troca é a mesma, mas cada requisição vai num fluxo QUIC (0, 4, 8: os bidirecionais abertos pelo cliente são numerados de 4 em 4), sem ID dentro dos quadros, e uma perda no fluxo do JavaScript não atrasa o CSS.
      `),
      { type: 'viz', viz: 'client-server', caption: 'Seja qual for a versão, a conversa é a mesma: o cliente pede, o servidor responde. O que muda é como os bytes são arrumados na conexão.' },
      code('bash', `
        # No seu computador (precisa de rede):
        $ curl -sv --http1.1 https://www.example.com -o /dev/null 2>&1 | grep -E "^[<>] "
        $ curl -sI --http2 https://www.example.com | head -1     # "HTTP/2 200" se o servidor aceitar h2
        $ curl -sI https://www.google.com | grep -i alt-svc       # o anúncio de HTTP/3
        $ dig +short www.cloudflare.com HTTPS                     # o registro HTTPS, com alpn="h3,h2"
      `, 'Para investigar no terminal do seu computador. No navegador, a coluna "Protocol" da aba Network (DevTools) mostra http/1.1, h2 ou h3 para cada requisição.'),
    ],
    codigo: [
      md('Um decodificador mínimo de HPACK, só com as duas representações mais comuns, rodando o exemplo oficial do apêndice C.3 da RFC 7541: duas requisições seguidas na mesma conexão.'),
      py(`
        # Parte da tabela estática do HPACK (RFC 7541, apêndice A): índice -> (nome, valor)
        ESTATICA = {1: (":authority", ""), 2: (":method", "GET"), 3: (":method", "POST"),
                    4: (":path", "/"), 5: (":path", "/index.html"), 6: (":scheme", "http"),
                    7: (":scheme", "https"), 8: (":status", "200"), 24: ("cache-control", "")}
        dinamica = []          # a entrada mais nova fica na frente, com o índice 62

        def entrada(indice):
            if indice <= 61:
                return ESTATICA[indice]
            return dinamica[indice - 62]

        def decodificar(bloco):
            campos, pos = [], 0
            while pos < len(bloco):
                byte = bloco[pos]
                if byte & 0x80:                    # 1xxxxxxx: campo inteiro pelo índice
                    campos.append(entrada(byte & 0x7F))
                    pos += 1
                elif byte & 0x40:                  # 01xxxxxx: nome pelo índice, valor literal, e guarda na tabela
                    nome = entrada(byte & 0x3F)[0]
                    tamanho = bloco[pos + 1]       # (aqui sem Huffman e com valor curto)
                    valor = bloco[pos + 2:pos + 2 + tamanho].decode()
                    campos.append((nome, valor))
                    dinamica.insert(0, (nome, valor))
                    pos += 2 + tamanho
                else:
                    raise ValueError("representação não tratada neste exemplo")
            return campos

        req1 = bytes.fromhex("828684410f7777772e6578616d706c652e636f6d")
        req2 = bytes.fromhex("828684be58086e6f2d6361636865")
        for rotulo, bloco in [("1ª requisição", req1), ("2ª requisição", req2)]:
            print(f"{rotulo}: {len(bloco)} bytes")
            for nome, valor in decodificar(bloco):
                print(f"   {nome}: {valor}")
        print("tabela dinâmica:", [(62 + i, nome) for i, (nome, valor) in enumerate(dinamica)])

        texto = "GET / HTTP/1.1\\r\\nHost: www.example.com\\r\\nCache-Control: no-cache\\r\\n\\r\\n"
        print("a 2ª requisição em HTTP/1.1:", len(texto.encode()), "bytes")
      `, { caption: 'Na 2ª requisição, o byte 0xbe (índice 62) traz ":authority: www.example.com" inteiro, guardado na 1ª. Troque o 0xbe por 0xbf e veja o erro: o índice 63 ainda não existe.' }),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e9-http-versoes-1',
          kind: 'mcq',
          prompt: 'Uma resposta HTTP/1.1 chega com `Transfer-Encoding: chunked` e sem `Content-Length`, numa conexão persistente. Como o cliente sabe que o corpo acabou?',
          difficulty: 'facil',
          skills: ['redes-dns-tls'],
          hints: [
            'Numa conexão persistente, o que vem logo depois do fim desta resposta?',
            'No formato chunked, o que vem antes de cada pedaço de dados?',
          ],
          explanation: 'No formato chunked, cada pedaço vem precedido do seu tamanho em hexadecimal, e um pedaço de tamanho 0 (seguido dos trailers opcionais e de uma linha vazia) marca o fim. Assim o servidor pode começar a responder sem saber o tamanho total e, mesmo assim, manter a conexão aberta para a próxima requisição.',
          options: [
            { text: 'Quando chega um pedaço de tamanho 0', correct: true, feedback: 'Isso. O pedaço de tamanho 0 (seguido da linha vazia) diz "acabou", e a conexão continua aberta.' },
            { text: 'Quando o servidor fecha a conexão', feedback: 'Essa é a regra para uma resposta sem chunked e sem Content-Length. O chunked existe justamente para marcar o fim sem fechar a conexão.' },
            { text: 'Pela primeira linha vazia depois do cabeçalho', feedback: 'A linha vazia marca o fim do cabeçalho, não do corpo. O corpo pode conter linhas vazias, ou nem ser texto.' },
            { text: 'Quando passa um tempo sem chegar nenhum byte', feedback: 'Tempo não é enquadramento: um servidor lento teria a resposta cortada, e um rápido emendaria duas respostas. O fim tem de estar escrito nos próprios bytes.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e9-http-versoes-2',
          kind: 'fill',
          lang: 'text',
          prompt: 'Complete os tamanhos dos pedaços desta resposta chunked. Cada linha termina em CRLF, e o CRLF **não** entra no tamanho. Os tamanhos vão em hexadecimal.',
          template: 'HTTP/1.1 200 OK\nContent-Type: text/plain\nTransfer-Encoding: chunked\n\n___\nboleto pago\n___\n, CEP 01310-100\n___\n\n',
          blanks: [['b', 'B', '0b', '0B'], ['f', 'F', '0f', '0F'], ['0']],
          difficulty: 'facil',
          skills: ['redes-dns-tls'],
          hints: [
            'Conte os caracteres de "boleto pago", incluindo o espaço. Como esse número se escreve em base 16?',
            'Em ", CEP 01310-100" contam a vírgula, os espaços e o hífen.',
            'Como o cliente fica sabendo que não vem mais nenhum pedaço?',
          ],
          explanation: '"boleto pago" tem 11 bytes, que em hexadecimal é b. ", CEP 01310-100" tem 15 bytes: f. O último pedaço tem tamanho 0 e marca o fim (depois dele vem a linha vazia). Um erro comum é escrever 11 e 15 em decimal: o cliente leria 0x11 = 17 e 0x15 = 21 bytes e se perderia no fluxo.',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e9-http-versoes-3',
          kind: 'predict',
          lang: 'python',
          prompt: 'Esta é uma tabela dinâmica do HPACK de brinquedo, com teto de 100 bytes. Cada entrada custa `len(nome) + len(valor) + 32`. O que o programa imprime?',
          code: dedent(`
            tabela = []          # a entrada mais nova fica na frente (índice 62)
            LIMITE = 100

            def tamanho(t):
                return sum(len(n) + len(v) + 32 for n, v in t)

            def inserir(nome, valor):
                tabela.insert(0, (nome, valor))
                while tamanho(tabela) > LIMITE:
                    tabela.pop()

            inserir("cookie", "sessao=abc")
            inserir("user-agent", "app/2.0")
            print(tamanho(tabela), tabela[0][0])
            inserir("x-cep", "01310100")
            for i, (nome, valor) in enumerate(tabela):
                print(62 + i, nome)
          `),
          answer: '97 user-agent\n62 x-cep\n63 user-agent',
          difficulty: 'intermediario',
          skills: ['redes-dns-tls'],
          hints: [
            'Quanto custa cada uma das duas primeiras entradas? Elas cabem juntas no limite?',
            'Depois de inserir x-cep, qual seria o total? Passou do limite?',
            '`tabela.pop()` sem argumento remove qual ponta da lista: a mais nova ou a mais antiga?',
          ],
          explanation: 'cookie custa 6 + 10 + 32 = 48 e user-agent custa 10 + 7 + 32 = 49: total 97, dentro do limite, e a mais nova (user-agent) está na frente. x-cep custa 5 + 8 + 32 = 45; o total iria a 142, então sai a entrada mais antiga, o cookie (que está no fim da lista), e o total cai para 94. Sobram x-cep no índice 62 e user-agent no 63. Repare que os índices mudam a cada inserção: por isso os dois lados precisam processar os blocos exatamente na mesma ordem, a exigência que o QPACK teve de contornar.',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e9-http-versoes-4',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Escreva \`ler_quadros(dados)\`, que recebe \`bytes\` com zero ou mais quadros HTTP/2 seguidos e devolve a lista de tuplas \`(tipo, flags, fluxo, conteudo)\`, na ordem.

            Cada quadro tem um cabeçalho de 9 bytes, em big-endian: **tamanho** do conteúdo (3 bytes), **tipo** (1 byte), **flags** (1 byte) e 4 bytes em que o primeiro bit é reservado (ignore-o) e os outros 31 são o **ID do fluxo**. Depois vêm exatamente \`tamanho\` bytes de conteúdo (\`conteudo\` é do tipo \`bytes\`).

            Se os dados terminarem no meio de um cabeçalho ou de um conteúdo, levante \`ValueError\`. Exemplo: \`ler_quadros(bytes([0, 0, 2, 0, 1, 0, 0, 0, 3]) + b"oi")\` devolve \`[(0, 1, 3, b"oi")]\` (um DATA com END_STREAM no fluxo 3).
          `),
          difficulty: 'intermediario',
          skills: ['redes-dns-tls'],
          hints: [
            'Que variável diz em que ponto dos dados você está? Quanto ela avança a cada quadro?',
            'Como transformar 3 ou 4 bytes num número, sabendo que o mais significativo vem primeiro? Procure `int.from_bytes`.',
            'O bit reservado é o mais alto dos 32. Que máscara deixa só os 31 de baixo?',
            'Antes de fatiar, confira se ainda há bytes suficientes: 9 para o cabeçalho e depois `tamanho` para o conteúdo.',
          ],
          explanation: 'É um laço com um cursor: lê 9 bytes, extrai os campos com int.from_bytes(..., "big") e uma máscara 0x7FFFFFFF para descartar o bit reservado, pega `tamanho` bytes de conteúdo e avança o cursor. Fatiar bytes em Python nunca dá erro, só devolve menos bytes; por isso é preciso conferir o tamanho antes, senão um quadro truncado passaria como se estivesse completo. Esse é o padrão de todo protocolo binário com prefixo de tamanho (TLS, QUIC, Protocol Buffers): o tamanho vem antes, e o leitor nunca precisa procurar um delimitador.',
          starter: dedent(`
            def ler_quadros(dados):
                # devolva a lista de (tipo, flags, fluxo, conteudo)
                # cabeçalho: tamanho (3 bytes), tipo (1), flags (1), R + fluxo (4)
                pass
          `),
          solution: dedent(`
            def ler_quadros(dados):
                quadros = []
                pos = 0
                while pos < len(dados):
                    if len(dados) - pos < 9:
                        raise ValueError("cabeçalho de quadro incompleto")
                    tamanho = int.from_bytes(dados[pos:pos + 3], "big")
                    tipo = dados[pos + 3]
                    flags = dados[pos + 4]
                    fluxo = int.from_bytes(dados[pos + 5:pos + 9], "big") & 0x7FFFFFFF
                    inicio = pos + 9
                    if inicio + tamanho > len(dados):
                        raise ValueError("conteúdo do quadro incompleto")
                    quadros.append((tipo, flags, fluxo, dados[inicio:inicio + tamanho]))
                    pos = inicio + tamanho
                return quadros
          `),
          tests: [
            {
              name: 'o exemplo do enunciado e a entrada vazia',
              code: dedent(`
                r = ler_quadros(bytes([0, 0, 2, 0, 1, 0, 0, 0, 3]) + b"oi")
                assert r == [(0, 1, 3, b"oi")], f"esperado [(0, 1, 3, b'oi')], veio {r}"
                assert ler_quadros(b"") == [], "sem bytes, não há quadros: devolva []"
              `),
            },
            {
              name: 'vários quadros seguidos, inclusive sem conteúdo',
              code: dedent(`
                import struct as _st
                def _q(tipo, flags, fluxo, conteudo):
                    return _st.pack(">I", len(conteudo))[1:] + bytes([tipo, flags]) + _st.pack(">I", fluxo) + conteudo
                dados = _q(4, 0, 0, b"") + _q(1, 5, 1, b"\\x82\\x87\\x84") + _q(0, 0, 3, b"css...") + _q(0, 1, 1, b"<html>")
                r = ler_quadros(dados)
                esperado = [(4, 0, 0, b""), (1, 5, 1, b"\\x82\\x87\\x84"), (0, 0, 3, b"css..."), (0, 1, 1, b"<html>")]
                assert r == esperado, f"veio {r}; esperado {esperado}. Um SETTINGS vazio (tamanho 0) também é um quadro"
              `),
            },
            {
              name: 'tamanho de 3 bytes, em big-endian',
              code: dedent(`
                conteudo = b"x" * 70000
                cab = (70000).to_bytes(3, "big") + bytes([0, 0]) + (5).to_bytes(4, "big")
                r = ler_quadros(cab + conteudo)
                assert len(r) == 1 and r[0][2] == 5 and len(r[0][3]) == 70000, "um conteúdo de 70.000 bytes precisa dos 3 bytes do tamanho (2 bytes só vão até 65.535)"
                cab = bytes([0, 1, 0, 0, 0, 0, 0, 0, 1])
                r = ler_quadros(cab + b"y" * 256)
                assert len(r) == 1 and len(r[0][3]) == 256, "os bytes 00 01 00 valem 256 em big-endian: o mais significativo vem primeiro"
              `),
            },
            {
              name: 'o bit reservado é ignorado',
              code: dedent(`
                cab = bytes([0, 0, 1, 0, 0, 0x80, 0, 0, 7])
                r = ler_quadros(cab + b"z")
                assert r == [(0, 0, 7, b"z")], f"com o bit reservado ligado, o fluxo ainda é 7; veio {r}. Use uma máscara para ficar só com 31 bits"
                cab = bytes([0, 0, 0, 8, 0, 0x7F, 0xFF, 0xFF, 0xFF])
                r = ler_quadros(cab)
                assert r == [(8, 0, 2**31 - 1, b"")], f"o maior ID de fluxo é 2**31 - 1; veio {r}"
              `),
            },
            {
              name: 'dados truncados levantam ValueError',
              code: dedent(`
                for dados, onde in [(bytes([0, 0, 5, 0, 0, 0, 0, 0, 1]) + b"abc", "no meio do conteúdo"),
                                    (bytes([0, 0, 0, 4, 0, 0, 0]), "no meio do cabeçalho"),
                                    (bytes([0, 0, 1, 0, 0, 0, 0, 0, 1]) + b"a" + bytes([0, 0]), "no cabeçalho do 2º quadro")]:
                    try:
                        r = ler_quadros(dados)
                    except ValueError:
                        continue
                    assert False, f"os dados terminam {onde}; esperado ValueError, veio {r}"
              `),
            },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e9-http-versoes-5',
          kind: 'mcq',
          prompt: 'O HTTP/3 poderia ter usado o HPACK do HTTP/2 sem mudança nenhuma, mandando os blocos de cabeçalho em cada fluxo QUIC. Por que não fez isso e criou o QPACK?',
          difficulty: 'avancado',
          skills: ['redes-dns-tls'],
          hints: [
            'No HPACK, o que um bloco de cabeçalho pode fazer com a tabela dinâmica, além de ler dela?',
            'No QUIC, dois fluxos diferentes chegam necessariamente na ordem em que foram enviados?',
            'Se o bloco do fluxo 8 usa uma entrada criada pelo bloco do fluxo 4, e o fluxo 4 atrasou, o que o decodificador teria de fazer?',
          ],
          explanation: 'No HPACK, as inserções na tabela dinâmica vão dentro dos próprios blocos de cabeçalho, e os índices de todas as entradas mudam a cada inserção; então o decodificador precisa processar os blocos na ordem exata em que foram enviados. Sobre TCP isso é garantido. Sobre QUIC, fluxos diferentes chegam em qualquer ordem, e esperar o fluxo atrasado recriaria o bloqueio de cabeça de fila entre fluxos que o QUIC eliminou. O QPACK manda as inserções por um fluxo separado e faz cada bloco dizer de quantas inserções depende, para que só o fluxo que realmente precisa de uma entrada nova espere por ela.',
          options: [
            { text: 'Porque o HPACK depende de os blocos serem processados na ordem em que foram enviados, e fluxos QUIC independentes não garantem essa ordem entre si', correct: true, feedback: 'Isso: a tabela dinâmica do HPACK é atualizada no meio dos blocos. Com fluxos fora de ordem, ou um fluxo espera o outro (bloqueio de cabeça de fila de novo) ou os índices ficam errados.' },
            { text: 'Porque o HPACK é vulnerável ao ataque CRIME, e o QPACK corrigiu isso', feedback: 'O CRIME atingia a compressão com gzip/deflate do SPDY. O HPACK foi desenhado justamente para resistir a ele, e o QPACK herda as mesmas defesas. O motivo da mudança foi a ordem de entrega.' },
            { text: 'Porque o QUIC já comprime os cabeçalhos sozinho', feedback: 'O QUIC não sabe o que é um cabeçalho HTTP; ele transporta bytes em fluxos. A compressão continua sendo trabalho do HTTP/3, com o QPACK.' },
            { text: 'Porque o HTTP/3 manda os cabeçalhos em texto, como o HTTP/1.1', feedback: 'O HTTP/3 também usa quadros binários e cabeçalhos comprimidos. A diferença está em como as tabelas dinâmicas são atualizadas.' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e9-http-versoes-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Um cliente mandou várias requisições numa conexão HTTP/1.1 persistente e recebeu, de volta, um fluxo com as respostas grudadas umas nas outras. Escreva \`separar(fluxo, metodos)\`, que devolve a lista de tuplas \`(status, corpo)\`, na ordem.

            - \`fluxo\` é uma \`str\` só com caracteres ASCII (1 caractere = 1 byte), com linhas terminadas em \`"\\r\\n"\`. Cada resposta tem a linha de status (\`HTTP/1.1 200 OK\`), campos \`Nome: valor\` (nomes sem diferença entre maiúsculas e minúsculas; espaços em volta do valor não contam), uma linha vazia e, talvez, um corpo.
            - \`metodos\` é a lista dos métodos das requisições, na ordem em que foram enviadas (as respostas vêm na mesma ordem).
            - Respostas **1xx** (só aparecem 100 e 103) são provisórias: entram na lista com corpo \`""\`, nunca têm corpo e **não** consomem um método; a resposta final daquela requisição vem depois.

            O corpo de cada resposta final segue a ordem de regras da lição: (1) resposta a **HEAD** ou status **204** ou **304**: corpo vazio, mesmo com \`Content-Length\`; (2) \`Transfer-Encoding\` cujo **último** valor da lista separada por vírgulas é \`chunked\` (como em \`gzip, chunked\`): decodifique os pedaços (tamanho em hexadecimal, maiúsculo ou minúsculo; ignore extensões depois de \`;\`; depois do pedaço 0, ignore trailers até a linha vazia); (3) \`Content-Length\`: exatamente aquela quantidade; (4) senão (inclusive com um \`Transfer-Encoding\` que não termina em \`chunked\`, como \`chunked, gzip\`): o resto do fluxo inteiro.

            Levante \`ValueError\` se o fluxo terminar no meio de uma resposta (cabeçalho sem linha vazia, corpo mais curto que o Content-Length, pedaço incompleto ou sem o CRLF depois dos dados) ou se chegar uma resposta final sem método correspondente. Se o fluxo acabar exatamente no fim de uma resposta, devolva o que já chegou, mesmo que sobrem métodos.
          `),
          difficulty: 'desafio',
          skills: ['redes-dns-tls', 'web-http-api'],
          hints: [
            'Use um cursor (a posição atual no fluxo) e trate uma resposta por volta do laço. O que marca o fim do cabeçalho?',
            'Guarde os campos num dicionário com os nomes em minúsculas. Em que momento você decide qual método corresponde a esta resposta, e o que muda se o status for 1xx?',
            'Teste as regras na ordem da lição. Para uma resposta a HEAD com Content-Length: 120, quantos bytes do fluxo pertencem a ela?',
            'Para o chunked, escreva uma função à parte que recebe o fluxo e a posição e devolve (corpo, nova posição). `int(texto, 16)` converte hexadecimal.',
            'Fatiar uma str além do fim não dá erro, só devolve menos. Onde você precisa conferir se havia bytes suficientes?',
          ],
          explanation: 'O núcleo é um cursor que avança resposta por resposta: acha o "\\r\\n\\r\\n" do fim do cabeçalho, lê a linha de status e os campos, e só então decide quantos bytes do corpo pertencem a esta resposta. A ordem das regras é o que derruba soluções apressadas: um HEAD ou um 304 trazem Content-Length descrevendo um corpo que não veio, e consumir esses bytes engoliria o começo da resposta seguinte; um Transfer-Encoding chunked prevalece sobre um Content-Length conflitante (o caso que, tratado diferente por dois servidores, vira request smuggling); e uma resposta sem tamanho só pode ser a última, porque termina com o fechamento da conexão. As respostas 1xx mostram por que o método é escolhido depois de ler o status: elas não respondem a requisição, só avisam algo antes da resposta final.',
          starter: dedent(`
            def separar(fluxo, metodos):
                # devolva a lista de (status, corpo), na ordem do fluxo
                pass
          `),
          solution: dedent(`
            CRLF = "\\r\\n"

            def _chunked(fluxo, pos):
                partes = []
                while True:
                    fim = fluxo.find(CRLF, pos)
                    if fim == -1:
                        raise ValueError("linha de tamanho incompleta")
                    tamanho = int(fluxo[pos:fim].split(";")[0].strip(), 16)
                    pos = fim + 2
                    if tamanho == 0:
                        break
                    if fluxo[pos + tamanho:pos + tamanho + 2] != CRLF:
                        raise ValueError("pedaço incompleto ou sem CRLF no fim")
                    partes.append(fluxo[pos:pos + tamanho])
                    pos += tamanho + 2
                while True:                       # trailers, até a linha vazia
                    fim = fluxo.find(CRLF, pos)
                    if fim == -1:
                        raise ValueError("faltou a linha vazia do fim")
                    linha = fluxo[pos:fim]
                    pos = fim + 2
                    if linha == "":
                        return "".join(partes), pos

            def separar(fluxo, metodos):
                pendentes = list(metodos)
                respostas = []
                pos = 0
                while pos < len(fluxo):
                    fim = fluxo.find(CRLF + CRLF, pos)
                    if fim == -1:
                        raise ValueError("cabeçalho incompleto")
                    linhas = fluxo[pos:fim].split(CRLF)
                    pos = fim + 4
                    status = int(linhas[0].split(" ")[1])
                    campos = {}
                    for linha in linhas[1:]:
                        nome, _, valor = linha.partition(":")
                        campos[nome.strip().lower()] = valor.strip()
                    if 100 <= status <= 199:
                        respostas.append((status, ""))
                        continue
                    if not pendentes:
                        raise ValueError("resposta sem requisição correspondente")
                    metodo = pendentes.pop(0)
                    te = campos.get("transfer-encoding", "")
                    if metodo == "HEAD" or status in (204, 304):
                        corpo = ""
                    elif te and te.split(",")[-1].strip().lower() == "chunked":
                        corpo, pos = _chunked(fluxo, pos)
                    elif "content-length" in campos:
                        n = int(campos["content-length"])
                        if pos + n > len(fluxo):
                            raise ValueError("corpo incompleto")
                        corpo = fluxo[pos:pos + n]
                        pos += n
                    else:
                        corpo = fluxo[pos:]
                        pos = len(fluxo)
                    respostas.append((status, corpo))
                return respostas
          `),
          tests: [
            {
              name: 'Content-Length e o resto do fluxo',
              code: GERA_HTTP + '\n' + dedent(`
                _confere("HTTP/1.1 200 OK\\r\\nContent-Length: 6\\r\\n\\r\\nPix okHTTP/1.1 404 Not Found\\r\\ncontent-length:  3 \\r\\n\\r\\nnao", ["GET", "GET"], [(200, "Pix ok"), (404, "nao")], "nomes de campo sem diferença de maiúsculas, e espaços em volta do valor não contam")
                _confere("HTTP/1.1 200 OK\\r\\nContent-Type: text/plain\\r\\n\\r\\nsem tamanho:\\r\\n\\r\\nvai ate fechar", ["GET"], [(200, "sem tamanho:\\r\\n\\r\\nvai ate fechar")], "sem Content-Length e sem chunked, o corpo é todo o resto do fluxo, linhas vazias incluídas")
              `),
            },
            {
              name: 'HEAD, 204 e 304 não têm corpo, mesmo com Content-Length',
              code: GERA_HTTP + '\n' + dedent(`
                f = ("HTTP/1.1 200 OK\\r\\nContent-Length: 120\\r\\n\\r\\n"
                     "HTTP/1.1 304 Not Modified\\r\\nContent-Length: 50\\r\\n\\r\\n"
                     "HTTP/1.1 204 No Content\\r\\n\\r\\n"
                     "HTTP/1.1 201 Created\\r\\nContent-Length: 2\\r\\n\\r\\nok")
                _confere(f, ["HEAD", "GET", "DELETE", "POST"], [(200, ""), (304, ""), (204, ""), (201, "ok")], "a resposta a HEAD e o 304 trazem Content-Length do corpo que um GET teria, mas não trazem corpo")
              `),
            },
            {
              name: 'chunked: hexadecimal, extensões e trailers',
              code: GERA_HTTP + '\n' + dedent(`
                f = "HTTP/1.1 200 OK\\r\\nTransfer-Encoding: chunked\\r\\n\\r\\nb\\r\\nboleto pago\\r\\nf\\r\\n, CEP 01310-100\\r\\n0\\r\\n\\r\\n"
                _confere(f, ["GET"], [(200, "boleto pago, CEP 01310-100")], "os tamanhos estão em hexadecimal: b = 11, f = 15")
                f = ("HTTP/1.1 200 OK\\r\\ntransfer-encoding: chunked\\r\\n\\r\\n1A;lote=7\\r\\nabcdefghijklmnopqrstuvwxyz\\r\\n0\\r\\nX-Soma: 99\\r\\n\\r\\n"
                     "HTTP/1.1 200 OK\\r\\nContent-Length: 3\\r\\n\\r\\nfim")
                _confere(f, ["GET", "GET"], [(200, "abcdefghijklmnopqrstuvwxyz"), (200, "fim")], "1A em maiúsculas vale 26; a extensão ;lote=7 e o trailer X-Soma devem ser ignorados")
                _confere("HTTP/1.1 200 OK\\r\\nTransfer-Encoding: chunked\\r\\n\\r\\n0\\r\\n\\r\\n", ["GET"], [(200, "")], "um corpo chunked pode ser vazio: só o pedaço 0")
              `),
            },
            {
              name: 'chunked prevalece sobre Content-Length',
              code: GERA_HTTP + '\n' + dedent(`
                f = ("HTTP/1.1 200 OK\\r\\nContent-Length: 4\\r\\nTransfer-Encoding: chunked\\r\\n\\r\\n3\\r\\nabc\\r\\n0\\r\\n\\r\\n"
                     "HTTP/1.1 200 OK\\r\\nContent-Length: 2\\r\\n\\r\\nzz")
                _confere(f, ["GET", "GET"], [(200, "abc"), (200, "zz")], "com os dois campos, vale o Transfer-Encoding (RFC 9112); usar o Content-Length aqui é a raiz do request smuggling")
              `),
            },
            {
              name: 'só vale chunked quando é a última codificação',
              code: GERA_HTTP + '\n' + dedent(`
                f = ("HTTP/1.1 200 OK\\r\\nTransfer-Encoding: gzip, chunked\\r\\n\\r\\n4\\r\\nGZ01\\r\\n0\\r\\n\\r\\n"
                     "HTTP/1.1 200 OK\\r\\nContent-Length: 2\\r\\n\\r\\nzz")
                _confere(f, ["GET", "GET"], [(200, "GZ01"), (200, "zz")], "em 'gzip, chunked' o último valor é chunked: decodifique os pedaços (o conteúdo comprimido fica como veio)")
                f = "HTTP/1.1 200 OK\\r\\nTransfer-Encoding: chunked, gzip\\r\\n\\r\\nbytes-comprimidos-ate-fechar"
                _confere(f, ["GET"], [(200, "bytes-comprimidos-ate-fechar")], "em 'chunked, gzip' o chunked não é o último: a resposta vai até o fim do fluxo. Procurar 'chunked' em qualquer posição do valor é errado")
              `),
            },
            {
              name: 'respostas 1xx são provisórias',
              code: GERA_HTTP + '\n' + dedent(`
                f = ("HTTP/1.1 100 Continue\\r\\n\\r\\n"
                     "HTTP/1.1 201 Created\\r\\nContent-Length: 2\\r\\n\\r\\nid"
                     "HTTP/1.1 103 Early Hints\\r\\nLink: </estilo.css>; rel=preload\\r\\n\\r\\n"
                     "HTTP/1.1 200 OK\\r\\nContent-Length: 4\\r\\n\\r\\nhtml")
                _confere(f, ["POST", "GET"], [(100, ""), (201, "id"), (103, ""), (200, "html")], "o 100 e o 103 entram na lista, mas não consomem método: o 201 responde o POST e o 200 responde o GET")
              `),
            },
            {
              name: 'fluxos incompletos e respostas sobrando',
              code: GERA_HTTP + '\n' + dedent(`
                _falha("HTTP/1.1 200 OK\\r\\nContent-Length: 10\\r\\n\\r\\ncurto", ["GET"], "o corpo tem 5 bytes, mas o Content-Length promete 10")
                _falha("HTTP/1.1 200 OK\\r\\nContent-Length: 1", ["GET"], "o cabeçalho não terminou (falta a linha vazia)")
                _falha("HTTP/1.1 200 OK\\r\\nTransfer-Encoding: chunked\\r\\n\\r\\n5\\r\\nab", ["GET"], "o pedaço de 5 bytes está pela metade")
                _falha("HTTP/1.1 200 OK\\r\\nTransfer-Encoding: chunked\\r\\n\\r\\n2\\r\\nabcd\\r\\n0\\r\\n\\r\\n", ["GET"], "depois dos 2 bytes do pedaço deveria vir CRLF, e veio 'cd'")
                _falha("HTTP/1.1 200 OK\\r\\nTransfer-Encoding: chunked\\r\\n\\r\\n2\\r\\nabc\\r\\n0\\r\\n\\r\\n", ["GET"], "o pedaço diz 2 bytes, mas vieram 3 antes do CRLF: confira que logo depois dos dados vem exatamente CRLF, em vez de só pular 2 caracteres")
                _falha("HTTP/1.1 200 OK\\r\\nTransfer-Encoding: chunked\\r\\n\\r\\n3\\r\\nabc\\r\\n0\\r\\n", ["GET"], "faltou a linha vazia depois do pedaço 0")
                _falha("HTTP/1.1 200 OK\\r\\nContent-Length: 0\\r\\n\\r\\nHTTP/1.1 200 OK\\r\\nContent-Length: 0\\r\\n\\r\\n", ["GET"], "chegaram duas respostas finais para uma requisição só")
                _confere("HTTP/1.1 200 OK\\r\\nContent-Length: 2\\r\\n\\r\\nok", ["GET", "GET", "GET"], [(200, "ok")], "as outras respostas ainda não chegaram: devolva o que está completo")
                _confere("", ["GET"], [], "fluxo vazio: nenhuma resposta ainda")
              `),
            },
            {
              name: 'fluxos aleatórios',
              code: GERA_HTTP + '\n' + dedent(`
                _rng = _random.Random(9112)
                for _ in range(400):
                    fluxo, metodos, esperado = _gera(_rng)
                    _confere(fluxo, metodos, esperado)
              `),
            },
          ],
        },
      },
    ],
    projeto: [
      md(`
        **Veja as versões convivendo.** No seu computador, abra o DevTools do navegador (F12), aba **Network**, clique com o botão direito no cabeçalho da tabela e ligue a coluna **Protocol**. Carregue o site do seu banco, um portal de notícias e o site da prefeitura da sua cidade. Anote quais requisições vão em \`http/1.1\`, \`h2\` e \`h3\`, e procure o cabeçalho \`alt-svc\` nas respostas. Recarregue: alguma requisição mudou de \`h2\` para \`h3\`? Depois, rode \`dig\` com o tipo HTTPS nesses domínios e veja quais publicam o registro. Explique o que você viu com o que a lição diz sobre a descoberta do HTTP/3.
      `),
    ],
    revisao: [
      md(`
        - A semântica (métodos, status, campos) é a da RFC 9110 nas três versões; o que muda é o enquadramento: RFC 9112 (1.1), 9113 (2) e 9114 (3).
        - HTTP/1.1, fim do corpo, na ordem: HEAD/1xx/204/304 sem corpo; \`chunked\` (prevalece sobre Content-Length); \`Content-Length\`; senão, até fechar a conexão.
        - Chunked: tamanho em hexadecimal, CRLF, dados, CRLF; termina no pedaço 0, trailers e linha vazia.
        - Pipelining ficou desligado; os navegadores abrem até 6 conexões por origem. Divergência sobre o fim da mensagem é request smuggling.
        - HTTP/2: quadros com cabeçalho de 9 bytes (tamanho 24 bits, tipo, flags, ID de fluxo 31 bits); fluxos ímpares do cliente, fluxo 0 é a conexão; END_STREAM marca o fim; RST_STREAM cancela um fluxo só.
        - HPACK: tabela estática (61) + dinâmica (índice 62 é a mais nova; entrada = nome + valor + 32; saem as mais antigas) + Huffman.
        - HTTP/3: fluxos QUIC, sem ID nos quadros; QPACK porque o HPACK exige processar os blocos em ordem. Descoberta por \`Alt-Svc\` ou pelo registro DNS HTTPS.
      `),
      english(`
        - **framing, message body, chunked transfer coding, trailer fields**: enquadramento, corpo da mensagem, codificação em pedaços, campos de trailer
        - **persistent connection, pipelining, head-of-line blocking, request smuggling**: conexão persistente, encadeamento, bloqueio de cabeça de fila, contrabando de requisições
        - **frame, stream, stream identifier, multiplexing, flow control window**: quadro, fluxo, identificador de fluxo, multiplexação, janela de controle de fluxo
        - **header compression, static table, dynamic table, pseudo-header**: compressão de cabeçalhos, tabela estática, tabela dinâmica, pseudocabeçalho

        Frase típica de entrevista: *"HTTP/2 multiplexes many streams over a single TCP connection, which removes head-of-line blocking at the HTTP layer but not at the transport layer; HTTP/3 moves to QUIC so that a lost packet only stalls the stream it belongs to."*

        Frase típica da RFC 9113: *"Streams initiated by a client MUST use odd-numbered stream identifiers."*
      `),
    ],
  },
  review: [
    ['Em que ordem o HTTP/1.1 decide o tamanho do corpo de uma resposta?', '1) HEAD, 1xx, 204 ou 304: sem corpo; 2) Transfer-Encoding chunked; 3) Content-Length; 4) senão, até o servidor fechar a conexão.'],
    ['Como termina um corpo chunked?', 'Com um pedaço de tamanho 0, seguido dos trailers opcionais e de uma linha vazia. Os tamanhos estão em hexadecimal.'],
    ['Por que uma resposta a HEAD pode ter Content-Length: 5000 e corpo vazio?', 'Porque o Content-Length descreve o corpo que um GET teria; a resposta a HEAD nunca tem corpo, e quem lê não pode consumir aqueles bytes.'],
    ['O que é request smuggling e qual o caso clássico?', 'Proxy e back-end discordam sobre onde a requisição termina, e uma segunda requisição se esconde no corpo da primeira. Clássico: Content-Length e Transfer-Encoding: chunked na mesma mensagem.'],
    ['Quais são os campos do cabeçalho de quadro do HTTP/2?', '9 bytes: tamanho (24 bits), tipo (8), flags (8), bit reservado + ID do fluxo (31).'],
    ['Que números de fluxo o cliente usa no HTTP/2, e para que serve o fluxo 0?', 'Ímpares e crescentes (1, 3, 5...). O fluxo 0 é a própria conexão: SETTINGS, PING, GOAWAY.'],
    ['Como funciona a tabela dinâmica do HPACK?', 'Guarda campos já enviados; a mais nova fica no índice 62; cada entrada custa nome + valor + 32 bytes; acima do teto (4.096 por padrão), saem as mais antigas.'],
    ['Por que o HTTP/3 precisou do QPACK em vez do HPACK?', 'O HPACK exige processar os blocos na ordem de envio, porque as inserções na tabela vão dentro deles. Fluxos QUIC chegam em qualquer ordem; o QPACK manda as inserções por um fluxo separado.'],
    ['Como o navegador descobre que um site aceita HTTP/3?', 'Pelo cabeçalho Alt-Svc (h3=":443") numa resposta anterior, ou pelo registro DNS HTTPS com alpn="h3,..." antes da primeira conexão.'],
  ],
  references: ['rfc9110', 'mdn-http', 'kurose-ross', 'cloudflare-learning'],
});

/* ------------------------------------------------------------------ */
/* TLS 1.3 e certificados: handshake, cadeia de confiança e validação   */
/* ------------------------------------------------------------------ */

/** Referência e gerador usados nos testes aleatórios do desafio de validação de cadeia. */
const REF_CADEIA = dedent(`
  import random as _random

  def _ref_nome(nomes, host):
      host = host.lower().rstrip(".")
      for p in nomes:
          p = p.lower().rstrip(".")
          if "*" not in p:
              if p == host:
                  return True
          elif p.startswith("*.") and "*" not in p[2:]:
              r, _, resto = host.partition(".")
              if r and resto == p[2:]:
                  return True
      return False

  def _ref_validar(enviados, host, agora, raizes):
      folha = enviados[0]
      if not _ref_nome(folha["nomes"], host):
          return ("nome", None)
      if not (folha["validade"][0] <= agora <= folha["validade"][1]):
          return ("validade", None)
      inter = enviados[1:]
      def vale(c):
          return c["validade"][0] <= agora <= c["validade"][1]
      def subir(atual, caminho, usados):
          for r in raizes:
              if r["sujeito"] == atual["emissor"] and vale(r):
                  return caminho + [r["sujeito"]]
          for i, c in enumerate(inter):
              if i not in usados and c["sujeito"] == atual["emissor"] and c["ca"] and vale(c):
                  achou = subir(c, caminho + [c["sujeito"]], usados | {i})
                  if achou:
                      return achou
          return None
      caminho = subir(folha, [folha["sujeito"]], frozenset())
      return ("ok", caminho) if caminho else ("cadeia", None)

  def C(sujeito, emissor, inicio="2020-01-01", fim="2030-12-31", ca=True, nomes=()):
      return {"sujeito": sujeito, "emissor": emissor, "validade": (inicio, fim), "ca": ca, "nomes": list(nomes)}

  def _confere(enviados, host, agora, raizes, dica=""):
      import copy as _copy
      esperado = _ref_validar(enviados, host, agora, raizes)
      r = validar(_copy.deepcopy(enviados), host, agora, _copy.deepcopy(raizes))
      assert r is not None, "validar devolveu None: devolva uma tupla como ('ok', caminho) ou ('nome', None)"
      r = (r[0], list(r[1]) if r[1] is not None else None)
      assert r == esperado, f"validar(..., host={host!r}, agora={agora!r}) devolveu {r}, esperado {esperado}. {dica}"

  def _gera(rng):
      cas = ["Raiz A", "Raiz B", "Inter 1", "Inter 2", "Inter 3"]
      datas = ["2024-01-01", "2025-01-01", "2026-01-01", "2027-01-01", "2028-01-01"]
      def janela():
          if rng.random() < 0.7:
              return ("2024-01-01", "2028-01-01")
          a, b = sorted(rng.sample(datas, 2))
          return (a, b)
      nomes = ["loja.com.br", "*.loja.com.br"] if rng.random() < 0.8 else rng.sample(["loja.com.br", "*.loja.com.br", "outra.com.br"], 1)
      folha = {"sujeito": "loja.com.br", "emissor": rng.choice(cas[2:] * 2 + cas[:2]), "validade": janela(), "ca": False, "nomes": nomes}
      inter = [{"sujeito": rng.choice(cas[2:] * 2 + cas[:2]), "emissor": rng.choice(cas), "validade": janela(),
                "ca": rng.random() < 0.85, "nomes": []} for _ in range(rng.randint(0, 5))]
      raizes = [{"sujeito": s, "emissor": s, "validade": janela(), "ca": True, "nomes": []}
                for s in rng.sample(["Raiz A", "Raiz B", "Inter 3"], rng.randint(0, 2))]
      host = rng.choice(["loja.com.br", "pix.loja.com.br", "PIX.Loja.com.br.", "loja.com.br", "a.pix.loja.com.br"])
      agora = rng.choice(["2024-06-01", "2025-06-01", "2026-06-01", "2027-06-01"])
      return [folha] + inter, host, agora, raizes
`);

const tlsCertificados = lesson({
  id: 'l9-tls-certificados',
  moduleId: 'm9-2',
  title: 'TLS 1.3 e certificados: o handshake, a cadeia de confiança e os erros de HTTPS',
  titleEn: 'TLS 1.3 and certificates: the handshake, the chain of trust and HTTPS errors',
  summary: 'O que cada mensagem do handshake do TLS 1.3 faz e por que ele custa um RTT só, o que SNI, ALPN e 0-RTT resolvem (e o risco de repetição do 0-RTT), o que há num certificado X.509, como o cliente monta e valida a cadeia até uma raiz confiável e confere o nome com curinga, e como diagnosticar os erros de certificado mais comuns, além de revogação, Certificate Transparency, CAA, ACME, HSTS e mTLS.',
  minutes: 50,
  objectives: [
    'Descrever o handshake do TLS 1.3 mensagem por mensagem e dizer o que CertificateVerify e Finished provam',
    'Calcular quantos RTTs uma pilha (TCP + TLS 1.2, TCP + TLS 1.3, QUIC, 0-RTT) leva até a primeira resposta',
    'Explicar SNI, ECH e ALPN, e por que dados 0-RTT só servem para requisições idempotentes',
    'Ler os campos de um certificado X.509 que importam: SAN, emissor, validade e se é CA',
    'Montar e validar uma cadeia de certificados até uma raiz confiável, inclusive quando há caminhos alternativos',
    'Aplicar as regras de nome com curinga e diagnosticar os erros de HTTPS mais comuns',
  ],
  skills: ['redes-dns-tls'],
  terms: [
    t('handshake do TLS', 'TLS handshake', 'A troca inicial de mensagens em que cliente e servidor combinam versão, algoritmos e chaves, e o servidor prova quem é.'),
    t('compartilhamento de chave', 'key share', 'A metade pública e efêmera da troca de chaves Diffie-Hellman que cada lado envia no hello.'),
    t('sigilo futuro', 'forward secrecy', 'Garantia de que o vazamento futuro da chave privada do servidor não decifra conversas gravadas no passado, porque cada sessão usou chaves efêmeras.', 'TLS 1.3 provides forward secrecy for all full handshakes.'),
    t('indicação do nome do servidor', 'Server Name Indication (SNI)', 'Extensão do ClientHello com o nome do site, para o servidor escolher o certificado certo quando vários sites dividem o mesmo IP.'),
    t('negociação do protocolo de aplicação', 'Application-Layer Protocol Negotiation (ALPN)', 'Extensão do TLS em que o cliente lista os protocolos que fala (h2, http/1.1) e o servidor escolhe um, sem RTT extra.'),
    t('retomada de sessão', 'session resumption', 'Reabrir uma sessão TLS com uma chave combinada numa conexão anterior (PSK), pulando parte do trabalho.'),
    t('dados antecipados', 'early data (0-RTT)', 'Dados de aplicação enviados junto com o ClientHello numa retomada, antes de o handshake terminar.'),
    t('ataque de repetição', 'replay attack', 'Gravar uma mensagem legítima e reenviá-la para que seja processada de novo.'),
    t('nome alternativo do titular', 'Subject Alternative Name (SAN)', 'Extensão do certificado com a lista de nomes (e IPs) que ele cobre; é o campo que os navegadores conferem.'),
    t('certificado curinga', 'wildcard certificate', 'Certificado com um nome como *.loja.com.br, que cobre exatamente um rótulo naquela posição.'),
    t('cadeia de certificados', 'certificate chain', 'A sequência folha → intermediárias → raiz, em que cada certificado é assinado pelo seguinte.'),
    t('certificado intermediário', 'intermediate certificate', 'Certificado de uma CA assinado pela raiz (ou por outra intermediária), usado no dia a dia para emitir certificados de sites.'),
    t('repositório de confiança', 'trust store (root store)', 'O conjunto de certificados raiz em que o sistema ou o navegador confia de antemão.'),
    t('revogação', 'revocation', 'Invalidar um certificado antes do vencimento, por exemplo porque a chave privada vazou.'),
    t('transparência de certificados', 'Certificate Transparency (CT)', 'Registros públicos e só de acréscimo onde as CAs publicam todo certificado que emitem.'),
    t('TLS mútuo', 'mutual TLS (mTLS)', 'TLS em que o cliente também apresenta um certificado e prova possuir a chave dele.'),
    t('segurança de transporte estrita', 'HTTP Strict Transport Security (HSTS)', 'Cabeçalho que manda o navegador usar só HTTPS com aquele domínio por um período.', 'Strict-Transport-Security: max-age=31536000; includeSubDomains'),
  ],
  stages: {
    conceito: [
      md(`
        A primeira lição deste módulo disse **o que** o TLS garante: ninguém no caminho lê, altera ou se passa pelo site. Esta lição mostra **como**, em duas partes:

        - o {{handshake do TLS|TLS handshake}} 1.3, em que cliente e servidor, sem nenhum segredo em comum, combinam chaves novas e o servidor prova que é quem diz ser, tudo em **um** RTT;
        - a **validação do certificado**, em que o cliente decide se confia: monta a {{cadeia de certificados|certificate chain}} até uma raiz que já conhece, confere datas e confere o nome.

        A maior parte dos problemas reais de HTTPS está na segunda parte: certificado vencido, nome que não bate, servidor que esquece de mandar o intermediário, relógio errado no computador. Quem entende a cadeia diagnostica esses erros em minutos. A matemática das cifras e das assinaturas fica para o nível de segurança; aqui, elas são caixas-pretas com contrato conhecido: uma assinatura só pode ser feita por quem tem a chave privada e pode ser conferida por qualquer um com a chave pública.
      `),
    ],
    explicacao: [
      md(`
        ### O handshake do TLS 1.3, mensagem por mensagem
        No diagrama, \`{ }\` é o que vai cifrado com as chaves do handshake e \`[ ]\` o que vai cifrado com as chaves da aplicação.
      `),
      code('text', `
        Cliente                                               Servidor
        ClientHello: versões, suítes, key_share,
                     SNI, ALPN, algoritmos de assinatura ──────►
                                         ◄────── ServerHello: suíte escolhida, key_share
                                                 {EncryptedExtensions}: ALPN escolhido
                                                 {Certificate}: a cadeia do servidor
                                                 {CertificateVerify}: assinatura do transcrito
                                                 {Finished}: HMAC do transcrito
        {Finished}
        [GET / ...] ──────────────────────────────►
                                         ◄────── [resposta HTTP]
      `, 'O handshake completo do TLS 1.3 (RFC 8446), sem certificado de cliente.'),
      md(`
        - **ClientHello.** O cliente não pergunta quais grupos de troca de chaves o servidor aceita: ele **chuta** (hoje, X25519 ou a troca híbrida com X25519 da caixa abaixo) e já manda o seu {{compartilhamento de chave|key share}}, a parte pública de um Diffie-Hellman efêmero. Junto vão as suítes de cifra, o nome do site e os protocolos de aplicação que ele fala.
        - **ServerHello.** O servidor escolhe a suíte e manda o próprio key share. A partir daqui os dois lados calculam o mesmo segredo e derivam as chaves do handshake; **tudo o que vem depois já vai cifrado**, inclusive o certificado (no TLS 1.2, ele passava em claro). Se o chute do cliente errou o grupo, o servidor responde com HelloRetryRequest e o handshake custa um RTT a mais.
        - **Certificate.** A cadeia do servidor: o certificado do site e os intermediários.
        - **CertificateVerify.** Uma assinatura, feita com a chave privada do certificado, sobre o hash de todas as mensagens até ali (o *transcrito*). O certificado é público: qualquer um pode copiá-lo e apresentá-lo. Só quem tem a chave privada consegue assinar **este** handshake, que inclui os valores aleatórios desta conexão.
        - **Finished.** Um HMAC, com uma chave derivada do segredo combinado, sobre o transcrito inteiro. Se alguém no caminho alterou qualquer mensagem (por exemplo, apagou do ClientHello as suítes fortes para forçar uma fraca), os dois lados viram transcritos diferentes e o Finished não confere.

        Logo depois do próprio Finished, o cliente já manda a requisição HTTP. Como as chaves vêm de valores efêmeros, jogados fora no fim da sessão, todo handshake completo do TLS 1.3 tem {{sigilo futuro|forward secrecy}}: se a chave privada do servidor vazar ano que vem, o tráfego gravado hoje continua ilegível. (As exceções são as retomadas, que você verá abaixo: os dados 0-RTT e uma retomada só com a chave pré-compartilhada, sem novo Diffie-Hellman, dependem de uma chave guardada e não têm essa garantia.) O TLS 1.3 também **removeu** o que dava problema no 1.2: troca de chaves por RSA (sem sigilo futuro), cifras CBC, compressão, renegociação. As suítes caíram para cinco, todas com cifra autenticada (\`TLS_AES_128_GCM_SHA256\`, \`TLS_AES_256_GCM_SHA384\`, \`TLS_CHACHA20_POLY1305_SHA256\` e duas variantes CCM). TLS 1.0 e 1.1 foram oficialmente aposentados em 2021 (RFC 8996); o 1.2 bem configurado ainda é aceitável.
      `),
      deep(`
        O ClientHello do TLS 1.3 diz, no campo de versão, que é **TLS 1.2** (0x0303); a versão real vai numa extensão, \`supported_versions\`. Motivo: nos testes, firewalls e outros equipamentos no caminho derrubavam conexões com um número de versão que não conheciam. É a mesma ossificação que levou o QUIC a cifrar quase todo o cabeçalho: o que fica visível no fio acaba congelado pelos equipamentos do meio.

        Outra mudança em curso: computadores quânticos grandes, se um dia existirem, quebrariam o Diffie-Hellman de hoje, e quem grava tráfego agora poderia decifrá-lo depois. Por isso, desde o fim de 2024 o Chrome usa por padrão uma troca **híbrida**, X25519MLKEM768, que combina o X25519 com o ML-KEM (padronizado pelo NIST em 2024); a conexão só é quebrada se os dois forem.
      `, 'Duas curiosidades do ClientHello'),
      md(`
        ### Quanto custa: RTTs até a primeira resposta
        Antes do TLS vem o handshake do TCP (1 RTT). Somando a ida e a volta da própria requisição, numa conexão nova:
      `),
      {
        type: 'table',
        head: ['Pilha', 'Handshakes antes da requisição', 'Resposta chega após', 'Com RTT de 120 ms (São Paulo ↔ Virgínia)'],
        rows: [
          ['HTTP/1.1 ou 2 sobre TCP + TLS 1.2', '1 (TCP) + 2 (TLS)', '4 RTT', '480 ms'],
          ['HTTP/1.1 ou 2 sobre TCP + TLS 1.3', '1 + 1', '3 RTT', '360 ms'],
          ['TCP + TLS 1.3, retomada com 0-RTT', '1 + 0', '2 RTT', '240 ms'],
          ['HTTP/3 (QUIC), conexão nova', '1 (transporte e TLS juntos)', '2 RTT', '240 ms'],
          ['HTTP/3, retomada com 0-RTT', '0', '1 RTT', '120 ms'],
        ],
        caption: 'Por isso CDNs põem servidores perto dos usuários: cada RTT a menos, multiplicado pelos handshakes, aparece direto no tempo de carregamento.',
      },
      md(`
        **Retomada e 0-RTT.** Depois do handshake, o servidor pode mandar um "bilhete" (NewSessionTicket) com uma chave pré-compartilhada (PSK). Na próxima visita, o cliente faz uma {{retomada de sessão|session resumption}} com ela e pode até mandar {{dados antecipados|early data (0-RTT)}}: a requisição vai **junto** com o ClientHello. O preço é duplo: esses dados vão cifrados só com a chave do bilhete (sem sigilo futuro) e, principalmente, não têm proteção contra {{ataque de repetição|replay attack}}: quem gravou o primeiro voo pode reenviá-lo, e o servidor o processaria de novo. Por isso, 0-RTT só serve para requisições **idempotentes e seguras**, como um GET do catálogo; nunca para um POST que cria uma transferência Pix. Servidores e CDNs podem recusar early data ou responder \`425 Too Early\` (RFC 8470) para o cliente repetir depois do handshake.

        ### O que vai no ClientHello: SNI, ECH e ALPN
        Um mesmo IP de CDN atende milhares de sites, cada um com o seu certificado. O servidor precisa saber qual site você quer **antes** de escolher o certificado, e isso acontece antes de existir qualquer chave. Por isso a {{indicação do nome do servidor|Server Name Indication (SNI)}} vai em claro no ClientHello, e é assim que a operadora ou o firewall da empresa veem o nome do site mesmo com HTTPS. A extensão **ECH** (*Encrypted Client Hello*) cifra o ClientHello "de dentro" com uma chave pública que o site publica no registro DNS HTTPS; por fora, o SNI mostra só o nome do provedor. Chrome, Firefox e Cloudflare já a suportam, mas ela só esconde o nome se a consulta DNS também for cifrada (DNS sobre HTTPS ou TLS); senão, a própria consulta entrega o nome.

        A {{negociação do protocolo de aplicação|Application-Layer Protocol Negotiation (ALPN)}} é a peça que faltava na lição anterior: o cliente lista \`h2, http/1.1\` no ClientHello e o servidor escolhe um na EncryptedExtensions. Assim o HTTP/2 é escolhido sem custar nenhum RTT. No QUIC, o mesmo mecanismo negocia o \`h3\`.

        ### O certificado X.509: os campos que importam
      `),
      {
        type: 'table',
        head: ['Campo', 'Exemplo', 'Para que serve'],
        rows: [
          ['Subject (titular)', 'CN=loja.exemplo.com.br', 'quem é o titular; para a conferência de nome, os navegadores não usam mais o CN'],
          ['Subject Alternative Name', 'DNS:loja.exemplo.com.br, DNS:*.loja.exemplo.com.br', 'os nomes que o certificado cobre: é **este** campo que o cliente confere'],
          ['Issuer (emissor)', 'CN=AC Intermediária Exemplo', 'quem assinou; deve ser igual ao Subject do próximo certificado da cadeia'],
          ['Validity', 'notBefore 2026-08-01, notAfter 2027-02-16', 'o intervalo em que o certificado vale'],
          ['Public Key', 'chave EC P-256 ou RSA 2048', 'a chave que confere o CertificateVerify'],
          ['Basic Constraints', 'CA:FALSE (site) ou CA:TRUE (autoridade)', 'se este certificado pode assinar outros certificados'],
          ['Extended Key Usage', 'serverAuth', 'para que a chave pode ser usada (servidor TLS, cliente TLS, assinatura de código...)'],
          ['assinatura', 'ECDSA com SHA-256', 'a assinatura do emissor sobre todos os campos acima'],
        ],
      },
      md(`
        Desde 2017 (Chrome 58), os navegadores conferem o nome **só** no {{SAN|Subject Alternative Name (SAN)}}; um certificado com o nome apenas no CN é rejeitado. A validade máxima de um certificado público vem caindo: 398 dias desde 2020, **200 dias desde 15 de março de 2026**, e, pela votação SC-081 do CA/Browser Forum, 100 dias em 2027 e 47 dias em 2029. Certificados curtos limitam o estrago de uma chave vazada e obrigam a renovar de forma automática, com o protocolo **ACME** (RFC 8555), o mesmo do Let's Encrypt e do certbot (o Let's Encrypt emite certificados de 90 dias e já anunciou a redução para 45).

        ### A cadeia de confiança
      `),
      code('text', `
        Raiz Exemplo                  (autoassinada; já vem no sistema ou no navegador)
          └─ assina ─► AC Intermediária Exemplo     (o servidor manda)
                         └─ assina ─► loja.exemplo.com.br   (a folha; o servidor manda)
      `),
      md(`
        As raízes ficam no {{repositório de confiança|trust store (root store)}} do sistema operacional ou do navegador (Mozilla, Apple, Microsoft e Google mantêm programas próprios, com auditorias). A chave privada de uma raiz fica guardada offline, num cofre; quem emite no dia a dia é um {{certificado intermediário|intermediate certificate}}. Se um intermediário for comprometido, revoga-se só ele, sem trocar raízes em bilhões de aparelhos.

        Para aceitar a folha, o cliente:

        1. **Monta um caminho** da folha até uma raiz confiável: o Issuer de cada certificado precisa ser o Subject do próximo, e a assinatura de cada um precisa conferir com a chave pública do próximo. Os candidatos são os certificados que o servidor mandou e as raízes do repositório. Pode haver **mais de um caminho**, e um bom validador tenta outro quando o primeiro falha.
        2. Confere que cada emissor no caminho **é uma CA** (Basic Constraints CA:TRUE) e pode emitir para servidores.
        3. Confere a **validade** de todos os certificados do caminho na data de hoje, pelo relógio do próprio computador.
        4. Confere o **nome** do site contra o SAN da folha.
        5. Conforme o cliente, confere **revogação** e a prova de **Certificate Transparency**.

        **Regras de nome.** A comparação ignora maiúsculas e o ponto final de um nome absoluto (\`loja.com.br.\`). Um {{certificado curinga|wildcard certificate}} \`*.loja.com.br\` cobre **exatamente um rótulo** no lugar do \`*\`: cobre \`pix.loja.com.br\`, mas não \`loja.com.br\` (falta um rótulo) nem \`a.pix.loja.com.br\` (sobra um). Na prática, o \`*\` só vale como rótulo inteiro, o mais à esquerda: \`w*.loja.com.br\` ou \`api.*.com.br\` não casam com nada nos navegadores. E os navegadores recusam curingas sobre sufixos públicos, como \`*.com.br\`, consultando a *Public Suffix List*.
      `),
      {
        type: 'table',
        head: ['Erro', 'Causa típica', 'Como resolver'],
        rows: [
          ['`NET::ERR_CERT_DATE_INVALID` (Chrome)', 'certificado vencido, ou o relógio do computador está errado', 'automatizar a renovação (ACME); acertar o relógio do computador'],
          ['`NET::ERR_CERT_COMMON_NAME_INVALID`', 'o nome acessado não está no SAN (ex.: o certificado cobre `www.loja.com.br` e o usuário digitou `loja.com.br`)', 'emitir o certificado com todos os nomes usados'],
          ['`NET::ERR_CERT_AUTHORITY_INVALID`', 'certificado autoassinado ou de uma raiz que o aparelho não conhece', 'usar uma CA pública; numa rede corporativa, instalar a raiz interna nas máquinas'],
          ['`unable to get local issuer certificate` (OpenSSL, Python, curl)', 'o servidor mandou só a folha, sem o intermediário', 'configurar a cadeia completa (o `fullchain.pem` do certbot, não o `cert.pem`)'],
        ],
        caption: 'Os erros de certificado que mais aparecem, e a causa por trás de cada um.',
      },
      warn(`
        O último erro da tabela confunde muita gente porque o site **abre no navegador**. Alguns navegadores completam a cadeia sozinhos: buscam o intermediário que falta no endereço indicado no próprio certificado (o campo AIA) ou já trazem os intermediários conhecidos. Bibliotecas como o OpenSSL, usado pelo Python e pelo curl, não fazem isso, e a integração do parceiro falha. Teste o servidor com \`openssl s_client\` ou \`curl\`, não só com o navegador.
      `, 'Funciona no Chrome, falha no Python'),
      md(`
        ### Revogação, CT e CAA: quem vigia as CAs
        - **{{Revogação|revocation}}.** A CA publica listas de certificados revogados (CRL); o OCSP, uma consulta online por certificado, ficou opcional pelas regras do CA/Browser Forum em 2023 por ser lento e por contar à CA quais sites você visita. Em 2025 o Let's Encrypt encerrou o OCSP e ficou só com CRLs. Os navegadores distribuem listas agregadas e comprimidas (CRLite no Firefox, CRLSets no Chrome). Na prática, a defesa mais forte é a validade curta.
        - **{{Transparência de certificados|Certificate Transparency (CT)}}.** As CAs públicas publicam cada certificado emitido em registros públicos, só de acréscimo; Chrome, Safari e (desde 2025) o Firefox recusam certificados sem prova de registro. Em sites como o crt.sh você vê todos os certificados já emitidos para o seu domínio, e descobre se alguém emitiu um sem você saber.
        - **CAA.** Um registro DNS diz quais CAs podem emitir para o domínio: \`loja.com.br. CAA 0 issue "letsencrypt.org"\`. Toda CA pública é obrigada a consultá-lo antes de emitir.
        - **Prova de domínio no ACME.** Para emitir, a CA pede uma prova de controle: um arquivo em \`http://loja.com.br/.well-known/acme-challenge/...\` (HTTP-01) ou um registro TXT em \`_acme-challenge.loja.com.br\` (DNS-01, o desafio usado para emitir curingas, que o HTTP-01 não cobre). O DNS da primeira lição do módulo aparece de novo em todo canto.

        ### HSTS e mTLS
        Quem digita \`loja.com.br\` na barra de endereços começa, sem perceber, em \`http://\`. Num Wi-Fi aberto de rodoviária, um atacante pode interceptar esse primeiro pedido e manter a vítima em HTTP (o ataque se chama *SSL stripping*). A {{segurança de transporte estrita|HTTP Strict Transport Security (HSTS)}} resolve: \`Strict-Transport-Security: max-age=31536000; includeSubDomains\` faz o navegador usar **só** HTTPS com aquele domínio por um ano, recusando até o botão "continuar mesmo assim". A primeira visita ainda fica exposta, a menos que o domínio esteja na *preload list* embutida nos navegadores.

        No {{TLS mútuo|mutual TLS (mTLS)}}, o servidor manda um CertificateRequest e o **cliente** também apresenta certificado e assina o transcrito. É o padrão entre sistemas: as APIs Pix que os bancos oferecem a empresas e o Open Finance Brasil exigem mTLS, e malhas de serviço (*service mesh*) o usam entre microsserviços.
      `),
    ],
    exemplo: [
      md(`
        Um cliente em Belém abre \`https://loja.exemplo.com.br\`, servida de São Paulo, com RTT de 50 ms, numa conexão nova sobre TCP:
      `),
      { type: 'viz', viz: 'tcp-handshake', caption: 'Primeiro, o handshake do TCP (1 RTT). O ClientHello do TLS já pode ir junto com o ACK final.' },
      {
        type: 'table',
        head: ['Tempo', 'Evento'],
        rows: [
          ['0 ms', 'cliente manda SYN'],
          ['50 ms', 'chega o SYN-ACK; cliente manda ACK e, colado, o ClientHello (SNI loja.exemplo.com.br, ALPN h2 e http/1.1, key share X25519)'],
          ['100 ms', 'chega o voo do servidor: ServerHello, {EncryptedExtensions: h2}, {Certificate}, {CertificateVerify}, {Finished}'],
          ['100 ms + alguns ms', 'cliente valida: monta o caminho folha → AC Intermediária Exemplo → Raiz Exemplo (no repositório), confere datas, nome no SAN e CT; confere a assinatura do CertificateVerify e o Finished'],
          ['~101 ms', 'cliente manda {Finished} e, no mesmo voo, a requisição HTTP/2 (HEADERS no fluxo 1)'],
          ['~151 ms', 'chega o primeiro byte da resposta: 3 RTT depois do SYN'],
        ],
      },
      md('A mesma investigação no terminal do seu computador mostra cada peça. A saída abaixo está resumida:'),
      code('bash', `
        $ openssl s_client -connect loja.exemplo.com.br:443 -servername loja.exemplo.com.br -alpn h2 </dev/null
        Certificate chain
         0 s:CN = loja.exemplo.com.br
           i:C = BR, O = Exemplo, CN = AC Intermediaria Exemplo
         1 s:C = BR, O = Exemplo, CN = AC Intermediaria Exemplo
           i:C = BR, O = Exemplo, CN = Raiz Exemplo
        ...
        New, TLSv1.3, Cipher is TLS_AES_128_GCM_SHA256
        ALPN protocol: h2
        Verify return code: 0 (ok)

        $ openssl s_client -connect loja.exemplo.com.br:443 -servername loja.exemplo.com.br </dev/null 2>/dev/null \\
            | openssl x509 -noout -subject -issuer -dates -ext subjectAltName
      `, 'O servidor mandou 2 certificados (folha e intermediário); a raiz veio do repositório local. "-servername" é o SNI; "-alpn" é o ALPN.'),
      tip('Se o `Verify return code` não for 0, a mensagem ao lado diz o motivo: `certificate has expired`, `unable to get local issuer certificate` (falta intermediário), `self-signed certificate in certificate chain`. Para conferir o nome, use também `-verify_hostname loja.exemplo.com.br`.'),
    ],
    codigo: [
      md('O Finished de perto. Esta simulação usa `hmac` e `hashlib` da biblioteca padrão para mostrar por que um atacante no meio não consegue rebaixar o handshake sem ser descoberto: ele pode alterar mensagens em claro, mas não conhece a chave para refazer o HMAC.'),
      py(`
        import hashlib
        import hmac

        def finished(chave, mensagens):
            """Finished do TLS 1.3, simplificado: HMAC sobre o hash do transcrito."""
            transcrito = hashlib.sha256("\\n".join(mensagens).encode()).digest()
            return hmac.new(chave, transcrito, hashlib.sha256).hexdigest()[:16]

        # Na vida real, a chave é derivada (com HKDF) do segredo do Diffie-Hellman efêmero.
        # O atacante vê os key shares públicos, mas não consegue calcular esse segredo.
        chave = hashlib.sha256(b"segredo combinado pelo ECDHE").digest()

        hello_original = "ClientHello suites=[AES_256_GCM, CHACHA20, AES_128_GCM] alpn=[h2, http/1.1]"
        hello_alterado = "ClientHello suites=[AES_128_GCM] alpn=[http/1.1]"   # mexido no caminho
        resto = ["ServerHello suite=AES_128_GCM", "EncryptedExtensions alpn=http/1.1", "Certificate ...", "CertificateVerify ..."]

        for rotulo, hello_no_servidor in [("sem ataque", hello_original), ("com ataque", hello_alterado)]:
            do_servidor = finished(chave, [hello_no_servidor] + resto)    # o que o servidor viu
            do_cliente = finished(chave, [hello_original] + resto)        # o que o cliente enviou
            ok = hmac.compare_digest(do_servidor, do_cliente)
            print(f"{rotulo}: servidor {do_servidor}  cliente {do_cliente}  ->",
                  "segue" if ok else "ABORTA o handshake")
      `, { caption: 'Mude uma letra de qualquer mensagem do transcrito e o Finished muda inteiro. No TLS 1.3 real, até as chaves do handshake dependem do transcrito.' }),
      md('E o cliente TLS de verdade, com o módulo `ssl` do Python. Ele não roda aqui (o navegador não abre sockets); rode no seu computador:'),
      code('python', `
        import socket
        import ssl

        host = "www.gov.br"
        ctx = ssl.create_default_context()          # confere a cadeia e o nome por padrão
        ctx.set_alpn_protocols(["h2", "http/1.1"])
        with socket.create_connection((host, 443), timeout=5) as tcp:
            with ctx.wrap_socket(tcp, server_hostname=host) as tls:   # server_hostname vira o SNI
                print(tls.version(), tls.cipher()[0], tls.selected_alpn_protocol())
                cert = tls.getpeercert()
                print("emissor:", dict(x[0] for x in cert["issuer"]).get("organizationName"))
                print("vence em:", cert["notAfter"])
                print("nomes:", [v for k, v in cert["subjectAltName"]][:5])
      `, 'Para rodar no seu computador. Nunca desligue a verificação (verify=False, CERT_NONE) em produção: isso aceita qualquer certificado, inclusive o de quem está no meio.'),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e9-tls-cert-1',
          kind: 'parsons',
          lang: 'text',
          prompt: 'Coloque as mensagens de um handshake completo do TLS 1.3 (sem certificado de cliente) na ordem em que são enviadas, até a primeira requisição HTTP.',
          lines: [
            'C → S  ClientHello (key_share, SNI, ALPN)',
            'S → C  ServerHello (key_share)',
            'S → C  {EncryptedExtensions} (ALPN escolhido)',
            'S → C  {Certificate}',
            'S → C  {CertificateVerify}',
            'S → C  {Finished}',
            'C → S  {Finished}',
            'C → S  [requisição HTTP]',
          ],
          difficulty: 'facil',
          skills: ['redes-dns-tls'],
          hints: [
            'Depois de qual mensagem os dois lados já têm o segredo para cifrar o resto?',
            'O CertificateVerify assina o transcrito "até ali". Ele pode vir antes do certificado que contém a chave que o confere?',
            'Quem manda o primeiro Finished, e quando o cliente pode começar a mandar dados?',
          ],
          explanation: 'O ClientHello já leva o key share; com o ServerHello, os dois calculam o segredo, e o resto do voo do servidor vai cifrado: EncryptedExtensions (com o ALPN), Certificate, CertificateVerify (que precisa vir depois do certificado, cuja chave o confere, e assina tudo até ali) e Finished. O cliente valida tudo, manda o próprio Finished e, no mesmo voo, a requisição. Por isso o TLS 1.3 custa um RTT só.',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e9-tls-cert-2',
          kind: 'fill',
          lang: 'text',
          prompt: 'Complete com o número de RTTs, contados a partir do primeiro pacote do cliente, até chegar o primeiro byte da resposta HTTP. Considere conexões novas, a não ser onde está escrito "retomada".',
          template: 'HTTP/2 sobre TCP + TLS 1.3: ___ RTTs\nHTTP/2 sobre TCP + TLS 1.2: ___ RTTs\nHTTP/3 (QUIC): ___ RTTs\nHTTP/3 numa retomada com 0-RTT: ___ RTT',
          blanks: [['3'], ['4'], ['2'], ['1']],
          difficulty: 'intermediario',
          skills: ['redes-dns-tls', 'redes-tcpip'],
          hints: [
            'Quantos RTTs custa o handshake do TCP? E o do TLS 1.3? E o do TLS 1.2?',
            'Depois dos handshakes, a requisição ainda precisa ir e a resposta voltar. Isso custa quanto?',
            'O QUIC faz o handshake de transporte e o do TLS ao mesmo tempo. E no 0-RTT, o que vai junto com o primeiro pacote?',
          ],
          explanation: 'TCP custa 1 RTT; TLS 1.3, 1; TLS 1.2, 2; e a requisição com a resposta, mais 1. Então: TCP + TLS 1.3 = 1 + 1 + 1 = 3; TCP + TLS 1.2 = 1 + 2 + 1 = 4; QUIC junta transporte e TLS num RTT só: 1 + 1 = 2; e no 0-RTT a requisição vai junto com o primeiro pacote, então a resposta volta em 1 RTT. Com o servidor do outro lado do continente (RTT de 120 ms), são 480 ms contra 120 ms antes do primeiro byte.',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e9-tls-cert-3',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Escreva \`nome_confere(nomes, host)\`, que diz se o \`host\` está coberto pela lista \`nomes\` do SAN de um certificado, com as regras da lição:

            - a comparação ignora maiúsculas e um ponto final (\`"Loja.com.br."\` é o mesmo que \`"loja.com.br"\`);
            - um nome sem \`*\` casa só com o host idêntico;
            - um curinga só vale se for \`*.\` seguido de um nome sem nenhum outro \`*\`, e então casa com hosts que têm **exatamente um rótulo não vazio** a mais na frente: \`*.loja.com.br\` cobre \`pix.loja.com.br\`, mas não \`loja.com.br\` nem \`a.pix.loja.com.br\`;
            - qualquer outro uso de \`*\` (\`w*.loja.com.br\`, \`api.*.com.br\`) não casa com nada.

            Ignore a regra dos sufixos públicos.
          `),
          difficulty: 'intermediario',
          skills: ['redes-dns-tls'],
          hints: [
            'Antes de comparar, normalize os dois lados do mesmo jeito. Quais métodos de str tiram o ponto final e as maiúsculas?',
            'Para um curinga válido, o que precisa ser igual: o host inteiro ou o host sem o primeiro rótulo?',
            '`host.partition(".")` separa o primeiro rótulo do resto. O que acontece com um host que começa com ponto?',
            'Por que `host.endswith("loja.com.br")` aceitaria coisas demais? Teste com `xloja.com.br` e `a.pix.loja.com.br`.',
          ],
          explanation: 'Normalize host e padrão (minúsculas, sem ponto final). Sem asterisco, compare por igualdade. Com curinga válido (começa com "*." e não tem outro "*"), separe o primeiro rótulo do host: ele precisa ser não vazio e o resto precisa ser idêntico ao padrão sem o "*.". Comparar por sufixo é o erro clássico: aceita "xloja.com.br" para "loja.com.br" e vários rótulos no lugar do curinga. E fnmatch também não serve: nele, o * casa com pontos.',
          starter: dedent(`
            def nome_confere(nomes, host):
                # nomes: lista de nomes do SAN (podem ter curinga)
                # devolva True se algum deles cobre o host
                pass
          `),
          solution: dedent(`
            def nome_confere(nomes, host):
                host = host.lower().rstrip(".")
                for padrao in nomes:
                    padrao = padrao.lower().rstrip(".")
                    if "*" not in padrao:
                        if padrao == host:
                            return True
                    elif padrao.startswith("*.") and "*" not in padrao[2:]:
                        rotulo, _, resto = host.partition(".")
                        if rotulo and resto == padrao[2:]:
                            return True
                return False
          `),
          tests: [
            {
              name: 'nomes exatos',
              code: dedent(`
                assert nome_confere(["loja.com.br"], "loja.com.br") is True, "o nome idêntico precisa casar (devolva True ou False)"
                assert nome_confere(["www.loja.com.br", "loja.com.br"], "loja.com.br"), "basta um nome da lista casar"
                assert not nome_confere(["www.loja.com.br"], "loja.com.br"), "www.loja.com.br não cobre loja.com.br: é o erro ERR_CERT_COMMON_NAME_INVALID"
                assert not nome_confere(["loja.com.br"], "xloja.com.br"), "xloja.com.br não é loja.com.br: comparar por sufixo aceita demais"
                assert not nome_confere([], "loja.com.br"), "sem nomes, nada é coberto"
              `),
            },
            {
              name: 'maiúsculas e ponto final',
              code: dedent(`
                assert nome_confere(["Loja.COM.br"], "loja.com.br."), "ignore maiúsculas e o ponto final, nos dois lados"
                assert nome_confere(["*.loja.com.br."], "PIX.Loja.com.br"), "a normalização vale também para curingas"
              `),
            },
            {
              name: 'curinga cobre exatamente um rótulo',
              code: dedent(`
                assert nome_confere(["*.loja.com.br"], "pix.loja.com.br"), "*.loja.com.br cobre pix.loja.com.br"
                assert not nome_confere(["*.loja.com.br"], "loja.com.br"), "*.loja.com.br não cobre loja.com.br: falta o rótulo do curinga"
                assert not nome_confere(["*.loja.com.br"], "a.pix.loja.com.br"), "o curinga cobre um rótulo só, não dois"
                assert not nome_confere(["*.loja.com.br"], ".loja.com.br"), "o rótulo no lugar do * não pode ser vazio"
                assert not nome_confere(["*.loja.com.br"], "pix.loja.com.br.golpe.net"), "o resto do host precisa ser idêntico ao padrão, não só começar igual"
                assert nome_confere(["loja.com.br", "*.loja.com.br"], "loja.com.br") and nome_confere(["loja.com.br", "*.loja.com.br"], "app.loja.com.br"), "o par mais comum de SAN cobre o domínio e um nível abaixo"
              `),
            },
            {
              name: 'outros usos de * não casam',
              code: dedent(`
                assert not nome_confere(["w*.loja.com.br"], "www.loja.com.br"), "curinga parcial (w*) não vale"
                assert not nome_confere(["api.*.com.br"], "api.loja.com.br"), "o * só vale como o rótulo mais à esquerda"
                assert not nome_confere(["*.*.com.br"], "a.loja.com.br"), "um segundo * invalida o padrão"
                assert not nome_confere(["*"], "localhost"), "um * sozinho não é curinga válido"
                assert "fnmatch" not in _source, "não use fnmatch: nele o * casa também com pontos"
              `),
            },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e9-tls-cert-4',
          kind: 'mcq',
          prompt: 'Você trocou o certificado do servidor da API. No navegador, o site abre com cadeado. Mas a integração do parceiro, em Python com `requests`, passou a falhar com `certificate verify failed: unable to get local issuer certificate`, e o `curl` falha igual. O relógio das máquinas está certo. Causa mais provável?',
          difficulty: 'intermediario',
          skills: ['redes-dns-tls'],
          hints: [
            'O que o servidor precisa mandar, além do certificado do próprio site, para o cliente chegar a uma raiz?',
            'Por que o navegador conseguiria completar algo que o Python e o curl não completam?',
          ],
          explanation: 'O servidor foi configurado só com o certificado da folha (o cert.pem), sem o intermediário. O Python e o curl usam o OpenSSL, que tenta montar o caminho só com o que o servidor mandou e com as raízes locais; sem o intermediário, não chegam à raiz. Navegadores muitas vezes completam a cadeia sozinhos (buscando pelo campo AIA ou com intermediários que já conhecem), e mascaram o erro. A correção é configurar o servidor com a cadeia completa (fullchain.pem).',
          options: [
            { text: 'O servidor está mandando só o certificado do site, sem o intermediário', correct: true, feedback: 'Isso: sem o intermediário, o OpenSSL não liga a folha a uma raiz. O navegador completou a cadeia sozinho e escondeu o problema. Configure a cadeia completa.' },
            { text: 'O certificado novo não tem o nome da API no SAN', feedback: 'Nome errado daria um erro de hostname mismatch, e o navegador também reclamaria. A mensagem "unable to get local issuer certificate" é sobre montar a cadeia, não sobre o nome.' },
            { text: 'O Python não suporta TLS 1.3', feedback: 'O módulo ssl do Python suporta TLS 1.3 há anos, e uma incompatibilidade de versão daria erro de handshake, não de emissor. O erro diz que falta um certificado para chegar à raiz.' },
            { text: 'A raiz da nova CA é desconhecida no mundo todo; só o navegador a aceita', feedback: 'Se a raiz fosse desconhecida, o erro seria de certificado autoassinado ou de CA desconhecida, e em geral o navegador também recusaria. CAs públicas estão nos repositórios do sistema; o que falta aqui é o elo do meio.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e9-tls-cert-5',
          kind: 'mcq',
          prompt: 'Um app de banco quer ligar o 0-RTT (dados antecipados do TLS 1.3) para abrir mais rápido. Qual requisição pode ir com segurança nos dados 0-RTT?',
          difficulty: 'avancado',
          skills: ['redes-dns-tls', 'web-http-api'],
          hints: [
            'Que proteção os dados 0-RTT não têm, e que um handshake completo tem?',
            'Se um atacante gravar esse primeiro voo e reenviá-lo dez vezes, o que acontece com cada requisição da lista?',
            'Lembre do nível 6: quais métodos são seguros e idempotentes?',
          ],
          explanation: 'Dados 0-RTT podem ser repetidos por quem gravou o primeiro voo da conexão: o servidor não tem como distinguir a cópia da original antes de o handshake terminar. Uma requisição segura e idempotente, como um GET que só lê dados públicos, pode ser repetida sem efeito colateral. Uma transferência Pix, uma troca de senha ou um logout mudam o estado do servidor: repetidas, causam dano. Por isso servidores e CDNs costumam aceitar 0-RTT só para métodos seguros, e podem responder 425 Too Early para o cliente reenviar depois do handshake.',
          options: [
            { text: 'GET /agencias?cidade=Recife, que só lê a lista pública de agências', correct: true, feedback: 'Isso: é segura e idempotente. Se for repetida por um atacante, nada muda no servidor.' },
            { text: 'POST /pix/transferencias, porque o corpo vai cifrado', feedback: 'Estar cifrado não impede a repetição: o atacante não precisa ler a mensagem, só reenviá-la. Cada cópia poderia criar uma transferência nova.' },
            { text: 'POST /senha/alterar, porque exige o token de sessão', feedback: 'O token vai junto na cópia gravada, então a repetição passa com ele. A alteração de senha muda estado e não pode ir em 0-RTT.' },
            { text: 'Qualquer uma, porque o TLS 1.3 numera as mensagens e descarta repetidas', feedback: 'Dentro de uma conexão, sim; mas o atacante reenvia o primeiro voo inteiro como se fosse uma conexão nova, e o servidor só tem defesas parciais (janelas de tempo, bilhetes de uso único). A RFC 8446 avisa: 0-RTT não tem garantia contra repetição.' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e9-tls-cert-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Escreva \`validar(enviados, host, agora, raizes)\`, um validador de cadeia simplificado. Cada certificado é um dicionário \`{"sujeito": str, "emissor": str, "validade": (inicio, fim), "ca": bool, "nomes": [...]}\`, com datas no formato \`"AAAA-MM-DD"\` (strings nesse formato se comparam na ordem certa). \`enviados[0]\` é a folha; os demais são o que o servidor mandou, em qualquer ordem e talvez com sobras. \`raizes\` é o repositório de confiança. Aqui a assinatura é dada como certa quando o \`emissor\` de um certificado é igual ao \`sujeito\` do próximo; no mundo real, também se confere a assinatura com a chave pública do emissor.

            Na ordem:
            1. Se o \`host\` não está coberto pelos \`nomes\` da folha (regras do exercício anterior; reaproveite o seu \`nome_confere\`), devolva \`("nome", None)\`.
            2. Se \`agora\` está fora da validade da folha (\`inicio <= agora <= fim\`, inclusive), devolva \`("validade", None)\`.
            3. Procure um caminho da folha até uma raiz. A partir do certificado atual, o próximo precisa ter \`sujeito == atual["emissor"]\` e estar dentro da validade. **Primeiro** tente as raízes, na ordem da lista: achou uma, o caminho termina nela. **Depois** tente os intermediários enviados, na ordem em que vieram, desde que tenham \`ca\` verdadeiro e ainda não estejam no caminho, e continue a busca a partir dele. Se um intermediário não levar a uma raiz, **volte e tente o próximo**.
            4. Achou: devolva \`("ok", caminho)\`, com a lista dos \`sujeito\` da folha até a raiz. Não achou: \`("cadeia", None)\`.

            Este é o caso real de 30 de setembro de 2021, quando a raiz DST Root CA X3 venceu: muitos clientes que só conheciam a raiz antiga (e que conferiam a validade dela) pararam de aceitar certificados do Let's Encrypt, e os que também tinham a ISRG Root X1 seguiram funcionando por outro caminho.
          `),
          difficulty: 'avancado',
          skills: ['redes-dns-tls'],
          hints: [
            'Separe o problema: os passos 1 e 2 são verificações diretas sobre a folha; o passo 3 é uma busca num grafo.',
            'Uma função recursiva `subir(atual, caminho)` combina bem com "tente um; se não der certo, tente o próximo". O que ela devolve quando dá certo, e quando não dá?',
            'Por que é preciso lembrar quais intermediários já estão no caminho? Pense em dois intermediários que se assinam um ao outro.',
            'Dois certificados diferentes podem ter o mesmo sujeito (um deles assinado de forma cruzada por outra raiz). Como você marca "já usei este" sem confundir os dois?',
            'Quando um intermediário leva a um beco sem saída, a busca deve parar ou continuar no laço?',
          ],
          explanation: 'Validar uma cadeia é buscar um caminho num grafo: os vértices são certificados, e há aresta de A para B quando B emitiu A, é CA e está dentro da validade. A busca em profundidade com retrocesso é necessária porque a primeira opção nem sempre leva a uma raiz, como no caso de setembro de 2021: a cadeia enviada incluía a ISRG Root X1 assinada de forma cruzada pela DST Root CA X3, já vencida. Validadores que seguiam só o caminho enviado (como o OpenSSL 1.0.2) falharam; os que procuravam alternativas encontraram a ISRG Root X1 no próprio repositório. Marcar os intermediários pelo índice, e não pelo sujeito, evita laços sem confundir certificados de mesmo nome. Tentar as raízes primeiro faz o caminho terminar no certificado confiável mais próximo.',
          starter: dedent(`
            def validar(enviados, host, agora, raizes):
                # devolva ("nome", None), ("validade", None), ("cadeia", None)
                # ou ("ok", [sujeitos da folha até a raiz])
                pass
          `),
          solution: dedent(`
            def nome_confere(nomes, host):
                host = host.lower().rstrip(".")
                for padrao in nomes:
                    padrao = padrao.lower().rstrip(".")
                    if "*" not in padrao:
                        if padrao == host:
                            return True
                    elif padrao.startswith("*.") and "*" not in padrao[2:]:
                        rotulo, _, resto = host.partition(".")
                        if rotulo and resto == padrao[2:]:
                            return True
                return False

            def validar(enviados, host, agora, raizes):
                folha = enviados[0]
                if not nome_confere(folha["nomes"], host):
                    return ("nome", None)
                if not (folha["validade"][0] <= agora <= folha["validade"][1]):
                    return ("validade", None)
                intermediarios = enviados[1:]

                def em_vigor(c):
                    return c["validade"][0] <= agora <= c["validade"][1]

                def subir(atual, caminho, usados):
                    for raiz in raizes:
                        if raiz["sujeito"] == atual["emissor"] and em_vigor(raiz):
                            return caminho + [raiz["sujeito"]]
                    for i, c in enumerate(intermediarios):
                        if i not in usados and c["sujeito"] == atual["emissor"] and c["ca"] and em_vigor(c):
                            achou = subir(c, caminho + [c["sujeito"]], usados | {i})
                            if achou:
                                return achou
                    return None

                caminho = subir(folha, [folha["sujeito"]], frozenset())
                return ("ok", caminho) if caminho else ("cadeia", None)
          `),
          tests: [
            {
              name: 'cadeia simples, nome e validade da folha',
              code: REF_CADEIA + '\n' + dedent(`
                folha = C("loja.com.br", "AC Inter", "2026-08-01", "2027-02-16", ca=False, nomes=["loja.com.br", "*.loja.com.br"])
                inter = C("AC Inter", "Raiz Exemplo")
                raiz = C("Raiz Exemplo", "Raiz Exemplo")
                r = validar([folha, inter], "pix.loja.com.br", "2026-10-13", [raiz])
                assert r is not None and r[0] == "ok" and list(r[1]) == ["loja.com.br", "AC Inter", "Raiz Exemplo"], f"veio {r}; o caminho vai da folha até a raiz, pelos sujeitos"
                _confere([folha, inter], "a.pix.loja.com.br", "2026-10-13", [raiz], "o curinga cobre um rótulo só: erro de nome")
                _confere([folha, inter], "loja.com.br", "2027-03-01", [raiz], "a folha venceu em 2027-02-16")
                _confere([folha, inter], "loja.com.br", "2027-02-16", [raiz], "o último dia ainda vale (inicio <= agora <= fim)")
                _confere([folha, inter], "x.com.br", "2027-03-01", [raiz], "nome e validade errados: o nome é conferido primeiro")
              `),
            },
            {
              name: 'cadeia incompleta e raiz desconhecida',
              code: REF_CADEIA + '\n' + dedent(`
                folha = C("api.loja.com.br", "AC Inter", ca=False, nomes=["api.loja.com.br"])
                inter = C("AC Inter", "Raiz Exemplo")
                raiz = C("Raiz Exemplo", "Raiz Exemplo")
                _confere([folha], "api.loja.com.br", "2026-10-13", [raiz], "o servidor não mandou o intermediário: não há como chegar à raiz")
                _confere([folha, inter], "api.loja.com.br", "2026-10-13", [], "nenhuma raiz confiável no repositório")
                auto = C("api.loja.com.br", "api.loja.com.br", ca=False, nomes=["api.loja.com.br"])
                _confere([auto], "api.loja.com.br", "2026-10-13", [raiz], "certificado autoassinado que não está no repositório")
                _confere([folha, C("Outra AC", "Raiz Exemplo"), inter], "api.loja.com.br", "2026-10-13", [raiz], "certificados que sobram na lista são ignorados; a ordem dos enviados não importa")
              `),
            },
            {
              name: 'intermediário vencido ou que não é CA',
              code: REF_CADEIA + '\n' + dedent(`
                folha = C("loja.com.br", "AC Inter", ca=False, nomes=["loja.com.br"])
                raiz = C("Raiz Exemplo", "Raiz Exemplo")
                _confere([folha, C("AC Inter", "Raiz Exemplo", "2020-01-01", "2025-12-31")], "loja.com.br", "2026-10-13", [raiz], "o intermediário venceu: toda a cadeia precisa estar na validade")
                _confere([folha, C("AC Inter", "Raiz Exemplo", ca=False)], "loja.com.br", "2026-10-13", [raiz], "um certificado sem ca=True não pode emitir outros")
                _confere([folha, C("AC Inter", "Raiz Exemplo")], "loja.com.br", "2026-10-13", [C("Raiz Exemplo", "Raiz Exemplo", "2000-01-01", "2026-01-01")], "a raiz também precisa estar na validade")
              `),
            },
            {
              name: '30 de setembro de 2021',
              code: REF_CADEIA + '\n' + dedent(`
                folha = C("loja.com.br", "R3", "2021-09-01", "2021-11-30", ca=False, nomes=["loja.com.br"])
                r3 = C("R3", "ISRG Root X1", "2020-09-04", "2025-09-15")
                x1_cruzada = C("ISRG Root X1", "DST Root CA X3", "2021-01-20", "2024-09-30")
                dst = C("DST Root CA X3", "DST Root CA X3", "2000-09-30", "2021-09-30")
                x1 = C("ISRG Root X1", "ISRG Root X1", "2015-06-04", "2035-06-04")
                enviados = [folha, r3, x1_cruzada]
                r = validar(enviados, "loja.com.br", "2021-09-20", [dst])
                assert r is not None and r[0] == "ok" and list(r[1]) == ["loja.com.br", "R3", "ISRG Root X1", "DST Root CA X3"], f"antes do vencimento, o caminho pela raiz antiga funciona; veio {r}"
                _confere(enviados, "loja.com.br", "2021-10-01", [dst], "um aparelho antigo, só com a DST Root CA X3, vencida")
                r = validar(enviados, "loja.com.br", "2021-10-01", [dst, x1])
                assert r is not None and r[0] == "ok" and list(r[1]) == ["loja.com.br", "R3", "ISRG Root X1"], f"com a ISRG Root X1 no repositório, o caminho termina nela (raízes primeiro); veio {r}"
                r = validar(enviados, "loja.com.br", "2021-09-20", [dst, x1])
                assert r is not None and r[0] == "ok" and list(r[1]) == ["loja.com.br", "R3", "ISRG Root X1"], f"antes do vencimento os dois caminhos valem, mas as raízes são tentadas antes dos intermediários: o caminho para na ISRG Root X1 do repositório; veio {r}"
              `),
            },
            {
              name: 'é preciso voltar e tentar outro caminho',
              code: REF_CADEIA + '\n' + dedent(`
                folha = C("loja.com.br", "AC Inter", ca=False, nomes=["loja.com.br"])
                via_velha = C("AC Inter", "Raiz Velha")
                via_nova = C("AC Inter", "Raiz Nova")
                raiz_nova = C("Raiz Nova", "Raiz Nova")
                r = validar([folha, via_velha, via_nova], "loja.com.br", "2026-10-13", [raiz_nova])
                assert r is not None and r[0] == "ok" and list(r[1]) == ["loja.com.br", "AC Inter", "Raiz Nova"], f"o primeiro intermediário leva a uma raiz desconhecida; volte e tente o segundo. Veio {r}"
                a = C("AC A", "AC B")
                b = C("AC B", "AC A")
                folha2 = C("loja.com.br", "AC A", ca=False, nomes=["loja.com.br"])
                _confere([folha2, a, b], "loja.com.br", "2026-10-13", [raiz_nova], "dois intermediários que se assinam um ao outro: sem marcar os usados, a busca entra em laço")
                _confere([folha2, a, b, C("AC A", "Raiz Nova")], "loja.com.br", "2026-10-13", [raiz_nova], "depois de esgotar o laço A-B, ainda há um caminho por outra AC A")
              `),
            },
            {
              name: 'cadeias aleatórias',
              code: REF_CADEIA + '\n' + dedent(`
                _rng = _random.Random(5280)
                for _ in range(500):
                    enviados, host, agora, raizes = _gera(_rng)
                    _confere(enviados, host, agora, raizes)
              `),
            },
          ],
        },
      },
    ],
    projeto: [
      md(`
        **Audite um domínio de verdade.** Escolha o domínio de um serviço que você usa (a prefeitura da sua cidade, sua universidade, uma loja). No seu computador: (1) rode \`openssl s_client\` como no exemplo e anote a versão do TLS, a suíte, o ALPN e a cadeia (quantos certificados o servidor manda?); (2) veja os nomes do SAN e a data de vencimento; (3) consulte o domínio no crt.sh e conte quantos certificados foram emitidos no último ano e por quais CAs; (4) rode \`dig\` com os tipos CAA e HTTPS e veja se o domínio restringe as CAs e anuncia h3 ou ECH; (5) confira se as respostas trazem \`Strict-Transport-Security\`. Escreva um parágrafo com o que está bem configurado e o que você mudaria.
      `),
    ],
    revisao: [
      md(`
        - TLS 1.3: ClientHello já leva o key share → depois do ServerHello tudo vai cifrado (até o certificado) → Certificate, CertificateVerify (assinatura do transcrito: prova a posse da chave) e Finished (HMAC do transcrito: detecta alterações) → o cliente manda Finished e a requisição. 1 RTT, com sigilo futuro em todo handshake completo (dados 0-RTT não têm).
        - Até a primeira resposta: TCP + TLS 1.2 = 4 RTT; TCP + TLS 1.3 = 3; QUIC = 2; QUIC com 0-RTT = 1. Dados 0-RTT podem ser repetidos: só requisições seguras e idempotentes.
        - SNI vai em claro (ECH esconde, com chave publicada no DNS HTTPS); ALPN escolhe h2/http/1.1 (e h3 no QUIC) sem RTT extra.
        - O nome é conferido no SAN; \`*.loja.com.br\` cobre exatamente um rótulo. Validade máxima: 200 dias desde março de 2026, caindo para 47 até 2029; renove com ACME.
        - Validação: caminho da folha até uma raiz do repositório (com retrocesso entre caminhos alternativos), emissores com CA:TRUE, todas as datas, nome, revogação e CT.
        - Erros comuns: data (vencido ou relógio), nome fora do SAN, raiz desconhecida, intermediário faltando (abre no navegador, falha no Python).
        - CAA restringe as CAs no DNS; CT torna toda emissão pública; HSTS impede o rebaixamento para HTTP; mTLS autentica o cliente (Pix, Open Finance).
      `),
      english(`
        - **handshake, key share, transcript hash, forward secrecy**: aperto de mão, compartilhamento de chave, hash do transcrito, sigilo futuro
        - **session resumption, early data (0-RTT), replay attack**: retomada de sessão, dados antecipados, ataque de repetição
        - **certificate chain, leaf/intermediate/root certificate, trust store, cross-signed**: cadeia de certificados, certificado folha/intermediário/raiz, repositório de confiança, assinado de forma cruzada
        - **Subject Alternative Name, wildcard, hostname mismatch, expired certificate, revocation**: nome alternativo do titular, curinga, nome que não confere, certificado vencido, revogação

        Frase típica de entrevista: *"During the TLS 1.3 handshake, the client sends its key share in the ClientHello, so the server can derive the handshake keys right away and encrypt its certificate. The CertificateVerify message proves the server owns the private key, and the Finished messages authenticate the whole transcript."*

        Frase típica de documentação: *"Make sure your server sends the full certificate chain, including any intermediate certificates; otherwise some clients will fail with 'unable to get local issuer certificate'."*
      `),
    ],
  },
  review: [
    ['Por que, no TLS 1.3, o certificado do servidor já vai cifrado, e no TLS 1.2 não ia?', 'Porque o cliente manda o key share no ClientHello; com o ServerHello, os dois lados já têm o segredo e cifram todo o resto, inclusive o certificado.'],
    ['O que o CertificateVerify prova, e por que o certificado sozinho não basta?', 'Que o servidor tem a chave privada do certificado, assinando o transcrito deste handshake. O certificado é público: qualquer um pode copiá-lo.'],
    ['O que a mensagem Finished protege?', 'A integridade do handshake inteiro: é um HMAC do transcrito com chave derivada do segredo combinado; qualquer alteração no caminho (como rebaixar suítes) faz ela não conferir.'],
    ['Quantos RTTs até o primeiro byte da resposta com TCP + TLS 1.3, e com HTTP/3 numa conexão nova?', '3 RTTs (TCP, TLS, requisição) e 2 RTTs (QUIC+TLS juntos, requisição).'],
    ['Por que dados 0-RTT só servem para requisições seguras e idempotentes?', 'Porque podem ser gravados e reenviados (replay) sem que o servidor perceba antes do fim do handshake.'],
    ['Que nomes *.loja.com.br cobre?', 'Exatamente um rótulo a mais: pix.loja.com.br sim; loja.com.br e a.pix.loja.com.br não.'],
    ['Por que um site pode abrir no Chrome e falhar no Python com "unable to get local issuer certificate"?', 'O servidor não mandou o intermediário. O navegador completa a cadeia sozinho (AIA ou cache); o OpenSSL não. Solução: servir a cadeia completa.'],
    ['Como o cliente decide se confia num certificado?', 'Monta um caminho até uma raiz do repositório (Issuer = Subject do próximo, assinaturas conferem, emissores são CA), confere todas as validades, o nome no SAN e, conforme o cliente, revogação e CT.'],
    ['Para que servem o registro CAA e a Certificate Transparency?', 'CAA diz no DNS quais CAs podem emitir para o domínio; CT torna públicas todas as emissões, para o dono descobrir certificados emitidos sem autorização.'],
    ['O que o HSTS impede?', 'Que o navegador use HTTP (e caia num SSL stripping) com o domínio durante o max-age; com preload, até na primeira visita.'],
  ],
  references: ['kurose-ross', 'cloudflare-learning', 'stanford-cs255', 'owasp-cheatsheets', 'mdn'],
});

export const lessons: Lesson[] = [httpVersoes, tlsCertificados];
