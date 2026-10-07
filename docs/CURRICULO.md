# Currículo

<!-- gerado por scripts/gen-docs.ts a partir de packages/content; não edite à mão -->

15 níveis, 59 módulos, 91 lições e 364 exercícios. A seta indica pré-requisitos.

## Nível 0: Introdução à Computação (Introduction to Computing)

Entender o que é um computador, como ele representa e processa informação, e como se comunica.

- **m0-1 Como um computador funciona** (How a computer works)
  - O que é um computador?
  - Bits, bytes e números binários
  - Processador, memória e armazenamento
- **m0-2 Sistema operacional, arquivos e terminal** (Operating system, files and the terminal) ← m0-1
  - Software e sistema operacional
  - Arquivos, pastas e o terminal
- **m0-3 Internet e web: primeiros passos** (Internet and the web: first steps) ← m0-2
  - Como a internet funciona
- **m0-4 Inglês técnico: como ler documentação e erros** (Technical English: reading docs and errors)
  - Como ler inglês técnico

## Nível 1: Lógica de Programação (Programming Logic)

Pensar em algoritmos e expressá-los com variáveis, decisões, repetições e funções.

- **m1-1 Algoritmos e pensamento computacional** (Algorithms and computational thinking) ← m0-1
  - Algoritmos e pensamento computacional
- **m1-2 Variáveis, tipos, operadores e E/S** (Variables, types, operators and I/O) ← m1-1
  - Variáveis e atribuição
  - Tipos de dados e operadores
  - Entrada e saída
- **m1-3 Condicionais** (Conditionals) ← m1-2
  - Condicionais: tomando decisões
- **m1-4 Laços de repetição** (Loops) ← m1-3
  - Laços de repetição
- **m1-5 Funções e resolução de problemas** (Functions and problem solving) ← m1-4
  - Funções e escopo
  - Resolvendo problemas: a receita de projeto

## Nível 2: Primeira Linguagem: Python (First Language: Python)

Dominar uma linguagem de verdade: coleções, texto, arquivos, erros, depuração, módulos e testes.

- **m2-1 Python e seu ambiente** (Python and its environment) ← m1-5
  - Por que Python, e como ele executa seu código
- **m2-2 Coleções** (Collections) ← m2-1
  - Listas
  - Dicionários, conjuntos e tuplas
- **m2-3 Texto e arquivos** (Text and files) ← m2-2
  - Strings em profundidade
  - Arquivos e dados persistentes
- **m2-4 Erros e depuração** (Errors and debugging) ← m2-2
  - Erros e exceções
  - Depuração com método
- **m2-5 Módulos e testes** (Modules and testing) ← m2-4, m2-3
  - Módulos, pacotes e a biblioteca padrão
  - Testes automatizados

## Nível 3: Estruturas de Dados (Data Structures)

Escolher e implementar a estrutura certa para cada problema, sabendo o custo de cada operação.

- **m3-1 Arrays e listas** (Arrays and lists) ← m2-2
  - Arrays e listas dinâmicas
  - Crescimento amortizado: a conta do append
  - Dois ponteiros: padrões e invariantes
- **m3-2 Pilhas e filas** (Stacks and queues) ← m3-1
  - Pilhas e filas
  - Expressões com pilhas: da infixa à notação polonesa reversa
  - Filas de prioridade: quando a ordem de chegada não basta
- **m3-3 Tabelas hash e conjuntos** (Hash tables and sets) ← m3-1
  - Tabelas hash
  - Colisões por dentro: endereçamento aberto e fator de carga
  - Funções hash e chaves: o contrato entre hash e igualdade
- **m3-4 Árvores e heaps** (Trees and heaps) ← m3-2, m4-4
  - Árvores e árvores binárias de busca
  - Árvores balanceadas: rotações e AVL
  - Heaps por dentro: a árvore guardada numa lista
- **m3-5 Grafos** (Graphs) ← m3-4
  - Grafos e busca em largura
  - Busca em profundidade a fundo: representações, componentes e ciclos
  - Union-Find: grupos que se juntam em tempo quase constante

## Nível 4: Algoritmos (Algorithms)

Analisar e projetar algoritmos eficientes: complexidade, busca, ordenação, recursão, PD, gulosos e grafos.

- **m4-1 Complexidade e Big O** (Complexity and Big O) ← m3-1
  - Complexidade e notação Big O
  - Crescimento de funções: O, Ω e Θ
  - Análise amortizada: o custo pelo total
- **m4-2 Busca** (Searching) ← m4-1
  - Busca linear e busca binária
  - Fronteiras: primeira e última ocorrência com bisect
  - Busca binária na resposta
- **m4-3 Ordenação** (Sorting) ← m4-2, m4-4
  - Algoritmos de ordenação
  - Quicksort por dentro: partição, pivô e valores repetidos
  - Abaixo de n log n: árvore de decisão, counting sort e radix sort
- **m4-4 Recursão e dividir para conquistar** (Recursion and divide and conquer) ← m2-4
  - Recursão e dividir para conquistar
  - Dividir para conquistar: dividir, resolver, combinar
  - Backtracking: escolher, explorar, desfazer
- **m4-5 Programação dinâmica e gulosos** (Dynamic programming and greedy) ← m4-4, m3-3
  - Programação dinâmica e algoritmos gulosos
  - Mochila e LCS: PD em duas dimensões e a resposta por trás do número
  - Escolha gulosa e prova: escalonamento de intervalos
- **m4-6 Algoritmos em grafos** (Graph algorithms) ← m3-5, m4-1
  - Caminhos mínimos com pesos: Dijkstra
  - Ordenação topológica: dependências na ordem certa
  - Árvore geradora mínima: Kruskal e Prim

## Nível 5: Programação Orientada a Objetos (Object-Oriented Programming)

Modelar sistemas com objetos coesos e pouco acoplados, usando princípios e padrões com critério.

- **m5-1 Classes e objetos** (Classes and objects) ← m2-5
  - Classes, objetos e encapsulamento
- **m5-2 Herança, polimorfismo e composição** (Inheritance, polymorphism and composition) ← m5-1
  - Herança, polimorfismo, abstração e composição
- **m5-3 SOLID e padrões de projeto** (SOLID and design patterns) ← m5-2
  - SOLID e padrões de projeto

## Nível 6: Desenvolvimento Web (Web Development)

Construir interfaces acessíveis e APIs bem projetadas, entendendo o que acontece entre navegador e servidor.

- **m6-1 HTML, CSS e acessibilidade** (HTML, CSS and accessibility) ← m0-3
  - HTML semântico, CSS e acessibilidade
- **m6-2 JavaScript e DOM** (JavaScript and the DOM) ← m6-1, m1-5
  - JavaScript e o DOM
- **m6-3 HTTP, REST e APIs** (HTTP, REST and APIs) ← m6-2
  - HTTP, REST e APIs JSON
- **m6-4 Back-end e autenticação** (Back-end and authentication) ← m6-3, m7-1, m5-1
  - Back-end: rotas, camadas, validação e sessões

## Nível 7: Banco de Dados (Databases)

Modelar, consultar e manter dados com consistência e desempenho.

- **m7-1 Modelo relacional e SQL** (Relational model and SQL) ← m2-2
  - Modelo relacional e SQL
- **m7-2 Relacionamentos e JOINs** (Relationships and JOINs) ← m7-1
  - Relacionamentos e JOINs
- **m7-3 Normalização, índices e transações** (Normalization, indexes and transactions) ← m7-2
  - Normalização, índices e transações
- **m7-4 NoSQL e dados em escala** (NoSQL and data at scale) ← m7-3
  - NoSQL, replicação, particionamento e CAP

## Nível 8: Sistemas Operacionais (Operating Systems)

Entender processos, threads, memória, arquivos e concorrência — o que acontece por baixo de todo programa.

- **m8-1 Processos, threads e escalonamento** (Processes, threads and scheduling) ← m0-2, m2-5
  - Processos, threads e escalonamento
- **m8-2 Memória e sistemas de arquivos** (Memory and file systems) ← m8-1
  - Memória virtual, pilha × heap e sistemas de arquivos
- **m8-3 Concorrência e sincronização** (Concurrency and synchronization) ← m8-1
  - Concorrência, condições de corrida e sincronização

## Nível 9: Redes de Computadores (Computer Networks)

Explicar como os dados atravessam a internet, camada por camada, e programar comunicação em rede.

- **m9-1 Camadas, IP, TCP e UDP** (Layers, IP, TCP and UDP) ← m0-3
  - Camadas, IP, TCP e UDP
- **m9-2 DNS, HTTP(S) e TLS** (DNS, HTTP(S) and TLS) ← m9-1
  - DNS, HTTP(S) e TLS
- **m9-3 Sockets e arquitetura cliente-servidor** (Sockets and client-server architecture) ← m9-2, m2-5
  - Sockets, protocolos de aplicação e servidores concorrentes

## Nível 10: Engenharia de Software (Software Engineering)

Trabalhar como um profissional: versionamento, código limpo, testes, CI/CD, arquitetura e colaboração.

- **m10-1 Git e GitHub** (Git and GitHub) ← m0-2
  - Git e GitHub: controle de versão
- **m10-2 Código limpo e refatoração** (Clean code and refactoring) ← m2-5
  - Código limpo, refatoração e code review
- **m10-3 Testes e CI/CD** (Testing and CI/CD) ← m10-1, m10-2
  - Estratégia de testes e integração contínua
- **m10-4 Arquitetura e processos** (Architecture and processes) ← m10-3, m5-3
  - Arquitetura de software, decisões e processos ágeis

## Nível 11: Segurança (Security)

Construir software que resiste a ataques comuns e proteger dados e usuários.

- **m11-1 Fundamentos de segurança** (Security fundamentals) ← m6-3
  - Fundamentos: autenticação, autorização e senhas
- **m11-2 Segurança web e OWASP** (Web security and OWASP) ← m11-1, m7-1
  - Ataques comuns e o OWASP Top 10
- **m11-3 Criptografia aplicada** (Applied cryptography) ← m11-1, m14-1
  - Criptografia aplicada: cifras, HMAC, assinaturas e TLS

## Nível 12: Cloud e DevOps (Cloud and DevOps)

Colocar software em produção de forma reprodutível, observável e escalável.

- **m12-1 Linux e shell** (Linux and the shell) ← m0-2
  - Linux e o shell de verdade
- **m12-2 Containers e Docker** (Containers and Docker) ← m12-1, m6-3
  - Containers e Docker
- **m12-3 Deploy, CI/CD e observabilidade** (Deployment, CI/CD and observability) ← m12-2, m10-3
  - Deploy, CI/CD e observabilidade

## Nível 13: Inteligência Artificial (Artificial Intelligence)

Entender e construir modelos de aprendizado de máquina desde os fundamentos, e usar IA com responsabilidade.

- **m13-1 Fundamentos de machine learning** (Machine learning fundamentals) ← m2-5, m14-2
  - Fundamentos de machine learning
- **m13-2 Redes neurais** (Neural networks) ← m13-1, m14-4
  - Redes neurais e deep learning
- **m13-3 IA generativa e uso responsável** (Generative AI and responsible use) ← m13-1
  - IA generativa e uso responsável na programação

## Nível 14: Matemática para Computação (Mathematics for Computing)

Dominar a matemática que sustenta algoritmos, segurança e IA — sempre conectada ao código.

- **m14-1 Lógica e conjuntos** (Logic and sets) ← m1-3
  - Lógica proposicional e conjuntos
- **m14-2 Combinatória e probabilidade** (Combinatorics and probability) ← m14-1, m1-4
  - Combinatória, probabilidade e estatística
- **m14-3 Matemática discreta: indução, recorrências e grafos** (Discrete math: induction, recurrences and graphs) ← m14-1, m4-4
  - Indução, invariantes, recorrências, grafos e aritmética modular
- **m14-4 Álgebra linear e cálculo para IA** (Linear algebra and calculus for AI) ← m14-2, m2-2
  - Vetores, matrizes, derivadas e gradiente
