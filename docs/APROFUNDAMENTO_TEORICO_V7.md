# Alicerce — aprofundamento teórico v7

Entrega editorial de 11/10/2026 (America/Fortaleza). Cópia independente do Alicerce; não modifica automaticamente o GitHub original.

> **Situação em 14/10/2026.** Este documento registra a entrega da v7 na cópia do Codex, que tinha 91 aulas; os números abaixo são os daquela entrega. Depois da integração com o repositório do GitHub, o currículo tem 111 lições, 484 exercícios e 525 cartões. As 20 lições dos módulos m7-1 a m9-3 (níveis 7 a 9) vieram do repositório do GitHub sem aprofundamento teórico; até 21/10/2026, a cobertura era de 91 de 111 aulas (nível 7, 4 de 12; nível 8, 3 de 9; nível 9, 3 de 9). Em 21/10/2026 elas receberam o seu, no mesmo formato (ver "Complemento de 21/10/2026", no fim), e a cobertura passou a **111 de 111 aulas**. Desde a separação do conteúdo pago, `packages/content/src/theory/` e `theory-expansions.ts` guardam só o aprofundamento dos níveis 0 e 1; o das aulas pagas fica no repositório privado (`src/aprofundamento/`), e o mapa público leva só o título (`theoryTitle` em `catalogo-pago.ts`). O "fluxo Sites" citado no fim era o da publicação da cópia, não o GitHub Pages deste repositório.

## Resultado

A v6 acrescentou 15 suplementos, um por nível. Esta entrega acrescenta os 76 restantes: **91/91 aulas** da cópia passaram a ter aprofundamento (com as 20 lições vindas depois, foram 91 de 111 até 21/10/2026; hoje são 111 de 111), distribuído nas etapas Explicação, Exemplo, Desafio e Revisão. São aproximadamente **31.670 palavras novas**, contadas nos nove campos editoriais dos novos suplementos, sem bibliografia e tabelas. Não são 76 cursos novos nem evidência de domínio completo da área.

O currículo mantém **91 aulas, 364 exercícios e 357 cartões**. IDs e soluções avaliadas permanecem preservados; houve correção pontual de textos e feedbacks imprecisos. Reflexões novas não recebem nota automática e não concedem certificação.

## O que cada suplemento oferece

1. Pré-requisito e objetivo observável.
2. Explicação dos conceitos, hipóteses e limites.
3. Exemplo original com raciocínio e resultado.
4. Concepção equivocada para evitar.
5. Autoexplicação com retorno na etapa Revisão.
6. Transferência para outro problema e fontes para continuar.

O acréscimo de 12 minutos por aula é uma estimativa editorial herdada da v6, ainda não medida com alunos. A duração real varia conforme pré-requisitos e atividade de transferência.

## Cobertura

| Nível | Área | Aulas com suplemento | Novas nesta entrega |
|---|---|---:|---:|
| 0 | Introdução à Computação | 7 | 6 |
| 1 | Lógica de Programação | 8 | 7 |
| 2 | Primeira Linguagem: Python | 9 | 8 |
| 3 | Estruturas de Dados | 15 | 14 |
| 4 | Algoritmos | 18 | 17 |
| 5 | Programação Orientada a Objetos | 3 | 2 |
| 6 | Desenvolvimento Web | 4 | 3 |
| 7 | Banco de Dados | 4 | 3 |
| 8 | Sistemas Operacionais | 3 | 2 |
| 9 | Redes de Computadores | 3 | 2 |
| 10 | Engenharia de Software | 4 | 3 |
| 11 | Segurança | 3 | 2 |
| 12 | Cloud e DevOps | 3 | 2 |
| 13 | Inteligência Artificial | 3 | 2 |
| 14 | Matemática para Computação | 4 | 3 |

## Correções no material anterior

- Chaves de dicionário: contrato de hash estável e igualdade, em vez de equivalência absoluta com imutabilidade.
- Árvores de busca: descartar uma subárvore não significa eliminar exatamente metade dos nós.
- Pilhas com listas: custo amortizado explicitado.
- JavaScript: removida afirmação de ser a única linguagem executada pelos navegadores.
- Memória: falta de página não exige sempre disco; coleta depende de alcançabilidade; journaling não garante ausência de corrupção.
- TCP: confiabilidade não elimina falha permanente nem comprova conclusão da regra de negócio.
- HTTP/1.1: reconhecida possibilidade de pipelining; DNS pode coexistir com conexões duradouras.
- Git: hashes ajudam a detectar alterações contra uma referência confiável, sem impedir reescrita da história.
- XSS: corrigido exemplo de script via innerHTML; outros vetores continuam exigindo tratamento de saída.
- RSA: números maiores não tornam RSA de brinquedo seguro; verificação requer esquema e chave pública confiáveis.

## Estratégia de acesso preservada

Níveis 0–1: 15 aulas gratuitas. Níveis 2–14: 76 aulas Premium na cópia (hoje 96, com as 20 lições de m7-1 a m9-3). O complemento acompanha o acesso da aula; conteúdo pago não deve entrar nos arquivos públicos. A lista de títulos é uma prévia, não uma liberação.

Tutor local e limites de IA não foram alterados. A publicação estática continua sem conta de aluno, cobrança ou IA externa ativa. Para monetizar, ainda é necessário ativar e validar a infraestrutura descrita em ESTRATEGIA_ASSINATURA.md e TUTOR_IA_V2.md.

## Orientação para Claude e manutenção

- Manter teoria nos módulos packages/content/src/theory/ e integração em theory-expansions.ts; não exportar corpos das aulas por lite.ts.
- Reutilizar os IDs existentes. Não recriar exercícios ou migrar progresso por causa de mudanças editoriais.
- Referências ficam em references.ts. Elas sustentam conceitos, mas não significam endosso institucional nem equivalência universitária.
- Fazer revisão de compreensão com autodidatas: pedir explicação sem consulta, aplicar problema novo e registrar o ponto de dúvida. Priorizar revisões por evidência, não apenas volume de texto.
- UP33 permanece Parcial: cobertura editorial entregue, eficácia pedagógica ainda não validada.

## Verificação e limites

Cobertura e referências verificadas programaticamente; exemplos revisados editorialmente. Checagem de tipos aprovada; 129 testes automatizados aprovados; 214 exercícios executáveis verificados com zero problemas; build gerou 195 páginas mais 404 e sitemap. Auditoria de acesso confirmou 15 aulas públicas, 76 somente como prévia e ausência dos trechos teóricos Premium nos assets públicos. O build emitiu avisos de imports estáticos/dinâmicos compartilhados, sem impedir a geração. Não houve validação com alunos nem inspeção visual no navegador nesta execução; o recurso de navegador exigido pelo fluxo Sites não estava disponível.

## Mapa das aulas

| Nível | ID estável | Tema do suplemento | Referências |
|---|---|---|---|
| 0 | l0-o-que-e-computador | Representação, estado e camadas de abstração | cs50, cs2023 |
| 0 | l0-bits-bytes | Capacidade, convenção e tamanho do texto | unicode, python-docs, cs50 |
| 0 | l0-cpu-memoria | Localidade, custo de acesso e desempenho | cmu-15213, ostep |
| 0 | l0-software-so | Processos, recursos compartilhados e fronteiras | ostep, cmu-15213 |
| 0 | l0-arquivos-terminal | O shell interpreta antes de executar | missing-semester, linux-command-line |
| 0 | l0-internet | Camadas, respostas e diagnóstico de falhas | mdn-http, rfc9110 |
| 0 | l0-ingles-tecnico | Ler condições e explicar um problema com precisão | python-tutorial |
| 1 | l1-algoritmos | Especificação, correção e raciocínio passo a passo | htdp, mit-6042 |
| 1 | l1-variaveis | Atribuição como mudança de estado observável | python-docs, composing-programs |
| 1 | l1-tipos-operadores | Domínio, divisão e condições seguras | python-docs, python-tutorial |
| 1 | l1-entrada-saida | Da representação digitada ao valor validado | python-docs, python-tutorial |
| 1 | l1-condicionais | Partições do domínio e prioridade das regras | python-tutorial, htdp |
| 1 | l1-loops | Rastreamento, progresso e fronteiras de repetição | python-tutorial, mit-6100l |
| 1 | l1-funcoes | Contratos, composição e efeitos observáveis | composing-programs, python-tutorial |
| 1 | l1-decomposicao | Da pergunta ambígua a subproblemas verificáveis | htdp, waterloo-cs135, polya |
| 2 | l2-listas | Nomes, objetos e cópias: entendendo a memória em Python | python-objects-deep, python-copy-deep, python-data-model-deep |
| 2 | l2-por-que-python | Linguagem, implementação e ambiente de execução | python-docs, pyodide, pep8 |
| 2 | l2-dicionarios | Escolher coleções pelo significado dos dados | python-tutorial, python-docs |
| 2 | l2-strings | Transformações de texto e preservação de significado | python-docs, unicode |
| 2 | l2-arquivos | Persistência, formato e leitura confiável | python-docs, python-tutorial |
| 2 | l2-erros-excecoes | Responsabilidade e alcance do tratamento | python-tutorial, python-docs |
| 2 | l2-debugging | Hipóteses concorrentes e o primeiro desvio | python-docs, pytest-docs |
| 2 | l2-modulos | Interfaces de módulos e dependências reproduzíveis | python-packaging, python-tutorial |
| 2 | l2-testes | Oráculos, fronteiras e regressões úteis | pytest-docs, htdp, python-docs |
| 3 | l3-arrays | Contrato de operações e custo da representação | mit-6006, python-time-complexity |
| 3 | l3-crescimento-amortizado | Contabilidade do trabalho e limites de latência | mit-6006, clrs |
| 3 | l3-dois-ponteiros | Regiões já decididas e segurança da escrita no lugar | clrs, mit-6006 |
| 3 | l3-pilhas-filas | O contrato de retirada determina o algoritmo | python-docs, clrs |
| 3 | l3-expressoes-rpn | Árvores de expressão, operandos e validade sintática | clrs, python-docs |
| 3 | l3-filas-prioridade | Prioridade, desempate e manutenção de um top-k | python-docs, clrs |
| 3 | l3-hash | Índice aproximado, identidade lógica e custo real da chave | python-data-model-deep, clrs |
| 3 | l3-enderecamento-aberto | A ausência só é provada no ponto correto da sondagem | clrs, mit-6006 |
| 3 | l3-chaves-hash | Igualdade de domínio antes da função hash | python-data-model-deep, python-docs |
| 3 | l3-arvores | A propriedade de busca vale para subárvores inteiras | mit-6006, clrs |
| 3 | l3-arvores-balanceadas | Rotação preserva ordem; alturas explicam quando usá-la | mit-6006, clrs |
| 3 | l3-heap-binario | Forma completa e ordem parcial trabalham juntas | python-docs, clrs |
| 3 | l3-grafos | Camadas de descoberta e significado de menor caminho | mit-6006, clrs |
| 3 | l3-grafos-dfs | Entrada, saída e a diferença entre visitado e ativo | sedgewick-algs, mit-6006 |
| 3 | l3-union-find | Representantes de grupos e informação que não é preservada | sedgewick-algs, clrs |
| 4 | l4-big-o | Modelo de custo, limites e validade da comparação | mit-6006, mit-algorithms-syllabus |
| 4 | l4-o-omega-teta | Limites assintóticos como afirmações demonstráveis | clrs, mit-6006 |
| 4 | l4-analise-amortizada | Sequências de operações e crédito que não fica negativo | clrs, mit-6006 |
| 4 | l4-busca | Busca como eliminação justificada de possibilidades | mit-6006, clrs |
| 4 | l4-bisect-fronteiras | Fronteiras, intervalos e contagem sem percorrer resultados | v7-algo-bisect, clrs |
| 4 | l4-busca-na-resposta | Da otimização a uma decisão monotônica | mit-6006, clrs |
| 4 | l4-ordenacao | Ordenar exige preservar identidade e definir empates | clrs, sedgewick-algs |
| 4 | l4-quicksort | Partição como contrato e recursão que reduz o problema | clrs, sedgewick-algs |
| 4 | l4-ordenacao-linear | O limite de comparações e o preço de usar as chaves | clrs, mit-6006 |
| 4 | l4-recursao | Hipótese indutiva, medida decrescente e custo oculto | mit-6006, clrs |
| 4 | l4-dividir-conquistar | Recorrências que refletem dividir e combinar | clrs, mit-6006 |
| 4 | l4-backtracking | Busca de soluções e poda que não elimina respostas válidas | clrs, mit-6006 |
| 4 | l4-pd-guloso | Estado suficiente e o risco de decidir sem voltar | clrs, mit-6006 |
| 4 | l4-pd-mochila-lcs | Duas dimensões, reconstrução e ordem de atualização | clrs, mit-6006 |
| 4 | l4-guloso-intervalos | Trocas que preservam a quantidade de compromissos | kleinberg-tardos, clrs |
| 4 | l4-dijkstra | Distâncias provisórias e o momento de torná-las definitivas | clrs, mit-6006 |
| 4 | l4-ordenacao-topologica | Dependências, fontes disponíveis e ciclos que bloqueiam | clrs, sedgewick-algs |
| 4 | l4-arvore-geradora-minima | Cortes, escolhas seguras e objetivos que não se confundem | clrs, sedgewick-algs |
| 5 | l5-classes | Objetos como contratos que preservam regras | python-objects-deep, sicp |
| 5 | l5-heranca-composicao | Contratos de comportamento: quando um objeto pode substituir outro | python-objects-deep, v7-web-protocol |
| 5 | l5-solid-padroes | Separar decisões que mudam: abstrações com custo e propósito | v7-web-protocol, swe-testing-deep |
| 6 | l6-html-css | Documento, apresentação e interação acessível | mdn-semantics-deep, mdn-accessibility-deep |
| 6 | l6-javascript-dom | Eventos, estado e respostas fora de ordem no navegador | v7-web-execution |
| 6 | l6-http-rest | Repetição de requisições: segurança, idempotência e conflitos | v7-web-http |
| 6 | l6-backend-auth | Autenticação, autorização e a fronteira de confiança de cada pedido | owasp-authorization-deep |
| 7 | l7-normalizacao-indices | Invariantes de dados e limites de uma transação | postgres-transactions-deep, postgres-isolation-deep |
| 7 | l7-sql | NULL, agregações e o significado de uma consulta | v7-web-sql-null, v7-web-sql-aggregate |
| 7 | l7-joins | Cardinalidade: prever quantas linhas um JOIN pode produzir | v7-web-sql-joins |
| 7 | l7-nosql-escala | CAP como limite de coordenação, não como cardápio de três opções | v7-web-cap |
| 8 | l8-concorrencia | Intercalação, atomicidade e condições de corrida | ostep, ostep-locks-deep |
| 8 | l8-processos-threads | Concorrência, paralelismo e o que realmente é compartilhado | v7-web-threads, ostep-locks-deep |
| 8 | l8-memoria-arquivos | Endereços virtuais, alcançabilidade e persistência são contratos distintos | v7-web-paging, v7-web-memory |
| 9 | l9-sockets | Fluxo de bytes, mensagens e falhas de comunicação | tcp-rfc9293-deep, python-sockets-deep |
| 9 | l9-camadas-tcp-udp | Entrega de bytes não equivale à conclusão de uma operação | tcp-rfc9293-deep, python-sockets-deep |
| 9 | l9-dns-https | Nome, certificado e canal: o alcance real da proteção HTTPS | v7-web-dns, v7-web-tls |
| 10 | l10-testes-ci | Testes como evidência de um contrato | swe-testing-deep, swe-at-google |
| 10 | l10-git | Histórico como grafo e integração como decisão | v7-applied-git |
| 10 | l10-clean-code | Refatorar preservando contratos observáveis | v7-applied-review, refactoring |
| 10 | l10-arquitetura | Fronteiras, dependências e decisões reversíveis | v7-applied-architecture |
| 11 | l11-fundamentos | Fronteiras de confiança e autorização por recurso | owasp-authorization-deep, owasp-threat-model-deep |
| 11 | l11-owasp | Modelar confiança para escolher a defesa correta | v7-applied-authorization, v7-applied-xss, v7-applied-innerhtml |
| 11 | l11-criptografia | Sigilo, autenticidade e repetição são problemas distintos | v7-applied-aead, v7-applied-crypto |
| 12 | l12-deploy-observabilidade | Confiabilidade observável e recuperação | sre-slo-deep, sre-data-integrity-deep |
| 12 | l12-linux-shell | Fluxos, argumentos e sinais de falha no shell | v7-applied-bash-pipes, v7-applied-bash-redirections |
| 12 | l12-docker | Imagem, processo e persistência: três ciclos de vida | v7-applied-docker-security, v7-applied-docker-volumes |
| 13 | l13-ml-fundamentos | Generalização, dados separados e métricas úteis | ml-split-deep, ml-metrics-deep |
| 13 | l13-redes-neurais | Da previsão ao gradiente: o que cada etapa calcula | v7-applied-neural, v7-applied-backprop |
| 13 | l13-ia-generativa | Texto plausível, evidência e verificação independente | v7-applied-llm |
| 14 | l14-logica-conjuntos | Implicação, quantificadores e contraexemplos | mit-6042, mit-math-2015-deep |
| 14 | l14-combinatoria-probabilidade | Contagem, condicionamento e a importância do denominador | v7-applied-probability |
| 14 | l14-discreta | Provas de algoritmos: hipótese, passo e medida de progresso | mit-6042, v7-applied-discrete |
| 14 | l14-algebra-calculo | Dimensões, sensibilidades e passos de otimização | v7-applied-gradient |

## Bibliografia utilizada nos novos suplementos

Documentação primária e referências acadêmicas; os exemplos foram redigidos para o Alicerce. A lista reúne fontes específicas e referências de escopo existentes, não uma declaração de leitura integral de todos os livros/cursos.

- **unicode** — [The Unicode Standard](https://www.unicode.org/standard/standard.html), Unicode Consortium.
- **python-docs** — [Documentação oficial do Python](https://docs.python.org/3/), Python Software Foundation.
- **cs50** — [CS50's Introduction to Computer Science](https://cs50.harvard.edu/x/), Harvard University.
- **cmu-15213** — [15-213: Introduction to Computer Systems](https://www.cs.cmu.edu/~213/), Carnegie Mellon University.
- **ostep** — [Operating Systems: Three Easy Pieces](https://pages.cs.wisc.edu/~remzi/OSTEP/), Remzi & Andrea Arpaci-Dusseau (Univ. of Wisconsin).
- **missing-semester** — [The Missing Semester of Your CS Education](https://missing.csail.mit.edu/), MIT CSAIL.
- **linux-command-line** — [The Linux Command Line](https://linuxcommand.org/tlcl.php), William Shotts.
- **mdn-http** — [HTTP (MDN Web Docs)](https://developer.mozilla.org/en-US/docs/Web/HTTP), Mozilla.
- **rfc9110** — [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110), IETF.
- **python-tutorial** — [The Python Tutorial](https://docs.python.org/3/tutorial/), Python Software Foundation.
- **composing-programs** — [Composing Programs](https://www.composingprograms.com/), John DeNero (UC Berkeley).
- **htdp** — [How to Design Programs](https://htdp.org/), Felleisen, Findler, Flatt, Krishnamurthi.
- **mit-6100l** — [6.100L Introduction to CS and Programming Using Python](https://ocw.mit.edu/courses/6-100l-introduction-to-cs-and-programming-using-python-fall-2022/), MIT OpenCourseWare.
- **waterloo-cs135** — [CS 135: Designing Functional Programs](https://student.cs.uwaterloo.ca/~cs135/), University of Waterloo.
- **polya** — [How to Solve It](https://press.princeton.edu/books/paperback/9780691164076/how-to-solve-it), George Pólya (Princeton University Press).
- **pyodide** — [Pyodide](https://pyodide.org/), Pyodide project.
- **pep8** — [PEP 8 – Style Guide for Python Code](https://peps.python.org/pep-0008/), Python Software Foundation.
- **pytest-docs** — [pytest documentation](https://docs.pytest.org/), pytest-dev.
- **python-packaging** — [Python Packaging User Guide](https://packaging.python.org/), Python Packaging Authority.
- **mit-6006** — [6.006 Introduction to Algorithms](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/), MIT OpenCourseWare.
- **clrs** — [Introduction to Algorithms (4th ed.)](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/), Cormen, Leiserson, Rivest, Stein (MIT Press).
- **python-data-model-deep** — [Python: Data Model](https://docs.python.org/3/reference/datamodel.html), Python Software Foundation.
- **sedgewick-algs** — [Algorithms, 4th Edition](https://algs4.cs.princeton.edu/), Sedgewick & Wayne (Princeton University).
- **v7-algo-bisect** — [bisect — Array bisection algorithm](https://docs.python.org/3/library/bisect.html), Python Software Foundation.
- **kleinberg-tardos** — [Algorithm Design](https://www.pearson.com/en-us/subject-catalog/p/algorithm-design/P200000003259), Kleinberg & Tardos (Cornell / Pearson).
- **python-objects-deep** — [Python Tutorial: Classes, Names and Objects](https://docs.python.org/3/tutorial/classes.html), Python Software Foundation.
- **v7-web-protocol** — [typing: Protocol](https://docs.python.org/3/library/typing.html#typing.Protocol), Python Software Foundation.
- **swe-testing-deep** — [Software Engineering at Google — Testing Overview](https://abseil.io/resources/swe-book/html/ch11.html), Google / Titus Winters, Tom Manshreck e Hyrum Wright.
- **v7-web-execution** — [JavaScript execution model](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model), MDN Web Docs.
- **v7-web-http** — [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html), IETF.
- **owasp-authorization-deep** — [Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html), OWASP Foundation.
- **v7-web-sql-null** — [Comparison Functions and Operators](https://www.postgresql.org/docs/current/functions-comparison.html), PostgreSQL Global Development Group.
- **v7-web-sql-aggregate** — [Aggregate Functions](https://www.postgresql.org/docs/current/functions-aggregate.html), PostgreSQL Global Development Group.
- **v7-web-sql-joins** — [Table Expressions](https://www.postgresql.org/docs/current/queries-table-expressions.html), PostgreSQL Global Development Group.
- **v7-web-cap** — [Perspectives on the CAP Theorem](https://groups.csail.mit.edu/tds/papers/Gilbert/Brewer2.pdf), Seth Gilbert e Nancy Lynch / NUS e MIT.
- **v7-web-threads** — [Operating Systems: Three Easy Pieces — Concurrency: An Introduction](https://pages.cs.wisc.edu/~remzi/OSTEP/threads-intro.pdf), Remzi e Andrea Arpaci-Dusseau / University of Wisconsin-Madison.
- **ostep-locks-deep** — [Operating Systems: Three Easy Pieces — Locks](https://pages.cs.wisc.edu/~remzi/OSTEP/threads-locks.pdf), Remzi e Andrea Arpaci-Dusseau / University of Wisconsin-Madison.
- **v7-web-paging** — [Operating Systems: Three Easy Pieces — Paging: Introduction](https://pages.cs.wisc.edu/~remzi/OSTEP/vm-paging.pdf), Remzi e Andrea Arpaci-Dusseau / University of Wisconsin-Madison.
- **v7-web-memory** — [Memory management](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Memory_management), MDN Web Docs.
- **tcp-rfc9293-deep** — [RFC 9293: Transmission Control Protocol](https://www.rfc-editor.org/rfc/rfc9293.html), IETF.
- **python-sockets-deep** — [Socket Programming HOWTO](https://docs.python.org/3/howto/sockets.html), Python Software Foundation.
- **v7-web-dns** — [RFC 1034: Domain Names — Concepts and Facilities](https://www.rfc-editor.org/rfc/rfc1034.html), IETF.
- **v7-web-tls** — [RFC 8446: The Transport Layer Security (TLS) Protocol Version 1.3](https://www.rfc-editor.org/rfc/rfc8446.html), IETF.
- **v7-applied-git** — [Pro Git — Basic Branching and Merging](https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging), Scott Chacon e Ben Straub / Git.
- **v7-applied-review** — [Software Engineering at Google — Code Review](https://abseil.io/resources/swe-book/html/ch09.html), Google / Tom Manshreck e Caitlin Sadowski.
- **refactoring** — [Refactoring (2nd ed.)](https://martinfowler.com/books/refactoring.html), Martin Fowler.
- **v7-applied-architecture** — [Monolith First](https://martinfowler.com/bliki/MonolithFirst.html), Martin Fowler.
- **v7-applied-authorization** — [Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html), OWASP Foundation.
- **v7-applied-xss** — [Cross Site Scripting Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html), OWASP Foundation.
- **v7-applied-innerhtml** — [Element: innerHTML property](https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML), MDN Web Docs.
- **v7-applied-aead** — [RFC 5116 — Authenticated Encryption](https://www.rfc-editor.org/rfc/rfc5116), IETF / RFC Editor.
- **v7-applied-crypto** — [Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html), OWASP Foundation.
- **v7-applied-bash-pipes** — [Bash Reference Manual — Pipelines](https://www.gnu.org/software/bash/manual/html_node/Pipelines.html), GNU Project.
- **v7-applied-bash-redirections** — [Bash Reference Manual — Redirections](https://www.gnu.org/software/bash/manual/html_node/Redirections.html), GNU Project.
- **v7-applied-docker-security** — [Docker Engine Security](https://docs.docker.com/engine/security/), Docker.
- **v7-applied-docker-volumes** — [Docker Engine — Volumes](https://docs.docker.com/engine/storage/volumes/), Docker.
- **v7-applied-neural** — [Machine Learning Crash Course — Neural Networks](https://developers.google.com/machine-learning/crash-course/neural-networks), Google for Developers.
- **v7-applied-backprop** — [Neural Networks — Training Using Backpropagation](https://developers.google.com/machine-learning/crash-course/neural-networks/backpropagation), Google for Developers.
- **v7-applied-llm** — [Machine Learning Crash Course — Large Language Models](https://developers.google.com/machine-learning/crash-course/llm), Google for Developers.
- **v7-applied-probability** — [6.042J — Conditional Probability](https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-fall-2010/resources/lecture-19-conditional-probability/), MIT OpenCourseWare.
- **mit-6042** — [6.042J Mathematics for Computer Science](https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-fall-2010/), MIT OpenCourseWare.
- **v7-applied-discrete** — [6.1200J — Mathematics for Computer Science](https://ocw.mit.edu/courses/6-1200j-mathematics-for-computer-science-spring-2024/), MIT OpenCourseWare.
- **v7-applied-gradient** — [The Gradient and Directional Derivatives](https://www.ocw.mit.edu/ans7870/18/18.013a/textbook/HTML/chapter06/section06.html), MIT OpenCourseWare.

## Complemento de 21/10/2026: as 20 lições de m7-1 a m9-3

No repositório privado, em `src/aprofundamento/dados-sistemas-redes.ts`, com os mesmos campos dos outros suplementos (cerca de 13.000 palavras nos nove campos editoriais). Cada um parte do que a lição já ensina e acrescenta um ângulo que ela não cobre, com exemplo original e números conferidos à mão:

| Lição | Aprofundamento |
|---|---|
| l7-restricoes-dml | Onde a regra mora: o alcance de cada restrição |
| l7-sql-no-python | Código e dados em canais separados, e a transação que a conexão guarda |
| l7-null-tres-valores | O que um NULL quer dizer: desconhecido, inaplicável ou ainda não aconteceu |
| l7-subconsultas | Algum, nenhum e todos: quantificadores escritos em SQL |
| l7-isolamento-concorrencia | Regras que atravessam linhas: por que o write skew escapa do instantâneo |
| l7-otimizacao-consultas | Custo de uma consulta: páginas lidas e estimativas do planejador |
| l7-documentos-chave-valor | Modelar pelo acesso é escolher quais perguntas ficam baratas |
| l7-replicacao-consistencia | Garantias de sessão: consistência descrita pelo que a pessoa vê |
| l8-fork-exec-wait | O que atravessa fork e exec: descritores, deslocamentos e pontas de pipe |
| l8-prioridades-mlfq | Prioridade sem recurso livre não adianta: inversão de prioridade |
| l8-ponteiros-heap-c | Tempo de vida e posse: quem é responsável por cada bloco |
| l8-inodes-journaling | Durabilidade é um protocolo: write, fsync e rename |
| l8-semaforos-condicao | Raciocinar com invariantes: o que vale sempre que o lock está livre |
| l8-async-threads-processos | Contrapressão: concorrência com limite para não afogar o sistema |
| l9-ip-subredes-nat | Diagnosticar de dentro para fora: uma pergunta por camada |
| l9-tcp-janelas-congestionamento | Latência e vazão: por que um link rápido pode parecer lento |
| l9-http-versoes | Onde uma mensagem acaba é uma questão de segurança |
| l9-tls-certificados | Operar certificados: chave privada, validade e cadeia completa |
| l9-websockets | Conexão não é sessão: retomar sem perder nem duplicar mensagens |
| l9-proxies-balanceamento | Capacidade e cauda: por que 70% de uso já pede atenção |

As fontes são referências que já estavam em `references.ts`; nenhuma referência nova foi acrescentada, porque o ambiente desta entrega não tinha acesso à rede para conferir endereços. Nenhum texto foi revisado por outra pessoa nem testado com autodidatas: é cobertura editorial, não eficácia pedagógica medida. Enquanto os níveis 2 a 14 estão abertos na transição, o site mostra a todos, inclusive a quem tem Premium, as aulas como foram publicadas, sem esse aprofundamento. Ele aparece quando esses níveis fecharem, entregue pelo servidor só a quem tem Premium ativo.
