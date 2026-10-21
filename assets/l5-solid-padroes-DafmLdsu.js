var e={id:`l5-solid-padroes`,moduleId:`m5-3`,title:`SOLID e padrões de projeto`,titleEn:`SOLID and design patterns`,summary:`Cinco princípios para código flexível e os padrões mais usados no dia a dia.`,minutes:35,objectives:[`Explicar os cinco princípios SOLID com exemplos`,`Reconhecer Strategy, Observer, Factory, Adapter e Decorator`,`Evitar aplicar padrões sem necessidade`],skills:[`poo-solid`],terms:[{pt:`padrão de projeto`,en:`design pattern`,def:`Solução reutilizável e nomeada para um problema recorrente de design.`},{pt:`acoplamento`,en:`coupling`,def:`O quanto um módulo depende de outro. Baixo acoplamento é melhor.`},{pt:`coesão`,en:`cohesion`,def:`O quanto as partes de um módulo pertencem juntas. Alta coesão é melhor.`},{pt:`responsabilidade única`,en:`single responsibility`,def:`Cada módulo deve ter um único motivo para mudar.`},{pt:`injeção de dependência`,en:`dependency injection`,def:`Passar as dependências de fora em vez de criá-las dentro.`}],references:[`gof`,`refactoring`,`swe-at-google`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`**SOLID** são cinco princípios (popularizados por Robert C. Martin) para manter o código fácil de mudar. **Padrões de projeto** (catalogados no livro da "Gang of Four", 1994) são soluções nomeadas para problemas recorrentes — e um **vocabulário** comum entre programadores.`}]},{stage:`explicacao`,blocks:[{type:`table`,head:[`Princípio`,`Em uma frase`,`Sinal de violação`],rows:[[`S — Single Responsibility`,`cada classe tem um único motivo para mudar`,`classe "Relatorio" que calcula, formata e envia e-mail`],[`O — Open/Closed`,`aberto para extensão, fechado para modificação`,`todo tipo novo exige editar um if/elif gigante`],[`L — Liskov Substitution`,`subtipos substituem o tipo base sem surpresas`,`Quadrado herda de Retangulo e quebra set_largura`],[`I — Interface Segregation`,`interfaces pequenas e específicas`,`classe obrigada a implementar métodos que não usa`],[`D — Dependency Inversion`,`dependa de abstrações, não de detalhes`,`regra de negócio cria a conexão do banco por dentro`]]},{type:`md`,text:`**Padrões que você vai ver toda semana**:

- **Strategy**: trocar um algoritmo por composição (o frete da lição anterior).
- **Observer**: objetos se inscrevem para ser avisados de eventos (eventos do DOM, \`addEventListener\`).
- **Factory**: uma função/classe decide qual objeto criar.
- **Adapter**: adapta uma interface existente para a que seu código espera.
- **Decorator**: acrescenta comportamento envolvendo um objeto/função (os \`@decoradores\` do Python são uma forma disso).`},{type:`callout`,tone:`warn`,text:`Padrões são ferramentas, não metas. Aplicar padrões "porque sim" cria complexidade desnecessária. Princípio KISS (*keep it simple*) e YAGNI (*you aren't gonna need it*).`}]},{stage:`exemplo`,blocks:[{type:`code`,lang:`python`,code:`# Observer simples
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
nova_matricula.emitir("Ana")`,runnable:!0}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`# Decorator: medir tempo de qualquer função sem alterá-la
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

print(soma_ate(1_000_000))`,runnable:!0}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e5-solid-1`,kind:`mcq`,prompt:"Uma classe `Pedido` calcula o total, gera o PDF da nota e envia o e-mail ao cliente. Que princípio ela viola mais diretamente?",difficulty:`facil`,skills:[`poo-solid`],hints:[`Quantos motivos diferentes para mudar essa classe existem?`],explanation:`Regras de preço, formato do PDF e provedor de e-mail mudam por motivos diferentes: viola Single Responsibility. Separe em calculadora, gerador de nota e serviço de e-mail.`,options:[{text:`Single Responsibility`,correct:!0,feedback:`Isso: três responsabilidades, três motivos para mudar.`},{text:`Liskov Substitution`,feedback:`Não há herança envolvida.`},{text:`Interface Segregation`,feedback:`Trata de interfaces grandes demais impostas a quem as implementa.`},{text:`Nenhum`,feedback:`Pense em quantas equipes poderiam pedir mudanças nessa classe.`}]}},{type:`exercise`,exercise:{id:`e5-solid-2`,kind:`mcq`,prompt:"Você usa uma biblioteca de pagamentos com o método `charge(amount_cents)`, mas seu sistema espera objetos com `pagar(valor_reais)`. Qual padrão resolve?",difficulty:`intermediario`,skills:[`poo-solid`],hints:[`Você não pode mudar a biblioteca; quer **adaptar** a interface dela.`],explanation:"Adapter: uma classe com `pagar(valor)` que converte para centavos e chama `charge`. Seu código continua dependendo da sua interface.",options:[{text:`Observer`,feedback:`Observer trata de notificação de eventos.`},{text:`Adapter`,correct:!0,feedback:`Isso: adapta uma interface existente à esperada.`},{text:`Singleton`,feedback:`Singleton garante uma única instância — não resolve a incompatibilidade.`},{text:`Factory`,feedback:`Factory decide o que criar, não adapta interfaces.`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e5-solid-desafio`,kind:`code`,lang:`python`,prompt:'Refatore aplicando Open/Closed: a função `desconto(tipo, valor)` tem um if/elif por tipo de cliente. Crie um\ndicionário de **estratégias** `ESTRATEGIAS` (tipo → função) e uma função `registrar(tipo, f)` que permite\nadicionar novos tipos **sem editar** `desconto`. Tipos iniciais: "comum" (0%), "estudante" (50%), "vip" (20%).\nTipo desconhecido lança `KeyError`.',difficulty:`avancado`,skills:[`poo-solid`],hints:[`Cada estratégia é uma função valor → valor com desconto.`,"`desconto` só busca a estratégia no dict e aplica."],explanation:"Com um registro de estratégias, adicionar um tipo é registrar uma função — `desconto` nunca mais precisa ser editada (aberta para extensão, fechada para modificação).",starter:`def desconto(tipo, valor):
    if tipo == "comum":
        return valor
    elif tipo == "estudante":
        return valor * 0.5
    elif tipo == "vip":
        return valor * 0.8`,solution:`ESTRATEGIAS = {
    "comum": lambda v: v,
    "estudante": lambda v: v * 0.5,
    "vip": lambda v: v * 0.8,
}

def registrar(tipo, f):
    ESTRATEGIAS[tipo] = f

def desconto(tipo, valor):
    return ESTRATEGIAS[tipo](valor)`,tests:[{name:`tipos iniciais`,code:`assert desconto("estudante", 100) == 50 and desconto("vip", 100) == 80 and desconto("comum", 100) == 100`},{name:`extensão sem editar`,code:`registrar("funcionario", lambda v: v * 0.7)
assert desconto("funcionario", 100) == 70`},{name:`desconhecido`,code:`try:
    desconto("alien", 1)
    assert False
except KeyError:
    pass`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:`**Revisão de design**: pegue o sistema de cadastro e procure uma violação de cada princípio SOLID (se houver). Escreva um parágrafo por princípio — em inglês, se quiser praticar: *"The class X violates SRP because..."*.`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- SOLID: responsabilidade única, aberto/fechado, Liskov, segregação de interface, inversão de dependência.
- Padrões: Strategy, Observer, Factory, Adapter, Decorator.
- Baixo acoplamento, alta coesão. KISS e YAGNI.`}]}],cards:[{id:`l5-solid-padroes#1`,front:`O que diz o Open/Closed Principle?`,back:`Módulos devem ser abertos para extensão e fechados para modificação.`},{id:`l5-solid-padroes#2`,front:`Para que serve o padrão Observer?`,back:`Para notificar vários interessados quando um evento acontece, sem acoplá-los a quem emite.`},{id:`l5-solid-padroes#3`,front:`O que significa YAGNI?`,back:`"You aren't gonna need it": não implemente o que ainda não é necessário.`}]};export{e as default};
//# sourceMappingURL=l5-solid-padroes-DafmLdsu.js.map