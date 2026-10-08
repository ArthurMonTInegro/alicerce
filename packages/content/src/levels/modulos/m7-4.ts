/** Lições adicionais do módulo m7-4 (nosql e dados em escala). */
import type { Block, CodeLang, Lesson } from '../../types.ts';
import { dedent, deep, english, info, lesson, md, py, t, tip, warn } from '../../helpers.ts';

/** Código só de leitura (mongosh, redis-cli): mostra comandos de servidores que não rodam no navegador. */
const leitura = (lang: CodeLang, src: string, caption?: string): Block => ({
  type: 'code',
  lang,
  code: dedent(src),
  runnable: false,
  ...(caption ? { caption } : {}),
});

/* ------------------------------------------------------------------ */
/* Modelando para o acesso: documentos (MongoDB) e chave-valor (Redis) */
/* ------------------------------------------------------------------ */

/** Pedidos de delivery guardados como documentos JSON numa tabela SQLite (exercício SQL). */
const PEDIDOS_JSON = dedent(`
  CREATE TABLE pedidos (id TEXT PRIMARY KEY, doc TEXT NOT NULL);
  INSERT INTO pedidos VALUES
  ('P1', '{"cliente": "Ana", "status": "entregue", "itens": [{"produto": "Açaí 500 ml", "qtd": 2, "preco": 18.0}, {"produto": "Granola extra", "qtd": 1, "preco": 3.0}]}'),
  ('P2', '{"cliente": "Bruno", "status": "entregue", "itens": [{"produto": "Pastel de queijo", "qtd": 3, "preco": 9.0}, {"produto": "Caldo de cana 500 ml", "qtd": 2, "preco": 8.0}]}'),
  ('P3', '{"cliente": "Ana", "status": "cancelado", "itens": [{"produto": "Açaí 500 ml", "qtd": 4, "preco": 18.0}]}'),
  ('P4', '{"cliente": "Carla", "status": "entregue", "itens": [{"produto": "Açaí 500 ml", "qtd": 2, "preco": 18.0}, {"produto": "Pastel de queijo", "qtd": 1, "preco": 9.0}]}'),
  ('P5', '{"cliente": "Davi", "status": "a caminho", "itens": [{"produto": "Caldo de cana 500 ml", "qtd": 5, "preco": 8.0}]}'),
  ('P6', '{"cliente": "Eva", "status": "entregue", "itens": []}');
`);

/** O MiniRedis do exercício de limitação de taxa: comandos com o instante `agora` e um contador de chamadas. */
const MINI_REDIS = dedent(`
  class MiniRedis:
      """Imita o Redis num dict. Cada comando recebe o instante agora (em segundos)."""

      def __init__(self):
          self.dados = {}     # chave -> valor
          self.prazo = {}     # chave -> instante em que a chave expira
          self.chamadas = {"get": 0, "set": 0, "incr": 0, "expire": 0, "ttl": 0}

      def _limpa(self, chave, agora):
          if chave in self.prazo and agora >= self.prazo[chave]:
              del self.dados[chave]
              del self.prazo[chave]

      def get(self, chave, agora):
          self.chamadas["get"] += 1
          self._limpa(chave, agora)
          return self.dados.get(chave)

      def set(self, chave, valor, agora):
          self.chamadas["set"] += 1
          self.dados[chave] = valor
          self.prazo.pop(chave, None)      # como no Redis, SET apaga o prazo

      def incr(self, chave, agora):
          self.chamadas["incr"] += 1
          self._limpa(chave, agora)
          self.dados[chave] = self.dados.get(chave, 0) + 1
          return self.dados[chave]

      def expire(self, chave, segundos, agora, nx=False):
          """Dá prazo à chave. Com nx=True, só se ela ainda não tiver prazo. Devolve 1 se definiu, 0 se não."""
          self.chamadas["expire"] += 1
          self._limpa(chave, agora)
          if chave not in self.dados or (nx and chave in self.prazo):
              return 0
          self.prazo[chave] = agora + segundos
          return 1

      def ttl(self, chave, agora):
          """Segundos até expirar; -1 se não tem prazo; -2 se a chave não existe."""
          self.chamadas["ttl"] += 1
          self._limpa(chave, agora)
          if chave not in self.dados:
              return -2
          if chave not in self.prazo:
              return -1
          return self.prazo[chave] - agora
`);

/** Pedidos usados nos testes do desafio de filtros no estilo do MongoDB. */
const PEDIDOS_FILTRO = dedent(`
  _PEDIDOS = [
      {"_id": "P1", "cliente": {"nome": "Ana", "cidade": "Recife"}, "status": "entregue", "total": 39.0,
       "tags": ["pix", "promo"], "itens": [{"produto": "Açaí 500 ml", "qtd": 2}, {"produto": "Granola extra", "qtd": 1}]},
      {"_id": "P2", "cliente": {"nome": "Bruno", "cidade": "São Paulo"}, "status": "entregue", "total": 43.0,
       "tags": ["cartao"], "itens": [{"produto": "Pastel de queijo", "qtd": 3}, {"produto": "Caldo de cana 500 ml", "qtd": 2}]},
      {"_id": "P3", "cliente": {"nome": "Ana", "cidade": "Recife"}, "status": "cancelado", "total": 72.0,
       "itens": [{"produto": "Açaí 500 ml", "qtd": 4}]},
      {"_id": "P4", "cliente": {"nome": "Carla", "cidade": "Olinda"}, "status": "a caminho", "total": "27,00",
       "tags": ["pix"], "itens": [{"produto": "Pastel de queijo", "qtd": 1}, {"produto": "Açaí 500 ml", "qtd": 1}]},
      {"_id": "P5", "status": "entregue", "total": 8.0, "itens": []},
  ]

  def _ids(filtro):
      return [d["_id"] for d in _PEDIDOS if bool(combina(d, filtro))]

  def _confere(casos):
      for filtro, esperado, dica in casos:
          r = _ids(filtro)
          assert r == esperado, f"filtro {filtro}: combinaram {r}, esperado {esperado}. {dica}"
`);

const documentos = lesson({
  id: 'l7-documentos-chave-valor',
  moduleId: 'm7-4',
  title: 'Modelando para o acesso: documentos e chave-valor',
  titleEn: 'Modeling for access patterns: documents and key-value',
  summary: 'Como dar forma aos dados no MongoDB e no Redis a partir das perguntas que o sistema faz: embutir ou referenciar, o que copiar de propósito, consultas com notação de ponto e pipeline de agregação, as cinco estruturas do Redis, comandos atômicos, cache-aside e limitação de taxa.',
  minutes: 50,
  objectives: [
    'Listar os padrões de acesso de um sistema antes de escolher a forma dos dados',
    'Decidir entre embutir e referenciar pela leitura conjunta, pela cardinalidade, pelo crescimento e pela atomicidade',
    'Separar o retrato de um fato (que não deve mudar) da desnormalização (que precisa ser mantida em dia)',
    'Ler consultas do MongoDB com notação de ponto e um pipeline de agregação, traduzindo cada estágio para SQL',
    'Escolher a estrutura do Redis para cada problema e explicar por que INCR não perde atualizações',
    'Implementar cache-aside com invalidação e limitação de taxa por janela fixa, conhecendo os pontos fracos de cada um',
  ],
  skills: ['bd-nosql'],
  terms: [
    t('padrão de acesso', 'access pattern', 'Uma pergunta que a aplicação faz aos dados, com a frequência dela; em bancos NoSQL, é o que define a forma dos dados.', 'Start by listing your access patterns, then design the keys around them.'),
    t('embutir', 'embed', 'Guardar os dados relacionados dentro do mesmo documento.', 'Embed the order items in the order document.'),
    t('referenciar', 'reference', 'Guardar só o identificador do outro documento e buscá-lo à parte.'),
    t('desnormalizar', 'denormalize', 'Copiar um dado para mais de um lugar para ler mais depressa, aceitando o trabalho de manter as cópias em dia.'),
    t('esquema na leitura', 'schema-on-read', 'O banco aceita documentos de qualquer formato; quem lê interpreta e lida com as variações.'),
    t('pipeline de agregação', 'aggregation pipeline', 'Sequência de estágios ($match, $group, $sort...) em que a saída de um é a entrada do próximo.'),
    t('índice multichave', 'multikey index', 'Índice sobre um campo que é array, com uma entrada para cada elemento.'),
    t('conjunto ordenado', 'sorted set', 'Estrutura do Redis com membros únicos, cada um com uma pontuação, mantidos em ordem de pontuação.', 'ZINCRBY leaderboard 10 "ana"'),
    t('atualização perdida', 'lost update', 'Duas leituras-e-escritas intercaladas em que a segunda sobrescreve a primeira sem saber dela.'),
    t('cache-aside', 'cache-aside', 'Padrão em que a aplicação procura no cache, vai ao banco quando não acha e guarda o resultado no cache.'),
    t('invalidação de cache', 'cache invalidation', 'Apagar a cópia em cache quando o original muda.', 'There are only two hard things in Computer Science: cache invalidation and naming things.'),
    t('limitação de taxa', 'rate limiting', 'Limitar quantas operações um cliente pode fazer por intervalo de tempo.'),
    t('janela fixa', 'fixed window', 'Limitação de taxa que conta as operações em intervalos fixos do relógio, como cada minuto.'),
  ],
  stages: {
    conceito: [
      md(`
        No modelo relacional, você **normaliza** os dados primeiro e escreve as consultas depois: uma pergunta nova vira um JOIN, e o otimizador escolhe como executá-lo. Bancos de documentos e de chave-valor invertem essa ordem. Como eles quase não juntam coleções (o MongoDB tem \`$lookup\`, mas cada junção é uma busca a mais por documento; o Redis não tem nada parecido), você começa pela lista de perguntas que a aplicação faz, os {{padrões de acesso|access patterns}}, e dá aos dados a forma que responde a cada pergunta frequente com **uma** leitura.

        A lição anterior mostrou os modelos lado a lado e um cache com expiração. Nesta, você vai desenhar um app de delivery: o que vira um documento só, o que fica separado, o que se copia de propósito (e o que nunca se deve copiar), como consultar documentos aninhados e quais estruturas do Redis resolvem ranking, contadores e limite de tentativas sem condição de corrida.
      `),
    ],
    explicacao: [
      md(`
        ### O documento é a unidade de leitura, de escrita e de atomicidade
        No MongoDB, um documento é um objeto parecido com JSON (guardado em BSON, um formato binário com tipos a mais, como datas e inteiros de 64 bits) com um campo \`_id\`, que é a chave primária. Documentos ficam em **coleções**, o equivalente às tabelas. Três fatos guiam a modelagem:

        1. **Ler um documento inteiro é barato.** Ele fica guardado junto, e uma consulta pelo \`_id\` traz tudo de uma vez, sem JOIN.
        2. **Escrever em um documento é atômico.** Um \`updateOne\` que muda o status e acrescenta um item ao mesmo pedido acontece por inteiro ou não acontece. Transações com vários documentos existem desde a versão 4.0, mas custam mais, e a própria documentação diz que elas não substituem uma boa modelagem.
        3. **Um documento tem no máximo 16 MiB.** Um array que cresce sem limite dentro dele acaba estourando esse teto e, bem antes disso, deixa cada leitura e cada atualização mais pesada.

        "Sem esquema" é um mito: o código que lê o documento espera certos campos, com certos tipos. A diferença está em **quando** o formato é conferido. No relacional, o esquema é conferido na escrita: o banco recusa a linha fora do formato. No MongoDB, por padrão, vale o {{esquema na leitura|schema-on-read}}: o banco aceita qualquer documento, e quem lê tem de lidar com versões antigas e campos ausentes. Dá para pedir conferência na escrita com um validador \`$jsonSchema\` na coleção, e em produção isso costuma ser uma boa ideia.

        ### Embutir ou referenciar
        Para cada relação entre duas entidades (pedido e itens, restaurante e avaliações, cliente e pedidos), há duas formas. Você pode {{embutir|embed}} os dados de uma no documento da outra, ou {{referenciar|reference}}: guardar só o \`_id\` e buscar à parte, numa segunda consulta ou com \`$lookup\`, o LEFT JOIN do MongoDB.
      `),
      {
        type: 'table',
        head: ['Pergunta', 'Aponta para embutir', 'Aponta para referenciar'],
        rows: [
          ['São lidos juntos?', 'quase sempre: a tela do pedido mostra os itens', 'raramente: a tela do cliente não mostra os 300 pedidos dele'],
          ['Quantos de um lado para cada um do outro?', '1:1 ou 1:poucos (itens de um pedido, endereços de um cliente)', '1:muitos sem teto (avaliações de um restaurante) ou N:N'],
          ['Cresce sem limite?', 'não: um pedido fechado não ganha itens', 'sim: chegam avaliações todo dia, e o teto de 16 MiB chega junto'],
          ['Muda por conta própria e é compartilhado?', 'não: o item pertence a um pedido só', 'sim: o cadastro do restaurante aparece em milhares de pedidos'],
          ['Precisa mudar junto, de forma atômica?', 'sim: escrever num documento só já é atômico', 'dá, com transação de vários documentos, mas custa mais'],
        ],
        caption: 'A regra que resume a tabela, na documentação do MongoDB: dados acessados juntos devem ficar guardados juntos.',
      },
      md(`
        ### Copiar de propósito: retrato ou desnormalização?
        {{Desnormalizar|denormalize}} é guardar a mesma informação em mais de um lugar para economizar leituras. Na lição de normalização (m7-3) você viu o preço: quando o dado muda, todas as cópias precisam mudar, e a que ficou para trás é uma anomalia de atualização. Antes de copiar, separe dois casos:

        - **Retrato de um fato.** O preço de cada item, o endereço de entrega e o nome do restaurante **no momento do pedido**. Se o restaurante aumentar o preço amanhã, o pedido de ontem tem de continuar mostrando o que o cliente pagou, como numa nota fiscal. Aqui copiar não é duplicar: é o único jeito certo. (Num banco relacional, você também guardaria o preço na linha do item, e não só uma referência ao cardápio.)
        - **Cópia por desempenho.** O nome e a foto do restaurante na lista de favoritos de cada cliente. Economiza uma consulta por item da lista, mas, se o restaurante trocar de nome, ou você atualiza milhares de documentos com \`updateMany\`, ou aceita mostrar o nome antigo por um tempo. Copie só campos que mudam pouco, e decida antes qual das duas saídas vai usar.

        A pergunta que separa os dois: se o original mudar, a cópia **deveria** mudar? Se não, é retrato. Se sim, é desnormalização, e alguém tem de manter as cópias em dia.

        ### Consultando documentos
        Uma consulta do MongoDB é um documento de filtro. Campos dentro de subdocumentos são alcançados com **notação de ponto** (\`"entrega.cidade"\`), e um filtro sobre um campo que é array combina se **algum** elemento combinar: \`{"itens.produto": "Açaí 500 ml"}\` acha os pedidos em que pelo menos um item é açaí. Para que essa busca não varra a coleção inteira (o \`COLLSCAN\` que aparece no \`explain()\`, parente do SCAN do EXPLAIN QUERY PLAN do SQLite), crie índices também em campos aninhados. Um índice sobre um campo de array vira um {{índice multichave|multikey index}}, com uma entrada por elemento.

        Consultas que resumem muitos documentos usam o {{pipeline de agregação|aggregation pipeline}}: uma lista de estágios em que a saída de um é a entrada do próximo, como numa linha de montagem.
      `),
      {
        type: 'table',
        head: ['Estágio', 'O que faz', 'Em SQL'],
        rows: [
          ['`$match`', 'filtra documentos', '`WHERE` (ou `HAVING`, se vier depois do `$group`)'],
          ['`$unwind`', 'abre um array: um documento para cada elemento', 'a junção de cada pedido com as linhas de itens dele'],
          ['`$group`', 'agrupa por uma chave (`_id`) e acumula (`$sum`, `$avg`, `$max`, `$push`)', '`GROUP BY` com agregações'],
          ['`$sort` e `$limit`', 'ordena e corta', '`ORDER BY` e `LIMIT`'],
          ['`$project`', 'escolhe e calcula campos', 'a lista do `SELECT`'],
          ['`$lookup`', 'traz documentos de outra coleção', '`LEFT JOIN`'],
        ],
        caption: 'Ponha o $match o mais cedo possível: no começo do pipeline ele pode usar índice e reduz o trabalho de todos os estágios seguintes.',
      },
      deep(`
        Você não precisa de um banco de documentos para guardar documentos. O PostgreSQL tem o tipo \`jsonb\`, com operadores como \`->>\` (extrai um campo como texto) e \`@>\` (contém), e índices GIN que aceleram buscas pelo conteúdo. O SQLite tem funções como \`json_extract\` e \`json_each\`, que você vai usar no código desta lição. É um meio-termo comum: colunas normais para o que é estável e uma coluna JSON para o que varia de registro para registro, como os atributos de cada produto de um catálogo.

        No outro extremo, bancos de colunas largas como o Cassandra levam a ideia desta lição ao limite: não há JOIN nenhum, e o método recomendado é criar **uma tabela por consulta**, com a chave de partição escolhida pela pergunta que a tabela responde.
      `, 'O mesmo raciocínio em outros bancos'),
      md(`
        ### Chave-valor: o Redis e suas estruturas
        No Redis, todos os dados ficam na memória, e o valor de cada chave é uma estrutura de dados com comandos próprios. Como não há busca por valor (você só chega a um dado pela chave), o nome da chave **é** o modelo. A convenção é \`tipo:id:detalhe\`, como \`carrinho:42\` ou \`cupom:42:202610081430\`. Além da string, há hashes, listas, conjuntos e o {{conjunto ordenado|sorted set}}, que mantém cada membro com uma pontuação, em ordem:
      `),
      {
        type: 'table',
        head: ['Estrutura', 'Comandos típicos', 'Serve para', 'Custo'],
        rows: [
          ['string', '`SET`, `GET`, `INCR`, `SET ... EX 60 NX`', 'cache de um JSON, contador, trava com prazo', 'O(1)'],
          ['hash', '`HSET`, `HGET`, `HINCRBY`', 'objeto pequeno: carrinho, perfil', 'O(1) por campo'],
          ['lista', '`LPUSH`, `RPOP`, `BRPOP`, `LTRIM`', 'fila de tarefas, últimas N notificações', 'O(1) nas pontas'],
          ['conjunto', '`SADD`, `SISMEMBER`, `SINTER`', 'quem curtiu, tags, visitantes únicos', 'O(1) para pertinência'],
          ['conjunto ordenado', '`ZADD`, `ZINCRBY`, `ZRANGE ... REV`', 'ranking, itens por horário ou prioridade', 'O(log n) para inserir ou mudar a pontuação'],
        ],
      },
      md(`
        Três propriedades mudam a forma de programar:

        - **Cada comando é atômico.** O Redis executa os comandos um de cada vez (o núcleo que os executa roda numa thread só), então \`INCR visitas\` lê, soma e grava sem que outro cliente se meta no meio. Já "GET, soma no Python, SET" são duas idas ao servidor, e dois clientes intercalados perdem um incremento: é a {{atualização perdida|lost update}}, o mesmo problema que transações concorrentes têm num banco relacional. Para vários comandos de uma vez, há \`MULTI\`/\`EXEC\` e scripts Lua, que rodam inteiros, sem comandos de outros clientes no meio.
        - **Prazo por chave.** \`EXPIRE chave 60\` faz a chave sumir sozinha depois de 60 segundos; \`TTL chave\` mostra quanto falta (−1 se ela não tem prazo, −2 se não existe). Cuidado: um \`SET\` comum na mesma chave **apaga** o prazo; \`INCR\` o mantém.
        - **A memória é o limite.** Sem \`maxmemory\`, o Redis cresce até a máquina ficar sem memória. Com ela, a política padrão (\`noeviction\`) recusa novas escritas quando enche, e políticas como \`allkeys-lru\` descartam as chaves menos usadas: o comportamento certo para um cache e o errado para dados que você não pode perder.
      `),
      warn(`
        O Redis pode gravar em disco (fotografias periódicas, as RDB, e um log de comandos, o AOF), mas na configuração mais comum do AOF (\`appendfsync everysec\`) uma queda perde até cerca de um segundo de escritas, e sem AOF perde tudo desde a última fotografia. Guarde nele o que você aceita perder ou consegue reconstruir: cache, sessão, ranking, contador de tentativas. Saldo de conta, Pix e estoque ficam num banco com transações duráveis.
      `, 'Rápido não é o mesmo que durável'),
      md(`
        ### Dois padrões que aparecem em quase todo sistema
        **{{Cache-aside|cache-aside}}** (também chamado de *lazy loading*): quem cuida do cache é a aplicação, não o banco.

        1. Leitura: procure no Redis. Achou (*hit*), devolva. Não achou (*miss*), leia do banco, grave no Redis com prazo e devolva.
        2. Escrita: grave no banco e, em seguida, **apague** a chave do cache. Essa {{invalidação de cache|cache invalidation}} faz a próxima leitura buscar o valor novo.

        Por que apagar, e não gravar o valor novo no cache? Com dois servidores salvando o mesmo cardápio quase ao mesmo tempo, as gravações no banco podem acontecer na ordem A, B, e as no cache na ordem B, A: o cache ficaria com a versão de A, mais velha, até o prazo vencer. Apagar dá o mesmo resultado em qualquer ordem. Mesmo assim sobra uma janela: um leitor que leu o valor antigo do banco **antes** da escrita pode gravá-lo no cache **depois** da invalidação. O prazo é a rede de proteção que limita quanto tempo esse valor velho sobrevive. E quando uma chave muito popular expira, centenas de requisições erram o cache juntas e vão ao banco ao mesmo tempo (*cache stampede*); a saída comum é deixar só uma delas recarregar, com uma trava \`SET trava:cardapio:7 1 EX 5 NX\`.

        **{{Limitação de taxa|rate limiting}} por {{janela fixa|fixed window}}.** Para permitir no máximo 5 tentativas de cupom por minuto por cliente, use uma chave por cliente **e por minuto**, como \`cupom:42:202610081430\`. A cada tentativa, \`INCR\`; se o resultado passar de 5, recuse. A chave precisa de prazo, senão o Redis acumula uma chave por cliente por minuto para sempre. Dois cuidados:

        - Se você só chamar \`EXPIRE\` quando o \`INCR\` devolver 1 e o processo cair entre os dois comandos, a chave fica sem prazo para sempre: as próximas tentativas devolvem 2, 3, 4... e nunca mais passam pelo \`EXPIRE\`. Saídas: mandar os dois juntos em \`MULTI\`/\`EXEC\`, ou chamar a cada tentativa \`EXPIRE chave 60 NX\` (Redis 7 em diante), que só define o prazo se a chave ainda não tiver um.
        - A janela é fixa no relógio: 5 tentativas às 14h30min59s e mais 5 às 14h31min00s passam, 10 em dois segundos. Quando isso importa, a **janela deslizante** guarda o horário de cada tentativa num conjunto ordenado e conta só as dos últimos 60 segundos.
      `),
      info('Em 2024 o Redis mudou de licença e surgiu o **Valkey**, um fork mantido pela Linux Foundation que aceita os mesmos comandos; em 2025, o Redis 8 voltou a oferecer uma licença de código aberto (AGPLv3). Para esta lição tanto faz: as estruturas e os comandos são os mesmos.', 'Redis ou Valkey?'),
    ],
    exemplo: [
      md(`
        Um app de delivery, do jeito que o time escreveria no quadro antes de criar a primeira coleção. Cada linha é uma pergunta que a aplicação faz, com a frequência estimada e a decisão de modelagem que ela puxa.
      `),
      {
        type: 'table',
        head: ['Padrão de acesso', 'Frequência', 'Decisão'],
        rows: [
          ['acompanhar um pedido: itens, endereço, status', 'altíssima (a tela se atualiza sozinha)', 'documento em `pedidos` com itens e endereço **embutidos**; leitura pelo `_id`'],
          ['histórico do cliente: os 20 pedidos mais recentes', 'alta', '`pedidos` guarda `cliente_id` (**referência**), com índice em `(cliente_id, criado_em)`; embutir os pedidos no cliente criaria um array sem teto'],
          ['cardápio do restaurante', 'alta', 'cardápio **embutido** no restaurante: dezenas ou centenas de itens, sempre lidos juntos'],
          ['avaliações do restaurante', 'média; milhares por restaurante', 'coleção `avaliacoes` com `restaurante_id`; no restaurante, só a média e as 10 mais recentes, **copiadas**'],
          ['restaurantes mais pedidos da semana', 'alta; muda a cada pedido', 'conjunto ordenado no Redis, com `ZINCRBY` a cada pedido'],
          ['no máximo 5 tentativas de cupom por minuto', 'a cada tentativa', 'contador no Redis com `INCR` e prazo'],
          ['sessão do usuário', 'a cada requisição', 'chave com prazo no Redis (a lição anterior)'],
        ],
      },
      md('O documento de um pedido, inserido pelo `mongosh` (o terminal do MongoDB). Cada campo tem um motivo para estar ali:'),
      leitura('javascript', `
        db.pedidos.insertOne({
          _id: "P-1001",
          cliente_id: 42,                                  // referência: o cliente tem documento próprio
          criado_em: ISODate("2026-10-08T19:42:00Z"),
          status: "a caminho",
          restaurante: { id: 7, nome: "Açaí da Praça" },  // retrato: o nome no dia do pedido
          entrega: { cep: "50050-000", cidade: "Recife", numero: "120" },  // retrato do endereço
          itens: [                                         // embutidos: 1:poucos, lidos juntos, não crescem
            { produto: "Açaí 500 ml", qtd: 2, preco: 18.0 },   // retrato do preço pago
            { produto: "Granola extra", qtd: 1, preco: 3.0 }
          ],
          total: 39.0
        })
      `, 'Só para leitura: rode num MongoDB instalado no seu computador.'),
      md('E as consultas dos padrões de acesso:'),
      leitura('javascript', `
        // tela do pedido: uma leitura, pela chave primária
        db.pedidos.findOne({ _id: "P-1001" })

        // histórico: índice composto, só os campos da lista, do mais recente para o mais antigo
        db.pedidos.createIndex({ cliente_id: 1, criado_em: -1 })
        db.pedidos.find({ cliente_id: 42 }, { restaurante: 1, total: 1, criado_em: 1 })
                  .sort({ criado_em: -1 }).limit(20)

        // pedidos com pelo menos um açaí e total a partir de R$ 30
        db.pedidos.find({ "itens.produto": "Açaí 500 ml", total: { $gte: 30 } })

        // os 3 produtos mais vendidos em pedidos entregues
        db.pedidos.aggregate([
          { $match: { status: "entregue" } },
          { $unwind: "$itens" },
          { $group: { _id: "$itens.produto", qtd: { $sum: "$itens.qtd" } } },
          { $sort: { qtd: -1, _id: 1 } },
          { $limit: 3 }
        ])
      `),
      md(`
        Siga o pipeline com três pedidos pequenos: P1 (entregue; 2 açaís e 1 granola), P2 (entregue; 3 pastéis e 2 caldos de cana) e P3 (cancelado; 1 açaí).
      `),
      {
        type: 'table',
        head: ['Estágio', 'Documentos que saem dele'],
        rows: [
          ['início', 'P1, P2 e P3, cada um com seu array de itens'],
          ['`$match: { status: "entregue" }`', 'P1 e P2; o P3 cancelado fica de fora'],
          ['`$unwind: "$itens"`', '4 documentos, cada um com um item só: (P1, Açaí 500 ml, 2), (P1, Granola extra, 1), (P2, Pastel de queijo, 3), (P2, Caldo de cana 500 ml, 2)'],
          ['`$group` por produto, somando `qtd`', '{ _id: "Açaí 500 ml", qtd: 2 }, { _id: "Granola extra", qtd: 1 }, { _id: "Pastel de queijo", qtd: 3 }, { _id: "Caldo de cana 500 ml", qtd: 2 }'],
          ['`$sort: { qtd: -1, _id: 1 }`', 'Pastel de queijo 3; Açaí 500 ml 2; Caldo de cana 500 ml 2; Granola extra 1'],
          ['`$limit: 3`', 'Pastel de queijo 3; Açaí 500 ml 2; Caldo de cana 500 ml 2'],
        ],
        caption: 'Açaí e caldo de cana empataram com 2; o _id: 1 no $sort desempata pelo nome. Sem um campo único na ordenação, o MongoDB não garante a ordem dos empates.',
      },
      md('No Redis, o ranking da semana e o limite de cupom, numa sessão do `redis-cli`:'),
      leitura('text', `
        127.0.0.1:6379> ZINCRBY mais_pedidos:2026-W41 1 rest:7
        "1"
        127.0.0.1:6379> ZINCRBY mais_pedidos:2026-W41 1 rest:3
        "1"
        127.0.0.1:6379> ZINCRBY mais_pedidos:2026-W41 1 rest:7
        "2"
        127.0.0.1:6379> ZRANGE mais_pedidos:2026-W41 0 1 REV WITHSCORES
        1) "rest:7"
        2) "2"
        3) "rest:3"
        4) "1"
        127.0.0.1:6379> INCR cupom:42:202610081430
        (integer) 1
        127.0.0.1:6379> EXPIRE cupom:42:202610081430 60 NX
        (integer) 1
        127.0.0.1:6379> TTL cupom:42:202610081430
        (integer) 60
        127.0.0.1:6379> INCR cupom:42:202610081430
        (integer) 2
        127.0.0.1:6379> EXPIRE cupom:42:202610081430 60 NX
        (integer) 0
      `, 'Só para leitura: rode num Redis instalado no seu computador.'),
      md(`
        O \`ZINCRBY\` cria o conjunto e o membro se eles ainda não existem, e devolve a pontuação nova. O nome da chave carrega a semana (\`2026-W41\`): na segunda-feira seguinte, o ranking começa do zero sozinho, e a chave velha pode ganhar um \`EXPIRE\` para sumir. No cupom, o segundo \`EXPIRE ... NX\` devolve 0 porque a chave já tem prazo: chamar a cada tentativa não renova o minuto, só conserta a chave que tiver ficado sem prazo. (\`ZRANGE ... REV\` existe desde o Redis 6.2; em versões antigas, o mesmo é \`ZREVRANGE\`.)
      `),
    ],
    codigo: [
      md('Para sentir a consulta a documentos sem instalar nada, guarde os pedidos como JSON numa tabela do SQLite e use as funções JSON dele: `json_extract(doc, \'$.caminho\')` lê um campo (o caminho faz o papel da notação de ponto) e `json_each(doc, \'$.array\')`, usada no FROM, devolve uma linha por elemento do array, com o elemento na coluna `value`.'),
      py(`
        import json
        import sqlite3

        pedidos = [
            {"_id": "P1", "cliente": {"id": 42, "nome": "Ana"}, "status": "entregue",
             "entrega": {"cep": "50050-000", "cidade": "Recife"},
             "itens": [{"produto": "Açaí 500 ml", "qtd": 2, "preco": 18.0},
                       {"produto": "Granola extra", "qtd": 1, "preco": 3.0}]},
            {"_id": "P2", "cliente": {"id": 7, "nome": "Bruno"}, "status": "entregue",
             "entrega": {"cep": "01310-100", "cidade": "São Paulo"},
             "itens": [{"produto": "Pastel de queijo", "qtd": 3, "preco": 9.0}]},
        ]

        con = sqlite3.connect(":memory:")
        con.execute("CREATE TABLE pedidos (id TEXT PRIMARY KEY, doc TEXT NOT NULL)")
        con.executemany("INSERT INTO pedidos VALUES (?, ?)",
                        [(p["_id"], json.dumps(p, ensure_ascii=False)) for p in pedidos])

        # campos aninhados: o caminho $.cliente.nome é a notação de ponto
        sql = "SELECT id, json_extract(doc, '$.cliente.nome'), json_extract(doc, '$.entrega.cidade') FROM pedidos"
        for linha in con.execute(sql):
            print(linha)

        # json_each abre o array: uma linha por item, ligada ao seu pedido (o $unwind)
        sql = """
            SELECT p.id, json_extract(i.value, '$.produto'),
                   json_extract(i.value, '$.qtd') * json_extract(i.value, '$.preco') AS subtotal
            FROM pedidos p, json_each(p.doc, '$.itens') AS i
        """
        for linha in con.execute(sql):
            print(linha)
      `, { caption: 'No PostgreSQL, com uma coluna jsonb, o mesmo fica com doc -> \'cliente\' ->> \'nome\' e jsonb_array_elements(doc -> \'itens\').' }),
      md('Agora o Redis, imitado num dict com o tempo passado como parâmetro (como no cache da lição anterior): cache-aside com invalidação e um ranking com conjunto ordenado.'),
      py(`
        class MiniRedis:
            """Um pedaço do Redis num dict: strings com prazo e conjuntos ordenados."""

            def __init__(self):
                self.dados = {}
                self.prazo = {}

            def get(self, chave, agora):
                if chave in self.prazo and agora >= self.prazo[chave]:
                    del self.dados[chave], self.prazo[chave]
                return self.dados.get(chave)

            def set(self, chave, valor, agora, ex=None):
                self.dados[chave] = valor
                self.prazo.pop(chave, None)            # SET apaga o prazo antigo
                if ex is not None:
                    self.prazo[chave] = agora + ex

            def delete(self, chave):
                self.dados.pop(chave, None)
                self.prazo.pop(chave, None)

            def zincrby(self, chave, n, membro):
                z = self.dados.setdefault(chave, {})
                z[membro] = z.get(membro, 0) + n
                return z[membro]

            def zrange_rev(self, chave, inicio, fim):
                z = self.dados.get(chave, {})
                ordem = sorted(z.items(), key=lambda par: (par[1], par[0]), reverse=True)
                return ordem[inicio:fim + 1]

        banco = {"rest:7": "cardápio v1"}
        idas_ao_banco = 0

        def ler_cardapio(r, rest, agora):
            global idas_ao_banco
            chave = f"cardapio:{rest}"
            valor = r.get(chave, agora)
            if valor is not None:
                return valor, "hit"
            idas_ao_banco += 1                         # miss: vai ao banco
            valor = banco[rest]
            r.set(chave, valor, agora, ex=300)         # e guarda por 5 minutos
            return valor, "miss"

        def salvar_cardapio(r, rest, novo):
            banco[rest] = novo                         # primeiro o banco...
            r.delete(f"cardapio:{rest}")               # ...depois apaga a cópia

        r = MiniRedis()
        print(0, ler_cardapio(r, "rest:7", 0))
        print(10, ler_cardapio(r, "rest:7", 10))
        salvar_cardapio(r, "rest:7", "cardápio v2")
        print(20, ler_cardapio(r, "rest:7", 20))
        print(30, ler_cardapio(r, "rest:7", 30))
        print(400, ler_cardapio(r, "rest:7", 400))     # o prazo de 300 s venceu
        print("idas ao banco:", idas_ao_banco)

        for rest in ["rest:7", "rest:3", "rest:7", "rest:9", "rest:3", "rest:7"]:
            r.zincrby("mais_pedidos:2026-W41", 1, rest)
        print("top 2:", r.zrange_rev("mais_pedidos:2026-W41", 0, 1))
      `, { caption: 'Troque o delete de salvar_cardapio por nada e veja a leitura do instante 20 devolver o cardápio v1, velho, até o prazo vencer.' }),
      tip('A ordem dos empates do `zrange_rev` imita a do Redis: no `ZRANGE ... REV`, membros com a mesma pontuação saem em ordem lexicográfica **invertida**. Num ranking de verdade, quem empata costuma ser desempatado por outro critério, como quem chegou primeiro; como a pontuação é um número de ponto flutuante (double), uma técnica comum é codificar os dois critérios num número só, com cuidado para não passar da precisão dele.', 'Empates no ranking'),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e7-docs-1',
          kind: 'mcq',
          prompt: 'No app de delivery, um restaurante popular recebe centenas de avaliações por dia, e a página dele mostra a nota média e as 10 avaliações mais recentes ("ver todas" abre outra tela). Como modelar as avaliações no MongoDB?',
          difficulty: 'facil',
          skills: ['bd-nosql'],
          hints: [
            'Quantas avaliações esse restaurante terá daqui a dois anos? Existe um teto?',
            'O que a página do restaurante mostra sempre, e o que só aparece quando alguém clica em "ver todas"?',
            'Releia a tabela de embutir × referenciar: qual linha decide este caso?',
          ],
          explanation: 'É o padrão de subconjunto (*subset pattern*): a relação 1:muitos sem teto fica numa coleção própria, referenciada pelo `restaurante_id`, e uma parte pequena e limitada é copiada para o documento que a tela lê sempre. Manter só as 10 mais recentes cabe num único update atômico: `$push` com `$each: [nova]` e `$slice: -10` acrescenta a nova e corta o array nas 10 últimas. A média vira dois contadores (soma das notas e quantidade), atualizados com `$inc` no mesmo update.',
          options: [
            { text: 'Um array `avaliacoes` dentro do documento do restaurante, com todas as avaliações', feedback: 'É o array sem teto: cresce todo dia, caminha para os 16 MiB por documento e, bem antes disso, faz cada leitura da página carregar milhares de avaliações que ela não mostra.' },
            { text: 'Uma coleção `avaliacoes` com `restaurante_id` e índice em `(restaurante_id, criado_em)`; no restaurante, só a média, a contagem e as 10 mais recentes copiadas', correct: true, feedback: 'Isso: o que cresce sem limite fica à parte, e o que a página mostra sempre fica copiado no restaurante, para ela sair com uma leitura só.' },
            { text: 'Uma tabela relacional, porque documentos não sabem representar relações 1:muitos', feedback: 'Documentos representam 1:muitos muito bem, por referência. O problema aqui não é o modelo de dados, e sim escolher entre embutir e referenciar. Um PostgreSQL também resolveria, mas não é obrigatório.' },
            { text: 'Dentro de cada pedido, já que cada avaliação vem de um pedido', feedback: 'A avaliação nasce de um pedido, mas é lida a partir do restaurante. Embutida nos pedidos, montar a página exigiria varrer todos os pedidos do restaurante. Modele pela leitura, não pela origem do dado.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e7-docs-2',
          kind: 'parsons',
          lang: 'javascript',
          prompt: 'Monte o pipeline que lista os **3 produtos mais vendidos em pedidos entregues**, com a quantidade total, do mais vendido para o menos vendido, desempatando pelo nome. O filtro deve vir o mais cedo possível, para poder usar índice.',
          difficulty: 'intermediario',
          skills: ['bd-nosql'],
          hints: [
            'Depois do $group, ainda existe o campo status em algum documento?',
            'O $group soma quantidades de itens. Ele consegue somar itens de pedidos diferentes enquanto cada pedido ainda guarda os seus num array?',
            'Cortar em 3 antes de ordenar dá os 3 mais vendidos?',
          ],
          explanation: 'O $match vem primeiro: depois do $group só restam `_id` e `qtd`, e o status sumiu; no começo, o filtro pode usar um índice em status e diminui o trabalho do resto. O $unwind vem antes do $group, para que cada item vire um documento e o $sum some quantidades de pedidos diferentes. O $sort vem antes do $limit: cortar primeiro pegaria 3 produtos quaisquer. O `_id: 1` no $sort desempata pelo nome, já que sem um campo único na ordenação o MongoDB não garante a ordem dos empates.',
          lines: [
            'db.pedidos.aggregate([',
            '  { $match: { status: "entregue" } },',
            '  { $unwind: "$itens" },',
            '  { $group: { _id: "$itens.produto", qtd: { $sum: "$itens.qtd" } } },',
            '  { $sort: { qtd: -1, _id: 1 } },',
            '  { $limit: 3 }',
            '])',
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e7-docs-3',
          kind: 'sql',
          prompt: 'Os pedidos estão guardados como documentos JSON na coluna `doc` da tabela `pedidos`. Mostre, considerando só os pedidos **entregues**, a quantidade total vendida de cada produto (colunas `produto` e `qtd`), da maior quantidade para a menor; em empate, em ordem alfabética de produto. Use `json_extract` e `json_each`, como no código da lição.',
          difficulty: 'intermediario',
          skills: ['bd-nosql', 'bd-sql'],
          hints: [
            'Rode a consulta inicial. Quais pedidos entram na conta, e algum deles tem um array de itens vazio?',
            'Para somar por produto, você precisa de uma linha por item. Que função transforma o array itens em linhas, e como ela entra no FROM ao lado de pedidos?',
            'Cada linha de json_each traz o item na coluna value. De onde sai o status, de value ou do documento do pedido?',
          ],
          explanation: "SELECT json_extract(i.value, '$.produto') AS produto, SUM(json_extract(i.value, '$.qtd')) AS qtd FROM pedidos p, json_each(p.doc, '$.itens') AS i WHERE json_extract(p.doc, '$.status') = 'entregue' GROUP BY produto ORDER BY qtd DESC, produto; O json_each faz o papel do $unwind: cada item vira uma linha ligada ao seu pedido (no `FROM pedidos p, json_each(p.doc, ...)`, a função recebe o documento da linha à esquerda). O status é do pedido, então sai de `p.doc`; a quantidade e o produto são do item, então saem de `i.value`. O pedido de Eva, com o array vazio, não gera linha nenhuma. Sem o filtro de status, o açaí cancelado de P3 e o caldo de cana a caminho de P5 entrariam na soma.",
          setup: PEDIDOS_JSON,
          starter: "SELECT id, json_extract(doc, '$.status') AS status FROM pedidos;",
          solution: "SELECT json_extract(i.value, '$.produto') AS produto, SUM(json_extract(i.value, '$.qtd')) AS qtd FROM pedidos p, json_each(p.doc, '$.itens') AS i WHERE json_extract(p.doc, '$.status') = 'entregue' GROUP BY produto ORDER BY qtd DESC, produto;",
          ordered: true,
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e7-docs-4',
          kind: 'predict',
          lang: 'python',
          prompt: 'Dois servidores do app registram uma curtida cada, ao mesmo tempo. O programa imita a ordem em que os comandos chegam ao Redis. O que ele imprime?',
          difficulty: 'intermediario',
          skills: ['bd-nosql'],
          hints: [
            'Que valor a e b recebem, se os dois GET acontecem antes de qualquer SET?',
            'O segundo SET grava b + 1. Ele sabe que o primeiro SET já tinha mudado o valor?',
            'Na segunda parte, cada incr lê e grava de uma vez. De que valor parte o primeiro incr?',
          ],
          explanation: 'Os dois GET leem 10, e os dois SET gravam 11: uma curtida sumiu, sem erro nenhum. É a atualização perdida. Com INCR, ler, somar e gravar são um comando só, executado inteiro antes do próximo, então 11 vira 12 e 12 vira 13. O problema não é o Python nem o Redis: é dividir uma leitura-e-escrita em duas idas ao servidor, com espaço para outro cliente no meio.',
          code: dedent(`
            contador = {"curtidas": 10}

            def get(chave):
                return contador[chave]

            def set_(chave, valor):
                contador[chave] = valor

            def incr(chave):
                contador[chave] += 1     # no Redis, um comando só: ninguém executa nada no meio
                return contador[chave]

            # dois servidores, cada um com GET e depois SET, intercalados
            a = get("curtidas")
            b = get("curtidas")
            set_("curtidas", a + 1)
            set_("curtidas", b + 1)
            print(contador["curtidas"])

            # os mesmos dois servidores, agora com INCR
            print(incr("curtidas"), incr("curtidas"))
            print(contador["curtidas"])
          `),
          answer: '11\n12 13\n13',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e7-docs-5',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            O app permite no máximo \`limite\` tentativas de cupom por cliente em cada janela de \`janela\` segundos. Escreva \`permitir(r, cliente, agora, limite=5, janela=60)\`, que devolve \`True\` se a tentativa pode seguir e \`False\` se passou do limite, usando o \`MiniRedis\` do código inicial (cada comando recebe o instante \`agora\`, em segundos).

            - A chave da janela é \`f"cupom:{cliente}:{agora // janela}"\`.
            - Use só comandos atômicos: \`incr\` para contar (uma vez por tentativa) e \`expire\` para dar prazo à chave. Nada de \`get\` seguido de \`set\`.
            - A chave nunca pode ficar sem prazo, nem quando uma execução anterior caiu entre o \`incr\` e o \`expire\`: um dos testes cria uma chave assim antes de chamar a sua função.
          `),
          difficulty: 'intermediario',
          skills: ['bd-nosql'],
          hints: [
            'O que o incr devolve, e como esse número diz se a tentativa passa?',
            'A 5ª tentativa da janela ainda passa? Confira a comparação com o limite nesse caso.',
            'Se você só dá prazo quando o incr devolve 1, o que acontece com uma chave que já existia sem prazo?',
            'Releia a assinatura do expire do MiniRedis: há um parâmetro que só define o prazo se a chave ainda não tiver um.',
          ],
          explanation: 'Basta `n = r.incr(chave, agora)`, depois `r.expire(chave, janela, agora, nx=True)` e `return n <= limite`. O incr é atômico, então dois servidores atendendo o mesmo cliente nunca contam a mesma tentativa duas vezes. Chamar o expire com nx a cada tentativa custa um comando a mais, mas conserta uma chave que tenha ficado sem prazo; com "expire só quando n == 1", essa chave contaria para sempre e o cliente ficaria bloqueado sem volta. No Redis de verdade, os dois comandos também podem ir juntos num MULTI/EXEC, que os executa em sequência, sem comandos de outros clientes no meio. O teste da virada mostra o ponto fraco da janela fixa: 10 tentativas passam em 10 segundos, 5 no fim de uma janela e 5 no começo da seguinte.',
          starter: MINI_REDIS + '\n\n' + dedent(`
            def permitir(r, cliente, agora, limite=5, janela=60):
                # chave da janela: f"cupom:{cliente}:{agora // janela}"
                # conte a tentativa com r.incr, garanta o prazo com r.expire
                # devolva True se ainda está dentro do limite, False se passou
                pass
          `),
          solution: MINI_REDIS + '\n\n' + dedent(`
            def permitir(r, cliente, agora, limite=5, janela=60):
                chave = f"cupom:{cliente}:{agora // janela}"
                n = r.incr(chave, agora)
                r.expire(chave, janela, agora, nx=True)
                return n <= limite
          `),
          tests: [
            {
              name: 'até o limite, e depois não',
              code: dedent(`
                r = MiniRedis()
                res = [permitir(r, 42, 100 + i) for i in range(7)]
                assert res == [True] * 5 + [False] * 2, f"7 tentativas na mesma janela deram {res}; esperado 5 vezes True e depois 2 vezes False. A 5ª tentativa ainda passa"
              `),
            },
            {
              name: 'a janela seguinte libera de novo',
              code: dedent(`
                r = MiniRedis()
                for i in range(6):
                    permitir(r, 42, 100 + i)
                assert permitir(r, 42, 120) is True, "em agora = 120 começa outra janela (120 // 60 = 2): a chave é outra, e a contagem recomeça"
              `),
            },
            {
              name: 'a virada da janela (o ponto fraco)',
              code: dedent(`
                r = MiniRedis()
                fim = [permitir(r, 1, t) for t in range(55, 60)]
                extra = permitir(r, 1, 59)
                comeco = [permitir(r, 1, t) for t in range(60, 65)]
                assert fim == [True] * 5 and extra is False, f"nos instantes 55 a 59 (janela 0), as 5 primeiras passam e a 6ª não; vieram {fim} e {extra}"
                assert comeco == [True] * 5, f"no instante 60 começa a janela 1, e mais 5 passam: é a fraqueza da janela fixa. Vieram {comeco}"
              `),
            },
            {
              name: 'cada cliente tem a sua contagem',
              code: dedent(`
                r = MiniRedis()
                for t in range(5):
                    permitir(r, 1, t)
                assert permitir(r, 2, 5) is True, "o cliente 2 ainda não tentou nada nesta janela: a chave inclui o cliente"
                assert permitir(r, 1, 5) is False, "o cliente 1 já usou as 5 tentativas da janela"
              `),
            },
            {
              name: 'a chave ganha prazo',
              code: dedent(`
                r = MiniRedis()
                permitir(r, 7, 30)
                t = r.ttl("cupom:7:0", 30)
                assert t != -2, "a chave cupom:7:0 não existe: confira o formato da chave (cliente e agora // janela)"
                assert t != -1, "a chave cupom:7:0 ficou sem prazo: o Redis acumularia uma chave por cliente por minuto para sempre"
                assert 0 < t <= 60, f"o prazo da chave deveria ser de até 60 segundos; veio {t}"
              `),
            },
            {
              name: 'chave que ficou sem prazo',
              code: dedent(`
                r = MiniRedis()
                r.incr("cupom:9:1", 61)
                r.incr("cupom:9:1", 62)      # uma execução anterior caiu antes do expire
                assert permitir(r, 9, 63) is True, "esta é a 3ª tentativa da janela, dentro do limite de 5"
                t = r.ttl("cupom:9:1", 63)
                assert t != -1, "a chave cupom:9:1 já existia sem prazo e continuou sem prazo depois da sua tentativa. Dar prazo só quando o incr devolve 1 não conserta esse caso"
                assert 0 < t <= 60, f"o prazo deveria ser de até 60 segundos; veio {t}"
              `),
            },
            {
              name: 'limite e janela diferentes',
              code: dedent(`
                r = MiniRedis()
                res = [permitir(r, 5, t, limite=2, janela=10) for t in (0, 3, 9)]
                assert res == [True, True, False], f"com limite=2 e janela=10, as tentativas em 0, 3 e 9 deram {res}; esperado [True, True, False]. Use os parâmetros, não 5 e 60 fixos"
                assert permitir(r, 5, 10, limite=2, janela=10) is True, "em agora = 10 começa a janela 1 (10 // 10)"
                t = r.ttl("cupom:5:1", 10)
                assert 0 < t <= 10, f"com janela=10, o prazo da chave deveria ser de até 10 segundos; veio {t}"
              `),
            },
            {
              name: 'só comandos atômicos',
              code: dedent(`
                r = MiniRedis()
                for t in range(8):
                    permitir(r, 3, t)
                assert r.chamadas["get"] == 0 and r.chamadas["set"] == 0, f"permitir usou get {r.chamadas['get']} vez(es) e set {r.chamadas['set']} vez(es): com dois servidores, ler e depois gravar perde tentativas. Use incr"
                assert r.chamadas["incr"] == 8, f"cada tentativa deve fazer exatamente um incr, inclusive as recusadas; foram {r.chamadas['incr']} em 8 tentativas"
              `),
            },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e7-docs-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Implemente \`combina(doc, filtro)\`, que devolve \`True\` se um documento (um dict) satisfaz um filtro no estilo do \`find\` do MongoDB, e \`False\` se não. As regras são um subconjunto fiel do MongoDB:

            1. Cada par \`campo: condição\` do filtro precisa valer (E implícito). O filtro vazio combina com tudo.
            2. O campo pode usar notação de ponto (\`"cliente.cidade"\`). Se no caminho aparecer uma lista, o resto do caminho é procurado em **cada** elemento dela: \`"itens.produto"\` olha o produto de todos os itens.
            3. Os valores encontrados no fim do caminho são os **candidatos**; um valor que é lista entra com cada um dos seus elementos. Campo ausente, ou um caminho que continua dentro de algo que não é dict, não gera candidato nenhum.
            4. Condição simples (número ou texto): combina se algum candidato for igual a ela.
            5. Condição com operadores, um dict como \`{"$gte": 30, "$lt": 100}\`: aceite \`$eq\`, \`$gt\`, \`$gte\`, \`$lt\`, \`$lte\` e \`$in\` (lista de valores aceitos). **Cada operador** precisa ser satisfeito por algum candidato, não necessariamente o mesmo (é assim no MongoDB; para exigir o mesmo elemento, existe o \`$elemMatch\`). Comparar número com texto nunca combina, e não pode levantar erro.
            6. A chave especial \`"$or"\` recebe uma lista de filtros e combina se algum deles combinar.

            Os testes não usam \`None\`, booleanos, listas como condição simples nem dicts que não sejam de operadores, e não esperam que \`combina\` altere o documento.
          `),
          difficulty: 'desafio',
          skills: ['bd-nosql'],
          hints: [
            'Separe o problema em dois: achar os candidatos de um campo e conferir uma condição contra a lista de candidatos. Qual das duas partes depende da notação de ponto?',
            'Para os candidatos, pense de forma recursiva: dado o valor atual e o resto do caminho, o que fazer quando o valor atual é um dict? E quando é uma lista?',
            'Quando o caminho acaba, o que você devolve se o valor final for uma lista? E se for um número?',
            'Onde o Python levanta TypeError numa comparação entre número e texto, e o que a sua função faz quando isso acontece?',
            'O $or é um filtro de filtros. Que função você já tem que confere um filtro inteiro?',
          ],
          explanation: 'A solução tem duas partes. Uma função recursiva junta os candidatos: num dict, desce pela próxima parte do caminho; numa lista, aplica o resto do caminho a cada elemento e junta tudo; no fim, uma lista se abre nos seus elementos. Depois, cada condição vira "existe um candidato que satisfaz", e é esse "existe" que dá ao MongoDB o comportamento com arrays: `{"tags": "pix"}` combina com `["pix", "promo"]`. Como cada operador procura o seu próprio candidato, `{"$gt": 1, "$lt": 2}` combina com as quantidades `[2, 1]` sem que nenhuma esteja entre 1 e 2; para exigir o mesmo elemento, o MongoDB tem `$elemMatch`. O total "27,00" guardado como texto é o esquema na leitura na prática: um documento importado de um sistema antigo que nenhuma consulta numérica encontra. No MongoDB real, os operadores de comparação só comparam valores do mesmo tipo (número com número, texto com texto), e o resto simplesmente não combina, como aqui.',
          starter: dedent(`
            def combina(doc, filtro):
                # devolva True se doc satisfaz o filtro, False se não
                # dica de organização: uma função para achar os candidatos de um campo
                # (notação de ponto e listas) e outra para conferir uma condição
                pass
          `),
          solution: dedent(`
            import operator

            _OPS = {"$eq": operator.eq, "$gt": operator.gt, "$gte": operator.ge,
                    "$lt": operator.lt, "$lte": operator.le}

            def _candidatos(atual, partes):
                if not partes:
                    return list(atual) if isinstance(atual, list) else [atual]
                if isinstance(atual, list):
                    saida = []
                    for elem in atual:
                        saida += _candidatos(elem, partes)
                    return saida
                if isinstance(atual, dict) and partes[0] in atual:
                    return _candidatos(atual[partes[0]], partes[1:])
                return []

            def _compara(op, a, b):
                try:
                    return bool(op(a, b))
                except TypeError:
                    return False

            def combina(doc, filtro):
                for campo, cond in filtro.items():
                    if campo == "$or":
                        if not any(combina(doc, f) for f in cond):
                            return False
                        continue
                    cands = _candidatos(doc, campo.split("."))
                    if isinstance(cond, dict):
                        for op, alvo in cond.items():
                            if op == "$in":
                                ok = any(c == v for c in cands for v in alvo)
                            else:
                                ok = any(_compara(_OPS[op], c, alvo) for c in cands)
                            if not ok:
                                return False
                    elif not any(c == cond for c in cands):
                        return False
                return True
          `),
          tests: [
            {
              name: 'igualdade e E implícito',
              code: PEDIDOS_FILTRO + '\n' + dedent(`
                _confere([
                    ({"status": "entregue"}, ["P1", "P2", "P5"], "igualdade simples num campo de primeiro nível"),
                    ({"status": "entregue", "cliente.nome": "Ana"}, ["P1"], "com dois campos, os dois precisam valer"),
                    ({}, ["P1", "P2", "P3", "P4", "P5"], "o filtro vazio combina com todos os documentos"),
                    ({"status": "perdido"}, [], "nenhum pedido tem esse status"),
                ])
              `),
            },
            {
              name: 'notação de ponto',
              code: PEDIDOS_FILTRO + '\n' + dedent(`
                _confere([
                    ({"cliente.cidade": "Recife"}, ["P1", "P3"], "desça pelo subdocumento cliente até cidade"),
                    ({"cliente.uf": "PE"}, [], "campo ausente não gera candidato"),
                    ({"cliente.cidade.rua": "Aurora"}, [], "cidade é um texto: o caminho não continua dentro dele, e isso não pode levantar erro"),
                    ({"cliente": "Ana"}, [], "cliente é um dict, que não é igual ao texto Ana"),
                ])
              `),
            },
            {
              name: 'arrays',
              code: PEDIDOS_FILTRO + '\n' + dedent(`
                _confere([
                    ({"tags": "pix"}, ["P1", "P4"], "um campo que é lista combina se algum elemento combinar"),
                    ({"itens.produto": "Açaí 500 ml"}, ["P1", "P3", "P4"], "itens é uma lista de dicts: procure produto em cada item"),
                    ({"itens.qtd": 3}, ["P2"], "só o P2 tem um item com quantidade 3"),
                ])
                d = {"_id": 1, "itens": [{"produto": "Pastel", "adicionais": ["queijo", "catupiry"]}, {"produto": "Caldo", "adicionais": []}]}
                assert combina(d, {"itens.adicionais": "catupiry"}), "lista de dicts com uma lista dentro: os candidatos de itens.adicionais são queijo e catupiry"
                assert not combina(d, {"itens.adicionais": "bacon"}), "nenhum item tem o adicional bacon"
                assert not combina(d, {"itens.produto.nome": "Pastel"}), "produto é um texto: o caminho não continua dentro dele"
              `),
            },
            {
              name: 'operadores',
              code: PEDIDOS_FILTRO + '\n' + dedent(`
                _confere([
                    ({"total": {"$gte": 39, "$lt": 72}}, ["P1", "P2"], "39 entra (gte), 72 não (lt); o total em texto do P4 não combina e não pode levantar erro"),
                    ({"total": {"$lte": 8}}, ["P5"], "lte inclui o próprio valor"),
                    ({"total": {"$eq": 43}}, ["P2"], "43 e 43.0 são iguais"),
                    ({"itens.qtd": {"$gt": 3}}, ["P3"], "operadores também valem para candidatos vindos de listas"),
                    ({"status": {"$in": ["cancelado", "a caminho"]}}, ["P3", "P4"], "$in combina se algum candidato estiver na lista"),
                    ({"tags": {"$in": ["cartao", "promo"]}}, ["P1", "P2"], "$in com um campo que é lista: basta um elemento estar na lista do filtro"),
                ])
              `),
            },
            {
              name: 'cada operador procura o seu candidato',
              code: PEDIDOS_FILTRO + '\n' + dedent(`
                _confere([
                    ({"itens.qtd": {"$gt": 1, "$lt": 2}}, ["P1"], "no P1 as quantidades são [2, 1]: 2 satisfaz o $gt e 1 satisfaz o $lt. Cada operador procura algum candidato, não necessariamente o mesmo (é para exigir o mesmo que existe o $elemMatch)"),
                    ({"itens.qtd": {"$gte": 2, "$lte": 2}}, ["P1", "P2"], "P1 e P2 têm um item com quantidade 2"),
                ])
              `),
            },
            {
              name: 'texto × número e campo ausente',
              code: PEDIDOS_FILTRO + '\n' + dedent(`
                _confere([
                    ({"total": {"$gt": 20}}, ["P1", "P2", "P3"], "o P4 tem o total em texto ('27,00'): número com texto não combina, e a comparação não pode levantar TypeError"),
                    ({"total": {"$gt": "20"}}, ["P4"], "texto com texto compara: '27,00' > '20'. Os totais numéricos não combinam"),
                    ({"cliente.nome": {"$gt": ""}}, ["P1", "P2", "P3", "P4"], "o P5 não tem cliente: sem candidato, nenhum operador combina"),
                ])
              `),
            },
            {
              name: '$or',
              code: PEDIDOS_FILTRO + '\n' + dedent(`
                _confere([
                    ({"$or": [{"status": "cancelado"}, {"tags": "cartao"}]}, ["P2", "P3"], "$or combina se algum dos filtros da lista combinar"),
                    ({"$or": [{"cliente.cidade": "Olinda"}, {"total": {"$lt": 10}}], "status": {"$in": ["entregue", "a caminho"]}}, ["P4", "P5"], "o $or é mais uma condição do E implícito, ao lado de status"),
                    ({"$or": [{"status": "perdido"}]}, [], "nenhum filtro da lista combina"),
                ])
              `),
            },
            {
              name: 'não altera os documentos',
              code: PEDIDOS_FILTRO + '\n' + dedent(`
                import copy
                antes = copy.deepcopy(_PEDIDOS)
                for f in [{"itens.produto": "Açaí 500 ml"}, {"tags": {"$in": ["pix"]}}, {"$or": [{"total": {"$gt": 1}}]}, {"cliente.cidade.rua": "x"}]:
                    _ids(f)
                assert _PEDIDOS == antes, "combina alterou os documentos: ela só deve ler"
              `),
            },
          ],
        },
      },
    ],
    projeto: [
      md(`
        **Mini-projeto: o seu app em dois bancos.** Escolha um app que você usa (delivery, ônibus, banco digital) e escreva a lista de padrões de acesso dele, com a frequência estimada de cada um. Para cada padrão, decida: documento embutido, coleção referenciada, estrutura do Redis ou tabela relacional, e justifique em uma linha com a tabela de embutir × referenciar. Marque cada cópia como retrato ou desnormalização e, para as desnormalizações, diga quem as mantém em dia. Depois implemente em Python, com dicts como nesta lição, as três operações mais frequentes. No projeto da API (abaixo), a parte de autenticação pede limite de tentativas no login: é a janela fixa desta lição, com o e-mail ou o IP no lugar do cliente.
      `),
      { type: 'project', projectId: 'p5-api' },
    ],
    revisao: [
      md(`
        - Em documentos e chave-valor, a forma dos dados segue os padrões de acesso: cada pergunta frequente deve sair com uma leitura.
        - Embuta o que é lido junto, 1:poucos e não cresce; referencie o que cresce sem teto, é compartilhado ou muda sozinho. Documento: no máximo 16 MiB, escrita atômica.
        - Retrato (preço pago, endereço da entrega) não deve mudar; desnormalização deve acompanhar o original e precisa de alguém que a mantenha.
        - Notação de ponto alcança subdocumentos; filtro sobre array combina se algum elemento combinar. Pipeline: $match cedo, $unwind antes do $group, $sort antes do $limit.
        - Redis: string, hash, lista, conjunto e conjunto ordenado; cada comando é atômico, e INCR não perde atualizações como GET seguido de SET.
        - Cache-aside: escreva no banco e apague a chave; o prazo cobre a janela que sobra.
        - Janela fixa: INCR e um prazo que nunca falta (EXPIRE ... NX); na virada passam até o dobro do limite.
      `),
      english(`
        - **access pattern**: padrão de acesso
        - **embed / reference**: embutir / referenciar
        - **denormalization**: desnormalização
        - **aggregation pipeline / stage**: pipeline de agregação / estágio
        - **sorted set / leaderboard**: conjunto ordenado / ranking
        - **cache hit / cache miss / cache invalidation**: acerto / falta / invalidação do cache
        - **rate limiting / fixed window / sliding window**: limitação de taxa / janela fixa / janela deslizante

        Frase típica de entrevista: *"I'd start from the access patterns. Order items are always read with the order and never change after checkout, so I'd embed them. Reviews grow without bound, so they get their own collection, indexed by restaurant_id, and I'd keep the ten most recent ones copied into the restaurant document."*

        Frase típica de documentação (Redis, comando INCR): *"Increments the number stored at key by one. If the key does not exist, it is set to 0 before performing the operation."*
      `),
    ],
  },
  review: [
    ['Por que a modelagem em bancos de documentos começa pelos padrões de acesso, e não pela normalização?', 'Porque juntar coleções é caro ou impossível: cada pergunta frequente deve ser respondida com uma leitura, então a forma dos dados segue as consultas.'],
    ['Cite três sinais de que uma relação deve ser referenciada, e não embutida.', 'Cresce sem teto (o documento tem no máximo 16 MiB), raramente é lida junto, e é compartilhada ou muda por conta própria (N:N, 1:muitos sem teto).'],
    ['Qual a diferença entre um retrato e uma desnormalização?', 'O retrato é um fato do momento que não deve mudar, como o preço pago no pedido. A desnormalização é uma cópia por desempenho que deveria acompanhar o original e precisa ser mantida em dia.'],
    ['Num filtro do MongoDB, quando `{"itens.produto": "X"}` combina, se itens é um array?', 'Quando pelo menos um elemento de itens tem produto igual a X.'],
    ['Por que, num pipeline de agregação, o $match deve vir o mais cedo possível?', 'No começo ele pode usar índice e reduz o número de documentos que os estágios seguintes processam.'],
    ['Por que INCR não perde atualizações e GET seguido de SET perde?', 'INCR lê, soma e grava num comando só, executado inteiro; GET e SET são duas idas ao servidor, e outro cliente pode gravar entre elas.'],
    ['No cache-aside, o que a escrita faz com o cache, e por quê?', 'Grava no banco e apaga a chave. Apagar dá o mesmo resultado em qualquer ordem, ao contrário de gravar o valor novo; o prazo cobre a janela de corrida que sobra.'],
    ['Na limitação de taxa por janela fixa, como evitar uma chave sem prazo, e qual o ponto fraco do método?', 'Chamar EXPIRE ... NX a cada tentativa (ou INCR e EXPIRE juntos num MULTI/EXEC). Na virada da janela passam até o dobro do limite em pouco tempo.'],
  ],
  references: ['ddia', 'postgres-docs', 'sqlite-docs'],
});

/* ------------------------------------------------------------------ */
/* Replicação a fundo: atraso, failover, quóruns e conflitos            */
/* ------------------------------------------------------------------ */

/** Estado de cada réplica para o exercício de reparo (versão e valor de cada chave em cada nó). */
const REPLICAS_SETUP = dedent(`
  CREATE TABLE replicas (no TEXT NOT NULL, chave TEXT NOT NULL, versao INTEGER NOT NULL, valor TEXT, PRIMARY KEY (no, chave));
  INSERT INTO replicas VALUES
  ('A', 'pedido:1001', 3, 'entregue'),
  ('B', 'pedido:1001', 3, 'entregue'),
  ('C', 'pedido:1001', 2, 'a caminho'),
  ('A', 'pedido:1002', 1, 'preparando'),
  ('B', 'pedido:1002', 2, 'a caminho'),
  ('C', 'pedido:1002', 2, 'a caminho'),
  ('A', 'pedido:1003', 1, 'preparando'),
  ('B', 'pedido:1003', 1, 'preparando'),
  ('C', 'pedido:1003', 1, 'preparando'),
  ('A', 'pedido:1004', 5, 'cancelado'),
  ('B', 'pedido:1004', 4, 'entregue'),
  ('C', 'pedido:1004', 2, 'a caminho');
`);

/** Ferramenta dos testes do desafio de quórum: diz se a chamada levantou SemQuorum. */
const SEM_QUORUM_TESTE = dedent(`
  def _levanta(f, *args):
      try:
          f(*args)
      except SemQuorum:
          return True
      return False
`);

const CLUSTER_BASE = dedent(`
  class SemQuorum(Exception):
      pass

  class Cluster:
      def __init__(self, nos):
          self.nos = list(nos)
          self.dados = {no: {} for no in self.nos}   # no -> {chave: (ts, valor)}
          self.fora = set()                           # réplicas fora do ar

      def derrubar(self, no):
          self.fora.add(no)

      def religar(self, no):
          self.fora.discard(no)
`);

/** Indenta um bloco em 4 espaços (para pôr métodos dentro de uma classe já aberta). */
const indentar = (s: string): string => s.replace(/^(?=.)/gm, '    ');

const replicacao = lesson({
  id: 'l7-replicacao-consistencia',
  moduleId: 'm7-4',
  title: 'Replicação a fundo: atraso, quóruns e conflitos',
  titleEn: 'Replication in depth: lag, quorums and conflicts',
  summary: 'O que acontece entre o líder e as réplicas: replicação síncrona e assíncrona, as anomalias do atraso e como evitá-las, failover e cérebro dividido, quóruns sem líder com R + W > N e reparo na leitura, conflitos resolvidos pela última escrita ou por CRDTs, e o CAP refinado pelo PACELC.',
  minutes: 50,
  objectives: [
    'Comparar replicação síncrona, semissíncrona e assíncrona pelo que se perde quando o líder cai',
    'Reconhecer as anomalias do atraso de replicação e escolher uma técnica para garantir ler as próprias escritas e leituras monotônicas',
    'Explicar o que pode dar errado numa troca de líder: escritas perdidas e cérebro dividido',
    'Calcular se uma configuração de quórum (N, W, R) garante sobreposição e quantas falhas ela tolera',
    'Resolver escritas concorrentes pela última escrita ou com um CRDT, sabendo o que cada um perde',
    'Situar uma configuração no CAP e no PACELC, distinguindo o C do CAP do C do ACID',
  ],
  skills: ['bd-nosql'],
  terms: [
    t('replicação síncrona', 'synchronous replication', 'O líder só confirma a escrita ao cliente depois que réplicas escolhidas também a gravaram.', 'With synchronous replication, the leader waits until the follower has confirmed the write before reporting success to the client.'),
    t('replicação assíncrona', 'asynchronous replication', 'O líder confirma assim que grava no próprio disco e envia às réplicas depois; uma queda pode perder escritas já confirmadas.'),
    t('atraso de replicação', 'replication lag', 'Quanto uma réplica está atrás do líder, em tempo ou em posição no log.', 'Replication lag on the read replica spiked to 40 seconds during the nightly batch job.'),
    t('ler as próprias escritas', 'read-your-writes consistency', 'Garantia de que um usuário sempre vê o que ele mesmo gravou.'),
    t('leituras monotônicas', 'monotonic reads', 'Garantia de que, depois de ver um estado, o usuário não vê um estado mais antigo.'),
    t('troca de líder', 'failover', 'Promover uma réplica a líder quando o líder atual falha.'),
    t('cérebro dividido', 'split brain', 'Situação em que dois nós agem como líder ao mesmo tempo e aceitam escritas conflitantes.'),
    t('quórum', 'quorum', 'Número mínimo de réplicas que precisam responder para uma escrita (W) ou uma leitura (R) valer.', 'We read and write at QUORUM, so with a replication factor of 3 we can lose one node.'),
    t('reparo na leitura', 'read repair', 'Quando uma leitura encontra réplicas com versões velhas, o coordenador grava nelas a versão mais nova.'),
    t('última escrita vence', 'last write wins (LWW)', 'Resolver escritas concorrentes ficando com a de maior carimbo de tempo e descartando as outras.'),
    t('CRDT', 'conflict-free replicated data type', 'Tipo de dado cujas versões divergentes sempre podem ser juntadas automaticamente, sem perder atualizações.'),
    t('linearizabilidade', 'linearizability', 'Garantia de que o sistema se comporta como uma cópia única dos dados: toda leitura vê a escrita mais recente já concluída.'),
  ],
  stages: {
    conceito: [
      md(`
        A lição de NoSQL resumiu replicação numa frase: um líder recebe as escritas e as copia para seguidores, que podem estar "um pouco atrasados". Esta lição abre esse "um pouco". Quanto atraso, e o que o usuário vê enquanto ele dura? O que acontece com uma escrita já confirmada se o líder cair antes de copiá-la? E, se não houver líder nenhum, como no Cassandra, quem decide qual escrita vale?

        Essas perguntas aparecem em qualquer sistema com mais de uma cópia dos dados, do PostgreSQL do seu projeto com uma réplica de leitura até um serviço espalhado por três regiões. As respostas não se resumem a "consistente" ou "inconsistente": são garantias específicas, cada uma com um custo em latência ou em disponibilidade, que você escolhe operação por operação.
      `),
    ],
    explicacao: [
      md(`
        ### Síncrona ou assíncrona: o que se perde quando o líder cai
        Toda escrita chega ao líder, que a grava no seu log (no PostgreSQL, o WAL, o mesmo log que garante a durabilidade das transações) e a envia aos seguidores. A diferença está em **quando o líder responde "ok" ao cliente**. Na {{replicação síncrona|synchronous replication}}, ele espera a confirmação de réplicas escolhidas; na {{replicação assíncrona|asynchronous replication}}, responde assim que grava no próprio disco.
      `),
      {
        type: 'table',
        head: ['Modo', 'O líder confirma depois de', 'Se o líder morrer logo após confirmar', 'Custo'],
        rows: [
          ['síncrona', 'gravar e receber a confirmação das réplicas síncronas', 'a escrita está em pelo menos mais uma máquina', 'cada escrita espera a rede e a réplica mais lenta; se uma réplica síncrona sai do ar, as escritas travam'],
          ['semissíncrona', 'receber a confirmação de **uma** réplica; as outras recebem depois', 'a escrita está em pelo menos mais uma máquina', 'espera uma réplica só; se ela cair, outra assume o papel de síncrona'],
          ['assíncrona', 'gravar no próprio disco', 'as escritas confirmadas que ainda não tinham sido copiadas se perdem', 'a mais rápida, e muito comum como padrão'],
        ],
        caption: 'No PostgreSQL, a replicação por streaming é assíncrona por padrão. Listar réplicas em synchronous_standby_names a torna síncrona, e synchronous_commit escolhe até onde esperar: com on, até a réplica gravar o WAL em disco; com remote_apply, até ela aplicar a mudança e torná-la visível às consultas.',
      },
      md(`
        Com replicação assíncrona, cada seguidor fica algum tempo atrás do líder: é o {{atraso de replicação|replication lag}}. Em operação normal, ele é de uma fração de segundo. Com o seguidor sobrecarregado, a rede congestionada ou uma réplica se recuperando de uma queda, vira segundos ou minutos. Enquanto ele durar, ler de um seguidor é ler o passado.

        ### As anomalias do atraso, e como evitá-las
        Mandar leituras para os seguidores é a forma mais barata de aguentar mais leituras, e é aí que o atraso aparece para o usuário. Três anomalias clássicas:

        1. **Não ver a própria escrita.** Você troca a foto do perfil, a página recarrega, a leitura cai num seguidor que ainda não recebeu a mudança, e a foto antiga volta. A garantia que falta se chama {{ler as próprias escritas|read-your-writes}}: o usuário sempre vê o que ele mesmo gravou (o que os outros gravaram pode demorar).
        2. **Voltar no tempo.** Você abre os comentários de um vídeo e vê um comentário novo; recarrega, a leitura vai a outro seguidor, mais atrasado, e o comentário some. A garantia que falta são as {{leituras monotônicas|monotonic reads}}: depois de ver um estado, você nunca vê um estado mais antigo.
        3. **Ver a resposta antes da pergunta.** Num banco particionado, a pergunta e a resposta de uma conversa ficam em partições diferentes, cada uma com o seu atraso, e um leitor vê a resposta primeiro. A garantia que falta é o **prefixo consistente**: quem lê uma sequência de escritas as vê na ordem em que aconteceram.
      `),
      {
        type: 'table',
        head: ['Garantia', 'Técnica comum'],
        rows: [
          ['ler as próprias escritas', 'ler do líder o que o usuário pode ter mudado (o próprio perfil), ou tudo dele por um minuto depois de cada escrita; ou guardar a posição no log da última escrita do usuário e só ler de réplicas que já chegaram até ela'],
          ['leituras monotônicas', 'mandar cada usuário sempre para a mesma réplica, escolhida por hash do id dele; se ela cair, a escolha muda e a garantia pode falhar nesse momento'],
          ['prefixo consistente', 'gravar na mesma partição o que tem relação de causa (as mensagens de uma conversa), ou rastrear as dependências entre escritas'],
        ],
        caption: 'No PostgreSQL, pg_current_wal_lsn() no líder e pg_last_wal_replay_lsn() na réplica dão as posições no log. O MongoDB oferece sessões com consistência causal, que entregam ler as próprias escritas e leituras monotônicas.',
      },
      md(`
        ### Troca de líder: escritas perdidas e cérebro dividido
        Quando o líder cai, alguém precisa perceber (em geral, por um tempo limite sem resposta), escolher um novo líder (de preferência a réplica mais atualizada) e fazer clientes e réplicas obedecerem a ele. Essa {{troca de líder|failover}} pode ser manual ou automática, e cada passo tem uma armadilha:

        - **Escritas perdidas.** Com replicação assíncrona, o novo líder pode não ter as últimas escritas do antigo. Quando o antigo volta, essas escritas conflitam com as que o novo já aceitou, e o normal é descartá-las: o MongoDB, por exemplo, desfaz (*rollback*) as escritas que o antigo primário não chegou a replicar para a maioria dos membros e as guarda em arquivos à parte. Para o cliente, uma escrita confirmada sumiu. É por isso que, desde a versão 5.0, o padrão do MongoDB é \`w: "majority"\` (salvo em algumas configurações com árbitros): só confirma quando a maioria dos membros tem a escrita.
        - **Tempo limite.** Curto demais, um pico de carga dispara uma troca de líder desnecessária, que piora a carga; longo demais, o sistema fica mais tempo sem aceitar escritas.
        - **{{Cérebro dividido|split brain}}.** O antigo líder estava só isolado por uma falha de rede, não morto, e continua aceitando escritas: agora há dois líderes. A saída é exigir **maioria**. Um líder só é eleito com votos da maioria dos nós, e cada eleição ganha um número de mandato (*term*) maior; mensagens com um mandato antigo são recusadas. Duas maiorias do mesmo grupo sempre têm um nó em comum, então não há dois líderes no mesmo mandato. É o núcleo de algoritmos de consenso como o Raft, usado no etcd e que inspirou o protocolo de replicação do MongoDB.
      `),
      warn(`
        Em 2012, no GitHub, uma réplica MySQL desatualizada foi promovida a líder. O banco gerava as chaves primárias com autoincremento, e o contador do novo líder estava atrás do antigo: ele reutilizou chaves já usadas. Um Redis guardava dados indexados por essas mesmas chaves, e alguns dados privados apareceram para os usuários errados. Escritas que se perdem numa troca de líder não somem só do banco: elas podem estar referenciadas em outros sistemas. (O caso está no DDIA, capítulo 5.)
      `, 'Uma troca de líder que vazou dados'),
      md(`
        ### Sem líder: quóruns
        Bancos inspirados no Dynamo da Amazon (o sistema descrito num artigo de 2007, não o serviço DynamoDB, que usa um líder por partição), como Cassandra e ScyllaDB, não têm líder. O cliente, ou um nó coordenador, manda cada escrita para as **N** réplicas da chave e a considera feita quando **W** delas confirmam; cada leitura pergunta a **R** réplicas e fica com a versão mais nova entre as respostas. Esse número mínimo de respostas é o {{quórum|quorum}}.

        A regra central é uma contagem: se **R + W > N**, todo conjunto de R réplicas lidas tem pelo menos uma réplica em comum com o conjunto de W réplicas que confirmou a escrita (não cabem R réplicas fora de um grupo que já ocupa W das N). Então a leitura alcança pelo menos uma cópia da última escrita confirmada. Com N = 3, a escolha comum é W = 2 e R = 2.
      `),
      {
        type: 'table',
        head: ['N, W, R', 'R + W > N?', 'Réplicas que podem estar fora', 'Bom para'],
        rows: [
          ['3, 2, 2', 'sim (4 > 3)', '1 para escrever e 1 para ler', 'o equilíbrio padrão'],
          ['3, 3, 1', 'sim (4 > 3)', 'nenhuma para escrever; 2 para ler', 'muita leitura, pouca escrita'],
          ['3, 1, 3', 'sim (4 > 3)', '2 para escrever; nenhuma para ler', 'muita escrita, leitura rara'],
          ['3, 1, 1', 'não (2 ≤ 3)', '2 para escrever e 2 para ler', 'latência mínima, aceitando ler dado velho'],
        ],
        caption: 'Com R + W ≤ N, ler e escrever ficam mais rápidos e mais tolerantes a falhas, mas uma leitura pode não encontrar nenhuma cópia da escrita mais recente. No Cassandra, o cliente escolhe o nível por consulta: ONE, QUORUM, ALL e variantes por data center, como LOCAL_QUORUM.',
      },
      md(`
        Como as réplicas atrasadas alcançam as outras? Pelo {{reparo na leitura|read repair}}: quando uma leitura recebe versões diferentes, o coordenador devolve a mais nova ao cliente e a grava nas réplicas que responderam com a velha. Dados pouco lidos dependem de um processo de fundo, a anti-entropia (*anti-entropy*), que compara as réplicas e copia o que falta. E, enquanto uma réplica está fora do ar, outro nó pode guardar as escritas destinadas a ela e entregá-las quando ela voltar (*hinted handoff*).
      `),
      warn(`
        R + W > N não transforma o sistema numa cópia única. Uma escrita que não juntou W confirmações é informada ao cliente como falha, mas **não é desfeita** nas réplicas que a gravaram, e leituras futuras podem encontrá-la. Duas escritas concorrentes na mesma chave precisam de uma regra de desempate. E, com um quórum "relaxado" (*sloppy quorum*), uma escrita pode ser aceita por nós de fora das N réplicas durante uma falha, e a sobreposição deixa de valer até tudo ser reparado. Por isso o DDIA recomenda tratar W e R como um ajuste da probabilidade de ler dado velho, e não como garantia absoluta.
      `, 'Os limites do quórum'),
      md(`
        ### Escritas concorrentes: quem vence?
        Sem líder, ou com vários líderes (um por região), dois clientes podem gravar a mesma chave ao mesmo tempo em réplicas diferentes. Quando as réplicas se encontram, alguém tem de decidir.

        - **{{Última escrita vence|last write wins (LWW)}}.** Cada escrita leva um carimbo de tempo, e fica a de carimbo maior. É simples e sempre converge, e é o que o Cassandra faz, coluna por coluna. O custo: a outra escrita é descartada em silêncio, mesmo que as duas tenham sido confirmadas aos clientes. E "última" é pelo relógio das máquinas, que nunca estão perfeitamente sincronizados: se o relógio de um nó está alguns milissegundos atrasado (ou segundos, se o NTP falhar), a escrita que de fato veio depois pode perder.
        - **Detectar e guardar as duas.** Com vetores de versão, o banco sabe se uma escrita "viu" a outra (então a sobrescreve) ou se elas foram concorrentes (nenhuma viu a outra). No segundo caso, guarda as duas versões irmãs, e a aplicação as junta na próxima leitura: um carrinho de compras pode ficar com a união dos itens. O artigo do Dynamo conta o efeito colateral: um item removido de um lado pode reaparecer depois da junção.
        - **Tipos que se juntam sozinhos.** Um {{CRDT|conflict-free replicated data type}} é um tipo de dado desenhado para que quaisquer duas versões tenham uma junção certa, que não depende da ordem nem de quantas vezes é aplicada. O mais simples é o contador que só cresce (*G-counter*): cada réplica conta **só os seus** incrementos, juntar é tirar o máximo de cada posição, e o valor é a soma. Dois servidores contando curtidas durante uma partição nunca perdem uma curtida.
      `),
      deep(`
        Se o problema da última escrita é o relógio, por que não usar relógios melhores? O Spanner, do Google, faz isso: com GPS e relógios atômicos nos data centers, cada carimbo vem com um intervalo de incerteza explícito, de poucos milissegundos, e antes de confirmar uma transação o Spanner espera a incerteza passar. Assim, uma transação que começa depois de outra terminar sempre recebe um carimbo maior. O preço é essa espera em toda escrita e um hardware que poucos têm. Sem isso, a saída é não confiar no relógio para ordenar eventos: vetores de versão rastreiam a causalidade (quem viu quem), e CRDTs dispensam a ordem, porque a junção dá o mesmo resultado em qualquer ordem.
      `, 'Relógios: o Spanner e o TrueTime'),
      md(`
        ### CAP com mais precisão, e o PACELC
        O C do CAP é a {{linearizabilidade|linearizability}}: o sistema se comporta como se houvesse uma cópia só dos dados, e toda leitura que começa depois de uma escrita terminar vê essa escrita (ou uma mais nova). Não é o C do ACID, que você viu no m7-3: lá, consistência é cada transação respeitar as regras do banco (chaves, restrições, CHECK). O A do CAP também é estrito: todo nó que está funcionando responde a toda requisição.

        Com essas definições, o teorema diz o que a lição de NoSQL resumiu: durante uma partição, escolha entre recusar (C) e responder com o que tem (A). Os quóruns mostram a escolha na prática. Com N = 3 e W = R = 2, o lado da partição que ficou com um nó só não junta quórum e recusa: é o comportamento de C, embora, como você viu, o quórum sozinho não garanta linearizabilidade. Com W = R = 1, os dois lados continuam respondendo e podem divergir: é o comportamento de A.

        Mas partição é rara, e a escolha que você faz **o tempo todo** é outra. O **PACELC**, proposto por Daniel Abadi em 2012, completa o CAP: se há Partição, escolha entre A e C; senão (*Else*), entre Latência e Consistência. Esperar a confirmação de uma réplica em outra cidade, ou de duas em três, deixa toda escrita mais lenta mesmo num dia sem falha nenhuma. O Cassandra com nível ONE é PA/EL: responde sempre e rápido, aceitando ler dado velho. Um PostgreSQL com réplica síncrona e leituras no líder fica do outro lado, PC/EC: trava as escritas se a réplica síncrona some, e paga a ida e volta até ela em cada confirmação.
      `),
      tip(`
        Você não escolhe a consistência do sistema inteiro de uma vez: escolhe por operação. No mesmo app de banco, o saldo antes de um Pix é lido do líder (ou com quórum), e a lista de contatos frequentes pode vir de uma réplica atrasada. Para cada leitura, pergunte: o que acontece se ela vier com alguns segundos de atraso?
      `, 'Escolha por operação'),
    ],
    exemplo: [
      md(`
        **Atraso de replicação, segundo a segundo.** Um líder e duas réplicas assíncronas: a réplica 1 costuma estar 0,2 s atrás, e a réplica 2, sobrecarregada, 3 s. O balanceador manda cada leitura para uma réplica qualquer.
      `),
      {
        type: 'table',
        head: ['Instante', 'Evento', 'Líder', 'Réplica 1', 'Réplica 2'],
        rows: [
          ['0,0 s', 'Ana troca a foto do perfil (v1 → v2); o líder grava e confirma', 'v2', 'v1', 'v1'],
          ['0,2 s', 'a réplica 1 aplica a mudança', 'v2', 'v2', 'v1'],
          ['0,5 s', 'a página recarrega; a leitura vai à réplica 2', 'v2', 'v2', '**v1**: Ana vê a foto antiga'],
          ['1,0 s', 'Ana recarrega; a leitura cai na réplica 1', 'v2', '**v2**: a foto nova aparece', 'v1'],
          ['1,5 s', 'recarrega de novo; réplica 2', 'v2', 'v2', '**v1**: a foto nova some'],
          ['3,0 s', 'a réplica 2 aplica a mudança', 'v2', 'v2', 'v2'],
        ],
        caption: 'Em 0,5 s, falta ler as próprias escritas. Entre 1,0 s e 1,5 s, falta a leitura monotônica: Ana viu v2 e depois voltou a ver v1.',
      },
      md(`
        A correção por posição no log: a escrita da Ana ficou na posição 1043 do log do líder, e o app guarda esse número na sessão dela. Antes de cada leitura dos dados da Ana, o roteador compara com a posição que cada réplica já aplicou. Em 0,5 s, a réplica 1 está em 1043 e a réplica 2 em 1040, então a leitura vai à réplica 1 (ou ao líder, se nenhuma tiver chegado lá). Os outros usuários, que não sabem da foto nova, continuam lendo de qualquer réplica.

        **Quórum com uma réplica fora do ar.** N = 3 réplicas (A, B e C), W = 2 e R = 2, guardando o status do pedido P-1001 como (versão, valor):
      `),
      {
        type: 'table',
        head: ['Passo', 'O que acontece', 'A', 'B', 'C'],
        rows: [
          ['1', 'estado inicial', '(1, preparando)', '(1, preparando)', '(1, preparando)'],
          ['2', 'C sai do ar', '(1, preparando)', '(1, preparando)', 'fora do ar'],
          ['3', 'escrita (2, a caminho) com W = 2: A e B confirmam; sucesso', '(2, a caminho)', '(2, a caminho)', 'fora do ar'],
          ['4', 'C volta sem a escrita; agora A sai do ar', 'fora do ar', '(2, a caminho)', '(1, preparando)'],
          ['5', 'leitura com R = 2: B responde a versão 2, C a versão 1; o cliente recebe "a caminho"', 'fora do ar', '(2, a caminho)', '(1, preparando)'],
          ['6', 'reparo na leitura: o coordenador grava a versão 2 em C', 'fora do ar', '(2, a caminho)', '(2, a caminho)'],
        ],
        caption: 'Com uma réplica fora de cada vez, a escrita e a leitura continuaram funcionando, e a leitura achou a versão nova porque B estava nos dois quóruns.',
      },
      md(`
        Agora com W = 1 e R = 1, mais rápido e mais tolerante. No passo 3, a escrita é confirmada assim que A responde. No passo 5, a leitura pergunta só a C e devolve "preparando": o cliente vê o pedido voltar no tempo. Nada quebrou; essa configuração simplesmente não promete mais nada.

        **Curtidas durante uma partição.** Duas réplicas, em São Paulo e no Rio, contam as curtidas de um post com um G-counter. Cada uma guarda quanto **cada réplica** contou:
      `),
      {
        type: 'table',
        head: ['Momento', 'Réplica SP', 'Réplica RJ', 'Valor em SP / RJ'],
        rows: [
          ['antes da partição', '`{SP: 10, RJ: 5}`', '`{SP: 10, RJ: 5}`', '15 / 15'],
          ['partição: 3 curtidas chegam a SP e 2 ao RJ', '`{SP: 13, RJ: 5}`', '`{SP: 10, RJ: 7}`', '18 / 17'],
          ['a rede volta; cada lado junta o estado do outro (máximo de cada posição)', '`{SP: 13, RJ: 7}`', '`{SP: 13, RJ: 7}`', '20 / 20'],
        ],
        caption: 'Com um número só e a última escrita vencendo, o resultado seria 18 ou 17: 2 ou 3 curtidas sumiriam, sem erro nenhum.',
      },
    ],
    codigo: [
      py(`
        import random

        def taxa_de_leitura_velha(n, w, r, rodadas=10000, semente=1):
            """Pior caso: só as W réplicas que confirmaram têm a escrita nova."""
            rng = random.Random(semente)
            nos = list(range(n))
            velhas = 0
            for _ in range(rodadas):
                com_escrita = set(rng.sample(nos, w))   # as W que confirmaram
                lidas = set(rng.sample(nos, r))         # as R que responderam à leitura
                if not (com_escrita & lidas):
                    velhas += 1
            return velhas / rodadas

        for n, w, r in [(3, 2, 2), (3, 3, 1), (3, 1, 1), (3, 1, 2), (5, 3, 3), (5, 2, 2)]:
            promessa = "R+W>N" if r + w > n else "R+W<=N"
            print(f"N={n} W={w} R={r} ({promessa}): leituras velhas = {taxa_de_leitura_velha(n, w, r):.1%}")
      `, { caption: 'No pior caso, as réplicas fora do quórum de escrita ainda não receberam nada. Na prática, elas recebem a escrita milissegundos depois e a taxa real é bem menor; com R + W > N, ela é zero mesmo no pior caso (dentro deste modelo, sem escritas falhas nem concorrentes).' }),
      py(`
        def juntar(a, b):
            """Junção do G-counter: o máximo de cada posição."""
            return {no: max(a.get(no, 0), b.get(no, 0)) for no in a.keys() | b.keys()}

        sp = {"SP": 10, "RJ": 5}
        rj = dict(sp)

        # partição: cada lado conta só as suas curtidas, na sua posição
        sp["SP"] += 3
        rj["RJ"] += 2
        print("durante a partição:", sum(sp.values()), sum(rj.values()))

        juntos = juntar(sp, rj)
        print("depois de juntar:", sum(juntos.values()), dict(sorted(juntos.items())))
        print("juntar de novo não muda nada:", juntar(juntos, sp) == juntos)
        print("a ordem não importa:", juntar(sp, rj) == juntar(rj, sp))

        # última escrita vence, com um número só: (carimbo, valor)
        # a escrita do RJ aconteceu depois, às 1000,300 s do relógio real,
        # mas o relógio do nó RJ está 120 ms atrasado e carimbou 1000,180
        lww_sp = (1000.250, 18)
        lww_rj = (1000.180, 17)
        vencedora = max(lww_sp, lww_rj)
        print("LWW guarda:", vencedora[1], "e descarta a escrita do RJ, que foi a última")
      `, { caption: 'O G-counter chega a 20 nos dois lados, em qualquer ordem de junção. A última escrita vence guarda 18, perde as 2 curtidas do Rio e ainda escolhe a escrita errada por causa do relógio.' }),
      md('Os bancos reais expõem essas escolhas como parâmetros de cada operação. Só para leitura (rode num servidor de verdade):'),
      leitura('text', `
        -- PostgreSQL: nesta sessão, cada commit espera a réplica síncrona aplicar a mudança
        SET synchronous_commit = remote_apply;

        // MongoDB: confirma só quando a maioria tem a escrita; lê só o que a maioria já tem
        db.pedidos.updateOne({ _id: "P-1001" }, { $set: { status: "a caminho" } },
                             { writeConcern: { w: "majority" } })
        db.pedidos.find({ _id: "P-1001" }).readConcern("majority")

        -- Cassandra (cqlsh): nível de consistência das próximas consultas
        CONSISTENCY QUORUM;
        SELECT status FROM pedidos WHERE id = 'P-1001';
      `),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e7-repl-1',
          kind: 'mcq',
          prompt: 'O app lê de réplicas assíncronas para aliviar o líder. Ana troca o endereço de entrega, a tela recarrega e mostra o endereço antigo; um minuto depois, aparece o novo. Que garantia faltou, e qual técnica a resolve?',
          difficulty: 'facil',
          skills: ['bd-nosql'],
          hints: [
            'Onde estava o endereço novo no momento da recarga: no líder, na réplica que respondeu, nos dois?',
            'Quem precisa ver o endereço novo imediatamente: todos os usuários ou só a Ana?',
            'A técnica precisa lembrar de alguma coisa sobre a escrita da Ana. Do quê?',
          ],
          explanation: 'É a anomalia de não ver a própria escrita, causada pelo atraso de replicação. Basta dar a garantia a quem escreveu: ler do líder, por um tempo, o que a Ana pode ter mudado, ou guardar a posição no log da última escrita dela e só ler de réplicas que já passaram dessa posição. Os outros usuários continuam lendo das réplicas, aceitando o atraso.',
          options: [
            { text: 'Ler as próprias escritas: por um tempo depois de cada escrita da Ana, ler os dados dela do líder ou de uma réplica que já chegou à posição no log daquela escrita', correct: true, feedback: 'Isso: o problema é a Ana não ver o que ela mesma gravou, e a solução usa alguma memória da escrita dela (o horário ou a posição no log).' },
            { text: 'Atomicidade: a troca do endereço precisava de uma transação', feedback: 'A escrita foi atômica e confirmada no líder; quem estava atrás era a réplica que atendeu a leitura. Uma transação no líder não muda o que uma réplica atrasada devolve.' },
            { text: 'Leituras monotônicas: basta mandar a Ana sempre para a mesma réplica', feedback: 'Leituras monotônicas impedem voltar no tempo entre duas leituras, mas uma réplica fixa e atrasada mostraria o endereço antigo do mesmo jeito: ela ainda não recebeu o novo.' },
            { text: 'Durabilidade: o endereço só tinha sido gravado em memória', feedback: 'O endereço novo apareceu um minuto depois sem ninguém gravá-lo de novo: ele estava durável no líder e só não tinha chegado à réplica.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e7-repl-2',
          kind: 'predict',
          lang: 'python',
          prompt: 'A escrita nova foi confirmada pelas réplicas A e B (W = 2), e C ainda não a recebeu. O programa enumera todos os conjuntos de R réplicas que uma leitura poderia consultar. O que ele imprime?',
          difficulty: 'intermediario',
          skills: ['bd-nosql'],
          hints: [
            'Quantos conjuntos de tamanho r existem com 3 réplicas, para r = 1, 2 e 3?',
            'Um conjunto entra em sem_a_escrita quando a interseção com {A, B} é vazia. Qual conjunto de tamanho 1 é assim?',
            'Para r = 2: existe algum par de réplicas, entre três, que não contém nem A nem B?',
          ],
          explanation: 'Com R = 1, só a leitura que consulta C perde a escrita: R + W = 3 não passa de N = 3. A partir de R = 2, R + W = 4 > 3, e todo conjunto lido contém pelo menos uma das réplicas que confirmaram: não cabem 2 réplicas fora de um grupo que já ocupa 2 das 3. É o princípio da casa dos pombos por trás da regra R + W > N.',
          code: dedent(`
            from itertools import combinations

            nos = ["A", "B", "C"]
            confirmaram = {"A", "B"}          # W = 2

            for r in (1, 2, 3):
                leituras = list(combinations(nos, r))
                sem_a_escrita = [l for l in leituras if not confirmaram & set(l)]
                print(r, len(leituras), sem_a_escrita)
          `),
          answer: "1 3 [('C',)]\n2 3 []\n3 1 []",
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e7-repl-3',
          kind: 'sql',
          prompt: 'A tabela `replicas` tem uma linha por réplica e chave, com a `versao` e o `valor` que aquela réplica guarda. Para o processo de anti-entropia, liste as **réplicas desatualizadas**: as linhas cuja versão é menor que a maior versão da mesma chave. Colunas `chave`, `no`, `versao` e `ultima` (a maior versão daquela chave), em ordem de chave e depois de nó.',
          difficulty: 'intermediario',
          skills: ['bd-nosql', 'bd-joins'],
          hints: [
            'Para decidir se uma linha está velha, você compara a versão dela com o quê?',
            'Calcule a maior versão de cada chave numa consulta à parte. Como pôr esse resultado ao lado de cada linha de replicas?',
            'Uma tabela derivada (subconsulta no FROM) com GROUP BY chave pode ser juntada a replicas pela chave. Que filtro sobra depois?',
          ],
          explanation: 'SELECT r.chave, r.no, r.versao, m.ultima FROM replicas r JOIN (SELECT chave, MAX(versao) AS ultima FROM replicas GROUP BY chave) AS m ON m.chave = r.chave WHERE r.versao < m.ultima ORDER BY r.chave, r.no; A tabela derivada calcula a versão mais nova de cada chave uma vez, e o JOIN a põe ao lado de cada réplica. A pedido:1003, igual nas três, não aparece; a pedido:1004 tem duas réplicas atrás. Uma subconsulta correlacionada no WHERE também resolve, mas não entrega a coluna ultima sem repetir a subconsulta no SELECT. Repare no que esta consulta não pega: uma réplica que nem tem a chave não tem linha nenhuma. Para encontrá-la, cruze a lista de nós com a de chaves e procure os pares sem linha, com um anti-join.',
          setup: REPLICAS_SETUP,
          starter: 'SELECT chave, MAX(versao) AS ultima FROM replicas GROUP BY chave;',
          solution: 'SELECT r.chave, r.no, r.versao, m.ultima FROM replicas r JOIN (SELECT chave, MAX(versao) AS ultima FROM replicas GROUP BY chave) AS m ON m.chave = r.chave WHERE r.versao < m.ultima ORDER BY r.chave, r.no;',
          ordered: true,
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e7-repl-4',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Implemente o contador que só cresce (G-counter) na classe \`ContadorG(no)\`, em que \`no\` é o nome da réplica dona daquele objeto. Guarde o estado no atributo \`contagens\`, um dict que diz quanto cada réplica contou.

            - \`incrementar(qtd=1)\`: soma \`qtd\` (um inteiro ≥ 1) **na posição da própria réplica**.
            - \`valor()\`: o total contado por todas as réplicas conhecidas.
            - \`juntar(outro)\`: incorpora o estado de outro \`ContadorG\` (de outra réplica) **sem alterar o outro**, nem agora nem depois. A junção precisa ser comutativa, associativa e idempotente: juntar duas vezes o mesmo estado não pode contar em dobro.
          `),
          difficulty: 'intermediario',
          skills: ['bd-nosql'],
          hints: [
            'Por que cada réplica conta numa posição só dela, e não num número único compartilhado?',
            'Na junção, se as duas réplicas conhecem a posição de SP com valores diferentes, qual dos dois é o mais recente? Um contador que só cresce pode diminuir?',
            'Que operação entre dois números dá o mesmo resultado quando repetida e não depende da ordem? A soma tem essas propriedades?',
            'Depois de juntar, o seu dict é um objeto novo ou o mesmo dict do outro contador?',
          ],
          explanation: 'Cada réplica só escreve na própria posição, então a posição de SP no estado de qualquer réplica é um retrato, possivelmente atrasado, do que SP contou, e o retrato mais novo é o maior número: a junção tira o máximo de cada posição. Máximo é comutativo, associativo e idempotente, a soma não é: somar as contagens na junção conta em dobro cada vez que o mesmo estado chega de novo (e, numa rede real, ele chega). Tirar o máximo dos totais também erra: perde as curtidas do lado menor. Para curtidas que também podem ser desfeitas, existe o PN-counter: dois G-counters, um de incrementos e outro de decrementos, e o valor é a diferença.',
          starter: dedent(`
            class ContadorG:
                def __init__(self, no):
                    self.no = no
                    self.contagens = {}    # réplica -> quanto ela contou

                def incrementar(self, qtd=1):
                    pass

                def valor(self):
                    pass

                def juntar(self, outro):
                    # incorpore o estado de outro, sem alterá-lo
                    pass
          `),
          solution: dedent(`
            class ContadorG:
                def __init__(self, no):
                    self.no = no
                    self.contagens = {}

                def incrementar(self, qtd=1):
                    self.contagens[self.no] = self.contagens.get(self.no, 0) + qtd

                def valor(self):
                    return sum(self.contagens.values())

                def juntar(self, outro):
                    for no, n in outro.contagens.items():
                        self.contagens[no] = max(self.contagens.get(no, 0), n)
          `),
          tests: [
            {
              name: 'uma réplica sozinha',
              code: dedent(`
                c = ContadorG("SP")
                assert c.valor() == 0, f"um contador novo vale 0; veio {c.valor()!r}"
                c.incrementar()
                c.incrementar(4)
                assert c.valor() == 5, f"1 + 4 = 5; veio {c.valor()!r}"
                assert c.contagens == {"SP": 5}, f"os incrementos ficam na posição da própria réplica: esperado {{'SP': 5}}, veio {c.contagens}"
              `),
            },
            {
              name: 'partição e junção',
              code: dedent(`
                sp, rj = ContadorG("SP"), ContadorG("RJ")
                sp.incrementar(3)
                rj.incrementar(2)
                sp.juntar(rj)
                rj.juntar(sp)
                assert sp.valor() == 5 and rj.valor() == 5, f"depois de juntar nos dois sentidos, os dois lados valem 3 + 2 = 5; vieram {sp.valor()} e {rj.valor()}. A junção não pode escolher um lado: guarde quanto cada réplica contou"
              `),
            },
            {
              name: 'juntar de novo não conta em dobro',
              code: dedent(`
                sp, rj = ContadorG("SP"), ContadorG("RJ")
                sp.incrementar(3)
                rj.incrementar(2)
                for _ in range(3):
                    sp.juntar(rj)
                assert sp.valor() == 5, f"juntar o mesmo estado três vezes deu {sp.valor()}, e não 5: a junção precisa ser idempotente, porque numa rede real o mesmo estado chega mais de uma vez"
                sp.juntar(sp)
                assert sp.valor() == 5, "juntar um contador com ele mesmo não pode mudar nada"
              `),
            },
            {
              name: 'não altera o outro, nem depois',
              code: dedent(`
                sp, rj = ContadorG("SP"), ContadorG("RJ")
                rj.incrementar(2)
                sp.juntar(rj)
                sp.incrementar(10)
                assert rj.contagens == {"RJ": 2}, f"juntar não pode mudar o outro contador, nem agora nem depois: rj ficou com {rj.contagens}. Copie os números, não reaproveite o dict do outro"
                assert sp.valor() == 12, f"sp conhece 2 do RJ e contou 10; veio {sp.valor()}"
              `),
            },
            {
              name: 'continua contando depois de juntar',
              code: dedent(`
                sp, rj = ContadorG("SP"), ContadorG("RJ")
                sp.incrementar(3)
                rj.incrementar(2)
                sp.juntar(rj)
                rj.juntar(sp)
                sp.incrementar(1)
                rj.incrementar(4)
                sp.juntar(rj)
                assert sp.valor() == 10, f"3 + 2 + 1 + 4 = 10 curtidas; veio {sp.valor()}"
                assert sp.contagens == {"SP": 4, "RJ": 6}, f"cada réplica soma só na própria posição, antes e depois de juntar: esperado {{'SP': 4, 'RJ': 6}}, veio {sp.contagens}"
              `),
            },
            {
              name: 'trocas aleatórias de estado',
              code: dedent(`
                import random
                random.seed(11)
                for rodada in range(200):
                    rep = {n: ContadorG(n) for n in "ABC"}
                    total = 0
                    for _ in range(30):
                        if random.random() < 0.6:
                            n = random.choice("ABC")
                            q = random.randint(1, 3)
                            rep[n].incrementar(q)
                            total += q
                        else:
                            a, b = random.sample("ABC", 2)
                            rep[a].juntar(rep[b])
                    for a in "ABC":
                        for b in "ABC":
                            rep[a].juntar(rep[b])
                    valores = [rep[n].valor() for n in "ABC"]
                    assert valores == [total] * 3, f"rodada {rodada}: depois de trocas de estado em ordem aleatória e de uma rodada final em que todas se juntam, as três réplicas deveriam valer {total}; vieram {valores}"
              `),
            },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e7-repl-5',
          kind: 'mcq',
          prompt: 'Um banco com um líder e duas réplicas **assíncronas** confirma ao cliente um Pix de R$ 50 às 10:00:00,000. Às 10:00:00,040, o líder queima, antes de enviar essa escrita a qualquer réplica, e a troca automática de líder promove a réplica mais atualizada. O que acontece com o Pix?',
          difficulty: 'avancado',
          skills: ['bd-nosql'],
          hints: [
            'Em que momento um líder assíncrono responde "ok" ao cliente?',
            'Às 10:00:00,040, em quantas máquinas a escrita existe?',
            'O que teria de mudar no momento da confirmação para a escrita sobreviver à queda de uma máquina?',
          ],
          explanation: 'Na replicação assíncrona, "confirmado" quer dizer "gravado no líder". Se o líder some antes de copiar, a escrita some com ele, e o novo líder segue sem ela; se o antigo voltar, as escritas que só ele tinha são descartadas ou separadas para análise. Por isso sistemas de pagamento esperam a confirmação de pelo menos uma réplica (replicação síncrona ou semissíncrona, ou maioria, como o `w: "majority"` do MongoDB) antes de responder: alguns milissegundos a mais em toda escrita, em troca de não perder uma escrita confirmada quando uma máquina cai.',
          options: [
            { text: 'Nada se perde: o cliente recebeu a confirmação, então a escrita está garantida', feedback: 'A confirmação só garante o que o líder garantia, e com replicação assíncrona ele confirma ao gravar no próprio disco. Esse disco agora está fora do sistema.' },
            { text: 'O novo líder não tem o Pix; se o antigo voltar, o normal é descartar a escrita. Para não perder, a confirmação teria de esperar pelo menos uma réplica', correct: true, feedback: 'Isso: a replicação assíncrona troca a segurança das escritas recém-confirmadas por latência. Dinheiro pede esperar a cópia antes de confirmar.' },
            { text: 'Quando o líder antigo voltar, o novo recebe dele a escrita e tudo se acerta', feedback: 'Juntar de volta as escritas do líder antigo pode conflitar com o que o novo já aceitou: ids reaproveitados, saldos diferentes. Os bancos costumam descartá-las ou guardá-las à parte para análise manual, como o rollback do MongoDB.' },
            { text: 'A troca de líder não promove ninguém até o líder antigo voltar, justamente para não perder escritas', feedback: 'Esperar o líder antigo é uma escolha possível (consistência em vez de disponibilidade), mas o enunciado diz que a troca automática promoveu uma réplica.' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e7-repl-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Implemente um armazenamento sem líder, com quóruns e reparo na leitura. \`Cluster(nos)\` recebe a lista com os nomes das N réplicas; cada réplica guarda, para cada chave, um par \`(ts, valor)\` em \`self.dados[no][chave]\`. Uma réplica pode sair do ar e voltar (\`derrubar(no)\` e \`religar(no)\`, já prontos); quem sai do ar não perde o que tinha.

            - \`escrever(chave, valor, ts, w)\`: envia a escrita a **todas** as réplicas no ar. Cada uma grava o par se ainda não tiver a chave ou se \`ts\` for **maior** que o carimbo que ela tem (a última escrita vence; carimbo igual ou menor é ignorado). Se menos de \`w\` réplicas estiverem no ar, levante \`SemQuorum\`, **sem desfazer** o que as réplicas no ar gravaram (é o que bancos reais fazem).
            - \`ler(chave, r)\`: consulta as **r primeiras réplicas no ar, na ordem da lista** \`nos\`. Se houver menos de \`r\` no ar, levante \`SemQuorum\`. Devolva o valor de maior carimbo entre as respostas (\`None\` se nenhuma tiver a chave) e faça o **reparo na leitura**: cada réplica consultada que estava sem a chave ou com carimbo menor recebe o par mais novo. Réplicas não consultadas não mudam, e ler uma chave que ninguém tem não cria a chave em lugar nenhum.
          `),
          difficulty: 'desafio',
          skills: ['bd-nosql'],
          hints: [
            'Comece pelo que as duas operações têm em comum. Que lista você precisa montar antes de qualquer outra coisa?',
            'Na escrita, o que vem primeiro: gravar nas réplicas no ar ou conferir o quórum? Releia o que acontece com uma escrita que não juntou w réplicas.',
            'Na leitura, as respostas podem ser pares ou None. Como achar o par de maior carimbo sem tropeçar nos None?',
            'Depois de achar o par mais novo, quais réplicas recebem o reparo, e qual condição cada uma precisa cumprir?',
          ],
          explanation: 'As duas operações começam pela lista de réplicas no ar, na ordem de `nos`. A escrita grava em todas elas (com a última escrita vencendo pelo carimbo, não pela ordem de chegada) e só depois confere o quórum, então uma escrita que falhou para o cliente fica nas réplicas que a receberam. A leitura pega as r primeiras, escolhe o par de maior carimbo e repara as consultadas que estavam atrás. Os testes mostram, nas mesmas três réplicas, as faces do quórum: com W = R = 2, a leitura sempre encontra uma réplica com a escrita e ainda conserta a atrasada; com W = R = 1, ela pode ler o passado; e uma escrita "falha" aparece numa leitura posterior. Bancos reais acrescentam o que ficou de fora: o coordenador espera só as W ou R primeiras respostas em vez de saber de antemão quem está no ar, há timeouts, *hinted handoff* para as escritas destinadas a um nó caído e anti-entropia em segundo plano para as chaves que ninguém lê.',
          starter: CLUSTER_BASE + '\n' + indentar(dedent(`
                def escrever(self, chave, valor, ts, w):
                    # grave em todas as réplicas no ar (a última escrita vence) e confira o quórum
                    pass

                def ler(self, chave, r):
                    # consulte as r primeiras réplicas no ar, devolva o valor mais novo e repare as atrasadas
                    pass
          `)),
          solution: CLUSTER_BASE + '\n' + indentar(dedent(`
                def _no_ar(self):
                    return [no for no in self.nos if no not in self.fora]

                def escrever(self, chave, valor, ts, w):
                    no_ar = self._no_ar()
                    for no in no_ar:
                        atual = self.dados[no].get(chave)
                        if atual is None or ts > atual[0]:
                            self.dados[no][chave] = (ts, valor)
                    if len(no_ar) < w:
                        raise SemQuorum(f"só {len(no_ar)} réplica(s) no ar; w = {w}")

                def ler(self, chave, r):
                    no_ar = self._no_ar()
                    if len(no_ar) < r:
                        raise SemQuorum(f"só {len(no_ar)} réplica(s) no ar; r = {r}")
                    consultadas = no_ar[:r]
                    respostas = [self.dados[no].get(chave) for no in consultadas]
                    existentes = [p for p in respostas if p is not None]
                    if not existentes:
                        return None
                    mais_novo = max(existentes, key=lambda p: p[0])
                    for no in consultadas:
                        atual = self.dados[no].get(chave)
                        if atual is None or atual[0] < mais_novo[0]:
                            self.dados[no][chave] = mais_novo
                    return mais_novo[1]
          `)),
          tests: [
            {
              name: 'tudo no ar',
              code: dedent(`
                c = Cluster(["A", "B", "C"])
                c.escrever("pedido:1", "preparando", 1, 2)
                c.escrever("pedido:1", "a caminho", 2, 2)
                v = c.ler("pedido:1", 2)
                assert v == "a caminho", f"com todas as réplicas no ar, a leitura devolve a escrita mais nova; veio {v!r}"
                for no in "ABC":
                    p = c.dados[no].get("pedido:1")
                    assert p == (2, "a caminho"), f"a escrita vai para todas as réplicas no ar, não só para w delas: {no} ficou com {p}"
              `),
            },
            {
              name: 'o mais novo, não o primeiro',
              code: dedent(`
                c = Cluster(["A", "B", "C"])
                c.escrever("pedido:1", "preparando", 1, 3)
                c.derrubar("A")
                c.escrever("pedido:1", "a caminho", 2, 2)     # só B e C recebem
                c.religar("A")
                v = c.ler("pedido:1", 2)                       # consulta A (velha) e B (nova)
                assert v == "a caminho", f"A respondeu (1, 'preparando') e B respondeu (2, 'a caminho'): devolva o de maior carimbo, não a primeira resposta. Veio {v!r}"
                assert c.dados["A"]["pedido:1"] == (2, "a caminho"), f"A foi consultada e estava atrasada: o reparo na leitura grava nela o par mais novo. A ficou com {c.dados['A']['pedido:1']}"
              `),
            },
            {
              name: 'reparo só nas consultadas',
              code: SEM_QUORUM_TESTE + '\n' + dedent(`
                c = Cluster(["A", "B", "C", "D"])
                c.escrever("k", "v1", 1, 4)
                for no in "BCD":
                    c.derrubar(no)
                assert not _levanta(c.escrever, "k", "v2", 2, 1), "com w = 1 e A no ar, a escrita tem quórum: não levante SemQuorum"
                for no in "BCD":
                    c.religar(no)
                v = c.ler("k", 2)
                assert v == "v2", f"a leitura consulta A e B, e A tem a versão 2; veio {v!r}"
                assert c.dados["B"]["k"] == (2, "v2"), "B foi consultada (é a 2ª réplica no ar) e estava atrasada: precisa ser reparada"
                assert c.dados["C"]["k"] == (1, "v1") and c.dados["D"]["k"] == (1, "v1"), "C e D não foram consultadas (r = 2): o reparo na leitura só toca as réplicas que responderam"
              `),
            },
            {
              name: 'R + W ≤ N pode ler o passado',
              code: dedent(`
                c = Cluster(["A", "B", "C"])
                c.escrever("pedido:7", "preparando", 1, 1)
                c.derrubar("A")
                c.derrubar("B")
                c.escrever("pedido:7", "a caminho", 2, 1)      # só C recebe
                c.religar("A")
                c.religar("B")
                v = c.ler("pedido:7", 1)                        # consulta só A
                assert v == "preparando", f"com W = 1 e R = 1, a leitura consulta só A, que não recebeu a escrita nova: o esperado é ler o passado ('preparando'). Veio {v!r}. Consulte só as r primeiras réplicas no ar"
                assert c.dados["B"]["pedido:7"] == (1, "preparando"), "B não foi consultada e não pode mudar"
                v = c.ler("pedido:7", 3)
                assert v == "a caminho", f"com R = 3, a leitura alcança C e acha a escrita nova; veio {v!r}"
                assert all(c.dados[no]["pedido:7"] == (2, "a caminho") for no in "ABC"), "depois da leitura com R = 3, o reparo deixa as três réplicas com a versão nova"
              `),
            },
            {
              name: 'sem quórum na leitura; réplica fora do ar não é consultada',
              code: SEM_QUORUM_TESTE + '\n' + dedent(`
                c = Cluster(["A", "B", "C"])
                c.escrever("k", "x", 1, 3)
                c.derrubar("A")
                c.derrubar("C")
                assert _levanta(c.ler, "k", 2), "só B está no ar e r = 2: levante SemQuorum"
                assert c.ler("k", 1) == "x", "com r = 1, B basta"

                c = Cluster(["A", "B", "C"])
                c.escrever("k", "v1", 1, 3)
                c.derrubar("A")
                c.escrever("k", "v2", 2, 2)                    # B e C recebem; A continua fora do ar
                v = c.ler("k", 1)
                assert v == "v2", f"A está fora do ar: a leitura consulta as r primeiras réplicas no ar (aqui, B). Veio {v!r}"
                assert c.dados["A"]["k"] == (1, "v1"), "A está fora do ar: não pode ser consultada nem reparada"
              `),
            },
            {
              name: 'escrita sem quórum não é desfeita',
              code: SEM_QUORUM_TESTE + '\n' + dedent(`
                c = Cluster(["A", "B", "C"])
                c.escrever("pix:9", "pendente", 1, 2)
                c.derrubar("B")
                c.derrubar("C")
                assert _levanta(c.escrever, "pix:9", "cancelado", 2, 2), "só A está no ar e w = 2: levante SemQuorum"
                assert c.dados["A"]["pix:9"] == (2, "cancelado"), "a escrita que não juntou quórum não é desfeita: A, que estava no ar, fica com ela. Grave antes de conferir o quórum"
                assert c.dados["B"]["pix:9"] == (1, "pendente"), "B estava fora do ar e não recebe nada"
                c.religar("B")
                c.religar("C")
                v = c.ler("pix:9", 1)
                assert v == "cancelado", f"a escrita que falhou para o cliente aparece numa leitura posterior, que consulta A: é um dos limites do quórum. Veio {v!r}"
              `),
            },
            {
              name: 'a última escrita vence pelo carimbo',
              code: dedent(`
                c = Cluster(["A", "B", "C"])
                c.escrever("k", "x", 5, 3)
                c.escrever("k", "y", 3, 3)                     # chega depois, mas com carimbo menor
                v = c.ler("k", 3)
                assert v == "x", f"a escrita de carimbo 3 chegou depois, mas o carimbo dela é menor que 5: a última escrita vence pelo carimbo, não pela ordem de chegada. Veio {v!r}"
                c.escrever("k", "z", 5, 3)                     # carimbo igual: ignorada
                assert all(c.dados[no]["k"] == (5, "x") for no in "ABC"), "carimbo igual ao que a réplica já tem é ignorado"
              `),
            },
            {
              name: 'chave que ninguém tem',
              code: dedent(`
                c = Cluster(["A", "B"])
                c.escrever("outra", "x", 1, 2)
                assert c.ler("nada", 2) is None, "nenhuma réplica tem a chave: devolva None"
                assert all("nada" not in c.dados[no] for no in "AB"), "ler uma chave que ninguém tem não pode criar a chave nas réplicas"
              `),
            },
          ],
        },
      },
    ],
    projeto: [
      md(`
        **Mini-projeto: atraso de verdade na simulação.** Estenda o \`Cluster\` do desafio com um relógio simulado: cada escrita chega a cada réplica depois de um atraso sorteado (por exemplo, entre 1 e 50 ms), e as leituras acontecem em instantes sorteados, às vezes antes de a escrita chegar a todas. Meça a fração de leituras que devolvem dado velho para (N, W, R) = (3, 1, 1), (3, 2, 2) e (5, 2, 2), variando o atraso médio, e monte uma tabela. Depois dê a uma das réplicas um relógio 100 ms atrasado, gere escritas concorrentes na mesma chave e conte quantas escritas a última-escrita-vence descarta. Troque o valor por um G-counter e compare.
      `),
    ],
    revisao: [
      md(`
        - Síncrona: o líder espera réplicas antes de confirmar (não perde escrita confirmada quando uma máquina cai, mas é mais lenta). Assíncrona: confirma na hora e pode perder as últimas escritas numa troca de líder.
        - Atraso de replicação causa anomalias: não ver a própria escrita, voltar no tempo, ver a resposta antes da pergunta. Técnicas: ler do líder ou pela posição no log, réplica fixa por usuário, partição por causalidade.
        - Troca de líder: escritas perdidas, tempo limite difícil de acertar e cérebro dividido; maioria e números de mandato evitam dois líderes.
        - Quórum: R + W > N garante sobreposição; N = 3, W = R = 2 aguenta uma réplica fora. Reparo na leitura e anti-entropia alcançam as atrasadas. Não é linearizabilidade.
        - Escritas concorrentes: a última escrita vence (simples, perde dados, depende do relógio), vetores de versão (guardam as irmãs) ou CRDTs (juntam sozinhos, como o G-counter).
        - CAP: C é linearizabilidade, não o C do ACID. PACELC: sem partição, ainda se troca latência por consistência, a toda operação.
      `),
      english(`
        - **leader / follower (replica)**: líder / seguidor (réplica)
        - **replication lag**: atraso de replicação
        - **read-your-writes / monotonic reads / consistent prefix**: ler as próprias escritas / leituras monotônicas / prefixo consistente
        - **failover / split brain / term**: troca de líder / cérebro dividido / mandato
        - **quorum / read repair / anti-entropy / hinted handoff**: quórum / reparo na leitura / anti-entropia / entrega adiada
        - **last write wins / version vector / CRDT**: última escrita vence / vetor de versão / CRDT
        - **linearizability**: linearizabilidade

        Frase típica de entrevista: *"With N = 3, I'd use W = 2 and R = 2, so every read quorum overlaps every write quorum and we can lose one node. That still isn't linearizable: concurrent writes are resolved with last-write-wins, which can silently drop data."*

        Frase típica de documentação (PostgreSQL, synchronous_commit): *"When set to remote_apply, commits will wait until replies from the current synchronous standby(s) indicate they have received the commit record of the transaction and applied it, so that it has become visible to queries on the standby(s), and also written to durable storage on the standbys."*
      `),
    ],
  },
  review: [
    ['O que se perde quando um líder com replicação assíncrona cai logo depois de confirmar uma escrita?', 'A escrita, se ainda não tinha sido copiada: o novo líder não a tem e, quando o antigo volta, ela costuma ser descartada.'],
    ['Você grava, recarrega e vê o valor antigo. Que garantia faltou, e que técnica a dá?', 'Ler as próprias escritas. Ler do líder o que o usuário mudou (por um tempo), ou só ler de réplicas que já chegaram à posição no log da escrita dele.'],
    ['Como garantir leituras monotônicas com várias réplicas?', 'Mandando cada usuário sempre para a mesma réplica, por exemplo por hash do id dele.'],
    ['O que é cérebro dividido, e como os algoritmos de consenso o evitam?', 'Dois nós agindo como líder ao mesmo tempo. Exigindo votos da maioria para eleger e numerando os mandatos, recusando mensagens de mandatos antigos.'],
    ['Por que R + W > N faz a leitura alcançar a última escrita confirmada?', 'Porque qualquer conjunto de R réplicas lidas tem pelo menos uma em comum com as W que confirmaram a escrita: não cabem R réplicas fora delas.'],
    ['Com N = 3, W = 2 e R = 2, quantas réplicas podem estar fora do ar para ler e para escrever?', 'Uma, nos dois casos.'],
    ['O que a última-escrita-vence perde, e por que o relógio é um problema?', 'Descarta em silêncio as escritas concorrentes que perderam; com relógios desalinhados, a escrita que de fato veio depois pode perder.'],
    ['Como o G-counter junta duas réplicas sem perder incrementos?', 'Cada réplica conta só na própria posição; juntar é tirar o máximo de cada posição, e o valor é a soma. A junção é comutativa, associativa e idempotente.'],
    ['Qual a diferença entre o C do CAP e o C do ACID?', 'CAP: linearizabilidade, comportar-se como uma cópia única. ACID: cada transação respeita as regras do banco (chaves, restrições).'],
    ['O que o PACELC acrescenta ao CAP?', 'Que, sem partição (Else), ainda há uma escolha entre latência e consistência, feita a cada operação.'],
  ],
  references: ['ddia', 'postgres-docs', 'cmu-15445'],
});

export const lessons: Lesson[] = [documentos, replicacao];
