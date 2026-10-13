var e={id:`l12-deploy-observabilidade`,moduleId:`m12-3`,title:`Deploy, CI/CD e observabilidade`,titleEn:`Deployment, CI/CD and observability`,summary:`Levar código à produção com segurança e repetibilidade, e saber o que está acontecendo lá: pipelines, configuração, logs, métricas, SLOs e incidentes.`,minutes:50,objectives:[`Montar as etapas de um pipeline de CI/CD`,`Aplicar princípios do Twelve-Factor App (configuração no ambiente, processos sem estado)`,`Calcular percentis de latência, taxa de erro e orçamento de erros de um SLO`,`Escolher uma estratégia de deploy (rolling, blue-green, canário) e de rollback`],skills:[`devops-deploy`],terms:[{pt:`integração contínua`,en:`continuous integration (CI)`,def:`Integrar e testar automaticamente cada mudança no repositório principal.`},{pt:`entrega contínua`,en:`continuous delivery (CD)`,def:`Manter o software sempre pronto para ir à produção com um clique (ou automaticamente).`},{pt:`infraestrutura como código`,en:`infrastructure as code (IaC)`,def:`Descrever servidores, redes e permissões em arquivos versionados.`,example:`Terraform`},{pt:`observabilidade`,en:`observability`,def:`Capacidade de entender o estado interno do sistema pelos sinais que ele emite: logs, métricas e traces.`},{pt:`percentil`,en:`percentile`,def:`p95 = valor abaixo do qual estão 95% das medições.`},{pt:`objetivo de nível de serviço`,en:`service level objective (SLO)`,def:`Meta de confiabilidade, como "99,9% das requisições com sucesso em 30 dias".`},{pt:`orçamento de erros`,en:`error budget`,def:`Quanto de falha o SLO permite; gastá-lo todo é sinal para frear mudanças arriscadas.`},{pt:`implantação canário`,en:`canary deployment`,def:`Liberar a versão nova para uma pequena fração do tráfego antes de todos.`}],references:[`twelve-factor`,`google-sre`,`aws-well-architected`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`"Funciona na minha máquina" não basta. **Deploy** confiável é **automatizado** (um pipeline faz sempre os mesmos passos), **reversível** (dá para voltar rápido) e **observável** (você vê, com dados, se a versão nova está saudável). Quanto menores e mais frequentes as mudanças, menor o risco de cada uma.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`### Pipeline típico

Cada *push* dispara: checkout → instalar dependências → lint e verificação de tipos → testes → build da imagem → deploy em homologação (*staging*) → testes de fumaça → deploy em produção. Se qualquer etapa falha, o pipeline para.

### Twelve-Factor, os pontos que mais importam

- **Configuração no ambiente**: URLs, chaves e flags vêm de variáveis de ambiente, não do código. O mesmo artefato roda em qualquer ambiente.
- **Processos sem estado**: nada importante fica no disco ou na memória do processo; sessões e arquivos vão para banco, cache ou armazenamento de objetos. Assim dá para **escalar horizontalmente** (mais cópias) e substituir instâncias à vontade.
- **Logs como fluxo de eventos**: escreva na saída padrão; a plataforma coleta.

### Os três sinais

- **Logs**: eventos detalhados, de preferência estruturados (JSON), com um id de requisição.
- **Métricas**: números agregados ao longo do tempo: taxa de requisições, taxa de erros, latência (em **percentis**: a média esconde os usuários que esperam muito).
- **Traces**: o caminho de uma requisição por vários serviços, com o tempo de cada trecho.

### SLO e orçamento de erros

Com SLO de 99,9% e 1 milhão de requisições no mês, o **orçamento** é 1 000 falhas. Sobrou orçamento: pode arriscar mais. Acabou: prioridade é confiabilidade. Em incidentes, primeiro **mitigue** (rollback), depois investigue, e escreva um **postmortem sem culpados**.

### Estratégias de deploy

**Rolling** (troca instâncias aos poucos), **blue-green** (duas produções, troca o tráfego de uma vez, volta na hora), **canário** (1% → 10% → 100%, comparando métricas da versão nova com a antiga).`},{type:`callout`,tone:`info`,text:"Esta plataforma tem um pipeline real em `.github/workflows/ci.yml` (tipos, testes, verificação das soluções, build e testes no navegador) e um `Dockerfile` de várias etapas que roda como usuário sem privilégios, com healthcheck em `/api/health`.",title:`Veja um exemplo de verdade`}]},{stage:`exemplo`,blocks:[{type:`code`,lang:`text`,code:`# .github/workflows/ci.yml (resumido)
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
      - run: npm run build`,runnable:!1,caption:`Cada passo só roda se o anterior passou. O mesmo arquivo serve de documentação de como montar o projeto.`}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`import json, math

logs = [
    '{"rota": "/api/tarefas", "status": 200, "ms": 35}',
    '{"rota": "/api/tarefas", "status": 200, "ms": 41}',
    '{"rota": "/api/tarefas", "status": 500, "ms": 1200}',
    '{"rota": "/api/tarefas", "status": 200, "ms": 38}',
    '{"rota": "/api/tarefas", "status": 200, "ms": 950}',
]
eventos = [json.loads(l) for l in logs]
lat = sorted(e["ms"] for e in eventos)
media = sum(lat) / len(lat)
p95 = lat[math.ceil(0.95 * len(lat)) - 1]
erros = sum(e["status"] >= 500 for e in eventos) / len(eventos)
print(f"média {media:.0f} ms | p95 {p95} ms | erros {erros:.0%}")`,runnable:!0,caption:`Logs estruturados viram métricas com poucas linhas. Repare como a média esconde a cauda lenta.`},{type:`callout`,tone:`english`,text:`On-call vocabulary: *"page"* (alert someone), *"incident"*, *"mitigate"*, *"roll back"*, *"root cause"*, *"blameless postmortem"*, *"action items"*, *"runbook"*.`,title:`English corner`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e12-deploy-0`,kind:`mcq`,prompt:`Onde, segundo o Twelve-Factor App, deve ficar a URL do banco de dados de produção?`,difficulty:`facil`,skills:[`devops-deploy`],hints:[`O mesmo build precisa rodar em desenvolvimento, homologação e produção.`],explanation:`Em **variáveis de ambiente** (ou num cofre de segredos que as injeta). Assim o artefato é idêntico entre ambientes e segredos não vão para o repositório.`,options:[{text:`Numa constante no código`,feedback:`Exigiria um build por ambiente e exporia segredos no repositório.`},{text:`Numa variável de ambiente`,correct:!0,feedback:`Isso: configuração separada do código.`},{text:`Num arquivo dentro da imagem Docker`,feedback:`A imagem deveria ser a mesma em todos os ambientes.`},{text:`No README`,feedback:`Documentação não é configuração, e o segredo ficaria público.`}]}},{type:`exercise`,exercise:{id:`e12-deploy-1`,kind:`code`,lang:`python`,prompt:'Escreva `orcamento(slo, total)`, o número de falhas permitidas (inteiro, arredondado) para `total` requisições,\ne `situacao(slo, total, falhas)` que devolve `"ok"` se as falhas forem até metade do orçamento,\n`"atenção"` se passarem da metade mas não do orçamento, e `"congelar"` se passarem do orçamento.',difficulty:`intermediario`,skills:[`devops-deploy`],hints:[`Falhas permitidas = total × (1 − slo).`,`Contas com float como 1 − 0.999 têm erro de arredondamento: use round().`],explanation:`Times de SRE usam o orçamento de erros para equilibrar velocidade e estabilidade: "congelar" significa pausar lançamentos arriscados até a confiabilidade voltar.`,starter:`def orcamento(slo, total):
    pass

def situacao(slo, total, falhas):
    pass
`,solution:`def orcamento(slo, total):
    return round(total * (1 - slo))

def situacao(slo, total, falhas):
    b = orcamento(slo, total)
    if falhas > b:
        return "congelar"
    if falhas > b / 2:
        return "atenção"
    return "ok"`,tests:[{name:`orçamento`,code:`assert orcamento(0.999, 1_000_000) == 1000
assert orcamento(0.99, 5000) == 50`},{name:`situações`,code:`assert situacao(0.999, 1_000_000, 300) == "ok"
assert situacao(0.999, 1_000_000, 700) == "atenção"
assert situacao(0.999, 1_000_000, 1001) == "congelar"`},{name:`limites`,code:`assert situacao(0.99, 5000, 25) == "ok"
assert situacao(0.99, 5000, 50) == "atenção"`}]}},{type:`exercise`,exercise:{id:`e12-deploy-2`,kind:`parsons`,lang:`text`,prompt:`Ordene as etapas de um pipeline de CI/CD.`,lines:[`checkout do código`,`instalar dependências`,`lint e verificação de tipos`,`testes automatizados`,`build da imagem`,`deploy em homologação`,`testes de fumaça`,`deploy em produção`],difficulty:`facil`,skills:[`devops-deploy`],hints:[`Verificações baratas e rápidas vêm primeiro.`,`Produção é sempre o último passo, depois de validar em homologação.`],explanation:`Falhar cedo é mais barato: lint e tipos levam segundos; testes, minutos; um deploy quebrado em produção custa usuários.`}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e12-deploy-desafio`,kind:`code`,lang:`python`,prompt:'Automatize a decisão de um **deploy canário**. `decidir(base, canario)` recebe duas listas de requisições, cada uma\numa tupla `(status, ms)`, e devolve:\n\n- `"reverter"` se a taxa de erro (status >= 500) do canário for maior que a da base **mais 1 ponto percentual**,\n  ou se o p95 de latência do canário for mais de 20% maior que o da base;\n- `"promover"` caso contrário.\n\nUse p95 pelo método do **posto mais próximo**: ordene e pegue o elemento de índice `ceil(0,95 × n) − 1`.',difficulty:`desafio`,skills:[`devops-deploy`],hints:[`Escreva funções auxiliares taxa_erro(reqs) e p95(reqs).`,`"1 ponto percentual" é somar 0.01 à taxa da base.`,`"20% maior" é comparar com p95_base × 1.2.`],explanation:`Sistemas de entrega progressiva (Argo Rollouts, Flagger, o canário do Google Cloud) fazem exatamente essa comparação estatística, de forma contínua, e revertem sozinhos.`,starter:`import math

def decidir(base, canario):
    return "promover"
`,solution:`import math

def taxa_erro(reqs):
    return sum(1 for s, _ in reqs if s >= 500) / len(reqs)

def p95(reqs):
    lat = sorted(ms for _, ms in reqs)
    return lat[math.ceil(0.95 * len(lat)) - 1]

def decidir(base, canario):
    if taxa_erro(canario) > taxa_erro(base) + 0.01:
        return "reverter"
    if p95(canario) > p95(base) * 1.2:
        return "reverter"
    return "promover"`,tests:[{name:`saudável`,code:`base = [(200, 50)] * 99 + [(500, 60)]
can = [(200, 52)] * 99 + [(500, 61)]
assert decidir(base, can) == "promover"`},{name:`mais erros`,code:`base = [(200, 50)] * 100
can = [(200, 50)] * 97 + [(503, 50)] * 3
assert decidir(base, can) == "reverter"`},{name:`mais lento`,code:`base = [(200, 100)] * 100
can = [(200, 100)] * 90 + [(200, 400)] * 10
assert decidir(base, can) == "reverter"`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:"**Mini-projeto**: no seu projeto full-stack, crie um pipeline no GitHub Actions com tipos, testes e build; adicione um endpoint `/health`; troque todo valor sensível por variável de ambiente (com um `.env.example` documentado); e escreva logs estruturados em JSON com um id por requisição."}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Pipeline: verificações rápidas primeiro; produção por último; tudo automatizado.
- Config no ambiente; processos sem estado; logs na saída padrão.
- Logs, métricas (percentis!) e traces.
- SLO → orçamento de erros → decide o ritmo de mudanças.
- Rolling, blue-green, canário; mitigar antes de investigar; postmortem sem culpados.`},{type:`callout`,tone:`deep`,text:`Leia os capítulos "Service Level Objectives" e "Postmortem Culture" do livro de SRE do Google (gratuito on-line) e o site do Twelve-Factor App inteiro: é curto e muda a forma como se escreve software para a nuvem.`,title:`Aprofundando`}]}],cards:[{id:`l12-deploy-observabilidade#1`,front:`O que é orçamento de erros?`,back:`A quantidade de falhas permitida pelo SLO num período; quando acaba, a prioridade vira confiabilidade.`},{id:`l12-deploy-observabilidade#2`,front:`Por que usar percentis em vez da média para latência?`,back:`Porque a média esconde a cauda: poucos usuários muito lentos somem na média.`},{id:`l12-deploy-observabilidade#3`,front:`Os três sinais de observabilidade?`,back:`Logs, métricas e traces.`},{id:`l12-deploy-observabilidade#4`,front:`O que é um deploy canário?`,back:`Liberar a versão nova para uma fração pequena do tráfego e comparar com a antiga antes de liberar para todos.`}]};export{e as default};
//# sourceMappingURL=l12-deploy-observabilidade-DpVnUNCW.js.map