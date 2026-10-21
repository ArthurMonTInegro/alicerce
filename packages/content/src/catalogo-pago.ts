/**
 * Mapa público dos níveis pagos (2 a 14): estrutura, títulos, resumos, habilidades,
 * etapas e ids de exercícios e cartões. Nenhum enunciado, solução, dica, teste,
 * explicação, cartão ou aprofundamento: isso fica no repositório privado.
 * Os termos PT → EN alimentam o glossário, que é recurso aberto (ver /planos).
 *
 * GERADO por scripts/premium/metadados.ts a partir do repositório privado. Não edite à mão.
 */
import type { LessonTerms, LevelMeta } from './types.ts';

export const paidCatalog: LevelMeta[] = [
 {
  "id": "n2",
  "number": 2,
  "title": "Primeira Linguagem: Python",
  "titleEn": "First Language: Python",
  "goal": "Escrever, depurar e testar programas em Python, praticando coleções, texto, arquivos, erros, módulos e testes.",
  "why": "Conhecer uma linguagem a fundo — incluindo erros, depuração e testes — é o que separa \"segui um tutorial\" de \"consigo construir sozinho\". Esses hábitos se transferem para qualquer outra linguagem.",
  "modules": [
   {
    "id": "m2-1",
    "levelId": "n2",
    "title": "Python e seu ambiente",
    "titleEn": "Python and its environment",
    "description": "Por que Python, como o código executa, estilo e documentação.",
    "prerequisites": [
     "m1-5"
    ],
    "skills": [
     {
      "id": "py-ambiente",
      "pt": "Ambiente e execução do Python",
      "en": "Python runtime and tooling"
     }
    ],
    "outline": [
     "Critérios de escolha da linguagem",
     "Interpretador e bytecode",
     "PEP 8 e Zen of Python",
     "Documentação oficial"
    ],
    "lessons": [
     {
      "id": "l2-por-que-python",
      "moduleId": "m2-1",
      "title": "Por que Python, e como ele executa seu código",
      "titleEn": "Why Python, and how it runs your code",
      "summary": "A justificativa técnica da escolha, o interpretador, o REPL, PEP 8 e como ler a documentação oficial.",
      "minutes": 32,
      "skills": [
       "py-ambiente"
      ],
      "references": [
       "python-docs",
       "pep8",
       "pyodide",
       "mit-6100l",
       "cs61a",
       "cmu-15112",
       "ies-study-guide",
       "helsinki-python-2026"
      ],
      "theoryTitle": "Linguagem, implementação e ambiente de execução",
      "cardCount": 2,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e2-py-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "py-ambiente"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e2-py-2",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "py-ambiente"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e2-py-desafio",
        "kind": "fix",
        "difficulty": "intermediario",
        "skills": [
         "py-ambiente",
         "en-leitura-erros"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "python-docs",
     "pep8",
     "pyodide"
    ]
   },
   {
    "id": "m2-2",
    "levelId": "n2",
    "title": "Coleções",
    "titleEn": "Collections",
    "description": "Listas, dicionários, conjuntos e tuplas.",
    "prerequisites": [
     "m2-1"
    ],
    "skills": [
     {
      "id": "prog-listas",
      "pt": "Listas",
      "en": "Lists"
     },
     {
      "id": "prog-dicionarios",
      "pt": "Dicionários e conjuntos",
      "en": "Dictionaries and sets"
     }
    ],
    "outline": [
     "Índices e fatias",
     "Mutabilidade e aliasing",
     "List comprehensions",
     "dict, set, tuple",
     "Contagem de frequência"
    ],
    "lessons": [
     {
      "id": "l2-listas",
      "moduleId": "m2-2",
      "title": "Listas",
      "titleEn": "Lists",
      "summary": "Índices, fatias, métodos, iteração, mutabilidade e compreensões de lista.",
      "minutes": 47,
      "skills": [
       "prog-listas"
      ],
      "references": [
       "python-tutorial",
       "cs61a",
       "python-tutor",
       "python-objects-deep",
       "python-copy-deep",
       "python-data-model-deep",
       "ies-study-guide",
       "helsinki-python-2026"
      ],
      "theoryTitle": "Nomes, objetos e cópias: entendendo a memória em Python",
      "cardCount": 3,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e2-list-1",
        "kind": "predict",
        "difficulty": "facil",
        "skills": [
         "prog-listas"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e2-list-2",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "prog-listas"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e2-list-3",
        "kind": "fix",
        "difficulty": "intermediario",
        "skills": [
         "prog-listas"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e2-list-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "prog-listas"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l2-dicionarios",
      "moduleId": "m2-2",
      "title": "Dicionários, conjuntos e tuplas",
      "titleEn": "Dictionaries, sets and tuples",
      "summary": "Mapear chaves a valores, guardar elementos únicos e agrupar dados imutáveis.",
      "minutes": 42,
      "skills": [
       "prog-dicionarios"
      ],
      "references": [
       "python-tutorial",
       "python-docs",
       "ies-study-guide",
       "helsinki-python-2026"
      ],
      "theoryTitle": "Escolher coleções pelo significado dos dados",
      "cardCount": 3,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e2-dict-1",
        "kind": "predict",
        "difficulty": "facil",
        "skills": [
         "prog-dicionarios"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e2-dict-2",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "prog-dicionarios"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e2-dict-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "prog-dicionarios",
         "prog-listas"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "python-tutorial"
    ]
   },
   {
    "id": "m2-3",
    "levelId": "n2",
    "title": "Texto e arquivos",
    "titleEn": "Text and files",
    "description": "Processar strings e persistir dados em arquivos, CSV e JSON.",
    "prerequisites": [
     "m2-2"
    ],
    "skills": [
     {
      "id": "prog-strings",
      "pt": "Manipulação de strings",
      "en": "String manipulation"
     },
     {
      "id": "prog-arquivos",
      "pt": "Arquivos, CSV e JSON",
      "en": "Files, CSV and JSON"
     }
    ],
    "outline": [
     "Métodos de string",
     "Imutabilidade",
     "with open",
     "Encoding",
     "csv e json"
    ],
    "lessons": [
     {
      "id": "l2-strings",
      "moduleId": "m2-3",
      "title": "Strings em profundidade",
      "titleEn": "Strings in depth",
      "summary": "Métodos de texto, imutabilidade, fatias, busca e formatação.",
      "minutes": 37,
      "skills": [
       "prog-strings"
      ],
      "references": [
       "python-docs",
       "python-tutorial",
       "unicode",
       "ies-study-guide",
       "helsinki-python-2026"
      ],
      "theoryTitle": "Transformações de texto e preservação de significado",
      "cardCount": 2,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e2-str-1",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "prog-strings"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e2-str-2",
        "kind": "predict",
        "difficulty": "facil",
        "skills": [
         "prog-strings"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e2-str-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "prog-strings",
         "prog-loops"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l2-arquivos",
      "moduleId": "m2-3",
      "title": "Arquivos e dados persistentes",
      "titleEn": "Files and persistent data",
      "summary": "Ler e escrever arquivos de texto, CSV e JSON com segurança usando with.",
      "minutes": 42,
      "skills": [
       "prog-arquivos"
      ],
      "references": [
       "python-docs",
       "python-tutorial",
       "ies-study-guide",
       "helsinki-python-2026"
      ],
      "theoryTitle": "Persistência, formato e leitura confiável",
      "cardCount": 2,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e2-file-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "prog-arquivos"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e2-file-2",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "prog-arquivos"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e2-file-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "prog-arquivos",
         "prog-dicionarios"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "python-docs"
    ]
   },
   {
    "id": "m2-4",
    "levelId": "n2",
    "title": "Erros e depuração",
    "titleEn": "Errors and debugging",
    "description": "Exceções, tracebacks e um método científico para encontrar bugs.",
    "prerequisites": [
     "m2-2"
    ],
    "skills": [
     {
      "id": "py-excecoes",
      "pt": "Exceções",
      "en": "Exceptions"
     },
     {
      "id": "py-debugging",
      "pt": "Depuração",
      "en": "Debugging"
     }
    ],
    "outline": [
     "Tipos de erro",
     "Lendo tracebacks",
     "try/except/else/finally",
     "raise",
     "Método de depuração",
     "pdb e breakpoints"
    ],
    "lessons": [
     {
      "id": "l2-erros-excecoes",
      "moduleId": "m2-4",
      "title": "Erros e exceções",
      "titleEn": "Errors and exceptions",
      "summary": "Tipos de erro, como ler um traceback, try/except/else/finally e lançar exceções.",
      "minutes": 47,
      "skills": [
       "py-excecoes",
       "en-leitura-erros"
      ],
      "references": [
       "python-tutorial",
       "python-docs",
       "ies-study-guide",
       "helsinki-python-2026"
      ],
      "theoryTitle": "Responsabilidade e alcance do tratamento",
      "cardCount": 3,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e2-exc-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "py-excecoes"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e2-exc-2",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "py-excecoes"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e2-exc-desafio",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "py-excecoes"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l2-debugging",
      "moduleId": "m2-4",
      "title": "Depuração com método",
      "titleEn": "Systematic debugging",
      "summary": "Reproduzir, isolar, formular hipóteses, testar. Print debugging, assert e o depurador.",
      "minutes": 42,
      "skills": [
       "py-debugging"
      ],
      "references": [
       "python-docs",
       "missing-semester",
       "cs50",
       "pytest-docs",
       "ies-study-guide",
       "helsinki-python-2026"
      ],
      "theoryTitle": "Hipóteses concorrentes e o primeiro desvio",
      "cardCount": 2,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e2-dbg-1",
        "kind": "fix",
        "difficulty": "facil",
        "skills": [
         "py-debugging"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e2-dbg-2",
        "kind": "fix",
        "difficulty": "intermediario",
        "skills": [
         "py-debugging"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e2-dbg-desafio",
        "kind": "fix",
        "difficulty": "desafio",
        "skills": [
         "py-debugging"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "python-tutorial",
     "missing-semester"
    ]
   },
   {
    "id": "m2-5",
    "levelId": "n2",
    "title": "Módulos e testes",
    "titleEn": "Modules and testing",
    "description": "Organizar código em módulos, usar dependências e testar automaticamente.",
    "prerequisites": [
     "m2-4",
     "m2-3"
    ],
    "skills": [
     {
      "id": "py-modulos",
      "pt": "Módulos e pacotes",
      "en": "Modules and packages"
     },
     {
      "id": "py-testes",
      "pt": "Testes automatizados",
      "en": "Automated testing"
     }
    ],
    "outline": [
     "import e biblioteca padrão",
     "pip, PyPI, venv",
     "Estrutura de projeto",
     "Testes de unidade",
     "TDD"
    ],
    "lessons": [
     {
      "id": "l2-modulos",
      "moduleId": "m2-5",
      "title": "Módulos, pacotes e a biblioteca padrão",
      "titleEn": "Modules, packages and the standard library",
      "summary": "import, organizar código em arquivos, pip e ambientes virtuais.",
      "minutes": 37,
      "skills": [
       "py-modulos"
      ],
      "references": [
       "python-docs",
       "python-packaging",
       "python-tutorial",
       "ies-study-guide",
       "helsinki-python-2026"
      ],
      "theoryTitle": "Interfaces de módulos e dependências reproduzíveis",
      "cardCount": 2,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e2-mod-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "py-modulos",
         "en-leitura-erros"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e2-mod-2",
        "kind": "code",
        "difficulty": "facil",
        "skills": [
         "py-modulos"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e2-mod-desafio",
        "kind": "code",
        "difficulty": "avancado",
        "skills": [
         "py-modulos",
         "prog-strings"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l2-testes",
      "moduleId": "m2-5",
      "title": "Testes automatizados",
      "titleEn": "Automated testing",
      "summary": "assert, testes de unidade, unittest/pytest, casos de borda e TDD.",
      "minutes": 42,
      "skills": [
       "py-testes"
      ],
      "references": [
       "python-docs",
       "pytest-docs",
       "swe-at-google",
       "htdp",
       "ies-study-guide",
       "helsinki-python-2026"
      ],
      "theoryTitle": "Oráculos, fronteiras e regressões úteis",
      "cardCount": 3,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e2-test-1",
        "kind": "code",
        "difficulty": "avancado",
        "skills": [
         "py-testes"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e2-test-desafio",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "py-testes",
         "prog-strings"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "python-docs",
     "pytest-docs",
     "python-packaging"
    ]
   }
  ]
 },
 {
  "id": "n3",
  "number": 3,
  "title": "Estruturas de Dados",
  "titleEn": "Data Structures",
  "goal": "Escolher e implementar a estrutura certa para cada problema, sabendo o custo de cada operação.",
  "why": "Programas eficientes começam pela forma como os dados estão organizados. Este nível mostra como a escolha da estrutura muda o custo de um programa quando os dados crescem, um tema que também costuma aparecer em entrevistas técnicas.",
  "modules": [
   {
    "id": "m3-1",
    "levelId": "n3",
    "title": "Arrays e listas",
    "titleEn": "Arrays and lists",
    "description": "Memória contígua, custos de operações e listas dinâmicas.",
    "prerequisites": [
     "m2-2"
    ],
    "skills": [
     {
      "id": "ed-arrays",
      "pt": "Arrays e listas dinâmicas",
      "en": "Arrays and dynamic arrays"
     }
    ],
    "outline": [
     "Memória contígua",
     "Custos de operações",
     "Crescimento amortizado",
     "Dois ponteiros"
    ],
    "lessons": [
     {
      "id": "l3-arrays",
      "moduleId": "m3-1",
      "title": "Arrays e listas dinâmicas",
      "titleEn": "Arrays and dynamic arrays",
      "summary": "Memória contígua, acesso por índice em O(1), custo de inserir no meio e a mágica da lista que cresce.",
      "minutes": 42,
      "skills": [
       "ed-arrays"
      ],
      "references": [
       "clrs",
       "mit-6006",
       "python-time-complexity",
       "ies-study-guide"
      ],
      "theoryTitle": "Contrato de operações e custo da representação",
      "cardCount": 2,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e3-arr-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "ed-arrays"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-arr-2",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "ed-arrays"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-arr-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "ed-arrays",
         "alg-complexidade"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l3-crescimento-amortizado",
      "moduleId": "m3-1",
      "title": "Crescimento amortizado: a conta do append",
      "titleEn": "Amortized growth: the math behind append",
      "summary": "Por que dobrar a capacidade deixa o append O(1) amortizado, por que crescer de pouco em pouco vira O(n²), quando encolher e onde se escondem cópias no seu código.",
      "minutes": 52,
      "skills": [
       "ed-arrays"
      ],
      "references": [
       "clrs",
       "mit-6006",
       "sedgewick-algs",
       "pep8",
       "ies-study-guide"
      ],
      "theoryTitle": "Contabilidade do trabalho e limites de latência",
      "cardCount": 6,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e3-amort-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "ed-arrays"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-amort-2",
        "kind": "predict",
        "difficulty": "intermediario",
        "skills": [
         "ed-arrays",
         "prog-listas"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-amort-3",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "ed-arrays"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-amort-4",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "ed-arrays"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-amort-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "ed-arrays",
         "prog-dicionarios"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l3-dois-ponteiros",
      "moduleId": "m3-1",
      "title": "Dois ponteiros: padrões e invariantes",
      "titleEn": "Two pointers: patterns and invariants",
      "summary": "Três jeitos de andar com dois índices (convergentes, leitor e escritor, duas listas) que trocam laços aninhados por uma passada O(n), e como provar que nenhuma resposta fica para trás.",
      "minutes": 62,
      "skills": [
       "ed-arrays"
      ],
      "references": [
       "clrs",
       "sedgewick-algs",
       "mit-6006",
       "ies-study-guide"
      ],
      "theoryTitle": "Regiões já decididas e segurança da escrita no lugar",
      "cardCount": 6,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e3-2p-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "ed-arrays"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-2p-2",
        "kind": "predict",
        "difficulty": "intermediario",
        "skills": [
         "ed-arrays",
         "prog-listas"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-2p-3",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "ed-arrays"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-2p-4",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "ed-arrays",
         "prog-strings"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-2p-5",
        "kind": "parsons",
        "difficulty": "intermediario",
        "skills": [
         "ed-arrays"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-2p-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "ed-arrays"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "clrs",
     "mit-6006"
    ]
   },
   {
    "id": "m3-2",
    "levelId": "n3",
    "title": "Pilhas e filas",
    "titleEn": "Stacks and queues",
    "description": "LIFO, FIFO, deque e problemas clássicos.",
    "prerequisites": [
     "m3-1"
    ],
    "skills": [
     {
      "id": "ed-pilhas-filas",
      "pt": "Pilhas e filas",
      "en": "Stacks and queues"
     }
    ],
    "outline": [
     "LIFO e FIFO",
     "list como pilha, deque como fila",
     "Parênteses balanceados",
     "Notação polonesa reversa",
     "Filas de prioridade (introdução)"
    ],
    "lessons": [
     {
      "id": "l3-pilhas-filas",
      "moduleId": "m3-2",
      "title": "Pilhas e filas",
      "titleEn": "Stacks and queues",
      "summary": "LIFO e FIFO, onde aparecem (desfazer, chamadas de função, filas de impressão, BFS) e como implementar.",
      "minutes": 42,
      "skills": [
       "ed-pilhas-filas"
      ],
      "references": [
       "clrs",
       "sedgewick-algs",
       "python-docs",
       "ies-study-guide"
      ],
      "theoryTitle": "O contrato de retirada determina o algoritmo",
      "cardCount": 3,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e3-sq-1",
        "kind": "predict",
        "difficulty": "facil",
        "skills": [
         "ed-pilhas-filas"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-sq-2",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "ed-pilhas-filas"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-sq-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "ed-pilhas-filas"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l3-expressoes-rpn",
      "moduleId": "m3-2",
      "title": "Expressões com pilhas: da infixa à notação polonesa reversa",
      "titleEn": "Expressions with stacks: from infix to Reverse Polish Notation",
      "summary": "Por que a notação pós-fixa dispensa parênteses, como precedência e associatividade decidem a ordem das contas e como o algoritmo do pátio de manobras transforma 3 + 4 * 2 em 3 4 2 * + com uma pilha.",
      "minutes": 57,
      "skills": [
       "ed-pilhas-filas",
       "logica-operadores"
      ],
      "references": [
       "sedgewick-algs",
       "python-docs",
       "clrs",
       "ies-study-guide"
      ],
      "theoryTitle": "Árvores de expressão, operandos e validade sintática",
      "cardCount": 7,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e3-rpn-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "ed-pilhas-filas",
         "logica-operadores"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-rpn-2",
        "kind": "predict",
        "difficulty": "intermediario",
        "skills": [
         "ed-pilhas-filas"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-rpn-3",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "ed-pilhas-filas",
         "logica-operadores"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-rpn-4",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "ed-pilhas-filas",
         "logica-operadores"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-rpn-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "ed-pilhas-filas",
         "logica-operadores"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l3-filas-prioridade",
      "moduleId": "m3-2",
      "title": "Filas de prioridade: quando a ordem de chegada não basta",
      "titleEn": "Priority queues: when arrival order is not enough",
      "summary": "O tipo abstrato fila de prioridade, o custo de implementá-lo com listas ou com heap, e como usar heapq na prática: desempate estável, maior primeiro e os k maiores de um fluxo.",
      "minutes": 57,
      "skills": [
       "ed-pilhas-filas",
       "ed-arrays"
      ],
      "references": [
       "clrs",
       "sedgewick-algs",
       "python-docs",
       "ies-study-guide"
      ],
      "theoryTitle": "Prioridade, desempate e manutenção de um top-k",
      "cardCount": 8,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e3-fp-1",
        "kind": "predict",
        "difficulty": "facil",
        "skills": [
         "ed-pilhas-filas"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-fp-2",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "ed-pilhas-filas"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-fp-3",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "ed-pilhas-filas",
         "ed-arrays"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-fp-4",
        "kind": "fill",
        "difficulty": "intermediario",
        "skills": [
         "ed-pilhas-filas"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-fp-5",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "ed-pilhas-filas"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-fp-desafio",
        "kind": "code",
        "difficulty": "avancado",
        "skills": [
         "ed-pilhas-filas"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "clrs",
     "sedgewick-algs"
    ]
   },
   {
    "id": "m3-3",
    "levelId": "n3",
    "title": "Tabelas hash e conjuntos",
    "titleEn": "Hash tables and sets",
    "description": "Como dict e set alcançam O(1) em média.",
    "prerequisites": [
     "m3-1"
    ],
    "skills": [
     {
      "id": "ed-hash",
      "pt": "Tabelas hash",
      "en": "Hash tables"
     }
    ],
    "outline": [
     "Funções hash",
     "Colisões",
     "Fator de carga e redimensionamento",
     "Two Sum",
     "Imutabilidade das chaves"
    ],
    "lessons": [
     {
      "id": "l3-hash",
      "moduleId": "m3-3",
      "title": "Tabelas hash",
      "titleEn": "Hash tables",
      "summary": "Como dict e set conseguem buscar em tempo constante: funções hash, buckets e colisões.",
      "minutes": 42,
      "skills": [
       "ed-hash"
      ],
      "references": [
       "clrs",
       "mit-6006",
       "python-docs",
       "python-data-model-deep",
       "ies-study-guide"
      ],
      "theoryTitle": "Índice aproximado, identidade lógica e custo real da chave",
      "cardCount": 3,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e3-hash-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "ed-hash"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-hash-2",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "ed-hash"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-hash-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "ed-hash"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l3-enderecamento-aberto",
      "moduleId": "m3-3",
      "title": "Colisões por dentro: endereçamento aberto e fator de carga",
      "titleEn": "Collisions up close: open addressing and load factor",
      "summary": "Por que colisões são inevitáveis, como a sondagem linear resolve conflitos sem listas, por que remover exige lápides e como o fator de carga decide o custo de cada busca e a hora de reconstruir a tabela.",
      "minutes": 57,
      "skills": [
       "ed-hash"
      ],
      "references": [
       "sedgewick-algs",
       "clrs",
       "mit-6006",
       "ies-study-guide"
      ],
      "theoryTitle": "A ausência só é provada no ponto correto da sondagem",
      "cardCount": 7,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e3-ea-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "ed-hash"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-ea-2",
        "kind": "predict",
        "difficulty": "intermediario",
        "skills": [
         "ed-hash"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-ea-3",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "ed-hash"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-ea-4",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "ed-hash"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-ea-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "ed-hash"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l3-chaves-hash",
      "moduleId": "m3-3",
      "title": "Funções hash e chaves: o contrato entre hash e igualdade",
      "titleEn": "Hash functions and keys: the hash/equality contract",
      "summary": "O que uma função hash precisa garantir para a tabela funcionar, por que somar as letras espalha mal, como criar chaves próprias com __eq__ e __hash__ (ou dataclass congelada), por que uma chave que muda se perde e como escolher a chave certa, do CEP ao Two Sum.",
      "minutes": 62,
      "skills": [
       "ed-hash",
       "prog-dicionarios"
      ],
      "references": [
       "python-docs",
       "sedgewick-algs",
       "clrs",
       "python-data-model-deep",
       "ies-study-guide"
      ],
      "theoryTitle": "Igualdade de domínio antes da função hash",
      "cardCount": 8,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e3-ch-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "ed-hash",
         "prog-dicionarios"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-ch-2",
        "kind": "predict",
        "difficulty": "intermediario",
        "skills": [
         "ed-hash",
         "prog-dicionarios"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-ch-3",
        "kind": "predict",
        "difficulty": "intermediario",
        "skills": [
         "ed-hash"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-ch-4",
        "kind": "fix",
        "difficulty": "intermediario",
        "skills": [
         "ed-hash"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-ch-5",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "ed-hash",
         "prog-dicionarios"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-ch-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "ed-hash",
         "prog-dicionarios"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "clrs",
     "mit-6006"
    ]
   },
   {
    "id": "m3-4",
    "levelId": "n3",
    "title": "Árvores e heaps",
    "titleEn": "Trees and heaps",
    "description": "Árvores, BST, percursos, balanceamento e heaps.",
    "prerequisites": [
     "m3-2",
     "m4-4"
    ],
    "skills": [
     {
      "id": "ed-arvores",
      "pt": "Árvores",
      "en": "Trees"
     }
    ],
    "outline": [
     "Vocabulário de árvores",
     "BST: busca e inserção",
     "Percursos",
     "Balanceamento (AVL, rubro-negra)",
     "Heaps e filas de prioridade (heapq)",
     "Tries"
    ],
    "lessons": [
     {
      "id": "l3-arvores",
      "moduleId": "m3-4",
      "title": "Árvores e árvores binárias de busca",
      "titleEn": "Trees and binary search trees",
      "summary": "Estruturas hierárquicas, percursos e a BST, que busca em O(log n) quando balanceada.",
      "minutes": 47,
      "skills": [
       "ed-arvores"
      ],
      "references": [
       "clrs",
       "sedgewick-algs",
       "mit-6006",
       "ies-study-guide"
      ],
      "theoryTitle": "A propriedade de busca vale para subárvores inteiras",
      "cardCount": 2,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e3-tree-0",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "ed-arvores"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-tree-1",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "ed-arvores"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-tree-2",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "ed-arvores",
         "alg-recursao"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-tree-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "ed-arvores",
         "alg-recursao"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l3-arvores-balanceadas",
      "moduleId": "m3-4",
      "title": "Árvores balanceadas: rotações e AVL",
      "titleEn": "Balanced trees: rotations and AVL trees",
      "summary": "Como uma BST mantém altura O(log n) em qualquer ordem de chegada: rotações, a regra da AVL, os quatro casos de desequilíbrio, a remoção e uma visão da rubro-negra.",
      "minutes": 62,
      "skills": [
       "ed-arvores"
      ],
      "references": [
       "clrs",
       "sedgewick-algs",
       "mit-6006",
       "ies-study-guide"
      ],
      "theoryTitle": "Rotação preserva ordem; alturas explicam quando usá-la",
      "cardCount": 8,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e3-avl-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "ed-arvores"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-avl-2",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "ed-arvores"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-avl-3",
        "kind": "predict",
        "difficulty": "intermediario",
        "skills": [
         "ed-arvores",
         "alg-recursao"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-avl-4",
        "kind": "fill",
        "difficulty": "intermediario",
        "skills": [
         "ed-arvores",
         "alg-recursao"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-avl-5",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "ed-arvores",
         "alg-recursao"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-avl-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "ed-arvores",
         "alg-recursao"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l3-heap-binario",
      "moduleId": "m3-4",
      "title": "Heaps por dentro: a árvore guardada numa lista",
      "titleEn": "Inside binary heaps: a tree stored in an array",
      "summary": "Como o heapq funciona: árvore binária completa dentro de uma lista, subir e descer, construir um heap em O(n) e ordenar no lugar com heapsort.",
      "minutes": 57,
      "skills": [
       "ed-arvores"
      ],
      "references": [
       "clrs",
       "sedgewick-algs",
       "python-docs",
       "ies-study-guide"
      ],
      "theoryTitle": "Forma completa e ordem parcial trabalham juntas",
      "cardCount": 8,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e3-heap-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "ed-arvores",
         "ed-arrays"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-heap-2",
        "kind": "mcq",
        "difficulty": "avancado",
        "skills": [
         "ed-arvores"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-heap-3",
        "kind": "predict",
        "difficulty": "intermediario",
        "skills": [
         "ed-arvores"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-heap-4",
        "kind": "code",
        "difficulty": "facil",
        "skills": [
         "ed-arvores",
         "ed-arrays"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-heap-5",
        "kind": "fix",
        "difficulty": "avancado",
        "skills": [
         "ed-arvores"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-heap-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "ed-arvores",
         "ed-arrays"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "clrs",
     "sedgewick-algs"
    ]
   },
   {
    "id": "m3-5",
    "levelId": "n3",
    "title": "Grafos",
    "titleEn": "Graphs",
    "description": "Modelagem, representação, BFS e DFS.",
    "prerequisites": [
     "m3-4"
    ],
    "skills": [
     {
      "id": "ed-grafos",
      "pt": "Grafos",
      "en": "Graphs"
     }
    ],
    "outline": [
     "Vértices e arestas",
     "Lista × matriz de adjacência",
     "BFS e menor caminho",
     "DFS",
     "Union-Find (estruturas avançadas)"
    ],
    "lessons": [
     {
      "id": "l3-grafos",
      "moduleId": "m3-5",
      "title": "Grafos e busca em largura",
      "titleEn": "Graphs and breadth-first search",
      "summary": "Vértices e arestas, listas de adjacência, BFS e DFS.",
      "minutes": 47,
      "skills": [
       "ed-grafos"
      ],
      "references": [
       "clrs",
       "sedgewick-algs",
       "mit-6006",
       "stanford-cs161",
       "ies-study-guide"
      ],
      "theoryTitle": "Camadas de descoberta e significado de menor caminho",
      "cardCount": 3,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e3-graph-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "ed-grafos"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-graph-2",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "ed-grafos"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-graph-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "ed-grafos"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l3-grafos-dfs",
      "moduleId": "m3-5",
      "title": "Busca em profundidade a fundo: representações, componentes e ciclos",
      "titleEn": "Depth-first search in depth: representations, components and cycles",
      "summary": "Lista de arestas, lista e matriz de adjacência e a grade como grafo implícito; DFS recursiva, contagem de componentes conexos em O(V + E) e detecção de ciclos em grafos direcionados com três cores.",
      "minutes": 62,
      "skills": [
       "ed-grafos",
       "alg-recursao"
      ],
      "references": [
       "clrs",
       "sedgewick-algs",
       "mit-6006",
       "ies-study-guide"
      ],
      "theoryTitle": "Entrada, saída e a diferença entre visitado e ativo",
      "cardCount": 8,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e3-dfs-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "ed-grafos"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-dfs-2",
        "kind": "predict",
        "difficulty": "intermediario",
        "skills": [
         "ed-grafos",
         "alg-recursao"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-dfs-3",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "ed-grafos"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-dfs-4",
        "kind": "fix",
        "difficulty": "intermediario",
        "skills": [
         "ed-grafos"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-dfs-5",
        "kind": "mcq",
        "difficulty": "avancado",
        "skills": [
         "ed-grafos",
         "alg-recursao"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-dfs-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "ed-grafos",
         "alg-recursao"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l3-union-find",
      "moduleId": "m3-5",
      "title": "Union-Find: grupos que se juntam em tempo quase constante",
      "titleEn": "Union-Find: merging groups in nearly constant time",
      "summary": "Conjuntos disjuntos com find e union sobre uma lista de pais; união por tamanho, compressão de caminho e o custo O(α(n)); contar grupos e achar a ligação que fecha um ciclo enquanto as arestas chegam uma a uma.",
      "minutes": 57,
      "skills": [
       "ed-grafos"
      ],
      "references": [
       "clrs",
       "sedgewick-algs",
       "stanford-cs161",
       "ies-study-guide"
      ],
      "theoryTitle": "Representantes de grupos e informação que não é preservada",
      "cardCount": 8,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e3-uf-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "ed-grafos"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-uf-2",
        "kind": "predict",
        "difficulty": "intermediario",
        "skills": [
         "ed-grafos"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-uf-3",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "ed-grafos",
         "ed-arvores"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-uf-4",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "ed-grafos"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-uf-5",
        "kind": "fix",
        "difficulty": "avancado",
        "skills": [
         "ed-grafos",
         "ed-arvores"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e3-uf-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "ed-grafos"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "clrs",
     "stanford-cs161"
    ]
   }
  ]
 },
 {
  "id": "n4",
  "number": 4,
  "title": "Algoritmos",
  "titleEn": "Algorithms",
  "goal": "Analisar e projetar algoritmos eficientes: complexidade, busca, ordenação, recursão, PD, gulosos e grafos.",
  "why": "É aqui que o pensamento computacional vira técnica: você aprende a provar que algo funciona, medir quanto custa e escolher entre abordagens. É também o núcleo das entrevistas técnicas e das disciplinas de algoritmos da graduação.",
  "modules": [
   {
    "id": "m4-1",
    "levelId": "n4",
    "title": "Complexidade e Big O",
    "titleEn": "Complexity and Big O",
    "description": "Medir a eficiência de algoritmos.",
    "prerequisites": [
     "m3-1"
    ],
    "skills": [
     {
      "id": "alg-complexidade",
      "pt": "Análise de complexidade",
      "en": "Complexity analysis"
     }
    ],
    "outline": [
     "Crescimento de funções",
     "Big O, Ω e Θ",
     "Tempo e espaço",
     "Operações escondidas",
     "Análise amortizada"
    ],
    "lessons": [
     {
      "id": "l4-big-o",
      "moduleId": "m4-1",
      "title": "Complexidade e notação Big O",
      "titleEn": "Complexity and Big O notation",
      "summary": "Como medir a eficiência de um algoritmo independentemente do computador.",
      "minutes": 47,
      "skills": [
       "alg-complexidade"
      ],
      "references": [
       "clrs",
       "mit-6006",
       "stanford-cs161",
       "mit-6042",
       "mit-algorithms-syllabus",
       "ies-study-guide"
      ],
      "theoryTitle": "Modelo de custo, limites e validade da comparação",
      "cardCount": 3,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e4-bigo-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "alg-complexidade"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-bigo-2",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "alg-complexidade"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-bigo-3",
        "kind": "mcq",
        "difficulty": "avancado",
        "skills": [
         "alg-complexidade"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-bigo-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "alg-complexidade",
         "alg-pd"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l4-o-omega-teta",
      "moduleId": "m4-1",
      "title": "Crescimento de funções: O, Ω e Θ",
      "titleEn": "Growth of functions: O, Ω and Θ",
      "summary": "O que O, Ω e Θ afirmam de verdade, por que \"qual caso\" e \"qual limite\" são perguntas diferentes, como ordenar funções por crescimento e como somar laços em que o de dentro depende do de fora.",
      "minutes": 57,
      "skills": [
       "alg-complexidade"
      ],
      "references": [
       "clrs",
       "mit-6042",
       "stanford-cs161",
       "rosen-discrete",
       "sedgewick-algs",
       "mit-6006",
       "ies-study-guide"
      ],
      "theoryTitle": "Limites assintóticos como afirmações demonstráveis",
      "cardCount": 6,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e4-oth-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "alg-complexidade"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-oth-2",
        "kind": "parsons",
        "difficulty": "intermediario",
        "skills": [
         "alg-complexidade"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-oth-3",
        "kind": "predict",
        "difficulty": "intermediario",
        "skills": [
         "alg-complexidade",
         "prog-loops"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-oth-4",
        "kind": "mcq",
        "difficulty": "avancado",
        "skills": [
         "alg-complexidade"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-oth-5",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "alg-complexidade"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-oth-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "alg-complexidade",
         "prog-listas"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l4-analise-amortizada",
      "moduleId": "m4-1",
      "title": "Análise amortizada: o custo pelo total",
      "titleEn": "Amortized analysis: paying for the whole sequence",
      "summary": "Os métodos agregado, contábil e do potencial aplicados ao contador binário, à fila com duas pilhas e à pilha monotônica: como provar que um laço dentro de outro ainda pode ser O(n), e quando essa conta deixa de valer.",
      "minutes": 62,
      "skills": [
       "alg-complexidade"
      ],
      "references": [
       "clrs",
       "mit-6006",
       "stanford-cs161",
       "sedgewick-algs",
       "ies-study-guide"
      ],
      "theoryTitle": "Sequências de operações e crédito que não fica negativo",
      "cardCount": 6,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e4-amz-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "alg-complexidade",
         "ed-pilhas-filas"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-amz-2",
        "kind": "predict",
        "difficulty": "intermediario",
        "skills": [
         "alg-complexidade",
         "prog-loops"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-amz-3",
        "kind": "fill",
        "difficulty": "intermediario",
        "skills": [
         "alg-complexidade",
         "ed-pilhas-filas"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-amz-4",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "alg-complexidade",
         "ed-pilhas-filas"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-amz-5",
        "kind": "mcq",
        "difficulty": "avancado",
        "skills": [
         "alg-complexidade"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-amz-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "alg-complexidade",
         "ed-pilhas-filas"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "clrs",
     "mit-6006"
    ]
   },
   {
    "id": "m4-2",
    "levelId": "n4",
    "title": "Busca",
    "titleEn": "Searching",
    "description": "Busca linear, binária e suas variantes.",
    "prerequisites": [
     "m4-1"
    ],
    "skills": [
     {
      "id": "alg-busca",
      "pt": "Algoritmos de busca",
      "en": "Searching algorithms"
     }
    ],
    "outline": [
     "Busca linear",
     "Busca binária e invariantes",
     "Primeira/última ocorrência",
     "bisect",
     "Busca binária na resposta"
    ],
    "lessons": [
     {
      "id": "l4-busca",
      "moduleId": "m4-2",
      "title": "Busca linear e busca binária",
      "titleEn": "Linear and binary search",
      "summary": "Por que dados ordenados permitem buscar em O(log n), e os detalhes que fazem a busca binária dar errado.",
      "minutes": 42,
      "skills": [
       "alg-busca"
      ],
      "references": [
       "clrs",
       "bentley-pearls",
       "python-docs",
       "mit-6006",
       "ies-study-guide"
      ],
      "theoryTitle": "Busca como eliminação justificada de possibilidades",
      "cardCount": 2,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e4-busca-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "alg-busca"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-busca-2",
        "kind": "fix",
        "difficulty": "intermediario",
        "skills": [
         "alg-busca"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-busca-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "alg-busca"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l4-bisect-fronteiras",
      "moduleId": "m4-2",
      "title": "Fronteiras: primeira e última ocorrência com bisect",
      "titleEn": "Boundaries: lower bound, upper bound and bisect",
      "summary": "Trocar \"onde está x?\" por \"onde x começa e onde termina?\": o molde do intervalo semiaberto, bisect_left e bisect_right, contagens e faixas em O(log n), e quando ordenar compensa.",
      "minutes": 57,
      "skills": [
       "alg-busca"
      ],
      "references": [
       "python-docs",
       "sedgewick-algs",
       "bentley-pearls",
       "python-time-complexity",
       "v7-algo-bisect",
       "clrs",
       "ies-study-guide"
      ],
      "theoryTitle": "Fronteiras, intervalos e contagem sem percorrer resultados",
      "cardCount": 7,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e4-fronteira-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "alg-busca"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-fronteira-2",
        "kind": "predict",
        "difficulty": "intermediario",
        "skills": [
         "alg-busca"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-fronteira-3",
        "kind": "fix",
        "difficulty": "intermediario",
        "skills": [
         "alg-busca"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-fronteira-4",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "alg-busca"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-fronteira-5",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "alg-busca"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-fronteira-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "alg-busca"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l4-busca-na-resposta",
      "moduleId": "m4-2",
      "title": "Busca binária na resposta",
      "titleEn": "Binary search on the answer",
      "summary": "Quando não há lista para buscar: chutar a resposta, verificar o chute e usar a monotonicidade para descartar metade das respostas possíveis a cada teste.",
      "minutes": 62,
      "skills": [
       "alg-busca"
      ],
      "references": [
       "bentley-pearls",
       "clrs",
       "pro-git",
       "python-docs",
       "mit-6006",
       "ies-study-guide"
      ],
      "theoryTitle": "Da otimização a uma decisão monotônica",
      "cardCount": 7,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e4-resposta-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "alg-busca"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-resposta-2",
        "kind": "parsons",
        "difficulty": "facil",
        "skills": [
         "alg-busca"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-resposta-3",
        "kind": "predict",
        "difficulty": "intermediario",
        "skills": [
         "alg-busca"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-resposta-4",
        "kind": "fix",
        "difficulty": "intermediario",
        "skills": [
         "alg-busca"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-resposta-5",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "alg-busca"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-resposta-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "alg-busca"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "clrs",
     "bentley-pearls"
    ]
   },
   {
    "id": "m4-3",
    "levelId": "n4",
    "title": "Ordenação",
    "titleEn": "Sorting",
    "description": "Algoritmos clássicos de ordenação e seus custos.",
    "prerequisites": [
     "m4-2",
     "m4-4"
    ],
    "skills": [
     {
      "id": "alg-ordenacao",
      "pt": "Algoritmos de ordenação",
      "en": "Sorting algorithms"
     }
    ],
    "outline": [
     "Bubble e insertion",
     "Merge sort",
     "Quick sort",
     "Estabilidade",
     "Limite n log n",
     "Counting e radix sort"
    ],
    "lessons": [
     {
      "id": "l4-ordenacao",
      "moduleId": "m4-3",
      "title": "Algoritmos de ordenação",
      "titleEn": "Sorting algorithms",
      "summary": "Bubble, insertion, merge e quick sort: como funcionam, quanto custam e quando usar cada um.",
      "minutes": 52,
      "skills": [
       "alg-ordenacao"
      ],
      "references": [
       "clrs",
       "sedgewick-algs",
       "mit-6006",
       "python-sorting-howto",
       "ies-study-guide"
      ],
      "theoryTitle": "Ordenar exige preservar identidade e definir empates",
      "cardCount": 3,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e4-sort-0",
        "kind": "predict",
        "difficulty": "facil",
        "skills": [
         "alg-ordenacao"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-sort-1",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "alg-ordenacao"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-sort-2",
        "kind": "mcq",
        "difficulty": "avancado",
        "skills": [
         "alg-ordenacao"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-sort-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "alg-ordenacao",
         "alg-recursao"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l4-quicksort",
      "moduleId": "m4-3",
      "title": "Quicksort por dentro: partição, pivô e valores repetidos",
      "titleEn": "Quicksort in depth: partitioning, pivots and duplicate keys",
      "summary": "Como a partição de Lomuto põe o pivô no lugar definitivo, por que a posição em que o pivô cai decide entre Θ(n log n) e Θ(n²), o que o pivô aleatório garante (e o que não garante), como a partição em três vias resolve valores repetidos e o que as bibliotecas usam de verdade.",
      "minutes": 62,
      "skills": [
       "alg-ordenacao",
       "alg-recursao"
      ],
      "references": [
       "clrs",
       "sedgewick-algs",
       "mit-6006",
       "stanford-cs161",
       "ies-study-guide"
      ],
      "theoryTitle": "Partição como contrato e recursão que reduz o problema",
      "cardCount": 7,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e4-qs-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "alg-ordenacao"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-qs-2",
        "kind": "predict",
        "difficulty": "intermediario",
        "skills": [
         "alg-ordenacao"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-qs-3",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "alg-ordenacao",
         "alg-complexidade"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-qs-4",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "alg-ordenacao",
         "alg-busca"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-qs-5",
        "kind": "mcq",
        "difficulty": "avancado",
        "skills": [
         "alg-ordenacao",
         "alg-complexidade"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-qs-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "alg-ordenacao",
         "alg-recursao"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l4-ordenacao-linear",
      "moduleId": "m4-3",
      "title": "Abaixo de n log n: árvore de decisão, counting sort e radix sort",
      "titleEn": "Beating n log n: decision trees, counting sort and radix sort",
      "summary": "Por que nenhuma ordenação por comparação faz menos que log₂(n!) comparações no pior caso, e como counting sort e radix sort ordenam em tempo linear usando a própria chave como endereço, com a estabilidade como peça central.",
      "minutes": 62,
      "skills": [
       "alg-ordenacao",
       "alg-complexidade"
      ],
      "references": [
       "clrs",
       "sedgewick-algs",
       "mit-6006",
       "python-sorting-howto",
       "ies-study-guide"
      ],
      "theoryTitle": "O limite de comparações e o preço de usar as chaves",
      "cardCount": 7,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e4-lin-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "alg-ordenacao"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-lin-2",
        "kind": "predict",
        "difficulty": "intermediario",
        "skills": [
         "alg-ordenacao",
         "prog-listas"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-lin-3",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "alg-ordenacao",
         "prog-listas"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-lin-4",
        "kind": "fix",
        "difficulty": "intermediario",
        "skills": [
         "alg-ordenacao",
         "py-debugging"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-lin-5",
        "kind": "mcq",
        "difficulty": "avancado",
        "skills": [
         "alg-ordenacao",
         "alg-complexidade"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-lin-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "alg-ordenacao",
         "prog-strings"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "clrs",
     "sedgewick-algs"
    ]
   },
   {
    "id": "m4-4",
    "levelId": "n4",
    "title": "Recursão e dividir para conquistar",
    "titleEn": "Recursion and divide and conquer",
    "description": "Pensar recursivamente e dividir problemas.",
    "prerequisites": [
     "m2-4"
    ],
    "skills": [
     {
      "id": "alg-recursao",
      "pt": "Recursão",
      "en": "Recursion"
     }
    ],
    "outline": [
     "Caso base e passo recursivo",
     "Pilha de chamadas",
     "Memoização",
     "Dividir para conquistar",
     "Backtracking"
    ],
    "lessons": [
     {
      "id": "l4-recursao",
      "moduleId": "m4-4",
      "title": "Recursão e dividir para conquistar",
      "titleEn": "Recursion and divide and conquer",
      "summary": "Funções que chamam a si mesmas: caso base, passo recursivo, pilha de chamadas e memoização.",
      "minutes": 52,
      "skills": [
       "alg-recursao"
      ],
      "references": [
       "cs61a",
       "composing-programs",
       "sicp",
       "clrs",
       "mit-6006",
       "ies-study-guide"
      ],
      "theoryTitle": "Hipótese indutiva, medida decrescente e custo oculto",
      "cardCount": 3,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e4-rec-1",
        "kind": "code",
        "difficulty": "facil",
        "skills": [
         "alg-recursao"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-rec-2",
        "kind": "fix",
        "difficulty": "intermediario",
        "skills": [
         "alg-recursao"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-rec-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "alg-recursao"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l4-dividir-conquistar",
      "moduleId": "m4-4",
      "title": "Dividir para conquistar: dividir, resolver, combinar",
      "titleEn": "Divide and conquer: divide, conquer, combine",
      "summary": "Medir o custo de uma recursão com a árvore de recursão, saber quando dividir ao meio acelera (e quando não), ver o que a divisão faz com a pilha, multiplicar com Karatsuba e achar o k-ésimo menor com a seleção rápida.",
      "minutes": 62,
      "skills": [
       "alg-recursao"
      ],
      "references": [
       "clrs",
       "stanford-cs161",
       "kleinberg-tardos",
       "mit-6006",
       "ies-study-guide"
      ],
      "theoryTitle": "Recorrências que refletem dividir e combinar",
      "cardCount": 7,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e4-dc-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "alg-recursao"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-dc-2",
        "kind": "predict",
        "difficulty": "intermediario",
        "skills": [
         "alg-recursao"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-dc-3",
        "kind": "fix",
        "difficulty": "intermediario",
        "skills": [
         "alg-recursao"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-dc-4",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "alg-recursao"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-dc-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "alg-recursao"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l4-backtracking",
      "moduleId": "m4-4",
      "title": "Backtracking: escolher, explorar, desfazer",
      "titleEn": "Backtracking: choose, explore, unchoose",
      "summary": "Montar a resposta uma decisão por vez numa árvore de decisões, voltar atrás quando não há saída e podar ramos sem futuro: subconjuntos, senhas, combinações, N rainhas e somas exatas.",
      "minutes": 62,
      "skills": [
       "alg-recursao"
      ],
      "references": [
       "cs61a",
       "composing-programs",
       "aima",
       "python-docs",
       "clrs",
       "mit-6006",
       "ies-study-guide"
      ],
      "theoryTitle": "Busca de soluções e poda que não elimina respostas válidas",
      "cardCount": 7,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e4-bt-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "alg-recursao"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-bt-2",
        "kind": "predict",
        "difficulty": "intermediario",
        "skills": [
         "alg-recursao"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-bt-3",
        "kind": "parsons",
        "difficulty": "intermediario",
        "skills": [
         "alg-recursao"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-bt-4",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "alg-recursao"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-bt-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "alg-recursao"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "cs61a",
     "sicp"
    ]
   },
   {
    "id": "m4-5",
    "levelId": "n4",
    "title": "Programação dinâmica e gulosos",
    "titleEn": "Dynamic programming and greedy",
    "description": "Técnicas de projeto para problemas de otimização.",
    "prerequisites": [
     "m4-4",
     "m3-3"
    ],
    "skills": [
     {
      "id": "alg-pd",
      "pt": "Programação dinâmica e algoritmos gulosos",
      "en": "Dynamic programming and greedy algorithms"
     }
    ],
    "outline": [
     "Estado e recorrência",
     "Top-down e bottom-up",
     "Troco, mochila, LCS, edição",
     "Escolha gulosa e prova",
     "Escalonamento de intervalos"
    ],
    "lessons": [
     {
      "id": "l4-pd-guloso",
      "moduleId": "m4-5",
      "title": "Programação dinâmica e algoritmos gulosos",
      "titleEn": "Dynamic programming and greedy algorithms",
      "summary": "Subproblemas sobrepostos, subestrutura ótima, tabelas de PD e quando a escolha gulosa funciona.",
      "minutes": 57,
      "skills": [
       "alg-pd"
      ],
      "references": [
       "clrs",
       "mit-6006",
       "stanford-cs161",
       "kleinberg-tardos",
       "ies-study-guide"
      ],
      "theoryTitle": "Estado suficiente e o risco de decidir sem voltar",
      "cardCount": 3,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e4-pd-0",
        "kind": "predict",
        "difficulty": "facil",
        "skills": [
         "alg-pd"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-pd-1",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "alg-pd"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-pd-2",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "alg-pd"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-pd-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "alg-pd"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l4-pd-mochila-lcs",
      "moduleId": "m4-5",
      "title": "Mochila e LCS: PD em duas dimensões e a resposta por trás do número",
      "titleEn": "Knapsack and LCS: two-dimensional DP and recovering the solution",
      "summary": "Dois problemas que servem de molde para famílias inteiras de PD: escolher um subconjunto dentro de um limite (mochila 0/1) e alinhar duas sequências (maior subsequência comum). Como desenhar um estado com duas coordenadas, reconstruir a escolha a partir da tabela, guardar uma linha só sem trocar de problema, decidir entre top-down e bottom-up e entender por que Θ(n · W) não é polinomial.",
      "minutes": 62,
      "skills": [
       "alg-pd"
      ],
      "references": [
       "clrs",
       "kleinberg-tardos",
       "mit-6006",
       "stanford-cs161",
       "ies-study-guide"
      ],
      "theoryTitle": "Duas dimensões, reconstrução e ordem de atualização",
      "cardCount": 7,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e4-mlcs-1",
        "kind": "fill",
        "difficulty": "facil",
        "skills": [
         "alg-pd"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-mlcs-2",
        "kind": "predict",
        "difficulty": "intermediario",
        "skills": [
         "alg-pd"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-mlcs-3",
        "kind": "parsons",
        "difficulty": "intermediario",
        "skills": [
         "alg-pd"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-mlcs-4",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "alg-pd"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-mlcs-5",
        "kind": "mcq",
        "difficulty": "avancado",
        "skills": [
         "alg-pd",
         "alg-complexidade"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-mlcs-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "alg-pd"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l4-guloso-intervalos",
      "moduleId": "m4-5",
      "title": "Escolha gulosa e prova: escalonamento de intervalos",
      "titleEn": "Greedy choice and proof: interval scheduling",
      "summary": "Como saber se um algoritmo guloso está certo: derrubar regras plausíveis com contraexemplos e provar as que resistem com o argumento de troca e com o \"guloso se mantém à frente\". Aplicado à quadra do bairro (máximo de reservas), às salas da semana de provas (mínimo de salas) e ao ponto em que o guloso para de funcionar e a PD volta: intervalos com valores.",
      "minutes": 62,
      "skills": [
       "alg-pd"
      ],
      "references": [
       "kleinberg-tardos",
       "clrs",
       "stanford-cs161",
       "python-docs",
       "ies-study-guide"
      ],
      "theoryTitle": "Trocas que preservam a quantidade de compromissos",
      "cardCount": 8,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e4-int-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "alg-pd"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-int-2",
        "kind": "predict",
        "difficulty": "intermediario",
        "skills": [
         "alg-pd"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-int-3",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "alg-pd"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-int-4",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "alg-pd",
         "ed-arvores"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-int-5",
        "kind": "fix",
        "difficulty": "intermediario",
        "skills": [
         "alg-pd"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-int-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "alg-pd",
         "alg-busca"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "clrs",
     "kleinberg-tardos"
    ]
   },
   {
    "id": "m4-6",
    "levelId": "n4",
    "title": "Algoritmos em grafos",
    "titleEn": "Graph algorithms",
    "description": "Caminhos mínimos, árvores geradoras e ordenação topológica.",
    "prerequisites": [
     "m3-5",
     "m4-1"
    ],
    "skills": [
     {
      "id": "alg-grafos",
      "pt": "Algoritmos em grafos",
      "en": "Graph algorithms"
     }
    ],
    "outline": [
     "Dijkstra",
     "Bellman-Ford",
     "Ordenação topológica",
     "Árvore geradora mínima (Kruskal, Prim)",
     "Union-Find"
    ],
    "lessons": [
     {
      "id": "l4-dijkstra",
      "moduleId": "m4-6",
      "title": "Caminhos mínimos com pesos: Dijkstra",
      "titleEn": "Weighted shortest paths: Dijkstra",
      "summary": "Quando as arestas têm custo, a BFS não basta. Dijkstra usa uma fila de prioridade.",
      "minutes": 47,
      "skills": [
       "alg-grafos"
      ],
      "references": [
       "clrs",
       "sedgewick-algs",
       "python-docs",
       "mit-6006",
       "ies-study-guide"
      ],
      "theoryTitle": "Distâncias provisórias e o momento de torná-las definitivas",
      "cardCount": 2,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e4-dij-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "alg-grafos"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-dij-desafio",
        "kind": "code",
        "difficulty": "avancado",
        "skills": [
         "alg-grafos"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l4-ordenacao-topologica",
      "moduleId": "m4-6",
      "title": "Ordenação topológica: dependências na ordem certa",
      "titleEn": "Topological sort: dependencies in the right order",
      "summary": "Ordenar tarefas que dependem umas das outras com o algoritmo de Kahn (graus de entrada e uma fila) ou pela pós-ordem invertida da DFS, acusar dependência circular pelo que sobra, contar semestres e usar a ordem topológica para achar caminhos mínimos e o caminho crítico de um DAG em O(V + E), mesmo com pesos negativos.",
      "minutes": 62,
      "skills": [
       "alg-grafos"
      ],
      "references": [
       "clrs",
       "sedgewick-algs",
       "mit-6006",
       "python-docs",
       "ies-study-guide"
      ],
      "theoryTitle": "Dependências, fontes disponíveis e ciclos que bloqueiam",
      "cardCount": 8,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e4-topo-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "alg-grafos"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-topo-2",
        "kind": "predict",
        "difficulty": "intermediario",
        "skills": [
         "alg-grafos"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-topo-3",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "alg-grafos"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-topo-4",
        "kind": "fix",
        "difficulty": "intermediario",
        "skills": [
         "alg-grafos"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-topo-5",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "alg-grafos"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-topo-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "alg-grafos"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l4-arvore-geradora-minima",
      "moduleId": "m4-6",
      "title": "Árvore geradora mínima: Kruskal e Prim",
      "titleEn": "Minimum spanning trees: Kruskal and Prim",
      "summary": "Ligar todos os pontos de uma rede com o menor custo total: árvores geradoras, a propriedade do corte que justifica os algoritmos gulosos, Kruskal (ordenar arestas e pular ciclos com Union-Find), Prim (crescer a árvore com um heap, primo do Dijkstra) e o uso da árvore mínima para agrupar pontos.",
      "minutes": 62,
      "skills": [
       "alg-grafos"
      ],
      "references": [
       "clrs",
       "kleinberg-tardos",
       "sedgewick-algs",
       "stanford-cs161",
       "ies-study-guide"
      ],
      "theoryTitle": "Cortes, escolhas seguras e objetivos que não se confundem",
      "cardCount": 8,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e4-agm-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "alg-grafos"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-agm-2",
        "kind": "predict",
        "difficulty": "intermediario",
        "skills": [
         "alg-grafos"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-agm-3",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "alg-grafos"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-agm-4",
        "kind": "fill",
        "difficulty": "intermediario",
        "skills": [
         "alg-grafos"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-agm-5",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "alg-grafos"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e4-agm-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "alg-grafos"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "clrs",
     "sedgewick-algs"
    ]
   }
  ]
 },
 {
  "id": "n5",
  "number": 5,
  "title": "Programação Orientada a Objetos",
  "titleEn": "Object-Oriented Programming",
  "goal": "Modelar sistemas com objetos coesos e pouco acoplados, usando princípios e padrões com critério.",
  "why": "A maior parte do software comercial (Java, C#, Python, TypeScript) é organizada com objetos. Entender POO de verdade — não só sintaxe de classe — é o que permite ler e evoluir sistemas grandes.",
  "modules": [
   {
    "id": "m5-1",
    "levelId": "n5",
    "title": "Classes e objetos",
    "titleEn": "Classes and objects",
    "description": "Estado, comportamento, encapsulamento e métodos especiais.",
    "prerequisites": [
     "m2-5"
    ],
    "skills": [
     {
      "id": "poo-classes",
      "pt": "Classes, objetos e encapsulamento",
      "en": "Classes, objects and encapsulation"
     }
    ],
    "outline": [
     "Classes e instâncias",
     "__init__ e self",
     "Encapsulamento e propriedades",
     "Métodos especiais",
     "dataclasses"
    ],
    "lessons": [
     {
      "id": "l5-classes",
      "moduleId": "m5-1",
      "title": "Classes, objetos e encapsulamento",
      "titleEn": "Classes, objects and encapsulation",
      "summary": "Modelar entidades com estado e comportamento, proteger invariantes e escrever métodos especiais.",
      "minutes": 52,
      "skills": [
       "poo-classes"
      ],
      "references": [
       "python-tutorial",
       "python-docs",
       "cmu-15112",
       "python-objects-deep",
       "sicp",
       "ies-study-guide"
      ],
      "theoryTitle": "Objetos como contratos que preservam regras",
      "cardCount": 3,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e5-cls-1",
        "kind": "code",
        "difficulty": "facil",
        "skills": [
         "poo-classes"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e5-cls-2",
        "kind": "predict",
        "difficulty": "intermediario",
        "skills": [
         "poo-classes"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e5-cls-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "poo-classes"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "python-tutorial"
    ]
   },
   {
    "id": "m5-2",
    "levelId": "n5",
    "title": "Herança, polimorfismo e composição",
    "titleEn": "Inheritance, polymorphism and composition",
    "description": "Reaproveitar e combinar comportamentos com critério.",
    "prerequisites": [
     "m5-1"
    ],
    "skills": [
     {
      "id": "poo-heranca",
      "pt": "Herança, polimorfismo e composição",
      "en": "Inheritance, polymorphism and composition"
     }
    ],
    "outline": [
     "Herança e super()",
     "Polimorfismo e duck typing",
     "Classes abstratas",
     "Composição sobre herança"
    ],
    "lessons": [
     {
      "id": "l5-heranca-composicao",
      "moduleId": "m5-2",
      "title": "Herança, polimorfismo, abstração e composição",
      "titleEn": "Inheritance, polymorphism, abstraction and composition",
      "summary": "Reaproveitar comportamento, tratar objetos diferentes de forma uniforme e saber quando preferir composição.",
      "minutes": 52,
      "skills": [
       "poo-heranca"
      ],
      "references": [
       "gof",
       "python-docs",
       "refactoring",
       "python-objects-deep",
       "v7-web-protocol",
       "ies-study-guide"
      ],
      "theoryTitle": "Contratos de comportamento: quando um objeto pode substituir outro",
      "cardCount": 2,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e5-her-0",
        "kind": "predict",
        "difficulty": "facil",
        "skills": [
         "poo-heranca"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e5-her-1",
        "kind": "predict",
        "difficulty": "intermediario",
        "skills": [
         "poo-heranca"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e5-her-2",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "poo-heranca"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e5-her-desafio",
        "kind": "code",
        "difficulty": "avancado",
        "skills": [
         "poo-heranca"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "gof"
    ]
   },
   {
    "id": "m5-3",
    "levelId": "n5",
    "title": "SOLID e padrões de projeto",
    "titleEn": "SOLID and design patterns",
    "description": "Princípios de design e o vocabulário dos padrões.",
    "prerequisites": [
     "m5-2"
    ],
    "skills": [
     {
      "id": "poo-solid",
      "pt": "SOLID e padrões de projeto",
      "en": "SOLID and design patterns"
     }
    ],
    "outline": [
     "Cinco princípios SOLID",
     "Acoplamento e coesão",
     "Strategy, Observer, Factory, Adapter, Decorator",
     "KISS e YAGNI"
    ],
    "lessons": [
     {
      "id": "l5-solid-padroes",
      "moduleId": "m5-3",
      "title": "SOLID e padrões de projeto",
      "titleEn": "SOLID and design patterns",
      "summary": "Cinco princípios para código flexível e os padrões mais usados no dia a dia.",
      "minutes": 47,
      "skills": [
       "poo-solid"
      ],
      "references": [
       "gof",
       "refactoring",
       "swe-at-google",
       "v7-web-protocol",
       "swe-testing-deep",
       "ies-study-guide"
      ],
      "theoryTitle": "Separar decisões que mudam: abstrações com custo e propósito",
      "cardCount": 3,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e5-solid-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "poo-solid"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e5-solid-2",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "poo-solid"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e5-solid-desafio",
        "kind": "code",
        "difficulty": "avancado",
        "skills": [
         "poo-solid"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "gof",
     "refactoring"
    ]
   }
  ]
 },
 {
  "id": "n6",
  "number": 6,
  "title": "Desenvolvimento Web",
  "titleEn": "Web Development",
  "goal": "Construir interfaces acessíveis e APIs bem projetadas, entendendo o que acontece entre navegador e servidor.",
  "why": "A web é a plataforma mais universal que existe. Aprender pelos fundamentos (HTML, CSS, JS, HTTP) antes de frameworks ajuda a entender o que um framework faz por você.",
  "modules": [
   {
    "id": "m6-1",
    "levelId": "n6",
    "title": "HTML, CSS e acessibilidade",
    "titleEn": "HTML, CSS and accessibility",
    "description": "Estrutura semântica, estilo, layout responsivo e WCAG.",
    "prerequisites": [
     "m0-3"
    ],
    "skills": [
     {
      "id": "web-html-css",
      "pt": "HTML, CSS e acessibilidade",
      "en": "HTML, CSS and accessibility"
     }
    ],
    "outline": [
     "HTML semântico",
     "Formulários acessíveis",
     "Cascata e especificidade",
     "Modelo de caixa",
     "Flexbox e Grid",
     "Responsividade",
     "WCAG 2.2"
    ],
    "lessons": [
     {
      "id": "l6-html-css",
      "moduleId": "m6-1",
      "title": "HTML semântico, CSS e acessibilidade",
      "titleEn": "Semantic HTML, CSS and accessibility",
      "summary": "A estrutura da página, o modelo de caixa, flexbox/grid, layout responsivo e por que semântica é acessibilidade.",
      "minutes": 52,
      "skills": [
       "web-html-css"
      ],
      "references": [
       "mdn",
       "wcag",
       "w3c-html",
       "mdn-semantics-deep",
       "mdn-accessibility-deep",
       "ies-study-guide"
      ],
      "theoryTitle": "Documento, apresentação e interação acessível",
      "cardCount": 3,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e6-html-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "web-html-css"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e6-html-2",
        "kind": "fill",
        "difficulty": "facil",
        "skills": [
         "web-html-css"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e6-css-1",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "web-html-css"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e6-html-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "web-html-css",
         "prog-funcoes"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "mdn",
     "wcag"
    ]
   },
   {
    "id": "m6-2",
    "levelId": "n6",
    "title": "JavaScript e DOM",
    "titleEn": "JavaScript and the DOM",
    "description": "A linguagem do navegador, eventos e assincronia.",
    "prerequisites": [
     "m6-1",
     "m1-5"
    ],
    "skills": [
     {
      "id": "web-javascript",
      "pt": "JavaScript e DOM",
      "en": "JavaScript and the DOM"
     }
    ],
    "outline": [
     "Sintaxe comparada com Python",
     "Arrays: map, filter, reduce",
     "DOM e eventos",
     "Promises e async/await",
     "Event loop",
     "Módulos ES e TypeScript (introdução)"
    ],
    "lessons": [
     {
      "id": "l6-javascript-dom",
      "moduleId": "m6-2",
      "title": "JavaScript e o DOM",
      "titleEn": "JavaScript and the DOM",
      "summary": "A linguagem do navegador comparada com Python, o DOM, eventos e programação assíncrona.",
      "minutes": 57,
      "skills": [
       "web-javascript"
      ],
      "references": [
       "mdn",
       "ecmascript",
       "javascript-info",
       "v7-web-execution",
       "ies-study-guide"
      ],
      "theoryTitle": "Eventos, estado e respostas fora de ordem no navegador",
      "cardCount": 3,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e6-js-1",
        "kind": "predict",
        "difficulty": "facil",
        "skills": [
         "web-javascript"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e6-js-2",
        "kind": "predict",
        "difficulty": "avancado",
        "skills": [
         "web-javascript"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e6-js-3",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "web-javascript",
         "seg-web"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e6-js-desafio",
        "kind": "predict",
        "difficulty": "desafio",
        "skills": [
         "web-javascript"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "mdn",
     "ecmascript"
    ]
   },
   {
    "id": "m6-3",
    "levelId": "n6",
    "title": "HTTP, REST e APIs",
    "titleEn": "HTTP, REST and APIs",
    "description": "Projetar e consumir APIs.",
    "prerequisites": [
     "m6-2"
    ],
    "skills": [
     {
      "id": "web-http-api",
      "pt": "HTTP e APIs REST",
      "en": "HTTP and REST APIs"
     }
    ],
    "outline": [
     "Métodos e status",
     "Design REST",
     "JSON e validação",
     "fetch",
     "Idempotência",
     "CORS e cache"
    ],
    "lessons": [
     {
      "id": "l6-http-rest",
      "moduleId": "m6-3",
      "title": "HTTP, REST e APIs JSON",
      "titleEn": "HTTP, REST and JSON APIs",
      "summary": "Métodos, status, cabeçalhos, design de APIs REST, JSON e consumo com fetch.",
      "minutes": 52,
      "skills": [
       "web-http-api"
      ],
      "references": [
       "mdn-http",
       "rfc9110",
       "owasp-api",
       "v7-web-http",
       "ies-study-guide"
      ],
      "theoryTitle": "Repetição de requisições: segurança, idempotência e conflitos",
      "cardCount": 3,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e6-http-0",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "web-http-api"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e6-http-1",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "web-http-api"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e6-http-2",
        "kind": "code",
        "difficulty": "avancado",
        "skills": [
         "web-http-api"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e6-http-desafio",
        "kind": "mcq",
        "difficulty": "desafio",
        "skills": [
         "web-http-api"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "mdn-http",
     "rfc9110"
    ]
   },
   {
    "id": "m6-4",
    "levelId": "n6",
    "title": "Back-end e autenticação",
    "titleEn": "Back-end and authentication",
    "description": "Servidores, persistência, sessões, tokens e frameworks.",
    "prerequisites": [
     "m6-3",
     "m7-1",
     "m5-1"
    ],
    "skills": [
     {
      "id": "web-backend",
      "pt": "Back-end e autenticação",
      "en": "Back-end and authentication"
     }
    ],
    "outline": [
     "Arquitetura de um servidor web",
     "Frameworks (FastAPI, Express, Fastify)",
     "Camadas: rotas, serviços, repositórios",
     "Sessões com cookies × tokens (JWT)",
     "Hash de senhas",
     "Validação e tratamento de erros",
     "Front-end com componentes (React)"
    ],
    "lessons": [
     {
      "id": "l6-backend-auth",
      "moduleId": "m6-4",
      "title": "Back-end: rotas, camadas, validação e sessões",
      "titleEn": "Back-end: routes, layers, validation and sessions",
      "summary": "Como um servidor web organiza o código em camadas, valida a entrada, trata erros e sabe quem é o usuário (cookies de sessão × tokens).",
      "minutes": 62,
      "skills": [
       "web-backend"
      ],
      "references": [
       "owasp-cheatsheets",
       "mdn-http",
       "owasp-authorization-deep",
       "ies-study-guide"
      ],
      "theoryTitle": "Autenticação, autorização e a fronteira de confiança de cada pedido",
      "cardCount": 4,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e6-back-0",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "web-backend"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e6-back-1",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "web-backend"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e6-back-2",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "web-backend"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e6-back-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "web-backend"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "owasp-cheatsheets",
     "mdn-http"
    ]
   }
  ]
 },
 {
  "id": "n7",
  "number": 7,
  "title": "Banco de Dados",
  "titleEn": "Databases",
  "goal": "Modelar, consultar e manter dados com consistência e desempenho.",
  "why": "Quase todo sistema real gira em torno dos seus dados. Saber SQL, modelagem e transações é exigido de qualquer desenvolvedor back-end, de dados ou full stack.",
  "modules": [
   {
    "id": "m7-1",
    "levelId": "n7",
    "title": "Modelo relacional e SQL",
    "titleEn": "Relational model and SQL",
    "description": "Tabelas, chaves e consultas.",
    "prerequisites": [
     "m2-2"
    ],
    "skills": [
     {
      "id": "bd-sql",
      "pt": "SQL",
      "en": "SQL"
     }
    ],
    "outline": [
     "Tabelas e chaves",
     "SELECT, WHERE, ORDER BY, LIMIT",
     "Agregações e GROUP BY",
     "INSERT, UPDATE, DELETE",
     "Consultas parametrizadas"
    ],
    "lessons": [
     {
      "id": "l7-sql",
      "moduleId": "m7-1",
      "title": "Modelo relacional e SQL",
      "titleEn": "The relational model and SQL",
      "summary": "Tabelas, chaves, SELECT, WHERE, ORDER BY, agregações e GROUP BY.",
      "minutes": 52,
      "skills": [
       "bd-sql"
      ],
      "references": [
       "postgres-docs",
       "sqlite-docs",
       "cmu-15445",
       "v7-web-sql-null",
       "v7-web-sql-aggregate",
       "ies-study-guide"
      ],
      "theoryTitle": "NULL, agregações e o significado de uma consulta",
      "cardCount": 3,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e7-sql-1",
        "kind": "sql",
        "difficulty": "facil",
        "skills": [
         "bd-sql"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-sql-2",
        "kind": "sql",
        "difficulty": "intermediario",
        "skills": [
         "bd-sql"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-sql-3",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "bd-sql"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-sql-desafio",
        "kind": "sql",
        "difficulty": "avancado",
        "skills": [
         "bd-sql"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l7-restricoes-dml",
      "moduleId": "m7-1",
      "title": "Tabelas com regras: restrições, INSERT, UPDATE e DELETE",
      "titleEn": "Tables with rules: constraints, INSERT, UPDATE and DELETE",
      "summary": "Criar tabelas com CREATE TABLE e pôr as regras do negócio no próprio banco (NOT NULL, UNIQUE, CHECK, DEFAULT, chave primária, composta e estrangeira com ON DELETE), escolher tipos no SQLite e no PostgreSQL, e alterar dados com INSERT, UPDATE, DELETE, UPSERT e RETURNING seguindo o ritual de conferir antes e depois.",
      "minutes": 57,
      "skills": [
       "bd-sql"
      ],
      "references": [
       "sqlite-docs",
       "postgres-docs",
       "cmu-15445",
       "ies-study-guide"
      ],
      "theoryTitle": "Onde a regra mora: o alcance de cada restrição",
      "cardCount": 8,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e7-dml-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "bd-sql"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-dml-2",
        "kind": "fill",
        "difficulty": "intermediario",
        "skills": [
         "bd-sql"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-dml-3",
        "kind": "predict",
        "difficulty": "intermediario",
        "skills": [
         "bd-sql"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-dml-4",
        "kind": "sql",
        "difficulty": "intermediario",
        "skills": [
         "bd-sql"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-dml-5",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "bd-sql"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-dml-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "bd-sql"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l7-sql-no-python",
      "moduleId": "m7-1",
      "title": "SQL no Python: consultas parametrizadas, cursores e paginação",
      "titleEn": "SQL from Python: parameterized queries, cursors and pagination",
      "summary": "Como um programa conversa com o banco pelo módulo sqlite3 (DB-API): cursores, fetchone e fetchall, Row, executemany, rowcount e lastrowid; por que um valor passado como parâmetro nunca vira SQL num comando preparado; o que não pode ser parâmetro e como a lista branca resolve; listas no IN, buscas com LIKE e paginação com LIMIT/OFFSET e por chave.",
      "minutes": 57,
      "skills": [
       "bd-sql"
      ],
      "references": [
       "python-docs",
       "sqlite-docs",
       "postgres-docs",
       "owasp-cheatsheets",
       "ies-study-guide"
      ],
      "theoryTitle": "Código e dados em canais separados, e a transação que a conexão guarda",
      "cardCount": 8,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e7-param-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "bd-sql"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-param-2",
        "kind": "sql",
        "difficulty": "facil",
        "skills": [
         "bd-sql"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-param-3",
        "kind": "predict",
        "difficulty": "intermediario",
        "skills": [
         "bd-sql"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-param-4",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "bd-sql"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-param-5",
        "kind": "fix",
        "difficulty": "intermediario",
        "skills": [
         "bd-sql"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-param-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "bd-sql"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "postgres-docs",
     "sqlite-docs"
    ]
   },
   {
    "id": "m7-2",
    "levelId": "n7",
    "title": "Relacionamentos e JOINs",
    "titleEn": "Relationships and JOINs",
    "description": "Combinar tabelas relacionadas.",
    "prerequisites": [
     "m7-1"
    ],
    "skills": [
     {
      "id": "bd-joins",
      "pt": "Relacionamentos e JOINs",
      "en": "Relationships and JOINs"
     }
    ],
    "outline": [
     "1:N e N:N",
     "INNER JOIN",
     "LEFT JOIN e anti-join",
     "NULL",
     "Subconsultas"
    ],
    "lessons": [
     {
      "id": "l7-joins",
      "moduleId": "m7-2",
      "title": "Relacionamentos e JOINs",
      "titleEn": "Relationships and JOINs",
      "summary": "Um-para-muitos, muitos-para-muitos, INNER e LEFT JOIN.",
      "minutes": 47,
      "skills": [
       "bd-joins"
      ],
      "references": [
       "postgres-docs",
       "sqlite-docs",
       "cmu-15445",
       "v7-web-sql-joins",
       "ies-study-guide"
      ],
      "theoryTitle": "Cardinalidade: prever quantas linhas um JOIN pode produzir",
      "cardCount": 2,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e7-join-0",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "bd-joins"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-join-1",
        "kind": "sql",
        "difficulty": "intermediario",
        "skills": [
         "bd-joins"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-join-2",
        "kind": "sql",
        "difficulty": "intermediario",
        "skills": [
         "bd-joins"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-join-desafio",
        "kind": "sql",
        "difficulty": "desafio",
        "skills": [
         "bd-joins",
         "bd-sql"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l7-null-tres-valores",
      "moduleId": "m7-2",
      "title": "NULL e a lógica de três valores",
      "titleEn": "NULL and three-valued logic",
      "summary": "Por que uma comparação com NULL não dá verdadeiro nem falso, quais linhas o WHERE descarta por isso, como COUNT, SUM e AVG tratam valores ausentes, COALESCE e NULLIF, e as armadilhas do LEFT JOIN: filtrar no WHERE o que devia estar no ON e contar 1 onde devia ser 0.",
      "minutes": 57,
      "skills": [
       "bd-joins",
       "bd-sql"
      ],
      "references": [
       "postgres-docs",
       "sqlite-docs",
       "cmu-15445",
       "v7-web-sql-null",
       "ies-study-guide"
      ],
      "theoryTitle": "O que um NULL quer dizer: desconhecido, inaplicável ou ainda não aconteceu",
      "cardCount": 10,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e7-null-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "bd-joins"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-null-2",
        "kind": "sql",
        "difficulty": "facil",
        "skills": [
         "bd-joins",
         "bd-sql"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-null-3",
        "kind": "predict",
        "difficulty": "intermediario",
        "skills": [
         "bd-joins",
         "bd-sql"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-null-4",
        "kind": "sql",
        "difficulty": "intermediario",
        "skills": [
         "bd-joins"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-null-5",
        "kind": "fix",
        "difficulty": "intermediario",
        "skills": [
         "bd-joins",
         "prog-condicionais"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-null-desafio",
        "kind": "code",
        "difficulty": "avancado",
        "skills": [
         "bd-joins",
         "bd-sql"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l7-subconsultas",
      "moduleId": "m7-2",
      "title": "Subconsultas: IN, EXISTS e tabelas derivadas",
      "titleEn": "Subqueries: IN, EXISTS and derived tables",
      "summary": "Consultas dentro de consultas: a subconsulta escalar que compara cada linha com uma média, a correlacionada que é refeita para cada linha, IN e EXISTS para filtrar sem repetir linhas, NOT EXISTS no lugar do NOT IN que quebra com NULL, e tabelas derivadas e WITH para agregar antes de juntar sem multiplicar linhas.",
      "minutes": 62,
      "skills": [
       "bd-joins",
       "bd-sql"
      ],
      "references": [
       "postgres-docs",
       "sqlite-docs",
       "cmu-15445",
       "ies-study-guide"
      ],
      "theoryTitle": "Algum, nenhum e todos: quantificadores escritos em SQL",
      "cardCount": 8,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e7-subq-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "bd-joins",
         "bd-sql"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-subq-2",
        "kind": "predict",
        "difficulty": "intermediario",
        "skills": [
         "bd-joins"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-subq-3",
        "kind": "sql",
        "difficulty": "intermediario",
        "skills": [
         "bd-joins"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-subq-4",
        "kind": "sql",
        "difficulty": "avancado",
        "skills": [
         "bd-joins",
         "bd-sql"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-subq-5",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "bd-joins",
         "ed-hash"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-subq-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "bd-joins",
         "bd-sql"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "postgres-docs"
    ]
   },
   {
    "id": "m7-3",
    "levelId": "n7",
    "title": "Normalização, índices e transações",
    "titleEn": "Normalization, indexes and transactions",
    "description": "Consistência e desempenho.",
    "prerequisites": [
     "m7-2"
    ],
    "skills": [
     {
      "id": "bd-modelagem",
      "pt": "Modelagem, índices e transações",
      "en": "Modeling, indexes and transactions"
     }
    ],
    "outline": [
     "Formas normais",
     "Índices B-tree e EXPLAIN",
     "ACID",
     "Níveis de isolamento",
     "Otimização de consultas"
    ],
    "lessons": [
     {
      "id": "l7-normalizacao-indices",
      "moduleId": "m7-3",
      "title": "Normalização, índices e transações",
      "titleEn": "Normalization, indexes and transactions",
      "summary": "Evitar anomalias, acelerar consultas com índices B-tree e garantir consistência com ACID.",
      "minutes": 52,
      "skills": [
       "bd-modelagem"
      ],
      "references": [
       "cmu-15445",
       "postgres-docs",
       "sqlite-docs",
       "ddia",
       "postgres-transactions-deep",
       "postgres-isolation-deep",
       "ies-study-guide"
      ],
      "theoryTitle": "Invariantes de dados e limites de uma transação",
      "cardCount": 3,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e7-norm-1",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "bd-modelagem"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-idx-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "bd-modelagem"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-tx-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "bd-modelagem"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l7-isolamento-concorrencia",
      "moduleId": "m7-3",
      "title": "Transações concorrentes e níveis de isolamento",
      "titleEn": "Concurrent transactions and isolation levels",
      "summary": "O que dá errado quando duas transações mexem nos mesmos dados ao mesmo tempo (leitura suja, leitura não repetível, fantasma, atualização perdida e write skew), o que cada nível de isolamento garante no padrão SQL, no PostgreSQL e no SQLite, como o MVCC entrega instantâneos e como escrever código que não perde dinheiro: UPDATE atômico, FOR UPDATE, versão otimista e repetição.",
      "minutes": 62,
      "skills": [
       "bd-modelagem"
      ],
      "references": [
       "postgres-docs",
       "sqlite-docs",
       "ddia",
       "cmu-15445",
       "python-docs",
       "postgres-isolation-deep",
       "postgres-transactions-deep",
       "ies-study-guide"
      ],
      "theoryTitle": "Regras que atravessam linhas: por que o write skew escapa do instantâneo",
      "cardCount": 8,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e7-iso-anomalia",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "bd-modelagem"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-iso-escala",
        "kind": "predict",
        "difficulty": "intermediario",
        "skills": [
         "bd-modelagem"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-iso-debito",
        "kind": "fix",
        "difficulty": "intermediario",
        "skills": [
         "bd-modelagem",
         "bd-sql"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-iso-plantao",
        "kind": "mcq",
        "difficulty": "avancado",
        "skills": [
         "bd-modelagem"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-iso-versoes",
        "kind": "sql",
        "difficulty": "avancado",
        "skills": [
         "bd-modelagem",
         "bd-joins"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-iso-mvcc",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "bd-modelagem",
         "poo-classes"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l7-otimizacao-consultas",
      "moduleId": "m7-3",
      "title": "Otimização de consultas: índices compostos e EXPLAIN",
      "titleEn": "Query optimization: composite indexes and EXPLAIN",
      "summary": "Como um índice B-tree é organizado por dentro, por que a ordem das colunas de um índice composto decide quais consultas ele acelera (regra do prefixo mais à esquerda), índices de cobertura, condições que impedem o uso do índice, como ler o EXPLAIN do SQLite e do PostgreSQL e como achar e corrigir o problema N+1.",
      "minutes": 62,
      "skills": [
       "bd-modelagem"
      ],
      "references": [
       "postgres-docs",
       "sqlite-docs",
       "cmu-15445",
       "ddia",
       "ies-study-guide"
      ],
      "theoryTitle": "Custo de uma consulta: páginas lidas e estimativas do planejador",
      "cardCount": 9,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e7-otim-prefixo",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "bd-modelagem"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-otim-bisect",
        "kind": "predict",
        "difficulty": "intermediario",
        "skills": [
         "bd-modelagem",
         "alg-busca"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-otim-n1",
        "kind": "sql",
        "difficulty": "intermediario",
        "skills": [
         "bd-modelagem",
         "bd-joins"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-otim-indices",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "bd-modelagem"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-otim-seletividade",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "bd-modelagem"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-otim-indice-composto",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "bd-modelagem",
         "alg-busca"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "cmu-15445",
     "ddia"
    ]
   },
   {
    "id": "m7-4",
    "levelId": "n7",
    "title": "NoSQL e dados em escala",
    "titleEn": "NoSQL and data at scale",
    "description": "Documentos, chave-valor, grafos e quando usar cada um.",
    "prerequisites": [
     "m7-3"
    ],
    "skills": [
     {
      "id": "bd-nosql",
      "pt": "NoSQL",
      "en": "NoSQL"
     }
    ],
    "outline": [
     "Documentos (MongoDB)",
     "Chave-valor (Redis)",
     "Colunares e grafos",
     "Teorema CAP",
     "Replicação e particionamento",
     "Escolhendo o banco certo"
    ],
    "lessons": [
     {
      "id": "l7-nosql-escala",
      "moduleId": "m7-4",
      "title": "NoSQL, replicação, particionamento e CAP",
      "titleEn": "NoSQL, replication, partitioning and CAP",
      "summary": "Quando um banco relacional não é a melhor escolha, os modelos NoSQL (documento, chave-valor, coluna, grafo) e como dados são espalhados por várias máquinas.",
      "minutes": 57,
      "skills": [
       "bd-nosql"
      ],
      "references": [
       "ddia",
       "cmu-15445",
       "v7-web-cap",
       "ies-study-guide"
      ],
      "theoryTitle": "CAP como limite de coordenação, não como cardápio de três opções",
      "cardCount": 4,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e7-nosql-0",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "bd-nosql"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-nosql-1",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "bd-nosql"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-nosql-2",
        "kind": "mcq",
        "difficulty": "avancado",
        "skills": [
         "bd-nosql"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-nosql-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "bd-nosql"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l7-documentos-chave-valor",
      "moduleId": "m7-4",
      "title": "Modelando para o acesso: documentos e chave-valor",
      "titleEn": "Modeling for access patterns: documents and key-value",
      "summary": "Como dar forma aos dados no MongoDB e no Redis a partir das perguntas que o sistema faz: embutir ou referenciar, o que copiar de propósito, consultas com notação de ponto e pipeline de agregação, as cinco estruturas do Redis, comandos atômicos, cache-aside e limitação de taxa.",
      "minutes": 62,
      "skills": [
       "bd-nosql"
      ],
      "references": [
       "ddia",
       "postgres-docs",
       "sqlite-docs",
       "cmu-15445",
       "ies-study-guide"
      ],
      "theoryTitle": "Modelar pelo acesso é escolher quais perguntas ficam baratas",
      "cardCount": 8,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e7-docs-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "bd-nosql"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-docs-2",
        "kind": "parsons",
        "difficulty": "intermediario",
        "skills": [
         "bd-nosql"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-docs-3",
        "kind": "sql",
        "difficulty": "intermediario",
        "skills": [
         "bd-nosql",
         "bd-sql"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-docs-4",
        "kind": "predict",
        "difficulty": "intermediario",
        "skills": [
         "bd-nosql"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-docs-5",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "bd-nosql"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-docs-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "bd-nosql"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l7-replicacao-consistencia",
      "moduleId": "m7-4",
      "title": "Replicação a fundo: atraso, quóruns e conflitos",
      "titleEn": "Replication in depth: lag, quorums and conflicts",
      "summary": "O que acontece entre o líder e as réplicas: replicação síncrona e assíncrona, as anomalias do atraso e como evitá-las, failover e cérebro dividido, quóruns sem líder com R + W > N e reparo na leitura, conflitos resolvidos pela última escrita ou por CRDTs, e o CAP refinado pelo PACELC.",
      "minutes": 62,
      "skills": [
       "bd-nosql"
      ],
      "references": [
       "ddia",
       "postgres-docs",
       "cmu-15445",
       "ies-study-guide"
      ],
      "theoryTitle": "Garantias de sessão: consistência descrita pelo que a pessoa vê",
      "cardCount": 10,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e7-repl-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "bd-nosql"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-repl-2",
        "kind": "predict",
        "difficulty": "intermediario",
        "skills": [
         "bd-nosql"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-repl-3",
        "kind": "sql",
        "difficulty": "intermediario",
        "skills": [
         "bd-nosql",
         "bd-joins"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-repl-4",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "bd-nosql"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-repl-5",
        "kind": "mcq",
        "difficulty": "avancado",
        "skills": [
         "bd-nosql"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e7-repl-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "bd-nosql"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "ddia",
     "cmu-15445"
    ]
   }
  ]
 },
 {
  "id": "n8",
  "number": 8,
  "title": "Sistemas Operacionais",
  "titleEn": "Operating Systems",
  "goal": "Entender processos, threads, memória, arquivos e concorrência — o que acontece por baixo de todo programa.",
  "why": "Bugs de desempenho, travamentos e condições de corrida só fazem sentido quando você entende o sistema operacional. É uma disciplina central em todas as graduações de referência (OSTEP, MIT 6.1810).",
  "modules": [
   {
    "id": "m8-1",
    "levelId": "n8",
    "title": "Processos, threads e escalonamento",
    "titleEn": "Processes, threads and scheduling",
    "description": "Virtualização da CPU.",
    "prerequisites": [
     "m0-2",
     "m2-5"
    ],
    "skills": [
     {
      "id": "so-processos",
      "pt": "Processos e escalonamento",
      "en": "Processes and scheduling"
     }
    ],
    "outline": [
     "Processos e estados",
     "fork/exec",
     "Threads",
     "Escalonamento: FCFS, SJF, RR, prioridades",
     "Troca de contexto"
    ],
    "lessons": [
     {
      "id": "l8-processos-threads",
      "moduleId": "m8-1",
      "title": "Processos, threads e escalonamento",
      "titleEn": "Processes, threads and scheduling",
      "summary": "Como o SO cria a ilusão de que tudo roda ao mesmo tempo, e a diferença entre processo e thread.",
      "minutes": 52,
      "skills": [
       "so-processos"
      ],
      "references": [
       "ostep",
       "tanenbaum-so",
       "linux-man",
       "v7-web-threads",
       "ostep-locks-deep",
       "ies-study-guide"
      ],
      "theoryTitle": "Concorrência, paralelismo e o que realmente é compartilhado",
      "cardCount": 3,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e8-proc-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "so-processos"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e8-proc-2",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "so-processos",
         "ed-pilhas-filas"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e8-proc-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "so-processos"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l8-fork-exec-wait",
      "moduleId": "m8-1",
      "title": "Criando processos: fork, exec, wait e a árvore de processos",
      "titleEn": "Creating processes: fork, exec, wait and the process tree",
      "summary": "O que o kernel guarda sobre cada processo, como o Unix cria processos com fork, troca o programa com exec e recolhe o resultado com wait, de onde vêm zumbis e órfãos, como o shell faz redirecionamentos, por que cd não pode ser um programa à parte e onde as threads entram nessa história.",
      "minutes": 57,
      "skills": [
       "so-processos"
      ],
      "references": [
       "ostep",
       "linux-man",
       "tanenbaum-so",
       "python-docs",
       "ies-study-guide"
      ],
      "theoryTitle": "O que atravessa fork e exec: descritores, deslocamentos e pontas de pipe",
      "cardCount": 8,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e8-fork-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "so-processos"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e8-fork-2",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "so-processos"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e8-fork-3",
        "kind": "parsons",
        "difficulty": "intermediario",
        "skills": [
         "so-processos"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e8-fork-4",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "so-processos"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e8-fork-5",
        "kind": "fix",
        "difficulty": "intermediario",
        "skills": [
         "so-processos"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e8-fork-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "so-processos"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l8-prioridades-mlfq",
      "moduleId": "m8-1",
      "title": "Prioridades, MLFQ e o custo da troca de contexto",
      "titleEn": "Priorities, MLFQ and the cost of context switching",
      "summary": "Como medir um escalonador (retorno × resposta), como prioridades causam inanição e o envelhecimento a evita, como a fila multinível com realimentação aprende quem é interativo sem saber a duração de ninguém, o que acontece numa troca de contexto e como o tamanho do quantum equilibra resposta e desperdício.",
      "minutes": 62,
      "skills": [
       "so-processos"
      ],
      "references": [
       "ostep",
       "tanenbaum-so",
       "linux-man",
       "ies-study-guide"
      ],
      "theoryTitle": "Prioridade sem recurso livre não adianta: inversão de prioridade",
      "cardCount": 10,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e8-mlfq-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "so-processos"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e8-mlfq-2",
        "kind": "predict",
        "difficulty": "intermediario",
        "skills": [
         "so-processos",
         "ed-pilhas-filas"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e8-mlfq-3",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "so-processos"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e8-mlfq-4",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "so-processos"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e8-mlfq-5",
        "kind": "fill",
        "difficulty": "facil",
        "skills": [
         "so-processos"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e8-mlfq-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "so-processos",
         "ed-pilhas-filas"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "ostep"
    ]
   },
   {
    "id": "m8-2",
    "levelId": "n8",
    "title": "Memória e sistemas de arquivos",
    "titleEn": "Memory and file systems",
    "description": "Memória virtual, paginação e como arquivos são guardados.",
    "prerequisites": [
     "m8-1"
    ],
    "skills": [
     {
      "id": "so-memoria",
      "pt": "Memória virtual e arquivos",
      "en": "Virtual memory and file systems"
     }
    ],
    "outline": [
     "Espaço de endereçamento",
     "Paginação e TLB",
     "Stack × heap",
     "Ponteiros e gerenciamento de memória em C",
     "Inodes, diretórios, journaling"
    ],
    "lessons": [
     {
      "id": "l8-memoria-arquivos",
      "moduleId": "m8-2",
      "title": "Memória virtual, pilha × heap e sistemas de arquivos",
      "titleEn": "Virtual memory, stack vs heap and file systems",
      "summary": "Como o sistema operacional dá a cada processo a ilusão de uma memória só dele, onde vivem as variáveis e como arquivos viram blocos no disco.",
      "minutes": 62,
      "skills": [
       "so-memoria"
      ],
      "references": [
       "ostep",
       "cmu-15213",
       "v7-web-paging",
       "v7-web-memory",
       "ies-study-guide"
      ],
      "theoryTitle": "Endereços virtuais, alcançabilidade e persistência são contratos distintos",
      "cardCount": 4,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e8-mem-0",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "so-memoria"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e8-mem-1",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "so-memoria"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e8-mem-2",
        "kind": "predict",
        "difficulty": "intermediario",
        "skills": [
         "so-memoria"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e8-mem-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "so-memoria"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l8-ponteiros-heap-c",
      "moduleId": "m8-2",
      "title": "Ponteiros e o heap em C: endereços, malloc, free e os bugs clássicos",
      "titleEn": "Pointers and the heap in C: addresses, malloc, free and the classic bugs",
      "summary": "O mapa do espaço de endereçamento de um processo, ponteiros e aritmética de ponteiros em C, como malloc e free funcionam por dentro (cabeçalho, lista livre, divisão e coalescência) e os erros de memória por trás da maior parte das falhas graves de segurança: vazamento, double free, use-after-free e estouro de buffer, com as ferramentas que os denunciam.",
      "minutes": 62,
      "skills": [
       "so-memoria"
      ],
      "references": [
       "cmu-15213",
       "ostep",
       "cs50",
       "linux-man",
       "ies-study-guide"
      ],
      "theoryTitle": "Tempo de vida e posse: quem é responsável por cada bloco",
      "cardCount": 7,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e8-ptr-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "so-memoria"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e8-ptr-2",
        "kind": "predict",
        "difficulty": "intermediario",
        "skills": [
         "so-memoria"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e8-ptr-3",
        "kind": "fill",
        "difficulty": "facil",
        "skills": [
         "so-memoria"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e8-ptr-4",
        "kind": "fix",
        "difficulty": "intermediario",
        "skills": [
         "so-memoria"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e8-ptr-5",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "so-memoria"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e8-ptr-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "so-memoria",
         "ed-arrays"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l8-inodes-journaling",
      "moduleId": "m8-2",
      "title": "Sistemas de arquivos por dentro: inodes, diretórios, links e journaling",
      "titleEn": "File systems inside: inodes, directories, links and journaling",
      "summary": "Como um sistema de arquivos no estilo Unix acha os blocos de um arquivo com ponteiros diretos e indiretos (e extents), transforma um caminho num número de inode, por que hard links e links simbólicos se comportam de jeitos tão diferentes, quando o espaço de um arquivo apagado volta de fato, e como o journaling e o fsync protegem os dados de uma queda de energia.",
      "minutes": 62,
      "skills": [
       "so-memoria"
      ],
      "references": [
       "ostep",
       "linux-man",
       "tanenbaum-so",
       "python-docs",
       "ies-study-guide"
      ],
      "theoryTitle": "Durabilidade é um protocolo: write, fsync e rename",
      "cardCount": 8,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e8-fs-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "so-memoria"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e8-fs-2",
        "kind": "predict",
        "difficulty": "intermediario",
        "skills": [
         "so-memoria"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e8-fs-3",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "so-memoria"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e8-fs-4",
        "kind": "fill",
        "difficulty": "facil",
        "skills": [
         "so-memoria"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e8-fs-5",
        "kind": "fix",
        "difficulty": "intermediario",
        "skills": [
         "so-memoria"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e8-fs-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "so-memoria",
         "prog-strings"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "ostep",
     "cmu-15213"
    ]
   },
   {
    "id": "m8-3",
    "levelId": "n8",
    "title": "Concorrência e sincronização",
    "titleEn": "Concurrency and synchronization",
    "description": "Condições de corrida, locks, deadlocks.",
    "prerequisites": [
     "m8-1"
    ],
    "skills": [
     {
      "id": "so-concorrencia",
      "pt": "Concorrência e sincronização",
      "en": "Concurrency and synchronization"
     }
    ],
    "outline": [
     "Condições de corrida",
     "Locks e mutex",
     "Semáforos e variáveis de condição",
     "Deadlock",
     "async/await × threads × processos"
    ],
    "lessons": [
     {
      "id": "l8-concorrencia",
      "moduleId": "m8-3",
      "title": "Concorrência, condições de corrida e sincronização",
      "titleEn": "Concurrency, race conditions and synchronization",
      "summary": "Por que `contador += 1` pode dar errado com duas threads, e como locks resolvem (e criam deadlocks).",
      "minutes": 52,
      "skills": [
       "so-concorrencia"
      ],
      "references": [
       "ostep",
       "tanenbaum-so",
       "ostep-locks-deep",
       "ies-study-guide"
      ],
      "theoryTitle": "Intercalação, atomicidade e condições de corrida",
      "cardCount": 2,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e8-conc-0",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "so-concorrencia"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e8-conc-1",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "so-concorrencia"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e8-conc-2",
        "kind": "code",
        "difficulty": "avancado",
        "skills": [
         "so-concorrencia",
         "alg-recursao"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e8-conc-desafio",
        "kind": "code",
        "difficulty": "avancado",
        "skills": [
         "so-concorrencia",
         "ed-grafos"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l8-semaforos-condicao",
      "moduleId": "m8-3",
      "title": "Esperar sem desperdiçar: semáforos, variáveis de condição e o produtor-consumidor",
      "titleEn": "Waiting without spinning: semaphores, condition variables and the producer-consumer problem",
      "summary": "O lock garante que só uma thread mexe no dado; falta fazer uma thread esperar até algo acontecer. Semáforos contadores, variáveis de condição, o buffer limitado e o deadlock que nasce de inverter dois acquire.",
      "minutes": 57,
      "skills": [
       "so-concorrencia"
      ],
      "references": [
       "ostep",
       "tanenbaum-so",
       "python-docs",
       "linux-man",
       "ostep-locks-deep",
       "ies-study-guide"
      ],
      "theoryTitle": "Raciocinar com invariantes: o que vale sempre que o lock está livre",
      "cardCount": 7,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e8-sem-0",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "so-concorrencia"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e8-sem-1",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "so-concorrencia"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e8-sem-2",
        "kind": "predict",
        "difficulty": "intermediario",
        "skills": [
         "so-concorrencia"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e8-sem-3",
        "kind": "fill",
        "difficulty": "facil",
        "skills": [
         "so-concorrencia"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e8-sem-4",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "so-concorrencia",
         "ed-pilhas-filas"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e8-sem-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "so-concorrencia",
         "ed-pilhas-filas"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l8-async-threads-processos",
      "moduleId": "m8-3",
      "title": "async/await, threads ou processos: escolhendo o modelo de concorrência",
      "titleEn": "async/await vs threads vs processes: choosing a concurrency model",
      "summary": "Concorrência não é paralelismo. Como corrotinas e o laço de eventos trocam de tarefa só nos await, por que threads no CPython não aceleram cálculo, quando pagar o preço de processos, e as corridas que continuam existindo mesmo numa thread só.",
      "minutes": 62,
      "skills": [
       "so-concorrencia",
       "so-processos"
      ],
      "references": [
       "ostep",
       "python-docs",
       "tanenbaum-so",
       "ies-study-guide"
      ],
      "theoryTitle": "Contrapressão: concorrência com limite para não afogar o sistema",
      "cardCount": 7,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e8-async-0",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "so-concorrencia"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e8-async-1",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "so-concorrencia"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e8-async-2",
        "kind": "predict",
        "difficulty": "intermediario",
        "skills": [
         "so-concorrencia"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e8-async-3",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "so-concorrencia",
         "ed-pilhas-filas"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e8-async-4",
        "kind": "fix",
        "difficulty": "intermediario",
        "skills": [
         "so-concorrencia"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e8-async-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "so-concorrencia",
         "ed-pilhas-filas"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "ostep"
    ]
   }
  ]
 },
 {
  "id": "n9",
  "number": 9,
  "title": "Redes de Computadores",
  "titleEn": "Computer Networks",
  "goal": "Explicar como os dados atravessam a internet, camada por camada, e programar comunicação em rede.",
  "why": "Todo sistema moderno é distribuído. Entender camadas, TCP, DNS e TLS é o que permite depurar \"o site está lento\", projetar APIs e pensar em segurança.",
  "modules": [
   {
    "id": "m9-1",
    "levelId": "n9",
    "title": "Camadas, IP, TCP e UDP",
    "titleEn": "Layers, IP, TCP and UDP",
    "description": "A pilha TCP/IP de baixo para cima.",
    "prerequisites": [
     "m0-3"
    ],
    "skills": [
     {
      "id": "redes-tcpip",
      "pt": "TCP/IP",
      "en": "TCP/IP"
     }
    ],
    "outline": [
     "Modelo em camadas",
     "IP, máscaras, roteamento, NAT",
     "TCP: handshake, confiabilidade, congestionamento",
     "UDP e QUIC"
    ],
    "lessons": [
     {
      "id": "l9-camadas-tcp-udp",
      "moduleId": "m9-1",
      "title": "Camadas, IP, TCP e UDP",
      "titleEn": "Layers, IP, TCP and UDP",
      "summary": "O modelo em camadas, endereçamento IP, roteamento, portas e as garantias (ou não) de TCP e UDP.",
      "minutes": 52,
      "skills": [
       "redes-tcpip"
      ],
      "references": [
       "kurose-ross",
       "rfc9293",
       "stanford-cs144",
       "tcp-rfc9293-deep",
       "python-sockets-deep",
       "ies-study-guide"
      ],
      "theoryTitle": "Entrega de bytes não equivale à conclusão de uma operação",
      "cardCount": 3,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e9-tcp-1",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "redes-tcpip"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e9-tcp-2",
        "kind": "parsons",
        "difficulty": "facil",
        "skills": [
         "redes-tcpip"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e9-tcp-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "redes-tcpip",
         "comp-binario"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l9-ip-subredes-nat",
      "moduleId": "m9-1",
      "title": "IP por dentro: sub-redes, roteamento pelo prefixo mais longo e NAT",
      "titleEn": "IP in depth: subnets, longest prefix match routing and NAT",
      "summary": "O que cada camada acrescenta ao pacote, como calcular rede, broadcast e hosts de qualquer prefixo, como um host decide entre entregar direto ou mandar ao gateway, como roteadores escolhem a rota mais específica, como o NAT deixa a casa inteira sair com um IP só, por que o CGNAT da operadora impede o redirecionamento de porta e o que muda no IPv6.",
      "minutes": 62,
      "skills": [
       "redes-tcpip",
       "comp-binario"
      ],
      "references": [
       "kurose-ross",
       "stanford-cs144",
       "python-docs",
       "cloudflare-learning",
       "ies-study-guide"
      ],
      "theoryTitle": "Diagnosticar de dentro para fora: uma pergunta por camada",
      "cardCount": 9,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e9-ipnat-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "redes-tcpip",
         "comp-binario"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e9-ipnat-2",
        "kind": "predict",
        "difficulty": "intermediario",
        "skills": [
         "redes-tcpip",
         "comp-binario"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e9-ipnat-3",
        "kind": "fix",
        "difficulty": "intermediario",
        "skills": [
         "redes-tcpip",
         "comp-binario"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e9-ipnat-4",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "redes-tcpip"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e9-ipnat-5",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "redes-tcpip"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e9-ipnat-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "redes-tcpip",
         "comp-binario"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l9-tcp-janelas-congestionamento",
      "moduleId": "m9-1",
      "title": "TCP por dentro: sequência, retransmissão, janelas e congestionamento (e o que o QUIC muda)",
      "titleEn": "TCP in depth: sequence numbers, retransmission, windows and congestion control (and what QUIC changes)",
      "summary": "Como o TCP numera bytes e confirma com ACKs cumulativos, quando retransmite (temporizador com RTO adaptativo e três ACKs duplicados), por que a janela limita a vazão a janela/RTT, a diferença entre controle de fluxo e de congestionamento, o dente de serra do Reno, o que fazem o CUBIC e o BBR, e por que o QUIC reconstruiu tudo isso sobre o UDP.",
      "minutes": 62,
      "skills": [
       "redes-tcpip"
      ],
      "references": [
       "kurose-ross",
       "rfc9293",
       "stanford-cs144",
       "cloudflare-learning",
       "ies-study-guide"
      ],
      "theoryTitle": "Latência e vazão: por que um link rápido pode parecer lento",
      "cardCount": 10,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e9-tcpcc-1",
        "kind": "fill",
        "difficulty": "facil",
        "skills": [
         "redes-tcpip"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e9-tcpcc-2",
        "kind": "predict",
        "difficulty": "facil",
        "skills": [
         "redes-tcpip"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e9-tcpcc-3",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "redes-tcpip"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e9-tcpcc-4",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "redes-tcpip"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e9-tcpcc-5",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "redes-tcpip"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e9-tcpcc-desafio",
        "kind": "code",
        "difficulty": "avancado",
        "skills": [
         "redes-tcpip"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "kurose-ross",
     "stanford-cs144"
    ]
   },
   {
    "id": "m9-2",
    "levelId": "n9",
    "title": "DNS, HTTP(S) e TLS",
    "titleEn": "DNS, HTTP(S) and TLS",
    "description": "A camada de aplicação que você usa todos os dias.",
    "prerequisites": [
     "m9-1"
    ],
    "skills": [
     {
      "id": "redes-dns-tls",
      "pt": "DNS, HTTP e TLS",
      "en": "DNS, HTTP and TLS"
     }
    ],
    "outline": [
     "Resolução DNS e cache",
     "Tipos de registro",
     "HTTP/1.1, 2 e 3",
     "TLS e certificados"
    ],
    "lessons": [
     {
      "id": "l9-dns-https",
      "moduleId": "m9-2",
      "title": "DNS, HTTP(S) e TLS",
      "titleEn": "DNS, HTTP(S) and TLS",
      "summary": "Resolução de nomes, a evolução do HTTP e como o TLS protege a comunicação.",
      "minutes": 47,
      "skills": [
       "redes-dns-tls"
      ],
      "references": [
       "kurose-ross",
       "mdn-http",
       "rfc9110",
       "cloudflare-learning",
       "v7-web-dns",
       "v7-web-tls",
       "ies-study-guide"
      ],
      "theoryTitle": "Nome, certificado e canal: o alcance real da proteção HTTPS",
      "cardCount": 2,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e9-dns-0",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "redes-dns-tls"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e9-dns-1",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "redes-dns-tls"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e9-tls-1",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "redes-dns-tls"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e9-dns-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "redes-dns-tls"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l9-http-versoes",
      "moduleId": "m9-2",
      "title": "HTTP por dentro: as mensagens do 1.1, os quadros do HTTP/2 e o HTTP/3",
      "titleEn": "HTTP in depth: HTTP/1.1 messages, HTTP/2 frames and HTTP/3",
      "summary": "A semântica do HTTP (métodos, status, cabeçalhos) é a mesma nas três versões; o que muda é o enquadramento. Como o HTTP/1.1 decide onde o corpo acaba (Content-Length, chunked, fechar a conexão), por que o pipelining não pegou, como o HTTP/2 corta tudo em quadros binários com fluxos multiplexados e comprime cabeçalhos com o HPACK, e o que o HTTP/3 delega ao QUIC e por que precisou do QPACK.",
      "minutes": 62,
      "skills": [
       "redes-dns-tls",
       "web-http-api"
      ],
      "references": [
       "rfc9110",
       "mdn-http",
       "kurose-ross",
       "cloudflare-learning",
       "ies-study-guide"
      ],
      "theoryTitle": "Onde uma mensagem acaba é uma questão de segurança",
      "cardCount": 9,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e9-http-versoes-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "redes-dns-tls"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e9-http-versoes-2",
        "kind": "fill",
        "difficulty": "facil",
        "skills": [
         "redes-dns-tls"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e9-http-versoes-3",
        "kind": "predict",
        "difficulty": "intermediario",
        "skills": [
         "redes-dns-tls"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e9-http-versoes-4",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "redes-dns-tls"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e9-http-versoes-5",
        "kind": "mcq",
        "difficulty": "avancado",
        "skills": [
         "redes-dns-tls"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e9-http-versoes-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "redes-dns-tls",
         "web-http-api"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l9-tls-certificados",
      "moduleId": "m9-2",
      "title": "TLS 1.3 e certificados: o handshake, a cadeia de confiança e os erros de HTTPS",
      "titleEn": "TLS 1.3 and certificates: the handshake, the chain of trust and HTTPS errors",
      "summary": "O que cada mensagem do handshake do TLS 1.3 faz e por que ele custa um RTT só, o que SNI, ALPN e 0-RTT resolvem (e o risco de repetição do 0-RTT), o que há num certificado X.509, como o cliente monta e valida a cadeia até uma raiz confiável e confere o nome com curinga, e como diagnosticar os erros de certificado mais comuns, além de revogação, Certificate Transparency, CAA, ACME, HSTS e mTLS.",
      "minutes": 62,
      "skills": [
       "redes-dns-tls"
      ],
      "references": [
       "kurose-ross",
       "cloudflare-learning",
       "stanford-cs255",
       "owasp-cheatsheets",
       "mdn",
       "v7-web-tls",
       "ies-study-guide"
      ],
      "theoryTitle": "Operar certificados: chave privada, validade e cadeia completa",
      "cardCount": 10,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e9-tls-cert-1",
        "kind": "parsons",
        "difficulty": "facil",
        "skills": [
         "redes-dns-tls"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e9-tls-cert-2",
        "kind": "fill",
        "difficulty": "intermediario",
        "skills": [
         "redes-dns-tls",
         "redes-tcpip"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e9-tls-cert-3",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "redes-dns-tls"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e9-tls-cert-4",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "redes-dns-tls"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e9-tls-cert-5",
        "kind": "mcq",
        "difficulty": "avancado",
        "skills": [
         "redes-dns-tls",
         "web-http-api"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e9-tls-cert-desafio",
        "kind": "code",
        "difficulty": "avancado",
        "skills": [
         "redes-dns-tls"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "kurose-ross",
     "rfc9110"
    ]
   },
   {
    "id": "m9-3",
    "levelId": "n9",
    "title": "Sockets e arquitetura cliente-servidor",
    "titleEn": "Sockets and client-server architecture",
    "description": "Programar a comunicação em rede.",
    "prerequisites": [
     "m9-2",
     "m2-5"
    ],
    "skills": [
     {
      "id": "redes-sockets",
      "pt": "Programação com sockets",
      "en": "Socket programming"
     }
    ],
    "outline": [
     "API de sockets",
     "Servidor TCP de eco",
     "Concorrência no servidor",
     "WebSockets",
     "Balanceamento de carga e proxies"
    ],
    "lessons": [
     {
      "id": "l9-sockets",
      "moduleId": "m9-3",
      "title": "Sockets, protocolos de aplicação e servidores concorrentes",
      "titleEn": "Sockets, application protocols and concurrent servers",
      "summary": "A API de sockets, por que TCP entrega um fluxo de bytes (e não mensagens), como desenhar um protocolo simples e como um servidor atende muitos clientes.",
      "minutes": 62,
      "skills": [
       "redes-sockets"
      ],
      "references": [
       "kurose-ross",
       "python-docs",
       "tcp-rfc9293-deep",
       "python-sockets-deep",
       "ies-study-guide"
      ],
      "theoryTitle": "Fluxo de bytes, mensagens e falhas de comunicação",
      "cardCount": 4,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e9-sock-0",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "redes-sockets"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e9-sock-1",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "redes-sockets"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e9-sock-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "redes-sockets"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l9-websockets",
      "moduleId": "m9-3",
      "title": "WebSockets: do HTTP a um canal bidirecional em tempo real",
      "titleEn": "WebSockets: from HTTP to a real-time bidirectional channel",
      "summary": "Por que o HTTP sozinho não deixa o servidor falar primeiro, como o WebSocket nasce de um GET com Upgrade, como é cada quadro por dentro (FIN, opcode, tamanho em 7, 16 ou 64 bits, máscara), para que servem ping, pong e o fechamento com código, e o que um servidor com milhares de conexões longas precisa vigiar: Origin, heartbeat, tamanho máximo e clientes lentos.",
      "minutes": 62,
      "skills": [
       "redes-sockets"
      ],
      "references": [
       "kurose-ross",
       "mdn",
       "python-docs",
       "tcp-rfc9293-deep",
       "ies-study-guide"
      ],
      "theoryTitle": "Conexão não é sessão: retomar sem perder nem duplicar mensagens",
      "cardCount": 7,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e9-ws-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "redes-sockets"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e9-ws-2",
        "kind": "fill",
        "difficulty": "intermediario",
        "skills": [
         "redes-sockets"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e9-ws-3",
        "kind": "predict",
        "difficulty": "intermediario",
        "skills": [
         "redes-sockets"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e9-ws-4",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "redes-sockets"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e9-ws-5",
        "kind": "fix",
        "difficulty": "intermediario",
        "skills": [
         "redes-sockets",
         "comp-binario"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e9-ws-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "redes-sockets",
         "comp-binario"
        ],
        "stage": "desafio"
       }
      ]
     },
     {
      "id": "l9-proxies-balanceamento",
      "moduleId": "m9-3",
      "title": "Proxies reversos e balanceamento de carga: um endereço, muitos servidores",
      "titleEn": "Reverse proxies and load balancing: one address, many servers",
      "summary": "O que fica entre o cliente e os seus servidores: proxy direto e reverso, balanceamento em camada 4 e em camada 7, os algoritmos (round robin, ponderado, menos conexões, dois aleatórios, hash), verificações de saúde, o IP real do cliente no X-Forwarded-For, quando um proxy pode repetir uma requisição e o que muda com conexões longas como WebSockets.",
      "minutes": 62,
      "skills": [
       "redes-sockets"
      ],
      "references": [
       "kurose-ross",
       "google-sre",
       "rfc9110",
       "cloudflare-learning",
       "twelve-factor",
       "ies-study-guide"
      ],
      "theoryTitle": "Capacidade e cauda: por que 70% de uso já pede atenção",
      "cardCount": 7,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e9-lb-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "redes-sockets"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e9-lb-2",
        "kind": "predict",
        "difficulty": "intermediario",
        "skills": [
         "redes-sockets"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e9-lb-3",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "redes-sockets"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e9-lb-4",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "redes-sockets",
         "redes-tcpip"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e9-lb-5",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "redes-sockets"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e9-lb-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "redes-sockets"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "kurose-ross",
     "python-docs"
    ]
   }
  ]
 },
 {
  "id": "n10",
  "number": 10,
  "title": "Engenharia de Software",
  "titleEn": "Software Engineering",
  "goal": "Praticar o que equipes de software usam no dia a dia: versionamento, código limpo, testes, CI/CD, arquitetura e colaboração.",
  "why": "Programar sozinho é diferente de construir software em equipe que dura anos. Este nível pratica controle de versão, revisão, testes e organização de projeto, que fazem parte do dia a dia de quem trabalha em equipe. O Git pode (e deve) ser estudado bem cedo.",
  "modules": [
   {
    "id": "m10-1",
    "levelId": "n10",
    "title": "Git e GitHub",
    "titleEn": "Git and GitHub",
    "description": "Controle de versão e colaboração.",
    "prerequisites": [
     "m0-2"
    ],
    "skills": [
     {
      "id": "tools-git",
      "pt": "Git e GitHub",
      "en": "Git and GitHub"
     }
    ],
    "outline": [
     "Modelo do Git",
     "Commits e história",
     "Branches, merge e conflitos",
     "Remotos, PRs e code review",
     "rebase, stash, tags"
    ],
    "lessons": [
     {
      "id": "l10-git",
      "moduleId": "m10-1",
      "title": "Git e GitHub: controle de versão",
      "titleEn": "Git and GitHub: version control",
      "summary": "Commits, branches, merge, repositórios remotos e o fluxo de pull requests.",
      "minutes": 57,
      "skills": [
       "tools-git"
      ],
      "references": [
       "pro-git",
       "github-docs",
       "missing-semester",
       "v7-applied-git",
       "ies-study-guide"
      ],
      "theoryTitle": "Histórico como grafo e integração como decisão",
      "cardCount": 3,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e10-git-1",
        "kind": "parsons",
        "difficulty": "facil",
        "skills": [
         "tools-git"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e10-git-2",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "tools-git",
         "en-leitura-erros"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e10-git-3",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "tools-git"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e10-git-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "tools-git",
         "ed-grafos"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "pro-git",
     "github-docs"
    ]
   },
   {
    "id": "m10-2",
    "levelId": "n10",
    "title": "Código limpo e refatoração",
    "titleEn": "Clean code and refactoring",
    "description": "Legibilidade, code smells e revisão.",
    "prerequisites": [
     "m2-5"
    ],
    "skills": [
     {
      "id": "eng-clean-code",
      "pt": "Código limpo e refatoração",
      "en": "Clean code and refactoring"
     }
    ],
    "outline": [
     "Nomes e funções",
     "Code smells",
     "Refatorações seguras",
     "Linters e formatadores",
     "Code review"
    ],
    "lessons": [
     {
      "id": "l10-clean-code",
      "moduleId": "m10-2",
      "title": "Código limpo, refatoração e code review",
      "titleEn": "Clean code, refactoring and code review",
      "summary": "Nomes, funções pequenas, duplicação, code smells e como revisar código dos outros (e receber revisão).",
      "minutes": 47,
      "skills": [
       "eng-clean-code"
      ],
      "references": [
       "refactoring",
       "swe-at-google",
       "pragmatic-programmer",
       "v7-applied-review",
       "ies-study-guide"
      ],
      "theoryTitle": "Refatorar preservando contratos observáveis",
      "cardCount": 2,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e10-clean-1",
        "kind": "fix",
        "difficulty": "intermediario",
        "skills": [
         "eng-clean-code"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e10-clean-2",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "eng-clean-code"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e10-clean-desafio",
        "kind": "fix",
        "difficulty": "avancado",
        "skills": [
         "eng-clean-code"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "refactoring",
     "swe-at-google"
    ]
   },
   {
    "id": "m10-3",
    "levelId": "n10",
    "title": "Testes e CI/CD",
    "titleEn": "Testing and CI/CD",
    "description": "Estratégia de testes e automação.",
    "prerequisites": [
     "m10-1",
     "m10-2"
    ],
    "skills": [
     {
      "id": "eng-testes-ci",
      "pt": "Estratégia de testes e CI",
      "en": "Testing strategy and CI"
     }
    ],
    "outline": [
     "Pirâmide de testes",
     "Dublês de teste",
     "Cobertura",
     "GitHub Actions",
     "Entrega contínua"
    ],
    "lessons": [
     {
      "id": "l10-testes-ci",
      "moduleId": "m10-3",
      "title": "Estratégia de testes e integração contínua",
      "titleEn": "Testing strategy and continuous integration",
      "summary": "A pirâmide de testes, mocks, cobertura e pipelines de CI que rodam a cada push.",
      "minutes": 42,
      "skills": [
       "eng-testes-ci"
      ],
      "references": [
       "swe-at-google",
       "github-docs",
       "pytest-docs",
       "swe-testing-deep",
       "ies-study-guide"
      ],
      "theoryTitle": "Testes como evidência de um contrato",
      "cardCount": 2,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e10-ci-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "eng-testes-ci"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e10-ci-desafio",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "eng-testes-ci"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "swe-at-google",
     "github-docs"
    ]
   },
   {
    "id": "m10-4",
    "levelId": "n10",
    "title": "Arquitetura e processos",
    "titleEn": "Architecture and processes",
    "description": "Organizar sistemas e equipes.",
    "prerequisites": [
     "m10-3",
     "m5-3"
    ],
    "skills": [
     {
      "id": "eng-arquitetura",
      "pt": "Arquitetura de software",
      "en": "Software architecture"
     }
    ],
    "outline": [
     "Camadas e arquitetura limpa",
     "Monólito × microsserviços",
     "Documentação (README, ADRs)",
     "Requisitos e histórias de usuário",
     "Scrum, Kanban e métodos ágeis"
    ],
    "lessons": [
     {
      "id": "l10-arquitetura",
      "moduleId": "m10-4",
      "title": "Arquitetura de software, decisões e processos ágeis",
      "titleEn": "Software architecture, decisions and agile processes",
      "summary": "Organizar o código em camadas com dependências na direção certa, decidir entre monólito e microsserviços, registrar decisões e trabalhar em ciclos curtos.",
      "minutes": 57,
      "skills": [
       "eng-arquitetura"
      ],
      "references": [
       "ddia",
       "swe-at-google",
       "pragmatic-programmer",
       "v7-applied-architecture",
       "ies-study-guide"
      ],
      "theoryTitle": "Fronteiras, dependências e decisões reversíveis",
      "cardCount": 4,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e10-arq-0",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "eng-arquitetura"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e10-arq-1",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "eng-arquitetura"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e10-arq-2",
        "kind": "parsons",
        "difficulty": "facil",
        "skills": [
         "eng-arquitetura"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e10-arq-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "eng-arquitetura"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "ddia",
     "swe-at-google",
     "pragmatic-programmer"
    ]
   }
  ]
 },
 {
  "id": "n11",
  "number": 11,
  "title": "Segurança",
  "titleEn": "Security",
  "goal": "Reconhecer ataques comuns e praticar defesas que protegem dados e usuários.",
  "why": "Segurança não é uma fase no fim do projeto: é um hábito em cada linha. Muitos incidentes graves (vazamentos de dados, sequestro de contas) começam em falhas conhecidas, e este nível pratica como reconhecê-las e reduzi-las.",
  "modules": [
   {
    "id": "m11-1",
    "levelId": "n11",
    "title": "Fundamentos de segurança",
    "titleEn": "Security fundamentals",
    "description": "CIA, autenticação, autorização e senhas.",
    "prerequisites": [
     "m6-3"
    ],
    "skills": [
     {
      "id": "seg-fundamentos",
      "pt": "Fundamentos de segurança",
      "en": "Security fundamentals"
     }
    ],
    "outline": [
     "Tríade CIA",
     "Autenticação × autorização",
     "Hash de senhas e salt",
     "MFA",
     "Menor privilégio e defesa em profundidade",
     "Modelagem de ameaças"
    ],
    "lessons": [
     {
      "id": "l11-fundamentos",
      "moduleId": "m11-1",
      "title": "Fundamentos: autenticação, autorização e senhas",
      "titleEn": "Fundamentals: authentication, authorization and passwords",
      "summary": "CIA, autenticação × autorização, por que senhas são guardadas com hash lento e salt, e MFA.",
      "minutes": 52,
      "skills": [
       "seg-fundamentos"
      ],
      "references": [
       "owasp-cheatsheets",
       "nist-800-63b",
       "owasp-top10",
       "owasp-authorization-deep",
       "owasp-threat-model-deep",
       "ies-study-guide"
      ],
      "theoryTitle": "Fronteiras de confiança e autorização por recurso",
      "cardCount": 3,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e11-seg-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "seg-fundamentos"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e11-seg-2",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "seg-fundamentos"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e11-seg-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "seg-fundamentos"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "owasp-cheatsheets",
     "nist-800-63b"
    ]
   },
   {
    "id": "m11-2",
    "levelId": "n11",
    "title": "Segurança web e OWASP",
    "titleEn": "Web security and OWASP",
    "description": "Ataques comuns e defesas.",
    "prerequisites": [
     "m11-1",
     "m7-1"
    ],
    "skills": [
     {
      "id": "seg-web",
      "pt": "Segurança web",
      "en": "Web security"
     }
    ],
    "outline": [
     "SQL injection",
     "XSS e CSP",
     "CSRF e SameSite",
     "Controle de acesso",
     "Segurança de APIs",
     "Dependências e cadeia de suprimentos"
    ],
    "lessons": [
     {
      "id": "l11-owasp",
      "moduleId": "m11-2",
      "title": "Ataques comuns e o OWASP Top 10",
      "titleEn": "Common attacks and the OWASP Top 10",
      "summary": "SQL injection, XSS, CSRF, controle de acesso e configurações inseguras — e como se defender.",
      "minutes": 57,
      "skills": [
       "seg-web"
      ],
      "references": [
       "owasp-top10",
       "owasp-cheatsheets",
       "owasp-api",
       "mdn",
       "v7-applied-authorization",
       "v7-applied-xss",
       "v7-applied-innerhtml",
       "ies-study-guide"
      ],
      "theoryTitle": "Modelar confiança para escolher a defesa correta",
      "cardCount": 3,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e11-web-0",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "seg-web"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e11-owasp-1",
        "kind": "fix",
        "difficulty": "intermediario",
        "skills": [
         "seg-web",
         "bd-sql"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e11-owasp-2",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "seg-web"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e11-owasp-desafio",
        "kind": "code",
        "difficulty": "avancado",
        "skills": [
         "seg-web"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "owasp-top10",
     "owasp-api"
    ]
   },
   {
    "id": "m11-3",
    "levelId": "n11",
    "title": "Criptografia aplicada",
    "titleEn": "Applied cryptography",
    "description": "Simétrica, assimétrica, assinaturas e TLS.",
    "prerequisites": [
     "m11-1",
     "m14-1"
    ],
    "skills": [
     {
      "id": "seg-cripto",
      "pt": "Criptografia aplicada",
      "en": "Applied cryptography"
     }
    ],
    "outline": [
     "Criptografia simétrica (AES)",
     "Assimétrica (RSA, curvas elípticas)",
     "Assinaturas digitais e HMAC",
     "Troca de chaves",
     "Nunca crie sua própria cripto"
    ],
    "lessons": [
     {
      "id": "l11-criptografia",
      "moduleId": "m11-3",
      "title": "Criptografia aplicada: cifras, HMAC, assinaturas e TLS",
      "titleEn": "Applied cryptography: ciphers, HMAC, signatures and TLS",
      "summary": "O que cada ferramenta criptográfica garante, como elas se combinam no HTTPS e por que nunca se inventa a própria criptografia.",
      "minutes": 62,
      "skills": [
       "seg-cripto"
      ],
      "references": [
       "stanford-cs255",
       "owasp-cheatsheets",
       "v7-applied-aead",
       "v7-applied-crypto",
       "ies-study-guide"
      ],
      "theoryTitle": "Sigilo, autenticidade e repetição são problemas distintos",
      "cardCount": 4,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e11-cripto-0",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "seg-cripto"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e11-cripto-1",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "seg-cripto"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e11-cripto-2",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "seg-cripto"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e11-cripto-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "seg-cripto"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "stanford-cs255",
     "owasp-cheatsheets"
    ]
   }
  ]
 },
 {
  "id": "n12",
  "number": 12,
  "title": "Cloud e DevOps",
  "titleEn": "Cloud and DevOps",
  "goal": "Colocar software em produção de forma reprodutível, observável e escalável.",
  "why": "Software só gera valor quando está rodando para usuários. Linux, containers, CI/CD e observabilidade são o que conecta o código ao mundo real.",
  "modules": [
   {
    "id": "m12-1",
    "levelId": "n12",
    "title": "Linux e shell",
    "titleEn": "Linux and the shell",
    "description": "O sistema dos servidores.",
    "prerequisites": [
     "m0-2"
    ],
    "skills": [
     {
      "id": "devops-linux",
      "pt": "Linux e shell",
      "en": "Linux and shell"
     }
    ],
    "outline": [
     "Permissões",
     "Processos e sinais",
     "Pipes e redirecionamento",
     "Ferramentas de texto",
     "Scripts bash",
     "SSH"
    ],
    "lessons": [
     {
      "id": "l12-linux-shell",
      "moduleId": "m12-1",
      "title": "Linux e o shell de verdade",
      "titleEn": "Linux and the real shell",
      "summary": "Permissões, processos, pipes, redirecionamento, variáveis de ambiente e scripts.",
      "minutes": 52,
      "skills": [
       "devops-linux"
      ],
      "references": [
       "missing-semester",
       "linux-command-line",
       "linux-man",
       "v7-applied-bash-pipes",
       "v7-applied-bash-redirections",
       "ies-study-guide"
      ],
      "theoryTitle": "Fluxos, argumentos e sinais de falha no shell",
      "cardCount": 3,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e12-linux-0",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "devops-linux"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e12-linux-1",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "devops-linux"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e12-linux-2",
        "kind": "parsons",
        "difficulty": "intermediario",
        "skills": [
         "devops-linux"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e12-linux-desafio",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "devops-linux",
         "comp-binario"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "missing-semester",
     "linux-command-line"
    ]
   },
   {
    "id": "m12-2",
    "levelId": "n12",
    "title": "Containers e Docker",
    "titleEn": "Containers and Docker",
    "description": "Empacotar e executar aplicações.",
    "prerequisites": [
     "m12-1",
     "m6-3"
    ],
    "skills": [
     {
      "id": "devops-containers",
      "pt": "Containers",
      "en": "Containers"
     }
    ],
    "outline": [
     "Container × VM",
     "Dockerfile e camadas",
     "Volumes, redes e variáveis",
     "Docker Compose",
     "Kubernetes (introdução)"
    ],
    "lessons": [
     {
      "id": "l12-docker",
      "moduleId": "m12-2",
      "title": "Containers e Docker",
      "titleEn": "Containers and Docker",
      "summary": "Imagens, containers, Dockerfile, camadas, volumes e por que \"funciona na minha máquina\" deixou de ser desculpa.",
      "minutes": 52,
      "skills": [
       "devops-containers"
      ],
      "references": [
       "docker-docs",
       "twelve-factor",
       "kubernetes-docs",
       "v7-applied-docker-security",
       "v7-applied-docker-volumes",
       "ies-study-guide"
      ],
      "theoryTitle": "Imagem, processo e persistência: três ciclos de vida",
      "cardCount": 2,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e12-docker-1",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "devops-containers"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e12-docker-2",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "devops-containers"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e12-docker-desafio",
        "kind": "code",
        "difficulty": "avancado",
        "skills": [
         "devops-containers",
         "prog-strings"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "docker-docs",
     "kubernetes-docs"
    ]
   },
   {
    "id": "m12-3",
    "levelId": "n12",
    "title": "Deploy, CI/CD e observabilidade",
    "titleEn": "Deployment, CI/CD and observability",
    "description": "Da branch à produção, com visibilidade.",
    "prerequisites": [
     "m12-2",
     "m10-3"
    ],
    "skills": [
     {
      "id": "devops-deploy",
      "pt": "Deploy e observabilidade",
      "en": "Deployment and observability"
     }
    ],
    "outline": [
     "Modelos de nuvem: IaaS, PaaS, serverless",
     "Pipelines de entrega contínua",
     "Infraestrutura como código",
     "Logs, métricas e traces",
     "Escalabilidade horizontal e vertical",
     "Twelve-Factor App",
     "SRE: SLIs, SLOs e incidentes"
    ],
    "lessons": [
     {
      "id": "l12-deploy-observabilidade",
      "moduleId": "m12-3",
      "title": "Deploy, CI/CD e observabilidade",
      "titleEn": "Deployment, CI/CD and observability",
      "summary": "Levar código à produção com segurança e repetibilidade, e saber o que está acontecendo lá: pipelines, configuração, logs, métricas, SLOs e incidentes.",
      "minutes": 62,
      "skills": [
       "devops-deploy"
      ],
      "references": [
       "twelve-factor",
       "google-sre",
       "aws-well-architected",
       "sre-slo-deep",
       "sre-data-integrity-deep",
       "ies-study-guide"
      ],
      "theoryTitle": "Confiabilidade observável e recuperação",
      "cardCount": 4,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e12-deploy-0",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "devops-deploy"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e12-deploy-1",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "devops-deploy"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e12-deploy-2",
        "kind": "parsons",
        "difficulty": "facil",
        "skills": [
         "devops-deploy"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e12-deploy-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "devops-deploy"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "twelve-factor",
     "google-sre",
     "aws-well-architected"
    ]
   }
  ]
 },
 {
  "id": "n13",
  "number": 13,
  "title": "Inteligência Artificial",
  "titleEn": "Artificial Intelligence",
  "goal": "Entender e construir modelos de aprendizado de máquina desde os fundamentos, e usar IA com responsabilidade.",
  "why": "IA está mudando como o software é construído e usado. Entender os fundamentos — dados, otimização, avaliação, limitações — evita tanto o deslumbramento quanto o medo, e prepara para usar e construir sistemas de IA de forma crítica.",
  "modules": [
   {
    "id": "m13-1",
    "levelId": "n13",
    "title": "Fundamentos de machine learning",
    "titleEn": "Machine learning fundamentals",
    "description": "Aprender com dados e avaliar com honestidade.",
    "prerequisites": [
     "m2-5",
     "m14-2"
    ],
    "skills": [
     {
      "id": "ia-ml",
      "pt": "Machine learning",
      "en": "Machine learning"
     }
    ],
    "outline": [
     "Supervisionado × não supervisionado",
     "Treino, validação e teste",
     "Regressão linear e gradiente descendente",
     "k-NN e regressão logística",
     "Overfitting e regularização",
     "Métricas"
    ],
    "lessons": [
     {
      "id": "l13-ml-fundamentos",
      "moduleId": "m13-1",
      "title": "Fundamentos de machine learning",
      "titleEn": "Machine learning fundamentals",
      "summary": "Aprender com dados: treino, validação e teste, regressão linear do zero, overfitting e métricas.",
      "minutes": 57,
      "skills": [
       "ia-ml"
      ],
      "references": [
       "stanford-cs229",
       "aima",
       "google-ml-crash",
       "goodfellow-dl",
       "ml-split-deep",
       "ml-metrics-deep",
       "ies-study-guide"
      ],
      "theoryTitle": "Generalização, dados separados e métricas úteis",
      "cardCount": 3,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e13-ml-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "ia-ml"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e13-ml-2",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "ia-ml"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e13-ml-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "ia-ml",
         "alg-ordenacao"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "stanford-cs229",
     "google-ml-crash"
    ]
   },
   {
    "id": "m13-2",
    "levelId": "n13",
    "title": "Redes neurais",
    "titleEn": "Neural networks",
    "description": "Do perceptron ao deep learning.",
    "prerequisites": [
     "m13-1",
     "m14-4"
    ],
    "skills": [
     {
      "id": "ia-redes-neurais",
      "pt": "Redes neurais",
      "en": "Neural networks"
     }
    ],
    "outline": [
     "Perceptron",
     "Ativações",
     "Retropropagação",
     "CNNs",
     "Transformers e atenção",
     "PyTorch"
    ],
    "lessons": [
     {
      "id": "l13-redes-neurais",
      "moduleId": "m13-2",
      "title": "Redes neurais e deep learning",
      "titleEn": "Neural networks and deep learning",
      "summary": "O neurônio artificial, ativações, camadas, retropropagação e por que profundidade importa.",
      "minutes": 52,
      "skills": [
       "ia-redes-neurais"
      ],
      "references": [
       "goodfellow-dl",
       "stanford-cs231n",
       "aima",
       "v7-applied-neural",
       "v7-applied-backprop",
       "ies-study-guide"
      ],
      "theoryTitle": "Da previsão ao gradiente: o que cada etapa calcula",
      "cardCount": 2,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e13-nn-1",
        "kind": "predict",
        "difficulty": "facil",
        "skills": [
         "ia-redes-neurais"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e13-nn-2",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "ia-redes-neurais"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e13-nn-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "ia-redes-neurais",
         "mat-logica"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "goodfellow-dl",
     "stanford-cs231n"
    ]
   },
   {
    "id": "m13-3",
    "levelId": "n13",
    "title": "IA generativa e uso responsável",
    "titleEn": "Generative AI and responsible use",
    "description": "LLMs, limitações e ética.",
    "prerequisites": [
     "m13-1"
    ],
    "skills": [
     {
      "id": "ia-generativa",
      "pt": "IA generativa e uso responsável",
      "en": "Generative AI and responsible use"
     }
    ],
    "outline": [
     "Tokens e previsão do próximo token",
     "Alucinações",
     "Prompts e contexto",
     "IA para aprender (não para pular etapas)",
     "Privacidade, licenças e segurança",
     "Vieses e impacto social"
    ],
    "lessons": [
     {
      "id": "l13-ia-generativa",
      "moduleId": "m13-3",
      "title": "IA generativa e uso responsável na programação",
      "titleEn": "Generative AI and responsible use in programming",
      "summary": "Como modelos de linguagem funcionam em alto nível, onde erram, e como usá-los para aprender — não para deixar de aprender.",
      "minutes": 42,
      "skills": [
       "ia-generativa"
      ],
      "references": [
       "aima",
       "stanford-cs224n",
       "nist-ai-rmf",
       "v7-applied-llm",
       "ies-study-guide"
      ],
      "theoryTitle": "Texto plausível, evidência e verificação independente",
      "cardCount": 2,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e13-gen-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "ia-generativa"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e13-gen-2",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "ia-generativa"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e13-gen-desafio",
        "kind": "fix",
        "difficulty": "avancado",
        "skills": [
         "ia-generativa",
         "seg-fundamentos"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "stanford-cs224n",
     "nist-ai-rmf"
    ]
   }
  ]
 },
 {
  "id": "n14",
  "number": 14,
  "title": "Matemática para Computação",
  "titleEn": "Mathematics for Computing",
  "goal": "Estudar a matemática que sustenta algoritmos, segurança e IA, praticando sempre em código.",
  "why": "Matemática discreta é a linguagem da computação: lógica para condições e provas, combinatória para contar casos, probabilidade para algoritmos e IA, álgebra linear para gráficos e redes neurais. Os módulos deste nível são pré-requisitos de outros e podem ser feitos em paralelo à trilha.",
  "modules": [
   {
    "id": "m14-1",
    "levelId": "n14",
    "title": "Lógica e conjuntos",
    "titleEn": "Logic and sets",
    "description": "Proposições, tabelas-verdade, De Morgan e conjuntos.",
    "prerequisites": [
     "m1-3"
    ],
    "skills": [
     {
      "id": "mat-logica",
      "pt": "Lógica e conjuntos",
      "en": "Logic and sets"
     }
    ],
    "outline": [
     "Proposições e conectivos",
     "Tabelas-verdade",
     "De Morgan",
     "Implicação e equivalência",
     "Conjuntos e relações",
     "Quantificadores"
    ],
    "lessons": [
     {
      "id": "l14-logica-conjuntos",
      "moduleId": "m14-1",
      "title": "Lógica proposicional e conjuntos",
      "titleEn": "Propositional logic and sets",
      "summary": "Proposições, conectivos, tabelas-verdade, leis de De Morgan, implicação e conjuntos — com aplicação direta em código.",
      "minutes": 52,
      "skills": [
       "mat-logica"
      ],
      "references": [
       "mit-6042",
       "rosen-discrete",
       "mit-math-2015-deep",
       "ies-study-guide"
      ],
      "theoryTitle": "Implicação, quantificadores e contraexemplos",
      "cardCount": 3,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e14-log-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "mat-logica"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e14-log-2",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "mat-logica"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e14-log-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "mat-logica",
         "comp-binario"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "mit-6042",
     "rosen-discrete"
    ]
   },
   {
    "id": "m14-2",
    "levelId": "n14",
    "title": "Combinatória e probabilidade",
    "titleEn": "Combinatorics and probability",
    "description": "Contar, estimar e raciocinar sob incerteza.",
    "prerequisites": [
     "m14-1",
     "m1-4"
    ],
    "skills": [
     {
      "id": "mat-probabilidade",
      "pt": "Combinatória e probabilidade",
      "en": "Combinatorics and probability"
     }
    ],
    "outline": [
     "Princípio multiplicativo",
     "Permutações e combinações",
     "Probabilidade condicional e Bayes",
     "Valor esperado",
     "Estatística descritiva",
     "Monte Carlo"
    ],
    "lessons": [
     {
      "id": "l14-combinatoria-probabilidade",
      "moduleId": "m14-2",
      "title": "Combinatória, probabilidade e estatística",
      "titleEn": "Combinatorics, probability and statistics",
      "summary": "Contar sem listar, probabilidade condicional, valor esperado e simulação — a matemática de algoritmos, hashing e IA.",
      "minutes": 57,
      "skills": [
       "mat-probabilidade"
      ],
      "references": [
       "mit-6042",
       "rosen-discrete",
       "harvard-stat110",
       "v7-applied-probability",
       "ies-study-guide"
      ],
      "theoryTitle": "Contagem, condicionamento e a importância do denominador",
      "cardCount": 3,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e14-prob-1",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "mat-probabilidade"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e14-prob-2",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "mat-probabilidade"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e14-prob-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "mat-probabilidade"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "mit-6042",
     "harvard-stat110"
    ]
   },
   {
    "id": "m14-3",
    "levelId": "n14",
    "title": "Matemática discreta: indução, recorrências e grafos",
    "titleEn": "Discrete math: induction, recurrences and graphs",
    "description": "Provar que algoritmos funcionam e quanto custam.",
    "prerequisites": [
     "m14-1",
     "m4-4"
    ],
    "skills": [
     {
      "id": "mat-discreta",
      "pt": "Matemática discreta",
      "en": "Discrete mathematics"
     }
    ],
    "outline": [
     "Indução matemática",
     "Invariantes de laço e corretude",
     "Recorrências e Teorema Mestre",
     "Teoria dos grafos",
     "Aritmética modular (base da criptografia)"
    ],
    "lessons": [
     {
      "id": "l14-discreta",
      "moduleId": "m14-3",
      "title": "Indução, invariantes, recorrências, grafos e aritmética modular",
      "titleEn": "Induction, invariants, recurrences, graphs and modular arithmetic",
      "summary": "As ferramentas para provar que um algoritmo está certo, calcular quanto ele custa e trabalhar com os números da criptografia.",
      "minutes": 67,
      "skills": [
       "mat-discreta"
      ],
      "references": [
       "mit-6042",
       "rosen-discrete",
       "clrs",
       "v7-applied-discrete",
       "ies-study-guide"
      ],
      "theoryTitle": "Provas de algoritmos: hipótese, passo e medida de progresso",
      "cardCount": 5,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e14-disc-0",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "mat-discreta"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e14-disc-1",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "mat-discreta"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e14-disc-2",
        "kind": "mcq",
        "difficulty": "avancado",
        "skills": [
         "mat-discreta"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e14-disc-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "mat-discreta"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "mit-6042",
     "rosen-discrete",
     "clrs"
    ]
   },
   {
    "id": "m14-4",
    "levelId": "n14",
    "title": "Álgebra linear e cálculo para IA",
    "titleEn": "Linear algebra and calculus for AI",
    "description": "Vetores, matrizes, derivadas e gradientes.",
    "prerequisites": [
     "m14-2",
     "m2-2"
    ],
    "skills": [
     {
      "id": "mat-algebra",
      "pt": "Álgebra linear e cálculo",
      "en": "Linear algebra and calculus"
     }
    ],
    "outline": [
     "Vetores e produto escalar",
     "Matrizes e multiplicação",
     "Transformações lineares",
     "Derivadas e regra da cadeia",
     "Gradiente",
     "Aplicações: gráficos, recomendação, redes neurais"
    ],
    "lessons": [
     {
      "id": "l14-algebra-calculo",
      "moduleId": "m14-4",
      "title": "Vetores, matrizes, derivadas e gradiente",
      "titleEn": "Vectors, matrices, derivatives and gradient",
      "summary": "A matemática por trás de gráficos, recomendação e redes neurais: produto escalar, multiplicação de matrizes, derivadas e a descida do gradiente.",
      "minutes": 67,
      "skills": [
       "mat-algebra"
      ],
      "references": [
       "mit-1806",
       "mml-book",
       "v7-applied-gradient",
       "ies-study-guide"
      ],
      "theoryTitle": "Dimensões, sensibilidades e passos de otimização",
      "cardCount": 4,
      "stages": [
       "conceito",
       "explicacao",
       "exemplo",
       "codigo",
       "exercicio",
       "desafio",
       "projeto",
       "revisao"
      ],
      "exercises": [
       {
        "id": "e14-alg-0",
        "kind": "mcq",
        "difficulty": "facil",
        "skills": [
         "mat-algebra"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e14-alg-1",
        "kind": "code",
        "difficulty": "intermediario",
        "skills": [
         "mat-algebra"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e14-alg-2",
        "kind": "mcq",
        "difficulty": "intermediario",
        "skills": [
         "mat-algebra"
        ],
        "stage": "exercicio"
       },
       {
        "id": "e14-alg-desafio",
        "kind": "code",
        "difficulty": "desafio",
        "skills": [
         "mat-algebra"
        ],
        "stage": "desafio"
       }
      ]
     }
    ],
    "references": [
     "mit-1806",
     "mml-book"
    ]
   }
  ]
 }
];

export const paidTerms: LessonTerms[] = [
 {
  "lessonId": "l2-por-que-python",
  "terms": [
   {
    "pt": "interpretador",
    "en": "interpreter",
    "def": "Programa que lê e executa código-fonte (o python)."
   },
   {
    "pt": "código-fonte",
    "en": "source code",
    "def": "O texto do programa escrito por pessoas."
   },
   {
    "pt": "sintaxe",
    "en": "syntax",
    "def": "As regras de escrita de uma linguagem.",
    "example": "SyntaxError: invalid syntax"
   },
   {
    "pt": "semântica",
    "en": "semantics",
    "def": "O significado do que está escrito: o que o código faz."
   },
   {
    "pt": "biblioteca padrão",
    "en": "standard library",
    "def": "Módulos que já vêm com a linguagem."
   },
   {
    "pt": "guia de estilo",
    "en": "style guide",
    "def": "Convenções de formatação (em Python, o PEP 8)."
   }
  ]
 },
 {
  "lessonId": "l2-listas",
  "terms": [
   {
    "pt": "lista",
    "en": "list",
    "def": "Sequência ordenada e mutável de valores."
   },
   {
    "pt": "índice",
    "en": "index",
    "def": "Posição de um elemento, começando em 0.",
    "example": "IndexError: list index out of range"
   },
   {
    "pt": "fatia",
    "en": "slice",
    "def": "Pedaço de uma sequência: lista[1:3]."
   },
   {
    "pt": "mutável",
    "en": "mutable",
    "def": "Que pode ser alterado depois de criado."
   },
   {
    "pt": "apelido (aliasing)",
    "en": "aliasing",
    "def": "Dois nomes apontando para o mesmo objeto."
   },
   {
    "pt": "compreensão de lista",
    "en": "list comprehension",
    "def": "Forma compacta de criar listas: [x*2 for x in xs]."
   }
  ]
 },
 {
  "lessonId": "l2-dicionarios",
  "terms": [
   {
    "pt": "dicionário",
    "en": "dictionary (dict)",
    "def": "Coleção de pares chave → valor.",
    "example": "KeyError: 'idade'"
   },
   {
    "pt": "chave",
    "en": "key",
    "def": "Identificador usado para buscar um valor no dicionário."
   },
   {
    "pt": "conjunto",
    "en": "set",
    "def": "Coleção sem ordem e sem repetição."
   },
   {
    "pt": "tupla",
    "en": "tuple",
    "def": "Sequência imutável: (lat, long)."
   },
   {
    "pt": "imutável",
    "en": "immutable",
    "def": "Que não pode ser alterado depois de criado."
   }
  ]
 },
 {
  "lessonId": "l2-strings",
  "terms": [
   {
    "pt": "caractere",
    "en": "character (char)",
    "def": "Um símbolo: letra, dígito, espaço, emoji."
   },
   {
    "pt": "separar",
    "en": "split",
    "def": "Dividir um texto em partes."
   },
   {
    "pt": "juntar",
    "en": "join",
    "def": "Unir partes em um texto com um separador."
   },
   {
    "pt": "remover espaços das pontas",
    "en": "strip / trim",
    "def": "Tirar espaços (e \\n) do início e do fim."
   },
   {
    "pt": "subcadeia",
    "en": "substring",
    "def": "Parte de uma string."
   }
  ]
 },
 {
  "lessonId": "l2-arquivos",
  "terms": [
   {
    "pt": "abrir",
    "en": "open",
    "def": "Obter acesso a um arquivo para ler ou escrever."
   },
   {
    "pt": "modo",
    "en": "mode",
    "def": "\"r\" ler, \"w\" escrever (apaga), \"a\" acrescentar."
   },
   {
    "pt": "gerenciador de contexto",
    "en": "context manager",
    "def": "Estrutura with que garante que o arquivo seja fechado."
   },
   {
    "pt": "serializar",
    "en": "serialize",
    "def": "Transformar dados em texto/bytes para guardar ou enviar (ex.: JSON)."
   },
   {
    "pt": "JSON",
    "en": "JSON (JavaScript Object Notation)",
    "def": "Formato de texto para dados estruturados, usado em APIs."
   }
  ]
 },
 {
  "lessonId": "l2-erros-excecoes",
  "terms": [
   {
    "pt": "exceção",
    "en": "exception",
    "def": "Erro detectado durante a execução, que interrompe o fluxo normal."
   },
   {
    "pt": "rastreamento da pilha",
    "en": "traceback / stack trace",
    "def": "Relatório das chamadas ativas quando o erro aconteceu."
   },
   {
    "pt": "lançar",
    "en": "raise / throw",
    "def": "Sinalizar uma exceção."
   },
   {
    "pt": "capturar",
    "en": "catch / handle",
    "def": "Tratar uma exceção com except."
   },
   {
    "pt": "erro de lógica",
    "en": "logic error / bug",
    "def": "O programa roda, mas faz a coisa errada."
   }
  ]
 },
 {
  "lessonId": "l2-debugging",
  "terms": [
   {
    "pt": "depuração",
    "en": "debugging",
    "def": "Processo de encontrar e corrigir defeitos."
   },
   {
    "pt": "reproduzir",
    "en": "reproduce",
    "def": "Fazer o bug acontecer de forma confiável."
   },
   {
    "pt": "ponto de parada",
    "en": "breakpoint",
    "def": "Lugar onde o depurador pausa a execução."
   },
   {
    "pt": "depurador",
    "en": "debugger",
    "def": "Ferramenta para executar passo a passo e inspecionar variáveis."
   },
   {
    "pt": "hipótese",
    "en": "hypothesis",
    "def": "Explicação provisória que você testa."
   }
  ]
 },
 {
  "lessonId": "l2-modulos",
  "terms": [
   {
    "pt": "módulo",
    "en": "module",
    "def": "Um arquivo .py que pode ser importado."
   },
   {
    "pt": "pacote",
    "en": "package",
    "def": "Uma pasta de módulos; ou uma biblioteca instalável."
   },
   {
    "pt": "importar",
    "en": "import",
    "def": "Trazer código de outro módulo.",
    "example": "ModuleNotFoundError: No module named 'requests'"
   },
   {
    "pt": "dependência",
    "en": "dependency",
    "def": "Biblioteca de terceiros que seu projeto usa."
   },
   {
    "pt": "ambiente virtual",
    "en": "virtual environment (venv)",
    "def": "Pasta isolada com as dependências de um projeto."
   }
  ]
 },
 {
  "lessonId": "l2-testes",
  "terms": [
   {
    "pt": "teste de unidade",
    "en": "unit test",
    "def": "Teste de uma pequena parte isolada do código (uma função)."
   },
   {
    "pt": "asserção",
    "en": "assertion",
    "def": "Afirmação que deve ser verdadeira; se não for, o teste falha.",
    "example": "AssertionError: expected 5, got 4"
   },
   {
    "pt": "caso de teste",
    "en": "test case",
    "def": "Uma entrada com o resultado esperado."
   },
   {
    "pt": "desenvolvimento guiado por testes",
    "en": "test-driven development (TDD)",
    "def": "Escrever o teste antes do código: red → green → refactor."
   },
   {
    "pt": "regressão",
    "en": "regression",
    "def": "Bug que volta depois de corrigido; testes previnem."
   }
  ]
 },
 {
  "lessonId": "l3-arrays",
  "terms": [
   {
    "pt": "arranjo / vetor",
    "en": "array",
    "def": "Sequência de elementos em posições de memória contíguas."
   },
   {
    "pt": "contíguo",
    "en": "contiguous",
    "def": "Lado a lado, sem buracos, na memória."
   },
   {
    "pt": "estrutura de dados",
    "en": "data structure",
    "def": "Forma de organizar dados para que certas operações sejam eficientes."
   },
   {
    "pt": "custo amortizado",
    "en": "amortized cost",
    "def": "Custo médio por operação ao longo de muitas operações."
   },
   {
    "pt": "capacidade",
    "en": "capacity",
    "def": "Espaço reservado; pode ser maior que o tamanho usado."
   }
  ]
 },
 {
  "lessonId": "l3-crescimento-amortizado",
  "terms": [
   {
    "pt": "realocação",
    "en": "reallocation",
    "def": "Reservar um bloco de memória de outro tamanho e mover os elementos para ele.",
    "example": "The list is reallocated when it runs out of capacity."
   },
   {
    "pt": "crescimento geométrico",
    "en": "geometric growth",
    "def": "Aumentar a capacidade multiplicando-a por um fator constante, como ×2 ou ×1,5."
   },
   {
    "pt": "crescimento aritmético",
    "en": "arithmetic growth",
    "def": "Aumentar a capacidade somando uma constante, como +1 ou +100. Leva n appends a O(n²)."
   },
   {
    "pt": "fator de crescimento",
    "en": "growth factor",
    "def": "Número pelo qual a capacidade é multiplicada a cada realocação.",
    "example": "Java's ArrayList uses a growth factor of 1.5."
   },
   {
    "pt": "pior caso",
    "en": "worst case",
    "def": "O maior custo possível de uma única execução de uma operação."
   },
   {
    "pt": "caso médio",
    "en": "average case",
    "def": "Custo médio quando a entrada é sorteada segundo alguma distribuição; depende dessa suposição."
   },
   {
    "pt": "método contábil",
    "en": "accounting method",
    "def": "Técnica de análise amortizada: operações baratas pagam um pouco a mais e guardam crédito para pagar as caras."
   },
   {
    "pt": "histerese",
    "en": "hysteresis",
    "def": "Folga entre o ponto de crescer e o de encolher, para a estrutura não realocar a cada operação."
   },
   {
    "pt": "pré-alocar",
    "en": "preallocate",
    "def": "Reservar todo o espaço de uma vez quando o tamanho final já é conhecido.",
    "example": "Preallocate the list with [None] * n to avoid repeated resizing."
   }
  ]
 },
 {
  "lessonId": "l3-dois-ponteiros",
  "terms": [
   {
    "pt": "dois ponteiros",
    "en": "two pointers",
    "def": "Técnica que percorre a lista com dois índices que nunca voltam atrás, descartando candidatos a cada passo.",
    "example": "This problem can be solved in O(n) with the two pointers technique."
   },
   {
    "pt": "ponteiro",
    "en": "pointer",
    "def": "Aqui, uma variável que guarda uma posição (índice) da lista. Em C, é um endereço de memória."
   },
   {
    "pt": "ponteiros convergentes",
    "en": "converging pointers",
    "def": "Um índice em cada ponta, andando um em direção ao outro até se cruzarem."
   },
   {
    "pt": "leitor e escritor",
    "en": "read/write pointers",
    "def": "Dois índices no mesmo sentido: um lê todos os elementos, o outro só avança quando um elemento é mantido."
   },
   {
    "pt": "invariante de laço",
    "en": "loop invariant",
    "def": "Afirmação verdadeira antes de cada volta do laço que, no fim, garante que o resultado está certo.",
    "example": "The loop invariant is that xs[:write] holds exactly the kept elements."
   },
   {
    "pt": "no lugar",
    "en": "in place",
    "def": "Modificando a própria lista, com O(1) de memória extra.",
    "example": "Modify the input array in place with O(1) extra memory."
   },
   {
    "pt": "espaço de busca",
    "en": "search space",
    "def": "Conjunto de candidatos que ainda podem ser a resposta."
   },
   {
    "pt": "intercalar",
    "en": "merge",
    "def": "Juntar duas sequências ordenadas em uma só, também ordenada."
   }
  ]
 },
 {
  "lessonId": "l3-pilhas-filas",
  "terms": [
   {
    "pt": "pilha",
    "en": "stack",
    "def": "Estrutura LIFO: o último a entrar é o primeiro a sair."
   },
   {
    "pt": "fila",
    "en": "queue",
    "def": "Estrutura FIFO: o primeiro a entrar é o primeiro a sair."
   },
   {
    "pt": "empilhar / desempilhar",
    "en": "push / pop",
    "def": "Colocar e retirar do topo da pilha."
   },
   {
    "pt": "enfileirar / desenfileirar",
    "en": "enqueue / dequeue",
    "def": "Colocar no fim e retirar do início da fila."
   },
   {
    "pt": "topo",
    "en": "top / peek",
    "def": "O elemento que sairia primeiro."
   },
   {
    "pt": "fila dupla",
    "en": "deque (double-ended queue)",
    "def": "Estrutura que permite inserir e remover nas duas pontas em O(1)."
   }
  ]
 },
 {
  "lessonId": "l3-expressoes-rpn",
  "terms": [
   {
    "pt": "notação infixa",
    "en": "infix notation",
    "def": "O operador fica entre os operandos, como em 3 + 4. Precisa de regras de precedência e de parênteses.",
    "example": "Most programming languages use infix notation for arithmetic."
   },
   {
    "pt": "operando",
    "en": "operand",
    "def": "Valor sobre o qual um operador age. Em 3 + 4, os operandos são 3 e 4.",
    "example": "TypeError: unsupported operand type(s) for +: 'int' and 'str'"
   },
   {
    "pt": "notação polonesa reversa / pós-fixa",
    "en": "Reverse Polish Notation (RPN) / postfix notation",
    "def": "O operador vem depois dos operandos, como em 3 4 +. Não precisa de parênteses nem de precedência.",
    "example": "HP calculators such as the HP 12C use Reverse Polish Notation."
   },
   {
    "pt": "notação prefixa / polonesa",
    "en": "prefix notation / Polish notation",
    "def": "O operador vem antes dos operandos, como em + 3 4. Proposta por Jan Łukasiewicz em 1924."
   },
   {
    "pt": "precedência",
    "en": "operator precedence",
    "def": "Regra que diz qual operador é aplicado primeiro quando estão em níveis diferentes: * antes de +."
   },
   {
    "pt": "associatividade",
    "en": "associativity",
    "def": "Regra de desempate entre operadores de mesma precedência: à esquerda, (8 - 3) - 2; à direita, 2 ** (3 ** 2).",
    "example": "Operators in the same box group left to right (except for exponentiation and conditional expressions, which group from right to left)."
   },
   {
    "pt": "algoritmo do pátio de manobras",
    "en": "shunting-yard algorithm",
    "def": "Método publicado por Edsger Dijkstra em 1961 (não confundir com o algoritmo de Dijkstra de menor caminho) que converte infixa em pós-fixa usando uma pilha de operadores.",
    "example": "The shunting-yard algorithm converts an infix expression to postfix in linear time."
   },
   {
    "pt": "token",
    "en": "token",
    "def": "Menor pedaço com significado em um texto: um número, um operador, um parêntese.",
    "example": "The tokenize module provides a lexical scanner for Python source code."
   },
   {
    "pt": "máquina de pilha",
    "en": "stack machine",
    "def": "Máquina (real ou virtual) cujas instruções tiram operandos de uma pilha e empilham o resultado. CPython, JVM e WebAssembly funcionam assim."
   }
  ]
 },
 {
  "lessonId": "l3-filas-prioridade",
  "terms": [
   {
    "pt": "fila de prioridade",
    "en": "priority queue",
    "def": "Estrutura que sempre entrega primeiro o item mais prioritário (em Python, o de menor chave), não o mais antigo.",
    "example": "This module provides an implementation of the heap queue algorithm, also known as the priority queue algorithm."
   },
   {
    "pt": "tipo abstrato de dados",
    "en": "abstract data type (ADT)",
    "def": "Descrição de uma estrutura pelas operações que ela oferece, sem dizer como é implementada por dentro.",
    "example": "A stack is an abstract data type that supports push and pop."
   },
   {
    "pt": "heap mínimo",
    "en": "min-heap",
    "def": "Organização em que o menor elemento está sempre na raiz (em heapq, em h[0]); inserir e retirar custam O(log n).",
    "example": "The interesting property of a heap is that its smallest element is always the root, heap[0]."
   },
   {
    "pt": "heap máximo",
    "en": "max-heap",
    "def": "Variante em que o maior elemento fica na raiz. Com heapq, simula-se guardando as chaves com o sinal trocado."
   },
   {
    "pt": "transformar em heap",
    "en": "heapify",
    "def": "Reorganizar uma lista existente para que ela vire um heap, no lugar, em O(n).",
    "example": "Transform list x into a heap, in-place, in linear time."
   },
   {
    "pt": "critério de desempate",
    "en": "tie-breaker",
    "def": "Valor extra que decide a ordem entre itens de mesma prioridade, como a ordem de chegada."
   },
   {
    "pt": "estável",
    "en": "stable",
    "def": "Que preserva a ordem original entre itens empatados.",
    "example": "The built-in sorted() function is guaranteed to be stable."
   },
   {
    "pt": "remoção preguiçosa",
    "en": "lazy deletion",
    "def": "Em vez de apagar ou alterar uma entrada no meio do heap, deixá-la lá e ignorá-la quando ela sair."
   },
   {
    "pt": "k maiores",
    "en": "top-k",
    "def": "Problema de achar os k maiores (ou menores) itens de uma coleção ou de um fluxo.",
    "example": "Return the top k most frequent elements."
   },
   {
    "pt": "fluxo de dados",
    "en": "data stream",
    "def": "Sequência de dados que chega aos poucos e que você processa sem guardar inteira.",
    "example": "Find the median from a data stream."
   }
  ]
 },
 {
  "lessonId": "l3-hash",
  "terms": [
   {
    "pt": "tabela hash / tabela de dispersão",
    "en": "hash table / hash map",
    "def": "Estrutura que usa uma função hash para localizar chaves rapidamente."
   },
   {
    "pt": "função hash",
    "en": "hash function",
    "def": "Função que transforma uma chave em um número."
   },
   {
    "pt": "colisão",
    "en": "collision",
    "def": "Quando duas chaves diferentes caem na mesma posição."
   },
   {
    "pt": "balde",
    "en": "bucket",
    "def": "Posição da tabela onde ficam os itens."
   },
   {
    "pt": "fator de carga",
    "en": "load factor",
    "def": "Quantidade de itens dividida pelo número de posições."
   },
   {
    "pt": "hashável",
    "en": "hashable",
    "def": "Objeto com hash estável e compatível com igualdade; pode ser chave.",
    "example": "TypeError: unhashable type: 'list'"
   }
  ]
 },
 {
  "lessonId": "l3-enderecamento-aberto",
  "terms": [
   {
    "pt": "encadeamento",
    "en": "separate chaining",
    "def": "Estratégia de colisão em que cada posição da tabela guarda uma lista com todas as chaves que caíram nela."
   },
   {
    "pt": "endereçamento aberto",
    "en": "open addressing",
    "def": "Estratégia de colisão em que cada posição guarda no máximo uma chave; se a posição está ocupada, procura-se outra seguindo uma regra fixa.",
    "example": "CPython dictionaries use open addressing to resolve hash collisions."
   },
   {
    "pt": "sondagem linear",
    "en": "linear probing",
    "def": "Regra de endereçamento aberto que, depois da posição de origem, tenta a seguinte (i + 1, i + 2, ...), dando a volta no fim do array."
   },
   {
    "pt": "sequência de sondagem",
    "en": "probe sequence",
    "def": "Ordem das posições visitadas ao inserir ou procurar uma chave."
   },
   {
    "pt": "lápide",
    "en": "tombstone",
    "def": "Marca deixada na posição de uma chave removida, para que as buscas continuem passando por ali.",
    "example": "Deleted entries are replaced by a dummy (tombstone) so that probe sequences are not broken."
   },
   {
    "pt": "agrupamento primário",
    "en": "primary clustering",
    "def": "Tendência da sondagem linear de formar blocos contíguos de posições ocupadas, que crescem e deixam as buscas cada vez mais longas."
   },
   {
    "pt": "paradoxo do aniversário",
    "en": "birthday paradox",
    "def": "Com só 23 pessoas, a chance de duas fazerem aniversário no mesmo dia passa de 50%; com m posições, cerca de 1,2·√m chaves já dão 50% de chance de colisão."
   },
   {
    "pt": "reconstrução",
    "en": "rehashing",
    "def": "Criar um array novo e reinserir nele todas as chaves vivas; acontece para crescer a tabela ou para limpar lápides.",
    "example": "When the load factor exceeds the threshold, the table is resized and every entry is rehashed."
   }
  ]
 },
 {
  "lessonId": "l3-chaves-hash",
  "terms": [
   {
    "pt": "hash polinomial",
    "en": "polynomial hash",
    "def": "Função hash que trata o texto como algarismos de um número numa base B: h = h·B + código da letra, letra a letra, guardando o resto da divisão por um número grande.",
    "example": "Java's String.hashCode() is a polynomial hash with base 31."
   },
   {
    "pt": "efeito avalanche",
    "en": "avalanche effect",
    "def": "Propriedade de boas funções hash: mudar um único bit da entrada muda, em média, metade dos bits da saída."
   },
   {
    "pt": "ataque por inundação de hash",
    "en": "hash flooding (HashDoS)",
    "def": "Ataque que envia muitas chaves com o mesmo hash para que buscas O(1) virem O(n) e o servidor trave."
   },
   {
    "pt": "métodos especiais",
    "en": "special methods (dunder methods)",
    "def": "Métodos com nome entre sublinhados duplos, como __eq__ e __hash__, que o Python chama sozinho em certas operações (==, hash(), dict, set)."
   },
   {
    "pt": "não hashável",
    "en": "unhashable",
    "def": "Objeto sem hash, que não pode ser chave de dict nem elemento de set.",
    "example": "TypeError: unhashable type: 'set'"
   },
   {
    "pt": "classe de dados congelada",
    "en": "frozen dataclass",
    "def": "Classe criada com @dataclass(frozen=True): os campos não podem mudar depois de criados, e __eq__ e __hash__ são gerados de forma coerente.",
    "example": "dataclasses.FrozenInstanceError: cannot assign to field 'x'"
   },
   {
    "pt": "chave composta",
    "en": "composite key",
    "def": "Chave formada por mais de um valor, geralmente uma tupla, como (linha, ponto)."
   },
   {
    "pt": "forma canônica",
    "en": "canonical form",
    "def": "Representação única escolhida para valores que devem contar como iguais, como o CEP só com dígitos."
   },
   {
    "pt": "soma acumulada",
    "en": "prefix sum",
    "def": "Soma dos elementos desde o início da lista até uma posição; a soma de um trecho é a diferença entre duas somas acumuladas."
   }
  ]
 },
 {
  "lessonId": "l3-arvores",
  "terms": [
   {
    "pt": "árvore",
    "en": "tree",
    "def": "Estrutura hierárquica de nós ligados, sem ciclos."
   },
   {
    "pt": "nó",
    "en": "node",
    "def": "Cada elemento da árvore."
   },
   {
    "pt": "raiz",
    "en": "root",
    "def": "O nó do topo, sem pai."
   },
   {
    "pt": "folha",
    "en": "leaf",
    "def": "Nó sem filhos."
   },
   {
    "pt": "altura",
    "en": "height",
    "def": "Maior número de arestas da raiz até uma folha."
   },
   {
    "pt": "árvore binária de busca",
    "en": "binary search tree (BST)",
    "def": "Árvore em que, para cada nó, à esquerda ficam menores e à direita maiores."
   },
   {
    "pt": "percurso",
    "en": "traversal",
    "def": "Forma de visitar todos os nós."
   }
  ]
 },
 {
  "lessonId": "l3-arvores-balanceadas",
  "terms": [
   {
    "pt": "árvore balanceada",
    "en": "balanced tree",
    "def": "Árvore cuja altura se mantém O(log n), qualquer que seja a ordem das inserções e remoções.",
    "example": "Balanced search trees guarantee logarithmic height."
   },
   {
    "pt": "autobalanceável",
    "en": "self-balancing",
    "def": "Que se reorganiza sozinha, a cada inserção ou remoção, para continuar balanceada.",
    "example": "A self-balancing binary search tree keeps its height small automatically."
   },
   {
    "pt": "rotação",
    "en": "rotation",
    "def": "Troca local entre um nó e um filho que muda as profundidades e preserva o percurso em ordem; custa O(1).",
    "example": "A right rotation at y makes its left child x the new root of the subtree."
   },
   {
    "pt": "fator de balanceamento",
    "en": "balance factor",
    "def": "Altura da subárvore esquerda menos a altura da direita; numa AVL fica entre −1 e +1 em todo nó."
   },
   {
    "pt": "árvore AVL",
    "en": "AVL tree",
    "def": "BST em que, em todo nó, as alturas das duas subárvores diferem no máximo em 1. O nome vem de Adelson-Velsky e Landis (1962)."
   },
   {
    "pt": "invariante",
    "en": "invariant",
    "def": "Propriedade que a estrutura garante antes e depois de toda operação.",
    "example": "Every operation must restore the AVL invariant before returning."
   },
   {
    "pt": "rotação dupla",
    "en": "double rotation",
    "def": "Duas rotações seguidas, primeiro no filho e depois no nó, que corrigem os casos em zigue-zague (LR e RL)."
   },
   {
    "pt": "sucessor",
    "en": "in-order successor",
    "def": "O próximo valor no percurso em ordem; numa BST, o menor valor da subárvore direita."
   },
   {
    "pt": "árvore rubro-negra",
    "en": "red-black tree",
    "def": "BST balanceada em que cada nó é vermelho ou preto; as regras de cor garantem altura de no máximo 2·log₂(n + 1).",
    "example": "A Red-Black tree based NavigableMap implementation."
   }
  ]
 },
 {
  "lessonId": "l3-heap-binario",
  "terms": [
   {
    "pt": "heap binário",
    "en": "binary heap",
    "def": "Árvore binária completa com a propriedade de heap, guardada numa lista, sem nós nem ponteiros.",
    "example": "Heaps are binary trees for which every parent node has a value less than or equal to any of its children."
   },
   {
    "pt": "árvore binária completa",
    "en": "complete binary tree",
    "def": "Árvore binária com todos os níveis cheios, exceto talvez o último, que é preenchido da esquerda para a direita."
   },
   {
    "pt": "propriedade de heap",
    "en": "heap property / heap invariant",
    "def": "Num heap mínimo, todo pai é menor ou igual aos seus filhos; entre irmãos não há regra.",
    "example": "We refer to this condition as the heap invariant."
   },
   {
    "pt": "subir",
    "en": "sift up",
    "def": "Trocar um elemento com o pai enquanto ele for menor que o pai, levando-o em direção à raiz."
   },
   {
    "pt": "descer",
    "en": "sift down",
    "def": "Trocar um elemento com o menor dos filhos enquanto ele for maior que algum filho, levando-o em direção às folhas."
   },
   {
    "pt": "construção de baixo para cima",
    "en": "bottom-up heap construction",
    "def": "Montar um heap fazendo descer cada pai, do último até a raiz; custa O(n). É o que heapq.heapify faz.",
    "example": "Transform list x into a heap, in-place, in linear time."
   },
   {
    "pt": "no lugar",
    "en": "in-place",
    "def": "Que trabalha dentro da própria lista, com memória extra O(1).",
    "example": "This method sorts the list in place, using only < comparisons between items."
   },
   {
    "pt": "heapsort",
    "en": "heapsort",
    "def": "Ordenação que monta um heap máximo e manda o maior para o fim repetidamente; O(n log n) no pior caso, no lugar, não estável."
   }
  ]
 },
 {
  "lessonId": "l3-grafos",
  "terms": [
   {
    "pt": "grafo",
    "en": "graph",
    "def": "Conjunto de vértices ligados por arestas."
   },
   {
    "pt": "vértice",
    "en": "vertex / node",
    "def": "Um elemento do grafo (uma pessoa, uma cidade, uma página)."
   },
   {
    "pt": "aresta",
    "en": "edge",
    "def": "Uma ligação entre dois vértices."
   },
   {
    "pt": "lista de adjacência",
    "en": "adjacency list",
    "def": "Para cada vértice, a lista dos vizinhos."
   },
   {
    "pt": "busca em largura",
    "en": "breadth-first search (BFS)",
    "def": "Explora por camadas, usando uma fila."
   },
   {
    "pt": "busca em profundidade",
    "en": "depth-first search (DFS)",
    "def": "Explora um caminho até o fim antes de voltar, usando pilha ou recursão."
   },
   {
    "pt": "direcionado",
    "en": "directed",
    "def": "Arestas com sentido (seguir no Instagram)."
   }
  ]
 },
 {
  "lessonId": "l3-grafos-dfs",
  "terms": [
   {
    "pt": "lista de arestas",
    "en": "edge list",
    "def": "Representação que guarda só os pares (u, v), um por aresta; é como os dados chegam de um arquivo ou banco, mas não ajuda a achar vizinhos."
   },
   {
    "pt": "matriz de adjacência",
    "en": "adjacency matrix",
    "def": "Tabela V × V em que a célula [u][v] indica se existe aresta de u para v; ocupa O(V²) de memória, com qualquer número de arestas.",
    "example": "An adjacency matrix requires Θ(V²) memory, independent of the number of edges."
   },
   {
    "pt": "grau",
    "en": "degree",
    "def": "Número de arestas que tocam um vértice; em grafo direcionado, separa-se grau de entrada e grau de saída.",
    "example": "In an undirected graph, the sum of the degrees of all vertices is twice the number of edges."
   },
   {
    "pt": "grafo esparso",
    "en": "sparse graph",
    "def": "Grafo com muito menos arestas que o máximo possível (E bem menor que V²); é o caso comum na prática."
   },
   {
    "pt": "grafo denso",
    "en": "dense graph",
    "def": "Grafo em que E é da ordem de V²; nele a matriz de adjacência deixa de ser desperdício."
   },
   {
    "pt": "grafo implícito",
    "en": "implicit graph",
    "def": "Grafo cujas arestas são calculadas na hora (como as 4 células vizinhas numa grade), sem ficarem guardadas em lugar nenhum."
   },
   {
    "pt": "componente conexo",
    "en": "connected component",
    "def": "Grupo máximo de vértices de um grafo não direcionado em que todos se alcançam.",
    "example": "The connected components of a graph can be found with a single pass of DFS over all vertices."
   },
   {
    "pt": "preenchimento por inundação",
    "en": "flood fill",
    "def": "Visitar (ou pintar) toda a região conectada a uma célula, como o balde de tinta dos editores de imagem."
   },
   {
    "pt": "aresta de retorno",
    "en": "back edge",
    "def": "Na DFS, aresta que aponta para um vértice ainda em andamento (cinza); num grafo direcionado, é a prova de que existe ciclo.",
    "example": "A directed graph is acyclic if and only if a depth-first search yields no back edges."
   },
   {
    "pt": "grafo acíclico direcionado",
    "en": "directed acyclic graph (DAG)",
    "def": "Grafo direcionado sem ciclos, como todo sistema de pré-requisitos ou de dependências bem feito.",
    "example": "A build system models tasks and their dependencies as a DAG."
   },
   {
    "pt": "componente fortemente conexo",
    "en": "strongly connected component (SCC)",
    "def": "Num grafo direcionado, grupo máximo de vértices em que cada um alcança todos os outros, seguindo o sentido das arestas.",
    "example": "Tarjan's algorithm finds all strongly connected components in a single depth-first search."
   }
  ]
 },
 {
  "lessonId": "l3-union-find",
  "terms": [
   {
    "pt": "Union-Find",
    "en": "union-find / disjoint-set union (DSU)",
    "def": "Estrutura que mantém grupos sem elementos em comum e oferece duas operações: find (qual é o grupo de x?) e union (junte os grupos de x e y).",
    "example": "A disjoint-set data structure supports MAKE-SET, UNION and FIND-SET."
   },
   {
    "pt": "conjuntos disjuntos",
    "en": "disjoint sets",
    "def": "Coleção de grupos sem elemento em comum: cada elemento pertence a exatamente um grupo."
   },
   {
    "pt": "conectividade dinâmica",
    "en": "dynamic connectivity",
    "def": "Responder \"x e y estão ligados?\" enquanto as ligações do grafo mudam. O Union-Find resolve o caso em que elas só chegam e nunca saem (a conectividade incremental)."
   },
   {
    "pt": "representante",
    "en": "representative",
    "def": "O elemento que identifica o grupo, a raiz da árvore: dois elementos estão no mesmo grupo se e somente se têm o mesmo representante."
   },
   {
    "pt": "união por tamanho",
    "en": "union by size",
    "def": "Ao juntar dois grupos, pendurar a raiz da árvore menor na raiz da maior; garante altura de no máximo log₂ n."
   },
   {
    "pt": "compressão de caminho",
    "en": "path compression",
    "def": "Durante o find, fazer cada elemento do caminho apontar direto para a raiz, achatando a árvore para as próximas buscas.",
    "example": "Path compression makes each node on the find path point directly to the root."
   },
   {
    "pt": "função inversa de Ackermann",
    "en": "inverse Ackermann function",
    "def": "Função α(n) que cresce tão devagar que não passa de 4 para nenhum n de uso prático; aparece no custo do Union-Find.",
    "example": "Union-find runs in O(α(n)) amortized time per operation."
   }
  ]
 },
 {
  "lessonId": "l4-big-o",
  "terms": [
   {
    "pt": "complexidade de tempo",
    "en": "time complexity",
    "def": "Como o número de operações cresce com o tamanho da entrada."
   },
   {
    "pt": "complexidade de espaço",
    "en": "space complexity",
    "def": "Como a memória extra usada cresce com a entrada."
   },
   {
    "pt": "notação O grande",
    "en": "Big O notation",
    "def": "Limite superior do crescimento, ignorando constantes."
   },
   {
    "pt": "pior caso",
    "en": "worst case",
    "def": "A entrada que faz o algoritmo trabalhar mais."
   },
   {
    "pt": "logarítmico",
    "en": "logarithmic",
    "def": "Cresce muito devagar: dobrar n soma um passo."
   },
   {
    "pt": "quadrático",
    "en": "quadratic",
    "def": "Dobrar n quadruplica o trabalho."
   }
  ]
 },
 {
  "lessonId": "l4-o-omega-teta",
  "terms": [
   {
    "pt": "análise assintótica",
    "en": "asymptotic analysis",
    "def": "Estudo de como o custo se comporta quando n cresce sem limite, ignorando constantes e entradas pequenas.",
    "example": "Asymptotic analysis lets us compare algorithms independently of the machine."
   },
   {
    "pt": "limite superior",
    "en": "upper bound",
    "def": "f(n) = O(g(n)): existe uma constante c > 0 tal que, a partir de algum n₀, f(n) ≤ c·g(n).",
    "example": "O(n²) is an upper bound on the running time, but not a tight one."
   },
   {
    "pt": "limite inferior",
    "en": "lower bound",
    "def": "f(n) = Ω(g(n)): existe uma constante c > 0 tal que, a partir de algum n₀, f(n) ≥ c·g(n).",
    "example": "Any comparison sort has a lower bound of Ω(n log n) comparisons in the worst case."
   },
   {
    "pt": "limite justo",
    "en": "tight bound",
    "def": "f(n) = Θ(g(n)): f é O(g) e Ω(g) ao mesmo tempo; cresce exatamente como g, a menos de constantes.",
    "example": "The worst-case running time of linear search is Θ(n)."
   },
   {
    "pt": "limite frouxo",
    "en": "loose bound",
    "def": "Limite verdadeiro, mas com folga, como dizer que n é O(n²)."
   },
   {
    "pt": "melhor caso",
    "en": "best case",
    "def": "A entrada de tamanho n que faz o algoritmo trabalhar menos."
   },
   {
    "pt": "caso médio",
    "en": "average case",
    "def": "O custo médio sobre as entradas de tamanho n, supondo uma distribuição delas (por exemplo, todas igualmente prováveis)."
   },
   {
    "pt": "série harmônica",
    "en": "harmonic series",
    "def": "1 + 1/2 + 1/3 + … + 1/n; cresce como ln n, por isso n/1 + n/2 + … + n/n é Θ(n log n)."
   }
  ]
 },
 {
  "lessonId": "l4-analise-amortizada",
  "terms": [
   {
    "pt": "análise amortizada",
    "en": "amortized analysis",
    "def": "Limitar o custo total de qualquer sequência de n operações e dividir por n. Não envolve probabilidade.",
    "example": "Amortized analysis guarantees the average performance of each operation in the worst case."
   },
   {
    "pt": "método agregado",
    "en": "aggregate method",
    "def": "Somar diretamente o custo real de toda a sequência e dividir pelo número de operações."
   },
   {
    "pt": "método contábil",
    "en": "accounting method",
    "def": "Cobrar um preço fixo de cada operação e guardar o troco como crédito, que paga as operações caras."
   },
   {
    "pt": "método do potencial",
    "en": "potential method",
    "def": "Medir o \"trabalho acumulado\" do estado com uma função Φ ≥ 0; custo amortizado = custo real + variação de Φ.",
    "example": "We define a potential function Φ that maps each state of the data structure to a nonnegative number."
   },
   {
    "pt": "contador binário",
    "en": "binary counter",
    "def": "Lista de bits que representa um número e só sabe somar 1; um incremento zera a sequência de bits 1 do fim (os menos significativos, à direita) e liga o primeiro 0 depois dela."
   },
   {
    "pt": "fila com duas pilhas",
    "en": "queue with two stacks",
    "def": "Fila FIFO feita com uma pilha de entrada e uma de saída; a entrada só é despejada na saída quando a saída está vazia.",
    "example": "Implement a queue using two stacks with amortized O(1) operations."
   },
   {
    "pt": "pilha monotônica",
    "en": "monotonic stack",
    "def": "Pilha cujos valores ficam sempre em ordem (por exemplo, nunca aumentam de baixo para cima); quem quebraria a ordem desempilha os outros antes de entrar.",
    "example": "Use a monotonic stack to find the next greater element for every index in O(n)."
   },
   {
    "pt": "janela deslizante",
    "en": "sliding window",
    "def": "Trecho contíguo [ini, fim] que percorre a sequência com os dois índices só andando para a frente, nunca para trás."
   },
   {
    "pt": "fila monotônica",
    "en": "monotonic queue",
    "def": "Deque de candidatos com valores em ordem; dá o máximo (ou o mínimo) de uma janela deslizante em O(1) amortizado."
   }
  ]
 },
 {
  "lessonId": "l4-busca",
  "terms": [
   {
    "pt": "busca linear",
    "en": "linear search",
    "def": "Olhar elemento por elemento."
   },
   {
    "pt": "busca binária",
    "en": "binary search",
    "def": "Em dados ordenados, comparar com o meio e descartar metade."
   },
   {
    "pt": "invariante",
    "en": "invariant",
    "def": "Propriedade que permanece verdadeira a cada passo do algoritmo."
   },
   {
    "pt": "ponto médio",
    "en": "midpoint",
    "def": "O índice do meio do intervalo atual."
   }
  ]
 },
 {
  "lessonId": "l4-bisect-fronteiras",
  "terms": [
   {
    "pt": "fronteira",
    "en": "boundary",
    "def": "Primeira posição em que um predicado passa de falso para verdadeiro numa sequência do tipo F…F V…V."
   },
   {
    "pt": "limite inferior",
    "en": "lower bound",
    "def": "Primeira posição cujo valor é maior ou igual ao alvo; é o que bisect_left devolve.",
    "example": "std::lower_bound returns the first element that is not less than the value."
   },
   {
    "pt": "limite superior",
    "en": "upper bound",
    "def": "Primeira posição cujo valor é estritamente maior que o alvo; é o que bisect_right devolve."
   },
   {
    "pt": "predicado",
    "en": "predicate",
    "def": "Pergunta de sim ou não sobre um valor, como \"xs[i] >= alvo?\"."
   },
   {
    "pt": "ponto de inserção",
    "en": "insertion point",
    "def": "Posição onde o alvo entraria para a lista continuar ordenada.",
    "example": "The returned insertion point ip partitions the array a into two slices."
   },
   {
    "pt": "intervalo semiaberto",
    "en": "half-open interval",
    "def": "Intervalo [lo, hi) que inclui lo e exclui hi, o mesmo padrão de range() e das fatias."
   },
   {
    "pt": "piso",
    "en": "floor",
    "def": "Numa coleção ordenada, o maior valor menor ou igual a x.",
    "example": "floor(key) returns the largest key less than or equal to key."
   },
   {
    "pt": "teto",
    "en": "ceiling",
    "def": "Numa coleção ordenada, o menor valor maior ou igual a x."
   }
  ]
 },
 {
  "lessonId": "l4-busca-na-resposta",
  "terms": [
   {
    "pt": "busca binária na resposta",
    "en": "binary search on the answer",
    "def": "Buscar o valor ótimo num intervalo de respostas possíveis, testando cada chute com um verificador.",
    "example": "Binary search on the answer works whenever feasibility is monotonic."
   },
   {
    "pt": "espaço de busca",
    "en": "search space",
    "def": "Conjunto das respostas candidatas; aqui, um intervalo de inteiros [lo, hi]."
   },
   {
    "pt": "verificador",
    "en": "feasibility check",
    "def": "Função que diz se um chute de resposta é viável, como \"dá para despachar tudo em D dias com capacidade C?\"."
   },
   {
    "pt": "viável",
    "en": "feasible",
    "def": "Que satisfaz todas as restrições do problema.",
    "example": "Return the least capacity such that a feasible schedule exists."
   },
   {
    "pt": "predicado monotônico",
    "en": "monotonic predicate",
    "def": "Predicado que, percorrendo os valores em ordem, muda de resposta no máximo uma vez: F…F V…V ou V…V F…F."
   },
   {
    "pt": "minimizar o máximo",
    "en": "minimize the maximum",
    "def": "Família de problemas em que se quer o menor valor possível para o pior caso, como a maior carga diária de um caminhão."
   },
   {
    "pt": "maximizar o mínimo",
    "en": "maximize the minimum",
    "def": "Família de problemas em que se quer o maior valor possível para o pior caso, como a menor distância entre duas caixas de som."
   },
   {
    "pt": "teto da divisão",
    "en": "ceiling division",
    "def": "Divisão arredondada para cima, ⌈p / v⌉; com inteiros em Python, (p + v - 1) // v."
   }
  ]
 },
 {
  "lessonId": "l4-ordenacao",
  "terms": [
   {
    "pt": "ordenação",
    "en": "sorting",
    "def": "Colocar elementos em ordem."
   },
   {
    "pt": "estável",
    "en": "stable",
    "def": "Mantém a ordem relativa de elementos iguais."
   },
   {
    "pt": "no lugar",
    "en": "in-place",
    "def": "Usa memória extra constante (ou quase)."
   },
   {
    "pt": "pivô",
    "en": "pivot",
    "def": "Elemento usado pelo quicksort para dividir a lista."
   },
   {
    "pt": "intercalar",
    "en": "merge",
    "def": "Juntar duas listas ordenadas em uma ordenada."
   }
  ]
 },
 {
  "lessonId": "l4-quicksort",
  "terms": [
   {
    "pt": "particionamento",
    "en": "partitioning",
    "def": "Reorganizar um trecho em torno de um pivô: menores de um lado, maiores do outro e o pivô na posição definitiva entre eles.",
    "example": "Quicksort does all of its real work in the partitioning step."
   },
   {
    "pt": "esquema de Lomuto",
    "en": "Lomuto partition scheme",
    "def": "Partição em que o pivô é o último elemento, um índice varre o trecho e outro marca o fim da região dos menores; um trecho de m elementos custa m − 1 comparações."
   },
   {
    "pt": "esquema de Hoare",
    "en": "Hoare partition scheme",
    "def": "A partição original do quicksort: dois índices partem das pontas e trocam os pares fora do lugar; faz menos trocas e divide ao meio um trecho de valores iguais."
   },
   {
    "pt": "mediana de três",
    "en": "median-of-three",
    "def": "Escolher como pivô a mediana entre o primeiro, o do meio e o último elemento do trecho."
   },
   {
    "pt": "pivô aleatório",
    "en": "random pivot",
    "def": "Pivô sorteado entre as posições do trecho; deixa o tempo esperado em O(n log n) para qualquer entrada.",
    "example": "Choosing the pivot uniformly at random gives O(n log n) expected time on every input."
   },
   {
    "pt": "algoritmo aleatorizado",
    "en": "randomized algorithm",
    "def": "Algoritmo que faz sorteios durante a execução; a mesma entrada pode seguir caminhos e custos diferentes."
   },
   {
    "pt": "tempo esperado",
    "en": "expected running time",
    "def": "Média do custo sobre os sorteios do próprio algoritmo, com a entrada fixa (qualquer uma). Não confunda com caso médio, que faz a média sobre as entradas.",
    "example": "Randomized quicksort runs in O(n log n) expected time, regardless of the input order."
   },
   {
    "pt": "partição em três vias",
    "en": "three-way partitioning",
    "def": "Partição que separa menores, iguais e maiores que o pivô; os iguais já ficam no lugar e saem da recursão. É o problema da bandeira holandesa (Dutch national flag), de Dijkstra.",
    "example": "Use three-way partitioning when the input has many duplicate keys."
   },
   {
    "pt": "introsort",
    "en": "introsort",
    "def": "Híbrido usado em bibliotecas: quicksort que troca para heapsort quando a recursão fica funda demais e usa insertion sort em trechos pequenos; O(n log n) no pior caso."
   },
   {
    "pt": "seleção rápida",
    "en": "quickselect",
    "def": "Variante do quicksort que, depois de particionar, continua só no lado que contém a posição k; acha o k-ésimo menor em tempo esperado O(n).",
    "example": "Quickselect finds the k-th smallest element in expected linear time."
   }
  ]
 },
 {
  "lessonId": "l4-ordenacao-linear",
  "terms": [
   {
    "pt": "ordenação por comparação",
    "en": "comparison sort",
    "def": "Algoritmo que só descobre a ordem perguntando \"a < b?\" entre dois elementos; merge, quick, heap e insertion sort são assim.",
    "example": "Any comparison sort must make Ω(n log n) comparisons in the worst case."
   },
   {
    "pt": "árvore de decisão",
    "en": "decision tree",
    "def": "Árvore binária com todas as sequências de comparações que um algoritmo pode fazer para um tamanho n; cada folha é uma ordem final."
   },
   {
    "pt": "ordenação por contagem",
    "en": "counting sort",
    "def": "Conta quantas vezes cada chave inteira aparece e usa as contagens para calcular a posição de cada item; Θ(n + k) para chaves em uma faixa de k valores.",
    "example": "Counting sort runs in O(n + k) time, where k is the range of the keys."
   },
   {
    "pt": "soma de prefixos",
    "en": "prefix sum",
    "def": "Lista em que cada posição guarda a soma dos elementos do início até ela (versão inclusiva) ou só dos anteriores a ela (versão exclusiva); também chamada de soma acumulada.",
    "example": "Take the prefix sums of the counts to find where each key starts in the output."
   },
   {
    "pt": "ordenação por dígitos",
    "en": "radix sort",
    "def": "Ordena chaves de d dígitos com d passadas estáveis, uma por dígito; Θ(d · (n + b)) na base b."
   },
   {
    "pt": "dígito menos significativo",
    "en": "least significant digit (LSD)",
    "def": "O dígito mais à direita, o que menos pesa no valor; o radix sort LSD começa por ele."
   },
   {
    "pt": "base",
    "en": "radix",
    "def": "Quantos valores um dígito pode ter: 10 em decimal, 256 quando cada \"dígito\" é um byte."
   },
   {
    "pt": "ordenação por baldes",
    "en": "bucket sort",
    "def": "Espalha os itens em baldes por faixa de valor e ordena cada balde; tempo esperado Θ(n) quando as chaves são uniformes."
   }
  ]
 },
 {
  "lessonId": "l4-recursao",
  "terms": [
   {
    "pt": "recursão",
    "en": "recursion",
    "def": "Quando uma função chama a si mesma para resolver um problema menor."
   },
   {
    "pt": "caso base",
    "en": "base case",
    "def": "Situação resolvida diretamente, sem nova chamada."
   },
   {
    "pt": "passo recursivo",
    "en": "recursive step / recursive case",
    "def": "Reduz o problema e chama a função de novo."
   },
   {
    "pt": "estouro de pilha",
    "en": "stack overflow",
    "def": "Erro quando há chamadas aninhadas demais.",
    "example": "RecursionError: maximum recursion depth exceeded"
   },
   {
    "pt": "memoização",
    "en": "memoization",
    "def": "Guardar resultados já calculados para não recalcular."
   },
   {
    "pt": "dividir para conquistar",
    "en": "divide and conquer",
    "def": "Dividir em subproblemas, resolver e combinar."
   }
  ]
 },
 {
  "lessonId": "l4-dividir-conquistar",
  "terms": [
   {
    "pt": "etapa de combinação",
    "en": "combine step",
    "def": "Parte do dividir para conquistar que junta as respostas dos subproblemas na resposta do problema original."
   },
   {
    "pt": "árvore de recursão",
    "en": "recursion tree",
    "def": "Desenho das chamadas recursivas como uma árvore; somando o trabalho de cada nível, obtém-se o custo total.",
    "example": "Draw the recursion tree and add up the work done at each level."
   },
   {
    "pt": "relação de recorrência",
    "en": "recurrence relation",
    "def": "Equação que descreve o custo T(n) de um algoritmo recursivo em função do custo de entradas menores.",
    "example": "Merge sort satisfies the recurrence T(n) = 2T(n/2) + O(n)."
   },
   {
    "pt": "reduzir para conquistar",
    "en": "decrease and conquer",
    "def": "Variante em que só um subproblema menor é resolvido e o resto é descartado, como na busca binária."
   },
   {
    "pt": "profundidade da recursão",
    "en": "recursion depth",
    "def": "Maior número de chamadas empilhadas ao mesmo tempo; é a altura da árvore de recursão.",
    "example": "RecursionError: maximum recursion depth exceeded"
   },
   {
    "pt": "multiplicação de Karatsuba",
    "en": "Karatsuba multiplication",
    "def": "Algoritmo que multiplica números de n algarismos com 3 produtos de metades em vez de 4, em O(n^log₂3) ≈ O(n^1,585)."
   },
   {
    "pt": "estatística de ordem",
    "en": "order statistic",
    "def": "O k-ésimo menor valor de uma coleção; o mínimo, a mediana e o máximo são casos particulares."
   },
   {
    "pt": "seleção rápida",
    "en": "quickselect",
    "def": "Algoritmo que acha o k-ésimo menor separando os valores em torno de um pivô e continuando só no grupo que contém a resposta.",
    "example": "Quickselect runs in expected linear time but degrades to quadratic time with bad pivots."
   }
  ]
 },
 {
  "lessonId": "l4-backtracking",
  "terms": [
   {
    "pt": "busca com retrocesso",
    "en": "backtracking",
    "def": "Técnica que monta a solução uma escolha por vez e desfaz a última escolha quando ela não leva a nenhuma solução.",
    "example": "Backtracking abandons a partial candidate as soon as it determines that it cannot be completed to a valid solution."
   },
   {
    "pt": "árvore de decisões",
    "en": "decision tree / state-space tree",
    "def": "Árvore em que cada nível é uma decisão, cada nó é uma solução parcial e cada folha é uma candidata completa."
   },
   {
    "pt": "solução parcial",
    "en": "partial solution / partial candidate",
    "def": "As escolhas feitas até agora, ainda sem completar uma resposta."
   },
   {
    "pt": "busca em profundidade",
    "en": "depth-first search (DFS)",
    "def": "Explorar um ramo até o fim antes de passar ao vizinho; é a ordem em que a recursão percorre a árvore."
   },
   {
    "pt": "força bruta",
    "en": "brute force",
    "def": "Gerar todas as candidatas completas e só depois testar cada uma."
   },
   {
    "pt": "restrição",
    "en": "constraint",
    "def": "Regra que toda solução precisa obedecer, como \"duas rainhas não podem se atacar\"."
   },
   {
    "pt": "poda",
    "en": "pruning",
    "def": "Abandonar uma solução parcial, e todo o ramo abaixo dela, assim que se sabe que ela não leva a nenhuma solução.",
    "example": "Pruning cuts off branches of the search tree that cannot contain a valid solution."
   }
  ]
 },
 {
  "lessonId": "l4-pd-guloso",
  "terms": [
   {
    "pt": "programação dinâmica",
    "en": "dynamic programming (DP)",
    "def": "Resolver cada subproblema uma vez e reutilizar a resposta."
   },
   {
    "pt": "subestrutura ótima",
    "en": "optimal substructure",
    "def": "A solução ótima é composta de soluções ótimas de subproblemas."
   },
   {
    "pt": "subproblemas sobrepostos",
    "en": "overlapping subproblems",
    "def": "Os mesmos subproblemas aparecem várias vezes."
   },
   {
    "pt": "guloso",
    "en": "greedy",
    "def": "Escolhe a melhor opção local a cada passo, sem voltar atrás."
   },
   {
    "pt": "tabela",
    "en": "table / tabulation",
    "def": "Estrutura onde a PD bottom-up guarda os resultados."
   }
  ]
 },
 {
  "lessonId": "l4-pd-mochila-lcs",
  "terms": [
   {
    "pt": "mochila 0/1",
    "en": "0/1 knapsack",
    "def": "Escolher, entre itens com peso e valor, um subconjunto que caiba na capacidade W e tenha o maior valor total; cada item entra no máximo uma vez.",
    "example": "The 0/1 knapsack problem can be solved in O(nW) time with dynamic programming."
   },
   {
    "pt": "mochila ilimitada",
    "en": "unbounded knapsack",
    "def": "Variante em que cada item pode ser usado quantas vezes se quiser; o troco mínimo é desse tipo."
   },
   {
    "pt": "subsequência",
    "en": "subsequence",
    "def": "O que sobra de uma sequência quando se apagam zero ou mais elementos sem mudar a ordem dos demais; ao contrário da substring, não precisa ser contígua."
   },
   {
    "pt": "maior subsequência comum",
    "en": "longest common subsequence (LCS)",
    "def": "A subsequência mais longa presente em duas sequências ao mesmo tempo.",
    "example": "diff works by finding a longest common subsequence of the lines of the two files."
   },
   {
    "pt": "reconstrução da solução",
    "en": "solution reconstruction (traceback)",
    "def": "Percorrer a tabela da PD a partir da célula da resposta, refazendo a decisão que produziu cada valor, para obter a escolha e não só o número."
   },
   {
    "pt": "vetor rolante",
    "en": "rolling array",
    "def": "Guardar só a última linha da tabela (ou as últimas) quando cada linha depende apenas da anterior."
   },
   {
    "pt": "estados alcançáveis",
    "en": "reachable states",
    "def": "Os subproblemas que de fato aparecem a partir do problema original; a versão top-down calcula só esses."
   },
   {
    "pt": "pseudopolinomial",
    "en": "pseudo-polynomial",
    "def": "Custo polinomial no valor numérico de um número da entrada (como W), mas exponencial na quantidade de bits usada para escrevê-lo.",
    "example": "The knapsack DP runs in pseudo-polynomial time."
   },
   {
    "pt": "NP-difícil",
    "en": "NP-hard",
    "def": "Pelo menos tão difícil quanto qualquer problema de NP: um algoritmo polinomial para ele daria um para todos. Não se conhece nenhum."
   }
  ]
 },
 {
  "lessonId": "l4-guloso-intervalos",
  "terms": [
   {
    "pt": "contraexemplo",
    "en": "counterexample",
    "def": "Uma entrada concreta em que a regra dá resposta pior que a ótima; um só basta para derrubar a regra."
   },
   {
    "pt": "escalonamento de intervalos",
    "en": "interval scheduling",
    "def": "Escolher o maior número de intervalos que não se sobrepõem dois a dois.",
    "example": "Interval scheduling is solved by the earliest-finish-time-first greedy algorithm."
   },
   {
    "pt": "intervalo semiaberto",
    "en": "half-open interval",
    "def": "[início, fim): inclui o início e exclui o fim; uma reserva que termina às 10h não colide com outra que começa às 10h."
   },
   {
    "pt": "argumento de troca",
    "en": "exchange argument",
    "def": "Prova que pega uma solução ótima qualquer e troca, passo a passo, os elementos dela pelos do guloso sem piorar o resultado.",
    "example": "We prove optimality with an exchange argument."
   },
   {
    "pt": "propriedade da escolha gulosa",
    "en": "greedy-choice property",
    "def": "Existe uma solução ótima que contém a escolha gulosa; fazê-la nunca fecha a porta para o ótimo."
   },
   {
    "pt": "o guloso se mantém à frente",
    "en": "greedy stays ahead",
    "def": "Prova que mostra, por indução, que depois de cada passo o guloso está pelo menos tão bem quanto qualquer outra solução."
   },
   {
    "pt": "particionamento de intervalos",
    "en": "interval partitioning",
    "def": "Distribuir todos os intervalos no menor número de recursos (salas, máquinas) sem sobreposição dentro de cada recurso."
   },
   {
    "pt": "profundidade",
    "en": "depth",
    "def": "O maior número de intervalos que acontecem num mesmo instante; é o mínimo de salas necessário."
   },
   {
    "pt": "mochila fracionária",
    "en": "fractional knapsack",
    "def": "Mochila em que se pode levar uma fração de cada item; o guloso por valor/peso é ótimo."
   },
   {
    "pt": "escalonamento de intervalos com pesos",
    "en": "weighted interval scheduling",
    "def": "Variante em que cada intervalo tem um valor e se quer o maior valor total; nenhuma regra gulosa conhecida resolve, mas a PD resolve em O(n log n)."
   },
   {
    "pt": "matroide",
    "en": "matroid",
    "def": "Estrutura combinatória em que o guloso \"ordene por peso e pegue o que couber\" é ótimo para quaisquer pesos; as florestas de um grafo (algoritmo de Kruskal) são o exemplo clássico."
   }
  ]
 },
 {
  "lessonId": "l4-dijkstra",
  "terms": [
   {
    "pt": "grafo ponderado",
    "en": "weighted graph",
    "def": "Grafo em que cada aresta tem um custo."
   },
   {
    "pt": "fila de prioridade",
    "en": "priority queue",
    "def": "Estrutura que sempre devolve o item de menor prioridade primeiro."
   },
   {
    "pt": "heap",
    "en": "heap",
    "def": "Árvore que implementa fila de prioridade com inserção/remoção O(log n)."
   },
   {
    "pt": "relaxar uma aresta",
    "en": "edge relaxation",
    "def": "Atualizar a distância de um vértice se um caminho melhor foi encontrado."
   }
  ]
 },
 {
  "lessonId": "l4-ordenacao-topologica",
  "terms": [
   {
    "pt": "ordenação topológica",
    "en": "topological sort",
    "def": "Lista com todos os vértices de um grafo direcionado em que, para toda aresta u → v, u aparece antes de v.",
    "example": "A topological sort of a DAG is a linear ordering of its vertices such that for every directed edge u → v, u comes before v."
   },
   {
    "pt": "fonte",
    "en": "source",
    "def": "Vértice com grau de entrada zero: nada precisa vir antes dele."
   },
   {
    "pt": "grau de entrada",
    "en": "in-degree",
    "def": "Número de arestas que chegam a um vértice; numa grade curricular, quantos pré-requisitos uma disciplina tem.",
    "example": "Kahn's algorithm starts from every vertex whose in-degree is zero."
   },
   {
    "pt": "algoritmo de Kahn",
    "en": "Kahn's algorithm",
    "def": "Ordenação topológica que repete: tire da fila um vértice sem dependências pendentes, coloque-o na ordem e desconte 1 do grau de entrada de cada vizinho."
   },
   {
    "pt": "pós-ordem invertida",
    "en": "reverse postorder",
    "def": "A ordem em que a DFS termina os vértices, lida de trás para frente; num DAG, é uma ordenação topológica.",
    "example": "The reverse postorder of a depth-first search of a DAG is a topological order."
   },
   {
    "pt": "caminho crítico",
    "en": "critical path",
    "def": "Num projeto com tarefas dependentes, a cadeia de tarefas de maior duração total; ela define o prazo mínimo, e atrasar qualquer tarefa dela atrasa o projeto.",
    "example": "Any delay on the critical path delays the whole project."
   },
   {
    "pt": "folga",
    "en": "slack",
    "def": "Quanto uma tarefa pode atrasar sem atrasar o projeto; as tarefas do caminho crítico têm folga zero.",
    "example": "Tasks with zero slack are on the critical path."
   }
  ]
 },
 {
  "lessonId": "l4-arvore-geradora-minima",
  "terms": [
   {
    "pt": "árvore geradora",
    "en": "spanning tree",
    "def": "Conjunto de arestas de um grafo conexo que liga todos os vértices sem formar ciclo; tem exatamente V − 1 arestas."
   },
   {
    "pt": "árvore geradora mínima",
    "en": "minimum spanning tree (MST)",
    "def": "Árvore geradora cuja soma dos pesos das arestas é a menor possível.",
    "example": "Kruskal's algorithm computes a minimum spanning tree in O(E log E) time."
   },
   {
    "pt": "corte",
    "en": "cut",
    "def": "Divisão dos vértices em dois grupos; uma aresta cruza o corte quando tem uma ponta em cada grupo."
   },
   {
    "pt": "propriedade do corte",
    "en": "cut property",
    "def": "A aresta mais barata que cruza um corte pode sempre fazer parte de uma árvore geradora mínima; se for estritamente a mais barata, faz parte de todas.",
    "example": "By the cut property, the lightest edge crossing any cut belongs to some MST."
   },
   {
    "pt": "propriedade do ciclo",
    "en": "cycle property",
    "def": "A aresta estritamente mais cara de um ciclo não pertence a nenhuma árvore geradora mínima."
   },
   {
    "pt": "floresta geradora",
    "en": "spanning forest",
    "def": "Num grafo desconexo, uma árvore geradora para cada componente conexo; o Kruskal devolve a de menor custo, a floresta geradora mínima."
   },
   {
    "pt": "agrupamento",
    "en": "clustering",
    "def": "Dividir itens em grupos de itens parecidos ou próximos; com a árvore geradora mínima, basta cortar as arestas mais caras.",
    "example": "Single-linkage clustering is equivalent to running Kruskal and stopping early."
   },
   {
    "pt": "espaçamento",
    "en": "spacing",
    "def": "Num agrupamento, a menor distância entre dois itens de grupos diferentes; quanto maior, mais separados estão os grupos."
   }
  ]
 },
 {
  "lessonId": "l5-classes",
  "terms": [
   {
    "pt": "classe",
    "en": "class",
    "def": "Molde que define atributos e métodos de um tipo de objeto."
   },
   {
    "pt": "objeto / instância",
    "en": "object / instance",
    "def": "Um exemplar concreto criado a partir de uma classe."
   },
   {
    "pt": "atributo",
    "en": "attribute",
    "def": "Dado guardado no objeto.",
    "example": "AttributeError: 'Conta' object has no attribute 'saldo'"
   },
   {
    "pt": "método",
    "en": "method",
    "def": "Função definida dentro da classe que opera sobre o objeto."
   },
   {
    "pt": "construtor",
    "en": "constructor / initializer",
    "def": "Método que prepara o objeto ao ser criado (__init__)."
   },
   {
    "pt": "encapsulamento",
    "en": "encapsulation",
    "def": "Esconder detalhes internos e expor uma interface que mantém o objeto válido."
   },
   {
    "pt": "invariante",
    "en": "invariant",
    "def": "Regra que deve ser sempre verdadeira para o objeto (saldo nunca negativo)."
   }
  ]
 },
 {
  "lessonId": "l5-heranca-composicao",
  "terms": [
   {
    "pt": "herança",
    "en": "inheritance",
    "def": "Uma classe (filha) recebe atributos e métodos de outra (mãe)."
   },
   {
    "pt": "polimorfismo",
    "en": "polymorphism",
    "def": "Usar objetos de tipos diferentes pela mesma interface."
   },
   {
    "pt": "abstração",
    "en": "abstraction",
    "def": "Expor o que algo faz, escondendo como."
   },
   {
    "pt": "composição",
    "en": "composition",
    "def": "Um objeto contém outros objetos e delega trabalho a eles (\"tem um\")."
   },
   {
    "pt": "sobrescrever",
    "en": "override",
    "def": "Redefinir na subclasse um método herdado."
   },
   {
    "pt": "classe abstrata",
    "en": "abstract base class (ABC)",
    "def": "Classe que define métodos que as subclasses devem implementar."
   }
  ]
 },
 {
  "lessonId": "l5-solid-padroes",
  "terms": [
   {
    "pt": "padrão de projeto",
    "en": "design pattern",
    "def": "Solução reutilizável e nomeada para um problema recorrente de design."
   },
   {
    "pt": "acoplamento",
    "en": "coupling",
    "def": "O quanto um módulo depende de outro. Baixo acoplamento é melhor."
   },
   {
    "pt": "coesão",
    "en": "cohesion",
    "def": "O quanto as partes de um módulo pertencem juntas. Alta coesão é melhor."
   },
   {
    "pt": "responsabilidade única",
    "en": "single responsibility",
    "def": "Cada módulo deve ter um único motivo para mudar."
   },
   {
    "pt": "injeção de dependência",
    "en": "dependency injection",
    "def": "Passar as dependências de fora em vez de criá-las dentro."
   }
  ]
 },
 {
  "lessonId": "l6-html-css",
  "terms": [
   {
    "pt": "elemento",
    "en": "element",
    "def": "Parte de um documento HTML: <p>, <nav>, <button>..."
   },
   {
    "pt": "semântica",
    "en": "semantics",
    "def": "Usar o elemento que descreve o significado do conteúdo."
   },
   {
    "pt": "seletor",
    "en": "selector",
    "def": "Padrão que escolhe a quais elementos uma regra CSS se aplica."
   },
   {
    "pt": "modelo de caixa",
    "en": "box model",
    "def": "content + padding + border + margin."
   },
   {
    "pt": "responsivo",
    "en": "responsive",
    "def": "Layout que se adapta a telas de tamanhos diferentes."
   },
   {
    "pt": "acessibilidade",
    "en": "accessibility (a11y)",
    "def": "Garantir que pessoas com deficiência consigam usar o produto."
   },
   {
    "pt": "leitor de tela",
    "en": "screen reader",
    "def": "Software que lê a interface em voz alta para pessoas cegas ou com baixa visão."
   }
  ]
 },
 {
  "lessonId": "l6-javascript-dom",
  "terms": [
   {
    "pt": "DOM",
    "en": "Document Object Model",
    "def": "Representação da página como uma árvore de objetos que o JavaScript manipula."
   },
   {
    "pt": "evento",
    "en": "event",
    "def": "Algo que acontece: clique, tecla, envio de formulário."
   },
   {
    "pt": "ouvinte de evento",
    "en": "event listener",
    "def": "Função chamada quando o evento acontece."
   },
   {
    "pt": "promessa",
    "en": "Promise",
    "def": "Objeto que representa um resultado futuro (assíncrono)."
   },
   {
    "pt": "assíncrono",
    "en": "asynchronous",
    "def": "Que não bloqueia: o programa continua enquanto espera."
   },
   {
    "pt": "laço de eventos",
    "en": "event loop",
    "def": "Mecanismo que executa callbacks quando a pilha de chamadas fica vazia."
   }
  ]
 },
 {
  "lessonId": "l6-http-rest",
  "terms": [
   {
    "pt": "interface de programação",
    "en": "API (application programming interface)",
    "def": "Contrato que permite a um programa usar serviços de outro."
   },
   {
    "pt": "recurso",
    "en": "resource",
    "def": "A \"coisa\" exposta pela API: /alunos, /alunos/42."
   },
   {
    "pt": "ponto de acesso",
    "en": "endpoint",
    "def": "Combinação de método + caminho: GET /alunos."
   },
   {
    "pt": "cabeçalho",
    "en": "header",
    "def": "Metadado da requisição/resposta: Content-Type, Authorization."
   },
   {
    "pt": "corpo",
    "en": "body / payload",
    "def": "Os dados enviados na requisição ou resposta."
   },
   {
    "pt": "idempotente",
    "en": "idempotent",
    "def": "Repetir a operação tem o mesmo efeito que fazê-la uma vez."
   }
  ]
 },
 {
  "lessonId": "l6-backend-auth",
  "terms": [
   {
    "pt": "rota",
    "en": "route",
    "def": "Combinação de método HTTP + caminho que aciona um trecho de código.",
    "example": "GET /api/users/:id"
   },
   {
    "pt": "manipulador",
    "en": "handler",
    "def": "Função que recebe a requisição e produz a resposta."
   },
   {
    "pt": "camada de serviço",
    "en": "service layer",
    "def": "Onde ficam as regras de negócio, sem detalhes de HTTP nem de banco."
   },
   {
    "pt": "repositório",
    "en": "repository",
    "def": "Camada que conversa com o banco de dados."
   },
   {
    "pt": "validação",
    "en": "validation",
    "def": "Conferir formato, tipo e limites de um dado antes de usá-lo."
   },
   {
    "pt": "sessão",
    "en": "session",
    "def": "Estado do usuário guardado no servidor, ligado a um identificador no cookie."
   },
   {
    "pt": "token de acesso",
    "en": "access token",
    "def": "Credencial que o cliente envia a cada requisição; o JWT é um formato comum."
   },
   {
    "pt": "intermediário",
    "en": "middleware",
    "def": "Função que roda antes (ou depois) dos handlers: log, autenticação, limite de taxa."
   }
  ]
 },
 {
  "lessonId": "l7-sql",
  "terms": [
   {
    "pt": "banco de dados",
    "en": "database",
    "def": "Coleção organizada de dados gerenciada por um SGBD."
   },
   {
    "pt": "tabela",
    "en": "table / relation",
    "def": "Conjunto de linhas com as mesmas colunas."
   },
   {
    "pt": "chave primária",
    "en": "primary key",
    "def": "Coluna(s) que identificam unicamente cada linha."
   },
   {
    "pt": "chave estrangeira",
    "en": "foreign key",
    "def": "Coluna que referencia a chave primária de outra tabela."
   },
   {
    "pt": "consulta",
    "en": "query",
    "def": "Pedido de dados ao banco, em SQL."
   },
   {
    "pt": "agregação",
    "en": "aggregation",
    "def": "Resumir várias linhas em um valor: COUNT, AVG, SUM."
   }
  ]
 },
 {
  "lessonId": "l7-restricoes-dml",
  "terms": [
   {
    "pt": "linguagem de definição de dados",
    "en": "data definition language (DDL)",
    "def": "A parte do SQL que cria e muda a estrutura do banco: CREATE, ALTER e DROP.",
    "example": "Schema changes are written as DDL statements such as CREATE TABLE and ALTER TABLE."
   },
   {
    "pt": "linguagem de manipulação de dados",
    "en": "data manipulation language (DML)",
    "def": "A parte do SQL que lê e altera linhas: SELECT, INSERT, UPDATE e DELETE."
   },
   {
    "pt": "restrição",
    "en": "constraint",
    "def": "Regra declarada na tabela que o banco confere em toda escrita; a escrita que a viola é recusada.",
    "example": "sqlite3.IntegrityError: UNIQUE constraint failed: clientes.cpf"
   },
   {
    "pt": "afinidade de tipo",
    "en": "type affinity",
    "def": "No SQLite, o tipo declarado de uma coluna é uma preferência: o valor é convertido quando dá e guardado como veio quando não dá."
   },
   {
    "pt": "chave natural",
    "en": "natural key",
    "def": "Chave que já existe no mundo real, como CPF, placa ou ISBN."
   },
   {
    "pt": "chave substituta",
    "en": "surrogate key",
    "def": "Identificador criado pelo próprio sistema, sem significado fora dele (um id numérico).",
    "example": "We use a surrogate key and keep a UNIQUE constraint on the natural key."
   },
   {
    "pt": "chave composta",
    "en": "composite key",
    "def": "Chave formada por mais de uma coluna; o que não pode se repetir é a combinação."
   },
   {
    "pt": "integridade referencial",
    "en": "referential integrity",
    "def": "Garantia de que toda chave estrangeira aponta para uma linha que existe."
   },
   {
    "pt": "ação referencial",
    "en": "referential action",
    "def": "O que acontece com as linhas filhas quando a linha mãe é apagada ou tem a chave alterada: NO ACTION, RESTRICT, CASCADE, SET NULL.",
    "example": "ON DELETE CASCADE removes the child rows automatically when the parent row is deleted."
   },
   {
    "pt": "inserir ou atualizar",
    "en": "upsert",
    "def": "Comando que insere a linha ou, se a chave já existe, atualiza a existente.",
    "example": "INSERT ... ON CONFLICT (sku) DO UPDATE SET preco = excluded.preco"
   },
   {
    "pt": "exclusão lógica",
    "en": "soft delete",
    "def": "Marcar a linha como inativa (ativo = 0, excluido_em = data) em vez de apagá-la, para preservar o histórico."
   }
  ]
 },
 {
  "lessonId": "l7-sql-no-python",
  "terms": [
   {
    "pt": "consulta parametrizada",
    "en": "parameterized query",
    "def": "Comando SQL com marcadores no lugar dos valores; os valores vão separados, e o banco os recebe como dados.",
    "example": "Always use parameterized queries; never build SQL with string formatting."
   },
   {
    "pt": "marcador",
    "en": "placeholder",
    "def": "O sinal que marca o lugar de um valor no SQL: ? ou :nome no sqlite3, %s no psycopg."
   },
   {
    "pt": "cursor",
    "en": "cursor",
    "def": "Objeto que executa um comando e entrega as linhas do resultado."
   },
   {
    "pt": "comando preparado",
    "en": "prepared statement",
    "def": "Comando SQL já compilado pelo banco, com espaços onde os valores serão encaixados; pode ser reusado com valores diferentes."
   },
   {
    "pt": "vincular",
    "en": "bind",
    "def": "Encaixar um valor num marcador de um comando preparado.",
    "example": "sqlite3.ProgrammingError: Incorrect number of bindings supplied."
   },
   {
    "pt": "injeção de SQL",
    "en": "SQL injection",
    "def": "Ataque em que um valor vindo de fora é interpretado como parte do comando SQL."
   },
   {
    "pt": "lista branca",
    "en": "allowlist",
    "def": "Conjunto fechado de opções aceitas; qualquer coisa fora dele é recusada.",
    "example": "Sort columns are validated against an allowlist before being added to the query."
   },
   {
    "pt": "caractere curinga",
    "en": "wildcard",
    "def": "No LIKE, % casa com qualquer sequência de caracteres e _ com exatamente um caractere."
   },
   {
    "pt": "paginação por chave",
    "en": "keyset pagination",
    "def": "Pedir a próxima página a partir da última linha vista (WHERE (nome, id) > (?, ?)) em vez de pular linhas com OFFSET.",
    "example": "Keyset pagination performs consistently no matter how deep you page."
   }
  ]
 },
 {
  "lessonId": "l7-joins",
  "terms": [
   {
    "pt": "junção",
    "en": "join",
    "def": "Combinar linhas de duas tabelas por uma condição."
   },
   {
    "pt": "junção interna",
    "en": "inner join",
    "def": "Só as linhas com correspondência nos dois lados."
   },
   {
    "pt": "junção externa à esquerda",
    "en": "left (outer) join",
    "def": "Todas as linhas da esquerda, com NULL quando não há correspondência."
   },
   {
    "pt": "relacionamento muitos-para-muitos",
    "en": "many-to-many relationship",
    "def": "Exige uma tabela associativa (como matriculas)."
   },
   {
    "pt": "nulo",
    "en": "NULL",
    "def": "Ausência de valor. Compare com IS NULL, não com = NULL."
   }
  ]
 },
 {
  "lessonId": "l7-null-tres-valores",
  "terms": [
   {
    "pt": "lógica de três valores",
    "en": "three-valued logic (3VL)",
    "def": "A lógica do SQL, com três valores-verdade: TRUE, FALSE e UNKNOWN. Qualquer comparação com NULL dá UNKNOWN.",
    "example": "SQL uses three-valued logic: comparing anything with NULL yields UNKNOWN."
   },
   {
    "pt": "desconhecido",
    "en": "UNKNOWN",
    "def": "O terceiro valor-verdade do SQL. WHERE, HAVING e ON descartam as linhas em que a condição dá UNKNOWN; no SQLite ele aparece como NULL."
   },
   {
    "pt": "predicado",
    "en": "predicate",
    "def": "Expressão que resulta num valor-verdade, como nota >= 7 ou curso IS NULL.",
    "example": "Rows for which the WHERE predicate is not true are filtered out."
   },
   {
    "pt": "comparação segura para nulos",
    "en": "null-safe comparison",
    "def": "Comparação que trata dois NULL como iguais e nunca dá UNKNOWN: IS [NOT] DISTINCT FROM no padrão SQL e no PostgreSQL, IS e IS NOT no SQLite, <=> no MySQL.",
    "example": "Use IS DISTINCT FROM for a null-safe comparison."
   },
   {
    "pt": "valor padrão",
    "en": "default value",
    "def": "Valor posto no lugar de NULL numa consulta, em geral com COALESCE, como em COALESCE(SUM(valor), 0). Não confundir com a cláusula DEFAULT da coluna, que só age no INSERT.",
    "example": "COALESCE is often used to substitute a default value for null values when data is retrieved for display."
   },
   {
    "pt": "tabela preservada",
    "en": "preserved table",
    "def": "Num LEFT JOIN, a tabela da esquerda: todas as linhas dela aparecem no resultado, com ou sem par."
   },
   {
    "pt": "relacionamento opcional",
    "en": "optional relationship",
    "def": "Relacionamento em que a chave estrangeira pode ser NULL: a linha existe sem par do outro lado.",
    "example": "The foreign key is nullable, so the relationship is optional."
   }
  ]
 },
 {
  "lessonId": "l7-subconsultas",
  "terms": [
   {
    "pt": "subconsulta",
    "en": "subquery",
    "def": "Um SELECT entre parênteses dentro de outro comando SQL.",
    "example": "A subquery can appear in the SELECT list, in the FROM clause or in the WHERE clause."
   },
   {
    "pt": "subconsulta escalar",
    "en": "scalar subquery",
    "def": "Subconsulta que devolve uma coluna e no máximo uma linha, usada como um valor. Sem nenhuma linha, ela vale NULL.",
    "example": "ERROR: more than one row returned by a subquery used as an expression"
   },
   {
    "pt": "subconsulta correlacionada",
    "en": "correlated subquery",
    "def": "Subconsulta que usa uma coluna da consulta de fora; logicamente, é refeita para cada linha de fora.",
    "example": "A correlated subquery is evaluated once for each row of the outer query."
   },
   {
    "pt": "semijunção",
    "en": "semi-join",
    "def": "Mantém as linhas da esquerda que têm pelo menos um par, cada uma uma única vez. É o que IN e EXISTS fazem.",
    "example": "The planner turned the EXISTS into a hash semi-join."
   },
   {
    "pt": "antijunção",
    "en": "anti-join",
    "def": "Mantém as linhas da esquerda que não têm nenhum par: NOT EXISTS, ou LEFT JOIN com IS NULL."
   },
   {
    "pt": "tabela derivada",
    "en": "derived table",
    "def": "Subconsulta no FROM, usada como se fosse uma tabela."
   },
   {
    "pt": "expressão de tabela comum",
    "en": "common table expression (CTE)",
    "def": "Subconsulta com nome, declarada com WITH antes do SELECT principal.",
    "example": "WITH totals AS (SELECT ...) SELECT ... FROM totals;"
   },
   {
    "pt": "multiplicação de linhas",
    "en": "fan-out",
    "def": "O que acontece ao juntar, a partir da mesma linha, duas tabelas 1:N independentes: cada linha de uma se combina com cada linha da outra, e SUM e COUNT saem inflados."
   }
  ]
 },
 {
  "lessonId": "l7-normalizacao-indices",
  "terms": [
   {
    "pt": "normalização",
    "en": "normalization",
    "def": "Organizar tabelas para reduzir redundância e anomalias."
   },
   {
    "pt": "índice",
    "en": "index",
    "def": "Estrutura auxiliar (geralmente B-tree) que acelera buscas por uma coluna."
   },
   {
    "pt": "transação",
    "en": "transaction",
    "def": "Grupo de operações que acontece por completo ou não acontece."
   },
   {
    "pt": "confirmar / desfazer",
    "en": "commit / rollback",
    "def": "Confirmar ou desfazer as operações de uma transação."
   },
   {
    "pt": "ACID",
    "en": "ACID",
    "def": "Atomicidade, Consistência, Isolamento, Durabilidade."
   },
   {
    "pt": "plano de execução",
    "en": "query plan",
    "def": "Como o banco decidiu executar a consulta (EXPLAIN)."
   }
  ]
 },
 {
  "lessonId": "l7-isolamento-concorrencia",
  "terms": [
   {
    "pt": "nível de isolamento",
    "en": "isolation level",
    "def": "Quanto uma transação fica protegida dos efeitos das transações concorrentes. O padrão SQL define quatro.",
    "example": "Read Committed is the default isolation level in PostgreSQL."
   },
   {
    "pt": "escalonamento",
    "en": "schedule",
    "def": "A ordem em que o banco intercala as operações de transações concorrentes."
   },
   {
    "pt": "serializável",
    "en": "serializable",
    "def": "Execução concorrente com o mesmo efeito de alguma execução em série, uma transação por vez.",
    "example": "Serializable isolation makes concurrent transactions behave as if they ran one at a time."
   },
   {
    "pt": "leitura suja",
    "en": "dirty read",
    "def": "Ler um dado que outra transação escreveu e ainda não confirmou."
   },
   {
    "pt": "leitura não repetível",
    "en": "non-repeatable read",
    "def": "Reler, na mesma transação, uma linha que outra transação alterou e confirmou no meio, e ver outro valor."
   },
   {
    "pt": "leitura fantasma",
    "en": "phantom read",
    "def": "Repetir uma consulta com WHERE e receber outro conjunto de linhas, porque outra transação inseriu ou apagou linhas que satisfazem a condição."
   },
   {
    "pt": "atualização perdida",
    "en": "lost update",
    "def": "Duas transações leem o mesmo valor, calculam um novo e gravam; a segunda escrita apaga a primeira."
   },
   {
    "pt": "distorção de escrita",
    "en": "write skew",
    "def": "Duas transações leem os mesmos dados, decidem com base neles e escrevem linhas diferentes, quebrando juntas uma regra que cada uma respeitava."
   },
   {
    "pt": "anomalia de serialização",
    "en": "serialization anomaly",
    "def": "Resultado de transações concorrentes que nenhuma ordem serial produziria."
   },
   {
    "pt": "bloqueio",
    "en": "lock",
    "def": "Reserva de um recurso (uma linha, uma tabela) por uma transação; quem chega depois espera.",
    "example": "SELECT ... FOR UPDATE acquires a row-level lock on the returned rows."
   },
   {
    "pt": "controle de concorrência multiversão",
    "en": "multiversion concurrency control (MVCC)",
    "def": "Guardar várias versões de cada linha para que cada transação leia as que estavam confirmadas no seu instantâneo."
   },
   {
    "pt": "instantâneo",
    "en": "snapshot",
    "def": "A visão do banco que uma transação usa: o que já estava confirmado num certo momento."
   },
   {
    "pt": "isolamento de instantâneo",
    "en": "snapshot isolation",
    "def": "Cada transação lê de um único instantâneo, e o primeiro a confirmar vence quando duas escrevem a mesma linha. É o REPEATABLE READ do PostgreSQL."
   },
   {
    "pt": "controle otimista",
    "en": "optimistic concurrency control",
    "def": "Gravar só se ninguém mudou o dado desde a leitura (por exemplo, conferindo uma coluna de versão) e tentar de novo se mudou."
   },
   {
    "pt": "falha de serialização",
    "en": "serialization failure",
    "def": "Erro com que o banco aborta uma transação para manter o isolamento (SQLSTATE 40001). A aplicação deve repetir a transação inteira.",
    "example": "ERROR: could not serialize access due to concurrent update"
   }
  ]
 },
 {
  "lessonId": "l7-otimizacao-consultas",
  "terms": [
   {
    "pt": "página",
    "en": "page",
    "def": "Bloco de tamanho fixo em que o banco guarda tabelas e índices: 4 KiB no SQLite e 8 KiB no PostgreSQL, por padrão."
   },
   {
    "pt": "fator de ramificação",
    "en": "fan-out",
    "def": "Quantos filhos cada página interna de uma B-tree aponta. Quanto maior, mais baixa a árvore."
   },
   {
    "pt": "índice composto",
    "en": "composite index (multicolumn index)",
    "def": "Índice sobre várias colunas, ordenado pela primeira e, dentro de cada valor dela, pela segunda, e assim por diante."
   },
   {
    "pt": "prefixo mais à esquerda",
    "en": "leftmost prefix",
    "def": "Regra de uso de um índice composto: ele só desce na árvore pelas suas primeiras colunas, em ordem.",
    "example": "The index is most efficient when there are constraints on the leading (leftmost) columns."
   },
   {
    "pt": "índice de cobertura",
    "en": "covering index",
    "def": "Índice que contém todas as colunas que a consulta usa, dispensando a visita à tabela."
   },
   {
    "pt": "condição sargável",
    "en": "sargable predicate",
    "def": "Condição que um índice consegue usar para descer na árvore, como coluna = valor ou coluna >= valor (de Search ARGument ABLE)."
   },
   {
    "pt": "índice de expressão",
    "en": "expression index",
    "def": "Índice sobre o resultado de uma expressão, como lower(email), e não sobre a coluna pura."
   },
   {
    "pt": "varredura completa",
    "en": "full table scan",
    "def": "Ler todas as linhas da tabela: SCAN no SQLite, Seq Scan no PostgreSQL."
   },
   {
    "pt": "seletividade",
    "en": "selectivity",
    "def": "Fração das linhas que uma condição deixa passar. Quanto menor, mais um índice ajuda."
   },
   {
    "pt": "planejador de consultas",
    "en": "query planner (optimizer)",
    "def": "Parte do banco que escolhe o plano de execução de cada consulta, estimando o custo das alternativas.",
    "example": "The planner chose a sequential scan because the filter is not selective."
   },
   {
    "pt": "problema N+1",
    "en": "N+1 query problem",
    "def": "Uma consulta para buscar uma lista e mais uma consulta para cada item dela.",
    "example": "Use eager loading to avoid the N+1 query problem."
   },
   {
    "pt": "carregamento antecipado",
    "en": "eager loading",
    "def": "Buscar de uma vez os dados relacionados de que o código vai precisar, em vez de um item por vez."
   }
  ]
 },
 {
  "lessonId": "l7-nosql-escala",
  "terms": [
   {
    "pt": "banco de documentos",
    "en": "document database",
    "def": "Guarda documentos (parecidos com JSON) com estrutura flexível.",
    "example": "MongoDB"
   },
   {
    "pt": "chave-valor",
    "en": "key-value store",
    "def": "Dicionário gigante e rápido: dada a chave, devolve o valor.",
    "example": "Redis"
   },
   {
    "pt": "replicação",
    "en": "replication",
    "def": "Manter cópias dos mesmos dados em várias máquinas."
   },
   {
    "pt": "particionamento",
    "en": "partitioning (sharding)",
    "def": "Dividir os dados entre máquinas, cada uma com uma parte."
   },
   {
    "pt": "consistência eventual",
    "en": "eventual consistency",
    "def": "Réplicas podem divergir por um tempo, mas convergem se as escritas pararem."
   },
   {
    "pt": "partição de rede",
    "en": "network partition",
    "def": "Falha que separa as máquinas em grupos que não se comunicam."
   },
   {
    "pt": "cache",
    "en": "cache",
    "def": "Cópia rápida de dados caros de obter."
   }
  ]
 },
 {
  "lessonId": "l7-documentos-chave-valor",
  "terms": [
   {
    "pt": "padrão de acesso",
    "en": "access pattern",
    "def": "Uma pergunta que a aplicação faz aos dados, com a frequência dela; em bancos NoSQL, é o que define a forma dos dados.",
    "example": "Start by listing your access patterns, then design the keys around them."
   },
   {
    "pt": "embutir",
    "en": "embed",
    "def": "Guardar os dados relacionados dentro do mesmo documento.",
    "example": "Embed the order items in the order document."
   },
   {
    "pt": "referenciar",
    "en": "reference",
    "def": "Guardar só o identificador do outro documento e buscá-lo à parte."
   },
   {
    "pt": "desnormalizar",
    "en": "denormalize",
    "def": "Copiar um dado para mais de um lugar para ler mais depressa, aceitando o trabalho de manter as cópias em dia."
   },
   {
    "pt": "esquema na leitura",
    "en": "schema-on-read",
    "def": "O banco aceita documentos de qualquer formato; quem lê interpreta e lida com as variações."
   },
   {
    "pt": "pipeline de agregação",
    "en": "aggregation pipeline",
    "def": "Sequência de estágios ($match, $group, $sort...) em que a saída de um é a entrada do próximo."
   },
   {
    "pt": "índice multichave",
    "en": "multikey index",
    "def": "Índice sobre um campo que é array, com uma entrada para cada elemento."
   },
   {
    "pt": "conjunto ordenado",
    "en": "sorted set",
    "def": "Estrutura do Redis com membros únicos, cada um com uma pontuação, mantidos em ordem de pontuação.",
    "example": "ZINCRBY leaderboard 10 \"ana\""
   },
   {
    "pt": "atualização perdida",
    "en": "lost update",
    "def": "Duas leituras-e-escritas intercaladas em que a segunda sobrescreve a primeira sem saber dela."
   },
   {
    "pt": "cache-aside",
    "en": "cache-aside",
    "def": "Padrão em que a aplicação procura no cache, vai ao banco quando não acha e guarda o resultado no cache."
   },
   {
    "pt": "invalidação de cache",
    "en": "cache invalidation",
    "def": "Apagar a cópia em cache quando o original muda.",
    "example": "There are only two hard things in Computer Science: cache invalidation and naming things."
   },
   {
    "pt": "limitação de taxa",
    "en": "rate limiting",
    "def": "Limitar quantas operações um cliente pode fazer por intervalo de tempo."
   },
   {
    "pt": "janela fixa",
    "en": "fixed window",
    "def": "Limitação de taxa que conta as operações em intervalos fixos do relógio, como cada minuto."
   }
  ]
 },
 {
  "lessonId": "l7-replicacao-consistencia",
  "terms": [
   {
    "pt": "replicação síncrona",
    "en": "synchronous replication",
    "def": "O líder só confirma a escrita ao cliente depois que réplicas escolhidas também a gravaram.",
    "example": "With synchronous replication, the leader waits until the follower has confirmed the write before reporting success to the client."
   },
   {
    "pt": "replicação assíncrona",
    "en": "asynchronous replication",
    "def": "O líder confirma assim que grava no próprio disco e envia às réplicas depois; uma queda pode perder escritas já confirmadas."
   },
   {
    "pt": "atraso de replicação",
    "en": "replication lag",
    "def": "Quanto uma réplica está atrás do líder, em tempo ou em posição no log.",
    "example": "Replication lag on the read replica spiked to 40 seconds during the nightly batch job."
   },
   {
    "pt": "ler as próprias escritas",
    "en": "read-your-writes consistency",
    "def": "Garantia de que um usuário sempre vê o que ele mesmo gravou."
   },
   {
    "pt": "leituras monotônicas",
    "en": "monotonic reads",
    "def": "Garantia de que, depois de ver um estado, o usuário não vê um estado mais antigo."
   },
   {
    "pt": "troca de líder",
    "en": "failover",
    "def": "Promover uma réplica a líder quando o líder atual falha."
   },
   {
    "pt": "cérebro dividido",
    "en": "split brain",
    "def": "Situação em que dois nós agem como líder ao mesmo tempo e aceitam escritas conflitantes."
   },
   {
    "pt": "quórum",
    "en": "quorum",
    "def": "Número mínimo de réplicas que precisam responder para uma escrita (W) ou uma leitura (R) valer.",
    "example": "We read and write at QUORUM, so with a replication factor of 3 we can lose one node."
   },
   {
    "pt": "reparo na leitura",
    "en": "read repair",
    "def": "Quando uma leitura encontra réplicas com versões velhas, o coordenador grava nelas a versão mais nova."
   },
   {
    "pt": "última escrita vence",
    "en": "last write wins (LWW)",
    "def": "Resolver escritas concorrentes ficando com a de maior carimbo de tempo e descartando as outras."
   },
   {
    "pt": "CRDT",
    "en": "conflict-free replicated data type",
    "def": "Tipo de dado cujas versões divergentes sempre podem ser juntadas automaticamente, sem perder atualizações."
   },
   {
    "pt": "linearizabilidade",
    "en": "linearizability",
    "def": "Garantia de que o sistema se comporta como uma cópia única dos dados: toda leitura vê a escrita mais recente já concluída."
   }
  ]
 },
 {
  "lessonId": "l8-processos-threads",
  "terms": [
   {
    "pt": "escalonador",
    "en": "scheduler",
    "def": "Parte do SO que decide qual processo/thread usa a CPU."
   },
   {
    "pt": "fatia de tempo",
    "en": "time slice / quantum",
    "def": "Tempo máximo que um processo usa a CPU antes de ser trocado."
   },
   {
    "pt": "troca de contexto",
    "en": "context switch",
    "def": "Salvar o estado de um processo e restaurar o de outro."
   },
   {
    "pt": "thread",
    "en": "thread",
    "def": "Fluxo de execução dentro de um processo; threads compartilham a memória do processo."
   },
   {
    "pt": "preempção",
    "en": "preemption",
    "def": "O SO interromper um processo para dar a CPU a outro."
   },
   {
    "pt": "tempo de espera",
    "en": "waiting time",
    "def": "Quanto tempo um processo ficou pronto, mas sem CPU."
   }
  ]
 },
 {
  "lessonId": "l8-fork-exec-wait",
  "terms": [
   {
    "pt": "processo pai / processo filho",
    "en": "parent / child process",
    "def": "O processo que pediu a criação (pai) e o processo criado (filho). O filho sabe o PID do pai (PPID)."
   },
   {
    "pt": "bifurcar",
    "en": "fork",
    "def": "Criar um processo filho quase idêntico ao pai. A chamada fork retorna duas vezes, uma em cada processo.",
    "example": "fork() returns 0 in the child and the child's PID in the parent."
   },
   {
    "pt": "executar outro programa",
    "en": "exec",
    "def": "Família de chamadas (execve, execvp...) que substitui o programa do processo atual por outro, mantendo o mesmo PID.",
    "example": "On success, execve() does not return."
   },
   {
    "pt": "esperar",
    "en": "wait / waitpid",
    "def": "Chamada em que o pai bloqueia até um filho terminar e recolhe o código de saída dele."
   },
   {
    "pt": "código de saída",
    "en": "exit status",
    "def": "Número de 0 a 255 que o processo devolve ao terminar; 0 significa sucesso. No shell, fica em $?.",
    "example": "The command exited with a non-zero exit status."
   },
   {
    "pt": "bloco de controle de processo",
    "en": "process control block (PCB)",
    "def": "Estrutura do kernel com tudo o que ele sabe de um processo: PID, estado, registradores salvos, memória, arquivos abertos, prioridade.",
    "example": "In Linux, the PCB is the task_struct."
   },
   {
    "pt": "identificador de processo",
    "en": "process ID (PID)",
    "def": "Número que o kernel dá a cada processo. O PID do pai é o PPID."
   },
   {
    "pt": "descritor de arquivo",
    "en": "file descriptor",
    "def": "Número inteiro que identifica um arquivo, pipe ou socket aberto pelo processo; 0, 1 e 2 são a entrada, a saída e o erro padrão.",
    "example": "dup2(fd, 1) makes file descriptor 1 refer to the same open file as fd."
   },
   {
    "pt": "cópia na escrita",
    "en": "copy-on-write",
    "def": "Otimização do fork: pai e filho compartilham as páginas de memória até que um deles escreva; só então a página é copiada."
   },
   {
    "pt": "processo zumbi",
    "en": "zombie process",
    "def": "Processo que já terminou, mas cujo pai ainda não chamou wait; sobra só a entrada na tabela de processos.",
    "example": "A zombie process shows up as <defunct> in ps."
   },
   {
    "pt": "processo órfão",
    "en": "orphan process",
    "def": "Processo cujo pai terminou antes dele; é adotado pelo init (PID 1) ou por um subreaper, que o recolhe quando ele terminar."
   },
   {
    "pt": "comando interno",
    "en": "shell builtin",
    "def": "Comando que o próprio shell executa, sem fork, porque precisa mudar o estado do shell (cd, export, exit).",
    "example": "cd is a shell builtin."
   }
  ]
 },
 {
  "lessonId": "l8-prioridades-mlfq",
  "terms": [
   {
    "pt": "tempo de retorno",
    "en": "turnaround time",
    "def": "Da chegada do processo até ele terminar: término − chegada."
   },
   {
    "pt": "tempo de resposta",
    "en": "response time",
    "def": "Da chegada até a primeira vez que o processo roda: primeira execução − chegada.",
    "example": "Round Robin trades turnaround time for response time."
   },
   {
    "pt": "menor tempo restante primeiro",
    "en": "shortest remaining time first (SRTF)",
    "def": "Versão preemptiva do SJF: um processo que chega com duração menor do que o que falta ao atual toma a CPU."
   },
   {
    "pt": "escalonamento por prioridade",
    "en": "priority scheduling",
    "def": "A CPU vai para o processo pronto de maior prioridade; empates se resolvem com outra política, como FCFS ou Round Robin."
   },
   {
    "pt": "inanição",
    "en": "starvation",
    "def": "Situação em que um processo pronto nunca recebe a CPU porque sempre há alguém mais prioritário."
   },
   {
    "pt": "envelhecimento",
    "en": "aging",
    "def": "Aumentar aos poucos a prioridade de quem espera há muito tempo, para evitar a inanição."
   },
   {
    "pt": "fila multinível com realimentação",
    "en": "multi-level feedback queue (MLFQ)",
    "def": "Várias filas de prioridade; o processo desce ou volta ao topo conforme o comportamento observado."
   },
   {
    "pt": "limite de tempo",
    "en": "time allotment",
    "def": "Na MLFQ, quanto tempo de CPU um processo pode gastar num nível antes de descer."
   },
   {
    "pt": "reforço de prioridade",
    "en": "priority boost",
    "def": "Na MLFQ, devolver periodicamente todos os processos à fila mais alta."
   },
   {
    "pt": "interrupção do temporizador",
    "en": "timer interrupt",
    "def": "Interrupção periódica do hardware que devolve o controle ao kernel e torna a preempção possível."
   },
   {
    "pt": "troca voluntária",
    "en": "voluntary context switch",
    "def": "Troca de contexto que acontece porque o processo bloqueou (E/S, sleep, wait)."
   },
   {
    "pt": "troca involuntária",
    "en": "involuntary context switch",
    "def": "Troca de contexto em que o kernel tira a CPU do processo (fim do quantum ou alguém mais prioritário)."
   },
   {
    "pt": "sobrecarga",
    "en": "overhead",
    "def": "Trabalho que não é do usuário, como trocar de contexto; reduz a fração útil da CPU."
   },
   {
    "pt": "valor nice",
    "en": "nice value",
    "def": "No Linux, a \"gentileza\" de um processo comum, de −20 (mais prioridade) a 19 (menos); o padrão é 0.",
    "example": "Run the backup with nice -n 19 so it does not slow down the server."
   }
  ]
 },
 {
  "lessonId": "l8-memoria-arquivos",
  "terms": [
   {
    "pt": "memória virtual",
    "en": "virtual memory",
    "def": "Cada processo vê um espaço de endereços próprio, traduzido para a memória física pelo SO e pelo hardware."
   },
   {
    "pt": "página",
    "en": "page",
    "def": "Bloco de tamanho fixo (ex.: 4 KiB) em que a memória é dividida."
   },
   {
    "pt": "tabela de páginas",
    "en": "page table",
    "def": "Mapa de página virtual para quadro (frame) físico."
   },
   {
    "pt": "falta de página",
    "en": "page fault",
    "def": "Acesso a uma página que não está na memória física no momento."
   },
   {
    "pt": "pilha",
    "en": "stack",
    "def": "Região onde ficam as chamadas de função e suas variáveis locais."
   },
   {
    "pt": "heap",
    "en": "heap",
    "def": "Região para dados alocados dinamicamente, que vivem além da função que os criou."
   },
   {
    "pt": "vazamento de memória",
    "en": "memory leak",
    "def": "Memória que não é mais usada, mas nunca é liberada."
   },
   {
    "pt": "inode",
    "en": "inode",
    "def": "Estrutura que descreve um arquivo: tamanho, dono, permissões e onde estão seus blocos."
   }
  ]
 },
 {
  "lessonId": "l8-ponteiros-heap-c",
  "terms": [
   {
    "pt": "espaço de endereçamento",
    "en": "address space",
    "def": "Conjunto de endereços virtuais que um processo pode usar, organizado em regiões com permissões próprias: código, dados, heap, mapeamentos e pilha.",
    "example": "Each process has its own virtual address space."
   },
   {
    "pt": "segmento de texto",
    "en": "text segment",
    "def": "Região com as instruções de máquina do programa; pode ser lida e executada, mas não escrita."
   },
   {
    "pt": "ponteiro",
    "en": "pointer",
    "def": "Em C, uma variável cujo valor é um endereço de memória; o tipo do ponteiro diz o que existe naquele endereço.",
    "example": "Dereferencing a NULL pointer is undefined behavior."
   },
   {
    "pt": "desreferenciar",
    "en": "dereference",
    "def": "Seguir o endereço guardado num ponteiro para ler ou escrever o valor que está lá (*p em C)."
   },
   {
    "pt": "aritmética de ponteiros",
    "en": "pointer arithmetic",
    "def": "Somar n a um ponteiro avança n elementos, isto é, n × sizeof(tipo) bytes; v[i] é *(v + i)."
   },
   {
    "pt": "alocador",
    "en": "allocator",
    "def": "Código da biblioteca (malloc, free) que reparte o heap em blocos e controla quais estão livres.",
    "example": "glibc's allocator keeps freed chunks in per-thread caches."
   },
   {
    "pt": "cabeçalho",
    "en": "header",
    "def": "Bytes que o alocador guarda logo antes do bloco entregue, com o tamanho dele; é assim que free(p) sabe quanto liberar."
   },
   {
    "pt": "lista livre",
    "en": "free list",
    "def": "Lista dos blocos livres do heap que o alocador consulta para atender um malloc."
   },
   {
    "pt": "coalescência",
    "en": "coalescing",
    "def": "Juntar blocos livres vizinhos num bloco maior quando um deles é liberado."
   },
   {
    "pt": "fragmentação externa",
    "en": "external fragmentation",
    "def": "Memória livre suficiente no total, mas espalhada em pedaços pequenos demais para atender um pedido."
   },
   {
    "pt": "fragmentação interna",
    "en": "internal fragmentation",
    "def": "Espaço desperdiçado dentro de um bloco entregue: cabeçalho, alinhamento, arredondamento."
   },
   {
    "pt": "ponteiro pendurado",
    "en": "dangling pointer",
    "def": "Ponteiro para memória já liberada ou para um frame que já saiu da pilha."
   },
   {
    "pt": "uso após liberação",
    "en": "use-after-free",
    "def": "Ler ou escrever por um ponteiro pendurado; o bloco pode já pertencer a outro objeto.",
    "example": "ERROR: AddressSanitizer: heap-use-after-free on address 0x502000000010"
   },
   {
    "pt": "estouro de buffer",
    "en": "buffer overflow",
    "def": "Escrever além do fim de um vetor, sobrescrevendo o que estiver ao lado."
   },
   {
    "pt": "comportamento indefinido",
    "en": "undefined behavior",
    "def": "Operação para a qual o padrão C não define resultado: o programa pode parecer funcionar, quebrar ou ser explorado.",
    "example": "Reading past the end of an array is undefined behavior."
   },
   {
    "pt": "ASLR",
    "en": "address space layout randomization",
    "def": "Sorteio, a cada execução, dos endereços onde começam pilha, heap, bibliotecas e código, para dificultar ataques."
   }
  ]
 },
 {
  "lessonId": "l8-inodes-journaling",
  "terms": [
   {
    "pt": "bloco",
    "en": "block",
    "def": "Unidade de alocação do sistema de arquivos, de tamanho fixo (normalmente 4 KiB); o disco só conhece blocos numerados."
   },
   {
    "pt": "inode",
    "en": "inode",
    "def": "Estrutura com os metadados de um arquivo (tipo, permissões, dono, tamanho, datas, contagem de links) e a localização dos seus blocos.",
    "example": "No space left on device can also mean the file system ran out of inodes: check df -i."
   },
   {
    "pt": "número do inode",
    "en": "inode number",
    "def": "Identificador do inode, único dentro de um sistema de arquivos; aparece na primeira coluna de ls -i."
   },
   {
    "pt": "ponteiro indireto",
    "en": "indirect pointer",
    "def": "Número de um bloco que não guarda dados, e sim mais números de bloco."
   },
   {
    "pt": "extent",
    "en": "extent",
    "def": "Faixa contínua de blocos descrita por (início lógico, início físico, comprimento); usada pelo ext4, XFS e Btrfs no lugar de um ponteiro por bloco."
   },
   {
    "pt": "entrada de diretório",
    "en": "directory entry",
    "def": "Par (nome, número do inode) guardado dentro de um diretório."
   },
   {
    "pt": "contagem de links",
    "en": "link count",
    "def": "Quantas entradas de diretório apontam para um inode; o rm desconta 1."
   },
   {
    "pt": "hard link",
    "en": "hard link",
    "def": "Uma entrada de diretório a mais para o mesmo inode: outro nome, mesmo arquivo."
   },
   {
    "pt": "link simbólico",
    "en": "symbolic link (symlink)",
    "def": "Arquivo especial cujo conteúdo é um caminho, seguido durante a resolução; pode ficar pendurado.",
    "example": "Too many levels of symbolic links"
   },
   {
    "pt": "consistência após queda",
    "en": "crash consistency",
    "def": "Garantia de que as estruturas do disco continuam coerentes entre si mesmo se a energia acabar no meio de uma atualização."
   },
   {
    "pt": "journaling",
    "en": "journaling",
    "def": "Técnica de gravar antes, num diário, a descrição da mudança, para refazê-la depois de uma queda."
   },
   {
    "pt": "diário",
    "en": "journal",
    "def": "Área reservada do disco onde o journaling grava as transações antes de aplicá-las."
   },
   {
    "pt": "checkpoint",
    "en": "checkpoint",
    "def": "Copiar as mudanças já confirmadas no diário para os lugares definitivos no disco."
   },
   {
    "pt": "fsync",
    "en": "fsync",
    "def": "Chamada de sistema que só retorna depois que os dados e metadados de um arquivo chegaram ao armazenamento.",
    "example": "Call fsync() on the file and then on its parent directory to make a rename durable."
   }
  ]
 },
 {
  "lessonId": "l8-concorrencia",
  "terms": [
   {
    "pt": "condição de corrida",
    "en": "race condition",
    "def": "Resultado depende da ordem imprevisível de execução."
   },
   {
    "pt": "seção crítica",
    "en": "critical section",
    "def": "Trecho que acessa dado compartilhado e não pode ser intercalado."
   },
   {
    "pt": "trava / exclusão mútua",
    "en": "lock / mutex",
    "def": "Mecanismo que garante que só uma thread entre na seção crítica."
   },
   {
    "pt": "impasse",
    "en": "deadlock",
    "def": "Threads esperando umas pelas outras para sempre."
   },
   {
    "pt": "atômico",
    "en": "atomic",
    "def": "Indivisível: acontece por inteiro, sem intercalação."
   }
  ]
 },
 {
  "lessonId": "l8-semaforos-condicao",
  "terms": [
   {
    "pt": "espera ativa",
    "en": "busy waiting / spinning",
    "def": "Ficar testando uma condição num laço, gastando CPU, em vez de dormir até ser avisado."
   },
   {
    "pt": "semáforo",
    "en": "semaphore",
    "def": "Contador inteiro, nunca negativo, com duas operações atômicas: P (espera o contador ficar positivo e decrementa) e V (incrementa e acorda quem espera).",
    "example": "sem_wait() decrements the semaphore; if the value is zero, the call blocks until it becomes possible to perform the decrement."
   },
   {
    "pt": "semáforo contador",
    "en": "counting semaphore",
    "def": "Semáforo iniciado com N: deixa até N threads passarem ao mesmo tempo."
   },
   {
    "pt": "semáforo binário",
    "en": "binary semaphore",
    "def": "Semáforo que só vale 0 ou 1; usado como exclusão mútua ou como sinal entre duas threads."
   },
   {
    "pt": "variável de condição",
    "en": "condition variable",
    "def": "Fila de espera associada a um lock: wait libera o lock e dorme; notify acorda quem espera. Não guarda memória do aviso.",
    "example": "Condition variables must be used with a mutex: wait() atomically releases the lock and suspends the thread."
   },
   {
    "pt": "monitor",
    "en": "monitor",
    "def": "Objeto que junta dados, um lock e variáveis de condição: só uma thread por vez executa seus métodos."
   },
   {
    "pt": "produtor-consumidor",
    "en": "producer-consumer",
    "def": "Problema clássico: threads que produzem itens e threads que os consomem, ligadas por um buffer compartilhado."
   },
   {
    "pt": "buffer limitado",
    "en": "bounded buffer",
    "def": "Fila com capacidade máxima: o produtor espera se ela está cheia; o consumidor, se está vazia."
   },
   {
    "pt": "despertar espúrio",
    "en": "spurious wakeup",
    "def": "Retorno de wait sem que ninguém tenha avisado; permitido pelo POSIX, e mais um motivo para reconferir a condição.",
    "example": "Spurious wakeups from pthread_cond_wait() may occur."
   },
   {
    "pt": "aviso perdido",
    "en": "lost wakeup",
    "def": "Aviso (notify) feito quando ninguém estava esperando: some, e quem for esperar depois dorme para sempre."
   },
   {
    "pt": "semântica Mesa",
    "en": "Mesa semantics",
    "def": "Regra em que notify é só uma dica: a thread acordada volta a disputar o lock e, quando roda, o estado pode ter mudado."
   }
  ]
 },
 {
  "lessonId": "l8-async-threads-processos",
  "terms": [
   {
    "pt": "paralelismo",
    "en": "parallelism",
    "def": "Executar várias coisas literalmente ao mesmo tempo, em núcleos diferentes.",
    "example": "Concurrency is about dealing with lots of things at once. Parallelism is about doing lots of things at once."
   },
   {
    "pt": "limitado por E/S",
    "en": "I/O-bound",
    "def": "Tarefa que passa a maior parte do tempo esperando rede, disco ou banco de dados."
   },
   {
    "pt": "limitado por CPU",
    "en": "CPU-bound",
    "def": "Tarefa que passa a maior parte do tempo calculando; só acelera com mais núcleos trabalhando."
   },
   {
    "pt": "corrotina",
    "en": "coroutine",
    "def": "Função que pode pausar no meio e ser retomada depois do mesmo ponto; no Python, definida com async def.",
    "example": "RuntimeWarning: coroutine 'buscar' was never awaited"
   },
   {
    "pt": "laço de eventos",
    "en": "event loop",
    "def": "Laço que, numa thread só, escolhe a próxima tarefa pronta, roda até ela pausar e espera eventos de E/S."
   },
   {
    "pt": "multitarefa cooperativa",
    "en": "cooperative multitasking",
    "def": "A tarefa só cede a vez quando quer (no await); ninguém a interrompe à força."
   },
   {
    "pt": "gerador",
    "en": "generator",
    "def": "Função com yield: cada next() roda até o próximo yield e pausa ali, guardando o estado."
   },
   {
    "pt": "chamada bloqueante",
    "en": "blocking call",
    "def": "Chamada que segura a thread parada até terminar, como time.sleep ou uma requisição síncrona."
   },
   {
    "pt": "trava global do interpretador",
    "en": "Global Interpreter Lock (GIL)",
    "def": "Lock do CPython que deixa só uma thread executar bytecode Python por vez."
   },
   {
    "pt": "serialização",
    "en": "serialization / pickling",
    "def": "Converter objetos em bytes para mandá-los a outro processo; no Python, feita pelo pickle."
   },
   {
    "pt": "lei de Amdahl",
    "en": "Amdahl's law",
    "def": "O ganho máximo de paralelizar é limitado pela parte que continua sequencial: S = 1 / ((1 − p) + p/n)."
   }
  ]
 },
 {
  "lessonId": "l9-camadas-tcp-udp",
  "terms": [
   {
    "pt": "protocolo",
    "en": "protocol",
    "def": "Conjunto de regras para comunicação."
   },
   {
    "pt": "pacote",
    "en": "packet",
    "def": "Unidade de dados que trafega na rede."
   },
   {
    "pt": "roteador",
    "en": "router",
    "def": "Equipamento que encaminha pacotes entre redes."
   },
   {
    "pt": "aperto de mão em três vias",
    "en": "three-way handshake",
    "def": "SYN, SYN-ACK, ACK: abertura de conexão TCP."
   },
   {
    "pt": "porta",
    "en": "port",
    "def": "Número que identifica um serviço em uma máquina (0–65535)."
   },
   {
    "pt": "perda de pacotes",
    "en": "packet loss",
    "def": "Pacotes que não chegam ao destino."
   },
   {
    "pt": "latência",
    "en": "latency",
    "def": "Tempo para um dado ir de um ponto a outro."
   }
  ]
 },
 {
  "lessonId": "l9-ip-subredes-nat",
  "terms": [
   {
    "pt": "encapsulamento",
    "en": "encapsulation",
    "def": "Cada camada embrulha os dados da camada de cima com o próprio cabeçalho antes de passar para baixo.",
    "example": "Each layer encapsulates the payload from the layer above with its own header."
   },
   {
    "pt": "unidade máxima de transmissão",
    "en": "maximum transmission unit (MTU)",
    "def": "Maior pacote IP que um enlace aceita sem fragmentar: 1500 bytes na Ethernet, 1492 no PPPoE.",
    "example": "Packets larger than the path MTU must be fragmented or dropped."
   },
   {
    "pt": "tempo de vida",
    "en": "time to live (TTL)",
    "def": "Campo do cabeçalho IPv4 que cada roteador diminui em 1; ao chegar a 0, o pacote é descartado. No IPv6 se chama hop limit."
   },
   {
    "pt": "sub-rede",
    "en": "subnet",
    "def": "Bloco de endereços contíguos que compartilham o mesmo prefixo e se alcançam sem passar por roteador."
   },
   {
    "pt": "notação CIDR",
    "en": "CIDR notation",
    "def": "Escrever o endereço seguido de /n, em que n é o número de bits do prefixo de rede (ex.: 10.0.4.0/22).",
    "example": "The VPC uses the CIDR block 10.0.0.0/16."
   },
   {
    "pt": "endereço de broadcast",
    "en": "broadcast address",
    "def": "Último endereço de uma sub-rede IPv4 (todos os bits de host em 1); um pacote para ele vai a todos os hosts da sub-rede."
   },
   {
    "pt": "gateway padrão",
    "en": "default gateway",
    "def": "Roteador para onde o host manda tudo o que não está na própria sub-rede.",
    "example": "Make sure the default gateway is reachable."
   },
   {
    "pt": "protocolo de resolução de endereços",
    "en": "Address Resolution Protocol (ARP)",
    "def": "Protocolo que descobre o endereço MAC de um IPv4 da mesma rede local (\"quem tem 192.168.0.1?\")."
   },
   {
    "pt": "tabela de rotas",
    "en": "routing table",
    "def": "Lista de prefixos com o próximo salto e a interface para cada um.",
    "example": "Check the routing table with `ip route`."
   },
   {
    "pt": "casamento pelo prefixo mais longo",
    "en": "longest prefix match",
    "def": "Regra dos roteadores: entre as rotas que contêm o destino, vale a de prefixo mais longo, isto é, a mais específica."
   },
   {
    "pt": "rota padrão",
    "en": "default route",
    "def": "A rota 0.0.0.0/0 (ou ::/0 no IPv6), que contém todos os endereços e só vale quando nenhuma outra casa."
   },
   {
    "pt": "tradução de endereços de rede",
    "en": "network address translation (NAT)",
    "def": "Reescrita dos endereços (e, no NAPT, das portas) dos pacotes na fronteira entre a rede privada e a pública.",
    "example": "The home router performs NAT for every device on the LAN."
   },
   {
    "pt": "NAT de grande escala da operadora",
    "en": "carrier-grade NAT (CGNAT)",
    "def": "NAT feito pela operadora, que coloca muitos clientes atrás do mesmo IP público; usa a faixa 100.64.0.0/10."
   },
   {
    "pt": "redirecionamento de porta",
    "en": "port forwarding",
    "def": "Regra fixa no NAT que manda o que chega numa porta pública para um IP e uma porta da rede interna."
   }
  ]
 },
 {
  "lessonId": "l9-tcp-janelas-congestionamento",
  "terms": [
   {
    "pt": "melhor esforço",
    "en": "best effort",
    "def": "Serviço que tenta entregar cada pacote, mas não promete entrega, ordem nem prazo; é o que o IP oferece.",
    "example": "IP provides a best-effort delivery service."
   },
   {
    "pt": "segmento",
    "en": "segment",
    "def": "A unidade do TCP: um cabeçalho TCP (20 bytes ou mais) mais um pedaço do fluxo de bytes."
   },
   {
    "pt": "número de sequência",
    "en": "sequence number",
    "def": "Posição, no fluxo de bytes, do primeiro byte de dados do segmento. Começa num valor aleatório (ISN) em cada conexão.",
    "example": "The sequence number of the first data octet in this segment."
   },
   {
    "pt": "confirmação cumulativa",
    "en": "cumulative acknowledgment",
    "def": "O ACK informa o próximo byte esperado, o que confirma de uma vez todos os bytes anteriores."
   },
   {
    "pt": "ACK duplicado",
    "en": "duplicate ACK",
    "def": "ACK repetido, com o mesmo número, enviado quando chega um segmento fora de ordem: sinal de que há um buraco."
   },
   {
    "pt": "retransmissão rápida",
    "en": "fast retransmit",
    "def": "Reenviar um segmento ao receber três ACKs duplicados, sem esperar o temporizador."
   },
   {
    "pt": "tempo de ida e volta",
    "en": "round-trip time (RTT)",
    "def": "Tempo entre enviar um segmento e receber a confirmação dele."
   },
   {
    "pt": "tempo limite de retransmissão",
    "en": "retransmission timeout (RTO)",
    "def": "Quanto o remetente espera por um ACK antes de reenviar; calculado a partir das medidas de RTT.",
    "example": "The RTO is doubled after each retransmission (exponential backoff)."
   },
   {
    "pt": "tamanho máximo de segmento",
    "en": "maximum segment size (MSS)",
    "def": "Maior quantidade de dados num segmento, anunciada no SYN; 1460 bytes numa Ethernet de MTU 1500."
   },
   {
    "pt": "janela deslizante",
    "en": "sliding window",
    "def": "Limite de bytes enviados e ainda não confirmados; à medida que chegam ACKs, a janela anda para a frente."
   },
   {
    "pt": "controle de fluxo",
    "en": "flow control",
    "def": "Mecanismo para o remetente não mandar mais do que o buffer do receptor comporta (janela de recepção, rwnd)."
   },
   {
    "pt": "controle de congestionamento",
    "en": "congestion control",
    "def": "Mecanismo para o remetente não mandar mais do que a rede comporta (janela de congestionamento, cwnd).",
    "example": "Linux uses CUBIC as the default congestion control algorithm."
   },
   {
    "pt": "partida lenta",
    "en": "slow start",
    "def": "Fase em que a cwnd dobra a cada RTT, do valor inicial até o limiar ssthresh."
   },
   {
    "pt": "aumento aditivo, diminuição multiplicativa",
    "en": "additive increase, multiplicative decrease (AIMD)",
    "def": "Regra que soma 1 MSS por RTT enquanto vai bem e corta a janela pela metade numa perda; produz o gráfico em dente de serra."
   },
   {
    "pt": "produto banda × atraso",
    "en": "bandwidth-delay product (BDP)",
    "def": "Capacidade do enlace vezes o RTT: quantos bytes precisam estar em voo para ocupar o enlace inteiro."
   },
   {
    "pt": "bloqueio de cabeça de fila",
    "en": "head-of-line blocking",
    "def": "Quando um dado perdido segura a entrega de tudo o que vem depois dele, mesmo do que já chegou."
   },
   {
    "pt": "migração de conexão",
    "en": "connection migration",
    "def": "No QUIC, a conexão continua quando o IP ou a porta do cliente mudam, porque é identificada por um ID de conexão."
   }
  ]
 },
 {
  "lessonId": "l9-dns-https",
  "terms": [
   {
    "pt": "resolvedor",
    "en": "resolver",
    "def": "Servidor que descobre o IP de um nome, consultando outros servidores."
   },
   {
    "pt": "registro DNS",
    "en": "DNS record",
    "def": "Entrada do DNS: A, AAAA, CNAME, MX, TXT..."
   },
   {
    "pt": "tempo de vida",
    "en": "TTL (time to live)",
    "def": "Por quanto tempo uma resposta pode ficar em cache."
   },
   {
    "pt": "certificado",
    "en": "certificate",
    "def": "Documento digital que liga um domínio a uma chave pública, assinado por uma autoridade."
   },
   {
    "pt": "autoridade certificadora",
    "en": "certificate authority (CA)",
    "def": "Entidade confiável que assina certificados."
   }
  ]
 },
 {
  "lessonId": "l9-http-versoes",
  "terms": [
   {
    "pt": "enquadramento",
    "en": "framing",
    "def": "A regra que diz onde cada mensagem começa e termina dentro de um fluxo de bytes.",
    "example": "HTTP/1.1 message framing relies on Content-Length or the chunked transfer coding."
   },
   {
    "pt": "conexão persistente",
    "en": "persistent connection (keep-alive)",
    "def": "Conexão TCP reaproveitada para várias requisições seguidas; é o padrão no HTTP/1.1."
   },
   {
    "pt": "encadeamento de requisições",
    "en": "HTTP pipelining",
    "def": "Mandar várias requisições sem esperar as respostas; as respostas precisam voltar na mesma ordem. Na prática, ficou desligado nos navegadores."
   },
   {
    "pt": "codificação em pedaços",
    "en": "chunked transfer coding",
    "def": "Corpo enviado em pedaços, cada um precedido do tamanho em hexadecimal; um pedaço de tamanho 0 marca o fim.",
    "example": "Transfer-Encoding: chunked"
   },
   {
    "pt": "contrabando de requisições",
    "en": "HTTP request smuggling",
    "def": "Ataque que explora dois servidores (proxy e back-end) discordando sobre onde uma requisição termina."
   },
   {
    "pt": "quadro",
    "en": "frame",
    "def": "A unidade do HTTP/2 e do HTTP/3: um cabeçalho curto (tipo e tamanho; no HTTP/2, também flags e o ID do fluxo) seguido do conteúdo."
   },
   {
    "pt": "fluxo",
    "en": "stream",
    "def": "Sequência de quadros de uma mesma troca requisição/resposta dentro da conexão, identificada por um número.",
    "example": "Each HTTP/2 request is sent on a new stream with an odd stream identifier."
   },
   {
    "pt": "multiplexação",
    "en": "multiplexing",
    "def": "Intercalar quadros de vários fluxos numa mesma conexão, sem que um tenha de esperar o outro terminar."
   },
   {
    "pt": "pseudocabeçalho",
    "en": "pseudo-header field",
    "def": "Campo que começa com \":\" e substitui a linha inicial do HTTP/1.1: :method, :scheme, :authority, :path e :status."
   },
   {
    "pt": "compressão de cabeçalhos",
    "en": "header compression (HPACK, QPACK)",
    "def": "Trocar campos repetidos por índices em tabelas compartilhadas entre os dois lados."
   },
   {
    "pt": "tabela dinâmica",
    "en": "dynamic table",
    "def": "Tabela do HPACK/QPACK que guarda campos já enviados na conexão, com tamanho limitado; os mais antigos saem primeiro."
   },
   {
    "pt": "serviço alternativo",
    "en": "alternative service (Alt-Svc)",
    "def": "Cabeçalho em que o servidor anuncia que o mesmo site também atende por outro protocolo ou porta.",
    "example": "Alt-Svc: h3=\":443\"; ma=86400"
   }
  ]
 },
 {
  "lessonId": "l9-tls-certificados",
  "terms": [
   {
    "pt": "handshake do TLS",
    "en": "TLS handshake",
    "def": "A troca inicial de mensagens em que cliente e servidor combinam versão, algoritmos e chaves, e o servidor prova quem é."
   },
   {
    "pt": "compartilhamento de chave",
    "en": "key share",
    "def": "A metade pública e efêmera da troca de chaves Diffie-Hellman que cada lado envia no hello."
   },
   {
    "pt": "sigilo futuro",
    "en": "forward secrecy",
    "def": "Garantia de que o vazamento futuro da chave privada do servidor não decifra conversas gravadas no passado, porque cada sessão usou chaves efêmeras.",
    "example": "TLS 1.3 provides forward secrecy for all full handshakes."
   },
   {
    "pt": "indicação do nome do servidor",
    "en": "Server Name Indication (SNI)",
    "def": "Extensão do ClientHello com o nome do site, para o servidor escolher o certificado certo quando vários sites dividem o mesmo IP."
   },
   {
    "pt": "negociação do protocolo de aplicação",
    "en": "Application-Layer Protocol Negotiation (ALPN)",
    "def": "Extensão do TLS em que o cliente lista os protocolos que fala (h2, http/1.1) e o servidor escolhe um, sem RTT extra."
   },
   {
    "pt": "retomada de sessão",
    "en": "session resumption",
    "def": "Reabrir uma sessão TLS com uma chave combinada numa conexão anterior (PSK), pulando parte do trabalho."
   },
   {
    "pt": "dados antecipados",
    "en": "early data (0-RTT)",
    "def": "Dados de aplicação enviados junto com o ClientHello numa retomada, antes de o handshake terminar."
   },
   {
    "pt": "ataque de repetição",
    "en": "replay attack",
    "def": "Gravar uma mensagem legítima e reenviá-la para que seja processada de novo."
   },
   {
    "pt": "nome alternativo do titular",
    "en": "Subject Alternative Name (SAN)",
    "def": "Extensão do certificado com a lista de nomes (e IPs) que ele cobre; é o campo que os navegadores conferem."
   },
   {
    "pt": "certificado curinga",
    "en": "wildcard certificate",
    "def": "Certificado com um nome como *.loja.com.br, que cobre exatamente um rótulo naquela posição."
   },
   {
    "pt": "cadeia de certificados",
    "en": "certificate chain",
    "def": "A sequência folha → intermediárias → raiz, em que cada certificado é assinado pelo seguinte."
   },
   {
    "pt": "certificado intermediário",
    "en": "intermediate certificate",
    "def": "Certificado de uma CA assinado pela raiz (ou por outra intermediária), usado no dia a dia para emitir certificados de sites."
   },
   {
    "pt": "repositório de confiança",
    "en": "trust store (root store)",
    "def": "O conjunto de certificados raiz em que o sistema ou o navegador confia de antemão."
   },
   {
    "pt": "revogação",
    "en": "revocation",
    "def": "Invalidar um certificado antes do vencimento, por exemplo porque a chave privada vazou."
   },
   {
    "pt": "transparência de certificados",
    "en": "Certificate Transparency (CT)",
    "def": "Registros públicos e só de acréscimo onde as CAs publicam todo certificado que emitem."
   },
   {
    "pt": "TLS mútuo",
    "en": "mutual TLS (mTLS)",
    "def": "TLS em que o cliente também apresenta um certificado e prova possuir a chave dele."
   },
   {
    "pt": "segurança de transporte estrita",
    "en": "HTTP Strict Transport Security (HSTS)",
    "def": "Cabeçalho que manda o navegador usar só HTTPS com aquele domínio por um período.",
    "example": "Strict-Transport-Security: max-age=31536000; includeSubDomains"
   }
  ]
 },
 {
  "lessonId": "l9-sockets",
  "terms": [
   {
    "pt": "soquete",
    "en": "socket",
    "def": "Ponto de comunicação de um processo na rede: IP + porta + protocolo."
   },
   {
    "pt": "escutar",
    "en": "listen",
    "def": "Pôr o socket do servidor à espera de conexões."
   },
   {
    "pt": "aceitar",
    "en": "accept",
    "def": "Pegar a próxima conexão da fila, gerando um socket para conversar com aquele cliente."
   },
   {
    "pt": "fluxo de bytes",
    "en": "byte stream",
    "def": "Sequência contínua de bytes, sem fronteiras de mensagem."
   },
   {
    "pt": "enquadramento",
    "en": "framing",
    "def": "Regra para saber onde cada mensagem começa e termina."
   },
   {
    "pt": "E/S assíncrona",
    "en": "asynchronous I/O",
    "def": "Uma thread atende muitas conexões, trocando de tarefa enquanto espera a rede."
   },
   {
    "pt": "balanceador de carga",
    "en": "load balancer",
    "def": "Distribui requisições entre várias instâncias do servidor."
   }
  ]
 },
 {
  "lessonId": "l9-websockets",
  "terms": [
   {
    "pt": "WebSocket",
    "en": "WebSocket",
    "def": "Protocolo (RFC 6455) que transforma uma conexão HTTP em um canal bidirecional de mensagens, nos dois sentidos, a qualquer momento.",
    "example": "WebSocket connection to 'wss://example.com/ws' failed"
   },
   {
    "pt": "consulta periódica",
    "en": "polling",
    "def": "O cliente pergunta ao servidor, de tempos em tempos, se há novidade."
   },
   {
    "pt": "consulta longa",
    "en": "long polling",
    "def": "O cliente faz uma requisição que o servidor só responde quando há novidade (ou quando o tempo limite estoura); a cada resposta, o cliente abre outra."
   },
   {
    "pt": "eventos enviados pelo servidor",
    "en": "Server-Sent Events (SSE)",
    "def": "Resposta HTTP que nunca termina, pela qual o servidor envia eventos de texto ao cliente; só no sentido servidor → cliente.",
    "example": "The EventSource interface is a connection to a server sending server-sent events."
   },
   {
    "pt": "troca de protocolo",
    "en": "protocol upgrade",
    "def": "Mecanismo do HTTP/1.1 (cabeçalho Upgrade, resposta 101) para passar a falar outro protocolo na mesma conexão.",
    "example": "101 Switching Protocols"
   },
   {
    "pt": "handshake de abertura",
    "en": "opening handshake",
    "def": "O GET com Upgrade e a resposta 101 que estabelecem a conexão WebSocket."
   },
   {
    "pt": "quadro",
    "en": "frame",
    "def": "Unidade de transmissão do WebSocket: cabeçalho de 2 a 14 bytes seguido dos dados."
   },
   {
    "pt": "código de operação",
    "en": "opcode",
    "def": "Os 4 bits do quadro que dizem o que ele carrega: texto, binário, continuação, close, ping ou pong."
   },
   {
    "pt": "chave de máscara",
    "en": "masking key",
    "def": "4 bytes aleatórios que o cliente usa, com XOR, para embaralhar os dados de cada quadro."
   },
   {
    "pt": "quadro de controle",
    "en": "control frame",
    "def": "Quadro de close, ping ou pong: no máximo 125 bytes de dados e nunca fragmentado."
   },
   {
    "pt": "fragmentação",
    "en": "fragmentation",
    "def": "Dividir uma mensagem em vários quadros: o primeiro com o opcode, os seguintes como continuação, o último com FIN = 1."
   },
   {
    "pt": "batimento",
    "en": "heartbeat",
    "def": "Mensagem periódica (no WebSocket, ping e pong) para provar que a conexão continua viva e impedir que intermediários a derrubem por inatividade."
   },
   {
    "pt": "contrapressão",
    "en": "backpressure",
    "def": "Fazer quem produz dados mais rápido desacelerar (ou descartar) quando quem consome não dá conta, em vez de acumular sem limite."
   },
   {
    "pt": "sequestro de WebSocket entre sites",
    "en": "cross-site WebSocket hijacking (CSWSH)",
    "def": "Ataque em que uma página maliciosa abre um WebSocket para o seu servidor usando os cookies do usuário; evitado conferindo o Origin."
   }
  ]
 },
 {
  "lessonId": "l9-proxies-balanceamento",
  "terms": [
   {
    "pt": "proxy direto",
    "en": "forward proxy",
    "def": "Intermediário que age em nome dos clientes, como o proxy da empresa que filtra o acesso à internet."
   },
   {
    "pt": "proxy reverso",
    "en": "reverse proxy",
    "def": "Intermediário que age em nome dos servidores: recebe as conexões dos clientes e as repassa a servidores internos.",
    "example": "NGINX can act as a reverse proxy and load balancer."
   },
   {
    "pt": "grupo de servidores",
    "en": "upstream / backend pool",
    "def": "Conjunto de instâncias entre as quais o balanceador distribui o tráfego."
   },
   {
    "pt": "balanceamento em camada 4",
    "en": "layer 4 load balancing",
    "def": "Decide por conexão olhando só IP, porta e protocolo de transporte; não entende o conteúdo."
   },
   {
    "pt": "balanceamento em camada 7",
    "en": "layer 7 load balancing",
    "def": "Termina a conexão do cliente, entende o protocolo de aplicação (HTTP) e decide por requisição."
   },
   {
    "pt": "terminação TLS",
    "en": "TLS termination",
    "def": "O proxy decifra o TLS com o certificado do site e fala com os servidores internos sem TLS ou com outra conexão TLS."
   },
   {
    "pt": "round robin ponderado",
    "en": "weighted round robin",
    "def": "Revezamento em que cada servidor recebe uma parte proporcional ao seu peso."
   },
   {
    "pt": "menos conexões",
    "en": "least connections",
    "def": "Escolhe o servidor com menos conexões ativas no momento."
   },
   {
    "pt": "poder de duas escolhas",
    "en": "power of two choices",
    "def": "Sorteia dois servidores e manda para o menos carregado dos dois."
   },
   {
    "pt": "verificação de saúde",
    "en": "health check",
    "def": "Teste periódico (ou observação do tráfego) que decide se um servidor continua recebendo tráfego.",
    "example": "Server app2 is DOWN, reason: Layer7 wrong status, code: 503"
   },
   {
    "pt": "sessão fixa",
    "en": "sticky session / session affinity",
    "def": "Mandar sempre o mesmo cliente para o mesmo servidor, por cookie ou por hash do IP."
   },
   {
    "pt": "cabeçalho hop-by-hop",
    "en": "hop-by-hop header",
    "def": "Cabeçalho que vale só para uma conexão (como Connection e Upgrade) e que o proxy não repassa adiante."
   },
   {
    "pt": "drenagem de conexões",
    "en": "connection draining",
    "def": "Parar de mandar conexões novas a um servidor e esperar (com prazo) as atuais terminarem antes de desligá-lo."
   },
   {
    "pt": "espera exponencial com variação aleatória",
    "en": "exponential backoff with jitter",
    "def": "Esperar cada vez mais entre tentativas, com um sorteio no tempo, para que milhares de clientes não voltem todos no mesmo instante."
   }
  ]
 },
 {
  "lessonId": "l10-git",
  "terms": [
   {
    "pt": "controle de versão",
    "en": "version control",
    "def": "Registrar a história das mudanças de um projeto."
   },
   {
    "pt": "repositório",
    "en": "repository (repo)",
    "def": "Projeto com toda a sua história no Git."
   },
   {
    "pt": "confirmação / commit",
    "en": "commit",
    "def": "Um snapshot do projeto com mensagem, autor e data."
   },
   {
    "pt": "área de preparação",
    "en": "staging area / index",
    "def": "Onde você escolhe o que entra no próximo commit."
   },
   {
    "pt": "ramificação",
    "en": "branch",
    "def": "Linha de desenvolvimento independente; um ponteiro para um commit."
   },
   {
    "pt": "mesclar",
    "en": "merge",
    "def": "Juntar o trabalho de duas branches."
   },
   {
    "pt": "conflito",
    "en": "merge conflict",
    "def": "Quando as duas branches mudaram as mesmas linhas."
   },
   {
    "pt": "pedido de integração",
    "en": "pull request (PR)",
    "def": "Proposta de mudança revisada antes de entrar na branch principal."
   }
  ]
 },
 {
  "lessonId": "l10-clean-code",
  "terms": [
   {
    "pt": "refatoração",
    "en": "refactoring",
    "def": "Melhorar a estrutura do código sem mudar seu comportamento."
   },
   {
    "pt": "mau cheiro",
    "en": "code smell",
    "def": "Indício superficial de um problema de design."
   },
   {
    "pt": "revisão de código",
    "en": "code review",
    "def": "Outra pessoa analisar o código antes de integrá-lo."
   },
   {
    "pt": "dívida técnica",
    "en": "technical debt",
    "def": "Custo futuro de atalhos tomados hoje."
   },
   {
    "pt": "legibilidade",
    "en": "readability",
    "def": "Facilidade de entender o código."
   },
   {
    "pt": "DRY",
    "en": "DRY (don't repeat yourself)",
    "def": "Evitar duplicação de conhecimento."
   }
  ]
 },
 {
  "lessonId": "l10-testes-ci",
  "terms": [
   {
    "pt": "pirâmide de testes",
    "en": "test pyramid",
    "def": "Muitos testes de unidade, menos de integração, poucos ponta a ponta."
   },
   {
    "pt": "teste de integração",
    "en": "integration test",
    "def": "Testa várias partes funcionando juntas."
   },
   {
    "pt": "teste ponta a ponta",
    "en": "end-to-end (E2E) test",
    "def": "Testa o sistema como o usuário usa."
   },
   {
    "pt": "dublê de teste",
    "en": "test double (mock, stub, fake)",
    "def": "Substituto de uma dependência real em testes."
   },
   {
    "pt": "integração contínua",
    "en": "continuous integration (CI)",
    "def": "Rodar build e testes automaticamente a cada mudança."
   },
   {
    "pt": "cobertura",
    "en": "code coverage",
    "def": "Porcentagem do código executada pelos testes."
   }
  ]
 },
 {
  "lessonId": "l10-arquitetura",
  "terms": [
   {
    "pt": "arquitetura em camadas",
    "en": "layered architecture",
    "def": "Divisão do sistema em camadas com responsabilidades separadas."
   },
   {
    "pt": "inversão de dependência",
    "en": "dependency inversion",
    "def": "O núcleo define interfaces; detalhes (banco, web) as implementam."
   },
   {
    "pt": "monólito",
    "en": "monolith",
    "def": "Uma aplicação implantada como uma unidade só."
   },
   {
    "pt": "microsserviços",
    "en": "microservices",
    "def": "Sistema dividido em serviços pequenos, implantados separadamente, que conversam pela rede."
   },
   {
    "pt": "registro de decisão de arquitetura",
    "en": "architecture decision record (ADR)",
    "def": "Documento curto com contexto, decisão e consequências."
   },
   {
    "pt": "história de usuário",
    "en": "user story",
    "def": "\"Como <quem>, quero <o quê>, para <por quê>.\""
   },
   {
    "pt": "critério de aceitação",
    "en": "acceptance criteria",
    "def": "Condições verificáveis para considerar a história pronta."
   },
   {
    "pt": "dívida técnica",
    "en": "technical debt",
    "def": "Custo futuro de um atalho tomado hoje."
   }
  ]
 },
 {
  "lessonId": "l11-fundamentos",
  "terms": [
   {
    "pt": "autenticação",
    "en": "authentication (authn)",
    "def": "Verificar quem você é."
   },
   {
    "pt": "autorização",
    "en": "authorization (authz)",
    "def": "Verificar o que você pode fazer."
   },
   {
    "pt": "função de hash",
    "en": "hash function",
    "def": "Função de mão única que gera um \"resumo\" de tamanho fixo."
   },
   {
    "pt": "sal",
    "en": "salt",
    "def": "Valor aleatório único por senha, misturado antes do hash."
   },
   {
    "pt": "autenticação multifator",
    "en": "multi-factor authentication (MFA)",
    "def": "Exigir dois ou mais fatores: algo que sabe, tem ou é."
   },
   {
    "pt": "menor privilégio",
    "en": "least privilege",
    "def": "Dar só as permissões estritamente necessárias."
   },
   {
    "pt": "ameaça",
    "en": "threat",
    "def": "Algo que pode explorar uma vulnerabilidade."
   }
  ]
 },
 {
  "lessonId": "l11-owasp",
  "terms": [
   {
    "pt": "injeção de SQL",
    "en": "SQL injection",
    "def": "Entrada do usuário interpretada como parte de um comando SQL."
   },
   {
    "pt": "script entre sites",
    "en": "cross-site scripting (XSS)",
    "def": "Injetar JavaScript que roda no navegador de outra pessoa."
   },
   {
    "pt": "falsificação de requisição entre sites",
    "en": "cross-site request forgery (CSRF)",
    "def": "Site malicioso faz o navegador da vítima enviar uma ação autenticada."
   },
   {
    "pt": "vulnerabilidade",
    "en": "vulnerability",
    "def": "Falha que pode ser explorada."
   },
   {
    "pt": "sanitizar / escapar",
    "en": "sanitize / escape",
    "def": "Tratar dados para que não sejam interpretados como código."
   },
   {
    "pt": "política de segurança de conteúdo",
    "en": "Content Security Policy (CSP)",
    "def": "Cabeçalho que restringe quais scripts e recursos a página pode carregar."
   }
  ]
 },
 {
  "lessonId": "l11-criptografia",
  "terms": [
   {
    "pt": "cifra simétrica",
    "en": "symmetric cipher",
    "def": "A mesma chave cifra e decifra.",
    "example": "AES-GCM"
   },
   {
    "pt": "cifra assimétrica",
    "en": "asymmetric (public-key) cryptography",
    "def": "Par de chaves: a pública cifra ou verifica; a privada decifra ou assina.",
    "example": "RSA, curvas elípticas"
   },
   {
    "pt": "assinatura digital",
    "en": "digital signature",
    "def": "Prova de que a mensagem veio do dono da chave privada e não foi alterada."
   },
   {
    "pt": "código de autenticação de mensagem",
    "en": "message authentication code (MAC)",
    "def": "Etiqueta calculada com uma chave secreta compartilhada; o HMAC é o mais comum."
   },
   {
    "pt": "troca de chaves",
    "en": "key exchange",
    "def": "Protocolo para dois lados combinarem uma chave secreta por um canal inseguro.",
    "example": "Diffie-Hellman"
   },
   {
    "pt": "nonce",
    "en": "nonce",
    "def": "Número usado uma única vez; reutilizá-lo pode quebrar a cifra."
   },
   {
    "pt": "ataque de temporização",
    "en": "timing attack",
    "def": "Descobrir segredos medindo quanto tempo uma operação demora."
   }
  ]
 },
 {
  "lessonId": "l12-linux-shell",
  "terms": [
   {
    "pt": "tubo",
    "en": "pipe",
    "def": "Liga a saída de um comando à entrada de outro: |"
   },
   {
    "pt": "redirecionamento",
    "en": "redirection",
    "def": "Enviar saída/entrada para arquivos: > >> <"
   },
   {
    "pt": "permissão",
    "en": "permission",
    "def": "Quem pode ler (r), escrever (w) e executar (x).",
    "example": "Permission denied"
   },
   {
    "pt": "variável de ambiente",
    "en": "environment variable",
    "def": "Configuração passada aos processos: PATH, HOME."
   },
   {
    "pt": "superusuário",
    "en": "superuser / root",
    "def": "Usuário com todos os privilégios; sudo executa como ele."
   }
  ]
 },
 {
  "lessonId": "l12-docker",
  "terms": [
   {
    "pt": "contêiner",
    "en": "container",
    "def": "Processo isolado com seu próprio sistema de arquivos, rede e limites."
   },
   {
    "pt": "imagem",
    "en": "image",
    "def": "Modelo imutável a partir do qual containers são criados."
   },
   {
    "pt": "camada",
    "en": "layer",
    "def": "Cada instrução do Dockerfile gera uma camada cacheável."
   },
   {
    "pt": "volume",
    "en": "volume",
    "def": "Armazenamento que persiste além do ciclo de vida do container."
   },
   {
    "pt": "registro",
    "en": "registry",
    "def": "Repositório de imagens (Docker Hub, GHCR)."
   },
   {
    "pt": "orquestração",
    "en": "orchestration",
    "def": "Gerenciar muitos containers: Compose, Kubernetes."
   }
  ]
 },
 {
  "lessonId": "l12-deploy-observabilidade",
  "terms": [
   {
    "pt": "integração contínua",
    "en": "continuous integration (CI)",
    "def": "Integrar e testar automaticamente cada mudança no repositório principal."
   },
   {
    "pt": "entrega contínua",
    "en": "continuous delivery (CD)",
    "def": "Manter o software sempre pronto para ir à produção com um clique (ou automaticamente)."
   },
   {
    "pt": "infraestrutura como código",
    "en": "infrastructure as code (IaC)",
    "def": "Descrever servidores, redes e permissões em arquivos versionados.",
    "example": "Terraform"
   },
   {
    "pt": "observabilidade",
    "en": "observability",
    "def": "Capacidade de entender o estado interno do sistema pelos sinais que ele emite: logs, métricas e traces."
   },
   {
    "pt": "percentil",
    "en": "percentile",
    "def": "p95 = valor abaixo do qual estão 95% das medições."
   },
   {
    "pt": "objetivo de nível de serviço",
    "en": "service level objective (SLO)",
    "def": "Meta de confiabilidade, como \"99,9% das requisições com sucesso em 30 dias\"."
   },
   {
    "pt": "orçamento de erros",
    "en": "error budget",
    "def": "Quanto de falha o SLO permite; gastá-lo todo é sinal para frear mudanças arriscadas."
   },
   {
    "pt": "implantação canário",
    "en": "canary deployment",
    "def": "Liberar a versão nova para uma pequena fração do tráfego antes de todos."
   }
  ]
 },
 {
  "lessonId": "l13-ml-fundamentos",
  "terms": [
   {
    "pt": "aprendizado de máquina",
    "en": "machine learning (ML)",
    "def": "Programas que melhoram seu desempenho a partir de dados."
   },
   {
    "pt": "conjunto de treino",
    "en": "training set",
    "def": "Dados usados para ajustar o modelo."
   },
   {
    "pt": "conjunto de teste",
    "en": "test set",
    "def": "Dados nunca vistos no treino, usados para avaliar."
   },
   {
    "pt": "sobreajuste",
    "en": "overfitting",
    "def": "O modelo decora o treino e generaliza mal."
   },
   {
    "pt": "função de perda",
    "en": "loss function",
    "def": "Mede o erro do modelo; o treino tenta minimizá-la."
   },
   {
    "pt": "gradiente descendente",
    "en": "gradient descent",
    "def": "Ajustar parâmetros na direção que mais reduz a perda."
   },
   {
    "pt": "rótulo",
    "en": "label",
    "def": "A resposta correta de um exemplo (no aprendizado supervisionado)."
   }
  ]
 },
 {
  "lessonId": "l13-redes-neurais",
  "terms": [
   {
    "pt": "neurônio artificial",
    "en": "artificial neuron / perceptron",
    "def": "Calcula uma soma ponderada das entradas e aplica uma ativação."
   },
   {
    "pt": "peso",
    "en": "weight",
    "def": "Parâmetro que multiplica cada entrada."
   },
   {
    "pt": "viés",
    "en": "bias",
    "def": "Parâmetro somado ao resultado."
   },
   {
    "pt": "função de ativação",
    "en": "activation function",
    "def": "Não linearidade aplicada à soma: ReLU, sigmoide."
   },
   {
    "pt": "retropropagação",
    "en": "backpropagation",
    "def": "Algoritmo que calcula o gradiente da perda em relação a todos os pesos (regra da cadeia)."
   },
   {
    "pt": "época",
    "en": "epoch",
    "def": "Uma passada completa pelos dados de treino."
   }
  ]
 },
 {
  "lessonId": "l13-ia-generativa",
  "terms": [
   {
    "pt": "modelo de linguagem grande",
    "en": "large language model (LLM)",
    "def": "Modelo treinado para prever o próximo token em grandes volumes de texto."
   },
   {
    "pt": "token",
    "en": "token",
    "def": "Pedaço de texto (palavra ou parte dela) que o modelo processa."
   },
   {
    "pt": "alucinação",
    "en": "hallucination",
    "def": "Resposta fluente e confiante, mas falsa."
   },
   {
    "pt": "janela de contexto",
    "en": "context window",
    "def": "Quanto texto o modelo considera de uma vez."
   },
   {
    "pt": "instrução / prompt",
    "en": "prompt",
    "def": "O texto de entrada que orienta o modelo."
   }
  ]
 },
 {
  "lessonId": "l14-logica-conjuntos",
  "terms": [
   {
    "pt": "proposição",
    "en": "proposition",
    "def": "Afirmação que é verdadeira ou falsa."
   },
   {
    "pt": "conectivo",
    "en": "logical connective",
    "def": "E (∧), OU (∨), NÃO (¬), implica (→)."
   },
   {
    "pt": "tabela-verdade",
    "en": "truth table",
    "def": "Lista o valor de uma expressão para todas as combinações."
   },
   {
    "pt": "implicação",
    "en": "implication",
    "def": "p → q: \"se p, então q\". Só é falsa quando p é verdade e q é falso."
   },
   {
    "pt": "conjunto",
    "en": "set",
    "def": "Coleção de elementos distintos, sem ordem."
   },
   {
    "pt": "tautologia",
    "en": "tautology",
    "def": "Expressão sempre verdadeira."
   }
  ]
 },
 {
  "lessonId": "l14-combinatoria-probabilidade",
  "terms": [
   {
    "pt": "combinação",
    "en": "combination",
    "def": "Escolha sem ordem: C(n, k)."
   },
   {
    "pt": "permutação",
    "en": "permutation",
    "def": "Arranjo com ordem: n!."
   },
   {
    "pt": "probabilidade condicional",
    "en": "conditional probability",
    "def": "P(A | B): probabilidade de A sabendo que B ocorreu."
   },
   {
    "pt": "valor esperado",
    "en": "expected value",
    "def": "Média ponderada pelos resultados possíveis."
   },
   {
    "pt": "desvio padrão",
    "en": "standard deviation",
    "def": "Quanto os valores se espalham em torno da média."
   },
   {
    "pt": "simulação de Monte Carlo",
    "en": "Monte Carlo simulation",
    "def": "Estimar resultados repetindo experimentos aleatórios."
   }
  ]
 },
 {
  "lessonId": "l14-discreta",
  "terms": [
   {
    "pt": "indução matemática",
    "en": "mathematical induction",
    "def": "Provar P(0) e que P(k) implica P(k+1); então P vale para todo n."
   },
   {
    "pt": "invariante de laço",
    "en": "loop invariant",
    "def": "Propriedade verdadeira antes e depois de cada volta do laço."
   },
   {
    "pt": "relação de recorrência",
    "en": "recurrence relation",
    "def": "Equação que define T(n) em termos de valores menores, como T(n) = 2T(n/2) + n."
   },
   {
    "pt": "Teorema Mestre",
    "en": "Master Theorem",
    "def": "Fórmula pronta para recorrências de divisão e conquista."
   },
   {
    "pt": "grafo bipartido",
    "en": "bipartite graph",
    "def": "Grafo cujos vértices se dividem em dois grupos, com arestas só entre grupos."
   },
   {
    "pt": "aritmética modular",
    "en": "modular arithmetic",
    "def": "Contas \"no relógio\": só importa o resto da divisão por m."
   },
   {
    "pt": "exponenciação rápida",
    "en": "exponentiation by squaring",
    "def": "Calcular b^e em O(log e) multiplicações."
   }
  ]
 },
 {
  "lessonId": "l14-algebra-calculo",
  "terms": [
   {
    "pt": "vetor",
    "en": "vector",
    "def": "Lista ordenada de números; ponto ou direção num espaço."
   },
   {
    "pt": "produto escalar",
    "en": "dot product",
    "def": "Soma dos produtos coordenada a coordenada; mede alinhamento."
   },
   {
    "pt": "norma",
    "en": "norm",
    "def": "Comprimento de um vetor: raiz do produto escalar dele com ele mesmo."
   },
   {
    "pt": "matriz",
    "en": "matrix",
    "def": "Tabela de números; representa uma transformação linear ou um conjunto de dados."
   },
   {
    "pt": "derivada",
    "en": "derivative",
    "def": "Taxa de variação instantânea de uma função."
   },
   {
    "pt": "regra da cadeia",
    "en": "chain rule",
    "def": "A derivada de f(g(x)) é f'(g(x)) · g'(x)."
   },
   {
    "pt": "gradiente",
    "en": "gradient",
    "def": "Vetor das derivadas parciais; aponta para onde a função mais cresce."
   },
   {
    "pt": "taxa de aprendizado",
    "en": "learning rate",
    "def": "Tamanho do passo na descida do gradiente."
   }
  ]
 }
];
