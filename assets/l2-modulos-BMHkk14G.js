var e={id:`l2-modulos`,moduleId:`m2-5`,title:`Módulos, pacotes e a biblioteca padrão`,titleEn:`Modules, packages and the standard library`,summary:`import, organizar código em arquivos, pip e ambientes virtuais.`,minutes:25,objectives:[`Importar módulos e funções`,`Conhecer módulos úteis da biblioteca padrão`,`Entender pip, PyPI e ambientes virtuais`,`Organizar um projeto em arquivos`],skills:[`py-modulos`],terms:[{pt:`módulo`,en:`module`,def:`Um arquivo .py que pode ser importado.`},{pt:`pacote`,en:`package`,def:`Uma pasta de módulos; ou uma biblioteca instalável.`},{pt:`importar`,en:`import`,def:`Trazer código de outro módulo.`,example:`ModuleNotFoundError: No module named 'requests'`},{pt:`dependência`,en:`dependency`,def:`Biblioteca de terceiros que seu projeto usa.`},{pt:`ambiente virtual`,en:`virtual environment (venv)`,def:`Pasta isolada com as dependências de um projeto.`}],references:[`python-docs`,`python-packaging`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:"Um **{{módulo|module}}** é simplesmente um arquivo `.py`. Com `import`, você reutiliza código de outros arquivos, da **biblioteca padrão** (que já vem com o Python) ou de **pacotes** de terceiros instalados com `pip`."}]},{stage:`explicacao`,blocks:[{type:`md`,text:'```\nimport math                 # usa math.sqrt(2)\nfrom random import choice   # usa choice([...])\nimport datetime as dt       # apelido\n```\n\n**Biblioteca padrão** que vale conhecer: `math`, `random`, `datetime`, `collections` (Counter, deque, defaultdict), `itertools`, `json`, `csv`, `pathlib`, `re` (expressões regulares), `unittest`.\n\n**Pacotes de terceiros**: ficam no PyPI e são instalados com `pip install nome`. Para cada projeto, crie um **ambiente virtual** (`python -m venv .venv`) para que as versões das {{dependências|dependencies}} de um projeto não conflitem com as de outro.\n\n**if __name__ == "__main__":** — código dentro desse bloco só roda quando o arquivo é executado diretamente, não quando é importado.'},{type:`callout`,tone:`tip`,text:`Antes de instalar um pacote, confira se a biblioteca padrão já resolve. Menos dependências = menos riscos de segurança e manutenção.`}]},{stage:`exemplo`,blocks:[{type:`code`,lang:`python`,code:`import math
from collections import Counter, deque
from datetime import date

print(math.sqrt(16), math.pi)
print(Counter(["a", "b", "a"]))
fila = deque([1, 2, 3]); fila.appendleft(0); print(fila)
print((date(2026, 12, 25) - date(2026, 10, 6)).days, "dias até o Natal")`,runnable:!0}]},{stage:`codigo`,blocks:[{type:`code`,lang:`text`,runnable:!1,code:`meu_projeto/
├── .venv/              # ambiente virtual (não vai para o Git)
├── requirements.txt    # dependências: requests==2.32.3
├── tarefas/
│   ├── __init__.py
│   ├── modelo.py       # dados e regras
│   └── armazenamento.py# salvar/carregar JSON
├── main.py             # interface com o usuário
└── tests/
    └── test_modelo.py`,caption:`Estrutura típica de um projeto Python pequeno. Separar regras, armazenamento e interface é o começo da arquitetura de software.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e2-mod-1`,kind:`mcq`,prompt:"Ao rodar seu programa aparece `ModuleNotFoundError: No module named 'requests'`. Qual é a causa mais provável?",difficulty:`facil`,skills:[`py-modulos`,`en-leitura-erros`],hints:[`*No module named* = nenhum módulo chamado...`,`requests faz parte da biblioteca padrão?`],explanation:"requests é um pacote de terceiros. Instale no ambiente virtual ativo: `pip install requests`. Se já instalou, provavelmente instalou em outro ambiente.",options:[{text:`Há um erro de sintaxe na linha do import`,feedback:`Seria SyntaxError.`},{text:`O pacote não está instalado no ambiente Python em uso`,correct:!0,feedback:`Isso: instale com pip no ambiente virtual ativo.`},{text:`A internet caiu`,feedback:`Importar não usa a internet.`},{text:`O nome da variável está errado`,feedback:`Seria NameError.`}]}},{type:`exercise`,exercise:{id:`e2-mod-2`,kind:`code`,lang:`python`,prompt:"Usando `collections.Counter`, escreva `mais_comum(xs)` que devolve o elemento mais frequente da lista (em empate, o que aparece primeiro).",difficulty:`facil`,skills:[`py-modulos`],hints:["Leia a documentação de `Counter.most_common`.","`Counter(xs).most_common(1)` devolve `[(elemento, contagem)]`."],explanation:"Conhecer a biblioteca padrão evita reinventar a roda. `most_common` mantém a ordem de inserção em empates.",starter:`from collections import Counter

def mais_comum(xs):
    pass
`,solution:`from collections import Counter

def mais_comum(xs):
    return Counter(xs).most_common(1)[0][0]
`,tests:[{name:`mais frequente`,code:`assert mais_comum([1, 2, 2, 3]) == 2`},{name:`empate → primeiro`,code:`assert mais_comum(["b", "a", "a", "b"]) == "b"`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e2-mod-desafio`,kind:`code`,lang:`python`,prompt:"Usando o módulo `re` (expressões regulares), escreva `extrair_emails(texto)` que devolve a lista de e-mails no texto, na ordem. Considere e-mails no formato `nome@dominio.ext` com letras, números, ponto, hífen e underline.",difficulty:`avancado`,skills:[`py-modulos`,`prog-strings`],hints:["Procure por `re.findall` na documentação.","Um padrão possível: `[\\w.-]+@[\\w-]+(\\.[\\w-]+)+` — mas cuidado: grupos com parênteses mudam o que findall devolve.","Use grupo não capturante `(?:...)`."],explanation:"Em `re.findall`, grupos capturantes fazem a função devolver só o grupo. `(?:...)` agrupa sem capturar. Validar e-mail perfeitamente por regex é notoriamente difícil; aqui buscamos um padrão prático.",starter:`import re

def extrair_emails(texto):
    pass
`,solution:`import re

def extrair_emails(texto):
    return re.findall(r"[\\w.-]+@[\\w-]+(?:\\.[\\w-]+)+", texto)
`,tests:[{name:`encontra dois`,code:`assert extrair_emails("fale com ana.silva@exemplo.com.br ou bia_2@site.org!") == ["ana.silva@exemplo.com.br", "bia_2@site.org"]`},{name:`nenhum`,code:`assert extrair_emails("sem contato") == []`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:"**Lista de tarefas (parte 5)**: separe o projeto em `modelo.py`, `armazenamento.py` e `main.py`, no seu computador, com um ambiente virtual. Sim: agora é um projeto de verdade, com estrutura profissional."},{type:`project`,projectId:`p2-todo`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Módulo = arquivo .py; pacote = pasta de módulos.
- Biblioteca padrão primeiro; pip/PyPI depois.
- Um ambiente virtual por projeto.
- \`if __name__ == "__main__":\``}]}],cards:[{id:`l2-modulos#1`,front:`Para que serve um ambiente virtual?`,back:`Isolar as dependências (e versões) de cada projeto.`},{id:`l2-modulos#2`,front:'O que faz `if __name__ == "__main__":`?',back:`Executa o bloco só quando o arquivo é rodado diretamente, não quando importado.`}]};export{e as default};
//# sourceMappingURL=l2-modulos-BMHkk14G.js.map