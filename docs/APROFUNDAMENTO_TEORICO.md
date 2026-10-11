# Aprofundamento teórico das trilhas — pesquisa e entrega v6

Data editorial: 10/10/2026, America/Fortaleza. Base: v5, commit 295823d286fecbc656fec930af62e15846632c71.

## Objetivo e alcance

Pedido de Arthur: pesquisar para tornar as trilhas mais explicativas e teóricas, mantendo o foco em autodidatas.

A entrega acrescenta **15 aprofundamentos originais, um em uma aula selecionada de cada nível**, com aproximadamente 7 mil palavras no conjunto dos textos de autoria. Não é uma reescrita integral das 91 aulas. Permanecem 91 lições, 364 exercícios avaliados e 357 cartões; as novas reflexões abertas não recebem nota nem alteram essas contagens.

Cada aprofundamento inclui pré-requisitos, objetivo, explicação em camadas, exemplo resolvido, equívoco comum, pergunta de autoexplicação, retorno na revisão, transferência e fontes. Cinco exemplos têm tabelas de rastreamento/comparação. A estimativa de cada aula ampliada aumenta em 12 minutos: é uma estimativa editorial, não tempo medido com alunos.

## Pesquisa: como as fontes foram usadas

- **IES/What Works Clearinghouse:** recomenda espaçamento, ligação entre concreto e abstrato, alternância de exemplos resolvidos e prática, além de perguntas explicativas. Aplicação: pedir uma justificativa antes de mostrar o retorno na revisão. O guia distingue níveis de evidência; não demonstra por si só eficácia no Alicerce.
- **Harvard CS50:** referência de fundamentos, abstração e resolução de problemas além da sintaxe.
- **Helsinki MOOC:** referência de progressão entre introdução e aprofundamento com prática. Sua organização não foi copiada e o Alicerce não equivale aos créditos desses cursos.
- **MIT 6.006 e 6.042J:** referência para ligar programação a análise e raciocínio matemático. Aplicação editorial: declarar hipóteses, contratos, limites e contraexemplos.
- **Documentação Python, MDN, PostgreSQL, RFC TCP, OSTEP, OWASP e Google:** verificação de conceitos específicos e leitura adicional indicada junto às aulas.
- **CS2023:** orientação de escopo curricular. Não foi realizada uma auditoria completa de cada competência nem obtida qualquer certificação ou equivalência acadêmica.

A pesquisa usa fontes primárias institucionais, livros dos próprios autores e documentação dos mantenedores. Não houve cópia de aulas, exercícios ou diagramas de cursos. Referenciar um curso não significa ter revisado todo o seu conteúdo. Páginas com endereço /current ou /3 podem mudar; reconferir ao atualizar exemplos dependentes de versão.

## Diagnóstico do currículo

Estruturas e algoritmos concentram 33 aulas; vários níveis posteriores têm apenas 3 ou 4. Contar aulas não mede qualidade, mas revela onde assuntos amplos estão comprimidos. O aprofundamento implementado ajuda em pontos selecionados e não elimina a necessidade de desdobrar web, sistemas, cloud, IA e matemática.

Outro problema é a dependência pedagógica: matemática aparece como nível 14, mas lógica, contagem e funções são úteis muito antes. Não mudamos a ordem ou os pré-requisitos comerciais nesta entrega. Os novos textos indicam a base necessária; um próximo trabalho deve inserir apoios matemáticos no ponto de uso, sem obrigar um iniciante a terminar matemática avançada antes da lógica básica.

## O que mudou em cada nível

| Nível | Aula ampliada | Foco entregue |
|---|---|---|
| 0 | `l0-o-que-e-computador` | Representação, estado e camadas de abstração |
| 1 | `l1-algoritmos` | Especificação, correção e raciocínio passo a passo |
| 2 | `l2-listas` | Nomes, objetos e cópias: entendendo a memória em Python |
| 3 | `l3-arrays` | Contrato de operações e custo da representação |
| 4 | `l4-big-o` | Modelo de custo, limites e validade da comparação |
| 5 | `l5-classes` | Objetos como contratos que preservam regras |
| 6 | `l6-html-css` | Documento, apresentação e interação acessível |
| 7 | `l7-normalizacao-indices` | Invariantes de dados e limites de uma transação |
| 8 | `l8-concorrencia` | Intercalação, atomicidade e condições de corrida |
| 9 | `l9-sockets` | Fluxo de bytes, mensagens e falhas de comunicação |
| 10 | `l10-testes-ci` | Testes como evidência de um contrato |
| 11 | `l11-fundamentos` | Fronteiras de confiança e autorização por recurso |
| 12 | `l12-deploy-observabilidade` | Confiabilidade observável e recuperação |
| 13 | `l13-ml-fundamentos` | Generalização, dados separados e métricas úteis |
| 14 | `l14-logica-conjuntos` | Implicação, quantificadores e contraexemplos |

## Padrão editorial para continuar as demais aulas

1. Definir o problema e conhecimentos prévios.
2. Apresentar uma intuição concreta e nomear seu limite.
3. Explicitar definição, hipótese, unidade ou contrato.
4. Resolver um exemplo original, justificando passos intermediários.
5. Mostrar um erro plausível e por que falha.
6. Pedir previsão ou explicação antes da execução.
7. Exigir transferência para um problema diferente.
8. Fornecer retorno específico e sugerir recuperação posterior.
9. Indicar fontes precisas e reconhecer variações entre tecnologias.
10. Rever comprimento, carga cognitiva e tempo com pessoas reais.

Não transformar cada aula numa lista de definições nem inflar tempo de leitura para aparentar profundidade. Para o iniciante, uma prova informal pequena e explicada pode ser mais útil que notação sem preparação.

## Plano de expansão por nível — ainda pendente

### Nível 0

**Objetivo verificável desta entrega:** Explicar como o mesmo padrão de bits pode ganhar significados diferentes e separar entrada, processamento e saída.

**Próximo aprofundamento recomendado:** Representação de texto/imagem, unidades e hierarquia de memória com exemplos de conversão; explicar limites do modelo simplificado de CPU.

**Critério de revisão:** o aluno deve explicar um caso novo, mencionar a hipótese usada e reconhecer um limite do modelo, sem apenas repetir o exemplo.

### Nível 1

**Objetivo verificável desta entrega:** Escrever um contrato simples, rastrear estados e justificar por que um procedimento termina com a resposta esperada.

**Próximo aprofundamento recomendado:** Mais rastreamentos de condição, laços, escopo e decomposição; contrapor exemplo, contraexemplo e justificativa sem pressupor formalismo matemático.

**Critério de revisão:** o aluno deve explicar um caso novo, mencionar a hipótese usada e reconhecer um limite do modelo, sem apenas repetir o exemplo.

### Nível 2

**Objetivo verificável desta entrega:** Distinguir reatribuição de mutação e prever o efeito de compartilhar uma lista entre dois nomes.

**Próximo aprofundamento recomendado:** Mais exemplos de strings/Unicode, arquivos, exceções e testes; aprofundar cópia, recursos e contratos de funções.

**Critério de revisão:** o aluno deve explicar um caso novo, mencionar a hipótese usada e reconhecer um limite do modelo, sem apenas repetir o exemplo.

### Nível 3

**Objetivo verificável desta entrega:** Escolher uma representação a partir das operações necessárias, explicitando custos e hipóteses.

**Próximo aprofundamento recomendado:** Comparar estruturas pelo conjunto de operações; explicitar invariantes de hash, árvores e grafos; avaliar espaço além de tempo.

**Critério de revisão:** o aluno deve explicar um caso novo, mencionar a hipótese usada e reconhecer um limite do modelo, sem apenas repetir o exemplo.

### Nível 4

**Objetivo verificável desta entrega:** Relacionar tamanho de entrada a número de operações sem confundir notação assintótica, tempo medido e caso analisado.

**Próximo aprofundamento recomendado:** Provas de busca binária, invariantes de ordenação, recorrências e justificativas de algoritmos gulosos; incluir casos onde uma técnica não se aplica.

**Critério de revisão:** o aluno deve explicar um caso novo, mencionar a hipótese usada e reconhecer um limite do modelo, sem apenas repetir o exemplo.

### Nível 5

**Objetivo verificável desta entrega:** Definir invariantes e avaliar se uma interface impede transições inválidas de estado.

**Próximo aprofundamento recomendado:** Separar modelagem, encapsulamento, composição e substituição; mais contraexemplos de herança inadequada e testes de contrato.

**Critério de revisão:** o aluno deve explicar um caso novo, mencionar a hipótese usada e reconhecer um limite do modelo, sem apenas repetir o exemplo.

### Nível 6

**Objetivo verificável desta entrega:** Justificar uma escolha de elemento HTML a partir do significado e do comportamento esperado, não apenas da aparência.

**Próximo aprofundamento recomendado:** Desdobrar HTML, CSS, layout, DOM, assíncrono, HTTP e sessão; quatro aulas ainda não cobrem cada tema com profundidade uniforme.

**Critério de revisão:** o aluno deve explicar um caso novo, mencionar a hipótese usada e reconhecer um limite do modelo, sem apenas repetir o exemplo.

### Nível 7

**Objetivo verificável desta entrega:** Distinguir atomicidade, regras de negócio e proteção contra concorrência em uma mudança de dados.

**Próximo aprofundamento recomendado:** Desdobrar normalização, índices, planos de consulta, transações e isolamento; explicitar divergências entre SQLite e PostgreSQL.

**Critério de revisão:** o aluno deve explicar um caso novo, mencionar a hipótese usada e reconhecer um limite do modelo, sem apenas repetir o exemplo.

### Nível 8

**Objetivo verificável desta entrega:** Construir uma intercalação que produz resultado incorreto e identificar a região que precisa de coordenação.

**Próximo aprofundamento recomendado:** Mais rastreamentos de escalonamento, tradução de endereços, memória virtual e persistência; complementar mutex com deadlock e condições.

**Critério de revisão:** o aluno deve explicar um caso novo, mencionar a hipótese usada e reconhecer um limite do modelo, sem apenas repetir o exemplo.

### Nível 9

**Objetivo verificável desta entrega:** Explicar por que uma aplicação precisa delimitar mensagens e lidar com leituras parciais, mesmo usando TCP.

**Próximo aprofundamento recomendado:** Separar endereçamento, roteamento, DNS, TCP/UDP, TLS e protocolo de aplicação; adicionar análise de falhas por camada.

**Critério de revisão:** o aluno deve explicar um caso novo, mencionar a hipótese usada e reconhecer um limite do modelo, sem apenas repetir o exemplo.

### Nível 10

**Objetivo verificável desta entrega:** Projetar testes a partir de comportamentos e riscos, distinguindo cobertura de execução de suficiência da verificação.

**Próximo aprofundamento recomendado:** Mais exemplos de requisitos, decisões arquiteturais, revisão, testes de integração e mudanças compatíveis; não reduzir engenharia a ferramentas.

**Critério de revisão:** o aluno deve explicar um caso novo, mencionar a hipótese usada e reconhecer um limite do modelo, sem apenas repetir o exemplo.

### Nível 11

**Objetivo verificável desta entrega:** Descrever uma decisão de acesso usando usuário, ação e recurso, sem confiar em declarações do navegador.

**Próximo aprofundamento recomendado:** Aprofundar modelagem de ameaças, sessão, autorização, tratamento de segredos e criptografia com limites claros; prática apenas em laboratório autorizado.

**Critério de revisão:** o aluno deve explicar um caso novo, mencionar a hipótese usada e reconhecer um limite do modelo, sem apenas repetir o exemplo.

### Nível 12

**Objetivo verificável desta entrega:** Definir um indicador verificável e separar execução do processo, sucesso do usuário e recuperação após falha.

**Próximo aprofundamento recomendado:** Separar processo, container, imagem, rede, persistência, entrega e observabilidade; incluir ensaio de recuperação e cálculo de custo operacional.

**Critério de revisão:** o aluno deve explicar um caso novo, mencionar a hipótese usada e reconhecer um limite do modelo, sem apenas repetir o exemplo.

### Nível 13

**Objetivo verificável desta entrega:** Distinguir ajuste, seleção e avaliação de um modelo e interpretar o efeito de uma classe rara.

**Próximo aprofundamento recomendado:** Aprofundar probabilidade, perda, otimização, regularização, avaliação e vieses; separar ML clássico, redes neurais e uso de LLMs.

**Critério de revisão:** o aluno deve explicar um caso novo, mencionar a hipótese usada e reconhecer um limite do modelo, sem apenas repetir o exemplo.

### Nível 14

**Objetivo verificável desta entrega:** Traduzir regras simples para lógica, distinguir implicação de equivalência e usar um contraexemplo para refutar uma afirmação universal.

**Próximo aprofundamento recomendado:** Distribuir apoios de lógica, somatórios, logaritmos, probabilidade e álgebra antes das aulas que os usam; aprofundar provas e contraexemplos.

**Critério de revisão:** o aluno deve explicar um caso novo, mencionar a hipótese usada e reconhecer um limite do modelo, sem apenas repetir o exemplo.


## Integração técnica e acesso

- `packages/content/src/theory-expansions.ts`: textos e aplicação imutável sobre o currículo.
- `packages/content/src/curriculum.ts`: aplica os aprofundamentos antes de gerar os índices.
- `packages/content/src/types.ts`: metadado público `theoryTitle`; corpo permanece em sections.
- `packages/content/src/references.ts`: fontes específicas e retirada de alegações históricas excessivas de cobertura/verificação.
- `apps/web/src/pages/Nivel.tsx`: atalho para a explicação selecionada, com indicação Premium quando aplicável.
- `apps/web/src/pages/Licao.tsx`: orientação sobre onde ler, praticar e conferir a reflexão.
- `scripts/verify-access-build.ts`: inclui detecção do módulo de teoria em sourcemaps e busca de trechos dos exemplos pagos nos artefatos públicos.

Os títulos dos aprofundamentos são públicos; os corpos seguem a política existente. Níveis 0–1 gratuitos. Níveis 2–14 continuam Premium. A publicação estática não ativa assinaturas: os 13 aprofundamentos pagos ficam preparados para entrega autenticada no servidor e disponíveis para revisão no fonte.

Não foram alterados IDs, cartões, exercícios, desbloqueios nem cotas do tutor. A base do tutor continua com seu limite de texto por lição; não se deve presumir que todos os parágrafos novos sejam recuperados por ele. Melhorar indexação e avaliar recuperação é um trabalho separado.

## Critérios para a próxima revisão com alunos

Escolher duas aulas iniciais e duas avançadas. Observar se a pessoa identifica pré-requisitos, explica a distinção central, resolve uma variação e recorda a ideia após um intervalo. Comparar erros antes/depois e revisar os textos com base nas dificuldades. Satisfação e tempo na página não substituem uma tarefa de transferência.

As perguntas abertas têm retorno para autocorreção; não há avaliação automática de redação, nota de domínio ou certificado. Não afirmar ganho de aprendizagem antes desse estudo.

## Verificação técnica

- TypeScript aprovado.
- 129 testes aprovados em 18 arquivos. Uma primeira execução identificou duas referências sem vínculo; os vínculos foram corrigidos e a suíte passou.
- Build concluído: 195 páginas, além de 404 e sitemap.
- Auditoria de acesso aprovada: 15 lições públicas, 76 prévias; cartões e índice do tutor filtrados. Exemplos teóricos pagos não encontrados nos artefatos públicos verificados.
- Comparação estrutural confirmou preservação dos IDs de lição, exercícios e cartões na aplicação dos aprofundamentos.
- Não houve nova execução das 214 soluções do currículo: nenhum exercício ou solução foi alterado nesta ampliação.
- Não foi realizado QA visual em navegador: a capacidade de controle de navegador requerida pelo fluxo Sites não está disponível nesta sessão. Não há validação pedagógica com alunos reais.

## Referências específicas consultadas

- **Organizing Instruction and Study to Improve Student Learning** — IES / What Works Clearinghouse. https://ies.ed.gov/ncee/wwc/PracticeGuide/1
  Uso: Orientou alternância entre exemplo resolvido, autoexplicação e retomada. Evidência geral de aprendizagem; eficácia no Alicerce ainda precisa ser medida.
- **Python Programming MOOC 2026** — University of Helsinki. https://programming-26.mooc.fi/
  Uso: Referência de organização em introdução e aprofundamento com prática. Não implica equivalência acadêmica.
- **Python Tutorial: Classes, Names and Objects** — Python Software Foundation. https://docs.python.org/3/tutorial/classes.html
  Uso: Nomes associados a objetos, estado de instância e limites de privacidade por convenção.
- **Python: Shallow and Deep Copy** — Python Software Foundation. https://docs.python.org/3/library/copy.html
  Uso: Distinção entre atribuição, cópia rasa e objetos internos compartilhados.
- **Python: Data Model** — Python Software Foundation. https://docs.python.org/3/reference/datamodel.html
  Uso: Identidade, valor e mutabilidade; exemplos escritos para o Alicerce.
- **6.006: Syllabus** — MIT OpenCourseWare. https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/pages/syllabus/
  Uso: Relação entre correção, modelos de custo e algoritmos. Não foi copiado material de aula.
- **Basic HTML Syntax** — MDN Web Docs. https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content/Basic_HTML_syntax
  Uso: Estrutura do documento e escolha de elementos com significado.
- **What Is Accessibility?** — MDN Web Docs. https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Accessibility/What_is_accessibility
  Uso: Acesso por diferentes formas de interação; separação entre aparência e usabilidade.
- **PostgreSQL: Transactions** — PostgreSQL Global Development Group. https://www.postgresql.org/docs/current/tutorial-transactions.html
  Uso: Atomicidade de mudanças relacionadas; exemplo de empréstimo é original.
- **PostgreSQL: Transaction Isolation** — PostgreSQL Global Development Group. https://www.postgresql.org/docs/current/transaction-iso.html
  Uso: Concorrência, níveis de isolamento e necessidade de tratar conflitos conforme o SGBD.
- **Operating Systems: Three Easy Pieces — Locks** — Remzi e Andrea Arpaci-Dusseau / University of Wisconsin-Madison. https://pages.cs.wisc.edu/~remzi/OSTEP/threads-locks.pdf
  Uso: Operações compostas, exclusão mútua e interpretação de intercalações.
- **RFC 9293: Transmission Control Protocol** — IETF. https://www.rfc-editor.org/rfc/rfc9293.html
  Uso: Fluxo ordenado de bytes não define fronteiras de mensagens da aplicação.
- **Socket Programming HOWTO** — Python Software Foundation. https://docs.python.org/3/howto/sockets.html
  Uso: Leituras parciais, enquadramento de mensagens e fechamento de conexão.
- **Software Engineering at Google — Testing Overview** — Google / Titus Winters, Tom Manshreck e Hyrum Wright. https://abseil.io/resources/swe-book/html/ch11.html
  Uso: Testes de comportamento e limites da evidência fornecida por uma suíte.
- **Authorization Cheat Sheet** — OWASP Foundation. https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
  Uso: Autorização por pedido e recurso, negação por padrão e menor privilégio.
- **Threat Modeling Cheat Sheet** — OWASP Foundation. https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html
  Uso: Ativos, ameaças e fronteiras de confiança.
- **Site Reliability Engineering — Service Level Objectives** — Google. https://sre.google/sre-book/service-level-objectives/
  Uso: Indicadores, metas e janelas de medição; percentuais do exemplo são hipotéticos.
- **Site Reliability Engineering — Data Integrity** — Google. https://sre.google/sre-book/data-integrity/
  Uso: Recuperação verificável e integridade de dados além da existência de um backup.
- **Datasets: Dividing the Original Dataset** — Google Machine Learning Crash Course. https://developers.google.com/machine-learning/crash-course/overfitting/dividing-datasets
  Uso: Separação de ajuste, seleção e avaliação; atenção à contaminação do teste.
- **Classification: Accuracy, Recall, Precision** — Google Machine Learning Crash Course. https://developers.google.com/machine-learning/crash-course/classification/accuracy-precision-recall
  Uso: Métricas por classe e seus denominadores; matriz de 100 mensagens é original.
- **6.042J Mathematics for Computer Science (2015)** — MIT OpenCourseWare. https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-spring-2015/
  Uso: Definições, provas e modelos discretos como apoio ao raciocínio sobre programas.
- Harvard CS50: https://cs50.harvard.edu/x/
- MIT 6.006: https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/
- How to Design Programs, parte I: https://htdp.org/2024-11-6/Book/part_one.html
- OSTEP: https://pages.cs.wisc.edu/~remzi/OSTEP/
- Python TimeComplexity: https://wiki.python.org/moin/TimeComplexity
- CS2023: https://csed.acm.org/

## Instrução para continuidade com Claude

Preservar a política freemium e integrar os arquivos antes de expandir. Revisar as 76 aulas que não receberam aprofundamento nesta etapa, priorizando a sequência gratuita e a primeira continuação Python. Para cada ampliação, conferir referência, pressupostos, exemplo, contraexemplo e atividade de transferência. Não marcar o nível inteiro como pedagogicamente validado apenas porque uma aula ganhou texto. Repetir a auditoria de acesso depois de qualquer mudança no caminho de importação dos conteúdos.

