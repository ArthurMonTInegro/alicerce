var e={id:`l5-heranca-composicao`,moduleId:`m5-2`,title:`Herança, polimorfismo, abstração e composição`,titleEn:`Inheritance, polymorphism, abstraction and composition`,summary:`Reaproveitar comportamento, tratar objetos diferentes de forma uniforme e saber quando preferir composição.`,minutes:40,objectives:[`Criar subclasses e usar super()`,`Aplicar polimorfismo`,`Definir interfaces com classes abstratas`,`Escolher composição em vez de herança quando adequado`],skills:[`poo-heranca`],terms:[{pt:`herança`,en:`inheritance`,def:`Uma classe (filha) recebe atributos e métodos de outra (mãe).`},{pt:`polimorfismo`,en:`polymorphism`,def:`Usar objetos de tipos diferentes pela mesma interface.`},{pt:`abstração`,en:`abstraction`,def:`Expor o que algo faz, escondendo como.`},{pt:`composição`,en:`composition`,def:`Um objeto contém outros objetos e delega trabalho a eles ("tem um").`},{pt:`sobrescrever`,en:`override`,def:`Redefinir na subclasse um método herdado.`},{pt:`classe abstrata`,en:`abstract base class (ABC)`,def:`Classe que define métodos que as subclasses devem implementar.`}],references:[`gof`,`python-docs`,`refactoring`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:'**Herança** ("é um"): um `Cachorro` **é um** `Animal`. **Polimorfismo**: código que chama `animal.falar()` funciona com qualquer animal. **Composição** ("tem um"): um `Carro` **tem um** `Motor`. Regra prática consagrada: **prefira composição a herança** (*favor composition over inheritance*).'}]},{stage:`explicacao`,blocks:[{type:`md`,text:'- **Herança**: `class Cachorro(Animal):` herda tudo; pode **sobrescrever** métodos e chamar a versão da mãe com `super().metodo()`.\n- **Polimorfismo**: `for f in [Circulo(1), Quadrado(2)]: print(f.area())` — cada objeto responde do seu jeito à mesma mensagem.\n- **Abstração com ABC**: `from abc import ABC, abstractmethod` define uma interface; a subclasse que não implementa os métodos abstratos não pode ser instanciada.\n- **Duck typing** (Python): "se anda como pato e grasna como pato, é um pato" — basta ter o método, não precisa herdar.\n\n**Por que preferir composição?** Hierarquias profundas ficam rígidas: mudar a classe mãe afeta todas as filhas, e combinações (um pato de borracha que não voa?) explodem em subclasses. Com composição, você troca peças: um `Personagem` tem uma `Arma` — trocar de arma não exige outra classe.'},{type:`callout`,tone:`warn`,text:`Use herança quando a relação "é um" é verdadeira **e** a subclasse pode substituir a mãe em qualquer lugar sem quebrar nada (Princípio de Substituição de Liskov, o "L" do SOLID).`}]},{stage:`exemplo`,blocks:[{type:`code`,lang:`python`,code:`from abc import ABC, abstractmethod
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
    print(f.descrever())          # polimorfismo`,runnable:!0}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`# composição: o pedido TEM uma estratégia de frete, que pode ser trocada
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
print(p.total_frete())`,runnable:!0,caption:`Isso é o padrão Strategy: trocar comportamento em tempo de execução por composição.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e5-her-0`,kind:`predict`,lang:`python`,prompt:`O que este código imprime?`,code:`class Animal:
    def falar(self):
        return "..."

class Cachorro(Animal):
    def falar(self):
        return "au"

class Gato(Animal):
    pass

for a in [Cachorro(), Gato()]:
    print(a.falar())`,answer:`au
...`,difficulty:`facil`,skills:[`poo-heranca`],hints:[`Cada objeto usa o método da própria classe, se existir.`],explanation:"Polimorfismo: o mesmo chamado `falar()` executa o método da classe real de cada objeto. Gato não sobrescreve, então herda o de Animal."}},{type:`exercise`,exercise:{id:`e5-her-1`,kind:`predict`,lang:`python`,prompt:`O que é impresso?`,difficulty:`intermediario`,skills:[`poo-heranca`],hints:[`Gato sobrescreve falar. Cachorro não.`,`super().falar() chama a versão de Animal.`],explanation:`Cachorro herda falar() de Animal ("..."). Gato sobrescreve e ainda chama super(): "...miau".`,code:`class Animal:
    def falar(self):
        return "..."

class Cachorro(Animal):
    pass

class Gato(Animal):
    def falar(self):
        return super().falar() + "miau"

print(Cachorro().falar(), Gato().falar())`,answer:`... ...miau`}},{type:`exercise`,exercise:{id:`e5-her-2`,kind:`mcq`,prompt:`Num jogo, personagens podem usar espadas, arcos ou magias, e trocar durante a partida. Qual modelagem é melhor?`,difficulty:`intermediario`,skills:[`poo-heranca`],hints:[`O personagem **é uma** espada ou **tem uma** arma?`],explanation:"Composição: `Personagem` tem um atributo `arma` com uma interface comum (`atacar()`). Trocar de arma é trocar o objeto, sem explosão de subclasses.",options:[{text:`Subclasses GuerreiroComEspada, GuerreiroComArco, MagoComArco...`,feedback:`Explosão combinatória: cada combinação vira uma classe, e trocar em tempo de execução é impossível.`},{text:`Personagem com um atributo arma, e classes Espada, Arco, Magia com o método atacar()`,correct:!0,feedback:`Isso: composição + polimorfismo (padrão Strategy).`},{text:`Um único if gigante em Personagem.atacar()`,feedback:`Funciona no começo, mas cada arma nova exige mexer no mesmo método (viola o Aberto/Fechado).`},{text:`Herança múltipla de todas as armas`,feedback:`Herança múltipla aqui criaria conflitos e não permite trocar.`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e5-her-desafio`,kind:`code`,lang:`python`,prompt:'Modele notificações: uma classe abstrata `Canal` com `enviar(destino, msg) -> str`, e implementações\n`Email` (devolve `"email para <destino>: <msg>"`) e `SMS` (devolve `"sms para <destino>: <msg>"`, cortando\nmsg em 20 caracteres). Depois `Notificador(canais)` com `notificar(destino, msg)` que devolve a lista de\nresultados de todos os canais. `Canal()` não pode ser instanciado.',difficulty:`avancado`,skills:[`poo-heranca`],hints:["`class Canal(ABC)` com `@abstractmethod def enviar(...)`.","Notificador **compõe** canais: guarda a lista e chama `enviar` em cada um."],explanation:'O Notificador depende só da abstração `Canal`: novos canais (WhatsApp, push) entram sem mudar o Notificador. Isso é o Princípio da Inversão de Dependência (o "D" do SOLID).',starter:`from abc import ABC, abstractmethod

class Canal:
    pass
`,solution:`from abc import ABC, abstractmethod

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
        return [c.enviar(destino, msg) for c in self.canais]`,tests:[{name:`canais concretos`,code:`assert Email().enviar("ana", "oi") == "email para ana: oi"
assert SMS().enviar("ana", "x" * 30) == "sms para ana: " + "x" * 20`},{name:`notificador compõe`,code:`n = Notificador([Email(), SMS()])
assert n.notificar("bia", "olá") == ["email para bia: olá", "sms para bia: olá"]`},{name:`Canal é abstrato`,code:`try:
    Canal()
    assert False, "Canal não deveria ser instanciável"
except TypeError:
    pass`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:"**Sistema de cadastro (parte 3)**: crie `Pessoa` → `Aluno` e `Professor` (herança justificável) e um `Exportador` abstrato com `ExportadorCSV` e `ExportadorJSON` (composição: o cadastro **tem um** exportador)."},{type:`project`,projectId:`p3-cadastro`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Herança: "é um"; super() reaproveita.
- Polimorfismo: mesma interface, comportamentos diferentes.
- ABC define contratos.
- Prefira composição ("tem um") para flexibilidade.`}]}],cards:[{id:`l5-heranca-composicao#1`,front:`Composição × herança: qual a regra prática?`,back:`Prefira composição; use herança quando "é um" for verdadeiro e a subclasse puder substituir a mãe.`},{id:`l5-heranca-composicao#2`,front:`O que é polimorfismo?`,back:`Objetos de tipos diferentes responderem à mesma interface, cada um à sua maneira.`}]};export{e as default};
//# sourceMappingURL=l5-heranca-composicao-CKPkI5ZK.js.map