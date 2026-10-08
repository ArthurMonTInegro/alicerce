var e={id:`l6-backend-auth`,moduleId:`m6-4`,title:`Back-end: rotas, camadas, validação e sessões`,titleEn:`Back-end: routes, layers, validation and sessions`,summary:`Como um servidor web organiza o código em camadas, valida a entrada, trata erros e sabe quem é o usuário (cookies de sessão × tokens).`,minutes:50,objectives:[`Descrever o caminho de uma requisição: rota → validação → serviço → repositório → resposta`,`Validar entrada no servidor e devolver o código HTTP certo`,`Comparar sessão com cookie e token (JWT), com prós e contras`,`Explicar por que o servidor nunca confia no cliente`],skills:[`web-backend`],terms:[{pt:`rota`,en:`route`,def:`Combinação de método HTTP + caminho que aciona um trecho de código.`,example:`GET /api/users/:id`},{pt:`manipulador`,en:`handler`,def:`Função que recebe a requisição e produz a resposta.`},{pt:`camada de serviço`,en:`service layer`,def:`Onde ficam as regras de negócio, sem detalhes de HTTP nem de banco.`},{pt:`repositório`,en:`repository`,def:`Camada que conversa com o banco de dados.`},{pt:`validação`,en:`validation`,def:`Conferir formato, tipo e limites de um dado antes de usá-lo.`},{pt:`sessão`,en:`session`,def:`Estado do usuário guardado no servidor, ligado a um identificador no cookie.`},{pt:`token de acesso`,en:`access token`,def:`Credencial que o cliente envia a cada requisição; o JWT é um formato comum.`},{pt:`intermediário`,en:`middleware`,def:`Função que roda antes (ou depois) dos handlers: log, autenticação, limite de taxa.`}],references:[`owasp-cheatsheets`,`mdn-http`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`O **back-end** é o programa que roda no servidor: recebe requisições HTTP, aplica as regras do negócio, lê e grava no banco e devolve respostas. A regra de ouro: **o servidor nunca confia no cliente**. Tudo que chega pela rede pode ter sido forjado, então é validado de novo no servidor, mesmo que o front-end já tenha validado.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`### O caminho de uma requisição

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

Para um site comum, **sessão opaca em cookie \`HttpOnly; Secure; SameSite=Lax\`** costuma ser a escolha mais simples e segura. Esta própria plataforma usa esse modelo e guarda no banco só o *hash* do token da sessão.`},{type:`callout`,tone:`warn`,text:`Mensagens de erro de login devem ser genéricas ("e-mail ou senha incorretos"). Dizer "esse e-mail não existe" permite descobrir quem tem conta (*user enumeration*).`,title:`Cuidado com o que o erro revela`}]},{stage:`exemplo`,blocks:[{type:`code`,lang:`python`,code:`# Um "mini-framework" para ver as camadas sem depender de rede.
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
print(criar_tarefa("ana", {"titulo": "  estudar redes  "}))`,runnable:!0}]},{stage:`codigo`,blocks:[{type:`code`,lang:`javascript`,code:`// O mesmo handler num servidor Node com Fastify (não roda no navegador).
app.post('/api/tarefas', async (req, reply) => {
  const usuario = await usuarioDaSessao(req);           // middleware de autenticação
  if (!usuario) return reply.code(401).send({ erro: 'faça login' });
  const erros = validarTarefa(req.body);
  if (erros.length) return reply.code(400).send({ erros });
  const tarefa = await servicoTarefas.criar(usuario.id, req.body.titulo);
  return reply.code(201).send(tarefa);
});`,runnable:!0,caption:`Mesma lógica, agora num framework real. O formato muda pouco entre FastAPI, Express e Fastify.`},{type:`callout`,tone:`english`,text:`Status codes you will read every day: **200 OK**, **201 Created**, **204 No Content**, **400 Bad Request** (invalid input), **401 Unauthorized** (not logged in), **403 Forbidden** (logged in, not allowed), **404 Not Found**, **409 Conflict**, **429 Too Many Requests**, **500 Internal Server Error**.`,title:`English corner`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e6-back-0`,kind:`mcq`,prompt:`O usuário está logado, mas tenta apagar a tarefa de **outra pessoa**. Qual código HTTP descreve melhor a resposta?`,difficulty:`facil`,skills:[`web-backend`],hints:[`O servidor sabe quem ele é. A questão é se ele **pode** fazer isso.`,`Autenticação × autorização.`],explanation:`**403 Forbidden**: autenticado, mas sem permissão. 401 é para quando não se sabe quem é o usuário. Alguns sistemas respondem 404 para não revelar que o recurso existe; também é aceitável, desde que seja consistente.`,options:[{text:`401 Unauthorized`,feedback:`401 significa "não autenticado". Aqui o servidor sabe quem é o usuário.`},{text:`403 Forbidden`,correct:!0,feedback:`Isso: sabe quem é, mas não pode.`},{text:`400 Bad Request`,feedback:`A requisição está bem formada; o problema é permissão.`},{text:`500 Internal Server Error`,feedback:`500 é falha do servidor, não regra de acesso.`}]}},{type:`exercise`,exercise:{id:`e6-back-1`,kind:`code`,lang:`python`,prompt:'Escreva `validar_cadastro(corpo)` que recebe um dicionário e devolve a **lista de erros** (vazia se estiver tudo certo):\n\n- `"email inválido"` se `email` não for texto com exatamente um `@` e pelo menos um `.` depois dele;\n- `"senha curta"` se `senha` não for texto com pelo menos 10 caracteres;\n- `"idade inválida"` se `idade` existir e não for um inteiro entre 13 e 120 (`True`/`False` não contam como inteiros).\n\nOs erros aparecem nessa ordem.',difficulty:`intermediario`,skills:[`web-backend`],hints:[`Comece pelo caso feliz: um dicionário válido deve devolver [].`,`Use isinstance(x, str) antes de chamar métodos de texto.`,`Em Python, isinstance(True, int) é True. Teste o tipo bool antes.`],explanation:`Validar no servidor é obrigatório porque qualquer pessoa pode enviar uma requisição sem passar pelo formulário. Note como cada regra checa o **tipo** antes do **valor**: assim um JSON malicioso (número no lugar de texto) não derruba o servidor.`,starter:`def validar_cadastro(corpo):
    erros = []
    return erros
`,solution:`def validar_cadastro(corpo):
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
    return erros`,tests:[{name:`válido`,code:`assert validar_cadastro({"email": "ana@ex.com", "senha": "frase longa demais", "idade": 30}) == []`},{name:`sem idade é válido`,code:`assert validar_cadastro({"email": "a@b.co", "senha": "1234567890"}) == []`},{name:`tudo errado`,code:`assert validar_cadastro({"email": "a@@b", "senha": "curta", "idade": 7}) == ["email inválido", "senha curta", "idade inválida"]`},{name:`tipos errados`,code:`assert validar_cadastro({"email": 5, "senha": None, "idade": True}) == ["email inválido", "senha curta", "idade inválida"]`},{name:`ponto antes do @ não vale`,code:`assert validar_cadastro({"email": "a.b@com", "senha": "1234567890"}) == ["email inválido"]`}]}},{type:`exercise`,exercise:{id:`e6-back-2`,kind:`mcq`,prompt:"Por que o cookie de sessão deve ter o atributo `HttpOnly`?",difficulty:`intermediario`,skills:[`web-backend`],hints:["Pense em quem consegue ler `document.cookie`."],explanation:"`HttpOnly` impede que JavaScript da página leia o cookie. Se um atacante conseguir injetar script (XSS), ainda assim não rouba a sessão diretamente.",options:[{text:`Para o cookie só ser enviado por HTTPS`,feedback:"Isso é o atributo `Secure`."},{text:`Para JavaScript da página não conseguir ler o cookie`,correct:!0,feedback:`Exato: reduz o estrago de um XSS.`},{text:`Para o cookie não ser enviado por outros sites`,feedback:"Isso é o `SameSite`."},{text:`Para o cookie expirar ao fechar o navegador`,feedback:"Isso depende de `Expires`/`Max-Age`."}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e6-back-desafio`,kind:`code`,lang:`python`,prompt:'Implemente um pequeno **roteador**. `Roteador()` tem:\n\n- `adicionar(metodo, padrao, handler)`, onde `padrao` é como `"/tarefas/:id"`;\n- `despachar(metodo, caminho)`, que chama o handler da primeira rota que casar, passando um dicionário com os parâmetros (`{"id": "42"}`), e devolve o que o handler devolver. Se nenhuma rota casar, devolve `(404, "não encontrado")`. Se o caminho casar mas o método não, devolve `(405, "método não permitido")`.\n\nBarras no fim são ignoradas: `/tarefas/` casa com `/tarefas`.',difficulty:`desafio`,skills:[`web-backend`],hints:[`Quebre padrão e caminho com split("/") e descarte partes vazias.`,`Uma parte que começa com ":" casa com qualquer texto e vira parâmetro.`,`Para distinguir 404 de 405, lembre se algum padrão casou com o caminho, independentemente do método.`],explanation:`É assim que frameworks como Express e Fastify funcionam por dentro (os de verdade usam uma árvore de prefixos para ficar rápidos com centenas de rotas). Distinguir 404 de 405 ajuda quem consome a API a entender o erro.`,starter:`class Roteador:
    def __init__(self):
        self.rotas = []

    def adicionar(self, metodo, padrao, handler):
        pass

    def despachar(self, metodo, caminho):
        return (404, "não encontrado")`,solution:`class Roteador:
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
        return (405, "método não permitido") if caminho_existe else (404, "não encontrado")`,tests:[{name:`parâmetro`,code:`r = Roteador()
r.adicionar("GET", "/tarefas/:id", lambda p: (200, p["id"]))
assert r.despachar("GET", "/tarefas/42") == (200, "42")`},{name:`barra final`,code:`r = Roteador()
r.adicionar("GET", "/tarefas", lambda p: (200, "lista"))
assert r.despachar("GET", "/tarefas/") == (200, "lista")`},{name:`404 e 405`,code:`r = Roteador()
r.adicionar("GET", "/tarefas/:id", lambda p: (200, p))
assert r.despachar("GET", "/nada") == (404, "não encontrado")
assert r.despachar("DELETE", "/tarefas/1") == (405, "método não permitido")`},{name:`dois parâmetros`,code:`r = Roteador()
r.adicionar("GET", "/u/:uid/t/:tid", lambda p: (200, p))
assert r.despachar("GET", "/u/7/t/9") == (200, {"uid": "7", "tid": "9"})`}]}}]},{stage:`projeto`,blocks:[{type:`project`,projectId:`p5-api`},{type:`md`,text:`Aplique no projeto da **API REST**: separe rotas, serviço e repositório em arquivos diferentes; valide toda entrada no servidor; devolva 400, 401, 403, 404 e 409 nos casos certos; e escreva um teste para cada regra do serviço.`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Requisição: rota → middlewares → validação → serviço → repositório → resposta.
- O servidor revalida tudo. Tipo antes de valor.
- 401 = não sei quem é você; 403 = sei, mas você não pode.
- Sessão em cookie \`HttpOnly; Secure; SameSite\` é o padrão seguro para sites; JWT brilha entre serviços.`},{type:`callout`,tone:`deep`,text:"Para aprofundar: leia as *Cheat Sheets* da OWASP sobre autenticação e gerenciamento de sessão, e compare com a implementação da API desta plataforma (`apps/api/src/auth.ts`).",title:`Aprofundando`}]}],cards:[{id:`l6-backend-auth#1`,front:`Qual a diferença entre 401 e 403?`,back:`401: o servidor não sabe quem você é (não autenticado). 403: sabe, mas você não tem permissão.`},{id:`l6-backend-auth#2`,front:`Por que validar no servidor se o front-end já valida?`,back:`Porque qualquer um pode mandar requisições direto, sem passar pelo front-end. A validação do cliente é só conforto.`},{id:`l6-backend-auth#3`,front:`O que cada camada faz: rota, serviço, repositório?`,back:`Rota: traduz HTTP. Serviço: regras de negócio. Repositório: acesso ao banco.`},{id:`l6-backend-auth#4`,front:`Uma vantagem da sessão no servidor sobre o JWT?`,back:`Dá para encerrar a sessão na hora, apagando-a no servidor.`}]};export{e as default};
//# sourceMappingURL=l6-backend-auth-JA0gBNXJ.js.map