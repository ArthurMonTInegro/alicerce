var e={id:`l10-testes-ci`,moduleId:`m10-3`,title:`Estratégia de testes e integração contínua`,titleEn:`Testing strategy and continuous integration`,summary:`A pirâmide de testes, mocks, cobertura e pipelines de CI que rodam a cada push.`,minutes:30,objectives:[`Distinguir testes de unidade, integração e ponta a ponta`,`Usar test doubles (mocks, stubs, fakes)`,`Entender o que é um pipeline de CI`,`Interpretar cobertura com senso crítico`],skills:[`eng-testes-ci`],terms:[{pt:`pirâmide de testes`,en:`test pyramid`,def:`Muitos testes de unidade, menos de integração, poucos ponta a ponta.`},{pt:`teste de integração`,en:`integration test`,def:`Testa várias partes funcionando juntas.`},{pt:`teste ponta a ponta`,en:`end-to-end (E2E) test`,def:`Testa o sistema como o usuário usa.`},{pt:`dublê de teste`,en:`test double (mock, stub, fake)`,def:`Substituto de uma dependência real em testes.`},{pt:`integração contínua`,en:`continuous integration (CI)`,def:`Rodar build e testes automaticamente a cada mudança.`},{pt:`cobertura`,en:`code coverage`,def:`Porcentagem do código executada pelos testes.`}],references:[`swe-at-google`,`github-docs`,`pytest-docs`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Em um projeto real, os testes formam uma **pirâmide**: muitos testes de **unidade** (rápidos, isolados), alguns de **integração** e poucos **ponta a ponta** (lentos, frágeis, mas próximos do usuário). A **integração contínua** roda tudo automaticamente a cada push, para que nenhum erro chegue à branch principal.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`- **Unidade**: uma função/classe, sem rede ou disco. Milissegundos.
- **Integração**: módulo + banco real (ex.: SQLite em memória), API + rotas.
- **E2E**: navegador automatizado (Playwright) clicando na interface.

**Dublês de teste**: para testar uma função que envia e-mail, injete um **fake** que só registra as mensagens. Isso só é possível se a dependência for **injetada** (Inversão de Dependência, Nível 5).

**CI** (ex.: GitHub Actions): a cada push/PR → instala dependências → lint → type check → testes → build. PR só entra com tudo verde.

**Cobertura** mostra o que **não** foi testado, mas 100% de cobertura não prova correção: um teste sem asserts "cobre" o código e não verifica nada.`},{type:`code`,lang:`text`,code:`# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.13" }
      - run: pip install -r requirements.txt
      - run: ruff check .
      - run: pytest -q`,runnable:!1,caption:`Um pipeline mínimo de CI com GitHub Actions.`}]},{stage:`exemplo`,blocks:[{type:`code`,lang:`python`,code:`class EmailFake:
    def __init__(self):
        self.enviados = []
    def enviar(self, para, texto):
        self.enviados.append((para, texto))

def cadastrar(nome, email, servico_email):
    if "@" not in email:
        raise ValueError("email inválido")
    servico_email.enviar(email, f"Bem-vindo(a), {nome}!")
    return {"nome": nome, "email": email}

fake = EmailFake()
cadastrar("Ana", "ana@ex.com", fake)
assert fake.enviados == [("ana@ex.com", "Bem-vindo(a), Ana!")]
print("teste com fake passou; nenhum e-mail real foi enviado")`,runnable:!0}]},{stage:`codigo`,blocks:[{type:`md`,text:"Esta plataforma tem sua própria estratégia de testes: unidade (motor de revisão espaçada, domínio, diagnóstico), **verificação automática de todos os exercícios** (cada solução de referência passa e cada código inicial falha), integração da API e E2E com verificação de acessibilidade. Veja `docs/TESTES.md` no repositório."}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e10-ci-1`,kind:`mcq`,prompt:`Por que ter **mais** testes de unidade do que testes ponta a ponta?`,difficulty:`facil`,skills:[`eng-testes-ci`],hints:[`Compare velocidade, estabilidade e facilidade de localizar o erro.`],explanation:`Testes de unidade são rápidos, determinísticos e apontam exatamente onde está o erro. E2E são lentos e frágeis, mas pegam problemas de integração — por isso poucos e bem escolhidos.`,options:[{text:`Porque E2E não encontram bugs`,feedback:`Encontram, mas são caros e lentos.`},{text:`Porque são rápidos, estáveis e localizam o erro com precisão`,correct:!0,feedback:`Isso.`},{text:`Porque cobertura de unidade é obrigatória por lei`,feedback:`Não há tal lei.`},{text:`Não há motivo: deve haver só E2E`,feedback:`Uma suíte só de E2E fica lenta e instável.`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e10-ci-desafio`,kind:`code`,lang:`python`,prompt:'Torne `saudacao()` testável: hoje ela usa `datetime.now()` diretamente. Mude a assinatura para `saudacao(agora)` recebendo um datetime (injeção de dependência) e devolva "Bom dia" (5h–11h), "Boa tarde" (12h–17h) ou "Boa noite" (demais).',difficulty:`intermediario`,skills:[`eng-testes-ci`],hints:[`O teste precisa controlar a hora. Como, se a função lê o relógio por conta própria?`,"Receba `agora` como parâmetro e use `agora.hour`."],explanation:`Dependências escondidas (relógio, rede, aleatoriedade) tornam código difícil de testar. Recebê-las como parâmetro permite testes determinísticos.`,starter:`from datetime import datetime

def saudacao():
    h = datetime.now().hour
    return "Bom dia" if h < 12 else "Boa tarde"
`,solution:`from datetime import datetime

def saudacao(agora):
    h = agora.hour
    if 5 <= h <= 11:
        return "Bom dia"
    if 12 <= h <= 17:
        return "Boa tarde"
    return "Boa noite"`,tests:[{name:`manhã, tarde, noite`,code:`from datetime import datetime
assert [saudacao(datetime(2026, 1, 1, h)) for h in (5, 11, 12, 17, 18, 3)] == ["Bom dia", "Bom dia", "Boa tarde", "Boa tarde", "Boa noite", "Boa noite"]`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:`**API REST (parte 2)**: adicione GitHub Actions ao projeto da API com lint, testes de unidade, testes de integração com banco em memória e badge de status no README.`},{type:`project`,projectId:`p5-api`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Pirâmide: unidade > integração > E2E.
- Dublês de teste exigem dependências injetáveis.
- CI: todo push roda lint, tipos, testes e build.
- Cobertura mostra lacunas, não prova correção.`}]}],cards:[{id:`l10-testes-ci#1`,front:`O que é integração contínua?`,back:`Rodar automaticamente build e testes a cada mudança enviada ao repositório.`},{id:`l10-testes-ci#2`,front:`Por que 100% de cobertura não garante correção?`,back:`Porque código executado por um teste não significa comportamento verificado por asserts adequados.`}]};export{e as default};
//# sourceMappingURL=l10-testes-ci-AKYlS9EI.js.map