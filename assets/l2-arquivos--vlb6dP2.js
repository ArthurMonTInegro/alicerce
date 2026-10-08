var e={id:`l2-arquivos`,moduleId:`m2-3`,title:`Arquivos e dados persistentes`,titleEn:`Files and persistent data`,summary:`Ler e escrever arquivos de texto, CSV e JSON com segurança usando with.`,minutes:30,objectives:[`Abrir arquivos com with open(...)`,`Ler linha a linha e escrever`,`Usar os módulos csv e json`,`Entender encoding`],skills:[`prog-arquivos`],terms:[{pt:`abrir`,en:`open`,def:`Obter acesso a um arquivo para ler ou escrever.`},{pt:`modo`,en:`mode`,def:`"r" ler, "w" escrever (apaga), "a" acrescentar.`},{pt:`gerenciador de contexto`,en:`context manager`,def:`Estrutura with que garante que o arquivo seja fechado.`},{pt:`serializar`,en:`serialize`,def:`Transformar dados em texto/bytes para guardar ou enviar (ex.: JSON).`},{pt:`JSON`,en:`JSON (JavaScript Object Notation)`,def:`Formato de texto para dados estruturados, usado em APIs.`}],references:[`python-docs`,`python-tutorial`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:'Variáveis somem quando o programa termina. Para **persistir** dados, gravamos em **arquivos**. O jeito seguro em Python é `with open(caminho, modo, encoding="utf-8") as f:` — o `with` fecha o arquivo automaticamente, mesmo se der erro.'}]},{stage:`explicacao`,blocks:[{type:`md`,text:'- Modos: `"r"` (ler, padrão), `"w"` (escrever — **apaga** o conteúdo anterior), `"a"` (acrescentar no fim).\n- Ler tudo: `f.read()`; ler linha a linha: `for linha in f:` (eficiente para arquivos grandes).\n- Escrever: `f.write("texto\\n")` — você precisa colocar o `\\n`.\n- **Sempre** informe `encoding="utf-8"`: o padrão varia entre sistemas (no Windows pode ser outro), e é daí que vêm os "Ã§".\n- **JSON**: `json.dump(dados, f)` grava; `json.load(f)` lê. É o formato das APIs web (Nível 6).'}]},{stage:`exemplo`,blocks:[{type:`code`,lang:`python`,code:`import json

tarefas = [{"titulo": "estudar listas", "feita": True}, {"titulo": "praticar arquivos", "feita": False}]
with open("tarefas.json", "w", encoding="utf-8") as f:
    json.dump(tarefas, f, ensure_ascii=False, indent=2)

with open("tarefas.json", encoding="utf-8") as f:
    print(f.read())

with open("tarefas.json", encoding="utf-8") as f:
    carregadas = json.load(f)
print(carregadas[1]["titulo"])`,runnable:!0}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`import csv

with open("notas.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["nome", "nota"])
    w.writerows([["Ana", 9], ["Bia", 7.5], ["Caio", 8]])

with open("notas.csv", encoding="utf-8") as f:
    for linha in csv.DictReader(f):
        print(linha["nome"], float(linha["nota"]))`,runnable:!0}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e2-file-1`,kind:`mcq`,prompt:'Você abriu um arquivo com dados importantes usando `open("dados.txt", "w")`. O que aconteceu com o conteúdo antigo?',difficulty:`facil`,skills:[`prog-arquivos`],hints:[`"w" de *write*... e o que acontece com o que já existia?`],explanation:`O modo "w" trunca o arquivo (apaga tudo) ao abrir. Para acrescentar, use "a".`,options:[{text:`Foi mantido, e o novo texto vai para o fim`,feedback:`Esse é o modo "a" (append).`},{text:`Foi apagado assim que o arquivo foi aberto`,correct:!0,feedback:`Isso. Cuidado com "w"!`},{text:`O Python dá erro porque o arquivo já existe`,feedback:`Dar erro se existir é o modo "x".`},{text:`Fica salvo em um backup automático`,feedback:`Não há backup automático.`}]}},{type:`exercise`,exercise:{id:`e2-file-2`,kind:`code`,lang:`python`,prompt:"Escreva `salvar_e_contar(caminho, linhas)` que grava cada string da lista em uma linha do arquivo e depois **lê o arquivo** e devolve quantas linhas não vazias ele tem.",difficulty:`intermediario`,skills:[`prog-arquivos`],hints:[`Use dois blocos with: um para escrever ("w"), outro para ler.`,'Ao escrever, adicione "\\n" a cada linha. Ao ler, use `linha.strip()` para ignorar as vazias.'],explanation:'Escrever e ler de volta é como testar persistência. `strip()` remove o "\\n" e espaços, então linhas só com espaços contam como vazias.',starter:`def salvar_e_contar(caminho, linhas):
    pass
`,solution:`def salvar_e_contar(caminho, linhas):
    with open(caminho, "w", encoding="utf-8") as f:
        for l in linhas:
            f.write(l + "\\n")
    with open(caminho, encoding="utf-8") as f:
        return sum(1 for l in f if l.strip())`,tests:[{name:`conta não vazias`,code:`assert salvar_e_contar("t.txt", ["a", "", "b", "  "]) == 2`},{name:`arquivo foi gravado`,code:`salvar_e_contar("u.txt", ["olá"])
assert open("u.txt", encoding="utf-8").read() == "olá\\n"`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e2-file-desafio`,kind:`code`,lang:`python`,prompt:"Escreva `media_por_aluno(caminho)` que lê um CSV com colunas `nome,nota` (um aluno pode aparecer várias vezes) e devolve um dict `{nome: média}` com médias arredondadas para 2 casas.",difficulty:`desafio`,skills:[`prog-arquivos`,`prog-dicionarios`],hints:["Use `csv.DictReader` para ler cada linha como dict.",`Guarde, por aluno, a soma e a quantidade (ou a lista de notas).`,"`round(valor, 2)` no final."],explanation:"Agrupar e agregar (*group by*) é a operação mais comum em análise de dados — você vai vê-la de novo em SQL (`GROUP BY`) no Nível 7.",starter:`import csv

def media_por_aluno(caminho):
    pass
`,solution:`import csv

def media_por_aluno(caminho):
    notas = {}
    with open(caminho, encoding="utf-8") as f:
        for linha in csv.DictReader(f):
            notas.setdefault(linha["nome"], []).append(float(linha["nota"]))
    return {n: round(sum(v) / len(v), 2) for n, v in notas.items()}`,tests:[{name:`agrega por aluno`,code:`open("n.csv", "w", encoding="utf-8").write("nome,nota\\nAna,9\\nBia,7\\nAna,8\\n")
assert media_por_aluno("n.csv") == {"Ana": 8.5, "Bia": 7.0}`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:"**Lista de tarefas (parte 3)**: salve as tarefas em `tarefas.json` ao sair e carregue ao abrir. Se o arquivo não existir, comece com lista vazia (você vai precisar de `try/except FileNotFoundError` — próxima lição)."},{type:`project`,projectId:`p2-todo`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- \`with open(..., encoding="utf-8")\` fecha o arquivo sozinho.
- "w" apaga, "a" acrescenta, "r" lê.
- csv e json da biblioteca padrão resolvem formatos comuns.`}]}],cards:[{id:`l2-arquivos#1`,front:"Por que usar `with` ao abrir arquivos?",back:`Garante que o arquivo seja fechado, mesmo se ocorrer uma exceção.`},{id:`l2-arquivos#2`,front:`Por que sempre passar encoding="utf-8"?`,back:`Porque o padrão varia entre sistemas operacionais e causa erros de acentuação.`}]};export{e as default};
//# sourceMappingURL=l2-arquivos--vlb6dP2.js.map