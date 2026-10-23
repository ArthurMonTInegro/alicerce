# Piloto: a jornada gratuita e a primeira continuação

Situação em 23/10/2026: **preparado, não executado.** Nenhum convite foi enviado, nenhum participante foi registrado e nenhum dado foi coletado. Recrutar, convidar e conduzir as conversas cabe ao Arthur; a análise dos arquivos pode ser feita por qualquer pessoa com o repositório.

Esta é a primeira rodada com pessoas reais: 8 a 12 participantes. Ela junta a observação de uso (UP18), uma parte das entrevistas (UP20) e prepara o piloto maior de 30 a 50 pessoas (UP21), que vem depois, já corrigido pelo que esta mostrar.

| Peça do kit | Onde |
|---|---|
| Perfil de quem convidar | [Quem convidar](#quem-convidar) |
| Convite pronto | [Convite](#convite) |
| Termo de consentimento | [Termo de consentimento](#termo-de-consentimento) |
| Mensagem de início | [Mensagem de início](#mensagem-de-início) |
| Roteiro da sessão observada | [Roteiro de observação](#roteiro-de-observação) |
| Tarefas de transferência | [Tarefas de transferência](#tarefas-de-transferência) |
| Registro de dificuldades | `docs/piloto/registro-dificuldades.csv`, explicado em [Registro de dificuldades](#registro-de-dificuldades) |
| Anotações das conversas | `docs/piloto/conversas.csv`, explicado em [Anotações das conversas](#anotações-das-conversas) |
| Exportação e análise | [Exportação e análise](#exportação-e-análise) |
| Critérios de prioridade | [O que corrigir primeiro](#o-que-corrigir-primeiro) |

## O que se quer saber

1. Quem nunca programou consegue fazer a trilha gratuita (níveis 0 e 1) sozinho? Onde trava?
2. Quem termina o gratuito começa o Python? O começo do Python segura a pessoa?
3. Quais dificuldades se repetem, para decidir o que corrigir e o que aprofundar.
4. Como a pessoa reage ao preço previsto, sem que nada seja vendido ou cobrado.

O que esta rodada **não mede**: se a pessoa lembra do que aprendeu um mês depois (isso pede mais tempo e a métrica de 30 dias do servidor), se ela pagaria de verdade (só um pagamento mostra isso), quanto tempo as lições levam de fato (o site só tem estimativas, e o tempo exportado é aproximado; ver [Limites](#limites)) e se os números valem para outros públicos (a amostra é pequena e escolhida).

## Formato

- **Onde:** na demonstração pública, https://arthurmontinegro.github.io/alicerce/. Não precisa de conta, de servidor nem de nenhum gasto. Durante a transição, os níveis 2 a 14 estão abertos, então a continuação já está lá.
- **Qual versão:** a que está publicada, de 22/10/2026 (commit 5243541). As correções do tutor local feitas depois (lote 5b, branch `profissionalizacao`) só chegam aos participantes se forem publicadas antes do piloto; essa decisão é do Arthur.
- **Quanto tempo:** duas a três semanas, no ritmo de cada pessoa.

## A jornada

| Trecho | Conteúdo | Tamanho |
|---|---|---|
| Gratuito | Nível 0, Introdução à Computação (7 lições), e nível 1, Lógica de Programação (8 lições, em Python) | 15 lições e 54 exercícios. O site estima cerca de 9h30; é a estimativa do conteúdo, não tempo medido |
| Primeira continuação | Módulos m2-1 (Python e seu ambiente) e m2-2 (Coleções): `l2-por-que-python`, `l2-listas` e `l2-dicionarios` | 3 lições e 10 exercícios. Estimativa do site: cerca de 1h30 |

A continuação é o começo do que vai ser Premium. No piloto ela está aberta, como para todo mundo durante a transição.

## Quem convidar

**Perfil:** adultos (18 anos ou mais) que querem aprender programação por conta própria e nunca programaram, ou só tentaram e pararam.

Para uma rodada de 10 pessoas, procure esta mistura (com 8 ou 12, mantenha as proporções):

| Critério | Quantas pessoas |
|---|---|
| Vai estudar mais no celular | pelo menos 4 |
| Vai estudar mais no computador | pelo menos 4 |
| Já tentou outro curso ou site e parou | pelo menos 3 |
| Nunca programou nada | pelo menos 4 |

**Não convide:** quem trabalha ou estuda programação (além do primeiro semestre), amigos próximos e família (tendem a elogiar), quem ajudou a fazer a Alicerce, menores de 18 anos.

**Três perguntas antes de convidar:** "Você já programou?", "Nas próximas três semanas, você tem umas duas ou três horas por semana para estudar?" e "Você estudaria mais no celular ou no computador?".

**Quem sai no meio não é substituído.** O abandono é um dos resultados que se quer ver. Pela mesma razão, nenhum agradecimento depende de terminar a trilha.

## Convite

Texto para mandar por mensagem ou e-mail. Troque o que está entre colchetes. Não acrescente promessa de emprego, de certificado ou de prazo para aprender.

> Oi, [nome]! Estou testando a Alicerce, um site gratuito para aprender computação e programação do zero, por conta própria. Procuro algumas pessoas que nunca programaram (ou que tentaram e pararam) para usar o site por duas ou três semanas, no seu ritmo, e me contar onde ficou difícil.
>
> Seria assim: você estuda pelo site quando puder, conversa comigo duas ou três vezes (por vídeo ou mensagem, uns 20 a 45 minutos) e uma vez por semana me manda um arquivo que o próprio site gera com o seu progresso. Não precisa instalar nada nem criar conta, e nada é cobrado.
>
> É um teste: o site ainda está sendo melhorado, e é justamente o que você achar difícil que me interessa. Se topar, me responda que eu mando os detalhes de como uso as informações.
>
> [seu nome]

## Termo de consentimento

Texto para mandar a quem respondeu ao convite, completando o que está entre colchetes. Guarde o "aceito" de cada pessoa. É uma orientação para o desenho do piloto, não um parecer jurídico.

> Você está convidado a testar a Alicerce, uma plataforma gratuita para aprender computação por conta própria, durante duas a três semanas, no seu ritmo.
>
> **Quem pode participar:** pessoas com 18 anos ou mais.
>
> **O que você faz:** estuda pelo site, responde dois questionários curtos, conversa comigo duas ou três vezes por vídeo ou mensagem e, no fim de cada semana, me manda o arquivo de progresso que o próprio site gera (Progresso > Exportar JSON).
>
> **O que eu recebo:** quais lições e exercícios você fez, se acertou, quantas dicas usou e quanto tempo levou, e o resultado do Diagnóstico, se você fizer; suas respostas aos questionários; minhas anotações das conversas. Não recebo sua senha, o código que você escreveu nem nenhum dado de pagamento. Nada é cobrado.
>
> **Como uso:** só para melhorar a Alicerce. Seu nome não aparece nos dados: você recebe um código. As conversas por vídeo só são gravadas se você autorizar, e você pode participar sem gravação.
>
> **Seus direitos:** você pode sair quando quiser, sem explicar por quê, e pedir que eu apague seus dados; é só responder esta mensagem. Os dados ficam guardados até [data] e depois são apagados.
>
> Responsável: [nome e contato].
>
> Se você tem 18 anos ou mais e concorda, responda "aceito".

## Mensagem de início

Mandar depois do "aceito", junto com o questionário inicial. Troque o código da pessoa.

> Que bom que você topou! Seu código no teste é **[P01]**. Para começar:
>
> 1. Abra https://arthurmontinegro.github.io/alicerce/ e vá em **Trilha**. Comece pelo **nível 0**, na primeira lição.
> 2. Estude sempre **no mesmo aparelho e no mesmo navegador**, e **não use aba anônima**. O progresso fica guardado no navegador, não numa conta.
> 3. No fim de cada semana, abra **Progresso** e toque em **Exportar JSON**. O arquivo vai para a pasta de downloads (no celular, procure em "Downloads" ou "Arquivos"). Me mande esse arquivo por aqui, como documento.
> 4. Se for ficar mais de uma semana sem abrir o site, exporte antes. Em alguns navegadores, principalmente no iPhone, o site pode perder o progresso guardado depois de vários dias sem ser aberto.
> 5. Travou? Use as dicas do próprio site e siga em frente quando quiser. Pode me contar, mas eu vou mais perguntar do que explicar: é assim que eu descubro o que precisa melhorar.

**Para quem conduz:** o "Exportar JSON" foi testado automaticamente só no Chromium de computador. Faça a primeira exportação junto com a pessoa, na sessão observada, e confira se o arquivo chegou e se a análise o lê ([Navegadores](#navegadores-e-o-que-foi-verificado)).

## Calendário

### Antes

1. Convidar, mandar o termo e guardar o aceite de cada pessoa.
2. Dar um código a cada pessoa: P01, P02, P03... A lista que liga código e nome fica só com quem conduz, fora do repositório.
3. Mandar a mensagem de início e o questionário inicial. Anote as respostas em `conversas.csv`.

### Semanas 1 e 2: o gratuito

- Uma sessão observada por videochamada, de 45 minutos, de preferência nos primeiros dias, com o [roteiro de observação](#roteiro-de-observação).
- No meio do caminho, uma mensagem curta: "Onde você está? O que foi mais difícil até agora?". Não ensine. Se a pessoa travou de vez, anote com gravidade alta antes de ajudar.

### Ao terminar o nível 1 (ou no fim da semana 2)

Uma conversa de 15 a 20 minutos:

1. A tarefa de transferência 1, no Laboratório.
2. As perguntas sobre o gratuito.
3. O preço: mostre a página Planos, com o preço previsto (R$ 19,90 por mês ou R$ 149 por ano), e pergunte: "Com o que você compararia esse preço?", "O que precisaria ter para valer isso para você?" e "Hoje, você pagaria? Sim, talvez ou não, e por quê?". Anote em `pagaria_declarado` como intenção declarada. Não ofereça venda, desconto nem lista de espera, e não peça nenhum dado de pagamento.
4. Convide para a continuação.

### Semana 3: a continuação

- A pessoa faz as três lições de Python no mesmo navegador.
- No fim, uma conversa curta com a tarefa de transferência 2, o questionário final e o último "Exportar JSON".

### Depois

A [exportação e análise](#exportação-e-análise), e a decisão do que corrigir, com os [critérios de prioridade](#o-que-corrigir-primeiro).

## Roteiro de observação

Sessão de 45 minutos por vídeo, com a pessoa compartilhando a tela (no celular, a câmera apontada para a tela também serve).

**Abertura (5 minutos).** Confirme o aceite e pergunte se pode gravar; sem autorização, só anote. Diga: "Quem está sendo testado é o site, não você. Pense em voz alta: diga o que está procurando e o que espera que aconteça."

**Tarefas (30 minutos).** Peça uma de cada vez, com estas palavras, sem indicar onde clicar:

1. "Você quer começar a aprender. Por onde começaria?"
2. "Continue a lição em que você está até chegar aos exercícios."
3. "Faça um exercício. Se errar, tente de novo ou use uma dica, como faria sozinha."
4. "Como você revisaria o que já estudou?"
5. "Feche o site e abra de novo. Seu progresso continua lá?"
6. "Exporte o seu progresso e me mande o arquivo." É a primeira exportação, feita junto.

Para cada tarefa, anote no registro de dificuldades: conseguiu sozinha, com uma pergunta sua ou não conseguiu; tempo aproximado; onde travou, com as palavras da pessoa. Deixe o tipo em branco e decida depois, com calma.

**Regras.** Não ensine nem aponte. Se a pessoa ficar parada uns 3 minutos, pergunte só "o que você está procurando?". Se passar de 5 minutos sem sair do lugar, anote com gravidade alta e então ajude, para a sessão continuar.

**Fechamento (10 minutos).** "O que ficou mais claro?", "Em que ponto você não conseguiria continuar sozinha?" e "Alguma coisa te irritou ou te fez querer parar?".

## Tarefas de transferência

Problemas que não estão nas lições, para ver se a pessoa usa o que aprendeu numa situação nova. Peça que resolva no Laboratório, em Python. Nos primeiros 15 minutos, não ajude; depois disso, uma pergunta de cada vez ("o que o seu programa faz agora?"). Anote em `conversas.csv`: `sozinha`, `com perguntas`, `nao resolveu` ou `nao fez`, e os minutos.

**1. Depois do gratuito (funções, condicionais e laços).** "A conta de luz cobra R$ 0,50 por kWh nos primeiros 100 kWh do mês, e R$ 0,80 por kWh no que passar disso. Escreva uma função `conta(kwh)` que devolva o valor da conta, e mostre o valor para 80, 100 e 250 kWh." Respostas: 40,00; 50,00; 170,00 (50 dos primeiros 100, mais 150 × 0,80).

**2. Depois da continuação (listas).** "As temperaturas máximas da semana foram `[31, 29, 33, 34, 28, 30, 32]`, de segunda a domingo. Mostre qual foi a maior variação entre dois dias seguidos (subindo ou descendo) e entre quais dias ela aconteceu." Resposta: 6 graus, de quinta (34) para sexta (28).

## Perguntas

**Questionário inicial** (vai para `conversas.csv`: `ja_programou`, `horas_semana_declaradas`, `aparelho`)

1. Você já programou? Nunca, tentei e parei, ou um pouco.
2. Por que você quer aprender computação agora?
3. Quantas horas por semana você consegue estudar, de verdade?
4. Você vai estudar mais no celular ou no computador?
5. Já tentou outro curso ou site? O que fez você parar?

**Depois do gratuito**

1. O que foi mais difícil? O que ajudou a destravar?
2. Alguma explicação ficou confusa ou longa demais? Qual?
3. Você usou as dicas, a revisão e o tutor? O que ajudou e o que atrapalhou?

**Questionário final**

1. O que você consegue fazer hoje que não conseguia antes? Mostre um exemplo.
2. Onde você mais travou no Python?
3. Você continuaria estudando aqui sozinho? O que faria você parar?
4. O que você mudaria primeiro na Alicerce?

## Registro de dificuldades

Modelo: `docs/piloto/registro-dificuldades.csv`. Uma linha por dificuldade observada ou contada pela pessoa. A primeira linha depois do cabeçalho é um exemplo (participante "exemplo") e é ignorada pela análise.

| Coluna | O que vai |
|---|---|
| `participante` | O código (P01) |
| `data` | AAAA-MM-DD |
| `licao` | O id da lição, que aparece no endereço da página (`/licao/l1-loops`) |
| `exercicio` | A posição do exercício na lição (`3` para o terceiro), se for num exercício; senão, vazio. A análise troca a posição pelo id |
| `tipo` | `conceito` (a ideia não ficou clara), `enunciado` (não entendeu o que se pedia), `interface` (tela, botão, celular), `ambiente` (internet, navegador, Python que não carregou) ou `outro` |
| `descricao` | De preferência com as palavras da pessoa |
| `o_que_destravou` | Dica, explicação de outra lição, conversa, nada |
| `gravidade` | `baixa` (seguiu sozinha), `media` (precisou de dica ou de muito tempo) ou `alta` (parou ali ou desistiu) |

A análise avisa quando uma linha cita uma lição fora da jornada, uma posição que a lição não tem, um tipo ou gravidade fora da lista, ou um código sem arquivo de progresso. Acentos e maiúsculas não fazem diferença.

## Anotações das conversas

Modelo: `docs/piloto/conversas.csv`. Uma linha por pessoa, preenchida ao longo das conversas. A linha "exemplo" é ignorada.

| Coluna | O que vai |
|---|---|
| `participante` | O código (P01) |
| `aparelho` | Onde disse que estudaria mais: `celular`, `computador` ou `os dois` |
| `ja_programou` | `nunca`, `tentei e parei` ou `um pouco` |
| `horas_semana_declaradas` | O número que a pessoa disse no questionário inicial |
| `transferencia_1`, `transferencia_2` | `sozinha`, `com perguntas`, `nao resolveu` ou `nao fez` |
| `transferencia_1_min`, `transferencia_2_min` | Minutos até resolver ou desistir |
| `pagaria_declarado` | A resposta a "Hoje, você pagaria?": `sim`, `talvez`, `nao` ou `nao perguntado` |
| `observacao` | Com o que comparou o preço, o que faltaria, qualquer outra coisa |

`pagaria_declarado` é o que a pessoa disse. O relatório mostra essa contagem com o título "intenção declarada" e, ao lado, que compras foram zero, porque nesta rodada nada é vendido.

## Exportação e análise

1. Junte os arquivos numa pasta **fora do repositório**, cada um com o código da pessoa no nome: `P01.json`, ou `P01-semana1.json` e `P01-semana2.json`. Arquivos com o mesmo código são juntados, sem contar nada duas vezes. Se a pessoa reiniciou o progresso entre um arquivo e outro, a análise junta os dois e avisa.
2. Preencha `registro-dificuldades.csv` e `conversas.csv` (uma planilha exportada como CSV serve) e guarde-os na mesma pasta.
3. Rode a análise:

   ```bash
   node scripts/piloto/analisar.ts <pasta com os JSON> --registro <registro.csv> --conversas <conversas.csv> --csv <pasta de saída>
   ```

   Sai um relatório em Markdown com o funil da jornada, onde as pessoas pararam, os exercícios que mais travaram, o registro agrupado por lugar, as tarefas de transferência, a intenção declarada de pagar e os candidatos a aprofundar. Com `--csv`, também `exercicios.csv` e `licoes.csv`, para abrir numa planilha. Se alguma das pastas ou arquivos estiver dentro do repositório (fora de `piloto-dados/`), a análise avisa.
4. Leia o relatório junto com as anotações e decida o que muda, com os critérios abaixo.

## O que corrigir primeiro

A jornada inicial vem antes de qualquer conteúdo novo: enquanto houver um item dos três primeiros grupos aberto, aulas e níveis novos não entram na fila.

1. **Bloqueios na trilha gratuita**, de tipo `ambiente` ou `interface`: Python que não carrega, botão que não aparece no celular, progresso perdido. Vêm primeiro porque impedem todo o resto, e costumam ser os mais baratos de corrigir.
2. **Enunciados confusos na trilha gratuita** (`enunciado`): reescrever o enunciado ou o exemplo.
3. **Conceitos da trilha gratuita** que viraram candidatos pela regra abaixo: um exemplo novo, uma explicação do erro mais comum, um exercício intermediário.
4. **O mesmo na continuação** (m2-1 e m2-2), que fica no repositório privado.
5. **Só depois:** aprofundar outros níveis ou ampliar o catálogo.

Dentro de cada grupo, vem primeiro o que atingiu mais pessoas e, entre esses, o que fez mais gente parar.

Um exercício ou lição vira **candidato a aprofundar** quando:

- pelo menos 5 pessoas tentaram o exercício, e 30% ou mais delas viram a resposta ou pararam; ou
- 3 ou mais pessoas tiveram dificuldade de `conceito` no mesmo lugar; ou
- 2 ou mais pessoas pararam no mesmo lugar (gravidade `alta`).

A análise conta pessoas, não linhas: a mesma pessoa anotada duas vezes no mesmo lugar conta uma. A lista de candidatos é para ler, não é uma decisão. Para os níveis 0 e 1, as correções vão no repositório público; do nível 2 em diante, no privado. Registre cada decisão no item UP33 do roadmap e confira na rodada seguinte se a dificuldade diminuiu.

## Dados e privacidade

- O arquivo exportado tem as tentativas de exercício (acertou, dicas, erros, se viu a resposta, tempo), as lições visitadas e concluídas, as revisões, o resultado do diagnóstico, se foi feito, e os marcos de projeto marcados. Não tem nome, e-mail, senha nem o código que a pessoa escreveu.
- Guarde os arquivos e as anotações numa pasta fora do repositório e fora de pastas compartilhadas publicamente. Se, por engano, a pasta ficar dentro do repositório com o nome `piloto-dados/`, o `.gitignore` impede que ela vá para o GitHub; em qualquer outro lugar do repositório, a análise avisa.
- A lista que liga código e nome fica só com quem conduz.
- Apague tudo no fim do prazo informado no termo, e na hora se a pessoa pedir.

## Navegadores e o que foi verificado

- Verificado em 23/10/2026, só no **Chromium** sem interface (o único navegador instalado no ambiente de testes): fazer um exercício, exportar em Progresso e rodar a análise sobre o arquivo baixado funciona no build da demonstração (`e2e/pages.spec.ts`, o mesmo modo estático do GitHub Pages, servido por uma imitação dele) e no servidor (`e2e/fluxos.spec.ts`), com tela de computador e com a tela de um Pixel 7 simulada pelo próprio Chromium.
- **Não verificado:** Firefox, Safari (Mac e iPhone), Chrome num celular de verdade e outros navegadores de celular. A tela de celular simulada não é um navegador de celular: onde o arquivo baixado vai parar e como a pessoa o encontra não foram testados. Um resultado no Chromium não vale para os outros; por isso a primeira exportação é feita junto, na sessão observada, e anotada no registro se der errado (tipo `ambiente`).
- No Safari, há uma regra conhecida de apagar o que o site guardou no navegador depois de 7 dias de uso do Safari sem abrir o site ([explicação](https://searchengineland.com/what-safaris-7-day-cap-on-script-writeable-storage-means-for-pwa-developers-332519)). Não foi testada aqui; é a razão do item 4 da mensagem de início.

## Limites

- Quem se oferece para um piloto costuma ser mais motivado que a média, então o abandono aqui tende a ser menor que fora dele.
- O progresso fica no navegador: quem usou outro aparelho sem exportar aparece com menos do que fez.
- O tempo por exercício é aproximado. O site conta a partir de quando a etapa da lição abriu, e uma etapa mostra vários exercícios; a análise passa a contar a partir do exercício anterior, mas pausas continuam dentro. As durações das lições no site são estimativas e não são comparadas com nada medido.
- Concluir lições e acertar exercícios não prova aprendizagem. As tarefas de transferência e as conversas dizem mais sobre isso, e ainda assim com uma amostra pequena.
- O que as pessoas dizem sobre o preço é intenção declarada; fica separado de qualquer pagamento, que nesta rodada não existe.
