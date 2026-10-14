import type {TheoryExpansion} from '../theory-types.ts';

export const structureTheory: TheoryExpansion[] = [
  {
    "level": 3,
    "lessonId": "l3-crescimento-amortizado",
    "title": "Contabilidade do trabalho e limites de latência",
    "prerequisite": "Conhecer tamanho, capacidade e cópia de referências em listas dinâmicas.",
    "objective": "Justificar um limite para uma sequência inteira e distinguir esse limite do prazo de uma operação.",
    "explanation": "### O que a conta mede\nDefina uma unidade de trabalho: escrever ou copiar uma referência custa uma unidade. Esse modelo ignora alocação, cache e coleta de memória; permite comparar como o trabalho cresce, mas não prevê milissegundos. Considere capacidade inicial 1 e duplicação quando a lista está cheia. Não estamos afirmando que toda implementação Python usa esse fator.\n\nCada elemento inserido custa uma escrita. As realocações copiam blocos de tamanhos 1, 2, 4, 8 e assim por diante. Como a última cópia ocorre antes de n elementos terem sido inseridos, a soma geométrica das cópias fica abaixo de 2n. Acrescentando as n escritas, o total fica abaixo de 3n. Dividir esse limite por n dá custo amortizado constante.\n\n### A garantia não depende de sorte\nNão supomos entradas aleatórias. O conteúdo dos elementos não altera a contagem deste modelo. A garantia vale para cada prefixo da sequência de inserções a partir da estrutura vazia. Entretanto, a operação que encontra capacidade cheia continua copiando todos os elementos. Para uma interface com prazo de resposta rígido, esse pico importa mesmo quando o total é pequeno.\n\nAo admitir remoções, uma nova análise é necessária. Crescer e encolher em limiares próximos pode repetir cópias grandes. Separar os limiares deixa operações suficientes entre duas realocações para pagar a próxima.",
    "worked": "### Rastreio: nove inserções\nAs capacidades após cada inserção são 1, 2, 4, 4, 8, 8, 8, 8, 16. Copiamos 1 referência na segunda inserção, 2 na terceira, 4 na quinta e 8 na nona: 15 cópias. Somadas às 9 escritas, são 24 unidades, abaixo de 27. A nona chamada custa 9 unidades sozinha; a oitava custa apenas 1. Essa diferença mostra por que “amortizado constante” não é “todas as chamadas igualmente rápidas”.",
    "misconception": "“A média observada num cronômetro prova O(1) amortizado.” Medição depende do ambiente; o limite vem de contar todas as operações sob uma política explícita.",
    "question": "Se a capacidade aumentar apenas uma posição por vez, quantas referências serão copiadas para inserir cinco elementos?",
    "feedback": "Copiam-se 1 + 2 + 3 + 4 = 10 referências, além de cinco escritas. Para n elementos, a soma é n(n−1)/2: crescimento quadrático.",
    "extension": "Compare duas políticas de redução de capacidade com uma sequência alternada de inserir e remover perto do limite. Registre cópias, não apenas tempo.",
    "sources": [
      "mit-6006",
      "clrs"
    ]
  },
  {
    "level": 3,
    "lessonId": "l3-dois-ponteiros",
    "title": "Regiões já decididas e segurança da escrita no lugar",
    "prerequisite": "Saber percorrer uma lista e comparar números; conhecer pré-condição e invariante.",
    "objective": "Explicar por que um movimento descarta apenas candidatos impossíveis e por que uma escrita não destrói dados pendentes.",
    "explanation": "### Dois índices precisam de um argumento\nDois ponteiros não são uma receita única. O importante é dividir a entrada em regiões com significados claros: elementos já resolvidos, candidatos ainda possíveis e dados ainda não lidos. Mover um índice é correto quando podemos explicar o que deixou de ser necessário.\n\nNa soma de dois valores de uma lista ordenada, uma soma pequena demais permite abandonar a ponta esquerda. O maior parceiro disponível já é insuficiente; nenhum parceiro menor pode ajudar. A ordenação é usada nessa desigualdade. Sem ela, o movimento perde a justificativa, mesmo que funcione por acaso num exemplo.\n\n### Compactar preservando a ordem\nNa filtragem, o leitor examina cada posição e o escritor marca o próximo destino. Antes de uma leitura, o prefixo anterior ao escritor contém exatamente os valores aceitos entre os já examinados, na ordem original. Como o escritor nunca ultrapassa o leitor, gravar no destino não destrói um valor ainda não examinado. Depois da leitura final, somente o prefixo é válido; o restante é resíduo e deve ser ignorado ou removido.\n\nO custo linear decorre do avanço limitado dos índices, não de haver apenas um laço visualmente. Uma comparação que constrói fatias grandes pode esconder cópias. A memória constante refere-se a índices e temporários; se construirmos uma lista de saída, essa saída ocupa espaço proporcional ao resultado.",
    "worked": "### Rastreio: retirar zeros\nEntrada [0, 8, 0, 5, 5], escritor inicialmente 0. O leitor vê 0 e não escreve. Vê 8 e grava na posição 0; escritor vira 1. Vê outro 0 e mantém o escritor. Vê 5 e grava na posição 1; escritor vira 2. Vê o último 5 e grava na posição 2; escritor vira 3. O prefixo válido é [8, 5, 5]. A lista física ainda tem cinco posições até executarmos a remoção da sobra. Repetições foram preservadas porque filtragem não significa deduplicação.",
    "misconception": "“Dois ponteiros sempre exigem ordenação.” O argumento da soma exige; inverter e filtrar não. Declare a condição de cada algoritmo.",
    "question": "O que quebraria se o escritor começasse uma posição à frente do leitor?",
    "feedback": "Uma escrita poderia substituir o próximo item antes de sua leitura. Perderíamos a entrada original necessária para decidir se ele deveria permanecer.",
    "extension": "Faça o mesmo rastreio mantendo somente números negativos. Teste lista vazia, nenhum aceito e todos aceitos antes de implementar.",
    "sources": [
      "clrs",
      "mit-6006"
    ]
  },
  {
    "level": 3,
    "lessonId": "l3-pilhas-filas",
    "title": "O contrato de retirada determina o algoritmo",
    "prerequisite": "Conhecer listas e repetição; distinguir estado interno de resultado observado.",
    "objective": "Usar LIFO e FIFO para justificar aninhamento e ordem de atendimento.",
    "explanation": "### Abstração antes da implementação\nPilha e fila definem a ordem em que itens podem sair. A pilha entrega o último inserido ainda presente; a fila entrega o primeiro. Esse contrato pode ser implementado por estruturas diferentes. Escolher uma classe com nome adequado não prova que todas as operações usadas são eficientes ou que o comportamento do programa é correto.\n\nNa verificação de delimitadores, cada abertura cria uma obrigação pendente. A mais recente precisa ser resolvida primeiro, pois os trechos estão aninhados. O topo da pilha representa essa obrigação. Não basta contar aberturas e fechamentos: a ordem também importa. Em uma fila de tarefas, por outro lado, usar FIFO preserva a ordem de entrada entre tarefas ainda aguardando; não garante tempo de conclusão se vários executores trabalham simultaneamente.\n\n### Estados excepcionais fazem parte do contrato\nRetirar de uma estrutura vazia exige uma política explícita: exceção, sinal de ausência ou espera. Um deque limitado também merece atenção: ao inserir em uma ponta quando está cheio, ele pode descartar itens na outra. Isso serve para um histórico recente, mas não equivale a uma fila de trabalho que promete entregar todas as tarefas.\n\nEm Python, append e pop no fim da lista servem como pilha; append é constante amortizado. Para FIFO, deque evita o deslocamento de todos os elementos associado a pop(0). Esses custos dizem respeito às operações da estrutura, não ao trabalho de processar o item.",
    "worked": "### Rastreio: ([x])\nComeçamos com pilha vazia. Ao ler (, guardamos (. Ao ler [, o topo passa a ser [. Ignoramos x porque não é delimitador. Ao ler ], ele corresponde a [, que sai. Ao ler ), ele corresponde a (, que sai. Terminamos sem obrigações pendentes. Já em ([)], o primeiro fechamento encontrado é ), mas o topo é [: a expressão deve ser rejeitada imediatamente, embora as quantidades de cada símbolo possam terminar iguais.",
    "misconception": "“Fila garante justiça.” FIFO organiza a retirada; falhas, prioridades externas, tempo de processamento e concorrência podem alterar a experiência de atendimento.",
    "question": "Por que terminar a leitura com aberturas ainda na pilha também significa erro?",
    "feedback": "Porque existem obrigações de fechamento não satisfeitas. Não encontrar um fechamento incorreto durante a leitura é necessário, mas insuficiente para aceitar.",
    "extension": "Especifique um histórico com desfazer/refazer: o que deve ocorrer com o refazer quando uma nova edição aparece após desfazer?",
    "sources": [
      "python-docs",
      "clrs"
    ]
  },
  {
    "level": 3,
    "lessonId": "l3-expressoes-rpn",
    "title": "Árvores de expressão, operandos e validade sintática",
    "prerequisite": "Conhecer operações aritméticas, precedência e pilha.",
    "objective": "Rastrear avaliação pós-fixa sem inverter operandos e separar tokenização, conversão e execução.",
    "explanation": "### A notação codifica dependências\nUma expressão descreve quais resultados precisam existir antes de cada operação. Na pós-fixa, um operador aparece depois dos operandos que consome. Isso pode ser entendido como visitar os filhos de uma árvore de expressão antes do nó pai. A pilha guarda resultados completos de subexpressões, ainda não consumidos por outra operação.\n\nPara um operador binário, o primeiro valor retirado é o operando da direita e o segundo é o da esquerda. A soma esconde esse detalhe porque é comutativa; subtração e divisão o revelam. Cada número aumenta a profundidade da pilha em um; cada operador binário válido reduz em um. Antes do operador devem existir pelo menos dois valores. Ao final deve sobrar exatamente um.\n\n### Uma gramática precisa de fronteiras\nSeparar tokens, verificar a expressão e calcular são responsabilidades diferentes. Um conversor que reconhece apenas números e operadores binários não passa a aceitar automaticamente sinal unário, chamadas de função ou todas as expressões Python. A precedência organiza operadores diferentes; a associatividade decide agrupamento entre operadores de mesma precedência. Para um operador associativo à direita, desempilhar outro de mesma precedência cedo demais altera o significado.\n\nProcessar cada token poucas vezes produz tempo linear no número de tokens, assumindo operações numéricas de custo limitado. Inteiros muito grandes, números malformados e divisão por zero exigem tratamento adicional. Um avaliador restrito deve recusar tokens fora da gramática em vez de encaminhá-los a execução geral de código.",
    "worked": "### Rastreio: 18 6 3 - /\nApós 18, a pilha é [18]; após 6, [18, 6]; após 3, [18, 6, 3]. O sinal - retira direita=3 e esquerda=6, calcula 3 e deixa [18, 3]. O sinal / retira direita=3 e esquerda=18, calcula 6 e deixa [6]. A expressão corresponde a 18 / (6 − 3). A sequência 18 6 / 3 - teria outra árvore e resultado 0.",
    "misconception": "“Um resultado na pilha prova que a entrada era válida.” É preciso rejeitar falta de operandos, valores sobrando e tokens desconhecidos durante todo o processamento.",
    "question": "Por que 2 3 4 + deve ser rejeitada como uma única expressão RPN?",
    "feedback": "O operador produz 7, mas a pilha final é [2, 7]. Restam duas subexpressões sem operador que as una.",
    "extension": "Desenhe a árvore de 9 − (4 − 1) e escreva sua pós-fixa. Compare com (9 − 4) − 1 para explicar associatividade.",
    "sources": [
      "clrs",
      "python-docs"
    ]
  },
  {
    "level": 3,
    "lessonId": "l3-filas-prioridade",
    "title": "Prioridade, desempate e manutenção de um top-k",
    "prerequisite": "Conhecer heap mínimo e comparação lexicográfica de tuplas.",
    "objective": "Separar política de atendimento da implementação e justificar um heap limitado para os maiores valores.",
    "explanation": "### Qual item merece sair?\nUma fila de prioridade entrega o item com melhor chave segundo uma convenção explícita. Número menor pode representar maior urgência. Havendo empate, é necessário decidir se a ordem de chegada deve ser preservada. Um contador crescente no segundo campo da chave fornece essa política e evita comparar os objetos das tarefas.\n\nO heap mantém somente a ordem necessária para localizar o mínimo. Ele não armazena toda a sequência em ordem de atendimento. Isso reduz o trabalho de manutenção, mas impede usar uma simples iteração como relatório ordenado. Uma fila de prioridade também não evita que tarefas pouco prioritárias esperem indefinidamente; políticas de envelhecimento precisam mudar as prioridades e manter a estrutura coerente.\n\n### Guardar os maiores com o menor na raiz\nPara reter k maiores valores já vistos, a raiz deve mostrar o menor membro desse grupo. Ela é o limiar de entrada. Se um novo valor não a supera e o grupo está cheio, descartá-lo preserva a resposta. Se supera, substituímos o menor. O invariante é que o heap contém os k maiores do prefixo processado, ou todos quando ainda chegaram menos de k.\n\nAtualizar uma chave diretamente no meio do heap pode quebrar sua ordem. É preciso reordenar ou usar uma estratégia de invalidação e reinserção. O custo de O(log k) pressupõe comparações de custo limitado; produzir a saída final ordenada também exige trabalho.",
    "worked": "### Rastreio: dois maiores\nChegam 4, 9, 3, 7. Com k=2, após os dois primeiros o heap representa [4, 9]. O 3 é descartado: já há dois valores maiores. O 7 substitui 4 e o heap passa a representar [7, 9]. O grupo final é correto, mas a apresentação decrescente exige retirar os mínimos e inverter a sequência: [9, 7]. Se k=0, devolvemos vazio antes de tentar consultar a raiz. Valores repetidos contam se o contrato pede ocorrências, não valores distintos.",
    "misconception": "“Heap mínimo só serve para encontrar menores.” O mínimo de um conjunto candidato pode ser justamente o limiar para manter os maiores.",
    "question": "Por que (prioridade, nome) não preserva necessariamente a ordem de chegada?",
    "feedback": "No empate de prioridade, a comparação usa a ordem dos nomes. Um contador de chegada como segundo campo representa a política desejada.",
    "extension": "Rastreie um fluxo com três valores iguais e k=2. Depois altere o requisito para valores distintos e explique qual informação adicional é necessária.",
    "sources": [
      "python-docs",
      "clrs"
    ]
  },
  {
    "level": 3,
    "lessonId": "l3-hash",
    "title": "Índice aproximado, identidade lógica e custo real da chave",
    "prerequisite": "Conhecer pares chave–valor, igualdade e acesso por índice.",
    "objective": "Explicar por que colisões são normais e quais hipóteses sustentam buscas esperadas rápidas.",
    "explanation": "### Hash não é a identidade da chave\nUma função hash transforma uma chave em um número usado para selecionar candidatos. Como o conjunto de chaves possíveis costuma ser maior que o de posições, duas chaves diferentes podem chegar ao mesmo lugar. A tabela precisa compará-las por igualdade e resolver a colisão. Ter hashes iguais não prova que duas chaves são iguais.\n\nDuas etapas possuem contratos diferentes: calcular o hash completo e convertê-lo em posição na tabela. Mesmo hashes completos distintos podem produzir o mesmo resto ao dividir pela capacidade. Ao aumentar essa capacidade, posições podem mudar, e as entradas precisam ser organizadas segundo a nova regra.\n\n### A promessa de custo tem condições\nO custo esperado constante refere-se ao número de sondagens ou candidatos quando há boa dispersão e ocupação controlada. Calcular o hash de uma chave longa e compará-la com outra pode depender do tamanho dessa chave. Um dicionário com poucas entradas, mas textos enormes como chaves, não elimina esse trabalho. Implementações podem armazenar hashes calculados, mas isso não justifica assumir que qualquer chave custa uma unidade.\n\nEm Python, o requisito rigoroso é ser hashável: hash estável e igualdade coerente com ele. Contêineres mutáveis como list não satisfazem esse protocolo; algumas instâncias mutáveis de classes mantêm igualdade por identidade e continuam hasháveis. Uma tupla contendo uma lista também não se torna hashável só porque a tupla não admite trocar suas posições.",
    "worked": "### Rastreio: colisões numa tabela didática\nUse sete posições e h(k)=k para inteiros não negativos pequenos. As chaves 10 e 17 produzem índice 3. Com encadeamento, ambas ficam no grupo dessa posição, cada uma com seu valor. Consultar 17 começa no grupo 3, descarta 10 por desigualdade e encontra 17. Consultar 24 chega ao mesmo grupo, mas não encontra chave igual: deve retornar ausência, nunca o valor de 10. Se a capacidade virar 11, 10 vai ao índice 10 e 17 ao índice 6.",
    "misconception": "“Chaves precisam ser imutáveis em todos os sentidos.” O contrato exige estabilidade de hash e igualdade relevante para a tabela; imutabilidade é uma forma comum de garanti-la.",
    "question": "Por que usar somente o hash como chave de um cadastro pode misturar duas pessoas?",
    "feedback": "Porque colisões são permitidas. Guardar o identificador original e conferir igualdade é indispensável; um hash não substitui identidade sem uma regra adicional.",
    "extension": "Compare busca por código numérico e por documento textual longo. Liste separadamente custo de calcular a chave, localizar candidatos e verificar igualdade.",
    "sources": [
      "python-data-model-deep",
      "clrs"
    ]
  },
  {
    "level": 3,
    "lessonId": "l3-enderecamento-aberto",
    "title": "A ausência só é provada no ponto correto da sondagem",
    "prerequisite": "Entender colisões, capacidade e sequência de sondagem linear.",
    "objective": "Justificar lápides e diferenciar ocupação viva de posições que prolongam a busca.",
    "explanation": "### A busca repete a história da inserção\nNa sondagem linear, uma chave começa no índice calculado e avança circularmente até uma posição adequada. A busca deve repetir esse caminho. Uma posição nunca ocupada prova ausência porque uma inserção anterior teria parado ali. Uma posição apagada não fornece essa prova: outras chaves podem ter atravessado esse local quando ele ainda estava ocupado.\n\nA lápide registra essa diferença. Ela permite continuar buscando, embora não contenha mais uma entrada viva. Ao inserir, podemos lembrar a primeira lápide como destino possível, mas precisamos continuar verificando se a chave já existe mais adiante. Parar cedo pode criar duas cópias lógicas da mesma chave, com valores inconsistentes.\n\n### Dois contadores contam histórias diferentes\nEntradas vivas divididas pela capacidade medem quantos dados existem. Entradas vivas mais lápides medem parte da pressão sobre buscas sem sucesso. Muitas exclusões reduzem o primeiro número sem encurtar os caminhos. Reconstruir uma tabela limpa pode ser útil sem aumentar sua capacidade.\n\nUma implementação precisa limitar o número de posições examinadas ou garantir espaço nunca usado. Sem essa condição, uma busca ausente pode dar voltas indefinidamente. O modelo de sondagem linear é didático: o dicionário Python usa regras próprias, e resultados numéricos de um modelo de dispersão não são garantias universais de tempo.",
    "worked": "### Rastreio: remover sem perder o vizinho\nCapacidade 7, índice k % 7. Inserimos 2 na posição 2, 9 na posição 3 e 16 na posição 4. Removemos 9. Buscar 16 deve visitar 2, atravessar a lápide em 3 e encontrar 16 em 4. Se a posição 3 fosse marcada como nunca usada, a busca pararia incorretamente. Ao atualizar 16, não inserimos outra cópia em 3: primeiro encontramos a original em 4. Já a nova chave 23 pode ocupar a lápide, depois de confirmar sua ausência até o primeiro vazio.",
    "misconception": "“Poucas entradas significam tabela rápida.” Lápides e agrupamentos podem manter sondagens longas mesmo após muitas remoções.",
    "question": "Uma reconstrução que apenas copia cada célula para o mesmo índice é suficiente ao mudar a capacidade?",
    "feedback": "Não. O índice inicial depende da capacidade, e a busca repetirá outra sequência. Reinserir as chaves vivas restabelece o contrato e elimina lápides.",
    "extension": "Rastreie uma colisão começando na última posição e dando a volta ao índice zero. Inclua remoção, atualização e busca ausente.",
    "sources": [
      "clrs",
      "mit-6006"
    ]
  },
  {
    "level": 3,
    "lessonId": "l3-chaves-hash",
    "title": "Igualdade de domínio antes da função hash",
    "prerequisite": "Conhecer dicionários e a diferença entre identidade de objeto e igualdade de valor.",
    "objective": "Definir uma chave canônica e manter o contrato entre igualdade, hash e mutação.",
    "explanation": "### Primeiro decida o que significa ser igual\nUm cadastro pode identificar um produto pelo código, sem considerar descrição ou preço. Nesse domínio, alterar o preço não cria outro produto. Se a igualdade considera apenas o código, o hash também precisa ser compatível com essa decisão. Usar no hash um preço ignorado pela igualdade permite que objetos iguais tenham hashes diferentes, quebrando o contrato.\n\nA implicação exigida é: objetos iguais devem ter hashes iguais. O inverso não vale. Usar menos campos no hash pode gerar mais colisões sem violar a correção; usar campos que diferenciam objetos considerados iguais pode torná-lo inválido. A estabilidade deve durar enquanto a chave participa da estrutura, e o protocolo Python define hash estável durante a vida de um objeto hashável.\n\n### Canonizar com critério\nAntes de escolher uma representação, defina regras do domínio. Remover espaços externos de um código pode ser correto; remover todos os espaços de uma frase ou mudar maiúsculas de um identificador sensível a caixa pode misturar valores diferentes. Uma chave canônica facilita igualdade, mas não deve inventar equivalências.\n\nO hash nativo de texto não é um identificador persistente entre processos. Para persistência, guarde a chave do domínio. Hashes para tabelas, resumos criptográficos e senhas protegidas têm objetivos diferentes; uma função rápida de dispersão não oferece, por si, autenticação ou proteção de segredo.",
    "worked": "### Rastreio: pares equivalentes\nDois registros de coordenadas representam (2, 5). Se igualdade compara x e y, ambos devem usar uma combinação coerente desses campos, por exemplo o hash da tupla (2, 5). Um terceiro ponto (5, 2) é diferente, mesmo se ocorrer colisão. Agora suponha que a chave inserida mude x de 2 para 8 e seu hash dependa de x: ela permanece fisicamente onde o hash antigo a colocou, enquanto uma consulta segue o novo hash. O estado da tabela deixa de respeitar a regra usada na inserção.",
    "misconception": "“frozen=True torna qualquer conteúdo profundamente imutável.” Impedir atribuição a campos não transforma automaticamente objetos mutáveis contidos neles nem garante que todos sejam hasháveis.",
    "question": "Uma função que devolve sempre zero satisfaz o requisito de objetos iguais terem hash igual?",
    "feedback": "Sim, mas espalha muito mal: todas as chaves colidem. Coerência é necessária para correção; dispersão também importa para desempenho.",
    "extension": "Defina uma chave para livros com várias edições. Explique quais campos distinguem edições e por que o título sozinho pode não bastar.",
    "sources": [
      "python-data-model-deep",
      "python-docs"
    ]
  },
  {
    "level": 3,
    "lessonId": "l3-arvores",
    "title": "A propriedade de busca vale para subárvores inteiras",
    "prerequisite": "Conhecer recursão, comparação e referências entre nós.",
    "objective": "Validar a ordem global de uma BST e relacionar custo ao caminho percorrido.",
    "explanation": "### Uma regra local com alcance global\nNuma árvore binária de busca com chaves distintas, todos os valores da subárvore esquerda são menores que a chave do nó e todos os da direita são maiores. Conferir apenas os filhos imediatos é insuficiente: um descendente pode violar um limite herdado de um ancestral. Uma validação correta transporta limites inferior e superior pelo percurso.\n\nA busca compara a chave procurada com o nó atual. A propriedade global permite abandonar uma subárvore inteira. Isso não significa descartar exatamente metade dos nós: uma árvore balanceada controla altura, e seus lados podem ter tamanhos diferentes. O custo depende do comprimento do caminho, O(h), assumindo comparações de custo constante.\n\n### Percurso não é busca\nO percurso em ordem visita esquerda, nó e direita. Por indução, a esquerda aparece ordenada antes do nó e a direita ordenada depois dele; daí a sequência final crescente. A árvore vazia é a base da explicação. Visitar todos os nós exige tempo linear mesmo quando a árvore é balanceada.\n\nDuplicatas precisam de política própria: contagem num nó, atualização de valor ou outra convenção consistente. A altura também precisa de definição: aqui contamos arestas, então uma folha tem altura zero. Uma árvore em cadeia pode exigir memória recursiva linear; uma pilha explícita evita depender do limite de chamadas, mas não elimina o espaço do caminho.",
    "worked": "### Rastreio: um erro escondido\nConsidere raiz 20, filho esquerdo 10 e filho direito de 10 igual a 25. Cada comparação pai–filho parece correta: 10 < 20 e 25 > 10. Porém 25 pertence à subárvore esquerda de 20 e deveria ser menor que 20. Ao validar 10, herdamos limite superior 20; seu filho direito precisa estar entre 10 e 20. O valor 25 viola esse intervalo. Uma busca por 25 começaria à direita da raiz e não o encontraria na posição incorreta.",
    "misconception": "“Qualquer árvore binária é uma BST.” Binária limita o número de filhos; a ordenação é uma propriedade adicional que precisa ser mantida.",
    "question": "Inserir 2, 4, 6, 8 numa BST simples garante altura logarítmica?",
    "feedback": "Não. Sem balanceamento, forma-se uma cadeia à direita com altura 3. Para n inserções crescentes, a altura pode chegar a n−1.",
    "extension": "Escreva os intervalos permitidos de cada nó de uma pequena BST e compare com seu percurso em ordem.",
    "sources": [
      "mit-6006",
      "clrs"
    ]
  },
  {
    "level": 3,
    "lessonId": "l3-arvores-balanceadas",
    "title": "Rotação preserva ordem; alturas explicam quando usá-la",
    "prerequisite": "Conhecer BST, altura medida em arestas e percurso em ordem.",
    "objective": "Rastrear uma rotação dupla e explicar a garantia logarítmica de uma AVL.",
    "explanation": "### Duas propriedades independentes\nUma AVL precisa satisfazer a ordem de busca e o limite de diferença entre alturas dos filhos em cada nó. Uma árvore pode estar perfeitamente ordenada e ser alta demais. Também pode parecer equilibrada na raiz e conter um desequilíbrio mais abaixo. Por isso a verificação e a atualização acompanham todo o caminho alterado.\n\nUma rotação reorganiza referências entre poucos nós e subárvores sem mudar a sequência do percurso em ordem. Não é necessário visitar todos os elementos dessas subárvores. Entretanto, alturas armazenadas precisam ser atualizadas na ordem certa: primeiro o nó que desceu, depois o que subiu, pois a altura deste depende da nova altura daquele.\n\n### Por que a altura não cresce sem controle\nCom altura vazia −1 e folha 0, o menor número de nós possível numa AVL de altura h obedece N(h)=1+N(h−1)+N(h−2). Para ser alta com poucos nós, uma subárvore fica um nível menor que a outra, o máximo permitido. Os valores começam em N(−1)=0, N(0)=1, N(1)=2, N(2)=4, N(3)=7. Esse crescimento exponencial em altura implica altura logarítmica em quantidade de nós.\n\nInserção e remoção não têm o mesmo efeito. Após remover, a altura de uma subárvore pode continuar diminuindo e exigir novos reparos acima. Não interrompa o retorno automaticamente após a primeira rotação de uma remoção.",
    "worked": "### Rastreio: caso esquerda–direita\nInserimos 30, depois 10, depois 20. A raiz 30 tem fator +2; seu filho esquerdo 10 pesa para a direita. Primeiro rotacionamos 10 para a esquerda: 20 assume seu lugar e 10 vira filho esquerdo de 20. Depois rotacionamos 30 para a direita: a raiz local vira 20, com filhos 10 e 30. O percurso em ordem permanece [10, 20, 30]. As folhas têm altura 0 e a nova raiz altura 1, com fator zero.",
    "misconception": "“Rotacionar troca os valores para ordenar.” A rotação preserva uma ordem já válida e modifica a forma. Subárvores intermediárias precisam ser religadas, não descartadas.",
    "question": "Por que manter apenas o fator da raiz não certifica que uma árvore é AVL?",
    "feedback": "Porque o requisito vale em todos os nós. Dois ramos igualmente altos podem esconder cadeias desequilibradas internamente.",
    "extension": "Faça o caso espelhado com 10, 30, 20 e confira alturas e percurso antes e depois de cada rotação.",
    "sources": [
      "mit-6006",
      "clrs"
    ]
  },
  {
    "level": 3,
    "lessonId": "l3-heap-binario",
    "title": "Forma completa e ordem parcial trabalham juntas",
    "prerequisite": "Conhecer índices de listas, altura de árvore e comparação.",
    "objective": "Rastrear reparos do heap e justificar construção linear sem confundi-la com inserções repetidas.",
    "explanation": "### Duas invariantes, duas responsabilidades\nA forma completa permite guardar a árvore sem espaços entre posições: filhos de i ficam em 2i+1 e 2i+2. A ordem do heap mínimo exige pai não maior que seus filhos. Juntas, essas propriedades tornam a raiz um mínimo e mantêm a altura logarítmica. Nenhuma delas ordena irmãos ou separa menores à esquerda e maiores à direita como numa BST.\n\nInserir no fim conserva a forma; subir o novo elemento corrige apenas o caminho até a raiz. Ao retirar a raiz, colocar o último elemento em seu lugar conserva a forma, mas pode violar a ordem. Descer escolhendo o menor filho garante que o elemento promovido não seja maior que o irmão deixado abaixo.\n\n### Somar alturas, não o pior limite para todos\nConstruir de baixo para cima começa nas últimas posições que possuem filhos. As folhas já são heaps. Quando tratamos um pai, seus filhos já encabeçam heaps válidos, e uma descida resolve a região inteira. Aproximadamente metade dos nós não desce; um quarto desce no máximo um nível; um oitavo, dois. Somar esses trabalhos resulta em O(n), embora usar O(log n) indiscriminadamente para cada nó dê um limite mais frouxo.\n\nBuscar um valor arbitrário não ganha automaticamente tempo logarítmico, pois não há ordem entre subárvores que permita descartar um lado. Também não se deve alterar uma prioridade sem reparar a estrutura. Para comparações caras, o custo total inclui o custo de cada comparação.",
    "worked": "### Rastreio: retirar o mínimo\nHeap [2, 5, 3, 9, 7, 8]. Guardamos 2, retiramos o último valor 8 e o colocamos na raiz: [8, 5, 3, 9, 7]. Os filhos da raiz são 5 e 3; trocamos com 3, o menor: [3, 5, 8, 9, 7]. O 8 está no índice 2, sem filhos, e terminamos. Escolher 5 na primeira troca deixaria 5 acima de 3 e quebraria a propriedade. O vetor final é um heap, embora 9 apareça antes de 7.",
    "misconception": "“Heapify devolve a lista ordenada.” A operação reorganiza a própria lista em um heap e, em Python, retorna None. Ordenação completa é outra operação.",
    "question": "O vetor [1, 4, 2, 8, 6, 3] pode ser um heap mínimo mesmo sem estar crescente?",
    "feedback": "Sim. Cada pai é menor ou igual aos filhos: 1≤4 e 2; 4≤8 e 6; 2≤3. A ordem entre irmãos não é exigida.",
    "extension": "Rastreie a inserção de 0 nesse vetor. Anote o índice do pai a cada troca até a raiz.",
    "sources": [
      "python-docs",
      "clrs"
    ]
  },
  {
    "level": 3,
    "lessonId": "l3-grafos",
    "title": "Camadas de descoberta e significado de menor caminho",
    "prerequisite": "Conhecer fila FIFO e representação de vizinhos.",
    "objective": "Justificar a distância da BFS e reconhecer quando o modelo do problema invalida essa resposta.",
    "explanation": "### A modelagem escolhe o que significa distância\nUm grafo transforma entidades em vértices e relações em arestas. Uma rua de mão única pede uma relação dirigida; uma conexão bidirecional pede duas direções na representação de adjacência. Dizer que uma rota é “menor” exige definir a medida. A BFS minimiza a quantidade de arestas em grafos sem pesos, ou com pesos iguais positivos; ela não minimiza automaticamente tempo, preço ou distância física.\n\nA fila mantém vértices em ordem não decrescente de distância descoberta. Primeiro sai a origem, depois os alcançáveis com uma aresta, depois com duas. Quando um vértice ainda desconhecido é descoberto a partir de distância d, recebe d+1. Um caminho mais curto teria sido examinado numa camada anterior. Esse argumento sustenta a correção.\n\n### Descobrir uma vez é suficiente\nMarque o vértice ao enfileirar, não apenas ao retirá-lo. Caso contrário, dois vizinhos podem enfileirar a mesma entidade antes que ela seja processada. Guardar um predecessor na primeira descoberta permite reconstruir um caminho mínimo, mas não todos. Empates podem produzir caminhos diferentes conforme a ordem dos vizinhos, mantendo a mesma distância.\n\nCom listas de adjacência e operações usuais de visita, uma exploração completa custa O(V+E). Com matriz, listar vizinhos pode exigir examinar V células por vértice. O custo depende tanto do algoritmo quanto da representação. Vértices inalcançáveis precisam de um marcador distinto de distância zero.",
    "worked": "### Rastreio: dois caminhos mínimos\nA aponta para B e C; B e C apontam para D. Começamos com fila [A] e distância de A igual a 0. Retiramos A, descobrimos B e C com distância 1 e fila [B, C]. Retiramos B, descobrimos D com distância 2 e predecessor B. Ao retirar C, D já foi descoberto e não entra novamente. Reconstruímos A–B–D. A–C–D também tem duas arestas, mas não foi armazenado como predecessor neste percurso.",
    "misconception": "“BFS encontra a rota mais rápida.” Duas arestas lentas podem demorar mais que três rápidas. A distância calculada precisa corresponder à pergunta do produto.",
    "question": "Se A–D tem custo 100 e A–B–D custa 2 no total, qual caminho uma BFS sem pesos prioriza?",
    "feedback": "A–D, por ter uma aresta. Isso evidencia por que ignorar pesos responde a uma pergunta diferente da de menor custo.",
    "extension": "Modele uma rede de pré-requisitos e explique por que uma ligação não deve ser automaticamente inserida nos dois sentidos.",
    "sources": [
      "mit-6006",
      "clrs"
    ]
  },
  {
    "level": 3,
    "lessonId": "l3-grafos-dfs",
    "title": "Entrada, saída e a diferença entre visitado e ativo",
    "prerequisite": "Conhecer DFS e chamadas recursivas; distinguir grafo dirigido de não dirigido.",
    "objective": "Explicar por que uma aresta para um vértice ativo prova ciclo dirigido e uma aresta para um concluído não prova.",
    "explanation": "### A pilha guarda tarefas ainda incompletas\nNa DFS recursiva, entrar em um vértice inicia uma exploração que só termina após seus descendentes descobertos. O estado ativo representa uma chamada que ainda não retornou. O estado concluído representa uma exploração terminada. Essa distinção permite raciocinar sobre dependências e não apenas sobre alcançabilidade.\n\nUse branco para desconhecido, cinza para ativo e preto para concluído. Num grafo dirigido, uma aresta para cinza encontra um ancestral ainda presente no caminho de chamadas. Já existe um caminho dirigido daquele ancestral até o vértice atual, e a nova aresta fecha o retorno. Uma aresta para preto pode apenas compartilhar um destino previamente explorado.\n\n### Completar a exploração exige um laço externo\nUma única DFS visita somente o que é alcançável da origem. Para examinar todo o grafo, inicie outra busca a partir de cada vértice ainda branco. Em grafos não dirigidos isso permite contar componentes conexos. Em grafos dirigidos, não confunda essa contagem de buscas com componentes fortemente conexos: o alcance depende da direção.\n\nUma pilha que apenas guarda vértices pendentes pode encontrar os mesmos alcançáveis, mas não reproduz automaticamente os instantes de saída da recursão. Para isso, registre o progresso pelos vizinhos, ou eventos explícitos de entrada e saída. O limite de recursão depende do ambiente; não é uma propriedade matemática do grafo.",
    "worked": "### Rastreio: compartilhar não é circular\nA aponta para B e C; B aponta para D; C também aponta para D. Começamos em A, seguimos B e depois D. D termina e fica preto; B também termina. Ao explorar C, sua aresta para D encontra um vértice preto, sem provar ciclo. Agora acrescente D→A: quando D é explorado a partir de B, A ainda está cinza. Temos A→B→D→A, um ciclo dirigido. A cor representa o momento da exploração, não uma propriedade permanente do vértice.",
    "misconception": "“Aresta para qualquer visitado significa ciclo.” Num grafo dirigido, um destino concluído pode ser compartilhado sem ciclo. Num grafo não dirigido, é necessário tratar também a aresta de retorno ao pai.",
    "question": "Por que marcar um vértice como concluído logo ao entrar impediria a detecção correta por três cores?",
    "feedback": "Eliminaríamos a distinção entre exploração em andamento e terminada. Uma aresta de retorno a um ancestral não encontraria a marca ativa necessária ao argumento.",
    "extension": "Rastreie entrada e saída num grafo com dois componentes isolados e justifique o laço externo.",
    "sources": [
      "sedgewick-algs",
      "mit-6006"
    ]
  },
  {
    "level": 3,
    "lessonId": "l3-union-find",
    "title": "Representantes de grupos e informação que não é preservada",
    "prerequisite": "Conhecer índices, árvores de pais e componentes de um grafo não dirigido.",
    "objective": "Justificar união por tamanho, rastrear compressão e explicar limites de conectividade incremental.",
    "explanation": "### A estrutura representa uma partição\nUnion-Find mantém grupos disjuntos de elementos. Cada elemento pertence a exatamente um grupo, representado pela raiz de sua árvore de pais. find consulta esse representante; union combina dois grupos. O número retornado como representante é uma escolha interna, não necessariamente o menor elemento ou um identificador estável de negócio.\n\nA união deve conectar raízes diferentes. Ligar um nó interno pode separar parte de um grupo ou criar relações incorretas. Quando as raízes já são iguais, a operação não reduz a quantidade de componentes. Conectar a raiz do grupo menor à do maior limita a altura: cada vez que um elemento ganha um nível, o tamanho de seu grupo ao menos dobra. Como não pode exceder n, esse aumento ocorre no máximo log₂ n vezes.\n\n### Achatar sem mudar o grupo\nCompressão de caminho faz elementos visitados por find apontarem para a raiz encontrada. A partição permanece igual; o caminho interno muda. Por isso os pais da estrutura não servem para reconstruir caminhos do grafo original. Com união por tamanho ou rank e compressão, as operações têm limite amortizado associado à inversa de Ackermann, muito lenta. Ainda precisamos pagar Θ(n) para inicializar n elementos; uma operação isolada não é prometida como constante estrita.\n\nO modelo básico une grupos e não desfaz ligações. Remover uma aresta do grafo pode ou não separar um grupo, e a partição sozinha não contém informação suficiente para decidir. Alcance dirigido também não equivale a pertencer ao mesmo grupo.",
    "worked": "### Rastreio: união e compressão\nComeçamos com pais [0, 1, 2, 3]. Unimos 0 e 1, escolhendo 0 no empate: [0, 0, 2, 3]. Unimos 2 e 3, escolhendo 2: [0, 0, 2, 2]. Unimos os dois grupos, escolhendo 0: [0, 0, 0, 2]. find(3) segue 3→2→0 e comprime para [0, 0, 0, 0]. As consultas ficam mais curtas, mas nenhuma nova ligação foi adicionada ao grafo. Outra union(1, 3) não muda a contagem: eles já estão juntos.",
    "misconception": "“O pai interno é uma conexão real.” A união de representantes e a compressão criam atalhos administrativos; eles não documentam necessariamente arestas existentes.",
    "question": "Após unir um grupo de dois elementos a outro de cinco, qual raiz deve ficar abaixo na união por tamanho?",
    "feedback": "A raiz do grupo de dois deve apontar para a do grupo de cinco. O novo tamanho na raiz resultante é sete; os tamanhos relevantes são os das raízes.",
    "extension": "Registre o número de componentes após uma sequência com uniões repetidas. Explique por que somente uniões entre raízes diferentes reduzem esse número.",
    "sources": [
      "sedgewick-algs",
      "clrs"
    ]
  }
];
