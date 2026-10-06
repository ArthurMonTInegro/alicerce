# Pesquisa

<!-- gerado por scripts/gen-docs.ts a partir de packages/content/src/research.ts e references.ts; não edite à mão -->

A pesquisa serviu para decidir **escopo, sequência e método**. Nenhum curso foi copiado: de cada fonte registramos o que ela ensina e a decisão concreta que tomamos. Todas as URLs foram abertas durante a pesquisa. Quando só encontramos uma fonte secundária confiável, a nota diz isso.

## Currículos nacionais

| Onde | Fonte | O que observamos | Decisão |
|---|---|---|---|
| Reino Unido (Inglaterra) | [National curriculum in England: computing programmes of study](https://www.gov.uk/government/publications/national-curriculum-in-england-computing-programmes-of-study) | Computação é obrigatória dos 5 aos 16 anos, com três eixos: ciência da computação, tecnologia da informação e letramento digital. Algoritmos e depuração aparecem antes de qualquer linguagem textual. | O Nível 0 começa por representação, algoritmos e depuração mental, e só depois o Nível 2 introduz sintaxe. |
| Reino Unido (NCCE) | [Pedagogy Quick Read: PRIMM](https://static.teachcomputing.org/pedagogy/QR11-PRIMM.pdf) | O centro nacional de ensino de computação recomenda Predict, Run, Investigate, Modify, Make: ler e prever código antes de escrevê-lo. | Exercícios do tipo "prever a saída" vêm antes dos de escrever código em cada lição. |
| Alemanha | [Bildungsstandards Informatik (Gesellschaft für Informatik)](https://dl.gi.de/items/49972e1c-f954-4e4b-a60b-1dc924d730cf/full) | Os padrões da sociedade alemã de informática separam áreas de conteúdo (dados, algoritmos, linguagens, sistemas, sociedade) de áreas de processo (modelar, argumentar, comunicar). | Cada lição tem objetivos de conteúdo e também de processo (explicar, justificar, modelar), cobrados nos exercícios abertos e nas entrevistas. |
| França | [Programme de numérique et sciences informatiques de première générale (eduscol)](https://eduscol.education.fr/document/30007/download) | A especialidade NSI do ensino médio francês ensina Python, representação de dados, arquitetura, redes e algoritmos em um mesmo ano, deixando recursão e bancos de dados para o ano seguinte. | Confirmou Python como primeira linguagem e a ordem representação → algoritmos → estruturas → recursão → bancos de dados. |
| Austrália | [Digital Technologies Hub (currículo australiano de tecnologias digitais)](https://www.digitaltechnologieshub.edu.au/) | O currículo australiano trata pensamento computacional e sistemas digitais como progressão contínua da escola básica ao ensino médio. | A árvore de habilidades é uma progressão única, sem "trilhas separadas" para iniciante e avançado: o diagnóstico só escolhe o ponto de entrada. |
| Singapura | [GCE O-Level Computing Syllabus 7155 (SEAB)](https://www.seab.gov.sg/files/O%20Lvl%20Syllabus%20Sch%20Cddts/2025/7155_y25_sy.pdf) | O exame nacional cobra programação em Python, testes, lógica booleana, redes e ética, com ênfase em projetar e testar soluções. | Todo exercício de código tem testes automáticos visíveis, e o Nível 1 inclui portas lógicas e tabelas-verdade. |
| Coreia do Sul | [Software education to be compulsory in schools in Korea (British Council)](https://opportunities-insight.britishcouncil.org/short-articles/news/software-education-be-compulsory-schools-korea) | Relato secundário (não encontramos o documento oficial do ministério em inglês): educação em software tornou-se obrigatória no ensino fundamental e médio. | Reforçou o público-alvo: a plataforma precisa funcionar para quem nunca programou, a partir do Nível 0. |
| Japão | [Japan Education Reform Updates (U.S. International Trade Administration)](https://www.trade.gov/market-intelligence/japan-education-reform-updates) | Relato secundário: desde 2020 a educação em programação é obrigatória no ensino fundamental japonês. Não verificamos o texto do MEXT diretamente. | Mesmo efeito: começar pelo raciocínio (sequência, repetição, condição) antes da sintaxe. |

## Universidades fora dos EUA

| Onde | Programa | O que observamos | Decisão |
|---|---|---|---|
| University of Cambridge | [Department of Computer Science and Technology: Teaching](https://www.cst.cam.ac.uk/teaching) | O primeiro ano combina programação (inclusive funcional), matemática discreta, algoritmos e hardware digital. | Matemática (Nível 14) é pré-requisito parcial de Algoritmos, e não um bloco isolado no fim. |
| University of Oxford | [Department of Computer Science: Courses](https://www.cs.ox.ac.uk/teaching/courses/) | Programação funcional, provas e modelagem formal aparecem cedo, ao lado de estruturas de dados. | O Nível 1 (lógica) inclui argumentar corretude com invariantes simples. |
| ETH Zürich | [Bachelor in Computer Science](https://inf.ethz.ch/studies/bachelor.html) | Bacharelado com base sólida em matemática, algoritmos, sistemas e engenharia de software antes das especializações. | A trilha cobre sistemas operacionais e redes (Níveis 8 e 9) como base, não como opcionais. |
| Georgia Tech | [Online Master of Science in Computer Science (OMSCS)](https://omscs.gatech.edu/) | Mostra que uma formação rigorosa em computação pode ser oferecida online, em escala, com projetos avaliados. | Projetos com marcos e critérios de aceitação explícitos, pensados para estudo autônomo. |
| University of Waterloo | [First-year Computer Science students](https://cs.uwaterloo.ca/current-undergraduate-students/majors/first-year-students) | O primeiro ano separa caminhos por experiência prévia, sem baixar o nível de exigência. | O diagnóstico inicial escolhe o ponto de partida e dispensa módulos, mas o conteúdo é o mesmo para todos. |

## Universidades dos EUA e Canadá

| Curso | Instituição | Como influenciou a trilha |
|---|---|---|
| [CS50's Introduction to Computer Science](https://cs50.harvard.edu/x/) | Harvard University | Inspirou a ideia de começar pelo "como o computador representa as coisas" antes da sintaxe, e de fechar cada bloco com um problema real. |
| [6.100L Introduction to CS and Programming Using Python](https://ocw.mit.edu/courses/6-100l-introduction-to-cs-and-programming-using-python-fall-2022/) | MIT OpenCourseWare | Referência para a escolha de Python como primeira linguagem e para a ordem: tipos, decisões, laços, funções, coleções, testes e depuração. |
| [The Missing Semester of Your CS Education](https://missing.csail.mit.edu/) | MIT CSAIL | Inspirou ensinar terminal, Git e ferramentas cedo, como parte da formação e não como apêndice. |
| [6.006 Introduction to Algorithms](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/) | MIT OpenCourseWare | Escopo de estruturas e algoritmos (busca, ordenação, hashing, grafos, programação dinâmica) do Nível 3 e 4. |
| [6.042J Mathematics for Computer Science](https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-fall-2010/) | MIT OpenCourseWare | Base do Nível 14: lógica, provas, indução, contagem e probabilidade discreta. |
| [18.06 Linear Algebra](https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/) | MIT OpenCourseWare | Base de vetores, matrizes e transformações lineares para IA. |
| [CS 61A: Structure and Interpretation of Computer Programs](https://cs61a.org/) | UC Berkeley | Ênfase em abstração, funções de ordem superior e recursão; inspirou os exercícios de "prever a saída" antes de executar. |
| [CS161: Design and Analysis of Algorithms](https://web.stanford.edu/class/cs161/) | Stanford University | Profundidade de análise (dividir para conquistar, recorrências) usada nos blocos "Aprofundamento". |
| [CS144: Introduction to Computer Networking](https://cs144.github.io/) | Stanford University | Escopo de redes: camadas, TCP, confiabilidade e roteamento. |
| [CS229: Machine Learning](https://cs229.stanford.edu/) | Stanford University | Escopo de aprendizado supervisionado, generalização e avaliação. |
| [15-112: Fundamentals of Programming and Computer Science](https://www.cs.cmu.edu/~112/) | Carnegie Mellon University | Referência de ritmo e de quantidade de prática: muitos exercícios curtos, com testes automáticos. |
| [15-213: Introduction to Computer Systems](https://www.cs.cmu.edu/~213/) | Carnegie Mellon University | Referência para representação de dados (inteiros, ponto flutuante), hierarquia de memória e processos. |
| [15-445/645 Database Systems](https://15445.courses.cs.cmu.edu/) | Carnegie Mellon University | Referência para índices, transações e como um banco de dados funciona por dentro. |
| [Stat 110: Probability](https://stat110.hsites.harvard.edu/) | Harvard University | Referência para probabilidade condicional, Bayes e variáveis aleatórias. |
| [CS 135: Designing Functional Programs](https://student.cs.uwaterloo.ca/~cs135/) | University of Waterloo | Curso introdutório canadense baseado em HtDP; reforçou o uso de exemplos e testes escritos antes do código. |

## Evidências de aprendizagem

| Princípio | Fonte | O que a pesquisa mostra | Onde aparece na plataforma |
|---|---|---|---|
| Prática de recuperação (Retrieval practice) | [Roediger, H. L. & Karpicke, J. D. (2006). Test-enhanced learning. Psychological Science, 17(3).](https://doi.org/10.1111/j.1467-9280.2006.01693.x) | Testar-se fixa mais do que reler o mesmo material pelo mesmo tempo. | Exercícios em toda lição, cartões de recuperação e revisão que pede a resposta antes de mostrá-la. |
| Prática espaçada (Spaced practice) | [Cepeda, N. J. et al. (2006). Distributed practice in verbal recall tasks. Psychological Bulletin, 132(3).](https://doi.org/10.1037/0033-2909.132.3.354) | Distribuir revisões no tempo produz retenção maior que concentrá-las. | Agendamento FSRS dos cartões e desafios de retenção para habilidades que estão enfraquecendo. |
| Intercalação (Interleaving) | [Rohrer, D. & Taylor, K. (2007). The shuffling of mathematics problems improves learning. Instructional Science, 35.](https://doi.org/10.1007/s11251-007-9015-8) | Misturar tipos de problema obriga a escolher a estratégia, e isso melhora o desempenho posterior. | A fila de revisão mistura cartões de lições diferentes; os desafios de retenção misturam habilidades. |
| Carga cognitiva e exemplos resolvidos (Cognitive load and worked examples) | [Sweller, J. (1988). Cognitive load during problem solving: Effects on learning. Cognitive Science, 12(2).](https://doi.org/10.1207/s15516709cog1202_4) | Iniciantes aprendem mais estudando exemplos resolvidos do que resolvendo problemas abertos cedo demais. | As etapas Exemplo e Código vêm antes de Exercício; dicas graduais reduzem a carga sem entregar a resposta. |
| Problemas de Parsons (Parsons problems) | [Parsons, D. & Haden, P. (2006). Parson's programming puzzles: a fun and effective learning tool for first programming courses. ACE 2006, CRPIT 52.](https://crpit.scem.westernsydney.edu.au/abstracts/CRPITV52Parsons.html) | Ordenar linhas de código isola a lógica da sintaxe e dá retorno imediato. | Exercícios de ordenar linhas, operáveis por teclado e por arrastar. |
| Aprendizagem para o domínio (Mastery learning) | [Bloom, B. S. (1984). The 2 Sigma Problem. Educational Researcher, 13(6).](https://doi.org/10.3102/0013189X013006004) | Tutoria individual com correção até o domínio eleva muito o desempenho médio. | Domínio por habilidade (limiar de 80% com evidência mínima), pré-requisitos na árvore e tutor socrático. |
| PRIMM (Predict, Run, Investigate, Modify, Make) | [Sentance, S., Waite, J. & Kallia, M. (2019). Teaching computer programming with PRIMM: a sociocultural perspective. Computer Science Education, 29(2-3).](https://static.teachcomputing.org/pedagogy/QR11-PRIMM.pdf) | Prever e investigar código existente antes de escrever o próprio reduz a frustração inicial. | Exercícios de prever a saída, rastreador passo a passo e botão "abrir no laboratório" para modificar exemplos. |
| Agendamento FSRS (Free Spaced Repetition Scheduler) | [Open Spaced Repetition. FSRS: The Algorithm.](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm) | Modelo de memória com estabilidade e dificuldade por cartão que estima a probabilidade de lembrar. | Implementação própria do FSRS-4.5 no pacote engine, com testes. |

## Todas as referências

São 77 referências (livros, cursos abertos e documentação oficial), também navegáveis em `/referencias`.

| Referência | Organização | Tipo | Uso |
|---|---|---|---|
| [Computer Science Curricula 2023 (CS2023)](https://csed.acm.org/) | ACM / IEEE-CS / AAAI | padrao | Corpo de conhecimento usado como checklist de cobertura: cada área de conhecimento (Knowledge Area) do CS2023 foi mapeada para um nível da trilha. |
| [CS50's Introduction to Computer Science](https://cs50.harvard.edu/x/) | Harvard University | universidade | Inspirou a ideia de começar pelo "como o computador representa as coisas" antes da sintaxe, e de fechar cada bloco com um problema real. |
| [6.100L Introduction to CS and Programming Using Python](https://ocw.mit.edu/courses/6-100l-introduction-to-cs-and-programming-using-python-fall-2022/) | MIT OpenCourseWare | universidade | Referência para a escolha de Python como primeira linguagem e para a ordem: tipos, decisões, laços, funções, coleções, testes e depuração. |
| [CS 61A: Structure and Interpretation of Computer Programs](https://cs61a.org/) | UC Berkeley | universidade | Ênfase em abstração, funções de ordem superior e recursão; inspirou os exercícios de "prever a saída" antes de executar. |
| [Composing Programs](https://www.composingprograms.com/) | John DeNero (UC Berkeley) | livro | Texto aberto do CS 61A em Python; usado para a explicação de ambientes, escopo e recursão. |
| [Structure and Interpretation of Computer Programs](https://sicp.mitpress.mit.edu/) | Abelson & Sussman (MIT Press) | livro | Clássico sobre abstração; base da seção avançada de abstração de dados e de procedimentos. |
| [How to Design Programs](https://htdp.org/) | Felleisen, Findler, Flatt, Krishnamurthi | livro | A "receita de projeto" (entender, exemplos, esboço, código, testes) inspirou a etapa de resolução de problemas do Nível 1. |
| [CS 135: Designing Functional Programs](https://student.cs.uwaterloo.ca/~cs135/) | University of Waterloo | universidade | Curso introdutório canadense baseado em HtDP; reforçou o uso de exemplos e testes escritos antes do código. |
| [15-112: Fundamentals of Programming and Computer Science](https://www.cs.cmu.edu/~112/) | Carnegie Mellon University | universidade | Referência de ritmo e de quantidade de prática: muitos exercícios curtos, com testes automáticos. |
| [Nand to Tetris (The Elements of Computing Systems)](https://www.nand2tetris.org/) | Nisan & Schocken | curso | Inspirou a visualização das portas lógicas e a narrativa "do transistor ao programa". |
| [15-213: Introduction to Computer Systems](https://www.cs.cmu.edu/~213/) | Carnegie Mellon University | universidade | Referência para representação de dados (inteiros, ponto flutuante), hierarquia de memória e processos. |
| [The Missing Semester of Your CS Education](https://missing.csail.mit.edu/) | MIT CSAIL | universidade | Inspirou ensinar terminal, Git e ferramentas cedo, como parte da formação e não como apêndice. |
| [6.006 Introduction to Algorithms](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/) | MIT OpenCourseWare | universidade | Escopo de estruturas e algoritmos (busca, ordenação, hashing, grafos, programação dinâmica) do Nível 3 e 4. |
| [CS161: Design and Analysis of Algorithms](https://web.stanford.edu/class/cs161/) | Stanford University | universidade | Profundidade de análise (dividir para conquistar, recorrências) usada nos blocos "Aprofundamento". |
| [6.042J Mathematics for Computer Science](https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-fall-2010/) | MIT OpenCourseWare | universidade | Base do Nível 14: lógica, provas, indução, contagem e probabilidade discreta. |
| [15-445/645 Database Systems](https://15445.courses.cs.cmu.edu/) | Carnegie Mellon University | universidade | Referência para índices, transações e como um banco de dados funciona por dentro. |
| [CS144: Introduction to Computer Networking](https://cs144.github.io/) | Stanford University | universidade | Escopo de redes: camadas, TCP, confiabilidade e roteamento. |
| [CS255: Introduction to Cryptography](https://crypto.stanford.edu/~dabo/cs255/) | Stanford University | universidade | Base do módulo de criptografia aplicada: o que é seguro, o que não é, e por que não inventar cripto própria. |
| [CS229: Machine Learning](https://cs229.stanford.edu/) | Stanford University | universidade | Escopo de aprendizado supervisionado, generalização e avaliação. |
| [CS231n: Deep Learning for Computer Vision](https://cs231n.stanford.edu/) | Stanford University | universidade | Explicação de redes neurais, retropropagação e otimização. |
| [CS224N: Natural Language Processing with Deep Learning](https://web.stanford.edu/class/cs224n/) | Stanford University | universidade | Referência para embeddings, transformers e modelos de linguagem. |
| [Stat 110: Probability](https://stat110.hsites.harvard.edu/) | Harvard University | universidade | Referência para probabilidade condicional, Bayes e variáveis aleatórias. |
| [18.06 Linear Algebra](https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/) | MIT OpenCourseWare | universidade | Base de vetores, matrizes e transformações lineares para IA. |
| [Introduction to Algorithms (4th ed.)](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/) | Cormen, Leiserson, Rivest, Stein (MIT Press) | livro | Referência formal para definições e provas de correção dos algoritmos. |
| [Algorithms, 4th Edition](https://algs4.cs.princeton.edu/) | Sedgewick & Wayne (Princeton University) | livro | Abordagem visual e empírica (medir tempo de execução) que inspirou as visualizações de ordenação. |
| [Algorithm Design](https://www.pearson.com/en-us/subject-catalog/p/algorithm-design/P200000003259) | Kleinberg & Tardos (Cornell / Pearson) | livro | Modelagem de problemas reais como problemas de grafos e algoritmos gulosos. |
| [Programming Pearls (2nd ed.)](https://www.informit.com/store/programming-pearls-9780201657883) | Jon Bentley (Addison-Wesley) | livro | Inspirou a discussão sobre a busca binária ser fácil de explicar e difícil de acertar. |
| [How to Solve It](https://press.princeton.edu/books/paperback/9780691164076/how-to-solve-it) | George Pólya (Princeton University Press) | livro | Os quatro passos (entender, planejar, executar, revisar) estruturam a resolução de problemas do Nível 1. |
| [Operating Systems: Three Easy Pieces](https://pages.cs.wisc.edu/~remzi/OSTEP/) | Remzi & Andrea Arpaci-Dusseau (Univ. of Wisconsin) | livro | Organização do Nível 8 em virtualização, concorrência e persistência. |
| [Modern Operating Systems (5th ed.)](https://www.pearson.com/en-us/subject-catalog/p/modern-operating-systems/P200000003295) | Tanenbaum & Bos (Pearson) | livro | Referência complementar sobre escalonamento e gerência de memória. |
| [Computer Networking: A Top-Down Approach](https://gaia.cs.umass.edu/kurose_ross/) | Kurose & Ross (Pearson) | livro | A abordagem "de cima para baixo" (começar pela aplicação, descer até o enlace) define a ordem do Nível 9. |
| [Designing Data-Intensive Applications](https://dataintensive.net/) | Martin Kleppmann (O'Reilly) | livro | Referência para replicação, particionamento e trade-offs de bancos em escala. |
| [Design Patterns: Elements of Reusable Object-Oriented Software](https://www.informit.com/store/design-patterns-elements-of-reusable-object-oriented-9780201633610) | Gamma, Helm, Johnson, Vlissides (Addison-Wesley) | livro | Catálogo original dos padrões de projeto apresentados no Nível 5. |
| [Refactoring (2nd ed.)](https://martinfowler.com/books/refactoring.html) | Martin Fowler | livro | Vocabulário de "cheiros de código" (code smells) e refatorações usado nos exercícios de corrigir. |
| [The Pragmatic Programmer (20th Anniversary ed.)](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/) | Thomas & Hunt | livro | Hábitos profissionais: DRY, ortogonalidade, depuração sistemática. |
| [Software Engineering at Google](https://abseil.io/resources/swe-book) | Winters, Manshreck, Wright (O'Reilly) | livro | Distinção entre programar e fazer engenharia ao longo do tempo; base do Nível 10. |
| [Pro Git (2nd ed.)](https://git-scm.com/book/en/v2) | Scott Chacon & Ben Straub | livro | Modelo mental do Git (snapshots, branches como ponteiros) usado no módulo de Git. |
| [The Linux Command Line](https://linuxcommand.org/tlcl.php) | William Shotts | livro | Sequência de aprendizado do terminal e do shell. |
| [What Every Computer Scientist Should Know About Floating-Point Arithmetic](https://docs.oracle.com/cd/E19957-01/806-3568/ncg_goldberg.html) | David Goldberg (ACM Computing Surveys, 1991) | artigo | Fundamenta por que 0.1 + 0.2 != 0.3 e como comparar números de ponto flutuante. |
| [Artificial Intelligence: A Modern Approach (4th ed.)](https://aima.cs.berkeley.edu/) | Russell & Norvig | livro | Visão ampla de IA (busca, agentes, aprendizado) além de redes neurais. |
| [Deep Learning](https://www.deeplearningbook.org/) | Goodfellow, Bengio, Courville (MIT Press) | livro | Referência matemática para redes neurais e otimização. |
| [Mathematics for Machine Learning](https://mml-book.github.io/) | Deisenroth, Faisal, Ong (Cambridge University Press) | livro | Ponte entre álgebra linear, cálculo e probabilidade e o que a IA usa deles. |
| [Discrete Mathematics and Its Applications](https://www.mheducation.com/highered/product/discrete-mathematics-and-its-applications-rosen.html) | Kenneth Rosen (McGraw Hill) | livro | Referência de exercícios de lógica, conjuntos, contagem e grafos. |
| [Site Reliability Engineering](https://sre.google/books/) | Google | livro | Conceitos de SLO, monitoramento e resposta a incidentes do módulo de observabilidade. |
| [Documentação oficial do Python](https://docs.python.org/3/) | Python Software Foundation | documentacao | Fonte primária de tudo que se afirma sobre Python na trilha. |
| [The Python Tutorial](https://docs.python.org/3/tutorial/) | Python Software Foundation | documentacao | O aluno é convidado a ler trechos do tutorial oficial em inglês desde o Nível 2. |
| [PEP 8 – Style Guide for Python Code](https://peps.python.org/pep-0008/) | Python Software Foundation | padrao | Convenções de nomes e estilo usadas em todos os exemplos. |
| [Sorting Techniques (HOWTO)](https://docs.python.org/3/howto/sorting.html) | Python Software Foundation | documentacao | Uso de key= e estabilidade da ordenação. |
| [TimeComplexity (Python Wiki)](https://wiki.python.org/moin/TimeComplexity) | Python Software Foundation | documentacao | Custo real das operações de list, dict e set em CPython. |
| [Python Packaging User Guide](https://packaging.python.org/) | Python Packaging Authority | documentacao | Ambientes virtuais e instalação de pacotes. |
| [pytest documentation](https://docs.pytest.org/) | pytest-dev | documentacao | Estilo de testes com assert simples usado nos exercícios. |
| [Python Tutor](https://pythontutor.com/) | Philip Guo | curso | Pesquisa e ferramenta que mostraram o valor de visualizar a execução passo a passo; nosso rastreador segue a mesma ideia. |
| [Pyodide](https://pyodide.org/) | Pyodide project | documentacao | Python (CPython compilado para WebAssembly) que roda os exercícios no navegador. |
| [The Unicode Standard](https://www.unicode.org/standard/standard.html) | Unicode Consortium | padrao | Base da lição sobre texto, code points e UTF-8. |
| [Linux man-pages project](https://man7.org/linux/man-pages/) | Michael Kerrisk | documentacao | Referência para chamadas de sistema e comandos. |
| [MDN Web Docs](https://developer.mozilla.org/pt-BR/) | Mozilla | documentacao | Fonte primária de HTML, CSS e JavaScript. |
| [HTTP (MDN Web Docs)](https://developer.mozilla.org/en-US/docs/Web/HTTP) | Mozilla | documentacao | Métodos, códigos de status e cabeçalhos. |
| [The Modern JavaScript Tutorial](https://javascript.info/) | Ilya Kantor | documentacao | Explicação do event loop e de assincronia. |
| [ECMAScript Language Specification (ECMA-262)](https://tc39.es/ecma262/) | Ecma International (TC39) | padrao | Especificação oficial do JavaScript. |
| [HTML Living Standard](https://html.spec.whatwg.org/) | WHATWG | padrao | Especificação oficial do HTML e da semântica dos elementos. |
| [Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/WCAG22/) | W3C | padrao | Critérios de acessibilidade ensinados no Nível 6 e aplicados à própria plataforma. |
| [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110) | IETF | padrao | Definição oficial de métodos idempotentes e seguros e dos códigos de status. |
| [RFC 9293: Transmission Control Protocol (TCP)](https://www.rfc-editor.org/rfc/rfc9293) | IETF | padrao | Handshake de três vias e estados do TCP. |
| [Cloudflare Learning Center](https://www.cloudflare.com/learning/) | Cloudflare | documentacao | Explicações acessíveis de DNS, TLS, CDN e ataques DDoS. |
| [PostgreSQL Documentation](https://www.postgresql.org/docs/) | PostgreSQL Global Development Group | documentacao | Referência de SQL padrão, índices e níveis de isolamento. |
| [SQLite Documentation](https://www.sqlite.org/docs.html) | SQLite | documentacao | O banco usado nos exercícios de SQL que rodam no navegador. |
| [GitHub Docs](https://docs.github.com/pt) | GitHub | documentacao | Pull requests, GitHub Actions e boas práticas de repositório. |
| [Docker Docs](https://docs.docker.com/) | Docker | documentacao | Imagens, containers, Dockerfile e boas práticas de build. |
| [Kubernetes Documentation](https://kubernetes.io/docs/home/) | CNCF | documentacao | Conceitos de orquestração apresentados no Aprofundamento. |
| [The Twelve-Factor App](https://12factor.net/) | Adam Wiggins | artigo | Configuração por variáveis de ambiente, processos sem estado e paridade entre ambientes. |
| [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/) | Amazon Web Services | documentacao | Pilares de confiabilidade, segurança, custo e desempenho para decisões de arquitetura. |
| [Machine Learning Crash Course](https://developers.google.com/machine-learning/crash-course) | Google | curso | Sequência prática de regressão, classificação, overfitting e métricas. |
| [OWASP Top 10](https://owasp.org/www-project-top-ten/) | OWASP Foundation | padrao | Lista dos riscos mais críticos em aplicações web, usada no Nível 11. |
| [OWASP API Security Top 10](https://owasp.org/API-Security/) | OWASP Foundation | padrao | Riscos específicos de APIs, como autorização quebrada em nível de objeto (BOLA). |
| [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) | OWASP Foundation | documentacao | Receitas de defesa: senhas, sessões, SQL injection, XSS. |
| [NIST SP 800-63B: Digital Identity Guidelines (Authentication)](https://pages.nist.gov/800-63-4/sp800-63b.html) | NIST | padrao | Regras modernas de senha (tamanho mínimo, listas de senhas vazadas, sem troca periódica forçada). |
| [AI Risk Management Framework (AI RMF 1.0)](https://www.nist.gov/itl/ai-risk-management-framework) | NIST | padrao | Base da seção sobre uso responsável de IA: riscos, viés e transparência. |
