/**
 * Lições dos módulos que antes eram só roteiro (parte B): criptografia aplicada,
 * deploy e observabilidade, matemática discreta e álgebra linear para IA.
 */
import { code, dedent, deep, english, info, lesson, md, py, t, warn } from '../helpers.ts';

/* ========================= m11-3 Criptografia aplicada ========================= */

export const cripto = lesson({
  id: 'l11-criptografia',
  moduleId: 'm11-3',
  title: 'Criptografia aplicada: cifras, HMAC, assinaturas e TLS',
  titleEn: 'Applied cryptography: ciphers, HMAC, signatures and TLS',
  summary: 'O que cada ferramenta criptográfica garante, como elas se combinam no HTTPS e por que nunca se inventa a própria criptografia.',
  minutes: 50,
  objectives: [
    'Diferenciar hash, HMAC, cifra simétrica, cifra assimétrica e assinatura digital',
    'Dizer qual propriedade (sigilo, integridade, autenticidade) cada uma oferece',
    'Usar HMAC corretamente, com comparação em tempo constante',
    'Explicar, com RSA de brinquedo, por que a chave pública não revela a privada',
  ],
  skills: ['seg-cripto'],
  terms: [
    t('cifra simétrica', 'symmetric cipher', 'A mesma chave cifra e decifra.', 'AES-GCM'),
    t('cifra assimétrica', 'asymmetric (public-key) cryptography', 'Par de chaves: a pública cifra ou verifica; a privada decifra ou assina.', 'RSA, curvas elípticas'),
    t('assinatura digital', 'digital signature', 'Prova de que a mensagem veio do dono da chave privada e não foi alterada.'),
    t('código de autenticação de mensagem', 'message authentication code (MAC)', 'Etiqueta calculada com uma chave secreta compartilhada; o HMAC é o mais comum.'),
    t('troca de chaves', 'key exchange', 'Protocolo para dois lados combinarem uma chave secreta por um canal inseguro.', 'Diffie-Hellman'),
    t('nonce', 'nonce', 'Número usado uma única vez; reutilizá-lo pode quebrar a cifra.'),
    t('ataque de temporização', 'timing attack', 'Descobrir segredos medindo quanto tempo uma operação demora.'),
  ],
  stages: {
    conceito: [
      md('Criptografia é uma caixa de ferramentas, e cada ferramenta garante uma coisa diferente: **sigilo** (ninguém lê), **integridade** (ninguém altera sem ser notado) e **autenticidade** (veio de quem diz ter vindo). Usar a ferramenta errada é o erro mais comum: cifrar não garante integridade, e um hash simples não garante autenticidade.'),
    ],
    explicacao: [
      md(`
        | Ferramenta | Chave | Garante | Exemplo de uso |
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
        - Gere segredos com \`secrets\`, nunca com \`random\`.
      `),
      warn('Base64 não é criptografia: é só uma forma de escrever bytes como texto, e qualquer um decodifica. "Senha em Base64" é senha em texto puro.', 'Mito comum'),
    ],
    exemplo: [
      py(`
        import hashlib, hmac, secrets

        chave = secrets.token_bytes(32)                # segredo compartilhado entre servidor e parceiro
        corpo = b'{"pedido": 42, "status": "pago"}'

        etiqueta = hmac.new(chave, corpo, hashlib.sha256).hexdigest()
        print("HMAC:", etiqueta[:16], "...")

        # Quem recebe recalcula e compara em tempo constante
        adulterado = b'{"pedido": 42, "status": "cancelado"}'
        for msg in [corpo, adulterado]:
            ok = hmac.compare_digest(etiqueta, hmac.new(chave, msg, hashlib.sha256).hexdigest())
            print(msg.decode(), "->", "autêntico" if ok else "REJEITAR")
      `),
    ],
    codigo: [
      py(`
        # RSA de brinquedo (números minúsculos: NUNCA use assim de verdade)
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
        print("assinatura confere?", pow(assinatura, e, n) == mensagem)
      `, { caption: 'A segurança real vem de n ter mais de 600 dígitos: fatorar n para achar p e q fica inviável.' }),
      deep('O RSA "de livro" acima é inseguro mesmo com números grandes: é determinístico e maleável. Na prática se usa preenchimento (OAEP para cifrar, PSS para assinar) e, cada vez mais, curvas elípticas (X25519 para troca de chaves, Ed25519 para assinaturas), com chaves menores e operações mais rápidas.'),
      english('Read carefully: *"encrypt-then-MAC"*, *"authenticated encryption with associated data (AEAD)"*, *"don\'t roll your own crypto"*, *"constant-time comparison"*, *"key rotation"*, *"forward secrecy"* (a leaked long-term key does not reveal past sessions).'),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e11-cripto-0',
          kind: 'mcq',
          prompt: 'Uma empresa publica uma atualização de software e quer que **qualquer pessoa** consiga verificar que o arquivo veio dela e não foi alterado. Qual ferramenta usar?',
          difficulty: 'facil',
          skills: ['seg-cripto'],
          hints: ['O verificador não pode ter um segredo (qualquer um verifica).', 'Precisa de autenticidade, não de sigilo.'],
          explanation: '**Assinatura digital**: a empresa assina com a chave privada; qualquer um verifica com a pública. HMAC exigiria compartilhar o segredo com todos, e aí qualquer um poderia forjar.',
          options: [
            { text: 'Publicar o SHA-256 do arquivo no mesmo site', feedback: 'Se o atacante troca o arquivo, troca o hash também. Hash sozinho não autentica.' },
            { text: 'HMAC com uma chave secreta', feedback: 'Para verificar, todos precisariam da chave, e então poderiam forjar.' },
            { text: 'Assinatura digital com a chave privada da empresa', correct: true, feedback: 'Isso: verificável por qualquer um, forjável por ninguém.' },
            { text: 'Cifrar o arquivo com AES', feedback: 'Cifrar dá sigilo, e o arquivo é público.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e11-cripto-1',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Um parceiro envia *webhooks* com o cabeçalho \`X-Assinatura\` = HMAC-SHA256 do corpo, em hexadecimal.
            Escreva \`assinar(chave, corpo)\` (ambos \`bytes\`, devolve a etiqueta em hex) e
            \`verificar(chave, corpo, etiqueta)\`, que devolve \`True\`/\`False\` usando **comparação em tempo constante**.
          `),
          difficulty: 'intermediario',
          skills: ['seg-cripto'],
          hints: ['hmac.new(chave, corpo, hashlib.sha256).hexdigest()', 'hmac.compare_digest(a, b) compara sem vazar tempo.'],
          explanation: 'Com `==`, a comparação para no primeiro caractere diferente; medindo o tempo de muitas tentativas, um atacante descobre a etiqueta caractere a caractere. `compare_digest` sempre leva o mesmo tempo.',
          starter: 'import hashlib\nimport hmac\n\ndef assinar(chave, corpo):\n    pass\n\ndef verificar(chave, corpo, etiqueta):\n    pass\n',
          solution: dedent(`
            import hashlib
            import hmac

            def assinar(chave, corpo):
                return hmac.new(chave, corpo, hashlib.sha256).hexdigest()

            def verificar(chave, corpo, etiqueta):
                return hmac.compare_digest(assinar(chave, corpo), etiqueta)
          `),
          tests: [
            { name: 'valor conhecido', code: 'import hashlib, hmac\nassert assinar(b"k", b"oi") == hmac.new(b"k", b"oi", hashlib.sha256).hexdigest()' },
            { name: 'verifica e rejeita', code: 'e = assinar(b"segredo", b"corpo")\nassert verificar(b"segredo", b"corpo", e)\nassert not verificar(b"segredo", b"corpo!", e)\nassert not verificar(b"outra", b"corpo", e)' },
            { name: 'usa compare_digest', code: 'assert "compare_digest" in _source, "use hmac.compare_digest para comparar"' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e11-cripto-2',
          kind: 'mcq',
          prompt: 'No TLS, por que os dados da conexão são cifrados com uma cifra **simétrica**, e não com a chave pública do servidor?',
          difficulty: 'intermediario',
          skills: ['seg-cripto'],
          hints: ['Compare o custo de uma operação RSA com o de cifrar um bloco com AES.'],
          explanation: 'Cifras simétricas são ordens de grandeza mais rápidas (e têm suporte em hardware). A criptografia assimétrica é usada só no começo, para autenticar o servidor e combinar a chave simétrica.',
          options: [
            { text: 'Porque cifras simétricas são muito mais rápidas', correct: true, feedback: 'Isso: o assimétrico só combina a chave.' },
            { text: 'Porque a chave pública é secreta', feedback: 'A chave pública é, por definição, pública.' },
            { text: 'Porque cifras assimétricas não funcionam na internet', feedback: 'Funcionam; são usadas no handshake.' },
            { text: 'Por compatibilidade com HTTP/1.0', feedback: 'Não tem relação com a versão do HTTP.' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e11-cripto-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Implemente RSA de brinquedo:

            - \`gerar_chaves(p, q, e)\` devolve \`((e, n), (d, n))\`, com \`n = p*q\` e \`d\` o inverso de \`e\` módulo \`(p-1)(q-1)\`;
            - \`cifrar(m, publica)\` e \`decifrar(c, privada)\`;
            - \`assinar(m, privada)\` e \`verificar(m, assinatura, publica)\` (devolve booleano).

            Use \`pow(base, expoente, modulo)\` e \`pow(e, -1, phi)\`.
          `),
          difficulty: 'desafio',
          skills: ['seg-cripto'],
          hints: ['phi = (p - 1) * (q - 1)', 'Cifrar: m^e mod n. Decifrar: c^d mod n.', 'Assinar é "decifrar" a mensagem com a privada; verificar é "cifrar" a assinatura com a pública e comparar.'],
          explanation: 'Funciona porque m^(e·d) ≡ m (mod n) quando e·d ≡ 1 (mod φ(n)) (teorema de Euler). Quem só tem (e, n) precisaria de φ(n), o que exige fatorar n.',
          starter: 'def gerar_chaves(p, q, e):\n    pass\n\ndef cifrar(m, publica):\n    pass\n\ndef decifrar(c, privada):\n    pass\n\ndef assinar(m, privada):\n    pass\n\ndef verificar(m, assinatura, publica):\n    pass\n',
          solution: dedent(`
            def gerar_chaves(p, q, e):
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
                return pow(assinatura, e, n) == m
          `),
          tests: [
            { name: 'chaves clássicas', code: 'assert gerar_chaves(61, 53, 17) == ((17, 3233), (2753, 3233))' },
            { name: 'cifrar e decifrar', code: 'pub, priv = gerar_chaves(61, 53, 17)\nassert cifrar(65, pub) == 2790\nassert all(decifrar(cifrar(m, pub), priv) == m for m in range(2, 300))' },
            { name: 'assinatura', code: 'pub, priv = gerar_chaves(61, 53, 17)\ns = assinar(123, priv)\nassert verificar(123, s, pub) and not verificar(124, s, pub)' },
          ],
        },
      },
    ],
    projeto: [md('**Mini-projeto**: no seu projeto de API, receba um *webhook* assinado com HMAC (simule o parceiro com um script), rejeite assinaturas inválidas com 401 e evite *replay*: inclua um carimbo de tempo no conteúdo assinado e recuse mensagens com mais de 5 minutos.')],
    revisao: [
      md(`
        - Hash: integridade acidental. HMAC: integridade + autenticidade com segredo compartilhado.
        - Simétrica autenticada (AES-GCM) para dados; assimétrica para combinar chaves e assinar.
        - TLS: certificado → troca de chaves ECDHE → cifra simétrica.
        - Não invente cripto; não reutilize nonce; compare em tempo constante; segredos com \`secrets\`.
      `),
    ],
  },
  review: [
    ['Que propriedade o HMAC garante que o hash simples não garante?', 'Autenticidade: só quem tem a chave secreta consegue gerar a etiqueta correta.'],
    ['Por que usar hmac.compare_digest em vez de ==?', 'Para comparar em tempo constante e evitar ataques de temporização.'],
    ['No RSA, o que é público e o que é privado?', 'Público: (e, n). Privado: d (e os primos p e q).'],
    ['Como o HTTPS combina criptografia assimétrica e simétrica?', 'Usa a assimétrica para autenticar o servidor e combinar uma chave; cifra os dados com a simétrica, que é mais rápida.'],
  ],
  references: ['stanford-cs255', 'owasp-cheatsheets'],
});

/* ========================= m12-3 Deploy, CI/CD e observabilidade ========================= */

export const deploy = lesson({
  id: 'l12-deploy-observabilidade',
  moduleId: 'm12-3',
  title: 'Deploy, CI/CD e observabilidade',
  titleEn: 'Deployment, CI/CD and observability',
  summary: 'Levar código à produção com segurança e repetibilidade, e saber o que está acontecendo lá: pipelines, configuração, logs, métricas, SLOs e incidentes.',
  minutes: 50,
  objectives: [
    'Montar as etapas de um pipeline de CI/CD',
    'Aplicar princípios do Twelve-Factor App (configuração no ambiente, processos sem estado)',
    'Calcular percentis de latência, taxa de erro e orçamento de erros de um SLO',
    'Escolher uma estratégia de deploy (rolling, blue-green, canário) e de rollback',
  ],
  skills: ['devops-deploy'],
  terms: [
    t('integração contínua', 'continuous integration (CI)', 'Integrar e testar automaticamente cada mudança no repositório principal.'),
    t('entrega contínua', 'continuous delivery (CD)', 'Manter o software sempre pronto para ir à produção com um clique (ou automaticamente).'),
    t('infraestrutura como código', 'infrastructure as code (IaC)', 'Descrever servidores, redes e permissões em arquivos versionados.', 'Terraform'),
    t('observabilidade', 'observability', 'Capacidade de entender o estado interno do sistema pelos sinais que ele emite: logs, métricas e traces.'),
    t('percentil', 'percentile', 'p95 = valor abaixo do qual estão 95% das medições.'),
    t('objetivo de nível de serviço', 'service level objective (SLO)', 'Meta de confiabilidade, como "99,9% das requisições com sucesso em 30 dias".'),
    t('orçamento de erros', 'error budget', 'Quanto de falha o SLO permite; gastá-lo todo é sinal para frear mudanças arriscadas.'),
    t('implantação canário', 'canary deployment', 'Liberar a versão nova para uma pequena fração do tráfego antes de todos.'),
  ],
  stages: {
    conceito: [
      md('"Funciona na minha máquina" não basta. **Deploy** confiável é **automatizado** (um pipeline faz sempre os mesmos passos), **reversível** (dá para voltar rápido) e **observável** (você vê, com dados, se a versão nova está saudável). Quanto menores e mais frequentes as mudanças, menor o risco de cada uma.'),
    ],
    explicacao: [
      md(`
        ### Pipeline típico

        Cada *push* dispara: checkout → instalar dependências → lint e verificação de tipos → testes → build da imagem → deploy em homologação (*staging*) → testes de fumaça → deploy em produção. Se qualquer etapa falha, o pipeline para.

        ### Twelve-Factor, os pontos que mais importam

        - **Configuração no ambiente**: URLs, chaves e flags vêm de variáveis de ambiente, não do código. O mesmo artefato roda em qualquer ambiente.
        - **Processos sem estado**: nada importante fica no disco ou na memória do processo; sessões e arquivos vão para banco, cache ou armazenamento de objetos. Assim dá para **escalar horizontalmente** (mais cópias) e substituir instâncias à vontade.
        - **Logs como fluxo de eventos**: escreva na saída padrão; a plataforma coleta.

        ### Os três sinais

        - **Logs**: eventos detalhados, de preferência estruturados (JSON), com um id de requisição.
        - **Métricas**: números agregados ao longo do tempo: taxa de requisições, taxa de erros, latência (em **percentis**: a média esconde os usuários que esperam muito).
        - **Traces**: o caminho de uma requisição por vários serviços, com o tempo de cada trecho.

        ### SLO e orçamento de erros

        Com SLO de 99,9% e 1 milhão de requisições no mês, o **orçamento** é 1 000 falhas. Sobrou orçamento: pode arriscar mais. Acabou: prioridade é confiabilidade. Em incidentes, primeiro **mitigue** (rollback), depois investigue, e escreva um **postmortem sem culpados**.

        ### Estratégias de deploy

        **Rolling** (troca instâncias aos poucos), **blue-green** (duas produções, troca o tráfego de uma vez, volta na hora), **canário** (1% → 10% → 100%, comparando métricas da versão nova com a antiga).
      `),
      info('Esta plataforma tem um pipeline real em `.github/workflows/ci.yml` (tipos, testes, verificação das soluções, build e testes no navegador) e um `Dockerfile` de várias etapas que roda como usuário sem privilégios, com healthcheck em `/api/health`.', 'Veja um exemplo de verdade'),
    ],
    exemplo: [
      code('text', `
        # .github/workflows/ci.yml (resumido)
        name: CI
        on: [push, pull_request]
        jobs:
          check:
            runs-on: ubuntu-latest
            steps:
              - uses: actions/checkout@v4
              - uses: actions/setup-node@v4
                with: { node-version: 22, cache: npm }
              - run: npm ci
              - run: npm run typecheck
              - run: npm test
              - run: npm run build
      `, 'Cada passo só roda se o anterior passou. O mesmo arquivo serve de documentação de como montar o projeto.'),
    ],
    codigo: [
      py(`
        import json, math

        logs = [
            '{"rota": "/api/tarefas", "status": 200, "ms": 35}',
            '{"rota": "/api/tarefas", "status": 200, "ms": 41}',
            '{"rota": "/api/tarefas", "status": 500, "ms": 1200}',
            '{"rota": "/api/tarefas", "status": 200, "ms": 38}',
            '{"rota": "/api/tarefas", "status": 200, "ms": 950}',
        ]
        eventos = [json.loads(l) for l in logs]
        lat = sorted(e["ms"] for e in eventos)
        media = sum(lat) / len(lat)
        p95 = lat[math.ceil(0.95 * len(lat)) - 1]
        erros = sum(e["status"] >= 500 for e in eventos) / len(eventos)
        print(f"média {media:.0f} ms | p95 {p95} ms | erros {erros:.0%}")
      `, { caption: 'Logs estruturados viram métricas com poucas linhas. Repare como a média esconde a cauda lenta.' }),
      english('On-call vocabulary: *"page"* (alert someone), *"incident"*, *"mitigate"*, *"roll back"*, *"root cause"*, *"blameless postmortem"*, *"action items"*, *"runbook"*.'),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e12-deploy-0',
          kind: 'mcq',
          prompt: 'Onde, segundo o Twelve-Factor App, deve ficar a URL do banco de dados de produção?',
          difficulty: 'facil',
          skills: ['devops-deploy'],
          hints: ['O mesmo build precisa rodar em desenvolvimento, homologação e produção.'],
          explanation: 'Em **variáveis de ambiente** (ou num cofre de segredos que as injeta). Assim o artefato é idêntico entre ambientes e segredos não vão para o repositório.',
          options: [
            { text: 'Numa constante no código', feedback: 'Exigiria um build por ambiente e exporia segredos no repositório.' },
            { text: 'Numa variável de ambiente', correct: true, feedback: 'Isso: configuração separada do código.' },
            { text: 'Num arquivo dentro da imagem Docker', feedback: 'A imagem deveria ser a mesma em todos os ambientes.' },
            { text: 'No README', feedback: 'Documentação não é configuração, e o segredo ficaria público.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e12-deploy-1',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Escreva \`orcamento(slo, total)\`, o número de falhas permitidas (inteiro, arredondado) para \`total\` requisições,
            e \`situacao(slo, total, falhas)\` que devolve \`"ok"\` se as falhas forem até metade do orçamento,
            \`"atenção"\` se passarem da metade mas não do orçamento, e \`"congelar"\` se passarem do orçamento.
          `),
          difficulty: 'intermediario',
          skills: ['devops-deploy'],
          hints: ['Falhas permitidas = total × (1 − slo).', 'Contas com float como 1 − 0.999 têm erro de arredondamento: use round().'],
          explanation: 'Times de SRE usam o orçamento de erros para equilibrar velocidade e estabilidade: "congelar" significa pausar lançamentos arriscados até a confiabilidade voltar.',
          starter: 'def orcamento(slo, total):\n    pass\n\ndef situacao(slo, total, falhas):\n    pass\n',
          solution: dedent(`
            def orcamento(slo, total):
                return round(total * (1 - slo))

            def situacao(slo, total, falhas):
                b = orcamento(slo, total)
                if falhas > b:
                    return "congelar"
                if falhas > b / 2:
                    return "atenção"
                return "ok"
          `),
          tests: [
            { name: 'orçamento', code: 'assert orcamento(0.999, 1_000_000) == 1000\nassert orcamento(0.99, 5000) == 50' },
            { name: 'situações', code: 'assert situacao(0.999, 1_000_000, 300) == "ok"\nassert situacao(0.999, 1_000_000, 700) == "atenção"\nassert situacao(0.999, 1_000_000, 1001) == "congelar"' },
            { name: 'limites', code: 'assert situacao(0.99, 5000, 25) == "ok"\nassert situacao(0.99, 5000, 50) == "atenção"' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e12-deploy-2',
          kind: 'parsons',
          lang: 'text',
          prompt: 'Ordene as etapas de um pipeline de CI/CD.',
          lines: ['checkout do código', 'instalar dependências', 'lint e verificação de tipos', 'testes automatizados', 'build da imagem', 'deploy em homologação', 'testes de fumaça', 'deploy em produção'],
          difficulty: 'facil',
          skills: ['devops-deploy'],
          hints: ['Verificações baratas e rápidas vêm primeiro.', 'Produção é sempre o último passo, depois de validar em homologação.'],
          explanation: 'Falhar cedo é mais barato: lint e tipos levam segundos; testes, minutos; um deploy quebrado em produção custa usuários.',
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e12-deploy-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Automatize a decisão de um **deploy canário**. \`decidir(base, canario)\` recebe duas listas de requisições, cada uma
            uma tupla \`(status, ms)\`, e devolve:

            - \`"reverter"\` se a taxa de erro (status >= 500) do canário for maior que a da base **mais 1 ponto percentual**,
              ou se o p95 de latência do canário for mais de 20% maior que o da base;
            - \`"promover"\` caso contrário.

            Use p95 pelo método do **posto mais próximo**: ordene e pegue o elemento de índice \`ceil(0,95 × n) − 1\`.
          `),
          difficulty: 'desafio',
          skills: ['devops-deploy'],
          hints: ['Escreva funções auxiliares taxa_erro(reqs) e p95(reqs).', '"1 ponto percentual" é somar 0.01 à taxa da base.', '"20% maior" é comparar com p95_base × 1.2.'],
          explanation: 'Sistemas de entrega progressiva (Argo Rollouts, Flagger, o canário do Google Cloud) fazem exatamente essa comparação estatística, de forma contínua, e revertem sozinhos.',
          starter: 'import math\n\ndef decidir(base, canario):\n    return "promover"\n',
          solution: dedent(`
            import math

            def taxa_erro(reqs):
                return sum(1 for s, _ in reqs if s >= 500) / len(reqs)

            def p95(reqs):
                lat = sorted(ms for _, ms in reqs)
                return lat[math.ceil(0.95 * len(lat)) - 1]

            def decidir(base, canario):
                if taxa_erro(canario) > taxa_erro(base) + 0.01:
                    return "reverter"
                if p95(canario) > p95(base) * 1.2:
                    return "reverter"
                return "promover"
          `),
          tests: [
            { name: 'saudável', code: 'base = [(200, 50)] * 99 + [(500, 60)]\ncan = [(200, 52)] * 99 + [(500, 61)]\nassert decidir(base, can) == "promover"' },
            { name: 'mais erros', code: 'base = [(200, 50)] * 100\ncan = [(200, 50)] * 97 + [(503, 50)] * 3\nassert decidir(base, can) == "reverter"' },
            { name: 'mais lento', code: 'base = [(200, 100)] * 100\ncan = [(200, 100)] * 90 + [(200, 400)] * 10\nassert decidir(base, can) == "reverter"' },
          ],
        },
      },
    ],
    projeto: [md('**Mini-projeto**: no seu projeto full-stack, crie um pipeline no GitHub Actions com tipos, testes e build; adicione um endpoint `/health`; troque todo valor sensível por variável de ambiente (com um `.env.example` documentado); e escreva logs estruturados em JSON com um id por requisição.')],
    revisao: [
      md(`
        - Pipeline: verificações rápidas primeiro; produção por último; tudo automatizado.
        - Config no ambiente; processos sem estado; logs na saída padrão.
        - Logs, métricas (percentis!) e traces.
        - SLO → orçamento de erros → decide o ritmo de mudanças.
        - Rolling, blue-green, canário; mitigar antes de investigar; postmortem sem culpados.
      `),
      deep('Leia os capítulos "Service Level Objectives" e "Postmortem Culture" do livro de SRE do Google (gratuito on-line) e o site do Twelve-Factor App inteiro: é curto e muda a forma como se escreve software para a nuvem.'),
    ],
  },
  review: [
    ['O que é orçamento de erros?', 'A quantidade de falhas permitida pelo SLO num período; quando acaba, a prioridade vira confiabilidade.'],
    ['Por que usar percentis em vez da média para latência?', 'Porque a média esconde a cauda: poucos usuários muito lentos somem na média.'],
    ['Os três sinais de observabilidade?', 'Logs, métricas e traces.'],
    ['O que é um deploy canário?', 'Liberar a versão nova para uma fração pequena do tráfego e comparar com a antiga antes de liberar para todos.'],
  ],
  references: ['twelve-factor', 'google-sre', 'aws-well-architected'],
});

/* ========================= m14-3 Matemática discreta ========================= */

export const discreta = lesson({
  id: 'l14-discreta',
  moduleId: 'm14-3',
  title: 'Indução, invariantes, recorrências, grafos e aritmética modular',
  titleEn: 'Induction, invariants, recurrences, graphs and modular arithmetic',
  summary: 'As ferramentas para provar que um algoritmo está certo, calcular quanto ele custa e trabalhar com os números da criptografia.',
  minutes: 55,
  objectives: [
    'Escrever uma prova por indução simples',
    'Usar um invariante de laço para justificar a corretude de um algoritmo',
    'Resolver recorrências comuns e aplicar o Teorema Mestre',
    'Usar aritmética modular e exponenciação rápida',
  ],
  skills: ['mat-discreta'],
  terms: [
    t('indução matemática', 'mathematical induction', 'Provar P(0) e que P(k) implica P(k+1); então P vale para todo n.'),
    t('invariante de laço', 'loop invariant', 'Propriedade verdadeira antes e depois de cada volta do laço.'),
    t('relação de recorrência', 'recurrence relation', 'Equação que define T(n) em termos de valores menores, como T(n) = 2T(n/2) + n.'),
    t('Teorema Mestre', 'Master Theorem', 'Fórmula pronta para recorrências de divisão e conquista.'),
    t('grafo bipartido', 'bipartite graph', 'Grafo cujos vértices se dividem em dois grupos, com arestas só entre grupos.'),
    t('aritmética modular', 'modular arithmetic', 'Contas "no relógio": só importa o resto da divisão por m.'),
    t('exponenciação rápida', 'exponentiation by squaring', 'Calcular b^e em O(log e) multiplicações.'),
  ],
  stages: {
    conceito: [
      md('Testes mostram que um programa funciona **nos casos testados**. Matemática discreta permite afirmar que ele funciona **em todos os casos**, e calcular quanto custa sem rodar. Indução é o "laço" das provas: prove o primeiro caso e que cada caso garante o próximo.'),
    ],
    explicacao: [
      md(`
        ### Indução

        Afirmação: 1 + 3 + 5 + … + (2n − 1) = n².
        - **Base**: n = 1 → 1 = 1². ✓
        - **Passo**: suponha que vale para k (hipótese de indução). Então 1 + … + (2k − 1) + (2k + 1) = k² + 2k + 1 = (k + 1)². ✓

        ### Invariantes de laço

        Para provar que \`maximo(lista)\` está certo: **invariante** "antes da volta i, \`m\` é o maior entre \`lista[0..i-1]\`". Vale no início, cada volta mantém, e ao final (i = n) diz exatamente o que queremos. É indução aplicada a um laço; é também como se raciocina sobre busca binária sem errar os índices.

        ### Recorrências

        - Busca binária: T(n) = T(n/2) + 1 → **O(log n)**.
        - Merge sort: T(n) = 2T(n/2) + n → **O(n log n)**.
        - Torre de Hanói: T(n) = 2T(n − 1) + 1 → **2ⁿ − 1** (exponencial!).

        **Teorema Mestre** para T(n) = a·T(n/b) + O(n^d): compare d com log_b(a).
        Se d > log_b a → O(n^d); se d = log_b a → O(n^d log n); se d < log_b a → O(n^(log_b a)).

        ### Grafos

        Vértices e arestas modelam redes, dependências, mapas. Fatos úteis: a soma dos graus é 2 × arestas; uma árvore com n vértices tem n − 1 arestas; um grafo é **bipartido** se e só se não tem ciclo ímpar (dá para testar colorindo com duas cores numa BFS).

        ### Aritmética modular

        (a + b) mod m = ((a mod m) + (b mod m)) mod m, e o mesmo vale para a multiplicação. Isso permite calcular 7^1000 mod 13 sem números gigantes. **Exponenciação rápida**: b^e = (b^(e/2))² se e é par, b·b^(e−1) se é ímpar → O(log e) multiplicações. É a operação central do RSA e do Diffie-Hellman.
      `),
    ],
    exemplo: [
      py(`
        # Testando (não provando!) a fórmula para muitos n — útil para achar erros antes de tentar provar
        print(all(sum(2 * i - 1 for i in range(1, n + 1)) == n * n for n in range(1, 500)))

        def hanoi(n, origem="A", destino="C", aux="B", movimentos=None):
            if movimentos is None:
                movimentos = []
            if n > 0:
                hanoi(n - 1, origem, aux, destino, movimentos)
                movimentos.append((origem, destino))
                hanoi(n - 1, aux, destino, origem, movimentos)
            return movimentos

        for n in range(1, 8):
            print(n, "discos:", len(hanoi(n)), "movimentos; 2^n - 1 =", 2**n - 1)
      `),
    ],
    codigo: [
      trace0(),
      py(`
        print(pow(7, 1000, 13))        # Python já tem exponenciação modular rápida
        print((123456789 * 987654321) % 97 == ((123456789 % 97) * (987654321 % 97)) % 97)
      `),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e14-disc-0',
          kind: 'mcq',
          prompt: 'Numa prova por indução, o que se precisa mostrar no **passo indutivo**?',
          difficulty: 'facil',
          skills: ['mat-discreta'],
          hints: ['A base cuida do primeiro caso. O passo liga cada caso ao seguinte.'],
          explanation: 'Que, **supondo** P(k) verdadeira (hipótese de indução), P(k + 1) também é. Junto com a base, isso cobre todos os n, como dominós em fila.',
          options: [
            { text: 'Que P(n) vale para n = 0, 1 e 2', feedback: 'Exemplos não provam o caso geral.' },
            { text: 'Que se P(k) vale, então P(k + 1) vale', correct: true, feedback: 'Isso: cada dominó derruba o próximo.' },
            { text: 'Que P(k + 1) implica P(k)', feedback: 'É a direção contrária.' },
            { text: 'Que P(n) vale para um n bem grande', feedback: 'Um caso, por maior que seja, não prova todos.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e14-disc-1',
          kind: 'code',
          lang: 'python',
          prompt: 'Implemente `pot_mod(b, e, m)` com **exponenciação rápida** (sem usar `pow` nem `**` com o expoente inteiro), devolvendo b^e mod m.',
          difficulty: 'intermediario',
          skills: ['mat-discreta'],
          hints: ['Percorra os bits de e: enquanto e > 0, se e é ímpar multiplique o resultado por b.', 'A cada volta, b = b * b % m e e = e // 2.', 'Reduza módulo m a cada multiplicação para os números não crescerem.'],
          explanation: 'Com e de 2048 bits, são cerca de 2048 voltas em vez de 2²⁰⁴⁸ multiplicações. O invariante é: resultado × b^e ≡ valor procurado (mod m).',
          starter: 'def pot_mod(b, e, m):\n    pass\n',
          solution: 'def pot_mod(b, e, m):\n    resultado = 1 % m\n    b %= m\n    while e > 0:\n        if e % 2 == 1:\n            resultado = resultado * b % m\n        b = b * b % m\n        e //= 2\n    return resultado\n',
          tests: [
            { name: 'valores', code: 'assert pot_mod(7, 1000, 13) == pow(7, 1000, 13)\nassert pot_mod(2, 10, 1000) == 24\nassert pot_mod(5, 0, 7) == 1' },
            { name: 'grande', code: 'assert pot_mod(123456789, 10**18, 1_000_000_007) == pow(123456789, 10**18, 1_000_000_007)' },
            { name: 'sem pow', code: 'assert "pow(" not in _source and "**" not in _source, "implemente sem pow() e sem **"' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e14-disc-2',
          kind: 'mcq',
          prompt: 'Pelo Teorema Mestre, qual a complexidade de T(n) = 4·T(n/2) + n?',
          difficulty: 'avancado',
          skills: ['mat-discreta'],
          hints: ['a = 4, b = 2, d = 1. Calcule log₂ 4.', 'Compare d com log_b a.'],
          explanation: 'log₂ 4 = 2 > d = 1, então domina o número de subproblemas: **O(n²)**. (É o custo da multiplicação de inteiros "escolar" feita por divisão e conquista ingênua.)',
          options: [
            { text: 'O(n log n)', feedback: 'Seria o caso d = log_b a, como no merge sort (a = 2).' },
            { text: 'O(n²)', correct: true, feedback: 'Isso: log₂ 4 = 2 > 1.' },
            { text: 'O(n)', feedback: 'Seria se d > log_b a.' },
            { text: 'O(2ⁿ)', feedback: 'Recorrências que dividem n por uma constante não ficam exponenciais.' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e14-disc-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Escreva \`bipartido(grafo)\` que recebe um grafo não dirigido como dicionário de listas de adjacência
            (\`{"a": ["b"], "b": ["a"]}\`) e devolve \`True\` se ele for bipartido. O grafo pode ter **várias componentes**.
          `),
          difficulty: 'desafio',
          skills: ['mat-discreta'],
          hints: [
            'Faça uma BFS colorindo cada vizinho com a cor oposta (0/1).',
            'Se encontrar um vizinho já colorido com a mesma cor, não é bipartido.',
            'Repita a BFS a partir de cada vértice ainda sem cor (componentes separadas).',
          ],
          explanation: 'A coloração por BFS é uma prova construtiva: ou produz a divisão em dois grupos, ou encontra uma aresta entre vértices de mesma cor, que fecha um ciclo ímpar. Aplicações: escalas de horários, emparelhamentos, detecção de conflitos.',
          starter: 'from collections import deque\n\ndef bipartido(grafo):\n    return True\n',
          solution: dedent(`
            from collections import deque

            def bipartido(grafo):
                cor = {}
                for inicio in grafo:
                    if inicio in cor:
                        continue
                    cor[inicio] = 0
                    fila = deque([inicio])
                    while fila:
                        v = fila.popleft()
                        for w in grafo[v]:
                            if w not in cor:
                                cor[w] = 1 - cor[v]
                                fila.append(w)
                            elif cor[w] == cor[v]:
                                return False
                return True
          `),
          tests: [
            { name: 'quadrado', code: 'g = {"a": ["b", "d"], "b": ["a", "c"], "c": ["b", "d"], "d": ["c", "a"]}\nassert bipartido(g)' },
            { name: 'triângulo', code: 'g = {1: [2, 3], 2: [1, 3], 3: [1, 2]}\nassert not bipartido(g)' },
            { name: 'duas componentes', code: 'g = {1: [2], 2: [1], 3: [4, 5], 4: [3, 5], 5: [3, 4]}\nassert not bipartido(g)' },
            { name: 'vértice isolado', code: 'assert bipartido({"x": []})' },
          ],
        },
      },
    ],
    projeto: [md('**Mini-projeto**: escolha três algoritmos que você já escreveu na trilha (por exemplo, busca binária, merge sort e BFS). Para cada um, escreva em comentários o **invariante** do laço principal e a **recorrência** do custo, e confira empiricamente contando operações para n = 1 000, 10 000 e 100 000.')],
    revisao: [
      md(`
        - Indução: base + passo (P(k) ⇒ P(k+1)).
        - Invariante de laço: vale antes, é mantido, e no fim dá o resultado.
        - Recorrências: T(n/2)+1 → log n; 2T(n/2)+n → n log n; 2T(n−1)+1 → 2ⁿ.
        - Teorema Mestre: compare d com log_b a.
        - Grafo bipartido ⇔ sem ciclo ímpar; teste com BFS e duas cores.
        - Aritmética modular + exponenciação rápida = base do RSA.
      `),
    ],
  },
  review: [
    ['Quais as duas partes de uma prova por indução?', 'O caso base e o passo indutivo (P(k) implica P(k+1)).'],
    ['O que é um invariante de laço?', 'Uma propriedade verdadeira antes e depois de cada iteração, usada para provar que o laço produz o resultado certo.'],
    ['Solução de T(n) = 2T(n/2) + n?', 'O(n log n).'],
    ['Como testar se um grafo é bipartido?', 'Colorir com duas cores numa BFS; se uma aresta liga vértices de mesma cor, não é.'],
    ['Quantas multiplicações a exponenciação rápida faz?', 'O(log e), uma ou duas por bit do expoente.'],
  ],
  references: ['mit-6042', 'rosen-discrete', 'clrs'],
});

function trace0() {
  return {
    type: 'trace' as const,
    code: dedent(`
      def maximo(lista):
          m = lista[0]
          # invariante: m é o maior de lista[0..i-1]
          for i in range(1, len(lista)):
              if lista[i] > m:
                  m = lista[i]
          return m

      print(maximo([3, 9, 2, 11, 5]))
    `),
    caption: 'Acompanhe passo a passo e confira o invariante a cada volta.',
  };
}

/* ========================= m14-4 Álgebra linear e cálculo para IA ========================= */

export const algebra = lesson({
  id: 'l14-algebra-calculo',
  moduleId: 'm14-4',
  title: 'Vetores, matrizes, derivadas e gradiente',
  titleEn: 'Vectors, matrices, derivatives and gradient',
  summary: 'A matemática por trás de gráficos, recomendação e redes neurais: produto escalar, multiplicação de matrizes, derivadas e a descida do gradiente.',
  minutes: 55,
  objectives: [
    'Calcular produto escalar, norma e similaridade de cosseno',
    'Multiplicar matrizes e interpretar uma matriz como transformação',
    'Estimar derivadas numericamente e aplicar a regra da cadeia',
    'Implementar descida do gradiente para minimizar uma função',
  ],
  skills: ['mat-algebra'],
  terms: [
    t('vetor', 'vector', 'Lista ordenada de números; ponto ou direção num espaço.'),
    t('produto escalar', 'dot product', 'Soma dos produtos coordenada a coordenada; mede alinhamento.'),
    t('norma', 'norm', 'Comprimento de um vetor: raiz do produto escalar dele com ele mesmo.'),
    t('matriz', 'matrix', 'Tabela de números; representa uma transformação linear ou um conjunto de dados.'),
    t('derivada', 'derivative', 'Taxa de variação instantânea de uma função.'),
    t('regra da cadeia', 'chain rule', 'A derivada de f(g(x)) é f\'(g(x)) · g\'(x).'),
    t('gradiente', 'gradient', 'Vetor das derivadas parciais; aponta para onde a função mais cresce.'),
    t('taxa de aprendizado', 'learning rate', 'Tamanho do passo na descida do gradiente.'),
  ],
  stages: {
    conceito: [
      md('Uma imagem é uma matriz de pixels; um usuário pode ser um vetor de gostos; uma camada de rede neural é uma multiplicação de matriz seguida de uma função. **Álgebra linear** dá a linguagem; **cálculo** dá a forma de ajustar os números: o **gradiente** diz em que direção mudar os parâmetros para o erro diminuir.'),
    ],
    explicacao: [
      md(`
        ### Vetores

        - **Produto escalar**: u · v = Σ uᵢvᵢ. Se for 0, os vetores são perpendiculares.
        - **Norma**: ‖u‖ = √(u · u).
        - **Similaridade de cosseno**: (u · v) / (‖u‖‖v‖), entre −1 e 1. Sistemas de recomendação e busca semântica comparam vetores assim.

        ### Matrizes

        O produto C = A·B existe se o número de colunas de A é igual ao de linhas de B; Cᵢⱼ = (linha i de A) · (coluna j de B). Atenção: A·B ≠ B·A em geral. Uma matriz 2×2 transforma o plano: \`[[0, -1], [1, 0]]\` gira 90°; \`[[2, 0], [0, 2]]\` dobra o tamanho. Uma camada de rede neural calcula **y = f(W·x + b)**.

        ### Derivadas e gradiente

        - Derivada: f'(x) ≈ (f(x + h) − f(x − h)) / 2h para h pequeno (diferença central).
        - Regras: (xⁿ)' = n·xⁿ⁻¹; regra da cadeia (f(g(x)))' = f'(g(x))·g'(x). A **retropropagação** das redes neurais é a regra da cadeia aplicada camada por camada.
        - Para funções de várias variáveis, o **gradiente** ∇f reúne as derivadas parciais.

        ### Descida do gradiente

        Para minimizar f: repita **θ ← θ − α·∇f(θ)**, com α (taxa de aprendizado) pequeno. α grande demais faz oscilar ou divergir; pequeno demais, demora.
      `),
    ],
    exemplo: [
      py(`
        import math

        def escalar(u, v):
            return sum(a * b for a, b in zip(u, v))

        def cosseno(u, v):
            return escalar(u, v) / (math.sqrt(escalar(u, u)) * math.sqrt(escalar(v, v)))

        # gostos: [ação, comédia, drama, documentário]
        ana = [5, 1, 4, 0]
        bia = [4, 0, 5, 1]
        caio = [0, 5, 1, 4]
        print("ana~bia:", round(cosseno(ana, bia), 2), " ana~caio:", round(cosseno(ana, caio), 2))
      `),
    ],
    codigo: [
      py(`
        def f(x):
            return (x - 3) ** 2 + 1      # mínimo em x = 3

        def derivada(f, x, h=1e-5):
            return (f(x + h) - f(x - h)) / (2 * h)

        x, alfa = 10.0, 0.1
        for passo in range(30):
            x -= alfa * derivada(f, x)
            if passo % 5 == 0:
                print(f"passo {passo:2}: x = {x:.4f}, f(x) = {f(x):.4f}")
        print("chegou perto de 3?", round(x, 3))
      `, { caption: 'Troque alfa para 1.1 e veja a descida divergir.' }),
      { type: 'viz', viz: 'neuron', caption: 'Um neurônio artificial: produto escalar dos pesos com a entrada, mais o viés, passando por uma ativação.' },
      english('In ML papers: *"we minimize the loss with stochastic gradient descent (SGD)"*, *"the gradient vanishes"*, *"matrix multiplication (matmul)"*, *"embedding vectors"*, *"cosine similarity"*.'),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e14-alg-0',
          kind: 'mcq',
          prompt: 'Qual o produto escalar de u = (2, −1, 3) e v = (1, 5, 1)?',
          difficulty: 'facil',
          skills: ['mat-algebra'],
          hints: ['Multiplique coordenada a coordenada e some.'],
          explanation: '2·1 + (−1)·5 + 3·1 = 2 − 5 + 3 = **0**: os vetores são perpendiculares.',
          options: [
            { text: '0', correct: true, feedback: 'Isso, e por isso são perpendiculares.' },
            { text: '10', feedback: 'Confira o sinal de (−1)·5.' },
            { text: '(2, −5, 3)', feedback: 'Isso é o produto coordenada a coordenada; falta somar.' },
            { text: '6', feedback: 'Refaça a soma: 2 − 5 + 3.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e14-alg-1',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Escreva \`matmul(A, B)\` para matrizes como listas de listas. Se as dimensões forem incompatíveis,
            lance \`ValueError("dimensões incompatíveis")\`.
          `),
          difficulty: 'intermediario',
          skills: ['mat-algebra'],
          hints: ['A é n×m, B precisa ser m×p; o resultado é n×p.', 'C[i][j] = soma de A[i][k] * B[k][j] para k de 0 a m−1.'],
          explanation: 'São três laços aninhados: O(n·m·p). Bibliotecas como NumPy e as GPUs fazem a mesma conta de forma otimizada e paralela; é a operação que mais consome tempo no treino de redes neurais.',
          starter: 'def matmul(A, B):\n    pass\n',
          solution: dedent(`
            def matmul(A, B):
                if not A or not B or len(A[0]) != len(B):
                    raise ValueError("dimensões incompatíveis")
                return [[sum(A[i][k] * B[k][j] for k in range(len(B))) for j in range(len(B[0]))] for i in range(len(A))]
          `),
          tests: [
            { name: '2x2', code: 'assert matmul([[1, 2], [3, 4]], [[5, 6], [7, 8]]) == [[19, 22], [43, 50]]' },
            { name: 'retangular', code: 'assert matmul([[1, 2, 3]], [[1], [0], [2]]) == [[7]]' },
            { name: 'rotação de 90°', code: 'assert matmul([[0, -1], [1, 0]], [[1], [0]]) == [[0], [1]]' },
            { name: 'incompatível', code: 'try:\n    matmul([[1, 2]], [[1, 2]])\n    assert False\nexcept ValueError:\n    pass' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e14-alg-2',
          kind: 'mcq',
          prompt: 'Qual a derivada de h(x) = (3x + 1)²?',
          difficulty: 'intermediario',
          skills: ['mat-algebra'],
          hints: ['É f(g(x)) com f(u) = u² e g(x) = 3x + 1.', 'Regra da cadeia: f\'(g(x)) · g\'(x).'],
          explanation: 'f\'(u) = 2u e g\'(x) = 3, então h\'(x) = 2(3x + 1)·3 = **6(3x + 1)** = 18x + 6.',
          options: [
            { text: '2(3x + 1)', feedback: 'Faltou multiplicar pela derivada de dentro (3).' },
            { text: '6(3x + 1)', correct: true, feedback: 'Isso: regra da cadeia.' },
            { text: '(3x + 1)', feedback: 'Reveja a regra da potência.' },
            { text: '9x² + 1', feedback: 'Isso não é derivada; e (3x+1)² nem é 9x² + 1.' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e14-alg-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Ajuste uma reta y = w·x + b aos pontos dados minimizando o **erro quadrático médio** com descida do gradiente.
            Escreva \`ajustar(xs, ys, alfa=0.01, passos=5000)\` que começa em w = b = 0 e devolve \`(w, b)\`.

            Gradientes do erro E = média de (w·x + b − y)²:
            ∂E/∂w = média de 2·(w·x + b − y)·x e ∂E/∂b = média de 2·(w·x + b − y).
          `),
          difficulty: 'desafio',
          skills: ['mat-algebra'],
          hints: ['A cada passo, calcule os dois gradientes usando todos os pontos.', 'Atualize w e b ao mesmo tempo, com os gradientes calculados antes de mudar qualquer um.'],
          explanation: 'Isso é a regressão linear do Nível 13 treinada "do jeito das redes neurais". O mesmo laço, com milhões de parâmetros e gradientes calculados por retropropagação, treina os modelos de IA modernos.',
          starter: 'def ajustar(xs, ys, alfa=0.01, passos=5000):\n    w, b = 0.0, 0.0\n    return w, b\n',
          solution: dedent(`
            def ajustar(xs, ys, alfa=0.01, passos=5000):
                w, b = 0.0, 0.0
                n = len(xs)
                for _ in range(passos):
                    erros = [w * x + b - y for x, y in zip(xs, ys)]
                    gw = sum(2 * e * x for e, x in zip(erros, xs)) / n
                    gb = sum(2 * e for e in erros) / n
                    w -= alfa * gw
                    b -= alfa * gb
                return w, b
          `),
          tests: [
            { name: 'reta exata', code: 'w, b = ajustar([0, 1, 2, 3, 4], [1, 3, 5, 7, 9])\nassert abs(w - 2) < 0.01 and abs(b - 1) < 0.01' },
            { name: 'com ruído', code: 'w, b = ajustar([1, 2, 3, 4, 5, 6], [2.1, 3.9, 6.2, 7.8, 10.1, 12.0])\nassert abs(w - 1.98) < 0.05 and abs(b - 0.08) < 0.15' },
          ],
        },
      },
    ],
    projeto: [
      { type: 'project', projectId: 'p7-ml' },
      md('No projeto de **machine learning**, implemente primeiro a regressão com descida do gradiente "à mão" (como no desafio), depois compare com a versão do scikit-learn ou NumPy, e mostre num gráfico como o erro cai a cada passo para três taxas de aprendizado diferentes.'),
    ],
    revisao: [
      md(`
        - u · v = Σ uᵢvᵢ; cosseno mede alinhamento; 0 = perpendiculares.
        - (n×m)·(m×p) = n×p; A·B ≠ B·A.
        - Derivada numérica por diferença central; regra da cadeia = base da retropropagação.
        - Descida do gradiente: θ ← θ − α∇f(θ); α controla o passo.
      `),
      deep('*Mathematics for Machine Learning* (Deisenroth, Faisal e Ong) é gratuito e cobre exatamente este caminho. As aulas de Gilbert Strang (MIT 18.06) são a melhor introdução visual à álgebra linear.'),
    ],
  },
  review: [
    ['O que significa produto escalar zero?', 'Os vetores são perpendiculares (ortogonais).'],
    ['Quando A·B está definido?', 'Quando o número de colunas de A é igual ao número de linhas de B.'],
    ['Fórmula da atualização na descida do gradiente?', 'θ ← θ − α·∇f(θ).'],
    ['O que a regra da cadeia tem a ver com redes neurais?', 'A retropropagação calcula os gradientes aplicando a regra da cadeia camada por camada.'],
  ],
  references: ['mit-1806', 'mml-book'],
});

