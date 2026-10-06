import type { Level } from '../types.ts';
import { code, dedent, deep, english, info, lesson, md, py, t, tip, warn } from '../helpers.ts';

const htmlCss = lesson({
  id: 'l6-html-css',
  moduleId: 'm6-1',
  title: 'HTML semântico, CSS e acessibilidade',
  titleEn: 'Semantic HTML, CSS and accessibility',
  summary: 'A estrutura da página, o modelo de caixa, flexbox/grid, layout responsivo e por que semântica é acessibilidade.',
  minutes: 40,
  objectives: ['Estruturar páginas com elementos semânticos', 'Entender o modelo de caixa e a cascata', 'Criar layouts com flexbox e grid', 'Aplicar boas práticas básicas de acessibilidade (WCAG)'],
  skills: ['web-html-css'],
  terms: [
    t('elemento', 'element', 'Parte de um documento HTML: <p>, <nav>, <button>...'),
    t('semântica', 'semantics', 'Usar o elemento que descreve o significado do conteúdo.'),
    t('seletor', 'selector', 'Padrão que escolhe a quais elementos uma regra CSS se aplica.'),
    t('modelo de caixa', 'box model', 'content + padding + border + margin.'),
    t('responsivo', 'responsive', 'Layout que se adapta a telas de tamanhos diferentes.'),
    t('acessibilidade', 'accessibility (a11y)', 'Garantir que pessoas com deficiência consigam usar o produto.'),
    t('leitor de tela', 'screen reader', 'Software que lê a interface em voz alta para pessoas cegas ou com baixa visão.'),
  ],
  stages: {
    conceito: [md('Uma página web tem três camadas: **HTML** (estrutura e significado), **CSS** (apresentação) e **JavaScript** (comportamento). Escrever HTML **{{semântico|semantic}}** — usar `<button>` para botões, `<nav>` para navegação, `<h1>`–`<h6>` em ordem — é o primeiro e mais importante passo de **{{acessibilidade|accessibility}}**.')],
    explicacao: [
      code('html', `
        <header>
          <nav aria-label="Principal">
            <a href="/">Início</a> <a href="/trilha">Trilha</a>
          </nav>
        </header>
        <main>
          <h1>Lista de tarefas</h1>
          <form>
            <label for="tarefa">Nova tarefa</label>
            <input id="tarefa" name="tarefa" required>
            <button type="submit">Adicionar</button>
          </form>
        </main>
        <footer>© 2026</footer>
      `, 'Cada <label> ligado ao <input> pelo for/id: o leitor de tela anuncia "Nova tarefa, campo de edição". Clicar no rótulo foca o campo.'),
      md(`
        **CSS essencial**:

        - **Seletores**: \`p\`, \`.classe\`, \`#id\`, \`nav a\`, \`button:hover\`, \`:focus-visible\`.
        - **Cascata e especificidade**: quando duas regras conflitam, vence a mais específica (id > classe > elemento); em empate, a última.
        - **Modelo de caixa**: conteúdo + \`padding\` + \`border\` + \`margin\`. Use \`box-sizing: border-box\` para que \`width\` inclua padding e borda.
        - **Layout**: **Flexbox** para uma dimensão (uma linha/coluna de itens), **Grid** para duas dimensões.
        - **Responsivo**: unidades relativas (\`rem\`, \`%\`), \`@media (min-width: 40rem) { ... }\`, imagens com \`max-width: 100%\`.
      `),
      { type: 'table', head: ['Boa prática (WCAG 2.2)', 'Por quê'], rows: [
        ['Contraste de texto ≥ 4,5:1', 'leitura para baixa visão e em sol forte'],
        ['Tudo funciona pelo teclado, com foco visível', 'quem não usa mouse (motora, leitores de tela, usuários avançados)'],
        ['Imagens com alt descritivo (ou alt="" se decorativas)', 'leitores de tela anunciam o conteúdo'],
        ['Campos com <label>', 'contexto para leitores de tela e área de clique maior'],
        ['Não depender só de cor', 'daltonismo: use também ícone ou texto'],
        ['Hierarquia de títulos sem pular níveis', 'usuários de leitor de tela navegam por títulos'],
      ] },
      warn('`<div onclick=...>` no lugar de `<button>` quebra o teclado e o leitor de tela: um div não recebe foco nem anuncia "botão". Use o elemento nativo.'),
    ],
    exemplo: [
      code('text', `
        .cartoes {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
          gap: 1rem;
        }
        .cartao { padding: 1rem; border: 1px solid #ccc; border-radius: .5rem; }
        .cartao:focus-within { outline: 3px solid #1e66f5; }
      `, 'Uma grade responsiva sem nenhuma media query: o navegador decide quantas colunas cabem.'),
      info('Esta própria plataforma usa HTML semântico, navegação por teclado, foco visível, rótulos e contraste verificado com ferramentas automáticas (axe-core). Abra as Ferramentas do Desenvolvedor (F12) e inspecione os elementos!'),
    ],
    codigo: [md('Python também gera HTML. Este código monta uma lista **escapando** o texto — sem isso, um usuário poderia injetar código na página (XSS, Nível 11):'), py(`
      from html import escape

      def lista_html(itens):
          lis = "".join(f"<li>{escape(i)}</li>" for i in itens)
          return f"<ul>{lis}</ul>"

      print(lista_html(["estudar CSS", "<script>alert('oi')</script>"]))
    `)],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e6-html-1',
          kind: 'mcq',
          prompt: 'Qual é a forma **mais acessível** de criar um botão que abre um menu?',
          difficulty: 'facil',
          skills: ['web-html-css'],
          hints: ['Qual elemento já vem com foco pelo teclado, Enter/Espaço e papel de "botão"?'],
          explanation: '`<button>` é focável, ativado por Enter e Espaço e anunciado como botão. `aria-expanded` informa o estado do menu.',
          options: [
            { text: '<div class="botao" onclick="abrir()">Menu</div>', feedback: 'Um div não recebe foco pelo teclado nem é anunciado como botão.' },
            { text: '<button type="button" aria-expanded="false">Menu</button>', correct: true, feedback: 'Isso: elemento nativo + estado anunciado.' },
            { text: '<a onclick="abrir()">Menu</a>', feedback: 'Link sem href não é focável, e links servem para navegar.' },
            { text: '<span role="text">Menu</span>', feedback: 'Não é interativo.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e6-html-2',
          kind: 'fill',
          lang: 'html',
          prompt: 'Complete para ligar o rótulo ao campo de e-mail.',
          difficulty: 'facil',
          skills: ['web-html-css'],
          hints: ['O atributo `for` do label deve ser igual ao `id` do input.'],
          explanation: 'label for="email" + input id="email": clicar no rótulo foca o campo e o leitor de tela anuncia "E-mail".',
          template: '<label ___="email">E-mail</label>\n<input ___="email" type="email">',
          blanks: [['for'], ['id']],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e6-css-1',
          kind: 'mcq',
          prompt: 'Uma caixa tem `width: 200px; padding: 20px; border: 5px solid;` e `box-sizing: content-box` (padrão). Qual a largura total ocupada (sem margem)?',
          difficulty: 'intermediario',
          skills: ['web-html-css'],
          hints: ['No content-box, width é só o conteúdo. Some padding e borda dos dois lados.'],
          explanation: '200 + 2×20 + 2×5 = 250px. Com `box-sizing: border-box`, seriam exatamente 200px.',
          options: [
            { text: '200px', feedback: 'Seria com border-box.' },
            { text: '225px', feedback: 'Padding e borda contam dos dois lados.' },
            { text: '250px', correct: true, feedback: 'Isso.' },
            { text: '240px', feedback: 'Faltou a borda dos dois lados (2 × 5).' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e6-html-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Escreva \`contraste(cor1, cor2)\` que calcula a razão de contraste WCAG entre duas cores hex (\`"#RRGGBB"\`),
            arredondada para 2 casas. Fórmula: para cada canal c (0–255), s = c/255; linear = s/12.92 se s <= 0.04045,
            senão ((s+0.055)/1.055)^2.4. Luminância L = 0.2126 R + 0.7152 G + 0.0722 B. Razão = (L_maior + 0.05) / (L_menor + 0.05).
          `),
          difficulty: 'desafio',
          skills: ['web-html-css', 'prog-funcoes'],
          hints: ['Decomponha: hex → (r, g, b); canal → linear; cor → luminância; duas luminâncias → razão.', '`int("ff", 16) == 255`.', 'Preto e branco devem dar 21.0.'],
          explanation: 'A fórmula vem da especificação WCAG. Texto normal precisa de razão ≥ 4.5; texto grande, ≥ 3. Ferramentas de acessibilidade fazem exatamente esse cálculo.',
          starter: 'def contraste(cor1, cor2):\n    pass\n',
          solution: dedent(`
            def _linear(c):
                s = c / 255
                return s / 12.92 if s <= 0.04045 else ((s + 0.055) / 1.055) ** 2.4

            def _lum(cor):
                r, g, b = (int(cor[i:i + 2], 16) for i in (1, 3, 5))
                return 0.2126 * _linear(r) + 0.7152 * _linear(g) + 0.0722 * _linear(b)

            def contraste(cor1, cor2):
                a, b = sorted([_lum(cor1), _lum(cor2)], reverse=True)
                return round((a + 0.05) / (b + 0.05), 2)
          `),
          tests: [
            { name: 'preto × branco = 21', code: 'assert contraste("#000000", "#ffffff") == 21.0' },
            { name: 'ordem não importa', code: 'assert contraste("#ffffff", "#000000") == 21.0' },
            { name: 'cinza #767676 no branco ≈ 4.54', code: 'assert contraste("#767676", "#FFFFFF") == 4.54' },
          ],
        },
      },
    ],
    projeto: [md('**Projeto 4 — Portfólio pessoal (parte 1)**: crie seu portfólio em HTML semântico e CSS responsivo, sem frameworks: cabeçalho, sobre, projetos (cartões em grid), contato. Meta: 100% navegável por teclado e nota 100 em acessibilidade no Lighthouse do Chrome.'), { type: 'project', projectId: 'p4-portfolio' }],
    revisao: [md('- HTML = estrutura e significado; CSS = apresentação.\n- Semântica é acessibilidade.\n- Modelo de caixa, cascata, flexbox (1D) e grid (2D).\n- WCAG: contraste, teclado, foco visível, alt, labels.')],
  },
  review: [
    ['Por que usar <button> em vez de <div onclick>?', 'O button é focável, ativável por teclado e anunciado como botão por leitores de tela.'],
    ['Qual a razão de contraste mínima para texto normal (WCAG AA)?', '4,5:1.'],
    ['Flexbox × Grid?', 'Flexbox para uma dimensão; Grid para layouts em duas dimensões.'],
  ],
  references: ['mdn', 'wcag', 'w3c-html'],
});

const js = lesson({
  id: 'l6-javascript-dom',
  moduleId: 'm6-2',
  title: 'JavaScript e o DOM',
  titleEn: 'JavaScript and the DOM',
  summary: 'A linguagem do navegador comparada com Python, o DOM, eventos e programação assíncrona.',
  minutes: 45,
  objectives: ['Traduzir conceitos de Python para JavaScript', 'Manipular o DOM e reagir a eventos', 'Entender o event loop, Promises e async/await', 'Evitar armadilhas clássicas (== × ===, this, var)'],
  skills: ['web-javascript'],
  terms: [
    t('DOM', 'Document Object Model', 'Representação da página como uma árvore de objetos que o JavaScript manipula.'),
    t('evento', 'event', 'Algo que acontece: clique, tecla, envio de formulário.'),
    t('ouvinte de evento', 'event listener', 'Função chamada quando o evento acontece.'),
    t('promessa', 'Promise', 'Objeto que representa um resultado futuro (assíncrono).'),
    t('assíncrono', 'asynchronous', 'Que não bloqueia: o programa continua enquanto espera.'),
    t('laço de eventos', 'event loop', 'Mecanismo que executa callbacks quando a pilha de chamadas fica vazia.'),
  ],
  stages: {
    conceito: [md('**JavaScript** é a única linguagem que os navegadores executam nativamente. Você já sabe programar: variáveis, condicionais, loops e funções existem aqui também, com outra sintaxe. A novidade é o **{{DOM|DOM}}** (a página como árvore de objetos) e a programação **orientada a eventos** e **assíncrona**.')],
    explicacao: [
      { type: 'table', head: ['Python', 'JavaScript'], rows: [
        ['x = 10', 'let x = 10;  const PI = 3.14;'],
        ['def soma(a, b): return a + b', 'function soma(a, b) { return a + b; }  ou  const soma = (a, b) => a + b;'],
        ['if x > 0: ... elif ...: ... else: ...', 'if (x > 0) { ... } else if (...) { ... } else { ... }'],
        ['for x in xs:', 'for (const x of xs) { ... }'],
        ['[x * 2 for x in xs if x > 0]', 'xs.filter(x => x > 0).map(x => x * 2)'],
        ['{"nome": "Ana"}', '{ nome: "Ana" }'],
        ['None', 'null e undefined'],
        ['f"Olá {nome}"', '`Olá ${nome}`'],
        ['==', '=== (sempre!)'],
      ] },
      md(`
        **DOM e eventos**:

        \`\`\`
        const botao = document.querySelector("#adicionar");
        botao.addEventListener("click", () => {
          const li = document.createElement("li");
          li.textContent = "nova tarefa";      // textContent, não innerHTML (XSS!)
          document.querySelector("ul").append(li);
        });
        \`\`\`

        **Assíncrono**: o JavaScript tem **uma** thread principal. Operações lentas (rede, timers) não bloqueiam: você registra o que fazer **quando** terminarem. Com \`async/await\`, o código assíncrono fica legível:

        \`\`\`
        async function carregar() {
          const resp = await fetch("/api/tarefas");
          if (!resp.ok) throw new Error(\`HTTP \${resp.status}\`);
          return await resp.json();
        }
        \`\`\`
      `),
      warn('`==` faz conversões estranhas (`"0" == 0` é true, `[] == false` é true). Use sempre `===`. E prefira `const`/`let` a `var`.'),
      deep('O **event loop**: a pilha de chamadas executa o código síncrono; callbacks prontos esperam em filas. **Microtasks** (Promises) rodam antes de **macrotasks** (setTimeout). Por isso `setTimeout(f, 0)` não executa "imediatamente".', 'Como o event loop decide a ordem'),
    ],
    exemplo: [code('javascript', `
      const tarefas = [
        { titulo: "estudar DOM", feita: true },
        { titulo: "praticar fetch", feita: false },
        { titulo: "ler a MDN", feita: false },
      ];
      const pendentes = tarefas.filter(t => !t.feita).map(t => t.titulo);
      console.log(pendentes);
      console.log(\`\${pendentes.length} de \${tarefas.length} pendentes\`);
    `, 'Este código roda em um Web Worker isolado; console.log aparece na saída.')],
    codigo: [code('javascript', `
      console.log("1 - síncrono");
      setTimeout(() => console.log("4 - macrotask (setTimeout)"), 0);
      Promise.resolve().then(() => console.log("3 - microtask (Promise)"));
      console.log("2 - síncrono");
    `, 'Execute e confira a ordem: síncrono → microtasks → macrotasks.')],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e6-js-1',
          kind: 'predict',
          lang: 'javascript',
          prompt: 'O que é impresso (uma linha)?',
          difficulty: 'facil',
          skills: ['web-javascript'],
          hints: ['filter mantém os que passam no teste; map transforma cada um.', 'Quais números são pares? Depois, multiplique cada um por 10.'],
          explanation: 'filter → [2, 4]; map → [20, 40]; join(",") → "20,40".',
          code: 'console.log([1, 2, 3, 4].filter(n => n % 2 === 0).map(n => n * 10).join(","));',
          answer: '20,40',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e6-js-2',
          kind: 'predict',
          lang: 'javascript',
          prompt: 'Qual a ordem das linhas impressas?',
          difficulty: 'avancado',
          skills: ['web-javascript'],
          hints: ['Código síncrono primeiro.', 'Promises (microtasks) antes de setTimeout (macrotasks).'],
          explanation: 'A e D são síncronos; C é microtask; B é macrotask.',
          code: dedent(`
            console.log("A");
            setTimeout(() => console.log("B"), 0);
            Promise.resolve().then(() => console.log("C"));
            console.log("D");
          `),
          answer: 'A\nD\nC\nB',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e6-js-3',
          kind: 'mcq',
          prompt: 'Para mostrar na página um comentário digitado pelo usuário, o que usar?',
          difficulty: 'intermediario',
          skills: ['web-javascript', 'seg-web'],
          hints: ['O que acontece se o comentário contiver `<img src=x onerror=alert(1)>`?'],
          explanation: '`textContent` insere texto puro. `innerHTML` interpretaria o texto como HTML e permitiria XSS (injeção de script).',
          options: [
            { text: 'elemento.innerHTML = comentario', feedback: 'Perigoso: interpreta HTML vindo do usuário (XSS).' },
            { text: 'elemento.textContent = comentario', correct: true, feedback: 'Isso: o conteúdo é tratado como texto.' },
            { text: 'document.write(comentario)', feedback: 'Obsoleto e também interpreta HTML.' },
            { text: 'eval(comentario)', feedback: 'Executaria o texto como código: nunca!' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e6-js-desafio',
          kind: 'predict',
          lang: 'javascript',
          prompt: 'Um clássico de entrevista. O que é impresso?',
          difficulty: 'desafio',
          skills: ['web-javascript'],
          hints: ['`var` tem escopo de função; `let` tem escopo de bloco (cada iteração ganha sua própria variável).', 'Quando os callbacks rodam, qual o valor de i em cada caso?'],
          explanation: 'Com var, há uma única variável i, que vale 3 quando os timeouts rodam: "3 3 3". Com let, cada iteração tem seu j: "0 1 2". Para imprimir em uma linha cada, juntamos ao final.',
          code: dedent(`
            const saida = [];
            for (var i = 0; i < 3; i++) setTimeout(() => saida.push(i), 0);
            for (let j = 0; j < 3; j++) setTimeout(() => saida.push(j), 0);
            setTimeout(() => console.log(saida.join(" ")), 0);
          `),
          answer: '3 3 3 0 1 2',
        },
      },
    ],
    projeto: [md('**Projeto 4 — Portfólio (parte 2)**: adicione JavaScript sem frameworks: alternância de tema claro/escuro (lembrando a escolha com localStorage), filtro de projetos por tecnologia e um formulário com validação acessível (mensagens ligadas aos campos com `aria-describedby`).'), { type: 'project', projectId: 'p4-portfolio' }],
    revisao: [md('- Mesmos conceitos, outra sintaxe: let/const, arrow functions, ===.\n- DOM: querySelector, createElement, textContent, addEventListener.\n- Assíncrono: Promises, async/await, event loop (micro antes de macro).')],
  },
  review: [
    ['Por que usar === em vez de ==?', 'Porque == faz conversões de tipo implícitas e surpreendentes.'],
    ['textContent × innerHTML?', 'textContent insere texto; innerHTML interpreta HTML (risco de XSS com dados do usuário).'],
    ['O que roda primeiro: Promise.then ou setTimeout(…, 0)?', 'Promise.then (microtask) roda antes do setTimeout (macrotask).'],
  ],
  references: ['mdn', 'ecmascript', 'javascript-info'],
});

const http = lesson({
  id: 'l6-http-rest',
  moduleId: 'm6-3',
  title: 'HTTP, REST e APIs JSON',
  titleEn: 'HTTP, REST and JSON APIs',
  summary: 'Métodos, status, cabeçalhos, design de APIs REST, JSON e consumo com fetch.',
  minutes: 40,
  objectives: ['Usar corretamente métodos e códigos de status HTTP', 'Projetar rotas REST para um recurso', 'Serializar e validar JSON', 'Entender idempotência, cache e CORS em alto nível'],
  skills: ['web-http-api'],
  terms: [
    t('interface de programação', 'API (application programming interface)', 'Contrato que permite a um programa usar serviços de outro.'),
    t('recurso', 'resource', 'A "coisa" exposta pela API: /alunos, /alunos/42.'),
    t('ponto de acesso', 'endpoint', 'Combinação de método + caminho: GET /alunos.'),
    t('cabeçalho', 'header', 'Metadado da requisição/resposta: Content-Type, Authorization.'),
    t('corpo', 'body / payload', 'Os dados enviados na requisição ou resposta.'),
    t('idempotente', 'idempotent', 'Repetir a operação tem o mesmo efeito que fazê-la uma vez.'),
  ],
  stages: {
    conceito: [md('Uma **{{API|API}}** web é um servidor que responde a requisições HTTP com dados (geralmente **JSON**) em vez de páginas. **REST** é um estilo de projeto em que a URL identifica um **{{recurso|resource}}** e o **método** HTTP diz o que fazer com ele.')],
    explicacao: [
      { type: 'table', head: ['Método', 'Uso', 'Exemplo', 'Idempotente?'], rows: [
        ['GET', 'ler', 'GET /alunos/42', 'sim (e seguro: não altera)'],
        ['POST', 'criar', 'POST /alunos  (corpo: JSON do aluno)', 'não'],
        ['PUT', 'substituir', 'PUT /alunos/42', 'sim'],
        ['PATCH', 'alterar parcialmente', 'PATCH /alunos/42  {"email": "..."}', 'não necessariamente'],
        ['DELETE', 'remover', 'DELETE /alunos/42', 'sim'],
      ] },
      md(`
        **Códigos de status** que uma API deve usar com precisão: \`200 OK\`, \`201 Created\` (com cabeçalho \`Location\`), \`204 No Content\`, \`400 Bad Request\` (validação), \`401 Unauthorized\` (não autenticado), \`403 Forbidden\` (sem permissão), \`404 Not Found\`, \`409 Conflict\`, \`422 Unprocessable Content\`, \`429 Too Many Requests\`, \`500\`.

        **Boas práticas de design**: substantivos no plural (\`/alunos\`), aninhamento raso (\`/alunos/42/matriculas\`), paginação (\`?pagina=2&limite=20\`), erros com corpo útil (\`{"erro": "email inválido", "campo": "email"}\`), versão (\`/v1/\`), e **validar toda entrada** no servidor.

        **CORS**: por segurança, o navegador bloqueia que um site leia respostas de outra origem, a menos que o servidor permita com cabeçalhos \`Access-Control-Allow-Origin\`.
      `),
      english('Documentação de APIs tem um vocabulário próprio: *"Returns a paginated list of..."*, *"Requires authentication"*, *"Rate limit: 100 requests per minute"*, *"This endpoint is idempotent"*, *"Request body"*, *"Query parameters"*, *"Response schema"*.'),
    ],
    exemplo: [code('text', `
      POST /v1/tarefas HTTP/1.1
      Host: api.exemplo.com
      Content-Type: application/json
      Authorization: Bearer eyJhbGciOi...

      {"titulo": "estudar REST", "prioridade": 2}

      HTTP/1.1 201 Created
      Location: /v1/tarefas/57
      Content-Type: application/json

      {"id": 57, "titulo": "estudar REST", "prioridade": 2, "feita": false}
    `, 'Uma requisição e uma resposta completas.')],
    codigo: [py(`
      import json

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
      print(validar_tarefa('nao é json'))
    `)],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e6-http-0',
          kind: 'mcq',
          prompt: "Uma API devolveu **404 Not Found**. O que isso significa?",
          difficulty: 'facil',
          skills: ["web-http-api"],
          hints: ["Códigos 4xx indicam um problema do lado de quem fez o pedido."],
          explanation: "404 significa que o recurso pedido não existe naquele endereço. 4xx são erros do cliente (pedido errado); 5xx são erros do servidor.",
          options: [
            { text: "O recurso pedido não existe naquele endereço", correct: true, feedback: "Isso. Confira a URL e o id." },
            { text: "O servidor caiu", feedback: "Falha do servidor é 5xx, como 500 ou 503." },
            { text: "Você não tem permissão", feedback: "Sem permissão é 403 (ou 401 sem autenticação)." },
            { text: "Deu tudo certo", feedback: "Sucesso é 2xx, como 200 OK." },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e6-http-1',
          kind: 'mcq',
          prompt: 'Um usuário logado tenta apagar a conta de **outro** usuário pela API. Qual status a API deve devolver?',
          difficulty: 'intermediario',
          skills: ['web-http-api'],
          hints: ['O servidor sabe quem ele é (autenticado). Ele tem permissão?'],
          explanation: '403 Forbidden: autenticado, mas sem autorização. 401 é para quando não se sabe quem é (sem login ou token inválido). Algumas APIs devolvem 404 para não revelar que o recurso existe.',
          options: [
            { text: '401 Unauthorized', feedback: '401 significa "não autenticado". Aqui o usuário está logado.' },
            { text: '403 Forbidden', correct: true, feedback: 'Isso: autenticado, mas não autorizado.' },
            { text: '400 Bad Request', feedback: 'A requisição está bem formada.' },
            { text: '200 OK', feedback: 'Jamais: seria uma falha grave de autorização (Broken Access Control, nº 1 do OWASP).' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e6-http-2',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Escreva um roteador mínimo: \`rotear(metodo, caminho)\` devolve o nome do handler segundo a tabela
            \`GET /tarefas → "listar"\`, \`POST /tarefas → "criar"\`, \`GET /tarefas/<id> → "detalhar"\`,
            \`DELETE /tarefas/<id> → "remover"\`, onde <id> é numérico. Devolva uma tupla \`(handler, params)\`, com params
            \`{"id": int}\` quando houver. Caminho desconhecido → \`("404", {})\`; caminho conhecido com método errado → \`("405", {})\`.
          `),
          difficulty: 'avancado',
          skills: ['web-http-api'],
          hints: ['Divida o caminho em partes: `caminho.strip("/").split("/")`.', 'Primeiro descubra **qual rota** casa (com ou sem id); depois verifique o método.', '`parte.isdigit()` diz se o id é numérico.'],
          explanation: 'Frameworks web (Flask, Express, Fastify) fazem exatamente isso, com mais recursos. Distinguir 404 (rota não existe) de 405 (*Method Not Allowed*) é um detalhe que APIs bem feitas respeitam.',
          starter: 'def rotear(metodo, caminho):\n    pass\n',
          solution: dedent(`
            ROTAS = {
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
                return (handler, params)
          `),
          tests: [
            { name: 'listar e criar', code: 'assert rotear("GET", "/tarefas") == ("listar", {}) and rotear("POST", "/tarefas/") == ("criar", {})' },
            { name: 'com id', code: 'assert rotear("GET", "/tarefas/42") == ("detalhar", {"id": 42}) and rotear("DELETE", "/tarefas/7") == ("remover", {"id": 7})' },
            { name: '404 e 405', code: 'assert rotear("GET", "/alunos") == ("404", {}) and rotear("GET", "/tarefas/abc") == ("404", {}) and rotear("PUT", "/tarefas") == ("405", {})' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e6-http-desafio',
          kind: 'mcq',
          prompt: 'Um app móvel reenvia automaticamente `POST /pagamentos` quando a rede falha. Como evitar cobranças duplicadas?',
          difficulty: 'desafio',
          skills: ['web-http-api'],
          hints: ['POST não é idempotente. Como o servidor pode reconhecer que é a mesma tentativa?'],
          explanation: 'O cliente gera uma **chave de idempotência** única por pagamento (cabeçalho `Idempotency-Key`); o servidor guarda o resultado associado e, ao receber a mesma chave, devolve o resultado salvo sem cobrar de novo. É o que APIs de pagamento como a da Stripe fazem.',
          options: [
            { text: 'Trocar POST por GET', feedback: 'GET não deve ter efeitos colaterais, e não resolve a duplicidade.' },
            { text: 'Enviar uma chave de idempotência única por tentativa lógica e o servidor deduplicar', correct: true, feedback: 'Isso: torna a operação idempotente.' },
            { text: 'Desabilitar o reenvio', feedback: 'Aí pagamentos legítimos falhariam em redes instáveis.' },
            { text: 'Aumentar o timeout', feedback: 'Reduz, mas não elimina, o problema.' },
          ],
        },
      },
    ],
    projeto: [md('**Projeto 5 — API REST de tarefas**: construa uma API com Python (FastAPI ou Flask) ou Node (Fastify/Express) com CRUD de tarefas, validação, códigos de status corretos, testes automatizados e documentação OpenAPI. Este é o primeiro projeto de back-end.'), { type: 'project', projectId: 'p5-api' }],
    revisao: [md('- REST: recurso na URL, ação no método.\n- Status precisos: 201, 204, 400, 401, 403, 404, 409, 422, 429.\n- Valide toda entrada no servidor; erros com corpo útil.\n- Idempotência importa em redes instáveis.')],
  },
  review: [
    ['401 × 403?', '401: não autenticado. 403: autenticado, mas sem permissão.'],
    ['Quais métodos HTTP são idempotentes?', 'GET, PUT, DELETE (e HEAD, OPTIONS). POST não é.'],
    ['O que é CORS?', 'Mecanismo pelo qual o servidor permite que páginas de outras origens leiam suas respostas no navegador.'],
  ],
  references: ['mdn-http', 'rfc9110', 'owasp-api'],
});

export const level6: Level = {
  id: 'n6',
  number: 6,
  title: 'Desenvolvimento Web',
  titleEn: 'Web Development',
  goal: 'Construir interfaces acessíveis e APIs bem projetadas, entendendo o que acontece entre navegador e servidor.',
  why: 'A web é a plataforma mais universal que existe e onde está a maioria das vagas de entrada. Aprender pelos fundamentos (HTML, CSS, JS, HTTP) — antes de frameworks — torna qualquer framework fácil depois.',
  modules: [
    {
      id: 'm6-1', levelId: 'n6', title: 'HTML, CSS e acessibilidade', titleEn: 'HTML, CSS and accessibility',
      description: 'Estrutura semântica, estilo, layout responsivo e WCAG.',
      prerequisites: ['m0-3'],
      skills: [{ id: 'web-html-css', pt: 'HTML, CSS e acessibilidade', en: 'HTML, CSS and accessibility' }],
      outline: ['HTML semântico', 'Formulários acessíveis', 'Cascata e especificidade', 'Modelo de caixa', 'Flexbox e Grid', 'Responsividade', 'WCAG 2.2'],
      lessons: [htmlCss],
      references: ['mdn', 'wcag'],
    },
    {
      id: 'm6-2', levelId: 'n6', title: 'JavaScript e DOM', titleEn: 'JavaScript and the DOM',
      description: 'A linguagem do navegador, eventos e assincronia.',
      prerequisites: ['m6-1', 'm1-5'],
      skills: [{ id: 'web-javascript', pt: 'JavaScript e DOM', en: 'JavaScript and the DOM' }],
      outline: ['Sintaxe comparada com Python', 'Arrays: map, filter, reduce', 'DOM e eventos', 'Promises e async/await', 'Event loop', 'Módulos ES e TypeScript (introdução)'],
      lessons: [js],
      references: ['mdn', 'ecmascript'],
    },
    {
      id: 'm6-3', levelId: 'n6', title: 'HTTP, REST e APIs', titleEn: 'HTTP, REST and APIs',
      description: 'Projetar e consumir APIs.',
      prerequisites: ['m6-2'],
      skills: [{ id: 'web-http-api', pt: 'HTTP e APIs REST', en: 'HTTP and REST APIs' }],
      outline: ['Métodos e status', 'Design REST', 'JSON e validação', 'fetch', 'Idempotência', 'CORS e cache'],
      lessons: [http],
      references: ['mdn-http', 'rfc9110'],
    },
    {
      id: 'm6-4', levelId: 'n6', title: 'Back-end e autenticação', titleEn: 'Back-end and authentication',
      description: 'Servidores, persistência, sessões, tokens e frameworks.',
      prerequisites: ['m6-3', 'm7-1', 'm5-1'],
      skills: [{ id: 'web-backend', pt: 'Back-end e autenticação', en: 'Back-end and authentication' }],
      outline: ['Arquitetura de um servidor web', 'Frameworks (FastAPI, Express, Fastify)', 'Camadas: rotas, serviços, repositórios', 'Sessões com cookies × tokens (JWT)', 'Hash de senhas', 'Validação e tratamento de erros', 'Front-end com componentes (React)'],
      lessons: [],
      references: ['owasp-cheatsheets', 'mdn-http'],
    },
  ],
};

