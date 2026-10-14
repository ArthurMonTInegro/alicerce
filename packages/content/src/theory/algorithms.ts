import type {TheoryExpansion} from '../theory-types.ts';

export const algorithmTheory: TheoryExpansion[] = [
  {
    "level": 4,
    "lessonId": "l4-o-omega-teta",
    "title": "Limites assintóticos como afirmações demonstráveis",
    "prerequisite": "Somatórios simples, laços e a diferença entre tamanho da entrada e valor de um elemento.",
    "objective": "Justificar uma classe de crescimento com desigualdades e identificar qual função de custo está sendo analisada.",
    "explanation": "### Primeiro escolha o que contar\nUma afirmação de complexidade precisa de uma função bem definida. Podemos contar comparações no pior caso entre entradas de tamanho n, movimentações de registros ou operações aritméticas. São medidas distintas. Para inteiros muito grandes, uma multiplicação não tem necessariamente custo constante: o tamanho em bits também faz parte da entrada.\n\n### Dois limites cercam o crescimento\nPara provar Θ(g(n)), procure constantes positivas que cerquem o custo entre múltiplos de g(n), a partir de algum n. A constante não pode crescer com n. Dizer que n² ≤ n·n não prova O(n): o suposto multiplicador seria o próprio n. Um limite superior folgado continua verdadeiro, mas esconde informação útil para comparar soluções.\n\n### A entrada não desaparece\nMelhor caso, pior caso e esperança matemática são funções diferentes. Na busca linear, contar n comparações quando o alvo está ausente não descreve uma busca que para imediatamente. Para falar em média, declare a distribuição: alvos igualmente prováveis entre as posições presentes produzem uma conta diferente de uma carga de trabalho em que quase todas as buscas fracassam. A notação não fornece essa hipótese.",
    "worked": "### Exemplo resolvido: uma região triangular\nUm laço executa i operações para cada i de 1 até n. Para n = 5, os custos são 1, 2, 3, 4 e 5: total 15. Em geral, S(n) = n(n + 1)/2. Como n ≥ 1, temos n²/2 ≤ S(n) ≤ n². Portanto S é Θ(n²), com constantes 1/2 e 1. Não foram necessárias medições de relógio. Se cada operação manipular uma string de comprimento m, o modelo pode passar a depender também de m; não esconda esse trabalho dentro da palavra “operação”.",
    "misconception": "Ω não significa melhor caso. A própria função de pior caso pode ter um limite inferior Ω(n²).",
    "question": "Se f(n) = 7n + 12, é correto escrever O(n²)? Qual descrição informa melhor o crescimento?",
    "feedback": "Sim, O(n²) é verdadeiro, porém folgado. Para n ≥ 1, 7n ≤ f(n) ≤ 19n, portanto Θ(n) é uma descrição justa.",
    "extension": "Analise a soma 2 + 4 + … + 2n com limites explícitos; depois explique por que medir apenas n = 10 não prova a classificação.",
    "sources": [
      "clrs",
      "mit-6006"
    ]
  },
  {
    "level": 4,
    "lessonId": "l4-analise-amortizada",
    "title": "Sequências de operações e crédito que não fica negativo",
    "prerequisite": "Pilhas, vetores dinâmicos e somas de progressões geométricas.",
    "objective": "Separar latência individual, custo total e hipótese sobre a sequência de operações.",
    "explanation": "### O objeto da análise é a sequência\nUma operação cara não implica que todas possam ser caras consecutivamente. Ao analisar n inserções, precisamos contar quantas cópias realmente ocorrem ao longo dessa sequência. A garantia amortizada limita esse total mesmo para uma sequência adversarial permitida pelo contrato; não depende de sortear entradas favoráveis.\n\n### De onde vem o crédito\nNo método contábil, operações baratas pagam um pouco a mais e deixam crédito para uma reconstrução futura. Esse crédito é uma ferramenta matemática, não dinheiro nem espaço obrigatoriamente armazenado no programa. A prova exige saldo suficiente quando a operação cara ocorre. Se uma mudança de política permite reconstruções frequentes sem acumular crédito, a garantia deixa de valer.\n\n### O que a garantia não promete\nCusto amortizado constante não garante tempo constante em cada clique. Uma inserção que expande o vetor ainda pode copiar todos os elementos. Sistemas com restrições de latência precisam considerar esse pico. Também é preciso especificar a política de crescimento: aumentar a capacidade em uma posição por vez gera uma soma quadrática de cópias; crescimento por um fator constante maior que um permite uma soma geométrica.",
    "worked": "### Exemplo resolvido: oito inserções\nConsidere capacidade inicial 1, duplicação quando cheia e custo unitário por gravar ou copiar um elemento. Inserir oito itens exige oito gravações. As expansões copiam 1, depois 2, depois 4 elementos: sete cópias. Total: 15 operações, embora a quinta inserção isolada faça quatro cópias e uma gravação. Para n inserções, a soma das capacidades copiadas é menor que 2n; com as gravações, o total é menor que 3n. A conta modela esse vetor abstrato, não fixa a política interna de toda implementação de lista.",
    "misconception": "Amortizado não é sinônimo de médio probabilístico nem de ausência de pausas.",
    "question": "Se a capacidade aumentar só uma posição a cada inserção, o mesmo argumento funciona?",
    "feedback": "Não. As cópias somam 1 + 2 + … + (n − 1), que é Θ(n²). O crescimento geométrico era uma hipótese essencial.",
    "extension": "Modele uma pilha com múltiplos pops: justifique por que nenhum item pode ser removido mais vezes do que foi inserido.",
    "sources": [
      "clrs",
      "mit-6006"
    ]
  },
  {
    "level": 4,
    "lessonId": "l4-busca",
    "title": "Busca como eliminação justificada de possibilidades",
    "prerequisite": "Índices, listas ordenadas e comparações consistentes entre os elementos.",
    "objective": "Rastrear uma busca ausente e explicar simultaneamente correção e término.",
    "explanation": "### Buscar não é apenas comparar com o meio\nA busca binária precisa de ordem compatível com a comparação usada. Quando o meio é menor que o alvo, todos os elementos anteriores também são menores; essa implicação justifica descartá-los. Sem ordenação, a comparação isolada não diz onde estão as demais possibilidades.\n\n### O intervalo guarda uma promessa\nNa variante de intervalo fechado [lo, hi], o invariante afirma: se o alvo existir e ainda não tiver sido encontrado, pelo menos uma ocorrência está nesse intervalo. Inicialmente ele cobre a lista inteira. Depois de comparar um meio desigual, retiramos esse índice também: lo = meio + 1 ou hi = meio − 1. A quantidade de candidatos diminui, garantindo término. Para a lista vazia, hi começa em −1 e nenhuma indexação ocorre.\n\n### Escolha considerando o trabalho completo\nBusca linear não exige preparar a entrada e pode parar cedo. Ordenar apenas para uma consulta custa mais que a consulta binária; para muitas consultas, o investimento pode valer a pena. O(log n) também pressupõe acesso eficiente ao meio: numa lista encadeada, percorrer nós para chegar a cada posição muda o custo. Se houver repetidos, retornar qualquer ocorrência é um contrato diferente de retornar a primeira.",
    "worked": "### Exemplo resolvido: provar a ausência de 9\nNa lista [2, 6, 8, 12, 15], usamos índices 0 a 4. O meio é 2, valor 8; todos os índices até 2 são descartados, restando [3, 4]. O novo meio é 3, valor 12; descartamos de 3 em diante, ficando lo = 3 e hi = 2. O intervalo ficou vazio, então 9 está ausente. A posição 3 seria adequada para inseri-lo, mas o algoritmo que retorna −1 não promete fornecer essa informação. Não misture esses dois contratos na interpretação do resultado.",
    "misconception": "Usar lo = meio pode preservar o mesmo intervalo e impedir o término em dois elementos.",
    "question": "Na lista [4, 7], ao buscar 7 e obter meio = 0, qual atualização permite avançar?",
    "feedback": "Como 4 < 7, usamos lo = 1. Com lo = 0, repetiríamos a comparação indefinidamente nessa variante.",
    "extension": "Conte comparações em buscas presentes e ausentes, incluindo lista vazia, um elemento e alvos menores ou maiores que todos.",
    "sources": [
      "mit-6006",
      "clrs"
    ]
  },
  {
    "level": 4,
    "lessonId": "l4-bisect-fronteiras",
    "title": "Fronteiras, intervalos e contagem sem percorrer resultados",
    "prerequisite": "Busca binária e significado de intervalos semiabertos [a, b).",
    "objective": "Traduzir desigualdades inclusivas e exclusivas em duas posições de inserção.",
    "explanation": "### Uma posição não é uma ocorrência\nUma fronteira separa regiões de uma sequência ordenada. A posição pode ser igual ao tamanho da lista, indicando o espaço depois do último item. Por isso, ela serve mesmo quando o alvo não existe e não deve ser usada diretamente para indexar sem verificar os limites.\n\n### Intervalos tornam a contagem algébrica\nSe L marca o primeiro elemento permitido e R o primeiro elemento já proibido, os resultados ocupam [L, R) e são R − L itens. A inclusão das pontas depende da pergunta. Para valores entre a e b, inclusive, a primeira região proibida à esquerda contém valores menores que a; à direita, a primeira região proibida contém valores maiores que b. Mudou uma desigualdade, pode mudar a escolha da fronteira.\n\n### O custo depende da saída pedida\nEncontrar duas fronteiras custa O(log n) comparações com acesso direto à lista. Contar usa apenas a diferença entre índices. Copiar os k resultados custa adicionalmente O(k). Manter a lista ordenada por inserções pode deslocar O(n) itens; localizar rapidamente o ponto não elimina esses deslocamentos. Se a estrutura sofrer alterações enquanto é consultada, a ordenação e a consistência precisam ser protegidas pelo sistema.",
    "worked": "### Exemplo resolvido: relatório de medidas\nTemos [3, 5, 5, 8, 10, 10]. Queremos contar medidas em [5, 10). A primeira posição ≥ 5 é 1; a primeira ≥ 10 é 4. Portanto há 4 − 1 = 3 medidas: 5, 5 e 8. Para [5, 10], a fronteira direita muda para a primeira posição > 10, que é 6: agora são cinco medidas. Para o valor ausente 7, as duas fronteiras de igualdade coincidem em 3, resultando em zero ocorrências. Nenhum desses cálculos precisa percorrer as medidas selecionadas.",
    "misconception": "Uma fronteira igual a n é válida; xs[n] continua sendo um acesso inválido.",
    "question": "Como contar exclusivamente valores maiores que 5 e menores ou iguais a 10?",
    "feedback": "Use a primeira posição > 5 como L e a primeira posição > 10 como R. No exemplo, L = 3 e R = 6: três valores.",
    "extension": "Escreva uma tabela para [a,b], [a,b), (a,b] e (a,b), assumindo a ≤ b; trate separadamente intervalos vazios.",
    "sources": [
      "v7-algo-bisect",
      "clrs"
    ]
  },
  {
    "level": 4,
    "lessonId": "l4-busca-na-resposta",
    "title": "Da otimização a uma decisão monotônica",
    "prerequisite": "Busca binária, desigualdades e leitura de uma lista em ordem.",
    "objective": "Construir um verificador, provar monotonicidade e testar a minimalidade da resposta.",
    "explanation": "### A pergunta de decisão precisa ser equivalente\nProcurar a menor capacidade é difícil diretamente. Perguntar se uma capacidade dada permite atender à demanda pode ser simples. Porém o verificador precisa representar todas as restrições: manter a ordem, respeitar o número de dias e impedir dividir um pacote, por exemplo. Um verificador incorreto apenas fará a busca convergir rapidamente para uma resposta errada.\n\n### Monotonicidade é uma prova, não um desenho\nSe uma agenda funciona com capacidade C, a mesma agenda funciona com capacidade maior, desde que aumentar a capacidade não acrescente outra restrição. Assim, a viabilidade muda de falso para verdadeiro no máximo uma vez. A busca pode descartar capacidades pequenas depois de um teste falso e conservar uma capacidade viável como candidata quando o teste é verdadeiro.\n\n### Limites e custo do verificador\nCom pesos positivos, o maior pacote é um limite inferior, e a soma dos pesos é um limite superior viável para pelo menos um dia disponível. Se o intervalo contiver R capacidades inteiras e cada teste custar O(n), a busca custa O(n log(R + 1)). Não escreva apenas O(log n): n mede pacotes, enquanto R mede capacidades. Para entradas vazias, dias inválidos ou respostas reais, o contrato e o critério de parada precisam ser redefinidos.",
    "worked": "### Exemplo resolvido: duas viagens\nOs pacotes pesam [4, 2, 3, 5] e devem sair nessa ordem em até dois dias. Capacidade 7 produz [4,2], [3] e [5]: três dias. Capacidade 8 produz [4,2], [3,5]: dois dias. O carregamento guloso pega o maior prefixo que cabe a cada dia; qualquer alternativa com a mesma capacidade não transporta mais pacotes naquele primeiro dia. Repetindo o raciocínio, ele minimiza a quantidade de dias. Como 7 falha e 8 funciona, a fronteira mínima é 8.",
    "misconception": "Testar se o carregamento guloso usa exatamente dois dias não representa “no máximo dois”: capacidades maiores podem fazê-lo usar um dia e tornar esse teste falso novamente.",
    "question": "Por que testar a resposta r e sua antecessora r − 1 é útil?",
    "feedback": "Porque confirma a fronteira local: r precisa ser viável e r − 1 inviável, salvo quando r já é o menor candidato permitido. Isso complementa, mas não substitui, a prova do verificador.",
    "extension": "Adapte o exemplo para três dias e explique quais limites continuam válidos.",
    "sources": [
      "mit-6006",
      "clrs"
    ]
  },
  {
    "level": 4,
    "lessonId": "l4-ordenacao",
    "title": "Ordenar exige preservar identidade e definir empates",
    "prerequisite": "Listas, comparação por chaves e conceito de permutação.",
    "objective": "Distinguir ordenação correta, estabilidade e custos que dependem da entrada.",
    "explanation": "### Duas obrigações, não apenas uma\nUma saída ordenada precisa respeitar o critério e conter exatamente os registros da entrada, com suas multiplicidades. Devolver uma lista vazia satisfaz a ordem de forma trivial, mas perde todos os dados. Essa segunda obrigação ajuda a testar implementações que duplicam ou deixam elementos para trás ao intercalar.\n\n### Chave igual não torna registros iguais\nDois alunos podem ter a mesma nota e nomes distintos. Uma ordenação estável preserva a ordem relativa original entre chaves equivalentes. Isso permite ordenar por um critério secundário e depois, de forma estável, pelo principal. Outra opção é definir uma chave composta que explicite todos os desempates. A ordem desejada é uma decisão do produto.\n\n### O modelo precisa acompanhar a implementação\nInsertion sort faz trabalho proporcional aos deslocamentos necessários; entradas quase ordenadas podem ser favoráveis, mas é preciso caracterizar quantas inversões existem. Merge sort divide equilibradamente e paga a intercalação. Quicksort depende das partições: sua pilha recursiva pode atingir O(n) no pior caso numa implementação ingênua. Comparar strings longas também não é necessariamente uma operação constante; medir apenas o número de comparações deixa esse custo separado.",
    "worked": "### Exemplo resolvido: boletim estável\nA entrada é [(Lia, 8), (Beto, 7), (Ana, 8)]. Ordenando de modo estável por nota crescente, obtemos [(Beto, 7), (Lia, 8), (Ana, 8)]. Lia permanece antes de Ana porque esse era o desempate implícito da entrada. Para nota crescente e nome alfabético, uma chave (nota, nome) dá Beto, Ana, Lia. As duas saídas estão ordenadas por nota, mas atendem contratos diferentes. Para validar, confira também que os três registros aparecem uma única vez; olhar apenas a sequência 7, 8, 8 perderia essa informação.",
    "misconception": "Estabilidade não significa que o algoritmo nunca modifica a lista; significa preservar empates segundo a chave escolhida.",
    "question": "Se dois registros têm a mesma chave composta, uma ordenação estável ainda pode importar?",
    "feedback": "Sim. Campos que não participaram da chave podem distinguir os registros, e a ordem anterior entre eles será preservada.",
    "extension": "Crie registros com identificadores únicos e teste simultaneamente ordem, multiplicidades e preservação dos empates.",
    "sources": [
      "clrs",
      "sedgewick-algs"
    ]
  },
  {
    "level": 4,
    "lessonId": "l4-quicksort",
    "title": "Partição como contrato e recursão que reduz o problema",
    "prerequisite": "Recursão, índices inclusivos e comparação entre custo médio e pior caso.",
    "objective": "Explicar o que a partição garante e por que seus limites determinam correção e custo.",
    "explanation": "### Separar não significa ordenar\nApós uma partição, cada elemento pertence ao lado adequado do pivô, mas os elementos de cada lado podem continuar embaralhados. A recursão resolve exatamente esse trabalho restante. A prova combina o contrato da partição com a hipótese de que os trechos menores serão ordenados corretamente.\n\n### Os esquemas não são intercambiáveis\nNa partição de Lomuto com pivô final, o retorno costuma identificar a posição definitiva do pivô, excluída das duas chamadas seguintes. Outros esquemas devolvem uma fronteira, sem prometer colocar um pivô definitivo ali. Copiar o retorno de um esquema e os intervalos recursivos de outro pode perder itens ou não reduzir o trecho. Escreva o contrato antes de alterar os índices.\n\n### Equilíbrio controla o trabalho repetido\nPartições equilibradas geram cerca de log n níveis, cada um com trabalho total linear. Partições extremas produzem custos n + (n − 1) + …, quadráticos. Pivôs aleatórios fornecem uma garantia esperada sob a aleatoriedade adequada, não eliminam toda execução ruim. Muitos valores repetidos pedem cuidado: separar menores, iguais e maiores permite retirar o bloco inteiro de iguais da recursão, mas cria três regiões com invariantes próprios.",
    "worked": "### Exemplo resolvido: uma passagem de Lomuto\nNo trecho [6, 2, 5, 3], o pivô é 3 e a região dos menores começa vazia. O 6 fica na região dos não menores. Ao ler 2, trocamos com 6: [2, 6, 5, 3], e a fronteira avança. O 5 também não é menor. Ao final, trocamos o pivô com o primeiro não menor: [2, 3, 5, 6]. A posição 1 está resolvida; a recursão recebe [0,0] e [2,3]. Neste exemplo o lado direito já parece ordenado, mas isso não é uma promessa da partição.",
    "misconception": "Escolher pivô aleatório não transforma o pior caso matemático em O(n log n).",
    "question": "Numa lista de cem elementos todos iguais, por que três vias pode evitar recursão inútil?",
    "feedback": "Todos entram no bloco de iguais; os blocos menor e maior ficam vazios. Uma passagem resolve o trecho em vez de separar apenas um pivô por vez.",
    "extension": "Rastreie a mesma partição em [3,3,3,3] e compare o número de chamadas com uma variante de três vias.",
    "sources": [
      "clrs",
      "sedgewick-algs"
    ]
  },
  {
    "level": 4,
    "lessonId": "l4-ordenacao-linear",
    "title": "O limite de comparações e o preço de usar as chaves",
    "prerequisite": "Fatoriais, potências e estabilidade de uma ordenação.",
    "objective": "Reconhecer as hipóteses que permitem counting sort e radix sort sem prometer tempo linear universal.",
    "explanation": "### Um limite pertence a um modelo\nPara chaves distintas, há n! ordens possíveis. Uma árvore binária de comparações com altura h tem no máximo 2^h folhas. Distinguir todas as ordens requer 2^h ≥ n!, logo h ≥ log₂(n!). A conclusão limita algoritmos que aprendem a ordem apenas pelas comparações; não diz que todo processamento de qualquer tipo de chave exige a mesma quantidade de passos.\n\n### Endereçar valores muda o modelo\nCounting sort usa a chave inteira para endereçar contadores. Com n itens e faixa de k valores, precisa percorrer a entrada e a faixa: O(n + k). Se os números estiverem muito espalhados, k pode ser enorme em relação a n. A versão que reconstrói apenas números pelas frequências não preserva automaticamente registros associados; para ordenar registros com estabilidade é preciso posicioná-los adequadamente.\n\n### Dígitos trazem outro parâmetro\nRadix sort por dígitos menos significativos processa d posições. Cada passagem estável por base b custa O(n + b), resultando em O(d(n + b)). Chamar isso de linear em n pressupõe controlar d e b. Negativos, comprimentos variáveis e regras de ordenação de texto exigem convenções adicionais; usar códigos de caracteres não implementa automaticamente a ordem alfabética desejada em todos os idiomas.",
    "worked": "### Exemplo resolvido: preservar o que o dígito anterior ensinou\nOrdene [32, 21, 31, 22] pelas unidades: uma passagem estável produz [21, 31, 32, 22]. Depois, ordene estavelmente pelas dezenas: o grupo das dezenas 2 fica [21, 22] e o das dezenas 3 fica [31, 32]. Resultado [21, 22, 31, 32]. Se a segunda passagem invertesse arbitrariamente registros com a mesma dezena, poderia produzir [22,21,32,31], destruindo o trabalho anterior. A estabilidade é parte da justificativa de correção dessa variante.",
    "misconception": "Counting sort não contradiz o limite Ω(n log n): sua forma de acessar informação está fora do modelo de comparações.",
    "question": "Com quatro códigos entre 0 e um bilhão, contar uma posição por valor é uma boa escolha?",
    "feedback": "Em geral, não: a faixa domina memória e tempo. Poucos itens não compensam percorrer uma estrutura com um bilhão de posições.",
    "extension": "Compare n, k, d e b para notas escolares, CEPs e textos de comprimento variável antes de escolher um algoritmo.",
    "sources": [
      "clrs",
      "mit-6006"
    ]
  },
  {
    "level": 4,
    "lessonId": "l4-recursao",
    "title": "Hipótese indutiva, medida decrescente e custo oculto",
    "prerequisite": "Funções, parâmetros, pilha de chamadas e listas.",
    "objective": "Separar prova de correção, prova de término e análise de recursos de uma função recursiva.",
    "explanation": "### Cada chamada tem seu próprio contrato\nUma função recursiva não resolve tudo “por mágica”. Ela reduz a entrada e usa o resultado de uma chamada menor sob uma hipótese explícita. Para somar uma lista, podemos assumir que a chamada seguinte soma corretamente o sufixo; acrescentar o primeiro elemento produz a soma inteira. A hipótese só é legítima se chegarmos a um caso básico bem definido.\n\n### Uma medida precisa descer\nComprimento restante, altura de uma árvore ou tamanho de um intervalo são medidas possíveis. Em entradas válidas, cada chamada deve diminuir uma medida não negativa até atingir o caso básico. Testar somente n == 0 não garante término se permitirmos números negativos e sempre subtrairmos um. Definir o domínio é parte da solução.\n\n### Chamadas e trabalho local são custos distintos\nUma cadeia de n chamadas usa profundidade O(n), mesmo quando cada chamada faz uma soma. Passar xs[1:] em Python cria cópias sucessivas: copiar n − 1, n − 2 e assim por diante pode gerar trabalho quadrático. Passar um índice evita essas cópias, mas não elimina a pilha. Linguagens e ambientes também impõem limites práticos à profundidade; uma fórmula matematicamente correta pode falhar para entradas grandes.",
    "worked": "### Exemplo resolvido: soma por índice\nPara [4, −2, 7], defina soma(i) como a soma dos elementos a partir de i. O caso i = 3 devolve 0. Depois, soma(2) = 7 + 0 = 7; soma(1) = −2 + 7 = 5; soma(0) = 4 + 5 = 9. A medida 3 − i diminui a cada chamada. Há quatro chamadas e nenhuma cópia de sufixo. O raciocínio funciona também para lista vazia: a chamada inicial já retorna 0. A versão iterativa mantém o mesmo contrato com memória auxiliar constante.",
    "misconception": "Usar recursão não torna automaticamente um algoritmo exponencial; isso depende de quantas subchamadas existem e de seus tamanhos.",
    "question": "Por que “há n chamadas” não basta para concluir tempo O(n)?",
    "feedback": "Porque o trabalho dentro de cada chamada também conta. Copiar um sufixo, procurar um item ou percorrer uma parte da lista pode crescer com n.",
    "extension": "Compare uma versão com fatias e outra com índice, contando elementos copiados sem depender apenas de um cronômetro.",
    "sources": [
      "mit-6006",
      "clrs"
    ]
  },
  {
    "level": 4,
    "lessonId": "l4-dividir-conquistar",
    "title": "Recorrências que refletem dividir e combinar",
    "prerequisite": "Recursão, logaritmos e intercalação de listas ordenadas.",
    "objective": "Construir uma recorrência a partir do algoritmo e conferir o trabalho por nível.",
    "explanation": "### A recorrência descreve a implementação\nSe um problema de tamanho n gera duas chamadas de tamanho n/2 e uma combinação linear, escrevemos T(n) = 2T(n/2) + Θ(n). A expressão não nasce do nome “dividir para conquistar”, mas da quantidade de subproblemas, de seus tamanhos e do trabalho que sobra fora deles. Uma divisão em n − 1 e 1 produz outra recorrência.\n\n### Somar por níveis torna a fórmula visível\nNo caso equilibrado, o nível zero processa n itens ao combinar; o seguinte tem dois problemas de n/2, somando novamente n. Essa conta continua até problemas de tamanho constante. Para n potência de dois, existem log₂ n níveis de combinação. Arredondamentos mudam detalhes, mas não a classe Θ(n log n) para essa estrutura.\n\n### A combinação também precisa de uma prova\nResolver as metades não resolve automaticamente o problema completo. Na contagem de inversões, por exemplo, existem pares inteiramente à esquerda, inteiramente à direita e pares cruzados. As chamadas resolvem os dois primeiros grupos; a combinação precisa contar exatamente o terceiro, sem duplicações. Identificar essas categorias é tão importante quanto resolver a recorrência. Memória auxiliar e retenção de fatias devem ser analisadas conforme a implementação, separadamente do tempo.",
    "worked": "### Exemplo resolvido: inversões cruzadas\nTemos metades já ordenadas [2, 6] e [1, 5]. Na intercalação, 1 vem antes de 2; ele forma inversão com os dois elementos restantes da esquerda: somamos 2. Depois retiramos 2. Ao comparar 6 e 5, retiramos 5 e somamos 1. Total de inversões cruzadas: 3, correspondentes a (2,1), (6,1) e (6,5). A propriedade de ordem permite contar um bloco inteiro, em vez de testar todos os pares. Isso explica por que a combinação continua linear.",
    "misconception": "O teorema mestre não se aplica automaticamente a toda recorrência; verifique sua forma e hipóteses antes de usá-lo.",
    "question": "Se cada combinação passasse a testar todos os pares do trecho, manteríamos Θ(n log n)?",
    "feedback": "Não. A combinação seria Θ(n²); somando n² + n²/2 + n²/4 + …, o custo total seria Θ(n²) no caso de duas metades equilibradas.",
    "extension": "Desenhe a árvore de custos para n = 8 e compare combinação constante, linear e quadrática.",
    "sources": [
      "clrs",
      "mit-6006"
    ]
  },
  {
    "level": 4,
    "lessonId": "l4-backtracking",
    "title": "Busca de soluções e poda que não elimina respostas válidas",
    "prerequisite": "Recursão, listas mutáveis e diferença entre candidato parcial e solução completa.",
    "objective": "Justificar uma poda e restaurar o estado ao voltar de uma tentativa.",
    "explanation": "### O estado parcial resume as escolhas\nBacktracking percorre uma árvore de decisões. Cada nó representa o que já foi escolhido e quais opções ainda estão disponíveis. Uma solução completa atende ao contrato; uma escolha parcial pode ser promissora sem ser solução. Separar essas duas condições evita aceitar cedo demais ou continuar explorando um estado impossível.\n\n### Podar exige uma impossibilidade demonstrada\nUma poda correta elimina apenas ramos que não podem conter solução válida. Em soma de subconjuntos com valores não negativos, uma soma parcial acima da meta nunca poderá diminuir. Se números negativos forem permitidos, esse argumento deixa de valer. O critério de poda precisa acompanhar as hipóteses do problema, e não apenas os exemplos usados durante o desenvolvimento.\n\n### Desfazer mantém os ramos independentes\nAo compartilhar uma lista de escolhas, acrescentamos um item, exploramos e removemos esse mesmo item antes da próxima alternativa. Guardar a própria lista mutável como resultado faz soluções anteriores mudarem depois; copie o estado quando necessário. A poda pode melhorar muito uma entrada específica, mas o pior caso ainda pode ser exponencial. Enumerar muitas respostas também custa pelo menos o tamanho total da saída, mesmo com uma busca eficiente.",
    "worked": "### Exemplo resolvido: subconjuntos de índices\nUse valores [2, 4, 5] e meta 6. Incluindo 2 e depois 4, atingimos 6 e registramos [2,4]. Desfazemos a escolha 4 antes de testar 5; agora 2 + 5 = 7, e o ramo pode ser podado porque todos os valores restantes são não negativos. Sem 2, o ramo com 4 e 5 soma 9 e também falha; apenas 4 ou 5 não alcança a meta. Se acrescentássemos −1 depois de 5, podar a soma 7 seria incorreto: 2 + 5 − 1 satisfaria a meta.",
    "misconception": "Uma poda que parece intuitiva em entradas positivas pode eliminar soluções quando o domínio muda.",
    "question": "Se existirem dois valores 2 em posições diferentes, são a mesma escolha?",
    "feedback": "Depende do contrato: subconjuntos de índices os distinguem; combinações únicas de valores podem exigir controle de duplicatas. Defina isso antes de enumerar.",
    "extension": "Desenhe a árvore completa do exemplo e marque quais ramos são cortados por impossibilidade e quais apenas chegaram ao fim.",
    "sources": [
      "clrs",
      "mit-6006"
    ]
  },
  {
    "level": 4,
    "lessonId": "l4-pd-guloso",
    "title": "Estado suficiente e o risco de decidir sem voltar",
    "prerequisite": "Recursão, otimização e comparação de alternativas.",
    "objective": "Projetar um estado de programação dinâmica e construir um contraexemplo para uma regra gulosa.",
    "explanation": "### O estado precisa guardar o que afeta o futuro\nProgramação dinâmica reutiliza soluções de subproblemas. Dois caminhos anteriores podem compartilhar um resultado apenas quando conduzem ao mesmo problema restante. No troco com moedas ilimitadas, o valor restante pode bastar; com estoque limitado, precisamos representar também quais moedas ainda estão disponíveis. Uma chave de cache incompleta mistura problemas distintos.\n\n### A recorrência considera as alternativas relevantes\nPara minimizar moedas, cada primeira moeda válida deixa um valor menor a resolver. O mínimo entre essas alternativas define a resposta, com zero moedas para valor zero e impossibilidade para estados inalcançáveis. Memorizar resultados evita recalcular estados, mas a recorrência e seus casos básicos precisam estar certos antes da otimização. Valores de moeda positivos garantem que o restante diminui.\n\n### Guloso exige outra justificativa\nUma escolha gulosa descarta alternativas sem explorá-las. Para provar que preserva o ótimo, é necessário mostrar que existe uma solução ótima compatível com essa escolha, por troca ou outro argumento. A propriedade de subestrutura ótima sozinha não basta: uma solução pode conter subsoluções ótimas e ainda exigir comparar várias primeiras escolhas. Programação dinâmica e guloso não são etapas universais de uma mesma receita.",
    "worked": "### Exemplo resolvido: a maior moeda falha\nCom moedas ilimitadas de 1, 3 e 4, queremos formar 6. O guloso escolhe 4, depois 1 e 1: três moedas. A recorrência encontra f(0)=0, f(1)=1, f(2)=2, f(3)=1, f(4)=1, f(5)=2. Para 6, compara 1+f(5)=3, 1+f(3)=2 e 1+f(2)=3; escolhe duas moedas de 3. O exemplo não prova que todo guloso falha: prova apenas que a regra da maior moeda não resolve esse sistema de denominações para todos os valores.",
    "misconception": "Adicionar cache a uma solução incorreta apenas evita recalcular respostas incorretas.",
    "question": "Por que o estado “valor restante” não basta se existe somente uma moeda de 3?",
    "feedback": "Porque dois caminhos podem chegar ao mesmo valor restante com estoques diferentes. O futuro depende desse estoque, que deve aparecer no estado ou na organização da recorrência.",
    "extension": "Retire a moeda de 1 e explique como representar valores impossíveis sem confundi-los com custo zero.",
    "sources": [
      "clrs",
      "mit-6006"
    ]
  },
  {
    "level": 4,
    "lessonId": "l4-pd-mochila-lcs",
    "title": "Duas dimensões, reconstrução e ordem de atualização",
    "prerequisite": "Tabelas, recorrências e significado de prefixos de sequências.",
    "objective": "Explicar o que cada célula significa e evitar reutilização indevida ao comprimir memória.",
    "explanation": "### O significado vem antes da tabela\nNa mochila 0/1, D(i,c) pode representar o maior valor obtido com os primeiros i itens e capacidade máxima c. Excluir o item i usa D(i−1,c); incluí-lo usa seu valor mais D(i−1,c−peso), se couber. O índice anterior impede escolher o mesmo item outra vez. Pesos e capacidades inteiros não negativos exigem tratamento cuidadoso para peso zero; o modelo usual introdutório usa pesos positivos.\n\n### Compressão não pode mudar o problema\nAo guardar apenas uma linha, iterar capacidades de cima para baixo mantém os estados menores referentes à linha anterior. Iterar de baixo para cima pode ler um valor já atualizado com o mesmo item, transformando a lógica em repetição ilimitada. O tempo O(nW) é pseudopolinomial: W é um valor numérico que pode precisar de apenas cerca de log₂ W bits para ser representado.\n\n### LCS tem outro significado de estado\nNa maior subsequência comum, D(i,j) mede o melhor comprimento entre dois prefixos. Subsequência preserva ordem, mas permite lacunas; não precisa ser contígua. A tabela de comprimentos não é a sequência em si. Reconstruí-la exige seguir decisões compatíveis, tratando empates; pode haver várias respostas ótimas. Economizar memória para obter só o comprimento não significa obter a sequência com a mesma facilidade.",
    "worked": "### Exemplo resolvido: detectar uma atualização indevida\nHá um único item de peso 2 e valor 3, com capacidade 4. Na versão 0/1, a resposta é 3. Se atualizarmos uma linha em ordem crescente, c=2 recebe 3; depois c=4 pode ler esse novo valor de c=2 e produzir 6, como se existissem dois itens. Em ordem decrescente, c=4 lê o estado anterior de c=2, que vale 0, e recebe 3. Depois c=2 recebe 3. A direção do laço codifica uma restrição do problema.",
    "misconception": "LCS não é maior substring comum: em ABC e AC, AC é uma subsequência comum de comprimento 2, apesar da lacuna em ABC.",
    "question": "O que é perdido ao guardar apenas o valor ótimo, sem decisões nem tabela suficiente?",
    "feedback": "A reconstrução direta dos itens ou símbolos escolhidos. O valor pode estar correto, mas será necessário guardar informação adicional ou recomputar estados para recuperar uma solução.",
    "extension": "Rastreie uma LCS de ABAC e BAC; confira ordem e comprimento, distinguindo a resposta de qualquer trecho contíguo obrigatório.",
    "sources": [
      "clrs",
      "mit-6006"
    ]
  },
  {
    "level": 4,
    "lessonId": "l4-guloso-intervalos",
    "title": "Trocas que preservam a quantidade de compromissos",
    "prerequisite": "Intervalos semiabertos, ordenação e comparação de soluções ótimas.",
    "objective": "Demonstrar a escolha do menor término e reconhecer quando mudar o objetivo invalida a regra.",
    "explanation": "### Especifique compatibilidade e objetivo\nQueremos selecionar a maior quantidade de intervalos não sobrepostos em um único recurso. Com intervalos [início,fim), terminar às 10 e começar às 10 é permitido. Assuma duração positiva e declare eventuais tempos de preparação; inserir uma pausa obrigatória muda a condição de compatibilidade. Maximizar quantidade é diferente de maximizar receita ou tempo ocupado.\n\n### A prova troca uma escolha, não toda a solução\nEscolha g, o intervalo que termina primeiro. Considere uma solução ótima cujo primeiro intervalo é o. Como fim(g) ≤ fim(o), substituir o por g não impede nenhum compromisso que vinha depois de o. A solução trocada tem a mesma quantidade de intervalos e começa pela escolha gulosa. Assim, existe uma solução ótima compatível com g. Aplicamos o mesmo raciocínio ao conjunto que começa após seu término.\n\n### O alcance da prova tem limites\nA ordenação por término custa O(n log n); percorrer e aceitar os compatíveis custa O(n). Empates de término podem admitir múltiplas escolhas ótimas. Se intervalos tiverem valores diferentes, trocar um intervalo caro por um barato preserva a quantidade, mas pode reduzir a receita. Nesse caso, a prova anterior não resolve o novo objetivo e uma formulação de programação dinâmica pode ser necessária.",
    "worked": "### Exemplo resolvido: quantidade e valor discordam\nConsidere A=[0,4), B=[1,2) e C=[2,3). Escolher pelo início mais cedo aceita A e bloqueia os outros: quantidade 1. Escolher pelo término aceita B e depois C: quantidade 2. Agora atribua valor 100 a A e valor 1 a B e C. Para maximizar quantidade, B+C continua ótimo; para maximizar valor, A vence por 100 contra 2. Não houve contradição no algoritmo: houve mudança na função que define uma solução melhor.",
    "misconception": "Escolher o intervalo mais curto não equivale a escolher o que termina primeiro; o início também interfere no término.",
    "question": "Qual desigualdade permite substituir o primeiro intervalo de uma solução ótima por g?",
    "feedback": "fim(g) ≤ fim(o). Todo intervalo posterior começava em instante ≥ fim(o), portanto também começa em instante ≥ fim(g).",
    "extension": "Crie um exemplo em que duas escolhas terminam juntas; mostre por que ambas deixam a mesma fronteira temporal para o restante.",
    "sources": [
      "kleinberg-tardos",
      "clrs"
    ]
  },
  {
    "level": 4,
    "lessonId": "l4-dijkstra",
    "title": "Distâncias provisórias e o momento de torná-las definitivas",
    "prerequisite": "Grafos ponderados, filas de prioridade e relaxamento de arestas.",
    "objective": "Justificar a finalização de um vértice e identificar entradas que quebram a prova.",
    "explanation": "### Distância provisória corresponde a um caminho conhecido\nComeçamos com zero na origem e infinito nos demais vértices. Relaxar u→v pergunta se o caminho conhecido até u, seguido dessa aresta, melhora a melhor distância conhecida até v. Uma distância finita é um limite superior para o ótimo: temos um caminho concreto com esse custo, mas podemos descobrir outro menor.\n\n### Por que extrair o menor funciona\nDijkstra finaliza o vértice não finalizado de menor distância provisória. Com pesos não negativos, atravessar outras arestas não reduz o custo já acumulado. Essa propriedade impede que um desvio por vértices ainda mais distantes revele depois um caminho mais barato para o vértice finalizado. A existência de peso negativo quebra esse argumento, mesmo sem ciclo negativo.\n\n### A fila é uma implementação da escolha\nUsando heap com entradas repetidas, uma melhora insere uma nova distância; a entrada antiga não desaparece automaticamente. Ao extraí-la, compare com a melhor distância atual e descarte registros desatualizados. Não encerre ao descobrir o destino pela primeira vez: uma relaxação posterior pode melhorá-lo. É possível encerrar ao extrair sua entrada atual mínima sob as hipóteses do algoritmo. Vértices inalcançáveis permanecem com infinito; reconstruir caminho requer predecessores.",
    "worked": "### Exemplo resolvido: descobrir não é finalizar\nA partir de S, existem arestas S→A de peso 9, S→B de peso 2 e B→A de peso 3. Após processar S, as distâncias são A=9 e B=2. Retiramos B e melhoramos A para 5. Retirar depois a entrada antiga (9,A) não deve desfazer a melhora. Agora troque S→A para 2, S→B para 5 e B→A para −4. Finalizar A em 2 seria errado: existe o caminho de custo 1 por B. Este segundo grafo é um contraexemplo às hipóteses, não uma entrada válida para Dijkstra padrão.",
    "misconception": "Ter poucas arestas negativas não torna Dijkstra seguro. A ausência de ciclos negativos também não é condição suficiente para ele.",
    "question": "Por que parar quando A aparece pela primeira vez na fila erra no primeiro exemplo?",
    "feedback": "Porque 9 é apenas um caminho descoberto; processar B revela custo 5. A escolha definitiva depende da extração mínima válida, não da primeira inserção.",
    "extension": "Acrescente um vértice isolado e descreva tanto a distância quanto o resultado da reconstrução de caminho até ele.",
    "sources": [
      "clrs",
      "mit-6006"
    ]
  },
  {
    "level": 4,
    "lessonId": "l4-ordenacao-topologica",
    "title": "Dependências, fontes disponíveis e ciclos que bloqueiam",
    "prerequisite": "Grafos direcionados, grau de entrada e filas.",
    "objective": "Explicar o invariante de Kahn e interpretar corretamente vértices não processados.",
    "explanation": "### Uma ordem topológica respeita todas as setas\nSe u→v significa que u precisa ocorrer antes de v, a posição de u deve ser menor que a de v na saída. Não estamos ordenando rótulos ou escolhendo o menor caminho. Uma ordem válida existe para grafos direcionados acíclicos; pode haver várias, pois tarefas independentes podem trocar de posição.\n\n### Remover dependências satisfeitas\nNo algoritmo de Kahn, o grau de entrada residual conta predecessores ainda não processados. Uma tarefa de grau zero pode ser emitida sem violar nenhuma dependência restante. Ao emiti-la, reduzimos os graus de seus sucessores. O invariante depende de contar e remover arestas de forma consistente, incluindo eventuais arestas paralelas se forem permitidas pelo modelo.\n\n### O bloqueio fornece informação, mas não tudo\nSe a fila esvaziar antes de emitir todos os vértices, o subgrafo restante contém um ciclo. Isso não implica que cada vértice restante pertença ao ciclo: tarefas posteriores a ele também ficam bloqueadas. Identificar o ciclo exato exige uma análise adicional, como DFS com estados de visita ou componentes fortemente conexas. Com listas de adjacência, Kahn usa O(V+E); uma fila de prioridade para desempates introduz outro custo.",
    "worked": "### Exemplo resolvido: uma tarefa bloqueada fora do ciclo\nConsidere A→B, B→A e B→C, mais uma tarefa isolada D. Os graus são A=1, B=1, C=1 e D=0. Só D entra na fila; depois de removê-la, não há nova fonte. Foram emitidos 1 de 4 vértices, portanto não existe ordem topológica completa. A e B formam o ciclo, enquanto C está apenas depois dele. Informar “C faz parte de um ciclo” seria um diagnóstico indevido. Se retirarmos B→A, a sequência D,A,B,C será uma ordem válida.",
    "misconception": "Um grafo desconexo pode ter ordem topológica; estar conectado não é a condição exigida.",
    "question": "Se duas tarefas têm grau residual zero, escolher uma antes da outra invalida a ordem?",
    "feedback": "Não. Ambas não têm predecessores pendentes. O desempate altera a saída, mas preserva validade; requisitos de determinismo podem justificar uma regra fixa.",
    "extension": "Monte um validador que confira cada aresta contra as posições produzidas, incluindo vértices isolados.",
    "sources": [
      "clrs",
      "sedgewick-algs"
    ]
  },
  {
    "level": 4,
    "lessonId": "l4-arvore-geradora-minima",
    "title": "Cortes, escolhas seguras e objetivos que não se confundem",
    "prerequisite": "Grafos não direcionados, árvores, conectividade e Union-Find.",
    "objective": "Usar a propriedade do corte e distinguir custo de conexão de distância de viagem.",
    "explanation": "### A estrutura e a função objetivo importam\nUma árvore geradora conecta todos os vértices de um grafo não direcionado sem ciclos. Em um grafo conexo com V vértices, tem V−1 arestas. A árvore geradora mínima minimiza a soma dos pesos escolhidos, não as distâncias de uma origem aos demais. Se o grafo estiver desconexo, não existe árvore geradora única abrangendo tudo; podemos obter uma floresta mínima.\n\n### Uma aresta pode ser segura por um corte\nDivida os vértices em dois grupos. Uma aresta de menor peso que cruza esse corte pertence a alguma árvore geradora mínima. A ideia da prova é inserir essa aresta em uma árvore ótima: forma-se um ciclo que contém outra aresta cruzando o corte. Substituir essa outra aresta pela escolhida não aumenta o peso. Para estender escolhas já feitas, o corte precisa respeitá-las, sem atravessar as arestas já obrigatórias.\n\n### Kruskal e Prim mantêm estados diferentes\nKruskal percorre arestas por peso e conecta componentes distintas; Union-Find detecta quando uma inclusão criaria ciclo. Prim amplia uma árvore conectada usando a menor aresta que sai dela. Pesos negativos são permitidos nesse problema, ao contrário da hipótese de Dijkstra. Empates podem gerar árvores ótimas diferentes; não exigimos pesos distintos para os algoritmos funcionarem, apenas para certas afirmações de unicidade.",
    "worked": "### Exemplo resolvido: construir barato não é viajar curto\nNum triângulo, A–B custa 3, B–C custa 3 e A–C custa 5. Kruskal escolhe as duas arestas de peso 3, conectando tudo por custo 6. Incluir a terceira criaria ciclo e aumentaria o custo. Entretanto, dentro dessa árvore, ir de A a C custa 6; a ligação direta do grafo custa 5. Uma árvore de caminhos mínimos a partir de A escolheria A–B e A–C, com custo total 8. Cada resposta otimiza uma pergunta diferente.",
    "misconception": "Prim e Dijkstra usam prioridades parecidas, mas Prim compara custo de conexão de uma aresta; Dijkstra compara distância acumulada desde a origem.",
    "question": "Se todas as arestas tiverem peso 1, uma árvore geradora mínima precisa ser única?",
    "feedback": "Não. Qualquer árvore geradora terá V−1 arestas e o mesmo custo V−1. Um ciclo de três vértices admite três escolhas ótimas diferentes.",
    "extension": "Acrescente um vértice sem arestas e explique por que o resultado passa a ser uma floresta, mesmo que as arestas escolhidas continuem mínimas.",
    "sources": [
      "clrs",
      "sedgewick-algs"
    ]
  }
];
