# Piloto: a jornada gratuita e a primeira continuação

Situação em 24/10/2026: **preparado, não executado.** Nenhum convite foi enviado, nenhum participante foi registrado, nenhuma sessão aconteceu e nenhum dado foi coletado. Recrutar, convidar e conduzir as sessões cabe ao Arthur; a análise dos arquivos pode ser feita por qualquer pessoa com o repositório.

Esta é a primeira rodada com pessoas reais: 8 a 12 iniciantes, com custo zero e cabendo em duas horas por dia de quem conduz. Ela começa com **duas pessoas observadas** (a onda de ensaio), para achar os obstáculos antes de chamar as demais. Junta a observação de uso (UP18), uma parte das entrevistas (UP20) e prepara o piloto maior de 30 a 50 pessoas (UP21), que vem depois, já corrigido pelo que esta mostrar.

| Peça do kit | Onde |
|---|---|
| Perfil de quem convidar | [Quem convidar](#quem-convidar) |
| Convite pronto para copiar | [Convite](#convite) |
| Participação e privacidade | [Termo de consentimento](#termo-de-consentimento), [Mensagem de início](#mensagem-de-início) e [Dados e privacidade](#dados-e-privacidade) |
| Acesso ao conteúdo durante o piloto | [Acesso durante o piloto](#acesso-durante-o-piloto) |
| Questionário inicial | [Questionário inicial](#questionário-inicial) |
| Roteiro da primeira sessão | [Sessão 1](#sessão-1-observada-50-minutos) |
| Tarefas com objetivos verificáveis | [As oito tarefas](#as-oito-tarefas) |
| Roteiro de observação e entrevista | [Como observar](#como-observar), [Sessão 2](#sessão-2-outro-dia-40-minutos) e [Conversa final](#conversa-final-20-minutos) |
| Registro de dificuldades e defeitos | `docs/piloto/registro-dificuldades.csv`, explicado em [Registro de dificuldades e defeitos](#registro-de-dificuldades-e-defeitos) |
| Anotações das sessões | `docs/piloto/tarefas-observadas.csv`, explicado em [Anotações das sessões](#anotações-das-sessões) |
| Anotações das conversas | `docs/piloto/conversas.csv`, explicado em [Anotações das conversas](#anotações-das-conversas) |
| Questionário final | [Questionário final](#questionário-final) |
| Agenda diária | [Agenda](#agenda) |
| Indicadores mínimos | [Indicadores mínimos](#indicadores-mínimos) |
| Exportação e análise | [Exportação e análise](#exportação-e-análise) |
| Modelo do relatório de resultados | `docs/piloto/modelo-relatorio.md` |
| Prosseguir, corrigir ou interromper | [Critérios preliminares](#critérios-preliminares-prosseguir-corrigir-ou-interromper) e [O que corrigir primeiro](#o-que-corrigir-primeiro) |

## O que se quer saber

1. Quem chega entende o que é a Alicerce, o que é gratuito e o que vai ser pago?
2. Quem nunca programou consegue começar e fazer a trilha gratuita (níveis 0 e 1) sozinho? Onde trava?
3. As explicações ficam claras? A pessoa resolve os exercícios e usa o que aprendeu num problema novo?
4. O tutor ajuda ou atrapalha?
5. A pessoa volta em outro dia? Quem termina o gratuito começa o Python?
6. Como a pessoa reage ao preço previsto, sem que nada seja vendido ou cobrado.

O que esta rodada **não mede**: se a pessoa lembra do que aprendeu um mês depois (isso pede mais tempo e a métrica de 30 dias do servidor), se ela pagaria de verdade (só um pagamento mostra isso, e nesta rodada nada é vendido), quanto tempo as lições levam de fato (o tempo exportado é aproximado; ver [Limites](#limites)), o cadastro de conta (a demonstração não tem contas; ver T2) e se os resultados valem para outros públicos (a amostra é pequena e escolhida). Com 8 a 12 pessoas, o piloto dá **sinais qualitativos**: mostra onde olhar e o que corrigir, não prova nada sobre o mercado.

## Formato

- **Onde:** na demonstração pública, https://arthurmontinegro.github.io/alicerce/. Não precisa de conta, de servidor nem de nenhum gasto.
- **Qual versão:** a que estiver publicada no dia. Em 24/10/2026, é a de 23/10/2026 (commit `a58436f`). As melhorias do tutor local e a contagem de perguntas ao tutor (branch `rodada-24-10`) só chegam aos participantes se forem publicadas antes da primeira sessão; essa decisão é do Arthur. Sem essa publicação, a tarefa do tutor (T5) observa o tutor anterior, e a linha "Uso do tutor" do relatório sai como "não registrado": o uso fica só nas anotações das sessões. Não troque de versão no meio de uma onda; se trocar entre as ondas, anote a data.
- **Duas ondas:**
  - **Onda 1, de ensaio:** 2 pessoas, uma que estuda mais no celular e uma no computador. Cada uma faz a sessão 1 e, em outro dia, a sessão 2. Depois delas, os [critérios preliminares](#critérios-preliminares-prosseguir-corrigir-ou-interromper) decidem se a onda 2 começa, se algo é corrigido antes ou se o piloto para.
  - **Onda 2:** as demais 6 a 10 pessoas, com o mesmo roteiro (ou o roteiro corrigido, com a mudança anotada).
- **Para cada pessoa:** a sessão 1 observada, estudo sozinho no próprio ritmo, a sessão 2 em outro dia (2 a 7 dias depois) e uma conversa final ao terminar o nível 1 ou no fim da terceira semana, o que vier primeiro. Duas a três semanas por pessoa.

## A jornada

| Trecho | Conteúdo | Tamanho |
|---|---|---|
| Gratuito | Nível 0, Introdução à Computação (7 lições), e nível 1, Lógica de Programação (8 lições, em Python) | 15 lições e 54 exercícios. O site estima cerca de 9h30; é a estimativa do conteúdo, não tempo medido |
| Primeira continuação | Módulos m2-1 (Python e seu ambiente) e m2-2 (Coleções): `l2-por-que-python`, `l2-listas` e `l2-dicionarios` | 3 lições e 10 exercícios. Estimativa do site: cerca de 1h30 |

A continuação é o começo do que vai ser Premium.

## Acesso durante o piloto

**Nenhuma liberação é necessária, e nenhuma é feita.** Durante a transição, os níveis 2 a 14 estão abertos para todo mundo até 30 dias depois que a venda do Premium começar, como a página Planos informa. O piloto usa esse acesso público, o mesmo de qualquer visitante: não há acesso especial, desconto, cupom ou promessa de preço para participantes, e a política comercial não muda. Diga isso a quem perguntar.

Se, durante o piloto, a data de fechamento dos níveis 2 a 14 for anunciada (o que só acontece quando a venda abrir; hoje `PREMIUM_FOR_SALE` é `false`), ou se um piloto futuro rodar num servidor com contas depois do fechamento, o acesso de participante ao conteúdo pago tem de ser **temporário e explícito**:

```bash
node apps/api/scripts/plano.ts <email> premium <dias> --piloto
```

- Concede o Premium por 1 a 60 dias, com a origem `piloto` registrada no histórico do plano (`node apps/api/scripts/acesso.ts <email>` mostra), e vence sozinho. Não mexe em nenhuma assinatura nem no acesso de outras contas.
- Avise a pessoa por escrito: "acesso de teste até [data], sem cobrança e sem renovação".
- Num servidor com `ANTHROPIC_API_KEY` configurada, o Premium também abre o tutor com IA externa (até 20 perguntas por dia, dentro de 200 por mês), o que gera custo. Com orçamento zero, rode o servidor do piloto sem essa chave: o tutor fica no modo local.

## Quem convidar

**Perfil:** adultos (18 anos ou mais) que querem aprender programação por conta própria e nunca programaram, ou só tentaram e pararam.

Para uma rodada de 10 pessoas, procure esta mistura (com 8 ou 12, mantenha as proporções):

| Critério | Quantas pessoas |
|---|---|
| Vai estudar mais no celular | pelo menos 4 |
| Vai estudar mais no computador | pelo menos 4 |
| Já tentou outro curso ou site e parou | pelo menos 3 |
| Nunca programou nada | pelo menos 4 |

Na onda 1, uma pessoa de celular e uma de computador, de preferência ambas que nunca programaram.

**Não convide:** quem trabalha ou estuda programação (além do primeiro semestre), amigos próximos e família (tendem a elogiar), quem ajudou a fazer a Alicerce, menores de 18 anos.

**Três perguntas antes de convidar:** "Você já programou?", "Nas próximas três semanas, você tem umas duas ou três horas por semana para estudar?" e "Você estudaria mais no celular ou no computador?".

**Quem sai no meio não é substituído.** O abandono é um dos resultados que se quer ver. Pela mesma razão, nenhum agradecimento depende de terminar a trilha.

## Convite

Texto para mandar por mensagem ou e-mail. Troque o que está entre colchetes. Não acrescente promessa de emprego, de certificado, de renda ou de prazo para aprender.

> Oi, [nome]! Estou testando a Alicerce, um site para aprender computação e programação do zero, por conta própria. Procuro algumas pessoas que nunca programaram (ou que tentaram e pararam) para usar o site por duas ou três semanas, no seu ritmo, e me contar onde ficou difícil.
>
> Seria assim: duas conversas por vídeo de uns 40 a 50 minutos, em dias diferentes, em que você usa o site enquanto eu observo; uma conversa curta no fim; e, entre elas, você estuda quando puder. Uma vez por semana você me manda um arquivo que o próprio site gera com o seu progresso. Não precisa instalar nada nem criar conta.
>
> Nada é cobrado no teste. A parte inicial do site é gratuita; a continuação vai fazer parte de uma assinatura no futuro, mas hoje está aberta para todos e nada está à venda.
>
> É um teste: o site ainda está sendo melhorado, e é justamente o que você achar difícil que me interessa. Se topar, me responda que eu mando os detalhes de como uso as informações.
>
> [seu nome]

## Termo de consentimento

Texto para mandar a quem respondeu ao convite, completando o que está entre colchetes. Guarde o "aceito" de cada pessoa. É uma orientação para o desenho do piloto, não um parecer jurídico.

> Você está convidado a testar a Alicerce, uma plataforma para aprender computação por conta própria, durante duas a três semanas, no seu ritmo.
>
> **Quem pode participar:** pessoas com 18 anos ou mais.
>
> **O que você faz:** estuda pelo site, responde dois questionários curtos, participa de duas sessões por vídeo em que usa o site compartilhando a tela e de uma conversa curta no fim, e, no fim de cada semana, me manda o arquivo de progresso que o próprio site gera (Progresso > Exportar JSON).
>
> **O que eu recebo:** quais lições e exercícios você fez, se acertou, quantas dicas usou e quanto tempo levou, o resultado do Diagnóstico, se você fizer, e quantas perguntas você fez ao tutor em cada dia (só a contagem, nunca o texto das perguntas); suas respostas aos questionários; minhas anotações das sessões e das conversas. Não recebo senha, o código que você escreveu nem nenhum dado de pagamento. Nada é cobrado.
>
> **Como uso:** só para melhorar a Alicerce. Seu nome não aparece nos dados: você recebe um código. As sessões só são gravadas se você autorizar, e você pode participar sem gravação. Nenhuma frase sua é publicada com o seu nome.
>
> **Seus direitos:** você pode sair quando quiser, sem explicar por quê, e pedir que eu apague seus dados; é só responder esta mensagem. Os dados ficam guardados até [data] e depois são apagados.
>
> Responsável: [nome e contato].
>
> Se você tem 18 anos ou mais e concorda, responda "aceito".

## Mensagem de início

Mandar depois do "aceito", junto com o questionário inicial e o horário da sessão 1. Troque o código da pessoa. **Não mande o endereço do site antes da sessão 1**: a primeira tarefa observa o primeiro contato com a página.

> Que bom que você topou! Seu código no teste é **[P01]**. Nossa primeira sessão fica marcada para [dia e hora], por [vídeo]. Até lá, responda as perguntas abaixo, por aqui mesmo. Na sessão eu te passo o endereço do site e algumas combinações:
>
> 1. Estude sempre **no mesmo aparelho e no mesmo navegador**, e **não use aba anônima**. O progresso fica guardado no navegador, não numa conta.
> 2. No fim de cada semana, abra **Progresso** e toque em **Exportar JSON**. O arquivo vai para a pasta de downloads (no celular, procure em "Downloads" ou "Arquivos"). Me mande esse arquivo por aqui, como documento.
> 3. Se for ficar mais de uma semana sem abrir o site, exporte antes. Em alguns navegadores, principalmente no iPhone, o site pode perder o progresso guardado depois de vários dias sem ser aberto.
> 4. Travou? Use as dicas do próprio site e siga em frente quando quiser. Pode me contar, mas eu vou mais perguntar do que explicar: é assim que eu descubro o que precisa melhorar.

**Para quem conduz:** o "Exportar JSON" foi testado automaticamente só no Chromium ([Navegadores](#navegadores-e-o-que-foi-verificado)). Faça a primeira exportação junto com a pessoa, no fim da sessão 1, e confira se o arquivo chegou e se a análise o lê.

## Questionário inicial

Cinco perguntas, por mensagem, antes da sessão 1. As três primeiras vão para `conversas.csv` (`ja_programou`, `horas_semana_declaradas`, `aparelho`).

1. Você já programou? Nunca, tentei e parei, ou um pouco.
2. Quantas horas por semana você consegue estudar, de verdade?
3. Você vai estudar mais no celular ou no computador?
4. Por que você quer aprender computação agora?
5. Já tentou outro curso ou site? O que fez você parar?

## Como observar

Vale para as duas sessões.

- **Abertura (5 minutos).** Confirme o aceite e pergunte se pode gravar; sem autorização, só anote. Diga: "Quem está sendo testado é o site, não você. Pense em voz alta: diga o que está procurando e o que espera que aconteça. Vou pedir algumas coisas e não vou ajudar logo de cara, porque quero ver onde o site deixa você sozinho."
- **Uma tarefa de cada vez,** com as palavras do roteiro, sem dizer onde clicar.
- **Não ensine nem aponte.** Se a pessoa ficar parada uns 3 minutos, pergunte só "o que você está procurando?" (isso conta como "com uma pergunta"). Se passar de 5 minutos sem sair do lugar, anote com gravidade alta e então ajude, para a sessão continuar (a tarefa fica "não conseguiu").
- **Anote durante, classifique depois.** Para cada tarefa: o resultado, os minutos aproximados e, em `observacao`, onde travou, com as palavras da pessoa. Cada dificuldade ou defeito vira uma linha no registro de dificuldades; deixe o tipo para decidir com calma, logo depois da sessão.
- **Celular:** a pessoa compartilha a tela pelo próprio aplicativo de vídeo; se não der, a câmera de outro aparelho apontada para a tela também serve.

## As oito tarefas

Cada tarefa tem um objetivo que quem observa consegue conferir na hora. O resultado vai para `tarefas-observadas.csv` com um destes valores: `sozinha` (cumpriu o objetivo sem ajuda), `com uma pergunta` (cumpriu depois de uma pergunta neutra sua, como "o que você está procurando?" ou "o que mais?"), `nao conseguiu` (não cumpriu, mesmo com a pergunta, ou precisou de ajuda) ou `nao feita` (não houve tempo, ou não se aplicava).

| Tarefa | Sessão | O que se avalia |
|---|---|---|
| T1 | 1 | Entendimento da proposta |
| T2 | 1 | Início dos estudos (e o que a pessoa procura de cadastro) |
| T3 | 1 | Clareza da explicação |
| T4 | 1 | Resolução de exercícios |
| T5 | 1 | Uso do tutor |
| T6 | 2 | Retorno em outro dia |
| T7 | 2 | Aplicação num problema novo |
| T8 | 2 | Entendimento do limite gratuito e do benefício da assinatura |

**T1. Entender a proposta.** Abra a página inicial na tela da pessoa (ela ainda não viu o site). Peça: "Olhe esta página por até dois minutos, à vontade. Depois me conte: o que é este site, para quem ele é e quanto custa?"
- Objetivo: com as próprias palavras, a pessoa diz os três pontos: (a) aprender computação ou programação do zero; (b) estudar por conta própria, sem professor; (c) o começo é gratuito.
- Anote quais pontos faltaram e o que ela achou que o site era.

**T2. Começar a estudar.** Peça: "Você quer começar a aprender agora. Mostre como você começaria."
- Objetivo: em até 5 minutos, sem ajuda, chegar à primeira lição do nível 0 ("O que é um computador?") ou ao Diagnóstico.
- Cadastro: a demonstração não tem contas, e o progresso fica no navegador. Anote se a pessoa procurou onde se cadastrar ou entrar e o que pensou ao não achar. O cadastro em si só é verificado pelos testes automáticos (ver [Navegadores](#navegadores-e-o-que-foi-verificado)), não por este piloto.

**T3. Clareza da explicação.** Peça: "Leia as etapas Conceito e Explicação desta lição no seu ritmo, em voz alta ou em silêncio. Quando terminar, me explique com suas palavras o que um computador faz, com um exemplo do seu dia a dia." (As quatro partes do objetivo estão na etapa Explicação.)
- Objetivo: citar pelo menos três das quatro partes (entrada, processamento, armazenamento, saída), com esses nomes ou equivalentes, e apontá-las corretamente no exemplo que ela mesma escolheu.
- Depois pergunte: "Alguma frase ficou confusa ou longa demais?" Cada resposta vira uma linha no registro (tipo `conceito` ou `enunciado`).

**T4. Exercícios.** Peça: "Vá até os exercícios desta lição e faça os dois primeiros. Se errar, faça como faria sozinha: tente de novo, use uma dica ou siga em frente."
- Objetivo: acertar os dois primeiros exercícios da lição, com ou sem dicas, sem abrir a solução.
- Anote, para cada exercício: errou antes de acertar? Usou dica? Abriu a solução? Leu o retorno da correção? (O arquivo exportado guarda tentativas, dicas e soluções; a anotação guarda o porquê.)

**T5. Tutor.** Peça: "Imagine que você ficou com uma dúvida sobre esta lição. Sem me perguntar, como você tiraria essa dúvida aqui no site?" Se a pessoa não achar o tutor em 3 minutos, aponte o botão **Tutor** e anote "com uma pergunta" ou "não conseguiu", conforme o caso, e siga com a segunda parte.
- Objetivo: achar o tutor sem ajuda, fazer uma pergunta com as próprias palavras e dizer se a resposta ajudou ("O que ele te respondeu? Ajudou? O que faltou?").
- Anote a pergunta (sem dados pessoais), se a resposta ajudou na opinião da pessoa e qualquer coisa que pareceu errada. No modo local, o tutor não usa IA externa e diz isso; não prometa que ele "entende tudo". A demonstração não avalia pronúncia nem áudio.

**Fechamento da sessão 1 (8 minutos).** Faça a primeira exportação junto ("Exporte o seu progresso e me mande o arquivo"). Depois: "O que ficou mais claro?", "Em que ponto você não conseguiria continuar sozinha?" e "Alguma coisa te irritou ou te fez querer parar?". Combine a sessão 2 para daqui a 2 a 7 dias.

**T6. Voltar outro dia** (início da sessão 2). A pessoa abre o site no mesmo aparelho e navegador que usou. Peça: "Continue de onde você parou."
- Objetivo: em até 3 minutos, o progresso está lá (lições marcadas em Progresso ou na Trilha) e a pessoa chega à lição em que parou ou à seguinte.
- Se o progresso sumiu, é um defeito de gravidade alta (tipo `defeito`, ou `ambiente` se a causa foi aba anônima ou outro navegador). Pergunte também: "Desde a última vez, você estudou? Quantas vezes? O que te fez voltar, ou não voltar?"

**T7. Problema novo.** Problemas que não estão nas lições, para ver se a pessoa usa o que aprendeu numa situação nova. Escolha o primeiro da lista que a pessoa ainda não fez e cujo conteúdo ela já estudou; anote qual foi em `observacao`. Nos primeiros 10 minutos, não ajude; depois disso, uma pergunta de cada vez ("o que o seu programa faz agora?").

| Se a pessoa já estudou | Problema | Objetivo (resposta conferível) |
|---|---|---|
| Só o nível 0, ou parte dele | "Numa balança de supermercado, você põe as bananas, digita o código do produto e sai uma etiqueta com o preço. O que é entrada, processamento, armazenamento e saída aí?" | Entrada: o peso e o código digitado; processamento: calcular peso × preço por quilo; armazenamento: a tabela de preços guardada na balança; saída: a etiqueta (e o visor). Três das quatro corretas cumprem |
| As condicionais do nível 1 (`l1-condicionais`) | No Laboratório, em Python: "Pela regra de idade do voto no Brasil, votar é obrigatório de 18 a 70 anos, opcional aos 16 e 17 anos e depois dos 70, e não é possível antes dos 16. Escreva um programa que recebe uma idade e mostra `não vota`, `opcional` ou `obrigatório`. Teste com 15, 17, 30 e 75." | `não vota`, `opcional`, `obrigatório`, `opcional` |
| O nível 1 inteiro | No Laboratório: "A conta de luz cobra R$ 0,50 por kWh nos primeiros 100 kWh do mês, e R$ 0,80 por kWh no que passar disso. Escreva uma função `conta(kwh)` que devolva o valor, e mostre o valor para 80, 100 e 250 kWh." | 40,00; 50,00; 170,00 (50 dos primeiros 100, mais 150 × 0,80) |
| A continuação (listas) | No Laboratório: "As temperaturas máximas da semana foram `[31, 29, 33, 34, 28, 30, 32]`, de segunda a domingo. Mostre qual foi a maior variação entre dois dias seguidos (subindo ou descendo) e entre quais dias ela aconteceu." | 6 graus, de quinta (34) para sexta (28) |

Os dois últimos problemas voltam na [conversa final](#conversa-final-20-minutos) para quem chegar lá depois; um problema que a pessoa já fez não se repete.

**T8. Limite gratuito e assinatura.** Peça: "Imagine que você terminou tudo o que é gratuito. O que vem depois? O que é de graça, o que seria pago e o que você ganharia pagando? Procure no site."
- Objetivo: em até 3 minutos, achar a página Planos (pelo aviso sobre a mudança do acesso ou pelo link no rodapé) e dizer corretamente pelo menos três destes quatro fatos: (1) os níveis 0 e 1 são gratuitos, sem prazo; (2) os níveis 2 a 14 vão fazer parte do Premium 30 dias depois que a venda começar, e hoje estão abertos; (3) o Premium inclui o tutor com IA externa, até 20 perguntas por dia dentro de 200 por mês; (4) hoje nada está à venda e nada é cobrado.
- Anote qualquer engano, principalmente se a pessoa achar que vai ser cobrada, que precisa pagar agora ou que o gratuito acaba. Engano sobre cobrança é tratado como defeito de gravidade alta: é um texto que pode enganar.
- Em seguida, as perguntas do preço (vão para `conversas.csv`): "Com o que você compararia esse preço?", "O que precisaria ter para valer isso para você?" e "Hoje, você pagaria? Sim, talvez ou não, e por quê?". A resposta é **intenção declarada**, não compra. Não ofereça venda, desconto, lista de espera nem preço especial, e não peça nenhum dado de pagamento.

## Sessão 1 (observada, 50 minutos)

| Tempo | O quê |
|---|---|
| 5 min | Abertura ([Como observar](#como-observar)) |
| 3 min | T1, com a página inicial aberta por você, na tela da pessoa |
| 5 min | T2. Depois dela, passe as combinações da mensagem de início: mesmo aparelho e navegador, sem aba anônima |
| 10 min | T3, nas etapas Conceito e Explicação da lição "O que é um computador?" |
| 12 min | T4, nos dois primeiros exercícios da mesma lição |
| 7 min | T5 |
| 8 min | Fechamento: primeira exportação junto e três perguntas |

Logo depois (20 minutos): passe as anotações para `tarefas-observadas.csv` e `registro-dificuldades.csv` e classifique os tipos.

## Sessão 2 (outro dia, 40 minutos)

De 2 a 7 dias depois da sessão 1, no aparelho e navegador que a pessoa usou.

| Tempo | O quê |
|---|---|
| 3 min | Abertura curta |
| 5 min | T6 e as perguntas sobre o retorno |
| 15 min | T7, com o problema que cabe no ponto da pessoa |
| 10 min | T8 e as perguntas do preço |
| 7 min | Exportação e fechamento: "O que te faria continuar? O que te faria parar?" |

Logo depois (15 minutos): anotações nos três arquivos.

## Conversa final (20 minutos)

Quando a pessoa terminar o nível 1, ou no fim da terceira semana, o que vier primeiro. Por vídeo ou mensagem.

1. Se a pessoa chegou a um problema de T7 que ainda não fez (a conta de luz depois do nível 1, as temperaturas depois da continuação), proponha-o, com as mesmas regras. Anote em `conversas.csv` (`transferencia_1` para a conta de luz, `transferencia_2` para as temperaturas). Se ela já fez o da conta de luz em T7, copie o resultado para `transferencia_1` em vez de repetir.
2. O questionário final.
3. A última exportação.

## Questionário final

As perguntas 3 e 4 vão para `conversas.csv` (`continuaria_declarado`; `pagaria_declarado` só se não foi perguntado em T8).

1. O que você consegue fazer hoje que não conseguia antes? Mostre um exemplo.
2. O que foi mais difícil? O que ajudou a destravar? Usou as dicas, a revisão e o tutor?
3. Você continuaria estudando aqui sozinho? Sim, talvez ou não. O que faria você parar?
4. (Se ainda não perguntou) Hoje, você pagaria a assinatura? Sim, talvez ou não, e por quê?
5. O que você mudaria primeiro na Alicerce?

## Agenda

Pensada para até 2 horas por dia de quem conduz. Os dias são de trabalho e podem ser espaçados; o que conta é a ordem. Cada pessoa toma cerca de 2h45 de quem conduz (as duas sessões, a conversa final e as anotações); com 10 pessoas, preparação e análise, o piloto inteiro fica perto de 40 horas, umas cinco a seis semanas.

**Preparação (4 dias)**

| Dia | O quê | Tempo |
|---|---|---|
| 1 | Ler este documento. Abrir a demonstração no celular e no computador e fazer você mesmo T1 a T8, cronometrando. Decidir se publica antes a versão nova do tutor ([Formato](#formato)) | 1h30 |
| 2 | Criar a pasta do piloto fora do repositório, copiar para ela os três CSV de `docs/piloto/`, completar o termo com a data de exclusão dos dados, preparar a lista que liga código e nome | 1h |
| 3 | Listar candidatos pelo perfil, fazer as três perguntas de triagem, escolher as 2 pessoas da onda 1 | 1h |
| 4 | Mandar o convite às 2, o termo, a mensagem de início com o questionário inicial, e marcar as sessões 1 | 30 min |

**Onda 1, de ensaio (cerca de 1 semana)**

| Dia | O quê | Tempo |
|---|---|---|
| 5 | Sessão 1 com P01, anotações | 1h10 |
| 6 | Sessão 1 com P02, anotações | 1h10 |
| 7 | Revisar as anotações das duas, classificar os tipos, ajustar palavras do roteiro que confundiram | 40 min |
| 8 a 12 | Sessão 2 de P01 e de P02 (dias diferentes), anotações. Nos outros dias, uma mensagem curta a cada uma: "Onde você está? O que foi mais difícil até agora?" | 55 min por sessão; 10 min por mensagem |
| 12 | Rodar a análise, preencher o modelo de relatório da onda 1, aplicar os [critérios](#critérios-preliminares-prosseguir-corrigir-ou-interromper) e decidir | 1h30 |

**Correções (se os critérios pedirem):** os bloqueios encontrados são corrigidos no código ou no texto antes da onda 2. O tempo de quem conduz é o de aprovar e publicar; enquanto isso, já dá para recrutar a onda 2.

**Onda 2 (cerca de 3 semanas)**

| Período | O quê | Tempo por dia |
|---|---|---|
| Primeiros 2 dias | Triagem, convites, termos e mensagens de início das 6 a 10 pessoas | 1h a 1h30 |
| Dias seguintes | No máximo uma sessão 1 e uma sessão 2 por dia, com as anotações, mais as mensagens do meio do caminho | até 2h |
| Fim da terceira semana | Conversas finais (20 min cada, mais 10 de anotação), no máximo três por dia | até 1h30 |

**Fechamento (3 dias)**

| Dia | O quê | Tempo |
|---|---|---|
| 1 | Conferir que chegou a última exportação de cada pessoa; rodar a análise | 1h |
| 2 | Preencher `docs/piloto/modelo-relatorio.md` (numa cópia fora do repositório) | 2h |
| 3 | Aplicar os critérios, decidir o que corrigir e se o piloto maior começa; apagar o que não precisa ficar guardado | 1h |

## Registro de dificuldades e defeitos

Modelo: `docs/piloto/registro-dificuldades.csv`. Uma linha por dificuldade ou defeito, observado numa sessão ou contado pela pessoa. A primeira linha depois do cabeçalho é um exemplo (participante "exemplo") e é ignorada pela análise.

| Coluna | O que vai |
|---|---|
| `participante` | O código (P01) |
| `data` | AAAA-MM-DD |
| `licao` | O id da lição, que aparece no endereço da página (`/licao/l1-loops`). Fora de uma lição, o endereço da página, começando por `/` (`/planos`, `/progresso`, `/` para a inicial) |
| `exercicio` | A posição do exercício na lição (`3` para o terceiro), se for num exercício; senão, vazio. A análise troca a posição pelo id |
| `tipo` | `conceito` (a ideia não ficou clara), `enunciado` (não entendeu o que se pedia), `interface` (não achou ou não entendeu a tela, o botão, a navegação), `defeito` (algo quebrou: erro na tela, botão que não responde, resposta certa marcada como errada, progresso perdido, texto que engana), `ambiente` (internet, navegador, aba anônima, Python que não carregou por causa do aparelho) ou `outro` |
| `descricao` | De preferência com as palavras da pessoa. Em defeitos: o que fez, o que esperava e o que aconteceu, com o aparelho e o navegador |
| `o_que_destravou` | Dica, explicação de outra lição, tutor, conversa, nada |
| `gravidade` | `baixa` (seguiu sozinha), `media` (precisou de dica ou de muito tempo) ou `alta` (parou ali, desistiu, perdeu trabalho ou foi enganada por um texto) |

A análise avisa quando uma linha cita uma lição fora da jornada, uma posição que a lição não tem, um tipo ou gravidade fora da lista, ou um código sem arquivo de progresso. Acentos e maiúsculas não fazem diferença.

## Anotações das sessões

Modelo: `docs/piloto/tarefas-observadas.csv`. Uma linha por pessoa e tarefa. A linha "exemplo" é ignorada.

| Coluna | O que vai |
|---|---|
| `participante` | O código (P01) |
| `sessao` | `1` ou `2` |
| `tarefa` | O número da tarefa, de 1 a 8 (`T3` também serve) |
| `resultado` | `sozinha`, `com uma pergunta`, `nao conseguiu` ou `nao feita` ([As oito tarefas](#as-oito-tarefas)) |
| `minutos` | Aproximado, até cumprir ou desistir |
| `observacao` | O que faltou, onde travou, com as palavras da pessoa; em T7, qual problema |

Se a mesma tarefa for anotada duas vezes para a mesma pessoa, vale a última linha.

## Anotações das conversas

Modelo: `docs/piloto/conversas.csv`. Uma linha por pessoa, preenchida ao longo do piloto. A linha "exemplo" é ignorada.

| Coluna | O que vai |
|---|---|
| `participante` | O código (P01) |
| `aparelho` | Onde disse que estudaria mais: `celular`, `computador` ou `os dois` |
| `ja_programou` | `nunca`, `tentei e parei` ou `um pouco` |
| `horas_semana_declaradas` | O número que a pessoa disse no questionário inicial |
| `transferencia_1`, `transferencia_2` | Na conversa final: `sozinha`, `com perguntas`, `nao resolveu` ou `nao fez` |
| `transferencia_1_min`, `transferencia_2_min` | Minutos até resolver ou desistir |
| `pagaria_declarado` | A resposta a "Hoje, você pagaria?": `sim`, `talvez`, `nao` ou `nao perguntado` |
| `continuaria_declarado` | A resposta a "Você continuaria estudando aqui sozinho?": `sim`, `talvez`, `nao` ou `nao perguntado` |
| `observacao` | Com o que comparou o preço, o que faltaria, qualquer outra coisa |

`pagaria_declarado` e `continuaria_declarado` são o que a pessoa disse. O relatório mostra essas contagens com o título "declarado" e, ao lado, que compras foram zero, porque nesta rodada nada é vendido.

## Indicadores mínimos

Todos saem da análise, contados em pessoas. Não têm meta: numa amostra deste tamanho eles mostram onde olhar, não medem resultado.

| O que acompanhar | Indicador | De onde vem |
|---|---|---|
| Ativação | Abriu a primeira lição e conferiu pelo menos um exercício | Arquivo exportado |
| Conclusão de atividades | Concluiu o nível 0; concluiu o gratuito (níveis 0 e 1); concluiu a continuação. Tarefas cumpridas nas sessões | Arquivo exportado; `tarefas-observadas.csv` |
| Retorno | Estudou em 2 dias ou mais (exercício, revisão ou pergunta ao tutor); voltou depois de 7 dias sem estudar; T6 | Arquivo exportado; `tarefas-observadas.csv` |
| Dificuldades | Teve pelo menos uma dificuldade registrada; parou numa dificuldade (gravidade alta); onde elas se concentram | `registro-dificuldades.csv` |
| Uso do tutor | Fez pelo menos uma pergunta ao tutor, e a mediana de perguntas de quem usou; T5 | Arquivo exportado (só a contagem por dia, e só na versão do site que a tem); `tarefas-observadas.csv` |
| Interesse em continuar | Começou a continuação (o que a pessoa fez); continuaria estudando (o que disse) | Arquivo exportado; `conversas.csv` |
| Interesse em pagar | Pagaria (o que disse) e, separado, compras: nenhuma | `conversas.csv` |

Nenhum evento sai do navegador da pessoa por conta própria: a demonstração não tem servidor nem ferramenta de análise. Os dados chegam só pelo arquivo que a pessoa exporta e manda, e pelas anotações de quem conduz.

## Exportação e análise

1. Junte os arquivos numa pasta **fora do repositório**, cada um com o código da pessoa no nome: `P01.json`, ou `P01-semana1.json` e `P01-semana2.json`. Arquivos com o mesmo código são juntados, sem contar nada duas vezes. Se a pessoa reiniciou o progresso entre um arquivo e outro, a análise junta os dois e avisa.
2. Preencha `registro-dificuldades.csv`, `tarefas-observadas.csv` e `conversas.csv` (uma planilha exportada como CSV serve) e guarde-os na mesma pasta.
3. Rode a análise:

   ```bash
   node scripts/piloto/analisar.ts <pasta com os JSON> --registro <registro.csv> --tarefas <tarefas-observadas.csv> --conversas <conversas.csv> --csv <pasta de saída>
   ```

   Sai um relatório em Markdown com os indicadores mínimos, o resultado de cada tarefa das sessões, o funil da jornada, onde as pessoas pararam, os exercícios que mais travaram, o registro agrupado por lugar, os problemas novos da conversa final, o interesse declarado e os candidatos a aprofundar. Com `--csv`, também `exercicios.csv`, `licoes.csv` e `tarefas.csv`, para abrir numa planilha. Se alguma das pastas ou arquivos estiver dentro do repositório (fora de `piloto-dados/`), a análise avisa.
4. Copie `docs/piloto/modelo-relatorio.md` para a pasta do piloto e preencha com o relatório da análise e as anotações. Só entra no relatório o que aconteceu: sessões feitas, respostas dadas, números que a análise contou. Frases de participantes, só com o código e sem nada que identifique a pessoa.

## Critérios preliminares: prosseguir, corrigir ou interromper

Aplicados no fim da onda 1 (2 pessoas) e no fim da onda 2. São critérios de decisão para quem conduz, escritos antes de ver os dados para não serem ajustados a eles. Com 2 pessoas, um único caso já é motivo para olhar; com 8 a 12, os números continuam sendo sinais qualitativos, sem valor estatístico. A intenção declarada de pagar não entra em nenhum critério de "prosseguir": ela não mostra demanda.

**Interromper a expansão** (ninguém novo entra até resolver), se acontecer qualquer um:
- Um defeito de gravidade alta que pode se repetir com outras pessoas: progresso perdido sem aba anônima nem troca de navegador, Python que não carrega num aparelho comum, resposta certa marcada como errada, exportação que não funciona.
- Uma pessoa entendeu que seria cobrada, que precisava pagar para continuar agora ou que o gratuito acaba (T8, ou qualquer momento).
- Um dado pessoal apareceu onde não devia (no arquivo exportado, numa anotação guardada no repositório, numa resposta do tutor).
- Na onda 1, as duas pessoas não conseguiram começar a estudar (T2) nem com uma pergunta.

**Corrigir antes de ampliar** (corrige e segue, com a mudança anotada), se:
- A mesma tarefa ficou "não conseguiu" para 2 ou mais pessoas (na onda 1, para as duas).
- O mesmo lugar (lição, exercício ou página) teve dificuldade registrada por 2 ou mais pessoas, de qualquer tipo.
- Metade ou mais das pessoas não cumpriu T1 (proposta) ou T8 (limite gratuito e assinatura), mesmo com uma pergunta: o texto do site não explica o que deveria.
- O tutor deu, para alguém, uma resposta errada, inventou um recurso ou progresso, ou entregou a solução sem ser pedida.

**Prosseguir** (para a onda 2, ou, no fim da onda 2, para o piloto maior), se nenhuma das situações acima está aberta e:
- T2, T4 e T6 foram cumpridas (sozinha ou com uma pergunta) por pelo menos metade das pessoas; e
- as dificuldades registradas estão espalhadas, sem um lugar que concentre metade das pessoas.

No fim da onda 2, junte a decisão a [O que corrigir primeiro](#o-que-corrigir-primeiro).

## O que corrigir primeiro

A jornada inicial vem antes de qualquer conteúdo novo: enquanto houver um item dos três primeiros grupos aberto, aulas e níveis novos não entram na fila.

1. **Bloqueios e defeitos na trilha gratuita**, de tipo `defeito`, `ambiente` ou `interface`: Python que não carrega, botão que não aparece no celular, progresso perdido, texto que engana sobre o que é pago. Vêm primeiro porque impedem todo o resto, e costumam ser os mais baratos de corrigir.
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

- O arquivo exportado tem as tentativas de exercício (acertou, dicas, erros, se viu a resposta, tempo), as lições visitadas e concluídas, as revisões, o resultado do diagnóstico, se foi feito, os marcos de projeto marcados e, na versão do site com a contagem do tutor (branch `rodada-24-10` em diante), quantas perguntas a pessoa fez ao tutor em cada dia (só o número). Não tem nome, e-mail, senha, o texto das perguntas nem o código que a pessoa escreveu.
- Guarde os arquivos e as anotações numa pasta fora do repositório e fora de pastas compartilhadas publicamente. Se, por engano, a pasta ficar dentro do repositório com o nome `piloto-dados/`, o `.gitignore` impede que ela vá para o GitHub; em qualquer outro lugar do repositório, a análise avisa.
- Nas anotações, nada que identifique a pessoa: só o código. A lista que liga código e nome fica só com quem conduz.
- Gravações, só com autorização, guardadas com o mesmo cuidado e apagadas no mesmo prazo.
- Apague tudo no fim do prazo informado no termo, e na hora se a pessoa pedir.

## Navegadores e o que foi verificado

- Verificado em 24/10/2026, só no **Chromium** sem interface (o único navegador instalado no ambiente de testes), com tela de computador e com a tela de um Pixel 7 simulada pelo próprio Chromium:
  - no build da demonstração (`e2e/pages.spec.ts`, o mesmo modo estático do GitHub Pages, servido por uma imitação dele): fazer um exercício, perguntar ao tutor, exportar em Progresso e rodar a análise sobre o arquivo baixado, com a contagem do tutor e os modelos de `docs/piloto/`;
  - no servidor (`e2e/fluxos.spec.ts`): a mesma exportação e, entre outros fluxos, o cadastro, a sincronização e a saída de uma conta.
- **Não verificado:** Firefox, Safari (Mac e iPhone), Chrome num celular de verdade e outros navegadores de celular. A tela de celular simulada não é um navegador de celular: onde o arquivo baixado vai parar e como a pessoa o encontra não foram testados. Um resultado no Chromium não vale para os outros; por isso a primeira exportação é feita junto, na sessão 1, e anotada no registro se der errado (tipo `ambiente` ou `defeito`).
- No Safari, há uma regra conhecida de apagar o que o site guardou no navegador depois de 7 dias de uso do Safari sem abrir o site ([explicação](https://searchengineland.com/what-safaris-7-day-cap-on-script-writeable-storage-means-for-pwa-developers-332519)). Não foi testada aqui; é a razão do item 3 da mensagem de início.

## Limites

- Quem se oferece para um piloto costuma ser mais motivado que a média, então o abandono aqui tende a ser menor que fora dele. Ser observado também muda o comportamento: nas sessões, as pessoas insistem mais do que insistiriam sozinhas.
- O progresso fica no navegador: quem usou outro aparelho sem exportar aparece com menos do que fez.
- O tempo por exercício é aproximado. O site conta a partir de quando a etapa da lição abriu, e uma etapa mostra vários exercícios; a análise passa a contar a partir do exercício anterior, mas pausas continuam dentro. As durações das lições no site são estimativas e não são comparadas com nada medido.
- Concluir lições e acertar exercícios não prova aprendizagem. T3, T7 e a conversa final dizem mais sobre isso, e ainda assim com uma amostra pequena.
- O cadastro, a recuperação de senha e a sincronização entre aparelhos não são testados por pessoas neste piloto: a demonstração não tem servidor.
- O que as pessoas dizem sobre o preço e sobre continuar é intenção declarada; fica separado de qualquer pagamento, que nesta rodada não existe. Nenhuma conversão paga é medida nem pode ser apresentada como validada.
