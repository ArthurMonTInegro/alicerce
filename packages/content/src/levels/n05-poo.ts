import type { Level } from '../types.ts';
import { dedent, deep, english, lesson, md, py, t, tip, warn } from '../helpers.ts';

const classes = lesson({
  id: 'l5-classes',
  moduleId: 'm5-1',
  title: 'Classes, objetos e encapsulamento',
  titleEn: 'Classes, objects and encapsulation',
  summary: 'Modelar entidades com estado e comportamento, proteger invariantes e escrever métodos especiais.',
  minutes: 40,
  objectives: ['Definir classes com atributos e métodos', 'Entender self e o construtor __init__', 'Proteger invariantes com encapsulamento e propriedades', 'Implementar __repr__ e __eq__'],
  skills: ['poo-classes'],
  terms: [
    t('classe', 'class', 'Molde que define atributos e métodos de um tipo de objeto.'),
    t('objeto / instância', 'object / instance', 'Um exemplar concreto criado a partir de uma classe.'),
    t('atributo', 'attribute', 'Dado guardado no objeto.', "AttributeError: 'Conta' object has no attribute 'saldo'"),
    t('método', 'method', 'Função definida dentro da classe que opera sobre o objeto.'),
    t('construtor', 'constructor / initializer', 'Método que prepara o objeto ao ser criado (__init__).'),
    t('encapsulamento', 'encapsulation', 'Esconder detalhes internos e expor uma interface que mantém o objeto válido.'),
    t('invariante', 'invariant', 'Regra que deve ser sempre verdadeira para o objeto (saldo nunca negativo).'),
  ],
  stages: {
    conceito: [md('Uma **{{classe|class}}** junta **dados** (atributos) e **comportamento** (métodos) que pertencem juntos. Cada **{{objeto|object}}** criado a partir dela tem seu próprio estado. Programação orientada a objetos (POO) é uma forma de organizar programas em torno dessas entidades.')],
    explicacao: [
      md(`
        \`\`\`
        class Conta:
            def __init__(self, titular, saldo=0):
                self.titular = titular
                self._saldo = saldo          # "_" = detalhe interno, por convenção

            def depositar(self, valor):
                if valor <= 0:
                    raise ValueError("valor deve ser positivo")
                self._saldo += valor

            @property
            def saldo(self):                # leitura controlada
                return self._saldo
        \`\`\`

        - \`__init__\` é chamado ao criar o objeto: \`c = Conta("Ana")\`.
        - \`self\` é o próprio objeto; \`c.depositar(10)\` é o mesmo que \`Conta.depositar(c, 10)\`.
        - **{{Encapsulamento|encapsulation}}**: quem usa a conta não mexe em \`_saldo\` diretamente — usa \`depositar\`, que garante a **{{invariante|invariant}}** (nunca depositar valor negativo).
        - **Métodos especiais** (*dunder methods*): \`__repr__\` (como o objeto aparece), \`__eq__\` (igualdade), \`__len__\`, \`__lt__\`...
      `),
      tip('Para classes que são basicamente "dados com nome", use `@dataclass` (módulo dataclasses): ele gera __init__, __repr__ e __eq__ automaticamente.'),
      deep('Em Python não existe "private" de verdade: `_nome` é uma convenção ("não use de fora") e `__nome` faz *name mangling*. A filosofia é *"we are all consenting adults"*. Em Java e C#, `private` é imposto pelo compilador.', 'Privado em Python?'),
    ],
    exemplo: [py(`
      from dataclasses import dataclass

      @dataclass
      class Ponto:
          x: float
          y: float

          def distancia(self, outro: "Ponto") -> float:
              return ((self.x - outro.x) ** 2 + (self.y - outro.y) ** 2) ** 0.5

      a, b = Ponto(0, 0), Ponto(3, 4)
      print(a, b, a.distancia(b), a == Ponto(0, 0))
    `)],
    codigo: [py(`
      class Conta:
          def __init__(self, titular, saldo=0):
              self.titular = titular
              self._saldo = saldo

          def depositar(self, valor):
              if valor <= 0:
                  raise ValueError("valor deve ser positivo")
              self._saldo += valor

          @property
          def saldo(self):
              return self._saldo

          def __repr__(self):
              return f"Conta({self.titular!r}, saldo={self._saldo})"

      c = Conta("Ana")
      c.depositar(50)
      print(c, c.saldo)
    `)],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e5-cls-1',
          kind: 'code',
          lang: 'python',
          prompt: 'Complete a classe `Conta`: adicione `sacar(valor)` que lança `ValueError("saldo insuficiente")` se valor > saldo e `ValueError("valor deve ser positivo")` se valor <= 0. O saldo **nunca** pode ficar negativo.',
          difficulty: 'facil',
          skills: ['poo-classes'],
          hints: ['O método recebe `self` e `valor`.', 'Valide primeiro (guard clauses), depois altere `self._saldo`.'],
          explanation: 'O método é o "porteiro" da invariante: como ninguém altera `_saldo` diretamente, basta validar aqui para garantir que o saldo nunca fica negativo.',
          starter: dedent(`
            class Conta:
                def __init__(self, titular, saldo=0):
                    self.titular = titular
                    self._saldo = saldo

                @property
                def saldo(self):
                    return self._saldo

                def sacar(self, valor):
                    self._saldo -= valor
          `),
          solution: dedent(`
            class Conta:
                def __init__(self, titular, saldo=0):
                    self.titular = titular
                    self._saldo = saldo

                @property
                def saldo(self):
                    return self._saldo

                def sacar(self, valor):
                    if valor <= 0:
                        raise ValueError("valor deve ser positivo")
                    if valor > self._saldo:
                        raise ValueError("saldo insuficiente")
                    self._saldo -= valor
          `),
          tests: [
            { name: 'saque válido', code: 'c = Conta("Ana", 100)\nc.sacar(30)\nassert c.saldo == 70' },
            { name: 'saldo insuficiente não altera o saldo', code: 'c = Conta("Ana", 10)\ntry:\n    c.sacar(50)\n    assert False, "deveria lançar ValueError"\nexcept ValueError as e:\n    assert str(e) == "saldo insuficiente"\nassert c.saldo == 10' },
            { name: 'valor inválido', code: 'c = Conta("Ana", 10)\ntry:\n    c.sacar(0)\n    assert False, "deveria lançar ValueError"\nexcept ValueError as e:\n    assert str(e) == "valor deve ser positivo"' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e5-cls-2',
          kind: 'predict',
          lang: 'python',
          prompt: 'O que é impresso?',
          difficulty: 'intermediario',
          skills: ['poo-classes'],
          hints: ['`contador` está na classe (compartilhado) ou em cada objeto?', 'Cada `__init__` incrementa o mesmo atributo de classe.'],
          explanation: '`Robo.contador` é um **atributo de classe**, compartilhado por todas as instâncias. Depois de criar 2 robôs, vale 2; `nome` é de instância.',
          code: dedent(`
            class Robo:
                contador = 0
                def __init__(self, nome):
                    self.nome = nome
                    Robo.contador += 1

            a = Robo("R2")
            b = Robo("C3")
            print(Robo.contador, a.nome, b.nome)
          `),
          answer: '2 R2 C3',
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e5-cls-desafio',
          kind: 'code',
          lang: 'python',
          prompt: 'Crie `class Fracao` com numerador e denominador sempre **simplificados** e com sinal no numerador. Implemente `__add__`, `__mul__`, `__eq__` e `__repr__` (formato `"3/4"`). Denominador zero lança `ZeroDivisionError`.',
          difficulty: 'desafio',
          skills: ['poo-classes'],
          hints: ['Simplifique no `__init__` com `math.gcd` — assim a invariante vale para todo objeto.', 'a/b + c/d = (ad + cb)/bd. Se o denominador for negativo, troque o sinal dos dois.', '`__eq__` fica trivial se as frações estão sempre simplificadas.'],
          explanation: 'Normalizar no construtor faz a invariante ("sempre simplificada") valer para todo objeto; com isso, `__eq__` pode comparar campos diretamente. Sobrecarga de operadores torna o tipo natural de usar: `Fracao(1, 2) + Fracao(1, 4)`.',
          starter: 'class Fracao:\n    pass\n',
          solution: dedent(`
            from math import gcd

            class Fracao:
                def __init__(self, num, den=1):
                    if den == 0:
                        raise ZeroDivisionError("denominador zero")
                    if den < 0:
                        num, den = -num, -den
                    g = gcd(num, den)
                    self.num, self.den = num // g, den // g

                def __add__(self, o):
                    return Fracao(self.num * o.den + o.num * self.den, self.den * o.den)

                def __mul__(self, o):
                    return Fracao(self.num * o.num, self.den * o.den)

                def __eq__(self, o):
                    return isinstance(o, Fracao) and (self.num, self.den) == (o.num, o.den)

                def __repr__(self):
                    return f"{self.num}/{self.den}"
          `),
          tests: [
            { name: 'simplifica', code: 'assert repr(Fracao(6, 8)) == "3/4" and repr(Fracao(2, -4)) == "-1/2"' },
            { name: 'soma e multiplica', code: 'assert Fracao(1, 2) + Fracao(1, 4) == Fracao(3, 4) and Fracao(2, 3) * Fracao(3, 4) == Fracao(1, 2)' },
            { name: 'denominador zero', code: 'try:\n    Fracao(1, 0)\n    assert False\nexcept ZeroDivisionError:\n    pass' },
          ],
        },
      },
    ],
    projeto: [md('**Sistema de cadastro (parte 2)**: transforme os alunos em objetos `Aluno` (dataclass) e crie uma classe `Cadastro` que encapsula o dict interno e oferece `adicionar`, `buscar`, `remover` e `listar_por_curso`. Nenhum código de fora deve acessar o dict diretamente.'), { type: 'project', projectId: 'p3-cadastro' }],
    revisao: [md('- Classe = dados + comportamento; objeto = instância.\n- __init__ prepara; self é o objeto.\n- Encapsule para proteger invariantes.\n- Métodos especiais integram o objeto à linguagem.')],
  },
  review: [
    ['O que é self?', 'Referência ao próprio objeto sobre o qual o método foi chamado.'],
    ['Atributo de classe × de instância?', 'O de classe é compartilhado por todas as instâncias; o de instância pertence a cada objeto.'],
    ['Para que serve o encapsulamento?', 'Esconder detalhes internos e garantir que o objeto permaneça válido (invariantes).'],
  ],
  references: ['python-tutorial', 'python-docs', 'cmu-15112'],
});

const herancaComposicao = lesson({
  id: 'l5-heranca-composicao',
  moduleId: 'm5-2',
  title: 'Herança, polimorfismo, abstração e composição',
  titleEn: 'Inheritance, polymorphism, abstraction and composition',
  summary: 'Reaproveitar comportamento, tratar objetos diferentes de forma uniforme e saber quando preferir composição.',
  minutes: 40,
  objectives: ['Criar subclasses e usar super()', 'Aplicar polimorfismo', 'Definir interfaces com classes abstratas', 'Escolher composição em vez de herança quando adequado'],
  skills: ['poo-heranca'],
  terms: [
    t('herança', 'inheritance', 'Uma classe (filha) recebe atributos e métodos de outra (mãe).'),
    t('polimorfismo', 'polymorphism', 'Usar objetos de tipos diferentes pela mesma interface.'),
    t('abstração', 'abstraction', 'Expor o que algo faz, escondendo como.'),
    t('composição', 'composition', 'Um objeto contém outros objetos e delega trabalho a eles ("tem um").'),
    t('sobrescrever', 'override', 'Redefinir na subclasse um método herdado.'),
    t('classe abstrata', 'abstract base class (ABC)', 'Classe que define métodos que as subclasses devem implementar.'),
  ],
  stages: {
    conceito: [md('**Herança** ("é um"): um `Cachorro` **é um** `Animal`. **Polimorfismo**: código que chama `animal.falar()` funciona com qualquer animal. **Composição** ("tem um"): um `Carro` **tem um** `Motor`. Regra prática consagrada: **prefira composição a herança** (*favor composition over inheritance*).')],
    explicacao: [
      md(`
        - **Herança**: \`class Cachorro(Animal):\` herda tudo; pode **sobrescrever** métodos e chamar a versão da mãe com \`super().metodo()\`.
        - **Polimorfismo**: \`for f in [Circulo(1), Quadrado(2)]: print(f.area())\` — cada objeto responde do seu jeito à mesma mensagem.
        - **Abstração com ABC**: \`from abc import ABC, abstractmethod\` define uma interface; a subclasse que não implementa os métodos abstratos não pode ser instanciada.
        - **Duck typing** (Python): "se anda como pato e grasna como pato, é um pato" — basta ter o método, não precisa herdar.

        **Por que preferir composição?** Hierarquias profundas ficam rígidas: mudar a classe mãe afeta todas as filhas, e combinações (um pato de borracha que não voa?) explodem em subclasses. Com composição, você troca peças: um \`Personagem\` tem uma \`Arma\` — trocar de arma não exige outra classe.
      `),
      warn('Use herança quando a relação "é um" é verdadeira **e** a subclasse pode substituir a mãe em qualquer lugar sem quebrar nada (Princípio de Substituição de Liskov, o "L" do SOLID).'),
    ],
    exemplo: [py(`
      from abc import ABC, abstractmethod
      import math

      class Forma(ABC):
          @abstractmethod
          def area(self) -> float: ...

          def descrever(self):
              return f"{type(self).__name__} com área {self.area():.2f}"

      class Circulo(Forma):
          def __init__(self, r): self.r = r
          def area(self): return math.pi * self.r ** 2

      class Retangulo(Forma):
          def __init__(self, b, h): self.b, self.h = b, h
          def area(self): return self.b * self.h

      for f in [Circulo(1), Retangulo(2, 3)]:
          print(f.descrever())          # polimorfismo
    `)],
    codigo: [py(`
      # composição: o pedido TEM uma estratégia de frete, que pode ser trocada
      class FreteNormal:
          def calcular(self, peso): return 10 + 2 * peso

      class FreteExpresso:
          def calcular(self, peso): return 25 + 3 * peso

      class Pedido:
          def __init__(self, peso, frete):
              self.peso, self.frete = peso, frete
          def total_frete(self):
              return self.frete.calcular(self.peso)   # delega

      p = Pedido(3, FreteNormal())
      print(p.total_frete())
      p.frete = FreteExpresso()
      print(p.total_frete())
    `, { caption: 'Isso é o padrão Strategy: trocar comportamento em tempo de execução por composição.' })],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e5-her-0',
          kind: 'predict',
          lang: 'python',
          prompt: "O que este código imprime?",
          code: "class Animal:\n    def falar(self):\n        return \"...\"\n\nclass Cachorro(Animal):\n    def falar(self):\n        return \"au\"\n\nclass Gato(Animal):\n    pass\n\nfor a in [Cachorro(), Gato()]:\n    print(a.falar())",
          answer: "au\n...",
          difficulty: 'facil',
          skills: ["poo-heranca"],
          hints: ["Cada objeto usa o método da própria classe, se existir."],
          explanation: "Polimorfismo: o mesmo chamado `falar()` executa o método da classe real de cada objeto. Gato não sobrescreve, então herda o de Animal.",
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e5-her-1',
          kind: 'predict',
          lang: 'python',
          prompt: 'O que é impresso?',
          difficulty: 'intermediario',
          skills: ['poo-heranca'],
          hints: ['Gato sobrescreve falar. Cachorro não.', 'super().falar() chama a versão de Animal.'],
          explanation: 'Cachorro herda falar() de Animal ("..."). Gato sobrescreve e ainda chama super(): "...miau".',
          code: dedent(`
            class Animal:
                def falar(self):
                    return "..."

            class Cachorro(Animal):
                pass

            class Gato(Animal):
                def falar(self):
                    return super().falar() + "miau"

            print(Cachorro().falar(), Gato().falar())
          `),
          answer: '... ...miau',
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e5-her-2',
          kind: 'mcq',
          prompt: 'Num jogo, personagens podem usar espadas, arcos ou magias, e trocar durante a partida. Qual modelagem é melhor?',
          difficulty: 'intermediario',
          skills: ['poo-heranca'],
          hints: ['O personagem **é uma** espada ou **tem uma** arma?'],
          explanation: 'Composição: `Personagem` tem um atributo `arma` com uma interface comum (`atacar()`). Trocar de arma é trocar o objeto, sem explosão de subclasses.',
          options: [
            { text: 'Subclasses GuerreiroComEspada, GuerreiroComArco, MagoComArco...', feedback: 'Explosão combinatória: cada combinação vira uma classe, e trocar em tempo de execução é impossível.' },
            { text: 'Personagem com um atributo arma, e classes Espada, Arco, Magia com o método atacar()', correct: true, feedback: 'Isso: composição + polimorfismo (padrão Strategy).' },
            { text: 'Um único if gigante em Personagem.atacar()', feedback: 'Funciona no começo, mas cada arma nova exige mexer no mesmo método (viola o Aberto/Fechado).' },
            { text: 'Herança múltipla de todas as armas', feedback: 'Herança múltipla aqui criaria conflitos e não permite trocar.' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e5-her-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Modele notificações: uma classe abstrata \`Canal\` com \`enviar(destino, msg) -> str\`, e implementações
            \`Email\` (devolve \`"email para <destino>: <msg>"\`) e \`SMS\` (devolve \`"sms para <destino>: <msg>"\`, cortando
            msg em 20 caracteres). Depois \`Notificador(canais)\` com \`notificar(destino, msg)\` que devolve a lista de
            resultados de todos os canais. \`Canal()\` não pode ser instanciado.
          `),
          difficulty: 'avancado',
          skills: ['poo-heranca'],
          hints: ['`class Canal(ABC)` com `@abstractmethod def enviar(...)`.', 'Notificador **compõe** canais: guarda a lista e chama `enviar` em cada um.'],
          explanation: 'O Notificador depende só da abstração `Canal`: novos canais (WhatsApp, push) entram sem mudar o Notificador. Isso é o Princípio da Inversão de Dependência (o "D" do SOLID).',
          starter: 'from abc import ABC, abstractmethod\n\nclass Canal:\n    pass\n',
          solution: dedent(`
            from abc import ABC, abstractmethod

            class Canal(ABC):
                @abstractmethod
                def enviar(self, destino, msg): ...

            class Email(Canal):
                def enviar(self, destino, msg):
                    return f"email para {destino}: {msg}"

            class SMS(Canal):
                def enviar(self, destino, msg):
                    return f"sms para {destino}: {msg[:20]}"

            class Notificador:
                def __init__(self, canais):
                    self.canais = list(canais)

                def notificar(self, destino, msg):
                    return [c.enviar(destino, msg) for c in self.canais]
          `),
          tests: [
            { name: 'canais concretos', code: 'assert Email().enviar("ana", "oi") == "email para ana: oi"\nassert SMS().enviar("ana", "x" * 30) == "sms para ana: " + "x" * 20' },
            { name: 'notificador compõe', code: 'n = Notificador([Email(), SMS()])\nassert n.notificar("bia", "olá") == ["email para bia: olá", "sms para bia: olá"]' },
            { name: 'Canal é abstrato', code: 'try:\n    Canal()\n    assert False, "Canal não deveria ser instanciável"\nexcept TypeError:\n    pass' },
          ],
        },
      },
    ],
    projeto: [md('**Sistema de cadastro (parte 3)**: crie `Pessoa` → `Aluno` e `Professor` (herança justificável) e um `Exportador` abstrato com `ExportadorCSV` e `ExportadorJSON` (composição: o cadastro **tem um** exportador).'), { type: 'project', projectId: 'p3-cadastro' }],
    revisao: [md('- Herança: "é um"; super() reaproveita.\n- Polimorfismo: mesma interface, comportamentos diferentes.\n- ABC define contratos.\n- Prefira composição ("tem um") para flexibilidade.')],
  },
  review: [
    ['Composição × herança: qual a regra prática?', 'Prefira composição; use herança quando "é um" for verdadeiro e a subclasse puder substituir a mãe.'],
    ['O que é polimorfismo?', 'Objetos de tipos diferentes responderem à mesma interface, cada um à sua maneira.'],
  ],
  references: ['gof', 'python-docs', 'refactoring'],
});

const solid = lesson({
  id: 'l5-solid-padroes',
  moduleId: 'm5-3',
  title: 'SOLID e padrões de projeto',
  titleEn: 'SOLID and design patterns',
  summary: 'Cinco princípios para código flexível e os padrões mais usados no dia a dia.',
  minutes: 35,
  objectives: ['Explicar os cinco princípios SOLID com exemplos', 'Reconhecer Strategy, Observer, Factory, Adapter e Decorator', 'Evitar aplicar padrões sem necessidade'],
  skills: ['poo-solid'],
  terms: [
    t('padrão de projeto', 'design pattern', 'Solução reutilizável e nomeada para um problema recorrente de design.'),
    t('acoplamento', 'coupling', 'O quanto um módulo depende de outro. Baixo acoplamento é melhor.'),
    t('coesão', 'cohesion', 'O quanto as partes de um módulo pertencem juntas. Alta coesão é melhor.'),
    t('responsabilidade única', 'single responsibility', 'Cada módulo deve ter um único motivo para mudar.'),
    t('injeção de dependência', 'dependency injection', 'Passar as dependências de fora em vez de criá-las dentro.'),
  ],
  stages: {
    conceito: [md('**SOLID** são cinco princípios (popularizados por Robert C. Martin) para manter o código fácil de mudar. **Padrões de projeto** (catalogados no livro da "Gang of Four", 1994) são soluções nomeadas para problemas recorrentes — e um **vocabulário** comum entre programadores.')],
    explicacao: [
      { type: 'table', head: ['Princípio', 'Em uma frase', 'Sinal de violação'], rows: [
        ['S — Single Responsibility', 'cada classe tem um único motivo para mudar', 'classe "Relatorio" que calcula, formata e envia e-mail'],
        ['O — Open/Closed', 'aberto para extensão, fechado para modificação', 'todo tipo novo exige editar um if/elif gigante'],
        ['L — Liskov Substitution', 'subtipos substituem o tipo base sem surpresas', 'Quadrado herda de Retangulo e quebra set_largura'],
        ['I — Interface Segregation', 'interfaces pequenas e específicas', 'classe obrigada a implementar métodos que não usa'],
        ['D — Dependency Inversion', 'dependa de abstrações, não de detalhes', 'regra de negócio cria a conexão do banco por dentro'],
      ] },
      md(`
        **Padrões que você vai ver toda semana**:

        - **Strategy**: trocar um algoritmo por composição (o frete da lição anterior).
        - **Observer**: objetos se inscrevem para ser avisados de eventos (eventos do DOM, \`addEventListener\`).
        - **Factory**: uma função/classe decide qual objeto criar.
        - **Adapter**: adapta uma interface existente para a que seu código espera.
        - **Decorator**: acrescenta comportamento envolvendo um objeto/função (os \`@decoradores\` do Python são uma forma disso).
      `),
      warn('Padrões são ferramentas, não metas. Aplicar padrões "porque sim" cria complexidade desnecessária. Princípio KISS (*keep it simple*) e YAGNI (*you aren\'t gonna need it*).'),
    ],
    exemplo: [py(`
      # Observer simples
      class Evento:
          def __init__(self):
              self._inscritos = []
          def inscrever(self, f):
              self._inscritos.append(f)
          def emitir(self, *args):
              for f in self._inscritos:
                  f(*args)

      nova_matricula = Evento()
      nova_matricula.inscrever(lambda nome: print("e-mail de boas-vindas para", nome))
      nova_matricula.inscrever(lambda nome: print("registrar no log:", nome))
      nova_matricula.emitir("Ana")
    `)],
    codigo: [py(`
      # Decorator: medir tempo de qualquer função sem alterá-la
      import time
      from functools import wraps

      def cronometrar(f):
          @wraps(f)
          def wrapper(*args, **kwargs):
              t0 = time.perf_counter()
              r = f(*args, **kwargs)
              print(f"{f.__name__} levou {time.perf_counter() - t0:.5f}s")
              return r
          return wrapper

      @cronometrar
      def soma_ate(n):
          return sum(range(n))

      print(soma_ate(1_000_000))
    `)],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e5-solid-1',
          kind: 'mcq',
          prompt: 'Uma classe `Pedido` calcula o total, gera o PDF da nota e envia o e-mail ao cliente. Que princípio ela viola mais diretamente?',
          difficulty: 'facil',
          skills: ['poo-solid'],
          hints: ['Quantos motivos diferentes para mudar essa classe existem?'],
          explanation: 'Regras de preço, formato do PDF e provedor de e-mail mudam por motivos diferentes: viola Single Responsibility. Separe em calculadora, gerador de nota e serviço de e-mail.',
          options: [
            { text: 'Single Responsibility', correct: true, feedback: 'Isso: três responsabilidades, três motivos para mudar.' },
            { text: 'Liskov Substitution', feedback: 'Não há herança envolvida.' },
            { text: 'Interface Segregation', feedback: 'Trata de interfaces grandes demais impostas a quem as implementa.' },
            { text: 'Nenhum', feedback: 'Pense em quantas equipes poderiam pedir mudanças nessa classe.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e5-solid-2',
          kind: 'mcq',
          prompt: 'Você usa uma biblioteca de pagamentos com o método `charge(amount_cents)`, mas seu sistema espera objetos com `pagar(valor_reais)`. Qual padrão resolve?',
          difficulty: 'intermediario',
          skills: ['poo-solid'],
          hints: ['Você não pode mudar a biblioteca; quer **adaptar** a interface dela.'],
          explanation: 'Adapter: uma classe com `pagar(valor)` que converte para centavos e chama `charge`. Seu código continua dependendo da sua interface.',
          options: [
            { text: 'Observer', feedback: 'Observer trata de notificação de eventos.' },
            { text: 'Adapter', correct: true, feedback: 'Isso: adapta uma interface existente à esperada.' },
            { text: 'Singleton', feedback: 'Singleton garante uma única instância — não resolve a incompatibilidade.' },
            { text: 'Factory', feedback: 'Factory decide o que criar, não adapta interfaces.' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e5-solid-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Refatore aplicando Open/Closed: a função \`desconto(tipo, valor)\` tem um if/elif por tipo de cliente. Crie um
            dicionário de **estratégias** \`ESTRATEGIAS\` (tipo → função) e uma função \`registrar(tipo, f)\` que permite
            adicionar novos tipos **sem editar** \`desconto\`. Tipos iniciais: "comum" (0%), "estudante" (50%), "vip" (20%).
            Tipo desconhecido lança \`KeyError\`.
          `),
          difficulty: 'avancado',
          skills: ['poo-solid'],
          hints: ['Cada estratégia é uma função valor → valor com desconto.', '`desconto` só busca a estratégia no dict e aplica.'],
          explanation: 'Com um registro de estratégias, adicionar um tipo é registrar uma função — `desconto` nunca mais precisa ser editada (aberta para extensão, fechada para modificação).',
          starter: dedent(`
            def desconto(tipo, valor):
                if tipo == "comum":
                    return valor
                elif tipo == "estudante":
                    return valor * 0.5
                elif tipo == "vip":
                    return valor * 0.8
          `),
          solution: dedent(`
            ESTRATEGIAS = {
                "comum": lambda v: v,
                "estudante": lambda v: v * 0.5,
                "vip": lambda v: v * 0.8,
            }

            def registrar(tipo, f):
                ESTRATEGIAS[tipo] = f

            def desconto(tipo, valor):
                return ESTRATEGIAS[tipo](valor)
          `),
          tests: [
            { name: 'tipos iniciais', code: 'assert desconto("estudante", 100) == 50 and desconto("vip", 100) == 80 and desconto("comum", 100) == 100' },
            { name: 'extensão sem editar', code: 'registrar("funcionario", lambda v: v * 0.7)\nassert desconto("funcionario", 100) == 70' },
            { name: 'desconhecido', code: 'try:\n    desconto("alien", 1)\n    assert False\nexcept KeyError:\n    pass' },
          ],
        },
      },
    ],
    projeto: [md('**Revisão de design**: pegue o sistema de cadastro e procure uma violação de cada princípio SOLID (se houver). Escreva um parágrafo por princípio — em inglês, se quiser praticar: *"The class X violates SRP because..."*.')],
    revisao: [md('- SOLID: responsabilidade única, aberto/fechado, Liskov, segregação de interface, inversão de dependência.\n- Padrões: Strategy, Observer, Factory, Adapter, Decorator.\n- Baixo acoplamento, alta coesão. KISS e YAGNI.')],
  },
  review: [
    ['O que diz o Open/Closed Principle?', 'Módulos devem ser abertos para extensão e fechados para modificação.'],
    ['Para que serve o padrão Observer?', 'Para notificar vários interessados quando um evento acontece, sem acoplá-los a quem emite.'],
    ['O que significa YAGNI?', '"You aren\'t gonna need it": não implemente o que ainda não é necessário.'],
  ],
  references: ['gof', 'refactoring', 'swe-at-google'],
});

export const level5: Level = {
  id: 'n5',
  number: 5,
  title: 'Programação Orientada a Objetos',
  titleEn: 'Object-Oriented Programming',
  goal: 'Modelar sistemas com objetos coesos e pouco acoplados, usando princípios e padrões com critério.',
  why: 'A maior parte do software comercial (Java, C#, Python, TypeScript) é organizada com objetos. Entender POO de verdade — não só sintaxe de classe — é o que permite ler e evoluir sistemas grandes.',
  modules: [
    {
      id: 'm5-1', levelId: 'n5', title: 'Classes e objetos', titleEn: 'Classes and objects',
      description: 'Estado, comportamento, encapsulamento e métodos especiais.',
      prerequisites: ['m2-5'],
      skills: [{ id: 'poo-classes', pt: 'Classes, objetos e encapsulamento', en: 'Classes, objects and encapsulation' }],
      outline: ['Classes e instâncias', '__init__ e self', 'Encapsulamento e propriedades', 'Métodos especiais', 'dataclasses'],
      lessons: [classes],
      references: ['python-tutorial'],
    },
    {
      id: 'm5-2', levelId: 'n5', title: 'Herança, polimorfismo e composição', titleEn: 'Inheritance, polymorphism and composition',
      description: 'Reaproveitar e combinar comportamentos com critério.',
      prerequisites: ['m5-1'],
      skills: [{ id: 'poo-heranca', pt: 'Herança, polimorfismo e composição', en: 'Inheritance, polymorphism and composition' }],
      outline: ['Herança e super()', 'Polimorfismo e duck typing', 'Classes abstratas', 'Composição sobre herança'],
      lessons: [herancaComposicao],
      references: ['gof'],
    },
    {
      id: 'm5-3', levelId: 'n5', title: 'SOLID e padrões de projeto', titleEn: 'SOLID and design patterns',
      description: 'Princípios de design e o vocabulário dos padrões.',
      prerequisites: ['m5-2'],
      skills: [{ id: 'poo-solid', pt: 'SOLID e padrões de projeto', en: 'SOLID and design patterns' }],
      outline: ['Cinco princípios SOLID', 'Acoplamento e coesão', 'Strategy, Observer, Factory, Adapter, Decorator', 'KISS e YAGNI'],
      lessons: [solid],
      references: ['gof', 'refactoring'],
    },
  ],
};

