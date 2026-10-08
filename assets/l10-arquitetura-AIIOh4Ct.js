var e={id:`l10-arquitetura`,moduleId:`m10-4`,title:`Arquitetura de software, decisões e processos ágeis`,titleEn:`Software architecture, decisions and agile processes`,summary:`Organizar o código em camadas com dependências na direção certa, decidir entre monólito e microsserviços, registrar decisões e trabalhar em ciclos curtos.`,minutes:45,objectives:[`Organizar um sistema em camadas e explicar a regra de dependência`,`Comparar monólito, monólito modular e microsserviços`,`Escrever um registro de decisão de arquitetura (ADR)`,`Escrever histórias de usuário com critérios de aceitação`],skills:[`eng-arquitetura`],terms:[{pt:`arquitetura em camadas`,en:`layered architecture`,def:`Divisão do sistema em camadas com responsabilidades separadas.`},{pt:`inversão de dependência`,en:`dependency inversion`,def:`O núcleo define interfaces; detalhes (banco, web) as implementam.`},{pt:`monólito`,en:`monolith`,def:`Uma aplicação implantada como uma unidade só.`},{pt:`microsserviços`,en:`microservices`,def:`Sistema dividido em serviços pequenos, implantados separadamente, que conversam pela rede.`},{pt:`registro de decisão de arquitetura`,en:`architecture decision record (ADR)`,def:`Documento curto com contexto, decisão e consequências.`},{pt:`história de usuário`,en:`user story`,def:`"Como <quem>, quero <o quê>, para <por quê>."`},{pt:`critério de aceitação`,en:`acceptance criteria`,def:`Condições verificáveis para considerar a história pronta.`},{pt:`dívida técnica`,en:`technical debt`,def:`Custo futuro de um atalho tomado hoje.`}],references:[`ddia`,`swe-at-google`,`pragmatic-programmer`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`**Arquitetura** são as decisões difíceis de mudar depois: como o sistema se divide, quem depende de quem, onde ficam os dados. A boa arquitetura mantém as **regras de negócio** independentes dos **detalhes** (framework web, banco de dados, provedor de nuvem), para que os detalhes possam mudar sem reescrever o coração do sistema.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`### A regra de dependência

Em camadas como **apresentação → aplicação → domínio** (com **infraestrutura** implementando interfaces do domínio), as dependências apontam **para dentro**: o domínio não importa nada de web nem de banco. Se o serviço precisa salvar algo, ele depende de uma **interface** (\`RepositorioDePedidos\`), e a infraestrutura fornece a implementação (PostgreSQL, ou uma versão em memória nos testes).

### Monólito × microsserviços

| | Monólito (modular) | Microsserviços |
|---|---|---|
| Implantação | uma unidade | cada serviço separado |
| Chamadas entre partes | função (nanossegundos) | rede (milissegundos, pode falhar) |
| Transações | do banco, simples | distribuídas, difíceis |
| Quando faz sentido | quase sempre no começo | muitos times, partes com escala muito diferente |

Um **monólito modular** (módulos bem separados, um deploy só) dá a maior parte dos benefícios sem o custo da rede.

### Registrar decisões

Um **ADR** tem quatro partes: **título**, **contexto** (forças em jogo), **decisão** e **consequências** (o que fica melhor e o que fica pior). Daqui a um ano, ninguém lembra por que escolheu SQLite em vez de PostgreSQL; o ADR lembra.

### Processo

Métodos ágeis entregam em **ciclos curtos** com retorno frequente. **Scrum** organiza o trabalho em *sprints* com papéis e cerimônias; **Kanban** limita o trabalho em andamento e otimiza o fluxo. Ambos dependem de **histórias de usuário** pequenas e com **critérios de aceitação** testáveis.`},{type:`code`,lang:`text`,code:`# ADR 0003 — Usar SQLite embutido no lugar de PostgreSQL

## Contexto
Projeto educacional com uma instância, poucos milhares de usuários, equipe de uma pessoa.
Precisamos de backup simples e zero serviços extras para instalar.

## Decisão
Usar SQLite (node:sqlite) com WAL, um arquivo em volume persistente.

## Consequências
+ Instalação e backup triviais; nenhuma dependência nativa.
- Escrita concorrente limitada a uma máquina; migrar para PostgreSQL se houver várias instâncias.`,runnable:!1,caption:`Um ADR real cabe numa tela. Esta plataforma tomou exatamente essa decisão.`}]},{stage:`exemplo`,blocks:[{type:`code`,lang:`python`,code:`from typing import Protocol

class RepositorioDePedidos(Protocol):     # interface definida pelo domínio
    def salvar(self, pedido: dict) -> None: ...
    def do_cliente(self, cliente: str) -> list: ...

class ServicoDePedidos:                     # domínio: não sabe que banco existe
    def __init__(self, repo: RepositorioDePedidos):
        self.repo = repo

    def criar(self, cliente, itens):
        if not itens:
            raise ValueError("pedido sem itens")
        if len(self.repo.do_cliente(cliente)) >= 3:
            raise ValueError("limite de 3 pedidos abertos")
        pedido = {"cliente": cliente, "itens": itens}
        self.repo.salvar(pedido)
        return pedido

class RepoEmMemoria:                        # infraestrutura (aqui, para testes)
    def __init__(self):
        self.pedidos = []
    def salvar(self, pedido):
        self.pedidos.append(pedido)
    def do_cliente(self, cliente):
        return [p for p in self.pedidos if p["cliente"] == cliente]

servico = ServicoDePedidos(RepoEmMemoria())
for _ in range(3):
    servico.criar("ana", ["livro"])
try:
    servico.criar("ana", ["caneta"])
except ValueError as e:
    print("regra aplicada:", e)`,runnable:!0}]},{stage:`codigo`,blocks:[{type:`callout`,tone:`english`,text:`Useful phrases in design discussions: *"What problem are we solving?"*, *"What are the trade-offs?"*, *"Let's write an ADR for this"*, *"This couples X to Y"*, *"Can we defer this decision?"*, *"You aren't gonna need it (YAGNI)"*.`,title:`English corner`},{type:`md`,text:`**História de usuário com critérios de aceitação** (formato Dado/Quando/Então):

> Como **estudante**, quero **revisar cartões vencidos** para **não esquecer o que já aprendi**.
>
> - **Dado** que tenho 5 cartões vencidos, **quando** abro a Revisão, **então** vejo o primeiro e o contador "5 para hoje".
> - **Dado** que avaliei um cartão como "Errei", **então** ele volta ainda hoje.
> - **Dado** que não tenho cartões vencidos, **então** vejo quando vence o próximo.

Cada critério vira um teste.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e10-arq-0`,kind:`mcq`,prompt:`Uma startup de 3 pessoas vai lançar o primeiro produto. Qual arquitetura é a escolha mais sensata para começar?`,difficulty:`facil`,skills:[`eng-arquitetura`],hints:[`Quantos times precisam implantar de forma independente?`,`Microsserviços trocam simplicidade por independência entre times.`],explanation:`Um **monólito modular**: um deploy, chamadas locais, transações simples, e módulos bem separados que podem virar serviços se (e quando) houver motivo.`,options:[{text:`Vinte microsserviços, um por entidade`,feedback:`Custo de rede, deploy e observabilidade enorme para 3 pessoas.`},{text:`Um monólito modular`,correct:!0,feedback:`Isso: simples agora, divisível depois.`},{text:`Funções serverless sem nenhuma organização`,feedback:`Sem módulos, a complexidade só muda de lugar.`},{text:`Tanto faz, arquitetura não importa no começo`,feedback:`Importa: separar responsabilidades desde cedo barateia mudanças.`}]}},{type:`exercise`,exercise:{id:`e10-arq-1`,kind:`code`,lang:`python`,prompt:'Verifique a **regra de dependência**. Receba `camadas` (lista do mais **interno** para o mais **externo**, ex.: `["dominio", "aplicacao", "web"]`)\ne `imports` (lista de pares `(modulo_que_importa, modulo_importado)`, onde o nome do módulo é igual ao da camada).\nDevolva a lista de pares que **violam** a regra (uma camada importando outra **mais externa**), na ordem em que aparecem.',difficulty:`intermediario`,skills:[`eng-arquitetura`],hints:[`Dê a cada camada um nível: a posição dela na lista.`,`Violação: nível de quem importa < nível de quem é importado.`],explanation:`Ferramentas como import-linter (Python) e dependency-cruiser (JavaScript) fazem essa checagem automaticamente no CI, impedindo que a arquitetura apodreça aos poucos.`,starter:`def violacoes(camadas, imports):
    return []
`,solution:`def violacoes(camadas, imports):
    nivel = {c: i for i, c in enumerate(camadas)}
    return [(a, b) for a, b in imports if nivel[a] < nivel[b]]
`,tests:[{name:`sem violação`,code:`assert violacoes(["dominio", "aplicacao", "web"], [("web", "aplicacao"), ("aplicacao", "dominio"), ("web", "dominio")]) == []`},{name:`domínio importando web`,code:`assert violacoes(["dominio", "aplicacao", "web"], [("dominio", "web"), ("web", "dominio"), ("aplicacao", "web")]) == [("dominio", "web"), ("aplicacao", "web")]`}]}},{type:`exercise`,exercise:{id:`e10-arq-2`,kind:`parsons`,lang:`text`,prompt:`Coloque as seções de um ADR na ordem usual.`,lines:[`# Título da decisão`,`## Status (proposta, aceita, substituída)`,`## Contexto`,`## Decisão`,`## Consequências`],difficulty:`facil`,skills:[`eng-arquitetura`],hints:[`Primeiro se explica o problema, depois a escolha, depois o efeito dela.`],explanation:`Contexto antes da decisão: quem lê no futuro precisa entender as forças em jogo para julgar se a decisão ainda vale.`}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e10-arq-desafio`,kind:`code`,lang:`python`,prompt:'Para trocar o banco sem mudar as regras, o serviço depende de uma interface.\nImplemente `ServicoDeContas(repo)` com `transferir(origem, destino, valor)`:\n\n- `valor` deve ser positivo, senão `ValueError("valor inválido")`;\n- a origem precisa ter saldo suficiente, senão `ValueError("saldo insuficiente")`;\n- use apenas `repo.saldo(conta)` e `repo.definir_saldo(conta, novo)`.\n\nImplemente também `RepoEmMemoria(saldos)` (recebe um dicionário inicial) para os testes.',difficulty:`desafio`,skills:[`eng-arquitetura`],hints:[`O serviço não deve tocar no dicionário diretamente: só nos dois métodos do repositório.`,`Valide tudo antes de alterar qualquer saldo.`],explanation:`Como o serviço só conhece a interface, o mesmo código roda com um repositório em memória (testes rápidos) ou com PostgreSQL (produção, dentro de uma transação). Validar antes de alterar evita deixar o sistema pela metade.`,starter:`class RepoEmMemoria:
    def __init__(self, saldos):
        pass

class ServicoDeContas:
    def __init__(self, repo):
        self.repo = repo

    def transferir(self, origem, destino, valor):
        pass
`,solution:`class RepoEmMemoria:
    def __init__(self, saldos):
        self.saldos = dict(saldos)

    def saldo(self, conta):
        return self.saldos.get(conta, 0)

    def definir_saldo(self, conta, novo):
        self.saldos[conta] = novo

class ServicoDeContas:
    def __init__(self, repo):
        self.repo = repo

    def transferir(self, origem, destino, valor):
        if valor <= 0:
            raise ValueError("valor inválido")
        s = self.repo.saldo(origem)
        if s < valor:
            raise ValueError("saldo insuficiente")
        self.repo.definir_saldo(origem, s - valor)
        self.repo.definir_saldo(destino, self.repo.saldo(destino) + valor)`,tests:[{name:`transferência`,code:`r = RepoEmMemoria({"a": 100, "b": 5})
ServicoDeContas(r).transferir("a", "b", 30)
assert r.saldo("a") == 70 and r.saldo("b") == 35`},{name:`saldo insuficiente não altera nada`,code:`r = RepoEmMemoria({"a": 10})
try:
    ServicoDeContas(r).transferir("a", "b", 30)
    assert False
except ValueError as e:
    assert str(e) == "saldo insuficiente"
assert r.saldo("a") == 10 and r.saldo("b") == 0`},{name:`valor inválido`,code:`r = RepoEmMemoria({"a": 10})
try:
    ServicoDeContas(r).transferir("a", "b", 0)
    assert False
except ValueError as e:
    assert str(e) == "valor inválido"`},{name:`usa só a interface`,code:`class Espiao:
    def __init__(self):
        self.chamadas = []
        self.s = {"a": 50}
    def saldo(self, c):
        self.chamadas.append("saldo")
        return self.s.get(c, 0)
    def definir_saldo(self, c, v):
        self.chamadas.append("definir")
        self.s[c] = v
e = Espiao()
ServicoDeContas(e).transferir("a", "b", 20)
assert e.s == {"a": 30, "b": 20}`}]}}]},{stage:`projeto`,blocks:[{type:`project`,projectId:`p9-fullstack`},{type:`md`,text:`No **projeto full-stack**, escreva pelo menos dois ADRs (escolha do banco e da forma de autenticação), organize o back-end em camadas com a regra de dependência e transforme as funcionalidades em histórias de usuário com critérios de aceitação antes de programar.`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Dependências apontam para dentro: domínio não conhece web nem banco.
- Monólito modular primeiro; microsserviços quando há motivo concreto (times, escala).
- ADR: contexto, decisão, consequências.
- História de usuário + critérios Dado/Quando/Então; cada critério vira teste.`},{type:`callout`,tone:`deep`,text:"Leia o capítulo sobre trade-offs de *Designing Data-Intensive Applications* e o capítulo de documentação de *Software Engineering at Google*. Depois, leia os ADRs de algum projeto open source grande: muitos ficam na pasta `docs/adr`.",title:`Aprofundando`}]}],cards:[{id:`l10-arquitetura#1`,front:`O que diz a regra de dependência?`,back:`Camadas internas (domínio) não dependem das externas (web, banco); as dependências apontam para dentro.`},{id:`l10-arquitetura#2`,front:`Quatro partes de um ADR?`,back:`Título, contexto, decisão e consequências (geralmente também o status).`},{id:`l10-arquitetura#3`,front:`Quando microsserviços fazem sentido?`,back:`Quando há vários times que precisam implantar de forma independente ou partes com necessidades de escala muito diferentes.`},{id:`l10-arquitetura#4`,front:`Formato de uma história de usuário?`,back:`"Como <quem>, quero <o quê>, para <por quê>", com critérios de aceitação testáveis.`}]};export{e as default};
//# sourceMappingURL=l10-arquitetura-AIIOh4Ct.js.map