/**
 * Lições dos módulos que antes eram só roteiro (parte A): back-end, NoSQL,
 * memória e sistemas de arquivos, sockets e arquitetura de software.
 * Os exercícios de código rodam no navegador (Pyodide), então simulam o que
 * depende de rede ou do sistema operacional com estruturas puras de Python.
 */
import { code, dedent, deep, english, info, lesson, md, py, t, warn } from '../helpers.ts';

/* ========================= m6-4 Back-end e autenticação ========================= */

export const backend = lesson({
  id: 'l6-backend-auth',
  moduleId: 'm6-4',
  title: 'Back-end: rotas, camadas, validação e sessões',
  titleEn: 'Back-end: routes, layers, validation and sessions',
  summary: 'Como um servidor web organiza o código em camadas, valida a entrada, trata erros e sabe quem é o usuário (cookies de sessão × tokens).',
  minutes: 50,
  objectives: [
    'Descrever o caminho de uma requisição: rota → validação → serviço → repositório → resposta',
    'Validar entrada no servidor e devolver o código HTTP certo',
    'Comparar sessão com cookie e token (JWT), com prós e contras',
    'Explicar por que o servidor nunca confia no cliente',
  ],
  skills: ['web-backend'],
  terms: [
    t('rota', 'route', 'Combinação de método HTTP + caminho que aciona um trecho de código.', 'GET /api/users/:id'),
    t('manipulador', 'handler', 'Função que recebe a requisição e produz a resposta.'),
    t('camada de serviço', 'service layer', 'Onde ficam as regras de negócio, sem detalhes de HTTP nem de banco.'),
    t('repositório', 'repository', 'Camada que conversa com o banco de dados.'),
    t('validação', 'validation', 'Conferir formato, tipo e limites de um dado antes de usá-lo.'),
    t('sessão', 'session', 'Estado do usuário guardado no servidor, ligado a um identificador no cookie.'),
    t('token de acesso', 'access token', 'Credencial que o cliente envia a cada requisição; o JWT é um formato comum.'),
    t('intermediário', 'middleware', 'Função que roda antes (ou depois) dos handlers: log, autenticação, limite de taxa.'),
  ],
  stages: {
    conceito: [
      md('O **back-end** é o programa que roda no servidor: recebe requisições HTTP, aplica as regras do negócio, lê e grava no banco e devolve respostas. A regra de ouro: **o servidor nunca confia no cliente**. Tudo que chega pela rede pode ter sido forjado, então é validado de novo no servidor, mesmo que o front-end já tenha validado.'),
    ],
    explicacao: [
      md(`
        ### O caminho de uma requisição

        1. **Roteamento**: \`POST /api/tarefas\` chega e o framework escolhe o *handler*.
        2. **Middlewares**: registram log, conferem a sessão, aplicam limite de taxa.
        3. **Validação**: o corpo tem os campos certos, com tipos e tamanhos aceitáveis? Se não, **400 Bad Request**.
        4. **Serviço**: aplica a regra ("um usuário tem no máximo 100 tarefas abertas").
        5. **Repositório**: grava no banco com consulta parametrizada.
        6. **Resposta**: **201 Created** com o recurso, ou um erro com mensagem útil e sem detalhes internos.

        Separar em camadas deixa cada parte testável sozinha: o serviço pode ser testado sem HTTP e sem banco.

        ### Quem é o usuário?

        | | Sessão com cookie | Token (JWT) no cabeçalho |
        |---|---|---|
        | Onde fica o estado | no servidor (tabela de sessões) | dentro do próprio token, assinado |
        | Encerrar a sessão | apagar a linha: efeito imediato | difícil antes de expirar (precisa de lista de revogação) |
        | Roubo por XSS | cookie \`HttpOnly\` não é lido por JavaScript | se guardado em localStorage, é lido |
        | CSRF | precisa de \`SameSite\` e/ou token anti-CSRF | não se aplica se não for cookie |
        | Bom para | sites e apps web do mesmo domínio | APIs entre serviços, clientes móveis |

        Para um site comum, **sessão opaca em cookie \`HttpOnly; Secure; SameSite=Lax\`** costuma ser a escolha mais simples e segura. Esta própria plataforma usa esse modelo e guarda no banco só o *hash* do token da sessão.
      `),
      warn('Mensagens de erro de login devem ser genéricas ("e-mail ou senha incorretos"). Dizer "esse e-mail não existe" permite descobrir quem tem conta (*user enumeration*).', 'Cuidado com o que o erro revela'),
    ],
    exemplo: [
      py(`
        # Um "mini-framework" para ver as camadas sem depender de rede.
        tarefas = {}          # repositório em memória: id -> dict
        proximo_id = 1

        def validar_tarefa(corpo):
            erros = []
            titulo = corpo.get("titulo")
            if not isinstance(titulo, str) or not titulo.strip():
                erros.append("titulo é obrigatório")
            elif len(titulo) > 100:
                erros.append("titulo deve ter até 100 caracteres")
            return erros

        def criar_tarefa(usuario, corpo):          # handler
            if usuario is None:
                return 401, {"erro": "faça login"}
            erros = validar_tarefa(corpo)
            if erros:
                return 400, {"erros": erros}
            global proximo_id
            tarefa = {"id": proximo_id, "dono": usuario, "titulo": corpo["titulo"].strip()}
            tarefas[proximo_id] = tarefa
            proximo_id += 1
            return 201, tarefa

        print(criar_tarefa(None, {"titulo": "estudar"}))
        print(criar_tarefa("ana", {}))
        print(criar_tarefa("ana", {"titulo": "  estudar redes  "}))
      `),
    ],
    codigo: [
      code(
        'javascript',
        `
        // O mesmo handler num servidor Node com Fastify (não roda no navegador).
        app.post('/api/tarefas', async (req, reply) => {
          const usuario = await usuarioDaSessao(req);           // middleware de autenticação
          if (!usuario) return reply.code(401).send({ erro: 'faça login' });
          const erros = validarTarefa(req.body);
          if (erros.length) return reply.code(400).send({ erros });
          const tarefa = await servicoTarefas.criar(usuario.id, req.body.titulo);
          return reply.code(201).send(tarefa);
        });
        `,
        'Mesma lógica, agora num framework real. O formato muda pouco entre FastAPI, Express e Fastify.',
      ),
      english('Status codes you will read every day: **200 OK**, **201 Created**, **204 No Content**, **400 Bad Request** (invalid input), **401 Unauthorized** (not logged in), **403 Forbidden** (logged in, not allowed), **404 Not Found**, **409 Conflict**, **429 Too Many Requests**, **500 Internal Server Error**.'),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e6-back-0',
          kind: 'mcq',
          prompt: 'O usuário está logado, mas tenta apagar a tarefa de **outra pessoa**. Qual código HTTP descreve melhor a resposta?',
          difficulty: 'facil',
          skills: ['web-backend'],
          hints: ['O servidor sabe quem ele é. A questão é se ele **pode** fazer isso.', 'Autenticação × autorização.'],
          explanation: '**403 Forbidden**: autenticado, mas sem permissão. 401 é para quando não se sabe quem é o usuário. Alguns sistemas respondem 404 para não revelar que o recurso existe; também é aceitável, desde que seja consistente.',
          options: [
            { text: '401 Unauthorized', feedback: '401 significa "não autenticado". Aqui o servidor sabe quem é o usuário.' },
            { text: '403 Forbidden', correct: true, feedback: 'Isso: sabe quem é, mas não pode.' },
            { text: '400 Bad Request', feedback: 'A requisição está bem formada; o problema é permissão.' },
            { text: '500 Internal Server Error', feedback: '500 é falha do servidor, não regra de acesso.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e6-back-1',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Escreva \`validar_cadastro(corpo)\` que recebe um dicionário e devolve a **lista de erros** (vazia se estiver tudo certo):

            - \`"email inválido"\` se \`email\` não for texto com exatamente um \`@\` e pelo menos um \`.\` depois dele;
            - \`"senha curta"\` se \`senha\` não for texto com pelo menos 10 caracteres;
            - \`"idade inválida"\` se \`idade\` existir e não for um inteiro entre 13 e 120 (\`True\`/\`False\` não contam como inteiros).

            Os erros aparecem nessa ordem.
          `),
          difficulty: 'intermediario',
          skills: ['web-backend'],
          hints: [
            'Comece pelo caso feliz: um dicionário válido deve devolver [].',
            'Use isinstance(x, str) antes de chamar métodos de texto.',
            'Em Python, isinstance(True, int) é True. Teste o tipo bool antes.',
          ],
          explanation: 'Validar no servidor é obrigatório porque qualquer pessoa pode enviar uma requisição sem passar pelo formulário. Note como cada regra checa o **tipo** antes do **valor**: assim um JSON malicioso (número no lugar de texto) não derruba o servidor.',
          starter: 'def validar_cadastro(corpo):\n    erros = []\n    return erros\n',
          solution: dedent(`
            def validar_cadastro(corpo):
                erros = []
                email = corpo.get("email")
                if not (isinstance(email, str) and email.count("@") == 1 and "." in email.split("@")[1]):
                    erros.append("email inválido")
                senha = corpo.get("senha")
                if not (isinstance(senha, str) and len(senha) >= 10):
                    erros.append("senha curta")
                if "idade" in corpo:
                    idade = corpo["idade"]
                    if isinstance(idade, bool) or not isinstance(idade, int) or not 13 <= idade <= 120:
                        erros.append("idade inválida")
                return erros
          `),
          tests: [
            { name: 'válido', code: 'assert validar_cadastro({"email": "ana@ex.com", "senha": "frase longa demais", "idade": 30}) == []' },
            { name: 'sem idade é válido', code: 'assert validar_cadastro({"email": "a@b.co", "senha": "1234567890"}) == []' },
            { name: 'tudo errado', code: 'assert validar_cadastro({"email": "a@@b", "senha": "curta", "idade": 7}) == ["email inválido", "senha curta", "idade inválida"]' },
            { name: 'tipos errados', code: 'assert validar_cadastro({"email": 5, "senha": None, "idade": True}) == ["email inválido", "senha curta", "idade inválida"]' },
            { name: 'ponto antes do @ não vale', code: 'assert validar_cadastro({"email": "a.b@com", "senha": "1234567890"}) == ["email inválido"]' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e6-back-2',
          kind: 'mcq',
          prompt: 'Por que o cookie de sessão deve ter o atributo `HttpOnly`?',
          difficulty: 'intermediario',
          skills: ['web-backend'],
          hints: ['Pense em quem consegue ler `document.cookie`.'],
          explanation: '`HttpOnly` impede que JavaScript da página leia o cookie. Se um atacante conseguir injetar script (XSS), ainda assim não rouba a sessão diretamente.',
          options: [
            { text: 'Para o cookie só ser enviado por HTTPS', feedback: 'Isso é o atributo `Secure`.' },
            { text: 'Para JavaScript da página não conseguir ler o cookie', correct: true, feedback: 'Exato: reduz o estrago de um XSS.' },
            { text: 'Para o cookie não ser enviado por outros sites', feedback: 'Isso é o `SameSite`.' },
            { text: 'Para o cookie expirar ao fechar o navegador', feedback: 'Isso depende de `Expires`/`Max-Age`.' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e6-back-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Implemente um pequeno **roteador**. \`Roteador()\` tem:

            - \`adicionar(metodo, padrao, handler)\`, onde \`padrao\` é como \`"/tarefas/:id"\`;
            - \`despachar(metodo, caminho)\`, que chama o handler da primeira rota que casar, passando um dicionário com os parâmetros (\`{"id": "42"}\`), e devolve o que o handler devolver. Se nenhuma rota casar, devolve \`(404, "não encontrado")\`. Se o caminho casar mas o método não, devolve \`(405, "método não permitido")\`.

            Barras no fim são ignoradas: \`/tarefas/\` casa com \`/tarefas\`.
          `),
          difficulty: 'desafio',
          skills: ['web-backend'],
          hints: [
            'Quebre padrão e caminho com split("/") e descarte partes vazias.',
            'Uma parte que começa com ":" casa com qualquer texto e vira parâmetro.',
            'Para distinguir 404 de 405, lembre se algum padrão casou com o caminho, independentemente do método.',
          ],
          explanation: 'É assim que frameworks como Express e Fastify funcionam por dentro (os de verdade usam uma árvore de prefixos para ficar rápidos com centenas de rotas). Distinguir 404 de 405 ajuda quem consome a API a entender o erro.',
          starter: dedent(`
            class Roteador:
                def __init__(self):
                    self.rotas = []

                def adicionar(self, metodo, padrao, handler):
                    pass

                def despachar(self, metodo, caminho):
                    return (404, "não encontrado")
          `),
          solution: dedent(`
            class Roteador:
                def __init__(self):
                    self.rotas = []

                def adicionar(self, metodo, padrao, handler):
                    self.rotas.append((metodo, [p for p in padrao.split("/") if p], handler))

                def _casar(self, partes_padrao, partes):
                    if len(partes_padrao) != len(partes):
                        return None
                    params = {}
                    for p, s in zip(partes_padrao, partes):
                        if p.startswith(":"):
                            params[p[1:]] = s
                        elif p != s:
                            return None
                    return params

                def despachar(self, metodo, caminho):
                    partes = [p for p in caminho.split("/") if p]
                    caminho_existe = False
                    for m, partes_padrao, handler in self.rotas:
                        params = self._casar(partes_padrao, partes)
                        if params is None:
                            continue
                        caminho_existe = True
                        if m == metodo:
                            return handler(params)
                    return (405, "método não permitido") if caminho_existe else (404, "não encontrado")
          `),
          tests: [
            { name: 'parâmetro', code: 'r = Roteador()\nr.adicionar("GET", "/tarefas/:id", lambda p: (200, p["id"]))\nassert r.despachar("GET", "/tarefas/42") == (200, "42")' },
            { name: 'barra final', code: 'r = Roteador()\nr.adicionar("GET", "/tarefas", lambda p: (200, "lista"))\nassert r.despachar("GET", "/tarefas/") == (200, "lista")' },
            { name: '404 e 405', code: 'r = Roteador()\nr.adicionar("GET", "/tarefas/:id", lambda p: (200, p))\nassert r.despachar("GET", "/nada") == (404, "não encontrado")\nassert r.despachar("DELETE", "/tarefas/1") == (405, "método não permitido")' },
            { name: 'dois parâmetros', code: 'r = Roteador()\nr.adicionar("GET", "/u/:uid/t/:tid", lambda p: (200, p))\nassert r.despachar("GET", "/u/7/t/9") == (200, {"uid": "7", "tid": "9"})' },
          ],
        },
      },
    ],
    projeto: [
      { type: 'project', projectId: 'p5-api' },
      md('Aplique no projeto da **API REST**: separe rotas, serviço e repositório em arquivos diferentes; valide toda entrada no servidor; devolva 400, 401, 403, 404 e 409 nos casos certos; e escreva um teste para cada regra do serviço.'),
    ],
    revisao: [
      md(`
        - Requisição: rota → middlewares → validação → serviço → repositório → resposta.
        - O servidor revalida tudo. Tipo antes de valor.
        - 401 = não sei quem é você; 403 = sei, mas você não pode.
        - Sessão em cookie \`HttpOnly; Secure; SameSite\` é o padrão seguro para sites; JWT brilha entre serviços.
      `),
      deep('Para aprofundar: leia as *Cheat Sheets* da OWASP sobre autenticação e gerenciamento de sessão, e compare com a implementação da API desta plataforma (`apps/api/src/auth.ts`).'),
    ],
  },
  review: [
    ['Qual a diferença entre 401 e 403?', '401: o servidor não sabe quem você é (não autenticado). 403: sabe, mas você não tem permissão.'],
    ['Por que validar no servidor se o front-end já valida?', 'Porque qualquer um pode mandar requisições direto, sem passar pelo front-end. A validação do cliente é só conforto.'],
    ['O que cada camada faz: rota, serviço, repositório?', 'Rota: traduz HTTP. Serviço: regras de negócio. Repositório: acesso ao banco.'],
    ['Uma vantagem da sessão no servidor sobre o JWT?', 'Dá para encerrar a sessão na hora, apagando-a no servidor.'],
  ],
  references: ['owasp-cheatsheets', 'mdn-http'],
});

/* ========================= m7-4 NoSQL e dados em escala ========================= */

export const nosql = lesson({
  id: 'l7-nosql-escala',
  moduleId: 'm7-4',
  title: 'NoSQL, replicação, particionamento e CAP',
  titleEn: 'NoSQL, replication, partitioning and CAP',
  summary: 'Quando um banco relacional não é a melhor escolha, os modelos NoSQL (documento, chave-valor, coluna, grafo) e como dados são espalhados por várias máquinas.',
  minutes: 45,
  objectives: [
    'Comparar os modelos relacional, documento, chave-valor e grafo',
    'Explicar replicação e particionamento (sharding)',
    'Interpretar o teorema CAP sem simplificações erradas',
    'Escolher o banco certo para um caso concreto',
  ],
  skills: ['bd-nosql'],
  terms: [
    t('banco de documentos', 'document database', 'Guarda documentos (parecidos com JSON) com estrutura flexível.', 'MongoDB'),
    t('chave-valor', 'key-value store', 'Dicionário gigante e rápido: dada a chave, devolve o valor.', 'Redis'),
    t('replicação', 'replication', 'Manter cópias dos mesmos dados em várias máquinas.'),
    t('particionamento', 'partitioning (sharding)', 'Dividir os dados entre máquinas, cada uma com uma parte.'),
    t('consistência eventual', 'eventual consistency', 'Réplicas podem divergir por um tempo, mas convergem se as escritas pararem.'),
    t('partição de rede', 'network partition', 'Falha que separa as máquinas em grupos que não se comunicam.'),
    t('cache', 'cache', 'Cópia rápida de dados caros de obter.'),
  ],
  stages: {
    conceito: [
      md('**NoSQL** é um guarda-chuva para bancos que não usam (só) tabelas relacionais. Eles existem porque alguns problemas pedem outro **modelo de dados** (documentos aninhados, grafos de relações) ou outra forma de **escalar** (espalhar dados por muitas máquinas). Não são "melhores" que SQL: trocam garantias por flexibilidade ou escala.'),
    ],
    explicacao: [
      md(`
        ### Modelos

        - **Relacional (SQL)**: tabelas, JOINs, transações ACID. Ótimo padrão para quase tudo.
        - **Documento** (MongoDB): um pedido com seus itens em um documento só. Leitura do objeto inteiro é simples; relações entre documentos são o ponto fraco.
        - **Chave-valor** (Redis): \`GET sessao:123\`. Rapidíssimo; usado para cache, filas, contadores e sessões.
        - **Colunar/largas colunas** (Cassandra): muitas escritas distribuídas, consultas planejadas pela chave.
        - **Grafo** (Neo4j): "amigos dos amigos que gostam de X". Relações são o centro.

        ### Escalando

        - **Replicação**: um líder recebe escritas e as copia para seguidores. Leituras podem ir aos seguidores (podem estar um pouco atrasados).
        - **Particionamento**: os dados são divididos por chave. Ex.: \`hash(usuario_id) % 4\` escolhe a máquina. Problema: mudar de 4 para 5 máquinas move quase tudo; por isso existe o **hash consistente**.

        ### CAP, sem mito

        Durante uma **partição de rede** (P), o sistema precisa escolher: responder mesmo podendo estar desatualizado (**disponibilidade**, A) ou recusar até ter certeza (**consistência**, C). Fora de partições, dá para ter as duas. "Escolha 2 de 3" é uma simplificação ruim: partição não é opcional numa rede real.
      `),
      info('Comece com PostgreSQL. Adicione Redis quando medir que precisa de cache. Considere outro banco quando o modelo de dados ou a escala realmente pedirem. "Usar MongoDB porque é moderno" não é motivo.', 'Regra prática'),
    ],
    exemplo: [
      py(`
        import json

        # O mesmo pedido em dois modelos
        relacional = {
            "pedidos": [(1, "ana", "2026-10-01")],
            "itens":   [(1, 1, "caderno", 2), (2, 1, "caneta", 5)],   # (id, pedido_id, produto, qtd)
        }
        documento = {"_id": 1, "cliente": "ana", "data": "2026-10-01",
                     "itens": [{"produto": "caderno", "qtd": 2}, {"produto": "caneta", "qtd": 5}]}

        print("Relacional: precisa de JOIN para montar o pedido")
        print("Documento:", json.dumps(documento, ensure_ascii=False))
      `),
    ],
    codigo: [
      py(`
        import hashlib

        def maquina(chave, n):
            h = int(hashlib.md5(chave.encode()).hexdigest(), 16)
            return h % n

        usuarios = [f"user{i}" for i in range(1000)]
        antes = {u: maquina(u, 4) for u in usuarios}
        depois = {u: maquina(u, 5) for u in usuarios}
        movidos = sum(antes[u] != depois[u] for u in usuarios)
        print(f"Indo de 4 para 5 máquinas com hash % n, {movidos / 10:.0f}% das chaves mudam de lugar")
      `, { caption: 'Por que "hash módulo n" é ruim para crescer: quase todas as chaves mudam de máquina.' }),
      deep('O **hash consistente** coloca máquinas e chaves num mesmo "anel" de hashes; cada chave fica na próxima máquina do anel. Ao adicionar uma máquina, só as chaves entre ela e a anterior se movem (cerca de 1/n). DynamoDB e Cassandra usam variações disso.'),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e7-nosql-0',
          kind: 'mcq',
          prompt: 'Você precisa guardar sessões de login que expiram em 30 minutos e são lidas a cada requisição. Qual tipo de banco encaixa melhor?',
          difficulty: 'facil',
          skills: ['bd-nosql'],
          hints: ['Acesso sempre pela chave (o id da sessão), leitura muito frequente e expiração automática.'],
          explanation: 'Um **chave-valor em memória** como Redis faz exatamente isso, inclusive com expiração automática (TTL). Um banco relacional também resolve em sistemas pequenos.',
          options: [
            { text: 'Banco de grafos', feedback: 'Não há relações entre sessões para explorar.' },
            { text: 'Chave-valor em memória (ex.: Redis)', correct: true, feedback: 'Isso: leitura por chave, rápida, com TTL.' },
            { text: 'Data warehouse colunar', feedback: 'Feito para análises sobre muitos dados, não para leituras pontuais rápidas.' },
            { text: 'Arquivo CSV', feedback: 'Sem concorrência, sem expiração, lento para buscar.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e7-nosql-1',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Implemente um **cache com expiração**: \`Cache()\` com \`set(chave, valor, ttl, agora)\` e \`get(chave, agora)\`.
            \`get\` devolve o valor se \`agora < momento_da_gravacao + ttl\`, senão devolve \`None\` e **remove** a chave.
            O tempo é passado como número (\`agora\`) para facilitar os testes.
          `),
          difficulty: 'intermediario',
          skills: ['bd-nosql'],
          hints: ['Guarde junto do valor o instante em que ele expira.', 'No get, compare agora com o instante de expiração.'],
          explanation: 'É o comportamento do `SET chave valor EX segundos` do Redis. Receber o tempo como parâmetro (em vez de chamar time.time() lá dentro) é uma técnica para deixar código dependente de relógio testável.',
          starter: 'class Cache:\n    def __init__(self):\n        self.dados = {}\n\n    def set(self, chave, valor, ttl, agora):\n        pass\n\n    def get(self, chave, agora):\n        return None\n',
          solution: dedent(`
            class Cache:
                def __init__(self):
                    self.dados = {}

                def set(self, chave, valor, ttl, agora):
                    self.dados[chave] = (valor, agora + ttl)

                def get(self, chave, agora):
                    item = self.dados.get(chave)
                    if item is None:
                        return None
                    valor, expira = item
                    if agora >= expira:
                        del self.dados[chave]
                        return None
                    return valor
          `),
          tests: [
            { name: 'antes de expirar', code: 'c = Cache()\nc.set("s1", "ana", 30, 100)\nassert c.get("s1", 129) == "ana"' },
            { name: 'expirado e removido', code: 'c = Cache()\nc.set("s1", "ana", 30, 100)\nassert c.get("s1", 130) is None\nassert "s1" not in c.dados' },
            { name: 'sobrescrever renova', code: 'c = Cache()\nc.set("k", 1, 10, 0)\nc.set("k", 2, 10, 5)\nassert c.get("k", 12) == 2' },
            { name: 'chave ausente', code: 'assert Cache().get("x", 0) is None' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e7-nosql-2',
          kind: 'mcq',
          prompt: 'Durante uma partição de rede, um sistema que prioriza **consistência** (CP) faz o quê?',
          difficulty: 'avancado',
          skills: ['bd-nosql'],
          hints: ['Do lado da partição que não consegue confirmar com a maioria, responder pode significar devolver dado velho.'],
          explanation: 'Um sistema CP recusa (ou atrasa) operações que não consegue confirmar, para nunca devolver dado inconsistente. Um sistema AP responde, aceitando divergir por um tempo.',
          options: [
            { text: 'Continua aceitando escritas dos dois lados e resolve depois', feedback: 'Isso é priorizar disponibilidade (AP).' },
            { text: 'Recusa ou adia operações que não consegue confirmar', correct: true, feedback: 'Exato: prefere não responder a responder errado.' },
            { text: 'Ignora a partição, porque CAP só vale em teoria', feedback: 'Partições acontecem em redes reais; é por isso que CAP importa.' },
            { text: 'Desliga a replicação permanentemente', feedback: 'A replicação continua existindo; a questão é o que fazer durante a falha.' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e7-nosql-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Implemente **hash consistente**. \`Anel(maquinas)\` posiciona cada máquina no anel em \`h(nome)\`, onde
            \`h(texto) = int(hashlib.md5(texto.encode()).hexdigest(), 16) % 1000\`.
            \`dono(chave)\` devolve a máquina na **primeira posição maior ou igual** a \`h(chave)\`, dando a volta no anel se necessário.
            \`adicionar(nome)\` inclui uma máquina nova.
          `),
          difficulty: 'desafio',
          skills: ['bd-nosql'],
          hints: [
            'Mantenha uma lista ordenada de (posição, nome).',
            'Para achar o dono, percorra a lista (ou use bisect) procurando a primeira posição >= h(chave).',
            'Se nenhuma posição for >= h(chave), o dono é a primeira máquina da lista (volta do anel).',
          ],
          explanation: 'Com hash consistente, adicionar uma máquina só move as chaves que caem entre ela e a máquina anterior no anel. Sistemas reais colocam cada máquina em várias posições ("nós virtuais") para dividir a carga de forma mais igual.',
          starter: 'import hashlib\n\ndef h(texto):\n    return int(hashlib.md5(texto.encode()).hexdigest(), 16) % 1000\n\nclass Anel:\n    def __init__(self, maquinas):\n        pass\n\n    def adicionar(self, nome):\n        pass\n\n    def dono(self, chave):\n        pass\n',
          solution: dedent(`
            import bisect
            import hashlib

            def h(texto):
                return int(hashlib.md5(texto.encode()).hexdigest(), 16) % 1000

            class Anel:
                def __init__(self, maquinas):
                    self.pos = []
                    for m in maquinas:
                        self.adicionar(m)

                def adicionar(self, nome):
                    bisect.insort(self.pos, (h(nome), nome))

                def dono(self, chave):
                    i = bisect.bisect_left(self.pos, (h(chave), ""))
                    if i == len(self.pos):
                        i = 0
                    return self.pos[i][1]
          `),
          tests: [
            {
              name: 'dono respeita o anel',
              code: 'a = Anel(["m1", "m2", "m3"])\nfor k in ["ana", "bia", "caio", "duda", "eva"]:\n    hk = h(k)\n    cands = sorted((h(m), m) for m in ["m1", "m2", "m3"])\n    esperado = next((m for p, m in cands if p >= hk), cands[0][1])\n    assert a.dono(k) == esperado, k',
            },
            {
              name: 'adicionar move poucas chaves',
              code: 'a = Anel(["m1", "m2", "m3", "m4"])\nchaves = [f"k{i}" for i in range(300)]\nantes = {k: a.dono(k) for k in chaves}\na.adicionar("m5")\nmov = [k for k in chaves if a.dono(k) != antes[k]]\nassert all(a.dono(k) == "m5" for k in mov)\nassert len(mov) < 300 * 0.6',
            },
          ],
        },
      },
    ],
    projeto: [md('**Mini-projeto**: adicione um cache com expiração à sua API do Nível 6 para uma consulta lenta (simule com `time.sleep`). Meça o tempo antes e depois, e escreva no README quando o cache pode devolver dado desatualizado e por que isso é aceitável (ou não) no seu caso.')],
    revisao: [
      md(`
        - Documento, chave-valor, colunar e grafo resolvem problemas diferentes; SQL continua sendo o padrão.
        - Replicação copia; particionamento divide.
        - \`hash % n\` move quase tudo ao crescer; hash consistente move ~1/n.
        - CAP: durante uma partição, escolha entre responder (A) ou ter certeza (C).
      `),
    ],
  },
  review: [
    ['Diferença entre replicação e particionamento?', 'Replicação: cópias dos mesmos dados em várias máquinas. Particionamento: cada máquina guarda uma parte diferente.'],
    ['O que o teorema CAP realmente diz?', 'Durante uma partição de rede, é preciso escolher entre consistência e disponibilidade.'],
    ['Por que hash consistente?', 'Para que adicionar ou remover máquinas mova só uma fração pequena das chaves.'],
    ['Um bom uso de Redis?', 'Cache, sessões, contadores, filas: acesso rápido por chave, com expiração.'],
  ],
  references: ['ddia', 'cmu-15445'],
});

/* ========================= m8-2 Memória e sistemas de arquivos ========================= */

export const memoria = lesson({
  id: 'l8-memoria-arquivos',
  moduleId: 'm8-2',
  title: 'Memória virtual, pilha × heap e sistemas de arquivos',
  titleEn: 'Virtual memory, stack vs heap and file systems',
  summary: 'Como o sistema operacional dá a cada processo a ilusão de uma memória só dele, onde vivem as variáveis e como arquivos viram blocos no disco.',
  minutes: 50,
  objectives: [
    'Explicar endereços virtuais, páginas e tabela de páginas',
    'Traduzir um endereço virtual em físico',
    'Diferenciar pilha e heap e reconhecer vazamentos de memória',
    'Descrever inodes, diretórios e journaling',
  ],
  skills: ['so-memoria'],
  terms: [
    t('memória virtual', 'virtual memory', 'Cada processo vê um espaço de endereços próprio, traduzido para a memória física pelo SO e pelo hardware.'),
    t('página', 'page', 'Bloco de tamanho fixo (ex.: 4 KiB) em que a memória é dividida.'),
    t('tabela de páginas', 'page table', 'Mapa de página virtual para quadro (frame) físico.'),
    t('falta de página', 'page fault', 'Acesso a uma página que não está na memória física no momento.'),
    t('pilha', 'stack', 'Região onde ficam as chamadas de função e suas variáveis locais.'),
    t('heap', 'heap', 'Região para dados alocados dinamicamente, que vivem além da função que os criou.'),
    t('vazamento de memória', 'memory leak', 'Memória que não é mais usada, mas nunca é liberada.'),
    t('inode', 'inode', 'Estrutura que descreve um arquivo: tamanho, dono, permissões e onde estão seus blocos.'),
  ],
  stages: {
    conceito: [
      md('Cada processo acredita ter uma memória enorme, contínua e só dele. É uma ilusão útil chamada **memória virtual**: o SO e a MMU (um circuito da CPU) traduzem cada endereço que o programa usa para um endereço real da RAM. Isso isola processos (um não lê a memória do outro) e permite usar o disco como extensão da RAM.'),
    ],
    explicacao: [
      md(`
        ### Tradução de endereços

        A memória é dividida em **páginas** de tamanho fixo, tipicamente 4096 bytes (2¹²). Um endereço virtual se divide em duas partes:

        - **número da página** = endereço // 4096
        - **deslocamento (offset)** = endereço % 4096

        A **tabela de páginas** diz em qual **quadro físico** cada página está. Endereço físico = quadro × 4096 + deslocamento. Se a página não está mapeada na RAM, acontece uma **falta de página**: o SO busca a página no disco (lento!) ou encerra o processo se o acesso for inválido (*segmentation fault*).

        Consultar a tabela a cada acesso seria lento, então a CPU guarda as traduções recentes num cache chamado **TLB**.

        ### Pilha × heap

        - **Pilha (stack)**: cada chamada de função empilha um *frame* com parâmetros e variáveis locais; ao retornar, ele é descartado. Rápida e automática, mas limitada: recursão sem fim dá *stack overflow* (em Python, \`RecursionError\`).
        - **Heap**: dados criados dinamicamente. Em C você chama \`malloc\` e \`free\`; esquecer o \`free\` é um **vazamento**, liberar duas vezes corrompe a memória. Python, Java e JavaScript usam **coleta de lixo** (*garbage collection*): o objeto é liberado quando ninguém mais o referencia.

        ### Sistemas de arquivos

        Um arquivo é um **inode** (metadados + lista de blocos) e um nome numa **entrada de diretório** que aponta para o inode. Por isso existem *hard links*: dois nomes para o mesmo inode. **Journaling** registra a intenção da mudança antes de fazê-la, para o sistema se recuperar de uma queda de energia sem corromper o disco.
      `),
      code('text', `
        Endereço virtual 0x3A7F (= 14975)

          página        = 14975 // 4096 = 3
          deslocamento  = 14975 %  4096 = 2687

        Tabela de páginas:  página 3 -> quadro 9

          físico = 9 * 4096 + 2687 = 39551  (0x9A7F)
      `, 'Repare: com páginas de 4 KiB, os 3 dígitos hexadecimais finais (o deslocamento) não mudam.'),
    ],
    exemplo: [
      py(`
        TAM_PAGINA = 4096
        tabela = {0: 5, 1: 2, 3: 9}   # página virtual -> quadro físico

        def traduzir(endereco):
            pagina, desloc = divmod(endereco, TAM_PAGINA)
            if pagina not in tabela:
                return f"page fault na página {pagina}"
            return tabela[pagina] * TAM_PAGINA + desloc

        for end in [100, 4100, 14975, 9000]:
            print(end, "->", traduzir(end))
      `),
    ],
    codigo: [
      py(`
        import sys

        def profundidade(n):
            return 0 if n == 0 else 1 + profundidade(n - 1)

        print("limite de recursão do Python:", sys.getrecursionlimit())
        print(profundidade(500))
        try:
            profundidade(10**6)
        except RecursionError as e:
            print("Pilha esgotada:", e)

        # Referências e coleta de lixo
        a = [1, 2, 3]
        b = a          # dois nomes, um objeto (no heap)
        b.append(4)
        print(a, "mesmo objeto?", a is b)
      `),
      english('Classic error messages: **Segmentation fault (core dumped)** — accessed memory you do not own. **Stack overflow** — too many nested calls. **Out of memory (OOM)** — the system could not give you more memory; on Linux the *OOM killer* may terminate a process.'),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e8-mem-0',
          kind: 'mcq',
          prompt: 'Uma função recursiva sem caso base roda até o programa quebrar. Qual região de memória se esgota?',
          difficulty: 'facil',
          skills: ['so-memoria'],
          hints: ['Cada chamada guarda seus parâmetros e variáveis locais em algum lugar.', 'Esse lugar cresce a cada chamada e diminui a cada retorno.'],
          explanation: 'A **pilha**: cada chamada empilha um frame. Sem caso base, os frames só se acumulam até o limite (stack overflow; em Python, RecursionError).',
          options: [
            { text: 'O heap', feedback: 'O heap guarda objetos dinâmicos; as chamadas em si ficam em outro lugar.' },
            { text: 'A pilha (stack)', correct: true, feedback: 'Isso: um frame por chamada.' },
            { text: 'O disco', feedback: 'O disco não guarda as chamadas de função em andamento.' },
            { text: 'O cache L1', feedback: 'O cache é transparente para o programa; não é ele que "acaba".' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e8-mem-1',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Escreva \`traduzir(endereco, tabela, tam_pagina=4096)\` que devolve o endereço físico, ou a string
            \`"page fault"\` se a página não estiver na tabela (um dicionário página → quadro).
          `),
          difficulty: 'intermediario',
          skills: ['so-memoria'],
          hints: ['divmod(a, b) devolve quociente e resto de uma vez.', 'físico = quadro * tam_pagina + deslocamento.'],
          explanation: 'É exatamente o que a MMU faz em hardware a cada acesso à memória, com a ajuda do TLB para não consultar a tabela toda vez.',
          starter: 'def traduzir(endereco, tabela, tam_pagina=4096):\n    pass\n',
          solution: 'def traduzir(endereco, tabela, tam_pagina=4096):\n    pagina, desloc = divmod(endereco, tam_pagina)\n    if pagina not in tabela:\n        return "page fault"\n    return tabela[pagina] * tam_pagina + desloc\n',
          tests: [
            { name: 'exemplo da lição', code: 'assert traduzir(14975, {3: 9}) == 39551' },
            { name: 'page fault', code: 'assert traduzir(9000, {0: 5}) == "page fault"' },
            { name: 'página pequena', code: 'assert traduzir(25, {2: 7}, tam_pagina=10) == 75' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e8-mem-2',
          kind: 'predict',
          lang: 'python',
          prompt: 'O que este programa imprime?',
          code: 'a = [1, 2]\nb = a\nc = list(a)\nb.append(3)\nprint(len(a), len(c))',
          answer: '3 2',
          difficulty: 'intermediario',
          skills: ['so-memoria'],
          hints: ['Quantos objetos lista existem no heap depois de cada linha?', 'list(a) cria um objeto novo.'],
          explanation: '`b = a` cria um segundo nome para o mesmo objeto; `list(a)` copia para um objeto novo. O append via `b` aparece em `a`, mas não em `c`.',
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e8-mem-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            A memória física tem poucos quadros, então o SO precisa escolher qual página **despejar** quando falta espaço.
            Escreva \`faltas_lru(acessos, quadros)\` que simula a política **LRU** (despeja a página usada há mais tempo) e devolve
            quantas **faltas de página** ocorreram. A memória começa vazia.
          `),
          difficulty: 'desafio',
          skills: ['so-memoria'],
          hints: [
            'Mantenha uma lista em ordem de uso: a mais antiga no começo.',
            'Página já presente: não é falta, mas ela vira a mais recente.',
            'Falta com memória cheia: remova a primeira da lista.',
          ],
          explanation: 'LRU aproxima "despejar quem não será usado logo", explorando a localidade temporal. Na prática os SOs usam aproximações mais baratas (como o algoritmo do relógio), porque registrar cada acesso exato custa caro.',
          starter: 'def faltas_lru(acessos, quadros):\n    return 0\n',
          solution: dedent(`
            def faltas_lru(acessos, quadros):
                memoria = []
                faltas = 0
                for p in acessos:
                    if p in memoria:
                        memoria.remove(p)
                    else:
                        faltas += 1
                        if len(memoria) == quadros:
                            memoria.pop(0)
                    memoria.append(p)
                return faltas
          `),
          tests: [
            { name: 'clássico', code: 'assert faltas_lru([7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2], 3) == 9' },
            { name: 'cabe tudo', code: 'assert faltas_lru([1, 2, 1, 2, 1], 2) == 2' },
            { name: 'um quadro', code: 'assert faltas_lru([1, 1, 2, 2, 1], 1) == 3' },
          ],
        },
      },
    ],
    projeto: [md('**Mini-projeto**: compare as políticas FIFO, LRU e a ótima (que olha o futuro) para sequências de acessos aleatórias e com localidade. Faça uma tabela de faltas por número de quadros. Você vai ver a **anomalia de Belady** no FIFO: mais memória pode dar mais faltas.')],
    revisao: [
      md(`
        - Endereço virtual = página + deslocamento; a tabela de páginas leva ao quadro físico; o TLB acelera.
        - Falta de página: buscar no disco ou encerrar (segfault).
        - Pilha: chamadas e locais, automática. Heap: objetos dinâmicos; GC ou free manual.
        - Arquivo = inode + entrada de diretório; journaling protege contra quedas.
      `),
    ],
  },
  review: [
    ['Como se calcula o deslocamento de um endereço virtual com páginas de 4096 bytes?', 'endereço % 4096.'],
    ['O que é uma falta de página?', 'Acesso a uma página que não está mapeada na RAM naquele momento.'],
    ['Diferença entre pilha e heap?', 'Pilha: frames das chamadas, liberados ao retornar. Heap: objetos dinâmicos, liberados por free ou pelo coletor de lixo.'],
    ['O que é um inode?', 'A estrutura com os metadados de um arquivo e a localização dos seus blocos.'],
  ],
  references: ['ostep', 'cmu-15213'],
});

/* ========================= m9-3 Sockets e cliente-servidor ========================= */

export const sockets = lesson({
  id: 'l9-sockets',
  moduleId: 'm9-3',
  title: 'Sockets, protocolos de aplicação e servidores concorrentes',
  titleEn: 'Sockets, application protocols and concurrent servers',
  summary: 'A API de sockets, por que TCP entrega um fluxo de bytes (e não mensagens), como desenhar um protocolo simples e como um servidor atende muitos clientes.',
  minutes: 50,
  objectives: [
    'Descrever o ciclo de vida de um socket TCP no servidor e no cliente',
    'Explicar por que é preciso enquadrar mensagens num fluxo TCP',
    'Implementar o enquadramento por delimitador e por tamanho',
    'Comparar threads, processos e E/S assíncrona num servidor',
  ],
  skills: ['redes-sockets'],
  terms: [
    t('soquete', 'socket', 'Ponto de comunicação de um processo na rede: IP + porta + protocolo.'),
    t('escutar', 'listen', 'Pôr o socket do servidor à espera de conexões.'),
    t('aceitar', 'accept', 'Pegar a próxima conexão da fila, gerando um socket para conversar com aquele cliente.'),
    t('fluxo de bytes', 'byte stream', 'Sequência contínua de bytes, sem fronteiras de mensagem.'),
    t('enquadramento', 'framing', 'Regra para saber onde cada mensagem começa e termina.'),
    t('E/S assíncrona', 'asynchronous I/O', 'Uma thread atende muitas conexões, trocando de tarefa enquanto espera a rede.'),
    t('balanceador de carga', 'load balancer', 'Distribui requisições entre várias instâncias do servidor.'),
  ],
  stages: {
    conceito: [
      md('Um **socket** é a "tomada" que um programa usa para falar pela rede. No TCP, o servidor **escuta** numa porta e **aceita** conexões; cada conexão vira um canal confiável e ordenado de **bytes**. Atenção ao detalhe que derruba muita gente: TCP entrega um **fluxo**, não mensagens. Duas mensagens enviadas podem chegar coladas, ou uma pode chegar em pedaços.'),
    ],
    explicacao: [
      md(`
        ### Ciclo de vida

        **Servidor**: \`socket()\` → \`bind(("0.0.0.0", 9000))\` → \`listen()\` → em laço: \`accept()\` → \`recv()\`/\`send()\` → \`close()\`.
        **Cliente**: \`socket()\` → \`connect(("servidor", 9000))\` → \`send()\`/\`recv()\` → \`close()\`.

        ### Enquadramento (framing)

        Como o TCP não marca fronteiras, o **protocolo de aplicação** precisa marcar:

        - **Delimitador**: cada mensagem termina com \`\\n\` (protocolos de texto como SMTP, Redis e o HTTP/1.1 nos cabeçalhos).
        - **Prefixo de tamanho**: 4 bytes dizendo o tamanho, depois o conteúdo (protocolos binários, HTTP/2).

        O receptor acumula os bytes num **buffer** e só entrega uma mensagem quando ela está completa.

        ### Muitos clientes ao mesmo tempo

        - **Uma thread (ou processo) por conexão**: simples, mas milhares de conexões custam muita memória.
        - **E/S assíncrona** (\`asyncio\`, Node.js): uma thread com um *event loop* atende milhares de conexões, desde que nenhum handler bloqueie.
        - Em produção, um **proxy reverso / balanceador** (Nginx, HAProxy, o da nuvem) recebe as conexões e distribui entre várias instâncias.

        **WebSockets** começam como uma requisição HTTP e viram um canal bidirecional, com enquadramento próprio: é como chats e jogos no navegador conversam em tempo real.
      `),
    ],
    exemplo: [
      code('python', `
        # servidor_eco.py — rode no seu computador (o navegador não abre sockets TCP)
        import socket

        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as srv:
            srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            srv.bind(("127.0.0.1", 9000))
            srv.listen()
            print("escutando na porta 9000")
            while True:
                conn, endereco = srv.accept()
                with conn:
                    print("conexão de", endereco)
                    while dados := conn.recv(1024):     # b"" significa: o cliente fechou
                        conn.sendall(dados.upper())
      `, 'Teste com: nc 127.0.0.1 9000 (ou um cliente Python). Este servidor atende um cliente por vez: abra dois terminais e veja o segundo esperar.'),
    ],
    codigo: [
      py(`
        # Simulando o que o TCP pode fazer com duas mensagens: juntar e fatiar.
        enviado = b"ola\\nmundo\\n"
        pedacos_recebidos = [b"o", b"la\\nmu", b"ndo\\n"]

        buffer = b""
        for pedaco in pedacos_recebidos:
            buffer += pedaco
            while b"\\n" in buffer:
                linha, buffer = buffer.split(b"\\n", 1)
                print("mensagem completa:", linha.decode())
        print("sobrou no buffer:", buffer)
      `),
      code('python', `
        # O mesmo servidor de eco com asyncio: atende vários clientes numa thread só.
        import asyncio

        async def atender(reader, writer):
            while linha := await reader.readline():      # enquadramento por \\n
                writer.write(linha.upper())
                await writer.drain()
            writer.close()

        async def main():
            servidor = await asyncio.start_server(atender, "127.0.0.1", 9000)
            async with servidor:
                await servidor.serve_forever()

        asyncio.run(main())
      `, 'Rode localmente. Note o await: enquanto um cliente não manda nada, o event loop atende os outros.'),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e9-sock-0',
          kind: 'mcq',
          prompt: 'O cliente envia `send(b"oi")` e depois `send(b"tchau")`. O que o servidor pode receber no primeiro `recv(1024)`?',
          difficulty: 'facil',
          skills: ['redes-sockets'],
          hints: ['TCP garante ordem e integridade dos bytes. Ele garante fronteiras de mensagem?'],
          explanation: 'Qualquer prefixo do fluxo: `b"oi"`, `b"oitchau"`, `b"o"`, etc. TCP é um fluxo de bytes; quem define as mensagens é o protocolo da aplicação.',
          options: [
            { text: 'Sempre exatamente b"oi"', feedback: 'TCP não preserva fronteiras de send().' },
            { text: 'Qualquer prefixo de b"oitchau", como b"oi", b"oitchau" ou b"o"', correct: true, feedback: 'Isso: por isso existe o enquadramento.' },
            { text: 'b"tchau" pode chegar antes de b"oi"', feedback: 'TCP garante a ordem dos bytes.' },
            { text: 'Os bytes podem chegar corrompidos', feedback: 'TCP detecta erros e retransmite.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e9-sock-1',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Implemente \`LeitorDeLinhas\`, que recebe pedaços de bytes como chegariam de \`recv()\`:
            \`alimentar(dados)\` devolve a **lista de linhas completas** (strings sem o \`\\n\`, decodificadas em UTF-8) que ficaram prontas com esses dados,
            guardando o resto para a próxima chamada.
          `),
          difficulty: 'intermediario',
          skills: ['redes-sockets'],
          hints: ['Guarde um buffer de bytes no objeto.', 'Enquanto houver b"\\n" no buffer, separe uma linha.', 'Decodifique só linhas completas: um caractere UTF-8 pode vir partido entre dois pedaços.'],
          explanation: 'Essa classe é o coração de qualquer servidor de protocolo de texto. Decodificar só a linha completa evita quebrar caracteres multibyte (como "ç") que chegaram divididos.',
          starter: 'class LeitorDeLinhas:\n    def __init__(self):\n        self.buffer = b""\n\n    def alimentar(self, dados):\n        return []\n',
          solution: dedent(`
            class LeitorDeLinhas:
                def __init__(self):
                    self.buffer = b""

                def alimentar(self, dados):
                    self.buffer += dados
                    linhas = []
                    while b"\\n" in self.buffer:
                        linha, self.buffer = self.buffer.split(b"\\n", 1)
                        linhas.append(linha.decode("utf-8"))
                    return linhas
          `),
          tests: [
            { name: 'pedaços', code: 'l = LeitorDeLinhas()\nassert l.alimentar(b"o") == []\nassert l.alimentar(b"la\\nmu") == ["ola"]\nassert l.alimentar(b"ndo\\n") == ["mundo"]' },
            { name: 'várias de uma vez', code: 'assert LeitorDeLinhas().alimentar(b"a\\nb\\nc") == ["a", "b"]' },
            { name: 'utf-8 partido', code: 'l = LeitorDeLinhas()\nd = "ação\\n".encode()\nassert l.alimentar(d[:2]) == []\nassert l.alimentar(d[2:]) == ["ação"]' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e9-sock-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Protocolos binários usam **prefixo de tamanho**. Escreva:

            - \`empacotar(texto)\`: devolve 4 bytes com o tamanho do texto em UTF-8 (big-endian, sem sinal) seguidos dos bytes do texto;
            - \`desempacotar(buffer)\`: recebe bytes acumulados e devolve \`(mensagens, resto)\`, onde \`mensagens\` é a lista de textos completos e \`resto\` são os bytes que ainda não formam uma mensagem.
          `),
          difficulty: 'desafio',
          skills: ['redes-sockets'],
          hints: [
            'int.to_bytes(4, "big") e int.from_bytes(b, "big") convertem entre inteiro e bytes.',
            'Só dá para ler o tamanho se houver pelo menos 4 bytes; só dá para ler a mensagem se houver 4 + tamanho bytes.',
          ],
          explanation: 'Prefixo de tamanho evita ter de "escapar" o delimitador dentro do conteúdo e permite saber de antemão quanto ler. Em servidores reais, limite o tamanho máximo aceito: senão um cliente manda "4 GB" no prefixo e esgota sua memória.',
          starter: 'def empacotar(texto):\n    pass\n\ndef desempacotar(buffer):\n    return [], buffer\n',
          solution: dedent(`
            def empacotar(texto):
                dados = texto.encode("utf-8")
                return len(dados).to_bytes(4, "big") + dados

            def desempacotar(buffer):
                mensagens = []
                while len(buffer) >= 4:
                    n = int.from_bytes(buffer[:4], "big")
                    if len(buffer) < 4 + n:
                        break
                    mensagens.append(buffer[4:4 + n].decode("utf-8"))
                    buffer = buffer[4 + n:]
                return mensagens, buffer
          `),
          tests: [
            { name: 'empacotar', code: 'assert empacotar("oi") == b"\\x00\\x00\\x00\\x02oi"' },
            { name: 'ida e volta', code: 'b = empacotar("olá") + empacotar("") + empacotar("mundo")\nassert desempacotar(b) == (["olá", "", "mundo"], b"")' },
            { name: 'mensagem incompleta', code: 'b = empacotar("abc") + empacotar("defgh")[:6]\nm, r = desempacotar(b)\nassert m == ["abc"] and r == empacotar("defgh")[:6]' },
          ],
        },
      },
    ],
    projeto: [
      { type: 'project', projectId: 'p8-chat' },
      md('No **chat em rede**, use o `LeitorDeLinhas` (ou o prefixo de tamanho) para separar mensagens, atenda vários clientes com `asyncio` e envie cada mensagem para todos os conectados (*broadcast*). Trate o cliente que desconecta no meio de uma mensagem.'),
    ],
    revisao: [
      md(`
        - Servidor: bind → listen → accept; cliente: connect.
        - TCP = fluxo de bytes ordenado e confiável, **sem fronteiras de mensagem**.
        - Enquadramento por delimitador ou por prefixo de tamanho; buffer até a mensagem estar completa.
        - Concorrência: thread por conexão, ou E/S assíncrona com event loop.
      `),
    ],
  },
  review: [
    ['TCP preserva as fronteiras de cada send()?', 'Não. Ele entrega um fluxo de bytes; a aplicação precisa enquadrar as mensagens.'],
    ['Duas formas de enquadrar mensagens?', 'Delimitador (ex.: \\n) ou prefixo com o tamanho.'],
    ['O que accept() devolve?', 'Um novo socket para conversar com aquele cliente, mais o endereço dele.'],
    ['Vantagem da E/S assíncrona num servidor?', 'Uma thread atende muitas conexões, porque não fica parada esperando a rede.'],
  ],
  references: ['kurose-ross', 'python-docs'],
});

/* ========================= m10-4 Arquitetura e processos ========================= */

export const arquitetura = lesson({
  id: 'l10-arquitetura',
  moduleId: 'm10-4',
  title: 'Arquitetura de software, decisões e processos ágeis',
  titleEn: 'Software architecture, decisions and agile processes',
  summary: 'Organizar o código em camadas com dependências na direção certa, decidir entre monólito e microsserviços, registrar decisões e trabalhar em ciclos curtos.',
  minutes: 45,
  objectives: [
    'Organizar um sistema em camadas e explicar a regra de dependência',
    'Comparar monólito, monólito modular e microsserviços',
    'Escrever um registro de decisão de arquitetura (ADR)',
    'Escrever histórias de usuário com critérios de aceitação',
  ],
  skills: ['eng-arquitetura'],
  terms: [
    t('arquitetura em camadas', 'layered architecture', 'Divisão do sistema em camadas com responsabilidades separadas.'),
    t('inversão de dependência', 'dependency inversion', 'O núcleo define interfaces; detalhes (banco, web) as implementam.'),
    t('monólito', 'monolith', 'Uma aplicação implantada como uma unidade só.'),
    t('microsserviços', 'microservices', 'Sistema dividido em serviços pequenos, implantados separadamente, que conversam pela rede.'),
    t('registro de decisão de arquitetura', 'architecture decision record (ADR)', 'Documento curto com contexto, decisão e consequências.'),
    t('história de usuário', 'user story', '"Como <quem>, quero <o quê>, para <por quê>."'),
    t('critério de aceitação', 'acceptance criteria', 'Condições verificáveis para considerar a história pronta.'),
    t('dívida técnica', 'technical debt', 'Custo futuro de um atalho tomado hoje.'),
  ],
  stages: {
    conceito: [
      md('**Arquitetura** são as decisões difíceis de mudar depois: como o sistema se divide, quem depende de quem, onde ficam os dados. A boa arquitetura mantém as **regras de negócio** independentes dos **detalhes** (framework web, banco de dados, provedor de nuvem), para que os detalhes possam mudar sem reescrever o coração do sistema.'),
    ],
    explicacao: [
      md(`
        ### A regra de dependência

        Em camadas como **apresentação → aplicação → domínio** (com **infraestrutura** implementando interfaces do domínio), as dependências apontam **para dentro**: o domínio não importa nada de web nem de banco. Se o serviço precisa salvar algo, ele depende de uma **interface** (\`RepositorioDePedidos\`), e a infraestrutura fornece a implementação (PostgreSQL, ou uma versão em memória nos testes).

        ### Monólito × microsserviços

        | | Monólito (modular) | Microsserviços |
        |---|---|---|
        | Implantação | uma unidade | cada serviço separado |
        | Chamadas entre partes | função (nanossegundos) | rede (milissegundos, pode falhar) |
        | Transações | do banco, simples | distribuídas, difíceis |
        | Quando faz sentido | quase sempre no começo | muitos times, partes com escala muito diferente |

        Um **monólito modular** (módulos bem separados, um deploy só) dá a maior parte dos benefícios sem o custo da rede.

        ### Registrar decisões

        Um **ADR** tem quatro partes: **título**, **contexto** (forças em jogo), **decisão** e **consequências** (o que fica melhor e o que fica pior). Daqui a um ano, ninguém lembra por que escolheu SQLite em vez de PostgreSQL; o ADR lembra.

        ### Processo

        Métodos ágeis entregam em **ciclos curtos** com retorno frequente. **Scrum** organiza o trabalho em *sprints* com papéis e cerimônias; **Kanban** limita o trabalho em andamento e otimiza o fluxo. Ambos dependem de **histórias de usuário** pequenas e com **critérios de aceitação** testáveis.
      `),
      code('text', `
        # ADR 0003 — Usar SQLite embutido no lugar de PostgreSQL

        ## Contexto
        Projeto educacional com uma instância, poucos milhares de usuários, equipe de uma pessoa.
        Precisamos de backup simples e zero serviços extras para instalar.

        ## Decisão
        Usar SQLite (node:sqlite) com WAL, um arquivo em volume persistente.

        ## Consequências
        + Instalação e backup triviais; nenhuma dependência nativa.
        - Escrita concorrente limitada a uma máquina; migrar para PostgreSQL se houver várias instâncias.
      `, 'Um ADR real cabe numa tela. Esta plataforma tomou exatamente essa decisão.'),
    ],
    exemplo: [
      py(`
        from typing import Protocol

        class RepositorioDePedidos(Protocol):     # interface definida pelo domínio
            def salvar(self, pedido: dict) -> None: ...
            def do_cliente(self, cliente: str) -> list: ...

        class ServicoDePedidos:                     # domínio: não sabe que banco existe
            def __init__(self, repo: RepositorioDePedidos):
                self.repo = repo

            def criar(self, cliente, itens):
                if not itens:
                    raise ValueError("pedido sem itens")
                if len(self.repo.do_cliente(cliente)) >= 3:
                    raise ValueError("limite de 3 pedidos abertos")
                pedido = {"cliente": cliente, "itens": itens}
                self.repo.salvar(pedido)
                return pedido

        class RepoEmMemoria:                        # infraestrutura (aqui, para testes)
            def __init__(self):
                self.pedidos = []
            def salvar(self, pedido):
                self.pedidos.append(pedido)
            def do_cliente(self, cliente):
                return [p for p in self.pedidos if p["cliente"] == cliente]

        servico = ServicoDePedidos(RepoEmMemoria())
        for _ in range(3):
            servico.criar("ana", ["livro"])
        try:
            servico.criar("ana", ["caneta"])
        except ValueError as e:
            print("regra aplicada:", e)
      `),
    ],
    codigo: [
      english('Useful phrases in design discussions: *"What problem are we solving?"*, *"What are the trade-offs?"*, *"Let\'s write an ADR for this"*, *"This couples X to Y"*, *"Can we defer this decision?"*, *"You aren\'t gonna need it (YAGNI)"*.'),
      md(`
        **História de usuário com critérios de aceitação** (formato Dado/Quando/Então):

        > Como **estudante**, quero **revisar cartões vencidos** para **não esquecer o que já aprendi**.
        >
        > - **Dado** que tenho 5 cartões vencidos, **quando** abro a Revisão, **então** vejo o primeiro e o contador "5 para hoje".
        > - **Dado** que avaliei um cartão como "Errei", **então** ele volta ainda hoje.
        > - **Dado** que não tenho cartões vencidos, **então** vejo quando vence o próximo.

        Cada critério vira um teste.
      `),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e10-arq-0',
          kind: 'mcq',
          prompt: 'Uma startup de 3 pessoas vai lançar o primeiro produto. Qual arquitetura é a escolha mais sensata para começar?',
          difficulty: 'facil',
          skills: ['eng-arquitetura'],
          hints: ['Quantos times precisam implantar de forma independente?', 'Microsserviços trocam simplicidade por independência entre times.'],
          explanation: 'Um **monólito modular**: um deploy, chamadas locais, transações simples, e módulos bem separados que podem virar serviços se (e quando) houver motivo.',
          options: [
            { text: 'Vinte microsserviços, um por entidade', feedback: 'Custo de rede, deploy e observabilidade enorme para 3 pessoas.' },
            { text: 'Um monólito modular', correct: true, feedback: 'Isso: simples agora, divisível depois.' },
            { text: 'Funções serverless sem nenhuma organização', feedback: 'Sem módulos, a complexidade só muda de lugar.' },
            { text: 'Tanto faz, arquitetura não importa no começo', feedback: 'Importa: separar responsabilidades desde cedo barateia mudanças.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e10-arq-1',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Verifique a **regra de dependência**. Receba \`camadas\` (lista do mais **interno** para o mais **externo**, ex.: \`["dominio", "aplicacao", "web"]\`)
            e \`imports\` (lista de pares \`(modulo_que_importa, modulo_importado)\`, onde o nome do módulo é igual ao da camada).
            Devolva a lista de pares que **violam** a regra (uma camada importando outra **mais externa**), na ordem em que aparecem.
          `),
          difficulty: 'intermediario',
          skills: ['eng-arquitetura'],
          hints: ['Dê a cada camada um nível: a posição dela na lista.', 'Violação: nível de quem importa < nível de quem é importado.'],
          explanation: 'Ferramentas como import-linter (Python) e dependency-cruiser (JavaScript) fazem essa checagem automaticamente no CI, impedindo que a arquitetura apodreça aos poucos.',
          starter: 'def violacoes(camadas, imports):\n    return []\n',
          solution: 'def violacoes(camadas, imports):\n    nivel = {c: i for i, c in enumerate(camadas)}\n    return [(a, b) for a, b in imports if nivel[a] < nivel[b]]\n',
          tests: [
            { name: 'sem violação', code: 'assert violacoes(["dominio", "aplicacao", "web"], [("web", "aplicacao"), ("aplicacao", "dominio"), ("web", "dominio")]) == []' },
            { name: 'domínio importando web', code: 'assert violacoes(["dominio", "aplicacao", "web"], [("dominio", "web"), ("web", "dominio"), ("aplicacao", "web")]) == [("dominio", "web"), ("aplicacao", "web")]' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e10-arq-2',
          kind: 'parsons',
          lang: 'text',
          prompt: 'Coloque as seções de um ADR na ordem usual.',
          lines: ['# Título da decisão', '## Status (proposta, aceita, substituída)', '## Contexto', '## Decisão', '## Consequências'],
          difficulty: 'facil',
          skills: ['eng-arquitetura'],
          hints: ['Primeiro se explica o problema, depois a escolha, depois o efeito dela.'],
          explanation: 'Contexto antes da decisão: quem lê no futuro precisa entender as forças em jogo para julgar se a decisão ainda vale.',
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e10-arq-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Para trocar o banco sem mudar as regras, o serviço depende de uma interface.
            Implemente \`ServicoDeContas(repo)\` com \`transferir(origem, destino, valor)\`:

            - \`valor\` deve ser positivo, senão \`ValueError("valor inválido")\`;
            - a origem precisa ter saldo suficiente, senão \`ValueError("saldo insuficiente")\`;
            - use apenas \`repo.saldo(conta)\` e \`repo.definir_saldo(conta, novo)\`.

            Implemente também \`RepoEmMemoria(saldos)\` (recebe um dicionário inicial) para os testes.
          `),
          difficulty: 'desafio',
          skills: ['eng-arquitetura'],
          hints: ['O serviço não deve tocar no dicionário diretamente: só nos dois métodos do repositório.', 'Valide tudo antes de alterar qualquer saldo.'],
          explanation: 'Como o serviço só conhece a interface, o mesmo código roda com um repositório em memória (testes rápidos) ou com PostgreSQL (produção, dentro de uma transação). Validar antes de alterar evita deixar o sistema pela metade.',
          starter: 'class RepoEmMemoria:\n    def __init__(self, saldos):\n        pass\n\nclass ServicoDeContas:\n    def __init__(self, repo):\n        self.repo = repo\n\n    def transferir(self, origem, destino, valor):\n        pass\n',
          solution: dedent(`
            class RepoEmMemoria:
                def __init__(self, saldos):
                    self.saldos = dict(saldos)

                def saldo(self, conta):
                    return self.saldos.get(conta, 0)

                def definir_saldo(self, conta, novo):
                    self.saldos[conta] = novo

            class ServicoDeContas:
                def __init__(self, repo):
                    self.repo = repo

                def transferir(self, origem, destino, valor):
                    if valor <= 0:
                        raise ValueError("valor inválido")
                    s = self.repo.saldo(origem)
                    if s < valor:
                        raise ValueError("saldo insuficiente")
                    self.repo.definir_saldo(origem, s - valor)
                    self.repo.definir_saldo(destino, self.repo.saldo(destino) + valor)
          `),
          tests: [
            { name: 'transferência', code: 'r = RepoEmMemoria({"a": 100, "b": 5})\nServicoDeContas(r).transferir("a", "b", 30)\nassert r.saldo("a") == 70 and r.saldo("b") == 35' },
            { name: 'saldo insuficiente não altera nada', code: 'r = RepoEmMemoria({"a": 10})\ntry:\n    ServicoDeContas(r).transferir("a", "b", 30)\n    assert False\nexcept ValueError as e:\n    assert str(e) == "saldo insuficiente"\nassert r.saldo("a") == 10 and r.saldo("b") == 0' },
            { name: 'valor inválido', code: 'r = RepoEmMemoria({"a": 10})\ntry:\n    ServicoDeContas(r).transferir("a", "b", 0)\n    assert False\nexcept ValueError as e:\n    assert str(e) == "valor inválido"' },
            {
              name: 'usa só a interface',
              code: 'class Espiao:\n    def __init__(self):\n        self.chamadas = []\n        self.s = {"a": 50}\n    def saldo(self, c):\n        self.chamadas.append("saldo")\n        return self.s.get(c, 0)\n    def definir_saldo(self, c, v):\n        self.chamadas.append("definir")\n        self.s[c] = v\ne = Espiao()\nServicoDeContas(e).transferir("a", "b", 20)\nassert e.s == {"a": 30, "b": 20}',
            },
          ],
        },
      },
    ],
    projeto: [
      { type: 'project', projectId: 'p9-fullstack' },
      md('No **projeto full-stack**, escreva pelo menos dois ADRs (escolha do banco e da forma de autenticação), organize o back-end em camadas com a regra de dependência e transforme as funcionalidades em histórias de usuário com critérios de aceitação antes de programar.'),
    ],
    revisao: [
      md(`
        - Dependências apontam para dentro: domínio não conhece web nem banco.
        - Monólito modular primeiro; microsserviços quando há motivo concreto (times, escala).
        - ADR: contexto, decisão, consequências.
        - História de usuário + critérios Dado/Quando/Então; cada critério vira teste.
      `),
      deep('Leia o capítulo sobre trade-offs de *Designing Data-Intensive Applications* e o capítulo de documentação de *Software Engineering at Google*. Depois, leia os ADRs de algum projeto open source grande: muitos ficam na pasta `docs/adr`.'),
    ],
  },
  review: [
    ['O que diz a regra de dependência?', 'Camadas internas (domínio) não dependem das externas (web, banco); as dependências apontam para dentro.'],
    ['Quatro partes de um ADR?', 'Título, contexto, decisão e consequências (geralmente também o status).'],
    ['Quando microsserviços fazem sentido?', 'Quando há vários times que precisam implantar de forma independente ou partes com necessidades de escala muito diferentes.'],
    ['Formato de uma história de usuário?', '"Como <quem>, quero <o quê>, para <por quê>", com critérios de aceitação testáveis.'],
  ],
  references: ['ddia', 'swe-at-google', 'pragmatic-programmer'],
});

