# Publicação da demonstração

A demonstração publicada é o site estático (sem servidor) no GitHub Pages, servido a partir do branch `gh-pages` (Settings → Pages → Deploy from a branch → `gh-pages`, pasta raiz). Ela é gerada com `BASE_PATH=/<nome do repositório>/` e `VITE_STATIC=1`: tudo roda no navegador; contas, sincronização e tutor com IA ficam desligados.

## Como uma versão chega ao ar

Tudo acontece no workflow de CI (`.github/workflows/ci.yml`), a cada push na `main`:

| Job | Permissão | O que faz |
|---|---|---|
| `check` | `contents: read` | `npm ci --ignore-scripts`, typecheck, testes unitários, `test:solutions`, um build estático (`BASE_PATH=/alicerce/`, `VITE_STATIC=1`) guardado à parte para o e2e, o build normal, a auditoria de acesso desse build (`scripts/verify-access-build.ts`) e o e2e (Playwright, com `PAGES_DIST` apontando para o build estático), tudo sem o repositório privado do conteúdo pago ([PREMIUM.md](PREMIUM.md)) |
| `pages-build` | `contents: read` | testa o script de publicação (`scripts/test-publish-pages.sh`), gera o build estático, roda a auditoria de acesso (`scripts/verify-access-build.ts`), apaga os `.map`, cria `.nojekyll` e guarda a pasta como artefato `pages-site` |
| `pages-publicar` | `contents: write` | só em push na `main` e só se `check` e `pages-build` passaram nesse mesmo commit: baixa o artefato e roda `scripts/publish-pages.sh publicar` |

- **Push na `main` com teste quebrado não chega ao site**: se `check` ou `pages-build` falham, `pages-publicar` não roda. O `npm run check` que o workflow antigo do Pages rodava (typecheck, testes e `test:solutions`) está contido no `check`, que ainda roda build e e2e.
- **O que vai ao ar é o build daquele commit**: o artefato vem do `pages-build` da mesma execução, que fez checkout de `github.sha`. A mensagem do commit no `gh-pages` registra o commit da `main` (`Fonte: <sha>`) e o link da execução (`Execucao: ...`).
- **Cada publicação é um commit novo sobre o anterior**, enviado sem force push. Se o `gh-pages` mudar entre a leitura e o push, o push falha em vez de sobrescrever.
- **Build mais velho não volta o site**: antes de publicar, o script confere se o commit ainda é a ponta da `main`. Se outro push chegou depois, ele não publica (aviso na execução) e quem publica é a execução do commit mais novo, quando os testes dela passarem. Os jobs de publicação e de rollback compartilham o grupo de concorrência `pages-publicacao` e nunca rodam ao mesmo tempo; um job que estava esperando e foi substituído por um mais novo aparece como cancelado.
- **Em pull requests** rodam `check` e `pages-build` (então um vazamento de conteúdo Premium no build público falha antes do merge), mas nada é publicado.
- Depois do push no `gh-pages`, o próprio GitHub Pages ainda precisa rodar a implantação dele ("pages build and deployment") para o site mudar.

A auditoria de acesso confere, no build estático: que só as lições gratuitas têm JSON público, que as páginas Premium saem como prévia e as gratuitas como lição, que cartões de revisão e corpus do tutor estão filtrados, que nenhum exemplo teórico protegido aparece em JS, JSON, HTML ou sourcemap, e que o catálogo público não traz as questões de autonomia.

### Por que `needs` no `ci.yml` e não `workflow_run`

- O job que publica está na mesma execução dos testes: o commit é o mesmo por construção (`github.sha`), sem ter de buscar o `head_sha` de outra execução nem baixar artefato de outra execução.
- `workflow_run` roda no contexto privilegiado do branch padrão mesmo quando a execução de origem veio de um pull request de fork, e o `head_branch` desse fork pode se chamar `main`; o filtro teria de checar evento, repositório de origem e branch. Com `needs`, o job de publicação simplesmente não existe fora de push na `main`.
- O build estático e a auditoria passam a rodar também em pull requests, coisa que um workflow separado disparado depois do CI não faria.

### Republicar sem push novo

Se só o `pages-publicar` falhou (por exemplo, falha de rede no push), use **Re-run failed jobs** na execução do CI daquele commit; **Re-run all jobs** roda os testes e o build de novo antes de publicar. A trava da ponta continua valendo: se a `main` já andou, a execução não publica.

## Rollback

O rollback não reconstrói nada: ele pega a árvore de uma publicação anterior do `gh-pages` e a publica de novo como um commit novo, sem apagar o histórico.

1. No GitHub, abra **Actions → Pages (rollback) → Run workflow**.
2. Em **Use workflow from**, deixe `main` (em outro branch os jobs não rodam).
3. Em **versao**, escolha:
   - `anterior` (padrão): põe no ar a publicação que estava no ar antes da atual, gerada de outro commit da `main` (uma publicação repetida do mesmo commit, como a de um re-run, é pulada). Rodar de novo volta mais um passo.
   - `listar`: não muda nada; mostra as últimas 30 versões no resumo da execução (commit do `gh-pages`, data, tipo, commit da `main`).
   - um commit: o do `gh-pages` (coluna da esquerda do `listar`) ou o commit da `main` que gerou a publicação, com 7 a 40 caracteres.
4. Em **motivo**, escreva por que está voltando (vai para a mensagem do commit).

O commit criado tem o assunto `Rollback: volta para a publicação <commit do gh-pages> (main <commit da main>)` e registra `Restaura:` (a publicação posta de volta), `Substitui:` (a que saiu), `Fonte:` (o commit da `main` que está no ar agora), `Pedido-por:` e `Execucao:`. Para desfazer um rollback, rode de novo informando o commit que está em `Substitui:`.

Só voltam ao ar publicações feitas por este processo (com `Tipo: publicacao` na mensagem), ou seja, que passaram pelos testes e pela auditoria de acesso. O commit que o workflow antigo deixou no `gh-pages` (assunto `Publica <sha>`, sem essas linhas; aparece como `legado` no `listar`) é recusado, tanto por `anterior` quanto pelo commit: ele foi gerado sem testes e sem a auditoria de acesso. Por isso, logo depois da primeira publicação pelo CI ainda não há para onde voltar: se ela tiver problema, corrija ou reverta na `main`.

O rollback vale até a próxima publicação: o próximo push na `main` que passar no CI publica por cima, e um re-run da execução do CI da ponta da `main` também. Para manter o site na versão antiga, corrija ou reverta o problema na `main` (`git revert`); o push do revert passa pelo CI e publica.

Se o job de rollback aparecer como cancelado, uma publicação entrou na fila do grupo `pages-publicacao` depois dele e tomou o lugar; confira com `listar` e rode de novo se precisar.

### Por que republicar a árvore do `gh-pages` e não reconstruir um commit da `main`

- É imediato e não depende de `npm`, do registro de pacotes nem de o build atual funcionar, que é justamente o que pode estar quebrado durante um incidente.
- Põe no ar exatamente os mesmos bytes que já estiveram no ar e passaram pela auditoria, em vez de um build novo que pode sair diferente (dependências, data no `sitemap.xml`).
- Não precisa de código novo nem de rodar testes de novo.

## Testar localmente

```bash
bash scripts/test-publish-pages.sh
```

Cria repositórios bare temporários (fora do projeto, apagados no fim), com o `gh-pages` no formato atual (um único commit órfão, como o deixado pelo workflow antigo de `git init` + `git push -f`) e um remoto que recusa push que não seja fast-forward. Publica builds de mentira, faz rollbacks e confere histórico, árvores, mensagens, a trava da ponta da `main`, que `anterior` pula a republicação do mesmo commit, que o commit legado não volta ao ar, a recusa de entradas inválidas, que um `gh-pages` alterado no meio faz o push falhar sem sobrescrever e que o token só chega ao git como cabeçalho em variável de ambiente (só para `github.com`, com o rastreamento do git desligado, fora da linha de comando, da saída e dos arquivos). O mesmo teste roda no `pages-build`.

Para usar o script à mão contra um repositório local:

```bash
scripts/publish-pages.sh publicar --remoto file:///caminho/remoto.git --dist apps/web/dist --fonte "$(git rev-parse HEAD)"
scripts/publish-pages.sh listar   --remoto file:///caminho/remoto.git
scripts/publish-pages.sh rollback --remoto file:///caminho/remoto.git --versao anterior --motivo "teste"
```

## Segurança

- **Permissões por job**: o topo dos workflows declara `permissions: {}`; build e testes têm `contents: read`; só `pages-publicar` e o rollback têm `contents: write`.
- **Checkout sem credencial**: todo `actions/checkout` usa `persist-credentials: false`, então o token não fica em `.git/config` para scripts de `npm` lerem.
- **Token só no passo do push**: o job que publica não roda `npm` nem o build; o token entra como `PAGES_TOKEN` apenas no passo que chama o script. O script o converte num cabeçalho HTTP passado ao git por variáveis de ambiente (`GIT_CONFIG_*`), só para `https://github.com/`, marca a versão em base64 como segredo no log, desliga o rastreamento do git e recusa um `--remoto` com credencial na URL. O token não aparece na URL, na linha de comando, em arquivo nem na saída.
- **`npm ci --ignore-scripts`** no CI: nenhuma dependência precisa de script de instalação no Linux (pelo `package-lock.json`, só o `fsevents`, que é do macOS, tem um; nenhum pacote instalado em `node_modules` declara `preinstall`, `install` ou `postinstall`, e os workspaces não têm `prepare`). Typecheck, testes, `test:solutions` e os builds (normal e estático) foram conferidos com essa instalação; o e2e não foi rodado assim aqui.
- **Entradas do rollback** chegam ao script por variável de ambiente (nunca interpoladas no shell) e são validadas: `versao` só aceita `anterior` ou hexadecimal; `motivo` vira uma linha sem caracteres de controle.

Proteção opcional, que depende de configuração no GitHub e não foi feita: um ruleset no branch `gh-pages` com "Block force pushes" e "Restrict deletions" faz o servidor recusar qualquer reescrita do histórico (o push normal do workflow continua funcionando).

## Limitações conhecidas

- Os workflows não foram executados no GitHub Actions: foram validados com `actionlint` (com `shellcheck`), e o script foi testado contra repositórios locais, inclusive sobre uma cópia do commit órfão que está hoje no `gh-pages`. **A primeira execução real precisa ser acompanhada**: conferir que `pages-publicar` rodou depois de `check`, que o commit novo no `gh-pages` tem o commit antigo como pai e que o site mudou. Vale também rodar o rollback uma vez com `listar`.
- A autenticação com o token real só foi verificada por simulação (o teste confere o cabeçalho que o git recebe); o primeiro push real confirma.
- O e2e roda contra o servidor com o build normal, e `e2e/pages.spec.ts` testa no navegador um build estático feito no próprio job `check` (`BASE_PATH=/alicerce/`). Esse build é outro build do mesmo commit, não o artefato que o `pages-build` gera e o `pages-publicar` põe no ar: os bytes podem diferir (por exemplo, a data no `sitemap.xml` e o `BASE_PATH`, que no `pages-build` vem do nome do repositório). O artefato publicado passa pela auditoria de acesso, não por testes de navegador.
- Logo depois da primeira publicação pelo CI não há rollback possível, porque o commit legado é recusado (veja [Rollback](#rollback)).
- O `gh-pages` cresce a cada publicação. Arquivos que não mudam (como o Pyodide) não ocupam espaço de novo, mas os pacotes JS novos de cada versão sim.

## Quando houver servidor de produção

Nada disto está implementado; é o caminho para manter as mesmas garantias.

- **Mesmo portão**: o deploy entra como mais um job com `needs` nos testes do mesmo commit (incluindo o e2e, que já roda contra o servidor real).
- **Artefato imutável**: a imagem Docker (o `Dockerfile` já existe) é gerada uma vez, marcada com o sha do commit e enviada a um registro; o deploy usa essa imagem, sem reconstruir.
- **Rollback**: reimplantar a imagem anterior pelo sha, sem build. Isso só é seguro se o banco aceitar as duas versões: mudanças de esquema só aditivas, preservando a tabela `progress` e o formato do progresso (`alicerce:progresso:v1` no navegador), e cópia do SQLite antes de cada deploy.
- **Segredos** (como `ANTHROPIC_API_KEY`) num environment de produção do GitHub com aprovação obrigatória, entregues só ao passo de deploy, nunca ao build nem aos testes.
- A demonstração do Pages pode continuar como está, ou redirecionar para o domínio de produção.
