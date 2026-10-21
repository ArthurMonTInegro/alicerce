# Piloto: a jornada gratuita e a primeira continuação

Situação em 21/10/2026: **preparado, não executado.** Nenhum participante foi recrutado, e nenhum dado foi coletado. Recrutar e conduzir as conversas cabe ao Arthur; a análise dos arquivos pode ser feita por qualquer pessoa com o repositório.

Esta é a primeira rodada com pessoas reais: 8 a 12 participantes. Ela junta a observação de uso (UP18), uma parte das entrevistas (UP20) e prepara o piloto maior de 30 a 50 pessoas (UP21), que vem depois, já corrigido pelo que esta mostrar.

## O que se quer saber

1. Quem nunca programou consegue fazer a trilha gratuita (níveis 0 e 1) sozinho? Onde trava?
2. Quem termina o gratuito começa o Python? O começo do Python segura a pessoa?
3. Quais dificuldades se repetem, para decidir o que aprofundar (ver "Regra para decidir o que aprofundar").
4. Como a pessoa reage ao preço real, sem que nada seja vendido ou cobrado.

O que esta rodada **não mede**: se a pessoa lembra do que aprendeu um mês depois (isso pede mais tempo e a métrica de 30 dias do servidor), se ela pagaria de verdade (só um pagamento mostra isso) e se os números valem para outros públicos (a amostra é pequena e escolhida).

## Formato

- **Onde:** na demonstração pública, https://arthurmontinegro.github.io/alicerce/. Não precisa de conta, de servidor nem de nenhum gasto. Durante a transição, os níveis 2 a 14 estão abertos, então a continuação já está lá.
- **Quanto tempo:** duas a três semanas, no ritmo de cada pessoa.
- **Quem:** adultos que querem aprender programação por conta própria e nunca programaram, ou quase. Vale misturar quem estuda no celular e quem estuda no computador. Evite amigos próximos (tendem a elogiar) e não condicione nenhum agradecimento a terminar a trilha (isso esconde o abandono, que é justamente o que se quer ver).

## A jornada

| Trecho | Conteúdo | Tamanho |
|---|---|---|
| Gratuito | Nível 0, Introdução à Computação (7 lições), e nível 1, Lógica de Programação (8 lições, em Python) | 15 lições e 54 exercícios; cerca de 9h30 pelo tempo estimado das lições |
| Primeira continuação | Módulos m2-1 (Python e seu ambiente) e m2-2 (Coleções): `l2-por-que-python`, `l2-listas` e `l2-dicionarios` | 3 lições e 10 exercícios; cerca de 1h30 |

A continuação é o começo do que vai ser Premium. No piloto ela está aberta, como para todo mundo durante a transição.

## Passo a passo

### Antes

1. Convidar e enviar o termo de consentimento (texto no fim). Guardar o aceite de cada pessoa.
2. Dar um código a cada pessoa: P01, P02, P03... A lista que liga código e nome fica só com quem conduz, fora do repositório.
3. Mandar o questionário inicial.

### Semanas 1 e 2: o gratuito

- Mensagem de início: o link, "comece pela Trilha, no nível 0", "estude sempre no mesmo navegador" e "no fim de cada semana, abra Progresso, clique em Exportar JSON e me mande o arquivo". O progresso fica no navegador: quem trocar de aparelho sem exportar perde o registro do que fez no outro.
- Uma sessão observada por videochamada, de 45 minutos, com o roteiro da UP18 (`docs/EXECUCAO_PLANO.md`): peça as tarefas sem orientar os cliques e anote no registro de dificuldades.
- No meio do caminho, uma mensagem curta: "Onde você está? O que foi mais difícil até agora?". Não ensine. Se a pessoa travou de vez, anote com gravidade alta antes de ajudar.

### Ao terminar o nível 1 (ou no fim da semana 2)

Uma conversa de 15 a 20 minutos:

1. A tarefa de transferência 1 (abaixo), no Laboratório.
2. As perguntas sobre o gratuito (abaixo).
3. O preço: mostre a página Planos, com o preço previsto (R$ 19,90 por mês ou R$ 149 por ano), e pergunte: "Com o que você compararia esse preço?", "O que precisaria ter para valer isso para você?" e "Hoje, você pagaria? Sim, talvez ou não, e por quê?". Anote como intenção declarada. Não ofereça venda, desconto nem lista de espera, e não peça nenhum dado de pagamento.
4. Convide para a continuação.

### Semana 3: a continuação

- A pessoa faz as três lições de Python no mesmo navegador.
- No fim, uma conversa curta com a tarefa de transferência 2, o questionário final e o último "Exportar JSON".

### Depois

1. Junte os arquivos numa pasta fora do repositório, cada um com o código da pessoa no nome: `P01.json`, ou `P01-semana1.json` e `P01-semana2.json` (arquivos com o mesmo código são juntados, sem contar nada duas vezes).
2. Passe as anotações para o modelo `docs/piloto/registro-dificuldades.csv` (uma planilha exportada como CSV serve).
3. Rode a análise:

   ```bash
   node scripts/piloto/analisar.ts <pasta com os JSON> --registro <registro.csv> --csv <pasta de saída>
   ```

   Sai um relatório em Markdown com o funil da jornada, onde as pessoas pararam, os exercícios que mais travaram, o registro agrupado por lugar e os candidatos a aprofundar. Com `--csv`, também `exercicios.csv` e `licoes.csv`, para abrir numa planilha.
4. Leia o relatório junto com as anotações e decida o que muda (ver a regra abaixo).

## Tarefas de transferência

Problemas que não estão nas lições, para ver se a pessoa usa o que aprendeu numa situação nova. Peça que resolva no Laboratório, em Python. Nos primeiros 15 minutos, não ajude; depois disso, uma pergunta de cada vez ("o que o seu programa faz agora?"). Anote: resolveu sozinha, resolveu com perguntas, ou não resolveu; quanto tempo; onde travou.

**1. Depois do gratuito (funções, condicionais e laços).** "A conta de luz cobra R$ 0,50 por kWh nos primeiros 100 kWh do mês, e R$ 0,80 por kWh no que passar disso. Escreva uma função `conta(kwh)` que devolva o valor da conta, e mostre o valor para 80, 100 e 250 kWh." Respostas: 40,00; 50,00; 170,00 (50 dos primeiros 100, mais 150 × 0,80).

**2. Depois da continuação (listas).** "As temperaturas máximas da semana foram `[31, 29, 33, 34, 28, 30, 32]`, de segunda a domingo. Mostre qual foi a maior variação entre dois dias seguidos (subindo ou descendo) e entre quais dias ela aconteceu." Resposta: 6 graus, de quinta (34) para sexta (28).

## Perguntas

**Questionário inicial**

1. Você já programou? Nunca, tentei e parei, ou um pouco.
2. Por que você quer aprender computação agora?
3. Quanto tempo por semana você consegue estudar, de verdade?
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

Durante a sessão, anote o que aconteceu, sem diagnosticar; o tipo se decide depois, com calma.

## Regra para decidir o que aprofundar

Um exercício ou lição vira **candidato** quando:

- pelo menos 5 pessoas tentaram o exercício, e 30% ou mais delas viram a resposta ou pararam; ou
- 3 ou mais pessoas tiveram dificuldade de `conceito` no mesmo lugar; ou
- há 2 ou mais registros de gravidade `alta` no mesmo lugar.

A análise lista os candidatos; a decisão é de quem lê. Antes de escrever mais teoria, olhe o tipo: `enunciado` e `interface` se resolvem reescrevendo o enunciado ou corrigindo a tela, o que é menor e mais rápido. `conceito` pede aprofundamento: um exemplo novo, uma explicação do erro mais comum, um exercício intermediário. Para os níveis 0 e 1, isso vai no repositório público; do nível 2 em diante, no privado. Registre cada decisão no item UP33 do roadmap e confira na rodada seguinte se a dificuldade diminuiu.

## Dados e privacidade

- O arquivo exportado tem as tentativas de exercício (acertou, dicas, erros, se viu a resposta, tempo), as lições visitadas e concluídas e as revisões. Não tem nome, e-mail, senha nem o código que a pessoa escreveu.
- Guarde os arquivos e as anotações numa pasta fora do repositório e fora de pastas compartilhadas publicamente. Se, por engano, a pasta ficar dentro do repositório com o nome `piloto-dados/`, o `.gitignore` impede que ela vá para o GitHub.
- A lista que liga código e nome fica só com quem conduz.
- Apague tudo no fim do prazo informado no termo, e na hora se a pessoa pedir.

## Termo de consentimento

Texto para enviar, completando o que está entre colchetes. É uma orientação para o desenho do piloto, não um parecer jurídico.

> Você está convidado a testar a Alicerce, uma plataforma gratuita para aprender computação por conta própria, durante duas a três semanas, no seu ritmo.
>
> **O que você faz:** estuda pelo site, responde dois questionários curtos, conversa comigo duas ou três vezes por vídeo ou mensagem e, no fim de cada semana, me manda o arquivo de progresso que o próprio site gera (Progresso > Exportar JSON).
>
> **O que eu recebo:** quais lições e exercícios você fez, se acertou, quantas dicas usou e quanto tempo levou; suas respostas aos questionários; minhas anotações das conversas. Não recebo sua senha, o código que você escreveu nem nenhum dado de pagamento. Nada é cobrado.
>
> **Como uso:** só para melhorar a Alicerce. Seu nome não aparece nos dados: você recebe um código. As conversas por vídeo só são gravadas se você autorizar, e você pode participar sem gravação.
>
> **Seus direitos:** você pode sair quando quiser, sem explicar por quê, e pedir que eu apague seus dados; é só responder esta mensagem. Os dados ficam guardados até [data] e depois são apagados.
>
> Responsável: [nome e contato].
>
> Se concorda, responda "aceito".

## Limites

- Quem se oferece para um piloto costuma ser mais motivado que a média, então o abandono aqui tende a ser menor que fora dele.
- O progresso fica no navegador: quem usou outro aparelho sem exportar aparece com menos do que fez.
- Concluir lições e acertar exercícios não prova aprendizagem. As tarefas de transferência e as conversas dizem mais sobre isso, e ainda assim com uma amostra pequena.
- O que as pessoas dizem sobre o preço é intenção declarada; fica separado de qualquer pagamento, que nesta rodada não existe.
