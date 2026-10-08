var e={id:`l6-http-rest`,moduleId:`m6-3`,title:`HTTP, REST e APIs JSON`,titleEn:`HTTP, REST and JSON APIs`,summary:`Métodos, status, cabeçalhos, design de APIs REST, JSON e consumo com fetch.`,minutes:40,objectives:[`Usar corretamente métodos e códigos de status HTTP`,`Projetar rotas REST para um recurso`,`Serializar e validar JSON`,`Entender idempotência, cache e CORS em alto nível`],skills:[`web-http-api`],terms:[{pt:`interface de programação`,en:`API (application programming interface)`,def:`Contrato que permite a um programa usar serviços de outro.`},{pt:`recurso`,en:`resource`,def:`A "coisa" exposta pela API: /alunos, /alunos/42.`},{pt:`ponto de acesso`,en:`endpoint`,def:`Combinação de método + caminho: GET /alunos.`},{pt:`cabeçalho`,en:`header`,def:`Metadado da requisição/resposta: Content-Type, Authorization.`},{pt:`corpo`,en:`body / payload`,def:`Os dados enviados na requisição ou resposta.`},{pt:`idempotente`,en:`idempotent`,def:`Repetir a operação tem o mesmo efeito que fazê-la uma vez.`}],references:[`mdn-http`,`rfc9110`,`owasp-api`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Uma **{{API|API}}** web é um servidor que responde a requisições HTTP com dados (geralmente **JSON**) em vez de páginas. **REST** é um estilo de projeto em que a URL identifica um **{{recurso|resource}}** e o **método** HTTP diz o que fazer com ele.`}]},{stage:`explicacao`,blocks:[{type:`table`,head:[`Método`,`Uso`,`Exemplo`,`Idempotente?`],rows:[[`GET`,`ler`,`GET /alunos/42`,`sim (e seguro: não altera)`],[`POST`,`criar`,`POST /alunos  (corpo: JSON do aluno)`,`não`],[`PUT`,`substituir`,`PUT /alunos/42`,`sim`],[`PATCH`,`alterar parcialmente`,`PATCH /alunos/42  {"email": "..."}`,`não necessariamente`],[`DELETE`,`remover`,`DELETE /alunos/42`,`sim`]]},{type:`md`,text:'**Códigos de status** que uma API deve usar com precisão: `200 OK`, `201 Created` (com cabeçalho `Location`), `204 No Content`, `400 Bad Request` (validação), `401 Unauthorized` (não autenticado), `403 Forbidden` (sem permissão), `404 Not Found`, `409 Conflict`, `422 Unprocessable Content`, `429 Too Many Requests`, `500`.\n\n**Boas práticas de design**: substantivos no plural (`/alunos`), aninhamento raso (`/alunos/42/matriculas`), paginação (`?pagina=2&limite=20`), erros com corpo útil (`{"erro": "email inválido", "campo": "email"}`), versão (`/v1/`), e **validar toda entrada** no servidor.\n\n**CORS**: por segurança, o navegador bloqueia que um site leia respostas de outra origem, a menos que o servidor permita com cabeçalhos `Access-Control-Allow-Origin`.'},{type:`callout`,tone:`english`,text:`Documentação de APIs tem um vocabulário próprio: *"Returns a paginated list of..."*, *"Requires authentication"*, *"Rate limit: 100 requests per minute"*, *"This endpoint is idempotent"*, *"Request body"*, *"Query parameters"*, *"Response schema"*.`,title:`English corner`}]},{stage:`exemplo`,blocks:[{type:`code`,lang:`text`,code:`POST /v1/tarefas HTTP/1.1
Host: api.exemplo.com
Content-Type: application/json
Authorization: Bearer eyJhbGciOi...

{"titulo": "estudar REST", "prioridade": 2}

HTTP/1.1 201 Created
Location: /v1/tarefas/57
Content-Type: application/json

{"id": 57, "titulo": "estudar REST", "prioridade": 2, "feita": false}`,runnable:!1,caption:`Uma requisição e uma resposta completas.`}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`import json

def validar_tarefa(corpo: str):
    """Devolve (status, resposta) como uma API faria."""
    try:
        dados = json.loads(corpo)
    except json.JSONDecodeError:
        return 400, {"erro": "JSON inválido"}
    titulo = dados.get("titulo")
    if not isinstance(titulo, str) or not titulo.strip():
        return 422, {"erro": "titulo é obrigatório", "campo": "titulo"}
    return 201, {"id": 1, "titulo": titulo.strip(), "feita": False}

print(validar_tarefa('{"titulo": "  estudar  "}'))
print(validar_tarefa('{"titulo": ""}'))
print(validar_tarefa('nao é json'))`,runnable:!0}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e6-http-0`,kind:`mcq`,prompt:`Uma API devolveu **404 Not Found**. O que isso significa?`,difficulty:`facil`,skills:[`web-http-api`],hints:[`Códigos 4xx indicam um problema do lado de quem fez o pedido.`],explanation:`404 significa que o recurso pedido não existe naquele endereço. 4xx são erros do cliente (pedido errado); 5xx são erros do servidor.`,options:[{text:`O recurso pedido não existe naquele endereço`,correct:!0,feedback:`Isso. Confira a URL e o id.`},{text:`O servidor caiu`,feedback:`Falha do servidor é 5xx, como 500 ou 503.`},{text:`Você não tem permissão`,feedback:`Sem permissão é 403 (ou 401 sem autenticação).`},{text:`Deu tudo certo`,feedback:`Sucesso é 2xx, como 200 OK.`}]}},{type:`exercise`,exercise:{id:`e6-http-1`,kind:`mcq`,prompt:`Um usuário logado tenta apagar a conta de **outro** usuário pela API. Qual status a API deve devolver?`,difficulty:`intermediario`,skills:[`web-http-api`],hints:[`O servidor sabe quem ele é (autenticado). Ele tem permissão?`],explanation:`403 Forbidden: autenticado, mas sem autorização. 401 é para quando não se sabe quem é (sem login ou token inválido). Algumas APIs devolvem 404 para não revelar que o recurso existe.`,options:[{text:`401 Unauthorized`,feedback:`401 significa "não autenticado". Aqui o usuário está logado.`},{text:`403 Forbidden`,correct:!0,feedback:`Isso: autenticado, mas não autorizado.`},{text:`400 Bad Request`,feedback:`A requisição está bem formada.`},{text:`200 OK`,feedback:`Jamais: seria uma falha grave de autorização (Broken Access Control, nº 1 do OWASP).`}]}},{type:`exercise`,exercise:{id:`e6-http-2`,kind:`code`,lang:`python`,prompt:'Escreva um roteador mínimo: `rotear(metodo, caminho)` devolve o nome do handler segundo a tabela\n`GET /tarefas → "listar"`, `POST /tarefas → "criar"`, `GET /tarefas/<id> → "detalhar"`,\n`DELETE /tarefas/<id> → "remover"`, onde <id> é numérico. Devolva uma tupla `(handler, params)`, com params\n`{"id": int}` quando houver. Caminho desconhecido → `("404", {})`; caminho conhecido com método errado → `("405", {})`.',difficulty:`avancado`,skills:[`web-http-api`],hints:['Divida o caminho em partes: `caminho.strip("/").split("/")`.',`Primeiro descubra **qual rota** casa (com ou sem id); depois verifique o método.`,"`parte.isdigit()` diz se o id é numérico."],explanation:`Frameworks web (Flask, Express, Fastify) fazem exatamente isso, com mais recursos. Distinguir 404 (rota não existe) de 405 (*Method Not Allowed*) é um detalhe que APIs bem feitas respeitam.`,starter:`def rotear(metodo, caminho):
    pass
`,solution:`ROTAS = {
    ("tarefas",): {"GET": "listar", "POST": "criar"},
    ("tarefas", ":id"): {"GET": "detalhar", "DELETE": "remover"},
}

def rotear(metodo, caminho):
    partes = [p for p in caminho.strip("/").split("/") if p]
    params = {}
    chave = None
    if partes == ["tarefas"]:
        chave = ("tarefas",)
    elif len(partes) == 2 and partes[0] == "tarefas" and partes[1].isdigit():
        chave = ("tarefas", ":id")
        params = {"id": int(partes[1])}
    if chave is None:
        return ("404", {})
    handler = ROTAS[chave].get(metodo)
    if handler is None:
        return ("405", {})
    return (handler, params)`,tests:[{name:`listar e criar`,code:`assert rotear("GET", "/tarefas") == ("listar", {}) and rotear("POST", "/tarefas/") == ("criar", {})`},{name:`com id`,code:`assert rotear("GET", "/tarefas/42") == ("detalhar", {"id": 42}) and rotear("DELETE", "/tarefas/7") == ("remover", {"id": 7})`},{name:`404 e 405`,code:`assert rotear("GET", "/alunos") == ("404", {}) and rotear("GET", "/tarefas/abc") == ("404", {}) and rotear("PUT", "/tarefas") == ("405", {})`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e6-http-desafio`,kind:`mcq`,prompt:"Um app móvel reenvia automaticamente `POST /pagamentos` quando a rede falha. Como evitar cobranças duplicadas?",difficulty:`desafio`,skills:[`web-http-api`],hints:[`POST não é idempotente. Como o servidor pode reconhecer que é a mesma tentativa?`],explanation:"O cliente gera uma **chave de idempotência** única por pagamento (cabeçalho `Idempotency-Key`); o servidor guarda o resultado associado e, ao receber a mesma chave, devolve o resultado salvo sem cobrar de novo. É o que APIs de pagamento como a da Stripe fazem.",options:[{text:`Trocar POST por GET`,feedback:`GET não deve ter efeitos colaterais, e não resolve a duplicidade.`},{text:`Enviar uma chave de idempotência única por tentativa lógica e o servidor deduplicar`,correct:!0,feedback:`Isso: torna a operação idempotente.`},{text:`Desabilitar o reenvio`,feedback:`Aí pagamentos legítimos falhariam em redes instáveis.`},{text:`Aumentar o timeout`,feedback:`Reduz, mas não elimina, o problema.`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:`**Projeto 5 — API REST de tarefas**: construa uma API com Python (FastAPI ou Flask) ou Node (Fastify/Express) com CRUD de tarefas, validação, códigos de status corretos, testes automatizados e documentação OpenAPI. Este é o primeiro projeto de back-end.`},{type:`project`,projectId:`p5-api`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- REST: recurso na URL, ação no método.
- Status precisos: 201, 204, 400, 401, 403, 404, 409, 422, 429.
- Valide toda entrada no servidor; erros com corpo útil.
- Idempotência importa em redes instáveis.`}]}],cards:[{id:`l6-http-rest#1`,front:`401 × 403?`,back:`401: não autenticado. 403: autenticado, mas sem permissão.`},{id:`l6-http-rest#2`,front:`Quais métodos HTTP são idempotentes?`,back:`GET, PUT, DELETE (e HEAD, OPTIONS). POST não é.`},{id:`l6-http-rest#3`,front:`O que é CORS?`,back:`Mecanismo pelo qual o servidor permite que páginas de outras origens leiam suas respostas no navegador.`}]};export{e as default};
//# sourceMappingURL=l6-http-rest-D8F1n4tQ.js.map