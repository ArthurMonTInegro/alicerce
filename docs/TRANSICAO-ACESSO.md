# Transição de acesso: da trilha inteira gratuita para níveis 0 e 1 gratuitos

Situação em 14/10/2026: **preparado no branch `premium/transicao`, revisado duas vezes em `premium/transicao-rev` e integrado em `integracao-codex`; nada publicado.** O aviso está desligado, não há data de corte decidida, nenhuma cobrança foi ativada e a demonstração pública continua com o texto antigo. As decisões que faltam estão em [Para o Arthur decidir](#para-o-arthur-decidir).

## O que aconteceu

| Data | O quê | De onde vem |
|---|---|---|
| 06/10/2026 | A página `/sobre` passa a dizer "A Alicerce é gratuita" (commit `ae0a8f5`). Ela chega a `main` no push de 07:28 UTC (`b097283`); a demo no GitHub Pages começa às 09:37 UTC (`d7b7e60`, que cria `pages.yml`). A publicação mais antiga guardada localmente (`8500050`, 07/10 08:41 UTC) já traz a frase, e a última também. | `git log -S "A Alicerce é gratuita"`, `git reflog show --date=iso origin/main`, `git show 8500050:sobre/index.html` |
| 07/10/2026, 21:58 UTC (18:58 em Brasília) | `/planos` passa a dizer: "Hoje, tudo o que existe na Alicerce é gratuito, e a trilha inteira fica gratuita para sempre". Quatro itens com o selo "grátis para sempre" e, em Compromissos: "A trilha completa (níveis 0 a 14, com lições, visualizações e projetos), os exercícios, a revisão espaçada, o laboratório e o tutor com pistas guiadas ficam gratuitos para sempre, em qualquer plano". A mesma página anuncia o tutor com IA no gratuito, com 60 perguntas por dia (300 no Premium), desligado na demo. `FOREVER_FREE` entra em `packages/engine/src/plans.ts`. Push para `main` às 21:58:47 UTC; commit de publicação `b1e57ef` ("Publica d46f468") às 21:59:02 UTC. | commit `d46f468` ("Compromisso público: o que fica gratuito para sempre"); `git reflog show --date=iso origin/main` e `origin/gh-pages`; `git show b1e57ef:planos/index.html` |
| 10/10/2026 | A cópia independente registra a estratégia v3: níveis 0 e 1 gratuitos, 2 a 14 por assinatura. | `docs/ESTRATEGIA_ASSINATURA.md`, criado no commit `0413086` (10/10/2026 12:40 −0700) |
| 13/10/2026 | Arthur confirma a estratégia nova. | Instrução do Arthur que deu origem a esta tarefa. Nenhum commit ou documento anterior a ela registra a confirmação com essa data; agora ela está em `docs/ROADMAP.md` e em `TRANSICAO_ACESSO.estrategiaConfirmadaEm`. |
| 13/10/2026, 20:29 UTC | Última publicação da demo (`gh-pages` `a7960dd`, gerada de `8b29cc2`). Ela **ainda traz a promessa** e as 111 lições, inclusive as dos níveis 2 a 14, em arquivos públicos. | `git show origin/gh-pages:planos/index.html` e `git ls-tree origin/gh-pages assets` |
| 14/10/2026 | `integracao-codex` (`a76b54c`) troca `/planos` para a estratégia nova, sem dizer que a regra mudou. O site não mudou: o Pages só publica `main`. Mas o branch foi enviado ao `origin` (GitHub) às 01:35:50 UTC, já com `1a6f0b0`. | git log; `git reflog show --date=iso origin/integracao-codex` ("update by push") |

De onde vêm os horários: o `gh-pages` é substituído a cada publicação, mas os commits anteriores continuam no git local (reflog de `origin/gh-pages`: `8500050`, `ff51459`, `b1e57ef`, `2f70c66`, `e03ae52`, `a7960dd`), e o reflog de `origin/main` registra cada push. Os horários acima são os desses registros. O GitHub Pages serve o site alguns minutos depois do commit de publicação; o instante exato em que cada versão ficou visível não foi conferido no GitHub (nenhuma API foi chamada).

## Quem foi afetado: o que se sabe

- **Nenhuma conta em servidor conhecida.** Não existe servidor de contas hospedado. A demo é estática (`VITE_STATIC=1`), sem contas e sem métricas de visitantes. O servidor em `apps/api` existe no código, mas não está implantado.
- **Visitantes da demo não são identificáveis.** Quem estudou tem o progresso só no próprio navegador (`localStorage`, chave `alicerce:progresso:v1`; a versão nova grava uma cópia em `alicerce:progresso:v2:guest`). Não sabemos quantas pessoas são, e pode ser que nenhuma tenha estudado os níveis 2 a 14.
- **Não vamos criar rastreamento só para descobrir.** A página de privacidade diz que não usamos rastreadores nem análise de terceiros, e coletar dados para medir os afetados contrariaria isso. O aviso abaixo resolve o problema no próprio aparelho, sem mandar nada para lugar nenhum.

## O que está pronto neste branch

| Peça | Arquivo | Como foi testado |
|---|---|---|
| Configuração única (datas, data de corte, chave do aviso) | `packages/engine/src/transicao.ts`, constante `TRANSICAO_ACESSO` | vitest (`packages/engine/src/transicao.test.ts`): vem desligada, e o aviso exige a chave ligada **e** uma data válida |
| Função pura: o progresso tem atividade nos níveis 2 a 14 antes do corte? | `atividadeNosNiveisPagos` no mesmo arquivo | vitest, com progresso montado à mão |
| Levantamento de contas no servidor | `apps/api/src/transicao.ts`, `apps/api/scripts/afetados-transicao.ts` | vitest com banco SQLite temporário e execução real do script (`apps/api/test/transicao.test.ts`); também rodado à mão num banco novo e vazio: "Contas: 0" |
| Decisão do aviso no navegador | `apps/web/src/lib/transicao.ts` | vitest com `localStorage` simulado (`apps/web/src/lib/transicao.test.ts`) |
| Aviso único e seção "O que mudou" | `apps/web/src/components/TransicaoAcesso.tsx`, ligados em `Layout.tsx` e `pages/Planos.tsx` | vitest com renderização no servidor (`TransicaoAcesso.test.tsx`): textos obrigatórios, sem urgência, atributos de acessibilidade, Esc |
| Varredura de textos públicos | ver [Textos corrigidos](#textos-corrigidos) | revisão manual e o teste de `/planos` |

**Não foi feito:** nenhum teste com leitor de tela, nenhuma publicação. No branch da transição o Playwright ficou de fora; depois, na integração (`integracao-codex`, 14/10/2026), o e2e inteiro rodou no Chromium e o teste de `/planos` em `e2e/fluxos.spec.ts` passou, no desktop e no celular. Depois dessa rodada, a seção "Compromissos" voltou a `/planos` (`5f7c915`); em 15/10/2026 o e2e inteiro rodou de novo e o teste de `/planos` e a acessibilidade da página passaram no desktop e no celular (o teste de `/planos` não confere o texto dos compromissos: isso fica com o teste de renderização no servidor, `TransicaoAcesso.test.tsx`). O aviso único não tem teste em navegador: ele vem desligado.

### O que conta como atividade nos níveis 2 a 14

Conta: tentativas de exercício, lições concluídas, revisões de cartão e módulos-roteiro marcados como concluídos, com data anterior ao corte. Visitas a lições pagas não têm data. No site novo, quem não assina não consegue abrir uma lição paga, então uma visita dessas no progresso de visitante só pode ter vindo do período aberto. Por isso, por padrão, visitas também contam.

Não conta: cartões só inscritos (o diagnóstico inscreve sem estudo), módulos dispensados pelo diagnóstico, desbloqueios forçados, projetos, entrevistas e o próprio diagnóstico.

O nível vem dos metadados (ids de lição, módulo e exercício do catálogo). Se um id não estiver no índice, por exemplo quando o conteúdo pago não está no repositório, vale o padrão do id (`l7-…`, `m7-…`, `e7-…`). Um teste confere que esse padrão bate com os metadados em todas as lições, e o relatório informa quantos níveis foram deduzidos assim.

### O aviso único

- Aparece só quando todas estas condições valem: `TRANSICAO_ACESSO.avisoLigado` é `true`; `TRANSICAO_ACESSO.corte` tem uma data válida; a pessoa ainda não fechou o aviso neste aparelho; e o progresso de visitante tem atividade nos níveis 2 a 14 de antes do corte.
- Diz o mesmo que a seção "O que mudou", em poucas linhas, com um link para `/planos#o-que-mudou` e outro para exportar o progresso (`/progresso#h-data`).
- Some de vez (chave `alicerce:aviso-transicao:fechado:v1`) quando a pessoa clica em "Fechar aviso", aperta Esc com o foco no aviso ou segue "Entenda o que mudou". Se a pessoa o fechar em outra aba, ele some também nesta. Se o navegador recusar a gravação no `localStorage` (cota cheia, por exemplo), o registro vai para o `sessionStorage`: o aviso não volta ao recarregar, mas pode voltar numa sessão nova do navegador. Não aparece em `/planos` nem em `/planos/` (o GitHub Pages acrescenta a barra quando a página é aberta direto), que já têm a seção completa.
- Não tem urgência, contagem regressiva, prazo nem botão para assinar. O teste procura esse tipo de linguagem.
- Acessibilidade: é uma região com nome ("A regra de acesso gratuito mudou") no topo do conteúdo principal, onde o "Pular para o conteúdo" leva. Não rouba o foco nem interrompe o leitor de tela (sem `role="alert"`). Os controles são links e um botão de verdade. Ao fechar, o foco vai para o conteúdo principal. A navegação para uma âncora (`/planos#o-que-mudou`, `/progresso#h-data`) agora também leva o foco até ela (`lib/router.tsx`).
- Nunca entra no HTML pré-renderizado. Só o navegador decide, depois de carregar a página, e nada é enviado ao servidor.
- **Não libera nada.** O progresso local só decide se um texto aparece. Acesso a conteúdo pago continua decidido apenas pelo servidor: sessão válida e assinatura ativa no banco, a cada pedido.

### Como ligar, quando o Arthur decidir

1. Em `packages/engine/src/transicao.ts`, preencha `corte: 'AAAA-MM-DD'` e mude `avisoLigado` para `true`. A data de corte é o dia (00:00 em Brasília) em que os níveis 2 a 14 deixam de abrir no site público, ou seja, o dia em que a versão nova entra no ar.
2. O teste "vem desligada e sem data de corte" vai falhar de propósito. Atualize-o na mesma mudança, para que ligar o aviso seja uma decisão registrada.
3. Publique o aviso junto com a troca de `/planos`, nunca antes.

## Quando houver servidor

```
node apps/api/scripts/afetados-transicao.ts --banco <arquivo.db> --corte AAAA-MM-DD
node apps/api/scripts/afetados-transicao.ts --banco <arquivo.db> --corte AAAA-MM-DD --json
node apps/api/scripts/afetados-transicao.ts --banco <arquivo.db> --corte AAAA-MM-DD --exportar-contatos contatos.csv
```

- O banco é aberto **só para leitura**. Nada é criado nem migrado, e o teste confere que o arquivo não muda.
- O relatório mostra quantas contas existem, quantas têm progresso no servidor, quantas têm atividade nos níveis 2 a 14 (antes do corte, se houver), desde quando, e o plano gravado e o plano em vigor (um premium vencido conta como free). Ele não mostra e-mail, nome nem id: cada conta vira um número de ordem.
- Os contatos só saem com `--exportar-contatos`, num arquivo novo (o script não sobrescreve nada) com permissão 0600. As células são protegidas contra fórmula de planilha. São dados pessoais: use o arquivo só para avisar sobre a mudança e apague-o depois.
- Sem `--banco`, o script usa `DATABASE_PATH` ou o padrão do servidor (`apps/api/data/alicerce.db`). Se o banco não existir, ele explica isso e não cria arquivo.
- No servidor, quem assinou o Premium depois do corte também pode ter visitas sem data a lições pagas. O relatório separa essas contas ("só por visitas, sem data") e mostra o plano em vigor: confira antes de avisar.
- O progresso sincronizado veio do navegador e pode ter sido importado ou editado. Serve para decidir **a quem avisar**, nunca para conceder acesso ou benefício por si só. Se houver benefício, ele deve depender de fatos que o servidor registrou: data de criação da conta, histórico de planos em `plan_changes`.
- E-mail para as contas afetadas: o mesmo conteúdo da seção "O que mudou", sem urgência e sem oferta com prazo.

## O que continua no histórico

Esta mudança protege as **próximas** entregas. O que já foi publicado continua acessível e não deve ser escondido:

- a promessa está no histórico do repositório público (commit `d46f468` e seguintes), nas publicações da demo e, possivelmente, em cópias de terceiros, como caches e arquivos da web;
- as aulas, exercícios, soluções e cartões dos níveis 2 a 14 foram publicados abertamente na demo (a última publicação tem as 111 lições em `assets/`) e estão no histórico do repositório público. Quem baixou continua com o que baixou;
- o branch `integracao-codex` foi enviado ao `origin` (GitHub) em 14/10/2026, com todo o conteúdo pago e a cópia do Codex. Se o repositório é público, isso também está visível lá. A visibilidade do repositório não foi conferida.

A seção "O que mudou" assume a mudança de forma explícita, em vez de apagar o texto antigo sem explicação.

## Textos corrigidos

Linhas no estado do branch antes da varredura (commit `f0662c2`).

| Arquivo:linha | Antes | Depois |
|---|---|---|
| `apps/web/src/pages/Sobre.tsx:11` | "A Alicerce é gratuita, funciona no navegador (…) e foi desenhada para quem nunca programou chegar a um nível profissional, com base sólida em ciência da computação." | "A Alicerce funciona no navegador (…) e foi desenhada para quem nunca programou construir, passo a passo, uma base sólida em ciência da computação. Os níveis 0 e 1 são gratuitos; do nível 2 ao 14, a continuação faz parte da assinatura Premium, que ainda não está à venda. Detalhes em Planos." |
| `apps/web/src/pages/Sobre.tsx:69` | "O progresso fica no seu navegador; conta é opcional." | "O progresso fica no seu navegador. Nos níveis gratuitos, não é preciso criar conta; o Premium, quando estiver à venda, vai exigir uma conta com assinatura ativa." |
| `apps/web/src/pages/Conta.tsx:115` | "A conta é opcional: serve para sincronizar o progresso entre aparelhos e, quando o tutor com IA está ativado, para usá-lo. Todo o resto funciona sem ela." | "Nos níveis 0 e 1, a conta é opcional: serve para sincronizar o progresso entre aparelhos. O Premium (níveis 2 a 14 e tutor com IA) exige conta com assinatura ativa e ainda não está à venda; criar uma conta, sozinho, não libera esses conteúdos." |
| `apps/web/src/components/Layout.tsx:115` (113 em `a76b54c`) | "Seu progresso fica no seu navegador; a conta é opcional." (rodapé da versão com servidor) | "Seu progresso fica no seu navegador; a conta é opcional nos níveis gratuitos e necessária para o Premium." |
| `apps/web/src/pages/Metodologia.tsx:101` | título "Tutor que não entrega a resposta" | "Tutor que orienta com pistas" (o parágrafo já dizia que a IA pode errar ou revelar demais) |
| `packages/engine/src/plans.ts:30` | `tutor-ia`: "Conversa sobre o seu código, sem entregar a resposta." | "Conversa sobre o seu código, com pistas em vez de respostas prontas. Respostas geradas podem conter erros." |
| `packages/engine/src/plans.ts:34` | `certificado`: "Certificado por nível concluído, com prova de domínio." | "Em estudo: certificado por nível, só com uma avaliação verificável. Atividade registrada no navegador não serve de prova." |
| `docs/ROADMAP.md:22` | "No mesmo dia Arthur decidiu o que fica gratuito para sempre: trilha, exercícios e revisão, laboratório e tutor com pistas (`FOREVER_FREE`). O tutor com IA e a sincronização (…) ficaram de fora do compromisso." | A promessa descrita como substituída pela estratégia v3 (10/10, confirmada em 13/10), `FOREVER_FREE` fora do código, link para este documento. |
| `e2e/fluxos.spec.ts:113-132` | exigia quatro selos "grátis para sempre" e a frase "ficam gratuitos para sempre, em qualquer plano" | confere a seção "O que mudou" e a ausência de "grátis para sempre" (não executado) |

Achados na revisão (`premium/transicao-rev`), linhas no estado de `5b9e6e2`:

| Arquivo:linha | Antes | Depois |
|---|---|---|
| `apps/web/src/pages/Sobre.tsx:28` | "**Ajuda sem cola**: dicas graduais e um tutor que pergunta em vez de responder." (mesma promessa absoluta tirada de Metodologia; e a solução pode ser vista) | "**Ajuda em etapas**: dicas graduais e um tutor que orienta com perguntas e pistas. Dá para ver a solução, mas o exercício volta na revisão para você refazer sem ajuda." |
| `apps/web/src/pages/Sobre.tsx:31` | "domínio medido por habilidade" | "domínio estimado por habilidade, a partir dos seus exercícios" (como já diz `/progresso`) |
| `docs/AUDITORIA.md:19` | "Tutor que não dá a resposta \| Feito \| … solução nunca enviada" | "Feito, com ressalva": a solução oficial nunca vai ao modelo, mas a IA ainda pode gerar uma solução (como já diz `PEDAGOGIA.md`) |
| `TransicaoAcesso.tsx`, aviso | "Antes de <corte>, a página Planos dizia…" (sugere que a promessa era antiga) | "De 7 de outubro de 2026 até <corte>, a página Planos dizia…", igual à seção "O que mudou" |
| `TransicaoAcesso.tsx`, "O que mudou" | só falava de `/planos` | diz também que a frase "A Alicerce é gratuita", da página Sobre, foi corrigida |

Achados na segunda revisão (`premium/transicao-rev`, depois de `9d07598`):

| Arquivo:linha | Antes | Depois |
|---|---|---|
| `apps/web/src/components/TransicaoAcesso.tsx`, "O que mudou" | não falava do tutor com IA, que a `/planos` publicada anunciava no gratuito (60 perguntas por dia; 300 no Premium) | parágrafo novo: a IA estava desligada na demo e agora fica só no Premium, com os limites de `PLANS` (20 por dia dentro de 200 por mês) |
| idem, "Seu progresso continua no seu aparelho" | "continua salvo no navegador em que você estudou" | acrescenta "a não ser que os dados do site tenham sido apagados nele" (o navegador pode apagar dados de sites por conta própria) |
| `apps/web/src/pages/Sobre.tsx:67` | título "Código aberto e privacidade" | "Privacidade". Não há arquivo de licença, o conteúdo pago vai para um repositório privado e o parágrafo só fala de privacidade. Se o Arthur escolher uma licença para o código, o título pode voltar |
| este documento | "o horário exato em que a versão de 07/10 entrou no ar" não verificado; "a cópia local só tem a última" publicação | os commits de publicação antigos continuam no git local; horários conferidos (ver a tabela do início) |

Achados na integração (`integracao-codex`, fim de 14/10/2026):

| Onde | Antes | Depois |
|---|---|---|
| `apps/web/src/pages/Planos.tsx`, seção "Compromissos" | a versão da cópia não repetia os compromissos da `/planos` publicada e só dizia que as condições "serão apresentadas antes de qualquer contratação" | a seção volta (`5f7c915`), valendo para quando houver assinatura e dizendo que hoje não há cobrança: condições apresentadas antes de contratar, cancelamento simples pela conta, desistência em até 7 dias com devolução (CDC, art. 49), aviso na página antes de mudar o preço previsto, sem publicidade invasiva, contagem regressiva, falsa urgência ou venda de dados, e dados do cartão só com o provedor. Não volta a promessa de trilha inteira gratuita, que fica só em "O que mudou" |
| objetivo do nível 2 (fonte privada `src/levels/n02-python.ts`) | "Dominar uma linguagem de verdade: coleções, texto, arquivos, erros, depuração, módulos e testes." | "Escrever, depurar e testar programas em Python, praticando coleções, texto, arquivos, erros, módulos e testes." |
| objetivo do nível 10 (`src/levels/n08-n10.ts`) | "Trabalhar como um profissional: versionamento, código limpo, testes, CI/CD, arquitetura e colaboração." | "Praticar o que equipes de software usam no dia a dia: versionamento, código limpo, testes, CI/CD, arquitetura e colaboração." |
| objetivo do nível 11 (`src/levels/n11-n14.ts`) | "Construir software que resiste a ataques comuns e proteger dados e usuários." (promete um resultado de segurança) | "Reconhecer ataques comuns e praticar defesas que protegem dados e usuários." |
| objetivo do nível 14 (`src/levels/n11-n14.ts`) | "Dominar a matemática que sustenta algoritmos, segurança e IA — sempre conectada ao código." | "Estudar a matemática que sustenta algoritmos, segurança e IA, praticando sempre em código." |

Os quatro objetivos mudaram no repositório privado (commit `d871208`, com o bundle recriado) e, aqui, no mapa gerado `packages/content/src/catalogo-pago.ts` e em `docs/CURRICULO.md` (`2b2b812`, por `node scripts/premium/metadados.ts` e `npm run docs`); `metadados.ts --conferir` passa. Os demais títulos, resumos e objetivos públicos foram procurados por "domin", "profission", "garant", "certifica", "fluên", "carreira", "mercado" e parecidos: o que sobrou é conteúdo técnico (garantias do TCP, certificados TLS, "igualdade de domínio" em tabelas hash).

Encontrados e **não** corrigidos neste branch, para decidir junto com a separação do conteúdo (trocados depois, na integração: ver a tabela acima):
- Objetivos de nível exibidos em `/trilha` e `/nivel/:id`: "Dominar uma linguagem de verdade: …" (nível 2, `packages/content/src/levels/n02-python.ts:1332`), "Trabalhar como um profissional: …" (nível 10, `n08-n10.ts:1192`) e "Dominar a matemática que sustenta …" (nível 14, `n11-n14.ts:1408`), repetidos em `docs/CURRICULO.md:43`, `:195` e `:241`. Prometem domínio e resultado profissional. Não foram trocados porque `premium/separacao` apaga esses arquivos do repositório público e leva os objetivos para `packages/content/src/catalogo-pago.ts`, gerado a partir do repositório privado: trocar aqui criaria conflito de edição contra remoção. Sugestão para aplicar na fonte privada e em `CURRICULO.md` depois da separação: "Usar Python com segurança: coleções, …", "Praticar o que equipes de software usam no dia a dia: versionamento, …" e "Estudar a matemática que sustenta …". **Depois da integração com a separação** (`integracao-codex`, 14/10/2026): os textos agora ficam na fonte privada (`src/levels/n02-python.ts` e os arquivos dos níveis 10 e 14 do repositório privado) e no mapa gerado `packages/content/src/catalogo-pago.ts` (campo `goal`), além de `docs/CURRICULO.md`. A troca se faz no privado; depois, `node scripts/premium/metadados.ts` regenera o mapa aqui e `npm run docs` regenera o `CURRICULO.md`. Editar só o mapa público deixaria o teste "mapa em dia" vermelho com o privado presente.

Procurados e sem nada a trocar neste branch:
- "gratuita para sempre" e "A trilha inteira é gratuita" fora da seção que explica a mudança: `/planos` já tinha sido trocado em `integracao-codex`;
- "currículos das melhores universidades": não aparece neste branch. Está na página inicial da demo publicada ("Uma trilha completa em 15 níveis, inspirada nos currículos das melhores universidades…", `Home.tsx:60` em `8b29cc2`), junto com "um tutor que guia sem entregar a resposta"; as duas frases saíram quando a cópia do Codex reescreveu a página inicial (`9eb4a74`, 09/10/2026) e continuam na demo até a versão nova ser publicada;
- `FOREVER_FREE` em `docs/ARQUITETURA.md`: já tinha saído; ganhou só uma nota sobre a transição.

Vistos e mantidos:
- "nunca entrega a solução pronta" em `packages/engine/src/tutor.ts:5` é comentário de código, não texto público; a linha 88 é instrução ao modelo ("Nunca entregue a solução completa"), não promessa;
- "Uma trilha inicial completa, sem prazo de expiração", em `/planos`, descreve os níveis 0 e 1, coerente com a estratégia v3. Ainda assim, é uma promessa sem prazo, e cabe ao Arthur mantê-la ou não;
- "Ao final desta lição você vai conseguir:" (`Licao.tsx`) apresenta os objetivos da lição, não promete resultado profissional;
- lições sobre certificados TLS e "prova de domínio" do ACME são conteúdo técnico.

## Para o Arthur decidir

Cada opção, com a consequência em uma linha. As opções 2 e 3 podem ser somadas à 1.

1. **Só o aviso e a seção "O que mudou".** Os níveis 2 a 14 fecham no dia da publicação: quem estudava fica sabendo da mudança depois que ela já aconteceu.
2. **Período de carência na demo antes de fechar os níveis 2 a 14** (publicar a seção com a data futura, sem contagem regressiva, e fechar na data; os textos de hoje supõem que o corte é o dia da publicação, como em "vale desde <data>", e precisariam ser reescritos no futuro). Quem estudava tem tempo de terminar o que começou e exportar o progresso, mas o conteúdo pago fica mais tempo em arquivos públicos, e são necessárias duas publicações.
3. **Benefício para quem estudou na demo quando houver cobrança** (por exemplo, um período sem custo). No aparelho não dá para comprovar quem estudou, porque o progresso é dado do cliente e pode ser importado ou editado, e dado do cliente não autoriza nada. Na prática, o benefício vira autodeclarado (aberto a quem pedir) ou geral de lançamento.

Também falta decidir:
- a data de corte;
- quando ligar o aviso;
- se o texto "sem prazo de expiração" fica em `/planos`;
- se, quando houver servidor com contas, as afetadas recebem um e-mail;
- se `/sobre` volta a ter um título sobre código aberto, o que depende de escolher uma licença para o código.
- se ficam os textos novos das justificativas ("por que este nível", campo `why`) dos níveis 3, 6, 10 e 11, trocados em 20/10/2026 na fonte privada e no mapa gerado. Antes eles afirmavam resultado ou mercado sem evidência: nível 3, “transforma ‘funciona’ em ‘funciona bem com milhões de dados’ — e é o tema central de entrevistas técnicas”; nível 6, "onde está a maioria das vagas de entrada" e "torna qualquer framework fácil depois"; nível 10, "ensina as práticas que empresas esperam no primeiro dia de estágio"; nível 11, "falhas que você aprende a evitar aqui".
