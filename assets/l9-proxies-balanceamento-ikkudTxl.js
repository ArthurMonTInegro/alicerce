var e={id:`l9-proxies-balanceamento`,moduleId:`m9-3`,title:`Proxies reversos e balanceamento de carga: um endereço, muitos servidores`,titleEn:`Reverse proxies and load balancing: one address, many servers`,summary:`O que fica entre o cliente e os seus servidores: proxy direto e reverso, balanceamento em camada 4 e em camada 7, os algoritmos (round robin, ponderado, menos conexões, dois aleatórios, hash), verificações de saúde, o IP real do cliente no X-Forwarded-For, quando um proxy pode repetir uma requisição e o que muda com conexões longas como WebSockets.`,minutes:50,objectives:[`Diferenciar proxy direto de proxy reverso, e balanceamento em camada 4 de balanceamento em camada 7`,`Comparar round robin, round robin ponderado, menos conexões, dois aleatórios e hash, e escolher um para um caso concreto`,`Explicar verificações de saúde ativas e passivas e o papel dos limiares de subida e de queda`,`Recuperar o IP real do cliente a partir do X-Forwarded-For sem aceitar endereços forjados`,`Decidir quando um proxy pode repetir uma requisição e por que conexões longas exigem drenagem e reconexão com espera aleatória`],skills:[`redes-sockets`],terms:[{pt:`proxy direto`,en:`forward proxy`,def:`Intermediário que age em nome dos clientes, como o proxy da empresa que filtra o acesso à internet.`},{pt:`proxy reverso`,en:`reverse proxy`,def:`Intermediário que age em nome dos servidores: recebe as conexões dos clientes e as repassa a servidores internos.`,example:`NGINX can act as a reverse proxy and load balancer.`},{pt:`grupo de servidores`,en:`upstream / backend pool`,def:`Conjunto de instâncias entre as quais o balanceador distribui o tráfego.`},{pt:`balanceamento em camada 4`,en:`layer 4 load balancing`,def:`Decide por conexão olhando só IP, porta e protocolo de transporte; não entende o conteúdo.`},{pt:`balanceamento em camada 7`,en:`layer 7 load balancing`,def:`Termina a conexão do cliente, entende o protocolo de aplicação (HTTP) e decide por requisição.`},{pt:`terminação TLS`,en:`TLS termination`,def:`O proxy decifra o TLS com o certificado do site e fala com os servidores internos sem TLS ou com outra conexão TLS.`},{pt:`round robin ponderado`,en:`weighted round robin`,def:`Revezamento em que cada servidor recebe uma parte proporcional ao seu peso.`},{pt:`menos conexões`,en:`least connections`,def:`Escolhe o servidor com menos conexões ativas no momento.`},{pt:`poder de duas escolhas`,en:`power of two choices`,def:`Sorteia dois servidores e manda para o menos carregado dos dois.`},{pt:`verificação de saúde`,en:`health check`,def:`Teste periódico (ou observação do tráfego) que decide se um servidor continua recebendo tráfego.`,example:`Server app2 is DOWN, reason: Layer7 wrong status, code: 503`},{pt:`sessão fixa`,en:`sticky session / session affinity`,def:`Mandar sempre o mesmo cliente para o mesmo servidor, por cookie ou por hash do IP.`},{pt:`cabeçalho hop-by-hop`,en:`hop-by-hop header`,def:`Cabeçalho que vale só para uma conexão (como Connection e Upgrade) e que o proxy não repassa adiante.`},{pt:`drenagem de conexões`,en:`connection draining`,def:`Parar de mandar conexões novas a um servidor e esperar (com prazo) as atuais terminarem antes de desligá-lo.`},{pt:`espera exponencial com variação aleatória`,en:`exponential backoff with jitter`,def:`Esperar cada vez mais entre tentativas, com um sorteio no tempo, para que milhares de clientes não voltem todos no mesmo instante.`}],references:[`kurose-ross`,`google-sre`,`rfc9110`,`cloudflare-learning`,`twelve-factor`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Numa agência bancária, ninguém escolhe o caixa: há uma fila única e um painel que chama "próximo cliente, caixa 3". Quem chega vê **uma** entrada; atrás dela, vários atendentes. Se um caixa fecha para o almoço, o painel simplesmente para de chamá-lo.

Na web, esse painel é o {{proxy reverso|reverse proxy}}. O cliente se conecta a \`loja.exemplo.com.br\`; quem atende é o proxy (Nginx, HAProxy, Envoy, o balanceador da nuvem, uma CDN), que escolhe uma instância do {{grupo de servidores|upstream / backend pool}} e repassa o pedido. Com isso você ganha:

- **escala horizontal**: mais máquinas atrás do mesmo endereço;
- **tolerância a falhas**: servidor doente sai da rotação sem o usuário perceber;
- **deploy sem parar o site**: tira uma instância, atualiza, devolve;
- **um lugar só** para TLS, compressão, cache, limite de requisições e logs.

O preço é que agora há uma peça no meio, com regras próprias: ela muda o IP que o servidor vê, pode repetir requisições, derruba conexões ociosas e, se cair, derruba tudo.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`### Proxy direto × proxy reverso

Os dois são intermediários; a diferença é **a quem servem**. O {{proxy direto|forward proxy}} serve os **clientes**: é o proxy da empresa ou da escola, configurado nos computadores, que filtra e registra o acesso à internet; os sites veem o IP do proxy, não o de cada funcionário. O proxy reverso serve os **servidores**: fica na frente deles, e o cliente nem sabe que existe.

### Camada 4 × camada 7`},{type:`table`,head:[``,`{{Camada 4|layer 4 load balancing}} (transporte)`,`{{Camada 7|layer 7 load balancing}} (aplicação)`],rows:[[`O que enxerga`,`IPs, portas, TCP ou UDP`,`a requisição HTTP inteira: método, Host, caminho, cabeçalhos, cookies`],[`Unidade de decisão`,`a conexão: todos os bytes dela vão para o mesmo servidor`,`cada requisição: duas requisições da mesma conexão podem ir para servidores diferentes`],[`Conexões TCP`,`encaminha a conexão do cliente (ou os pacotes dela)`,`duas: cliente ↔ proxy e proxy ↔ servidor (esta muitas vezes reaproveitada)`],[`TLS`,`pode passar direto até o servidor (passthrough)`,`precisa fazer a {{terminação TLS|TLS termination}} para ler o HTTP`],[`Pode`,`balancear qualquer protocolo: banco de dados, MQTT, jogos em UDP`,`rotear por caminho ou domínio, reescrever cabeçalhos, comprimir, fazer cache, repetir requisições`],[`Exemplos`,`AWS NLB, HAProxy em mode tcp, Linux IPVS`,`Nginx, HAProxy em mode http, Envoy, AWS ALB`]],caption:`Uma consequência que pega muita gente: com HTTP/2 ou gRPC, o cliente manda tudo por uma conexão só. Um balanceador de camada 4 vê uma conexão e a manda inteira para um servidor; só um de camada 7 distribui as requisições de dentro dela.`},{type:`md`,text:`### Algoritmos de escolha`},{type:`table`,head:[`Algoritmo`,`Como escolhe`,`Bom quando`,`Cuidado`],rows:[[`Round robin`,`o próximo da lista, em revezamento`,`servidores iguais e requisições parecidas`,`ignora a carga real: um servidor com requisições lentas continua recebendo a mesma parte`],[`{{Round robin ponderado|weighted round robin}}`,`proporcional a um peso (máquina de 8 núcleos com peso 2, de 4 núcleos com peso 1)`,`máquinas de tamanhos diferentes`,`a versão ingênua manda rajadas (a, a, a, a, a, b, c); o Nginx usa uma versão "suave", que intercala`],[`{{Menos conexões|least connections}}`,`o servidor com menos conexões ativas agora`,`durações muito diferentes (relatório de 30 s junto com consulta de 5 ms) e conexões longas`,`cada balanceador só conhece as conexões que ele mesmo abriu; um servidor que acabou de voltar, com zero, recebe uma enxurrada`],[`{{Dois aleatórios|power of two choices}}`,`sorteia dois servidores e escolhe o menos carregado dos dois`,`vários balanceadores sem estado compartilhado`,'quase nenhum: é o padrão do Envoy para "menos requisições" e existe no Nginx (`random two least_conn`)'],[`Hash (IP, cookie, URL)`,`a mesma chave vai sempre para o mesmo servidor`,`aproveitar cache local; afinidade de sessão`,"com `hash % n`, mudar n remapeia quase tudo: use hash consistente (visto no Nível 7)"]]},{type:`callout`,tone:`deep`,text:`Por que sortear **dois** funciona tão bem? Distribuindo n requisições ao acaso entre n servidores, o mais carregado fica com cerca de log n / log log n delas. Sorteando dois e escolhendo o menos carregado, o máximo cai para cerca de log log n / log 2: uma melhora exponencial, e sortear três ou mais acrescenta pouco (Azar, Broder, Karlin e Upfal, 1994; Mitzenmacher, 2001). E, ao contrário de "sempre o menos carregado", dois aleatórios evita que dez balanceadores, cada um com a sua visão atrasada, mandem tudo juntos para o mesmo servidor que parecia vazio.`,title:`Aprofundando`},{type:`md`,text:'### {{Verificações de saúde|health checks}}\n\n- **Ativas**: o balanceador pergunta, por exemplo `GET /saude` a cada 2 s. Para não ficar tirando e devolvendo um servidor a cada resposta isolada (o "pisca-pisca", em inglês *flapping*), usam-se **limiares**: só tira depois de *fall* falhas seguidas e só devolve depois de *rise* sucessos seguidos. No HAProxy, os padrões são `inter 2s`, `rise 2` e `fall 3`.\n- **Passivas**: o balanceador observa o tráfego real. No Nginx de código aberto (as verificações ativas são da versão paga, o NGINX Plus), `max_fails=1 fail_timeout=10s` são os padrões: uma falha dentro de 10 s tira o servidor da rotação por 10 s.\n- **O que `/saude` deve conferir**: que o processo consegue atender. Cuidado ao incluir dependências compartilhadas: se `/saude` testa o banco e o banco fica lento, **todos** os servidores ficam "doentes" juntos e o balanceador tira todos, transformando uma lentidão num site fora do ar.\n\n### Estado: sessões fixas e conexões longas\n\nSe a sessão do usuário fica na memória do servidor A, a próxima requisição tem de voltar para A: é a {{sessão fixa|sticky session / session affinity}}, por cookie do balanceador ou por hash do IP. Funciona, mas A cair significa perder as sessões dele, e a carga fica desigual. A saída preferida é o servidor **sem estado**: sessão no Redis ou no banco, e qualquer instância atende qualquer requisição (é um dos fatores do Twelve-Factor App).\n\nConexões longas, como as de WebSocket, são fixas por natureza: a conexão fica no mesmo servidor por horas. Daí:\n\n- a escolha é feita **uma vez por conexão**, então "menos conexões" funciona bem, e round robin pode deixar um servidor com o dobro de usuários do outro;\n- um servidor novo só recebe conexões **novas**: a carga demora a se redistribuir;\n- no deploy, faça a {{drenagem de conexões|connection draining}}: pare de mandar conexões novas ao servidor, envie close **1001** (indo embora) às atuais e dê um prazo. Os clientes reconectam e caem em outro servidor;\n- se 50 mil clientes reconectam no mesmo segundo, a "manada" (*thundering herd*) derruba o próximo servidor. Os clientes devem reconectar com {{espera exponencial com variação aleatória|exponential backoff with jitter}}: esperar um tempo sorteado entre 0 e 1 s, depois entre 0 e 2 s, depois entre 0 e 4 s, até um teto.\n\nLembre também que `Upgrade` e `Connection` são {{cabeçalhos hop-by-hop|hop-by-hop headers}}: valem só para a conexão em que chegaram, e a RFC 9110 manda o proxy não repassá-los. Por isso o Nginx só faz proxy de WebSocket se você mandar repassar esses cabeçalhos explicitamente, e o `proxy_read_timeout`, de 60 s por padrão, derruba conexões silenciosas: o batimento precisa ser mais frequente que isso.\n\n### O que o proxy esconde: o IP do cliente\n\nNum proxy de camada 7, o servidor vê a conexão vindo **do proxy**. Para não perder a informação, o proxy acrescenta cabeçalhos:\n\n- `X-Forwarded-For`: cada proxy **acrescenta no fim** o IP de quem se conectou a ele. Fica uma lista: `cliente, proxy1, proxy2`.\n- `X-Forwarded-Proto` (`https`) e `X-Forwarded-Host`: o servidor precisa deles para montar redirecionamentos e cookies `Secure` quando o TLS terminou no proxy.\n- `Forwarded: for=203.0.113.7;proto=https` é a versão padronizada (RFC 7239). Os `X-Forwarded-*` são convenção, mas são os mais usados.\n- Em camada 4, sem HTTP para pôr cabeçalhos, o HAProxy criou o **PROXY protocol**: uma linha no começo da conexão com o endereço original do cliente.\n\n**O cliente controla o começo da lista.** Qualquer um manda `X-Forwarded-For: 192.0.2.1`, e o proxy só acrescenta depois. Quem usa o **primeiro** IP da lista para limitar tentativas de login ou para registrar auditoria está aceitando um IP inventado. A regra segura: percorra a lista **da direita para a esquerda** (incluindo, no fim, o IP de quem se conectou a você), pulando os proxies **que são seus**; o primeiro endereço que não é de um proxy seu é o do cliente.\n\n### Timeouts e novas tentativas\n\nSe o servidor falha no meio, o proxy pode tentar outro. Isso só é seguro para requisições **idempotentes** (GET, PUT, DELETE): repetir um `POST /pagamentos` que estourou o tempo limite pode cobrar o Pix duas vezes, porque timeout **não** quer dizer que o primeiro servidor não processou. Por isso o Nginx, desde a versão 1.9.13, não repassa ao próximo servidor requisições não idempotentes (POST, LOCK, PATCH), a menos que você peça (`proxy_next_upstream ... non_idempotent`). APIs de pagamento resolvem do outro lado: o cliente envia uma **chave de idempotência**, e o servidor reconhece a repetição. E limite as repetições: num sistema já sobrecarregado, cada camada que repete multiplica a carga.\n\n### E se o balanceador cair?\n\nEle vira o ponto único de falha. Na prática há sempre dois ou mais: com um IP virtual que passa de um para o outro (VRRP, com o keepalived), com vários IPs no DNS ou com anycast, em que o mesmo IP é anunciado de vários lugares e a rede leva cada cliente ao mais próximo, como fazem as CDNs.'}]},{stage:`exemplo`,blocks:[{type:`md`,text:`### Um Nginx na frente de três instâncias`},{type:`code`,lang:`text`,code:`upstream app {
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
}`,runnable:!1,caption:`nginx.conf. $proxy_add_x_forwarded_for é o X-Forwarded-For que chegou com o IP de quem se conectou ao Nginx acrescentado no fim.`},{type:`md`,text:`### O caminho de uma requisição, cabeçalho por cabeçalho

Uma cliente em 203.0.113.7 tenta ser esperta e manda \`X-Forwarded-For: 192.0.2.1\`. A requisição passa por uma CDN (198.51.100.9) e pelo Nginx (10.0.0.5) até a aplicação:`},{type:`table`,head:[`Trecho`,`IP de origem da conexão`,`X-Forwarded-For recebido`],rows:[[`cliente → CDN`,`203.0.113.7`,`192.0.2.1 (forjado)`],[`CDN → Nginx`,`198.51.100.9`,`192.0.2.1, 203.0.113.7`],[`Nginx → aplicação`,`10.0.0.5`,`192.0.2.1, 203.0.113.7, 198.51.100.9`]],caption:`A aplicação junta a lista e o IP da conexão: [192.0.2.1, 203.0.113.7, 198.51.100.9, 10.0.0.5]. Da direita: 10.0.0.5 é o Nginx (nosso), 198.51.100.9 é a CDN (contratada por nós, então confiável), 203.0.113.7 não é nosso: é a cliente. O 192.0.2.1 nunca é considerado.`},{type:`callout`,tone:`info`,text:`Os endereços 192.0.2.0/24, 198.51.100.0/24 e 203.0.113.0/24 são reservados para documentação (RFC 5737), por isso aparecem nos exemplos: nunca são de ninguém de verdade.`}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`# Fila do banco com 3 caixas. Chega 1 cliente por minuto; a cada 3,
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
    print(f"{nome:15} espera média {media:4.1f} min, pior espera {pior} min")`,runnable:!0},{type:`md`,text:"O round robin manda **todos** os clientes dos boletos para o caixa 1, porque o padrão de chegada coincide com o revezamento, e a fila dele só cresce. Menos conexões olha quem está livre e ninguém espera. Coincidências assim acontecem de verdade: um cliente que manda lotes de requisições, sempre a mesma pesada seguida de duas leves, faz o mesmo papel. Troque `duracoes` por `[6, 1, 1, 1] * 5` e veja o que muda."}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e9-lb-1`,kind:`mcq`,prompt:"A loja quer mandar `/api/*` para um grupo de servidores e `/imagens/*` para outro, no mesmo domínio e na mesma porta 443 com HTTPS. Que tipo de balanceador consegue fazer isso?",difficulty:`facil`,skills:[`redes-sockets`],hints:["Em que parte da comunicação aparece o caminho `/api/...`: no cabeçalho TCP ou dentro da requisição HTTP?",`Com HTTPS, quem consegue ler a requisição HTTP no meio do caminho?`],explanation:`O caminho só existe dentro da requisição HTTP, e com HTTPS ela vai cifrada. Só um balanceador de camada 7 que faz a terminação TLS consegue lê-la e decidir por caminho. Um de camada 4 vê apenas IPs e portas, que são os mesmos para as duas rotas.`,options:[{text:`Um balanceador de camada 4, separando pela porta`,feedback:`As duas rotas usam a mesma porta, 443. E a camada 4 nem enxerga o caminho: ele está dentro do HTTP, que além disso vai cifrado.`},{text:`Um balanceador de camada 7 que termina o TLS`,correct:!0,feedback:`Isso: ele decifra, lê a linha de requisição e escolhe o grupo de servidores pelo caminho.`},{text:`DNS com vários IPs para o mesmo nome`,feedback:`O DNS resolve nomes, não caminhos: o navegador pergunta o IP de loja.exemplo.com.br, e não o de /api.`},{text:`Qualquer um: todo balanceador enxerga a URL`,feedback:`Só quem entende HTTP (camada 7) enxerga a URL, e só depois de decifrar o TLS. Em camada 4, a URL é apenas parte dos bytes cifrados.`}]}},{type:`exercise`,exercise:{id:`e9-lb-2`,kind:`predict`,lang:`python`,prompt:"A função acompanha um servidor com verificações de saúde ativas, usando limiares de subida (`rise`) e de queda (`fall`). Cada item é o resultado de uma verificação (True = respondeu bem). O que o programa imprime?",difficulty:`intermediario`,skills:[`redes-sockets`],hints:["O contador `seguidos` conta o quê: falhas, sucessos, ou resultados que contradizem o estado atual?",`O que acontece com o contador quando chega um resultado que confirma o estado atual?`,`Siga a lista à mão, anotando o estado e o contador depois de cada item. Quantas falhas seguidas acontecem antes do primeiro True que interrompe?`],explanation:`Começa no ar. Duas falhas (contador 2) e um sucesso zera o contador: ainda no ar. Depois, três falhas seguidas atingem fall = 3: "muda para DOWN". Fora do ar, um sucesso conta 1, mas a falha seguinte confirma o estado e zera. Os dois sucessos finais atingem rise = 2: "muda para UP". O retorno é True. Os limiares são o que impede o pisca-pisca: falhas e sucessos isolados não mudam nada.`,code:`def acompanhar(resultados, rise=2, fall=3):
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

print(acompanhar([True, False, False, True, False, False, False, True, False, True, True]))`,answer:`muda para DOWN
muda para UP
True`}},{type:`exercise`,exercise:{id:`e9-lb-3`,kind:`code`,lang:`python`,prompt:'Implemente a classe `MenosConexoes`, o coração de um balanceador "menos conexões":\n\n- `MenosConexoes(servidores)`: recebe a lista de nomes; todos começam saudáveis e com 0 conexões ativas.\n- `abrir()`: escolhe, **entre os saudáveis**, o que tem menos conexões ativas (empate: o que aparece primeiro na lista), soma 1 às conexões dele e devolve o nome. Se nenhum estiver saudável, levante `RuntimeError`.\n- `fechar(nome)`: uma conexão daquele servidor terminou.\n- `marcar(nome, saudavel)`: liga ou desliga o servidor. Um servidor doente não recebe conexões novas, mas as que ele já tem continuam contando e podem ser fechadas.',difficulty:`intermediario`,skills:[`redes-sockets`],hints:[`Que informações você precisa guardar sobre cada servidor? Onde guardar a ordem original, que decide os empates?`,"Em `abrir`, primeiro filtre quem pode receber. O que fazer se sobrar ninguém?","`min` com `key=` devolve o primeiro dos empatados na ordem em que percorre os itens. Em que ordem você está percorrendo?",`Ao marcar um servidor como doente, as conexões dele devem ser zeradas?`],explanation:'Guarde a lista na ordem original, um dicionário de conexões ativas e um de saúde. `abrir` filtra os saudáveis, pega o mínimo (o `min` do Python devolve o primeiro empatado, o que dá o desempate pela ordem) e incrementa. Repare no último teste: um servidor que volta com 0 conexões recebe todas as novas até alcançar os outros. Num sistema real, isso pode derrubá-lo de novo logo após voltar, e por isso o HAProxy e o Envoy têm um "aquecimento" (slow start), que aumenta aos poucos a parte dele.',starter:`class MenosConexoes:
    def __init__(self, servidores):
        # guarde a ordem, as conexões ativas e a saúde de cada servidor
        pass

    def abrir(self):
        # escolha o saudável com menos conexões (empate: o primeiro da lista)
        pass

    def fechar(self, nome):
        pass

    def marcar(self, nome, saudavel):
        pass`,solution:`class MenosConexoes:
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
        self.saudavel[nome] = saudavel`,tests:[{name:`reveza quando todos estão iguais`,code:`b = MenosConexoes(["a", "b", "c"])
r = [b.abrir() for _ in range(5)]
assert r == ["a", "b", "c", "a", "b"], f"com todos empatados, vence o primeiro da lista: esperado [a, b, c, a, b]; veio {r}"`},{name:`fechar libera o servidor`,code:`b = MenosConexoes(["a", "b", "c"])
for _ in range(6):
    b.abrir()
b.fechar("c")
b.fechar("c")
b.fechar("b")
r = [b.abrir(), b.abrir(), b.abrir()]
assert r == ["c", "b", "c"], f"depois de fechar 2 de c e 1 de b, as próximas devem ser c, b, c; veio {r}"`},{name:`servidor doente fica de fora, mas as conexões dele contam`,code:`b = MenosConexoes(["a", "b"])
b.abrir(); b.abrir(); b.abrir()          # a, b, a
b.marcar("a", False)
r = [b.abrir() for _ in range(3)]
assert r == ["b", "b", "b"], f"com a doente, tudo vai para b; veio {r}"
b.fechar("a"); b.fechar("a")
b.marcar("a", True)
r = [b.abrir() for _ in range(5)]
assert r == ["a", "a", "a", "a", "a"], f"a voltou com 0 conexões e b tem 4: as 4 próximas vão para a, e a quinta empata (a vence pela ordem); veio {r}"`},{name:`nenhum saudável`,code:`b = MenosConexoes(["a", "b"])
b.marcar("a", False)
b.marcar("b", False)
try:
    r = b.abrir()
except RuntimeError:
    pass
else:
    assert False, f"sem servidores saudáveis, abrir() deve levantar RuntimeError; devolveu {r!r}"`},{name:`sequências aleatórias`,code:`import random as _random
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
            ref.marcar(n, s)`}]}},{type:`exercise`,exercise:{id:`e9-lb-4`,kind:`code`,lang:`python`,prompt:'Escreva `ip_do_cliente(xff, ip_conexao, confiaveis)`, que descobre o IP real do cliente:\n\n- `xff`: o valor do cabeçalho `X-Forwarded-For` (IPs separados por vírgula, com ou sem espaços), ou `""`/`None` se ele não veio;\n- `ip_conexao`: o IP de quem abriu a conexão com a sua aplicação;\n- `confiaveis`: lista de redes dos **seus** proxies, em notação CIDR (como `"10.0.0.0/8"`).\n\nMonte a cadeia (os IPs do cabeçalho seguidos de `ip_conexao`), percorra-a **da direita para a esquerda** e devolva o primeiro IP que **não** pertence a nenhuma rede confiável, como texto, sem espaços. Se todos forem confiáveis, devolva o mais à esquerda. Todos os itens são IPs válidos (IPv4 ou IPv6).',difficulty:`intermediario`,skills:[`redes-sockets`,`redes-tcpip`],hints:[`Se a conexão chegou de um IP que não é de um proxy seu, quem escreveu o cabeçalho X-Forwarded-For? Dá para acreditar nele?`,`Como transformar "a, b ,c" numa lista limpa? E o caso de o cabeçalho não ter vindo?`,"O módulo `ipaddress` tem `ip_address(...)` e `ip_network(...)`. Como se pergunta se um endereço está dentro de uma rede?","Percorrer de trás para a frente: `reversed(lista)`. Em que momento você para?"],explanation:"Cada proxy **acrescenta no fim** o IP de quem se conectou a ele, então, lendo da direita, cada item foi escrito por alguém em quem você confia, até chegar ao primeiro IP que não é de um proxy seu: esse foi visto por um proxy seu, que o anotou, e é o cliente. Tudo à esquerda dele foi o próprio cliente quem escreveu e pode ser inventado.\n\nO primeiro e o segundo testes derrubam as duas soluções erradas mais comuns: pegar o **primeiro** da lista (forjável) e confiar no cabeçalho mesmo quando a conexão não veio de um proxy seu. Frameworks fazem isso com configurações como o `ProxyFix(x_for=N)` do Werkzeug ou o `set_real_ip_from` + `real_ip_recursive on` do Nginx: em todas, você declara quantos proxies, ou quais, são seus.",starter:`import ipaddress

def ip_do_cliente(xff, ip_conexao, confiaveis):
    # monte a cadeia: IPs do cabeçalho + ip_conexao
    # percorra da direita para a esquerda, pulando os IPs das redes confiáveis
    pass`,solution:`import ipaddress

def ip_do_cliente(xff, ip_conexao, confiaveis):
    redes = [ipaddress.ip_network(r) for r in confiaveis]
    cadeia = [p.strip() for p in (xff or "").split(",") if p.strip()]
    cadeia.append(ip_conexao)
    for ip in reversed(cadeia):
        endereco = ipaddress.ip_address(ip)
        if not any(endereco in rede for rede in redes):
            return ip
    return cadeia[0]`,tests:[{name:`sem proxy no caminho, o cabeçalho é ignorado`,code:`r = ip_do_cliente("192.0.2.1", "203.0.113.7", ["10.0.0.0/8"])
assert r == "203.0.113.7", f"a conexão veio direto de 203.0.113.7, que não é proxy seu: o cabeçalho foi escrito pelo próprio cliente; esperado 203.0.113.7, veio {r!r}"
r = ip_do_cliente("", "203.0.113.7", ["10.0.0.0/8"])
assert r == "203.0.113.7", f"sem cabeçalho, é o IP da conexão; veio {r!r}"
r = ip_do_cliente(None, "203.0.113.7", ["10.0.0.0/8"])
assert r == "203.0.113.7", f"xff=None: é o IP da conexão; veio {r!r}"`},{name:`o primeiro da lista pode ser forjado`,code:`r = ip_do_cliente("192.0.2.1, 203.0.113.7, 198.51.100.9", "10.0.0.5", ["10.0.0.0/8", "198.51.100.0/24"])
assert r == "203.0.113.7", f"é o exemplo da lição: 10.0.0.5 e 198.51.100.9 são seus, 203.0.113.7 não é. O 192.0.2.1 foi o cliente que escreveu. Veio {r!r}"
r = ip_do_cliente("203.0.113.50, 203.0.113.7", "10.0.0.5", ["10.0.0.0/8"])
assert r == "203.0.113.7", f"pare no primeiro não confiável vindo da direita, e não no primeiro vindo da esquerda; veio {r!r}"`},{name:`um proxy só e espaços irregulares`,code:`r = ip_do_cliente("203.0.113.7", "10.0.0.5", ["10.0.0.0/8"])
assert r == "203.0.113.7", f"veio {r!r}"
r = ip_do_cliente("  203.0.113.7 ,10.0.0.9", "10.0.0.5", ["10.0.0.0/8"])
assert r == "203.0.113.7", f"tire os espaços em volta de cada IP; veio {r!r}"`},{name:`tudo confiável e redes de um IP só`,code:`r = ip_do_cliente("10.1.1.1, 10.2.2.2", "10.0.0.5", ["10.0.0.0/8"])
assert r == "10.1.1.1", f"se todos forem confiáveis, devolva o mais à esquerda; veio {r!r}"
r = ip_do_cliente(None, "10.0.0.5", ["10.0.0.0/8"])
assert r == "10.0.0.5", f"sem cabeçalho e com a conexão vinda de um IP confiável, só sobra o IP da conexão; veio {r!r}"
r = ip_do_cliente("172.16.5.5", "172.16.0.1", ["172.16.0.1/32"])
assert r == "172.16.5.5", f"só 172.16.0.1 é confiável (/32); 172.16.5.5 é o cliente; veio {r!r}"`},{name:`IPv6`,code:`r = ip_do_cliente("2001:db8::1", "fd00::5", ["fd00::/8", "10.0.0.0/8"])
assert r == "2001:db8::1", f"veio {r!r}"
r = ip_do_cliente("2001:db8::1, 198.51.100.9", "fd00::5", ["fd00::/8", "198.51.100.0/24"])
assert r == "2001:db8::1", f"cadeias podem misturar IPv4 e IPv6; veio {r!r}"`}]}},{type:`exercise`,exercise:{id:`e9-lb-5`,kind:`mcq`,prompt:"O proxy repassou um `POST /pagamentos` (um Pix de R$ 150) ao servidor A, que não respondeu dentro do tempo limite de leitura. O que o proxy deveria fazer?",difficulty:`intermediario`,skills:[`redes-sockets`],hints:[`Quando o tempo limite estoura, o proxy sabe se o servidor A processou o pagamento ou não?`,`O que acontece se essa requisição for executada duas vezes? E se fosse um GET?`],explanation:`Timeout só diz que a resposta não chegou a tempo: A pode ter debitado e travado logo depois. POST não é idempotente, então o proxy não deve repeti-lo sozinho (o Nginx, desde a 1.9.13, não faz isso por padrão). Ele devolve um erro (504 Gateway Timeout), e a repetição fica com o cliente, usando uma chave de idempotência que permite ao servidor reconhecer que é o mesmo pagamento.`,options:[{text:`Reenviar na hora ao servidor B, porque A provavelmente caiu`,feedback:`Timeout não prova que A não processou. Se A debitou e só demorou a responder, B debita de novo: Pix em dobro.`},{text:`Devolver erro (504) e deixar a repetição para o cliente, com uma chave de idempotência`,correct:!0,feedback:`Isso. Só quem tem a chave de idempotência pode repetir com segurança, porque o servidor reconhece que é o mesmo pagamento.`},{text:`Reenviar ao próprio A até ele responder`,feedback:`Mesmo problema da cobrança duplicada, e ainda insiste num servidor que já está lento: repetições em série pioram a sobrecarga.`},{text:`Repetir como GET, que é idempotente`,feedback:`Trocar o método muda o significado da requisição: um GET em /pagamentos consulta, não paga. Idempotência é propriedade da operação, não um disfarce.`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e9-lb-desafio`,kind:`code`,lang:`python`,prompt:'Implemente o **round robin ponderado suave** do Nginx na classe `RoundRobinSuave`:\n\n- `RoundRobinSuave(pesos)`: `pesos` é um dicionário `nome → peso` (inteiros ≥ 1), na ordem dos servidores. Cada servidor tem também um **peso atual**, que começa em 0.\n- `escolher()`: considerando **só os saudáveis**, (1) some a cada um o seu peso ao peso atual; (2) escolha o de maior peso atual (empate: o primeiro na ordem); (3) subtraia do escolhido a soma dos pesos dos saudáveis; (4) devolva o nome. Sem nenhum saudável, levante `RuntimeError`.\n- `marcar(nome, saudavel)`: liga ou desliga o servidor. Quando a saúde dele **muda**, o peso atual dele volta a 0.\n\nCom pesos `{"a": 5, "b": 1, "c": 1}`, sete escolhas dão `a, a, b, a, c, a, a`: as mesmas proporções do ingênuo `a, a, a, a, a, b, c`, mas intercaladas.',difficulty:`desafio`,skills:[`redes-sockets`],hints:[`Que estado cada servidor carrega entre uma chamada e a próxima? Monte os dicionários no construtor.`,`Faça à mão as três primeiras escolhas com 5, 1, 1: quais são os pesos atuais depois de cada passo?`,`A soma que você subtrai é de todos os pesos ou só dos servidores saudáveis? E a soma de pesos atual, quanto dá depois de cada escolha quando todos estão saudáveis?`,'Na escolha do maior, um `>` estrito ou um `>=` decide quem vence o empate. Qual dá "o primeiro na ordem"?',"Em `marcar`, compare a saúde nova com a antiga antes de zerar: marcar como saudável quem já estava saudável não pode mexer no peso atual."],explanation:'A cada escolha, o total dos pesos dos saudáveis é distribuído (cada um ganha o seu peso) e depois retirado inteiro do escolhido; com todos saudáveis, a soma dos pesos atuais volta a 0 depois de cada escolha. Quem tem peso maior acumula mais rápido e vence mais vezes, mas, ao vencer, cai bem abaixo dos outros e dá a vez. Em 7 escolhas com 5, 1, 1, o "a" vence 5 vezes, mas nunca mais de duas seguidas dentro do ciclo.\n\nO núcleo (passos 1 a 3) é exatamente o algoritmo do módulo upstream do Nginx (o `current_weight` e o `effective_weight` do código-fonte; o `effective_weight` ainda diminui temporariamente o peso de servidores que falham). Zerar o peso atual quando a saúde muda é uma simplificação deste exercício: o Nginx apenas pula o servidor indisponível, sem mexer no peso atual dele. A versão ingênua manda rajadas de 5 requisições seguidas para o mesmo servidor, o que, com conexões caras de abrir, sobrecarrega uma máquina enquanto as outras ficam paradas.',starter:`class RoundRobinSuave:
    def __init__(self, pesos):
        # guarde os pesos, o peso atual (começa em 0) e a saúde de cada servidor
        pass

    def escolher(self):
        # 1. some o peso de cada saudável ao seu peso atual
        # 2. escolha o de maior peso atual (empate: o primeiro)
        # 3. subtraia do escolhido a soma dos pesos dos saudáveis
        pass

    def marcar(self, nome, saudavel):
        pass`,solution:`class RoundRobinSuave:
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
        self.saudavel[nome] = saudavel`,tests:[{name:`a sequência do Nginx`,code:`rr = RoundRobinSuave({"a": 5, "b": 1, "c": 1})
r = [rr.escolher() for _ in range(14)]
esperado = ["a", "a", "b", "a", "c", "a", "a"] * 2
assert r == esperado, f"com pesos 5, 1, 1 a sequência é a a b a c a a (e se repete); veio {r}"`},{name:`proporções`,code:`rr = RoundRobinSuave({"x": 3, "y": 2, "z": 1})
r = [rr.escolher() for _ in range(600)]
cont = {s: r.count(s) for s in "xyz"}
assert cont == {"x": 300, "y": 200, "z": 100}, f"em 600 escolhas com pesos 3, 2, 1, esperado 300, 200, 100; veio {cont}"
assert r[:6] == ["x", "y", "x", "z", "y", "x"], f"as 6 primeiras deveriam ser x y x z y x; vieram {r[:6]}"`},{name:`um servidor só e pesos iguais`,code:`rr = RoundRobinSuave({"único": 4})
assert [rr.escolher() for _ in range(3)] == ["único"] * 3
rr = RoundRobinSuave({"a": 1, "b": 1, "c": 1})
r = [rr.escolher() for _ in range(6)]
assert r == ["a", "b", "c", "a", "b", "c"], f"pesos iguais viram round robin comum; veio {r}"`},{name:`servidor fora da rotação`,code:`rr = RoundRobinSuave({"a": 2, "b": 1})
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
    assert False, f"sem saudáveis, escolher() deve levantar RuntimeError; devolveu {x!r}"`},{name:`sequências aleatórias`,code:`import random as _random
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
        assert x == e, f"pesos {pesos}, passo {passo}: esperado {e}, veio {x}"`}]}}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Proxy direto serve os clientes; proxy reverso serve os servidores e é a porta de entrada do sistema.
- Camada 4 decide por conexão, só com IPs e portas; camada 7 termina a conexão (e o TLS), entende HTTP e decide por requisição.
- Algoritmos: round robin (iguais), ponderado (máquinas diferentes; a versão suave intercala), menos conexões (durações variadas, conexões longas), dois aleatórios (vários balanceadores), hash (afinidade; prefira hash consistente).
- Saúde: verificações ativas com limiares de subida e de queda; passivas pelo tráfego real; cuidado com \`/saude\` que depende do banco.
- Prefira servidores sem estado; com conexões longas, drene no deploy e faça os clientes reconectarem com espera exponencial e variação aleatória.
- IP do cliente: leia o X-Forwarded-For da direita para a esquerda, pulando só os seus proxies.
- Proxy só repete requisições idempotentes; pagamentos usam chave de idempotência.`},{type:`callout`,tone:`english`,text:`**Vocabulary:** *reverse proxy*, *upstream*, *backend pool*, *health check*, *rise/fall thresholds*, *sticky sessions*, *connection draining*, *TLS termination*, *retry budget*, *thundering herd*, *exponential backoff with jitter*.

Typical system design interview prompt: *"Your service runs on three instances behind a load balancer. One instance becomes slow but keeps answering health checks. What happens to your users, and how would you detect it?"* A strong answer mentions least-request or power-of-two-choices balancing, passive health checks (outlier detection) and latency percentiles, not just averages.`,title:`English corner`}]}],cards:[{id:`l9-proxies-balanceamento#1`,front:`Qual a diferença entre proxy direto e proxy reverso?`,back:`O direto age em nome dos clientes (proxy da empresa); o reverso age em nome dos servidores, recebendo as conexões e repassando ao grupo de servidores.`},{id:`l9-proxies-balanceamento#2`,front:`O que um balanceador de camada 7 consegue fazer que um de camada 4 não consegue?`,back:`Ler a requisição HTTP (depois de terminar o TLS) e decidir por requisição: rotear por caminho, domínio ou cabeçalho, reescrever, fazer cache, repetir.`},{id:`l9-proxies-balanceamento#3`,front:`Por que round robin vai mal quando as requisições têm durações muito diferentes?`,back:`Ele ignora a carga real: um servidor com requisições lentas continua recebendo a mesma parte e a fila dele cresce. Menos conexões olha quem está livre.`},{id:`l9-proxies-balanceamento#4`,front:`Como achar o IP real do cliente no X-Forwarded-For?`,back:`Juntar a lista com o IP da conexão e percorrer da direita para a esquerda, pulando os seus proxies; o primeiro que não é seu é o cliente. O começo da lista pode ser forjado.`},{id:`l9-proxies-balanceamento#5`,front:`Para que servem os limiares rise e fall numa verificação de saúde?`,back:`Para só tirar um servidor depois de várias falhas seguidas e só devolvê-lo depois de vários sucessos seguidos, evitando o pisca-pisca.`},{id:`l9-proxies-balanceamento#6`,front:`Por que um proxy não deve repetir sozinho um POST que estourou o tempo limite?`,back:`Timeout não prova que o servidor não processou; repetir pode duplicar o efeito (um Pix cobrado duas vezes). Só operações idempotentes, ou com chave de idempotência.`},{id:`l9-proxies-balanceamento#7`,front:`Por que os clientes devem reconectar com espera exponencial e variação aleatória?`,back:`Para que milhares de clientes derrubados ao mesmo tempo (num deploy, por exemplo) não voltem todos no mesmo instante e derrubem o próximo servidor.`}]};export{e as default};
//# sourceMappingURL=l9-proxies-balanceamento-ikkudTxl.js.map