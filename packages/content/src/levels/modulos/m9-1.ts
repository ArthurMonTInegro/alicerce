/** Lições adicionais do módulo m9-1 (camadas, ip, tcp e udp). */
import type { Lesson } from '../../types.ts';
import { code, dedent, deep, english, info, lesson, md, py, t, warn } from '../../helpers.ts';

/* ------------------------------------------------------------------ */
/* IP por dentro: encapsulamento, sub-redes, roteamento e NAT           */
/* ------------------------------------------------------------------ */

/** Referência usada nos testes aleatórios do desafio de VLSM. */
const REF_VLSM = dedent(`
  import ipaddress as _ip
  import random as _random

  def _ref_alocar(bloco, pedidos):
      rede = _ip.ip_network(bloco)
      atual, fim = int(rede.network_address), int(rede.broadcast_address)
      res = {}
      for nome in sorted(pedidos, key=lambda n: (-pedidos[n], n)):
          bits = 2
          while (1 << bits) - 2 < pedidos[nome]:
              bits += 1
          tam = 1 << bits
          atual = (atual + tam - 1) // tam * tam
          if atual + tam - 1 > fim:
              raise ValueError(nome)
          res[nome] = f"{_ip.ip_address(atual)}/{32 - bits}"
          atual += tam
      return res

  def _confere_vlsm(bloco, pedidos, dica=""):
      try:
          esperado = _ref_alocar(bloco, pedidos)
      except ValueError:
          esperado = None
      if esperado is None:
          try:
              r = alocar(bloco, pedidos)
          except ValueError:
              return
          assert False, f"alocar({bloco!r}, {pedidos}) devolveu {r}, mas os pedidos não cabem no bloco: levante ValueError. {dica}"
      r = alocar(bloco, dict(pedidos))
      assert r == esperado, f"alocar({bloco!r}, {pedidos}) devolveu {r}, esperado {esperado}. {dica}"
`);

const ipRoteamento = lesson({
  id: 'l9-ip-subredes-nat',
  moduleId: 'm9-1',
  title: 'IP por dentro: sub-redes, roteamento pelo prefixo mais longo e NAT',
  titleEn: 'IP in depth: subnets, longest prefix match routing and NAT',
  summary: 'O que cada camada acrescenta ao pacote, como calcular rede, broadcast e hosts de qualquer prefixo, como um host decide entre entregar direto ou mandar ao gateway, como roteadores escolhem a rota mais específica, como o NAT deixa a casa inteira sair com um IP só, por que o CGNAT da operadora impede o redirecionamento de porta e o que muda no IPv6.',
  minutes: 50,
  objectives: [
    'Descrever o encapsulamento e dizer o que muda (MACs, TTL) e o que não muda (IPs) a cada salto',
    'Calcular endereço de rede, broadcast, quantidade de hosts e alinhamento de qualquer prefixo IPv4',
    'Reconhecer as faixas especiais: privadas, CGNAT, loopback, link-local e de documentação',
    'Explicar como um host decide entre entrega direta (com ARP) e o gateway padrão',
    'Aplicar a regra do prefixo mais longo numa tabela de rotas e explicar o papel do TTL',
    'Simular a tradução de endereços e portas do NAT e explicar por que conexões vindas de fora são descartadas',
    'Diagnosticar CGNAT e dizer o que o IPv6 resolve (e o que não resolve)',
  ],
  skills: ['redes-tcpip', 'comp-binario'],
  terms: [
    t('encapsulamento', 'encapsulation', 'Cada camada embrulha os dados da camada de cima com o próprio cabeçalho antes de passar para baixo.', 'Each layer encapsulates the payload from the layer above with its own header.'),
    t('unidade máxima de transmissão', 'maximum transmission unit (MTU)', 'Maior pacote IP que um enlace aceita sem fragmentar: 1500 bytes na Ethernet, 1492 no PPPoE.', 'Packets larger than the path MTU must be fragmented or dropped.'),
    t('tempo de vida', 'time to live (TTL)', 'Campo do cabeçalho IPv4 que cada roteador diminui em 1; ao chegar a 0, o pacote é descartado. No IPv6 se chama hop limit.'),
    t('sub-rede', 'subnet', 'Bloco de endereços contíguos que compartilham o mesmo prefixo e se alcançam sem passar por roteador.'),
    t('notação CIDR', 'CIDR notation', 'Escrever o endereço seguido de /n, em que n é o número de bits do prefixo de rede (ex.: 10.0.4.0/22).', 'The VPC uses the CIDR block 10.0.0.0/16.'),
    t('endereço de broadcast', 'broadcast address', 'Último endereço de uma sub-rede IPv4 (todos os bits de host em 1); um pacote para ele vai a todos os hosts da sub-rede.'),
    t('gateway padrão', 'default gateway', 'Roteador para onde o host manda tudo o que não está na própria sub-rede.', 'Make sure the default gateway is reachable.'),
    t('protocolo de resolução de endereços', 'Address Resolution Protocol (ARP)', 'Protocolo que descobre o endereço MAC de um IPv4 da mesma rede local ("quem tem 192.168.0.1?").'),
    t('tabela de rotas', 'routing table', 'Lista de prefixos com o próximo salto e a interface para cada um.', 'Check the routing table with `ip route`.'),
    t('casamento pelo prefixo mais longo', 'longest prefix match', 'Regra dos roteadores: entre as rotas que contêm o destino, vale a de prefixo mais longo, isto é, a mais específica.'),
    t('rota padrão', 'default route', 'A rota 0.0.0.0/0 (ou ::/0 no IPv6), que contém todos os endereços e só vale quando nenhuma outra casa.'),
    t('tradução de endereços de rede', 'network address translation (NAT)', 'Reescrita dos endereços (e, no NAPT, das portas) dos pacotes na fronteira entre a rede privada e a pública.', 'The home router performs NAT for every device on the LAN.'),
    t('NAT de grande escala da operadora', 'carrier-grade NAT (CGNAT)', 'NAT feito pela operadora, que coloca muitos clientes atrás do mesmo IP público; usa a faixa 100.64.0.0/10.'),
    t('redirecionamento de porta', 'port forwarding', 'Regra fixa no NAT que manda o que chega numa porta pública para um IP e uma porta da rede interna.'),
  ],
  stages: {
    conceito: [
      md(`
        Quando o seu notebook manda um pacote para um servidor do outro lado do país, ninguém no caminho conhece o trajeto inteiro. Cada equipamento toma **uma decisão local** olhando só o endereço de destino: "entrego direto ou passo para quem?". A lição anterior mostrou as camadas e o que é \`/24\`. Aqui abrimos as contas e as decisões:

        - a **{{sub-rede|subnet}}**: quais endereços estão "aqui do lado" e quais não;
        - a **{{tabela de rotas|routing table}}**, em que vale a rota mais específica, pelo **{{casamento pelo prefixo mais longo|longest prefix match}}**;
        - o **{{NAT|network address translation (NAT)}}**, que deixa todos os aparelhos da casa saírem pela internet com um único IP público.

        É isso que transforma "a internet caiu" num diagnóstico preciso ("o gateway não responde", "a máscara está errada", "estou atrás de CGNAT") e que explica por que o servidor de jogo que você subiu em casa não aparece para os amigos, mesmo com a porta "aberta" no roteador.
      `),
    ],
    explicacao: [
      md(`
        ### O que viaja no fio: encapsulamento
        Cada camada embrulha o que recebe de cima com o próprio cabeçalho; é o {{encapsulamento|encapsulation}}. Uma requisição HTTP vira o conteúdo de um segmento TCP (que acrescenta as portas), que vira o conteúdo de um pacote IP (que acrescenta os endereços), que vira o conteúdo de um quadro Ethernet ou Wi-Fi (que acrescenta os endereços MAC da placa de rede).
      `),
      {
        type: 'table',
        head: ['Camada', 'Unidade', 'Cabeçalho mínimo', 'Endereços que ele carrega'],
        rows: [
          ['Aplicação', 'mensagem (ex.: requisição HTTP)', 'definido pelo protocolo', 'nomes, URLs'],
          ['Transporte', 'segmento (TCP) ou datagrama (UDP)', '20 bytes (TCP), 8 bytes (UDP)', 'porta de origem e de destino'],
          ['Rede', 'pacote IP', '20 bytes (IPv4), 40 bytes (IPv6)', 'IP de origem e de destino'],
          ['Enlace', 'quadro (frame)', '14 bytes + 4 de verificação (Ethernet)', 'MAC de origem e de destino'],
        ],
        caption: 'Abra o Wireshark e clique num pacote: ele mostra exatamente essas camadas, uma dentro da outra.',
      },
      md(`
        Do cabeçalho IPv4, os campos que mais importam no dia a dia são: a **versão** (4), o **{{tempo de vida|time to live (TTL)}}**, o **protocolo** do conteúdo (1 = ICMP, 6 = TCP, 17 = UDP), os **endereços de origem e destino** e uma soma de verificação do próprio cabeçalho, refeita a cada salto porque o TTL muda.

        O detalhe que organiza todo o resto: **a cada salto, o quadro de enlace é jogado fora e refeito**, com novos MACs de origem e de destino, mas o pacote IP segue com os **mesmos IPs** do começo ao fim (a exceção é o NAT, que veremos adiante). O MAC diz "para qual vizinho entregar agora"; o IP diz "para onde, no fim, isso vai".

        Cada enlace tem uma {{unidade máxima de transmissão|maximum transmission unit (MTU)}}: 1500 bytes na Ethernet. Muitas operadoras de fibra no Brasil entregam a conexão por PPPoE (PPP sobre Ethernet), que gasta 8 bytes com o próprio cabeçalho e deixa a MTU em 1492. Por isso o maior conteúdo TCP por pacote, o MSS (*maximum segment size*, que a próxima lição detalha), costuma ser 1460 bytes (1500 − 20 do IP − 20 do TCP) ou 1452 no PPPoE. Um pacote IPv4 maior que a MTU do próximo enlace é fragmentado pelo roteador ou, se vier marcado com o bit DF (*don't fragment*, o caso comum hoje), descartado, e a origem recebe um aviso ICMP para diminuir o tamanho. No IPv6, roteadores nunca fragmentam; só a origem.

        ### Prefixo, máscara e as contas da sub-rede
        Em \`a.b.c.d/n\` ({{notação CIDR|CIDR notation}}), os \`n\` primeiros bits são o **prefixo de rede** e os \`32 − n\` restantes identificam o host. A máscara é o mesmo \`/n\` escrito em octetos: \`n\` bits 1 seguidos de zeros. As contas são operações bit a bit, as mesmas do desafio da lição anterior:

        - **endereço de rede** = IP AND máscara (bits de host todos em 0);
        - **{{endereço de broadcast|broadcast address}}** = endereço de rede com os bits de host todos em 1;
        - **total de endereços** = 2^(32 − n);
        - **hosts utilizáveis** = total − 2, porque o primeiro (a rede) e o último (o broadcast) não vão para aparelhos. Exceções: numa **/31**, usada em enlaces ponto a ponto entre dois roteadores, os dois endereços são utilizáveis (RFC 3021); uma **/32** é um único endereço.
      `),
      {
        type: 'table',
        head: ['Prefixo', 'Máscara', 'Endereços', 'Hosts utilizáveis', 'Uso típico'],
        rows: [
          ['/8', '255.0.0.0', '16.777.216', '16.777.214', 'a faixa privada 10.0.0.0/8 inteira'],
          ['/16', '255.255.0.0', '65.536', '65.534', 'uma VPC (a rede privada de uma conta na nuvem), uma rede de campus'],
          ['/22', '255.255.252.0', '1.024', '1.022', 'rede de escritório grande'],
          ['/24', '255.255.255.0', '256', '254', 'a rede de casa (192.168.0.0/24)'],
          ['/26', '255.255.255.192', '64', '62', 'um andar, um laboratório'],
          ['/27', '255.255.255.224', '32', '30', 'uma sala, câmeras de segurança'],
          ['/30', '255.255.255.252', '4', '2', 'enlace entre dois roteadores (modo antigo)'],
          ['/31', '255.255.255.254', '2', '2 (RFC 3021)', 'enlace ponto a ponto'],
          ['/32', '255.255.255.255', '1', '1', 'um endereço só (rota para um host)'],
        ],
      },
      md(`
        **O atalho do tamanho do bloco.** Quando a máscara não termina num octeto inteiro, pegue o primeiro octeto da máscara que não é 255 e faça 256 menos ele: é o tamanho do bloco naquele octeto. Numa /26 (máscara terminando em 192), os blocos têm 256 − 192 = 64 endereços e começam em 0, 64, 128 e 192. Logo, \`192.168.10.77/26\` está no bloco que começa em 64: rede \`192.168.10.64\`, broadcast \`192.168.10.127\`, hosts de \`.65\` a \`.126\`. Numa /22 (máscara \`255.255.252.0\`), o bloco é 256 − 252 = 4 no **terceiro** octeto: \`10.0.5.77/22\` está na rede \`10.0.4.0\`, que vai até \`10.0.7.255\`.

        A consequência importante é o **alinhamento**: uma sub-rede de tamanho 2^k só pode começar num múltiplo de 2^k. Não existe a rede \`192.168.10.32/26\`; o \`.32\` cai no meio do bloco que começa em \`.0\`. Dividir uma /24 em quatro /26 dá exatamente \`.0/26\`, \`.64/26\`, \`.128/26\` e \`.192/26\`.

        ### Endereços que não são "da internet"
      `),
      {
        type: 'table',
        head: ['Faixa', 'Para que serve', 'Onde você vê'],
        rows: [
          ['10.0.0.0/8, 172.16.0.0/12 (172.16 a 172.31), 192.168.0.0/16', 'privados (RFC 1918): podem se repetir em redes diferentes e não são roteados na internet', 'a rede de casa, do escritório, de uma VPC'],
          ['100.64.0.0/10 (100.64 a 100.127)', 'espaço compartilhado para o NAT da operadora, o CGNAT (RFC 6598)', 'o IP "da internet" que o seu roteador mostra, quando a operadora usa CGNAT'],
          ['127.0.0.0/8', 'loopback: a própria máquina', '`localhost`, `127.0.0.1`'],
          ['169.254.0.0/16', 'link-local: o aparelho se autoatribui quando não acha servidor DHCP', 'Wi-Fi "conectado, sem internet" com IP 169.254.x.x'],
          ['192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24', 'reservados para documentação e exemplos (RFC 5737)', 'livros, RFCs e esta lição'],
        ],
        caption: 'Por isso os IPs "públicos" dos exemplos daqui são 203.0.113.x e 198.51.100.x: são reservados para exemplos e nunca pertencem a ninguém.',
      },
      md(`
        ### A decisão de cada host: entrega direta ou gateway
        Antes de enviar, o host aplica a própria máscara ao destino e compara com a própria rede:

        - **Mesma sub-rede**: entrega direta. Ele precisa do MAC do destino e o descobre com o {{ARP|Address Resolution Protocol (ARP)}}, um pedido em broadcast na rede local: "quem tem 192.168.0.40? Responda para 192.168.0.23". A resposta fica num cache (\`ip neigh\` no Linux, \`arp -a\` no Windows). No IPv6, o papel do ARP é do NDP (*Neighbor Discovery Protocol*).
        - **Outra sub-rede**: o host manda o quadro para o MAC do **{{gateway padrão|default gateway}}**, o roteador da rede, mas o pacote IP continua endereçado ao destino final.

        No Linux, \`ip route\` mostra exatamente essas duas regras:
      `),
      code('text', `
        $ ip route
        default via 192.168.0.1 dev wlan0 proto dhcp metric 600
        192.168.0.0/24 dev wlan0 proto kernel scope link src 192.168.0.23 metric 600
      `, 'A segunda linha diz "a /24 está aqui do lado, entregue direto"; a primeira, "o resto vai para 192.168.0.1".'),
      warn(`
        Máscara errada quebra a rede de um jeito confuso. Com \`/16\` no lugar de \`/24\`, o host acha que \`192.168.5.9\` está "aqui do lado", faz ARP, ninguém responde e o pacote nunca vai ao roteador. Com \`/25\` no lugar de \`/24\`, o host acha que \`192.168.0.200\` está longe e manda tudo para o gateway, que talvez nem devolva. Quando "uns endereços da rede funcionam e outros não", confira a máscara antes de qualquer outra coisa.
      `, 'Máscara errada'),
      md(`
        ### Roteadores: a rota mais específica vence
        Um roteador tem várias rotas, e elas podem se sobrepor. A regra é o **prefixo mais longo**: entre todas as rotas que contêm o destino, vale a de \`/n\` maior, porque ela descreve um conjunto menor e mais específico de endereços. A {{rota padrão|default route}} \`0.0.0.0/0\` contém todos os endereços, mas tem o prefixo mais curto possível, então só vale quando nenhuma outra casa.

        É parecido com o CEP: o primeiro dígito diz a região (0 é a Grande São Paulo), os seguintes vão estreitando até a rua. Um centro de triagem dos Correios que tem uma regra para "0" e outra para "013" usa a mais específica para uma carta com CEP 01310-100.
      `),
      {
        type: 'table',
        head: ['Rota', 'Próximo salto', 'Destino 10.20.30.5', 'Destino 10.20.99.1', 'Destino 10.99.0.1', 'Destino 8.8.8.8'],
        rows: [
          ['0.0.0.0/0', 'operadora', 'contém', 'contém', 'contém', '**vence**'],
          ['10.0.0.0/8', 'VPN da matriz', 'contém', 'contém', '**vence**', '—'],
          ['10.20.0.0/16', 'filial Recife', 'contém', '**vence**', '—', '—'],
          ['10.20.30.0/24', 'laboratório (direto)', '**vence**', '—', '—', '—'],
        ],
        caption: 'A ordem das linhas na tabela não importa: o que decide é o tamanho do prefixo.',
      },
      md(`
        A cada salto, o roteador **diminui o TTL em 1**; se chegar a 0, descarta o pacote e devolve à origem uma mensagem ICMP *Time Exceeded*. Isso impede que um pacote preso num laço de rotas circule para sempre (o Linux começa com TTL 64; o Windows, com 128). O \`traceroute\` usa justamente isso: manda pacotes com TTL 1, 2, 3... e cada roteador que responde "tempo esgotado" se revela.

        De onde vêm as rotas? No seu computador, a rota da sub-rede sai do próprio endereço e da máscara da interface, e a rota padrão vem do DHCP, que informa qual é o gateway (o \`proto dhcp\` da saída acima). Dentro de uma operadora, de protocolos de roteamento como o OSPF. Entre operadoras, do **BGP**: cada rede anuncia aos vizinhos os prefixos que alcança. Boa parte dessa troca acontece em pontos de troca de tráfego (*IXPs*); o IX.br de São Paulo é um dos maiores do mundo.

        ### NAT: muitos aparelhos, um IP público
        O IPv4 só tem 2³² endereços, e a sua casa recebe, no máximo, um público. O roteador de casa resolve isso com **NAPT** (NAT com tradução de portas, RFC 3022), que todo mundo chama só de NAT:

        1. O notebook \`192.168.0.23\`, porta \`51000\`, manda um pacote para \`198.51.100.80:443\`.
        2. O roteador troca a origem pelo próprio IP público e por uma porta livre, \`203.0.113.45:40001\`, e anota na **tabela de tradução**: \`40001 ↔ 192.168.0.23:51000\`.
        3. A resposta chega para \`203.0.113.45:40001\`; o roteador consulta a tabela, troca o destino de volta para \`192.168.0.23:51000\` e entrega.

        A porta é o que permite dois aparelhos usarem a mesma porta de origem ao mesmo tempo: o celular \`192.168.0.31:51000\` ganha outra porta pública, \`40002\`. Ao reescrever os endereços, o NAT também refaz as somas de verificação do IP e do TCP/UDP (a do TCP inclui os IPs).

        Consequências que aparecem no dia a dia:

        - **Quem está fora não consegue iniciar conexão.** Um pacote que chega para \`203.0.113.45:8080\` sem entrada na tabela não tem para onde ir e é descartado. Para hospedar algo em casa, você cria um {{redirecionamento de porta|port forwarding}}: uma entrada fixa "8080 → 192.168.0.50:8080". Chamadas de vídeo e jogos ponto a ponto usam técnicas de travessia (STUN, TURN e ICE, no WebRTC) para contornar o NAT.
        - **As entradas expiram.** Uma conexão parada some da tabela depois de um tempo. As RFCs pedem pelo menos 2 minutos para UDP (RFC 4787) e 2 h 4 min para TCP estabelecido (RFC 5382), mas muitos roteadores usam valores menores; por isso aplicativos mandam mensagens de *keepalive*.
        - **NAT não é firewall**, embora tenha o efeito colateral de bloquear o que ninguém pediu.

        ### CGNAT: o NAT da operadora
        Muitas operadoras, sem IPv4 público para todo cliente, colocam **outro NAT dentro da rede delas**: o {{CGNAT|carrier-grade NAT (CGNAT)}}. O roteador da sua casa recebe na WAN um endereço da faixa \`100.64.0.0/10\`, e centenas de clientes saem pelo mesmo IP público. O sintoma clássico: você cria o redirecionamento de porta no seu roteador, mas a conexão de fora morre antes, no NAT da operadora, onde você não manda. Para confirmar, compare o IP WAN que o roteador mostra com o IP que um site do tipo "qual é meu IP" exibe. Se forem iguais, não há outro NAT. Se forem diferentes, há: com o do roteador em 100.64–100.127, é o CGNAT; com um endereço privado (192.168.x.x, por exemplo), pode ser a ONU da operadora, o aparelho da fibra, também funcionando como roteador (um NAT duplo dentro de casa, que se resolve pedindo o modo *bridge*), ou uma operadora que usa faixa privada no próprio CGNAT. As saídas são pedir um IPv4 público à operadora (às vezes pago), usar IPv6 ou um túnel reverso para um servidor com IP público.

        ### O que o IPv6 muda
      `),
      {
        type: 'table',
        head: ['', 'IPv4', 'IPv6'],
        rows: [
          ['tamanho do endereço', '32 bits: 203.0.113.45', '128 bits em 8 grupos hexadecimais: 2001:db8:0:1::45 (`::` abrevia uma sequência de grupos zerados)'],
          ['rede local típica', '/24, com NAT', '/64 por rede local; a operadora costuma delegar à casa um bloco maior, de prefixo mais curto (uma /56 tem 256 redes /64)'],
          ['NAT', 'quase obrigatório', 'desnecessário: cada aparelho tem endereço global'],
          ['descobrir o MAC do vizinho', 'ARP', 'NDP (mensagens ICMPv6)'],
          ['broadcast', 'existe', 'não existe: usa multicast'],
          ['TTL', 'TTL', 'hop limit, mesma função'],
          ['soma de verificação do cabeçalho', 'sim, refeita a cada salto', 'não tem (o enlace e o transporte já verificam)'],
          ['fragmentação', 'roteadores podem fragmentar', 'só a origem fragmenta'],
          ['loopback / link-local / documentação', '127.0.0.1 / 169.254.0.0/16 / 192.0.2.0/24', '::1 / fe80::/10 / 2001:db8::/32'],
        ],
      },
      md(`
        Sem NAT, um aparelho com IPv6 é alcançável de fora **se o firewall deixar**. Os roteadores domésticos, por recomendação da RFC 6092, bloqueiam por padrão conexões que chegam sem ter sido pedidas: o bloqueio passa a ser decisão de firewall, explícita, e não efeito colateral da tradução.
      `),
      deep(`
        A RFC 4787 classifica o comportamento dos NATs em duas dimensões. **Mapeamento**: a mesma porta interna recebe a mesma porta pública para qualquer destino (*endpoint-independent*) ou uma porta diferente por destino. **Filtragem**: quem pode mandar pacotes para aquela porta pública, se qualquer um, só o IP que foi contatado, ou só o par IP e porta contatado. NATs com mapeamento independente do destino permitem a travessia por STUN; os que mudam a porta a cada destino (o antigo "NAT simétrico") obrigam a usar um retransmissor TURN, que custa banda do provedor da chamada.
      `, 'Nem todo NAT é igual'),
    ],
    exemplo: [
      md(`
        O notebook \`192.168.0.23/24\` abre uma conexão HTTPS com \`198.51.100.80\`. O roteador de casa tem \`192.168.0.1\` na LAN e \`203.0.113.45\` na WAN. Acompanhe os endereços em cada trecho:
      `),
      {
        type: 'table',
        head: ['Passo', 'Onde', 'Decisão', 'Origem (IP:porta)', 'Destino (IP:porta)', 'TTL'],
        rows: [
          ['1', 'notebook', '198.51.100.80 AND 255.255.255.0 = 198.51.100.0, que não é 192.168.0.0: vai pelo gateway', '—', '—', '—'],
          ['2', 'notebook', 'ARP: "quem tem 192.168.0.1?"; o roteador responde com o MAC dele', '—', '—', '—'],
          ['3', 'notebook → roteador', 'quadro para o MAC do roteador; o pacote IP já vai para o destino final', '192.168.0.23:51000', '198.51.100.80:443', '64'],
          ['4', 'roteador de casa', 'NAT: troca a origem, anota 40001 ↔ 192.168.0.23:51000; rota padrão para a operadora', '203.0.113.45:40001', '198.51.100.80:443', '63'],
          ['5', 'roteadores da operadora e da internet', 'prefixo mais longo em cada um; MACs novos a cada salto; IPs e portas intactos', '203.0.113.45:40001', '198.51.100.80:443', '62, 61, ...'],
          ['6', 'servidor', 'responde trocando origem e destino', '198.51.100.80:443', '203.0.113.45:40001', 'o inicial do servidor (64 no Linux)'],
          ['7', 'roteador de casa', 'acha 40001 na tabela e troca o destino de volta', '198.51.100.80:443', '192.168.0.23:51000', 'o que sobrou, menos 1'],
        ],
        caption: 'O servidor nunca vê 192.168.0.23: para ele, quem conectou foi 203.0.113.45. Se houvesse CGNAT, haveria mais uma tradução entre os passos 4 e 5.',
      },
      md(`
        Agora o caminho inverso, que **não** funciona: um amigo tenta abrir \`203.0.113.45:25565\` (a porta do servidor de Minecraft que está no notebook). O pacote chega ao roteador no passo 7, mas não há nenhuma entrada 25565 na tabela; o roteador descarta. Com um redirecionamento de porta "25565 → 192.168.0.23:25565", a tradução existe desde o início e o passo 7 acontece normalmente, a menos que a WAN do roteador seja um 100.64.x.x: aí o pacote do amigo morre no CGNAT da operadora, antes de chegar à sua casa.
      `),
    ],
    codigo: [
      md('O módulo `ipaddress` da biblioteca padrão faz as contas de sub-rede para você (e roda aqui no navegador). A segunda parte é um NAT de brinquedo, que guarda a tabela de tradução num dicionário.'),
      py(`
        import ipaddress

        # 1. As contas de uma sub-rede
        iface = ipaddress.ip_interface("192.168.10.77/26")
        rede = iface.network
        hosts = list(rede.hosts())                 # exclui rede e broadcast
        print("endereço:", iface.ip, "| rede:", rede, "| máscara:", rede.netmask)
        print("broadcast:", rede.broadcast_address)
        print("hosts utilizáveis:", len(hosts), f"({hosts[0]} a {hosts[-1]})")

        # 2. Uma /24 dividida em quatro /26: cada uma começa num múltiplo de 64
        print("sub-redes:", [str(s) for s in ipaddress.ip_network("192.168.10.0/24").subnets(new_prefix=26)])

        # 3. Um NAT de brinquedo (NAPT): traduz na saída, destraduz na volta
        class Nat:
            def __init__(self, ip_publico, primeira_porta=40001):
                self.ip_publico = ip_publico
                self.proxima = primeira_porta
                self.saida = {}    # (ip privado, porta privada) -> porta pública
                self.volta = {}    # porta pública -> (ip privado, porta privada)

            def sair(self, origem):
                if origem not in self.saida:
                    self.saida[origem] = self.proxima
                    self.volta[self.proxima] = origem
                    self.proxima += 1
                return (self.ip_publico, self.saida[origem])

            def entrar(self, porta_publica):
                return self.volta.get(porta_publica)   # None: ninguém de dentro pediu isso, descarta

        nat = Nat("203.0.113.45")
        for aparelho in [("192.168.0.23", 51000), ("192.168.0.31", 51000), ("192.168.0.23", 51000)]:
            print("sai  ", aparelho, "como", nat.sair(aparelho))
        print("chega na 40001 ->", nat.entrar(40001))
        print("chega na 25565 ->", nat.entrar(25565))
      `, { caption: 'Os dois aparelhos usam a porta 51000, e o NAT dá a cada um uma porta pública diferente. A terceira saída reaproveita a tradução que já existia. Experimente outros prefixos na parte 1 e confira com o atalho do tamanho do bloco.' }),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e9-ipnat-1',
          kind: 'mcq',
          prompt: 'A rede das câmeras de segurança de um condomínio é `10.8.3.32/27`. Quantos aparelhos, no máximo, podem receber um endereço nela?',
          difficulty: 'facil',
          skills: ['redes-tcpip', 'comp-binario'],
          hints: [
            'Quantos bits sobram para os hosts numa /27?',
            'Com esses bits, quantos endereços existem ao todo? Algum deles não pode ir para um aparelho?',
          ],
          explanation: 'Uma /27 deixa 32 − 27 = 5 bits para os hosts: 2⁵ = 32 endereços. O primeiro (10.8.3.32, a rede) e o último (10.8.3.63, o broadcast) não vão para aparelhos, sobrando 30, de 10.8.3.33 a 10.8.3.62.',
          options: [
            { text: '32', feedback: 'Esse é o total de endereços do bloco. O primeiro identifica a rede e o último é o broadcast: nenhum dos dois pode ir para uma câmera.' },
            { text: '30', correct: true, feedback: 'Isso: 2⁵ = 32 endereços, menos a rede e o broadcast.' },
            { text: '27', feedback: 'O /27 é a quantidade de bits do prefixo de rede, não a quantidade de hosts. Os bits de host são os que sobram: 32 − 27.' },
            { text: '62', feedback: '62 é o número de hosts de uma /26 (6 bits de host). Numa /27 sobra um bit a menos, e cada bit a menos corta o bloco pela metade.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e9-ipnat-2',
          kind: 'predict',
          lang: 'python',
          prompt: 'O que este programa imprime? Faça as contas na mão antes de rodar (lembre do atalho do tamanho do bloco, aqui no terceiro octeto).',
          code: dedent(`
            import ipaddress

            i = ipaddress.ip_interface("10.0.5.77/22")
            print(i.network)
            print(i.network.broadcast_address)
            print(ipaddress.ip_address("10.0.7.200") in i.network)
            print(ipaddress.ip_address("10.0.8.1") in i.network)
          `),
          answer: '10.0.4.0/22\n10.0.7.255\nTrue\nFalse',
          difficulty: 'intermediario',
          skills: ['redes-tcpip', 'comp-binario'],
          hints: [
            'Em que octeto a máscara de uma /22 deixa de ser 255? Quanto vale esse octeto da máscara?',
            'Qual é o tamanho do bloco nesse octeto, e qual múltiplo dele fica logo abaixo de 5?',
            'O broadcast é o último endereço do bloco: até onde vai o terceiro octeto, e quanto vale o quarto?',
          ],
          explanation: 'A máscara da /22 é 255.255.252.0: o bloco tem 256 − 252 = 4 unidades no terceiro octeto, começando em 0, 4, 8... O 5 cai no bloco que começa em 4, então a rede é 10.0.4.0/22 e o broadcast, 10.0.7.255 (terceiro octeto até 4 + 3 = 7, quarto octeto todo em 1). 10.0.7.200 está dentro; 10.0.8.1 já é o próximo bloco.',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e9-ipnat-3',
          kind: 'fix',
          lang: 'python',
          prompt: dedent(`
            A função \`decidir(minha_interface, destino, gateway)\` imita a decisão de um host antes de mandar um pacote: devolve \`("direto", destino)\` se o destino está na mesma sub-rede (aí bastaria um ARP) e \`("gateway", gateway)\` caso contrário. \`minha_interface\` vem no formato \`"ip/prefixo"\`.

            Ela funciona na rede de casa, mas o suporte de uma empresa reclamou: na rede \`172.20.0.0/16\`, computadores vizinhos mandam um para o outro tudo pelo roteador, que fica sobrecarregado à toa, e na sub-rede \`192.168.10.64/26\` os pacotes para outras sub-redes nunca chegam ao roteador. Encontre o erro e corrija, para qualquer prefixo de 0 a 32.
          `),
          difficulty: 'intermediario',
          skills: ['redes-tcpip', 'comp-binario'],
          hints: [
            'Teste com `decidir("172.20.0.5/16", "172.20.9.9", "172.20.0.1")`. Os dois estão na mesma /16? O que a função responde?',
            'A função usa o prefixo que veio depois da barra?',
            'Comparar os três primeiros octetos é o mesmo que aplicar qual máscara?',
            'O que a lição diz sobre como o host compara o destino com a própria rede? O módulo `ipaddress` pode ajudar.',
          ],
          explanation: 'O código comparava sempre os três primeiros octetos, ou seja, assumia /24 para qualquer rede, e ignorava o prefixo informado. Numa /16, isso manda ao gateway destinos que estão do lado; numa /26, faz o host tentar ARP para endereços de outra sub-rede, e ninguém responde. O certo é aplicar a máscara do prefixo real ao destino e comparar com a própria rede, como faz `ipaddress.ip_interface(minha_interface).network` com o operador `in`, ou com as contas bit a bit da lição anterior.',
          starter: dedent(`
            def decidir(minha_interface, destino, gateway):
                """minha_interface: "ip/prefixo" do host, ex. "192.168.0.23/24".
                Devolve ("direto", destino) se destino está na mesma sub-rede;
                senão, ("gateway", gateway)."""
                meu_ip, prefixo = minha_interface.split("/")
                if meu_ip.split(".")[:3] == destino.split(".")[:3]:
                    return ("direto", destino)
                return ("gateway", gateway)
          `),
          solution: dedent(`
            import ipaddress

            def decidir(minha_interface, destino, gateway):
                """minha_interface: "ip/prefixo" do host, ex. "192.168.0.23/24".
                Devolve ("direto", destino) se destino está na mesma sub-rede;
                senão, ("gateway", gateway)."""
                minha_rede = ipaddress.ip_interface(minha_interface).network
                if ipaddress.ip_address(destino) in minha_rede:
                    return ("direto", destino)
                return ("gateway", gateway)
          `),
          tests: [
            {
              name: 'rede de casa (/24) continua funcionando',
              code: dedent(`
                r = decidir("192.168.0.23/24", "192.168.0.40", "192.168.0.1")
                assert r == ("direto", "192.168.0.40"), f"192.168.0.40 está na mesma /24: entrega direta; veio {r!r}"
                r = decidir("192.168.0.23/24", "198.51.100.80", "192.168.0.1")
                assert r == ("gateway", "192.168.0.1"), f"198.51.100.80 é de fora: vai pelo gateway; veio {r!r}"
              `),
            },
            {
              name: 'na /16, a rede inteira é local',
              code: dedent(`
                r = decidir("172.20.0.5/16", "172.20.9.9", "172.20.0.1")
                assert r == ("direto", "172.20.9.9"), f"numa /16, 172.20.9.9 está na mesma sub-rede de 172.20.0.5 (os dois primeiros octetos batem): entrega direta; veio {r!r}"
                r = decidir("172.20.0.5/16", "172.21.0.5", "172.20.0.1")
                assert r == ("gateway", "172.20.0.1"), f"172.21.0.5 está fora da 172.20.0.0/16; veio {r!r}"
              `),
            },
            {
              name: 'na /26, o mesmo terceiro octeto não basta',
              code: dedent(`
                r = decidir("192.168.10.77/26", "192.168.10.130", "192.168.10.65")
                assert r == ("gateway", "192.168.10.65"), f"192.168.10.77/26 vai de .64 a .127: o .130 está em outra sub-rede e precisa do gateway; veio {r!r}"
                r = decidir("192.168.10.77/26", "192.168.10.100", "192.168.10.65")
                assert r == ("direto", "192.168.10.100"), f"o .100 está no bloco .64–.127: entrega direta; veio {r!r}"
                r = decidir("192.168.10.77/26", "192.168.10.63", "192.168.10.65")
                assert r == ("gateway", "192.168.10.65"), f"o .63 é o broadcast do bloco anterior (.0–.63): outra sub-rede; veio {r!r}"
              `),
            },
            {
              name: 'prefixos /8, /22, /32 e /0',
              code: dedent(`
                assert decidir("10.1.2.3/8", "10.200.0.1", "10.0.0.1") == ("direto", "10.200.0.1"), "numa /8, tudo que começa com 10. é local"
                assert decidir("10.0.5.77/22", "10.0.7.200", "10.0.4.1") == ("direto", "10.0.7.200"), "10.0.5.77/22 vai de 10.0.4.0 a 10.0.7.255"
                assert decidir("10.0.5.77/22", "10.0.8.1", "10.0.4.1") == ("gateway", "10.0.4.1"), "10.0.8.1 está fora da 10.0.4.0/22"
                assert decidir("203.0.113.9/32", "203.0.113.10", "203.0.113.1") == ("gateway", "203.0.113.1"), "numa /32 não há vizinhos: tudo vai pelo gateway"
                assert decidir("192.168.0.23/0", "8.8.8.8", "192.168.0.1") == ("direto", "8.8.8.8"), "com /0, a 'sub-rede' é a internet inteira"
              `),
            },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e9-ipnat-4',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Escreva \`proximo_salto(tabela, destino)\`, a decisão de um roteador. \`tabela\` é uma lista de pares \`(prefixo, salto)\`, como \`("10.20.0.0/16", "filial Recife")\`, em qualquer ordem; \`destino\` é um IPv4 em texto.

            Devolva o \`salto\` da rota de **prefixo mais longo** que contém o destino, ou \`None\` se nenhuma rota contiver (a tabela pode não ter rota padrão). Pode usar o módulo \`ipaddress\`. Os prefixos da tabela são todos diferentes entre si.
          `),
          difficulty: 'intermediario',
          skills: ['redes-tcpip'],
          hints: [
            'Para o destino 10.20.30.5, quais linhas da tabela da lição contêm o endereço? Quantas são?',
            'Entre as que contêm, qual critério escolhe a vencedora? Ele depende da posição da linha na lista?',
            'Comparar o texto do prefixo com o começo do destino funciona para 10.2.0.0/16 e 10.20.1.1?',
            'Um objeto `ip_network` tem um atributo com o tamanho do prefixo. Como guardar a melhor rota vista até agora enquanto percorre a lista?',
          ],
          explanation: 'Todas as rotas que contêm o destino são candidatas; vence a de prefixo maior, porque descreve o conjunto menor e mais específico de endereços. A posição na lista não importa, e é por isso que pegar a primeira que casa falha quando a rota padrão vem antes. Comparar strings também falha: "10.20.1.1" começa com "10.2", mas não está em 10.2.0.0/16. Roteadores de verdade fazem essa busca em nanossegundos com árvores de prefixos (tries) ou memórias especiais (TCAM), mas a regra é exatamente esta.',
          starter: dedent(`
            def proximo_salto(tabela, destino):
                # tabela: lista de (prefixo, salto), ex. [("10.0.0.0/8", "vpn"), ("0.0.0.0/0", "operadora")]
                # devolva o salto da rota mais específica que contém destino, ou None
                pass
          `),
          solution: dedent(`
            import ipaddress

            def proximo_salto(tabela, destino):
                ip = ipaddress.ip_address(destino)
                melhor, salto_melhor = -1, None
                for prefixo, salto in tabela:
                    rede = ipaddress.ip_network(prefixo)
                    if ip in rede and rede.prefixlen > melhor:
                        melhor, salto_melhor = rede.prefixlen, salto
                return salto_melhor
          `),
          tests: [
            {
              name: 'a tabela da lição',
              code: dedent(`
                _t = [("0.0.0.0/0", "operadora"), ("10.0.0.0/8", "vpn"), ("10.20.0.0/16", "recife"), ("10.20.30.0/24", "lab")]
                for d, s in [("10.20.30.5", "lab"), ("10.20.99.1", "recife"), ("10.99.0.1", "vpn"), ("8.8.8.8", "operadora")]:
                    r = proximo_salto(_t, d)
                    assert r == s, f"destino {d}: a rota mais específica leva a {s!r}, mas veio {r!r}"
              `),
            },
            {
              name: 'a ordem da tabela não importa',
              code: dedent(`
                _t = [("10.20.30.0/24", "lab"), ("10.20.0.0/16", "recife"), ("10.0.0.0/8", "vpn"), ("0.0.0.0/0", "operadora")]
                assert proximo_salto(list(reversed(_t)), "10.20.30.5") == "lab", "com a rota padrão no começo da lista, a /24 ainda precisa vencer: não pare na primeira que contém o destino"
                assert proximo_salto(_t, "8.8.8.8") == "operadora", "com a /24 no começo, 8.8.8.8 só casa com a rota padrão"
                _t2 = [("10.20.0.0/16", "recife"), ("10.20.30.0/24", "lab"), ("10.0.0.0/8", "vpn")]
                assert proximo_salto(_t2, "10.20.30.5") == "lab", "a rota mais específica pode estar no meio da lista"
              `),
            },
            {
              name: 'sem rota: None',
              code: dedent(`
                _t = [("10.0.0.0/8", "vpn"), ("192.168.0.0/24", "lan")]
                r = proximo_salto(_t, "8.8.8.8")
                assert r is None, f"nenhuma rota contém 8.8.8.8 e não há rota padrão: devolva None; veio {r!r}"
                assert proximo_salto([], "10.0.0.1") is None, "tabela vazia: None"
              `),
            },
            {
              name: 'prefixos fora dos limites de octeto',
              code: dedent(`
                _t = [("192.168.10.0/24", "lan"), ("192.168.10.64/26", "lab"), ("192.168.10.77/32", "impressora")]
                assert proximo_salto(_t, "192.168.10.77") == "impressora", "uma rota /32 é a mais específica possível"
                assert proximo_salto(_t, "192.168.10.100") == "lab", ".100 está em 192.168.10.64/26 (.64 a .127)"
                assert proximo_salto(_t, "192.168.10.130") == "lan", ".130 está fora da /26, só casa com a /24"
              `),
            },
            {
              name: 'texto parecido não é prefixo',
              code: dedent(`
                _t = [("10.2.0.0/16", "A"), ("10.20.0.0/16", "B")]
                r = proximo_salto(_t, "10.20.1.1")
                assert r == "B", f"10.20.1.1 começa com o texto '10.2', mas não está em 10.2.0.0/16 (que vai de 10.2.0.0 a 10.2.255.255); veio {r!r}"
                assert proximo_salto(_t, "10.200.0.1") is None, "10.200.0.1 não está em nenhuma das duas /16"
              `),
            },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e9-ipnat-5',
          kind: 'mcq',
          prompt: 'Júlia criou no roteador de casa o redirecionamento "porta 25565 → 192.168.0.23:25565" para o servidor de Minecraft. De dentro de casa, conectando em 192.168.0.23, funciona; os amigos, de fora, não conseguem. A página do roteador mostra o IP da WAN como `100.72.14.9`, e um site "qual é meu IP" mostra `203.0.113.200`. Qual é a explicação mais provável?',
          difficulty: 'intermediario',
          skills: ['redes-tcpip'],
          hints: [
            'Em que faixa especial está 100.72.14.9?',
            'Se o roteador da Júlia tivesse o IP público, os dois endereços seriam iguais ou diferentes?',
            'Quantos NATs há entre os amigos e o notebook? Em qual deles a Júlia consegue criar regras?',
          ],
          explanation: 'O endereço da WAN está em 100.64.0.0/10, a faixa do CGNAT, e é diferente do IP que a internet vê: há um segundo NAT, na operadora. O pacote dos amigos vai para 203.0.113.200:25565, chega ao NAT da operadora, que não tem nenhuma tradução para essa porta, e é descartado ali, antes de chegar à casa da Júlia. A regra no roteador dela nunca é consultada. Saídas: pedir IPv4 público à operadora, usar IPv6 ou um túnel reverso.',
          options: [
            { text: 'A operadora usa CGNAT: a conexão dos amigos morre no NAT da operadora, antes de chegar ao roteador da Júlia', correct: true, feedback: 'Isso: 100.72.14.9 está na faixa do CGNAT (100.64.0.0/10), e a diferença entre os dois IPs mostra que existe outra tradução no caminho, onde a Júlia não manda.' },
            { text: 'A regra está errada: o redirecionamento deveria apontar para 100.72.14.9', feedback: 'O redirecionamento aponta para o aparelho da rede interna que vai atender, e esse é o notebook, 192.168.0.23. 100.72.14.9 é o endereço do próprio roteador do lado da operadora.' },
            { text: 'A porta 25565 é bloqueada pelo TCP porque passa de 1023', feedback: 'Nada no TCP bloqueia portas altas: elas são usadas o tempo todo. A regra que existe é outra: em sistemas Unix, abrir uma porta abaixo de 1024 exige privilégio de administrador. E, de dentro de casa, a mesma porta funciona.' },
            { text: 'O notebook precisa de um IPv4 público, porque 192.168.0.23 não pode receber conexões', feedback: 'Atrás de um NAT com redirecionamento de porta, um endereço privado recebe conexões normalmente: é para isso que serve a regra. O problema está em outro NAT, antes do roteador.' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e9-ipnat-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Você recebeu da TI um bloco, como \`"192.168.1.0/24"\`, e precisa dividi-lo entre setores que têm tamanhos diferentes (a técnica se chama VLSM, máscaras de tamanho variável). Escreva \`alocar(bloco, pedidos)\`, em que \`pedidos\` é um dict \`setor → número de aparelhos\` (inteiro ≥ 1), e devolva um dict \`setor → "rede/prefixo"\`.

            Regras:
            1. Cada setor recebe a **menor** sub-rede cujos hosts utilizáveis (total − 2) bastem. Não use /31 nem /32: a menor permitida é /30.
            2. Atenda os setores do **maior pedido para o menor**; em caso de empate, em ordem alfabética do nome.
            3. Cada sub-rede começa no primeiro endereço livre do bloco que respeite o **alinhamento** (uma sub-rede de 2^k endereços começa num múltiplo de 2^k).
            4. Se alguma não couber dentro do bloco, levante \`ValueError\`.

            Exemplo: \`alocar("192.168.1.0/24", {"vendas": 100, "ti": 50, "rh": 20, "link": 2})\` devolve \`{"vendas": "192.168.1.0/25", "ti": "192.168.1.128/26", "rh": "192.168.1.192/27", "link": "192.168.1.224/30"}\`. Pode usar o módulo \`ipaddress\`.
          `),
          difficulty: 'desafio',
          skills: ['redes-tcpip', 'comp-binario'],
          hints: [
            'Para 100 aparelhos, quantos bits de host você precisa? Confira: 2⁶ − 2 bastaria? E 2⁷ − 2?',
            'Cuidado com o limite: 62 aparelhos cabem numa /26? E 63?',
            'Por que atender do maior para o menor faz o alinhamento quase sempre sair de graça?',
            'Converter endereços para inteiros (`int(ipaddress.ip_address(...))`) deixa o "próximo endereço livre" virar uma soma. Como arredondar um inteiro para cima até o próximo múltiplo de um tamanho?',
            'Onde termina o bloco? Compare o último endereço de cada sub-rede com ele antes de aceitar.',
          ],
          explanation: 'Para cada setor, procure o menor k com 2^k − 2 ≥ aparelhos (e k ≥ 2); o prefixo é 32 − k. Em ordem decrescente de tamanho, cada sub-rede nova tem tamanho menor ou igual ao da anterior, e por isso o próximo endereço livre já está alinhado; o arredondamento para o múltiplo seguinte é só uma garantia. O erro mais comum é esquecer os 2 endereços reservados (62 aparelhos cabem numa /26, 63 não) ou não perceber que a soma dos blocos passou do fim. É assim que se planeja o endereçamento de uma empresa ou das sub-redes de uma VPC na nuvem.',
          starter: dedent(`
            def alocar(bloco, pedidos):
                # bloco: "rede/prefixo"; pedidos: dict setor -> número de aparelhos
                # devolva dict setor -> "rede/prefixo"; ValueError se não couber
                pass
          `),
          solution: dedent(`
            import ipaddress

            def alocar(bloco, pedidos):
                rede = ipaddress.ip_network(bloco)
                atual = int(rede.network_address)
                fim = int(rede.broadcast_address)
                resultado = {}
                for setor in sorted(pedidos, key=lambda s: (-pedidos[s], s)):
                    bits = 2
                    while 2 ** bits - 2 < pedidos[setor]:
                        bits += 1
                    tamanho = 2 ** bits
                    atual = (atual + tamanho - 1) // tamanho * tamanho   # alinha
                    if atual + tamanho - 1 > fim:
                        raise ValueError(f"o setor {setor} não cabe em {bloco}")
                    resultado[setor] = f"{ipaddress.ip_address(atual)}/{32 - bits}"
                    atual += tamanho
                return resultado
          `),
          tests: [
            {
              name: 'o exemplo do enunciado',
              code: REF_VLSM + '\n' + dedent(`
                r = alocar("192.168.1.0/24", {"vendas": 100, "ti": 50, "rh": 20, "link": 2})
                esperado = {"vendas": "192.168.1.0/25", "ti": "192.168.1.128/26", "rh": "192.168.1.192/27", "link": "192.168.1.224/30"}
                assert r == esperado, f"veio {r}, esperado {esperado}"
              `),
            },
            {
              name: 'os 2 endereços reservados contam',
              code: REF_VLSM + '\n' + dedent(`
                r = alocar("10.0.0.0/24", {"a": 62})
                assert r == {"a": "10.0.0.0/26"}, f"62 aparelhos cabem numa /26 (64 − 2 = 62); veio {r}"
                r = alocar("10.0.0.0/24", {"a": 63})
                assert r == {"a": "10.0.0.0/25"}, f"63 aparelhos não cabem numa /26 (só 62 hosts): precisa de /25; veio {r}"
                r = alocar("10.0.0.0/24", {"a": 1})
                assert r == {"a": "10.0.0.0/30"}, f"a menor sub-rede permitida é /30, mesmo para 1 aparelho; veio {r}"
                r = alocar("10.0.0.0/24", {"a": 2, "b": 3})
                assert r == {"b": "10.0.0.0/29", "a": "10.0.0.8/30"}, f"3 aparelhos precisam de /29 (uma /30 só tem 2 hosts), e o maior pedido vem primeiro; veio {r}"
              `),
            },
            {
              name: 'ordem: maior primeiro, empate por nome',
              code: REF_VLSM + '\n' + dedent(`
                r = alocar("172.16.0.0/24", {"zeta": 10, "alfa": 10, "beta": 30})
                esperado = {"beta": "172.16.0.0/27", "alfa": "172.16.0.32/28", "zeta": "172.16.0.48/28"}
                assert r == esperado, f"beta (30) primeiro; alfa e zeta empatam em 10 e vão em ordem alfabética; veio {r}"
                r = alocar("172.16.0.0/24", {"b": 60, "a": 50})
                assert r == {"b": "172.16.0.0/26", "a": "172.16.0.64/26"}, f"60 > 50, então b vem antes, mesmo com o nome maior; veio {r}"
              `),
            },
            {
              name: 'bloco que não começa em .0 e prefixo /22',
              code: REF_VLSM + '\n' + dedent(`
                r = alocar("10.0.4.0/22", {"escritorio": 500, "wifi": 200, "servidores": 30})
                esperado = {"escritorio": "10.0.4.0/23", "wifi": "10.0.6.0/24", "servidores": "10.0.7.0/27"}
                assert r == esperado, f"veio {r}, esperado {esperado}"
                r = alocar("192.168.1.128/25", {"a": 60, "b": 20})
                assert r == {"a": "192.168.1.128/26", "b": "192.168.1.192/27"}, f"as sub-redes começam dentro do bloco, a partir de .128; veio {r}"
              `),
            },
            {
              name: 'não cabe: ValueError',
              code: REF_VLSM + '\n' + dedent(`
                for bloco, pedidos in [("192.168.1.0/24", {"a": 200, "b": 100}), ("192.168.1.0/24", {"a": 300}),
                                       ("10.0.0.0/30", {"a": 2, "b": 1}), ("192.168.1.0/25", {"a": 126, "b": 1})]:
                    try:
                        r = alocar(bloco, pedidos)
                    except ValueError:
                        continue
                    assert False, f"alocar({bloco!r}, {pedidos}) devolveu {r}, mas a soma dos blocos passa do fim de {bloco}: levante ValueError"
                r = alocar("192.168.1.0/24", {"a": 126, "b": 126})
                assert r == {"a": "192.168.1.0/25", "b": "192.168.1.128/25"}, f"duas /25 cabem exatamente numa /24; veio {r}"
              `),
            },
            {
              name: 'casos aleatórios',
              code: REF_VLSM + '\n' + dedent(`
                _rng = _random.Random(91)
                for _ in range(300):
                    p = _rng.choice([20, 22, 24, 26])
                    base = _rng.randrange(0, 2 ** 32, 2 ** (32 - p))
                    bloco = f"{_ip.ip_address(base)}/{p}"
                    nomes = _rng.sample(["rh", "ti", "dev", "ops", "wifi", "cam", "link", "lab"], _rng.randint(1, 6))
                    pedidos = {n: _rng.choice([1, 2, 3, 6, 14, 15, 30, 31, 62, 63, 100, 126, 127, 254, 500]) for n in nomes}
                    _confere_vlsm(bloco, pedidos)
              `),
            },
          ],
        },
      },
    ],
    projeto: [
      md(`
        **Sua operadora usa CGNAT?** Descubra o IP da WAN do seu roteador (na página de administração, em geral \`192.168.0.1\` ou \`192.168.1.1\`) e compare com o IP que um site "qual é meu IP" mostra. Explique o resultado com o que você aprendeu: há um NAT ou dois? Depois, rode \`ip route\` (Linux), \`route -n get default\` (macOS) ou \`route print\` (Windows) e identifique a rota padrão e a rota da sua sub-rede. Calcule à mão a rede, o broadcast e o número de hosts da sua rede local e confira com \`ipaddress\`. Se o seu aparelho tiver um endereço IPv6 global (começando com 2 ou 3), anote também o prefixo que a operadora entregou.
      `),
    ],
    revisao: [
      md(`
        - Encapsulamento: aplicação → segmento (portas) → pacote IP (endereços) → quadro (MACs). A cada salto, o quadro é refeito e o TTL diminui; os IPs ficam (exceto no NAT).
        - /n: rede = IP AND máscara; broadcast = bits de host em 1; hosts = 2^(32 − n) − 2 (exceto /31 e /32). Sub-redes de 2^k endereços começam em múltiplos de 2^k.
        - Faixas especiais: 10/8, 172.16/12, 192.168/16 (privadas); 100.64/10 (CGNAT); 127/8; 169.254/16; 192.0.2, 198.51.100 e 203.0.113 (documentação).
        - Host: destino na mesma sub-rede → ARP e entrega direta; senão → gateway padrão.
        - Roteador: entre as rotas que contêm o destino, vence o prefixo mais longo; 0.0.0.0/0 só quando nada mais casa. TTL 0 → descarte e ICMP Time Exceeded (traceroute).
        - NAT (NAPT): troca IP e porta de origem na saída, anota a tradução e desfaz na volta; o que chega sem tradução é descartado. CGNAT: um segundo NAT, na operadora.
        - IPv6: 128 bits, /64 por rede local, sem NAT nem broadcast, NDP no lugar do ARP; o bloqueio do que chega passa a ser do firewall.
      `),
      english(`
        - **subnet, subnet mask, CIDR block, prefix length**: sub-rede, máscara, bloco CIDR, tamanho do prefixo
        - **network / broadcast address, usable hosts**: endereço de rede / de broadcast, hosts utilizáveis
        - **default gateway, routing table, next hop, longest prefix match**: gateway padrão, tabela de rotas, próximo salto, prefixo mais longo
        - **TTL expired in transit, ICMP Time Exceeded**: TTL esgotado no caminho (o que o ping e o traceroute mostram)
        - **NAT, port forwarding, CGNAT, NAT traversal**: NAT, redirecionamento de porta, NAT da operadora, travessia de NAT

        Frase típica de entrevista: *"When a host sends a packet, it first checks whether the destination is on its own subnet. If it is, it resolves the MAC address with ARP and delivers it directly; otherwise it forwards the frame to the default gateway. Each router then picks the route with the longest matching prefix."*

        Frase típica de documentação de nuvem: *"The CIDR blocks of the subnets cannot overlap, and each subnet must reside entirely within the VPC's CIDR block."*
      `),
    ],
  },
  review: [
    ['Quantos hosts utilizáveis tem uma /27, e por quê?', '30: são 2⁵ = 32 endereços, menos o de rede e o de broadcast.'],
    ['Como achar a rede de 192.168.10.77/26 sem converter para binário?', 'Tamanho do bloco = 256 − 192 = 64; o múltiplo de 64 abaixo de 77 é 64: rede 192.168.10.64, broadcast .127.'],
    ['Antes de enviar um pacote, o que o host compara para decidir entre entrega direta e gateway?', 'O destino AND a própria máscara com a própria rede: se for igual, entrega direta (com ARP); senão, manda ao gateway padrão.'],
    ['O que muda e o que se mantém num pacote a cada salto (sem NAT)?', 'Mudam os MACs do quadro e o TTL (e a soma do cabeçalho IPv4); os IPs de origem e destino se mantêm.'],
    ['Qual rota um roteador usa quando várias contêm o destino?', 'A de prefixo mais longo, a mais específica. 0.0.0.0/0 só vale quando nenhuma outra casa.'],
    ['Como o traceroute descobre os roteadores do caminho?', 'Manda pacotes com TTL 1, 2, 3...; cada roteador que zera o TTL descarta o pacote e responde com ICMP Time Exceeded.'],
    ['O que o NAT anota quando um pacote sai, e o que acontece com um pacote que chega sem tradução?', 'Anota porta pública ↔ (IP privado, porta privada). O que chega sem entrada na tabela é descartado.'],
    ['Como reconhecer CGNAT?', 'O IP da WAN do roteador está em 100.64.0.0/10 e é diferente do IP que a internet vê.'],
    ['Quais são as três faixas IPv4 privadas da RFC 1918?', '10.0.0.0/8, 172.16.0.0/12 e 192.168.0.0/16.'],
  ],
  references: ['kurose-ross', 'stanford-cs144', 'python-docs', 'cloudflare-learning'],
});

/* ------------------------------------------------------------------ */
/* TCP por dentro: sequência, retransmissão, janelas e congestionamento */
/* ------------------------------------------------------------------ */

/** Referência usada nos testes aleatórios do receptor TCP. */
const REF_ACKS = dedent(`
  import random as _random

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
`);

/** Referência usada nos testes aleatórios do desafio do Reno. */
const REF_RENO = dedent(`
  import random as _random

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
`);

const tcpInterno = lesson({
  id: 'l9-tcp-janelas-congestionamento',
  moduleId: 'm9-1',
  title: 'TCP por dentro: sequência, retransmissão, janelas e congestionamento (e o que o QUIC muda)',
  titleEn: 'TCP in depth: sequence numbers, retransmission, windows and congestion control (and what QUIC changes)',
  summary: 'Como o TCP numera bytes e confirma com ACKs cumulativos, quando retransmite (temporizador com RTO adaptativo e três ACKs duplicados), por que a janela limita a vazão a janela/RTT, a diferença entre controle de fluxo e de congestionamento, o dente de serra do Reno, o que fazem o CUBIC e o BBR, e por que o QUIC reconstruiu tudo isso sobre o UDP.',
  minutes: 50,
  objectives: [
    'Calcular números de sequência e de ACK a partir do tamanho dos segmentos, inclusive o efeito de SYN e FIN',
    'Simular um receptor TCP que guarda segmentos fora de ordem e envia ACKs cumulativos e duplicados',
    'Explicar os dois gatilhos de retransmissão e calcular o RTO pela RFC 6298',
    'Usar a relação vazão ≤ janela / RTT e o produto banda × atraso para achar o gargalo de uma conexão',
    'Distinguir controle de fluxo (rwnd, o receptor) de controle de congestionamento (cwnd, a rede)',
    'Simular a partida lenta, o aumento aditivo e as reações do Reno a três ACKs duplicados e a um timeout',
    'Explicar o bloqueio de cabeça de fila e o que o QUIC muda: fluxos independentes, handshake com TLS e migração de conexão',
  ],
  skills: ['redes-tcpip'],
  terms: [
    t('melhor esforço', 'best effort', 'Serviço que tenta entregar cada pacote, mas não promete entrega, ordem nem prazo; é o que o IP oferece.', 'IP provides a best-effort delivery service.'),
    t('segmento', 'segment', 'A unidade do TCP: um cabeçalho TCP (20 bytes ou mais) mais um pedaço do fluxo de bytes.'),
    t('número de sequência', 'sequence number', 'Posição, no fluxo de bytes, do primeiro byte de dados do segmento. Começa num valor aleatório (ISN) em cada conexão.', 'The sequence number of the first data octet in this segment.'),
    t('confirmação cumulativa', 'cumulative acknowledgment', 'O ACK informa o próximo byte esperado, o que confirma de uma vez todos os bytes anteriores.'),
    t('ACK duplicado', 'duplicate ACK', 'ACK repetido, com o mesmo número, enviado quando chega um segmento fora de ordem: sinal de que há um buraco.'),
    t('retransmissão rápida', 'fast retransmit', 'Reenviar um segmento ao receber três ACKs duplicados, sem esperar o temporizador.'),
    t('tempo de ida e volta', 'round-trip time (RTT)', 'Tempo entre enviar um segmento e receber a confirmação dele.'),
    t('tempo limite de retransmissão', 'retransmission timeout (RTO)', 'Quanto o remetente espera por um ACK antes de reenviar; calculado a partir das medidas de RTT.', 'The RTO is doubled after each retransmission (exponential backoff).'),
    t('tamanho máximo de segmento', 'maximum segment size (MSS)', 'Maior quantidade de dados num segmento, anunciada no SYN; 1460 bytes numa Ethernet de MTU 1500.'),
    t('janela deslizante', 'sliding window', 'Limite de bytes enviados e ainda não confirmados; à medida que chegam ACKs, a janela anda para a frente.'),
    t('controle de fluxo', 'flow control', 'Mecanismo para o remetente não mandar mais do que o buffer do receptor comporta (janela de recepção, rwnd).'),
    t('controle de congestionamento', 'congestion control', 'Mecanismo para o remetente não mandar mais do que a rede comporta (janela de congestionamento, cwnd).', 'Linux uses CUBIC as the default congestion control algorithm.'),
    t('partida lenta', 'slow start', 'Fase em que a cwnd dobra a cada RTT, do valor inicial até o limiar ssthresh.'),
    t('aumento aditivo, diminuição multiplicativa', 'additive increase, multiplicative decrease (AIMD)', 'Regra que soma 1 MSS por RTT enquanto vai bem e corta a janela pela metade numa perda; produz o gráfico em dente de serra.'),
    t('produto banda × atraso', 'bandwidth-delay product (BDP)', 'Capacidade do enlace vezes o RTT: quantos bytes precisam estar em voo para ocupar o enlace inteiro.'),
    t('bloqueio de cabeça de fila', 'head-of-line blocking', 'Quando um dado perdido segura a entrega de tudo o que vem depois dele, mesmo do que já chegou.'),
    t('migração de conexão', 'connection migration', 'No QUIC, a conexão continua quando o IP ou a porta do cliente mudam, porque é identificada por um ID de conexão.'),
  ],
  stages: {
    conceito: [
      md(`
        O IP entrega no **{{melhor esforço|best effort}}**: um pacote pode se perder (a fila de um roteador encheu), chegar duplicado, chegar fora de ordem ou corrompido. A lição anterior listou o que o TCP promete por cima disso. Agora abrimos a máquina, que tem quatro peças:

        1. **{{números de sequência|sequence number}}** contando bytes, e **ACKs** dizendo "recebi tudo até aqui";
        2. **retransmissão**, por um temporizador que se adapta ao RTT medido e por um alarme mais rápido, os ACKs duplicados;
        3. uma **{{janela deslizante|sliding window}}**, que deixa vários segmentos em voo ao mesmo tempo;
        4. dois freios diferentes: o **{{controle de fluxo|flow control}}**, para não afogar o receptor, e o **{{controle de congestionamento|congestion control}}**, para não afogar a rede.

        Entender essas peças explica por que um download do outro lado do mundo é mais lento que um daqui com a mesma fibra, por que a chamada de vídeo trava quando alguém da casa baixa um jogo, e por que o HTTP/3 trocou o TCP pelo QUIC, que roda sobre UDP.
      `),
    ],
    explicacao: [
      md(`
        ### Um fluxo de bytes numerado
        O TCP não numera segmentos: numera **bytes**. Cada conexão começa num número inicial aleatório, o ISN (a RFC 9293 recomenda gerá-lo de um jeito imprevisível, para dificultar que alguém injete segmentos falsos numa conexão alheia). Um {{segmento|segment}} com \`seq = 1001\` e 500 bytes de dados carrega os bytes 1001 a 1500, e o próximo começa em 1501.

        O campo ACK traz **o próximo byte que o receptor espera**. "ACK 1501" quer dizer "recebi tudo até 1500, mande o 1501". É uma {{confirmação cumulativa|cumulative acknowledgment}}: um único ACK confirma todos os bytes anteriores, então perder um ACK raramente importa, porque o próximo cobre o mesmo trecho.

        Dois detalhes: o **SYN e o FIN consomem um número de sequência cada**, embora não levem dados. Por isso, se o cliente escolhe ISN = x, o primeiro byte de dados dele é x + 1. E o Wireshark, para facilitar, mostra números **relativos**, começando em 0 no SYN.

        O tamanho de cada segmento é limitado pelo {{tamanho máximo de segmento|maximum segment size (MSS)}}, que cada lado anuncia no SYN: 1460 bytes numa Ethernet com MTU 1500 (ou 1452 numa conexão PPPoE, comum em fibra no Brasil).

        Se chega um segmento **fora de ordem**, o receptor o guarda no buffer, mas o ACK não pode pular o buraco: ele repete o mesmo número. Esse é o **{{ACK duplicado|duplicate ACK}}**, e a RFC 5681 pede que ele seja enviado na hora, sem atraso, porque é informação valiosa para o remetente. (Com tudo em ordem, o receptor pode atrasar um pouco o ACK para confirmar dois segmentos de uma vez; a RFC 9293 limita esse atraso a menos de meio segundo.)

        ### Quando reenviar
        **Gatilho 1: o temporizador.** Se o ACK não chega em RTO segundos, o segmento mais antigo não confirmado é reenviado. O {{RTO|retransmission timeout (RTO)}} não pode ser fixo: um RTT de 1 ms numa rede local e de 600 ms num satélite geoestacionário pedem esperas bem diferentes. A RFC 6298 manda o remetente medir o {{tempo de ida e volta|round-trip time (RTT)}} e manter duas médias móveis:
      `),
      {
        type: 'table',
        head: ['Quando', 'Atualização (R = nova medida de RTT)'],
        rows: [
          ['primeira medida', 'SRTT = R; RTTVAR = R / 2'],
          ['medidas seguintes, nesta ordem', 'RTTVAR = ¾ · RTTVAR + ¼ · |SRTT − R|, e depois SRTT = ⅞ · SRTT + ⅛ · R'],
          ['sempre', 'RTO = SRTT + 4 · RTTVAR (a fórmula exata é SRTT + max(G, 4 · RTTVAR), em que G é a granularidade do relógio; a RFC recomenda um piso de 1 s, e o Linux usa piso de 200 ms)'],
          ['a cada timeout', 'RTO dobra (recuo exponencial) até um ACK novo chegar'],
        ],
        caption: 'O RTTVAR mede o quanto o RTT oscila. Numa rede instável, o RTO fica bem acima da média, para não reenviar à toa.',
      },
      md(`
        Uma sutileza, o **algoritmo de Karn**: não se mede o RTT de um segmento retransmitido, porque, quando o ACK chega, não dá para saber se ele confirma o envio original ou a cópia.

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
        Ninguém avisa ao remetente quanto a rede aguenta. Ele **descobre**: a perda de um pacote é o sinal de que alguma fila de roteador encheu. A janela de congestionamento, **cwnd**, segue as regras da RFC 5681 (o TCP Reno), medidas em MSS:
      `),
      {
        type: 'table',
        head: ['Situação', 'O que acontece com a cwnd', 'Ritmo'],
        rows: [
          ['início da conexão', 'começa na janela inicial: 10 MSS no Linux e na maioria dos sistemas (RFC 6928)', '—'],
          ['{{partida lenta|slow start}} (cwnd < ssthresh)', '+1 MSS a cada ACK', 'dobra a cada RTT: crescimento exponencial'],
          ['evitar congestionamento (cwnd ≥ ssthresh)', '+1 MSS a cada RTT, aproximadamente', 'cresce em linha reta: aumento aditivo'],
          ['3 ACKs duplicados (perda isolada)', 'ssthresh = metade do que estava em voo (mínimo 2 MSS); cwnd = ssthresh (na recuperação rápida, temporariamente ssthresh + 3)', 'diminuição multiplicativa'],
          ['timeout (perda grave, nada chegando)', 'ssthresh = metade do que estava em voo (mínimo 2 MSS); cwnd = 1 MSS, e volta à partida lenta', 'recomeça do zero'],
        ],
        caption: 'O ssthresh (slow start threshold) é a memória do TCP: "da última vez, os problemas começaram por volta daqui".',
      },
      md(`
        A combinação "soma devagar, corta pela metade" é o **{{AIMD|additive increase, multiplicative decrease (AIMD)}}**, que dá o famoso gráfico em **dente de serra**. Ela também é justa: duas conexões AIMD com o mesmo RTT dividindo o mesmo gargalo convergem para metades parecidas da banda (o argumento clássico de Chiu e Jain, que o Kurose & Ross desenha).

        Por que um timeout é tratado como pior do que três ACKs duplicados? Porque ACKs duplicados provam que os segmentos seguintes **estão chegando**: a rede ainda funciona, só perdeu um. Um timeout significa que nada voltou.

        O Reno é o modelo de ensino. Na prática:

        - o **CUBIC** (RFC 9438) é o padrão no Linux, no Windows e no macOS: depois de uma perda, a janela cresce como uma função cúbica do tempo (rápido longe do ponto da última perda, devagar perto dele) e corta para 70%, e não 50%, o que aproveita melhor enlaces de BDP alto;
        - o **BBR**, criado pelo Google, não espera perda: estima a banda do gargalo e o menor RTT e tenta manter em voo só o produto dos dois.

        Por que isso importa no dia a dia: roteadores domésticos com filas enormes deixam os algoritmos baseados em perda encherem a fila antes de verem qualquer perda. Quando alguém da casa baixa um jogo, o RTT de todo mundo sobe de 20 ms para centenas de milissegundos e a chamada de vídeo trava. O fenômeno se chama *bufferbloat*.
      `),
      deep(`
        Uma aproximação clássica (Mathis et al., 1997) para o TCP Reno em regime: vazão ≈ (MSS / RTT) · (1,22 / √p), em que p é a taxa de perda. Com MSS de 1460 bytes, RTT de 100 ms e só **1%** de perda, dá 14.600 B/s × 12,2 ≈ 178 kB/s, cerca de 1,4 Mbit/s, por mais rápida que seja a fibra. Duas lições: a vazão cai com o RTT (servidores perto do usuário, as CDNs, ajudam muito) e com a raiz da perda (um Wi-Fi ruim derruba a conexão inteira).
      `, 'Quanto custa 1% de perda'),
      md(`
        ### Abrir e fechar
        O handshake da lição anterior faz mais do que "dizer oi": cada lado informa o **próprio ISN** (e o outro confirma com ISN + 1) e as opções que suporta: MSS, window scale, SACK e timestamps. No fechamento, **cada sentido fecha separado**: um lado manda FIN, o outro confirma; depois o outro manda o próprio FIN, que também é confirmado. Quem fechou primeiro fica no estado **TIME_WAIT** por 2 × MSL (no Linux, 60 s), para reenviar o último ACK se ele se perder e para que segmentos atrasados não se misturem com uma conexão nova entre as mesmas portas. É por isso que um servidor com muitas conexões curtas mostra milhares de sockets em TIME_WAIT no \`ss -tan\`.

        ### UDP e QUIC: refazendo o transporte por cima do UDP
        O cabeçalho UDP tem 8 bytes: porta de origem, porta de destino, comprimento e soma de verificação. Nada de sequência, ACK ou janela. Isso parece pobre, mas é uma página em branco: qualquer coisa pode ser construída por cima, **fora do kernel**. Foi o que o Google começou e a IETF padronizou como **QUIC** (RFC 9000, 9001 e 9002, de 2021), o transporte do HTTP/3. As peças desta lição estão todas lá (números, ACKs, retransmissão, controle de fluxo e de congestionamento), mas reorganizadas:
      `),
      {
        type: 'table',
        head: ['', 'TCP (+ TLS 1.3)', 'QUIC'],
        rows: [
          ['onde roda', 'no kernel do sistema operacional', 'no próprio aplicativo ou biblioteca, sobre UDP (em geral na porta 443)'],
          ['até o primeiro byte de dados de uma conexão nova', '2 RTT: 1 do handshake TCP + 1 do TLS', '1 RTT: transporte e TLS 1.3 no mesmo handshake; 0 RTT ao retomar uma conexão (os dados 0-RTT podem ser repetidos por um atacante, então só servem para pedidos idempotentes)'],
          ['vários fluxos (CSS, JS, imagens)', 'um único fluxo de bytes: uma perda segura tudo o que vem depois', 'fluxos independentes: uma perda só atrasa o fluxo a que o dado pertence'],
          ['numeração', 'números de sequência dos bytes; a retransmissão reusa o número', 'números de pacote que nunca se repetem; o dado reenviado vai num pacote novo, então medir RTT nunca é ambíguo'],
          ['identidade da conexão', 'IP e porta de origem e de destino', 'um ID de conexão: sobrevive à troca do Wi-Fi pelo 4G'],
          ['cabeçalhos', 'visíveis para qualquer equipamento no caminho', 'quase tudo cifrado, inclusive os números de pacote'],
          ['controle de congestionamento', 'Reno, CUBIC, BBR no kernel', 'as mesmas ideias (a RFC 9002 descreve um parecido com o NewReno); cada implementação escolhe'],
        ],
      },
      md(`
        O **{{bloqueio de cabeça de fila|head-of-line blocking}}** é a motivação principal. O HTTP/2 manda vários arquivos misturados numa única conexão TCP; se um pacote com um pedaço do JavaScript se perde, o TCP segura **todos** os bytes que chegaram depois, inclusive os das imagens, até a retransmissão chegar, porque ele só sabe entregar um fluxo em ordem. O QUIC conhece os fluxos e entrega cada um assim que ele estiver completo.

        A **{{migração de conexão|connection migration}}** é a outra vantagem visível: no ônibus, o celular troca do Wi-Fi da rodoviária para o 4G e muda de IP. Uma conexão TCP é identificada pelo par de IPs e portas e morre; uma conexão QUIC continua, porque é identificada pelo ID de conexão.

        Por que não melhorar o TCP? Porque mudanças no TCP dependem de atualizar o kernel de bilhões de aparelhos e de não serem barradas por equipamentos no caminho (firewalls e NATs que conhecem o cabeçalho TCP e descartam o que estranham). Rodar no espaço do usuário e cifrar os cabeçalhos é o jeito de o protocolo continuar podendo evoluir. O custo: algumas redes bloqueiam ou limitam UDP, e por isso os navegadores voltam para o TCP quando o QUIC não passa; e processar pacotes fora do kernel gasta mais CPU.
      `),
      info(`
        A lição anterior disse que o TCP dá entrega "sem duplicatas". Isso vale **dentro de uma conexão**. Se a conexão cai depois que o servidor processou um Pix, mas antes de a resposta chegar, o aplicativo não sabe se deu certo e pode tentar de novo por outra conexão. Por isso APIs de pagamento usam chaves de idempotência: garantias de transporte não substituem garantias de aplicação.
      `, 'O que o TCP não garante'),
    ],
    exemplo: [
      md(`
        Um servidor envia segmentos de 1000 bytes, com números relativos começando em 1, e a cwnd permite 5 em voo. O segundo segmento se perde num roteador congestionado. Acompanhe os ACKs:
      `),
      {
        type: 'table',
        head: ['Passo', 'Remetente envia', 'O que acontece no receptor', 'ACK devolvido', 'Remetente pensa'],
        rows: [
          ['1', 'seq 1 (bytes 1–1000)', 'chega em ordem', 'ACK 1001', 'tudo certo; a janela anda'],
          ['2', 'seq 1001 (bytes 1001–2000)', '**perdido** no caminho', '—', '—'],
          ['3', 'seq 2001', 'chega fora de ordem: guarda no buffer', 'ACK 1001 (duplicado 1)', 'pode ser só reordenação'],
          ['4', 'seq 3001', 'guarda no buffer', 'ACK 1001 (duplicado 2)', 'ainda pode ser reordenação'],
          ['5', 'seq 4001', 'guarda no buffer', 'ACK 1001 (duplicado 3)', 'três duplicados: o 1001 se perdeu; retransmissão rápida e ssthresh = metade do que estava em voo'],
          ['6', 'seq 1001 de novo', 'tapa o buraco; o buffer já tem 2001–5000', 'ACK 5001', 'um ACK confirmou 4000 bytes de uma vez (cumulativo); nada de timeout'],
        ],
        caption: 'Sem os ACKs duplicados, o remetente só perceberia a perda quando o RTO estourasse, em geral bem depois de um RTT.',
      },
      md(`
        Agora, de longe, a cwnd ao longo de várias rodadas (uma rodada = um RTT), em unidades de MSS, começando com cwnd = 1 e ssthresh = 16 para o gráfico caber na tela. Na rodada 8 acontecem três ACKs duplicados; na 11, um timeout:
      `),
      {
        type: 'table',
        head: ['Rodada', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16'],
        rows: [
          ['cwnd', '1', '2', '4', '8', '16', '17', '18', '19', '20', '10', '11', '12', '1', '2', '4', '6', '7'],
          ['ssthresh', '16', '16', '16', '16', '16', '16', '16', '16', '16', '10', '10', '10', '6', '6', '6', '6', '6'],
          ['fase', 'partida lenta', '', '', '', 'evitar congest.', '', '', '', '3 dup', 'evitar congest.', '', 'timeout', 'partida lenta', '', '', 'evitar congest.', ''],
        ],
        caption: 'Dobra até 16, sobe de 1 em 1, cai pela metade (20 → 10) nos três duplicados e despenca para 1 no timeout, com ssthresh = 12 / 2 = 6. É o dente de serra. No desafio, você vai escrever o simulador que gera esta tabela.',
      },
    ],
    codigo: [
      md('Duas simulações que rodam aqui. A primeira é o estimador de RTO da RFC 6298: veja o que um único RTT alto faz com ele. A segunda compara o TCP (um fluxo de bytes só) com o QUIC (um fluxo por arquivo) quando um pacote se perde.'),
      py(`
        # 1. Estimador de RTO (RFC 6298), sem o piso de 1 s e sem a granularidade do relógio
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
        print("QUIC (fluxos separados): ", termino(True))
      `, { caption: 'No TCP, o CSS e a imagem ficam prontos só em t = 10, esperando um pedaço do JavaScript que nem é deles. No QUIC, só o JavaScript espera. Mude o pacote perdido e veja quem sofre.' }),
      code('text', `
        $ ss -ti dst 198.51.100.80
        ESTAB 0 0 192.168.0.23:51000 198.51.100.80:https
             cubic wscale:7,7 rto:232 rtt:31.4/4.2 mss:1448 cwnd:10 ssthresh:7 bytes_acked:52417 retrans:0/2 rcv_space:14480
      `, 'No Linux, `ss -ti` mostra, para cada conexão, o algoritmo (cubic), o window scale, o RTO e o RTT médio/variação em ms, o MSS, a cwnd e o ssthresh em MSS, e as retransmissões. (O mss de 1448 é 1460 menos os 12 bytes da opção de timestamps.)'),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e9-tcpcc-1',
          kind: 'fill',
          lang: 'text',
          prompt: 'Complete com números. O receptor já recebeu, em ordem, todos os bytes até o 4000.',
          template: 'O segmento com seq = 4001 e 500 bytes de dados carrega os bytes de ___ a ___.\nAo recebê-lo, o receptor responde com ACK ___.\nSe o próximo segmento a chegar fosse o de seq = 5001, o ACK seria ___ (duplicado).',
          blanks: [['4001'], ['4500'], ['4501'], ['4501']],
          difficulty: 'facil',
          skills: ['redes-tcpip'],
          hints: [
            'O número de sequência é a posição do primeiro byte. Se o primeiro é o 4001 e são 500 bytes, qual é o último?',
            'O ACK diz o próximo byte que o receptor espera, e não o último que chegou.',
            'Se o segmento de seq 5001 chega, que bytes ainda estão faltando antes dele?',
          ],
          explanation: 'Os 500 bytes vão de 4001 a 4500 (4001 + 500 − 1). O ACK é o próximo esperado, 4501. Se depois chega o segmento de 5001, os bytes 4501 a 5000 estão faltando: o receptor guarda o segmento, mas o ACK cumulativo não pode pular o buraco e repete 4501, um ACK duplicado.',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e9-tcpcc-2',
          kind: 'predict',
          lang: 'python',
          prompt: 'Esta é a regra da cwnd, por rodada, quando nada se perde. O que o programa imprime?',
          code: dedent(`
            cwnd, ssthresh = 1, 8
            for rodada in range(6):
                print(rodada, cwnd)
                if cwnd < ssthresh:
                    cwnd = min(2 * cwnd, ssthresh)
                else:
                    cwnd = cwnd + 1
          `),
          answer: '0 1\n1 2\n2 4\n3 8\n4 9\n5 10',
          difficulty: 'facil',
          skills: ['redes-tcpip'],
          hints: [
            'Enquanto cwnd < ssthresh, o que acontece com ela a cada rodada?',
            'Quando cwnd chega a 8, a condição `cwnd < ssthresh` ainda é verdadeira?',
          ],
          explanation: 'Partida lenta: 1, 2, 4, 8 (dobra a cada rodada, sem passar do ssthresh). Com cwnd = 8 = ssthresh, a condição é falsa e começa o aumento aditivo: 9, 10. O print vem antes da atualização, por isso a rodada 0 mostra o valor inicial.',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e9-tcpcc-3',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Escreva \`acks(segmentos, inicio)\`, o lado receptor do TCP. \`inicio\` é o primeiro byte esperado; \`segmentos\` é a lista, na ordem de chegada, de pares \`(seq, tamanho)\`, e cada segmento cobre os bytes de \`seq\` a \`seq + tamanho − 1\` (tamanho ≥ 1). Devolva a lista dos ACKs enviados, um por segmento recebido.

            O ACK é sempre o próximo byte esperado. O receptor guarda segmentos que chegam fora de ordem e os aproveita quando o buraco for tapado. Segmentos podem chegar repetidos, já confirmados, ou se sobrepor em parte ao que já chegou (uma retransmissão pode juntar dois segmentos num só). Exemplo: \`acks([(1, 100), (201, 100), (101, 100)], 1)\` devolve \`[101, 101, 301]\`.
          `),
          difficulty: 'intermediario',
          skills: ['redes-tcpip'],
          hints: [
            'Que variável representa o estado do receptor? Quando ela muda?',
            'Um segmento que começa depois do byte esperado não pode ser confirmado ainda. Onde ele fica?',
            'Quando o esperado avança, algum segmento guardado pode passar a encostar nele. Uma única verificação basta, ou um avanço pode destravar outro?',
            'Um segmento que começa antes do esperado, mas termina depois dele, deve ser ignorado? Qual condição sobre `seq` e `seq + tamanho` diz que o segmento cobre o byte esperado?',
          ],
          explanation: 'O estado do receptor é o próximo byte esperado mais um conjunto de trechos guardados. A cada chegada, guarde o trecho se ele tiver algo novo e repita: se algum trecho guardado cobre o byte esperado (seq ≤ esperado < fim), avance o esperado até o fim dele. Isso trata tudo de uma vez: segmento em ordem, buraco tapado que destrava vários guardados (o ACK pula, como no ACK 5001 do exemplo), duplicatas (nada muda, o ACK se repete) e sobreposições. Comparar só `seq == esperado` falha quando uma retransmissão ou um trecho guardado começa antes do esperado e termina depois.',
          starter: dedent(`
            def acks(segmentos, inicio):
                # segmentos: lista de (seq, tamanho) na ordem de chegada
                # devolva a lista de ACKs (próximo byte esperado após cada chegada)
                pass
          `),
          solution: dedent(`
            def acks(segmentos, inicio):
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
                return resposta
          `),
          tests: [
            {
              name: 'em ordem e o exemplo do enunciado',
              code: dedent(`
                r = acks([(1, 1000), (1001, 1000), (2001, 500)], 1)
                assert r == [1001, 2001, 2501], f"em ordem, cada ACK é seq + tamanho do último; veio {r}"
                r = acks([(1, 100), (201, 100), (101, 100)], 1)
                assert r == [101, 101, 301], f"o segmento 201 fica guardado (ACK 101 duplicado) e é aproveitado quando o 101 chega; veio {r}"
              `),
            },
            {
              name: 'o exemplo da lição: três duplicados e o ACK que pula',
              code: dedent(`
                segs = [(1, 1000), (2001, 1000), (3001, 1000), (4001, 1000), (1001, 1000)]
                r = acks(segs, 1)
                assert r == [1001, 1001, 1001, 1001, 5001], f"veio {r}; esperado [1001, 1001, 1001, 1001, 5001]: o 1001 tapa o buraco e os três guardados são confirmados de uma vez"
              `),
            },
            {
              name: 'duplicatas e segmentos já confirmados',
              code: dedent(`
                r = acks([(1, 100), (1, 100), (51, 50)], 1)
                assert r == [101, 101, 101], f"um segmento repetido ou já confirmado não muda nada: o ACK se repete; veio {r}"
                r = acks([(500, 10)], 500)
                assert r == [510], f"o primeiro byte esperado é o 500 (inicio); veio {r}"
              `),
            },
            {
              name: 'sobreposições',
              code: dedent(`
                r = acks([(1, 100), (51, 100)], 1)
                assert r == [101, 151], f"o segundo segmento repete 51–100, mas traz 101–150 de novo: o ACK vai a 151; veio {r}"
                r = acks([(1, 10), (21, 10), (15, 10), (11, 10)], 1)
                assert r == [11, 11, 11, 31], f"quando o 11 chega, ele encosta no trecho 15–24, que encosta no 21–30: o ACK precisa ir a 31; veio {r}"
              `),
            },
            {
              name: 'vários buracos tapados de trás para a frente',
              code: dedent(`
                r = acks([(1, 10), (41, 10), (31, 10), (21, 10), (11, 10)], 1)
                assert r == [11, 11, 11, 11, 51], f"veio {r}"
                r = acks([(11, 10), (21, 10)], 1)
                assert r == [1, 1], f"sem o byte 1, nada pode ser confirmado: o ACK fica em 1; veio {r}"
              `),
            },
            {
              name: 'casos aleatórios',
              code: REF_ACKS + '\n' + dedent(`
                _rng = _random.Random(9293)
                for _ in range(300):
                    inicio = _rng.randint(1, 5000)
                    segs = []
                    for _ in range(_rng.randint(1, 12)):
                        segs.append((inicio + _rng.randint(-20, 120), _rng.randint(1, 40)))
                    esperado = _ref_acks(segs, inicio)
                    r = acks(list(segs), inicio)
                    assert r == esperado, f"acks({segs}, {inicio}) devolveu {r}, esperado {esperado}"
              `),
            },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e9-tcpcc-4',
          kind: 'mcq',
          prompt: 'Um servidor antigo não negocia window scale, então a janela de recepção fica em 65.535 bytes. Um cliente em Fortaleza, com fibra de 500 Mbit/s, baixa um arquivo dele com RTT de 200 ms. Qual é, aproximadamente, a vazão máxima dessa conexão?',
          difficulty: 'intermediario',
          skills: ['redes-tcpip'],
          hints: [
            'Quantos bytes podem estar em voo, no máximo, sem um ACK?',
            'Quanto tempo leva para um ACK voltar e liberar a janela de novo?',
            'A conta dá bytes por segundo. Quantos bits tem um byte?',
          ],
          explanation: 'Com no máximo 65.535 bytes em voo e um RTT de 200 ms, o remetente manda uma janela a cada 0,2 s: 65.535 / 0,2 ≈ 327.675 bytes/s ≈ 2,6 Mbit/s. A fibra de 500 Mbit/s não é o gargalo: a janela é. Para ocupar 500 Mbit/s com 200 ms seriam necessários 500 Mbit/s × 0,2 s = 12,5 MB em voo, o que só a opção window scale permite.',
          options: [
            { text: 'Cerca de 2,6 Mbit/s', correct: true, feedback: 'Isso: 65.535 bytes × 8 / 0,2 s ≈ 2,6 Mbit/s. A janela, e não a fibra, limita a conexão.' },
            { text: 'Cerca de 500 Mbit/s, a velocidade da fibra', feedback: 'A fibra é só um dos limites. O remetente não pode ter mais que a janela em voo sem um ACK, e o ACK demora um RTT para voltar: vazão ≤ janela / RTT.' },
            { text: 'Cerca de 327 kbit/s', feedback: '327 mil é o número de bytes por segundo (65.535 / 0,2). Em bits, multiplique por 8: cerca de 2,6 Mbit/s.' },
            { text: 'Cerca de 105 kbit/s', feedback: 'Isso sai de multiplicar a janela pelo RTT. A janela é enviada uma vez a cada RTT: divida pelo RTT, não multiplique.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e9-tcpcc-5',
          kind: 'mcq',
          prompt: 'Num ônibus, o celular sai do alcance do Wi-Fi da rodoviária e passa para o 4G no meio de um download. Com HTTP/3 (QUIC), o download continua; com HTTP/1.1 sobre TCP, a conexão cai e o aplicativo precisa reconectar. Por quê?',
          difficulty: 'intermediario',
          skills: ['redes-tcpip'],
          hints: [
            'O que muda no celular quando ele troca de rede?',
            'Como cada protocolo sabe a que conexão pertence um pacote que chega?',
          ],
          explanation: 'Uma conexão TCP é identificada pelos quatro valores: IP e porta de origem e de destino. Com o IP novo do 4G, os pacotes do celular não pertencem a nenhuma conexão que o servidor conheça. O QUIC identifica a conexão por um ID de conexão que vai em cada pacote; o servidor reconhece o ID, valida o novo caminho e segue, com as chaves e o estado que já tinha.',
          options: [
            { text: 'O QUIC identifica a conexão por um ID de conexão, não pelo IP e pela porta, que mudaram', correct: true, feedback: 'Isso: é a migração de conexão. O TCP só conhece o par de IPs e portas, e o IP do celular mudou.' },
            { text: 'O UDP garante a entrega mesmo quando o IP muda', feedback: 'O UDP não garante nada, nem entrega. As garantias do QUIC são construídas por ele mesmo, por cima do UDP.' },
            { text: 'O QUIC retransmite mais rápido, então o servidor nem percebe a troca', feedback: 'Retransmitir mais rápido não ajudaria: com o IP novo, o servidor TCP não saberia a que conexão os pacotes pertencem. A diferença está em como a conexão é identificada.' },
            { text: 'O 4G bloqueia conexões TCP vindas do Wi-Fi', feedback: 'Não há bloqueio: o problema é que a conexão TCP antiga estava amarrada ao IP do Wi-Fi, e esse IP não existe mais para o celular.' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e9-tcpcc-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Simule o controle de congestionamento do TCP Reno rodada por rodada (uma rodada = um RTT), em unidades de MSS. Escreva \`reno(eventos, rwnd, cwnd=1, ssthresh=64)\`. Cada item de \`eventos\` diz o que aconteceu numa rodada: \`"ok"\` (tudo confirmado), \`"3dup"\` (perda detectada por três ACKs duplicados) ou \`"timeout"\`.

            Em cada rodada, o remetente põe em voo \`em_voo = min(cwnd, rwnd)\` segmentos. Depois, conforme o evento:
            - \`"ok"\`: se \`cwnd < ssthresh\`, partida lenta: \`cwnd = min(2 * cwnd, ssthresh)\`; senão, \`cwnd += 1\`. **Mas** se a rodada foi limitada pelo receptor (\`cwnd > rwnd\`), a cwnd não cresce: o TCP não aprendeu nada sobre a rede (o Linux faz assim).
            - \`"3dup"\`: \`ssthresh = max(em_voo // 2, 2)\` e \`cwnd = ssthresh\`.
            - \`"timeout"\`: \`ssthresh = max(em_voo // 2, 2)\` e \`cwnd = 1\`.

            Repare que a metade é do que estava **em voo**, como manda a RFC 5681, e não da cwnd. Devolva a lista de tuplas \`(cwnd, ssthresh, em_voo)\` com o estado no **início** de cada rodada, mais uma tupla final com o estado depois do último evento: \`len(eventos) + 1\` tuplas. Exemplo: \`reno(["ok", "ok", "3dup"], rwnd=100, cwnd=4, ssthresh=8)\` devolve \`[(4, 8, 4), (8, 8, 8), (9, 8, 9), (4, 4, 4)]\`.
          `),
          difficulty: 'avancado',
          skills: ['redes-tcpip'],
          hints: [
            'Que três valores formam o estado do remetente? Qual deles é calculado a partir dos outros dois, e não guardado?',
            'Em que momento você deve registrar a tupla da rodada: antes ou depois de aplicar o evento?',
            'Na partida lenta, a cwnd pode passar do ssthresh? Confira com cwnd = 6 e ssthresh = 8.',
            'Numa perda, a metade é de qual número? Teste com cwnd = 40 e rwnd = 10.',
            'Quando a rodada foi limitada pelo receptor, qual dos ramos do "ok" deve ser pulado?',
          ],
          explanation: 'O estado é (cwnd, ssthresh); em_voo é derivado. A cada rodada, registre o estado e só depois aplique o evento. Partida lenta dobra até o ssthresh (nunca passa dele) e, dali em diante, o crescimento é de 1 por rodada. Nas perdas, o ssthresh vira a metade do que estava em voo, com piso de 2, e a cwnd vai para o ssthresh (3dup) ou para 1 (timeout). Os dois detalhes que derrubam soluções apressadas vêm da prática: com uma rwnd pequena, a metade da cwnd seria maior do que o que estava de fato na rede, e uma cwnd que cresce sem ter sido usada não mede nada (por isso o Linux só a aumenta quando ela foi o limite). Esta tabela, desenhada, é o dente de serra do exemplo.',
          starter: dedent(`
            def reno(eventos, rwnd, cwnd=1, ssthresh=64):
                # devolva a lista de (cwnd, ssthresh, em_voo) no início de cada rodada,
                # mais o estado final: len(eventos) + 1 tuplas
                pass
          `),
          solution: dedent(`
            def reno(eventos, rwnd, cwnd=1, ssthresh=64):
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
                return rodadas
          `),
          tests: [
            {
              name: 'o exemplo do enunciado',
              code: REF_RENO + '\n' + dedent(`
                r = reno(["ok", "ok", "3dup"], rwnd=100, cwnd=4, ssthresh=8)
                assert [tuple(x) for x in r] == [(4, 8, 4), (8, 8, 8), (9, 8, 9), (4, 4, 4)], f"veio {r}"
              `),
            },
            {
              name: 'o dente de serra da lição',
              code: REF_RENO + '\n' + dedent(`
                ev = ["ok"] * 8 + ["3dup"] + ["ok"] * 2 + ["timeout"] + ["ok"] * 4
                r = reno(ev, rwnd=1000, cwnd=1, ssthresh=16)
                janelas = [x[0] for x in r]
                assert janelas == [1, 2, 4, 8, 16, 17, 18, 19, 20, 10, 11, 12, 1, 2, 4, 6, 7], f"as cwnd deveriam ser as da tabela do exemplo; vieram {janelas}"
                _confere_reno(ev, 1000, 1, 16)
              `),
            },
            {
              name: 'partida lenta não passa do ssthresh',
              code: REF_RENO + '\n' + dedent(`
                _confere_reno(["ok", "ok", "ok"], 1000, 6, 8, "de 6, a partida lenta iria a 12, mas para em 8; depois, +1")
                _confere_reno(["ok"] * 4, 1000, 1, 64, "1, 2, 4, 8, 16: longe do ssthresh, só dobra")
              `),
            },
            {
              name: 'perdas: metade do que estava em voo, mínimo 2',
              code: REF_RENO + '\n' + dedent(`
                _confere_reno(["3dup"], 1000, 3, 64, "3 // 2 = 1, mas o piso é 2: ssthresh = 2 e cwnd = 2")
                _confere_reno(["timeout", "ok", "ok", "ok"], 1000, 20, 64, "timeout: ssthresh = 10, cwnd = 1; depois a partida lenta recomeça: 2, 4, 8")
                _confere_reno(["timeout", "ok", "ok"], 1000, 1, 64, "um timeout com cwnd = 1 deixa ssthresh = 2 (piso) e cwnd = 1; depois 2 e 3")
              `),
            },
            {
              name: 'receptor limitando: a metade é do que estava em voo',
              code: REF_RENO + '\n' + dedent(`
                _confere_reno(["3dup"], 10, 40, 64, "com rwnd = 10, só 10 segmentos estavam em voo: ssthresh = 5, e não 20")
                _confere_reno(["timeout"], 6, 30, 64, "em voo = min(30, 6) = 6: ssthresh = 3")
              `),
            },
            {
              name: 'receptor limitando: a cwnd não cresce',
              code: REF_RENO + '\n' + dedent(`
                _confere_reno(["ok"] * 6, 10, 1, 64, "1, 2, 4, 8, 16 (a rodada com cwnd 8 ainda era limitada pela cwnd, então ela dobra) e aí para: com cwnd 16 > rwnd 10, ela não cresce mais")
                _confere_reno(["ok", "ok", "ok"], 10, 10, 8, "cwnd = rwnd = 10 ainda conta como limitada pela cwnd: cresce para 11; depois, com 11 > 10, para")
              `),
            },
            {
              name: 'sequências aleatórias',
              code: REF_RENO + '\n' + dedent(`
                _rng = _random.Random(5681)
                for _ in range(300):
                    n = _rng.randint(0, 25)
                    ev = [_rng.choice(["ok", "ok", "ok", "ok", "3dup", "timeout"]) for _ in range(n)]
                    _confere_reno(ev, _rng.randint(2, 80), _rng.randint(1, 40), _rng.randint(2, 64))
              `),
            },
          ],
        },
      },
    ],
    projeto: [
      md(`
        **Veja o TCP trabalhando.** No seu computador, abra o Wireshark, comece a captura e baixe um arquivo grande de um site. Filtre por \`tcp.stream eq N\` (a conexão do download) e use *Statistics → TCP Stream Graphs → Stevens* para ver os números de sequência crescendo: a inclinação é a vazão. Procure retransmissões com o filtro \`tcp.analysis.retransmission\` e ACKs duplicados com \`tcp.analysis.duplicate_ack\`. No Linux, rode \`ss -ti\` durante o download e anote cwnd, ssthresh, rtt e rto em alguns momentos. Depois, compare: baixe do mesmo jeito de um servidor perto (uma CDN no Brasil) e de um distante. Explique a diferença com vazão ≈ janela / RTT.
      `),
    ],
    revisao: [
      md(`
        - O TCP numera **bytes**; o ACK é o próximo byte esperado e confirma tudo antes dele. SYN e FIN consomem um número cada; o ISN é aleatório.
        - Segmento fora de ordem → o receptor guarda e repete o ACK (duplicado). Buraco tapado → o ACK pula de uma vez.
        - Retransmissão: por timeout (RTO = SRTT + 4·RTTVAR, que dobra a cada timeout) ou por 3 ACKs duplicados (retransmissão rápida). SACK diz o que já chegou.
        - Vazão ≤ janela / RTT. Para ocupar o enlace, janela ≥ banda × RTT (BDP); window scale permite janelas acima de 64 KiB.
        - Janela efetiva = min(rwnd, cwnd): rwnd é o controle de fluxo (receptor); cwnd é o controle de congestionamento (rede).
        - Reno: partida lenta (dobra por RTT até ssthresh), +1 MSS por RTT, metade em 3 duplicados, volta a 1 em timeout. CUBIC é o padrão hoje; BBR estima banda e RTT.
        - QUIC (sobre UDP): handshake com TLS em 1 RTT, fluxos sem bloqueio de cabeça de fila entre eles, números de pacote que não se repetem, ID de conexão que sobrevive à troca de rede.
      `),
      english(`
        - **sequence number, acknowledgment number, cumulative ACK, duplicate ACK**: número de sequência, número de confirmação, ACK cumulativo, ACK duplicado
        - **retransmission timeout (RTO), fast retransmit, selective acknowledgment (SACK)**: tempo limite de retransmissão, retransmissão rápida, confirmação seletiva
        - **sliding window, receive window, congestion window (cwnd), slow start threshold (ssthresh)**: janela deslizante, janela de recepção, janela de congestionamento, limiar da partida lenta
        - **bandwidth-delay product, bufferbloat, head-of-line blocking, connection migration**: produto banda × atraso, inchaço de buffers, bloqueio de cabeça de fila, migração de conexão

        Frase típica de entrevista: *"Flow control protects the receiver: the sender never has more unacknowledged data than the receive window advertised. Congestion control protects the network: the sender limits itself to the congestion window, which grows during slow start and congestion avoidance and shrinks when loss is detected."*

        Frase típica de RFC (RFC 9000): *"QUIC is a connection-oriented protocol that creates a stateful interaction between a client and server."*
      `),
    ],
  },
  review: [
    ['Um segmento tem seq = 7001 e 1000 bytes. Que bytes ele carrega e qual ACK confirma que ele chegou (com tudo antes)?', 'Bytes 7001 a 8000; ACK 8001, o próximo byte esperado.'],
    ['O que o receptor faz quando chega um segmento fora de ordem?', 'Guarda no buffer e manda na hora um ACK duplicado, com o número do primeiro byte que falta.'],
    ['Quais são os dois gatilhos de retransmissão do TCP?', 'O temporizador (RTO) estourar e a chegada de três ACKs duplicados (retransmissão rápida).'],
    ['Como a RFC 6298 calcula o RTO?', 'RTO = SRTT + 4 · RTTVAR, em que SRTT é a média móvel do RTT (peso ⅛ para a medida nova) e RTTVAR, a da variação (peso ¼); dobra a cada timeout.'],
    ['Qual a vazão máxima com janela de 64 KB e RTT de 100 ms?', 'Cerca de 64 KB / 0,1 s = 640 KB/s, uns 5 Mbit/s, qualquer que seja a velocidade do enlace.'],
    ['Qual a diferença entre rwnd e cwnd?', 'rwnd é anunciada pelo receptor (espaço no buffer, controle de fluxo); cwnd é estimada pelo remetente (o que a rede aguenta, controle de congestionamento). Vale o menor.'],
    ['O que o Reno faz com três ACKs duplicados e com um timeout?', '3 duplicados: ssthresh = metade do que estava em voo e cwnd = ssthresh. Timeout: o mesmo ssthresh e cwnd = 1, de volta à partida lenta.'],
    ['Por que a partida lenta se chama "lenta" se ela dobra a cada RTT?', 'Porque começa de uma janela pequena, em vez de mandar a janela inteira de uma vez como os TCPs antigos faziam; o crescimento é exponencial.'],
    ['O que é bloqueio de cabeça de fila no TCP, e como o QUIC o evita?', 'Uma perda segura todos os bytes que vêm depois, mesmo de outros arquivos, porque o TCP entrega um fluxo só, em ordem. O QUIC tem fluxos independentes: a perda só atrasa o fluxo dela.'],
    ['Por que uma conexão QUIC sobrevive à troca de Wi-Fi para 4G e uma TCP não?', 'O TCP identifica a conexão por IPs e portas; o QUIC, por um ID de conexão que não muda quando o IP muda.'],
  ],
  references: ['kurose-ross', 'rfc9293', 'stanford-cs144', 'cloudflare-learning'],
});

export const lessons: Lesson[] = [ipRoteamento, tcpInterno];
