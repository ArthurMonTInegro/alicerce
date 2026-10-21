var e={id:`l9-ip-subredes-nat`,moduleId:`m9-1`,title:`IP por dentro: sub-redes, roteamento pelo prefixo mais longo e NAT`,titleEn:`IP in depth: subnets, longest prefix match routing and NAT`,summary:`O que cada camada acrescenta ao pacote, como calcular rede, broadcast e hosts de qualquer prefixo, como um host decide entre entregar direto ou mandar ao gateway, como roteadores escolhem a rota mais específica, como o NAT deixa a casa inteira sair com um IP só, por que o CGNAT da operadora impede o redirecionamento de porta e o que muda no IPv6.`,minutes:50,objectives:[`Descrever o encapsulamento e dizer o que muda (MACs, TTL) e o que não muda (IPs) a cada salto`,`Calcular endereço de rede, broadcast, quantidade de hosts e alinhamento de qualquer prefixo IPv4`,`Reconhecer as faixas especiais: privadas, CGNAT, loopback, link-local e de documentação`,`Explicar como um host decide entre entrega direta (com ARP) e o gateway padrão`,`Aplicar a regra do prefixo mais longo numa tabela de rotas e explicar o papel do TTL`,`Simular a tradução de endereços e portas do NAT e explicar por que conexões vindas de fora são descartadas`,`Diagnosticar CGNAT e dizer o que o IPv6 resolve (e o que não resolve)`],skills:[`redes-tcpip`,`comp-binario`],terms:[{pt:`encapsulamento`,en:`encapsulation`,def:`Cada camada embrulha os dados da camada de cima com o próprio cabeçalho antes de passar para baixo.`,example:`Each layer encapsulates the payload from the layer above with its own header.`},{pt:`unidade máxima de transmissão`,en:`maximum transmission unit (MTU)`,def:`Maior pacote IP que um enlace aceita sem fragmentar: 1500 bytes na Ethernet, 1492 no PPPoE.`,example:`Packets larger than the path MTU must be fragmented or dropped.`},{pt:`tempo de vida`,en:`time to live (TTL)`,def:`Campo do cabeçalho IPv4 que cada roteador diminui em 1; ao chegar a 0, o pacote é descartado. No IPv6 se chama hop limit.`},{pt:`sub-rede`,en:`subnet`,def:`Bloco de endereços contíguos que compartilham o mesmo prefixo e se alcançam sem passar por roteador.`},{pt:`notação CIDR`,en:`CIDR notation`,def:`Escrever o endereço seguido de /n, em que n é o número de bits do prefixo de rede (ex.: 10.0.4.0/22).`,example:`The VPC uses the CIDR block 10.0.0.0/16.`},{pt:`endereço de broadcast`,en:`broadcast address`,def:`Último endereço de uma sub-rede IPv4 (todos os bits de host em 1); um pacote para ele vai a todos os hosts da sub-rede.`},{pt:`gateway padrão`,en:`default gateway`,def:`Roteador para onde o host manda tudo o que não está na própria sub-rede.`,example:`Make sure the default gateway is reachable.`},{pt:`protocolo de resolução de endereços`,en:`Address Resolution Protocol (ARP)`,def:`Protocolo que descobre o endereço MAC de um IPv4 da mesma rede local ("quem tem 192.168.0.1?").`},{pt:`tabela de rotas`,en:`routing table`,def:`Lista de prefixos com o próximo salto e a interface para cada um.`,example:"Check the routing table with `ip route`."},{pt:`casamento pelo prefixo mais longo`,en:`longest prefix match`,def:`Regra dos roteadores: entre as rotas que contêm o destino, vale a de prefixo mais longo, isto é, a mais específica.`},{pt:`rota padrão`,en:`default route`,def:`A rota 0.0.0.0/0 (ou ::/0 no IPv6), que contém todos os endereços e só vale quando nenhuma outra casa.`},{pt:`tradução de endereços de rede`,en:`network address translation (NAT)`,def:`Reescrita dos endereços (e, no NAPT, das portas) dos pacotes na fronteira entre a rede privada e a pública.`,example:`The home router performs NAT for every device on the LAN.`},{pt:`NAT de grande escala da operadora`,en:`carrier-grade NAT (CGNAT)`,def:`NAT feito pela operadora, que coloca muitos clientes atrás do mesmo IP público; usa a faixa 100.64.0.0/10.`},{pt:`redirecionamento de porta`,en:`port forwarding`,def:`Regra fixa no NAT que manda o que chega numa porta pública para um IP e uma porta da rede interna.`}],references:[`kurose-ross`,`stanford-cs144`,`python-docs`,`cloudflare-learning`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Quando o seu notebook manda um pacote para um servidor do outro lado do país, ninguém no caminho conhece o trajeto inteiro. Cada equipamento toma **uma decisão local** olhando só o endereço de destino: "entrego direto ou passo para quem?". A lição anterior mostrou as camadas e o que é \`/24\`. Aqui abrimos as contas e as decisões:

- a **{{sub-rede|subnet}}**: quais endereços estão "aqui do lado" e quais não;
- a **{{tabela de rotas|routing table}}**, em que vale a rota mais específica, pelo **{{casamento pelo prefixo mais longo|longest prefix match}}**;
- o **{{NAT|network address translation (NAT)}}**, que deixa todos os aparelhos da casa saírem pela internet com um único IP público.

É isso que transforma "a internet caiu" num diagnóstico preciso ("o gateway não responde", "a máscara está errada", "estou atrás de CGNAT") e que explica por que o servidor de jogo que você subiu em casa não aparece para os amigos, mesmo com a porta "aberta" no roteador.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`### O que viaja no fio: encapsulamento
Cada camada embrulha o que recebe de cima com o próprio cabeçalho; é o {{encapsulamento|encapsulation}}. Uma requisição HTTP vira o conteúdo de um segmento TCP (que acrescenta as portas), que vira o conteúdo de um pacote IP (que acrescenta os endereços), que vira o conteúdo de um quadro Ethernet ou Wi-Fi (que acrescenta os endereços MAC da placa de rede).`},{type:`table`,head:[`Camada`,`Unidade`,`Cabeçalho mínimo`,`Endereços que ele carrega`],rows:[[`Aplicação`,`mensagem (ex.: requisição HTTP)`,`definido pelo protocolo`,`nomes, URLs`],[`Transporte`,`segmento (TCP) ou datagrama (UDP)`,`20 bytes (TCP), 8 bytes (UDP)`,`porta de origem e de destino`],[`Rede`,`pacote IP`,`20 bytes (IPv4), 40 bytes (IPv6)`,`IP de origem e de destino`],[`Enlace`,`quadro (frame)`,`14 bytes + 4 de verificação (Ethernet)`,`MAC de origem e de destino`]],caption:`Abra o Wireshark e clique num pacote: ele mostra exatamente essas camadas, uma dentro da outra.`},{type:`md`,text:`Do cabeçalho IPv4, os campos que mais importam no dia a dia são: a **versão** (4), o **{{tempo de vida|time to live (TTL)}}**, o **protocolo** do conteúdo (1 = ICMP, 6 = TCP, 17 = UDP), os **endereços de origem e destino** e uma soma de verificação do próprio cabeçalho, refeita a cada salto porque o TTL muda.

O detalhe que organiza todo o resto: **a cada salto, o quadro de enlace é jogado fora e refeito**, com novos MACs de origem e de destino, mas o pacote IP segue com os **mesmos IPs** do começo ao fim (a exceção é o NAT, que veremos adiante). O MAC diz "para qual vizinho entregar agora"; o IP diz "para onde, no fim, isso vai".

Cada enlace tem uma {{unidade máxima de transmissão|maximum transmission unit (MTU)}}: 1500 bytes na Ethernet. Muitas operadoras de fibra no Brasil entregam a conexão por PPPoE (PPP sobre Ethernet), que gasta 8 bytes com o próprio cabeçalho e deixa a MTU em 1492. Por isso o maior conteúdo TCP por pacote, o MSS (*maximum segment size*, que a próxima lição detalha), costuma ser 1460 bytes (1500 − 20 do IP − 20 do TCP) ou 1452 no PPPoE. Um pacote IPv4 maior que a MTU do próximo enlace é fragmentado pelo roteador ou, se vier marcado com o bit DF (*don't fragment*, o caso comum hoje), descartado, e a origem recebe um aviso ICMP para diminuir o tamanho. No IPv6, roteadores nunca fragmentam; só a origem.

### Prefixo, máscara e as contas da sub-rede
Em \`a.b.c.d/n\` ({{notação CIDR|CIDR notation}}), os \`n\` primeiros bits são o **prefixo de rede** e os \`32 − n\` restantes identificam o host. A máscara é o mesmo \`/n\` escrito em octetos: \`n\` bits 1 seguidos de zeros. As contas são operações bit a bit, as mesmas do desafio da lição anterior:

- **endereço de rede** = IP AND máscara (bits de host todos em 0);
- **{{endereço de broadcast|broadcast address}}** = endereço de rede com os bits de host todos em 1;
- **total de endereços** = 2^(32 − n);
- **hosts utilizáveis** = total − 2, porque o primeiro (a rede) e o último (o broadcast) não vão para aparelhos. Exceções: numa **/31**, usada em enlaces ponto a ponto entre dois roteadores, os dois endereços são utilizáveis (RFC 3021); uma **/32** é um único endereço.`},{type:`table`,head:[`Prefixo`,`Máscara`,`Endereços`,`Hosts utilizáveis`,`Uso típico`],rows:[[`/8`,`255.0.0.0`,`16.777.216`,`16.777.214`,`a faixa privada 10.0.0.0/8 inteira`],[`/16`,`255.255.0.0`,`65.536`,`65.534`,`uma VPC (a rede privada de uma conta na nuvem), uma rede de campus`],[`/22`,`255.255.252.0`,`1.024`,`1.022`,`rede de escritório grande`],[`/24`,`255.255.255.0`,`256`,`254`,`a rede de casa (192.168.0.0/24)`],[`/26`,`255.255.255.192`,`64`,`62`,`um andar, um laboratório`],[`/27`,`255.255.255.224`,`32`,`30`,`uma sala, câmeras de segurança`],[`/30`,`255.255.255.252`,`4`,`2`,`enlace entre dois roteadores (modo antigo)`],[`/31`,`255.255.255.254`,`2`,`2 (RFC 3021)`,`enlace ponto a ponto`],[`/32`,`255.255.255.255`,`1`,`1`,`um endereço só (rota para um host)`]]},{type:`md`,text:'**O atalho do tamanho do bloco.** Quando a máscara não termina num octeto inteiro, pegue o primeiro octeto da máscara que não é 255 e faça 256 menos ele: é o tamanho do bloco naquele octeto. Numa /26 (máscara terminando em 192), os blocos têm 256 − 192 = 64 endereços e começam em 0, 64, 128 e 192. Logo, `192.168.10.77/26` está no bloco que começa em 64: rede `192.168.10.64`, broadcast `192.168.10.127`, hosts de `.65` a `.126`. Numa /22 (máscara `255.255.252.0`), o bloco é 256 − 252 = 4 no **terceiro** octeto: `10.0.5.77/22` está na rede `10.0.4.0`, que vai até `10.0.7.255`.\n\nA consequência importante é o **alinhamento**: uma sub-rede de tamanho 2^k só pode começar num múltiplo de 2^k. Não existe a rede `192.168.10.32/26`; o `.32` cai no meio do bloco que começa em `.0`. Dividir uma /24 em quatro /26 dá exatamente `.0/26`, `.64/26`, `.128/26` e `.192/26`.\n\n### Endereços que não são "da internet"'},{type:`table`,head:[`Faixa`,`Para que serve`,`Onde você vê`],rows:[[`10.0.0.0/8, 172.16.0.0/12 (172.16 a 172.31), 192.168.0.0/16`,`privados (RFC 1918): podem se repetir em redes diferentes e não são roteados na internet`,`a rede de casa, do escritório, de uma VPC`],[`100.64.0.0/10 (100.64 a 100.127)`,`espaço compartilhado para o NAT da operadora, o CGNAT (RFC 6598)`,`o IP "da internet" que o seu roteador mostra, quando a operadora usa CGNAT`],[`127.0.0.0/8`,`loopback: a própria máquina`,"`localhost`, `127.0.0.1`"],[`169.254.0.0/16`,`link-local: o aparelho se autoatribui quando não acha servidor DHCP`,`Wi-Fi "conectado, sem internet" com IP 169.254.x.x`],[`192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24`,`reservados para documentação e exemplos (RFC 5737)`,`livros, RFCs e esta lição`]],caption:`Por isso os IPs "públicos" dos exemplos daqui são 203.0.113.x e 198.51.100.x: são reservados para exemplos e nunca pertencem a ninguém.`},{type:`md`,text:`### A decisão de cada host: entrega direta ou gateway
Antes de enviar, o host aplica a própria máscara ao destino e compara com a própria rede:

- **Mesma sub-rede**: entrega direta. Ele precisa do MAC do destino e o descobre com o {{ARP|Address Resolution Protocol (ARP)}}, um pedido em broadcast na rede local: "quem tem 192.168.0.40? Responda para 192.168.0.23". A resposta fica num cache (\`ip neigh\` no Linux, \`arp -a\` no Windows). No IPv6, o papel do ARP é do NDP (*Neighbor Discovery Protocol*).
- **Outra sub-rede**: o host manda o quadro para o MAC do **{{gateway padrão|default gateway}}**, o roteador da rede, mas o pacote IP continua endereçado ao destino final.

No Linux, \`ip route\` mostra exatamente essas duas regras:`},{type:`code`,lang:`text`,code:`$ ip route
default via 192.168.0.1 dev wlan0 proto dhcp metric 600
192.168.0.0/24 dev wlan0 proto kernel scope link src 192.168.0.23 metric 600`,runnable:!1,caption:`A segunda linha diz "a /24 está aqui do lado, entregue direto"; a primeira, "o resto vai para 192.168.0.1".`},{type:`callout`,tone:`warn`,text:'Máscara errada quebra a rede de um jeito confuso. Com `/16` no lugar de `/24`, o host acha que `192.168.5.9` está "aqui do lado", faz ARP, ninguém responde e o pacote nunca vai ao roteador. Com `/25` no lugar de `/24`, o host acha que `192.168.0.200` está longe e manda tudo para o gateway, que talvez nem devolva. Quando "uns endereços da rede funcionam e outros não", confira a máscara antes de qualquer outra coisa.',title:`Máscara errada`},{type:`md`,text:'### Roteadores: a rota mais específica vence\nUm roteador tem várias rotas, e elas podem se sobrepor. A regra é o **prefixo mais longo**: entre todas as rotas que contêm o destino, vale a de `/n` maior, porque ela descreve um conjunto menor e mais específico de endereços. A {{rota padrão|default route}} `0.0.0.0/0` contém todos os endereços, mas tem o prefixo mais curto possível, então só vale quando nenhuma outra casa.\n\nÉ parecido com o CEP: o primeiro dígito diz a região (0 é a Grande São Paulo), os seguintes vão estreitando até a rua. Um centro de triagem dos Correios que tem uma regra para "0" e outra para "013" usa a mais específica para uma carta com CEP 01310-100.'},{type:`table`,head:[`Rota`,`Próximo salto`,`Destino 10.20.30.5`,`Destino 10.20.99.1`,`Destino 10.99.0.1`,`Destino 8.8.8.8`],rows:[[`0.0.0.0/0`,`operadora`,`contém`,`contém`,`contém`,`**vence**`],[`10.0.0.0/8`,`VPN da matriz`,`contém`,`contém`,`**vence**`,`—`],[`10.20.0.0/16`,`filial Recife`,`contém`,`**vence**`,`—`,`—`],[`10.20.30.0/24`,`laboratório (direto)`,`**vence**`,`—`,`—`,`—`]],caption:`A ordem das linhas na tabela não importa: o que decide é o tamanho do prefixo.`},{type:`md`,text:'A cada salto, o roteador **diminui o TTL em 1**; se chegar a 0, descarta o pacote e devolve à origem uma mensagem ICMP *Time Exceeded*. Isso impede que um pacote preso num laço de rotas circule para sempre (o Linux começa com TTL 64; o Windows, com 128). O `traceroute` usa justamente isso: manda pacotes com TTL 1, 2, 3... e cada roteador que responde "tempo esgotado" se revela.\n\nDe onde vêm as rotas? No seu computador, a rota da sub-rede sai do próprio endereço e da máscara da interface, e a rota padrão vem do DHCP, que informa qual é o gateway (o `proto dhcp` da saída acima). Dentro de uma operadora, de protocolos de roteamento como o OSPF. Entre operadoras, do **BGP**: cada rede anuncia aos vizinhos os prefixos que alcança. Boa parte dessa troca acontece em pontos de troca de tráfego (*IXPs*); o IX.br de São Paulo é um dos maiores do mundo.\n\n### NAT: muitos aparelhos, um IP público\nO IPv4 só tem 2³² endereços, e a sua casa recebe, no máximo, um público. O roteador de casa resolve isso com **NAPT** (NAT com tradução de portas, RFC 3022), que todo mundo chama só de NAT:\n\n1. O notebook `192.168.0.23`, porta `51000`, manda um pacote para `198.51.100.80:443`.\n2. O roteador troca a origem pelo próprio IP público e por uma porta livre, `203.0.113.45:40001`, e anota na **tabela de tradução**: `40001 ↔ 192.168.0.23:51000`.\n3. A resposta chega para `203.0.113.45:40001`; o roteador consulta a tabela, troca o destino de volta para `192.168.0.23:51000` e entrega.\n\nA porta é o que permite dois aparelhos usarem a mesma porta de origem ao mesmo tempo: o celular `192.168.0.31:51000` ganha outra porta pública, `40002`. Ao reescrever os endereços, o NAT também refaz as somas de verificação do IP e do TCP/UDP (a do TCP inclui os IPs).\n\nConsequências que aparecem no dia a dia:\n\n- **Quem está fora não consegue iniciar conexão.** Um pacote que chega para `203.0.113.45:8080` sem entrada na tabela não tem para onde ir e é descartado. Para hospedar algo em casa, você cria um {{redirecionamento de porta|port forwarding}}: uma entrada fixa "8080 → 192.168.0.50:8080". Chamadas de vídeo e jogos ponto a ponto usam técnicas de travessia (STUN, TURN e ICE, no WebRTC) para contornar o NAT.\n- **As entradas expiram.** Uma conexão parada some da tabela depois de um tempo. As RFCs pedem pelo menos 2 minutos para UDP (RFC 4787) e 2 h 4 min para TCP estabelecido (RFC 5382), mas muitos roteadores usam valores menores; por isso aplicativos mandam mensagens de *keepalive*.\n- **NAT não é firewall**, embora tenha o efeito colateral de bloquear o que ninguém pediu.\n\n### CGNAT: o NAT da operadora\nMuitas operadoras, sem IPv4 público para todo cliente, colocam **outro NAT dentro da rede delas**: o {{CGNAT|carrier-grade NAT (CGNAT)}}. O roteador da sua casa recebe na WAN um endereço da faixa `100.64.0.0/10`, e centenas de clientes saem pelo mesmo IP público. O sintoma clássico: você cria o redirecionamento de porta no seu roteador, mas a conexão de fora morre antes, no NAT da operadora, onde você não manda. Para confirmar, compare o IP WAN que o roteador mostra com o IP que um site do tipo "qual é meu IP" exibe. Se forem iguais, não há outro NAT. Se forem diferentes, há: com o do roteador em 100.64–100.127, é o CGNAT; com um endereço privado (192.168.x.x, por exemplo), pode ser a ONU da operadora, o aparelho da fibra, também funcionando como roteador (um NAT duplo dentro de casa, que se resolve pedindo o modo *bridge*), ou uma operadora que usa faixa privada no próprio CGNAT. As saídas são pedir um IPv4 público à operadora (às vezes pago), usar IPv6 ou um túnel reverso para um servidor com IP público.\n\n### O que o IPv6 muda'},{type:`table`,head:[``,`IPv4`,`IPv6`],rows:[[`tamanho do endereço`,`32 bits: 203.0.113.45`,"128 bits em 8 grupos hexadecimais: 2001:db8:0:1::45 (`::` abrevia uma sequência de grupos zerados)"],[`rede local típica`,`/24, com NAT`,`/64 por rede local; a operadora costuma delegar à casa um bloco maior, de prefixo mais curto (uma /56 tem 256 redes /64)`],[`NAT`,`quase obrigatório`,`desnecessário: cada aparelho tem endereço global`],[`descobrir o MAC do vizinho`,`ARP`,`NDP (mensagens ICMPv6)`],[`broadcast`,`existe`,`não existe: usa multicast`],[`TTL`,`TTL`,`hop limit, mesma função`],[`soma de verificação do cabeçalho`,`sim, refeita a cada salto`,`não tem (o enlace e o transporte já verificam)`],[`fragmentação`,`roteadores podem fragmentar`,`só a origem fragmenta`],[`loopback / link-local / documentação`,`127.0.0.1 / 169.254.0.0/16 / 192.0.2.0/24`,`::1 / fe80::/10 / 2001:db8::/32`]]},{type:`md`,text:`Sem NAT, um aparelho com IPv6 é alcançável de fora **se o firewall deixar**. Os roteadores domésticos, por recomendação da RFC 6092, bloqueiam por padrão conexões que chegam sem ter sido pedidas: o bloqueio passa a ser decisão de firewall, explícita, e não efeito colateral da tradução.`},{type:`callout`,tone:`deep`,text:`A RFC 4787 classifica o comportamento dos NATs em duas dimensões. **Mapeamento**: a mesma porta interna recebe a mesma porta pública para qualquer destino (*endpoint-independent*) ou uma porta diferente por destino. **Filtragem**: quem pode mandar pacotes para aquela porta pública, se qualquer um, só o IP que foi contatado, ou só o par IP e porta contatado. NATs com mapeamento independente do destino permitem a travessia por STUN; os que mudam a porta a cada destino (o antigo "NAT simétrico") obrigam a usar um retransmissor TURN, que custa banda do provedor da chamada.`,title:`Nem todo NAT é igual`}]},{stage:`exemplo`,blocks:[{type:`md`,text:"O notebook `192.168.0.23/24` abre uma conexão HTTPS com `198.51.100.80`. O roteador de casa tem `192.168.0.1` na LAN e `203.0.113.45` na WAN. Acompanhe os endereços em cada trecho:"},{type:`table`,head:[`Passo`,`Onde`,`Decisão`,`Origem (IP:porta)`,`Destino (IP:porta)`,`TTL`],rows:[[`1`,`notebook`,`198.51.100.80 AND 255.255.255.0 = 198.51.100.0, que não é 192.168.0.0: vai pelo gateway`,`—`,`—`,`—`],[`2`,`notebook`,`ARP: "quem tem 192.168.0.1?"; o roteador responde com o MAC dele`,`—`,`—`,`—`],[`3`,`notebook → roteador`,`quadro para o MAC do roteador; o pacote IP já vai para o destino final`,`192.168.0.23:51000`,`198.51.100.80:443`,`64`],[`4`,`roteador de casa`,`NAT: troca a origem, anota 40001 ↔ 192.168.0.23:51000; rota padrão para a operadora`,`203.0.113.45:40001`,`198.51.100.80:443`,`63`],[`5`,`roteadores da operadora e da internet`,`prefixo mais longo em cada um; MACs novos a cada salto; IPs e portas intactos`,`203.0.113.45:40001`,`198.51.100.80:443`,`62, 61, ...`],[`6`,`servidor`,`responde trocando origem e destino`,`198.51.100.80:443`,`203.0.113.45:40001`,`o inicial do servidor (64 no Linux)`],[`7`,`roteador de casa`,`acha 40001 na tabela e troca o destino de volta`,`198.51.100.80:443`,`192.168.0.23:51000`,`o que sobrou, menos 1`]],caption:`O servidor nunca vê 192.168.0.23: para ele, quem conectou foi 203.0.113.45. Se houvesse CGNAT, haveria mais uma tradução entre os passos 4 e 5.`},{type:`md`,text:'Agora o caminho inverso, que **não** funciona: um amigo tenta abrir `203.0.113.45:25565` (a porta do servidor de Minecraft que está no notebook). O pacote chega ao roteador no passo 7, mas não há nenhuma entrada 25565 na tabela; o roteador descarta. Com um redirecionamento de porta "25565 → 192.168.0.23:25565", a tradução existe desde o início e o passo 7 acontece normalmente, a menos que a WAN do roteador seja um 100.64.x.x: aí o pacote do amigo morre no CGNAT da operadora, antes de chegar à sua casa.'}]},{stage:`codigo`,blocks:[{type:`md`,text:"O módulo `ipaddress` da biblioteca padrão faz as contas de sub-rede para você (e roda aqui no navegador). A segunda parte é um NAT de brinquedo, que guarda a tabela de tradução num dicionário."},{type:`code`,lang:`python`,code:`import ipaddress

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
print("chega na 25565 ->", nat.entrar(25565))`,runnable:!0,caption:`Os dois aparelhos usam a porta 51000, e o NAT dá a cada um uma porta pública diferente. A terceira saída reaproveita a tradução que já existia. Experimente outros prefixos na parte 1 e confira com o atalho do tamanho do bloco.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e9-ipnat-1`,kind:`mcq`,prompt:"A rede das câmeras de segurança de um condomínio é `10.8.3.32/27`. Quantos aparelhos, no máximo, podem receber um endereço nela?",difficulty:`facil`,skills:[`redes-tcpip`,`comp-binario`],hints:[`Quantos bits sobram para os hosts numa /27?`,`Com esses bits, quantos endereços existem ao todo? Algum deles não pode ir para um aparelho?`],explanation:`Uma /27 deixa 32 − 27 = 5 bits para os hosts: 2⁵ = 32 endereços. O primeiro (10.8.3.32, a rede) e o último (10.8.3.63, o broadcast) não vão para aparelhos, sobrando 30, de 10.8.3.33 a 10.8.3.62.`,options:[{text:`32`,feedback:`Esse é o total de endereços do bloco. O primeiro identifica a rede e o último é o broadcast: nenhum dos dois pode ir para uma câmera.`},{text:`30`,correct:!0,feedback:`Isso: 2⁵ = 32 endereços, menos a rede e o broadcast.`},{text:`27`,feedback:`O /27 é a quantidade de bits do prefixo de rede, não a quantidade de hosts. Os bits de host são os que sobram: 32 − 27.`},{text:`62`,feedback:`62 é o número de hosts de uma /26 (6 bits de host). Numa /27 sobra um bit a menos, e cada bit a menos corta o bloco pela metade.`}]}},{type:`exercise`,exercise:{id:`e9-ipnat-2`,kind:`predict`,lang:`python`,prompt:`O que este programa imprime? Faça as contas na mão antes de rodar (lembre do atalho do tamanho do bloco, aqui no terceiro octeto).`,code:`import ipaddress

i = ipaddress.ip_interface("10.0.5.77/22")
print(i.network)
print(i.network.broadcast_address)
print(ipaddress.ip_address("10.0.7.200") in i.network)
print(ipaddress.ip_address("10.0.8.1") in i.network)`,answer:`10.0.4.0/22
10.0.7.255
True
False`,difficulty:`intermediario`,skills:[`redes-tcpip`,`comp-binario`],hints:[`Em que octeto a máscara de uma /22 deixa de ser 255? Quanto vale esse octeto da máscara?`,`Qual é o tamanho do bloco nesse octeto, e qual múltiplo dele fica logo abaixo de 5?`,`O broadcast é o último endereço do bloco: até onde vai o terceiro octeto, e quanto vale o quarto?`],explanation:`A máscara da /22 é 255.255.252.0: o bloco tem 256 − 252 = 4 unidades no terceiro octeto, começando em 0, 4, 8... O 5 cai no bloco que começa em 4, então a rede é 10.0.4.0/22 e o broadcast, 10.0.7.255 (terceiro octeto até 4 + 3 = 7, quarto octeto todo em 1). 10.0.7.200 está dentro; 10.0.8.1 já é o próximo bloco.`}},{type:`exercise`,exercise:{id:`e9-ipnat-3`,kind:`fix`,lang:`python`,prompt:'A função `decidir(minha_interface, destino, gateway)` imita a decisão de um host antes de mandar um pacote: devolve `("direto", destino)` se o destino está na mesma sub-rede (aí bastaria um ARP) e `("gateway", gateway)` caso contrário. `minha_interface` vem no formato `"ip/prefixo"`.\n\nEla funciona na rede de casa, mas o suporte de uma empresa reclamou: na rede `172.20.0.0/16`, computadores vizinhos mandam um para o outro tudo pelo roteador, que fica sobrecarregado à toa, e na sub-rede `192.168.10.64/26` os pacotes para outras sub-redes nunca chegam ao roteador. Encontre o erro e corrija, para qualquer prefixo de 0 a 32.',difficulty:`intermediario`,skills:[`redes-tcpip`,`comp-binario`],hints:['Teste com `decidir("172.20.0.5/16", "172.20.9.9", "172.20.0.1")`. Os dois estão na mesma /16? O que a função responde?',`A função usa o prefixo que veio depois da barra?`,`Comparar os três primeiros octetos é o mesmo que aplicar qual máscara?`,"O que a lição diz sobre como o host compara o destino com a própria rede? O módulo `ipaddress` pode ajudar."],explanation:"O código comparava sempre os três primeiros octetos, ou seja, assumia /24 para qualquer rede, e ignorava o prefixo informado. Numa /16, isso manda ao gateway destinos que estão do lado; numa /26, faz o host tentar ARP para endereços de outra sub-rede, e ninguém responde. O certo é aplicar a máscara do prefixo real ao destino e comparar com a própria rede, como faz `ipaddress.ip_interface(minha_interface).network` com o operador `in`, ou com as contas bit a bit da lição anterior.",starter:`def decidir(minha_interface, destino, gateway):
    """minha_interface: "ip/prefixo" do host, ex. "192.168.0.23/24".
    Devolve ("direto", destino) se destino está na mesma sub-rede;
    senão, ("gateway", gateway)."""
    meu_ip, prefixo = minha_interface.split("/")
    if meu_ip.split(".")[:3] == destino.split(".")[:3]:
        return ("direto", destino)
    return ("gateway", gateway)`,solution:`import ipaddress

def decidir(minha_interface, destino, gateway):
    """minha_interface: "ip/prefixo" do host, ex. "192.168.0.23/24".
    Devolve ("direto", destino) se destino está na mesma sub-rede;
    senão, ("gateway", gateway)."""
    minha_rede = ipaddress.ip_interface(minha_interface).network
    if ipaddress.ip_address(destino) in minha_rede:
        return ("direto", destino)
    return ("gateway", gateway)`,tests:[{name:`rede de casa (/24) continua funcionando`,code:`r = decidir("192.168.0.23/24", "192.168.0.40", "192.168.0.1")
assert r == ("direto", "192.168.0.40"), f"192.168.0.40 está na mesma /24: entrega direta; veio {r!r}"
r = decidir("192.168.0.23/24", "198.51.100.80", "192.168.0.1")
assert r == ("gateway", "192.168.0.1"), f"198.51.100.80 é de fora: vai pelo gateway; veio {r!r}"`},{name:`na /16, a rede inteira é local`,code:`r = decidir("172.20.0.5/16", "172.20.9.9", "172.20.0.1")
assert r == ("direto", "172.20.9.9"), f"numa /16, 172.20.9.9 está na mesma sub-rede de 172.20.0.5 (os dois primeiros octetos batem): entrega direta; veio {r!r}"
r = decidir("172.20.0.5/16", "172.21.0.5", "172.20.0.1")
assert r == ("gateway", "172.20.0.1"), f"172.21.0.5 está fora da 172.20.0.0/16; veio {r!r}"`},{name:`na /26, o mesmo terceiro octeto não basta`,code:`r = decidir("192.168.10.77/26", "192.168.10.130", "192.168.10.65")
assert r == ("gateway", "192.168.10.65"), f"192.168.10.77/26 vai de .64 a .127: o .130 está em outra sub-rede e precisa do gateway; veio {r!r}"
r = decidir("192.168.10.77/26", "192.168.10.100", "192.168.10.65")
assert r == ("direto", "192.168.10.100"), f"o .100 está no bloco .64–.127: entrega direta; veio {r!r}"
r = decidir("192.168.10.77/26", "192.168.10.63", "192.168.10.65")
assert r == ("gateway", "192.168.10.65"), f"o .63 é o broadcast do bloco anterior (.0–.63): outra sub-rede; veio {r!r}"`},{name:`prefixos /8, /22, /32 e /0`,code:`assert decidir("10.1.2.3/8", "10.200.0.1", "10.0.0.1") == ("direto", "10.200.0.1"), "numa /8, tudo que começa com 10. é local"
assert decidir("10.0.5.77/22", "10.0.7.200", "10.0.4.1") == ("direto", "10.0.7.200"), "10.0.5.77/22 vai de 10.0.4.0 a 10.0.7.255"
assert decidir("10.0.5.77/22", "10.0.8.1", "10.0.4.1") == ("gateway", "10.0.4.1"), "10.0.8.1 está fora da 10.0.4.0/22"
assert decidir("203.0.113.9/32", "203.0.113.10", "203.0.113.1") == ("gateway", "203.0.113.1"), "numa /32 não há vizinhos: tudo vai pelo gateway"
assert decidir("192.168.0.23/0", "8.8.8.8", "192.168.0.1") == ("direto", "8.8.8.8"), "com /0, a 'sub-rede' é a internet inteira"`}]}},{type:`exercise`,exercise:{id:`e9-ipnat-4`,kind:`code`,lang:`python`,prompt:'Escreva `proximo_salto(tabela, destino)`, a decisão de um roteador. `tabela` é uma lista de pares `(prefixo, salto)`, como `("10.20.0.0/16", "filial Recife")`, em qualquer ordem; `destino` é um IPv4 em texto.\n\nDevolva o `salto` da rota de **prefixo mais longo** que contém o destino, ou `None` se nenhuma rota contiver (a tabela pode não ter rota padrão). Pode usar o módulo `ipaddress`. Os prefixos da tabela são todos diferentes entre si.',difficulty:`intermediario`,skills:[`redes-tcpip`],hints:[`Para o destino 10.20.30.5, quais linhas da tabela da lição contêm o endereço? Quantas são?`,`Entre as que contêm, qual critério escolhe a vencedora? Ele depende da posição da linha na lista?`,`Comparar o texto do prefixo com o começo do destino funciona para 10.2.0.0/16 e 10.20.1.1?`,"Um objeto `ip_network` tem um atributo com o tamanho do prefixo. Como guardar a melhor rota vista até agora enquanto percorre a lista?"],explanation:`Todas as rotas que contêm o destino são candidatas; vence a de prefixo maior, porque descreve o conjunto menor e mais específico de endereços. A posição na lista não importa, e é por isso que pegar a primeira que casa falha quando a rota padrão vem antes. Comparar strings também falha: "10.20.1.1" começa com "10.2", mas não está em 10.2.0.0/16. Roteadores de verdade fazem essa busca em nanossegundos com árvores de prefixos (tries) ou memórias especiais (TCAM), mas a regra é exatamente esta.`,starter:`def proximo_salto(tabela, destino):
    # tabela: lista de (prefixo, salto), ex. [("10.0.0.0/8", "vpn"), ("0.0.0.0/0", "operadora")]
    # devolva o salto da rota mais específica que contém destino, ou None
    pass`,solution:`import ipaddress

def proximo_salto(tabela, destino):
    ip = ipaddress.ip_address(destino)
    melhor, salto_melhor = -1, None
    for prefixo, salto in tabela:
        rede = ipaddress.ip_network(prefixo)
        if ip in rede and rede.prefixlen > melhor:
            melhor, salto_melhor = rede.prefixlen, salto
    return salto_melhor`,tests:[{name:`a tabela da lição`,code:`_t = [("0.0.0.0/0", "operadora"), ("10.0.0.0/8", "vpn"), ("10.20.0.0/16", "recife"), ("10.20.30.0/24", "lab")]
for d, s in [("10.20.30.5", "lab"), ("10.20.99.1", "recife"), ("10.99.0.1", "vpn"), ("8.8.8.8", "operadora")]:
    r = proximo_salto(_t, d)
    assert r == s, f"destino {d}: a rota mais específica leva a {s!r}, mas veio {r!r}"`},{name:`a ordem da tabela não importa`,code:`_t = [("10.20.30.0/24", "lab"), ("10.20.0.0/16", "recife"), ("10.0.0.0/8", "vpn"), ("0.0.0.0/0", "operadora")]
assert proximo_salto(list(reversed(_t)), "10.20.30.5") == "lab", "com a rota padrão no começo da lista, a /24 ainda precisa vencer: não pare na primeira que contém o destino"
assert proximo_salto(_t, "8.8.8.8") == "operadora", "com a /24 no começo, 8.8.8.8 só casa com a rota padrão"
_t2 = [("10.20.0.0/16", "recife"), ("10.20.30.0/24", "lab"), ("10.0.0.0/8", "vpn")]
assert proximo_salto(_t2, "10.20.30.5") == "lab", "a rota mais específica pode estar no meio da lista"`},{name:`sem rota: None`,code:`_t = [("10.0.0.0/8", "vpn"), ("192.168.0.0/24", "lan")]
r = proximo_salto(_t, "8.8.8.8")
assert r is None, f"nenhuma rota contém 8.8.8.8 e não há rota padrão: devolva None; veio {r!r}"
assert proximo_salto([], "10.0.0.1") is None, "tabela vazia: None"`},{name:`prefixos fora dos limites de octeto`,code:`_t = [("192.168.10.0/24", "lan"), ("192.168.10.64/26", "lab"), ("192.168.10.77/32", "impressora")]
assert proximo_salto(_t, "192.168.10.77") == "impressora", "uma rota /32 é a mais específica possível"
assert proximo_salto(_t, "192.168.10.100") == "lab", ".100 está em 192.168.10.64/26 (.64 a .127)"
assert proximo_salto(_t, "192.168.10.130") == "lan", ".130 está fora da /26, só casa com a /24"`},{name:`texto parecido não é prefixo`,code:`_t = [("10.2.0.0/16", "A"), ("10.20.0.0/16", "B")]
r = proximo_salto(_t, "10.20.1.1")
assert r == "B", f"10.20.1.1 começa com o texto '10.2', mas não está em 10.2.0.0/16 (que vai de 10.2.0.0 a 10.2.255.255); veio {r!r}"
assert proximo_salto(_t, "10.200.0.1") is None, "10.200.0.1 não está em nenhuma das duas /16"`}]}},{type:`exercise`,exercise:{id:`e9-ipnat-5`,kind:`mcq`,prompt:'Júlia criou no roteador de casa o redirecionamento "porta 25565 → 192.168.0.23:25565" para o servidor de Minecraft. De dentro de casa, conectando em 192.168.0.23, funciona; os amigos, de fora, não conseguem. A página do roteador mostra o IP da WAN como `100.72.14.9`, e um site "qual é meu IP" mostra `203.0.113.200`. Qual é a explicação mais provável?',difficulty:`intermediario`,skills:[`redes-tcpip`],hints:[`Em que faixa especial está 100.72.14.9?`,`Se o roteador da Júlia tivesse o IP público, os dois endereços seriam iguais ou diferentes?`,`Quantos NATs há entre os amigos e o notebook? Em qual deles a Júlia consegue criar regras?`],explanation:`O endereço da WAN está em 100.64.0.0/10, a faixa do CGNAT, e é diferente do IP que a internet vê: há um segundo NAT, na operadora. O pacote dos amigos vai para 203.0.113.200:25565, chega ao NAT da operadora, que não tem nenhuma tradução para essa porta, e é descartado ali, antes de chegar à casa da Júlia. A regra no roteador dela nunca é consultada. Saídas: pedir IPv4 público à operadora, usar IPv6 ou um túnel reverso.`,options:[{text:`A operadora usa CGNAT: a conexão dos amigos morre no NAT da operadora, antes de chegar ao roteador da Júlia`,correct:!0,feedback:`Isso: 100.72.14.9 está na faixa do CGNAT (100.64.0.0/10), e a diferença entre os dois IPs mostra que existe outra tradução no caminho, onde a Júlia não manda.`},{text:`A regra está errada: o redirecionamento deveria apontar para 100.72.14.9`,feedback:`O redirecionamento aponta para o aparelho da rede interna que vai atender, e esse é o notebook, 192.168.0.23. 100.72.14.9 é o endereço do próprio roteador do lado da operadora.`},{text:`A porta 25565 é bloqueada pelo TCP porque passa de 1023`,feedback:`Nada no TCP bloqueia portas altas: elas são usadas o tempo todo. A regra que existe é outra: em sistemas Unix, abrir uma porta abaixo de 1024 exige privilégio de administrador. E, de dentro de casa, a mesma porta funciona.`},{text:`O notebook precisa de um IPv4 público, porque 192.168.0.23 não pode receber conexões`,feedback:`Atrás de um NAT com redirecionamento de porta, um endereço privado recebe conexões normalmente: é para isso que serve a regra. O problema está em outro NAT, antes do roteador.`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e9-ipnat-desafio`,kind:`code`,lang:`python`,prompt:'Você recebeu da TI um bloco, como `"192.168.1.0/24"`, e precisa dividi-lo entre setores que têm tamanhos diferentes (a técnica se chama VLSM, máscaras de tamanho variável). Escreva `alocar(bloco, pedidos)`, em que `pedidos` é um dict `setor → número de aparelhos` (inteiro ≥ 1), e devolva um dict `setor → "rede/prefixo"`.\n\nRegras:\n1. Cada setor recebe a **menor** sub-rede cujos hosts utilizáveis (total − 2) bastem. Não use /31 nem /32: a menor permitida é /30.\n2. Atenda os setores do **maior pedido para o menor**; em caso de empate, em ordem alfabética do nome.\n3. Cada sub-rede começa no primeiro endereço livre do bloco que respeite o **alinhamento** (uma sub-rede de 2^k endereços começa num múltiplo de 2^k).\n4. Se alguma não couber dentro do bloco, levante `ValueError`.\n\nExemplo: `alocar("192.168.1.0/24", {"vendas": 100, "ti": 50, "rh": 20, "link": 2})` devolve `{"vendas": "192.168.1.0/25", "ti": "192.168.1.128/26", "rh": "192.168.1.192/27", "link": "192.168.1.224/30"}`. Pode usar o módulo `ipaddress`.',difficulty:`desafio`,skills:[`redes-tcpip`,`comp-binario`],hints:[`Para 100 aparelhos, quantos bits de host você precisa? Confira: 2⁶ − 2 bastaria? E 2⁷ − 2?`,`Cuidado com o limite: 62 aparelhos cabem numa /26? E 63?`,`Por que atender do maior para o menor faz o alinhamento quase sempre sair de graça?`,'Converter endereços para inteiros (`int(ipaddress.ip_address(...))`) deixa o "próximo endereço livre" virar uma soma. Como arredondar um inteiro para cima até o próximo múltiplo de um tamanho?',`Onde termina o bloco? Compare o último endereço de cada sub-rede com ele antes de aceitar.`],explanation:`Para cada setor, procure o menor k com 2^k − 2 ≥ aparelhos (e k ≥ 2); o prefixo é 32 − k. Em ordem decrescente de tamanho, cada sub-rede nova tem tamanho menor ou igual ao da anterior, e por isso o próximo endereço livre já está alinhado; o arredondamento para o múltiplo seguinte é só uma garantia. O erro mais comum é esquecer os 2 endereços reservados (62 aparelhos cabem numa /26, 63 não) ou não perceber que a soma dos blocos passou do fim. É assim que se planeja o endereçamento de uma empresa ou das sub-redes de uma VPC na nuvem.`,starter:`def alocar(bloco, pedidos):
    # bloco: "rede/prefixo"; pedidos: dict setor -> número de aparelhos
    # devolva dict setor -> "rede/prefixo"; ValueError se não couber
    pass`,solution:`import ipaddress

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
    return resultado`,tests:[{name:`o exemplo do enunciado`,code:`import ipaddress as _ip
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
r = alocar("192.168.1.0/24", {"vendas": 100, "ti": 50, "rh": 20, "link": 2})
esperado = {"vendas": "192.168.1.0/25", "ti": "192.168.1.128/26", "rh": "192.168.1.192/27", "link": "192.168.1.224/30"}
assert r == esperado, f"veio {r}, esperado {esperado}"`},{name:`os 2 endereços reservados contam`,code:`import ipaddress as _ip
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
r = alocar("10.0.0.0/24", {"a": 62})
assert r == {"a": "10.0.0.0/26"}, f"62 aparelhos cabem numa /26 (64 − 2 = 62); veio {r}"
r = alocar("10.0.0.0/24", {"a": 63})
assert r == {"a": "10.0.0.0/25"}, f"63 aparelhos não cabem numa /26 (só 62 hosts): precisa de /25; veio {r}"
r = alocar("10.0.0.0/24", {"a": 1})
assert r == {"a": "10.0.0.0/30"}, f"a menor sub-rede permitida é /30, mesmo para 1 aparelho; veio {r}"
r = alocar("10.0.0.0/24", {"a": 2, "b": 3})
assert r == {"b": "10.0.0.0/29", "a": "10.0.0.8/30"}, f"3 aparelhos precisam de /29 (uma /30 só tem 2 hosts), e o maior pedido vem primeiro; veio {r}"`},{name:`ordem: maior primeiro, empate por nome`,code:`import ipaddress as _ip
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
r = alocar("172.16.0.0/24", {"zeta": 10, "alfa": 10, "beta": 30})
esperado = {"beta": "172.16.0.0/27", "alfa": "172.16.0.32/28", "zeta": "172.16.0.48/28"}
assert r == esperado, f"beta (30) primeiro; alfa e zeta empatam em 10 e vão em ordem alfabética; veio {r}"
r = alocar("172.16.0.0/24", {"b": 60, "a": 50})
assert r == {"b": "172.16.0.0/26", "a": "172.16.0.64/26"}, f"60 > 50, então b vem antes, mesmo com o nome maior; veio {r}"`},{name:`bloco que não começa em .0 e prefixo /22`,code:`import ipaddress as _ip
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
r = alocar("10.0.4.0/22", {"escritorio": 500, "wifi": 200, "servidores": 30})
esperado = {"escritorio": "10.0.4.0/23", "wifi": "10.0.6.0/24", "servidores": "10.0.7.0/27"}
assert r == esperado, f"veio {r}, esperado {esperado}"
r = alocar("192.168.1.128/25", {"a": 60, "b": 20})
assert r == {"a": "192.168.1.128/26", "b": "192.168.1.192/27"}, f"as sub-redes começam dentro do bloco, a partir de .128; veio {r}"`},{name:`não cabe: ValueError`,code:`import ipaddress as _ip
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
for bloco, pedidos in [("192.168.1.0/24", {"a": 200, "b": 100}), ("192.168.1.0/24", {"a": 300}),
                       ("10.0.0.0/30", {"a": 2, "b": 1}), ("192.168.1.0/25", {"a": 126, "b": 1})]:
    try:
        r = alocar(bloco, pedidos)
    except ValueError:
        continue
    assert False, f"alocar({bloco!r}, {pedidos}) devolveu {r}, mas a soma dos blocos passa do fim de {bloco}: levante ValueError"
r = alocar("192.168.1.0/24", {"a": 126, "b": 126})
assert r == {"a": "192.168.1.0/25", "b": "192.168.1.128/25"}, f"duas /25 cabem exatamente numa /24; veio {r}"`},{name:`casos aleatórios`,code:`import ipaddress as _ip
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
_rng = _random.Random(91)
for _ in range(300):
    p = _rng.choice([20, 22, 24, 26])
    base = _rng.randrange(0, 2 ** 32, 2 ** (32 - p))
    bloco = f"{_ip.ip_address(base)}/{p}"
    nomes = _rng.sample(["rh", "ti", "dev", "ops", "wifi", "cam", "link", "lab"], _rng.randint(1, 6))
    pedidos = {n: _rng.choice([1, 2, 3, 6, 14, 15, 30, 31, 62, 63, 100, 126, 127, 254, 500]) for n in nomes}
    _confere_vlsm(bloco, pedidos)`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:'**Sua operadora usa CGNAT?** Descubra o IP da WAN do seu roteador (na página de administração, em geral `192.168.0.1` ou `192.168.1.1`) e compare com o IP que um site "qual é meu IP" mostra. Explique o resultado com o que você aprendeu: há um NAT ou dois? Depois, rode `ip route` (Linux), `route -n get default` (macOS) ou `route print` (Windows) e identifique a rota padrão e a rota da sua sub-rede. Calcule à mão a rede, o broadcast e o número de hosts da sua rede local e confira com `ipaddress`. Se o seu aparelho tiver um endereço IPv6 global (começando com 2 ou 3), anote também o prefixo que a operadora entregou.'}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Encapsulamento: aplicação → segmento (portas) → pacote IP (endereços) → quadro (MACs). A cada salto, o quadro é refeito e o TTL diminui; os IPs ficam (exceto no NAT).
- /n: rede = IP AND máscara; broadcast = bits de host em 1; hosts = 2^(32 − n) − 2 (exceto /31 e /32). Sub-redes de 2^k endereços começam em múltiplos de 2^k.
- Faixas especiais: 10/8, 172.16/12, 192.168/16 (privadas); 100.64/10 (CGNAT); 127/8; 169.254/16; 192.0.2, 198.51.100 e 203.0.113 (documentação).
- Host: destino na mesma sub-rede → ARP e entrega direta; senão → gateway padrão.
- Roteador: entre as rotas que contêm o destino, vence o prefixo mais longo; 0.0.0.0/0 só quando nada mais casa. TTL 0 → descarte e ICMP Time Exceeded (traceroute).
- NAT (NAPT): troca IP e porta de origem na saída, anota a tradução e desfaz na volta; o que chega sem tradução é descartado. CGNAT: um segundo NAT, na operadora.
- IPv6: 128 bits, /64 por rede local, sem NAT nem broadcast, NDP no lugar do ARP; o bloqueio do que chega passa a ser do firewall.`},{type:`callout`,tone:`english`,text:`- **subnet, subnet mask, CIDR block, prefix length**: sub-rede, máscara, bloco CIDR, tamanho do prefixo
- **network / broadcast address, usable hosts**: endereço de rede / de broadcast, hosts utilizáveis
- **default gateway, routing table, next hop, longest prefix match**: gateway padrão, tabela de rotas, próximo salto, prefixo mais longo
- **TTL expired in transit, ICMP Time Exceeded**: TTL esgotado no caminho (o que o ping e o traceroute mostram)
- **NAT, port forwarding, CGNAT, NAT traversal**: NAT, redirecionamento de porta, NAT da operadora, travessia de NAT

Frase típica de entrevista: *"When a host sends a packet, it first checks whether the destination is on its own subnet. If it is, it resolves the MAC address with ARP and delivers it directly; otherwise it forwards the frame to the default gateway. Each router then picks the route with the longest matching prefix."*

Frase típica de documentação de nuvem: *"The CIDR blocks of the subnets cannot overlap, and each subnet must reside entirely within the VPC's CIDR block."*`,title:`English corner`}]}],cards:[{id:`l9-ip-subredes-nat#1`,front:`Quantos hosts utilizáveis tem uma /27, e por quê?`,back:`30: são 2⁵ = 32 endereços, menos o de rede e o de broadcast.`},{id:`l9-ip-subredes-nat#2`,front:`Como achar a rede de 192.168.10.77/26 sem converter para binário?`,back:`Tamanho do bloco = 256 − 192 = 64; o múltiplo de 64 abaixo de 77 é 64: rede 192.168.10.64, broadcast .127.`},{id:`l9-ip-subredes-nat#3`,front:`Antes de enviar um pacote, o que o host compara para decidir entre entrega direta e gateway?`,back:`O destino AND a própria máscara com a própria rede: se for igual, entrega direta (com ARP); senão, manda ao gateway padrão.`},{id:`l9-ip-subredes-nat#4`,front:`O que muda e o que se mantém num pacote a cada salto (sem NAT)?`,back:`Mudam os MACs do quadro e o TTL (e a soma do cabeçalho IPv4); os IPs de origem e destino se mantêm.`},{id:`l9-ip-subredes-nat#5`,front:`Qual rota um roteador usa quando várias contêm o destino?`,back:`A de prefixo mais longo, a mais específica. 0.0.0.0/0 só vale quando nenhuma outra casa.`},{id:`l9-ip-subredes-nat#6`,front:`Como o traceroute descobre os roteadores do caminho?`,back:`Manda pacotes com TTL 1, 2, 3...; cada roteador que zera o TTL descarta o pacote e responde com ICMP Time Exceeded.`},{id:`l9-ip-subredes-nat#7`,front:`O que o NAT anota quando um pacote sai, e o que acontece com um pacote que chega sem tradução?`,back:`Anota porta pública ↔ (IP privado, porta privada). O que chega sem entrada na tabela é descartado.`},{id:`l9-ip-subredes-nat#8`,front:`Como reconhecer CGNAT?`,back:`O IP da WAN do roteador está em 100.64.0.0/10 e é diferente do IP que a internet vê.`},{id:`l9-ip-subredes-nat#9`,front:`Quais são as três faixas IPv4 privadas da RFC 1918?`,back:`10.0.0.0/8, 172.16.0.0/12 e 192.168.0.0/16.`}]};export{e as default};
//# sourceMappingURL=l9-ip-subredes-nat-CAOrsUHQ.js.map