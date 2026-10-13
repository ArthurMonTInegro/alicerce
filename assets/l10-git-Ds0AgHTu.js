var e={id:`l10-git`,moduleId:`m10-1`,title:`Git e GitHub: controle de versão`,titleEn:`Git and GitHub: version control`,summary:`Commits, branches, merge, repositórios remotos e o fluxo de pull requests.`,minutes:45,objectives:[`Entender o modelo do Git (snapshots, working tree, staging, repositório)`,`Usar status, add, commit, log, diff`,`Criar branches, fazer merge e resolver conflitos`,`Trabalhar com remotos e pull requests`],skills:[`tools-git`],terms:[{pt:`controle de versão`,en:`version control`,def:`Registrar a história das mudanças de um projeto.`},{pt:`repositório`,en:`repository (repo)`,def:`Projeto com toda a sua história no Git.`},{pt:`confirmação / commit`,en:`commit`,def:`Um snapshot do projeto com mensagem, autor e data.`},{pt:`área de preparação`,en:`staging area / index`,def:`Onde você escolhe o que entra no próximo commit.`},{pt:`ramificação`,en:`branch`,def:`Linha de desenvolvimento independente; um ponteiro para um commit.`},{pt:`mesclar`,en:`merge`,def:`Juntar o trabalho de duas branches.`},{pt:`conflito`,en:`merge conflict`,def:`Quando as duas branches mudaram as mesmas linhas.`},{pt:`pedido de integração`,en:`pull request (PR)`,def:`Proposta de mudança revisada antes de entrar na branch principal.`}],references:[`pro-git`,`github-docs`,`missing-semester`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`**Git** guarda a história do seu projeto como uma sequência de **snapshots** (*commits*). Você pode voltar no tempo, trabalhar em várias ideias em paralelo (**{{branches|branches}}**) e colaborar sem sobrescrever o trabalho dos outros. **GitHub** hospeda repositórios Git e adiciona colaboração: pull requests, revisões, issues, CI.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:"**As três áreas**: **working tree** (seus arquivos) → `git add` → **staging area** → `git commit` → **repositório** (história).\n\nFluxo diário:"},{type:`code`,lang:`bash`,code:`git status                     # o que mudou?
git diff                       # quais linhas?
git add src/tarefas.py         # prepara
git commit -m "Adiciona prioridade às tarefas"
git log --oneline --graph      # história

git switch -c feature/filtro   # nova branch
# ... trabalha, commita ...
git switch main
git merge feature/filtro       # junta

git push -u origin feature/filtro   # envia ao GitHub e abre um PR`,runnable:!1},{type:`md`,text:'**Conflitos** aparecem quando duas branches mudam as mesmas linhas. O Git marca o arquivo com `<<<<<<<`, `=======` e `>>>>>>>`: você escolhe o resultado, remove as marcas, faz `git add` e `git commit`.\n\n**Boas mensagens de commit**: imperativo, curto, explica o **porquê** quando não é óbvio. *"Corrige divisão por zero na média"*, não *"ajustes"*.'},{type:`callout`,tone:`english`,text:`Git é todo em inglês, e o vocabulário vale para entrevistas: *commit, push, pull, fetch, merge, rebase, branch, checkout/switch, stash, cherry-pick, tag, remote, origin, upstream, fork, pull request, code review, "LGTM" (looks good to me), "nit" (detalhe pequeno), "WIP" (work in progress)*.`,title:`English corner`},{type:`callout`,tone:`warn`,text:"Nunca faça commit de senhas, tokens ou arquivos `.env`. Use `.gitignore`. Se vazar, considere a credencial comprometida: **revogue** — apagar o commit não basta, a história e os clones guardam tudo."}]},{stage:`exemplo`,blocks:[{type:`md`,text:"**Fluxo de pull request** (GitHub flow): `main` sempre funcional → crie uma branch para cada mudança → commits pequenos → push → abra um PR → CI roda os testes → alguém revisa → ajustes → merge → apague a branch."}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`# Um mini-Git: cada commit guarda o hash do conteúdo e o do pai.
import hashlib, json

def fazer_commit(arquivos, pai, msg):
    conteudo = json.dumps({"arquivos": arquivos, "pai": pai, "msg": msg}, sort_keys=True)
    return hashlib.sha1(conteudo.encode()).hexdigest()[:7], conteudo

c1, _ = fazer_commit({"a.txt": "oi"}, None, "primeiro commit")
c2, _ = fazer_commit({"a.txt": "oi, mundo"}, c1, "amplia saudação")
print(c1, "<-", c2)
# Mudar qualquer coisa no passado muda todos os hashes seguintes: a história é à prova de adulteração.`,runnable:!0}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e10-git-1`,kind:`parsons`,lang:`bash`,prompt:`Ordene os comandos para criar uma branch, commitar uma alteração e enviá-la ao GitHub.`,difficulty:`facil`,skills:[`tools-git`],hints:[`Primeiro a branch; o add vem antes do commit; o push por último.`],explanation:`switch -c → (editar) → add → commit → push.`,lines:[`git switch -c feature/login`,`git add login.py`,`git commit -m "Adiciona tela de login"`,`git push -u origin feature/login`]}},{type:`exercise`,exercise:{id:`e10-git-2`,kind:`mcq`,prompt:'Você editou `app.py` e rodou `git commit -m "corrige bug"`, mas o Git disse *"nothing added to commit but untracked files present"*... ou *"no changes added to commit"*. O que faltou?',difficulty:`facil`,skills:[`tools-git`,`en-leitura-erros`],hints:[`*no changes added* = nenhuma mudança adicionada... adicionada onde?`],explanation:"Faltou `git add app.py` para colocar a mudança na staging area. (Ou use `git commit -am`, que inclui arquivos já rastreados.)",options:[{text:`git push`,feedback:`Push envia commits já feitos.`},{text:`git add app.py`,correct:!0,feedback:`Isso: preparar a mudança antes do commit.`},{text:`git init`,feedback:`O repositório já existe.`},{text:`git merge`,feedback:`Não há branches a juntar.`}]}},{type:`exercise`,exercise:{id:`e10-git-3`,kind:`mcq`,prompt:`Qual a melhor mensagem de commit?`,difficulty:`facil`,skills:[`tools-git`],hints:[`Imperativo, específico, curto.`],explanation:`Mensagens específicas no imperativo dizem o que o commit faz quando aplicado e ajudam a ler a história anos depois.`,options:[{text:`mudanças`,feedback:`Não diz nada.`},{text:`Corrige cálculo de média quando a lista está vazia`,correct:!0,feedback:`Isso: o quê e onde, no imperativo.`},{text:`arrumei umas coisas e tbm o bug daquele dia`,feedback:`Vaga e mistura assuntos.`},{text:`WIP WIP WIP`,feedback:`Aceitável numa branch pessoal, nunca na história principal.`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e10-git-desafio`,kind:`code`,lang:`python`,prompt:"O Git encontra o **ancestral comum** de duas branches para fazer o merge. Escreva `ancestral_comum(pais, a, b)`:\n`pais` é um dict commit → lista de pais (commits de merge têm 2 pais; o primeiro tem []). Devolva o ancestral\ncomum de a e b mais próximo de a (por BFS a partir de a), considerando que um commit é ancestral de si mesmo.",difficulty:`desafio`,skills:[`tools-git`,`ed-grafos`],hints:[`A história do Git é um grafo acíclico dirigido (DAG).`,`Calcule o conjunto de todos os ancestrais de b. Depois faça BFS a partir de a e devolva o primeiro que está nesse conjunto.`],explanation:`É o *merge base*: o Git compara as duas pontas com ele (merge de três vias). Você usou BFS (Nível 3) num caso real.`,starter:`from collections import deque

def ancestral_comum(pais, a, b):
    pass
`,solution:`from collections import deque

def ancestral_comum(pais, a, b):
    anc_b = set()
    pilha = [b]
    while pilha:
        c = pilha.pop()
        if c not in anc_b:
            anc_b.add(c)
            pilha.extend(pais.get(c, []))
    fila, vistos = deque([a]), {a}
    while fila:
        c = fila.popleft()
        if c in anc_b:
            return c
        for p in pais.get(c, []):
            if p not in vistos:
                vistos.add(p)
                fila.append(p)
    return None`,tests:[{name:`branches divergentes`,code:`pais = {"A": [], "B": ["A"], "C": ["B"], "D": ["B"], "E": ["D"]}
assert ancestral_comum(pais, "C", "E") == "B"`},{name:`um é ancestral do outro`,code:`pais = {"A": [], "B": ["A"], "C": ["B"]}
assert ancestral_comum(pais, "C", "B") == "B"`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:"**Projeto contínuo: tudo no GitHub.** Crie um repositório para cada projeto da trilha (calculadora, tarefas, cadastro, portfólio...), com README, `.gitignore`, commits pequenos e pelo menos um PR revisado por você mesmo. Seu GitHub vira seu portfólio."},{type:`project`,projectId:`p4-portfolio`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Working tree → staging (add) → repositório (commit).
- Branches são ponteiros baratos; merge junta; conflitos se resolvem à mão.
- GitHub flow: branch → PR → revisão + CI → merge.
- Nunca commite segredos.`}]}],cards:[{id:`l10-git#1`,front:`Para que serve a staging area?`,back:`Escolher exatamente o que entra no próximo commit.`},{id:`l10-git#2`,front:`O que é uma branch no Git?`,back:`Um ponteiro móvel para um commit; uma linha de desenvolvimento independente.`},{id:`l10-git#3`,front:`Vazou um token num commit público. O que fazer?`,back:`Revogar o token imediatamente; apagar o commit não basta.`}]};export{e as default};
//# sourceMappingURL=l10-git-Ds0AgHTu.js.map