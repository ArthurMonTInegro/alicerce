#!/usr/bin/env bash
# Publica a demonstração estática no branch gh-pages e faz rollback, sem apagar
# o histórico: cada publicação e cada rollback viram um commit novo sobre o
# anterior, enviado sem force push. Usado pelo CI (job pages-publicar) e pelo
# workflow de rollback (.github/workflows/pages.yml); testado por
# scripts/test-publish-pages.sh contra um repositório bare temporário.
#
# Uso:
#   scripts/publish-pages.sh publicar --dist PASTA --fonte SHA_DA_MAIN
#       [--exigir-ponta main] [--remoto URL] [--branch gh-pages] [--execucao URL]
#   scripts/publish-pages.sh rollback [--versao anterior|SHA] [--motivo TEXTO]
#       [--autor NOME] [--remoto URL] [--branch gh-pages] [--execucao URL]
#   scripts/publish-pages.sh listar [--quantas N] [--remoto URL] [--branch gh-pages]
#
# publicar   cria um commit cuja árvore é exatamente o conteúdo de PASTA, com o
#            commit atual do gh-pages como pai. Com --exigir-ponta main, só
#            publica se SHA_DA_MAIN ainda for a ponta da main no remoto (um build
#            mais velho que termina depois de um mais novo não volta o site).
# rollback   cria um commit cuja árvore é a de uma publicação anterior.
#            --versao anterior (padrão): a publicação que estava no ar antes da
#            atual, vinda de outro commit da main; repetir volta mais um passo.
#            --versao SHA: um commit do gh-pages ou o commit da main que gerou a
#            publicação (7 a 40 hex). Só restaura publicações feitas por este
#            script (trailer "Tipo: publicacao"), ou seja, que passaram pelo
#            portão do CI; o commit legado do workflow antigo é recusado.
# listar     mostra as últimas publicações e rollbacks, com o commit da main de
#            cada uma.
#
# Autenticação: se a variável PAGES_TOKEN existir, ela é convertida num
# cabeçalho HTTP passado ao git por variáveis de ambiente (GIT_CONFIG_*), só
# para https://github.com/. O token não vai para a URL, para a linha de comando,
# para .git/config nem para a saída. Sem PAGES_TOKEN o remoto é acessado sem
# credencial (repositório local nos testes).
set -euo pipefail
# Falha dentro de $(...) também interrompe o script (bash 4.4+).
shopt -s inherit_errexit 2>/dev/null || true

# Rastreamento do git imprimiria o cabeçalho de autenticação.
unset GIT_TRACE GIT_TRACE_CURL GIT_TRACE_PACKET GIT_TRACE_PACK_ACCESS GIT_CURL_VERBOSE GIT_TRACE_SETUP || true
export GIT_TERMINAL_PROMPT=0
: "${GIT_AUTHOR_NAME:=github-actions[bot]}"
: "${GIT_AUTHOR_EMAIL:=41898282+github-actions[bot]@users.noreply.github.com}"
: "${GIT_COMMITTER_NAME:=$GIT_AUTHOR_NAME}"
: "${GIT_COMMITTER_EMAIL:=$GIT_AUTHOR_EMAIL}"
export GIT_AUTHOR_NAME GIT_AUTHOR_EMAIL GIT_COMMITTER_NAME GIT_COMMITTER_EMAIL

erro() {
  if [ "${GITHUB_ACTIONS:-}" = true ]; then printf '::error::%s\n' "$*" >&2; else printf 'erro: %s\n' "$*" >&2; fi
  exit 1
}
aviso() {
  if [ "${GITHUB_ACTIONS:-}" = true ]; then printf '::notice::%s\n' "$*"; else printf 'aviso: %s\n' "$*"; fi
}
resumo() {
  printf '%s\n' "$*"
  if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then printf '%s\n' "$*" >>"$GITHUB_STEP_SUMMARY"; fi
}

preparar_autenticacao() {
  local token="${PAGES_TOKEN:-}" basico n
  unset PAGES_TOKEN
  [ -n "$token" ] || return 0
  basico=$(printf 'x-access-token:%s' "$token" | base64 | tr -d '\n')
  token=''
  # O GitHub mascara o token nos logs, mas não a versão em base64.
  if [ "${GITHUB_ACTIONS:-}" = true ]; then printf '::add-mask::%s\n' "$basico"; fi
  n=${GIT_CONFIG_COUNT:-0}
  export "GIT_CONFIG_KEY_$n=http.https://github.com/.extraheader"
  export "GIT_CONFIG_VALUE_$n=AUTHORIZATION: basic $basico"
  export GIT_CONFIG_COUNT=$((n + 1))
}

TRABALHO=''
limpar() { if [ -n "$TRABALHO" ]; then rm -rf "$TRABALHO"; fi; }
trap limpar EXIT

# Repositório de trabalho descartável: o checkout do projeto nunca é tocado.
preparar_trabalho() {
  TRABALHO=$(mktemp -d "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/publicacao.XXXXXX")
  TRABALHO=$(cd "$TRABALHO" && pwd -P)
  git -c init.defaultBranch=publicacao init -q --bare "$TRABALHO/repo.git"
}
g() { git --git-dir="$TRABALHO/repo.git" "$@"; }

# Existência do branch no remoto: 0 existe, 2 não existe, outro código = falha de rede/acesso.
branch_existe() {
  local rc=0
  g ls-remote --exit-code --heads "$REMOTO" "refs/heads/$BRANCH" >/dev/null || rc=$?
  case $rc in
    0) return 0 ;;
    2) return 1 ;;
    *) erro "não foi possível consultar $BRANCH no remoto (código $rc)" ;;
  esac
}

# Traz o branch publicado. Profundidade 1 basta para publicar; o rollback precisa do histórico.
buscar_publicado() {
  local profundidade=$1
  if [ "$profundidade" = tudo ]; then
    g fetch -q --no-tags "$REMOTO" "+refs/heads/$BRANCH:refs/publicado"
  else
    g fetch -q --no-tags --depth="$profundidade" "$REMOTO" "+refs/heads/$BRANCH:refs/publicado"
  fi
  g rev-parse --verify -q 'refs/publicado^{commit}'
}

trailer() { g log -1 --format="%(trailers:key=$2,valueonly,separator=%x20)" "$1" | sed -n 1p | tr -d '[:space:]'; }
# publicacao ou rollback (feitos por este script); legado = commit sem o trailer
# Tipo, deixado pelo workflow antigo (git init + push -f), que publicava sem o
# portão de testes e sem a auditoria de acesso.
tipo_de() { local t; t=$(trailer "$1" Tipo); printf '%s\n' "${t:-legado}"; }
# Fontes iguais: o mesmo sha, ou um prefixo do outro (o legado guardava só 7 caracteres).
mesma_fonte() {
  [ "$1" != desconhecida ] && [ "$2" != desconhecida ] && { [[ $1 == "$2"* ]] || [[ $2 == "$1"* ]]; }
}
fonte_de() {
  local f
  f=$(trailer "$1" Fonte)
  # Publicações anteriores a este script tinham só o assunto "Publica <sha curto>".
  [ -n "$f" ] || f=$(g log -1 --format=%s "$1" | sed -n 's/^Publica \([0-9a-f]\{7,40\}\).*/\1/p')
  printf '%s\n' "${f:-desconhecida}"
}
arvore() { g rev-parse "$1^{tree}"; }
curto() { if [[ $1 =~ ^[0-9a-f]{8,40}$ ]]; then printf '%s\n' "${1:0:7}"; else printf '%s\n' "$1"; fi; }

# Publicação cuja árvore um commit põe no ar: ele mesmo, ou a que um rollback restaurou.
publicacao_de() {
  local c=$1 r
  while [ "$(tipo_de "$c")" = rollback ]; do
    r=$(trailer "$c" Restaura)
    if [ -z "$r" ] || ! g cat-file -e "$r^{commit}" 2>/dev/null; then break; fi
    c=$(g rev-parse "$r^{commit}")
  done
  printf '%s\n' "$c"
}

limpar_linha() {
  local s
  s=$(printf '%s' "$1" | tr '\r\n\t' '   ' | tr -d '\000-\037\177')
  printf '%s' "${s:0:$2}"
}

ler_comuns() {
  REMOTO=${REMOTO:-}
  BRANCH=${BRANCH:-gh-pages}
  EXECUCAO=${EXECUCAO:-}
  if [ -z "$REMOTO" ] && [ -n "${GITHUB_REPOSITORY:-}" ]; then
    REMOTO="${GITHUB_SERVER_URL:-https://github.com}/$GITHUB_REPOSITORY.git"
  fi
  [ -n "$REMOTO" ] || erro 'informe --remoto (ou rode no GitHub Actions)'
  case $REMOTO in *@*) erro '--remoto não pode conter credencial; use PAGES_TOKEN' ;; esac
  [[ $BRANCH =~ ^[A-Za-z0-9._/-]+$ ]] || erro "branch inválido: $BRANCH"
}

cmd_publicar() {
  local dist='' fonte='' ponta_de='' ponta pai='' tree commit msg sobre
  while [ $# -gt 0 ]; do
    case $1 in
      --dist) dist=${2:-}; shift 2 ;;
      --fonte) fonte=${2:-}; shift 2 ;;
      --exigir-ponta) ponta_de=${2:-}; shift 2 ;;
      --remoto) REMOTO=${2:-}; shift 2 ;;
      --branch) BRANCH=${2:-}; shift 2 ;;
      --execucao) EXECUCAO=${2:-}; shift 2 ;;
      *) erro "opção desconhecida: $1" ;;
    esac
  done
  ler_comuns
  [[ $fonte =~ ^[0-9a-f]{40}$ ]] || erro '--fonte precisa ser o sha completo (40 hex) do commit da main'
  if [ -z "$dist" ] || [ ! -d "$dist" ]; then erro "pasta do build não encontrada: ${dist:-(vazia)}"; fi
  dist=$(cd "$dist" && pwd -P)
  [ -f "$dist/index.html" ] || erro "$dist não tem index.html; recusando publicar um build incompleto"
  # Um .git dentro do build viraria submódulo no gh-pages.
  if [ -n "$(find "$dist" -name .git -print -quit)" ]; then erro "$dist contém uma pasta .git; recusando publicar"; fi
  if [ -n "$ponta_de" ] && [[ ! $ponta_de =~ ^[A-Za-z0-9._/-]+$ ]]; then erro "branch inválido: $ponta_de"; fi

  preparar_autenticacao
  preparar_trabalho

  if [ -n "$ponta_de" ]; then
    ponta=$(g ls-remote --heads "$REMOTO" "refs/heads/$ponta_de" | cut -f1)
    [ -n "$ponta" ] || erro "não foi possível ler a ponta de $ponta_de no remoto"
    if [ "$ponta" != "$fonte" ]; then
      aviso "Não publicado: $ponta_de andou para $(curto "$ponta") depois deste build ($(curto "$fonte")). A execução do commit mais novo publica quando os testes dela passarem."
      resumo "Publicação pulada: $(curto "$fonte") não é mais a ponta de $ponta_de ($(curto "$ponta"))."
      return 0
    fi
  fi

  if branch_existe; then
    pai=$(buscar_publicado 1)
  else
    aviso "$BRANCH não existe no remoto; a primeira publicação cria o branch."
  fi

  # GitHub Pages servindo a partir de um branch roda o Jekyll sem este arquivo.
  [ -e "$dist/.nojekyll" ] || : >"$dist/.nojekyll"
  # Índice novo e vazio: a árvore do commit é exatamente a pasta (arquivos removidos somem).
  GIT_INDEX_FILE="$TRABALHO/indice" git -C "$dist" --git-dir="$TRABALHO/repo.git" --work-tree="$dist" \
    -c core.autocrlf=false -c core.safecrlf=false add -A -f
  tree=$(GIT_INDEX_FILE="$TRABALHO/indice" g write-tree)

  if [ -n "$pai" ] && [ "$tree" = "$(arvore "$pai")" ]; then
    aviso "Nada mudou: o conteúdo de $(curto "$fonte") já é o que está no ar ($(curto "$pai"))."
    resumo "Nada a publicar: o gh-pages ($(curto "$pai")) já tem exatamente este build."
    return 0
  fi

  msg="$TRABALHO/mensagem"
  {
    printf 'Publica %s da main\n\n' "$(curto "$fonte")"
    printf 'Build estático da demonstração gerado do commit %s da main.\n\n' "$fonte"
    printf 'Fonte: %s\nTipo: publicacao\n' "$fonte"
    if [ -n "$EXECUCAO" ]; then printf 'Execucao: %s\n' "$(limpar_linha "$EXECUCAO" 300)"; fi
  } >"$msg"
  if [ -n "$pai" ]; then
    commit=$(g commit-tree --no-gpg-sign "$tree" -p "$pai" -F "$msg")
  else
    commit=$(g commit-tree --no-gpg-sign "$tree" -F "$msg")
  fi
  # Sem "+" e sem --force: se o gh-pages andou desde a leitura, o push falha em vez de sobrescrever.
  g push -q --no-verify "$REMOTO" "$commit:refs/heads/$BRANCH"
  if [ -n "$pai" ]; then sobre="sobre $(curto "$pai")"; else sobre='primeiro commit do branch'; fi
  resumo "Publicado: commit $(curto "$commit") no $BRANCH ($sobre), gerado de $(curto "$fonte") da main."
}

cmd_rollback() {
  local versao=anterior motivo='' autor='' tip alvo='' base cand tree_tip c ftip falvo msg commit
  while [ $# -gt 0 ]; do
    case $1 in
      --versao) versao=${2:-}; shift 2 ;;
      --motivo) motivo=${2:-}; shift 2 ;;
      --autor) autor=${2:-}; shift 2 ;;
      --remoto) REMOTO=${2:-}; shift 2 ;;
      --branch) BRANCH=${2:-}; shift 2 ;;
      --execucao) EXECUCAO=${2:-}; shift 2 ;;
      *) erro "opção desconhecida: $1" ;;
    esac
  done
  ler_comuns
  versao=$(printf '%s' "$versao" | tr -d '[:space:]' | tr 'A-F' 'a-f')
  [ "$versao" = anterior ] || [[ $versao =~ ^[0-9a-f]{7,40}$ ]] ||
    erro 'versão inválida: use "anterior" ou um sha (7 a 40 caracteres hexadecimais)'
  motivo=$(limpar_linha "$motivo" 200)
  autor=$(printf '%s' "$autor" | tr -cd 'A-Za-z0-9._[]-' | cut -c1-80)

  preparar_autenticacao
  preparar_trabalho
  branch_existe || erro "$BRANCH não existe no remoto; não há o que restaurar"
  tip=$(buscar_publicado tudo)
  tree_tip=$(arvore "$tip")

  if [ "$versao" = anterior ]; then
    # A publicação que estava no ar antes da que está no ar agora (repetir volta mais um passo).
    # Pula as que vieram do mesmo commit da main que está no ar (um re-run gera
    # outra árvore só por causa da data do sitemap.xml, com o mesmo código).
    base=$(publicacao_de "$tip")
    ftip=$(fonte_de "$base")
    while g rev-parse -q --verify "$base^1" >/dev/null; do
      cand=$(publicacao_de "$(g rev-parse "$base^1")")
      if [ "$(arvore "$cand")" != "$tree_tip" ] && ! mesma_fonte "$(fonte_de "$cand")" "$ftip"; then alvo=$cand; break; fi
      base=$cand
    done
    [ -n "$alvo" ] || erro "não há publicação anterior a $(curto "$base") no histórico do $BRANCH"
  else
    if c=$(g rev-parse -q --verify "$versao^{commit}" 2>/dev/null) && g merge-base --is-ancestor "$c" "$tip"; then
      alvo=$(publicacao_de "$c")
    else
      for c in $(g rev-list --first-parent "$tip"); do
        [ "$(tipo_de "$c")" = rollback ] && continue
        if mesma_fonte "$(fonte_de "$c")" "$versao"; then
          alvo=$c
          break
        fi
      done
    fi
    [ -n "$alvo" ] || erro "a versão $versao não é um commit do $BRANCH nem o commit da main de uma publicação; rode com listar para ver as opções"
  fi

  # Só volta ao ar o que passou pelo portão (testes e auditoria de acesso). O legado
  # (workflow antigo ou push à mão, sem o trailer Tipo) nunca passou pela auditoria.
  if [ "$(tipo_de "$alvo")" != publicacao ]; then
    erro "a versão $(curto "$alvo") ($(g log -1 --format=%s "$alvo" | tr -cd '[:alnum:] ._-')) não foi publicada pelo CI (veio do workflow antigo ou de um push feito à mão), então não passou pelo portão de testes nem pela auditoria de acesso; o rollback só restaura publicações feitas pelo CI. Para voltar o código, reverta o commit na main."
  fi

  if [ "$(arvore "$alvo")" = "$tree_tip" ]; then
    aviso "A versão pedida ($(curto "$alvo")) já é a que está no ar; nada a fazer."
    resumo "Rollback sem efeito: $(curto "$alvo") já está no ar."
    return 0
  fi

  ftip=$(fonte_de "$(publicacao_de "$tip")")
  falvo=$(fonte_de "$alvo")
  msg="$TRABALHO/mensagem"
  {
    printf 'Rollback: volta para a publicação %s (main %s)\n\n' "$(curto "$alvo")" "$(curto "$falvo")"
    printf 'Tira do ar %s (main %s) e põe de volta a árvore de %s: %s\n' \
      "$(curto "$tip")" "$(curto "$ftip")" "$(curto "$alvo")" "$(g log -1 --format=%s "$alvo")"
    if [ -n "$motivo" ]; then printf 'Motivo: %s\n' "$motivo"; fi
    printf '\nFonte: %s\nTipo: rollback\nRestaura: %s\nSubstitui: %s\n' "$falvo" "$alvo" "$tip"
    if [ -n "$autor" ]; then printf 'Pedido-por: %s\n' "$autor"; fi
    if [ -n "$EXECUCAO" ]; then printf 'Execucao: %s\n' "$(limpar_linha "$EXECUCAO" 300)"; fi
  } >"$msg"
  commit=$(g commit-tree --no-gpg-sign "$(arvore "$alvo")" -p "$tip" -F "$msg")
  g push -q --no-verify "$REMOTO" "$commit:refs/heads/$BRANCH"
  resumo "Rollback feito: commit $(curto "$commit") no $BRANCH põe no ar a publicação $(curto "$alvo") (main $(curto "$falvo")) no lugar de $(curto "$tip") (main $(curto "$ftip"))."
}

cmd_listar() {
  local quantas=20 tip c data assunto tipo fonte marca
  while [ $# -gt 0 ]; do
    case $1 in
      --quantas) quantas=${2:-}; shift 2 ;;
      --remoto) REMOTO=${2:-}; shift 2 ;;
      --branch) BRANCH=${2:-}; shift 2 ;;
      *) erro "opção desconhecida: $1" ;;
    esac
  done
  ler_comuns
  [[ $quantas =~ ^[0-9]{1,4}$ ]] || erro '--quantas precisa ser um número'
  preparar_autenticacao
  preparar_trabalho
  branch_existe || erro "$BRANCH não existe no remoto"
  tip=$(buscar_publicado tudo)
  resumo "### Histórico do $BRANCH (mais recente primeiro)"
  resumo ''
  resumo "| Commit do $BRANCH | Data (UTC) | Tipo | Commit da main | Descrição |"
  resumo '|---|---|---|---|---|'
  for c in $(g rev-list --first-parent -n "$quantas" "$tip"); do
    data=$(TZ=UTC g log -1 --date=format-local:'%Y-%m-%d %H:%M' --format=%cd "$c")
    assunto=$(g log -1 --format=%s "$c" | tr '|' '/')
    tipo=$(tipo_de "$c")
    fonte=$(fonte_de "$c")
    marca=''
    [ "$c" = "$tip" ] && marca=' (no ar)'
    resumo "| $(curto "$c")$marca | $data | $tipo | $(curto "$fonte") | $assunto |"
  done
}

[ $# -ge 1 ] || erro 'uso: publish-pages.sh publicar|rollback|listar [opções]'
acao=$1
shift
case $acao in
  publicar) cmd_publicar "$@" ;;
  rollback) cmd_rollback "$@" ;;
  listar) cmd_listar "$@" ;;
  *) erro "ação desconhecida: $acao (use publicar, rollback ou listar)" ;;
esac
