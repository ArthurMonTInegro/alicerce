var e={id:`l5-classes`,moduleId:`m5-1`,title:`Classes, objetos e encapsulamento`,titleEn:`Classes, objects and encapsulation`,summary:`Modelar entidades com estado e comportamento, proteger invariantes e escrever métodos especiais.`,minutes:40,objectives:[`Definir classes com atributos e métodos`,`Entender self e o construtor __init__`,`Proteger invariantes com encapsulamento e propriedades`,`Implementar __repr__ e __eq__`],skills:[`poo-classes`],terms:[{pt:`classe`,en:`class`,def:`Molde que define atributos e métodos de um tipo de objeto.`},{pt:`objeto / instância`,en:`object / instance`,def:`Um exemplar concreto criado a partir de uma classe.`},{pt:`atributo`,en:`attribute`,def:`Dado guardado no objeto.`,example:`AttributeError: 'Conta' object has no attribute 'saldo'`},{pt:`método`,en:`method`,def:`Função definida dentro da classe que opera sobre o objeto.`},{pt:`construtor`,en:`constructor / initializer`,def:`Método que prepara o objeto ao ser criado (__init__).`},{pt:`encapsulamento`,en:`encapsulation`,def:`Esconder detalhes internos e expor uma interface que mantém o objeto válido.`},{pt:`invariante`,en:`invariant`,def:`Regra que deve ser sempre verdadeira para o objeto (saldo nunca negativo).`}],references:[`python-tutorial`,`python-docs`,`cmu-15112`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Uma **{{classe|class}}** junta **dados** (atributos) e **comportamento** (métodos) que pertencem juntos. Cada **{{objeto|object}}** criado a partir dela tem seu próprio estado. Programação orientada a objetos (POO) é uma forma de organizar programas em torno dessas entidades.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:'```\nclass Conta:\n    def __init__(self, titular, saldo=0):\n        self.titular = titular\n        self._saldo = saldo          # "_" = detalhe interno, por convenção\n\n    def depositar(self, valor):\n        if valor <= 0:\n            raise ValueError("valor deve ser positivo")\n        self._saldo += valor\n\n    @property\n    def saldo(self):                # leitura controlada\n        return self._saldo\n```\n\n- `__init__` é chamado ao criar o objeto: `c = Conta("Ana")`.\n- `self` é o próprio objeto; `c.depositar(10)` é o mesmo que `Conta.depositar(c, 10)`.\n- **{{Encapsulamento|encapsulation}}**: quem usa a conta não mexe em `_saldo` diretamente — usa `depositar`, que garante a **{{invariante|invariant}}** (nunca depositar valor negativo).\n- **Métodos especiais** (*dunder methods*): `__repr__` (como o objeto aparece), `__eq__` (igualdade), `__len__`, `__lt__`...'},{type:`callout`,tone:`tip`,text:'Para classes que são basicamente "dados com nome", use `@dataclass` (módulo dataclasses): ele gera __init__, __repr__ e __eq__ automaticamente.'},{type:`callout`,tone:`deep`,text:'Em Python não existe "private" de verdade: `_nome` é uma convenção ("não use de fora") e `__nome` faz *name mangling*. A filosofia é *"we are all consenting adults"*. Em Java e C#, `private` é imposto pelo compilador.',title:`Privado em Python?`}]},{stage:`exemplo`,blocks:[{type:`code`,lang:`python`,code:`from dataclasses import dataclass

@dataclass
class Ponto:
    x: float
    y: float

    def distancia(self, outro: "Ponto") -> float:
        return ((self.x - outro.x) ** 2 + (self.y - outro.y) ** 2) ** 0.5

a, b = Ponto(0, 0), Ponto(3, 4)
print(a, b, a.distancia(b), a == Ponto(0, 0))`,runnable:!0}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`class Conta:
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
print(c, c.saldo)`,runnable:!0}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e5-cls-1`,kind:`code`,lang:`python`,prompt:'Complete a classe `Conta`: adicione `sacar(valor)` que lança `ValueError("saldo insuficiente")` se valor > saldo e `ValueError("valor deve ser positivo")` se valor <= 0. O saldo **nunca** pode ficar negativo.',difficulty:`facil`,skills:[`poo-classes`],hints:["O método recebe `self` e `valor`.","Valide primeiro (guard clauses), depois altere `self._saldo`."],explanation:'O método é o "porteiro" da invariante: como ninguém altera `_saldo` diretamente, basta validar aqui para garantir que o saldo nunca fica negativo.',starter:`class Conta:
    def __init__(self, titular, saldo=0):
        self.titular = titular
        self._saldo = saldo

    @property
    def saldo(self):
        return self._saldo

    def sacar(self, valor):
        self._saldo -= valor`,solution:`class Conta:
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
        self._saldo -= valor`,tests:[{name:`saque válido`,code:`c = Conta("Ana", 100)
c.sacar(30)
assert c.saldo == 70`},{name:`saldo insuficiente não altera o saldo`,code:`c = Conta("Ana", 10)
try:
    c.sacar(50)
    assert False, "deveria lançar ValueError"
except ValueError as e:
    assert str(e) == "saldo insuficiente"
assert c.saldo == 10`},{name:`valor inválido`,code:`c = Conta("Ana", 10)
try:
    c.sacar(0)
    assert False, "deveria lançar ValueError"
except ValueError as e:
    assert str(e) == "valor deve ser positivo"`}]}},{type:`exercise`,exercise:{id:`e5-cls-2`,kind:`predict`,lang:`python`,prompt:`O que é impresso?`,difficulty:`intermediario`,skills:[`poo-classes`],hints:["`contador` está na classe (compartilhado) ou em cada objeto?","Cada `__init__` incrementa o mesmo atributo de classe."],explanation:"`Robo.contador` é um **atributo de classe**, compartilhado por todas as instâncias. Depois de criar 2 robôs, vale 2; `nome` é de instância.",code:`class Robo:
    contador = 0
    def __init__(self, nome):
        self.nome = nome
        Robo.contador += 1

a = Robo("R2")
b = Robo("C3")
print(Robo.contador, a.nome, b.nome)`,answer:`2 R2 C3`}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e5-cls-desafio`,kind:`code`,lang:`python`,prompt:'Crie `class Fracao` com numerador e denominador sempre **simplificados** e com sinal no numerador. Implemente `__add__`, `__mul__`, `__eq__` e `__repr__` (formato `"3/4"`). Denominador zero lança `ZeroDivisionError`.',difficulty:`desafio`,skills:[`poo-classes`],hints:["Simplifique no `__init__` com `math.gcd` — assim a invariante vale para todo objeto.",`a/b + c/d = (ad + cb)/bd. Se o denominador for negativo, troque o sinal dos dois.`,"`__eq__` fica trivial se as frações estão sempre simplificadas."],explanation:'Normalizar no construtor faz a invariante ("sempre simplificada") valer para todo objeto; com isso, `__eq__` pode comparar campos diretamente. Sobrecarga de operadores torna o tipo natural de usar: `Fracao(1, 2) + Fracao(1, 4)`.',starter:`class Fracao:
    pass
`,solution:`from math import gcd

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
        return f"{self.num}/{self.den}"`,tests:[{name:`simplifica`,code:`assert repr(Fracao(6, 8)) == "3/4" and repr(Fracao(2, -4)) == "-1/2"`},{name:`soma e multiplica`,code:`assert Fracao(1, 2) + Fracao(1, 4) == Fracao(3, 4) and Fracao(2, 3) * Fracao(3, 4) == Fracao(1, 2)`},{name:`denominador zero`,code:`try:
    Fracao(1, 0)
    assert False
except ZeroDivisionError:
    pass`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:"**Sistema de cadastro (parte 2)**: transforme os alunos em objetos `Aluno` (dataclass) e crie uma classe `Cadastro` que encapsula o dict interno e oferece `adicionar`, `buscar`, `remover` e `listar_por_curso`. Nenhum código de fora deve acessar o dict diretamente."},{type:`project`,projectId:`p3-cadastro`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Classe = dados + comportamento; objeto = instância.
- __init__ prepara; self é o objeto.
- Encapsule para proteger invariantes.
- Métodos especiais integram o objeto à linguagem.`}]}],cards:[{id:`l5-classes#1`,front:`O que é self?`,back:`Referência ao próprio objeto sobre o qual o método foi chamado.`},{id:`l5-classes#2`,front:`Atributo de classe × de instância?`,back:`O de classe é compartilhado por todas as instâncias; o de instância pertence a cada objeto.`},{id:`l5-classes#3`,front:`Para que serve o encapsulamento?`,back:`Esconder detalhes internos e garantir que o objeto permaneça válido (invariantes).`}]};export{e as default};
//# sourceMappingURL=l5-classes-CGXpddKr.js.map