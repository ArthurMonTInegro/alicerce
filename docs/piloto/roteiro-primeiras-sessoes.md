# Roteiro curto: as duas primeiras sessões

Preparado em 26/10/2026. **Nenhuma sessão aconteceu e nenhum convite foi enviado.** É o resumo de [PILOTO.md](../PILOTO.md) para as duas primeiras sessões do piloto, as da onda de ensaio: a sessão 1 de P01 (estuda mais no celular) e a sessão 1 de P02 (no computador), em dias diferentes. Na dúvida, vale o documento completo. Recrutar, convidar e conduzir é do Arthur.

## Qual versão usar

- **A demonstração pública**, https://arthurmontinegro.github.io/alicerce/: sem conta, sem servidor e sem custo.
- **No ar em 26/10/2026:** o commit `f9efb1a` da main, publicado em 25/10/2026. Ele já tem o tutor local novo e a contagem de perguntas ao tutor no arquivo exportado.
- **A rodada de 26/10/2026** (branch `rodada-26-10`, não publicado) muda na demonstração só uma coisa: hoje, tocar numa etapa da lição antes de a página terminar de carregar recarrega a página, que abre na etapa certa, mas é refeita inteira pelo navegador (erro #418 no console). Isso foi visto só no Chromium, em teste automático; numa pessoa com um celular de verdade, não. O resto da rodada (pagamentos e a fila dos e-mails) é do servidor e não aparece na demonstração. Publicar antes da primeira sessão é decisão do Arthur.
- **As duas sessões com a mesma versão.** No dia, antes de começar, confira o que está no ar: o commit mais recente de https://github.com/ArthurMonTInegro/alicerce/commits/gh-pages diz "Publica `<commit>` da main". Anote esse commit e a data; eles vão para "Versão do site" do [modelo de relatório](modelo-relatorio.md).

## O que dá para observar na demonstração

| Tarefa | O que se vê |
|---|---|
| T1 | Se a pessoa entende o que é a Alicerce, para quem é e que o começo é gratuito |
| T2 | Se chega sozinha à primeira lição ou ao Diagnóstico; se procura cadastro e o que pensa ao não achar |
| T3 | Se a explicação de "O que é um computador?" fica clara, com um exemplo dela |
| T4 | Os dois primeiros exercícios: erros, dicas, solução aberta, retorno da correção |
| T5 | Se acha o tutor e se a resposta ajuda. O tutor é o local: não usa IA externa e diz isso |
| Fechamento | A primeira exportação (Progresso, "Exportar JSON"), feita junto |

**O que não dá para avaliar aqui:** cadastro, entrada, e-mail de confirmação, recuperação de senha, sincronização entre aparelhos, assinatura, pagamento e o tutor com IA externa. A demonstração não tem servidor, e nada disso existe nela. Também não se mede se a pessoa pagaria: o que ela disser sobre preço é intenção declarada, e T8 fica para a sessão 2.

## Antes

- O termo aceito e a mensagem de início enviada, com o questionário inicial respondido ([PILOTO.md](../PILOTO.md), "Termo de consentimento" e "Mensagem de início").
- A pasta do piloto fora do repositório, com cópias de `tarefas-observadas.csv` e `registro-dificuldades.csv`.
- Para P01: combine como a tela do celular vai ser compartilhada (o aplicativo de vídeo dela ou a câmera de outro aparelho).
- Abra a demonstração uma vez no tipo de aparelho da pessoa e faça T1 a T5, para não ser surpreendido no meio.

## Sessão 1 (50 minutos)

| Tempo | O quê |
|---|---|
| 5 min | Abertura: aceite, gravação só com autorização, "quem está sendo testado é o site"; pense em voz alta |
| 3 min | T1, com a página inicial aberta por você na tela da pessoa |
| 5 min | T2; depois, as combinações: mesmo aparelho e navegador, sem aba anônima |
| 10 min | T3, nas etapas Conceito e Explicação de "O que é um computador?" |
| 12 min | T4, os dois primeiros exercícios da mesma lição |
| 7 min | T5 |
| 8 min | Fechamento: a primeira exportação junto e as três perguntas |

As palavras de cada pedido e o objetivo conferível de cada tarefa estão em [PILOTO.md](../PILOTO.md), "As oito tarefas". Não ensine nem aponte: depois de uns 3 minutos parada, só "o que você está procurando?"; depois de 5, anote gravidade alta e ajude.

## Se algo der errado

- **O arquivo exportado não aparece**, principalmente no celular: onde o download vai parar num celular de verdade não foi testado. Anote no registro (tipo `ambiente` ou `defeito`) e peça o arquivo por outro caminho na própria sessão.
- **A página recarrega ou pisca ao tocar numa etapa**, se a versão no ar for a de antes da correção: anote como `defeito`, com o aparelho e o navegador, e siga.
- **O progresso some** ao voltar: só se vê na sessão 2 (T6). É gravidade alta.
- **Qualquer texto que faça a pessoa achar que vai ser cobrada**: gravidade alta. Nada está à venda e nada é cobrado.

## Depois (20 minutos)

Passe as anotações para `tarefas-observadas.csv` e `registro-dificuldades.csv` e classifique os tipos. Depois das duas sessões, revise as anotações juntas e ajuste as palavras do roteiro que confundiram ([PILOTO.md](../PILOTO.md), "Agenda", dia 7). A sessão 2 de cada pessoa vem de 2 a 7 dias depois, na mesma versão e no mesmo aparelho.

Não invente resultados: o que não foi observado fica em branco ou como `nao feita`.
