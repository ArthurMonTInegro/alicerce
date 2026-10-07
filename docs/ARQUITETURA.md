# Arquitetura

## Visão geral

```
navegador                                         servidor (um processo Node 22)
┌───────────────────────────────────────┐        ┌─────────────────────────────────────┐
│ HTML pré-renderizado (SSR no build)   │  GET   │ Fastify                              │
│  └─ React 19 hidrata a página         │◄──────►│  ├─ arquivos estáticos (apps/web/dist)│
│ estado local (localStorage)           │        │  ├─ /api/auth/*   contas e sessões    │
│ workers:                              │  /api  │  ├─ /api/progress sincronização       │
│  ├─ Python (Pyodide/WebAssembly)      │◄──────►│  └─ /api/tutor    tutor (IA/offline) │
│  └─ JavaScript isolado                │        │ SQLite nativo (node:sqlite, WAL)     │
│ SQL: SQLite do Pyodide em memória     │        │ Claude API (opcional)                │
└───────────────────────────────────────┘        └─────────────────────────────────────┘
```

A plataforma inteira funciona sem conta: o progresso vive no navegador. A conta só sincroniza esse progresso entre aparelhos, e o tutor com IA só é oferecido para contas (para haver limite diário por pessoa).

## Stack e por que cada peça

| Peça | Escolha | Motivo |
|---|---|---|
| Linguagem | TypeScript em todo o projeto | Um só idioma de tipos entre conteúdo, motor, web e API. O Node 22 executa `.ts` direto (type stripping), então o servidor não tem etapa de build. |
| Front-end | React 19 + Vite | Hidratação de HTML pré-renderizado, divisão de código por rota pesada (editor, visualizações). |
| Roteador | próprio (`apps/web/src/lib/router.tsx`, ~100 linhas) | Evita uma dependência; suporta SSR, foco de acessibilidade a cada navegação e parâmetros de busca. |
| Editor | CodeMirror 6, carregado sob demanda | Leve, acessível por teclado, bom em celular. |
| Python | Pyodide num Web Worker | CPython real no navegador; o worker pode ser encerrado num laço infinito sem travar a página. |
| JavaScript | Worker dedicado com CSP própria | Isola o código do estudante do DOM e dos cookies. |
| Servidor | Fastify 5 | Rápido, com tipagem boa e poucos pacotes. |
| Banco | `node:sqlite` | Sem dependência nativa para compilar; um arquivo, fácil de copiar e fazer backup. |
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
  levels/*.ts      os 15 níveis; aprofundamento-a/b.ts têm as lições dos níveis 6 a 14
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
  features/runner  executores (Python, JS, SQL), harness.py, tradução de erros
  features/exercises  um componente por tipo de exercício
  features/tracer  execução passo a passo com variáveis e pilha
  features/viz     visualizações e simuladores
  features/tutor   painel do tutor
  state/           store do progresso, autenticação e sincronização
apps/web/scripts
  copy-pyodide.ts  copia só os arquivos do Pyodide necessários para public/
  prerender.ts     gera HTML de cada rota, 404, sitemap e robots
apps/api/src
  config.ts  db.ts  auth.ts  security.ts  tutor.ts  app.ts  main.ts
```

## Banco de dados

Migrações versionadas por `PRAGMA user_version` (`apps/api/src/db.ts`).

| Tabela | Colunas | Observação |
|---|---|---|
| `users` | `id`, `email` (único, sem diferenciar maiúsculas), `name`, `password_hash`, `created_at`, `plan`, `plan_expires_at` | Senha em scrypt (N=32768) com sal por usuário; plano `free` por padrão |
| `sessions` | `token_hash`, `user_id`, `created_at`, `expires_at` | Guarda só o SHA-256 do token; 30 dias |
| `progress` | `user_id`, `data` (JSON), `updated_at` | Um documento de progresso por pessoa |
| `tutor_usage` | `user_id`, `day`, `count` | Limite diário do tutor com IA |
| `plan_changes` | `user_id`, `plan`, `expires_at`, `source`, `at` | Histórico auditável de mudanças de plano |

Todas as tabelas filhas usam `ON DELETE CASCADE`, então excluir a conta apaga tudo.

## API

Toda mutação exige o cabeçalho `x-alicerce: 1` (defesa contra CSRF somada ao cookie `SameSite=Lax`). Respostas de `/api` são `no-store`.

| Método e rota | Faz | Limites |
|---|---|---|
| `GET /api/health` | Situação do servidor e se o tutor com IA está ligado | global 600/min por IP |
| `GET /api/auth/me` | `{ user, entitlements }` ou `{ user: null, entitlements: null }` | |
| `POST /api/auth/register` | Cria conta (senha de 10 a 200 caracteres) e já entra | 10 por 15 min por IP e por e-mail |
| `POST /api/auth/login` | Entra; tempo constante para e-mail inexistente | idem |
| `POST /api/auth/logout` | Sai (204) | |
| `DELETE /api/auth/me` | Exclui a conta e todo o progresso | |
| `PUT /api/progress` | Recebe o progresso local, saneia, mescla com o salvo e devolve o resultado | |
| `POST /api/tutor` | Pista do tutor; IA para contas dentro do limite diário, offline nos demais casos | 12/min por IP |

## Navegação

`/` início · `/trilha` mapa dos 15 níveis · `/nivel/:id` · `/modulo/:id` · `/licao/:id?etapa=` as 8 etapas · `/revisao` cartões para hoje · `/diagnostico` · `/laboratorio` editor livre (com link compartilhável) · `/projetos` e `/projetos/:id` · `/carreira` · `/glossario` · `/visualizacoes?v=` · `/progresso` · `/conta` · `/metodologia` · `/referencias` · `/sobre` · `/privacidade` · `/planos` preço do premium, só informativo.

Cada rota é pré-renderizada no build (191 páginas), com título, descrição, canonical e Open Graph próprios, e o React hidrata por cima. Sem JavaScript, o conteúdo das lições continua legível.

## Fluxo de um exercício de código

1. O estudante escreve no editor e roda.
2. O worker Python executa `harness.py` com o código como `main.py` e os testes do exercício como `teste.py`. Os testes enxergam `_output` (o que foi impresso) e `_source` (o código do estudante).
3. O resultado volta com saída, erro estruturado (tipo, linha, quadros só do código do estudante) e o resultado de cada teste.
4. `errors.ts` traduz o erro: o que aconteceu, por que, como investigar, como corrigir e como evitar.
5. A tentativa vira evidência de domínio (`mastery.ts`) e, se a lição terminou, os cartões entram na revisão espaçada.

O mesmo `harness.py` roda no CPython local em `scripts/verify-solutions.ts`, então a correção se comporta igual no navegador e na verificação automática.

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

`packages/engine/src/plans.ts` é a única tabela do que cada plano pode fazer. O código pergunta `can(entitlements, 'tutor-ia')`, nunca "é premium?". Recursos com status `planejado` aparecem na página de planos (`/planos`) marcados como em construção e não são concedidos. Um plano vencido volta a `free` sem perder progresso. O preço também mora lá (`price`, em centavos, para não somar dinheiro com ponto flutuante), junto com `formatBRL` e `yearlyDeal`; `PREMIUM_FOR_SALE` só vira `true` quando houver provedor de pagamento e algum recurso pago pronto, e um teste impede ligá-lo enquanto nenhum recurso pago estiver pronto. `FOREVER_FREE` lista o que é gratuito para sempre, prometido em público em `/planos`; um teste exige que todo plano tenha esses recursos.

No servidor, `apps/api/src/plans.ts` lê e muda o plano (`setPlan` grava também em `plan_changes`). Não há provedor de pagamento: quando houver, o webhook dele chama `setPlan`, e nenhum dado de cartão passa pelo Alicerce. Para testes e cortesias: `node apps/api/scripts/plano.ts <email> <free|premium> [dias]`.

## Métricas

`apps/api/src/metrics.ts` calcula, a partir do progresso já sincronizado (sem rastreamento extra), a métrica principal (aprendizado que dura: entre quem começou há 30 dias ou mais, quantos resolveram de novo uma habilidade sem ver a solução ou lembraram um cartão 30 dias depois; regra em `packages/engine/src/retention.ts`), usuários ativos por dia, semana e mês, retenção D1/D7/D30, funil (cadastro → diagnóstico → primeira lição → primeiro nível), exercícios mais difíceis e lições onde as pessoas param. Grupos com menos de 5 pessoas não são mostrados. Relatório: `node apps/api/scripts/metricas.ts [--json]`.

## Exercícios para refazer

Ver a solução de um exercício é a saída para quem travou: a lição pode ser concluída, mas o exercício entra em Revisão → Para refazer até ser resolvido sem ajuda (`exercisesToRedo` em `packages/engine/src/retention.ts`). O plano do dia e a própria lição avisam.

## Lições extras dos níveis 3 e 4

Cada módulo dos níveis 3 e 4 tem um arquivo `packages/content/src/levels/modulos/<módulo>.ts` com as lições além da primeira. Um arquivo novo é conferido antes de entrar no currículo com `node scripts/check-lessons.ts <arquivo> <módulo>`: tipos, etapas, ids, termos, cartões, referências e execução de cada exercício (a solução passa, o código inicial falha, "prever a saída" bate).
