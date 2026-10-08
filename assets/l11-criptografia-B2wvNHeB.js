var e={id:`l11-criptografia`,moduleId:`m11-3`,title:`Criptografia aplicada: cifras, HMAC, assinaturas e TLS`,titleEn:`Applied cryptography: ciphers, HMAC, signatures and TLS`,summary:`O que cada ferramenta criptográfica garante, como elas se combinam no HTTPS e por que nunca se inventa a própria criptografia.`,minutes:50,objectives:[`Diferenciar hash, HMAC, cifra simétrica, cifra assimétrica e assinatura digital`,`Dizer qual propriedade (sigilo, integridade, autenticidade) cada uma oferece`,`Usar HMAC corretamente, com comparação em tempo constante`,`Explicar, com RSA de brinquedo, por que a chave pública não revela a privada`],skills:[`seg-cripto`],terms:[{pt:`cifra simétrica`,en:`symmetric cipher`,def:`A mesma chave cifra e decifra.`,example:`AES-GCM`},{pt:`cifra assimétrica`,en:`asymmetric (public-key) cryptography`,def:`Par de chaves: a pública cifra ou verifica; a privada decifra ou assina.`,example:`RSA, curvas elípticas`},{pt:`assinatura digital`,en:`digital signature`,def:`Prova de que a mensagem veio do dono da chave privada e não foi alterada.`},{pt:`código de autenticação de mensagem`,en:`message authentication code (MAC)`,def:`Etiqueta calculada com uma chave secreta compartilhada; o HMAC é o mais comum.`},{pt:`troca de chaves`,en:`key exchange`,def:`Protocolo para dois lados combinarem uma chave secreta por um canal inseguro.`,example:`Diffie-Hellman`},{pt:`nonce`,en:`nonce`,def:`Número usado uma única vez; reutilizá-lo pode quebrar a cifra.`},{pt:`ataque de temporização`,en:`timing attack`,def:`Descobrir segredos medindo quanto tempo uma operação demora.`}],references:[`stanford-cs255`,`owasp-cheatsheets`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Criptografia é uma caixa de ferramentas, e cada ferramenta garante uma coisa diferente: **sigilo** (ninguém lê), **integridade** (ninguém altera sem ser notado) e **autenticidade** (veio de quem diz ter vindo). Usar a ferramenta errada é o erro mais comum: cifrar não garante integridade, e um hash simples não garante autenticidade.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`| Ferramenta | Chave | Garante | Exemplo de uso |
|---|---|---|---|
| Hash (SHA-256) | nenhuma | integridade contra erro acidental | conferir download |
| HMAC | secreta compartilhada | integridade + autenticidade | webhooks, cookies assinados |
| Cifra simétrica autenticada (AES-GCM, ChaCha20-Poly1305) | secreta compartilhada | sigilo + integridade | dados no HTTPS, arquivos |
| Cifra assimétrica (RSA, ECIES) | par pública/privada | sigilo sem segredo prévio | cifrar uma chave para alguém |
| Assinatura (Ed25519, ECDSA, RSA-PSS) | par pública/privada | autenticidade verificável por qualquer um | certificados, pacotes, commits |

**Como o HTTPS (TLS 1.3) junta tudo**: o servidor apresenta um **certificado** (sua chave pública assinada por uma autoridade); os dois lados fazem uma **troca de chaves** Diffie-Hellman com curvas elípticas; dela sai uma chave **simétrica** que cifra e autentica todo o tráfego, porque cifras simétricas são muito mais rápidas.

### Regras de sobrevivência

- **Nunca crie sua própria criptografia** nem seu próprio protocolo. Use bibliotecas de alto nível (libsodium, \`cryptography\` em Python, Web Crypto no navegador).
- Prefira **cifras autenticadas** (AEAD). Cifrar sem autenticar permite que um atacante altere o texto cifrado.
- **Nunca reutilize um nonce** com a mesma chave.
- Compare etiquetas e tokens com **comparação em tempo constante** (\`hmac.compare_digest\`), não com \`==\`.
- Gere segredos com \`secrets\`, nunca com \`random\`.`},{type:`callout`,tone:`warn`,text:`Base64 não é criptografia: é só uma forma de escrever bytes como texto, e qualquer um decodifica. "Senha em Base64" é senha em texto puro.`,title:`Mito comum`}]},{stage:`exemplo`,blocks:[{type:`code`,lang:`python`,code:`import hashlib, hmac, secrets

chave = secrets.token_bytes(32)                # segredo compartilhado entre servidor e parceiro
corpo = b'{"pedido": 42, "status": "pago"}'

etiqueta = hmac.new(chave, corpo, hashlib.sha256).hexdigest()
print("HMAC:", etiqueta[:16], "...")

# Quem recebe recalcula e compara em tempo constante
adulterado = b'{"pedido": 42, "status": "cancelado"}'
for msg in [corpo, adulterado]:
    ok = hmac.compare_digest(etiqueta, hmac.new(chave, msg, hashlib.sha256).hexdigest())
    print(msg.decode(), "->", "autêntico" if ok else "REJEITAR")`,runnable:!0}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`# RSA de brinquedo (números minúsculos: NUNCA use assim de verdade)
p, q = 61, 53
n = p * q                    # 3233, público
phi = (p - 1) * (q - 1)      # 3120, secreto: exige conhecer p e q
e = 17                       # expoente público
d = pow(e, -1, phi)          # 2753, inverso modular: a chave privada

mensagem = 65
cifrado = pow(mensagem, e, n)       # qualquer um cifra com (e, n)
print("cifrado:", cifrado)
print("decifrado:", pow(cifrado, d, n))   # só quem tem d decifra

assinatura = pow(mensagem, d, n)    # assinar = usar a chave privada
print("assinatura confere?", pow(assinatura, e, n) == mensagem)`,runnable:!0,caption:`A segurança real vem de n ter mais de 600 dígitos: fatorar n para achar p e q fica inviável.`},{type:`callout`,tone:`deep`,text:`O RSA "de livro" acima é inseguro mesmo com números grandes: é determinístico e maleável. Na prática se usa preenchimento (OAEP para cifrar, PSS para assinar) e, cada vez mais, curvas elípticas (X25519 para troca de chaves, Ed25519 para assinaturas), com chaves menores e operações mais rápidas.`,title:`Aprofundando`},{type:`callout`,tone:`english`,text:`Read carefully: *"encrypt-then-MAC"*, *"authenticated encryption with associated data (AEAD)"*, *"don't roll your own crypto"*, *"constant-time comparison"*, *"key rotation"*, *"forward secrecy"* (a leaked long-term key does not reveal past sessions).`,title:`English corner`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e11-cripto-0`,kind:`mcq`,prompt:`Uma empresa publica uma atualização de software e quer que **qualquer pessoa** consiga verificar que o arquivo veio dela e não foi alterado. Qual ferramenta usar?`,difficulty:`facil`,skills:[`seg-cripto`],hints:[`O verificador não pode ter um segredo (qualquer um verifica).`,`Precisa de autenticidade, não de sigilo.`],explanation:`**Assinatura digital**: a empresa assina com a chave privada; qualquer um verifica com a pública. HMAC exigiria compartilhar o segredo com todos, e aí qualquer um poderia forjar.`,options:[{text:`Publicar o SHA-256 do arquivo no mesmo site`,feedback:`Se o atacante troca o arquivo, troca o hash também. Hash sozinho não autentica.`},{text:`HMAC com uma chave secreta`,feedback:`Para verificar, todos precisariam da chave, e então poderiam forjar.`},{text:`Assinatura digital com a chave privada da empresa`,correct:!0,feedback:`Isso: verificável por qualquer um, forjável por ninguém.`},{text:`Cifrar o arquivo com AES`,feedback:`Cifrar dá sigilo, e o arquivo é público.`}]}},{type:`exercise`,exercise:{id:`e11-cripto-1`,kind:`code`,lang:`python`,prompt:"Um parceiro envia *webhooks* com o cabeçalho `X-Assinatura` = HMAC-SHA256 do corpo, em hexadecimal.\nEscreva `assinar(chave, corpo)` (ambos `bytes`, devolve a etiqueta em hex) e\n`verificar(chave, corpo, etiqueta)`, que devolve `True`/`False` usando **comparação em tempo constante**.",difficulty:`intermediario`,skills:[`seg-cripto`],hints:[`hmac.new(chave, corpo, hashlib.sha256).hexdigest()`,`hmac.compare_digest(a, b) compara sem vazar tempo.`],explanation:"Com `==`, a comparação para no primeiro caractere diferente; medindo o tempo de muitas tentativas, um atacante descobre a etiqueta caractere a caractere. `compare_digest` sempre leva o mesmo tempo.",starter:`import hashlib
import hmac

def assinar(chave, corpo):
    pass

def verificar(chave, corpo, etiqueta):
    pass
`,solution:`import hashlib
import hmac

def assinar(chave, corpo):
    return hmac.new(chave, corpo, hashlib.sha256).hexdigest()

def verificar(chave, corpo, etiqueta):
    return hmac.compare_digest(assinar(chave, corpo), etiqueta)`,tests:[{name:`valor conhecido`,code:`import hashlib, hmac
assert assinar(b"k", b"oi") == hmac.new(b"k", b"oi", hashlib.sha256).hexdigest()`},{name:`verifica e rejeita`,code:`e = assinar(b"segredo", b"corpo")
assert verificar(b"segredo", b"corpo", e)
assert not verificar(b"segredo", b"corpo!", e)
assert not verificar(b"outra", b"corpo", e)`},{name:`usa compare_digest`,code:`assert "compare_digest" in _source, "use hmac.compare_digest para comparar"`}]}},{type:`exercise`,exercise:{id:`e11-cripto-2`,kind:`mcq`,prompt:`No TLS, por que os dados da conexão são cifrados com uma cifra **simétrica**, e não com a chave pública do servidor?`,difficulty:`intermediario`,skills:[`seg-cripto`],hints:[`Compare o custo de uma operação RSA com o de cifrar um bloco com AES.`],explanation:`Cifras simétricas são ordens de grandeza mais rápidas (e têm suporte em hardware). A criptografia assimétrica é usada só no começo, para autenticar o servidor e combinar a chave simétrica.`,options:[{text:`Porque cifras simétricas são muito mais rápidas`,correct:!0,feedback:`Isso: o assimétrico só combina a chave.`},{text:`Porque a chave pública é secreta`,feedback:`A chave pública é, por definição, pública.`},{text:`Porque cifras assimétricas não funcionam na internet`,feedback:`Funcionam; são usadas no handshake.`},{text:`Por compatibilidade com HTTP/1.0`,feedback:`Não tem relação com a versão do HTTP.`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e11-cripto-desafio`,kind:`code`,lang:`python`,prompt:"Implemente RSA de brinquedo:\n\n- `gerar_chaves(p, q, e)` devolve `((e, n), (d, n))`, com `n = p*q` e `d` o inverso de `e` módulo `(p-1)(q-1)`;\n- `cifrar(m, publica)` e `decifrar(c, privada)`;\n- `assinar(m, privada)` e `verificar(m, assinatura, publica)` (devolve booleano).\n\nUse `pow(base, expoente, modulo)` e `pow(e, -1, phi)`.",difficulty:`desafio`,skills:[`seg-cripto`],hints:[`phi = (p - 1) * (q - 1)`,`Cifrar: m^e mod n. Decifrar: c^d mod n.`,`Assinar é "decifrar" a mensagem com a privada; verificar é "cifrar" a assinatura com a pública e comparar.`],explanation:`Funciona porque m^(e·d) ≡ m (mod n) quando e·d ≡ 1 (mod φ(n)) (teorema de Euler). Quem só tem (e, n) precisaria de φ(n), o que exige fatorar n.`,starter:`def gerar_chaves(p, q, e):
    pass

def cifrar(m, publica):
    pass

def decifrar(c, privada):
    pass

def assinar(m, privada):
    pass

def verificar(m, assinatura, publica):
    pass
`,solution:`def gerar_chaves(p, q, e):
    n = p * q
    phi = (p - 1) * (q - 1)
    d = pow(e, -1, phi)
    return (e, n), (d, n)

def cifrar(m, publica):
    e, n = publica
    return pow(m, e, n)

def decifrar(c, privada):
    d, n = privada
    return pow(c, d, n)

def assinar(m, privada):
    d, n = privada
    return pow(m, d, n)

def verificar(m, assinatura, publica):
    e, n = publica
    return pow(assinatura, e, n) == m`,tests:[{name:`chaves clássicas`,code:`assert gerar_chaves(61, 53, 17) == ((17, 3233), (2753, 3233))`},{name:`cifrar e decifrar`,code:`pub, priv = gerar_chaves(61, 53, 17)
assert cifrar(65, pub) == 2790
assert all(decifrar(cifrar(m, pub), priv) == m for m in range(2, 300))`},{name:`assinatura`,code:`pub, priv = gerar_chaves(61, 53, 17)
s = assinar(123, priv)
assert verificar(123, s, pub) and not verificar(124, s, pub)`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:`**Mini-projeto**: no seu projeto de API, receba um *webhook* assinado com HMAC (simule o parceiro com um script), rejeite assinaturas inválidas com 401 e evite *replay*: inclua um carimbo de tempo no conteúdo assinado e recuse mensagens com mais de 5 minutos.`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Hash: integridade acidental. HMAC: integridade + autenticidade com segredo compartilhado.
- Simétrica autenticada (AES-GCM) para dados; assimétrica para combinar chaves e assinar.
- TLS: certificado → troca de chaves ECDHE → cifra simétrica.
- Não invente cripto; não reutilize nonce; compare em tempo constante; segredos com \`secrets\`.`}]}],cards:[{id:`l11-criptografia#1`,front:`Que propriedade o HMAC garante que o hash simples não garante?`,back:`Autenticidade: só quem tem a chave secreta consegue gerar a etiqueta correta.`},{id:`l11-criptografia#2`,front:`Por que usar hmac.compare_digest em vez de ==?`,back:`Para comparar em tempo constante e evitar ataques de temporização.`},{id:`l11-criptografia#3`,front:`No RSA, o que é público e o que é privado?`,back:`Público: (e, n). Privado: d (e os primos p e q).`},{id:`l11-criptografia#4`,front:`Como o HTTPS combina criptografia assimétrica e simétrica?`,back:`Usa a assimétrica para autenticar o servidor e combinar uma chave; cifra os dados com a simétrica, que é mais rápida.`}]};export{e as default};
//# sourceMappingURL=l11-criptografia-B2wvNHeB.js.map