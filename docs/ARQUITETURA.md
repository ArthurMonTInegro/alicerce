> Atualização da cópia autodidata: progresso e rascunhos têm namespaces por perfil; reinícios usam tombstones. O cliente informa expectedUserId na sincronização; divergências de sessão são rejeitadas. A demonstração no GitHub Pages continua estática.

# Arquitetura

## Visão geral

```
navegador                                         servidor (um processo Node 22)
┌───────────────────────────────────────┐        ┌─────────────────────────────────────┐
│ HTML pré-renderizado (SSR no build)   │  GET   │ Fastify                              │
│  └─ React 19 hidrata a página         │◄──────►│  ├─ arquivos estáticos (apps/web/dist)│
│ estado local (localStorage)           │        │  ├─ /api/auth/*   contas e sessões    │
│ página de execução (runner.html):     │  /api  │  ├─ /api/progress sincronização       │
│  iframe sandbox, origem opaca, sem    │◄──────►│  └─ /api/tutor    tutor (IA/offline) │
│  rede; workers de Python (Pyodide),   │        │ SQLite nativo (node:sqlite, WAL)     │
│  SQL (sqlite3 do Pyodide) e JavaScript│        │ Claude API (opcional)                │
└───────────────────────────────────────┘        └─────────────────────────────────────┘
```

Os níveis 0 e 1 funcionam sem conta: o progresso vive no navegador. A conta sincroniza esse progresso entre aparelhos. Os níveis 2 a 14 e o tutor com IA exigem conta com Premium ativo, conferido pelo servidor a cada pedido (o Premium ainda não está à venda).

## Stack e por que cada peça

| Peça | Escolha | Motivo |
|---|---|---|
| Linguagem | TypeScript em todo o projeto | Um só idioma de tipos entre conteúdo, motor, web e API. O Node 22 executa `.ts` direto (type stripping), então o servidor não tem etapa de build. |
| Front-end | React 19 + Vite | Hidratação de HTML pré-renderizado, divisão de código por rota pesada (editor, visualizações). |
| Roteador | próprio (`apps/web/src/lib/router.tsx`, ~100 linhas) | Evita uma dependência; suporta SSR, foco de acessibilidade a cada navegação e parâmetros de busca. |
| Editor | CodeMirror 6, carregado sob demanda | Leve, acessível por teclado, bom em celular. |
| Execução do código do estudante | Página própria (`runner.html`) num `<iframe sandbox="allow-scripts">` sem `allow-same-origin` | Origem opaca: o código não envia o cookie da sessão, não lê respostas da API e não enxerga o armazenamento do site. Detalhes e limites em `docs/SEGURANCA.md`. |
| Python | Pyodide num Web Worker dentro da página de execução | CPython real no navegador; num laço infinito, o site destrói o iframe sem travar a página. |
| JavaScript | Um Web Worker novo por execução, dentro da página de execução | Estado limpo a cada execução; `'unsafe-eval'` só na política da página de execução. |
| Servidor | Fastify 5 | Rápido, com tipagem boa e poucos pacotes. |
| Banco | `node:sqlite` | Sem dependência nativa para compilar; um arquivo só. Com o servidor rodando, as escritas recentes ficam no `-wal` ao lado dele, então copiar só o `.db` não é backup: use `apps/api/scripts/backup.ts` (`VACUUM INTO`, consistente com o servidor no ar). Veja [Operação](OPERACAO.md). |
| Tutor | `@anthropic-ai/sdk` atrás de uma interface | Troca de provedor sem tocar no resto; modo offline quando não há chave. |

Dependências de execução do servidor: `fastify`, `@fastify/static`, `@anthropic-ai/sdk`. Do front-end: `react`, `react-dom`, `codemirror` e seus pacotes de linguagem, `pyodide`.

## Pastas

```
packages/engine/src
  mastery.ts       domínio por habilidade (média ponderada por dificuldade e recência, com decaimento)
  fsrs.ts          revisão espaçada (FSRS: estabilidade, dificuldade, recuperabilidade)
  graph.ts         grafo de pré-requisitos: ciclos, ordem topológica, estado de cada módulo
  diagnostic.ts    teste diagnóstico adaptativo e regras de dispensa (placement)
  tutor.ts         tutor offline: perguntas socráticas a partir do erro e do exercício
  progress.ts      formato do progresso, saneamento de entrada hostil e mesclagem entre aparelhos
packages/content/src
  types.ts         o esquema do conteúdo (Lesson, Exercise, Card, Level, Module...)
  helpers.ts       construtores (lesson, md, code, t, english, deep, warn...)
  levels/*.ts      os níveis 0 e 1 completos (n00-*.ts, n01-*.ts); as lições dos níveis 2 a 14 ficam no repositório privado
  catalogo-pago.ts mapa gerado dos níveis 2 a 14 (ids, títulos, etapas, termos), sem corpo das lições
  glossary.ts      glossário PT → EN, também extraído automaticamente das lições
  diagnostic.ts    30 itens do teste diagnóstico
  projects.ts      10 projetos de portfólio
  interviews.ts    perguntas de entrevista com o que o entrevistador avalia
  references.ts    referências (livros, cursos, documentação oficial)
  research.ts      currículos de outros países e evidências de aprendizagem
apps/web/src
  pages/           uma página por rota
  components/      Layout, blocos de conteúdo, listas de termos
  features/editor  CodeMirror
  features/runner  executores (Python, JS, SQL): sandbox.ts (iframe isolado e protocolo),
                   limits.ts (teto na fronteira), workers, harness.py, tradução de erros
  features/exercises  um componente por tipo de exercício
  features/tracer  execução passo a passo com variáveis e pilha
  features/viz     visualizações e simuladores
  features/tutor   painel do tutor
  state/           store do progresso, autenticação e sincronização
apps/web/public
  runner.html, runner.js  página de execução isolada (fora do React, sem build)
apps/web/scripts
  copy-pyodide.ts  copia só os arquivos do Pyodide necessários para public/
  prerender.ts     gera HTML de cada rota, 404, sitemap e robots
apps/api/src
  config.ts  db.ts  auth.ts  security.ts  tutor.ts  app.ts  main.ts
  backup.ts  cópia consistente (VACUUM INTO), verificação e restauração do banco
apps/api/scripts
  backup.ts  restore.ts  metricas.ts  plano.ts  acesso.ts
```

## Banco de dados

Migrações versionadas por `PRAGMA user_version` (`apps/api/src/db.ts`). Num banco que já tem dados, o servidor faz um backup automático antes de aplicar migração pendente (`apps/api/src/backup.ts`) e não sobe se o backup falhar.

| Tabela | Colunas | Observação |
|---|---|---|
| `users` | `id`, `email` (único, sem diferenciar maiúsculas), `name`, `password_hash`, `created_at`, `plan`, `plan_expires_at` | Senha em scrypt (N=32768) com sal por usuário; `plan` e `plan_expires_at` são a cópia do acesso calculado pelos direitos (`free` por padrão) |
| `sessions` | `token_hash`, `user_id`, `created_at`, `expires_at` | Guarda só o SHA-256 do token; 30 dias |
| `progress` | `user_id`, `data` (JSON), `updated_at` | Um documento de progresso por pessoa |
| `tutor_usage` | `user_id`, `day`, `count` | Uso do tutor com IA por dia; a cota do mês soma os dias do mês |
| `plan_changes` | `user_id`, `plan`, `expires_at`, `source`, `at` | Histórico auditável de mudanças de plano |
| `tutor_ai_daily` | `day`, `calls`, `failures`, `input_tokens`, `output_tokens` | Totais da IA no Alicerce todo por dia (UTC), sem ligação com contas: teto global (`TUTOR_GLOBAL_DAILY_LIMIT`) e custo real (migração 4) |
| `password_resets` | `token_hash`, `user_id`, `created_at`, `expires_at`, `used_at` | Links de troca de senha: só o SHA-256 do código, 30 minutos, uso único (migração 5) |
| `subscriptions` | `id`, `user_id`, `provider`, `period`, `price`, `status`, `paid_until`, `first_paid_at`, `canceled_at`, `created_at`, `updated_at`, `withdrawal_requested_at`, `provider_ref`, `provider_subscription` | Assinaturas do Premium: `pendente`, `ativa`, `cancelada`, `recusada` ou `reembolsada`; preço em centavos (migração 5). `withdrawal_requested_at`: quando a pessoa pediu para desistir, para o direito valer mesmo que o provedor só responda depois dos 7 dias (migração 7). `provider_ref` e `provider_subscription`: os ids da cobrança aberta e da assinatura no provedor (no Asaas, o Checkout e a assinatura criada por ele; migração 8) |
| `payment_events` | `id`, `provider`, `type`, `subscription_id`, `received_at` | Eventos do provedor já aplicados: o mesmo webhook entregue duas vezes só vale uma (migração 5) |
| `access_grants` | `id`, `user_id`, `plan`, `source`, `starts_at`, `expires_at`, `revoked_at`, `created_at` | Premium concedido fora do pagamento (script de administração, testes, Premium anterior à migração 6 como `legado:<origem>`); `expires_at` nulo é sem fim (migração 6) |
| `email_outbox` | `id`, `user_id`, `kind`, `dedupe_key`, `to_address`, `data`, `created_at`, `attempts`, `next_attempt_at`, `sent_at`, `last_error` | E-mails da assinatura (compra, renovação recusada, cancelamento, reembolso), gravados na mesma transação do evento de pagamento e enviados depois, com novas tentativas; guarda os fatos em JSON, não o texto; `dedupe_key` única impede o mesmo aviso duas vezes (migração 7) |

Todas as tabelas filhas usam `ON DELETE CASCADE`, então excluir a conta apaga tudo do banco em uso (`tutor_ai_daily` não guarda nada da conta, e `payment_events` só guarda o id da assinatura). Antes de apagar, a renovação de uma assinatura em vigor é cancelada no provedor. Os backups continuam com a conta até saírem da retenção ([Operação](OPERACAO.md)).

## API

Toda mutação exige o cabeçalho `x-alicerce: 1` (defesa contra CSRF somada ao cookie `SameSite=Lax`). Respostas de `/api` são `no-store`.

| Método e rota | Faz | Limites |
|---|---|---|
| `GET /api/health` | Situação do servidor e se o tutor com IA está ligado | global 600/min por IP |
| `GET /api/auth/me` | `{ user, entitlements }` ou `{ user: null, entitlements: null }` | |
| `POST /api/auth/register` | Cria conta (senha de 10 a 200 caracteres) e já entra | 10 por 15 min por IP |
| `POST /api/auth/login` | Entra; tempo constante para e-mail inexistente | 10 por 15 min por IP e, separadamente, por e-mail |
| `POST /api/auth/logout` | Sai (204) | |
| `POST /api/auth/sessions/encerrar` | Encerra todas as sessões da conta, inclusive a atual, e limpa o cookie; devolve `{ ended }` | exige sessão |
| `DELETE /api/auth/me` | Exclui a conta e todo o progresso; corpo `{ password }` com a senha atual (400 sem senha, 403 senha errada) | 10 por 15 min por IP e por conta, somadas às do login; pedido sem senha não conta |
| `PUT /api/progress` | Recebe o progresso local, saneia, mescla com o salvo e devolve o resultado | corpo até 4 MiB (demais rotas: 1 MB); 60 por minuto por conta; sessão e limite conferidos antes de ler o corpo |
| `GET /api/content/lessons/:id` | Corpo de uma lição; as pagas só com sessão válida e Premium ativo (401 visitante, 403 gratuito, 503 sem o repositório privado) | `private, no-store` |
| `GET /api/content/cards` | Cartões de revisão de todas as lições, só com sessão válida e Premium ativo (401, 403 ou 503, como acima); os das lições gratuitas também saem no build | `private, no-store` |
| `POST /api/auth/senha/recuperar` | `{ email }`: manda o link de troca de senha; sempre 202, exista a conta ou não (503 sem envio de e-mail) | 10 por 15 min por IP e por e-mail |
| `POST /api/auth/senha/redefinir` | `{ token, password }`: troca a senha e encerra todas as sessões (204; 400 com link vencido ou usado) | 10 por 15 min por IP |
| `GET /api/assinatura` e `POST /api/assinatura`, `/cancelar`, `/desistir` | Assinatura do Premium (ver [PAGAMENTO.md](PAGAMENTO.md)); sem provedor, não há venda | exige sessão |
| `POST /api/pagamento/webhook` | Eventos do provedor; sem `x-alicerce`, só com assinatura HMAC válida | |
| `POST /api/tutor` | Pista do tutor; IA só para Premium ativo, até 20 por dia dentro de 200 por mês; tutor local nos demais casos. Contexto de aula paga (lição ou exercício) segue a regra do conteúdo: 401, 403 ou 503 | 12/min por conta (sem conta, por IP) |

## Navegação

`/` início · `/trilha` mapa dos 15 níveis · `/nivel/:id` · `/modulo/:id` · `/licao/:id?etapa=` as 8 etapas · `/revisao` cartões para hoje · `/diagnostico` · `/laboratorio` editor livre (com link compartilhável) · `/projetos` e `/projetos/:id` · `/carreira` · `/glossario` · `/visualizacoes?v=` · `/progresso` · `/conta` · `/metodologia` · `/referencias` · `/sobre` · `/privacidade` · `/planos` preço do premium, só informativo, e a seção "O que mudou" sobre a promessa anterior de trilha gratuita · `/tutor` · `/ingles` missões de inglês · `/autonomia` avaliação sem ajuda · `/evolucao` acompanhamento do projeto.

Cada rota é pré-renderizada no build (215 páginas), com título, descrição, canonical e Open Graph próprios, e o React hidrata por cima. Sem JavaScript, o conteúdo das lições gratuitas continua legível; as pagas saem como prévia.

## Fluxo de um exercício de código

1. O estudante escreve no editor e roda.
2. O site manda o código e os testes para a página de execução isolada (ver abaixo). Lá, o worker Python executa `harness.py` com o código como `main.py` e os testes do exercício como `teste.py`. Os testes enxergam `_output` (o que foi impresso) e `_source` (o código do estudante).
3. O resultado volta com saída, erro estruturado (tipo, linha, quadros só do código do estudante) e o resultado de cada teste. O site confere o formato e corta cada texto acima de 65.536 caracteres (`limits.ts`).
4. `errors.ts` traduz o erro: o que aconteceu, por que, como investigar, como corrigir e como evitar.
5. A tentativa vira evidência de domínio (`mastery.ts`) e, se a lição terminou, os cartões entram na revisão espaçada.

O mesmo `harness.py` roda no CPython local em `scripts/verify-solutions.ts`, então a correção se comporta igual no navegador e na verificação automática.

A correção no navegador serve ao estudante, não a uma certificação: os testes rodam no mesmo worker que o código dele, que consegue forjar um "passou". Uma nota que valha alguma coisa precisaria corrigir de novo fora do navegador.

## Execução isolada

```
página do site (origem do site)                 iframe sandbox="allow-scripts" (origem "null")
  sandbox.ts ◄── "pronto", valor, porta ────────  runner.js
             ── pedidos pelo MessagePort ──────►  ├─ worker Python (data:, módulo): Pyodide + harness.py
  python.ts / js.ts: pedidos com id,              └─ worker JavaScript (data:, módulo), um por execução
  tempo limite, limits.ts nas respostas
```

- `apps/web/src/features/runner/sandbox.ts` cria o iframe (`${BASE}/runner.html#<valor aleatório>`, então funciona com `BASE_PATH=/alicerce/`), aceita só a mensagem "pronto" que vem do `contentWindow` dele e devolve esse valor, fica com o `MessagePort` que vem junto e manda um pedido por vez, com id e tempo limite. Nunca escreve no `contentWindow`. Ao estourar o tempo, destrói o iframe; o próximo pedido cria outro. Python e JavaScript têm cada um o seu iframe.
- `apps/web/public/runner.html` e `runner.js` ficam fora do React e do build (script clássico, sem imports). `runner.js` se recusa a rodar fora de um iframe de origem opaca, cria o canal e o manda com o "pronto", e cria os workers a partir do texto que o site manda, como URL `data:`. Uma mensagem do worker do Python que não responda a um pedido encerra o Python.
- O código dos workers (`python.worker.ts`, `js.worker.ts`) é empacotado pelo Vite como arquivo à parte (`?worker&url`); o site o baixa como texto (`siteText`) e o manda ao iframe. Numa URL `data:`, um import de outro arquivo do site não resolve: no build, o Vite embute os imports no arquivo do worker; no servidor de desenvolvimento, os imports ficam separados: `siteText` remove os do cliente do Vite e embute no texto do worker os módulos do projeto (`/src/...`) importados com `import { ... } from`, desde que só tenham exports simples (`export const|let|var|function|class`), como o `output-limit.ts` que o `js.worker.ts` importa. Isso foi conferido à mão no `vite dev` (Python e JavaScript no laboratório), não pela suíte; um worker que passe a importar um módulo com outra forma de export precisa ser conferido de novo.
- **Cache do Pyodide.** Medido no Chromium: as requisições de um iframe de origem opaca não usam o cache HTTP, então cada iframe novo baixaria de novo os 13,5 MB do Pyodide. O site baixa os arquivos (`pyodide.mjs`, `pyodide.asm.mjs`, `pyodide.asm.wasm`, `python_stdlib.zip`, `pyodide-lock.json`), que ficam no cache HTTP dele, e os transfere ao iframe como `ArrayBuffer`. O worker importa os dois módulos de URLs `blob:` e, durante o início, responde às buscas do Pyodide pelo wasm e pela biblioteca padrão com esses bytes.
- Se o download ou o início falham, o iframe é descartado e a próxima execução tenta de novo; o status volta a "parado". Depois do início, qualquer falha de uma execução Python que não seja o tempo limite também descarta o iframe (o worker pode ter caído).
- As execuções do laboratório passam `untrusted: true` (`runPython`, `runSql` e o `Tracer`); o `Sandbox` nunca envia um pedido sem a marca para um iframe que já recebeu um com ela (recria o iframe antes, na hora do envio, dentro da fila), para que um link `#codigo=` não altere a correção dos exercícios (`sandbox.ts` e `python.ts`).
- No servidor, a página de execução tem CSP própria (`sandbox allow-scripts`, `frame-ancestors 'self'`, `connect-src 'none'`) e o `runner.js` é o único arquivo com `Cross-Origin-Resource-Policy: cross-origin`; nada em `/api` recebe CORS (`apps/api/src/security.ts`). No GitHub Pages, que não deixa configurar cabeçalhos, valem o atributo `sandbox`, a CSP em `<meta>` do `runner.html` e a conferência de origem do `runner.js`. Limites conhecidos em `docs/SEGURANCA.md`.

## Tutor

`apps/api/src/tutor.ts` define a interface `Tutor { answer(req) }` com duas implementações:

- `OfflineTutor`: usa `offlineTutor()` do motor (pistas guiadas pelo tipo de erro e pelas dicas do exercício).
- `ClaudeTutor`: monta um prompt de sistema com o enunciado, a lição e as regras pedagógicas (nunca dar a solução, responder com pergunta ou pista, um passo por vez). O código e o erro do estudante entram na mensagem do usuário, delimitados por tags e tratados como dados. A solução oficial nunca é enviada ao modelo. Em qualquer erro ou recusa, o servidor responde com o tutor offline.

## Conteúdo e páginas sob demanda

`apps/web/scripts/gen-content.ts` roda antes do build, do `dev` e do typecheck e gera em `apps/web/src/generated/` (fora do git):

- `catalog.json`: níveis, módulos, metadados de cada lição (sem texto, termos, objetivos nem cartões, mas com a lista de etapas, de exercícios e o número de cartões), habilidades e o total do glossário;
- `lessons/<id>.json`: o texto completo de cada lição;
- `cards.json` e `glossary.json`: cartões de revisão e glossário, usados só pelas páginas Revisão e Glossário.

O front-end importa conteúdo só por `apps/web/src/content.ts`. Cada página também é um pedaço de JavaScript separado: `apps/web/src/routes.tsx` diz qual página e quais dados cada rota precisa, e o roteador espera `preloadPath` antes de trocar de página, então a página nova aparece pronta. Na primeira visita, `main.tsx` faz o mesmo antes de hidratar o HTML pré-renderizado; a pré-renderização (`entry-server.tsx`) entrega tudo carregado com `seedPages`, `seedLessons` e `seed` dos recursos.

Resultado: o JavaScript inicial caiu de 1,09 MB (344 KB com gzip) para 427 KB (132 KB com gzip), e não cresce mais junto com o número de lições.

## Gamificação

`packages/engine/src/achievements.ts` calcula XP, patamar e conquistas a partir do progresso, sem estado novo. XP vem da primeira resolução correta de cada exercício (mais 50% se foi de primeira e sem dica), de lições concluídas, revisões, etapas de projeto e do diagnóstico. Revelar a resposta não dá XP, e repetir um exercício não soma de novo.

## Planos e direitos de uso

`packages/engine/src/plans.ts` é a única tabela do que cada plano pode fazer. O código pergunta `can(entitlements, 'tutor-ia')`, nunca "é premium?". Recursos com status `planejado` aparecem na página de planos (`/planos`) marcados como em construção e não são concedidos. Um plano vencido volta a `free` sem perder progresso. O preço também mora lá (`price`, em centavos, para não somar dinheiro com ponto flutuante), junto com `formatBRL` e `yearlyDeal`; `PREMIUM_FOR_SALE` só vira `true` quando houver provedor de pagamento e algum recurso pago pronto, e um teste impede ligá-lo enquanto nenhum recurso pago estiver pronto. `FREE_FEATURES` define os recursos da iniciação gratuita. Corpos das aulas Premium são entregues apenas pela API autenticada, nunca nos assets públicos. Veja ESTRATEGIA_ASSINATURA.md.

Transição da promessa anterior (trilha inteira gratuita, publicada em 07/10/2026): `packages/engine/src/transicao.ts` guarda numa constante só (`TRANSICAO_ACESSO`) as datas, a data de corte e a chave do aviso único, que vêm desligadas; `atividadeNosNiveisPagos` diz se um progresso tem atividade nos níveis 2 a 14 antes do corte. O navegador usa isso só para decidir se mostra um aviso (`apps/web/src/components/TransicaoAcesso.tsx`); o servidor, para contar contas afetadas (`apps/api/scripts/afetados-transicao.ts`). Nenhum dos dois concede acesso. Veja TRANSICAO-ACESSO.md.

No servidor, `apps/api/src/plans.ts` calcula o plano a cada pedido a partir de todos os direitos da conta: as assinaturas pagas e as concessões manuais (`access_grants`). A conta é Premium enquanto algum direito vale ("Acesso efetivo", em [PAGAMENTO.md](PAGAMENTO.md)); `users.plan` é só uma cópia do resultado, com o histórico em `plan_changes`. A assinatura (`apps/api/src/assinatura.ts`) muda só pelo webhook do provedor, e o plano é recalculado na mesma transação que registra o evento; nenhum dado de cartão passa pelo Alicerce. Existem o provedor simulado, para testes, e o adaptador do Asaas (`apps/api/src/asaas.ts`), testado só contra uma simulação local da API ([PAGAMENTO.md](PAGAMENTO.md), "Asaas"). Para testes e cortesias: `node apps/api/scripts/plano.ts <email> <free|premium> [dias]` (mexe só na concessão manual); para conferir divergências: `node apps/api/scripts/acesso.ts [email | --corrigir]`. O servidor confere as assinaturas com o provedor de tempos em tempos para recuperar webhooks perdidos (`conciliacao.ts`) e manda os e-mails da assinatura por uma fila (`avisos.ts`).

## Métricas

`apps/api/src/metrics.ts` calcula, a partir do progresso já sincronizado (sem rastreamento extra), a métrica principal (aprendizado que dura: entre quem começou há 30 dias ou mais, quantos resolveram de novo uma habilidade sem ver a solução ou lembraram um cartão 30 dias depois; regra em `packages/engine/src/retention.ts`), usuários ativos por dia, semana e mês, retenção D1/D7/D30, funil (cadastro → diagnóstico → primeira lição → primeiro nível), exercícios mais difíceis e lições onde as pessoas param. Grupos com menos de 5 pessoas não são mostrados. Relatório: `node apps/api/scripts/metricas.ts [--json]`.

## Exercícios para refazer

Ver a solução de um exercício é a saída para quem travou: a lição pode ser concluída, mas o exercício entra em Revisão → Para refazer até ser resolvido sem ajuda (`exercisesToRedo` em `packages/engine/src/retention.ts`). O plano do dia e a própria lição avisam.

## Lições extras dos níveis 3, 4 e 7 a 9

Os arquivos de lição dos níveis 2 a 14, inclusive `levels/modulos/<módulo>.ts` (lições além da primeira de cada módulo), ficam no repositório privado (ver [PREMIUM.md](PREMIUM.md)). Um arquivo novo é conferido antes de entrar no currículo com `node scripts/check-lessons.ts <arquivo> <módulo>` (o arquivo pode estar fora desta árvore): tipos, etapas, ids, termos, cartões, referências e execução de cada exercício (a solução passa, o código inicial falha, "prever a saída" bate).

## Conteúdo pago

`packages/content` tem o corpo das lições gratuitas (`publicLevels`, `publicLessons`) e o mapa do currículo inteiro (`levels`, `lessons`, `exercises`: só metadados; os níveis pagos vêm de `catalogo-pago.ts`, gerado a partir do privado). Ferramentas e servidor carregam o corpo das lições pagas com `loadCurriculum()` (`@alicerce/content/completo`), do diretório em `ALICERCE_PREMIUM_DIR` ou `<raiz>/premium`. O site nunca importa esse módulo. Detalhes, rotas e respostas em [PREMIUM.md](PREMIUM.md).
