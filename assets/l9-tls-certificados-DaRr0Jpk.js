var e={id:`l9-tls-certificados`,moduleId:`m9-2`,title:`TLS 1.3 e certificados: o handshake, a cadeia de confiança e os erros de HTTPS`,titleEn:`TLS 1.3 and certificates: the handshake, the chain of trust and HTTPS errors`,summary:`O que cada mensagem do handshake do TLS 1.3 faz e por que ele custa um RTT só, o que SNI, ALPN e 0-RTT resolvem (e o risco de repetição do 0-RTT), o que há num certificado X.509, como o cliente monta e valida a cadeia até uma raiz confiável e confere o nome com curinga, e como diagnosticar os erros de certificado mais comuns, além de revogação, Certificate Transparency, CAA, ACME, HSTS e mTLS.`,minutes:50,objectives:[`Descrever o handshake do TLS 1.3 mensagem por mensagem e dizer o que CertificateVerify e Finished provam`,`Calcular quantos RTTs uma pilha (TCP + TLS 1.2, TCP + TLS 1.3, QUIC, 0-RTT) leva até a primeira resposta`,`Explicar SNI, ECH e ALPN, e por que dados 0-RTT só servem para requisições idempotentes`,`Ler os campos de um certificado X.509 que importam: SAN, emissor, validade e se é CA`,`Montar e validar uma cadeia de certificados até uma raiz confiável, inclusive quando há caminhos alternativos`,`Aplicar as regras de nome com curinga e diagnosticar os erros de HTTPS mais comuns`],skills:[`redes-dns-tls`],terms:[{pt:`handshake do TLS`,en:`TLS handshake`,def:`A troca inicial de mensagens em que cliente e servidor combinam versão, algoritmos e chaves, e o servidor prova quem é.`},{pt:`compartilhamento de chave`,en:`key share`,def:`A metade pública e efêmera da troca de chaves Diffie-Hellman que cada lado envia no hello.`},{pt:`sigilo futuro`,en:`forward secrecy`,def:`Garantia de que o vazamento futuro da chave privada do servidor não decifra conversas gravadas no passado, porque cada sessão usou chaves efêmeras.`,example:`TLS 1.3 provides forward secrecy for all full handshakes.`},{pt:`indicação do nome do servidor`,en:`Server Name Indication (SNI)`,def:`Extensão do ClientHello com o nome do site, para o servidor escolher o certificado certo quando vários sites dividem o mesmo IP.`},{pt:`negociação do protocolo de aplicação`,en:`Application-Layer Protocol Negotiation (ALPN)`,def:`Extensão do TLS em que o cliente lista os protocolos que fala (h2, http/1.1) e o servidor escolhe um, sem RTT extra.`},{pt:`retomada de sessão`,en:`session resumption`,def:`Reabrir uma sessão TLS com uma chave combinada numa conexão anterior (PSK), pulando parte do trabalho.`},{pt:`dados antecipados`,en:`early data (0-RTT)`,def:`Dados de aplicação enviados junto com o ClientHello numa retomada, antes de o handshake terminar.`},{pt:`ataque de repetição`,en:`replay attack`,def:`Gravar uma mensagem legítima e reenviá-la para que seja processada de novo.`},{pt:`nome alternativo do titular`,en:`Subject Alternative Name (SAN)`,def:`Extensão do certificado com a lista de nomes (e IPs) que ele cobre; é o campo que os navegadores conferem.`},{pt:`certificado curinga`,en:`wildcard certificate`,def:`Certificado com um nome como *.loja.com.br, que cobre exatamente um rótulo naquela posição.`},{pt:`cadeia de certificados`,en:`certificate chain`,def:`A sequência folha → intermediárias → raiz, em que cada certificado é assinado pelo seguinte.`},{pt:`certificado intermediário`,en:`intermediate certificate`,def:`Certificado de uma CA assinado pela raiz (ou por outra intermediária), usado no dia a dia para emitir certificados de sites.`},{pt:`repositório de confiança`,en:`trust store (root store)`,def:`O conjunto de certificados raiz em que o sistema ou o navegador confia de antemão.`},{pt:`revogação`,en:`revocation`,def:`Invalidar um certificado antes do vencimento, por exemplo porque a chave privada vazou.`},{pt:`transparência de certificados`,en:`Certificate Transparency (CT)`,def:`Registros públicos e só de acréscimo onde as CAs publicam todo certificado que emitem.`},{pt:`TLS mútuo`,en:`mutual TLS (mTLS)`,def:`TLS em que o cliente também apresenta um certificado e prova possuir a chave dele.`},{pt:`segurança de transporte estrita`,en:`HTTP Strict Transport Security (HSTS)`,def:`Cabeçalho que manda o navegador usar só HTTPS com aquele domínio por um período.`,example:`Strict-Transport-Security: max-age=31536000; includeSubDomains`}],references:[`kurose-ross`,`cloudflare-learning`,`stanford-cs255`,`owasp-cheatsheets`,`mdn`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`A primeira lição deste módulo disse **o que** o TLS garante: ninguém no caminho lê, altera ou se passa pelo site. Esta lição mostra **como**, em duas partes:

- o {{handshake do TLS|TLS handshake}} 1.3, em que cliente e servidor, sem nenhum segredo em comum, combinam chaves novas e o servidor prova que é quem diz ser, tudo em **um** RTT;
- a **validação do certificado**, em que o cliente decide se confia: monta a {{cadeia de certificados|certificate chain}} até uma raiz que já conhece, confere datas e confere o nome.

A maior parte dos problemas reais de HTTPS está na segunda parte: certificado vencido, nome que não bate, servidor que esquece de mandar o intermediário, relógio errado no computador. Quem entende a cadeia diagnostica esses erros em minutos. A matemática das cifras e das assinaturas fica para o nível de segurança; aqui, elas são caixas-pretas com contrato conhecido: uma assinatura só pode ser feita por quem tem a chave privada e pode ser conferida por qualquer um com a chave pública.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:"### O handshake do TLS 1.3, mensagem por mensagem\nNo diagrama, `{ }` é o que vai cifrado com as chaves do handshake e `[ ]` o que vai cifrado com as chaves da aplicação."},{type:`code`,lang:`text`,code:`Cliente                                               Servidor
ClientHello: versões, suítes, key_share,
             SNI, ALPN, algoritmos de assinatura ──────►
                                 ◄────── ServerHello: suíte escolhida, key_share
                                         {EncryptedExtensions}: ALPN escolhido
                                         {Certificate}: a cadeia do servidor
                                         {CertificateVerify}: assinatura do transcrito
                                         {Finished}: HMAC do transcrito
{Finished}
[GET / ...] ──────────────────────────────►
                                 ◄────── [resposta HTTP]`,runnable:!1,caption:`O handshake completo do TLS 1.3 (RFC 8446), sem certificado de cliente.`},{type:`md`,text:`- **ClientHello.** O cliente não pergunta quais grupos de troca de chaves o servidor aceita: ele **chuta** (hoje, X25519 ou a troca híbrida com X25519 da caixa abaixo) e já manda o seu {{compartilhamento de chave|key share}}, a parte pública de um Diffie-Hellman efêmero. Junto vão as suítes de cifra, o nome do site e os protocolos de aplicação que ele fala.
- **ServerHello.** O servidor escolhe a suíte e manda o próprio key share. A partir daqui os dois lados calculam o mesmo segredo e derivam as chaves do handshake; **tudo o que vem depois já vai cifrado**, inclusive o certificado (no TLS 1.2, ele passava em claro). Se o chute do cliente errou o grupo, o servidor responde com HelloRetryRequest e o handshake custa um RTT a mais.
- **Certificate.** A cadeia do servidor: o certificado do site e os intermediários.
- **CertificateVerify.** Uma assinatura, feita com a chave privada do certificado, sobre o hash de todas as mensagens até ali (o *transcrito*). O certificado é público: qualquer um pode copiá-lo e apresentá-lo. Só quem tem a chave privada consegue assinar **este** handshake, que inclui os valores aleatórios desta conexão.
- **Finished.** Um HMAC, com uma chave derivada do segredo combinado, sobre o transcrito inteiro. Se alguém no caminho alterou qualquer mensagem (por exemplo, apagou do ClientHello as suítes fortes para forçar uma fraca), os dois lados viram transcritos diferentes e o Finished não confere.

Logo depois do próprio Finished, o cliente já manda a requisição HTTP. Como as chaves vêm de valores efêmeros, jogados fora no fim da sessão, todo handshake completo do TLS 1.3 tem {{sigilo futuro|forward secrecy}}: se a chave privada do servidor vazar ano que vem, o tráfego gravado hoje continua ilegível. (As exceções são as retomadas, que você verá abaixo: os dados 0-RTT e uma retomada só com a chave pré-compartilhada, sem novo Diffie-Hellman, dependem de uma chave guardada e não têm essa garantia.) O TLS 1.3 também **removeu** o que dava problema no 1.2: troca de chaves por RSA (sem sigilo futuro), cifras CBC, compressão, renegociação. As suítes caíram para cinco, todas com cifra autenticada (\`TLS_AES_128_GCM_SHA256\`, \`TLS_AES_256_GCM_SHA384\`, \`TLS_CHACHA20_POLY1305_SHA256\` e duas variantes CCM). TLS 1.0 e 1.1 foram oficialmente aposentados em 2021 (RFC 8996); o 1.2 bem configurado ainda é aceitável.`},{type:`callout`,tone:`deep`,text:`O ClientHello do TLS 1.3 diz, no campo de versão, que é **TLS 1.2** (0x0303); a versão real vai numa extensão, \`supported_versions\`. Motivo: nos testes, firewalls e outros equipamentos no caminho derrubavam conexões com um número de versão que não conheciam. É a mesma ossificação que levou o QUIC a cifrar quase todo o cabeçalho: o que fica visível no fio acaba congelado pelos equipamentos do meio.

Outra mudança em curso: computadores quânticos grandes, se um dia existirem, quebrariam o Diffie-Hellman de hoje, e quem grava tráfego agora poderia decifrá-lo depois. Por isso, desde o fim de 2024 o Chrome usa por padrão uma troca **híbrida**, X25519MLKEM768, que combina o X25519 com o ML-KEM (padronizado pelo NIST em 2024); a conexão só é quebrada se os dois forem.`,title:`Duas curiosidades do ClientHello`},{type:`md`,text:`### Quanto custa: RTTs até a primeira resposta
Antes do TLS vem o handshake do TCP (1 RTT). Somando a ida e a volta da própria requisição, numa conexão nova:`},{type:`table`,head:[`Pilha`,`Handshakes antes da requisição`,`Resposta chega após`,`Com RTT de 120 ms (São Paulo ↔ Virgínia)`],rows:[[`HTTP/1.1 ou 2 sobre TCP + TLS 1.2`,`1 (TCP) + 2 (TLS)`,`4 RTT`,`480 ms`],[`HTTP/1.1 ou 2 sobre TCP + TLS 1.3`,`1 + 1`,`3 RTT`,`360 ms`],[`TCP + TLS 1.3, retomada com 0-RTT`,`1 + 0`,`2 RTT`,`240 ms`],[`HTTP/3 (QUIC), conexão nova`,`1 (transporte e TLS juntos)`,`2 RTT`,`240 ms`],[`HTTP/3, retomada com 0-RTT`,`0`,`1 RTT`,`120 ms`]],caption:`Por isso CDNs põem servidores perto dos usuários: cada RTT a menos, multiplicado pelos handshakes, aparece direto no tempo de carregamento.`},{type:`md`,text:`**Retomada e 0-RTT.** Depois do handshake, o servidor pode mandar um "bilhete" (NewSessionTicket) com uma chave pré-compartilhada (PSK). Na próxima visita, o cliente faz uma {{retomada de sessão|session resumption}} com ela e pode até mandar {{dados antecipados|early data (0-RTT)}}: a requisição vai **junto** com o ClientHello. O preço é duplo: esses dados vão cifrados só com a chave do bilhete (sem sigilo futuro) e, principalmente, não têm proteção contra {{ataque de repetição|replay attack}}: quem gravou o primeiro voo pode reenviá-lo, e o servidor o processaria de novo. Por isso, 0-RTT só serve para requisições **idempotentes e seguras**, como um GET do catálogo; nunca para um POST que cria uma transferência Pix. Servidores e CDNs podem recusar early data ou responder \`425 Too Early\` (RFC 8470) para o cliente repetir depois do handshake.

### O que vai no ClientHello: SNI, ECH e ALPN
Um mesmo IP de CDN atende milhares de sites, cada um com o seu certificado. O servidor precisa saber qual site você quer **antes** de escolher o certificado, e isso acontece antes de existir qualquer chave. Por isso a {{indicação do nome do servidor|Server Name Indication (SNI)}} vai em claro no ClientHello, e é assim que a operadora ou o firewall da empresa veem o nome do site mesmo com HTTPS. A extensão **ECH** (*Encrypted Client Hello*) cifra o ClientHello "de dentro" com uma chave pública que o site publica no registro DNS HTTPS; por fora, o SNI mostra só o nome do provedor. Chrome, Firefox e Cloudflare já a suportam, mas ela só esconde o nome se a consulta DNS também for cifrada (DNS sobre HTTPS ou TLS); senão, a própria consulta entrega o nome.

A {{negociação do protocolo de aplicação|Application-Layer Protocol Negotiation (ALPN)}} é a peça que faltava na lição anterior: o cliente lista \`h2, http/1.1\` no ClientHello e o servidor escolhe um na EncryptedExtensions. Assim o HTTP/2 é escolhido sem custar nenhum RTT. No QUIC, o mesmo mecanismo negocia o \`h3\`.

### O certificado X.509: os campos que importam`},{type:`table`,head:[`Campo`,`Exemplo`,`Para que serve`],rows:[[`Subject (titular)`,`CN=loja.exemplo.com.br`,`quem é o titular; para a conferência de nome, os navegadores não usam mais o CN`],[`Subject Alternative Name`,`DNS:loja.exemplo.com.br, DNS:*.loja.exemplo.com.br`,`os nomes que o certificado cobre: é **este** campo que o cliente confere`],[`Issuer (emissor)`,`CN=AC Intermediária Exemplo`,`quem assinou; deve ser igual ao Subject do próximo certificado da cadeia`],[`Validity`,`notBefore 2026-08-01, notAfter 2027-02-16`,`o intervalo em que o certificado vale`],[`Public Key`,`chave EC P-256 ou RSA 2048`,`a chave que confere o CertificateVerify`],[`Basic Constraints`,`CA:FALSE (site) ou CA:TRUE (autoridade)`,`se este certificado pode assinar outros certificados`],[`Extended Key Usage`,`serverAuth`,`para que a chave pode ser usada (servidor TLS, cliente TLS, assinatura de código...)`],[`assinatura`,`ECDSA com SHA-256`,`a assinatura do emissor sobre todos os campos acima`]]},{type:`md`,text:`Desde 2017 (Chrome 58), os navegadores conferem o nome **só** no {{SAN|Subject Alternative Name (SAN)}}; um certificado com o nome apenas no CN é rejeitado. A validade máxima de um certificado público vem caindo: 398 dias desde 2020, **200 dias desde 15 de março de 2026**, e, pela votação SC-081 do CA/Browser Forum, 100 dias em 2027 e 47 dias em 2029. Certificados curtos limitam o estrago de uma chave vazada e obrigam a renovar de forma automática, com o protocolo **ACME** (RFC 8555), o mesmo do Let's Encrypt e do certbot (o Let's Encrypt emite certificados de 90 dias e já anunciou a redução para 45).

### A cadeia de confiança`},{type:`code`,lang:`text`,code:`Raiz Exemplo                  (autoassinada; já vem no sistema ou no navegador)
  └─ assina ─► AC Intermediária Exemplo     (o servidor manda)
                 └─ assina ─► loja.exemplo.com.br   (a folha; o servidor manda)`,runnable:!1},{type:`md`,text:"As raízes ficam no {{repositório de confiança|trust store (root store)}} do sistema operacional ou do navegador (Mozilla, Apple, Microsoft e Google mantêm programas próprios, com auditorias). A chave privada de uma raiz fica guardada offline, num cofre; quem emite no dia a dia é um {{certificado intermediário|intermediate certificate}}. Se um intermediário for comprometido, revoga-se só ele, sem trocar raízes em bilhões de aparelhos.\n\nPara aceitar a folha, o cliente:\n\n1. **Monta um caminho** da folha até uma raiz confiável: o Issuer de cada certificado precisa ser o Subject do próximo, e a assinatura de cada um precisa conferir com a chave pública do próximo. Os candidatos são os certificados que o servidor mandou e as raízes do repositório. Pode haver **mais de um caminho**, e um bom validador tenta outro quando o primeiro falha.\n2. Confere que cada emissor no caminho **é uma CA** (Basic Constraints CA:TRUE) e pode emitir para servidores.\n3. Confere a **validade** de todos os certificados do caminho na data de hoje, pelo relógio do próprio computador.\n4. Confere o **nome** do site contra o SAN da folha.\n5. Conforme o cliente, confere **revogação** e a prova de **Certificate Transparency**.\n\n**Regras de nome.** A comparação ignora maiúsculas e o ponto final de um nome absoluto (`loja.com.br.`). Um {{certificado curinga|wildcard certificate}} `*.loja.com.br` cobre **exatamente um rótulo** no lugar do `*`: cobre `pix.loja.com.br`, mas não `loja.com.br` (falta um rótulo) nem `a.pix.loja.com.br` (sobra um). Na prática, o `*` só vale como rótulo inteiro, o mais à esquerda: `w*.loja.com.br` ou `api.*.com.br` não casam com nada nos navegadores. E os navegadores recusam curingas sobre sufixos públicos, como `*.com.br`, consultando a *Public Suffix List*."},{type:`table`,head:[`Erro`,`Causa típica`,`Como resolver`],rows:[["`NET::ERR_CERT_DATE_INVALID` (Chrome)",`certificado vencido, ou o relógio do computador está errado`,`automatizar a renovação (ACME); acertar o relógio do computador`],["`NET::ERR_CERT_COMMON_NAME_INVALID`","o nome acessado não está no SAN (ex.: o certificado cobre `www.loja.com.br` e o usuário digitou `loja.com.br`)",`emitir o certificado com todos os nomes usados`],["`NET::ERR_CERT_AUTHORITY_INVALID`",`certificado autoassinado ou de uma raiz que o aparelho não conhece`,`usar uma CA pública; numa rede corporativa, instalar a raiz interna nas máquinas`],["`unable to get local issuer certificate` (OpenSSL, Python, curl)",`o servidor mandou só a folha, sem o intermediário`,"configurar a cadeia completa (o `fullchain.pem` do certbot, não o `cert.pem`)"]],caption:`Os erros de certificado que mais aparecem, e a causa por trás de cada um.`},{type:`callout`,tone:`warn`,text:"O último erro da tabela confunde muita gente porque o site **abre no navegador**. Alguns navegadores completam a cadeia sozinhos: buscam o intermediário que falta no endereço indicado no próprio certificado (o campo AIA) ou já trazem os intermediários conhecidos. Bibliotecas como o OpenSSL, usado pelo Python e pelo curl, não fazem isso, e a integração do parceiro falha. Teste o servidor com `openssl s_client` ou `curl`, não só com o navegador.",title:`Funciona no Chrome, falha no Python`},{type:`md`,text:'### Revogação, CT e CAA: quem vigia as CAs\n- **{{Revogação|revocation}}.** A CA publica listas de certificados revogados (CRL); o OCSP, uma consulta online por certificado, ficou opcional pelas regras do CA/Browser Forum em 2023 por ser lento e por contar à CA quais sites você visita. Em 2025 o Let\'s Encrypt encerrou o OCSP e ficou só com CRLs. Os navegadores distribuem listas agregadas e comprimidas (CRLite no Firefox, CRLSets no Chrome). Na prática, a defesa mais forte é a validade curta.\n- **{{Transparência de certificados|Certificate Transparency (CT)}}.** As CAs públicas publicam cada certificado emitido em registros públicos, só de acréscimo; Chrome, Safari e (desde 2025) o Firefox recusam certificados sem prova de registro. Em sites como o crt.sh você vê todos os certificados já emitidos para o seu domínio, e descobre se alguém emitiu um sem você saber.\n- **CAA.** Um registro DNS diz quais CAs podem emitir para o domínio: `loja.com.br. CAA 0 issue "letsencrypt.org"`. Toda CA pública é obrigada a consultá-lo antes de emitir.\n- **Prova de domínio no ACME.** Para emitir, a CA pede uma prova de controle: um arquivo em `http://loja.com.br/.well-known/acme-challenge/...` (HTTP-01) ou um registro TXT em `_acme-challenge.loja.com.br` (DNS-01, o desafio usado para emitir curingas, que o HTTP-01 não cobre). O DNS da primeira lição do módulo aparece de novo em todo canto.\n\n### HSTS e mTLS\nQuem digita `loja.com.br` na barra de endereços começa, sem perceber, em `http://`. Num Wi-Fi aberto de rodoviária, um atacante pode interceptar esse primeiro pedido e manter a vítima em HTTP (o ataque se chama *SSL stripping*). A {{segurança de transporte estrita|HTTP Strict Transport Security (HSTS)}} resolve: `Strict-Transport-Security: max-age=31536000; includeSubDomains` faz o navegador usar **só** HTTPS com aquele domínio por um ano, recusando até o botão "continuar mesmo assim". A primeira visita ainda fica exposta, a menos que o domínio esteja na *preload list* embutida nos navegadores.\n\nNo {{TLS mútuo|mutual TLS (mTLS)}}, o servidor manda um CertificateRequest e o **cliente** também apresenta certificado e assina o transcrito. É o padrão entre sistemas: as APIs Pix que os bancos oferecem a empresas e o Open Finance Brasil exigem mTLS, e malhas de serviço (*service mesh*) o usam entre microsserviços.'}]},{stage:`exemplo`,blocks:[{type:`md`,text:"Um cliente em Belém abre `https://loja.exemplo.com.br`, servida de São Paulo, com RTT de 50 ms, numa conexão nova sobre TCP:"},{type:`viz`,viz:`tcp-handshake`,caption:`Primeiro, o handshake do TCP (1 RTT). O ClientHello do TLS já pode ir junto com o ACK final.`},{type:`table`,head:[`Tempo`,`Evento`],rows:[[`0 ms`,`cliente manda SYN`],[`50 ms`,`chega o SYN-ACK; cliente manda ACK e, colado, o ClientHello (SNI loja.exemplo.com.br, ALPN h2 e http/1.1, key share X25519)`],[`100 ms`,`chega o voo do servidor: ServerHello, {EncryptedExtensions: h2}, {Certificate}, {CertificateVerify}, {Finished}`],[`100 ms + alguns ms`,`cliente valida: monta o caminho folha → AC Intermediária Exemplo → Raiz Exemplo (no repositório), confere datas, nome no SAN e CT; confere a assinatura do CertificateVerify e o Finished`],[`~101 ms`,`cliente manda {Finished} e, no mesmo voo, a requisição HTTP/2 (HEADERS no fluxo 1)`],[`~151 ms`,`chega o primeiro byte da resposta: 3 RTT depois do SYN`]]},{type:`md`,text:`A mesma investigação no terminal do seu computador mostra cada peça. A saída abaixo está resumida:`},{type:`code`,lang:`bash`,code:`$ openssl s_client -connect loja.exemplo.com.br:443 -servername loja.exemplo.com.br -alpn h2 </dev/null
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
    | openssl x509 -noout -subject -issuer -dates -ext subjectAltName`,runnable:!1,caption:`O servidor mandou 2 certificados (folha e intermediário); a raiz veio do repositório local. "-servername" é o SNI; "-alpn" é o ALPN.`},{type:`callout`,tone:`tip`,text:"Se o `Verify return code` não for 0, a mensagem ao lado diz o motivo: `certificate has expired`, `unable to get local issuer certificate` (falta intermediário), `self-signed certificate in certificate chain`. Para conferir o nome, use também `-verify_hostname loja.exemplo.com.br`."}]},{stage:`codigo`,blocks:[{type:`md`,text:"O Finished de perto. Esta simulação usa `hmac` e `hashlib` da biblioteca padrão para mostrar por que um atacante no meio não consegue rebaixar o handshake sem ser descoberto: ele pode alterar mensagens em claro, mas não conhece a chave para refazer o HMAC."},{type:`code`,lang:`python`,code:`import hashlib
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
          "segue" if ok else "ABORTA o handshake")`,runnable:!0,caption:`Mude uma letra de qualquer mensagem do transcrito e o Finished muda inteiro. No TLS 1.3 real, até as chaves do handshake dependem do transcrito.`},{type:`md`,text:"E o cliente TLS de verdade, com o módulo `ssl` do Python. Ele não roda aqui (o navegador não abre sockets); rode no seu computador:"},{type:`code`,lang:`python`,code:`import socket
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
        print("nomes:", [v for k, v in cert["subjectAltName"]][:5])`,runnable:!1,caption:`Para rodar no seu computador. Nunca desligue a verificação (verify=False, CERT_NONE) em produção: isso aceita qualquer certificado, inclusive o de quem está no meio.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e9-tls-cert-1`,kind:`parsons`,lang:`text`,prompt:`Coloque as mensagens de um handshake completo do TLS 1.3 (sem certificado de cliente) na ordem em que são enviadas, até a primeira requisição HTTP.`,lines:[`C → S  ClientHello (key_share, SNI, ALPN)`,`S → C  ServerHello (key_share)`,`S → C  {EncryptedExtensions} (ALPN escolhido)`,`S → C  {Certificate}`,`S → C  {CertificateVerify}`,`S → C  {Finished}`,`C → S  {Finished}`,`C → S  [requisição HTTP]`],difficulty:`facil`,skills:[`redes-dns-tls`],hints:[`Depois de qual mensagem os dois lados já têm o segredo para cifrar o resto?`,`O CertificateVerify assina o transcrito "até ali". Ele pode vir antes do certificado que contém a chave que o confere?`,`Quem manda o primeiro Finished, e quando o cliente pode começar a mandar dados?`],explanation:`O ClientHello já leva o key share; com o ServerHello, os dois calculam o segredo, e o resto do voo do servidor vai cifrado: EncryptedExtensions (com o ALPN), Certificate, CertificateVerify (que precisa vir depois do certificado, cuja chave o confere, e assina tudo até ali) e Finished. O cliente valida tudo, manda o próprio Finished e, no mesmo voo, a requisição. Por isso o TLS 1.3 custa um RTT só.`}},{type:`exercise`,exercise:{id:`e9-tls-cert-2`,kind:`fill`,lang:`text`,prompt:`Complete com o número de RTTs, contados a partir do primeiro pacote do cliente, até chegar o primeiro byte da resposta HTTP. Considere conexões novas, a não ser onde está escrito "retomada".`,template:`HTTP/2 sobre TCP + TLS 1.3: ___ RTTs
HTTP/2 sobre TCP + TLS 1.2: ___ RTTs
HTTP/3 (QUIC): ___ RTTs
HTTP/3 numa retomada com 0-RTT: ___ RTT`,blanks:[[`3`],[`4`],[`2`],[`1`]],difficulty:`intermediario`,skills:[`redes-dns-tls`,`redes-tcpip`],hints:[`Quantos RTTs custa o handshake do TCP? E o do TLS 1.3? E o do TLS 1.2?`,`Depois dos handshakes, a requisição ainda precisa ir e a resposta voltar. Isso custa quanto?`,`O QUIC faz o handshake de transporte e o do TLS ao mesmo tempo. E no 0-RTT, o que vai junto com o primeiro pacote?`],explanation:`TCP custa 1 RTT; TLS 1.3, 1; TLS 1.2, 2; e a requisição com a resposta, mais 1. Então: TCP + TLS 1.3 = 1 + 1 + 1 = 3; TCP + TLS 1.2 = 1 + 2 + 1 = 4; QUIC junta transporte e TLS num RTT só: 1 + 1 = 2; e no 0-RTT a requisição vai junto com o primeiro pacote, então a resposta volta em 1 RTT. Com o servidor do outro lado do continente (RTT de 120 ms), são 480 ms contra 120 ms antes do primeiro byte.`}},{type:`exercise`,exercise:{id:`e9-tls-cert-3`,kind:`code`,lang:`python`,prompt:'Escreva `nome_confere(nomes, host)`, que diz se o `host` está coberto pela lista `nomes` do SAN de um certificado, com as regras da lição:\n\n- a comparação ignora maiúsculas e um ponto final (`"Loja.com.br."` é o mesmo que `"loja.com.br"`);\n- um nome sem `*` casa só com o host idêntico;\n- um curinga só vale se for `*.` seguido de um nome sem nenhum outro `*`, e então casa com hosts que têm **exatamente um rótulo não vazio** a mais na frente: `*.loja.com.br` cobre `pix.loja.com.br`, mas não `loja.com.br` nem `a.pix.loja.com.br`;\n- qualquer outro uso de `*` (`w*.loja.com.br`, `api.*.com.br`) não casa com nada.\n\nIgnore a regra dos sufixos públicos.',difficulty:`intermediario`,skills:[`redes-dns-tls`],hints:[`Antes de comparar, normalize os dois lados do mesmo jeito. Quais métodos de str tiram o ponto final e as maiúsculas?`,`Para um curinga válido, o que precisa ser igual: o host inteiro ou o host sem o primeiro rótulo?`,'`host.partition(".")` separa o primeiro rótulo do resto. O que acontece com um host que começa com ponto?','Por que `host.endswith("loja.com.br")` aceitaria coisas demais? Teste com `xloja.com.br` e `a.pix.loja.com.br`.'],explanation:`Normalize host e padrão (minúsculas, sem ponto final). Sem asterisco, compare por igualdade. Com curinga válido (começa com "*." e não tem outro "*"), separe o primeiro rótulo do host: ele precisa ser não vazio e o resto precisa ser idêntico ao padrão sem o "*.". Comparar por sufixo é o erro clássico: aceita "xloja.com.br" para "loja.com.br" e vários rótulos no lugar do curinga. E fnmatch também não serve: nele, o * casa com pontos.`,starter:`def nome_confere(nomes, host):
    # nomes: lista de nomes do SAN (podem ter curinga)
    # devolva True se algum deles cobre o host
    pass`,solution:`def nome_confere(nomes, host):
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
    return False`,tests:[{name:`nomes exatos`,code:`assert nome_confere(["loja.com.br"], "loja.com.br") is True, "o nome idêntico precisa casar (devolva True ou False)"
assert nome_confere(["www.loja.com.br", "loja.com.br"], "loja.com.br"), "basta um nome da lista casar"
assert not nome_confere(["www.loja.com.br"], "loja.com.br"), "www.loja.com.br não cobre loja.com.br: é o erro ERR_CERT_COMMON_NAME_INVALID"
assert not nome_confere(["loja.com.br"], "xloja.com.br"), "xloja.com.br não é loja.com.br: comparar por sufixo aceita demais"
assert not nome_confere([], "loja.com.br"), "sem nomes, nada é coberto"`},{name:`maiúsculas e ponto final`,code:`assert nome_confere(["Loja.COM.br"], "loja.com.br."), "ignore maiúsculas e o ponto final, nos dois lados"
assert nome_confere(["*.loja.com.br."], "PIX.Loja.com.br"), "a normalização vale também para curingas"`},{name:`curinga cobre exatamente um rótulo`,code:`assert nome_confere(["*.loja.com.br"], "pix.loja.com.br"), "*.loja.com.br cobre pix.loja.com.br"
assert not nome_confere(["*.loja.com.br"], "loja.com.br"), "*.loja.com.br não cobre loja.com.br: falta o rótulo do curinga"
assert not nome_confere(["*.loja.com.br"], "a.pix.loja.com.br"), "o curinga cobre um rótulo só, não dois"
assert not nome_confere(["*.loja.com.br"], ".loja.com.br"), "o rótulo no lugar do * não pode ser vazio"
assert not nome_confere(["*.loja.com.br"], "pix.loja.com.br.golpe.net"), "o resto do host precisa ser idêntico ao padrão, não só começar igual"
assert nome_confere(["loja.com.br", "*.loja.com.br"], "loja.com.br") and nome_confere(["loja.com.br", "*.loja.com.br"], "app.loja.com.br"), "o par mais comum de SAN cobre o domínio e um nível abaixo"`},{name:`outros usos de * não casam`,code:`assert not nome_confere(["w*.loja.com.br"], "www.loja.com.br"), "curinga parcial (w*) não vale"
assert not nome_confere(["api.*.com.br"], "api.loja.com.br"), "o * só vale como o rótulo mais à esquerda"
assert not nome_confere(["*.*.com.br"], "a.loja.com.br"), "um segundo * invalida o padrão"
assert not nome_confere(["*"], "localhost"), "um * sozinho não é curinga válido"
assert "fnmatch" not in _source, "não use fnmatch: nele o * casa também com pontos"`}]}},{type:`exercise`,exercise:{id:`e9-tls-cert-4`,kind:`mcq`,prompt:"Você trocou o certificado do servidor da API. No navegador, o site abre com cadeado. Mas a integração do parceiro, em Python com `requests`, passou a falhar com `certificate verify failed: unable to get local issuer certificate`, e o `curl` falha igual. O relógio das máquinas está certo. Causa mais provável?",difficulty:`intermediario`,skills:[`redes-dns-tls`],hints:[`O que o servidor precisa mandar, além do certificado do próprio site, para o cliente chegar a uma raiz?`,`Por que o navegador conseguiria completar algo que o Python e o curl não completam?`],explanation:`O servidor foi configurado só com o certificado da folha (o cert.pem), sem o intermediário. O Python e o curl usam o OpenSSL, que tenta montar o caminho só com o que o servidor mandou e com as raízes locais; sem o intermediário, não chegam à raiz. Navegadores muitas vezes completam a cadeia sozinhos (buscando pelo campo AIA ou com intermediários que já conhecem), e mascaram o erro. A correção é configurar o servidor com a cadeia completa (fullchain.pem).`,options:[{text:`O servidor está mandando só o certificado do site, sem o intermediário`,correct:!0,feedback:`Isso: sem o intermediário, o OpenSSL não liga a folha a uma raiz. O navegador completou a cadeia sozinho e escondeu o problema. Configure a cadeia completa.`},{text:`O certificado novo não tem o nome da API no SAN`,feedback:`Nome errado daria um erro de hostname mismatch, e o navegador também reclamaria. A mensagem "unable to get local issuer certificate" é sobre montar a cadeia, não sobre o nome.`},{text:`O Python não suporta TLS 1.3`,feedback:`O módulo ssl do Python suporta TLS 1.3 há anos, e uma incompatibilidade de versão daria erro de handshake, não de emissor. O erro diz que falta um certificado para chegar à raiz.`},{text:`A raiz da nova CA é desconhecida no mundo todo; só o navegador a aceita`,feedback:`Se a raiz fosse desconhecida, o erro seria de certificado autoassinado ou de CA desconhecida, e em geral o navegador também recusaria. CAs públicas estão nos repositórios do sistema; o que falta aqui é o elo do meio.`}]}},{type:`exercise`,exercise:{id:`e9-tls-cert-5`,kind:`mcq`,prompt:`Um app de banco quer ligar o 0-RTT (dados antecipados do TLS 1.3) para abrir mais rápido. Qual requisição pode ir com segurança nos dados 0-RTT?`,difficulty:`avancado`,skills:[`redes-dns-tls`,`web-http-api`],hints:[`Que proteção os dados 0-RTT não têm, e que um handshake completo tem?`,`Se um atacante gravar esse primeiro voo e reenviá-lo dez vezes, o que acontece com cada requisição da lista?`,`Lembre do nível 6: quais métodos são seguros e idempotentes?`],explanation:`Dados 0-RTT podem ser repetidos por quem gravou o primeiro voo da conexão: o servidor não tem como distinguir a cópia da original antes de o handshake terminar. Uma requisição segura e idempotente, como um GET que só lê dados públicos, pode ser repetida sem efeito colateral. Uma transferência Pix, uma troca de senha ou um logout mudam o estado do servidor: repetidas, causam dano. Por isso servidores e CDNs costumam aceitar 0-RTT só para métodos seguros, e podem responder 425 Too Early para o cliente reenviar depois do handshake.`,options:[{text:`GET /agencias?cidade=Recife, que só lê a lista pública de agências`,correct:!0,feedback:`Isso: é segura e idempotente. Se for repetida por um atacante, nada muda no servidor.`},{text:`POST /pix/transferencias, porque o corpo vai cifrado`,feedback:`Estar cifrado não impede a repetição: o atacante não precisa ler a mensagem, só reenviá-la. Cada cópia poderia criar uma transferência nova.`},{text:`POST /senha/alterar, porque exige o token de sessão`,feedback:`O token vai junto na cópia gravada, então a repetição passa com ele. A alteração de senha muda estado e não pode ir em 0-RTT.`},{text:`Qualquer uma, porque o TLS 1.3 numera as mensagens e descarta repetidas`,feedback:`Dentro de uma conexão, sim; mas o atacante reenvia o primeiro voo inteiro como se fosse uma conexão nova, e o servidor só tem defesas parciais (janelas de tempo, bilhetes de uso único). A RFC 8446 avisa: 0-RTT não tem garantia contra repetição.`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e9-tls-cert-desafio`,kind:`code`,lang:`python`,prompt:'Escreva `validar(enviados, host, agora, raizes)`, um validador de cadeia simplificado. Cada certificado é um dicionário `{"sujeito": str, "emissor": str, "validade": (inicio, fim), "ca": bool, "nomes": [...]}`, com datas no formato `"AAAA-MM-DD"` (strings nesse formato se comparam na ordem certa). `enviados[0]` é a folha; os demais são o que o servidor mandou, em qualquer ordem e talvez com sobras. `raizes` é o repositório de confiança. Aqui a assinatura é dada como certa quando o `emissor` de um certificado é igual ao `sujeito` do próximo; no mundo real, também se confere a assinatura com a chave pública do emissor.\n\nNa ordem:\n1. Se o `host` não está coberto pelos `nomes` da folha (regras do exercício anterior; reaproveite o seu `nome_confere`), devolva `("nome", None)`.\n2. Se `agora` está fora da validade da folha (`inicio <= agora <= fim`, inclusive), devolva `("validade", None)`.\n3. Procure um caminho da folha até uma raiz. A partir do certificado atual, o próximo precisa ter `sujeito == atual["emissor"]` e estar dentro da validade. **Primeiro** tente as raízes, na ordem da lista: achou uma, o caminho termina nela. **Depois** tente os intermediários enviados, na ordem em que vieram, desde que tenham `ca` verdadeiro e ainda não estejam no caminho, e continue a busca a partir dele. Se um intermediário não levar a uma raiz, **volte e tente o próximo**.\n4. Achou: devolva `("ok", caminho)`, com a lista dos `sujeito` da folha até a raiz. Não achou: `("cadeia", None)`.\n\nEste é o caso real de 30 de setembro de 2021, quando a raiz DST Root CA X3 venceu: muitos clientes que só conheciam a raiz antiga (e que conferiam a validade dela) pararam de aceitar certificados do Let\'s Encrypt, e os que também tinham a ISRG Root X1 seguiram funcionando por outro caminho.',difficulty:`avancado`,skills:[`redes-dns-tls`],hints:[`Separe o problema: os passos 1 e 2 são verificações diretas sobre a folha; o passo 3 é uma busca num grafo.`,'Uma função recursiva `subir(atual, caminho)` combina bem com "tente um; se não der certo, tente o próximo". O que ela devolve quando dá certo, e quando não dá?',`Por que é preciso lembrar quais intermediários já estão no caminho? Pense em dois intermediários que se assinam um ao outro.`,`Dois certificados diferentes podem ter o mesmo sujeito (um deles assinado de forma cruzada por outra raiz). Como você marca "já usei este" sem confundir os dois?`,`Quando um intermediário leva a um beco sem saída, a busca deve parar ou continuar no laço?`],explanation:`Validar uma cadeia é buscar um caminho num grafo: os vértices são certificados, e há aresta de A para B quando B emitiu A, é CA e está dentro da validade. A busca em profundidade com retrocesso é necessária porque a primeira opção nem sempre leva a uma raiz, como no caso de setembro de 2021: a cadeia enviada incluía a ISRG Root X1 assinada de forma cruzada pela DST Root CA X3, já vencida. Validadores que seguiam só o caminho enviado (como o OpenSSL 1.0.2) falharam; os que procuravam alternativas encontraram a ISRG Root X1 no próprio repositório. Marcar os intermediários pelo índice, e não pelo sujeito, evita laços sem confundir certificados de mesmo nome. Tentar as raízes primeiro faz o caminho terminar no certificado confiável mais próximo.`,starter:`def validar(enviados, host, agora, raizes):
    # devolva ("nome", None), ("validade", None), ("cadeia", None)
    # ou ("ok", [sujeitos da folha até a raiz])
    pass`,solution:`def nome_confere(nomes, host):
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
    return ("ok", caminho) if caminho else ("cadeia", None)`,tests:[{name:`cadeia simples, nome e validade da folha`,code:`import random as _random

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
folha = C("loja.com.br", "AC Inter", "2026-08-01", "2027-02-16", ca=False, nomes=["loja.com.br", "*.loja.com.br"])
inter = C("AC Inter", "Raiz Exemplo")
raiz = C("Raiz Exemplo", "Raiz Exemplo")
r = validar([folha, inter], "pix.loja.com.br", "2026-10-13", [raiz])
assert r is not None and r[0] == "ok" and list(r[1]) == ["loja.com.br", "AC Inter", "Raiz Exemplo"], f"veio {r}; o caminho vai da folha até a raiz, pelos sujeitos"
_confere([folha, inter], "a.pix.loja.com.br", "2026-10-13", [raiz], "o curinga cobre um rótulo só: erro de nome")
_confere([folha, inter], "loja.com.br", "2027-03-01", [raiz], "a folha venceu em 2027-02-16")
_confere([folha, inter], "loja.com.br", "2027-02-16", [raiz], "o último dia ainda vale (inicio <= agora <= fim)")
_confere([folha, inter], "x.com.br", "2027-03-01", [raiz], "nome e validade errados: o nome é conferido primeiro")`},{name:`cadeia incompleta e raiz desconhecida`,code:`import random as _random

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
folha = C("api.loja.com.br", "AC Inter", ca=False, nomes=["api.loja.com.br"])
inter = C("AC Inter", "Raiz Exemplo")
raiz = C("Raiz Exemplo", "Raiz Exemplo")
_confere([folha], "api.loja.com.br", "2026-10-13", [raiz], "o servidor não mandou o intermediário: não há como chegar à raiz")
_confere([folha, inter], "api.loja.com.br", "2026-10-13", [], "nenhuma raiz confiável no repositório")
auto = C("api.loja.com.br", "api.loja.com.br", ca=False, nomes=["api.loja.com.br"])
_confere([auto], "api.loja.com.br", "2026-10-13", [raiz], "certificado autoassinado que não está no repositório")
_confere([folha, C("Outra AC", "Raiz Exemplo"), inter], "api.loja.com.br", "2026-10-13", [raiz], "certificados que sobram na lista são ignorados; a ordem dos enviados não importa")`},{name:`intermediário vencido ou que não é CA`,code:`import random as _random

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
folha = C("loja.com.br", "AC Inter", ca=False, nomes=["loja.com.br"])
raiz = C("Raiz Exemplo", "Raiz Exemplo")
_confere([folha, C("AC Inter", "Raiz Exemplo", "2020-01-01", "2025-12-31")], "loja.com.br", "2026-10-13", [raiz], "o intermediário venceu: toda a cadeia precisa estar na validade")
_confere([folha, C("AC Inter", "Raiz Exemplo", ca=False)], "loja.com.br", "2026-10-13", [raiz], "um certificado sem ca=True não pode emitir outros")
_confere([folha, C("AC Inter", "Raiz Exemplo")], "loja.com.br", "2026-10-13", [C("Raiz Exemplo", "Raiz Exemplo", "2000-01-01", "2026-01-01")], "a raiz também precisa estar na validade")`},{name:`30 de setembro de 2021`,code:`import random as _random

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
assert r is not None and r[0] == "ok" and list(r[1]) == ["loja.com.br", "R3", "ISRG Root X1"], f"antes do vencimento os dois caminhos valem, mas as raízes são tentadas antes dos intermediários: o caminho para na ISRG Root X1 do repositório; veio {r}"`},{name:`é preciso voltar e tentar outro caminho`,code:`import random as _random

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
_confere([folha2, a, b, C("AC A", "Raiz Nova")], "loja.com.br", "2026-10-13", [raiz_nova], "depois de esgotar o laço A-B, ainda há um caminho por outra AC A")`},{name:`cadeias aleatórias`,code:`import random as _random

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
_rng = _random.Random(5280)
for _ in range(500):
    enviados, host, agora, raizes = _gera(_rng)
    _confere(enviados, host, agora, raizes)`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:"**Audite um domínio de verdade.** Escolha o domínio de um serviço que você usa (a prefeitura da sua cidade, sua universidade, uma loja). No seu computador: (1) rode `openssl s_client` como no exemplo e anote a versão do TLS, a suíte, o ALPN e a cadeia (quantos certificados o servidor manda?); (2) veja os nomes do SAN e a data de vencimento; (3) consulte o domínio no crt.sh e conte quantos certificados foram emitidos no último ano e por quais CAs; (4) rode `dig` com os tipos CAA e HTTPS e veja se o domínio restringe as CAs e anuncia h3 ou ECH; (5) confira se as respostas trazem `Strict-Transport-Security`. Escreva um parágrafo com o que está bem configurado e o que você mudaria."}]},{stage:`revisao`,blocks:[{type:`md`,text:`- TLS 1.3: ClientHello já leva o key share → depois do ServerHello tudo vai cifrado (até o certificado) → Certificate, CertificateVerify (assinatura do transcrito: prova a posse da chave) e Finished (HMAC do transcrito: detecta alterações) → o cliente manda Finished e a requisição. 1 RTT, com sigilo futuro em todo handshake completo (dados 0-RTT não têm).
- Até a primeira resposta: TCP + TLS 1.2 = 4 RTT; TCP + TLS 1.3 = 3; QUIC = 2; QUIC com 0-RTT = 1. Dados 0-RTT podem ser repetidos: só requisições seguras e idempotentes.
- SNI vai em claro (ECH esconde, com chave publicada no DNS HTTPS); ALPN escolhe h2/http/1.1 (e h3 no QUIC) sem RTT extra.
- O nome é conferido no SAN; \`*.loja.com.br\` cobre exatamente um rótulo. Validade máxima: 200 dias desde março de 2026, caindo para 47 até 2029; renove com ACME.
- Validação: caminho da folha até uma raiz do repositório (com retrocesso entre caminhos alternativos), emissores com CA:TRUE, todas as datas, nome, revogação e CT.
- Erros comuns: data (vencido ou relógio), nome fora do SAN, raiz desconhecida, intermediário faltando (abre no navegador, falha no Python).
- CAA restringe as CAs no DNS; CT torna toda emissão pública; HSTS impede o rebaixamento para HTTP; mTLS autentica o cliente (Pix, Open Finance).`},{type:`callout`,tone:`english`,text:`- **handshake, key share, transcript hash, forward secrecy**: aperto de mão, compartilhamento de chave, hash do transcrito, sigilo futuro
- **session resumption, early data (0-RTT), replay attack**: retomada de sessão, dados antecipados, ataque de repetição
- **certificate chain, leaf/intermediate/root certificate, trust store, cross-signed**: cadeia de certificados, certificado folha/intermediário/raiz, repositório de confiança, assinado de forma cruzada
- **Subject Alternative Name, wildcard, hostname mismatch, expired certificate, revocation**: nome alternativo do titular, curinga, nome que não confere, certificado vencido, revogação

Frase típica de entrevista: *"During the TLS 1.3 handshake, the client sends its key share in the ClientHello, so the server can derive the handshake keys right away and encrypt its certificate. The CertificateVerify message proves the server owns the private key, and the Finished messages authenticate the whole transcript."*

Frase típica de documentação: *"Make sure your server sends the full certificate chain, including any intermediate certificates; otherwise some clients will fail with 'unable to get local issuer certificate'."*`,title:`English corner`}]}],cards:[{id:`l9-tls-certificados#1`,front:`Por que, no TLS 1.3, o certificado do servidor já vai cifrado, e no TLS 1.2 não ia?`,back:`Porque o cliente manda o key share no ClientHello; com o ServerHello, os dois lados já têm o segredo e cifram todo o resto, inclusive o certificado.`},{id:`l9-tls-certificados#2`,front:`O que o CertificateVerify prova, e por que o certificado sozinho não basta?`,back:`Que o servidor tem a chave privada do certificado, assinando o transcrito deste handshake. O certificado é público: qualquer um pode copiá-lo.`},{id:`l9-tls-certificados#3`,front:`O que a mensagem Finished protege?`,back:`A integridade do handshake inteiro: é um HMAC do transcrito com chave derivada do segredo combinado; qualquer alteração no caminho (como rebaixar suítes) faz ela não conferir.`},{id:`l9-tls-certificados#4`,front:`Quantos RTTs até o primeiro byte da resposta com TCP + TLS 1.3, e com HTTP/3 numa conexão nova?`,back:`3 RTTs (TCP, TLS, requisição) e 2 RTTs (QUIC+TLS juntos, requisição).`},{id:`l9-tls-certificados#5`,front:`Por que dados 0-RTT só servem para requisições seguras e idempotentes?`,back:`Porque podem ser gravados e reenviados (replay) sem que o servidor perceba antes do fim do handshake.`},{id:`l9-tls-certificados#6`,front:`Que nomes *.loja.com.br cobre?`,back:`Exatamente um rótulo a mais: pix.loja.com.br sim; loja.com.br e a.pix.loja.com.br não.`},{id:`l9-tls-certificados#7`,front:`Por que um site pode abrir no Chrome e falhar no Python com "unable to get local issuer certificate"?`,back:`O servidor não mandou o intermediário. O navegador completa a cadeia sozinho (AIA ou cache); o OpenSSL não. Solução: servir a cadeia completa.`},{id:`l9-tls-certificados#8`,front:`Como o cliente decide se confia num certificado?`,back:`Monta um caminho até uma raiz do repositório (Issuer = Subject do próximo, assinaturas conferem, emissores são CA), confere todas as validades, o nome no SAN e, conforme o cliente, revogação e CT.`},{id:`l9-tls-certificados#9`,front:`Para que servem o registro CAA e a Certificate Transparency?`,back:`CAA diz no DNS quais CAs podem emitir para o domínio; CT torna públicas todas as emissões, para o dono descobrir certificados emitidos sem autorização.`},{id:`l9-tls-certificados#10`,front:`O que o HSTS impede?`,back:`Que o navegador use HTTP (e caia num SSL stripping) com o domínio durante o max-age; com preload, até na primeira visita.`}]};export{e as default};
//# sourceMappingURL=l9-tls-certificados-DaRr0Jpk.js.map