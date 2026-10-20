#!/usr/bin/env bash
# Testa scripts/publish-pages.sh contra repositórios bare temporários, fora do
# projeto, sem rede e sem credencial real:
# - o gh-pages começa como hoje (um único commit órfão, criado com git init + push -f);
# - publica builds de mentira e confere que o histórico fica, sem force push
#   (o remoto recusa push que não seja fast-forward);
# - faz rollback e confere que a árvore anterior volta, com a versão registrada,
#   e que o commit legado do workflow antigo (sem portão nem auditoria) não volta;
# - confere a trava da ponta da main, a recusa de entradas inválidas, que um
#   gh-pages alterado no meio do caminho faz o push falhar em vez de sobrescrever
#   e que o token só chega ao git como cabeçalho em variável de ambiente.
# Uso: bash scripts/test-publish-pages.sh
#
# As condições entre aspas simples passadas a todos() são avaliadas depois, de propósito.
# shellcheck disable=SC2016,SC2034
set -euo pipefail

aqui=$(cd "$(dirname "$0")" && pwd -P)
script="$aqui/publish-pages.sh"
tmp=$(mktemp -d "${TMPDIR:-/tmp}/teste-publicacao.XXXXXX")
tmp=$(cd "$tmp" && pwd -P)
trap 'rm -rf "$tmp"' EXIT

# Isola o teste do ambiente: sem anotações do Actions, sem config do usuário.
unset GITHUB_ACTIONS GITHUB_STEP_SUMMARY GITHUB_REPOSITORY PAGES_TOKEN RUNNER_TEMP GIT_CONFIG_COUNT || true
export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1
export GIT_AUTHOR_NAME=teste GIT_AUTHOR_EMAIL=teste@example.invalid
export GIT_COMMITTER_NAME=teste GIT_COMMITTER_EMAIL=teste@example.invalid
export TMPDIR="$tmp/trabalho"
mkdir -p "$TMPDIR"

n=0
ok() { n=$((n + 1)); printf 'ok %d - %s\n' "$n" "$1"; }
falha() { printf 'FALHOU: %s\n' "$1" >&2; exit 1; }
confere() { local d=$1; shift; if "$@"; then ok "$d"; else falha "$d"; fi; }

R="$tmp/remoto.git"
URL="file://$R"
rg() { git --git-dir="$R" "$@"; }
pub() { local acao=$1; shift; bash "$script" "$acao" --remoto "$URL" "$@"; }
ponta() { rg rev-parse refs/heads/gh-pages; }
contagem() { rg rev-list --count refs/heads/gh-pages; }
arv() { rg rev-parse "$1^{tree}"; }
mensagem() { rg log -1 --format=%B "$1"; }
contem() { case $1 in *"$2"*) return 0 ;; *) return 1 ;; esac; }
nao() { if "$@"; then return 1; else return 0; fi; }
sem_arquivo() { if rg cat-file -e "$1" 2>/dev/null; then return 1; else return 0; fi; }
todos() { local c; for c in "$@"; do eval "$c" || return 1; done; }

# Árvore esperada de uma pasta (com o .nojekyll que a publicação acrescenta),
# calculada por fora do script.
arvore_esperada() {
  local d
  d=$(mktemp -d "$tmp/esperada.XXXXXX")
  cp -R "$1/." "$d"
  : >"$d/.nojekyll"
  git init -q "$d"
  git -C "$d" add -A
  git -C "$d" write-tree
}

# --- remoto: main com histórico e gh-pages com um commit órfão (o estado atual)
git init -q --bare "$R"
rg symbolic-ref HEAD refs/heads/main
git init -q "$tmp/fonte"
git -C "$tmp/fonte" commit -q --allow-empty -m 'm1'
m1=$(git -C "$tmp/fonte" rev-parse HEAD)
git -C "$tmp/fonte" commit -q --allow-empty -m 'm2'
m2=$(git -C "$tmp/fonte" rev-parse HEAD)
git -C "$tmp/fonte" push -q "$URL" HEAD:refs/heads/main

mkdir "$tmp/legado"
printf '<h1>versão 0</h1>\n' >"$tmp/legado/index.html"
(
  cd "$tmp/legado"
  git init -q -b gh-pages
  git add -A
  git commit -q -m "Publica ${m1:0:7}"
  git push -q -f "$URL" gh-pages
)
legado=$(ponta)
rg config receive.denyNonFastForwards true
rg config receive.denyDeletes true
confere 'gh-pages inicial tem um único commit órfão' test "$(contagem)" = 1

# --- builds de mentira
mkdir -p "$tmp/build1/assets" "$tmp/build1/licao/a"
printf '<h1>versão 1</h1>\n' >"$tmp/build1/index.html"
printf 'console.log(1)\n' >"$tmp/build1/assets/app-1.js"
printf 'lição a, v1\n' >"$tmp/build1/licao/a/index.html"
printf 'some na v2\n' >"$tmp/build1/antigo.txt"
mkdir -p "$tmp/build2/assets" "$tmp/build2/licao/a"
printf '<h1>versão 2</h1>\n' >"$tmp/build2/index.html"
printf 'console.log(2)\n' >"$tmp/build2/assets/app-2.js"
printf 'lição a, v2\n' >"$tmp/build2/licao/a/index.html"
mkdir -p "$tmp/build3"
printf '<h1>versão 3</h1>\n' >"$tmp/build3/index.html"
# build4b é o build4 gerado de novo do mesmo commit da main em outro dia: só a
# data do sitemap.xml muda (é o que um re-run produz).
mkdir -p "$tmp/build4" "$tmp/build4b"
printf '<h1>versão 4</h1>\n' | tee "$tmp/build4/index.html" >"$tmp/build4b/index.html"
printf '<lastmod>2026-01-01</lastmod>\n' >"$tmp/build4/sitemap.xml"
printf '<lastmod>2026-01-02</lastmod>\n' >"$tmp/build4b/sitemap.xml"
esperada1=$(arvore_esperada "$tmp/build1")
esperada2=$(arvore_esperada "$tmp/build2")
esperada3=$(arvore_esperada "$tmp/build3")
nova_main() {
  git -C "$tmp/fonte" commit -q --allow-empty -m "$1"
  git -C "$tmp/fonte" push -q "$URL" HEAD:refs/heads/main
  git -C "$tmp/fonte" rev-parse HEAD
}

# --- trava da ponta da main
saida=$(pub publicar --dist "$tmp/build1" --fonte "$m1" --exigir-ponta main)
confere 'build de commit que já não é a ponta da main não publica' test "$(ponta)" = "$legado"
confere 'o aviso diz que a main andou' contem "$saida" 'andou'

# --- primeira publicação: push sem force sobre o commit órfão
pub publicar --dist "$tmp/build1" --fonte "$m2" --exigir-ponta main --execucao 'https://exemplo.invalid/run/1' >/dev/null
p1=$(ponta)
confere 'primeira publicação cria commit novo' test "$p1" != "$legado"
confere 'o pai da primeira publicação é o commit órfão antigo' test "$(rg rev-parse "$p1^1")" = "$legado"
confere 'histórico tem 2 commits' test "$(contagem)" = 2
confere 'árvore publicada é exatamente o build 1 (+ .nojekyll)' test "$(arv "$p1")" = "$esperada1"
confere 'mensagem registra o commit da main' contem "$(mensagem "$p1")" "Fonte: $m2"

# --- segunda e terceira publicações
m3=$(nova_main m3)
pub publicar --dist "$tmp/build2" --fonte "$m3" --exigir-ponta main >/dev/null
p2=$(ponta)
confere 'segunda publicação fica sobre a primeira' test "$(rg rev-parse "$p2^1")" = "$p1"
confere 'histórico tem 3 commits e o órfão antigo continua nele' \
  todos 'test "$(contagem)" = 3' 'rg merge-base --is-ancestor "$legado" "$p2"'
confere 'árvore publicada é exatamente o build 2' test "$(arv "$p2")" = "$esperada2"
confere 'arquivo removido no build some do site' sem_arquivo "$p2:antigo.txt"

pub publicar --dist "$tmp/build2" --fonte "$m3" >/dev/null
confere 'republicar o mesmo build não cria commit vazio' test "$(ponta)" = "$p2"

m4=$(nova_main m4)
pub publicar --dist "$tmp/build3" --fonte "$m4" --exigir-ponta main >/dev/null
p3=$(ponta)
confere 'terceira publicação fica sobre a segunda' test "$(rg rev-parse "$p3^1")" = "$p2"

saida=$(pub listar)
confere 'listar mostra a publicação no ar, as anteriores e o legado' \
  todos 'contem "$saida" "${p3:0:7} (no ar)"' 'contem "$saida" "${p2:0:7}"' 'contem "$saida" "${p1:0:7}"' \
  'contem "$saida" "| ${legado:0:7} | "' 'contem "$saida" "| legado | ${m1:0:7} |"'

# --- rollback
pub rollback --motivo 'teste de rollback' --autor 'pessoa-teste' --execucao 'https://exemplo.invalid/run/2' >/dev/null
r1=$(ponta)
confere 'rollback cria commit novo, sem apagar histórico' todos 'test "$(contagem)" = 5' 'test "$(rg rev-parse "$r1^1")" = "$p3"'
confere 'rollback "anterior" restaura a árvore do build 2' test "$(arv "$r1")" = "$esperada2"
msg=$(mensagem "$r1")
confere 'mensagem do rollback registra a versão restaurada e a que saiu' \
  todos 'contem "$msg" "Restaura: $p2"' 'contem "$msg" "Substitui: $p3"' 'contem "$msg" "Tipo: rollback"'
confere 'mensagem do rollback registra motivo, commit da main e quem pediu' \
  todos 'contem "$msg" "Motivo: teste de rollback"' 'contem "$msg" "Fonte: $m3"' 'contem "$msg" "Pedido-por: pessoa-teste"'

pub rollback >/dev/null
r2=$(ponta)
confere 'repetir "anterior" volta mais um passo (build 1)' \
  todos 'test "$(arv "$r2")" = "$esperada1"' 'contem "$(mensagem "$r2")" "Restaura: $p1"'

# O legado (workflow antigo, sem portão nem auditoria de acesso; no gh-pages real
# ele tem as lições Premium abertas) não volta ao ar por nenhum caminho.
saida=$(pub rollback 2>&1) && falha 'rollback para o legado deveria falhar'
confere '"anterior" não restaura o legado do workflow antigo' \
  todos 'test "$(ponta)" = "$r2"' 'contem "$saida" "workflow antigo"'
if pub rollback --versao "${legado:0:9}" >/dev/null 2>&1; then falha 'rollback pelo commit legado deveria falhar'; fi
confere 'o commit legado do gh-pages também é recusado' test "$(ponta)" = "$r2"
if pub rollback --versao "${m1:0:7}" >/dev/null 2>&1; then falha 'rollback pelo commit da main do legado deveria falhar'; fi
confere 'o commit da main do legado também é recusado' test "$(ponta)" = "$r2"

pub rollback --versao "${m4:0:7}" >/dev/null
confere 'rollback pelo commit da main restaura a publicação dele' test "$(arv "$(ponta)")" = "$esperada3"
pub rollback --versao "${p1:0:9}" >/dev/null
r4=$(ponta)
confere 'rollback por commit do gh-pages restaura aquela árvore' test "$(arv "$r4")" = "$esperada1"
pub rollback --versao "${p1:0:9}" >/dev/null
confere 'rollback para a versão que já está no ar não cria commit' test "$(ponta)" = "$r4"

# --- publicação depois de rollback, e um re-run do mesmo commit da main
m5=$(nova_main m5)
pub publicar --dist "$tmp/build4" --fonte "$m5" --exigir-ponta main >/dev/null
p4=$(ponta)
confere 'publicação depois de rollback fica sobre ele' test "$(rg rev-parse "$p4^1")" = "$r4"
pub publicar --dist "$tmp/build4b" --fonte "$m5" --exigir-ponta main >/dev/null
p4b=$(ponta)
confere 're-run do mesmo commit com outra data no sitemap publica de novo' test "$(rg rev-parse "$p4b^1")" = "$p4"
pub rollback >/dev/null
confere '"anterior" pula a publicação do mesmo commit da main e volta ao que estava no ar antes (build 1)' \
  test "$(arv "$(ponta)")" = "$esperada1"

# --- entradas inválidas não mudam nada
antes=$(ponta)
cd "$tmp"
saida=$(pub rollback --versao '$(touch injetado)' 2>&1) && falha 'versão com comando deveria ser recusada'
confere 'versão com comando é recusada pela validação, sem executar nada' \
  todos 'contem "$saida" "versão inválida"' 'test ! -e "$tmp/injetado"' 'test "$(ponta)" = "$antes"'
if pub rollback --versao deadbeef >/dev/null 2>&1; then falha 'versão inexistente deveria falhar'; fi
confere 'versão inexistente falha' test "$(ponta)" = "$antes"
# Remoto local de verdade com ':' e '@' no caminho: sem a recusa, a publicação funcionaria.
cred="$tmp/usuario:segredo@copia.git"
git clone -q --bare "$URL" "$cred"
saida=$(bash "$script" publicar --remoto "file://$cred" --dist "$tmp/build2" --fonte "$m5" 2>&1) &&
  falha 'remoto com credencial na URL deveria ser recusado'
confere 'remoto com credencial na URL é recusado antes de qualquer acesso' \
  todos 'contem "$saida" "não pode conter credencial"' \
  'test "$(git --git-dir="$cred" rev-parse refs/heads/gh-pages)" = "$antes"'
mkdir -p "$tmp/sem-index"
printf 'x\n' >"$tmp/sem-index/a.txt"
if pub publicar --dist "$tmp/sem-index" --fonte "$m5" >/dev/null 2>&1; then falha 'build sem index.html deveria ser recusado'; fi
confere 'build sem index.html é recusado' test "$(ponta)" = "$antes"
# Um repositório git dentro do build viraria submódulo (gitlink) no gh-pages.
cp -R "$tmp/build2" "$tmp/com-git"
git init -q "$tmp/com-git/sub"
git -C "$tmp/com-git/sub" commit -q --allow-empty -m interno
saida=$(pub publicar --dist "$tmp/com-git" --fonte "$m5" 2>&1) && falha 'build com .git deveria ser recusado'
confere 'build com uma pasta .git é recusado' todos 'contem "$saida" ".git"' 'test "$(ponta)" = "$antes"'
if pub publicar --dist "$tmp/build1" --fonte "${m5:0:7}" >/dev/null 2>&1; then falha 'fonte curta deveria ser recusada'; fi
ok 'fonte precisa ser o sha completo'
saida=$(bash "$script" publicar --remoto "file://$tmp/nao-existe.git" --dist "$tmp/build1" --fonte "$m5" 2>&1) &&
  falha 'remoto inacessível deveria falhar'
confere 'remoto inacessível falha com erro (não é tratado como gh-pages inexistente)' contem "$saida" 'não foi possível consultar'

# --- gh-pages alterado entre a leitura e o push: falha, não sobrescreve.
# O remoto passa a aceitar force push, para provar que o script não usa.
rg config receive.denyNonFastForwards false
REAL_GIT=$(command -v git)
mkdir -p "$tmp/shim"
cat >"$tmp/shim/git" <<'SHIM'
#!/usr/bin/env bash
case " $* " in
  *" push "*)
    if [ -n "${SHIM_CONCORRENTE:-}" ] && [ -f "$SHIM_CONCORRENTE" ]; then
      rm -f "$SHIM_CONCORRENTE"
      "$REAL_GIT" -C "$SHIM_REPO_CONC" push -q "$SHIM_URL" HEAD:refs/heads/gh-pages
    fi
    if [ -n "${SHIM_TOKEN:-}" ]; then
      esperado="AUTHORIZATION: basic $(printf 'x-access-token:%s' "$SHIM_TOKEN" | base64 | tr -d '\n')"
      obtido=$("$REAL_GIT" config --get-urlmatch http.extraheader https://github.com/dono/repo || true)
      if [ "$obtido" = "$esperado" ]; then echo cabecalho-ok >>"$SHIM_LOG"; else echo cabecalho-errado >>"$SHIM_LOG"; fi
      case "$*" in *"$SHIM_TOKEN"*|*"${esperado#AUTHORIZATION: basic }"*) echo argv-com-token >>"$SHIM_LOG" ;; *) echo argv-limpo >>"$SHIM_LOG" ;; esac
      if [ -n "${PAGES_TOKEN:-}" ]; then echo env-com-token >>"$SHIM_LOG"; else echo env-sem-token >>"$SHIM_LOG"; fi
      # O cabeçalho não pode valer para outro host.
      outro=$("$REAL_GIT" config --get-urlmatch http.extraheader https://exemplo.invalid/dono/repo || true)
      if [ -z "$outro" ]; then echo cabecalho-so-github >>"$SHIM_LOG"; else echo cabecalho-outro-host >>"$SHIM_LOG"; fi
      # Rastreamento do git (GIT_TRACE_CURL etc.) imprimiria o cabeçalho numa conexão https.
      if env | grep -qE '^(GIT_TRACE|GIT_CURL_VERBOSE)'; then echo trace-ligado >>"$SHIM_LOG"; else echo trace-desligado >>"$SHIM_LOG"; fi
      # Nada do token gravado no repositório de trabalho (config, hooks etc.).
      gd=''
      for a in "$@"; do case $a in --git-dir=*) gd=${a#--git-dir=} ;; esac; done
      if [ -z "$gd" ]; then echo repo-desconhecido >>"$SHIM_LOG"
      elif grep -rqF -e "$SHIM_TOKEN" -e "${esperado#AUTHORIZATION: basic }" "$gd"; then echo repo-com-token >>"$SHIM_LOG"
      else echo repo-sem-token >>"$SHIM_LOG"; fi
    fi
    ;;
esac
exec "$REAL_GIT" "$@"
SHIM
chmod +x "$tmp/shim/git"
git clone -q -b gh-pages "$URL" "$tmp/concorrente"
printf 'outra publicação\n' >"$tmp/concorrente/concorrente.txt"
git -C "$tmp/concorrente" add -A
git -C "$tmp/concorrente" commit -q -m 'publicação concorrente'
conc=$(git -C "$tmp/concorrente" rev-parse HEAD)
: >"$tmp/gatilho"
if PATH="$tmp/shim:$PATH" REAL_GIT="$REAL_GIT" SHIM_CONCORRENTE="$tmp/gatilho" SHIM_REPO_CONC="$tmp/concorrente" SHIM_URL="$URL" \
  bash "$script" publicar --remoto "$URL" --dist "$tmp/build2" --fonte "$m5" >/dev/null 2>&1; then
  falha 'push sobre gh-pages que mudou deveria falhar'
fi
confere 'gh-pages alterado no meio: o push falha e a outra publicação fica' test "$(ponta)" = "$conc"
rg config receive.denyNonFastForwards true

# --- token: só como cabeçalho em variável de ambiente, nunca em argv, arquivo ou saída
token='tok-teste-0123456789abcdef'
token64=$(printf 'x-access-token:%s' "$token" | base64 | tr -d '\n')
: >"$tmp/shim.log"
# Rastreamento ligado no ambiente de quem chama: o script precisa desligá-lo.
saida=$(PATH="$tmp/shim:$PATH" REAL_GIT="$REAL_GIT" SHIM_TOKEN="$token" SHIM_LOG="$tmp/shim.log" PAGES_TOKEN="$token" \
  GIT_TRACE=1 GIT_TRACE_CURL=1 GIT_CURL_VERBOSE=1 GIT_TRACE_PACKET=1 \
  bash "$script" publicar --remoto "$URL" --dist "$tmp/build2" --fonte "$m5" 2>&1)
confere 'com PAGES_TOKEN, publica normalmente' test "$(arv "$(ponta)")" = "$esperada2"
confere 'git recebe o cabeçalho de autenticação para github.com' grep -qx cabecalho-ok "$tmp/shim.log"
confere 'o cabeçalho não vale para outros hosts' \
  todos 'grep -qx cabecalho-so-github "$tmp/shim.log"' 'nao grep -q cabecalho-outro-host "$tmp/shim.log"'
confere 'rastreamento do git fica desligado no push com o cabeçalho' \
  todos 'grep -qx trace-desligado "$tmp/shim.log"' 'nao grep -q trace-ligado "$tmp/shim.log"'
confere 'token não fica gravado no repositório de trabalho durante o push' \
  todos 'grep -qx repo-sem-token "$tmp/shim.log"' 'nao grep -qE "repo-com-token|repo-desconhecido" "$tmp/shim.log"'
confere 'token não aparece na linha de comando do git' \
  todos 'grep -qx argv-limpo "$tmp/shim.log"' 'nao grep -q argv-com-token "$tmp/shim.log"'
confere 'PAGES_TOKEN não chega ao ambiente do git' \
  todos 'grep -qx env-sem-token "$tmp/shim.log"' 'nao grep -q env-com-token "$tmp/shim.log"'
confere 'token não aparece na saída' todos 'nao contem "$saida" "$token"' 'nao contem "$saida" "$token64"'
confere 'token não fica gravado no remoto nem em arquivo temporário' nao grep -rqe "$token" -e "$token64" "$R" "$TMPDIR"
confere 'pastas de trabalho temporárias são apagadas' test -z "$(ls -A "$TMPDIR")"

# No Actions, o GitHub mascara o token, mas não a versão em base64: o script a
# marca como segredo antes de qualquer comando do git, e ela só aparece nessa linha.
resumo_gh="$tmp/resumo.md"
saida=$(GITHUB_ACTIONS=true GITHUB_STEP_SUMMARY="$resumo_gh" PAGES_TOKEN="$token" \
  bash "$script" publicar --remoto "$URL" --dist "$tmp/build3" --fonte "$m5" 2>&1)
confere 'no Actions, o base64 do token é marcado como segredo na primeira linha e não aparece em outra' \
  todos 'test "$(printf "%s\n" "$saida" | sed -n 1p)" = "::add-mask::$token64"' \
  'test "$(printf "%s\n" "$saida" | grep -cF -e "$token64")" = 1' 'nao contem "$saida" "$token"'
confere 'no Actions, o resumo da execução registra a publicação' grep -q '^Publicado: ' "$resumo_gh"

# --- remoto sem gh-pages: a primeira publicação cria o branch
R2="$tmp/novo.git"
git init -q --bare "$R2"
git -C "$tmp/fonte" push -q "file://$R2" HEAD:refs/heads/main
bash "$script" publicar --remoto "file://$R2" --dist "$tmp/build1" --fonte "$m5" --exigir-ponta main >/dev/null
confere 'sem gh-pages, a publicação cria o branch com um commit raiz' \
  test "$(git --git-dir="$R2" rev-list --count refs/heads/gh-pages)" = 1

printf '%d verificações passaram\n' "$n"
