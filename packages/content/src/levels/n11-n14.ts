import type { Level } from '../types.ts';
import { code, dedent, deep, info, lesson, md, py, t, warn } from '../helpers.ts';
import { cripto, deploy, discreta, algebra } from './aprofundamento-b.ts';

/* ========================= Nível 11 — Segurança ========================= */

const fundSeg = lesson({
  id: 'l11-fundamentos',
  moduleId: 'm11-1',
  title: 'Fundamentos: autenticação, autorização e senhas',
  titleEn: 'Fundamentals: authentication, authorization and passwords',
  summary: 'CIA, autenticação × autorização, por que senhas são guardadas com hash lento e salt, e MFA.',
  minutes: 40,
  objectives: ['Explicar confidencialidade, integridade e disponibilidade', 'Diferenciar autenticação e autorização', 'Guardar senhas corretamente (hash lento + salt)', 'Aplicar menor privilégio e defesa em profundidade'],
  skills: ['seg-fundamentos'],
  terms: [
    t('autenticação', 'authentication (authn)', 'Verificar quem você é.'),
    t('autorização', 'authorization (authz)', 'Verificar o que você pode fazer.'),
    t('função de hash', 'hash function', 'Função de mão única que gera um "resumo" de tamanho fixo.'),
    t('sal', 'salt', 'Valor aleatório único por senha, misturado antes do hash.'),
    t('autenticação multifator', 'multi-factor authentication (MFA)', 'Exigir dois ou mais fatores: algo que sabe, tem ou é.'),
    t('menor privilégio', 'least privilege', 'Dar só as permissões estritamente necessárias.'),
    t('ameaça', 'threat', 'Algo que pode explorar uma vulnerabilidade.'),
  ],
  stages: {
    conceito: [md('Segurança protege três propriedades — a tríade **CIA**: **Confidencialidade** (só quem deve vê), **Integridade** (ninguém altera indevidamente) e **Disponibilidade** (funciona quando precisa). **{{Autenticação|authentication}}** responde "quem é você?"; **{{autorização|authorization}}** responde "você pode fazer isso?".')],
    explicacao: [
      md(`
        **Senhas nunca são guardadas em texto puro**, nem com criptografia reversível. Guarda-se um **hash**:

        - Uma **função de hash criptográfica** (SHA-256) é de mão única: fácil calcular, inviável inverter.
        - Mas SHA-256 é **rápido demais**: um atacante testa bilhões de senhas por segundo. Para senhas usa-se um hash **lento e configurável**: **Argon2id**, **scrypt**, **bcrypt** ou **PBKDF2**.
        - **Salt**: um valor aleatório por usuário, guardado junto do hash. Sem ele, senhas iguais têm hashes iguais e *rainbow tables* (tabelas pré-calculadas) funcionam.
        - Na verificação, compare com **tempo constante** (\`hmac.compare_digest\`) para não vazar informação pelo tempo de resposta.

        **Princípios**: menor privilégio, defesa em profundidade (várias camadas), falhar de forma segura (*fail closed*), não confiar em entrada do cliente, segredos fora do código.

        **Recomendações atuais de senha** (NIST SP 800-63B): priorize **comprimento**; não force trocas periódicas sem motivo; bloqueie senhas vazadas/comuns; ofereça **MFA**.
      `),
    ],
    exemplo: [{ type: 'viz', viz: 'hashing', caption: 'Digite uma senha e veja: SHA-256 muda completamente com uma letra (efeito avalanche); com salt, senhas iguais geram hashes diferentes.' }],
    codigo: [py(`
      import hashlib, hmac, os

      def hash_senha(senha: str, salt: bytes | None = None) -> tuple[bytes, bytes]:
          salt = salt or os.urandom(16)
          h = hashlib.scrypt(senha.encode(), salt=salt, n=2**14, r=8, p=1)
          return salt, h

      def verificar(senha: str, salt: bytes, esperado: bytes) -> bool:
          _, h = hash_senha(senha, salt)
          return hmac.compare_digest(h, esperado)   # tempo constante

      salt, h = hash_senha("correct horse battery staple")
      print(salt.hex()[:16], h.hex()[:16])
      print(verificar("correct horse battery staple", salt, h), verificar("senha123", salt, h))
    `, { caption: 'A API desta plataforma guarda senhas exatamente assim (scrypt, da biblioteca padrão do Node).' })],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e11-seg-1',
          kind: 'mcq',
          prompt: 'Qual a forma correta de armazenar senhas de usuários?',
          difficulty: 'facil',
          skills: ['seg-fundamentos'],
          hints: ['Precisa ser de mão única, lenta e única por usuário.'],
          explanation: 'Hash lento (Argon2id/scrypt/bcrypt) com salt aleatório por usuário. Criptografia reversível significa que quem tiver a chave lê todas as senhas.',
          options: [
            { text: 'Texto puro, com o banco protegido por senha', feedback: 'Um vazamento expõe todas as senhas imediatamente.' },
            { text: 'Criptografadas com AES', feedback: 'Reversível: se a chave vazar, todas as senhas vazam.' },
            { text: 'SHA-256 sem salt', feedback: 'Rápido demais e vulnerável a rainbow tables.' },
            { text: 'Argon2id/scrypt/bcrypt com salt único por usuário', correct: true, feedback: 'Isso.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e11-seg-2',
          kind: 'mcq',
          prompt: 'Um usuário comum acessa `/admin/relatorios` e consegue ver os dados. Que falha é essa?',
          difficulty: 'intermediario',
          skills: ['seg-fundamentos'],
          hints: ['Ele estava logado. O problema é saber quem é, ou o que pode fazer?'],
          explanation: 'Falha de autorização (*Broken Access Control*), a categoria nº 1 do OWASP Top 10. Toda rota precisa verificar permissões **no servidor**.',
          options: [
            { text: 'Falha de autenticação', feedback: 'O sistema sabia quem ele era.' },
            { text: 'Falha de autorização (controle de acesso)', correct: true, feedback: 'Isso.' },
            { text: 'Falha de disponibilidade', feedback: 'O sistema estava disponível até demais.' },
            { text: 'Não é falha: ele estava logado', feedback: 'Estar logado não significa poder tudo.' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e11-seg-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Implemente \`registrar(usuarios, nome, senha)\` e \`login(usuarios, nome, senha)\`. \`usuarios\` é um dict.
            Guarde **salt e hash** (use \`hashlib.pbkdf2_hmac("sha256", ..., iteracoes)\` com 100 000 iterações e salt de
            \`os.urandom(16)\`), nunca a senha. \`login\` devolve True/False e compara em tempo constante.
            Senhas com menos de 12 caracteres lançam \`ValueError\`.
          `),
          difficulty: 'desafio',
          skills: ['seg-fundamentos'],
          hints: ['Guarde `usuarios[nome] = {"salt": salt, "hash": h}`.', 'Em `login`, recalcule com o salt guardado e use `hmac.compare_digest`.', 'Usuário inexistente → False (sem lançar erro).'],
          explanation: 'Os testes verificam que a senha não aparece em lugar nenhum do dict, que hashes de senhas iguais diferem (salt) e que o login funciona. É o núcleo de qualquer sistema de contas.',
          starter: dedent(`
            def registrar(usuarios, nome, senha):
                usuarios[nome] = senha

            def login(usuarios, nome, senha):
                return usuarios.get(nome) == senha
          `),
          solution: dedent(`
            import hashlib, hmac, os

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
                return hmac.compare_digest(_hash(senha, u["salt"]), u["hash"])
          `),
          tests: [
            { name: 'login funciona', code: 'u = {}\nregistrar(u, "ana", "frase longa e segura")\nassert login(u, "ana", "frase longa e segura") and not login(u, "ana", "errada errada!") and not login(u, "bia", "x")' },
            { name: 'senha não é armazenada', code: 'u = {}\nregistrar(u, "ana", "frase longa e segura")\nassert "frase longa e segura" not in repr(u) and b"frase longa e segura" not in repr(u).encode()' },
            { name: 'salt: senhas iguais, hashes diferentes', code: 'u = {}\nregistrar(u, "a", "mesma senha longa")\nregistrar(u, "b", "mesma senha longa")\nassert u["a"]["hash"] != u["b"]["hash"]' },
            { name: 'senha curta', code: 'try:\n    registrar({}, "x", "curta")\n    assert False\nexcept ValueError:\n    pass' },
          ],
        },
      },
    ],
    projeto: [md('**API REST (parte 3)**: adicione cadastro e login à sua API, com hash de senha (Argon2id ou bcrypt via biblioteca), sessão em cookie `HttpOnly; Secure; SameSite=Lax` e limite de tentativas de login.'), { type: 'project', projectId: 'p5-api' }],
    revisao: [md('- CIA: confidencialidade, integridade, disponibilidade.\n- Autenticação (quem) × autorização (o quê).\n- Senhas: hash lento + salt + comparação em tempo constante.\n- Menor privilégio, defesa em profundidade, MFA.')],
  },
  review: [
    ['Por que não usar SHA-256 puro para senhas?', 'Porque é rápido demais (permite bilhões de tentativas por segundo) e sem salt é vulnerável a rainbow tables.'],
    ['Para que serve o salt?', 'Para que senhas iguais tenham hashes diferentes e tabelas pré-calculadas não funcionem.'],
    ['Autenticação × autorização?', 'Autenticação verifica a identidade; autorização verifica as permissões.'],
  ],
  references: ['owasp-cheatsheets', 'nist-800-63b', 'owasp-top10'],
});

const owasp = lesson({
  id: 'l11-owasp',
  moduleId: 'm11-2',
  title: 'Ataques comuns e o OWASP Top 10',
  titleEn: 'Common attacks and the OWASP Top 10',
  summary: 'SQL injection, XSS, CSRF, controle de acesso e configurações inseguras — e como se defender.',
  minutes: 45,
  objectives: ['Explicar e prevenir SQL injection', 'Explicar e prevenir XSS', 'Entender CSRF e a proteção com SameSite e tokens', 'Conhecer as categorias do OWASP Top 10'],
  skills: ['seg-web'],
  terms: [
    t('injeção de SQL', 'SQL injection', 'Entrada do usuário interpretada como parte de um comando SQL.'),
    t('script entre sites', 'cross-site scripting (XSS)', 'Injetar JavaScript que roda no navegador de outra pessoa.'),
    t('falsificação de requisição entre sites', 'cross-site request forgery (CSRF)', 'Site malicioso faz o navegador da vítima enviar uma ação autenticada.'),
    t('vulnerabilidade', 'vulnerability', 'Falha que pode ser explorada.'),
    t('sanitizar / escapar', 'sanitize / escape', 'Tratar dados para que não sejam interpretados como código.'),
    t('política de segurança de conteúdo', 'Content Security Policy (CSP)', 'Cabeçalho que restringe quais scripts e recursos a página pode carregar.'),
  ],
  stages: {
    conceito: [md('O **OWASP Top 10** é a lista de referência dos riscos mais críticos em aplicações web, atualizada periodicamente pela comunidade (edição atual: 2025). A raiz de quase todos os ataques é a mesma: **dados tratados como código** ou **confiança onde não deveria haver**.')],
    explicacao: [
      md(`
        **SQL injection**: \`"SELECT * FROM usuarios WHERE nome = '" + nome + "'"\` com \`nome = "' OR '1'='1"\` vira uma consulta que devolve todos. **Defesa**: consultas **parametrizadas** — sempre.

        **XSS**: um comentário \`<script>roubar(document.cookie)</script>\` inserido com \`innerHTML\` executa no navegador de quem lê. **Defesa**: escapar na saída (frameworks fazem por padrão; \`textContent\`), CSP, cookies \`HttpOnly\`.

        **CSRF**: você está logado no banco; um site malicioso envia um formulário oculto para \`banco.com/transferir\`, e o navegador anexa seu cookie. **Defesa**: cookies \`SameSite=Lax/Strict\`, tokens anti-CSRF, verificar \`Origin\`.

        **Broken Access Control** (nº 1): verificar permissões **no servidor**, em toda rota — esconder o botão não é proteção.

        Outras categorias do Top 10 incluem: falhas criptográficas, design inseguro, configuração incorreta (debug ligado em produção, CORS \`*\`), componentes vulneráveis (dependências desatualizadas — **cadeia de suprimentos**), falhas de autenticação, falhas de integridade, falta de logging/monitoramento e tratamento inadequado de erros.
      `),
      warn('Teste ataques **somente** em sistemas seus ou com autorização explícita por escrito. Atacar sistemas de terceiros é crime (no Brasil, Lei 12.737/2012).', 'Ética e lei'),
    ],
    exemplo: [py(`
      import sqlite3
      con = sqlite3.connect(":memory:")
      con.executescript("""
      CREATE TABLE usuarios (nome TEXT, senha_hash TEXT, admin INTEGER);
      INSERT INTO usuarios VALUES ('ana', 'x1', 0), ('root', 'x2', 1);
      """)

      entrada = "' OR '1'='1"

      # VULNERÁVEL: concatenação
      sql = "SELECT nome FROM usuarios WHERE nome = '" + entrada + "'"
      print("consulta montada:", sql)
      print("vulnerável devolve:", con.execute(sql).fetchall())

      # SEGURO: parâmetro
      print("parametrizada devolve:", con.execute("SELECT nome FROM usuarios WHERE nome = ?", (entrada,)).fetchall())
    `)],
    codigo: [code('text', `
      Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none'
      Set-Cookie: sessao=...; HttpOnly; Secure; SameSite=Lax; Path=/
      X-Content-Type-Options: nosniff
      Referrer-Policy: strict-origin-when-cross-origin
    `, 'Cabeçalhos de segurança que a API desta plataforma envia.')],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e11-web-0',
          kind: 'mcq',
          prompt: "Qual destas é a defesa correta contra **SQL injection**?",
          difficulty: 'facil',
          skills: ["seg-web"],
          hints: ["O problema é dado do usuário virando código SQL."],
          explanation: "Consultas parametrizadas enviam o SQL e os dados separados: o banco nunca interpreta o dado como comando. Filtrar caracteres é frágil e fácil de contornar.",
          options: [
            { text: "Usar consultas parametrizadas", correct: true, feedback: "Isso: o dado nunca vira código." },
            { text: "Remover aspas da entrada", feedback: "Filtros por lista negra são contornáveis (codificações, outros contextos)." },
            { text: "Esconder as mensagens de erro", feedback: "Ajuda a não vazar detalhes, mas não impede a injeção." },
            { text: "Usar HTTPS", feedback: "HTTPS protege o transporte, não a consulta." },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e11-owasp-1',
          kind: 'fix',
          lang: 'python',
          prompt: 'A função `buscar_por_email` é vulnerável a SQL injection. Corrija usando parâmetros. Os testes tentam um ataque.',
          difficulty: 'intermediario',
          skills: ['seg-web', 'bd-sql'],
          hints: ['Nunca monte SQL com f-string ou +.', 'Use `?` no lugar do valor e passe uma tupla: `con.execute(sql, (email,))`.'],
          explanation: 'Com parâmetros, o banco trata a entrada sempre como **dado**, nunca como parte do comando.',
          starter: dedent(`
            import sqlite3

            def buscar_por_email(con, email):
                return con.execute(f"SELECT nome FROM usuarios WHERE email = '{email}'").fetchall()
          `),
          solution: dedent(`
            import sqlite3

            def buscar_por_email(con, email):
                return con.execute("SELECT nome FROM usuarios WHERE email = ?", (email,)).fetchall()
          `),
          tests: [
            { name: 'busca normal', code: 'import sqlite3\ncon = sqlite3.connect(":memory:")\ncon.executescript("CREATE TABLE usuarios (nome TEXT, email TEXT); INSERT INTO usuarios VALUES (\'Ana\', \'ana@ex.com\'), (\'Bia\', \'bia@ex.com\');")\nassert buscar_por_email(con, "ana@ex.com") == [("Ana",)]' },
            { name: 'ataque não funciona', code: 'import sqlite3\ncon = sqlite3.connect(":memory:")\ncon.executescript("CREATE TABLE usuarios (nome TEXT, email TEXT); INSERT INTO usuarios VALUES (\'Ana\', \'ana@ex.com\'), (\'Bia\', \'bia@ex.com\');")\nassert buscar_por_email(con, "x\' OR \'1\'=\'1") == []' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e11-owasp-2',
          kind: 'mcq',
          prompt: 'Qual cabeçalho de cookie reduz drasticamente o risco de **CSRF**?',
          difficulty: 'intermediario',
          skills: ['seg-web'],
          hints: ['Qual atributo controla se o cookie é enviado em requisições vindas de outros sites?'],
          explanation: '`SameSite=Lax` (ou Strict) impede que o navegador envie o cookie em requisições POST originadas de outros sites. `HttpOnly` protege contra roubo via JavaScript (XSS), não contra CSRF.',
          options: [
            { text: 'HttpOnly', feedback: 'Protege o cookie de ser lido por JavaScript (ajuda contra XSS), mas não impede seu envio.' },
            { text: 'SameSite=Lax', correct: true, feedback: 'Isso.' },
            { text: 'Max-Age=3600', feedback: 'Só limita a validade.' },
            { text: 'Path=/', feedback: 'Só define o escopo de caminho.' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e11-owasp-desafio',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `escapar_html(s)` que substitui `&`, `<`, `>`, `"` e `\'` pelas entidades `&amp;`, `&lt;`, `&gt;`, `&quot;` e `&#x27;`, **sem** usar o módulo `html`. Atenção à ordem das substituições.',
          difficulty: 'avancado',
          skills: ['seg-web'],
          hints: ['Se você trocar `<` por `&lt;` antes de trocar `&`, o que acontece com o `&` de `&lt;`?', 'Troque `&` primeiro — ou percorra caractere a caractere com um dict.'],
          explanation: 'Substituir `&` por último corromperia as entidades já criadas (`&lt;` viraria `&amp;lt;`). Percorrer caractere a caractere evita o problema por construção.',
          starter: 'def escapar_html(s):\n    return s.replace("<", "&lt;").replace(">", "&gt;").replace("&", "&amp;")\n',
          solution: dedent(`
            ENTIDADES = {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;"}

            def escapar_html(s):
                return "".join(ENTIDADES.get(c, c) for c in s)
          `),
          tests: [
            { name: 'script', code: 'assert escapar_html("<script>alert(\'x\')</script>") == "&lt;script&gt;alert(&#x27;x&#x27;)&lt;/script&gt;"' },
            { name: 'e comercial não duplica', code: 'assert escapar_html("a & b < c") == "a &amp; b &lt; c"' },
            { name: 'aspas', code: 'assert escapar_html(\'"oi"\') == "&quot;oi&quot;"' },
          ],
        },
      },
    ],
    projeto: [md('**Auditoria da sua API**: revise o Projeto 5 contra o OWASP Top 10 e o OWASP API Security Top 10. Para cada item, escreva: "aplicável? como está protegido? como testei?". Adicione testes automatizados para SQL injection e controle de acesso.'), { type: 'project', projectId: 'p5-api' }],
    revisao: [md('- SQL injection → consultas parametrizadas.\n- XSS → escapar na saída, textContent, CSP, HttpOnly.\n- CSRF → SameSite, tokens, verificar Origin.\n- Controle de acesso no servidor, sempre.')],
  },
  review: [
    ['Qual a defesa principal contra SQL injection?', 'Consultas parametrizadas (prepared statements).'],
    ['O que é XSS?', 'Injeção de scripts que executam no navegador de outros usuários.'],
    ['Qual é a categoria nº 1 do OWASP Top 10?', 'Broken Access Control (falhas de controle de acesso).'],
  ],
  references: ['owasp-top10', 'owasp-cheatsheets', 'owasp-api', 'mdn'],
});

/* ========================= Nível 12 — Cloud e DevOps ========================= */

const linux = lesson({
  id: 'l12-linux-shell',
  moduleId: 'm12-1',
  title: 'Linux e o shell de verdade',
  titleEn: 'Linux and the real shell',
  summary: 'Permissões, processos, pipes, redirecionamento, variáveis de ambiente e scripts.',
  minutes: 40,
  objectives: ['Ler e alterar permissões', 'Combinar comandos com pipes e redirecionamento', 'Usar grep, find, sort, uniq, wc, head, tail', 'Escrever um script bash simples'],
  skills: ['devops-linux'],
  terms: [
    t('tubo', 'pipe', 'Liga a saída de um comando à entrada de outro: |'),
    t('redirecionamento', 'redirection', 'Enviar saída/entrada para arquivos: > >> <'),
    t('permissão', 'permission', 'Quem pode ler (r), escrever (w) e executar (x).', 'Permission denied'),
    t('variável de ambiente', 'environment variable', 'Configuração passada aos processos: PATH, HOME.'),
    t('superusuário', 'superuser / root', 'Usuário com todos os privilégios; sudo executa como ele.'),
  ],
  stages: {
    conceito: [md('Servidores na nuvem rodam, quase sempre, **Linux**. A filosofia Unix: programas pequenos que fazem **uma coisa bem** e se combinam por **pipes**. Dominar o shell multiplica sua produtividade e é pré-requisito para Docker, CI e deploy.')],
    explicacao: [
      code('bash', `
        ls -l script.sh            # -rwxr-x--- 1 ana dev ...
        chmod u+x script.sh        # dá permissão de execução ao dono
        ps aux | grep python       # processos com "python"
        cat acesso.log | grep " 500 " | wc -l           # quantos erros 500?
        cut -d' ' -f1 acesso.log | sort | uniq -c | sort -rn | head -5   # 5 IPs que mais acessam
        find . -name "*.py" -newer main.py              # .py modificados depois de main.py
        echo "API_KEY=..." >> .env                      # >> acrescenta, > sobrescreve
        export PORT=8080 && echo $PORT
      `),
      md(`
        **Permissões** (\`rwxr-x---\`): três grupos — **dono**, **grupo**, **outros** — cada um com ler (r=4), escrever (w=2), executar (x=1). \`chmod 750\` = rwx para o dono, r-x para o grupo, nada para outros.

        **Streams**: todo processo tem **stdin** (0), **stdout** (1) e **stderr** (2). \`comando 2> erros.log\` separa os erros. **Código de saída**: 0 = sucesso; \`$?\` mostra o último.
      `),
      warn('`sudo` e `rm -rf` juntos merecem pausa. Leia o comando duas vezes. Nunca rode scripts copiados da internet sem entender o que fazem (`curl ... | sudo bash` é um risco).'),
    ],
    exemplo: [{ type: 'viz', viz: 'terminal', caption: 'O terminal simulado também aceita echo, cat e pipes simples. Experimente: echo oi > a.txt, cat a.txt, ls | wc' }],
    codigo: [py(`
      # O "cut | sort | uniq -c | sort -rn | head" em Python, para comparar:
      from collections import Counter
      log = """10.0.0.1 GET /
      10.0.0.2 GET /login
      10.0.0.1 GET /api
      10.0.0.3 GET /
      10.0.0.1 POST /api"""
      ips = [linha.split()[0] for linha in log.splitlines()]
      for ip, n in Counter(ips).most_common(2):
          print(n, ip)
    `)],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e12-linux-0',
          kind: 'mcq',
          prompt: "Qual comando mostra **em qual pasta** você está no terminal?",
          difficulty: 'facil',
          skills: ["devops-linux"],
          hints: ["É a sigla de \"print working directory\"."],
          explanation: "`pwd` imprime o diretório atual. `ls` lista o conteúdo, `cd` muda de pasta e `mkdir` cria uma.",
          options: [
            { text: "pwd", correct: true, feedback: "Isso: print working directory." },
            { text: "ls", feedback: "ls lista o conteúdo da pasta." },
            { text: "cd", feedback: "cd muda de pasta." },
            { text: "mkdir", feedback: "mkdir cria uma pasta." },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e12-linux-1',
          kind: 'mcq',
          prompt: 'O que `chmod 640 config.yml` define?',
          difficulty: 'intermediario',
          skills: ['devops-linux'],
          hints: ['6 = 4 + 2; 4 = 4; 0 = nada. Ordem: dono, grupo, outros.'],
          explanation: 'Dono: rw- (6); grupo: r-- (4); outros: --- (0). Um bom padrão para arquivos de configuração com segredos.',
          options: [
            { text: 'dono rw, grupo r, outros nada', correct: true, feedback: 'Isso: rw-r-----.' },
            { text: 'dono rwx, grupo rw, outros nada', feedback: '6 é rw (sem x).' },
            { text: 'todos podem ler', feedback: 'Outros = 0.' },
            { text: 'dono r, grupo rw, outros nada', feedback: 'A ordem é dono, grupo, outros.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e12-linux-2',
          kind: 'parsons',
          lang: 'bash',
          prompt: 'Monte o pipeline que mostra as **3 palavras mais frequentes** em `texto.txt` (uma palavra por linha no arquivo).',
          difficulty: 'intermediario',
          skills: ['devops-linux'],
          hints: ['uniq -c só junta linhas iguais **adjacentes**: ordene antes.', 'Depois de contar, ordene numericamente em ordem decrescente.'],
          explanation: 'cat → sort → uniq -c → sort -rn → head -3. O primeiro sort é necessário porque uniq só compara linhas vizinhas.',
          lines: ['cat texto.txt', '  | sort', '  | uniq -c', '  | sort -rn', '  | head -3'],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e12-linux-desafio',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `permissoes(octal)` que converte uma string como `"754"` na notação simbólica `"rwxr-xr--"`.',
          difficulty: 'intermediario',
          skills: ['devops-linux', 'comp-binario'],
          hints: ['Cada dígito é um número de 3 bits: r=4, w=2, x=1.', 'Para cada dígito d: "r" if d & 4 else "-", e assim por diante.'],
          explanation: 'As permissões Unix são literalmente 3 bits por grupo — de novo o binário do Nível 0 aparecendo num lugar prático.',
          starter: 'def permissoes(octal):\n    pass\n',
          solution: dedent(`
            def permissoes(octal):
                out = ""
                for d in octal:
                    n = int(d)
                    out += ("r" if n & 4 else "-") + ("w" if n & 2 else "-") + ("x" if n & 1 else "-")
                return out
          `),
          tests: [
            { name: '754', code: 'assert permissoes("754") == "rwxr-xr--"' },
            { name: '600 e 777', code: 'assert permissoes("600") == "rw-------" and permissoes("777") == "rwxrwxrwx"' },
          ],
        },
      },
    ],
    projeto: [md('**Script de backup**: escreva `backup.sh` que compacta uma pasta com a data no nome (`tar -czf backup-$(date +%F).tar.gz pasta/`), mantém só os 7 backups mais recentes e registra o resultado num log. Agende com `cron`.')],
    revisao: [md('- Permissões rwx para dono/grupo/outros (octal).\n- Pipes e redirecionamento: | > >> 2>.\n- grep, find, sort, uniq, wc, head, tail, cut.\n- Código de saída 0 = sucesso.')],
  },
  review: [
    ['O que significa chmod 755?', 'Dono rwx; grupo e outros r-x.'],
    ['Por que ordenar antes de `uniq -c`?', 'Porque uniq só agrupa linhas iguais adjacentes.'],
    ['Diferença entre > e >>?', '> sobrescreve o arquivo; >> acrescenta ao final.'],
  ],
  references: ['missing-semester', 'linux-command-line', 'linux-man'],
});

const docker = lesson({
  id: 'l12-docker',
  moduleId: 'm12-2',
  title: 'Containers e Docker',
  titleEn: 'Containers and Docker',
  summary: 'Imagens, containers, Dockerfile, camadas, volumes e por que "funciona na minha máquina" deixou de ser desculpa.',
  minutes: 40,
  objectives: ['Diferenciar container de máquina virtual', 'Escrever um Dockerfile eficiente', 'Usar volumes, portas e variáveis de ambiente', 'Orquestrar serviços com Docker Compose'],
  skills: ['devops-containers'],
  terms: [
    t('contêiner', 'container', 'Processo isolado com seu próprio sistema de arquivos, rede e limites.'),
    t('imagem', 'image', 'Modelo imutável a partir do qual containers são criados.'),
    t('camada', 'layer', 'Cada instrução do Dockerfile gera uma camada cacheável.'),
    t('volume', 'volume', 'Armazenamento que persiste além do ciclo de vida do container.'),
    t('registro', 'registry', 'Repositório de imagens (Docker Hub, GHCR).'),
    t('orquestração', 'orchestration', 'Gerenciar muitos containers: Compose, Kubernetes.'),
  ],
  stages: {
    conceito: [md('Um **{{container|container}}** empacota o programa **com tudo de que precisa** (bibliotecas, runtime, configuração) e roda isolado, usando recursos do **kernel do host** (namespaces e cgroups do Linux). Diferente de uma máquina virtual, não há um sistema operacional inteiro por instância — por isso containers sobem em segundos.')],
    explicacao: [
      code('text', `
        # Dockerfile — API Python
        FROM python:3.13-slim
        WORKDIR /app
        COPY requirements.txt .
        RUN pip install --no-cache-dir -r requirements.txt   # camada cacheada se requirements não mudar
        COPY . .
        RUN useradd --create-home app
        USER app                                             # não rode como root
        EXPOSE 8000
        CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
      `, 'A ordem importa: copie primeiro o que muda pouco (dependências) para aproveitar o cache de camadas.'),
      code('bash', `
        docker build -t minha-api .
        docker run -p 8000:8000 -e DATABASE_URL=... minha-api
        docker ps
        docker logs -f <id>
      `),
      md(`
        **Docker Compose** descreve vários serviços (API + banco + cache) num \`compose.yaml\` e sobe tudo com \`docker compose up\`.

        **Boas práticas**: imagens pequenas (\`-slim\`, multi-stage builds), usuário não-root, \`.dockerignore\`, segredos por variáveis de ambiente ou *secrets* (nunca na imagem), uma responsabilidade por container, versões fixas.
      `),
      { type: 'table', head: ['', 'Máquina virtual', 'Container'], rows: [
        ['Isolamento', 'hardware virtual + SO completo', 'processos isolados no mesmo kernel'],
        ['Inicialização', 'minutos', 'segundos'],
        ['Tamanho', 'GB', 'MB'],
        ['Uso típico', 'SOs diferentes, isolamento forte', 'empacotar e escalar aplicações'],
      ] },
    ],
    exemplo: [code('text', `
      # compose.yaml
      services:
        api:
          build: .
          ports: ["8000:8000"]
          environment:
            DATABASE_URL: postgresql://app:app@db:5432/app
          depends_on: [db]
        db:
          image: postgres:17
          environment:
            POSTGRES_USER: app
            POSTGRES_PASSWORD: app
          volumes: ["dados:/var/lib/postgresql/data"]
      volumes:
        dados:
    `, 'API + PostgreSQL com dados persistidos num volume.')],
    codigo: [md('Esta própria plataforma inclui um `Dockerfile` multi-stage na raiz do repositório: o primeiro estágio compila o front-end, o segundo leva só o necessário para rodar a API, com usuário não-root.')],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e12-docker-1',
          kind: 'mcq',
          prompt: 'Toda vez que você muda uma linha de código, o `docker build` reinstala todas as dependências. Qual a causa provável?',
          difficulty: 'intermediario',
          skills: ['devops-containers'],
          hints: ['Cada instrução gera uma camada; se uma camada muda, todas as seguintes são refeitas.'],
          explanation: 'Provavelmente `COPY . .` vem antes do `RUN pip install`. Copie primeiro só o `requirements.txt`, instale, e depois copie o resto.',
          options: [
            { text: 'COPY . . vem antes da instalação das dependências, invalidando o cache', correct: true, feedback: 'Isso: reordene as instruções.' },
            { text: 'O Docker não tem cache', feedback: 'Tem: cache de camadas.' },
            { text: 'Falta EXPOSE', feedback: 'EXPOSE é só documentação de portas.' },
            { text: 'A imagem base é slim', feedback: 'slim não afeta o cache.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e12-docker-2',
          kind: 'mcq',
          prompt: 'Você removeu o container do PostgreSQL e os dados sumiram. Como evitar?',
          difficulty: 'facil',
          skills: ['devops-containers'],
          hints: ['O sistema de arquivos do container é descartável.'],
          explanation: 'Monte um **volume** em /var/lib/postgresql/data: ele persiste independentemente do container.',
          options: [
            { text: 'Usar um volume para o diretório de dados', correct: true, feedback: 'Isso.' },
            { text: 'Nunca parar o container', feedback: 'Frágil: qualquer atualização perderia os dados.' },
            { text: 'Copiar os dados para dentro da imagem', feedback: 'Imagens são imutáveis e não devem conter dados de produção.' },
            { text: 'Usar EXPOSE 5432', feedback: 'Não tem relação com persistência.' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e12-docker-desafio',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `auditar_dockerfile(texto)` que devolve uma lista de avisos (strings, na ordem): `"rode como usuário não-root"` se não houver instrução `USER`; `"fixe a versão da imagem base"` se o `FROM` usar `:latest` ou não tiver tag; `"copie dependências antes do código"` se um `COPY . .` aparecer antes de um `RUN pip install`.',
          difficulty: 'avancado',
          skills: ['devops-containers', 'prog-strings'],
          hints: ['Separe em linhas, ignore vazias e comentários, e olhe a primeira palavra (instrução).', 'Guarde o índice da primeira linha `COPY . .` e da primeira `RUN pip install`.'],
          explanation: 'Linters reais de Dockerfile (como o hadolint) funcionam assim: regras simples aplicadas a cada instrução.',
          starter: 'def auditar_dockerfile(texto):\n    return []\n',
          solution: dedent(`
            def auditar_dockerfile(texto):
                linhas = [l.strip() for l in texto.splitlines() if l.strip() and not l.strip().startswith("#")]
                avisos = []
                if not any(l.upper().startswith("USER ") for l in linhas):
                    avisos.append("rode como usuário não-root")
                for l in linhas:
                    if l.upper().startswith("FROM "):
                        imagem = l.split()[1]
                        if ":" not in imagem or imagem.endswith(":latest"):
                            avisos.append("fixe a versão da imagem base")
                        break
                copy_all = next((i for i, l in enumerate(linhas) if l == "COPY . ."), None)
                pip = next((i for i, l in enumerate(linhas) if l.startswith("RUN pip install")), None)
                if copy_all is not None and pip is not None and copy_all < pip:
                    avisos.append("copie dependências antes do código")
                return avisos
          `),
          tests: [
            { name: 'Dockerfile ruim', code: 'df = "FROM python\\nCOPY . .\\nRUN pip install -r requirements.txt\\nCMD [\\"python\\", \\"app.py\\"]"\nassert auditar_dockerfile(df) == ["rode como usuário não-root", "fixe a versão da imagem base", "copie dependências antes do código"]' },
            { name: 'Dockerfile bom', code: 'df = "# api\\nFROM python:3.13-slim\\nCOPY requirements.txt .\\nRUN pip install -r requirements.txt\\nCOPY . .\\nUSER app"\nassert auditar_dockerfile(df) == []' },
          ],
        },
      },
    ],
    projeto: [md('**API REST (parte 4)**: containerize sua API com um Dockerfile multi-stage, adicione um `compose.yaml` com PostgreSQL e faça a CI construir a imagem a cada push.'), { type: 'project', projectId: 'p5-api' }],
    revisao: [md('- Container: processo isolado, compartilha o kernel; imagem: modelo imutável.\n- Cache de camadas: dependências antes do código.\n- Volumes persistem dados; variáveis de ambiente configuram.\n- Não rode como root; fixe versões.')],
  },
  review: [
    ['Container × VM?', 'Container isola processos no mesmo kernel (leve); VM virtualiza hardware com um SO completo (pesada).'],
    ['Como persistir dados de um container?', 'Com volumes.'],
  ],
  references: ['docker-docs', 'twelve-factor', 'kubernetes-docs'],
});

/* ========================= Nível 13 — Inteligência Artificial ========================= */

const ml = lesson({
  id: 'l13-ml-fundamentos',
  moduleId: 'm13-1',
  title: 'Fundamentos de machine learning',
  titleEn: 'Machine learning fundamentals',
  summary: 'Aprender com dados: treino, validação e teste, regressão linear do zero, overfitting e métricas.',
  minutes: 45,
  objectives: ['Explicar aprendizado supervisionado e não supervisionado', 'Separar dados em treino, validação e teste', 'Treinar uma regressão linear com gradiente descendente do zero', 'Reconhecer overfitting e escolher métricas'],
  skills: ['ia-ml'],
  terms: [
    t('aprendizado de máquina', 'machine learning (ML)', 'Programas que melhoram seu desempenho a partir de dados.'),
    t('conjunto de treino', 'training set', 'Dados usados para ajustar o modelo.'),
    t('conjunto de teste', 'test set', 'Dados nunca vistos no treino, usados para avaliar.'),
    t('sobreajuste', 'overfitting', 'O modelo decora o treino e generaliza mal.'),
    t('função de perda', 'loss function', 'Mede o erro do modelo; o treino tenta minimizá-la.'),
    t('gradiente descendente', 'gradient descent', 'Ajustar parâmetros na direção que mais reduz a perda.'),
    t('rótulo', 'label', 'A resposta correta de um exemplo (no aprendizado supervisionado).'),
  ],
  stages: {
    conceito: [md('Em vez de escrever as regras, em **machine learning** mostramos **exemplos** e um algoritmo **ajusta os parâmetros** de um modelo para minimizar o erro. Ex.: dado o tamanho de casas e seus preços, aprender uma função que estima o preço de uma casa nova.')],
    explicacao: [
      md(`
        - **Supervisionado**: exemplos com **rótulo** (preço, spam/não spam). Regressão (número) ou classificação (categoria).
        - **Não supervisionado**: sem rótulos — agrupar clientes parecidos (*clustering*).
        - **Por reforço**: um agente aprende por tentativa e recompensa.

        **Treinar** = minimizar uma **função de perda**. Para regressão linear \`ŷ = w·x + b\`, a perda pode ser o erro quadrático médio (MSE). O **gradiente descendente** calcula a derivada da perda em relação a w e b e dá um pequeno passo (**taxa de aprendizado**) na direção oposta.

        **Avaliação honesta**: separe **treino** (ajustar), **validação** (escolher hiperparâmetros) e **teste** (medir no fim, uma vez). Avaliar no próprio treino esconde o **overfitting**: o modelo decora em vez de aprender o padrão.

        **Métricas**: regressão → MSE, MAE; classificação → acurácia, precisão, revocação (*recall*), F1. Com classes desbalanceadas (1% de fraudes), acurácia engana: um modelo que diz "nunca é fraude" tem 99%.
      `),
      deep('Dados contam mais que algoritmos: dados enviesados produzem modelos enviesados. Perguntas obrigatórias: de onde vieram os dados? Quem está sub-representado? O que o modelo vai decidir sobre pessoas reais?', 'Dados e vieses'),
    ],
    exemplo: [py(`
      # Regressão linear do zero, com gradiente descendente
      xs = [1, 2, 3, 4, 5]          # ex.: anos de experiência
      ys = [2.1, 3.9, 6.2, 7.8, 10.1]  # ex.: salário (milhares)

      w, b, taxa = 0.0, 0.0, 0.02
      for epoca in range(2000):
          n = len(xs)
          dw = sum(2 * (w * x + b - y) * x for x, y in zip(xs, ys)) / n
          db = sum(2 * (w * x + b - y) for x, y in zip(xs, ys)) / n
          w -= taxa * dw
          b -= taxa * db
          if epoca % 500 == 0:
              mse = sum((w * x + b - y) ** 2 for x, y in zip(xs, ys)) / n
              print(f"época {epoca:4d}  MSE={mse:.4f}")
      print(f"modelo: y = {w:.2f}x + {b:.2f}  | previsão para x=6: {w * 6 + b:.2f}")
    `)],
    codigo: [{ type: 'viz', viz: 'neuron', caption: 'Ajuste peso e viés à mão e veja a perda; depois deixe o gradiente descendente fazer isso por você.' }],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e13-ml-1',
          kind: 'mcq',
          prompt: 'Seu modelo tem 99% de acurácia no treino e 62% no teste. O que está acontecendo?',
          difficulty: 'facil',
          skills: ['ia-ml'],
          hints: ['Desempenho ótimo nos dados vistos, ruim nos novos...'],
          explanation: 'Overfitting: o modelo memorizou o treino. Soluções: mais dados, modelo mais simples, regularização, validação cruzada.',
          options: [
            { text: 'Underfitting', feedback: 'Underfitting seria ruim também no treino.' },
            { text: 'Overfitting', correct: true, feedback: 'Isso: decorou em vez de generalizar.' },
            { text: 'O modelo está perfeito', feedback: 'O que importa é o desempenho em dados novos.' },
            { text: 'O teste está errado', feedback: 'Possível, mas a explicação mais provável é overfitting.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e13-ml-2',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `metricas(reais, previstos)` para classificação binária (listas de 0/1) que devolve um dict com `acuracia`, `precisao` e `recall`, arredondados a 2 casas (use 0.0 quando o denominador for zero).',
          difficulty: 'intermediario',
          skills: ['ia-ml'],
          hints: ['Conte VP (1 e 1), FP (real 0, previsto 1), FN (real 1, previsto 0), VN.', 'precisão = VP / (VP + FP); recall = VP / (VP + FN).'],
          explanation: 'Precisão: dos que o modelo marcou como positivos, quantos eram? Recall: dos positivos reais, quantos o modelo achou? Em diagnóstico médico, recall costuma importar mais.',
          starter: 'def metricas(reais, previstos):\n    pass\n',
          solution: dedent(`
            def metricas(reais, previstos):
                vp = sum(1 for r, p in zip(reais, previstos) if r == 1 and p == 1)
                fp = sum(1 for r, p in zip(reais, previstos) if r == 0 and p == 1)
                fn = sum(1 for r, p in zip(reais, previstos) if r == 1 and p == 0)
                acertos = sum(1 for r, p in zip(reais, previstos) if r == p)
                div = lambda a, b: round(a / b, 2) if b else 0.0
                return {"acuracia": div(acertos, len(reais)), "precisao": div(vp, vp + fp), "recall": div(vp, vp + fn)}
          `),
          tests: [
            { name: 'caso típico', code: 'assert metricas([1, 0, 1, 1, 0], [1, 1, 0, 1, 0]) == {"acuracia": 0.6, "precisao": 0.67, "recall": 0.67}' },
            { name: 'modelo que nunca diz 1', code: 'assert metricas([0] * 99 + [1], [0] * 100) == {"acuracia": 0.99, "precisao": 0.0, "recall": 0.0}' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e13-ml-desafio',
          kind: 'code',
          lang: 'python',
          prompt: 'Implemente `knn(treino, ponto, k)` — k vizinhos mais próximos. `treino` é uma lista de `((x, y), rotulo)`. Devolva o rótulo mais comum entre os k pontos mais próximos (distância euclidiana); em empate de votos, o rótulo do vizinho mais próximo entre os empatados.',
          difficulty: 'desafio',
          skills: ['ia-ml', 'alg-ordenacao'],
          hints: ['Ordene o treino pela distância até o ponto e pegue os k primeiros.', 'Conte os votos; para desempatar, percorra os vizinhos em ordem de distância e escolha o primeiro rótulo com o máximo de votos.'],
          explanation: 'k-NN não "treina" nada: guarda os dados e decide por semelhança. É simples, interpretável, e mostra a importância da escolha de k e da escala das variáveis.',
          starter: 'def knn(treino, ponto, k):\n    pass\n',
          solution: dedent(`
            from collections import Counter

            def knn(treino, ponto, k):
                def dist(p):
                    return ((p[0] - ponto[0]) ** 2 + (p[1] - ponto[1]) ** 2) ** 0.5
                vizinhos = sorted(treino, key=lambda item: dist(item[0]))[:k]
                votos = Counter(r for _, r in vizinhos)
                maximo = max(votos.values())
                for _, r in vizinhos:
                    if votos[r] == maximo:
                        return r
          `),
          tests: [
            { name: 'classifica', code: 'treino = [((0, 0), "A"), ((0, 1), "A"), ((5, 5), "B"), ((6, 5), "B"), ((5, 6), "B")]\nassert knn(treino, (1, 0), 3) == "A" and knn(treino, (5, 5.5), 3) == "B"' },
            { name: 'empate → mais próximo', code: 'treino = [((0, 0), "A"), ((3, 0), "B")]\nassert knn(treino, (1, 0), 2) == "A"' },
          ],
        },
      },
    ],
    projeto: [md('**Projeto 7 — Classificador do zero**: com um conjunto de dados público (ex.: Iris, ou dados abertos do governo brasileiro), separe treino/teste, implemente k-NN e uma regressão logística simples, compare métricas e escreva um relatório honesto sobre limitações e vieses.'), { type: 'project', projectId: 'p7-ml' }],
    revisao: [md('- ML: ajustar parâmetros para minimizar uma perda a partir de dados.\n- Treino / validação / teste separados.\n- Overfitting: ótimo no treino, ruim em dados novos.\n- Métricas certas para o problema (precisão, recall).')],
  },
  review: [
    ['Para que serve o conjunto de teste?', 'Para estimar, uma única vez no fim, o desempenho em dados nunca vistos.'],
    ['Precisão × recall?', 'Precisão: dos marcados como positivos, quantos são. Recall: dos positivos reais, quantos foram encontrados.'],
    ['O que o gradiente descendente faz?', 'Ajusta os parâmetros na direção oposta ao gradiente da perda, reduzindo o erro passo a passo.'],
  ],
  references: ['stanford-cs229', 'aima', 'google-ml-crash', 'goodfellow-dl'],
});

const redesNeurais = lesson({
  id: 'l13-redes-neurais',
  moduleId: 'm13-2',
  title: 'Redes neurais e deep learning',
  titleEn: 'Neural networks and deep learning',
  summary: 'O neurônio artificial, ativações, camadas, retropropagação e por que profundidade importa.',
  minutes: 40,
  objectives: ['Descrever um neurônio artificial (soma ponderada + ativação)', 'Explicar por que funções de ativação não lineares são necessárias', 'Entender a ideia da retropropagação', 'Conhecer arquiteturas: MLP, CNN, transformer'],
  skills: ['ia-redes-neurais'],
  terms: [
    t('neurônio artificial', 'artificial neuron / perceptron', 'Calcula uma soma ponderada das entradas e aplica uma ativação.'),
    t('peso', 'weight', 'Parâmetro que multiplica cada entrada.'),
    t('viés', 'bias', 'Parâmetro somado ao resultado.'),
    t('função de ativação', 'activation function', 'Não linearidade aplicada à soma: ReLU, sigmoide.'),
    t('retropropagação', 'backpropagation', 'Algoritmo que calcula o gradiente da perda em relação a todos os pesos (regra da cadeia).'),
    t('época', 'epoch', 'Uma passada completa pelos dados de treino.'),
  ],
  stages: {
    conceito: [md('Um **neurônio artificial** calcula `ativação(w₁x₁ + w₂x₂ + ... + b)`. Empilhando neurônios em **camadas**, uma rede neural consegue aproximar funções muito complexas. **Deep learning** é usar redes com muitas camadas, treinadas com **retropropagação** e gradiente descendente.')],
    explicacao: [
      md(`
        - **Sem ativação não linear**, empilhar camadas lineares dá... outra função linear. A **ReLU** (\`max(0, x)\`) é simples e funciona muito bem.
        - **Retropropagação**: aplica a **regra da cadeia** do cálculo para obter, de trás para frente, quanto cada peso contribuiu para o erro. É gradiente descendente com contabilidade eficiente.
        - **Arquiteturas**: MLP (camadas densas), **CNN** (convoluções, para imagens), **RNN** (sequências, hoje menos usadas), **Transformer** (atenção; base dos grandes modelos de linguagem).
        - Na prática usa-se **PyTorch** ou **JAX**, que calculam gradientes automaticamente (*autograd*).
      `),
      info('Um perceptron sozinho não aprende o XOR (os pontos não são separáveis por uma reta). Com uma camada escondida, aprende. Esse resultado (Minsky e Papert, 1969) e sua superação explicam boa parte da história da IA.'),
    ],
    exemplo: [{ type: 'viz', viz: 'neuron', caption: 'Um neurônio com duas entradas: ajuste pesos e viés e veja a fronteira de decisão para as portas AND e OR.' }],
    codigo: [py(`
      # Perceptron aprendendo a porta AND
      dados = [((0, 0), 0), ((0, 1), 0), ((1, 0), 0), ((1, 1), 1)]
      w1, w2, b, taxa = 0.0, 0.0, 0.0, 0.1

      def prever(x1, x2):
          return 1 if w1 * x1 + w2 * x2 + b > 0 else 0

      for epoca in range(20):
          erros = 0
          for (x1, x2), y in dados:
              erro = y - prever(x1, x2)
              if erro:
                  erros += 1
                  w1 += taxa * erro * x1
                  w2 += taxa * erro * x2
                  b += taxa * erro
          if erros == 0:
              print("convergiu na época", epoca)
              break
      print([prever(*x) for x, _ in dados], (round(w1, 2), round(w2, 2), round(b, 2)))
    `)],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e13-nn-1',
          kind: 'predict',
          lang: 'python',
          prompt: 'O que este neurônio com ReLU imprime?',
          difficulty: 'facil',
          skills: ['ia-redes-neurais'],
          hints: ['Soma ponderada: 2·1 + (−1)·3 + 0.5.', 'ReLU(z) = max(0, z).'],
          explanation: 'z = 2 − 3 + 0.5 = −0.5; ReLU(−0.5) = 0.',
          code: 'x = [1, 3]\nw = [2, -1]\nb = 0.5\nz = sum(wi * xi for wi, xi in zip(w, x)) + b\nprint(max(0, z))',
          answer: '0',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e13-nn-2',
          kind: 'mcq',
          prompt: 'Por que redes neurais precisam de funções de ativação **não lineares**?',
          difficulty: 'intermediario',
          skills: ['ia-redes-neurais'],
          hints: ['O que é a composição de duas funções lineares?'],
          explanation: 'Composição de funções lineares é linear: sem não linearidade, uma rede profunda equivale a uma única camada linear e não aprende padrões como o XOR.',
          options: [
            { text: 'Para treinar mais rápido', feedback: 'Não é o motivo principal.' },
            { text: 'Porque sem elas várias camadas equivalem a uma única transformação linear', correct: true, feedback: 'Isso.' },
            { text: 'Para economizar memória', feedback: 'Não tem relação com memória.' },
            { text: 'Para evitar números negativos', feedback: 'Algumas ativações aceitam negativos (tanh).' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e13-nn-desafio',
          kind: 'code',
          lang: 'python',
          prompt: 'Sem treinar, escolha pesos à mão para uma rede de **duas camadas** com ativação degrau que calcula **XOR**. Implemente `xor(a, b)` usando apenas neurônios `degrau(w1*a + w2*b + bias)` (degrau = 1 se > 0, senão 0): dois na camada escondida e um na saída.',
          difficulty: 'desafio',
          skills: ['ia-redes-neurais', 'mat-logica'],
          hints: ['XOR = (a OR b) AND NOT (a AND b).', 'Um neurônio faz OR (w=1,1; bias=−0.5), outro faz AND (w=1,1; bias=−1.5). A saída combina: h_or − h_and − 0.5.'],
          explanation: 'Com uma camada escondida, a rede cria duas fronteiras lineares e as combina — exatamente o que um único perceptron não consegue.',
          starter: 'def degrau(z):\n    return 1 if z > 0 else 0\n\ndef xor(a, b):\n    return degrau(a + b - 0.5)\n',
          solution: dedent(`
            def degrau(z):
                return 1 if z > 0 else 0

            def xor(a, b):
                h_or = degrau(a + b - 0.5)
                h_and = degrau(a + b - 1.5)
                return degrau(h_or - h_and - 0.5)
          `),
          tests: [{ name: 'tabela-verdade do XOR', code: 'assert [xor(a, b) for a, b in [(0, 0), (0, 1), (1, 0), (1, 1)]] == [0, 1, 1, 0]' }],
        },
      },
    ],
    projeto: [md('**Projeto 7 (parte 2)**: implemente uma rede de uma camada escondida do zero (com NumPy, no seu computador) para classificar dígitos do conjunto MNIST, e depois reimplemente em PyTorch. Compare a quantidade de código e a acurácia.'), { type: 'project', projectId: 'p7-ml' }],
    revisao: [md('- Neurônio: soma ponderada + viés + ativação.\n- Não linearidade é essencial.\n- Retropropagação = regra da cadeia para calcular gradientes.\n- CNN para imagens; Transformer para linguagem.')],
  },
  review: [
    ['O que a retropropagação calcula?', 'O gradiente da perda em relação a cada peso, usando a regra da cadeia.'],
    ['O que faz a ReLU?', 'Devolve max(0, x).'],
  ],
  references: ['goodfellow-dl', 'stanford-cs231n', 'aima'],
});

const iaGen = lesson({
  id: 'l13-ia-generativa',
  moduleId: 'm13-3',
  title: 'IA generativa e uso responsável na programação',
  titleEn: 'Generative AI and responsible use in programming',
  summary: 'Como modelos de linguagem funcionam em alto nível, onde erram, e como usá-los para aprender — não para deixar de aprender.',
  minutes: 30,
  objectives: ['Explicar tokens, previsão do próximo token e contexto', 'Reconhecer alucinações e limitações', 'Usar assistentes de IA de forma que aumente o aprendizado', 'Considerar privacidade, licenças e segurança do código gerado'],
  skills: ['ia-generativa'],
  terms: [
    t('modelo de linguagem grande', 'large language model (LLM)', 'Modelo treinado para prever o próximo token em grandes volumes de texto.'),
    t('token', 'token', 'Pedaço de texto (palavra ou parte dela) que o modelo processa.'),
    t('alucinação', 'hallucination', 'Resposta fluente e confiante, mas falsa.'),
    t('janela de contexto', 'context window', 'Quanto texto o modelo considera de uma vez.'),
    t('instrução / prompt', 'prompt', 'O texto de entrada que orienta o modelo.'),
  ],
  stages: {
    conceito: [md('Um **LLM** é uma rede neural (Transformer) treinada para **prever o próximo token**. Com escala e ajuste fino, isso produz textos e códigos impressionantes — mas o modelo **não verifica** fatos por padrão: ele gera o que é **provável**, e o provável às vezes é falso (**alucinação**).')],
    explicacao: [
      md(`
        **Onde a IA ajuda no aprendizado**: explicar um conceito de outra forma, gerar exercícios extras, revisar seu código e apontar casos de borda, traduzir mensagens de erro, simular uma entrevista.

        **Onde ela atrapalha**: quando você pede a solução **antes** de tentar. Aprender exige esforço de recuperação — copiar a resposta pula exatamente a parte que cria a habilidade.

        **Regras de uso responsável**:

        1. **Tente primeiro.** Peça dicas, não soluções.
        2. **Verifique sempre**: rode, teste, leia a documentação oficial. Código que "parece certo" pode ter bugs sutis ou vulnerabilidades.
        3. **Entenda cada linha** que você entrega. Se não consegue explicar, não é seu código ainda.
        4. **Privacidade**: não cole segredos, dados pessoais ou código proprietário em serviços externos sem permissão.
        5. **Licenças e integridade acadêmica**: siga as regras do seu curso e da sua empresa.
      `),
      info('O **tutor de IA do Alicerce** foi projetado com essas regras: ele responde com perguntas e dicas graduais, explica erros e só mostra soluções completas depois de você ter tentado — e mesmo assim, pedindo que você explique o código de volta.', 'Como o tutor desta plataforma se comporta'),
    ],
    exemplo: [md(`
      **Prompt que atrapalha**: *"resolve esse exercício de busca binária"*.

      **Prompt que ensina**: *"Escrevi esta busca binária e ela trava quando o alvo é o último elemento. Não me dê o código corrigido: me faça perguntas que me ajudem a achar o erro."*
    `)],
    codigo: [py(`
      # "Prever o próximo token" em miniatura: um modelo de bigramas
      from collections import Counter, defaultdict
      import random

      texto = "o gato subiu no telhado o gato desceu do telhado o rato subiu no muro".split()
      prox = defaultdict(Counter)
      for a, b in zip(texto, texto[1:]):
          prox[a][b] += 1

      random.seed(3)
      palavra, frase = "o", ["o"]
      for _ in range(6):
          opcoes = prox[palavra]
          if not opcoes:
              break
          palavra = random.choices(list(opcoes), weights=opcoes.values())[0]
          frase.append(palavra)
      print(" ".join(frase))
      print("probabilidades depois de 'gato':", dict(prox["gato"]))
    `, { caption: 'LLMs são imensamente mais sofisticados, mas a ideia de gerar texto a partir de probabilidades condicionais é a mesma.' })],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e13-gen-1',
          kind: 'mcq',
          prompt: 'Um assistente de IA sugeriu usar a função `pandas.read_magic()`. O que fazer?',
          difficulty: 'facil',
          skills: ['ia-generativa'],
          hints: ['Como confirmar que uma função existe?'],
          explanation: 'Verifique na documentação oficial. Modelos podem inventar APIs plausíveis que não existem (alucinação).',
          options: [
            { text: 'Usar: a IA não erra nomes de funções', feedback: 'Erra: alucinação de APIs é comum.' },
            { text: 'Conferir na documentação oficial antes de usar', correct: true, feedback: 'Isso.' },
            { text: 'Instalar uma biblioteca com esse nome', feedback: 'Perigoso: atacantes publicam pacotes com nomes inventados por IAs (slopsquatting).' },
            { text: 'Perguntar de novo até a IA confirmar', feedback: 'Repetir a pergunta não verifica nada.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e13-gen-2',
          kind: 'mcq',
          prompt: 'Qual uso de IA mais **desenvolve** sua habilidade de programar?',
          difficulty: 'facil',
          skills: ['ia-generativa'],
          hints: ['Qual exige que você pense e recupere conhecimento?'],
          explanation: 'Tentar primeiro e usar a IA para perguntas e revisão mantém o esforço cognitivo que gera aprendizado.',
          options: [
            { text: 'Pedir a solução pronta e copiar', feedback: 'Pula o esforço que cria a habilidade.' },
            { text: 'Tentar, e pedir à IA perguntas e dicas sobre onde está o erro', correct: true, feedback: 'Isso: a IA como tutor, não como atalho.' },
            { text: 'Não usar nenhuma ferramenta', feedback: 'Ferramentas bem usadas ajudam; o ponto é como usar.' },
            { text: 'Pedir para a IA escrever os testes e o código', feedback: 'Você não verificaria nada por conta própria.' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e13-gen-desafio',
          kind: 'fix',
          lang: 'python',
          prompt: 'Um assistente gerou esta função para "verificar se um usuário é admin" a partir de um token. Ela tem um bug de **segurança** grave e um de **lógica**. Corrija: o token tem o formato `"usuario:papel:assinatura"`, e só é válido se `assinatura == assinar(usuario + ":" + papel)`. Devolva True só para tokens válidos com papel "admin".',
          difficulty: 'avancado',
          skills: ['ia-generativa', 'seg-fundamentos'],
          hints: ['A função confere a assinatura antes de confiar no papel?', 'E `"admin" in papel` aceitaria "nao-admin"?', 'Use `hmac.compare_digest` para comparar a assinatura.'],
          explanation: 'Código gerado pode "funcionar" nos casos felizes e falhar nos de segurança. Aqui: confiava no papel sem verificar a assinatura, e usava `in` (substring) em vez de igualdade.',
          starter: dedent(`
            import hmac, hashlib

            SEGREDO = b"chave-secreta"

            def assinar(texto):
                return hmac.new(SEGREDO, texto.encode(), hashlib.sha256).hexdigest()

            def eh_admin(token):
                usuario, papel, assinatura = token.split(":")
                return "admin" in papel
          `),
          solution: dedent(`
            import hmac, hashlib

            SEGREDO = b"chave-secreta"

            def assinar(texto):
                return hmac.new(SEGREDO, texto.encode(), hashlib.sha256).hexdigest()

            def eh_admin(token):
                partes = token.split(":")
                if len(partes) != 3:
                    return False
                usuario, papel, assinatura = partes
                if not hmac.compare_digest(assinatura, assinar(usuario + ":" + papel)):
                    return False
                return papel == "admin"
          `),
          tests: [
            { name: 'admin válido', code: 'assert eh_admin("ana:admin:" + assinar("ana:admin"))' },
            { name: 'assinatura forjada', code: 'assert not eh_admin("eva:admin:abc123")' },
            { name: 'papel parecido', code: 'assert not eh_admin("bia:nao-admin:" + assinar("bia:nao-admin"))' },
            { name: 'formato inválido', code: 'assert not eh_admin("lixo")' },
          ],
        },
      },
    ],
    projeto: [md('**Diário de uso de IA**: por duas semanas, registre cada vez que usar uma IA para estudar: o que pediu, o que ela respondeu, o que você verificou e o que aprendeu. Ao final, escreva suas próprias regras de uso.')],
    revisao: [md('- LLMs preveem o próximo token; podem alucinar.\n- Tente primeiro; peça dicas; verifique sempre.\n- Entenda cada linha que entrega.\n- Privacidade, segurança e licenças importam.')],
  },
  review: [
    ['O que é uma alucinação de um LLM?', 'Uma resposta fluente e confiante, porém falsa ou inventada.'],
    ['Qual a regra de ouro para aprender com IA?', 'Tentar primeiro e usar a IA para dicas, perguntas e revisão, verificando tudo.'],
  ],
  references: ['aima', 'stanford-cs224n', 'nist-ai-rmf'],
});

/* ========================= Nível 14 — Matemática ========================= */

const logica = lesson({
  id: 'l14-logica-conjuntos',
  moduleId: 'm14-1',
  title: 'Lógica proposicional e conjuntos',
  titleEn: 'Propositional logic and sets',
  summary: 'Proposições, conectivos, tabelas-verdade, leis de De Morgan, implicação e conjuntos — com aplicação direta em código.',
  minutes: 40,
  objectives: ['Construir tabelas-verdade', 'Aplicar as leis de De Morgan para simplificar condições', 'Entender implicação e equivalência', 'Operar com conjuntos e relacioná-los a set do Python'],
  skills: ['mat-logica'],
  terms: [
    t('proposição', 'proposition', 'Afirmação que é verdadeira ou falsa.'),
    t('conectivo', 'logical connective', 'E (∧), OU (∨), NÃO (¬), implica (→).'),
    t('tabela-verdade', 'truth table', 'Lista o valor de uma expressão para todas as combinações.'),
    t('implicação', 'implication', 'p → q: "se p, então q". Só é falsa quando p é verdade e q é falso.'),
    t('conjunto', 'set', 'Coleção de elementos distintos, sem ordem.'),
    t('tautologia', 'tautology', 'Expressão sempre verdadeira.'),
  ],
  stages: {
    conceito: [md('A **lógica** é a matemática por trás de todo `if`. Saber manipular expressões lógicas deixa condições mais simples, encontra bugs e é a base de circuitos digitais, bancos de dados (consultas) e verificação de programas.')],
    explicacao: [
      md(`
        **Leis de De Morgan** — as mais úteis no dia a dia:

        - \`not (a and b)\` ≡ \`(not a) or (not b)\`
        - \`not (a or b)\` ≡ \`(not a) and (not b)\`

        Ex.: \`not (idade >= 18 and tem_documento)\` ≡ \`idade < 18 or not tem_documento\`.

        **Implicação** \`p → q\` ("se chove, então levo guarda-chuva") só é **falsa** quando p é verdadeiro e q falso. Equivale a \`(not p) or q\`. A **contrapositiva** \`¬q → ¬p\` é equivalente; a **recíproca** \`q → p\` **não** é.

        **Conjuntos**: união (A ∪ B), interseção (A ∩ B), diferença (A − B), complemento, subconjunto (A ⊆ B), produto cartesiano (A × B). Em Python: \`|\`, \`&\`, \`-\`, \`<=\`, \`itertools.product\`. Em SQL: \`UNION\`, \`INTERSECT\`, \`EXCEPT\`, e o JOIN é um produto cartesiano filtrado.
      `),
    ],
    exemplo: [{ type: 'viz', viz: 'logic-gates', caption: 'Monte expressões com portas AND, OR, NOT e XOR e veja a tabela-verdade gerada. Confira De Morgan na prática.' }],
    codigo: [py(`
      from itertools import product

      def tabela(expr, nomes):
          print(" ".join(nomes), "| resultado")
          for valores in product([False, True], repeat=len(nomes)):
              print(" ".join("V" if v else "F" for v in valores), "|", "V" if expr(*valores) else "F")

      tabela(lambda p, q: (not p) or q, ["p", "q"])   # p → q

      # De Morgan verificado para todos os casos:
      print(all((not (a and b)) == ((not a) or (not b)) for a, b in product([False, True], repeat=2)))
    `)],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e14-log-1',
          kind: 'mcq',
          prompt: 'Qual expressão é equivalente a `not (x > 0 and y > 0)`?',
          difficulty: 'facil',
          skills: ['mat-logica'],
          hints: ['De Morgan: o "not" entra e troca and por or.'],
          explanation: 'not (A and B) ≡ (not A) or (not B) → x <= 0 or y <= 0.',
          options: [
            { text: 'x <= 0 and y <= 0', feedback: 'Faltou trocar and por or.' },
            { text: 'x <= 0 or y <= 0', correct: true, feedback: 'Isso: De Morgan.' },
            { text: 'x < 0 or y < 0', feedback: 'A negação de x > 0 é x <= 0 (o zero conta!).' },
            { text: 'not x > 0 and y > 0', feedback: 'A negação só se aplicaria ao primeiro termo.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e14-log-2',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `equivalentes(f, g, n)` que devolve True se as funções booleanas f e g (de n argumentos) dão o mesmo resultado para **todas** as 2ⁿ combinações de entradas.',
          difficulty: 'intermediario',
          skills: ['mat-logica'],
          hints: ['`itertools.product([False, True], repeat=n)` gera todas as combinações.', 'Use `all(...)` com `f(*valores) == g(*valores)`.'],
          explanation: 'Verificação exaustiva é uma prova para domínios finitos e pequenos. Com 30 variáveis já seriam ~1 bilhão de casos — por isso existem solucionadores SAT.',
          starter: 'from itertools import product\n\ndef equivalentes(f, g, n):\n    pass\n',
          solution: 'from itertools import product\n\ndef equivalentes(f, g, n):\n    return all(f(*v) == g(*v) for v in product([False, True], repeat=n))\n',
          tests: [
            { name: 'De Morgan', code: 'assert equivalentes(lambda a, b: not (a or b), lambda a, b: (not a) and (not b), 2)' },
            { name: 'recíproca não é equivalente', code: 'assert not equivalentes(lambda p, q: (not p) or q, lambda p, q: (not q) or p, 2)' },
            { name: 'contrapositiva é equivalente', code: 'assert equivalentes(lambda p, q: (not p) or q, lambda p, q: q or not p, 2)' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e14-log-desafio',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `subconjuntos(xs)` que devolve a lista de **todos** os subconjuntos (o conjunto das partes) de uma lista de elementos distintos, cada um como lista, usando a representação **binária**: cada número de 0 a 2ⁿ−1 indica quais elementos entram.',
          difficulty: 'desafio',
          skills: ['mat-logica', 'comp-binario'],
          hints: ['Para n elementos, há 2ⁿ subconjuntos.', 'O bit i do número m diz se xs[i] entra: `(m >> i) & 1`.'],
          explanation: 'Bijeção entre subconjuntos e números binários de n bits — uma ponte bonita entre matemática discreta e representação binária. Também mostra por que problemas "teste todos os subconjuntos" são O(2ⁿ).',
          starter: 'def subconjuntos(xs):\n    pass\n',
          solution: dedent(`
            def subconjuntos(xs):
                n = len(xs)
                return [[xs[i] for i in range(n) if (m >> i) & 1] for m in range(2 ** n)]
          `),
          tests: [
            { name: 'três elementos', code: 'assert sorted(map(sorted, subconjuntos([1, 2, 3]))) == sorted([[], [1], [2], [3], [1, 2], [1, 3], [2, 3], [1, 2, 3]])' },
            { name: 'quantidade 2^n', code: 'assert len(subconjuntos(list(range(10)))) == 1024 and subconjuntos([]) == [[]]' },
          ],
        },
      },
    ],
    projeto: [md('**Mini-projeto: simplificador de condições**. Pegue 5 `if`s complexos do seu código (ou de um projeto aberto) e simplifique-os com De Morgan e equivalências, verificando com `equivalentes`.')],
    revisao: [md('- Conectivos: and, or, not, implicação.\n- De Morgan: not(a and b) = not a or not b; not(a or b) = not a and not b.\n- p → q ≡ ¬p ∨ q; contrapositiva equivale; recíproca não.\n- Conjuntos ↔ set do Python ↔ operações do SQL.')],
  },
  review: [
    ['Enuncie uma lei de De Morgan.', 'not (a and b) ≡ (not a) or (not b).'],
    ['Quando p → q é falsa?', 'Somente quando p é verdadeiro e q é falso.'],
    ['Quantos subconjuntos tem um conjunto de n elementos?', '2ⁿ.'],
  ],
  references: ['mit-6042', 'rosen-discrete'],
});

const prob = lesson({
  id: 'l14-combinatoria-probabilidade',
  moduleId: 'm14-2',
  title: 'Combinatória, probabilidade e estatística',
  titleEn: 'Combinatorics, probability and statistics',
  summary: 'Contar sem listar, probabilidade condicional, valor esperado e simulação — a matemática de algoritmos, hashing e IA.',
  minutes: 45,
  objectives: ['Usar princípio multiplicativo, permutações e combinações', 'Calcular probabilidades simples e condicionais', 'Calcular valor esperado, média, mediana e desvio padrão', 'Estimar probabilidades por simulação (Monte Carlo)'],
  skills: ['mat-probabilidade'],
  terms: [
    t('combinação', 'combination', 'Escolha sem ordem: C(n, k).'),
    t('permutação', 'permutation', 'Arranjo com ordem: n!.'),
    t('probabilidade condicional', 'conditional probability', 'P(A | B): probabilidade de A sabendo que B ocorreu.'),
    t('valor esperado', 'expected value', 'Média ponderada pelos resultados possíveis.'),
    t('desvio padrão', 'standard deviation', 'Quanto os valores se espalham em torno da média.'),
    t('simulação de Monte Carlo', 'Monte Carlo simulation', 'Estimar resultados repetindo experimentos aleatórios.'),
  ],
  stages: {
    conceito: [md('**Combinatória** responde "quantos?" sem precisar listar. **Probabilidade** responde "quão provável?". As duas aparecem em análise de algoritmos (quantos casos?), senhas (quantas combinações?), hashing (chance de colisão), testes A/B e em todo o machine learning.')],
    explicacao: [
      md(`
        - **Princípio multiplicativo**: senha de 8 caracteres com 62 símbolos possíveis → 62⁸ ≈ 2,18 × 10¹⁴.
        - **Permutações**: n! ordens de n itens. **Combinações**: C(n, k) = n! / (k!(n−k)!) formas de escolher k sem ordem.
        - **Probabilidade**: casos favoráveis / casos possíveis (quando equiprováveis). P(A ou B) = P(A) + P(B) − P(A e B).
        - **Condicional**: P(A | B) = P(A e B) / P(B). **Bayes**: P(A | B) = P(B | A)·P(A) / P(B) — base de filtros de spam e de raciocínio sobre testes diagnósticos.
        - **Valor esperado**: E[X] = Σ x·P(x). O caso médio de algoritmos é um valor esperado.
        - **Estatística descritiva**: média (sensível a extremos), mediana (robusta), desvio padrão.
      `),
      deep('**Paradoxo do aniversário**: com apenas 23 pessoas, a chance de duas fazerem aniversário no mesmo dia passa de 50%. É por isso que colisões de hash aparecem bem antes do que a intuição diz: com um hash de n bits, espera-se uma colisão após cerca de 2^(n/2) itens.', 'Por que colisões acontecem cedo'),
    ],
    exemplo: [py(`
      from math import comb, factorial, prod

      print("C(5,2) =", comb(5, 2), "| 5! =", factorial(5))

      def p_aniversario(n):
          p_distintos = prod((365 - i) / 365 for i in range(n))
          return 1 - p_distintos

      for n in [10, 23, 50]:
          print(n, "pessoas:", f"{p_aniversario(n):.1%}")
    `)],
    codigo: [py(`
      import random, statistics
      random.seed(42)

      # Monte Carlo: estimando π jogando pontos num quadrado
      dentro = sum(1 for _ in range(200_000) if random.random() ** 2 + random.random() ** 2 <= 1)
      print("π ≈", 4 * dentro / 200_000)

      dados = [3, 5, 5, 6, 7, 8, 40]
      print("média:", round(statistics.mean(dados), 2), "mediana:", statistics.median(dados), "desvio:", round(statistics.stdev(dados), 2))
    `)],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e14-prob-1',
          kind: 'mcq',
          prompt: 'Quantos PINs de 4 dígitos (0–9, com repetição) existem?',
          difficulty: 'facil',
          skills: ['mat-probabilidade'],
          hints: ['Princípio multiplicativo: 10 opções para cada posição.'],
          explanation: '10 × 10 × 10 × 10 = 10 000.',
          options: [
            { text: '40', feedback: 'As opções se multiplicam, não se somam.' },
            { text: '5 040', feedback: 'Seria sem repetição (10 × 9 × 8 × 7).' },
            { text: '10 000', correct: true, feedback: 'Isso.' },
            { text: '210', feedback: 'Seria C(10, 4): escolher sem ordem e sem repetição.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e14-prob-2',
          kind: 'code',
          lang: 'python',
          prompt: 'Escreva `prob_soma(alvo)` que devolve a probabilidade (float arredondado a 4 casas) de a soma de **dois dados** de 6 faces ser igual a `alvo`, enumerando os 36 resultados.',
          difficulty: 'intermediario',
          skills: ['mat-probabilidade'],
          hints: ['Dois loops (ou product) de 1 a 6.', 'favoráveis / 36.'],
          explanation: 'Soma 7 é a mais provável (6/36 ≈ 0,1667). Enumerar o espaço amostral é a forma mais segura de não errar contagens.',
          starter: 'def prob_soma(alvo):\n    pass\n',
          solution: 'def prob_soma(alvo):\n    fav = sum(1 for a in range(1, 7) for b in range(1, 7) if a + b == alvo)\n    return round(fav / 36, 4)\n',
          tests: [
            { name: 'soma 7', code: 'assert prob_soma(7) == 0.1667' },
            { name: 'soma 2 e 13', code: 'assert prob_soma(2) == 0.0278 and prob_soma(13) == 0.0' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e14-prob-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Um teste detecta uma doença rara (1% da população) com sensibilidade de 99% (P(positivo | doente)) e
            especificidade de 95% (P(negativo | saudável)). Escreva \`bayes(prevalencia, sensibilidade, especificidade)\` que
            devolve P(doente | positivo), arredondado a 4 casas. Surpreenda-se com o resultado.
          `),
          difficulty: 'desafio',
          skills: ['mat-probabilidade'],
          hints: ['P(positivo) = P(pos | doente)·P(doente) + P(pos | saudável)·P(saudável).', 'P(pos | saudável) = 1 − especificidade.'],
          explanation: 'Com 1% de prevalência, só ~16,7% dos positivos estão doentes: a maioria dos positivos vem dos 99% saudáveis × 5% de falso positivo. Ignorar a taxa-base (base rate fallacy) é um erro comum — inclusive na avaliação de modelos de ML.',
          starter: 'def bayes(prevalencia, sensibilidade, especificidade):\n    return sensibilidade\n',
          solution: dedent(`
            def bayes(prevalencia, sensibilidade, especificidade):
                p_pos = sensibilidade * prevalencia + (1 - especificidade) * (1 - prevalencia)
                return round(sensibilidade * prevalencia / p_pos, 4)
          `),
          tests: [
            { name: 'doença rara', code: 'assert bayes(0.01, 0.99, 0.95) == 0.1667' },
            { name: 'doença comum', code: 'assert bayes(0.5, 0.99, 0.95) == 0.9519' },
          ],
        },
      },
    ],
    projeto: [md('**Mini-projeto: força de senhas**. Calcule quantas tentativas um atacante precisa, no pior caso, para senhas de diferentes tamanhos e alfabetos, e quanto tempo levaria a 10¹⁰ tentativas por segundo. Compare com uma frase-senha de 5 palavras de um dicionário de 7 776 palavras (*diceware*).')],
    revisao: [md('- Multiplicativo, n!, C(n,k).\n- P(A|B) = P(A e B)/P(B); Bayes.\n- Valor esperado; média × mediana; desvio padrão.\n- Monte Carlo: simular quando calcular é difícil.')],
  },
  review: [
    ['Fórmula de C(n, k)?', 'n! / (k!(n−k)!).'],
    ['O que diz o teorema de Bayes?', 'P(A|B) = P(B|A)·P(A) / P(B).'],
    ['Por que a mediana é mais robusta que a média?', 'Porque não é puxada por valores extremos.'],
  ],
  references: ['mit-6042', 'rosen-discrete', 'harvard-stat110'],
});

export const level11: Level = {
  id: 'n11', number: 11, title: 'Segurança', titleEn: 'Security',
  goal: 'Construir software que resiste a ataques comuns e proteger dados e usuários.',
  why: 'Segurança não é uma fase no fim do projeto: é um hábito em cada linha. Os erros mais caros da indústria (vazamentos de dados, sequestro de contas) vêm de falhas que você aprende a evitar aqui.',
  modules: [
    {
      id: 'm11-1', levelId: 'n11', title: 'Fundamentos de segurança', titleEn: 'Security fundamentals',
      description: 'CIA, autenticação, autorização e senhas.',
      prerequisites: ['m6-3'],
      skills: [{ id: 'seg-fundamentos', pt: 'Fundamentos de segurança', en: 'Security fundamentals' }],
      outline: ['Tríade CIA', 'Autenticação × autorização', 'Hash de senhas e salt', 'MFA', 'Menor privilégio e defesa em profundidade', 'Modelagem de ameaças'],
      lessons: [fundSeg],
      references: ['owasp-cheatsheets', 'nist-800-63b'],
    },
    {
      id: 'm11-2', levelId: 'n11', title: 'Segurança web e OWASP', titleEn: 'Web security and OWASP',
      description: 'Ataques comuns e defesas.',
      prerequisites: ['m11-1', 'm7-1'],
      skills: [{ id: 'seg-web', pt: 'Segurança web', en: 'Web security' }],
      outline: ['SQL injection', 'XSS e CSP', 'CSRF e SameSite', 'Controle de acesso', 'Segurança de APIs', 'Dependências e cadeia de suprimentos'],
      lessons: [owasp],
      references: ['owasp-top10', 'owasp-api'],
    },
    {
      id: 'm11-3', levelId: 'n11', title: 'Criptografia aplicada', titleEn: 'Applied cryptography',
      description: 'Simétrica, assimétrica, assinaturas e TLS.',
      prerequisites: ['m11-1', 'm14-1'],
      skills: [{ id: 'seg-cripto', pt: 'Criptografia aplicada', en: 'Applied cryptography' }],
      outline: ['Criptografia simétrica (AES)', 'Assimétrica (RSA, curvas elípticas)', 'Assinaturas digitais e HMAC', 'Troca de chaves', 'Nunca crie sua própria cripto'],
      lessons: [cripto],
      references: ['stanford-cs255', 'owasp-cheatsheets'],
    },
  ],
};

export const level12: Level = {
  id: 'n12', number: 12, title: 'Cloud e DevOps', titleEn: 'Cloud and DevOps',
  goal: 'Colocar software em produção de forma reprodutível, observável e escalável.',
  why: 'Software só gera valor quando está rodando para usuários. Linux, containers, CI/CD e observabilidade são o que conecta o código ao mundo real.',
  modules: [
    {
      id: 'm12-1', levelId: 'n12', title: 'Linux e shell', titleEn: 'Linux and the shell',
      description: 'O sistema dos servidores.',
      prerequisites: ['m0-2'],
      skills: [{ id: 'devops-linux', pt: 'Linux e shell', en: 'Linux and shell' }],
      outline: ['Permissões', 'Processos e sinais', 'Pipes e redirecionamento', 'Ferramentas de texto', 'Scripts bash', 'SSH'],
      lessons: [linux],
      references: ['missing-semester', 'linux-command-line'],
    },
    {
      id: 'm12-2', levelId: 'n12', title: 'Containers e Docker', titleEn: 'Containers and Docker',
      description: 'Empacotar e executar aplicações.',
      prerequisites: ['m12-1', 'm6-3'],
      skills: [{ id: 'devops-containers', pt: 'Containers', en: 'Containers' }],
      outline: ['Container × VM', 'Dockerfile e camadas', 'Volumes, redes e variáveis', 'Docker Compose', 'Kubernetes (introdução)'],
      lessons: [docker],
      references: ['docker-docs', 'kubernetes-docs'],
    },
    {
      id: 'm12-3', levelId: 'n12', title: 'Deploy, CI/CD e observabilidade', titleEn: 'Deployment, CI/CD and observability',
      description: 'Da branch à produção, com visibilidade.',
      prerequisites: ['m12-2', 'm10-3'],
      skills: [{ id: 'devops-deploy', pt: 'Deploy e observabilidade', en: 'Deployment and observability' }],
      outline: ['Modelos de nuvem: IaaS, PaaS, serverless', 'Pipelines de entrega contínua', 'Infraestrutura como código', 'Logs, métricas e traces', 'Escalabilidade horizontal e vertical', 'Twelve-Factor App', 'SRE: SLIs, SLOs e incidentes'],
      lessons: [deploy],
      references: ['twelve-factor', 'google-sre', 'aws-well-architected'],
    },
  ],
};

export const level13: Level = {
  id: 'n13', number: 13, title: 'Inteligência Artificial', titleEn: 'Artificial Intelligence',
  goal: 'Entender e construir modelos de aprendizado de máquina desde os fundamentos, e usar IA com responsabilidade.',
  why: 'IA está mudando como o software é construído e usado. Entender os fundamentos — dados, otimização, avaliação, limitações — evita tanto o deslumbramento quanto o medo, e prepara para usar e construir sistemas de IA de forma crítica.',
  modules: [
    {
      id: 'm13-1', levelId: 'n13', title: 'Fundamentos de machine learning', titleEn: 'Machine learning fundamentals',
      description: 'Aprender com dados e avaliar com honestidade.',
      prerequisites: ['m2-5', 'm14-2'],
      skills: [{ id: 'ia-ml', pt: 'Machine learning', en: 'Machine learning' }],
      outline: ['Supervisionado × não supervisionado', 'Treino, validação e teste', 'Regressão linear e gradiente descendente', 'k-NN e regressão logística', 'Overfitting e regularização', 'Métricas'],
      lessons: [ml],
      references: ['stanford-cs229', 'google-ml-crash'],
    },
    {
      id: 'm13-2', levelId: 'n13', title: 'Redes neurais', titleEn: 'Neural networks',
      description: 'Do perceptron ao deep learning.',
      prerequisites: ['m13-1', 'm14-4'],
      skills: [{ id: 'ia-redes-neurais', pt: 'Redes neurais', en: 'Neural networks' }],
      outline: ['Perceptron', 'Ativações', 'Retropropagação', 'CNNs', 'Transformers e atenção', 'PyTorch'],
      lessons: [redesNeurais],
      references: ['goodfellow-dl', 'stanford-cs231n'],
    },
    {
      id: 'm13-3', levelId: 'n13', title: 'IA generativa e uso responsável', titleEn: 'Generative AI and responsible use',
      description: 'LLMs, limitações e ética.',
      prerequisites: ['m13-1'],
      skills: [{ id: 'ia-generativa', pt: 'IA generativa e uso responsável', en: 'Generative AI and responsible use' }],
      outline: ['Tokens e previsão do próximo token', 'Alucinações', 'Prompts e contexto', 'IA para aprender (não para pular etapas)', 'Privacidade, licenças e segurança', 'Vieses e impacto social'],
      lessons: [iaGen],
      references: ['stanford-cs224n', 'nist-ai-rmf'],
    },
  ],
};

export const level14: Level = {
  id: 'n14', number: 14, title: 'Matemática para Computação', titleEn: 'Mathematics for Computing',
  goal: 'Dominar a matemática que sustenta algoritmos, segurança e IA — sempre conectada ao código.',
  why: 'Matemática discreta é a linguagem da computação: lógica para condições e provas, combinatória para contar casos, probabilidade para algoritmos e IA, álgebra linear para gráficos e redes neurais. Os módulos deste nível são pré-requisitos de outros e podem ser feitos em paralelo à trilha.',
  modules: [
    {
      id: 'm14-1', levelId: 'n14', title: 'Lógica e conjuntos', titleEn: 'Logic and sets',
      description: 'Proposições, tabelas-verdade, De Morgan e conjuntos.',
      prerequisites: ['m1-3'],
      skills: [{ id: 'mat-logica', pt: 'Lógica e conjuntos', en: 'Logic and sets' }],
      outline: ['Proposições e conectivos', 'Tabelas-verdade', 'De Morgan', 'Implicação e equivalência', 'Conjuntos e relações', 'Quantificadores'],
      lessons: [logica],
      references: ['mit-6042', 'rosen-discrete'],
    },
    {
      id: 'm14-2', levelId: 'n14', title: 'Combinatória e probabilidade', titleEn: 'Combinatorics and probability',
      description: 'Contar, estimar e raciocinar sob incerteza.',
      prerequisites: ['m14-1', 'm1-4'],
      skills: [{ id: 'mat-probabilidade', pt: 'Combinatória e probabilidade', en: 'Combinatorics and probability' }],
      outline: ['Princípio multiplicativo', 'Permutações e combinações', 'Probabilidade condicional e Bayes', 'Valor esperado', 'Estatística descritiva', 'Monte Carlo'],
      lessons: [prob],
      references: ['mit-6042', 'harvard-stat110'],
    },
    {
      id: 'm14-3', levelId: 'n14', title: 'Matemática discreta: indução, recorrências e grafos', titleEn: 'Discrete math: induction, recurrences and graphs',
      description: 'Provar que algoritmos funcionam e quanto custam.',
      prerequisites: ['m14-1', 'm4-4'],
      skills: [{ id: 'mat-discreta', pt: 'Matemática discreta', en: 'Discrete mathematics' }],
      outline: ['Indução matemática', 'Invariantes de laço e corretude', 'Recorrências e Teorema Mestre', 'Teoria dos grafos', 'Aritmética modular (base da criptografia)'],
      lessons: [discreta],
      references: ['mit-6042', 'rosen-discrete', 'clrs'],
    },
    {
      id: 'm14-4', levelId: 'n14', title: 'Álgebra linear e cálculo para IA', titleEn: 'Linear algebra and calculus for AI',
      description: 'Vetores, matrizes, derivadas e gradientes.',
      prerequisites: ['m14-2', 'm2-2'],
      skills: [{ id: 'mat-algebra', pt: 'Álgebra linear e cálculo', en: 'Linear algebra and calculus' }],
      outline: ['Vetores e produto escalar', 'Matrizes e multiplicação', 'Transformações lineares', 'Derivadas e regra da cadeia', 'Gradiente', 'Aplicações: gráficos, recomendação, redes neurais'],
      lessons: [algebra],
      references: ['mit-1806', 'mml-book'],
    },
  ],
};

