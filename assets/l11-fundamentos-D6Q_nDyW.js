var e={id:`l11-fundamentos`,moduleId:`m11-1`,title:`Fundamentos: autenticação, autorização e senhas`,titleEn:`Fundamentals: authentication, authorization and passwords`,summary:`CIA, autenticação × autorização, por que senhas são guardadas com hash lento e salt, e MFA.`,minutes:40,objectives:[`Explicar confidencialidade, integridade e disponibilidade`,`Diferenciar autenticação e autorização`,`Guardar senhas corretamente (hash lento + salt)`,`Aplicar menor privilégio e defesa em profundidade`],skills:[`seg-fundamentos`],terms:[{pt:`autenticação`,en:`authentication (authn)`,def:`Verificar quem você é.`},{pt:`autorização`,en:`authorization (authz)`,def:`Verificar o que você pode fazer.`},{pt:`função de hash`,en:`hash function`,def:`Função de mão única que gera um "resumo" de tamanho fixo.`},{pt:`sal`,en:`salt`,def:`Valor aleatório único por senha, misturado antes do hash.`},{pt:`autenticação multifator`,en:`multi-factor authentication (MFA)`,def:`Exigir dois ou mais fatores: algo que sabe, tem ou é.`},{pt:`menor privilégio`,en:`least privilege`,def:`Dar só as permissões estritamente necessárias.`},{pt:`ameaça`,en:`threat`,def:`Algo que pode explorar uma vulnerabilidade.`}],references:[`owasp-cheatsheets`,`nist-800-63b`,`owasp-top10`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Segurança protege três propriedades — a tríade **CIA**: **Confidencialidade** (só quem deve vê), **Integridade** (ninguém altera indevidamente) e **Disponibilidade** (funciona quando precisa). **{{Autenticação|authentication}}** responde "quem é você?"; **{{autorização|authorization}}** responde "você pode fazer isso?".`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`**Senhas nunca são guardadas em texto puro**, nem com criptografia reversível. Guarda-se um **hash**:

- Uma **função de hash criptográfica** (SHA-256) é de mão única: fácil calcular, inviável inverter.
- Mas SHA-256 é **rápido demais**: um atacante testa bilhões de senhas por segundo. Para senhas usa-se um hash **lento e configurável**: **Argon2id**, **scrypt**, **bcrypt** ou **PBKDF2**.
- **Salt**: um valor aleatório por usuário, guardado junto do hash. Sem ele, senhas iguais têm hashes iguais e *rainbow tables* (tabelas pré-calculadas) funcionam.
- Na verificação, compare com **tempo constante** (\`hmac.compare_digest\`) para não vazar informação pelo tempo de resposta.

**Princípios**: menor privilégio, defesa em profundidade (várias camadas), falhar de forma segura (*fail closed*), não confiar em entrada do cliente, segredos fora do código.

**Recomendações atuais de senha** (NIST SP 800-63B): priorize **comprimento**; não force trocas periódicas sem motivo; bloqueie senhas vazadas/comuns; ofereça **MFA**.`}]},{stage:`exemplo`,blocks:[{type:`viz`,viz:`hashing`,caption:`Digite uma senha e veja: SHA-256 muda completamente com uma letra (efeito avalanche); com salt, senhas iguais geram hashes diferentes.`}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`import hashlib, hmac, os

def hash_senha(senha: str, salt: bytes | None = None) -> tuple[bytes, bytes]:
    salt = salt or os.urandom(16)
    h = hashlib.scrypt(senha.encode(), salt=salt, n=2**14, r=8, p=1)
    return salt, h

def verificar(senha: str, salt: bytes, esperado: bytes) -> bool:
    _, h = hash_senha(senha, salt)
    return hmac.compare_digest(h, esperado)   # tempo constante

salt, h = hash_senha("correct horse battery staple")
print(salt.hex()[:16], h.hex()[:16])
print(verificar("correct horse battery staple", salt, h), verificar("senha123", salt, h))`,runnable:!0,caption:`A API desta plataforma guarda senhas exatamente assim (scrypt, da biblioteca padrão do Node).`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e11-seg-1`,kind:`mcq`,prompt:`Qual a forma correta de armazenar senhas de usuários?`,difficulty:`facil`,skills:[`seg-fundamentos`],hints:[`Precisa ser de mão única, lenta e única por usuário.`],explanation:`Hash lento (Argon2id/scrypt/bcrypt) com salt aleatório por usuário. Criptografia reversível significa que quem tiver a chave lê todas as senhas.`,options:[{text:`Texto puro, com o banco protegido por senha`,feedback:`Um vazamento expõe todas as senhas imediatamente.`},{text:`Criptografadas com AES`,feedback:`Reversível: se a chave vazar, todas as senhas vazam.`},{text:`SHA-256 sem salt`,feedback:`Rápido demais e vulnerável a rainbow tables.`},{text:`Argon2id/scrypt/bcrypt com salt único por usuário`,correct:!0,feedback:`Isso.`}]}},{type:`exercise`,exercise:{id:`e11-seg-2`,kind:`mcq`,prompt:"Um usuário comum acessa `/admin/relatorios` e consegue ver os dados. Que falha é essa?",difficulty:`intermediario`,skills:[`seg-fundamentos`],hints:[`Ele estava logado. O problema é saber quem é, ou o que pode fazer?`],explanation:`Falha de autorização (*Broken Access Control*), a categoria nº 1 do OWASP Top 10. Toda rota precisa verificar permissões **no servidor**.`,options:[{text:`Falha de autenticação`,feedback:`O sistema sabia quem ele era.`},{text:`Falha de autorização (controle de acesso)`,correct:!0,feedback:`Isso.`},{text:`Falha de disponibilidade`,feedback:`O sistema estava disponível até demais.`},{text:`Não é falha: ele estava logado`,feedback:`Estar logado não significa poder tudo.`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e11-seg-desafio`,kind:`code`,lang:`python`,prompt:'Implemente `registrar(usuarios, nome, senha)` e `login(usuarios, nome, senha)`. `usuarios` é um dict.\nGuarde **salt e hash** (use `hashlib.pbkdf2_hmac("sha256", ..., iteracoes)` com 100 000 iterações e salt de\n`os.urandom(16)`), nunca a senha. `login` devolve True/False e compara em tempo constante.\nSenhas com menos de 12 caracteres lançam `ValueError`.',difficulty:`desafio`,skills:[`seg-fundamentos`],hints:['Guarde `usuarios[nome] = {"salt": salt, "hash": h}`.',"Em `login`, recalcule com o salt guardado e use `hmac.compare_digest`.",`Usuário inexistente → False (sem lançar erro).`],explanation:`Os testes verificam que a senha não aparece em lugar nenhum do dict, que hashes de senhas iguais diferem (salt) e que o login funciona. É o núcleo de qualquer sistema de contas.`,starter:`def registrar(usuarios, nome, senha):
    usuarios[nome] = senha

def login(usuarios, nome, senha):
    return usuarios.get(nome) == senha`,solution:`import hashlib, hmac, os

ITERACOES = 100_000

def _hash(senha, salt):
    return hashlib.pbkdf2_hmac("sha256", senha.encode(), salt, ITERACOES)

def registrar(usuarios, nome, senha):
    if len(senha) < 12:
        raise ValueError("senha muito curta")
    salt = os.urandom(16)
    usuarios[nome] = {"salt": salt, "hash": _hash(senha, salt)}

def login(usuarios, nome, senha):
    u = usuarios.get(nome)
    if u is None:
        return False
    return hmac.compare_digest(_hash(senha, u["salt"]), u["hash"])`,tests:[{name:`login funciona`,code:`u = {}
registrar(u, "ana", "frase longa e segura")
assert login(u, "ana", "frase longa e segura") and not login(u, "ana", "errada errada!") and not login(u, "bia", "x")`},{name:`senha não é armazenada`,code:`u = {}
registrar(u, "ana", "frase longa e segura")
assert "frase longa e segura" not in repr(u) and b"frase longa e segura" not in repr(u).encode()`},{name:`salt: senhas iguais, hashes diferentes`,code:`u = {}
registrar(u, "a", "mesma senha longa")
registrar(u, "b", "mesma senha longa")
assert u["a"]["hash"] != u["b"]["hash"]`},{name:`senha curta`,code:`try:
    registrar({}, "x", "curta")
    assert False
except ValueError:
    pass`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:"**API REST (parte 3)**: adicione cadastro e login à sua API, com hash de senha (Argon2id ou bcrypt via biblioteca), sessão em cookie `HttpOnly; Secure; SameSite=Lax` e limite de tentativas de login."},{type:`project`,projectId:`p5-api`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- CIA: confidencialidade, integridade, disponibilidade.
- Autenticação (quem) × autorização (o quê).
- Senhas: hash lento + salt + comparação em tempo constante.
- Menor privilégio, defesa em profundidade, MFA.`}]}],cards:[{id:`l11-fundamentos#1`,front:`Por que não usar SHA-256 puro para senhas?`,back:`Porque é rápido demais (permite bilhões de tentativas por segundo) e sem salt é vulnerável a rainbow tables.`},{id:`l11-fundamentos#2`,front:`Para que serve o salt?`,back:`Para que senhas iguais tenham hashes diferentes e tabelas pré-calculadas não funcionem.`},{id:`l11-fundamentos#3`,front:`Autenticação × autorização?`,back:`Autenticação verifica a identidade; autorização verifica as permissões.`}]};export{e as default};
//# sourceMappingURL=l11-fundamentos-D6Q_nDyW.js.map