# Testes

Quatro camadas, todas rodando no CI (`.github/workflows/ci.yml`) a cada push e pull request.

| Camada | Comando | O que garante | Situação em 06/10/2026 |
|---|---|---|---|
| Tipos | `npm run typecheck` | Os 4 projetos (engine, content, api, web) compilam em modo estrito | sem erros |
| Unidade | `npm test` | Motor, integridade do conteúdo e API | 65 de 65 |
| Soluções | `npm run test:solutions` | A solução oficial passa nos testes, o código inicial não passa, e a resposta de cada "prever a saída" é a saída real | 135 exercícios executáveis, 0 problemas |
| Ponta a ponta | `npm run test:e2e` | Fluxos reais num Chromium, em desktop e celular (Pixel 7) | 53 de 53 |

## Unidade

- `packages/engine/src/engine.test.ts` (14): FSRS (intervalos crescem, lapsos reduzem estabilidade), domínio (dificuldade pesa, esquecimento rebaixa para "revisar"), grafo (ciclos, ordem topológica, estados), diagnóstico adaptativo e regras de dispensa.
- `packages/engine/src/progress.test.ts` (6): mesclagem de progresso entre aparelhos sem perder nada e saneamento de entrada hostil (`__proto__`, tamanhos, números fora da faixa).
- `packages/engine/src/tutor.test.ts` (4): o tutor offline nunca devolve a solução e reage ao tipo de erro.
- `packages/content/src/content.test.ts` (28): 15 níveis em ordem, ids únicos, todo pré-requisito existe e não há ciclos, etapas na ordem CONCEITO → REVISÃO, toda lição tem objetivos, termos em inglês e cartões, todo exercício tem dica, explicação e habilidade, múltipla escolha com exatamente uma correta e feedback em todas as opções, cada módulo tem prática de várias dificuldades, referências citadas existem e são usadas, projetos e diagnóstico consistentes, glossário sem duplicatas, dados de pesquisa com https.
- `apps/api/test/api.test.ts` (13): cabeçalhos de segurança e CSP, CSP do worker JS, CSRF, cadastro e login, validação, limite de tentativas, mesclagem de progresso, exclusão de conta em cascata, tutor offline, tutor com IA só para contas e com limite diário, 404 da API, montagem da requisição ao Claude (a solução nunca é enviada) e tratamento de recusa.

## Soluções

`scripts/verify-solutions.ts` executa, no CPython local, o mesmo `harness.py` que roda no navegador. Para exercícios de código e de correção, a solução tem de passar nos testes e o código inicial tem de falhar (senão o exercício não ensina nada). Para SQL, a consulta de referência tem de rodar e a inicial tem de dar resultado diferente. Para "prever a saída" em Python e JavaScript, o programa é executado e a saída real tem de ser exatamente a resposta cadastrada. Um exercício que falha aqui não entra no conteúdo.

## Ponta a ponta

`e2e/fluxos.spec.ts`: navegação sem erros de console, as 8 etapas de uma lição com conclusão, Python executado de verdade no laboratório, erro traduzido e explicado, JavaScript no worker isolado, diagnóstico completo, cadastro com sincronização e saída, tutor recusando entregar a resposta, 404 amigável e HTML pré-renderizado legível sem JavaScript.

`e2e/a11y.spec.ts`: axe-core com regras WCAG 2.2 AA em 15 páginas, contraste no tema escuro e ausência de rolagem horizontal no celular em todas as páginas principais.

Para rodar localmente, faça `npm run build` antes; o Playwright sobe o servidor sozinho, com banco descartável em `test-results/` e sem chave de IA.

## O que não é testado automaticamente

- O tutor com IA contra a API real (os testes usam um cliente falso que captura a requisição). Testar com chave real gasta dinheiro e depende de rede.
- Leitores de tela reais (NVDA, VoiceOver). O axe pega problemas estruturais, não a experiência completa.
- Links externos: `scripts/check-links.ts` confere as 77 referências, mas depende de rede aberta e não roda no CI.
- A imagem Docker: o Dockerfile foi validado simulando o estágio final, sem um daemon Docker disponível.
