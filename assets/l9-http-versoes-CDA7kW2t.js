var e={id:`l9-http-versoes`,moduleId:`m9-2`,title:`HTTP por dentro: as mensagens do 1.1, os quadros do HTTP/2 e o HTTP/3`,titleEn:`HTTP in depth: HTTP/1.1 messages, HTTP/2 frames and HTTP/3`,summary:`A semântica do HTTP (métodos, status, cabeçalhos) é a mesma nas três versões; o que muda é o enquadramento. Como o HTTP/1.1 decide onde o corpo acaba (Content-Length, chunked, fechar a conexão), por que o pipelining não pegou, como o HTTP/2 corta tudo em quadros binários com fluxos multiplexados e comprime cabeçalhos com o HPACK, e o que o HTTP/3 delega ao QUIC e por que precisou do QPACK.`,minutes:50,objectives:[`Separar a semântica do HTTP (RFC 9110) do enquadramento de cada versão (RFC 9112, 9113 e 9114)`,`Aplicar a regra do HTTP/1.1 para achar o fim do corpo: sem corpo, chunked, Content-Length ou fechar a conexão`,`Decodificar uma resposta chunked e explicar por que esse formato existe`,`Ler o cabeçalho de 9 bytes de um quadro HTTP/2 e explicar fluxos, IDs ímpares, END_STREAM e RST_STREAM`,`Explicar como o HPACK comprime cabeçalhos com tabelas estática e dinâmica, e por que o HTTP/3 trocou o HPACK pelo QPACK`,`Dizer como o navegador descobre que um site fala HTTP/3 (Alt-Svc e o registro DNS HTTPS)`],skills:[`redes-dns-tls`,`web-http-api`],terms:[{pt:`enquadramento`,en:`framing`,def:`A regra que diz onde cada mensagem começa e termina dentro de um fluxo de bytes.`,example:`HTTP/1.1 message framing relies on Content-Length or the chunked transfer coding.`},{pt:`conexão persistente`,en:`persistent connection (keep-alive)`,def:`Conexão TCP reaproveitada para várias requisições seguidas; é o padrão no HTTP/1.1.`},{pt:`encadeamento de requisições`,en:`HTTP pipelining`,def:`Mandar várias requisições sem esperar as respostas; as respostas precisam voltar na mesma ordem. Na prática, ficou desligado nos navegadores.`},{pt:`codificação em pedaços`,en:`chunked transfer coding`,def:`Corpo enviado em pedaços, cada um precedido do tamanho em hexadecimal; um pedaço de tamanho 0 marca o fim.`,example:`Transfer-Encoding: chunked`},{pt:`contrabando de requisições`,en:`HTTP request smuggling`,def:`Ataque que explora dois servidores (proxy e back-end) discordando sobre onde uma requisição termina.`},{pt:`quadro`,en:`frame`,def:`A unidade do HTTP/2 e do HTTP/3: um cabeçalho curto (tipo e tamanho; no HTTP/2, também flags e o ID do fluxo) seguido do conteúdo.`},{pt:`fluxo`,en:`stream`,def:`Sequência de quadros de uma mesma troca requisição/resposta dentro da conexão, identificada por um número.`,example:`Each HTTP/2 request is sent on a new stream with an odd stream identifier.`},{pt:`multiplexação`,en:`multiplexing`,def:`Intercalar quadros de vários fluxos numa mesma conexão, sem que um tenha de esperar o outro terminar.`},{pt:`pseudocabeçalho`,en:`pseudo-header field`,def:`Campo que começa com ":" e substitui a linha inicial do HTTP/1.1: :method, :scheme, :authority, :path e :status.`},{pt:`compressão de cabeçalhos`,en:`header compression (HPACK, QPACK)`,def:`Trocar campos repetidos por índices em tabelas compartilhadas entre os dois lados.`},{pt:`tabela dinâmica`,en:`dynamic table`,def:`Tabela do HPACK/QPACK que guarda campos já enviados na conexão, com tamanho limitado; os mais antigos saem primeiro.`},{pt:`serviço alternativo`,en:`alternative service (Alt-Svc)`,def:`Cabeçalho em que o servidor anuncia que o mesmo site também atende por outro protocolo ou porta.`,example:`Alt-Svc: h3=":443"; ma=86400`}],references:[`rfc9110`,`mdn-http`,`kurose-ross`,`cloudflare-learning`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`No nível 6 você usou métodos, códigos de status e cabeçalhos. Uma coisa que pouca gente percebe: **tudo isso é igual no HTTP/1.1, no HTTP/2 e no HTTP/3**. GET continua GET, 404 continua 404, \`Cache-Control\` continua \`Cache-Control\`. Essa parte é a **semântica**, descrita numa RFC só (a 9110). O que mudou de uma versão para outra é como a mensagem vira bytes: o {{enquadramento|framing}}, com uma RFC por versão (9112, 9113 e 9114).

Cada versão responde de um jeito a três perguntas:

1. **Onde termina uma mensagem?** Quem lê um fluxo de bytes precisa saber onde acaba uma resposta e começa a próxima.
2. **Quantas requisições andam ao mesmo tempo numa conexão?**
3. **Quanto custam os cabeçalhos repetidos?** Cookie, User-Agent e Accept vão em todas as requisições.

Entender essas respostas explica coisas práticas: por que o navegador abria 6 conexões por site, por que juntar todos os ícones numa imagem só (os *sprites*) deixou de ajudar, como um proxy mal configurado vira falha de segurança, e por que o HTTP/3 não pôde simplesmente reaproveitar a compressão do HTTP/2.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:'### HTTP/1.1: texto, e a pergunta "onde acaba?"\nUma mensagem HTTP/1.1 é texto: uma linha inicial (`GET /boleto HTTP/1.1` ou `HTTP/1.1 200 OK`), os campos de cabeçalho (`Nome: valor`), uma **linha vazia** e o corpo. Toda linha termina em CRLF (`\\r\\n`). Os nomes dos campos não diferenciam maiúsculas de minúsculas, e o `Host` é obrigatório: um mesmo IP atende muitos sites, e é ele que diz qual site você quer.\n\nA linha vazia marca o fim do **cabeçalho**, não do corpo: o corpo pode ter linhas vazias, ou ser binário. Para achar o fim do corpo, a RFC 9112 (seção 6.3) define uma ordem de regras, e a primeira que se aplica vence:'},{type:`table`,head:[`Situação`,`Tamanho do corpo`],rows:[[`resposta a um HEAD, ou status 1xx, 204 ou 304`,`nenhum, **mesmo que venha um Content-Length** (no HEAD e no 304 ele descreve o corpo que um GET teria)`],["`Transfer-Encoding` terminando em `chunked`","pedaços, até o pedaço de tamanho 0 (se também houver `Content-Length`, ele é ignorado)"],["`Content-Length: n`",`exatamente n bytes`],[`resposta sem nenhum dos dois`,`tudo até o servidor fechar a conexão`],[`requisição sem nenhum dos dois`,`corpo vazio`]],caption:`A ordem das regras de tamanho do corpo no HTTP/1.1 (RFC 9112, seção 6.3), simplificada.`},{type:`md`,text:'A {{codificação em pedaços|chunked transfer coding}} existe porque muitas respostas são geradas enquanto são enviadas (um relatório que sai do banco aos poucos, um log ao vivo, a resposta de um assistente de IA aparecendo palavra por palavra) e o servidor não sabe o tamanho total quando começa. Sem ela, a única forma de dizer "acabou" seria fechar a conexão. O formato: o tamanho do pedaço **em hexadecimal**, CRLF, os bytes, CRLF; repete; no fim, `0`, CRLF, campos opcionais de *trailer* e uma linha vazia. Depois do tamanho pode vir uma extensão (`1a;nome=valor`), que quem não conhece ignora.\n\n**Conexões persistentes.** No HTTP/1.0, cada resposta fechava a conexão. No HTTP/1.1, a {{conexão persistente|persistent connection (keep-alive)}} é o padrão: a conexão fica aberta para a próxima requisição (até alguém mandar `Connection: close`), poupando o handshake do TCP e o do TLS a cada pedido. É justamente por isso que o enquadramento importa: numa conexão reaproveitada, errar o fim de uma resposta é ler o começo da próxima como se fosse corpo.\n\n**Uma requisição por vez.** O HTTP/1.1 até permite o {{encadeamento de requisições|HTTP pipelining}}: mandar três GETs sem esperar. Mas as respostas têm de voltar **na ordem** dos pedidos, então uma resposta lenta segura as rápidas que vêm atrás. É o {{bloqueio de cabeça de fila|head-of-line blocking}} que você viu no TCP, agora na aplicação. Somado a proxies que tratavam mal o pipelining, o resultado foi que os navegadores nunca o ligaram por padrão. Para carregar várias coisas ao mesmo tempo, eles abrem **conexões paralelas**, até 6 por origem no Chrome e no Firefox, e os sites criaram gambiarras para caber nisso: juntar CSS e JavaScript num arquivo só, juntar ícones num *sprite*, espalhar arquivos por vários subdomínios (`static1.`, `static2.`...) para ganhar mais 6 conexões em cada um.'},{type:`callout`,tone:`warn`,text:'Quando um proxy (ou CDN) e o servidor de trás discordam sobre onde uma requisição termina, um atacante consegue "esconder" uma segunda requisição dentro do corpo da primeira: o proxy vê uma, o back-end vê duas, e a segunda pode acabar respondida para outro usuário. É o {{contrabando de requisições|HTTP request smuggling}}. O caso clássico é uma requisição com `Content-Length` **e** `Transfer-Encoding: chunked`, em que um lado usa um e o outro usa o outro. Por isso a RFC 9112 manda o `Transfer-Encoding` prevalecer, permite rejeitar a mensagem e exige fechar a conexão depois de responder. Não escreva o próprio parser de HTTP para produção; use o do servidor ou do framework, que já trata esses casos.',title:`Discordar sobre o fim é uma falha de segurança`},{type:`md`,text:`### HTTP/2: quadros binários e fluxos
O HTTP/2 (RFC 9113) mantém a semântica e troca o texto por {{quadros|frame}} binários. Todo quadro começa com um cabeçalho fixo de **9 bytes**:`},{type:`table`,head:[`Campo`,`Tamanho`,`O que diz`],rows:[[`Length`,`24 bits`,`quantos bytes de conteúdo vêm depois do cabeçalho (até 16.384 por padrão; dá para negociar mais)`],[`Type`,`8 bits`,`o tipo: DATA (0), HEADERS (1), RST_STREAM (3), SETTINGS (4), PING (6), GOAWAY (7), WINDOW_UPDATE (8)...`],[`Flags`,`8 bits`,`bits com significado por tipo: END_STREAM (0x1) e END_HEADERS (0x4) são os mais comuns`],[`R + Stream Identifier`,`1 + 31 bits`,`um bit reservado, que se ignora, e o número do fluxo a que o quadro pertence`]],caption:`O cabeçalho de quadro do HTTP/2, em ordem de rede (big-endian).`},{type:`md`,text:"Cada par requisição/resposta é um {{fluxo|stream}} com um número. O cliente usa números **ímpares** e crescentes (1, 3, 5...), nunca reaproveitados; o fluxo **0** é a própria conexão, por onde passam SETTINGS, PING e GOAWAY. O fim de uma mensagem é a flag **END_STREAM** no último quadro: não existe mais `Content-Length` como regra de enquadramento nem `chunked` (que é proibido no HTTP/2). A linha inicial vira {{pseudocabeçalhos|pseudo-header field}}: `:method`, `:scheme`, `:authority` (o antigo Host) e `:path` na requisição, `:status` na resposta. Os nomes dos campos vão sempre em minúsculas, e os campos que só faziam sentido para a conexão do HTTP/1.1 (`Connection`, `Keep-Alive`, `Transfer-Encoding`) são proibidos.\n\nComo cada quadro diz a que fluxo pertence, quadros de fluxos diferentes podem ser **intercalados** numa única conexão TCP: é a {{multiplexação|multiplexing}}. Uma resposta lenta não segura mais as outras no nível do HTTP, e cancelar um download é mandar um RST_STREAM naquele fluxo, sem derrubar a conexão (no HTTP/1.1, o único jeito de cancelar no meio é fechar a conexão). Cada fluxo tem o próprio controle de fluxo, com quadros WINDOW_UPDATE, para um download grande não ocupar todo o buffer do outro lado.\n\nCom uma conexão só, as gambiarras do HTTP/1.1 viram prejuízo: espalhar arquivos por subdomínios obriga a abrir novas conexões (novos handshakes) e atrapalha a priorização; juntar tudo num arquivo enorme invalida o cache inteiro quando um ícone muda.\n\n**HPACK: comprimir os cabeçalhos.** Uma página faz dezenas de requisições ao mesmo site, e cada uma repete centenas de bytes de cabeçalho (Cookie, User-Agent, Accept...). O HPACK (RFC 7541) troca campos por índices em duas tabelas que os dois lados mantêm iguais:\n\n- a **tabela estática**, fixa, com 61 entradas comuns: o índice 2 é `:method: GET`, o 4 é `:path: /`, o 7 é `:scheme: https`, o 8 é `:status: 200`;\n- a {{tabela dinâmica|dynamic table}}, que começa vazia e recebe os campos que o remetente pede para guardar. A entrada mais nova fica no índice 62 e empurra as outras para 63, 64... Cada entrada custa `len(nome) + len(valor) + 32` bytes, e a tabela tem um teto (4.096 bytes por padrão): quando passa, saem as **mais antigas**.\n\nA partir da segunda requisição, o Cookie de 300 bytes vira **um byte** com o índice dele. Valores novos ainda podem ir com um código de Huffman fixo, que encurta texto comum."},{type:`callout`,tone:`deep`,text:`Por que não comprimir os cabeçalhos com o deflate (o algoritmo do gzip), como o SPDY (o antecessor do HTTP/2) fazia? Por causa do ataque CRIME (2012). Quando um segredo (o cookie de sessão) é comprimido junto com texto que o atacante controla (o caminho de uma requisição que ele faz o navegador da vítima disparar), o tamanho do resultado cifrado encolhe quando o palpite do atacante acerta um pedaço do segredo. Medindo tamanhos, ele adivinha o cookie caractere por caractere. O HPACK só reaproveita **campos inteiros** (acertar metade de um cookie não encolhe nada) e permite marcar campos sensíveis como "nunca indexar".`,title:`Por que um formato novo, e não gzip`},{type:`md`,text:"Duas promessas do HTTP/2 não vingaram. A **árvore de prioridades** original foi pouco e mal implementada; a RFC 9113 a tornou obsoleta, e hoje se usa o esquema simples da RFC 9218 (cabeçalho `Priority: u=0` a `u=7`, de mais a menos urgente). O **server push**, em que o servidor mandava arquivos antes de serem pedidos, quase sempre empurrava o que o navegador já tinha em cache; o Chrome o removeu em 2022. No lugar dele entrou a resposta provisória **103 Early Hints**, que só sugere ao navegador o que ele vai precisar.\n\nNos navegadores, o HTTP/2 só é usado com TLS: a escolha entre `h2` e `http/1.1` acontece dentro do handshake do TLS, sem custar um RTT a mais (o mecanismo, ALPN, está na próxima lição)."},{type:`callout`,tone:`deep`,text:`Em outubro de 2023, Google, Cloudflare e AWS relataram os maiores ataques de negação de serviço já vistos até então (o Google mediu 398 milhões de requisições por segundo), todos com a mesma técnica, a **HTTP/2 Rapid Reset** (CVE-2023-44487). O atacante abre um fluxo com HEADERS e o cancela na hora com RST_STREAM, milhares de vezes por conexão. O limite de fluxos simultâneos não ajudava, porque um fluxo cancelado deixa de contar, mas o servidor já tinha começado a trabalhar em cada requisição. A correção foi limitar a taxa de cancelamentos por conexão. A lição de projeto: todo recurso barato para o cliente e caro para o servidor vira vetor de ataque.`,title:`Rapid Reset: quando cancelar é o ataque`},{type:`md`,text:'### HTTP/3: o HTTP/2 refeito sobre o QUIC\nA multiplexação do HTTP/2 tem um limite que você já conhece da lição de TCP: os quadros de todos os fluxos viajam num **único fluxo de bytes TCP**, então um pacote perdido segura todos eles. O HTTP/3 (RFC 9114) roda sobre o QUIC, e o mapeamento fica mais simples: cada requisição usa um fluxo bidirecional do **próprio QUIC**. Como o QUIC já numera os fluxos, entrega cada um em ordem, faz controle de fluxo e marca o fim (com o bit FIN), os quadros do HTTP/3 perderam o ID de fluxo e quadros como WINDOW_UPDATE e RST_STREAM. Sobraram basicamente HEADERS e DATA nos fluxos de requisição, e SETTINGS e GOAWAY num fluxo de controle unidirecional.\n\n**Por que o HPACK não serviu.** O HPACK supõe que os blocos de cabeçalho são lidos **exatamente na ordem em que foram enviados**: a inserção na tabela dinâmica vai no meio de um bloco, e o bloco seguinte pode usar o índice novo. No TCP, a ordem é garantida. No QUIC, os fluxos são independentes: a requisição do fluxo 8, que usa a entrada "62", pode chegar antes da requisição do fluxo 4, que a criou. Esperar pelo fluxo 4 traria de volta o bloqueio de cabeça de fila que o QUIC acabou de eliminar. O **QPACK** (RFC 9204) resolve isso tirando as inserções do caminho: elas vão por um fluxo unidirecional próprio (o *encoder stream*), cada bloco de cabeçalho diz quantas inserções precisa já ter visto, e o codificador escolhe entre usar uma entrada ainda não confirmada (arriscando bloquear aquele fluxo, até um limite negociado) ou só entradas já confirmadas pelo outro lado. A tabela estática do QPACK tem 99 entradas.\n\n**Como o navegador descobre o HTTP/3.** A URL `https://` não diz a versão. Na primeira visita, o navegador costuma ir por TCP (HTTP/2) e o servidor anuncia, com o cabeçalho de {{serviço alternativo|alternative service (Alt-Svc)}}, `Alt-Svc: h3=":443"; ma=86400`: "também falo HTTP/3 na porta 443 UDP; lembre disso por um dia". Nas próximas, o navegador tenta o QUIC. O jeito mais novo é o registro DNS **HTTPS** (RFC 9460), consultado junto com o A/AAAA: `loja.exemplo.com.br. 300 IN HTTPS 1 . alpn="h3,h2"` avisa antes mesmo da primeira conexão. Se o UDP estiver bloqueado na rede, o navegador volta para o TCP.'},{type:`table`,head:[``,`HTTP/1.1`,`HTTP/2`,`HTTP/3`],rows:[[`especificação`,`RFC 9112`,`RFC 9113`,`RFC 9114`],[`formato`,`texto`,`quadros binários`,`quadros binários sobre fluxos QUIC`],[`onde a mensagem acaba`,`sem corpo, chunked, Content-Length ou fechar a conexão`,`flag END_STREAM`,`fim do fluxo QUIC (FIN)`],[`requisições simultâneas numa conexão`,`1 (pipelining desligado na prática); por isso, 6 conexões`,`muitas, multiplexadas`,`muitas, cada uma num fluxo QUIC`],[`cabeçalhos`,`texto repetido em cada requisição`,`HPACK`,`QPACK`],[`transporte`,`TCP`,`TCP`,`QUIC (sobre UDP)`],[`criptografia`,`opcional (HTTPS = HTTP/1.1 sobre TLS)`,`nos navegadores, sempre com TLS`,`sempre: o TLS 1.3 faz parte do QUIC`],[`um pacote perdido atrasa`,`a conexão em que ele estava`,`todos os fluxos da conexão`,`só o fluxo a que ele pertence`]],caption:`Mesma semântica (RFC 9110), três enquadramentos.`}]},{stage:`exemplo`,blocks:[{type:`md`,text:"Vamos acompanhar a mesma conversa nos três formatos. Um sistema de cobrança gera, sob demanda, o comprovante de um boleto. Em **HTTP/1.1**, o servidor ainda não sabe o tamanho total quando começa a responder, então usa chunked. Os `↵` marcam os CRLF:"},{type:`code`,lang:`text`,code:`GET /boletos/8231/comprovante HTTP/1.1↵
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
↵                          ← linha vazia (não houve trailers)`,runnable:!1,caption:`O corpo decodificado é "boleto pago, CEP 01310-100" (26 bytes). A conexão continua aberta para a próxima requisição.`},{type:`md`,text:"Leitura passo a passo, como o cliente faz: (1) lê até a linha vazia e separa os campos; (2) não é HEAD nem 1xx/204/304; (3) há `Transfer-Encoding: chunked`, então lê a linha `b`, converte de hexadecimal (11), lê 11 bytes e confere o CRLF; (4) repete com `f` (15); (5) lê `0`, depois lê linhas até a vazia; (6) o próximo byte da conexão já é o começo da próxima resposta.\n\nAgora a página do boleto em **HTTP/2**, com o HTML, o CSS e o JavaScript. Os quadros, na ordem em que passam pela única conexão TCP (→ cliente para servidor, ← servidor para cliente):"},{type:`code`,lang:`text`,code:`→ (prefácio "PRI * HTTP/2.0..." e SETTINGS no fluxo 0)
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
← DATA            fluxo 5  END_STREAM               (JS, parte 2)`,runnable:!1,caption:`Requisições nos fluxos 1, 3 e 5 (ímpares, do cliente); as respostas se intercalam e cada uma termina com END_STREAM no próprio fluxo.`},{type:`md`,text:"Repare: o CSS chegou inteiro **antes** do fim do HTML, que tinha sido pedido primeiro. Em HTTP/1.1 com uma conexão, isso seria impossível; com seis conexões, custaria seis handshakes. E as requisições 3 e 5 repetem quase todos os campos da 1: com o HPACK, `:method GET`, `:scheme https`, `:authority`, Cookie e User-Agent viram poucos bytes cada.\n\nEm **HTTP/3**, a troca é a mesma, mas cada requisição vai num fluxo QUIC (0, 4, 8: os bidirecionais abertos pelo cliente são numerados de 4 em 4), sem ID dentro dos quadros, e uma perda no fluxo do JavaScript não atrasa o CSS."},{type:`viz`,viz:`client-server`,caption:`Seja qual for a versão, a conversa é a mesma: o cliente pede, o servidor responde. O que muda é como os bytes são arrumados na conexão.`},{type:`code`,lang:`bash`,code:`# No seu computador (precisa de rede):
$ curl -sv --http1.1 https://www.example.com -o /dev/null 2>&1 | grep -E "^[<>] "
$ curl -sI --http2 https://www.example.com | head -1     # "HTTP/2 200" se o servidor aceitar h2
$ curl -sI https://www.google.com | grep -i alt-svc       # o anúncio de HTTP/3
$ dig +short www.cloudflare.com HTTPS                     # o registro HTTPS, com alpn="h3,h2"`,runnable:!1,caption:`Para investigar no terminal do seu computador. No navegador, a coluna "Protocol" da aba Network (DevTools) mostra http/1.1, h2 ou h3 para cada requisição.`}]},{stage:`codigo`,blocks:[{type:`md`,text:`Um decodificador mínimo de HPACK, só com as duas representações mais comuns, rodando o exemplo oficial do apêndice C.3 da RFC 7541: duas requisições seguidas na mesma conexão.`},{type:`code`,lang:`python`,code:`# Parte da tabela estática do HPACK (RFC 7541, apêndice A): índice -> (nome, valor)
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
print("a 2ª requisição em HTTP/1.1:", len(texto.encode()), "bytes")`,runnable:!0,caption:`Na 2ª requisição, o byte 0xbe (índice 62) traz ":authority: www.example.com" inteiro, guardado na 1ª. Troque o 0xbe por 0xbf e veja o erro: o índice 63 ainda não existe.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e9-http-versoes-1`,kind:`mcq`,prompt:"Uma resposta HTTP/1.1 chega com `Transfer-Encoding: chunked` e sem `Content-Length`, numa conexão persistente. Como o cliente sabe que o corpo acabou?",difficulty:`facil`,skills:[`redes-dns-tls`],hints:[`Numa conexão persistente, o que vem logo depois do fim desta resposta?`,`No formato chunked, o que vem antes de cada pedaço de dados?`],explanation:`No formato chunked, cada pedaço vem precedido do seu tamanho em hexadecimal, e um pedaço de tamanho 0 (seguido dos trailers opcionais e de uma linha vazia) marca o fim. Assim o servidor pode começar a responder sem saber o tamanho total e, mesmo assim, manter a conexão aberta para a próxima requisição.`,options:[{text:`Quando chega um pedaço de tamanho 0`,correct:!0,feedback:`Isso. O pedaço de tamanho 0 (seguido da linha vazia) diz "acabou", e a conexão continua aberta.`},{text:`Quando o servidor fecha a conexão`,feedback:`Essa é a regra para uma resposta sem chunked e sem Content-Length. O chunked existe justamente para marcar o fim sem fechar a conexão.`},{text:`Pela primeira linha vazia depois do cabeçalho`,feedback:`A linha vazia marca o fim do cabeçalho, não do corpo. O corpo pode conter linhas vazias, ou nem ser texto.`},{text:`Quando passa um tempo sem chegar nenhum byte`,feedback:`Tempo não é enquadramento: um servidor lento teria a resposta cortada, e um rápido emendaria duas respostas. O fim tem de estar escrito nos próprios bytes.`}]}},{type:`exercise`,exercise:{id:`e9-http-versoes-2`,kind:`fill`,lang:`text`,prompt:`Complete os tamanhos dos pedaços desta resposta chunked. Cada linha termina em CRLF, e o CRLF **não** entra no tamanho. Os tamanhos vão em hexadecimal.`,template:`HTTP/1.1 200 OK
Content-Type: text/plain
Transfer-Encoding: chunked

___
boleto pago
___
, CEP 01310-100
___

`,blanks:[[`b`,`B`,`0b`,`0B`],[`f`,`F`,`0f`,`0F`],[`0`]],difficulty:`facil`,skills:[`redes-dns-tls`],hints:[`Conte os caracteres de "boleto pago", incluindo o espaço. Como esse número se escreve em base 16?`,`Em ", CEP 01310-100" contam a vírgula, os espaços e o hífen.`,`Como o cliente fica sabendo que não vem mais nenhum pedaço?`],explanation:`"boleto pago" tem 11 bytes, que em hexadecimal é b. ", CEP 01310-100" tem 15 bytes: f. O último pedaço tem tamanho 0 e marca o fim (depois dele vem a linha vazia). Um erro comum é escrever 11 e 15 em decimal: o cliente leria 0x11 = 17 e 0x15 = 21 bytes e se perderia no fluxo.`}},{type:`exercise`,exercise:{id:`e9-http-versoes-3`,kind:`predict`,lang:`python`,prompt:"Esta é uma tabela dinâmica do HPACK de brinquedo, com teto de 100 bytes. Cada entrada custa `len(nome) + len(valor) + 32`. O que o programa imprime?",code:`tabela = []          # a entrada mais nova fica na frente (índice 62)
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
    print(62 + i, nome)`,answer:`97 user-agent
62 x-cep
63 user-agent`,difficulty:`intermediario`,skills:[`redes-dns-tls`],hints:[`Quanto custa cada uma das duas primeiras entradas? Elas cabem juntas no limite?`,`Depois de inserir x-cep, qual seria o total? Passou do limite?`,"`tabela.pop()` sem argumento remove qual ponta da lista: a mais nova ou a mais antiga?"],explanation:`cookie custa 6 + 10 + 32 = 48 e user-agent custa 10 + 7 + 32 = 49: total 97, dentro do limite, e a mais nova (user-agent) está na frente. x-cep custa 5 + 8 + 32 = 45; o total iria a 142, então sai a entrada mais antiga, o cookie (que está no fim da lista), e o total cai para 94. Sobram x-cep no índice 62 e user-agent no 63. Repare que os índices mudam a cada inserção: por isso os dois lados precisam processar os blocos exatamente na mesma ordem, a exigência que o QPACK teve de contornar.`}},{type:`exercise`,exercise:{id:`e9-http-versoes-4`,kind:`code`,lang:`python`,prompt:'Escreva `ler_quadros(dados)`, que recebe `bytes` com zero ou mais quadros HTTP/2 seguidos e devolve a lista de tuplas `(tipo, flags, fluxo, conteudo)`, na ordem.\n\nCada quadro tem um cabeçalho de 9 bytes, em big-endian: **tamanho** do conteúdo (3 bytes), **tipo** (1 byte), **flags** (1 byte) e 4 bytes em que o primeiro bit é reservado (ignore-o) e os outros 31 são o **ID do fluxo**. Depois vêm exatamente `tamanho` bytes de conteúdo (`conteudo` é do tipo `bytes`).\n\nSe os dados terminarem no meio de um cabeçalho ou de um conteúdo, levante `ValueError`. Exemplo: `ler_quadros(bytes([0, 0, 2, 0, 1, 0, 0, 0, 3]) + b"oi")` devolve `[(0, 1, 3, b"oi")]` (um DATA com END_STREAM no fluxo 3).',difficulty:`intermediario`,skills:[`redes-dns-tls`],hints:[`Que variável diz em que ponto dos dados você está? Quanto ela avança a cada quadro?`,"Como transformar 3 ou 4 bytes num número, sabendo que o mais significativo vem primeiro? Procure `int.from_bytes`.",`O bit reservado é o mais alto dos 32. Que máscara deixa só os 31 de baixo?`,"Antes de fatiar, confira se ainda há bytes suficientes: 9 para o cabeçalho e depois `tamanho` para o conteúdo."],explanation:'É um laço com um cursor: lê 9 bytes, extrai os campos com int.from_bytes(..., "big") e uma máscara 0x7FFFFFFF para descartar o bit reservado, pega `tamanho` bytes de conteúdo e avança o cursor. Fatiar bytes em Python nunca dá erro, só devolve menos bytes; por isso é preciso conferir o tamanho antes, senão um quadro truncado passaria como se estivesse completo. Esse é o padrão de todo protocolo binário com prefixo de tamanho (TLS, QUIC, Protocol Buffers): o tamanho vem antes, e o leitor nunca precisa procurar um delimitador.',starter:`def ler_quadros(dados):
    # devolva a lista de (tipo, flags, fluxo, conteudo)
    # cabeçalho: tamanho (3 bytes), tipo (1), flags (1), R + fluxo (4)
    pass`,solution:`def ler_quadros(dados):
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
    return quadros`,tests:[{name:`o exemplo do enunciado e a entrada vazia`,code:`r = ler_quadros(bytes([0, 0, 2, 0, 1, 0, 0, 0, 3]) + b"oi")
assert r == [(0, 1, 3, b"oi")], f"esperado [(0, 1, 3, b'oi')], veio {r}"
assert ler_quadros(b"") == [], "sem bytes, não há quadros: devolva []"`},{name:`vários quadros seguidos, inclusive sem conteúdo`,code:`import struct as _st
def _q(tipo, flags, fluxo, conteudo):
    return _st.pack(">I", len(conteudo))[1:] + bytes([tipo, flags]) + _st.pack(">I", fluxo) + conteudo
dados = _q(4, 0, 0, b"") + _q(1, 5, 1, b"\\x82\\x87\\x84") + _q(0, 0, 3, b"css...") + _q(0, 1, 1, b"<html>")
r = ler_quadros(dados)
esperado = [(4, 0, 0, b""), (1, 5, 1, b"\\x82\\x87\\x84"), (0, 0, 3, b"css..."), (0, 1, 1, b"<html>")]
assert r == esperado, f"veio {r}; esperado {esperado}. Um SETTINGS vazio (tamanho 0) também é um quadro"`},{name:`tamanho de 3 bytes, em big-endian`,code:`conteudo = b"x" * 70000
cab = (70000).to_bytes(3, "big") + bytes([0, 0]) + (5).to_bytes(4, "big")
r = ler_quadros(cab + conteudo)
assert len(r) == 1 and r[0][2] == 5 and len(r[0][3]) == 70000, "um conteúdo de 70.000 bytes precisa dos 3 bytes do tamanho (2 bytes só vão até 65.535)"
cab = bytes([0, 1, 0, 0, 0, 0, 0, 0, 1])
r = ler_quadros(cab + b"y" * 256)
assert len(r) == 1 and len(r[0][3]) == 256, "os bytes 00 01 00 valem 256 em big-endian: o mais significativo vem primeiro"`},{name:`o bit reservado é ignorado`,code:`cab = bytes([0, 0, 1, 0, 0, 0x80, 0, 0, 7])
r = ler_quadros(cab + b"z")
assert r == [(0, 0, 7, b"z")], f"com o bit reservado ligado, o fluxo ainda é 7; veio {r}. Use uma máscara para ficar só com 31 bits"
cab = bytes([0, 0, 0, 8, 0, 0x7F, 0xFF, 0xFF, 0xFF])
r = ler_quadros(cab)
assert r == [(8, 0, 2**31 - 1, b"")], f"o maior ID de fluxo é 2**31 - 1; veio {r}"`},{name:`dados truncados levantam ValueError`,code:`for dados, onde in [(bytes([0, 0, 5, 0, 0, 0, 0, 0, 1]) + b"abc", "no meio do conteúdo"),
                    (bytes([0, 0, 0, 4, 0, 0, 0]), "no meio do cabeçalho"),
                    (bytes([0, 0, 1, 0, 0, 0, 0, 0, 1]) + b"a" + bytes([0, 0]), "no cabeçalho do 2º quadro")]:
    try:
        r = ler_quadros(dados)
    except ValueError:
        continue
    assert False, f"os dados terminam {onde}; esperado ValueError, veio {r}"`}]}},{type:`exercise`,exercise:{id:`e9-http-versoes-5`,kind:`mcq`,prompt:`O HTTP/3 poderia ter usado o HPACK do HTTP/2 sem mudança nenhuma, mandando os blocos de cabeçalho em cada fluxo QUIC. Por que não fez isso e criou o QPACK?`,difficulty:`avancado`,skills:[`redes-dns-tls`],hints:[`No HPACK, o que um bloco de cabeçalho pode fazer com a tabela dinâmica, além de ler dela?`,`No QUIC, dois fluxos diferentes chegam necessariamente na ordem em que foram enviados?`,`Se o bloco do fluxo 8 usa uma entrada criada pelo bloco do fluxo 4, e o fluxo 4 atrasou, o que o decodificador teria de fazer?`],explanation:`No HPACK, as inserções na tabela dinâmica vão dentro dos próprios blocos de cabeçalho, e os índices de todas as entradas mudam a cada inserção; então o decodificador precisa processar os blocos na ordem exata em que foram enviados. Sobre TCP isso é garantido. Sobre QUIC, fluxos diferentes chegam em qualquer ordem, e esperar o fluxo atrasado recriaria o bloqueio de cabeça de fila entre fluxos que o QUIC eliminou. O QPACK manda as inserções por um fluxo separado e faz cada bloco dizer de quantas inserções depende, para que só o fluxo que realmente precisa de uma entrada nova espere por ela.`,options:[{text:`Porque o HPACK depende de os blocos serem processados na ordem em que foram enviados, e fluxos QUIC independentes não garantem essa ordem entre si`,correct:!0,feedback:`Isso: a tabela dinâmica do HPACK é atualizada no meio dos blocos. Com fluxos fora de ordem, ou um fluxo espera o outro (bloqueio de cabeça de fila de novo) ou os índices ficam errados.`},{text:`Porque o HPACK é vulnerável ao ataque CRIME, e o QPACK corrigiu isso`,feedback:`O CRIME atingia a compressão com gzip/deflate do SPDY. O HPACK foi desenhado justamente para resistir a ele, e o QPACK herda as mesmas defesas. O motivo da mudança foi a ordem de entrega.`},{text:`Porque o QUIC já comprime os cabeçalhos sozinho`,feedback:`O QUIC não sabe o que é um cabeçalho HTTP; ele transporta bytes em fluxos. A compressão continua sendo trabalho do HTTP/3, com o QPACK.`},{text:`Porque o HTTP/3 manda os cabeçalhos em texto, como o HTTP/1.1`,feedback:`O HTTP/3 também usa quadros binários e cabeçalhos comprimidos. A diferença está em como as tabelas dinâmicas são atualizadas.`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e9-http-versoes-desafio`,kind:`code`,lang:`python`,prompt:'Um cliente mandou várias requisições numa conexão HTTP/1.1 persistente e recebeu, de volta, um fluxo com as respostas grudadas umas nas outras. Escreva `separar(fluxo, metodos)`, que devolve a lista de tuplas `(status, corpo)`, na ordem.\n\n- `fluxo` é uma `str` só com caracteres ASCII (1 caractere = 1 byte), com linhas terminadas em `"\\r\\n"`. Cada resposta tem a linha de status (`HTTP/1.1 200 OK`), campos `Nome: valor` (nomes sem diferença entre maiúsculas e minúsculas; espaços em volta do valor não contam), uma linha vazia e, talvez, um corpo.\n- `metodos` é a lista dos métodos das requisições, na ordem em que foram enviadas (as respostas vêm na mesma ordem).\n- Respostas **1xx** (só aparecem 100 e 103) são provisórias: entram na lista com corpo `""`, nunca têm corpo e **não** consomem um método; a resposta final daquela requisição vem depois.\n\nO corpo de cada resposta final segue a ordem de regras da lição: (1) resposta a **HEAD** ou status **204** ou **304**: corpo vazio, mesmo com `Content-Length`; (2) `Transfer-Encoding` cujo **último** valor da lista separada por vírgulas é `chunked` (como em `gzip, chunked`): decodifique os pedaços (tamanho em hexadecimal, maiúsculo ou minúsculo; ignore extensões depois de `;`; depois do pedaço 0, ignore trailers até a linha vazia); (3) `Content-Length`: exatamente aquela quantidade; (4) senão (inclusive com um `Transfer-Encoding` que não termina em `chunked`, como `chunked, gzip`): o resto do fluxo inteiro.\n\nLevante `ValueError` se o fluxo terminar no meio de uma resposta (cabeçalho sem linha vazia, corpo mais curto que o Content-Length, pedaço incompleto ou sem o CRLF depois dos dados) ou se chegar uma resposta final sem método correspondente. Se o fluxo acabar exatamente no fim de uma resposta, devolva o que já chegou, mesmo que sobrem métodos.',difficulty:`desafio`,skills:[`redes-dns-tls`,`web-http-api`],hints:[`Use um cursor (a posição atual no fluxo) e trate uma resposta por volta do laço. O que marca o fim do cabeçalho?`,`Guarde os campos num dicionário com os nomes em minúsculas. Em que momento você decide qual método corresponde a esta resposta, e o que muda se o status for 1xx?`,`Teste as regras na ordem da lição. Para uma resposta a HEAD com Content-Length: 120, quantos bytes do fluxo pertencem a ela?`,"Para o chunked, escreva uma função à parte que recebe o fluxo e a posição e devolve (corpo, nova posição). `int(texto, 16)` converte hexadecimal.",`Fatiar uma str além do fim não dá erro, só devolve menos. Onde você precisa conferir se havia bytes suficientes?`],explanation:`O núcleo é um cursor que avança resposta por resposta: acha o "\\r\\n\\r\\n" do fim do cabeçalho, lê a linha de status e os campos, e só então decide quantos bytes do corpo pertencem a esta resposta. A ordem das regras é o que derruba soluções apressadas: um HEAD ou um 304 trazem Content-Length descrevendo um corpo que não veio, e consumir esses bytes engoliria o começo da resposta seguinte; um Transfer-Encoding chunked prevalece sobre um Content-Length conflitante (o caso que, tratado diferente por dois servidores, vira request smuggling); e uma resposta sem tamanho só pode ser a última, porque termina com o fechamento da conexão. As respostas 1xx mostram por que o método é escolhido depois de ler o status: elas não respondem a requisição, só avisam algo antes da resposta final.`,starter:`def separar(fluxo, metodos):
    # devolva a lista de (status, corpo), na ordem do fluxo
    pass`,solution:`CRLF = "\\r\\n"

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
    return respostas`,tests:[{name:`Content-Length e o resto do fluxo`,code:`import random as _random
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
_confere("HTTP/1.1 200 OK\\r\\nContent-Length: 6\\r\\n\\r\\nPix okHTTP/1.1 404 Not Found\\r\\ncontent-length:  3 \\r\\n\\r\\nnao", ["GET", "GET"], [(200, "Pix ok"), (404, "nao")], "nomes de campo sem diferença de maiúsculas, e espaços em volta do valor não contam")
_confere("HTTP/1.1 200 OK\\r\\nContent-Type: text/plain\\r\\n\\r\\nsem tamanho:\\r\\n\\r\\nvai ate fechar", ["GET"], [(200, "sem tamanho:\\r\\n\\r\\nvai ate fechar")], "sem Content-Length e sem chunked, o corpo é todo o resto do fluxo, linhas vazias incluídas")`},{name:`HEAD, 204 e 304 não têm corpo, mesmo com Content-Length`,code:`import random as _random
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
f = ("HTTP/1.1 200 OK\\r\\nContent-Length: 120\\r\\n\\r\\n"
     "HTTP/1.1 304 Not Modified\\r\\nContent-Length: 50\\r\\n\\r\\n"
     "HTTP/1.1 204 No Content\\r\\n\\r\\n"
     "HTTP/1.1 201 Created\\r\\nContent-Length: 2\\r\\n\\r\\nok")
_confere(f, ["HEAD", "GET", "DELETE", "POST"], [(200, ""), (304, ""), (204, ""), (201, "ok")], "a resposta a HEAD e o 304 trazem Content-Length do corpo que um GET teria, mas não trazem corpo")`},{name:`chunked: hexadecimal, extensões e trailers`,code:`import random as _random
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
f = "HTTP/1.1 200 OK\\r\\nTransfer-Encoding: chunked\\r\\n\\r\\nb\\r\\nboleto pago\\r\\nf\\r\\n, CEP 01310-100\\r\\n0\\r\\n\\r\\n"
_confere(f, ["GET"], [(200, "boleto pago, CEP 01310-100")], "os tamanhos estão em hexadecimal: b = 11, f = 15")
f = ("HTTP/1.1 200 OK\\r\\ntransfer-encoding: chunked\\r\\n\\r\\n1A;lote=7\\r\\nabcdefghijklmnopqrstuvwxyz\\r\\n0\\r\\nX-Soma: 99\\r\\n\\r\\n"
     "HTTP/1.1 200 OK\\r\\nContent-Length: 3\\r\\n\\r\\nfim")
_confere(f, ["GET", "GET"], [(200, "abcdefghijklmnopqrstuvwxyz"), (200, "fim")], "1A em maiúsculas vale 26; a extensão ;lote=7 e o trailer X-Soma devem ser ignorados")
_confere("HTTP/1.1 200 OK\\r\\nTransfer-Encoding: chunked\\r\\n\\r\\n0\\r\\n\\r\\n", ["GET"], [(200, "")], "um corpo chunked pode ser vazio: só o pedaço 0")`},{name:`chunked prevalece sobre Content-Length`,code:`import random as _random
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
f = ("HTTP/1.1 200 OK\\r\\nContent-Length: 4\\r\\nTransfer-Encoding: chunked\\r\\n\\r\\n3\\r\\nabc\\r\\n0\\r\\n\\r\\n"
     "HTTP/1.1 200 OK\\r\\nContent-Length: 2\\r\\n\\r\\nzz")
_confere(f, ["GET", "GET"], [(200, "abc"), (200, "zz")], "com os dois campos, vale o Transfer-Encoding (RFC 9112); usar o Content-Length aqui é a raiz do request smuggling")`},{name:`só vale chunked quando é a última codificação`,code:`import random as _random
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
f = ("HTTP/1.1 200 OK\\r\\nTransfer-Encoding: gzip, chunked\\r\\n\\r\\n4\\r\\nGZ01\\r\\n0\\r\\n\\r\\n"
     "HTTP/1.1 200 OK\\r\\nContent-Length: 2\\r\\n\\r\\nzz")
_confere(f, ["GET", "GET"], [(200, "GZ01"), (200, "zz")], "em 'gzip, chunked' o último valor é chunked: decodifique os pedaços (o conteúdo comprimido fica como veio)")
f = "HTTP/1.1 200 OK\\r\\nTransfer-Encoding: chunked, gzip\\r\\n\\r\\nbytes-comprimidos-ate-fechar"
_confere(f, ["GET"], [(200, "bytes-comprimidos-ate-fechar")], "em 'chunked, gzip' o chunked não é o último: a resposta vai até o fim do fluxo. Procurar 'chunked' em qualquer posição do valor é errado")`},{name:`respostas 1xx são provisórias`,code:`import random as _random
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
f = ("HTTP/1.1 100 Continue\\r\\n\\r\\n"
     "HTTP/1.1 201 Created\\r\\nContent-Length: 2\\r\\n\\r\\nid"
     "HTTP/1.1 103 Early Hints\\r\\nLink: </estilo.css>; rel=preload\\r\\n\\r\\n"
     "HTTP/1.1 200 OK\\r\\nContent-Length: 4\\r\\n\\r\\nhtml")
_confere(f, ["POST", "GET"], [(100, ""), (201, "id"), (103, ""), (200, "html")], "o 100 e o 103 entram na lista, mas não consomem método: o 201 responde o POST e o 200 responde o GET")`},{name:`fluxos incompletos e respostas sobrando`,code:`import random as _random
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
_falha("HTTP/1.1 200 OK\\r\\nContent-Length: 10\\r\\n\\r\\ncurto", ["GET"], "o corpo tem 5 bytes, mas o Content-Length promete 10")
_falha("HTTP/1.1 200 OK\\r\\nContent-Length: 1", ["GET"], "o cabeçalho não terminou (falta a linha vazia)")
_falha("HTTP/1.1 200 OK\\r\\nTransfer-Encoding: chunked\\r\\n\\r\\n5\\r\\nab", ["GET"], "o pedaço de 5 bytes está pela metade")
_falha("HTTP/1.1 200 OK\\r\\nTransfer-Encoding: chunked\\r\\n\\r\\n2\\r\\nabcd\\r\\n0\\r\\n\\r\\n", ["GET"], "depois dos 2 bytes do pedaço deveria vir CRLF, e veio 'cd'")
_falha("HTTP/1.1 200 OK\\r\\nTransfer-Encoding: chunked\\r\\n\\r\\n2\\r\\nabc\\r\\n0\\r\\n\\r\\n", ["GET"], "o pedaço diz 2 bytes, mas vieram 3 antes do CRLF: confira que logo depois dos dados vem exatamente CRLF, em vez de só pular 2 caracteres")
_falha("HTTP/1.1 200 OK\\r\\nTransfer-Encoding: chunked\\r\\n\\r\\n3\\r\\nabc\\r\\n0\\r\\n", ["GET"], "faltou a linha vazia depois do pedaço 0")
_falha("HTTP/1.1 200 OK\\r\\nContent-Length: 0\\r\\n\\r\\nHTTP/1.1 200 OK\\r\\nContent-Length: 0\\r\\n\\r\\n", ["GET"], "chegaram duas respostas finais para uma requisição só")
_confere("HTTP/1.1 200 OK\\r\\nContent-Length: 2\\r\\n\\r\\nok", ["GET", "GET", "GET"], [(200, "ok")], "as outras respostas ainda não chegaram: devolva o que está completo")
_confere("", ["GET"], [], "fluxo vazio: nenhuma resposta ainda")`},{name:`fluxos aleatórios`,code:`import random as _random
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
_rng = _random.Random(9112)
for _ in range(400):
    fluxo, metodos, esperado = _gera(_rng)
    _confere(fluxo, metodos, esperado)`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:"**Veja as versões convivendo.** No seu computador, abra o DevTools do navegador (F12), aba **Network**, clique com o botão direito no cabeçalho da tabela e ligue a coluna **Protocol**. Carregue o site do seu banco, um portal de notícias e o site da prefeitura da sua cidade. Anote quais requisições vão em `http/1.1`, `h2` e `h3`, e procure o cabeçalho `alt-svc` nas respostas. Recarregue: alguma requisição mudou de `h2` para `h3`? Depois, rode `dig` com o tipo HTTPS nesses domínios e veja quais publicam o registro. Explique o que você viu com o que a lição diz sobre a descoberta do HTTP/3."}]},{stage:`revisao`,blocks:[{type:`md`,text:`- A semântica (métodos, status, campos) é a da RFC 9110 nas três versões; o que muda é o enquadramento: RFC 9112 (1.1), 9113 (2) e 9114 (3).
- HTTP/1.1, fim do corpo, na ordem: HEAD/1xx/204/304 sem corpo; \`chunked\` (prevalece sobre Content-Length); \`Content-Length\`; senão, até fechar a conexão.
- Chunked: tamanho em hexadecimal, CRLF, dados, CRLF; termina no pedaço 0, trailers e linha vazia.
- Pipelining ficou desligado; os navegadores abrem até 6 conexões por origem. Divergência sobre o fim da mensagem é request smuggling.
- HTTP/2: quadros com cabeçalho de 9 bytes (tamanho 24 bits, tipo, flags, ID de fluxo 31 bits); fluxos ímpares do cliente, fluxo 0 é a conexão; END_STREAM marca o fim; RST_STREAM cancela um fluxo só.
- HPACK: tabela estática (61) + dinâmica (índice 62 é a mais nova; entrada = nome + valor + 32; saem as mais antigas) + Huffman.
- HTTP/3: fluxos QUIC, sem ID nos quadros; QPACK porque o HPACK exige processar os blocos em ordem. Descoberta por \`Alt-Svc\` ou pelo registro DNS HTTPS.`},{type:`callout`,tone:`english`,text:`- **framing, message body, chunked transfer coding, trailer fields**: enquadramento, corpo da mensagem, codificação em pedaços, campos de trailer
- **persistent connection, pipelining, head-of-line blocking, request smuggling**: conexão persistente, encadeamento, bloqueio de cabeça de fila, contrabando de requisições
- **frame, stream, stream identifier, multiplexing, flow control window**: quadro, fluxo, identificador de fluxo, multiplexação, janela de controle de fluxo
- **header compression, static table, dynamic table, pseudo-header**: compressão de cabeçalhos, tabela estática, tabela dinâmica, pseudocabeçalho

Frase típica de entrevista: *"HTTP/2 multiplexes many streams over a single TCP connection, which removes head-of-line blocking at the HTTP layer but not at the transport layer; HTTP/3 moves to QUIC so that a lost packet only stalls the stream it belongs to."*

Frase típica da RFC 9113: *"Streams initiated by a client MUST use odd-numbered stream identifiers."*`,title:`English corner`}]}],cards:[{id:`l9-http-versoes#1`,front:`Em que ordem o HTTP/1.1 decide o tamanho do corpo de uma resposta?`,back:`1) HEAD, 1xx, 204 ou 304: sem corpo; 2) Transfer-Encoding chunked; 3) Content-Length; 4) senão, até o servidor fechar a conexão.`},{id:`l9-http-versoes#2`,front:`Como termina um corpo chunked?`,back:`Com um pedaço de tamanho 0, seguido dos trailers opcionais e de uma linha vazia. Os tamanhos estão em hexadecimal.`},{id:`l9-http-versoes#3`,front:`Por que uma resposta a HEAD pode ter Content-Length: 5000 e corpo vazio?`,back:`Porque o Content-Length descreve o corpo que um GET teria; a resposta a HEAD nunca tem corpo, e quem lê não pode consumir aqueles bytes.`},{id:`l9-http-versoes#4`,front:`O que é request smuggling e qual o caso clássico?`,back:`Proxy e back-end discordam sobre onde a requisição termina, e uma segunda requisição se esconde no corpo da primeira. Clássico: Content-Length e Transfer-Encoding: chunked na mesma mensagem.`},{id:`l9-http-versoes#5`,front:`Quais são os campos do cabeçalho de quadro do HTTP/2?`,back:`9 bytes: tamanho (24 bits), tipo (8), flags (8), bit reservado + ID do fluxo (31).`},{id:`l9-http-versoes#6`,front:`Que números de fluxo o cliente usa no HTTP/2, e para que serve o fluxo 0?`,back:`Ímpares e crescentes (1, 3, 5...). O fluxo 0 é a própria conexão: SETTINGS, PING, GOAWAY.`},{id:`l9-http-versoes#7`,front:`Como funciona a tabela dinâmica do HPACK?`,back:`Guarda campos já enviados; a mais nova fica no índice 62; cada entrada custa nome + valor + 32 bytes; acima do teto (4.096 por padrão), saem as mais antigas.`},{id:`l9-http-versoes#8`,front:`Por que o HTTP/3 precisou do QPACK em vez do HPACK?`,back:`O HPACK exige processar os blocos na ordem de envio, porque as inserções na tabela vão dentro deles. Fluxos QUIC chegam em qualquer ordem; o QPACK manda as inserções por um fluxo separado.`},{id:`l9-http-versoes#9`,front:`Como o navegador descobre que um site aceita HTTP/3?`,back:`Pelo cabeçalho Alt-Svc (h3=":443") numa resposta anterior, ou pelo registro DNS HTTPS com alpn="h3,..." antes da primeira conexão.`}]};export{e as default};
//# sourceMappingURL=l9-http-versoes-CDA7kW2t.js.map