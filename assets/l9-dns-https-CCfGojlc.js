var e={id:`l9-dns-https`,moduleId:`m9-2`,title:`DNS, HTTP(S) e TLS`,titleEn:`DNS, HTTP(S) and TLS`,summary:`Resolução de nomes, a evolução do HTTP e como o TLS protege a comunicação.`,minutes:35,objectives:[`Explicar a resolução DNS (recursiva e iterativa)`,`Conhecer os tipos de registro DNS`,`Entender o que o TLS garante: confidencialidade, integridade, autenticidade`,`Comparar HTTP/1.1, HTTP/2 e HTTP/3`],skills:[`redes-dns-tls`],terms:[{pt:`resolvedor`,en:`resolver`,def:`Servidor que descobre o IP de um nome, consultando outros servidores.`},{pt:`registro DNS`,en:`DNS record`,def:`Entrada do DNS: A, AAAA, CNAME, MX, TXT...`},{pt:`tempo de vida`,en:`TTL (time to live)`,def:`Por quanto tempo uma resposta pode ficar em cache.`},{pt:`certificado`,en:`certificate`,def:`Documento digital que liga um domínio a uma chave pública, assinado por uma autoridade.`},{pt:`autoridade certificadora`,en:`certificate authority (CA)`,def:`Entidade confiável que assina certificados.`}],references:[`kurose-ross`,`mdn-http`,`rfc9110`,`cloudflare-learning`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`O **DNS** é um banco de dados distribuído e hierárquico que traduz nomes em endereços. O **HTTPS** é HTTP dentro de **TLS**, que garante que ninguém no meio do caminho consegue **ler** (confidencialidade), **alterar** (integridade) ou **se passar** pelo site (autenticidade).`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`**Resolução DNS** de \`www.exemplo.com.br\` (sem cache): seu resolvedor pergunta à **raiz** (".") → que indica os servidores de **.br** → que indicam os de **exemplo.com.br** → que respondem o IP. Respostas ficam em **cache** pelo **TTL**.

Registros comuns: **A** (IPv4), **AAAA** (IPv6), **CNAME** (apelido para outro nome), **MX** (servidor de e-mail), **TXT** (verificações, SPF), **NS** (servidores do domínio).

**TLS (simplificado)**: no *handshake*, o servidor apresenta um **certificado** assinado por uma **CA** em que seu sistema confia; cliente e servidor combinam uma **chave de sessão** (troca de chaves Diffie-Hellman) e daí em diante tudo é criptografado com criptografia simétrica (rápida).

**Evolução do HTTP**: 1.1 (texto, uma requisição por vez por conexão) → 2 (binário, multiplexação numa conexão TCP) → 3 (sobre QUIC/UDP, sem bloqueio entre fluxos).`},{type:`callout`,tone:`warn`,text:`O cadeado do navegador garante que você fala com **o dono do domínio** de forma segura — não que o site seja honesto. Sites de phishing também têm HTTPS. Confira o domínio.`}]},{stage:`exemplo`,blocks:[{type:`code`,lang:`bash`,code:`$ dig +short exemplo.com A
93.184.215.14
$ dig exemplo.com MX
$ curl -v https://exemplo.com 2>&1 | grep -E "SSL|TLS|subject|issuer"`,runnable:!1,caption:`Ferramentas de linha de comando para investigar DNS e TLS no seu computador.`}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`# Um cache DNS com TTL, como o do seu sistema operacional
class CacheDNS:
    def __init__(self):
        self.dados = {}
    def guardar(self, nome, ip, ttl, agora):
        self.dados[nome] = (ip, agora + ttl)
    def buscar(self, nome, agora):
        if nome in self.dados:
            ip, expira = self.dados[nome]
            if agora < expira:
                return ip
            del self.dados[nome]
        return None

c = CacheDNS()
c.guardar("exemplo.com", "93.184.215.14", ttl=300, agora=0)
print(c.buscar("exemplo.com", agora=100), c.buscar("exemplo.com", agora=400))`,runnable:!0}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e9-dns-0`,kind:`mcq`,prompt:`Qual a função principal do **DNS**?`,difficulty:`facil`,skills:[`redes-dns-tls`],hints:[`Você digita nomes; a rede precisa de números.`],explanation:`O DNS traduz nomes de domínio (exemplo.com) em endereços IP. É a "agenda de contatos" da internet.`,options:[{text:`Traduzir nomes de domínio em endereços IP`,correct:!0,feedback:`Isso.`},{text:`Criptografar a conexão`,feedback:`Isso é papel do TLS.`},{text:`Garantir que os pacotes cheguem em ordem`,feedback:`Isso é papel do TCP.`},{text:`Guardar as páginas em cache`,feedback:`O DNS tem cache de respostas, mas não de páginas.`}]}},{type:`exercise`,exercise:{id:`e9-dns-1`,kind:`mcq`,prompt:`Você mudou o IP do seu site no DNS, mas alguns usuários continuam indo para o servidor antigo por horas. Causa mais provável?`,difficulty:`intermediario`,skills:[`redes-dns-tls`],hints:[`Respostas DNS ficam guardadas por quanto tempo?`],explanation:`Resolvedores e sistemas guardam a resposta antiga em cache até o TTL expirar. Antes de migrações, reduza o TTL com antecedência.`,options:[{text:`O TTL da resposta antiga ainda não expirou nos caches`,correct:!0,feedback:`Isso.`},{text:`O TCP guardou a conexão`,feedback:`Conexões não duram horas entre acessos distintos.`},{text:`O certificado TLS expirou`,feedback:`Isso daria erro de certificado, não o servidor antigo.`},{text:`O DNS só atualiza uma vez por dia no mundo todo`,feedback:`Não há atualização global; é cache com TTL.`}]}},{type:`exercise`,exercise:{id:`e9-tls-1`,kind:`mcq`,prompt:`O que o HTTPS **não** protege?`,difficulty:`intermediario`,skills:[`redes-dns-tls`],hints:[`Pense no que fica visível para o provedor de internet.`],explanation:`O conteúdo, os caminhos e os cabeçalhos são criptografados, mas o IP de destino e (normalmente) o nome do site (SNI) e o volume de tráfego ainda são visíveis.`,options:[{text:`O conteúdo das páginas`,feedback:`Isso é criptografado.`},{text:`A senha enviada no formulário`,feedback:`Também criptografada em trânsito.`},{text:`O fato de você estar acessando aquele domínio/IP`,correct:!0,feedback:`Isso: metadados como IP e, em geral, o nome do servidor ficam visíveis.`},{text:`Os cookies`,feedback:`Cookies vão nos cabeçalhos, que são criptografados.`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e9-dns-desafio`,kind:`code`,lang:`python`,prompt:'Simule a resolução DNS iterativa: `resolver(nome, servidores)` recebe um dict de "zonas" (ex.: `{".": {"br": "ns-br"}, "ns-br": {"exemplo.br": "ns-ex"}, "ns-ex": {"www.exemplo.br": "1.2.3.4"}}`) e devolve `(ip, caminho)` onde caminho é a lista de servidores consultados, começando pela raiz ".". Em cada servidor, procure a entrada que é o **sufixo mais longo** do nome.',difficulty:`desafio`,skills:[`redes-dns-tls`],hints:['Comece em ".". Em cada servidor, olhe as chaves que são sufixo do nome (`nome.endswith(chave)`).',`Se a resposta for outro servidor (chave existe no dict de servidores), continue nele; senão, é o IP.`],explanation:`É o processo de delegação do DNS: cada nível só sabe quem é responsável pelo próximo. Isso permite que o sistema seja distribuído e escalável.`,starter:`def resolver(nome, servidores):
    pass
`,solution:`def resolver(nome, servidores):
    atual = "."
    caminho = []
    while True:
        caminho.append(atual)
        zona = servidores[atual]
        candidatos = [k for k in zona if nome == k or nome.endswith("." + k) or k == nome]
        if not candidatos:
            return None, caminho
        resposta = zona[max(candidatos, key=len)]
        if resposta in servidores:
            atual = resposta
        else:
            return resposta, caminho`,tests:[{name:`resolução completa`,code:`s = {".": {"br": "ns-br"}, "ns-br": {"exemplo.br": "ns-ex"}, "ns-ex": {"www.exemplo.br": "1.2.3.4"}}
assert resolver("www.exemplo.br", s) == ("1.2.3.4", [".", "ns-br", "ns-ex"])`},{name:`inexistente`,code:`s = {".": {"br": "ns-br"}, "ns-br": {}}
assert resolver("x.com", s) == (None, ["."])`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:"**Investigue**: no navegador, clique no cadeado de um site → certificado. Quem é a autoridade certificadora? Quando expira? Depois rode `dig` (ou use um site de consulta DNS) para ver os registros A, MX e TXT do mesmo domínio."}]},{stage:`revisao`,blocks:[{type:`md`,text:`- DNS: hierárquico, distribuído, com cache (TTL).
- Registros A, AAAA, CNAME, MX, TXT, NS.
- TLS: confidencialidade, integridade, autenticidade (certificados + CAs).
- HTTP/2 multiplexa; HTTP/3 roda sobre QUIC.`}]}],cards:[{id:`l9-dns-https#1`,front:`O que o TTL de um registro DNS controla?`,back:`Por quanto tempo a resposta pode ser mantida em cache.`},{id:`l9-dns-https#2`,front:`O que o TLS garante?`,back:`Confidencialidade, integridade e autenticidade do servidor.`}]};export{e as default};
//# sourceMappingURL=l9-dns-https-CCfGojlc.js.map