import {systemsAppliedTheory} from './theory/systems-applied.ts';
import {systemsWebTheory} from './theory/systems-web.ts';
import {algorithmTheory} from './theory/algorithms.ts';
import {structureTheory} from './theory/structures.ts';
import type { Block, Level } from './types.ts';
import { referenceById } from './references.ts';

import type { TheoryExpansion } from './theory-types.ts';
import { foundationTheory } from './theory/foundations.ts';

/** Redação original. Pesquisa e limites editoriais: docs/APROFUNDAMENTO_TEORICO.md.
 * Não exportar este módulo em lite.ts: inclui corpos de aulas Premium.
 */
const initialTheoryExpansions: TheoryExpansion[] = [
  {
    "level": 0,
    "lessonId": "l0-o-que-e-computador",
    "title": "Representação, estado e camadas de abstração",
    "prerequisite": "Nenhuma linguagem de programação é necessária. Você precisa apenas acompanhar uma sequência de passos e distinguir um valor de sua representação.",
    "objective": "Explicar como o mesmo padrão de bits pode ganhar significados diferentes e separar entrada, processamento e saída.",
    "explanation": "### O computador manipula representações\nUm dado é uma representação de algo que escolhemos observar. A temperatura de uma sala, por exemplo, é um fenômeno físico; o número 26 em um programa é uma representação com unidade e precisão escolhidas. O computador opera sobre essa representação segundo instruções. Ele não descobre sozinho se 26 significa graus, idade ou quantidade de itens.\n\nUm **bit** distingue dois estados. Com dois bits há quatro combinações; acrescentar um bit duplica o número de combinações. Oito bits permitem 256 padrões. Isso não significa que um byte sempre represente um número entre 0 e 255: essa é uma interpretação possível, a de inteiro sem sinal. Texto, cor e instruções precisam de convenções próprias.\n\n### Estado e transformação\nChamamos de **estado** os valores relevantes em determinado instante. Um programa transforma esse estado. No cadastro de um estoque, o estado pode conter a quantidade disponível e uma lista de vendas. A entrada de uma venda provoca uma transformação; a tela mostra uma saída. Uma saída bem desenhada não prova que o estado interno esteja correto.\n\n### Abstrair sem perder o significado\nCamadas permitem pensar em tarefas sem controlar cada sinal elétrico. Um editor trabalha com texto; o sistema operacional administra arquivos; o hardware realiza operações físicas. A abstração esconde detalhes, mas tem limites: salvar um documento ainda pode falhar por falta de espaço. Sempre pergunte quais detalhes a camada esconde e quais falhas ela ainda pode expor.",
    "worked": "### Exemplo resolvido: um sensor de presença\nProjetamos um sensor com três bits. O primeiro indica porta aberta, o segundo movimento e o terceiro alarme habilitado. O padrão 101 significa porta aberta, sem movimento e alarme habilitado. Como inteiro sem sinal, o mesmo padrão vale 5. Não há contradição: mudamos a regra de interpretação.\n\n1. Definimos os três significados antes de escrever código.\n2. Lemos o padrão recebido: 101.\n3. Aplicamos a regra do produto: avisar se o alarme estiver habilitado e a porta estiver aberta.\n4. Produzimos o aviso. O sensor não precisa armazenar a frase inteira em seus três bits.\n\nObserve a fronteira: os bits permitem comunicar o estado observado, mas não garantem que o sensor esteja calibrado ou que a leitura esteja atualizada.",
    "misconception": "“Tudo é número, então o significado não importa.” Na implementação, representações usam padrões discretos; no projeto, unidades, codificação e contexto são indispensáveis. Somar uma idade a uma temperatura é possível numericamente, mas não resolve um problema bem definido.",
    "question": "Seu programa recebe 00000001. É possível concluir, apenas olhando os bits, que esse dado significa verdadeiro? Justifique e dê duas interpretações possíveis.",
    "feedback": "Não. Pode representar o inteiro sem sinal 1, um indicador booleano em uma convenção específica ou parte de outra codificação. Uma boa resposta separa o padrão físico/lógico da convenção que lhe dá significado.",
    "extension": "Desenhe entrada, estado, transformação e saída de um contador de visitantes. Explique o que ocorre se uma entrada for registrada duas vezes.",
    "sources": [
      "cs50",
      "cs2023"
    ],
    "table": {
      "head": [
        "Padrão",
        "Interpretação escolhida",
        "Resultado"
      ],
      "rows": [
        [
          "101",
          "Inteiro binário sem sinal",
          "5"
        ],
        [
          "101",
          "Porta / movimento / alarme",
          "Aberta / não / habilitado"
        ]
      ],
      "caption": "O significado depende da convenção."
    }
  },
  {
    "level": 1,
    "lessonId": "l1-algoritmos",
    "title": "Especificação, correção e raciocínio passo a passo",
    "prerequisite": "Distinguir entrada e saída. Os símbolos do exemplo são pseudocódigo; não é necessário memorizar sintaxe Python.",
    "objective": "Escrever um contrato simples, rastrear estados e justificar por que um procedimento termina com a resposta esperada.",
    "explanation": "### Antes do algoritmo, defina o problema\nUm **contrato** descreve quais entradas aceitamos e o que prometemos devolver. A pré-condição vale antes da execução; a pós-condição descreve o resultado esperado. “Encontrar uma nota” é vago. “Receber uma lista não vazia de notas e devolver a maior” permite avaliar uma solução.\n\nExemplos revelam ambiguidades: aceitar negativos muda como inicializamos o maior; aceitar lista vazia exige decidir entre erro, ausência de resultado ou outra regra. Essa decisão pertence à especificação, não deve aparecer por acidente no código.\n\n### Um argumento que acompanha a execução\nUm **invariante** é uma afirmação que permanece verdadeira em um ponto determinado de cada repetição. Para calcular uma soma, podemos dizer: antes de ler o próximo item, o acumulador contém a soma dos itens já lidos. Justificamos três passos: é verdadeiro no início, continua verdadeiro após processar um item e, quando não há mais itens, implica a resposta desejada.\n\nIsso prova uma propriedade sob as hipóteses declaradas. Testar alguns exemplos oferece evidência e encontra erros, mas não demonstra sozinho que todos os casos possíveis funcionam.\n\n### Terminar também faz parte da correção\nPara uma lista finita, consumir um item a cada volta reduz a quantidade que falta processar. Se o algoritmo não avança, um invariante pode continuar verdadeiro e mesmo assim a execução nunca terminar. Diferencie produzir a resposta certa quando termina de garantir que termina.",
    "worked": "### Exemplo resolvido: somar doações\nContrato: receber uma lista finita de valores inteiros em centavos e devolver a soma, incluindo zero para a lista vazia. Para [200, 350, 100], iniciamos total = 0. Após ler 200, total = 200. Após 350, total = 550. Após 100, total = 650.\n\nO invariante é: total representa a soma das doações já processadas. Ele vale antes da primeira leitura porque a soma de nenhum item é zero. Acrescentar o próximo valor preserva a afirmação. Ao consumir a lista inteira, o total é a soma pedida.\n\nO caso vazio não precisa de improviso: nenhuma iteração ocorre e o retorno é 0, como prometido. Esse raciocínio depende de somar números representados corretamente; aqui usamos centavos inteiros para evitar arredondamento decimal nesse exemplo.",
    "misconception": "“Passou nos exemplos, está provado.” Um algoritmo que inicia o maior em 0 funciona com notas positivas, mas falha em listas só de valores negativos. Contraexemplos são ferramentas para refinar o contrato e o algoritmo.",
    "question": "Para contar apenas os valores positivos de uma lista, que afirmação deve ser verdadeira sobre o contador antes de cada nova leitura? O que acontece com a lista vazia?",
    "feedback": "O contador deve ser igual ao número de valores maiores que zero entre os itens já processados. Começa em 0, aumenta apenas para um item positivo e permanece em 0 para a lista vazia. Não é a soma dos valores nem o total de itens.",
    "extension": "Crie exemplos com negativos, zero, repetições e lista vazia. Explique a correção antes de implementar. Depois compare seus exemplos com a saída do código.",
    "sources": [
      "htdp",
      "mit-6042"
    ],
    "table": {
      "head": [
        "Item lido",
        "Total antes",
        "Total depois"
      ],
      "rows": [
        [
          "200",
          "0",
          "200"
        ],
        [
          "350",
          "200",
          "550"
        ],
        [
          "100",
          "550",
          "650"
        ]
      ],
      "caption": "Rastreamento da soma em centavos."
    }
  },
  {
    "level": 2,
    "lessonId": "l2-listas",
    "title": "Nomes, objetos e cópias: entendendo a memória em Python",
    "prerequisite": "Variáveis, atribuição, funções e a sintaxe inicial de listas apresentada nesta lição.",
    "objective": "Distinguir reatribuição de mutação e prever o efeito de compartilhar uma lista entre dois nomes.",
    "explanation": "### Nome não é o objeto\nEm Python, um nome está associado a um objeto. A instrução b = a associa b ao objeto indicado por a; não significa automaticamente criar outro objeto igual. Dois nomes podem, portanto, permitir observar a mesma lista. Essa situação é chamada de **aliasing**.\n\nUma **mutação** altera um objeto existente, como acrescentar um item com append. Uma **reatribuição** muda a associação de um nome, como a = [9]. Essa distinção explica por que uma função pode alterar uma lista recebida e por que associar o parâmetro a uma nova lista não substitui a variável do chamador.\n\n### Igualdade não é identidade\nIgualdade compara valores segundo as regras do tipo; identidade pergunta se estamos diante do mesmo objeto. Duas listas criadas separadamente podem ter elementos iguais sem serem a mesma lista. Use == para comparação de valores; não use is como atalho para comparar textos ou números.\n\n### Cópia rasa tem um limite\na.copy() cria outra lista externa, mas seus elementos continuam sendo referências aos mesmos objetos. Se um desses elementos for outra lista, mudar essa lista interna será observado pelos dois caminhos. O objetivo não é decorar “copie sempre”: é definir quem pode modificar cada estrutura e escolher compartilhamento, cópia ou dados imutáveis de acordo com esse contrato.",
    "worked": "### Exemplo resolvido: lista compartilhada\nConsidere a = [2, 4] e b = a. Há uma lista e dois nomes associados a ela. Executar b.append(6) muda essa lista: tanto a quanto b mostram [2, 4, 6]. Executar depois b = [10] cria uma nova associação para b; a continua mostrando [2, 4, 6].\n\nAgora considere original = [[1], [2]] e copia = original.copy(). Existem duas listas externas, mas a primeira lista interna é compartilhada. Por isso, copia[0].append(3) faz original[0] mostrar [1, 3]. Já copia.append([9]) altera só a lista externa copia.\n\nPara investigar, desenhe nomes como etiquetas e listas como objetos separados. Use uma seta para cada associação. O desenho precisa mostrar a estrutura aninhada, não apenas escrever os valores duas vezes.",
    "misconception": "“Passar uma lista para uma função copia a lista.” O parâmetro ganha uma associação ao objeto recebido. Mutação e reatribuição têm efeitos diferentes; chamar tudo de “passagem por referência” sem explicar esses efeitos costuma esconder o problema.",
    "question": "Uma função recebe uma lista e executa itens = []. A lista original é esvaziada? E se executasse itens.clear()?",
    "feedback": "itens = [] reassocia o nome local a uma nova lista e não esvazia a original. itens.clear() altera a lista recebida, tornando a mudança observável por outros nomes ligados ao mesmo objeto.",
    "extension": "Antes de executar, preveja o resultado de uma cópia rasa de uma lista que contém apenas inteiros e compare com uma lista de listas. Explique por que a estrutura interna importa.",
    "sources": [
      "python-objects-deep",
      "python-copy-deep",
      "python-data-model-deep"
    ],
    "table": {
      "head": [
        "Operação",
        "Valor observado por a",
        "Valor observado por b"
      ],
      "rows": [
        [
          "a = [2, 4]; b = a",
          "[2, 4]",
          "[2, 4]"
        ],
        [
          "b.append(6)",
          "[2, 4, 6]",
          "[2, 4, 6]"
        ],
        [
          "b = [10]",
          "[2, 4, 6]",
          "[10]"
        ]
      ],
      "caption": "Mutação do objeto e reatribuição do nome são operações distintas."
    }
  },
  {
    "level": 3,
    "lessonId": "l3-arrays",
    "title": "Contrato de operações e custo da representação",
    "prerequisite": "Listas e índices. Custo O(n) significa crescimento proporcional a n neste modelo; a formalização vem no nível de algoritmos.",
    "objective": "Escolher uma representação a partir das operações necessárias, explicitando custos e hipóteses.",
    "explanation": "### Interface e implementação são decisões diferentes\nUma estrutura pode oferecer operações como ler por posição, inserir e remover. Esse conjunto de operações forma um contrato. A representação interna determina como o contrato é cumprido: armazenar referências em posições consecutivas é diferente de ligar nós por referências.\n\nEm um array de posições de tamanho fixo, localizar o índice i usa a posição inicial e um deslocamento calculável. Não é preciso percorrer os i elementos anteriores. Na lista dinâmica do CPython, o armazenamento contíguo é de referências; os objetos apontados não precisam estar lado a lado.\n\n### A operação importa mais que o rótulo\nLer uma posição pode ter custo constante, enquanto inserir no começo exige abrir espaço, deslocando referências. Crescer a capacidade pode exigir copiar várias posições. Isso explica por que append pode ser barato em média ao longo de muitas operações e ainda assim ter chamadas individuais caras.\n\nCompare o custo de uma sequência de operações, não apenas o nome “lista”. Uma estrutura útil para percorrer todos os itens pode ser ruim para muitas inserções na frente. Espaço adicional, localidade de memória e complexidade do código também fazem parte da escolha.",
    "worked": "### Exemplo resolvido: abrir espaço no começo\nSuponha um array com [A, B, C, D] e capacidade livre ao final. Para inserir X no índice 0 preservando a ordem, movemos D, C, B e A uma posição à direita; depois gravamos X. Foram quatro deslocamentos e uma gravação nova.\n\nCom n elementos, essa inserção exige n deslocamentos nesse modelo, mesmo havendo capacidade livre. Fazer uma inserção no final, com espaço disponível, não exige deslocar os anteriores.\n\nSe uma aplicação acrescenta muitos eventos ao final e lê posições, o array dinâmico é um candidato razoável. Se precisa remover continuamente do começo de uma fila, uma deque merece análise. A decisão vem do padrão de uso, não de uma estrutura ser universalmente superior.",
    "misconception": "“Acesso O(1) torna todas as operações O(1).” A complexidade pertence a uma operação sob determinadas hipóteses. Inserção, busca por valor e leitura por índice são problemas diferentes.",
    "question": "Há espaço livre em um array com 8 itens. Inserir no início ainda exige trabalho proporcional ao número de itens? Explique por que a capacidade livre não resolve tudo.",
    "feedback": "Sim, se a ordem for preservada por deslocamento, os 8 itens precisam mover uma posição. A capacidade livre evita uma realocação, mas não elimina o trabalho de abrir a posição inicial.",
    "extension": "Liste as operações dominantes de um histórico de navegação e de uma fila de atendimento. Justifique escolhas diferentes de estrutura e inclua uma desvantagem de cada escolha.",
    "sources": [
      "mit-6006",
      "python-time-complexity"
    ]
  },
  {
    "level": 4,
    "lessonId": "l4-big-o",
    "title": "Modelo de custo, limites e validade da comparação",
    "prerequisite": "Laços, listas e a distinção entre correção e desempenho. Relembre potências e a ideia de contar operações.",
    "objective": "Relacionar tamanho de entrada a número de operações sem confundir notação assintótica, tempo medido e caso analisado.",
    "explanation": "### Primeiro escolha o que será contado\nUma análise precisa declarar o tamanho de entrada n e uma operação relevante: comparações, acessos ou outra unidade. Para procurar um valor em uma lista, n pode ser o número de itens. Para somar inteiros arbitrariamente grandes, a quantidade de bits também pode importar. Tratar toda operação como constante é uma hipótese do modelo, não uma lei física.\n\n### O limite não escolhe o caso\nO(n) expressa um limite superior assintótico. Não significa por definição “pior caso”. Podemos analisar melhor caso, pior caso ou custo esperado e então expressar um limite para a função escolhida. Θ(n) expressa uma ordem de crescimento limitada por múltiplos constantes de n, por cima e por baixo, para entradas suficientemente grandes.\n\nTambém não é correto transformar O(n) em “leva n segundos”. Hardware, constantes, compilação, cache e tamanho real afetam o tempo observado. Análise e medição respondem perguntas complementares.\n\n### Distinguir duas formas de média\nCusto esperado depende de uma distribuição ou de escolhas aleatórias declaradas. Custo amortizado distribui o custo total de uma sequência de operações e não exige imaginar entradas aleatórias. Misturar os dois pode levar a uma garantia que o algoritmo não oferece.",
    "worked": "### Exemplo resolvido: busca linear\nEm [4, 9, 2, 7], procurar 4 exige uma comparação; procurar 7 exige quatro; procurar um número ausente também exige quatro. Para n itens, o melhor caso de uma busca bem-sucedida é constante e o pior caso é linear.\n\nSe o item existe e cada uma das n posições é igualmente provável, a média de comparações é (1 + 2 + ... + n) / n = (n + 1) / 2. A conclusão depende dessa hipótese; ela não descreve automaticamente o tráfego de uma aplicação real.\n\nAgora compare dois programas: um faz aproximadamente 100n operações e outro n². Para n = 10, o segundo pode fazer menos operações neste modelo; para n = 1.000, o primeiro faz menos. Crescimento assintótico orienta escala, mas não elimina a análise do tamanho usado.",
    "misconception": "“Dois laços significam O(n²).” Dois laços consecutivos de n passos somam 2n. Laços aninhados exigem contar quantas vezes o corpo realmente executa; os limites podem depender entre si.",
    "question": "Um programa percorre n itens e depois percorre os mesmos n itens novamente. Qual é a ordem do custo total, supondo trabalho constante por item? Por quê?",
    "feedback": "Θ(n), porque há 2n passos relevantes, mais custos constantes. Os percursos são consecutivos; não são n execuções de um segundo percurso completo.",
    "extension": "Escreva uma análise de três linhas: defina n, conte a operação e indique o caso. Só depois use Big O. Compare com uma medição e explique uma possível diferença.",
    "sources": [
      "mit-6006",
      "mit-algorithms-syllabus"
    ]
  },
  {
    "level": 5,
    "lessonId": "l5-classes",
    "title": "Objetos como contratos que preservam regras",
    "prerequisite": "Funções, listas, mutação e os conceitos iniciais de classe e método desta lição.",
    "objective": "Definir invariantes e avaliar se uma interface impede transições inválidas de estado.",
    "explanation": "### A classe tem uma responsabilidade\nAgrupar variáveis numa classe não basta para obter um bom modelo. O objeto precisa representar uma responsabilidade e oferecer operações coerentes. Pergunte: quais estados são válidos, quais mudanças são permitidas e quem pode solicitá-las?\n\nUma **invariante de representação** é uma condição que deve valer nos estados observáveis do objeto. Em uma vaga de estacionamento, ocupação pode variar entre zero e capacidade. O construtor deve estabelecer essa condição; cada operação pública deve preservá-la ou rejeitar a mudança.\n\n### Encapsulamento protege uma decisão\nEsconder detalhes permite mudar a representação sem obrigar todos os usuários da classe a mudar. Uma fila pode trocar sua estrutura interna mantendo as operações de inserir e retirar. Em Python, prefixar um atributo com _ comunica que ele é interno, mas não cria uma barreira de segurança contra código malicioso.\n\n### Estado, comportamento e identidade\nDois objetos podem ter o mesmo conteúdo e continuar representando entidades diferentes. Dois ingressos com preço igual não são o mesmo ingresso. Em outros casos, como coordenadas, comparar pelo valor é adequado. Defina o significado de igualdade conforme o domínio; não deixe a decisão depender apenas da facilidade de gerar um método.",
    "worked": "### Exemplo resolvido: reserva de vagas\nUma sala tem capacidade 3 e nenhuma reserva. Definimos a invariante 0 ≤ reservas ≤ 3. reservar() só aumenta reservas se houver espaço; cancelar() só diminui se existir uma reserva a cancelar.\n\n1. O construtor recebe capacidade 3 e estabelece reservas = 0.\n2. Três reservas sucessivas levam a 1, 2 e 3.\n3. Uma quarta solicitação é rejeitada sem alterar o estado.\n4. Cancelar uma reserva leva a 2; reservar novamente leva a 3.\n\nSe permitirmos atribuir reservas = -8 livremente pela interface normal, as regras deixam de ser garantidas por esse desenho. A vantagem do objeto está nas operações que preservam o contrato. Num servidor com usuários simultâneos, ainda será necessário controlar concorrência; a classe isolada não resolve esse problema.",
    "misconception": "“Encapsulamento é só criar getters e setters.” Um setter que aceita qualquer quantidade pode violar a mesma regra que um atributo público. O importante é validar transições, não multiplicar métodos.",
    "question": "Uma classe impede retirar mais unidades do que existem, mas aceita quantidade inicial negativa. A invariante está protegida? Onde corrigir?",
    "feedback": "Não. O construtor também deve estabelecer o estado válido. Proteger apenas as operações posteriores permite que o objeto já nasça inválido. A validação precisa cobrir criação e mudanças expostas.",
    "extension": "Modele uma tarefa com estados pendente, em andamento e concluída. Defina quais transições fazem sentido e uma que deve ser recusada.",
    "sources": [
      "python-objects-deep",
      "sicp"
    ]
  },
  {
    "level": 6,
    "lessonId": "l6-html-css",
    "title": "Documento, apresentação e interação acessível",
    "prerequisite": "Reconhecer elementos HTML e seletores CSS básicos apresentados nesta aula.",
    "objective": "Justificar uma escolha de elemento HTML a partir do significado e do comportamento esperado, não apenas da aparência.",
    "explanation": "### A página é um documento antes de ser uma imagem\nHTML descreve a estrutura e o significado do conteúdo. CSS controla a apresentação. JavaScript pode acrescentar comportamento. Essa separação ajuda diferentes formas de acesso: tela pequena, teclado, leitor de tela e estilos desativados não interpretam a interface como uma captura de imagem.\n\n**Semântica** significa escolher elementos coerentes com a intenção. Um link navega para um destino; um botão dispara uma ação. Um título organiza seções. Simular tudo com divs transfere para o autor a responsabilidade de recriar comportamentos que elementos nativos já oferecem.\n\n### Informação precisa continuar identificável\nUm campo necessita de um nome compreensível e associado a ele; um erro precisa ser descrito, não apenas colorido. Ordem de leitura, foco visível e contraste são propriedades da experiência. ARIA pode complementar casos específicos, mas não é um substituto automático para HTML apropriado.\n\n### O navegador não é a autoridade do produto\nUma interface pode validar um campo para ajudar o usuário, mas os pedidos recebidos pelo servidor ainda precisam de validação. Esconder um botão não é autorização. Essa distinção conecta desenvolvimento de interface à segurança estudada mais adiante.",
    "worked": "### Exemplo resolvido: formulário de inscrição\nQueremos pedir um nome e inscrever uma pessoa. Criamos um label com for=\"nome\", um input com id=\"nome\" e um button de envio dentro de form. O rótulo dá sentido ao campo; o botão possui comportamento de ativação esperado. A confirmação deve dizer o que foi concluído.\n\nSe o nome estiver vazio, mostramos uma mensagem textual associada ao campo e preservamos o que já foi preenchido. Cor pode reforçar o aviso, mas não deve ser seu único portador.\n\nTeste o percurso sem mouse: alcançar o campo, digitar, mover para o botão, enviar e localizar a resposta. Depois imagine que o estilo visual mudou. Se a ordem e os nomes continuarem compreensíveis, a estrutura tem uma base melhor. Isso é um teste inicial, não uma auditoria completa de acessibilidade.",
    "misconception": "“Parece um botão, então é um botão.” Um retângulo com evento de clique não ganha automaticamente semântica, foco e ativação por teclado. Aparência e comportamento precisam ser avaliados separadamente.",
    "question": "Você quer levar o usuário à página de privacidade. Deve começar com um link ou com um botão? E para enviar um formulário?",
    "feedback": "Para navegar, use um link com destino. Para submeter o formulário, use um botão de envio. A aparência pode ser parecida; a intenção e o comportamento nativo são diferentes.",
    "extension": "Revise um formulário seu: rótulos, ordem de foco, mensagens textuais e navegação por teclado. Registre um problema observável antes de alterar o CSS.",
    "sources": [
      "mdn-semantics-deep",
      "mdn-accessibility-deep"
    ]
  },
  {
    "level": 7,
    "lessonId": "l7-normalizacao-indices",
    "title": "Invariantes de dados e limites de uma transação",
    "prerequisite": "Tabelas, chaves, INSERT, UPDATE e a introdução a transações nesta lição.",
    "objective": "Distinguir atomicidade, regras de negócio e proteção contra concorrência em uma mudança de dados.",
    "explanation": "### Persistir não basta: é preciso preservar significado\nUma base de dados não deve apenas guardar linhas. Ela precisa manter regras: um empréstimo referencia um livro existente, uma matrícula não se duplica e a quantidade disponível não fica negativa. Restrições como chave estrangeira, unicidade e CHECK tornam parte dessas regras explícita no banco.\n\n### Uma transação agrupa mudanças\n**Atomicidade** significa que as mudanças da transação são confirmadas como um conjunto ou desfeitas. Isso é importante quando uma operação de negócio exige várias escritas. Sem agrupamento, uma falha entre elas pode deixar um estado que não representa nem o antes nem o depois.\n\nMas uma transação que confirma com sucesso pode executar uma regra errada. O banco não sabe que seu desconto deveria ser 10% se você programou 90%. Consistência do domínio exige restrições, código e testes coerentes.\n\n### Concorrência exige uma hipótese explícita\nDois pedidos podem observar o mesmo estado e tentar alterá-lo. O nível de isolamento e a forma da consulta influenciam os resultados permitidos. Não suponha que simplesmente escrever BEGIN elimine toda corrida: é necessário escolher a proteção adequada e tratar conflitos ou retentativas quando cabíveis.",
    "worked": "### Exemplo resolvido: emprestar um exemplar\nExiste um único exemplar disponível. A operação precisa registrar o empréstimo e reduzir o estoque de 1 para 0. Se a segunda escrita falhar, não queremos manter só o registro do empréstimo. Colocamos as mudanças na mesma transação e desfazemos o conjunto se alguma etapa necessária não puder ser concluída.\n\nAgora dois pedidos chegam juntos. Uma estratégia usa uma atualização condicionada a disponível > 0 e confere quantas linhas foram alteradas. Só se essa etapa reservar o exemplar o restante do empréstimo prossegue, dentro da mesma transação. Restrições e tratamento de erros continuam necessários.\n\nA ideia central é ligar a decisão à escrita protegida, em vez de confiar apenas numa leitura anterior feita na aplicação. Sintaxe, bloqueios e isolamento devem ser conferidos no SGBD utilizado.",
    "misconception": "“ACID corrige qualquer regra de negócio.” Atomicidade evita efeitos parciais da transação; não descobre se o cálculo, a autorização ou a condição de estoque foram escritos corretamente.",
    "question": "Um programa grava a matrícula de um aluno e depois atualiza a contagem de vagas. A segunda etapa falha. Qual propriedade evita manter só a primeira gravação?",
    "feedback": "Atomicidade, quando as duas escritas necessárias pertencem à mesma transação e a falha causa seu rollback. Executá-las em transações independentes não oferece essa garantia conjunta.",
    "extension": "Descreva um estado inválido em seu projeto e indique se ele pode ser impedido por uma restrição, uma transação ou uma regra de aplicação. Algumas regras exigem a combinação.",
    "sources": [
      "postgres-transactions-deep",
      "postgres-isolation-deep"
    ]
  },
  {
    "level": 8,
    "lessonId": "l8-concorrencia",
    "title": "Intercalação, atomicidade e condições de corrida",
    "prerequisite": "Processos, threads, variáveis compartilhadas e a diferença entre ler e escrever um valor.",
    "objective": "Construir uma intercalação que produz resultado incorreto e identificar a região que precisa de coordenação.",
    "explanation": "### Concorrência não exige execução simultânea\nDuas tarefas são concorrentes quando suas execuções podem se sobrepor no tempo. Uma única CPU pode alternar entre elas. Paralelismo é execução simultânea. Um erro de concorrência pode surgir por intercalação, mesmo sem duas instruções rodarem fisicamente no mesmo instante.\n\n### Uma linha de código pode conter vários passos\nA operação conceitual contador = contador + 1 envolve ler, calcular e escrever. Se duas tarefas compartilham o contador, outra execução pode entrar entre esses passos. Atomicidade depende da operação e do ambiente; não conclua que uma linha de alto nível seja indivisível.\n\nUma **seção crítica** é o trecho que precisa preservar uma regra sobre estado compartilhado. Um mecanismo de exclusão mútua pode permitir somente uma tarefa nesse trecho por vez, desde que todos os acessos relevantes sigam o mesmo protocolo.\n\n### Proteger dados também afeta progresso\nBloqueios não resolvem todos os problemas. Ordem inconsistente de aquisição pode gerar deadlock; manter uma trava durante trabalho lento pode prejudicar outras tarefas. Primeiro identifique a regra a preservar, depois escolha a menor região que mantém essa regra e documente a coordenação.",
    "worked": "### Exemplo resolvido: incremento perdido\nO contador começa em 5. A lê 5. Antes de A gravar, B também lê 5. A calcula 6 e grava 6. B calcula 6 a partir da leitura antiga e grava 6. Duas tentativas de incremento produziram apenas um aumento observado.\n\nSe leitura, cálculo e escrita forem protegidos pela mesma exclusão mútua, B só poderá ler depois que A concluir. Assim B lerá 6 e gravará 7. Proteger apenas a escrita deixa as duas leituras antigas possíveis e não resolve esse exemplo.\n\nA sequência é um modelo didático de operações compartilhadas; linguagens e runtimes têm garantias próprias. Em particular, não use detalhes de uma versão do interpretador como substituto de um contrato explícito de sincronização.",
    "misconception": "“Executei cem vezes e nunca falhou.” Uma intercalação rara pode não aparecer nos testes. Um teste positivo não elimina a necessidade de explicar por que todos os acessos seguem a coordenação prevista.",
    "question": "Por que travar apenas a instrução de gravação não impede o incremento perdido do exemplo?",
    "feedback": "Porque as duas tarefas ainda podem ler 5 antes de qualquer gravação. A proteção precisa abranger a sequência que usa o estado compartilhado para decidir seu novo valor, ou empregar uma operação atômica equivalente.",
    "extension": "Desenhe uma sequência com duas tarefas disputando a última vaga. Identifique a leitura, a decisão e a alteração que precisam fazer parte de uma operação protegida.",
    "sources": [
      "ostep",
      "ostep-locks-deep"
    ],
    "table": {
      "head": [
        "Passo",
        "Tarefa A",
        "Tarefa B",
        "Contador compartilhado"
      ],
      "rows": [
        [
          "1",
          "Lê 5",
          "—",
          "5"
        ],
        [
          "2",
          "—",
          "Lê 5",
          "5"
        ],
        [
          "3",
          "Calcula e grava 6",
          "—",
          "6"
        ],
        [
          "4",
          "—",
          "Calcula e grava 6",
          "6"
        ]
      ],
      "caption": "Uma intercalação possível do modelo de leitura, cálculo e escrita."
    }
  },
  {
    "level": 9,
    "lessonId": "l9-sockets",
    "title": "Fluxo de bytes, mensagens e falhas de comunicação",
    "prerequisite": "IP, TCP, portas e a ideia de socket. Este aprofundamento trata especificamente de aplicações sobre TCP.",
    "objective": "Explicar por que uma aplicação precisa delimitar mensagens e lidar com leituras parciais, mesmo usando TCP.",
    "explanation": "### Confiabilidade de transporte não define sua mensagem\nTCP oferece à aplicação um fluxo ordenado de bytes. A aplicação precisa decidir onde começa e termina cada mensagem. Uma chamada de envio não corresponde obrigatoriamente a uma chamada de recebimento: os bytes podem ser observados em partes ou junto de dados enviados em outra chamada.\n\n**Framing** é a regra de delimitação. Podemos usar tamanho prefixado, delimitadores com regras de escape ou um formato que indique seu próprio tamanho. Também precisamos definir codificação de texto e tamanho máximo aceito.\n\n### Ler bytes é manter estado\nUm receptor acumula dados até ter uma mensagem completa. Se o prefixo informa comprimento 8 e apenas 3 bytes chegaram, ainda faltam 5. Tentar interpretar a mensagem completa nesse ponto mistura transporte com formato. Ao trabalhar com UTF-8, um caractere pode ocupar vários bytes; limites de leitura não são necessariamente limites de caracteres.\n\n### Receber não significa concluir a operação\nA entrega de bytes não prova que a aplicação remota salvou um pedido. Uma conexão pode cair depois de processar a ação e antes de responder. Repetir sem uma regra de idempotência pode duplicar efeitos. O protocolo precisa definir confirmação, prazo e comportamento de repetição.",
    "worked": "### Exemplo resolvido: duas mensagens curtas\nDefinimos um protocolo textual didático: cada mensagem termina com quebra de linha e não contém quebras de linha internas. O emissor envia OI e FIM, cada uma seguida do delimitador.\n\nO receptor pode receber primeiro apenas O e depois o restante. Deve manter O no buffer, acrescentar os novos bytes e extrair mensagens somente quando encontrar o delimitador. Se receber as duas mensagens juntas, deve extrair duas, preservando qualquer sobra para a próxima leitura.\n\nPara uma versão real, definiríamos também limite de buffer, timeout, codificação e tratamento de fechamento com uma mensagem incompleta. Sem limites, um remetente que nunca envia o delimitador pode consumir recursos indefinidamente.",
    "misconception": "“TCP mantém as mensagens do meu send.” Ele mantém o fluxo ordenado de bytes; as fronteiras da aplicação precisam ser especificadas por cima do transporte.",
    "question": "Você espera uma mensagem de 12 bytes e a primeira leitura entrega 5. Isso prova que TCP perdeu os outros 7?",
    "feedback": "Não. Uma leitura parcial é compatível com um fluxo TCP normal. O receptor deve continuar acumulando até completar a mensagem ou detectar fechamento, timeout ou erro, conforme seu protocolo.",
    "extension": "Escolha entre delimitador e tamanho prefixado para enviar texto que pode conter quebras de linha. Explique como tratar conteúdo inválido e comprimento excessivo.",
    "sources": [
      "tcp-rfc9293-deep",
      "python-sockets-deep"
    ]
  },
  {
    "level": 10,
    "lessonId": "l10-testes-ci",
    "title": "Testes como evidência de um contrato",
    "prerequisite": "Funções, casos de entrada e saída e execução de testes automatizados.",
    "objective": "Projetar testes a partir de comportamentos e riscos, distinguindo cobertura de execução de suficiência da verificação.",
    "explanation": "### O teste precisa de uma expectativa independente\nUm teste compara um comportamento observado com um resultado esperado. Essa expectativa é chamada de **oráculo**. Se você calcula o esperado repetindo exatamente o algoritmo que está testando, pode reproduzir o mesmo erro nos dois lados. Comece pela regra do produto e por casos cujo resultado possa justificar independentemente.\n\n### Partições e fronteiras\nEntradas podem ser agrupadas por comportamento relevante. Para um desconto a partir de 5 itens, os casos 4, 5 e 6 ajudam a verificar a fronteira. Casos típicos mostram o caminho comum; casos vazios, inválidos e extremos investigam hipóteses escondidas. Não é necessário testar todos os inteiros para perceber uma comparação >= escrita como >.\n\n### Níveis respondem perguntas distintas\nTestes de unidade isolam uma regra; testes de integração investigam contratos entre componentes; testes de ponta a ponta percorrem uma jornada. Nenhum nível elimina os outros. Muitos testes frágeis da interface podem custar mais manutenção do que uma combinação menor orientada aos riscos.\n\nCobertura indica quais partes foram executadas sob um critério. Uma linha pode executar e produzir um resultado errado sem que haja uma asserção útil. CI automatiza verificações; um pipeline verde só é tão informativo quanto os testes e condições que ele realmente executou.",
    "worked": "### Exemplo resolvido: limite de quantidade\nRegra: uma compra aceita de 1 a 5 unidades, inclusive. Particionamos o domínio em abaixo do mínimo, faixa aceita e acima do máximo. Casos 0, 1, 5 e 6 exercitam fronteiras. Acrescentamos um caso de entrada inválida se a interface puder receber texto não convertido.\n\nUm teste que só verifica 3 unidades passa mesmo se o programa aceitar 0 indevidamente. Um teste que apenas confere ausência de exceção pode não verificar a quantidade realmente registrada.\n\nEscrevemos expectativas explícitas: 1 e 5 são aceitos; 0 e 6 são recusados sem gravar uma compra. Separar validação de gravação facilita testar a regra e, em integração, confirmar que a recusa não deixa efeitos.",
    "misconception": "“100% de cobertura significa ausência de bugs.” Cobertura não garante entradas representativas, asserções corretas, requisitos completos ou comportamento sob falhas externas.",
    "question": "Uma regra permite idade maior ou igual a 18. Testar apenas 25 detecta uma implementação que exige idade maior que 18? Qual caso falta?",
    "feedback": "Não: ambas aceitam 25. O caso 18 distingue >= de >. Testar 17 também verifica a recusa imediatamente abaixo da fronteira.",
    "extension": "Pegue uma função existente e escreva a regra em português. Escolha um caso típico, dois de fronteira e um de erro. Explique que defeito cada teste poderia detectar.",
    "sources": [
      "swe-testing-deep",
      "swe-at-google"
    ]
  },
  {
    "level": 11,
    "lessonId": "l11-fundamentos",
    "title": "Fronteiras de confiança e autorização por recurso",
    "prerequisite": "Cliente e servidor, requisição HTTP e diferença inicial entre autenticação e autorização.",
    "objective": "Descrever uma decisão de acesso usando usuário, ação e recurso, sem confiar em declarações do navegador.",
    "explanation": "### Comece pelo que precisa proteger\nUm modelo de ameaça explicita ativos, possíveis ações indevidas e fronteiras de confiança. Um ativo pode ser um histórico de estudos; uma ação indevida pode ser ler o histórico de outra pessoa. Não é necessário imaginar um invasor sofisticado para perceber que um identificador enviado pelo cliente pode ser alterado.\n\n### Identidade não concede todas as permissões\nAutenticar estabelece uma identidade segundo o mecanismo usado. Autorizar decide se essa identidade pode realizar uma ação sobre um recurso naquele contexto. “Está logado” não basta para permitir editar qualquer registro. A decisão precisa considerar a relação com o recurso e os direitos vigentes.\n\nNegar por padrão e conceder somente o necessário reduz acessos acidentais. A checagem deve ocorrer no servidor em cada pedido relevante, incluindo rotas que não aparecem na interface. Uma URL difícil de adivinhar não substitui a decisão de acesso.\n\n### A confiança tem uma direção\nO navegador pode pedir uma operação; o servidor consulta sua própria fonte de identidade e permissões. Um campo premium=true enviado pelo cliente não comprova assinatura. A interface pode antecipar uma mensagem útil, mas a proteção precisa permanecer válida mesmo sem essa interface.",
    "worked": "### Exemplo resolvido: histórico de uma aluna\nBia está autenticada e solicita /historico/42. O servidor identifica Bia pela sessão validada, busca o proprietário do histórico 42 e aplica a política: o proprietário pode ler; outros usuários comuns não podem.\n\nSe o histórico pertence a outra pessoa, negar o acesso é correto mesmo que Bia saiba a URL. Se o recurso não exige autenticação, como uma apresentação pública, a política pode permitir leitura anônima explicitamente.\n\nPara verificar a implementação, crie dois usuários de teste e tente acessar o recurso de um com a sessão do outro. Repita usando a URL direta, sem depender de botões. Faça isso apenas em sistemas seus ou em ambientes de teste autorizados.",
    "misconception": "“Esconder o botão resolve o acesso.” O usuário pode construir a requisição diretamente. Permissão e propriedade devem ser verificadas onde os dados ou efeitos são entregues.",
    "question": "Um pedido contém userId de outra pessoa, mas a sessão é sua. Qual identidade deve fundamentar a decisão de acesso?",
    "feedback": "A identidade obtida da sessão validada no servidor, combinada com a política e o proprietário do recurso. O userId enviado não pode promover o solicitante a outra identidade.",
    "extension": "Monte uma matriz com três recursos do seu projeto, duas funções de usuário e ações de ler/alterar. Justifique cada permissão e transforme as recusas importantes em testes.",
    "sources": [
      "owasp-authorization-deep",
      "owasp-threat-model-deep"
    ]
  },
  {
    "level": 12,
    "lessonId": "l12-deploy-observabilidade",
    "title": "Confiabilidade observável e recuperação",
    "prerequisite": "Deploy, processos e pedidos HTTP. Percentuais serão usados com denominador e janela explícitos.",
    "objective": "Definir um indicador verificável e separar execução do processo, sucesso do usuário e recuperação após falha.",
    "explanation": "### Publicar é iniciar uma operação\nUm processo ativo não prova que um usuário consiga concluir uma tarefa. O servidor pode responder enquanto o banco está indisponível. Por isso, confiabilidade precisa ser descrita por comportamentos observáveis: conseguir salvar, receber uma resposta válida ou concluir uma operação dentro do prazo.\n\nUm **SLI** é um indicador medido; um **SLO** é uma meta definida para esse indicador e uma janela. “O site está rápido” não especifica nem medida nem expectativa. “95% dos pedidos elegíveis respondem em até 800 ms nesta janela” pode ser verificado, desde que a coleta e os pedidos elegíveis estejam definidos.\n\n### Escolha o denominador\nTaxa de sucesso divide eventos bons pelos eventos considerados. Excluir silenciosamente as falhas mais graves produz uma taxa bonita e enganosa. Defina quais erros contam, onde mede e como lida com períodos sem dados. Percentis ajudam a enxergar a cauda de latência que uma média pode ocultar.\n\n### Recuperar é parte da entrega\nRollback restaura uma versão de software; backup restaura dados. Eles não são intercambiáveis. Uma migração pode impedir que o código antigo leia o novo formato. Antes de uma mudança, planeje compatibilidade, recuperação e um teste concreto de restauração.",
    "worked": "### Exemplo resolvido: salvar anotações\nEm uma janela, medimos 2.000 pedidos elegíveis de salvamento e 1.980 sucessos. A taxa observada é 1.980 / 2.000 = 99%. Se a meta do exemplo é 99,5%, ela não foi cumprida. O orçamento de falhas correspondente seria 10 pedidos nessa amostra; ocorreram 20.\n\nEsse cálculo não descreve todas as experiências possíveis: precisamos saber o que foi contado como sucesso e se pedidos perdidos antes da medição ficaram invisíveis. Um retorno HTTP 200 que não persistiu a anotação seria uma definição inadequada de sucesso.\n\nDepois simulamos perda do banco em ambiente de teste e restauramos uma cópia. Confirmar somente a existência do arquivo de backup não demonstra que as anotações possam ser recuperadas.",
    "misconception": "“Tenho backup, então estou protegido contra perda.” É preciso confirmar integridade, acesso à cópia, ponto recuperável e tempo de restauração. Um arquivo nunca restaurado é uma hipótese de recuperação.",
    "question": "O processo está ativo, mas nenhum aluno consegue salvar. Um monitor que só verifica se o processo existe detecta corretamente a experiência do usuário?",
    "feedback": "Não. Ele observa uma condição interna necessária em muitos sistemas, mas insuficiente. É preciso medir o caminho de salvamento e verificar uma resposta que represente persistência bem-sucedida.",
    "extension": "Escolha uma tarefa importante do seu aplicativo e defina evento bom, total elegível, janela e meta provisória. Escreva também como simular uma falha sem afetar usuários reais.",
    "sources": [
      "sre-slo-deep",
      "sre-data-integrity-deep"
    ]
  },
  {
    "level": 13,
    "lessonId": "l13-ml-fundamentos",
    "title": "Generalização, dados separados e métricas úteis",
    "prerequisite": "Proporções, tabelas de dados e a definição de modelo apresentada nesta lição. Revise probabilidade no nível 14 quando necessário.",
    "objective": "Distinguir ajuste, seleção e avaliação de um modelo e interpretar o efeito de uma classe rara.",
    "explanation": "### O objetivo é funcionar além dos exemplos vistos\nAprendizado supervisionado usa exemplos com respostas conhecidas para ajustar um modelo. Reduzir o erro nos exemplos usados no ajuste é importante, mas não garante desempenho em novos casos. **Generalização** é a capacidade de funcionar fora desses exemplos, sob condições que precisam ser descritas.\n\nSeparar treino, validação e teste ajuda a distinguir ajuste de parâmetros, escolha de alternativas e avaliação final. Se usamos repetidamente o teste para decidir mudanças, ele passa a influenciar o desenvolvimento e deixa de ser uma avaliação final independente.\n\n### A separação deve refletir o uso\nEm dados temporais, informações do futuro não podem aparecer em uma previsão do passado. Em dados de pessoas, registros muito parecidos do mesmo indivíduo em grupos diferentes podem tornar a tarefa artificialmente fácil. Também não devemos calcular transformações a partir do conjunto inteiro antes de separar o que será reservado.\n\n### Uma métrica precisa representar o erro relevante\nAcurácia é a proporção de previsões corretas. Em classes desequilibradas, ela pode esconder falhas na classe importante. Precisão pergunta quantos dos positivos previstos eram positivos; revocação pergunta quantos dos positivos reais foram encontrados. Escolher um limiar muda o equilíbrio entre falsos positivos e falsos negativos.",
    "worked": "### Exemplo resolvido: detectar mensagens indesejadas\nHá 100 mensagens: 95 legítimas e 5 indesejadas. Um sistema que responde sempre “legítima” acerta 95%, mas encontra zero das 5 indesejadas. Sua revocação para essa classe é 0%.\n\nOutro sistema marca 8 mensagens como indesejadas. Dessas, 4 realmente são; 4 eram legítimas. Ele encontrou 4 dos 5 casos: revocação = 4/5 = 80%. Entre suas 8 marcações, acertou 4: precisão = 4/8 = 50%. Sua acurácia é (4 + 91)/100 = 95%, igual à do primeiro sistema, embora o comportamento seja muito diferente.\n\nNenhuma dessas porcentagens determina sozinha qual modelo usar. É preciso considerar o custo de bloquear uma mensagem legítima, deixar passar uma indesejada e a representatividade da amostra.",
    "misconception": "“Uma nota alta no teste prova que o modelo continuará bom.” A amostra pode estar contaminada, ser pequena ou deixar de representar o uso futuro. Avaliação precisa de contexto e acompanhamento.",
    "question": "Um classificador sempre escolhe a classe que aparece em 98% dos exemplos. Por que 98% de acurácia pode ser insuficiente?",
    "feedback": "Porque ele pode ignorar totalmente a classe minoritária, justamente a de interesse. Avalie a matriz de confusão, precisão/revocação pertinentes e consequências dos erros, comparando com essa linha de base.",
    "extension": "Explique como dividiria exemplos de vendas ao longo do tempo para prever o próximo mês. Indique uma informação que seria vazamento do futuro.",
    "sources": [
      "ml-split-deep",
      "ml-metrics-deep"
    ],
    "table": {
      "head": [
        "Previsão do segundo sistema",
        "Real: indesejada",
        "Real: legítima"
      ],
      "rows": [
        [
          "Indesejada",
          "4 (verdadeiros positivos)",
          "4 (falsos positivos)"
        ],
        [
          "Legítima",
          "1 (falso negativo)",
          "91 (verdadeiros negativos)"
        ]
      ],
      "caption": "Matriz de confusão do exemplo: 100 mensagens."
    }
  },
  {
    "level": 14,
    "lessonId": "l14-logica-conjuntos",
    "title": "Implicação, quantificadores e contraexemplos",
    "prerequisite": "Condições booleanas. Não é necessário cálculo; leia as frases antes dos símbolos.",
    "objective": "Traduzir regras simples para lógica, distinguir implicação de equivalência e usar um contraexemplo para refutar uma afirmação universal.",
    "explanation": "### Uma implicação tem direção\n“Se P, então Q” afirma que não ocorre P verdadeiro com Q falso. Não afirma automaticamente que Q exige P. Se todo quadrado é retângulo, encontrar um retângulo não prova que ele seja quadrado. A recíproca troca a direção e precisa de justificativa própria.\n\nUma equivalência exige as duas direções. Em requisitos, confundir “se” com “se e somente se” pode conceder acesso ou rejeitar casos indevidamente. Expresse separadamente condições necessárias e suficientes antes de converter a regra em código.\n\n### Quantificadores mudam o que precisa ser demonstrado\n“Todos os elementos têm a propriedade” é uma afirmação universal. Um único contraexemplo a refuta. “Existe um elemento com a propriedade” é existencial; basta exibir um caso que a satisfaça. Não encontrar um caso em algumas tentativas não prova que ele inexista.\n\nPara negar “todos passaram”, dizemos “existe alguém que não passou”. A negação não é “ninguém passou”. Essa diferença é útil em filtros, validação de coleções e testes.\n\n### Modelos matemáticos precisam de hipóteses\nUm conjunto não registra repetição ou ordem; uma lista registra ambos. Trocar uma lista de compras por um conjunto pode apagar quantidades. A abstração matemática facilita o raciocínio quando preserva o que o problema considera relevante.",
    "worked": "### Exemplo resolvido: aprovação e certificado\nRegra: quem recebe certificado concluiu o projeto. Chame C a frase “recebeu certificado” e P a frase “concluiu o projeto”. A regra é C implica P. Uma pessoa que concluiu o projeto e não recebeu certificado não viola essa regra: podem existir outras condições.\n\nUma pessoa com certificado e projeto não concluído é um contraexemplo e viola a regra. Para garantir que todo concluinte receba certificado, seria necessária também a direção P implica C, caso essa seja de fato a política.\n\nAgora considere “todos os projetos têm testes”. Um projeto sem testes basta para refutar a frase. Listar dez projetos com testes não prova a afirmação sobre todos os projetos existentes.",
    "misconception": "“A negação de todos é nenhum.” Entre todos e nenhum existem situações mistas. Basta um elemento sem a propriedade para tornar falsa uma afirmação universal.",
    "question": "A regra diz: se um pedido foi aprovado, ele foi validado. Um pedido validado e não aprovado contradiz a regra? Explique a direção.",
    "feedback": "Não. A regra exige validação para os aprovados, mas não garante aprovação de todo validado. O contraexemplo seria um pedido aprovado sem validação.",
    "extension": "Escolha uma regra do seu projeto e escreva a implicação e sua recíproca em português. Decida se cada direção realmente faz parte do requisito. Dê um contraexemplo para a direção inválida.",
    "sources": [
      "mit-6042",
      "mit-math-2015-deep"
    ]
  }
];

export const theoryExpansions: TheoryExpansion[] = [...initialTheoryExpansions, ...foundationTheory, ...structureTheory, ...algorithmTheory, ...systemsWebTheory, ...systemsAppliedTheory];

const byLesson = new Map(theoryExpansions.map(entry => [entry.lessonId, entry]));
if (byLesson.size !== theoryExpansions.length) throw new Error('Aprofundamento duplicado por lição');
const md = (text: string): Block => ({ type: 'md', text });

/** Enriquece cópias das lições sem renumerar exercícios/cartões ou alterar progresso. */
export function deepenLevels(input: Level[]): Level[] {
  return input.map(level => ({
    ...level,
    modules: level.modules.map(module => ({
      ...module,
      lessons: module.lessons.map(lesson => {
        const entry = byLesson.get(lesson.id);
        if (!entry) return lesson;
        if (entry.level !== level.number) throw new Error('Aprofundamento no nível incorreto: ' + lesson.id);
        const sourceLinks = entry.sources.map(id => {
          const ref = referenceById.get(id);
          if (!ref) throw new Error('Referência de aprofundamento ausente: ' + id);
          return '- [' + ref.title + '](' + ref.url + ') — ' + ref.org;
        }).join('\n');
        const additions: Partial<Record<string, Block[]>> = {
          explicacao: [
            md('### Aprofundamento teórico: ' + entry.title),
            { type: 'callout', tone: 'info', title: 'Antes de aprofundar', text: entry.prerequisite },
            md(entry.explanation),
            { type: 'callout', tone: 'warn', title: 'Um equívoco para evitar', text: entry.misconception },
            md('### Fontes para estudar além\nEstas referências apoiam os conceitos; os exemplos desta ampliação são originais.\n\n' + sourceLinks),
          ],
          exemplo: [
            md(entry.worked),
            ...(entry.table ? [{ type: 'table' as const, ...entry.table }] : []),
          ],
          desafio: [
            { type: 'callout', tone: 'deep', title: 'Explique com suas palavras', text: entry.question + '\n\nAnote sua justificativa antes de consultar a etapa Revisão. Esta reflexão não recebe nota automática.' },
            md('### Transfira para outro problema\n' + entry.extension),
          ],
          revisao: [
            md('### Confira seu raciocínio\n' + entry.feedback + '\n\nCompare com sua justificativa: identifique a regra usada, o caso limite e o que você mudaria na resposta. Refaça a explicação em outro dia, sem consultar o texto.'),
          ],
        };
        const stages = new Set(lesson.sections.map(section => section.stage));
        for (const stage of Object.keys(additions)) {
          if (!stages.has(stage as typeof lesson.sections[number]['stage'])) {
            throw new Error('Etapa ausente para aprofundamento: ' + lesson.id + '/' + stage);
          }
        }
        return {
          ...lesson,
          theoryTitle: entry.title,
          minutes: lesson.minutes + 12,
          objectives: [...lesson.objectives, entry.objective],
          references: [...new Set([...lesson.references, ...entry.sources, 'ies-study-guide', ...(entry.level === 2 ? ['helsinki-python-2026'] : [])])],
          sections: lesson.sections.map(section => ({
            ...section,
            blocks: [...section.blocks, ...(additions[section.stage] ?? [])],
          })),
        };
      }),
    })),
  }));
}

